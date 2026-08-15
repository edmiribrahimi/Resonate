---
phase: 44
slug: the-production-calendar-comes-inside
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-15
extends: 41-UI-SPEC.md
sources:
  - 44-CONTEXT.md (D-44-01 … D-44-27, all binding)
  - 44-RESEARCH.md (the measured file; §Entry Grammars, §The Anchor Model, §Migration Shape)
  - .planning/ROADMAP.md §Phase 44 (the five success criteria)
  - .planning/REQUIREMENTS.md (PROD-01)
  - 41-UI-SPEC.md (the contract this one extends — tiers, primitives, touch targets, focus)
  - 40-UI-SPEC.md (grounds, inks, lines, semantics, type roles — inherited whole)
  - .claude/rules/production-calendar.md (persona 1.15.0), venue-acquisition.md,
    brand-visual-system.md, meta-gates.md, ai-engineering.md
  - src/components/ui/*, src/app/globals.css, src/lib/routes/staff-tabs.ts — read 2026-08-15
---

# Phase 44 — UI Design Contract

> The production calendar's first surface inside the product: a read-only night
> list, a night's editorial pieces and its checklist, and the observable effect
> of the last import.
>
> **This document restates neither Phase 40 nor Phase 41.** The four grounds,
> four inks, three line weights, three type roles, two weights, `--accent` and
> its reserved-for list, the spacing ladder, the three tiers, the 44px target,
> the focus expression and every primitive under `src/components/ui/` are
> inherited whole. What is added here is what only this phase can decide: **how a
> date that does not exist yet is drawn beside one that does.**

---

## 0. The seven rules that outrank everything below

1. **This phase adds no colour, no token, no radius, no breakpoint, no spacing
   step and no badge tone.** Every value below is already declared in
   `src/app/globals.css` or in an existing primitive. If a plan needs a new one,
   the plan is wrong before the value is.

2. **A PROPOSED date must never read as settled** (D-44-09b part 3). This is the
   phase's highest-risk display decision and §7 is written before anything else
   in this document. A proposal is distinguished by **a word, an ink register and
   a rule** — three channels, of which none is a hue.

3. **An override is not surfaced** (D-44-10). The owner read the cost and chose
   it. `conforms_to_rule` exists in the data and reaches **no pixel**. A date
   written in the file is drawn identically whether it follows the rule or breaks
   it, and this phase's UI has no notion of "exception".

4. **The surface is read-only** (D-44-02). It has **two writes and only two**: a
   checklist tick, and the announcement act. There is **no date field, no date
   picker, no file input and no upload control** anywhere on it — the last one
   because D-44-26 closed the import as a local script (see §11.3, where
   `44-RESEARCH.md`'s upload shape is superseded and why the empty state must say
   so out loud).

5. **A count that could not be measured never prints a figure.** OBS-03 shipped
   in Phase 46: *a failed read is never rendered as a legitimate value.* On this
   surface that rule has three named consumers — the LiveCut count (D-44-13), the
   import run's tallies, and the late count on a row.

6. **Three reasons stay three sentences.** `awaiting_next_edition`,
   `depends_on_lineup` and `not_derivable` are different facts with different
   next steps. One shared "Unknown" is the collapsed-`catch` shape this repository
   already paid for once (`meta-gates.md`, the newsletter precedent).

7. **`.planning/` is tracked and this repository is PUBLIC.** No venue under
   negotiation, no unannounced date, no line-up and no personal name appears in
   this file. Every example below is **invented** and labelled as such; sigle and
   format names are used because they are already published in
   `.claude/rules/production-calendar.md`. §17 states the rule the surface must
   keep at runtime, which is stricter than the rule this document keeps.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | **none** — no `components.json`, no shadcn. Refused by D-40-01, re-refused by D-41-20, unchanged here |
| Preset | not applicable |
| Component library | none — hand-written primitives under `src/components/ui/` (13 files, read 2026-08-15) |
| Styling | Tailwind CSS 4.2.1, CSS-first config in `src/app/globals.css`. No `tailwind.config.*` exists |
| Icon library | local — `src/components/ui/Icons.tsx`. `CalendarIcon` and `CheckIcon` already exist; **no new icon and no icon package** |
| Fonts | three roles from Phase 40 — display Orbitron, interface Inter, data system mono |
| Theme | dark only (D-40-07) |
| New packages this phase | **none** — matching `44-RESEARCH.md` §Standard Stack, which adds no npm dependency either |

---

## 1. The ledger: what this phase adds to the visual system

Written as a ledger rather than as prose so a checker can read it in one pass.

| | Added | Why |
|---|---|---|
| Colour tokens | **0** | §5 |
| Badge tones | **0** | `Badge` has exactly two — `neutral` and `emphasis` — and `Chip.tsx:236-256` refuses a tone per outcome **on purpose**. §5.3 spends `emphasis` on one meaning and adds nothing |
| Spacing steps | **0** | §3 |
| Type sizes / weights | **0** | §4 |
| Radii | **0** | the three from `41-UI-SPEC.md` §9 |
| z-index rungs | **0** | the announcement dialog is a `Dialog`, which is the platform top layer |
| Primitives in `src/components/ui/` | **0** | §12 composes from what exists |
| Entries added to a closed list | **1** | `/admin/calendar` joins `PageShell`'s `wide` list. Declared in §8.1 as a decision, not discovered as a diff |
| Icons | **0** | |

---

## 2. The surfaces

| # | Surface | Address | Shell width | Who |
|---|---|---|---|---|
| S1 | The calendar — nights and occupied days, in date order | `/admin/calendar` | `wide` | master + organizer, by the capability the plan declares (D-44-17, D-44-27) |
| S2 | One night — its pieces and its checklist | `/admin/calendar/[id]` | `default` | same key |
| S3 | The last import's effect | a block **inside S1**, never its own page | — | same key |

**S3 is not a page and that is the point.** `meta-gates.md`: with no error
tracking, *a failure that counts must have an observable effect*. An import
summary behind a second click is a log with a nicer font. It renders at the foot
of S1, on every visit, whether or not anything went wrong.

**Route placement**, per the measured `(work)` convention (`44-RESEARCH.md`
§Import Path): `src/app/(admin)/admin/(work)/calendar/page.tsx` and
`.../(work)/calendar/[id]/page.tsx`; every non-route module one level out at
`src/app/(admin)/admin/calendar/`. The tab in `src/lib/routes/staff-tabs.ts`
lands **only after the page exists on disk** — `StaffTab.href` is `Route`, and a
static address enters the generated union only once a `page.tsx` serves it
(`staff-tabs.ts:109-119`). Page first, tab second.

**Tab label: `Calendar`.** One word, matching the six incumbents (`Events`,
`Members`, `Artists`, `Venues`, `Formats`, `Newsletter`). Not "Production" —
that is Phase 45's noun, and Phase 45 splits this surface's neighbours out by
section.

---

## 3. Spacing Scale

Inherited unchanged from `41-UI-SPEC.md` §3.1, which is Tailwind's 4px ladder.
**This phase declares no new step.**

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| xs | 4px | badge padding, the gap between a piece's kind and its date |
| sm | 8px | chip gaps, the gap between two marks in a row's mark slot |
| md | 16px | default element spacing, section-heading bottom margin (`mb-4`) |
| lg | 24px | the page gutter (`px-6`), card padding, dialog padding |
| xl | 32px | the gap between the night list and the import block |
| 2xl | 48px | page top padding (`pt-12`), empty-state vertical padding (`py-12`) |
| 3xl | 64px | page-level spacing |

**Exceptions — two, both inherited, neither new:** `min-h-11` (44px, 11 × 4) for
every interactive element, and `pointer-fine-only:min-h-9` (36px) for row-action
buttons inside `DataTable`'s desktop branch, which is `hidden md:block` and never
renders on a phone (`41-UI-SPEC.md` §6.3). This surface's row actions are the
one allowed consumer, and there is no second.

**`mb-3` (12px) is rejected here as it was in Phase 41.** A multiple of 4 that
the ladder does not name is how a scale acquires a value nobody decided.

---

## 4. Typography

Inherited whole from `41-UI-SPEC.md` §7: **four sizes, two weights (400 and
600), three faces.** Nothing is added.

| Role | Class | Size | Weight | Line height | Face | Used here for |
|------|-------|------|--------|-------------|------|---------------|
| Display | `text-3xl` | 30px | 600 | 36px (1.2) | display | the single `<h1>` of each surface, via `PageTitle` |
| Heading | `text-base` | 16px | 600 | 24px (1.5) | interface | a night's name on its own page, a card heading |
| Body | `text-sm` | 14px | 400 | 20px (1.43) | interface | every sentence, every reason, every checklist item's label |
| Label / Data | `text-xs` | 12px | 600 | 16px (1.33) | **data** (`font-mono`) | **every date, every sigla, every progressivo, every count, every part marker** |

**The display face lands on the page title and nowhere else** — not on a night's
name, not on a format name, not on a figure. `SunSet`, `RamaDub`, `MotionLab` and
`re:sonate` are read, not decorated (`41-UI-SPEC.md` §7.1).

**`normal-case` is declared on every element that renders a format name or the
brand**, always, never assumed. `text-transform` inherits and `uppercase` appears
in 43 files in this tree; "we did not add `uppercase`" is not a guarantee. This
surface renders format names on every row, so the rule has more consumers here
than anywhere else in the product.

**`re:sonate` is written with a normal `e`.** The reversed glyph `ɘ` lives only
inside the logo artwork and is never typed into a string, a label or a comment
(`brand-visual-system.md`). Where the brand is the night's own name, the
`Wordmark` primitive renders it; where it is part of a series name taken from the
data, the string arrives from `party_series` and is rendered with `normal-case`
and no transform.

**Figures take the data face, which already carries `font-variant-numeric:
tabular-nums`** (`globals.css:451-453`). A descendant must not carry `ordinal` or
`slashed-zero`: those rebuild the shorthand and drop the inherited alignment
(`40-REVIEW.md` WR-10). A column of progressivi that does not align is a column
whose gaps cannot be seen — and seeing the gaps is half of why the archive exists
(D-44-08).

---

## 5. Color

### 5.1 The 60 / 30 / 10 contract, unchanged

| Role | Value | Usage on this surface |
|------|-------|----------------------|
| Dominant (60%) | `--ground` `#0A0712` | the page ground |
| Secondary (30%) | `--surface` `#140D20`, with `--raised` `#1D1430` and `--sunk` `#0D0917` | the night card and the table rows · `--raised` for an expanded row · `--sunk` unused here (no input exists) |
| Accent (10%) | `--accent` `#FF5C93` | **the primary button fill on the announcement dialog, and the active navigation entry.** That is the whole list on this surface |
| Destructive | `--sem-crit` `#FF6B8E` | **unused — this phase has no destructive action.** §13.4 |

**Accent reserved for** (inherited, unchanged): the primary button fill · the
active navigation entry · a link inside prose · the lineup pills on an event
card. **Never** a format marker, a state signal or the focus ring.

### 5.2 The one hue this surface deliberately refuses to draw

`formats` carries an identification colour as **data on a catalogue row, never a
CSS token** (`40-UI-SPEC.md` §3). A dot in that colour down the format column
would make the rotation scannable at a glance, and the rotation being checkable
by looking rather than by remembering is D-44-08's entire reason for existing.

> **The calendar draws no format identification colour.** The rotation is read
> from the format column **in text**, in date order.

**The reason is arithmetic, not taste.** `--sem-warn` `#FFB25E` **is** `--amber`
**is SunSet's identification colour** — `40-UI-SPEC.md` Open Question 3, still
open. Any surface that draws a format's hue and also needs a caution mark has a
colour that means two things, and the reader cannot tell which. This surface
needs the caution mark (D-44-15). So it spends the hue on the state and keeps the
format in text, which is also the only channel a person can read aloud.

**The consequence, accepted rather than discovered:** checking the rotation
requires reading a column instead of scanning a stripe. Fourteen nights fit on
one screen (`44-RESEARCH.md` §Entry Grammars, class C = 14), so the column is
readable without scrolling. If the calendar ever holds enough nights that it is
not, that is the moment to re-open this — **and Open Question 3 first.**

### 5.3 `emphasis`, spent once, on one meaning

`Badge` has exactly two tones and `Chip.tsx:236-256` refuses a tone per outcome
**deliberately**: the fill means *look here first*, and the word says what.

> **On this surface `Badge tone="emphasis"` means: this row needs attention
> before the others.** Exactly two facts earn it, each with its own word:
> **`Late N`** (D-44-15) and **`Diverged`** (D-44-07). Everything else — the
> venue stage, `Announced`, `Day taken`, `Proposed` — is `tone="neutral"`.

| Pairing | Computed 2026-08-15 | Against |
|---|---|---|
| `emphasis` fill: `--ground` `#0A0712` on `--sem-done` `#9B7BE0` | **5.99** | WCAG 1.4.3, 4.5:1 |
| `neutral` badge: `--ink-2` `#D6CBE8` on `--surface` | **12.24** | 1.4.3, 4.5:1 |
| `neutral` badge boundary: `--control` `#A493C0` on `--surface` | **6.78** | 1.4.11, 3:1 |
| a proposal's date: `--muted` `#A493C0` on `--surface` | **6.78** | 1.4.3, 4.5:1 |
| a written date: `--ink` `#F3ECFA` on `--surface` | **16.41** | 1.4.3, 4.5:1 |
| a reason sentence: `--muted` on `--surface` | **6.78** | 1.4.3, 4.5:1 |

Computed with the WCAG 2.x relative-luminance formula, sRGB, and reproducing
`40-UI-SPEC.md` §4.1 exactly where the two overlap.

**Why a proposal does not take a caution colour, when `--sem-warn`'s declared
meaning is literally "a provisional state".** Because on this surface a proposal
is the **majority** case — every owed piece that is not yet written gets one — and
a caution colour applied to the majority stops being a caution and becomes the
page's background. The two rows that genuinely need attention would then be
invisible. A proposal must **recede**, not shout: the requirement is that it never
reads as settled, not that it shouts. §7 is how it recedes.

**`--faint` `#6E6188` is not used.** 3.12–3.54:1; it is exposed and unused
product-wide (`40-REVIEW.md` WR-12) and stays that way. Where a tertiary register
is wanted, the pairing is `--muted` on `--surface`, **6.78:1**.

---

## 6. The date contract

The pipeline is expressed in **days of the week, not offsets** — the correction
`44-CONTEXT.md` D-44-25 calls *the single most important thing this phase must
build against*. That correction has a visual consequence, and it is not optional.

> **Every date on this surface renders weekday-first, and the weekday is never
> dropped at any tier.** Form: `Tue 12 May 2026` — weekday abbreviated to three
> letters, day, month abbreviated to three letters, four-digit year. Data face,
> tabular figures.

**Why the weekday is load-bearing and not decoration.** The rule a reader is
checking is *the listing is a Tuesday*. A surface that prints `12/05/2026`
forces the reader to reconstruct the weekday, and the reconstruction is where
the day-count mental model comes back — the model that reported `RSNT-003` as out
of rule when it was perfectly correct. The surface shows the thing the rule is
about.

> **The surface never constructs a `Date` to render a date.**

No `new Date(...)`, no `toISOString`, no `toLocaleDateString`, no timezone
library, in any file under the calendar surface. The civil date arrives as
`YYYY-MM-DD` and is formatted from its parts against a fixed weekday and month
table. A conversion that crosses midnight moves the weekday, and a moved weekday
turns a conforming night into a reported error (`44-RESEARCH.md` §Dates and
times). This is mechanically checkable — §15, check U3.

**Times** render 24-hour, `22:00 → 06:00`, matching how production writes them.
**Never** a 12-hour clock, and never a timezone suffix: the file holds floating
local times and the surface must not imply a precision the data does not have.

**Progressivi** render exactly as the series holds them — `001`, three digits,
never stripped to `1`, never localised, never given a thousands separator. A
progressivo is on a poster; the app shows what is on the poster.

**Sigle** render in the data face, upper case as written — `RMDB-BZ-001`,
`RSNT-009` — with `normal-case` on the element so no ancestor can transform them
and no ancestor is relied on to upper-case them.

---

## 7. The seven states a piece's date can be in

**This is the phase's highest-risk display decision.** Everything above exists so
that this table can be read without ambiguity.

| # | State | What is drawn | Ink | Badge |
|---|---|---|---|---|
| 1 | **Written in the file** | the date, weekday-first | `--ink` **16.41** | none |
| 2 | **Written in the file, and it breaks the rule** | **identical to state 1** | `--ink` | **none — D-44-10** |
| 3 | **Proposed** | the word `Proposed`, then the date | `--muted` **6.78** | `neutral`: `Proposed` |
| 4 | **Waiting for an edition** | `Waiting for RSNT-009` — the edition named, **no date** | `--muted` | `neutral`: `Waiting` |
| 5 | **Depends on the line-up** | `Depends on the line-up` — **no figure** | `--muted` | `neutral`: `Waiting` |
| 6 | **Not derivable** | `No proposal — read it from the calendar` | `--muted` | `neutral`: `No proposal` |
| 7 | **Late** — state 1 or 3, past, and its checklist item is unticked | the date, unchanged, plus the mark | `--ink` / `--muted` unchanged | **`emphasis`: `Late`** |

**States 1 and 2 are drawn identically, and that is a decision, not an
oversight.** D-44-10 is the owner's, and its stated cost — that after three
months nobody can tell rule from exception on screen — was read and accepted.
`conforms_to_rule` feeds the divergence report of D-44-07 and **nothing else**.

**A proposal is distinguished by three channels, none of them a hue:**

1. **The word `Proposed`**, always adjacent to the date, never behind a hover, a
   tooltip or an icon. A tooltip is not a channel on a touch device.
2. **The ink register** — `--muted` 6.78 against a written date's `--ink` 16.41.
   The two are unmistakably different weights of presence, and both clear AA.
3. **A dashed leading rule** on the piece row — `border-s-2 border-dashed
   border-control` — so the row reads as unfinished at the edge of vision, before
   any word is read.

**And a fourth, which is structural rather than visual.** The component that
renders a piece's date takes a **discriminated union**, never a bare date:

```
{ origin: "file",     date: CivilDate }
{ origin: "proposed", date: CivilDate }
{ unresolved: "awaiting_next_edition", edition: string }
{ unresolved: "depends_on_lineup" }
{ unresolved: "not_derivable" }
```

A date with no origin is **unrepresentable**, which mirrors the two CHECK
constraints `44-RESEARCH.md` §Migration Shape puts on `production_piece`. This is
the strongest available form of rule 2 in §0: a rule that can only be kept by
remembering it is not kept (`36-UI-SPEC.md:66`). No other component on the
surface may render a piece's date.

**States 4, 5 and 6 keep three distinct sentences.** §13.3 writes them. A shared
"Unknown", a shared em-dash or a shared blank cell collapses three different next
steps into one — and one of the three (state 4) is *the rule behaving correctly*,
which a reader must be able to tell from a gap.

**State 4 is not an error and must not look like one.** `RSNT-008` has neither
LiveCut nor after movie because `RSNT-009` is not in the calendar
(`44-CONTEXT.md` D-44-25). Nothing on the surface calls that missing, late,
incomplete or broken.

---

## 8. S1 — the calendar

### 8.1 Shell and shape

`PageShell width="wide"` (`max-w-7xl`, 1280px). **This adds `/admin/calendar` to
the closed `wide` list in `41-UI-SPEC.md` §4** — declared here as a decision, per
that document's own discipline of editing such a list by decision and not by
diff. The qualification is met literally: the surface's primary object is a dense
table.

`DataTable` renders it — one server-fetched array, two branches, one breakpoint
(`md`, 768px), never a transformed table (`41-UI-SPEC.md` §8.8).

**No filter, no search, no pagination, no sort control.** Measured: the file
holds **14 nights** and **19 external commitments**
(`44-RESEARCH.md` §Entry Grammars, classes C and D). Thirty-three rows fit one
page. A filter added now would be a control with nothing to filter, and a default
sort control is how a chronological list quietly stops being chronological.

> **The default order is chronological and there is no other.** Sorting by format
> would hide the rotation, and making the rotation visible is D-44-08's whole
> purpose.

**Today's position is marked**, once, by a full-width rule carrying the word
`Today` in the label role — so past and future are one continuous list rather
than two, and the distance between the last aired night and the next one is
something you can see.

### 8.2 The columns, and where each lands on a phone

`DataColumn.card` slots: `title` · `subtitle` · `mark` · `meta` · `none`.

| Column | Slot | Content | Face |
|---|---|---|---|
| Night | `title` | `<Format> x <venue> NNN`, or `<Format> NNN` where the series carries no venue | interface, `normal-case` |
| Date | `subtitle` | weekday-first (§6) | **data** |
| State | `mark` | the badges of §8.3 | — |
| Sigla | `meta` | `RMDB-BZ-001` | **data** |
| Venue stage | `meta` | the literal stage word (§8.4) | interface |
| Pieces | `meta` | `4 of 4 written`, or the withheld form (§8.5) | **data** for the figures |

**A commitment row carries no Night, no Sigla and no Pieces** — see §8.6.

### 8.3 The marks

| Badge | Tone | When | Copy |
|---|---|---|---|
| `Late N` | **emphasis** | one or more checklist items are unticked and past (D-44-15) | `Late 2` — the figure is a real count or the badge does not render |
| `Diverged` | **emphasis** | the plan row and the announced night disagree (D-44-07) | `Diverged` |
| `Announced` | neutral | `linked_party_id` is set (D-44-06) | `Announced` |
| `Day taken` | neutral | the row is an external commitment (D-44-18) | `Day taken` |

**`Late N` is why a person opens this page**, and it is readable from the list
without opening the night — which is D-44-15 stated as a layout requirement: the
mark sits in the `mark` slot, which `DataTable` renders in both branches, so it
survives the phone card. A checklist you only see once you are already late is
not a checklist.

**No badge means good.** There is no `On time` badge, no green tick column, no
`Complete` mark. The semantic set contains **no green** (`40-UI-SPEC.md` §3.4)
and this phase does not invent one; more to the point, a badge on every row is a
badge on no row.

### 8.4 The venue stage (D-44-05)

> **The stage is a word.** `mapped` · `verified` · `contacted` · `acquired` —
> rendered in a `neutral` Badge, in the vocabulary `venue-acquisition.md`
> publishes, with **no hue encoding any stage**.

This is `41-UI-SPEC.md` §15's instruction to Phase 45 applied one phase early: *a
colour meaning "acquired" would be a stage nobody could read.* And it is
`venue-acquisition.md`'s gate *lo stato prima del nome* — a space is never named
without it.

**Where the stage is unknown, the badge says `stage unknown` and does not
disappear.** A blank reads as *fine*, and *fine* is precisely the claim that
cannot be made: the stage is not in the calendar file and must never be inferred
from it (`44-RESEARCH.md` Open Question 4). An inferred `acquired` is the exact
harm the module names.

**The venue word itself is internal.** It renders on S1 and S2, both behind the
capability, and reaches no public surface, no error string, no analytics event
and no page title. §17.

### 8.5 The piece count

`4 of 4 written` — figures in the data face. The count of **owed** pieces comes
from the format's pipeline; the count of **written** ones from the file.

**Three withholding rules, and they are not optional:**

- Where any owed piece is in state 4, 5 or 6, the cell reads `3 of 4 written · 1
  waiting` and never rolls the waiting one into "missing".
- Where the LiveCut count is not knowable, the cell says **`LiveCuts depend on
  the line-up`** and prints **no figure** (D-44-13). Three is not a constant:
  one archived edition carries two (`44-RESEARCH.md` §Three distinct reasons).
- Where the count itself could not be read, the cell says **`We could not
  count`** — never `0`, never `—` (OBS-03).

### 8.6 The external commitment (D-44-18)

An external commitment is in the **same chronological list** as the nights,
because the reason it is in the calendar at all is so a night is not scheduled
against it — and a separate section makes the collision invisible.

> **The row shows the day as taken without implying a night.** It carries the
> entry's own title from the file, a `Day taken` badge, and the sentence `Not a
> re:sonate production`. It carries **no format, no sigla, no progressivo and no
> pieces.**

**Structurally, not by discipline:** the commitment row's component receives no
format, series or number prop **at all**. That mirrors
`production_commitment`'s deliberately absent columns (`44-RESEARCH.md`
§Migration Shape): the difference between a rule and a guarantee. Handing an
external commitment a format and a progressivo it does not have is the precise
harm D-44-18 names, and those two values reach surfaces that name formats.

The row is visually quieter than a night — `--muted` title, no mark slot beyond
its one badge — and it is never counted in any figure the surface prints about
nights.

---

## 9. S2 — one night

### 9.1 Shape

`PageShell width="default"` (1024px). One `<h1>` — the night's name, via
`PageTitle`, in the display face, `normal-case`. Below it, in the label role: the
sigla, the date weekday-first, the venue and its stage.

Two sections, in this order, each headed by `SectionHeading` (`mb-4 font-mono
text-xs font-semibold uppercase tracking-widest text-muted`):

1. **`PIECES`** — the editorial plan
2. **`CHECKLIST`** — the pieces **plus** the production steps (D-44-14)

**Pieces first.** The checklist's items are mostly about the pieces, and reading
a tick before knowing what it is about is reading an answer before the question.

### 9.2 The pieces list

One row per owed piece, in the order the pipeline produces them. Each row:

```
LiveCut PT1        Tue 12 May 2026
Listing            Proposed · Tue 05 May 2026
After Movie        Waiting for RSNT-009
```
*(invented data — see §17)*

- **Kind** in the body role, using **production's own word**: `Listing` ·
  `Tonight` · `Recap` · `LiveCut` · `Timetable` · `After Movie`.
- **`LiveCut`, never `Podcast`** (D-44-22). The string `Podcast` appears in **no
  label, no comment, no component name, no test string and no variable name** in
  this phase. A `Podcast` is a different thing that does not exist yet, and
  putting the word on a surface would announce a format the project has not
  built (`production-calendar.md`).
- **A LiveCut is identified by its part marker** — `PT1`, `PT2`, `PT3` — and
  **not** by a dj's name. The file carries a marker, not a name; associating a
  marker with a person would be a guess, and a guess about a line-up on a screen
  is a line-up on a screen.
- **Date** by §7, through the one component that cannot render a bare date.
- The **reason** sits beside the state, in the body role at `--muted`, on the
  same row — never behind an icon, never in a tooltip.

### 9.3 The checklist

| Property | Contract |
|---|---|
| Control | a real `<input type="checkbox">`, the `Checkbox` primitive, 16px drawn glyph inside a **44 × 44** hit area (`41-UI-SPEC.md` §8.6) |
| Label | the item's own sentence, associated by `htmlFor` — never a sibling `<div>` |
| Tick behaviour | **warns, never blocks** (D-44-16). Ticking raises no dialog and gates nothing |
| Late item | the row carries the `Late` badge and its due date in `--ink`; the badge is the same `emphasis` fill as the list's, so the two agree |
| Author | a ticked item shows **who ticked it and when** — `Ticked by <staff> · Tue 12 May 2026`, label role, `--muted` |
| Reversibility | **a tick can be undone**, and undoing re-records the author |
| Not a monotone guard | stated explicitly so nobody borrows the wrong precedent: unlike `venue_reveal_sent`, a tick is reversible. `meta-gates.md`'s three one-way switches are untouched by this phase |

**Why a tick is reversible when so much of this project is not.** A tick that
cannot be undone becomes a lie the first time somebody clicks the wrong row, and
a checklist nobody trusts is a checklist nobody reads. Nothing leaves the
building when a tick is made, which is the property `venue_reveal_sent` does not
have.

**Two failures, two sentences** (§13.2): *you may not do this* and *it did not
save* are different facts with different next steps, and they cross the Server
Action boundary as a **returned value** — Next redacts a thrown message in a
production build (`src/lib/capabilities/server.ts:59-63`).

---

## 10. S3 — the import block

At the foot of S1, in a `Card`, headed `LAST IMPORT`.

```
LAST IMPORT
92 entries read · 14 nights · 56 pieces · 19 days taken · 3 unclassified
1 divergence · 0 unsupported recurrences
15 Aug 2026, 18:04
```
*(the tallies reproduce the counts `44-RESEARCH.md` §Entry Grammars already
publishes; the timestamp is invented. No figure here was read out of `docs/`.)*

| Rule | Why |
|---|---|
| **Every tally is a real count or a sentence saying it could not be read.** Never `0` standing in for "we did not measure" | OBS-03 |
| **`3 unclassified` is drawn as prominently as the rest, never hidden behind a disclosure** | Three entries the grammars do not describe must be **seen and counted, never guessed** (`44-RESEARCH.md` §Class D). A count nobody sees is a guess with extra steps |
| **Unclassified detail carries UIDs and reason codes — never a `SUMMARY`** | An entry's title is an unannounced date, a venue under negotiation or a line-up. §17 |
| **`unclassified`, `divergence` and `unsupported recurrence` are three tallies, never one "problems" figure** | Three findings, three repairs (`staff-tabs.ts:156-175`'s two-sentence discipline) |
| **Never imported yet → the empty state of §13.1, not a zeroed block** | A block of zeros says the import ran and found nothing. It did not run |

---

## 11. The announcement act

### 11.1 What it is

The one write path in this phase that can create something the public may
eventually see (D-44-06). Trigger: a `Button variant="primary" size="md"` on S2,
labelled **`Announce this night`**.

It is **not destructive** and does not take the `destructive` variant: nothing is
destroyed. It **is** consequential, and it takes a confirmation for a reason the
domain supplies rather than a convention.

### 11.2 The confirmation

`Dialog size="md"`, title `Announce this night`. Body, in this order:

1. **What becomes visible.** One sentence naming which fields become publicly
   readable, and stating explicitly whether the venue is among them.
2. **The number.** `Announcing spends this night's series number. A number that
   has been spent is never reused.` — because `bump_series_watermark` raises
   `party_series.highest_assigned` with `GREATEST` and **never lowers it**, so
   deleting the night afterwards leaves a permanent gap in the progressivo. This
   is one of the project's three monotone guards, and the person pressing the
   button is the person who needs to know it.
3. **The open items, named.** Not a count — the sentences. `Venue not confirmed
   in writing` reads as a decision; `2 items open` reads as a formality.
4. **It still proceeds.** D-44-16: a tick warns and never blocks.

Actions, **cancel first in reading order**: `Cancel` (`secondary`, and the
**autofocus** target) then `Announce` (`primary`). **No Enter-to-confirm and no
autofocus on the confirming button** (`41-UI-SPEC.md` §11). The dialog reports
its own outcome in its own panel via `DialogStatus`, never a toast
(`Dialog.tsx:173-192`).

### 11.3 What the surface deliberately does not have

> **There is no upload control, no file input and no drag target anywhere on this
> surface.**

D-44-26: the import is a **local script only**. The `.ics` would otherwise
transit a Vercel function, carrying spaces under negotiation and unannounced
dates into logs, caches and runtime errors — a surface that does not exist today,
and criterion 2 exists to keep it from existing.

**This supersedes `44-RESEARCH.md` §Import Path**, which recommends building an
upload Server Action as well. The research is dated before the owner closed the
question; where the two disagree the owner's decision wins, and the disagreement
is written here rather than smoothed over so the next reader who opens the
research is not surprised by its absence.

**The empty state must therefore explain the absence** (§13.1), or a missing
upload button reads as an unfinished feature and somebody builds it.

---

## 12. Component inventory — reuse map

Every item is an existing primitive. **This phase writes no new file under
`src/components/ui/`.**

| Need | Primitive | Notes |
|---|---|---|
| Page frame, gutter, nav clearance | `PageShell` | S1 `wide` (new entry, §8.1) · S2 `default` |
| Page title | `PageTitle` | one `<h1>` per surface, display face |
| Section headings | `SectionHeading` | `PIECES` · `CHECKLIST` · `LAST IMPORT` |
| The night list | `DataTable` | one array, two branches, `md` breakpoint |
| Cards | `Card` | the import block, the night's two sections |
| Marks | `Badge` | `neutral` for stage, `Announced`, `Day taken`, `Proposed`, `Waiting`, `No proposal` · `emphasis` for `Late N` and `Diverged` |
| Checklist control | `Checkbox` | 44×44 hit area, `htmlFor` label |
| The announcement | `Dialog` + `Button` | `md`, cancel autofocus, `DialogStatus` for the outcome |
| Loading | `Skeleton` (`SkeletonLine`, `SkeletonCard`) | `loading.tsx` for both surfaces. **Not** a hand-rolled `animate-pulse` — 102 of those exist and the primitive has too few importers |
| Icons | `CalendarIcon`, `CheckIcon` | already in `Icons.tsx`; nothing new |
| Internal navigation | `Link` or `Chip` | **never `Button` with an `href`** — that branch renders a bare anchor with an untyped address (`Chip.tsx:288-300`) |

**Surface-level components this phase does write** (under
`src/app/(admin)/admin/calendar/`, not in `ui/`):

| Component | Responsibility |
|---|---|
| `PieceDate` | **the only** renderer of a piece's date; takes the discriminated union of §7 and cannot render a bare date |
| `NightRow` / `CommitmentRow` | two shapes, and the second takes no format, series or number prop |
| `StageBadge` | the four stage words plus `stage unknown`; no hue |
| `ChecklistItem` | tick, author, late mark, the two refusal sentences |
| `ImportRunSummary` | the tallies, UIDs only, never a `SUMMARY` |

**Nothing here becomes a shared primitive.** `41-UI-SPEC.md` §8.11's rule holds:
a wrapper whose copy changes per surface is a class contract, not a component.

---

## 13. Copywriting Contract

**Language: English**, matching the interface (owner decision, this milestone).
The **materials** gate — British English, `Thursday 18 Sept`, 24-hour — governs
posters, not the app (`41-UI-SPEC.md` §11). The app's date form is §6's.

### 13.0 The template's five rows

| Element | Copy |
|---------|------|
| Primary CTA | **`Announce this night`** — the only CTA in the phase. S1 has none: the list is read |
| Empty state heading | `The calendar has not been imported yet` |
| Empty state body | `Run the import on the machine that holds the calendar file. There is nothing to upload here — the file never leaves that machine.` |
| Error state | `We could not read the production calendar.` / `This is a failed read, not an empty calendar. Reload the page; nothing in the data has changed.` |
| Destructive confirmation | **none — this phase has no destructive action.** The consequential one is §11.2, and its cancel is the autofocus target |

### 13.1 Empty states

| Where | Heading | Body |
|---|---|---|
| S1, never imported | `The calendar has not been imported yet` | `Run the import on the machine that holds the calendar file. There is nothing to upload here — the file never leaves that machine.` |
| S1, imported, no nights | `No nights in the calendar` | `The import ran and read no nights. Check that it was given the right file.` |
| S2, no pieces written | `Nothing is written for this night yet` | `Every piece below is a proposal until it is written in the calendar file.` |
| S2, no checklist items | `This format owes no production steps` | `Pieces still appear above.` |

**Never** `No data`, `Nothing here`, `—`, or an error tone on an empty state.

### 13.2 Refusals and failures — two facts, never one

| Case | Copy |
|---|---|
| Tick refused | `You do not have permission to change this checklist.` |
| Tick failed | `We could not save that tick. The item is unchanged.` |
| Announcement refused | `You do not have permission to announce a night.` |
| Announcement failed | `We could not announce this night. Nothing was written and the series number was not spent.` |
| Read failed | `We could not read the production calendar.` + `This is a failed read, not an empty calendar. Reload the page; nothing in the data has changed.` |
| Count failed | `We could not count` — **never `0`, never `—`** |

**The banned shape is named:** the newsletter form's *"Qualcosa è andato
storto"*, which collapses a network fault, a missing key and a duplicate address
into one indebuggable message. Every error region is `role="alert"` and
distinguishable from every other message on screen.

### 13.3 The three withheld dates — three sentences, never one

| Reason | Copy | Never |
|---|---|---|
| `awaiting_next_edition` | `Waiting for RSNT-009` + `The next edition is not in the calendar.` | a date, `Missing`, `Late`, `Incomplete` |
| `depends_on_lineup` | `Depends on the line-up` | any figure — not `3`, not `0`, not `—` |
| `not_derivable` | `No proposal` + `This listing's anticipation is not a fixed rule, so nothing is proposed. Read it from the calendar.` | a computed date |

The edition in the first row is named with its sigla and its number, taken from
the data. `RSNT-009` above is an **invented** illustration of the form.

### 13.4 Every other string this phase ships

| Element | Copy |
|---|---|
| Tab and page title | `Calendar` |
| Section headings | `PIECES` · `CHECKLIST` · `LAST IMPORT` |
| Piece kinds | `Listing` · `Tonight` · `Recap` · `LiveCut` · `Timetable` · `After Movie` — production's words, and **`Podcast` appears nowhere** |
| Proposal | `Proposed` |
| Stage | `mapped` · `verified` · `contacted` · `acquired` · `stage unknown` |
| State badges | `Late N` · `Diverged` · `Announced` · `Day taken` |
| Commitment | `Not a re:sonate production` |
| Today marker | `Today` |
| Import tallies | `N entries read` · `N nights` · `N pieces` · `N days taken` · `N unclassified` · `N divergences` · `N unsupported recurrences` |
| Tick author | `Ticked by <staff> · <date>` |
| Announcement body | §11.2, four parts in order |

**Sound:** no string, class name, component name or comment in this phase says
what a format *sounds like*. `RamaDub`, `MotionLab` and `re:sonate` have no
written manifesto, and a surface may not allude to one (`sound-manifesto.md`).

**Format names:** `SunSet` · `RamaDub` · `MotionLab` · `re:sonate` — CamelCase,
rendered literally, `normal-case` on the element, no CSS transform, normal `e`.

**Retired sigle are never rendered** (`production-calendar.md`). If one appears in
the data, it is an unclassified entry and belongs in §10's tally, not on a row.

---

## 14. Accessibility Contract

- **Every pairing introduced here carries its computed ratio** — §5.3. No Phase
  40 or 41 value was changed to make a number look better.
- **Colour is never the only channel.** `Late`, `Diverged`, `Announced`, `Day
  taken`, `Proposed` and every stage are **words**. Remove all colour from this
  surface and every fact it states survives — which is the test, and this surface
  passes it because §5.2 refused the one hue that would not have.
- **Touch targets 44 × 44 CSS px**, keyed off pointer capability and never off
  width. The single permitted shrink is `pointer-fine-only:min-h-9` on
  `DataTable`'s desktop row actions, a branch that never renders on a phone.
- **The focus expression, unchanged:** `focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-ink`. The 2px offset is
  load-bearing and may not be dropped for density. `focus:outline-none` with no
  replacement does not survive.
- **Two trees, never a transformed table** — `display:none` removes the hidden
  branch from the accessibility tree; a `display:block` override on `<tr>`/`<td>`
  destroys header/cell association, and this product's primary engine is WebKit.
- **The checkbox is a real checkbox**, labelled by `htmlFor`, and its tick raises
  no dialog and moves no focus.
- **The dialog's behaviour is the platform's** — Escape, focus trap and
  background inertness from `showModal()`.
- **`aria-current="page"`** on the active navigation entry, alongside its colour.
- **Body stays 14px minimum; label/data is 12px.** `text-[10px]` and
  `text-[11px]` are not declared sizes and do not appear here.
- **Reduced motion:** this phase adds no animation. The only motion is
  `Skeleton`'s `animate-pulse`, which already exists.
- **The `Late` badge's accessible text is the badge's text.** No `aria-label`
  restating it differently: two names for one fact is how a screen reader and a
  screen disagree.

---

## 15. What can be checked mechanically

`41-UI-SPEC.md` rule 3: a value fixed without its exemption list already written
is a gate nobody trusts. These are scoped to the calendar surface's files
(`src/app/(admin)/admin/calendar/**` and `.../(work)/calendar/**`) and to nothing
else.

| # | Assertion | Exemptions |
|---|---|---|
| **U1** | The string `Podcast` appears **zero** times — labels, comments, identifiers, all of it | none |
| **U2** | No `<input type="date">`, no `type="file"`, no date-picker import | none — D-44-02 and D-44-26 |
| **U3** | No `new Date(`, `toISOString`, `toLocaleDateString`, `Intl.DateTimeFormat` | none — §6 |
| **U4** | `conforms_to_rule` appears in no JSX and reaches no prop of a rendering component | none — D-44-10 |
| **U5** | A piece's date is rendered only through `PieceDate` | none — §7 |
| **U6** | `Badge tone="emphasis"` occurs only on `Late` and `Diverged` | none — §5.3 |
| **U7** | No `--sem-warn` / `bg-amber` / format identification colour is applied to a row | none — §5.2 |
| **U8** | `normal-case` is present on every element rendering a format name, a sigla or the brand | none |
| **U9** | The reversed glyph does not occur (the check matches by code point, never by writing the character into the script — `verify-tokens.mjs`'s `REVERSED_E` discipline) | none |
| **U10** | No `SUMMARY` value, no venue word and no line-up reaches a `console.*`, a thrown message or an analytics call | none — §17 |

**None of these proves the surface is correct**, and the plan must not claim
otherwise. There is no test runner for the product (`CLAUDE.md` Guardrail 1):
verification is `npm run build`, these string assertions, and a **written manual
procedure** with `file:line` evidence. The one thing only a person can settle is
the one this document exists for — that a proposed date does not read as settled
— and it belongs in a written procedure with `Result: pending`.

---

## 16. Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | **none** — not initialised; refused by D-40-01, re-refused by D-41-20 | not applicable |
| third-party | **none declared** | not applicable |

`components.json` verified absent 2026-08-15. No UI kit is present in
`package.json` and none is proposed. `44-RESEARCH.md` §Package Legitimacy Audit
adds no npm dependency either, so no vetting gate ran — **recorded as evidence,
not as intent.** If a plan proposes any package, the legitimacy audit re-runs
before installation and the proposal answers first why the platform feature is
insufficient.

---

## 17. Repository Safety

- **`.planning/` is tracked and this repository is PUBLIC.** This file is an
  irreversible publication (`ai-engineering.md`, *gate la pianificazione è
  pubblica*).
- **Nothing in this file came out of `docs/Music-*.ics`.** The file was not
  opened for this document: a UI contract needs the material's **structure**,
  which `44-CONTEXT.md` and `44-RESEARCH.md` already describe, and not its
  content.
- **Every example above is invented and labelled.** `RSNT-009`, `RMDB-BZ-001`,
  `Tue 12 May 2026`, `92 entries read`, `Late 2` — illustrations of a **form**,
  never instances. Sigle and format names are used because
  `.claude/rules/production-calendar.md` already publishes them.
- **No venue under negotiation, no unannounced date, no line-up, no dj, no
  personal name and no third-party organisation is named here.** Where a venue
  would be, the placeholder is `<venue>`; where a person would be, `<staff>` or
  `<dj>`.
- **The runtime rule is stricter than this document's.** On the surface itself:
  the venue word renders **only** behind the capability, and a `SUMMARY`, a venue
  word or a line-up reaches **no** log line, no thrown message, no error toast,
  no analytics event and no page `<title>`. Diagnostics carry a `UID` and a reason
  code, which are safe to read anywhere (`44-RESEARCH.md` §Confidentiality
  Controls).
- **Structure crosses, content never does** (D-40-03).

---

## Owner checkpoints — not blockers for planning

The standing constraint in `44-CONTEXT.md` returns anything touching **access,
money, the door or venue secrecy** to the owner. Two items below touch venue
secrecy and are raised rather than decided. Neither blocks a plan being written;
both block the plan that implements the announcement act.

| # | Question | Why it is not mine |
|---|---|---|
| **1** | **May a night whose space is not `acquired` be announced at all — and if it may, is `venue_secret` forced on?** A plan row can carry a space at stage `mapped`. Announcing publishes the night; if the venue travels with it, a space still in negotiation is named in public, which `venue-acquisition.md` says closes the negotiation badly and closes it for us | Venue secrecy. §11.2 part 1 renders whatever the answer is; the answer is the owner's |
| **2** | **Does the announcement confirmation name the venue in its own text?** Naming it makes the consequence concrete; not naming it is one fewer place the word exists | Venue secrecy |

| # | Open question | Consequence of leaving it open |
|---|---|---|
| **3** | **`40-UI-SPEC.md` Open Question 3 — `--sem-warn` is `--amber` is SunSet's identification colour** — is still open, and §5.2 works around it by drawing no format colour at all. | The workaround is sound and costs one glance. Answering the question later would let the calendar draw a format stripe; nothing here has to be undone to get there |
| **4** | **Where is a venue stage authored?** The calendar file does not carry one and must never be read for one. `44-RESEARCH.md` Open Question 4 proposes a nullable column filled by hand or by Phase 45. | Until then every row reads `stage unknown`, which is honest. The surface renders whichever answer arrives without changing |

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

*Phase 44 — written 2026-08-15. Every contrast ratio computed with the WCAG 2.x
relative-luminance formula against the named ground, reproducing `40-UI-SPEC.md`
§4.1 exactly where the two overlap. Every claim about the current tree carries a
`file:line` or the command that produced it. Contains no venue under
negotiation, no unannounced date, no line-up and no personal name, and nothing
read out of `docs/`: `.planning/` is tracked and this repository is public.*
