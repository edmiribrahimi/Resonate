---
phase: 41-shared-primitives-three-tier-layout
plan: 01
subsystem: design-tokens
tags: [tokens, layout, accessibility, tailwind, viewport]
requires: []
provides:
  - "--control (#A493C0) and the border-control / ring-control / outline-control utilities"
  - "--nav-inset-block-end and --nav-inset-inline-start, swapping at the md tier"
  - "@custom-variant pointer-fine-only, proven to emit"
  - "pinch-zoom enabled on every surface"
affects:
  - "every plan in phase 41 — these three declarations are what the other eleven read"
tech-stack:
  added: []
  patterns:
    - "a colour token is declared in :root, mapped one-to-one in @theme inline, and named in KNOWN_TOKEN_NAMES in the same commit"
    - "a layout variable is declared at top level AND redeclared in a media query, never only in the media query"
    - "a prohibition does not spell out what it prohibits, so its own grep can still tell a violation from an explanation"
key-files:
  created:
    - .planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md
  modified:
    - src/app/globals.css
    - scripts/verify-tokens.mjs
    - src/app/layout.tsx
decisions:
  - "The probe-removal proof was re-founded on the diff, because Tailwind compiles class strings out of .planning/ and the built CSS could not witness the removal"
  - "`@source not \".planning\"` was NOT applied in this plan — deferred as DEF-41-01, because the failure direction of a wrong exclusion is silent"
metrics:
  duration: ~17 min
  completed: 2026-08-11
  tasks: 3
  commits: 3
  files_changed: 4
---

# Phase 41 Plan 01: Shared primitives — the three declarations Summary

Declared `--control` `#A493C0` (7.14 : 1 at worst against every ground, against
WCAG 1.4.11's 3 : 1), the two navigation-clearance variables that collapse three
independent hard-codes into one, and `@custom-variant pointer-fine-only` —
proven to compile by reading the emitted stylesheet, not by assuming it — and
removed the pinch-zoom lock from the root viewport.

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | `--control`, and its name in the gate's memory in the same commit | `99be102` | `src/app/globals.css`, `scripts/verify-tokens.mjs` |
| 2 | The two navigation-clearance variables, top-level first | `a8a7ebe` | `src/app/globals.css`, `scripts/verify-tokens.mjs` |
| 3 | `pointer-fine-only` proven to emit; pinch-zoom unblocked | `9a4bd96` | `src/app/globals.css`, `src/app/layout.tsx`, `deferred-items.md` |

### Task 1 — the control boundary

`--control: #A493C0` sits in the lines group of `:root` with its four computed
ratios beside it — 7.14 on `--ground`, 6.78 on `--surface`, 6.29 on `--raised`,
7.03 on `--sunk` — and with the two rejected candidates recorded so neither is
rediscovered as an economy. `--color-control: var(--control)` in `@theme inline`
makes `border-control`, `ring-control` and `outline-control` exist.
`'control'` went into `KNOWN_TOKEN_NAMES` in the same commit (D-41-14).

No value was changed. `--muted`, `--sem-info` and all three `--line*` are
byte-identical. `--control` **is** `--muted` **is** `--sem-info`: three names,
one value, literal on all three sides — D-40-05's discipline, so that separating
them later is a value change and not a refactor.

### Task 2 — the navigation clearance

Both variables are declared in the **top-level** `:root` and redeclared inside
`@media (min-width: 48rem)`, which swaps them: `0px` at the bottom edge, `14rem`
at the leading edge. Both numbers carry their reference in the comment (the `md`
tier boundary of §2.1; the side column's 224px of §8.2) rather than standing as
bare values.

Declaring at top level is the point of the task, not decoration: `findBlock()`
reads only the first `:root`, so a media-query-only declaration referenced
anywhere in this file turns check A red on a correct file — WR-02's exact shape,
which Phase 40 paid for once. **Check A stayed green and check C produced no
false duplicate**, which confirms 41-PATTERNS §6.2's reading empirically.

On a phone with no safe-area inset the shell's bottom padding computes to
80 + 0 + 16 = **96px, exactly today's `pb-24`** — value-preserving on the device
it was written for.

### Task 3 — the pointer variant, and the viewport

`@custom-variant pointer-fine-only (@media (any-pointer: fine) and (not
(any-pointer: coarse)))` sits at the foot of `globals.css`, beside the other
Tailwind extension at-rule. 44px stays the unprefixed default; the query only
ever shrinks, and only where no coarse pointer exists at all.

Two lines left `src/app/layout.tsx`'s `viewport` export, so the product can be
pinch-zoomed again. `themeColor`, `width` and `initialScale` were not touched.

## Evidence

### The emission proof, verbatim

With the temporary `@source inline(…)` probe in place,
`grep -o '@media (any-pointer:fine) and (not (any-pointer:coarse)){[^}]*}'`
over `.next/static/css/e57931c47f68b3d8.css`:

```
@media (any-pointer:fine) and (not (any-pointer:coarse)){.pointer-fine-only\:min-h-9{min-height:calc(var(--spacing) * 9)}
```

The negated clause is intact, and 9 × 0.25rem = **36px**, §6.3's floor.
`grep -rl 'any-pointer' .next/static/css` named `.next/static/css/e57931c47f68b3d8.css`;
`grep -c 'not (any-pointer' …` returned `1`.

### The verify-tokens report line

```
declared in :root: 31 · exposed as utilities: 23 · font mappings: 3
known names: 31 · currently UNEXPOSED and therefore under check D: 8
```

Baseline before the plan was `known names: 28 · … under check D: 6`. Three names
were added, in the same commits that declared them: `control` (exposed, so not
under D), `nav-inset-block-end` and `nav-inset-inline-start` (unexposed, so
under D, where check D correctly asserts they have zero consumers). All seven
checks green after every task, including F — the reversed glyph is still found
exactly once, at `src/app/layout.tsx:56`.

### The other assertions

| Assertion | Command | Result |
|---|---|---|
| the token is declared once | `grep -c -- '--control: #A493C0' src/app/globals.css` | `1` |
| the mapping is declared once | `grep -c -- '--color-control: var(--control)' src/app/globals.css` | `1` |
| two declarations, not one | `grep -cE '^\s*--nav-inset-block-end:' src/app/globals.css` | `2` (lines 284, 302) |
| the first is inside the top-level `:root` | `awk '/^:root/{r=1} /^}/{if(r==1){print NR; exit}}'` | `286` > `284` |
| the viewport lock is gone | `grep -cE 'maximumScale\|userScalable' src/app/layout.tsx` | `0` |
| `themeColor` survived | `grep -c 'themeColor: "#0A0712"' src/app/layout.tsx` | `1` |
| the probe is gone from the tree | `grep -rn 'pointer-fine-only:min-h-9' src` | no match |
| the build | `npm run build` | exit `0` after every task |
| the token gate | `node scripts/verify-tokens.mjs` | exit `0` after every task |
| the door was not touched | `git diff --name-only <base> HEAD` | 4 files, none under `scanner/`, `door/` |

### Read from the built stylesheet, not from the source

```
--control:#a493c0
nav-inset-block-end:calc(5rem + env(safe-area-inset-bottom))
@media (min-width:48rem){:root{--nav-inset-block-end:0px;--nav-inset-inline-start:14rem}
```

## Deviations from Plan

### 1. [Rule 1 — false proof] Task 3's probe-removal proof could not be taken as designed

**Found during:** Task 3.
**Issue:** the task's design was *remove the probe, rebuild, read the absence of
`any-pointer`*. The absence never came. The emitted stylesheet was **identical
byte for byte** — same content hash — before and after the removal.
**Cause, measured rather than argued:** Tailwind's automatic source detection
scans `.planning/`, so the class strings written in this phase's own documents
are live candidates. Attribution was taken with an instrument other than the one
that caused the effect: `max-w-7xl` appears in **zero** files under `src/`, in
**five** phase documents, and **is present** in the built stylesheet.
**Fix:** the proof was re-founded on the diff — the `@source inline(…)` line is
absent from the committed file, and `grep -rn` finds neither the probe at-rule
nor the probe class under `src/`. The comment in `globals.css` states this
instead of claiming a proof it does not have. An earlier draft of that comment
**did** claim the absence; it was corrected before the commit landed, because a
mutation that was not asserted to have landed is not a proof.
**Files modified:** `src/app/globals.css` (comment), `deferred-items.md`.
**Commit:** `9a4bd96`.

### 2. [Rule 2 — a prohibition that defeats its own gate] Three comments were rewritten to stop naming what they forbid

**Found during:** Tasks 2 and 3.
**Issue:** the first drafts explained each removal by spelling out the removed
identifiers. Three separate consequences, all real:
- `grep -cE 'maximumScale|userScalable' src/app/layout.tsx` returned **1**
  instead of `0` — the gate could no longer tell a violation from an
  explanation.
- the probe's class string, written in a `globals.css` comment, is **for
  Tailwind indistinguishable from a use**: it would emit a rule with no consumer
  and would have made the probe-removal check unable to see its own
  documentation.
**Fix:** the reasons stay, the identifiers left. This is the discipline
`REVERSED_E` in `verify-tokens.mjs` and the semantics block in `globals.css`
already state — *a check whose only match is its own prohibition gets ignored
the third time it goes red*. The full reasons live in the commit bodies, which
is where `globals.css:70` already sends a reader for reversed decisions.
**Files modified:** `src/app/layout.tsx`, `src/app/globals.css`.
**Commit:** `9a4bd96`.

### 3. [Literal criterion vs. its own action text] Task 2's `grep -c` returns 3, not 2

**Found during:** Task 2.
**Issue:** the acceptance criterion asks that `grep -c -- '--nav-inset-block-end'`
return `2`. It returns `3` — **because the task's own `<action>` requires the
comment to carry the two consumer expressions**
(`ps-[var(--nav-inset-inline-start)]`,
`pb-[calc(var(--nav-inset-block-end)+1rem)]`). The criterion was counting
declarations; a comment is not one.
**Fix:** the action text was followed and the criterion verified in the form
that expresses its intent — `grep -cE '^\s*--nav-inset-block-end:'` returns `2`,
at lines 284 (inside the top-level `:root`, which closes at 286) and 302.
**The comment was not rewritten to make a grep green**: obfuscating a name to
satisfy a gate is worse than the mismatch it would resolve.
**Commit:** `a8a7ebe`.

## Deferred

**DEF-41-01 — Tailwind compiles class strings out of `.planning/`.** Recorded
with its evidence in
`.planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md`.

The one-line fix — `@source not ".planning";` — was **not** applied here, for
two reasons. It is a build-configuration decision affecting all twelve plans of
the phase, not the one that tripped over it. And the failure directions are
asymmetric: leaving it costs dead rules, inert bytes; getting the exclusion
wrong makes a rule **silently stop being emitted**, which `globals.css:180-200`
already records as producing no error, no warning, a green build — and this
repository has no error tracking to tell anyone. One failure is loud and cheap,
the other is silent and visual.

One consequence the phase should know now: because 41-01 declares the variant,
the phase documents' mentions of the shrink class **now compile**, so the built
stylesheet carries §6.3's one shrink rule while the product's allow-list is
still correctly empty. Any gate in this phase that intends to read the built
stylesheet as evidence inherits this and must tolerate it, or it will read a
document as if it were the product.

## Manual verification still owed

This repository has **no test runner for the product** (`CLAUDE.md`, guardrail
1), so nothing above may be read as "the tests pass". Two observations remain
human, and no green replaces them:

1. **Pinch-zoom.** On a phone, open any surface and spread two fingers. The page
   must enlarge. This is the whole user-visible outcome of D-41-08.
2. **The chrome colour.** `themeColor` is asserted byte-identical in the file,
   but check F proves the file and not a device. On an already-installed PWA the
   frame colour is worth a glance after the next deploy.

Nothing in this plan touches access, money, the door or the venue: no route, no
query, no input, no user data was added or read. `venue_reveal_sent` and every
other monotonic guard are untouched.

## Self-Check: PASSED

- `src/app/globals.css` — FOUND
- `scripts/verify-tokens.mjs` — FOUND
- `src/app/layout.tsx` — FOUND
- `.planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md` — FOUND
- commit `99be102` — FOUND
- commit `a8a7ebe` — FOUND
- commit `9a4bd96` — FOUND
