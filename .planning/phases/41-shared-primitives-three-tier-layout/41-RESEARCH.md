# Phase 41: Shared Primitives & Three-Tier Layout — Research

**Researched:** 2026-08-11
**Tree measured:** `4be22f1` (branch `gsd/phase-32-capability-model-in-the-database`)
**Domain:** Component consolidation and responsive layout in Next.js 16 / React 19 / Tailwind CSS v4
**Confidence:** HIGH on everything measured in this tree; MEDIUM on browser-behaviour claims sourced from documentation dated 2023 or earlier; the tier boundaries themselves are deliberately **not** answered here.

> **This research runs before discuss-phase and before the UI-SPEC.** Its job is a
> photograph, not a design. Where a choice belongs to the owner or to the visual
> contract it is framed with its consequences and left open — marked
> **`OWNER`** or **`UI-SPEC`**. Every recommendation is marked
> **`RECOMMENDATION`** and none of them is a decision.

---

## Summary

The product has **no responsive layer worth the name**. `md:` appears in **zero
files**, `xl:` and `2xl:` in zero, `lg:` in three, and `sm:` in twenty-two of a
hundred and eighty-one. There is no container maximum wider than `max-w-lg`
anywhere, so on a wide screen every converted surface stretches edge to edge
today. That is not a partial implementation to finish; it is a layer that does
not exist, and Phase 41 writes it from nothing. The upside is that nothing has
to be un-decided first: **there are zero `matchMedia`, `useSyncExternalStore`
and `innerWidth` reads in the whole tree**, so no JavaScript anywhere currently
knows how wide the screen is, and the phase can choose its mechanism freely.

The repetition, by contrast, is enormous and remarkably *uniform* — which is the
good case. `rounded-2xl border border-card-border bg-card` appears as an
**exact, byte-identical string 88 times across 51 files**; `min-h-dvh pb-24`
**47 times**; `px-6 pt-12` **44 times**; the seven native `<dialog>` shells are
**byte-identical to each other**; the form input shell is 75 occurrences across
six near-variants that differ only in radius, ground and padding. A pattern
written 88 times identically is a rename, not a redesign. The two genuinely
divergent families — section headings (four axes of variation across ~20 sites)
and the pill button (six distinct `py-` values across 133 sites) — are the ones
that need a decision before they can be collapsed.

Three findings change the shape of the plan. **First**, taken literally,
criterion 1 plus transitive component sharing fuses **24 of the 41 pages into a
single indivisible unit** — a big-bang conversion, which is exactly what the
criterion exists to prevent. Converting a fourteen-file *spine* first (nav,
motion wrappers, `Icons`, `Skeleton`, toasts, `FormatMarker`) breaks that unit
into **34 units, 31 of them a single page, the largest six**. **Second**, six of
the seven tables already render cards on a phone, by duplicated markup at two
different breakpoints (`sm` in four files, `lg` in two) — DS-09's real work is
consolidation, and its only genuinely sideways-scrolling table is also the one
where cards may be the wrong answer. **Third**, `src/components/ui/Skeleton.tsx`
exists, is correct, and has **zero importers**, while 102 hand-rolled
`animate-pulse` blocks live in 20 other files. That is DS-07's thesis already
proven inside the repository.

**Primary recommendation:** plan a Wave 0 that converts the shared spine and
publishes the primitives, then convert one unit per plan against an
already-converted spine — and take the dialog primitive from the seven identical
native `<dialog>` shells that already exist rather than building an eighth
beside them.

---

## User Constraints

**No `41-CONTEXT.md` exists** — this research runs before discuss-phase. The
constraints below are therefore inherited, not gathered, and each is cited.

### Locked decisions inherited from Phase 40

| ID | Decision | Where |
|---|---|---|
| **D-40-01** | *«i colori e i layout devono essere gli stessi dell'artifact produzione»* — the product adopts the production tracker's token set and layouts, and maintains no second palette | `40-CONTEXT.md:44-49` |
| **D-40-02** | **The layout half of D-40-01 binds Phase 41, not Phase 40.** Phase 40's job was to make it possible; Phase 41 lands the artifact's layouts without redefining colour | `40-CONTEXT.md:51-55` |
| **D-40-03** | **Structure crosses, content never does.** "The same layouts" means the same *construction* — the chip row, the underline, the card — never the same *content*. `.planning/` is published | `40-CONTEXT.md:57-62` |
| **D-40-07** | **No light theme**, and it is not a gap to fill | `40-CONTEXT.md:89-93` |
| **D-40-11** | **Nothing may reload a page by itself.** A hard navigation on a tapped link is not a reload; a platform-initiated reload during a scan is | `40-CONTEXT.md:124`, `40-UI-SPEC.md:763-784` |

### Inherited from the Phase 40 UI-SPEC — the visual contract Phase 41 converts *toward*

| Rule | Where |
|---|---|
| Phase 41 takes **the four grounds, the four inks, the three line weights, the three type roles, the two weights, `--accent` and its reserved-for list, and §4.2's boundary rule** | `40-UI-SPEC.md:902` |
| Phase 41 must expect **no spacing token, no component and no breakpoint** from Phase 40 — *"Layouts are D-40-02's, i.e. 41's"* | `40-UI-SPEC.md:902` |
| **A control's boundary is never `--line*` alone.** No ground/line pairing reaches WCAG 1.4.11's 3:1; the strongest tops out at 2.05. Boundaries are `--muted` `#A493C0` or lighter | `40-UI-SPEC.md:381-386`, restated `globals.css:44-57` |
| **The focus ring is `--ink`**, never the accent. Recorded as a conflict inside the UI-SPEC that was resolved in Phase 41's favour: *"Phase 41 inherits that, not the §3.5 wording"* | `globals.css:92-98`, `40-UI-SPEC.md:388-391` |
| **Four sizes, two weights: 400 and 600. Nothing else.** With the bill quoted: `font-medium` (500) in 95 files / 397 places | `40-UI-SPEC.md:544-565` |
| **Touch targets ≥ 44 × 44px wherever the input is a finger.** *"Unchanged; this phase adds no target"* | `40-UI-SPEC.md:884-885` |
| **Body stays 14px minimum.** `text-[10px]` at the scanner is Phase 42's | `40-UI-SPEC.md:889-890` |
| **`--faint` is not a small-text colour** (3.12–3.54:1). Admissible only ≥ 24px or as a non-informational graphic | `40-UI-SPEC.md:868-869`, `globals.css:26-32` |
| **A semantic used as a fill carries `--ground` as its ink**, never white | `40-UI-SPEC.md:875-876` |
| **`text-transform: none` on the wordmark and on every format name, declared on the element itself** — `text-transform` inherits, and `src` has `uppercase` in 43 files | `40-UI-SPEC.md:567-580` |
| **Colour is never the only channel** | `40-UI-SPEC.md:877-880` |
| **Anton and Space Mono are poster faces and may not appear** in any phase inheriting this contract | `40-UI-SPEC.md:907-913` |

### Claude's discretion

Nothing is delegated yet — there is no CONTEXT.md. Everything below marked
`OWNER` or `UI-SPEC` is open.

### Deferred / out of scope

- **Phase 42 owns the scanner and the door's behaviour.** `src/app/(admin)/**/scanner/**`, `src/components/scanner/**`, `src/app/(admin)/door/**`. Findings there are reported as inherited context only (ROADMAP:628-640).
- **Phases 44/45 own the production sections.** Phase 44 depends on 41 *"so the surface lands in the finished visual system rather than being converted afterwards"* (ROADMAP:692) — i.e. 41 must leave a primitive set 44 can build on, and must not build the calendar.
- **`src/emails/**` is unowned by any v1.5 phase** and carries a second, hand-maintained palette (`DI-40-01`). A CSS token cannot reach a mail client; this is a second source, not a conversion. **Out of scope, and it should stay out.**
- **`.planning/` is published and the repository is public.** No venue under negotiation, no unannounced date, no line-up, no personal name appears here. Roles, never people.

---

## Project Constraints (from CLAUDE.md)

Directives extracted from `CLAUDE.md` and `.claude/rules/` that constrain this phase.

| Directive | Consequence for Phase 41 |
|---|---|
| **No test runner exists for the product.** No `test` script, no `*.test.*`, no `*.spec.*` — verified again today against `package.json` | No plan may claim a conversion is verified because tests pass. Verification is `npm run build` + the structural gates + a written manual procedure |
| **`npm run build` is also the typecheck** — there is no separate `typecheck` script | The typecheck gate for 41 is the build, and it is currently green (measured today, exit 0) |
| **`npm run verify:persona` covers the persona, not the product** | Irrelevant to 41 unless 41 edits `.claude/**` |
| **The repository is PUBLIC and every commit is a publication** | Screenshots, fixtures and planning prose must carry no production material |
| **Zero silent failures; there is no error tracking** (`meta-gates.md`) | A gate whose green measures nothing is a silent failure with an alibi. See § Common Pitfalls |
| **macOS/BSD shell**: `grep -E`, `sed -i ''`; no `grep -P` | All commands in this document were run on BSD tools |
| **The middleware is UX, the RLS is the boundary** | A layout change that hides a control **hides** it; it does not protect it. `StaffNav`'s own docblock already says so (`StaffNav.tsx:11-23`) |
| **Precision of vocabulary** — `member` ≠ `approved`, a *format* is not an *event* | Component and prop names must not collapse the two axes |
| **`brand-visual-system.md`**: `re:sonate` with a normal e; formats are `SunSet`, `RamaDub`, `MotionLab` in CamelCase, never all caps | Three surfaces currently render `Resonate` in `uppercase tracking-widest` — see § What Phase 40 Left |
| **`meta-gates.md` monotone guards** — venue reveal, payment completion, series numbering | None is touched by a layout change, but the surfaces that render them are: `(public)/events/[slug]/**` sits in the largest conversion unit and is `venue-secrecy` primary |
| **VERIFICATION.md gate**: every phase produces one, with `file:line` evidence per requirement | Plan for it from the start; 17 of 30 phases have one, so the practice exists but is not universal |

---

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|---|---|---|---|
| Sheet-vs-window dialog form | **Browser / CSS** | — | The viewport is a client fact the server cannot know. A CSS media query is evaluated by the browser at paint, so the server HTML is correct at every width. See § Dialogs |
| Escape-to-close, focus trap, background inert | **Browser / platform** | — | `showModal()` supplies all three by specification. Seven files already rely on it |
| Table-vs-cards form | **Browser / CSS**, over **one server-rendered data array** | Server component | The data is fetched once on the server; both output forms are rendered from it and one is hidden with `display: none` |
| Touch-target sizing | **Browser / CSS** (`any-pointer: coarse`) | — | Input capability is a device fact, not a width fact. Keying it off viewport width fails criterion 5's explicit clause |
| Container maximum width | **Browser / CSS** | — | Pure layout |
| Which navigation entries exist | **Server** (already) | — | `getAccessContext()` resolves capabilities in `(work)/layout.tsx:81-83` and passes serialisable keys down. **This is correct today and Phase 41 must not move it** — `StaffNav.tsx:25-33` says a capability check moved to the browser is a check the viewer can edit |
| Which navigation entries are *visible at a width* | **Browser / CSS** | — | A width-driven change to an entitlement-driven list must be styling only, or the two axes fuse |
| Loading skeletons | **Server** (`loading.tsx` boundary) | Browser | Already server-rendered via the App Router; only the markup is duplicated |

**The one line worth writing down:** entitlement decides *whether* an entry
exists and the server owns that; width decides *how* it is laid out and CSS owns
that. Phase 41 touches only the second. Any plan that filters a nav list by
width in JavaScript has crossed the line `StaffNav`'s docblock draws.

---

## Phase Requirements

| ID | Description (verbatim, `REQUIREMENTS.md:125-135`) | Research support |
|---|---|---|
| **DS-07** | *A recurring pattern is a shared component, and a page adopts it when that page is converted — never by global replacement* | § Which Patterns Recur (measured inventory, ranked); § Convertible Units (what "a page is converted" can mean without a big bang); § Prior Art (`Skeleton` proves the failure mode: a primitive with zero importers) |
| **DS-08** | *A dialog behaves as a sheet on a phone and a window on larger screens, from one implementation* | § Dialogs — 18 sites in two families; 7 byte-identical native `<dialog>` shells; 4 files already implement the sheet form in CSS; the CSS-vs-JS question answered with React 19 sourcing |
| **DS-09** | *A dense table becomes cards on a phone rather than scrolling sideways* | § Tables — all 7 enumerated; 6 already dual-render at two inconsistent breakpoints; the a11y mechanism question answered against this project's primary browser |
| **RESP-01** | *Every surface is usable on phone, tablet and desktop, with the layout chosen for the device the surface is actually worked on* | § Responsive — the measured absence; § Surface Inventory (which surfaces are worked on which device) |
| **RESP-02** | *Content stops widening on large screens instead of stretching* | § Responsive — no container above `max-w-lg` exists; the `max-w-*` inventory in full |
| **RESP-03** | *Touch targets stay large wherever the input is a finger, including large touch screens* | § Touch Targets — `any-pointer: coarse` verified present in the installed Tailwind 4.2.1 bundle; 118 of 174 measurable targets estimated under 44px, worst offenders named |
| **RESP-04** | *Work surfaces show filters and navigation without hiding them behind a menu from tablet size up* | § Responsive — **there is no menu**; the actual failure is a horizontal scroll strip at every width. The criterion's literal test passes on code that fails its intent |

---

## Surface Inventory, and what "one whole surface" can mean

### The route tree

**41 `page.tsx`, 2 `layout.tsx`, 14 `loading.tsx`, 181 `.tsx` under `src/`** —
all reproduced independently and matching the orchestrator's figures.

| Route group | Pages | Notes |
|---|---|---|
| `(admin)` | 26 | 24 under `admin/(work)/`, plus `admin/scanner` and `door` |
| `(public)` | 9 | |
| `(members)` | 3 | |
| `(auth)` | 3 | |
| root | 1 | `src/app/page.tsx` |

**One structural fact that defeats the obvious definition of "a surface".** A
work surface's files live in **two directories that are not nested in one
another**. The page is at `src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx`;
its client component is at `src/app/(admin)/admin/events/[id]/tickets/RefundActions.tsx`
— without the `(work)` group. Verified: `src/app/(admin)/admin/` contains both
`(work)/` and a parallel set of directories (`artists`, `events`, `finance`,
`formats`, `members`, `newsletter`, `scanner`, `venues`) holding the actions and
client components. The split is deliberate and documented at
`(work)/layout.tsx:15-25` — a layout at `admin/layout.tsx` would have wrapped the
door in a second bottom nav.

Two of those parallel directories, `admin/eventi/` and `admin/membri/`, are
**empty** — leftovers from the Italian route names Phase 34 collapsed.

> **Consequence for the planner:** a surface cannot be scoped by a path prefix.
> `git diff --name-only` acceptance criteria that name one directory will miss
> half of a surface's files. Scope by the import closure, not by the path.

### Convertible units — the measurement that decides the phase's shape

Criterion 1 forbids leaving a surface half-converted. Read together with
transitive component sharing, that produces a knot:

**Taken literally, 24 of the 41 pages form ONE unit** — 104 `.tsx` files, 55 of
them carrying raw Tailwind palette colours. It spans all four route groups and
it includes `admin/scanner/page.tsx` and `door/page.tsx`, which are Phase 42's
and must not be touched. Converting it whole is a big bang; converting it in
pieces violates criterion 1. **That is the knot, and it is real.**

The glue is mostly thin and mostly already clean:

| Glue file | Pages reached | Raw colours? | Legacy tokens? |
|---|---|---|---|
| `components/layout/MobileNav.tsx` | 13 | no | **yes** |
| `components/motion/AnimatedSection.tsx` | 12 | no | no |
| `components/motion/StaggeredList.tsx` | 5 | no | no |
| `components/motion/PressableCard.tsx` | 4 | no | no |
| `components/motion/CountUp.tsx` | 4 | no | no |
| `components/formats/FormatMarker.tsx` | 3 | no | **yes** |
| `components/ui/Icons.tsx` | 2 | no | no |

**Re-measured with a fourteen-file spine declared converted first** — the seven
above plus `StaffNav`, `PressableButton`, `MotionProvider`, `Skeleton` and the
three toast files — **and with Phase 42's three files excluded, the tree breaks
into 34 units: 31 single pages, and three multi-page knots.**

| Unit | Pages | `.tsx` | raw-colour | Glue |
|---|---|---|---|---|
| **The drinks/token knot** | **6** | 38 | 24 | `DrinkTokenCard`, `RedeemConfirmationModal`, `SumUpCheckoutModal`, `DrinkMenuManager`, `EventQRCode`, `SumUpCardWidget`, `MediaGrid`, `Lightbox`, `CopyReferralLink` |
| **The event-form knot** | 2 | 10 | 9 | `EventForm` (1 668 lines), `AutocompleteTagInput`, `AutocompleteInput`, `CreateArtistModal`, `CreateVenueModal`, `VenueProfilePrompt` |
| **The ticketing knot** | 2 | 8 | 8 | `RefundActions` |
| 31 further units | 1 each | 1–9 | 0–4 | — |

The drinks/token knot is the phase's hardest object and it is hard for reasons
beyond size: it spans `(public)`, `(members)` and `(admin)`; it crosses the
**money** domain (`SumUpCheckoutModal`, `SumUpCardWidget`) and the **venue
secrecy** domain (`(public)/events/[slug]/page.tsx`); and two of its glue files
are among the four that already implement the sheet form.

> **`RECOMMENDATION`** — define a *surface* as **a route segment plus the files
> only it reaches**, and convert the spine once, first, as its own unit. The
> spine is small (14 files), five of its members already carry no colour at all,
> and converting it first is what makes criterion 1 satisfiable at all. Whether
> a spine-first wave is *itself* a violation of *"never by global replacement"*
> is a genuine question for **`OWNER`** — the honest framing is that the spine is
> not a global replacement of a pattern, it is the conversion of one small
> surface that every other surface happens to sit on.

### Per-page inventory

Read as: `[R]` = the page file itself carries raw palette colours, `[L]` = it
reads a legacy token name; `tree` = `.tsx` files reachable from it (excluding
`src/emails/`); `raw`/`legacy` = how many of those are dirty.

| Page | | tree | raw | legacy |
|---|---|---|---|---|
| `(admin)/admin/(work)/analytics/compare/page.tsx` | RL | 3 | 0 | 2 |
| `(admin)/admin/(work)/analytics/members/page.tsx` | ·L | 6 | 0 | 4 |
| `(admin)/admin/(work)/analytics/page.tsx` | ·L | 4 | 0 | 2 |
| `(admin)/admin/(work)/artists/page.tsx` | ·L | 0 | 0 | 0 |
| `(admin)/admin/(work)/events/[id]/analytics/page.tsx` | ·L | 10 | 4 | 5 |
| `(admin)/admin/(work)/events/[id]/assignments/page.tsx` | RL | 1 | 1 | 1 |
| `(admin)/admin/(work)/events/[id]/drinks/page.tsx` | ·L | 2 | 2 | 2 |
| `(admin)/admin/(work)/events/[id]/edit/page.tsx` | RL | 10 | 7 | 8 |
| `(admin)/admin/(work)/events/[id]/guest-list/page.tsx` | ·L | 7 | 3 | 3 |
| `(admin)/admin/(work)/events/[id]/media/page.tsx` | RL | 1 | 1 | 1 |
| `(admin)/admin/(work)/events/[id]/review/page.tsx` | ·L | 1 | 1 | 1 |
| `(admin)/admin/(work)/events/[id]/sales/page.tsx` | RL | 5 | 2 | 2 |
| `(admin)/admin/(work)/events/[id]/tickets/page.tsx` | RL | 9 | 5 | 5 |
| `(admin)/admin/(work)/events/new/page.tsx` | RL | 6 | 5 | 6 |
| `(admin)/admin/(work)/events/page.tsx` | R· | 3 | 1 | 1 |
| `(admin)/admin/(work)/finance/page.tsx` | ·· | 2 | 2 | 2 |
| `(admin)/admin/(work)/formats/page.tsx` | ·L | 6 | 4 | 6 |
| `(admin)/admin/(work)/members/growth/page.tsx` | RL | 4 | 0 | 1 |
| `(admin)/admin/(work)/members/page.tsx` | RL | 9 | 3 | 3 |
| `(admin)/admin/(work)/members/register/page.tsx` | RL | 0 | 0 | 0 |
| `(admin)/admin/(work)/newsletter/page.tsx` | ·L | 4 | 3 | 2 |
| `(admin)/admin/(work)/page.tsx` | ·· | 0 | 0 | 0 |
| `(admin)/admin/(work)/venues/[slug]/page.tsx` | ·L | 1 | 1 | 1 |
| `(admin)/admin/(work)/venues/page.tsx` | ·L | 0 | 0 | 0 |
| `(admin)/admin/scanner/page.tsx` **— Phase 42** | ·· | 4 | 2 | 2 |
| `(admin)/door/page.tsx` **— Phase 42** | ·· | 4 | 2 | 2 |
| `(auth)/login/page.tsx` | RL | 0 | 0 | 0 |
| `(auth)/register/page.tsx` | RL | 0 | 0 | 0 |
| `(auth)/set-password/page.tsx` | ·· | 1 | 1 | 1 |
| `(members)/attendance/page.tsx` | ·L | 1 | 0 | 1 |
| `(members)/dashboard/page.tsx` | RL | 15 | 7 | 10 |
| `(members)/membership-card/page.tsx` | ·L | 3 | 1 | 3 |
| `(public)/artists/[slug]/page.tsx` | ·L | 2 | 1 | 2 |
| `(public)/events/[slug]/menu/page.tsx` | ·L | 14 | 9 | 10 |
| `(public)/events/[slug]/page.tsx` | RL | 23 | 11 | 10 |
| `(public)/events/page.tsx` | ·· | 7 | 1 | 4 |
| `(public)/gallery/page.tsx` | ·· | 6 | 2 | 3 |
| `(public)/newsletter/page.tsx` | ·· | 2 | 1 | 2 |
| `(public)/payment/callback/page.tsx` | RL | 0 | 0 | 0 |
| `(public)/tickets/[id]/page.tsx` | RL | 1 | 0 | 1 |
| `page.tsx` (home) | RL | 1 | 0 | 1 |

**The four cleanest starting points** — a page with a tree of 0 or 1 and only
itself dirty: `(auth)/login`, `(auth)/register`, `(admin)/(work)/members/register`,
`(public)/payment/callback`. Each is one file. **The three already-clean pages**
— `(admin)/(work)/page.tsx`, `(admin)/(work)/venues/page.tsx`,
`(admin)/(work)/artists/page.tsx` (the last reads a legacy token but carries no
raw colour). **`RECOMMENDATION`:** the first plan converts one of the four
single-file pages, because it is the plan in which the primitives are *designed
against something real* at the smallest possible blast radius.

### Where the constraint bites, plainly

1. **The spine forces a Wave 0 or nothing converts.** `MobileNav` is mounted at 13 sites across four route groups and reads a legacy token. Any page that converts before it either leaves `MobileNav` unconverted on a converted page — half-converted — or converts it and thereby changes 12 other pages that have not been converted. There is no third option, so the spine goes first.
2. **Phase 42's files are inside the largest unit.** `ScannerClient`, `DoorSurface` and `ScanFlash` sit on the transitive path between `admin/scanner/page.tsx`, `door/page.tsx` and `MobileNav`. Once the spine is declared converted and those three declared opaque, both door pages fall out as **1-page / 1-file units** — clean. Before that, they are entangled. **The order matters and it is not arbitrary.**
3. **Two "surfaces" are actually one.** `events/new` and `events/[id]/edit` are 92% the same page (`EventForm`, 1 668 lines, mounted by both). Converting either alone converts both. So does `events/[id]/sales` and `events/[id]/tickets` via `RefundActions`.
4. **The drinks/token knot spans money and venue secrecy.** Converting `(public)/events/[slug]/page.tsx` drags in `SumUpCheckoutModal` and `RedeemConfirmationModal`, and the same page is the surface `venue-secrecy.md` governs. This unit needs its own impact analysis, not a generic conversion plan.

---

## Which Patterns Actually Recur — measured, not guessed

Ranked by occurrences × divergence. **"Identical" means the exact class string
repeats; "divergent" means the same intent is written several ways.** The
distinction matters: an identical repetition is a mechanical substitution, a
divergent one needs a decision first.

| Rank | Pattern | Sites | Files | Divergence | Character |
|---|---|---|---|---|---|
| 1 | **Card shell** — `rounded-2xl border border-card-border bg-card` | **88 exact** + 85 `rounded-xl` + 12 `rounded-lg` + 17 `rounded-full` = **202 total** | 51 for the exact string | **Low** — one axis, the radius | Mechanical, once the radius is decided |
| 2 | **Page shell** — `min-h-dvh pb-24` | **47 exact**; `px-6 pt-12` **44 exact**; 148 `px-6` gutters | ~49 | **Very low** | Mechanical. The 96px `pb-24` is manual clearance for the fixed bottom nav — see the trap below |
| 3 | **Form input shell** | **75** across 6 variants | — | **Medium** — radius (`xl`/`lg`), ground (`bg-background`/`bg-card`), padding (`px-4 py-3` / `px-3 py-2` / `px-4 py-2.5`) | Needs one decision, then mechanical. **All 75 currently violate §4.2** — see below |
| 4 | **Pill button** — `rounded-full` + `px-*` + `py-*` | **133** | — | **High** — six `py-` values: `0.5`(36) `3`(33) `2`(33) `1.5`(31) `2.5`(24) `1`(15) | Needs a decision. This is also the touch-target problem: `py-1.5 text-xs` computes to 28px |
| 5 | **Loading skeleton** | **102** `animate-pulse` in **20 files**; 14 `loading.tsx` totalling 734 lines | 20 | **High** | **`src/components/ui/Skeleton.tsx` already exists and has ZERO importers.** `TransactionList.tsx:83` even defines its own local `LoadingSkeleton` |
| 6 | **Section heading** | `mb-4 text-sm font-medium uppercase tracking-wider text-muted` (9) vs `mb-3 text-sm font-semibold uppercase tracking-widest text-muted` (9) + 4 more variants | ~14 | **High** — four axes vary: `mb-3`/`mb-4`, `medium`/`semibold`, `wider`/`widest` | Needs a decision |
| 7 | **Page title** — `<h1>` | **52** `<h1>` in 38 files; `text-3xl font-bold tracking-tight` **34** across 6 prefix variants (`mt-2`, `mb-2`, `mt-4`, …) | 38 | **Medium** — the type is identical, the margin is not | **This is where the display role lands** — see § What Phase 40 Left |
| 8 | **Native dialog shell** | **7, byte-identical** (`Lightbox` differs only in `bg-black/90` vs `/80`) | 7 | **None** | Already one implementation, copied seven times. Two of the seven say so in their own docblocks |
| 9 | **Div-overlay modal** — `fixed inset-0 z-[60] … bg-black/60` | **11** | 11 | **Medium** — 4 carry the sheet form, 7 do not | See § Dialogs |
| 10 | **Bottom-sheet panel** — `rounded-t-2xl sm:rounded-2xl … pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))] sm:pb-6` | **4, byte-identical** | 4 | **None** | The DS-08 prior art, already correct |
| 11 | **Table + card dual render** | **6** (4 at `sm`, 2 at `lg`) | 6 | **Medium** — the breakpoint disagrees | See § Tables |
| 12 | **Empty state** | 16 literal `No …` strings; ~25 `text-center`/`text-muted` blocks | 14 | **High** | **Marginal** — the copy differs per surface, so what is shared is a wrapper, not a component. Low value |
| 13 | **Stat / KPI tile** | ~11 `text-3xl font-bold` outside an `<h1>` | ~8 | **Medium** | **Marginal** — the analytics cards (`RevenueCard`, `AttendanceCard`, `GrowthSummaryCard`, `RepeatAttendeeCard`, `TokenLifecycleCard`, `GuestConversionCard`) are 31–73 lines each and already one-per-concept. Consolidating them buys little |
| 14 | **`<label>`** | 99 elements; only 7 share an exact class string | — | **Very high** | **Marginal as a component**, real as a rule. 99 labels written 90+ ways is a styling convention problem, not a missing primitive |

### Three findings inside that table that change plans

**(a) All 75 form inputs violate the boundary rule Phase 40 wrote for them.**
Every input shell variant carries `border border-card-border`. `--card-border`
aliases `--line` (`globals.css:208`), and `40-UI-SPEC.md:371-373` computes that
`--line` reaches at most **1.39:1** over any ground — against WCAG 1.4.11's 3:1
for a control boundary. The rule is explicit: *"the boundary of an interactive
control … is never carried by `--line*` alone"* (`40-UI-SPEC.md:381-386`). So
the input primitive is not a tidying exercise; **it closes an accessibility
finding Phase 40 measured, named and handed forward.** The same applies to
secondary/ghost buttons, checkboxes and selects.

**(b) `pb-24` is a load-bearing coupling, not padding.** 47 pages hard-code 96px
of bottom padding to clear `MobileNav`, which is `fixed bottom-0` at **every**
width (`MobileNav.tsx:96`). `ToastContainer.tsx:26` hard-codes the same
assumption a second time: `bottom: calc(5rem + env(safe-area-inset-bottom) + 1rem)`.
The moment RESP-04 moves navigation off the bottom at tablet width, **49 pages
carry 96px of dead space and every toast floats above nothing** — unless the
clearance is owned by a page-shell primitive that knows where the nav is. That
is the single strongest argument for building the page shell early.

**(c) `Skeleton` is DS-07's thesis, already proven.** A correct primitive
(`SkeletonLine`, `SkeletonCard`, `SkeletonAvatar`) exists at
`src/components/ui/Skeleton.tsx` and **no file imports it**, while 102
hand-rolled `animate-pulse` blocks live elsewhere. Building a primitive is not
the hard part of DS-07; **adoption is**, and this repository has already failed
at it once. Any plan that ships a primitive without converting a surface onto it
in the same wave is repeating a mistake the tree already records.

---

## Dialogs — 18 sites, two families, one implementation already written seven times

**The orchestrator's count of 19 is right for `grep -lE 'role="dialog"|Modal'`,
but three of those matches are false positives** (`DrinkMenu.tsx`,
`PendingIntentHandler.tsx`, `TierSelection.tsx` reference a modal, they are not
one) and two dialog-bearing files do not match the pattern
(`SecretVenueDialog.tsx`, `RefundRequestButton.tsx`, `RefundDialog.tsx`,
`EditVenueButton.tsx`, `EditArtistButton.tsx`). **The real inventory is 18
dialog implementations in two families.**

### No headless library is installed, and none is needed

`package.json` has **21 runtime dependencies and not one UI kit** — no Radix, no
Headless UI, no vaul, no `components.json`. `40-UI-SPEC.md:940-946` records that
shadcn was refused by D-40-01 and that *"the vetting gate did not run because
there is nothing to vet"*. **`createPortal` is used nowhere in the tree.** That
means Phase 41 installs no packages — and therefore § Package Legitimacy Audit
below is empty by construction, not by omission.

### Family A — native `<dialog>` + `showModal()`: 7 files, byte-identical

| File | Line |
|---|---|
| `src/app/(admin)/admin/formats/CreateFormatModal.tsx` | 355 |
| `src/app/(admin)/admin/formats/CreateSeriesModal.tsx` | 287 |
| `src/app/(admin)/admin/formats/RetireFormatDialog.tsx` | 280 |
| `src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx` | 362 |
| `src/components/venues/CreateVenueModal.tsx` | 141 |
| `src/components/artists/CreateArtistModal.tsx` | 151 |
| `src/components/media/Lightbox.tsx` | 48 |

All seven carry the same shell:

```tsx
<dialog
  ref={dialogRef}
  className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none bg-black/80 backdrop:bg-transparent p-0"
  onClose={handleDialogClose}
  onClick={(e) => { if (e.target === e.currentTarget) close(); }}
>
  <div className="flex h-full w-full items-center justify-center p-4">
```

…and the same open/close effect (`CreateVenueModal.tsx:37-46` and six copies):

```tsx
useEffect(() => {
  const dialog = dialogRef.current;
  if (!dialog) return;
  if (open)  { if (!dialog.open) dialog.showModal(); }
  else       { if (dialog.open)  dialog.close(); }
}, [open]);
```

**Two of the seven admit the copy in their own docblocks** —
`RetireFormatDialog.tsx:22` (*"The `<dialog>` shell, the backdrop click and the
open/close effect are copied…"*) and `RevealVenueDialog.tsx:19`. This is not a
pattern to invent; it is a pattern to *extract*, and the repository has already
written the extraction request into its own comments.

**What Family A gets for free from the platform** *(sourced, not assumed)*:

| Behaviour | Status | Source |
|---|---|---|
| **Escape closes it** | ✅ automatic | A `<dialog>` opened with `showModal()` and no `closedby` attribute *"behaves as if the value was `closerequest`"* — and a close request is *"a platform-specific user action, such as pressing the Esc key on desktop platforms, or a 'back' or 'dismiss' gesture on mobile platforms"* — MDN `<dialog>`, `closedby` |
| **Focus is trapped** | ✅ automatic | *"Elements inside the same document as the dialog, except the dialog and its descendants, become inert"* — MDN `HTMLDialogElement.showModal()`. `RetireFormatDialog.tsx:161` already states this in a comment |
| **Initial focus** | ✅, and improvable | *"focus is set on the first nested focusable element"*; MDN recommends `autofocus` on the element the user should reach first. `RevealVenueDialog.tsx:19` already puts focus on `Cancel` |
| **Renders above everything** | ✅ automatic | The top layer, above all `z-index`. No `z-[60]` needed |
| **Background scroll lock** | ⚠️ **unverified** | MDN's `showModal()` page documents inertness and the top layer but **does not state scrolling is blocked**. Browsers differ. The seven files sidestep it by making the dialog itself `h-dvh w-dvw`, so the effect is not observable in the usual way. **Treat as a hand-check, not a fact** |
| **Light dismiss (click outside)** | ❌ hand-rolled | All seven implement it with an `e.target === e.currentTarget` check. `closedby="any"` would do it natively — but changes Escape/back semantics too, so it is a behaviour decision |

### Family B — hand-rolled `fixed inset-0 z-[60]` overlays: 11 files

| File | Line | Sheet form? |
|---|---|---|
| `(public)/events/[slug]/RedeemConfirmationModal.tsx` | 167 | **yes** |
| `(public)/events/[slug]/SumUpCheckoutModal.tsx` | 50 | **yes** |
| `(public)/events/[slug]/menu/GuestTokenDisplay.tsx` | 222 | **yes** |
| `(public)/events/[slug]/menu/GuestLoginBanner.tsx` | 71 | **yes** |
| `(public)/events/[slug]/SecretVenueDialog.tsx` | 70 | no |
| `(public)/tickets/[id]/RefundRequestButton.tsx` | 51 | no |
| `(admin)/admin/events/[id]/tickets/RefundActions.tsx` | 40 | no |
| `components/admin/RefundDialog.tsx` | 60 | no |
| `components/venues/EditVenueButton.tsx` | 155 | no |
| `components/artists/EditArtistButton.tsx` | 87 | no |
| `components/media/MyMediaSection.tsx` | 182 | no — **the only `role="dialog"` in the tree** |

**None of the eleven handles Escape.** `grep -rn 'Escape'` across `src` returns
exactly two hits (`DrinkMenuManager.tsx:296,308` — an inline edit field, and
`AutocompleteTagInput.tsx:88` — a suggestion list). **None traps focus. None
locks background scroll** — `grep` for a body scroll lock returns nothing
anywhere in the tree. So criterion 2's *"closes with Escape"* is **satisfied
today by 7 of 18 dialogs and by none of the 11 that need it most**, including
every dialog on the public purchase path.

### The sheet form already exists, in CSS, in four files

`RedeemConfirmationModal.tsx:167-168` and three identical siblings:

```
fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm
w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-6 pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))] sm:pb-6
```

That is the whole of DS-08's *form* difference, and it is **three class pairs**:
`items-end` → `sm:items-center`, `rounded-t-2xl` → `sm:rounded-2xl`, and the
bottom padding → `sm:pb-6`. **No JavaScript is involved.**

### The project's modal conventions — verified against the code

Both conventions the orchestrator recalled are **confirmed exactly**:

| Convention | Verified | Evidence |
|---|---|---|
| **Modals are `z-[60]` because `MobileNav` is `z-50`** | ✅ | `MobileNav.tsx:96` is `z-50`; **11 sites** carry `z-[60]`, listed above |
| **Bottom-sheet modals carry a specific safe-area bottom padding** | ✅ | `pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))] sm:pb-6` — **4 sites, byte-identical**. The `5rem` is the nav's height, hard-coded a third time |

**The full z-index ladder, so a new primitive does not land in the wrong rung:**

| Layer | Value | Sites |
|---|---|---|
| dropdown / suggestion list | `z-50` (`absolute`) | `AutocompleteInput.tsx:107`, `AutocompleteTagInput.tsx:191` |
| **`MobileNav`** | `z-50` | `MobileNav.tsx:96` |
| **modal overlay** | `z-[60]` | 11 sites |
| toast container | `z-[70]` | `ToastContainer.tsx:24` |
| scanner flash — **Phase 42** | `z-[70]` | `ScanFlash.tsx:135` |
| full-screen redeem confirmation | `z-[100]` | `RedeemConfirmationModal.tsx:100,125`, `GuestTokenDisplay.tsx:158,182` |
| **native `<dialog>` (`showModal`)** | **top layer — above all of the above** | 7 files |

> **A latent conflict worth writing down before it bites.** A native `<dialog>`
> in the top layer paints above the `z-[70]` toast container. Today this is
> **latent, not live**: `useToast` has exactly one consumer
> (`GuestListClient.tsx`) and it is not a dialog. It goes live the first time a
> converted dialog reports success by toast — and the toast will be invisible,
> silently. If the dialog primitive is native, the toast has to move into the
> top layer with it (a `popover` element, or rendered inside the dialog).

### CSS-only or two render paths? — the SSR question, answered

**`RECOMMENDATION`: CSS-only. The evidence is one-sided.**

There are three ways to know the viewport during render in React 19 / Next 16,
and all three of the JS routes are worse:

1. **`useSyncExternalStore` with `getServerSnapshot`.** React's own reference is explicit that `getServerSnapshot` *"runs on the server when generating the HTML"* and *"runs on the client during hydration"*, and that it must *"return the same exact data on the initial client render as it returned on the server"* (react.dev, `useSyncExternalStore`). The server has no viewport, so `getServerSnapshot` must **guess a tier**. Hydration then renders the guess and a post-hydration re-render flips it. That is not a hydration *error* — it is a **visible flash of the wrong form**, on every device in the tier you did not guess. At a door in a dark room this is exactly the class of defect `checkin-offline.md` warns about.
2. **`useEffect` + state.** Renders nothing (or the wrong thing) on first paint, then swaps. Same flash, plus a layout shift.
3. **`dynamic(..., { ssr: false })`.** Removes the dialog subtree from server rendering entirely. Worse on a slow connection, and it is a different implementation for one tier — which is the thing DS-08 forbids.

CSS-only has none of these properties: **one DOM tree, one implementation, and
the server HTML is already correct at every width**, because the browser
evaluates the media query at paint. It is also what four files in this tree
already do, so it is a pattern with a track record here.

**The one thing CSS cannot do**, stated so nobody discovers it in a plan: a
*behavioural* difference between the two forms — a drag-to-dismiss gesture, a
different focus order, a different scroll container. **Criterion 2 asks for
neither.** It asks for a form difference and for Escape. If a later phase wants
drag-to-dismiss, that is where a JS viewport read earns its cost, and this
research does not pre-authorise it.

### `RECOMMENDATION` for the dialog primitive

Take the native `<dialog>` shell that already exists seven times, and give its
inner wrapper the sheet classes that already exist four times. Concretely, the
difference between what exists and what DS-08 needs is:

- inner wrapper `items-center` → `items-end sm:items-center`
- panel `rounded-2xl` → `rounded-t-2xl sm:rounded-2xl`
- panel `pb-6` → the safe-area calc, `sm:pb-6`

That yields Escape, focus trap and background inertness **from the platform**,
the sheet-vs-window form **from CSS**, and one implementation for 18 sites. The
`z-[60]` convention becomes unnecessary for dialogs (the top layer is above it),
but stays correct for anything that must not be a modal.

**Open for `UI-SPEC`:** whether the phone form is a bottom sheet or a full-screen
panel for *long* dialogs (`EventForm` is 1 668 lines); whether light dismiss
stays hand-rolled or moves to `closedby="any"`; and the sheet's radius, gutter
and maximum width.

---

## Tables — 7 sites, and DS-09 is mostly already done

| File | Lines | Columns | Phone form today | Breakpoint |
|---|---|---|---|---|
| `components/admin/MemberTable.tsx` | 1 395 | 7 (+ checkbox, + actions) | **cards** (`lg:hidden`, `:1238`) | `lg` (1024px) |
| `components/admin/TransactionList.tsx` | 835 | 5 | **cards** (`lg:hidden`, `:652`) | `lg` (1024px) |
| `components/events/SalesDashboard.tsx` | 297 | 6 | **cards** (`sm:hidden`, `:225`) | `sm` (640px) |
| `components/analytics/MemberSpendTable.tsx` | 79 | 7 | **cards** (`sm:hidden`, `:55`) | `sm` |
| `components/analytics/DrinkSalesBreakdown.tsx` | 71 | 5 | **cards** (`sm:hidden`, `:49`) | `sm` |
| `components/analytics/ReferralChainTable.tsx` | 109 | 3 | **cards** (`sm:hidden`, `:69`) | `sm` |
| `(admin)/admin/events/[id]/review/ReviewListClient.tsx` | 423 | `COLUMNS.length` | **none — scrolls sideways** (`overflow-x-auto`, `:204`) | **no breakpoint prefixes at all** |

So **six of seven already satisfy DS-09's letter** — by writing the markup twice
and hiding one copy. DS-09's real content is therefore two things, and they are
different from what the criterion's wording suggests:

1. **Consolidation (DS-07's clause, not DS-09's).** Six tables, six hand-written card lists, two disagreeing breakpoints. One implementation, one breakpoint.
2. **The seventh table.** `ReviewListClient.tsx:204-229` is the only one that scrolls sideways on a phone — and **it is the case where cards may be wrong.** Its own copy says why: *"Identifiers only — these are the columns of the night's record, joined to nothing. It can be pasted into a diagnostic tool…"* (`:198-202`). A diagnostic grid meant to be read as a grid and copied out is a use case a card list actively harms. It also renders at `text-[11px]`, below the 14px floor `40-UI-SPEC.md:889` sets. **`OWNER` / `UI-SPEC`:** is a copy-out diagnostic grid an exception to DS-09, or does it get cards like everything else? This research does not answer it.

### The mechanism — and why the CSS-only shortcut is wrong *for this project*

The tempting shortcut is one DOM tree with `display: block`/`grid` applied to
`table`/`tr`/`td` at a breakpoint. **Do not.**

- MDN's ARIA `table` role page states the case directly: *"A relevant use case for the ARIA table role is when CSS's `display` property overrides the native semantics of a table, such as by `display: grid`. In this case, you can use the ARIA table roles to re-add the semantics."*
- Adrian Roselli's browser matrix (last substantive update December 2022): *"Chrome is fine now, the last Firefox bug just closed… and **Safari is still a hot mess** after repeated assurances it was being fixed."* His Safari/iPadOS 15.5–17 row records, with WebKit bug numbers: *"VoiceOver treats all cells as in column 1 and does not provide column headers"* (WebKit 243474) and *"Table data cannot be accessed using VoiceOver when swiping"* (WebKit 257458).

**This project's primary device is a phone, and on iOS every browser is WebKit.**
The one browser where the CSS-only transformation is documented to still break
header/cell association is the browser this product mostly runs in.

**The header/cell association question, answered rather than implied:** with two
DOM trees under `hidden` / `sm:hidden`, `display: none` removes the hidden tree
from the accessibility tree entirely. A phone user reaches only the card list —
where each field carries its own visible label, so association is *lexical*, not
structural, and nothing is lost. A desktop user reaches only the `<table>`, with
its `<th>` intact. **Neither tree is ever semantically broken, because neither is
ever transformed.** That is the property the existing six files already have,
and it is the reason to keep the mechanism and change only its duplication.

> **`RECOMMENDATION`:** one component, one server-fetched data array, two render
> branches inside it, chosen by `hidden`/`hidden` classes. Explicitly **not** a
> `display`-override on a single `<table>`, and explicitly **not** two components.
> The breakpoint is **`UI-SPEC`'s** — but it must be *one* value, because two
> tables switching at 640px and two at 1024px is the inconsistency DS-07 names.

---

## Responsive — the three tiers, measured against what exists

### What exists: essentially nothing

Measured today, `src/**/*.tsx`:

| Prefix | Occurrences | Files |
|---|---|---|
| `sm:` | **44** | **22** |
| `md:` | **0** | **0** |
| `lg:` | **5** | **3** |
| `xl:` | **0** | **0** |
| `2xl:` | **0** | **0** |

Twenty-two of 181 files carry any responsive rule at all, and twelve of those
occurrences are the six table dual-renders and four are the sheet modals. **The
responsive layer is not partial; it is absent.**

Tailwind 4.2.1's defaults, read from `node_modules/tailwindcss/theme.css:327-331`
so nobody looks them up: `sm` 40rem/640px, `md` 48rem/768px, `lg` 64rem/1024px,
`xl` 80rem/1280px, `2xl` 96rem/1536px. `--spacing: 0.25rem` (`:325`), so `h-11`
is exactly 44px.

### RESP-02 — content does stretch, and there is no container to stop it

The complete `max-w-*` inventory under `src`:

| Class | Occurrences | Typical use |
|---|---|---|
| `max-w-sm` (24rem) | 16 | toasts, narrow cards |
| `max-w-md` (28rem) | 12 | modal panels |
| `max-w-none` | 7 | overrides |
| `max-w-lg` (32rem) | 5 | `MobileNav`'s inner row, auth cards |
| `max-w-xs` (20rem) | 4 | |
| `max-w-full` | 2 | |
| `max-w-prose` | 1 | |

**There is no `max-w-4xl`, `max-w-6xl`, `max-w-7xl` or `max-w-screen-*` anywhere**,
and only **2** occurrences of the `mx-auto max-w-*` centring idiom. Neither
layout constrains width: `src/app/layout.tsx:104` is `<body className="min-h-dvh antialiased">`
and `(work)/layout.tsx:84-96` renders `<StaffNav/>{children}<MobileNav/>` with no
wrapper at all. **Every page is edge-to-edge at 1920px today**, with a 24px
gutter (`px-6`, 148 occurrences). RESP-02 is entirely new work.

### RESP-04 — there is no menu, and that is the problem

**Nothing in this product is hidden behind a menu.** There is no hamburger, no
drawer, no disclosure. Navigation is two fixed components:

- **`MobileNav`** — `fixed bottom-0 left-0 right-0 z-50` with an inner `mx-auto … max-w-lg` row (`MobileNav.tsx:96-97`). It renders at **every width**, so on a desktop it is a floating pill bar at the bottom centre of a 1920px screen. Mounted at **13 sites**. Five entries max (`roles.ts`: Home, Events, Gallery, Check-in, Account).
- **`StaffNav`** — a horizontally scrolling pill strip with its scrollbar hidden by an injected `<style>` (`StaffNav.tsx:60-66`). **Eight tabs**: Events, Members, Artists, Venues, Formats, Newsletter, Finance, Analytics (`staff-tabs.ts:101-131`). Pills are `px-4 py-1.5 text-sm` — **≈32px tall**. No `aria-current`. It renders identically at every width.

> **The criterion's literal test passes on code that fails its intent, and the
> planner needs to know that before writing an acceptance criterion.** RESP-04
> forbids hiding filters and navigation *behind a menu*. Nothing is. What
> actually happens is that eight tabs sit in a strip **estimated at ~808px wide**
> — which scrolls off-screen on a 390px phone (≈418px hidden), still scrolls at
> 768px, and fits only from about 1024px. *(Estimate from label lengths and
> Tailwind padding, not a rendered measurement — it should be checked in a
> browser before it is quoted in a plan.)* A tab past the scroll edge is as
> unreachable as one behind a menu, and arguably worse: a menu at least
> advertises that there is more.
>
> **`OWNER` / `UI-SPEC`:** does RESP-04 read as *"the strip must not need to
> scroll from tablet width up"*, or as *"work-surface navigation takes a
> different form at tablet width"* (a rail, a sidebar, a wrapped row)? The two
> answers cost very differently, and the second one is what makes the 49
> `pb-24`s and the toast's hard-coded `5rem` offset come due.

### Filters that exist today

Only five search inputs (`MemberTable.tsx:1001`, `SalesDashboard.tsx:158`,
`EventForm.tsx:1039,1401`, `ScannerClient.tsx:3064` — the last is Phase 42's) and
ten files with a `<select>`. The richest filter surface is
`(public)/events/FormatFilterRow.tsx`, which is a **public** surface, not a work
surface. **The work surfaces barely have filters to show yet** — so RESP-04's
"filters" half is close to vacuous today, and will become real as Phase 44/45
add production sections. Worth telling the planner: do not invent filters to
satisfy the criterion.

### Consequences of each candidate boundary — framing only, no choice

| Boundary | Consequence |
|---|---|
| **`sm` = 640px as the phone/tablet line** | Matches four existing tables and all four sheet modals; **zero migration**. But 640px is *below* every tablet in portrait (768px+) and above several phones in landscape — so "tablet layout" would start on a large phone held sideways |
| **`md` = 768px** | Matches portrait tablets exactly. But `md:` is used in **zero** files today, so every existing `sm:` becomes an inconsistency to migrate — 44 occurrences in 22 files |
| **`lg` = 1024px as the tablet/desktop line** | Matches the two big tables and the estimated point where the 8-tab strip stops scrolling. Also matches iPad landscape |
| **Two boundaries (phone/tablet/desktop)** | What the phase name says. Costs: three layouts to verify per surface, at 34 units |
| **One boundary** | Cheaper, but collapses "tablet" into one of the neighbours and the phase is named *Three-Tier* |

**This research does not choose. `UI-SPEC` does.** What it can say is that
whichever is chosen, **the existing 44 `sm:` occurrences in 22 files must be
migrated or grandfathered explicitly** — leaving them as an unremarked second
convention is how a design system acquires two breakpoints nobody decided.

---

## Touch Targets — the criterion with a trap in it

### The trap, stated

Criterion 5: *"Touch targets stay finger-sized wherever the input is a finger,
**large touch screens included**."* That final clause **rules out keying the rule
off viewport width.** A 1024px iPad is touched. A 1440px touchscreen laptop is
touched. Any rule of the shape `sm:py-1.5` (small targets above 640px) fails the
criterion by construction.

### The mechanism — verified in the installed package, not assumed

Tailwind CSS **4.2.1** ships pointer variants as first-class. Extracted verbatim
from `node_modules/tailwindcss/dist/lib.js`:

```
("pointer-coarse", ["@media (pointer: coarse)"]),
("pointer-fine",   ["@media (pointer: fine)"]),
("any-pointer-none",   ["@media (any-pointer: none)"]),
("any-pointer-coarse", ["@media (any-pointer: coarse)"]),
("any-pointer-fine",   ["@media (any-pointer: fine)"]),
```

**Zero of these are used anywhere in `src` today.** No custom variant needs to be
written; the vocabulary exists and is unused.

**Which one, and why it matters** *(MDN, `@media/pointer` and `@media/any-pointer`)*:

| Feature | Definition | Behaviour on the cases criterion 5 names |
|---|---|---|
| `pointer: coarse` | *"The **primary** input mechanism includes a pointing device of limited accuracy, such as a finger on a touchscreen"* | iPad → **matches**. Touchscreen laptop with a trackpad → primary is the trackpad → **does not match**. **Fails the "large touch screens included" clause** |
| `any-pointer: coarse` | *"**At least one** input mechanism includes a pointing device of limited accuracy"* | iPad → matches. Touchscreen laptop → **matches**. Desktop with a mouse only → does not match |

> **`RECOMMENDATION`: `any-pointer: coarse` is the feature that satisfies
> criterion 5 as written.** And its cost, stated rather than buried: a
> mouse-and-touchscreen Windows laptop gets 44px targets for its *mouse* user
> too. MDN notes *"more than one value can match if the available devices have
> different characteristics"* — so `any-pointer: fine` and `any-pointer: coarse`
> can both be true, and a rule written on `coarse` wins wherever a finger is
> *possible*. That is the criterion's own trade, not a defect — but it is a
> trade, and **`OWNER`** should see it before it ships.

**Reliability caveat, marked honestly.** `any-pointer` is long-supported across
browsers, but reporting depends on the OS telling the browser what devices are
attached, and hot-plugging a touchscreen or a stylus does not always re-evaluate
promptly. **The safe design does not depend on the query being right**: make 44px
the default and use `any-pointer-fine:` to *shrink* only where a fine pointer is
the only input. Then a wrong answer costs a slightly-too-large button, never a
too-small one. This is the same asymmetry `checkin-offline.md` applies at the
door.

### What is there today — measured

A heuristic parser over `<button>`, `<Link>`, `<a>`, `<input>`, `<select>`,
`<textarea>` and `<summary>` extracted the class string of each and computed a
hit height from an explicit `h-*`/`min-h-*`, or from `py-*`/`p-*` plus the
line-height implied by the `text-*` class (Tailwind default `--spacing: 0.25rem`).

**174 elements had a computable height. 118 (68%) estimate under 44px. 32
estimate under 32px.**

| Bucket | Count |
|---|---|
| 16–24px | 16 |
| 28px | 16 |
| 32px | 16 |
| **36px** | **42** |
| 40px | 28 |
| 44px | 20 |
| 48px+ | 36 |

> **This is an estimate and must be labelled as one in any plan.** It reads class
> strings; it cannot see a flex container that stretches a child, an icon that
> sets the height, a `line-height` override, or a target padded by an ancestor.
> **Its value is as a ranked list to check by hand, not as a verdict.** The 36px
> spike (42 elements) is almost entirely `py-2 text-sm` and `h-9`, and several of
> those may measure larger in a browser.

**Worst offenders outside Phase 42's territory, with `file:line`:**

| Est. | Site | Class fragment |
|---|---|---|
| **16px** | `components/admin/MemberTable.tsx:1183`, `:1348` | `h-4 w-4` — the select-all and per-row **checkboxes**. Also, per §4.2, their boundary is `border-card-border` |
| **20px** | `(public)/events/[slug]/page.tsx:1136` | `rounded-full … px-2.5 py-0.5 text-xs` — a lineup pill that is a `<Link>` |
| **24px** | `(admin)/admin/events/[id]/drinks/DrinkMenuManager.tsx:312`, `:320` | `px-3 py-1 text-xs` — save/cancel on an inline edit |
| **24px** | `DrinkMenuManager.tsx:343`, `components/events/EventForm.tsx:630` | `h-6 w-11` — **toggle switches** |
| **24px** | `components/admin/MemberTable.tsx:245`, `:409` | `px-2.5 py-1 text-xs` — role/status actions |
| **24px** | `components/venues/VenueProfilePrompt.tsx:20,27` · `components/artists/ArtistProfilePrompt.tsx:20,27` | `px-3 py-1 text-xs` |
| **24px** | `components/media/MediaUpload.tsx:674` | `h-6 w-6` — the remove-from-upload button |
| **28px** | `components/events/EventList.tsx:191–226` | **six** `px-3 py-1.5 text-xs` links in a row |
| **28px** | `components/tickets/TierCard.tsx:170,239` · `DiscountCodeCard.tsx:227,300` | `px-4 py-1.5 text-xs` |
| **28px** | `MemberTable.tsx:1359`, `TransactionList.tsx:788` | bare `p-0.5` |
| **32px** | `(work)/analytics/compare/page.tsx:93,103` · `(work)/members/growth/page.tsx:64,74` | `px-4 py-1.5 text-sm` — **the page's own filter controls** |
| **32px** | `formats/CreateFormatModal.tsx:369` · `CreateSeriesModal.tsx:301` · `RedeemConfirmationModal.tsx:171` | `h-8 w-8` — dialog **close** buttons |
| **~32px** | `components/staff/StaffNav.tsx:74` | `px-4 py-1.5 text-sm` — **all eight work-surface tabs** |

**Files with the most sub-44 targets:** `TransactionList` (7), `TierCard` (7),
`EventList` (6), `AddTierForm` (6), `EditArtistButton` (6), `EditVenueButton` (6),
`MemberTable` (5), `(public)/events/[slug]/page.tsx` (5), `DrinkMenuManager` (5),
`DiscountCodeCard` (5).

**The only prior art:** `min-h-11` appears **twice in the entire tree**, both in
`(public)/events/FormatFilterRow.tsx:115` and `:162`. `40-UI-SPEC.md:141-143`
cites a third site (`ColorSwatchPicker.tsx:279`) that no longer matches — worth
re-checking rather than quoting.

### Phase 42's territory — reported, not planned

Per the brief, findings inside the scanner and door are inherited context only:

- `(admin)/admin/scanner/ScannerClient.tsx:2909` and `:2918` — two `px-2 py-0.5 text-[10px]` buttons, **estimated 18px**, the smallest interactive elements in the tree. They are also the sites `40-UI-SPEC.md:889-890` already assigns to Phase 42 for the type-size half.
- `ScannerClient.tsx` has 3 sub-44 targets by this estimate.
- **These are not Phase 41's to fix**, and a Phase 41 gate that scans the whole tree for small targets will go red on them. Any such gate must exempt `src/app/(admin)/**/scanner/**`, `src/components/scanner/**` and `src/app/(admin)/door/**` **by path, in the script, with the reason written beside it** — or it will be switched off, and then it guards nothing.

### One inherited accessibility finding this phase should at least look at

`src/app/layout.tsx:81-92` sets `maximumScale: 1, userScalable: false`. This is
`40-REVIEW.md` WR-16, reviewed and **left unfixed** (`40-VERIFICATION.md:101`).
It blocks pinch-zoom, which is the standard mitigation a user applies when a
target or a label is too small — i.e. it removes the workaround for the exact
defect RESP-03 exists to fix. **Not one of the seven requirements**, so not
automatically in scope; flagged because a phase about touchability that leaves
zoom disabled has an awkward story. **`OWNER`.**

---

## What Phase 40 Left, and what this phase is supposed to do with it

### The four legacy names, and their consumers today

Kept as aliases on purpose (`globals.css:179-208`): *"A name any shipped document
still reads is not deleted; it is emptied of consumers first and removed second.
A rename is a removal wearing a friendly word — and here the removal is SILENT.
Tailwind emits no rule, no warning and no error for a utility whose token is
gone… `npm run build` stays green. There is no error tracking in this project:
nobody would be told."*

```css
--background:  var(--ground);   /* globals.css:205 */
--foreground:  var(--ink);      /* :206 */
--card:        var(--surface);  /* :207 */
--card-border: var(--line);     /* :208 */
```

**Re-measured today, by utility rather than by name** (a bare `-card` boundary
match also matches `-card-border`, which is why the file's own figure of 111 for
`--card` and my first pass of 119 disagreed):

| Utility | Occurrences | Reads |
|---|---|---|
| `border-card-border` | **406** | `--card-border` |
| `text-foreground` | **384** | `--foreground` |
| `bg-card` | **241** | `--card` |
| `bg-card-border` | **209** | `--card-border` |
| `bg-background` | **119** | `--background` |
| `from-card` | 12 | `--card` |
| `divide-card-border` | 4 | `--card-border` |
| `text-background` | 3 | `--background` |
| `via-card` / `to-card` / `to-background` / `ring-foreground` / `bg-foreground` | 1 each | |

| Legacy name | Consumer files | Total occurrences |
|---|---|---|
| `--card-border` | **115** | 619 |
| `--card` | **~111** *(matches `globals.css:193`)* | 255 |
| `--foreground` | **93** | 388 |
| `--background` | **43** | 123 |
| **union (any of the four)** | **142** | **1 385** |

`--muted`, `--accent` and `--accent-hover` need no alias: they kept their names
and took new values.

### The safe order of removal

The gate's own discipline, at `verify-tokens.mjs:285-303`, above `KNOWN_TOKEN_NAMES`:

> *WHAT THIS LIST IS: the mechanical form of `40-UI-SPEC.md` §8.3 clause 3 —
> token names are additive within a release; a name any shipped document still
> reads is not deleted, it is emptied of consumers first and removed second…*
>
> *So the two edits are not symmetrical, and both are part of the work:*
> - *ADDING a name here is part of DECLARING a token. Until the name is in this list, check D cannot see a consumer of it, and a half-rename passes.*
> - ***REMOVING a name here is part of PROVING it has no readers. Take it out while a file still reads it and the gate goes quiet about exactly the failure it was written for.***
>
> *This list is the only memory this script has of names that used to exist.*

And `globals.css:196-200`: *"Exit route: **PHASE 41** empties them of consumers,
one whole surface at a time; only then may a name be removed, and only in the
same commit as its entry in `KNOWN_TOKEN_NAMES`."*

**What this obliges Phase 41 to do, as a sequence with no shortcut:**

1. **Do not remove any of the four names, or their `KNOWN_TOKEN_NAMES` entries, until that name's consumer count under `src/` is zero.** Check D is an *absence* check on names that are declared but carry no utility; while a name is still exposed via `@theme inline`, check D says nothing about it.
2. **The `@theme inline` mapping must go in the same commit as the `:root` declaration** — leaving `--color-card: var(--card)` after deleting `--card` is precisely the silent-blank the file was written to prevent.
3. **Remove the name from `:root`, from `@theme inline`, and from `KNOWN_TOKEN_NAMES` in one commit**, with the zero-consumer count in the commit body.
4. **Order by cheapness.** `--background` has the fewest consumers (43 files, 123 occurrences) and is the first that can plausibly reach zero; `--card-border` has the most (115 files, 619) and, because §4.2 forbids it on any control boundary, it also cannot simply be renamed — **every one of its 406 `border-card-border` uses has to be triaged into "card edge, still a line" or "control boundary, must become `--muted` or lighter."** That is the largest single body of work the legacy-token cleanup contains, and it is an accessibility fix wearing a rename's clothes.
5. **A name that reaches zero mid-phase but is still read by an unconverted surface's *sibling*** — the same trap as criterion 1. Zero must be measured tree-wide, not per surface.

**A conservative reading, worth stating:** nothing in the criteria requires the
four names to be *removed* in Phase 41. Emptying them of consumers is what
`globals.css:196` assigns; removal is *permitted* once empty. **`OWNER`:** if the
phase runs long, the names can stay declared and unused for one more release at
zero cost. What must not happen is removal before zero.

### `--font-display` renders nothing, and this is the phase where it stops

**Verified: `font-display` has 0 occurrences in 0 files.** (`font-mono`: 15 in 12;
`font-sans`: 0 — the interface role comes from `body`, `globals.css:340`.)

`globals.css:331-335` states the intent in advance: *"da qui Orbitron non rende
NULLA finche' una superficie non applica il ruolo display, e la prima sara' della
fase 41. E' la forma voluta — `40-UI-SPEC.md` §5.1 assegna al volto display il
solo wordmark e i titoli di pagina."* `40-VERIFICATION.md:37` records the same
and calls it *"the intended shape."*

**Where the display role lands, concretely:** the 52 `<h1>` elements in 38 files,
of which 34 already share `text-3xl font-bold tracking-tight` — i.e. the page
title primitive is the surface that turns Orbitron on. Note the collision with
the two-weight rule: those 34 are `font-bold` (700) and `40-UI-SPEC.md:554` says
**400 and 600, nothing else**.

**`40-REVIEW.md` WR-11 is still open** (`40-VERIFICATION.md:101`): Orbitron is
loaded *and preloaded* at the root with zero consumers. Phase 41 either gives it
consumers — which closes WR-11 by making the preload correct — or the preload
stays a wasted fetch on every page. Worth naming in a plan.

**The wordmark has no component.** `src/app/page.tsx:40` renders it as an
`<img alt="re:sonate">`. `40-UI-SPEC.md:567-580` specifies it as composed
`re:` + `sonate` in the **data** face with the second half at 600, and
`text-transform: none` declared on the element itself — because `uppercase`
appears in **43 files** and `text-transform` inherits. **A wordmark component is
therefore a real primitive with a real rule**, and it does not exist yet.

**Three surfaces render the brand wrongly today**, all assigned to Phase 41 by
`40-UI-SPEC.md:643` *"when those surfaces convert"*:

| Site | Renders | Should be |
|---|---|---|
| `(public)/tickets/[id]/page.tsx:127` | `Resonate` in `uppercase tracking-widest text-accent` | `re:sonate` — normal e, lower case, colon, `normal-case` |
| `components/membership/MembershipCardView.tsx:28` | `Resonate Member`, same treatment | idem |
| `(auth)/register/page.tsx:85` | `Join the Resonate community` (prose) | idem |

Two of the three sit in single-file conversion units, so they are cheap.

### Other Phase 40 findings this phase inherits

| Finding | Status | Relevance |
|---|---|---|
| **WR-09 — nothing runs the gates.** No `.github/workflows/` exists (**verified: the directory is absent**); there is no aggregate `verify` script. All ten gates run only when a human types the command | **open** | Directly shapes § Validation Architecture. Adding an eleventh unrun gate is not verification |
| **WR-12 — `--faint` is exposed as a utility although it fails AA on every ground** (3.12–3.54:1), zero consumers today | **open** | The moment a converted surface reaches for a tertiary label, `text-faint` is available and wrong. `40-UI-SPEC.md:868` names `--muted` on `--surface` (6.78:1) as the pairing to use instead |
| **WR-10 — the unlayered `.font-mono { font-variant-numeric: tabular-nums }` rule cannot be overridden on the same element**, and a descendant carrying `.ordinal`/`.slashed-zero` rebuilds the shorthand and **drops** the inherited alignment (`globals.css:301-306`) | **latent** | A data/figure primitive must not put `ordinal` or `slashed-zero` on a descendant of a `font-mono` element |
| **CR-02 — `/tickets/[id]` renders `venue_text` and is not in `doorRuntimeCaching`**, so it falls to the `others` bucket (`40-VERIFICATION.md:100`) | **open, needs owner** | `(public)/tickets/[id]/page.tsx` is a Phase 41 conversion target. Touching it does not fix CR-02 and must not be described as doing so |
| **DI-40-01 — a second, hand-maintained palette in `src/emails/`** | open, unowned | Confirms `src/emails/**` stays out of scope |
| **DI-40-03 — two stray tool markers at the foot of `40-03-SUMMARY.md`** | open, cosmetic | One deletion by whoever next revises that file |

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Escape-to-close on a dialog | A `keydown` listener + cleanup | `<dialog>` + `showModal()` | `closedby` defaults to `closerequest`, which covers Esc **and** a mobile back/dismiss gesture. A listener covers Esc only |
| Focus trap | A tabbable-node query + wrap-around | `showModal()` | *"Elements … except the dialog and its descendants become inert"* (MDN). Free, and correct for `<iframe>` and shadow DOM, which a hand-rolled trap is not |
| Stacking a modal above everything | A new `z-` rung | `showModal()`'s top layer | Adding a sixth rung to a five-rung ladder is how the ladder stops being readable |
| Knowing the viewport width in React | `matchMedia` + `useEffect`, or `useSyncExternalStore` with a guessed `getServerSnapshot` | A CSS media query | The server has no viewport. Every JS route produces a visible flash on the tier you guessed wrong. **Zero such reads exist in the tree today — keep it that way** |
| Detecting "is this touched?" | A UA sniff, a `'ontouchstart' in window` check, or a width breakpoint | `any-pointer-coarse:` (present in Tailwind 4.2.1, verified) | A width breakpoint fails criterion 5's *"large touch screens included"* clause by construction; UA sniffing fails on every device it has not met |
| Turning a table into cards | `display: block/grid` on `table`/`tr`/`td` | Two render branches from one data array, hidden with `display: none` | Documented to break header/cell association in WebKit — this project's primary engine. `display: none` removes a tree from the a11y tree cleanly and breaks nothing |
| Loading placeholders | Another `animate-pulse` block | `src/components/ui/Skeleton.tsx` | It exists, it is correct, and it has zero importers while 102 hand-rolled blocks live in 20 files |
| A component library | Installing Radix / Headless UI / vaul | The seven identical `<dialog>` shells already in the tree | `40-UI-SPEC.md:940-946` records shadcn as refused by D-40-01 and no UI kit in 21 dependencies. Introducing one now re-opens a closed decision **and** adds a supply-chain surface for behaviour the platform already provides |

**Key insight:** almost everything DS-08 and DS-09 ask for is either already in
the platform (`<dialog>`, media queries, `any-pointer`) or already written
somewhere in this tree (the seven shells, the four sheets, the six dual-renders,
`Skeleton`). **This phase's difficulty is not building; it is choosing one of the
copies, deleting the rest, and getting surfaces to adopt what remains.**

---

## Common Pitfalls

### Pitfall 1 — the primitive that ships with zero consumers

**What goes wrong:** a plan builds `<Card>`, `<Dialog>`, `<PageShell>` and stops.
Nothing adopts them; the old markup stays; the repository gains a third way of
doing everything.
**Why it happens:** building is a bounded task and converting 51 files is not.
**Evidence it already happened here:** `src/components/ui/Skeleton.tsx` — correct,
complete, **zero importers**, alongside 102 hand-rolled `animate-pulse` blocks and
a local `LoadingSkeleton` re-implementation at `TransactionList.tsx:83`.
**How to avoid:** no plan ships a primitive without converting at least one whole
surface onto it in the same plan.
**Warning sign:** a plan whose `files_modified` list contains only new files.

### Pitfall 2 — the gate that goes red on a correct file

**What goes wrong:** a structural check flags a legitimate case; someone
disables it; it now guards nothing.
**Precedent in this repository, twice recorded:** `verify-media-strip.mjs:51-62`
— *"`event-media-quarantine` STARTS WITH `event-media`. A naive
`line.includes('event-media')` therefore flags every correct file… and a check
that fails on a correct file gets switched off, after which it guards nothing."*
And `40-REVIEW.md` WR-02: check D went red on a correct file the moment `body`
was retargeted onto the interface role.
**The Phase 41 shapes to watch:**
- a raw-colour scan that flags `bg-black/60` (nine two-stop accent fades and every modal scrim are legitimate),
- a small-target scan that flags Phase 42's scanner (out of scope by decree),
- a "one implementation" scan that flags the two legitimately different tables,
- a legacy-token scan that flags `globals.css` itself, where the four names must still be declared.
**How to avoid:** every gate is mutation-proven **in both directions** before it
is committed — made to go red on a real defect, and confirmed green on the
hardest correct file in the tree.

### Pitfall 3 — the gate that is green because it measured nothing

**What goes wrong:** a check's subject does not exist, or its regex matches
nothing, and it reports success.
**Precedent:** `40-REVIEW.md` WR-03 — *"`verify-sunset-gradient` 'check C' cannot
fail"*, fixed post-review by giving check C a real subject.
**The Phase 41 shape:** a "no surface is half-converted" check that iterates a
list of converted surfaces which is empty, or reads a manifest nobody updates.
**How to avoid:** every gate prints **what it counted**, not just its verdict —
`verify-tokens.mjs:715` already does this (*"known names: N · currently
UNEXPOSED and therefore under check D: …"*). A gate that prints `checked 0 files`
is a gate that failed.

### Pitfall 4 — converting a surface half-way because a shared file was invisible

**What goes wrong:** a plan scopes by path, converts `(work)/events/[id]/tickets/page.tsx`,
and misses `admin/events/[id]/tickets/RefundActions.tsx` — a different directory,
the same surface. Criterion 1 is violated and nothing says so.
**Why it happens:** the `(work)` route group splits every work surface across two
directory trees (`(work)/layout.tsx:15-25`).
**How to avoid:** scope by import closure. A per-plan check that walks the page's
transitive `.tsx` imports and asserts none is dirty is cheap and exact — the
script in this research does it in 40 lines.

### Pitfall 5 — the fixed bottom nav's 96px clearance, written 49 times

**What goes wrong:** navigation moves off the bottom at tablet width and 49 pages
keep `pb-24`; the toast keeps `bottom: calc(5rem + …)`; the layout is wrong
everywhere and each fix is a separate edit.
**How to avoid:** the page shell owns the clearance before the navigation moves.
Order matters.

### Pitfall 6 — a width-driven filter on an entitlement-driven list

**What goes wrong:** to make the 8-tab strip fit at tablet width, a plan filters
the tab list in JavaScript. Now width and capability decide the same array, and
`StaffNav.tsx:11-23`'s rule — *"Hiding a nav item is not protecting a route"* —
has a second author.
**How to avoid:** width may change **layout**, never **membership**. The server
decides which entries exist; CSS decides how they sit.

### Pitfall 7 — a converted surface that anticipates a venue reveal

**What goes wrong:** `(public)/events/[slug]/page.tsx` sits in the largest
conversion unit and is `venue-secrecy` primary (`meta-gates.md`). A layout change
that surfaces a field, un-truncates a string, or renders a component earlier can
show a venue before its reveal — and `venue_reveal_sent` is monotone.
**How to avoid:** treat that unit's plan as **Critical**, with an explicit impact
analysis, not as a generic conversion. Same for the money path
(`SumUpCheckoutModal`, `SumUpCardWidget`) in the same unit.

### Pitfall 8 — the toast that disappears under a native dialog

**What goes wrong:** a converted dialog reports success by toast; the toast is
`z-[70]`; the dialog is in the top layer; **the user sees nothing**, silently —
the exact failure mode `meta-gates.md` forbids.
**Status:** latent today (`useToast` has one consumer, not a dialog). Goes live on
first use.
**How to avoid:** decide the toast's layer in the same plan that makes the dialog
native.

---

## Code Examples

Verified patterns, each with its provenance.

### The dialog shell that already exists, seven times

```tsx
// Source: src/components/venues/CreateVenueModal.tsx:37-46 and 141-149
//         (byte-identical in 6 further files — see § Dialogs)
useEffect(() => {
  const dialog = dialogRef.current;
  if (!dialog) return;
  if (open)  { if (!dialog.open) dialog.showModal(); }
  else       { if (dialog.open)  dialog.close(); }
}, [open]);

<dialog
  ref={dialogRef}
  className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none bg-black/80 backdrop:bg-transparent p-0"
  onClose={handleDialogClose}
  onClick={(e) => { if (e.target === e.currentTarget) resetAndClose(); }}
>
  <div className="flex h-full w-full items-center justify-center p-4">
```

### The sheet form that already exists, four times — CSS only

```tsx
// Source: src/app/(public)/events/[slug]/RedeemConfirmationModal.tsx:167-168
//         (byte-identical in SumUpCheckoutModal, GuestTokenDisplay, GuestLoginBanner)
<div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
  <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-6
                  pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))] sm:pb-6">
```

The `5rem` is `MobileNav`'s height, hard-coded here and again at
`ToastContainer.tsx:26`. A primitive should hold it once.

### The table dual-render that already exists, six times

```tsx
// Source: src/components/analytics/MemberSpendTable.tsx:21 and :55
<div className="hidden sm:block overflow-x-auto">
  <table className="w-full text-sm">…</table>
</div>
<div className="space-y-3 sm:hidden">
  {/* card list, same data */}
</div>
```

Two trees, one hidden with `display: none` — neither is ever semantically
transformed. The breakpoint is `sm` here and `lg` in `MemberTable.tsx:1175,1238`
and `TransactionList.tsx:610,652`.

### The touch-target and filter-chip pattern that already exists, once

```tsx
// Source: src/app/(public)/events/FormatFilterRow.tsx:109-127
<nav aria-label="Filter events by format" className="mb-4 px-6">
  <div className="format-filter-scroll -mx-6 flex gap-4 overflow-x-auto px-6">
    <Link
      href={isPast ? "/events?tab=past" : "/events"}
      aria-current={allIsCurrent ? "true" : undefined}
      style={allIsCurrent ? { scrollMarginInline: "24px" } : undefined}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap
                  rounded-full border border-card-border px-4 text-xs font-semibold
                  tracking-wide normal-case transition-colors ${…}`}
    >
```

**The best component in the tree on this axis**: `min-h-11` (44px),
`aria-current` rather than colour alone, `normal-case` declared on the element,
gutter bleed with `-mx-6 px-6`, `scrollMarginInline` so the active chip is not
flush to the edge, and an inline colour from catalogue data with the neutral
`border-card-border` class kept underneath as a fallback (its own comment,
`:150-156`, explains why). It is also the shape `StaffNav` should take — with the
caveat that `border-card-border` on a control boundary is the §4.2 violation
described above, so even this component is not finished.

### The pointer variants, verified present

```
/* Extracted verbatim from node_modules/tailwindcss/dist/lib.js (Tailwind 4.2.1) */
("pointer-coarse",     ["@media (pointer: coarse)"]),
("pointer-fine",       ["@media (pointer: fine)"]),
("any-pointer-none",   ["@media (any-pointer: none)"]),
("any-pointer-coarse", ["@media (any-pointer: coarse)"]),
("any-pointer-fine",   ["@media (any-pointer: fine)"]),
```

Zero uses in `src` today.

---

## Prior Art in the Codebase

Which existing components are already close to the primitive they should become.
**The plan should extend these, not build beside them and leave two.**

| Existing | State | Should become |
|---|---|---|
| **`components/ui/Skeleton.tsx`** | correct, complete, **zero importers** | *the* loading primitive. Adoption, not creation |
| **The 7 native `<dialog>` shells** | byte-identical; two admit the copy in their docblocks | one `Dialog` primitive with the sheet form added from Family B |
| **`(public)/events/FormatFilterRow.tsx`** | `min-h-11`, `aria-current`, `normal-case`, gutter bleed, data-driven colour with a neutral fallback | the model for `StaffNav` and for every filter chip. Its `border-card-border` still needs the §4.2 fix |
| **`components/motion/{PressableCard,PressableButton,AnimatedSection,StaggeredList,CountUp}.tsx`** | 30–57 lines each, already shared across route groups, **carry no colour at all** | the spine. Almost free to convert; the reason the Wave-0 spine is small |
| **`components/toast/{Toast,ToastContainer,ToastContext}.tsx`** | a complete provider/container/item triple, one implementation | the notification primitive. Needs its layer decided against the top layer, and its `5rem` offset decoupled from `MobileNav` |
| **`components/formats/FormatMarker.tsx`** | shared admin + public; already applies `normal-case` per `36-UI-SPEC` | keep; convert with the spine |
| **`components/ui/{AutocompleteInput,Icons}.tsx`** | `ui/` is the primitives folder and holds only 3 files | the folder that grows. Note `AutocompleteInput` (140 lines) and `events/AutocompleteTagInput` (221) are 47% the same file |
| **`components/account/CollapsibleSection.tsx`** | 49 lines, one implementation | a disclosure primitive if one is wanted |
| `(work)/layout.tsx` | resolves `getAccessContext()` once and passes serialisable keys to both navs | **the layout that should own the container width and the nav clearance.** It is the only layout below the root and it already wraps 24 of 41 pages |

### Duplicate pairs that should collapse into one, measured

| Pair | Lines | Identical |
|---|---|---|
| `venues/VenueProfilePrompt` / `artists/ArtistProfilePrompt` | 37 / 37 | **~92%** |
| `venues/CreateVenueModal` / `artists/CreateArtistModal` | 312 / 320 | **~82%** |
| `venues/EditVenueButton` / `artists/EditArtistButton` | 278 / 206 | ~67% |
| `formats/CreateFormatModal` / `formats/CreateSeriesModal` | 527 / 444 | ~59% |
| `analytics/MemberSpendTable` / `analytics/DrinkSalesBreakdown` | 79 / 71 | ~59% |
| `tickets/TierCard` / `tickets/DiscountCodeCard` | 253 / 314 | ~55% |
| `tickets/AddTierForm` / `tickets/AddDiscountCodeForm` | 157 / 203 | ~51% |
| `ui/AutocompleteInput` / `events/AutocompleteTagInput` | 140 / 221 | ~47% |

*(Identity computed as differing lines over combined lines — a crude measure,
useful for ranking, not for a claim about behaviour.)*

**The two largest components in the tree** are `components/events/EventForm.tsx`
(**1 668 lines**) and `components/admin/MemberTable.tsx` (**1 395**), followed by
`TransactionList.tsx` (835) and `media/MediaUpload.tsx` (715). Each is a
single-file conversion that is larger than most whole units. **They will
dominate the phase's effort regardless of how the primitives are designed**, and
a plan that budgets by file count rather than by line count will mis-size by an
order of magnitude.

---

## State of the Art

| Old approach | Current approach | When it changed | Impact here |
|---|---|---|---|
| A JS modal library for focus trap, Escape and stacking | Native `<dialog>` + `showModal()`; `closedby` for light dismiss | `<dialog>` broadly interoperable since 2022; `closedby` more recent | The tree already uses the former in 7 files. `closedby` is optional and its adoption is a behaviour decision, not a requirement |
| `@media (max-width: …)` desktop-first | Mobile-first `min-width`, which is Tailwind's default direction | — | All 44 existing `sm:` uses are already mobile-first. Consistent |
| UA sniffing / `'ontouchstart' in window` for touch detection | `@media (any-pointer: coarse)` | Media Queries Level 4; first-class Tailwind variants in v4 | Verified present in the installed 4.2.1 bundle. Zero uses today |
| `100vh` on mobile | `dvh` | — | Already adopted: 62 `min-h-dvh` uses, and the 7 dialogs use `h-dvh w-dvw` |
| `display: block` on `table`/`tr`/`td` for "responsive tables" | Two render branches, or explicit ARIA table roles | Chrome fixed 2020, Firefox ~2022, **WebKit still broken as of the last published matrix** | The tree already does two branches, in six files. Keep the mechanism |
| Reading layout state in JS during render | Leave it to CSS; where JS must read a store, `useSyncExternalStore` with an honest `getServerSnapshot` | React 18+ | Zero JS viewport reads exist today. The cheapest correct state is the current one |

**Deprecated / outdated in this tree:**
- `src/app/(admin)/admin/eventi/` and `admin/membri/` — **empty directories**, leftovers from the Italian route names Phase 34 collapsed. Free to delete; worth noting so nobody assumes they are meaningful.
- `40-UI-SPEC.md:141-143` cites `ColorSwatchPicker.tsx:279` as a `min-h-11` site; **it no longer matches** — the only two `min-h-11` uses today are in `FormatFilterRow`. Re-verify before quoting.

---

## Validation Architecture

`.planning/config.json` does not set `workflow.nyquist_validation`, so it is
treated as enabled.

### Test framework

| Property | Value |
|---|---|
| Framework | **None.** No `test` script in `package.json`; zero `*.test.*` / `*.spec.*` under `src` (re-verified today) |
| Config file | none — and **Wave 0 must not introduce one.** Adding a test runner is a milestone-sized decision and is nowhere in this phase's requirements |
| Quick run command | `npm run build` — Next's build is also the typecheck. **Measured today: exit 0** |
| Full suite command | `npm run build` + the ten `scripts/verify-*` gates. **Measured today: all seven `verify:*` npm scripts exit 0** (`tokens`, `semantic-separation`, `sunset-gradient`, `routes`, `capabilities`, `media-strip`, `persona`) |

### The gate model this phase must copy

`verify-tokens.mjs` and `verify-media-strip.mjs` are the model species. Their
three conventions:

1. **A `WHAT A GREEN DOES NOT MEAN` header**, enumerating what the check cannot see. Present in 4 of the 10 scripts (`tokens`, `media-strip`, `semantic-separation`, `sunset-gradient`).
2. **`refuse()` → exit 2** for "could not run", distinct from exit 1 for "failed". Present in 7 scripts. *"No verdict is implied by a 2."*
3. **Print what was counted, not just the verdict** (`verify-tokens.mjs:715`).

### Requirements → verification map

**The split, stated honestly and up front: two of the five criteria are
structurally checkable, one is checkable with a caveat, and two are not
checkable at all.** Saying so is more useful than a table of five green boxes.

| Criterion | Req | Checkable? | Proposed check | What its green does **not** mean |
|---|---|---|---|---|
| **1 — one implementation, no surface half-converted** | DS-07 | **Yes, structurally** | **G1 `verify-conversion.mjs`.** A manifest lists converted surfaces. For each, walk the page's transitive `.tsx` import closure (excluding a declared spine + Phase 42's three files) and assert **zero** raw-palette utilities and **zero** legacy-token utilities. Separately assert each declared primitive has **≥1 importer**. | That the conversion is *right* — only that no unconverted file is reachable. It cannot see a hex written inline, a class built by concatenation, or a layout that is ugly |
| **2 — dialog is a sheet on a phone and a window above, one implementation, closes with Escape** | DS-08 | **Partly** | **G2 `verify-dialogs.mjs`.** Assert every file matching the dialog-shell signature imports the single primitive; assert the primitive uses `showModal()` (which supplies Escape by specification); assert no file outside the primitive declares `fixed inset-0 z-[60]`. | **That Escape actually closes it on a device.** `showModal()` implies it by spec; only a hand test observes it. And nothing static proves the sheet *looks* like a sheet |
| **3 — dense table reads as cards on a phone** | DS-09 | **Yes, structurally** | **G3 `verify-tables.mjs`.** For every `<table` under `src`, assert the file either imports the table primitive or is on an explicit, reasoned exemption list. Assert **one** breakpoint token across all of them | That the cards are readable, or that the right columns survived |
| **4a — workable on phone/tablet/desktop** | RESP-01 | **No** | — | — |
| **4b — content stops widening** | RESP-02 | **Yes, structurally** | **G4.** Assert the page-shell primitive declares a max width and that every converted page's outermost element comes from it | That the chosen width is right |
| **4c — filters and nav visible from tablet up** | RESP-04 | **Partly** | Assert no `overflow-x-auto` on a nav element above the chosen breakpoint | Whether it is *usable*. Also: **there is no menu today**, so the criterion's literal test already passes on failing code |
| **5 — finger-sized wherever the input is a finger** | RESP-03 | **Partly, and dangerously** | **G5 `verify-touch-targets.mjs`.** Assert every interactive element in converted files carries `min-h-11`/`h-11`+ **or** matches the primitive, with `src/**/scanner/**`, `src/components/scanner/**` and `src/app/(admin)/door/**` **exempt by path with the reason in the script** | **That anything is 44px.** A class-string parser cannot see a flex stretch, an icon-set height or an ancestor's padding. **This is the gate most likely to go red on a correct file** — see the assessment below |

### Both Phase 40 failure modes, assessed per gate

| Gate | Can it go **green having measured nothing**? | Can it go **red on a correct file**? |
|---|---|---|
| **G1 conversion** | **Yes** — an empty manifest yields "0 surfaces, all clean". **Mitigation:** print the surface count and the file count walked; refuse (exit 2) on an empty manifest | **Low.** The raw-palette regex must not match `bg-black/60` (11 modal scrims + nine two-stop accent fades are all correct) and must exempt `globals.css` and `ColorSwatchPicker.tsx` (the one file legitimately carrying brand hexes, `40-UI-SPEC.md:105`) |
| **G2 dialogs** | **Yes** — if the shell signature regex is over-specific it matches nothing. **Mitigation:** assert the match count equals a hard-coded expected count, and fail if it drops | **Medium.** `Lightbox.tsx` differs (`bg-black/90`); a signature that demands `/80` misses it. `MyMediaSection.tsx:184` is the only `role="dialog"` and is not a `<dialog>` |
| **G3 tables** | **Low** — `<table` is a literal that either exists or does not; print the count | **Medium.** `ReviewListClient` may be a legitimate exemption (a copy-out diagnostic grid). **The exemption list must exist before the gate, or the gate gets switched off on its first run** |
| **G4 container** | **Yes** — same empty-manifest hole as G1 | Low |
| **G5 touch targets** | **Yes** — the parser found a computable height for only 174 of the tree's interactive elements. A stricter parser measures fewer and reports greener | **HIGH — the highest of the five.** 68% of elements estimate under 44px today, and the estimate is a heuristic. Run tree-wide it goes red on Phase 42's files, on decorative `<a>`s, on icons inside stretched flex rows, and on elements padded by an ancestor. **Recommendation: scope it to converted files only, exempt Phase 42 by path, and prove it green on the hardest correct file in the tree before committing it** |

### The two criteria no script will ever close

**4a "workable on phone, tablet and desktop"** and **5's real content, "44px on a
real device"** are observations. They need a written manual procedure in the
`40-RELEASE-PASS.md` mould, and they should be scheduled with the end-of-v1.5
sitting that already owns Phase 40's H1/H3 and Phase 39's door pass.

| ID | Test | Expected | Why human |
|---|---|---|---|
| **H41-1** | Open each converted surface at 390px, 768px and 1280px | Nothing clipped, nothing stretched, no horizontal scroll on the page body | A layout being *workable* is a judgement |
| **H41-2** | Open a converted dialog on a phone and on a laptop | Sheet from the bottom edge on the phone; centred window on the laptop; **Escape closes it**; the background does not scroll behind it | Escape and scroll-lock are runtime behaviours. **Background scroll lock under `showModal()` is unverified in this research** and this is where it gets settled |
| **H41-3** | Open the densest converted table on a phone | Cards, no sideways scroll; every column that mattered is still present | Which columns matter is a judgement |
| **H41-4** | On an iPad (or any large touch screen), measure the smallest control on a converted work surface | ≥ 44×44 CSS px | The estimate in this document is a class-string parse, not a measurement |
| **H41-5** | On a desktop with a mouse only, confirm targets are not gratuitously large | — | The other half of the `any-pointer` trade |
| **H41-6** | Reach every work-surface tab at 768px without scrolling the strip | All eight reachable | The ~808px figure is an estimate; this is the measurement |

### Sampling rate

- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build` + all ten `scripts/verify-*` gates
- **Phase gate:** all gates green, plus H41-1…H41-6 recorded in a release-pass document before `/gsd:verify-work`

### Wave 0 gaps

- [ ] `scripts/verify-conversion.mjs` — G1 (DS-07, criterion 1)
- [ ] `scripts/verify-dialogs.mjs` — G2 (DS-08, criterion 2)
- [ ] `scripts/verify-tables.mjs` — G3 (DS-09, criterion 3), **with its exemption list decided first**
- [ ] `scripts/verify-touch-targets.mjs` — G5 (RESP-03, criterion 5), **scoped and path-exempted, or not written at all**
- [ ] A conversion manifest — the one artifact G1 and G4 both read, and the one that makes criterion 1 mechanically meaningful
- [ ] **`npm run verify` — an aggregate script.** `40-REVIEW.md` WR-09 is open: no CI exists and every gate runs only when a human types its name. **Phase 41 would take the count from 10 to 14.** Adding four more unrun gates is not verification; it is four more files. This is the cheapest high-value item in the phase and it closes a Phase 40 warning at the same time
- [ ] No test framework install. Deliberately.

---

## Package Legitimacy Audit

**No packages are installed by this phase, and none should be.**

- `package.json` declares 21 runtime dependencies; **none is a UI kit** (verified by reading the file).
- No `components.json`; shadcn is not initialised and initialising it was **refused by D-40-01** (`40-UI-SPEC.md:940-946`).
- Every mechanism this research recommends is either a platform feature (`<dialog>`, `showModal()`, `@media (any-pointer: …)`) or already present in Tailwind 4.2.1 (verified in the installed bundle) or already written in this tree.

| Package | Registry | Disposition |
|---|---|---|
| — | — | **No installs proposed.** The legitimacy gate did not run because there is nothing to vet — recorded as evidence, not as intent |

`slopcheck` was therefore not invoked. **If a plan proposes any package, this
audit must be re-run before it is installed**, and the proposal should first
answer why the platform feature is insufficient.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node | build + gates | ✓ | (repo standard) | — |
| `next` | build / typecheck | ✓ | **16.1.6** | — |
| `react` / `react-dom` | — | ✓ | **19.2.3** | — |
| `tailwindcss` | pointer variants, breakpoints | ✓ | **4.2.1** | — |
| `motion` | existing motion wrappers | ✓ | ^12.35.2 | — |
| `npm run build` | the only typecheck | ✓ | **exit 0 today** | — |
| Ten `scripts/verify-*` gates | structural verification | ✓ | **all exit 0 today** | — |
| **CI runner** | running any of the above automatically | ✗ | — | **None.** `.github/workflows/` does not exist. `40-REVIEW.md` WR-09, open |
| **Test runner** | — | ✗ | — | **None, by design.** `npm run build` + gates + written manual procedure |
| **A tablet / large touch screen** | H41-4, H41-6 | **unknown** | — | **None.** Criterion 5 names large touch screens explicitly and no script substitutes for one. **Flag for the owner: if no tablet is available, criterion 5 cannot be closed by observation and must be recorded as `human_needed`, not ticked** |
| Firecrawl CLI | this research only | ✓ | — | — |
| `ctx7` CLI | this research only | ✗ | — | Used Firecrawl against react.dev / MDN instead |
| `slopcheck` | not needed | not installed | — | No packages proposed |

**Missing with no fallback:** a CI runner (affects every gate this phase writes),
and possibly a large touch screen (affects criterion 5's only real proof).

---

## Assumptions Log

Claims not verified in this session, or verified against a source that may have
aged.

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| **A1** | **WebKit still breaks table semantics under a `display` override.** Sourced from Roselli's matrix, last substantively updated **December 2022** and covering up to Safari 17. Current is 2026 | Tables | If WebKit has since been fixed, the CSS-only route becomes viable — but the recommended route (two DOM trees) is safe either way, so the risk is a missed simplification, not a defect |
| **A2** | **Native `<dialog>` `showModal()` does not reliably lock background scroll.** MDN documents inertness and the top layer but is silent on scrolling; not tested in a browser here | Dialogs | If scroll leaks behind an open sheet, it is visible and annoying, not dangerous. **Closed by H41-2** |
| **A3** | **The staff tab strip is ~808px and scrolls below ~1024px.** Computed from label lengths and Tailwind padding, **not rendered** | Responsive | If the real width is smaller, RESP-04's tablet story is easier than described. **Closed by H41-6** |
| **A4** | **118 of 174 interactive elements are under 44px.** A class-string heuristic; it cannot see flex stretch, icon-set heights, or ancestor padding | Touch targets | Over-estimates the problem in the 36–40px band. Under-estimates nothing — the 16–28px cases are unambiguous. **Closed by H41-4** |
| **A5** | **`any-pointer: coarse` may not re-evaluate promptly when a touch device is hot-plugged.** General knowledge, not verified against a browser matrix in this session | Touch targets | Mitigated by design: default to 44px and shrink only under `any-pointer-fine`, so a wrong answer costs a large button, never a small one |
| **A6** | **`--card` has ~111 consumer files.** My boundary-matched count over full utility names gives 121 for any `-card…` utility and 115 for `-card-border`; the 111 figure comes from `globals.css:193`. The two methods differ on overlap | What Phase 40 Left | Only affects sequencing estimates. **Re-measure with the exact utility list before quoting it in a plan** |
| **A7** | **The duplication percentages between component pairs** are computed as differing-lines over combined-lines — a ranking heuristic, not a statement about behaviour | Prior Art | Over- or under-states how easy a merge is. Read each pair before planning its merge |

---

## Open Questions

1. **Does a spine-first Wave 0 violate criterion 1's "never by global replacement"?** — **`OWNER`**
   *Known:* without it, 24 of 41 pages are one indivisible unit and the phase is a big bang. With it, 34 units, 31 of them single pages.
   *Unclear:* whether converting `MobileNav` + 13 motion/UI files in one wave reads as *"a global replacement"* or as *"one small surface everything else sits on."*
   *Recommendation:* frame it in discuss-phase as the first question, because every other plan's shape depends on the answer.

2. **Where are the tier boundaries?** — **`UI-SPEC`**
   *Known:* `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 are Tailwind's; the tree uses `sm` in 22 files, `lg` in 3, `md` in **none**; the two big tables switch at `lg` and four smaller ones at `sm`.
   *Unclear:* the boundaries themselves, and whether the 44 existing `sm:` uses are migrated or grandfathered.
   *Recommendation:* whichever is chosen, decide the migration explicitly. An unremarked second convention is how a system acquires a breakpoint nobody decided.

3. **What does RESP-04 actually require, given there is no menu?** — **`OWNER` / `UI-SPEC`**
   *Known:* nothing is behind a menu; navigation is a horizontally scrolling 8-tab strip at every width, and `MobileNav` is a bottom bar even at 1920px.
   *Unclear:* whether the criterion is satisfied by a strip that stops scrolling at tablet width, or requires a different navigation form (a rail, a sidebar).
   *Recommendation:* the second answer is what makes 49 `pb-24`s and the toast's hard-coded `5rem` offset come due; price it before choosing.

4. **Is a copy-out diagnostic grid an exception to DS-09?** — **`OWNER`**
   *Known:* `ReviewListClient.tsx` is the only sideways-scrolling table, and its own copy says it exists to be *"pasted into a diagnostic tool."* It also renders at `text-[11px]`, below the 14px floor.
   *Recommendation:* answer before writing G3, because a gate without an exemption list goes red on a correct file the first time it runs.

5. **Are the four legacy token names removed in this phase, or only emptied?** — **`OWNER`**
   *Known:* `globals.css:196` assigns *emptying* to Phase 41 and *permits* removal once empty. `border-card-border` alone is 406 occurrences and each must be triaged card-edge vs control-boundary.
   *Recommendation:* emptying is the requirement; removal is a bonus. Do not let removal become the schedule.

6. **Does the `any-pointer: coarse` trade-off suit the owner?** — **`OWNER`**
   *Known:* it is the only feature that satisfies criterion 5's *"large touch screens included"*. Its cost is that a mouse user on a touchscreen laptop also gets 44px targets.
   *Recommendation:* present the trade, do not bury it.

7. **Does the pinch-zoom block stay?** — **`OWNER`**
   *Known:* `layout.tsx:81-92` sets `userScalable: false`; `40-REVIEW.md` WR-16, reviewed and unfixed.
   *Unclear:* it is not one of the seven requirements.
   *Recommendation:* raise it once, in discuss-phase, because a phase about touchability that leaves zoom disabled has an awkward story — and then abide by the answer.

8. **Where does the toast sit relative to the top layer?** — planner's, but it must be decided somewhere
   *Known:* toasts are `z-[70]`, native dialogs are in the top layer above all `z-index`, and `useToast` currently has exactly one consumer, which is not a dialog. Latent today.
   *Recommendation:* decide it in the same plan that makes the dialog primitive native, or it becomes a silent invisible-notification bug.

---

## Sources

### Primary (HIGH confidence)

- **The tree itself**, at `4be22f1`, 2026-08-11. Every count, every `file:line` and every class string in this document was produced by running a command against it. `npm run build` exit 0; all seven `verify:*` npm scripts exit 0.
- `node_modules/tailwindcss/dist/lib.js` and `theme.css` (**4.2.1**) — pointer variants and default breakpoints/spacing extracted verbatim from the installed package, not from documentation.
- `node_modules/{react,next}/package.json` — React **19.2.3**, Next **16.1.6**.
- **react.dev — `useSyncExternalStore`** — the `getServerSnapshot` contract and its hydration requirement, quoted.
- **MDN — `<dialog>`** — `closedby` semantics, the `showModal()` default of `closerequest`, `::backdrop`, `autofocus` and initial-focus guidance.
- **MDN — `HTMLDialogElement.showModal()`** — top layer and inertness.
- **MDN — `@media/pointer` and `@media/any-pointer`** — the primary-vs-any distinction, quoted.
- **MDN — ARIA `table` role** — the `display`-override case, quoted.
- Project artifacts, read in full: `40-CONTEXT.md`, `40-UI-SPEC.md`, `40-VERIFICATION.md`, `40-REVIEW.md` (headings + the disposition table), `deferred-items.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`, `globals.css`, `scripts/verify-tokens.mjs`, `scripts/verify-media-strip.mjs`, `CLAUDE.md` and the `.claude/rules/` modules.

### Secondary (MEDIUM confidence)

- **Adrian Roselli, *Tables, CSS Display Properties, and ARIA*** and its 2022 follow-up — the browser matrix for table semantics under `display` overrides, with WebKit bug numbers 243474 and 257458. **Last substantive update December 2022; current is 2026.** See A1.
- CSS-Tricks' summary of Steve Faulkner's finding, used only to corroborate the above.

### Tertiary (LOW confidence — flagged, not relied on)

- The touch-target estimate (A4) — my own heuristic parser, not a rendered measurement.
- The staff-strip width estimate (A3) — arithmetic on label lengths.
- `any-pointer` hot-plug re-evaluation (A5) — training knowledge, unverified this session.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| Surface inventory & convertible units | **HIGH** | Computed from the import graph of the current tree; the spine-vs-no-spine comparison was run both ways |
| Pattern inventory | **HIGH** | Exact-string counts, reproduced from BSD `grep`; the identical/divergent split is a property of the strings, not a judgement |
| Dialogs | **HIGH** on the inventory and the seven identical shells; **MEDIUM** on background scroll lock (A2) | Shells read directly; scroll behaviour is documented nowhere I could reach and is deferred to H41-2 |
| Tables | **HIGH** on the inventory; **MEDIUM** on the a11y mechanism (A1) | Six of seven dual-renders read directly; the WebKit claim rests on a 2022 matrix |
| Responsive | **HIGH** on what exists (it is almost nothing, and that is easy to prove); **N/A** on the boundaries, which are `UI-SPEC`'s | |
| Touch targets | **HIGH** on the mechanism (extracted from the installed bundle); **MEDIUM** on the current-state figures (A4) | The variants are verbatim from Tailwind 4.2.1; the 118/174 count is a heuristic |
| Legacy tokens | **HIGH** on the counts and the removal discipline; **MEDIUM** on `--card`'s exact file count (A6) | The discipline is quoted from `verify-tokens.mjs:285-303` |
| Validation strategy | **MEDIUM** | The gates are proposals. Their real risk — G5 going red on correct files — is named rather than solved, because solving it needs the UI-SPEC's target size first |

**Research date:** 2026-08-11
**Valid until:** ~2026-09-10 for the browser-behaviour claims. **The tree
measurements are valid only until the next commit that touches `src/` —
re-measure before quoting any figure in a plan.**
