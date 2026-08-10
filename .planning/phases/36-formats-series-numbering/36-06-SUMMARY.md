---
phase: 36-formats-series-numbering
plan: 06
subsystem: contracts
tags: [types, capability-routes, component, public-repo, no-database-needed]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: the migration whose column names these types mirror (36-03)
  - phase: 34-one-route-map
    provides: CAPABILITY_ROUTES, the Binding union, and staff-tabs' runtime check
  - phase: 32-capability-model-in-the-database
    provides: the `catalogue.manage` key and `private.has_capability`
provides:
  - Format and PartySeries interfaces, and three fields on EventParty
  - /admin/formats bound to catalogue.manage on the branch that opens addresses
  - FormatMarker — the one component that renders a format's name and colour
affects: [36-07, 36-08, 36-09, 36-10, 36-11, 36-12, 36-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A colour from a runtime value reaches the DOM through an inline `style` — new to this codebase, and stated as new"
    - "A component that must survive an inherited CSS property declares the property itself, rather than relying on every future parent"
    - "A capability key that gates rows AND opens addresses lives on the first branch of `Binding` with `alsoGatesTables: true`; the old `reason` sentence moves into a comment instead of being dropped"

key-files:
  created:
    - src/components/formats/FormatMarker.tsx
    - .planning/phases/36-formats-series-numbering/deferred-items.md
    - .planning/phases/36-formats-series-numbering/36-06-SUMMARY.md
  modified:
    - src/types/database.ts
    - src/lib/routes/capability-routes.ts
    - src/lib/routes/staff-tabs.ts

key-decisions:
  - "`EventParty.number` is typed `number | null`, against the plan text: the migration sets NOT NULL on two columns of three (§9) and §9a argues the third. A production row carries no number today"
  - "The `Formats` staff tab is deferred to plan 36-09 rather than forced through a type widening or a cast — `StaffTab.href` is `Route` and a static address enters the generated union only after a page serves it"
  - "The catalogue address is bound to `catalogue.manage` and not `organizer.access`, diverging from its two sibling catalogue surfaces on purpose, and the divergence is written into the entry"
  - "`FormatMarker` renders an 8px swatch; §S5 asks for 12px on the catalogue row. No size prop was added on speculation — the discrepancy is recorded in the component for whoever builds S5"

patterns-established:
  - "When a plan's acceptance criterion contradicts an applied artifact, the artifact wins and the divergence is written into the code, not only into the summary"

requirements-completed: []  # deliberately empty — D-36-19

# Metrics
duration: 8min
completed: 2026-08-10
---

# Phase 36 Plan 06: The contracts — Summary

**Three files the rest of the phase is built against: types that admit a night can have no number, a capability entry moved to the branch that actually opens an address, and one component that keeps its own capitalisation no matter where it is mounted.**

## Performance

- **Duration:** ~8 min
- **Tasks:** 3 of 3
- **Commits:** 3
- **Database writes:** zero. Nothing in this plan needs a database to compile or to be true.

---

## What was built

### 1. `src/types/database.ts` — `Format`, `PartySeries`, and three fields on `EventParty`

Flat interfaces in the file's existing style, snake_case keys matching the migration's columns exactly. Every key was checked mechanically against `20260810120000_formats_and_series.sql`: all eleven `formats` columns and all nine `party_series` columns appear as column-definition lines in that file.

Each field carries the reason it exists rather than a restatement of its type — `listed` is not `retired_at` (D-36-17), the colour is in the data so it changes without a deploy (D-36-12), the series carries the counter and the format does not (D-36-07), `highest_assigned` is a water level and not a count.

### 2. `src/lib/routes/capability-routes.ts` — a branch change

`CAP.CATALOGUE_MANAGE` left `{ scope: "table" }` for `{ routes: ["/admin/formats"], alsoGatesTables: true }`. The entry carries a docblock saying, in this order: that the branch is the change and not the route string; that a page bound to the old branch would have resolved `null` and been unreachable for everyone with no build error; the old `reason` sentence verbatim, plus the two tables phase 36 adds to the set of rows this key gates; and the declared divergence from `/admin/venues` and `/admin/artists`, which are reached through `organizer.access` while their actions re-ask this key.

The divergence is a choice with a reason: `catalogue.manage` is `requires_approved = true`, so a **pending** organizer is refused at the address instead of being shown a catalogue where every button then refuses them. Moving a refusal earlier is the only direction `meta-gates.md` permits without an authorisation.

### 3. `src/components/formats/FormatMarker.tsx`

A server-safe presentational component taking `{ name, color, className? }`. An 8px `rounded-[2px]` square whose background is an inline `style` and which is `aria-hidden`, then the name at the Label role carrying **`normal-case` explicitly**.

No format is named in it, no hex is written in it, and the reserved interaction hue does not appear in it — measured by grep, below.

---

## Verification — what was run, and what it can and cannot prove

| Gate | Result |
|---|---|
| `npm run build` after each of the three tasks | green, three times |
| `npm run verify:routes` | **PASS** — 26 patterns parsed, 47 `revalidatePath` literals checked, 23 pages censused against 24 `/admin` patterns |
| `staff-tabs.ts` module-load check | runs during `next build` (the staff pages are prerendered, which evaluates the module) — green |

### The grep gates from the plan

`src/types/database.ts`:

| Gate | Required | Got |
|---|---|---|
| `export interface Format` | 1 | 1 |
| `export interface PartySeries` | 1 | 1 |
| the reversed e | 0 | 0 |

`src/lib/routes/capability-routes.ts`:

| Gate | Required | Got |
|---|---|---|
| `scope: "table"` within 4 lines of the `CAP.CATALOGUE_MANAGE` entry | 0 | 0 |
| `routes: ["/admin/formats"]` + `alsoGatesTables: true` | present | present, lines 380-383 |
| the `artists` / `venues` policies sentence survives as a comment | present | line 340 |

`src/components/formats/FormatMarker.tsx`:

| Gate | Required | Got |
|---|---|---|
| `normal-case` | ≥1 | 3 |
| `uppercase` or the widest tracking step | 0 | 0 |
| a format name, `#FF…` or `#A8…` | 0 | 0 |
| the reserved interaction hue, by name | 0 | 0 |
| `aria-hidden` | ≥1 | 2 |
| `"use client"` | 0 | 0 |
| the reversed e | 0 | 0 |
| `bpm\|techno\|house\|downtempo\|genre` | 0 | 0 |

### One thing measured rather than claimed

`normal-case` is the entire reason `FormatMarker` exists as a component, so *"the class is there"* is not enough — the class has to **emit a declaration**. Read back from the built stylesheet:

```
.next/static/css/0f81da7625f2aa15.css:.normal-case{text-transform:none}
```

### What this does **not** prove

- **A green build does not check any column name.** No Supabase client in this repository is parameterised with `Database` (`client.ts:4`, `server.ts:7`, `middleware.ts:211`, `service.ts:4`), so `Format` and `PartySeries` are documentation, not enforcement. A `.select()` naming `format_di` compiles, runs, and returns `undefined`. The sentence is written into the file above the two interfaces, because the plans that query these tables have to meet it.
- **Nothing here was rendered.** `FormatMarker` is not mounted by any surface yet, so its layout, its contrast against a real card and its behaviour inside a transforming ancestor have been reasoned and typed, not seen. The first plan that mounts it should look at it.
- **`/admin/formats` has no page**, so the binding has not been exercised by a request. `verify:routes` check 2 explicitly treats a pattern with no page as not-an-error, and it starts covering this address when plan 36-09 creates the page.
- **No migration is applied.** Plan 36-05 owns that; these types describe a schema that no database anyone uses holds yet.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] `EventParty.number` is `number | null`, not `number`**

- **Found during:** Task 1, reading the migration against the plan's action text.
- **Issue:** the plan states *"All three are `NOT NULL` in the database, so none of them is nullable here"*, and its acceptance criterion repeats it. The applied file says otherwise: §9 sets `NOT NULL` on `format_id` and `series_id` only, and §9a is a twenty-line argument for leaving `number` nullable, mirrored in the column's own `COMMENT`. A night that is the **act** of another night carries that night's format and series and no number of its own — and one such row exists in production.
- **Fix:** typed `number | null`, with the reasoning in the field's docblock, including the sentence that says the plan text disagreed and why the artifact wins. `supabase-data.md`'s gate *tipi allineati* is the point: a type that lies is worse than no type, because the compiler then confirms an assumption the database refuses.
- **Files modified:** `src/types/database.ts`
- **Commit:** `4684223`

**2. [Rule 3 — Blocking] The `Formats` tab cannot compile before its page exists**

- **Found during:** Task 2, on the build after adding the tab.
- **Issue:**

  ```
  Type error: Type '"/admin/formats"' is not assignable to type 'Route'.
  src/lib/routes/staff-tabs.ts:92:5
  ```

  `StaffTab.href` is typed `Route`, and a **static** address enters the generated union only once a `page.tsx` serves it. The plan anticipated the neighbouring consequence — that `_everyStaffRouteIsBound` would not cover the address until the page lands — and read that correctly; what it did not carry is that `staff-tabs.ts` has no equivalent of `RoutePattern`'s second arm, which is what lets the **map** hold an address with no page.
- **Fix:** the tab is deferred to the plan that creates the page (36-09), rather than forced through. Three ways out were weighed:

  | Option | Cost | Verdict |
  |---|---|---|
  | Widen `StaffTab.href` to `Route \| (string & {})` | `typedRoutes` stops checking all seven existing tabs, and both consumers pass `tab.href` straight into `<Link href>` (`StaffNav.tsx:68-73`, `ManagementSection.tsx:51`), so the loosening spreads into two more files | rejected |
  | `"/admin/formats" as Route` on the one entry | compiles; becomes dead weight the day the page lands and a permanent hole for a future typo, on the one file whose job is that a menu cannot promise an address nobody serves | rejected |
  | Add the tab in the plan that creates the page | the tab is absent between wave 3 and wave 7 | **taken** |

  The line is written out, commented, in place next to `Venues`, with the measured error and the rejected options beside it, so whoever adds it does not re-derive the decision. Also recorded in `deferred-items.md`.
- **Why this costs no protection:** hiding a nav entry was never protection (`access-gating.md`, gate *coerenza navigazione/permessi*) — the refusal is the middleware's and it is in place from this commit. What the wait avoids is the opposite failure: a staff member drawn a link to a 404 for four waves.
- **Files modified:** `src/lib/routes/staff-tabs.ts`
- **Commit:** `a78e51e`

**3. [Rule 2 — Missing critical] The sentence the plan asked for already existed three times**

- **Found during:** Task 1.
- **Issue:** the plan asks to write *"the sentence this file is owed and does not currently carry"* about no Supabase client being parameterised with `Database`. The file carries it already — at `Attendance.entry_role`, at `EventMediaRow`, and at `MembershipActRow`. Writing it as though it were new would have made the file claim a first that it is not, and would have read as though the three existing copies had been missed.
- **Fix:** written as a **fourth** copy, in the same house style, saying so: it is repeated because a reader arriving at `Format` from the migration would not meet any of the other three, and because it is the reason every later plan in this phase verifies its queries by running them.
- **Commit:** `4684223`

### Departures from the plan text, deliberate and stated

- **The 8px / 12px swatch discrepancy is recorded, not resolved.** `36-UI-SPEC.md` §S5 draws the catalogue row's square at 12px while §S2 and §S3 draw it at 8px, which is what the plan specifies and what the component renders. No size prop was added on speculation; the divergence is written into the component's docblock so that whoever builds S5 makes a decision rather than a discovery.

### Not done, on purpose

- **No `FMT-*` ticked in `REQUIREMENTS.md`** — D-36-19. This plan writes contracts against a schema that is not applied: no column exists in any database anyone uses, no surface reads a label or a colour, and no refusal reaches a person as a sentence. The phase verification ticks them once, with the evidence beside it.

## Issues Encountered

- The type error on the tab is the second time in this phase that a plan's ordering assumption was correct in prose and wrong against the toolchain (36-03 met the same class of defect with the policy that named a column not yet added). Both were caught by running the thing rather than reading it, which in a repository with no test runner is the only mechanism there is.

## Known Stubs

None. `FormatMarker` renders from its props with no placeholder, no mock and no default colour; the two interfaces describe columns that exist in the migration; the route entry names an address whose page is a later plan's declared deliverable, which `verify:routes` classifies as *a plan not yet run* rather than a gap.

## Threat Flags

None. The three surfaces this plan touches are each in the plan's threat register:

- **T-36-06-01** (the catalogue address unbound) — mitigated: the entry moved to the branch that opens addresses, `alsoGatesTables: true` kept, and `npm run build` still holds the `Record<CapabilityKey, Binding>` total.
- **T-36-06-02** (a nav entry promising a rule that does not exist) — the tab is not added, so no entry promises anything; the runtime check that would enforce it is untouched and still runs on first import.
- **T-36-06-03** (a hex string in an inline style) — `formats_color_hex_check` constrains the stored value to `#` plus six hex digits, so the string cannot carry a declaration; React escapes attribute values and no `dangerouslySetInnerHTML` is used.
- **T-36-06-04** (a format name rendered wrong) — mitigated on the element rather than by convention, and the emitted declaration was read back from the built stylesheet.
- **T-36-06-SC** — no package was installed.

## Self-Check: PASSED

- `src/types/database.ts` — present, contains `export interface Format` (×1) and `export interface PartySeries` (×1)
- `src/lib/routes/capability-routes.ts` — present, contains `alsoGatesTables` on the `CAP.CATALOGUE_MANAGE` entry
- `src/components/formats/FormatMarker.tsx` — present, contains `normal-case`
- `.planning/phases/36-formats-series-numbering/deferred-items.md` — present
- `4684223`, `a78e51e`, `8aba4de` — all present in git history
- No tracked file deleted by any of the three commits (`git diff --diff-filter=D` empty for each)

---
*Phase: 36-formats-series-numbering*
*Written and verified: 2026-08-10. Three green builds, one green `verify:routes`, one CSS declaration read back from disk.*
