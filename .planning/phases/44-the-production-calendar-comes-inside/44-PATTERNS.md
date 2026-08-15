# Phase 44: The Production Calendar Comes Inside — Pattern Map

**Mapped:** 2026-08-15
**Files analyzed:** 23 (18 new, 5 modified)
**Analogs found:** 21 / 23

> **This file is a publication.** `.planning/` is tracked and
> `github.com/edmiribrahimi/Resonate` is public (D-44-04, `ai-engineering.md`
> *gate la pianificazione è pubblica*). `docs/Music-*.ics` was **not opened** for
> this document and nothing below came out of it: every excerpt is read from
> `src/`, `supabase/migrations/` or `scripts/`, with `file:line`. No venue under
> negotiation, no unannounced date, no line-up.

---

## File Classification

### Wave 0 — the pure module and the checks that hold it honest

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/lib/production/ics/unfold.ts` | utility (pure) | transform | `src/lib/door/classify.ts` | exact |
| `src/lib/production/ics/parse.ts` | utility (pure) | transform | `src/lib/door/classify.ts` | exact |
| `src/lib/production/ics/classify.ts` | utility (pure) | transform | `src/lib/door/classify.ts` + `src/lib/door/outcome.ts` | exact |
| `src/lib/production/ics/anchors.ts` | utility (pure) | transform | `src/lib/door/classify.ts` | exact |
| `src/lib/production/ics/reconcile.ts` | utility (pure) | transform (returns a plan, writes nothing) | `src/lib/door/classify.ts` | role-match |
| `src/lib/production/ics/index.ts` | barrel | — | `src/lib/door/outcome.ts` (literal-source discipline) | role-match |
| `scripts/verify-ics-import.mjs` | verification script | file-I/O, batch | `scripts/verify-media-strip.mjs` + `scripts/verify-tokens.mjs` | exact |
| `scripts/import-production-calendar.mjs` | local runner (service role) | file-I/O → batch write | `scripts/rls-baseline.mjs` (env + refuse shape) | role-match |
| `package.json` (modify) | config | — | its own `verify:*` block, `:10-27` | exact |

### Wave 1 — the database

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/migrations/<ts>_production_calendar.sql` | migration | DDL + RLS + monotone trigger | `supabase/migrations/20260810120000_formats_and_series.sql` | exact |
| ↳ its capability rows | migration §1 | DDL | `supabase/migrations/20260810160000_manual_venue_reveal.sql:131-149` | exact |
| ↳ its `number`-refusing trigger | migration §n | trigger | `20260810120000…:590-614` (`bump_series_watermark`) | exact |
| ↳ its checklist-tick function | migration §n | `SECURITY DEFINER` write w/ author | `20260810160000…:384-…` (`record_venue_reveal_act`) | exact |
| `src/types/database.ts` (modify) | model | — | its existing shape; `supabase-data.md` *gate tipi allineati* | role-match |

### Wave 2 — the access chain (three readers, one declaration)

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/lib/capabilities/keys.ts` (modify) | config / literal source | — | its own thirteenth key, `keys.ts:86-108` + `:197-198` | exact |
| `src/lib/routes/capability-routes.ts` (modify) | config / route map | request-response | its own `CATALOGUE_MANAGE` entry, `:434-437` | exact |
| `src/lib/routes/staff-tabs.ts` (modify) | config / nav | — | its own Formats entry, `:107-130` | exact |

### Wave 3 — the surface

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/app/(admin)/admin/(work)/calendar/page.tsx` | route (server page) | request-response read | `src/app/(admin)/admin/(work)/formats/page.tsx` | exact |
| `src/app/(admin)/admin/(work)/calendar/[id]/page.tsx` | route (server page) | request-response read | `src/app/(admin)/admin/(work)/venues/[slug]/page.tsx` | exact |
| `src/app/(admin)/admin/(work)/calendar/loading.tsx` (+ `[id]/`) | route (loading) | — | `src/app/(admin)/admin/(work)/members/loading.tsx` | exact |
| `src/app/(admin)/admin/calendar/actions.ts` | server action | request-response write | `src/app/(admin)/admin/formats/actions.ts` (refusal-as-value) + `events/[id]/reveal/actions.ts` (consequential act) | exact |
| `src/app/(admin)/admin/calendar/CalendarList.tsx` | client component | list render | `src/components/admin/MemberTable.tsx:1052-1083` | exact |
| `src/app/(admin)/admin/calendar/NightRow.tsx` / `CommitmentRow.tsx` | component | — | `MemberTable.tsx` `DataColumn.card` slots | role-match |
| `src/app/(admin)/admin/calendar/PieceDate.tsx` | component (discriminated union) | — | **no analog** — see §No Analog Found |
| `src/app/(admin)/admin/calendar/StageBadge.tsx` | component | — | `MemberTable.tsx:121-210` (`RoleBadge` / `StatusBadge`) | exact |
| `src/app/(admin)/admin/calendar/ChecklistItem.tsx` | client component | action call + refusal copy | `FormatsCatalogue.tsx:128-154` + `:213-220` | exact |
| `src/app/(admin)/admin/calendar/AnnounceNightDialog.tsx` | client component | confirmation of a consequential act | `src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx` | exact |
| `src/app/(admin)/admin/calendar/ImportRunSummary.tsx` | component | — | **no close analog** — see §No Analog Found |

---

## Pattern Assignments

### `supabase/migrations/<ts>_production_calendar.sql` (migration, DDL + RLS + trigger)

**Analog:** `supabase/migrations/20260810120000_formats_and_series.sql` — same
author-phase, same domain, and `44-RESEARCH.md` §Migration Shape already names
its header as *the model to copy*.

**Header pattern** (`20260810120000…:1-74`) — copy the shape, not the words: a
numbered change list, then *why one transaction*, then a declared idempotence
list, then the publication paragraph:

```sql
-- Formats, series and the stored number of a night — the file whose deliverable
-- is a REFUSAL
-- Phase 36, Plan 03: FMT-01, FMT-02, FMT-03, FMT-05, FMT-06
--
-- IDEMPOTENCE, DECLARED. This queue is applied one row at a time, by hand
-- (`36-RESEARCH.md` §6), and re-applying a file out of doubt is the natural
-- reaction to a doubt. So:
--   * `CREATE TABLE IF NOT EXISTS`, with every constraint declared INSIDE the
--     table. A CHANGED constraint set is a NEW migration, never an edit to this
--     one (`supabase-data.md`, gate *migration in avanti*);
--   * `IF NOT EXISTS` on every index and on every `ADD COLUMN`;
--   * `DROP POLICY IF EXISTS` before each of the four policies;
--   * a `DO` block that creates a constraint only if `pg_constraint` does not
--     already hold it — and NOT `DROP CONSTRAINT IF EXISTS` + `ADD` […]
--
-- AND THIS FILE IS A PUBLICATION. `supabase/migrations/` is tracked and
-- `github.com/edmiribrahimi/Resonate` is public. […] MotionLab ships with NO
-- SERIES, and that absence is the point rather than an omission: the series it
-- needs is a venue-named one, and that name cannot be written into a public
-- file today.
```

> The last paragraph is the one criterion 2 turns into a rule: this phase's
> header states **zero seeded rows**, and the assertion is readable off the file.

**Table pattern** (`:93-99`, `:167-173`) — constraints named and declared inside
the table, so a collision arrives as a name a caller can branch on:

```sql
CREATE TABLE IF NOT EXISTS public.formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  …
  CONSTRAINT formats_slug_unique UNIQUE (slug),
  CONSTRAINT formats_code_unique UNIQUE (code),
  CONSTRAINT formats_color_hex_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);
```

**RLS read pattern** (`:365-384`) — the initplan wrapper is load-bearing:

```sql
DROP POLICY IF EXISTS formats_select_catalogue_manage ON public.formats;

-- The `(select ...)` wrapper is LOAD-BEARING, and it is not `STABLE` that
-- produces the effect: it makes Postgres evaluate the call once per statement as
-- an InitPlan instead of once per row.
CREATE POLICY formats_select_catalogue_manage ON public.formats
  FOR SELECT USING ((SELECT private.has_capability('catalogue.manage')));
```

Five tables × this one arm, with the phase's new key. **No public read arm**:
unlike `formats`, nothing here is catalogue — every row is an unannounced date
or a space under negotiation.

**No-write-policy pattern** (`:452-476`) — copy this paragraph's *argument*, and
its disclaimer:

```sql
-- 4c. No INSERT, UPDATE or DELETE policy on either table — DELIBERATE
-- Writes arrive from the catalogue surface with the SERVICE client, which
-- bypasses every policy. A write policy here would therefore constrain nothing
-- on the only path that writes, while reading to the next person as though the
-- boundary were covered. […]
-- Three tables in this repository already omit their write policies on purpose
-- […] Without this paragraph the next reader takes the gap for a bug and
-- repairs it — and the repair is one `CREATE POLICY` away from letting an
-- authenticated session write the name of a series.
--
-- WHAT THIS DOES NOT CLAIM. The service client is not a boundary; it is the
-- absence of one.
```

**Monotone-guard pattern** (`:590-614`) — the shape the phase's *refuse a
`number` change* trigger copies, `SECURITY DEFINER` + `SET search_path = ''`
included:

```sql
CREATE OR REPLACE FUNCTION public.bump_series_watermark()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.party_series
     SET highest_assigned = GREATEST(highest_assigned, NEW.number)
   WHERE id = NEW.series_id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.bump_series_watermark() IS
  'Raises party_series.highest_assigned to the number just written on a night. GREATEST, never an '
  'assignment: a deleted night or a downward correction must not lower a level that has already '
  'been handed out and printed. SECURITY DEFINER because party_series carries no write policy.';

DROP TRIGGER IF EXISTS event_parties_bump_series_watermark ON public.event_parties;

CREATE TRIGGER event_parties_bump_series_watermark
  AFTER INSERT OR UPDATE OF number ON public.event_parties
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_series_watermark();
```

> **Do not re-implement the watermark** (`44-RESEARCH.md` §Don't Hand-Roll). The
> new trigger is a `BEFORE UPDATE` on `production_plan` that refuses a `number`
> change, and it fires on a table `bump_series_watermark` never sees.

**Capability rows pattern** (`20260810160000_manual_venue_reveal.sql:131-149`) —
two inserts, both `ON CONFLICT DO NOTHING`, and a comment per grant:

```sql
INSERT INTO private.capabilities (key, description) VALUES
  ('venue.reveal', 'Reveal a night''s secret venue by hand, […]')
ON CONFLICT (key) DO NOTHING;

INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  -- The master already holds every surface this act is performed from. The row
  -- exists so the key is not silently master-by-absence: a capability nobody is
  -- granted resolves false for everyone, including the master.
  ('master',    'venue.reveal', true),
  ('organizer', 'venue.reveal', true)
ON CONFLICT (role, capability) DO NOTHING;
```

> ⚠ The `requires_approved` value here is **the owner's call**, not the
> planner's (D-44-27 vs `44-RESEARCH.md` §Access). The *shape* above is what to
> copy; the boolean is a checkpoint. And note the `description` string must be
> **byte-identical** to `CAP_DESCRIPTIONS` in `keys.ts` — `keys.ts:29-36` says
> editing one means editing the other in the same commit.

**Author-recording write pattern** for the checklist tick
(`20260810160000…:384-426`) — arguments, not `auth.uid()`, and refusals as
returned values:

```sql
CREATE OR REPLACE FUNCTION public.record_venue_reveal_act(
  p_party_id uuid, p_act text, p_actor_id uuid, p_actor_name text, …
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
…
  IF p_actor_id IS NULL OR btrim(coalesce(p_actor_name, '')) = '' THEN
    RAISE EXCEPTION 'venue_reveal.actor_required: %', p_party_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
```

with the return contract written into the header (`:375-382`):

```
--   success  {"ok": true,  "act_id": "<uuid>", "revealed_at": <timestamptz|null>}
--   refusal  {"ok": false, "reason": "<code>", "revealed_at": <timestamptz|null>}
```

Two rules travel with it and both matter here:
- **the actor is an argument** (`:330-339`) — every path arrives via the service
  client, under which `auth.uid()` is null, so a trigger would record nobody;
- **refusals are `RETURN`s, not exceptions** (`:341-351`) — PostgREST puts the
  entire failing row in `error.details`, and a `production_plan` row carries
  `venue_word`. That is the same exit `44-RESEARCH.md` Pitfall 10 names.

---

### `src/lib/production/ics/*.ts` (utility, pure, transform)

**Analog:** `src/lib/door/classify.ts` — the repository's only other
*classify-after-the-fact, no I/O* module, and it states the purity contract as a
sentence rather than leaving it to be inferred.

**Purity docblock pattern** (`classify.ts:37-41`) — copy this claim verbatim in
substance for each of the five modules:

```
 * Pure by design: the imports below are all `import type`, so this module has no
 * runtime dependency at all — no Supabase client, no `fetch`, no React, no
 * `Date.now()` in any decision. It takes the night's rows and returns what the
 * list shows and what the counters count.
```

For this phase the list grows by three, and each has a measured reason
(`44-RESEARCH.md` §Dates and times, §Import Path): **no `new Date`, no
`toISOString`, no `fs`**. `anchors.ts` resolves a weekday on a civil `YYYYMMDD`
prefix and constructs no `Date` at all.

**Literal-source pattern** (`src/lib/door/outcome.ts:1-30`) — the model for the
piece-kind vocabulary, the three `unresolved_reason` codes and the class names:

```
 * This module is the source. It imports nothing — not even `@/types/database`,
 * which will import *from here* — so that a divergence between the two paths is
 * a type error at `npm run build`. In a repository with no test runner, that
 * build is the only automatic gate there is.
 *
 * ── Cross-check 1: the SQL mirror ────────────────────────────────────────────
 * `DoorScanCause` and `DoorSubjectType` are duplicated as SQL `CHECK`
 * constraints on `public.door_scan_events` in this phase's migration.
 * `next build` catches the TypeScript side, the `CHECK` catches the SQL side,
 * and the two agree only because they were written once *here* and copied.
 * Editing either literal set means editing both, in the same commit.
```

That cross-check is **real** for this phase: `44-RESEARCH.md` §Migration Shape
puts `kind`, `origin` and `unresolved_reason` behind SQL `CHECK`s. Unlike a
capability key (`keys.ts:17-21`, *a capability key has no such mirror*), these
literals do have one — say so, because it changes what a green build proves.

**Three-findings discipline** (`staff-tabs.ts:150-175`, quoted in
`44-RESEARCH.md` §Code Examples) — the classifier's failures stay separate:

```ts
for (const tab of DECLARED) {
  const resolution = resolveRoute(tab.href);

  if (resolution === null) {
    throw new Error(
      `staff-tabs: the "${tab.label}" tab points at "${tab.href}", which no entry ` +
        `of CAPABILITY_ROUTES binds. […]`
    );
  }

  if (resolution.key !== tab.capability) {
    throw new Error(
      `staff-tabs: the "${tab.label}" tab claims "${tab.capability}" opens ` +
        `"${tab.href}", but CAPABILITY_ROUTES binds that address to ` +
        `"${resolution.key}" (pattern "${resolution.pattern}"). […]`
    );
  }
}
```

> Two failures, two sentences. *Unclassified*, *unsupported recurrence* and
> *divergent number* are **three** findings and never one "problem"
> (`meta-gates.md`, the newsletter precedent).

**`reconcile.ts` diverges from the analog on one axis, deliberately:** it
returns a plan and performs no write, so a dry run is possible. `classify.ts`
has no write to withhold; state the divergence in the docblock the way
`formats/actions.ts:41-51` states its own.

---

### `scripts/verify-ics-import.mjs` (verification script, file-I/O)

**Analog:** `scripts/verify-media-strip.mjs` (lettered checks, refuse vs fail)
and `scripts/verify-tokens.mjs` (the *what a green does NOT mean* section, which
is this repository's signature and is not optional).

**Header pattern** (`verify-tokens.mjs:1-70`, abridged):

```
 * WHAT IT ASSERTS, in one sentence: **…**
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST ON ONE FILE. There is no test runner in
 * this repository, and — more to the point — the build cannot see this failure.
 * […]
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *   - A grep reads DECLARATIONS, NOT INTENT. […]
 *   - It does NOT say a colour is RIGHT. […]
 * ── THE SIX CHECKS ──────────────────────────────────────────────────────────
 *   A. …
```

**Per-check + verdict pattern** (`verify-media-strip.mjs`, tail):

```js
if (dPart.length === 0) {
  console.log(`  ✓ D  ${ROW_15} drops the upload policy by the name …`);
} else {
  console.log('  ✗ D  the door toward the public bucket is not closed in the migrations:');
  for (const line of dPart) console.log(`         ${line}`);
  failures.push('D');
}

// ── verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length === 0) {
  console.log('  MEDIA_STRIP_OK — all five checks passed.');
  console.log('  Read the header before treating this as safety: …');
  process.exit(0);
}
console.log(`  MEDIA_STRIP_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`);
process.exit(1);
```

**Exit-code contract** (`verify-all.mjs:26-35`) — and this phase's check is the
one that needs the third code:

```
 *   1. **A REFUSAL IS NOT A FAILURE.** `verify-tokens.mjs` sets the convention
 *      every gate in this phase follows — `0 = passed · 1 = failed · 2 =
 *      refused`, and *"a refusal is not a failure: it means the measurement did
 *      not happen."*
```

Two phase-specific constraints on top of the analog, both from
`44-RESEARCH.md` §Confidentiality Controls:
1. **Output is counts only** — no `SUMMARY`, no date, no venue word. The analogs
   already print counts and constraint names; this one must never print a line
   of the file.
2. **It is NOT registered in `scripts/verify-all.mjs`** — `verify-all.mjs:38-45`
   is the precedent for naming a gate it does not run (`NEEDS_SERVER`), and the
   reason travels exactly: *«a green that quietly covers fifteen of sixteen
   gates is a green that lied by omission»*. Here the missing precondition is
   `docs/`, so the check gets its own `verify:ics` entry and a line in the manual
   procedure, and skips **loudly** (exit 2) when no `docs/*.ics` is present.

---

### `scripts/import-production-calendar.mjs` (local runner, service role)

**Analog:** `scripts/rls-baseline.mjs:191-224` — the only script here that reads
credentials and talks to Supabase.

**Env pattern** (`rls-baseline.mjs:206-224`):

```js
const envFile = `${ROOT}/.env.local`;
…
  fail(`FATAL: .env.local exists but could not be parsed: ${error.message}`, 2);
…
const token = process.env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
…
  'Set them in .env.local (gitignored) or in the environment. Nothing was measured.',
```

*"Nothing was measured"* is the sentence to keep: a missing key is a refusal
(exit 2), never a silent no-op — and for an **import** the equivalent sentence is
*nothing was written*.

**Deliberate divergence:** this runner writes. `rls-baseline.mjs` only reads, so
the analog gives the env shape and not the write shape. The write shape comes
from `formats/actions.ts` — `getServiceClient()`, and a dry-run flag that prints
the `reconcile()` plan without applying it.

---

### `src/lib/capabilities/keys.ts` (modify — config / literal source)

**Analog:** its own thirteenth key. Two edits, both mandatory, and the file says
a missing description is a `npm run build` error (`keys.ts:157-173`).

**Key + docblock pattern** (`keys.ts:86-108`, the argument shape to reproduce for
the fourteenth):

```
 * ── The thirteenth, added by plan 37-01 ──────────────────────────────────────
 *
 * `VENUE_REVEAL` is the naming rule applied a fourth time […]
 *   - On `STAFF_MANAGE` it would inherit `requires_approved = false`, so an
 *     organizer whose own access was never approved could publish a night's
 *     address. That flag is `false` for the DOOR's reason […] and nobody is
 *     standing in a queue while an address goes out. The reason does not travel.
 *   - On `CATALOGUE_MANAGE` the shape would be right and the question wrong […]
 *   - On `PARTY_MANAGE` it would arrive from a per-night assignment and expire
 *     with the night (D-37-15).
```

`44-RESEARCH.md` §Access already writes the four-candidate rejection table for
this phase in exactly this form. Copy the **structure** — one bullet per rejected
key, naming the direction of the mistake.

**Entry pattern** (`keys.ts:151-152` + `:197-198`):

```ts
  /** Reveal a night's secret venue by hand. Role AND approved. */
  VENUE_REVEAL: "venue.reveal",
} as const;
```
```ts
  "venue.reveal":
    "Reveal a night's secret venue by hand, before the automatic window, and send the address to everyone entitled to it. Requires an APPROVED staff role on both grants (D-37-14) because the act is irreversible — staff.manage ignores status ON PURPOSE, …",
```

> The description is the string the migration inserts. Same commit, same bytes
> (`keys.ts:29-36`).

---

### `src/lib/routes/capability-routes.ts` (modify — route map)

**Analog:** the `CATALOGUE_MANAGE` entry, `:434-437` — a key that opens **one**
address and also gates tables. That is this phase's shape exactly.

```ts
  [CAP.CATALOGUE_MANAGE]: {
    routes: ["/admin/formats"],
    alsoGatesTables: true,
  },
```

**The trap, documented in the same file** (`:466-475`) — the plan must land on
the `routes` branch, not `scope: "table"`:

```
 * Adding `routes: [...]` here would be the mistake this file already records
 * once, in the opposite direction, at the `CATALOGUE_MANAGE` entry: a page
 * bound to a `scope: "table"` key is unreachable **for everyone**, with no
 * build error and nothing in a log.
```

**`alsoGatesTables` is not optional** — the key gates five tables, and omitting
it produces no error, which is the *declaration that lies by omission*
(`:153-154`, D-34-11).

**The page-before-the-check note** (`:424-432`) applies verbatim — a map entry
whose page is not on disk yet is a plan not yet run, and
`_everyStaffRouteIsBound` (`:504-534`) only starts seeing the address once a
`page.tsx` serves it:

```
 * ── The page is not on disk yet, and that is not an error ───────────────────
 * `_everyStaffRouteIsBound` below asks the opposite direction — *a route in
 * the generated union with no binding* — so it will not see `/admin/formats`
 * until plan 36-09 creates the page […]
```

**Ambiguity check** (`:238-241`) — the load-time throw at the foot of the file
kills the application on first import if two patterns tie. `/admin/calendar` is
two literal segments and every existing two-segment `/admin/*` pattern is literal
and distinct, so it does not fire. Re-verify if the address chosen is dynamic
(`44-RESEARCH.md` A7).

---

### `src/lib/routes/staff-tabs.ts` (modify — nav)

**Analog:** the Formats entry, `:107-130`, which is the *page first, tab second*
precedent in writing:

```ts
  // ── THE FORMATS TAB, AND WHY IT COULD NOT LAND BEFORE ITS PAGE ────────────
  //
  // `StaffTab.href` is `Route` and NOT `string`, and that is the property that
  // makes this file's promise keepable: a menu cannot draw a link to an address
  // nobody serves, because a STATIC address enters the generated union only once
  // a `page.tsx` serves it. […]
  //
  // The two ways to make it compile early were weighed and rejected […]
  // widening `href` would turn `typedRoutes` off for every tab above […] and
  // asserting the type on this one entry […] would compile, and would be a hole
  // outliving the week it was needed […]
  { href: "/admin/formats", label: "Formats", capability: CAP.CATALOGUE_MANAGE },
```

Copy the entry shape and the **sequencing constraint**: the tab plan depends on
the page plan. Both workarounds stay rejected.

---

### `src/app/(admin)/admin/(work)/calendar/page.tsx` (route, request-response read)

**Analog:** `src/app/(admin)/admin/(work)/formats/page.tsx` — same route group,
same *page asks a key of its own* posture, same fetch-and-lay-out-only role.

**Imports** (`formats/page.tsx:1-10`):

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import FormatsCatalogue, {
  RetiredFormatsList,
  type CatalogueFormat,
} from "@/app/(admin)/admin/formats/FormatsCatalogue";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
```

> Note the absolute specifier into `admin/formats/` — R-WORK-ROUTES
> (`nextjs-architecture.md`): route files alone inside `(work)`, every non-route
> module one level out.

**Guard pattern** (`formats/page.tsx:51-61`):

```ts
export default async function AdminFormatsPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09), and a page that stops asking is a page protected by a
  // redirect alone.
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.CATALOGUE_MANAGE)) {
    redirect("/dashboard");
  }
```

**The paragraph to copy in substance** (`formats/page.tsx:20-39`) — why this page
asks a different key from its neighbours, and what the three readers are. It is
criterion 4 written as a docblock:

```
 * And it is the key `src/lib/routes/capability-routes.ts` binds to this address
 * (plan 36-06). That is the part that is not a preference: the middleware reads
 * that entry, this guard reads that entry, and the staff tab reads that entry.
 * Three readers, one declaration, so they cannot disagree (D-34-09/D-34-10).
```

**Untyped-select pattern** (`formats/page.tsx:224-253`) — mandatory here too,
because no client in this repository carries the `Database` type:

```ts
/*
  The shapes, spelled out here because nothing checks them for us.

  No Supabase client in this repository is parameterised with `Database`
  (measured at four call sites in `36-06-SUMMARY.md`), so `.select("…")` returns
  values the compiler cannot relate to a column. A green `npm run build` proves
  the JSX type-checks against these declarations; it proves nothing about whether
  a column is spelled the way the applied migration spells it. Every name in the
  two selects above was read out of `20260810120000_formats_and_series.sql` by
  hand — that is the only check performed on them.
*/
interface RawFormat {
  id: string;
  …
  retired_at: string | null;
  sort_order: number;
}
```

**Empty-state pattern** (`formats/page.tsx:153-161`) — a class string, not a
component (`41-UI-SPEC.md` §8.11):

```tsx
{formats.length === 0 && (
  <div className="px-6 py-12 text-center">
    <p className="text-base font-semibold text-ink">No formats yet</p>
    <p className="mt-1 text-sm text-muted">
      A night cannot be saved without a format. Add the first one.
    </p>
  </div>
)}
```

> Divergence to declare: this page is `width="wide"` (`44-UI-SPEC.md` §8.1),
> where the analog is `default` and argues for it at `:136-146`. The wide list is
> closed and this phase adds an entry to it **by decision**.

---

### `src/app/(admin)/admin/(work)/calendar/[id]/page.tsx` (route, dynamic read)

**Analog:** `src/app/(admin)/admin/(work)/venues/[slug]/page.tsx` — the only
`(work)` detail page that is a gated read of an internal record.

**Imports and shape** (`venues/[slug]/page.tsx:1-10`):

```ts
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
```

**The reachability paragraph** (`venues/[slug]/page.tsx:31-40`) — reproduce it,
because it is the mistake this phase invites in the same shape:

```
 * ── Reachability is the map's answer, never this directory's ─────────────────
 * `admin` in the URL is an address, not an authorisation
 * (`nextjs-architecture.md`, gate *il gruppo non autorizza*). What decides is the
 * row `"/admin/venues/[slug]"` under `CAP.ORGANIZER_ACCESS` in
 * `src/lib/routes/capability-routes.ts`, next to its sister `"/admin/venues"` —
 * one entry read by the middleware, by the guard below and by the navigation, so
 * the three cannot disagree.
 *
 * ⚠️ `next build` would NOT have caught a missing row here: the backward […]
```

> **The dynamic sister address needs its own entry in the map** — `/admin/calendar`
> and `/admin/calendar/[id]` are two patterns under one key, exactly as
> `/admin/venues` and `/admin/venues/[slug]` are. A dynamic second segment
> re-opens the ambiguity check (`capability-routes.ts` foot; `44-RESEARCH.md` A7).

---

### `src/app/(admin)/admin/(work)/calendar/loading.tsx` (+ `[id]/`)

**Analog:** `src/app/(admin)/admin/(work)/members/loading.tsx` — same shell
width, same gated-list problem.

```tsx
import { PageShell } from "@/components/ui/PageShell";
import { SkeletonCard, SkeletonLine } from "@/components/ui/Skeleton";

export default function MembersLoading() {
  return (
    <PageShell width="wide">
      <header className="mb-6">
        <SkeletonLine className="h-9 w-40" />
      </header>
      …
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}
```

**The two rules that travel** (`members/loading.tsx` docblock):

```
 * So a placeholder here **must not leak a count or a name**. The eight cards
 * below are a **literal** […] It says *a list is coming*, never *this many
 * people exist*.
 *
 * `wide`, because `/admin/members` is on §4's closed wide list. A placeholder
 * at a different maximum from the page it precedes makes the content jump
 * sideways the moment the data lands […]
```

Both apply with more force here: a placeholder count on the calendar would be a
count of unannounced dates. And `Skeleton` is the primitive — **not** a
hand-rolled `animate-pulse` (`44-UI-SPEC.md` §12).

---

### `src/app/(admin)/admin/calendar/actions.ts` (server action, write)

**Two analogs, and the plan needs both.**

**Analog A — `src/app/(admin)/admin/formats/actions.ts`: refusal as a returned
value.** This is the pattern `44-RESEARCH.md` §Don't Hand-Roll names and
`44-UI-SPEC.md` §9.3 relies on.

Imports (`formats/actions.ts:1-7`):

```ts
"use server";

import { revalidatePath } from "next/cache";
import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { getServiceClient } from "@/lib/supabase/service";
```

The non-exported gate (`:73-106`) — **called first in every export**:

```ts
/**
 * […]
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

> It **returns the context** so no export re-asks — `44-RESEARCH.md` Pitfall 11:
> *more than one `await assert…(` in one exported action is the defect, and no
> build sees it.* And the service client is constructed **after** the check.

The result type (`:269-271`) and the read helper that distinguishes *no* from *I
could not find out* (`:275-300`):

```ts
export type CatalogueResult =
  | { ok: true; id: string }
  | { ok: false; reason: CatalogueRefusal };
```
```ts
/** `null` means the read itself failed — never "no". */
async function colorHeldByActiveFormat(…): Promise<boolean | null> {
  …
  if (error) {
    console.error(
      `[catalogue.precheck_failed] colour lookup: ${error.code ?? "unknown"} ${error.message}`
    );
    return null;
  }
  return (data?.length ?? 0) > 0;
}
```

> `null` ≠ `false` is OBS-03 at the data layer, and it is what `44-UI-SPEC.md`
> §8.5's *`We could not count`* renders. And note the logging rule
> (`formats/actions.ts:53-67`): `error.code` and `error.message`, **never** the
> error object and never PostgREST's third field, which carries the rejected row.
> Here that row carries `venue_word`.

**The divergence paragraph to copy in form** (`:41-51`), because this phase
diverges from three siblings the same way:

```
 * ── Refusals are RETURNED, and this diverges from three siblings on purpose ───
 * `admin/venues/actions.ts:174-180`, `admin/artists/actions.ts:189` and
 * `admin/events/[id]/tickets/actions.ts:288` all throw an `Error` whose message
 * carries the cause. Next **redacts** the message of an error thrown out of a
 * Server Action in a production build (`src/lib/capabilities/server.ts:59-63`),
 * so that cause works in `next dev` and reaches the user as a blank where it
 * counts — a refusal nobody can read is a silent failure (`meta-gates.md`) […]
```

**Analog B — `src/app/(admin)/admin/events/[id]/reveal/actions.ts`: the
consequential act.** The announcement is this phase's reveal-shaped path, and its
docblock argues every point the announcement needs (`reveal/actions.ts:16-58`):

```
 * ── Why the gate is re-asked here, and it is not belt-and-braces ─────────────
 * A server action is a **public endpoint with a convenient signature**. Every
 * export below is invocable directly by anybody who can reach the deployment,
 * with a forged body, and being imported from a page that `organizer.access`
 * opened protects none of it (`nextjs-architecture.md`, gate *server action
 * autorizzata*).
 *
 * ── Why the SERVICE client, for the reads as well as the write ───────────────
 * […] `access-gating.md` requires a new service-client use to be justified in
 * writing and to prove no untrusted input reaches it: `partyId` is shape-checked
 * against `UUID_PATTERN` before any query, and `eventId` never reaches the
 * database at all — it is compared in JavaScript against the night's own
 * `event_id`.
```

Shape checks to copy (`formats/actions.ts:111-113`):

```ts
/** The same shape as `[id]/assignments/actions.ts:85-86`. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

**Two exports, and only two** (`44-UI-SPEC.md` §0 rule 4): the checklist tick and
the announcement. **No import export** — D-44-26 closed the upload, and
`44-UI-SPEC.md` §11.3 supersedes `44-RESEARCH.md` §Import Path on this point.
The parser must **not** be re-exported from `actions.ts`: every export of a
`"use server"` module is a public endpoint (`formats/actions.ts:83-85`).

---

### `src/app/(admin)/admin/calendar/CalendarList.tsx` + row components

**Analog:** `src/components/admin/MemberTable.tsx` — the repository's fullest
`DataTable` consumer.

**Column pattern** (`MemberTable.tsx:1052-1083`) — this is the shape
`44-UI-SPEC.md` §8.2's slot table compiles to:

```ts
const columns: DataColumn<MemberRow>[] = [
  { key: "name",   header: "Name",   card: "title",    cell: (member) => member.full_name || "--" },
  { key: "email",  header: "Email",  card: "subtitle", cell: (member) => member.email },
  { key: "role",   header: "Role",   card: "mark",     cell: (member) => <RoleBadge role={member.role} /> },
  { key: "status", header: "Status", card: "mark",     cell: (member) => <StatusBadge status={member.status} /> },
  { key: "joined", header: "Joined", card: "meta",     cell: (member) => formatJoined(member.created_at) },
];
```

Imports (`MemberTable.tsx:27-28`):

```ts
import { Badge, Chip } from "@/components/ui/Chip";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
```

**Badge pattern** (`MemberTable.tsx:179`, `:207-210`) — the model for
`StageBadge` and for the four marks:

```tsx
<Badge className={role === "staff" ? "border-dashed" : ""}>{role}</Badge>
```
```tsx
function StatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={status === "pending" ? "emphasis" : "neutral"}>{status}</Badge>;
}
```

> `tone="emphasis"` is spent on **one meaning per surface**. Here it is `Late N`
> and `Diverged` only (`44-UI-SPEC.md` §5.3); the stage words and the other two
> marks are `neutral`, and no stage carries a hue.

**Structural guarantee for `CommitmentRow`** — no analog states it, so the plan
must: the component receives **no** format, series or number prop at all, which
mirrors `production_commitment`'s deliberately absent columns. The precedent for
*making a rule a guarantee by removing the column* is the migration's own
`no write policy` reasoning (`20260810120000…:452-461`).

---

### `src/app/(admin)/admin/calendar/ChecklistItem.tsx` (client, action call)

**Analog:** `src/app/(admin)/admin/formats/FormatsCatalogue.tsx` — the only
client component that consumes a returned refusal and turns it into a sentence.

**Call + branch** (`FormatsCatalogue.tsx:213-220`):

```ts
const result = await setFormatListed(format.id, next);

if (!result.ok) {
  setNotice({
    id: …,
    sentence: describeListingRefusal(result.reason, next),
  });
}
```

**Refusal-copy pattern, with the subset assertion** (`:128-154`):

```ts
type ListingRefusal =
  | "invalid_id" | "invalid_listed" | "format_not_found" | "write_failed";

/** Turns red the day a member above stops existing in the union it copies. */
type _ListingIsSubset = ListingRefusal extends CatalogueRefusal ? true : never;
const _listingIsSubset: _ListingIsSubset = true;
void _listingIsSubset;

function describeListingRefusal(reason: CatalogueRefusal, listed: boolean): string {
  const act = listed ? "show this format on /events" : "take it off /events";

  switch (reason as ListingRefusal) {
    case "invalid_id":
      return `Could not ${act}. This format could not be identified. Reload the page and try again.`;
    …
    default:
      return `Could not ${act}. The catalogue refused this with "${reason}", which this surface does not expect. Nothing changed.`;
  }
}
```

Three things travel: **one sentence per reason** (never a shared "something went
wrong"), **the `default` arm that names the unexpected code rather than hiding
it**, and **the compile-time subset assertion** so the copy map cannot silently
fall behind the action's union. `44-UI-SPEC.md` §13.2 already writes this
phase's sentences — *you may not* and *it did not save* are two, never one.

**The checkbox itself:** `Checkbox` from `src/components/ui/Checkbox.tsx`, real
`<input type="checkbox">`, `htmlFor` label, 44×44 hit area
(`44-UI-SPEC.md` §9.3). And the tick is **reversible** — it is not a monotone
guard, and the plan should say so where the wrong precedent is nearest.

---

### `src/app/(admin)/admin/calendar/AnnounceNightDialog.tsx` (client, confirmation)

**Analog:** `src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx` —
the only existing confirmation for an act with an irreversible consequence.

**Primitive contract** (`src/components/ui/Dialog.tsx:158-234`):

```ts
export type DialogSize = "md" | "lg";
export type DialogStatusTone = "done" | "crit";
export interface DialogStatus { … }
export function Dialog({ … })
```

The outcome is reported **in the dialog's own panel** via `DialogStatus`, never a
toast (`Dialog.tsx:173-192`), cancel is the autofocus target, and there is no
Enter-to-confirm (`44-UI-SPEC.md` §11.2, `41-UI-SPEC.md` §11).

The body's second paragraph — *announcing spends this night's series number* —
is the surfacing of `bump_series_watermark` (`20260810120000…:590-607`), the
monotone guard quoted in full above. The person pressing the button is the person
who needs to know it.

---

## Shared Patterns

### Authentication / capability check

**Source:** `src/app/(admin)/admin/formats/actions.ts:89-106` (action) and
`src/app/(admin)/admin/(work)/formats/page.tsx:57-61` (page).
**Apply to:** every page and every Server Action of this phase.

```ts
const { capabilities, userId } = await getAccessContext();
if (!capabilities.has(CAP.<THE_NEW_KEY>)) { /* redirect | return refusal */ }
```

Three readers, one declaration — middleware, page guard, and the tab — all
resolve through `src/lib/routes/capability-routes.ts`. **The RLS policy is the
fourth reader and the only boundary**: `CLAUDE.md` principle 2, restated at
`staff-tabs.ts:20-28`:

```
 * ── Hiding a nav item is not protecting a route ──────────────────────────────
 * […] A viewer who never sees a tab is not thereby refused the address — the
 * refusal is the middleware's, and the boundary on the DATA is the RLS policy
 * in the migrations.
```

### Error handling — three categories, never one

**Source:** `src/lib/capabilities/guards.ts:64-77`.
**Apply to:** every action, every parser branch, every script check.

```
 * ── Errors: two categories, never one ────────────────────────────────────────
 * `assertEventOwnership` distinguishes "you may not" from "I could not find
 * out". This project has **no error tracking** […] and a `catch` that collapses
 * the two is the recorded newsletter defect […] There is no `catch` in this file.
 *
 * **And a category that must cross to a client cannot travel in the message.**
 * Next redacts the message of an error thrown out of a Server Action in a
 * production build, so `err.message.startsWith("forbidden.")` works in
 * `next dev` and silently stops working in the deployment where it matters
```

### Observability without monitoring

**Source:** the absence of any monitoring dependency in `package.json`, and
`meta-gates.md`.
**Apply to:** the import run, the divergence report, the unclassified count.

`production_import_run` rendered at the foot of S1 is this phase's observable
effect. A log line is a place nobody looks; a row the surface draws is a fact a
human sees. Every tally is a real count or a sentence saying it could not be
read — **never `0` standing in for "we did not measure"** (OBS-03,
`44-UI-SPEC.md` §10).

### Confidentiality — UIDs and reason codes, never text

**Source:** `20260810160000_manual_venue_reveal.sql:353-358` and
`formats/actions.ts:53-63`.
**Apply to:** every diagnostic, every log, every script output, every error
return, every planning and verification document this phase writes.

```sql
-- ── WHAT IS DELIBERATELY NOT READ HERE ──────────────────────────────────────
-- `venue_text`, `venue_id`, `venue_secret_hint` and the actor's email. Any of
-- them would be one interpolation away from a `RAISE EXCEPTION`, and a raised
-- message reaches a log and a log reaches a screenshot on a PUBLIC repository.
-- The two messages below name an IDENTIFIER and nothing else.
```

There is a second, sharper precedent for **not writing the forbidden literal even
in the sentence forbidding it** (`formats/actions.ts:58-63`): *a grep whose only
match is the sentence forbidding the thing is a grep that gets ignored the third
time it goes red.* Check U9 of `44-UI-SPEC.md` §15 already applies this to the
reversed glyph; the same discipline governs `SUMMARY`.

### Verification, in a repository with no test runner

**Source:** `CLAUDE.md` Guardrail 1, `meta-gates.md`, `scripts/verify-all.mjs`.
**Apply to:** every plan's verification section.

- Per task commit: `npm run build` (which is also the typecheck).
- Per wave merge: `npm run verify` + `npm run verify:ics` (locally) +
  `npm run verify:persona` if any rules file was touched.
- `npm run verify:capabilities` is **RED between the commit adding the key and
  the deploy applying the migration** — expected, and it must be said out loud
  rather than discovered (`keys.ts:168-172`).
- No plan step may claim a product change is verified because tests pass.
- Every assertion added to a verify script carries the **mutation obligation**
  (`ai-engineering.md` *gate prova per mutazione*): break it, confirm it fires,
  restore — and assert the mutation landed before reading the result.

---

## No Analog Found

Files with no close match in the codebase. The planner should build them from
`44-UI-SPEC.md` and `44-RESEARCH.md` rather than from an existing file.

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/app/(admin)/admin/calendar/PieceDate.tsx` | component | — | Nothing in this tree renders a **discriminated union of date-or-reason**. The closest structural precedent is `src/lib/door/outcome.ts`'s three-outcome union and `formats/actions.ts`'s `CatalogueResult`, but neither is a renderer. The contract is written in full at `44-UI-SPEC.md` §7 — five variants, a date with no origin unrepresentable — and it mirrors the two CHECK constraints on `production_piece`. Build it from the spec; it is the phase's highest-risk component and has no shortcut |
| `src/app/(admin)/admin/calendar/ImportRunSummary.tsx` | component | — | No surface in this repository renders the observable effect of a batch job — there is no import, no job table, and no monitoring. `44-UI-SPEC.md` §10 is the whole specification. The nearest habit to borrow is `Card` + `SectionHeading` and the OBS-03 rule that a tally is a count or a sentence |

**Partial, and worth flagging:** `scripts/import-production-calendar.mjs` is
scored `role-match` rather than `exact` because no script in `scripts/` writes to
Supabase today — `rls-baseline.mjs` reads. The env-and-refuse half comes from the
analog; the write half comes from `formats/actions.ts`.

---

## Sequencing constraints the analogs impose

These are properties of the analog files, not preferences, and they order the
plans:

1. **`keys.ts` and the migration's capability rows are one commit**
   (`keys.ts:29-36`). The description string is shared bytes.
2. **The page exists before the tab** (`staff-tabs.ts:107-130`). `StaffTab.href`
   is `Route`; a static address enters the generated union only once a `page.tsx`
   serves it, and both workarounds are rejected in that file.
3. **The map entry may precede the page** (`capability-routes.ts:424-432`) — a
   map entry with no page is a plan not yet run, and `_everyStaffRouteIsBound`
   asks the opposite direction.
4. **`scripts/verify-ics-import.mjs` before anything trusts the parser**
   (`44-RESEARCH.md` §Wave 0 gaps) — the golden-file check is what makes the
   hand parser defensible instead of a dependency-avoidance.
5. **`verify:ics` gets its own `package.json` entry and stays out of
   `verify-all.mjs`** (`verify-all.mjs:38-45`, the `NEEDS_SERVER` precedent).

---

## Metadata

**Analog search scope:** `src/lib/routes/`, `src/lib/capabilities/`,
`src/lib/door/`, `src/lib/venue-reveal/`, `src/components/ui/`,
`src/components/admin/`, `src/app/(admin)/admin/(work)/`,
`src/app/(admin)/admin/{formats,venues,events/[id]/reveal}/`,
`supabase/migrations/` (last 15), `scripts/`.

**Files read for excerpts:** 16.
**Files not opened, deliberately:** `docs/Music-*.ics` — this document is a
publication (D-44-04).

**Pattern extraction date:** 2026-08-15
