---
phase: 41-shared-primitives-three-tier-layout
plan: 09
subsystem: frontend
tags: [ds-07, ds-08, resp-01, resp-03, dialog, native-dialog, showModal, g2, admin-formats, conversion-manifest]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 03
    provides: "IconButton — the 44x44 icon rung the dialog's close control is — and FOCUS_RING, imported by the swatch picker rather than re-authored"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 05
    provides: "PageShell, Card, Button, PageTitle, SectionHeading, and scripts/conversion-manifest.mjs"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 06
    provides: "Input — the control boundary that measures, and the file this plan added a hint slot to"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 07
    provides: "verify-conversion.mjs — the import-closure walk, the declared-debt shape, and check D, which is the gate that decided a paragraph's measure"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 08
    provides: "Badge, and the measured rule that a default utility inside a primitive must stand down when the caller sets the same property"
provides:
  - "src/components/ui/Dialog.tsx — one dialog, native, sheet below 768px and window above, from three class pairs of CSS"
  - "The status region — a dialog reports its own outcome in its own panel, because a native dialog paints above the toast container"
  - "scripts/verify-dialogs.mjs — G2, three checks, with REMAINING as a written shrinking list of the copies still standing"
  - "The measured fact that react-dom 19 never writes an autofocus ATTRIBUTE, so the attribute form does not survive showModal()"
  - "The measured fact that the seven shells' light-dismiss handler cannot fire, because the wrapper covers the dialog element"
  - "/admin/formats converted whole — six files, seven surfaces in CONVERTED"
  - "An optional hint slot on Input, Textarea and Select, with aria-describedby"
  - "DEF-41-04 — G4 cannot tell a typographic measure from a container maximum"
affects: [41-10, 41-11, 41-12, 42-scanner, 44-calendar, 45-production-sections]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A gate should name the thing, not count a side effect: G2's subject is the dialog SHELL in both its shapes, because the one class string §13 names matches ten of eighteen copies and none of the six byte-identical native shells"
    - "An exemption and a debt are different kinds of thing and must not share a list: a file that will never convert on a list that only shrinks makes the number lie"
    - "A React prop that LOOKS like an HTML attribute may not be one — react-dom 19 implements autoFocus as an imperative .focus() at commit and never writes the attribute, so anything running after commit overrides it"
    - "When a primitive puts the actions outside the form, the submit addresses the form by name through HTML's form-owner attribute — the mechanism exists for exactly that and keeps both routes to submission identical"
    - "A gate that cannot distinguish two things it matches with one regex decides for both: G4 read a paragraph's reading measure as a page's container maximum, and the honest resolution was to change the page and write down the contract gap"

key-files:
  created:
    - src/components/ui/Dialog.tsx
    - scripts/verify-dialogs.mjs
  modified:
    - src/components/ui/Input.tsx
    - src/app/(admin)/admin/formats/CreateFormatModal.tsx
    - src/app/(admin)/admin/formats/CreateSeriesModal.tsx
    - src/app/(admin)/admin/formats/RetireFormatDialog.tsx
    - src/app/(admin)/admin/(work)/formats/page.tsx
    - src/app/(admin)/admin/formats/FormatsCatalogue.tsx
    - src/app/(admin)/admin/formats/ColorSwatchPicker.tsx
    - scripts/conversion-manifest.mjs
    - .planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md

key-decisions:
  - "G2 check B is keyed on the dialog SHELL in both its shapes — the hand-rolled overlay AND a native <dialog> outside the primitive — not on the one utility §13's G2 row names. Measured: that utility matches ten of the eighteen copies and NONE of the six byte-identical native shells, which are the copies D-41-09 is actually about and the ones whose docblocks name each other. A check keyed on the side effect would have gone green while six copies of the extracted thing stood untouched."
  - "Lightbox is exempt from check B and deliberately NOT on REMAINING; MyMediaSection is on REMAINING and is the reason the signature is not keyed on role=dialog. The plan grouped both as exemptions; they are different kinds of thing. A file that will never convert, placed on a list that can only shrink, guarantees the number never reaches zero — and a number that cannot reach zero is a number that lies."
  - "Initial focus is imperative, after showModal(), and the autoFocus prop is deleted. §8.3 names `autofocus`; read out of the installed react-dom 19, autoFocus is skipped by the attribute writer and implemented as .focus() at commit — no attribute is ever written — and showModal() runs in an effect AFTER that commit and re-performs the focusing steps. Picking the attribute would have picked the half that loses, on a destructive confirmation."
  - "RetireFormatDialog takes the DEFAULT md width, not the lg the plan's parenthetical assigned. §8.3's lg list is CLOSED and names six form dialogs; a confirmation with zero fields is not among them. A two-button question does not become easier to answer by being wider."
  - "Input gains an optional hint prop. The series name's venue-secrecy sentence is programmatically associated with its field today; converting onto a control with no hint slot would have kept the sentence visible and dropped the association — a regression a sighted reviewer cannot see, on the one field in this phase that publishes."
  - "The light-dismiss handler is carried across and is INERT, and that is written down rather than left to be found. Measured: the dialog element carries no padding and the wrapper is h-full w-full, so the dialog exposes no clickable area and every outside click lands on the wrapper. All seven shells have this property. Making it live would mean an outside click discards a half-typed form, which is a behaviour decision and not an extraction's."
  - "The status region sits BELOW the scroller rather than as the body's last child. The body is the only scroller, so an alert placed inside it can be below the fold at the moment it appears — an error somebody has to scroll to find, in a repository with no error tracking."
  - "The catalogue's two state marks take the SAME Badge tone. Which of 'On /events' and 'Not on /events' is the better state is not a thing a hue may decide: a format deliberately unannounced is not a format in a worse state, and the words are already the channel."
  - "The retired section's paragraph lost its reading measure rather than the gate losing its check. §4 has no clause for a typographic measure, this plan does not own verify-conversion.mjs, and an inline style would have been evasion with a different spelling. Recorded as DEF-41-04 with the cost stated."

requirements-completed: [DS-07, DS-08, RESP-01, RESP-03]

# Metrics
duration: ~150min
completed: 2026-08-12
tasks: 3
commits: 3
files_changed: 11
---

# Phase 41 Plan 09: One Dialog, From the Platform Summary

**Eighteen copies of one dialog existed on this tree — seven native
`<dialog>` + `showModal()` shells byte-identical across six of them, and eleven
hand-rolled overlays that handle none of Escape, the focus trap or background
inertness. `src/components/ui/Dialog.tsx` is the one implementation, extracted
from the ancestor of the copy tree so that its provenance was already written in
two other files' docblocks before anybody went looking. `/admin/formats` is
converted whole and is the first surface to render it: three of the eighteen
left the tree, and `verify-dialogs.mjs` prints the fourteen that remain on every
run. Two measurements changed a decision the plan had already made — the
`autofocus` attribute §8.3 names is never written to the DOM by this React, so
it cannot survive `showModal()`; and the light-dismiss handler all seven shells
carry cannot fire at all.**

## Performance

- **Duration:** ~150 min
- **Tasks:** 3, one commit each
- **Files changed:** 11 — 2 created, 9 modified, **0 deleted**
- **Files under `scanner/` or `(admin)/door/` touched:** **0**, asserted by
  `git diff --name-only` over the whole plan
- **Packages added, removed or changed:** **0** (D-41-20). `package.json`
  untouched — the dialog's behaviour comes from the platform, which is why no
  headless library was needed

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | The `Dialog` primitive, and G2 | `3f8f809` | `src/components/ui/Dialog.tsx`, `scripts/verify-dialogs.mjs` |
| 2 | The three formats dialogs onto the primitive | `c15abfd` | the three dialogs, `Input.tsx`, `verify-dialogs.mjs` |
| 3 | The rest of `/admin/formats`, and the manifest | `0252d56` | `page.tsx`, `FormatsCatalogue.tsx`, `ColorSwatchPicker.tsx`, `conversion-manifest.mjs`, `deferred-items.md` |

## The `REMAINING` count, before and after — the number the plan asked for

| Moment | `REMAINING` | What it counts |
|---|---|---|
| **Task 1**, gate first run | **17** | eleven hand-rolled overlays + six native shells. Eighteen copies exist; `Lightbox.tsx` is the eighteenth and is a declared exception rather than a debt |
| **Task 2**, after the conversion | **14** | the three formats shells left the tree, and their three lines left `REMAINING` in the same commit |

**Three lower, as the acceptance criterion asks.** The three entries were not
deleted quietly: the gate printed them as `STALE` first — *"converted; remove
this entry"* — which is the notice that made the deletion a response rather than
a tidy.

The fourteen are named in the constant with the surface that will remove each,
and the constant says plainly what is true: **no remaining plan in Phase 41
declares any of them.** A `target` column naming a plan number would have been a
claim about work nobody has scheduled — the shape DEF-41-03 already records.

## G2's proven reds — every mutation asserted BEFORE its result was read

`ai-engineering.md`'s *gate prova per mutazione*: assert the mutation landed,
then read the outcome, then assert the revert landed. Four reds and one
not-over-eager green.

| # | Check | Mutation | Assertion taken BEFORE reading | Gate exit | After revert |
|---|---|---|---|---|---|
| **R1** | A | the window alignment removed from the primitive | `grep -c 'md:items-center'` → **0** | **1**, naming the part and printing *expected 1, measured 0* | restored, `grep -c` → **1**, exit **0** |
| **R2** | B | the hand-rolled overlay shape added to `src/components/ui/Card.tsx`, a file not on `REMAINING` | `grep -c` on the composed utility → **1** | **1**, naming the file, the line, the shape and the source line; `REMAINING` printed **18** | reverted, `grep -c` → **0**, exit **0** |
| **R3** | B | a native `<dialog>` element added to the same file | `grep -c '<dialog'` → **1** | **1**, naming it as `[native <dialog>]` — **the half §13's literal utility would have missed** | reverted, `grep -c` → **0**, exit **0** |
| **R4** | C | a probe file importing both the primitive and the toast hook | `grep -c` on the hook → **2**, on the specifier → **1** | **1**, naming both lines | probe deleted, exit **0** |
| **G1** | C | the same probe **without** the hook — a file that renders `Dialog` correctly | the hook's `grep -c` → **0** | **0**, *"none of the 1 file(s) rendering Dialog imports the toast"* — the check reads the file rather than ignoring it | probe deleted, exit **0** |

**R3 is the one that mattered.** It is the proof that check B's subject is the
shell and not one class string: with §13's literal reading, R3 would have been
green, and six byte-identical native shells would have been invisible to the
gate written to count them.

**R2 was reverted with `git checkout --`, not with a second substitution.** The
first revert attempt used a `perl` expression that also mangled an unrelated
line; `git diff` showed it, and the file was restored from the index rather than
patched again. `git status` was clean before the commit and `npm run build`
passed afterwards, which is what proves the revert landed.

## The two measurements that changed a decision

### 1. The `autofocus` attribute is never written, so it cannot survive `showModal()`

§8.3 names `autofocus` as the initial-focus mechanism and `41-PATTERNS.md` §2.1
says to pick one of the two in the tree and delete the other. **Read out of the
installed `react-dom@19`, not assumed:**

```
node_modules/react-dom/cjs/react-dom-client.development.js
  :20187   case "autoFocus":  break;          ← the attribute writer SKIPS it
  :22158   newProps.autoFocus && domElement.focus();   ← commitMount calls focus()
```

So `autoFocus` in this tree is an **imperative focus at commit**, and no
`autofocus` attribute ever reaches the DOM. `showModal()` runs in a `useEffect`
— *after* that commit — and re-performs the dialog focusing steps; finding no
attribute, the user agent focuses the first focusable element instead. **The
React prop's focus is overwritten a moment later.**

Two mechanisms, and one of them loses every time. The primitive therefore
focuses imperatively, once, immediately after `showModal()`: the element
carrying `data-initial-focus` if the caller declared one, otherwise the close
control, which is first in the DOM and is the least destructive control by
construction. `RetireFormatDialog`'s `autoFocus` prop is **deleted**, not kept
beside it.

**Why this is not a cosmetic difference.** The property at stake is
`RevealVenueDialog.tsx:243-249`'s sentence, promoted to a rule: *a confirmation
whose Enter key performs the act is a confirmation that did not ask.* Keeping
the attribute would have kept the sentence and lost the property.

### 2. The light-dismiss handler in all seven shells cannot fire

The `<dialog>` carries no padding and the wrapper immediately inside it is
`h-full w-full`, so the dialog element exposes **no clickable area of its own**
and every click outside the panel lands on the wrapper — where
`e.target === e.currentTarget` is false. The `::backdrop` is behind an element
that covers the viewport, so it cannot be reached either.

It is **carried across exactly and documented as inert**, because making it live
is a behaviour change in the direction of data loss: an outside click would
discard a half-typed form. That is a decision for a plan that takes it, and the
handler is kept where §8.3 puts it so the decision is one line rather than a
rediscovery.

## Deviations from Plan

### 1. [Contract conflict, resolved in §8.3's favour] `RetireFormatDialog` takes `md`, not `lg`

- **Found during:** Task 2, before editing.
- **The two halves that collide:** the plan says *"the `Dialog` primitive at
  `size="lg"` (all three are form dialogs of more than four fields)"*. §8.3's
  `lg` list is **closed** and names six files — `CreateFormatModal`,
  `CreateSeriesModal`, `CreateVenueModal`, `CreateArtistModal`,
  `EditVenueButton`, `EditArtistButton`. `RetireFormatDialog` is not on it, and
  it is **not a form dialog at all**: it has zero fields, one sentence and two
  buttons.
- **Reconciled line by line**, per the phase's inherited lesson. The closed list
  is the contract; the plan's parenthetical is the error, and it is wrong twice
  over — the two files that *are* on the list carry three fields each, not more
  than four, so the rationale does not even describe its own enumeration.
- **Resolution:** the two form dialogs take `lg`; the confirmation takes the
  default `md`. A two-button question does not become easier to answer by being
  wider.
- **Commit:** `c15abfd`.

### 2. [Reconciliation] G2 check B is keyed on the shell, not on §13's one utility

- **Found during:** Task 1, while building `REMAINING` by measurement.
- **Issue:** §13's G2 row says *"no file outside the primitive declares `fixed
  inset-0 z-[60]`"*. Measured on this tree, that utility appears in **eleven**
  files — and in **none** of the seven native shells, which carry no `z-` at all.
  The plan's own instruction to build `REMAINING` from *"the eleven hand-rolled
  overlays **and** the four native shells"* cannot be satisfied by a check that
  can only see the first group: eleven of the fifteen entries would have been
  measurable and four would have been decoration.
- **Consequence had the literal reading been taken:** the gate goes green while
  six byte-identical copies of the extracted thing stand untouched — including
  the two whose docblocks name each other as sources, which are the whole
  argument for D-41-09. It is the shape the prior wave already recorded: *a debt
  tracked by a proxy metric closes when anything moves the metric.*
- **Resolution:** check B's subject is a **dialog shell declared outside the
  primitive**, in the two shapes it takes — the hand-rolled overlay (all three
  parts on one line) or a native `<dialog>` element. **Proven in both
  directions:** R2 catches the first, R3 catches the second.
- **Commit:** `3f8f809`.

### 3. [Reconciliation] `Lightbox` is an exemption; `MyMediaSection` is a debt

- **Found during:** Task 1.
- **Issue:** the plan lists both as *"exemptions as named constants with their
  reasons"*, and its arithmetic counts `Lightbox` among *"the four native shells
  this plan does not convert"* — that is, on `REMAINING`. Both cannot hold, and
  the two files are not the same kind of thing:
  - **`Lightbox.tsx`** is declared a permanent exception by §8.3 and §13: a
    full-bleed media viewer at every tier with a heavier scrim, correct as it is,
    named *before* this gate existed precisely so a G2 demanding the sheet form
    does not open red on a correct file. It will never convert.
  - **`MyMediaSection.tsx`** is one of §8.3's own *"eleven overlays that go
    away"*. The reason §13 names it is about **signature choice** — it carries
    the tree's only `role="dialog"`, one hit measured, and a signature keyed on
    that attribute would find one file and miss every other copy. That is a
    warning, not an exemption from the debt.
- **Resolution:** `Lightbox` is exempt from check B and is **not** on
  `REMAINING`; `MyMediaSection` is on `REMAINING`. Both are named constants and
  both are printed on every run with which kind they are.
- **The arithmetic that follows, stated so the number is not read as a
  discrepancy:** `REMAINING` opened at **17** and stands at **14**, not 18 and
  15. A file that will never convert, placed on a list that can only shrink,
  guarantees the number never reaches zero — and a debt whose number cannot
  reach zero is not a debt, it is a decoration.
- **Commit:** `3f8f809`.

### 4. [Rule 2 — missing critical functionality] `Input` gains a `hint` slot

- **Found during:** Task 2, converting `CreateSeriesModal`.
- **Issue:** three fields across the two form dialogs carry a hint sentence that
  is **programmatically associated** with the control through
  `aria-describedby`. `Input` omits `aria-describedby` from its props by
  construction, and had no hint slot — so converting would have kept every
  sentence visible and dropped every association.
- **Why it is Rule 2 and not a nicety:** one of the three is the series name's
  *"Do not put a venue in it unless that venue is already public for every night
  in the series"* — a **venue-secrecy** warning under *the one field in this
  phase that publishes*. A description that no longer reaches a screen reader is
  a regression a sighted reviewer cannot see, on the surface where the cost of
  not reading it is an address.
- **Fix:** an optional `hint` prop on `Input`, `Textarea` and `Select`, rendered
  with an id and named in `aria-describedby` — **failure first, hint second**,
  which is the order the incumbent fields already used.
- **Scope note, because this edits a file the plan does not declare:**
  `src/components/ui/Input.tsx` belongs to 41-06 and is declared by **no other
  plan in this wave** (41-10 declares `DataTable` and `Checkbox`; 41-11 and
  41-12 declare scripts). The change is purely additive — the three existing
  consumers pass no hint and render byte-identically.
- **Commit:** `c15abfd`.

### 5. [Rule 3 — blocking] The submit buttons address their form by name

- **Found during:** Task 2.
- **Issue:** the primitive keeps the actions in their own region, above the
  navigation clearance and **outside** the scrolling body — so the buttons are
  not descendants of the `<form>`, and a `type="submit"` button outside its form
  submits nothing.
- **Fix:** `form={FORM_ID}` on the submit, which is HTML's **form-owner
  attribute** and is the mechanism for exactly this. Both routes to submission
  stay identical: Enter inside a field, and the button.
- **Rejected alternative:** keeping the buttons inside the body. They would then
  scroll away with the form and lose the navigation clearance the primitive
  exists to hold in both tiers.
- **Commit:** `c15abfd`.

### 6. [Gate conflict, resolved against the page] The retired section lost its reading measure

- **Found during:** Task 3, first run of `verify-conversion.mjs` with the new
  surface declared — **exit 1**, check D.
- **Issue:** §4 gives the content maximum to the shell and D-41-06 says a
  converted page writes none of its own. `MAX_WIDTH_RE` matches **any** width
  utility on a declared page file, and the retired section's explanatory
  paragraph carried a **typographic measure** — a property of a `<p>`, not a
  container width on a page root. The two are one string to a grep.
- **Resolution:** the page changed, not the gate. Three reasons, in order: this
  plan does not own `verify-conversion.mjs` and loosening a sibling's gate from a
  conversion commit is how a check acquires an exemption nobody debated; an
  inline style would have been evasion with a different spelling; and §4 has no
  clause for a measure, so adding one is a contract decision that belongs
  somewhere a person reviews it.
- **The cost, stated rather than glossed:** that paragraph now runs the full
  1024px the shell allows, at the small type size. It is the one place on this
  surface that explains why restoring is not an undo, so it is a paragraph
  somebody actually reads.
- **Recorded as DEF-41-04**, with the two measurements, the reasons and the
  question for §4: whether a **measure** is a **maximum**.
- **Commit:** `0252d56`.

### 7. [Measured absence] The catalogue has no pills, so `Chip` has no site here

- **Found during:** Task 3.
- **Issue:** the plan says *"the pills become `Chip` where they are interactive
  and `Badge` where they are not"*. Measured, `/admin/formats` has **no pills**:
  its rows carry plain text spans, and the only `rounded-full` elements on the
  surface are its buttons.
- **Resolution:** the two things that *are* marks — the listing state and
  `Retired` — became `Badge`, which is §8.5's destination for a mark that states
  and cannot be operated. `Chip` gained no consumer here, and did not need one:
  it already has an importer, so check C is unaffected.

## The colour and size decisions on `/admin/formats`, with their reasons

| Site | Was | Is | Why |
|---|---|---|---|
| every dialog's refusal box | a raw palette family at two opacities, in a bordered box | `--sem-crit` ink in the primitive's status region, `role="alert"` | **6.99 : 1** on `--surface` (§8.6). A box around one sentence is a container that states nothing its content does not |
| the row actions | a hand-written pill computing to **28 px** | `Button` at the `sm` rung — 44 px, `--control` boundary | §6.1's floor, on a surface whose primary device is a phone. The boundary goes from the decorative line alias at **1.39 : 1** to **7.14 : 1** |
| the destructive confirm | a bespoke tinted treatment | the `destructive` rung — `--ground` on `--sem-crit` | **7.36 : 1** (§8.5), and it is now a rung rather than one file's invention |
| the listing state, and `Retired` | plain text, one of them ink-differentiated | `Badge`, **both on the same tone** | the tone carries emphasis, never an outcome. A format deliberately unannounced is not a format in a worse state, and the words are already the channel |
| every form field | the legacy boundary alias at **1.39 : 1** | `Input` on `border-control` | **6.78–7.03 : 1** — finding A1, which is what these controls are *for* |
| the swatch picker's focus | `outline-none` plus a 1 px accent ring | the shared focus expression | **finding A3**. The accent ring is **2.52 : 1** against an accent fill — not an indicator at all. The shared one is `--ink` at a 2 px offset, 15.22–17.29 : 1 |
| the swatch's six hexes | six brand hexes | **unchanged, every one** | a format's identification colour is **data on a row**, not a token (D-36-12). The file stays a named exemption in two gates |
| a series name's weight | `font-medium` (500) | `font-semibold` (600) | Phase 40 fixed the type system at two weights and 500 does not exist in it. An inheritance, not a preference |

## Production identity — what did NOT move, and how that is known

The plan and the phase gate both say the same thing: `/admin/formats` is where
**sigle and series numbering** are created and retired, a progressivo already
assigned is already on a printed poster, and numbering appends and never
renumbers. **This plan is the dialog shell and the surface's colour, size and
structure. It changed none of that**, and the assertion is mechanical rather
than remembered:

```
git diff -U0 -- <the three dialogs> | grep '^[+-]' | grep -v '^\(+++\|---\)' \
  | grep -E 'formData|startTransition|progressivo|numbering|retire|Retire|
             createFormat|updateFormat|createSeries|updateSeries|
             retireFormat|restoreFormat|retireSeries|restoreSeries'
```

**Four matches, all accounted for:**

| Line | What it is |
|---|---|
| `+ * … the ten refusals and the asymmetry between retire and restore.` | prose, in the updated provenance docblock |
| `- contract's: `[ Cancel ] [ Retire format ]`.` / `+ The order is the copy contract's: …` | the same sentence, reflowed |
| `- mode === "retire"` → `+ variant={mode === "retire" ? "destructive" : "primary"}` | **the condition is byte-identical**; only its consequent moved from a class string to a variant name |

And in the other direction, the stronger form — **zero removed lines** in any of
the three match `result`, `await`, `setIsSubmitting`, `onSaved`, `onDone`,
`formData`, `navigator`, `sortOrder` or any of the eight action names. The
server actions, the fields, the validation, the ten and twelve refusal branches
and the highest-assigned numbering are untouched.

`RetireFormatDialog` in particular keeps every property §11 asks of a
destructive confirmation: the confirmation step is still there, the destructive
act is still behind the second button, Cancel is still first in the DOM and
still the focus target, and **no Enter key performs the act**. The mechanism
that holds the last one is now stronger than it was — see *The two measurements*
above.

**A retired sigla gains no new mention.** The retired list renders the same
fields it always did; nothing was added to it.

## Verification

Per `CLAUDE.md` Guardrail 1 and `meta-gates.md`: **there is no test runner for
the product**, and nothing below is claimed on the basis of tests passing.

| Check | Result |
|---|---|
| `npm run build` after every task | **exit 0** — compiled, TypeScript clean, 40 static pages |
| `node scripts/verify-dialogs.mjs` | **exit 0** — three checks, `REMAINING = 14` |
| `node scripts/verify-conversion.mjs` | **exit 0** — four checks, **7** surfaces, **40** files scanned, `ColorSwatchPicker.tsx` reported **applied** |
| `node scripts/verify-tokens.mjs` | **exit 0** |
| `node scripts/verify-breakpoints.mjs` | **exit 0** |
| `node scripts/verify-no-viewport-read.mjs` | **exit 0** |
| `node scripts/verify-semantic-separation.mjs` | **exit 0** |
| `node scripts/verify-sunset-gradient.mjs` | **exit 0** |
| `node scripts/verify-media-strip.mjs` | **exit 0** |
| `node scripts/verify-capabilities.mjs` | **exit 2 — a REFUSAL, nothing measured.** It needs Supabase credentials this worktree does not hold, and its state is identical before any change in this plan. Recorded rather than omitted, because an unrun gate reported as absent is how a green becomes a claim |
| `git diff --name-only` over the whole plan | 11 files, **zero** under `scanner/` or `(admin)/door/` |
| `git diff --diff-filter=D --name-only` over the whole plan | empty — **nothing deleted** |
| `git status --short` after the last commit | clean, no untracked files |

### The acceptance criteria, one by one

| Criterion | Result |
|---|---|
| `grep -c 'showModal()' Dialog.tsx` ≥ 1 | **8** (one live, seven in prose); the gate's live-line count is **1** |
| `grep -c 'items-end' Dialog.tsx` = 1 | **1** |
| `grep -c 'md:items-center' Dialog.tsx` = 1 | **1** |
| `grep -c 'z-\[60\]' Dialog.tsx` = 1 | **1** — kept verbatim |
| `grep -c 'md:pb-6' Dialog.tsx` = 0 | **0** — the second author is dropped |
| `grep -c 'useToast' Dialog.tsx` = 0 | **0**. It reached **2** on the first draft, both in prose; the sentences were rewritten so the file never names the hook, which is `ColorSwatchPicker.tsx`'s own discipline — *a check whose only match is the sentence forbidding the thing is a check that gets ignored* |
| A / B / C proven red, mutation asserted first | **R1, R2, R3, R4** — plus **R3** for the shape §13's literal reading would have missed, and one not-over-eager green |
| `grep -c '<dialog'` on the three = 0 | **0 / 0 / 0**. It reached 2 in `RetireFormatDialog`'s prose; both sentences were reworded for the same reason as the line above |
| `grep -c 'ui/Dialog'` on the formats files ≥ 3 | **6** — two each in the three dialogs |
| raw palette on the three = 0 | **0 / 0 / 0** |
| `REMAINING` three lower than in Task 1 | **17 → 14** |
| behaviour-unchanged diff over the three | **four matches, all prose or a byte-identical condition**; zero action-path lines removed |
| `verify-conversion` walks `/admin/formats`, A–D pass | **exit 0**, 18 files in that closure, exemption **applied** |
| legacy tokens on the three Task 3 files = 0 | **0 / 0 / 0** |
| `grep -c '<h1'` on the page = 0 | **0** |
| `CONVERTED.length === 7` | **exit 0** |

## Manual verification still owed — H41-2, and assumption A2 stays OPEN

**Not performed. No green above stands in for it, and this is the part of the
plan's output that could not be delivered.**

The reason is the one 41-05, 41-07 and 41-08 each recorded, and it is stronger
here: the application cannot be run from this worktree because the middleware
reads Supabase credentials on **every** request (`src/lib/supabase/middleware.ts:267-268`;
`.env.local` does not exist here, only the example), and `/admin/formats` is
additionally behind `catalogue.manage`, so observing it needs an authenticated
session as well as a running instance. Pointing a running application at
production is an act requiring an authorisation this agent does not hold.

**Therefore `41-VALIDATION.md`'s assumption A2 — the `showModal()` scroll-lock
claim — is NOT closed by this plan.** It is recorded as unverified in research
and it is still unverified. Nothing in this SUMMARY should be read as an answer
to it, and in particular the primitive makes **no** claim about background
scrolling: it writes no scroll lock of its own, deliberately, because writing
one before observing whether the platform already does it would be a second
author for a behaviour nobody has measured.

**The procedure, written so the person doing it knows what a correct panel looks
like.** Sign in with an account holding `catalogue.manage` and open
`/admin/formats`.

1. **At 390 px** — press `Add format`. The panel rises from the **bottom edge**,
   is full-width, and its top two corners are rounded while its bottom two are
   not. The three fields carry a visible boundary; the buttons sit at the foot
   with clearance above the bottom navigation bar.
2. **At 1280 px** — the same panel is a **centred window**, at most 512 px wide,
   with all four corners rounded and the page visible around it.
3. **Press Escape** at both widths. It closes. Nothing in this codebase makes it
   close — that is the platform, and it is the whole argument for the extraction.
4. **Scroll the page behind the open panel**, at both widths, with the wheel and
   with a touch drag. **Record whether the background moved.** That observation
   is A2, and it is the one this plan could not take.
5. **Tab through the open panel.** Focus must not leave it. Again: no code here
   does that.
6. **Open `Retire` on any format.** Focus must land on **Cancel**, not on the
   retire button, and **pressing Enter immediately must not retire anything**.
   This is the property `RetireFormatDialog` has always claimed and now holds by
   a mechanism that survives `showModal()`; it is the single most important
   observation in this list.
7. **Force a refusal** — try to give a format a colour another active format
   holds. The sentence appears **inside the panel**, above the buttons, in the
   critical ink, and is on screen without scrolling.
8. **The surface itself at 390 / 768 / 1280** (H41-1): one column of cards; the
   side column appears at 768 px and the bottom bar goes; the content **stops
   widening at 1024 px** with the page ground visible on both sides.

**Expected at step 8, and stated so a correct page is not filed as a defect:**
the explanatory paragraph under `Retired` now runs the full content width. That
is DEF-41-04, not a layout bug.

## Known Stubs

**One, and it is inherited rather than introduced.** The primitive carries the
light-dismiss handler §8.3 requires, and that handler **cannot fire** in this
structure — the measurement is in *The two measurements* above and in the file's
own docblock. It is not a placeholder: it is proven-inert code, kept verbatim
because all seven incumbent shells have exactly the same property and making it
live is a behaviour decision (an outside click would discard a half-typed form)
that does not belong to an extraction.

Nothing else. No TODO, no FIXME, no component wired to empty data, no list
seeded with a symbol that does not exist. Every count in `verify-dialogs.mjs` is
a measurement taken on this tree, and every contrast figure is either computed
or read out of `41-UI-SPEC.md` with its inputs.

## Threat model — the six dispositions this plan carries

- **T-41-30 (Tampering — `RetireFormatDialog`):** **mitigated.** The destructive
  rung, Cancel as the focus target, no Enter-to-confirm, no confirmation step
  removed, and the destructive act still behind the second button. The diff
  assertion over `progressivo`, `retire`, the action names, `formData` and
  `startTransition` found **four matches, all prose or a byte-identical
  condition**, and **zero** removed action-path lines. The focus property is
  stronger than before, because the mechanism holding it now survives
  `showModal()`.
- **T-41-31 (Repudiation — a dialog's outcome under the top layer):**
  **mitigated.** The status region replaces the toast inside a dialog, and G2
  check C asserts that no file rendering `Dialog` imports the toast hook —
  proven red (R4) and proven not over-eager (G1). The primitive itself is in
  that check's scope and does not name the hook anywhere, not even in prose.
- **T-41-32 (Tampering — format identification colour):** **mitigated.**
  `ColorSwatchPicker`'s six hexes are untouched, its exemption is a named
  constant in two gates, and `verify-conversion.mjs` now reports that exemption
  as **applied** rather than as unreached — the first time it has been exercised.
  `verify-semantic-separation.mjs` and `verify-sunset-gradient.mjs` both **exit
  0**. No `--sem-*` or `--accent` fallback was introduced for a format colour.
- **T-41-33 (Denial of Service — G2 over correct-for-now copies):**
  **mitigated.** `REMAINING` existed **before** the gate's first run, was built
  by measurement, and can only shrink; a converted file produces a `STALE`
  notice rather than a red; and the one file that will never convert is an
  exemption rather than an entry, so the number can reach zero.
- **T-41-34 (Elevation of Privilege — `/admin/formats`):** **accepted, and
  verified untouched.** The page's `catalogue.manage` guard, its
  `capability-routes.ts` binding and the re-check inside every action are
  byte-identical. This plan adds no route, no query, no input, no user data and
  no branch on `role` or `status`.
- **T-41-SC (Tampering — package installs):** **no package installed, removed or
  changed.** `package.json` is untouched. The dialog's behaviour comes from the
  platform, which is why no headless library was needed (D-41-20).

**Monotone guards:** all three untouched. `venue_reveal_sent` is not reachable
from any file in this plan; no payment state is written; and **the series
numbering is not read, written or renumbered anywhere in these eleven files** —
`highest_assigned` appears only where it always did, as a field the page fetches
and passes through.

## Threat Flags

**None.** No route added, no query, no input, no schema, no network path, no
branch on role or status. One surface changed appearance; it did not change what
it can read or who can reach it.

## What the next plans inherit

- **`Dialog` exists, and an eighteenth shell is now a gate failure.** A file that
  declares its own dialog shell and is not on `REMAINING` fails check B, in
  either of the two shapes a shell takes in this tree.
- **The debt has a number that can be watched: fourteen.** It only goes down,
  the gate prints it on every run, and every entry names the surface that will
  remove it. **No remaining plan in Phase 41 declares any of them** — that is
  written on the constant, not left to be discovered.
- **`RevealVenueDialog` is deliberately still on the list.** It is
  `venue-secrecy` primary and the user interface of a monotone guard;
  §2.1 names it as the wrong first consumer, and converting it is a **Critical**
  change that needs its own plan and its own validation.
- **A dialog reports its own outcome.** Any plan converting one of the fourteen
  passes a `status` rather than raising a toast, and check C will say so if it
  forgets.
- **`Input`, `Textarea` and `Select` have a `hint` slot.** A field with a
  standing description now keeps its programmatic association through a
  conversion; before this plan it could only keep the sentence.
- **A React prop that looks like an HTML attribute may not be one.** The
  `autoFocus` measurement generalises: anything running after commit — and
  `showModal()` is one such thing — can silently overwrite what React did at
  commit. Read the installed package before trusting a prop's mechanism.
- **DEF-41-04 needs a contract answer**, not a code change: whether §4's
  prohibition on a page writing a maximum was meant to cover a paragraph's
  reading measure. Until it is answered, a converted page has no way to set a
  measure.
- **DEF-41-03 is still half open**, and this plan did not close it:
  `src/components/toast/Toast.tsx` still hand-writes the icon rung's contract,
  and no gate reports it.
- **`Chip` still has exactly one importer.** It is not an orphan, but it is one
  surface away from being one, and the next surface with a filter row or a tab
  strip is where it stops being fragile.

## Self-Check

- `src/components/ui/Dialog.tsx` — **FOUND**
- `scripts/verify-dialogs.mjs` — **FOUND**
- `src/components/ui/Input.tsx` — **FOUND**, `hint` present on all three controls
- `src/app/(admin)/admin/formats/CreateFormatModal.tsx` — **FOUND**, imports `ui/Dialog`
- `src/app/(admin)/admin/formats/CreateSeriesModal.tsx` — **FOUND**, imports `ui/Dialog`
- `src/app/(admin)/admin/formats/RetireFormatDialog.tsx` — **FOUND**, imports `ui/Dialog`
- `src/app/(admin)/admin/(work)/formats/page.tsx` — **FOUND**, no `<h1>`
- `src/app/(admin)/admin/formats/FormatsCatalogue.tsx` — **FOUND**
- `src/app/(admin)/admin/formats/ColorSwatchPicker.tsx` — **FOUND**, six hexes intact
- `scripts/conversion-manifest.mjs` — **FOUND**, `CONVERTED.length === 7`
- `.planning/…/deferred-items.md` — **FOUND**, DEF-41-04 present
- commit `3f8f809` — **FOUND**
- commit `c15abfd` — **FOUND**
- commit `0252d56` — **FOUND**

## Self-Check: PASSED
