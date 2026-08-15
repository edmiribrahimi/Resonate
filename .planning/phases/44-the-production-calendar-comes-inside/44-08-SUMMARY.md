---
phase: 44-the-production-calendar-comes-inside
plan: 08
subsystem: testing
tags: [golden-file-check, verification-script, mutation-proof, confidentiality, idempotence, node-type-stripping]

# Dependency graph
requires:
  - phase: 44-the-production-calendar-comes-inside
    plan: 01
    provides: the vocabularies, the unfolder with its fold counter, and the parser this check exercises
  - phase: 44-the-production-calendar-comes-inside
    plan: 02
    provides: the CHECK constraints check G mirrors, and the sixteen pipeline rule rows check D reads instead of copying
  - phase: 44-the-production-calendar-comes-inside
    plan: 03
    provides: the classifier and the anchor resolver, and `INCLUSION_RULE` as prose a check can quote
  - phase: 44-the-production-calendar-comes-inside
    plan: 06
    provides: `reconcile` and `isEmptyPlan`, which make the idempotence claim askable
  - phase: 41-shared-primitives-three-tier-layout
    provides: `scripts/lib/comments.mjs`, the comment stripper check H greps through
provides:
  - the golden-file check — eight lettered checks against the real calendar, printing counts and never a line of it
  - the first automated evidence for criterion 3 (anchors resolved by weekday) and criterion 5 (a second import changes nothing)
  - a confidentiality check that reads its own transcript, so "the output carries no material" is measured rather than intended
  - a `verify:ics` entry, and a third not-run list in the aggregate so a green `npm run verify` says what it did not cover
  - two corrections to `44-RESEARCH.md`, measured off the file rather than remembered
affects: [44-10 import runner, 44-13 human verification, phase VERIFICATION.md]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a verification script that IMPORTS the TypeScript module it checks, through a resolve hook, instead of re-implementing it"
    - "a check that reads its own captured output as evidence, and refuses to print what it found"
    - "expected values read out of the applied migration rather than copied into the checker"
    - "a third not-run list in the aggregate, because the reason printed beside a name is the value of naming it"

key-files:
  created:
    - scripts/verify-ics-import.mjs
  modified:
    - package.json
    - scripts/verify-all.mjs

key-decisions:
  - "The check imports the module through a Node resolve hook rather than re-implementing any of it — a checker that re-implements its subject agrees with itself"
  - "The sixteen pipeline rules are parsed out of the applied migration, so check D cannot drift from the rows the database holds"
  - "No exemption list for check F, ever: this file declares three names of spaces, and any source-presence exemption would exempt exactly those three"
  - "When F collides with an ordinary English word, the repair is to say less in the output, never to widen the check"
  - "The file name is never printed, because a snapshot is named after the day it was taken"
  - "`NEEDS_MATERIAL` is a third list rather than a second `NEEDS_SERVER` entry, because 'needs a running dev server' would be a false sentence about this gate"

patterns-established:
  - "Pattern 8: a verification script whose own output is a publication surface, and which asserts that over its transcript"
  - "Pattern 9: the checker reads the shipped configuration (migration rows) for its expectations, and declares only what the configuration cannot give it"

requirements-completed: [PROD-01]

# Metrics
duration: ~85min
completed: 2026-08-15
---

# Phase 44 Plan 08: The Golden-File Check Summary

**Eight lettered checks that hold the hand-written calendar reader against the real file and print nothing but counts — container, classes, join with its negative control, anchors by weekday, an empty second reconciliation, the run's own confidentiality, the SQL mirror and the unreachable night table — every one of them broken on purpose, watched firing, and restored.**

## Performance

- **Duration:** ~85 min
- **Tasks:** 3
- **Files created:** 1
- **Files modified:** 2

## The run, as it stands

```
  ✓ A  92 entries · 92 distinct UIDs · 3 folded line(s) actually joined · 0 carriage
       returns left · 0 date-valued stamps · 1 event-level RRULE of 5 · 0 recurrence
       exceptions
       and the nesting proof: 96 DTSTART lines produced 92 entries — the other 4 are
       inside the 2 VTIMEZONE components, and 40 VALARM components contributed none
  ✓ B  class A 56 · class B 3 · class C 14 · class D 19 (16 commitments + 3 recorded,
       never guessed) · total 92
       kind vocabulary exactly the 6 · 0 entries carrying the seventh-kind word ·
       0 unresolved aliases · 5 series codes, all published
  ✓ C  0 nights resolve with an empty alias map (the negative control) · 0 join keys
       carried by two nights · 0 announcing pieces dated after their night · 1 piece
       whose edition the file does not carry
  ✓ D  timetable 7/7 on the night itself · the night's LiveCut 6/6 editions
       (17 episodes) in the next edition's ISO week · after movie 6/7, the seventh a
       legacy-form entry whose edition the file does not carry
       satellite Tonight 2/2 same-day · satellite Recap 2/2 and LiveCut 2/2 the Monday
       after · SunSet LiveCut 6/6 on the Monday and the Tuesday
       and 2 listing rules reported not_derivable and proposed nothing · 16 rules read
       from the migration
  ✓ E  first pass 14 plans · 65 pieces · 47 commitment rows · 106 checklist items;
       second pass over the same file: an EMPTY plan
  ✓ G  21 declared members across 6 vocabularies, each accepted by a CHECK constraint ·
       9 CHECK vocabularies read from 2 migration(s), none carrying a member the
       TypeScript lacks
  ✓ H  0 live references to the announced-night table across 7 module files ·
       0 server-action directives across 7 files in the reader's own tree
  ✓ F  23 residual token(s) across 92 titles, 0 of them in the 169 tokens this run
       printed · 0 four-digit years

  ICS_IMPORT_OK — all eight checks passed.
```

Every measured figure matches what `44-RESEARCH.md` recorded, and the two that do not are corrections, below.

## Accomplishments

- **The check exercises the module and re-implements none of it.** `parseIcs`, `unfold`, `countFoldedLines`, `classifyEntries`, `conformsToRule`, `proposePieceDate`, `reconcile` and `isEmptyPlan` are imported from `src/lib/production/ics/`. Node resolves no extensionless specifier and the barrel is written with them, so a `module.registerHooks` resolve hook appends `.ts` for a relative specifier that exists on disk. Nothing about what the modules *do* is touched.
- **The expectations that could be read were read, not copied.** The sixteen pipeline rules come out of `20260815120000_production_calendar.sql`, parsed from its two `VALUES` blocks, with the format-level default and the series-level override resolved the way the runner will resolve them. A second copy of sixteen rows in a checker drifts silently: the copy keeps passing while the real rows move.
- **A is an assertion about the unfolder RUNNING, not compiling.** It compares logical lines against non-empty physical lines and requires the difference to equal what `countFoldedLines` reports off the raw text. A structurally identical unfolder that silently did nothing type-checks, builds and deploys; this is what tells them apart.
- **C carries its negative control and gained a second arm.** With an empty alias map, zero nights resolve — the proof that the declared abbreviation is doing the work. And no join key is carried by two nights, which is the direct signature of a join keyed on a format plus a number.
- **E is criterion 5's only automated evidence.** `reconcile` runs against nothing, the rows it would have written become the snapshot, and it runs again: 14 plans, 65 pieces, 47 commitment rows and 106 checklist items on the first pass, and an empty plan on the second. 126 rows are stamped as still present, which is a stamp and not a write.
- **F reads the run's own transcript**, strips the public tokens from every parsed title, and asserts no remaining token appears in what was printed — and it refuses to print the tokens it finds, because printing them to report them would perform the leak.
- **The output names no file.** A snapshot is named after the day it was taken, so its name is a date. F would have caught it; the script never prints it in the first place.
- **`npm run verify` says what it did not cover.** 18 entries declared, 18 accounted for, `verify:ics` named in the NOT RUN block with its precondition beside it.

## Task Commits

1. **Task 1: the golden-file check** — `1f3b58c` (feat)
2. **Task 2: the mutation proof** — `aad0c94` (test)
3. **Task 3: `verify:ics`, named but not run by the aggregate** — `3e50e6b` (chore)

## The mutation proof — eight rows

Every mutation was applied to a **source module or an expected constant, never to `docs/`**. In each row the mutation was confirmed by reading the line back **before** the check was run, because a substitution that silently failed to match produces a green that means the opposite of what it appears to mean.

| Check | Mutation | Mutation landed | Observed | Restored |
|---|---|---|---|---|
| **F** | `scripts/verify-ics-import.mjs` prints one parsed `SUMMARY` after the parse | `grep -c MUTATION_F` → **1** | `✗ F this run's own output carries material`, `ICS_IMPORT_FAIL — 1 check(s) failed: F`. The offending line was filtered out of the terminal rather than read | `grep -c MUTATION_F` → **0**; `git status --porcelain` empty |
| **A** | `unfold.ts:89` splits on `/\n/` instead of `/\r?\n/` | line 89 reads `text.split(/\n/)` | `✗ A … 1408 unfolded line(s) kept a carriage return`; B, C, D and E cascaded | line 89 reads `text.split(/\r?\n/)` |
| **B** | `classify.ts:421` — the legacy grammar branch disabled | line 421 reads `if (false && legacy !== null)` | `✗ B ZERO entries read under the legacy grammar…`, with the written-out reason about the two anchor overrides | line 421 reads `if (legacy !== null) return legacy;` |
| **C** | `classify.ts:368` — `joinKey` keyed on the format half only, dropping the word for the space | line 368 reads `…toUpperCase().split("-")[0]}#…` | first run: `✗ C` on the orphan arm only. Check strengthened, then re-run: `✗ C 2 join key(s) are carried by more than one night` **and** `3 announcing piece(s) dated after the night they announce` | line 368 reads `…toUpperCase()}#${number}` |
| **D** | `anchors.ts:489-490` — `next_edition` resolves to the night's own date | line 490 reads `return context.nightDate;` | `✗ D the night's LiveCut, in the next edition's ISO week: 0 of 6 edition(s) conform` | line 490 reads `return context.nextEditionDate;` |
| **E** | `reconcile.ts:788` — the "nothing differs" guard disabled, so an unchanged row is updated | line 788 reads `if (false && !clearsAbsence && …)` | `✗ E the second pass plans 14 plan … write(s)` | line 788 reads `if (!clearsAbsence && !planFieldsDiffer(previous, fields)) continue;` |
| **G** | `20260815120000_production_calendar.sql:287` — one member removed from the `venue_stage` `CHECK` | line 287 lists three members | `✗ G VENUE_STAGES declares a member no CHECK constraint accepts` | line 287 lists four members again |
| **H** | `reconcile.ts` — a live `const` naming the announced-night table | `grep -c MUTATION_H_TABLE` → **2 lines** | `✗ H 1 live line(s) … name the announced-night table` — and F fired too, which was itself a finding (below) | `grep -c MUTATION_H_TABLE` → **0** |

**After the eighth restoration:** `git diff --stat 1aeea4c HEAD` shows exactly one file changed in the source tree — the new script. `node scripts/verify-ics-import.mjs` exits 0 and `npm run build` exits 0.

## Decisions Made

**The alias map may live here, and only because every word in it is already published.** `classify.ts` holds no format word and no venue word on purpose: the product reads the map from `party_series.ics_alias` because it may carry a word for a space that is not acquired. The five entries declared in the check are all printed in `.claude/rules/production-calendar.md` and `CLAUDE.md`, which are tracked files in a public repository, so writing them publishes nothing. **The repair for a sixth word is not to add it here** — check B reports `alias_unresolved` as a count and the thing to look at is the database column.

**A bare format word is deliberately absent from the map.** A satellite night names the space it happens in; mapping the format word alone would resolve it to a series that does not exist per-venue. A night joined to the wrong place is worse than a night reported unresolved.

**No exemption list for check F, and the reason is not stylistic.** This file declares five already-public words, three of which name spaces. Any rule of the form *a token that also appears in this script's source is fine* would exempt exactly those three — and a word for a space is what F exists to keep out of a terminal that ends up in an issue. When F collides, the repair is to **say less** in the output.

**The seventh-kind word IS spelled here, and that is consistent with `vocabulary.ts` refusing to spell it.** That module's argument is that a grep whose only match is the sentence forbidding the thing gets ignored the third time it goes red. This script does not search itself: it searches a calendar outside the repository where the word can genuinely occur. A search term is not a self-match.

**Conformance is counted by edition, not by piece, where the rule is one claim about several episodes.** The night's LiveCuts are three episodes of one claim; three conforming pieces of one edition are not three conforming editions. The measured 6/6 is editions, and the 17 episodes are printed beside it so the two are never confused.

**`NEEDS_MATERIAL` is a third list in the aggregate rather than a second `NEEDS_SERVER` entry.** The reason printed beside a name is the entire value of naming it, and *needs a running dev server* would be a false sentence about this gate. Two gates are not run there, for two different reasons, and a reader of a green is told both.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Check C detected the mutation from the wrong arm, and its night map was losing a night**

- **Found during:** Task 2, mutation C.
- **Issue:** `nightByKey` was built with `new Map(pairs)`, which keeps the **last** value for a repeated key. Under a join keyed on the format half, two satellites collapse onto one key and one of the two nights disappears from the map without a sound — which is precisely the damage the check exists to detect, absorbed instead of counted. The check still went red, but on the orphan-count arm, and the plan's named signature (*a piece dated after the night it announces*) did not fire at all: whether it fires depended on which of the two colliding nights happened to survive.
- **Fix:** Nights are grouped by key, a **collision arm** counts keys carried by more than one night, and the lookup resolves to the **earliest** night with that key so it is deterministic whatever order the file is in.
- **Files modified:** `scripts/verify-ics-import.mjs`
- **Verification:** green on the correct tree; under the re-applied mutation, `2 join key(s) are carried by more than one night` and `3 announcing piece(s) dated after the night they announce`.
- **Committed in:** `aad0c94`

**2. [Rule 1 — Bug] A failing check H dragged check F down with it**

- **Found during:** Task 2, mutation H.
- **Issue:** H's messages named `src/lib/production/ics/`. The directory's name is an ordinary English word that also occurs in an entry title of the calendar, so F — which asserts that no token of a title appears in the run's output — went red as a consequence. One broken check was reported as two, and the second report was about a leak that had not happened.
- **Fix:** Neither H's passing line nor its two failing messages names the path. The header already carries it. A stray hyphen from a wrapped string (`announced- night`) was corrected in the same pass.
- **Files modified:** `scripts/verify-ics-import.mjs`
- **Verification:** under the re-applied mutation, `ICS_IMPORT_FAIL — 1 check(s) failed: H`, with F green.
- **Committed in:** `aad0c94`

**3. [Rule 3 — Blocking] The same collision appeared on the first green run, before any mutation**

- **Found during:** Task 1.
- **Issue:** The very first complete run failed F with one token — the same ordinary word, printed by H's passing line.
- **Fix:** The line was reworded to stop naming the directory, and the header gained a paragraph stating what to do when F collides with a coincidence and what never to do: **reword the output, never add an exemption.**
- **Files modified:** `scripts/verify-ics-import.mjs`
- **Committed in:** `1f3b58c`

**4. [Rule 3 — Blocking] `verify-all.mjs` had to be modified, which the plan's frontmatter does not list**

- **Found during:** Task 3.
- **Issue:** The plan's `files_modified` names only the script and `package.json`, while its own action text requires the gate to be named in `verify-all.mjs`'s not-run list. Without that, the aggregate's reconciliation **refuses** — observed: `FATAL: package.json declares 1 verify:* entr(y/ies) this runner does not know about: verify:ics`. The frontmatter under-declares the plan's own instruction.
- **Fix:** A `NEEDS_MATERIAL` list, wired into the five places the reconciliation reads — `knownNames`, the NOT RUN print, the accounted total, the count table and `measuredOrExplained` — plus a header paragraph 2b stating why it is a third list. **A name was added; no runner was.**
- **Files modified:** `scripts/verify-all.mjs`
- **Verification:** 18 declared, 18 accounted for, 0 FAILED, and `verify:ics` printed in NOT RUN with its precondition.
- **Committed in:** `3e50e6b`

### Substitutions recorded rather than assumed

**Mutation D was performed in `anchors.ts` rather than in a migration row.** The plan suggests changing a pipeline rule's anchor kind from `next_edition` to `self`. That row lives in an **applied** migration, and `supabase-data.md`'s *gate migration in avanti* says an applied migration is a historical fact. Making `anchorDateFor` return the night's own date for `next_edition` is the identical semantics — the anchor becomes the night itself — performed in the module. Mutation G had no such alternative, since the SQL **is** its subject; it was applied to the migration file on disk, restored, and the restoration read back.

**The night's LiveCut conformance is reported as 6/6 editions and not 6/6 pieces**, and the after movie as 6 of 7 with the seventh named. The seventh after movie is the legacy-form entry of an edition the calendar does not carry, so it has no night to be measured against: it is reported as unmeasurable and never as a failure. `44-RESEARCH.md` calls it *a legacy-form override*; measured, the more precise statement is that its edition is absent, which is the rule behaving correctly.

## Two corrections to `44-RESEARCH.md`, measured

1. **The file is CRLF, not LF-only.** §The File's Structure records *"LF only"*; every line break in the snapshot is a CRLF pair and there is not one lone LF. The unfolder's `/\r?\n/` tolerance is load-bearing in the **other** direction from the one the research argued: a reader splitting on `\n` alone leaves a carriage return on the end of every value, and a `SUMMARY` with a trailing control character does not fail to join — it *almost* joins. Check A therefore asserts the **absence of that character** rather than the presence of a line ending, so it holds whichever way the exporting application jumps. Mutation A fired on exactly this: 1408 lines.
2. **`VALUE=DATE` occurs 39 times and none of them is a date.** Every occurrence is the tail of `TRIGGER;VALUE=DATE-TIME` inside a `VALARM`. A substring grep says 39 and would make a correct file look wrong. The assertion that means anything is *no `DTSTART` or `DTEND` carries a `VALUE=DATE` parameter* — and that is zero.

Both are written into the script's header, where the next reader will be standing.

## Verification — what was done, and what it does not mean

| Assertion | Command | Result |
|---|---|---|
| The check passes on this machine | `node scripts/verify-ics-import.mjs` | exit **0**, all eight |
| It refuses where the material is absent | `mv docs docs-aside && node scripts/verify-ics-import.mjs` | exit **2**, `ICS_IMPORT_REFUSED — 6 check(s) did not run: A, B, C, D, E, F. G and H passed.` — restored immediately, `ls docs/` confirmed before reading anything further |
| The verdict token exists once | `grep -c "ICS_IMPORT_OK" scripts/verify-ics-import.mjs` | **1** |
| The refusal code is used | `grep -c "process.exit(2)" scripts/verify-ics-import.mjs` | **2** |
| It reads the module | `grep -c "production/ics" scripts/verify-ics-import.mjs` | **7** |
| The entry exists | `grep -c '"verify:ics"' package.json` | **1** |
| The aggregate names it and does not run it | `grep -c "verify-ics-import" scripts/verify-all.mjs` | **1**, at `scripts/verify-all.mjs:285`, inside `NEEDS_MATERIAL` |
| `npm run verify:ics` | — | exit **0** |
| Typecheck | `npm run build` | exit **0** |
| Lint | `npm run lint \| grep -c verify-ics-import` | **0** findings on the new file |

**`npm run verify` exits 2 in this worktree, and not because of this plan.** Three gates refuse, all of them for causes that predate it: `verify:capabilities` has no `SUPABASE_ACCESS_TOKEN` (`.env.local` is gitignored and does not exist in a worktree), and `verify:conversion` and `verify:touch-targets` refuse on the stale manifest already logged as **D1** in `deferred-items.md` — four `CONVERTED` entries naming Finance and Analytics surfaces deleted by `763ade8`. The run reports **0 FAILED**, the reconciliation is clean at 18 of 18, and `git diff --stat 1aeea4c HEAD` shows this plan changed exactly one file in the source tree. None of the three reads it.

**What a green does NOT mean.** Repeated here because the header is the only place it currently lives:

- It says the reader agrees with **the file supplied on 2026-08-15**, and nothing more. Every number is an assertion about that file, and **a new file re-opens the whole list** — which is why this is a script and not a comment.
- It does **not** say the anchors are the right anchors. It says the file's dates sit where `production_pipeline_rule` says they would. Whether that rule describes production is a person's judgement.
- It does **not** say a proposal reads as unsettled on a screen. That is settled by a person, in plan **44-13**.
- It is **not a test suite**, and there is still no test runner for the product.
- Criterion 5 is evidenced only for a **dry** second pass. Whether the first pass writes the right rows is the runner's claim, against a real database, and this script opens no connection.

## Confidentiality — the accounting

- **`docs/` was opened, by design: this is the one artifact of the phase that may.** Nothing read from it was written into any tracked file — not as a fixture, not as an expected string, not in this summary. Every figure recorded here is a **count**.
- **The script's output was read by eye as well as by check F.** It carries counts, reason codes, vocabulary names and constraint names. No title, no date, no word for a space, and not the name of the file it read.
- **The words this plan added to tracked files** are the five alias keys, the four format names, the five published sigle and the seventh-kind word. Every one of them is already printed in `.claude/rules/production-calendar.md`, `CLAUDE.md` or the applied migration.
- **`docs/` in this worktree is a symlink** to the single file in the main checkout, created so the check could run here. It is not a second copy of the bytes, `docs/` is gitignored, and `git status --porcelain` was confirmed empty after it was made.
- **One thing was learned about the calendar and is deliberately not written down**: the ordinary English word that collides with check F. It is described here as *an ordinary English word* and nowhere as itself.

## Known Stubs

None. Every one of the eight checks measures something and has been observed both passing and failing.

## Threat Flags

None. No network endpoint, no auth path, no schema change. The one new file-access path is the subject of the plan's own threat register — T-44-01, mitigated by check F and proved by mutation F.

## Issues Encountered

**Node resolves nothing extensionless, and the barrel is written that way.** `src/lib/production/ics/index.ts` re-exports `./parse`, which the bundler resolves and Node does not, so a first import attempt failed with `ERR_MODULE_NOT_FOUND`. A `module.registerHooks` resolve hook that appends `.ts` for a relative specifier that exists on disk closed it, and it changes only how the modules are **found**. Node 25 strips types on `.ts` files by default, so no transpiler and no dependency was added — which matters, because this phase installs no package.

**The MODULE_TYPELESS_PACKAGE_JSON warning is filtered, and only that one.** Node writes it once to stderr about this script's loader. The default warning listeners are re-installed for every other warning, so nothing else is silenced.

## Self-Check: PASSED

- `scripts/verify-ics-import.mjs` — FOUND
- `package.json` — FOUND, carries `verify:ics`
- `scripts/verify-all.mjs` — FOUND, carries `NEEDS_MATERIAL`
- commit `1f3b58c` — FOUND
- commit `aad0c94` — FOUND
- commit `3e50e6b` — FOUND
- `node scripts/verify-ics-import.mjs` — exit 0
- `npm run build` — exit 0
- `.planning/STATE.md`, `.planning/ROADMAP.md` — untouched, as instructed

## Next Phase Readiness

- **Criterion 3 now has automated evidence** and 44-03's caveat is lifted: *until 44-08's golden check runs against the real file, no plan may state that the classifier classifies the calendar correctly.* It has run, on the owner's machine, and it is green.
- **Criterion 5 has its dry-run half.** The other half — a `number` change refused by the trigger — remains a written manual procedure against a real database.
- **Plan 44-10 (the runner) inherits three things from this check**, and all three are ready-made: the resolve-hook shape for importing the module from a `.mjs` script; the alias map must come from `party_series.ics_alias` and **not** from the five literals here; and the snapshot-from-plan construction in check E is the same mapping the runner performs when it applies the plan.
- **Plan 44-13 (the person) owns what F and D cannot say**: whether a proposal reads as unsettled, and whether the rules describe production.
- **One thing to carry:** `verify:ics` is the only gate in this repository that cannot run in CI, on a colleague's laptop, or in a worktree without the symlink. It is named in `verify-all.mjs`'s NOT RUN block on every run so that nobody has to remember.

---
*Phase: 44-the-production-calendar-comes-inside*
*Completed: 2026-08-15*
