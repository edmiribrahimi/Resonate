-- Tier misti gratis + pagamento nella stessa serata, e ora limite d'ingresso
-- per tier (fase 52.4).
--
-- 1. `free_rsvp` sparisce come tipo di serata (D-52.4-01). Restano due tipi:
--    `free_public` (nessun biglietto, nessuna porta nostra) e `paid` (tier con
--    prezzo, anche 0 €). Le serate `free_rsvp` esistenti diventano `paid`: il
--    loro tier a 0 € resta com'e' e da qui in avanti e' un biglietto gratuito
--    vero, prenotato dalla strada a totale zero. Nessun tier nasce o muore da
--    solo. La tabella `rsvps` NON si tocca: e' storico (D-50-22).
--
-- 2. `ticket_tiers.entry_until` (D-52.4-05): ora limite d'ingresso del tier,
--    nullabile. Dopo quell'istante la porta rifiuta il biglietto con la sua
--    ragione e lo staff con `door.operate` puo' ammetterlo lo stesso, lasciando
--    una riga in `door_scan_events` (D-52.4-02).
--
-- 3. Il CHECK di `door_scan_events.cause` accoglie le due cause nuove:
--    `after_entry_until` (rifiuto per ora limite) e `entry_until_overridden`
--    (ammissione dopo l'ora limite). Specchio di `DoorScanCause` in
--    `src/lib/door/outcome.ts`, nello stesso commit.
--
-- RLS invariata: `ticket_tiers` e' gia' leggibile in pubblico per le serate
-- pubblicate, e l'ora limite e' un'informazione che la pagina mostra di
-- proposito. Nessun dato personale nuovo.
--
-- I nomi dei due vincoli sono stati letti dal catalogo del laboratorio
-- (pg_constraint) il 2026-10-13. Le DROP non portano IF EXISTS: se il nome
-- fosse diverso la migration deve fallire, non lasciare il vecchio vincolo.

-- 1. free_rsvp → paid, poi il CHECK a due valori.
-- In produzione tocca una sola serata, gia' passata.
UPDATE public.event_parties SET access_type = 'paid' WHERE access_type = 'free_rsvp';

ALTER TABLE public.event_parties
  DROP CONSTRAINT event_parties_access_type_check;

ALTER TABLE public.event_parties
  ADD CONSTRAINT event_parties_access_type_check
  CHECK (access_type IN ('free_public', 'paid'));

-- 2. Ora limite d'ingresso per tier.
ALTER TABLE public.ticket_tiers
  ADD COLUMN IF NOT EXISTS entry_until time;

COMMENT ON COLUMN public.ticket_tiers.entry_until IS
  'Ora limite d''ingresso del tier, ora di Torino. Un''ora < 12 cade la mattina dopo la data '
  'della serata (stessa regola di partyEndInstant/nightBoundaryInstant in src/utils/datetime.ts). '
  'NULL = nessun limite. Dopo quell''istante la porta rifiuta il biglietto (after_entry_until) e '
  'lo staff con door.operate puo'' ammetterlo, con una riga door_scan_events cause entry_until_overridden.';

-- 3. Cause della porta: le otto di prima piu' le due nuove.
ALTER TABLE public.door_scan_events
  DROP CONSTRAINT door_scan_events_cause_check;

ALTER TABLE public.door_scan_events
  ADD CONSTRAINT door_scan_events_cause_check
  CHECK (cause IN (
    'double_read',
    'second_ticket_same_holder',
    'two_devices',
    'invalid_signature',
    'not_in_cache',
    'wrong_night',
    'refunded_before_night',
    'refunded_after_night',
    'after_entry_until',
    'entry_until_overridden'
  ));

COMMENT ON CONSTRAINT door_scan_events_cause_check ON public.door_scan_events IS
  'Specchio di DoorScanCause in src/lib/door/outcome.ts: si cambiano nello stesso commit. '
  'after_entry_until e entry_until_overridden dalla fase 52.4 (ora limite del tier).';

-- 4. Il commento della tabella dei tier, senza free_rsvp.
COMMENT ON TABLE public.ticket_tiers IS
  'I livelli di biglietto di una serata. Un livello a price = 0 su una serata paid e'' un biglietto '
  'gratuito vero: si prenota dalla strada a totale zero (reserveFreeTickets), mai venduto da SumUp, '
  'e alla porta vale come un biglietto pagato. Lo crea il percorso di creazione/modifica della serata: '
  'NESSUN PERCORSO PUBBLICO PUO'' CREARLO. Nessun vincolo di unicita'' su price = 0, di proposito: '
  'una serata puo'' avere livelli gratuiti e a pagamento insieme (fase 52.4). entry_until, se '
  'valorizzato, e'' l''ora limite d''ingresso del livello.';

-- Nessun BEGIN/COMMIT: la Management API avvolge gia' la migration.
