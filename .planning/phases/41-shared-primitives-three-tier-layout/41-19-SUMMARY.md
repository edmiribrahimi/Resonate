---
phase: 41-shared-primitives-three-tier-layout
plan: 19
subsystem: layout-primitives
tags: [gap-closure, wr-07, page-shell, focus-width, docblock, cr-01, resp-01, resp-02, access-gating, ticketing-payments]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 05
    provides: "src/components/ui/PageShell.tsx and the census paragraph this plan corrects one clause of"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 13
    provides: "the CR-01 reversal whose written measurement this paragraph is; the false clause was carried in unchanged from 41-05"
provides:
  - "src/components/ui/PageShell.tsx — a census paragraph whose stated measurement is true of this tree, verified at both layout files rather than adopted from the review"
affects:
  - "41-20 — the render-site assertion that turns this paragraph's conclusion into a mechanical gate. Until it lands, this docblock is documentation and nothing else"
  - "anyone adding a mount to src/app/layout.tsx — the corrected paragraph now tells them the root layout reaches all four focus surfaces, which the previous wording denied"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A docblock that holds a defect closed in place of a gate must be re-read at the source, because it inherits no verification from the code it describes"
    - "When a conclusion is right and its stated reason is wrong, correct the reason and record the correction — the same house rule the paragraph itself applies to CR-01"
    - "A comment-only change on an access-gating or ticketing-payments surface proves itself with a changed-line partition, not with an assurance"

key-files:
  created:
    - .planning/phases/41-shared-primitives-three-tier-layout/41-19-SUMMARY.md
  modified:
    - src/components/ui/PageShell.tsx

key-decisions:
  - "The corrected text says the root layout mounts MotionProvider and ToastProvider 'and nothing that is a navigation' rather than the review's suggested 'mounts only the motion and toast providers'. The suggested wording would have replaced one slightly false fact with another: src/app/layout.tsx also renders a SumUp Script tag and an apple-touch-icon link. Naming what is absent is the claim the census actually needs, and it is true."
  - "The clause 'only two route layouts exist in the tree' was checked before being kept, not assumed correct because only half the sentence was reported wrong. `find src/app -name layout.tsx` returns exactly two files, so that half stands and is retained."
  - "A forward-looking line was added telling the next reader that the root layout is the one reaching these four surfaces. WR-07's stated harm was a future author concluding the paragraph did not apply to them; correcting the fact without addressing that reading would have closed the finding and left its consequence."
  - "The correction is recorded in the docblock as a correction, with the false claim named. Editing it away silently would have violated the same rule the paragraph three sections below states about CR-01 — a decision undone without its measurement reads as a slip to the next person."
  - "The two navigation custom properties are cited by name and line, never spelled as the utilities that read them, in the source AND in this summary (DEF-41-01). Tailwind scans .planning/, and a later gate counting leftover manual clearance would count this file."

requirements-completed: []

# Metrics
duration: ~25min
tasks: 2
completed: 2026-08-12
---

# Phase 41 Plan 19: WR-07 Gap Closure Summary

`PageShell`'s census paragraph claimed the root layout does not cover `(auth)` or
`(public)/payment`. It covers both. The conclusion it supported — the four focus routes
mount no navigation, so the focus form reserves nothing — is true, for the reason the
paragraph now states: **the root layout wraps every route and mounts no navigation.**

**This paragraph is documentation, not a gate.** Nothing in the build, the verify suite or
any check reads it. It cannot fail, it cannot go red, and a future edit that contradicts it
will ship. It matters only because check E1 does not assert the focus branch's render site
(CR-02), which leaves this prose as the one place in the repository recording why the focus
form is written the way it is — until plan **41-20** supplies the mechanical assertion.

## What was corrected

`src/components/ui/PageShell.tsx`, one paragraph inside the block comment.

| | before | after |
|---|---|---|
| stated measurement | two route layouts exist and *neither covers* `(auth)` or `(public)/payment` | two route layouts exist; the root one wraps **every** route including these four, and mounts no navigation |
| truth of the measurement | **false** — the App Router's root layout wraps route groups | true, verified at both files |
| conclusion | focus form reserves nothing | unchanged |
| what a future author reads | "the root layout does not reach these routes, so my new nav there is fine" | "the root layout is the one that reaches all four" |

## The two facts, re-read at the source

Both were re-opened rather than taken from `41-GAP-REVIEW.md`. A derived citation nobody
re-verified is the defect this whole round exists to correct, and WR-07 is itself an
instance of it.

| fact | source | evidence |
|---|---|---|
| the root layout mounts the two providers and no navigation | `src/app/layout.tsx:119-123` | `<MotionProvider>` wrapping `<ToastProvider>` wrapping `{children}`; imports at `:4-5` |
| it also mounts things that are not navigation | `src/app/layout.tsx:124-127`, `:116` | a SumUp `Script`, an apple-touch-icon `link` — the reason the text says "nothing that is a navigation" rather than "only the two providers" |
| `(work)`'s layout mounts `AppNav` | `src/app/(admin)/admin/(work)/layout.tsx:121` | and covers only pages under `admin/(work)/` |
| exactly two layouts exist | `find src/app -name layout.tsx` | returns `src/app/layout.tsx` and `src/app/(admin)/admin/(work)/layout.tsx`, nothing else |
| what counts as a navigation | `scripts/verify-conversion.mjs:720-723` | `NAV_MODULES` — `AppNav.tsx`, `MobileNav.tsx` |
| neither focus tree mounts one itself | `grep -rn "AppNav\|MobileNav" src/app/(auth)/ src/app/(public)/payment/` | no match |

## The four pieces of evidence — comment-only change

`(auth)` is `access-gating` primary and `/payment/callback` is `ticketing-payments`
primary, so "presentational" is a claim to be demonstrated, not asserted. Gathered on the
working tree before the commit, which is the only state in which the plan's commands read
what they were written to read.

### 1 — exactly one file changed

```
$ git diff --name-only
src/components/ui/PageShell.tsx

$ git status --porcelain
 M src/components/ui/PageShell.tsx
```

No file under `src/app/(auth)/`, `src/app/(public)/payment/` or `supabase/` appears.

### 2 — no changed line outside the block comment

```
$ git diff -U0 -- src/components/ui/PageShell.tsx | grep -E '^[+-]' | grep -v '^[+-][+-]' | grep -vcE '^[+-]\s*(\*|/\*|\*/)'
0
```

Read rather than inferred from the count: the diff is a **single hunk at `@@ -25,5 +25,22 @@`**,
5 lines removed and 22 added, and every one of the 27 begins with ` *`. No executable line
is added, removed or edited.

### 3 — the three load-bearing lines are identical to HEAD

```
$ git show HEAD:src/components/ui/PageShell.tsx | grep -n 'const FOCUS_ROOT'
108:const FOCUS_ROOT = "flex min-h-dvh items-center justify-center p-6";

$ grep -n 'const FOCUS_ROOT' src/components/ui/PageShell.tsx
125:const FOCUS_ROOT = "flex min-h-dvh items-center justify-center p-6";
```

```
$ git show HEAD:src/components/ui/PageShell.tsx | grep -n 'className={FOCUS_ROOT}\|var(--nav-inset'
136:      <div className={FOCUS_ROOT}>
143:    <div className="min-h-dvh …--nav-inset-inline-start…">
147:        } … --nav-inset-block-end … ${className}`.trimEnd()}

$ grep -n 'className={FOCUS_ROOT}\|var(--nav-inset' src/components/ui/PageShell.tsx
153:      <div className={FOCUS_ROOT}>
160:    <div className="min-h-dvh …--nav-inset-inline-start…">
164:        } … --nav-inset-block-end … ${className}`.trimEnd()}
```

The three line **contents** are identical; only their line numbers move, by the 17 lines
the comment grew. The focus render site still reads neither navigation property — CR-01
stays fixed.

> The two navigation reads are **elided above and named by their custom properties**, not
> reproduced as the utilities that read them. DEF-41-01: Tailwind scans `.planning/` and
> cannot tell a quotation from a use, and a later gate counting leftover manual clearance
> would count this summary. Same rule `41-13-SUMMARY.md` applied when it wrote the focus
> container's cap as a pixel value. The unelided text was compared in full at execution
> time; what is elided here is the spelling, not the comparison.

### 4 — `npm run build` exits 0

```
$ npm run build
BUILD_EXIT=0
```

All four focus routes present in the route table: `○ /login`, `○ /payment/callback`,
`○ /register`, `ƒ /set-password`.

**Warnings: two, both pre-existing, neither from this edit — cause confirmed at source
rather than assumed.**

| warning | cause | verified |
|---|---|---|
| Next.js inferred your workspace root | two lockfiles in the ancestry | `package-lock.json` exists both in the worktree and at `/Users/etiesse/Resonate/` |
| the "middleware" file convention is deprecated | the file convention itself | `src/middleware.ts` exists |

**No malformed-CSS or Tailwind warning appeared** — the specific failure DEF-41-01 records,
where a utility described with an ellipsis inside parens emitted a broken rule. Checked in
the log, not assumed from a green exit.

**The build was run a second time with this summary on disk**, because T-41-P4 is about
Tailwind compiling prose and `.planning/` is prose Tailwind compiles — a build that only
ever saw the source would not have tested the file you are reading. `BUILD_EXIT=0`, and the
warning set did not grow. Independently: `grep -cE` for bracketed utility literals in this
summary returns **0**.

## Supplementary gate run

```
$ npm run verify
VERIFY_EXIT=2
```

14 of 15 gates passed, including **`verify:conversion`** — the one that reads the
`FOCUS_ROOT` literal. `verify:capabilities` REFUSED (exit 2) on missing
`SUPABASE_ACCESS_TOKEN` / `NEXT_PUBLIC_SUPABASE_URL`: there is no `.env.local` in this
worktree, so nothing was measured by that gate. `verify:redirects` was not run — it needs a
running dev server. **Exit 2 is the documented correct behaviour in this environment, not a
failure**, and it is the same shape of refusal the phase has recorded throughout.

## Cross-domain impact

- **`access-gating`** — `/login`, `/register`, `/set-password` render inside this
  component. Nothing about who reaches them or what a `pending` user sees is expressible
  here: the component returns two nested `div`s and branches only on its `width` prop.
  Reachability lives in `src/lib/routes/capability-routes.ts`, the middleware and the RLS
  policies; none is touched, and no file under `src/app/(auth)/` or `supabase/` is in the
  diff.
- **`ticketing-payments`** — `/payment/callback` likewise. No payment path, no webhook, no
  idempotency surface is reachable from a block comment.
- **`venue-secrecy`** — untouched. This component renders no event data.
- **Public repo** — the corrected text names route paths, component names and file paths
  already public here. No member data, no venue, no unannounced date, no line-up. Roles are
  not named because none appear.

## Deviations from Plan

### Auto-fixed issues

**None.** No bug, no missing critical functionality and no blocker was encountered.

### Two departures from the wording the review supplied

Both are refusals to adopt a suggested patch verbatim — which is the failure mode CR-01 was
recorded for in this same round.

**1. `41-GAP-REVIEW.md` WR-07's suggested text says the root layout "mounts only the motion
and toast providers".** It does not: it also renders a SumUp `Script` (`:124-127`) and an
apple-touch-icon `link` (`:116`). Adopting it would have swapped one false fact for a
smaller one inside a paragraph whose entire purpose is to be true. The shipped text says it
mounts `MotionProvider` and `ToastProvider` "and nothing that is a navigation" — which is
the claim the census needs and is verifiable against `NAV_MODULES`.

**2. The plan did not ask for the forward-looking line, and it was added.** WR-07's stated
harm is a future author reading the paragraph and believing it does not apply to them. A
correction that fixed only the fact would have closed the finding and left the harm one
inference away. Two sentences now say the root layout is the one reaching these four
surfaces. Confined to the same comment; covered by evidence 2.

## Requirements

**None closed.** `RESP-01` and `RESP-02` remain **PARTIAL**. `RESP-01` closes only after
41.2, and only by a written human pass.

## Known Stubs

None. No placeholder, TODO, FIXME, mock or hardcoded empty value was introduced.

## What is still owed, and this plan does not touch it

- **H41-1 and the thirteen pending rows of `41-CR01-PASS.md`** — nobody has yet looked at
  the four focus surfaces at 390 / 768 / 1440. A corrected comment is not an observation,
  and this plan produced no pixel of evidence about how those screens render.
- **Plan 41-20** — the render-site assertion. Check E1 reads the `FOCUS_ROOT` constant and
  never asserts the focus branch renders it, so CR-01 reintroduced in the JSX still passes
  green. That is the gate; this is the prose beside it.

## Self-Check: PASSED

| claim | check | result |
|---|---|---|
| `src/components/ui/PageShell.tsx` modified | `git diff --name-only` before commit | FOUND |
| `41-19-SUMMARY.md` created | written to the phase directory | FOUND |
| commit `6534d55` exists | `git rev-parse --short HEAD` after commit | FOUND |
| the false clause is gone | `grep -c "neither covers"` | 0 |
| the root layout is cited | `grep -c "src/app/layout.tsx"` | 1 |
| both providers named | `grep -c` each | 1 and 1 |
| no bracketed utility literal introduced | pre-change 2, post-change 2 | UNCHANGED |
| both navigation reads still on the default/wide branch | `grep -c 'var(--nav-inset'` | 2 |
| no file deleted by the commit | `git diff --diff-filter=D --name-only HEAD~1 HEAD` | empty |
| no untracked file left behind | `git status --short` | empty |
