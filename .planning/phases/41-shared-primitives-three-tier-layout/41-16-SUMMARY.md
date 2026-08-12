---
phase: 41-shared-primitives-three-tier-layout
plan: 16
subsystem: tooling
tags: [ds-08, g2, verify-dialogs, phase-42-fence, wr-09, mutation-proof, conversion-manifest]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 09
    provides: "scripts/verify-dialogs.mjs — the three checks, REMAINING as a written shrinking list, and the two declared exceptions this plan does not move"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 05
    provides: "scripts/conversion-manifest.mjs — PHASE_42_PATHS, the fence this gate is now cross-checked against"
provides:
  - "PHASE_42_EXEMPT_PATHS in verify-dialogs.mjs — the scanner, its components and the door's second address fenced out of check B by path, cross-checked against the manifest or the run refuses"
  - "A report that prints a fence and an exemption as two different things, on two different lines"
  - "OVERLAY_PARTS as three boundary-guarded regexes matching the z rung as a FAMILY — a hand-rolled overlay at any rung is now seen by check B"
  - "A matcher self-check on three fixed probes, running on every invocation and refusing at exit 2 when the matcher disagrees with its own description"
  - "The measured fact that widening the rung reddens exactly one correct file on this tree, and that the file is not a dialog"
affects: [41-17, 42-scanner]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A fence and an exemption are not the same thing and must not be spelled the same way in the report: exempt means measured and declared correct, fenced means nobody measured it at all, and collapsing them turns a scope boundary into an approval at the only place a reader sees"
    - "When widening a matcher would redden a correct out-of-scope file, the scope fence lands FIRST and the widening lands behind it — the fence's own mutation proof can then only exist after the widening, and the two orders are forced in opposite directions"
    - "A matcher can carry its own probes and refuse when it disagrees with its docblock — but probes written by the same hand as the matcher share its blind spots and are never the acceptance evidence; the live tree is"
    - "Two gates holding the same fence compare their globs sorted before measuring, and a drift refuses — a failed import refuses too, because a fence nobody cross-checked is a fence nobody verified"
    - "A mutation to one copy of a cross-checked fence trips the drift refusal before it reaches the thing under test: both copies must be mutated in lockstep to reach the matcher, and the drift refusal firing first is itself evidence"

key-files:
  created: []
  modified:
    - scripts/verify-dialogs.mjs

key-decisions:
  - "D-41-16-A — the Phase 42 fence applies to check B ONLY. Check A reads the primitive, which is nobody's door; check C asks whether a dialog reports its outcome invisibly, and that is a silent-failure report. A phase boundary is a reason not to MODIFY a file, never a reason to go quiet about a defect (meta-gates.md, zero fallimenti silenziosi). Measured, not assumed: no file behind the fence imports the primitive, so check C's numbers are identical either way today."
  - "D-41-16-B — src/components/scanner/ScanFlash.tsx is NOT added to REMAINING. That list's own header states every entry is a dialog without a focus trap; this one is a status layer with a dismissal timer, so the entry would be a false statement, its target column would have to name a Phase 42 surface, and it would read as a debt somebody owes when the correct outcome is that the file stays exactly as it is."
  - "D-41-16-C — the constant keeps the sibling gate's name (PHASE_42_EXEMPT_PATHS) so the two fences are recognisably one mechanism, while the REPORT deliberately does not spell it as an exemption. The name is for whoever reads the code; the wording is for whoever reads the run."
  - "T-41-63 accepted and stated plainly: a real hand-rolled dialog written behind the fence is invisible to check B for as long as the fence stands. The cost is printed on every run and recorded in the header's list of what a green does not mean. Phase 42 inherits the obligation."

metrics:
  duration: "~1h"
  completed: 2026-08-12
  tasks: 3
  commits: 3
---

# Phase 41 Plan 16: The dialog gate sees an overlay at any rung, behind a Phase 42 fence — Summary

Check B's overlay matcher was keyed on one literal z rung, so a nineteenth hand-rolled
copy written at any other rung passed in silence; it now matches the **shape** of an
overlay with both tokens boundary-guarded, behind a path fence that keeps the door out of
a check the widening would otherwise redden.

## What was built

**Task 1 — the fence, declared before anything widened.** `PHASE_42_EXEMPT_PATHS` holds
the same three globs the sibling gate and the conversion manifest hold — the scanner route,
the scanner's components, the door's second address — each with its reason on the line.
`globToRegExp` is copied from `scripts/verify-touch-targets.mjs:863-880` rather than
imported, because a gate here is self-contained. Before anything is measured the gate
imports `PHASE_42_PATHS` from `scripts/conversion-manifest.mjs` and compares the globs
sorted; a drift refuses at exit 2, and a failed import refuses too. The fence is applied as
a third `continue` in **check B only**, and the walked files it skipped are counted and
printed.

**Task 2 — the matcher.** `OVERLAY_PARTS` is now three exported, boundary-guarded regexes:
the positioning utility, the inset utility, and the z rung as a **family** (two or more
digits, or an arbitrary bracketed integer). `shellShapes` tests with `.test(line)` instead
of `.includes(part)`. A self-check runs on every invocation against three fixed probes and
`refuse()`s at exit 2 when any of them disagrees with its expectation.

**Task 3 — three mutation cycles**, none of which touched product code, all restored.

## Why the order was forced, in both directions

Widening the rung to a family reddens exactly one correct file on this tree:
**`src/components/scanner/ScanFlash.tsx:135`** — the door's accept/refuse flash,
`role="status"`, `aria-live="assertive"`, dismissed by its own timer. There is nothing to
trap focus for and nothing for Escape to close: it is **not a dialog**. It escaped the old
literal matcher only because it is written at a rung one above the incumbents'. A red on a
correct file is the failure §0 rule 3 records as the one that gets a gate switched off, so
the fence had to land **before** the widening. But the fence's own mutation proof could only
exist **after** the widening — with the literal matcher still in place, removing the fence
shows nothing. Hence three tasks, in that order.

*(The flash's class string is deliberately not quoted anywhere in this document: `.planning/`
is scanned by Tailwind and this phase has already emitted a malformed rule from a comment,
DEF-41-01. It is cited by path and line.)*

## The Phase 42 fence is a scope boundary, not an approval

After this plan five files — `src/app/(admin)/admin/scanner/ScannerClient.tsx`,
`src/app/(admin)/admin/scanner/DoorSurface.tsx`, `src/app/(admin)/admin/scanner/page.tsx`,
`src/app/(admin)/door/page.tsx` and `src/components/scanner/ScanFlash.tsx` — are **never
read by check B**, which means nobody measured them rather than that somebody declared them
correct, and today the only one the fence actually silences is `ScanFlash.tsx`, whose line
135 the widened matcher would otherwise report.

The distinction survives into the print, which is the only place a reader meets it:

```
      exempt from this check          : 1  (src/components/media/Lightbox.tsx) — measured, declared correct
      fenced by path, never measured  : 5  (Phase 42 — see the fence above)
```

Two lines, two words, checked mechanically: no line of the report carries both `exempt` and
`fenced by path, never measured`.

## The three reports, and their diffs

| Run | REMAINING declared | files measured | REMAINING | fenced | exit |
|---|---|---|---|---|---|
| pre-change | 14 | 14 | 14 | — | 0 |
| after task 1 | 14 | 14 | **14** | 5 | 0 |
| after task 2 | 14 | 14 | **14** | 5 | 0 |

**The measured count stayed at 14 throughout.** No file was added to `REMAINING`, none was
removed, and `! B` printed no stale entry on any run. Nothing needed triage: the widened
matcher found no new copy outside the fence, so none of the three contingency outcomes in
the plan was reached.

**pre-change → task 1** — the fence block (three globs, their reasons, `5 walked file(s)
fall behind it`, and the sentence saying what the silence costs), plus two report lines: the
`exempt` line gained `— measured, declared correct`, and the new
`fenced by path, never measured : 5` line was added beside it. **No number moved**, checks A
and C were byte-identical.

**task 1 → task 2** — the matcher self-check block, and nothing else. Eleven added lines,
zero changed lines. Check A's counts (1/1/1, 337 live lines), check B's numbers and check
C's three importers were byte-identical.

## The three probes, and their verdicts

Printed on every run, before check B's numbers:

| Probe | Expected | Measured |
|---|---|---|
| the positioning utility at the end of a longer word | no match | **no match** |
| the three parts at a bracketed rung other than the incumbents' | match | **match** |
| the three parts at a two-digit numeric rung | match | **match** |

**These probes are not the acceptance evidence, and the plan is right that they cannot be.**
They are three strings written by the same hand as the regexes and share its blind spots —
which is exactly how the original defect survived. The evidence is the live run on the real
repository, recorded in the table above.

## The three mutation cycles

Each is recorded as **assert → exit → assert → exit**. A mutation whose landing was not
asserted first is not a proof in either direction.

### Mutation A — the fence must be load-bearing

The `src/components/scanner/**` entry of `PHASE_42_EXEMPT_PATHS` was commented out.

1. **assert** — `grep -n "MUTATION-A" scripts/verify-dialogs.mjs` printed the four commented
   lines at `:404-407`; the manifest's copy was confirmed still present at
   `scripts/conversion-manifest.mjs:176`.
2. **exit 2** — the run refused with *"this gate's Phase 42 fence and the manifest's do not
   match"*, printing both lists. **The drift refusal fires before the matcher is reached, and
   that is itself correct behaviour** — the cross-check works, and it is why the manifest's
   copy had to be mutated in lockstep to reach the thing under test.
3. **assert** — the manifest's entry was commented out too;
   `grep -n "MUTATION-A" scripts/verify-dialogs.mjs scripts/conversion-manifest.mjs`
   printed **both** sets of lines.
4. **exit 1** — check B reported
   `✗ B  1 file(s) declare a dialog shell and are not on REMAINING:` naming
   `src/components/scanner/ScanFlash.tsx:135` as a hand-rolled overlay, with `REMAINING = 15`
   and `fenced by path, never measured : 4`.
5. **assert** — both entries restored; `grep -c "MUTATION-A"` returned **0** in both files and
   both fence lines were printed back in place.
6. **exit 0** — `REMAINING = 14`, and the whole report is **byte-identical** to the task-2
   report (`diff` exit 0). No path under `src/components/scanner/`, `src/app/(admin)/door/`
   or `src/app/(admin)/**/scanner/` appears anywhere in it except inside the fence block
   (report lines 37, 39 and 41; the fence block runs 35–46).

**What mutation A proves, in one sentence:** without the fence, task 2's widened matcher
reddens a correct, out-of-scope file at the door — and the fence is a **scope boundary**,
not a judgement that `ScanFlash.tsx` is correct or incorrect.

### Mutation B — an undeclared copy must redden

The entry removed was **`src/components/venues/EditVenueButton.tsx`**.

1. **assert** — `grep -c` for that path in the gate returned **0**.
2. **exit 1** — `REMAINING entries declared : 13`, `files measured carrying a shell : 14`, and
   `✗ B` named `src/components/venues/EditVenueButton.tsx` as a shell declared outside the
   primitive and not on the list.
3. **assert** — entry restored; the same `grep -c` returned **1**, and no marker was left.
4. **exit 0** — `REMAINING = 14`.

### Mutation C — the self-check must refuse

`RUNG_FAMILY` was reduced to the numeric branch only, dropping the bracketed form — the half
of the rung family this plan bought.

1. **assert** — the mutated line was printed:
   `scripts/verify-dialogs.mjs:486  const RUNG_FAMILY = '(?:' + '\d{2,}' + ')';`
2. **exit 2** — a refusal: *"the overlay matcher disagrees with its own description on 1 of 3
   fixed probe(s) … expected match, got no match"*, and **no check-B verdict was printed at
   all** — grep for `check B`, `✓ B`, `✗ B` and `REMAINING =` over the output returned
   nothing.
3. **assert** — restored; the line was printed back with both branches.
4. **exit 0** — the report `diff`s clean against the task-2 report.

**Which copy the old matcher would have missed:** any hand-rolled overlay carrying the three
parts on one line at a rung other than the incumbents' — the concrete instance on this tree
being the door's status flash, which the old matcher never saw and which the new one sees and
is deliberately fenced away from.

## Verification

- `node scripts/verify-dialogs.mjs` on the **live repository**: exit **0**, `REMAINING = 14`,
  no stale entry, fence block printed with three globs and 5 files, self-check three rows
  reading no-match / match / match
- `npm run build` exits **0** after task 1, after task 2 and after the mutation cycles
- `git status --porcelain` clean of every mutation, and no change under `src/`
- `grep -c 'PHASE_42_EXEMPT_PATHS' scripts/verify-dialogs.mjs` = **5**, with
  `export const PHASE_42_EXEMPT_PATHS` present
- `grep -c 'OVERLAY_PARTS' scripts/verify-dialogs.mjs` = **4**, with
  `export const OVERLAY_PARTS` present
- `line.includes` no longer appears in the overlay matcher; the two remaining occurrences are
  check C's toast needle and one sentence of prose describing what the old matcher did
- No complete utility literal appears in the added code: every regex fragment and every probe
  string is concatenated. Verified by scanning the added lines of the diff — zero hits

**There is no test runner for the product** (`CLAUDE.md` Guardrail 1). Nothing here is
verified because tests pass; the proofs are exit codes, exact-string assertions on the report
and on the source, and three mutation cycles.

## What this does not close

**DS-08 remains PARTIAL and is not ticked.** This gate reads class strings and import
clauses, never behaviour: whether Escape closes the panel, whether the sheet rises from the
bottom edge below 768px and whether the page behind it scrolls are **H41-2**, a person at two
widths, and research assumption **A2** — background scroll lock under `showModal()` — is
still explicitly open with nothing reported.

Fourteen copies still stand on `REMAINING`, and
`src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx` — the interface of a
monotone, irreversible guard — is among them. Nothing here converts one.

**A limit declared rather than closed:** a class string split across two lines by a formatter
is invisible to a line-oriented matcher, before this change and after it. It is now in the
header's list of what a green does not mean, rather than left unsaid.

**A cost accepted, T-41-63:** a real hand-rolled dialog written behind the fence — on the
door — is invisible to check B for as long as the fence stands. The three globs and the five
files are printed on every run with the sentence that they were never measured. Phase 42
inherits the obligation.

## Deviations from Plan

None — the plan executed exactly as written. No new file was caught by the widened matcher,
so none of the three triage outcomes was reached; the count stayed at 14 on every run.

Task 3 produces **no diff by construction**: every mutation is restored byte-for-byte, and
`git status --porcelain` was empty afterwards. Its deliverable is the recorded evidence
above, so it is committed with this SUMMARY rather than as an empty commit.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 | `ea7cc8a` | the Phase 42 fence, cross-checked against the manifest, applied to check B only |
| 2 | `505494c` | the rung as a family, both tokens bounded, and the matcher's self-check |
| 3 | this one | the three mutation cycles, recorded — no code diff by construction |

## Self-Check: PASSED

- `scripts/verify-dialogs.mjs` — present, modified, and running green on the live tree
- `.planning/phases/41-shared-primitives-three-tier-layout/41-16-SUMMARY.md` — present
- commit `ea7cc8a` — found in `git log`
- commit `505494c` — found in `git log`
- `scripts/conversion-manifest.mjs` — mutated and restored during cycle A; `git status
  --porcelain` shows it unmodified, so the restoration is byte-exact
- No file under `src/` was modified by this plan, and no Phase 42 product file was opened
  for anything beyond a read
