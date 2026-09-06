-- =============================================================================
-- Fase 49 — BUY-01 / BUY-02: N biglietti da un ordine, in una transazione sola
-- =============================================================================
--
-- La forma esiste gia' in produzione con un altro nome: `fulfill_drink_order`
-- trasforma UN `drink_orders` in N `drink_tokens`. Questa fa lo stesso per i
-- biglietti, con in piu' tre controlli che il bar non ha — il tetto per serata,
-- la capienza del tier e il tetto d'uso del codice sconto — e con l'idempotenza
-- messa dove non si dimentica.
--
-- QUESTA FUNZIONE NON E' `reserve_ticket`, E NON LA SOSTITUISCE. In produzione
-- `public.reserve_ticket` esiste in TRE overload e continua a servire il
-- percorso con sessione (`purchaseTicket` -> `pending_purchases`), che questa
-- fase dichiara di non toccare. Il nome e' diverso apposta: un quarto overload
-- di `reserve_ticket` avrebbe reso la risoluzione ambigua nel punto del prodotto
-- dove passa il denaro. Le due strade convivono per scelta finche' le fasi 50/51
-- non chiudono la vecchia.
--
-- UN SOLO PARAMETRO CONTA, E NON IDENTIFICA UNA PERSONA. Tutto cio' che decide —
-- serata, tier, quantita', importo, acquirente, codice sconto — si RILEGGE
-- dall'ordine dentro la transazione, invece di essere passato dal chiamante.
-- `reserve_ticket` riceve otto valori e si fida di tutti e otto; qui l'unico
-- valore di cui fidarsi e' l'ordine gia' scritto, e chi lo ha scritto e' il
-- percorso che ha verificato l'incasso via GET.

CREATE OR REPLACE FUNCTION public.reserve_ticket_order(
  p_order_id uuid,
  p_issued_via text DEFAULT 'guest_checkout'
)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.ticket_orders%ROWTYPE;
  v_max_per_order integer;
  v_tier_quantity integer;
  v_sold_count integer;
  v_max_uses integer;
  v_current_uses integer;
  v_total_cents bigint;
  v_unit_cents bigint;
  v_extra_cents bigint;
BEGIN
  -- ───────────────────────────────────────────────────────────────────────────
  -- 1. L'ordine, bloccato
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- `FOR UPDATE` sulla riga dell'ordine e' cio' che serializza due consegne
  -- simultanee dello stesso webhook. La seconda aspetta la prima, e quando entra
  -- trova `status = 'completed'` — cioe' cade nel ramo 2 invece di inserire.
  -- Senza questo blocco le due si incrocerebbero prima che l'una veda il lavoro
  -- dell'altra, che e' esattamente il difetto di `reserve_ticket`.
  SELECT * INTO v_order
  FROM public.ticket_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reserve_ticket_order: ordine % inesistente', p_order_id;
  END IF;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 2. L'IDEMPOTENZA, e viene dallo schema e non dal chiamante
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- `ticketing-payments.md`, gate *idempotenza*: la consegna at-least-once e' la
  -- norma, non l'eccezione — SumUp ritenta. Un secondo
  -- CHECKOUT_STATUS_CHANGED deve avere l'effetto del primo, cioe' NESSUN effetto
  -- oltre a restituire gli stessi id.
  --
  -- Il ramo restituisce e NON INSERISCE. E' il ramo che rende questa funzione
  -- eseguibile due volte, ed e' anche il modo in cui la si prova: la si chiama
  -- due volte di seguito e si confronta l'insieme degli id.
  IF v_order.status = 'completed' THEN
    RETURN QUERY
      SELECT t.id
      FROM public.tickets t
      WHERE t.order_id = p_order_id
      ORDER BY (split_part(t.holder_label, ' ', 1))::integer;
    RETURN;
  END IF;

  -- Uno stato `failed` o `expired` NON blocca. Chi chiama ha gia' verificato
  -- l'incasso interrogando il fornitore (mai il corpo del webhook), quindi
  -- rifiutare qui significherebbe lasciare senza biglietto qualcuno che ha
  -- pagato. Portare l'ordine a `completed` e' una correzione IN AVANTI, che e'
  -- l'unica direzione consentita a uno stato di pagamento (`meta-gates.md`,
  -- guardie monotone).

  -- ───────────────────────────────────────────────────────────────────────────
  -- 3. Il portatore deve esistere
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- `ticket_orders.user_id` e' nullabile — l'identita' nasce al webhook — ma
  -- `tickets.user_id` e' `NOT NULL`. Senza questo controllo il fallimento
  -- arriverebbe comunque, come violazione di vincolo, con un messaggio che non
  -- dice cosa e' mancato. Non esiste error tracking in questo progetto: un
  -- errore che non si distingue dagli altri e' un errore che nessuno diagnostica
  -- (`meta-gates.md`, zero fallimenti silenziosi).
  IF v_order.user_id IS NULL THEN
    RAISE EXCEPTION
      'reserve_ticket_order: ordine % senza portatore — risolvere l''identita'' dell''acquirente prima di emettere',
      p_order_id;
  END IF;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 4. Il tetto per ordine, ed E' QUI CHE E' AUTORITATIVO
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- La UI e l'azione lo controllano in modo CONSULTIVO: due richieste in volo
  -- superano entrambe un controllo fatto fuori dalla transazione. Solo qui, con
  -- l'ordine bloccato, il tetto e' a prova di concorrenza. Stessa forma con cui
  -- `max_uses` del codice sconto e' controllato due volte (T-49-05).
  --
  -- SE L'ORDINE NON HA `party_id` — il biglietto d'evento — LA SERATA DA CUI
  -- LEGGERE NON ESISTE, e un `NULL` silenzioso qui APRIREBBE IL TETTO: il
  -- confronto `quantity > NULL` e' NULL, quindi falso, quindi qualunque
  -- quantita' passerebbe. Si applica il default di prodotto 6, lo stesso della
  -- colonna, e lo si scrive invece di lasciarlo dedurre.
  IF v_order.party_id IS NOT NULL THEN
    SELECT ep.max_tickets_per_order INTO v_max_per_order
    FROM public.event_parties ep
    WHERE ep.id = v_order.party_id;
  END IF;

  IF v_max_per_order IS NULL THEN
    v_max_per_order := 6;
  END IF;

  IF v_order.quantity > v_max_per_order THEN
    RAISE EXCEPTION
      'reserve_ticket_order: ordine % chiede % biglietti, il tetto per ordine di questa serata e'' %',
      p_order_id, v_order.quantity, v_max_per_order;
  END IF;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 5. La capienza del tier, confrontata con `quantity` E NON CON 1
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- Sei richieste su due posti liberi devono fallire TUTTE INSIEME. Un confronto
  -- con 1 — la forma di `reserve_ticket`, che emette un biglietto alla volta —
  -- lascerebbe passare l'ordine e poi lo farebbe riuscire a meta', cioe'
  -- venderebbe due biglietti a chi ne ha pagati sei.
  SELECT tt.quantity INTO v_tier_quantity
  FROM public.ticket_tiers tt
  WHERE tt.id = v_order.tier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reserve_ticket_order: tier % inesistente', v_order.tier_id;
  END IF;

  SELECT count(*) INTO v_sold_count
  FROM public.tickets t
  WHERE t.tier_id = v_order.tier_id;

  IF v_tier_quantity IS NOT NULL AND v_sold_count + v_order.quantity > v_tier_quantity THEN
    RAISE EXCEPTION
      'reserve_ticket_order: il tier ha % posti liberi, l''ordine % ne chiede %',
      greatest(v_tier_quantity - v_sold_count, 0), p_order_id, v_order.quantity;
  END IF;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 6. Il codice sconto, contando `quantity` usi e non uno
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- Un ordine da sei con un codice a uso singolo lo consuma sei volte, non una.
  -- `FOR UPDATE` sul codice, come fa `reserve_ticket`, perche' il tetto d'uso e'
  -- una risorsa contesa come i posti.
  IF v_order.discount_code_id IS NOT NULL THEN
    SELECT dc.max_uses INTO v_max_uses
    FROM public.discount_codes dc
    WHERE dc.id = v_order.discount_code_id AND dc.is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'reserve_ticket_order: codice sconto % assente o disattivato', v_order.discount_code_id;
    END IF;

    IF v_max_uses IS NOT NULL THEN
      SELECT count(*) INTO v_current_uses
      FROM public.tickets t
      WHERE t.discount_code_id = v_order.discount_code_id;

      IF v_current_uses + v_order.quantity > v_max_uses THEN
        RAISE EXCEPTION
          'reserve_ticket_order: al codice sconto restano % usi, l''ordine ne chiede %',
          greatest(v_max_uses - v_current_uses, 0), v_order.quantity;
      END IF;
    END IF;
  END IF;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 7. L'importo per riga: una divisione che NON PERDE CENTESIMI
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- `ticket_refunds.amount` e' PER RIGA, quindi rimborsarne due su sei deve
  -- avere una rappresentazione — ed e' la ragione per cui l'importo si spezza.
  --
  -- MA UNA DIVISIONE ARROTONDATA NON TORNA: 10,00 su 3 da' 3,33 tre volte, cioe'
  -- 9,99, e il centesimo mancante e' denaro incassato che nessuna riga
  -- rappresenta — quindi denaro che un rimborso totale non restituisce. Si
  -- divide in CENTESIMI e il resto va alle prime righe, cosi'
  -- `sum(amount_paid) = total_amount` esattamente, per ogni quantita'.
  v_total_cents := round(v_order.total_amount * 100)::bigint;
  v_unit_cents  := v_total_cents / v_order.quantity;
  v_extra_cents := v_total_cents % v_order.quantity;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 8. Le N righe, da UNA SOLA `INSERT`
  -- ───────────────────────────────────────────────────────────────────────────
  --
  -- NESSUN CONTROLLO DI DUPLICATO PER UTENTE, E NON E' UNA DIMENTICANZA.
  -- `reserve_ticket` ne ha uno; questa no, perche' BUY-01 esiste per permettere
  -- piu' biglietti allo stesso acquirente ed e' la ragione per cui la migration
  -- precedente ha ristretto i due indici unici parziali a `order_id IS NULL`.
  -- Chi un giorno leggera' questa funzione accanto a quella e credera' di aver
  -- trovato un buco: non lo e', e' il requisito. NON «RIPARARE».
  --
  -- `holder_label` porta il progressivo dentro l'ordine e NON UN NOME (D-49-03,
  -- il biglietto e' al portatore).
  RETURN QUERY
  WITH inserted AS (
    INSERT INTO public.tickets (
      event_id, party_id, tier_id, user_id, order_id,
      sumup_checkout_id, sumup_transaction_code, amount_paid,
      discount_code_id, ticket_type, holder_label, issued_via
    )
    SELECT
      v_order.event_id,
      v_order.party_id,
      v_order.tier_id,
      v_order.user_id,
      v_order.id,
      v_order.sumup_checkout_id,
      v_order.sumup_transaction_code,
      (v_unit_cents + CASE WHEN n <= v_extra_cents THEN 1 ELSE 0 END)::numeric / 100,
      v_order.discount_code_id,
      'purchased',
      n || ' di ' || v_order.quantity,
      coalesce(p_issued_via, 'guest_checkout')
    FROM generate_series(1, v_order.quantity) AS n
    RETURNING id, holder_label
  )
  -- L'ordine e' NUMERICO e non alfabetico: su un ordine da dodici, `'10 di 12'`
  -- precede `'2 di 12'` in ordine di testo, e la lista arriverebbe scomposta a
  -- chi la mette in una mail.
  SELECT i.id
  FROM inserted i
  ORDER BY (split_part(i.holder_label, ' ', 1))::integer;

  -- ───────────────────────────────────────────────────────────────────────────
  -- 9. L'ordine si chiude, e da qui in poi il ramo 2 lo intercetta
  -- ───────────────────────────────────────────────────────────────────────────
  UPDATE public.ticket_orders
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_order_id;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.reserve_ticket_order(uuid, text) IS
  'Trasforma un ticket_orders in N tickets, in una transazione. Idempotente: su un ordine gia'' '
  '«completed» restituisce gli stessi id senza inserire nulla. Il tetto per ordine, la capienza del '
  'tier e il tetto d''uso del codice sconto sono applicati QUI, dove sono a prova di concorrenza. '
  'Non controlla i duplicati per utente: BUY-01 esiste per permetterli.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. CHI PUO' CHIAMARLA — e senza queste due righe la risposta e' «chiunque»
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Postgres concede `EXECUTE` a `PUBLIC` su OGNI funzione nuova, e PostgREST
-- espone ogni funzione di `public` a `/rest/v1/rpc/<nome>`. Senza il `REVOKE`,
-- questa funzione e' raggiungibile con la sola chiave anonima: chi conosce o
-- indovina l'uuid di un ordine `pending` la chiama e SI FA EMETTERE I BIGLIETTI
-- DI UN CHECKOUT MAI PAGATO. E' `SECURITY DEFINER`, quindi la RLS non lo ferma.
--
-- Il perimetro corretto e' il client di servizio, che e' l'unico chiamante
-- previsto: il webhook, DOPO aver verificato l'incasso interrogando il
-- fornitore. E' la stessa coppia che questo repository applica a ogni scrittore
-- privilegiato — `reconcile_master`, `record_venue_reveal_act`,
-- `record_checklist_tick` — e la ragione e' scritta in
-- `20260808004000_master_reconcile.sql:95`: una funzione il cui REVOKE non e'
-- atterrato non e' un lavoro a meta', e' una primitiva di escalation.
--
-- REVOKE prima e GRANT dopo, come due istruzioni e in quest'ordine. Entrambe
-- sono idempotenti per natura, e `CREATE OR REPLACE` conserva l'ACL esistente —
-- quindi rieseguire questo file non riapre nulla.
REVOKE ALL ON FUNCTION public.reserve_ticket_order(uuid, text)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_ticket_order(uuid, text)
  TO service_role;
