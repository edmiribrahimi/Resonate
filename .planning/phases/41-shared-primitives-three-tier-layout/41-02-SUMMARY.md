---
phase: 41-shared-primitives-three-tier-layout
plan: 02
subsystem: infra
tags: [verification-script, node-esm, responsive, breakpoints, resp-01, resp-04]

# Dependency graph
requires:
  - phase: 40-brand-tokens-typography
    plan: 01
    provides: "scripts/verify-tokens.mjs — the five-part header shape, refuse()/exit 2, comment hygiene, the boundary-guard technique, and the vacuous-check confession"
  - phase: 40-brand-tokens-typography
    plan: 04
    provides: "scripts/verify-sunset-gradient.mjs — the declared-list discipline; and the mutation-asserted-before-read protocol both gates here reuse"
  - phase: 37
    provides: "scripts/verify-routes.mjs PUBLIC_ALLOW — the [value, reason] shape where the reason travels with the entry"
provides:
  - "scripts/verify-no-viewport-read.mjs — G7, matchMedia/useSyncExternalStore/innerWidth at zero under src/, no exemption"
  - "scripts/verify-breakpoints.mjs — G6, xl:/2xl: at zero and sm: only where REMAINING declares it"
  - "REMAINING: a [path, count, reason] list of the 22 files still carrying sm:, 44 uses, each reason naming the conversion unit that removes it"
  - "The measured fact that a Tailwind-prefix grep needs a TRAILING guard, not only a leading one — with Skeleton.tsx:34-36 as the file that proves it"
  - "Six observed reds and two observed refusals across the two gates"
affects: [41-03, 41-04, 41-05, 41-06, 41-07, 41-08, 41-09, 41-10, 41-11, 41-12, 42-scanner]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A breakpoint-prefix matcher needs BOTH guards: leading (?<![a-zA-Z0-9-]) so xl is not found inside 2xl, and trailing (?=[a-z!\\[-]) so a TypeScript object key `sm: \"h-8\"` is not read as a Tailwind prefix"
    - "A measurement is trusted when it RECONCILES with an independently taken one, not when it looks right: 44/22 for sm: and 5/3 for lg: match 41-UI-SPEC.md §1 exactly, and the naive grep's 23 matches nothing"
    - "A declared debt list distinguishes three states, not two: undeclared and grown are FAILURES, shrunk is a loud STALE notice that stays green — because a gate that goes red on a half-converted correct file gets switched off"
    - "A gate whose subject is legitimately empty carries its refusal precisely because 'found nothing' and 'looked nowhere' print the same tick"

key-files:
  created:
    - scripts/verify-no-viewport-read.mjs
    - scripts/verify-breakpoints.mjs
  modified: []

key-decisions:
  - "Both gates define their own walk and comment heuristic instead of importing from verify-tokens.mjs as the plan instructed. verify-tokens.mjs runs its checks at module scope and ends in process.exit(), so importing it runs the TOKEN gate and exits with the TOKEN gate's verdict — these scripts would have exited 0 having measured nothing, which is the spoofing threat T-41-06 they exist to defend against. Measured, not assumed."
  - "verify-tokens.mjs was NOT given a main-module guard, though that is the structurally correct fix. Plan 41-01 owns that file in this same wave, and two plans editing one file in parallel is the contention this phase is structured to avoid. The fix is recorded here as a candidate for a later plan."
  - "REMAINING holds 22 entries / 44 uses, not the 23 the plan's acceptance criterion computed. The criterion's oracle (grep -rlE '\\bsm:') counts src/components/ui/Skeleton.tsx:34-36 — a TypeScript size map `sm: \"h-8 w-8\"` with no breakpoint in it. Following the criterion literally would have opened the gate RED on a correct file (§0 rule 3) or, worse, put Skeleton.tsx on the list with a reason promising a migration that does not exist."
  - "Shrinking below a recorded count is a STALE notice, not a failure. A half-converted file is correct, and §0 rule 3 says what happens to a gate that goes red on a correct file. It is printed loudly anyway: a count left too high is a gate quietly loosened, because it would permit re-adding exactly what was just removed."
  - "A REMAINING entry whose path does not exist FAILS check B. A list that cannot be measured is a decoration, and a decoration that looks like a measurement is worse than nothing."
  - "G6 takes NO path exemption for Phase 42's scanner and door, resolving the §0 rule 7 / §13 G6 conflict via meta-gates.md's most-restrictive-wins rule. It forces nothing: those paths carry zero sm:, xl: and 2xl: today."
  - "max-sm: and min-sm: are counted as sm: uses. Neither exists in the tree; the alternation costs nine characters and closes the obvious evasion before it is invented."

patterns-established:
  - "Every mutation was asserted with grep BEFORE its result was read and asserted again after the revert — so a substitution that silently failed to match cannot certify a dead check as working (ai-engineering.md, gate prova per mutazione)"
  - "A refusal is proven on a fixture OUTSIDE the repository (an empty src/ beside a copy of the script), so exit 2 is demonstrated without mutating the tree"

requirements-completed: [RESP-01, RESP-04]

# Metrics
duration: ~50min
completed: 2026-08-12
---

# Phase 41 Plan 02: The Two Gates With No Legitimate Exception Summary

**`verify-no-viewport-read.mjs` (G7) and `verify-breakpoints.mjs` (G6) — both green on this tree, both proven red by asserted mutations and proven to refuse on an empty walk; and the plan's own acceptance oracle turned out to be wrong, because `grep -rlE '\bsm:'` counts a TypeScript size map as a Tailwind breakpoint and would have opened G6 red on a correct file.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 2
- **Files created:** 2 (`scripts/verify-no-viewport-read.mjs` 15.836 byte, `scripts/verify-breakpoints.mjs` 26.996 byte)
- **Files modified:** 0
- **Files under `src/` changed:** **0** — every mutation was reverted and `git diff a3f61ad` lists only the two new scripts
- **Files under `scanner/`, `door/` touched:** **0**

## Accomplishments

- **G7 exists and is green over 253 files.** `matchMedia`, `useSyncExternalStore` and `innerWidth` have zero occurrences in live lines under `src/`, with no exemption — §0 rule 6's measurement now has something keeping it true. The rule needed a gate rather than a paragraph precisely because nobody proposes *"let us read the viewport in JavaScript"*; somebody proposes one hook, for one component, with a good reason, and the second one cites the first.

- **G6 exists, is green, and prints its debt rather than a tick.** `xl:` and `2xl:` at zero; `sm:` at **44 uses in 22 files**, every one declared. The green output says *"22 file(s) still carry sm:, 44 use(s)"* — T-41-04 satisfied by construction: a green states its own scope.

- **The `REMAINING` list is a measurement, not a memory.** 22 `[path, count, reason]` triples where the reason names the conversion unit that will remove it — `§8.3` for the four sheet modals absorbed by the Dialog primitive, `§8.8` for the six table dual-renders consolidated onto `md`, `§2.2` for the eleven grid-axis files, `§2.1` for the one plain `md:` equivalent. The reason travels with the entry (`verify-routes.mjs:130-152`), so it cannot stop being true somewhere else.

- **The measurement reconciles with an independently taken one, which is why it is trusted.** With both boundary guards this script measures `sm:` 44/22, `lg:` 5/3, and zero for `md:`, `xl:`, `2xl:` — line for line, `41-UI-SPEC.md` §1's inventory, taken separately on 2026-08-11. Without the trailing guard it measures 45/23, 6/4 and one `md:`, and reconciles with nothing.

- **Both gates were proven able to fail before being trusted** — six reds and two refusals, listed below. T-41-06 is closed by observation rather than by assertion.

- **The plan's `sm:` debt survived the day intact.** 44 uses is exactly what the spec measured a day earlier; nothing crept in while the gate did not exist.

## Task Commits

1. **Task 1: G7 — the viewport is never read in JavaScript** — `e7dbfd3` (feat)
2. **Task 2: G6 — two breakpoint prefixes, and a written list of the files still carrying a third** — `2a750f3` (feat)

## The green output, both gates, in full

### `node scripts/verify-no-viewport-read.mjs` → exit 0

```
  verify-no-viewport-read — the viewport is never read in JavaScript

  files walked under src/: 253

  occurrences, in live lines:

    ·    0  matchMedia
           the media-query API — the direct way to read a breakpoint in JavaScript
    ·    0  useSyncExternalStore
           the idiomatic way a useMediaQuery hook subscribes to that API
    ·    0  innerWidth
           the raw pixel width of the window, on `window` or on `globalThis`

  ✓ A  matchMedia, useSyncExternalStore and innerWidth have zero occurrences
       in the live lines of 253 file(s) under src/

  NO_VIEWPORT_READ_OK — the one check passed.

  Read the header before treating this as safety. It reads TEXT, not behaviour:
  it cannot see a viewport read reached through a renamed import, through a
  dependency, or built by string concatenation. And it never says the CSS-only
  switch is RIGHT — only that no JavaScript is deciding the tier. Whether the
  tier it lands on is the correct one is H41-2, observed at three widths by a
  person, and no green here stands in for it.
```

### `node scripts/verify-breakpoints.mjs` → exit 0

```
  verify-breakpoints — two prefixes, and a written list of the files still carrying a third

  files walked under src/: 253

  check A — the prefixes §2.1 forbids outright:

    ·    0  xl:
    ·    0  2xl:

  ✓ A  xl: and 2xl: have zero occurrences in 253 file(s) under src/

  check B — sm:, against the declared list:

      REMAINING entries declared : 22
      sm: uses declared          : 44
      files measured carrying sm: : 22
      sm: uses measured          : 44

      the three files with the most remaining:
          4  src/app/(public)/events/[slug]/RedeemConfirmationModal.tsx
          4  src/app/(public)/events/[slug]/SumUpCheckoutModal.tsx
          4  src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx

  ✓ B  sm: appears in 22 file(s), every one of them declared, none above its
       recorded count — 44 use(s) still to migrate (D-41-05)

  BREAKPOINTS_OK — both checks passed. 22 file(s) still carry sm:, 44 use(s).

  That number is the point of the green, not the tick. Read the header before
  treating this as safety: it counts PREFIXES, NOT LAYOUTS. A file using only md:
  and lg: passes here and can still be wrong at every width. H41-1 — every converted
  surface observed at three widths by a person — is the only thing that says
  otherwise, and it is a human’s.
```

## Proven red, with every mutation asserted before its result was read

The protocol is `ai-engineering.md`'s *gate prova per mutazione*: **assert the mutation landed, then read the outcome, then assert the revert landed.** A substitution that silently fails to match would otherwise certify a dead check as working.

| # | Gate | Mutation | grep BEFORE reading | Gate exit | grep after revert | Gate after revert |
|---|---|---|---|---|---|---|
| R1 | G7 | `const _probe = window.innerWidth;` appended to `src/components/motion/MotionProvider.tsx` | `grep -c 'window.innerWidth'` → **1** | **1**, naming `MotionProvider.tsx:16` and the source line | **0** | **0** |
| R2 | G7 | same string behind `//` in the same file | `grep -c 'window.innerWidth'` → **1** | **0** — comment blanking holds, and the file was genuinely read | **0** | **0** |
| R3 | G6 | `sm:hidden` in a className string in `src/components/ui/Icons.tsx` (not on the list) | `grep -c 'sm:hidden'` → **1** | **1**, check B, naming `Icons.tsx:51` | **0** | **0** |
| R4 | G6 | one `sm:grid-cols-2` added to `src/components/analytics/KPIDashboard.tsx` (on the list, declared 1) | `grep -c 'sm:grid-cols-2'` → **1** | **1**, citing *declared 1, measured 2 (+1)* | **0** | **0** |
| R5 | G6 | `xl:hidden` in `src/components/ui/Icons.tsx` | `grep -c 'xl:hidden'` → **1** | **1**, check A — **check B stayed green**, so the two checks are independent | **0** | **0** |
| R6 | G6 | `2xl:hidden` in the same file | `grep -c '2xl:hidden'` → **1** | **1**, counted **once** under `2xl:` with `xl:` still at **0** — the leading guard proven, not argued | **0** | **0** |

**R2 is the one that proves the gate is reading rather than ignoring.** A script that skipped `MotionProvider.tsx` entirely would also be green there; R1 and R2 together show it reads that exact file and distinguishes a code line from a comment line.

### Proven green on a real conversion, which is the state the next ten plans live in

`sm:grid-cols-3` → `md:grid-cols-2 lg:grid-cols-3` in `KPIDashboard.tsx` (its §2.3 destination), asserted `grep -c 'sm:grid-cols-3'` → **0**:

```
  ✓ B  sm: appears in 21 file(s) … 43 use(s) still to migrate (D-41-05)

  ! B  1 REMAINING entr(y/ies) are STALE — the file carries fewer than recorded:
       src/components/analytics/KPIDashboard.tsx — declared 1, measured 0  → converted; remove this entry
```

**Exit 0, debt 44 → 43, and an instruction.** A conversion plan gets a green plus the exact line to delete from `REMAINING` — which is what makes the list shrink instead of rot. Reverted; `grep` back to **1**.

### Proven to refuse — exit 2, distinct from 1, before any ✓

Both scripts were copied beside an **empty `src/` in a fixture outside the repository**, so the refusal is demonstrated without mutating the tree:

```
FATAL: the walk of src/ found no scannable file — a vacuous green is not a green.
       Extensions looked for: .ts, .tsx, .js, .jsx, .mjs, .cjs
exit=2
```

Both print the refusal **before any tick**, for the reason `verify-tokens.mjs:586-590` gives: a refusal printed after a ✓ has already been believed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The prescribed import would have made both gates exit with another gate's verdict, having measured nothing**

- **Found during:** Task 1, before writing a line of either script
- **Issue:** The plan says to import `listScannableFiles` and `liveLines` from `./verify-tokens.mjs`, noting it *"already exports both although nothing imports them yet"*. Nothing imports them because **importing that module is not possible**: it runs its seven checks at module scope and ends in `process.exit()` (`verify-tokens.mjs:1041-1058`). Measured, not assumed:

  ```
  $ node -e "import('./scripts/verify-tokens.mjs').then(m => console.log('IMPORT_RETURNED', …))"
  … ✓ A … ✓ G
    TOKENS_OK — all seven checks passed.
  exit=0        ← and IMPORT_RETURNED never printed
  ```

  Either gate written that way would have printed the token gate's report and exited **0 having measured nothing** — a vacuous green wearing another gate's ✓. That is exactly **T-41-06 (Spoofing, a vacuous green)**, inside the two scripts commissioned to defend against it.

- **Why the plan's precedent does not transfer:** the cross-script import it cites, `verify-capabilities.mjs:145`, works because its target `rls-baseline.mjs` has a main-module guard at `:2594`. `verify-tokens.mjs` has none. And the three sibling **gates** — `verify-media-strip.mjs:130,163`, `verify-sunset-gradient.mjs:152,185`, `verify-semantic-separation.mjs:270,303` — each declare their own `SKIP_DIRS`, their own walk and their own `isCommentLine`. **Self-contained is the house shape for a gate; the importable module is the exception.**
- **Fix:** both gates define the four helpers locally, matching the three siblings exactly. The finding and its evidence are written into **both script headers**, so nobody re-tries the import.
- **The alternative, and why it was refused:** adding a main-module guard to `verify-tokens.mjs` is the structurally correct fix and is the one a later plan should take. It was refused here because **plan 41-01 owns that file in this same wave** — and this plan's own objective states the principle: *"so no two plans in a wave contend for it."*
- **Files modified:** none beyond the two created scripts
- **Commits:** `e7dbfd3`, `2a750f3`

**2. [Rule 1 — Bug] The acceptance criterion's oracle counts a TypeScript object key as a Tailwind breakpoint**

- **Found during:** Task 2, while measuring the tree to build `REMAINING`
- **Issue:** The criterion says `REMAINING`'s length must equal `grep -rlE '\bsm:' src --include='*.tsx' | wc -l`, which returns **23**. The 23rd file is `src/components/ui/Skeleton.tsx:34-36`:

  ```ts
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  ```

  A size map. No breakpoint in it. A leading boundary guard alone — the technique the plan names — does **not** exclude it, because the key is preceded by whitespace exactly as a real prefix is.
- **Consequence had it been followed:** the gate opens **red on a correct file**, which `41-UI-SPEC.md` §0 rule 3 identifies as the failure mode that gets a gate switched off, citing `verify-media-strip.mjs:51-62` as a cost this repository *"has already paid twice"*. The likelier outcome is worse than the red: putting `Skeleton.tsx` on `REMAINING` with a reason promising a migration that does not exist, and one day migrating a component's size API to `md:`.
- **Fix:** a **trailing** guard as well — `(?=[a-z!\[-])` — requiring the `:` to be followed immediately by a class-name character. A Tailwind prefix is; an object key is not.
- **How the fix is known to be right rather than merely plausible:** with both guards the script measures `sm:` **44/22**, `lg:` **5/3**, `md:`/`xl:`/`2xl:` **zero** — line for line `41-UI-SPEC.md` §1's independently taken inventory. Without the trailing guard: 45/23, 6/4, one `md:` — reconciling with nothing.
- **Files modified:** none — the correction lives in `verify-breakpoints.mjs`'s pattern, with the reasoning and the `Skeleton.tsx` citation in its header
- **Commit:** `2a750f3`

**3. [Rule 2 — Missing critical functionality] A shrinking entry, a dead path, and a duplicated path were undefined behaviour**

- **Found during:** Task 2
- **Issue:** The plan defines two failures (undeclared file; listed file that grew) and is silent on three states the list will actually reach: a file carrying **fewer** than recorded, an entry whose **path no longer exists**, and a **duplicated** path. Silence here is not neutral — a stale-high count is a **quietly loosened gate**, since it permits re-adding exactly what was just removed.
- **Fix:**
  - **fewer than recorded** → a loud `! B  … STALE` notice, **exit still 0**. Making it a failure would go red on a correct half-converted file (§0 rule 3).
  - **path does not exist** → **failure**. A list that cannot be measured is a decoration, and it cannot go red on a correct *file* because there is no file.
  - **duplicated path** → `refuse()` → **exit 2**: one of the two counts would be silently ignored, so the measurement did not happen.
  - **empty `REMAINING`** → `refuse()` → **exit 2**: if the migration really is finished, that is a decision to write above the constant, not a list that quietly emptied itself.
- **Commit:** `2a750f3`

**4. [Rule 3 — Blocking] `/**\/` inside a docblock closed the docblock**

- **Found during:** Task 2, first run
- **Issue:** The §0 rule 7 paragraph quotes the glob `src/app/(admin)/**\/scanner/**`. The `*/` inside it terminated the comment, and the file threw `ReferenceError: scanner is not defined` at parse time.
- **Fix:** the house escape `*\/`, which `verify-tokens.mjs:208` already uses for the same reason.
- **Commit:** `2a750f3`

### Conflicts Resolved

**§0 rule 7 (exempt Phase 42's paths) versus §13's G6 row (exemptions: "none")**

`41-UI-SPEC.md` §0 rule 7 asks every gate in this phase to exempt the scanner and the door **by path, with the reason in the script**. §13's G6 row says this gate's exemptions are *"none. This one has no legitimate exception, which is what makes it worth writing."*

`meta-gates.md` resolves it — **when two gates produce contradictory requirements, the most restrictive wins, and the conflict is documented in the commit.** G6 therefore takes **no path exemption**, and the reasoning is in its header. **Nothing is forced by the choice:** `src/app/(admin)/**` scanner paths, `src/components/scanner/**` and `src/app/(admin)/door/**` carry **zero** `sm:`, `xl:` and `2xl:` today. If Phase 42 needs a breakpoint there it needs `md:` or `lg:` like everything else, which is the contract rather than an oversight.

## What these gates do NOT do, stated rather than left to be found

Both headers carry a `WHAT A GREEN DOES NOT MEAN` section; the load-bearing ones, repeated here because a SUMMARY is read by people who will not open the script:

- **G6 counts prefixes, not layouts.** A file using only `md:` and `lg:` passes and can still be wrong at every width. **H41-1** is the only thing that observes otherwise.
- **G7 says no JavaScript decides the tier. It does not say the tier is right.** A dialog can be CSS-only and still be a sheet at 1400px. **H41-2** is what settles it — and it also settles A2, the unverified `showModal()` scroll-lock claim.
- **Neither can see a name built by string concatenation**, reached through a renamed import, or living in a dependency.
- **`useSyncExternalStore` has legitimate non-viewport uses** — an online/offline store is not hypothetical in a product with `src/lib/offline/`. §0 rule 6 named it anyway and the count stays at zero rather than at "zero viewport ones". Removing the name is a decision that edits the constant, not an `eslint-disable` at a call site.
- **`max-sm:` and `min-sm:` are counted; any other spelling that reaches 640px is not.**
- **A green on `REMAINING` is not progress.** 22 files still carrying `sm:` is a green and is meant to be — the list exists so the gate could be switched on today rather than after the migration, which is `verify-media-strip.mjs:51-62`'s whole lesson.

## Verification

Per `CLAUDE.md` Guardrail 1 and `meta-gates.md`: **there is no test runner for the product**, so nothing here is claimed on the basis of tests passing.

| Check | Result |
|---|---|
| `node scripts/verify-no-viewport-read.mjs` | **exit 0**, 253 files walked (criterion: > 170) |
| `node scripts/verify-breakpoints.mjs` | **exit 0**, `REMAINING` 22 = measured 22, declared 44 = measured 44 |
| Six mutations, each asserted by `grep` before its result was read | **exit 1** each, each naming the file and line; each reverted and re-asserted |
| Both refusals, on a fixture outside the repo | **exit 2**, printed before any ✓ |
| `npm run build` | **exit 0** — compiled in 6.6s, TypeScript clean, 40 static pages generated. This is what proves the six reverts landed |
| `git diff a3f61ad --name-only` | only `scripts/verify-no-viewport-read.mjs` and `scripts/verify-breakpoints.mjs` |
| No file under `src/**/scanner/**`, `src/components/scanner/**`, `src/app/(admin)/door/**` edited | **confirmed** by the diff above |

**Neither script is registered in `package.json`** — plan 41-12 owns that file and registers all six new gates at once. Until then: `node scripts/verify-<gate>.mjs`. Both headers say so.

## What the next plans in this phase inherit

- **A conversion plan's definition of done gained a line.** When a surface converts, its `REMAINING` entry is edited **in the same commit** — the count lowered, or the line deleted. The gate prints the exact instruction (`→ converted; remove this entry` / `→ lower the count to N`), so it is not something to remember.
- **`sm:` cannot enter a new file, and `xl:`/`2xl:` cannot enter any file**, from now on rather than from the end of the migration.
- **The debt has a number that can be watched: 44.** It only goes down, and the gate prints it on every run.
- **A candidate for a later plan:** give `verify-tokens.mjs` a main-module guard (`rls-baseline.mjs:2594` is the shape). It would make its exported helpers genuinely importable — which is what plan 41-02 was written expecting — and it belongs to a plan that owns that file alone.

## Self-Check

- `scripts/verify-no-viewport-read.mjs` — **FOUND** (15.836 byte)
- `scripts/verify-breakpoints.mjs` — **FOUND** (26.996 byte)
- commit `e7dbfd3` — **FOUND**
- commit `2a750f3` — **FOUND**

## Self-Check: PASSED
