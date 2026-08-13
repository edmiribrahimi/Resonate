---
phase: 41-shared-primitives-three-tier-layout
plan: 30
subsystem: verification-gates
tags: [gap-closure, round-5, coverage-declaration, deferred-register]
requires:
  - 41-29 (the shared stripper fix, and the retirement of the false byte-for-byte claim)
provides:
  - "check E's coverage limit, declared in the gate's own WHAT A GREEN DOES NOT MEAN block"
  - "DEF-41-07 — Group B's four items, deferred by decision"
  - "DEF-41-08 — Group C's structural half, the owner's, routed to 41.1"
affects:
  - scripts/verify-conversion.mjs (header prose and one printed string; no executable line)
tech-stack:
  added: []
  patterns:
    - "an unmeasured region is declared unmeasured, in the fence vocabulary: unmeasured, NOT approved"
key-files:
  created:
    - .planning/phases/41-shared-primitives-three-tier-layout/41-30-SUMMARY.md
  modified:
    - scripts/verify-conversion.mjs
    - .planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md
decisions:
  - "D-41-30-01 — the gate declares its reach instead of growing a fifth pattern; four rounds proved the pattern direction moves the defect rather than removing it"
  - "D-41-30-02 — the structural resolution is NOT taken: it edits access-gating and ticketing-payments primary paths and requires the owner's validation; routed to 41.1 as DEF-41-08"
metrics:
  tasks: 2
  commits: 3
  requirements_closed: 0
  completed: 2026-08-13
---

# Phase 41 Plan 30: The gate declares its reach Summary

**The gate now says, in its own header, that check E measures one file and not a
route — and says it as a boundary, not a blessing. No verdict, no figure and no
digest moved.**

## 1. Every printed figure, before and after

Captured by running the gate on the clean base, then again after both tasks, and
diffing the two full outputs.

| Printed figure | Before | After |
|---|---|---|
| files scanned by A, B and D | 53 | 53 |
| check A — surfaces | 8 converted surface(s), 53 file(s) | identical |
| check B — surfaces | 8 converted surface(s), 53 file(s) | identical |
| check C — exports with an importer | 15 of 15 | identical |
| the shell outside the frozen window | 25 line(s) of live code | identical |
| that window's digest | `73adc18b8…4acc754f` | **not re-frozen, not in the diff** |
| sites permitted to read a navigation property | 2 (found outside the permitted set: 0) | identical |
| the mounted / not-mounted partition | 4 of 8 mount; 4 do not | identical |
| frozen focus branch | 7 line(s), `src/components/ui/PageShell.tsx:151-157` | identical |
| exit code | 0 | 0 |

`diff` over the two complete runs returns **exactly one hunk**, and it is the
printed sentence Task 1 set out to narrow:

```
295,296c295,298
<       That partition is the check: the ones that do not are exactly §4's focus list, or
<       one of the two halves below fails.
---
>       That partition compares a DECLARED width against a MOUNTED navigation module: the
>       ones that do not mount are exactly §4's focus list, or one of the two halves below
>       fails. It says nothing about what clearance a route receives at render — a wrapper
>       above the page is climbed for modules and never opened for class strings.
```

Nothing else in the report changed by a character.

## 2. What changed in the file, and the assertion that nothing executable did

**One string literal changed** — the two-line partition sentence printed beneath
the route table became four lines. It is a template literal argument to a
`console.log`; the values interpolated into it (`mountedCount`,
`navigationBySurface.length`) are **the same two expressions as before**, in the
same order, and nothing they are computed from was re-evaluated, re-ordered or
moved. The rest of the diff is block-comment prose in the header.

Asserted, not asserted-by-eye:

| Assertion | Command | Result |
|---|---|---|
| neither frozen digest appears in the diff | `git diff -- scripts/verify-conversion.mjs \| grep -cE "^[-+].*(73adc18b\|508027fb\|8f9c39ad)"` | **0** |
| no executable identifier in an added or removed line | `git diff -- scripts/verify-conversion.mjs \| grep -cE "^[-+][^-+].*(allScanned\|layoutClosure\|NAV_MODULE_PATHS\|navigationBySurface\|refuse\(\|failures\.push)"` | **0** |
| no product file touched | `git status --porcelain -- src/` | empty |
| diff size | `git diff --stat` | 1 file, 33 insertions, 2 deletions |

No condition, no matcher, no closure, no scanned set and no frozen constant was
touched. `allScanned` still excludes climbed wrappers — which is the limit this
plan declares, and the thing it was forbidden to change.

## 3. The new `WHAT A GREEN DOES NOT MEAN` entry, and where each claim comes from

It sits immediately after the existing check-E entry, so the two limits of the
same check read together. Its three claims, each traced:

| Claim in the entry | Where it comes from |
|---|---|
| check E reads one file for the clearance, and asks the mount question of an import graph | direct reading of the shipped code — the clearance scan is keyed on `SHELL_FILE`; the mount question walks the import closure |
| a climbed ancestor wrapper is enumerated, asked exactly one question, and never enters the set checks A, B and D read | direct reading of the shipped code: the climb collects wrappers and filters the declared navigation module paths against each closure; the wrapper is never added to the scanned set |
| an ordinary route wrapper above the auth group reached **three of the four** focus routes, with the scanned-file count unchanged, the route table still printing no navigation for all three, and the run exiting 0 | **a recorded run**: `41-GAP-REVIEW-4.md` CR-04, whose verbatim output shows the three routes and `53 file(s) scanned` unchanged; **reproduced independently** by `41-VERIFICATION.md` Group C |
| `41-CR01-PASS.md` has rows 1-6 measured in a **headless** browser and rows 7-13 `pending`; H41-4 stays `human_needed` | direct reading of `41-CR01-PASS.md` — rows 1-6 carry *measured, headless*, rows 7-13 carry `pending`, and §1a states outright that a headless render is not a device render |

**One deliberate deviation from the plan's wording, and it is a correctness fix.**
The plan's action text asked the entry to describe `41-CR01-PASS.md`'s thirteen
rows as *"all still `pending`"*. **That is false as of this base**: rows 1-6 were
measured on 2026-08-13 in a headless browser with the offset at 0px. Writing the
plan's phrase would have put a **third** false sentence into this file's header,
in the same block whose job is to stop exactly that. The entry states the true
split instead — rows 1-6 headless, rows 7-13 pending, H41-4 still owed — which
is a **stronger** statement of what is unclosed, not a weaker one, because it
distinguishes an unrun row from a row run on the wrong instrument.

Two things the entry deliberately does **not** contain:

- **No line number.** This file's headers have gone stale twice by carrying
  measured addresses that moved when lines were added above them, and this edit
  adds thirty-three lines above them again. The entry states invariants.
- **No contiguous utility token.** The wrapper's three class strings are
  described — a leading inline-start clearance, a raw palette colour, a container
  maximum — never spelled. DEF-41-01: Tailwind compiles class strings out of
  comments.

## 4. `DEF-41-07` and `DEF-41-08`

Both continue the register's numbering with no gap and no duplicate, in the
house shape (finding → evidence → why not fixed here → what the phase should
decide).

**DEF-41-07 — four local defects in the refusal machinery, deferred by decision.**
How each was established is stated **per item**, not for the group:

| Item | How established |
|---|---|
| the existence guard covers one of three branches, so a non-existent path behind the Phase 42 fence is laundered from a FAILURE into a suite-wide refusal | **a run** (CR-03, disposable copy, exit 2); not re-executed in round 5 |
| a refusal branch the exit-code header advertises that nothing can reach, because an earlier refusal always fires first | **derivation over the shipped code** (WR-01), with an empirical half beside it; the derivation is the load-bearing half; not re-executed in round 5 |
| a permitted site keyed on a line's **text** rather than its position, so a byte-identical copy is permitted wherever it is put — making the refusal's own printed instruction false | **a run** (WR-02, shell split into wrapper plus inner, frozen lines byte-identical); confirmed this round by direct reading; not re-executed |
| an existence check whose verdict differs between the house case-insensitive volume and a case-sensitive one — one typo, two verdicts | **a run on the house platform** (WR-03) **plus derivation** for the case-sensitive half, which was not run on such a volume |

The stated reason for deferring is the true one: polishing refusals inside a
mechanism whose limit is now known is work that looks like progress, and round 5
was deliberately held to two items.

**DEF-41-08 — the structural half of Group C.** It records the measured fact,
both structurally different resolutions, that round 5 took the declaration
(plan 41-30 Task 1), and that the structural one edits product files under the
auth group and the payment callback — `access-gating` and `ticketing-payments`
primary in `meta-gates.md`'s routing table — so it requires the owner's
validation and is routed to **41.1**, where those surfaces convert anyway. It
closes by saying, in its own words, that **a declaration is not a closure**.

## 5. Yes — the structural fix looked small. It was not taken.

This is the item the plan asked to be recorded honestly, so: **while writing the
declaration, the structural fix looked small and obvious.** The review's own fix
note says as much — *"two changes, both small"* — and it is not wrong about the
diff. The climb already computes each wrapper's closure; feeding that closure
into the scanned set is one line, and extending the property scan from the shell
to a focus route's wrappers is a filter over a list that already exists.

**It was not taken, and the argument for the owner is that the diff being small
is precisely the pattern.** Every one of the four previous rounds had a small,
obvious fix, took it, and moved the defect one level out. More concretely, this
one is not merely a gate edit:

- It changes **what reddens**. A wrapper that legitimately reserves a column —
  which 41.1 will write the moment the shell gets its navigation prop — would go
  red on a correct file, and this gate family's own rule is that a gate which
  reddens a correct file gets switched off.
- The **better** structural form is not the scan widening at all: it is moving
  the navigation clearance to the layout that actually mounts the navigation, so
  the clearance is unreachable from the focus routes rather than merely measured
  there. That form edits `src/app/(auth)/**` and the payment callback — Critical
  paths, owner's validation first, impact analysis before diff.

So the conviction is recorded here as an **argument**, in DEF-41-08 as an open
decision, and acted on nowhere.

## 6. What this does not close

**All seven requirements stay PARTIAL** — DS-07, DS-08, DS-09, RESP-01, RESP-02,
RESP-03, RESP-04. Nothing was ticked, and a declared limit is not a closed gap:
it is a gap somebody can now see.

Open, and named so a reader does not have to rediscover them:

- **Group C's structural half** — DEF-41-08, the owner's, 41.1.
- **Group B's four** — DEF-41-07.
- WR-04, WR-05, IN-01 (`FOCUS_BRANCH_RE` has no left boundary, so a differently
  named prop counts as the render site).
- The `MIN_HEIGHT_RE` / `CENTRING_RE` hole.
- The four sibling gates' identical block-comment shape — DEF-41-06's first open
  question, prevention rather than a bug report, and it should be priced as such.

## 7. The sentence this round says louder than the others

**A gate that can finally fail is not a screen anyone has looked at.**

Five rounds have gone into this gate, and the most valuable thing still undone is
not a sixth. It is a person opening four screens. `41-CR01-PASS.md` has thirteen
rows: rows 1-6 were measured on 2026-08-13 in a **headless** browser with the
offset at 0px — the phase's first observed evidence, and real — and rows 7-13 are
`pending`. A headless render is not a device render: no touch, no real font
fallback, no thumb. **H41-4 stays `human_needed`, H41-1…H41-6 are unobserved as
device work, and RESP-03 is unticked.**

## Verification

No test runner exists for this product (Guardrail 1). Nothing below is a test.

| Proof | Result |
|---|---|
| `node scripts/verify-conversion.mjs` | **exit 0**, five ticks, every figure identical to the pre-plan run |
| the two full runs diffed | one hunk, the intended sentence |
| `git diff` digest grep | 0 |
| `git diff` executable-identifier grep | 0 |
| `npm run verify:persona` | **exit 0** — 7/7 green; worst case `src/app/(public)/events/EventTabs.tsx`, 40822 bytes ≈ 11339 tokens against a 12000 ceiling |
| `npm run verify` | **exit 2**, recorded verbatim: 16 gates accounted for, **14 passed, 0 FAILED, 1 REFUSED** (`verify:capabilities` — no `.env.local` in this worktree, so nothing about the capability model was measured), 1 needs a server. A refusal is not a pass, and exit 2 is the honest aggregate here |
| `npm run build` | **exit 0**, re-run after this SUMMARY was written (DEF-41-01 backstop) |
| `git status --porcelain -- src/` | empty |

## Deviations from Plan

**1. [Rule 1 — Bug] The plan's parenthetical about `41-CR01-PASS.md` was false.**
- **Found during:** Task 1, while writing the third claim of the new entry.
- **Issue:** the plan's action text asked the entry to say the thirteen rows are
  *"all still `pending`"*. Direct reading shows rows 1-6 carry *measured,
  headless*. Writing it would have added a third false sentence to a header block
  whose purpose is to prevent exactly that.
- **Fix:** the entry states the true split — rows 1-6 headless, rows 7-13
  pending, H41-4 `human_needed` — which states more that is unclosed, not less.
- **Files modified:** `scripts/verify-conversion.mjs`
- **Commit:** the Task 1 commit.

No other deviation. No product file was touched, no check was extended to
ancestors, no fifth pattern was taught.

## Self-Check: PASSED

Files asserted present on disk: `scripts/verify-conversion.mjs`,
`.planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md`,
`.planning/phases/41-shared-primitives-three-tier-layout/41-30-SUMMARY.md`.

Commits asserted present in `git log`: `5caa214` (Task 1, the declaration),
`f40a758` (Task 2, DEF-41-07 and DEF-41-08), both on the base `6e13d9c`.

## Known Stubs

None. This plan added prose to a gate's header, one printed sentence, and two
register entries. It wired no data and rendered nothing.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change
was introduced — no product file was modified at all.
