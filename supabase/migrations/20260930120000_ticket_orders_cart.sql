-- ═══════════════════════════════════════════════════════════════════════════
-- Il carrello che non si chiude: la causa, la ripresa, il dispositivo.
--
-- Fase 52.2, piano 02 (CART-01, CART-03, CART-04, CART-05).
--
-- Sette colonne su `public.ticket_orders`, un indice parziale. Nessuna policy,
-- nessun riempimento, nessun tocco all'indice unico del checkout.
--
-- Una transazione sola, senza `BEGIN;`: l'endpoint
-- `POST /v1/projects/{ref}/database/migrations` la avvolge da solo (misurato
-- il 2026-09-21, vedi `20260923180100_gallery_close_data.sql`).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PERCHE' UNA COLONNA PER LA CAUSA, E NON `error_message`
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `error_message` porta gia' due significati (l'errore del fornitore e il
-- testo di un'emissione fallita). Una terza lettura — «chiuso perche' mai
-- tentato» contro «chiuso perche' la carta e' stata rifiutata» — scritta dentro
-- un testo libero sarebbe una causa che nessuna superficie puo' contare senza
-- indovinare. La causa ha un vocabolario chiuso, quindi ha una colonna con un
-- `CHECK`.
--
--   never_attempted  l'ordine e' scaduto senza che nessun pagamento sia mai
--                    stato tentato sul checkout (carrello abbandonato)
--   declined         il fornitore ha registrato un tentativo non andato a buon
--                    fine (FAILED / CANCELLED)
--
-- `closed_detail` porta la parola del fornitore, breve, e niente di piu': la
-- card admin dice «Card declined (FAILED)», e la transazione del fornitore non
-- porta codici di rifiuto piu' ricchi. La colonna non promette cio' che la
-- fonte non da'.

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS closed_reason text
    CONSTRAINT ticket_orders_closed_reason_check
      CHECK (closed_reason IS NULL OR closed_reason IN ('never_attempted', 'declined'));

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS closed_detail text
    CONSTRAINT ticket_orders_closed_detail_length
      CHECK (closed_detail IS NULL OR char_length(closed_detail) <= 64);

COMMENT ON COLUMN public.ticket_orders.closed_reason IS
  'Perche'' l''ordine si e'' chiuso senza incasso: never_attempted (nessun pagamento tentato) o '
  'declined (il fornitore ha registrato un tentativo fallito). NULL su un ordine expired significa '
  '«chiuso prima che questa colonna esistesse», mai «causa assente». Nessun riempimento.';

COMMENT ON COLUMN public.ticket_orders.closed_detail IS
  'La parola del fornitore sulla chiusura (es. FAILED, CANCELLED), al massimo 64 caratteri. Non '
  'promette codici di rifiuto piu'' ricchi di quelli che la transazione del fornitore porta.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LA RIPRESA: QUANTE VOLTE, E LA MAIL CHE LA ANNUNCIA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `checkout_attempt` e' l'**eccezione dichiarata** alla regola «nessun default,
-- nessun riempimento» che questo repository scrive su ogni colonna nuova
-- (`20260921120100_free_order.sql` §2). La regola esiste perche' un valore
-- scritto oggi dentro un fatto di ieri si leggerebbe come misurato. Qui il
-- valore **e' misurato**: la ripresa di un ordine nasce con questa fase, quindi
-- su ogni riga esistente il numero di riprese avvenute e' zero, ed e' vero.
--
-- `resume_email_id` e `resume_email_state` stanno sulla STESSA riga che il
-- webhook gia' legge: annullare la mail programmata quando l'ordine si paga non
-- costa una seconda query.

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS checkout_attempt integer NOT NULL DEFAULT 0;

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS resume_email_id text;

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS resume_email_state text
    CONSTRAINT ticket_orders_resume_email_state_check
      CHECK (resume_email_state IS NULL OR resume_email_state IN
        ('scheduled', 'canceled', 'sent', 'cancel_failed', 'skipped'));

COMMENT ON COLUMN public.ticket_orders.checkout_attempt IS
  'Quante volte il checkout di questo ordine e'' stato riaperto (ripresa). ECCEZIONE DICHIARATA alla '
  'regola «nessun default»: e'' un contatore, e 0 sulle righe esistenti e'' vero — nessuna ripresa '
  'era possibile prima di questa colonna.';

COMMENT ON COLUMN public.ticket_orders.resume_email_id IS
  'L''id del fornitore della mail di ripresa programmata per questo ordine (una sola per ordine). '
  'NULL = nessuna mail programmata.';

COMMENT ON COLUMN public.ticket_orders.resume_email_state IS
  'Lo stato della mail di ripresa: scheduled, canceled (l''ordine si e'' pagato in tempo: percorso '
  'normale), sent, cancel_failed, skipped. NULL = interruttore spento o ordine nato prima di questa '
  'colonna, mai «stato sconosciuto».';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. L'IMBUTO SI CONTA DAL DATABASE: DISPOSITIVO E METODO
-- ─────────────────────────────────────────────────────────────────────────────
--
-- CART-01, deciso: l'imbuto dei biglietti si conta da qui, niente strumenti di
-- analisi di terzi. Le due colonne non portano ne' mail ne' nome; l'informativa
-- le dichiara. `unknown` e `other` sono i valori per «non si sa»: il NULL e'
-- riservato alle righe nate prima della colonna, e un rapporto che li
-- confondesse leggerebbe come misura cio' che non e' mai stato misurato.

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS device text
    CONSTRAINT ticket_orders_device_check
      CHECK (device IS NULL OR device IN ('mobile', 'desktop', 'unknown'));

ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS payment_method text
    CONSTRAINT ticket_orders_payment_method_check
      CHECK (payment_method IS NULL OR payment_method IN ('apple_pay', 'google_pay', 'card', 'other'));

COMMENT ON COLUMN public.ticket_orders.device IS
  'Il tipo di dispositivo da cui e'' partito l''acquisto: mobile, desktop, unknown. NULL = ordine nato '
  'prima di questa colonna, MAI «sconosciuto» (sconosciuto e'' unknown). Nessun dato personale.';

COMMENT ON COLUMN public.ticket_orders.payment_method IS
  'Il metodo con cui l''ordine e'' stato pagato: apple_pay, google_pay, card, other. NULL = ordine nato '
  'prima di questa colonna o non ancora pagato, MAI «sconosciuto» (sconosciuto e'' other).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. IL FRENO DELLA MAIL DI RIPRESA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- La Server Action d'acquisto e' pubblica, e il freno («quante mail di ripresa
-- a questo indirizzo nelle ultime ore») si legge a ogni chiamata. L'indice
-- copre solo le righe con una mail programmata: le altre non interessano al
-- freno e non devono pesare sull'indice.

CREATE INDEX IF NOT EXISTS idx_ticket_orders_resume_throttle
  ON public.ticket_orders (buyer_email, created_at)
  WHERE resume_email_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. COSA QUESTA MIGRATION NON FA, PER DECISIONE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- **Nessuna policy nuova.** Le colonne le scrive il solo `service_role`;
-- `ticket_orders_select_own` resta l'unica policy della tabella, e una policy
-- in piu' sarebbe un allargamento di chi vede cosa, da decidere come tale.
--
-- **L'indice unico parziale su `sumup_checkout_id` non si tocca.** E' cio' che
-- rende legittimo l'aggiornamento sul posto di un ordine ripreso: il checkout
-- nuovo sostituisce il vecchio sulla stessa riga, e l'unicita' continua a
-- difendere l'idempotenza del pagamento.
--
-- **Nessun riempimento.** A parte il contatore (§2), ogni colonna nasce NULL
-- sulle righe esistenti, e NULL vuol dire «prima della colonna».
