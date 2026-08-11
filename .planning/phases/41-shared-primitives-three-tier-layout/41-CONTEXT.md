# Phase 41: Shared Primitives & Three-Tier Layout - Context

**Gathered:** 2026-08-11
**Status:** Ready for UI-SPEC, then planning
**Source:** decided by the expert persona under explicit owner delegation
(*"puoi gestirle in autonomia"*), against `41-RESEARCH.md`. One decision —
D-41-02, the navigation form — was put to the owner with its cost priced and
returned as *"decidi tu"*. Every decision below is **contestable**: it is written
here so it can be argued with, which is the point of writing it down rather than
letting it form one commit at a time.

<domain>
## Phase Boundary

Recurring patterns stop being written N times and become one shared component
each; the product gains a responsive layer it does not currently have; and a
surface is shown only once it has been converted whole.

**In scope:** the shared spine (navigation, page shell, motion wrappers, icons,
skeletons, toasts), the primitives the research measured as genuinely recurring,
the three-tier layout, touch-target sizing, and the surface-by-surface
conversion those primitives make possible.

**Out of scope, and the roadmap already routes it:** the **scanner** and the
**door** are **Phase 42**, which takes colour, contrast and type only and does
not touch behaviour — `src/app/(admin)/**/scanner/**`, `src/components/scanner/**`
and `src/app/(admin)/door/**` are not opened by this phase for anything beyond a
read. The **production sections** are Phases 44 and 45 and will be built on top
of what this phase produces; nothing here is work for them, but the primitives
are what they inherit, so a set that only serves today's screens would be
re-opened twice.

**This phase invents very little.** `41-RESEARCH.md` measured that the dialog
primitive is already written **seven times, byte-identical**, on native
`<dialog>` + `showModal()`; that the bottom-sheet form exists **four times, also
byte-identical**; that six of seven tables already render cards on a phone; and
that `src/components/ui/Skeleton.tsx` **already exists and is correct**. The work
is extraction and adoption, not invention.

**What it does invent, from nothing:** the responsive layer. `md:` appears in
**zero** of 181 files, `xl:`/`2xl:` in zero, `lg:` in three. No container maximum
wider than `max-w-lg` exists anywhere, and **no JavaScript in the tree reads the
viewport at all** — zero `matchMedia`, zero `useSyncExternalStore`, zero
`innerWidth`. Nothing has to be un-decided first.

</domain>

<decisions>
## Implementation Decisions

### The shape of the phase

- **D-41-01: Wave 0 converts a shared spine first, and this does not violate
  criterion 1.** Read literally, *"a surface shows the pattern only once that
  whole surface has been converted"* plus transitive component sharing fuses
  **24 of the 41 pages into a single indivisible unit of 104 files** — a big bang,
  which is exactly what the criterion exists to prevent. Converting a **fourteen-file
  spine** first (navigation, motion wrappers, `Icons`, `Skeleton`, toasts,
  `FormatMarker`) breaks that unit into **34 units, 31 of them a single page, the
  largest six**.

  **Why this is not the "global replacement" the criterion forbids:** the
  criterion protects a *user* from meeting a half-converted surface. The spine
  has no surface of its own — it is what surfaces sit on. Converting it shows
  nobody a Frankenstein page. The prohibition is about what a person sees, not
  about how many files a commit touches.

- **D-41-02 (owner delegated, 2026-08-11): from tablet width up the navigation
  becomes a persistent side column; the bottom bar stays on the phone only.**
  The criterion's own words carry this — *"**work-surface** filters and
  navigation are visible without opening a menu from tablet width up"*. The work
  surfaces are the door, the bar and the ticketing: someone standing with a
  tablet at a table, or an organizer at a laptop working a guest list. A bottom
  bar still fixed at 1920px (`MobileNav.tsx:96`) is not a choice, it is a phone
  app stretched.

  **The cost is accepted and named:** 49 pages carrying a hand-written 96px of
  bottom clearance, and a toast whose offset hard-codes the same assumption a
  second time, all come due at once. They are **not a new cost** — they are debt
  the bottom bar is already producing. D-41-03 is how it gets paid.

- **D-41-03: the page shell owns the navigation clearance, and it is built
  early.** `pb-24` appears **47 times** as manual clearance for a fixed bottom
  nav, and `ToastContainer.tsx:26` hard-codes `calc(5rem + env(safe-area-inset-bottom) + 1rem)`
  independently. The moment D-41-02 moves navigation off the bottom, **49 pages
  carry 96px of dead space and every toast floats above nothing** — unless one
  primitive knows where the navigation is. That coupling, not tidiness, is why
  the page shell comes early in the order.

- **D-41-04: no primitive ships in a wave that does not also convert a surface
  onto it.** This repository has already failed at exactly this:
  `src/components/ui/Skeleton.tsx` exists, is correct, and has **zero
  importers**, while **102 hand-rolled `animate-pulse` blocks** live in 20 other
  files. Building the primitive was never the hard part of DS-07; adoption is.
  A plan that publishes a component and defers its first consumer is repeating a
  mistake the tree already records.

### The three tiers

- **D-41-05: the tier boundaries are Tailwind's defaults, and the 22 files
  already using `sm:` are migrated to the convention, not grandfathered.** An
  unremarked second convention is how a system acquires a breakpoint nobody
  decided. The exact boundary values and how many tiers actually get distinct
  treatment are the **UI-SPEC's** to fix; what is decided here is that there is
  **one** set and no exceptions carried forward silently.

- **D-41-06: content stops widening by a maximum owned by the page shell**, not
  by a `max-w-*` written per page. Today no container wider than `max-w-lg`
  exists anywhere, so every surface stretches edge to edge on a wide screen. The
  value is the **UI-SPEC's**.

### Touch

- **D-41-07: touch-target sizing keys off `any-pointer: coarse`, never off
  viewport width.** Criterion 5 says *"finger-sized wherever the input is a
  finger, **large touch screens included**"*, and that phrase rules out width:
  a tablet or a touch laptop is wide and still touched. **The trade is accepted
  and stated rather than buried:** someone using a mouse on a touchscreen laptop
  also gets finger-sized targets. The criterion already made this choice; this
  decision only records which mechanism implements it.

- **D-41-08: `userScalable: false` is removed** (`layout.tsx:81-92`, open as
  WR-16 in `40-REVIEW.md`). It is not one of the seven requirements, and it is
  being decided anyway: a phase about touchability that ships with pinch-zoom
  disabled has no defensible story, and the block is an accessibility finding
  already raised and not yet answered.

### What becomes a primitive, and what deliberately does not

- **D-41-09: the dialog primitive is extracted from the seven identical native
  `<dialog>` shells that already exist — an eighth is not built beside them.**
  Native `<dialog>` + `showModal()` supplies Escape, the focus trap and
  background inertness **by specification**, which is why the existing shells are
  right and a hand-rolled overlay would be a step backwards. The sheet form is
  the four byte-identical bottom-sheet panels. Two conventions are load-bearing
  and must survive the extraction verbatim, because a primitive that forgets them
  regresses every modal at once: **`z-[60]`** (because `MobileNav` is `z-50`) and
  **`pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))] sm:pb-6`**.

- **D-41-10: the input primitive closes an accessibility finding, and is not
  tidying.** All **75** form inputs carry `border border-card-border`;
  `--card-border` aliases `--line`, which `40-UI-SPEC.md:371-373` computes at
  **1.39:1** against WCAG 1.4.11's 3:1 for a control boundary. Phase 40's rule is
  explicit — *the boundary of an interactive control is never carried by `--line*`
  alone*. The same applies to secondary and ghost buttons, checkboxes and selects.

- **D-41-11: the empty state, the stat tile and the `<label>` do NOT become
  components.** The research measured them as marginal and the reasons differ:
  the empty state's copy changes per surface, so what is shared is a wrapper and
  not a component; the six analytics cards are 31–73 lines and already
  one-per-concept; and 99 labels written 90+ ways is a **styling convention**
  problem, not a missing primitive. Making a component of any of the three buys a
  file and no guarantee.

- **D-41-12: the divergent families get their decision before their extraction,
  not during it.** The card shell (**202 sites**, one axis of variation — the
  radius) and the page shell (**47 + 44 exact**) are mechanical substitutions
  once one value is fixed. The **pill button** (133 sites, **six** different `py-`
  values, of which `py-1.5 text-xs` computes to 28px) and the **section heading**
  (four axes across ~20 sites) are not: they need the **UI-SPEC** to name the
  sizes first. A pattern written 88 times identically is a rename; one written
  six ways is a decision.

### Tokens, inherited from Phase 40

- **D-41-13: the four legacy token names are emptied of consumers; removing them
  is a bonus and must never become the schedule.** `globals.css:196` assigns the
  emptying to this phase and permits removal once empty. `border-card-border`
  alone is **406 occurrences**, each needing triage between *card edge* and
  *control boundary* — and those are different tokens after D-41-10. A phase that
  chases the removal will do the triage badly to make the deadline.

- **D-41-14: a new token name goes into `KNOWN_TOKEN_NAMES` in
  `scripts/verify-tokens.mjs` in the same commit that declares it.** That list is
  the gate's only memory of which names have existed; a name declared but absent
  from it is invisible to check D, and a half-rename passes.

- **D-41-15: this phase is where `--font-display` starts rendering.** Orbitron is
  loaded and currently displays nothing, because no surface applies the display
  role yet — intended by Phase 40, and untrue after this one. The 52 `<h1>`
  elements across 38 files are where it lands.

### Tables

- **D-41-16: the copy-out diagnostic grid stays a table, exempt, and its
  exemption is written into the gate before the gate exists.**
  `ReviewListClient.tsx` is the only genuinely sideways-scrolling table and its
  own copy says it exists to be *pasted into a diagnostic tool* — cards would
  destroy the thing it is for. **An exemption discovered on a gate's first red run
  is an exemption nobody trusts, and that gate gets switched off.**

- **D-41-17: the six tables that already render cards are consolidated onto one
  breakpoint.** They disagree today — four at `sm`, two at `lg`. DS-09's real
  work is consolidation, not construction.

### Verification

- **D-41-18: `npm run verify` — one aggregate script — ships in this phase.**
  `40-REVIEW.md` WR-09 is open: there is no CI, and each of the ten existing
  gates runs only when a human types its name. This phase would take that to
  fourteen. **Four more gates nobody runs is not verification, it is four more
  files.** Cheapest high-value item here, and it closes a Phase 40 warning.

- **D-41-19: every new gate is assessed against both Phase 40 failure modes
  before it is committed** — can it go **green having measured nothing**
  (`refuse()` → exit 2 is the convention), and can it go **red on a correct
  file** (worse, because it gets switched off). **G5, the touch-target gate, is
  the dangerous one:** its estimate is a class-string heuristic that cannot see a
  flex stretch, an icon-set height or an ancestor's padding. It is scoped to
  converted files, exempts Phase 42 by path, and is **proven green on the hardest
  correct file in the tree before it is committed — or it is not written at all.**

- **D-41-20: no test framework, and no new packages.** There is no test runner
  for the product and installing one is a milestone-sized decision that appears
  in none of this phase's requirements. The research's legitimacy audit found
  nothing to vet: the platform and Tailwind 4.2.1 already carry every mechanism
  recommended.

### Added 2026-08-11, after the pattern map

- **D-41-21: the door keeps today's navigation layout, and Phase 42 decides when
  that changes.** `src/app/(admin)/admin/scanner/DoorSurface.tsx:4` imports
  `MobileNav`, and `src/app/(admin)/door/page.tsx` is a 25-line shell over it —
  both inside Phase 42's declared paths. The pattern map priced two ways to do
  the §8.2 rename and framed the choice as *which is the smaller lie*. **Neither
  is taken, because the rename is not the real question.**

  The real question is that **the door page mounts the navigation**, so making
  `AppNav` a side column above 768px would put a 224px column on a scanner
  screen — a tablet at an entrance losing that much width to navigation is a
  change to the door's surface, delivered by a phase whose scope fence says the
  door is Phase 42's.

  **Therefore:** `AppNav` is the new primitive carrying both tiers, and
  `src/components/layout/MobileNav.tsx` remains as a thin wrapper that renders
  `AppNav` **locked to its phone form**. The door's layout is byte-for-byte what
  it is today; **zero Phase 42 files are edited**; and the wrapper is not a
  rename dodge but the mechanism that holds the fence. Phase 42 deletes it when
  it converts the door and decides what the door should look like at tablet
  width — which is its decision, not this phase's.

  *(Consequence accepted: one file in the tree carries a name describing a tier
  the primitive no longer has. That is the smaller cost, and it is visible,
  which is why it is written here rather than discovered.)*

### Claude's Discretion

- The conversion order among the 34 units, once the spine exists.
- Component and file naming; where each primitive lives under `src/components/`.
- How the page shell expresses the nav clearance internally.
- The toast's relationship to the native top layer (`useToast` has exactly one
  consumer today and it is not a dialog, so this is latent — but it must be
  decided in the same plan that makes the dialog primitive native, or it becomes
  a silent invisible-notification bug).
- Whether the 14-file spine is one plan or two.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### This phase
- `.planning/phases/41-shared-primitives-three-tier-layout/41-RESEARCH.md` — the measured photograph: surface inventory and conversion units, the pattern table, the dialog and table inventories, the responsive baseline, touch-target measurements, and the eight open questions this document answers
- `.planning/phases/41-shared-primitives-three-tier-layout/41-VALIDATION.md` — G1–G5 and H41-1…H41-6, and which criteria no script will ever close

### Inherited from Phase 40
- `.planning/phases/40-brand-tokens-typography/40-UI-SPEC.md` — the visual contract; **§4.2 carries the control-boundary rule D-41-10 exists to satisfy**
- `.planning/phases/40-brand-tokens-typography/40-CONTEXT.md` — D-40-01…D-40-13, still binding
- `.planning/phases/40-brand-tokens-typography/40-REVIEW.md` — WR-09 (no aggregate gate) and WR-16 (pinch-zoom) are answered here; the rest remain open
- `src/app/globals.css` — the token layer this phase draws from
- `scripts/verify-tokens.mjs` — the gate model, and the `KNOWN_TOKEN_NAMES` discipline

### Project rules
- `CLAUDE.md` — the Expert Persona
- `.claude/rules/brand-visual-system.md` — palette, gradient, typography, the `re:sonate` spelling
- `.claude/rules/nextjs-architecture.md`
- `.claude/rules/meta-gates.md` — cross-domain impact, monotone guards, zero silent failures

</canonical_refs>

<specifics>
## Specific Ideas

- The dialog primitive's first consumer should be one of the seven existing
  `<dialog>` shells, not a new modal — the extraction is provably correct when
  the seventh copy disappears.
- The page shell and the navigation are one decision expressed in two files; a
  plan that separates them into different waves will discover the `pb-24`
  coupling the hard way.
- `TransactionList.tsx:83` defines its own local `LoadingSkeleton` while the real
  one sits unimported — a good first proof that adoption works.

</specifics>

<deferred>
## Deferred Ideas

- **Removing the four legacy token names entirely.** Permitted once empty, not
  required here — D-41-13.
- **The email palette** (`DI-40-01`): the product and its transactional emails
  now render two generations of the brand, and no gate can see it because a CSS
  token cannot reach an email client. Owner decision, deferred explicitly on
  2026-08-11.
- **The ticket page's cached venue** (`CR-02` in `40-REVIEW.md`):
  `/tickets/[id]` renders `venue_text` and its document rests in a runtime cache
  the `/events/*` `NetworkOnly` rule does not cover. Predates Phase 40. The third
  way — moving the address out of the cached HTML and loading it when the page
  opens online — is a small phase of its own, not a change to make here.
- **The twelve remaining `40-REVIEW.md` warnings** not answered by D-41-08 and
  D-41-18.
- Anything under `src/**/scanner/**`, `src/components/scanner/**` or
  `src/app/(admin)/door/**` — **Phase 42**.

</deferred>

---

*Phase: 41-shared-primitives-three-tier-layout*
*Context decided 2026-08-11 by the expert persona under owner delegation; D-41-02 explicitly delegated after being priced.*
