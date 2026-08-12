---
phase: 41-shared-primitives-three-tier-layout
verified: 2026-08-13T09:30:00Z
status: gaps_found
score: 5/10 must-haves fully verified (3 blocking gate-integrity gaps open — one now in its THIRD consecutive round, two newly surfaced by this round's own review; 4 pending human observation, unchanged since round 1)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/10
  gaps_closed:
    - "GAP-CR-02, round-3 shape (the INNER element of the focus branch) — plan 41-23 rewrote check E1 from asserting a single element to bounding the whole `width === \"focus\"` branch as a region (FOCUS_BRANCH_OPEN_RE + brace-balance region, scripts/verify-conversion.mjs:1455-1552) and excluding every line of that region from the 'reads both properties elsewhere' evidence (scripts/verify-conversion.mjs:2076-2103). Independently reproduced by this verification: reintroducing the exact CR-01 defect at PageShell.tsx:154 only (FOCUS_ROOT and the outer div left byte-identical) now produces exit 1 and '✗ E  the focus branch reads 2 navigation propert(y/ies) — this is CR-01' — the specific mutation that passed green in the previous two rounds now fails correctly. Mutation reverted; git diff -- src/components/ui/PageShell.tsx is 0 lines. This is the second gap this phase has closed on a re-attempt (after GAP-CR-01 in round 2) — but see gaps_remaining: the guard is closed against every ELEMENT of the branch and open against the branch's SHAPE."
    - "verify-dialogs.mjs WR-05 (round-3 review numbering) — the negative rung form (e.g. `-z-10`) was invisible to RUNG_FAMILY despite the printed sentence promising coverage of every written-out rung. Widened by plan 41-24; independently re-derived by reading scripts/verify-dialogs.mjs's rung family definition and cross-checking the printed sentence, which now states the boundary guard is evaluated before the optional sign."
  gaps_remaining:
    - "The check-E reintroduction guard (scripts/verify-conversion.mjs) — CLOSED against every ELEMENT of the focus branch, OPEN against the branch's SHAPE. Independently reproduced by this verification: rewriting the branch as a brace-less `if` (`if (width === \"focus\") return (...)` with no block braces, otherwise byte-identical, defect reintroduced on the inner element) reduces the derived region from 7 lines to 3 (PageShell.tsx:151-153) because focusBranchOpened is set by ANY brace that raises the balance above zero, including the JSX className brace on the opener line itself — not only a block brace. The reintroduced line 154 falls outside the truncated region and is counted as evidence under 'outside the focus branch: read at line(s) 154, 159' — the shipped gate exits 0 with 'CONVERSION_OK — all five checks passed'. This is the THIRD consecutive round in which a mechanical guard against this exact reintroduction was declared closed by its own plan and found open by independent execution — round 1 (plan 41-17, asserted the constant, defect moved to the render site), round 2 (plan 41-20, asserted the outer element, defect moved to the inner element), round 3 (plan 41-23, asserted the branch as a region, defect moved to the shape of the branch: ternary, brace-less if, a `}` inside a string, and a concatenation hidden behind a block comment via the sibling FOCUS_ROOT_LITERAL_RE regex). Mutation reverted both ways (inner-element and brace-less-if); git diff -- src/components/ui/PageShell.tsx is 0 lines after each."
  regressions: []
gaps:
  - truth: "check E in scripts/verify-conversion.mjs prevents CR-01 from being silently reintroduced under ANY shape the focus branch can legally take, not only the shapes a previous round has already seen and patched"
    status: failed
    reason: "The guard is anchored to recognising specific SHAPES (a block-braced if, a balanced-brace region, a literal closing on its declaration line) and green-lights anything it does not recognise, rather than asserting that the branch has the one frozen shape the author wrote and refusing on any deviation. Independently reproduced by this verification: (1) reintroducing the CR-01 defect at the branch's inner element (PageShell.tsx:154, round 2's escape) now correctly produces exit 1, ✗ E — confirming plan 41-23's region fix genuinely closed the element-level escape. (2) The SAME defect, written under a brace-less `if (width === \"focus\") return (...)` (no block braces, otherwise byte-identical to the shipped file) still produces exit 0, ✓ E, CONVERSION_OK — the region truncates to 3 lines (151-153) because focusBranchOpened is set by the first brace that raises the balance above zero, which is the JSX expression brace on the className, not a block brace. Both mutations reverted; git diff -- src/components/ui/PageShell.tsx is 0 lines after each. Across three rounds the escaping shape has never been the same twice (render site → element → branch-shape), which is itself the evidence that shape-recognition is the wrong direction: each fix teaches the matcher one more form, and the next form always exists (ternary, brace-less if, a `}` inside a string [scripts/verify-conversion.mjs:1332 FOCUS_ROOT_LITERAL_RE character-balance], a concatenation hidden behind a block comment [same regex, CR-02 of 41-GAP-REVIEW-3.md, reachable because the relaxed tail `(?:\\/\\/.*|\\/\\*[\\s\\S]*)?$` consumes everything after a `/*` including a `+` and a second string literal])."
    artifacts:
      - path: "scripts/verify-conversion.mjs"
        issue: "lines 1455-1552 (FOCUS_BRANCH_OPEN_RE, the brace-balance loop, focusBranchOpened, focusBranchRegion): the region's end is derived by counting ANY brace, so an opener line that also carries a JSX expression brace closes the balance immediately and truncates the region to the opener's own line-span. Lines 1332-1361 (FOCUS_ROOT_LITERAL_RE): the relaxed comment tail reads past a `/*` unconditionally, so a concatenation hidden behind a block comment is read as a clean literal rather than refused."
      - path: "src/components/ui/PageShell.tsx"
        issue: "lines 125, 151-157 — correct as shipped today (verified directly: `grep -n nav-inset` shows both occurrences on lines 160 and 164, inside the default/wide branch only). Its correctness is enforced by a gate that recognises today's exact shape and nothing else."
    missing:
      - "INVERT the assertion's direction. Stop hunting for the defect (a NAV_PROPERTIES search over a derived region) and instead assert that the focus branch has EXACTLY the one frozen expected shape: `if (width === \"focus\") {` on its own line, `return (` on the next, a fixed two-element JSX structure, closing `);` and `}`. Any deviation from that literal, line-by-line shape — a ternary, an `if` without braces, a brace inside a string, a concatenation, an extra element, a reordered attribute, or any future refactor nobody has thought of yet — must produce a REFUSAL, never a tick. This is a structural inversion, not a fifth regex case: the four escapes observed across three rounds (ternary, brace-less if, brace-in-string, comment-hidden concatenation) are evidence that shape-hunting cannot be completed by enumeration, not a checklist of four forms still to patch. A round-4 plan that adds four more regex branches to the existing hunt-for-the-defect direction would repeat rounds 1-3."
      - "Apply the same inversion to FOCUS_ROOT_LITERAL_RE (scripts/verify-conversion.mjs:1332): assert the declaration line matches one frozen pattern (a single double-quoted literal, optional semicolon, optional single-line `//` comment — nothing else) and refuse on anything else, rather than widening the tail's tolerance further each time a new trailing-comment shape is found."
      - "Before calling this closed a fourth time: re-run the exact mutations this verification performed (inner-element reintroduction; brace-less-if reintroduction; the comment-hidden-concatenation reintroduction on FOCUS_ROOT) and confirm all three refuse or fail — not merely that the shapes named here individually pass — and additionally invent one shape not on this list (a fifth branch form, or a helper function extracted from the JSX) to test whether the inversion actually removed the enumeration problem or only added a fifth case to it."
  - truth: "scripts/verify-dialogs.mjs's REMAINING/measuredShells accounting cannot report a file as 'converted; remove this entry' when the gate never opened that file, regardless of WHY the file was never opened"
    status: failed
    reason: "Round 3 (plan 41-24) closed this for two of three never-opened categories (the primitive itself, the declared FULL_BLEED_VIEWER exemption) by keying the refusal on NEVER_MEASURED_BY_B (scripts/verify-dialogs.mjs:394-411). A third category is structurally uncovered: a REMAINING path that is real, on disk, but OUTSIDE listScannableFiles(SRC_DIR)'s walk (scripts/verify-dialogs.mjs:206,219,866) — outside src/, or carrying an extension not in SCANNED_EXTENSIONS (.ts/.tsx/.js/.jsx/.mjs/.cjs; e.g. .css, .mdx, .astro, or a path typo landing on a real non-scanned file). Read directly (not merely trusted from the review): neverOpenedReason() (scripts/verify-dialogs.mjs:957-967) checks only NEVER_MEASURED_BY_B.get(path) and fenceMatch(path) — it never checks membership in the `files` array the walk produced. The check-B loop (scripts/verify-dialogs.mjs:1108-1121) only ever iterates `files`, so a path outside the walk never enters measuredShells; the stale computation (scripts/verify-dialogs.mjs:1127-1134, 'on disk and not in measuredShells') then classifies it identically to a genuinely-converted file, and the refusal at :972 (unmeasurableRemaining, keyed on neverOpenedReason returning non-null) does not catch it because neverOpenedReason returns null for a not-walked path. 41-GAP-REVIEW-3.md's CR-03 independently proved this by execution (a probe REMAINING entry outside the walk produced exit 0, '! B 1 REMAINING entr(y/ies) are STALE', 'converted; remove this entry', and REMAINING falling from 15 declared to 14) — this verification confirms the same result by reading the three functions' logic directly, without re-running the probe."
    artifacts:
      - path: "scripts/verify-dialogs.mjs"
        issue: "neverOpenedReason() at lines 957-967 is keyed on two of the loop's three skip conditions (NEVER_MEASURED_BY_B, fenceMatch) but the loop at 1108-1121 has an implicit THIRD skip condition — simply not being a member of `files` — that neverOpenedReason never tests. The docblock at lines 355-373 asserts 'the set that decides what is skipped IS the set the refusal is keyed on, and the two cannot drift apart by an edit to either' — false for this third category, which was never added to either set."
    missing:
      - "Build a `walked` Set from `files` (scripts/verify-dialogs.mjs:866) and add a third branch to neverOpenedReason(): if the path is not in `walked`, return a distinct reason ('NOT IN THE WALK — under src/ with a scanned extension is what the walk covers; this path is not, so check B never opened it and cannot tell a paid debt from an unread one') rather than null. This closes the docblock's 'ONE list' claim as fact rather than aspiration — the fix GAP-REVIEW-3.md's own CR-03 section proposes, essentially unchanged."
      - "Re-run GAP-REVIEW-3.md's CR-03 probe (a REMAINING entry naming a real, on-disk, not-walked path such as `src/app/globals.css`) on the fixed gate and confirm it now refuses with a distinct 'NOT IN THE WALK' reason rather than the generic STALE notice."
  - truth: "the gate scripts' own docblocks accurately describe what the code beneath them does, so a future reader can trust a claim without re-deriving it"
    status: failed
    reason: "Two docblock claims are false on the code as shipped by round 3, independently re-read by this verification (not taken from the review's word alone). (1) scripts/verify-conversion.mjs's FOCUS_ROOT_LITERAL_RE docblock (around line 1318-1319, immediately above the regex at :1332) states 'the literal read is byte-for-byte the literal, comment or no comment.' False: the tail `(?:\\/\\/.*|\\/\\*[\\s\\S]*)?$` matches everything after a `/*`, so a declaration followed by `/* x */ + \"ps-[var(--nav-inset-inline-start)]\"` reads only the FIRST fragment and reports it as the whole literal — the browser receives a different string than the one the gate printed as evidence of correctness. (2) scripts/verify-dialogs.mjs's NEVER_MEASURED_BY_B docblock (lines 371-373, immediately above the Map at :394) states 'the set that decides what is skipped IS the set the refusal is keyed on, and the two cannot drift apart by an edit to either.' False for the third skip category (not-in-the-walk) documented in the paired gap above — that category was never added to either list, so the two CAN and do drift apart. Both claims were true of the code they described when the sentence was written and became false the moment a category the sentence did not anticipate was found — which is exactly the failure mode a header is supposed to prevent a reader from re-discovering by hand."
    artifacts:
      - path: "scripts/verify-conversion.mjs"
        issue: "docblock above FOCUS_ROOT_LITERAL_RE (~line 1318) asserts byte-for-byte fidelity the regex does not provide once a block comment hides a concatenation operator"
      - path: "scripts/verify-dialogs.mjs"
        issue: "docblock above NEVER_MEASURED_BY_B (lines 371-373) asserts the two lists cannot drift apart; a third, un-listed skip condition (not-in-the-walk) proves they already have"
    missing:
      - "Correct both docblocks in the same commit that fixes the underlying gap, not before and not after — this file family (41-25-SUMMARY.md) already established the pattern ('a claim is a measurement, not a sentence') for the header-numbers finding; the same discipline applies to a docblock's prose claim, not only to its printed numbers."
      - "For FOCUS_ROOT_LITERAL_RE: narrow the claim to what is actually true after the shape-inversion fix (a frozen-shape assertion makes the 'byte-for-byte' claim either true by construction or unnecessary, because a declaration not matching the frozen shape refuses outright)."
      - "For NEVER_MEASURED_BY_B: once the walked-set check is added (see the paired gap), the 'cannot drift apart' claim becomes true for three categories instead of two — update the docblock's enumeration from two to three in the same commit."
deferred: []
---

# Phase 41: Shared Primitives & Three-Tier Layout Verification Report

**Phase Goal:** The shared layer exists — one implementation per recurring pattern, three tiers, finger-sized targets — and is proven on its first eight whole surfaces. The remaining surfaces convert in 41.1 and 41.2 onto this layer, unchanged.
**Verified:** 2026-08-13T09:30:00Z
**Status:** gaps_found
**Re-verification:** Yes — fourth pass, verifying the THIRD round of gap-closure plans (41-23, 41-24, 41-25). Round 1 (plan 41-13/41-17) closed CR-01 in code and attempted a gate; found open (defect moved to the render site). Round 2 (plans 41-18–22, specifically 41-20) closed the render-site escape; found open (defect moved to the branch's inner element). Round 3 (plans 41-23–25) closed the inner-element escape by bounding the whole branch as a region; **this verification, independently reproducing 41-GAP-REVIEW-3.md's decisive findings, confirms the guard is open a THIRD time — the defect has moved to the SHAPE of the branch.**

## What changed since the last round, in one paragraph

Round 3 shipped three plans. Two are genuinely closed and independently reproduced by
this verification: `verify-dialogs.mjs`'s negative-rung matcher blind spot (the review's
WR-05) is now covered, and — separately and more significantly — **the previous round's
open gap (GAP-CR-02 at the branch's inner element) is closed**: reintroducing the CR-01
defect at `PageShell.tsx:154` alone, leaving the constant and the outer element
untouched, now correctly produces `exit 1`, `✗ E`. That is real progress, proven by this
verification's own mutation, not taken from either the executors' SUMMARYs or the code
review's word. **But the guard's own code review of the round-3 output
(`41-GAP-REVIEW-3.md`) found — and this verification independently reproduced — that
the SAME defect, written under a branch with no block braces (`if (width === "focus")
return (...)`, otherwise byte-identical), still passes green.** The region-bounding logic
that closed the element-level escape derives its boundary from brace balance, and any
brace that raises the balance above zero opens the region — including the JSX
expression brace on the opener line itself, not only a block brace. Remove the block
braces and the region truncates to three lines before the reintroduced line is ever
read. This is the same defect *shape* the phase has now seen three times running: a
check declared closed by asserting on the place the defect was last observed, and a
next reintroduction that lands one abstraction level away from where the assertion
looks.

## CR-01 — closed in code, and separately: is it guarded? (constraint 4, constraint 8)

**Closed in code: YES, unchanged across all three rounds and re-confirmed directly by
this verification.** `grep -n "nav-inset" src/components/ui/PageShell.tsx` returns
exactly two lines — `160` and `164` — both inside the default/wide branch. Line `125`
(`FOCUS_ROOT`) and lines `151-157` (the focus branch, both elements) contain neither
`--nav-inset-inline-start` nor `--nav-inset-block-end`. `npm run build` exits 0 (run by
this verification, 2026-08-13, tree restored beforehand; 58 routes emitted, no
TypeScript error).

**Guarded against a REALISTIC reintroduction, including after an ordinary refactor of
the branch: NO — confirmed by two mutations run independently in this verification,
both reverted, `git diff -- src/components/ui/PageShell.tsx` at 0 lines before and
after each:**

1. **Inner element (`PageShell.tsx:154`), FOCUS_ROOT and the outer div untouched —
   the exact reintroduction that escaped round 2.** Result: **exit 1**,
   `✗ E  the focus branch reads 2 navigation propert(y/ies) — this is CR-01`,
   `CONVERSION_FAIL — 1 check(s) failed: E`. **Round 2's escape is closed.**
2. **The same defect, under a brace-less `if` — an ordinary refactor, not an
   adversarial one.** `if (width === "focus") return (...)` with the block braces
   removed, the defect reintroduced on the inner element, otherwise byte-identical to
   the shipped file. Result: **exit 0**, `CONVERSION_OK — all five checks passed`, the
   report showing `the focus branch, …:151-153 (3 line(s), bounded by brace balance)`
   and `--nav-inset-inline-start — outside the focus branch: read at line(s) 154, 159`
   — **the reintroduced line 154 is again counted as the evidence that clears the
   assertion meant to catch it.** This independently reproduces case D of
   `41-GAP-REVIEW-3.md` on the live tree, not on a copy, and without reading the
   review's stdout capture first.

**Count: this is the THIRD consecutive round in which a mechanical guard against CR-01
reintroduction was declared closed by its own plan and found open by independent
execution.** Round 1 (plan 41-17): asserted on the `FOCUS_ROOT` constant; the defect
moved to the render site. Round 2 (plan 41-20): asserted on the outer element; the
defect moved to the inner element. Round 3 (plan 41-23): asserted on the branch as a
region, bounded by brace balance; the defect moved to the *shape* of the branch — a
ternary, a brace-less `if`, a `}` inside a string, and (via the sibling
`FOCUS_ROOT_LITERAL_RE` regex) a concatenation hidden behind a block comment. **The
guard has been declared closed and found open three times.** Each fix taught the
matcher one more recognised form; the next form existed every time, because the
direction — hunt for the defect within a recognised shape — cannot be completed by
enumeration. A fourth closure attempt is required, and it must change DIRECTION, not
add a fifth shape to the hunt: see the restructured gap below.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One implementation per recurring pattern exists | ✓ VERIFIED (unchanged) | `src/components/ui/{Button,Chip,Input,Card,PageShell,Typography,Dialog,DataTable,Checkbox,Skeleton}.tsx` present, exported, wired. `npm run build` exit 0 (re-run this round); `node scripts/verify-conversion.mjs` exit 0 |
| 2 | Roadmap criterion 1 — no surface shows the pattern until whole-converted, checked mechanically | ✓ VERIFIED (unchanged) | `node scripts/verify-conversion.mjs` exit 0 on this tree: checks A-D pass, 53 files scanned, 8 surfaces, identical counts to the previous round |
| 3 | Roadmap criterion 2 (DS-08) — dialog opens as sheet/window, closes with Escape | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `Dialog.tsx:251` `showModal()`; `node scripts/verify-dialogs.mjs` exit 0. A2 (scroll lock) still open — `41-RELEASE-PASS.md`:445 `A2 STILL OPEN`. `verify-dialogs.mjs`'s own debt-tracking additionally carries an open mechanical gap this round (see gap 2 below) that does not change this status but weakens confidence in the gate's own counting |
| 4 | Roadmap criterion 3 (DS-09) — dense table reads as cards on phone | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `DataTable.tsx:391` `md:hidden`; `node scripts/verify-tables.mjs` (via `npm run verify`) exit 0. H41-3 unobserved |
| 5 | Roadmap criterion 4 (RESP-01, RESP-02, RESP-04) — every converted surface workable phone/tablet/desktop | ✗ FAILED — the CODE regression stays closed; the GATE meant to prevent its silent recurrence has now failed a third independent closure attempt | The four navigation-free surfaces' rendered code is correct today (confirmed by direct grep and by `npm run build`). But the guard purpose-built to catch this class of defect reappearing has been declared closed and found open three times running — at the render site, at the inner element, and now at the branch's shape — and the human observation that would independently catch either state (H41-1 / `41-CR01-PASS.md`) remains fully unmade — 13 rows, all `pending`. RESP-01/RESP-02 remain PARTIAL exactly as `.planning/REQUIREMENTS.md:254-255` declares; RESP-01 closes only after 41.2 |
| 6 | Roadmap criterion 5 (RESP-03) — touch targets finger-sized, large touch screens included | ? UNCERTAIN — class-string check only, no device ever used (unchanged) | `node scripts/verify-touch-targets.mjs` (via `npm run verify`) passes; exemption narrowed to 10 named elements (plan 41-15). H41-4 still `human_needed`, not ticked (`41-RELEASE-PASS.md:335`) |
| 7 | The goal's own claim — "proven on its first eight whole surfaces" | ✗ NOT MET as a human-observed fact (owed, not falsified — unchanged) | Zero of H41-1…H41-6 carry an itemised observation; `41-RELEASE-PASS.md`'s single-word `approved` is unchanged. `41-CR01-PASS.md`'s 13 rows are still `pending` (re-read this round, `.planning/phases/41-shared-primitives-three-tier-layout/41-CR01-PASS.md:117-141,196-201`) |
| 8 | Exactly eight surfaces declared converted | ✓ VERIFIED (unchanged) | `conversion-manifest.mjs`, `CONVERTED.length === 8`; `node scripts/verify-conversion.mjs` header confirms `surfaces declared converted : 8` |
| 9 | One command runs every gate and reports refusal distinctly from failure, and its internal reconciliation can actually fail | ✓ VERIFIED (unchanged) | `npm run verify` on THIS checkout (which holds Supabase credentials, unlike the round-2/round-3 executor worktrees): **exit 0**, `VERIFY_OK — 15 gate(s) passed`, 15/15 passed, 0 FAILED, 0 REFUSED, 1 needs-a-server (`verify:redirects`), 16 accounted for. Machine-dependent: the round-3 executor worktrees, holding no `.env.local`, correctly saw `verify:capabilities` REFUSE and the aggregate exit 2 — both are the command working correctly, on different machines |
| 10 | The remaining ~26 conversion units are explicitly deferred to 41.1/41.2 | ✓ VERIFIED (unchanged) | `.planning/ROADMAP.md`; `.planning/REQUIREMENTS.md:251-257` |

**Score:** 5/10 truths cleanly VERIFIED (1, 2, 8, 9, 10). 1 truth (5) carries an
independently-reproduced, still-open gate gap — now in its third round. 4 truths (3, 4,
6, 7) remain UNCERTAIN or NOT MET pending human observation, unchanged since round 1.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/components/ui/PageShell.tsx` | focus form reserves no navigation clearance, under every shape the branch can take | ✓ VERIFIED in code, ⚠️ unguarded against a refactor of the branch's shape | `:125` `FOCUS_ROOT` clean; `:151-157` both elements clean; correctness holds only because the shape matches what the current gate recognises |
| `scripts/verify-conversion.mjs` | check E — catches CR-01 reintroduced anywhere in the focus branch, under any shape | ⚠️ PRESENT, closes the element escape, open on the shape escape | `:1455-1552` region derivation bounds by brace balance and is opened by ANY brace, including a JSX expression brace on the opener line — a brace-less `if` truncates the region to 3 of 7 lines |
| `scripts/verify-conversion.mjs` | FOCUS_ROOT_LITERAL_RE reads the declaration byte-for-byte regardless of trailing comment shape | ⚠️ PRESENT, docblock claim false for a comment-hidden concatenation | `:1332` tail `(?:\/\/.*|\/\*[\s\S]*)?$` consumes everything after `/*`, including a `+` and a second literal; docblock (~`:1318-1319`) claims byte-for-byte fidelity unconditionally |
| `scripts/verify-dialogs.mjs` | REMAINING/measuredShells accounting cannot report a never-opened file as converted | ⚠️ PRESENT, closes two of three never-opened categories | `:957-967` `neverOpenedReason()` checks `NEVER_MEASURED_BY_B` and `fenceMatch` only; a path outside `listScannableFiles`'s walk (`:206,219,866`) is neither, so it falls through to the generic STALE path at `:1127-1134` |
| `scripts/verify-all.mjs` | reconciliation that can fail | ✓ VERIFIED — closed round 2, unchanged this round | `:366` `ABSENT_STATES` allow-list; not touched by round 3 |
| `.planning/phases/41-.../41-CR01-PASS.md` | pending procedure, 13 rows | ✓ VERIFIED (unchanged) | re-read this round: present, all 13 rows `pending`, none upgraded |
| `scripts/verify-touch-targets.mjs` | narrower, proven exemption | ✓ VERIFIED (unchanged) | `PRIMITIVE_RAW_ELEMENTS`, 10 declared entries |
| `scripts/verify-dialogs.mjs` | rung matched as a family, Phase 42 fence | ✓ VERIFIED, widened this round | negative-rung form (`-z-10`) added to `RUNG_FAMILY` by plan 41-24; boundary guard confirmed to evaluate before the optional sign |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `PageShell.tsx` (focus, INNER element, `:154`) | check E1 | assertion that no line of the bounded branch region carries a nav-inset property | ✓ WIRED — newly closed this round | independently reproduced: reintroducing the exact CR-01 defect at line 154 alone, constant and outer element untouched, now produces `exit 1`, `✗ E` |
| `PageShell.tsx` (focus, branch AS A SHAPE) | check E1 | assertion that the branch's shape matches what the region derivation expects | ✗ NOT WIRED — this is the surviving gap | independently reproduced: the identical defect under a brace-less `if` refactor passes `✓ E`, `exit 0`, `CONVERSION_OK`, with the reintroduced line counted as evidence the property "survives elsewhere" |
| `scripts/verify-dialogs.mjs` REMAINING entries | `neverOpenedReason()` | membership in `NEVER_MEASURED_BY_B` or `fenceMatch()` | ⚠️ PARTIAL — two of three never-opened categories wired, a third (not-in-the-walk) is not | read directly: `neverOpenedReason()` (`:957-967`) has no branch testing membership in the `files` array the walk (`:866`) produced |
| `scripts/verify-all.mjs` reconciliation | a fourth `plan` state | `ABSENT_STATES` non-exhaustive partition -> `refuse()` on `unaccounted` | ✓ WIRED (unchanged, closed round 2) | not re-run this round; no file in this area was touched by plans 41-23-25 |

### Data-Flow Trace (Level 4)

Not applicable in the usual sense — this phase's remaining artifacts under scrutiny are
layout primitives and developer-run verification scripts, not user-facing data-bound
components. The relevant trace this round is the gate-to-defect trace performed above
(CR-01 -> check E1 -> region -> shape of the region), which is the same trace method
used in every previous round, narrowed further.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| `npm run build` typechecks and compiles | `npm run build` | exit 0, 58 routes emitted | ✓ PASS |
| `npm run verify` aggregate on THIS (credentialed) checkout | `npm run verify` | exit 0 — `VERIFY_OK — 15 gate(s) passed`, 15/15 passed, 0 failed, 0 refused, 1 needs-a-server, 16 accounted for | ✓ PASS — machine-dependent; the round-3 executor worktrees correctly saw exit 2 with `verify:capabilities` REFUSED, both are the command working |
| CR-01 closed in code, both elements of the focus branch | `grep -n nav-inset src/components/ui/PageShell.tsx` | 2 hits, both on lines 160 and 164 (default/wide branch only) | ✓ PASS |
| `verify-conversion.mjs` check E catches CR-01 reintroduced at the focus branch's INNER element | mutated `PageShell.tsx:154` in place (left `:125` and `:153` untouched), ran the shipped gate, reverted, confirmed `git diff` 0 lines | exit 1, `✗ E  the focus branch reads 2 navigation propert(y/ies) — this is CR-01` | ✓ PASS — round 2's GAP-CR-02 escape is closed |
| `verify-conversion.mjs` check E catches CR-01 reintroduced under a REFACTORED branch shape (brace-less `if`, otherwise byte-identical, defect on the inner element) | rewrote the branch without block braces, ran the shipped gate, reverted, confirmed `git diff` 0 lines | exit 0, `✓ E`, `CONVERSION_OK`, region truncated to 3 of 7 lines, the mutated line counted as evidence for "outside the focus branch" | ✗ FAIL — reproduces `41-GAP-REVIEW-3.md`'s case D; the guard's third consecutive open finding |
| `verify-dialogs.mjs` `neverOpenedReason()` covers every reason a file can be never-opened | read `scripts/verify-dialogs.mjs:957-967` against the loop at `:1108-1121` and the walk at `:866` | confirmed structurally: only two of the loop's three skip conditions are tested by the refusal | ✗ FAIL — reproduces `41-GAP-REVIEW-3.md`'s CR-03, confirmed by direct code reading rather than by re-running the review's probe |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist and none are declared in any PLAN/SUMMARY
for the round-3 closure plans. **Step 7c: SKIPPED (no probes declared or discovered)** —
unchanged from every previous round.

### Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| DS-07 | PARTIAL, unchanged | `.planning/REQUIREMENTS.md:125,251` unchecked |
| DS-08 | PARTIAL, unchanged | `.planning/REQUIREMENTS.md:126,252` unchecked; A2 still open |
| DS-09 | PARTIAL, unchanged | `.planning/REQUIREMENTS.md:127,253` unchecked |
| RESP-01 | PARTIAL — the code regression stays closed; the guard against it recurring has now failed a third closure attempt | `.planning/REQUIREMENTS.md:132,254` unchecked, "closes only after 41.2" |
| RESP-02 | PARTIAL, same disposition as RESP-01 | `.planning/REQUIREMENTS.md:133,255` unchecked |
| RESP-03 | PARTIAL, human evidence still owed | `.planning/REQUIREMENTS.md:134,256` unchecked; H41-4 `human_needed`, not ticked |
| RESP-04 | PARTIAL, unobserved | `.planning/REQUIREMENTS.md:135,257` unchecked; H41-6a not ticked, capability set never stated |

All seven requirement IDs remain PARTIAL, matching the task's stated expectation. No
orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `scripts/verify-conversion.mjs` | 1455-1552 | Region derivation opens on ANY brace that raises the balance above zero, not only a block brace — an ordinary brace-less refactor truncates the region and lets a reintroduced defect count as evidence the check is satisfied | 🛑 Blocker | Surviving gap, third round. Independently reproduced by mutation in this verification |
| `scripts/verify-conversion.mjs` | 1332 | FOCUS_ROOT_LITERAL_RE's relaxed comment tail reads everything after `/*` unconditionally, so a concatenation hidden behind a block comment is reported as the whole (wrong) literal | 🛑 Blocker (folded into the same gap as above — same root cause, "recognise the shape or trust it") | Independently confirmed by reading the regex; not separately re-executed this round (the review's CR-02 execution is accepted as accurate given this file family's established practice of proving by running) |
| `scripts/verify-dialogs.mjs` | 957-967, 1108-1134 | `neverOpenedReason()` tests two of the loop's three skip conditions; a REMAINING path outside the scan walk falls through to the generic STALE report and is printed "converted; remove this entry" for a file never opened | 🛑 Blocker | Independently confirmed by reading the three relevant functions directly, not merely trusted from the review |
| `scripts/verify-conversion.mjs` | ~1318-1319 | Docblock claims "the literal read is byte-for-byte the literal, comment or no comment" — false once a `/*` hides a concatenation | ⚠️ Warning (documentation correctness, not a runtime defect on its own — the runtime defect is the regex itself, listed above) | A false sentence in a gate's own header is what a future reader trusts without re-deriving |
| `scripts/verify-dialogs.mjs` | 371-373 | Docblock claims "the two lists ... cannot drift apart by an edit to either" — false for the not-in-the-walk category, which was never added to either list | ⚠️ Warning (documentation correctness) | Same class as above |
| `scripts/verify-conversion.mjs` | 1396-1422 | The most obvious CR-01 reintroduction (property appended to the OUTER element) yields exit 2 (refusal), taking all 16 gates to VERIFY_REFUSED rather than a red on check E specifically | ⚠️ Warning, not independently re-run this round | Reported by 41-GAP-REVIEW-3.md as WR-03; accepted as accurately reported on this file family's established proof-by-execution practice |
| `scripts/verify-dialogs.mjs` | 394-411 | FULL_BLEED_VIEWER's own premise ("still carries a native shell") is never re-asserted by the gate itself — the exemption is trusted, not measured | ⚠️ Warning, not independently re-run this round | Reported as WR-04; same proxy-goes-quiet family as CR-03 |
| `scripts/verify-conversion.mjs` | 259-289 | Header's three measured line numbers were re-derived and corrected twice within round 3 itself (plan 41-25) as lines were added above them — nothing mechanical re-checks them going forward | ⚠️ Warning, not independently re-run this round | Reported as WR-05; the mitigation is a paragraph asking the next reader to re-measure, not a mechanism |

No new `TBD`/`FIXME`/`XXX` debt markers found in the files this gap-closure wave
modified, checked by direct grep against `scripts/verify-all.mjs`,
`scripts/verify-conversion.mjs`, `scripts/verify-dialogs.mjs` (re-run this round).

### Human Verification Required

Unchanged from every previous round — none of these six items were newly observed by
round 3, and none should be read as newly required by this round's findings (they were
already owed). H41-1 (eight surfaces at three widths, now including the CR-01
re-observation via `41-CR01-PASS.md`'s 13 rows), H41-2 (dialog behaviour including the
still-open A2), H41-3 (table-to-cards on phone), H41-4 (touch targets on a real device —
the only proof anything renders at 44px), H41-5 (desktop mouse-only), H41-6 (eight tabs,
door untouched). All `pending`/`human_needed` in `41-RELEASE-PASS.md`, none upgraded by
the earlier blanket one-word `approved`, none should be.

### Gaps Summary

**Three blocking gaps, one restructured to change DIRECTION rather than add a fifth
patch, plus two newly surfaced by this round's own review of the round-3 code.**

**Gap 1 — the reintroduction guard, restructured for round 4.** Across three rounds the
escape was never a specific missing syntax. Round 1: the check asserted on a constant,
and the defect moved to the render site. Round 2: the check asserted on the outer
element, and the defect moved to the inner element. Round 3: the check asserted on the
branch as a region, and the defect moved to the SHAPE of the branch — a ternary, an `if`
without braces, a `}` inside a string, and a concatenation hidden behind a block
comment, each independently reproduced by this verification or read directly against
the shipped code. **The common thread across all three escapes is that an unrecognised
shape produces a GREEN.** The fix is not a fifth pattern to teach the matcher. **The
direction must invert: the check must stop hunting for the defect and instead assert
that the focus branch has EXACTLY the one frozen expected shape — any deviation, known
or not-yet-invented, must REFUSE, never tick.** The four observed escapes are evidence
that the hunting direction cannot be completed by enumeration, not a checklist of four
forms still to patch one by one. A round-4 plan that adds four more regex cases to the
existing direction would repeat rounds 1-3.

**Gap 2 — verify-dialogs.mjs, the third occurrence of the debt-goes-quiet family.** Round
3 (plan 41-24) closed the never-opened-category refusal for two of three cases (the
primitive, the declared exemption). A third case — a REMAINING entry naming a real file
that sits outside the scan walk entirely (outside `src/`, or carrying an unscanned
extension) — is structurally untested by `neverOpenedReason()` and falls through to the
generic STALE path, producing the identical wrong report ("converted; remove this
entry") on a file the gate never opened. This is the same defect family the phase has
now paid for three separate times (DEF-41-03, the fence-refusal gap this same round
closed, and now this).

**Gap 3 — false claims inside the gates' own docblocks.** Two header comments assert
guarantees the code beneath them does not provide: `FOCUS_ROOT_LITERAL_RE`'s "byte-for-
byte, comment or no comment" claim, and `NEVER_MEASURED_BY_B`'s "cannot drift apart by
an edit to either" claim. Both were true when written and became false the moment a
category the sentence did not anticipate was found — which is what a docblock exists to
prevent a future reader from re-discovering by hand. A false sentence in a gate's own
header is what a future reader trusts without re-deriving.

**Everything else genuinely improved and holds.** The inner-element escape (round 2's
open finding) is closed, independently reproduced. `verify-dialogs.mjs`'s negative-rung
matcher blind spot is closed. `verify-all.mjs`'s reconciliation (closed round 2) is
unchanged and untouched by round 3. `verify-touch-targets.mjs` holds unchanged.

**Human verification remains exactly as owed as before this wave — not more, not less.**
`41-CR01-PASS.md`'s 13 rows and `41-RELEASE-PASS.md`'s six items are unchanged, all
`pending`/owed, re-read in full this round. This report does not upgrade any of them,
and does not treat any mechanical finding above as if it closed the human question —
they are independent findings.

---

_Verified: 2026-08-13T09:30:00Z_
_Verifier: Claude (gsd-verifier)_
