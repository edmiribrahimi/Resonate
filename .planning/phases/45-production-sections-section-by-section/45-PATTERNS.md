# Phase 45: Production Sections, Section by Section — Pattern Map

**Mapped:** 2026-08-17
**Files analysed:** 36 (new or modified), grouped into 11 pattern families
**Analogs found:** 33 / 36 — **3 have no analog and are named as such in §No Analog Found**

---

## Read this first — two constraints on how this document may be used

**(a) This file is a publication.** `.planning/` is tracked and
`github.com/edmiribrahimi/Resonate` is public. Every excerpt below comes from a
**tracked source file** and carries its `file:line`. No venue name, no address,
no unannounced date, no line-up, no score and no contact appears here, and no
row of `docs/scouting-2026-08-17.json` was copied into it. That file is named as
a **path with a field shape** (already recorded in `45-CONTEXT.md`
`<code_context>`) and never as content.

**(b) Nothing here was read from `.planning/codebase/`.** That directory is
dated 2026-02-24 and is partly wrong (`ai-engineering.md`, *gate documentazione
datata*). Every line number below was read from the tree on 2026-08-17.

**(c) The strongest analog set is Phase 44, and the key insight is the
research's:** *almost nothing in this phase is a new mechanism.* Phase 44 walked
the whole section binding once — capability row → grants → RLS → route map →
tab → page — and Phase 41 built the visual layer. Phase 45's genuinely new
artefacts are **three**, and all three are in §No Analog Found.

---

## File Classification

### Family A — the access rewrite (D-45-04). The phase's only edit to something live.

| New/Modified file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `supabase/migrations/<ts>_production_section_keys.sql` (NEW, additive) | migration / access | declarative DDL + seed | `supabase/migrations/20260815120100_production_calendar_access.sql` | **exact** |
| `supabase/migrations/<ts>_production_read_retire.sql` (NEW, retirement) | migration / access | declarative DDL | `20260815120200_production_checklist_tick_revoke.sql` (the *correction travels forward* precedent) | role-match |
| `src/lib/capabilities/keys.ts` (MODIFY) | config / declaration | none (const) | itself, `keys.ts:110-159` — the fourteenth key's own precedent | **exact (self)** |
| `src/lib/routes/capability-routes.ts` (MODIFY) | config / routing map | request-response (read by middleware) | itself, `capability-routes.ts:530-598` | **exact (self)** |
| `src/lib/routes/staff-tabs.ts` (MODIFY) | config / navigation | none (const + module-load assertion) | itself, `staff-tabs.ts:132-153` (the Calendar tab) | **exact (self)** |
| `scripts/verify-capabilities.mjs` (MODIFY) | test / source-assertion | catalogue read | itself, `verify-capabilities.mjs:200`, `:500-549` | **exact (self)** |

### Family B — the section tables (D-45-10 … D-45-16, D-45-21)

| New/Modified file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `<ts>_production_location.sql` — `production_space`, `production_space_score` | migration / model | declarative DDL | `20260815120000_production_calendar.sql:168-305` (`production_plan`) and `:395-466` (`production_piece`) | **exact** |
| `<ts>_production_sections.sql` — `production_section`, `production_open_question` | migration / model | declarative DDL | same | **exact** |
| `<ts>_production_sections_access.sql` — RLS on the four | migration / access | declarative DDL | `20260815120100_*_access.sql:140-284` | **exact** |
| `src/types/database.ts` (MODIFY — 4 row interfaces) | model / types | none | `src/types/database.ts:1177-1260` (`ProductionPlan`) | **exact** |
| `src/lib/production/sections/vocabulary.ts` (NEW) | utility / vocabulary | none | `src/lib/production/ics/vocabulary.ts:177-247` | **exact** |

### Family C — the work surfaces (R-WORK-ROUTES)

| New/Modified file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `(work)/location/page.tsx`, `(work)/location/[id]/page.tsx` | route / RSC | request-response (cookie-bound read) | `src/app/(admin)/admin/(work)/calendar/page.tsx` and `[id]/page.tsx` | **exact** |
| `(work)/manifesto/page.tsx`, `(work)/visual/page.tsx` | route / RSC | request-response | same | **exact** |
| `(work)/{location,manifesto,visual}/loading.tsx` | route / placeholder | none | `(work)/calendar/loading.tsx` | **exact** |
| `admin/location/SpaceList.tsx` | component / presentation | none (props in) | `admin/calendar/CalendarList.tsx` (+ `StageBadge.tsx`) | **exact** |
| `admin/location/ScoreCell.tsx` (score + provenance, D-45-11) | component / presentation | none | `admin/calendar/PieceDate.tsx` — the *bare value is unrepresentable* union | **exact** |
| `admin/manifesto/SectionStateBadge.tsx` (three states, D-45-14) | component / presentation | none | `admin/calendar/StageBadge.tsx` | **exact** |
| `admin/visual/PaletteSwatches.tsx` (D-45-09, D-45-16) | component / presentation | none | `admin/formats/ColorSwatchPicker.tsx` (a **named exemption** in two gates) | role-match |
| stage badge reuse | component | none | `admin/calendar/StageBadge.tsx` — **reuse or relocate, never write a second** | **exact** |

### Family D — the writes (D-45-05, D-45-06, D-45-18)

| New/Modified file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `admin/location/actions.ts` | service / Server Action | CRUD (write) | `src/app/(admin)/admin/calendar/actions.ts` | **exact** |
| `admin/manifesto/actions.ts`, `admin/visual/actions.ts` | service / Server Action | CRUD (write) | same | **exact** |
| `admin/location/PromoteSpaceDialog.tsx` + its action arm (D-45-10) | component + service / bridge act | request-response, one-way bridge | `admin/calendar/AnnounceNightDialog.tsx` + `announceNight` (`actions.ts:598-932`) | **exact** |

### Family E — the export (D-45-17) and the upload (D-45-08)

| New/Modified file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `src/lib/production/export/manifesto.ts`, `capitolato.ts` | service / serialisation | transform → leaves the product | **none** (see §No Analog Found #2) | ✗ |
| `src/lib/production/export/tokens.ts` (parse `:root` at runtime, D-45-09) | utility / transform | file-I/O | `scripts/verify-semantic-separation.mjs:190-215`'s `:root` reader — a **script**, not a runtime module | partial |
| `src/lib/media/may-upload.ts` (MODIFY — second predicate) | middleware / guard | request-response | itself, `may-upload.ts:1-73` | **exact (self)** |
| `admin/visual/ArchiveUpload.tsx` + finalize arm | component + route / file-I/O | file-I/O via quarantine | `src/components/media/MediaUpload.tsx` + `src/app/api/media/finalize/route.ts` | **exact** |
| `<ts>_visual_archive_bucket.sql` (if a third bucket is chosen — Open Q 6) | migration / storage | declarative DDL | `20260809004600_event_media_quarantine_bucket.sql` + `20260809006000_event_media_server_upload_only.sql` | **exact** |

### Family F — the scripts

| New/Modified file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `scripts/seed-production-spaces.mjs` (D-45-07) | script / import | file-I/O → batch write | `scripts/import-production-calendar.mjs` | **exact** |
| `scripts/verify-section-surface.mjs` | test / source-assertion | file-I/O | `scripts/verify-calendar-surface.mjs` | **exact** |
| `scripts/verify-section-export.mjs` (D-45-17's proof) | test / source-assertion + closure walk | file-I/O | `scripts/verify-conversion.mjs:792-824` (`importClosure`) + `verify-calendar-surface.mjs`'s report shape | role-match |
| `scripts/verify-refusal.mjs` (D-45-19) | test / **authenticates as a role** | request-response over PostgREST | **none in-tree** (see §No Analog Found #3) | ✗ |
| `scripts/verify-all.mjs` (MODIFY — a fourth list) | config / aggregate | process spawn | itself, `verify-all.mjs:274-299` | **exact (self)** |
| `package.json` (MODIFY — 3 `verify:*` entries) | config | none | `package.json:10-30` | **exact (self)** |

### Family G — the written procedures

| New/Modified file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `45-PROCEDURES.md` | doc / manual gate | human | `.planning/phases/44-…/44-PROCEDURES.md` | **exact** |

---

## Pattern Assignments

### A1. `<ts>_production_section_keys.sql` (migration, access — **BLOCKING**)

**Analog:** `supabase/migrations/20260815120100_production_calendar_access.sql` —
read in full. It is the file D-45-04 rewrites, so it is both the analog and the
subject.

**The transaction wrapper and the *why one transaction* paragraph** (`:16-22`,
`:52`, `:570`) — copy the reasoning, not just the `BEGIN`:

```sql
-- WHY ONE TRANSACTION. A half-applied version of this file is worse than none of
-- it. The capability row without its grants resolves FALSE for everyone
-- (including the master) …
BEGIN;
…
COMMIT;
```

**The capability row, with `ON CONFLICT (key) DO NOTHING`** (`:76-81`). Note the
description string is **byte-identical** to `CAP_DESCRIPTIONS[…]` in `keys.ts`
(stated at `:58-65`), and the two are written in one commit:

```sql
INSERT INTO private.capabilities (key, description) VALUES
  (
    'production.read',
    'Read the production calendar: … requires_approved is FALSE on both grants (D-44-27, the owner) … That is a BET on the signup path staying closed: reopen a path that can create a pending organizer and this flag is reconsidered in the same commit.'
  )
ON CONFLICT (key) DO NOTHING;
```

> **D-45-20 inherits that bet verbatim.** Carry the sentence *"That is a BET on
> the signup path staying closed"* into each of the three new keys' descriptions.

**The grants, with the four ⚠ paragraphs that must travel** (`:83-115`):

```sql
INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  -- ⚠ `requires_approved = false`, AND IT IS THE OWNER'S CALL, NOT THE PLANNER'S.
  -- ⚠ AND IT IS A BET, written down here rather than left to be discovered …
  -- ⚠ It must NOT be defended by pointing at `door.operate` or `staff.manage`.
  --   Those two carry `false` to keep a person from being refused IN FRONT OF A
  --   QUEUE, and nobody is standing in a queue in front of a production calendar.
  ('master',    'production.read', false),
  ('organizer', 'production.read', false)
ON CONFLICT (role, capability) DO NOTHING;
```

**The declared refusals, as prose plus where they are asserted** (`:117-138`):

```sql
-- ⚠ TWO ROLES ARE REFUSED, AND THE REFUSAL IS AN ABSENCE OF A ROW.
--   `staff`  — refused. … This key is also NOT one of the four a per-night
--              assignment may carry (`20260809000000_party_assignments.sql:340-342`)
--   `member` — refused. Nothing grants it.
--   `anon`   — refused by construction: `private.has_capability` answers false
--              for a null `auth.uid()` (`20260807000000_capability_model.sql:55-57`).
-- WHERE THOSE REFUSALS ARE ASSERTED … `scripts/verify-capabilities.mjs`, side 5.
```

**The policy arm — and the `(SELECT …)` wrapper is load-bearing** (`:176-181`,
reasoning at `:154-160`). Rewritten six times for the calendar's section key,
plus once per new table:

```sql
ALTER TABLE public.production_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_plan_select_production_read ON public.production_plan;

CREATE POLICY production_plan_select_production_read ON public.production_plan
  FOR SELECT USING ((SELECT private.has_capability('production.read')));
```

> ⚠ **P4 of the research:** a rewritten policy whose `qual` in `pg_policies` no
> longer begins `( SELECT ` has lost the InitPlan. `STABLE` does not do it —
> `20260807000000_capability_model.sql:177-184` records that `EXPLAIN` disproved
> that belief, and 26 policies in this repo were written unwrapped on its strength.

**The uniformity paragraph — copy it for every "harmless" new table** (`:236-244`):

```sql
-- It gets the SAME arm as the other five anyway, and the uniformity is deliberate.
-- A single table readable without the key would be the one somebody joins the
-- others onto — and the reasoning *this table is harmless on its own* is how a
-- read path is opened by degrees.
```

**The paragraph declaring the absent write policies a decision** (`:253-284`) —
D-45-04 must carry it across **verbatim in substance**, not delete it. It also
names the five other tables that omit write policies on purpose, and it ends
with the sentence a planner needs most:

```sql
-- WHAT THIS DOES NOT CLAIM. **The service client is not a boundary; it is the
-- absence of one.** What decides WHO may write a calendar row is the guard
-- inside the server action … Saying so here is not the same as enforcing it here.
```

**And the four rejected reuses** (`keys.ts:118-143`), each with the *direction*
of its mistake, must be restated for the four section keys. A rewrite that
carries the policies and drops the reasons is how the next reader "repairs" the
gap with one `CREATE POLICY`.

---

### A2. `<ts>_production_read_retire.sql` (migration, access — the second half)

**Analog:** `supabase/migrations/20260815120200_production_checklist_tick_revoke.sql`
— 60 lines, and the smallest complete example in the repo of *a correction that
travels forward*.

**Its whole header is the pattern for a small, separate, auditable migration**
(`:5-42`):

```sql
-- The applied migration is NOT edited: its content is already in the project's
-- migration history, and rewriting a file that has been applied makes the
-- history a description of something that never ran. The correction travels
-- forward, which is the same discipline this project applies to a payment that
-- reconciles: correct ahead, never pretend backwards.
--
-- IDEMPOTENT: REVOKE of an absent privilege and GRANT of a present one are both
-- no-ops. Running this twice changes nothing the second time.
--
-- NO MATERIAL: this file carries no venue, no date and no line-up.
```

**And the REVOKE-then-GRANT pair, two statements, in that order** (`:46-52`) —
which **any new `SECURITY DEFINER` function this phase adds inherits**, because
Postgres grants EXECUTE to PUBLIC by default:

```sql
-- REVOKE first, GRANT second, as two statements and in this order
REVOKE ALL ON FUNCTION public.record_checklist_tick(uuid, boolean, uuid, text)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_checklist_tick(uuid, boolean, uuid, text)
  TO service_role;
```

**Removal is by key** (`ai-engineering.md`, *gate una rimozione si fa per
chiave*): `DELETE … WHERE key = 'production.read'` and
`WHERE (role, capability) = (…)`. **Never** a `LIKE 'production%'` selector —
after this phase that pattern matches the four new keys.

---

### A3. `src/lib/capabilities/keys.ts` (config, declaration)

**Analog: itself.** `keys.ts:110-159` is the docblock plan 44-04 wrote for the
fourteenth key, and it is the template for each of the three new ones plus the
calendar's rename.

**Three things the compiler holds, named at `:214-236`:**

```ts
/**
 * Typed as a **total** `Record` over the union on purpose … adding a fifteenth key to
 * `CAP` without a description here is a `npm run build` error, and removing a
 * key leaves an unreachable entry that is also an error.
 *
 * **The compiler holds a SECOND part** … `CAPABILITY_ROUTES` … is
 * `as const satisfies Record<CapabilityKey, Binding>`, so a key added here
 * with no entry there is also a build error.
 *
 * It cannot hold the other part — that these strings match the … rows in
 * `private.capabilities`. That is `scripts/verify-capabilities.mjs`'s job, and
 * that check needs a live database: it is RED between the commit that adds a key
 * here and the deploy that applies the migration adding the row.
 */
```

**The naming rule the four section keys must satisfy** (`:38-45`):

```ts
 * ── Named by the question, not by the predicate ──────────────────────────────
 * Three of these fourteen resolve to the same predicate today … They are
 * deliberately three keys and not one, because they are three different
 * questions … a key named after its predicate makes that impossible.
```

The `CAP` member and its one-line comment (`:205-209`) and the
`CAP_DESCRIPTIONS` entry (`:262-263`) are the two edits per key, and the
description must equal the migration's string byte for byte.

---

### A4. `src/lib/routes/capability-routes.ts` (config, routing map)

**Analog: itself.** The `PRODUCTION_READ` entry and its docblock,
`capability-routes.ts:530-597`, is the entry D-45-04 splits into four.

**The entry shape** (`:594-597`):

```ts
  [CAP.PRODUCTION_READ]: {
    routes: ["/admin/calendar", "/admin/calendar/[id]"],
    alsoGatesTables: true,
  },
} as const satisfies Record<CapabilityKey, Binding>;
```

**`alsoGatesTables` is optional on that branch, so omitting it is silent**
(`:158-166`) — the count in that comment is `six of the fourteen`, measured
2026-08-15, and **it moves in this phase**:

```ts
      /**
       * True when the key ALSO gates rows. **Six of the fourteen do**, counted
       * on 2026-08-15 rather than remembered.
       * … A count in a comment is a claim nothing checks, and the flag is
       * optional on this branch, so the one mistake it invites is the one
       * D-34-11 names: leaving it off and producing no error at all.
       */
      alsoGatesTables?: true;
```

**The ambiguity paragraph must be re-derived, not inherited** (`:553-569`). Four
new static `/admin/<section>` addresses go in; the loop at the foot of the file
throws **at module load inside a middleware bundle**:

```ts
 * ⚠ That check is worth the paragraph because of WHEN it fires. The throw at
 * the foot of this file runs at **module load inside a middleware bundle**, not
 * at `npm run build` — so a tie is not a broken page, it is a 500 on every
 * route the middleware covers, the payments webhook and the door's scan path
 * included. Which is why the deploy rule stands: ship on a day without a night,
 * and make the first request yourself.
```

Run `node scripts/verify-routes.mjs --print-patterns` **before** choosing the
four addresses. Pending todo `module-load-throws-500-the-whole-middleware-surface.md`
is about this exact file.

**And the backward assertion cannot see a dynamic route** (`:604-651`) — so
`/admin/location/[id]` is invisible to `next build`; `npm run verify:routes` is
what sees it.

---

### A5. `src/lib/routes/staff-tabs.ts` (config, navigation)

**Analog: itself**, `staff-tabs.ts:132-153` (the Calendar entry) and `:173-198`
(the module-load loop).

**The tab lands in a LATER plan than the page** (`:108-131`, restated at
`:132-140`) — `StaffTab.href` is `Route`, and a static address enters the
generated union only once a `page.tsx` serves it. **The two workarounds are
rejected in writing at `:117-126` and stay rejected.**

**The entry, with the *hiding protects nothing* paragraph — copy it per
section** (`:141-153`):

```ts
  // **Hiding this tab protects nothing** … What this surface holds IS the secret
  // … Three things refuse a door-assigned staff account, and none of them is the
  // absence of a link: the middleware entry for `production.read`, the page's own
  // guard, and the six RLS policies …
  { href: "/admin/calendar", label: "Calendar", capability: CAP.PRODUCTION_READ },
```

**The module-load assertion — two failures, two sentences** (`:179-198`):

```ts
for (const tab of DECLARED) {
  const resolution = resolveRoute(tab.href);
  if (resolution === null) { throw new Error(`staff-tabs: the "${tab.label}" tab points at "${tab.href}", which no entry of CAPABILITY_ROUTES binds. …`); }
  if (resolution.key !== tab.capability) { throw new Error(`staff-tabs: the "${tab.label}" tab claims "${tab.capability}" opens "${tab.href}", but CAPABILITY_ROUTES binds that address to "${resolution.key}" …`); }
}
```

---

### A6. `scripts/verify-capabilities.mjs` (test, source + catalogue assertion)

**Analog: itself.** The pre-registered expectation is four constants and a
declaration, and **the plan must move all of them in the same commit as
`keys.ts`**.

**The key count and its instruction** (`verify-capabilities.mjs:190-200`):

```js
 * **If this trips, look at the capability model, not at this constant.**
 * Fifteen keys means a capability was added — which is a design decision that
 * belongs in a plan, with a grant row and a policy or a route to go with it.
 *
 * Moved from 13 to 14 by plan 44-04 (`production.read`) …
const EXPECTED_KEY_COUNT = 14;
```

**The refusal declaration — side 5, and this is where the new keys' `staff` and
`member` refusals belong** (`:500-546`, the shape):

```js
    // Refused, plan 44-04. A member holding this key would read every
    // unannounced date and every space under negotiation the moment it was
    // typed. `PROJECT.md` says the gating mechanism IS the product …
    'production.read': 'REFUSED',
```

**The arithmetic, and the sentence about lowering it** (`:500-549`):

```js
 * Lowering a total to make a run pass is the failure this constant exists to
 * catch, and it has a recorded shape: mutation C of plan 43-02 did exactly that
 * in two steps and was caught by assertion 4 after slipping past the arithmetic.
const EXPECTED_PAIR_COUNT = 56;
const EXPECTED_GRANT_COUNT = 30;
const EXPECTED_REFUSAL_COUNT = 26;
```

After the split: `17 / 68 / 36 / 32`. **The gate is RED in two intervals** —
between migration 1 and the deploy, and between the deploy and migration 2. The
plan says so **in advance**, per `45-RESEARCH.md` §A5.

---

### B1. `<ts>_production_location.sql` and `<ts>_production_sections.sql` (migration, model)

**Analog:** `supabase/migrations/20260815120000_production_calendar.sql` — read
`:168-305` (`production_plan`) and `:395-466` (`production_piece`).

**Every constraint declared INSIDE the `CREATE TABLE`** (`:168-288`), never
`DROP CONSTRAINT IF EXISTS` + `ADD`:

```sql
CREATE TABLE IF NOT EXISTS public.production_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  …
  CONSTRAINT production_plan_source_uid_unique UNIQUE (source_uid),
  CONSTRAINT production_plan_venue_stage_check
    CHECK (venue_stage IS NULL OR venue_stage IN ('mapped', 'verified', 'contacted', 'acquired'))
);
```

**Where a constraint must be added to an existing table, the `DO` block form**
(`:827-848`) — and the reason, which is measured:

```sql
-- The `DO` form, and NOT `DROP CONSTRAINT IF EXISTS` + `ADD`: measured at
-- `20260809000000:200-226`, `IF EXISTS` suppresses *"it does not exist"*, not
-- *"something depends on it"*, so a second run can fail `2BP01` with the
-- transaction in rollback. There is no `ADD CONSTRAINT IF NOT EXISTS` in
-- Postgres — hence the block.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '…' AND conrelid = 'public.…'::regclass) THEN
    ALTER TABLE public.… ADD CONSTRAINT … ;
  END IF;
END;
$$;
```

**The ⚠ banner every "name of a space" column carries** (`:227-237`) —
`production_space.name` is exactly this column, one table over:

```sql
  -- ⚠ INTERNAL, NEVER PUBLIC. The venue word exactly as the calendar writes it.
  --
  -- It is a COLUMN and not a string in a tracked file precisely because it may
  -- name a space that is under negotiation, and `venue-acquisition.md`'s gate
  -- *uno spazio non acquisito non si nomina* makes writing such a name into a
  -- public repository an act that cannot be undone. The column is public; the
  -- values arrive at runtime and stay behind section 0.
  --
  -- No surface that an unauthenticated visitor can reach may render it, and no
  -- diagnostic, log line, error message or `.planning/` document may echo it.
  venue_word text,
```

**⚠ D-45-21 gives `production_space.address` this banner *and one more clause*:**
`production_plan.venue_word` is a **word**; the scouting column is a **street
address**, which is the payload `venue_for_parties` exists to release
deliberately. See §D3 below for the structural half.

**The stage column, and the divergence a planner must state rather than copy**
(`:244-253`):

```sql
  -- NULL MEANS NOT RECORDED, AND IT IS NEVER READ AS `acquired`. The calendar
  -- entry carries no stage, so the import must NOT infer one … A stage is filled
  -- by hand, or by Phase 45's scouting section.
  venue_stage text,
```

`production_plan.venue_stage` is **nullable**. `production_space.stage` is
`NOT NULL DEFAULT 'mapped'` — a row exists only because somebody mapped it. Say
why the two differ, in the new file, or the next reader reads it as an accident.

**The XOR shape, for D-45-13's `exited_at` / `exit_reason`** (`:433-440`):

```sql
  -- EXACTLY ONE of a date and a reason. A piece with neither is a row that says
  -- nothing; a piece with both is a row that says two things and lets the
  -- surface pick. `<>` on two booleans is XOR …
  CONSTRAINT production_piece_date_xor_reason
    CHECK ((date IS NULL) <> (unresolved_reason IS NULL)),
```

**The conditional-requirement shape, for D-45-12's mandatory evidence line and
for D-45-14's `missing` / `decision_owner`** (`:442-449`):

```sql
  -- A PROPOSAL CANNOT PRETEND TO COME FROM THE FILE. Together with the XOR
  -- above, this makes the dangerous row … UNREPRESENTABLE rather than merely
  -- discouraged. That is the difference between a rule and a guarantee …
  CONSTRAINT production_piece_proposal_has_no_source
    CHECK (origin <> 'proposed' OR source_uid IS NULL)
```

**A named `COMMENT ON CONSTRAINT` where the constraint carries a decision**
(`:452-455`) — the nullable-unique explanation is the model for
`production_space_score`'s `UNIQUE (space_id, format_id)`.

**Indexes on the columns actually read, each with its read named** (`:290-301`),
and **the absence of a uniqueness stated as a decision** (`:302-304`).

**RLS enabled in the STRUCTURAL migration, with zero policies** (`:305`,
explained at `20260815120100:28-33`). This is how Phase 44 reconciles
`supabase-data.md`'s *gate tabella nuova = policy nuova* with a two-file split:
the tables are **closed from the moment they exist**, and the access file adds
the arms. Copy that pairing, and copy the sentence that explains it.

**A monotone guard is a TRIGGER, not a caller check** (`20260815120100:328-355`)
— relevant if the plan decides `stage` may not move backwards, or that
`promoted_venue_id` is write-once:

```sql
-- WHY A TRIGGER AND NOT A CHECK IN THE IMPORTER … This trigger is the backstop
-- for the caller that forgets: a guard in the database survives the caller that
-- forgot it, and a guard in application code does not.
CREATE OR REPLACE FUNCTION public.refuse_production_plan_renumber()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF OLD.number IS NOT NULL AND NEW.number IS DISTINCT FROM OLD.number THEN
    RAISE EXCEPTION 'production_plan.renumber_refused: %', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
```

**And what the raised message carries** (`:316-319`): *the plan's `id`, and
nothing else. Never `venue_word`, never the title, never the date. A raised
message reaches a log, and a log reaches a screenshot, on a repository that is
public.*

---

### B2. `src/types/database.ts` (model, types)

**Analog:** `src/types/database.ts:1177-1260` (`ProductionPlan`). Prose on the
row type, not just the shape — and the ⚠ banner is repeated on the TS side
(`:1229-1238`):

```ts
  /**
   * ⚠ **INTERNAL, NEVER PUBLIC.** The venue word exactly as the calendar writes
   * it, which may name a space under negotiation.
   *
   * No surface an unauthenticated visitor can reach may render it, and no
   * diagnostic, log line, error message or `.planning/` document may echo it.
   */
  venue_word: string | null;
```

And the *null is not a value* discipline (`:1240-1246`):

```ts
  /**
   * How far the space actually is. **Null means NOT RECORDED and is never read
   * as `acquired`** … An inferred *acquired* would arrive with the authority of a
   * database column, and it is exactly the harm `venue-acquisition.md` names.
   */
  venue_stage: VenueStage | null;
```

`src/types/database.ts` carries **no** occurrence of a capability key — it
imports `CapabilityKey` from `keys.ts` (`keys.ts:5-8` states the direction).
D-45-04's constraint 4 names it because the section row types land there in the
same commit, not because a key lives there.

---

### B3. `src/lib/production/sections/vocabulary.ts` (utility, vocabulary)

**Analog:** `src/lib/production/ics/vocabulary.ts:177-247`.

**A closed vocabulary as an `as const` tuple + a derived type, mirrored by a
named SQL CHECK** (`:177-195`):

```ts
/**
 * How far a space has got. Four different things, in order, and the vocabulary
 * is already public in `venue-acquisition.md` — *mapped ≠ verified ≠ contacted ≠
 * acquired*.
 *
 * The gate that makes this column worth having: **acquired means in writing** …
 */
export const VENUE_STAGES = ["mapped", "verified", "contacted", "acquired"] as const;

/** How far a space has got. Mirrored by the `venue_stage` CHECK. */
export type VenueStage = (typeof VENUE_STAGES)[number];
```

**⚠ Reuse `VENUE_STAGES` rather than declaring a second copy.** The scouting
stage vocabulary is the same four words. `StageBadge.tsx:3` already imports
`VenueStage` from this module. A second tuple is a second thing to keep in sync
with one CHECK.

**The total-`Record` label map, which the compiler holds** (`:227-247`):

```ts
 * Typed as a **total** `Record` over the union on purpose … a seventh kind added
 * to `PIECE_KINDS` without a label here is a `npm run build` error, and a label
 * for a kind that no longer exists is an error too.
export const PIECE_KIND_LABELS: Record<PieceKind, string> = { … };
```

The three new vocabularies — `SECTION_STATES`
(`written` / `coordinates_declared` / `not_decided`), `EXIT_REASONS`,
`SCORE_PROVENANCE` — each take this shape, and the migration's CHECK is written
in the same commit (`20260815120000:281-287` states that rule).

---

### C1. `(work)/{location,manifesto,visual}/page.tsx` (route, RSC)

**Analog:** `src/app/(admin)/admin/(work)/calendar/page.tsx`.

**Where the files go (R-WORK-ROUTES, `nextjs-architecture.md`):** route files
inside `(work)`; every co-located Server Action and client component **one level
out**, at `src/app/(admin)/admin/<section>/…`, imported with the absolute
specifier `@/app/(admin)/admin/…`. The calendar walked it exactly:

```
src/app/(admin)/admin/(work)/calendar/page.tsx          route
src/app/(admin)/admin/(work)/calendar/loading.tsx       route
src/app/(admin)/admin/(work)/calendar/[id]/page.tsx     route
src/app/(admin)/admin/calendar/actions.ts               action     ← one level out
src/app/(admin)/admin/calendar/CalendarList.tsx         component  ← one level out
src/app/(admin)/admin/calendar/StageBadge.tsx           component
src/app/(admin)/admin/calendar/AnnounceNightDialog.tsx  component
```

**The page guard, and why it exists beside the middleware** (`page.tsx:103-113`):

```tsx
export default async function AdminCalendarPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09), and a page that stops asking is a page protected by a
  // redirect alone.
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_READ)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
```

**⚠ The read goes through the COOKIE-BOUND client, deliberately** (`:60-73`) —
this is the sentence criterion 4 rests on:

```tsx
 * **Which is why every read below goes through the cookie-bound client**, and why
 * this file constructs no service client. A read that bypasses the policy proves
 * nothing about the policy … A page that fetched with the service key would render
 * identically for a subject the database would have refused — the exact shape of
 * a feature protected by a redirect alone.
```

**Every embed checked against its foreign keys, in a comment** (`:117-142`) — P7
of the research: an ambiguous embed is `PGRST201` and **fails silently through
this client**, `data` null with nothing thrown:

```tsx
    So each of the four embeds below was checked against
    `20260815120000_production_calendar.sql` rather than assumed:

      production_plan → formats                 one FK, `format_id`
      …
    and no junction table carries foreign keys to both sides of any of the four
```

`production_space_score → production_space` and `→ formats` each need this
paragraph written from the new migration, not assumed.

**And the venue word does not leave the render** (`:93-101`) — the same
paragraph, with `address` substituted, is mandatory on the location page:

```tsx
 * `production_plan.venue_word` may name a space under negotiation … It travels
 * from the query into a table cell and nowhere else: it is in no `console.*`, no
 * thrown message, no page title, no analytics call and no `aria-label`. The same
 * rule is why the failure branch below logs `error.code` and `error.message` and
 * **never** the error object and never PostgREST's `details` field
```

---

### C2. `(work)/{…}/loading.tsx` (route, placeholder)

**Analog:** `src/app/(admin)/admin/(work)/calendar/loading.tsx` — 59 lines,
copy it nearly whole.

**A placeholder on a gated surface may not leak a count** (`:6-20`):

```tsx
 * So this placeholder **must not leak a count or a name**. The seven cards below
 * are a **literal**, read from nothing: no query runs before this file renders,
 * no length is available to it, and none is passed in … It says *a list is
 * coming*, never *this many nights exist*.
```

On the location surface the leaked number would be **how many spaces are under
consideration** — the same class of fact. Use a literal.

**The primitive, not a hand-rolled pulse** (`:29-34`, `:43-58`):

```tsx
export default function CalendarLoading() {
  return (
    <PageShell width="wide">
      <header className="pb-6"><SkeletonLine className="h-9 w-40" /></header>
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </PageShell>
  );
}
```

---

### C3. `admin/location/ScoreCell.tsx` — the component that cannot render a bare value

**Analog:** `src/app/(admin)/admin/calendar/PieceDate.tsx`. This is the strongest
analog in the repo for **D-45-11 mitigation 2** (derived vs field-verified
distinguishable *on screen*), and the mechanism is a discriminated union that
makes the bare form **unrepresentable**.

**The union, five variants and no sixth** (`PieceDate.tsx:89-94`):

```tsx
export type PieceDateState =
  | { readonly origin: "file"; readonly date: CivilDate }
  | { readonly origin: "proposed"; readonly date: CivilDate }
  | { readonly unresolved: "awaiting_next_edition"; readonly edition: string }
  | { readonly unresolved: "depends_on_lineup" }
  | { readonly unresolved: "not_derivable" };
```

**Why it is a union and not a flag** (`:20-31`):

```tsx
 * ── The prop is a union, so a bare date is UNREPRESENTABLE ───────────────────
 *   1. **Structure.** {@link PieceDateState} has exactly five variants and no
 *      sixth. Every one of them carries either an `origin` or an `unresolved`,
 *      so there is no shape of this prop that is a date with no provenance. The
 *      union mirrors the two CHECK constraints the phase's migration puts on
 *      `production_piece`, and it is the strongest available form of a rule:
 *      one that can only be kept by remembering it is not kept.
```

**The four channels, and why NONE of them is a hue** (`:32-48`) — structure, a
dashed leading rule, the ink register (`--muted` 6.78 : 1 vs `--ink` 16.41 : 1),
and an adjacent word. The refusal of `--sem-warn` is argued, not assumed:

```tsx
 * **None of the four is a hue, and that is deliberate.** `--sem-warn`'s
 * declared meaning is literally *a provisional state*, so a caution colour
 * looks like the obvious answer. It is refused because on this surface a
 * proposal is the **majority** case … a caution applied to the majority stops
 * being a caution and becomes the page's background
```

**⚠ Applies directly:** the research measures that **five source attributes take
the literal value `verifica`** and that `derived` is the majority state. A
caution hue on the majority is the same defect. Use a word.

**The single-renderer rule** (`:9-16`) — *no other component under this
directory may render a piece's date*, asserted as check U5 of the surface gate.
`production_space.name` and `score` each need the same rule, and it is what
makes `verify:section-surface` checkable at all.

**And three reasons stay three sentences** (`:62-75`) — no shared word, and the
check for its absence is a grep.

---

### C4. `admin/manifesto/SectionStateBadge.tsx` — the badge that never disappears

**Analog:** `src/app/(admin)/admin/calendar/StageBadge.tsx` — 52 lines, read in
full. **D-45-14's three states take this component's exact shape.**

```tsx
import { Badge } from "@/components/ui/Chip";
import type { VenueStage } from "@/lib/production/ics/vocabulary";

/**
 * ── Why no colour, when four ordered stages are the classic case for one ─────
 * A colour meaning *acquired* would be a stage nobody could read … this project's
 * token layer declares four semantics that name **states** … and grading a
 * negotiation against them would settle in CSS what `venue-acquisition.md` says
 * must be settled by a phone call.
 *
 * ── The badge NEVER disappears, and that is the whole point ──────────────────
 * … **A blank reads as *fine*, and *fine* is precisely the claim that cannot be
 * made.** There is no early return in this component and there is no branch
 * that produces nothing.
 *
 * ── The transform is declared, never assumed ─────────────────────────────────
 * `normal-case` is on the element. `text-transform` inherits … and an
 * upper-cased `ACQUIRED` is a different-looking claim.
 */
export function StageBadge({ stage }: { stage: VenueStage | null }) {
  return (
    <Badge className="normal-case">{stage === null ? "stage unknown" : stage}</Badge>
  );
}
```

**⚠ For the location section, do not write a second one.** The four-stage
vocabulary is identical. Reuse `StageBadge` in place, or **relocate** it to a
shared path and update the two importers in one commit — never fork it.

---

### C5. `admin/visual/PaletteSwatches.tsx` (D-45-09, D-45-16)

**Analog:** `src/app/(admin)/admin/formats/ColorSwatchPicker.tsx` — and the
important fact about it is not its code but its **status as a named exemption in
two gates**: `verify-conversion.mjs:671` and
`verify-semantic-separation.mjs:197`.

**The exemption list is EXACT PATHS, and a third one must not be added**
(`verify-semantic-separation.mjs:193-203`):

```js
/** The one stylesheet the root layout loads. An exact path, compared for equality. */
export const TOKEN_FILE = 'src/app/globals.css';

/** Exemption 1 — format identification colours are data on a row. See the header. */
export const CATALOGUE_FILE = 'src/app/(admin)/admin/formats/ColorSwatchPicker.tsx';

/** Exemption 2 — the browser paints themeColor before any stylesheet loads. */
export const THEME_COLOR_FILE = 'src/app/layout.tsx';

export const EXEMPT_PATHS = [CATALOGUE_FILE, THEME_COLOR_FILE];
```

Check B: *No file under `src/`, other than the two exemptions, contains any hex
declared in the token file's `:root`.* The six brand hexes are declared at
`src/app/globals.css:213-218`, and the sunset gradient at `:219`.

**⚠ The collision, stated so a planner resolves it rather than discovers it:**
a capitolato page or export module containing a brand hex as a **literal** turns
`verify:semantic-separation` **red**. The resolution is D-45-09's own: read the
values from `globals.css`'s `:root` **at runtime**, and **do not add a third
exemption** — an exemption granted to the surface whose whole job is publishing
the palette would make check B meaningless for the one file it most needs to
cover.

**D-45-16's collision is real and measured:** `formats.color` is `NOT NULL` with
`CHECK (color ~ '^#[0-9A-Fa-f]{6}$')`
(`20260810120000_formats_and_series.sql:124`, `:173`) and the migration's own
prose (`:118-124`) calls it *the IDENTIFICATION colour — the dot on a chip …
and not the palette of the materials, which is a different thing that shares a
word.* Checks C and E of `verify:semantic-separation` already assert two halves
of this. **What no check can assert is SIZE** — a swatch at 4 px and at 200 px
are the same source line. That belongs in `45-PROCEDURES.md`.

**Two traps in the token layer** (`verify-semantic-separation.mjs:35-39`,
`globals.css:213-219`): `--sem-warn` **is** `--amber` **is** SunSet's
identification colour, so **anything amber carries text** — D-45-15's
open-question warning is amber-shaped and must be a word. And `--grad-sunset` is
SunSet's exclusive signature; a "here is the palette" surface must not spend it
as chrome.

---

### D1. `admin/{location,manifesto,visual}/actions.ts` (service, Server Action)

**Analog:** `src/app/(admin)/admin/calendar/actions.ts` — 933 lines, and its
header `:11-89` is the checklist every new write path in this phase copies.

**The gate is asked FIRST, once, and the service client is constructed AFTER it**
(`:15-23`, `:95-128`):

```ts
async function assertProductionRead(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_READ)) {
    throw new Error("forbidden.production_read_required");
  }

  if (!userId) {
    console.error(
      "[capabilities.identity_missing] a caller holds production.read but " +
        "my_access_context() returned no user_id. This is NOT a refusal on " +
        "the merits — the migration adding user_id has not been applied."
    );
    throw new Error("capabilities.identity_missing");
  }

  return { userId };
}
```

Two **different** throw categories: a refusal on the merits, and an unresolvable
identity which *is NOT a refusal on the merits*. `cache()` does not memoise
inside a Server Action body (`:103-107`), so **more than one `await assert…(` in
one export is the defect** — the helper returns the context it resolved.

**⚠ The gate is deliberately NOT exported** (`:78-82`): every export of a
`"use server"` module is a public endpoint.

**Refusals are RETURNED values, never thrown messages** (`:50-60`, and P8):

```ts
 * `admin/venues/actions.ts:174-180`, `admin/artists/actions.ts:189` and
 * `admin/events/[id]/tickets/actions.ts:288` throw an `Error` whose message
 * carries the cause. Next **redacts** the message of an error thrown out of a
 * Server Action in a production build (`src/lib/capabilities/server.ts:59-63`),
 * so that cause works under `next dev` and reaches the reader as a blank exactly
 * where it counts — and a refusal nobody can read is a silent failure
```

**One value per distinguishable cause, no shared bucket** (`:163-200`):

```ts
export type CalendarRefusal =
  | "invalid_id"
  | "invalid_ticked"
  | "actor_name_missing"
  | "actor_name_unreadable"
  | …
```

with a JSDoc per member explaining why it is not folded into its neighbour —
e.g. *"we could not read the name" and "there is no name" are different defects.*

**The argument shape-check before any query** (`:130-135`):

```ts
/** The same shape as `formats/actions.ts:111-113`. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

**D-45-18's exact log form, already applied here** (`:740-746`):

```ts
    console.error(
      `[calendar.announce_write_failed] container for plan=${planId}: ` +
        `code=${eventError?.code ?? "unknown"} message=${eventError?.message ?? "no row returned"}`
    );
```

**⚠ `code` and `message`, never the error object and never PostgREST's third
field.** The header names the rule and deliberately does not spell the field
(`:62-71`), for the reason `formats/actions.ts:58-63` gives: *a grep whose only
match is the sentence forbidding the thing is a grep that gets ignored the third
time it goes red.* With D-45-05 what can reach that log is the **name and
address of a space under negotiation**, into logs nobody watches — there is no
error tracking in `package.json:35+`.

---

### D2. `admin/location/PromoteSpaceDialog.tsx` + the promotion act (D-45-10)

**Analog:** `announceNight` at `src/app/(admin)/admin/calendar/actions.ts:598-932`
plus `AnnounceNightDialog.tsx`. This is *the deliberate single bridge from an
internal plan to something the public may eventually see* — the same shape,
one domain over.

**Nine steps in order, each buying something** (`45-RESEARCH.md` §D1 enumerates
them; the load-bearing excerpts):

**Gate first, then validate, then construct the client** (`:598-606`):

```ts
export async function announceNight(planId: string): Promise<AnnounceNightResult> {
  // Asked FIRST, and once. The client is constructed after it, never before.
  const { userId } = await assertProductionRead();

  if (typeof planId !== "string" || !UUID_PATTERN.test(planId)) {
    return { ok: false, reason: "invalid_id" };
  }

  const client = getServiceClient();
```

**The idempotence check before anything else** (`:653-656`) — the model for
`promoted_venue_id IS NOT NULL` → `already_promoted`:

```ts
  // Announcing twice is not idempotent — it spends a second number.
  if (plan.linked_party_id !== null) {
    return { ok: false, reason: "already_announced" };
  }
```

**Refusals named one by one, and the stage gate carries the stage back while
naming no space** (`:657-676`):

```ts
  if (plan.format_id === null)   return { ok: false, reason: "format_not_resolved" };
  if (plan.series_id === null)   return { ok: false, reason: "series_not_resolved" };
  if (plan.start_time === null)  return { ok: false, reason: "start_time_missing" };

  // Decision 1. The stage travels back so the refusal can name it; it names no
  // space, and the venue word is not in this row at all.
  if (plan.venue_stage !== "acquired") {
    return { ok: false, reason: "venue_stage_not_acquired", stage: plan.venue_stage };
  }
```

**The count that never gates** (`:678`, D-44-16 → D-45-15):

```ts
  // Counted BEFORE anything is written, and it never gates: D-44-16.
  const openItems = await countOpenItems(client, plan.id);
```

**The slug derived once, with a suffix on collision, never an overwrite**
(`:686-711`) — a venue slug is an address somebody may send to somebody else:

```ts
  const base = slugify(title);
  let slug = base.length > 0 ? base : `night-${Date.now().toString(36)}`;
  … const { data: slugTaken, error: slugError } = await client.from("events").select("id").eq("slug", slug).maybeSingle();
  if (slugTaken) { slug = `${slug}-${Date.now().toString(36)}`; }
```

**⚠ The write says what it deliberately does NOT carry** (`:748-770`) — this is
the paragraph the promotion act must rewrite for `address`:

```ts
    What is deliberately NOT carried across from the plan row:
      · the venue, in either of its forms. The calendar's word is internal free
        text and may name a space nobody has announced; the resolved reference
        would arm the scheduled reveal …
      · a line-up …
      · `access_type`, left to the column's own default …

    `venue_reveal_on_purchase` IS written, and written `false`, because its
    column default is `true`: left alone, the first ticket sold on a night whose
    venue somebody later links would release the address without anybody
    deciding to.
```

**The orphan cleanup is BY PRIMARY KEY, on the id this call just created**
(`:799-820`):

```ts
      The container exists and holds no night. Removed BY PRIMARY KEY, on the id
      this call just created and captured — never by a selector over a list
      (`ai-engineering.md`, gate *una rimozione si fa per chiave*).
    const { error: cleanupError } = await client.from("events").delete().eq("id", createdEvent.id);
    if (cleanupError) { console.error(`[calendar.orphan_container] container=${createdEvent.id} … code=${cleanupError.code ?? "unknown"} message=${cleanupError.message}`); }
```

**The dialog side** — `AnnounceNightDialog.tsx:22-90`:

```tsx
 * ── The act is consequential, and NOT destructive ───────────────────────────
 * Nothing is destroyed, so the trigger does not take the destructive rung
 * (§11.1). It takes a confirmation for a reason the domain supplies rather than
 * a convention: **it spends a series number, and a spent number is never released.**
 *
 * ── Cancel first, cancel focused, and no Enter-to-confirm ───────────────────
 * … the mechanism is the primitive's declared marker rather than React's
 * `autofocus` prop. That prop is **inert**: `Dialog.tsx:117-148` records the
 * measurement …
 *
 *   1. **A night whose space is not `acquired` cannot be announced.** The refusal
 *      is drawn in the body and the confirming control is disabled — the reason
 *      is readable **before** the button is pressed … The act refuses again on the
 *      server, which is where the guarantee actually lives.
 *   3. **This dialog does not name the venue.** A confirmation panel is a thing
 *      somebody photographs, and the act moves no address, so naming one would
 *      put a word on a screen for no gain.
```

**⚠ Point 3 inverts for the promotion.** The promotion act **is** the crossing
where a name (and possibly an address) enters `venues` and becomes subject to
the reveal machinery (D-45-21 consequence 4). `RevealVenueDialog` names the place
*because the place is exactly what is leaving* — that is the precedent this
dialog follows, not `AnnounceNightDialog`'s silence. If the act writes an
address, **its confirmation must say so in the same breath**.

**The outcome is reported in the dialog's own panel** (`:74-84`,
`Dialog.tsx:173-192`), never a transient notification — `verify:dialogs` check C
asserts the absence.

**The key question the promotion must answer, and it is a decision not an
inheritance** (`20260807010000_policies_to_capabilities.sql:401-417`): the three
`venues` write policies ask `master.manage` and `catalogue.manage`.
`catalogue.manage` is a **different key** from the location section key. The
research recommends: **the action asks the location section key AND
`catalogue.manage`, then writes with the service client** — because *may this
subject work the location section* is not *may this subject create a venue*
(`keys.ts:38-45` applied to a bridge).

---

### D3. The structural half of D-45-21 — what makes "unreachable" provable

**Analog for the ARGUMENT:** `supabase/migrations/20260810161000_venues_read_narrowed.sql`.

**The public road to an address is one function, and its `FROM` clause is the
proof** (`:371-397`):

```sql
CREATE OR REPLACE FUNCTION public.venue_for_parties(p_party_ids uuid[])
RETURNS TABLE (party_id uuid, venue_id uuid, name text, slug text, address text, google_maps_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT ep.id, v.id, v.name, v.slug, v.address, v.google_maps_url
  FROM public.event_parties ep
  JOIN public.events e ON e.id = ep.event_id
  JOIN public.venues v ON v.id = ep.venue_id
  WHERE ep.id = ANY(p_party_ids) AND ( … )
$$;
```

**It walks `event_parties → events → venues` and reads nothing else.** So:

- `production_space.promoted_venue_id → venues` is **safe**: the direction is
  scouting → venues and the function never traverses it.
- The three dangerous shapes, **named so they are recognised if proposed**:
  (a) a scouting row *inside* `public.venues` — D-45-10's whole point;
  (b) any **view** in `public` joining `production_space` to `event_parties` or
  `venues`, which PostgREST would serve;
  (c) any column on `venues` referencing a scouting row, which would make the
  scouting id readable through `venues_select_staff`.

**And the measured reasoning D-45-10 rests on is confirmed** (`:190-242`):

```sql
DROP POLICY IF EXISTS venues_select_public ON public.venues;
…
CREATE POLICY venues_select_staff ON public.venues
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((select private.has_capability('staff.manage')));
```

There is **no `anon` SELECT policy**, and the omission is written as the decision
(`:244-264`) — the model for how the new migration must argue an absence:

```sql
-- There is deliberately no third policy here, and without this paragraph the
-- next reader would take the gap for an oversight and close it with the
-- "obvious" one … That policy is the harmful repair, and here is why, named so
-- it is recognised if it is ever proposed …
```

**Also relevant, and stronger where it applies:**
`20260807000000_capability_model.sql:127-160` is the repo's one example of
**tables deliberately unreachable over the API**, and its paragraph is the model
for arguing structural unreachability rather than asserting it:

```sql
-- Why it is not a bug: RLS is what decides which rows a role may read **once
-- the role can reach the table at all**. Nothing here can be reached. PostgREST
-- serves `public,graphql_public` only … Unreachability is a stronger answer than
-- a policy, because a policy can be widened by adding a second permissive one
-- beside it and unreachability cannot.
--
-- The harmful repair, named so it is recognised if it is ever proposed: adding
-- `private` to PostgREST's exposed-schema list …
```

**⚠ It is a partial analog, and the difference matters.** `private.capabilities`
is unreachable by **everyone**; `production_space` must be reachable by whoever
holds the location key, so it cannot live in `private`. What D-45-21 asks is
narrower: *no path from this table to `venue_for_parties`*. That is proved by
(1) the `FROM` clause above, (2) the absence of any view or FK in the dangerous
directions, and (3) a machine assertion — the closure walk of §E2. See
§No Analog Found #1 for what is genuinely missing.

---

### E1. `src/lib/media/may-upload.ts` (MODIFY) and the archive upload path

**Analog: itself, plus the existing media path. Do not build a second upload.**

**`import "server-only"` on line 1, above the docblock, on purpose**
(`may-upload.ts:1-15`):

```ts
import "server-only";
…
/**
 * ── Why the imports sit ABOVE this block ─────────────────────────────────────
 * The plan's acceptance criterion greps `head -3` of this file for
 * `server-only`. Written in the usual order — docblock first, imports after —
 * the check would read three lines of prose and fail on a file that satisfies it.
 */
```

**Why the predicate is a plain module and not an export of `actions.ts`** (`:28-34`):

```ts
 * A file marked `"use server"` publishes **every** export as a public endpoint.
 * Leaving this predicate there and exporting it … would publish an oracle
 * answering *"may this person upload to this night?"* to anyone who calls it.
```

**Why the signature names the night, and why widening it is refused** (`:36-48`,
`:69-73`):

```ts
 *   - **No optional night.** `partyId` is a required parameter of a normal
 *     function, so no caller can ask the question without naming the night.
```

**⚠ D-45-08's archive has no night**, and the docblock above warns against
exactly the widening a planner would reach for. **Recommendation carried from
`45-RESEARCH.md` §F4: a SECOND predicate in the same module**
(`mayUploadToVisualSection`, asking the visual section key), not a nullable-party
arm.

**The upload path itself** — `src/app/api/media/finalize/route.ts:20-51`:

```ts
/**
 * `POST /api/media/finalize` — the one place where bytes become public.
 *
 * ── WHY THE BYTES DO NOT TRAVEL THROUGH THIS REQUEST — read the number ───────
 *   * a Vercel Function refuses a request … body larger than **4.5 MB**,
 *     answering `413 FUNCTION_PAYLOAD_TOO_LARGE`. Read at the source on 2026-08-09
 *   * the product accepts photographs up to **50 MB**
 *     (`src/components/media/MediaUpload.tsx:11`)
 *
 * **Whoever comes to "simplify" this route into one that accepts the file must
 * read the two numbers above first.**
 *
 * ── FAIL CLOSED, deliberately the OPPOSITE of the door ───────────────────────
 */
```

**The bucket migration pair** —
`20260809004600_event_media_quarantine_bucket.sql:1-73` and
`20260809006000_event_media_server_upload_only.sql`. Read the first file's
header: it enumerates **why the two halves of one transaction are not
symmetrical**, and it names the **deploy-ordering window** the second file
closes (`:37-53`). That window paragraph is the model for D-45-04's own ordering
note.

> **⚠ Open Question 6 is unanswered and gates this plan.** The existing path
> publishes to a **public** bucket after stripping. An archive photo is **not
> published**. The destination — a third bucket, or the quarantine bucket with a
> longer life and a section-key read policy — *must be decided before the upload
> plan is written, not inside it.*

---

### F1. `scripts/seed-production-spaces.mjs` (script, import)

**Analog:** `scripts/import-production-calendar.mjs` — 1569 lines; read its
header `:1-130`, its argument parser `:280-303`, its credential read `:385-390`,
its client construction `:645`, and its upserts `:1240`, `:1313`, `:1343`,
`:1411`.

**Why a local script and not an upload** (`:13-34`) — copy this reasoning
wholesale; D-45-05 departs from it for the *authored* sections and **not** for
the seed:

```js
 * An in-product upload would make the `.ics` **transit a serverless function** —
 * carrying spaces under negotiation, unannounced dates and line-ups into logs,
 * caches, framework error pages and whatever a future exception handler decides
 * to echo.
```

**The output is a publication surface** (`:35-55`):

```js
 * So the rule is narrower than "be careful": somebody will paste this run into
 * an issue. It prints **counts, identifiers and reason codes**, and it prints no
 * title, no date, no venue word, no line-up and **not even the name of the file
 * it read** — that name carries a date.
 *
 * The last thing the run prints is an audit **of its own transcript** … no token
 * of a parsed title, and no four-digit year, may appear in what this run said.
```

**⚠ The seeding script's transcript audit must forbid a street token as well as
a year** — D-45-21's field is an address, and the calendar's audit was written
for dates.

**Four things it cannot do, by construction** (`:57-78`):

```js
 *   1. **It writes nothing unless `--apply` is passed.** A dry run is the DEFAULT.
 *      A tool that writes production when invoked with no arguments is a tool
 *      that will one day be invoked with no arguments.
 *   2. **It removes nothing, ever.** There is no removal statement in this file
 *      and no list that could carry one.
 *   3. **It never touches the announced-night table** — named here once, in the
 *      sentence forbidding it …
 *   4. **It never generates a progressivo.** No counter, no arithmetic …
```

Point 2 is **D-45-13 made structural** for the seed. Point 4's analogue for
D-45-11 is: **it never writes a score**, because a score is computed from
attributes; and **it never writes `stage`**, so the column's
`DEFAULT 'mapped'` does it — a script that wrote `stage` from an attribute would
be *ranking-is-not-availability* encoded into data, and no CHECK would catch it.

**The re-runnability shape** (`:1240`):

```js
    db.from("production_plan").upsert(rows, { onConflict: "source_uid" })
```

A natural key that survives an edit. **Open Question 3 / assumption A3 of the
research is still open**: if the export carries a stable record id that is the
key; if it carries only a name, the key is a normalised name **and the script
must say so**, because a renamed space then arrives as a new row.

**Credentials from the environment, refused by name when absent** (`:385-390`),
and the service client constructed once (`:645`).

**And the naming rule** (`:126-130`): `import:calendar` is **not** a `verify:*`
entry and must never become one — `verify-all.mjs` collects gates by prefix. The
seeding script takes a name outside that prefix for the same reason.

---

### F2. `scripts/verify-section-surface.mjs` (test, source-assertion)

**Analog:** `scripts/verify-calendar-surface.mjs` — 778 lines. Its header
`:1-70` is the whole template.

**The mandatory "what a green does not mean" section** (`:10-30`):

```js
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *   - **THESE ARE STRING ASSERTIONS OVER SOURCE FILES.** Not one of them runs a
 *     line of product code, renders an element, or measures a pixel …
 *   - **NONE OF THEM PROVES THE SURFACE IS CORRECT.** …
 *   - **AND NOTHING HERE OPENS A SESSION.** …
```

**The scope is named directories, never `src/`** (`:32-39`) — *widening the scan
would redden files that never agreed to these rules, and a gate that goes red on
a correct tree is a gate somebody disables.*

**Every file read through the comment stripper** (`:41-55`):

```js
 * So every file is read through `scripts/lib/comments.mjs` — the one stripper,
 * proved by asserted mutation, whose stated error direction is *blanks more,
 * never less*. A file whose comment never closes is a file this gate cannot
 * measure, and it REFUSES rather than reporting a green about nothing.
```

**And the script does not match itself** (`:57-65`) — it lives in `scripts/`,
outside the scan scope.

**Exit codes** (`:67-70`): `0` passed · `1` FAILED · `2` REFUSED, *and a refusal
is not a failure: it means the measurement did not happen.*

The five checks this gate owes are enumerated in `45-RESEARCH.md` §E4 (stage
beside the name; provenance beside the score; the void is declared; no large
swatch on a `formats.color` value — **weak, and the check must say so**; no
address to a `console.*`).

---

### F3. `scripts/verify-section-export.mjs` (test, closure walk)

**Analog for the MECHANISM:** `scripts/verify-conversion.mjs:792-824` — the only
import-closure walk in the repository:

```js
/**
 * The transitive closure of one page file, and every local specifier it could
 * not resolve.
 *
 * **The walk passes THROUGH an excluded file rather than stopping at it.** … it
 * is not a wall. Stopping there would hide any non-spine file that a surface
 * reaches only by way of the spine, which is a narrowing in the direction that
 * produces a green.
 */
function importClosure(entryRel) {
  const reached = new Set();
  const unresolved = [];
  const queue = [entryRel];
  while (queue.length > 0) {
    const rel = queue.shift();
    if (reached.has(rel)) continue;
    reached.add(rel);
    for (const spec of localSpecifiers(rel)) {
      if (isNonCodeSpecifier(spec)) continue;
      const target = resolveSpecifier(spec, rel);
      if (target === null) { unresolved.push({ from: rel, spec }); continue; }
      if (!reached.has(target)) queue.push(target);
    }
  }
  return { reached: [...reached].sort(), unresolved };
}
```

**Report shape and refusal discipline:** `verify-calendar-surface.mjs:1-70`
(above).

**And the positive control is not decoration** (P9 of the research;
`verify-conversion.mjs:75` and `probe-forged-identity.sh:44-46`):

```sh
# A probe that has never been shown to fire proves nothing. Run
# `--positive-control` and read what it says before believing any green here.
```

A negative-only assertion goes green on a deleted file. **Check C of the export
gate — each export module names its OWN tables — is what keeps it non-vacuous.**

---

### F4. `scripts/verify-all.mjs` (MODIFY — a fourth list)

**Analog: itself.** `NEEDS_MATERIAL` was added by Phase 44 as a **third** list
rather than a second entry in `NEEDS_SERVER`, and the reason is the pattern:

```js
 *      So it is declared in `NEEDS_MATERIAL` and not run here. **`NEEDS_MATERIAL`
 *      is a third list rather than a second entry in `NEEDS_SERVER`** because the
 *      reason printed beside a name is the whole value of naming it, and *needs a
 *      running dev server* would be a false sentence about this one.
```
— `verify-all.mjs:50-58`

**The list shape and the contract** (`:274-299`):

```js
/** Shape: `[npmScriptName, reason]`. */
const NEEDS_SERVER = [ [ "verify:redirects", "needs a running dev server; …" ] ];

/* NEEDS_MATERIAL … Adding a NAME to a list is not adding a RUNNER: nothing below
 * spawns these, on purpose. */
const NEEDS_MATERIAL = [
  [ "verify:ics",
    "scripts/verify-ics-import.mjs reads the production calendar out of docs/, which " +
      "is gitignored and therefore exists on the owner's machine and nowhere else. …" ],
];
```

**And a refusal is not a failure, in the aggregate too** (`:26-36`):

```js
 *   1. **A REFUSAL IS NOT A FAILURE.** … An aggregate that collapsed the two
 *      would turn "nothing was measured" into either "something is broken" or,
 *      far worse, into a tick. **A green that measured nothing is the exact
 *      defect this phase's gates were written to prevent** …
```

`verify:refusal` fits none of the three lists: it needs credentials **and an
act**. `45-RESEARCH.md` §B6 recommends a fourth — `NEEDS_AUTHORISATION`,
declared and never run — and the `OFFLINE` entry for `verify:capabilities`
(`:225-231`) is the model for a reason string that says *without them it
REFUSES (exit 2) and nothing … was measured. That is its honest state, and it is
not a pass.*

`package.json:10-30` is the entry list; three new `verify:*` names go in, in the
same commit as the scripts.

---

### G1. `45-PROCEDURES.md` (doc, manual gate)

**Analog:** `.planning/phases/44-the-production-calendar-comes-inside/44-PROCEDURES.md`.

**The frontmatter carries the authorisation split** (`:1-9`):

```yaml
---
phase: 44-the-production-calendar-comes-inside
written: 2026-08-15
status: all pending
closes: PROD-01 criterion 3, PROD-01 criterion 4, D-44-06, …
accounts: five — master, organizer approved, organizer pending (seeded by hand), staff assigned to the door, plain member approved; roles, never names
authorisation: P1, P2 and P4 read only. **P3 WRITES TO PRODUCTION and needs its own dated authorisation** — it may not ride along with the others
phase_closes: not before every Result below carries an observation
---
```

**The four rules of the document** (`:11-38`):

```markdown
> **(a) Every `Result` below reads `pending`, and a pending Result is an UNRUN
> procedure** — never a verified-by-inspection in disguise.
> **(b) Roles, never names.** `.planning/` is tracked and this repository is
> PUBLIC … And **no venue, no night's date and no line-up appears anywhere in
> this file** — a step says *open the calendar and read the first row*, never
> what that row says.
> **(c) Why these four and not more.** … `verify:capabilities` reads rows —
> **through the Management API, which connects with a role that BYPASSES RLS**,
> so its read-back proves the six policies EXIST and never that they REFUSE.
> **(d) P3 is separated on purpose.** It writes to production … It does not run
> in the same sitting as the others unless that sitting was authorised for it by name.
```

**Phase 45 needs the same split, with THREE authorisations, not one:**
(1) the D-45-04 migration sequence; (2) the D-45-07 seeding run; (3) the
D-45-19 session mint. Each is *an act, consumed once, for exactly what was
described* (`ai-engineering.md`).

---

## Shared Patterns

Applied to every relevant file in the phase.

### S1. The gate order in a Server Action
**Source:** `src/app/(admin)/admin/calendar/actions.ts:15-23`, `:95-128`, `:598-606`
**Apply to:** every `actions.ts` this phase creates.
Gate first → validate arguments → construct the service client. *An ordering slip
turns an act into an unauthenticated write path, and no build would see it.*

### S2. A refusal travels as a returned value
**Source:** `actions.ts:50-60`, `:163-200`; `20260815120100:370-380`; `src/lib/capabilities/server.ts:59-63`
**Apply to:** every write path, every SQL function this phase adds.
One value per distinguishable cause. **No shared *something went wrong*** — the
newsletter precedent is recorded in `meta-gates.md`.

### S3. D-45-18's log form
**Source:** `actions.ts:740-746`, `:794-797`, `:815-819`
**Apply to:** every new `catch` and every failure branch.
```ts
console.error(`[<category>.<cause>] <identifier>: code=${e?.code ?? "unknown"} message=${e?.message ?? "no row returned"}`);
```
Never the error object. Never PostgREST's third field. **Do not spell that
field's name in the sentence forbidding it** (`formats/actions.ts:58-63`).

### S4. The `(SELECT …)` wrapper on every capability predicate
**Source:** `20260815120100:154-160`, `:176-181`; `20260807000000_capability_model.sql:177-184`
**Apply to:** every policy this phase writes or rewrites.

### S5. REVOKE-then-GRANT, two statements
**Source:** `20260815120200:46-52`
**Apply to:** every `SECURITY DEFINER` function this phase adds.
*Postgres grants EXECUTE to PUBLIC by default on every new function.*

### S6. The ⚠ INTERNAL, NEVER PUBLIC banner
**Source:** `20260815120000:227-237` (SQL) ↔ `src/types/database.ts:1229-1238` (TS)
**Apply to:** `production_space.name`, `production_space.address`, and every
column that can hold either — **on both sides, in one commit**.

### S7. A closed vocabulary lives twice, written once
**Source:** `20260815120000:281-287` ↔ `src/lib/production/ics/vocabulary.ts:187-195`
**Apply to:** stage, section state, exit reason, score provenance, answers source.
*Editing either set means editing both, in the same commit — the build sees the
TypeScript side, the CHECK sees the SQL side.*

### S8. Removal by primary key, never by a selector
**Source:** `actions.ts:799-812`; `ai-engineering.md`, *gate una rimozione si fa per chiave*
**Apply to:** the retirement migration, any cleanup branch, and any verification
that creates rows.

### S9. Reachability is the map's answer, never the directory's
**Source:** `(work)/calendar/page.tsx:38-58`; `staff-tabs.ts:20-28`;
`capability-routes.ts:580-592`; `nextjs-architecture.md`, *gate il gruppo non autorizza*
**Apply to:** all four new surfaces. And the counterpart: **the middleware is UX,
the RLS is the boundary** — a page reads with the cookie-bound client, because
*a read that bypasses the policy proves nothing about the policy.*

### S10. Every embed checked against its foreign keys
**Source:** `(work)/calendar/page.tsx:117-142`; `actions.ts:608-618`
**Apply to:** every `.select()` with an embed. P7: `PGRST201` fails **silently**
through this client — `data` null, nothing thrown, page renders nothing.

### S11. A gate must be able to fire
**Source:** `verify-conversion.mjs:75`; `probe-forged-identity.sh:44-46`;
`verify-all.mjs:26-36`
**Apply to:** all three new `verify:*` scripts. Every negative assertion needs a
positive control beside it, and a refusal exits **2**, not 0.

### S12. Source-scanning gates read through the one comment stripper
**Source:** `verify-calendar-surface.mjs:41-55`; `scripts/lib/comments.mjs`
**Apply to:** `verify-section-surface.mjs`, `verify-section-export.mjs`.
P10: *a grep whose only match is the sentence forbidding the thing is a grep
that gets ignored the third time it goes red.*

### S13. Primitives and tokens — the sections land in the finished visual system
**Source (Phase 41 primitives, all in `src/components/ui/`):** `PageShell.tsx` ·
`Dialog.tsx` · `Card.tsx` · `Button.tsx` · `Chip.tsx` (`Badge`) · `Input.tsx` ·
`Textarea`/`Select`/`Checkbox.tsx`/`Switch.tsx` · `Typography.tsx`
(`PageTitle`, `SectionHeading`) · `DataTable.tsx` · `Skeleton.tsx` ·
`AutocompleteInput.tsx` · `Icons.tsx`
**Source (Phase 40 tokens):** `src/app/globals.css` — `--ground/--surface/--raised/--sunk`,
`--ink/--muted/--faint`, `--line-soft/--line/--line-strong`, `--control`,
`--accent/--accent-hover`, `--sem-crit/--sem-warn/--sem-info/--sem-done`, and
the brand family at `:213-218` with `--grad-sunset` at `:219`.
**Two traps:** `--sem-warn` **is** `--amber` **is** SunSet's identification
colour (`verify-semantic-separation.mjs:35-39`) → **anything amber carries
text**; and `--grad-sunset` is SunSet's exclusive signature → a visual section
must not spend it as chrome.

### S14. Migrations are the schema's truth, and an applied one is never edited
**Source:** `supabase-data.md`, *gate migration in avanti*;
`20260810161000:194-198`; `20260815120200:22-26`
**Apply to:** everything in Family A and B. P2: `20260815120100` **is applied**.

### S15. The conversion manifest does NOT need an entry
**Source:** `scripts/conversion-manifest.mjs:488+`; `verify-conversion.mjs:121`
The calendar surface is not in the manifest — it was built *after* the
conversion, directly on the primitives. The three new sections are in the same
position. **The consequence to state rather than discover:** these surfaces are
therefore **outside** `verify:conversion`'s walk, so if the section-surface gate
is not built, **nothing automatic looks at these files at all**.

---

## No Analog Found

Three things Phase 44 did not build. **"No analog" is a finding, and inventing a
weak one would be worse than none** — each entry below names the nearest partial
match and says exactly where it stops.

### 1. A table whose rows must be unreachable from any public path, while still readable by an entitled session (D-45-21)

**Verdict: no exact analog. Two partial ones, pointing in different directions.**

| Nearest match | What it gives | Where it stops |
|---|---|---|
| `20260807000000_capability_model.sql:127-160` — `private.capabilities` / `private.role_capabilities` | The best-written **argument** for structural unreachability, including *unreachability is a stronger answer than a policy, because a policy can be widened … and unreachability cannot*, and the named harmful repair | Those tables are unreachable by **everybody**. `production_space` must be reachable by the location key holders, so it cannot live in `private`. The argument travels; the mechanism does not |
| `20260810161000_venues_read_narrowed.sql:371-397` — `venue_for_parties` | The **measurable** proof: one function, one `FROM` clause, three tables, and nothing else reaches an address | It proves what the *function* reads. It does not prove that **no future view, FK or function** creates a second road. That is the missing half |

**What is genuinely missing, and what a plan must therefore build rather than
copy:** an assertion that **enumerates the absence**. No script in this
repository today reads `pg_constraint` / `pg_views` / `pg_proc` and asserts that
a named table has no edge into a named public road. `scripts/rls-baseline.mjs`
(2650 lines) censuses policies; `verify-capabilities.mjs` censuses keys and
grants; neither censuses **reachability**. The closest mechanism in the tree is
the source-level `importClosure` of `verify-conversion.mjs:792-824` — which
walks TypeScript imports, not SQL dependencies.

**Consequence for planning.** D-45-21 consequence 1 says a plan must
*demonstrate* the absence, not assert it. That demonstration is **new work**,
and it is a catalogue read (`pg_depend` / `pg_views` / `information_schema`)
with a **pre-registered expectation** in the shape of
`verify-capabilities.mjs:190-200`. Budget it; it is not a copy.

### 2. An export / serialisation path that leaves the product (D-45-17)

**Verdict: no analog with the property D-45-17 requires — narrowness that is
structural and testable.**

| Nearest match | What it gives | Where it stops |
|---|---|---|
| `src/app/api/tickets/[id]/wallet/route.ts` (88 lines) + `src/lib/apple-wallet.ts` | The only path in the repo that **serialises rows into a document that leaves the product**. It reads a narrow, named column set: `id, party_id, event_id, ticket_tiers(name), events(title, date, slug), event_parties(title, date, time, end_time, venue_text)` (`route.ts:31-38`) | **It has no docblock, no declared table list, no gate, and no narrowness argument.** It is a pre-Phase-40 file. Its narrowness is a fact about one `.select()` string, not a property anything checks. Copying it would give the phase an export whose narrowness is a habit |
| `src/emails/**` + `src/lib/email.ts` | Serialisation of rows into a document sent outside | Same gap: no structural constraint on what the module may reach. And `src/emails/` is `DI-40-01`, an **acknowledged deferral** of `verify:semantic-separation` — the opposite of the property wanted here |
| `scripts/verify-conversion.mjs:792-824` | The **mechanism** for proving an import closure | It is a script proving a property of *pages*, not a runtime export module. It supplies the walk, not the pattern |

**What is genuinely missing:** a module in `src/lib/` that **declares the tables
it may read** and a gate that proves it reads no others. `45-RESEARCH.md` §E2
specifies the five checks (A closure, B forbidden `.from()`, C the positive
half, D a derived-not-typed forbidden list, E no service client). All five are
new. The **report shape** and the *what a green does not mean* paragraph come
from `verify-calendar-surface.mjs:1-70`; the **walk** comes from
`verify-conversion.mjs`; the **thing being walked** has no precedent.

**And one more absence with a decision attached:** there is **no PDF dependency**
in `package.json:35+`, and the research refuses adding one — Markdown or a print
view. That is not a gap, it is a chosen constraint, and a plan proposing a
package runs the legitimacy gate first.

### 3. A script that authenticates as a real role rather than a service key (D-45-19)

**Verdict: nothing in the repository does this. Confirmed by measurement, not by
memory.**

```
/usr/bin/grep -rn "signInWithPassword|verifyOtp|generateLink" scripts/  →  two
  comment-only hits in scripts/verify-no-credit-account.mjs (:16, :128).
  No script signs in.
```

Every catalogue-reading gate connects through the **Management API** with
`SUPABASE_ACCESS_TOKEN` (`scripts/rls-baseline.mjs:215-216`, `:262-288`) — a
role that **bypasses RLS**. That is precisely why Phase 44's criterion 4 could
prove the six policies *exist* and never that they *refuse*, and
`44-PROCEDURES.md:32-38` says so in its own words.

**The mechanism exists, but OUTSIDE the repository and gitignored:**
`docs/36-13-v3/mint-session.mjs` (83 lines) and `docs/36-13-v3/revoke.mjs`
(13 lines), Phase 36, owner-authorised 2026-08-10, `git check-ignore` →
`.gitignore:67`. Read as a **reference implementation only**; nothing from them
is reproduced here. The mechanism, in the terms `45-RESEARCH.md` §B2 already
published:

1. read `.env.local` into a map;
2. `auth.admin.generateLink({ type: "magiclink", email })` with the **service**
   client → a hashed token;
3. `auth.verifyOtp({ token_hash, type: "email" })` with the **anon** client → a
   real session;
4. (only if a browser is being driven) encode it in `@supabase/ssr` 0.8's cookie
   shape. **The new instrument does not need step 4** — steps 1–3 yield an
   `access_token`, and a second `createClient(URL, ANON_KEY, { global: { headers:
   { Authorization: \`Bearer ${token}\` } } })` is enough for a PostgREST read.
5. Revocation: `auth.admin.signOut(access_token, "global")`, **then re-read the
   token and print whether it still resolves** — the revocation is verified, not
   assumed.

**Two disciplines the new instrument inherits verbatim from that script's own
header:** *it PRINTS NO TOKEN and NO EMAIL — it prints names and lengths*, and
*it lives outside the repository because the repository is PUBLIC*. The new one
lives **inside** `scripts/` so the method is reviewable, with the credentials in
`.env.local` and the **authorisation** as a dated line in `45-PROCEDURES.md`.

**What has no analog at all is the ASSERTION HARNESS around it.** In particular
the pair-assertion of `45-RESEARCH.md` §B4, which exists because **the refusal is
`HTTP 200 []`, not an error**: `anon` and `authenticated` hold table-level
`arwdDxtm` on all six `production_*` tables, so the privilege system never
fires. On the five tables that hold **0 rows**, a master and a member get
byte-identical answers. The instrument must assert
`master.rowCount > 0 && member.rowCount === 0`, and **REFUSE (exit 2) when the
positive control returns 0** — the measurement did not happen. The nearest thing
in the tree to that discipline is `probe-forged-identity.sh:44-46`
(*a probe that has never been shown to fire proves nothing*) and
`verify-all.mjs:26-36` (*a refusal is not a failure*) — two **sentences** to
copy, not a script.

---

## Two collisions a planner must resolve rather than discover

Repeated here because they are the two places a plan written from the analogs
alone would go red.

1. **The capitolato needs hex values and `verify:semantic-separation` check B
   forbids them.** Resolution in §C5: read `globals.css`'s `:root` at runtime;
   **do not add a third exemption path**; do not restate the gradient
   (`npm run verify:sunset-gradient` is a separate gate).

2. **`staff-tabs.ts` cannot compile before the page exists.** Resolution in §A5:
   page → map entry → tab, in **three plans in that order**. The two workarounds
   are rejected in writing at `staff-tabs.ts:117-126` and stay rejected.

And one ordering fact that is not a collision but is worth a line: **the four
new static `/admin/<section>` addresses must be checked against the existing
patterns before they are written** —
`node scripts/verify-routes.mjs --print-patterns`. A tie throws at module load
**inside the middleware bundle**, which is a 500 on the payments webhook and the
door's scan path (`capability-routes.ts:564-569`).

---

## Metadata

**Analog search scope:** `supabase/migrations/` (25 files, 5 read in whole or in
targeted part) · `src/lib/{capabilities,routes,production,media}/` ·
`src/app/(admin)/admin/{calendar,formats}/` ·
`src/app/(admin)/admin/(work)/calendar/` · `src/app/api/media/finalize/` ·
`src/app/api/tickets/[id]/wallet/` · `src/types/database.ts` ·
`src/app/globals.css` · `scripts/` (26 files censused, 8 read in part) ·
`package.json` · `.planning/phases/44-…/44-PROCEDURES.md` ·
`docs/36-13-v3/` (gitignored, read as reference, nothing reproduced)

**Files scanned:** 26 read in whole or in targeted part; 3 directories censused.

**Every excerpt above is from a tracked file and carries its `file:line`.**
`.planning/codebase/` was not consulted.

**Pattern extraction date:** 2026-08-17
