---
phase: 41-shared-primitives-three-tier-layout
plan: 13
subsystem: layout-primitives
tags: [gap-closure, cr-01, page-shell, focus-width, nav-clearance, resp-01, resp-02, access-gating, ticketing-payments]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 01
    provides: "--nav-inset-inline-start and --nav-inset-block-end in globals.css — the two properties the focus form stops reading and the other two forms keep reading"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 05
    provides: "src/components/ui/PageShell.tsx itself, its three width forms, and the docblock this plan reverses one clause of"
provides:
  - "src/components/ui/PageShell.tsx — FOCUS_ROOT, the focus form's root as a single declared literal reading neither navigation property"
  - ".planning/phases/41-.../41-CR01-PASS.md — thirteen pending rows: four focus routes at 390/768/1440, plus /register scrolled at 390"
affects:
  - "41-17 — its check E reads the FOCUS_ROOT literal and fails if it declares either navigation property. Until that plan lands this fix has no gate behind it"
  - "41.1 and 41.2 — the first navigation-free surface declared at default or wide width turns 41-17's check E red, and the nav prop gets written then with its first consumer"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A width form that reserves clearance for navigation its surfaces do not mount is a defect no maximum-width matcher can see"
    - "A primitive capability with zero consumers is not written; the case is made a red gate instead, so the prop arrives with its first consumer"
    - "A presentational fix on an access-gating or ticketing-payments surface proves itself with a changed-file list, which is stronger than a token grep because the changed-line count on those pages is zero"

key-files:
  created:
    - .planning/phases/41-shared-primitives-three-tier-layout/41-CR01-PASS.md
  modified:
    - src/components/ui/PageShell.tsx

key-decisions:
  - "No nav prop. 41-REVIEW.md offered one; this plan took the other fix. No converted surface today is navigation-free at default or wide width, so the prop would have shipped with zero consumers — the exact defect this phase exists to prevent (Skeleton.tsx, correct and unimported, beside 102 hand-rolled copies). Plan 41-17 turns the case into a red gate instead of a silent one."
  - "FOCUS_ROOT carries exactly one padding utility, so nothing in it depends on Tailwind's emission order — the trap WR-05 recorded in this same phase, where a primitive's padding was argued about instead of measured."
  - "The docblock records the reversal with its measurement rather than editing quietly. A decision undone without its reason reads as a slip to the next person, and the 112px sentence that was already in the file is kept as the record of what went wrong."
  - "The two removed insets are named by their custom-property names and never spelled as the utilities that read them (DEF-41-01). The same rule is applied to 41-CR01-PASS.md, where the focus container is written as 384px rather than by its utility name — .planning/ is scanned by Tailwind too."

requirements-completed: []

# Metrics
duration: ~40min
completed: 2026-08-12
tasks: 2
---

# Phase 41 Plan 13: CR-01 Gap Closure Summary

**CR-01 is closed in code, no gate guards it until plan 41-17 lands, and nobody has yet
looked at the four screens** — the observation this fix created is written down as owed in
`41-CR01-PASS.md`, with all thirteen rows `pending`.

`PageShell`'s `focus` form stopped reserving a navigation column and a navigation bar that
none of §4's four focus routes mounts; the `default` and `wide` forms reserve both,
unchanged.

## What was built

### Task 1 — `FOCUS_ROOT` (commit `207b541`)

The exact value, on one line:

```
const FOCUS_ROOT = "flex min-h-dvh items-center justify-center p-6";
```

It reads **neither** `--nav-inset-inline-start` **nor** `--nav-inset-block-end`, and it
carries exactly one padding utility.

**The count that proves the clearance left one form and not the primitive:**

| | `grep -c 'var(--nav-inset' src/components/ui/PageShell.tsx` |
|---|---|
| before | **3** — focus outer (two reads), default/wide outer, default/wide inner |
| after | **2** — default/wide outer, default/wide inner |

Not 0 (the clearance did not leave the primitive) and not 3 (it did not stay in the focus
form). `grep -c 'justify-center'` returns **1**, and it is the `FOCUS_ROOT` line.

The docblock was rewritten in three places, as a reversal with its reason: item 3 of "What
it owns" now states the clearance is owned for the surfaces that mount the navigation and
that §4's focus list is closed at four routes, none of which does; the "Why the padding is
on the outer element" section keeps the 112px sentence as the record of what went wrong and
says the focus form escapes it by reserving nothing; and a new section carries the
measurement — 248px leading against 24px trailing at and above 768px putting the card 112px
right of centre, ~96px of bottom padding below 768px under a card with no bar — and states
that this restores the centring `/login` and `/payment/callback` had before this phase.

### Task 2 — `41-CR01-PASS.md` (commit `2c64584`)

Thirteen rows, thirteen `pending`: four routes × three widths (390, 768, 1440), plus
`/register` at 390px scrolled to its last field — the one row the fix's bottom-padding
change could have moved, asked separately so a `pending` cannot hide it.

Expectations are numbers: card centre within **4px** of the viewport centre at 768 and
1440 (measured as a left/right gap difference of no more than 8px, since half the gap
difference is the centre offset); space above and below the card equal within **4px** at
390; no navigation on any of the four; no horizontal scroll at any width.

The document states what it refuses to do: it does not tick RESP-01, RESP-02 or RESP-03,
and it does not replace H41-1, which is still owed in full for all eight converted
surfaces. It records why no agent produced the observations — no worktree in this phase
holds `.env.local`, and supplying credentials would point a running application at
production — and names the role that can: the owner, on their own machine.

## The proof that the fix is presentational

`git diff --name-only` after task 1, verbatim:

```
src/components/ui/PageShell.tsx
```

One path under `src/`. **Zero paths under `src/app/(auth)/`, zero under
`src/app/(public)/payment/`, zero under `src/app/(admin)/`.** The changed-line count on the
four consuming pages is zero, so no decision logic on an `access-gating` or a
`ticketing-payments` surface moved — nothing about what those pages decide, submit, where
they land a user, or what they say on failure. This is T-41-45's mitigation, and it is a
stronger statement than a token grep.

Two facts were read rather than trusted: `find src/app -name layout.tsx` returns exactly
two files — the root layout and `(work)`'s — and neither covers `(auth)` or
`(public)/payment`; and no file under either directory imports `AppNav`, `MobileNav` or
`StaffNav`.

## Verification

**There is no test runner for the product.** No `test` script, no `*.test.*`, no
`*.spec.*`. Nothing below is a claim that tests pass.

| Check | Result |
|---|---|
| `npm run build` (Next's typecheck gate) | **exit 0** — compiled in 7.1s, TypeScript ran, 40 static pages, 58 routes |
| `node scripts/verify-conversion.mjs` | exit 0 |
| `node scripts/verify-breakpoints.mjs` | exit 0 |
| `node scripts/verify-tokens.mjs` | exit 0 |
| `node scripts/verify-touch-targets.mjs` | exit 0 |
| `node scripts/verify-dialogs.mjs` | exit 0 |
| `node scripts/verify-tables.mjs` | exit 0 |
| `grep -c 'p-6' .next/static/css/*.css` | **1** — the class is emitted |

**`npm run verify` — aggregate exit code 2, on a worktree holding no `.env.local`.**
15 gates ran, **14 passed, 0 FAILED, 1 REFUSED**; 1 not run (`verify:redirects`, which
needs a running dev server); 16 declared, 16 accounted for, 0 MISSING. Verdict line,
verbatim:

```
VERIFY_REFUSED — 1 gate(s) could not measure: verify:capabilities
```

The refusing gate is `verify:capabilities`, with its own stderr: *"FATAL: missing
environment variable(s): SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL … Nothing was
measured."* **A refusal is not a failure and is not a pass**, and the exit 2 is the command
working on a machine without credentials, not something this plan broke. The comparison
that matters: the identical run was taken **before** any edit, and produced the same
aggregate — exit 2, 14 passed, 1 REFUSED, 1 not run. A third run after task 2 produced it
again.

**The `p-6` emission check is an emission check, not a provenance check.** DEF-41-01 means
the built stylesheet also carries rules compiled out of `.planning/` documents, so it can
never be evidence that product code uses a class. The provenance evidence is the source
assertion on the `FOCUS_ROOT` line.

The build was re-run **after** adding `41-CR01-PASS.md`, for the same reason: Tailwind
scans `.planning/`, so a planning document can emit a malformed rule. It exited 0.

## Deviations from Plan

None — the plan executed exactly as written. No auto-fixes were needed, no authentication
gate was hit, and no package was installed (T-41-SC: zero `package.json` changes).

## What this does not close

RESP-01 and RESP-02 stay **PARTIAL** — RESP-01 closes only after phase 41.2 — and DS-07,
DS-08, DS-09 and RESP-03…RESP-04 are untouched by this plan. It removed a confirmed failure
from four of the eight surfaces this phase declares; it did not turn a partial requirement
whole, and it produced **no human observation** — it produced a written procedure for one.

**T-41-47, stated as an open exposure rather than a closed one:** a later edit could put
the insets back into the focus form and every one of the sixteen gates would stay green.
Plan 41-17's check E is the fence, and it has not landed. Until it does, this fix is held
by a docblock and this SUMMARY.

## Known Stubs

None. No hardcoded empty value, no placeholder text and no unwired component was
introduced — the change removes two class fragments and adds one named constant.

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change at a trust
boundary was introduced. T-41-46 is recorded as thin rather than invented: a padding
utility cannot widen a query, a policy or a capability check, and no data path, no RLS
surface and no `capability-routes.ts` entry was touched.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 | `207b541` | `fix(41-13)` — the focus form stops reserving a column and a bar that are not there |
| 2 | `2c64584` | `docs(41-13)` — the observation the fix created, written before anyone looks |

## Self-Check: PASSED

- `src/components/ui/PageShell.tsx` — FOUND
- `.planning/phases/41-shared-primitives-three-tier-layout/41-CR01-PASS.md` — FOUND
- commit `207b541` — FOUND
- commit `2c64584` — FOUND
</content>
