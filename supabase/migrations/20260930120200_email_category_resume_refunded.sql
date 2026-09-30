-- La mail di ripresa dell'ordine e la mail di rimborso entrano nel registro.
--
-- Fase 52.2, piano 02 (CART-05, RFD-01). Continuazione di
-- `20260905140000_email_category_ticket_order.sql`, che portava il vocabolario
-- a dodici voci. Questa ne aggiunge **due** e non tocca nient'altro.
--
-- Una transazione sola, senza `BEGIN;`: l'endpoint
-- `POST /v1/projects/{ref}/database/migrations` la avvolge da solo.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PERCHE' DUE CATEGORIE NUOVE
-- ─────────────────────────────────────────────────────────────────────────────
--
--   `order_resume`     la mail che riporta a un ordine rimasto aperto. Una
--                      sola per ordine, prevista nell'informativa, senza luogo.
--                      Il suo esito normale, quando l'ordine si paga in tempo,
--                      e' `canceled`: la mail non parte.
--
--   `ticket_refunded`  la mail che avvisa il titolare che il suo biglietto e'
--                      stato rimborsato — la stessa sulle tre strade di
--                      rimborso. Riusare `refund_approved` avrebbe mescolato
--                      l'esito di una richiesta (flusso storico) con l'avviso
--                      di un biglietto che non vale piu' alla porta.
--
-- Il vocabolario e' chiuso perche' due fatti sotto una parola sola sono un
-- fatto che nessuno puo' guardare (`comms-analytics.md`, errori distinguibili).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DUE MODIFICHE IN UN PIANO, E COSA SUCCEDE SE SE NE FA UNA SOLA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Il vocabolario vive in DUE posti che devono concordare: qui e in
-- `src/lib/email-delivery/categories.ts`.
--
-- **Se si aggiorna solo TypeScript**, l'invio parte e `recordSend` fallisce
-- sull'`INSERT`: la mail e' partita e **non esiste** nel registro.
-- **Se si aggiorna solo il `CHECK`**, la categoria non e' scrivibile da nessun
-- call site: innocuo, ma inutile.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 3. IL VINCOLO SI RISCRIVE PER INTERO, MAI PER DIFFERENZA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` con **tutte e quattordici** le
-- voci. L'elenco e' un **superinsieme** del precedente — nessuna voce e' stata
-- tolta, comprese `refund_approved` e le tre `member_*` del flusso rimosso
-- (righe storiche, `20260922120000` §«non tocca») — quindi la validazione delle
-- righe esistenti non puo' fallire. Eseguita due volte, la migration lascia lo
-- stesso vincolo.

ALTER TABLE public.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_category_check;

ALTER TABLE public.email_deliveries
  ADD CONSTRAINT email_deliveries_category_check CHECK (category IN (
    -- Le nove di `20260822130000_email_delivery_ledger.sql`.
    'ticket_confirmation',
    'guest_invitation',
    'rsvp_confirmation',
    'member_approved',
    'member_reactivated',
    'member_rejected',
    'account_invitation',
    'refund_approved',
    'refund_rejected',
    -- Le due di `20260822180000_email_ledger_night_paths.sql`.
    'venue_reveal',
    'event_reminder',
    -- Quella di `20260905140000_email_category_ticket_order.sql`.
    'ticket_order_confirmation',
    -- Le due di questa migration.
    'order_resume',
    'ticket_refunded'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. COSA QUESTA MIGRATION NON FA, PER DECISIONE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- **Nessuna colonna nuova.** Il legame fra la mail di rimborso e il rimborso
-- sta su `ticket_refunds.notified_email_id` (`20260930120100`), perche' qui
-- `ticket_id` e' ON DELETE CASCADE e il biglietto rimborsato viene cancellato:
-- su `ticket_refunded` la colonna e' nulla per costruzione.
--
-- **Nessuna policy.** La tabella resta letta e scritta dal solo `service_role`.
--
-- **Nessun indice.** I lettori esistenti servono le due categorie come le
-- altre dodici.
