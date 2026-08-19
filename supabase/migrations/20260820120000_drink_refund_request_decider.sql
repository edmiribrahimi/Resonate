-- Fase 47, piano 04 — chi ha deciso una richiesta, quando il decisore non e' una
-- persona.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- IL VINCOLO DEL PIANO 47-03 AVEVA RAGIONE, E L'HA DETTO NEL MOMENTO GIUSTO
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `drink_refund_request_decider_present` pretende che ogni riga non in attesa
-- porti un `decided_by`. Costruendo la biforcazione di `DRK-05` — un token mai
-- attivato si rimborsa da solo, su richiesta — quel vincolo si e' opposto: **un
-- rimborso automatico non ha un decisore umano**.
--
-- La strada facile sarebbe stata allentare il vincolo e lasciare `decided_by`
-- nullo su una riga approvata. Sarebbe stata una riga **decisa da nessuno**, e
-- fra sei mesi indistinguibile da un bug che ha dimenticato di scrivere
-- l'autore.
--
-- Quindi il vincolo resta, e cambia cosa lo soddisfa: **una decisione ha sempre
-- un autore, e l'autore puo' essere la regola invece di una persona.**
--
-- ── E la colonna che 47-03 si era vietata non e' questa ─────────────────────
--
-- 47-03 dichiara: *nessuna colonna dice se il rimborso e' automatico, perche'
-- quello e' una conseguenza della storia del token e non un attributo della
-- richiesta*. Vale ancora, e questa colonna non lo contraddice: **quella riga
-- vietava di congelare un GIUDIZIO al momento della richiesta**, questa registra
-- **chi ha preso la decisione** dopo che e' stata presa. Un pronostico e un
-- verbale non sono la stessa cosa.
ALTER TABLE public.drink_refund_request
  ADD COLUMN IF NOT EXISTS decided_automatically boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.drink_refund_request.decided_automatically IS
  'true quando la decisione l''ha presa la regola di DRK-05 — token mai attivato — e non una persona. In quel caso decided_by e'' NULL, e non e'' un dato mancante: e'' il fatto che nessuna persona ha deciso.';

ALTER TABLE public.drink_refund_request
  DROP CONSTRAINT IF EXISTS drink_refund_request_decider_present;

-- Una decisione ha sempre un autore: una persona, oppure la regola. Mai nessuno,
-- e mai entrambi — perche' «l'ha approvata Tizio automaticamente» e' una frase
-- che non significa niente e che nasconderebbe quale dei due percorsi ha mosso
-- il denaro.
ALTER TABLE public.drink_refund_request
  ADD CONSTRAINT drink_refund_request_decider_present
  CHECK (
    status = 'pending'
    OR (decided_by IS NOT NULL) <> decided_automatically
  );

-- Una richiesta in attesa non e' stata decisa da nessuno dei due.
ALTER TABLE public.drink_refund_request
  DROP CONSTRAINT IF EXISTS drink_refund_request_pending_undecided;
ALTER TABLE public.drink_refund_request
  ADD CONSTRAINT drink_refund_request_pending_undecided
  CHECK (status <> 'pending' OR (decided_by IS NULL AND NOT decided_automatically));
