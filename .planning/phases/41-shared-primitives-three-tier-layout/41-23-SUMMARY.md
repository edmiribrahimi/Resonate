---
phase: 41-shared-primitives-three-tier-layout
plan: 23
subsystem: verification-gates
tags: [gap-closure, round-3, gap-cr-02, check-e, page-shell, focus-branch, region, mutation-matrix, resp-01, resp-02]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 17
    provides: "scripts/verify-conversion.mjs — check E, FOCUS_ROOT_IDENTIFIER, E1's read of the constant's declaration (round 1: asserted the CONSTANT)"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 20
    provides: "scripts/verify-conversion.mjs — FOCUS_BRANCH_RE, the hoisted check-E refusals, refuse() exiting 1 over a failure (round 2: asserted the OUTER element)"
provides:
  - "scripts/verify-conversion.mjs — FOCUS_BRANCH_OPEN_RE and focusBranchRegion: the width === \"focus\" branch bounded by brace balance from its opener to its balanced close"
  - "scripts/verify-conversion.mjs — propertiesInFocusBranch: no line of that region may read either navigation property, with the offending line printed verbatim"
  - "scripts/verify-conversion.mjs — the region excluded from propertyReadsElsewhere, so a clearance added inside the branch can never be counted as the clearance surviving 'elsewhere'"
  - "scripts/verify-conversion.mjs — three region refusals (no opener / two openers / an opener that opens no block / an unbalanced file / className={FOCUS_ROOT} outside the region), all raised before any tick"
  - "scripts/verify-conversion.mjs — the report prints the region's bounds, its line count, its opener and its close verbatim, so a silently truncated region is visible in the gate's own output"
affects:
  - "41.1 and 41.2 — any new element added inside the focus branch is now read by check E. A legitimate widening (the nav prop D-41-04 did not write, a ternary, an extracted component) REFUSES with the instruction to widen in the same commit"
  - "the verifier of this phase — the reproduction recorded in 41-VERIFICATION.md now exits 1 with ✗ E instead of 0 with ✓ E"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Asserting on a POINT while the defect lives in a REGION fails the same way every time: each fix aims at the place the defect was last seen, and the next reintroduction lands one element deeper"
    - "A defect that SATISFIES the assertion meant to catch it is the worst shape: the region must be excluded from the evidence that accepts it, or the fix is half a fix"
    - "Bound a region by brace balance, never by a bare-closing-brace match — a bare brace can appear inside the region, and a region shorter than the construct is the same defect again"
    - "An opener that opens no block is a refusal, not a one-line region: a ternary would otherwise derive a region that asserts almost nothing, silently"
    - "'Prove by mutation' is not an acceptance criterion — it was satisfied twice while the guard stayed open. One variant per line of the region, enumerated, with the count recorded, is"
    - "A silently truncated region must be visible in the gate's own output: print the bounds, the count, the first line and the last line verbatim"

key-files:
  created:
    - .planning/phases/41-shared-primitives-three-tier-layout/41-23-SUMMARY.md
  modified:
    - scripts/verify-conversion.mjs

key-decisions:
  - "The region is anchored on the branch OPENER, not on the className={FOCUS_ROOT} render site. That also closes the third item under 41-VERIFICATION.md's `missing:`: FOCUS_BRANCH_RE required exactly one occurrence ANYWHERE in the file and never that it sat inside the branch, so FOCUS_ROOT rendered on the default branch with the focus branch carrying an arbitrary class string satisfied it. Exercised as refusal R3 — it now refuses."
  - "The region's end is computed by brace balance. The bare-closing-brace regex sketched as option (a) in 41-GAP-REVIEW-2.md was deliberately NOT used, and the reasoning is written into the docblock rather than left to memory: a bare brace can appear inside the branch, the region would terminate early, and a region shorter than the branch is this round's defect for the third time."
  - "An opener that opens no block REFUSES rather than deriving a one-line region. Not in the plan; added because the ternary the refusal text names would otherwise be read as a valid one-line region and assert almost nothing while printing a tick — a gate that cannot fail is the failure mode this whole round exists to remove (ai-engineering.md, 'un gate deve poter fallire')."
  - "MIN_HEIGHT_RE and CENTRING_RE were NOT touched and are NOT subsumed by this region fix. The region bounds WHERE the two properties may not appear; it says nothing about what the constant's height and centring utilities actually produce. That weakness (41-GAP-REVIEW.md CR-02) stays open, and the statement is written into the script beside them so the next reader cannot close it by assumption."
  - "propertiesInFocusRoot — the assertion on the constant — was kept. The constant is declared outside the branch (line 125 against a region of 151-157), so the region does not cover it. Removing it as 'redundant' would reopen round 1."

requirements-completed: []

# Metrics
duration: ~40min
completed: 2026-08-13
tasks: 2
---

# Phase 41 Plan 23: the region, not the point — round 3 of one guard

**Two rounds closed CR-01 by asserting on the place the defect had last been
seen. Round 1 asserted on the `FOCUS_ROOT` constant and the defect moved to the
render site. Round 2 asserted on the outer element and the defect moved to the
inner element.** Both times the reintroduced line was then counted *toward*
assertion 3 — "the shell still reads both properties elsewhere" — so the defect
fed the check meant to catch it.

The diagnosis is not carelessness. **Asserting on a point while the defect lives
in a region fails the same way every time.** This round bounds the whole
`width === "focus"` branch as a region, asserts over every line of it, and
excludes those lines from the evidence that previously accepted them.

## The gap, reproduced on the shipped gate before anything was changed

The verifier's exact reintroduction — the two navigation-inset utilities
appended to the inner container's class string, `FOCUS_ROOT` and the outer
element left byte-identical:

```
exit=0
  --nav-inset-inline-start   — outside the focus root: read at line(s) 154, 160
  --nav-inset-block-end      — outside the focus root: read at line(s) 154, 164
  ✓ E  the focus root reserves neither navigation property while …
  CONVERSION_OK — all five checks passed over 8 declared surface(s), 53 file(s) scanned.
```

Line **154 is the defect's own line**, listed as evidence that the property
survives elsewhere. That is the shape this round removes, and it is why the
exclusion is half the fix rather than a tidy-up.

## What check E1 now does

| | Before | After |
|---|---|---|
| What is bounded | the constant (round 1), then one className (round 2) | the branch, lines `151-157`, by brace balance from its opener |
| Where the occurrence must sit | anywhere in the file | inside the derived region, or refuse |
| What "elsewhere" may count | any line but the constant's | any line but the constant's **and** but the region's |
| What the report says | "outside the focus root" | "outside the focus **branch**", plus the bounds, the count, the opener and the close verbatim |

The derivation and its three refusals sit in the hoisted read, so every one of
them precedes every tick — plan 41-20's invariant, asserted by line number:

```
new refuse() call sites : 1388, 1422, 1435
first failures.push()   : 1632
```

## The mutation matrix

**The region is 7 lines. All 7 were mutated, one variant each, and all 7
reddened the gate.** Plus the inserted-third-element case, plus the three
refusal exercises: **11 rows.**

Every row followed the same protocol without exception — assert the mutated text
present by grep *before* reading any result (41-20 recorded a `perl`
substitution that silently did not apply), run the gate, capture the exit code
and stdout, restore, assert absent, assert `git diff` on the file is 0 lines.

| # | Class | Region line (verbatim) | Variant | Exit | Verdict | Restore |
|---|---|---|---|---|---|---|
| A1 | A | `151`…`153`: `<div className={FOCUS_ROOT}>` | the pair appended to the outer element's class string | **2** | `FATAL: … renders FOCUS_ROOT as the whole of exactly one className` | diff 0 |
| A2 | A | `154`: `<div className={` + backtick + `w-full max-w-sm ${className}` + backtick + `.trimEnd()}>{children}</div>` | the pair appended to the inner element's class string — **the verifier's exact reintroduction** | **1** | `✗ E  the focus branch reads 2 navigation propert(y/ies) — this is CR-01` | diff 0 |
| A-new | A | (a line that exists in no round) | a **third element** added inside the branch, carrying the pair on its own className | **1** | `✗ E  the focus branch reads 2 navigation propert(y/ies)` | diff 0 |
| B1 | B | `151`: `if (width === "focus") {` | element inserted immediately after | **1** | `✗ E  … reads 2 navigation propert(y/ies)` | diff 0 |
| B2 | B | `152`: `return (` | element inserted immediately after | **1** | `✗ E  … reads 2 navigation propert(y/ies)` | diff 0 |
| B3 | B | `155`: `</div>` | element inserted immediately after | **1** | `✗ E  … reads 2 navigation propert(y/ies)` | diff 0 |
| B4 | B | `156`: `);` | element inserted immediately after | **1** | `✗ E  … reads 2 navigation propert(y/ies)` | diff 0 |
| B5 | B | `157`: `}` | element inserted immediately **before** (the region's last line) | **1** | `✗ E  … reads 2 navigation propert(y/ies)` | diff 0 |
| R1 | refusal | `151`, its compared literal renamed | no opener found | **2** | `FATAL: … opens the focus branch 0 time(s) — found nowhere in the file.` | diff 0, opener count back to 1 |
| R2 | refusal | `151`, duplicated | two openers found | **2** | `FATAL: … opens the focus branch 2 time(s) — found at line(s) 151, 152.` | diff 0, opener count back to 1 |
| R3 | refusal | `153` neutralised, `FOCUS_ROOT` rendered on the default branch | the single occurrence sits outside the region | **2** | `FATAL: …:160 renders FOCUS_ROOT as the whole of a className, but that line falls OUTSIDE the focus branch` | diff 0 |

For **every** row: exit non-zero, stdout contained **no** `✓ E` and **no**
`CONVERSION_OK` (both counted mechanically per run, both `0`).

Line coverage of the region, stated so it can be checked rather than trusted:
`151` → B1, `152` → B2, `153` → A1, `154` → A2, `155` → B3, `156` → B4,
`157` → B5. **7 of 7.**

The inserted element is deliberately braceless, so a class-B variant cannot
disturb the brace balance the region derivation uses — otherwise the variant
would have proved something other than what it claims.

### One helper defect, recorded rather than smoothed over

For R2 the restore assertion in the throwaway mutation helper compared against
the *first* line of the duplicated pair, which of course still exists after a
correct restore, so it reported `STILL PRESENT`. That is a defect of the helper,
not a failed restore: it was settled by the two measurements that actually
answer the question — `git diff -- src/components/ui/PageShell.tsx` at 0 lines
and the opener count back to exactly 1. Written down because the opposite
mistake — a helper that reports a clean restore that did not happen — is how a
mutated product file ships.

## The negative control

With everything restored: `node scripts/verify-conversion.mjs` exits **0**, five
ticks, and the evidence lines are back to the default/wide branch's two only.

```
      the focus branch, src/components/ui/PageShell.tsx:151-157   (7 line(s), bounded by brace balance)
          opener  151 : if (width === "focus") {
          close   157 : }
          FOCUS_ROOT rendered at line 153
          navigation propert(y/ies) found inside the region: 0
          --nav-inset-inline-start   — outside the focus branch: read at line(s) 160
          --nav-inset-block-end      — outside the focus branch: read at line(s) 164
  ✓ E  no line of the focus branch (7, at src/components/ui/PageShell.tsx:151-157) …
  CONVERSION_OK — all five checks passed over 8 declared surface(s), 53 file(s) scanned.
```

`git status --porcelain -- src/` is empty, and `git diff` on `PageShell.tsx` is
0 lines. The file renders `(auth)`'s login, register and set-password and
`/payment/callback`; every mutation of it was transient and every restore was
asserted, not assumed.

## Verification

| Proof | Result |
|---|---|
| `node scripts/verify-conversion.mjs` (live repository, restored tree) | exit **0**, five ticks |
| `npm run build` | exit **0** — run once with everything restored, and **again after this SUMMARY was written** (DEF-41-01: Tailwind scans `.planning/`) |
| `git status --porcelain -- src/` | **0** lines |
| `git diff -- src/components/ui/PageShell.tsx` | **0** lines |
| Mutation matrix | 11 rows, every one non-zero, 7 of 7 region lines |
| `npm run verify` | exit **2** — `VERIFY_REFUSED — 1 gate(s) could not measure: verify:capabilities`; `verify:conversion 0 passed`; `verify:redirects — not run: needs a running dev server` |

**On that aggregate 2.** This worktree holds no `.env.local`, so
`verify:capabilities` refuses for missing `SUPABASE_ACCESS_TOKEN` and
`NEXT_PUBLIC_SUPABASE_URL` and measures nothing about the capability model. That
is a property of the environment, identical before and after this change, and it
is **not a pass and not a failure of this work**. Reported as the aggregate
itself insists: a refusal is not a pass.

**There is no test runner for this product** (Guardrail 1). Nothing here is
verified because tests pass. The proofs above are exit codes, exact stdout
strings and source assertions — nothing else.

## What this does NOT close

**A gate that can finally fail is not a surface anyone has seen.** This round
changed a script's reading of a class string; it rendered nothing and measured
no pixel. Specifically:

- **RESP-01 and RESP-02 stay PARTIAL.** No requirement is ticked by this plan.
  DS-07, DS-08, DS-09, RESP-03 and RESP-04 also remain PARTIAL.
- **H41-1 … H41-6 remain unobserved.** H41-4 stays `human_needed`.
- **`41-CR01-PASS.md`'s thirteen rows stay `pending`**, on four screens nobody
  has opened. The four focus routes are the product's front door and its
  payment-outcome screen; the only thing that will say they are workable is a
  person looking at them.
- **`MIN_HEIGHT_RE` / `CENTRING_RE` stay open.** Assertion 2 is still satisfied
  by forms that do not produce what it defends (41-GAP-REVIEW.md CR-02). Not
  subsumed by the region, not silently widened, not silently closed.

## Self-Check: PASSED

- `scripts/verify-conversion.mjs` — FOUND, contains `FOCUS_BRANCH_OPEN_RE` and
  `focusBranchRegion`
- `.planning/phases/41-shared-primitives-three-tier-layout/41-23-SUMMARY.md` —
  FOUND
- Task 1 commit — FOUND in `git log`
- `src/components/ui/PageShell.tsx` — unmodified, `git diff` 0 lines
