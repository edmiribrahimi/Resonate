---
phase: 40-brand-tokens-typography
plan: 02
subsystem: ui
tags: [design-tokens, tailwind-4, css-custom-properties, typography, contrast, brand]

# Dependency graph
requires:
  - phase: 40-brand-tokens-typography
    plan: 01
    provides: "scripts/verify-tokens.mjs — the gate that watches this file, and KNOWN_TOKEN_NAMES, which already held all 28 names before one moved"
provides:
  - "src/app/globals.css — 28 tokens in :root, the one file a person edits for colour, surface and line"
  - "21 Tailwind utilities, one-to-one into :root; the sunset scale exposed through none of them"
  - "--grad-sunset, SunSet's exclusive signature, declared once with exactly one application route and zero applications"
  - "--font-display / --font-sans / --font-mono — three type roles with fallback tails past next/font's local(Arial) fallback"
  - "Four legacy names kept as aliases, so 100+ files render in the new colours with no component edited"
  - "Figures aligned at the role, unlayered, so the eleventh site does not have to remember"
affects: [40-03, 40-04, 40-05, 41-primitives, 42-scanner, 44-calendar, 45-production]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A coincidence between two token sets is RECORDED in a comment, never expressed as a var() — separating them later is then a value change and not a refactor"
    - "A declared-but-unexposed token is the mechanical form of a prohibition: no utility exists, so no surface can reach it by accident, and check D holds it at zero consumers"
    - "A legacy name becomes a var() alias into its new role; the removal is Phase 41's, after the consumers are gone"
    - "A prohibited string is not written out even as an example — a check whose only match is its own prohibition gets switched off"

key-files:
  created: []
  modified:
    - src/app/globals.css

key-decisions:
  - "--accent takes #FF5C93 — adoption, not a choice: brand-visual-system.md already assigns that value to the role. Open Question 1 stays open and stays the owner's; D-40-05 holds accent and MotionLab as two tokens with one value, so the answer is one line and zero consumers"
  - "--accent-hover takes #F6B6D2, the palette's own lighter pink; it could not stay a tint of the retired red, which would be a DS-01 violation inside the DS-01 file"
  - "UI-SPEC contradicts itself on the focus ring (§3.5 lists it under --accent, §4.2 says --ink and never the accent). Resolved in favour of §4.2, the more restrictive and the accessibility-driven one, and written into the file so Phase 41 inherits the resolution and not the contradiction"
  - "The two glow utilities are removed rather than retargeted: a glow whose colour is a literal is a DS-01 violation living in the DS-01 file, and both had zero consumers. If a glow is wanted later it is re-expressed from the token, never restored"
  - "No token name was deleted. The four legacy names became var() aliases, because a rename here is a SILENT removal — Tailwind emits no rule, no warning and no error, and this project has no error tracking"
  - "The semantic set contains no green and Phase 40 did not invent one: adding a colour to the semantic vocabulary is adding a colour to the brand"
  - "rgba line values were written in expanded form (`rgba(234, 217, 255, 0.07)`) rather than the spec's compact `.07` — identical colour, no gate reads the string, and the repository has no formatter to normalise it either way"

# Metrics
duration: 21min
completed: 2026-08-11
---

# Phase 40 Plan 02: The Token Layer Summary

**`src/app/globals.css` now declares 28 tokens in seven commented groups and exposes 21 of them as utilities — the artifact's grounds, inks, lines and semantics adopted whole, the retired red gone from the token layer, SunSet's gradient declared once and applied nowhere, and over 100 files rendering in the new colours with no component edited.**

## Performance

- **Duration:** ~21 min
- **Tasks:** 2
- **Files modified:** 1 (`src/app/globals.css`, +314 / −21)
- **Files created:** 0 source files

## Accomplishments

- **The blast-radius file changed generation without a single consumer being touched.** `--card: var(--surface)` and the three sibling aliases mean `bg-card` (111 files), `text-muted` (124), `text-foreground` (93) and `border-card-border` (115) keep resolving — observed in the emitted bundle, not asserted: `.bg-card{background-color:var(--card)}` with `--card:var(--surface)` and `--surface:#140d20`. Opacity modifiers follow too — `.text-muted\/60` compiles through `color-mix`.
- **The retired accent left the token layer.** One line, and it reaches the 86 files that use an `*-accent*` utility. `--accent` takes `#FF5C93` and `--accent-hover` takes `#F6B6D2`.
- **DS-02 is held by construction, not by memory.** The six brand-scale names and the gradient are declared in `:root` and mapped in `@theme inline` **by nothing**, so no `bg-amber` utility exists and no surface can paint with a format's colour by accident. The format identification colours stay data on a `formats` row. `verify-tokens.mjs` check D now watches 7 names instead of 21, all at zero consumers.
- **The arithmetic went into the file, not only into the spec.** The four grounds carry the contrast figures that constrain them: `--faint` is marked as failing AA for body text on every ground (3.12–3.54), `--violet-deep` as never a foreground (1.90–2.16), the line tokens as never a control boundary (2.05 at best against the 3:1 WCAG asks), and the semantics as carrying `--ground` when used as a fill. Phase 42 reads this ramp at arm's length in a dark room; the numbers are where the person editing the token will see them.
- **Three type roles exist with tails past `next/font`'s generated fallback**, which resolves through `local("Arial")` — absent on Android.

## Task Commits

1. **Task 1: the values — `:root` becomes the artifact's palette, legacy names aliased** — `2d105ce` (feat)
2. **Task 2: the utilities — `@theme inline`, three type roles, figures at the role** — `6fba0f1` (feat)

## Verification

Per `CLAUDE.md` Environment Guardrail 1: **there is no test runner for this product, and nothing here is claimed to be verified because "tests pass".** The evidence is below, all run on this tree.

| Claim | Command | Result |
|---|---|---|
| The gate is green after task 1 | `npm run verify:tokens` | exit **0**, `TOKENS_OK`, banner **28 declared / 7 exposed** |
| The gate is green after task 2 | `npm run verify:tokens` | exit **0**, `TOKENS_OK`, banner **28 declared / 21 exposed / 3 font mappings**, check D subjects **21 → 7** |
| The typecheck is green | `npm run build` | exit **0**, `✓ Compiled successfully`, 57 routes |
| 28 tokens, each declared exactly once | `grep -cE '^  --(ground\|surface\|…\|card-border):' src/app/globals.css` | **28** |
| 21 utilities, one-to-one | `grep -cE '^  --color-[a-z0-9-]+: var\(--[a-z0-9-]+\);' src/app/globals.css` | **21** |
| The brand scale is exposed through nothing | `grep -cE '^  --color-(amber\|orange\|pink\|pink-soft\|violet\|violet-deep\|grad-sunset):'` | **0** |
| The retired red is out of the token layer | `grep -ci 'e5484d\|229, *72, *77' src/app/globals.css` | **0** |
| The two dead glow utilities are gone | `grep -c 'glow-accent' src/app/globals.css` | **0** |
| No semantic declared through a brand token | `grep -E -- '--sem-[a-z]+: *var\(' src/app/globals.css` | empty |
| `--soy` was not added (D-40-06) | `grep -c '8C82A6' src/app/globals.css` | **0** |
| The dark-only commitment stands (D-40-07) | `grep -c 'color-scheme: dark' src/app/globals.css` | **1** |
| The gradient exists once | `grep -c 'linear-gradient(94deg' src/app/globals.css` | **1** |
| …and is applied by zero surfaces | `grep -rn '94deg' src --include="*.tsx" --include="*.ts"` | no hit |
| …through exactly one route | `grep -c 'bg-grad-sunset' src/app/globals.css` | **1** |
| Three type roles, each declared once | `grep -c -- '--font-display' \| '--font-sans' \| '--font-mono'` | **1 / 1 / 1** |
| Figures align at the role, once | `grep -c 'font-variant-numeric: tabular-nums'` | **1** |
| The token reached the BUNDLE, not only the source | `grep -o -- '--ground:#\?[0-9A-Fa-f]*' .next/static/css/*.css` | `--ground:#0a0712` |
| The interface role reached the default family | `grep -o -- '--default-font-family:[^;]*' .next/static/css/*.css` | contains `--font-inter` |
| 100+ files still resolve | `grep -o '\.bg-card{[^}]*}' .next/static/css/*.css` | `.bg-card{background-color:var(--card)}` |
| The unlayered figure rule wins | `grep -o '\.font-mono{[^}]*}' .next/static/css/*.css` | two rules — the layered family, then the unlayered `font-variant-numeric` |
| Nothing outside the token layer was touched | `git diff --name-only HEAD~2 HEAD` | `src/app/globals.css` — one file |
| Nothing was deleted | `git diff --diff-filter=D --name-only HEAD~2 HEAD` | empty |

**What none of this proves.** A `grep` reads declarations, not intent: it cannot see a colour written as a raw hex in a component, a token reached through a variable renamed on the way, or a utility built by string concatenation. And **it never says a colour is right** — contrast is arithmetic, legibility at a dark door is an observation. The four grounds have not yet been looked at on a phone at night by a person; that observation belongs to the end-of-v1.5 sitting.

## Deviations from Plan

### 1. [Rule 2 — missing critical information] The plan's own acceptance criterion is not achievable in this plan's scope, and the reason is a second palette nobody owns

- **Found during:** Task 1, checking `grep -rni "e5484d" src` → *no hit anywhere under `src/`*.
- **Issue:** The retired accent survives in **three places under `src/`, none of them the token layer**: `src/emails/components/email-layout.tsx:17` and `src/emails/templates/registration-confirmation.html:46,55`. `email-layout.tsx:14-21` is not a stray value — it is a **complete hand-maintained mirror of the previous token generation** (`background #0a0a0a · foreground #ededed · accent #e5484d · card #141414 · cardBorder #262626 · muted #a1a1aa`), the exact set `globals.css` declared before this plan.
- **Disposition:** **Not fixed.** Recorded in `.planning/phases/40-brand-tokens-typography/deferred-items.md` as **DI-40-01**.
- **Why not fixed:** (a) the plan declares `files_modified: [src/app/globals.css]` and its own verification step 4 requires `git diff --name-only` to list exactly that file; (b) `src/emails/**` is `comms-analytics`, which `40-UI-SPEC.md` §6.4 already lists as **unowned in v1.5** and which `40-03-PLAN.md:363` fences out explicitly; (c) a CSS token **cannot** reach it — mail clients do not resolve custom properties, so an email palette is literal by construction and the question is *which literal*, which is a decision about what leaves the perimeter and not a typography one; (d) `registration-confirmation.html` is a **Supabase Auth template** pasted into the dashboard, so editing it here changes nothing in production until a human performs that step.
- **Consequence, stated rather than ticked:** the criterion *"`#e5484d` appears nowhere in the repository"* is **true of the token layer and false of the repository**, and **from this commit the product and its transactional email render two generations of the brand**. Neither `npm run build` nor `npm run verify:tokens` can see it — a TypeScript string literal is neither a CSS token nor a Tailwind utility.

### 2. [Rule 2 — contradiction inside the source contract, resolved and declared] The focus ring

- **Found during:** Task 1, writing `--accent`'s reserved-for list.
- **Issue:** `40-UI-SPEC.md` §3.5 lists **the focus ring** among `--accent`'s reserved uses; §4.2 states the focus ring is **`--ink`** and *"never the accent"*, because a ring in the accent colour is invisible against an accent-filled button and it is the one indicator a keyboard user has.
- **Fix:** `meta-gates.md` — *se due gate producono requisiti contraddittori, vince il piu' restrittivo*. §4.2 wins. The reserved-for list in the file omits the focus ring and the conflict is written out beside it, so Phase 41 inherits the resolution rather than rediscovering the contradiction.
- **Recorded in:** `src/app/globals.css` (accent group comment) and commit `2d105ce`.

### 3. [Rule 2 — a check must not match its own prohibition] The semantic comment was rephrased

- **Found during:** Task 1, running the plan's criterion `grep -E -- "--sem-[a-z]+: *var\(" src/app/globals.css` → expected empty.
- **Issue:** The comment explaining the prohibition **quoted the prohibited shape as an example**, so the plan's own command returned a hit on the line that forbids the thing.
- **Fix:** the prohibition is stated without writing the forbidden literal, following `ColorSwatchPicker.tsx:22-27`, which states its rule by **omitting** the string it forbids. `40-PATTERNS.md` §3.3: *a check whose only match is its own prohibition gets ignored the third time it goes red*. The criterion now returns empty on its own terms, with no refinement of the command.

### 4. [Fact discovered while verifying — belongs to plan 40-04]

The `bg-grad-sunset` rule **appears in the emitted bundle even with zero surfaces applying it**, because Tailwind scans `globals.css` itself as a source and finds the utility name at its declaration site. **A gradient gate reading `.next/` would conclude the gradient is applied.** It must read `src/`, excluding its own declaration site — which is `40-UI-SPEC.md` §7 clause 4, here confirmed against a real build artefact rather than argued. Recorded in commit `6fba0f1` and repeated in *Next Phase Readiness* below.

## Formatting note, so it is a decision rather than a drift

The three line tokens were written expanded — `rgba(234, 217, 255, 0.07)` — where the plan quoted `rgba(234,217,255,.07)`. Identical colour, no gate matches the string, and the repository has **no formatter** (no prettier config, no husky, no lint-staged — verified) that would normalise it in either direction. Stated so the difference reads as a choice about legibility and not as a value that was edited.

## What this plan deliberately did NOT do, and why — for Phase 41

**`@theme { --color-*: initial; }` replaces the entire colour namespace, after which `bg-slate-800` simply does not exist.** That is the eventual **mechanical** enforcement of DS-01, and it is the lever Phase 41 closes with — **once its file count reaches zero.**

It must not be done here. **74 `.tsx` files still use those utilities**, and the removal produces **no error**: it silently blanks their colour (`40-RESEARCH.md` §2.3, §5 P1). Pulling that lever with 74 consumers still reading it would blank 74 surfaces in one commit, with a green build and nothing to tell anyone — in a project with no error tracking.

Also not done, and each is a fence rather than an omission:

- **No surface converted.** The 74 default-Tailwind files are Phase 41's, one whole surface at a time (`40-UI-SPEC.md` §0 rule 5). Not one was opened.
- **No spacing token, no radius, no breakpoint** — re-opening spacing here would hand Phase 41 a moving target on the axis it owns.
- **No `--text-*` or `--font-weight-*` scale.** §5.4's four sizes and two weights are a contract for what Phase 41 converts *toward*; 397 `font-medium` sites are the size of that bill, and declaring a weight scale here would convert none of them while claiming otherwise.
- **`body`'s `font-family` untouched** — that line is plan 40-03's, and it must not move before `--font-inter` exists.
- **`--soy` not added** (D-40-06: its meaning must be asked, not deduced) and **no light theme** (D-40-07: the dark-only commitment is a decision, and a plan that "adds the missing light mode" is undoing one).
- **`@keyframes flash-in` untouched** — one consumer, `ScanFlash.tsx:135`, and it is Phase 42's.
- **`ColorSwatchPicker.tsx` not opened** — its six brand hexes are **data on a row**, kept deliberately by UI-SPEC rule 4.

## Reversals, written down rather than deleted

`40-PATTERNS.md` §3.2 — *a reversal is written down, not deleted.* Three left this plan:

| What left | Why | Where the reason lives |
|---|---|---|
| The previous accent red | It appeared in neither the brand palette nor the semantic set (D-40-04). Its value is **not** repeated in the token file, because the plan's own criterion requires it absent — it is in commit `2d105ce` and in `40-CONTEXT.md` | commit `2d105ce`, this file |
| `@utility glow-accent` | Wrote the retired red as an `rgba` literal **inside the token file**, so it would not have followed `--accent` at retarget. **Zero consumers.** If a glow is wanted later it is re-expressed from the token, never restored | commit `2d105ce` |
| `@utility glow-accent-strong` | Same, same | commit `2d105ce` |

**And Open Question 1 stays open.** `--accent` holds `#FF5C93` meanwhile, because that is the value `brand-visual-system.md` already assigns to the role — taking it is adoption, taking anything else would have been a choice. The same value identifies MotionLab (`36-VISUAL-SOURCE.md:71`). D-40-05 keeps them as **two tokens carrying one value**, so the owner's answer is one line here and no consumer changes. While it is open, DS-02 is held by `--accent`'s reserved-for list and by nothing else: **a pink primary button and a MotionLab mark are the same hue in different roles.**

## Issues Encountered

None that blocked. The three deviations above are all findings, not failures: two are contradictions inside the source documents resolved in the more restrictive direction, and one is an out-of-scope discovery deferred with its owner named.

## Known Stubs

None. This plan renders no component and wires no data. The one thing that is deliberately incomplete is recorded as **DI-40-02**: `--font-inter` is referenced here and created by plan 40-03. Measured consequence — `--default-font-family` is invalid at computed-value time until 40-03 lands, so Tailwind's preflight falls to its own tail on `html`; **nothing visible regresses**, because `body` still carries an explicit `font-family` (40-03's line, deliberately not moved). **40-02 and 40-03 must ship in the same release**, which is what the plan said and what this confirms on a real build.

## Threat Flags

None. This plan adds no route, no query, no input, no auth path and no schema change. The three monotone guards — `venue_reveal_sent`, a payment reaching `completed`, a series progressivo — are unreachable from a stylesheet. The register's dispositions held:

- **T-40-06** (a rename is silent) — mitigated **structurally**: no name was deleted, four became aliases. Mechanically: `verify-tokens.mjs` checks A and D, green on both commits.
- **T-40-07** (100+ surfaces losing their colour at once) — mitigated and **observed in the emitted bundle**, not asserted: `.bg-card{background-color:var(--card)}`, `--card:var(--surface)`, `--ground:#0a0712`.
- **T-40-08** (a format's identity worn by a surface that is not that format) — the sunset scale is exposed through **no** utility and check D reports zero consumers of all seven remaining unexposed names.
- **T-40-09** (publishing brand material in a public repo) — accepted, and re-checked: every value written is already public (`.claude/rules/brand-visual-system.md`, `36-VISUAL-SOURCE.md`). No venue, no unannounced date, no line-up, no personal name.
- **T-40-10** (package installs) — **no install ran.**

## User Setup Required

None. No dependency, no environment variable, no external service.

## Next Phase Readiness

- **Plan 40-03 can land.** It owns `--font-inter`, `body`'s `font-family` line, and the menu page's local font escape. The two must ship together (DI-40-02).
- **Plan 40-04 inherits one measured fact it would otherwise discover the hard way:** the `bg-grad-sunset` rule is present in the **emitted bundle** despite zero applications, because Tailwind reads `globals.css` as a source. **The gradient gate must read `src/` and exclude the declaration site**; a gate reading `.next/` would go red on a correct tree and be switched off.
- **Phase 41 inherits:** four grounds, four inks, three line weights, `--accent` and its reserved-for list, §4.2's boundary rule (a control's boundary is `--muted` or lighter, never `--line*`), **the focus ring is `--ink`** (deviation 2), the three type roles, and the `@theme { --color-*: initial }` lever to pull once its file count reaches zero.
- **Phase 42 inherits** the semantic set, the fill-inverts-ink rule, and **no accept colour** — the set has no green and this phase did not invent one.
- **One obligation still travels:** a new token name goes into `KNOWN_TOKEN_NAMES` in `scripts/verify-tokens.mjs` **in the same commit that declares it**. This plan needed no edit there — wave 1 had already listed all 28 names, which is why the gate could see a half-rename from the first moment a token moved.
- **One item is open and unowned:** DI-40-01, the second palette in `src/emails/`. It needs an owner's decision, not a developer's edit.
- **No blockers.**

## Self-Check

- `src/app/globals.css` — FOUND
- `.planning/phases/40-brand-tokens-typography/deferred-items.md` — FOUND
- `2d105ce` (Task 1) — FOUND
- `6fba0f1` (Task 2) — FOUND
- `git status --short` — clean before this document was written; `STATE.md` and `ROADMAP.md` untouched (the orchestrator owns those writes)

---
*Phase: 40-brand-tokens-typography · Plan 02 · Completed 2026-08-11*
*Every colour written in this plan was already public in this tree before today. No venue, no unannounced date, no line-up, no personal name: `.planning/` is tracked and this repository is PUBLIC.*
