---
phase: 44-the-production-calendar-comes-inside
plan: 01
subsystem: api
tags: [icalendar, rfc5545, parser, civil-dates, pure-module, typescript]

# Dependency graph
requires:
  - phase: 35-the-door-tells-the-truth
    provides: the literal-source discipline (`src/lib/door/outcome.ts`) and the purity contract (`src/lib/door/classify.ts`) both modules here imitate
  - phase: 36-formats-series-and-the-stored-number
    provides: the monotone-guard precedent a progressivo inherits, and the reason an entry may never be handed a number it does not have
provides:
  - the eight closed vocabularies every other artifact of phase 44 mirrors, declared once in TypeScript
  - RFC 5545 line unfolding tolerant of LF-only input, plus the four TEXT escapes and a fold counter
  - a component-nesting `.ics` reader producing typed VEVENT records whose dates are civil strings
  - three separate finding lists, declared input bounds, and a narrow weekly recurrence expansion
affects: [44-02 migration CHECK vocabularies, 44-03 classifier, 44-04 anchors, 44-08 golden-file check, 44-09 import runner]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "literal source that imports nothing, so a divergence with @/types/database is a build error"
    - "civil dates as fixed-width strings, sliced off the YYYYMMDD prefix, never converted"
    - "date arithmetic from a days-in-month table and Sakamoto's weekday, with no epoch anywhere"
    - "three finding lists kept apart; every finding carries a uid or a line index and a reason code"
    - "input bounds asserted before any work, and refused as a returned value rather than a throw"
    - "a literal a mechanical check greps for is never written in prose"

key-files:
  created:
    - src/lib/production/ics/vocabulary.ts
    - src/lib/production/ics/unfold.ts
    - src/lib/production/ics/parse.ts
  modified: []

key-decisions:
  - "A literal that a mechanical check greps for is not written in prose anywhere in this directory — the prohibition is enforceable only because the grep has nothing to find"
  - "An entry that cannot produce a well-formed record is reported as a finding, never emitted with a placeholder duration or an invented midnight"
  - "`unfold` removes empty lines, so an index into its output is a position in that array and not a physical file line — stated, because findings quote it"
  - "The input refusal travels in `ParseResult.refusal` as a value, because Next redacts a message thrown out of a Server Action in a production build"
  - "`UNTIL`'s `Z` is dropped rather than honoured: honouring it means converting, and converting is what moves a weekday"

patterns-established:
  - "Pattern 1: the phase's vocabularies live in one importless module and the SQL CHECKs mirror it — editing either set means editing both, in the same commit"
  - "Pattern 2: no date object is constructed anywhere under src/lib/production/ics/, and the check for it is a directory-wide grep that must find nothing"
  - "Pattern 3: a diagnostic carries an identifier and a reason code; a SUMMARY never leaves the parser"

requirements-completed: [PROD-01]

# Metrics
duration: 14min
completed: 2026-08-15
---

# Phase 44 Plan 01: The Pure `.ics` Reader Summary

**Three pure modules under `src/lib/production/ics/` — eight closed vocabularies, RFC 5545 unfolding that tolerates the LF-only file the calendar actually exports, and a component-nesting reader that turns 92 entries into typed records whose dates are civil strings no timezone can move.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-08-15T00:56Z
- **Completed:** 2026-08-15T01:10Z
- **Tasks:** 3
- **Files created:** 3 (0 modified)

## Accomplishments

- **The literal source exists.** Eight `as const` tuples with their derived unions — piece kinds, date origins, unresolved reasons, entry classes, naming conventions, venue stages, anchor kinds, anchor directions — plus a **total** `Record<PieceKind, string>` of production's own words, so a seventh kind without a label is a `npm run build` error. The module imports nothing, which is what makes it the source rather than a copy.
- **The nesting is tracked, and it was proved.** A synthetic calendar holding five `DTSTART`s — two inside a `VTIMEZONE`'s children, one inside a `VALARM` — produced **three** events, and the `VALARM`'s date did not land on the event enclosing it. That is Pitfall 3 (96 `DTSTART`s for 92 events) demonstrated rather than asserted.
- **No date object is constructed anywhere in the directory**, and a directory-wide grep for the four names one would reach for finds **nothing at all** — not even in a comment. A 22:00→06:00 night measures 480 minutes, computed from the civil parts and a days-in-month table.
- **Three finding lists, never one.** `malformed`, `unsupportedRecurrences` and `refusedProperties` stay apart, and every field of every finding is an identifier, a property name or a code. No `SUMMARY` can leave the parser through a diagnostic.
- **The refusals are written while they are cheap.** `RECURRENCE-ID`, `EXDATE` and `RDATE` appear zero times in the file today and are refused and reported by UID; a recurrence outside `FREQ=WEEKLY` + `BYDAY` + `UNTIL` (+`INTERVAL`) returns an empty array and a distinct reason code, never a partial expansion.

## Task Commits

1. **Task 1: the literal source** — `01f2799` (feat)
2. **Task 2: RFC 5545 unfolding** — `72b57e0` (feat)
3. **Task 3: the nesting parser** — `54c5b62` (feat)
4. **Deviation follow-up: the no-Date claim stops spelling what it forbids** — `8958ff8` (docs)

## Files Created

- `src/lib/production/ics/vocabulary.ts` — the eight vocabularies, the total label record, and `CivilDate` / `CivilTime`. Docblock carries the three required claims with their reasons: the SQL mirror is real for this module (unlike a capability key), the seventh piece kind is prohibited, and no date object is constructed in this directory.
- `src/lib/production/ics/unfold.ts` — `unfold` (splits on `/\r?\n/`), `unescapeText` (the four TEXT escapes, one left-to-right pass, non-recursive) and `countFoldedLines` (measured off the raw text, so plan 44-08 asserts the unfolder *ran*, not that it compiled).
- `src/lib/production/ics/parse.ts` — `parseIcs`, the `IcsEvent` record, the three finding lists, `MAX_INPUT_BYTES` / `MAX_INPUT_LINES`, and `expandWeeklyRecurrence`.

## Decisions Made

1. **A literal a mechanical check greps for is never written in prose.** Applied directory-wide, to the prohibited seventh piece kind and to the four date-constructor names. The reason is the one `src/app/(admin)/admin/formats/actions.ts:58-63` already records: *a grep whose only match is the sentence forbidding the thing is a grep that gets ignored the third time it goes red.* Each prohibition is now stated **with its reason** and **without its word**.
2. **An unreadable entry becomes a finding, not a record with a placeholder.** A missing `DTSTART`, a `VALUE=DATE` form, an end before its start: each is reported by line index with a distinct reason, and the event is not emitted. Emitting one with a zero duration or an invented midnight would be a number standing in for *we could not read this*, which is exactly what OBS-03 forbids.
3. **`unfold` removes empty lines,** because an empty line carries no property and no component marker, and every file ending in a newline produces one. The consequence is stated in the docblock and in this summary: an index into the returned array is a position in that array, not a physical file line. It is enough to locate a problem by hand, and it is deliberately the only positional information a finding carries.
4. **The input refusal is a returned value.** `ParseResult.refusal` carries a code and two counts. A thrown message would work in `next dev` and arrive blank in the deployment, which is a silent failure in a product with no error tracking.
5. **`UNTIL`'s `Z` is dropped rather than honoured.** Honouring it means converting; converting means an instant; an instant is what moves a weekday. Being one evening generous at the end of a closed window is not a failure mode this pipeline has.
6. **The weekday comes from Sakamoto's method,** integer arithmetic on year/month/day with no epoch, and day-to-day movement comes from the days-in-month table the plan named. Both were confirmed against the system `date` tool rather than against the module under test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The plan's Task 1 action and its own acceptance criterion contradicted each other**

- **Found during:** Task 1
- **Issue:** The action required the docblock to carry the claim that the prohibited seventh piece kind *"is not a member and must never become one"*, naming it. The acceptance criterion on the same task required that word to occur **zero** times in the file. Both cannot hold literally.
- **Fix:** Resolved in favour of the mechanical criterion, which is also what the project's own discipline requires (`44-PATTERNS.md` §Confidentiality, citing `formats/actions.ts:58-63`). The claim is stated in full — what the other thing is, why it is a different thing, why drawing it beside real dates reads as an announcement — and the word itself is not spelled. `production-calendar.md`'s gate is cited by name instead.
- **Files modified:** `src/lib/production/ics/vocabulary.ts`
- **Verification:** `grep -c "…" src/lib/production/ics/vocabulary.ts` → 0; directory-wide → 0.
- **Committed in:** `01f2799`

**2. [Rule 3 — Blocking] The same contradiction, on the date-constructor names**

- **Found during:** Task 3, then Task 1 retroactively
- **Issue:** Task 2's acceptance criterion requires `grep -c "new Date"` to return **0**, while the plan's purity instructions ask each docblock to say *"no `new Date`"*. `parse.ts` initially failed its own criterion on a comment line, and `vocabulary.ts` — whose criteria do not include this grep — was spelling all four names, which would have made any directory-wide purity check go red on prose.
- **Fix:** Both docblocks now state the prohibition without the literals, and `vocabulary.ts` states the narrow rule that governs the choice: a literal some mechanical check greps for is not written in prose; `Date.now()` stays spelled, because nothing greps for it and it belongs to the purity sentence inherited from `src/lib/door/classify.ts:37-41`.
- **Files modified:** `src/lib/production/ics/parse.ts`, `src/lib/production/ics/vocabulary.ts`
- **Verification:** `grep -rnE "new Date|toISOString|toLocaleDateString|Intl\.DateTimeFormat" src/lib/production/ics/` → no match; `npm run build` exits 0.
- **Committed in:** `54c5b62`, `8958ff8`

**3. [Rule 2 — Missing critical] `ParseResult` gained a `refusal` field**

- **Found during:** Task 3
- **Issue:** The plan requires the input bounds to *"refuse with a named reason"* but names no carrier for that reason, and `ParseResult` as specified has nowhere to put one. Throwing would violate the phase's own rule that a refusal travels as a value.
- **Fix:** Added `refusal: ParseRefusal | null` carrying a code plus the measured magnitude and the limit — counts only, safe to read anywhere. The three finding lists are untouched, so the acceptance grep still sees three distinct fields.
- **Files modified:** `src/lib/production/ics/parse.ts`
- **Verification:** scratch run over a 1 MiB + 1 byte input returns `{"reason":"input_too_large","measured":1048577,"limit":1048576}` and parses nothing.
- **Committed in:** `54c5b62`

---

**Total deviations:** 3 auto-fixed (2 blocking contradictions in the plan text, 1 missing critical field)
**Impact on plan:** No scope change. Two of the three are the plan asking for a sentence its own grep forbids; the resolution keeps both the claim and the enforceability. The third makes a refusal expressible at all.

## Issues Encountered

- **`npm run build` is the only gate, and it does not read the file.** Nothing in this plan proves the reader reads the real calendar correctly, and nothing here claims it does. The counts — 92 events, 92 distinct UIDs, 3 folded lines, 1 event-level `RRULE` — are plan 44-08's golden-file check, and that check is the whole reason a hand-written reader is defensible rather than dependency avoidance.
- **Behaviour was checked outside the repository, on synthetic input.** `docs/Music-*.ics` was **not opened**, per the plan's instruction. The scratch calendar used for the sanity run holds invented titles and neutral dates and lives in the session scratchpad, outside the working tree; nothing from it reached source, a fixture or this document.

## Notes for the Plans Downstream

- **Plan 44-02 (migration):** six of the eight tuples are the SQL `CHECK` vocabularies — `PIECE_KINDS`, `PIECE_DATE_ORIGINS`, `UNRESOLVED_REASONS`, `NAMING_CONVENTIONS`, `VENUE_STAGES`, and the `ANCHOR_KINDS` / `ANCHOR_DIRECTIONS` pair. Copy the strings from `vocabulary.ts`; do not retype them. Editing either side means editing both in the same commit.
- **Plan 44-08 (golden check):** `countFoldedLines` exists for the *3* assertion and measures the raw text, not the unfolder's output, so it is a measurement rather than an echo. `MAX_INPUT_BYTES` and `MAX_INPUT_LINES` are exported so the check can state the bounds it is inside.
- **Plans 44-03 / 44-04 (classifier and anchors):** `IcsEvent.tzid` is reachable and carries **no** classification signal — two identifiers appear, mixed across every kind of entry. `durationMinutes` is likewise a *warning* signal only: the grammar decides, and a disagreement between grammar and duration gets reported, never resolved by duration.
- **`ANCHOR_KINDS` and `ANCHOR_DIRECTIONS` are declared and not yet consumed.** They are here because the vocabulary is the phase's single source and the migration mirrors it; the resolver that reads them is plan 44-04.

## Known Stubs

None. Every export in the three modules is implemented and exercised; nothing returns a hardcoded empty value except `expandWeeklyRecurrence` on an unsupported rule, where an empty array *is* the specified refusal and the caller reports it through `unsupportedRecurrences`.

## Threat Flags

None. No network endpoint, no auth path, no file access and no schema change: all three modules are pure transforms with no imports outside this directory.

## Next Phase Readiness

- The bottom two thirds of the reader are in place and the vocabulary is declared, so the migration (44-02), the classifier (44-03) and the anchor resolver (44-04) can all be written against a fixed set of literals.
- **Blocker for nothing; caveat for everything downstream:** until 44-08's golden check runs against the real file on the owner's machine, no plan may state that the reader parses the calendar correctly. It compiles, and it behaves correctly on synthetic input. Those are two different claims.

## Self-Check: PASSED

- `src/lib/production/ics/vocabulary.ts` — FOUND
- `src/lib/production/ics/unfold.ts` — FOUND
- `src/lib/production/ics/parse.ts` — FOUND
- `01f2799` — FOUND
- `72b57e0` — FOUND
- `54c5b62` — FOUND
- `8958ff8` — FOUND
- `npm run build` — exits 0

---
*Phase: 44-the-production-calendar-comes-inside*
*Completed: 2026-08-15*
