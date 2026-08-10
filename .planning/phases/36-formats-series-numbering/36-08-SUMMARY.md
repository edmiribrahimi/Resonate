---
phase: 36-formats-series-numbering
plan: 08
subsystem: catalogue-surface-components
tags: [client-components, radiogroup, named-refusals, dialog, accessibility, public-repo]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: createFormat / updateFormat / createSeries / updateSeries and the CatalogueRefusal union (36-07)
  - phase: 36-formats-series-numbering
    provides: FormatMarker, the one element that carries `normal-case` explicitly (36-11)
provides:
  - ColorSwatchPicker — the six-choice colour control, a deliberate neutral among them, no way to express a gradient
  - CreateFormatModal — create and edit a format, one sentence per refusal, no control that can announce one
  - CreateSeriesModal — create and rename a series, with the publishing field's contract above the keyboard
  - CATALOGUE_COLOR_HEXES and catalogueColorLabel — so a caller can name a colour a person just pressed
affects: [36-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The first `radiogroup` / `role=radio` in this repository — roving tabindex, arrows inside, Tab out"
    - "A rule enforced by inexpressibility rather than validation: no input exists through which a gradient could arrive"
    - "A refusal table narrowed to the refusals its two actions can actually return, with a subset assertion instead of a total Record"
    - "A `catch` that branches on the SHAPE of a failure, because a production build redacts the message of a thrown Server Action error"
    - "The first helper text under a field in this tree — the forms already here use placeholders only"

key-files:
  created:
    - src/app/(admin)/admin/formats/ColorSwatchPicker.tsx
    - src/app/(admin)/admin/formats/CreateFormatModal.tsx
    - src/app/(admin)/admin/formats/CreateSeriesModal.tsx
    - .planning/phases/36-formats-series-numbering/36-08-SUMMARY.md
  modified: []

key-decisions:
  - "The refusal tables are narrowed to the reachable refusals rather than total over `CatalogueRefusal` — a total Record would require writing into `CreateFormatModal` the exact token the acceptance check for *this form cannot announce a format* forbids, and a check whose only match is its own prohibition is a check that gets ignored"
  - "A taken swatch carries a slash glyph, not only reduced opacity — the same discipline as the check glyph on the selected one, since this is the control where colour must never be the only channel"
  - "The `catch` branch distinguishes an unreachable server from a refused request by shape, not by message: the message is redacted in production, so reading it would have produced a blank sentence where it counts"
  - "The code field is read-only while editing a format, because `updateFormat` takes no code argument — a sigla already on material does not change"

patterns-established:
  - "Where a component must forbid a token, the token is not written in the component — the prohibition is described instead, so the grep that guards it cannot go green on its own prose"

requirements-completed: []  # deliberately empty — D-36-19

# Metrics
duration: 34min
completed: 2026-08-10
---

# Phase 36 Plan 08: The catalogue's two modals and its colour control — Summary

**A colour control that cannot express a gradient because no input exists through which one could arrive — and two dialogs in which twenty-two distinct refusals produce twenty-two distinct sentences, none of them shared.**

## Performance

- **Duration:** ~34 min
- **Tasks:** 3 of 3
- **Commits:** `08af593`, `0b904b9`, `31857d6`
- **Components rendered:** zero. Nothing here has been mounted; see *What this does not prove*.

---

## What was built

Three client components under `src/app/(admin)/admin/formats/`, none of which fetches
data of its own. Plan 36-09 mounts them.

### `ColorSwatchPicker.tsx` — the constraint made inexpressible

Six flat choices, held as a **total `Record`** over a declared union
(`CatalogueColorKey`), the discipline `EventForm.tsx:100-104` already uses and
`[id]/assignments/actions.ts:72-82` states as a contract: a seventh choice cannot
reach the interface without a label, and a removed one leaves an unreachable
label. Both halves fail the build.

| Choice | Hex | vs `#141414` |
|---|---|---|
| Amber | `#FFB25E` | 10.34:1 |
| Orange | `#FF7A2F` | 7.09:1 |
| Pink | `#FF5C93` | 6.32:1 |
| Pink soft | `#F6B6D2` | 11.00:1 |
| Violet | `#A874E8` | 5.55:1 |
| **Neutral grey** | `#8C82A6` | 5.14:1 |
| ~~Violet deep~~ | ~~`#5B2A9E`~~ | **1.99:1 — excluded, recorded in a comment at `:98`** |

The neutral is not filler. D-36-11 makes a colour mandatory, and *mandatory*
would otherwise push a format with no decided palette into borrowing another
format's identity — which is exactly what `brand-visual-system.md` forbids. The
grey is the answer a format gives when the honest answer is *not yet decided*.

**There is no gradient input and no free hex field**, and the file says why in
prose: the sunset gradient is SunSet's exclusive signature, and rather than
validate against it the control offers flat swatches only, so there is no channel
through which another format could take it. **The gradient's own CSS declaration
is not written in the file** — writing it would make the acceptance grep match
the very sentence forbidding the thing, the defect
`[id]/assignments/actions.ts:58-62` already records.

**The `radiogroup` is the first in this repository.** Measured before writing:
zero matches for `radiogroup` and `role="radio"` anywhere in `src/`. Roving
tabindex, so exactly one swatch is in the tab sequence — arrows move inside the
group, Tab leaves it, and a taken swatch is skipped by both.

**Colour is never the only channel, in the one control where that would be
fatal:** the selected swatch carries a 2px ring **and** a check glyph
(`:286`, `:308`); a swatch held by another active format carries a slash glyph
**and** `used by {Name}` in its accessible name, plus `aria-disabled`.

### `CreateFormatModal.tsx` — one sentence per cause

The `<dialog>` shape the repository already uses (`max-w-md`, `rounded-2xl`,
backdrop click closes, the open/close effect copied from
`CreateVenueModal.tsx:37-50`), serving creation and editing from one component.

**The one branch of `CreateVenueModal` deliberately not copied** is the `catch`
at `:119-123`, which renders a thrown error's own message. Next redacts that
message in a production build (`src/lib/capabilities/server.ts:59-63`), so a
client branching on it works under `next dev` and prints a blank where it counts.
This form branches on the **returned** `CatalogueRefusal` instead.

Twelve reachable refusals, twelve sentences, each attached to its own field with
`aria-invalid` and `aria-describedby`:

| Field | Refusals |
|---|---|
| Name | `invalid_name`, `slug_empty` |
| Code | `invalid_code`, `duplicate_code` |
| Colour | `invalid_color`, `color_taken` |
| Form | `invalid_id`, `format_not_found`, `invalid_sort_order`, `duplicate_refused_by_database`, `precheck_failed`, `write_failed` |

`color_taken` is the one that had to be assembled here: the action returns it
**without a holder name on purpose**, so a format's name never travels inside a
refusal value. The modal holds the catalogue, so it names the holder from the
colour that was just pressed — `{Colour} is already used by {Name}. Pick another.`

**A network failure, a permission refusal and a duplicate code produce three
different sentences.** The first two arrive as *throws* (the capability guard
throws; the network throws) and both messages are redacted, so the `catch`
branches on the **shape** of the failure rather than its text — `TypeError` or
`navigator.onLine === false` means the request never left; anything else means
the server refused it.

**The colour is required, and the refusal is produced before any request.** An
empty colour short-circuits in `handleSubmit`; `checkColor` refuses the same
absence at the server and `formats_color_hex_check` refuses it at the row. Three
halves, none of which substitutes for another.

**This form cannot announce a format.** No control, no argument, and neither the
publication action's name nor its argument appears anywhere in the file
(D-36-17). Publication is a separate export called from the catalogue surface.

### `CreateSeriesModal.tsx` — the field that publishes says so

Same shell. The format arrives as a prop and is rendered as a **fixed label built
from `FormatMarker`** — not a select, not a combobox, not a disabled control that
one deleted attribute would re-enable. `updateSeries` takes no format argument,
and the file states the reason the constraint alone does not cover: the
database's half is **conditional**, so a series with no nights yet would be
repointed happily, and an offered control would open the operation for exactly
the rows where nobody would notice. While editing, the format is not on the form
at all.

`FormatMarker` was reused rather than re-implemented for the reason its own
docblock gives: it is the one element carrying `normal-case` explicitly, and
`text-transform` inherits — a second element rendering a format name inside an
admin surface would be a second element with no guarantee about its own casing.

Beneath the public name, `text-xs text-muted`, verbatim from the copywriting
contract:

> This name is shown publicly on every night in this series. Do not put a venue
> in it unless that venue is already public for every night in the series.

**This is the first helper text under a field in this tree** — the existing forms
use placeholders only — and it is introduced here because it is the field's
contract, not decoration. The § S2 structural fallback holds the line if it is
ignored, and the two are stated in the file as *not substitutes*. No filter
inspects the name's content, and the comment says why: no test can tell a venue
from a word, and a rejected string teaches a workaround rather than a question.

Ten reachable refusals, ten sentences. A **retired format that cannot take a new
series** and a **duplicate code inside the format** are two different failures
and read as two different sentences.

The name placeholder is `RamaDub x <venue>` — the format name is already public,
and the venue is the invented placeholder `36-PATTERNS.md` uses for exactly this
reason. No real venue, acquired or otherwise, appears in any of the three files.

---

## Verification — what was run, and what it can and cannot prove

| Gate | Result |
|---|---|
| `npm run build` after each of the three tasks | **exit 0**, three times — `✓ Compiled successfully`, typecheck clean |
| `npx tsc --noEmit` after each task | **zero errors**, project-wide |
| `npx eslint` on each new file | clean — no error, no warning |
| `npm run verify:routes` | **PASS** — both checks green |
| `npm run verify:capabilities` | **5/5 green, 0 warnings** |

The build was **green on entry** as well: `tsc --noEmit` reported zero errors
before the first line was written, so the two red files `36-07-SUMMARY.md`
recorded had already been repaired by the plans that owned them. Nothing in
`36-10`'s or `36-12`'s territory was touched.

### The acceptance greps from the plan

| Gate | Required | Got |
|---|---|---|
| `radiogroup` in `ColorSwatchPicker` | ≥1 | 2 |
| `role="radio"` | ≥1 | 1 |
| `5B2A9E` | 1, in a comment | 1, at `:98`, inside the palette docblock — never in the offered set |
| `linear-gradient` \| a colour input | 0 | **0** |
| the six offered hexes | exactly the six measured | exactly the six |
| `aria-disabled` | ≥1 | 1 |
| ring **and** glyph in the selected branch | both | both — `:286` ring, `:308` check path |
| `CatalogueRefusal` in `CreateFormatModal` | ≥1 | 8, and the branch reads a returned value |
| the thrown-message property, read in code | 0 | **0** — and the property is not spelled in the file at all |
| `Something went wrong` \| `An error occurred` | 0 | 0 in all three files |
| `aria-invalid` in `CreateFormatModal` | ≥1 | 2 |
| the publication token in `CreateFormatModal` | 0 | **0** |
| `uppercase` in `CreateFormatModal` | code input only | 1 occurrence, on the code input; the name field carries `normal-case` |
| `shown publicly on every night` | 1 | 1, verbatim |
| a control that changes a series' format | none | none — 0 `<select>`, 0 `role="combobox"` |
| `text-xs text-muted` in `CreateSeriesModal` | ≥1 | 3 |
| the reversed e | 0 | 0 in all three files |

### What this does **not** prove

- **Not one of these components has been rendered.** No dialog has opened, no
  swatch has been pressed, no refusal has reached a person's screen. A green
  build says the code compiles and the types line up; it says nothing about
  whether the arrow keys move focus the way the docblock claims, or whether the
  check glyph is legible on the grey.
- **There is no test runner for the product** (`meta-gates.md`). Nothing here is
  verified because tests pass — there are none.
- **The keyboard behaviour and the touch targets are unproven.** 44 × 44px is
  written as `h-11 w-11`, which is 44px by Tailwind's scale; that it is reachable
  one-thumbed on a phone is a claim about a device nobody has held here.
- **`color_taken` has never been produced.** The sentence that names the holder
  depends on the `takenBy` map the mounting surface supplies, and that surface
  does not exist yet (plan 36-09). Supplied wrongly — retired formats included —
  the picker would refuse a colour that is actually free, and nothing in this
  plan would catch it.
- **The contrast figures were quoted, not re-measured.** They come from
  `36-UI-SPEC.md`, measured 2026-08-10 against `#141414`. The file names that
  ground, and notes that the modal's own ground `#0a0a0a` is darker — which can
  only raise a light foreground's ratio, never lower it.

### The manual procedure this plan owes, for whoever mounts these

1. Open the catalogue, press `Add format`, and **submit with no colour chosen**.
   Expect `Pick a colour. Every format needs one of its own.` beneath the swatch
   row, and **no network request** in the browser's network panel.
2. Tab to the swatch row. Expect **one** stop, then arrows moving between
   swatches, then Tab leaving the group for the submit button.
3. Choose the colour an existing active format already holds. Expect the swatch
   to be unfocusable, to carry a slash, and to announce `used by {Name}`.
4. Save a format whose code duplicates an existing one. Expect the duplicate
   sentence on the **code** field, and the typed name and code still in place.
5. Turn the network off and press save. Expect the *request never reached the
   server* sentence — different from step 4's, and different again from what a
   caller without `catalogue.manage` sees.
6. Open `Add series`. Expect the format as a label with its swatch, no control
   to change it, and the helper sentence under the public name.

---

## Deviations from Plan

### Departures from the plan text, deliberate and stated

**1. The refusal tables are narrowed to the reachable refusals, not total over `CatalogueRefusal`.**

The plan's acceptance criterion for `CreateFormatModal` requires that the token
naming the publication argument appear **zero** times in the file. One member of
`CatalogueRefusal` is named after exactly that argument, so a `Record` total over
the union would have to write it — and the acceptance check would then match its
own prohibition, which is the defect `[id]/assignments/actions.ts:58-62` records
and `36-07-SUMMARY.md` already refused once for the same reason.

Resolved by declaring the refusals each pair of actions can actually return —
twelve for the format form, ten for the series form, read out of
`admin/formats/actions.ts` return by return — plus an assertion that the narrowed
union is a subset of `CatalogueRefusal`.

**What that buys and what it costs, stated rather than glossed:** a member
renamed or removed from the union turns the assertion red. A member **added** to
the union does not — it reaches the `default` branch. That branch is not a shared
bucket: it prints the refusal's own value, so an unforeseen cause identifies
itself on screen instead of hiding behind a sentence written for something else.
Both files say so in place.

**2. The `catch` branches on the shape of a failure, not on a category the plan implies exists.**

The plan asks that a network failure and a permission refusal produce different
sentences. Both arrive as **throws** — `assertCatalogueManage()` throws, and the
network throws — and a production build redacts both messages, so there is no
category to read. The branch is therefore on `err instanceof TypeError` and
`navigator.onLine`, which distinguishes *the request never left* from *the server
refused it*, and the comment says that is what it distinguishes rather than
claiming to identify a permission refusal it cannot see.

**3. A taken swatch carries a slash glyph, which the plan did not ask for.**

The plan specifies `aria-disabled` and `used by {Name}`. Both are present. The
glyph was added because reduced opacity alone is a visual-only signal with no
text beside it, on the one control whose entire discipline is *the state of a
colour control must not be signalled by colour*. It is the same argument the
plan itself makes for the check glyph on the selected swatch.

**4. The code field is read-only while editing a format.**

`updateFormat` takes no code argument. Rendering an editable field whose value is
silently discarded would be a silent failure; the field is read-only with the
reason beside it — a code is half of a sigla already on material.

### Not done, on purpose

- **No `FMT-*` ticked in `REQUIREMENTS.md`** — D-36-19. These components have
  never been rendered and the surface that mounts them does not exist yet. The
  phase verification ticks them once, with the evidence beside it.
- **`EventTabs.tsx` and `events/[slug]/page.tsx` were not touched** — plan 36-12
  owns them and was running in parallel.
- **`RetireFormatDialog` was not built.** It is in the UI-SPEC's component
  inventory but not in this plan's `files_modified`; building it here would have
  been another plan's work done twice.
- **No size prop was added to `FormatMarker`.** Its docblock records the one
  known divergence — §S5 draws the catalogue row's square at 12px, the component
  renders 8px — and leaves the decision to whoever builds S5. This plan does not
  build S5.

## Issues Encountered

- Three self-matching checks were caught and avoided while writing: the word
  naming a musical category in a swatch-label comment, the thrown-error property
  in a docblock, and the publication argument as a `Record` key. Each was
  rewritten to describe the prohibition without spelling it, so the check that
  guards each file cannot go green on that file's own prose.

## Known Stubs

None. Every field writes, every branch returns a named sentence, and no
placeholder stands in for a call. What does not exist is the **caller**:
`/admin/formats` has no page until plan 36-09, which is that plan's declared
deliverable and not a stub here.

## Threat Flags

None new. Every item in the plan's register is addressed:

- **T-36-08-01** — the helper text is verbatim under the name field, the comment
  states that the § S2 fallback is the rule and the helper is the advice, and no
  content filter was added.
- **T-36-08-02** — the create form has no publication control and neither the
  action's name nor its argument appears in the file.
- **T-36-08-03** — no thrown message is read anywhere; every rendered sentence is
  a fixed string chosen by a returned value, and the raw database error never
  reaches the DOM.
- **T-36-08-04** — the control offers flat swatches only; there is no free input
  and no gradient channel, so the constraint is inexpressible rather than
  validated.
- **T-36-08-05** — twenty-two sentences across the two forms, no shared fallback
  string in either.
- **T-36-08-SC** — no package was installed; no registry was introduced.

## Self-Check: PASSED

- `src/app/(admin)/admin/formats/ColorSwatchPicker.tsx` — present, contains `radiogroup`
- `src/app/(admin)/admin/formats/CreateFormatModal.tsx` — present, contains `CatalogueRefusal`
- `src/app/(admin)/admin/formats/CreateSeriesModal.tsx` — present, contains `publicly`
- `08af593`, `0b904b9`, `31857d6` — all three present in git history
- `git diff --diff-filter=D` across the three commits — empty; no tracked file was deleted

---
*Phase: 36-formats-series-numbering*
*Written and verified 2026-08-10. Three green builds, three clean typechecks, two green verification scripts — and a list of six things nobody has yet seen happen on a screen.*
