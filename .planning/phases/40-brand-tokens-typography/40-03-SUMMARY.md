---
phase: 40-brand-tokens-typography
plan: 03
subsystem: ui
tags: [typography, next-font, pwa-manifest, brand-spelling, design-tokens, css-chunking]

# Dependency graph
requires:
  - phase: 40-brand-tokens-typography
    plan: 01
    provides: "scripts/verify-tokens.mjs — the gate this plan extends with check F, and whose check A this plan had to correct"
  - phase: 40-brand-tokens-typography
    plan: 02
    provides: "--font-sans / --font-display / --font-mono in @theme inline, and the open debt DI-40-02: --font-inter referenced but not yet created"
provides:
  - "src/app/layout.tsx — the ONLY next/font call site in src, declaring both faces as variables on <html>"
  - "--font-inter, which closes DI-40-02 and makes --default-font-family valid"
  - "body on the interface role: prose and controls render in Inter, the display face applies BY ROLE and by nothing else"
  - "One CSS chunk where there were two — DS-10 clause 1 is a directory listing, not a claim"
  - "public/manifest.json — the installed app name and the splash colour, the two values the OS owns"
  - "scripts/verify-tokens.mjs check F — the only permanent reader of a rule JSON cannot carry as a comment"
affects: [40-04, 40-05, 41-primitives, 42-scanner]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A next/font face reaches CSS as a custom property only through the `variable` option; without it the call returns a className and any @theme reference to it resolves to nothing, silently, with a green build"
    - "A gate never pins a line number it can move itself — it asserts the file and the nature of the line, and prints what it found"
    - "A check builds a prohibited glyph from its code point rather than writing it, so it can never match itself"
    - "A rule a file cannot carry as a comment (JSON) is carried by a check instead"

key-files:
  created: []
  modified:
    - src/app/layout.tsx
    - src/app/(public)/events/[slug]/menu/page.tsx
    - src/app/globals.css
    - public/manifest.json
    - scripts/verify-tokens.mjs

key-decisions:
  - "Check F does NOT pin the glyph's line number. The plan named layout.tsx:16 and this plan's own first commit moved it to :56 — a gate pinned to a line would have been invalidated by the commit that wrote it, gone red on a correct file, and been switched off"
  - "verify-tokens.mjs check A was CORRECTED, not the code it flagged: it knew two origins for a name (:root, next/font) and not the third, @theme names, which Tailwind emits into :root itself. Proven by mutation that a genuine typo still fails"
  - "public/images/ and public/icons/ excluded from the glyph scan, and binaries not read at all — U+0258 in UTF-8 is two bytes any image can carry by coincidence"
  - "display: swap kept as a decision, not an inheritance (UI-SPEC §5.2): at the door, text readable immediately in a fallback beats text that might be perfect or might be absent"
  - "The menu page edit is typography-only: not one colour utility touched, because that file belongs to Phase 41"

# Metrics
duration: 12min
completed: 2026-08-11
---

# Phase 40 Plan 03: Three Faces, Each Doing Its Own Job — Summary

**Inter is wired at the root as a real custom property, `body` renders prose in the interface face instead of a geometric display face, the menu page's local escape is deleted rather than multiplied, the build now emits one stylesheet where it emitted two, and the two values an operating system reads — the installed app name and the splash colour — carry the brand and the ground, guarded by the only reader that will still be looking in a year.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 3
- **Files modified:** 5 (+382 / −25)
- **Files created:** 0 source files

## Accomplishments

- **The trap the plan existed to avoid did not spring, and the proof is in the bundle rather than in the source.** Today's Inter call had **no `variable` option**, so it returned a `className` and no custom property; writing this task as "move the import" would have produced a `--font-sans` resolving to nothing, silently, with a clean build. Inter was made symmetrical with Orbitron, and the result was read out of the emitted stylesheet: `--font-inter:"Inter","Inter Fallback"`.
- **DI-40-02, the debt plan 40-02 left, is closed.** `--font-inter` now exists, so `--default-font-family` is valid at computed-value time instead of falling to Tailwind's own tail.
- **One line with a whole-product blast radius.** `body`'s `font-family` moved from the display face to `var(--font-sans)`. Observed in the bundle: `body{background:var(--background);color:var(--foreground);font-family:var(--font-sans);-webkit-font-smoothing:antialiased}`, with `:root{--font-sans:var(--font-inter),system-ui,…}` above it.
- **DS-10 clause 1 became a directory listing.** `ls .next/static/css` returns **one** file, `5bb611c697ffeaa6.css` — a different hash from the previous `149e906c690e936f`, because the content changed. The second chunk existed only to carry the menu page's eight Inter `@font-face` rules and collapsed into the global one when the local import went. Both faces are still there: `Inter Fallback` and `Orbitron Fallback` each present.
- **Check F exists, and both its failure modes were observed rather than asserted** — see the table below.

## Task Commits

1. **Task 1: Inter becomes a variable at the root, symmetrical with Orbitron** — `517096c` (feat)
2. **Task 2: the local escape deleted, the default inverted, one stylesheet proved** — `94953ef` (feat)
3. **Task 3: the installed app name, the splash colour, and a permanent reader for a rule JSON cannot carry** — `9b9ae28` (feat)

## Verification

Per `CLAUDE.md` Environment Guardrail 1: **there is no test runner for this product, and nothing here is claimed verified because "tests pass".** Every line below was run on this tree.

| Claim | Command | Result |
|---|---|---|
| The typecheck is green | `npm run build` | exit **0**, `✓ Compiled successfully`, 57 routes |
| The gate is green | `node scripts/verify-tokens.mjs` | exit **0**, `TOKENS_OK`, six checks **A–F** |
| Inter is declared with a variable | `grep -c 'variable: "--font-inter"' layout.tsx` | **1** |
| …and the swap is a decision, stated once | `grep -c 'display: "swap"' layout.tsx` | **1** |
| …and the variable reached the BUNDLE, not only the source | `grep -o -- '--font-inter:[^;}]*' .next/static/css/*.css` | `--font-inter:"Inter","Inter Fallback"` |
| Both faces sit on `<html>` | `grep -n 'orbitron.variable' / 'inter.variable'` | one line, both present |
| The chrome colour is the product's ground | `grep -c '0a0a0a'` / `grep -c '#0A0712'` in `layout.tsx` | **0** / **1** |
| D-40-10 is written down, not assumed | `grep -c "Avenir" layout.tsx` | **2** |
| The menu page has no font import | `grep -c "next/font" menu/page.tsx` | **0** |
| …and no trace of the const | `grep -c "menuFont" menu/page.tsx` | **0** |
| …and its root div is intact | `grep -c "min-h-dvh bg-background" menu/page.tsx` | **1** |
| Exactly one `next/font` call site in `src` | `grep -rn "next/font" src --include="*.ts" --include="*.tsx"` | **1**, `layout.tsx:3` |
| `body` renders in the interface role | `grep -c "font-family: var(--font-sans);" globals.css` | **1** |
| …and no longer reads the display face | `grep -n "font-orbitron" globals.css` | **2** lines, both non-`body`: `:264` a comment, `:285` the `--font-display` declaration |
| **G5, first half** | `ls .next/static/css \| wc -l` | **1** (`5bb611c697ffeaa6.css`, was 2) |
| **G5, second half** | `grep -c ":root{" .next/static/css/*.css` | **1** |
| Both faces survive in the single chunk | `grep -c "Inter Fallback"` / `"Orbitron Fallback"` | **1** / **1** |
| The body rule in the emitted bundle | `grep -o 'body{[^}]*}' .next/static/css/*.css` | `font-family:var(--font-sans)` |
| The manifest's four values | `node -e "…m.name, m.short_name, m.background_color, m.theme_color"` | `re:sonate re:sonate #0A0712 #0A0712` |
| …and nothing else in it moved | `node -e "…m.icons.length, m.start_url, m.display, m.orientation"` | `2 / standalone portrait` |
| The old spelling is out of the manifest | `grep -c "Resonate" public/manifest.json` | **0** |
| **G7** — the reversed glyph | scan of `src/` + `public/`, artwork excluded | **1** hit, `src/app/layout.tsx:56`, on a comment line |
| **G4** held | `grep -rnE "var\(--[a-z0-9-]+, *#" src` | empty |
| Out-of-scope files untouched | `git diff --name-only` over the three commits | nothing under `src/emails/`, `src/lib/`, `src/components/SumUpCardWidget.tsx` |
| Files owned by plan 40-04 untouched | same | `package.json`, `verify-semantic-separation.mjs`, `verify-sunset-gradient.mjs` never opened |
| Nothing was deleted | `git diff --diff-filter=D --name-only` per commit | empty, all three |

### The gates proven able to fail

`ai-engineering.md` requires a new check be proven by mutation, **and requires the mutation itself be verified before its result is read** — a substitution that silently did not apply produces a false green. Each was asserted with a `grep` before the script was run.

| Mutation | Asserted applied | Result | Restored |
|---|---|---|---|
| `body`'s `font-family` → `var(--font-sanz)` | `grep -n "font-sanz"` → `:340` | **check A fails**, exit **1**, prints file, line and the unresolved name | yes, `grep -c` → 0, `TOKENS_OK` |
| `manifest.json` `name` → `"Resonate"` | `grep -n '"name"'` → `:2` | **check F fails**, exit **1**, prints `name is "Resonate", expected "re:sonate"` | yes, `grep -c "Resonate"` → 0 |
| `public/manifest.json` moved aside | file absent | **exit 2**, `FATAL`, **no tick printed at all** — a refusal, not a verdict | yes, four values re-read intact |

## Deviations from Plan

### 1. [Rule 3 — the gate went red on CORRECT code, which is the one way a gate gets switched off] Check A knew two origins for a name and not the third

- **Found during:** Task 2, immediately after `body` was retargeted onto `var(--font-sans)`.
- **Issue:** `verify-tokens.mjs` check A asserts every `var(--x)` in the token file resolves to a `:root` declaration or to a `next/font` variable. `--font-sans` is declared in `@theme inline`, so the gate reported it as resolving to nothing — `TOKENS_FAIL`.
- **Measured before deciding, because the alternative reading was that the plan had just introduced a silent failure:** Tailwind **emits** every `@theme` name into `:root` of the built stylesheet. Read from the artefact: `:root{--font-sans:var(--font-inter),system-ui,…}`, and `body{…font-family:var(--font-sans)…}`. **The product is right; the gate's model was incomplete.**
- **Why the hole could not show before:** until this commit no plain CSS rule in `globals.css` referenced a `@theme` name. The moment `body` did, a correct file went red.
- **Fix:** check A accepts a third origin — names declared in the `@theme` block — kept as its own set so checks B, C and D still read `:root` and only `:root`. **Not a loosening, and proven so:** `var(--font-sanz)` still fails with file and line. The half-rename between `@theme` and `:root` remains check B's job, untouched.
- **Commit:** `94953ef`.

### 2. [Rule 1 — a criterion this plan's own first commit falsified] The glyph's line number moved from 16 to 56

- **Found during:** Task 1, after inserting the font docblock above the metadata block.
- **Issue:** The plan pins the reversed glyph to `src/app/layout.tsx:16` in three places, including two acceptance criteria and the check-F specification. Writing the promoted three-role comment above the font calls pushed the metadata docblock down: the glyph now sits at **`:56`**.
- **Fix:** check F asserts the **file** and that the hit is on a **comment line**, and **prints** the line it found. It does not pin a number. A gate fixed to a line would have been invalidated by the very commit that wrote it — `40-PATTERNS.md` §4.3's failure mode, which this repository has already paid for twice.
- **Consequence for readers:** any later document quoting `layout.tsx:16` is quoting a line that no longer exists. The rule's documentation did not move file, only line.

### 3. [Finding — two acceptance criteria were mismeasured in the plan, and both hold on their intent]

Neither is a defect; both are recorded so a verifier does not read a mismatch as a gap.

| Criterion as written | Actual | Why it holds |
|---|---|---|
| `grep -c "re:sonate" src/app/layout.tsx` → **4** (unchanged) | **5**, before *and* after | The plan counted the four `title` values and missed the pre-existing comment line that states the rule. `git show HEAD:src/app/layout.tsx \| grep -c` on the base commit also returns 5 — **"unchanged" is exactly true**, the number was not |
| `grep -rn "next/font" src \| wc -l` → **1** | **3** | Two are prose inside `globals.css` comments (`:264`, `:280`), left by plan 40-02. Restricted to code — `--include="*.ts" --include="*.tsx"` — it is **1**, `layout.tsx:3`. The intent, one call site, holds exactly |
| `grep -c "font-orbitron" src/app/globals.css` → **1** | **2** | `:285` is the `--font-display` declaration (intended); `:264` is a comment sentence about how `next/font` works. `body` no longer reads it, which was the point |

### 4. [Finding — `grep -c ":root{"` counts lines, and minified CSS is one line]

The emitted stylesheet contains **two** `:root` rules: Tailwind's own (carrying `--font-sans`, `--font-mono` and the default colour scale) and this project's token block. `grep -c` returns **1** because the whole file is a single line. **The criterion's own wording is the intent** — *"exactly one **file** in it declares `:root`"* — and that is satisfied: both rules live in the same chunk, so a document carries the whole set or none of it. Recorded because a reader running `grep -o` will see two and may think the gate lied.

## Authentication Gates

None. No credential, no login, no external service was touched.

## The §5.5 finding the plan asked for, verified rather than repeated

`40-UI-SPEC.md` §5.5 requires `text-transform: none` **on the element itself** for the composed wordmark, because `text-transform` inherits and 43 files carry `uppercase`. Measured on this tree:

- **No text wordmark component exists.** The wordmark is rendered as **artwork** — `public/images/logo-white.png`, used at `src/app/page.tsx:39` (and in two email layouts).
- **Every element rendering a format name already carries `normal-case` explicitly**, through `FormatMarker` and its call sites — `FormatFilterRow.tsx:48,115`, `FormatsCatalogue.tsx:74,469`, and the same treatment in `EventTabs.tsx:160-168`, `CreateFormatModal.tsx:366`, `RetireFormatDialog.tsx:293-295`. That is Phase 36's precedent working.

So **§5.5 has nothing to fix here**, and it is a contract **Phase 41 inherits** the day it builds a *text* wordmark. Written down because an unexplained absence reads as an omission.

## Criterion 4 does not close DS-06 — stated plainly

DS-06's own word is **everywhere**. This phase's criterion 4 covers page titles, social previews and the installed app name, all of which now read `re:sonate`. **A tick there must not be read as closing DS-06.** `40-UI-SPEC.md` §6.4 enumerates **25 further `Resonate` literals in 15 files**; three classes are unowned in v1.5 and **none was opened by this plan**:

| Class | Sites | Why it stays open |
|---|---|---|
| Wallet pass | `lib/apple-wallet.ts:82` `organizationName`, `:88` `logoText` | Visible on a member's phone, and a pass already issued is not recalled |
| Payment sheet | `components/SumUpCardWidget.tsx:113` `merchantName` | Changing a merchant name is a **payments** decision, not a typography one |
| Every email subject, body, footer — and the `From` name | `emails/**`, `lib/email.ts:28`, `cron/event-reminders/route.ts:19`, `newsletter/actions.ts:162`, `venue-reveal/reveal-party-venue.ts:575` | The `From` name is really **`RESEND_FROM_EMAIL`, an environment value set on Vercel that no commit can fix** |

The enumeration is also written into `verify-tokens.mjs`'s header, so it is in front of the next person to read the gate.

## What a green does NOT prove here — the manual observation this plan cannot make

**Editing `public/manifest.json` makes the label correct for a fresh install only.**

- On **iOS**, **no** manifest field updates after installation.
- On **Android**, `name` and `short_name` are **not** among the fields that trigger an update; `background_color` and `theme_color` are.

So check F proves **the file**, and proves nothing about the label under an icon on any home screen. **That observation is H1, it belongs to a human, and it gets one attempt per device** — once the app is reinstalled the before-state is gone. It belongs to plan 40-05's `40-RELEASE-PASS.md`. No acceptance claim in this plan implies it was verified, because it could not be.

Equally: the four grounds and the two faces have **not** been looked at on a phone, at night, by a person. Contrast is arithmetic; legibility at a dark door is an observation.

## Known Stubs

None. This plan wires no data and renders no new component. Every value it writes is live: the two font variables are on `<html>` and in the emitted CSS, the four manifest values are in the file the OS reads, and check F runs on every `npm run verify:tokens`.

## Issues Encountered

None that blocked. Deviation 1 was a gate correcting its own model on first contact with a case it had never seen — which is the gate working, three commits after it was written.

## Threat Flags

None. No route, query, input, capability, RLS policy or middleware branch was touched. The menu page edit is a deletion of a font application and does not reach its guest-token path. The three monotone guards — `venue_reveal_sent`, a payment reaching `completed`, a series progressivo — are unreachable from a typeface or a manifest. The register's dispositions held:

- **T-40-12** (the `variable`-less Inter call, a silent failure) — **mitigated and observed**: `--font-inter:"Inter","Inter Fallback"` in the emitted bundle, not merely the option grepped in source.
- **T-40-13** (the brand's name where a machine reads it) — mitigated: check F asserts all four manifest values plus the layout's chrome colour, and pins the reversed glyph to one comment line in one file.
- **T-40-14** (`manifest.json` is a public static asset) — accepted, re-checked: an app name, a description already public, two colours and two icon paths. No venue, no date, no line-up, no personal name. `start_url` and `scope` unchanged.
- **T-40-15** (the door, offline) — the number of CSS chunks dropped **2 → 1**, which *reduces* what a document must fetch. Plan 40-05 closes the orphaned-stylesheet hole.
- **T-40-16** (package installs) — **no install ran.** Inter was already a dependency of `next/font/google`, already self-hosted.
- **T-40-17** (access, payments, venue secrecy) — accepted and held.

## User Setup Required

None. No dependency, no environment variable, no external service.

## Next Phase Readiness

- **Plan 40-04 is unaffected.** `package.json`, `verify-semantic-separation.mjs` and `verify-sunset-gradient.mjs` were never opened. It inherits one useful fact: `verify-tokens.mjs` now reports **six** checks, so any banner assertion counting five is stale.
- **Plan 40-05 inherits two things:** the single CSS chunk `5bb611c697ffeaa6.css` (the hash will change with any further content edit — it is a content hash, not a build id), and **H1**, the one manual observation this phase cannot make from the repository.
- **Phase 41 inherits the whole point of this plan:** the display face is now applied **by role and by nothing else**, so **Orbitron renders nothing until a surface applies `font-display`** — and the first such surface is Phase 41's. That is the intended shape (`40-UI-SPEC.md` §5.1: the wordmark and page-level display headings only). The face stays loaded and its token stays declared.
- **Phase 41 also inherits §5.5 unspent**, to be honoured the day a *text* wordmark exists.
- **One obligation still travels:** a new token name goes into `KNOWN_TOKEN_NAMES` **in the same commit that declares it**. This plan declared no colour token, so that list is unchanged; it added `--font-inter` to `FONT_VARIABLES`' existing entry — already listed by wave 1, which is why check A could see the reference from the first moment.
- **One item stays open and unowned:** DI-40-01, the second palette in `src/emails/`. Untouched here, by fence rather than by omission.
- **No blockers.**

## Self-Check

- `src/app/layout.tsx` — FOUND
- `src/app/(public)/events/[slug]/menu/page.tsx` — FOUND
- `src/app/globals.css` — FOUND
- `public/manifest.json` — FOUND
- `scripts/verify-tokens.mjs` — FOUND
- `517096c` (Task 1) — FOUND
- `94953ef` (Task 2) — FOUND
- `9b9ae28` (Task 3) — FOUND
- `git status --short` — clean before this document was written; **`STATE.md` and `ROADMAP.md` untouched** (the orchestrator owns those writes)

**Self-Check: PASSED**

---
*Phase: 40-brand-tokens-typography · Plan 03 · Completed 2026-08-11*
*No venue, no unannounced date, no line-up, no person named: `.planning/` is tracked and this repository is PUBLIC. Roles only.*
</content>
</invoke>
