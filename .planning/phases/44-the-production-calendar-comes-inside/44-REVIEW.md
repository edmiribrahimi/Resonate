---
phase: 44-the-production-calendar-comes-inside
reviewed: 2026-08-15T00:00:00Z
depth: deep
files_reviewed: 22
files_reviewed_list:
  - supabase/migrations/20260815120000_production_calendar.sql
  - supabase/migrations/20260815120100_production_calendar_access.sql
  - supabase/migrations/20260815120200_production_checklist_tick_revoke.sql
  - src/lib/production/ics/index.ts
  - src/lib/production/ics/unfold.ts
  - src/lib/production/ics/anchors.ts
  - src/lib/production/ics/reconcile.ts
  - src/lib/production/ics/classify.ts
  - src/lib/production/ics/parse.ts
  - src/lib/production/ics/vocabulary.ts
  - src/lib/capabilities/keys.ts
  - src/lib/routes/capability-routes.ts
  - src/lib/routes/staff-tabs.ts
  - src/types/database.ts
  - src/utils/datetime.ts
  - src/app/(admin)/admin/(work)/calendar/page.tsx
  - src/app/(admin)/admin/(work)/calendar/[id]/page.tsx
  - src/app/(admin)/admin/calendar/actions.ts
  - src/app/(admin)/admin/calendar/AnnounceNightDialog.tsx
  - src/app/(admin)/admin/calendar/CalendarList.tsx
  - src/app/(admin)/admin/calendar/ChecklistSection.tsx
  - src/app/(admin)/admin/calendar/ImportRunSummary.tsx
  - src/app/(admin)/admin/calendar/PieceDate.tsx
  - src/app/(admin)/admin/calendar/StageBadge.tsx
  - src/app/(admin)/admin/calendar/dates.ts
  - scripts/import-production-calendar.mjs
  - scripts/verify-calendar-surface.mjs
  - scripts/verify-all.mjs
  - scripts/verify-capabilities.mjs
findings:
  critical: 1
  warning: 10
  info: 0
  total: 11
status: issues_found
---

# Phase 44: Code Review Report

**Reviewed:** 2026-08-15
**Depth:** deep (cross-file: SQL ↔ TypeScript ↔ script)
**Files Reviewed:** 22 source files across three migrations, the pure reader, both surfaces, both Server Actions and four scripts
**Status:** issues_found

## Summary

The four priorities this phase is most exposed on hold up under reading, and it is
worth saying which ones were **verified** rather than assumed:

- **Venue secrecy.** Both surfaces log `error.code` and `error.message` only, never
  the error object and never PostgREST's row-carrying third field
  (`(work)/calendar/page.tsx:193-195`, `[id]/page.tsx:242-244`, five sites in
  `actions.ts`). `announceNight` does not select `venue_word` at all
  (`actions.ts:583-591`), carries neither `venue_text` nor `venue_id` across
  (`:733-753`), and writes `venue_reveal_on_purchase: false` against a column whose
  database default is `true` — the one line that actually closes the
  reveal-as-a-side-effect path. The confirmation panel names no space.
- **Access control.** Both pages read through the cookie-bound client and construct
  no service client; both Server Actions call `assertProductionRead()` **before**
  `getServiceClient()` (`actions.ts:390/399` and `:564/570`); the `"use server"`
  module exports exactly two functions and four erased types. `record_checklist_tick`
  is now `REVOKE`d from `public, anon, authenticated` — the corrective third
  migration is right, and its diagnosis (Postgres grants EXECUTE to PUBLIC by
  default) is the real defect the second migration's prose had claimed away.
- **Monotone guards.** `production_plan_refuse_renumber` is `BEFORE UPDATE OF number`
  and uses `IS DISTINCT FROM`, so an erasure is refused too. `bump_series_watermark`
  is `AFTER INSERT`, so a refused night spends nothing. Neither is re-implemented.
- **Date logic.** No `new Date`, `toISOString`, `Intl.*` or locale formatter anywhere
  under `src/lib/production/` or either calendar surface. Anchors resolve by weekday
  from an anchor event; the `on` direction resolves inside the anchor's ISO week,
  which is exactly what makes the Friday-or-Saturday night one rule instead of two.

What does not hold up is the thing none of those checks could see: **the import
runner reads, writes and keys on a column that does not exist**, so the phase's only
data path refuses on its first database read — and the commit log records the real
import as deliberately not run, which is why nothing caught it. Beyond that, the
night detail page has no link into it from anywhere in the product, the double-press
guard on the announcement is a read-then-write with no atomicity, and the import
script's own leak audit cannot fail the run.

## Critical Issues

### CR-01: `production_plan.series_code` does not exist — the import runner cannot run at all

**File:** `scripts/import-production-calendar.mjs:816` (and `:837`, `:1158`, `:1184`, `:1207`)
**Verified by reading:** the migration, the generated types and the script.

`20260815120000_production_calendar.sql` declares `public.production_plan` with
`format_id`, `series_id` and `number` — and **no `series_code` column**. `series_code`
exists on `production_piece` only (`:351`, indexed at `:463-464`).
`src/types/database.ts`'s `ProductionPlan` interface agrees: it has no such field, and
it was confirmed against the live catalogue read-back in 44-07, not against the file.

The runner disagrees, in four places:

```js
// scripts/import-production-calendar.mjs:814-818
const planRows = await readAll(
  "production_plan",
  "id, source_uid, series_code, number, venue_word, date, start_time, end_time, …",
  "plan table"
);
```

PostgREST answers an unknown column with `42703`, and `readAll` turns any error into
`refuse("catalogue_unreadable", …)` → `process.exit(2)`. **That happens in Stage 4,
before the dry-run branch**, so `npm run import:calendar` refuses on every invocation
— with and without `--apply` — and the refusal names a category that points at the
catalogue rather than at the schema mismatch.

Removing the read alone does not fix it. The column is the runner's join key and its
write payload:

```js
// :836-839
function planKeyOf(row) {
  if (row.series_code === null || row.number === null) return null;
  return ics.joinKey(row.series_code, row.number);
}
// :1158  insert payload   series_code: row.seriesCode,
// :1184  update payload   series_code: row.seriesCode,
// :1207  read-back        "id, series_code, number"
```

so pieces and checklist items are placed by `planIdByKey` (`:1210-1214`), which would
be empty; every checklist item would be filtered out at `:1322`; and the
`series_changed` divergence at `reconcile.ts:760-763` would be unreachable.

**Why no compiler saw it.** `reconcile.ts` declares its own row shapes rather than
deriving them from `@/types/database`:

```ts
// src/lib/production/ics/reconcile.ts:336-341
export interface ExistingPlanRow {
  id: string;
  sourceUid: string;
  seriesCode: string | null;
  …
// :409-411
export interface PlanFields {
  seriesCode: string;
```

so the contract that says a plan row carries a series code is stated twice in
TypeScript and never once in SQL. `npm run build` cannot relate either to a column,
and `scripts/verify-ics-import.mjs` exercises the pure reader against a file with no
database in the loop.

**Fix — pick one and make it structural, not a patch at the call site:**

Either add the column forward (a new migration; the applied ones are history), which
keeps the runner and the reconciler as written:

```sql
-- supabase/migrations/2026…_production_plan_series_code.sql
BEGIN;
ALTER TABLE public.production_plan
  ADD COLUMN IF NOT EXISTS series_code text;
CREATE INDEX IF NOT EXISTS idx_production_plan_series_code_number
  ON public.production_plan (series_code, number);
COMMIT;
```

or derive the key in the runner from the column that does exist, and drop
`series_code` from all four payloads:

```js
// series_id is already read; siglaBySeriesId is already built at :697-716
function planKeyOf(row) {
  const sigla = row.series_id === null ? null : siglaBySeriesId.get(row.series_id) ?? null;
  if (sigla === null || row.number === null) return null;
  return ics.joinKey(sigla, row.number);
}
```

Whichever is chosen, `ExistingPlanRow` and `PlanFields` should be tied to
`ProductionPlan` (a `Pick`, as both pages already do for their own row types) so the
next divergence is a build error rather than an exit 2 nobody ran.

## Warnings

### WR-01: the double-announce guard is a read-then-write, and one legitimate case slips it entirely

**File:** `src/app/(admin)/admin/calendar/actions.ts:618-620`, `:733-756`, `:823-826`

`announceNight` reads `linked_party_id`, refuses if set, then — several round trips
later — writes it:

```ts
if (plan.linked_party_id !== null) {
  return { ok: false, reason: "already_announced" };
}
…
const { error: linkError } = await client
  .from("production_plan")
  .update({ linked_party_id: createdParty.id })
  .eq("id", plan.id);
```

Nothing makes that pair atomic: `production_plan` carries no unique constraint on
`linked_party_id` (migration §1), and the update has no `linked_party_id IS NULL`
predicate. Two concurrent calls both read `null`.

For a night **with** a progressivo the collision is caught downstream by
`event_parties_format_series_number_unique` and comes back as `number_taken`, with
the orphan container cleaned up — that path is fine. For a night with a **null**
progressivo it is not: the docblock at `:213-225` and the migration at `:213-225`
both state that a night which is the opening act of another legitimately has no
number, `announceNight` has no `number_missing` refusal, and Postgres treats two
NULLs as distinct — so both inserts succeed, two nights exist for one plan row, and
the second `update` silently overwrites the first link, orphaning a night that no
calendar row points at.

**Fix:** make the link the guard, and read what it affected.

```ts
const { data: linked, error: linkError } = await client
  .from("production_plan")
  .update({ linked_party_id: createdParty.id })
  .eq("id", plan.id)
  .is("linked_party_id", null)   // the guard, at the write
  .select("id");

if (linkError) { /* … link_failed, as today */ }
if (!linked || linked.length === 0) {
  // Somebody else linked this row between the read and here. The night this call
  // created is the loser; say so with its own code rather than reporting success.
  return { ok: false, reason: "link_failed" };
}
```

A unique index on `production_plan (linked_party_id) WHERE linked_party_id IS NOT NULL`
would close the same hole in the database, which is where the phase puts its other
guard.

### WR-02: `/admin/calendar/[id]` is unreachable from anywhere in the product

**File:** `src/app/(admin)/admin/calendar/CalendarList.tsx:295-371`, `src/lib/routes/staff-tabs.ts:132`

The list declares seven columns and none of them is a link; `DataTable`'s props
(`src/components/ui/DataTable.tsx:175-191`) expose `selection`, `expansion` and
`actions` and no row-href facility, and `CalendarList` passes none of the three. The
staff tab registers `/admin/calendar` only. A repository-wide grep for
`admin/calendar/` outside import specifiers and `revalidatePath` returns no
navigation.

So the night page — and with it **both** Server Actions this phase built, the tick and
the announcement — can be reached only by typing a UUID into the address bar. The
route entry, the RLS policies and the page guard are all correct; there is simply no
door.

**Fix:** give the Night column a link on the night branch (the row already carries
`id`, used as `rowKey`):

```tsx
cell: (row) => {
  if (row.kind === "night") {
    return (
      <Link href={`/admin/calendar/${row.id}`} className={LITERAL}>
        {nightTitle(row)}
      </Link>
    );
  }
  …
```

A commitment row must stay unlinked — it has no plan row to open, which is the same
absence `CalendarCommitmentRow` already enforces by having no such field.

### WR-03: the announcement's success message is destroyed by the refresh that follows it

**File:** `src/app/(admin)/admin/calendar/AnnounceNightDialog.tsx:344-354`, `:374-387`

```ts
router.refresh();
setOutcome( /* "…its series number is spent…" */ );
```

with, at the top of the render:

```tsx
if (alreadyAnnounced) {
  return <p className="text-sm text-muted">This night is already announced. …</p>;
}
```

`router.refresh()` re-renders the server component, which now reads
`linked_party_id !== null` and sends `alreadyAnnounced: true`. The early return then
replaces the whole `<Dialog>` subtree, unmounting it and taking the outcome text with
it. The comment at `:344-346` states the opposite intent — *the outcome stays on
screen to be read* — and the sentence it protects is the one that tells the operator
a one-way switch has fired.

**Fix:** hold the refresh until the panel is dismissed, and let the early return
respect a completed act:

```ts
setOutcome(…);
// and in close():
function close() { setRefusal(null); setOutcome(null); setOpen(false); router.refresh(); }
// and guard the early return:
if (alreadyAnnounced && outcome === null) { return <p …>…</p>; }
```

### WR-04: a failed output audit does not fail the import run

**File:** `scripts/import-production-calendar.mjs:1444-1483`, called at `:1098` and `:1416`

`auditOwnOutput()` is the script's own leak check — the measurement behind the claim
*this printed no material*. When it finds a residual title token or a four-digit year
it prints `✗ OUTPUT AUDIT FAILED` and `DO NOT PASTE THIS RUN ANYWHERE`, and then
**returns**. Both call sites continue straight into:

```js
say("  IMPORT_DRY_RUN_OK");   // :1100
…
say("  IMPORT_APPLIED_OK");   // :1419
process.exit(0);
```

So a run that leaked material exits `0` and ends with an OK token — the tail a human
skims and the only thing a wrapper could read. The script is otherwise scrupulous
about exit codes (`0` completed, `1` failed partway, `2` refused, documented at
`:151-160`); this is the one place where the observable effect and the exit status
disagree, on the check that exists because the leak is irreversible.

**Fix:** have the audit answer, and let the caller decide.

```js
function auditOwnOutput() { …; return leaked.length === 0 && years.length === 0; }

// at both call sites
const clean = auditOwnOutput();
say("");
say(clean ? "  IMPORT_APPLIED_OK" : "  IMPORT_APPLIED_WITH_LEAKED_OUTPUT");
process.exit(clean ? 0 : 1);
```

The writes have already happened at `:1416`, so the exit code must stay
distinguishable from `2` — the material leaked, the import did not fail.

### WR-05: U3's token list is narrower than U3's own sentence

**File:** `scripts/verify-calendar-surface.mjs:355-361`, against `src/app/(admin)/admin/calendar/actions.ts:657,674`

```js
const DATE_CONSTRUCTORS = [
  "new Date(", "toISOString", "toLocaleDateString", "toLocaleString", "Intl.DateTimeFormat",
];
```

titled *"the surface constructs no Date and formats through no platform API"*, over a
`SCOPE` that includes `src/app/(admin)/admin/calendar`. `Date.now(` is not in the
list, and the surface uses it twice:

```ts
let slug = base.length > 0 ? base : `night-${Date.now().toString(36)}`;
…
slug = `${slug}-${Date.now().toString(36)}`;
```

Those two are slug entropy, not civil dates, so the product is correct today. The
defect is the gate: the check's docblock says its exemption list is empty and stays
empty, and the honest way to keep that true is for the token list to cover the
platform clock and for these two lines to stop reading it. The check found and
removed a real `updated_at` on its first run — the same instinct that produced that
line reaches for `Date.now()` next.

**Fix:** add `"Date.now("` to `DATE_CONSTRUCTORS`, and give the slug its entropy from
a source that is not a clock:

```ts
const suffix = crypto.randomUUID().slice(0, 8);
let slug = base.length > 0 ? base : `night-${suffix}`;
```

### WR-06: `composeSigla` on the list documents a format-code fallback it does not implement, and could not

**File:** `src/app/(admin)/admin/(work)/calendar/page.tsx:378-391`, with the query at `:143-152`

```ts
/**
 * The format's code is the fallback for a night whose series is not resolved; …
 */
function composeSigla(row: PlanRow): string {
  const code = row.party_series?.code ?? null;
  if (code === null) return NO_SIGLA;
  return `${code}-${formatProgressivo(row.number)}`;
}
```

There is no fallback in the body, and there could not be: the select embeds
`formats ( name )` and never `formats ( code )`, and `PlanRow` has no field for it.
A night whose format resolved and whose series did not therefore prints `no sigla`
where half a sigla is available — and `no sigla` is a claim about the row, per this
file's own register.

The sibling on the night page (`[id]/page.tsx:534-547`) has the same body and the
**correct** docblock — *"The series code and not the format's"* — so the two
disagree about what the rule is. One of them is wrong; the code is consistent, the
prose is not.

**Fix:** either delete the sentence and align with `[id]`, or select
`formats ( name, code )`, widen `PlanRow`, and implement the fallback the sentence
promises.

### WR-07: two civil-date parsers in one phase, with different strictness

**File:** `src/lib/production/ics/anchors.ts:159-173` vs `src/app/(admin)/admin/calendar/dates.ts:133-174`

`dates.ts` reads a `YYYY-MM-DD` character by character and refuses anything that is
not an ASCII digit (`digitsToInt`). `anchors.ts` uses `Number()` on the slices:

```ts
const year = Number(date.slice(0, 4));
…
if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
```

`Number()` accepts leading whitespace, a sign and exponent notation, so
`"  12-01-01"`, `"+123-01-01"` and `"1e30-01-01"` all parse, and `formatCivilDate`
re-emits the third as `1e+30-01-01`. Nothing today feeds anchors an unvalidated
string — the parser refuses malformed stamps first, and `dates.ts` validates before
calling `isoWeekday` — so this is not currently reachable. It is still two readers of
the same value in the same phase with different answers, which is the shape this
phase spends whole docblocks refusing elsewhere (one weekday computation, one home
for a time boundary).

**Fix:** make `partsOf` use the same digit-only reader, or export `dates.ts`'s
`digitsToInt` shape from one place and have both call it — the same argument
`dates.ts:44-50` already makes for `isoWeekday`.

### WR-08: `ChecklistRow` seeds state from a prop and never re-syncs

**File:** `src/app/(admin)/admin/calendar/ChecklistSection.tsx:210`, `:224`

```ts
const [ticked, setTicked] = useState(item.ticked);
```

`ChecklistSection` keys rows by `item.id` (`:342`), which is stable, so when
`tickChecklistItem`'s `revalidatePath` sends a fresh server render the row keeps
whatever `ticked` this client last set. Two operators on the same night, or a tick
recorded and then reverted elsewhere, leave one of them looking at a box that
disagrees with the record — and the row deliberately hides the author line in that
state (`showsAuthor = ticked && item.ticked`), so there is no visible cue that the
two have parted.

**Fix:** treat the prop as authoritative and the local value as an optimistic
overlay that clears when the server answers.

```ts
const [pendingValue, setPendingValue] = useState<boolean | null>(null);
const ticked = pendingValue ?? item.ticked;
// on success: setPendingValue(null)   — the refreshed prop is the answer
```

### WR-09: the surface renders a `source_uid` the import script considers unsafe to print

**File:** `src/app/(admin)/admin/calendar/ImportRunSummary.tsx:183-191`, against `scripts/import-production-calendar.mjs:559-605`

The runner establishes, in writing, that a `UID` is not reliably opaque — *"some
applications derive a UID from the entry's own summary — at which point printing
'just the identifier' prints the title"* — and digests any UID carrying a word of a
parsed title (`printableUid`). The page prints the same values verbatim:

```tsx
{finding.source_uid} · {finding.reason}
```

The audience is the same one that already reads `venue_word` on the row above, so
this is not a disclosure to an unentitled reader. It is an undeclared asymmetry: two
readers of one untrusted string, one of which measures the risk and one of which does
not, on a page whose findings block is precisely what somebody photographs to report
an import problem.

**Fix:** either state in `ImportRunSummary`'s docblock why the page needs no digest
(the audience argument, written down), or apply the same guard — the page has no
titles to compare against, so the honest form is a fixed-width digest rendered beside
the reason, with the full uid available only in the script's own transcript.

Related, in the same file and on the same values: `divergences` and
`unsupported_recurrences` are `jsonb`, and both readers assert rather than check —
`page.tsx:480-484` calls `.some()` and `ImportRunSummary:275` reads `.length`. A run
row holding an object rather than an array throws during render, which on a server
component is the error page rather than the sentence this surface is built to show.
`Array.isArray(...)` before either would keep the third outcome a third outcome.

### WR-10: `checklistItemsToUpdate` is written without the guard its insert branch carries

**File:** `scripts/import-production-calendar.mjs:1339-1359`

The insert branch filters to items whose plan this run actually placed and reports
the remainder as a finding:

```js
const rows = plan.checklistItemsToInsert.filter((row) => planIdByKey.has(row.planKey))…
const unplaced = plan.checklistItemsToInsert.length - rows.length;
if (unplaced > 0) { say(`     ⚠ ${unplaced} checklist item(s) … That is a finding, not a tidy-up.`); }
```

The update loop immediately below has no equivalent: it iterates
`plan.checklistItemsToUpdate` unconditionally, one `update … .eq("id", row.id)` per
item. Any item the reconciler emitted whose row no longer exists (a plan row removed
by hand, an id from a stale snapshot) updates zero rows and reports nothing —
PostgREST does not treat a no-op update as an error. In a phase whose stated posture
is that a silent zero is the failure mode, the two branches should count the same
thing.

**Fix:** `.select("id")` on the update and compare the returned length against the
list, reporting the shortfall in the same register as `unplaced`.

### WR-11: the slug pre-check is a TOCTOU and its fallback can repeat

**File:** `src/app/(admin)/admin/calendar/actions.ts:656-675`

```ts
const base = slugify(title);
let slug = base.length > 0 ? base : `night-${Date.now().toString(36)}`;
const { data: slugTaken, error: slugError } = await client.from("events").select("id").eq("slug", slug).maybeSingle();
…
if (slugTaken) { slug = `${slug}-${Date.now().toString(36)}`; }
```

`events.slug` is `unique not null`, so the check is advisory: two announcements
racing on the same title both see the slug free and the second insert comes back
`23505`, reported as `write_failed` — a sentence that says the database refused the
write, which is true but points the reader at nothing actionable. And the suffix is a
millisecond clock, so two calls inside the same millisecond produce the same
"unique" slug. `composeNightTitle` returns the bare format name for a null
progressivo (`:476-481`), which is exactly the case where repeated collisions are
likely.

**Fix:** drop the pre-check, insert, and branch on `23505` with a retry that appends
`crypto.randomUUID().slice(0, 8)` — the same suffix source WR-05 proposes. One round
trip fewer and one guarantee more.

---

_Reviewed: 2026-08-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
