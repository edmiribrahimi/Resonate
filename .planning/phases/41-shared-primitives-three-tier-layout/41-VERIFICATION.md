---
phase: 41-shared-primitives-three-tier-layout
verified: 2026-08-12T21:15:00Z
status: gaps_found
score: 5/10 must-haves fully verified (1 blocking gap remains open; 4 pending human observation, unchanged from round 2)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/10
  gaps_closed:
    - "GAP-CR-01 — scripts/verify-all.mjs's reconciliation (plan 41-14's original purpose, re-attempted by plan 41-22) was an algebraic identity over state===\"runnable\" vs its complement and could never fail on the documented trigger (a fourth `plan` state). Plan 41-22 rewrote the partition onto an explicit ABSENT_STATES allow-list (`scripts/verify-all.mjs:366`). Independently reproduced by this verification: injecting `state: \"deferred\"` for `verify:tokens` at the plan.push site (`scripts/verify-all.mjs:344`) on the live tree now produces exit 2 with `FATAL: 1 declared verify:* entr(y/ies) got no verdict from this run: verify:tokens` — the reconciliation fires, not the pre-existing MISSING path. Mutation reverted; `git status --porcelain` clean before and after. This gap IS closed, both in code and as a reachable gate."
  gaps_remaining:
    - "GAP-CR-02 (round 3 — same defect class, one element deeper) — scripts/verify-conversion.mjs check E1, rewritten by plan 41-20 to assert the focus branch's OUTER element (`className={FOCUS_ROOT}` at PageShell.tsx:153), does not assert the branch's INNER element (PageShell.tsx:154). Independently reproduced by this verification: reintroducing the exact CR-01 defect at line 154 only — `w-full max-w-sm ps-[var(--nav-inset-inline-start)] pb-[calc(var(--nav-inset-block-end)+1rem)] ${className}` — with FOCUS_ROOT (line 125) and the outer div (line 153) left byte-identical, still produces exit 0 and `✓ E` on the shipped, unmodified gate. The reintroduced line 154 is counted in the report's own `read at line(s) 154, 160` / `154, 164` output, which feeds assertion 3 (\"the shell still reads both properties elsewhere\") — the reintroduction satisfies the very assertion meant to catch it, exactly as it did in round 1 before plan 41-20, just one DOM element further in. This is the SAME finding as the previous round's GAP-CR-02, closed for the outer element only. Mutation reverted; `git status --porcelain` clean before and after."
  regressions: []
gaps:
  - truth: "check E in scripts/verify-conversion.mjs — the whole stated purpose of plans 41-17 and 41-20 — prevents CR-01 from being silently reintroduced anywhere in PageShell's focus branch, not only at the branch's outer element"
    status: failed
    reason: "FOCUS_BRANCH_RE (scripts/verify-conversion.mjs:1301) asserts that FOCUS_ROOT is rendered as the whole of exactly one className somewhere in the file — satisfied by PageShell.tsx:153, the outer <div>. propertiesInFocusRoot (scripts/verify-conversion.mjs:1819) reads only the FOCUS_ROOT constant's declared string. propertyReadsElsewhere (scripts/verify-conversion.mjs:1823-1830) skips only the single declaration line (focusRootLineNo) and counts every OTHER line in the file — including PageShell.tsx:154, the focus branch's inner container — as evidence the shell 'still reads both properties elsewhere.' None of the three assertions bounds the focus branch as a region, so a nav-inset clearance added to the inner element is invisible to check E while being counted as proof the check is satisfied. Independently reproduced by this verification, not taken from 41-GAP-REVIEW-2.md's word: mutated PageShell.tsx:154 in place (FOCUS_ROOT and the outer div untouched), ran the shipped scripts/verify-conversion.mjs, observed exit 0 with 'CONVERSION_OK — all five checks passed over 8 declared surface(s)' and '✓ E the focus root reserves neither navigation property while src/components/ui/PageShell.tsx still reads both elsewhere', with the report explicitly listing line 154 under 'read at line(s)' for both --nav-inset-inline-start and --nav-inset-block-end. Reverted; git diff -- src/components/ui/PageShell.tsx is 0 lines after."
    artifacts:
      - path: "scripts/verify-conversion.mjs"
        issue: "lines 1301 (FOCUS_BRANCH_RE), 1819 (propertiesInFocusRoot), 1823-1830 (propertyReadsElsewhere): all three assertions operate on the FOCUS_ROOT declaration or on the whole file, never on the focus branch as a bounded region. A second element in the same branch (PageShell.tsx:154) is structurally unreachable by any of the three."
      - path: "src/components/ui/PageShell.tsx"
        issue: "line 154 — correct as shipped today (`w-full max-w-sm ${className}`), but its correctness is enforced by nothing mechanical. It is the same class of unguarded render site GAP-CR-02 named at line 153/136 in the previous two rounds, one element deeper."
    missing:
      - "Bound the focus branch as a region (from the line carrying className={FOCUS_ROOT} to the branch's closing brace), assert NAV_PROPERTIES are absent from every line in that region — not only the FOCUS_ROOT constant's declaration — and exclude every line inside that region from propertyReadsElsewhere so a clearance added anywhere in the branch can never count as the clearance 'surviving elsewhere.' (41-GAP-REVIEW-2.md's option (a), scripts/verify-conversion.mjs:119-133, is a workable shape.)"
      - "Alternatively: give the inner container its own named, gate-readable constant (e.g. FOCUS_INNER) rendered as the whole of exactly one className, read and asserted by the identical three rules FOCUS_ROOT already gets. Whichever shape is chosen, every element the focus branch renders must be covered, not just the first one found."
      - "Also close the weaker hole in FOCUS_BRANCH_RE noted by the review: it requires exactly one `className={FOCUS_ROOT}` ANYWHERE in the file, never that the occurrence sits inside the `width === \"focus\"` branch specifically. FOCUS_ROOT rendered on the default branch with the focus branch carrying an arbitrary class string would also satisfy it today."
      - "Re-run the exact reintroduction mutation performed in this verification (append the two nav-inset expressions to PageShell.tsx:154 only, leave FOCUS_ROOT and the outer div at :153 untouched) and confirm check E goes red — not green — before calling this closed a third time."
deferred: []
---

# Phase 41: Shared Primitives & Three-Tier Layout Verification Report

**Phase Goal:** The shared layer exists — one implementation per recurring pattern, three tiers, finger-sized targets — and is proven on its first eight whole surfaces. The remaining surfaces convert in 41.1 and 41.2 onto this layer, unchanged.
**Verified:** 2026-08-12T21:15:00Z
**Status:** gaps_found
**Re-verification:** Yes — third pass. Round 1 closed the original layout defect (CR-01) in code and found two new gate-integrity gaps (GAP-CR-01, GAP-CR-02). This round verifies round 2's closure attempt on both (plans 41-18…41-22).

## What changed since the last round, in one paragraph

Round 2 shipped five plans. Three are genuinely closed and independently reproduced by
this verification: the `verify-all.mjs` reconciliation now fires on its documented
trigger (GAP-CR-01, closed by plan 41-22); the `template.*` climb and non-route wrapper
exclusions were widened correctly (plans 41-21); and the touch-target and dialog-rung
narrowings from the earlier wave (plans 41-15, 41-16) still hold. **The one gap that
matters — check E's ability to catch CR-01 reintroduced anywhere in PageShell's focus
branch — is not closed.** Plan 41-20 rewrote check E1 to assert the branch's OUTER
element (the div carrying `className={FOCUS_ROOT}`), closing the exact mutation the
round-1 verifier used. But the focus branch renders **two** elements, and this round's
own code review (`41-GAP-REVIEW-2.md`) found — and this verification independently
reproduced by mutating the live tree — that the branch's INNER element
(`PageShell.tsx:154`) remains completely unguarded: reintroducing the full CR-01 defect
there passes check E green, and the reintroduced line is counted as evidence satisfying
the very assertion meant to catch it. This is the same defect shape as the previous
round's GAP-CR-02, one DOM element further in.

## CR-01 — closed in code, and separately: is it guarded? (constraint 4, constraint 8)

**Closed in code: YES, unchanged from round 2.** `src/components/ui/PageShell.tsx:125`
— `const FOCUS_ROOT = "flex min-h-dvh items-center justify-center p-6"` — contains
neither `--nav-inset-inline-start` nor `--nav-inset-block-end`. Line 153 (the outer div)
renders `FOCUS_ROOT` alone. Line 154 (the inner div) renders
`` `w-full max-w-sm ${className}`.trimEnd() `` — also clean. Both elements of the focus
branch are correct on the tree as it ships today. `grep -c 'var(--nav-inset'
src/components/ui/PageShell.tsx` → 2, both in the default/wide branch (lines 160, 164).
`npm run build` exits 0.

**Guarded by a gate that catches a realistic reintroduction at ANY element of the focus
branch: NO — confirmed by this round's own mutation, run independently of both the
executors' SUMMARYs and the code review's word.** Two mutation cycles, both reverted,
`git status --porcelain` clean before and after each:

1. **Inner element (`PageShell.tsx:154`), FOCUS_ROOT and the outer div untouched.**
   Mutated the inner div's className to
   `` `w-full max-w-sm ps-[var(--nav-inset-inline-start)] pb-[calc(var(--nav-inset-block-end)+1rem)] ${className}`.trimEnd() ``
   — the full CR-01 defect (248px leading padding vs 24px trailing at ≥768px; ~96px of
   dead bottom padding below 768px). Ran the shipped, unmodified
   `node scripts/verify-conversion.mjs`. Result: **exit 0**, `CONVERSION_OK — all five
   checks passed over 8 declared surface(s)`, and:
   ```
   ✓ E  the focus root reserves neither navigation property while src/components/ui/PageShell.tsx
        still reads both elsewhere, and all 8 converted surface(s) declare the width...
   ```
   with the printed report explicitly showing
   `--nav-inset-inline-start — outside the focus root: read at line(s) 154, 160` and
   `--nav-inset-block-end — outside the focus root: read at line(s) 154, 164`. Line 154
   is the reintroduced defect, counted as the evidence that clears assertion 3.
2. **Reconciliation trigger (`verify-all.mjs`), for contrast.** Injected `state:
   "deferred"` for `verify:tokens` at the `plan.push` site (`scripts/verify-all.mjs:344`).
   Ran the shipped, unmodified `node scripts/verify-all.mjs`. Result: **exit 2**,
   `FATAL: 1 declared verify:* entr(y/ies) got no verdict from this run: verify:tokens` —
   the reconciliation now genuinely fires. This is GAP-CR-01, and it is closed.

**These are three different questions, and this round answers them three different
ways: the layout defect is gone from the tree today (yes); the reconciliation that
should have caught a category of silent regression across the whole gate suite now does
(yes, newly); the one gate purpose-built to catch this specific defect reappearing does
not, because it only watches one of the two elements it needs to (no, still).**

**Count: this is the second consecutive round in which a mechanical guard against CR-01
reintroduction was declared closed by its own plan and found open by independent
mutation.** Round 1 (plan 41-17): check E1 read only the `FOCUS_ROOT` declaration, never
any render site — reintroducing the defect at the (then single-known) render site passed
green. Round 2 (plan 41-20): check E1 was rewritten to assert the render site — but only
the branch's first element. Reintroducing the identical defect at the branch's second
element passes green again. **The guard has been declared closed twice and found open
twice.** A third closure attempt (against the branch as a whole region, not against a
single element) is required before this can be called closed.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One implementation per recurring pattern exists | ✓ VERIFIED (unchanged) | `src/components/ui/{Button,Chip,Input,Card,PageShell,Typography,Dialog,DataTable,Checkbox,Skeleton}.tsx` present, exported, wired. `npm run build` exit 0 (re-run this round); `node scripts/verify-conversion.mjs` exit 0 |
| 2 | Roadmap criterion 1 — no surface shows the pattern until whole-converted, checked mechanically | ✓ VERIFIED (unchanged) | `node scripts/verify-conversion.mjs` exit 0 on this tree, checks A–D pass with counts identical to the previous round (53 files scanned, 8 surfaces) |
| 3 | Roadmap criterion 2 (DS-08) — dialog opens as sheet/window, closes with Escape | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `Dialog.tsx:251` `showModal()`; `verify-dialogs.mjs` exit 0. A2 (scroll lock) still unverified — `41-RELEASE-PASS.md` H41-2d: "A2 STILL OPEN" |
| 4 | Roadmap criterion 3 (DS-09) — dense table reads as cards on phone | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `DataTable.tsx:391` `md:hidden`; `verify-tables.mjs` exit 0. H41-3 unobserved |
| 5 | Roadmap criterion 4 (RESP-01, RESP-02, RESP-04) — every converted surface workable phone/tablet/desktop | ✗ FAILED — the CODE regression stays closed; the GATE that should catch its recurrence still cannot, at the inner element of the focus branch | The four navigation-free surfaces' rendered code is correct today. But the mechanism meant to prevent this class of defect from recurring silently does not cover the branch's second element (GAP-CR-02, round 3), and the human observation that would independently catch either state (H41-1 / `41-CR01-PASS.md`) remains fully unmade — 13 rows, all `pending`. RESP-01/RESP-02 remain PARTIAL exactly as REQUIREMENTS.md declares (`.planning/REQUIREMENTS.md:254-255`); RESP-01 closes only after 41.2 |
| 6 | Roadmap criterion 5 (RESP-03) — touch targets finger-sized, large touch screens included | ? UNCERTAIN — class-string check only, no device ever used (unchanged) | `verify-touch-targets.mjs` exit 0, exemption narrowed to 10 named elements (plan 41-15). H41-4 still `human_needed`, not ticked (`41-RELEASE-PASS.md` line 335) |
| 7 | The goal's own claim — "proven on its first eight whole surfaces" | ✗ NOT MET as a human-observed fact (owed, not falsified — unchanged) | Zero of H41-1…H41-6 carry an itemised observation; `41-RELEASE-PASS.md`'s single-word `approved` is unchanged. `41-CR01-PASS.md`'s 13 rows are still `pending` |
| 8 | Exactly eight surfaces declared converted | ✓ VERIFIED (unchanged) | `conversion-manifest.mjs` `CONVERTED.length === 8` |
| 9 | One command runs every gate and reports refusal distinctly from failure, and its internal reconciliation can actually fail | ✓ VERIFIED — newly closed this round | `npm run verify` exit 0 on this checkout (credentialed): 15 passed, 0 failed, 1 not-run, 16 accounted for. The reconciliation (`scripts/verify-all.mjs:366-410`) now fires on its documented trigger — independently reproduced by injecting a fourth `plan` state and observing exit 2 with `FATAL: … got no verdict from this run`. GAP-CR-01 closed |
| 10 | The remaining ~26 conversion units are explicitly deferred to 41.1/41.2 | ✓ VERIFIED (unchanged) | `.planning/ROADMAP.md`; `.planning/REQUIREMENTS.md:251-257` |

**Score:** 5/10 truths cleanly VERIFIED (1, 2, 8, 9, 10 — truth 9 newly joins this list
this round). 1 truth (5) carries an independently-reproduced, still-open gate gap. 4
truths (3, 4, 6, 7) remain UNCERTAIN pending human observation, unchanged from every
previous round.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/components/ui/PageShell.tsx` | focus form reserves no navigation clearance, at every element | ✓ VERIFIED in code, ⚠️ unguarded at the inner element | `:125` `FOCUS_ROOT` clean; `:153` outer div clean and guarded; `:154` inner div clean but unguarded (see gap) |
| `scripts/verify-conversion.mjs` | check E — width agrees with mounted navigation, catches CR-01 reintroduced anywhere in the focus branch | ⚠️ PRESENT, GUARDS ONE OF TWO ELEMENTS | `:1301` `FOCUS_BRANCH_RE` guards the outer element only; `:1819-1830` reads the declaration and the whole file, not a bounded branch region — inner element (`:154`) invisible to it |
| `scripts/verify-all.mjs` | reconciliation that can fail | ✓ VERIFIED — genuinely closed this round | `:366` `ABSENT_STATES` allow-list replaces the exhaustive complement; independently reproduced firing on the documented trigger |
| `.planning/phases/41-.../41-CR01-PASS.md` | pending procedure, 13 rows | ✓ VERIFIED (unchanged) | present, all 13 rows `pending`, none upgraded |
| `scripts/verify-touch-targets.mjs` | narrower, proven exemption | ✓ VERIFIED (unchanged) | `PRIMITIVE_RAW_ELEMENTS`, 10 declared entries |
| `scripts/verify-dialogs.mjs` | rung matched as a family, Phase 42 fence | ✓ VERIFIED (unchanged) | `OVERLAY_PARTS`/`RUNG_FAMILY` widened; `PHASE_42_EXEMPT_PATHS` cross-checked |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `PageShell.tsx` (focus, outer element, `:153`) | check E1 | `FOCUS_BRANCH_RE` asserting `className={FOCUS_ROOT}` as the whole of the outer div | ✓ WIRED | confirmed by source read; a mutation naming the identifier alone or widening it (`C′` in 41-20-SUMMARY.md) correctly refuses |
| `PageShell.tsx` (focus, INNER element, `:154`) | check E1 | assertion that the inner element carries no nav-inset property | ✗ NOT WIRED — this is the gap | independently reproduced: reintroducing the exact CR-01 defect at line 154 alone passes `✓ E`, exit 0, and the reintroduced line is counted toward the evidence satisfying assertion 3 |
| `scripts/verify-all.mjs` reconciliation | a fourth `plan` state | `ABSENT_STATES` non-exhaustive partition → `refuse()` on `unaccounted` | ✓ WIRED — newly closed this round | independently reproduced: a fourth state is caught by the reconciliation, exits 2, names the gate |

### Data-Flow Trace (Level 4)

Not applicable in the usual sense — this phase's artifacts are layout primitives and
verification scripts. The relevant trace for this round is the same gate-to-defect trace
performed above (CR-01 → check E1 → render site), narrowed this round to which element
of the render site.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| `npm run build` typechecks and compiles | `npm run build` | exit 0, 58 routes emitted | ✓ PASS |
| `npm run verify` aggregate on this (credentialed) checkout | `npm run verify` | exit 0 — 15 passed, 0 failed, 1 not-run, 16 accounted for | ✓ PASS |
| CR-01 closed in code, both elements of the focus branch | direct source read `PageShell.tsx:125,153,154` + `grep -c 'var(--nav-inset'` = 2 | confirmed clean | ✓ PASS |
| `verify-all.mjs` reconciliation fires on its documented trigger (a fourth `plan` state) | injected `state:"deferred"` for `verify:tokens` at `scripts/verify-all.mjs:344` on the live tree, ran it, reverted, confirmed `git status` clean | exit 2, `FATAL: … got no verdict from this run: verify:tokens` | ✓ PASS — GAP-CR-01 closed |
| `verify-conversion.mjs` check E catches CR-01 reintroduced at the focus branch's OUTER element | mutated `PageShell.tsx:153` in place, ran the shipped gate, reverted | exit 2, `✗ E`, refuses correctly | ✓ PASS |
| `verify-conversion.mjs` check E catches CR-01 reintroduced at the focus branch's INNER element | mutated `PageShell.tsx:154` in place (left `:125` and `:153` untouched), ran the shipped gate, reverted, confirmed `git status` clean | exit 0, `✓ E`, the mutated line counted as evidence for assertion 3 | ✗ FAIL — reproduces GAP-CR-02, round 3 |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist and none are declared in any PLAN/SUMMARY
for the round-2 closure plans. **Step 7c: SKIPPED (no probes declared or discovered)** —
unchanged from every previous round.

### Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| DS-07 | PARTIAL, unchanged | `.planning/REQUIREMENTS.md:125,251` unchecked |
| DS-08 | PARTIAL, unchanged | `.planning/REQUIREMENTS.md:126,252` unchecked; A2 still open |
| DS-09 | PARTIAL, unchanged | `.planning/REQUIREMENTS.md:127,253` unchecked |
| RESP-01 | PARTIAL — the code regression stays closed; the guard against it recurring is still one element short | `.planning/REQUIREMENTS.md:132,254` unchecked, "closes only after 41.2" |
| RESP-02 | PARTIAL, same disposition as RESP-01 | `.planning/REQUIREMENTS.md:133,255` unchecked |
| RESP-03 | PARTIAL, human evidence still owed | `.planning/REQUIREMENTS.md:134,256` unchecked; H41-4 `human_needed`, not ticked |
| RESP-04 | PARTIAL, unobserved | `.planning/REQUIREMENTS.md:135,257` unchecked; H41-6a not ticked, capability set never stated |

All seven requirement IDs remain PARTIAL, matching the task's stated expectation. No
orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `scripts/verify-conversion.mjs` | 1301, 1819-1830 | Check E1's three assertions bound the `FOCUS_ROOT` declaration and the whole file, never the focus branch as a region — a second element in the same branch is structurally unreachable and its reintroduced defect is counted as the evidence that clears the check | 🛑 Blocker | GAP-CR-02 (round 3). Independently reproduced by mutation in this verification, not cited from the review |
| `src/components/ui/PageShell.tsx:154` | 154 | The inner render site — correct today, unguarded | ℹ️ Info | Not a defect in shipped code; named because it is the exact location the missing assertion needs to cover |
| `scripts/verify-conversion.mjs` (WR-01…WR-05 of `41-GAP-REVIEW-2.md`) | various | Five gate-integrity warnings found by this round's own code review, each independently reproduced there by mutation with reversion confirmed (`git status --porcelain` clean): a STALE dialog-debt refusal that skips two of three unmeasured categories; a failure-absorbing refusal in `verify-conversion.mjs` unreachable on this tree while its header claims otherwise; a `FOCUS_ROOT` literal reader that still refuses on a correct trailing block comment; a wrapper-extension allow-list that refuses on an editor tilde-backup file; a dialog rung matcher whose printed sentence over-promises against a negative z-index rung | ⚠️ Warning | Not independently re-run by this verification (lower severity than the one critical this task was scoped to adjudicate); accepted as accurately reported based on the review's own executed-mutation methodology, consistent with this repository's practice of proving gates by running them rather than reading them |
| `scripts/verify-all.mjs` / `scripts/verify-conversion.mjs` (IN-01…IN-03) | various | Three informational findings: a SUMMARY attributing a change to a file it did not touch; a refusal branch that can suppress the "what they said" evidence block on a mixed run; a display count positioned to read as a reconciliation it is not | ℹ️ Info | Not independently re-run; documentation/clarity issues, not correctness defects |

No new `TBD`/`FIXME`/`XXX` debt markers found in the files this gap-closure wave
modified, checked by direct grep against `scripts/verify-all.mjs`,
`scripts/verify-conversion.mjs`, `scripts/verify-dialogs.mjs`.

### Human Verification Required

Unchanged from every previous round — none of these six items were newly observed by
round 2, and none should be read as newly required by the finding here (it was already
owed). H41-1 (eight surfaces at three widths, now including the CR-01 re-observation via
`41-CR01-PASS.md`'s 13 rows), H41-2 (dialog behaviour including the still-open A2), H41-3
(table-to-cards on phone), H41-4 (touch targets on a real device — the only proof
anything renders at 44px), H41-5 (desktop mouse-only), H41-6 (eight tabs, door
untouched). All `pending`/`human_needed` in `41-RELEASE-PASS.md`, none upgraded by this
wave's blanket one-word `approved`, none should be.

### Gaps Summary

**One blocking gap, a direct continuation of the previous round's GAP-CR-02, independently
reproduced by running mutated code rather than trusting either the code review or the
executors' SUMMARYs.**

**GAP-CR-02 (round 3).** `scripts/verify-conversion.mjs` check E1 — the whole stated
purpose of plans 41-17 and 41-20 combined — asserts that `PageShell.tsx`'s focus branch
renders `FOCUS_ROOT` as the whole of exactly one `className` (the OUTER element,
`:153`), and separately asserts that the `FOCUS_ROOT` constant's own declaration
(`:125`) contains neither navigation property. Neither assertion, nor `propertyReadsElsewhere`,
bounds the focus branch as a region. The branch renders a SECOND element (`:154`), and
nothing in check E reads it. Reproduced: appending the full CR-01 defect directly to
line 154's className (leaving `:125` and `:153` byte-identical) produces `✓ E` and exit
0 on the shipped, unmodified gate — and the reintroduced line is counted as satisfying
assertion 3 ("still reads both properties elsewhere"), fed by the very reintroduction it
exists to catch. **This is the third time in this phase's history that a gate's own
report has been satisfied by the defect it names** (WR-03's identity in round 1;
GAP-CR-02 at the outer element in round 1's re-verification; GAP-CR-02 at the inner
element here).

**Why this matters more than an ordinary finding, stated plainly:** `PageShell.tsx` is
correct today, at both elements of its focus branch. CR-01 really is fixed in the tree,
confirmed independently across two rounds now. But the plan whose whole stated purpose
was to make sure it could not come back silently, on its **second attempt**, still
covers only one of the branch's two elements. A green gate that cannot fail on a
realistic reintroduction is worse than no gate, because it reads as guarded when it is
not. The phase's own goal is "one implementation per recurring pattern," and this is the
second consecutive round in which the check meant to prove that implementation stays put
has been declared closed and found open by direct execution.

**Everything else genuinely improved and holds.** `verify-all.mjs`'s reconciliation
(GAP-CR-01) is closed — the first gap from the original round to survive two closure
attempts and land clean on the second. `verify-touch-targets.mjs` and
`verify-dialogs.mjs`'s narrowings from the earlier wave still hold, unchanged. The
`template.*` climb and non-route wrapper handling from plan 41-21 are correct as far as
this verification tested them (not independently re-run this round; see the review's own
executed-mutation evidence).

**Human verification remains exactly as owed as before this wave — not more, not less.**
`41-CR01-PASS.md`'s 13 rows and `41-RELEASE-PASS.md`'s six items are unchanged, all
`pending`/owed. This report does not upgrade any of them, and does not treat the one
remaining mechanical gap as if it closed the human question — they are independent
findings.

---

_Verified: 2026-08-12T21:15:00Z_
_Verifier: Claude (gsd-verifier)_
