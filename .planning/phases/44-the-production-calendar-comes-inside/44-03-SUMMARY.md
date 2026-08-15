---
phase: 44-the-production-calendar-comes-inside
plan: 03
subsystem: api
tags: [classifier, anchors, civil-dates, weekday-arithmetic, pure-module, typescript]

# Dependency graph
requires:
  - phase: 44-the-production-calendar-comes-inside
    plan: 01
    provides: the eight closed vocabularies, the `IcsEvent` record and the civil-date discipline both modules here are written against
  - phase: 44-the-production-calendar-comes-inside
    plan: 02
    provides: the `production_pipeline_rule` storage form — `(anchor kind, weekday, direction)` — that `PipelineRule` mirrors field for field
  - phase: 35-the-door-tells-the-truth
    provides: the classify-after-the-fact shape and the purity contract stated as a sentence (`src/lib/door/classify.ts`)
provides:
  - four entry classes decided by three declared grammars, with the alias map as an argument and never a literal
  - one join key all three grammars normalise to, resolved through the declared abbreviation and never from a format plus a number
  - the four civil-date primitives this repository owns, computed on integers with no epoch and no instant
  - anchors resolved as weekdays relative to `self`, `next_edition` or `next_edition_listing`
  - three distinct refusals, and a conformance value documented as reaching no pixel
affects: [44-05 reconciler, 44-08 golden-file check, 44-09 import runner, 44-10 calendar surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "the alias map travels as an argument, so a word for a space never enters a public repository"
    - "a corroborating signal is computed after the grammar has decided, and travels as its own finding"
    - "load-time assertion over a declared vocabulary, in a repository with no test runner"
    - "a weekday resolved relative to an anchor event, never a stored distance in days"
    - "an error message that refuses to echo the value that caused it, because the value is a date"

key-files:
  created:
    - src/lib/production/ics/classify.ts
    - src/lib/production/ics/anchors.ts
  modified: []

key-decisions:
  - "The alias map is keyed on the word the calendar writes — a venue word or a format word — because a night without a venue suffix needs the same lookup a night with one needs"
  - "The set of words the declaration knows IS the classifier's vocabulary, which is what lets the module hold no format word and no venue word at all"
  - "The last two refusals are checked anchor-first: the anchor decides whether a place exists, the line-up only how many pieces go in it"
  - "`before` and `after` are strictly exclusive — the nearest preceding Tuesday of a Tuesday is a week earlier, because a piece that announces a night cannot be the night"
  - "A malformed civil date throws with the value deliberately not echoed, because a date in this calendar may be an unannounced one and an error message is an ordinary way for one to reach a log"

patterns-established:
  - "Pattern 4: the confidential half of a mapping is an argument, and the module states the prohibition in the negative — no such word, not even in an example"
  - "Pattern 5: a signal strong enough to classify with is deliberately demoted to a finding, computed after the decision it must not influence"

requirements-completed: [PROD-01]

# Metrics
duration: ~45min
completed: 2026-08-15
---

# Phase 44 Plan 03: The Classifier and the Anchors Summary

**Two pure modules that turn parsed entries into meaning — four classes decided by three
declared grammars with the alias map held at arm's length, and piece dates resolved as
weekdays relative to an anchor event, with three refusals that stay three.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-08-15
- **Tasks:** 2
- **Files created:** 2 (0 modified)

## Accomplishments

- **Three grammars, and the third one demonstrated rather than asserted.** A synthetic
  calendar carrying all three shapes produced a canonical piece, a **legacy inverted**
  piece and a night that all normalise to the same key form. D-44-21 records two
  grammars; a two-grammar reader drops the legacy three, and with them the only live
  evidence that a written date must beat a computed one.
- **The join is keyed on the word, and the measurement that forced it was reproduced.**
  On a synthetic pair, a night written `<Format> x <Word> <NNN>` resolved through the
  **word**, not through the format — the two are declared to different series codes, and a
  reader keyed on the format would have joined the piece to the wrong night. A word the
  declaration does not cover came back as `alias_unresolved` and was **not** attached to
  the nearest series.
- **The duration warned and did not decide.** A synthetic night booked at 11:00 for thirty
  minutes was still classified as a night by its grammar, and appeared in
  `durationDisagreements` — the exact behaviour that stops the first piece booked at an
  unusual hour from being silently reclassified.
- **One rule, a Friday night and a Saturday night, the same Tuesday.** Resolved against a
  Friday edition and against a Saturday edition, the LiveCut rule returned **2026-11-10**
  in both cases. That single pair of lines is the phase's criterion 3: a stored distance
  would have produced two different answers and reported one of the two nights as an
  error.
- **The weekday arithmetic was verified against a source outside the module.** `isoWeekday`
  was checked against the system `date` tool on seven dates including two century
  boundaries — `1900-03-01` (not a leap year) and `2000-02-29` (one) — and matched on
  every one. Nothing was checked against the module under test.
- **The three refusals came back as three distinct values**, and the archive's real shape
  reproduced: with no following edition, both the LiveCut and the after movie returned
  `awaiting_next_edition` naming the edition, rather than inventing dates for a night that
  does not exist. Both non-derivable listings returned `not_derivable` with no date at all.
- **Neither module holds a word for a space, a format word, a series code or a date.** The
  vocabulary the classifier matches nights on is the caller's alias map; the vocabulary it
  matches pieces on is `PIECE_KIND_LABELS`. There is nothing in either file for a reader
  to learn about the calendar.

## Task Commits

1. **Task 1: the classifier** — `fb24905` (feat)
2. **Task 2: the anchor resolver** — `ac07a78` (feat)

## Files Created

- `src/lib/production/ics/classify.ts` — `classifyEntry`, `classifyEntries`, `joinKey`,
  `durationDisagreement`, `INCLUSION_RULE`, `UNCLASSIFIED_REASONS`, and the four classified
  record shapes. Two load-time assertions: one that no two piece labels collapse to the
  same lower-cased word, one that every declared naming convention has a grammar branch.
- `src/lib/production/ics/anchors.ts` — `isoWeekday`, `addDays`, `isoWeekStart`,
  `nearestWeekday`, `resolveAnchor`, `proposePieceDate`, `conformsToRule`, plus
  `PipelineRule` and `AnchorContext`. Two load-time assertions covering `ANCHOR_KINDS` and
  `ANCHOR_DIRECTIONS`, which plan 44-01 declared and nothing had yet consumed.

## Decisions Made

1. **The alias map is keyed on *the word the calendar writes*, not on a venue word alone.**
   A night with no venue suffix carries only its format word, and a legacy piece carries
   only its format word too. One map, one lookup, three grammars. The consequence is the
   good one: the set of words the declaration knows becomes the classifier's entire
   vocabulary, so the module needs **no format word and no venue word of its own** — which
   is what makes the confidentiality claim enforceable rather than aspirational.
2. **A known word with no grammar is *ours and unreadable*; an unknown word with no grammar
   is somebody else's day.** That single test is what separates the sixteen commitments
   from the three unclassified entries the measurement found, and it is written as the last
   two lines of `INCLUSION_RULE` so it can be read without reading the branches.
3. **`before` and `after` are strictly exclusive.** The nearest preceding Tuesday of a
   Tuesday is the one a week earlier, because a piece that announces a night cannot be the
   night itself. Stated in the docblock with the escape hatch named: if a rule ever needs
   the other reading, the **row** is the thing to change — which is why it is a row.
4. **An error message here does not echo the value that caused it.** A malformed civil date
   is a programming error, so the primitives throw; but a date in this calendar may be an
   unannounced one, and an error message is a perfectly ordinary way for one to reach a
   log. The message says which argument, and says why it is not printing it.
5. **The vocabularies plan 44-01 declared and left unconsumed are now consumed as
   assertions.** `ANCHOR_KINDS`, `ANCHOR_DIRECTIONS` and `NAMING_CONVENTIONS` are each
   walked at import against the set of branches that exist. A member added to any of them
   without a branch here is a rule the database would store and the resolver could not
   read — a piece with no date and no reason for having none.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The last two refusals had to be checked anchor-first**

- **Found during:** Task 2
- **Issue:** The plan lists the refusals as *not derivable → depends on line-up → awaiting
  the next edition*. Implemented in that order, the archive's final edition — which has
  neither a following night nor a settled line-up — reports its LiveCuts as
  `depends_on_lineup`. The measured, recorded behaviour is the other one:
  `production-calendar.md` and D-44-25 both say that edition's LiveCuts and after movie are
  **waiting for the following edition**, and D-44-12's "says it is waiting" was extended to
  cover the LiveCuts precisely for this case.
- **Fix:** The anchor is resolved before the line-up is consulted. The reason is written
  into the docblock rather than left as an ordering: the anchor decides whether a *place*
  exists at all; the line-up only decides how many pieces go in it.
- **Files modified:** `src/lib/production/ics/anchors.ts`
- **Verification:** with no following edition, both the LiveCut rule and the after-movie
  rule return `awaiting_next_edition` naming the edition; with a following edition and no
  line-up, the LiveCut rule returns `depends_on_lineup`.
- **Committed in:** `ac07a78`

**2. [Rule 2 — Missing critical] `proposePieceDate` gained a defaulted episode index**

- **Found during:** Task 2
- **Issue:** The plan specifies `proposePieceDate(rule, context)` as *the single entry
  point*, and the migration's contract says *the first episode falls on `anchor_weekday`;
  any further episodes fall on the following days*. With no way to name an episode, a
  two-episode rule is unrepresentable and the reconciler would have needed a second entry
  point — which is what "single" was there to prevent.
- **Fix:** A third parameter, `episodeIndex`, defaulting to `0`, so the plan's two-argument
  call is still valid and the contract is expressible. Asking for an episode a rule does
  not have is a `RangeError`, because producing a date for a piece nobody owes puts an
  invented date beside real ones.
- **Files modified:** `src/lib/production/ics/anchors.ts`
- **Verification:** a two-episode rule anchored to a Monday returns the Monday and the
  Tuesday; a three-episode line-up anchored to a Tuesday returns the Tuesday, the Wednesday
  and the Thursday.
- **Committed in:** `ac07a78`

**3. [Rule 3 — Blocking] `ClassificationResult` had no producer**

- **Found during:** Task 1
- **Issue:** The plan names `classifyEntry(event, aliases): ClassifiedEntry` as the export
  and separately requires a `ClassificationResult` carrying six lists. One entry cannot
  produce six lists, and the duration finding is required to be computed **after** the
  grammar has decided — which is a property of a pass over the file, not of a single call.
- **Fix:** `classifyEntries(events, aliases)` added beside `classifyEntry`. It is the only
  place the duration signal is consulted, which is how the acceptance criterion — *its
  return value is not read by `classifyEntry`'s branch selection* — is satisfied by
  construction rather than by discipline.
- **Files modified:** `src/lib/production/ics/classify.ts`
- **Verification:** `classifyEntry` contains no call to `durationDisagreement`;
  `classifyEntries` calls it once, after the entry has already been classified.
- **Committed in:** `fb24905`

**4. [Rule 2 — Missing critical] `PipelineRule` carries `episodeCount`, `AnchorContext`
carries `nextEditionLabel`**

- **Found during:** Task 2
- **Issue:** The plan's rule tuple lists `(anchor_kind, anchor_weekday, anchor_direction,
  derivable, episodes_from_lineup)` and omits `episode_count`, which the applied migration
  has and which SunSet's two-episode rule depends on. Separately, the plan requires the
  refusal to name the edition (`edition?: string`) but gives the resolution nothing to read
  the name from.
- **Fix:** Both fields added, mirroring the columns. `nextEditionLabel` is documented as a
  **series code and a progressivo supplied by the caller, never a title** — a series code is
  already public, a title from this calendar is not.
- **Files modified:** `src/lib/production/ics/anchors.ts`
- **Committed in:** `ac07a78`

---

**Total deviations:** 4 auto-fixed (1 ordering bug that would have reported the wrong
reason on the archive's real shape, 2 missing fields/parameters the applied migration
requires, 1 missing producer).
**Impact on plan:** No scope change. Both files are the ones the plan names, and every
acceptance grep passes.

## Verification — what was done, and what it does not mean

- `npm run build` exits **0** after each task. That is the typecheck gate and it is the
  only automatic one this product has.
- Every acceptance grep on both tasks passes, measured:

  | Assertion | File | Result |
  |---|---|---|
  | three grammars named | `classify.ts` | 61 lines (≥ 3 required) |
  | no alias literal | `classify.ts` | 0 |
  | no date constructor | `classify.ts` | 0 |
  | no I/O | `classify.ts` | 0 |
  | `NAMING_CONVENTIONS` imported | `classify.ts` | 2 import lines from `./vocabulary` |
  | no date constructor, no weekday getter | `anchors.ts` | 0 |
  | no stored distance in days | `anchors.ts` | 0 |
  | three anchor kinds handled | `anchors.ts` | 10 lines (≥ 3) |
  | three refusals returned distinctly | `anchors.ts` | 8 lines (≥ 3) |
  | the four primitives exported | `anchors.ts` | 4 |
  | directory-wide date-constructor purity | `src/lib/production/ics/` | no match |

- **Behaviour was checked outside the repository, on synthetic input.** `docs/Music-*.ics`
  was **not opened**. The scratch calendar holds invented titles (`Alpha`, `Beta`, `Gamma`)
  and neutral dates, lives in the session scratchpad outside the working tree, and nothing
  from it reached source, a fixture or this document.
- **The weekday arithmetic was verified against an independent source** — the system `date`
  tool — and not against the module under test: `2026-01-01`→4, `1900-03-01`→4,
  `2000-02-29`→2, `2026-11-13`→5, `2026-11-14`→6, `2027-01-05`→2, `2027-03-01`→1, all
  matching.
- **What a green does NOT mean.** A compiling classifier is not a correct one. The counts
  (56 canonical, 3 legacy, 14 nights, 19 in the fourth class; zero nights matched by a
  series code alone) and the conformance figures (timetable 7/7, night LiveCut 6/6 in the
  following edition's ISO week, after movie 6/7, SunSet LiveCut 6/6, both listings
  withheld) are asserted **only** by `scripts/verify-ics-import.mjs`, which plan 44-08
  creates. **No claim is made here that criterion 3 is satisfied.**

## Issues Encountered

- **The plan's refusal ordering and the calendar's recorded behaviour disagreed**, and the
  calendar won — the same gate `production-calendar.md` states as *il calendario batte il
  tracker*, applied to a plan instead of a tracker. Recorded as deviation 1 rather than
  silently reordered.
- **The alias map's shape had to be settled before the classifier could avoid every literal.**
  Keying it on the word the calendar writes — rather than on a venue word alone — is what
  removed the last reason to spell a format word in tracked source. It is a decision the
  plan implies but does not state, and plans 44-05 and 44-09 have to populate the map that
  way or nights without a venue suffix will not join.

## Notes for the Plans Downstream

- **Plan 44-05 (reconciler):** call `classifyEntries` once per import, then
  `proposePieceDate` **only** for pieces the file does not carry — a written date always
  wins and this module must never be consulted for one. A proposal carries
  `origin: 'proposed'` at your call site; nothing in `anchors.ts` sets it.
- **Plan 44-05 / 44-09 (the alias map):** build it from `party_series.ics_alias`, keys
  **lower-cased**, and include the row for a series with no venue suffix — its alias is the
  format word, and without it a night written as `<Format> <NNN>` resolves to nothing and
  lands in `aliasUnresolved`.
- **Plan 44-08 (golden check):** `INCLUSION_RULE` is exported as six sentences precisely so
  the check can print the declared rule beside the measured counts. `UNCLASSIFIED_REASONS`
  is a closed set of four and is the right thing to break the class-D total down by.
- **Plan 44-10 (surface):** `conformsToRule` reaches **no pixel**. It returns `boolean |
  null`, and `null` is *we cannot say*, not *it diverges*. Drawing it would quietly reverse
  D-44-10.
- **`ClassifiedCommitment.title` is the one field in either module that carries text out of
  the file.** It exists because `production_commitment.title` does. It goes to that column
  and to no log, no toast and no document.

## Known Stubs

None. Every export in both modules is implemented and exercised on synthetic input. The
only values returned without computation are the three refusals, where withholding **is**
the specified behaviour and each one carries its own reason.

## Threat Flags

None. Both modules are pure transforms: no network endpoint, no auth path, no file access,
no schema change, and no import outside this directory.

## Next Phase Readiness

- Criterion 3's machinery exists and compiles: the join across three grammars, and anchors
  resolved as weekdays relative to an anchor event with no stored distance anywhere.
- **Blocker for nothing; caveat for everything downstream:** until 44-08's golden check runs
  against the real file on the owner's machine, no plan may state that the classifier
  classifies the calendar correctly or that the anchors describe it. Both compile, and both
  behave correctly on synthetic input. Those are two different claims.

## Self-Check: PASSED

- `src/lib/production/ics/classify.ts` — FOUND
- `src/lib/production/ics/anchors.ts` — FOUND
- `fb24905` — FOUND
- `ac07a78` — FOUND
- `npm run build` — exits 0
- `.planning/STATE.md`, `.planning/ROADMAP.md` — untouched, as instructed

---
*Phase: 44-the-production-calendar-comes-inside*
*Completed: 2026-08-15*
