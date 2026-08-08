# Fase 35: Per-Night Assignments — Mappa dei pattern

**Mappato:** 2026-08-08
**File analizzati:** 18 (4 nuovi, 14 modificati)
**Analoghi trovati:** 17 / 18

> **Lingua.** Prosa in italiano. Percorsi, tabelle, colonne, funzioni, chiavi di
> capability e identificatori restano in inglese: sono il contenuto del
> repository, non una traduzione.
>
> **Questo repository e' PUBBLICO** e `.planning/` e' tracciato. Qui si nominano
> **ruoli**, mai persone.

---

## Come si legge questo documento

Ogni voce risponde a tre domande, e la terza e' quella che questo documento
esiste per porre:

1. **Qual e' l'analogo piu' vicino gia' in questo repository**, con percorso e
   un estratto reale?
2. **Quale convenzione stabilisce quell'analogo** che il codice nuovo deve
   seguire?
3. **Dove l'analogo fa qualcosa che il codice nuovo NON deve copiare?**
   La sezione § *Cosa NON copiare* raccoglie i sette casi misurati.

**Ogni riga `file:riga` di questo documento e' stata letta in questa sessione.**
Dove la ricerca citava un percorso che non esiste piu', la correzione e' segnata
in § *Correzioni a RESEARCH.md*.

---

## File Classification

| File nuovo/modificato | Ruolo | Data flow | Analogo piu' vicino | Qualita' |
|---|---|---|---|---|
| `supabase/migrations/2026…_party_assignments.sql` **(nuovo)** | migration | DDL + seed + RLS | `20260808002000_membership_register.sql` | **exact** |
| `supabase/migrations/2026…_party_credits.sql` **(nuovo)** | migration | DDL + RLS | `20260808002000_membership_register.sql` (forma) + `20260225150000_party_architecture.sql:31-37` (policy) | **exact** |
| `scripts/verify-no-credit-account.mjs` **(nuovo)** | test/verifica | batch, grep strutturale | `scripts/verify-no-header-identity.mjs` | **exact** |
| `src/app/(organizer)/organizer/events/[id]/assignments/page.tsx` **(nuovo)** | page (server component) | request-response | `src/app/(organizer)/organizer/events/[id]/guest-list/page.tsx` | **exact** |
| `src/app/(organizer)/organizer/events/[id]/assignments/actions.ts` **(nuovo)** | server action | CRUD + attribuzione | `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts` | **exact** |
| `private.has_capability` (dentro la migration) | funzione SQL | resolver / query | se stessa, `20260807000000_capability_model.sql:192-217` | **exact** |
| `src/lib/membership/acts.ts` | costanti / union sorgente | — | se stesso + `src/lib/door/outcome.ts` | **exact** |
| `src/lib/capabilities/keys.ts` | costanti / union sorgente | — | se stesso, `:101-118` (Record totale) | **exact** |
| `src/lib/capabilities/server.ts`, `guards.ts` | DAL server-only | request-response | `guards.ts:161-169` (`assertStaffManage`) | **exact** |
| `src/lib/door/require-operator.ts` | guard | request-response | se stesso, `:130-134` (unione taggata) | **exact** |
| `src/app/api/tickets/checkin/undo/route.ts` | route handler | request-response | `src/app/api/tickets/checkin/route.ts` (stesso envelope) | **exact** |
| `src/app/api/tickets/attendance/route.ts` | route handler | batch download | se stesso, `:35-55` (payload additivo) | **exact** |
| `src/lib/offline/sync-manager.ts` | service (drain) | event-driven / batch | se stesso, `:102-175` | **exact** |
| `src/lib/offline/checkin-store.ts` | store (IndexedDB) | file-I/O locale | se stesso, `:425-457` (step v4) | **exact** |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` | component | event-driven | se stesso, `:862-892` | **exact** |
| `src/types/database.ts` | tipi | — | `:422-444` (`MembershipActRow`) | **exact** |
| `scripts/rls-baseline.mjs` (`PROBE_PAYLOADS` `:1069`) | test harness | batch | `:1092-1099` (`door_scan_events`) | **exact** |
| `scripts/verify-capabilities.mjs` (`ROLE_GRANTS` `:173`) | test harness | batch | `:200-206` (le righe `door.operate` / `register.read`) | **exact** |
| `scripts/container/seed.mjs` | test harness / seed | batch | `:194-208` + `:230-249` | **role-match** |
| `.planning/phases/35-…/35-HUMAN-UAT.md` **(nuovo)** | documento | — | `43-HUMAN-UAT.md:36-93` | **exact** |

---

## Pattern Assignments

### 1. `supabase/migrations/2026…_party_assignments.sql` (migration, DDL+RLS)

**Analogo:** `supabase/migrations/20260808002000_membership_register.sql`
(495 righe, letto per intero). E' l'analogo esatto: stessa fase di lavoro
(tabella nuova + capability nuova + RLS + writer `SECURITY DEFINER`), scritto
tre giorni fa, e cita esplicitamente la fase 35 in due punti.

#### 1a. Intestazione: le N modifiche, UNA transazione

`membership_register.sql:1-61` — la forma dell'intestazione **e' il pattern**,
non decorazione. Elenca le modifiche, poi enumera come fallisce ogni singola
meta' applicata, poi chiude con l'idempotenza:

```sql
-- Four changes, ONE transaction. A half-applied version of this file is strictly
-- worse than none of it, and each half is bad in its own way:
--
--   * the table without its capability is a register nobody can read, …
--   * the capability without the table is a ninth key that
--     `scripts/verify-capabilities.mjs` compares against a catalogue that has it …
--   * the table without the function is a register with no writer, …
--   * the function without its REVOKE is a `SECURITY DEFINER` writer of
--     `public.profiles.role` reachable by any authenticated session, which is a
--     privilege-escalation primitive and not a partial feature.
--
-- So `BEGIN; ... COMMIT;` is not decoration here either.
--
-- Idempotence: `IF NOT EXISTS` on the table and both indexes, `on conflict do
-- nothing` on both seed inserts, `DROP POLICY IF EXISTS` before the policy, and
-- `CREATE OR REPLACE` for the function — the idempotent form for an object that
-- cannot take `IF NOT EXISTS`.

BEGIN;
```

**Convenzione da seguire:** l'intestazione dichiara (a) le modifiche numerate,
(b) come fallisce ogni meta', (c) la strategia di idempotenza voce per voce.
`BEGIN;` / `COMMIT;` espliciti.

#### 1b. Idempotenza in una coda applicata a mano — la regola con il suo precedente

`20260808001000_role_implies_approved.sql:103-117`:

```sql
-- IDEMPOTENZA — WR-04 della code review del 2026-08-08.
-- Il `DROP ... IF EXISTS` non e' cosmetico … le sei migration di questa fase
-- vengono applicate A MANO, una alla volta. Senza questa riga, una seconda
-- esecuzione di QUESTO file solleva `42710` (duplicate_object), manda in
-- rollback l'intera transazione e lascia NON APPLICATA tutta la coda che segue …
-- Ri-eseguire deve essere sicuro, o nessuno ri-esegue quando dovrebbe.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_implies_approved;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_implies_approved
  CHECK (role NOT IN ('master', 'organizer', 'staff') OR status = 'approved');
```

**Convenzione:** `DROP CONSTRAINT IF EXISTS` **prima di ogni** `ADD CONSTRAINT`;
`IF NOT EXISTS` su tabelle e indici; `ON CONFLICT DO NOTHING` su ogni seed;
`CREATE OR REPLACE` per le funzioni. **Vincoli con nome esplicito, mai inline**
(`:97-101`: un `CHECK` inline verrebbe auto-nominato `..._check1`, con entrambi
applicati e nessuno dei due greppabile).

#### 1c. Il secondo braccio dell'OR — il corpo da modificare

`20260807000000_capability_model.sql:192-217`, letto per intero. Il corpo
attuale e' il **braccio 1** che deve restare byte-identico:

```sql
CREATE OR REPLACE FUNCTION private.has_capability(
  p_capability text,
  p_party_id   uuid default null
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- A subject holds a capability if ANY source grants it. Phase 32 has exactly
  -- one source: the role grant below. A second source — a per-night assignment
  -- — is added by a later phase as another arm of this same OR, by editing this
  -- body. No policy and no caller changes when it lands.
  select exists (
    select 1
    from public.profiles p
    join private.role_capabilities rc on rc.role = p.role
    where p.id = (select auth.uid())
      and rc.capability = p_capability
      and (not rc.requires_approved or p.status = 'approved')
  );
$$;

GRANT EXECUTE ON FUNCTION private.has_capability(text, uuid) TO authenticated, anon;
```

**Convenzioni vincolanti su questo corpo:**
- `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''`, **ogni
  riferimento schema-qualificato** (`:166-171`: una `SECURITY DEFINER` con
  search_path mutabile lascia scegliere al chiamante quale `profiles` legge il
  definer).
- Il `GRANT EXECUTE` va **ripetuto** dopo un `CREATE OR REPLACE` che cambi la
  firma; con firma invariata i grant sopravvivono, ma la riga va riletta e non
  assunta.
- **Ogni call site nuovo si scrive `(select private.has_capability('x', y))`**
  — `:177-184`: non e' `STABLE` a produrre la valutazione una volta per
  statement, e' il wrapper `(select …)`, provato con `EXPLAIN` su questo
  database.
- `p_party_id IS NOT NULL` come **prima** condizione del braccio 2. Le 67 policy
  esistenti chiamano con `NULL`; senza quella riga un'assegnazione a una notte
  concede la capability ovunque.

#### 1d. La tabella: le quattro proprieta' copiate dall'analogo, e la divergenza dichiarata

`membership_register.sql:144-160` **nomina il proprio analogo e la propria
divergenza**. E' il pattern di scrittura, non solo il contenuto:

```sql
-- The template is `public.door_scan_events`
-- (`20260805120000_door_scan_events.sql:60-163`), the only append-only register
-- this repository owns, and the four properties copied from it each carry their
-- own reasoning there:
--
--   * `ON DELETE SET NULL`, never `CASCADE` (`:41-45`, `:73-81`) — the lesson of
--     the `ticket_refunds` cascade that destroyed the audit row written one
--     statement earlier …
--   * one index per way the table is actually read (`:122-138`).
--   * RLS on with a SELECT policy and NO write policy (`:140-163`) …
--   * text CHECKs mirroring a TypeScript union defined in a module that imports
--     nothing (`:55-58`), which here is `src/lib/membership/acts.ts`.
--
-- AND ONE DELIBERATE DIVERGENCE FROM IT, which is D-22 and is section 2b.
```

**Convenzione:** la migration della fase 35 nomina `membership_register.sql`
come proprio template, elenca cosa copia, e **dichiara la propria divergenza in
una sezione con il suo numero**.

#### 1e. Indici: uno per ogni modo in cui la tabella viene letta davvero

`membership_register.sql:283-297` — e il secondo indice non e' simmetria:

```sql
-- One actor's history — and this one is not symmetry. `community-membership.md`,
-- gate *chi decide è tracciato*: **the simplest path to let somebody in is also
-- the one that must be made visible.** Without this index that read exists in
-- principle and is never performed.
CREATE INDEX IF NOT EXISTS idx_membership_acts_actor
  ON public.membership_acts (actor_id, at DESC);
```

L'indice **parziale** ha il suo precedente in `door_scan_events.sql:128-138`:

```sql
-- The door looks a subject up by ticket on a conflict; at the door a slow query
-- is a queue.
CREATE INDEX IF NOT EXISTS idx_door_scan_events_ticket
  ON public.door_scan_events (ticket_id)
  WHERE ticket_id IS NOT NULL;
```

**Convenzione:** ogni indice porta la frase che dice **quale lettura** serve.
L'indice unico parziale `WHERE revoked_at IS NULL` di `party_assignments` segue
questa forma.

#### 1f. RLS: policy nella stessa migration, e l'omissione dichiarata

`membership_register.sql:314-349`:

```sql
-- Without this, anyone holding the anonymous key reads the whole register
-- through PostgREST, rejections included. The middleware decides where somebody
-- may GO; this decides what they may READ, and only this is the security
-- boundary (`CLAUDE.md`, operating principle 2).

ALTER TABLE public.membership_acts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membership_acts_select_register_read ON public.membership_acts;

CREATE POLICY membership_acts_select_register_read ON public.membership_acts
  FOR SELECT USING ((SELECT private.has_capability('register.read')));

-- No INSERT, UPDATE or DELETE policy, and the omission is DELIBERATE. …
-- Only one other table in this repository omits its write policies on purpose
-- (`20260805120000_door_scan_events.sql:158-163`), so without this paragraph the
-- next reader would take the gap for a bug and repair it …
```

**Convenzione:** nome policy `<tabella>_<verbo>_<questione>`; `DROP POLICY IF
EXISTS` prima; predicato **sempre** dentro `(SELECT …)`; ogni omissione di una
policy di scrittura porta il proprio paragrafo.

#### 1g. La chiave di capability nuova: come si conia

`membership_register.sql:63-131` — il precedente completo della decima chiave.
La regola di naming e' a `keys.ts:38-45` e la migration la applica:

```sql
-- Named by the QUESTION it answers, not by the predicate it happens to resolve
-- to … the reason `staff.manage`, `organizer.access` and `door.operate` are three
-- keys sharing one predicate rather than one key.

INSERT INTO private.capabilities (key, description) VALUES
  ('register.read', 'Read the register of acts … Requires an APPROVED staff role on both grants (D-19) …')
ON CONFLICT (key) DO NOTHING;

INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  ('master',    'register.read', true),
  ('organizer', 'register.read', true)
ON CONFLICT (role, capability) DO NOTHING;
```

E il puntatore al meccanismo che rende vere le rinunce (`:133-138`):

```sql
-- WHERE THE SIX REFUSALS OF THIS KEY ARE ASSERTED … `scripts/verify-capabilities.mjs`,
-- side 5. Its `ROLE_GRANTS` declares every (role × capability) pair — 36 after
-- this file, 20 grants and 16 refusals — and exits 1 naming the pair both when a
-- declared refusal acquires a row and when a declared grant loses one. A comment
-- can be ignored; that check cannot.
```

**Convenzione:** `description` NOT NULL e scritta per esteso; la rinuncia e'
**l'assenza di una riga**, mai una colonna `granted`; il paragrafo che nomina le
rinunce **punta a `verify-capabilities.mjs`** invece di sostituirsi ad esso.

#### 1h. Il writer atomico: firma, lock, REVOKE-poi-GRANT

`membership_register.sql:388-493`. Tre estratti che il writer della fase 35
(`record_party_assignment_act`, se il piano lo crea) deve replicare:

```sql
CREATE OR REPLACE FUNCTION public.record_membership_act(...)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE …
BEGIN
  -- Lock and read the subject as it is NOW. `for update` and not a plain select:
  -- the before-values written into the register must be the ones this statement
  -- is about to overwrite …
  SELECT p.role, p.status, p.membership_code
    INTO v_subject
    FROM public.profiles p
   WHERE p.id = p_subject_id
     FOR UPDATE;

  IF NOT FOUND THEN
    -- The message names the SUBJECT IDENTIFIER and nothing else. Never the
    -- address, never the full name: a raised message reaches a log, and on this
    -- project a log reaches a screenshot.
    RAISE EXCEPTION 'membership_acts.subject_not_found: %', p_subject_id
      USING ERRCODE = 'no_data_found';
  END IF;
```

```sql
-- REVOKE first and GRANT second, in that order and as two statements rather than
-- assumed: Postgres grants EXECUTE to PUBLIC by default on every new function,
-- so the GRANT alone would leave the default in place.

REVOKE ALL ON FUNCTION public.record_membership_act(uuid, text, uuid, text, text, text, text, uuid)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_membership_act(uuid, text, uuid, text, text, text, text, uuid)
  TO service_role;
```

**Convenzione:** ogni funzione `SECURITY DEFINER` nuova di questa fase ripete
`REVOKE … FROM public, anon, authenticated;` **poi** `GRANT EXECUTE … TO
service_role;`, in quest'ordine, e chiude con un `COMMENT ON FUNCTION` che dice
perche' esiste.

#### 1i. L'allargamento del CHECK `act` — la forma esatta

`membership_register.sql:174-183` e' il CHECK da allargare. La forma idempotente
del `DROP`/`ADD` e' quella di § 1b. **La modifica di `act` e la modifica di
`MembershipAct` in `src/lib/membership/acts.ts` stanno nello stesso commit** —
`acts.ts:10-33` lo scrive, con la ragione (una divergenza non fallisce
rumorosamente: produce un `23514` al momento in cui qualcuno compie l'atto).

---

### 2. `supabase/migrations/2026…_party_credits.sql` (migration, DDL+RLS)

**Analogo di forma:** `membership_register.sql` (tutto § 1).
**Analogo di policy:** `20260225150000_party_architecture.sql:30-37`.
**Vicino sbagliato:** `20260226100000_artist_profiles.sql:25-27` — vedi
§ *Cosa NON copiare*, caso A.

Il gate di pubblicazione da **ereditare**:

```sql
-- 20260225150000_party_architecture.sql:30-37
-- Published events' parties readable by anyone
CREATE POLICY event_parties_select_published ON public.event_parties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.is_published = true
    )
  );
```

**Convenzione:** la policy di lettura di `party_credits` fa una `EXISTS` verso
`public.event_parties` → `public.events` con `is_published = true`, **mai**
`USING (true)`. La migration scrive la ragione accanto, perche' il vicino
(`artists`) e' `USING (true)` e la simmetria sembrera' la scelta ovvia.

E la garanzia strutturale di ASSIGN-06 — l'**assenza** di una colonna — ha il
suo precedente scritto in `20260808000500_staff_role.sql:154-171`:

```sql
-- HOW A REFUSAL IS EXPRESSED, and the trap that inverts it. A refusal is the
-- absence of a row — there is deliberately **no `granted` column** on this
-- table. …
-- There is no `granted` in that `EXISTS`. A `granted = false` row would
-- therefore **GRANT** the capability — reading as an explicit denial to a human
-- and as a permission to Postgres, in every policy call site at once.
```

**Convenzione:** il paragrafo su `party_credits` che dice *«non c'e' nessuna
colonna che nomini un account»* si scrive in **questa** forma — nominando il
join che qualcuno scriverebbe in buona fede, non come una nota di stile.

---

### 3. ASSIGN-04 e la decisione bloccata «solo i ruoli staff sono assegnabili»

> **Questa sotto-sezione contiene l'unica lacuna strutturale che ho trovato, e
> va risolta nel PLAN prima della prima riga di DDL.**

#### 3a. `assigned_by <> user_id` — il `CHECK` funziona, e il precedente esiste

Confronta **due colonne della stessa riga**: e' esprimibile come `CHECK` e viene
valutato per ogni scrittura da ogni ruolo, service client compreso. Precedente:
`membership_acts_actor_attributed` (`membership_register.sql:228-231`):

```sql
  CONSTRAINT membership_acts_actor_attributed CHECK (
    (actor_kind = 'user'   AND actor_id IS NOT NULL) OR
    (actor_kind = 'system' AND actor_id IS NULL)
  ),
```

E la ragione per cui e' un `CHECK` e non un trigger e non una policy —
`role_implies_approved.sql:90-95`:

```sql
-- A CHECK has no equivalent one-line off switch. Relaxing it requires an
-- explicit `DROP CONSTRAINT`, which is visible in the migration that does it and
-- detectable by re-reading `pg_constraint`. The trigger alternative is therefore
-- recorded as **considered and refused**, not overlooked.
```

**La rivendicazione di C9 e' verificata riga per riga in questa sessione.** Le
tre route della porta scrivono con il client service, che bypassa ogni RLS:

| Route | Riga | Statement |
|---|---|---|
| `src/app/api/tickets/checkin/route.ts` | **:224** | `const serviceClient = getServiceClient();` |
| `src/app/api/tickets/checkin/undo/route.ts` | **:93** | `const serviceClient = getServiceClient();` |
| `src/app/api/membership/verify/route.ts` | **:193** | `const serviceClient = getServiceClient();` |
| `src/app/api/tickets/attendance/route.ts` | :206, :548 | idem |

E `record_membership_act` ha `EXECUTE` **solo** a `service_role`
(`membership_register.sql:484-488`). Quindi una `WITH CHECK` policy su
`party_assignments` **non verrebbe valutata sul percorso reale**. Il confine
della porta e' `requireDoorOperator()` (`require-operator.ts:151-188`), non la
RLS — e questo va scritto nella migration invece che recitato.

#### 3b. «Solo `master`, `organizer`, `staff` sono assegnabili» — NON e' un `CHECK`

**Postgres vieta le sottoquery in un `CHECK` constraint** (`0A000: cannot use
subquery in check constraint`). La regola *«l'assegnatario tiene un ruolo
staff»* legge `public.profiles`, cioe' **un'altra riga di un'altra tabella**:
non e' esprimibile come `CHECK` di riga. Il testo della decisione dice *«un
`CHECK` di riga (o garanzia strutturale equivalente)»*, e la seconda meta' della
parentesi e' quella che si applica.

Le tre forme strutturali reali, con il loro modo di fallire. **Il piano ne
sceglie una e scrive perche':**

| | Forma | Come regge | Come fallisce |
|---|---|---|---|
| **A** | Colonna denormalizzata `assignee_role text NOT NULL CHECK (assignee_role IN ('master','organizer','staff'))` **+ FK composta** `(user_id, assignee_role) REFERENCES public.profiles (id, role)` (richiede un `UNIQUE (id, role)` su `profiles`) | La FK e' valutata su **ogni** scrittura, service client compreso: la stessa proprieta' del `CHECK`. La coppia (id, ruolo) non puo' mentire | **Retroazione sulle demozioni.** Con una FK verso `(id, role)`, cambiare `profiles.role` di una persona con un'assegnazione viva viene **rifiutato** (`23503`), o con `ON UPDATE CASCADE` propaga un `member` dentro `assignee_role` e viola il `CHECK`. In entrambi i casi: **demote di uno staff assegnato = errore**. E' una decisione, non un dettaglio — e va scritta, perche' e' un nuovo modo di rifiutare un'operazione |
| **B** | Un trigger `BEFORE INSERT OR UPDATE` che legge `profiles.role` | Esprime la regola esatta | `ALTER TABLE … DISABLE TRIGGER` e' l'interruttore a una riga che `role_implies_approved.sql:90-95` ha gia' **considerato e rifiutato**. Riproporlo qui senza citare quel paragrafo e' rifare una decisione chiusa |
| **C** | Il controllo dentro l'unico writer `SECURITY DEFINER`, con `EXECUTE` al solo `service_role` | E' lo stesso chokepoint che rende `membership_acts` append-only per costruzione (`membership_register.sql:337-343`) | Piu' debole di un vincolo: una `INSERT` diretta col service client lo aggira. `ACCESS-MODEL-DECISIONS.md §11` chiama *«una regola applicata in quattro posti»* una convenzione — qui il posto e' uno solo, il che la rende difendibile ma non equivalente a un vincolo |

**Raccomandazione al planner:** **A**, con la conseguenza sulle demozioni
dichiarata per iscritto nella migration e una riga nel `35-HUMAN-UAT.md` che dica
cosa deve fare un organizer che vuole demotare una persona assegnata (revocare
prima, e la revoca e' un record). **La verifica della restrizione `0A000` va
eseguita in container prima di committare la forma**: e' l'unica affermazione di
questo documento che non ho potuto leggere in un file del repo.

#### 3c. Il perche' la domanda su `pending` sparisce, e va scritto

`role_implies_approved.sql:115-117` rende `master`/`organizer`/`staff` sempre
`approved` **per regola di database**. Con la decisione bloccata (solo ruoli
staff assegnabili), **non serve nessun test di stato nel braccio 2 dell'OR** — e
non aggiungerlo e' il punto: un test di stato li' sarebbe un nuovo modo di
rifiutare qualcuno alla porta. Questa frase va nella migration, perche' il
prossimo lettore chiedera' perche' il braccio dell'assegnazione non consulta
`requires_approved`.

---

### 4. `scripts/verify-no-credit-account.mjs` (test, batch/grep) — ASSIGN-07

**Analogo:** `scripts/verify-no-header-identity.mjs` (396 righe), gia' un `npm
run` script (`package.json`: `"verify:no-header-identity": "node
scripts/verify-no-header-identity.mjs"`).

**L'asserzione in una frase, e la forma dell'intestazione** (`:2-13`):

```js
/**
 * verify-no-header-identity.mjs — the burn-down meter for CAP-05, criterion 1.
 *
 * WHAT IT ASSERTS, in one sentence: **no file under `src/` other than
 * `src/lib/supabase/middleware.ts` contains the substring `x-user-`**, matched
 * case-insensitively.
 *
 * WHY THAT SENTENCE AND NOT A NICER ONE. Criterion 1 of this phase is a
 * *structural* property, not a sample: a surface that cannot read the header
 * cannot be fooled by it. … Absence is checkable; good behaviour is not.
 */
```

**Le cinque decisioni implementative da replicare** (`:36-100`):

1. **Substring letterale, mai una RegExp sul sorgente**, e mai
   `splitCodeAndComments`: WR-07 registra che lo stripper di commenti di questo
   repo e' insano (un literal regex con un apice apre una stringa fantasma).
2. **Case-insensitive abbassando l'haystack** — con l'incidente registrato
   (`grep -c 'CREATE POLICY' supabase/schema.sql` = 0, `grep -ci` = 37).
3. **I commenti si CONTANO, non si filtrano** — l'errore ha una direzione, ed e'
   quella sicura: il metro puo' solo chiedere piu' cancellazione.
4. **L'esenzione e' UN percorso relativo esatto, confrontato per uguaglianza**,
   e se quel file sparisce lo script **rifiuta** invece di esentare in silenzio.
5. **Una misura vuota e' un rifiuto, non un pass** — zero file scansionabili =
   exit 2.

E i tre exit code (`:95-100`): `0` pulito · `1` almeno una violazione, tutte
elencate · `2` **niente e' stato misurato, nessun verdetto implicato**.

**L'ago per ASSIGN-07.** Le API di creazione account in questo repo sono due, e
i loro call site sono verificati:

```
src/lib/guest-list/process-entry.ts:220   await serviceClient.auth.admin.createUser({
src/lib/guest-list/process-entry.ts:235   await serviceClient.auth.admin.generateLink({
src/app/(admin)/admin/members/actions.ts:1993   await serviceClient.auth.admin.createUser({
src/app/(admin)/admin/members/actions.ts:2131   await serviceClient.auth.admin.generateLink({
```

**Convenzione:** l'ago e' `auth.admin.` (substring letterale, lower-cased), il
perimetro e' il **percorso del credito** (i file di `party_credits`: action,
page, eventuale lib), e le esenzioni sono i **due percorsi esatti** sopra —
elencate e stampate a ogni run, pass o fail.

---

### 5. `src/app/(organizer)/organizer/events/[id]/assignments/page.tsx` (page, request-response)

**Analogo:** `src/app/(organizer)/organizer/events/[id]/guest-list/page.tsx`
(123 righe, letto per intero). Stesso albero, stessa forma per-evento, stesso
problema (una lista che se fallisce non deve sembrare vuota).

**Import + risoluzione dell'identita'** (`:1-31`):

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";

export default async function GuestListPage({ params }: PageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
  const ctx = await getAccessContext();

  // `MobileNav` is a `"use client"` component that still takes role and status as
  // props; phase 34 (STAFF-03) converts it. No decision on this page reads them.
  const navRole = ctx.role as UserRole | null;
  const navStatus = ctx.status as UserStatus | null;

  // Defense in depth: may this person reach the organizer area at all.
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }
```

**Proprieta' dell'evento — una chiamata, mai un confronto re-inlineato** (`:46-58`):

```tsx
  // On this page the check carries more than an interface decision. The guest
  // entries below are read with the **service-role client**, which bypasses every
  // row-level policy (`access-gating.md`, gate *service role*). On that read there
  // is no second boundary: this `if` is the only thing scoping the query to an
  // event the caller may see.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/organizer/events");
  }
```

**Stato d'errore ≠ stato vuoto — CR-02** (`:63-83`):

```tsx
  // ⚠️ `error` is read, and it is NOT collapsed into `entries ?? []` (CR-02).
  // `[]` is a valid answer on this read — "this event has no guests" — so a
  // transient failure that fell through to `?? []` rendered as an empty list,
  // and this repository has no error tracking to contradict it. At 01:40 at the
  // door that screen turns away a guest who IS on the list … The outcome below
  // is decided by POSITION — `error` truthy or not — never by inspecting a message.
  const { data: entries, error: entriesError } = await serviceClient …

  if (entriesError) {
    console.error(
      `[guest_list.lookup_failed] could not read guest_list_entries for ` +
        `${eventId}: ${entriesError.code ?? "unknown"}. This is NOT an empty list.`
    );
  }
```

**Convenzione:** la pagina delle assegnazioni ha uno stato d'errore **distinto**
dallo stato vuoto (analogo di `GuestListUnavailable`), il log porta una
**categoria** `[assignments.lookup_failed]` e mai `error.details`.

---

### 6. `src/app/(organizer)/organizer/events/[id]/assignments/actions.ts` (server action, CRUD+attribuzione)

**Analogo:** `.../guest-list/actions.ts:1-91`.

**La guardia di ingresso, con il contesto restituito e riusato** (`:80-91`):

```ts
async function verifyOrganizerAccess(eventId: string): Promise<string> {
  const ctx = await assertStaffManage();

  if (!ctx.userId) {
    throw new Error("capabilities.resolve_failed: no_subject");
  }

  // The SERVICE client, deliberately and unchanged. See the note above.
  await assertEventOwnership(getServiceClient(), eventId, ctx);

  return ctx.userId;
}
```

**Le quattro categorie di fallimento, decise per POSIZIONE** (`:63-71`):

```ts
 *   `forbidden.staff_manage_required`      — assertStaffManage
 *   `capabilities.resolve_failed: …`       — the resolver, or no_subject below
 *   `forbidden.not_event_owner`            — assertEventOwnership
 *   `event.lookup_failed: <code>`          — assertEventOwnership, no answer
 *
 * Which one you got is decided by **which line threw**, never by parsing a
 * message. No `catch` here flattens them.
```

**Il vincolo che nessun compilatore vede** — `guards.ts:106-114`:

```
 * **It returns the resolved context, and that is the whole point of the return
 * type.** `cache()` does NOT memoise inside a Server Action body — measured in
 * phase 33's research, three executions for three calls … **More than one
 * `await assertStaffManage(` in a single exported action is the defect**, and no
 * compiler or build will see it.
```

**Il ramo sul rifiuto del database** — precedente in
`role_implies_approved.sql:194-201`:

```
-- WHEN A REFUSAL IS HANDLED IN APPLICATION CODE, branch on `error.code ===
-- '23514'` and never on a parsed message: Next redacts a Server Action's message
-- in a production build … And never log or return `error.details` — on this
-- table PostgREST puts the ENTIRE failing row there, membership code and email
-- address included (`43-MEASUREMENTS.md` measurement 5).
```

**Convenzione:** l'action di assegnazione ritorna un **valore discriminato**
(`{ ok: false, reason: "self_assignment" }`), mai una stringa da interpretare;
ramifica su `error.code` (`23514` per il `CHECK`, `23503` per la FK di § 3b);
non logga mai `error.details`.

**Attribuzione:** `ACCESS-MODEL-DECISIONS.md §5` la richiede per l'assegnazione.
La forma e' la stessa di `added_by` sulla guest list (`actions.ts:31-36`): un
`string` non nullo ottenuto con un throw esplicito, **mai** un `!` all'insert.

---

### 7. `src/lib/door/require-operator.ts` (guard, request-response)

**Analogo:** se stesso, `:130-134`. L'unione taggata e' la forma che
`maySupervise` deve estendere:

```ts
export type DoorAuth =
  | { ok: true; userId: string }
  | { ok: false; kind: "unauthenticated"; error: string; status: 401 }
  | { ok: false; kind: "forbidden"; error: string; status: 403 }
  | { ok: false; kind: "unresolved"; error: string; status: 503 };
```

E il **valore machine-readable deciso per posizione** (`:102-116`):

```ts
export const DOOR_UNRESOLVED_STATUS = "capability_unresolved";

/**
 * The human sentence for the fourth outcome. Deliberately says nothing about
 * permission: the whole point of this arm is that permission is unknown.
 */
export const DOOR_UNRESOLVED_ERROR =
  "Could not check this account's door permission — this is not a refusal. Try again.";
```

**Convenzione:** ASSIGN-05 aggiunge un `DOOR_SUPERVISION_REQUIRED` nella stessa
forma — costante esportata, decisa per posizione, con la frase umana accanto e
mai dentro il messaggio di un errore lanciato.

**Il vincolo di risoluzione unica** (`:136-149`): `requireDoorOperator()` va
chiamata **una volta per handler**, e per portare `maySupervise` deve
**restituire di piu'** — esattamente come `assertStaffManage()` restituisce il
contesto. La ricerca lo raccomanda; l'analogo lo dimostra.

**L'unico `catch` legittimo** (`:154-168`): entrato per posizione, non legge mai
`error.message`, e restituisce un **quarto esito**, non un rifiuto. Se il
verdetto di supervisione puo' non risolversi, prende lo stesso trattamento.

---

### 8. `src/app/api/tickets/checkin/undo/route.ts` (route handler, request-response) — ASSIGN-05

**Analogo:** se stesso. Il punto d'aggancio e' **subito dopo la riga 61**, sul
contesto gia' risolto — e il file lo dichiara a `:18-20`:

```ts
 * The split this file records, so a later reader does not look for the other
 * half here: **who may** undo is Phase 35's question (ASSIGN-05); **who did**
 * belongs here, because the night's review list is unreadable without it.
```

L'envelope da estendere (`:44-61`):

```ts
    // Once per handler — `cache()` does not memoise in a Route Handler.
    const auth = await requireDoorOperator();
    if (!auth.ok) {
      // 401 and 403 keep their existing body and code; `unresolved` adds a
      // third, distinct answer at 503 (retryable per `sync-manager.ts:141`).
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
          ...(auth.kind === "unresolved"
            ? { status: DOOR_UNRESOLVED_STATUS }
            : {}),
        },
        { status: auth.status }
      );
    }
```

**Validazione dell'input** (`:23-24`) — il pattern gia' esistente, da riusare
per ogni `party_id` in ingresso:

```ts
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

---

### 9. `src/lib/offline/sync-manager.ts` (service/drain, event-driven) — ASSIGN-03

**Analogo:** se stesso, `:102-175`. La tabella di classificazione **si estende,
non si aggira** — ed e' documentata come tabella prima di essere codice:

```ts
/**
 * One response, one bucket — for all three endpoints …
 *
 * The order is the contract:
 *
 * | Condition                          | Bucket  |
 * |------------------------------------|---------|
 * | 401 or 403                         | blocked |
 * | 408 or 429                         | retry   |
 * | >= 500                             | retry   |
 * | body `outcome: "recorded"`         | done    |
 * | body `outcome: "already_recorded"` | done    |
 * | body `outcome: "not_valid"`        | dead    |
 * | anything else                      | dead    |
 *
 * The transport-level `ok` boolean does not appear anywhere in it, and that is
 * the point: it was `true` for every failure this phase exists to fix.
 */
```

Il difetto misurato che ASSIGN-03 deve chiudere e' la **prima riga** (`:129-131`):

```ts
  // An expired session is neither a failure nor something to retry. Recorded as
  // failed, a whole night's queue is discarded at 02:00; retried, it spins on an
  // endpoint with no rate limiting anywhere in this repository. Kept and held is
  // the third answer, and `retryBlockedAfterSignIn` is the way back.
  if (status === 401 || status === 403) return { bucket: "blocked" };
```

**Convenzione:** ogni caso nuovo si aggiunge **alla tabella nel docblock** e al
`switch`, con la ragione. Lo status code si sceglie **leggendo quella tabella**,
mai per abitudine — e' la disciplina che ha prodotto il `503` di
`require-operator.ts:64-79`.

Il timestamp su cui il drain deve giudicare esiste gia', `checkin-store.ts:135-136`:

```ts
  /** Device clock at the read. Evidence, not authority. */
  scannedAt: string;
```

E il precedente lessicale per «evidenza, mai autorita'» — verificato in due
posti: `src/types/database.ts:437` e `src/app/api/membership/verify/route.ts:412`.

---

### 10. `src/lib/offline/checkin-store.ts` (store IndexedDB, file-I/O) — ASSIGN-08

**Analogo:** se stesso. `DB_VERSION = 4` a `:48`. Lo step v5 copia lo **step v4**
(`:425-457`), che e' il precedente di un upgrade che non stranda niente:

```ts
      if (oldVersion < 4) {
        // ── Version 4: a step that migrates nothing, on purpose ────────────
        // A reader will expect a migration to migrate, so here is what this
        // one does **not** do: it creates no object store, it destroys none,
        // and it rewrites no row. Nothing is stranded because nothing is
        // touched — which is the whole property this step was written to have.
        …
        // The rule from the step above holds here too and is repeated rather
        // than assumed: **only `idb` promises are awaited inside this
        // callback**. One await on anything else would let the `versionchange`
        // transaction close mid-migration, and there is no test runner in this
        // repository that could catch it.
        await tx.objectStore("meta").put({
          key: ROSTER_PREDATES_ROLE_KEY,
          value: "true",
        });
      }
```

E la regola generale del callback (`:336-349`):

```ts
      // So the callback is now **cumulative steps**, each guarded by its own
      // `oldVersion` comparison and each doing only its own work. A device at
      // v2 runs both steps in order; a device at v3 runs only the second.
```

**Il posto dove vive il verdetto risolto:** lo store `meta`, con le due chiavi
gia' presenti come modello — `DEVICE_ID_KEY` (`:51`) e `ROSTER_PREDATES_ROLE_KEY`
(`:53-63`). La lettura ha la sua funzione esportata, `rosterPredatesRole()`
(`:1110`), e la scrittura transazionale il suo precedente in `getDeviceId()`
(`:471-485`):

```ts
  // One read-write transaction, so two tabs opening at once cannot each
  // generate an id and disagree: IndexedDB serialises overlapping scopes.
  const tx = db.transaction("meta", "readwrite");
```

**Convenzione:** `doorAuth` per-party vive in `meta`, con un helper esportato per
la lettura e uno per la scrittura, e lo step `oldVersion < 5` **non tocca**
`pendingCheckins`.

---

### 11. `src/app/api/tickets/attendance/route.ts` (route handler, batch download) — ASSIGN-08

**Analogo:** se stesso. Il punto d'aggancio e' la risposta che lo scanner **gia'
chiede**, e la regola del payload additivo e' scritta a `:44-54`:

```ts
 * `ticketId`, `guestListEntryId` and `isGuestList` stay alongside them on
 * purpose: a staff device may run the previous bundle against this API for one
 * session, and that session is a night at the door. The payload is additive for
 * one release — the owner's locked decision.
 *
 * There is deliberately no `email`. `hasEmail` is a boolean and stays one: the
 * door needs to know whether an entry has a contact route, never what it is,
 * and everything here lands in IndexedDB on a phone and stays there.
```

E la risoluzione unica per handler (`:201-204`):

```ts
  // Once per handler. This is the request the door makes before the radio goes
  // off, so a round trip saved here is a round trip saved on a weak signal.
  const auth = await requireDoorOperator();
  if (!auth.ok) return refuse(auth);
```

**Convenzione:** `doorAuth` e' un **campo aggiunto** alla risposta, mai una
quarta chiamata; nessun dato personale nuovo entra nel payload (il roster e' un
confine gia' attraversato e accettato, e questa fase non lo allarga).

---

### 12. `src/app/(admin)/admin/scanner/ScannerClient.tsx` (component, event-driven) — T-3

**Analogo:** se stesso, `:862-892`. Il ramo offline dell'undo, letto per intero:

```tsx
      // With the radio off the reversal cannot reach the server, and the entry
      // it would reverse is still sitting in the queue. Dropping the queue entry
      // locally is the whole of the undo in that case: leaving it there means
      // the admission is reported on the next drain and the reversal a member of
      // staff performed at the door never happened. `checkin-offline.md` calls
      // the undo *«il percorso piu' semplice per far rientrare qualcuno»* — an
      // undo that silently does nothing is worse than one that refuses out loud.
      if (!navigator.onLine) {
        if (!record.localKey) {
          showFlash(
            "error",
            "This entry cannot be undone offline",
            "It was recorded on the server. Undo it once the signal is back."
          );
          return;
        }
        try {
          await undoCheckInLocally(record.localKey);
          markRecordUndone(record);
          showFlash("error", "Undone on this device", `${record.name} — not reported`);
```

**Convenzione — e questa e' la parte delicata:** il gate `maySupervise` letto
dalla cache **non deve** riportare il difetto che il commento a `:862-868`
descrive (*«un undo che silenziosamente non fa niente e' peggio di uno che
rifiuta ad alta voce»*). Il pattern e' `showFlash("error", <titolo>, <dettaglio>)`
— **effetto osservabile allo staff sul posto**, che e' cio' che C4 chiede in un
repo senza error tracking. E il fallimento della **risoluzione** e' un terzo
esito, mai collassato nel rifiuto (precedente: `DOOR_UNRESOLVED_STATUS`).

Il limite gia' misurato e dichiarato di questa superficie — `require-operator.ts:90-99`:

```
 * **The limit, measured rather than assumed:**
 * `…/ScannerClient.tsx:81-87` maps HTTP status to a headline before it reads the
 * body, and 503 already has one … So the headline for a capability-resolve
 * failure currently reads as a failed write, which is not what happened.
```

---

### 13. `scripts/rls-baseline.mjs` — `PROBE_PAYLOADS` (`:1069`)

**Analogo:** la voce `door_scan_events` (`:1092-1099`), che e' la tabella con
piu' colonne CHECK-vincolate, cioe' il caso piu' vicino a `party_assignments`.

Le due convenzioni sono scritte a `:1045-1059`:

```js
 *   - `auth.uid()` is used for every column that names the SUBJECT — `user_id`,
 *     `added_by`, `uploaded_by`, `requested_by`, `operator_id`. The ownership
 *     predicates (`auth.uid() = user_id`) are what those columns exist for, and
 *     a fixed literal would turn every persona's probe into a refusal for the
 *     wrong reason.
 *   - `{{table}}` is a foreign key, substituted with the lowest existing id of
 *     the referenced table, resolved ONCE with a privileged read. …
```

E il rifiuto che rende obbligatoria la voce (`:1041-1043`):

```js
 * **The harness refuses to run B3 if any enumerated table has no entry**
 * — `verify-persona.mjs`'s refusal pattern applied to coverage, because a write
 * matrix that silently skips a table is a matrix that cannot fail.
```

**Attenzione — tensione reale su ASSIGN-04.** La convenzione dice `auth.uid()`
per ogni colonna che nomina il soggetto. Su `party_assignments` **sia `user_id`
sia `assigned_by` nominano un soggetto**, e usare `auth.uid()` per entrambi
produrrebbe una sonda che viola sempre `party_assignments_no_self_grant` — cioe'
un `23514` per la ragione giusta, che e' **esattamente la sonda che ASSIGN-04
vuole** (`35-VALIDATION.md`: *«sonda B3 con `assigned_by = user_id` deve tornare
`23514`»*). Il piano deve dichiarare quale delle due colonne prende `auth.uid()`
nella sonda normale e dove vive la sonda di ASSIGN-04, altrimenti **B3 su questa
tabella e' rosso per costruzione e non prova niente**.

E il divieto che vale comunque (`:1061-1065`): nessuna colonna `UPDATE` della
sonda puo' essere una guardia monotona.

---

### 14. `scripts/verify-capabilities.mjs` — `ROLE_GRANTS` (`:173`)

**Analogo:** le righe `door.operate` e `register.read` di `master` (`:181-206`),
che sono le due decisioni piu' recenti e portano ognuna il proprio paragrafo:

```js
    // ── D-06, and this paragraph is the point of the two lines below ──────
    //
    // `door.operate`'s `requires_approved` is `false` on BOTH grants, and it
    // must stay false. Once ROLE-02's `role ⇒ approved` constraint exists this
    // flag will LOOK redundant and somebody will propose flipping it as
    // tidying. That is the ROADMAP's declared **"trap to refuse"** …
    //
    // A reader who arrived here to remove the flag has now met the reason before
    // the value. Assertion 2 of side 5 fails on a flipped flag and names this.
    'door.operate': false,
```

E la regola strutturale (`:130-146`):

```js
 * Every (role × capability) pair of the cross product, declared as one of two
 * things and never as silence:
 *
 *   a GRANT — the `requires_approved` value the row must carry, `true` or `false`
 *   a REFUSAL — the string `REFUSED`, which means **no row at all**
 *
 * **If this trips, look at the capability model, not at this constant.** A pair
 * that changed here without a plan behind it is the check being edited to agree
 * with the defect it exists to find.
```

**Convenzione:** la chiave di supervisione arriva con **quattro decisioni** —
una per ruolo — nello stesso commit della migration e di `keys.ts`. E i tre
totali (`EXPECTED_PAIR_COUNT`, `EXPECTED_GRANT_COUNT`, `EXPECTED_REFUSAL_COUNT`,
asseriti a `:415-424`) vanno aggiornati: **oggi 36 coppie, 20 grant, 16
rifiuti**; una decima chiave li porta a 40 / N / M.

---

### 15. `scripts/container/seed.mjs` — il terzo asse

**Analogo:** `:194-208` (`FORBIDDEN_WRITES`) e `:230-249` (`buildPersonas`).
Qualita' **role-match**: l'harness ha una griglia a **due** assi (ruolo ×
stato); un'assegnazione e' un **terzo** asse, e nessun analogo di terzo asse
esiste.

La convenzione d'identita' delle persone sintetiche, che il terzo asse deve
rispettare (`:182-192` e `:241-247`):

```js
 * They obey this file's identity convention exactly as the twelve personas do
 * (threat T-32-04-02): an id whose first group is the literal `43000004` —
 * phase 43, plan 03 — an address at the reserved `.invalid` TLD that can reach
 * no inbox, a name that is a ROLE and never a person, and a membership code
 * `handle_new_user()` **cannot** mint …
```

```js
        id: `32000004-0000-4000-8000-${String(index).padStart(12, '0')}`,
        email: `seed-${role}-${status}@example.invalid`,
        // A ROLE, never a person. `.planning/` and this repository are public.
        fullName: `Seed Persona ${role} ${status}`,
        membershipCode: `RSN-SEED000${index}`,
```

E il precedente **esatto** di come si allarga una lista quando un asse cresce
(`:173-180`):

```js
 * **Six, not four, since plan 43-08.** … Until 43-08 this list held only
 * the four that the persona grid could produce, because `staff` was not a
 * persona; the moment it became one, a list of four would have been a detector
 * that watched two thirds of the rule and reported a green for the whole of it.
```

**Convenzione:** le persone nuove della fase 35 usano il primo gruppo uuid
`35000001` (fase 35, primo piano che le introduce), `@example.invalid`, un
`fullName` che e' un **ruolo con il suo asse** (`Seed Persona staff assigned
night1`), e un `membershipCode` fuori dall'alfabeto di `handle_new_user()`.
Minimo tre: *staff assegnato alla notte 1*, *staff assegnato alla notte 2*,
*staff non assegnato* — altrimenti ASSIGN-01 e' vacuo in ogni cella.

E il vincolo di rinomina gia' registrato (`role_implies_approved.sql:179-181`):
*«ANYONE RENAMING THIS CONSTRAINT must rename it in `scripts/container/seed.mjs`
too»*. Ogni vincolo nominato dalla fase 35 che il seed asserisce eredita questa
regola.

---

### 16. `src/lib/membership/acts.ts` + `src/lib/capabilities/keys.ts` + `src/types/database.ts`

**Analogo:** se stessi. Tre convenzioni, tutte gia' scritte:

**(a) La union e il CHECK si modificano nello stesso commit** — `acts.ts:10-25`:

```ts
 * Both unions below are mirrored by SQL `CHECK` constraints on
 * `public.membership_acts` … **Editing either side means editing both, in the
 * same commit.**
 *
 * Why that rule is stated rather than assumed: a divergence between the table
 * and the code does not fail loudly. Adding `'suspended'` here and not there
 * produces a value TypeScript accepts everywhere and the database refuses with a
 * `23514` — at the moment somebody performs the act, not at build time.
```

**(b) I due valori sono gia' riservati** — `acts.ts:47-50`:

```ts
 * Phase 35's per-night assignment adds its own values (`'assigned'`,
 * `'unassigned'`) to this union and to the CHECK, in one commit, when it lands.
 * A door override does NOT: it stays in `door_scan_events` (D-18), and the
 * migration says why.
```

**(c) Il `Record` totale e' l'unica meta' che il compilatore tiene** —
`keys.ts:87-99`:

```ts
 * Typed as a **total** `Record` over the union on purpose … adding a tenth key to
 * `CAP` without a description here is a `npm run build` error … It is the one
 * part of this file's contract the compiler can hold — and it held it when the
 * ninth key landed, which in a repository with no test runner is worth saying
 * rather than assuming.
```

**(d) I tipi di riga** — `src/types/database.ts:422-444` (`MembershipActRow`) e'
la forma per un `PartyAssignmentRow`: un commento per colonna che dice cosa
significa `NULL`, e la nota che la colonna `party_id` e' *«Nullable and unwritten
today: Phase 35's per-night assignment writes here»* — **quella riga va
aggiornata da questa fase**.

---

### 17. `.planning/phases/35-…/35-HUMAN-UAT.md` (documento)

**Analogo:** `.planning/phases/43-role-model-account-creation/43-HUMAN-UAT.md:36-93`.

**La tabella ordinata delle migration, con la ragione per riga** (`:36-48`):

```
### Le sei migration, in quest'ordine esatto

L'ordine **non e' un suggerimento**: sbagliarlo fa fallire l'applicazione nel
momento peggiore, cioe' mentre la si sta facendo.

| # | File | Perche' deve stare qui |
|---|---|---|
| 1 | `20260808000500_staff_role.sql` | crea il quarto ruolo `staff` |
| 2 | `20260808001000_role_implies_approved.sql` | la sua regola **nomina** `staff`… |
…
```

**L'ordine migration→codice, con l'accoppiamento misurato** (`:58-74`):

```
**Le migration vanno applicate per prime, il codice dopo. Mai il contrario.**

Il motivo e' misurato, non prudenziale. Il piano 43-12 ha registrato un
accoppiamento duro: **se il codice viene deployato senza la migration numero 5,
ogni singolo login finisce con `master=unavailable` nella barra degli
indirizzi**, per tutti, ogni volta. …

Il verso opposto invece e' sicuro: **le migration applicate con il codice
ancora vecchio non rompono niente.**
```

**Convenzione:** il `35-HUMAN-UAT.md` apre con la **coda 6 + N**, dichiarando che
le sei della fase 43 vengono **prima, tutte**, e che oggi
`migrations_applied: 0`. Poi la prova piu' economica (`:76-88`):
`npm run verify:capabilities`, che **deve diventare `5/5 green`** dopo il deploy.

---

## Shared Patterns

### S1 — Il predicato di capability, in ogni policy nuova
**Fonte:** `20260808002000_membership_register.sql:327-335`
**Si applica a:** ogni `CREATE POLICY` di questa fase.

```sql
-- The `(select …)` wrapper is LOAD-BEARING and it is not `STABLE` that produces
-- it: it makes Postgres evaluate the call once per statement as an InitPlan
-- instead of once per row … Phase 32 moved 45 of 67 policies to this form; a new
-- policy written in the older `public.is_admin_or_organizer()` shape would be
-- both a wrong predicate and a per-row call.
CREATE POLICY membership_acts_select_register_read ON public.membership_acts
  FOR SELECT USING ((SELECT private.has_capability('register.read')));
```

### S2 — REVOKE poi GRANT, su ogni funzione `SECURITY DEFINER`
**Fonte:** `20260808002000_membership_register.sql:469-488`, forma identica a
`20260807000000_capability_model.sql:293-297`
**Si applica a:** ogni funzione nuova di questa fase, incluso l'overload
`public.my_access_context(uuid)`.

> Nota specifica sull'overload: `CREATE OR REPLACE` **non** cambia la lista
> argomenti — crea un secondo oggetto — quindi la coppia REVOKE/GRANT va scritta
> **per la nuova firma**, non ereditata dalla vecchia.

### S3 — Categoria per posizione, mai nel messaggio
**Fonte:** `src/lib/capabilities/guards.ts:73-79`
**Si applica a:** ogni Server Action e ogni route handler di questa fase.

```
 * **And a category that must cross to a client cannot travel in the message.**
 * Next redacts the message of an error thrown out of a Server Action in a
 * production build, so `err.message.startsWith("forbidden.")` works in
 * `next dev` and silently stops working in the deployment where it matters
 * (CR-01, `32-REVIEW.md`). A caller that needs to branch on the category must
 * carry it as a **tagged value decided by position** — a discriminated result
 * returned from the action — never by parsing a string.
```

### S4 — Una sola risoluzione per handler
**Fonte:** `require-operator.ts:136-149` + `guards.ts:106-114`
**Si applica a:** ogni route handler e ogni Server Action.
Il segnale d'allarme: un secondo `await requireDoorOperator(` o
`await getAccessContext(` o `await assertStaffManage(` nello stesso corpo.
**Nessun compilatore lo vede.**

### S5 — Log con categoria, mai `error.details`
**Fonte:** `guest-list/page.tsx:78-83` (categoria) +
`role_implies_approved.sql:196-201` (`details`)
**Si applica a:** ogni `catch` e ogni ramo d'errore.

```tsx
    console.error(
      `[guest_list.lookup_failed] could not read guest_list_entries for ` +
        `${eventId}: ${entriesError.code ?? "unknown"}. This is NOT an empty list.`
    );
```

### S6 — L'effetto osservabile, perche' non esiste error tracking
**Fonte:** `require-operator.ts:81-88`
**Si applica a:** ogni percorso d'errore della porta.

```
 * This project has **no error tracking** (`meta-gates.md`): a log line reaches
 * nobody. `checkin-offline.md`, gate *il fallimento va visto*, requires every
 * check-in error path to show itself to the staff present — the only observer
 * that really exists.
```

### S7 — Ruoli, mai persone
**Fonte:** `membership_register.sql:195-202` (`subject_label`),
`scripts/container/seed.mjs:245` (`// A ROLE, never a person.`)
**Si applica a:** migration, seed, artefatti `.planning/`, messaggi d'errore.
Il repository e' pubblico e una riga di registro raggiunge uno screenshot.

---

## Cosa NON copiare

Sette casi. I primi due erano noti; gli altri cinque sono emersi leggendo gli
analoghi.

### A — `artists_select_public` e' `USING (true)`. `party_credits` NON deve esserlo.

`20260226100000_artist_profiles.sql:24-27`, verificato:

```sql
-- Anyone can read artists
create policy "artists_select_public"
  on public.artists for select
  using (true);
```

`party_credits` e' **il vicino piu' ovvio** di `artists` e la simmetria sembrera'
la scelta giusta. Non lo e': con `USING (true)`, **la line-up di una serata non
annunciata diventa pubblica appena inserita**. E' `venue-secrecy.md` applicato
alla line-up invece che all'indirizzo, ed e' il gate *la line-up e' materiale,
non manifesto* di `sound-manifesto.md`. La lettura eredita
`event_parties_select_published` (§ 2), e la migration **scrive la ragione**,
perche' altrimenti il primo lettore successivo la «sistemera'».

### B — `door.operate` tiene `requires_approved = false`. Non si «pulisce».

Tre file lo dicono, e la fase 35 e' nominata nel terzo:

- `20260807000000_capability_model.sql:414-417` — *«These two rows must not
  become true.»*
- `20260808001000_role_implies_approved.sql:124-152` — la trappola citata dal
  ROADMAP: *«il vincolo protegge il database; l'impostazione della porta protegge
  la notte dal giorno in cui il vincolo viene rilassato per un caso speciale»*.
- `20260808000500_staff_role.sql:190-191` — **il corollario che riguarda questa
  fase**: *«If `staff` is ever granted `door.operate` by a later phase, it takes
  the same treatment for the same reason.»*

E `require-operator.ts:30-37`: *«There is no status test in this file, and adding
one would be a defect.»*

### C — L'idempotenza di `artist_profiles.sql` non esiste. Non e' un modello.

Stesso file, `:18-19` e `:25`:

```sql
alter table public.artists add constraint artists_name_unique unique (name);
create policy "artists_select_public" …
```

Nessun `IF NOT EXISTS`, nessun `DROP … IF EXISTS`. Riesecuzione = `42710` =
rollback = **tutta la coda che segue resta non applicata**. In una coda applicata
a mano (§ 1b, WR-04) questa forma e' un difetto, non uno stile piu' snello. La
migration della fase 35 segue `membership_register.sql`, non `artist_profiles.sql`.

### D — `is_admin_or_organizer()` e' il predicato superato. Nessuna policy nuova lo usa.

`20260225150000_party_architecture.sql:40-41` e
`20260805120000_door_scan_events.sql:155-156` lo usano ancora:

```sql
CREATE POLICY door_scan_events_select_admin ON public.door_scan_events
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));
```

Il commento sopra a `:151-152` dice **testualmente** che la fase 35 e' la fase che
deve restringere questa policy:

```sql
-- Deliberately coarse: per-night scoping of an organizer does not exist in this
-- product until Phase 35, which is the phase that should narrow this predicate.
```

Quando la fase 35 la riscrive, il predicato diventa `private.has_capability(…)`,
e **il commento vecchio va sostituito, non appeso**: un commento che indica un
lavoro gia' fatto e' peggio di nessun commento.

### E — `party_credits` non deve avere una colonna d'account «per il futuro».

`public.artists` non ne ha (verificato, `:2-15`: `created_by` e' chi ha creato la
riga, non chi e' l'artista) — questo va **copiato**. Cio' che non va copiato e'
la tentazione di aggiungerne una: il ragionamento sta in
`20260808000500_staff_role.sql:154-171` (la colonna `granted` che non esiste) ed
e' esattamente lo stesso — un `user_id uuid null` e' a **un solo join** dal
diventare un grant, e quel join lo scriverebbe qualcuno in buona fede.

### F — Il precedente di `record_membership_act` omette `SET search_path`. E' la cosa che non fu copiata.

`membership_register.sql:381-386`:

```sql
-- `SET search_path = ''` with every reference schema-qualified …
-- The analog this function is otherwise shaped after —
-- `20260508000000_drink_token_active_state.sql:90-124` — omits it, and that
-- omission is the one thing not copied from it.
```

Ogni funzione nuova della fase 35 porta `SET search_path = ''` con ogni
riferimento schema-qualificato, anche quando l'analogo che sta copiando non ce
l'ha.

### G — `door_scan_events.operator_id NOT NULL` e' giusto li' e non qui.

`membership_register.sql:209-221` e' il **modello di come si dichiara una
divergenza**, non una regola da importare:

```sql
-- `door_scan_events.operator_id` is `NOT NULL REFERENCES auth.users`
-- (`:107-108`) and has no room for a system actor. That is right for a door:
-- somebody was holding the phone. It is wrong here, because …
```

Su `party_assignments` la domanda gemella e' `assigned_by` (`NOT NULL`, perche'
il `CHECK` lo confronta) contro `revoked_by` (`ON DELETE SET NULL`, perche' *«un
autore che poi lascia il progetto non ha dis-compiuto i suoi atti»*).
**L'asimmetria va dichiarata in una sezione numerata**, come 2b fa, non risolta
alla prima scrittura.

---

## Correzioni a RESEARCH.md e al brief

Tre voci, verificate contro il codice corrente:

| Citazione a monte | Realta' verificata |
|---|---|
| `src/components/scanner/ScannerClient.tsx:869-892` | Il file e' **`src/app/(admin)/admin/scanner/ScannerClient.tsx`**; `src/components/scanner/` **non esiste**. Le righe sono giuste (ramo offline a `:869-892`, `handleUndoCheckIn` a `:855`). *Nota di dominio:* il glob `src/components/scanner/**` nell'indice di `CLAUDE.md` e in `meta-gates.md` punta quindi a una directory inesistente — e' materia di `ai-engineering.md`, controllo **A** (path morti), **fuori scopo per la fase 35 ma da segnalare**. |
| `membership/verify/route.ts:343-345` per *«a device clock is evidence, never authority»* | A `:342-348` c'e' il ramo *«due profili su un membership_code e' corruzione»*. La frase citata sta a **`src/app/api/membership/verify/route.ts:412`** e a **`src/types/database.ts:437`**. |
| «una nuova superficie sotto `src/app/(organizer)/organizer/events/[id]/…`» | Confermato che l'albero esiste con sette sottocartelle per-evento (`drinks`, `tickets`, `sales`, `edit`, `guest-list`, `review`, `analytics`, `media`). L'analogo con la coppia `page.tsx` + `actions.ts` piu' vicina e' **`guest-list/`**. |

---

## No Analog Found

| File | Ruolo | Data flow | Ragione |
|---|---|---|---|
| Il terzo asse in `scripts/container/seed.mjs` | test harness | batch | La griglia e' ruolo × stato (`PERSONA_ROLES` × `PERSONA_STATUSES`, `:230-249`). **Nessun terzo asse esiste in questo repository.** L'analogo piu' vicino e' l'allargamento di `FORBIDDEN_WRITES` da quattro a sei quando `staff` divenne persona (`:173-180`) — che e' un asse che **cresce**, non un asse che **si aggiunge**. Il planner deve progettare la forma, non copiarla. |

E una lacuna che non e' un file mancante ma una forma mancante: **§ 3b — la
garanzia strutturale «solo i ruoli staff sono assegnabili»**. Non esiste in
questo repository un vincolo che leghi una riga al ruolo di un'altra tabella. Le
tre forme candidate sono enumerate con i loro modi di fallire; **nessuna ha un
precedente qui**, e la scelta e' del piano.

---

## Metadata

**Perimetro della ricerca analoghi:** `supabase/migrations/` (30 file elencati, 7
letti), `src/lib/{capabilities,door,membership,offline}/`, `src/app/api/tickets/`,
`src/app/api/membership/`, `src/app/(organizer)/organizer/events/[id]/`,
`src/app/(admin)/admin/scanner/`, `scripts/` + `scripts/container/`,
`.planning/phases/43-role-model-account-creation/`.

**File letti riga per riga in questa sessione:** 24.
**Estratti citati con `file:riga`:** 41.
**Data di estrazione:** 2026-08-08.

**Vincoli di progetto replicati in questo documento, non ammorbiditi:**

- Il middleware e' UX; la RLS e' sicurezza — **ma sulla porta e' nessuna delle
  due**: le tre route scrivono con il client service (verificato a
  `checkin/route.ts:224`, `undo/route.ts:93`, `verify/route.ts:193`), il confine
  e' `requireDoorOperator()`, e ASSIGN-04 sta quindi in un vincolo di riga.
- La porta non ha rete. Rifiutare un ospite valido e' peggio che ammetterne uno
  doppio, perche' il primo errore avviene davanti a una fila.
- Zero fallimenti silenziosi. Non esiste error tracking: un fallimento che conta
  ha un **effetto osservabile**, non una riga di log.
- Le migration si applicano **a mano**, e le sei della fase 43 sono
  **committate e NON applicate** (`migrations_applied: 0`). La coda della fase 35
  e' **6 + N**, e le sue N vengono dopo tutte e sei.
- Le migration sono idempotenti: `DROP … IF EXISTS` prima di ogni `ADD`.
- Il repository e' PUBBLICO e `.planning/` e' tracciato. Ruoli, mai persone.
  Nessuna data non annunciata, nessuna sede in trattativa, nessuna line-up.
