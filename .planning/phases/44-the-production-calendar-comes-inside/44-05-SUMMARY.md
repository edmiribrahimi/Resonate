---
phase: 44-the-production-calendar-comes-inside
plan: 05
subsystem: ui
tags: [react, tailwind, typescript, discriminated-union, datatable, civil-date]

# Dependency graph
requires:
  - phase: 44-01
    provides: "`src/lib/production/ics/vocabulary.ts` — PieceKind, PieceDateOrigin, UnresolvedReason, VenueStage, CivilDate, CivilTime"
  - phase: 44-03
    provides: "`src/lib/production/ics/anchors.ts` — `isoWeekday`. NOT YET ON DISK: 44-03 is the same wave. See §Issues Encountered"
provides:
  - "`formatCivilDate` / `formatCivilTimeRange` / `formatProgressivo` — the surface's only date, time and progressivo renderers, formatted from parts"
  - "`PieceDate` — the only renderer of a piece's date, taking a five-variant discriminated union in which a bare date is unrepresentable"
  - "`StageBadge` — four stage words plus a fifth for the unrecorded case, no hue, never absent"
  - "`CalendarList` — the chronological DataTable, with a commitment row type that has no format, series, sigla or number field"
  - "`CalendarNightRow` / `CalendarCommitmentRow` / `CalendarTodayRow` / `PieceTally` — the row contract plans 44-09 and later build their page against"
affects: [44-09, 44-10, 44-11, 44-13, 45]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A discriminated union as a display guarantee: a state with no provenance is unrepresentable rather than merely discouraged"
    - "A refusing variant carries no numeric field at all, so no shape of the value can print a figure it does not have"
    - "Civil-date formatting from string parts against fixed weekday and month tables — no instant is ever constructed"
    - "A forbidden literal is not spelled even in prose, because a mechanical check greps for it"

key-files:
  created:
    - "src/app/(admin)/admin/calendar/dates.ts"
    - "src/app/(admin)/admin/calendar/PieceDate.tsx"
    - "src/app/(admin)/admin/calendar/StageBadge.tsx"
    - "src/app/(admin)/admin/calendar/CalendarList.tsx"
    - ".planning/phases/44-the-production-calendar-comes-inside/deferred-items.md"
  modified: []

key-decisions:
  - "The weekday is computed once in the phase: `dates.ts` imports `isoWeekday` from plan 44-03's `anchors.ts` rather than re-deriving it. Two implementations of the same arithmetic drift, and a drifted weekday is the recorded failure mode this phase exists to prevent"
  - "A proposal recedes rather than shouts: four channels — the union, a dashed leading rule, the muted ink register, the word `Proposed` — and none of them a hue, because a proposal is the majority case and a caution applied to the majority becomes the page's background"
  - "`NightRow.tsx` and `CommitmentRow.tsx` are declared inline in `CalendarList.tsx` instead of as two files, per the plan's own stated divergence from 44-PATTERNS"
  - "A seventh column carries the sentence `Not a re:sonate production`: none of §8.2's six has a card label under which that sentence would read truthfully, and the title and subtitle slots truncate to one line on a phone"
  - "The Today marker is a row of the same list rather than a full-width rule, because DataTable cannot span columns and two tables would buy the width by giving up the continuous list the marker exists for"
  - "`CalendarList` takes its empty state as a prop: only the caller knows whether the import has never run or ran and read no nights, and those are two different facts"

patterns-established:
  - "PieceDate is the single renderer of a piece's date (check U5); a night's own date is a different thing and goes through formatCivilDate directly"
  - "A badge that states a fact never disappears: an absent badge reads as *fine*, which is often the one claim that cannot be made"
  - "Three refusals stay three sentences, and no shared word exists in the file that would let them collapse"

requirements-completed: [PROD-01]

# Metrics
duration: 42min
completed: 2026-08-15
---

# Phase 44 Plan 05: The presentation layer of the calendar surface — Summary

**Four files under `src/app/(admin)/admin/calendar/`: a civil-date formatter that never builds an instant, a `PieceDate` whose five-variant union makes a date with no provenance unrepresentable, a `StageBadge` that cannot vanish, and a chronological `DataTable` whose commitment row is structurally incapable of carrying a format.**

## Performance

- **Duration:** ~42 min
- **Tasks:** 3 of 3
- **Files created:** 5 (4 source, 1 deferral log)
- **Files modified:** 0

## Accomplishments

- **A date with no origin cannot be constructed, so it cannot be rendered.** `PieceDate`'s prop is a five-variant union — `{origin:"file"}`, `{origin:"proposed"}`, and the three `unresolved` reasons — and every variant carries either an `origin` or an `unresolved`. This is `44-UI-SPEC.md` §7's fourth channel, the structural one, and it mirrors the two CHECK constraints the phase's migration puts on `production_piece`.
- **A proposal is distinguished by three visual channels and none of them is a hue.** The word `Proposed` adjacent to the date, `--muted` (6.78 : 1) against a written date's `--ink` (16.41 : 1), and a `border-s-2 border-dashed border-control` leading rule that reads as unfinished before a word is read. The caution colour was refused for the reason §5.3 gives: a proposal is the *majority* case, and a caution applied to the majority becomes the page's background.
- **The override reaches no pixel.** `PieceDate` takes no flag saying whether a date follows its rule, has no notion of an exception, and the word the check greps for appears zero times in the file. A written date that breaks the rule is drawn identically to one that keeps it (D-44-10, the owner's decision, cost read and accepted).
- **The commitment row cannot be handed a format.** `CalendarCommitmentRow` has `title`, `date`, `startTime`, `endTime` and nothing else — no `format`, no `series`, no `sigla`, no number field. Not optional: absent. That is the difference between a rule and a guarantee, and those two values travel on to surfaces that name formats.
- **Where a value cannot be determined, the surface says why.** Three withheld piece dates are three distinct sentences; the piece tally is a union whose two refusing variants carry no numeric field, so `We could not count` and `LiveCuts depend on the line-up` cannot degrade into a `0`.
- **No instant is constructed anywhere.** All four files return zero on the date-construction grep. The weekday comes from `isoWeekday`, imported once.

## Task Commits

1. **Task 1: the civil-date formatter (`dates.ts`)** — `5ecd833` (feat)
2. **Task 2: `PieceDate` and `StageBadge`** — `fbb62cd` (feat)
3. **Task 3: `CalendarList`** — `7334893` (feat)

## Files Created

- `src/app/(admin)/admin/calendar/dates.ts` — `formatCivilDate` (`Tue 12 May 2026`, weekday-first from parts), `formatCivilTimeRange` (`22:00 → 06:00`, 24-hour, no zone suffix), `formatProgressivo` (three digits, never stripped), plus `isCivilDate` / `isCivilTime` so a caller can branch **before** it renders, and four distinct sentences for input that cannot be read.
- `src/app/(admin)/admin/calendar/PieceDate.tsx` — the five-variant union and its seven rendered states, plus the `late` overlay.
- `src/app/(admin)/admin/calendar/StageBadge.tsx` — the four stage words plus `stage unknown`, `normal-case` declared, no early return.
- `src/app/(admin)/admin/calendar/CalendarList.tsx` — the seven-column `DataTable`, the four marks, the three withholding rules, the Today marker, and the three exported row types.
- `.planning/phases/44-the-production-calendar-comes-inside/deferred-items.md` — one pre-existing, out-of-scope finding.

## Verification

### Grep assertions — all pass

| Assertion | File | Result |
|---|---|---|
| no instant constructed | `dates.ts` | 0 |
| the three formatters exported | `dates.ts` | 3 |
| weekday imported, not duplicated | `dates.ts` | 1 |
| conformance word reaches no prop | `PieceDate.tsx` | 0 |
| three reasons, three sentences | `PieceDate.tsx` | 3 |
| no shared collapsing word | `PieceDate.tsx` | 0 |
| `emphasis` spent only on `Late` | `PieceDate.tsx` | 1 |
| no instant constructed | `PieceDate.tsx`, `StageBadge.tsx` | 0 |
| the fifth stage word renders | `StageBadge.tsx` | 1 |
| no `return null` in the badge | `StageBadge.tsx` | 0 |
| no hue on a stage | `StageBadge.tsx` | 0 |
| the audio-piece misnomer absent | `CalendarList.tsx` | 0 |
| no format identification colour | `CalendarList.tsx` | 0 |
| no re-ordering or narrowing control | `CalendarList.tsx` | 0 |
| no instant constructed | `CalendarList.tsx` | 0 |
| the three withholding strings | `CalendarList.tsx` | 5 |
| `emphasis` adjacent only to `Late` / `Diverged` | `CalendarList.tsx` | 2 of 2, verified by line |

### Scripts

| Script | Exit |
|---|---|
| `npm run verify:tables` | **0** |
| `npm run verify:breakpoints` | **0** |
| `npm run verify:dialogs` | **0** |
| `npm run verify:tokens` | **0** |
| `npm run verify:no-viewport-read` | **0** |
| `npm run verify:touch-targets` | **2 — pre-existing, see deferred-items.md D1** |
| `npm run verify:conversion` | **2 — pre-existing, same manifest** |
| `npm run build` | **see §Issues Encountered — one error, and it is a sibling plan's file** |

### What a green does NOT mean

None of the above says a proposal reads as unsettled. That is the one thing only a person can settle, it is the reason `44-UI-SPEC.md` §7 was written before anything else in that document, and it belongs in plan 44-13's written procedure:

> **Manual check, `Result: pending`** — show the rendered `PieceDate` in its `file` and `proposed` states to somebody who has not read the spec and ask **which dates are decided**. If the proposal is named as decided, the three channels are insufficient and §7 re-opens.

## Decisions Made

1. **The weekday is imported, not re-derived.** `dates.ts` takes `isoWeekday` from `@/lib/production/ics/anchors`. Two implementations of the same arithmetic drift, and a drifted weekday is precisely the failure `production-calendar.md` records — a perfectly conforming night reported as out of rule, because the night falls Friday *or* Saturday and the same Tuesday is four days from one and three from the other. One weekday computation in the phase.
2. **The four forbidden literals are not spelled, not even to forbid them.** `dates.ts` and `CalendarList.tsx` state the rule without writing the names a mechanical check greps for — the discipline `vocabulary.ts` claim (c) sets out: a grep whose only match is the sentence forbidding the thing is a grep that gets ignored the third time it goes red. This is why `CalendarList.tsx`'s colour paragraph cites `40-UI-SPEC.md` Open Question 3 instead of repeating the two token names.
3. **`CalendarList` receives its empty state.** *The import has never run* and *the import ran and read no nights* are two different facts with two different next steps, and only the page knows which. A component that chose for itself would have to guess.
4. **Row identity is a `kind` discriminant, not a nullable-field convention.** `CalendarRow` is a union of night, commitment and today; each cell branches on `kind`. A shared shape with nullable format fields would have re-admitted through the back door exactly what D-44-18 closes.

## Deviations from Plan

### Declared divergences (the plan authorised both, and they are restated so their absence is not read as omission)

**1. `NightRow.tsx` and `CommitmentRow.tsx` are not two files**
- **Found during:** Task 3
- **The plan says so explicitly:** `44-PATTERNS.md` §File Classification lists them as separate files; plan 44-05 task 3 instructs they be declared inline in `CalendarList.tsx` as two exported types plus their cells, and says *do not create the two files*.
- **Impact:** none — the structural guarantee (a commitment type with no format field) holds identically.

### Auto-fixed / auto-decided

**2. [Rule 2 — Missing critical] A seventh column, for a sentence §8.6 requires and §8.2 has no slot for**
- **Found during:** Task 3
- **Issue:** §8.6 requires the commitment row to carry the sentence `Not a re:sonate production`. §8.2 declares six columns and none of them has a card label under which that sentence reads truthfully — `Pieces:` and `Sigla:` would both be labels that lie. The `title` and `subtitle` card slots are rendered with `truncate` by `DataTable`, so the sentence would be clipped at exactly the width the card layout exists for, and the `mark` slot is `shrink-0` and would squeeze the title.
- **Fix:** a seventh column, `key: "note"`, `card: "meta"`, `cardLabel: ""` so no label prefix renders, empty on a night. Documented in the file as a stated addition rather than a drift.
- **Verification:** `verify:tables` exits 0; the sentence survives the card branch at every width.
- **Committed in:** `7334893`

**3. [Rule 2 — Missing critical] The Today marker is a row, and its rule is not full-width**
- **Found during:** Task 3
- **Issue:** §8.1 asks for one full-width rule carrying the word `Today`. `DataTable`'s column declaration has no column-spanning cell, and the primitive's own docblock is explicit that neither tree is ever transformed. The alternative — two tables with a rule between them — buys the full width by giving up the continuous list, which is the single property the marker exists for ("the distance between the last aired night and the next one is something you can see").
- **Fix:** `CalendarTodayRow`, a third variant of the row union, drawing the rule and the word in the leading cell. The list stays one list.
- **Verification:** `verify:tables` and `verify:breakpoints` exit 0.
- **Committed in:** `7334893`

**4. [Rule 3 — Blocking, NOT resolvable inside this plan] `anchors.ts` does not exist yet**
- **Found during:** Task 1 — see §Issues Encountered, which is where the residual lives. Nothing was worked around: the import is the correct final state and was left in place.

---

**Total deviations:** 2 declared, 2 auto-decided (both Rule 2), 1 blocking and unresolved by design.
**Impact on plan:** no scope creep. Both auto-decisions exist to satisfy a spec requirement the six declared columns had no room for; neither adds a colour, a token, a radius, a breakpoint, a spacing step, a badge tone or an icon. The ledger of `44-UI-SPEC.md` §1 is unchanged by this plan.

## Issues Encountered

### The build does not pass in this worktree, and the reason is a sibling plan's file

`npm run build` fails with **exactly one error**:

```
./src/app/(admin)/admin/calendar/dates.ts:1:28
Type error: Cannot find module '@/lib/production/ics/anchors' or its corresponding type declarations.
```

**What happened.** Plan 44-05 declares `depends_on: ["44-01"]`, but task 1's acceptance criteria require `dates.ts` to import `isoWeekday` from `src/lib/production/ics/anchors.ts` — which is **plan 44-03's file**, and 44-03 is in the **same wave**, running in a parallel worktree. The dependency is real and the frontmatter does not record it.

**What was done, and what was deliberately not done.**

- The import was **kept**. It is the correct final state and the plan's explicit criterion, and the domain reason is the one in Decision 1: two weekday computations drift, and a drifted weekday turns a conforming night into a reported error.
- `anchors.ts` was **not created here.** Creating it would put an add/add merge conflict between this worktree and 44-03's on a file 44-03 owns and will populate fully. A conflict blocks a merge and needs a human; a missing module resolves itself the moment 44-03 lands.
- The four files **were** typechecked: a local stub reproducing only `isoWeekday`'s declared signature (`isoWeekday(date: CivilDate): number`, Monday = 1, from 44-03's plan line 169) was created **untracked**, `npm run build` passed green with it three times — once per task — and the stub was then deleted and never staged. `git status` is clean; `git log --diff-filter=A` shows no `anchors.ts` in any commit on this branch.

**What the merge owner must know.**
1. Merge 44-03 before or with this plan. After both land, `npm run build` should be green with no edit to any file here.
2. If 44-03's `isoWeekday` ships a different signature than its plan declares, `dates.ts:1` is the single line to reconcile.
3. **The green recorded above for tasks 1–3 was measured against that stub**, not against 44-03's real implementation. It proves this plan's four files typecheck against the declared contract. It does not prove the contract was honoured, and that distinction is the whole reason it is written here instead of being called a pass.

### `verify:touch-targets` and `verify:conversion` were already red

Both refuse on a stale manifest naming four surfaces deleted by commit `763ade8` (*Finance e Analytics eliminate per intero*), long before this phase. Neither names a single file under `src/app/(admin)/admin/calendar/`. Out of scope, logged with its cost in `deferred-items.md` D1 — and the cost is worth reading: both scripts refuse **before measuring**, so those two gates are not currently checking anything at all.

## Repository Safety

`.planning/` is tracked and this repository is public. Every example in the four files is invented or is a form, never an instance: no venue beyond the two already in rotation is named anywhere, no date is written into any file, no line-up and no personal name appears, and `docs/Music-*.ics` was **not opened**. The venue word reaches the rendered row and nothing else — no `console.*`, no thrown message, no `aria-label` restating it, no analytics call, no page title. `re:sonate` is written with a normal `e` throughout; the reversed glyph is typed nowhere.

## User Setup Required

None.

## Next Phase Readiness

**Ready for plan 44-09** (the page): `CalendarNightRow`, `CalendarCommitmentRow`, `CalendarTodayRow`, `PieceTally` and `CalendarList`'s two props are the contract the server page assembles against. `CalendarList` performs no read and holds no client, so the page owns the query, the capability gate, the chronological ordering and the choice of empty state.

**Two things this plan deliberately did not build**, both belonging to later plans on the same surface: the import block of §10 (`ImportRunSummary`) and everything on S2 — the pieces list, `ChecklistItem`, and the announcement dialog.

**One blocker, named above:** this branch does not build alone. It builds after 44-03 merges.

## Self-Check: PASSED

| Claim | Method | Result |
|---|---|---|
| the four source files exist | `ls src/app/(admin)/admin/calendar/` | `CalendarList.tsx` `PieceDate.tsx` `StageBadge.tsx` `dates.ts` — all four |
| `deferred-items.md` exists | `ls` | found |
| `5ecd833` exists | `git log --oneline --all` | found |
| `fbb62cd` exists | `git log --oneline --all` | found |
| `7334893` exists | `git log --oneline --all` | found |
| the build stub was never committed | `git log --diff-filter=A -- src/lib/production/ics/anchors.ts` | no commit adds it |
| the working tree is clean | `git status --short` | only this file, untracked, about to be committed |

**Not asserted, on purpose:** that `npm run build` exits 0 on this branch alone. It does not, for the one reason set out in §Issues Encountered, and calling that a pass would be the thing `meta-gates.md` forbids in a repository with no test runner.

---
*Phase: 44-the-production-calendar-comes-inside*
*Completed: 2026-08-15*
