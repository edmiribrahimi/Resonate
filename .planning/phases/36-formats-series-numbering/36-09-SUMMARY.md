---
phase: 36-formats-series-numbering
plan: 09
subsystem: catalogue-surface
tags: [admin-surface, capability-guard, confirmation-dialog, staff-nav, rendered-and-looked-at, public-repo]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: createFormat / updateFormat / setFormatListed / retireFormat / restoreFormat / createSeries / updateSeries / retireSeries / restoreSeries and CatalogueRefusal (36-07)
  - phase: 36-formats-series-numbering
    provides: ColorSwatchPicker, CreateFormatModal, CreateSeriesModal, catalogueColorLabel (36-08)
  - phase: 36-formats-series-numbering
    provides: /admin/formats bound to catalogue.manage in CAPABILITY_ROUTES (36-06)
  - phase: 36-formats-series-numbering
    provides: FormatMarker, the one element carrying `normal-case` explicitly (36-06/36-11)
provides:
  - /admin/formats — the catalogue surface, guarded by the key the map binds
  - FormatsCatalogue and RetiredFormatsList — every interactive act on the surface
  - RetireFormatDialog — the first confirmation dialog for a destructive act in this repository
  - the eighth staff tab, and the closure of D1
affects: [36-13, phase verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The first page-level create affordance in this repository — no page had one"
    - "The first confirmation dialog for a destructive action in `src/`"
    - "A count rendered deliberately, with the rule it is an exception to written beside it"
    - "A surface that states an asymmetry next to the control rather than only handling it"

key-files:
  created:
    - src/app/(admin)/admin/(work)/formats/page.tsx
    - src/app/(admin)/admin/formats/FormatsCatalogue.tsx
    - src/app/(admin)/admin/formats/RetireFormatDialog.tsx
    - .planning/phases/36-formats-series-numbering/36-09-SUMMARY.md
  modified:
    - src/lib/routes/staff-tabs.ts
    - .planning/phases/36-formats-series-numbering/deferred-items.md

key-decisions:
  - "The taken-colours map is built from ACTIVE formats only, and the choice was verified by observation rather than by a build: the picker offers the retired format's tint as free, which is the one defect no tool here would have caught"
  - "The page renders the sections and the shell renders the rows — the shell is mounted twice, once per section, because a retired format offers one act and an active one offers four, and a shared row would carry three controls that refuse"
  - "`RetireFormatDialog` was generalised to series with its own copy rather than duplicated: `retireSeries`/`restoreSeries` already existed, and a retired series with no control is worse than one more branch"
  - "8px swatch accepted over §S5's 12px, and no size prop added to `FormatMarker`: widening its API to gain four pixels invites the second element that renders a format name with no casing guarantee"
  - "Restore uses the accent treatment, not the destructive one — it is a decision of its own, which is why it is behind a dialog, but it is not destructive"
  - "No production write was made to manufacture a green: the one refusal that could not be produced is declared as D8 instead"

patterns-established:
  - "A refusal that has a way out says what the way out is, not only what failed"

requirements-completed: []  # deliberately empty — D-36-19

# Metrics
duration: 78min
completed: 2026-08-10
---

# Phase 36 Plan 09: The catalogue surface — Summary

**The four components nobody had ever rendered were mounted, opened on a phone-width
screen and driven — and the one defect a green build could not have caught was
looked for on purpose and found absent.**

## Performance

- **Duration:** ~78 min
- **Tasks:** 4 of 4
- **Commits:** `ba98106`, `30cbf00`, `af9b870`, `429c40a`
- **Production writes:** **zero.** The catalogue was read before and after the whole
  session and is byte-identical; see *Nothing was written*.

---

## What was built

### `(work)/formats/page.tsx` — the route

Guarded by **`CAP.CATALOGUE_MANAGE`**, not `CAP.ORGANIZER_ACCESS` like its two
sibling catalogue surfaces. The divergence is written into the file as a decision:
`catalogue.manage` is `requires_approved = true`, so a **pending** organizer is
refused **at the address** rather than shown a page whose every button refuses
them one press at a time. And it is the key `capability-routes.ts` binds to this
address — the middleware, this guard and the staff tab now read one declaration.

Two reads, and **neither filters `retired_at` nor `listed`**. Both halves of the
reason are in a comment, because both are true: a caller who reaches the query
holds `catalogue.manage` and the RLS arms admit every row; a caller who does not
never reaches it, and would see only the listed formats if they somehow did.

The page shapes, orders, renders the header, the empty state, the `Retired`
heading and the asymmetry sentence — and holds no state.

**The one line on this page that a build cannot check** is the taken-colours map.
`formats_color_active_unique` is partial on `retired_at IS NULL`, so a retired
format **releases** its tint. The map is built from `active`, not from `formats`.
Written from the wrong array it would compile, render, and refuse a colour that is
free. That is why it was verified by opening the page — see below.

### `FormatsCatalogue.tsx` — every act, with words that say what it does

`Add format` had no precedent: measured, **no page in this repository has a
page-level create affordance**. It is assembled from the primary fill at
`CreateVenueModal.tsx:291-297` and the `<dialog>` plumbing at `:37-50`.

The listing control names the **effect**, not the column: `Show on /events` /
`Take off /events`, with a sentence under each row saying whether a chip is on
`/events` for every visitor right now. A format created here arrives unlisted
(D-36-17) and this control is the deliberate second act.

The **series count** is rendered, and the comment says why the rule it breaks does
not apply: rule 1 of the UI spec governs public surfaces, this one is behind a
capability, and without the count the row says nothing.

**Nothing removes.** No control, no action to call, and `ON DELETE RESTRICT` on
both keys underneath. The absence is stated in the file so a reader knows it was
decided.

`RetiredFormatsList` is a second export mounted by the page under its own heading:
a retired format offers one act, an active one offers four, and a shared row would
carry three controls that refuse.

### `RetireFormatDialog.tsx` — the first confirmation dialog in `src/`

Copy verbatim from the contract. `Cancel` takes the default focus — written
explicitly, since nothing in the tree does it — and `showModal()` supplies the
trap. `Retire format` carries the destructive treatment; **`Restore format` does
not**, because restoring is not destructive.

And restoring does not read as an undo. Its body says what the schema makes true:
*"This is not an undo: retiring released its colour, so if another format has
taken it since, this is refused until one of the two takes a different colour."*
The `color_taken` branch names the holder and the way out rather than reporting
that something went wrong.

Recorded in a comment what the dialog is **not**: retiring publishes nothing, is
reversible, and is not a monotone switch. This phase adds none; the monotone guard
it must not break is the series number, held by storing it.

### `staff-tabs.ts` — the eighth tab, and D1 closed

The line was uncommented **without a cast and without widening the type**.
`StaffTab.href` is still `Route`; `grep -c "as Route"` returns 0. The proof is
that `npm run build` exits 0 — which is exactly the check that failed in 36-06
with `Type error: Type '"/admin/formats"' is not assignable to type 'Route'`. The
tab is drawn on the page, verified visually.

---

## Cosa e' stato guardato — what was rendered, driven and seen

The whole point of this plan, per D6: four components had never been rendered by
anybody. They have now. Headless Chrome over the debugging protocol, **390×844**,
`next dev`, with a **real session** minted for the master account through
`admin/generate_link` + `verify` — no password was set and no user row was
written.

### The trap, tested on purpose — and clear

`36-08-SUMMARY.md` flagged the one defect no tool here would catch: *if the
taken-colours map wrongly includes retired formats, the picker refuses a colour
that is actually free.* Read straight off the DOM with the `Add format` dialog
open:

| Swatch | `aria-disabled` | accessible name | target |
|---|---|---|---|
| Amber | `true` | `Amber — used by SunSet` | 44×44 |
| Orange | `true` | `Orange — used by RamaDub` | 44×44 |
| Pink | `true` | `Pink — used by MotionLab` | 44×44 |
| Pink soft | — | `Pink soft` | 44×44 |
| Violet | `true` | `Violet — used by re:sonate` | 44×44 |
| **Neutral grey** | **—** | **`Neutral grey`** | 44×44 |

**The neutral is offered as free**, and the only retired format in the catalogue
is the one that would have claimed it had the map been built from the wrong array.
Four taken, two free, and the two free ones are the two nobody active holds.
**44×44 is measured, not asserted** — `getBoundingClientRect` on all six.

### The six manual procedures 36-08 left — executed, not rewritten

| # | Procedure | Result |
|---|---|---|
| 1 | Submit with no colour | `Pick a colour. Every format needs one of its own.` under the swatch row, and **0 network requests** during the submit — counted on the CDP wire, not inferred |
| 2 | Tab to the swatch row, then arrows, then Tab | one tab stop; `ArrowRight` moves `Pink soft → Neutral grey → Pink soft`, **skipping all four taken**; `Tab` leaves the group for `Add format` |
| 3 | Choose a colour an active format holds | unfocusable (`tabIndex -1`), slash glyph drawn, `used by {Name}` in the accessible name |
| 4 | Save a format with a duplicate code | `Another format already holds this code. A code is never re-issued, so pick a different one.` on the **code** field, and both typed values still in place |
| 5 | Turn the network off and save | `Could not save. The request never reached the server. Nothing was stored…` — **a different sentence from step 4's, and from step 1's** |
| 6 | Open `Add series` | the format is a **label with its swatch**, `0` `<select>` and `0` `role=combobox`, and the publishing sentence verbatim under the public name |

Steps 4 and 5 both **refuse before any insert**, so neither wrote a row —
confirmed by reloading and finding no trace of the probe name.

### The tick glyph on the grey, which was an open claim

Selected, cropped and magnified 4×: the check is drawn near-black on `#8C82A6`
and is **plainly legible**, alongside a white 2px ring with an offset. The four
taken swatches carry a black slash at 40% opacity and read as struck through. The
claim *"colour is never the only channel"* holds on the one control where it had
to.

### The casing, on the surface that made the risk plausible

`FormatMarker`'s docblock argues that an admin surface is where an uppercasing
ancestor is one element away. Rendered here: **`re:sonate` stays lower case**,
`SunSet`, `RamaDub` and `MotionLab` stay CamelCase — in the rows, in the series
labels, in the `Add series` label, and inside the dialog heading
**`Retire re:sonate?`**. The series names use their own explicit `normal-case` for
the same reason and hold too.

### The confirmations

| Check | Result |
|---|---|
| Retire heading | `Retire re:sonate?` |
| Retire body | verbatim from the contract |
| Buttons, in order | `["Cancel", "Retire format"]` |
| Focus on open | **`Cancel`**, measured on `document.activeElement` |
| Focus trap | 7 tabs: every interactive stop is inside the dialog; one lap passes through `<body>`, which is the browser's own wrap and reaches nothing interactive outside |
| Restore heading | `Restore Unclassified?` |
| Restore body | says it is not an undo, names the cause and the way out |
| Restore focus on open | `Cancel` |
| Cancel | closes, nothing happens |

Neither destructive button was pressed.

### Two things seen that are not mine to fix

- **The refusal path of the address works**: an unauthenticated request to
  `/admin/formats` answers `307 → /login?redirect=%2Fadmin%2Fformats`. But the
  login page reads `?next=`, not `?redirect=`. Pre-existing, repository-wide,
  **declared as D7**, not repaired — the parameter a login returns on is access
  material and the allow-list in the auth callback is written around `next`.
- The retired format's colour is `#262626`, which is **not one of the six** and is
  nearly invisible on the card ground. The row stays readable **because it carries
  the word `Retired` as text** — rule 4 doing its job, observed while it mattered.

---

## Verification — what was run, and what it proves

| Gate | Result |
|---|---|
| `npm run build` | **exit 0**, after each task and at the end |
| `npx tsc --noEmit` | **zero errors**, project-wide |
| `npx eslint` on the three new files | clean — no error, no warning |
| `npm run verify:routes` | **PASS** — 24 pages under `(admin)`, 24 patterns; the new page resolves to a pattern in the map |
| `npm run verify:capabilities` | **5/5 green, 0 warnings** |
| `npm run verify:persona` | **7/7 verdi** |
| `npm run verify:redirects` | **PASS** — 15 rows, all 308 at the declared destination, the door not relocated |
| `npm run verify:no-header-identity` / `no-credit-account` / `media-strip` | green |

`npm run lint` is red on `EventTabs.tsx` and on build artefacts — **D5**,
pre-existing, untouched here.

### The acceptance greps from the plan

| Gate | Required | Got |
|---|---|---|
| `CAP.CATALOGUE_MANAGE` in the page | ≥1 | 1 |
| `CAP.ORGANIZER_ACCESS` in the page | 0 | 0 |
| `role ===` / `role.includes` | 0 | 0 |
| a filter on `retired_at` or `listed` in the query | none | none |
| `Retired` in the page | ≥1 | 3 |
| `"use client"` in the page | 0 | 0 |
| `"use client"` in the shell | 1 | 1 |
| `.from(` / `createClient` / `getServiceClient` in the shell | 0 | **0** |
| `setFormatListed` in the shell | ≥1 | 4 |
| `delete` in the shell | 0 outside a comment | 1, in the comment explaining the absence |
| `Something went wrong` / `An error occurred` | 0 | 0 |
| `Nights already recorded under it keep their name` | 1 | 1, verbatim |
| `New nights can no longer be assigned to it` | 1 | 1, verbatim |
| `red-400` in the dialog | ≥1 | 3 |
| `red-400` in `CreateSeriesModal` | unaffected | 3, untouched |
| `delete` in the dialog | 0 outside a comment | 1, in the comment |
| the `Formats` entry in `staff-tabs.ts` | uncommented | uncommented, line 116 |
| `as Route` in `staff-tabs.ts` | 0 | **0** |
| `StaffTab.href` | still `Route` | still `Route` |
| the reversed e, across all four files | 0 | **0** |

### Nothing was written

The catalogue was read before the session and after it. Identical, row for row and
hex for hex — four active formats on their four colours, one retired format on
`#262626`, eleven series. Two refusals were produced end-to-end (a duplicate code
and an offline submit) and **both refuse before the insert**, so neither reached a
row. No destructive button was pressed. No service-key write was made.

### What this does **not** prove

- **The render is headless and on the dev server.** It says nothing about a real
  device, and **no thumb has touched a 44px target**: `h-11 w-11` measures 44×44 in
  the layout, which is a claim about CSS, not about a hand.
- **`color_taken` on restore was never produced.** The branch is written and
  typed; the sentence has never appeared. It is **structurally unreachable today**
  — the only retired format holds `#262626`, which the picker does not offer, so
  no format can take it. Producing it would have meant three production writes, one
  of which creates a row this surface deliberately cannot remove. **Declared as D8
  rather than manufactured.**
- **No pending organizer was refused.** The page's key is `requires_approved`, and
  that is asserted structurally — the guard, the map and `verify:capabilities`
  agree on the key — not observed on a pending account.
- **A green build checks no column name.** No Supabase client here is
  parameterised with `Database`. Every column in the two selects was read out of
  the applied migration by hand — and then, unlike in the earlier waves, actually
  returned rows on screen, which is a stronger check than the build but still not
  a schema check.
- **There is no test runner for the product.** Nothing here is verified because
  tests pass.

---

## Deviations from Plan

### Departures from the plan text, deliberate and stated

**1. The tasks were committed in dependency order, not in plan order.**

The plan numbers the route file 1, the shell 2 and the dialog 3, but the page
imports the shell and the shell imports the dialog. Committing in plan order would
have produced two commits that do not compile. Order used: dialog (`ba98106`),
shell (`30cbf00`), page (`af9b870`), tab (`429c40a`) — each one green on its own.

**2. The shell is mounted twice, once per section, and the page renders the headings.**

Task 1 asks the page to render both sections; task 2 asks the shell to own every
control, which means owning the rows the controls sit in. Both cannot be literal.
Resolved by splitting on the seam that already exists: the page renders the
structure — header, empty state, `Retired` heading, the asymmetry sentence — and
the shell renders the rows, as two exports, because the two sections offer
different acts. A retired format has one control; an active one has four.

**3. `RetireFormatDialog` was generalised to series.**

The plan scopes it to formats and offers a choice for restore. It covers both
directions **and** both subjects, with four distinct bodies.
`retireSeries`/`restoreSeries` already existed from 36-07, retired series already
render in the list, and a retired row with no control would have been a state with
no exit. The retire copy for a format is verbatim; the other three are written to
the same discipline.

**4. `grep -c "as Route"` could not be satisfied while spelling the rejected cast.**

The plan asks both to keep the prose explaining the rejected options and for the
grep to return 0. The prose describes the cast without writing it — the rule this
phase established twice already (36-07 deviation 2, 36-08 pattern): a check whose
only match is the sentence forbidding the thing is a check that gets ignored.

**5. The restore control does not use the destructive treatment.**

The plan reserves `red-500/10` + `red-400` for "this dialog". Applied to the
retire branch and to the refusal box; the restore confirm uses the accent fill,
because restoring destroys nothing. The reserved pair still appears nowhere else
on this surface.

### Auto-fixed issues

None. No bug was found in the four components mounted, and the one behaviour that
could only have been wrong in the mounting surface — the taken-colours map — was
written from `active` on the first pass and then checked by eye rather than
assumed.

### Not done, on purpose

- **No `FMT-*` ticked in `REQUIREMENTS.md`** — D-36-19. The phase verification
  ticks them once, with the evidence beside it.
- **D7 was not repaired.** Pre-existing, repository-wide, and in the access
  domain's file.
- **D5 was not closed.** `npm run lint` is still red on `EventTabs.tsx`; those
  lines are older than this phase and this plan did not touch them.
- **No production row was written to produce a refusal.** See D8.

## Issues Encountered

- Port 3000 was held by another process, so `next dev` moved to 3001 and the first
  navigation landed on somebody else's 404 page. Caught immediately by reading the
  rendered text instead of trusting the URL.
- `verify:redirects` defaults to port 3000 and had to be pointed at the real
  server through `REDIRECT_BASE_URL`.

## Known Stubs

None. Every control calls a real action, every branch returns a named sentence, and
no placeholder stands in for a call.

One **declared limit**, not a stub: the retired section shows a format's series
**count** but does not list them, so a retired format's series cannot be edited
until the format is restored. That is the section's shape — one act per retired
row — and it is stated here rather than left to be found.

## Threat Flags

None new. Every item in the plan's register is addressed:

- **T-36-09-01** — the page asks `CAP.CATALOGUE_MANAGE`, the key the map binds;
  no role list anywhere; `verify:capabilities` and `verify:routes` both green, and
  the unauthenticated request was walked and answered `307`.
- **T-36-09-02** — accepted, and now observed: unlisted and retired rows render on
  this surface and only on this surface.
- **T-36-09-03** — accepted, with the exception written next to the count.
- **T-36-09-04** — the confirmation names the format, states what changes and what
  does not, and opens on `Cancel` — measured on `document.activeElement`.
- **T-36-09-05** — no removal control, no removal action, `ON DELETE RESTRICT`
  underneath.
- **T-36-09-SC** — no package was installed.

## Self-Check: PASSED

- `src/app/(admin)/admin/(work)/formats/page.tsx` — present, contains `CAP.CATALOGUE_MANAGE`
- `src/app/(admin)/admin/formats/FormatsCatalogue.tsx` — present, contains `setFormatListed`
- `src/app/(admin)/admin/formats/RetireFormatDialog.tsx` — present, contains `Retire`
- `src/lib/routes/staff-tabs.ts` — present, contains the uncommented `Formats` entry
- `ba98106`, `30cbf00`, `af9b870`, `429c40a` — all four present in git history
- `git diff --diff-filter=D` across the four commits — empty; no tracked file was deleted

---
*Phase: 36-formats-series-numbering*
*Written and verified 2026-08-10. Four green builds, seven green verification scripts, six manual procedures executed instead of rewritten — and one trap looked for on purpose and found absent, which is the only kind of check that was ever going to catch it.*
