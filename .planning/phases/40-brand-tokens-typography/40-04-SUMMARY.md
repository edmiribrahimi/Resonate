---
phase: 40-brand-tokens-typography
plan: 04
subsystem: infra
tags: [verification-script, node-esm, design-tokens, ds-02, ds-03, brand]

# Dependency graph
requires:
  - phase: 40-brand-tokens-typography
    plan: 01
    provides: "scripts/verify-tokens.mjs — the model species inside this phase: refuse()/exit 2, comment hygiene, boundary matching, WHAT A GREEN DOES NOT MEAN"
  - phase: 40-brand-tokens-typography
    plan: 02
    provides: "the 28 tokens, the four --sem-* declarations, --grad-sunset and its single application route — the subjects both gates measure; and the measured fact that the emitted bundle carries bg-grad-sunset with zero surfaces applying it"
  - phase: 35-media-privacy
    provides: "scripts/verify-media-strip.mjs — the exemption pattern (exact path, refuse() if it moved) and the switched-off-gate failure mode"
provides:
  - "scripts/verify-semantic-separation.mjs — G2, DS-02 in both directions plus the palette's single-source assertion"
  - "scripts/verify-sunset-gradient.mjs — G3, the four-stop 94deg signature declared once and applied zero times, reading src/ and never .next/"
  - "npm run verify:semantic-separation and npm run verify:sunset-gradient — ten verify:* scripts now exist"
  - "An explicit, empty ALLOW_LIST: the first SunSet surface is a decision that edits a constant, not a diff nobody reads"
  - "Seven observed reds and three observed refusals — both gates proven able to fail, not only observed passing"
affects: [40-05, 41-primitives, 42-scanner, 44-calendar, 45-production]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A signature is matched after normalisation (lower-case, comments blanked, whitespace runs collapsed ACROSS newlines, line map retained) so a formatter cannot defeat the gate and a hit is still reportable as path:line"
    - "An exemption carries its reason IN THE SCRIPT'S OWN HEADER, so the next reader cannot delete it without reading why it exists"
    - "A value exemption is distinct from a path exemption, and is named as such: the catalogue's neutral swatch is compared against nothing, and the reason is a decision nobody has taken yet"
    - "A gate that must stay green on a correct file states the correct files it was tested against, with their count, in its own trap section"

key-files:
  created:
    - scripts/verify-semantic-separation.mjs
    - scripts/verify-sunset-gradient.mjs
  modified:
    - package.json

key-decisions:
  - "Check A of G2 has a third arm the plan did not enumerate: inside @theme inline, a var(--sem-x) reference is admissible only in the matching --color-sem-x entry. Without it the plan's literal wording (no non---sem-* token's value may contain var(--sem-)) would have gone RED on the four correct mapping lines 40-02 wrote — the switched-off-gate failure, inside the gate written to avoid it"
  - "Check E treats --grad-sunset as a gradient rather than a format token only while it carries NO --color-* mapping. Exposure removes the exemption, so the distinction is mechanical instead of a sentence in a comment"
  - "G3 scans the token file by exact path IN ADDITION to src/, so check A can count the one legitimate declaration and check C's exemption has something real to exclude. The .css extension is not in the walk, so the exemption is explicit rather than accidental"
  - "G2's walk covers .ts/.tsx/.js/.jsx/.mjs/.cjs and NOT .css — stated as a hole in the header rather than left to be found: a second stylesheet carrying a brand hex would pass"
  - "Both gates stay out of npm run build, as verify-tokens.mjs already decided"

patterns-established:
  - "A mutation is asserted to have landed before its result is read — and the assertion is a separate command, so a substitution that silently failed to match cannot certify a dead check as working"
  - "A gate whose credibility depends on a number publishes that number: G3's header carries the 15 bg-gradient files it must ignore"

requirements-completed: [DS-02, DS-03]

# Metrics
duration: 34min
completed: 2026-08-11
---

# Phase 40 Plan 04: The Two Gates Nothing Else Can Hold Summary

**`verify-semantic-separation.mjs` (five checks) and `verify-sunset-gradient.mjs` (three checks) — green on this tree, wired as the ninth and tenth `verify:*` scripts, and observed going red **seven times** and refusing **three times**, including on the trap 40-02 left pointed at G3: the gradient gate reads `src/` and never `.next/`, and reports **zero** of the 15 files that use an ordinary gradient utility.**

## Performance

- **Duration:** ~34 min
- **Tasks:** 3
- **Files created:** 2 (`scripts/verify-semantic-separation.mjs` 33.956 byte, `scripts/verify-sunset-gradient.mjs` 18.885 byte)
- **Files modified:** 1 (`package.json`, +2)
- **Files under `src/` changed:** **0**

## Accomplishments

- **DS-02 has enforcement, and it has it in both directions.** `40-UI-SPEC.md` §3.4 argued that the `--sem-*` prefix *«is what lets a script hold it»* and then commissioned no script; the loop this document left open on itself is now closed. Check A holds the declaration boundary (a semantic may not be declared through a brand token, and no brand token may be declared through the semantic set), check C holds the usage boundary (no line applies a `sem-` colour utility and identifies a format), check E holds the naming boundary (no token is named after a format or a sigla).
- **The palette can no longer diverge between its two copies without a red.** Check D compares the five sunset hexes in `ColorSwatchPicker.tsx`'s catalogue against the tokens they duplicate. **They were already in agreement — and that is the finding to record, because the day they are not, the gate is the only thing that will say so.** `40-UI-SPEC.md` §3.2: *two hand-maintained copies of a palette is how a palette acquires a seventh colour nobody decided.*
- **The trap 40-02 aimed at this plan was disarmed by construction, not by luck.** Its deviation 4 measured that `bg-grad-sunset` is present in the **emitted bundle** with zero surfaces applying it, because Tailwind scans `globals.css` itself as a source. G3 reads the token file plus `src/`, has `.next` in its skip set, and says so in its banner on every run: `never read: .next/`.
- **G3 is specific to the signature and blind to an accent fade — measured, not asserted.** 15 files under `src/` use a `bg-gradient*` utility and G3 reports **zero** of them. The two `from-accent` fades sit at `src/app/(public)/tickets/[id]/page.tsx:119` and `src/app/(members)/dashboard/page.tsx:514`, they follow `--accent` wherever it is retargeted, and they are correct.
- **A formatter cannot defeat G3.** The signature is matched after normalisation, so a four-stop declaration split across two lines still fails — **observed**, not argued (mutation A2 below).
- **Both exemptions carry their reasons in the script's own header**, including the `40-CONTEXT.md` ↔ `40-UI-SPEC.md` disagreement about `ColorSwatchPicker.tsx` and its resolution, so nobody opens that file to "finish" DS-01 and deletes the constraint DS-03 leans on.

## Task Commits

1. **Task 1: verify-semantic-separation.mjs — both directions, and the palette's single source** — `1f24ad5` (feat)
2. **Task 2: verify-sunset-gradient.mjs — declared once, applied nowhere, blind to an accent fade** — `cb7762b` (feat)
3. **Task 3: wire both gates** — `59491f9` (chore)

## What the two gates report on this tree

```
verify-semantic-separation — a state is not a format, and the palette has one source
  token file: src/app/globals.css
  scanned 253 file(s) under src/
  --sem-* tokens declared: 4 · brand hexes declared in :root: 16 · --color-* mappings: 21
  exemptions applied by exact path: 2
         src/app/(admin)/admin/formats/ColorSwatchPicker.tsx
         src/app/layout.tsx
  catalogue values compared in check D: 5 of 6 offered (`neutral` is compared against nothing)

  ✓ A  all 4 --sem-* token(s) carry literal values, and no var() crosses the boundary in either direction
  ✓ B  none of the 16 declared hex(es) appears under src/ outside the 2 exempted path(s)
  ✓ C  no line under src/ carries both a sem- colour utility and a format identifier (253 file(s) read)
  ✓ D  all 5 compared catalogue value(s) equal the token they duplicate
  ✓ E  no token and no utility is named after a format or a sigla

  SEMANTIC_SEPARATION_OK — all five checks passed.
```

```
verify-sunset-gradient — declared once, worn by nobody
  declaration site (exempt from check B): src/app/globals.css
  scanned 254 file(s) — the token file and 253 under src/
  never read: .next/ (the bundle carries the utility with zero surfaces applying it)
  ALLOW_LIST length: 0

  ✓ A  the four-stop 94deg signature appears exactly once: src/app/globals.css:177
  ✓ B  no file under src/ applies the gradient — 253 file(s) read, 0 allowed
  ✓ C  check B excluded the declaration site by exact path (src/app/globals.css), which exists

  SUNSET_GRADIENT_OK — all three checks passed.
```

Each banner reports **what was measured**, not only that it passed. G2 names the two exemptions it applied, by path, on every run, and says out loud that five of six catalogue values were compared. G3 prints the `path:line` of the one declaration it found and the length of an allow-list that is deliberately zero.

## The mutation proofs — the point of the plan

A gate that has not been seen to fail is a description, not a guard. **Nine mutations, seven reds and three refusals** (mutation D of G2 and mutation C and D of G3), each **asserted to have landed before its result was read** — `ai-engineering.md`, *gate prova per mutazione*: a substitution that silently fails to match produces a false negative, and in the opposite direction certifies a dead check as working. This repository has already paid for that error once, writing `verify-persona.mjs`.

### G2 — verify-semantic-separation

| # | Mutation | Assertion it landed | Observed | Exit |
|---|---|---|---|---|
| **A1** | `--sem-warn: #FFB25E` → `var(--amber)` | `139:  --sem-warn: var(--amber);` | `✗ A` — *a semantic declared through a reference instead of a literal*, at `globals.css:139`. B, C, D, E green | **1** |
| **A2** | `--accent-hover: #F6B6D2` → `var(--sem-crit)` | `101:  --accent-hover: var(--sem-crit);` | `✗ A` — *a non-semantic token declared through the semantic set*, at `globals.css:101`. B, C, D, E green | **1** |
| **B** | catalogue `violet` `#A874E8` → `#A874E9` (one digit) | `108:  violet: { hex: "#A874E9", label: "Violet" },` | `✗ D` — `ColorSwatchPicker.tsx:108: violet = #A874E9, but --violet = #A874E8`. A, B, C, E green | **1** |
| **C** | a line carrying both `bg-sem-crit/20` and `color_hex`, added to `FormatMarker.tsx` | `68:const MUTATION_PROBE = { color_hex: "#FFFFFF", cls: "bg-sem-crit/20" };` | `✗ C` — `FormatMarker.tsx:68: [bg-sem-crit + color_hex]`. A, B, D, E green | **1** |
| **D** | `ColorSwatchPicker.tsx` moved aside | `ls: … No such file or directory` | `FATAL`, no sentinel, no verdict — *"exempting whatever moved into the name would be worse than refusing"* | **2** |

**A1 and A2 are the two directions of check A**, and both were exercised deliberately: the arm that was never observed is the arm that is not known to work. **A2 also matters because the plan's literal wording would have made it impossible** — see Deviation 1.

Every mutation reverted, and every revert asserted: `--sem-warn: #FFB25E` back at `:139`, `--accent-hover: #F6B6D2` back at `:101`, `violet: { hex: "#A874E8"` back at `:108`, `git status --porcelain` clean of `src/` after each.

### G3 — verify-sunset-gradient

| # | Mutation | Assertion it landed | Observed | Exit |
|---|---|---|---|---|
| **A1** | the signature pasted into `FormatMarker.tsx` as a `backgroundImage` string | `70: "linear-gradient(94deg, #FFB25E 0%, …)"` | `✗ A` *(2 occurrences: `globals.css:177`, `FormatMarker.tsx:70`)* **and** `✗ B` *(via the signature, written out)*. C green | **1** |
| **A2** | the same signature **split across two lines** by a formatter | lines `69-70`, `linear-gradient(94deg, #FFB25E 0%, #FF7A2F 30%,` / `#FF5C93 62%, #A874E8 100%)` | `✗ A` **and** `✗ B`, reported at `FormatMarker.tsx:69` — the normalisation holds, so this is a gate about a brand and not about line width | **1** |
| **B** | `bg-grad-sunset` added to a `className` in `FormatMarker.tsx` | `106: className={\`h-2 w-2 shrink-0 rounded-[2px] bg-grad-sunset…\`}` | `✗ B` — *via the name `grad-sunset`*, with the offending line printed. A and C green, which is what a check with one subject should do | **1** |
| **C** | the `--grad-sunset` declaration deleted from the token file | `grep -n "94deg" globals.css` → only lines `165` and `357`, **both comments** | `FATAL`, **never a green** — *"a gate that cannot find the thing it guards has measured nothing"* | **2** |
| **D** | `globals.css` moved aside | `ls: … No such file or directory` | `FATAL` — the declaration site is exempt from check B by exact path, and a moved path refuses rather than being guessed at | **2** |

**Mutation C is the one that matters most in a repository with no error tracking**, and it doubles as the comment-hygiene proof: after deleting the declaration, the string `94deg` still appeared **twice** in the token file — in the paragraphs that explain the rule — and the gate refused rather than matching its own documentation. `ColorSwatchPicker.tsx:22-27` records exactly that defect; here it was tested.

Every mutation reverted and asserted: `--grad-sunset: linear-gradient(94deg, …)` back at `globals.css:177`, `FormatMarker.tsx` restored via `git checkout --`, no `.moved-aside` residue, `git status --porcelain` showing no `src/` file modified.

**No mutation produced exit 0.** Every check either gate declares has been shown to be reachable.

### The noise test, run explicitly

| Measurement | Command | Result |
|---|---|---|
| Files using an ordinary gradient utility | `grep -rlE "bg-gradient" src --include="*.tsx" \| wc -l` | **15** |
| …of which G3 reports | `node scripts/verify-sunset-gradient.mjs` | **0** |
| The accent fades by name | `grep -rnE "from-accent" src --include="*.tsx"` | `(public)/tickets/[id]/page.tsx:119`, `(members)/dashboard/page.tsx:514` — `bg-gradient-to-br from-accent/30 to-accent/5` |

**A gate that reported those 15 would be switched off**, after which DS-03 would have no enforcement at all. The figure is written into G3's own header so the next person to widen the match sees what it costs.

## Deviations from Plan

### 1. [Rule 1 — the plan's own wording would have made the gate go red on a correct tree] Check A needed a third arm

- **Found during:** Task 1, writing check A's second direction.
- **Issue:** The plan says *"Symmetrically, no non-`--sem-*` token's value may contain `var(--sem-`."* Taken literally over the whole token file, that goes **red on four correct lines** — `--color-sem-crit: var(--sem-crit)` and its three siblings in `@theme inline`, written by 40-02 and required by `verify-tokens.mjs` check B, which demands every `--color-<name>` be exactly `var(--<name>)`. Two gates in the same phase would have contradicted each other, and the newer one would have lost: a gate that goes red on a correct file gets switched off.
- **Fix:** direction 2 is scoped to `:root`, where a token declaring itself through the semantic set is genuinely a boundary crossing. The `@theme inline` block gets its **own arm**: a `var(--sem-x)` reference there is admissible **only** in the matching `--color-sem-x` entry, so `--color-accent: var(--sem-crit)` is still red. The distinction is stated in the script's check list.
- **Why this is a fix and not a relaxation:** the mapping layer is a mapping layer. `verify-tokens.mjs` check B already asserts it is one-to-one; this arm asserts that where it touches the semantic set, it touches only the matching name.

### 2. [Rule 2 — a distinction stated in prose is a distinction that gets deleted] Check E's gradient exemption is mechanical

- **Found during:** Task 1, writing check E.
- **Issue:** `--grad-sunset` contains the segment `sunset`, which is a format name. The plan requires check E to stay green on it, with *"the distinction stated in the header"* — that it names a gradient and carries no `--color-*` mapping.
- **Fix:** both halves are **conditions in code**, not only sentences: the exemption applies while the name starts with `grad-` **and** the name is absent from the `--color-*` mappings. Mapping `--color-grad-sunset` would remove the exemption and go red, because at that point it is a format colour with a utility, which is exactly what check E refuses. The reasoning is written beside the condition.

### 3. [Rule 2 — a hole stated rather than left to be found] G2 does not read `.css`

- **Found during:** Task 1, choosing the walk.
- **Issue:** G2's walk covers `.ts/.tsx/.js/.jsx/.mjs/.cjs`. A second stylesheet under `src/` carrying a brand hex would pass check B. `verify-tokens.mjs` chose the opposite trade for its check E, and walks `.css` too.
- **Disposition:** **not changed**, and written into *WHAT A GREEN DOES NOT MEAN* with the remedy named (*"if one is added, widen `SCANNED_EXTENSIONS` in the same commit"*). Widening it here would have required a third exemption for the token file itself, and the plan's acceptance criterion asks the banner to report **2** exemptions — the count is part of what makes the banner readable. One stylesheet exists under `src/` today, so the two readings coincide; the difference is a decision, not a drift.

### 4. [Beyond the plan — an arm proven rather than assumed] Two extra mutations were run

The plan named four mutations for G2 and three for G3; **nine** were run. The two extras are check A's second direction (G2 mutation A2) and the split-across-two-lines signature (G3 mutation A2). Neither was asked for; both close a gap between *"the code has a branch for this"* and *"the branch has been seen to fire"*. The second one in particular is the difference between a gate about a brand and a gate about whitespace, and it is the kind of claim that should not be made on the strength of a regex somebody read.

## Verification

Per `CLAUDE.md` Environment Guardrail 1: **there is no test runner for this product, and nothing here is claimed to be verified because "tests pass".** All of the following was run on this tree.

| Claim | Command | Result |
|---|---|---|
| G1 is green | `npm run verify:tokens` | exit **0**, `TOKENS_OK`, 28 declared / 21 exposed / 3 font mappings |
| G2 is green | `npm run verify:semantic-separation` | exit **0**, `SEMANTIC_SEPARATION_OK` |
| G3 is green | `npm run verify:sunset-gradient` | exit **0**, `SUNSET_GRADIENT_OK` |
| G8 — the typecheck is green | `npm run build` | exit **0**, `✓ Compiled successfully in 6.6s`, **57 routes** |
| Ten `verify:*` entries exist | `node -e "…Object.keys(s).filter(k=>k.startsWith('verify:')).length"` | **10** |
| `build` is untouched | `node -e "…scripts.build"` | `next build --webpack` |
| Both entries are in the established form | `package.json` | `"verify:semantic-separation": "node scripts/verify-semantic-separation.mjs"`, `"verify:sunset-gradient": "node scripts/verify-sunset-gradient.mjs"` — appended after `verify:tokens`, not alphabetised |
| **G4 still held** | `grep -rnE "var\(--[a-z0-9-]+, *#" src` | empty |
| The mandatory header section is present in both | `grep -c "WHAT A GREEN DOES NOT MEAN" …` | **1** and **1** |
| A refusal is reachable in both | `grep -c "process.exit(2)" …` | **1** and **1** |
| G3 matches the signature, not a word | `grep -c "94deg" scripts/verify-sunset-gradient.mjs` | **6** |
| Node built-ins only, zero dependencies | `grep -E "^import .* from '" …` | `node:fs`, `node:path`, `node:url` — both files |
| Neither gate carries the logo glyph | `grep -n "ɘ" …` | no hit |
| Exactly three files changed | `git diff --name-only 925aa07..HEAD` | `package.json`, `scripts/verify-semantic-separation.mjs`, `scripts/verify-sunset-gradient.mjs` |
| **No file under `src/` changed** | same command | confirmed — none listed |
| Nothing was deleted | `git diff --diff-filter=D --name-only 925aa07..HEAD` | empty |
| The mutation experiments left no residue | `git status --porcelain` after each revert | no `src/` entry, no `.moved-aside` file |

**What none of this proves**, and it is written into both scripts' headers rather than only here. A `grep` reads **declarations, not intent**: neither gate can see a semantic expressed as a raw hex it does not know about, a format colour reached through a variable renamed on the way, a class name built by string concatenation, or a gradient composed at runtime from four values on a catalogue row. And **neither ever says a colour is right.** An amber mark still cannot tell a reader *caution* from *this is a SunSet night* by hue alone — `40-UI-SPEC.md` Open Question 3, which is why anything amber carries text. G3 says no **other** surface has taken SunSet's signature; it says nothing about whether a SunSet surface, when one exists, looks like SunSet. Those stay human.

## The exemptions, and why each is written where it is

| Exemption | Kind | Where its reason lives | Why deleting it would be the mistake |
|---|---|---|---|
| `src/app/(admin)/admin/formats/ColorSwatchPicker.tsx` | **path**, in G2 | the script's header, at length | Its six hexes are **data on a `formats` row** — `formats_color_hex_check` wants `#RRGGBB`, the value arrives at runtime, and Tailwind cannot generate a class from a runtime value. Declaring a per-format utility would reintroduce the compile-time format constant Phase 36 spent a migration removing and would make changing a format's colour **a deploy** (D-36-12, UI-SPEC §0 rule 4). **And the disagreement is recorded:** `40-CONTEXT.md` calls this file *"the one place they must stop being a local literal"*, `40-UI-SPEC.md` rule 4 and §7 keep it as it is, and the conflict resolves toward the UI-SPEC — later and more specific (`40-PATTERNS.md` §1). Anybody "finishing" DS-01 here would delete the constraint DS-03 leans on: flat swatches only, no free hex field, no picker |
| `src/app/layout.tsx` | **path**, in G2 | the script's header | `viewport.themeColor` is painted by the browser **before any stylesheet loads**, so it cannot read a CSS custom property. Check F of `verify-tokens.mjs` owns the assertion of its exact value; G2 exempts it by path and says nothing about the value, so the two gates do not disagree. *(Note: plan 40-03 is the one that puts `#0A0712` there. The exemption is by path, and the path exists, so G2 is correct both before and after that lands.)* |
| the catalogue's `neutral` `#8C82A6` | **value**, in G2 check D | the script's header, named as a different kind of exemption | It is the catalogue's **deliberate neutral** — the answer a format gives when the honest answer is *not yet decided* — chosen on its own merits. It holds the same value as `--soy`, which **D-40-06 keeps out of the token set** because its meaning *«must be asked, not deduced»*. Comparing them would merge two decisions, one of which nobody has taken |
| `src/app/globals.css` | **path**, in G3 check C | the script's header | It is the declaration site. *A check whose only match is its own prohibition is a check that gets ignored the third time it goes red* (`ColorSwatchPicker.tsx:22-27`) |

Every one of the four `refuse()`s rather than passing if its subject moves.

## Known Stubs

None. Neither script renders anything, neither is wired to data, and `ALLOW_LIST` is **empty by decision rather than by omission** — `40-UI-SPEC.md` §7 clause 3: no SunSet surface exists yet, and adding the first one *"is a decision that edits the list"*. The constant carries that sentence above it.

## Threat Flags

None. This plan adds no route, no query, no input, no auth path and no schema change. The three monotone guards — `venue_reveal_sent`, a payment reaching `completed`, a series progressivo — are unreachable from a verification script. The register's dispositions held:

- **T-40-18** (a surface wearing SunSet's signature without being SunSet) — mitigated by G3, and the mitigation was **observed failing** three ways: the signature pasted, the signature pasted across two lines, and the utility applied by name. `ColorSwatchPicker` was not relaxed: it still offers flat swatches only.
- **T-40-19** (a semantic drifting into a brand colour) — mitigated by G2 checks A, C and E, each observed red.
- **T-40-20** (a gate that measured nothing exiting 0) — mitigated and **observed three times**, exit 2 each: a moved exemption path (G2), a deleted declaration (G3), a moved declaration site (G3). Both scripts also refuse on a missing `src/`, a missing token file, an empty walk, a missing `:root`, **zero `--sem-*` declarations**, zero declared hexes, and an unreadable catalogue.
- **T-40-21** (the gates' own credibility) — the noise test was run and recorded: **15 gradient files, 0 reported.** Both exemptions keep their files green in their correct state, proven by the exit 0 with both present and unmodified.
- **T-40-22** (scripts printing source in a PUBLIC repository) — both read only committed files, print only `path:line: text`, open no network connection, read no environment variable and write no artefact. Every colour value written in either file was already public in `.claude/rules/brand-visual-system.md` before today. No venue, no unannounced date, no line-up, no personal name — and **neither file says what any format sounds like**: three of the four have no written manifesto, and a script comment is not where one gets written (`sound-manifesto.md`).
- **T-40-23** (package installs) — **no install ran.** Node built-ins only, zero dependencies, `.mjs` as house style demands (six to one).

## User Setup Required

None. No dependency, no environment variable, no external service, no hand-applied step.

## Next Phase Readiness

- **Phase 41 inherits two obligations rather than two conveniences.** Converting a surface off default Tailwind colours will make G2's check B and G3's check B run over changed files on every commit; a surface that hard-codes a brand hex on the way now goes red **in the commit that does it**, not in a review four months later.
- **The first SunSet surface edits a constant.** `ALLOW_LIST` in `scripts/verify-sunset-gradient.mjs` is `[]`. Whoever builds the first SunSet surface adds its exact path there **in the same commit**, with a comment saying which surface it is. That is the decision point, deliberately placed where a reviewer cannot miss it.
- **A new `--sem-*` token, or a sixth catalogue colour, needs one edit each.** A new semantic is covered by check A automatically. A sixth catalogue swatch is **not** compared until its key is added to `CATALOGUE_TO_TOKEN` — and if it is a new identification colour entering the brand, that is the owner's decision, not the adder's (`ColorSwatchPicker.tsx:90-102`).
- **Open Question 1 is still the owner's, and G2 cannot help with it.** `--accent` and MotionLab's identification colour hold the same value (`#FF5C93`), held as two tokens by D-40-05. A gate cannot distinguish a pink primary button from a MotionLab mark, because they are the same hue in different roles. Check B does not report `--accent`'s value inside `ColorSwatchPicker.tsx` for exactly that reason: it is the exempted path, and the coincidence is a decision, not a violation.
- **DI-40-01 is untouched and still unowned.** The second palette in `src/emails/` is invisible to both gates by construction — neither reads `src/emails/`'s literals as tokens, and a mail client cannot resolve a custom property anyway. It needs an owner's decision.
- **No blockers.**

## Self-Check: PASSED

- `scripts/verify-semantic-separation.mjs` — FOUND (33.956 byte)
- `scripts/verify-sunset-gradient.mjs` — FOUND (18.885 byte)
- `package.json` — FOUND, ten `verify:*` entries
- `1f24ad5` (Task 1) — FOUND
- `cb7762b` (Task 2) — FOUND
- `59491f9` (Task 3) — FOUND
- `git status --porcelain` — clean of `src/` before this document was written; **`STATE.md` and `ROADMAP.md` untouched** (the orchestrator owns those writes), and none of the five files owned by plan 40-03 was opened for writing

---
*Phase: 40-brand-tokens-typography · Plan 04 · Completed 2026-08-11*
*Every colour value written in this plan was already public in this tree before today. No venue, no unannounced date, no line-up, no personal name: `.planning/` is tracked and this repository is PUBLIC.*
