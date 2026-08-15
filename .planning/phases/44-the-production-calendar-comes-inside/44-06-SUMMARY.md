---
phase: 44-the-production-calendar-comes-inside
plan: 06
subsystem: api
tags: [reconciler, idempotence, monotone-guard, pure-module, barrel, typescript]

# Dependency graph
requires:
  - phase: 44-the-production-calendar-comes-inside
    plan: 01
    provides: the eight closed vocabularies, the `IcsEvent` record, the weekly-recurrence expander and the civil-date discipline
  - phase: 44-the-production-calendar-comes-inside
    plan: 02
    provides: the five tables, their `source_uid` keys, the date-XOR-reason and proposal-has-no-source constraints, and the `(anchor kind, weekday, direction)` rule storage
  - phase: 44-the-production-calendar-comes-inside
    plan: 03
    provides: the four entry classes, the one join key, and `proposePieceDate` / `conformsToRule` over anchors resolved as weekdays
  - phase: 44-the-production-calendar-comes-inside
    plan: 04
    provides: the `BEFORE UPDATE` trigger that refuses a change to a plan row's progressivo — the second of the two layers this module is the first of
  - phase: 36-formats-and-series
    provides: the series watermark raised only by a write to the announced-night table, which this module cannot perform
provides:
  - a plan of writes over six tables, returned and never applied, so a dry run is possible in a repository with no test runner
  - idempotence keyed on the file's own `UID`, and on `UID` plus occurrence date for an expanded recurrence
  - the first of the two layers that make renumbering structurally impossible — a differing progressivo becomes a divergence and enters neither update list
  - absence as a stamp and a report, with no removal path in any list and an announced night's row flagged when its entry vanishes
  - proposals that fill only the tail a format still owes, carrying the three distinct refusals where no date can be placed
  - a checklist regenerated per night from the very piece list the same pass produced
  - the barrel, and the three claims that keep the reader out of a public endpoint
affects: [44-08 golden-file check, 44-10 import runner, 44-11 calendar surface, 44-12 announcement act]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a module that has a write to withhold, and withholds it — the plan is returned and the caller applies it"
    - "idempotence measured against a caller-supplied snapshot, so a second pass over an unchanged file produces nothing"
    - "a presence stamp kept apart from the update lists, so `still there` and `moved` stay two statements"
    - "a forbidden literal left unspelled so the grep that guards it has nothing to find"
    - "a standing configuration gap reported in its own field rather than as a repeating divergence"

key-files:
  created:
    - src/lib/production/ics/reconcile.ts
    - src/lib/production/ics/index.ts
  modified:
    - .planning/phases/44-the-production-calendar-comes-inside/deferred-items.md

key-decisions:
  - "A sigla moving — either half of it — withholds the whole row from both update lists; a decreasing revision counter is reported and the file is still mirrored, because the file is the source and a product holding a version nobody can see is worse"
  - "An absence is emitted only on the transition, never re-reported, so a run over a file that has already lost an entry can still settle"
  - "A proposal has no identity in the file, so its idempotence is honoured against the snapshot by consuming the proposals of a (plan, kind) group in order — the weaker corner, named rather than hidden"
  - "A file piece adopts the proposal it has come to supersede instead of creating a second row, so a night never holds a computed date beside the written one"
  - "The edition being waited for is named only when it is in the file: naming an absent one would mean composing a progressivo nobody assigned"
  - "Whether a space has to approve the material naming it is an input, not an inference from a format's name — the approval is a property of the space"
  - "The four production steps carry no due date, because what they are anchored to is not written down anywhere and this module derives no date the rule table does not carry"

patterns-established:
  - "Pattern 6: the plan of writes is a value — six insert/update lists, two finding lists and a presence stamp — and `isEmptyPlan` makes the idempotence claim checkable without making it true"
  - "Pattern 7: a report carries an identifier and a code; a row carries the text its column exists for. The two lists are different lists and the distinction is stated"

requirements-completed: [PROD-01]

# Metrics
duration: ~35min
completed: 2026-08-15
---

# Phase 44 Plan 06: The Reconciler and the Barrel Summary

**A `UID`-keyed plan of writes over six tables — inserts, updates, absences and divergences — assembled from a classified file plus a snapshot and handed back unapplied, so a second pass over an unchanged file produces nothing and a progressivo can only be read, never generated.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 1 (`deferred-items.md`)

## Accomplishments

- **`reconcile` returns a plan and performs no write.** No client, no connection, no I/O. The caller applies. That is what makes the dry run of plan 44-10 possible, and a dry run is the only rehearsal this repository has.
- **The key is the file's own `UID`**, and `UID` plus the occurrence date for an expanded recurrence. The title, `(date, title)` and a content hash are each weighed and rejected in the docblock, because each fails the one thing an identity has to do.
- **The progressivo is read and never generated.** A known `UID` arriving with a different number — or a different series code, which composes the other half of the same sigla — becomes a divergence and enters **neither** update list. Plan 44-04's trigger is the second layer; the module states that both exist on purpose.
- **Nothing is ever removed.** An entry missing from the file is stamped and reported, and a row standing behind an announced night is flagged as such so the report is loud rather than quiet.
- **The announced-night table is unreachable from the directory.** No list targets it; the string occurs once, in the comment stating the prohibition.
- **The barrel carries the three claims** — purity, the rule that keeps it out of a public endpoint, and D-44-26 — and records where it disagrees with the research rather than smoothing the disagreement over.

## Task Commits

1. **Task 1: The reconciler — a plan of writes, returned and never applied** — `bd6ddc4` (feat)
2. **Task 2: The barrel, and the rule that keeps it out of a public endpoint** — `1946819` (feat)

## Files Created/Modified

- `src/lib/production/ics/reconcile.ts` — the whole plan of writes: six insert/update pairs over plans, pieces, commitments and checklist items; `absences`; `divergences`; the two finding lists carried through untouched; a presence stamp; and `isEmptyPlan`, which asks exactly the question plan 44-08's check E asks.
- `src/lib/production/ics/index.ts` — six re-exports, one per module, under a docblock making the three claims task 2 names.
- `.planning/phases/…/deferred-items.md` — two entries added, D2 and D3, both described below.

## Decisions Made

**The sigla guard withholds; the revision anomaly does not.** A number or a series code that moved on a known `UID` puts the row in neither update list, because both halves compose something already printed. A decreasing `SEQUENCE` is reported and the row is still mirrored: the file is the source (D-44-01), and refusing the write would leave the product holding a version nobody can look at.

**A divergence about a linked night reports and still mirrors.** When the file moves a date under an announced night, the plan row follows the file and the divergence is what makes a person look (D-44-07). The announced night is untouched by anything here — that is the property, not the report.

**Absences are transitions.** A row already stamped is not re-reported. Without that, a run over a file that has permanently lost an entry could never settle, and the run summary would fill with the same line every week until nobody read it. The standing count is a read of `absent_since IS NOT NULL`, which the surface can do directly.

**A proposal's idempotence is honoured here, and that is weaker than a constraint.** A proposal has no `UID` because it does not exist in the file, so `ON CONFLICT (source_uid)` cannot govern it. The proposals of a `(plan, kind)` group are consumed in order against the snapshot instead. It is stated in the docblock as the weaker corner rather than left for somebody to discover.

**A written piece adopts the proposal it supersedes.** Otherwise the first import after the owner writes a piece into the file leaves the night holding both a computed date and the written one — the doubled-work direction the checklist's unique constraint exists to prevent, one table over.

**Proposals fill only the tail.** What a format owes is compared against what the file already carries of that kind, and only the remainder is proposed. Where no date can be placed at all, exactly **one** row carries the reason, and only when nothing of that kind is written: a night that already has the piece is not waiting for it.

**The awaited edition is named only when it exists.** `nextEditionLabel` is `null` where the following edition is not in the file. Naming it would mean composing a progressivo that has not been assigned — the exact act the monotone guard forbids, wearing the clothes of a label.

**Whether a space approves the material is an input.** It is a property of the space, not of the format (`brand-visual-system.md`, gate *lo spazio approva cio' che lo nomina*), so a format that moves into an exhibition space acquires the step by an edit. A format word hard-coded here would have been a second catalogue.

**Anchor contexts are built only for nights in this file.** An edition the export does not carry is one this run knows nothing about; computing what it owes from a snapshot would place dates for a night that may have been moved or renamed in the file being held.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `checklistItemsToUpdate` to `ReconcilePlan`**
- **Found during:** Task 1
- **Issue:** The plan enumerates `checklistItemsToInsert` and no update list. Lateness is computed and never stored — `ticked_at IS NULL AND due_date < current_date` (D-44-15) — so a listing moved in the file would leave its checklist item chasing the old day, and the night would read as late when it is not, or on time when it is not. The second direction hides work, which is the one the migration's own comment names as the one that matters.
- **Fix:** `ChecklistItemUpdate` carries the item's identifier and only `dueDate` and `sortOrder`. It carries no tick and cannot: the insert path stays `ON CONFLICT DO NOTHING`, so a re-import still cannot duplicate an item or reopen a ticked one.
- **Files modified:** `src/lib/production/ics/reconcile.ts`
- **Verification:** `npm run build` exits 0; the type makes a tick unrepresentable on this path.
- **Committed in:** `bd6ddc4`

**2. [Rule 2 - Missing Critical] Added `seriesWithoutRules` to `ReconcilePlan`**
- **Found during:** Task 1
- **Issue:** A night whose series code has no pipeline rules owes nothing this module can name, and it would have produced an empty checklist that looks complete — a silent zero, which `meta-gates.md` forbids in a product with no error tracking. The migration itself names the same shape one section over: *sixteen rules are expected; a smaller number is a silent zero*.
- **Fix:** A separate field carrying the series codes involved. Deliberately **not** a divergence: it is a standing condition, not a transition, and putting it among the divergences would make it repeat on every pass and stop plan 44-08's check E ever settling. A series code is a public sigla half and names no date and no space.
- **Files modified:** `src/lib/production/ics/reconcile.ts`
- **Verification:** `npm run build` exits 0; excluded from `isEmptyPlan` with the reason written into that function's docblock.
- **Committed in:** `bd6ddc4`

### Interpretations recorded rather than assumed

**The plan's sentence "no entry of any list carries a title or a venue word" is read as governing the finding lists.** Taken to govern the *write* lists too it would contradict the schema this phase already shipped: `production_commitment.title` and `production_plan.venue_word` exist, and `./classify` states in as many words why it carries the one text field it carries — a day shown as taken with no indication of what took it cannot be scheduled around. So the write rows carry both, to those columns and nowhere else; **divergences, absences and findings carry an identifier and a code and nothing else**, which is the sentence's own last clause. The reading is written into the module docblock so the next reader does not have to reconstruct it.

**The recurrence expansion happens here rather than at the caller.** `expandWeeklyRecurrence` is pure and its bound is an argument, so the caller still owns how much work is done; and the entry's own day is always among the occurrences, because the expansion answers *which other days* and never *whether this one*.

---

**Total deviations:** 2 auto-fixed (both Rule 2, missing critical), 2 interpretations recorded.
**Impact on plan:** Both additions are one field each and both close a direction in which the product would have been quietly wrong. No scope creep: no list was removed, no signature changed, and the declared artifact shape is a superset of the one the plan enumerated.

## Deferred Issues

Logged in `deferred-items.md` rather than fixed, because fixing either means deciding something nobody has decided:

- **D2 — the four production steps have no anchor, so they can never read as late.** `venue_confirmed`, `dj_confirmed`, `photo_arrived` and `space_approval` take a null due date, because `production_pipeline_rule` holds the editorial anchors and no others, and deriving one here would be a second rule table. The cost is exact: an item with no due date never satisfies `due_date < current_date`, so four of the five checklist kinds are invisible to D-44-15's *late from the list*. The repair is four rows, in the storage form the sixteen already use — and one of the four is already written in prose in `brand-visual-system.md`.
- **D3 — a stale checklist item outlives the piece it was created for.** A pipeline rule that drops from three episodes to two leaves the third night's item behind; its piece row is stamped `no_longer_owed`, the item beside it is not. The repair is the removal act this phase deliberately does not build.

## Issues Encountered

**Two forbidden literals had to be left unspelled**, and both are recorded here because the reason is a rule rather than a workaround.

The plan's own acceptance greps forbid, in `reconcile.ts`, the name of the watermark column and the arithmetic one would reach for; and forbid the server-action directive anywhere under `src/lib/production/`. Writing either **inside the sentence forbidding it** would have turned both greps red on a file that satisfies them. The repository already has the rule in writing (`src/app/(admin)/admin/formats/actions.ts:58-63`): *a grep whose only match is the sentence forbidding the thing is a grep that gets ignored the third time it goes red.* Both modules therefore describe the forbidden thing without naming it, and say that they are doing so — the same device `./vocabulary` uses for the seventh piece kind and `./anchors` for the four date-library names.

**No calendar material was read.** `docs/` was not opened by this plan, and nothing in either file, in this summary or in the deferred items came out of it: every count cited is quoted from a prior document, and every literal in the two modules is a vocabulary member, a label or a reason code.

## Verification

`npm run build` exits 0 after each task. Every grep the plan names was run and each is at its required value:

| Assertion | Command | Result |
|---|---|---|
| The night table is unreachable | `grep -rn "event_parties" src/lib/production/ics/` | 1 hit, `reconcile.ts:82`, inside the comment stating the prohibition |
| No write path | `grep -rcE "\.insert\(\|\.upsert\(\|\.update\(\|\.delete\(\|createClient\|getServiceClient" …/reconcile.ts` | 0 |
| No number generation | `grep -ciE "max\(\|highest_assigned\|nextNumber\|number \+ 1" …/reconcile.ts` | 0 |
| Absence never becomes removal | `grep -ciE "toDelete\|delete" …/reconcile.ts` | 0, and `absences` is a declared field of `ReconcilePlan` |
| No clock of its own | `grep -cE "new Date\|toISOString\|toLocaleDateString\|Intl\.DateTimeFormat" …/reconcile.ts` | 0 |
| The barrel exports all six | `grep -cE '^export .* from "\./(vocabulary\|unfold\|parse\|classify\|anchors\|reconcile)"' …/index.ts` | 6 |
| No server-action directive | `grep -rc "use server" src/lib/production/` | 0 on all seven files |
| The directory is free of I/O and clocks | `grep -rcE 'from "fs"\|next/headers\|createClient\|new Date\(' src/lib/production/ics/` | 0 on all seven files |

**What a green does NOT mean.** There is no test runner for the product, so nothing above is a test. In particular **nothing here shows that a second pass returns an empty plan.** `isEmptyPlan` makes that claim *askable*; it does not make it true. It is asserted by `scripts/verify-ics-import.mjs` check E in plan 44-08 and exercised for real by the dry run of plan 44-10. **Criterion 5 is not closed by this plan**, and this summary makes no claim about it.

## Self-Check: PASSED

- `src/lib/production/ics/reconcile.ts` — FOUND
- `src/lib/production/ics/index.ts` — FOUND
- commit `bd6ddc4` — FOUND
- commit `1946819` — FOUND

## Next Phase Readiness

`src/lib/production/ics/` is complete: six modules and a barrel, every one pure, and the last of them returns a plan instead of performing one. Ready for:

- **44-08** — the golden-file check imports the barrel rather than re-implementing it, and check E has `isEmptyPlan` to ask its question with.
- **44-10** — the local runner reads `docs/`, parses, classifies, reconciles, and applies. Two things it inherits and must honour: the caller resolves catalogue identifiers (`format_id`, `series_id`, `plan_id`) when it applies the plan, because those are database joins the reconciler deliberately does not make; and `plan.seen` is a presence stamp written on its own, not folded into the updates.
- **44-12** — the announcement act remains the single bridge to the announced night, and this module's inability to reach that table is what makes the bridge meaningful.

**One thing to carry:** the `checklistItemsToUpdate` and `seriesWithoutRules` fields are additions to the shape 44-06's plan enumerated. Plan 44-10 must apply the first (a `due_date` and `sort_order` write, never a tick) and plan 44-11 should surface the second — a night whose series has no rules must not draw an empty checklist as though it were a finished one.

---
*Phase: 44-the-production-calendar-comes-inside*
*Completed: 2026-08-15*
