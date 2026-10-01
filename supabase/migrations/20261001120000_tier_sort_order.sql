-- ═══════════════════════════════════════════════════════════════════════════
-- L'ordine dei tier lo decide chi gestisce la serata
--
-- Fase 52.1, piano 06 (DBT-18). Il proprietario, 2026-10-01:
--   «vorrei poter trascinare i tiers cosi' da poterli ordinare a piacimento».
-- Decisione D-52.1-23 (D3, D4, D5):
--   D3 — l'ordine e' una colonna di `ticket_tiers`, non una proprieta' derivata
--        dal prezzo: il pubblico vede l'ordine che ha deciso chi gestisce.
--   D4 — un riordino si salva INTERO, in una scrittura sola: mai a meta'.
--   D5 — la lista e' per serata (`party_id`); gli Event Pass di un evento
--        (`party_id` nullo) fanno una lista a parte.
--
-- ── PERCHE' SERVE ───────────────────────────────────────────────────────────
--
-- Oggi `ticket_tiers` non ha una colonna d'ordine e i lettori non concordano:
-- l'admin ordina per `created_at`, la pagina pubblica e il preventivo per
-- `price`. Il codice che li allinea su `sort_order, price, created_at` e' il
-- piano 52.1-08, non questo file.
--
-- ── ADDITIVA: SI APPLICA PRIMA DEL CODICE CHE LA LEGGE ───────────────────────
--
-- Il codice di oggi non nomina `sort_order` e non cambia comportamento. Il
-- backfill per prezzo fa si' che, al deploy del codice che la legge, il
-- pubblico veda esattamente l'ordine di oggi.
--
-- ── COSA NON FA ─────────────────────────────────────────────────────────────
--
-- - Non tocca prezzi, quantita', date di vendita: la funzione scrive SOLO
--   `sort_order`.
-- - Non crea ne' modifica policy: il confine resta `ticket_tiers_update`
--   (`staff.manage`, `20260807010000_policies_to_capabilities.sql:379-383`).
-- - Non mette in coda un tier nuovo: lo fa il codice che lo crea, non il
--   default (che e' 0 solo perche' la colonna e' NOT NULL).
--
-- Una transazione sola, senza `BEGIN;`: l'endpoint
-- `POST /v1/projects/{ref}/database/migrations` la avvolge da solo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. LA COLONNA
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ticket_tiers
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.ticket_tiers.sort_order IS
  'Posizione del tier nella lista della sua serata (party_id; NULL = Event Pass dell''evento). '
  'La decide chi gestisce la serata trascinando; il pubblico vede questo ordine; il prezzo non '
  'comanda piu''. Un tier nuovo va in coda: lo scrive il codice, non il default. '
  'Si cambia solo con public.reorder_ticket_tiers, intera o per niente (DBT-18, D-52.1-23).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. IL BACKFILL — l'ordine di oggi, per prezzo
-- ─────────────────────────────────────────────────────────────────────────────
--
-- A11: nella `PARTITION BY` i NULL di `party_id` cadono nella STESSA partizione
-- (le funzioni finestra trattano i NULL come uguali), quindi gli Event Pass di
-- un evento fanno la loro lista, separata da quelle delle serate (D5).
--
-- A pari prezzo l'ordine di oggi non e' definito; da qui in poi lo e':
-- `created_at`, poi `id`. Si numera da 1, senza buchi.
UPDATE public.ticket_tiers AS t
   SET sort_order = r.rn
  FROM (
    SELECT id,
           row_number() OVER (
             PARTITION BY event_id, party_id
             ORDER BY price, created_at, id
           ) AS rn
      FROM public.ticket_tiers
  ) AS r
 WHERE t.id = r.id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. L'UNICA SCRITTURA DELL'ORDINE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- SECURITY INVOKER, e non DEFINER: la funzione gira con i permessi di chi la
-- chiama, quindi la RLS `ticket_tiers_update` (`staff.manage`) resta il
-- confine. Chi non ha la capacita' non aggiorna nessuna riga, e la funzione lo
-- dice con `reorder.partial` invece di tornare zero in silenzio.
--
-- La lista deve essere il perimetro INTERO di quella serata, ne' piu' ne' meno:
-- una lista vecchia (un tier creato nel frattempo da un altro telefono, o uno
-- cancellato), con doppioni o con un id di un'altra serata si RIFIUTA
-- (`reorder.stale_list`), non si applica a meta'. Le righe del perimetro si
-- bloccano prima del confronto, cosi' due riordini contemporanei si mettono in
-- fila invece di mescolarsi.
CREATE OR REPLACE FUNCTION public.reorder_ticket_tiers(
  p_event_id uuid,
  p_party_id uuid,
  p_tier_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_perimeter integer;
  v_distinct  integer;
  v_matched   integer;
  v_updated   integer;
BEGIN
  IF p_event_id IS NULL OR p_tier_ids IS NULL THEN
    RAISE EXCEPTION 'reorder.stale_list' USING ERRCODE = 'P0001',
      DETAIL = 'evento o lista assenti';
  END IF;

  PERFORM 1
     FROM public.ticket_tiers
    WHERE event_id = p_event_id
      AND party_id IS NOT DISTINCT FROM p_party_id
    FOR UPDATE;

  SELECT count(*) INTO v_perimeter
    FROM public.ticket_tiers
   WHERE event_id = p_event_id
     AND party_id IS NOT DISTINCT FROM p_party_id;

  SELECT count(DISTINCT x) INTO v_distinct
    FROM unnest(p_tier_ids) AS x;

  SELECT count(*) INTO v_matched
    FROM public.ticket_tiers
   WHERE event_id = p_event_id
     AND party_id IS NOT DISTINCT FROM p_party_id
     AND id = ANY (p_tier_ids);

  IF cardinality(p_tier_ids) <> v_perimeter
     OR v_distinct <> cardinality(p_tier_ids)
     OR v_matched <> v_perimeter THEN
    RAISE EXCEPTION 'reorder.stale_list' USING ERRCODE = 'P0001',
      DETAIL = format('perimetro %s, lista %s, distinti %s, riconosciuti %s',
                      v_perimeter, cardinality(p_tier_ids), v_distinct, v_matched);
  END IF;

  UPDATE public.ticket_tiers AS t
     SET sort_order = l.pos::integer
    FROM unnest(p_tier_ids) WITH ORDINALITY AS l(id, pos)
   WHERE t.id = l.id
     AND t.event_id = p_event_id
     AND t.party_id IS NOT DISTINCT FROM p_party_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated <> v_perimeter THEN
    RAISE EXCEPTION 'reorder.partial' USING ERRCODE = 'P0001',
      DETAIL = format('perimetro %s, aggiornate %s', v_perimeter, v_updated);
  END IF;

  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION public.reorder_ticket_tiers(uuid, uuid, uuid[]) IS
  'Salva l''ordine INTERO dei tier di una serata (p_party_id NULL = Event Pass dell''evento) in una '
  'scrittura sola. Scrive solo sort_order. Lista incompleta, con doppioni o estranea -> reorder.stale_list; '
  'righe aggiornate diverse dal perimetro (RLS) -> reorder.partial. SECURITY INVOKER: il confine e'' '
  'ticket_tiers_update (staff.manage). DBT-18, D-52.1-23.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CHI PUO' CHIAMARLA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Postgres concede EXECUTE a PUBLIC su ogni funzione nuova, e PostgREST la
-- espone a `/rest/v1/rpc/reorder_ticket_tiers`. Anche se la RLS fermerebbe un
-- anonimo, una funzione che anon non deve chiamare non gli si lascia aperta.
-- `authenticated` per organizer e staff con `staff.manage`; `service_role` per
-- il ramo master, che chiama col client di servizio. REVOKE prima e GRANT dopo,
-- due istruzioni e in quest'ordine.
REVOKE ALL ON FUNCTION public.reorder_ticket_tiers(uuid, uuid, uuid[])
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.reorder_ticket_tiers(uuid, uuid, uuid[])
  TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RILETTURA DAL CATALOGO — se qualcosa non torna, la migration non atterra
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_nullable text;
  v_dupes    integer;
  v_secdef   boolean;
BEGIN
  SELECT is_nullable INTO v_nullable
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'ticket_tiers'
     AND column_name = 'sort_order';
  IF v_nullable IS DISTINCT FROM 'NO' THEN
    RAISE EXCEPTION 'tier_sort_order: colonna sort_order assente o nullable (%)', v_nullable;
  END IF;

  SELECT count(*) INTO v_dupes
    FROM (
      SELECT 1
        FROM public.ticket_tiers
       GROUP BY event_id, party_id, sort_order
      HAVING count(*) > 1
    ) AS d;
  IF v_dupes > 0 THEN
    RAISE EXCEPTION 'tier_sort_order: % posizioni doppie dopo il backfill', v_dupes;
  END IF;

  SELECT p.prosecdef INTO v_secdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'reorder_ticket_tiers';
  IF v_secdef IS NULL THEN
    RAISE EXCEPTION 'tier_sort_order: funzione reorder_ticket_tiers assente';
  END IF;
  IF v_secdef THEN
    RAISE EXCEPTION 'tier_sort_order: reorder_ticket_tiers e'' SECURITY DEFINER, deve essere INVOKER';
  END IF;

  IF has_function_privilege('anon', 'public.reorder_ticket_tiers(uuid, uuid, uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'tier_sort_order: anon ha EXECUTE su reorder_ticket_tiers';
  END IF;
END;
$$;
