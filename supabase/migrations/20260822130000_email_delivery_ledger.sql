-- Il registro degli invii — perche' «spedita» e «consegnata» non sono la stessa
-- cosa, e fino a oggi il prodotto non sapeva distinguerle.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- IL DIFETTO CHE QUESTA TABELLA ESISTE PER RENDERE VISIBILE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `src/lib/email.ts` lanciava soltanto quando il fornitore restituiva un
-- `error`. La lista di soppressione del fornitore fa un'altra cosa: **accetta la
-- chiamata e non consegna**. Un indirizzo ci finisce dopo un rimbalzo duro o una
-- segnalazione di spam — e fra le cause elencate dalla documentazione c'e' «il
-- destinatario ha un refuso nell'indirizzo». Da quel momento in poi ogni
-- messaggio verso quell'indirizzo viene marcato `suppressed` e **non viene
-- consegnato**, con `error` nullo e un identificativo di ritorno regolare.
--
-- Il percorso raggiungibile, per intero: una persona sbaglia a scrivere il
-- proprio indirizzo una volta sola -> rimbalzo duro -> l'indirizzo entra in
-- lista -> **da li' in poi ogni biglietto viene saltato in silenzio**, e la
-- persona lo scopre alla porta, davanti a una fila. `checkin-offline.md` dice
-- qual e' il costo di quell'errore: rifiutare un ospite valido e' peggio che
-- ammetterne uno doppio, perche' il primo avviene davanti a qualcuno.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- PERCHE' UNA TABELLA E NON UN LOG
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `meta-gates.md` e' esplicito: **questo progetto non ha error tracking**, quindi
-- «loggare l'errore» non e' sufficiente — il log e' un posto dove nessuno
-- guarda. Un fallimento che conta deve avere un **effetto osservabile**. Una
-- riga qui e' quell'effetto: viene letta dalla superficie admin dei biglietti
-- venduti, che mostra per ogni biglietto se la sua mail e' arrivata, non e'
-- arrivata, o non si sa.
--
-- E' la stessa disciplina che `ticketing-payments.md` impone gia' al denaro —
-- *verifica sempre con una GET, mai fidarsi del corpo del webhook* — spostata
-- sulla posta: l'esito si **verifica**, non si assume dalla risposta d'invio.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- COSA NON C'E' QUI DENTRO, E PERCHE'
-- ─────────────────────────────────────────────────────────────────────────────
--
-- **L'indirizzo del destinatario non si conserva.** `legal-compliance.md`, gate
-- *i dati dei soci non sono i dati del prodotto*: ogni dato in piu' ha una
-- ragione dichiarata o non si raccoglie. L'indirizzo e' gia' su `profiles` e si
-- risolve da `user_id` quando serve; duplicarlo qui creerebbe una seconda copia
-- di PII con la propria conservazione e nessuna domanda in piu' a cui risponde.
--
-- **La conseguenza va detta**: per gli invii che non hanno un account dietro —
-- l'invito da guest list — la riga porta la categoria e l'identificativo del
-- fornitore, e l'indirizzo va cercato sul pannello del fornitore. E' una
-- limitazione dichiarata, non una svista.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. La tabella
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- L'identificativo che il fornitore restituisce all'invio. E' la chiave con
  -- cui si va a chiedergli l'esito, ed e' UNIQUE perche' una riconciliazione che
  -- girasse due volte sullo stesso invio non deve produrre due verdetti
  -- indipendenti su un fatto solo.
  provider_message_id text NOT NULL UNIQUE,

  -- ── Vocabolario CHIUSO, una voce per messaggio che il prodotto sa spedire ──
  --
  -- Chiuso in due posti che devono concordare: qui e in
  -- `src/lib/email-delivery/categories.ts`. Aggiungere un messaggio e' una migration
  -- dichiarata, esattamente come per le chiavi di scopo dell'import calendario.
  --
  -- Perche' chiuso e non libero: `comms-analytics.md`, gate *errori
  -- distinguibili*. Una categoria libera diventa una stringa scritta a mano che
  -- diverge fra due call site, e due varianti dello stesso messaggio si contano
  -- come due cose diverse — che e' il modo in cui una superficie smette
  -- silenziosamente di mostrare meta' dei fallimenti.
  category text NOT NULL,
  CONSTRAINT email_deliveries_category_check CHECK (category IN (
    'ticket_confirmation',
    'guest_invitation',
    'rsvp_confirmation',
    'member_approved',
    'member_reactivated',
    'member_rejected',
    'account_invitation',
    'refund_approved',
    'refund_rejected'
  )),

  -- A chi era diretto, quando c'e' un account dietro. `ON DELETE SET NULL`: la
  -- riga sopravvive alla cancellazione dell'account perche' descrive un INVIO
  -- avvenuto, che resta un fatto anche quando il destinatario non e' piu' qui.
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Il biglietto di cui questo messaggio e' la copia di cortesia, quando ce n'e'
  -- uno. **E' la colonna che rende la riga osservabile**: la superficie admin
  -- dei venduti la legge per attaccare il segno alla riga giusta.
  --
  -- `ON DELETE CASCADE` e non `SET NULL`: un rimborso cancella il biglietto, e
  -- un referto di consegna orfano su un biglietto che non esiste piu' e' rumore
  -- che nessuna superficie puo' attribuire.
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,

  -- ── L'esito, in quattro stati che NON si collassano ───────────────────────
  --
  --   unverified   spedito, esito non ancora chiesto al fornitore. E' lo stato
  --                iniziale ed e' onesto: dice *non lo sappiamo ancora*, non
  --                *e' andata bene*.
  --   delivered    il fornitore dice che e' stata consegnata.
  --   undelivered  il fornitore dice che NON e' stata consegnata — rimbalzo,
  --                soppressione, reclamo, fallimento, annullamento.
  --   unknown      abbiamo chiesto e non abbiamo una risposta utilizzabile: la
  --                chiamata e' fallita a ripetizione, o l'esito e' una parola
  --                che questo codice non conosce.
  --
  -- Quattro e non tre: `unverified` e `unknown` sono due cose diverse — «non
  -- abbiamo ancora chiesto» e «abbiamo chiesto e non si capisce» — e collassarle
  -- e' il difetto del newsletter registrato in `.planning/codebase/CONCERNS.md`,
  -- *"Qualcosa e' andato storto"* per qualunque causa.
  outcome text NOT NULL DEFAULT 'unverified',
  CONSTRAINT email_deliveries_outcome_check CHECK (outcome IN (
    'unverified', 'delivered', 'undelivered', 'unknown'
  )),

  -- La parola grezza del fornitore, conservata come l'ha detta lui.
  --
  -- **Non e' ridondante rispetto a `outcome`.** L'SDK installato (resend 6.9.2)
  -- dichiara per questo campo una unione di tipi che **NON contiene
  -- `suppressed`**, mentre il fornitore ha introdotto quello stato come stato di
  -- primo livello l'8 gennaio 2026. Un codice che si fidasse dell'unione
  -- dell'SDK non avrebbe un ramo per la causa piu' importante di tutte. Quindi
  -- la parola si legge come stringa, si classifica, **e si conserva**: se domani
  -- ne arriva una che questo codice non conosce, l'esito diventa `unknown` e la
  -- parola resta qui da leggere invece di sparire.
  provider_last_event text,

  -- Quante volte abbiamo chiesto, e quando l'ultima. Servono a distinguere «non
  -- abbiamo ancora chiesto» da «abbiamo chiesto sei volte e continua a non
  -- rispondere», che sono due problemi diversi con due destinatari diversi.
  check_attempts integer NOT NULL DEFAULT 0,
  checked_at timestamptz,

  -- Perche' l'ultima verifica non ha concluso. Una causa per riga, mai un
  -- messaggio unico per cause diverse.
  check_failure text,

  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_deliveries IS
  $c$Un invio, il suo identificativo presso il fornitore e il suo esito VERIFICATO. Esiste perche' la lista di soppressione del fornitore accetta la chiamata e non consegna: senza questa tabella una mail non recapitata e' indistinguibile da una recapitata.$c$;

COMMENT ON COLUMN public.email_deliveries.outcome IS
  $c$unverified = non ancora chiesto - delivered - undelivered - unknown = chiesto e senza risposta utilizzabile. Quattro stati che non si collassano.$c$;

COMMENT ON COLUMN public.email_deliveries.provider_last_event IS
  $c$La parola grezza del fornitore. Conservata perche' l'unione di tipi dell'SDK 6.9.2 non contiene `suppressed`, che e' la causa piu' importante.$c$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Gli indici, uno per lettore
-- ─────────────────────────────────────────────────────────────────────────────

-- Il cron di riconciliazione: le righe ancora senza esito, dalla piu' vecchia.
CREATE INDEX IF NOT EXISTS email_deliveries_outcome_created_idx
  ON public.email_deliveries (outcome, created_at);

-- La superficie admin dei venduti: da un insieme di biglietti alle loro righe.
CREATE INDEX IF NOT EXISTS email_deliveries_ticket_idx
  ON public.email_deliveries (ticket_id)
  WHERE ticket_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS: attiva, e ZERO policy
-- ─────────────────────────────────────────────────────────────────────────────
--
-- **Nessuna policy e' una decisione, non una dimenticanza.** Con RLS attiva e
-- nessuna policy la tabella e' leggibile e scrivibile dal solo `service_role`,
-- che e' esattamente l'insieme di lettori che deve avere: la registra
-- `src/lib/email.ts` con il client di servizio, la riconcilia il cron con lo
-- stesso, e la legge la superficie admin dei venduti, che gia' oggi legge i nomi
-- dei compratori per quella via.
--
-- **Nessun utente la legge**, e non serve che lo faccia: il valore per chi ha
-- comprato non e' sapere che la mail non e' arrivata, e' avere il biglietto
-- comunque — che e' l'altra meta' di questa riparazione. Aggiungere una policy
-- di lettura per l'utente sarebbe un allargamento di chi vede cosa, deciso da un
-- effetto collaterale.
--
-- `access-gating.md`: il middleware e' UX, la RLS e' sicurezza. Qui la RLS e'
-- l'unico confine, perche' non esiste nessun'altra strada verso questa tabella.
--
-- ── IL CONFLITTO CON UN GATE, DICHIARATO INVECE CHE AGGIRATO ─────────────────
--
-- `supabase-data.md` porta il gate *tabella nuova = policy nuova*: «nessuna
-- tabella con dati non pubblici creata senza RLS abilitata **e almeno una
-- policy**, nella stessa migration». Questa migration abilita la RLS e non
-- scrive nessuna policy, e la divergenza dalla lettera del gate e' voluta.
--
-- La ragione del gate e' scritta accanto a lui: *una tabella senza RLS e'
-- leggibile da chiunque abbia la chiave anonima*. Con RLS attiva e zero policy
-- la chiave anonima non legge **niente** — che e' l'esito piu' restrittivo
-- possibile, non uno meno restrittivo. `meta-gates.md`: quando due requisiti
-- confliggono vince il piu' restrittivo, e il conflitto si documenta.
--
-- La condizione di uscita, perche' qualcuno un giorno vorra' aprirla: la prima
-- policy su questa tabella e' un allargamento di chi vede cosa e va decisa come
-- tale, non aggiunta per far tacere un gate.
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
