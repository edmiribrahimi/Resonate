# Phase 40: Brand Tokens & Typography - Context

**Gathered:** 2026-08-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Colour, surface, line and type stop being decided page by page and resolve to one
token set — and a release lands whole on a device instead of half-applied.

**In scope:** the token layer itself (`globals.css` and whatever declares it), the
three typography roles, the brand's spelling on titles and the installed app
name, and the mechanism by which a new release replaces the old styles.

**Out of scope — and the roadmap already routes it:** *layouts and components*
are **Phase 41** (*"a recurring pattern is one shared component … adopted one
whole surface at a time"*), and the *scanner* is **Phase 42**, which takes colour,
contrast and type only and does not touch behaviour. This phase does not convert
73 files of default Tailwind colour; it establishes the layer those conversions
will draw from.

**Added 2026-08-11, after this context was first written:** the artifact's
*content* also comes into the product — the calendar in **Phase 44**, each
production section under its own entitlement in **Phase 45** (PROD-01, PROD-02,
promoted out of Future Requirements once Phases 32 and 36 shipped). Those are the
largest set of new surfaces in the project, and they will be built **on top of
this phase's token layer**. So the tokens are not chosen for today's screens
alone: a set that only serves the surfaces that exist now would be re-opened
twice. Nothing in Phase 44 or 45 is work for this phase — but the token set is
what they inherit.

**This phase invents no design system.** `36-VISUAL-SOURCE.md` distilled one from
the production tracker on 2026-08-10 and its conclusion stands: *"non c'e' niente
da inventare: c'e' da **adottare**."*

</domain>

<decisions>
## Implementation Decisions

### The source of truth

- **D-40-01 (owner, 2026-08-11): the colours are the artifact's colours, and the
  layouts are the artifact's layouts.** Stated as *«i colori e i layout devono
  essere gli stessi dell'artifact produzione»*. This settles the question that
  would otherwise have been re-litigated per surface: the product adopts the
  production tracker's token set as declared in `36-VISUAL-SOURCE.md`, and does
  not maintain a second palette of its own.

- **D-40-02: the layout half of D-40-01 binds Phase 41, not this phase**, and is
  recorded here so it is not lost between the two. Phase 41's criterion 1 already
  says a surface converts *whole* or not at all; D-40-01 tells it *what* it is
  converting toward. **This phase's job is to make that possible** — a token set
  shaped so Phase 41 can land the artifact's layouts without redefining colour.

- **D-40-03: structure crosses, content never does.** `36-VISUAL-SOURCE.md:160-163`
  is explicit that the artifact's mockups carry **venue names, line-ups with
  proper names and dates**, that none of it was copied into `.planning/`, and that
  none of it may be. "The same layouts" means the same **construction** — the chip
  row, the underline, the card — never the same **content**. `.planning/` is
  published (Guardrail 5).

### The token set

- **D-40-04: `--accent: #e5484d` does not survive.** It is a red that appears in
  neither the brand palette nor the semantic set (`crit` is `#FF6B8E`), and it is
  already a token consumed by **101 `.tsx` files** — so retargeting its value is
  one line and reaches all of them. That is the cheap half of DS-01. The expensive
  half is the **73 files using default Tailwind colours**, and those belong to
  Phase 41's surface-by-surface conversion, not here.

- **D-40-05: the interactive accent and a format's identification colour are two
  tokens, even where they hold the same value.** `brand-visual-system.md` names
  `#FF5C93` *rosa caldo — accento primario*; `36-VISUAL-SOURCE.md:71` names the
  same `#FF5C93` as **MotionLab's** identification colour. They collide today.
  Declaring one token and pointing both at it would make DS-02 unenforceable — a
  pink button would be indistinguishable from a format mark. **Two tokens, one
  value, and the coincidence written down**, so separating them later is a value
  change and not a refactor. *(Engineering disposition only — see Open Questions
  for the brand half, which is not mine to decide.)*

- **D-40-06: `--soy` (`#8C82A6`) does not enter the product's token set.**
  `36-VISUAL-SOURCE.md:74-77` says its meaning could not be determined from the
  stylesheet alone and **must be asked, not deduced**. Nothing in this phase needs
  it. Adopting a token whose meaning nobody can state is how a palette acquires a
  colour that means whatever the next reader assumes. It stays out until answered.

- **D-40-07: no light theme, and that is not a gap to fill.**
  `36-VISUAL-SOURCE.md:108-112` records it as a declared choice —
  *«commit deliberato al mondo notturno»* — with `color-scheme: dark` held even
  under `[data-theme="light"]`. A plan that "adds the missing light mode" is
  undoing a decision, not completing one.

### Typography — three roles, and the product already argued for them

- **D-40-08: display = Orbitron, interface = Inter, data = mono.** Not invented:
  each already exists in this codebase or in the artifact's stylesheet.
  - `src/app/(public)/events/[slug]/menu/page.tsx:19-21` already escapes Orbitron
    for **Inter**, with the reason written beside it: *"neutral, highly readable in
    low-light venues"* — and it names Orbitron *"its display font"* in the same
    comment. Low-light venues are the door's world.
  - `36-VISUAL-SOURCE.md:96-106` declares **mono** for labels, sigle, times and
    numbers, **sans** for prose and titles, and `font-variant-numeric:
    tabular-nums` **everywhere**.

- **D-40-09: the defect is that the display face is doing prose duty.**
  `globals.css:31` sets `body { font-family: var(--font-orbitron) … }` — the whole
  product renders prose in a geometric display face, which is why the menu page
  had to escape it locally. Phase 40 inverts the default: prose gets the interface
  face, display is applied **by role**, and the menu's local override becomes
  unnecessary rather than being multiplied.

- **D-40-10: `Avenir Next` is substituted, and the substitution is declared.**
  `36-VISUAL-SOURCE.md:101` names *Avenir Next / Helvetica Neue / system-ui* for
  sans. Avenir Next is an Apple system face — available on the machine the
  internal tool runs on, not on a web product's visitors. **Inter is the
  substitution**, it is already a dependency, and it was already chosen once in
  this repo for the right reason. Written down rather than silently swapped, so
  nobody later "restores" a face that was never reachable.

### DS-10 — how a release lands, and why it collides with the door

- **D-40-11: nothing in this phase may reload a page by itself.** This is the
  cross-domain finding, and it is the reason DS-10 is a decision rather than a
  configuration. `next.config.ts:12` sets `reloadOnOnline: false` **deliberately**;
  `sw.ts` runs `skipWaiting: true` + `clientsClaim: true`, so a **new worker takes
  control of an already-open page immediately**. A page can therefore be
  controlled by the new worker while still holding the old document.
  A platform-initiated reload during a scan at the entrance is exactly what
  `checkin-offline.md` and Phases 38 and 39 were built to prevent — *refusing a
  valid guest is worse than admitting a duplicate, because the first error happens
  in front of a queue.* **DS-10 is satisfied by making a mixture impossible or
  visible, never by reloading.**

- **D-40-12: the token layer must be self-consistent per document, not per
  request.** `sw.ts:101-104` already records that `skipWaiting`/`clientsClaim`
  *"update the WORKER on the next visit; they do not empty the buckets the old
  worker filled"*. So the failure DS-10 names is a **document holding one
  generation of styles while fetching another**. The fix belongs at the layer
  where a single file carries the whole token set, so that a document either has
  the old set or the new one and never half of each. How — a versioned token
  stylesheet, a precache ordering rule, or something the research finds — is the
  planner's, subject to D-40-11.

- **D-40-13 (settled 2026-08-11, after research, on the owner's delegation): the
  mechanism for D-40-12 is a purge of the document caches on service-worker
  `activate`, together with turning `cacheOnNavigation` off.** Research replaced
  the assumed failure with the measured one. Next already refuses to stitch an
  old document to new chunks on a navigation (`fetch-server-response.js:142-144`)
  and rejects a stale prefetch rather than navigating — so the "half-applied
  page" cannot be produced by a link, and **no mechanism should be built for
  it**. The real hole is narrower: `Serwist.handleActivate` deletes every
  precache entry absent from the new manifest, CSS filenames are content hashes,
  and the cached *documents* naming the deleted stylesheet survive. An `activate`
  listener fires only on a release, so the release boundary is already an event —
  no version bookkeeping to invent, nothing reloads (D-40-11 satisfied by
  construction), and the door's IndexedDB queue is a different storage API and is
  untouched.

  `cacheOnNavigation: true` (`next.config.ts:7`) goes with it: it writes
  documents straight into the `pages` bucket and **never refreshes what it
  wrote** — the second route to the same defect. It is not the library default
  and, unlike its neighbour, carries no written reason.

  **`deploymentId` is refused, and recorded so it is not re-proposed:** it
  appends `?dpl=` to CSS chunk URLs too, which Serwist's precache does not strip
  — every asset would miss the precache, i.e. no JavaScript at the door with the
  radio off. **Inlining `:root` into the document is also refused:** the
  utilities stay external, so an orphaned document would have tokens and no rule
  to consume them.

  **The accepted cost, stated plainly:** after a release, the first open of any
  page on a device must be online. For `/door` the runbook already requires an
  online open on that phone that evening — this makes an existing step
  load-bearing in one more situation. It applies the trade already decided on
  2026-08-11 (`checkin-offline.md:59`) in the direction it was decided.

### Claude's Discretion

- ~~The exact mechanism for D-40-12 within Serwist's existing structure.~~
  **Settled 2026-08-11 — see D-40-13.** No longer discretionary.
- Whether the token set lives in `globals.css`, a dedicated file, or a
  `@theme` block — as long as one file is the thing a person edits.
- The naming scheme for the tokens, provided the artifact's **roles**
  (ground / surface / raised / sunk / ink / ink-2 / muted / faint / line*) survive
  the rename recognisably.
- Which of the 73 default-Tailwind files, if any, need touching to prove the layer
  works. **The default is: as few as possible.** Converting surfaces is Phase 41.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The design system this phase adopts
- `.planning/phases/36-formats-series-numbering/36-VISUAL-SOURCE.md` — **the single
  most important input.** The token set, the sunset scale, the per-format
  identification colours, the semantic set held separate, the SunSet-exclusive
  gradient, interface typography, the dark-only theme, the wordmark rule, and
  `## Cosa NON attraversa` — the list of material-only rules that must **not** be
  translated into an interface.
- `.planning/phases/36-formats-series-numbering/36-UI-SPEC.md` — the chip row and
  its adopted construction

### Phase scope and its neighbours
- `.planning/ROADMAP.md` §"Phase 40" — goal and five criteria; §"Phase 41" and
  §"Phase 42", which own layouts and the scanner respectively
- `.planning/REQUIREMENTS.md:119-128` — DS-01, DS-02, DS-03, DS-05, DS-06, DS-10 verbatim

### Code this phase changes or is constrained by
- `src/app/globals.css` — `:root` and `@theme inline`; today's seven values, none
  of them the brand's; `body` bound to the display face at `:31`
- `src/app/layout.tsx` — the font import, and the metadata titles, which already
  carry `re:sonate` with a normal e in all four places (DS-06's product half is
  done; the `ɘ` present at `:16` is **inside a comment explaining the rule**)
- `public/manifest.json` — `"name": "Resonate"`, `"short_name": "Resonate"` — the
  installed app name, which DS-06 also covers
- `src/app/(public)/events/[slug]/menu/page.tsx:19-21` — the existing escape from
  the display face, with its reason
- `src/app/(admin)/admin/formats/ColorSwatchPicker.tsx` — the **only** file in the
  product carrying the brand palette today
- `src/app/sw.ts` (precache, `skipWaiting`, `clientsClaim`) and `next.config.ts:12`
  (`reloadOnOnline: false`) — DS-10's whole surface

### Domain gates
- `.claude/rules/brand-visual-system.md` — **manual consultation, no `paths:`.**
  The palette, the exclusivity of the sunset gradient, the CamelCase format names,
  and the rule that `re:sonate` is written with a normal e everywhere outside the
  logo artwork
- `.claude/rules/checkin-offline.md` — the asymmetry that forbids a
  platform-initiated reload, and the warm-up gate a new style generation interacts with
- `.claude/rules/nextjs-architecture.md` — the service-worker gate and the
  dark-venue accessibility gate
- `.claude/rules/meta-gates.md` — cross-domain impact, monotone guards, and the
  zero-silent-failure control in a repo with no error tracking

</canonical_refs>

<code_context>
## Existing Code Insights

### Measured on this tree, 2026-08-11

| | |
|---|---|
| values declared in `globals.css` | 7, **none** from the brand palette |
| files carrying a brand hex | **1** — `ColorSwatchPicker.tsx` |
| `.tsx` files using default Tailwind colours | **74 of 181** |
| `.tsx` files consuming the `accent` token | **101** |
| typefaces loaded | **1** (Orbitron), plus **Inter** scoped to one page |

The two numbers that shape the phase are **101** and **74**.

*(This table first read **73**. Neither figure was wrong: the narrower grep behind
73 covered `bg|text|border` over eleven palette names; `40-UI-SPEC.md:104`
publishes the wider one — it adds `ring|from|to|via|fill|stroke|shadow|outline|
decoration` and the full palette list — and reports **74**. The wider command is
the one to trust because it is the one written down. Corrected here rather than
left to disagree with the document that will be read next.)* The first is already
tokenised — one value change reaches all of it. The second is not, and it is
Phase 41's work, one whole surface at a time.

### Reusable assets
- **The `@theme inline` block already exists** (`globals.css:13`). Tailwind 4's
  CSS-first configuration is in place; this phase changes what it declares, not
  how it is declared.
- **`ColorSwatchPicker.tsx`** already carries the six brand hexes — a working
  precedent for where they came from, and the one place they must stop being a
  local literal.
- **Inter is already a dependency**, already chosen for low-light legibility.

### Established patterns
- **A reversed decision is written down, not deleted** — applied throughout
  `STATE.md` and the route-group docblocks. D-40-04 and D-40-09 follow it.
- **`sw.ts` docblocks record what a rule does *not* do** — the pattern to extend
  when D-40-12's mechanism lands.

### Integration points
- `globals.css` → every surface. This is the only file in the phase whose blast
  radius is the whole product.
- `layout.tsx` → the font variables → `globals.css`'s `body` rule.
- `sw.ts` precache → whether a document and its styles come from the same
  generation. This is DS-10, and it is the same mechanism Phase 39 measured.

</code_context>

<specifics>
## Specific Ideas

- The owner wants **one visual system, not two**: the product looks like the
  production tracker, colour and layout both. The tracker is not a moodboard — it
  is a running tool the owner uses daily, so "the same" means adopting something
  already proven rather than approximating a picture.

</specifics>

<open_questions>
## Open Questions — for the owner, not for a planner

Neither of these blocks planning. Both would change a value, not a structure.

- **The primary accent and MotionLab share `#FF5C93`.** `brand-visual-system.md`
  calls it *accento primario*; `36-VISUAL-SOURCE.md:71` calls it MotionLab's
  identification colour. D-40-05 keeps them as two tokens so the collision is
  reversible in one line, but **which colour the interface's primary action
  should be is a brand decision**, and `brand-visual-system.md` is explicit that
  inventing one means *scrivere il brand al posto di chi lo possiede*. Raised, not
  decided.

- **`--soy` `#8C82A6` — what is it for?** `36-VISUAL-SOURCE.md:74-77` could not
  determine it and refused to deduce it. D-40-06 leaves it out. If it has a
  meaning, it is one line to add.

</open_questions>

<deferred>
## Deferred Ideas

- **Converting the 73 default-Tailwind surfaces** — Phase 41, one whole surface at
  a time, which is that phase's criterion 1.
- **The scanner's colour and contrast** — Phase 42, which also depends on Phase 39
  having been used at a real night.
- **A light theme** — refused rather than deferred (D-40-07). Recorded so a future
  tidy-up phase does not read its absence as an omission.
- **The material palettes of RamaDub and MotionLab** — still to be designed, and
  the identification colour is **not** that palette and does not anticipate it
  (`36-VISUAL-SOURCE.md:174-175`). Nothing in the product may imply otherwise.

</deferred>

---

*Phase: 40-brand-tokens-typography*
*Context gathered: 2026-08-11*
