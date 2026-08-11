---
phase: 40
slug: brand-tokens-typography
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-11
sources:
  - 40-CONTEXT.md (D-40-01 … D-40-12, twelve locked decisions)
  - 36-VISUAL-SOURCE.md (the design system this phase adopts)
  - 36-UI-SPEC.md (the format-colour-is-data precedent, D-36-12)
  - .planning/REQUIREMENTS.md:119-128 (DS-01, DS-02, DS-03, DS-05, DS-06, DS-10)
  - .claude/rules/brand-visual-system.md (palette, gradient exclusivity, spelling)
  - src/app/globals.css, src/app/layout.tsx, public/manifest.json, src/app/sw.ts, next.config.ts
  - .next/static/css/*.css and public/sw.js (the BUILT artefacts, read rather than assumed)
---

# Phase 40 — UI Design Contract

> The token layer, the three typography roles, the brand's spelling where a
> machine reads it, and what a release must guarantee about a document's own
> styles.
>
> **Nothing here is designed.** Every colour, every stack and every rule is read
> out of `36-VISUAL-SOURCE.md` or `.claude/rules/brand-visual-system.md`. Every
> contrast ratio was **computed** with the WCAG 2.x relative-luminance formula on
> 2026-08-11, and every claim about the current code carries `file:line`.
>
> **What is new here is not a colour. It is the arithmetic** — the artifact was
> written for a lit desk, this product is used at a dark door, and §4 records
> four measured places where the same values need one extra rule to survive that.

---

## 0. The five rules that outrank everything below

1. **This phase adopts; it does not design.** D-40-01, owner, 2026-08-11: *«i
   colori e i layout devono essere gli stessi dell'artifact produzione»*. A
   palette, a scale or a type ramp proposed here rather than read out of the
   source is `brand-visual-system.md`'s *scrivere il brand al posto di chi lo
   possiede*, and it would ship a second visual system to compete with the one
   the owner actually uses every day.

2. **Nothing reloads a page by itself.** D-40-11. `next.config.ts:12` sets
   `reloadOnOnline: false` deliberately, with the reason written beside it;
   `src/app/sw.ts:122-123` runs `skipWaiting: true` + `clientsClaim: true`, so a
   new worker takes control of an already-open page. **DS-10 is satisfied by
   making a mixture harmless, never by reloading.** §7 is the whole of it.

3. **A semantic colour and a brand colour are two channels, even when they hold
   the same hex.** Two of the four semantics coincide in value with a brand token
   (§3.4). The separation is therefore **structural** — separate names, separate
   declarations, literal values on both sides, never `var()` from one into the
   other — because a chromatic separation does not exist to lean on.

4. **The four format identification colours do not become CSS tokens.** They are
   **data on a catalogue row** (D-36-12, FMT-05, `36-UI-SPEC.md:98-102`), applied
   through an inline `style`. Declaring `bg-mtnlb` would reintroduce the
   compile-time format constant that Phase 36 spent a migration removing, and
   would make changing a format's colour a deploy. §3.3.

5. **This phase converts no surface.** 74 `.tsx` files still use default Tailwind
   colours (measured below). They are **Phase 41's**, one whole surface at a
   time. Phase 40 builds the layer they will draw from and touches as few of them
   as it can.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | **none** — no `components.json`, no shadcn, no component library |
| Preset | not applicable |
| Component library | none — hand-written components under `src/components/` |
| Styling | Tailwind CSS v4, CSS-first config in `src/app/globals.css` (there is no `tailwind.config.*` — verified: the glob matches nothing) |
| Icon library | local — `src/components/ui/Icons.tsx` |
| Fonts (today) | Orbitron via `next/font/google` (`layout.tsx:3,8-11`), applied to `body` at `globals.css:31`; Inter scoped to one page (`(public)/events/[slug]/menu/page.tsx:2,21`) |
| Fonts (after this phase) | three roles — §5 |
| Theme | **dark only**, by declared choice (D-40-07). `globals.css:24` `html { color-scheme: dark }` |

### The shadcn gate, executed and closed by upstream — not asked

`components.json` is absent and the stack is Next.js, which is normally the
trigger to offer `shadcn init`. **It was not offered, deliberately.** D-40-01
locks the design system to one that already exists and has an owner; initialising
shadcn would install a second token set and a second palette in the same
release that exists to remove the second palette. `36-UI-SPEC.md:80` already
recorded `Tool: none` for the same reason. Registry safety gate: not applicable,
and §9 says so with its evidence.

---

## 1. What is actually on disk today

Measured on this tree on **2026-08-11**, with the commands written out so the
figures can be reproduced rather than believed.

| | | Command |
|---|---|---|
| `.tsx` files | **181** | `find src -name "*.tsx" \| wc -l` |
| files mentioning `accent` | **101** | `grep -rl "accent" src --include="*.tsx" \| wc -l` |
| files using a `*-accent*` utility | **86** | `grep -rlE "(bg\|text\|border\|ring\|from\|to\|via\|fill\|stroke\|shadow\|outline\|decoration)-accent" src --include="*.tsx"` |
| files using a default-Tailwind palette colour | **74** | `grep -rlE "(bg\|text\|…)-(slate\|gray\|…\|rose)-(50\|…\|950)" src --include="*.tsx"` |
| files carrying a brand hex | **1** — `ColorSwatchPicker.tsx` | `grep -rniE "#(0A0712\|140D20\|…)" src` |
| values declared in `globals.css:3-11` | **7**, none of them the brand's | read |
| CSS chunks emitted by the build | **2** — `.next/static/css/149e906c690e936f.css` (72 115 B, holds `:root`) and `7e7d96b1e6991756.css` (2 063 B, the menu page's Inter) | `ls .next/static/css` |
| woff2 files precached | **8** | `public/sw.js` manifest |
| documents precached | **0** | `public/sw.js` manifest — confirms `checkin-offline.md`'s gate |

**The two numbers that shape the phase are 101 and 74.** The first is already
tokenised: retargeting `--accent` is one line and reaches all of it. The second
is not tokenised at all, and is Phase 41's.

### Three defects found while measuring, each with its `file:line`

| # | Finding | Disposition |
|---|---|---|
| F1 | `globals.css:51-55` and `:68-72` declare `glow-accent` / `glow-accent-strong` with the accent hardcoded as `rgba(229, 72, 77, …)` — **the accent value written as a literal inside the token file itself**, which will not follow `--accent` when it is retargeted. **Both utilities have zero consumers** (`grep -rn "glow-accent" src` → matches only the two declarations). | **Removed**, with the reason recorded in the commit rather than silently: a glow whose colour is a literal is a DS-01 violation living in the DS-01 file. If a glow is wanted later it is re-expressed from the token, not restored. |
| F2 | `globals.css:31` binds `body` to the **display** face. This is D-40-09's defect, and it is why `menu/page.tsx:19-21` had to escape it locally with the reason written beside it — *"neutral, highly readable in low-light venues"*. | Inverted in §5. The menu's local override becomes unnecessary and is removed rather than multiplied. |
| F3 | `layout.tsx:46` `themeColor: "#0a0a0a"` and `public/manifest.json:7-8` `background_color` / `theme_color` `#0a0a0a` are the **PWA splash screen and the browser chrome**. Left alone they stay a different black from `--ground`, producing a visible seam at every app launch. | Retargeted to `#0A0712` — §6.3. This is a half-restyled screen that no surface conversion would ever reach. |

---

## 2. Spacing Scale

**Unchanged by this phase.** Tailwind's default 4px scale, already in use, already
all multiples of 4. Layout and rhythm are Phase 41's (D-40-02). Recorded so the
inventory is complete, not as new work.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | icon gaps, inline padding |
| sm | 8px | compact element spacing |
| md | 16px | default element spacing |
| lg | 24px | page gutter (`px-6`, existing) |
| xl | 32px | layout gaps |
| 2xl | 48px | major section breaks |
| 3xl | 64px | page-level spacing |

**Exceptions: none.** `min-h-11` (44px), the touch-target minimum already used at
`ColorSwatchPicker.tsx:279`, is `4 × 11` and sits inside the scale rather than
beside it.

**This phase declares no new spacing token.** A token layer that also re-opened
spacing would hand Phase 41 a moving target on the axis it owns.

---

## 3. Colour

### 3.1 The surfaces and inks — the token roles, named and valued

Read from `36-VISUAL-SOURCE.md:43-55`. Names keep the artifact's roles, as
D-40-03's discretion clause requires.

| Token | Value | Role |
|---|---|---|
| `--ground` | `#0A0712` | the page. The 60%. Also `brand-visual-system.md`'s *nero cosmico*. |
| `--surface` | `#140D20` | cards, panels, rows. The 30%. |
| `--raised` | `#1D1430` | a surface lifted above a surface — a selected row, a menu, a sheet |
| `--sunk` | `#0D0917` | a well inside a surface — an input, a code block, a track |
| `--ink` | `#F3ECFA` | primary text |
| `--ink-2` | `#D6CBE8` | secondary text |
| `--muted` | `#A493C0` | tertiary text, and — see §4.2 — **the lightest thing that may carry a boundary** |
| `--faint` | `#6E6188` | **not a text colour.** §4.1 |
| `--line-soft` | `rgba(234,217,255,.07)` | a division that must not be noticed |
| `--line` | `rgba(234,217,255,.13)` | the ordinary division between rows |
| `--line-strong` | `rgba(234,217,255,.26)` | the strongest **decorative** line. Still not a control boundary — §4.2 |

**`--soy` `#8C82A6` is not in this table.** D-40-06:
`36-VISUAL-SOURCE.md:74-77` could not determine its meaning from the stylesheet
and refused to deduce it. Open Question 2.

**No light theme.** D-40-07. `36-VISUAL-SOURCE.md:108-112` records it as a
declared choice — *«commit deliberato al mondo notturno»*. A plan that "adds the
missing light mode" is undoing a decision, not completing one.

### 3.2 The sunset scale

`36-VISUAL-SOURCE.md:57-63`. The first six are the six already public in
`.claude/rules/brand-visual-system.md`; nothing new becomes public here.

| Token | Value | |
|---|---|---|
| `--amber` | `#FFB25E` | *ultimo raggio* |
| `--orange` | `#FF7A2F` | *arancio tramonto* |
| `--pink` | `#FF5C93` | *rosa caldo*, the brand's *accento primario* |
| `--pink-soft` | `#F6B6D2` | *rosa Resonate* |
| `--violet` | `#A874E8` | *viola notte* |
| `--violet-deep` | `#5B2A9E` | **declared, never used as a foreground** — 1.90–2.16:1, §4.1 |

**The scale has exactly one editable source.** It appears in two forms that a
computer cannot share — CSS custom properties for styling, and TypeScript string
literals for the catalogue's colour control and for the value the database
stores (`formats_color_hex_check` wants `#RRGGBB`; today
`ColorSwatchPicker.tsx:103-110`). The contract is therefore:

> One of the two is the source a person edits. The other is **asserted equal to
> it by a mechanical check**, in the shape the repository already uses
> (`scripts/verify-*.mjs`, seven of them today). Two hand-maintained copies of a
> palette is how a palette acquires a seventh colour nobody decided.

The mechanism is the planner's; the contract is that a divergence **fails**
rather than being noticed later on a screen.

### 3.3 The format identification colours — data, not tokens

`36-VISUAL-SOURCE.md:65-72` assigns one to each format. **They are recorded here
and deliberately not declared as CSS tokens** (rule 4 in §0).

| Format | Seed | Where it lives |
|---|---|---|
| SunSet | `#FFB25E` | a `formats` row |
| RamaDub | `#FF7A2F` | a `formats` row |
| MotionLab | `#FF5C93` | a `formats` row |
| re:sonate | `#A874E8` | a `formats` row |

**No Tailwind utility, no CSS variable, no component constant.** The value
arrives as a hex string on a catalogue row and is applied through an inline
`style`, which is also the only thing that can work — Tailwind cannot generate a
class from a runtime value. Changing a format's colour must not require a
deploy, and this is what makes that true.

**And the identification colour is not a materials palette.** RamaDub's and
MotionLab's poster palettes are still to be designed
(`36-VISUAL-SOURCE.md:174-175`); the identification colour does not anticipate
them and nothing in the product may imply that it does.

### 3.4 The semantics — separate, and structurally so

`36-VISUAL-SOURCE.md:79-84`: *«Il fatto che siano dichiarati in un blocco a
parte, e non riusati dagli accenti di format, e' la meta' di DS-02 che si perde
piu' facilmente.»*

| Token | Value | Means |
|---|---|---|
| `--sem-crit` | `#FF6B8E` | a refusal, a destructive act, a failure |
| `--sem-warn` | `#FFB25E` | a caution, a provisional state |
| `--sem-info` | `#A493C0` | a neutral notice |
| `--sem-done` | `#9B7BE0` | a completed act |

**Three devices keep DS-02 enforceable rather than merely stated:**

1. **A distinct prefix.** `--sem-*`, so `bg-sem-crit` and `bg-surface` are
   distinguishable by a `grep` and not only by a reader's memory. A rule that can
   only be kept by remembering it is not kept — `36-UI-SPEC.md:66` already wrote
   that sentence about `text-transform`, and it applies unchanged.

2. **Literal values on both sides of the separation.** `--sem-warn: #FFB25E`, not
   `--sem-warn: var(--amber)`. This is D-40-05's disposition generalised: writing
   the value twice with the coincidence recorded is what makes separating them
   later **a value change and not a refactor**.

3. **A usage rule with a checkable form.** No surface uses a `--sem-*` token to
   identify a format, and no surface uses a brand or format colour to signal a
   state. Phase 36 wrote the sentence (`36-UI-SPEC.md:173-176`); the prefix is
   what lets a script hold it.

**Two of the four coincide in value with something else in the system, and this
was not stated anywhere before — found by computing the table:**

| Coincidence | Consequence |
|---|---|
| `--sem-warn` `#FFB25E` **is** `--amber` **is SunSet's identification colour** | An amber mark on a card is either "caution" or "this is a SunSet night", and the hue cannot tell you which. **Open Question 3.** |
| `--sem-info` `#A493C0` **is** `--muted`, the tertiary ink | Less dangerous — an info notice reading as tertiary text is a degradation, not a wrong statement. Recorded so it is not "fixed" by moving one of them without knowing the other moved. |

`--sem-crit` `#FF6B8E` and `--sem-done` `#9B7BE0` are unique to the semantic set.

**The set contains no green, and that matters downstream.** `--sem-done` is a
violet. The scanner today draws accept from `bg-green-500/90`
(`src/components/scanner/ScanFlash.tsx:78`), warn from `bg-amber-500/90` (`:91`)
and refuse from `bg-red-500/90` (`:106`). **Phase 42 inherits a semantic set with
no accept colour.** §8 states the disposition; **Phase 40 does not invent a
green**, because adding a colour to the semantic vocabulary is adding a colour to
the brand.

### 3.5 The 60 / 30 / 10 contract

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--ground` `#0A0712` | the page ground, everywhere |
| Secondary (30%) | `--surface` `#140D20`, with `--raised` `#1D1430` and `--sunk` `#0D0917` as its two neighbours | cards, panels, rows, sheets, inputs |
| Accent (10%) | `--accent`, **retargeted** — see below | the reserved-for list |
| Destructive | `--sem-crit` `#FF6B8E` | destructive confirmation and its error box, nothing else |

**`--accent: #e5484d` does not survive** (D-40-04). It is a red that appears in
neither the brand palette nor the semantic set, and it is consumed by 101 files
— which is exactly why retargeting it is one line and reaches all of them.

**`--accent` is reserved for, and only for:** the primary button fill · the
active tab label and its underline · a link inside prose · the focus ring · the
lineup pills on an event card. It is **never** used for a format marker, a chip
swatch, a chip border, or any state signal. That is the whole of DS-02 in one
sentence.

**Which colour `--accent` takes is Open Question 1 and is not decided here.**
`brand-visual-system.md` names `#FF5C93` *accento primario*;
`36-VISUAL-SOURCE.md:71` names the same `#FF5C93` MotionLab's identification
colour. D-40-05 keeps them as two tokens holding one value so the collision is
reversible in one line. **Until the owner answers, `--accent` takes `#FF5C93`**
— it is the value `brand-visual-system.md` already assigns to the role, so
taking it is adoption; taking anything else would be a choice. The moment a
different answer arrives it is one line in one file, and no consumer changes.

---

## 4. Contrast — computed, not asserted

Computed 2026-08-11, WCAG 2.x relative luminance, sRGB. **This is a dark-only
product used at night, and `nextjs-architecture.md` carries a dark-venue
accessibility gate; this section is where that gate is paid.**

### 4.1 Ink on ground

| Token | Hex | on `--ground` | on `--surface` | on `--raised` | on `--sunk` |
|---|---|---|---|---|---|
| `--ink` | `#F3ECFA` | **17.29** | **16.41** | **15.22** | **17.02** |
| `--ink-2` | `#D6CBE8` | **12.90** | **12.24** | **11.35** | **12.70** |
| `--muted` | `#A493C0` | **7.14** | **6.78** | **6.29** | **7.03** |
| `--faint` | `#6E6188` | 3.54 | 3.36 | **3.12** | 3.49 |

**`--faint` fails AA for body text on every ground** — 3.12:1 at worst, against
the 4.5:1 that WCAG 1.4.3 asks. It is **not promoted and its value is not
changed**; instead its use is constrained, because raising it would collapse the
four-step ink ramp the artifact deliberately built.

> **`--faint` is admissible only as: large text at **≥ 24px**, where the
> threshold is 3:1 and it clears on all four grounds; or a non-informational
> graphic. Where a small label is genuinely tertiary, the pairing to use instead
> is `--muted` on `--surface` — 6.78:1.**

**The 18.66px arm was removed on 2026-08-11, and the removal is the safer
reading.** This spec first wrote *"≥ 24px, or ≥ 18.66px at weight 600+"*. WCAG
2.1's *large scale* is 18pt (24px), **or** 14pt (18.66px) **bold** — and the
conventional mapping of "bold" is CSS weight **700**. §5.4 of this document caps
the type system at **600**, deliberately. So the second arm claimed a carve-out
this token system can never satisfy: at 600 the text is semibold, not bold, and
the 3:1 threshold does not apply to it.

Keeping it would have been a rule that reads as permission and fails as
protection — and it is **load-bearing for Phase 42**, which reads this ramp at
arm's length in a dark room. Where an interpretation of a standard is contested
and the consequence is legibility at the door, the contested arm goes. If the
type system ever reaches weight 700, this is one line to restore, with the
measurement redone.

`--violet-deep` `#5B2A9E` measures **2.16 / 2.05 / 1.90 / 2.12** and is
**declared but never used as a foreground or as a meaningful graphic**. Phase 36
had already excluded it from the catalogue picker at 1.99:1 against `#141414`
(`ColorSwatchPicker.tsx:98-101`); the figure is confirmed here against the real
grounds so nobody rediscovers the gap and fills it back in.

### 4.2 The finding that needs a rule the artifact does not carry

| Pair | Ratio |
|---|---|
| `--ground` vs `--surface` | **1.05** |
| `--ground` vs `--raised` | **1.14** |
| `--ground` vs `--sunk` | **1.02** |
| `--surface` vs `--raised` | **1.08** |
| `--surface` vs `--sunk` | **1.04** |
| `--raised` vs `--sunk` | **1.12** |

| Line token | over `ground` | over `surface` | over `raised` | over `sunk` |
|---|---|---|---|---|
| `--line-soft` (α .07) | 1.12 | 1.15 | 1.17 | 1.13 |
| `--line` (α .13) | 1.29 | 1.35 | 1.39 | 1.31 |
| `--line-strong` (α .26) | 1.95 | 2.02 | **2.05** | 1.96 |

**Read together: no combination of the artifact's grounds and lines reaches the
3:1 that WCAG 1.4.11 asks of a control boundary.** Elevation carries almost no
luminance (1.02–1.14), and the strongest line tops out at 2.05.

This is **not a defect in the artifact** and its values are not changed. It is
the same shape as the finding `36-VISUAL-SOURCE.md:138-143` already recorded
about the chip counts: *stesso componente, regola opposta, perche' cambia chi
guarda.* The artifact is an internal tool on a lit desk; the product is a phone
at a dark door. So the product **adds one rule the artifact does not need**:

> **The boundary of an interactive control — a text input, a select, a
> secondary/ghost button, a checkbox, a scanner target — is never carried by
> `--line*` alone.** It is carried by a border or ring of `--muted` `#A493C0` or
> lighter, which clears 3:1 on all four grounds (6.29–7.14). `--line*` remains
> correct for what it is: dividing rows, separating sections, drawing a card's
> edge where the card's *content* already says where the card is.

**Focus.** Every candidate clears 3:1 on every ground: `--ink` 15.22–17.29,
`--ink-2` 11.35–12.90, `--muted` 6.29–7.14. **The focus ring is `--ink`**, not
the accent — a ring in the accent colour is invisible against an accent-filled
button, and it is the one indicator a keyboard user has.

### 4.3 The semantics, and the rule that a fill inverts its ink

| Token | Hex | on `ground` | on `surface` | on `raised` | on `sunk` |
|---|---|---|---|---|---|
| `--sem-crit` | `#FF6B8E` | **7.36** | **6.99** | **6.48** | **7.25** |
| `--sem-warn` | `#FFB25E` | **11.20** | **10.63** | **9.86** | **11.03** |
| `--sem-info` | `#A493C0` | **7.14** | **6.78** | **6.29** | **7.03** |
| `--sem-done` | `#9B7BE0` | **5.99** | **5.69** | **5.27** | **5.90** |

**All four clear AA as ink on every ground.** A semantic used as *text*, as a
*border* or as a *glyph* is safe anywhere in the system.

**A semantic used as a FILL is not, and this is where the door will get it
wrong:**

| Fill | white on it | `--ink` on it | `--ground` on it |
|---|---|---|---|
| `--sem-crit` `#FF6B8E` | 2.71 | 2.35 | **7.36** |
| `--sem-warn` `#FFB25E` | 1.78 | 1.54 | **11.20** |
| `--sem-info` `#A493C0` | 2.80 | 2.42 | **7.14** |
| `--sem-done` `#9B7BE0` | 3.33 | 2.89 | **5.99** |

> **A semantic token used as a fill carries `--ground` as its ink. Never
> `--ink`, never white.** Light ink on any of the four fails AA — the best is
> 3.33:1 and the worst is 1.54:1.

This is not hypothetical. Today `ScanFlash.tsx:78,91,106` fills with
`bg-green-500/90` / `bg-amber-500/90` / `bg-red-500/90` and writes `text-white`
over it (`:144`). Computed from the built stylesheet's own oklch values:
green-500 `#00C950` → white at **2.22:1**; amber-500 `#FE9A00` → white at
**2.13:1**; red-500 `#FB2C36` → white at **3.81:1**. **All three already fail
AA today**, at the one surface where the room is dark and the reader is in a
hurry. Phase 42 owns fixing it; Phase 40 owes it the correct pairing, and this
is it.

### 4.4 What the current tokens measured, for the before/after

| Pair | Ratio |
|---|---|
| `--foreground #ededed` on `--background #0a0a0a` | 16.91 |
| `--muted #a1a1aa` on `--background #0a0a0a` | 7.72 |
| `--muted #a1a1aa` on `--card #141414` | 7.19 |
| `--accent #e5484d` on `--background #0a0a0a` | 5.06 |
| `--accent #e5484d` on `--card #141414` | 4.71 |
| `--card-border #262626` on `--card #141414` | **1.22** |

The new set is **not a regression on text** (17.29 vs 16.91 primary; 6.78 vs 7.19
tertiary — a 0.4 loss well above threshold) and is **an improvement on lines**
(2.05 vs 1.22). The rule in §4.2 exists because 2.05 is still not 3, not because
the new values are worse than the old.

---

## 5. Typography — three roles

D-40-08. Not invented: each face already exists in this codebase or in the
artifact's stylesheet.

### 5.1 The roles

| Role | Face | What it renders | Token |
|---|---|---|---|
| **Display** | Orbitron | the wordmark, and page-level display headings only | `--font-display` |
| **Interface** | Inter | **everything else that is prose or a control** — body, labels, buttons, form text | `--font-sans` (Tailwind's own namespace, retargeted) |
| **Data** | monospace | labels, sigle, times, counts, every figure, anything set in caps with wide tracking | `--font-mono` (Tailwind's own namespace, retargeted) |

`36-VISUAL-SOURCE.md:96-106` declares exactly this division for the artifact —
mono for *«etichette, sigle, orari, numeri»*, sans for *«prosa e titoli»*, and
`font-variant-numeric: tabular-nums` **ovunque**.

### 5.2 The stacks, and what happens when a face has not loaded

Read out of the built stylesheet, not assumed. `next/font` already generates a
metric-adjusted fallback family for each face and puts it **inside** the CSS
variable:

```
--font-orbitron: "Orbitron","Orbitron Fallback"
@font-face{font-family:Orbitron Fallback;src:local("Arial");
           ascent-override:81.50%;descent-override:19.59%;
           line-gap-override:0.00%;size-adjust:124.05%}
@font-face{font-family:Inter Fallback;src:local("Arial");
           ascent-override:90.44%;descent-override:22.52%;
           line-gap-override:0.00%;size-adjust:107.12%}
```
*(`.next/static/css/149e906c690e936f.css` and `7e7d96b1e6991756.css`, read
2026-08-11.)*

**The fallback resolves through `local("Arial")`, and Arial is not present on
Android.** So the declared stack must carry a tail past the generated fallback,
or a device without Arial falls to the browser's default serif-ish choice:

| Token | Value |
|---|---|
| `--font-display` | `var(--font-orbitron), system-ui, -apple-system, "Segoe UI", sans-serif` |
| `--font-sans` | `var(--font-inter), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--font-mono` | `ui-monospace, "SF Mono", SFMono-Regular, "JetBrains Mono", "IBM Plex Mono", Menlo, Consolas, "Liberation Mono", monospace` |

**`font-display: swap` on both webfonts, and the alternative is rejected on
purpose.** `optional` would avoid the swap but can leave the face never applied
on a slow first load. At the door, text that is readable immediately in a
fallback beats text that might be perfect or might be absent —
`checkin-offline.md`'s asymmetry, applied to a typeface. This is `next/font`'s
default; it is recorded here so it is a decision rather than an inheritance.

**Data is a system stack, and that is adoption rather than a shortcut.** The
artifact's own mono declaration (`36-VISUAL-SOURCE.md:98-100`) is
*SF Mono / JetBrains Mono / IBM Plex Mono / Menlo / Consolas* — a **system**
list, whose first entry `ui-monospace` resolves to SF Mono on Apple platforms.
Tailwind v4 already ships `--font-mono` with almost this list (present in
`:root` of the built CSS today), so the `font-mono` utility already works and
this costs **zero new bytes and zero new fetches**.

> **Read against DS-05 honestly:** the data role is one *role* with one *stack*,
> not one glyph set on every device. What DS-05 makes load-bearing — *«data
> figures align in columns»* — is guaranteed by any monospaced face plus
> `tabular-nums`, and is unaffected by which mono a device resolves.
> **The reversal costs one line:** a webfont mono loaded in the root layout,
> pointed at by `--font-mono`, with no consumer changing. Recorded so choosing
> the system stack today does not read as closing the question.

**`--font-sans` and `--font-mono` are retargeted rather than added** because
Tailwind v4 binds `html`'s `font-family` to `--default-font-family`, which is
`var(--font-sans)`. Retargeting means an element nobody styled still lands in the
interface face — which is the whole of D-40-09.

**Inter moves from the menu page to the root layout.** `menu/page.tsx:2,21`'s
local import is deleted, not multiplied. A measured side effect worth having: it
collapses the second CSS chunk (`7e7d96b1e6991756.css`, 2 063 B, eight
`@font-face`) into the global one, leaving **one stylesheet** — which is the
precondition §7 needs.

### 5.3 Figures

> **`font-variant-numeric: tabular-nums` is applied at the role, on
> `--font-mono`'s own rule and on any element carrying the data role — not
> per-component.**

Ten sites apply `tabular-nums` by hand today (`TierSelection.tsx:148`,
`DrinkMenu.tsx:105`, `GuestDrinkMenu.tsx:217`, `FormatsCatalogue.tsx:255,270,476,551,557`,
`ScannerClient.tsx:3346`, `EventForm.tsx:847`). They stay correct and are not a
migration; the point of moving the declaration to the role is that the
**eleventh** site does not have to remember.

Inter carries the `tnum` OpenType feature, so a figure set in the interface face
also aligns. **Whether Orbitron carries it is moot by contract** — no figure
column renders in the display face, because the display face renders the
wordmark and display headings only.

### 5.4 Sizes and weights

Four sizes, **two weights**. Tailwind's scale, written out so nobody looks them
up.

| Role | Class | Size | Weight | Line height |
|------|-------|------|--------|-------------|
| Display | `text-3xl` | 30px | 600 | 36px (1.2) |
| Heading | `text-base` | 16px | 600 | 24px (1.5) |
| Body | `text-sm` | 14px | 400 | 20px (1.43) |
| Label / Data | `text-xs` | 12px | 600 | 16px (1.33) |

**Weights: 400 (regular) and 600 (semibold). Nothing else.** 600 is the weight
the artifact's own wordmark uses for its second half
(`36-VISUAL-SOURCE.md:116-120`).

**The inventory this contradicts, stated rather than hidden.** Today `src`
carries four weights: `font-medium` (500) in **95 files / 397 places**,
`font-semibold` (600) in 63 / 140, `font-bold` (700) in 65 / 86, `font-normal`
in 1 / 2 — and ten size steps, led by `text-sm` (611) and `text-xs` (334).
**Phase 40 does not convert any of it.** Two weights is the contract for what
this phase writes and what Phase 41 converts toward, and 397 `font-medium` sites
is the size of that bill. Quoting the number here is the point: a two-weight rule
declared without it would be a rule nobody had costed.

### 5.5 The wordmark

`36-VISUAL-SOURCE.md:114-120`: composed `re:` + `sonate`, in the **data** face,
second half at weight 600, and one explicit rule —

> **`text-transform: none`, declared on the element itself, always.**

`text-transform` is **inherited**, so "we did not add `uppercase`" is not a
guarantee: it holds until the wordmark is mounted inside an ancestor that
applies one, and `src` has `uppercase` in 43 files. `36-UI-SPEC.md:54-66` already
made this argument for format names and resolved it by putting `normal-case`
on the component itself. **The wordmark takes the same treatment**, and so does
every element that renders a format name — `SunSet`, `RamaDub`, `MotionLab`,
CamelCase, never all caps.

---

## 6. DS-06 — the brand's spelling where a machine reads it

`brand-visual-system.md`, gate *grafia del brand*: `re:sonate` with a normal `e`,
everywhere. **The reversed `ɘ` (U+0258) is a drawn mark that lives only inside
the logo artwork** — in a `title` it produces a name search cannot find and a
screen reader pronounces as a phoneme.

### 6.1 Already correct — verified, not assumed

| Site | Value |
|---|---|
| `layout.tsx:20` `title` | `re:sonate` |
| `layout.tsx:24` `openGraph.title` | `re:sonate` |
| `layout.tsx:30` `twitter.title` | `re:sonate` |
| `layout.tsx:37` `appleWebApp.title` | `re:sonate` |

**The only `ɘ` in the tracked source is at `layout.tsx:16`, inside the comment
that explains the rule** (`grep -rn "ɘ" src public *.json *.ts` → one hit). It is
not a violation; it is the rule's own documentation.

`public/images/og-image.png` and `logo-white.png` are **artwork**, and artwork is
where the `ɘ` is allowed to live. The *text* of the social preview
(`layout.tsx:24`) already reads `re:sonate`, so DS-06's "social previews" half is
satisfied by the title, not by the picture.

### 6.2 In scope, and must change

| Site | Today | Must read |
|---|---|---|
| `public/manifest.json:2` `name` | `"Resonate"` | `"re:sonate"` |
| `public/manifest.json:3` `short_name` | `"Resonate"` | `"re:sonate"` |

This is **the installed app name** — the label under the icon on a home screen,
which is exactly the surface Phase 40's criterion 4 names and the one place the
brand is written by the operating system rather than by a page.

### 6.3 In scope, and found by measuring

| Site | Today | Must read | Why |
|---|---|---|---|
| `public/manifest.json:7` `background_color` | `#0a0a0a` | `#0A0712` | the PWA **splash screen**. Left alone, launching the installed app flashes the old black before the new ground paints. |
| `public/manifest.json:8` `theme_color` | `#0a0a0a` | `#0A0712` | the browser/OS chrome around the app |
| `src/app/layout.tsx:46` `viewport.themeColor` | `#0a0a0a` | `#0A0712` | the same, for the browser |

Not DS-06, but the same class of defect: a brand value written where no surface
conversion will ever reach it. A splash screen in the previous generation's
black is a **half-restyled screen at every launch** — DS-10's failure mode, in
the one place a surface-by-surface conversion cannot see.

### 6.4 Out of scope, enumerated so DS-06 is not ticked over them

**25 further `Resonate` literals in 15 files**
(`grep -rnw "Resonate" src public --include="*.tsx" --include="*.ts" --include="*.json"`).
Phase 40's criterion 4 covers page titles, social previews and the installed app
name. **DS-06's own word is "everywhere", which is broader**, so a tick on
criterion 4 must not be read as closing DS-06.

| Class | Sites | Owner |
|---|---|---|
| Visible product text | `(public)/tickets/[id]/page.tsx:127`, `membership/MembershipCardView.tsx:28`, `(auth)/register/page.tsx:85` | **Phase 41**, when those surfaces convert |
| Wallet pass — visible on a member's phone | `lib/apple-wallet.ts:82` `organizationName`, `:88` `logoText` | **unowned** — flagged |
| Payment sheet | `components/SumUpCardWidget.tsx:113` `merchantName` | **unowned** — flagged; changing a merchant name is a payments decision, not a typography one |
| Email subjects, bodies, footers, `alt` | `webhooks/sumup/route.ts:98`, `members/actions.ts:66,156`, `emails/member-approved.tsx:15,38,68`, `emails/registration-confirmation.tsx:20,29`, `emails/member-rejected.tsx:13,47`, `emails/components/email-layout.tsx:56,84`, `newsletter/ComposeForm.tsx:54,59,65` | **unowned** — `comms-analytics` domain, no phase in v1.5 |
| `From` name — **an environment value, not code** | `lib/email.ts:28`, `cron/event-reminders/route.ts:19`, `newsletter/actions.ts:162`, `venue-reveal/reveal-party-venue.ts:575` all default to `"Resonate <…>"`, and `RESEND_FROM_EMAIL` is set on Vercel | **unowned** — a code change does not fix it; the variable has to be edited |

The last row is the one worth carrying forward: **the brand's spelling in every
outgoing email is currently a deployment variable**, and no phase can close it
from the repository.

---

## 7. DS-03 — the gradient, made checkable

```
linear-gradient(94deg, #FFB25E 0%, #FF7A2F 30%, #FF5C93 62%, #A874E8 100%)
```

**SunSet's exclusive signature.** `36-VISUAL-SOURCE.md:86-94` records the
artifact repeating it twice in different words — *«il colore non si eredita»*,
*«il tramonto resta a SunSet»* — and showing a palette-less format's wireframe
**deliberately neutral**, with the reason written beside it: *declare the
emptiness instead of filling it with SunSet's gradient*.

**"Appears on SunSet surfaces and nowhere else" becomes checkable through four
clauses, not through intent:**

1. **Declared once.** The gradient exists as exactly one token, `--grad-sunset`,
   in the token file. Its four-stop `94deg` string appears in **exactly one
   place** in the repository.

2. **Applied through exactly one name.** No component composes the stops itself.
   A surface either uses the one utility that carries `--grad-sunset` or it does
   not have the gradient.

3. **The allow-list is explicit, and today it is empty.** No SunSet surface
   exists yet. The check is therefore *"the number of files applying
   `--grad-sunset` is zero"*, and **adding the first one is a decision that
   edits the list**, not a diff nobody reads.

4. **The check excludes its own declaration site**, or it matches the very line
   that forbids the thing — the defect `ColorSwatchPicker.tsx:22-27` already
   records, where *a check whose only match is its own prohibition is a check
   that gets ignored the third time it goes red*.

**The check must be specific to the four-stop signature, not to the word
"gradient".** 48 files use `accent/` opacity utilities and several compose
two-stop fades — `tickets/[id]/page.tsx:119` `bg-gradient-to-br from-accent/30
to-accent/5`, `dashboard/page.tsx:407,449,514`, and six more. Those are **accent
fades, not the sunset gradient**, and they will follow `--accent` wherever it is
retargeted. A check that fired on "gradient" would go red on all of them, be
declared noisy, and be switched off.

**And the input stays inexpressible.** `ColorSwatchPicker` offers flat swatches
only, with no free hex field and no picker, so there is no input through which
another format could acquire the gradient — *a constraint that cannot be
expressed cannot be violated* (`ColorSwatchPicker.tsx:9-27`). Phase 40 does not
relax it.

---

## 8. DS-10 — the version boundary, and why it is Critical

**Classification: Critical.** This section touches the door.

### 8.1 What is actually true today, measured

| Fact | Evidence |
|---|---|
| `reloadOnOnline: false`, **deliberately**, with the reason in the file | `next.config.ts:8-12` |
| A new worker takes control of an already-open page immediately | `src/app/sw.ts:122-123` — `skipWaiting: true`, `clientsClaim: true` |
| Old precache entries are deleted when the new worker installs | `src/app/sw.ts:119` — `cleanupOutdatedCaches: true` |
| `skipWaiting`/`clientsClaim` *«update the WORKER on the next visit; they do not empty the buckets the old worker filled»* | `src/app/sw.ts:99-104` — already written down |
| The precache carries **zero documents** — chunks, 2 CSS, 8 woff2, `public/` | `public/sw.js` manifest, read 2026-08-11; matches `checkin-offline.md`'s gate |
| Every offline document comes from a runtime `NetworkFirst` bucket, 24 h / 32 entries, warm only from a previous online visit | `checkin-offline.md`, gate *l'indirizzo che si scalda e' quello che si usera'* |
| **All tokens live in one stylesheet today** — `:root{--background:#0a0a0a;…}` is in `149e906c690e936f.css`, the root layout's chunk; the second chunk holds only the menu page's `@font-face` | `.next/static/css/*.css`, read 2026-08-11 |
| `deploymentId` is **not set** | `next.config.ts:16-35` — absent |

### 8.2 The failure DS-10 names, in this codebase

**A document holding one generation of styles while fetching another** (D-40-12).
Two shapes:

- **The mixture.** An already-open document, now controlled by the new worker,
  client-side-navigates to a route whose CSS chunk is new. New chunk + old
  `:root` → a `var(--ground)` that resolves to **nothing**. Not "old colours" —
  *no* colour. That is the flash of unstyled content DS-10 forbids.
- **The orphan, and it lands on the door.** Night N−1: `/door` is opened online
  and its document enters the 24 h runtime bucket, naming `abc.css`. A release
  ships; the new worker installs and `cleanupOutdatedCaches` removes `abc.css`
  from the precache. Night N, within 24 h, radio off: the cached document is
  served, its `<link>` names a stylesheet that is no longer on the device and
  cannot be fetched. **An unstyled door, in a dark room, in front of a queue.**

### 8.3 The contract

**What a document must guarantee about its own styles:**

1. **One file.** Every token is declared in **one stylesheet loaded by the root
   layout**. A document then has the whole old set or the whole new set, and
   never half of either. This is true today by accident; this phase makes it a
   rule, and §5.2's removal of the menu page's local font import moves the
   product *toward* it rather than away.
2. **No component carries a brand value as a `var()` fallback.**
   `var(--ground, #0A0712)` looks like safety and is the half-state made
   permanent — the one place that keeps working while everything around it
   changes generation. **The single sanctioned exception** is a token that is
   *new in this release*, bridged for exactly one release as
   `var(--new, var(--old))`.
3. **Token names are additive within a release.** A name any shipped document
   still reads is not deleted in the next release; it is emptied of consumers
   first and removed second. A rename is a removal wearing a friendly word.
4. **A document and the stylesheet it names are evictable only together.**
   §8.2's second shape is exactly this rule being broken.

**What the user must never see:**

- a screen where some regions carry the new ground and others the old one;
- a flash of unstyled content — text on nothing, because a `var()` resolved to
  nothing;
- **a reload the person did not ask for.** At the door this is the whole point:
  a platform-initiated reload during a scan tears down the camera stream, the
  selected party and the in-memory undo list (`next.config.ts:8-11`), and
  *rifiutare un ospite valido e' peggio che ammetterne uno doppio, perche' il
  primo errore avviene davanti a una fila.*

**What *is* permitted, and the distinction is the whole of D-40-11.** A **hard
navigation on a link the person tapped** is not a reload; it is the navigation
they asked for, served whole. This is precisely what Next's version-skew
mechanism produces: `deploymentId` appends `?dpl=<id>` to asset URLs
(`node_modules/next/dist/shared/lib/deployment-id.js`,
`getDeploymentIdQueryOrEmptyString`), the client sends `x-deployment-id` on RSC
requests
(`node_modules/next/dist/client/components/router-reducer/fetch-server-response.js:176-178`),
and a mismatch forces an MPA navigation instead of stitching two generations
together. Next 16.1.6, read from the installed tree; the config key exists at
`node_modules/next/dist/server/config-shared.d.ts:886`.

> **It never fires on the door**, because the door does not navigate — someone
> opens `/door` and stays there. The mechanism protects the surfaces that click
> around, and is silent on the one surface that must not be interrupted. That
> asymmetry is what makes it admissible under D-40-11.

**Preference order for the planner, and it is not a menu.** *Impossible* beats
*visible*: a token layer that cannot produce a mixture needs no notice, and a
notice is a component, and components are Phase 41's. Choose a mechanism that
satisfies §8.3's four clauses **before** choosing one that tells the user about
a boundary. The exact mechanism inside Serwist's structure is the planner's
(D-40-12, Claude's Discretion), subject to D-40-11.

### 8.4 If a boundary must be *visible* — the copy, and where it may not appear

Only if §8.3 cannot be met structurally.

| | |
|---|---|
| Copy | **`A new version is ready.`** / `It will be used the next time you open the app.` |
| Form | inline, dismissible, **never modal**, never covering content |
| Action | at most one, `Reload now` — **user-initiated, therefore permitted** |
| **Never appears on** | `/door`, `/admin/scanner`, or any surface with a camera stream or an unsynced queue. Not deferred there — **absent**. |
| Never says | "Please refresh", "Your app is out of date", or any wording that reads as an error. A release landing is not a fault of the person reading. |
| Silent failure | the notice must be distinguishable from every other message on screen. `meta-gates.md` records the newsletter's *"Qualcosa e' andato storto"* as the precedent not to repeat. |

### 8.5 How this gets proved, in a repository with no test runner

There is no test runner for the product — no `test` script in `package.json`, no
`*.test.*` or `*.spec.*` outside `node_modules`. **Nothing below may be called
verified because tests pass.** The admissible proofs are: `npm run build` (which
is the typecheck), a source assertion at a named `file:line`, a computed number,
a DevTools reading, or a written manual observation.

| Claim | Proof |
|---|---|
| One stylesheet holds every token | `ls .next/static/css` after `npm run build`, plus a `grep` for `:root{` across the emitted CSS — **one file matches** |
| No `var(--token, #hex)` fallback anywhere | mechanical `grep`, in the shape of the seven `scripts/verify-*.mjs` already in the repo |
| The gradient's allow-list is empty | mechanical `grep`, excluding the declaration site (§7 clause 4) |
| `manifest.json` reads `re:sonate` and `#0A0712` | read the file; then install the PWA and look at the home screen and the splash |
| Contrast | the numbers in §4, recomputable from the hexes |
| **The version boundary at the door** | **a written manual observation, and it belongs in the end-of-v1.5 batch.** Warm `/door` online on the device; ship a release; return within 24 h with the radio off; open `/door`. **It renders fully styled, or it does not render at all. It never renders unstyled, never renders half, and never reloads itself.** |

The last row is `39-DOOR-PASS.md`'s shape and should join that batch rather than
inventing a second sitting — `STATE.md` records the end-of-v1.5 sitting already
absorbing the phase 38 and 39 human procedures.

---

## 9. Copywriting Contract

**This phase builds no surface, so it introduces almost no copy — and saying
which strings it does own is the point.**

| Element | Copy |
|---------|------|
| Primary CTA | **none.** This phase adds no control. |
| Installed app name | **`re:sonate`** — `manifest.json:2` `name`, `:3` `short_name` |
| App description | `motion music hub` — unchanged, already correct at `manifest.json:4` and `layout.tsx:21` |
| Page / preview titles | `re:sonate` — unchanged, already correct at `layout.tsx:20,24,30,37` |
| Wordmark, composed | `re:` + `sonate`, data face, second half weight 600, `text-transform: none` on the element |
| Format names | `SunSet` · `RamaDub` · `MotionLab` · `re:sonate` — CamelCase, rendered literally, **no CSS transform** |
| Empty state | **none introduced.** A token layer has no empty state; every surface keeps the empty states it has. |
| Error state | **none introduced.** |
| Destructive confirmation | **none.** This phase adds no destructive action and no monotone switch. The three monotone guards (`venue_reveal_sent`, a payment reaching `completed`, a series progressivo) are untouched — a token cannot reach any of them. |
| Version notice, **only if §8.3 fails** | `A new version is ready.` / `It will be used the next time you open the app.` — rules at §8.4 |

**Language:** English, matching the interface (`ROADMAP.md`, owner decision: the
interface stays English only this milestone). This differs from the *materials*,
which are British English with `Thursday 18 Sept` date forms — that gate governs
posters, not the app.

**Sound:** no string, token name, comment or swatch label anywhere in this phase
describes what a format *sounds like*. RamaDub, MotionLab and re:sonate have no
written manifesto, and *«la grafica non puo' alludervi»*
(`sound-manifesto.md`; the precedent is at
`20260809003000_party_credits.sql:77-81` and again at
`ColorSwatchPicker.tsx:54-58`). A token named `--warm`, `--deep` or `--club`
would break this rule in the one file every surface imports.

---

## 10. Accessibility Contract

- **Contrast is computed, in §4, not asserted.** Where a pairing fails, the
  failing number is printed and the pairing to use instead is named. Nothing was
  silently promoted and no artifact value was changed to make a number look
  better.
- **`--faint` is not a small-text colour.** 3.12–3.54:1. Constrained, not
  raised — §4.1.
- **A control's boundary is never `--line*` alone.** No ground/line combination
  reaches 3:1 — §4.2. Boundaries use `--muted` or lighter.
- **The focus ring is `--ink`**, which clears 3:1 on all four grounds
  (15.22–17.29), and is never the accent — an accent ring on an accent button is
  no ring at all.
- **A semantic used as a fill carries `--ground` as its ink**, never white —
  §4.3, where every light-ink pairing fails.
- **Colour is never the only channel.** Inherited from `36-UI-SPEC.md` and not
  weakened here: a format is identified by its **name as text**, state by
  `aria-current` plus ground and ink, a retired row by the word `Retired`, a
  colour control's selection by a ring **plus a glyph**.
- **`color-scheme: dark`** stays on `html` (`globals.css:24`), so native
  controls, scrollbars and form widgets render dark rather than punching a white
  rectangle into a dark page.
- **Touch targets ≥ 44 × 44px** wherever the input is a finger. Unchanged; this
  phase adds no target.
- **Reduced motion:** this phase adds no animation. `flash-in`
  (`globals.css:57-66`) has exactly one consumer, `ScanFlash.tsx:135`, and is
  **not touched** — it is the door's feedback and it belongs to Phase 42.
- **Type is not shrunk to fit the new ramp.** Body stays 14px minimum; the
  `text-[10px]` at `ScannerClient.tsx:3346` is the door's and is Phase 42's.

---

## 11. What Phases 41, 42, 44 and 45 inherit

A token set chosen only for the screens that exist today gets re-opened twice
(`40-CONTEXT.md` §Phase Boundary). Stated explicitly so it does not have to be
inferred:

| Phase | What it takes from here | What it must not expect |
|---|---|---|
| **41 — primitives & layout** | the four grounds, the four inks, the three line weights, the three type roles, the two weights, `--accent` and its reserved-for list, §4.2's boundary rule | **no spacing token, no component, no breakpoint.** Layouts are D-40-02's, i.e. 41's. |
| **42 — scanner** | the semantic set and §4.3's fill-inverts-ink rule; the dark-room numbers in §4 | **an accept colour.** The set has none — §3.4, Open Question 3. And **no behavioural change**: flash timing, haptics, auto-return, torch, offline verdict and undo are a safety surface. |
| **44 — the calendar comes inside** | `--font-mono` + `tabular-nums` for every date, progressivo and count; the four grounds for a dense grid; the format identification colour **as data on a row**, never as a class | a per-format *materials* palette. It does not exist for RamaDub or MotionLab and the identification colour does not anticipate it (`36-VISUAL-SOURCE.md:174-175`). |
| **45 — production sections** | the same, plus §3.4's semantic separation for stage badges (*mapped / verified / contacted / acquired*) | a colour meaning "acquired". The stage is **text**, per `venue-acquisition.md`'s gate *lo stato prima del nome*; a hue that encoded it would be a stage nobody could read. |

**One rule crosses all four.** `36-VISUAL-SOURCE.md:147-158` lists what does
**not** cross from the artifact: grid-safe zones, the scrim construction, the
publication order and its inversion in the grid, the delivery formats, and
**Anton and Space Mono — the *poster* faces, not the interface's**. Confusing
those is named there as *«l'errore piu' facile di tutta questa lettura»*.
Neither Anton nor Space Mono appears anywhere in this contract, and neither may
appear in a phase that inherits it.

---

## 12. Repository Safety

- **`.planning/` is tracked and this repository is public.** Everything in this
  file is published irreversibly.
- **No venue name, no unannounced date, no line-up, no personal name appears
  here.** `36-VISUAL-SOURCE.md:160-163` records that the artifact's mockups carry
  all three and that none of it was copied into `.planning/`; nothing was copied
  here either. Roles, never people (`ai-engineering.md`, gate *la pianificazione
  e' pubblica*).
- **Every colour in this document was already public** before it was written —
  the six sunset values are committed in `.claude/rules/brand-visual-system.md`,
  and the grounds, inks, lines and semantics were published in
  `36-VISUAL-SOURCE.md` on 2026-08-10. **This phase publishes no new brand
  material.**
- **"The same layouts" means the same construction, never the same content**
  (D-40-03).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | **none** — shadcn is not initialised, and initialising it is refused by D-40-01 (see §Design System) | not applicable |
| third-party | **none declared** | not applicable |

No `components.json` (verified absent), no component-library dependency in
`package.json` (verified: 21 runtime dependencies, none a UI kit), and no
third-party registry is introduced. **The vetting gate did not run because there
is nothing to vet** — recorded as evidence, not as intent.

---

## Open Questions — for the owner, not for a planner

None of the three blocks planning. Each would change a **value**, not a
structure.

| # | Question | Consequence of leaving it open |
|---|---|---|
| **1** | **The primary accent and MotionLab share `#FF5C93`.** `brand-visual-system.md` calls it *accento primario*; `36-VISUAL-SOURCE.md:71` calls it MotionLab's identification colour. | D-40-05 holds them as **two tokens, one value**, so separating them is a one-line value change and not a refactor. `--accent` takes `#FF5C93` in the meantime because that is the value the brand gate already assigns to the role. **Until answered, a pink primary button and a MotionLab mark are the same hue in different roles** — DS-02 is held by the reserved-for list in §3.5 and by nothing else. |
| **2** | **`--soy` `#8C82A6` — what is it for?** `36-VISUAL-SOURCE.md:74-77` could not determine it from the stylesheet and refused to deduce it. | D-40-06 leaves it out of the token set. Nothing in this phase needs it. The same grey **is** offered by the catalogue picker as its deliberate neutral (`ColorSwatchPicker.tsx:109`), on its own merits and under a different name — the two must not be merged before the answer arrives. One line to add if it has a meaning. |
| **3** | **`--sem-warn` `#FFB25E` is also `--amber`, which is also SunSet's identification colour. And the semantic set contains no green.** Raised by computing §3.4's table; not recorded anywhere before. | Same disposition as Q1: **two names, literal values on both sides, the coincidence written down.** Two consequences while it is open — (a) an amber mark cannot tell a reader "caution" from "this is a SunSet night" by hue alone, so anything amber carries text; (b) **Phase 42 inherits no accept colour**, and until the owner answers, the door keeps `ScanFlash.tsx`'s current green **unchanged** rather than being given a violet accept or an invented green. Adding a colour to the semantic vocabulary is adding a colour to the brand. |

---

## Verification Notes for the Planner

1. **`npm run build` is the only automatic gate, and it is the typecheck.**
   `package.json` has no `test` script. A green build says the types agree; it
   says nothing about a colour.
2. **`src/types/database.ts` is not parameterised into any of the four Supabase
   clients** (`STATE.md`), so a green build is narrower than it looks
   everywhere — not only here.
3. **Structural `grep` gates are the repository's established form of proof** —
   seven `scripts/verify-*.mjs` today, and `verify-media-strip.mjs:1-35` is the
   model, including its *what a green does NOT mean* section. The **four** gates
   this phase wants (§7 gradient allow-list, §8.5 single-stylesheet, §8.5
   no-`var()`-fallback, and §3.4's separation gate below) should follow it, and
   each should say what its green does not cover.

   **§3.4's gate was missing from this list until 2026-08-11, and its absence was
   the loop this document left open on itself.** §3.4 argues that the `--sem-*`
   prefix *"is what lets a script hold it"* — and then commissioned no script.
   DS-02 is the half of this phase that is easiest to lose silently, because
   nothing breaks when a semantic drifts into a brand colour: the screen still
   renders, and a state just starts looking like a format. The gate must assert
   **both directions**:
   - no `--sem-*` token is used where a format is identified, and
   - no brand or format token is used to express a state.

   And it must say what its green does **not** mean: a `grep` reads declarations,
   not intent, so it cannot see a semantic expressed as a raw hex, nor a format
   colour reached through a variable renamed on the way. Those stay human.
4. **Two things here are provable only by a human, and both belong in the
   end-of-v1.5 batch:** the installed app's name and splash colour on a real home
   screen (§6.2, §6.3), and the version boundary at the door with the radio off
   (§8.5, last row). Collect them; do not substitute a build for them.
5. **The blast radius is the whole product.** `globals.css` is the only file in
   this phase whose consumers are every surface. `--accent` reaches 101 files
   with one line — which is the cheap half. The 74 default-Tailwind files are
   **not** this phase's, and a plan that converts them has taken Phase 41's work
   and its risk.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

*Phase 40 — written 2026-08-11. Every contrast ratio computed, with its ground
named, from the WCAG 2.x relative-luminance formula. Every claim about the
current code carries `file:line`, read from this tree and from the built
artefacts in `.next/` and `public/sw.js` rather than from memory or from a
document that may be stale. Contains no venue under negotiation, no unannounced
date, no line-up and no personal name: `.planning/` is tracked and this
repository is public.*
