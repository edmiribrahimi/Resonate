---
phase: 41-shared-primitives-three-tier-layout
plan: 18
subsystem: verification-gates
tags: [gap-closure, verify-dialogs, phase-42-fence, mutation-proof]
requires:
  - "scripts/verify-dialogs.mjs as shipped by 41-16 (the fence and its drift cross-check)"
  - "scripts/conversion-manifest.mjs PHASE_42_PATHS (the other half of the fence)"
provides:
  - "a refusal on REMAINING ∩ Phase 42 fence, raised before check B measures anything"
  - "a rung family that is not narrower than the sentence the report prints about it"
affects:
  - "scripts/verify-dialogs.mjs"
tech-stack:
  added: []
  patterns:
    - "a refusal positioned above the loop whose output it would otherwise contaminate"
    - "mutation on the documented trigger, at the live regression site, restored by asserted grep"
key-files:
  created: []
  modified:
    - "scripts/verify-dialogs.mjs"
decisions:
  - "D-41-18-A — the REMAINING ∩ fence overlap is a REFUSAL, not a warning: by the time a warning printed, REMAINING had already fallen by one, and the number is what a reader believes"
  - "D-41-18-B — widen the matcher rather than narrow the sentence, decided on a measurement (delta zero on this tree) and not on taste"
metrics:
  duration: "~40 min"
  completed: 2026-08-12
  tasks: 2
  commits: 2
---

# Phase 41 Plan 18: verify-dialogs gap closure round 2 (WR-02, WR-03) Summary

The dialog gate no longer lets a debt disappear because a fence stopped it looking,
and the sentence it prints about its own rung matcher is now true of the regex that
runs.

**This plan closes no requirement. DS-08 stays PARTIAL** — its runtime half (a dialog
observed opening as a sheet and closing with Escape) is H41-2 and is still owed, and
assumption A2 remains unobserved.

## What shipped

| Change | File | Commit |
|---|---|---|
| WR-02 — `fencedRemaining` refusal, raised before check B measures | `scripts/verify-dialogs.mjs` | `ea262f0` |
| WR-03 — the rung family widened, two probes added, the printed claim rewritten | `scripts/verify-dialogs.mjs` | `274e2a0` |

`scripts/conversion-manifest.mjs` is **byte-identical to the base commit**: it was
mutated twice and restored twice, and never committed. It appears in the plan's
`files_modified` only because the lockstep mutation had to touch it.

## The trigger each mutation used

The column that matters is the first one: round 1 of this gap closure shipped two
plans whose mutations went red for a reason unrelated to the gate under test. Each
row below names the trigger **in the words the check's own docblock or report uses**,
so a reader can tell whether the proof matched the claim.

| # | Trigger, in the check's own words | Site mutated | Exit before the fix | Exit after the fix | Exit restored |
|---|---|---|---|---|---|
| WR-02 | The fence report, printed on every run: *"If a hand-rolled dialog is written behind that fence, check B is silent about it."* The trigger is a path that is on `REMAINING` **and** behind the fence. | The **two fence lists, in lockstep** — one glob covering exactly `src/components/admin/RefundDialog.tsx` added to `PHASE_42_EXEMPT_PATHS` in `scripts/verify-dialogs.mjs` **and** to `PHASE_42_PATHS` in `scripts/conversion-manifest.mjs`. Not a probe, not a fabricated path: an entry already on `REMAINING`, pulled behind the fence. | **0** — `! B 1 REMAINING entr(y/ies) are STALE`, `src/components/admin/RefundDialog.tsx → converted; remove this entry`, and **`REMAINING = 13`**. The defect, reproduced. | **2** — `FATAL: 1 REMAINING entr(y/ies) fall behind the Phase 42 fence`, naming the path and the glob it fell behind. No `✓ B`, no `✗ B`, no `! B`, no `REMAINING =` count. | **0** — `REMAINING = 14`, `fenced by path, never measured : 5` |
| WR-03 | The gap review, in its own words (the three class parts are described rather than spelled — DEF-41-01, `.planning/` is scanned by Tailwind): *"A nineteenth hand-rolled overlay written [positioning utility + inset + a SINGLE-DIGIT rung] — or [the keyword rung] — is invisible to check B exactly as [a two-digit rung] was before this change."* | A **live JSX line in a scanned file**, not a `MATCHER_PROBES` entry: a transient `src/components/ui/Wr03RungProbe.tsx` carrying two elements, one at a single-digit rung and one at the keyword rung. Not behind the fence, not on `REMAINING`, so the correct verdict is an **undeclared** copy. | **0** — `✓ B`, `REMAINING = 14`, and the file **not named anywhere** although `files walked` rose 263 → 264. The gate walked it and did not see it. | **1** — `✗ B  1 file(s) declare a dialog shell and are not on REMAINING`, naming `src/components/ui/Wr03RungProbe.tsx` with `:4 [hand-rolled overlay]` and `:5 [hand-rolled overlay]` and the matched source of each. | **0** — `✓ B`, `REMAINING = 14`, 263 files walked |

### Why WR-02's mutation had to be applied to both files

`PHASE_42_EXEMPT_PATHS` is cross-checked, sorted, against `PHASE_42_PATHS` **before
anything is measured**, and a drift is a refusal. A glob added to one copy alone
therefore exits 2 — but on *"this gate's Phase 42 fence and the manifest's do not
match"*, which is a red for the wrong reason and proves nothing about the code under
test. That is the trap recorded as mutation A in `41-16-SUMMARY.md`. Both copies were
mutated together, and the landing was asserted by `grep -c "MUTATION-WR02"` returning
**2 in each file** before any result was read.

### The negative control, asserted rather than assumed

- `grep -c "MUTATION-WR02"` → **0** in `scripts/verify-dialogs.mjs` and **0** in
  `scripts/conversion-manifest.mjs`.
- `git status --porcelain` printed **no line for `scripts/conversion-manifest.mjs`**
  after WR-02's restoration, and **no line at all** after WR-03's transient file was
  deleted and the gate committed.
- `ls src/components/ui/Wr03RungProbe.tsx` → *No such file or directory*.
- The gate re-run after each restoration: exit **0**, `REMAINING = 14`,
  `fenced by path, never measured : 5`.

### One honest nuance about WR-02's post-fix run

The string `STALE` does appear **once** in the refusal output — inside the refusal's
own prose, explaining the outcome it prevents (*"marking the entry STALE (\"converted;
remove this entry\") and dropping REMAINING by one"*). It is not a STALE verdict about
the path: `grep -nE "converted; remove this entry|! B |✓ B|✗ B|REMAINING ="` over the
whole run returns **that one prose line and nothing else**. No tick, no count, no
STALE notice is emitted for the overlapping file.

## The two changes, and why they were made this way

### WR-02 — the overlap is a refusal, and its position is the fix

Check B `continue`s on a fenced file **before** `shellShapes` reads it. A `REMAINING`
path that matched the fence therefore satisfied both halves of `stale` (on disk, not
in `measuredShells`), so the run printed `→ converted; remove this entry` about a file
it had never opened, while `REMAINING = measuredShells.size` fell by one. **A debt
counter going down because the gate stopped looking** is the proxy-goes-quiet defect
this phase already paid for once (DEF-41-03), reappearing inside the fence this phase
had just added.

A warning would not have been enough: by the time it printed, the number a reader
believes was already wrong. So `fencedRemaining` is computed from `declaredPaths` and
`fenceMatch` and raised at **line 806**, while the first write to `measuredShells` is
at **line 940** — asserted by comparing the two `grep -n` line numbers, not by reading
the code and trusting it. Nothing is printed on a run whose two lists contradict each
other.

The refusal says what the two lists cannot both be right about, and **does not choose
between them**: either the entry leaves `REMAINING` as a declared decision, or the
fence does, and which one is a question for a person. It ends *"Nothing was measured."*

`stale` is untouched for the non-overlapping case: a genuinely converted entry stays a
loud `! B` warning and not a failure (§0 rule 3).

The docblock of `PHASE_42_EXEMPT_PATHS` records why this is a refusal rather than a
warning and **names the arrival condition**: zero overlap today, live the moment Phase
42 moves or adds a dialog under the scanner globs or `src/app/(admin)/door/**`.

**The fence/exemption distinction was not blurred.** `fenced by path, never measured`
still prints separately from `exempt from this check … measured, declared correct`.
The refusal reinforces the distinction — a fenced path is unmeasured, which is exactly
why the gate must not pronounce on it.

### WR-03 — the matcher widened, on a measurement

The plan decided the direction and this execution did not relitigate it. Measured
before deciding: every overlay line under `src/` carrying all three parts uses a
bracketed rung, and the tree holds **no single-digit and no keyword rung at all**. The
delta of widening is therefore **measured zero** — it cannot redden a correct file
here, and it leaves a reader believing something true.

`RUNG_FAMILY` now covers one-or-more digits, the `auto` keyword, or an arbitrary
bracketed value with no whitespace inside, rebuilt from concatenated fragments with no
complete utility as a literal (DEF-41-01). **Both boundary guards are untouched** —
they are what stops a longer English word reddening a correct file, and that
regression already cost this phase a plan.

Two probes were added following the existing record shape exactly, with `verdict` and
`expected` both present and agreeing; all five probe rows print and agree
(`probeDisagreements` empty). WR-04 — the dead `expected` field — was left alone: it
is out of scope for this round and the probe record was not restructured.

The printed sentence now names what the family covers **and** two shapes it still does
not see: a rung reached through a **variable**, and a class string built by
**concatenation**. The claim is no longer wider than the matcher, and not vaguer than
it either.

### The measured count, stated as a number

`REMAINING = 14` before the change and `REMAINING = 14` after it, with 263 files
walked in both runs. **The delta is 0 lines** — not "unchanged". No new line was
matched on the real tree, so nothing had to be reconciled and no count was adjusted to
fit an expectation.

## Deviations from Plan

None. The plan was executed as written, including both mutation contracts in the order
they specified.

## Verification

| What | Result |
|---|---|
| `node scripts/verify-dialogs.mjs` on the LIVE repository | exit **0**, `REMAINING = 14`, `fenced by path, never measured : 5` |
| `git status --porcelain` after both commits | empty |
| `npm run build` (the repository's only typecheck) | exit **0** — run because a temporary file lived under `src/` during task 2 |
| Refusal site above the measurement site | `fencedRemaining` refusal at `:806`; first `measuredShells.set` at `:940` |
| `grep -v '^ \*' scripts/verify-dialogs.mjs \| grep -c 'RUNG_FAMILY'` | **2** |
| `MATCHER_PROBES` — `verdict` and `expected` present and agreeing | asserted by reading the block at `:566-598`, not by running |

`npm run verify` was **not** run: this worktree has no `.env.local`, so it exits 2 with
`verify:capabilities` REFUSED and `verify:redirects` not run — a credential difference,
not a verdict, and the plan's verification does not ask for it.

**No test runner exists for the product.** Nothing here is verified because tests pass;
the evidence is exit codes, printed report lines and exact-string source assertions,
each recorded above with the number it produced.

## What was deliberately not touched

- No product file. The transient `src/components/ui/Wr03RungProbe.tsx` was created and
  deleted inside task 2 and never committed.
- No Phase 42 file: nothing under `src/components/scanner/**`,
  `src/app/(admin)/door/**` or `src/app/**/scanner/**`. This plan adjusted a fence
  around the door, it did not open it.
- `src/components/ui/PageShell.tsx` — a sibling plan owns it in this wave.
- `STATE.md` and `ROADMAP.md` — the orchestrator owns those writes.
- WR-04 (the dead `expected` field), WR-01 and WR-05 — other plans, other rounds.

## Known Stubs

None. Both changes are live code paths, each proven to fire by a mutation at its
documented trigger.

## Threat Flags

None. This plan changed one developer-run script that reads source files and writes
stdout and an exit code — no request, no session, no database row, no rendered
surface, and no new security-relevant surface beyond the plan's `<threat_model>`.

## Self-Check: PASSED

- `scripts/verify-dialogs.mjs` — FOUND
- `.planning/phases/41-shared-primitives-three-tier-layout/41-18-SUMMARY.md` — FOUND
- commit `ea262f0` — FOUND
- commit `274e2a0` — FOUND
