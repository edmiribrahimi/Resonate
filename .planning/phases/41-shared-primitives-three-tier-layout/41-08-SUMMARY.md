---
phase: 41-shared-primitives-three-tier-layout
plan: 08
subsystem: frontend
tags: [ds-07, resp-01, resp-02, resp-03, skeleton, badge, gallery, membership-register, media, conversion-manifest]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 03
    provides: "IconButton, Chip, FOCUS_RING, AppNav — and the file Badge was always meant to join"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 05
    provides: "PageShell, Card, PageTitle, SectionHeading, Button, and scripts/conversion-manifest.mjs"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 06
    provides: "the declared-absence pattern for a published export with no consumer in its own wave"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 07
    provides: "verify-conversion.mjs — the import-closure walk that turned 'convert the surface' into 'convert what the surface reaches'"
provides:
  - "Skeleton on §8.9's contract, with four exports and its first importers"
  - "SkeletonTile — the square media placeholder the three original exports could not express"
  - "Badge — the non-interactive rung, in Chip.tsx, rendered in the same plan"
  - "/gallery and /admin/members/register converted whole; six surfaces in CONVERTED"
  - "MediaGrid and Lightbox converted, because a declared surface's closure reaches them"
  - "IconButton's orphan debt closed — ORPHANS_DECLARED is now empty"
  - "The measured fact that appending a caller's classes cannot override a NAMED default utility, because Tailwind emits the named rule last"
affects: [41-09, 41-10, 41-11, 41-12, 42-scanner]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A default utility inside a primitive must stand down when the caller sets the same property — appending works only where Tailwind's emission order happens to favour the caller, and for a NAMED value it never does"
    - "A surface is converted when its import CLOSURE is converted; a shared component reached by a declared surface is in scope even when no plan names it"
    - "A shared component with a second consumer on an unscheduled surface constrains how much a conversion may change: token substitutions are value-preserving and may land, layout changes may not"
    - "A debt tracked by a proxy metric is closed by anything that moves the metric — the orphan count went to zero without the work it stood for being done"
    - "An emphasis tone is not an outcome vocabulary: assigning a colour per act would settle an access policy in CSS that the domain declares unwritten"

key-files:
  created: []
  modified:
    - src/components/ui/Skeleton.tsx
    - src/components/ui/Chip.tsx
    - src/components/media/MediaGrid.tsx
    - src/components/media/Lightbox.tsx
    - src/app/(public)/gallery/page.tsx
    - src/app/(public)/gallery/GalleryClient.tsx
    - src/app/(public)/gallery/loading.tsx
    - src/app/(admin)/admin/(work)/members/register/page.tsx
    - scripts/conversion-manifest.mjs
    - scripts/verify-conversion.mjs
    - scripts/verify-breakpoints.mjs
    - .planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md

key-decisions:
  - "The `sm` key in Skeleton's size map STAYS. The plan said to remove it because G6 counts it; measured, G6 does not — verify-breakpoints.mjs:95-110 documents this exact file as the reason its trailing boundary guard exists, and that file contributes zero of G6's 44 counted uses. Removing it would have broken the API the same task forbade changing, to satisfy a text search the gate's own docblock names as the wrong oracle."
  - "MediaGrid and Lightbox were converted although no plan declares them. /gallery's import closure reaches both, and 41-07 built a gate that walks closures — so declaring /gallery converted while leaving raw palette one import away would have been the half-conversion criterion 1 forbids."
  - "The phone stays at two columns in the media grid. §2.2 names 1/2/3 for media grids and the plan asked for it; §2.3's map moves the PREFIX and the base two-column layout was never one. Decisive: MediaGrid's second consumer is the public event page, venue-secrecy primary and owned by a later plan. meta-gates' conflict rule takes the more restrictive reading."
  - "SkeletonTile is a fourth export rather than a height passed through className, because the latter depends on which of two same-property utilities Tailwind emits last — measured unreliable in this very component."
  - "Badge ships two tones and no per-outcome vocabulary. A colour per act would decide in CSS the criterion by which somebody is admitted or refused, which community-membership.md records as NOT WRITTEN. A rejection is a communication, not a hue."
  - "The admitting row no longer tints with --accent. §5.1 reserves the accent for four things and names a state signal among the ones it is never for. The emphasis moved from the row to the mark."
  - "The automatic actor is not amber. --sem-warn IS --amber IS SunSet's identification colour (globals.css:161-163), so an amber mark cannot say caution rather than this-is-a-SunSet-night by hue — and a reconciliation is neither. It takes a recessed ink."
  - "The failed-read region is NOT a Card. §8.4 fixes the card's edge as a line token deliberately, because a card's content already says where the card is. A failed read is not a hint, and overriding the one property §8.4 decided would have contradicted it rather than used it."
  - "ORPHANS_DECLARED was emptied rather than left STALE, because the gate's own notice says to delete a paid entry, and a debt recorded after it is paid permits re-orphaning exactly what was adopted."

requirements-completed: [DS-07, RESP-01, RESP-02, RESP-03]

# Metrics
duration: ~95min
completed: 2026-08-12
tasks: 3
commits: 3
files_changed: 12
---

# Phase 41 Plan 08: The Skeleton Finally Has a Consumer Summary

**`src/components/ui/Skeleton.tsx` had zero importers for the whole of its
existence, and this is the plan that gave it one. Rendering it for the first
time immediately produced the defect nobody could have seen: its default width
overrode every width a caller asked for, including the two fractional ones the
file passes to itself. That is the phase's own thesis arriving as a bug instead
of as an argument. Two surfaces converted whole, six in the manifest, and
`/gallery`'s import closure turned out to reach two shared media components no
plan in this phase declares — which were converted with it, because 41-07 built a
gate that walks closures and a surface is not converted while raw palette sits
one import away.**

## Performance

- **Duration:** ~95 min
- **Tasks:** 3, one commit each
- **Files changed:** 12 — 11 modified, 0 created, **0 deleted**
- **Files under `scanner/` or `(admin)/door/` touched:** **0**, asserted by `git diff --name-only` over the whole plan
- **Packages added, removed or changed:** **0** (D-41-20). `package.json` untouched

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | Skeleton onto §8.9's contract, API preserved | `f948500` | `src/components/ui/Skeleton.tsx` |
| 2 | `/gallery` whole — shell, nav mount, grid, and Skeleton's first import | `83336cd` | 6 source files, 3 scripts |
| 3 | `Badge` published and rendered; `/admin/members/register` whole | `626a095` | `Chip.tsx`, the register, the manifest |

## The gate report, in full — the plan's requested evidence

Six surfaces, and the importer counts for `ui/Skeleton.tsx` and for `Badge`
by symbol.

```
  surfaces declared converted : 6
  files reached by the walk   : 35
  files scanned by A, B and D : 32
  excluded as converted spine : 3
  excluded as Phase 42        : 0
  files walked under src/     : 260   (check C's scope)
  lines blanked as JSX comments: 108   (DEF-41-02)

  the surfaces, and what each reaches:

      /payment/callback         [focus]    —  7 file(s) scanned
      /login                    [focus]    — 15 file(s) scanned
      /register                 [focus]    —  6 file(s) scanned
      /set-password             [focus]    —  7 file(s) scanned
      /gallery                  [wide]     — 16 file(s) scanned
          src/app/(public)/gallery/GalleryClient.tsx
          src/app/(public)/gallery/page.tsx
          src/components/media/Lightbox.tsx
          src/components/media/MediaGrid.tsx
          src/components/ui/Button.tsx
          src/components/ui/Card.tsx
          src/components/ui/PageShell.tsx
          src/components/ui/Typography.tsx
          src/lib/capabilities/keys.ts
          src/lib/capabilities/server.ts
          src/lib/door/outcome.ts
          src/lib/membership/acts.ts
          src/lib/rbac/roles.ts
          src/lib/routes/capability-routes.ts
          src/lib/supabase/server.ts
          src/types/database.ts
      /admin/members/register   [default]  — 12 file(s) scanned
          src/app/(admin)/admin/(work)/members/register/page.tsx
          src/components/ui/Button.tsx
          src/components/ui/Card.tsx
          src/components/ui/Chip.tsx
          src/components/ui/PageShell.tsx
          src/components/ui/Typography.tsx
          src/lib/capabilities/keys.ts
          src/lib/capabilities/server.ts
          src/lib/door/outcome.ts
          src/lib/membership/acts.ts
          src/lib/supabase/server.ts
          src/types/database.ts

  check A — translucent-black scrims tolerated : 2
          src/components/media/Lightbox.tsx:84   bg-black/90
          src/components/media/Lightbox.tsx:94   bg-black/60

  ✓ A  no raw palette utility in 32 file(s) reachable from 6 converted surface(s)
  ✓ B  no legacy token utility in 32 file(s) across 6 converted surface(s)

  check C — importers per published primitive, counted PER NAMED EXPORT:

    ·    1  IconButton   (src/components/ui/Button.tsx)
              src/components/media/Lightbox.tsx
    ·    1  Chip         (src/components/ui/Chip.tsx)
    ·    4  Button       (src/components/ui/Button.tsx)
    ·    7  PageShell    (src/components/ui/PageShell.tsx)
    ·    3  Card         (src/components/ui/Card.tsx)
    ·    6  PageTitle    (src/components/ui/Typography.tsx)
    ·    1  SectionHeading (src/components/ui/Typography.tsx)
    ·    3  Input        (src/components/ui/Input.tsx)
    ·    1  Badge        (src/components/ui/Chip.tsx)
              src/app/(admin)/admin/(work)/members/register/page.tsx
    ·    1  SkeletonLine (src/components/ui/Skeleton.tsx)
              src/app/(public)/gallery/loading.tsx
    ·    1  SkeletonTile (src/components/ui/Skeleton.tsx)
              src/app/(public)/gallery/loading.tsx

  ✓ C  11 of 11 published export(s) have at least one importer, and every
       orphan is declared

  ✓ D  the shell declares §4's three maxima and only those; all 6 converted
       page(s) import it, write no maximum of their own, and carry the width §4 assigns

  CONVERSION_OK — all four checks passed over 6 declared surface(s), 32 file(s) scanned.
```

**`ORPHANS_DECLARED` is empty**, and the previous run printed the `STALE` notice
that said to make it so. There is no `! C` block above because there is nothing
left to forgive.

## The two data-change assertions the plan asked for

Both were run as specified. **Neither found a changed line.**

### `/gallery` — the three files plus the two the closure reached

```
git diff -U0 -- "src/app/(public)/gallery/" src/components/media/ \
  | grep '^[+-]' | grep -v '^\(+++\|---\)' \
  | grep -E 'from\(|select\(|eq\(|order\(|limit\(|truncate'
```

Two matches, **both prose in a docblock** — the word *un-truncated*, in the two
paragraphs recording that nothing was un-truncated. **Zero code lines.** The
server block of `page.tsx` — the table, the filter on the row's moderation
state, the ordering, the 200 cap and the whole grouping loop — is byte-identical;
the only changed line inside that region of the diff is a subtitle's type size.

### `/admin/members/register`

```
git diff -U0 -- ".../members/register/page.tsx" \
  | grep '^[+-]' | grep -v '^\(+++\|---\)' \
  | grep -E 'select\(|from\(|eq\(|order\(|limit\(|\.in\(|MEMBERSHIP_ACT_COLUMNS|PAGE_SIZE|ADMITTING_ACTS|console\.error|subject_|actor_|full_name'
```

**Zero matches.** The column list, the table, the ordering, the cap, the
non-fatal name lookup, the two error logs with their categories, the set of
admitting acts and both attribution functions are untouched. Every removed
non-comment line in that file's diff is presentational — the list is short
enough to have been read one line at a time, and it was.

## Deviations from Plan

### 1. [Rule 1 — the plan's premise was false] Skeleton's `sm` key stays, because G6 does not count it

- **Found during:** Task 1, reading `verify-breakpoints.mjs` before editing.
- **The plan said:** *"Remove the one `sm:` — a placeholder has no tier
  behaviour, and G6 counts it"*, with an acceptance criterion
  `grep -cE '\bsm:' … returns 0`.
- **Measured:** it does not. `verify-breakpoints.mjs:95-110` documents **this
  exact file, by path and line range**, as the reason its trailing boundary
  guard exists — the map's keys are followed by a space, a Tailwind prefix by a
  class name. The gate measures **44 uses in 22 files** and `Skeleton.tsx`
  appears in none of them; `grep -c 'Skeleton.tsx'` over the gate's own report
  returns **0**.
- **Why it mattered more than a wrong reason:** the same task requires the three
  exports and their API to survive so *"no consumer written against them has to
  move"*. `size` is the API. Removing the small size would have broken the
  contract the task protects, in order to satisfy a search that the gate's
  docblock names in advance as **the wrong oracle** — it says so in the same
  paragraph, and then says the "fix" would have been worse than the red.
- **Resolution:** the map is unchanged, and the file now carries the
  measurement and the citation so nobody re-derives the deletion.
- **The acceptance criterion is therefore not met as written**, deliberately.
  The criterion that replaces it is `node scripts/verify-breakpoints.mjs`,
  **exit 0**, which is the instrument the criterion was trying to approximate.
- **Commit:** `f948500`.

### 2. [Rule 3 — blocking] `/gallery`'s closure reaches two shared media components, and they had to be converted

- **Found during:** Task 2, before writing a line — the grid the plan told me to
  convert is not in `GalleryClient.tsx`.
- **Issue:** the plan's `files_modified` names three gallery files. The gallery's
  grid lives in `src/components/media/MediaGrid.tsx` and its viewer in
  `src/components/media/Lightbox.tsx`. Both are in `/gallery`'s import closure;
  neither is spine, neither is Phase 42, and **no plan in this phase declares
  either** (checked across every `*-PLAN.md`: 41-09 names them only as G2
  exemptions). Both carried raw palette — a two-stop achromatic gradient, an
  achromatic ink, a translucent achromatic fill — and the legacy card alias.
- **Why not simply leave them:** because 41-07 built a gate that walks closures,
  and declaring `/gallery` converted with unconverted files one import away is
  the half-conversion criterion 1 exists to prevent. The gate would have gone red
  on check A, and the honest reading of that red is *the surface is not
  converted*, not *the gate is too strict*.
- **Why not add them to `SPINE`:** that would have hidden them from the walk.
  The manifest says a spine entry *"silently removes a real file from a gate's
  scope — the one failure direction that produces a green."*
- **Resolution:** converted, with the scope of the conversion fixed by the second
  consumer (Deviation 3).
- **Commit:** `83336cd`.

### 3. [Conflict, resolved by the more restrictive reading] The media grid's phone tier stays at two columns

- **Found during:** Task 2.
- **The two halves that collide:** §2.2's table names *card / media grids* as the
  product's only genuinely three-tier axis, **1 / 2 / 3**, and the plan asked for
  exactly that, with H41-1 written to observe it. §2.3's migration map, which is
  the operative per-class instruction, moves the **prefix**: `sm:grid-cols-3`
  becomes `md:grid-cols-2 lg:grid-cols-3`. `MediaGrid` carries an explicit base
  of two columns that was never a prefixed rule, and for which `md:grid-cols-2`
  is a restatement rather than a change.
- **What decided it, and it is not a taste argument:** `MediaGrid` has a second
  consumer — `src/app/(public)/events/[slug]/MediaGallerySection.tsx`, the public
  event page, which is **`venue-secrecy` primary**, sits in the phase's largest
  conversion unit, and belongs to a later plan. The token substitutions are
  value-preserving (all four legacy names are pure aliases,
  `globals.css:247-250`), so that surface's colours do not move. **A column count
  is not value-preserving.** Halving the phone's density on a surface this plan
  does not declare, with no H41-1 behind it, is the scope creep 41-07 refused on
  the toast for the same reason. `meta-gates.md`: where two requirements
  conflict, the more restrictive wins and the conflict is documented in the
  commit — it is.
- **Result:** `grid-cols-2 lg:grid-cols-3`. The desktop step §2.2 wanted is
  there; the phone keeps what it had.
- **Consequence for H41-1, stated so a correct page is not read as a defect:**
  the media thumbnails will be **2 / 2 / 3** columns at 390 / 768 / 1280, not
  1 / 2 / 3. The three-tier observation the plan wrote is not available on this
  surface without changing another plan's.
- **Commit:** `83336cd`.

### 4. [Rule 1 — Bug, latent since the file was written] Skeleton's default width overrode every caller's width

- **Found during:** Task 2, while writing the first consumer.
- **Issue:** the component appended the caller's classes after its own defaults —
  this tree's house pattern. That works when the two collide on a utility
  Tailwind emits in ascending numeric order. **The default width is a named
  value, and Tailwind emits the named rule last.**
- **Measured, in the emitted stylesheet, before the conclusion was drawn:**

  ```
  .h-4{  .h-5{  .h-9{                 ← heights ascend; a caller's height wins
  .w-2\/3{  .w-3\/4{  .w-28{  .w-full{ ← the named width is LAST; the default wins
  ```

  So every width a caller asked for was ignored — **including the two fractional
  ones this file passes to its own card shell three functions below.** The
  planned header placeholders would have rendered full-width instead of 112px
  and 192px.
- **Why nobody had ever seen it:** the file had **zero importers**. An unrendered
  component cannot be wrong on screen. This is D-41-04's argument arriving as a
  defect rather than as a principle, and it is the strongest evidence this plan
  produced for the rule it was written to satisfy.
- **Fix:** the default stands down when the caller sets the same property,
  decided in JavaScript and therefore independent of emission order **in both
  directions**. The reasoning and the measurement are in the file.
- **Commit:** `83336cd`.

### 5. [Rule 2 — the shape the three exports could not express] A fourth export, `SkeletonTile`

- **Found during:** Task 2.
- **Issue:** the plan asks the loading state to use `SkeletonCard` and
  `SkeletonLine` and to keep the placeholder's shape matching the loaded layout.
  The loaded layout is a grid of **squares**. A square is not a taller line, and
  after Deviation 4 it is clear that reaching one through the caller's classes
  was never reliable. The alternative — a hand-rolled pulsing block in
  `loading.tsx` — is the thing the plan forbids and the thing the component
  exists to stop 102 times over.
- **Resolution:** `SkeletonTile`, published in the plan that renders it, with its
  consumer in the same commit, and an entry in `PRIMITIVES`.
- **`SkeletonCard` is therefore used nowhere**, and neither is `SkeletonAvatar`:
  a gallery renders no card-shaped placeholder and no avatar. Following 41-06's
  precedent with `Textarea` and `Select`, **neither is entered in `PRIMITIVES`**,
  and the manifest carries the paragraph saying why. Entering them would have
  made check C go red on a correct file.
- **Commit:** `83336cd`.

### 6. [Rule 2 — a defect the conversion could not leave behind] `IconButton`'s orphan closed from the media viewer

- **Found during:** Task 2.
- **What happened:** `Lightbox`'s close control was a 40px circle — below §6.1's
  floor — drawn with a translucent achromatic fill that check A flags. §6.4
  already sends every close control in this tree to the icon rung. Converting it
  meant importing `IconButton`, which had **zero importers** (DEF-41-03).
- **Result:** check C counts one importer; the gate printed the `STALE` notice on
  `ORPHANS_DECLARED` and the entry was deleted, as its own instruction says.
  **The list is now empty and the debt is zero.**
- **What this does NOT close, recorded in `deferred-items.md` and in the gate:**
  `src/components/toast/Toast.tsx` still carries a hand-written copy of that
  contract. **And the mechanism that was watching it is now silent** — check C
  counts importers, the count is one, so the duplication is invisible to every
  gate in this phase. A debt tracked by a proxy metric is closed by anything that
  moves the metric. DEF-41-03 stays open, with that written on it.
- **The ink over the scrim, which was a declared decision and not a discovery:**
  `verify-conversion.mjs` records beside its palette list that the one legitimate
  future case is *the ink over a full-bleed media scrim*, and that the plan
  converting a media surface either adds a token or adds a line to that list.
  **Neither was needed.** The control takes a translucent black ground of its
  own — the tolerated scrim shape §13 already names — under token ink. A dark
  scrim beneath a light ink is the readable direction; the incumbent was the
  other one.
- **Commit:** `83336cd`.

### 7. [Rule 2 — a forbidden colour, not a token swap] The accent stopped being a state signal

- **Found during:** Task 3.
- **Issue:** the register tinted an admitting row with the accent at two
  opacities. §5.1 reserves the accent for four things and names **a state
  signal** among the ones it is never for. This is one — and the plan's task
  listed *four* raw palette colours to convert without noticing a fifth colour
  defect that was not raw palette at all.
- **Resolution:** the row tint is gone and the emphasis moved to the act mark,
  which is where §8.5 puts it. The set that decides which acts are emphasised is
  unchanged and is still *"used for emphasis only — never to filter"*.
- **Commit:** `626a095`.

### 8. [Contract conflict, resolved in §8.4's favour] The failed-read region is not a `Card`

- **Found during:** Task 3.
- **Issue:** the plan says the card shells become `Card`. The failed-read region
  must carry a **semantic** boundary; `Card`'s contract fixes its edge as a line
  token, deliberately, *"because a card's content already says where the card
  is"*. Passing a semantic border through `className` would override the one
  property §8.4 decided — and, per Deviation 4's measurement, would have been a
  bet on emission order as well.
- **Resolution:** the region is written out with the card geometry and the
  critical semantic, and the reason is beside it. It is not a card because it is
  not a hint.
- **Commit:** `626a095`.

## The colour decisions on the membership register, with their reasons

Recorded here because two of them are judgements a later reader would otherwise
re-open.

| Site | Was | Is | Why |
|---|---|---|---|
| failed-read region | a raw palette family at three opacities | `--sem-crit` boundary, tint and ink | ink on `--surface` is **6.99 : 1** (§8.6). The region keeps `role="alert"` and its message is unchanged |
| the act mark | plain text, with the row tinted in `--accent` | `Badge`, `emphasis` tone on the acts that admit | §5.1 forbids the accent as a state signal. `--ground` on `--sem-done` is **5.99 : 1**, computed on this tree |
| the automatic author | amber | `--ink-2` | `--sem-warn` **is** `--amber` **is** SunSet's identification colour (`globals.css:161-163`). An amber mark cannot say *caution* rather than *this is a SunSet night* by hue, and a reconciliation is neither. The distinction it carries is the words, which is where it always was |
| a human author | the legacy ink alias | `--ink` | a pure alias, so the rendered colour is identical |

**And the one that was deliberately not made.** `Badge` ships **two** tones and
no per-outcome vocabulary. Giving each of the seven acts a colour would have
settled in CSS the criterion by which somebody is admitted or refused —
`community-membership.md` records that criterion as **not written anywhere**, and
that the module *"chiede che venga decisa"* rather than inventing it. A rejection
is a communication, not a hue.

## Threat model — the five dispositions this plan carries

- **T-41-26 (Information Disclosure — `/gallery` captions and group labels):**
  **mitigated.** The diff assertion above found zero changed lines matching the
  query and truncation shapes. What a group heading contains is the same string,
  formatted by the same expression. `verify-media-strip.mjs` **exit 0**.
- **T-41-27 (Information Disclosure — a venue rendered before its reveal):**
  **mitigated.** No field was surfaced, no truncation was loosened, no component
  renders earlier. The thumbnail's `alt` stays empty and the accessible name
  added to the tile is a fixed string — *Open photo* / *Open video* — that names
  the action and nothing about the item, precisely so it cannot become a caption
  by another route. `venue_reveal_sent` is untouched; no code path in this plan
  can advance it.
- **T-41-28 (Information Disclosure — the membership register):**
  **mitigated.** No column added, no field surfaced, no email fetched or
  rendered. The membership code is still the durable label and the name still
  appears only while the account exists.
- **T-41-29 (Repudiation — who approved or rejected, and when):**
  **mitigated.** `formatWhen` and both attribution functions are byte-identical.
  The system author still renders as the reconciliation that produced it rather
  than as a blank cell — D-22's reason for a kind beside the actor — and it is
  now a recessed **ink** rather than an amber, which is a legibility change and
  not an attribution one.
- **T-41-SC (Tampering — package installs):** **no package installed, removed or
  changed.** `package.json` is untouched by this plan.

**Monotone guards:** all three untouched. This plan adds no route, no query, no
input, no user data and no branch on `role` or `status`. The register's
capability guard, its dynamic opt-out and its use of the ordinary server client
rather than the RLS-bypassing one are all unchanged.

## Verification

Per `CLAUDE.md` Guardrail 1 and `meta-gates.md`: **there is no test runner for
the product.** Nothing below is claimed on the basis of tests passing.

| Check | Result |
|---|---|
| `npm run build` after every task | **exit 0** — compiled, TypeScript clean |
| `node scripts/verify-conversion.mjs` | **exit 0** — four checks, 6 surfaces, 32 files scanned, `ORPHANS_DECLARED` empty |
| `node scripts/verify-breakpoints.mjs` | **exit 0** — `sm:` debt **44 → 41** uses, **22 → 20** files |
| `node scripts/verify-tokens.mjs` | **exit 0** |
| `node scripts/verify-no-viewport-read.mjs` | **exit 0** |
| `node scripts/verify-semantic-separation.mjs` | **exit 0** |
| `node scripts/verify-sunset-gradient.mjs` | **exit 0** |
| `node scripts/verify-media-strip.mjs` | **exit 0** |
| `node scripts/verify-capabilities.mjs` | **exit 2 — a REFUSAL, nothing measured.** It needs Supabase credentials this worktree does not hold. Identical before any change; not one of this plan's gates. Recorded rather than omitted, because an unrun gate reported as absent is how a green becomes a claim |
| `git diff --name-only` over the whole plan | 12 files, **zero** under `scanner/` or `(admin)/door/` |
| `git diff --diff-filter=D` per commit | empty — **nothing deleted** |
| `git status --short` after the last commit | clean, no untracked files |
| `CONVERTED.length === 6` | **exit 0** |

### The acceptance criteria, one by one

| Criterion | Result |
|---|---|
| `grep -cE 'rounded-lg\|bg-card-border\|p-5\b' Skeleton.tsx` = 0 | **0** |
| `grep -c 'bg-raised' Skeleton.tsx` ≥ 1 | **2** |
| three export names unchanged | **3** |
| `grep -cE '\bsm:' Skeleton.tsx` = 0 | **NOT MET, deliberately** — Deviation 1. The gate it approximates is green |
| `grep -rc 'ui/Skeleton' gallery/loading.tsx` ≥ 1 | **2** |
| `grep -c 'animate-pulse' gallery/loading.tsx` = 0 | **0** |
| `grep -c 'MobileNav' gallery/page.tsx` = 0 / `AppNav` ≥ 1 | **0 / 2** |
| legacy tokens across the gallery files = 0 | **0** on all five, including the two the closure reached |
| `grep -c 'lg:grid-cols-3' GalleryClient.tsx` ≥ 1 | **NOT MET as written** — the grid is in `MediaGrid.tsx` (**1**) and in `loading.tsx` (**2**). The criterion named a file that does not own a grid; Deviation 2 |
| raw palette on the register = 0 | **0** |
| legacy tokens on the register = 0 | **0** |
| `grep -c '<h1' register` = 0 | **0** |
| `grep -cE 'export (function\|const) Badge' Chip.tsx` = 1 | **1** |
| `grep -cE 'px-2\.5\|py-0\.5' Chip.tsx` = 0 | **0** |
| check C counts `Badge`'s importer **by symbol** | **1**, named: the register |
| `CONVERTED.length === 6` | **exit 0** |
| both data-change assertions | **no changed code line**, on either surface |

### Manual verification still owed — H41-1

**Not performed, and no green above stands in for it.** The reason is the one
41-05 recorded and 41-07 repeated: the application cannot be run from this
worktree, because the middleware reads Supabase credentials on **every** request
including a public one, and pointing a running instance at production is an act
requiring an authorisation this agent does not hold.

**The procedure, so the person doing it knows what a correct page looks like:**

1. **`/gallery` at 390px** — one column of event groups; the media thumbnails at
   **two** per row. The bottom bar is present; no side column.
2. **`/gallery` at 768px** — the side column appears at 224px and the bottom bar
   goes. Content sits to its right, not under it. Thumbnails still **two** per
   row.
3. **`/gallery` at 1280px** — thumbnails at **three** per row, and the content
   **stops widening** at 1280px with the page ground visible on both sides. This
   is RESP-02's observable defect closed.
4. **`/admin/members/register` at all three** — the page title in the display
   face; the act mark a small pill, filled on *Account created*, *Approved* and
   *Reactivated* and outlined on the other four; **every row still naming who
   acted and when**; the back link a comfortable target.
5. **The empty and failed states**, which cannot be produced by resizing:
   confirm they read as different things. The failed-read region is the only one
   with a semantic boundary, and the empty state's second sentence now says so
   **in words** rather than by naming a colour.

**Expected at step 1 and 2, and stated so it is not filed as a defect:** the
thumbnails are **2 / 2 / 3**, not 1 / 2 / 3. Deviation 3 explains why, and the
alternative is a decision about the public event page that belongs to its own
plan.

## Known Stubs

**None.** Every value in this plan is a measurement taken on this tree, a class
string read out of `41-UI-SPEC.md`, or a contrast ratio computed and written
with its inputs. No TODO, no FIXME, no placeholder, no component wired to empty
data, no list seeded with a symbol that does not exist.

## Threat Flags

**None.** No route added, no query, no input, no schema, no network path, no
branch on role or status. Two surfaces changed appearance; neither changed what
it can read or who can reach it.

## What the next plans inherit

- **A default utility inside a primitive must stand down when the caller sets
  the same property.** Appending is not sufficient, and the failure is silent:
  the caller's class is in the DOM and does nothing. Measured direction — a
  **named** value beats every numeric one, so a default like a full width or a
  full height is the dangerous kind. Two primitives now guard against it; the
  others append, and none of them currently collide.
- **A surface is converted when its import closure is.** `/gallery` cost five
  files, not three. A plan that budgets by `files_modified` will under-budget;
  read the closure first, with `verify-conversion.mjs` if it is already declared
  or by hand if it is not.
- **A shared component with an unscheduled second consumer constrains the
  conversion.** Token substitutions are value-preserving and may land; a layout
  change may not. That test is reusable and cheap: check the aliases.
- **`Badge` exists and is rendered.** Its tone carries emphasis, never an
  outcome. The next surface with stage marks reads the sentence at the top of
  `Chip.tsx` before choosing between the two rungs.
- **`ORPHANS_DECLARED` is empty and check C's debt is zero.** Adding a primitive
  without a consumer now fails a gate outright — there is no forgiven entry to
  hide behind, and adding one back is a visible decision.
- **DEF-41-03 is half open and no longer measurable.** The toast still
  hand-writes the icon rung's contract, and the count that used to reveal it is
  now green. A plan that wants to close it must declare
  `src/components/toast/Toast.tsx`; no gate will remind anyone.
- **G6's debt is 41 uses in 20 files**, down from 44 in 22.

## Self-Check

- `src/components/ui/Skeleton.tsx` — **FOUND**, four exports, on §8.9's contract
- `src/components/ui/Chip.tsx` — **FOUND**, `Chip` and `Badge` both exported
- `src/app/(public)/gallery/loading.tsx` — **FOUND**, imports `ui/Skeleton`
- `src/app/(public)/gallery/page.tsx` — **FOUND**, imports `AppNav` and `PageShell`
- `src/app/(admin)/admin/(work)/members/register/page.tsx` — **FOUND**, no `<h1>`
- `scripts/conversion-manifest.mjs` — **FOUND**, `CONVERTED.length === 6`
- commit `f948500` — **FOUND**
- commit `83336cd` — **FOUND**
- commit `626a095` — **FOUND**

## Self-Check: PASSED
