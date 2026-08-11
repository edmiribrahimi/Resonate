---
phase: 41-shared-primitives-three-tier-layout
plan: 05
subsystem: layout-primitives
tags: [primitives, page-shell, typography, orbitron, ticketing-payments, manifest, ds-07, resp-01, resp-02]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 01
    provides: "--nav-inset-inline-start and --nav-inset-block-end, which the shell reads in both tiers; --control, named in the Card docblock as the other half of the 406-site triage"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 03
    provides: "the whole pill ladder as module-private maps in Button.tsx, and FOCUS_RING — this plan exported a rung, it did not write a second ladder"
provides:
  - "src/components/ui/PageShell.tsx — the three widths, the gutter, the rhythm, and the navigation clearance in every tier"
  - "src/components/ui/Card.tsx — the one card shell, with BOTH destinations of D-41-13's triage written in it"
  - "src/components/ui/Typography.tsx — PageTitle (the only site in src/ naming the display face) and SectionHeading"
  - "src/components/ui/Button.tsx — the labelled rung, which renders an anchor when given an href"
  - "scripts/conversion-manifest.mjs — SPINE, PHASE_42_PATHS, PRIMITIVES, CONVERTED, and checkManifest()"
  - "/payment/callback — the first whole surface declared converted"
affects:
  - "41-07 — G1 and G4 import the manifest; PRIMITIVES is per exported symbol, which is what check C needs"
  - "41-06 and every later conversion plan — PageShell, Card and PageTitle are what a surface converts onto, and each adds its own CONVERTED entry"
  - "41-08 — adds the Badge rung to Chip.tsx and the Skeleton exports to PRIMITIVES, and flips the Skeleton SPINE entry from pending"
  - "41-12 — registers the gates in package.json; this plan added no script entry"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The shell owns the navigation clearance so that 49 pages do not each have to learn where the navigation went"
    - "A primitive that can be a link takes an href and renders an anchor, so a visual conversion cannot silently turn a navigation into a click handler"
    - "A manifest entry is per exported symbol, not per file, because a file-level check goes green on the first rung and never sees the orphaned second one"
    - "A docblock on a money surface is written in prose that does not spell the tokens its own diff assertion greps for"

key-files:
  created:
    - src/components/ui/PageShell.tsx
    - src/components/ui/Card.tsx
    - src/components/ui/Typography.tsx
    - scripts/conversion-manifest.mjs
  modified:
    - src/components/ui/Button.tsx
    - src/components/layout/AppNav.tsx
    - src/app/(public)/payment/callback/page.tsx

key-decisions:
  - "Tasks 2 and 3 share one commit, because the plan requires the commit that declares a surface converted to contain the conversion. Three commits would have made the manifest entry a claim in its own commit rather than a record."
  - "Button renders an anchor when given an href. Two of its three first sites are links dressed as buttons; an onClick pushing to the router would have converted the appearance and quietly broken middle-click, copy-address and the browser's own affordances."
  - "The three status marks stay 20% tints rather than becoming full fills. Computed as non-text marks against the card ground: 4.36, 5.20 and 7.07:1, all clear of WCAG 1.4.11's 3:1, and the tint preserves the incumbent visual weight on a surface whose job is to be read once."
  - "PageShell's docblock states the 96px arithmetic in prose and does NOT spell the incumbent clearance utility, so a later gate counting leftover manual clearance cannot count this docblock."
  - "FOCUS_RING is deliberately absent from PRIMITIVES: it is a class string, not something that renders, and G1 check C's failure mode is a component nobody mounted. The paragraph saying so is in the file, so adding it later is a decision and not a discovery."

requirements-completed: [DS-07, RESP-01, RESP-02]

# Metrics
duration: ~55min
completed: 2026-08-12
tasks: 3
commits: 2
files_changed: 7
---

# Phase 41 Plan 05: The Page Shell, the Card, the Page Title — and the First Converted Surface Summary

Content now stops widening because one component caps it; the navigation
clearance is computed in one place in both tiers and still lands on today's
96px on a phone; Orbitron renders for the first time since it was loaded; and
one whole surface — the payment callback — goes through all three without a
single line of what it decides about a payment having moved.

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | `PageShell`, `Card`, `PageTitle`, `SectionHeading`, and the `Button` export | `281b92a` | `ui/PageShell.tsx`, `ui/Card.tsx`, `ui/Typography.tsx`, `ui/Button.tsx`, `layout/AppNav.tsx` |
| 2+3 | `/payment/callback` converted whole, and the manifest that declares it | `8e40d73` | `(public)/payment/callback/page.tsx`, `scripts/conversion-manifest.mjs` |

### Task 1 — three primitives, and a rung that arrived with its consumer

`PageShell.tsx:72` takes `default` / `wide` / `focus` and renders §8.1's strings
verbatim. The bottom padding is the navigation's block-end inset plus 16px, so:

| Tier | Inset | Bottom padding |
|---|---|---|
| phone, no safe-area inset | 80px | **96px** |
| phone, with an inset | 80 + inset | 96 + inset |
| tablet and desktop | 0 | 16px |

**96px is exactly what the tree's 47 hand-written page roots already produce**,
which is the sentence that makes 47 future diffs reviewable rather than merely
plausible. It is in the docblock — in prose, and **without spelling the
incumbent utility**, because Tailwind cannot tell a class string in a comment
from a use and a later gate counting leftover manual clearance would have
counted the docblock (41-01 deviation 2; 41-03 deviation 1).

`Card.tsx:47` is §8.4's one shell. Its docblock names **both** destinations of
D-41-13's 406-site triage — a container edge keeps a line token, an interactive
control's boundary becomes `--control` and lives in the form controls — with the
question to ask at each of the 406 sites written out: not *what does it look
like* but *can it be operated*. A rule that can only be kept by remembering
which of the two you meant is not a rule that gets kept.

`Typography.tsx:53` is `PageTitle`, and it is **the only file under `src/` that
names the display utility** — verified, not assumed. That is the enforcement
mechanism, not tidiness: §7.1's exclusion list is the decision, and a surface
that spells the utility itself has bypassed it. `Typography.tsx:116` is
`SectionHeading`, carrying §7.3's four axes with the reason each went against
the incumbent plurality, and the sentence that keeps it: **no incumbent string
survives**, so a later "fix" back towards the plurality would be a regression on
three axes at once.

`Button.tsx:215` exports the labelled rung, reading 41-03's maps. **No rung
moved.** The comment that named this plan as the one adding it is gone; the
badge rung's deferral to 41-08 is still written, in `Chip.tsx:23`.

`AppNav.tsx:242` renders `<SectionHeading>Work</SectionHeading>` — the inline
string that was there is now imported, so no component in this plan shipped
without a consumer (D-41-04).

### Task 2 — the money surface, and what it did not change

`/payment/callback` is the first surface declared converted. Its outermost
returned element is `PageShell width="focus"` (`:108`), the two hand-written
card shells are `Card` (`:109`, `:194`), the five page titles are `PageTitle`,
and the three accent links are `Button` at `lg` (`:139`, `:161`, `:179`).

**Finding A2 closed on three of its 64 lines.** The links carried `text-white`
on an accent fill at **2.91:1**; the `primary` variant carries the page ground
at **6.85:1**.

**The six raw palette colours became the declared semantics for their meaning**,
each computed as a non-text mark on its 20% tint over the card ground:

| Branch | Semantic | Mark on its tint | WCAG 1.4.11 (3:1) |
|---|---|---|---|
| success | `--sem-done` | **4.36:1** | passes |
| failed / expired | `--sem-crit` | **5.20:1** | passes |
| not found | `--sem-warn` | **7.07:1** | passes |

Colour is not the only channel on any of them: each mark sits above a page title
that names the state in words.

The eleven legacy-token utilities became their new names. Those are aliases
(`globals.css:247-250`), so **the rename changes no pixel**.

**Five branches stayed five.** None was merged with another on the grounds that
two of them now render the same component — which is the exact temptation a
component extraction creates on a page whose branches *are* its safety property.

### Task 3 — the manifest two later gates read

`scripts/conversion-manifest.mjs` exports four declared lists, every entry
carrying its reason, in the `[value, …, reason]` shape `verify-routes.mjs`
already uses:

```
converted: 1 · spine: 15 (14 skippable, 1 pending) · primitives: 7 · phase-42 paths: 3
```

`PRIMITIVES` is **per exported symbol and not per file**, and the file says why:
`Button.tsx` and `Chip.tsx` each carry two rungs published one wave apart, so a
file-level entry would go green on `Button.tsx` the moment its icon rung had an
importer and would never see a labelled rung nobody rendered — precisely the
orphan D-41-04 exists to prevent.

`Skeleton.tsx` is marked **pending**, not converted. It is D-41-04's own
precedent, and a spine list claiming a file is converted before it is would
silently remove a real file from a gate's scope — the one failure direction that
produces a green.

The module is **safe to import**: nothing runs at import time. `checkManifest()`
returns `{ ok, refusals }`, and an empty `CONVERTED` is a refusal, not a pass.

## Evidence

### The money path is unchanged, and the assertion is the plan's own

```
git diff -U0 "src/app/(public)/payment/callback/page.tsx" \
  | grep -E '^[-+]' | grep -cE 'fetch|checkout|status|redirect|router\.|searchParams'
```

**Returns `0`.** No line touching what the page asks the server, when it asks,
how often it asks again, which outcome strings it branches on, or where it sends
someone once the money is confirmed appears in the diff at all — in either
direction. The five branch predicates, the polling guard and its counter, the
timer, the cleanup and the one navigation on confirmation are byte-identical.

**The docblock is written in prose that does not spell those tokens.** The first
draft did, which would have returned a non-zero count from the page's own
explanation of why the count should be zero — the shape 41-01 deviation 2 and
41-03 deviation 4 both record. The identifiers stay where they are *facts*; they
left where they were *descriptions*.

### The assertions, each with its command

| Assertion | Command | Result |
|---|---|---|
| the build, after every task | `npm run build` | exit `0` (×3), no new warning |
| the token gate | `node scripts/verify-tokens.mjs` | exit `0`, seven checks green |
| semantic separation | `node scripts/verify-semantic-separation.mjs` | exit `0` |
| the breakpoint gate (G6) | `node scripts/verify-breakpoints.mjs` | exit `0`, list unchanged at 22 files / 44 uses |
| the viewport gate (G7) | `node scripts/verify-no-viewport-read.mjs` | exit `0`, all three readers at zero |
| the gradient gate | `node scripts/verify-sunset-gradient.mjs` | exit `0` |
| the three widths, once each | `grep -c` for each in `PageShell.tsx` | `1`, `1`, `1` |
| logical properties only | `grep -c 'pl-' PageShell.tsx` | `0` |
| the display face, once | `grep -c 'font-display' Typography.tsx` | `1` |
| the rejected margin is not in the file | `grep -c 'mb-3' Typography.tsx` | `0` |
| **the display face lands in exactly one file** | `grep -rl 'font-display' src --include='*.tsx'` | `src/components/ui/Typography.tsx`, and nothing else |
| the section heading has a consumer | `grep -c 'SectionHeading' AppNav.tsx` | `2` (import + render) |
| the labelled rung is exported once | `grep -cE 'export (function\|const) Button\b' Button.tsx` | `1` |
| no second ladder was written | `grep -c 'min-h-12' Button.tsx` | `1` |
| the badge rung is still deferred | `grep -cE 'export (function\|const) Badge' Chip.tsx` | `0`, still commented with 41-08 |
| no raw palette colour on the surface | `grep -cE '(bg\|text\|border)-(red\|green\|…)-[0-9]'` | `0` |
| no legacy token on the surface | `grep -cE 'card-border\|bg-card\b\|bg-background\|text-foreground'` | `0` |
| no white ink on the surface | `grep -c 'text-white'` | `0` |
| the shell is the outermost element | `grep -c 'PageShell'` = `5`; read at `:107-108` and `:185` | outermost in both returns |
| the manifest, as the plan asks | the plan's `node -e` one-liner | `converted: 1 spine: 15`, exit `0` |
| the manifest names its one surface once | `grep -c 'payment/callback' conversion-manifest.mjs` | `1` |
| Phase 42's exclusion is written | `grep -c 'scanner' conversion-manifest.mjs` | `5` |
| every declared path exists on disk | `checkManifest()` over `CONVERTED`, `SPINE`, `PRIMITIVES` | `{ ok: true, refusals: [] }` |
| importing has no side effect | the same one-liner | no gate report printed |
| **the door was not touched** | `git diff --name-only <base> HEAD \| grep -cE 'scanner/\|\(admin\)/door/'` | `0` |
| nothing was deleted | `git diff --diff-filter=D --name-only HEAD~1 HEAD` | empty, after both commits |

### The gate was proven able to fail, not only to pass

`ai-engineering.md` requires that a new check be shown to fire. Both refusals
were mutation-proven **before** the commit, and the mutation was asserted to
have landed before its result was read:

- `CONVERTED` emptied in-process → `ok: false`, and the refusal names the
  vacuous-green condition. Restored.
- a non-existent path pushed onto `SPINE` → `ok: false`, and the refusal explains
  the failure direction: a stale exclusion removes a real file from a gate's
  scope, which is the direction that produces a green.

### The shell's inline-start padding was verified in the emitted stylesheet

This is the one thing in the shell that would be a **visible defect** rather
than a wrong number if it were wrong: in the `focus` form the gutter and the
column clearance are both inline-start paddings, one a shorthand and one a
longhand at equal specificity, so **source order decides**. Read from
`.next/static/css/298960447b3e090a.css` by byte offset:

```
44213  padding-inline:calc(var(--spacing) * 6)
44822  padding-inline-start:calc(var(--nav-inset-inline-start) + 1.5rem)
```

The longhand comes second and wins. Had it come first, a centred card would have
sat *under* the 224px column at every width from 768px up.

*(This reads the stylesheet to establish the ORDER OF TWO DECLARATIONS, not to
establish that product code uses a class — which DEF-41-01 correctly forbids,
since Tailwind compiles class strings out of `.planning/` too.)*

## Deviations from Plan

### 1. [Plan's own instruction vs. one-commit-per-task] Tasks 2 and 3 landed in one commit

**Found during:** commit planning.
**Issue:** the executor's rule is one commit per task; Task 2's action text says
*"the commit that declares the surface converted must contain both"*.
**Resolution:** two commits, not three. The alternative orderings both fail the
plan's intent — putting the manifest first ships a commit whose own
`checkManifest()` reports a refusal, and putting it last makes the entry a claim
in a commit that does not contain the thing it claims. The commit message names
both tasks and says why they are together.

### 2. [Rule 2 — missing critical functionality] The description would have defeated its own assertion

**Found during:** Task 2, immediately after writing the page's docblock.
**Issue:** the first draft explained the money-path constraint by naming the
things it does not touch — and those names are exactly the tokens the plan's own
acceptance grep counts in the diff. The assertion would have returned a non-zero
count sourced entirely from the paragraph asserting it should be zero.
**Fix:** the docblock was rewritten in prose — *"what it asks the server, when it
asks, how often it asks again, which outcome strings it branches on"*. No
information was lost and **nothing was renamed or spelled oddly to make a grep
green**: the literals stay everywhere they are facts.
**Files modified:** `src/app/(public)/payment/callback/page.tsx`.
**Commit:** `8e40d73`.

### 3. [Rule 2 — accessibility] The three state marks were unlabelled decorative SVGs

**Found during:** Task 2.
**Issue:** each branch's mark is an inline `<svg>` with no `role`, no title and
no `aria-hidden`, sitting immediately above a heading that says the same thing
in words.
**Fix:** `aria-hidden="true"` on all three. The glyph is decoration reinforcing
the title; without the attribute its treatment is left to the assistive
technology rather than declared.
**Why it was fixed rather than deferred:** it is inside the surface this plan
converts whole, it changes nothing the page decides, and nobody would ever
report it — this repository has no error tracking and a screen-reader
announcement raises nothing.
**Commit:** `8e40d73`.

### 4. [Contract silent on a detail] The primary fill lost its hover colour

**Found during:** Task 2.
**Issue:** the incumbent links carried a hover fill; §8.5's variant table
declares no hover for `primary`, and 41-03's map has none.
**Resolution:** **not changed.** The plan is explicit — *do not change a rung* —
and adding one here would have made this surface's buttons differ from every
other surface's for the rest of the phase. Recorded rather than fixed, so that
if the ladder should carry a hover state it is decided once, in `Button.tsx`,
and not discovered per surface. The press feedback and the focus expression both
survive, so the control is not without feedback.

## Carried forward, not fixed

**The toast's dismiss control still writes the `IconButton` contract by hand.**
`src/components/toast/Toast.tsx:169-182` carries the primitive's class string
verbatim with a comment saying the primitive did not exist on plan 41-04's
branch. It exists now (`Button.tsx:150`). **That file is not among this plan's
declared files**, so the swap was not made here — a later plan whose scope
includes `src/components/toast/` should make it, and it is a one-line import
plus a five-line deletion.

**Two observations about `/payment/callback` that are copy and control flow, not
layout — reported because §11 asks, and deliberately not rewritten here.**

1. **`page.tsx:159`** — the failed branch reads *"Something went wrong with your
   payment. Please try again."* That is §11's **banned shape** in substance: it
   is the newsletter form's *"Qualcosa è andato storto"* in English, on a money
   surface. It collapses a declined card, an abandoned session and a provider
   fault into one message a person cannot act on differently.
2. **`page.tsx:92`** — the `catch` sets the not-found state. A network failure, a
   thrown server action and a payment that genuinely is not there therefore
   reach the visitor as the same screen: *"We couldn't find this payment."* On a
   surface someone opens **after having been charged**, telling them their
   payment cannot be found when the real cause was a dropped connection is the
   most alarming of the three possible messages, and it is the one given to all
   three.

Both are **decision and copy on a money path**, which this plan is explicitly
forbidden to move; the second is a change to what the page tells someone about
their money and belongs in a plan that is Critical and carries an owner
decision. Recorded here so the next reader meets them rather than rediscovers
them.

**The spinner keeps its CSS animation with no reduced-motion variant.** §12
requires `motion-reduce:` on *"any CSS animation a primitive adds"*; this one is
incumbent and not added by a primitive, and a spinner is the case where the
motion carries the meaning. Left as it is, noted so it is a decision.

## Known Stubs

None. Every element this plan renders is wired to real state; no placeholder, no
empty array standing in for data, no TODO, no mock.

## Threat Flags

None. This plan added no route, no query, no input, no user data, and no branch
on `role` or `status`. Its two `mitigate` dispositions are met:

- **T-41-14 (tampering with the callback)** — the diff assertion over the money
  tokens returns `0`; the five branches are still five; the poll guard, its
  counter and the one navigation on confirmation are byte-identical. The rule
  *ask the provider, never believe the announcement* is carried into the page's
  own docblock so the next reader meets it before the markup.
- **T-41-16 / T-41-17 (a manifest that lies)** — an empty `CONVERTED` is a
  refusal, `SPINE`, `CONVERTED` and `PRIMITIVES` paths are asserted to exist on
  disk, and both refusals were proven to fire by mutation. `Skeleton` is marked
  pending precisely so the list does not claim a conversion that has not
  happened.
- **T-41-SC** — no package was installed, added or removed. `package.json` is
  untouched by this plan.

`venue_reveal_sent` and every other monotone guard are untouched. Nothing under
`scanner/` or `(admin)/door/` was opened — the diff is seven files, exactly the
seven the plan declared.

## Manual verification still owed

This repository has **no test runner for the product** (`CLAUDE.md`, guardrail
1). Nothing above may be read as "the tests pass": five gates and a typecheck are
green, **and not one of them has seen a pixel**.

### H41-1 for this surface — **not observed, and not ticked**

**It could not be made from this worktree, and the reason was measured rather
than assumed.** `next start` was run here and `/payment/callback` returned
**HTTP 500**, with the server log naming the cause:

```
Error: Your project's URL and Key are required to create a Supabase client!
    at .next/server/src/middleware.js
```

The middleware runs on **every** request, including a public one, and this
worktree carries no `.env.local` — only the example. Supplying credentials would
mean pointing a running application at production, which `ai-engineering.md`
treats as an act requiring an authorisation this agent does not hold and did not
ask for. The probe server was stopped; nothing was seeded and nothing was read.

**The procedure, written so the next person executes it rather than designs it:**

1. `npm run dev` in a checkout that has `.env.local`.
2. Open `/payment/callback` with no query parameters. It renders the not-found
   branch immediately and needs no real payment — that is the cheapest way to
   see the shell, the card, the title and the action together.
3. At **390px**: the card is centred, the gutter is even on both sides, the
   title does not clip, and there is **no horizontal scrollbar on the body**.
4. At **768px**: the navigation is the 224px column at the leading edge. **The
   card must be centred inside the space the column leaves, not inside the
   viewport** — if it sits visibly left of centre, or slides under the column,
   the inline-start padding landed on the wrong element. This is the single most
   important thing to look at, and it is the one the stylesheet check above can
   only make likely, not certain.
5. At **1280px**: the column is still 224px and the card is still 384px, centred
   in the remainder. Neither widens.
6. At all three: tab to the action and confirm a ring appears **on the page
   around** the pill, not inside it.
7. Then the same at each real outcome, if a test payment is available — the
   success, failed and not-found marks each carry a different semantic and each
   should read as one, not as three shades of the same thing.

### The page title's new size is a judgement, and it wants an eye on it

The five titles were `text-lg`; as `PageTitle` they are **`text-3xl` in
Orbitron** — which is §7.1's rule applied correctly, and also the first time
anyone will see Orbitron in this product. *"Payment successful!"* in a 384px card
will wrap to two lines. That is expected, not a defect, but it is a visual
decision made by a contract rather than by a person and it deserves the glance.

## Self-Check: PASSED

- `src/components/ui/PageShell.tsx` — FOUND
- `src/components/ui/Card.tsx` — FOUND
- `src/components/ui/Typography.tsx` — FOUND
- `src/components/ui/Button.tsx` — FOUND
- `src/components/layout/AppNav.tsx` — FOUND
- `src/app/(public)/payment/callback/page.tsx` — FOUND
- `scripts/conversion-manifest.mjs` — FOUND
- commit `281b92a` — FOUND
- commit `8e40d73` — FOUND
