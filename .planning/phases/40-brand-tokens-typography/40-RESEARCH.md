# Phase 40: Brand Tokens & Typography — Research

**Researched:** 2026-08-11
**Domain:** Tailwind CSS v4 CSS-first token layer · `next/font` typography roles · Serwist/Next release-generation boundary
**Confidence:** HIGH on everything measured in this tree; MEDIUM on installed-PWA manifest semantics (platform behaviour, not code); LOW on nothing that blocks planning.

> **How to read the tags.** `[VERIFIED]` means a command was run on this tree
> today, or a file in `node_modules/` was read, and the output is quoted.
> `[CITED: url]` means an official document said it. `[ASSUMED]` means training
> knowledge only — every such claim is listed in the Assumptions Log.
>
> `.planning/codebase/` (dated 2026-02-24) was **not** used as a source for any
> claim here. Neither was memory. Where this document repeats a figure from
> `40-UI-SPEC.md`, the figure was **re-measured**, and §1 says so line by line.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-40-01 (owner, 2026-08-11): the colours are the artifact's colours, and the
  layouts are the artifact's layouts.** Stated as *«i colori e i layout devono
  essere gli stessi dell'artifact produzione»*. The product adopts the
  production tracker's token set as declared in `36-VISUAL-SOURCE.md`, and does
  not maintain a second palette of its own.
- **D-40-02: the layout half of D-40-01 binds Phase 41, not this phase.** This
  phase's job is to make that possible — a token set shaped so Phase 41 can land
  the artifact's layouts without redefining colour.
- **D-40-03: structure crosses, content never does.** "The same layouts" means
  the same **construction** — the chip row, the underline, the card — never the
  same **content**. `.planning/` is published (Guardrail 5).
- **D-40-04: `--accent: #e5484d` does not survive.** Consumed by 101 `.tsx`
  files, so retargeting its value is one line and reaches all of them. The 73/74
  files using default Tailwind colours belong to Phase 41.
- **D-40-05: the interactive accent and a format's identification colour are two
  tokens, even where they hold the same value.** Two tokens, one value, and the
  coincidence written down, so separating them later is a value change and not a
  refactor.
- **D-40-06: `--soy` (`#8C82A6`) does not enter the product's token set.** Its
  meaning must be asked, not deduced. It stays out until answered.
- **D-40-07: no light theme, and that is not a gap to fill.** A declared choice
  — *«commit deliberato al mondo notturno»*.
- **D-40-08: display = Orbitron, interface = Inter, data = mono.**
- **D-40-09: the defect is that the display face is doing prose duty.** Phase 40
  inverts the default: prose gets the interface face, display is applied **by
  role**, and the menu's local override becomes unnecessary rather than being
  multiplied.
- **D-40-10: `Avenir Next` is substituted, and the substitution is declared.**
  Inter is the substitution; it is already a dependency.
- **D-40-11: nothing in this phase may reload a page by itself.** *«DS-10 is
  satisfied by making a mixture impossible or visible, never by reloading.»*
- **D-40-12: the token layer must be self-consistent per document, not per
  request.** The failure DS-10 names is a **document holding one generation of
  styles while fetching another**. How — a versioned token stylesheet, a
  precache ordering rule, or something the research finds — is the planner's,
  subject to D-40-11.

### Claude's Discretion

- The exact mechanism for D-40-12 within Serwist's existing structure.
- Whether the token set lives in `globals.css`, a dedicated file, or a `@theme`
  block — as long as one file is the thing a person edits.
- The naming scheme for the tokens, provided the artifact's **roles** (ground /
  surface / raised / sunk / ink / ink-2 / muted / faint / line*) survive the
  rename recognisably.
- Which of the 73 default-Tailwind files, if any, need touching to prove the
  layer works. **The default is: as few as possible.** Converting surfaces is
  Phase 41.

### Deferred Ideas (OUT OF SCOPE)

- **Converting the 73 default-Tailwind surfaces** — Phase 41, one whole surface
  at a time.
- **The scanner's colour and contrast** — Phase 42.
- **A light theme** — refused rather than deferred (D-40-07).
- **The material palettes of RamaDub and MotionLab** — still to be designed; the
  identification colour is **not** that palette and does not anticipate it.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description (`.planning/REQUIREMENTS.md`) | Research support |
|----|---|---|
| **DS-01** | Colour, surface and line come from tokens; no page defines its own brand colour | §2 (Tailwind v4 `@theme` mechanics, verified), §5 pitfall P1 (a missing token is silent — the build cannot enforce this, a `grep` gate must), §7 gate G1 |
| **DS-02** | Format colours appear only where a format is identified, and semantic colours are separate from brand colours | §2.4 (`--sem-*` prefix is what makes it greppable), §7 gate G2. The *structural* separation, not a chromatic one — two of four semantics coincide in value (`40-UI-SPEC.md:260-268`) |
| **DS-03** | The sunset gradient appears on SunSet surfaces and nowhere else | §7 gate G3 — allow-list is empty today and the check must exclude its own declaration site |
| **DS-05** | Display, data and interface each have one typeface, and data figures align in columns | §3 (font wiring, verified: only two `next/font` call sites), §3.3 (`tabular-nums` composes through `--tw-*` properties; the mono role makes column alignment independent of `tnum`) |
| **DS-06** | The brand is written with a normal "e" everywhere outside the logo — including page titles, social previews and the installed app name | §4 — four `layout.tsx` sites already correct (verified), `public/manifest.json:2-3` must change, and §4.2 is the honest limit on what "installed app name" can be *proved* to mean |
| **DS-10** | After a release, no device is left serving a mixture of old and new styles | §6 — the whole of it. Next's build-ID guard already covers navigation (verified in `node_modules/`); the remaining hole is the **orphaned stylesheet**, and §6.4 names the two lines that cause it |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

Binding on the plan, with the same authority as a locked decision.

| # | Directive | Consequence for this phase |
|---|---|---|
| 1 | **No test runner exists for the product.** No `test` script; no `*.test.*` / `*.spec.*` outside `node_modules` — re-verified today. | Nothing here may be called "verified because tests pass". The gate is `npm run build` plus written manual observation. §7 assigns a concrete proof to every requirement and says which have none. |
| 2 | **`npm run build` is also the typecheck.** No separate `typecheck` script. | A green build is the *only* automatic gate — and §5 P1 proves it is **blind to this phase's central failure mode**. |
| 3 | **The repository is PUBLIC**; production material must stay out. | Every colour named here was already public before today (`brand-visual-system.md`, and `36-VISUAL-SOURCE.md` of 2026-08-10). No venue, date, line-up or personal name appears. |
| 4 | **`npm run verify:persona` covers the persona, not the product.** | Irrelevant to this phase unless `.claude/**` is touched. It is not. |
| 5 | **macOS/BSD shell** — `grep -E`, `sed -i ''`. | Every command in §7 is written in BSD form. Note the trap: `sed -n "$n,+5p"` **fails on BSD** (`invalid command code ,`) — hit twice during this research. Use `sed -n "start,endp"`. |
| 6 | **`.claude/rules/brand-visual-system.md`** — palette, gradient exclusivity, CamelCase format names, `re:sonate` with a normal e. | Reported in §2, never re-derived. |
| 7 | **`meta-gates.md` — zero silent failures, and no error tracking exists.** | §5 P1 is a silent failure by construction. It is why §7's gates are the deliverable and not a nicety. |
| 8 | **`checkin-offline.md`** — the door's asymmetry, and the warm-up gate. | §6.5's recommended mechanism trades against this gate deliberately, and §6.6 states the cost in the gate's own words. |

---

## Summary

Three of this phase's six requirements are **already technically settled** and
need only careful execution: the token file's shape (Tailwind v4 CSS-first
config is already in place at `globals.css:13`), the typography wiring (two
`next/font` call sites, both located), and DS-06's product half (four
`layout.tsx` metadata sites already read `re:sonate`; only `public/manifest.json`
is wrong). Every figure in `40-UI-SPEC.md` was independently reproduced today —
**all six match exactly** (§1). The UI-SPEC is trustworthy and the planner
should treat it as the contract it says it is.

The research therefore concentrated where the plan can actually go wrong, and it
found three things the UI-SPEC did not have:

**First — the build cannot enforce DS-01, and this is proven, not argued.**
Running `@tailwindcss/postcss` 4.2.1 directly on a fixture, a utility whose
token no longer exists emits **no rule, no warning, no error**; the process
exits clean. A token rename is therefore a *silent* failure, in a repository
whose `meta-gates.md` forbids exactly that and which has no error tracking to
catch the consequence. Mechanical `grep` gates in the shape of the seven
existing `scripts/verify-*.mjs` are not a nicety here; they are the only
enforcement that exists.

**Second — DS-10's harder half is already solved by Next, for free, and in
precisely the shape D-40-11 demands.** Next 16.1.6 stamps every RSC response
with the build ID. On a **navigation** the router refuses to stitch two
generations and performs a full document load of *the URL the person tapped*
(`fetch-server-response.js:142-144`). On a **prefetch** it rejects the cache
entry and does **not** navigate — four call sites in `segment-cache/cache.js`,
each carrying the comment *"Treat as a 404. During an actual navigation, the
router will trigger an MPA navigation."* So a release landing while a page is
open cannot move that page by itself. No configuration; already active. And
`deploymentId`, which the UI-SPEC raised as the candidate, turns out to be
**actively harmful here** — §6.3.

**Third — the remaining hole is the orphaned stylesheet, and its two causing
lines are now named.** `Serwist.handleActivate` deletes from the precache every
entry absent from the new manifest (`serwist/dist/index.js:1228-1245`), and CSS
filenames are content hashes, so the previous stylesheet is deleted the moment
the new worker activates. Meanwhile documents reach the `pages` cache by two
paths, and one of them — `cacheOnNavigation: true` at `next.config.ts:7` — writes
straight into `caches.open("pages")` bypassing every runtime route, **and
refuses to ever refresh what it wrote** (`if (isPageCached) return;`). A
document offline, within 24 h, naming a stylesheet that was deleted, is an
unstyled page. That is the door.

**Primary recommendation:** declare the whole token set in `globals.css` using
the `@theme inline` block that already exists; retarget `--font-sans` and
`--font-mono` rather than adding new names; **do not set `deploymentId`**; close
DS-10 structurally by purging the three document caches on service-worker
`activate` (which fires only on a release), and pair that with turning
`cacheOnNavigation` off — a one-line, reversible change to a setting that was
never a declared decision. Then write four `verify-*.mjs` gates, because
`npm run build` will not catch any of it.

---

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|---|---|---|---|
| Colour / surface / line tokens | **CDN / static — build-time CSS** | Browser (custom-property resolution) | Tokens are compiled into one stylesheet at build; nothing resolves them at runtime except the browser's cascade |
| Format identification colour | **Database / storage** | Browser (inline `style`) | D-36-12: it is data on a `formats` row, not a class. Changing it must not be a deploy. `40-UI-SPEC.md` §3.3 |
| Typeface loading | **CDN / static** (`next/font` self-hosts into `/_next/static/media`) | Frontend server (root layout emits the variable class) | Verified: 8 woff2 in the precache, all under `/_next/static/media/` |
| Brand name in page titles / previews | **Frontend server** (`layout.tsx` `metadata`) | — | Rendered server-side into the document head |
| Brand name as installed app label | **Browser / OS** (`manifest.json`, read by the platform at install) | — | §4.2 — the OS owns it, and it does not re-read reliably after install |
| Release-generation boundary | **Browser — service worker** | Frontend server (build ID in the RSC payload) | The mixture DS-10 forbids is produced by caches on a device, not by the server |
| Splash / chrome colour | **Browser / OS** (`manifest.json`, `viewport.themeColor`) | — | Painted before any stylesheet loads — no surface conversion can reach it |

**Why this map matters here:** three of the seven capabilities are owned by a
tier that a surface-by-surface conversion **cannot see** — the OS-owned app
label, the OS-owned splash colour, and the device-owned cache. All three are in
this phase precisely because Phase 41's per-surface method would never reach
them.

---

## 1. What is on disk today — every UI-SPEC figure re-measured

`40-UI-SPEC.md` §1 publishes six counts. All six were re-run on this tree on
2026-08-11 **after** the UI-SPEC was written. **All six match.** `[VERIFIED]`

| Figure | UI-SPEC | Re-measured | Command |
|---|---|---|---|
| `.tsx` files | 181 | **181** | `find src -name "*.tsx" \| wc -l` |
| files mentioning `accent` | 101 | **101** | `grep -rl "accent" src --include="*.tsx" \| wc -l` |
| files using a `*-accent*` utility | 86 | **86** | `grep -rlE "(bg\|text\|border\|ring\|from\|to\|via\|fill\|stroke\|shadow\|outline\|decoration)-accent" src --include="*.tsx"` |
| files using a default-Tailwind palette colour | 74 | **74** | same prefix set × 22 palette names × 11 steps |
| files carrying a brand hex | 1 | **1** — `ColorSwatchPicker.tsx` | `grep -rniE "#(0A0712\|140D20\|…)" src` |
| values in `globals.css:3-11` | 7 | **7**, none from the brand | read |

Additional inventory, measured for the planner rather than quoted:

| | | |
|---|---|---|
| `glow-accent` / `glow-accent-strong` consumers outside `globals.css` | **0** | confirms UI-SPEC finding F1 — both utilities are dead, and both hardcode `rgba(229,72,77,…)` **inside the token file** |
| `ɘ` (U+0258) occurrences in tracked source | **1**, `src/app/layout.tsx:16`, inside the comment that explains the rule | not a violation |
| `next/font` call sites | **2** — `layout.tsx:3`, `menu/page.tsx:2` | §3 |
| `tabular-nums` sites | **10**, at exactly the ten `file:line` the UI-SPEC lists | §3.3 |
| `uppercase` files | **43** | the inheritance trap behind the wordmark's `text-transform: none` |
| `font-medium` / `font-semibold` / `font-bold` / `font-normal` | 95 files·397 · 63·140 · 65·86 · 1·2 | the size of the two-weight bill |
| `var(--token, #hex)` fallbacks in `src` | **0** | UI-SPEC §8.3 clause 2 is currently clean — this is a *hold-the-line* gate, not a migration |
| `tailwind.config.*` | **absent** | glob matches nothing; `postcss.config.mjs` loads `@tailwindcss/postcss` only |

**Green build baseline, established today.** `npm run build` → **exit 0**
`[VERIFIED]`. Two CSS chunks emitted, and rebuilding with no source change
reproduced both **byte-identically**:

| File | Bytes | Holds |
|---|---|---|
| `.next/static/css/149e906c690e936f.css` | 72 115 | the whole Tailwind output **and** `globals.css`'s `:root` |
| `.next/static/css/7e7d96b1e6991756.css` | 2 063 | only the menu page's eight Inter `@font-face` rules |

> **This is a usable mechanical acceptance criterion.** CSS filenames are
> **content hashes**, not build IDs — proven by the byte-identical rebuild. If
> Phase 40 succeeds, `ls .next/static/css` returns **one** file (the menu page's
> local font import is gone) and its hash differs from `149e906c690e936f`.
> "One stylesheet holds every token" stops being a claim and becomes a
> directory listing.

---

## 2. Tailwind CSS v4 — the token layer, as this codebase must write it

**Installed and verified today:** `tailwindcss@4.2.1`, `@tailwindcss/postcss@4.2.1`,
`next@16.1.6`, `react@19.2.3`, `serwist@9.5.6`, `@serwist/next@9.5.6`. `[VERIFIED: read from node_modules/*/package.json]`
**No `tailwind.config.*` exists.** CSS-first configuration only.

### 2.1 `@theme` vs `:root`, and what `inline` actually does

Official rule `[CITED: tailwindcss.com/docs/theme]`:

> Theme variables aren't *just* CSS variables — they also instruct Tailwind to
> create new utility classes… Theme variables are also required to be defined
> top-level and not nested under other selectors or media queries.

Use `@theme` for anything that must become a utility class; use `:root` for a
plain variable that should not. The `inline` modifier exists for one documented
situation — **a theme variable whose value is `var(…)` of a variable defined
lower in the tree**, which is exactly `next/font`'s shape:

```css
@theme inline {
  --font-sans: var(--font-inter);
}
```

`[CITED: tailwindcss.com/docs/theme]` — without `inline`, `var(--font-sans)`
resolves where `--font-sans` was *defined*, and the font variable is not in
scope there.

**What `inline` does in this codebase, measured rather than inferred**
`[VERIFIED: ran @tailwindcss/postcss 4.2.1 on src/app/globals.css]`:

```css
/* input  */  @theme inline { --color-accent: var(--accent); }
/* output */  .bg-accent      { background-color: var(--accent); }
              .border-accent  { border-color:     var(--accent); }
              .hover\:bg-accent-hover { &:hover { @media (hover:hover) {
                                background-color: var(--accent-hover); } } }
```

The utility references **`var(--accent)`** — the raw `:root` property — not
`var(--color-accent)`. Same result in the shipped bundle: `.next/static/css/149e906c690e936f.css`
contains `.border-accent,.border-accent\/20{border-color:var(--accent)}`.

> **This is the mechanical reason behind UI-SPEC §8.3 clause 1.** With `@theme
> inline`, every utility class is a **forward reference into `:root`**. If a
> document ever loaded utilities from one generation and `:root` from another,
> `var(--ground)` resolves to *nothing* — not to the old colour. That is the
> flash of unstyled content DS-10 forbids, and it is why the two must ship in
> one file. Today they do, and the coupling is visible: `:root{--background:#0a0a0a;…}`
> sits in the **same** 72 115-byte chunk as every utility.

Opacity modifiers compose through `color-mix`, so they follow a retarget for
free: `.border-accent\/20{border-color:color-mix(in oklab,var(--accent) 20%,transparent)}`
`[VERIFIED]`. **48 files use `accent/` opacity utilities** — they inherit the
new value with no edit, which is the cheap half of D-40-04.

### 2.2 Namespaces this phase touches

`[CITED: tailwindcss.com/docs/theme]`

| Namespace | Generates | Used here for |
|---|---|---|
| `--color-*` | `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*`, … | grounds, inks, lines, `--accent`, `--sem-*` |
| `--font-*` | `font-sans`, `font-mono`, `font-display` | the three roles (§3) |
| `--text-*`, `--font-weight-*`, `--spacing-*`, `--radius-*` | sizes, weights, spacing, radii | **untouched** — UI-SPEC §2 declares no new spacing token, deliberately |

### 2.3 Removing the default palette is Phase 41's lever, not this phase's

`@theme { --color-*: initial; }` replaces the entire colour namespace
`[CITED: tailwindcss.com/docs/theme]`, and `--*: initial` clears every default.
That is the eventual **mechanical** enforcement of DS-01 — after it, `bg-slate-800`
simply does not exist.

> **It must not be done in Phase 40.** 74 files still use those utilities, and
> per §5 P1 the removal produces **no error** — it silently blanks their colour.
> Record it as the tool Phase 41 closes with, once its file count reaches zero.

### 2.4 The `--sem-*` prefix is what makes DS-02 checkable

UI-SPEC §3.4 argues the prefix *"is what lets a script hold it"*. That argument
is sound for a mechanical reason: with `@theme inline`, the generated class name
is derived verbatim from the token name, so `bg-sem-crit` and `bg-surface` are
distinguishable by a fixed-string `grep` with no parsing. Confirmed by the
utility output above. §7 gate G2 is the script the UI-SPEC commissioned and then
noticed it had not written.

**Values on both sides must be literal.** `--sem-warn: #FFB25E`, never
`--sem-warn: var(--amber)`. Two of the four semantics coincide in value with a
brand token (`40-UI-SPEC.md:260-268`), so there is no chromatic separation to
lean on — only a structural one, and a `var()` from one set into the other
dissolves it.

---

## 3. Typography — the wiring, measured

### 3.1 Only two font call sites exist, and they are not symmetrical

`[VERIFIED: grep -rn "next/font" src]`

| Site | Code | Shape |
|---|---|---|
| `src/app/layout.tsx:3,8-11` | `Orbitron({ subsets:["latin"], variable:"--font-orbitron" })` | **CSS variable**, applied as `<html className={orbitron.variable}>` (`:55`) |
| `src/app/(public)/events/[slug]/menu/page.tsx:2,21` | `Inter({ subsets:["latin"], display:"swap" })` | **`className`**, applied as `<div className={\`… ${menuFont.className}\`}>` (`:152`) |

> **This asymmetry is a trap for the plan.** Moving Inter to the root layout is
> **not** a relocation of the import. Today's Inter call has **no `variable`
> option** — it produces a class, not a custom property. The plan must *add*
> `variable: "--font-inter"`, apply it on `<html>` alongside Orbitron's, and
> delete the `className` application at `:152`. A task written as "move the
> import" produces a font variable that does not exist and a `--font-sans` that
> resolves to nothing.

`--font-orbitron` is declared on the generated class, not on `:root` — verified
in the built CSS: `.__variable_e087fb{--font-orbitron:"Orbitron","Orbitron Fallback"}`.
Since that class sits on `<html>`, `@theme inline` is the **required** form for
`--font-display: var(--font-orbitron)`; this is precisely the case the Tailwind
docs give for `inline`.

### 3.2 Retarget `--font-sans` and `--font-mono`; do not add new names

Tailwind v4 binds the document's default family through `--default-font-family`.
`[VERIFIED]` — the built theme layer contains, verbatim:

```
--default-font-family: var(--font-sans);
--default-mono-font-family: var(--font-mono);
```

So retargeting `--font-sans` moves **every element nobody styled** into the
interface face. That is the whole of D-40-09, achieved without touching a
component. UI-SPEC §5.2 is correct on this point.

**One correction to UI-SPEC §5.2, small but real.** It says Tailwind v4 "already
ships `--font-mono` with almost this list". The shipped default, read from the
built CSS `[VERIFIED]`, is:

```
--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
             "Liberation Mono", "Courier New", monospace;
```

It contains **neither** `"SF Mono"` (quoted, the installed-name form) **nor**
`"JetBrains Mono"` **nor** `"IBM Plex Mono"` — the three the artifact names. So
the `--font-mono` value in UI-SPEC §5.2 is a **retarget**, not an inheritance,
and the plan should write it out rather than assume the default already says it.
The conclusion is unchanged: it is a system stack, it costs zero bytes and zero
fetches, and `ui-monospace` resolves to SF Mono on Apple platforms.

**Fallback tail.** `next/font` generates a metric-adjusted fallback resolving
through `local("Arial")` — verified in the built CSS
(`src:local("Arial");ascent-override:81.50%;…size-adjust:124.05%`). Arial is not
present on Android `[ASSUMED — A2]`, which is why UI-SPEC §5.2 appends a
`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` tail. Cheap, and
correct whether or not the premise holds.

### 3.3 Figures — what `tabular-nums` is and is not

Tailwind v4 compiles `.tabular-nums` into a **composed** property `[VERIFIED,
from the built CSS]`:

```css
.ordinal,.tabular-nums{font-variant-numeric:
  var(--tw-ordinal,) var(--tw-slashed-zero,) var(--tw-numeric-figure,)
  var(--tw-numeric-spacing,) var(--tw-numeric-fraction,)}
.tabular-nums{--tw-numeric-spacing:tabular-nums}
```

Two consequences the planner should write into the token file as a comment:

1. A raw `font-variant-numeric: tabular-nums` on a role rule and a
   `.tabular-nums` utility on a descendant **do not conflict** — the utility
   simply re-states it.
2. But the `--tw-numeric-*` properties are registered `inherits: false`, so a
   descendant carrying a *different* numeric utility (`.slashed-zero`,
   `.ordinal`) rebuilds the whole property from that set and **drops the
   inherited `tabular-nums`**. Today `src` uses only `tabular-nums` — the trap
   is latent, not live. One comment costs nothing and prevents a figure column
   silently losing alignment two phases from now.

**On Inter and `tnum`:** Inter's own documentation lists `tnum` among its
OpenType features `[CITED: rsms.me/inter]`, and the same page recommends *not*
using the Google Fonts copy — which is exactly the copy `next/font/google`
fetches. So "Inter carries `tnum`" is **MEDIUM**, not HIGH.

> **It is moot for DS-05, and this is the honest reading rather than a dodge.**
> DS-05's load-bearing clause is *«data figures align in columns»*, and D-40-08
> assigns the data role to **mono**. In a monospaced face every glyph — figures
> included — has the same advance width **by construction**. Column alignment is
> therefore guaranteed by the role assignment and is independent of whether any
> particular face ships `tnum`. Inter's `tnum` only affects figures set in
> *prose*, where no column exists. If the planner wants the fact anyway, the
> check is a DevTools one, not a build one — §7 records it as optional.

---

## 4. DS-06 — where the brand name is emitted, enumerated

### 4.1 Already correct `[VERIFIED: read src/app/layout.tsx]`

| Site | Value |
|---|---|
| `layout.tsx:20` `title` | `re:sonate` |
| `layout.tsx:24` `openGraph.title` | `re:sonate` |
| `layout.tsx:30` `twitter.title` | `re:sonate` |
| `layout.tsx:37` `appleWebApp.title` | `re:sonate` |

`grep -rn "ɘ" src public *.json *.ts` returns **one** hit — `layout.tsx:16`,
inside the comment explaining the rule. `[VERIFIED]`

There is **no** `src/app/manifest.ts` / `manifest.tsx` `[VERIFIED: find]`. The
manifest is the static `public/manifest.json`, referenced at `layout.tsx:22`.

### 4.2 Must change, and what changing it can and cannot prove

| Site | Today | Must read | Class |
|---|---|---|---|
| `public/manifest.json:2` `name` | `"Resonate"` | `"re:sonate"` | DS-06 |
| `public/manifest.json:3` `short_name` | `"Resonate"` | `"re:sonate"` | DS-06 |
| `public/manifest.json:7` `background_color` | `#0a0a0a` | `#0A0712` | splash screen |
| `public/manifest.json:8` `theme_color` | `#0a0a0a` | `#0A0712` | OS/browser chrome |
| `src/app/layout.tsx:46` `viewport.themeColor` | `#0a0a0a` | `#0A0712` | browser chrome |

**The manifest ships correctly — verified, and worth stating because it could
easily not have.** `/manifest.json` is entry 130 of the precache with a content
revision (`rev='7201f54f202ce60f6e10a6961b371cbd'`), and the precache route is
registered **before** every runtime route (`serwist/dist/index.js:1080`), so it
is not left to `defaultCache`'s `static-data-assets` `NetworkFirst`. Editing the
file changes its revision, which changes the worker, which ships it. `[VERIFIED]`

**But the OS may not read it again, and criterion 4 must be written knowing
that.** `[CITED: intercom.help/progressier — "What fields of a PWA's manifest
can be updated after installation?"]` reports that on **iOS no manifest field
updates after installation** — a reinstall is required; and that on Android the
fields that trigger an update are `background_color`, `display`, `orientation`,
`scope`, `shortcuts`, `start_url`, `theme_color` and `web_share_target` —
**`name` and `short_name` are not in that list.**

> **Consequence the plan must carry, not discover.** ROADMAP criterion 4 says
> *"the installed app name"*. Editing `manifest.json` makes that true **for a
> fresh install**. It does not, and cannot, change the label under the icon on a
> phone where the app is already installed. The honest acceptance criterion is
> therefore two-part: *(a)* the file reads `re:sonate` — a `grep`; *(b)* a
> **fresh** install on a device shows `re:sonate` under the icon — a human
> observation, and one that **cannot be repeated on that device** without
> uninstalling. Do not write a criterion that an existing install can fail.
>
> The splash colour is the friendlier half: `background_color` **is** in
> Android's update list, and it is also the one defect no surface conversion
> could ever reach.

### 4.3 Out of scope — 25 further `Resonate` literals

`40-UI-SPEC.md` §6.4 enumerates them in 15 files across four owners, of which
three classes are **unowned in v1.5**: the Wallet pass (`lib/apple-wallet.ts:82,88`),
the payment sheet's `merchantName` (`SumUpCardWidget.tsx:113`), and every email
subject/body/footer. The last row is the one to carry forward: the `From` name
defaults to `"Resonate <…>"` in four files but is really `RESEND_FROM_EMAIL`, an
**environment value set on Vercel** — *no code change closes it.*

**A tick on ROADMAP criterion 4 must not be read as closing DS-06**, whose own
word is "everywhere". The plan should say so in the requirement mapping.

---

## 5. Common Pitfalls

### P1 — A missing token is a silent no-op. The build will not catch it. *(HIGH — proven)*

**What goes wrong:** a token is renamed, or a utility is typed against a token
that does not exist. The colour silently disappears. Nothing fails.

**Proof, not argument.** `@tailwindcss/postcss` 4.2.1 was run directly on a
fixture containing `bg-ground` (declared), `bg-accent-hover` (undeclared) and
`totally-unknown-class`: `[VERIFIED]`

```
BUILD: OK (no error thrown)
warnings: []
  .bg-ground              emitted? YES
  .bg-accent-hover        emitted? no
  .totally-unknown-class  emitted? no
```

Exit clean, zero warnings, zero errors.

**Why it happens:** Tailwind generates utilities for what it can resolve and is
silent about what it cannot — by design, since it cannot distinguish a typo from
a string that merely looks like a class name.

**How to avoid:** UI-SPEC §8.3 clause 3 already states the rule — *token names
are additive within a release; a name any shipped document still reads is not
deleted, it is emptied of consumers first and removed second*. This finding
shows the rule has **no automatic enforcement**, so §7 gate G1 must carry it.

**Warning signs:** a diff that renames a token and touches no consumer; a green
build after a rename; a surface that looks "slightly off" rather than broken.

> This is a textbook `meta-gates.md` zero-silent-failure violation, in a
> repository with **no error tracking** — verified again today: `package.json`
> declares 21 runtime dependencies and none is a monitoring client. A colour
> that disappears in production reaches a human only when a human looks.

### P2 — Retargeting `--accent` also moves nine two-stop gradients *(HIGH)*

`40-UI-SPEC.md` §7 records `bg-gradient-to-br from-accent/30 to-accent/5` at
`tickets/[id]/page.tsx:119` and eight more. Those are **accent fades**, not the
sunset gradient; they follow `--accent` automatically, which is correct — and it
is why gate G3 must match the **four-stop `94deg` signature**, never the word
"gradient". A check that fired on all nine would be declared noisy and switched
off. The UI-SPEC's reasoning here is sound and should survive into the plan
verbatim.

### P3 — `text-transform` is inherited, so "we did not add `uppercase`" is not a guarantee *(HIGH)*

43 files carry `uppercase` `[VERIFIED]`. The wordmark and every format name need
`text-transform: none` **on the element itself** — Phase 36 already resolved the
identical problem with `normal-case` on the component (`36-UI-SPEC.md:54-66`).
Reuse that precedent rather than inventing a second treatment.

### P4 — `sed -n "$n,+5p"` fails on BSD *(MEDIUM — hit twice today)*

`sed: 1: ",+5p": invalid command code ,`. Any plan step that scripts a file read
must use `sed -n "start,endp"` with both bounds computed. CLAUDE.md guardrail 6.

### P5 — Deleting `glow-accent` is safe, and the safety is measured *(HIGH)*

`grep -rn "glow-accent" src` matches **only the two declarations in
`globals.css`** — zero consumers `[VERIFIED]`. Both hardcode `rgba(229,72,77,…)`,
the old accent, **inside the token file**, so they would not follow a retarget.
Removing them is not a risk; leaving them is a DS-01 violation living in the
DS-01 file.

### P6 — Changing `manifest.json` cannot be re-tested on a device without uninstalling *(MEDIUM)*

§4.2. Plan the human observation for a **fresh** install, once, and record it —
there is no second attempt on the same phone.

---

## 6. DS-10 — the version boundary, mechanism by mechanism

**Classification: Critical.** This section touches the door.

### 6.1 What is true today, read from `node_modules/` and the built artefacts

| Fact | Evidence |
|---|---|
| `reloadOnOnline: false`, deliberately, with the reason written beside it | `next.config.ts:8-12` |
| `cacheOnNavigation: true` — **no reason written**, and **not the library default** | `next.config.ts:7`; `@serwist/next/dist/lib/types.d.ts` — `cacheOnNavigation?: boolean` `@default false` |
| A new worker takes control of an already-open page immediately | `src/app/sw.ts:122-123` — `skipWaiting: true`, `clientsClaim: true` |
| Navigation preload is on | `src/app/sw.ts:124` — `navigationPreload: true`. Helps online only; irrelevant to the failure below |
| The precache carries **130 entries: 110 JS, 2 CSS, 8 woff2, 5 SVG, 4 PNG, 1 JSON — and zero documents** | `public/sw.js`, manifest extracted and counted today. Confirms `checkin-offline.md`'s gate |
| 108 of 130 entries have `revision: null` (URL is content-hashed); 22 carry an explicit content revision (files from `public/`, plus `polyfills`, `_buildManifest`, `_ssgManifest`, the 8 woff2) | same |
| CSS filenames are **content** hashes, not build IDs | a full rebuild with no source change reproduced `149e906c690e936f.css` and `7e7d96b1e6991756.css` **byte-identically** |
| **The precache route is registered before every runtime route** | `serwist/dist/index.js:1080` — `this.registerRoute(new PrecacheRoute(...))` precedes the `runtimeCaching` loop at `:1105-1107` |
| `deploymentId` is not set | `next.config.ts:16-35` — absent |
| All tokens live in one stylesheet | `:root{--background:#0a0a0a;…}` at offset 67 066 of the 72 115-byte root chunk; the second chunk holds only `@font-face` |

### 6.2 What Next already guarantees, and it is exactly D-40-11's shape `[VERIFIED]`

Next 16.1.6 stamps every RSC payload with the build ID and compares it client-side.

**On a navigation** — `node_modules/next/dist/client/components/router-reducer/fetch-server-response.js:142-144`:

```js
if ((0, _appbuildid.getAppBuildId)() !== flightResponse.b) {
    return doMpaNavigation(res.url);
}
```

**On a prefetch** — four call sites in
`node_modules/next/dist/client/components/segment-cache/cache.js` (`:917`, `:958`,
`:1055`, `:1235`), each with the same comment:

> *"The server build does not match the client. Treat as a 404. During an actual
> navigation, the router will trigger an MPA navigation."*

followed by `rejectRouteCacheEntry(entry, Date.now() + 10 * 1000)` — the entry is
rejected for ten seconds. **The page does not move.**

And the design intent, from `node_modules/next/dist/client/app-build-id.js`:

> *"When performing RSC requests, if the incoming data has a different build ID,
> we perform an MPA navigation/refresh to load the updated build and ensure that
> the client and server in sync."*

> **Read against D-40-11.** A **prefetch** after a release is silent — no
> navigation, no reload. A **navigation the person tapped** is served as one
> whole document of one generation instead of being stitched from two. That is
> not a reload; it is the navigation they asked for. And it never fires at the
> door, because the door does not navigate — someone opens `/door`
> (`src/app/(admin)/door/page.tsx`) and stays there.
>
> **So UI-SPEC §8.2's first shape — "new CSS chunk + old `:root` → a `var()`
> that resolves to nothing" — cannot be produced by a link navigation.** The
> router refuses to stitch. This is already true, with zero configuration, and
> it should be recorded in the plan as *already correct* so nobody builds a
> mechanism for it.

### 6.3 `deploymentId` — the UI-SPEC's candidate, and why it should be refused

UI-SPEC §8.3 raises `deploymentId` as the sanctioned version-skew mechanism. It
exists and it works as described `[VERIFIED: node_modules/next/dist/shared/lib/deployment-id.js`,
`client/components/router-reducer/fetch-server-response.js:176-178`,
`server/config-shared.d.ts:886]`. **It should nevertheless not be set here**, for
two reasons found by reading further:

**(a) It appends `?dpl=<id>` to CSS chunk URLs, not only JS.**
`node_modules/next/dist/client/app-webpack.js:12-18` `[VERIFIED]`:

```js
const suffix = getDeploymentIdQueryOrEmptyString();
const getChunkScriptFilename = __webpack_require__.u;
__webpack_require__.u = (...args) => encodeURIPath(getChunkScriptFilename(...args)) + suffix;
const getChunkCssFilename = __webpack_require__.k;      // ← CSS
__webpack_require__.k = (...args) => getChunkCssFilename(...args) + suffix;
```

**(b) Serwist's precache does not strip that parameter.** The default is
`ignoreURLParametersMatching = [/^utm_/, /^fbclid$/]` — read verbatim from
`node_modules/serwist/dist/chunks/printInstallDetails.js:1345-1348` `[VERIFIED]`
— and the injected manifest holds **bare paths with no query**, confirmed by
extracting all 130 entries.

> **Composed, the two produce: every asset request misses the precache route and
> falls through to the network.** On the door phone with the radio off that is
> no JavaScript at all — the exact failure `checkin-offline.md` exists to
> prevent, introduced by a setting added to *improve* release safety. And
> because `?dpl=` changes on every deploy, the full 130-entry precache would
> churn on every release, re-downloading ~1 MB on whatever connection the phone
> has.
>
> **Disposition: do not set `deploymentId`.** §6.2 already delivers the guarantee
> it was wanted for. If a future phase wants it anyway, it is a **Critical**
> change to the door and must extend `precacheOptions.ignoreURLParametersMatching`
> with `/^dpl$/` **in the same commit**, or it breaks the offline door silently.

### 6.4 The failure that *is* real — the orphaned stylesheet, with its causing lines named

**Step 1 — the old stylesheet is deleted at activate.**
`node_modules/serwist/dist/index.js:1228-1245`, `Serwist.handleActivate` `[VERIFIED]`:

```js
const cache = await self.caches.open(this.precacheStrategy.cacheName);
const currentlyCachedRequests = await cache.keys();
const expectedCacheKeys = new Set(this._urlsToCacheKeys.values());
for (const request of currentlyCachedRequests) {
    if (!expectedCacheKeys.has(request.url)) { await cache.delete(request); … }
}
```

Every entry absent from the **new** manifest is deleted. Since CSS filenames are
content hashes, a release that changes any style changes the URL, and the
previous stylesheet is deleted. With `skipWaiting: true` this runs **while the
old page is still open**.

*(This is `handleActivate`, and it is distinct from `cleanupOutdatedCaches: true`
at `sw.ts:119`, which deletes whole **caches** whose names contain `-precache-`
and differ from the current one — `serwist/dist/chunks/waitUntil.js:417-431`.
Both are in play; only the first causes this.)*

**Step 2 — documents are cached anyway, by two paths, and one never refreshes.**

*Path A — the runtime `pages` route.* `@serwist/next`'s `defaultCache` registers
three document buckets — `pages`, `pages-rsc`, `pages-rsc-prefetch` — each a
`NetworkFirst` with `maxEntries: 32, maxAgeSeconds: 86400`
`[VERIFIED: node_modules/@serwist/next/dist/index.worker.js]`. Freshness is
judged from the response `Date` header, because `maxAgeFrom` defaults to
`"last-fetched"` (`serwist/dist/index.js:521-535`). **This path refreshes**: any
successful online document fetch overwrites the entry.

*Path B — `cacheOnNavigation: true`, and this is the one that bites.*
`next.config.ts:7` turns on a client hook that patches `history.pushState` /
`replaceState` and posts each URL to a dedicated Worker
(`@serwist/next/dist/sw-entry.js:16-39`). That Worker then does
(`@serwist/next/dist/sw-entry-worker.js:13-29`) `[VERIFIED]`:

```js
case "__FRONTEND_NAV_CACHE__": {
  const pagesCache = await caches.open("pages");
  const isPageCached = !!await pagesCache.match(url, { ignoreSearch: true });
  if (isPageCached) return;                 // ← never refreshes what it wrote
  const page = await fetch(url);
  if (!page.ok) return;
  pagesCache.put(url, page.clone());        // ← bypasses every runtime route
}
```

Two properties matter. It writes **straight into `caches.open("pages")`**,
bypassing `doorRuntimeCaching` and `defaultCache` entirely — so even a route
this repository deliberately made `NetworkOnly` can acquire a document copy this
way. And `if (isPageCached) return;` means **a document written under the old
release is never rewritten by this path**.

**Step 3 — the composition, which is UI-SPEC §8.2's second shape, now with a
mechanism.**

> Night N−1: `/door` is opened online on the staff phone. Its document enters
> `pages`, its `<link>` naming `abc.css`. A release ships. The new worker
> installs, activates, and `handleActivate` deletes `abc.css` from the precache.
> Night N, within 24 h, radio off: the `pages` `NetworkFirst` finds no network,
> serves the cached document, and the browser requests `abc.css` — which is no
> longer on the device and cannot be fetched. **An unstyled door, in a dark
> room, in front of a queue.**

The stale window is bounded at **24 h** by the `Date`-header check, which is
exactly the window `checkin-offline.md:59` records the owner deciding to keep.

### 6.5 What the mechanism should be — and it follows an argument the owner has already won

The preference order UI-SPEC §8.3 sets is *impossible beats visible*. Two
structural options meet clause 4 (*"a document and the stylesheet it names are
evictable only together"*); one does not, and is listed so it is not chased.

**Option 1 (recommended) — purge the document caches on `activate`.**
A service-worker `activate` fires only when the worker's bytes changed, i.e.
only on a release. So the release boundary is already available as an event, with
no version bookkeeping to invent:

```ts
// alongside serwist.addEventListeners() — an additional listener, not a replacement
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all(
    ["pages", "pages-rsc", "pages-rsc-prefetch"].map((n) => caches.delete(n))
  ));
});
```

- **Satisfies clause 4 structurally.** After a release no document survives that
  could name a deleted stylesheet. A page then renders **whole**, or does not
  render at all. It never renders half.
- **Reloads nothing** — D-40-11 satisfied by construction.
- **Needs no notice component**, so UI-SPEC §8.4 stays unused and Phase 41 keeps
  the component work.
- **Leaves the door's IndexedDB queue untouched** — `src/lib/offline/` is a
  different storage API and is not a Cache Storage bucket.

**The cost, stated in the domain's own words rather than minimised.** After a
release, the first open of any page must be online. For `/door` that is the
runbook line `checkin-offline.md:57` already requires — *«apri la porta, online,
su quel telefono, quella sera, all'indirizzo a cui quel telefono sara'
mandato»*. It adds no step; it makes an existing step load-bearing in one more
situation. And it is the **same trade the owner already decided on 2026-08-11**
(`checkin-offline.md:59`): asked whether the door deserved a longer cache
window, the answer was **no** — *«una porta servita da una cache di ieri e' una
porta stantia»*, and *«il riscaldamento non e' un passo di migrazione: e' un
costo di ogni serata»*. A door served against a deleted stylesheet is the same
hazard in a different coat. **This option applies a decision already taken, in
the direction it was already taken.** The plan should say so, and should still
put it to the owner because it touches the door.

**Option 2 (recommended alongside) — turn `cacheOnNavigation` off.**
One line at `next.config.ts:7`, fully reversible, and it removes the
never-refreshing writer entirely. It is **not** the library default (`@default false`)
and, unlike its neighbour `reloadOnOnline: false`, it carries **no written
reason** — evidence it was inherited rather than decided. Side effect worth
naming: `shouldBuildSWEntryWorker = cacheOnNavigation`
(`@serwist/next/dist/index.js:210`), so `public/swe-worker-*.js` stops being
generated and leaves the precache — one fewer entry, one fewer moving part.
*What it costs:* documents reached only by client-side navigation are no longer
pre-warmed for offline. Given `/events/*` is already `NetworkOnly` and the door
is warmed by an explicit online visit, the loss is small — but it is a real
behaviour change and belongs in the plan as such, not as tidying.

**Option 3 (rejected, recorded so it is not re-proposed) — inline the `:root`
block into the document.** It looks like it satisfies clause 1 absolutely: a
document literally cannot be separated from its own tokens. It does not work.
The **utilities** still live in the external stylesheet, so an orphaned document
would have its tokens and no `.bg-ground` rule to consume them. It converts "no
colour" into "no colour and no layout". Reject it.

**Also rejected: `navigateFallback`.** Precaching a document is forbidden by
`checkin-offline.md`'s gate — *«zero HTML, zero rotte, zero payload RSC»* — and
would put a venue-bearing page at rest on a device.

### 6.6 What is already correct today, so nobody rebuilds it

| Guarantee | Already held by | Verdict |
|---|---|---|
| An old document never stitches new chunks on a navigation | Next's build-ID check, `fetch-server-response.js:142-144` | **correct, zero config** |
| A prefetch after a release never moves the page | `segment-cache/cache.js` ×4 — reject, don't navigate | **correct, zero config** |
| Every token and every utility ship in one file | `globals.css` is imported only by the root layout | **correct today**; §1's one-chunk check makes it a rule |
| No `var(--token, #hex)` fallback anywhere | `grep` returns 0 | **correct today**; gate G4 holds the line |
| No document is precached | 130 manifest entries, zero documents | **correct** |
| The old stylesheet outlives the document that names it | — | **BROKEN** — §6.4 |
| A never-refreshing document writer exists | `cacheOnNavigation: true` | **BROKEN** — §6.4 path B |

---

## 7. Verification without a test runner — the gates to turn into acceptance criteria

The repository's established form of proof is a structural script:
**seven `scripts/verify-*.mjs` exist today** `[VERIFIED: ls scripts/]`, and
`verify-media-strip.mjs:1-45` is the model — including its explicit
*"WHAT A GREEN DOES NOT MEAN"* section. Each gate below should follow that shape
and each should carry its own such section.

### Automatable gates

| # | Asserts | Command shape | Requirement |
|---|---|---|---|
| **G1** | Every token a utility reads is declared, and no token was renamed out from under a consumer. Extract `--*` names from the token file; extract `(bg\|text\|border\|ring\|from\|to\|via\|fill\|stroke\|shadow\|outline\|decoration)-<name>` from `src`; **fail on any consumer with no declaration** | `node scripts/verify-tokens.mjs` | DS-01, DS-10 clause 3 |
| **G2** | Both directions of DS-02: no `--sem-*` token where a format is identified; no brand/format token used to express a state | `node scripts/verify-semantic-separation.mjs` | DS-02 |
| **G3** | The four-stop `94deg` gradient string appears **exactly once** in the repo (its declaration), and the count of files applying it is **zero**; the check excludes its own declaration site | `node scripts/verify-sunset-gradient.mjs` | DS-03 |
| **G4** | No `var(--token, #hex)` fallback anywhere in `src` — 0 today | `grep -rnE "var\(--[a-z0-9-]+, *#" src` → empty | DS-10 clause 2 |
| **G5** | Exactly one CSS chunk is emitted, and exactly one file in it declares `:root{` | `ls .next/static/css` → 1 file; `grep -c ":root{" .next/static/css/*.css` → 1 | DS-10 clause 1 |
| **G6** | `public/manifest.json` reads `re:sonate` in `name` and `short_name`, and `#0A0712` in both colours; `layout.tsx:46` likewise | `grep` | DS-06 |
| **G7** | The `ɘ` appears nowhere outside a comment and outside `public/images/` | `grep -rn "ɘ" src public *.json *.ts` → 1 hit, `layout.tsx:16` | DS-06 |
| **G8** | The build is green | `npm run build` → exit 0 | all |

> **G1 is the one that must not be skipped.** §5 P1 proves the build is blind to
> exactly the failure DS-01 is about. Without G1 this phase's central guarantee
> has **no enforcement at all** — not a weak one, none.

**What a green on G1–G7 does NOT mean**, in the model's own idiom, and this
belongs in each script's header:

- A `grep` reads **declarations, not intent**. It cannot see a semantic
  expressed as a raw hex, nor a format colour reached through a variable renamed
  on the way. Those stay human.
- G5 proves one chunk was **emitted**, not that a device **received** it.
- G6 proves the **file**. It proves nothing about the label on any home screen —
  §4.2.
- None of them says a colour is **right**. Contrast is arithmetic (`40-UI-SPEC.md` §4),
  and legibility at a dark door is an observation.

### Not automatable — belongs in the end-of-v1.5 human batch

`STATE.md` records the end-of-v1.5 sitting already absorbing the phase 38 and 39
procedures. These join it rather than inventing a second sitting.

| # | Claim | Procedure | Note |
|---|---|---|---|
| **H1** | The installed app name reads `re:sonate` | **Fresh** install on a device; read the label under the icon | **One attempt per device** — §4.2. An existing install keeps the old label |
| **H2** | The splash screen no longer flashes the old black | Launch the installed app from the home screen and watch the first frame | `background_color` is in Android's update list; on iOS it needs the reinstall from H1 |
| **H3** | **The version boundary at the door** | Warm `/door` online on the device. Ship a release. Return within 24 h with the radio off. Open `/door`. | **It renders fully styled, or it does not render at all. It never renders unstyled, never renders half, and never reloads itself.** Follows `39-DOOR-PASS.md`'s shape |
| **H4** *(optional)* | Inter resolves `tnum` | DevTools: a figure column in the interface face, `font-feature-settings` inspected | Moot for DS-05 — §3.3. Skip unless free |

**H3 is the only proof DS-10 will ever have**, and it must be written as a
procedure before the release it tests, not reconstructed after.

---

## 8. Runtime State Inventory

This phase renames tokens and changes a name the OS has already stored, so the
rename checklist applies. Each category answered explicitly.

| Category | Found | Action |
|---|---|---|
| **Stored data** | **None.** No token name, colour or typeface name is persisted. The one colour in the database is a **format identification hex** on a `formats` row (`formats_color_hex_check` wants `#RRGGBB`), and D-36-12 / UI-SPEC §3.3 keep it deliberately **out** of the CSS token set — so retargeting a CSS token cannot touch it, by design. `[VERIFIED: only ColorSwatchPicker.tsx carries a brand hex in src]` | none |
| **Live service config** | **None.** No dashboard, workflow or external tool holds a token name. | none |
| **OS-registered state** | **Two, and both are why this phase exists.** (a) The **installed PWA's label**, stored by the OS at install from `manifest.json` `name`/`short_name` — §4.2: it does not reliably update, and on iOS it does not update at all. (b) The **splash/chrome colour** from `background_color`/`theme_color`. Neither is reachable by any code change on an already-installed device. | H1, H2 — a fresh install, once, per device |
| **Secrets / env vars** | **One, and it is out of scope.** `RESEND_FROM_EMAIL` is set on Vercel and four files default to `"Resonate <…>"` (`lib/email.ts:28`, `cron/event-reminders/route.ts:19`, `newsletter/actions.ts:162`, `venue-reveal/reveal-party-venue.ts:575`). **A code change does not fix it** — the variable must be edited. Unowned in v1.5; §4.3 records it so DS-06 is not ticked over it. | flag, do not fix here |
| **Build artefacts** | **Three, all regenerated by `npm run build` and all correctly gitignored.** `public/sw.js` (52 064 B, `.gitignore:40` — verified with `git check-ignore`), `public/swe-worker-*.js`, and `.next/`. **Devices, however, hold the previous generation of all of them** — that is §6.4, and it is the only "artefact" in this phase that a rebuild does not fix. | §6.5's mechanism |

---

## 9. Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node + npm | build | ✓ | — | — |
| `tailwindcss` | the token layer | ✓ | **4.2.1** | — |
| `@tailwindcss/postcss` | build pipeline | ✓ | **4.2.1** | — |
| `next` | everything | ✓ | **16.1.6** | — |
| `serwist` / `@serwist/next` | DS-10 | ✓ | **9.5.6** / **9.5.6** | — |
| `next/font/google` (Orbitron, Inter) | DS-05 | ✓ | fonts already self-hosted — 8 woff2 in the precache | — |
| A test runner | — | ✗ | — | **none, by project fact.** `npm run build` + `verify-*.mjs` + written manual procedure |
| Error tracking | observing a silent token loss | ✗ | — | **none.** This is why §7 G1 exists |
| A physical device for H1–H3 | DS-06 criterion 4, DS-10 criterion 5 | owner's | — | **no fallback — these cannot be automated** |

**Blocking, with no fallback:** nothing for *building*. For *proving*, H1 and H3
have no substitute; a build cannot stand in for either.

**No new dependency is required by this phase.**

---

## 10. Package Legitimacy Audit

**This phase installs no external package.** Every capability it needs —
Tailwind's `@theme`, `next/font`, Serwist's precache lifecycle — is already a
declared dependency at a version verified above from `node_modules`.

| Package | Registry | Disposition |
|---|---|---|
| *(none)* | — | **No install step.** Slopcheck not run because there is nothing to check |

Recorded as evidence, not as intent: `package.json` declares 21 runtime
dependencies, **none of them a UI kit** `[VERIFIED]`; `components.json` is absent
and initialising shadcn is refused by D-40-01 (`40-UI-SPEC.md` §Design System).
**A plan that adds a dependency to this phase has left its scope.**

---

## 11. Validation Architecture

`.planning/config.json` does not set `workflow.nyquist_validation`, so it is
treated as enabled.

### Test framework

| Property | Value |
|---|---|
| Framework | **none** — no `test` script, no `*.test.*` / `*.spec.*` outside `node_modules` `[VERIFIED]` |
| Config file | none — and **none is to be added.** A phase that installs a test runner has taken on a project-wide decision that is not its own |
| Quick run command | `npm run build` (exit 0 today) |
| Structural gate commands | `node scripts/verify-<name>.mjs` — the repository's established form, seven precedents |
| Full suite command | `npm run build` **and** every `verify-*.mjs` this phase adds |

### Requirements → verification map

| Req | Behaviour | Type | Automated command | Exists? |
|---|---|---|---|---|
| DS-01 | Every colour/surface/line utility resolves to a declared token | structural | `node scripts/verify-tokens.mjs` (G1) | ❌ Wave 0 |
| DS-02 | Semantic and brand/format colours never cross | structural | `node scripts/verify-semantic-separation.mjs` (G2) | ❌ Wave 0 |
| DS-03 | The four-stop gradient is declared once and applied zero times | structural | `node scripts/verify-sunset-gradient.mjs` (G3) | ❌ Wave 0 |
| DS-05 | Three roles, one face each; the display face no longer sets `body` | structural + build | `grep` for `--font-display\|--font-sans\|--font-mono` in the token file; `grep` that `menu/page.tsx` no longer imports a font; `npm run build` | ❌ Wave 0 |
| DS-06 | The brand's spelling where a machine reads it | structural | G6, G7 | ❌ Wave 0 |
| DS-06 | The brand's spelling where a **person** reads it on a home screen | **manual only** | — | **H1** |
| DS-10 | One stylesheet holds every token | structural | G5 (`ls` + `grep`) | ❌ Wave 0 |
| DS-10 | No `var(--token,#hex)` fallback | structural | G4 (`grep`, 0 today) | ❌ Wave 0 |
| DS-10 | A release lands whole on a device | **manual only** | — | **H3** |

### Sampling rate

- **Per task commit:** `npm run build` — the only automatic gate, and §5 P1
  bounds what it means.
- **Per wave merge:** `npm run build` + every `verify-*.mjs` added so far. G1
  must run from the wave that first renames a token, not at the end — a rename
  is silent, so late detection means an unknown number of commits carrying it.
- **Phase gate:** all of G1–G8 green, plus H1–H3 **scheduled** into the
  end-of-v1.5 batch with their procedures written. *Scheduled is not verified* —
  `STATE.md`'s own working rule.

### Wave 0 gaps

- [ ] `scripts/verify-tokens.mjs` — G1, covers DS-01 and DS-10 clause 3. **The
      highest-value item in the phase**, because it is the only thing standing
      between a token rename and a silent colour loss.
- [ ] `scripts/verify-semantic-separation.mjs` — G2, covers DS-02.
- [ ] `scripts/verify-sunset-gradient.mjs` — G3, covers DS-03.
- [ ] `package.json` — `verify:tokens`, `verify:semantic-separation`,
      `verify:sunset-gradient` scripts, matching the seven existing entries' form.
- [ ] The written H1/H2/H3 procedures, in `39-DOOR-PASS.md`'s shape, filed into
      the end-of-v1.5 batch.
- Framework install: **none.** Deliberate.

---

## 12. Security Domain

`security_enforcement` is not disabled in `.planning/config.json`, so this
section is included. This phase changes stylesheets, a manifest and a
service-worker lifecycle; it adds no route, no query and no input.

### Applicable ASVS categories

| Category | Applies | Control |
|---|---|---|
| V2 Authentication | **no** | no auth path is touched |
| V3 Session Management | **no** | no session handling is touched |
| V4 Access Control | **no** | no capability, RLS policy or middleware branch is touched. Worth stating because §6.5 deletes **cache buckets**, which is not an authorisation change |
| V5 Input Validation | **no** | this phase accepts no input. The one colour input in the product, `ColorSwatchPicker`, offers flat swatches with no free hex field and no picker — *a constraint that cannot be expressed cannot be violated* (`ColorSwatchPicker.tsx:9-27`), and Phase 40 does not relax it |
| V6 Cryptography | **no** | nothing cryptographic is touched |

### Threat patterns for this stack

| Pattern | STRIDE | Mitigation / disposition |
|---|---|---|
| A cache purge deletes an offline queue | **Denial of Service** | §6.5 deletes only the three Cache Storage document buckets. The door's queue is **IndexedDB** (`src/lib/offline/`) — a different storage API, unreachable by `caches.delete`. Must be asserted in the plan, not assumed |
| A stale cached page shows a venue address after it should be hidden — or before | **Information Disclosure** | Already mitigated: `sw.ts:110-113` makes every `/events/*` path `NetworkOnly`, with the conflict between `checkin-offline.md` and `venue-secrecy.md` written out at `sw.ts:76-97` and resolved toward the more restrictive gate. **Nothing in this phase may relax it**, and §6.5's purge only *removes* copies |
| A precache miss leaves the door with no JavaScript offline | **Denial of Service, at the worst moment** | §6.3 — the concrete mechanism by which `deploymentId` would cause it. Disposition: refuse |
| A token rename silently removes a colour and nobody is told | **Repudiation / silent failure** | §5 P1 + gate G1. There is no error tracking to catch the consequence |
| Precaching a document puts a venue-bearing page at rest on a device | **Information Disclosure** | Rejected in §6.5 — `navigateFallback` is not used, and the manifest's zero-document property must be re-asserted after any SW change (the 130-entry extraction in §6.1 is the command) |

**Monotone guards:** untouched. `venue_reveal_sent`, a payment reaching
`completed`, and a series progressivo are all unreachable from a stylesheet, a
manifest or a cache bucket. This phase introduces no new one-way switch — with
the single caveat that **H1 is a one-way *observation*** (§4.2): you cannot
un-install an owner's phone to re-run it.

---

## 13. Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Detecting a release boundary in the SW | a version constant compared in `localStorage`, a `/version.json` poll | the **`activate` event** — it fires only when the worker's bytes changed | §6.5. Zero bookkeeping, and it cannot drift from the thing it describes |
| Preventing an old page from loading new chunks | a custom build-stamp check | Next's build-ID guard — **already active** | §6.2, verified in `node_modules` |
| Deriving a colour from another colour | `color-mix` chains, opacity stacks | write the literal hex twice and record the coincidence | UI-SPEC rule 3 — a `var()` across the brand/semantic boundary dissolves DS-02 |
| Making a Tailwind class from a runtime format colour | a class-name map, a safelist | an inline `style` from the `formats` row | Tailwind cannot generate a class from a runtime value, and D-36-12 already spent a migration removing the compile-time constant |
| A metric-matched font fallback | hand-written `size-adjust` | `next/font`'s generated fallback | already emitted — `ascent-override:81.50%; …; size-adjust:124.05%` `[VERIFIED]` |
| Figures aligning in a column | a fixed-width span, a monospace hack | the **mono role** + `font-variant-numeric: tabular-nums` on that role | §3.3 — a monospaced face aligns figures by construction |
| Proving a token exists | reading the diff | **gate G1** | §5 P1 — the build is blind |

**Key insight:** three of the seven rows are *"the thing you were about to build
already exists in a dependency you already have"*. The largest risk in this
phase is not building something wrong; it is building something **redundant**
next to a mechanism that is already correct — and then having two.

---

## 14. Code Examples

### The token file's shape — `:root` for the values, `@theme inline` for the utilities

```css
/* src/app/globals.css — the one file a person edits */
@import "tailwindcss";

:root {
  /* grounds and inks — 36-VISUAL-SOURCE.md:43-55 */
  --ground: #0A0712;  --surface: #140D20;  --raised: #1D1430;  --sunk: #0D0917;
  --ink: #F3ECFA;     --ink-2: #D6CBE8;    --muted: #A493C0;   --faint: #6E6188;
  --line-soft: rgba(234,217,255,.07);
  --line:      rgba(234,217,255,.13);
  --line-strong: rgba(234,217,255,.26);

  /* semantics — LITERAL on both sides, never var() from the brand set.
     --sem-warn intentionally repeats #FFB25E; see 40-UI-SPEC.md §3.4. */
  --sem-crit: #FF6B8E;  --sem-warn: #FFB25E;
  --sem-info: #A493C0;  --sem-done: #9B7BE0;
}

@theme inline {
  --color-ground: var(--ground);
  --color-ink: var(--ink);
  --color-sem-crit: var(--sem-crit);
  /* … */
  --font-display: var(--font-orbitron), system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-sans:    var(--font-inter), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono:    ui-monospace, "SF Mono", SFMono-Regular, "JetBrains Mono",
                  "IBM Plex Mono", Menlo, Consolas, "Liberation Mono", monospace;
}
```

*Source: `tailwindcss.com/docs/theme` for the directive; `36-VISUAL-SOURCE.md`
for every value. Output shape verified by running `@tailwindcss/postcss` 4.2.1
on this repository's `globals.css` — utilities emit `var(--ground)`, the raw
`:root` property.*

### The font wiring — note `variable`, which Inter does not have today

```tsx
// src/app/layout.tsx
import { Orbitron, Inter } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const inter    = Inter   ({ subsets: ["latin"], variable: "--font-inter"    });
//                                              ^^^^^^^^ absent from today's
//                                              menu/page.tsx call — it returns
//                                              a className, not a variable.

<html lang="en" className={`${orbitron.variable} ${inter.variable}`}>
```

and in `globals.css`, D-40-09's inversion — one line, whole-product blast radius:

```css
body {
  background: var(--ground);
  color: var(--ink);
  /* was: var(--font-orbitron) — the display face doing prose duty */
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

### The release boundary — an additional listener, not a replacement

```ts
// src/app/sw.ts, after serwist.addEventListeners()
//
// WHAT THIS DOES: on a release — and only on a release, because `activate`
// fires only when the worker's bytes changed — drop every cached DOCUMENT, so
// no document can outlive the stylesheet it names. handleActivate has just
// deleted the previous CSS from the precache (serwist/dist/index.js:1228-1245);
// a document kept past that point would render unstyled offline.
//
// WHAT THIS DOES NOT DO: it does not touch the door's queue. That lives in
// IndexedDB (src/lib/offline/), not Cache Storage, and `caches.delete` cannot
// reach it. It does not reload anything (D-40-11). It does not shorten the
// 24 h window — it removes documents from the previous generation only.
//
// THE COST, ACCEPTED: after a release the first open of any page must be
// online. For /door that is the runbook line checkin-offline.md:57 already
// requires, now load-bearing in one more situation.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all(["pages", "pages-rsc", "pages-rsc-prefetch"].map((n) => caches.delete(n)))
  );
});
```

*Cache names read from `node_modules/@serwist/next/dist/index.worker.js`
(`PAGES_CACHE_NAME`) and `sw-entry-worker.js:16`.*

---

## 15. State of the Art

| Old approach | Current approach | When changed | Impact here |
|---|---|---|---|
| `tailwind.config.js` with a JS theme object | **CSS-first `@theme` in the stylesheet** | Tailwind v4 | Already adopted (`globals.css:13`). No config file exists and none should be added |
| `theme.extend.colors` | `@theme { --color-*: … }`, and `--color-*: initial` to replace the namespace | Tailwind v4 | The `initial` form is Phase **41**'s closing lever, not this phase's — §2.3 |
| `<link>` a Google Fonts stylesheet | `next/font` self-hosts and generates a metric-matched fallback | Next 13+ | Already adopted, both call sites |
| Workbox | **Serwist** | fork, 2023 | Already adopted at 9.5.6. `@serwist/next`'s `defaultCache` still carries Workbox's structure, which is why the three `pages*` buckets exist |
| A hand-rolled version check for skew | Next's build-ID comparison in every RSC response | Next App Router | **Already active, free** — §6.2 |

**Deprecated / not to be introduced:**
- **`deploymentId`** — exists and works, but §6.3 shows it would break this
  repository's precache. Not deprecated in general; **refused here, with a
  reason.**
- **`reloadOnOnline`** — already `false` with its reason written. Not to be
  revisited.
- **Anton and Space Mono** — the *poster* faces. `36-VISUAL-SOURCE.md:147-158`
  names confusing them with the interface faces *«l'errore piu' facile di tutta
  questa lettura»*. Neither appears in this document.

---

## 16. Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| **A1** | On iOS no manifest field updates after installation; on Android `name`/`short_name` are not among the fields that trigger an update | §4.2 | If wrong, criterion 4 is **easier** than stated and H1 could be run on an existing install. Written the conservative way, so being wrong costs nothing. `[CITED: intercom.help/progressier]` — a vendor help centre, not a spec. **MEDIUM.** Worth one owner sentence, not a research task |
| **A2** | Arial is not present on Android, so `next/font`'s `local("Arial")` fallback does not resolve there | §3.2 | If wrong, the fallback tail in `--font-sans` is redundant — harmless either way |
| **A3** | Inter's Google Fonts build carries `tnum` | §3.3 | **Moot for DS-05** — the data role is mono and aligns by construction. Only affects figures in prose |
| **A4** | `caches.delete("pages")` cannot reach IndexedDB | §6.5, §12 | Two different storage APIs; treated as certain, but the plan should still **assert** it after implementing (open the app offline post-release and confirm a queued scan survives) rather than reason about it |
| **A5** | An `activate` event fires only when the worker's bytes changed | §6.5 | This is the service-worker update model. If a browser fired `activate` more often, the purge would be more aggressive than intended — never *less* safe, only more warming |

**Everything else in this document was verified against this tree or read from
`node_modules/` today.**

---

## 17. Open Questions (Q4 RESOLVED)

The three from `40-UI-SPEC.md` stand unchanged and none blocks planning. Research
adds one, and it is a **decision to put to the owner, not a gap**.

1. **The primary accent and MotionLab share `#FF5C93`.** *(UI-SPEC OQ1)* — held
   as two tokens, one value. `--accent` takes `#FF5C93` meanwhile, because that
   is the value `brand-visual-system.md` already assigns to the role.
2. **`--soy` `#8C82A6` — what is it for?** *(UI-SPEC OQ2)* — out, per D-40-06.
3. **`--sem-warn` is also `--amber` is also SunSet's colour; and the semantic set
   has no green.** *(UI-SPEC OQ3)* — Phase 42 inherits no accept colour; the
   door keeps its current green unchanged until answered.

4. **NEW — the release purge touches the door, so the owner should say yes.**
   **`[RESOLVED 2026-08-11 → D-40-13]`** Put to the owner, who delegated the call
   to the expert persona; settled in the recommended direction — the `activate`
   purge **and** `cacheOnNavigation: false`, both halves. `deploymentId`,
   `navigateFallback` and the inlined `:root` are recorded as refused. See
   `40-CONTEXT.md` D-40-13 for the accepted cost. **Do not reopen this as an open
   question.** The three below stand.
   - *What we know:* §6.4 proves the orphan is real and names its two causing
     lines. §6.5's purge closes it structurally, reloads nothing, and needs no
     component. The cost is that the first open of a page after a release must be
     online.
   - *What's unclear:* nothing technical. The question is whether the owner
     accepts one more situation in which the door's existing warm-up step is
     load-bearing.
   - *Recommendation:* **propose it as already-decided-in-principle and ask for
     confirmation.** The identical trade was put to the owner on 2026-08-11
     (`checkin-offline.md:59`) — *should the door get a longer cache window?* —
     and the answer was **no**, on the grounds that a stale door is worse than a
     cold one. A door served against a deleted stylesheet is the same hazard.
     This is CLAUDE.md's *misura due volte, taglia una*: present it, then act.

---

## 18. Sources

### Primary — HIGH confidence

- **This repository, read today (2026-08-11):** `src/app/globals.css`,
  `src/app/layout.tsx`, `src/app/sw.ts`, `next.config.ts`, `postcss.config.mjs`,
  `package.json`, `public/manifest.json`,
  `src/app/(public)/events/[slug]/menu/page.tsx`,
  `src/app/(admin)/admin/formats/ColorSwatchPicker.tsx`, `scripts/`
- **Built artefacts, read rather than assumed:** `.next/static/css/149e906c690e936f.css`
  (72 115 B), `.next/static/css/7e7d96b1e6991756.css` (2 063 B), and the full
  130-entry precache manifest extracted from `public/sw.js`
- **`node_modules/`, read directly:**
  `next/dist/client/app-build-id.js`,
  `next/dist/client/components/router-reducer/fetch-server-response.js:142-144,176-178`,
  `next/dist/client/components/segment-cache/cache.js:917,958,1055,1235`,
  `next/dist/client/app-webpack.js:12-18`,
  `next/dist/shared/lib/deployment-id.js`,
  `next/dist/server/config-shared.d.ts:886`,
  `serwist/dist/index.js:1036-1110,1173-1245,498-535`,
  `serwist/dist/chunks/waitUntil.js:417-431`,
  `serwist/dist/chunks/printInstallDetails.js:1334-1360`,
  `@serwist/next/dist/index.worker.js`, `sw-entry.js:16-39`,
  `sw-entry-worker.js:13-29`, `index.js:210`, `lib/types.d.ts`
- **Executed experiments:** `npm run build` (exit 0, hashes reproduced
  byte-identically); `@tailwindcss/postcss` 4.2.1 run directly on `globals.css`
  and on a synthetic fixture, to establish §2.1 and §5 P1
- **Tailwind CSS official docs** — `https://tailwindcss.com/docs/theme`
  (`@theme` vs `:root`, `inline`, namespace→utility table, `--color-*: initial`)
- **Project documents:** `.planning/phases/40-brand-tokens-typography/40-CONTEXT.md`,
  `40-UI-SPEC.md`, `.planning/phases/36-formats-series-numbering/36-VISUAL-SOURCE.md`,
  `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`,
  `CLAUDE.md`, `.claude/rules/{brand-visual-system,checkin-offline,nextjs-architecture,meta-gates}.md`

### Secondary — MEDIUM confidence

- **Inter's OpenType feature list** — `https://rsms.me/inter/`, which also
  advises against the Google Fonts copy. Bears on A3, which is moot for DS-05
- **PWA manifest update semantics on installed apps** —
  `https://intercom.help/progressier/en/articles/8463795-what-fields-of-a-pwa-s-manifest-can-be-updated-after-installation`.
  A vendor help centre. Bears on A1, and the conservative reading was taken

### Tertiary — LOW confidence

- **None used.** No claim here rests on a single unverified web result.
- **`.planning/codebase/` was deliberately not cited** — dated 2026-02-24, and
  CLAUDE.md guardrail 4 records that several entries are already superseded.

---

## 19. Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| Current-state inventory | **HIGH** | All six UI-SPEC figures independently reproduced; every claim carries a command or a `file:line` |
| Tailwind v4 token mechanics | **HIGH** | Official docs **plus** the compiler run on this repository's own stylesheet; the silent-failure finding is an executed experiment, not a reading |
| Typography wiring | **HIGH** | Both call sites read; the `variable`-vs-`className` asymmetry found in the source, not assumed |
| DS-10 mechanism | **HIGH** | Every step traced to a line in `node_modules/`; the precache manifest extracted and counted |
| `deploymentId` disposition | **HIGH** | Both halves of the argument read from source — Next appends `?dpl=` to CSS, Serwist's default strips only `utm_*`/`fbclid` |
| Installed-PWA manifest semantics | **MEDIUM** | Platform behaviour, vendor documentation; A1 |
| Inter's `tnum` | **MEDIUM**, and moot | A3 |
| The recommended DS-10 mechanism | **HIGH** technically; **owner's** by classification | It touches the door — Open Question 4 |

**Research date:** 2026-08-11
**Valid until:** ~2026-09-10 for the Tailwind and Next findings (both are
version-pinned in this tree, so they do not drift until an upgrade). The
**inventory figures are valid only until the next commit that touches `src/`** —
re-run §1's commands rather than quoting them.

**Repository safety:** every colour named here was public before today
(`brand-visual-system.md`, and `36-VISUAL-SOURCE.md` of 2026-08-10). No venue,
no unannounced date, no line-up, no personal name, no contact. `.planning/` is
tracked and this repository is public.
