---
phase: 44-the-production-calendar-comes-inside
plan: 10
subsystem: api
tags: [local-runner, dry-run, service-role, idempotence, refusal, output-audit, confidentiality]

# Dependency graph
requires:
  - phase: 44-the-production-calendar-comes-inside
    plan: 06
    provides: the pure reader and reconciler this runner drives — parse, classify, anchors, and a plan of writes returned rather than applied
  - phase: 44-the-production-calendar-comes-inside
    plan: 07
    provides: the two applied migrations — the six tables, `party_series.ics_alias`, and the sixteen pipeline rules the runner reads at runtime
  - phase: 44-the-production-calendar-comes-inside
    plan: 08
    provides: the golden-file check, whose counts this plan's dry run is measured against, and whose output-audit device this runner reproduces
  - phase: 44-the-production-calendar-comes-inside
    plan: 04
    provides: the trigger that refuses a change to a plan row's progressivo — the second layer behind this runner's first
provides:
  - a local runner that is dry by default and requires `--apply` to write, refusing with exit 2 and the words *nothing was written* before it opens the file
  - a write path that has no removal statement, generates no progressivo, carries no `number` in any update payload, and cannot reach the announced-night table
  - the alias map read from the database at runtime, with an unresolved word reported as a count and a named repair rather than guessed
  - an audit of the run's own transcript — no title token, no four-digit year — which went red on its first run and was repaired by saying less
  - the `import:calendar` entry, deliberately outside the `verify:*` prefix the aggregate collects
affects: [44-11 calendar surface, 44-12 announcement act, 44-13 the surface read by a person]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a writer whose safe mode is the default, and whose two mode flags together are a refusal rather than a precedence rule"
    - "a credential gate placed before the file is opened, so a refusal is never a partial run"
    - "an error message that names a label instead of its table, because the table's own name is a word a calendar title also carries"
    - "a run that audits its own transcript for the material it just read"
    - "an identifier printed verbatim only after it has been measured against the titles it might echo"

key-files:
  created:
    - scripts/import-production-calendar.mjs
  modified:
    - package.json
    - .planning/phases/44-the-production-calendar-comes-inside/deferred-items.md

key-decisions:
  - "The real import was NOT performed. The phase's production-write authorisation was spent on the two migrations, and loading confidential material into production tables is a separate act that belongs to the owner"
  - "A dry run writes nothing, including no import-run row — the migration says a dry run is a real row, the plan says it writes nothing, and the restrictive reading wins with its cost written into deferred item D6"
  - "The credential gate runs before the material gate, so a run that cannot finish never starts"
  - "`--apply` and `--dry-run` together refuse, because a flag whose meaning depends on where it sits in a line will one day write production by accident"
  - "Table names were removed from every printed string: one prefix they share is an ordinary word a calendar title carries, and the repair for that collision is to say less, never to widen the audit"
  - "A UID is printed verbatim only when it carries no word of any parsed title; otherwise a digest, and the substitution is counted out loud"

requirements-completed: []

# Metrics
duration: ~70min
completed: 2026-08-15
---

# Phase 44 Plan 10: The Local Import Runner Summary

**A local runner that reads the newest calendar snapshot, drives the shared reader, and prints the plan of writes as counts — dry by default, refusing with exit 2 and *nothing was written* whenever a precondition is missing, unable to remove a row, generate a progressivo or reach the announced-night table, and auditing its own transcript for the material it just read.**

## ⚠ Scope: the real import was NOT performed, and that is the finding to read first

This plan's task 3 asks for the real import. **It was not run, and the decision is deliberate rather than a blocker.**

- The owner's authorisation to write to production in this phase covered **the two migrations** and was recorded as spent in `44-07-SUMMARY.md`. `ai-engineering.md` states the rule this follows: *an authorisation to write to production is an act, not a permission — it is consumed once and covers exactly what was described when it was asked for.*
- Loading the calendar's content is a **separate act on separate material**, and the material is confidential. It belongs to the owner, after the phase is verified.
- The executor also had no credential: `.env.local` is gitignored and therefore absent from the worktree. Copying one in was refused rather than worked around.

So what follows is: the runner, its refusals exercised for real, and **what a real run would do, in counts**, measured from the file by the tool built for exactly that purpose.

## Performance

- **Duration:** ~70 min
- **Tasks:** 1 of 3 executed as written; task 3's `package.json` half executed; task 2 and task 3's writes deferred to the owner
- **Files created:** 1
- **Files modified:** 2

## Accomplishments

- **`scripts/import-production-calendar.mjs` exists and drives the shared module.** It re-implements nothing: `parseIcs`, `classifyEntries`, `reconcile`, `isEmptyPlan` and `joinKey` are imported from `src/lib/production/ics/`, so the runner and the golden check exercise one reader rather than two that agree today.
- **Dry is the default.** `--apply` must be passed explicitly. Passing both mode flags is a refusal, not a precedence rule.
- **Four distinct refusals were exercised, each with its own category and exit 2.**
- **Nothing in the file can remove a row, generate a progressivo, or write the announced-night table.** All three greps are at their required values.
- **The run audits its own output** and went red on its first execution — on a run that leaked nothing. The repair was to reword the output, never to widen the rule.
- **`npm run verify:ics` was run against the real material and passed all eight checks**, which is what makes the counts below assertions rather than estimates.

## Task Commits

1. **Task 1: The runner** — `be30ce7` (feat)
2. **Task 3 (partial): `import:calendar` and the two conflicts it leaves written down** — `3479043` (chore)

## The dry run, in counts — what the owner is being asked to read

### What was measured here, and with what

| Source | What it could see | Verdict |
|---|---|---|
| the runner's file phase | the real snapshot, read in place | ran |
| the runner's catalogue and plan phases | — | **refused**: no credential in a worktree |
| `npm run verify:ics` | the real snapshot + the applied migration's rules | **all eight checks green** |

The runner's plan counts could not be produced in this environment. They are **not zero** — they are **unmeasured**, and the distinction is the one this phase keeps insisting on.

### The file, measured twice and agreeing

| Figure | the runner | `verify:ics` |
|---|---|---|
| entries | 92 | 92 |
| distinct UIDs | 92 | 92 |
| malformed lines | 0 | 0 |
| unsupported recurrences | 0 | 0 |
| refused properties | 0 | 0 |

`verify:ics` adds what the runner does not measure: 3 folded lines **actually joined**, 0 carriage returns left on a value, 0 date-valued stamps, 1 event-level `RRULE` of 5, and the nesting proof — 96 `DTSTART` lines producing 92 entries, the other four inside the 2 `VTIMEZONE` components.

### The four classes

| Class | Count |
|---|---|
| A — canonical pieces | 56 |
| B — legacy pieces | 3 |
| C — nights | 14 |
| D — commitments | 16 |
| D — unclassified, recorded and never guessed | **3** |
| total | 92 |

One piece has no edition in the file. Zero nights resolve with an empty alias map, which is the negative control holding. Zero announcing pieces are dated after the night they announce.

### What a real run WOULD write, assuming empty tables and every alias set

| List | Count |
|---|---|
| plan rows to insert | **14** |
| piece rows to insert | **65** — 59 written in the file, **6 proposals** the rules placed |
| commitment rows to insert | **47** occupied days, from 16 entries |
| checklist items to insert | **106** |
| updates, of any kind | 0 |
| absences | 0 |
| divergences | 0 |
| announced-night rows | **0**, and no path in the file could produce one |
| rows removed | **0**, and no path in the file could produce one |
| **a second run over the same file** | **an EMPTY plan** — 0 inserts, 0 updates, 0 divergences |

The last line is criterion 5's automated evidence at the shape it will have; it is asserted here against a snapshot rather than against the real database, which is the remaining half of the claim and the owner's to close.

### The two numbers that could NOT be determined, and are therefore not written as zero

1. **How many `party_series` rows carry an `ics_alias` today.** Unmeasured. `verify:ics` reaches 0 unresolved aliases using **its own declared map of five already-public words**; the product reads the map from the database, and whether those five rows carry their alias is not knowable without a connection. **If they do not, every one of the 14 nights is unclassified** — for a reason that is a configuration gap, not a property of the file.
2. **What the six tables already hold.** Unmeasured. The counts above assume empty tables; if they are not empty the plan is an update plan, not an insert plan.

## What a person must decide before a real run

1. **Set the alias on each series row, in the database, by hand.** Not in a file: the values are words for spaces, and a space that is not acquired in writing is not named in a public repository. The unresolved-alias count must read zero before `--apply`.
2. **Answer, for each of the 3 unclassified entries, whether it should be a night.** `44-RESEARCH.md` assumption A1 says they carry a format word but no recognisable kind and no progressivo. Only the owner can say whether one of them is a real night written differently — and if one is, it is missing from the *calendar*, not from the import. **Their UIDs are printed by the run and are deliberately not reproduced here**, because `.planning/` is tracked and therefore published.
3. **Settle deferred item D6** — whether a dry run should record an import-run row. Today it does not, and `production_import_run.dry_run` consequently has no writer.
4. **Decide where "this space must approve the material naming it" is stored.** Nothing stores it, so the runner generates **0** space-approval checklist items and says so out loud. That is a configuration gap, not a measured zero.
5. **Note that `44-CONTEXT.md` records 88 entries while the file holds 92** (assumption A6). That difference has never been settled and the file wins.

## Refusals exercised, for real

| Command | Category | Exit | The sentence that survived |
|---|---|---|---|
| no arguments, in a worktree | `missing_credential` | 2 | NOTHING WAS WRITTEN |
| credentials set, no snapshot directory | `no_material` | 2 | NOTHING WAS WRITTEN |
| credentials set, real snapshot, unreachable database | `catalogue_unreadable` | 2 | NOTHING WAS WRITTEN |
| `--apply --dry-run` | `ambiguous_mode` | 2 | NOTHING WAS WRITTEN |
| `--aply` | `unknown_argument` | 2 | NOTHING WAS WRITTEN |

Every refusal names its category. The third one refuses **after** the file phase has printed its counts, and says in as many words: *the import did not happen; this is not an empty plan.* A refusal that could be mistaken for an empty plan is the silent failure this repository has already written down once.

## Decisions Made

**The credential gate comes before the material gate.** A refusal that has already read the material did work it did not need to do, and the discipline asked for is *never a partial run*: if the run cannot finish, it does not start.

**Both mode flags together is a refusal.** `--apply --dry-run` and `--dry-run --apply` would otherwise mean two different things depending on typing order, and a flag whose meaning depends on where it sits in a line is a flag that will one day write production by accident.

**A dry run writes nothing at all, including no import-run row.** The migration says a dry run is a real row; the plan says a dry run writes nothing. `meta-gates.md` gives the more restrictive gate the win, and the cost is named rather than absorbed — deferred item D6.

**`import:calendar` is deliberately outside the `verify:*` prefix.** `verify-all.mjs:319` collects gates by that prefix, so the name is invisible to the aggregate, which is the property wanted: a gate tells you whether the tree is sound, a writer changes production. The script's name is not written into `verify-all.mjs` at all — a name mentioned in a list is one edit away from being a name in the list.

**`venue_id` and `venue_stage` stay null on every insert.** Which space a night happens in, and whether it is acquired, is a person's judgement recorded in writing. An import that inferred it from a word in a title would be turning a candidate into a booking.

**Written pieces and proposals take different write paths.** A proposal has no `UID`, Postgres allows many nulls in a unique column, and an upsert keyed on that column would insert a second copy of every proposal on every run. The reconciler honours a proposal's idempotence against the snapshot; the split is the half of that bargain the caller owes.

**Checklist inserts ignore duplicates and updates carry no tick.** A re-import may neither duplicate an item nor reopen a ticked one: the tick belongs to whoever did the work.

**Plan updates carry no `number` field.** `PlanUpdate` always holds the value already stored, so writing it would be a no-op — until the day it is not, and that day is the one the guard exists for. The trigger is the second layer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] The output audit now runs on refusals and failures, not only on the two happy paths**
- **Found during:** Task 1
- **Issue:** The audit was written to run at the end of the dry run and at the end of an applied run. Several refusals happen *after* the file has been read and after counts have been printed — and a refusal transcript is exactly what somebody pastes into an issue when asking why the import would not run. The audit would have been absent from the exits most likely to be published.
- **Fix:** An `auditReady` flag, set the moment the file is parsed; `refuse()` and `failPartway()` both audit before exiting. `siglaInFile` became a `let` initialised empty so the audit can run before classification — the conservative direction, since it then strips fewer words as already-public and looks for more of them.
- **Verification:** The `catalogue_unreadable` refusal now prints the audit line, and it is what caught the leak below.
- **Committed in:** `be30ce7`

**2. [Rule 1 — Bug] The output audit went red, and the output was reworded**
- **Found during:** Task 1, first run against the real material
- **Issue:** One ordinary word this script had reason to print also occurs inside a calendar entry title. `verify-ics-import.mjs:127-147` predicts this exact coincidence and forbids the obvious repair: *never exempt, never widen, say less.*
- **Fix:** No printed line now names this script, the module directory it drives, or the six tables by their own names — those all share a prefix that is the colliding word. Reads take a **label** instead of the table name (`reading the plan table failed`), and the reason is written at the call site rather than left looking arbitrary. The comments still name all three, because comments are not printed.
- **Verification:** the audit now reports `30 residual title token(s), 0 of them in what this run printed · 0 four-digit years`.
- **Committed in:** `be30ce7`

**3. [Rule 1 — Bug] The suppressed-warning filter in the analog does not fire on Node 25**
- **Found during:** Task 1
- **Issue:** `scripts/verify-ics-import.mjs:352-357` filters the typeless-package warning on `warning.name`. On Node 25 that string is the warning's **code**; its name is the generic one, so the filter matches nothing and the warning prints anyway — which is what happened when the shape was first copied here.
- **Fix:** This runner matches on `code` **or** `name`. The analog was left alone: it is a note about that file, not a change to it, and it belongs to plan 44-08.
- **Verification:** no stray warning on any run of this script.
- **Committed in:** `be30ce7`

### Additions the plan did not enumerate

- **`--docs-dir <dir>`**, beside the specified `--file <path>`. It exists because the search must be able to point somewhere without a snapshot's **file name** appearing on a command line: that name is a date. A directory name is not.
- **The identifier guard.** A `UID` is normally opaque, but nothing in RFC 5545 says so and some applications derive one from the entry's summary. So it is measured rather than assumed: a UID carrying a word of any parsed title is printed as a digest instead, and the substitution is counted out loud.
- **The output audit itself.** The plan asked for output discipline; this makes the claim measured rather than intended, on the model of the golden check.

### Not executed, and why

- **Task 2's checkpoint** was not waited on. The counts are recorded above for the orchestrator to carry.
- **Task 3's runs 1 to 5** — snapshot, real import, second run, post-snapshot, and the trigger refusal exercised against the real database — were **not performed**. See the scope note at the top. Run 5 in particular writes an `UPDATE` to a real plan row, and there are no plan rows because there has been no import.

## Threat Flags

None. No new network endpoint, no auth path, no schema change, and no file-receiving surface — the absence of that last one is the phase's own criterion 2, and this plan is the thing that keeps it absent.

## Verification

| Assertion | Command | Result |
|---|---|---|
| dry is the default and `--apply` is an explicit gate | `grep -c -- "--apply" scripts/import-production-calendar.mjs` | 10 |
| no removal path | `grep -ciE "\.delete\(\|DELETE FROM" …` | **0** |
| the night table is named once, in a comment | `grep -n "event_parties" …` | 1 hit, line 68, inside the header's prohibition |
| no progressivo generated | `grep -ciE "max\(\|highest_assigned\|number \+ 1" …` | **0** |
| PostgREST's third field is never logged | `grep -c "\.details" …` | **0** |
| no alias literal | `grep -ciE 'aliases\.set\("' …` | **0** — the map is built from the database rows |
| the entry exists | `grep -c '"import:calendar"' package.json` | 1 |
| the aggregate does not name it | `grep -c "import-production-calendar" scripts/verify-all.mjs` | **0** |
| the runner refuses without a credential | `node scripts/import-production-calendar.mjs` | exit **2**, `NOTHING WAS WRITTEN` |
| the file reads as it did | `npm run verify:ics` | exit **0**, all eight checks |
| the tree builds | `npm run build` | exit **0** |

**What a green does NOT mean.** Nothing above is a test — there is no test runner for this product. In particular: **no row has been written to any of the six tables, and nothing here says the runner writes them correctly.** The write path has been read and reasoned about; it has not been executed. The strongest statement available today is that the plan it would apply has been computed from the real file and agrees, on every figure they share, with an independently-written check over the same file.

## Self-Check: PASSED

- `scripts/import-production-calendar.mjs` — FOUND
- `package.json` carries `import:calendar` — FOUND
- `.planning/phases/44-the-production-calendar-comes-inside/deferred-items.md` D6 — FOUND
- commit `be30ce7` — FOUND
- commit `3479043` — FOUND
- no calendar content in this document: no title, no date of any edition, no venue word, no line-up, no UID

## Next Phase Readiness

The runner is ready and is waiting on two things only, both a person's: **the aliases set on the series rows**, and **the owner's word on the 3 unclassified entries**. When those exist, `npm run import:calendar` prints the plan and `npm run import:calendar -- --apply` writes it, and the second dry run is the idempotence claim closing itself.

- **44-11** should surface `seriesWithoutRules`: a night whose series owns no pipeline rule must not draw an empty checklist as though it were a finished one.
- **44-12** remains the single bridge to the announced night, and this runner's inability to reach that table is what keeps the bridge meaningful.

---
*Phase: 44-the-production-calendar-comes-inside*
*Completed: 2026-08-15*
