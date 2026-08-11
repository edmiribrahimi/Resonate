---
phase: 41
slug: shared-primitives-three-tier-layout
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-11
extends: 40-UI-SPEC.md
sources:
  - 41-CONTEXT.md (D-41-01 … D-41-20, twenty locked decisions)
  - 41-RESEARCH.md (the measured photograph, tree at 4be22f1)
  - 41-VALIDATION.md (G1–G5, H41-1…H41-6; G5's threshold was blocked on this file)
  - 40-UI-SPEC.md (the contract this one extends — §4 contrast, §4.2 control boundary, §5 type roles)
  - 40-CONTEXT.md (D-40-01 … D-40-13, still binding)
  - .planning/REQUIREMENTS.md (DS-07, DS-08, DS-09, RESP-01, RESP-02, RESP-03, RESP-04)
  - .claude/rules/brand-visual-system.md (palette, gradient exclusivity, spelling — adopted, never re-derived)
  - src/app/globals.css, and the tree, measured 2026-08-11
---

# Phase 41 — UI Design Contract

> The three tiers, the container maximum, the touch-target number, and the class
> contract of every primitive this phase extracts.
>
> **This document does not restate Phase 40.** The four grounds, the four inks,
> the three line weights, the three type roles, the two weights, `--accent` and
> its reserved-for list, and §4.2's control-boundary rule are inherited whole
> (`40-UI-SPEC.md:902`). What is added here is what Phase 40 explicitly told
> this phase to bring: **spacing rhythm, components, and breakpoints** — *"no
> spacing token, no component and no breakpoint"* was Phase 40's disclaimer, and
> this is where the three arrive.
>
> **Every contrast figure below was computed on 2026-08-11** with the WCAG 2.x
> relative-luminance formula, sRGB, and reproduces `40-UI-SPEC.md` §4.1 exactly
> where the two overlap. Every count carries the command that produced it or a
> `file:line`.

---

## 0. The seven rules that outrank everything below

1. **This phase invents no brand.** Palette, the four-stop sunset gradient and
   its exclusivity to SunSet, the CamelCase format names, and `re:sonate` with a
   **normal `e`** are decided in `.claude/rules/brand-visual-system.md`. The
   reversed glyph `ɘ` lives only inside the logo artwork. Nothing here proposes a
   colour.

2. **Contrast is arithmetic.** Any pairing this document introduces carries its
   computed ratio and the clause it is measured against. An adjective is not a
   measurement.

3. **A gate that goes red on a correct file gets switched off**, and then it
   guards nothing (`verify-media-strip.mjs:51-62`). Every value this document
   fixes ships **with its exemption list already written** — §13. An exemption
   discovered on a gate's first red run is an exemption nobody trusts.

4. **No plan ships a primitive without converting a surface onto it in the same
   plan** (D-41-04). The tree already records the failure:
   `src/components/ui/Skeleton.tsx` is correct, complete and has **zero
   importers**, while **102** hand-rolled `animate-pulse` blocks live in **20**
   files.

5. **Width may change layout, never membership.** The server decides which
   navigation entries exist (`(work)/layout.tsx`, `getAccessContext()`); CSS
   decides how they sit. A tab filtered out in JavaScript at a width is a second
   author for the rule `StaffNav.tsx:11-23` already wrote — *hiding a nav item is
   not protecting a route*.

6. **The viewport is never read in JavaScript.** `matchMedia`,
   `useSyncExternalStore` and `innerWidth` occur **zero** times under `src/`
   today (measured). This phase adds none. Every tier difference in this document
   is a CSS media query, evaluated by the browser at paint, so the server HTML is
   correct at every width and there is no flash of the tier you guessed wrong.

7. **Phase 42 is the scanner and the door.** `src/app/(admin)/**/scanner/**`,
   `src/components/scanner/**`, `src/app/(admin)/door/**` are not opened by this
   phase for anything beyond a read, and every gate here exempts them **by path,
   with the reason in the script**.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | **none** — no `components.json`, no shadcn, no component library. Refused by D-40-01 and re-refused by D-41-20 |
| Preset | not applicable |
| Component library | none — hand-written primitives under `src/components/ui/` (3 files today, and the folder that grows) |
| Styling | Tailwind CSS **4.2.1**, CSS-first config in `src/app/globals.css`. No `tailwind.config.*` exists |
| Icon library | local — `src/components/ui/Icons.tsx` |
| Fonts | three roles from Phase 40: display Orbitron, interface Inter, data system mono |
| Theme | dark only (D-40-07) |
| New packages this phase | **none** (D-41-20). Every mechanism used below is a platform feature or already present in Tailwind 4.2.1, verified in the installed bundle |

---

## 1. What is on disk today, measured

Re-measured on this tree on **2026-08-11**. Figures the plan will quote should
be re-measured before quoting — the tree moves.

| | | Source |
|---|---|---|
| `.tsx` files under `src/` | **181** | `find` |
| files with any responsive prefix | **23** (`sm:` 22 files / 44 uses; `lg:` 3 files / 5 uses; `md:`, `xl:`, `2xl:` **zero**) | `grep -rlE "\bsm:"` etc. |
| `min-h-dvh pb-24` | **47 exact**; `pb-24` **54 uses in 49 files** | `grep -rho` |
| `px-6 pt-12` | **44 exact**; `px-6` gutters **148** | `grep -rho` |
| card shell `rounded-* border border-card-border bg-card` | `2xl` **88** · `xl` **82** · `lg` **12** · `full` **3** | `grep -rho` |
| all radii, tree-wide | `full` 268 · `xl` 228 · `lg` 159 · `2xl` 138 · `md` 5 · `t-2xl` 4 | `grep -rho` |
| pill button `py-` values | `0.5` 36 · `3` 33 · `2` 33 · `1.5` 31 · `2.5` 24 · `1` 15 | `grep` on `rounded-full` runs |
| `<h1>` | **52 in 38 files**; `text-3xl font-bold tracking-tight` in **34** across 6 margin prefixes | `grep -rhoE "<h1[^>]*className"` |
| section heading variants | 10 distinct strings across ~44 uses; plurality `mb-3 text-sm font-semibold uppercase tracking-widest text-muted` (15) | `grep -rhoE` |
| weights in use | `font-medium` (500) **397** · `font-semibold` **140** · `font-bold` (700) **86** | `grep -rho` |
| **`bg-accent` and `text-white` on the same line** | **64** | `grep -rn "bg-accent" \| grep -c "text-white"` |
| `focus:outline-none` | **70**, with `focus:ring-accent/50` (43) and `focus:ring-accent` (26) | `grep -rho` |
| `aria-current` | **5** in the whole tree | `grep -rn` |
| `matchMedia` / `useSyncExternalStore` / `innerWidth` | **0** | `grep -rn` |
| `text-[10px]` / `text-[11px]` | **27 / 10**, across **12 files**, of which **one** is the scanner (Phase 42's) | `grep -rlE` |
| `min-h-11` — the only touch-target prior art | **2**, both in `(public)/events/FormatFilterRow.tsx:115,162` | `grep -rn` |

**Three of these lines are accessibility findings, not inventory**, and this
phase closes all three:

| # | Finding | Computed | Closed by |
|---|---|---|---|
| **A1** | **75 form inputs carry `border border-card-border`.** `--card-border` aliases `--line`, which reaches at most **1.39:1** over any ground, against WCAG 1.4.11's **3:1** for a control boundary | §5.2 | the `--control` token, §5.2, and the input primitives, §8.6 |
| **A2** | **64 lines fill with `--accent` and write `text-white` over it — 2.91:1**, against WCAG 1.4.3's 4.5:1. It is the primary button, product-wide | §5.3 | the accent-fill ink rule, §5.3, and the Button primitive, §8.5 |
| **A3** | **70 sites kill the focus outline** and 69 replace it with an accent ring — the one indicator a keyboard user has, in the one colour that disappears against an accent-filled button (**2.52:1**) | §5.4 | the focus contract, §5.4 |

None of the three was invented here. A1 is `40-UI-SPEC.md:381-386` handed
forward and named by D-41-10. A2 and A3 were found by computing the table Phase
40 wrote for semantics (§4.3) against the accent, which Phase 40 did not do.

---

## 2. The three tiers

### 2.1 The boundaries — Tailwind's defaults, two of them

Read from `node_modules/tailwindcss/theme.css:327-331` (4.2.1): `sm` 40rem/640px,
`md` 48rem/768px, `lg` 64rem/1024px, `xl` 80rem/1280px, `2xl` 96rem/1536px.

| Tier | Range | Prefix that opens it |
|---|---|---|
| **Phone** | `< 768px` | unprefixed (mobile-first, the tree's existing direction) |
| **Tablet** | `768px – 1023px` | **`md:`** |
| **Desktop** | `≥ 1024px` | **`lg:`** |

**Why `md` and not `sm` for the phone/tablet line.** `sm` 640px is below every
tablet in portrait (768 / 820 / 834) and above several phones in landscape, so a
`sm` line puts the **tablet layout on a phone held sideways** and the **phone
layout on a portrait iPad**. `md` 768px is the portrait-tablet edge exactly.
The cost is the migration of the 44 existing `sm:` uses, and D-41-05 already
decided that cost is paid rather than grandfathered.

**Why `lg` for the tablet/desktop line.** 1024px is iPad landscape, the two
largest tables' existing switch, and the estimated width at which the eight-tab
strip stops scrolling (A3 in `41-RESEARCH.md`, to be measured by H41-6).

> **`sm:`, `xl:` and `2xl:` do not appear in a converted file.** Two prefixes,
> no exceptions carried forward silently (D-41-05). This is greppable, and §13
> gives it to a gate.

### 2.2 Which tiers actually get distinct treatment

**Three named tiers do not mean three layouts everywhere**, and pretending
otherwise would triple the verification cost of 34 conversion units for nothing.
Per axis:

| Axis | Phone | Tablet | Desktop | Distinct tiers |
|---|---|---|---|---|
| Product navigation | fixed bottom bar | fixed side column, 224px | same column, same width | **2** |
| Work-surface tabs | horizontal strip, in flow | inside the side column | same | **2** |
| Dialog form | bottom sheet | centred window | same window | **2** |
| Dense table | cards | table | same table | **2** |
| Content maximum | uncapped (gutter only) | uncapped (only ~544px available) | **capped** — §4 | **2**, and it only binds on desktop |
| Page gutter | 24px | 24px | 24px | **1** |
| Touch-target size | 44px | 44px | 44px | **not a width axis at all** — §6 |
| **Card / media grids** | **1 column** | **2 columns** | **3 columns** | **3** |

**The multi-column grid is the only genuinely three-tier axis in the product**,
and it is the axis a wide screen actually rewards. Everything else is a
two-state change that happens at `md`. Saying so here is the point: a plan that
writes an `lg:` rule on a dialog, a table or the navigation has invented a tier
this contract does not have.

### 2.3 The 22 files already using `sm:` — what happens to each class

Migrated, not grandfathered (D-41-05). The complete map, from the measured
inventory:

| Today | Becomes | Why |
|---|---|---|
| `sm:hidden` / `sm:block` (4 each — the table dual-renders) | `md:hidden` / `md:block` | §9, one table breakpoint |
| `sm:items-center` (5), `sm:items-end` (1), `sm:rounded-2xl` (4), `sm:pb-6` (4) — the four sheet modals | `md:` equivalents, then **deleted** as the Dialog primitive absorbs them | §8.3 |
| `sm:grid-cols-2` (7) | `md:grid-cols-2` | §2.2 |
| `sm:grid-cols-3` (8) | `md:grid-cols-2 lg:grid-cols-3` | §2.2 — this is the three-tier axis, and `sm:grid-cols-3` skipped its middle |
| `sm:grid-cols-[1fr…]` (1), `sm:flex-row` (2), `sm:flex-1` (1), `sm:text-5xl` (2) | `md:` equivalents | §2.1 |
| `sm:max-h-[90vh]` (1) | `max-h-[85dvh]`, unprefixed | §8.3 — one cap at both tiers, and `dvh` is the tree's unit (62 `min-h-dvh`) |
| `lg:block` / `lg:hidden` (4 — `MemberTable`, `TransactionList`) | `md:block` / `md:hidden` | §9 |
| `lg:grid-cols-3` (1 — `MediaReviewGrid`) | **stays `lg:`** | it is already the correct desktop step of the three-tier grid axis |

---

## 3. Spacing

### 3.1 The scale — inherited, unchanged

Phase 40's table (`40-UI-SPEC.md` §2), which is Tailwind's default 4px scale.
**This phase declares no new spacing token** either.

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| xs | 4px | icon gaps, badge padding |
| sm | 8px | compact element spacing, chip gaps |
| md | 16px | default element spacing, **section-heading bottom margin** |
| lg | 24px | **the page gutter (`px-6`), card padding, dialog padding** |
| xl | 32px | layout gaps |
| 2xl | 48px | **the page top padding (`pt-12`)**, empty-state vertical padding |
| 3xl | 64px | page-level spacing |

**Exceptions — two, both stated rather than discovered:**

1. **`min-h-11` = 44px** (11 × 4). Inside the scale, not beside it. §6.
2. **`w-56` = 224px** for the side column (56 × 4). Inside the scale.

**`mb-3` (12px) is rejected even though it is the plurality of the section
heading's margin (17 of ~44 sites).** 12px is a multiple of 4 but is **not a
step Phase 40's ladder names**, and this phase adds no spacing token. The
section heading takes `mb-4` (16px), which 11 sites already use. A ladder with an
unnamed step between two named ones is how a scale acquires a value nobody
decided — the same argument D-41-05 makes about breakpoints.

### 3.2 The navigation clearance — one number, three consumers

`pb-24` is written **54 times in 49 files** and `ToastContainer.tsx:26`
hard-codes `calc(5rem + env(safe-area-inset-bottom) + 1rem)` independently, and
the four bottom sheets hard-code `5rem` a third time. The moment D-41-02 moves
navigation off the bottom edge, **all three come due at once**. D-41-03 assigns
the clearance to the page shell; this is how it is expressed.

**Two layout custom properties, declared once in `globals.css`, redefined at one
boundary:**

```css
:root {
  /* The space the navigation occupies at the bottom edge. Phone: the bar. */
  --nav-inset-block-end: calc(5rem + env(safe-area-inset-bottom));
  /* The space it occupies at the leading edge. Phone: none. */
  --nav-inset-inline-start: 0px;
}

@media (min-width: 48rem) {           /* the md tier boundary, §2.1 */
  :root {
    --nav-inset-block-end: 0px;
    --nav-inset-inline-start: 14rem;  /* 224px — the side column, §8.2 */
  }
}
```

| Consumer | Expression | Value on a phone today |
|---|---|---|
| Page shell, bottom | `pb-[calc(var(--nav-inset-block-end)+1rem)]` | `80 + inset + 16` = **96px with no inset — exactly today's `pb-24`** |
| Page shell, leading edge | `ps-[var(--nav-inset-inline-start)]` | 0 |
| `ToastContainer` | `bottom: calc(var(--nav-inset-block-end) + 1rem)` and `left: var(--nav-inset-inline-start)` | **byte-identical in value** to today's `calc(5rem + env(safe-area-inset-bottom) + 1rem)` |
| Dialog sheet, bottom padding | `pb-[calc(1.5rem+var(--nav-inset-block-end))]` | **identical in value** to `pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))]` |

**Why `5rem` and not a measured bar height.** D-41-09 requires
`pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))]` to survive the dialog
extraction **verbatim**. Fixing the bar at a declared 5rem keeps that literal
true; re-deriving the height from `MobileNav`'s markup would silently invalidate
it in four files at once. **The value survives verbatim; the literal survives as
the variable's single definition.** That is the deviation, it is one substitution
deep, and it is the whole reason the hard-code count goes from three to one.

**A note the plan must act on, not discover.** `scripts/verify-tokens.mjs`
check A resolves every `var(--x)` in the token file against `:root` and the
`@theme` block. The two names above are declared in `:root` **and redeclared
inside a media query's `:root`**. If check A parses only the top-level `:root`,
it will not see the second block — which is harmless for A (the names are
already declared) but must be **confirmed green before the commit lands**, since
check A going red on a correct file is the exact failure `40-REVIEW.md` WR-02
already recorded once.

**These two are layout variables, not colour tokens.** They get **no
`--color-*` mapping** and therefore no Tailwind utility; they are reached only
through arbitrary values. Under D-41-14 their names go into
`KNOWN_TOKEN_NAMES` in the same commit that declares them — where check D will
correctly assert that `bg-nav-inset-block-end` and friends have zero consumers,
because no such utility exists.

---

## 4. The content maximum

**Owned by the page shell, never by a `max-w-*` written per page** (D-41-06).
Nothing wider than `max-w-lg` (32rem) exists in the tree today, so every surface
is edge-to-edge at 1920px.

| Form | Container | Value | For |
|---|---|---|---|
| **`default`** | `mx-auto w-full max-w-5xl` | **64rem / 1024px** | every surface unless named below |
| **`wide`** | `mx-auto w-full max-w-7xl` | **80rem / 1280px** | a surface whose primary object is a dense table or a multi-column grid — **enumerated, closed list** |
| **`focus`** | `mx-auto w-full max-w-sm`, centred on both axes | **24rem / 384px** | a single-purpose screen with one card and one action |

**The `wide` list, closed today, and edited by decision rather than by diff.**
Same discipline as the gradient allow-list (`40-UI-SPEC.md` §7 clause 3):

`/admin/members` · `/admin/finance` · `/admin/events/[id]/sales` ·
`/admin/events/[id]/tickets` · `/admin/events/[id]/guest-list` ·
`/admin/events/[id]/review` · `/admin/events/[id]/analytics` · `/admin/analytics`
· `/admin/analytics/members` · `/admin/analytics/compare` · `/admin/members/growth`
· `/gallery`

**The `focus` list, also closed:** `/login` · `/register` · `/set-password` ·
`/payment/callback`. `max-w-sm` is adoption, not a choice — three of the four
already use it (`(auth)/**`, measured).

**Why 1024 and not 1152 or 1280 as the default.** On a 1440px screen the side
column takes 224px, leaving 1216px; a 1152px default would be indistinguishable
from full-bleed at the commonest desktop width, and **RESP-02's criterion would
be satisfied on paper and invisible in the room**. 1024px leaves visible restraint
and is a comfortable measure for a seven-column table.

**Why the cap does not bind at tablet.** At 768px the column leaves 544px, which
is below every cap. Content stops widening **on desktop**, which is what RESP-02
asks and where the defect is observable.

**The shell sets no ground.** `globals.css:337-342` already binds `body` to
`--background`. The two pages that write `bg-background` on their own root
(measured) drop it as redundant when they convert.

---

## 5. Colour

**Inherited whole from `40-UI-SPEC.md` §3:** four grounds, four inks, three line
weights, `--accent` with its reserved-for list, the four `--sem-*` tokens with
literal values on both sides of the separation, the format identification
colours as **data on a catalogue row and never a CSS token**, and the sunset
gradient's exclusivity to SunSet. **None of it is restated and none of it is
re-derived.**

### 5.1 The 60 / 30 / 10 contract, unchanged

| Role | Value | Usage in this phase's primitives |
|------|-------|----------------------------------|
| Dominant (60%) | `--ground` `#0A0712` | the page ground (`body`), the side column's ground, the bottom bar's ground |
| Secondary (30%) | `--surface` `#140D20`, with `--raised` `#1D1430` and `--sunk` `#0D0917` | Card, Dialog panel, table row, sheet · `--raised` for a selected row and a dropdown · `--sunk` for an input's well |
| Accent (10%) | `--accent` `#FF5C93` | **the primary button fill · the active nav entry's label and its indicator · a link inside prose · the lineup pills on an event card** |
| Destructive | `--sem-crit` `#FF6B8E` | the destructive confirming button's fill, and the inline error region's ink |

**Accent reserved for:** the primary button fill · the active navigation entry
(label + indicator) · a link inside prose · the lineup pills on an event card.
**Never** a format marker, a chip swatch, a chip border, a state signal, or the
focus ring. That last exclusion is `globals.css:92-98`'s resolved conflict and it
is inherited as resolved.

### 5.2 The control boundary — a new token, and the arithmetic that forces it

D-41-10: all **75** form inputs carry `border border-card-border`;
`--card-border` aliases `--line` (`globals.css:208`); `--line` reaches at most
**1.39:1** over any ground (`40-UI-SPEC.md:371-373`), against WCAG **1.4.11**'s
3:1 for a non-text control boundary. Phase 40's rule is explicit: *the boundary
of an interactive control is never carried by `--line*` alone*, and it must be
`--muted` `#A493C0` **or lighter**.

> **A new token is declared: `--control: #A493C0`.** Utility `border-control`,
> `ring-control`, `outline-control`.

**Computed 2026-08-11, and it reproduces `40-UI-SPEC.md` §4.1's `--muted` row
exactly:**

| Boundary over | `--ground` | `--surface` | `--raised` | `--sunk` | WCAG 1.4.11 |
|---|---|---|---|---|---|
| **`--control` `#A493C0`** | **7.14** | **6.78** | **6.29** | **7.03** | **passes on all four** |
| rejected — `--faint` `#6E6188` | 3.54 | 3.36 | **3.12** | 3.49 | clears by 0.12 on `--raised`, and it is already `40-REVIEW.md` WR-12's exposed-and-wrong token |
| rejected — `--line-strong` α.26 | 1.95 | 2.02 | 2.05 | 1.96 | fails everywhere |

**Why a third name at a value the system already holds twice.** `--control`
`#A493C0` **is** `--muted` **is** `--sem-info`. Three names, one value, literal
on all three sides — which is precisely the discipline `globals.css:104-116` and
D-40-05 established, and for the same reason: *writing the value twice with the
coincidence recorded is what makes separating them later a value change and not
a refactor.* Concretely, it buys two things nothing else buys:

- **The triage of 406 `border-card-border` sites (D-41-13) gets two named
  destinations** — `border-line` for a card edge, `border-control` for a control
  boundary — instead of one destination and a memory. A rule that can only be
  kept by remembering it is not kept (`36-UI-SPEC.md:66`).
- **`--muted` is an ink name.** Writing `border-muted` on an input states that
  the border is the tertiary text colour, which is a coincidence of value and not
  a statement of role.

**The name deliberately does not begin with `line-`.** A gate forbidding
`border-line*` on a control would match `border-line-control` and go red on the
one file that is right — the `event-media` / `event-media-quarantine` prefix trap
recorded verbatim at `verify-media-strip.mjs:51-62`. The trap is avoided by
naming, before the gate exists.

**Two edits, one commit (D-41-14):** `--control: #A493C0;` in `:root`,
`--color-control: var(--control);` in `@theme inline`, and `'control'` in
`KNOWN_TOKEN_NAMES` at `scripts/verify-tokens.mjs:305-340`. A name declared but
absent from that list is invisible to check D and a half-rename passes.

**Where the boundary is required:** text input, textarea, select, checkbox,
radio, switch track, secondary button, ghost button, segmented control, the
combobox panel's edge. **Where `--line*` remains correct:** a row divider, a
section rule, a card's edge, the side column's trailing edge — anywhere the
content already says where the thing is.

**One consequence worth naming.** An input's well is `--sunk` `#0D0917` inside a
card of `--surface` `#140D20` — **1.04:1**. The fill cannot show where the
control is. The boundary is not decoration there; it is the only channel.

### 5.3 The accent used as a fill — a computed finding, and the rule it forces

`40-UI-SPEC.md` §4.3 established that *a semantic used as a fill carries
`--ground` as its ink, never `--ink`, never white*, and computed it for the four
`--sem-*` tokens. **It did not compute it for `--accent`.** Computed here:

| Ink on an `--accent` `#FF5C93` fill | Ratio | WCAG 1.4.3 (4.5:1) |
|---|---|---|
| `#FFFFFF` white | **2.91** | **fails** |
| `--ink` `#F3ECFA` | **2.52** | **fails** |
| **`--ground` `#0A0712`** | **6.85** | **passes** |
| `--surface` `#140D20` | 6.50 | passes |

> **The accent used as a fill carries `--ground` as its ink.** Never white,
> never `--ink`. This extends §4.3's rule from the semantics to the accent, on
> the same arithmetic and for the same reason.

**This is finding A2 and it is live, not hypothetical: 64 lines in the tree
today carry `bg-accent` and `text-white` together**, including `StaffNav.tsx:74`
(every work-surface tab, in its active state) and the primary submit on
`/login`, `/register` and `/set-password`. Each converts as its surface converts;
the Button primitive is what stops the sixty-fifth.

For completeness, the fill against the page: `--accent` vs `--ground` **6.85**,
vs `--surface` **6.50** — a filled button is unmistakably a button without a
border, so the primary button carries none.

`--accent-hover` `#F6B6D2` as a fill takes `--ground` at **11.92**; white on it
is **1.67** and is forbidden by the same rule.

### 5.4 Focus — inherited, and one number that makes the offset load-bearing

`globals.css:92-98` resolved the conflict in Phase 41's favour: **the focus ring
is `--ink`, never the accent.** Inherited as resolved.

| Focus ring `--ink` `#F3ECFA` against | Ratio |
|---|---|
| `--ground` | **17.29** |
| `--surface` | **16.41** |
| `--raised` | **15.22** |
| `--sunk` | **17.02** |
| **an `--accent` fill** | **2.52 — fails 1.4.11's 3:1** |

> **The ring is drawn on the page, not on the control**, and the 2px offset is
> what puts it there. With the offset it lands on the surrounding ground at
> **15.22–17.29:1**; without it, on an accent-filled button, it is **2.52:1** and
> is not an indicator at all. Phase 40 wrote *"an accent ring on an accent button
> is no ring at all"*; the same sentence is true of an `--ink` ring with no
> offset, and this is the number that says so. **The offset is not cosmetic and
> may not be dropped for density.**

**The one focus expression, everywhere:**

```
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink
```

**`focus:outline-none` does not survive.** 70 sites carry it and 69 replace it
with a ring in the accent. Every one of them converts with its surface, and the
primitives are why the seventy-first is not written. `focus:` gives way to
`focus-visible:` — a mouse click on a button should not draw a keyboard
indicator, and `focus-visible` is what distinguishes them.

### 5.5 The side column, and a ground that cannot carry a boundary

`--ground` vs `--surface` is **1.05:1** and `--ground` vs `--raised` is
**1.14:1**. The side column therefore **cannot be told from the page by its
ground**, whichever of the four it takes. It is separated by a line:

- column ground: `--ground` (it is page furniture, not content)
- trailing edge: `border-e border-line` — **1.29:1**, decorative, and correct as
  such: the column's *content* says where it is.
- active entry: `--accent` label + a 2px leading indicator in `--accent`
  (`--accent` on `--ground` **6.85**) **plus `aria-current="page"`** — colour is
  never the only channel (`40-UI-SPEC.md` §10), and `aria-current` appears **5
  times in the whole tree** today, none of them in a nav.

---

## 6. Touch targets

### 6.1 The number, and the exact expression

> **44 × 44 CSS px.** Adopted, not chosen: `40-UI-SPEC.md:884` already states
> *"Touch targets ≥ 44 × 44px wherever the input is a finger"* and hands it
> forward. Tailwind's `--spacing` is `0.25rem` (verified at
> `node_modules/tailwindcss/theme.css:325`), so:

| Intent | Class | Computes to |
|---|---|---|
| Any interactive element with a label | **`min-h-11`** | 44px |
| Icon-only | **`min-h-11 min-w-11`** | 44 × 44px |
| A prominent single action | `min-h-12` | 48px |
| The one permitted shrink — §6.3 | `pointer-fine-only:min-h-9` | 36px |

`min-h-11` rather than `h-11`: a target must be **at least** 44px and must still
grow with its content. The two sites of prior art in the tree
(`FormatFilterRow.tsx:115,162`) already use `min-h-11`.

### 6.2 The mechanism — `any-pointer: coarse`, and why the default is the large one

D-41-07: sizing keys off **`any-pointer: coarse`, never viewport width**, because
criterion 5 says *large touch screens included* and a 1024px iPad is touched.
The trade is accepted and stated: a mouse user on a touchscreen laptop also gets
44px targets.

**But the rule is not written on `coarse`.** MDN records that `any-pointer:
fine` and `any-pointer: coarse` can **both** match on one device, and A5 in
`41-RESEARCH.md` records that hot-plugging does not always re-evaluate promptly.
So the safe construction inverts it:

> **44px is the unprefixed default. The query is only ever used to *shrink*, and
> only where no coarse pointer exists at all.** A wrong answer then costs a
> slightly-too-large button, never a too-small one. This is
> `checkin-offline.md`'s asymmetry applied to a control: *rifiutare un ospite
> valido e' peggio che ammetterne uno doppio.*

**Declared once, in `globals.css`, as a custom variant** — so the query is
written in exactly one place and is greppable:

```css
@custom-variant pointer-fine-only (@media (any-pointer: fine) and (not (any-pointer: coarse)));
```

Composing `any-pointer-fine:` with `not-any-pointer-coarse:` would produce the
same CSS and would depend on Tailwind's variant ordering, which is not something
a criterion should rest on. A `@custom-variant` is a first-class Tailwind v4
feature, adds no package (D-41-20), and **must be proven to emit by
`npm run build` before any consumer is written** — the tree uses zero pointer
variants today, so this is the first of its kind.

### 6.3 The shrink allow-list — closed at one item, before the gate exists

**`pointer-fine-only:min-h-9` (36px) is permitted on exactly one class of
element: the row-action buttons inside the DataTable primitive's desktop
branch.** That branch is `hidden md:block` and therefore never renders on a
phone; the variant only shrinks it further on a machine with no touch input at
all. Floor 36px, never lower.

**Everything else is 44px unconditionally**, at every tier, on every device.
That is what makes G5's assertion nearly absolute and gives H41-5 (*"on a
desktop with a mouse only, confirm targets are not gratuitously large"*)
something real to observe.

### 6.4 What the tree must change, ranked

The estimate in `41-RESEARCH.md` (118 of 174 measurable elements under 44px) is a
class-string heuristic and stays labelled as one. The unambiguous cases, all
outside Phase 42's territory:

| Est. | Site | Becomes |
|---|---|---|
| 16px | `MemberTable.tsx:1183,1348` — `h-4 w-4` checkboxes | Checkbox primitive: a 44×44 hit area around a 16px box (§8.6) |
| 20px | `(public)/events/[slug]/page.tsx:1136` — a lineup pill that is a `<Link>` | **Chip**, 44px — it is interactive, so it is not a Badge (§8.5) |
| 24px | `DrinkMenuManager.tsx:312,320,343` · `EventForm.tsx:630` · `MemberTable.tsx:245,409` · `MediaUpload.tsx:674` · the two `*ProfilePrompt` | Button `sm` (44px) / Switch (44px hit area) |
| 28px | `EventList.tsx:191-226` (six in a row) · `TierCard.tsx:170,239` · `DiscountCodeCard.tsx:227,300` · `MemberTable.tsx:1359` · `TransactionList.tsx:788` | Button `sm` |
| 32px | the dialog close buttons (`h-8 w-8`, 3 sites) | IconButton, 44×44 |
| 32px | **`StaffNav.tsx:74` — all eight work-surface tabs** | the side column's entries at 44px, and the phone strip's chips at 44px (§8.2) |
| 32px | `analytics/compare/page.tsx:93,103` · `members/growth/page.tsx:64,74` — **the pages' own filter controls** | Chip, 44px — and these are RESP-04's "filters" |

**`text-[10px]` and `text-[11px]` are not declared sizes.** They occur 37 times
across 12 files, of which **one is the scanner and stays Phase 42's**
(`ScannerClient.tsx`). In the other eleven the floor for a converted surface is
`text-xs` (12px, the label/data role) and `text-sm` (14px) for body —
`40-UI-SPEC.md:889-890`.

---

## 7. Typography

**Inherited whole:** three roles, four sizes, **two weights — 400 and 600, and
nothing else** (`40-UI-SPEC.md` §5.4). The bill is 397 `font-medium` (500) and
86 `font-bold` (700) sites, paid surface by surface.

| Role | Class | Size | Weight | Line height | Face |
|------|-------|------|--------|-------------|------|
| Display | `text-3xl` | 30px | 600 | 36px (1.2) | **display** — §7.1 |
| Heading | `text-base` | 16px | 600 | 24px (1.5) | interface |
| Body | `text-sm` | 14px | 400 | 20px (1.43) | interface |
| Label / Data | `text-xs` | 12px | 600 | 16px (1.33) | data, where it is caps + wide tracking |

### 7.1 Where the display role lands — and where it must not

D-41-15: this is the phase where Orbitron starts rendering. `font-display` has
**zero occurrences in zero files** today; `globals.css:330-335` declared the
silence as intended and named Phase 41 as the end of it.

> **The display role lands on exactly one thing: the page title — the single
> `<h1>` of a surface, rendered by the `PageTitle` primitive.**
>
> `font-display text-3xl font-semibold tracking-tight text-ink`

It must **not** appear on: a dialog title, a card heading, a section heading, a
table header, a nav entry, a button, a label, any figure or count
(`40-UI-SPEC.md` §5.3 — no figure column renders in the display face), any body
prose, or **any format name**. `SunSet`, `RamaDub`, `MotionLab` and `re:sonate`
are read, not decorated.

**52 `<h1>` in 38 files, and not all of them are page titles.** Six render at
`text-lg` (five `font-semibold`, one `font-bold truncate`) — they are component
headings wearing an `<h1>`. **A surface has one `<h1>` and it is the page
title**; the others become `<h2>`/`<h3>` at the heading role when their surface
converts. The 34 that already share `text-3xl font-bold tracking-tight` change
only their weight (700 → 600) and lose their six different margin prefixes to the
shell's rhythm.

**This closes `40-REVIEW.md` WR-11** — Orbitron is loaded *and preloaded* at the
root with zero consumers, so the preload is a wasted fetch on every page until
the page title renders it.

### 7.2 The wordmark is the **data** face — a conflict inside Phase 40, resolved

`40-UI-SPEC.md` §5.1's summary table lists the wordmark in the display column.
`40-UI-SPEC.md` §5.5 says it is *"in the **data** face, second half at weight
600"*, and cites its source. The source settles it:

> `36-VISUAL-SOURCE.md`, *Il wordmark*: *«Composto `re:` + `sonate`, in **mono**,
> con la seconda meta' in peso 600.»*

**The specific clause and the sourced clause agree with each other and against
the summary table. The wordmark is the data face.** Recorded here the way Phase
40 recorded its own focus-ring conflict (`globals.css:92-98`) rather than
smoothed over, because `globals.css:331-335` repeats the summary table's wording
and a reader will meet it.

**`Wordmark` primitive:**

```
font-mono normal-case tracking-normal text-ink
  <span>re:</span><span class="font-semibold">sonate</span>
```

**`normal-case` is declared on the element itself, always.** `text-transform`
inherits, and `uppercase` appears in **43 files** — "we did not add `uppercase`"
is not a guarantee (`36-UI-SPEC.md:54-66`, `40-UI-SPEC.md:567-580`). The same
treatment applies to every element rendering a format name.

`src/app/page.tsx:40` renders the wordmark as `<img alt="re:sonate">`. The image
is artwork and stays artwork; the primitive is for the places the wordmark is
**text** — and §11 names the three surfaces that currently render it wrongly.

### 7.3 The section heading — four axes collapsed to one string

Measured: 10 distinct strings across ~44 uses, varying on `mb-3`/`mb-4`,
`medium`/`semibold`, `wider`/`widest`, `text-sm`/`text-xs`.

> **`SectionHeading`:**
> `mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted`

Each axis, decided with its reason:

| Axis | Chosen | Why |
|---|---|---|
| margin | **`mb-4`** (16px) | 12px is not a step Phase 40's ladder names (§3.1). 11 sites already use `mb-4` |
| weight | **`font-semibold`** (600) | 500 does not exist in this system. Not a preference — an inheritance |
| size | **`text-xs`** (12px) | §5.4's label/data role. `--muted` on `--surface` is **6.78:1**, clearing AA 4.5:1 for small text |
| tracking | **`tracking-widest`** (0.1em) | the plurality (22 vs 31 `wider` tree-wide, but 17 vs 11 among section headings), and the more legible at 12px in caps |
| face | **`font-mono`** | `40-UI-SPEC.md` §5.1: the data face renders *"anything set in caps with wide tracking"*. This is that thing, and until now it was set in the interface face by default |

**D-41-11 stands: this is a styling convention with one class string, not a
required component.** A `SectionHeading` component may exist for convenience; a
surface that writes the string is equally converted. The 99 `<label>` elements
written 90+ ways are the same shape of problem and take the same answer —
`text-xs font-semibold text-ink-2` (12.24:1 on `--surface`), a convention, not a
primitive.

---

## 8. The primitives

**Location.** `src/components/ui/` is the primitives folder (3 files today) and
is the folder that grows. Navigation stays under `src/components/layout/` and
`src/components/staff/`.

**One rename, and it is not churn.** `MobileNav.tsx` becomes `AppNav.tsx`: after
D-41-02 the component is not mobile, and **a name that asserts a tier it no
longer has is the cheapest bug to keep**. `StaffNav.tsx` keeps its name — it is
the work-surface navigation at every tier.

### 8.1 `PageShell` — the page shell

Owns: the container maximum, the gutter, the vertical rhythm, and **the
navigation clearance in every tier** (D-41-03). It is the outermost element of
every converted page, which is what makes G1/G4 mechanically meaningful.

```tsx
// width: "default" | "wide" | "focus"

// default / wide
<div className="min-h-dvh ps-[var(--nav-inset-inline-start)]">
  <div className="mx-auto w-full max-w-5xl px-6 pt-12 pb-[calc(var(--nav-inset-block-end)+1rem)]">
    {children}
  </div>
</div>
// wide swaps max-w-5xl → max-w-7xl. Nothing else changes.

// focus
<div className="flex min-h-dvh items-center justify-center px-6 ps-[calc(var(--nav-inset-inline-start)+1.5rem)]
                pb-[calc(var(--nav-inset-block-end)+1rem)]">
  <div className="w-full max-w-sm">{children}</div>
</div>
```

- `ps-*` (padding-inline-start), not `pl-*`. The interface is LTR and English
  only this milestone; logical properties cost nothing and are correct.
- The inner container centres **inside the space the column leaves**, not inside
  the viewport, because the padding is on the outer element.
- **Replaces, exactly:** `min-h-dvh pb-24` (47), `px-6 pt-12` (44), and the
  `flex min-h-dvh …items-center justify-center px-6` of the four focus screens.
- On a phone with no safe-area inset the bottom padding computes to **96px —
  the value `pb-24` already produces.** The migration is value-preserving on the
  device it was written for.

### 8.2 `AppNav` + `StaffNav` — navigation in two forms

**D-41-02, and it is settled:** from tablet width up the navigation is a
persistent side column; the bottom bar is phone-only.

**It does not collapse.** No toggle, no drawer, no hamburger, no disclosure.
RESP-04 forbids hiding navigation behind a menu, and a collapse control is a menu
with an extra step. There is no menu in this product today and this phase does
not introduce the first one.

**One width at both tiers: `w-56` / 224px.** The column holds eight fixed labels
whose longest is *Newsletter* (≈74px at 14px) plus a 20px icon, 8px gap and 32px
of padding — 224px is comfortable, and 768 − 224 = 544px of content at the
narrowest tablet. It does not widen at desktop: **the extra desktop width goes
to the content, which is where a wider screen is useful.**

| | `< md` — phone | `≥ md` — tablet and desktop |
|---|---|---|
| **`AppNav`** (≤5 product entries, 13 mount sites) | `fixed bottom-0 inset-x-0 z-50 border-t border-line bg-ground/80 backdrop-blur-xl`, inner row `mx-auto flex max-w-lg`, height **5rem** + `pb-[env(safe-area-inset-bottom)]`; each entry `flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-xs` | `md:fixed md:inset-y-0 md:start-0 md:z-50 md:w-56 md:border-e md:border-t-0 md:border-line md:flex-col`; each entry a row, `flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm` |
| **`StaffNav`** (8 work tabs, `(work)/layout.tsx` only) | a horizontal strip in flow, `-mx-6 flex gap-2 overflow-x-auto px-6`, each tab a **Chip at `min-h-11`** with `scrollMarginInline: 24px` on the active one | **inside the same column**, below a `SectionHeading` reading `Work`, stacked, `md:flex-col md:gap-1 md:overflow-visible`, each tab a column entry at `min-h-11`. **No horizontal scroll at any width ≥ 768px** — which is RESP-04 |

**The phone strip's construction is copied from the best component in the tree,
not invented:** `(public)/events/FormatFilterRow.tsx:109-127` already carries
`min-h-11`, `aria-current`, `normal-case` on the element, the `-mx-6 px-6`
gutter bleed and `scrollMarginInline` so the active chip is not flush to the
edge. Its one remaining defect is `border-card-border` on a control boundary,
which §5.2 fixes.

**Active state, in three channels:** `--accent` label + a 2px indicator +
`aria-current="page"`. Underline on the phone strip, leading edge in the column.
Colour is never the only channel.

**What must not happen (Pitfall 6).** The entry list is resolved on the server
by `getAccessContext()` and arrives as serialisable capability keys
(`(work)/layout.tsx`, `MobileNav.tsx:32-46`, `StaffNav.tsx:44-52`). **Width
changes how the list is laid out and never which entries are in it.** A plan
that filters the tab array to make it fit has given
`StaffNav.tsx:11-23` a second author.

### 8.3 `Dialog` — sheet on a phone, window above, one implementation

**Extracted from the seven byte-identical native `<dialog>` + `showModal()`
shells that already exist** (D-41-09). An eighth is not built beside them, and
two of the seven ask for the extraction in their own docblocks
(`RetireFormatDialog.tsx:22`, `RevealVenueDialog.tsx:19`).

```tsx
<dialog ref={dialogRef}
  className="fixed inset-0 z-[60] m-0 h-dvh w-dvw max-h-none max-w-none bg-black/80 backdrop:bg-transparent p-0"
  onClose={…} onClick={/* e.target === e.currentTarget */}>
  <div className="flex h-full w-full items-end justify-center p-0 md:items-center md:p-4">
    <div className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden
                    rounded-t-2xl bg-surface md:rounded-2xl">
      {/* header  */} <div className="flex min-h-11 items-center justify-between px-6 pt-6" />
      {/* body    */} <div className="overflow-y-auto px-6 py-4" />
      {/* actions */} <div className="px-6 pb-[calc(1.5rem+var(--nav-inset-block-end))] pt-2" />
    </div>
  </div>
</dialog>
```

| Property | Value | Source |
|---|---|---|
| Escape, focus trap, background inertness, top layer | **from the platform**, via `showModal()` | MDN; already relied on by 7 files |
| Sheet ↔ window | **three class pairs, CSS only** — `items-end`→`md:items-center`, `rounded-t-2xl`→`md:rounded-2xl`, the bottom padding | the four existing sheets, `RedeemConfirmationModal.tsx:167-168` |
| `z-[60]` | **kept verbatim** (D-41-09). It is redundant against non-top-layer content and **meaningful among top-layer elements**, where `z-index` still orders. Belt and braces, with the reason | `MobileNav.tsx:96` is `z-50` |
| Bottom padding | `pb-[calc(1.5rem+var(--nav-inset-block-end))]` — **identical in computed value** to the verbatim string, at both tiers, because the variable is `0px` from `md` up. The `md:pb-6` half becomes redundant and is dropped rather than left as a second author | §3.2 |
| Panel width | `max-w-md` (448px) default; **`max-w-lg` (512px)** for a form dialog of more than four fields — `CreateFormatModal`, `CreateSeriesModal`, `CreateVenueModal`, `CreateArtistModal`, `EditVenueButton`, `EditArtistButton`. Closed list |  |
| Height | `max-h-[85dvh]` at **both** tiers, with the body region the only scroller. One value, one less variation. **No full-screen phone form**: no dialog in the tree is long enough to need one (`EventForm`, 1 668 lines, is a page) |  |
| Radius | `rounded-t-2xl` → `md:rounded-2xl` — §10 |
| Backdrop | `bg-black/80`, the seven shells' value. A scrim, not a token; G1's raw-colour regex must not flag it, and `41-VALIDATION.md` already records why |  |
| Light dismiss | **stays hand-rolled** (`e.target === e.currentTarget`). `closedby="any"` would do it natively but also changes Escape and back-gesture semantics, and it is newer than `<dialog>` itself. Proven behaviour in 7 files beats a newer attribute |  |
| Initial focus | `autofocus` on **the least destructive control**. `RevealVenueDialog.tsx:19` already focuses Cancel; that becomes the rule, not one file's habit |  |
| Animation | **none.** If a plan adds one it carries `motion-reduce:`. `MotionProvider.tsx:12` sets `reducedMotion="user"` for the motion library but not for a CSS keyframe |  |

**The eleven hand-rolled `fixed inset-0 z-[60]` overlays go away.** None of them
handles Escape, none traps focus, none locks background scroll — measured — and
**every dialog on the public purchase path is among them.** Criterion 2's
*"closes with Escape"* is satisfied today by 7 of 18 dialogs and by none of the
11 that need it most.

**`Lightbox.tsx` is a declared exception and its exemption is written before the
gate** (§13, G2): a media viewer is full-bleed at every tier and carries
`bg-black/90`. A G2 signature demanding `/80` would miss it; a G2 that demanded
the sheet form would go red on a correct file.

**The toast question, decided here so it is not discovered as a silent bug
(Pitfall 8).** A native `<dialog>` paints in the top layer, above the `z-[70]`
toast container — so a converted dialog reporting success by toast would report
it **invisibly**, which is exactly the failure `meta-gates.md` forbids.

> **A dialog reports its own outcome inside its own panel** — a status region at
> the foot of the body, `role="status"` for success and `role="alert"` for
> failure, ink `--sem-done` / `--sem-crit` on `--surface` (5.69 / 6.99). **A
> dialog never calls `useToast`.** The toast is for a notification raised by a
> surface, where no dialog is open.

This is latent today (`useToast` has exactly one consumer, `GuestListClient`, and
it is not a dialog) and it goes live on first use. §13 gives it to G2 as a check.

### 8.4 `Card`

```
rounded-2xl border border-line bg-surface p-6
```

**202 sites, one axis of variation, one decision.** `border-card-border` becomes
`border-line` — this is the *card edge* half of D-41-13's 406-site triage, and
it stays a line because a card's content already says where the card is
(`globals.css:44-57`). The *control boundary* half becomes `border-control`
(§5.2).

Interactive card (`PressableCard`) adds the focus expression from §5.4 and
`min-h-11` is implied by its content.

### 8.5 `Button`, `IconButton`, `Chip`, `Badge`

**133 pill sites across six `py-` values, of which `py-1.5 text-xs` computes to
28px** (D-41-12). Since every button is a finger target, **padding no longer
sets the height — `min-h-11` does** — so the ladder is horizontal padding and
type size, and it has three steps and one icon form.

| Size | Class | Height | Use |
|---|---|---|---|
| `sm` | `min-h-11 rounded-full px-4 text-xs font-semibold` | 44px | dense row actions, secondary actions inside a card |
| **`md`** (default) | `min-h-11 rounded-full px-5 text-sm font-semibold` | 44px | every ordinary button |
| `lg` | `min-h-12 rounded-full px-6 text-sm font-semibold` | 48px | the single primary action on a `focus` screen |
| `icon` | `min-h-11 min-w-11 rounded-full p-0` | 44×44 | dialog close, remove, inline edit |

| Variant | Fill | Ink | Boundary | Computed |
|---|---|---|---|---|
| `primary` | `bg-accent` | **`text-ground`** | none — a fill is its own boundary | **6.85:1** (white would be 2.91, `--ink` 2.52) |
| `secondary` | none | `text-ink` | **`border border-control`** | ink 17.29 · boundary 7.14 on `--ground` |
| `ghost` | none | `text-ink-2` | **`border border-control`** on hover/focus; none at rest — a ghost at rest is not a control boundary, it is a label | 12.90 |
| `destructive` | `bg-sem-crit` | **`text-ground`** | none | **7.36:1** |

**`Chip` — interactive, and therefore 44px.** `min-h-11 rounded-full border
border-control px-4 text-xs font-semibold` + `aria-current` when selected +
`normal-case` on the element (format names). This is what the eight work tabs
become on a phone, what the two filter rows on `/admin/analytics/compare` and
`/admin/members/growth` become, and what the 20px lineup `<Link>` at
`(public)/events/[slug]/page.tsx:1136` becomes.

**`Badge` — not interactive, and therefore not a target.** `rounded-full px-2.5
py-0.5 text-xs font-semibold` — **no `min-h`**. This is the correct destination
for most of the 36 `py-0.5` sites, and it is why G5 scans interactive elements
only. **A badge that is a `<Link>` or a `<button>` is a Chip, not a Badge** —
that single sentence is the difference between a correct file and a 20px target.

### 8.6 `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`

**These close finding A1, and that is what they are for** (D-41-10). Not tidying.

```
Input / Textarea / Select:
  min-h-11 w-full rounded-xl border border-control bg-sunk px-4 text-sm text-ink
  placeholder:text-muted
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink
```

| Pairing | Computed | Against |
|---|---|---|
| boundary `--control` on `--sunk` | **7.03** | 1.4.11, 3:1 |
| boundary `--control` on `--surface` (an input on a card) | **6.78** | 1.4.11, 3:1 |
| value `--ink` on `--sunk` | **17.02** | 1.4.3, 4.5:1 |
| placeholder `--muted` on `--sunk` | **7.03** | 1.4.3, 4.5:1 |
| error text `--sem-crit` on `--surface` | **6.99** | 1.4.3, 4.5:1 |

`--sunk` is the declared well for an input (`40-UI-SPEC.md` §3.1). Its contrast
against a card is **1.04:1**, so the well does not show where the control is —
§5.2's last paragraph. The boundary is the only channel and it now measures.

**`Checkbox` / `Switch` — the hit area is the target, not the glyph.** The
16px box (`h-4 w-4`, `MemberTable.tsx:1183,1348`) and the 24px switch track
(`h-6 w-11`, `DrinkMenuManager.tsx:343`, `EventForm.tsx:630`) keep their drawn
size and gain a **44×44 hit area**, either by wrapping the input in a
`min-h-11` label or by an `after:absolute after:-inset-*` pseudo-element. The
box keeps `border-control` — a checkbox is named in §4.2's list explicitly.

**Label convention (D-41-11 — not a component):** `text-xs font-semibold
text-ink-2`, and the label is the input's programmatic name via `htmlFor`, not a
sibling `<div>`.

### 8.7 `PageTitle`, `SectionHeading`, `Wordmark`

§7.1, §7.3, §7.2 respectively. One `<h1>` per surface; the section heading is a
class string; the wordmark is the data face with `normal-case` on the element.

### 8.8 `DataTable` — one data array, two branches

**Six of seven tables already dual-render, at two disagreeing breakpoints**
(four `sm`, two `lg`). DS-09's real content is **consolidation**, not
construction (D-41-17).

```tsx
<div className="hidden md:block overflow-x-auto">  <table …/>          </div>
<div className="space-y-3 md:hidden">              {/* card list */}   </div>
```

- **One breakpoint: `md` (768px)**, per §2.1.
- **Explicitly not** a `display: block/grid` override on `<table>`/`<tr>`/`<td>`.
  MDN's ARIA `table` page documents that the override destroys native table
  semantics, and Roselli's matrix records WebKit still breaking header/cell
  association (bugs 243474, 257458). **This product's primary device is a phone
  and on iOS every browser is WebKit.** With two trees, `display: none` removes
  the hidden one from the accessibility tree entirely and **neither tree is ever
  transformed** — which is the property the existing six already have.
- **Explicitly not** two components. One server-fetched array, two branches
  inside one primitive.
- Row actions in the desktop branch are the **one** site permitted
  `pointer-fine-only:min-h-9` (§6.3).
- Figures in either branch carry the data role: `font-mono`, which already
  carries `font-variant-numeric: tabular-nums` at `globals.css:308-310`. **A
  descendant must not carry `ordinal` or `slashed-zero`** — those rebuild the
  shorthand and drop the inherited alignment (`40-REVIEW.md` WR-10, latent
  today).

**`ReviewListClient.tsx` is exempt, and the exemption is written here, before
the gate exists** (D-41-16). Its own copy says it exists to be *"pasted into a
diagnostic tool"* — a card list actively destroys the thing it is for. It keeps
its table and its `overflow-x-auto` at every width. **It does not keep
`text-[11px]`:** 11px is not a declared size, and the grid is all identifiers, so
it takes **`text-xs` (12px)** at the data role — `--muted` on `--surface`,
**6.78:1**. The consequence, accepted rather than discovered: 12px is wider than
11px and the grid scrolls slightly more, on a surface that scrolls by design.

### 8.9 `Skeleton` — adoption, not creation

`src/components/ui/Skeleton.tsx` exists, is correct
(`SkeletonLine`/`SkeletonCard`/`SkeletonAvatar`), and has **zero importers**,
while **102** hand-rolled `animate-pulse` blocks live in **20** files and
`TransactionList.tsx:83` defines a local `LoadingSkeleton` beside it. **Nothing
is built here.** Every converted surface's `loading.tsx` and inline placeholder
imports it. `TransactionList` is the first proof, named in `41-CONTEXT.md`.

Visual contract: `animate-pulse rounded-xl bg-raised` — `--raised` on
`--surface` is **1.08:1**, which is correct for a placeholder: it must read as
absent content, not as content.

### 8.10 `Toast`

`components/toast/{Toast,ToastContainer,ToastContext}.tsx` is already one
implementation. Two changes:

1. **Position from the variables** (§3.2): `bottom: calc(var(--nav-inset-block-end) + 1rem)`,
   `left: var(--nav-inset-inline-start)` — so from `md` up it centres in the
   content area rather than over the side column, and the third hard-coded
   `5rem` disappears.
2. **A dialog never raises one** (§8.3).

Layer `z-[70]`, unchanged.

### 8.11 What deliberately does **not** become a component

D-41-11, restated so a plan does not build them:

| | Why not | What it gets instead |
|---|---|---|
| **Empty state** | the copy changes per surface, so what is shared is a wrapper | a class contract: `px-6 py-12 text-center`, heading `text-base font-semibold text-ink`, body `text-sm text-muted` (**6.78:1** on `--surface`), at most one action at Button `md` |
| **Stat / KPI tile** | the six analytics cards are 31–73 lines and already one-per-concept | the Card shell and the data role for their figures |
| **`<label>`** | 99 elements written 90+ ways is a styling convention problem | §8.6's convention |

---

## 9. Radii

Four radii carry the card shell today and six exist tree-wide. **Three survive,
each with a stated object:**

| Radius | Value | Object |
|---|---|---|
| **`rounded-full`** | pill | button, chip, filter, tag, badge, avatar, icon-only button |
| **`rounded-2xl`** | 16px | card, panel, tile, dialog window, sheet (as `rounded-t-2xl` on the phone form) |
| **`rounded-xl`** | 12px | input, select, textarea, nested well, thumbnail, code block, a nav entry's hover ground |

**`rounded-lg` (159 tree-wide, 12 in the card shell), `rounded-md` (5) and
`rounded-3xl` (0) do not survive.** The ladder is: a **pill** is fully round, a
**container** is 16px, a **control or a nested block** is 12px. `rounded-t-2xl`
is the sheet's top-only form of the container radius and is consistent, not a
fourth value.

---

## 10. The z-index ladder

Written out so a new primitive does not land on the wrong rung.

| Layer | Value | Who |
|---|---|---|
| dropdown / suggestion list | `z-50` (`absolute`) | `AutocompleteInput.tsx:107`, `AutocompleteTagInput.tsx:191` |
| **navigation** | `z-50` (`fixed`) | `AppNav`, both forms |
| **non-modal overlay that must clear the navigation** | **`z-[60]`** | the rung D-41-09 protects |
| toast container | `z-[70]` | `ToastContainer.tsx:24` |
| scanner flash — **Phase 42** | `z-[70]` | `ScanFlash.tsx:135` |
| full-screen redeem confirmation | `z-[100]` | `RedeemConfirmationModal.tsx:100,125`, `GuestTokenDisplay.tsx:158,182` |
| **modal dialog** | **top layer**, above every `z-index` | the `Dialog` primitive, via `showModal()` |

**No new rung is added.** The eleven `fixed inset-0 z-[60]` overlays become
dialogs and vacate the rung; the rung stays declared for anything that must clear
the navigation without being a modal. Adding a sixth rung to a five-rung ladder
is how a ladder stops being readable.

---

## 11. Copywriting Contract

**This phase converts surfaces; it does not add features.** The strings it owns
are few, and saying which is the point.

| Element | Copy |
|---------|------|
| Primary CTA | **none introduced.** Every button this phase touches keeps its existing label. The **rule** for a converted label: verb + noun, sentence case — `Save changes`, `Send invitation`, `Reveal venue`. Never `Submit`, `OK`, `Confirm` alone |
| Wordmark | `re:` + `sonate` — data face, second half at 600, `normal-case` on the element (§7.2) |
| Format names | `SunSet` · `RamaDub` · `MotionLab` · `re:sonate` — CamelCase, rendered literally, no CSS transform |
| Icon-only controls | accessible name required, `aria-label`. The dialog close control is **`Close`** |
| Navigation | labels unchanged — they come from `lib/rbac/roles.ts` and `lib/routes/staff-tabs.ts`, and the side column's work group is headed **`Work`** |
| Empty state heading | one sentence naming what is absent, in the surface's own noun — `No venues yet`, `Nothing to review` |
| Empty state body | one sentence naming the next step or stating why the emptiness is normal — `Add the first one to start scouting.` / `Every scan matched a ticket.` **Never** `No data`, `Nothing here`, and never an error tone |
| Error state | problem + what to do — `We could not save this change. Check the highlighted field and try again.` **The banned shape is named:** the newsletter form's *"Qualcosa è andato storto"*, which collapses a network fault, a missing key and a duplicate address into one indebuggable message (`meta-gates.md`, `.planning/codebase/CONCERNS.md`). Every error region is `role="alert"` and distinguishable from every other message on screen |
| Destructive confirmation | **none introduced.** Three exist and are converted: retiring a format, refunding a ticket, and **revealing a venue**. The rule: the confirming button is the `destructive` variant (`--sem-crit` fill, `--ground` ink, **7.36:1**); the cancel is the default and is the **`autofocus`** target; **no Enter-to-confirm and no autofocus on the destructive button** |

**Language:** English, matching the interface (owner decision, this milestone).
This differs from the **materials**, which are British English with
`Thursday 18 Sept` date forms and a 24-hour clock — that gate governs posters,
not the app.

**Sound:** no string, class name, component name or comment in this phase
describes what a format *sounds like*. RamaDub, MotionLab and re:sonate have no
written manifesto, and *«la grafica non puo' alludervi»* (`sound-manifesto.md`).
A component named `WarmCard` or `ClubButton` would break that rule in a file
every surface imports.

**Venue secrecy.** `(public)/events/[slug]/page.tsx` sits in the largest
conversion unit and is `venue-secrecy` primary. **A layout change that surfaces
a field, un-truncates a string or renders a component earlier can show a venue
before its reveal, and `venue_reveal_sent` is monotone.** That unit's plan is
**Critical** and carries an explicit impact analysis. The same holds for the
money path in the same unit (`SumUpCheckoutModal`, `SumUpCardWidget`).

**The three brand-spelling defects this phase closes** — assigned to Phase 41 by
`40-UI-SPEC.md:643` *"when those surfaces convert"*:

| Site | Today | Becomes |
|---|---|---|
| `(public)/tickets/[id]/page.tsx:127` | `Resonate` in `uppercase tracking-widest text-accent` | the `Wordmark` primitive — `re:sonate`, normal `e`, lower case, colon, `normal-case` on the element |
| `components/membership/MembershipCardView.tsx:28` | `Resonate Member`, same treatment | the `Wordmark` primitive; the following word keeps its own case |
| `(auth)/register/page.tsx:85` | `Join the Resonate community` | `Join the re:sonate community` |

Two of the three sit in single-file conversion units and are cheap.

---

## 12. Accessibility Contract

- **Every pairing introduced here carries its computed ratio** — §5.2, §5.3,
  §5.4, §8.6. Nothing was promoted silently and no Phase 40 value was changed to
  make a number look better.
- **A control's boundary is `--control` `#A493C0`** — 6.29–7.14:1 on the four
  grounds, against WCAG 1.4.11's 3:1. Never `--line*` (max 1.39), never
  `--faint` (3.12 on `--raised`).
- **The accent used as a fill carries `--ground` as its ink** — 6.85:1. White is
  2.91 and `--ink` is 2.52; both fail. Same rule, same arithmetic, as
  `40-UI-SPEC.md` §4.3 applied to the semantics.
- **The focus ring is `--ink` with a 2px offset**, so it lands on the ground at
  15.22–17.29:1 rather than on an accent fill at 2.52:1. `focus-visible:`, never
  `focus:`; `outline-none` with no replacement does not survive.
- **Touch targets are 44 × 44 CSS px by default**, keyed off input capability and
  never off width, with exactly one shrink site at a 36px floor (§6.3).
- **`userScalable: false` is removed** (D-41-08, `layout.tsx:81-92`,
  `40-REVIEW.md` WR-16). A phase about touchability that ships with pinch-zoom
  disabled has removed the workaround for the exact defect RESP-03 exists to fix.
- **Colour is never the only channel.** The active nav entry carries
  `aria-current="page"` as well as its colour — `aria-current` appears **5 times
  in the whole tree** today and in no nav. A state, a stage and a format are all
  identified by **text**.
- **A dialog's behaviour comes from the platform**: Escape, focus trap and
  background inertness from `showModal()`, not from a hand-rolled listener. The
  eleven current overlays have none of the three.
- **Two trees, never a transformed one**, for the table/card switch — the
  WebKit-safe mechanism, on a product whose primary engine is WebKit.
- **`--faint` is not a small-text colour** (3.12–3.54:1). Inherited constraint;
  it stays exposed and unused, and the moment a converted surface reaches for a
  tertiary label the pairing to use is `--muted` on `--surface`, 6.78:1
  (`40-REVIEW.md` WR-12).
- **Body stays 14px minimum; the label/data role is 12px.** `text-[10px]` and
  `text-[11px]` are not declared sizes; the scanner's are Phase 42's, the other
  eleven files' are this phase's.
- **Reduced motion:** this phase adds no animation. `MotionConfig
  reducedMotion="user"` (`MotionProvider.tsx:12`) covers the motion library but
  **not** a CSS keyframe, so any CSS animation a primitive adds carries
  `motion-reduce:`.
- **`color-scheme: dark` stays on `html`**, so native controls, scrollbars and
  form widgets render dark rather than punching a white rectangle into a dark
  page.

---

## 13. What the gates assert, and their exemption lists

`41-VALIDATION.md` records **G5's threshold as blocked on this document**. It is
unblocked here, and every gate's exemption list is written **before** the gate,
per rule 3 in §0.

### G5 — touch targets. State precisely what it asserts, and on what

> **G5 asserts, over the files named in the conversion manifest and only those:
> every `<button>`, `<a>`, `<Link>`, `<input>`, `<select>`, `<textarea>` and
> `<summary>` written outside a primitive carries `min-h-11` (or a larger
> explicit `h-*`/`min-h-*`) in its class string, or matches an exemption below.
> It asserts a class string. It does not assert a rendered box.**

What its green does **not** mean: that anything is 44px. A class-string parser
cannot see a flex stretch, an icon-set height, a `line-height` override, or a
target padded by an ancestor. **H41-4 is the only proof that anything is 44px**,
and it needs a large touch screen — `41-RESEARCH.md` flags that one may not be
available, in which case criterion 5 is recorded `human_needed` and not ticked.

**Exemption list, closed today:**

1. **Phase 42, by path, with the reason in the script:**
   `src/app/(admin)/**/scanner/**`, `src/components/scanner/**`,
   `src/app/(admin)/door/**`. `ScannerClient.tsx:2909,2918` are ~18px and are
   the smallest interactive elements in the tree; they are not this phase's.
2. **Elements rendered by a primitive** — `Button`, `IconButton`, `Chip`,
   `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`, `AppNav`, `StaffNav`.
   The size lives in the primitive and G5 does not parse the call site.
3. **The DataTable desktop branch's row actions**, which carry
   `pointer-fine-only:min-h-9` — §6.3. G5 permits `min-h-9` **only** when both
   that variant and the DataTable import are present in the file.
4. **A wrapper whose only child is another interactive element** — a `<Link>`
   around a `<Button>`. It must carry **`data-target="child"`**, a declared
   marker the gate reads. A marker beats a heuristic: it forces the author to
   say so, and it is greppable.
5. **A visually-hidden input whose visible target is its label** — the pattern is
   `peer sr-only` on the input plus a `<label>` carrying `min-h-11`. G5 reads the
   label.
6. **Non-interactive `Badge`** — G5 scans interactive elements only, and a badge
   is not one. **A badge that is a `<Link>` or a `<button>` is a Chip** and is
   not exempt.

**Before it is committed** (D-41-19): proven **red** by mutating one `min-h-11`
to `min-h-8` in a converted file, with the mutation asserted to have landed
before the result is read; and proven **green** on the hardest correct file in
the tree — **`components/admin/MemberTable.tsx`**, 1 395 lines, both branches,
checkboxes, row actions and wrappers. If it cannot go green on that file, it is
not written (`41-VALIDATION.md`, sign-off).

### The other gates, and the values they now have

| Gate | Threshold this document fixes | Exemptions, written now |
|---|---|---|
| **G1 conversion** | — | raw-palette regex must not match `bg-black/60`, `bg-black/80`, `bg-black/90` (modal scrims) nor the nine two-stop accent fades; `globals.css` and `ColorSwatchPicker.tsx` exempt; `refuse()` → exit 2 on an empty manifest |
| **G2 dialogs** | the primitive's signature is `showModal()` + `items-end md:items-center`; **no file outside the primitive declares `fixed inset-0 z-[60]`**; **no file rendering `Dialog` imports `useToast`** (§8.3) | `Lightbox.tsx` — full-bleed media viewer, `bg-black/90`. `MyMediaSection.tsx:184` is the tree's only `role="dialog"` and is not a `<dialog>` |
| **G3 tables** | **one breakpoint: `md`** | `ReviewListClient.tsx` — the copy-out diagnostic grid, D-41-16, with the reason in the script |
| **G4 container** | the shell declares `max-w-5xl` / `max-w-7xl` / `max-w-sm`, and every converted page's outermost element comes from it | the `wide` and `focus` lists in §4 are the manifest G4 reads |
| **G6 (new, cheap) breakpoints** | **no `sm:`, `xl:` or `2xl:` in a converted file** | none. This one has no legitimate exception, which is what makes it worth writing |
| **G7 (new, cheap) no viewport read** | `matchMedia`, `useSyncExternalStore`, `innerWidth` have **zero** occurrences under `src/` | none. Zero today; the gate keeps it zero (§0 rule 6) |
| **`npm run verify`** | one aggregate script (D-41-18, closes `40-REVIEW.md` WR-09) | — |

**Verification is `npm run build` plus these structural gates plus a written
manual procedure.** There is no test runner for the product — no `test` script,
no `*.test.*`, no `*.spec.*` — and **no acceptance criterion in this contract
rests on tests passing.** Where a contract can only be checked by a person,
§13's H-list says so: **H41-1** (three widths per surface), **H41-2** (sheet,
window, Escape, background scroll — and the unverified `showModal()` scroll-lock
claim, A2, gets settled there), **H41-3** (the densest table on a phone),
**H41-4** (measure the smallest control on a large touch screen), **H41-5** (the
other half of the `any-pointer` trade), **H41-6** (all eight tabs at 768px).

---

## 14. Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | **none** — not initialised; refused by D-40-01 and re-refused by D-41-20 | not applicable |
| third-party | **none declared** | not applicable |

No `components.json` (verified absent). `package.json` declares **21 runtime
dependencies and not one UI kit** — no Radix, no Headless UI, no vaul.
`createPortal` is used nowhere. Every mechanism in this document is a platform
feature (`<dialog>`, `showModal()`, `@media (any-pointer: …)`, logical
properties) or already present in Tailwind 4.2.1, verified in the installed
bundle. **The vetting gate did not run because there is nothing to vet** —
recorded as evidence, not as intent. If a plan proposes any package, the
legitimacy audit re-runs before it is installed, and the proposal answers first
why the platform feature is insufficient.

---

## 15. What Phases 42, 44 and 45 inherit

A primitive set chosen only for today's screens gets re-opened twice
(`41-CONTEXT.md` §Phase Boundary).

| Phase | Takes from here | Must not expect |
|---|---|---|
| **42 — scanner** | the three tiers, the container maximum (`RESP-05`: *the scanner centres rather than stretches*), the type floor, and §5.3's fill-inverts-ink arithmetic applied to its own flash colours | **any behavioural change.** Flash timing, haptics, auto-return, torch, offline verdict and undo are a safety surface. And **no accept colour** — the semantic set still has none (`40-UI-SPEC.md` Open Question 3) |
| **44 — the calendar comes inside** | `DataTable` (one breakpoint, two trees), `PageShell width="wide"`, the data role + `tabular-nums` for every date, progressivo and count, `SectionHeading`, the three-tier grid axis | a per-format materials palette. It does not exist for RamaDub or MotionLab, and the identification colour does not anticipate it |
| **45 — production sections** | the same, plus `Chip`/`Badge` for stage marks — *mapped / verified / contacted / acquired* | **a colour meaning "acquired".** The stage is **text** (`venue-acquisition.md`, gate *lo stato prima del nome*); a hue that encoded it would be a stage nobody could read |

**One rule crosses all three.** Anton and Space Mono are the **poster** faces,
not the interface's (`36-VISUAL-SOURCE.md`, *«l'errore piu' facile di tutta
questa lettura»*). Neither appears in this contract and neither may appear in a
phase that inherits it.

---

## 16. Repository Safety

- **`.planning/` is tracked and this repository is PUBLIC.** Everything in this
  file is published irreversibly.
- **No venue under negotiation, no unannounced date, no line-up, no personal
  name appears here.** Roles, never people.
- **Every colour named here was already public** — the six sunset values are
  committed in `.claude/rules/brand-visual-system.md`, and the grounds, inks,
  lines and semantics were published in `36-VISUAL-SOURCE.md` on 2026-08-10.
  **`--control` `#A493C0` is `--muted`'s value, already published in
  `globals.css:40`.** This phase publishes no new brand material.
- **Structure crosses, content never does** (D-40-03).

---

## Open Questions — for the owner, not for a planner

None blocks planning. Each would change a value, not a structure.

| # | Question | Consequence of leaving it open |
|---|---|---|
| **1** | **Does the side column want the product entries and the work tabs in one list, or two groups?** This document chose **two groups under a `Work` heading**, because the product entries are entitlement-scoped for every visitor and the work tabs exist only under `(work)/`. | One group would be shorter and would blur two different things. Reversible: it is the column's internal composition, not its width or its existence |
| **2** | **Is 1024px the right default measure?** Chosen so restraint is visible at 1440px (§4). | A different value is one line in the shell and touches no page, because no page declares a width |
| **3** | **`40-UI-SPEC.md` §5.1 lists the wordmark under the display face and §5.5 under the data face.** §7.2 resolves it toward the data face on the strength of the artifact's own wording. | If the owner reads the wordmark as display, it is one class on one primitive and no consumer changes. Recorded rather than smoothed over, because `globals.css:331-335` repeats the summary table's wording and the next reader will meet it |

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

*Phase 41 — written 2026-08-11. Every contrast ratio computed with the WCAG 2.x
relative-luminance formula against the named ground, and reproducing
`40-UI-SPEC.md` §4.1 exactly where the two overlap. Every count re-measured on
this tree with the command recorded, and every claim about the current code
carries `file:line`. Contains no venue under negotiation, no unannounced date,
no line-up and no personal name: `.planning/` is tracked and this repository is
public.*
