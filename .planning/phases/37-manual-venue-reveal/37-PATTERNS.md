# Fase 37: Manual Venue Reveal — Mappa dei pattern

**Mappato:** 2026-08-10
**File classificati:** 22 (nuovi o modificati)
**Analoghi trovati:** 19 / 22 — 12 esatti, 7 per ruolo, 3 senza analogo

> **Questo file e' una pubblicazione.** `.planning/` e' tracciato e il repo e'
> pubblico. Qui non compaiono nomi di persone, indirizzi, sedi in trattativa,
> date non annunciate. Si parla di **ruoli** e di **file**.

> **Cosa fa questo documento e cosa non fa.** Non ripete la ricerca: la
> 37-RESEARCH.md nomina gli analoghi, questo file li **apre** e riporta gli
> estratti che un esecutore copia. Ogni riga citata e' stata letta oggi. Dove non
> ho aperto un file, e' scritto.

---

## Classificazione dei file

| File nuovo / modificato | Ruolo | Flusso dati | Analogo piu' vicino | Qualita' |
|---|---|---|---|---|
| `supabase/migrations/<ts>_manual_venue_reveal.sql` (nuovo) | migration | transazionale / append-only | `20260809002000_assignment_acts.sql` | **esatto** |
| ├─ riga capability | migration | seed | `20260808002000_membership_register.sql:113-131` | **esatto** |
| ├─ colonna `venue_revealed_at` | migration | schema | `20260808002000_membership_register.sql:259-272` | esatto |
| ├─ tabella traccia append-only | migration | append-only | `20260808002000_membership_register.sql:162-350` | **esatto** |
| └─ scrittore `SECURITY DEFINER` | migration / funzione | transazionale | `20260809002000_assignment_acts.sql:244-496` | **esatto** |
| `supabase/migrations/<ts>_venues_select_narrowed.sql` (nuovo) | migration | RLS | `20260226200000_venues.sql:25-27` (cio' che sostituisce) + `20260807000000_capability_model.sql:177-184` (la forma `(select …)`) | ruolo |
| `src/lib/capabilities/keys.ts` (mod) | config / dichiarazione | — | `keys.ts:119` + `:159-160` (`register.read`) | **esatto** |
| `src/lib/routes/capability-routes.ts` (mod) | config / routing | — | `capability-routes.ts:274-277`, `:315-319` | **esatto** |
| `src/types/database.ts` (mod) | tipi | — | — (gate `supabase-data.md`, tipi allineati) | ruolo |
| `src/app/(admin)/admin/events/[id]/reveal/actions.ts` (nuovo) | server action | request-response + RPC | `src/app/(admin)/admin/events/[id]/assignments/actions.ts:292-333` | **esatto** |
| `…/RevealVenueDialog.tsx` (nuovo) | componente client | conferma | `src/app/(admin)/admin/formats/RetireFormatDialog.tsx` (intero) | **esatto** |
| Bottone a tre stati + traccia sulla serata (nuovo) | componente client | stato derivato | `FormatsCatalogue.tsx:181-186, 322, 418` (solo il cablaggio) | parziale |
| `src/lib/venue-reveal/reveal-party-venue.ts` (nuovo) | modulo condiviso | batch / email | `src/lib/media/may-upload.ts` (un modulo, due chiamanti) | ruolo |
| `src/app/api/cron/venue-reveal/route.ts` (mod) | route handler | batch, scheduled | se stesso (e' il file da estrarre) | — |
| `src/app/(public)/events/[slug]/page.tsx` (mod) | pagina RSC | request-response | se stesso, `:87-117` | — |
| `src/app/(public)/events/[slug]/SecretVenueDialog.tsx` (mod) | componente client | presentazione | se stesso, `:7-13`, `:62-72` | — |
| `src/app/(public)/events/page.tsx` (mod) | pagina RSC | list-read | se stesso, `:210-213`, `:257-276` | — |
| `src/app/(public)/events/EventTabs.tsx` (mod) | componente client | presentazione | se stesso, `:10-17`, `:246-259` | — |
| `src/utils/datetime.ts` (mod) | utility | trasformazione pura | `datetime.ts:84-86` + docblock `:96-102` | **esatto** |
| `src/app/(admin)/admin/events/actions.ts` (mod) | server action | CRUD form | se stesso, `:405-427` | — |
| `src/app/(admin)/admin/(work)/venues/[slug]/page.tsx` (nuovo, spostato) | pagina RSC | detail-read | `src/app/(admin)/admin/(work)/venues/page.tsx:49-58` | **esatto** |
| `scripts/verify-routes.mjs` (mod) | script di verifica | — | `verify-routes.mjs:130-146` | — |
| `src/app/sw.ts` (mod) | service worker | cache | `sw.ts:28-49` (regole della porta) | ruolo |
| `.claude/rules/venue-secrecy.md` (mod) | persona | — | `assignment_acts.sql:110-203` (una regola riscritta con la sua ragione) | ruolo |
| `src/app/(auth)/login/page.tsx` + estrazione allow-list (piano separato) | pagina client + utility | redirect | `src/app/api/auth/callback/route.ts:44-90` | ruolo |

---

## Assegnazione dei pattern, file per file

### 1. `supabase/migrations/<ts>_manual_venue_reveal.sql` — la migration unica

**Analogo:** `supabase/migrations/20260809002000_assignment_acts.sql` (intero, 498
righe, letto oggi).

#### 1a. L'intestazione numerata e il `BEGIN; … COMMIT;` argomentato

**Da copiare** — `assignment_acts.sql:1-56` e `membership_register.sql:1-61`: le
modifiche si elencano numerate, e **per ciascuna si scrive perche' una meta'
applicata e' peggio di nulla**. Estratto dell'analogo (`membership_register.sql:18-33`):

```sql
-- Four changes, ONE transaction. A half-applied version of this file is strictly
-- worse than none of it, and each half is bad in its own way:
--
--   * the table without its capability is a register nobody can read, ...
--   * the capability without the table is a ninth key that
--     `scripts/verify-capabilities.mjs` compares against a catalogue that has it ...
--   * the table without the function is a register with no writer, and since the
--     table has no write policy at all it would be permanently empty ...
--   * the function without its REVOKE is a `SECURITY DEFINER` writer of
--     `public.profiles.role` reachable by any authenticated session ...
--
-- So `BEGIN; ... COMMIT;` is not decoration here either.
```

E la sezione idempotenza voce per voce, `assignment_acts.sql:38-54`:

```sql
-- ── IDEMPOTENZA, voce per voce ─────────────────────────────────────────────
--   * `DROP CONSTRAINT IF EXISTS` prima dell'`ADD CONSTRAINT` ...
--   * `COMMENT ON COLUMN` e `COMMENT ON FUNCTION` sono sostituzioni per costruzione;
--   * `CREATE OR REPLACE` per la funzione — la forma idempotente per un oggetto
--     che non accetta `IF NOT EXISTS`;
--   * `REVOKE` e `GRANT` sono idempotenti per natura.
-- Ri-eseguire deve essere sicuro, o nessuno ri-esegue quando dovrebbe.
```

**Da NON copiare:** l'ordine `capability → tabella → funzione` non e' negoziabile,
ma **non replicare** la scelta di `assignment_acts.sql` di scrivere dentro un
registro esistente. Qui la traccia e' una tabella propria (§ D.4 della ricerca,
Open Question 4) — e la ragione va scritta accanto, o il prossimo lettore la
fondera' in `membership_acts`.

#### 1b. La riga di capability (la tredicesima)

**Analogo esatto:** `membership_register.sql:113-131`.

```sql
INSERT INTO private.capabilities (key, description) VALUES
  (
    'register.read',
    'Read the register of acts on a member''s role and status: ... Requires an APPROVED staff role on both grants (D-19) because the register contains rejections — staff.manage would have admitted a never-approved organizer, and its requires_approved = false is not flipped: the same false keeps the door open.'
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  -- `master.manage`'s own description already names *"changing another member's
  -- role or status"* (`keys.ts:88-89`), so the master reading the record of
  -- those changes needs no further justification.
  ('master',    'register.read', true),

  -- D-07 lets an organizer create and promote. An actor who cannot see the
  -- register cannot check their own work ...
  ('organizer', 'register.read', true)
ON CONFLICT (role, capability) DO NOTHING;
```

**Cosa copiare, letteralmente:**
- `description` e' **`NOT NULL`** (`capability_model.sql:77-80`): una riga senza
  frase non entra.
- `ON CONFLICT … DO NOTHING` su entrambi gli `INSERT`.
- **una riga di commento per grant, che dice perche' quel ruolo lo tiene.**
- `requires_approved = true` su **entrambe** le righe (D-37-14). Il resolver lo
  valuta a `capability_model.sql:215`:
  ```sql
  and (not rc.requires_approved or p.status = 'approved')
  ```

**Da NON copiare (P-nuovo, ma e' la stessa specie di P1):** non riusare
`catalogue.manage` ne' `staff.manage`. La ragione e' gia' scritta due volte —
`membership_register.sql:84-88` e `keys.ts:47-56` — e vale identica qui: *«may
this subject create an artist or a venue» non e' «may this subject make an
address public»*.

**Ancora da NON copiare:** `capability_model.sql:414-417` porta la riga
`('organizer','door.operate',false)` con il commento *«These two rows must not
become true»*. E' l'esempio del **verso opposto**: li' il `false` protegge la
porta, qui il `true` protegge l'indirizzo. Non generalizzare l'uno sull'altro.

#### 1c. La colonna `venue_revealed_at` su tabella popolata

**Analogo:** `membership_register.sql:259-272` — una colonna nullable aggiunta
**in anticipo**, con la sua ragione accanto:

```sql
  -- WHICH NIGHT — nullable, unused by anything today, and present ON PURPOSE.
  -- ... adding the column then would be an `ALTER TABLE` on a populated table
  -- (`supabase-data.md`, gate *default sulle righe esistenti*).
  party_id uuid REFERENCES public.event_parties ON DELETE SET NULL,
```

**Da copiare:** `nullable`, **senza `DEFAULT`**, con un `COMMENT ON COLUMN` che
dichiara cosa succede alle righe esistenti (`NULL` = mai rivelato a mano, che e'
il valore giusto per tutte). Il precedente della colonna senza default e'
`20260226500000_venue_secret_hint_reveal_hours.sql:3`, gia' misurato dalla
ricerca.

**Da NON copiare — P1 della ricerca:** non riusare
`venue_reveal_email_sent` come predicato di pagina. Il cron lo alza **anche con
zero destinatari** (`api/cron/venue-reveal/route.ts:108-115`, riportato per
intero al § 8 qui sotto). Sono due fatti distinti — *l'atto e' avvenuto* e *le
mail sono partite* — e vanno tenuti separati anche quando coincidono.

#### 1d. La tabella append-only della traccia

**Analogo esatto:** `membership_register.sql:162-350`.

Le quattro proprieta' da copiare, ognuna con la sua riga:

```sql
  -- WHO IT WAS DONE TO. SET NULL ...: the act outlives its subject, and a
  -- register that vanished when an account was deleted would be most useful
  -- exactly where it is emptiest.
  subject_id uuid REFERENCES auth.users ON DELETE SET NULL,
```

```sql
  -- WHO DID IT. SET NULL for the same reason as the subject: an author who later
  -- leaves the project does not un-perform their acts.
  actor_id uuid REFERENCES auth.users ON DELETE SET NULL,

  actor_kind text NOT NULL CHECK (actor_kind IN ('user', 'system')),

  -- BOTH DIRECTIONS, so neither can drift. A `user` act without an actor is the
  -- unattributed act; a `system` act WITH an actor is a human act wearing the
  -- system's name, which is worse — it is attribution laundering ...
  CONSTRAINT membership_acts_actor_attributed CHECK (
    (actor_kind = 'user'   AND actor_id IS NOT NULL) OR
    (actor_kind = 'system' AND actor_id IS NULL)
  ),
```

Gli indici, uno per ogni lettura reale (`:283-297`):

```sql
-- Two indexes, each named for the way the table is actually read. `at desc`
-- because both reads are "most recent first", and an index whose order does not
-- match the query's is an index the planner steps around.
CREATE INDEX IF NOT EXISTS idx_membership_acts_subject
  ON public.membership_acts (subject_id, at DESC);
```

**La RLS, ed e' il cuore di D-37-22** (`:314-350`):

```sql
ALTER TABLE public.membership_acts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membership_acts_select_register_read ON public.membership_acts;

-- The `(select …)` wrapper is LOAD-BEARING and it is not `STABLE` that produces
-- it: it makes Postgres evaluate the call once per statement as an InitPlan
-- instead of once per row ...
CREATE POLICY membership_acts_select_register_read ON public.membership_acts
  FOR SELECT USING ((SELECT private.has_capability('register.read')));

-- No INSERT, UPDATE or DELETE policy, and the omission is DELIBERATE. Writes
-- come only through `public.record_membership_act` below, which runs as its
-- definer and is executable by `service_role` alone; so with RLS enabled and no
-- write policy, no session — authenticated, anonymous, or a master's — can add,
-- edit or remove a row. That is what "append-only by construction" means here:
-- it is not a convention the writers observe, it is the absence of any granted
-- path to a write.
--
-- Only one other table in this repository omits its write policies on purpose
-- (`20260805120000_door_scan_events.sql:158-163`), so without this paragraph the
-- next reader would take the gap for a bug and repair it ...
```

**Il paragrafo dell'omissione va copiato insieme al meccanismo.** Senza, D-37-22
non e' onesta: e' l'assenza di ogni percorso di scrittura che rende la traccia
incancellabile, non una convenzione.

**Tre divergenze deliberate da scrivere accanto alla colonna** (o il prossimo
lettore le «ripara»):

1. **Il nome per esteso invece del `membership_code`** — D-37-18. L'analogo dice
   l'opposto, e lo dice con forza (`membership_register.sql:195-202`):
   ```sql
   -- **A MEMBERSHIP CODE, NEVER AN EMAIL ADDRESS AND NEVER A FULL NAME.** This
   -- repository is PUBLIC and `.planning/` is tracked (`CLAUDE.md` Guardrail 5),
   -- so a register row can reach an artefact ...
   ```
   La divergenza e' autorizzata **nel database** (il soggetto qui e' chi ha
   agito, non chi e' stato giudicato) e **non si estende agli artefatti**: il
   nome non entra in un PLAN, in un SUMMARY, in un VERIFICATION.
2. **`party_id … ON DELETE SET NULL`, mai `CASCADE`** — P10. Sedici vincoli
   puntano gia' a `event_parties` con `CASCADE` (§ Runtime State Inventory della
   ricerca): la traccia non diventa il diciassettesimo. Precedente della
   denormalizzazione accanto: `membership_acts.party_id` (`:272`) e
   `ticket_refunds.refunded_ticket_id` (`:190-193`).
3. **Nell'atto non entra l'indirizzo.** Entrano quale serata, chi, quando,
   quante mail. `assignment_acts.sql:236-243` porta la forma del divieto:
   ```sql
   -- ── WHAT IS DELIBERATELY NOT READ HERE ──────────────────────────────────
   -- The subject's `membership_code`. It would be one interpolation away from a
   -- `RAISE EXCEPTION`, and a raised message reaches a log and a log reaches a
   -- screenshot on a PUBLIC repository. ... every message below names an
   -- IDENTIFIER — a party, a subject, a capability — and nothing else.
   ```

#### 1e. Lo scrittore atomico `SECURITY DEFINER`

**Analogo esatto:** `assignment_acts.sql:244-496`. La forma, verbatim:

```sql
CREATE OR REPLACE FUNCTION public.record_party_assignment_act(
  p_party_id   uuid,
  p_subject_id uuid,
  p_capability text,
  p_act        text,
  p_actor_id   uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_assignee_role  text;
  v_ends_at        timestamptz;
  v_assignment_id  uuid;
BEGIN
```

I rifiuti argomentali **per primi, con il proprio nome** (`:260-280`):

```sql
  IF p_act NOT IN ('assigned', 'unassigned') THEN
    RAISE EXCEPTION 'party_assignments.unknown_act: %', p_act
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- An unattributed grant or revocation is refused HERE, with its own name,
  -- rather than downstream. Without this it still fails ... but it fails as
  -- three different codes depending on the branch, and a caller cannot branch
  -- on the CAUSE.
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'party_assignments.actor_required: % %', p_party_id, p_subject_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
```

Il soggetto **com'e' adesso, sotto lock** (`:284-301`):

```sql
    -- `FOR UPDATE` is not caution. ... Without the lock a concurrent demotion
    -- can land between this read and the insert ...
    SELECT p.role
      INTO v_assignee_role
      FROM public.profiles p
     WHERE p.id = p_subject_id
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'party_assignments.subject_not_found: %', p_subject_id
        USING ERRCODE = 'no_data_found';
    END IF;
```

E il lock-down, **due statement in quest'ordine** (`:470-496`):

```sql
-- REVOKE first and GRANT second, in that order and as two statements rather
-- than assumed: Postgres grants EXECUTE to PUBLIC by default on every new
-- function, so the GRANT alone would leave the default in place.

REVOKE ALL ON FUNCTION public.record_party_assignment_act(uuid, uuid, text, text, uuid)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_party_assignment_act(uuid, uuid, text, text, uuid)
  TO service_role;

COMMENT ON FUNCTION public.record_party_assignment_act(uuid, uuid, text, text, uuid) IS
  'ASSIGN-03 / ASSIGN-04: performs the party_assignments row and its membership_acts act in ONE transaction, so a grant cannot succeed while its record fails — a divergence nothing in this product would report, since there is no error tracking. ...';
```

**Cosa copiare, punto per punto:**
- `SET search_path = ''` + **ogni riferimento schema-qualificato**
  (`capability_model.sql:166-171`: un `search_path` mutabile su un
  `SECURITY DEFINER` e' un vettore di escalation).
- `SELECT … FOR UPDATE` sulla riga di `event_parties` **prima** di decidere:
  qui il predicato e' *e' gia' rivelata?*, e una seconda pressione concorrente e'
  esattamente il caso che il lock esiste per chiudere.
- **Una funzione sola per i due atti** (rivelare e ri-nascondere), con l'atto
  come argomento — `assignment_acts.sql:229-234`: *«two functions of the same
  shape diverge: the day somebody adds a check, a lock or a message rule, they
  add it to the one they were looking at»*.
- **L'attore e' un argomento**, non `auth.uid()`: sotto il service client
  `auth.uid()` e' `null` (`membership_register.sql:363-371`, misurato in
  `32-06-SUMMARY.md` §F1). Un trigger registrerebbe **nessuno**.
- `REVOKE` **poi** `GRANT`, e il `COMMENT ON FUNCTION` che dice **cosa protegge**.

**Da NON copiare — P6:** l'analogo lascia viaggiare i `23514`/`23505` verso il
chiamante *perche' le sue tabelle non portano un segreto*. Qui `event_parties`
porta `venue_text`, `venue_id`, `venue_secret_hint` e ogni parametro di
rivelazione, e su una violazione di `CHECK` PostgREST restituisce la riga intera
in `error.details`. Il rifiuto del secondo tentativo e di D-37-22 va quindi
**tipizzato per valore** (§ D.5 della ricerca), non affidato a un `CHECK`.

**Da NON copiare — P5:** non scrivere `event_parties` con la sessione
dell'organizer. `event_parties_update_own`
(`20260807020000_wrap_auth_uid.sql:145-155`) esige master **oppure**
proprietario dell'evento; D-37-13 vuole proprio l'organizer non proprietario.
La funzione non e' un'eleganza, e' l'unico modo — e il segnale precoce e'
*«funziona in sviluppo»*, dove chi prova e' quasi sempre il proprietario.

---

### 2. `supabase/migrations/<ts>_venues_select_narrowed.sql` — la policy anonima

**Cio' che si sostituisce**, letto oggi (`20260226200000_venues.sql:21-27`):

```sql
-- RLS
alter table public.venues enable row level security;

-- Anyone can read venues
create policy "venues_select_public"
  on public.venues for select
  using (true);
```

**Analogo per la forma della nuova policy:** `membership_register.sql:325-335`
(il `DROP POLICY IF EXISTS` prima del `CREATE`, e il wrapper `(select …)`), piu'
la nota sull'InitPlan a `capability_model.sql:177-184`.

**Da copiare:**
- `DROP POLICY IF EXISTS venues_select_public ON public.venues;` in una migration
  **nuova** — una migration applicata non si modifica (`supabase-data.md`, gate
  *migration in avanti*). E finche' quella riga `using (true)` esiste, **nessuna
  policy aggiunta puo' restringere**: le `PERMISSIVE` sono in OR.
- Il wrapper `(select …)` su ogni chiamata a `private.has_capability`, per la
  policy dello staff.
- Le tre policy di scrittura esistenti (`venues_insert_organizer`,
  `venues_update_organizer`, `venues_delete_master`, riscritte da
  `20260807010000:401-417`) **non si toccano**: questa fase cambia la lettura.

**Da NON copiare — P2:** l'analogo `membership_acts` non ha embed annidati che
lo leggono. `public.venues` ne ha due (`events/page.tsx:212`,
`events/[slug]/page.tsx:223`), e un embed rifiutato per un anonimo **non da'
errore: restituisce vuoto**. La verifica va fatta **con la chiave anonima contro
le pagine vere**, non con il build.

**Da NON copiare — P4 (colonne):** l'opzione `REVOKE SELECT (address, …)` e' gia'
stata rifiutata dal progetto con la sua ragione scritta
(`20260810120000_formats_and_series.sql:1018-1023`, citata dalla ricerca):
trasforma un innocuo `select=*` in un `42501`.

**Precedente di casa sul caso di bordo** (sede che ospita una serata pubblica e
una segreta) — `src/app/(public)/venues/[slug]/page.tsx:39-72`, letto oggi:

```ts
  // This filter is a page-level MITIGATION, not a fix. `meta-gates.md` is
  // explicit that the security boundary is RLS, never a page: the rows dropped
  // below stay readable outside this page, so nothing here makes them private.
  // The real fix is the RLS narrowing on `event_parties` scheduled for phase
  // 37; this only stops the public venue page from putting a still-secret
  // party's event next to this venue's address. Calling it a fix is how the
  // real fix stops happening.
  //
  // Edge cases, all decided towards withholding — withholding costs
  // visibility, which is recoverable, and the other direction is not:
  //  - two parties at this same venue, one still secret and one revealed: the
  //    event is withheld ...
```

**Questo commento nomina la fase 37 e va chiuso da questa fase**, non lasciato a
descrivere un lavoro fatto. La scelta di casa — *trattenere* — e' la piu'
coerente col gate *default chiuso*, ed e' la raccomandazione della Open Question 2.

---

### 3. `src/lib/capabilities/keys.ts` — la voce tredicesima

**Analogo esatto:** la voce nona, `register.read`, in entrambi i posti.

`keys.ts:118-119` (dentro `CAP`):

```ts
  /** Read the register of acts on a member's role and status. Role AND approved. */
  REGISTER_READ: "register.read",
```

`keys.ts:159-160` (dentro `CAP_DESCRIPTIONS`):

```ts
  "register.read":
    "Read the register of acts on a member's role and status — who was created, approved, rejected, promoted, demoted, deactivated or reactivated, by whom and when. Role AND an approved status, because the register contains rejections.",
```

**Il contratto che il compilatore tiene** (`keys.ts:130-143`):

```ts
/**
 * One sentence per key, for the humans who read a permission decision.
 *
 * Typed as a **total** `Record` over the union on purpose ...: adding a
 * thirteenth key to `CAP` without a description here is a `npm run build` error
 * ...
 * It cannot hold the other part — that these strings match the twelve rows in
 * `private.capabilities`. That is `scripts/verify-capabilities.mjs`'s job.
 */
export const CAP_DESCRIPTIONS: Record<CapabilityKey, string> = {
```

**Da copiare:**
- Il nome **nomina la domanda, non il predicato** (`keys.ts:38-45`). La domanda
  e': *«posso far uscire l'indirizzo di questa serata adesso?»*. Famiglia
  `<sostantivo>.<verbo>`, coerente con `staff.manage`, `catalogue.manage`,
  `party.manage`.
- Il docblock del modulo (`keys.ts:1-85`) va **esteso**, non lasciato a dire
  «twelve»: il file conta le chiavi in prosa in quattro punti (`:1`, `:31`,
  `:58`, `:88`, `:141`). Una tredicesima chiave che lascia scritto «dodici» e' la
  stessa specie di deriva che `ai-engineering.md` chiama documentazione datata.
- La riga va scritta **nello stesso commit della migration** (`keys.ts:34-36`).

**Da NON copiare:** non aggiungere la chiave a `CAP` senza la sua descrizione
sperando che qualcosa protesti a runtime — protesta `next build`, ed e' l'unica
meta' del contratto che il compilatore tiene. L'altra meta' (database ↔ `CAP`)
richiede `npm run verify:capabilities` **con un database vivo**, che e' un passo
pre-deploy manuale: non c'e' CI.

---

### 4. `src/lib/routes/capability-routes.ts` — la riga obbligatoria

**Il tipo che rende la voce obbligatoria** (`:129-160`):

```ts
type Binding =
  | {
      /** The addresses this key opens. Declaration order is IRRELEVANT. */
      routes: readonly RoutePattern[];
      assignmentOpenable?: true;
      /** True when the key ALSO gates rows. Four of the twelve do. */
      alsoGatesTables?: true;
    }
  | {
      scope: TableOnly;
      /** One line, mandatory. A gate that cannot say so would be satisfied by a lie. */
      reason: string;
    };
```

**Analogo per il ramo `table`** (`:315-319`):

```ts
  [CAP.MASTER_MANAGE]: {
    scope: "table",
    reason:
      "Gates rows and server-side operations, not addresses; the guard is `guards.ownsOrIsMaster` in `src/lib/capabilities/guards.ts`.",
  },
```

**Analogo per il ramo `routes`** (`:274-277`):

```ts
  [CAP.REGISTER_READ]: {
    routes: ["/admin/members/register"],
    alsoGatesTables: true,
  },
```

**E la chiusura totale** (`:402`): `} as const satisfies Record<CapabilityKey, Binding>;`

**Da copiare:** la chiave nuova **non apre un indirizzo nuovo** — il bottone vive
su `/admin/events/[id]/edit`, gia' legata a `organizer.access`
(`capability-routes.ts:256`). Quindi ramo `scope: "table"` con la sua `reason`.

**Da NON copiare — l'inciampo gia' avvenuto, scritto nel file stesso**
(`:321-337`): una pagina legata a una chiave `table-only` e' **irraggiungibile
per tutti**, senza errore di build e senza niente nei log. Se chi pianifica
decidesse di dare alla rivelazione un indirizzo proprio, la voce deve stare sul
**primo** ramo con `routes: [...]`.

**Seconda modifica allo stesso file, per D-37-23:** `/admin/venues/[slug]` va
aggiunta all'elenco di `ORGANIZER_ACCESS` (`:248-264`), accanto alla sorella
`/admin/venues` gia' presente a `:252`:

```ts
  [CAP.ORGANIZER_ACCESS]: {
    routes: [
      "/admin",
      "/admin/artists",
      "/admin/venues",
      ...
```

⚠️ `COMPILED_PATTERNS` **lancia al primo import** su due pattern ambigui
(`:543-572`). La ricerca ha verificato che `/admin/venues/[slug]` non collide.

---

### 5. `src/app/(admin)/admin/events/[id]/reveal/actions.ts` — la server action

**Analogo esatto:** `src/app/(admin)/admin/events/[id]/assignments/actions.ts` —
e' l'unico file del repo in cui una server action chiama uno scrittore
`SECURITY DEFINER` e ne traduce il rifiuto in un valore.

Il corpo, verbatim (`:292-333`):

```ts
export async function assignToParty(
  eventId: string,
  input: { partyId: string; subjectId: string; capability: string }
): Promise<AssignmentResult> {
  const actorId = await verifyOrganizerAccess(eventId);

  const target = await validateTarget(eventId, input.partyId, input.subjectId, input.capability);
  if (!target.ok) return target;

  const { error } = await getServiceClient().rpc("record_party_assignment_act", {
    p_party_id: input.partyId,
    p_subject_id: input.subjectId,
    p_capability: input.capability,
    p_act: "assigned",
    p_actor_id: actorId,
  });

  if (error) {
    const reason = classifyWriteError(error);
    if (reason === "write_failed") {
      console.error(
        `[assignments.write_failed] assign on party ${input.partyId}: ` +
          `${error.code ?? "unknown"}`
      );
    }
    return { ok: false, reason };
  }

  revalidatePath(`/admin/events/${eventId}/assignments`);
  return { ok: true };
}
```

La classificazione del rifiuto **dal solo codice** (`:255-278`):

```ts
/**
 * The refusal category of a failed write, from its CODE alone.
 *
 * Never from a parsed message: Next redacts a Server Action's message in a
 * production build, and a category read out of a sentence works in `next dev`
 * and stops working where it matters. The field that carries the failing row is
 * not touched — see the file comment.
 */
function classifyWriteError(error: { code?: string | null }): AssignmentRefusal {
  switch (error.code) {
    case CHECK_VIOLATION: return "self_assignment_refused_by_database";
    case FOREIGN_KEY_VIOLATION: return "assignee_not_staff";
    case UNIQUE_VIOLATION: return "already_assigned";
    case NO_DATA_FOUND: return "no_live_assignment";
    default: return "write_failed";
  }
}
```

**Il gate, non esportato** — analogo `formats/actions.ts:73-106`:

```ts
/**
 * The gate. It asks `catalogue.manage`, which is `requires_approved = true`
 * (`20260807000000_capability_model.sql:399-400`), so a **pending** organizer is
 * refused here as well as at the address (`capability-routes.ts`).
 *
 * It is deliberately **NOT exported**: every export of a `"use server"` module
 * is a public endpoint, and a gate is not one (`admin/venues/actions.ts:44-50`).
 *
 * @throws `forbidden.catalogue_manage_required` — the answer is no.
 * @throws `capabilities.identity_missing` — the payload carried no `user_id`.
 */
async function assertCatalogueManage(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  if (!capabilities.has(CAP.CATALOGUE_MANAGE)) {
    throw new Error("forbidden.catalogue_manage_required");
  }

  if (!userId) {
    console.error(
      "[capabilities.identity_missing] a caller holds catalogue.manage but " +
        "my_access_context() returned no user_id. This is NOT a refusal on " +
        "the merits — the migration adding user_id has not been applied."
    );
    throw new Error("capabilities.identity_missing");
  }

  return { userId };
}
```

Il tipo di ritorno (`formats/actions.ts:269-271`):

```ts
export type CatalogueResult =
  | { ok: true; id: string }
  | { ok: false; reason: CatalogueRefusal };
```

Gli import (`formats/actions.ts:1-7`):

```ts
"use server";

import { revalidatePath } from "next/cache";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { getServiceClient } from "@/lib/supabase/service";
```

**Da copiare, senza eccezioni:**
- **Il gate e' chiamato per primo in ogni export**, e non e' esportato
  (`formats/actions.ts:26-31`): *«a server action is a public endpoint with a
  convenient signature»*. La chiave ri-chiesta qui e' la tredicesima, non
  `organizer.access` della pagina.
- **`p_actor_id` risolto server-side e passato**, mai preso dal corpo della
  richiesta (`assignments/actions.ts:288-290`).
- **Il rifiuto viaggia come valore** (`formats/actions.ts:41-51`): tre sorelle
  del repo (`admin/venues/actions.ts:174-180`, `admin/artists/actions.ts:189`,
  `admin/events/[id]/tickets/actions.ts:288`) lanciano un `Error`, e la
  divergenza e' dichiarata li' invece di lasciarla trovare a un revisore.
- **Cosa si logga:** `error.code` e `error.message`, mai l'oggetto intero, mai
  `error.details` (`formats/actions.ts:53-63`). Su `event_parties` quel campo
  porta l'indirizzo — e' letteralmente il difetto che si autoinfligge.
- `revalidatePath` su ogni superficie toccata. L'analogo per il venue e' gia'
  scritto in `admin/events/actions.ts:560-563`: `/admin/events`, `/events`,
  `/events/${slug}`.
- **Il `partyId` e' input non fidato:** validarlo come uuid **prima** di
  raggiungere la funzione. Il pattern esiste gia' a `formats/actions.ts:111-113`:
  ```ts
  /** The same shape as `[id]/assignments/actions.ts:85-86`. */
  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  ```

**Da NON copiare — P8:** il `catch` del cron
(`api/cron/venue-reveal/route.ts:150-152`) fa `console.error` e prosegue. Non
esiste error tracking: un invio parziale che finisce in un log non raggiunge
nessuno. Il risultato deve tornare **come valore** con i numeri di D-37-12
(«quanti su quanti»).

**Da NON copiare — P9:** nessun ramo del client su `err.message`. Funziona in
`next dev` e smette dove conta.

---

### 6. `RevealVenueDialog.tsx` — la conferma

**Analogo esatto, per forma e per docblock:**
`src/app/(admin)/admin/formats/RetireFormatDialog.tsx` (350 righe, letto oggi
per intero). E' il precedente diretto, **e il suo docblock si confronta
esplicitamente con `venue_reveal_sent`** (`:27-35`):

```tsx
 * ── What this dialog is NOT, recorded so nobody has to guess ─────────────────
 *
 * Retiring **publishes nothing** and is **reversible**. It is not a monotone
 * switch and it must not be built like one: unlike `venue_reveal_sent`, where
 * the mail has left and the screenshot exists, retiring a format writes a
 * timestamp that a later act can clear. **This phase adds no monotone switch at
 * all.**
```

⚠️ **Quel paragrafo dice, in anticipo, che il dialogo della fase 37 e' il caso
opposto.** Il dialogo nuovo deve dichiararlo nello stesso posto: qui la mail
parte e non rientra, e la conferma e' l'unico freno (D-37-11).

**Il docblock sul rifiuto come valore** (`:57-65`), da copiare quasi parola per
parola:

```tsx
 * ── A refusal is a RETURNED value ────────────────────────────────────────────
 *
 * Every action in `admin/formats/actions.ts` returns `CatalogueResult`. Next
 * **redacts** the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`), so a client that
 * read `err.message` would work under `next dev` and print a blank where it
 * counts. The `catch` below therefore branches on the **shape** of the failure —
 * it distinguishes *the request never left* from *the server refused it*, which
 * is the most that can honestly be told apart without a message.
```

**Le props** (`:103-131`) — `readonly` su ognuna, e ogni prop non ovvia porta il
suo commento:

```tsx
interface RetireFormatDialogProps {
  readonly open: boolean;
  /** The row this dialog acts on. */
  readonly id: string;
  /** Rendered verbatim in the heading — a format name is stored as it is written. */
  readonly name: string;
  readonly subject: RetireSubject;
  readonly mode: RetireMode;
  readonly onClose: () => void;
  /** Called after the act succeeded, so the surface can reload its rows. */
  readonly onDone: () => void;
}
```

**Lo stato e il fuoco** (`:144-169`):

```tsx
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      setRefusal(null);
      // `Cancel` takes the default focus, and this is the deliberate part:
      // ... A confirmation whose Enter key performs the act is a confirmation
      // that did not ask.
      //
      // `showModal()` also traps focus for as long as the dialog is open — the
      // rest of the document is inert ...
      cancelRef.current?.focus();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);
```

**Il `confirm()` e il `catch` che ramifica sulla forma** (`:218-255`):

```tsx
  async function confirm() {
    if (isSubmitting) return;
    setRefusal(null);
    setIsSubmitting(true);

    try {
      let result: CatalogueResult;
      ...
      if (!result.ok) {
        setRefusal(describe(result.reason));
        return;
      }

      onDone();
      close();
    } catch (err) {
      // The guard throws; the network throws. Both messages are redacted in a
      // production build, so the branch is on the SHAPE of the failure and each
      // branch names a different cause.
      const unreachable =
        err instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);

      setRefusal(
        unreachable
          ? "Could not act. The request never reached the server. Nothing changed — check the connection and try again."
          : "Could not act. The server refused the request. This account may no longer hold permission to manage the catalogue; reload the page and check. Nothing changed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }
```

**Una frase per causa, mai un secchio** (`:180-216`):

```tsx
  /**
   * One sentence per cause. `Could not …` opens each one and what follows is the
   * reason, never a stand-in for one — there is no error tracking in this
   * project, so a refusal a person cannot read is a refusal nobody ever reads.
   */
  function describe(reason: CatalogueRefusal): string {
    ...
      default:
        // Not a bucket: an unforeseen cause identifies itself on screen rather
        // than borrowing a sentence written for something else.
        return `Could not act. The catalogue refused this with "${reason}", which this dialog does not expect. Nothing changed.`;
```

**L'ordine dei bottoni e il trattamento distruttivo** (`:310-345`): `Cancel`
primo nel DOM e primo nel tab order, con `autoFocus`; il bottone d'azione porta
`disabled={isSubmitting}` e il testo `Working…`.

**Da copiare, e sono le parti che decidono:**
- La riga di conferma **conta le persone** (D-37-16). Il numero e'
  `emailMap.size` del modulo condiviso — non la somma delle righe di
  `tickets` + `rsvps`, che conta due volte chi ha entrambi.
- Il testo nomina il posto, il numero e l'irreversibilita'. Il precedente di
  copy e' `RetireFormatDialog:261-268`, che spiega **cosa resta vero dopo**
  l'atto invece di generici avvisi.
- **Nessuna digitazione di conferma** (D-37-16), coerente con l'analogo: due
  bottoni, il fuoco su `Cancel`.

**Da NON copiare:**
- Il ramo `restore` dell'analogo come modello per D-37-22. Li' il ripristino e'
  *un atto proprio, non un undo*; qui il ri-nascondere e' **solo per il master**
  e **non cancella la traccia** — e va detto nella copy, o la pagina promette
  qualcosa che le mail partite smentiscono.
- Il colore rosso «distruttivo» come segnale automatico. Rivelare non distrugge:
  pubblica. Se il trattamento visivo si eredita, si eredita con la sua ragione.

---

### 7. Il bottone a tre stati e la traccia sulla serata

**Nessun analogo esatto: dichiarato.** Non esiste nel repo un bottone che cambi
**testo** su un conteggio residuo e poi si spenga nominando chi ha agito. Il
piu' vicino e' il cablaggio dell'apertura del dialogo, che si copia solo per
quello.

`FormatsCatalogue.tsx:181-186` (lo stato del target):

```tsx
  const [retireTarget, setRetireTarget] = useState<RetireTarget | null>(null);
  const [listingBusy, setListingBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string; sentence: string } | null>(
```

e il montaggio a `:418` (`<RetireFormatDialog … />` con `onDone` che ricarica le
righe). Il bottone disabilitato durante il lavoro esiste a `:301`
(`disabled={listingBusy === format.id}`), ma e' *occupato*, non *spento con una
ragione*.

**Cosa il piano deve progettare, perche' non c'e' da dove copiarlo:**
- **Una sola posizione, tre stati** (D-37-19/20): «rivela adesso» → «manda ai N
  che mancano» → spento con data e nome.
- **Spento, non sparito.** Chi cerca il bottone trova anche la risposta. Un
  bottone premibile su un'azione irreversibile invita a premerlo per vedere
  cosa succede.
- Il conteggio dei mancanti e' **per destinatario**, come gia' fa il cron
  (`tickets.venue_reveal_sent`, `rsvps.venue_reveal_sent`).

**Dove vive il file — R-WORK-ROUTES:** dentro `(work)` **solo `page.tsx` e
`loading.tsx`**. Il componente client e il modulo di action stanno un livello
fuori, a `src/app/(admin)/admin/events/…`, e si importano con specificatore
assoluto — esattamente come `RetireFormatDialog` e' importato da
`FormatsCatalogue.tsx:8-11`:

```tsx
import RetireFormatDialog, {
  ...
} from "@/app/(admin)/admin/formats/RetireFormatDialog";
```

**La superficie ospite** e' `src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx`,
che oggi compone `EventForm` e un link (`:245-296`). Il suo docblock (`:12-70`)
dichiara al punto 3:

```
 *  3. **The venue is not revealed one moment earlier by this file.** The page
 *     renders `venue_secret`, `venue_secret_hint`, `venue_reveal_hours` and
 *     `venue_reveal_on_purchase`, so the two gates above are the only thing
 *     between an address and a browser. `venue_reveal_sent` is monotone
 *     (`meta-gates.md`) and this merge makes neither gate easier to pass ...
```

⚠️ **Quel paragrafo diventa falso** nel momento in cui il bottone atterra qui:
la pagina acquisisce un percorso che rivela. **Va riscritto nello stesso commit**,
con la stessa disciplina di D-37-03 per il gate di dominio — e il modello di come
si riscrive una dichiarazione invece di cancellarla e'
`assignment_acts.sql:110-203` (la riscrittura di D-18, che cita il paragrafo
superato e dice quale dei due governa).

---

### 8. `src/lib/venue-reveal/reveal-party-venue.ts` — il cuore condiviso

**Il file da estrarre**, per intero: `src/app/api/cron/venue-reveal/route.ts`
(181 righe, letto oggi). Le parti che il modulo si porta via:

La deduplicazione per email — **il numero che la conferma mostra** (`:78-106`):

```ts
    // Deduplicate by email
    const emailMap = new Map<
      string,
      { name: string; ticketIds: string[]; rsvpIds: string[] }
    >();

    for (const ticket of [...(tickets || []), ...(masterTickets || [])]) {
      const profile = ticket.profiles as unknown as { email: string; full_name: string } | null;
      if (!profile) continue;
      const existing = emailMap.get(profile.email) || {
        name: profile.full_name || "Member",
        ticketIds: [],
        rsvpIds: [],
      };
      existing.ticketIds.push(ticket.id);
      emailMap.set(profile.email, existing);
    }
```

Le tre query dei destinatari (`:57-76`), che includono il **master ticket**
d'evento (`party_id IS NULL`) — la parte che una riscrittura da zero
dimenticherebbe:

```ts
    const { data: masterTickets } = await supabase
      .from("tickets")
      .select("id, user_id, profiles(email, full_name)")
      .eq("event_id", party.event_id)
      .is("party_id", null)
      .eq("venue_reveal_sent", false);
```

I lotti da 100 e l'invio (`:120-153`):

```ts
    // Build batch emails (max 100 per request)
    const entries = Array.from(emailMap.entries());
    for (let i = 0; i < entries.length; i += 100) {
      const batch = entries.slice(i, i + 100);
      ...
      try {
        await resend.batch.send(emails);
        totalSent += emails.length;
      } catch (err) {
        console.error("Batch send failed for party", party.id, err);
      }
    }
```

**Analogo per la forma «un modulo, due chiamanti»:** `src/lib/media/may-upload.ts`,
importato sia da una server action (`src/app/(public)/events/[slug]/actions.ts:11`)
sia da un route handler (`src/app/api/media/finalize/route.ts:9`). E' l'unico
precedente del repo, e il suo docblock spiega **perche' e' un modulo e non un
export di `actions.ts`** (`may-upload.ts:29-34`):

```ts
 * ── Why it is a module and not an export of `actions.ts` ─────────────────────
 * A file marked `"use server"` publishes **every** export as a public endpoint.
 * Leaving this predicate there and exporting it — so that plan 35-20's
 * persistence route could reuse it — would publish an oracle answering *"may
 * this person upload to this night?"* to anyone who calls it. A plain module
 * has no such behaviour: `validateMediaUpload`, `registerMedia` and the route
 * import ONE definition and none of them becomes an extra door.
```

E la prima riga del file (`may-upload.ts:1`), con la sua ragione di posizione
(`:7-15`): `import "server-only";` **sopra il docblock**, perche' un controllo
che legge `head -3` fallirebbe su un file che lo soddisfa.

**Da copiare:**
- `import "server-only"` come prima riga.
- Un tipo di ritorno esplicito con i **tre numeri** e la **categoria** di
  fallimento (§ D.2 della ricerca):
  `{ recipientsTotal, recipientsSent, recipientsFailed, failureKind }`.
- Il `Map<email, …>` intatto: due implementazioni della deduplicazione
  significano **due numeri diversi per lo stesso atto irreversibile**.

**Da NON copiare — il difetto misurato dalla ricerca a `:155-171`:** la marcatura
usa `entries`, cioe' **tutti** i destinatari, indipendentemente da quali lotti
siano riusciti:

```ts
    // Mark all processed tickets and rsvps as venue_reveal_sent
    const allTicketIds = entries.flatMap(([, d]) => d.ticketIds);
    ...
    if (allTicketIds.length > 0) {
      await supabase
        .from("tickets")
        .update({ venue_reveal_sent: true })
        .in("id", allTicketIds);
    }
```

Finche' resta cosi', «20 su 50» **non e' rappresentabile** e il bottone «manda ai
N che mancano» non troverebbe nessuno. La marcatura va **per lotto, dentro il
`try`, dopo l'invio riuscito**. E' anche cio' che `ticketing-payments.md`
chiede al gate *cron non atomico*: marcare il progresso per elemento, mai in
coda.

**Da NON copiare — P8:** `console.error("Batch send failed…")` e prosegui.

**Da NON copiare — il ramo zero destinatari** (`:108-115`), che alza
`venue_reveal_email_sent` su una serata solo spazzata: il modulo lo restituisce
come `failureKind: "no_recipients"`, e chi decide cosa marcare e' il chiamante.

**P11 — il gate che smette di caricarsi.** I `paths:` di `venue-secrecy.md`
(`.claude/rules/venue-secrecy.md`, frontmatter) coprono
`src/app/api/cron/venue-reveal/**`, `src/emails/venue-reveal.tsx`,
`src/app/(public)/events/**`, `src/app/**/venues/**`, `src/components/venues/**`,
`src/components/events/**` — **non `src/lib/**`**. Spostare il cuore li' lo porta
fuori dal raggio del suo gate. I `paths:` vanno allargati **nello stesso commit**,
l'indice di `CLAUDE.md` allineato, e il context budget rimisurato
(`ai-engineering.md`: caso peggiore 38.240 byte ≈ 10.622 token su 12.000,
margine 1.378).

---

### 9. `src/utils/datetime.ts` — la costante in un posto solo

**Il file oggi** esporta `EVENT_TIME_ZONE`, `zonedInstant`, `partyStartInstant`,
`partyEndInstant`, `menuCloseInstant`, `zonedDateString`. La convenzione di
export e' *una costante nuda + funzioni sottili sopra un privato condiviso*:

```ts
export const EVENT_TIME_ZONE = "Europe/Rome";
```

```ts
/** When a party starts, as an instant. */
export function partyStartInstant(date: string, time: string | null): Date {
  return zonedInstant(date, time);
}
```

**La regola di casa che autorizza l'aggiunta** (`:96-102`):

```ts
 * these conversions were centralised to stop a six-variant drift, in which the
 * same "is this night over yet" question was answered six slightly different
 * ways ... **A variant of this conversion inlined at a call site is the defect
 * this module exists to prevent**, so if a caller needs a boundary this file
 * does not yet expose, add it here rather than computing it there.
```

**E il precedente del privato deliberato** (`:69-72`), che e' il motivo per cui
si esporta **anche la funzione** e non solo la costante:

```ts
 * Private on purpose: the two closing times a night has — when the drink menu
 * shuts and when the party ends — are the same arithmetic under two names, and
 * they must not be allowed to become two implementations again.
```

**Da copiare:** `DEFAULT_VENUE_REVEAL_HOURS = 25` **e**
`venueRevealHours(stored: number | null): number`, con l'aritmetica di 24h59m
scritta accanto alla costante — o qualcuno la arrotondera' a 24 «perche' e' un
giorno». Entrambi i siti chiamano la **funzione**:

| Sito | Riga oggi | Codice |
|---|---|---|
| Pagina | `src/app/(public)/events/[slug]/page.tsx:112` | `const hours = opts.venueRevealHours ?? 24;` |
| Cron | `src/app/api/cron/venue-reveal/route.ts:43` | `const hours = p.venue_reveal_hours ?? 24;` |

**Da NON copiare — P4:** esportare la sola costante lascia due `?? DEFAULT` in
due file, cioe' due siti dove si puo' ancora divergere. E' esattamente la forma
da cui sono nate le sei varianti che questo file racconta.

**Vincolo trasversale:** un valore `date`+`time` non si passa mai a `new Date()`.
La conversione passa da `partyStartInstant` — che il cron gia' usa
correttamente (`route.ts:7, 40`).

---

### 10. `src/app/(admin)/admin/events/actions.ts` — il pavimento a 25 ore

**Il codice di oggi** (`:405-427`, letto oggi):

```ts
    // Validate venue_secret_hint
    if (party.venue_secret_hint && party.venue_secret_hint.length > 500) {
      throw new Error("Venue hint must be 500 characters or less");
    }
    // Validate venue_reveal_hours
    if (party.venue_reveal_hours !== undefined && party.venue_reveal_hours !== null) {
      const hours = Number(party.venue_reveal_hours);
      if (isNaN(hours) || hours < 1 || !Number.isInteger(hours)) {
        throw new Error("Reveal hours must be a positive integer");
      }
      party.venue_reveal_hours = hours;
    }
```

**Da copiare:** la struttura del blocco, che e' gia' quella giusta (normalizza,
poi valida, poi riassegna).

**Da modificare:** `hours < 1` → `hours < DEFAULT_VENUE_REVEAL_HOURS`, e il
messaggio deve dire **perche'**: *«sotto le 25 ore la mail puo' partire dopo la
serata: il cron gira una volta al giorno»*. Senza il perche', al primo rifiuto
qualcuno alza il limite invece della finestra (D-37-06 punto 2).

**Da NON copiare — la forma del rifiuto in questo file:** `updateEvent` lancia
`Error` con il messaggio. Va bene qui perche' e' un percorso di form gia'
esistente, **ma il percorso nuovo di rivelazione non lo eredita**: li' il rifiuto
e' un valore di ritorno (§ 5).

⚠️ **`venue_secret` si scrive in cinque punti, non uno** (misurato dalla
ricerca): `:409-411` (normalizzazione), `:464` (livello evento), `:625`
(`createEvent` → `events`), `:650-653` (`createEvent` → `event_parties`), `:722`
e `:878-881` (`updateEvent`). La guardia di D-37-22 deve conoscerli tutti, o il
ri-nascendere passa dal form senza traccia — che e' il comportamento di oggi.

---

### 11. `src/app/(public)/events/[slug]/page.tsx` — il predicato

**Il predicato di oggi, per intero** (`:87-117`) — ogni riga e' un ramo che il
piano **non deve toccare**:

```ts
function isVenueVisible(opts: {
  partyDate: string;
  partyTime: string;
  venueSecret: boolean;
  hasTicketForParty: boolean;
  hasMasterTicket: boolean;
  isApproved: boolean;
  isOrganizer: boolean;
  isMasterRole: boolean;
  venueRevealHours: number | null;
  venueSecretHint: string | null;
  venueRevealOnPurchase: boolean;
}): { visible: boolean; hint: string | null } {
  if (!opts.venueSecret) return { visible: true, hint: null };
  if (opts.isMasterRole || opts.isOrganizer) return { visible: true, hint: null };
  // Ticket holders see venue immediately only if venue_reveal_on_purchase is true
  if (opts.venueRevealOnPurchase && (opts.hasTicketForParty || opts.hasMasterTicket)) {
    return { visible: true, hint: null };
  }
  const partyStart = partyStartInstant(opts.partyDate, opts.partyTime);
  const now = new Date();
  // Past event → visible for approved members
  if (now > partyStart && opts.isApproved) return { visible: true, hint: null };
  // Approved member with ticket/rsvp → visible X hours before
  if (opts.isApproved && (opts.hasTicketForParty || opts.hasMasterTicket)) {
    const hours = opts.venueRevealHours ?? 24;
    const hoursUntil = (partyStart.getTime() - now.getTime()) / 3600000;
    if (hoursUntil <= hours) return { visible: true, hint: null };
  }
  return { visible: false, hint: opts.venueSecretHint };
}
```

**Il sito di chiamata** (`:682-695`):

```tsx
        {parties.map((party) => {
          const hasTicketForParty = !!party.userTicket;
          const { visible: venueVisible, hint: venueHint } = isVenueVisible({
            partyDate: party.date,
            partyTime: party.time,
            venueSecret: party.venue_secret,
            hasTicketForParty,
            hasMasterTicket,
            isApproved,
            isOrganizer,
            isMasterRole,
            venueRevealHours: party.venue_reveal_hours,
            venueSecretHint: party.venue_secret_hint,
            venueRevealOnPurchase: party.venue_reveal_on_purchase,
          });
```

**Il blocco di rendering** (`:765-788`), che contiene anche il link che D-37-23
rompe (`:770`):

```tsx
                {/* Venue display with secret logic */}
                {(party.venue || party.venue_text || party.venue_secret) && (
                  <div className="mt-1">
                    {venueVisible ? (
                      party.venue ? (
                        <Link href={`/venues/${party.venue.slug}`} className="...">
                          <MapPinIcon /> {party.venue.name}
                        </Link>
                      ) : party.venue_text ? (
                        ...
                    ) : party.venue_secret ? (
                      <SecretVenueDialog
                        hint={venueHint}
                        isAuthenticated={isAuthenticated}
                        isApproved={isApproved}
                        revealHours={party.venue_reveal_hours}
                        revealOnPurchase={party.venue_reveal_on_purchase}
                      />
                    ) : null}
                  </div>
                )}
```

**Da copiare — la forma dei rami esistenti:** ogni ramo e' un `if` che ritorna
`{ visible: true, hint: null }`, e il `return` finale e' l'indizio. Il ramo nuovo
**si aggiunge in coda**, prima del `return` finale, e non nomina
`hasTicketForParty`:

```ts
// dopo il ramo :111-115, prima del return finale
if (opts.isApproved && (opts.revealedAt !== null || hoursUntil <= hours)) {
  return { visible: true, hint: null };
}
```

**Tre cose che il piano deve fare e che nessun analogo insegna:**
1. `revealedAt` va **aggiunto alla `select` di `:223`**, altrimenti arriva
   `undefined` e il ramo e' morto **senza errore**.
2. `hasRsvpForParty: !!party.userRsvp` va aggiunto alla firma e al sito di
   chiamata. Il dato e' gia' recuperato (`:83`, `:303-322`, `:360`) e mai letto.
   ⚠️ Il popolamento e' **condizionato al tipo di accesso** (`userRsvp` solo se
   `access_type === "free_rsvp"`): va scritto nel piano, o il prossimo lettore
   concludera' che e' un bug.
3. Il docblock a `:154-166` dichiara che `isApproved`/`isMasterRole` non sono
   presentazionali perche' entrano qui. La fase e' autorizzata a cambiare quel
   verdetto (D-37-02) — **e ad aggiornare il docblock nello stesso commit**.

**Da NON copiare — P7:** non legare l'RSVP a `venueRevealOnPurchase`. Il cron
manda l'indirizzo a chi ha un RSVP **senza consultare quel flag**
(`route.ts:63-68`): metterlo dentro la guardia riapre l'asimmetria che D-37-10
chiude.

**Da NON copiare — il gate *default chiuso*:** un `revealedAt` non parsabile o
una query rifiutata → **indizio**, mai indirizzo. E' l'unico dominio del progetto
in cui il default sicuro e' negare.

**Cache (D-37-09):** `export const dynamic = "force-dynamic";` va dichiarato qui
e su `(public)/events/page.tsx`. Oggi le tre rotte sono `ƒ` **per derivazione**
da `cookies()`, non per dichiarazione: nessuna riga esprime l'intenzione, e una
modifica futura le renderebbe statiche senza un errore.

---

### 12. `SecretVenueDialog.tsx` — la finestra effettiva

**Le props e il ramo difettoso**, letti oggi (`:7-13` e `:62-72`):

```tsx
interface SecretVenueDialogProps {
  hint: string | null;
  isAuthenticated: boolean;
  isApproved: boolean;
  revealHours: number | null;
  revealOnPurchase: boolean;
}
```

```tsx
                  <ul className="list-disc list-inside space-y-1">
                    {revealOnPurchase && (
                      <li>Buy a ticket to unlock immediately</li>
                    )}
                    <li>
                      {revealOnPurchase ? "Or wait" : "Wait"} for the reveal{" "}
                      {revealHours
                        ? `${revealHours} hours before the event`
                        : "closer to the event"}
                    </li>
                  </ul>
```

**Il rimedio piu' stretto:** passare la finestra **gia' risolta dal server** —
`revealHours={venueRevealHours(party.venue_reveal_hours)}` — cosi' il componente
client non conosce piu' il fallback e non puo' divergere. Il tipo diventa
`number` e **il ramo `else` sparisce**: sparisce anche il modo di sbagliarlo.

**Seconda modifica, sullo stesso file e nello stesso piano:** con il modello a
tre livelli, l'elenco «come sbloccare» diventa **falso per un membro approvato
senza biglietto**, che sblocchera' alla finestra senza comprare nulla. E' una
superficie pubblica che promette una cosa mentre il sistema ne fa un'altra — lo
stesso difetto del punto 5, sull'altro asse.

**Da NON copiare:** il fallback duplicato lato client. Un secondo `?? 25` qui
sarebbe il terzo sito, dopo i due che la fase esiste per unificare.

---

### 13. `events/page.tsx` + `EventTabs.tsx` — la fuga nel payload RSC

**La catena, letta oggi.** La `select` (`events/page.tsx:210-213`):

```ts
    const query = supabase
      .from("events")
      .select("slug, title, date, venue_secret, lineup, is_published, event_parties(id, date, venue_text, sort_order, venue_secret, venue_secret_hint, lineup, format_id, series_id, venues(name, address, google_maps_url), formats(name, slug, color), party_series!event_parties_series_id_fkey(name))")
      .order("date", { ascending: true });
```

La costruzione, **senza guardare `venue_secret`** (`:268-275`):

```ts
        venues.push({
          venue_name: venue?.name ?? null,
          venue_text: p.venue_text ?? null,
          venue_address: venue?.address ?? null,
          venue_google_maps_url: venue?.google_maps_url ?? null,
          venue_secret: p.venue_secret ?? false,
          venue_secret_hint: p.venue_secret_hint ?? null,
        });
```

Il tipo lato client (`EventTabs.tsx:10-17`) e il rendering (`:246-259`), che
**non usa mai i due campi**:

```tsx
                      {v.venue_secret ? (
                        <><LockClosedIcon /> Secret Venue</>
                      ) : (
                        <><MapPinIcon /> {v.venue_name ?? v.venue_text}</>
                      )}
```

**Da copiare — il rimedio piu' stretto e' non selezionare cio' che non si rende:**
togliere `address` e `google_maps_url` dalla `select` di `:212`, dall'interfaccia
`VenueInfo` (`events/page.tsx` e `EventTabs.tsx:10-17`) e dalla costruzione
`:268-275`. Nessun pixel cambia. Il gate e' `nextjs-architecture.md`, *segreti nel
bundle*: tutto cio' che sta in un componente client finisce nel browser.

**Da NON copiare — il ragionamento «tanto la policy la chiude»:** se il rimedio
RLS scelto e' R1, che continua a servire l'indirizzo delle sedi non segrete
(D-37-24), **la fuga resta**, perche' la query non discrimina.

**Da copiare — il rilevamento gia' costruito** (`events/page.tsx:219-225`):

```ts
    const { data: events, error: eventsError } = await query;

    // This error was DISCARDED before this phase, and adding two embeds is what
    // makes discarding it untenable: PostgREST answers a malformed or refused
    // embed with `data: null` and no exception, so the catch below never fires
    // and the page renders "no upcoming events" — a healthy-looking lie, on the
    // shop window, that nothing in this project would ever report
```

E il commento sulle due relazioni (`:199-209`), che e' il precedente misurato di
P2. Un piano che introduce R1 deve verificare che il `venues` `null` **per
elemento** non passi da quel controllo — non e' un errore di query — e quindi va
rilevato **dalla verifica anonima contro la pagina vera**.

---

### 14. `src/app/(admin)/admin/(work)/venues/[slug]/page.tsx` — la superficie spostata

**Analogo esatto:** la sorella `src/app/(admin)/admin/(work)/venues/page.tsx`
(111 righe, letta oggi). Gli import e la guardia (`:1-6`, `:49-58`):

```ts
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
```

```ts
export default async function AdminVenuesPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09).
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
```

E il paragrafo che questa pagina ha gia' scritto sull'indirizzo (`:19-35`), da
riusare come modello per il docblock della pagina spostata:

```ts
 * ── The address question, which is the one this page has to answer ───────────
 *
 * This page renders `venues.address`, so who passes the gate is a venue question
 * as well as an access one. ... **an organizer already sees these addresses
 * today** ... The audience of `venues.address` is unchanged by the collapse —
 * the address widens, the surface does not.
```

**Da copiare:** la guardia di pagina **in aggiunta** alla riga in
`capability-routes.ts`, con lo stesso commento (middleware e pagina danno lo
stesso verdetto perche' leggono la stessa entry).

**Da NON copiare — P3:** spostare `/venues` **non chiude** la lettura anonima di
`public.venues`. Il route group sceglie l'indirizzo, la RLS decide i dati
(`CLAUDE.md` principio 2). D-37-23 e la policy sono **due lavori distinti, in
due task distinti, con due verifiche distinte**.

**Quattro conseguenze meccaniche dello spostamento**, tutte misurate dalla
ricerca e nessuna automatica:
1. R-WORK-ROUTES: dentro `(work)` solo `page.tsx`/`loading.tsx`. `EditVenueButton`
   e i co-locati restano a `src/app/(admin)/admin/venues/…`.
2. Una riga in `capability-routes.ts` per `/admin/venues/[slug]` (§ 4).
3. **P12** — `scripts/verify-routes.mjs:144` va modificato. La voce di oggi:
   ```js
   ["/venues/[slug]", "the public venue page — src/app/(public)/venues/[slug]/page.tsx, ungated"],
   ```
   dentro una lista il cui docblock (`:130-139`) e' esplicito: *«every entry names
   the file that serves it — verified on disk»*. Lasciarla e' una allow-list che
   dichiara pubblico un indirizzo che non esiste piu'.
4. `events/[slug]/page.tsx:770` linka `/venues/${party.venue.slug}`. Dopo lo
   spostamento quel link porta un visitatore pubblico su un indirizzo che il
   middleware rifiuta. La strada piu' stretta (Open Question 3): **nome come
   testo** per chi non ha la capability.

⚠️ **`next build` non rifiuta da solo** una superficie dinamica senza la sua riga.
La catena e' di tre anelli e **non c'e' CI**: `verify:capabilities` (serve un
database vivo), `next build`, `verify:routes`. Vanno elencati come passi
pre-deploy scritti.

---

### 15. `src/app/sw.ts` — la regola di cache

**Analogo:** le quattro regole della porta, `sw.ts:28-49`, e la riga che le
compone, `:60`:

```ts
runtimeCaching: [...doorRuntimeCaching, ...defaultCache]
```

**Da copiare:** una regola `NetworkOnly` in `doorRuntimeCaching`, **prima** di
`defaultCache` — l'ordine e' load-bearing e il file lo dice gia' (`:28-30`).

**Da dichiarare, non da nascondere:** senza rete, la pagina della serata non si
apre piu' affatto. E' il compromesso corretto in questo dominio, ed e'
l'**opposto** di quello della porta: `checkin-offline.md` vuole che la porta
funzioni senza rete, `venue-secrecy.md` vuole che il venue non si mostri quando
lo stato non e' determinabile. `meta-gates.md`: fra due gate in conflitto vince
il piu' restrittivo, **e il conflitto si documenta nel commit**.

---

### 16. `.claude/rules/venue-secrecy.md` — il gate riscritto (D-37-03)

**Analogo esatto per la forma della riscrittura:** `assignment_acts.sql:110-203`,
che riscrive D-18 invece di cancellarla:

```sql
-- ── WHY THE REWRITE IS A `COMMENT ON COLUMN` AND NOT AN EDIT ────────────────
-- ... So the superseded paragraph stays in that file, where it will keep being
-- read.
--
-- It REPLACES the paragraph ... and it says so, so that a reader who arrives at
-- `:299-312` first is told there is a later one and which of the two governs.
```

**Da copiare:** il gate *autorizzazione per destinatario* va **riscritto**, con
la decisione, la data e il costo che il proprietario ha accettato (piu' persone
conoscono l'indirizzo di quante ne entrano). Non cancellato: cancellare una
regola senza la sua ragione la fa tornare folklore, e qualcuno la «riparera'» fra
sei mesi.

**Nello stesso commit** (`ai-engineering.md`, gate *instruction architecture*):
allargamento dei `paths:` per `src/lib/venue-reveal/**` (P11), coerenza indice ↔
frontmatter in `CLAUDE.md`, voce nel `.claude/CHANGELOG.md` con semver, e
`npm run verify:persona` verde con il nuovo numero di context budget.

---

### 17. Il todo del redirect (piano separato)

**Analogo esatto, e la ricerca dice di estrarlo invece di riscriverlo:**
`src/app/api/auth/callback/route.ts:44-49` (`NEXT_ALLOW_LIST`, quattro pattern
ancorati) e `:52-90` (`resolveNext`, con i cinque rifiuti nominati uno per uno).
**Non ho aperto questo file**: la citazione viene dalla ricerca, che lo dichiara
letto oggi.

**Vincolo d'ordine, dal todo stesso:** oggi il middleware scrive `redirect`
(`src/lib/supabase/middleware.ts:466`) mentre la pagina legge `next`
(`src/app/(auth)/login/page.tsx:11`), quindi la riga non validata non e'
raggiungibile *da quel percorso*. **Prima la allow-list, poi l'allineamento dei
nomi.** Allineare senza aggiungere la allow-list **attiva** l'apertura.

**Da tenere separato nei piani e nei commit** (decisione del proprietario): non
tocca il venue, e mescolarlo significa che nessuno dei due viene guardato per
quello che e'.

---

## Pattern condivisi

### A. La dichiarazione a tre lettori di una capability

**Fonti:** `20260808002000_membership_register.sql:113-131` ·
`src/lib/capabilities/keys.ts:118-119, 159-160` ·
`src/lib/routes/capability-routes.ts:274-277`
**Si applica a:** la tredicesima chiave, in un solo commit.

Tre lettori sulla stessa dichiarazione, per costruzione, perche' non possano
dissentire. Cosa tiene quale anello:

| Anello | Chi lo tiene | Serve un database? |
|---|---|---|
| database ↔ `CAP` | `npm run verify:capabilities` | **si'** |
| `CAP` ↔ `CAP_DESCRIPTIONS` | `next build` (Record totale) | no |
| `CAP` ↔ `capability-routes.ts` | `next build` (`satisfies` totale) | no |
| mappa ↔ pagine su disco | `npm run verify:routes` | no |

### B. La server action autorizzata che rifiuta per valore

**Fonti:** `src/app/(admin)/admin/formats/actions.ts:26-63, 89-106, 645-684` ·
`src/app/(admin)/admin/events/[id]/assignments/actions.ts:255-333`
**Si applica a:** ogni action nuova di questa fase.

1. Gate non esportato, chiamato **per primo in ogni export**.
2. `partyId` validato come uuid prima di raggiungere il database.
3. Ritorno `{ ok: true, … } | { ok: false; reason: <unione> }`.
4. `catch`/`switch` su `error.code`, **mai** su `error.message`.
5. Log: `error.code` e `error.message`. **Mai** l'oggetto, **mai** `error.details`.
6. `revalidatePath` su ogni superficie toccata.

### C. Lo scrittore atomico riga+atto

**Fonte:** `supabase/migrations/20260809002000_assignment_acts.sql:244-496`
**Si applica a:** la scrittura di `venue_revealed_at` + la traccia, e al
ri-nascondere.

`SECURITY DEFINER` + `SET search_path = ''` + rifiuti argomentali per primi +
`SELECT … FOR UPDATE` + `REVOKE` **poi** `GRANT` a `service_role` +
`COMMENT ON FUNCTION`. L'attore e' un **argomento**: sotto il service client
`auth.uid()` e' null.

### D. La tabella append-only per costruzione

**Fonte:** `supabase/migrations/20260808002000_membership_register.sql:162-350`
**Si applica a:** la traccia di D-37-17/18/22.

RLS abilitata + **una** policy `SELECT` con `(select private.has_capability(…))`
+ **nessuna** policy di scrittura, e il paragrafo che dice che l'omissione e' il
meccanismo. `ON DELETE SET NULL` con etichetta denormalizzata accanto.

### E. Zero fallimenti silenziosi, senza error tracking

**Fonti:** `src/lib/capabilities/server.ts:32-46` ·
`RetireFormatDialog.tsx:180-216` · `meta-gates.md`
**Si applica a:** ogni percorso d'errore nuovo.

Una frase per causa, mai un secchio; il `default` **stampa il valore del
rifiuto** invece di prendere in prestito una frase scritta per altro. Un log non
e' un effetto osservabile: non esiste error tracking, quindi un fallimento che
conta deve essere visibile a chi ha premuto.

### F. La guardia di pagina dentro `(work)`

**Fonte:** `src/app/(admin)/admin/(work)/venues/page.tsx:49-58`
**Si applica a:** la pagina venue spostata.

`getAccessContext()` (`cache()`-scoped dal layout) + `capabilities.has(CAP.…)` +
`redirect("/dashboard")`. La riga in `capability-routes.ts` e la guardia dicono
la stessa cosa perche' leggono la stessa entry.

### G. Un solo posto per una regola temporale

**Fonte:** `src/utils/datetime.ts:69-72, 96-102`
**Si applica a:** la costante 25 e la sua applicazione.

Si esporta **la funzione**, non solo la costante. Un fallback ripetuto in due
file e' due siti dove si puo' divergere — e il file racconta di sei varianti nate
esattamente cosi'.

---

## Nessun analogo trovato

| File | Ruolo | Flusso | Ragione |
|---|---|---|---|
| Il bottone a tre stati (posizione unica, testo che cambia sul residuo, spento con data e nome) | componente client | stato derivato | Nessun bottone del repo si spegne **nominando la ragione**. `FormatsCatalogue.tsx:301` disabilita per *occupato*, non per *gia' fatto da chi, quando*. Il cablaggio del dialogo si copia (`:184, 322, 418`); la macchina a stati si progetta |
| Il modulo di rivelazione condiviso da un cron e da una server action | modulo condiviso | batch / email | `src/lib/media/may-upload.ts` e' l'unico modulo con due chiamanti (server action + route handler), ma e' un **predicato di autorizzazione**, non un esecutore con effetti esterni. Nessun modulo del repo spedisce email per conto di due chiamanti: i quattro cron importano `@/lib/email` direttamente (`getResend`) e nessun altro percorso lo condivide con loro |
| Il conteggio «quanti su quanti» esposto a chi ha premuto | server action / UI | request-response | Nessuna superficie del repo restituisce oggi un invio parziale. Il cron somma `emails.length` in modo **ottimista** (`route.ts:149`) e non distingue consegnato da tentato |

---

## Metadata

**Perimetro della ricerca degli analoghi:** `supabase/migrations/`,
`src/lib/{capabilities,routes,media,door,guest-list}/`,
`src/app/(admin)/admin/{formats,events,venues}/`,
`src/app/(admin)/admin/(work)/`, `src/app/(public)/{events,venues}/`,
`src/app/api/cron/`, `src/utils/`, `scripts/`.

**File aperti e letti oggi (ogni citazione viene da qui):**
`20260809002000_assignment_acts.sql` (intero) ·
`20260808002000_membership_register.sql` (`:1-60`, `:61-139`, `:140-359`, `:425-495`) ·
`20260807000000_capability_model.sql` (`:160-229`, `:370-425`) ·
`20260226200000_venues.sql` (intero) ·
`src/lib/capabilities/keys.ts` (intero) · `src/lib/capabilities/server.ts` (`:1-80`) ·
`src/lib/routes/capability-routes.ts` (`:100-169`, `:240-339`) ·
`src/utils/datetime.ts` (intero) ·
`src/app/api/cron/venue-reveal/route.ts` (intero) ·
`src/app/(admin)/admin/formats/RetireFormatDialog.tsx` (intero) ·
`src/app/(admin)/admin/formats/actions.ts` (`:1-160`, `:625-704`) ·
`src/app/(admin)/admin/events/[id]/assignments/actions.ts` (`:255-334`) ·
`src/app/(admin)/admin/events/actions.ts` (`:405-430`) ·
`src/app/(admin)/admin/(work)/venues/page.tsx` (`:1-60`) ·
`src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx` (`:1-70`, `:230-302`) ·
`src/app/(public)/events/[slug]/page.tsx` (`:80-124`, `:676-705`, `:760-789`) ·
`src/app/(public)/events/[slug]/SecretVenueDialog.tsx` (intero) ·
`src/app/(public)/events/page.tsx` (`:196-225`, `:255-289`) ·
`src/app/(public)/events/EventTabs.tsx` (`:8-20`, `:244-262`) ·
`src/app/(public)/venues/[slug]/page.tsx` (`:30-79`) ·
`src/lib/media/may-upload.ts` (`:1-60`) · `scripts/verify-routes.mjs` (`:124-153`).

**Non aperti — dichiarato:** `src/app/api/auth/callback/route.ts`,
`src/app/(auth)/login/page.tsx`, `src/lib/supabase/middleware.ts`, `src/app/sw.ts`,
`20260807020000_wrap_auth_uid.sql`, `20260805120000_door_scan_events.sql`,
`20260810120000_formats_and_series.sql`. Le loro citazioni vengono dalla
37-RESEARCH.md, che le dichiara lette il 2026-08-10, o dai commenti dei file che
ho aperto.

**Data della mappatura:** 2026-08-10
**Scritture effettuate:** una sola, questo file. Nessuna modifica al codice di
prodotto, nessuna migration eseguita, nessun accesso in scrittura al database.
