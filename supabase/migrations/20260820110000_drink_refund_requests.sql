-- Fase 47, piano 03 (DRK-02) — chiedere indietro i soldi di un drink non bevuto.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- PERCHE' QUESTA TABELLA ESISTE, E PERCHE' NON E' `ticket_refunds`
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Il rimborso notturno automatico se ne va con il piano 47-02 (`DRK-01`):
-- nessun processo restituisce piu' denaro da solo. Senza un percorso di
-- richiesta, al suo posto resterebbe il nulla, e chi ha pagato due drink e ne ha
-- bevuto uno non avrebbe piu' alcuna strada.
--
-- `ticket_refunds` NON e' riusata, ed e' una decisione:
--
--   * pretende `requested_by uuid NOT NULL REFERENCES auth.users` — cioe' un
--     account. I drink si comprano gia' DA OSPITE (`purchaseDrinksGuest`), e
--     dopo il perno della v1.6 nessun cliente avra' piu' un account affatto.
--   * le sue policy sono scritte su `auth.uid()`, che per un ospite e' NULL.
--
-- Due cose diverse in una tabella sola diventano due percorsi che si scoprono
-- incompatibili al primo rimborso — cioe' davanti a qualcuno che aspetta i suoi
-- soldi.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. La finestra, e sta sulla SERATA
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 72 ore di default, modificabile. Sta su `event_parties` accanto a
-- `menu_closes_at` e non come costante di prodotto, perche' e' una proprieta'
-- DELLA SERATA: una serata che finisce all'alba e una che finisce a mezzanotte
-- possono voler concedere tempi diversi, e una costante globale toglierebbe
-- quella possibilita' senza guadagnare nulla.
--
-- SI MISURA DALLA CHIUSURA DEL MENU, non dall'acquisto — lo stesso istante da cui
-- si misura la grazia dell'attivazione (`menuCloseInstant` in
-- `src/app/(public)/events/[slug]/menu/actions.ts`). Sono due istanti diversi e
-- sceglierne uno per distrazione sposta la scadenza di ore.
ALTER TABLE public.event_parties
  ADD COLUMN IF NOT EXISTS refund_request_window_hours integer NOT NULL DEFAULT 72;

ALTER TABLE public.event_parties
  DROP CONSTRAINT IF EXISTS event_parties_refund_window_check;
ALTER TABLE public.event_parties
  ADD CONSTRAINT event_parties_refund_window_check
  CHECK (refund_request_window_hours > 0);

COMMENT ON COLUMN public.event_parties.refund_request_window_hours IS
  'Per quante ore DOPO LA CHIUSURA DEL MENU si puo'' chiedere il rimborso di un token non riscattato. Default 72. Si misura dalla chiusura del menu, non dall''acquisto.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. La richiesta
-- ─────────────────────────────────────────────────────────────────────────────
--
-- UNA richiesta aperta per token, non una coda: il vincolo di unicita' e' sul
-- token e non su (token, stato). Una persona che chiede tre volte non deve
-- produrre tre righe da esaminare — e chi esamina non deve chiedersi quale delle
-- tre e' quella buona.
--
-- NESSUNA COLONNA DICE SE IL RIMBORSO E' AUTOMATICO. Quella e' una conseguenza
-- della storia del token — `activation_count`, dalla migration 20260820100000 —
-- non un attributo della richiesta. Scriverla qui congelerebbe al momento della
-- richiesta un giudizio che il piano 47-04 deve poter dare al momento della
-- decisione.
CREATE TABLE IF NOT EXISTS public.drink_refund_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Una richiesta aperta per token. `ON DELETE CASCADE` perche' una richiesta su
  -- un token che non esiste piu' non e' esaminabile da nessuno.
  token_id uuid NOT NULL UNIQUE
    REFERENCES public.drink_tokens(id) ON DELETE CASCADE,

  -- Insieme chiuso, come ogni altro stato di questo schema.
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),

  requested_at timestamptz NOT NULL DEFAULT now(),

  -- Chi decide e quando: entrambi vuoti finche' nessuno ha deciso. E' la stessa
  -- disciplina dell'annullamento alla porta — il percorso piu' semplice per
  -- muovere qualcosa e' anche quello che va reso visibile.
  decided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at timestamptz,

  -- Facoltativa, e per chi decide. Non e' un messaggio al cliente.
  decision_note text,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- Decidere significa lasciare traccia di CHI e QUANDO, insieme. Una riga
  -- decisa senza autore e' una decisione che nessuno ha preso.
  CONSTRAINT drink_refund_request_decided_together
    CHECK ((status = 'pending') = (decided_at IS NULL)),
  CONSTRAINT drink_refund_request_decider_present
    CHECK (status = 'pending' OR decided_by IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS drink_refund_request_pending_idx
  ON public.drink_refund_request (status, requested_at)
  WHERE status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Il confine, che non e' la server action
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Un ospite NON HA UNA SESSIONE: `auth.uid()` per lui e' NULL. Le sue scritture
-- passano dal client di servizio, esattamente come gia' fa la redenzione da
-- ospite (`redeemDrinkTokenGuest`), che il servizio esegue dopo aver verificato
-- la FIRMA del token.
--
-- Quindi questa tabella non concede NULLA ad `anon` e ad `authenticated`: il
-- client di servizio scavalca la RLS per costruzione, e ogni altro lettore deve
-- essere fermato qui. La lettura per chi esamina e' dietro la stessa capability
-- che gia' protegge l'emissione di un rimborso, `staff.manage`.
--
-- IL MIDDLEWARE E' UX, LA RLS E' SICUREZZA. Una superficie protetta solo dalla
-- server action e' una superficie protetta da un redirect: qui ci sono nomi di
-- chi ha comprato e importi, e la pagina che li mostrera' (47-04) e' una pagina
-- che qualcuno fotografa.
ALTER TABLE public.drink_refund_request ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS drink_refund_request_select_staff ON public.drink_refund_request;
CREATE POLICY drink_refund_request_select_staff ON public.drink_refund_request
  FOR SELECT USING ((SELECT private.has_capability('staff.manage')));

DROP POLICY IF EXISTS drink_refund_request_update_staff ON public.drink_refund_request;
CREATE POLICY drink_refund_request_update_staff ON public.drink_refund_request
  FOR UPDATE USING ((SELECT private.has_capability('staff.manage')));

-- Nessuna policy di INSERT e nessuna di DELETE, e l'assenza e' la regola:
-- una richiesta la crea il client di servizio dopo aver verificato la firma del
-- token, e non si cancella. Una policy assente rifiuta; una policy larga
-- "per comodita'" e' il modo in cui un confine smette di esistere.
