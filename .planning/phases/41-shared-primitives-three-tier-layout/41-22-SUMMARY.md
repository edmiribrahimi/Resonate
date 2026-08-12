---
phase: 41-shared-primitives-three-tier-layout
plan: 22
subsystem: verification-gates
tags: [verify-all, reconciliation, exit-codes, mutation-proof, gap-closure, WR-01, CR-01]
requires:
  - "41-14 — the reconciliation's exit-code half, which this plan keeps and builds on"
  - "41-20 — the same failure-under-refusal shape repaired inside verify-conversion"
provides:
  - "a reconciliation in verify-all.mjs that is reachable on the trigger its own docblock names"
  - "an aggregate verdict that cannot report a measured failure as a refusal"
affects:
  - "npm run verify — the one command a human runs over sixteen gates"
tech-stack:
  added: []
  patterns:
    - "an allow-list of known states instead of a complement, so the partition is non-exhaustive by construction and a novel value escapes it"
    - "a mixed-outcome verdict decided at the refusal's own call site, not inside refuse(), because the other call sites run before anything is measured"
key-files:
  created: []
  modified:
    - "scripts/verify-all.mjs"
decisions:
  - "The partition is deliberately non-exhaustive. ABSENT_STATES is load-bearing, and the docblock names keying either absent* filter back on the complement of runnable as the edit that would silently restore the identity CR-01 found."
  - "The reconciliation's domain is the union of declared and knownNames, not declared alone: a novel state on an entry package.json does not register would be invisible to a check keyed on declared."
  - "The mixed-outcome condition lives at the reconciliation's call site and NOT inside refuse(). Every other refuse() call site in this file fires before a gate has been spawned, where failed does not yet exist — the two situations are different and the code does not pretend otherwise."
  - "The retired sentence was removed from the file entirely rather than quoted in a comment, so it cannot be copied back."
metrics:
  duration: "~1 session"
  tasks: 2
  commits: 3
  files-modified: 1
  completed: 2026-08-12
---

# Phase 41 Plan 22: verify-all — the safety net becomes reachable, and a failure stops hiding behind a refusal

**`scripts/verify-all.mjs`'s reconciliation stopped being an algebraic identity and now fires on
the exact scenario its own docblock names as the trigger — a fourth `plan` state — and a run that
fails a check and then refuses is reported as the failure it is, at exit 1, instead of closing
with a line asserting that nothing failed.**

This is the **second** attempt at GAP-CR-01. Plan 41-14 was written to close it, closed the
exit-code half, and left the identity intact — and its mutation proof passed because it mutated a
**name-based exclusion inside a filter**, which trips the new code without corresponding to any
real change to the partition. This plan does not reuse that mechanism, and says so below by name.

---

## The trigger each mutation used

| | Trigger 1 — GAP-CR-01 | Trigger 2a — the failure | Trigger 2b — the refusal |
|---|---|---|---|
| **In the docblock's own words** | *"somebody adds a fourth `state` to the `plan` partition below — a `skipped`, a `deferred`, a `stale` — and the three filters that follow it do not catch it. That entry is then dropped between planning and reporting: it never runs, never appears in the NOT RUN block, and the table prints a full set of ticks for a gate nobody measured."* | The `state: "absent"` path — a name `package.json` registers pointing at a file that is not on disk, which the file reports as *"MISSING, and this is a failure, not an omission."* | Same as trigger 1, on a **different** gate. |
| **Mechanism used to stage it** | `state: "deferred"` injected **in the plan loop** (`plan.push`), on the branch that would otherwise label the entry `runnable`, for `verify:tokens` — registered and required. | `scripts/verify-tables.mjs` **moved off disk**, leaving `package.json` pointing at a path that is not there. No list edited, no source edited. | `state: "deferred"` in the plan loop for `verify:tokens`. |
| **Is it a substitute mechanism?** | **No.** This is the trigger the docblock names. It is **not** the name-based exclusion in the `runnable` filter that plan 41-14 used — that mechanism trips the new code without corresponding to any real partition change, and reusing it is what this plan exists to avoid. | **No.** This is the real `state: "absent"` path, staged by moving a file rather than by editing either list. | **No.** Same as trigger 1. |
| **Exit before the fix** | **1** — via the pre-existing MISSING branch | **2** — the pair was laundered into a refusal | (staged with 2a) |
| **Exit after the fix** | **2** — the reconciliation's FATAL | **1** — the failure verdict, with the FATAL still printed above it | **2** alone (branch unchanged) |
| **Exit restored** | **2** — the recorded baseline | **2** — the recorded baseline | **2** — the recorded baseline |

---

## Baseline, measured before anything was touched

`node scripts/verify-all.mjs` → **exit 2**. Count block verbatim:

```
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

**The refusing gate is `verify:capabilities`, and the reason is a credential, not the tree.** Its
stderr: *"missing environment variable(s): SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL … Nothing
was measured."* This worktree holds no `.env.local`, so **exit 2 is this command working as
designed** — not a failure and not something to fix. `41-VERIFICATION.md` records the same command
at **exit 0 with 15 passed** on a checkout that holds the credentials. **The difference between
those two numbers is the credential**, and it is named here rather than the credentialed number
being copied. No number in this SUMMARY was copied from a run someone else made.

---

## Task 1 — GAP-CR-01: the partition stops being exhaustive

Commit `69694f7`.

### What was wrong

The loop pushes exactly one `plan` entry per `OFFLINE` row on every path, and the three filters
partitioned on `state === "runnable"` versus **its complement**, crossed with `optional`. Those two
predicates are exhaustive over *any* value of `state`, so every possible fourth state landed
deterministically in one of the `absent*` buckets, `measuredOrExplained` was always a superset of
`declared`, and `unaccounted` could never be non-empty. The check the file calls *"the whole point
of the file"* could not fail.

### The three changes

1. **`ABSENT_STATES = new Set(["absent", "unregistered"])`**, with both filters keyed on membership
   instead of on the complement. `runnable` keeps its equality test. Three named states, three
   buckets, and **a fourth state matches none of them** — it is dropped between planning and
   reporting, which is where the reconciliation catches it.
2. **The reconciliation's domain widened** from `declared` to `declared ∪ knownNames`, because a
   novel state introduced on an entry `package.json` does not register is invisible to a check keyed
   on `declared` alone — the same hole one step to the side.
3. **The docblock's trigger paragraph rewritten** so it is true after the change, plus a new section
   stating the partition is deliberately non-exhaustive, naming the regression edit, and telling a
   reader what to do instead.

### The reasoning behind the widened domain, written before it was run

T-41-A5 flags a false refusal from the widened domain as the risk — D-41-19's worse failure mode.
The reasoning was written into the docblock first, then proved by a run:

- `undeclaredHere` guarantees `declared ⊆ knownNames`, so the union **is** `knownNames`.
- `missingRequired` guarantees every name in `knownNames \ declared` is an **optional** `OFFLINE`
  entry, which the plan loop labels `unregistered` — a member of `ABSENT_STATES` — so it reaches
  `absentOptional` and is accounted for.
- Every `NEEDS_SERVER` name is accounted for by construction.

**The run agreed with the reasoning:** the unmutated suite returned the baseline exit code and a
count block byte-identical to the pre-change run (the only textual difference in the whole output
was a gate's stopwatch reading `0.2s` instead of `0.3s`). Neither side was wrong, so there is
nothing to record about which one won.

### Mutation proof, in the order performed

**Step 1 — pre-fix, on the SHIPPED aggregate.** Injection applied, then **asserted present at line
279 before the run was read**:

```
279:  plan.push({ name, state: name === "verify:tokens" ? "deferred" : "runnable", optional, note, rel });
```

Run → **exit 1**. Machine-checked on the output:

```
45:    verify:tokens — MISSING, and this is a failure, not an omission.
71:  VERIFY_FAIL — 1: verify:tokens (missing)
grep -c 'unaccounted' → 0        grep 'no verdict' → no match
```

**The entry fell into `absentRequired` and exited 1 through a path that predates plan 41-14. The
reconciliation never ran.** That is the gap reproduced from the documented trigger, exactly as
`41-VERIFICATION.md` reproduced it. Restored with `git checkout -- scripts/verify-all.mjs`;
`git status --porcelain` empty afterwards.

**Step 2 — post-fix, same injection.** Asserted present at line 320, then run → **exit 2**:

```
    package.json declares           16
    ...
    accounted for                   15

  FATAL: 1 declared verify:* entr(y/ies) got no verdict from this run:
       verify:tokens
```

The MISSING line is **absent** for that gate (`grep -c 'MISSING, and this is a failure'` → 0), and
the NOT RUN block lists only `verify:redirects` — the deferred entry is printed under **none** of
the three headings, because it was not measured, not declared absent and not MISSING. The refusal is
the only correct report, and it is the one given.

**Step 3 — negative control.** Injection removed; `grep -n 'deferred'` returns a single hit at
line 114, which is the docblock prose naming the trigger. Run → **exit 2**, output diffed against the
baseline: identical but for the stopwatch. `git status --porcelain` listed only
`scripts/verify-all.mjs`.

**Step 4 — the second direction.** Fix in place, no mutation: `unaccounted` empty, no refusal
raised by the reconciliation, exit code and count block equal to the baseline. **The widened domain
did not manufacture a refusal on a correct tree.**

### Acceptance criteria, measured

| Criterion | Result |
|---|---|
| `grep -v '^ \*' \| grep -c 'ABSENT_STATES'` ≥ 3 | **3** — declaration + two filters |
| `grep -v '^ \*' \| grep -c 'state !== "runnable"'` = 0 | **0** |
| unmutated run returns baseline exit code and count block | **yes** — exit 2, count block line for line |
| injected fourth state → exit 2, gate named in the FATAL | **yes** — `verify:tokens` |
| same injection on the shipped aggregate → exit 1, MISSING, no `unaccounted` | **yes**, recorded verbatim above |
| docblock states the partition is non-exhaustive and names the regression edit | **yes** |

---

## Task 2 — WR-01: a refusal in the aggregate cannot report a failure as a pass

Commit `7690a32`.

### The two changes

**1. The reconciliation's refusal no longer outranks a recorded failure.** It fires after every gate
has run, so `failed` and `absentRequired` are already known. When either is non-empty the FATAL
prints exactly as it would otherwise — **a refusal stays legible as a refusal** — the run then
carries the FAILURE verdict, names the reconciliation gap beside it, and exits **1**.

**The condition lives at the reconciliation's own call site, not inside `refuse()`.** This is where
this file and `verify-conversion` (plan 41-20) deliberately differ, and the reason is structural:
every other `refuse()` call site in `verify-all.mjs` fires **before a single gate has been spawned**
— `package.json` unreadable, a name declared here and not there, a command whose shape cannot be
resolved — and at those points `failed` does not yet exist. Burying the condition inside `refuse()`
would make the code pretend two genuinely different situations are the same.

The run also keeps flowing through the *"what they said"* block before the verdict, so a mixed run
still reproduces the output of every gate that did not pass. Exiting at the refusal site would have
printed the verdict correctly and thrown away the evidence.

**2. The closing paragraph stops asserting a fact this runner cannot establish.** It now says the
narrower thing that is true: **no gate that reached a verdict reported a failure** — and a refused
gate may itself have been failing at the moment it refused, because a gate that prints a red and
then exits 2 is indistinguishable from here from one that refused before measuring anything. Its
output is above under *"what they said"*, and the line says so.

Exit codes for the unmixed branches are unchanged: only-refusals is still 2, only-failures is still
1. **That distinction is the file's reason to exist and was not traded away for the fix** — which is
the same discipline plan 41-20 applied one file over.

### Mutation proof, in the order performed

Both conditions staged by their real mechanisms and **both asserted present before any result was
read**:

```
staged: verify-tables.mjs absent from disk
320:  plan.push({ name, state: name === "verify:tokens" ? "deferred" : "runnable", ... });
```

**Step 1 — pre-fix (task 1 applied, task 2 not).** Run → **exit 2**:

```
43:    verify:tables — MISSING, and this is a failure, not an omission.
59:  FATAL: 1 declared verify:* entr(y/ies) got no verdict from this run:
grep 'VERIFY_FAIL' → no match
```

**The MISSING failure is printed, and the run's verdict is a refusal.** That is WR-01's shape
reproduced inside this file: a measured failure laundered into "nothing was measured".

**Step 2 — post-fix, same pair.** Run → **exit 1**:

```
43:    verify:tables — MISSING, and this is a failure, not an omission.
59:  FATAL: 1 declared verify:* entr(y/ies) got no verdict from this run:
74:  FATAL: missing environment variable(s): ... (verify:capabilities, under "what they said")
76:  VERIFY_FAIL — 1: verify:tables (missing)
77:  AND the reconciliation above refused on 1 entr(y/ies) — verify:tokens.
```

Both are named, in that order, and the evidence of the refusing gate survives between them.

**Step 3 — the other branch.** `verify-tables.mjs` restored, injection kept: run → **exit 2**, no
`VERIFY_FAIL`, and `Nothing failed` absent from the output.

**Step 4 — negative control.** Injection removed. `git status --porcelain` listed only
`scripts/verify-all.mjs`; `git diff HEAD -- scripts/verify-tables.mjs` produced **zero lines**, so
the moved gate is byte-identical to `git show HEAD:` for its path (T-41-A2 satisfied). Run → **exit
2**, count block identical to the baseline; the only difference in the whole output is the closing
paragraph, which is task 2's entire purpose.

### Acceptance criteria, measured

| Criterion | Result |
|---|---|
| `grep -c 'Nothing failed' scripts/verify-all.mjs` = 0 | **0** |
| replacement names the possibility a refused gate was failing | **yes** — `grep -c 'printed a red and'` → 1 |
| unmutated run returns baseline exit code and count block | **yes** — exit 2 |
| MISSING gate + injected fourth state → exit 1, FATAL and `VERIFY_FAIL` naming it | **yes** |
| same pair before this task's edit → exit 2 | **yes**, recorded |
| only the injected fourth state → exit 2 | **yes** |
| after restoration: only `scripts/verify-all.mjs` modified, moved gate byte-identical | **yes** |

---

## Deviations from Plan

### 1. [Rule 3 — blocking] My own docblock tripped task 2's acceptance criterion

**Found during:** Task 2, after writing the new docblock section.

**Issue:** The paragraph explaining the change quoted the retired sentence verbatim — *"The refusal
branch used to close with `Nothing failed`"* — so `grep -c 'Nothing failed' scripts/verify-all.mjs`
returned **1**, not 0.

**Why it is a real defect and not criterion-pedantry:** the criterion exists so the sentence cannot
survive anywhere in the file. A comment holding the exact retired wording is the most likely way it
comes back — somebody restoring "the original text" copies it from the explanation of why it was
removed.

**Fix:** the docblock now describes the old behaviour without reproducing its wording, and says out
loud that the exact string is gone rather than softened **so it cannot be copied back from a
comment**. Re-run afterwards: output unchanged, exit 2.

**Files modified:** `scripts/verify-all.mjs`. **Commit:** `7690a32`.

### 2. [Rule 2 — missing critical] The refusal message said "registered", which the widened domain made false

**Found during:** Task 1, after widening the domain.

**Issue:** The reconciliation's FATAL read *"N **registered** verify:\* entr(y/ies)"* and *"account
for every **registered** gate"*. After the widening, the domain includes names this runner declares
that `package.json` does **not** register — so on exactly the run the widening exists to catch, the
message would have called an unregistered name registered.

**Fix:** reworded to *"declared"*, with the sentence naming both sources — *"in package.json or in
this runner's own lists"*. Zero silent failures applies to the wording of an error as much as to its
existence: a message that misdescribes what it found sends the reader to the wrong file.

**Files modified:** `scripts/verify-all.mjs`. **Commit:** `69694f7`.

### 3. Docblock text moved between the two commits rather than written once

**Found during:** Task 1.

**Issue:** The section describing the ordering fix was drafted during task 1, where it would have
been committed **describing behaviour the code did not yet have** — a docblock asserting something
untrue about the file it heads. That is the precise defect this whole plan exists to close, one
level up.

**Fix:** the section was removed from task 1's edit and added in task 2's, alongside the code that
makes it true. No functional difference; it keeps commit `69694f7` self-consistent.

---

## What this does NOT close

**No requirement is ticked. All seven stay PARTIAL** — DS-07, DS-08, DS-09, RESP-01, RESP-02,
RESP-03, RESP-04. They are listed in the plan's frontmatter because the aggregate *runs* every gate
that touches them, not because any of them closes here. RESP-01 closes only after 41.2, and only by
a written human pass.

**A green aggregate is not a surface anyone has looked at.** H41-1 … H41-6 remain unobserved; H41-4
stays `human_needed`, and it is still the only thing in this repository that would prove anything is
44px — every touch-target gate reads a class string, and a class string is not a box. The thirteen
rows of `41-CR01-PASS.md` are still pending.

**And this command has no test behind it.** There is no test runner for the product
(`CLAUDE.md` Guardrail 1). Everything above is an exit code, an asserted-then-read mutation, or an
exact-string assertion on source. Nothing here executed a line of product code.

---

## Known Stubs

None. No placeholder, no TODO, no hardcoded empty value was introduced; the one file changed is a
developer-run script with no data source and no rendered surface.

---

## Threat Flags

None. `files_modified` is a single script that reads `package.json` and spawns the other gates. No
route, policy, component, query, migration or rendered surface was touched, so no new network
endpoint, auth path, file-access pattern or schema change at a trust boundary was introduced.

`T-41-A2` — the one mutation in this round that could have left a gate unable to run — is closed by
measurement, not by intent: `scripts/verify-tables.mjs` is back at its original path and byte-
identical to `git show HEAD:` for it, and the working tree carried only `scripts/verify-all.mjs`.

---

## Verification

| Check | Result |
|---|---|
| `node scripts/verify-all.mjs` | **exit 2**, count block equal to the recorded baseline. The one refusing gate is `verify:capabilities`, for want of `.env.local` in this worktree — the credential difference, named, not a number copied from a credentialed checkout |
| `git status --porcelain` | only `scripts/verify-all.mjs`, then clean after commit |
| every `OFFLINE` gate script exists at the path `package.json` gives it | **yes** — 15 gates ran; `verify-tables.mjs` restored and byte-identical to HEAD |
| `grep -c 'Nothing failed' scripts/verify-all.mjs` | **0** |
| comment-stripped `grep -c 'state !== "runnable"'` | **0** |
| comment-stripped `grep -c 'ABSENT_STATES'` | **3** |
| accidental deletions across both commits | **none** — `git diff --diff-filter=D` empty; one file changed |
| `npm run build` | see Self-Check below |

**No gate's current count is hard-coded into the runner.** The change adds no literal count: the
domain is built from `package.json` and the two declared lists at run time, exactly as before.
`verify-dialogs`' `REMAINING = 14` / fence 5, `verify-conversion`'s five ticks and two wrappers and
`verify-touch-targets`' seven refusal conditions all move freely without touching this file — which
matters, because those counts moved three times in this round alone.

---

## Self-Check: PASSED

| Claim | Verified |
|---|---|
| `.planning/phases/41-shared-primitives-three-tier-layout/41-22-SUMMARY.md` exists | FOUND |
| `scripts/verify-all.mjs` exists | FOUND |
| `scripts/verify-tables.mjs` exists (restored after task 2's staging) | FOUND |
| commit `69694f7` — task 1 | FOUND in `git log` |
| commit `7690a32` — task 2 | FOUND in `git log` |
| `npm run build` | **exit 0**, re-run after this SUMMARY was written (DEF-41-01: Tailwind compiles class strings from `.planning/` and from comments) |
