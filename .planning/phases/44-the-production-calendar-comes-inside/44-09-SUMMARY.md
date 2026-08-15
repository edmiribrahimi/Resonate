---
phase: 44-the-production-calendar-comes-inside
plan: 09
subsystem: access-and-ui
tags: [capability-routes, rls, server-component, postgrest, observability, civil-date]

# Dependency graph
requires:
  - phase: 44-04
    provides: "`CAP.PRODUCTION_READ`, its two grants, and the six `SELECT` policies the page's cookie-bound read is judged by"
  - phase: 44-05
    provides: "`CalendarList` and its row contract, `StageBadge`, and `dates.ts`'s three formatters"
  - phase: 44-07
    provides: "the applied migrations, and the six row interfaces in `src/types/database.ts` confirmed against a live catalogue read-back"
provides:
  - "`/admin/calendar` — the whole archive in date order, guarded by `production.read` and read through the cookie-bound client"
  - "the map entry binding `/admin/calendar` and `/admin/calendar/[id]` to `CAP.PRODUCTION_READ` on the `routes:` branch with `alsoGatesTables: true`"
  - "`ImportRunSummary` — the observable effect of the last import, at the foot of S1, on every visit"
  - "`turinToday()` and `turinWallClock()` in `src/utils/datetime.ts` — the two time boundaries the calendar surface needs and may not construct itself"
affects: [44-11, 44-12, 44-13, 45]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A capability entry moves from the table branch to the routes branch in the same plan that creates its page — never as a tidy-up afterwards"
    - "Three read outcomes and never two: rows, empty, and a failed read with its own sentence"
    - "Every PostgREST embed checked against its foreign keys before it is written, because an ambiguous embed fails silently as a null data field"
    - "A time boundary the surface needs lives in `src/utils/datetime.ts`, never at the call site"
    - "A tally crosses a boundary as `number | null` so that `we could not measure` cannot be smoothed into a zero"

key-files:
  created:
    - "src/app/(admin)/admin/(work)/calendar/page.tsx"
    - "src/app/(admin)/admin/(work)/calendar/loading.tsx"
    - "src/app/(admin)/admin/calendar/ImportRunSummary.tsx"
  modified:
    - "src/lib/routes/capability-routes.ts"
    - "src/utils/datetime.ts"
    - ".planning/phases/44-the-production-calendar-comes-inside/deferred-items.md"

key-decisions:
  - "`/admin/calendar` joins the closed `wide` list of `41-UI-SPEC.md` §4, by decision and not by diff — the surface's primary object is a dense table"
  - "The page reads with the cookie-bound client and constructs no service client: a read that bypasses the policy proves nothing about the policy, and the policy is criterion 4's fourth reader"
  - "A night's `Diverged` mark is derived by matching its `source_uid` against the last run's `divergences`, because there is no diverged column and a divergence is reported as a (uid, reason) pair on purpose"
  - "The last import row is taken whichever kind it was; a dry run and a run that did not finish are marked rather than filtered, because tallies describing what WOULD have happened are not the tallies of what did"
  - "`absent_since` is neither filtered nor marked: filtering hides rows silently and marking needs a badge and a string the contract does not declare. Logged as D4"
  - "Retired sigle are the import's problem and not this page's: §13.4 says a retired sigla in the data is an unclassified entry and belongs in §10's tally, which is a statement about classification, not about rendering"

patterns-established:
  - "A discharged obligation is deleted from the file it was written in, and what it warned about is kept in one line — a warning about work already done teaches the next reader to skim the warnings"
  - "A count written in a comment is a claim nothing checks: recount it when you touch the thing it counts"
  - "Where a new string is unavoidable, declare it as a named constant with the reason it is not in the copy contract"

requirements-completed: [PROD-01]

# Metrics
duration: 71min
completed: 2026-08-15
---

# Phase 44 Plan 09: `/admin/calendar` — the archive, the guard and the last import — Summary

The production calendar is readable in the product. `/admin/calendar` draws the
whole archive in one chronological list — our nights with their format, series
number, venue word, venue stage and editorial tally, and the days already taken
by somebody else's production interleaved among them — behind the same capability
the middleware reads, through a client the row-level policies actually judge, with
the last import's effect at its foot.

---

## The obligation inherited from plan 44-04: **discharged**

`CAP.PRODUCTION_READ` **now sits on the `routes:` branch**, carrying both patterns
in one entry, with `alsoGatesTables: true`:

```ts
[CAP.PRODUCTION_READ]: {
  routes: ["/admin/calendar", "/admin/calendar/[id]"],
  alsoGatesTables: true,
},
```

`npm run verify:routes` exits **0**, and the pattern count moved from 24 to 26
(21 → 23 under `/admin`), which is the two new patterns and nothing else.

Three things were done with the obligation rather than to it:

1. **The warning text is removed, not left standing.** 44-04 wrote a five-paragraph
   ⚠ block into the entry telling 44-09 what to do. It has been done, so the block
   is gone — a warning about work already finished is how a reader learns that the
   warnings in this file can be skimmed, and this file's warnings are the only
   thing standing between a future edit and a middleware that refuses everybody.
2. **What it warned about is kept, in one line.** A page bound to a `scope: "table"`
   key is unreachable **for everyone**, with no build error and nothing in a log,
   because `resolveRoute` returns `null` and the middleware fails closed. That is
   a fact about the module, not about a plan, so it stays.
3. **The `reason` string is gone with the branch**, because the second branch is
   the only one that has a `reason` field. Nothing else in the entry survives from
   44-04 except the ambiguity check, which was re-read rather than inherited.

**The ambiguity check, re-read against `--print-patterns` rather than trusted.**
`/admin/calendar` is two literal segments; the seven other two-segment `/admin/*`
patterns are all literal and all differ in their second segment.
`/admin/calendar/[id]` is three segments with one dynamic tail; the only other
three-segment pattern with a dynamic count of one is `/admin/venues/[slug]`, whose
second segment is a different literal, and the three with a dynamic count of zero
are skipped by the loop's own guard before it compares literals. The check is worth
the paragraph because of **when** it fires: the throw runs at module load inside a
middleware bundle, so a tie is not a broken page — it is a 500 on every covered
route, the payments webhook and the door's scan path included.

**And what a green here does not mean.** `_everyStaffRouteIsBound` asks the
opposite direction and reads the generated route union, which contains no dynamic
route at all: it could never have seen `/admin/calendar/[id]`, and it could not see
`/admin/calendar` until this plan put a `page.tsx` there. The green build of 44-04
was never evidence that this entry existed.

---

## Task 1 — the map entry

`src/lib/routes/capability-routes.ts`, commit `98ba869`.

The entry says four things the next reader needs and cannot derive:

- **what question the key answers** — *may this subject see the production plan?*
  — and that its rows are unannounced dates, spaces under negotiation and the
  shape of an internal plan;
- **why it is not `organizer.access`**, which would have compiled and worked and
  cost nothing this week: a capability nobody can be refused is a capability that
  cannot be taken away, and Phase 45 exists to give this section a narrower
  audience. Declared separately now it is one row in `private.role_capabilities`;
  invented later it is a migration plus an audit of every surface that inherited
  the wider key;
- **that the page lands here and the TAB does not.** `staff-tabs.ts` gets its
  `Calendar` entry in 44-13, and the order is forced rather than chosen:
  `StaffTab.href` is `Route`, and a static address enters the generated union only
  once a `page.tsx` serves it. `staff-tabs.ts`'s own assertion runs tab → map, so
  a map entry with no tab is not an error;
- **that the middleware is UX and the RLS is the boundary.** The entry decides
  where a redirect happens. Criterion 4 asks three readers to ask the same question
  of the same definition; it does not promote this file to a security control, and
  the comment says so rather than leaving the inference available.

### One thing fixed that this plan did not create

The `alsoGatesTables` doc comment read *"Four of the fourteen do."* **Six do** —
`door.operate`, `register.read`, `staff.manage`, `party.manage`,
`catalogue.manage` and now `production.read`. It had been wrong since phase 36 and
this plan made it wronger. Counted rather than remembered, with the reason the
number matters written beside it: the flag is optional on this branch, so the one
mistake it invites is leaving it off and producing no error at all.

---

## Task 2 — S1, the page and its placeholder

`src/app/(admin)/admin/(work)/calendar/page.tsx` and `loading.tsx`, commit
`ae3ec4a`.

### The guard, and the read the guard is not

```ts
const { capabilities } = await getAccessContext();
if (!capabilities.has(CAP.PRODUCTION_READ)) redirect("/dashboard");
```

The same shape as `(work)/formats/page.tsx`, resolved once by `(work)/layout.tsx`
and `cache()`-scoped per request, so the second ask costs no round trip.

**Every read goes through `createClient()` — the cookie-bound client — and this
file constructs no service client.** `grep -c "getServiceClient"` returns 0. That
is not hygiene: a page fetching with the service key renders identically for a
subject the database would have refused, which is a feature protected by a redirect
alone. The six `SELECT` policies of
`20260815120100_production_calendar_access.sql` are the boundary, and they are only
being *exercised* because the client carries the session.

### The embeds were checked, not assumed

An embed through a table with more than one relationship to the embedded table is
`HTTP 300 PGRST201`, and through this client it fails **in silence**: `data` is
null, nothing is thrown, and the page renders nothing. The four embeds were each
checked against `20260815120000_production_calendar.sql`:

| embed | relationships |
|---|---|
| `production_plan → formats` | one, `format_id` |
| `production_plan → party_series` | one, `series_id` |
| `production_plan ← production_piece` | one, `plan_id` |
| `production_plan ← production_checklist_item` | one, `plan_id` |

and no table carries foreign keys to both sides of any pair, so none can be read as
a many-to-many either. `party_series` points at `formats` but not at
`production_plan`; `production_pipeline_rule` points at both catalogue tables and at
neither plan table. A constraint-name qualifier was **not** added, because the
generated names are identifiers this file has no way to verify and a wrong one fails
the same way an ambiguous embed does.

`linked_party_id` is deliberately not embedded: it points at `public.event_parties`,
whose read arms are a different question with a different audience, and this surface
only needs to know whether it is set.

### Three outcomes, never two

| outcome | what renders |
|---|---|
| rows | the chronological list |
| the import has never run | §13.1 row 1, including the sentence about there being nothing to upload |
| the import ran, no nights | §13.1 row 2 |
| **the read itself failed** | §13.2's two sentences, in a `role="alert"` region, and **never** the empty state |

The failure logs `error.code` and `error.message`, and nothing else:
`grep -c "\.details"` returns 0. PostgREST's `details` carries the rejected row,
and here that row carries `venue_word`.

The two empty states are told apart by whether a `production_import_run` row
exists — which is why the run is read on a visit that draws no tallies at all. The
empty node is passed **into** `CalendarList`, as 44-05 designed: only the caller
knows which emptiness this is.

**The no-upload sentence is present and is not decoration.** `grep -c "the file
never leaves that machine"` returns 1. The import is a local script and the file
never leaves the owner's machine (D-44-26); without the sentence a missing upload
button reads as an unfinished feature and somebody builds it.

### Where today falls, without constructing a date

`grep -cE "new Date|toISOString|toLocaleDateString|Intl\.DateTimeFormat"` returns
**0** on both files. Every date is civil and is formatted from its own characters by
`dates.ts`.

The two things that genuinely need a clock — *where does today fall in this list*
and *is this checklist item past due* — take `turinToday()`, added to
`src/utils/datetime.ts`. See §Deviations for why the helper is there and why it is
not `current_date`.

The `Today` marker goes before the first row that is not in the past, so past and
future stay one continuous list. Where every row is past it lands at the end; where
every row is future it lands at the start; both fall out of the same rule rather
than being two cases. Comparisons are string comparisons on `YYYY-MM-DD`, which is
fixed-width and most-significant-first, so string order is date order.

### The placeholder

`wide`, matching the page, so nothing jumps sideways when the data lands. **Seven
cards, a literal**, and the rule travels here with more force than it had on
`/admin/members`: a count leaked there is how many people exist; a count leaked here
is **how many nights are planned**. No filter row and no chips, because §8.1 refuses
a filter, a search, a sort and pagination and a placeholder promising any of them
would stand in for a page that does not exist. `Skeleton`, never a hand-rolled
`animate-pulse`.

---

## Task 3 — S3, the import block

`src/app/(admin)/admin/calendar/ImportRunSummary.tsx`, commit `042f348`.

At the foot of S1, in a `Card` headed `LAST IMPORT`, **on every visit and never
behind a click**. An import summary behind a second click is seen by whoever
already suspected something, which is exactly the person who did not need telling.

Seven tallies — entries read, nights, pieces, days taken, unclassified,
divergences, unsupported recurrences — plus the run's timestamp.

| rule | how it is held |
|---|---|
| every tally is a count or a sentence | each crosses as `number \| null`; `null` draws `We could not count`. The page's mapper carries every `null` across and has no `?? 0` anywhere |
| the unclassified count is as prominent as the rest | same row, same size, no control hiding it. The grep for a disclosure returns 0 |
| findings carry UIDs and reason codes | `ImportFinding` has exactly two fields and **no** title, summary, date or venue field. The prop type is the guarantee, not the comment |
| three tallies, never one summed figure | three `Tally` elements read from three sources — and the unclassified count comes from its own column rather than the `jsonb` breakdown, which is how the migration stores it and why |
| never imported is an empty state | `run === null` renders **nothing**; the page draws §13.1 instead. A block of zeros would say the import ran and found nothing |

**Two marks were added beyond the seven tallies**, both neutral: `Dry run`, because
a run that applied nothing has tallies describing what *would* have happened; and
`Did not finish`, because a null `finished_at` is the observation and not a tidy row
to be back-filled. Neither takes the `emphasis` fill — §5.3 spends that on `Late N`
and `Diverged` and a third claim on it would leave three marks saying *look here
first*, which is the same as none of them saying it. `grep -c 'tone="emphasis"'`
returns 0 in this file.

**Neither the word a summed figure would be given nor the name of the control that
would hide the count is written in the file, not even in order to forbid them.** A
mechanical check greps for both, and a grep whose only match is the sentence
forbidding the thing is a grep that gets ignored the third time it goes red — the
discipline `CalendarList.tsx` and `dates.ts` already keep for the four date
literals. Both prose passages were rewritten once the greps went red on them.

---

## The three derivations the page performs, and why each is what it is

**The piece tally** maps to 44-05's `PieceTally` union: `origin === "file"` is
*written*, a set `unresolved_reason` is *waiting*, and the total is *owed*. Any
piece reading `depends_on_lineup` collapses the whole cell to
`lineup_dependent`, printing **no figure at all** — because if the LiveCut count is
unknown then the owed total is unknown, and three is not a constant. An absent
embed gives `unreadable`, which draws `We could not count` rather than a `0` that
would say *this night owes nothing*.

**The late count** evaluates D-44-15's predicate — `ticked_at IS NULL AND due_date <
today` — in the page and stores it nowhere. `null` where the items could not be
read, so `CalendarList` draws no badge rather than a `Late 0`. *(Note D2 still
stands: four of the five checklist kinds carry no due date, so they can never read
as late. This plan draws what exists; it did not invent the four anchors.)*

**The divergence mark** matches a night's `source_uid` against the last run's
`divergences` array. There is no `diverged` column, and its absence is deliberate:
a divergence is a `(source_uid, reason)` pair on the run row, which is exactly why
those pairs carry a **uid** and never a title.

⚠ **When `divergences` is null, no row is marked, and that is not the page quietly
answering `false`.** `CalendarNightRow.diverged` is a boolean and this plan does not
widen a contract 44-05 froze. The fact that the divergence count could not be read
is drawn **at the foot of the same page**, where §10 requires that tally to say
`We could not count` rather than print a zero. The absence is observable — on the
block rather than on the row.

---

## Verification

| gate | result |
|---|---|
| `npm run build` | **exit 0** — `/admin/calendar` appears in the route table as `ƒ` (dynamic) |
| `npm run verify:routes` | **exit 0** — 26 patterns, 23 under `/admin`, every page resolves |
| `npm run verify:tables` | exit 0 |
| `npm run verify:breakpoints` | exit 0 |
| `npm run verify:tokens` | exit 0 |
| `npm run verify:dialogs` | exit 0 |
| `npm run verify:no-viewport-read` | exit 0 |
| `npm run verify:persona` | exit 0 |
| `npm run verify` | **exit 2 — three REFUSALS, none of them this tree's.** See below |
| `npm run verify:touch-targets` | exit 2 — D1's stale manifest, pre-existing |
| `npm run verify:conversion` | exit 2 — D1's stale manifest, pre-existing |
| `npm run verify:capabilities` | exit 2 — needs `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL`, which a worktree does not carry |

**On `npm run verify`.** The plan asks it to exit 0 and to name `verify:ics` among
the gates it did not run. It exits **2** and there is **no `verify:ics` script in
`package.json`** — seventeen `verify:*` entries are declared and none of them is
that one. Sixteen ran, thirteen reached a verdict, **none failed**, and three
refused before measuring anything. The aggregate's own footer insists on the
distinction and it is worth repeating: a refusal is not a pass, because those three
gates measured nothing. Logged as **D5** in `deferred-items.md`, with D1's manifest
edit named as the repair for two of the three.

### The grep assertions the plan names

| assertion | file | expected | got |
|---|---|---|---|
| `/admin/calendar` in the map | `capability-routes.ts` | ≥ 2 | **6** (2 in the `routes` array, 4 in the entry's prose) |
| `alsoGatesTables: true` | `capability-routes.ts` | +1 | **6**, was 5 |
| no `scope: "table"` on the entry | `capability-routes.ts` | 0 | **0** — confirmed by reading |
| guards on the bound key | `page.tsx` | ≥ 1 | **2** |
| no service client on a read path | `page.tsx` | 0 | **0** |
| failed read ≠ empty state | `page.tsx` | 1 | **1** |
| the no-upload sentence | `page.tsx` | 1 | **1** |
| no upload or date control | `page.tsx`, `loading.tsx` | 0 | **0**, **0** |
| no `.details` in any log | `page.tsx` | 0 | **0** |
| no date construction | `page.tsx` | 0 | **0** |
| `PageShell width="wide"` | `page.tsx`, `loading.tsx` | present | **2** (list + failure state), **1** |
| three findings, three tallies | `ImportRunSummary.tsx` | ≥ 3 | **18** |
| no summed-figure word | `ImportRunSummary.tsx` | 0 | **0** |
| `We could not count` | `ImportRunSummary.tsx` | ≥ 1 | **1** |
| no disclosure around the count | `ImportRunSummary.tsx` | 0 | **0** |
| no date construction | `ImportRunSummary.tsx` | 0 | **0** |
| no title/summary/venue prop on a finding | `ImportRunSummary.tsx` | 0 | **0** — confirmed by reading the prop type |
| the audio-piece misnomer | all three new files | 0 | **0** |
| the reversed glyph | all five touched files | 0 | **0**, matched by code point |

### What a green does **not** mean

- **`verify:routes` reads declarations.** It opens no session. Nothing here says a
  door-assigned member of staff is refused the calendar — `staff` holds neither
  grant of `production.read`, and that is a claim about a migration, not a
  measurement. Criterion 4's second half is **a real session as master, as
  organizer and as door-assigned staff**, and it is plan 44-13's written procedure.
  It is **not claimed here.**
- **`npm run build` proves the JSX type-checks against the row types declared in
  this file.** It proves nothing about whether a column is spelled the way the
  applied migration spells it: no Supabase client in this repository is
  parameterised with `Database`, so `.select()` returns values the compiler cannot
  relate to a column and the casts are assertions. Every name in the three selects
  was read by hand out of the two migration files and then checked against the six
  interfaces in `src/types/database.ts`, which plan 44-07 confirmed against the live
  catalogue read-back. That chain is the only check performed.
- **No query in this plan has been executed against a database.** The RLS was not
  exercised, the embeds were not answered, and the three-outcome branch was not
  observed taking its third branch. There is no test runner for the product.

---

## Deviations from Plan

### Auto-added

**1. [Rule 3 — Blocking] `turinToday()` in `src/utils/datetime.ts`**
- **Found during:** Task 2. The page needs today's civil date twice — to place the
  `Today` marker and to evaluate the lateness predicate — and the surface may
  construct no instant.
- **Why not `current_date` in Postgres**, which was the first candidate: the
  database session runs in UTC, so between midnight and 02:00 Turin time it names
  **yesterday** — during exactly the hours a night is running. The TypeScript
  helper resolving `Europe/Rome` is the *more correct* of the two, not merely the
  more convenient.
- **Why in that file:** `time-and-scheduling.md` states it outright — *«Se ne serve
  una nuova, si aggiunge li' — non si riscrive la conversione sul posto, che e'
  esattamente come sono nate le sei varianti precedenti.»* Every caller before this
  one spelled `zonedDateString(new Date())` inline.
- **Committed in:** `ae3ec4a`

**2. [Rule 3 — Blocking] `turinWallClock()` in `src/utils/datetime.ts`**
- **Found during:** Task 3. `production_import_run.started_at` is a `timestamptz`
  and is the one real instant on this surface, so it is the one value that needs a
  zone. `dates.ts` has no formatter for one, by design.
- **Why one call and not two:** slicing the first ten characters of the ISO string
  is wrong for two hours out of twenty-four and reading its `HH:MM` is wrong for all
  twenty-four. Both halves must be shifted, so both come back from one call rather
  than from two that could be given different instants. The offset is taken at the
  instant itself, so it is right on both sides of a DST boundary — and the boundary
  is always inside the season, since the calendar runs August to July.
- **Committed in:** `042f348`

**3. [Rule 2 — Missing critical] `export const dynamic = "force-dynamic"`**
- **Found during:** Task 2.
- **Issue:** every row on this surface is an unannounced date and some carry the
  word for a space under negotiation. `nextjs-architecture.md`'s gate *cache
  esplicita* requires such a surface to declare it, and its gate *service worker* is
  the sharper half: Serwist serves old content when the network is missing, and a
  stale calendar is a set of dates rendered to whoever is holding the phone now.
- **Note:** `cookies()` inside `createClient` already opts the route out of static
  rendering, so the line changes no behaviour today. It is there so the reason
  survives a refactor that removes the cookie read. Precedent: six existing pages
  declare it, four of them under `(admin)`.
- **Committed in:** `ae3ec4a`

**4. [Rule 2 — Missing critical] `Dry run` and `Did not finish` marks**
- **Found during:** Task 3.
- **Issue:** §10 specifies seven tallies and a timestamp and says nothing about
  either state. A dry run's tallies describe what *would* have happened; presenting
  them as the last import's is the exact class of quiet lie this block exists to
  prevent. A null `finished_at` is *the run did not finish*, which the migration is
  explicit must not be back-filled to make a table look tidy.
- **Both neutral**, never `emphasis`, so §5.3's U6 assertion is untouched.
- **Committed in:** `042f348`

**5. [Rule 2 — Missing critical] Three strings the copy contract does not declare**
- **Found during:** Task 2. Each is a null the six columns of §8.2 have no form
  for, each is declared as a named constant with its reason in the file, and each
  follows the register `dates.ts` already set for this phase — a distinguishable
  sentence, never a blank and never an em-dash.

  | constant | drawn when | grounded in |
  |---|---|---|
  | `Format not resolved` | `format_id` is null | the migration: an unresolved format *"is a finding to report, not a row to refuse — refusing it would lose the day"* |
  | `no sigla` | neither series nor format carries a code | the same shape as `NO_PROGRESSIVO` (`no number`), which `dates.ts` already exports and this surface already draws |
  | `Untitled entry` | a commitment's `title` is null | the day is taken whether or not somebody named it, and a blank cell reads as a rendering fault and invites a reader to dismiss the row |
- **Recommendation for the contract's next revision:** three rows in §13.4. They are
  recorded here rather than folded in silently.
- **Committed in:** `ae3ec4a`

**6. [Rule 1 — Bug] The `alsoGatesTables` comment said "four of the fourteen"**
- **Found during:** Task 1. Six entries carry the flag. The comment had been wrong
  since phase 36 and this plan made it wronger.
- **Fix:** counted and corrected, with the reason the number matters written beside
  it.
- **Committed in:** `98ba869`

### Declared, and deliberately not done

**7. `absent_since` is neither filtered nor marked** — logged as **D4**. Filtering
hides rows silently, and if an import bug stamped everything absent the calendar
would empty out under a sentence saying *the import ran and read no nights*: a
plausible sentence covering a fault, which is the shape OBS-03 refuses. Marking
needs a fifth badge in §8.3 and a string in §13.4, and a surface may not decide a
question the contract owns. So every row is drawn — nothing is hidden — and the
gap is written down.

**8. Retired sigle are not handled on this page.** §13.4 says a retired sigla in the
data *"is an unclassified entry and belongs in §10's tally, not on a row"* — which
is a statement about **classification**, so it is the import's job (44-10), not a
rendering branch here. Recorded as a reading rather than left as an omission.

**9. The page renders `<ImportRunSummary>`, which task 3's `<files>` does not
list.** The block cannot render itself; the two lines wiring it in are in task 3's
commit, beside the component they call.

---

## Issues Encountered

None blocking. The three `verify` refusals are pre-existing and named above and in
`deferred-items.md` D1 and D5; no calendar file is named by any of them.

---

## Repository Safety

`.planning/` is tracked and this repository is public.

- **No production material** in any of the five touched files or in this SUMMARY:
  no venue name at all, no date of any night, no line-up, no personal name.
  `docs/Music-*.ics` was **not opened**.
- **Every date literal in the touched source is a measurement date** (`2026-08-09`,
  `2026-08-14`, `2026-08-15`) in a comment about this repository, not a date in the
  calendar. Checked by regex across all five.
- **The venue word travels from the query into a table cell and nowhere else.** It
  is in no `console.*`, no thrown message, no page title, no analytics call and no
  `aria-label`. The one log line on this surface carries `error.code` and
  `error.message` and never `details`, which would carry the rejected row.
- **The finding type has no field for a title**, so the block cannot draw one even
  if a future caller wanted to.
- `re:sonate` is written with a normal `e` throughout; the reversed glyph is typed
  nowhere and was checked by code point.

---

## Known Stubs

None. Every branch on the surface draws a real value or a sentence saying why it
cannot, and no component receives hardcoded empty data. The three gaps that exist
— D2's four unanchored checklist kinds, D4's undrawn `absent_since`, and the fact
that S2 (`/admin/calendar/[id]`) is bound in the map but not yet on disk — are
recorded rather than stubbed. The last of those is a map entry with no page, which
this module explicitly treats as *a plan not yet run*: plan 44-11 creates it.

---

## Threat Flags

None. Every surface this plan creates was in the plan's own threat register, and
the four `mitigate` dispositions were applied:

| id | how |
|---|---|
| T-44-02 | the map entry on the `routes` branch with `alsoGatesTables`, the page re-asking the same key, and the read going through the cookie-bound client so the policy is exercised rather than bypassed |
| T-44-01 | `error.code` and `error.message` only; findings carry uid and reason code and the type has no other field |
| T-44-27 | the ambiguity check re-read against `--print-patterns` for both new patterns |
| T-44-28 | three outcomes and never two; the failed read has its own `role="alert"` region and never the empty state |

**T-44-18 is not closed by this plan and is not claimed to be.** *staff holds
neither grant of `production.read`* is provable only by a real session, and that is
plan 44-13's written procedure.

---

## Notes for whoever comes next

1. **44-11 builds S2 at `/admin/calendar/[id]`.** Its map pattern is already bound
   by this plan's entry — do not add a second one, and do not add a second key. Its
   `loading.tsx` should carry `width="default"`, not `wide`: §9.1 gives S2 the
   default shell, so the two placeholders differ deliberately.
2. **44-13 adds the `Calendar` tab** to `staff-tabs.ts` with
   `capability: CAP.PRODUCTION_READ`. The address is in the generated union now, so
   the type will accept it; the file's load-time loop checks the tab against the map
   and will pass.
3. **44-10's import is what fills all of this.** Until it runs, the page draws
   §13.1's never-imported state — which is the correct rendering and not a fault.
4. **The `Diverged` mark depends on the import writing `divergences` as
   `{ source_uid, reason }` pairs.** If the import writes a different shape, no row
   is ever marked and nothing goes red; the count at the foot will still be right.

---

## Self-Check: PASSED

| Claim | Method | Result |
|---|---|---|
| `page.tsx` exists | `ls src/app/(admin)/admin/(work)/calendar/` | found |
| `loading.tsx` exists | `ls src/app/(admin)/admin/(work)/calendar/` | found |
| `ImportRunSummary.tsx` exists | `ls src/app/(admin)/admin/calendar/` | found |
| `98ba869` exists | `git log --oneline` | found |
| `ae3ec4a` exists | `git log --oneline` | found |
| `042f348` exists | `git log --oneline` | found |
| the entry is on the `routes` branch | read | `routes: ["/admin/calendar", "/admin/calendar/[id]"]`, `alsoGatesTables: true` |
| `npm run build` exits 0 | run | exit 0, `/admin/calendar` in the route table |
| `npm run verify:routes` exits 0 | run | exit 0 |
