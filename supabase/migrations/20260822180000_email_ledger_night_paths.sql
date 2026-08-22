-- I due percorsi di posta legati a una SERATA entrano nel registro degli invii.
--
-- Continuazione di `20260822130000_email_delivery_ledger.sql`, che ha creato
-- `email_deliveries` e ha lasciato dichiarati tre percorsi ancora scoperti
-- (`.planning/v1.6-TICKET-OFF-THE-MAIL.md`, §6.2). Questa migration ne copre
-- **due**; il terzo — la newsletter — non entra qui, e la ragione e' tecnica e
-- sta scritta in fondo a questo file invece che essere taciuta.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DUE CATEGORIE IN PIU', E PERCHE' NON SONO TRE
-- ─────────────────────────────────────────────────────────────────────────────
--
--   `venue_reveal`    la mail che porta l'indirizzo di una serata segreta.
--   `event_reminder`  il promemoria del giorno prima.
--
-- Il vocabolario e' chiuso in DUE posti che devono concordare — qui e in
-- `src/lib/email-delivery/categories.ts` — e la duplicazione e' voluta: il
-- compilatore difende i call site, il vincolo difende la tabella dai percorsi
-- che il compilatore non vede.
--
-- ── Perche' `venue_reveal` conta piu' delle altre dieci ──────────────────────
--
-- `venue-secrecy.md` tratta la rivelazione come **monotona e irreversibile**, e
-- dice che **arrivare tardi e' grave quanto arrivare in anticipo**, nella
-- direzione opposta: se la mail non arriva, l'ospite **non sa dove andare**, e
-- lo scopre la sera stessa, davanti a una porta.
--
-- E c'e' una seconda ragione, con una data. La decisione del proprietario del
-- 2026-08-22 (`.planning/todos/pending/guest-ticket-purchase.md`) apre
-- l'acquisto **senza registrazione** su tutte le serate: per chi compra da
-- ospite, quella mail e' **l'unica strada verso l'indirizzo**.
--
-- ── Il difetto che questa categoria rende visibile, e che nessun altro campo
--    del prodotto puo' rendere visibile ──────────────────────────────────────
--
-- `tickets.venue_reveal_sent` e `rsvps.venue_reveal_sent` si alzano quando il
-- fornitore **accetta** il lotto. Un indirizzo in lista di soppressione viene
-- accettato e non consegnato. Quindi oggi una persona con l'indirizzo soppresso
-- risulta **raggiunta per sempre** — la guardia e' a senso unico e non si
-- riabbassa — e non ricevera' mai l'indirizzo.
--
-- Questa migration **non tocca quella guardia**, e non deve: renderla piu'
-- facile da far scattare o piu' facile da riabbassare sarebbe una modifica al
-- momento della rivelazione. Aggiunge accanto il **fatto** che la mail non e'
-- arrivata, cosi' che chi organizza la serata possa raggiungere quella persona
-- per un'altra strada.

ALTER TABLE public.email_deliveries
  DROP CONSTRAINT IF EXISTS email_deliveries_category_check;

ALTER TABLE public.email_deliveries
  ADD CONSTRAINT email_deliveries_category_check CHECK (category IN (
    'ticket_confirmation',
    'guest_invitation',
    'rsvp_confirmation',
    'member_approved',
    'member_reactivated',
    'member_rejected',
    'account_invitation',
    'refund_approved',
    'refund_rejected',
    -- Le due di questa migration.
    'venue_reveal',
    'event_reminder'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LA SERATA, PERCHE' `ticket_id` DA SOLO NON BASTA A ATTRIBUIRE QUESTE DUE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `legal-compliance.md`, gate *i dati dei soci non sono i dati del prodotto*:
-- ogni dato in piu' ha una ragione dichiarata o non si raccoglie. Questa e' la
-- ragione, e non e' «gia' che ci siamo».
--
-- I destinatari di una rivelazione sono **tre insiemi uniti e deduplicati per
-- persona**: chi ha un biglietto di quella serata, chi ha un biglietto di
-- evento senza serata (`party_id IS NULL`), e chi ha una prenotazione
-- (`rsvps`). Una riga di registro per persona quindi:
--
--   * non ha **un** biglietto — puo' averne due (quello della serata e quello
--     di evento), oppure **nessuno** (la prenotazione non e' un biglietto);
--   * ha invece **una** serata, sempre.
--
-- Senza questa colonna, la superficie di chi organizza la serata non potrebbe
-- attribuire alla propria notte le mancate consegne delle prenotazioni — cioe'
-- **conterebbe meno persone di quante ne sono rimaste senza indirizzo**. La
-- direzione dell'errore e' quella sbagliata, ed e' l'unica che qui conta.
--
-- Verificato sul catalogo di produzione il 2026-08-22: `public.tickets` porta
-- sei vincoli e **nessuno di essi e' `UNIQUE (event_id, user_id)`**. Una persona
-- puo' quindi avere piu' di un biglietto per lo stesso evento, il che rende
-- l'ambiguita' sopra un fatto dello schema e non un'ipotesi.
--
-- **Non porta contenuto.** Non l'indirizzo del venue, non il corpo della mail,
-- non l'indirizzo di posta del destinatario. Solo una chiave esterna.
--
-- `ON DELETE CASCADE` come `ticket_id`: un referto di consegna su una serata che
-- non esiste piu' e' rumore che nessuna superficie puo' attribuire.

ALTER TABLE public.email_deliveries
  ADD COLUMN IF NOT EXISTS party_id uuid
    REFERENCES public.event_parties(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.email_deliveries.party_id IS
  $c$La serata a cui questo invio appartiene, per i messaggi che ne hanno una. E la colonna che rende osservabile una rivelazione non consegnata: chi la riceve puo non avere nessun biglietto (una prenotazione) o averne due (serata + evento), quindi ticket_id non basta ad attribuirla.$c$;

-- Il lettore: dalla serata alle sue mancate consegne, per categoria. Parziale,
-- perche' le nove categorie precedenti non hanno serata e non devono pesare
-- sull'indice.
CREATE INDEX IF NOT EXISTS email_deliveries_party_category_idx
  ON public.email_deliveries (party_id, category)
  WHERE party_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LA RLS NON CAMBIA, E IL SILENZIO SAREBBE STATO UNA RISPOSTA SBAGLIATA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- La migration precedente ha attivato la RLS e scritto **zero policy**, con la
-- conseguenza dichiarata: la tabella e' leggibile e scrivibile dal solo
-- `service_role`. Questa migration **non aggiunge nessuna policy**, e quindi la
-- superficie che disegna le mancate consegne di una serata dovra' leggerla con
-- il client di servizio — che e' come gia' legge i nomi dei compratori.
--
-- La condizione di uscita resta quella scritta li': la prima policy su questa
-- tabella e' un allargamento di chi vede cosa e va decisa come tale, non
-- aggiunta per far tacere un gate.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LA NEWSLETTER NON ENTRA IN QUESTA TABELLA, E NON E' UNA DIMENTICANZA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `email_deliveries` ha come chiave `provider_message_id`, e la riconciliazione
-- e' una GET su `emails.get(<id>)`. **La newsletter non produce nessuno di quei
-- due.** Verificato sull'SDK installato (`resend@6.9.2`) il 2026-08-22:
-- `src/app/(admin)/admin/newsletter/actions.ts` chiama `broadcasts.create` e
-- `broadcasts.send`, che restituiscono **un identificativo di broadcast**, non
-- di messaggio; e `Broadcast` porta uno `status` di tre valori — `draft`,
-- `queued`, `sent` — che descrive **il lotto**, non un destinatario. Non esiste,
-- su questo percorso, un esito per persona da chiedere.
--
-- Forzarla dentro avrebbe richiesto di spedire la newsletter **un messaggio per
-- destinatario** invece che come broadcast: un cambio di meccanismo d'invio su
-- una lista lunga, per ottenere una riga per iscritto. `comms-analytics.md`
-- chiede di marcare per destinatario **un invio transazionale**; qui la stessa
-- regola applicata a una lista produrrebbe rumore che insegna a ignorare il
-- canale, e — `legal-compliance.md` — moltiplicherebbe per il numero di
-- iscritti i dati conservati su persone che **non sono membri**.
--
-- Quindi il suo esito si osserva come **volume**: lo stato del broadcast, chiesto
-- al fornitore dopo l'invio invece di essere dedotto dall'assenza di errore.
-- Sta in `src/app/(admin)/admin/newsletter/actions.ts` e **non conserva niente**.
