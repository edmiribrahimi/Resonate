-- Biglietteria esterna (quick 2026-10-13, fuori fase 52.3).
--
-- Una serata `paid` puo' dichiarare che i biglietti li vende un TERZO (il
-- locale, su una piattaforma di biglietteria). La pagina pubblica mostra i tier
-- con i prezzi e ogni click esce verso `external_tickets_url`; la cassa nostra
-- rifiuta la serata in `buildOrderQuote`. Nessun ordine, nessun SumUp, nessuna
-- mail, nessun QR: la porta e' del venditore.
--
-- `external_tickets_seller` valorizzato = serata venduta altrove. L'URL puo'
-- mancare all'inizio (la pagina dice «Tickets soon»); label e URL senza seller
-- non hanno senso e il CHECK li rifiuta.
--
-- `ticket_tiers.sold_out`: esaurito A MANO. Su una serata esterna e' l'unico
-- modo di saperlo (non vediamo le vendite del terzo); su una nostra vince
-- comunque sul conteggio. Lo onora `tierStatus` (UI) e `buildOrderQuote`
-- (server).
--
-- RLS invariata: event_parties e ticket_tiers sono gia' leggibili in pubblico
-- per le serate pubblicate; nessuna delle quattro colonne e' un dato personale
-- o un posto.
--
-- Nessun BEGIN/COMMIT: la Management API avvolge gia' la migration.

ALTER TABLE public.event_parties
  ADD COLUMN IF NOT EXISTS external_tickets_seller text,
  ADD COLUMN IF NOT EXISTS external_tickets_url text,
  ADD COLUMN IF NOT EXISTS external_tickets_label text;

ALTER TABLE public.event_parties
  ADD CONSTRAINT event_parties_external_seller_length_check
  CHECK (external_tickets_seller IS NULL OR char_length(btrim(external_tickets_seller)) BETWEEN 1 AND 60);

ALTER TABLE public.event_parties
  ADD CONSTRAINT event_parties_external_url_check
  CHECK (
    external_tickets_url IS NULL
    OR (external_tickets_seller IS NOT NULL
        AND external_tickets_url ~ '^https://[^[:space:]]+$'
        AND char_length(external_tickets_url) <= 500)
  );

ALTER TABLE public.event_parties
  ADD CONSTRAINT event_parties_external_label_check
  CHECK (
    external_tickets_label IS NULL
    OR (external_tickets_seller IS NOT NULL
        AND char_length(btrim(external_tickets_label)) BETWEEN 1 AND 40)
  );

COMMENT ON COLUMN public.event_parties.external_tickets_seller IS
  'Chi vende i biglietti di questa serata quando NON li vendiamo noi (es. il locale). '
  'Valorizzato = serata venduta altrove: la pagina mostra i tier come link in uscita, '
  'buildOrderQuote rifiuta ogni ordine, nessun QR nostro alla porta.';
COMMENT ON COLUMN public.event_parties.external_tickets_url IS
  'Link unico dell''evento sulla piattaforma del venditore, https. NULL finche'' non esiste: '
  'la pagina dice «Tickets soon» e i tier restano senza link.';
COMMENT ON COLUMN public.event_parties.external_tickets_label IS
  'Testo del bottone in uscita (es. «Tickets on Xceed»), max 40. NULL = «Get tickets».';

ALTER TABLE public.ticket_tiers
  ADD COLUMN IF NOT EXISTS sold_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ticket_tiers.sold_out IS
  'Esaurito A MANO da chi organizza. Vince su quantita'', date e conteggi, in UI e in '
  'buildOrderQuote. Serve sulle serate vendute da terzi (non vediamo le loro vendite) '
  'e vale anche sulle nostre.';
