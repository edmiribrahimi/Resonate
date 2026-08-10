---
phase: 36
slug: formats-series-numbering
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-10
sources:
  - 36-CONTEXT.md (16 locked decisions)
  - 36-VISUAL-SOURCE.md (design system, distilled from the production tracker)
  - .planning/REQUIREMENTS.md:95-100 (FMT-01 … FMT-06)
  - src/app/globals.css (the tokens actually shipping today)
---

# Phase 36 — UI Design Contract

> Visual and interaction contract for the format axis: the public filter row, the
> format marker on cards and on the night detail, the format/series/number fields
> on the work surfaces, and the catalogue surface itself.
>
> Nothing here is invented. The token set comes from `globals.css` (shipping) and
> the format identification colours come from `36-VISUAL-SOURCE.md` (already
> committed publicly in `.claude/rules/brand-visual-system.md`). Every contrast
> ratio in this document was **measured**, not assumed.

---

## 0. The four rules that outrank everything below

These are not style preferences. Each one has a consequence that cannot be undone.

1. **No count, anywhere, on any public surface.** Not on a chip, not in a
   heading, not in an empty state, not in an `aria-label`, not in a `title`
   attribute. A count is the one channel that reveals an unannounced night
   *without showing anything*, so no visual inspection of the page can catch it
   (D-36-14, FMT-06). The production tracker's own chips carry counts — **that
   part does not cross over.** Same component, opposite rule, because the
   audience changed.

2. **The chip row never varies with the data.** Chips are built from the
   catalogue, always the same set, in the same order, for anonymous visitors and
   for staff alike (D-36-13, D-36-16). A chip is never disabled, dimmed,
   reordered or hidden because a format happens to have no visible nights —
   *that is a count with one bit of resolution*, and it leaks the same fact.

3. **Format names render literally, with no CSS transform.** `re:sonate` keeps
   its lowercase `re:`; `SunSet`, `RamaDub`, `MotionLab` keep their CamelCase.
   **`text-transform` is `none` on every element that renders a format or series
   name.** The adjacent Upcoming/Past tabs in `EventTabs.tsx:197` and `:207` use
   `uppercase tracking-widest` — copying those classes onto a format chip breaks
   the brand in a way that ships to every visitor.

   **Enforced, not merely stated — added 2026-08-10 after the UI check.**
   `text-transform` is an **inherited** property, so "we did not add `uppercase`"
   is not a guarantee: it holds only until `FormatMarker` is mounted inside an
   ancestor that applies it — an admin table with an uppercase header is the
   obvious one, and this phase adds an admin surface (S5). The element that
   renders the name therefore carries **`normal-case` explicitly**, on the
   component itself, so the invariant survives its own context instead of
   depending on every future parent.

   This is DS-06 (`re:sonate` written with a normal e everywhere outside the
   logo) and it is the one rule in this spec whose violation is **published to
   every visitor at once**. A rule that can only be kept by remembering it is
   not kept.

4. **Colour is never the only channel.** Every format marker carries its **name
   as text**. The swatch is redundant decoration. Active state is carried by
   `aria-current`, background and ink — never by hue alone.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — no `components.json`, no shadcn, no component library |
| Preset | not applicable |
| Component library | none — hand-written components under `src/components/` |
| Styling | Tailwind CSS v4, CSS-first config in `src/app/globals.css` (there is no `tailwind.config.*`) |
| Icon library | local — `src/components/ui/Icons.tsx` (`MapPinIcon`, `LockClosedIcon`, `CalendarIcon`, `ClockIcon`) |
| Font | `Orbitron` via `next/font/google`, exposed as `--font-orbitron`, applied to `body`. One family, no second face. |
| Theme | dark only — `html { color-scheme: dark }`. No light theme, by declared choice. |

### The token divergence, stated so nobody resolves it by accident

`36-VISUAL-SOURCE.md` describes the production tracker's token set — ground
`#0A0712`, surface `#140D20`, an ink ramp, mono + Avenir Next. **The product
ships a different set today** (`globals.css`: background `#0a0a0a`, card
`#141414`, border `#262626`, foreground `#ededed`, muted `#a1a1aa`, accent
`#e5484d`, Orbitron everywhere).

Reconciling those two sets is **Phase 40** (DS-01…DS-10), and `36-CONTEXT.md`
puts it explicitly out of this phase's boundary. So:

- **This phase adds no global token, no CSS variable, no font.** It composes
  from what `globals.css` already exports.
- **The format identification colour is data, not a token** (D-36-11, D-36-12).
  It arrives as a hex string on a catalogue row and is applied through an
  **inline `style`** — which is also the only thing that can work, since Tailwind
  cannot generate a class from a runtime value. Changing a colour must not
  require a deploy, and this is what makes that true.
- **`tabular-nums` is applied** to every rendered number (the series number
  field and its suggestion). It is a font feature request: if Orbitron does not
  carry the feature, nothing changes and nothing breaks.
- **`--soy`**, the fifth token in the tracker's stylesheet, is **not used**.
  `36-VISUAL-SOURCE.md` records that its meaning could not be determined and
  must be asked before use. This phase does not deduce it. See *Open Questions*.

---

## Spacing Scale

Tailwind's default 4px scale. Every value used in this phase is a multiple of 4.

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| xs | 4px | `gap-1` — inside a marker, between swatch and glyph |
| sm | 8px | `gap-2` — swatch to label inside a chip; chip-row vertical rhythm |
| md | 16px | `gap-4` — between chips in the filter row; `p-4` party card (existing) |
| lg | 24px | `px-6` page gutter (existing); `p-6` catalogue modal (existing) |
| xl | 32px | not used |
| 2xl | 48px | not used |
| 3xl | 64px | not used |

**Additional values already in the surfaces this phase edits, all multiples of 4:**
`p-5` (20px, event card), `mb-2`/`mb-3` (8/12px), `min-h-11` (44px).

**Exceptions: none.** 44px minimum touch height on chips and tab links is
`4 × 11`, so it sits inside the scale rather than beside it.

---

## Typography

One family (`Orbitron`), four roles, **two weights**. Line heights are Tailwind's
computed defaults for each size, written out so no one has to look them up.

| Role | Class | Size | Weight | Line Height |
|------|-------|------|--------|-------------|
| Display | `text-3xl` | 30px | 700 | 36px (1.2) |
| Heading | `text-base` | 16px | 600 | 24px (1.5) |
| Body | `text-sm` | 14px | 400 | 20px (1.43) |
| Label | `text-xs` | 12px | 600 | 16px (1.33) |

**Weights this phase may introduce: 400 (regular) and 600 (semibold), nothing
else.** The 700 in Display belongs to the existing page `h1`
(`events/page.tsx:145`), which this phase does not touch — recorded so the
inventory is honest, not as a licence to add more 700.

**Format markers use the Label role** — 12px / 600 / `tracking-wide` —
**without `uppercase`**. See rule 3 in §0. `tracking-widest` is also barred on
format names: at 12px it pulls `re:sonate` apart at the colon.

---

## Color

### The base contract

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#0a0a0a` `--background` | Page ground, chip ground when a chip is off |
| Secondary (30%) | `#141414` `--card` + `#262626` `--card-border` | Event cards, party cards, catalogue rows, chip ground when a chip is on |
| Accent (10%) | `#e5484d` `--accent` | see the reserved-for list below |
| Destructive | `#ef4444` at `/10` fill, `#f87171` text (`red-500/10` + `red-400`, the pattern already in `CreateVenueModal.tsx:169-171`) | The retire confirmation and its error box, nothing else |

**Accent `#e5484d` is reserved for, and only for:**
the active Upcoming/Past tab label and its 2px underline · the lineup pills on an
event card · the venue link on the night detail · the focus ring
(`focus:ring-accent/50`) · the primary button fill on the catalogue surface.

**Accent is NOT used for:** any format marker, any chip swatch, any chip border,
any chip active state. That is the whole of DS-02 in one sentence — the
interaction accent and the identification colours are two separate channels, and
the moment one borrows the other, a format stops being identifiable.

### The format identification channel

A separate axis. Values come from the catalogue row, never from a constant in a
component (D-36-12, FMT-05). Seeds, already public in
`.claude/rules/brand-visual-system.md`:

| Format | Hex | Contrast vs `#0a0a0a` | vs `#141414` |
|---|---|---|---|
| SunSet | `#FFB25E` | 11.11:1 | 10.34:1 |
| RamaDub | `#FF7A2F` | 7.61:1 | 7.09:1 |
| MotionLab | `#FF5C93` | 6.79:1 | 6.32:1 |
| re:sonate | `#A874E8` | 5.97:1 | 5.55:1 |

Measured 2026-08-10 with the WCAG 2.x relative-luminance formula. **All four
clear 4.5:1 against both grounds**, so they are safe even used as text, and
comfortably clear the 3:1 that WCAG 1.4.11 asks of a meaningful graphical object.

**Measured and acted on — the off-state swatch does not meet 3:1.** At the
tracker's `opacity: .4` over `#141414` the composited swatches land at 1.83–2.63:1.
This is **accepted, not fixed**, because the swatch is redundant: the chip
carries the format name as text and its state as `aria-current`. Recording the
number here so that the next person does not "discover" it and raise the opacity
— raising it would weaken the off/on distinction, which *is* load-bearing.

**The composition ground, recorded so the figure stays checkable — added
2026-08-10 after the UI check.** The range above is composited over **`#141414`**
(`--card`). An independent recomputation over `#0a0a0a` (`--background`, which is
what an *unselected* chip actually sits on, per the anatomy table) gives
**1.85–2.64:1**. Both fail 3:1, so the decision is unchanged — but the two
grounds give two slightly different numbers, and without naming which one was
used the figure cannot be reproduced. **Whoever re-measures: state the ground.**

### The palette offered by the catalogue colour picker

Six flat colours. Drawn from the sunset scale already committed publicly.

| Choice | Hex | vs `#141414` | Status |
|---|---|---|---|
| Amber | `#FFB25E` | 10.34:1 | offered |
| Orange | `#FF7A2F` | 7.09:1 | offered |
| Pink | `#FF5C93` | 6.32:1 | offered |
| Pink soft | `#F6B6D2` | 11.00:1 | offered |
| Violet | `#A874E8` | 5.55:1 | offered |
| **Neutral grey** | `#8C82A6` | 5.14:1 | offered — this is the *deliberate neutral* D-36-11 requires |
| ~~Violet deep~~ | ~~`#5B2A9E`~~ | **1.99:1** | **excluded — measured, fails 3:1 on this ground** |

**The sunset gradient is not in the picker, and the picker cannot express a
gradient.** `linear-gradient(94deg, #FFB25E, #FF7A2F, #FF5C93, #A874E8)` is
SunSet's exclusive signature (`brand-visual-system.md`, gate *il colore non si
eredita*). Rather than validate against it, the surface offers **flat swatches
only** — so there is no input through which another format could take it. A
constraint that cannot be expressed cannot be violated.

**Uniqueness:** a colour already held by another **active** format is shown
`aria-disabled` and labelled `used by {Name}`. Retiring a format releases its
colour. Six choices against four formats is deliberate slack; when it runs out,
extending the palette is a decision, not a workaround.

### The two collisions on this page, and how each is resolved

- **`Draft` badge (`yellow-400` on `yellow-500/20`, `EventTabs.tsx:77-79`) beside
  a SunSet amber `#FFB25E` marker** — both warm yellows, adjacent on a staff
  card. Resolved by **shape and content, not hue**: the Draft badge is a *filled
  pill with text and no swatch*; a format marker is a *square swatch plus a name,
  with no fill*. They are never confusable as objects even when the hues are.
- **Accent `#e5484d` beside MotionLab `#FF5C93`** — a red and a pink. Resolved by
  the reserved-for list above: accent never appears in the format channel, and
  format colours never appear on a lineup pill or a link, so the two never sit in
  the same role.

---

## Surfaces

### S1 — `/events`, the public list (`page.tsx` + `EventTabs.tsx`)

**Layout, top to bottom:**

```
  h1 "Events"                                   (existing, px-6 pt-12 pb-6)
  ── format filter row ──                       (NEW, px-6, mb-4)
  ── Upcoming | Past tabs ──                    (existing, px-6, border-b)
  ── swipeable two-panel list ──                (existing)
```

The filter row sits **above** the tab row and **outside** the swipeable
container. That placement is the semantics: the format filter applies to both
halves of the time axis, the tab picks which half. Putting it inside the swipe
container would translate it with the panels.

**Focal point, stated rather than inferred — added 2026-08-10 after the UI
check.** The visual anchor of this screen is **the event list itself**, not the
controls above it. The h1, the filter row and the tab row form one quiet header
block: they are navigation, and they read as navigation — 12px labels, no fill
except on the selected chip, no colour except the swatches. **A visitor who
never touches a filter must lose nothing**, which is why the default state is
*every format shown* and no chip is pre-selected.

The consequence for whoever implements it: **the filter row must not grow to
compete with the list.** It stays one line that scrolls horizontally rather than
wrapping to two, its chips do not gain icons, and it acquires no heading of its
own. Four chips plus "All" is the design load; if the catalogue ever holds
enough formats that the row wants a second line, that is a signal to revisit
this surface — not to let it wrap.

**The filter row**

- A horizontally scrollable, non-wrapping row: `flex gap-4 overflow-x-auto`,
  bled to the gutter with `-mx-6 px-6` so a partially visible chip at the edge
  signals that the row scrolls. Scrollbar hidden.
- On mount, the current chip is scrolled into view (`scroll-margin-inline: 24px`).
- **Chip order:** `All` first, then one chip per **active** catalogue format in
  the catalogue's own order. Retired formats get **no chip** (see the disclosure
  matrix).
- **Exactly one chip is current at a time.** The filter is single-select —
  `?format=` holds one slug.

**Chip anatomy and states**

| | Off | On |
|---|---|---|
| Element | `<Link>` | `<Link>` with `aria-current="true"` |
| Shape | `rounded-full border min-h-11 px-4 inline-flex items-center gap-2` | same |
| Ground | transparent (page `#0a0a0a` shows through) | `bg-card` `#141414` |
| Border | `border-card-border` `#262626` | `border-card-border`, overridden inline with `color-mix(in srgb, {hex} 45%, transparent)` |
| Ink | `text-muted` `#a1a1aa` | `text-foreground` `#ededed` |
| Swatch | 8px square, `rounded-[2px]`, inline `background`, `opacity .4` | same square, `opacity 1` |
| Label | format name, 12px/600, **no `uppercase`** | same |

The `All` chip has **no swatch** — it is not a format, and giving it one would
imply a colour it does not have. Its on-state is carried entirely by ground and
ink, so no colour channel is involved at all.

The inline `borderColor` degrades safely: the `border-card-border` class stays on
the element, so if `color-mix` is unsupported the declaration is dropped and the
neutral border remains. There is no state in which the chip loses its border.

**Why `<Link>` and `aria-current`, and not `<button>` and `aria-pressed`**

`36-VISUAL-SOURCE.md` records the tracker's chips as buttons carrying
`aria-pressed`. **The visual is adopted unchanged; the element is not**, and the
reason is that the interaction underneath is different:

- The tracker's filter is a client-side multi-select on an internal tool.
- FMT-04 asks for a filter that *survives navigation and can be shared as a
  link*, and D-36-15 puts it in the address. That makes it a **navigation**, not
  a toggle — so it wants an anchor, which works without JavaScript, can be
  opened in a new tab, and can be copied from the context menu.
- `aria-pressed` is only valid on `role="button"`. On an anchor the correct
  attribute is `aria-current`.

There is no `aria-pressed` anywhere in `src/` today, so nothing is being made
inconsistent. If strict parity with the tracker is ever wanted, the alternative
is buttons plus `router.replace` — and it costs no-JS operation, which is why it
was not chosen.

**The URL contract**

| Axis | Param | Default (omitted) | Navigation |
|---|---|---|---|
| Format | `?format=<slug>` | no filter | `<Link>` — pushes. Choosing a format is a deliberate act worth a history entry, and Back returns to the previous filter. |
| Time | `?tab=past` | `upcoming` | `<Link replace>` — replaces. A view toggle is not a destination, and the swipe gesture would otherwise flood the history stack. |

- **Each control preserves the other axis's parameter.** Picking a format must
  not silently return a visitor to Upcoming.
- Canonical bare address is `/events`. Defaults are never written into the URL.
- **An unrecognised `format` value means no filter** — not an empty list, not an
  error, not a redirect (`36-CONTEXT.md` `<deferred>`, third reviewed todo).
  The `All` chip is current and the full list renders. Same for an unrecognised
  `tab`, which means `upcoming`.
  **No redirect, deliberately:** if unknown slugs redirected and known ones did
  not, the redirect itself would answer "is this a real format?" one probe at a
  time. Uniform behaviour gives no oracle.
- **A retired format's slug is treated as unrecognised**, so a link to it cannot
  keep working in public.
- The swipe gesture in `EventTabs.tsx:127-177` is preserved. At the end of the
  gesture it performs `router.replace(..., { scroll: false })` instead of
  `setActiveTab`. Both lists remain client-side props, so the swipe does not wait
  on a fetch.

**The four states of the list**

| State | Heading | Body |
|---|---|---|
| Upcoming, no filter, empty | `No upcoming events` | `Check back soon.` |
| Upcoming, filtered, empty | `Nothing announced for {Format}` | `Show all events` — a link clearing `?format=` |
| Past, no filter, empty | `No past events yet` | — |
| Past, filtered, empty | `No past events for {Format}` | `Show all events` — a link clearing `?format=` |

**`Nothing announced` is chosen word by word.** It states what is true — nothing
has been *announced* — without asserting anything about what exists. It is the
**same string for every format**, so it carries no information about which
formats have hidden nights.

**And the string is computed from the rendered list, never from a second query.**
The empty state is `filteredEvents.length === 0` on the array already on screen.
A separate "does this format have anything?" query is exactly the shape that
would see a draft and turn it into a visible difference — which is FMT-06's
failure mode, in the one place where nobody would look for it.

---

### S2 — The event card (D-36-02)

**One card per event. Never split into one card per night.** A double bill is one
piece with two names, which is how it is communicated.

New row, directly beneath the date line (`EventTabs.tsx:71-73`) and above the
title (`:75`), because the format is the source of the name and the title is
free text beneath it:

```
  Saturday, 10 October              ← date (existing, text-sm text-muted)
  ▪ SunSet  ×  ▪ re:sonate          ← NEW format marker row
  <event title>          [Draft]    ← existing
  <lineup pills>                    ← existing
  🔒 Secret Venue                    ← existing
```

- One marker per night, **ordered by `event_parties.sort_order`** — the column
  already exists (`20260225150000:20`) and `transformEvent` already sorts by it
  (`page.tsx:88`). Formats are collected onto the card the same way venues and
  lineup already are: a new axis through existing machinery, not a new structure.
- **Duplicates collapse.** Two nights of the same format produce one marker.
- **Joiner between markers: ` × ` (U+00D7), `text-muted`, `aria-hidden`.** That
  is the brand's own form for a double bill. The lowercase `x` inside a series
  name (`RamaDub x <venue>`) is a different glyph and it comes from the stored
  name — the UI supplies only the joiner, never the `x` inside a name.
- Marker: `inline-flex items-center gap-1.5`, an 8px `rounded-[2px]` swatch at
  full opacity with an inline `background`, then the name at 12px / 600 /
  `text-foreground` / `tracking-wide` / **no uppercase**.
- The swatch is `aria-hidden`; the name is the accessible content.

**Which name a marker shows — and the venue gate on it**

| Condition | Marker shows |
|---|---|
| Every night on this card has `venue_secret = false` | the series public name, e.g. `RamaDub x <venue>` |
| **Any** night on this card has `venue_secret = true` | **the format name alone**, e.g. `re:sonate` |

This second row is a **venue-secrecy default-closed clause**, and it exists
because a series public name is a *stored string that is published on every
surface its nights touch*. A series named after a venue publishes that venue
every time. Degrading to the format name when any night is secret means no series
name can become an accidental reveal path — and it produces exactly the brand's
own string for a double bill, `SunSet × re:sonate`, without anyone having to
special-case it.

If the reveal state cannot be determined at all — missing row, failed join — the
marker shows the **format name**. The fallback is always the narrower string
(`venue-secrecy.md`, gate *default chiuso*).

---

### S3 — The night detail (`events/[slug]/page.tsx`)

Per D-36-09 a visitor reads **the name only**: never the number, never the raw
sigla code (`RMDB-BZ`, `SNST`, …).

In the party header block (`:628-639`), the format marker goes **above**
`party.title` (`:630`), using the same marker component as S2 and the same
venue gate — evaluated **per night** here, against that night's own
`venue_secret`, rather than across the card.

```
  ▪ RamaDub x <venue>          ← NEW marker (Label role)
  <party.title>                ← existing, text-foreground font-medium
  📅 date   🕐 time             ← existing
```

The number does not appear. Neither does the code. Both stay internal — and the
reason is worth carrying into the code as a comment: **the number is itself a
channel.** "the eighteenth" says that eighteen exist. Keeping it off public
surfaces removes that channel before it exists (D-36-09).

---

### S4 — The work surfaces: choosing a format, confirming a number

`src/app/(admin)/admin/(work)/events/new` and `…/[id]/edit`, on the per-night
block of `EventForm.tsx`. Three fields, in this order, using the input styling
already established (`rounded-xl border border-card-border bg-background px-4
py-3 text-sm`, `focus:ring-1 focus:ring-accent/50`):

1. **Format** — native `<select>`, **required** (D-36-04). A night cannot be
   saved without saying what it is. Not a free-text input, so a format cannot be
   invented at the point of use.
   - Options: **active** catalogue formats only.
   - **One exception, and it prevents data loss:** if the night being edited
     already carries a **retired** format, that entry is included, labelled
     `{Name} (retired)`, and preselected. Omitting it would mean that merely
     opening the edit form and saving would silently reassign an archived night
     — and archived nights are not rewritten (D-36-10). The **server action**
     refuses a *change to* a retired format; the select's job is only to be able
     to display the truth.
   - Each option carries its swatch beside the name in the collapsed display
     where the surface can render one; the name alone is sufficient and is the
     accessible content.

2. **Series** — native `<select>`, filtered to the series belonging to the chosen
   format. Changing the format clears the series and the number. Series are rows
   a person created (D-36-05); this field never accepts typed text, because a
   venue spelled two slightly different ways would silently start a second
   numbering from 1.

3. **Number** — `<input type="number" inputmode="numeric" min="1">`, class
   `tabular-nums`, **arriving pre-filled with the next number in the chosen
   series** and fully editable (D-36-06).
   - Helper text, beneath the field, `text-xs text-muted`:
     `Suggested from the last number in this series. What you save is stored as written and never recalculated — moving or deleting a night does not renumber the others.`
   - **The suggestion is a count, and that is allowed here**: this is a surface
     behind a capability, not a public one. Rule 1 in §0 governs public surfaces.
     Saying so explicitly, because over-applying the rule would remove the one
     affordance that makes the field usable.

**The rejection path** (D-36-08, and the `postgrest-details-leaks-the-row` todo)

When the database refuses the triple (format, series, number) through its **named**
constraint, the surface renders, attached to the number field with
`aria-invalid="true"` and `aria-describedby`:

> `Number {n} is already assigned in {Series}. Pick another.`

- The raw PostgREST error is **never** rendered and never passed through. On a
  constraint violation PostgREST returns **the entire rejected row**; putting
  that on screen or into a `console.error` in a shared surface is how a column
  nobody was thinking about ends up in a screenshot.
- The error is **distinguishable** from every other failure on the form: a
  network failure, a permission refusal and a duplicate number produce three
  different sentences. No shared "Something went wrong" —
  `meta-gates.md` records the newsletter form as the precedent not to repeat.
- The typed value is preserved in the field. The person came here with a number
  from a poster; clearing it would lose the only copy on screen.

---

### S5 — The catalogue surface (new, under `/admin`)

Its address and its capability binding are the plan's to choose — with the
non-negotiable that it takes its row in `src/lib/routes/capability-routes.ts`,
or `next build` refuses it and, for the gate, the route does not exist
(D-34-10/11). `catalogue.manage` already exists and `staff` does not hold it.

**Structure** — follows the shape of `(work)/venues/page.tsx`: a `text-3xl`
header, a `px-6` body, `space-y-2` rows of
`rounded-xl border border-card-border bg-card p-3`.

```
  Formats                                   [ Add format ]

  ▪  SunSet          SNST      2 series      >
  ▪  RamaDub         RMDB      2 series      >
  ▪  MotionLab       MTNLB     1 series      >
  ▪  re:sonate       RSNT      2 series      >

  Retired
  ▪  <name>          <code>    Retired       >
```

- Row: swatch (12px, `rounded-[2px]`, inline background) · name (Heading role,
  no transform) · code (Body, `text-muted`, `tabular-nums`) · series count.
  **The series count is fine here** — internal surface.
- **Retired formats live in their own section below the active list**, so the
  working list stays the list you can work with. A retired row keeps its swatch
  at `opacity .5` **and** carries the literal word `Retired` as text. Never
  opacity alone: rule 4.

**Creating / editing a format** — the existing `<dialog>` modal pattern
(`CreateVenueModal.tsx:143-152`), `max-w-md`, `rounded-2xl`.

| Field | Control | Rule |
|---|---|---|
| Name | text | Rendered publicly, verbatim, with no transform. Placeholder shows CamelCase. |
| Code | text, `uppercase` input filter | Internal only — never reaches a public surface. |
| Colour | **swatch grid, required** | Six choices from the table above. No free hex input, no gradient option, no empty state. A colour held by another active format is `aria-disabled` and labelled `used by {Name}`. |

The colour control is a `radiogroup`: each swatch is a 44 × 44px target
containing a 24px colour square, and the selected one carries a 2px ring **plus
a check glyph** — because the selection of a *colour* control must not be
signalled by colour.

**Naming a series — the one field that publishes**

The series public name is the string a visitor reads. Beneath the field, in
`text-xs text-muted`:

> `This name is shown publicly on every night in this series. Do not put a venue in it unless that venue is already public for every night in the series.`

This is not advice, it is the field's contract. S2's fallback holds the line if
it is ignored, but a person naming a series should be told before, not
protected after.

**Retiring** — the only destructive action in this phase, and it is **not
monotone.**

- No delete exists anywhere in this surface. Deleting a format would orphan the
  nights that ran under it, and those nights are not rewritten (D-36-10).
- Confirmation dialog:
  > **`Retire {Name}?`**
  > `New nights can no longer be assigned to it. Nights already recorded under it keep their name and stay where they are.`
  > `[ Cancel ]  [ Retire format ]`
- `Retire format` uses the destructive treatment (`red-500/10` fill, `red-400`
  ink). `Cancel` is the default focus.
- **Restoring** is offered only from the Retired section, with its own
  confirmation, because bringing a name back is a decision of its own:
  `production-calendar.md` holds that a retired sigla is not cited again, so
  un-retiring one is not an undo.
- Recorded deliberately: unlike `venue_reveal_sent`, retiring **publishes
  nothing** and is reversible. This phase adds no monotone switch. The monotone
  guard it must not break is the **series number** — appended, never renumbered —
  and D-36-06 holds it by storing the number rather than deriving it.

---

## Component Inventory

| Component | New? | Where | Notes |
|---|---|---|---|
| `FormatMarker` | new | card (S2), night detail (S3), catalogue row (S5) | swatch + name. Takes `{ name, color }` as props — **no format constant inside it** (D-36-12). `aria-hidden` swatch. **Carries `normal-case` explicitly on the name element** — see §0 rule 3: it is mounted inside an admin surface, where an uppercase ancestor is plausible, and `text-transform` inherits. |
| `FormatFilterRow` | new | `/events` (S1) | Server-rendered from the catalogue. Anchors, not buttons. Emits no count. |
| `FormatSelect` / `SeriesSelect` / `SeriesNumberField` | new | `EventForm.tsx` (S4) | Native controls, existing input styling. |
| `ColorSwatchPicker` | new | catalogue modal (S5) | `radiogroup`, six flat options, no gradient, no free input. |
| `RetireFormatDialog` | new | catalogue (S5) | `<dialog>`, destructive treatment, Cancel focused. |
| `EventTabs` | modified | S1 | `useState` → URL. Swipe preserved, now `router.replace`. |
| `transformEvent` | modified | `page.tsx:70-121` | Collects formats by `sort_order` alongside venues and lineup. |
| `StaggeredList` / `StaggeredItem` | reused | S1 | unchanged |
| `Icons.tsx` | reused | S2/S3 | unchanged — no new icon is needed; a swatch is not an icon |

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `Add format` |
| Secondary CTAs | `Add series` · `Save format` · `Show all events` |
| Filter chip, unfiltered | `All` |
| Empty — upcoming, no filter | **`No upcoming events`** / `Check back soon.` |
| Empty — upcoming, filtered | **`Nothing announced for {Format}`** / `Show all events` |
| Empty — past, no filter | **`No past events yet`** |
| Empty — past, filtered | **`No past events for {Format}`** / `Show all events` |
| Empty — catalogue | **`No formats yet`** / `A night cannot be saved without a format. Add the first one.` |
| Error — duplicate number | `Number {n} is already assigned in {Series}. Pick another.` |
| Error — format required | `Pick a format. A night cannot be saved without one.` |
| Error — series required | `Pick a series before choosing a number.` |
| Error — colour required | `Pick a colour. Every format needs one of its own.` |
| Error — colour taken | `{Colour} is already used by {Name}. Pick another.` |
| Error — save failed | `Could not save. {reason}` — the reason is named, never `Something went wrong` |
| Helper — number field | `Suggested from the last number in this series. What you save is stored as written and never recalculated — moving or deleting a night does not renumber the others.` |
| Helper — series name | `This name is shown publicly on every night in this series. Do not put a venue in it unless that venue is already public for every night in the series.` |
| Destructive confirmation | **`Retire {Name}?`** / `New nights can no longer be assigned to it. Nights already recorded under it keep their name and stay where they are.` / `[Cancel] [Retire format]` |

**Language:** English, matching the interface (`STATE.md`, owner decision: the
interface stays English only this milestone). Note this differs from the
*materials*, which are British English with `Thursday 18 Sept` date forms —
that gate governs posters, not the app.

**Sound:** no copy anywhere in this phase describes what a format *sounds like*.
No genre, no scene reference, no adjective that reads as a promise. RamaDub,
MotionLab and re:sonate have no written manifesto, and this phase does not write
one by accident in a placeholder (`sound-manifesto.md`; the precedent is already
recorded at `20260809003000_party_credits.sql:77-81`).

---

## Accessibility Contract

- **Colour is never the only channel.** Every format is identified by its **name
  as text**. Chip state is `aria-current` + ground + ink. Retired state is the
  word `Retired`. The colour picker's selection is a ring **plus a check glyph**.
  A visitor who cannot distinguish any of the six hues loses nothing.
- **Contrast, measured 2026-08-10, not assumed.** All four format colours clear
  4.5:1 on both grounds (table above); the excluded `#5B2A9E` measured 1.99:1;
  the off-state swatch at `opacity .4` measures 1.83–2.63:1 and is accepted as
  redundant decoration, recorded rather than silently raised.
- **Touch targets ≥ 44 × 44px** on every chip, every tab link and every colour
  swatch. The filter row is used one-thumbed on a phone.
- **The swatch is `aria-hidden`.** It adds nothing a screen reader needs and
  would otherwise read as noise before every format name.
- **Keyboard:** the chip row is a normal tab sequence of links. The colour picker
  is a `radiogroup` — arrow keys move within it, Tab leaves it. The retire dialog
  traps focus and opens on `Cancel`.
- **Reduced motion:** the existing swipe translate and `StaggeredList` respect
  `prefers-reduced-motion`; the filter row adds no animation of its own. A chip
  changes state through navigation, which needs no transition.
- **No JavaScript:** the filter row and the tab links are anchors and work
  without it. Only the swipe gesture is JS-only, and it duplicates the tab links.

---

## Surface Disclosure Matrix

The single table that answers "may this appear here?". FMT-06 is this table.

| | Public list `/events` | Public night detail | Work surfaces | Catalogue |
|---|---|---|---|---|
| Format name | **yes** | **yes** | yes | yes |
| Series public name | yes — **unless any night is secret** | yes — **unless that night is secret** | yes | yes |
| Series code (`BZ`, `MR`, …) | **never** | **never** | yes | yes |
| Format code (`RMDB`, `SNST`, …) | **never** | **never** | yes | yes |
| Series number | **never** | **never** | yes | yes |
| Composed sigla (`RMDB-BZ-018`) | **never** | **never** | yes | yes |
| Any count of nights | **never** | **never** | yes | yes |
| A retired format | **no chip, no filter** | archived nights keep the name they ran under | selectable only as an existing value | yes, in its own section |
| Venue of a secret night | **never** (existing `Secret Venue` + lock) | **never** (existing `SecretVenueDialog`) | per existing gates | n/a |

**On the one apparent conflict between FMT-05 and D-36-10.** FMT-05 says a
retired sigla *cannot appear*; D-36-10 says archived nights are *not rewritten
and do not disappear*. The UI resolves it by which way the surface faces:
**forward-looking surfaces (the filter row, the format select for a new
assignment) drop the retired entry; the archive renders what a night actually
carried.** As `36-CONTEXT.md` records, the sigla retired on 2026-08-04 has no
open tail, so **no archived night carries a retired format today** and the second
branch is currently unreachable. It is specified anyway, for the next retirement.

---

## Verification Notes for the Planner

This repository has **no test runner for the product**. Nothing below can be
called verified because tests pass. The gate is `npm run build` (which is the
typecheck) plus written manual procedure.

Three things in this spec are **not** provable from `/events`, and the plan
should say so rather than collect a meaningless green:

1. `events/page.tsx:42-57` already records, with the measurement, that this page
   **is not a valid capability probe** — it reports "no difference" because RLS
   refuses unpublished rows to `anon` regardless of what the page decides. **The
   format filter inherits the problem exactly:** a filter that does not show a
   draft has not been shown to be incapable of showing one.
2. The proof FMT-06 needs is a written manual procedure: seed an **unpublished**
   night under a chosen format, filter to that format as an anonymous visitor,
   and observe that **no** surface carries a trace — not the chip row, not the
   result list, not the empty-state string, not the page source, not an
   `aria-label`, not a `title`. Then repeat with the shared link.
3. `src/types/database.ts` is not parameterised into any of the four Supabase
   clients (`STATE.md`), so a new column name misspelled in a query produces **no
   type error**. A green build does not cover the format column.

---

## Open Questions

| # | Question | Status |
|---|---|---|
| 1 | `--soy`, the fifth colour token in the tracker's stylesheet, mapped to grey `#8C82A6`. Its meaning could not be determined from the stylesheet alone. | **Not used by this phase.** Grey is offered as the neutral on its own merits. Ask the owner before giving `--soy` any meaning. |
| 2 | Does a series public name ever legitimately contain a venue that is secret for some of its nights? | Closed structurally by S2's fallback, without needing the answer. Recorded because the answer would let the fallback be relaxed — and it should not be relaxed without it. |
| 3 | MotionLab's weekday is a placeholder, not a fact (`production-calendar.md`). | This phase renders **no weekday claim** for a format. Nothing to resolve here; noted so a future surface does not add one. |
| 4 | Reconciling `globals.css` with the tracker's token set (ground, ink ramp, mono + sans). | **Phase 40**, DS-01…DS-10. Out of scope here by `36-CONTEXT.md`'s own boundary. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none — shadcn is not initialised in this project | not applicable |
| third-party | **none declared** | not applicable |

No `components.json`, no component-library dependency in `package.json`, and no
third-party registry is introduced by this phase. Every component listed in the
inventory is hand-written against the existing patterns in `src/components/`.
The vetting gate did not run because there is nothing to vet.

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

*Phase 36 — written 2026-08-10. Contrast ratios measured, not estimated. Contains
no venue under negotiation, no unannounced date, no line-up and no personal name:
`.planning/` is tracked and this repository is public.*
