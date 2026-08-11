---
phase: 41-shared-primitives-three-tier-layout
plan: 04
subsystem: shared-spine
tags: [tokens, toast, semantics, accessibility, layout, formats]
requires:
  - "41-01 — --nav-inset-block-end and --nav-inset-inline-start"
  - "41-03 — the side column on work surfaces, which is what makes the toast's new position safe"
provides:
  - "the toast reads the two navigation variables instead of authoring 5rem a third time"
  - "the toast's three meanings are the declared semantics, not six raw palette colours"
  - "the rule that a dialog never raises a toast, written where the toast is provided"
  - "role=alert on failure and role=status on success/info"
  - "a measured, recorded statement that the remaining seven spine files are clean"
affects:
  - "plan 41-05 — its manifest may now declare the spine converted on a measurement rather than a report"
  - "plan 41-09 — G2 inherits a written rule to hold, rather than being asked to invent one"
  - "every plan that converts a dialog — the outcome goes in the panel, never in a toast"
tech-stack:
  added: []
  patterns:
    - "a comment states a rule by omitting the string the gate counts, so the check can still tell a violation from its own gloss"
    - "a class string in a comment is a live Tailwind candidate, so a rename is explained without naming the old utility"
    - "a primitive's contract is adopted verbatim at the call site when the primitive is being extracted in a sibling plan of the same wave"
key-files:
  created: []
  modified:
    - src/components/toast/ToastContainer.tsx
    - src/components/toast/ToastContext.tsx
    - src/components/toast/Toast.tsx
    - src/components/formats/FormatMarker.tsx
    - .planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md
decisions:
  - "IconButton was adopted as a contract written at the call site, not as an import: the primitive is being extracted in plan 41-03 in this same wave and does not exist on this branch"
  - "role=alert / role=status were added under Rule 2 — a notification nobody is told about is the same defect as one painted under a dialog"
  - "--sem-warn was not introduced: this component has no warning type, and one is not invented to complete a set"
metrics:
  duration: ~8 min
  completed: 2026-08-11
  tasks: 3
  commits: 3
  files_changed: 5
---

# Phase 41 Plan 04: The rest of the shared spine that has a colour — Summary

The toast stopped being the third independent author of the navigation bar's
height and became a reader of the variable 41-01 declared; its six raw palette
colours became the three semantics Phase 40 had already named; and the rule that
**a dialog never raises a toast** is now written in the file that owns the toast
— before the first dialog is converted, not after somebody loses a message.

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | The toast position comes from the variables, and the dialog rule is written down | `09f8eb5` | `ToastContainer.tsx`, `ToastContext.tsx` |
| 2 | Six raw palette colours become three declared semantics | `6bf54c2` | `Toast.tsx` |
| 3 | `FormatMarker` off its legacy name, and the rest of the spine measured | `e265d8e` | `FormatMarker.tsx`, `deferred-items.md` |

### Task 1 — the third author of `5rem` is gone

`bottom: calc(var(--nav-inset-block-end) + 1rem)` and
`left: var(--nav-inset-inline-start)` replace the hard-coded offset. `right: 0`
and the layering rung are unchanged.

**On a phone the computed value does not move.** `--nav-inset-block-end` is
declared as five rems plus the safe-area inset, so adding the rem reproduces the
previous expression term for term. That is what makes the diff reviewable as a
substitution rather than a reposition.

`grep -rn "5rem" src/` now finds the literal in `globals.css:284` (the single
declaration), in three `globals.css` comment lines that explain it, and in the
**four bottom sheets** — which are D-41-09's deliberate verbatim survivors and
belong to the dialog extraction, not to this plan. The toast is no longer among
them.

### Why the new position is safe today and would not have been before 41-03

*(Requested explicitly by the plan's `<output>`.)*

From `md` up, `--nav-inset-block-end` is `0px`, so the toast now sits one rem
from the bottom edge. That is **correct on a surface whose navigation has moved
to the side column and wrong on one that still shows the bottom bar.**

`useToast` has **exactly one consumer today** — `GuestListClient`, at
`src/app/(admin)/admin/events/[id]/guest-list/GuestListClient.tsx` — and it is a
work surface. **Work surfaces took the side column in plan 41-03**, which runs in
this same wave. There is therefore no surface on which the new position is
wrong. Executed before 41-03, this same change would have floated the toast into
the middle of a bottom bar on the one surface that raises one. The ordering is
the reason, not a coincidence, and T-41-13 accepts the transient on exactly this
basis rather than leaving it to be discovered.

### Task 1 — the dialog rule (T-41-11)

The provider's docblock now carries it: a native `<dialog>` opened with
`showModal()` paints in the **top layer**, above every `z-index`, so a converted
dialog reporting success by toast would report it **invisibly** — the operator
confirms a refund, a retirement or a venue reveal, sees nothing, and does it
again. A dialog reports its own outcome inside its own panel: `role="status"` for
success, `role="alert"` for failure, ink `--sem-done` / `--sem-crit` on
`--surface`.

It is latent today and goes live on first use. Plan 41-09 gives the sentence to
G2 as a mechanical check; **the sentence exists first.**

### Task 2 — three meanings, three declared semantics

| Meaning | Was | Is | As ink on `--surface` |
|---|---|---|---|
| success | two `green` utilities | `--sem-done` | **5.69 : 1** |
| failure | two `red` utilities | `--sem-crit` | **6.99 : 1** |
| information | two `blue` utilities | `--sem-info` | **6.78 : 1** |

All three clear 4.5 : 1 for body text. **Every semantic here is an ink, never a
fill** — the boundary carries the same hue at 30% and is decorative — so no
fill/ink pairing arises and `40-UI-SPEC.md` §4.3's `--ground` rule has no
application in this file. The rule is stated in the docblock for the case where
it does.

`--sem-info` holds the same value as `--muted`; the coincidence is already
recorded in `globals.css` and is repeated in the file so neither is "fixed"
without knowing the other moved.

**`--sem-warn` was not introduced.** This component has no warning type, and one
was not invented to complete a set: adding a type is a decision about what the
product says, not a tidying of a record.

The two legacy names were **aliases of exactly the tokens that replaced them**,
so the rename moves no pixel. Its purpose is that the aliases lose a consumer —
emptied first, removed second, which is the only order in which a Tailwind token
rename is not silent.

### Task 3 — the marker, and the measurement

`FormatMarker`'s undimmed ink left its legacy alias. **How the format's colour
reaches the element was not touched**: it is data on a catalogue row, applied
through an inline style, and no `--sem-*` or `--accent` fallback was added
(T-41-12). `normal-case` was already declared on the element and the name is
rendered verbatim from the prop — verified rather than assumed, so no change was
needed there.

## Evidence

### The spine measurement, verbatim

The command the plan's acceptance criterion names, run on the tree as committed:

```
$ grep -rcE -- '-(card-border|card|background|foreground)' src/components/motion src/components/ui/Icons.tsx
src/components/motion/StaggeredList.tsx:0
src/components/motion/PressableCard.tsx:0
src/components/motion/PressableButton.tsx:0
src/components/motion/AnimatedSection.tsx:0
src/components/motion/CountUp.tsx:0
src/components/ui/Icons.tsx:0
src/components/motion/MotionProvider.tsx:0
```

**Zero for every one of the seven files listed.** The same seven were measured
for raw palette colours across the full Tailwind hue set and the twelve colour
utility prefixes — also **zero for every file**:

```
$ grep -rcE '(bg|text|border|ring|fill|stroke|from|to|via)-(red|green|blue|amber|yellow|orange|emerald|rose|slate|gray|grey|zinc|neutral|stone|lime|teal|cyan|sky|indigo|violet|purple|fuchsia|pink)-[0-9]' src/components/motion src/components/ui/Icons.tsx
src/components/motion/StaggeredList.tsx:0
src/components/motion/AnimatedSection.tsx:0
src/components/motion/PressableButton.tsx:0
src/components/motion/CountUp.tsx:0
src/components/motion/MotionProvider.tsx:0
src/components/motion/PressableCard.tsx:0
src/components/ui/Icons.tsx:0
```

Plan 41-05's manifest may now declare the spine's clean half clean **on a
measurement**, which is the whole point of the task: a declaration resting on
somebody else's grep is not a declaration.

### The acceptance criteria, as run

| Criterion | Command | Result |
|---|---|---|
| the hard-code is gone | `grep -c 'calc(5rem + env(safe-area-inset-bottom) + 1rem)' …/ToastContainer.tsx` | `0` |
| the bottom variable is read once | `grep -c 'var(--nav-inset-block-end)' …/ToastContainer.tsx` | `1` |
| the leading variable is read once | `grep -c 'var(--nav-inset-inline-start)' …/ToastContainer.tsx` | `1` |
| the rung is unchanged | `grep -c 'z-\[70\]' …/ToastContainer.tsx` | `1` |
| no raw palette colour | `grep -cE '(bg\|text\|border)-(red\|green\|blue\|amber\|yellow\|orange\|emerald\|rose)-[0-9]' …/Toast.tsx` | `0` |
| no legacy token | `grep -cE 'card-border\|bg-card\b\|bg-background\|text-foreground' …/Toast.tsx` | `0` |
| no white ink | `grep -c 'text-white' …/Toast.tsx` | `0` |
| no legacy token | `grep -cE 'card-border\|bg-card\b\|bg-background\|text-foreground' …/FormatMarker.tsx` | `0` |
| the door was not touched | `git diff --name-only 6abc49a HEAD \| grep -cE 'scanner/\|door/'` | `0` |

### The gates

| Gate | Baseline | After every task |
|---|---|---|
| `npm run build` (the typecheck) | 0 | **0** |
| `verify-tokens.mjs` | 0 | **0** |
| `verify-semantic-separation.mjs` | 0 | **0** |
| `verify-sunset-gradient.mjs` | 0 | **0** |
| `verify-breakpoints.mjs` (G6) | 0 | **0** |
| `verify-no-viewport-read.mjs` (G7) | 0 | **0** |

G6 and G7 were green on the base and are green now; **this plan converted no
`sm:` usage**, so no entry left G6's written debt list and none should have.

### One reading of the built stylesheet, and what it is allowed to prove

```
.border-sem-done\/30{border-color:color-mix(in oklab,var(--sem-done) 30%,transparent)}
.text-sem-crit{color:var(--sem-crit)}
```

This establishes that the token **names resolve to real rules pointing at the
right custom properties** — a fact about the mechanism. Per **DEF-41-01** it
establishes nothing about *which file* uses them, because Tailwind compiles
class strings out of `.planning/` as well as `src/`. The consumer is established
by the greps on the source above, and by nothing in `.next/`.

## Deviations from Plan

### 1. [Rule 3 — blocking] `IconButton` was adopted as a contract, not as an import

**Found during:** Task 2.
**Issue:** the task says the dismiss button *"takes `IconButton` from plan
41-03"*. Plan 41-03 runs in **this same wave, in a different worktree**, and
`src/components/ui/` on this branch holds only `AutocompleteInput`, `Icons` and
`Skeleton`. The import would not compile, and the execution prompt forbids it
explicitly.
**Fix:** §8.5's `icon` form is written at the call site verbatim —
`min-h-11 min-w-11 rounded-full p-0`, 44 × 44, plus the `inline-flex items-center
justify-center` that centres the glyph in it — with a comment naming the sibling
plan, so this is the call site that swaps to the import when the primitive
lands. `aria-label` became `Close` per §11.
**Files modified:** `src/components/toast/Toast.tsx`.
**Commit:** `6bf54c2`.

### 2. [Rule 2 — missing critical functionality] The toast now announces itself

**Found during:** Task 2.
**Issue:** the toast carried **no `role`**. §11 requires every error region to be
`role="alert"`, and the rule this plan writes into `ToastContext` gives a dialog
`status`/`alert` in its own panel — leaving the toast silent would have made the
contract true in one of its two places. A notification nobody is told about is
the same defect as one painted under a dialog: `meta-gates.md`'s zero-silent-
failures gate applied to assistive technology, in a project with no error
tracking to notice either.
**Fix:** `role="alert"` on failure, `role="status"` on success and info, through
a small map beside the style map.
**Files modified:** `src/components/toast/Toast.tsx`.
**Commit:** `6bf54c2`.

### 3. [A criterion in tension with its own action text] Three comments do not quote what they replace

**Found during:** all three tasks. This is 41-01's deviation 2 and 3 recurring,
and it recurred **three more times**, which suggests it is a property of the
phase rather than an accident.

**Issue:** Task 1's action asks for the previous expression to be written in the
comment as evidence; its acceptance criterion asks that a grep for that
expression return `0`. Same shape for the class name in the same file
(`grep -c 'z-\[70\]'` returned **2**, my gloss being the second), and for the two
legacy utility names in `Toast.tsx` (`grep -cE …` returned **1**).

**Fix:** the reasons stay, the strings left. The arithmetic is written in prose —
*"five rems plus the safe-area inset, so adding the rem reproduces the previous
expression term for term"* — which carries the evidence without leaving the gate
unable to tell a violation from its own explanation. Two independent reasons,
and the second is stronger than the first: **a class string in a comment is, to
Tailwind, a live candidate indistinguishable from a use** (DEF-41-01), so a gloss
naming `bg-card` would emit a rule for an alias this plan exists to empty.

**This is not obfuscating a name to make a grep green.** 41-01 deviation 3
rightly refused that. The difference: there, the criterion was miscounting
declarations and the *criterion* was verified in the form expressing its intent;
here, the criterion counts correctly and the *comment* was the thing that could
be written either way at no cost to the reader. The commit bodies carry the full
strings, which is where `globals.css:70` already sends a reader.

**Files modified:** all three toast files and `FormatMarker.tsx`.
**Commits:** `09f8eb5`, `6bf54c2`, `e265d8e`.

## Observed, not fixed

### The one consumer's `catch` blocks have §11's banned shape

The plan asked that the failure toast be checked against §11's copy rule, and
that a collapse of distinct causes be reported without widening the plan to fix
a caller. **The component does not collapse anything** — it renders the string it
is handed. The caller does:

```
GuestListClient.tsx:120   } catch { toast("Failed to add guest", "error"); }
GuestListClient.tsx:152   } catch { toast("Failed to remove guest", "error"); }
```

Each bare `catch` stands for a network fault, a thrown server action and an
expired session at once, logs nothing, and says nothing about what to do — the
newsletter form's shape with a different noun. The `result.error` branches
(`:108`, `:139`) are fine: they carry the server action's own message.

**Not fixed here.** It is a caller, it is `ticketing-payments` primary (a guest
list entry is an unpaid admission), and its conversion unit is not this plan's.
Whoever converts that surface owns it.

### The toast is taller than it was

The panel correctly takes no `min-h-11` — a toast is not a control — but its
dismiss button is now a 44 px finger target, so the row's height is set by the
button rather than by the text: roughly 44 + 24 px of padding against roughly
44 px before. That is D-41-12's accepted consequence, recorded here rather than
discovered in a screenshot. No compensating padding was invented.

## Manual verification still owed

There is **no test runner for the product** (`CLAUDE.md`, guardrail 1). Nothing
above may be read as "the tests pass" — `npm run build` is the typecheck, and the
five gates check structure, not appearance.

**The plan's manual step was not performed, and is not ticked.** It asks for a
toast raised from `/admin/events/[id]/guest-list` at 390 px and at 1280 px, with
confirmation that it clears the navigation at both. Raising one needs an
authenticated session on a running app against a real event; no such environment
was available to this worktree, and seeding one is not a step an agent takes
unasked (`ai-engineering.md`). It stays owed:

1. **At 390 px** — the toast must sit exactly where it sat before this change.
   This is the value-preserving claim, and it is the one a person can falsify by
   looking.
2. **At 1280 px** — the toast must clear the side column on its leading edge and
   sit one rem from the bottom, centred in the content area. This depends on plan
   41-03 having landed; before the merge of both, the observation is not
   meaningful.
3. **Both widths** — the dismiss control is a 44 px target and shows an `--ink`
   focus ring, offset onto the panel, when reached by keyboard.

## Threat Flags

None. This plan added no route, no query, no input and no user data path; it read
nothing and wrote nothing. `venue_reveal_sent` and the other two monotonic guards
are untouched, no file under `scanner/` or `door/` was opened, and nothing here
changes what a `FormatMarker` displays — only which token name colours it, which
is the distinction between production identity and its rendering.

## Self-Check: PASSED

- `src/components/toast/ToastContainer.tsx` — FOUND
- `src/components/toast/ToastContext.tsx` — FOUND
- `src/components/toast/Toast.tsx` — FOUND
- `src/components/formats/FormatMarker.tsx` — FOUND
- `.planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md` — FOUND
- commit `09f8eb5` — FOUND
- commit `6bf54c2` — FOUND
- commit `e265d8e` — FOUND
