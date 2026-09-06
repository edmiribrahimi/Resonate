-- =============================================================================
-- Fase 49 — BUY-01 / BUY-02: l'ordine, il tetto, l'attribuzione, l'etichetta
-- =============================================================================
--
-- IL VINCOLO CHE BLOCCA `BUY-01`, nominato per esteso perche' nessun documento a
-- monte lo nominava: `tickets.sumup_checkout_id text UNIQUE`
-- (`20260225110000_phase6_ticketing.sql:28`). Sei biglietti nati da un solo
-- checkout lo violerebbero.
--
-- E quell'unicita' NON e' decorativa: e' la ragione per cui una seconda consegna
-- di `CHECKOUT_STATUS_CHANGED` non puo' emettere un secondo biglietto. Toglierla
-- e basta significherebbe spostare l'idempotenza del pagamento dallo SCHEMA al
-- CODICE, dove si dimentica — che e' esattamente cio' che
-- `ticketing-payments.md`, gate *idempotenza*, non vuole.
--
-- La forma adottata e' lo split ordine/righe, e non e' un'invenzione: gira gia'
-- in produzione con un altro nome — `drink_orders` -> `fulfill_drink_order` -> N
-- `drink_tokens` (`20260306000000_phase9_drinks.sql`). L'unicita' si SPOSTA su
-- una tabella che ha davvero un checkout solo, invece di allentarsi.
--
-- COSA SUCCEDE ALLE RIGHE CHE ESISTONO GIA' (`supabase-data.md`, gate *default
-- sulle righe esistenti*), misurato dal catalogo di produzione il 2026-09-06
-- alle 14:00:55 UTC e non ricordato:
--
--   * `public.tickets` e' VUOTA — zero righe. Le tre colonne nuove nascono su
--     zero righe, i due indici unici parziali si droppano e si ricreano senza
--     muovere un dato, e non esiste backfill perche' non esiste niente da
--     riempire. E' la finestra su cui poggia l'intero calcolo del rischio di
--     questa fase, e non torna.
--   * `public.event_parties` ha 3 righe, e TUTTE E TRE prendono
--     `max_tickets_per_order = 6`. E' il default di prodotto applicato
--     retroattivamente a serate che non hanno mai espresso una preferenza, ed e'
--     la scelta voluta: il tetto deve esistere su ogni serata dal primo minuto,
--     perche' e' la RPC a leggerlo e un NULL li' aprirebbe il tetto.
--
-- QUESTA MIGRATION NON TOCCA `pending_purchases` NE' `reserve_ticket`. Il
-- percorso con sessione resta esattamente com'e': sono due strade complete,
-- ognuna con la sua idempotenza, e la vecchia la chiudono le fasi 50/51. Vedi
-- pero' la sezione 5, che e' l'unico punto in cui questa migration si preoccupa
-- del percorso vecchio — e deve.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. L'ordine
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `user_id` E' NULLABILE, E LA NULLABILITA' E' LA DECISIONE. L'identita'
-- dell'acquirente nasce al webhook, dopo la verifica dell'incasso via GET: fra
-- l'avvio del checkout e l'incasso verificato l'ordine ESISTE e NON HA
-- PROPRIETARIO. Dichiararlo `NOT NULL` costringerebbe a coniare un'identita'
-- prima di sapere se qualcuno ha pagato — cioe' a creare un conto per ogni
-- carrello abbandonato. `drink_orders.user_id` e' nullabile per la stessa
-- ragione (`20260306000000_phase9_drinks.sql:27`), e quella strada gira gia'.
--
-- `sumup_checkout_id text UNIQUE NOT NULL` E' L'IDEMPOTENZA DEL PAGAMENTO. Non
-- e' un indice di comodo: e' la garanzia che due consegne dello stesso webhook
-- non possano diventare due ordini. Vive qui e non su `tickets` perche' QUI e'
-- vera — un ordine ha un checkout solo, sei biglietti no.
CREATE TABLE IF NOT EXISTS public.ticket_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,
  party_id uuid REFERENCES public.event_parties ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.ticket_tiers ON DELETE RESTRICT,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  buyer_email text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  sumup_checkout_id text UNIQUE NOT NULL,
  sumup_transaction_code text,
  total_amount numeric(10,2) NOT NULL,
  discount_code_id uuid REFERENCES public.discount_codes ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ticket_orders IS
  'Un checkout SumUp, N biglietti. L''unicita'' su sumup_checkout_id e'' l''idempotenza del pagamento: '
  'vive qui e non su tickets perche'' qui e'' vera. Stessa forma di drink_orders.';

COMMENT ON COLUMN public.ticket_orders.user_id IS
  'NULLABILE APPOSTA: l''identita'' dell''acquirente nasce al webhook, dopo la verifica dell''incasso. '
  'Fra l''avvio del checkout e l''incasso verificato l''ordine non ha proprietario.';

COMMENT ON COLUMN public.ticket_orders.sumup_checkout_id IS
  'UNIQUE NOT NULL: e'' lo schema a garantire che due consegne dello stesso webhook non diventino '
  'due ordini. Non spostare questa garanzia nel codice.';

COMMENT ON COLUMN public.ticket_orders.quantity IS
  'Quanti biglietti emette questo ordine. Il tetto e'' event_parties.max_tickets_per_order, applicato '
  'in modo autoritativo dentro reserve_ticket_order — non qui, perche'' e'' per serata e non per tabella.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS, nella stessa migration
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `supabase-data.md`, gate *tabella nuova = policy nuova*: una tabella senza RLS
-- e' leggibile da chiunque abbia la chiave anonima, e questa ne tiene indirizzi
-- di posta di acquirenti.
--
-- VERIFICATO PRIMA DI SCRIVERE, non presunto: la tabella nasce in questo file,
-- quindi non esiste NESSUN'ALTRA policy su di essa. Il gate *RLS contestuale*
-- esiste perche' le policy `PERMISSIVE` si sommano in OR — qui non c'e' niente
-- con cui sommarsi, ed e' l'unico momento in cui questa frase e' verificabile a
-- colpo d'occhio. Chi ne aggiungera' una seconda deve rileggere questa.
--
-- UNA SOLA POLICY, E NESSUNA PER `anon`. La strada dell'ospite non passa dalla
-- chiave anonima: passa dal client di servizio, dopo la verifica della firma del
-- webhook. Una policy per `anon` su questa tabella sarebbe il buco che il
-- percorso ospite sembra chiedere e non chiede.
--
-- CONSEGUENZA DICHIARATA: organizer e master NON leggono `ticket_orders` via
-- RLS. La dashboard delle vendite legge `tickets`, che ha gia' la sua policy
-- `tickets_select_admin`. Se un giorno servira' leggere gli ordini da admin, sara'
-- una policy nuova con la sua ragione — non un allargamento silenzioso di questa.
ALTER TABLE public.ticket_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_orders_select_own ON public.ticket_orders;
CREATE POLICY ticket_orders_select_own ON public.ticket_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Gli indici di lookup
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `supabase-data.md`, gate *indici sulle colonne di lookup*. Il webhook cerca
-- l'ordine per checkout su ogni consegna; il dashboard e la pagina dei biglietti
-- cercano per persona; la porta e i conteggi cercano per serata.
CREATE INDEX IF NOT EXISTS idx_ticket_orders_checkout ON public.ticket_orders (sumup_checkout_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_user_id ON public.ticket_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_party_id ON public.ticket_orders (party_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Le tre colonne su `public.tickets`
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `order_id` E' `ON DELETE SET NULL`, NON `CASCADE`, E LA DIFFERENZA E' L'INTERA
-- RAGIONE PER CUI QUESTA RIGA PORTA UN COMMENTO. Una cascata dall'ordine ai
-- biglietti significa che cancellare una riga di ordine cancella i biglietti che
-- qualcuno ha pagato. E' il gate scritto dopo l'incidente delle 63 righe
-- (`ai-engineering.md`, *un'istantanea prima copre cio' che si tocca*): una
-- cascata e' un percorso di scrittura che nessuno ha dichiarato, e questo
-- progetto NON HA PITR. Un biglietto orfano si ricongiunge; un biglietto
-- cancellato no.
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.ticket_orders ON DELETE SET NULL;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS holder_label text;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS issued_via text;

CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON public.tickets (order_id);

COMMENT ON COLUMN public.tickets.order_id IS
  'L''ordine da cui questo biglietto e'' nato, o NULL se e'' nato dal percorso con sessione. '
  'ON DELETE SET NULL e non CASCADE: cancellare un ordine non deve poter cancellare biglietti pagati. '
  'E'' anche il discrimine dei due indici unici parziali qui sotto.';

COMMENT ON COLUMN public.tickets.holder_label IS
  'Come questo biglietto si distingue dagli altri dello stesso ordine — «2 di 6». '
  'NON E'' UN NOME e non deve diventarlo: il biglietto e'' al portatore (D-49-03), e un nome sullo '
  'schermo dello staff fa rifiutare un ospite valido oppure diventa teatro.';

-- NULL SIGNIFICA «SCRITTO PRIMA CHE QUESTA COLONNA ESISTESSE», MAI «ACQUISTO
-- ORDINARIO». Nessun default e nessun backfill, per la stessa ragione con cui
-- `20260808003000_attendances_entry_role.sql` rifiuta i suoi: l'unico valore
-- disponibile a un backfill sarebbe una supposizione di oggi scritta dentro un
-- fatto di ieri, e in un rapporto si leggerebbe come misurata.
COMMENT ON COLUMN public.tickets.issued_via IS
  'Come questo biglietto e'' stato acquisito. NULL significa «scritto prima che questa colonna '
  'esistesse», mai «acquisto ordinario». Nessun default, nessun backfill.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. L'unicita': cosa se ne va, cosa RESTA, e perche' resta ristretta
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 5a. `tickets.sumup_checkout_id` perde l'unicita', non la colonna.
--
-- La colonna resta perche' ha due lettori reali —
-- `src/app/api/cron/reconcile-refunds/route.ts:101` e `:110-111` — e la
-- riconciliazione dei rimborsi cerca per checkout, quindi al posto del vincolo
-- unico va un indice NON unico (gate *indici sulle colonne di lookup*).
--
-- L'unicita' che garantiva l'idempotenza del pagamento non sparisce: vive da ora
-- su `ticket_orders.sumup_checkout_id`, sezione 1. E' uno spostamento, non un
-- allentamento, e la differenza si vede nel fatto che dopo questa migration
-- esiste ancora una tabella dove due consegne dello stesso webhook si scontrano.
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_sumup_checkout_id_key;
CREATE INDEX IF NOT EXISTS idx_tickets_sumup_checkout_id ON public.tickets (sumup_checkout_id);

-- 5b. I due indici unici parziali si droppano — perche' BUY-01 lo impone.
--
-- «Un biglietto per persona per serata» e' esattamente cio' che BUY-01 esiste
-- per rimuovere: sei biglietti allo stesso acquirente sono il caso PROGETTATO
-- (D-49-03, «sei e'' un gruppo di amici con un solo pagante»), non un caso
-- limite tollerato.
DROP INDEX IF EXISTS public.tickets_party_user_unique;
DROP INDEX IF EXISTS public.tickets_event_user_master_unique;

-- 5c. ...E SI RICREANO RISTRETTI AL PERCORSO VECCHIO. Questa e' la parte che non
-- si salta, e la ragione non e' una precauzione generica.
--
-- `public.reserve_ticket` (`20260310100000_discount_codes.sql:113-124`) cerca un
-- biglietto duplicato con un `SELECT ... INTO v_existing_ticket` e SENZA
-- `FOR UPDATE`. Due transazioni concorrenti lo superano ENTRAMBE: nessuna delle
-- due vede la riga che l'altra non ha ancora scritto. La sola cosa che oggi
-- impedisce a due consegne dello stesso webhook di produrre DUE BIGLIETTI DA UN
-- SOLO PAGAMENTO e' la violazione di questi due indici — cioe' lo schema, non il
-- codice.
--
-- E `pending_purchases` non copre il buco: il suo unico vincolo utile e'
-- `sumup_checkout_id UNIQUE`, che vale per la CREAZIONE del checkout, non per la
-- consegna duplicata del webhook che ne segue. Non esiste alcun vincolo su
-- `(user_id, party_id)`.
--
-- Toglierli e basta sarebbe quindi un allentamento SILENZIOSO su un percorso di
-- denaro che questa fase dichiara di non toccare. `ticketing-payments.md`, gate
-- *idempotenza*, vale anche per cio' che non si sta modificando.
--
-- `order_id IS NULL` e' il discrimine giusto e non un ripiego: il percorso con
-- sessione lascia `order_id` nullo — non conosce quella colonna — e il percorso
-- nuovo la valorizza SEMPRE, perche' `reserve_ticket_order` inserisce solo a
-- partire da un ordine. Il vecchio tiene la sua unica rete, il nuovo non ne e'
-- vincolato: che e' il punto di BUY-01.
--
-- Chi un giorno chiudera' il percorso con sessione (fasi 50/51) puo' togliere
-- questi due indici; chi non lo sta chiudendo, no.
CREATE UNIQUE INDEX IF NOT EXISTS tickets_party_user_unique
  ON public.tickets (party_id, user_id)
  WHERE party_id IS NOT NULL AND order_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tickets_event_user_master_unique
  ON public.tickets (event_id, user_id)
  WHERE party_id IS NULL AND order_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Il tetto, e sta sulla SERATA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Stessa forma di `refund_request_window_hours`
-- (`20260820110000_drink_refund_requests.sql`): `NOT NULL DEFAULT` piu' un
-- `CHECK` nominato, non una colonna nullabile con un `coalesce` nel codice.
-- `venue_reveal_hours` e' il contro-esempio, e la sua migration lo denuncia in
-- maiuscolo: il suo `coalesce(..., 25)` vive in due posti, e due posti sono due
-- verita' che prima o poi divergono. Una casa sola per il numero.
--
-- LE 3 SERATE CHE ESISTONO PRENDONO TUTTE 6 (misurato, sezione in testa).
ALTER TABLE public.event_parties
  ADD COLUMN IF NOT EXISTS max_tickets_per_order integer NOT NULL DEFAULT 6;

ALTER TABLE public.event_parties
  DROP CONSTRAINT IF EXISTS event_parties_max_tickets_per_order_check;
ALTER TABLE public.event_parties
  ADD CONSTRAINT event_parties_max_tickets_per_order_check
  CHECK (max_tickets_per_order > 0);

-- IL TETTO E' PER ORDINE, NON PER PERSONA, e va scritto o qualcuno leggera'
-- «tetto» come «limite per persona» e credera' protetta una cosa che non lo e':
-- sei ordini da sei sono trentasei biglietti, e niente qui lo impedisce. E' il
-- perimetro dichiarato di BUY-02, non un difetto — ma un perimetro non
-- dichiarato e' indistinguibile da un buco.
COMMENT ON COLUMN public.event_parties.max_tickets_per_order IS
  'Quanti biglietti puo'' contenere UN ORDINE su questa serata. Default 6 — «un gruppo di amici con '
  'un solo pagante». PER ORDINE E NON PER PERSONA: sei ordini da sei sono trentasei biglietti, e '
  'nulla qui lo impedisce. Applicato in modo autoritativo dentro public.reserve_ticket_order; la UI '
  'lo controlla solo in modo consultivo.';
