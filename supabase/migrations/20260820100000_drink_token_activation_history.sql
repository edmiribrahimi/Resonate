-- Fase 47, piano 01 (DRK-04) — l'attivazione di un token diventa un fatto che
-- sopravvive all'annullamento.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- IL DIFETTO CHE QUESTA MIGRATION CHIUDE, RIPRODOTTO IN LABORATORIO IL 2026-08-19
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Il cliente controlla DUE transizioni — attiva e annulla — il barista una sola:
-- serve. `deactivate_drink_token` riportava il token da 'active' a 'purchased'
-- AZZERANDO `activated_at`, che era l'unica traccia di un'attivazione: nessuna
-- tabella di audit, nessun contatore.
--
-- Cinque cicli attiva -> annulla — cioe' cinque drink versati da un barista che
-- versa prima di premere — lasciavano il token in 'purchased' SENZA MEMORIA. Ed
-- e' esattamente il predicato con cui il rimborso selezionava
-- (`src/app/api/cron/refund-expired-tokens/route.ts:165`). Bevuto tutta la sera,
-- soldi restituiti, e nel database nulla che lo dicesse.
--
-- Misurato, non supposto: `.planning/v1.6-PHASE-47-PROBE.md`, contro un ambiente
-- fedele alla produzione su dieci cataloghi su dieci. Sonda in
-- `scripts/probe-drink-token-cycle.mjs`.
--
-- QUESTA MIGRATION NON IMPEDISCE IL CICLO. Lo rende VISIBILE. A impedirlo e' la
-- procedura del banco — si tocca, si legge SERVED, poi si versa — e una
-- procedura senza dato non e' verificabile: ne' per accorgersi di un abuso, ne'
-- per DIFENDERE CHI STA AL BANCO da un'accusa.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- PERCHE' CAMBIARE IL SIGNIFICATO DI `activated_at` NON ROMPE NIENTE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Misurato il 2026-08-19: `activated_at` ha ZERO LETTORI. Zero in `src/` fuori
-- dai tipi generati, zero nelle policy, zero nei trigger, zero nelle analytics.
-- Le uniche scritture erano le due funzioni della migration 20260508000000.
--
-- Non esiste codice che lo usi come sinonimo di «e' attivo adesso», perche' non
-- esiste codice che lo usi. Ed e' anche la ragione per cui il difetto e' rimasto
-- invisibile: l'unica traccia era una colonna che nessuno guardava mai.
--
-- Chi in futuro deve sapere se un token e' attivo legge `status`. E' l'unica
-- fonte che lo dice, e resta l'unica.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Il conteggio delle attivazioni
-- ─────────────────────────────────────────────────────────────────────────────
--
-- NULLABLE DI PROPOSITO, e le due colonne che sembrano una sola sono due:
--
--   NULL -> la riga e' nata PRIMA che si contasse. NON SAPPIAMO nulla.
--   0    -> la riga e' nata dopo, ed e' stata attivata zero volte. LO SAPPIAMO.
--
-- La distinzione non e' pedanteria: e' cio' che impedisce a `DRK-05` di
-- rimborsare automaticamente proprio i token su cui non abbiamo dati. Trattare
-- un NULL come «mai attivato» sarebbe l'errore che questa fase esiste per
-- togliere, applicato all'indietro.
--
-- La colonna si aggiunge SENZA default e il default si mette DOPO: cosi' le
-- righe esistenti restano NULL e solo quelle nuove nascono a 0. In produzione la
-- distinzione e' oggi vuota — zero ordini bar al 2026-08-19 — ma il momento in
-- cui smettera' di esserlo e' anche il momento in cui nessuno se lo ricordera'.
ALTER TABLE public.drink_tokens
  ADD COLUMN IF NOT EXISTS activation_count integer;

ALTER TABLE public.drink_tokens
  ALTER COLUMN activation_count SET DEFAULT 0;

-- Un conteggio non decresce mai. Un vincolo che lo dice e' piu' forte di una
-- convenzione che lo assume.
ALTER TABLE public.drink_tokens
  DROP CONSTRAINT IF EXISTS drink_tokens_activation_count_check;
ALTER TABLE public.drink_tokens
  ADD CONSTRAINT drink_tokens_activation_count_check
  CHECK (activation_count IS NULL OR activation_count >= 0);

COMMENT ON COLUMN public.drink_tokens.activation_count IS
  'Quante volte questo token e'' stato attivato, in tutta la sua vita. NULL = riga creata prima che si contasse (nessun dato); 0 = mai attivato, e lo sappiamo. Non decresce: l''annullamento non lo tocca.';

COMMENT ON COLUMN public.drink_tokens.activated_at IS
  'Quando il token e'' stato attivato l''ultima volta. NON significa «e'' attivo adesso»: dal 2026-08-19 sopravvive all''annullamento. Per sapere se e'' attivo si legge status.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. `activate_drink_token` incrementa
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Ogni altra proprieta' resta identica: il lock di riga, l'idempotenza su
-- 'active', l'eccezione su ogni altro stato di partenza.
--
-- L'incremento avviene NELLA STESSA ISTRUZIONE che cambia lo stato, dentro lo
-- stesso lock: un contatore aggiornato da un'istruzione separata e' un contatore
-- che puo' restare indietro.
--
-- `coalesce(..., 0) + 1` invece di `+ 1`: su una riga preesistente il conteggio
-- e' NULL, e NULL + 1 e' NULL. Una riga vecchia attivata dopo questa migration
-- smette di essere «non sappiamo» e diventa «almeno una», che e' vero e
-- sufficiente — da 1 in su la strada e' comunque quella manuale.
CREATE OR REPLACE FUNCTION public.activate_drink_token(p_token_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token record;
BEGIN
  SELECT * INTO v_token
  FROM public.drink_tokens
  WHERE id = p_token_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token not found: %', p_token_id;
  END IF;

  -- Idempotent: already active
  IF v_token.status = 'active' THEN
    RETURN false;
  END IF;

  IF v_token.status <> 'purchased' THEN
    RAISE EXCEPTION 'Token cannot be activated from status: %', v_token.status;
  END IF;

  UPDATE public.drink_tokens
  SET status = 'active',
      activated_at = now(),
      activation_count = coalesce(activation_count, 0) + 1
  WHERE id = p_token_id;

  RETURN true;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. `deactivate_drink_token` smette di cancellare la prova
-- ─────────────────────────────────────────────────────────────────────────────
--
-- CAMBIA UNA COSA SOLA rispetto alla 20260508000000: l'UPDATE non contiene piu'
-- `activated_at = NULL`. Il lock, l'idempotenza su 'purchased' e l'eccezione su
-- ogni altro stato restano com'erano.
--
-- Il conteggio NON si decrementa: annullare non disfa l'attivazione, la chiude.
CREATE OR REPLACE FUNCTION public.deactivate_drink_token(p_token_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token record;
BEGIN
  SELECT * INTO v_token
  FROM public.drink_tokens
  WHERE id = p_token_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token not found: %', p_token_id;
  END IF;

  -- Idempotent: not active anymore (already cancelled or moved on)
  IF v_token.status = 'purchased' THEN
    RETURN false;
  END IF;

  IF v_token.status <> 'active' THEN
    RAISE EXCEPTION 'Token cannot be deactivated from status: %', v_token.status;
  END IF;

  UPDATE public.drink_tokens
  SET status = 'purchased'
  WHERE id = p_token_id;

  RETURN true;
END;
$$;

-- `redeem_drink_token` NON e' toccata, ed e' deliberato. Le sue tre proprieta'
-- — lock di riga, idempotenza, rifiuto dell'annullamento dopo il serve — sono
-- controprove misurate in laboratorio: servire due volte NON e' possibile, e il
-- database rifiuta di annullare un token servito. Una riparazione che le
-- rompesse sarebbe un peggioramento.
