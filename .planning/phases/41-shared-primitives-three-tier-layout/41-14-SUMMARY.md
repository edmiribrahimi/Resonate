---
phase: 41-shared-primitives-three-tier-layout
plan: 14
subsystem: testing
tags: [verification-gates, node, exit-codes, mutation-proof, verify-all]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    provides: "scripts/verify-all.mjs, the aggregate runner shipped by plan 41-12, and the sixteen verify:* entries package.json registers"
provides:
  - "A reconciliation in scripts/verify-all.mjs keyed on verdicts obtained rather than on an algebraic identity over the partition that produced them"
  - "A gap between what package.json registers and what the run judged is now a REFUSAL at exit 2, reached before the verdict block, instead of a console.log printed under a tick"
  - "A header paragraph that names the concrete situation which would trip the new refusal — a fourth plan state nobody's filter catches"
affects: [phase-41.1, phase-41.2, any-plan-adding-a-verify-gate, any-plan-changing-the-plan-partition]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reconcile on the set of names that obtained a verdict, never on a total computed from the same partition being checked"
    - "A reconciliation gap routes through refuse() so it preempts every exit path, including the exit-0 one"

key-files:
  created: []
  modified:
    - scripts/verify-all.mjs

key-decisions:
  - "The reconciliation compares NAMES that got a verdict, not COUNTS: a total derived from the partition under test cannot disagree with itself"
  - "A gap is refuse() → exit 2, not exit 1: the run did not measure everything the repository declares, which is not the same statement as 'something is wrong with the tree'"
  - "The printed count block was kept verbatim — it says what the run counted, not merely whether it was happy"
  - "The pre-mutation exit code on this worktree is 2 (no .env.local, verify:capabilities REFUSES) and that is recorded as measured rather than copied from a credentialed checkout's 0"

patterns-established:
  - "Mutation proof shape: apply → print the mutated line and assert it → only then read the run → restore → assert the restoration → re-run and diff against the pre-mutation output byte for byte"
  - "When a claim's counterfactual is not observable on this machine, name the environment difference beside the number instead of asserting the number"

requirements-completed: []

# Metrics
duration: 21min
completed: 2026-08-12
---

# Phase 41 Plan 14: verify-all's reconciliation can now fail Summary

**`scripts/verify-all.mjs`'s self-declared "whole point" — the check that every registered `verify:*` entry is accounted for — stopped being an algebraic identity that only `console.log`ged and became a set comparison over verdicts obtained that refuses at exit 2, proven by mutation to fire on a real gap and stand down after repair.**

## Performance

- **Duration:** ~21 min
- **Started:** 2026-08-12T17:32Z
- **Completed:** 2026-08-12T17:53Z
- **Tasks:** 2 (one code change, one mutation proof)
- **Files modified:** 1

## Accomplishments

- Replaced the unreachable count comparison at `:367-372` with `measuredOrExplained` / `unaccounted`, a set comparison over the names that came out of the run with something said about them.
- A gap now calls `refuse()` — **exit 2, reached before the verdict block**, so it preempts `VERIFY_OK` rather than printing a line underneath it.
- Rewrote the header paragraph so the file's claim matches what it does, including the concrete situation that would trip it.
- Proved the new refusal fires on a real gap and stands down after repair, with the mutation asserted present **before** its result was read, and with a contrast run showing what the old code did on the identical drift.

## Task Commits

1. **Task 1: Reconcile against verdicts obtained, and make a gap a refusal** — `d02944c` (fix)
2. **Task 2: Prove it can fail, with the mutation asserted before its result is read** — no commit: the task's whole output is evidence, and both mutations were reverted. `git status` was clean at the end of the cycle and the working tree diff against the base is exactly task 1's change.

## Files Created/Modified

- `scripts/verify-all.mjs` — reconciliation rewritten (`:350-372` → `measuredOrExplained` / `unaccounted` / `refuse()`); header section `:85-91` replaced by a longer section naming what is compared, why the earlier refusals do not cover it, and the situation that would produce a gap. +49 / −11.

## What changed, in the file's own terms

**Before** (`:367`), after the count block:

```js
if (accounted !== declared.length + absentOptional.filter((p) => p.state === "unregistered").length) {
  console.log("\n    The count does not reconcile against package.json. …");
}
```

`accounted` is `results.length + NEEDS_SERVER.length + absentOptional.length + absentRequired.length`, and `plan` is built one entry per `OFFLINE` row then partitioned exhaustively, so the left side is always `OFFLINE.length + NEEDS_SERVER.length`. The refusals at `:208` and `:221` already force the right side to the same number. **And the verdict block at `:411-448` never read the result**, so even a mismatch printed a line and then exited 0.

**After:**

```js
const measuredOrExplained = new Set([
  ...results.map((r) => r.name),
  ...NEEDS_SERVER.map(([name]) => name),
  ...absentOptional.map((p) => p.name),
  ...absentRequired.map((p) => p.name),
]);

const unaccounted = declared.filter((name) => !measuredOrExplained.has(name));
if (unaccounted.length > 0) {
  refuse(
    `${unaccounted.length} registered verify:* entr(y/ies) got no verdict from this run:\n` +
      `       ${unaccounted.join(", ")}\n` +
      "       They did not run, and they were not named as not run either. This run CANNOT\n" +
      "       claim to account for every registered gate — nothing about those was measured."
  );
}
```

The printed count block above it is untouched. So are the two earlier refusals, the `0 / 1 / anything-else` exit convention, the `NEEDS_SERVER` handling and the stack-trace note.

### The situation that would trip it, in the same words the header now uses

> Somebody adds a fourth `state` to the `plan` partition — a `skipped`, a `deferred`, a `stale` — and the three filters that follow it (`runnable`, `absentOptional`, `absentRequired`) do not catch it, because each of them tests for something specific. That entry is then dropped between planning and reporting: it never runs, never appears in the NOT RUN block, and the table prints a full set of ticks for a gate nobody measured. **That is T-41-44 arriving from inside this file instead of from `package.json`.**

### Why the two earlier refusals do not already cover it

They compare **lists**, and they compare them **before anything executes**: `declared` against `knownNames`, in both directions. This one compares **verdicts**, afterwards. A name can be declared in `package.json`, known to this runner, present on disk — and still come out of the run with nothing said about it.

## The mutation proof, in the order it was performed

### 0 — Pre-mutation state, recorded before anything was touched

`node scripts/verify-all.mjs` → **exit 2**. Count block verbatim:

```
  ── the count ──────────────────────────────────────────────────────────

    package.json declares           16  verify:* entr(y/ies)
    run here                        15
      of which passed               14
      of which FAILED                0
      of which REFUSED               1  — nothing was measured by these
    needs a server, not run          1
    declared absent                  0
    MISSING                          0
                                   ───
    accounted for                   16

  VERIFY_REFUSED — 1 gate(s) could not measure: verify:capabilities
```

The refusing gate is named: **`verify:capabilities`**, with its own stderr — *"missing environment variable(s): SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL … Nothing was measured."* **This worktree holds no `.env.local`**, so exit 2 is this command working as designed, not a failure and not something to fix. `41-VERIFICATION.md:48` records the same command at **exit 0 with 15 passed** on a checkout that holds the credentials; the difference between the two numbers is the credential, and it is named here rather than the credentialed number being copied.

Task 1's change produced **byte-identical output** to the run taken before it (`diff` → no differences, exit 2 both). The reconciliation was rewritten without altering what a correct tree reports.

### 1 — Mutation applied, then asserted, then read

Substitution on `:284`, the `runnable` partition:

```
sed -i '' '284s/.../const runnable = plan.filter((p) => p.state === "runnable" && p.name !== "verify:tokens");/'
```

**Assertion printed before the run — this is the step whose absence would make everything after it a false negative:**

```
--- line 284 after substitution ---
const runnable = plan.filter((p) => p.state === "runnable" && p.name !== "verify:tokens");
```

The line contains `verify:tokens`. The substitution landed. **Only then** was the run read:

`node scripts/verify-all.mjs` → **exit 2**, ending:

```
  ── the count ──────────────────────────────────────────────────────────

    package.json declares           16  verify:* entr(y/ies)
    run here                        14
      of which passed               13
      of which FAILED                0
      of which REFUSED               1  — nothing was measured by these
    needs a server, not run          1
    declared absent                  0
    MISSING                          0
                                   ───
    accounted for                   15

  FATAL: 1 registered verify:* entr(y/ies) got no verdict from this run:
       verify:tokens
       They did not run, and they were not named as not run either. This run CANNOT
       claim to account for every registered gate — nothing about those was measured.
```

Machine-checked on that output: `FATAL:` present (1), `verify:tokens` present (1), `no verdict` present (1), **`VERIFY_OK` absent (0)**. The verdict block was never reached at all — neither `VERIFY_OK` nor `VERIFY_REFUSED` printed — because `refuse()` exits first.

### 1b — Contrast: what the OLD code did on the identical drift

The pre-change runner was written to `scripts/.tmp-old-verify-all.mjs` from the base commit, the same substitution applied to its `:262`, and the substitution asserted the same way before reading:

```
--- old copy line 262 after substitution ---
const runnable = plan.filter((p) => p.state === "runnable" && p.name !== "verify:tokens");
```

Its run → **exit 2**, and its output shows both halves of WR-03 at once:

```
    accounted for                   15
    The count does not reconcile against package.json. Every gate above ran, but
    …
  VERIFY_REFUSED — 1 gate(s) could not measure: verify:capabilities
```

**It printed the line and kept going.** The exit code was decided entirely by `verify:capabilities` refusing for want of credentials; the reconciliation contributed nothing to it. On a checkout holding `.env.local` that same run would have printed the reconcile line and then `VERIFY_OK`, exiting **0** with one registered gate unmeasured — which is the defect. The new code cannot reach the verdict block at all, so the exit-0 path is preempted.

**Stated honestly:** on *this* machine both the old and the new mutated runs exit 2, for different reasons and through different code paths — the old one via the credentials refusal after falling through the reconciliation, the new one via the reconciliation itself before any verdict. The counterfactual "old = 0, new = 2" is not observable here because no checkout in this worktree can reach exit 0; it is named as a credential difference rather than claimed as a measurement. The temp copy was deleted immediately and never staged.

### 2 — Restoration, asserted before the restored run was read

`git checkout -- scripts/verify-all.mjs`, then:

```
--- line 284 after restore ---
const runnable = plan.filter((p) => p.state === "runnable");
--- grep for the temporary filter ---
0
--- git diff vs base ---
 scripts/verify-all.mjs | 60 +++++++++++++++++++++++++++++++++++++++++---------
 1 file changed, 49 insertions(+), 11 deletions(-)
--- git status ---
(clean)
```

The temporary filter is gone (`grep -c` → **0**), the diff against the base commit is exactly task 1's change (49 insertions / 11 deletions, identical to commit `d02944c`), and `git status` is clean of both mutations and of the temp copy.

**Only then** was the restored run read: `node scripts/verify-all.mjs` → **exit 2**, and `diff` against the pre-mutation output → **no differences**. The pre-mutation exit code and the count block reproduced verbatim.

## Acceptance criteria, measured

| Criterion | Measured |
|---|---|
| `grep -c 'unaccounted'` ≥ 3 | **4** |
| `grep -c 'accounted !== declared.length'` = 0 | **0** — deleted, not commented out |
| `grep -c 'measuredOrExplained'` ≥ 2 | **2** |
| `grep -c 'no verdict'` ≥ 2 | **2** — the header's explanation and the refusal's message |
| exits 0 with credentials / 2 without | **2 on this worktree**, refusing gate named: `verify:capabilities` (no `.env.local`) |
| output has a line matching `accounted for +16` | **present** (`accounted for                   16`) |
| output has no line beginning `The count does not reconcile` | **absent** |
| count block matches the run in `41-VERIFICATION.md` | **partially, and the difference is the credential.** `41-VERIFICATION.md` records 15 passed / 0 failed / 1 not-run / 16 accounted for on a credentialed checkout. Here: **14 passed, 0 FAILED, 1 REFUSED, 1 not-run, 0 declared absent, 0 MISSING, 16 accounted for.** The single moved number is `verify:capabilities` sliding from passed to REFUSED for want of `.env.local` — not a gate verdict changed by this wave, and nothing was adjusted to make the numbers agree |
| mutated line printed and shown to contain `verify:tokens` **before** the mutated run was read | **yes**, and recorded above in that order |
| mutated run exit 2, output contains `FATAL:` and `verify:tokens`, no `VERIFY_OK` | **yes** — 2 / present / present / absent |
| after restoration the diff shows task 1's change and nothing else | **yes** — 49/−11, filter absent, `git status` clean |
| restored run reproduces the pre-mutation exit code and count block | **yes** — `diff` reports no differences |

## Decisions Made

- **Reconcile on names, not on a total.** A count derived from the partition under test is arithmetic over itself and cannot disagree; a set of names that obtained a verdict can.
- **The gap refuses rather than fails.** Exit 2, not 1: a gate that produced no verdict means *nothing was measured about it*, which is the file's existing convention and a different statement from "the tree is wrong".
- **The count block stays verbatim.** It reports what the run counted rather than only whether it was happy, and the plan asked for it to be preserved.
- **`accounted` is still computed and printed.** Only the comparison that could not fail was removed; the number a reader uses is unchanged.
- **The credential difference is named, not smoothed.** The plan's expected count block came from a credentialed checkout. Rather than adjust anything to hit 15 passed, the measured 14/1 is recorded with its cause.

## Deviations from Plan

None — plan executed exactly as written. One addition beyond what was asked: the contrast run of the pre-change runner under the identical drift (step 1b), which is what makes the second half of WR-03 — *"would not change the exit code if it could"* — an observation rather than an argument. It required no product change and left no artefact; the temp copy was removed and `git status` verified clean.

## Issues Encountered

- **The mutated exit code equals the baseline exit code on this machine (2 and 2).** A naive read would call that "no change". It is not: the baseline reaches the verdict block and prints `VERIFY_REFUSED`, the mutated run never reaches it and prints `FATAL:`. Resolved by asserting on the *content and code path*, not only on the number, and by writing down that the exit-0 counterfactual is unobservable without credentials.
- No other issues. No packages installed (D-41-20 holds), no dependency change.

## Threat Flags

None. This file executes other scripts and reads `package.json`; it runs no product code, reads no database, renders nothing, and touches no role, payment, door or venue path. T-41-52 recorded that thinness in the plan and it remains accurate.

## Notes for the phase verifier

- The runner invokes gates that two sibling plans in this wave are editing (`verify:touch-targets` in 41-15, `verify:dialogs` in 41-16). On this worktree's base **both passed**, and **no gate's current output count is hard-coded in the runner** — it reads `package.json` at run time and counts what it got. A sibling changing a gate's verdict changes the table, not this file's logic.
- Nothing in `.planning/` other than this SUMMARY was written; `STATE.md` and `ROADMAP.md` are untouched, as the orchestrator owns them.

## User Setup Required

None — no external service configuration required. The one environment dependency (`verify:capabilities` wanting `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`) predates this plan and is unchanged by it.

## Next Phase Readiness

- The aggregate's central claim is now falsifiable and its failure is load-bearing on the exit code. Any future plan adding a gate, or adding a state to the `plan` partition, gets a refusal instead of a silent tick.
- Remaining from `41-REVIEW.md` in this wave: WR-01 (`PageShell`, 41-13), WR-04 (`verify-touch-targets`, 41-15), WR-05 (`verify-dialogs`, 41-16).

## Self-Check: PASSED

- `scripts/verify-all.mjs` — present, modified, committed.
- `d02944c` — present in `git log --all`.
- `.planning/phases/41-shared-primitives-three-tier-layout/41-14-SUMMARY.md` — present.
- `git status` clean of every mutation used in a proof, and of the temp copy.

---
*Phase: 41-shared-primitives-three-tier-layout*
*Completed: 2026-08-12*
