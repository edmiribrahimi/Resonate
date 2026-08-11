---
phase: 41-shared-primitives-three-tier-layout
plan: 03
subsystem: navigation
tags: [primitives, navigation, responsive, touch-targets, accessibility, ds-07, resp-03, resp-04]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 01
    provides: "--control and border-control; --nav-inset-inline-start / --nav-inset-block-end, swapping at md; the 5rem literal the bar's height must keep true"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 02
    provides: "verify-breakpoints.mjs (G6) and verify-no-viewport-read.mjs (G7), both of which this plan had to keep green"
provides:
  - "src/components/ui/Button.tsx — the full pill ladder as module-private maps, FOCUS_RING exported, IconButton exported with a REQUIRED aria-label"
  - "src/components/ui/Chip.tsx — Chip, interactive and therefore 44px, with the badge-vs-chip sentence written at the top"
  - "src/components/layout/AppNav.tsx — the product navigation in both tiers, with form and workNav"
  - "src/components/layout/MobileNav.tsx — a wrapper locking the door to the bar form; the D-41-21 fence"
  - "src/components/staff/StaffNav.tsx — the eight work tabs as a phone strip and as a column group"
  - "the declared clearance shim in (work)/layout.tsx, with its exit route written"
affects:
  - "41-04 — IconButton is the toast's dismiss control"
  - "41-05 — adds the labelled Button rung to Button.tsx"
  - "41-08 — adds the Badge rung to Chip.tsx"
  - "every later plan converting a page under admin/(work)/ — each one moves the shim closer to removal"
  - "42-scanner — inherits MobileNav.tsx to delete once it decides what the door looks like at tablet width"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A primitive ships only in the wave that converts a surface onto it; the rungs with no consumer are written into the same file as module-private maps and exported by the plan that first renders them (D-41-04)"
    - "One focus expression, exported from Button.tsx and imported by Chip and StaffNav — never respelled, so there is one place to be wrong"
    - "A chip's border is declared in the base and coloured by state, so no state loses it and acquiring one moves nothing"
    - "Two trees removed at the other tier by display, never one tree filtered by width — the tab count is a server decision, not a viewport one"
    - "A comment that spells a class string is, to Tailwind, a use — and an ABBREVIATED one emits a malformed rule and a build warning"

key-files:
  created:
    - src/components/ui/Button.tsx
    - src/components/ui/Chip.tsx
    - src/components/layout/AppNav.tsx
  modified:
    - src/components/layout/MobileNav.tsx
    - src/components/staff/StaffNav.tsx
    - src/app/(admin)/admin/(work)/layout.tsx

key-decisions:
  - "FOCUS_RING is exported from Button.tsx. §5.4 says the focus expression is written exactly once; three files need it and only an export makes 'once' literally true."
  - "The selected work tab renders differently in the two forms — an accent-filled chip in the strip, an accent label with a 2px leading edge in the column — because in the column it sits directly under AppNav's own entries and a filled pill there says button, not current page. Both carry aria-current='page'."
  - "The strip is built as FormatFilterRow's TWO elements (a px-6 gutter parent around the -mx-6 px-6 scroller), not as the plan's single class string. The work layout provides no gutter, so a bare -mx-6 at root would have overflowed the body by 24px at every width."
  - "AppNav's entries gained the focus expression they never had. Rule 2 — a keyboard user tabbing the navigation saw nothing move, and nothing in this repository would have raised it."
  - "The column scrolls vertically (md:overflow-y-auto) when 5 product entries plus 8 work tabs exceed a short viewport. Vertical scroll inside a column is not the horizontal strip RESP-04 forbids, and it never removes an entry."

requirements-completed: [DS-07, RESP-03, RESP-04]

# Metrics
duration: ~40min
completed: 2026-08-12
tasks: 3
commits: 3
files_changed: 6
---

# Phase 41 Plan 03: The Pill Ladder and the Navigation Spine Summary

The navigation gained its second tier — a persistent 224 px column from 768 px
up that does not collapse — the eight work tabs stopped living in a strip that
scrolls, every entry and every tab rose from ~32 px to 44 px, and the door ended
the plan rendering exactly what it rendered before, from a file it does not
import differently.

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | The pill ladder — `IconButton` and `Chip`, each with a consumer in this wave | `51e7a60` | `src/components/ui/Button.tsx`, `src/components/ui/Chip.tsx` |
| 2 | `AppNav` carries both tiers; `MobileNav` becomes the wrapper holding the Phase 42 fence | `0c5c61d` | `src/components/layout/AppNav.tsx`, `src/components/layout/MobileNav.tsx` |
| 3 | `StaffNav` in two forms, and the work layout that composes them | `7d001e5` | `src/components/staff/StaffNav.tsx`, `src/app/(admin)/admin/(work)/layout.tsx`, `src/components/layout/AppNav.tsx` |

### Task 1 — the ladder, with two rungs deliberately unshipped

`Button.tsx` carries the whole ladder as **module-private** maps: four sizes
(44 / 44 / 48 / 44×44, height from `min-h-11` and never from padding) and four
variants. Two rungs are exported, and each has a consumer **in this wave**:
`IconButton` (the toast's dismiss control, plan 41-04) and `Chip` (the eight
work tabs on the phone strip, Task 3 of this plan).

The two that do not have one are named, dated and deferred in a comment at the
gap — the labelled rung to **41-05** with `/payment/callback` as its first
render, the badge rung to **41-08** with `/admin/members/register`. D-41-04, and
the reason it is a rule rather than a preference is already in the tree:
`Skeleton.tsx` exists, is correct, and has zero importers.

`IconButton` types `aria-label` as **required**. Omitting it is now a build error
naming the file, rather than a 44 × 44 square a screen reader announces as
"button" and nothing else — a defect that renders, compiles and looks right.

`Chip.tsx` opens with the sentence that decides whether a later file is correct:
**a badge that is a `<Link>` or a `<button>` is a Chip, not a Badge.** It is
written now, not with the badge rung, because it governs `Chip` from the moment
`Chip` exists.

### Task 2 — two tiers, and a fence that is a mechanism

`AppNav` is the bar below 768 px and a fixed 224 px column at the leading edge
from 768 px up. **It does not collapse** — no toggle, no drawer, no hamburger,
no disclosure. The active entry says so in three channels: an `--accent` label,
a 2 px indicator (an underline in the bar, a leading edge in the column), and
`aria-current="page"`, which no navigation in this tree carried.

The bar's row is `h-20` with the safe-area inset on the element **outside** it,
so the bar's total height is exactly `calc(5rem + env(safe-area-inset-bottom))`
— the literal `--nav-inset-block-end` is built from. The docblock says so and
says why: four files depend on it, and re-deriving the height from markup would
invalidate them silently.

`MobileNav.tsx` is now sixty lines: the same default export, the same prop type
byte-for-byte, rendering `AppNav` locked to the phone form. That is D-41-21's
mechanism and not a rename dodge — the door mounts the navigation, so a
responsive `AppNav` reaching it would put a 224 px column on a scanner screen,
which is a change to the door's surface delivered by a phase whose fence says
the door is Phase 42's.

### Task 3 — eight tabs that stand up, and a shim that says when it leaves

`StaffNav` takes `form` and renders **two trees**, each removed at the other
tier by `display` — §8.8's mechanism, which takes the hidden tree out of the
accessibility tree entirely rather than leaving it present and invisible.
Neither tree is transformed into the other, and **the number of tabs does not
change with width**: `:11-32` survives verbatim, and `visibleStaffTabs` is still
the only filter.

The four defects at the old `:74` closed **by construction** rather than by four
local edits, because the strip is now a `Chip`:

| Defect | Was | Is | Source |
|---|---|---|---|
| target | ~32 px | `min-h-11` — 44 px | §6.1 |
| ink on the accent fill | **2.91 : 1** | `--ground`, **6.85 : 1** | §5.3 |
| weight | 500, which this system does not have | 600 | §7 |
| control boundary | a line token, **1.39 : 1** | `--control`, **7.14 : 1** | §5.2 |

`(work)/layout.tsx` mounts `AppNav` with `workNav`, renders the strip above the
content, and wraps `{children}` in the **declared** clearance shim: an outer
element taking the real 224 px from `--nav-inset-inline-start`, and an inner one
redeclaring that variable as `0px` for its subtree, so a page that has been
converted adds nothing on top. All 24 unconverted work pages are correctly
cleared at every width, converted or not, with zero JavaScript and no per-page
edit — and the comment names **the plan that removes it**: the one that converts
the last page under this layout.

## Evidence

### The full diff — the evidence for the door boundary

`git diff --name-only 6abc49a HEAD`, verbatim and complete:

```
src/app/(admin)/admin/(work)/layout.tsx
src/components/layout/AppNav.tsx
src/components/layout/MobileNav.tsx
src/components/staff/StaffNav.tsx
src/components/ui/Button.tsx
src/components/ui/Chip.tsx
```

Six files, exactly the six the plan declared. `git diff --name-only 6abc49a |
grep -cE 'scanner/|\(admin\)/door/'` returns **0** after every task.
`DoorSurface.tsx`, `scanner/page.tsx` and `door/page.tsx` were not opened — not
to fix an import, not to add a comment.

**Why the door's rendering is unchanged and not merely untouched.** The legacy
names `MobileNav` dropped are **aliases** (`globals.css:180-208`):
`--background → --ground`, `--card-border → --line`. Renaming a legacy utility to
its new name is **value-identical and changes no pixel**. The one thing that does
change on the door is the raised floor: its bar entries are now at least 44 px.
That is DS-07 arriving, in the only direction a target may move.

### The assertions, each with its command

| Assertion | Command | Result |
|---|---|---|
| the build, after every task | `npm run build` | exit `0` (×3) |
| the token gate | `node scripts/verify-tokens.mjs` | exit `0`, seven checks green |
| the breakpoint gate | `node scripts/verify-breakpoints.mjs` | exit `0`, `sm:` list unchanged at 22 files / 44 uses |
| the viewport gate | `node scripts/verify-no-viewport-read.mjs` | exit `0`, all three readers at zero |
| the rejected paddings | `grep -cE 'px-5\|px-2\.5\|py-0\.5' Button.tsx Chip.tsx` | `0`, `0` |
| white ink is not in the ladder | `grep -c 'text-white' Button.tsx` | `0` |
| the suppressor does not survive | `grep -c 'focus:outline-none' Button.tsx Chip.tsx` | `0`, `0` |
| the deferred rungs are absent | `grep -cE 'export (function\|const) Badge' Chip.tsx` · `… Button\b' Button.tsx` | `0`, `0` |
| the shipped rungs are present | `grep -cE 'export (function\|const) IconButton' Button.tsx` · `… Chip' Chip.tsx` | `1`, `1` |
| the wrapper locks the form | `grep -c 'form="phone"' MobileNav.tsx` | `1` |
| the column has one width | `grep -cE 'md:w-56' AppNav.tsx` | `1` |
| the nav states its current page | `grep -c 'aria-current' AppNav.tsx` | `3` |
| no legacy names in the spine | `grep -cE 'card-border\|bg-background\|text-foreground' AppNav.tsx MobileNav.tsx` | `0`, `0` |
| the mount sites are untouched | `grep -rl 'layout/MobileNav' src --include='*.tsx' \| wc -l` | `13` — the same count as before this plan |
| StaffNav's four defects | `grep -c 'text-white'` · `grep -c 'font-medium'` · `grep -cE 'card-border\|bg-card\b\|bg-background'` | `0`, `0`, `0` |
| StaffNav states its current page | `grep -c 'aria-current' StaffNav.tsx` | `2` |
| the shim exists once | `grep -c 'ps-\[var(--nav-inset-inline-start)\]' '(work)/layout.tsx'` | `1` |
| the tab count is width-independent | `grep -cE 'innerWidth\|matchMedia\|slice\(\|\.filter\(.*(md\|width)' StaffNav.tsx` | `0` |
| nothing was deleted | `git diff --diff-filter=D --name-only HEAD~1 HEAD` | empty, after every commit |

The thirteen mount sites, enumerated rather than counted, because a count is
what went stale in this layout's own docblock once already: `src/app/page.tsx`,
`(public)/tickets/[id]`, `(public)/gallery`, `(public)/artists/[slug]`,
`(public)/newsletter`, `(public)/events`, `(public)/events/[slug]`,
`(public)/events/[slug]/menu`, `(members)/attendance`,
`(members)/membership-card`, `(members)/dashboard`, `(admin)/admin/(work)/layout`,
and `(admin)/admin/scanner/DoorSurface` — the last of which was **read, never
opened**.

## Deviations from Plan

### 1. [Rule 1 — a comment that emitted a broken CSS rule] An abbreviated class string in a comment produced a build warning

**Found during:** Task 3.
**Issue:** a comment in `(work)/layout.tsx` described the converted page's
padding by writing the utility with an ellipsis inside the brackets. `npm run
build` answered with a CSS optimiser warning — a rule had been **generated** from
that comment, with `padding-inline-start: var(…)` and an unparseable token.
**Cause:** Tailwind scans comments and cannot tell a description from a use.
41-01 recorded this in one direction (a comment naming a class emits a live
rule); this is the same fact in a sharper direction — an *abbreviated* class
string emits a **malformed** one, so the cost is not a dead rule but a warning
and a broken declaration in the shipped stylesheet.
**Fix:** the comment says what the element does in prose and states, in place,
why the class string is deliberately not spelled there. The warning is gone from
the build.
**Files modified:** `src/app/(admin)/admin/(work)/layout.tsx`.
**Commit:** `7d001e5`.

### 2. [Rule 2 — missing critical functionality] The navigation had no focus indicator at all

**Found during:** Task 3, while giving `StaffNav`'s column entries theirs.
**Issue:** the incumbent bar's entries carried no focus expression. A keyboard
user tabbing along the product navigation saw **nothing move** — WCAG 2.4.7, and
`§5.4` says the focus expression goes everywhere.
**Why it was fixed rather than deferred:** nobody was going to report it. This
repository has no error tracking, a missing focus ring raises nothing, and the
navigation is the one component every surface mounts — deferring it to "the
surface that notices" defers it forever.
**Fix:** `FOCUS_RING` applied to `AppNav`'s entries and `StaffNav`'s column
entries; `Chip` already carried it.
**Files modified:** `src/components/layout/AppNav.tsx`,
`src/components/staff/StaffNav.tsx`.
**Commit:** `7d001e5`.

### 3. [Plan class string vs. the element it lands on] The strip is two elements, not one

**Found during:** Task 3.
**Issue:** the task gives the strip as `-mx-6 flex gap-2 overflow-x-auto px-6`.
That string is a **gutter bleed**: it assumes a parent with 24 px of horizontal
padding, which is what `FormatFilterRow.tsx:109` provides on its own `<nav>`.
`(work)/layout.tsx` provides no gutter — the pages under it carry their own — so
a bare `-mx-6` at that level would have pulled the row 24 px past the viewport
on both sides and put a horizontal scrollbar on the body **at every width**.
**Fix:** the strip is built the way the task's own `read_first` says to build it
— as `FormatFilterRow`'s **two** elements: a `mb-6 px-6 md:hidden` `<nav>` around
a `-mx-6 flex gap-2 overflow-x-auto px-6` scroller. The plan's class string is
present, verbatim, on the element it belongs to. The strip now depends on
nothing about what it is mounted inside.
**Commit:** `7d001e5`.

### 4. [Literal criterion vs. its own prose] Two greps counted a docblock as an occurrence

**Found during:** Tasks 2 and 3, twice, in the same shape 41-01 hit at its Task 2.

- `grep -c 'form="phone"' MobileNav.tsx` returned **2**: once in the render,
  once in a docblock sentence quoting it.
- `grep -rl 'layout/MobileNav' src \| wc -l` returned **14**: the thirteen
  importers, plus `AppNav.tsx`'s docblock naming the wrapper by full path.

**Fix, and the line it does not cross:** both sentences were rewritten as
**prose** — "locked to the phone form", "the `MobileNav.tsx` wrapper beside this
file" — which loses no information, since `AppNav` and its wrapper are in the
same directory. The literals stay where they are **facts** (the render, the
import) and left where they were **descriptions**. This is not the obfuscation
41-01 refused: nothing was renamed or spelled oddly to make a gate green, and
the underlying invariant was verified independently by enumerating all thirteen
importers, above.

## Known Stubs

None. Every element this plan renders is wired to the capability set the server
already resolved; no placeholder, no empty array standing in for data, no TODO.

## Threat Flags

None. This plan added no route, no query, no input, no user data and no branch
on `role` or `status`. Its three `mitigate` dispositions are met:

- **T-41-07 (information disclosure)** — membership is decided once, on the
  server. Neither nav filters, slices or truncates at any width, the paragraph
  forbidding it is carried into `AppNav`'s docblock, and the acceptance grep for
  a width-conditioned filter returns 0.
- **T-41-09 (tampering with the door's rendering)** — zero Phase 42 files in the
  diff; `MobileNav`'s default export and prop type byte-compatible; the dropped
  names are aliases, so the rename is value-identical.
- **T-41-10 (24 unconverted work pages)** — the clearance shim keeps every one
  of them usable at ≥ 768 px from the first merge.

`venue_reveal_sent` and every other monotone guard are untouched, as is every
payment path and the door's offline behaviour.

## Manual verification still owed

This repository has **no test runner for the product** (`CLAUDE.md`, guardrail
1). Nothing above may be read as "the tests pass" — three gates and a typecheck
are green, and none of them has seen a pixel.

### H41-6 — **not observed, and not ticked**

The plan asks for `/admin/members` at 390 px, 768 px and 1280 px, confirming the
bar below 768 and the column at and above it, and that all eight tabs are
reachable at 768 px without scrolling the strip.

**It could not be made from this worktree, and the reason is not a missing
viewport.** `/admin/members` is a work surface: it requires an authenticated
session holding `organizer.access`. This worktree carries **no `.env.local`** —
only the example — so a dev server here cannot reach Supabase, and every surface
that mounts the navigation is one that queries it. Manufacturing a session would
mean writing to production, which `ai-engineering.md` treats as an act requiring
authorisation this agent does not hold and did not ask for.

**The procedure, written so the next person executes it rather than designs it:**

1. `npm run dev` in a checkout that has `.env.local`.
2. Sign in as an account holding `organizer.access`, open `/admin/members`.
3. At **390 px**: the navigation is a bar at the bottom edge; the eight work
   tabs are a strip in flow above the content; the current tab is an
   accent-filled pill and is not flush to the left gutter.
4. At **768 px**: the bar is gone; a 224 px column stands at the left edge with a
   single hairline on its trailing side; under a `Work` heading the **eight tabs
   are stacked and all visible without scrolling anything sideways**. This is the
   measurement — if a tab requires scrolling, RESP-04 is not met.
5. At **1280 px**: the column is still 224 px. It must not widen; the extra
   width goes to the content.
6. At all three: tab with the keyboard through the navigation and confirm a ring
   appears **on the page around** each entry, not inside it — the 2 px offset is
   what makes the ring an indicator on an accent fill.

### The door, which this plan claims not to have changed

Open **`/door`** and **`/admin/scanner`** on a phone. The navigation must be the
bottom bar at both addresses and at every width, including on a tablet — that is
the whole content of D-41-21. The one visible difference from before is that its
entries are now at least 44 px tall. **If a 224 px column appears at either
address, the fence has failed** and Phase 42's scope has been entered by
accident.

### H41-1 / H41-2

Every converted surface, observed at three widths by a person. This plan
converts the spine and no page, so what is observable today is the spine on
whatever page it is mounted — the pages themselves arrive in later plans.

## Self-Check: PASSED

- `src/components/ui/Button.tsx` — FOUND
- `src/components/ui/Chip.tsx` — FOUND
- `src/components/layout/AppNav.tsx` — FOUND
- `src/components/layout/MobileNav.tsx` — FOUND
- `src/components/staff/StaffNav.tsx` — FOUND
- `src/app/(admin)/admin/(work)/layout.tsx` — FOUND
- commit `51e7a60` — FOUND
- commit `0c5c61d` — FOUND
- commit `7d001e5` — FOUND
