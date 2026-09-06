-- La mail dell'ordine d'ospite entra nel registro delle consegne.
--
-- Continuazione di `20260822130000_email_delivery_ledger.sql` (che ha creato
-- `email_deliveries` con nove categorie) e di
-- `20260822180000_email_ledger_night_paths.sql` (che ne ha aggiunte due). Questa
-- ne aggiunge **una**, la dodicesima, e non tocca nient'altro: nessuna colonna,
-- nessun indice, nessuna policy.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PERCHE' UNA CATEGORIA NUOVA E NON `ticket_confirmation`
-- ─────────────────────────────────────────────────────────────────────────────
--
--   `ticket_order_confirmation`  la mail che porta i biglietti di un ORDINE a
--                                chi ha comprato senza account, con il link per
--                                completare l'account quando esiste.
--
-- Riusare `ticket_confirmation` sarebbe stato piu' corto e sbagliato in un modo
-- preciso: le due mail **non portano lo stesso rischio**. La conferma esistente
-- e' una copia di cortesia per chi ha gia' un account e puo' rientrare da
-- `/login` in qualunque momento; questa e' l'unica cosa che una persona senza
-- password possiede — **niente mail significa niente biglietto e niente login**,
-- e lo scopre alla porta. Contarle sotto lo stesso nome renderebbe impossibile
-- distinguere, su una superficie, un fastidio da una persona respinta davanti a
-- una fila.
--
-- E' la stessa ragione per cui il vocabolario e' chiuso invece che libero:
-- `comms-analytics.md`, gate *errori distinguibili*. Due fatti diversi sotto una
-- parola sola sono un fatto che nessuno puo' guardare.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DUE MODIFICHE IN UN COMMIT, E COSA SUCCEDE SE SE NE FA UNA SOLA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Il vocabolario e' chiuso in DUE posti che devono concordare: qui e in
-- `src/lib/email-delivery/categories.ts`. La duplicazione e' voluta — il
-- compilatore difende i call site, il vincolo difende la tabella dai percorsi
-- che il compilatore non vede.
--
-- **Se si aggiorna solo TypeScript**, l'invio parte e `recordSend` fallisce
-- sull'`INSERT`: `sendEmail` torna `recorded: false`, la mail e' partita e **non
-- esiste** nel registro. E' esattamente lo stato «non si sa» che questa
-- infrastruttura esiste per eliminare, riaperto in un punto nuovo.
--
-- **Se si aggiorna solo il `CHECK`**, la categoria non e' scrivibile da nessun
-- call site perche' il tipo non la contiene: innocuo, ma inutile.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 3. IL VINCOLO SI RISCRIVE PER INTERO, MAI PER DIFFERENZA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` con **tutte e dodici** le voci
-- elencate. Postgres non ha un modo di aggiungere un valore a un `CHECK (x IN
-- (...))`, e un elenco scritto per differenza — «le undici di prima piu' questa»
-- — e' un elenco che nessuno puo' leggere per intero senza aprire tre file. La
-- coppia DROP/ADD e' anche cio' che rende questa migration ripetibile: eseguita
-- due volte lascia lo stesso vincolo.
--
-- **Nota sulle righe esistenti** (`supabase-data.md`, gate *default sulle righe
-- esistenti*): un `ADD CONSTRAINT` valida le righe gia' presenti. Questo elenco
-- e' un **superinsieme** del precedente — nessuna voce e' stata tolta — quindi
-- nessuna riga scritta sotto il vincolo vecchio puo' violare quello nuovo, e la
-- validazione non puo' fallire per i dati.

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
    -- La sola di questa migration.
    'ticket_order_confirmation'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. COSA QUESTA MIGRATION NON FA, PER DECISIONE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- **Nessuna colonna nuova.** La mail dell'ordine ha piu' di un biglietto, e la
-- tentazione sarebbe un `order_id` accanto a `ticket_id`. Non serve: la riga di
-- registro descrive **un invio**, e l'invio e' uno solo — `ticket_id` porta il
-- primo biglietto dell'ordine, che e' la chiave con cui la superficie dei
-- venduti attacca il segno a una riga visibile. `legal-compliance.md`, gate *i
-- dati dei soci non sono i dati del prodotto*: ogni colonna in piu' ha una
-- ragione dichiarata o non si aggiunge, e «gia' che ci siamo» non e' una
-- ragione. Se un giorno servira' attribuire l'invio all'ordine invece che al
-- biglietto, sara' una migration con la sua domanda.
--
-- **Nessuna policy.** La tabella ha RLS attiva e **zero policy** dal giorno in
-- cui e' nata: la scrive e la legge il solo `service_role`. La condizione di
-- uscita scritta nella prima migration resta quella: la prima policy su questa
-- tabella e' un allargamento di chi vede cosa e va decisa come tale, non
-- aggiunta di sfuggita da una migration che parla d'altro.
--
-- **Nessun indice.** I due lettori esistenti — la coda del cron
-- (`outcome, created_at`) e la superficie dei venduti (`ticket_id`) — servono
-- questa categoria come servono le altre undici. L'indice parziale per serata
-- non la riguarda: questa mail non ne porta una.
