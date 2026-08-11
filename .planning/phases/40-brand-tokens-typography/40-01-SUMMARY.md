---
phase: 40-brand-tokens-typography
plan: 01
subsystem: infra
tags: [tailwind-4, css-custom-properties, design-tokens, verification-script, node-esm]

# Dependency graph
requires:
  - phase: 35-media-privacy
    provides: "scripts/verify-media-strip.mjs — the model species for a structural gate: refuse()/exit 2, comment hygiene, boundary matching, WHAT A GREEN DOES NOT MEAN"
provides:
  - "scripts/verify-tokens.mjs — G1 and G4, the only automatic enforcement DS-01 will ever have, since npm run build is proven blind to a missing token"
  - "npm run verify:tokens, in the form the seven existing verify:* entries use"
  - "KNOWN_TOKEN_NAMES — a machine-readable form of UI-SPEC §8.3 clause 3, so a rename that leaves a consumer behind goes red"
  - "Three observed reds (exit 1, 1, 2) proving the gate measures rather than describes"
affects: [40-02, 40-03, 40-04, 40-05, 41-primitives]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First CSS parser in the repository — conservative: a declaration is read only from a line shaped like a declaration, inside a brace-counted block"
    - "Two-sided boundary matching for utility consumers (leading and trailing guard), the token-layer form of verify-media-strip's prefix trap"
    - "A gate lands in the wave BEFORE the change it guards, so its first red is a regression and not a backlog"

key-files:
  created:
    - scripts/verify-tokens.mjs
  modified:
    - package.json

key-decisions:
  - "G4 folded into verify-tokens.mjs as check E rather than given its own script, so the hex-fallback rule has a permanent reader instead of a grep somebody remembers"
  - "Check E scans every .css under src/ as well as the token file, so a second stylesheet added later is covered without editing the script"
  - "next/font variables are exempt from check A's :root requirement — they are emitted on the generated class on <html>, not in :root"
  - "The alternation in check D is sorted longest-name-first, so --line-soft is offered before --line and a hit is attributed to the name that actually appears"
  - "build stays next build --webpack — the gate is deliberately not wired into it"

patterns-established:
  - "Editing KNOWN_TOKEN_NAMES is part of a rename, not an afterthought: adding a name is part of declaring a token, removing one is part of proving it has no readers"
  - "A mutation is asserted to have landed before its result is read — a substitution that silently failed to match produces a false negative, and in the other direction certifies a dead check as working"

requirements-completed: [DS-01, DS-10]

# Metrics
duration: 14min
completed: 2026-08-11
---

# Phase 40 Plan 01: The Token Gate Summary

**`scripts/verify-tokens.mjs` — five structural checks over `src/app/globals.css` and 253 files under `src/`, green on today's tree and observed going red on a rename (exit 1), on a hex fallback (exit 1) and refusing on a missing token file (exit 2).**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-08-11T18:23Z
- **Completed:** 2026-08-11T18:37Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- **G1 exists, and it lands before the first token moves.** RESEARCH §5 P1 proved on a fixture that `@tailwindcss/postcss` 4.2.1 emits no rule, no warning and no error for a utility whose token does not exist, and exits clean. `npm run build` is the only automatic gate this repository has and it is blind to exactly the failure DS-01 is about. From this commit forward a rename that leaves a consumer behind is a red, in the wave before any token moves — so the first red is a regression attributable to a known commit.
- **G4 has a permanent reader.** The `var(--token, #hex)` prohibition was a `grep` in a document; it is now check E, running over the token file and everything under `src/` on every invocation.
- **The gate's red was observed three times**, each mutation asserted to have landed before its result was read.
- **Zero token, colour, typeface or surface changed.** `src/app/globals.css` is byte-identical to its state before this plan.

## Task Commits

1. **Task 1: verify-tokens.mjs — the gate the build cannot be** — `69299ca` (feat)
2. **Task 2: Wire verify:tokens, and prove the gate can go red** — `d302c1f` (chore)

## Files Created/Modified

- `scripts/verify-tokens.mjs` (new, 653 lines) — five checks, Node built-ins only (`node:fs`, `node:path`, `node:url`), ESM, zero dependencies, `refuse()`/exit 2 preflight, `TOKENS_OK`/`TOKENS_FAIL` sentinels.
- `package.json` — one entry, `"verify:tokens": "node scripts/verify-tokens.mjs"`, appended after `verify:routes` and before `baseline:rls`. `"build": "next build --webpack"` untouched.

## What the gate reports on today's tree

```
  token file: src/app/globals.css
  scanned 253 file(s) under src/
  declared in :root: 7 · exposed as utilities: 7
  known names: 28 · currently UNEXPOSED and therefore under check D: 21

  ✓ A  every var(--x) in src/app/globals.css resolves to a :root declaration (or to a next/font variable)
  ✓ B  all 7 --color-* mapping(s) are one-to-one forward references into :root
  ✓ C  no token is declared twice in :root, no --color-* is mapped twice
  ✓ D  none of the 21 unexposed name(s) has a consumer under src/ (253 file(s) read)
  ✓ E  no var(--token, #hex) fallback in 254 file(s) — the token file and everything under src/

  TOKENS_OK — all five checks passed.
```

The banner reports what was measured, not only that it passed: a vacuous check has to say so out loud, and check D prints its own subject count so a run in which everything happens to be exposed cannot be mistaken for a run in which nothing was read.

## The mutation proofs — the point of the plan

A gate that has not been seen to fail is a description, not a guard. Three mutations, each **asserted to have landed before its result was read** — `ai-engineering.md`, *gate prova per mutazione*: a substitution that silently fails to match produces a false negative, and in the opposite direction certifies a dead check as working. This repository has already paid for that error once, writing `verify-persona.mjs`.

### Mutation 1 — the half-rename

`sed -i '' '3,11s/--accent:/--accent-x:/' src/app/globals.css` — the `:root` declaration only, leaving the `@theme inline` mapping pointing at the old name.

**Assertion the mutation landed** (before running the gate):

```
6:  --accent-x: #e5484d;
7:  --accent-hover: #f2555a;
16:  --color-accent: var(--accent);
17:  --color-accent-hover: var(--accent-hover);
```

**Observed:** `TOKENS_FAIL — 2 check(s) failed: A, D` — **exit 1**.

- **A** caught the dangling reference at the source: `src/app/globals.css:16: [--accent] --color-accent: var(--accent);`
- **D** caught the consumers: **391 lines across 86 distinct files** read `bg-accent` / `text-accent` / `border-accent` / `from-accent` / `to-accent` against a name no longer declared. The 86 files coincide exactly with the figure the plan measured independently, which is the cross-check that the boundary matching is neither over- nor under-reading.
- **B, C, E** stayed green, so the failure was attributed rather than smeared across the report.

Reverted with `git checkout -- src/app/globals.css`; revert asserted (`--accent: #e5484d;` back at :6, file clean in `git status`).

### Mutation 2 — the half-state made permanent

`--card-fake: var(--card, #141414);` added to `:root`.

**Assertion the mutation landed:** `11:  --card-fake: var(--card, #141414);`

**Observed:** `TOKENS_FAIL — 1 check(s) failed: E` — **exit 1**, reported as `src/app/globals.css:11: --card-fake: var(--card, #141414);`. A, B, C and D stayed green: E fired alone, which is what a check with a single subject should do.

Reverted; revert asserted (`grep -c "card-fake"` → 0, file clean).

### Mutation 3 — nothing was measured

`mv src/app/globals.css src/app/globals.css.moved-aside`.

**Assertion the mutation landed:** `ls: src/app/globals.css: No such file or directory`.

**Observed:** **exit 2**, no verdict, no sentinel:

```
FATAL: src/app/globals.css does not exist. Every check reads that exact path, and parsing
       whatever moved into the name would be worse than refusing. If the token layer
       genuinely moved, TOKEN_FILE in this script moves with it — in the same commit,
       because the gate and the thing it guards are one change. Nothing was measured.
```

This is the one that matters most in a repository with **no error tracking**: a green from a script that measured nothing is the silent failure `meta-gates.md` forbids, and nobody would be told.

Restored; restore asserted — `git status --short` shows `src/app/globals.css` absent from the list, i.e. byte-identical to its pre-plan state, and no `.moved-aside` residue.

**No mutation produced exit 0.** Every check the plan named has been shown to be reachable.

## Decisions Made

- **Check E scans every `.css` under `src/`, not only the token file.** The plan said "anywhere in `src/` or in the token file"; there is exactly one stylesheet under `src/` today, so the two readings coincide, but walking the extension means a second stylesheet added in a later phase is covered without anybody remembering to edit this script. Cost: one extra walk, 254 files instead of 253.
- **`listScannableFiles(dir, extensions = SCANNED_EXTENSIONS)`** keeps the model's exported signature callable unchanged while letting check E reuse the same symlink-guarded, sorted, `node_modules`-skipping walk instead of a second implementation.
- **Blocks are found by brace counting, not by regex over the file.** `:root { … }` and `@theme inline { … }` are separated by `html`, `body`, `@supports` and two `@utility` blocks; a declaration must be read from inside the right block or checks B and C measure the wrong thing.
- **The consumer match has a *leading* guard as well as a trailing one.** The plan mandated the trailing negative lookahead (`bg-amber-500` is Tailwind's default scale, not the token `amber`). Writing it revealed the mirror case: `auto-rows-min` contains `to-rows`, and `to` is one of the twelve prefixes. Without `(?<![a-zA-Z0-9-])` the gate would attribute layout classes to tokens. Both guards are in the header's trap section.
- **Names are sorted longest-first in the alternation** so `line-soft` is offered before `line`, `ink-2` before `ink`, `accent-hover` before `accent` — the nesting the PATTERNS document flagged.

## Deviations from Plan

None — plan executed exactly as written. The two-sided boundary guard and the `.css` walk in check E are refinements *within* the plan's stated requirements (it demanded the negative lookahead and named `src/` plus the token file as check E's scope), not departures from them.

## Issues Encountered

None. The gate was green on the first run with the counts the plan predicted (7 declared, 7 exposed, 21 unexposed of 28 known), which is itself a small check on the parse: had the CSS parsing been wrong, those three numbers would have disagreed with the file.

## Known Stubs

None. Nothing in this plan renders, and nothing is wired to empty data.

## Threat Flags

None. This plan adds no network path, no auth path, no schema change and no new file access beyond reading committed source. `T-40-01` (a run that measured nothing must exit 2) and `T-40-02` (the script prints only `path:line: text`, opens no network connection, reads no environment variable, writes no artefact) are both implemented and, for `T-40-01`, observed via mutation 3.

## Verification

Per `CLAUDE.md` Environment Guardrail 1: **there is no test runner for this product, and nothing here is claimed to be verified because "tests pass"**. The evidence is the following, all run on this tree:

| Claim | Command | Result |
|---|---|---|
| The gate is green today | `npm run verify:tokens` | exit **0**, `TOKENS_OK` |
| The typecheck is green | `npm run build` | exit **0**, 57 routes, `✓ Compiled successfully` |
| The entry exists in the established form | `node -e "console.log(require('./package.json').scripts['verify:tokens'])"` | `node scripts/verify-tokens.mjs` |
| `build` is untouched | `node -e "console.log(require('./package.json').scripts.build)"` | `next build --webpack` |
| The mandatory header section is present | `grep -c "WHAT A GREEN DOES NOT MEAN" scripts/verify-tokens.mjs` | `1` |
| A refusal is reachable | `grep -c "process.exit(2)" scripts/verify-tokens.mjs` | `1` |
| Node built-ins only | `grep -E "^import .* from '" scripts/verify-tokens.mjs` | `node:fs`, `node:path`, `node:url` |
| The gate's prose does not carry the logo glyph | `grep -n "ɘ" scripts/verify-tokens.mjs` | no hit |
| No token, colour or surface changed | `git diff --stat HEAD~2 HEAD` | `package.json` +1, `scripts/verify-tokens.mjs` +653; nothing else |
| Nothing was deleted | `git diff --diff-filter=D --name-only HEAD~2 HEAD` | empty |

**What none of this proves**, and it is written into the script's own header rather than only here: a grep reads declarations, not intent. It cannot see a colour written as a raw hex in a component, a token reached through a variable renamed on the way, or a utility built by string concatenation. It never says a colour is *right* — contrast is arithmetic and legibility at a dark door is an observation.

## User Setup Required

None — no external service configuration, no dependency added. Threat `T-40-04` in the plan's register is satisfied by construction: this plan runs no package manager install.

## Next Phase Readiness

- **Plan 40-02 can move the first token with an enforcement already watching it.** That was the ordering invariant of the whole phase (`40-VALIDATION.md`, Sampling Rate) and it now holds.
- **One obligation travels with every subsequent plan in this phase:** a new token name must be added to `KNOWN_TOKEN_NAMES` in `scripts/verify-tokens.mjs` **in the same commit that declares it**. The list is the only memory the gate has of names that used to exist; a name declared but absent from the list is invisible to check D, and a half-rename would pass. This is stated at length in the comment above the constant so the next reader does not have to find it here.
- **The 21 currently-unexposed names are the phase's runway.** As 40-02 onward declare and expose them, check D's subject count falls and its banner line reports the shrinking. A name that is declared in `:root` but not mapped in `@theme inline` stays under check D — which is the DS-02 device working as designed: a token with no utility has no accidental consumers.
- **No blockers.**

---
*Phase: 40-brand-tokens-typography*
*Completed: 2026-08-11*
