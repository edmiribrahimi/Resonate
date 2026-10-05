-- Codice con benefit (quick task 2026-10-05, fuori fase 52.3).
--
-- Un codice sconto puo' valere 0 € e portare un BENEFIT — un'etichetta breve,
-- p. es. «1 chupito» — che lo scanner mostra alla porta quando il biglietto
-- comprato con quel codice viene scansionato, online e offline.
--
-- Tre vincoli:
--   1. discount_amount >= 0 (prima > 0): lo 0 diventa ammesso;
--   2. benefit NULL oppure 1..60 caratteri dopo il trim: una riga di overlay,
--      non un paragrafo;
--   3. un codice a 0 deve portare un benefit: senza, sarebbe un codice che non
--      fa niente e che il compratore leggerebbe come applicato.
--
-- RLS invariata: la SELECT su discount_codes e' gia' aperta (il compratore
-- valida il codice), e il benefit e' l'etichetta di un omaggio, non un dato
-- personale. Il prezzo non cambia: reserve_ticket_order continua a controllare
-- solo is_active e max_uses.
--
-- Nessun BEGIN/COMMIT: la Management API avvolge gia' la migration.

ALTER TABLE public.discount_codes
  DROP CONSTRAINT discount_codes_discount_amount_check; -- senza IF EXISTS: se il nome fosse diverso, la migration deve fallire, non lasciare il vecchio > 0

ALTER TABLE public.discount_codes
  ADD CONSTRAINT discount_codes_discount_amount_check
  CHECK (discount_amount >= 0);

ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS benefit text;

ALTER TABLE public.discount_codes
  ADD CONSTRAINT discount_codes_benefit_length_check
  CHECK (benefit IS NULL OR char_length(btrim(benefit)) BETWEEN 1 AND 60);

ALTER TABLE public.discount_codes
  ADD CONSTRAINT discount_codes_zero_needs_benefit_check
  CHECK (discount_amount > 0 OR benefit IS NOT NULL);

COMMENT ON COLUMN public.discount_codes.benefit IS
  'Omaggio legato al codice (es. «1 chupito»), mostrato dallo scanner alla porta '
  'quando si scansiona un biglietto comprato con questo codice, online e offline. '
  'La porta lo legge dal codice, non dal biglietto: un codice con vendite si '
  'DISATTIVA (is_active = false), non si cancella — cancellarlo mette a NULL '
  'tickets.discount_code_id e il benefit sparisce dalla porta.';
