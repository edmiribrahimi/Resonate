---
phase: 44-the-production-calendar-comes-inside
plan: 11
subsystem: access-and-ui
tags: [server-component, discriminated-union, civil-date, checklist, rls, postgrest, obs-03]

# Dependency graph
requires:
  - phase: 44-04
    provides: "`CAP.PRODUCTION_READ` and the six `SELECT` policies this page's cookie-bound read is judged by"
  - phase: 44-05
    provides: "`PieceDate` and its five-variant union, `StageBadge`, and `dates.ts`'s three formatters"
  - phase: 44-07
    provides: "the applied migrations, and the six row interfaces in `src/types/database.ts`"
  - phase: 44-09
    provides: "the single map entry binding `/admin/calendar` and `/admin/calendar/[id]`, and `turinToday()` / `turinWallClock()`"
provides:
  - "`/admin/calendar/[id]` — one night, its pieces above its checklist, behind the same key and through the same cookie-bound client"
  - "`PiecesSection` — every owed piece, every date through `PieceDate` and through nothing else"
  - "`ChecklistSection` — the pieces plus the production steps, lateness computed at render, the tick taken as a prop"
  - "the distinction between *this night owes nothing* and *we do not know what this night owes*, drawn as two different empty states"
affects: [44-12, 44-13, 45]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A detail page uses `.maybeSingle()` and not `.single()`, because `.single()` answers *no rows* with an error and collapses two of the three outcomes into one"
    - "An untrusted route parameter is shape-checked before the database client is constructed, not merely before the query"
    - "A component whose prop is a discriminated union cannot render the dangerous case, so the section holding it needs no discipline to avoid drawing one"
    - "Where a section would be empty, ask whether the obligation set is known at all — an empty list and an unread one are two facts with two next steps"
    - "A write handler a later plan supplies arrives as an optional prop, and its absence is drawn as a third sentence rather than as an inert control"

key-files:
  created:
    - "src/app/(admin)/admin/(work)/calendar/[id]/page.tsx"
    - "src/app/(admin)/admin/(work)/calendar/[id]/loading.tsx"
    - "src/app/(admin)/admin/calendar/PiecesSection.tsx"
    - "src/app/(admin)/admin/calendar/ChecklistSection.tsx"
  modified: []

key-decisions:
  - "The three commits land in build order — the two sections first, the page that imports them last — so that every commit in the history builds on its own. The plan's task order is 1, 2, 3; committing in that order would have put a page importing two files that do not exist into the history"
  - "`.maybeSingle()` rather than `.single()`: it is what makes *the night does not exist* separable from *the read failed*, and on a page reached from a list a 404 reads as *the night was deleted*"
  - "The pipeline rules are read only where a section would otherwise be empty, and the answer chooses between §13.1's copy and a declared pair of sentences — because *this format owes no production steps* drawn where nothing is recorded is a plausible sentence covering a fault"
  - "A piece carries no `late` overlay in this plan: the fact that makes a piece late is a property of its checklist item, and nothing keys the two together. The mark is drawn on the checklist row, where §9.3 requires it, and the gap is written down rather than closed by matching on a free-text label"
  - "The edition a waiting piece names is derived as the night's progressivo plus one, from the published rule that progressivi are appended to and carry no gaps — and where the night has no series code or no number, no half-sigla is composed"
  - "The night's name is composed in the page rather than imported from `CalendarList`, whose helper is typed against a thirteen-field row this page does not have. The duplication is declared, and the source of truth is the published naming rule rather than either copy"

patterns-established:
  - "A prop type's absent field is the guarantee; the sentence beside it is only its explanation"
  - "Where a plan supplies a component before the act that writes through it, the inert state gets its own sentence — a disabled control in silence is indistinguishable from a refusal"

requirements-completed: [PROD-01]

# Metrics
duration: 30min
completed: 2026-08-15
---

# Phase 44 Plan 11: S2 — one night, its pieces and its checklist — Summary

`/admin/calendar/[id]` serves one night behind the same capability the list is
behind, through the client the row-level policies actually judge. It draws the
night's name, its sigla, its date weekday-first and its space with the stage that
space has actually reached; then its editorial pieces, each date rendered through
the one component that cannot draw a bare one; then its checklist — the pieces
plus the production steps — with an unticked item whose date has passed marked
`Late` at render time.

---

## What each of the four files is for

| File | Commit | What it carries |
|---|---|---|
| `PiecesSection.tsx` | `27610b4` | one row per owed piece; the kind in production's word, the marker, and the date through `PieceDate` |
| `ChecklistSection.tsx` | `7c552b3` | the five item kinds, the real checkbox, the late mark, the author line, and the two refusal sentences |
| `[id]/page.tsx` | `c7972c0` | the guard, the shape check, the read, the three outcomes, and the two sections in order |
| `[id]/loading.tsx` | `c7972c0` | the placeholder, at the page's own width, leaking no count |

---

## The three outcomes, and the one that needed a different call

| outcome | what renders |
|---|---|
| the row exists | the night |
| the parameter is not the shape of an identifier | `notFound()` — **before** the client is constructed |
| the row does not exist | `notFound()` |
| **the read itself failed** | §13.2's two sentences, in a `role="alert"` region, and **never** `notFound()` |

**`.maybeSingle()` is what makes the last two separable, and `.single()` would
not have been.** PostgREST answers a `.single()` that matched nothing with an
*error*, so a page written the obvious way cannot tell *this night does not
exist* from *the database refused me* — and on a page reached from a list, a 404
reads as **the night was deleted**. That is a different fact with a very
different next step, and it is the whole of threat T-44-28.

The failure logs `error.code` and `error.message`, and nothing else:
`grep -c "\.details"` returns **0** on both new route files. PostgREST's
`details` carries the rejected row, and here that row carries `venue_word`.

**The shape check precedes the client, not just the query.** `UUID_PATTERN` is
tested immediately after the capability guard and before `createClient()` is
called, so a parameter that is not an identifier never becomes a lookup at all
(T-44-30).

---

## The read, and the four embeds re-checked rather than inherited

An embed through a table with more than one relationship to the embedded table is
`HTTP 300 PGRST201`, and through this client it fails **in silence**: `data` comes
back null, nothing is thrown, and the page renders an empty night. The four were
re-read against `20260815120000_production_calendar.sql`:

| embed | relationships |
|---|---|
| `production_plan → formats` | one, `format_id` |
| `production_plan → party_series` | one, `series_id` |
| `production_plan ← production_piece` | one, `plan_id` |
| `production_plan ← production_checklist_item` | one, `plan_id` |

No junction table carries foreign keys to both sides of any pair, so none can be
read as a many-to-many either. A constraint-name qualifier was **not** added: the
generated names are identifiers this file has no way to verify, and a wrong one
fails in exactly the same silent way an ambiguous embed does.

`linked_party_id` is deliberately not embedded — it points at
`public.event_parties`, whose read arms are a different question with a different
audience, and S2 does not need to know anything about it in this plan.

**Every read goes through `createClient()`, the cookie-bound client.**
`grep -c "getServiceClient"` returns **0**. A page fetching with the service key
renders identically for a subject the database would have refused, which is the
exact shape of a feature protected by a redirect alone (T-44-02).

---

## The empty state that is not in §13.1, and why it had to exist

§13.1 declares two S2 empty states, and both are drawn verbatim. But there is a
third case underneath them that they would have described **untruthfully**:

> A format with no pipeline rule recorded — or one the import could not resolve at
> all — owes an **unknown** amount, not nothing.

Drawing `This format owes no production steps` there says *there is no work* on a
night where nobody has established what the work is. That is a plausible sentence
covering a fault, which is the shape OBS-03 refuses, and it fails in the
direction that **hides** work rather than inventing it — the direction D-44-15
exists to close.

So the page asks one extra question, and only where a section would otherwise be
empty: does `production_pipeline_rule` hold anything for this format? A format the
import could not resolve short-circuits without a query, because an unresolved
format is by definition one whose obligations are unknown. The answer chooses
between §13.1's copy and two declared pairs:

| when | heading | body |
|---|---|---|
| pieces empty, rules recorded | `Nothing is written for this night yet` | §13.1, verbatim |
| pieces empty, rules **not** recorded | `We do not know what this night owes` | `No pipeline rule is recorded for its format, so this is an unread plan rather than an empty one.` |
| checklist empty, rules recorded | `This format owes no production steps` | §13.1, verbatim |
| checklist empty, rules **not** recorded | `We do not know what this night's production owes` | `No pipeline rule is recorded for its format. This is not a checklist with nothing left on it.` |

**A failure of the rules read is a failed read of the night**, not a night with a
shorter list: the obligations are half of what this page states, so the branch
returns §13.2 rather than guessing which empty state applies.

---

## `PiecesSection` — the guarantees that are shapes rather than rules

**Every date goes through `PieceDate`.** `grep -c "PieceDate"` returns 6 and
`grep -c "formatCivilDate"` returns **0** in that file: it does not import a date
formatter, because its rows carry a `PieceDateState` union and not a string.
There is no bare date in the file to draw. That is check U5 held structurally
rather than by discipline.

**A LiveCut is identified by its part marker.** `PieceRowView` has four fields —
`id`, `kind`, `partMarker`, `state` — and **no field an artist's or dj's name
could travel in**. Associating a marker with a person would be a guess, and a
guess about a line-up drawn on a screen is a line-up on a screen. The absent
field is the guarantee; the docblock is only its explanation.

**The other word appears nowhere.** A case-insensitive search for the audio-piece
misnomer returns **0** across all four files — no label, no comment, no component
name, no variable name, no string. It is not written in this document either, for
the reason the phase already keeps for the reversed glyph and the four date
literals: a check whose only match is the sentence forbidding the thing is a check
that gets ignored the third time it goes red.

**`conforms` appears nowhere either** (`grep -ci` returns 0): the stored column
answering whether a written date follows its rule feeds the divergence report and
reaches no pixel (D-44-10), and the file takes no flag carrying it.

**A waiting piece is never called missing.**
`grep -ciE ">\s*(Missing|Incomplete|Broken)"` returns **0**. `PieceDate` draws
`Waiting for <edition>` and names what it waits for; nothing in this section
adds a word that would make the rule behaving correctly look like a fault.

**`LiveCuts depend on the line-up` is written once** and no figure is drawn
beside it. It is derived from the rows rather than passed in — it is a fact about
what the section is holding, and a prop would be a second place for it to be
wrong.

### Ordering: by the day, and the undated after them

The page sorts and the section preserves, exactly as `CalendarList` does for S1.
The order is the day the piece falls on — a string comparison on `YYYY-MM-DD`,
which is fixed-width and most-significant-first, so string order is date order —
and **a piece with no date is not given a guessed position**: it goes after
everything that can be placed, in the order the vocabulary declares the six
kinds, then by marker. Interleaving an undated piece would put a date on it in
the reader's head, which is the one thing this surface may not do.

---

## `ChecklistSection` — late at render, the author beside the tick, and two sentences

| assertion | result |
|---|---|
| a real checkbox through the primitive | `grep -c "Checkbox"` = 2; `grep -c 'role="checkbox"'` = 0 |
| no stored lateness read | `grep -ci "is_late"` = 0 |
| no instant constructed | `grep -cE "new Date\|toISOString\|toLocaleDateString\|Intl\.DateTimeFormat"` = 0 |
| `emphasis` spent once | `grep -c 'tone="emphasis"'` = **1** |
| two sentences, not one | `grep -cE "You do not have permission…\|We could not save that tick"` = **2** |
| no collapsed message | `grep -ciE "something went wrong\|qualcosa"` = 0 |
| the alert region exists | `grep -c 'role="alert"'` = 3 |

**Lateness is `not ticked` and `due date before today`, evaluated at render.**
Today's civil date arrives as a prop from the server component, and the
comparison is between two `YYYY-MM-DD` strings. There is no stored lateness
column of any name, and the reason is written beside the code: a stored flag is
only true at the moment it is written, and keeping it true would need a fifth
nightly job in a project whose four existing jobs tell nobody when they fail.

Because the mark is computed from local state, **ticking an item clears its
`Late` badge immediately** — the answer is recomputed by the act of asking, which
is the property the stored version would not have had.

**The author line is drawn only while the box still agrees with what the server
handed over.** After a change of its own the row knows the new state and not yet
its author, and drawing the previous author beside it would attribute an act to
the wrong person.

**A tick warns, never blocks, and is reversible**, and the sentence saying so
sits next to the code because the wrong precedent is one directory away: this
repository's nearest neighbours are all one-way switches, and none of their
reasoning travels here — *nothing leaves the building when somebody ticks a box*.
The three one-way switches `meta-gates.md` names are untouched by this plan.

### Three strings this file adds to §13.4, each declared with its reason

| constant | drawn when | grounded in |
|---|---|---|
| `No date is recorded for this step` | `due_date` is null | D2 in `deferred-items.md`: four of the five kinds have no anchor recorded, and inventing one here would be a second rule table. A sentence and not a blank, because a blank reads as *fine* |
| `somebody the record does not name` | `ticked_at` is set and `ticked_by_name` is null | the column is nullable; `Ticked by · <date>` with a hole in it reads as a rendering fault |
| the read-only notice | no tick handler is supplied | see below |

### The handler is a prop, and its absence is a third sentence

The act that records a tick is plan 44-12's. `onTick` is optional so this file
compiles and renders before it exists — and where it is absent the boxes are
`disabled` **and the section says so in its own words**:

> `This checklist is read-only for now. The boxes show what has already been ticked; the act that records a tick is not on this surface yet.`

That is deliberately distinguishable from both refusals: *the control is not here
yet* is a third fact, and a disabled control rendered in silence is
indistinguishable from `You do not have permission to change this checklist.` —
which are exactly the two things §13.2 exists to keep apart.

**The handler's union is narrow on purpose.** It answers `{ ok: true }` or
`{ ok: false, refusal, unexpected? }` with `refusal` one of two members, so the
act's own richer set of reason codes stays with the act (44-12) while the surface
keeps its two sentences as two. An `unexpected` code is **named beside the
sentence**, never swallowed — `FormatsCatalogue`'s `default`-arm discipline, kept
without letting a third sentence into the copy contract.

---

## Deviations from Plan

### Auto-added

**1. [Rule 2 — Missing critical] The *we do not know what this night owes* empty
states, and the extra rules read behind them**
- **Found during:** Task 1.
- **Issue:** §13.1's two S2 empty states are true only where the format's
  obligations are recorded. Where they are not, both sentences claim there is no
  work on a night where nobody has established what the work is — a plausible
  sentence covering a fault (OBS-03), failing in the direction that hides work.
- **Fix:** one extra read of `production_pipeline_rule`, taken only where a
  section would otherwise be empty, and two declared pairs of sentences.
- **Recommendation for the contract's next revision:** two rows in §13.1 and two
  in §13.4. Recorded here rather than folded in silently.
- **Committed in:** `c7972c0`

**2. [Rule 2 — Missing critical] Three declared strings in `ChecklistSection`**
- **Found during:** Task 3. Each stands where the six declared columns of the
  contract have no form for a null, each is a named constant with its reason in
  the file, and each follows the register `dates.ts` set for this phase — a
  distinguishable sentence, never a blank and never an em-dash. Listed in the
  table above.
- **Committed in:** `7c552b3`

**3. [Rule 2 — Missing critical] `export const dynamic = "force-dynamic"`**
- **Found during:** Task 1.
- **Issue:** this page renders an unannounced date and the word for a space that
  may be under negotiation. `nextjs-architecture.md`'s gate *cache esplicita*
  requires such a surface to declare it, and its gate *service worker* is the
  sharper half: Serwist serves old content when the network is missing, and a
  stale night is a date and a space rendered to whoever is holding the phone now.
- **Note:** `cookies()` inside `createClient` already opts the route out of
  static rendering, so the line changes no behaviour today. It is there so the
  reason survives a refactor that removes the cookie read. Same reasoning, same
  wording as S1's (plan 44-09).
- **Committed in:** `c7972c0`

**4. [Rule 3 — Blocking] The commits land in build order, not task order**
- **Found during:** Task 1. The page imports both sections, so a commit
  containing the page and neither section does not build.
- **Fix:** `PiecesSection` (task 2), then `ChecklistSection` (task 3), then the
  page and its placeholder (task 1). Every commit in the history builds on its
  own. No task content moved.

### Declared, and deliberately not done

**5. A piece carries no `late` overlay.** `PieceDate` accepts one (§7 state 7),
and this plan passes none. The fact that makes a piece late is *its checklist
item is unticked and past*, and **nothing keys a piece row to its checklist
item**: the item's identity is `(plan, kind, label)` with `label` free text, so
joining them would mean reconstructing a sentence and matching on it. That is a
guess, and a guess that draws a `Late` mark on the wrong row is worse than no
mark at all. The mark is drawn on the **checklist row**, which is where §9.3
requires it and where D-44-15's *readable from the list* behaviour already lives.
Logged below as D6.

**6. The night's name is composed twice.** `CalendarList.tsx` composes the same
name for S1 and does not export the helper, which is typed against a
thirteen-field row this page does not have; building a fake row to reuse it would
have been worse than the duplication. Neither copy is the source — the source is
the published rule that the name on the app is the name of the format with its
per-venue progressivo (`brand-visual-system.md`) — and both files say so. If a
third caller appears, that is the moment to extract it.

---

## Deferred, and why it is here rather than in `deferred-items.md`

Plan 44-10 runs in the **same wave** as this one and may also append to
`deferred-items.md`. Two appends at the end of one file is the classic merge
conflict, so this item is recorded in the plan's own SUMMARY — which 44-12 and
44-13 both take as context — and should be carried into `deferred-items.md` by
whoever consolidates the wave.

### D6 — a piece cannot be told it is late, because nothing keys it to its checklist item

**What happens.** `44-UI-SPEC.md` §7 state 7 gives a piece's date a `Late`
overlay, and `PieceDate` implements it. `PiecesSection` never passes it, so no
piece row on S2 ever carries the mark.

**Why.** The predicate is a property of the **checklist item**, not of the piece:
`ticked_at IS NULL AND due_date < today`. `production_checklist_item` has no
foreign key to `production_piece` — its identity is `(plan_id, kind, label)`,
with `label` free text in production's own words — so relating the two would mean
reconstructing that label from the piece's kind and marker and matching on the
string. A drifted label then silently marks the wrong row or none, and neither
failure has a symptom.

**What it costs while it stays.** Lateness is visible on the checklist and on the
list's `Late N` badge, and **not** beside the piece's own date. The reader who
opens a night sees which item is late; the reader scanning the pieces list does
not see it twice. That is the direction that under-marks rather than over-marks,
and it under-marks a fact that is already drawn twice elsewhere.

**The repair, when somebody takes it.** Either a nullable `piece_id` on
`production_checklist_item`, written by the import at the moment it already knows
both rows, or a decision that §7 state 7 belongs to the checklist alone and the
overlay comes off `PieceDate`. The first is a migration; the second is a contract
edit. Both are somebody else's call.

---

## Verification

| gate | result |
|---|---|
| `npm run build` | **exit 0** — `/admin/calendar/[id]` appears in the route table as `ƒ` (dynamic) |
| `npm run verify:routes` | **exit 0** — 26 patterns, 23 under `/admin`, 24 pages, every page resolves |
| `npm run verify:tables` | exit 0 — `REMAINING = 0` |
| `npm run verify:dialogs` | exit 0 |
| `npm run verify:breakpoints` | exit 0 |
| `npm run verify:tokens` | exit 0 |
| `npm run verify:no-viewport-read` | exit 0 |
| `npm run verify:touch-targets` | **exit 2 — a REFUSAL, and it is D1's** |

**On `verify:touch-targets`.** The plan asks it to exit 0; it exits **2** and it
measured nothing. The four reasons are the stale `CONVERTED` manifest entries
logged as **D1** in `deferred-items.md` — surfaces deleted by commit `763ade8`,
which predates this phase — and `verify:touch-targets 2>&1 | grep -ci calendar`
returns **0**, so no file of this plan is named by any of them.

⚠ **The consequence is stated rather than glossed: the 44 × 44 hit area on the
checkbox added by task 3 has NOT been measured by a gate.** It is inherited from
`Checkbox`, whose `HIT_AREA` carries `min-h-11 min-w-11` and which this file uses
without overriding either — that is a reading of the primitive, not a
measurement of the page. Fixing D1 is a manifest edit in a file plan 44-10 may
also be touching this wave, so it was left alone.

### The grep assertions the plan names

| assertion | file | expected | got |
|---|---|---|---|
| the guard asks the bound key | `[id]/page.tsx` | ≥ 1 | **2** |
| no service client | `[id]/page.tsx` | 0 | **0** |
| shape check precedes the first `.from(` | `[id]/page.tsx` | by reading | **confirmed** — and it precedes `createClient()` too |
| a failed read is not a missing night | `[id]/page.tsx` | 1 | **1** |
| `PageShell width="default"` | `[id]/page.tsx`, `[id]/loading.tsx` | present | **2**, **1** |
| no date construction | both route files | 0 | **0**, **0** |
| no file or date input | `[id]/page.tsx` | 0 | **0** |
| the audio misnomer | all four files | 0 | **0** |
| every date through `PieceDate` | `PiecesSection.tsx` | ≥ 1 | **6**, and 0 date formatters |
| the rule-conformance column | `PiecesSection.tsx` | 0 | **0** |
| no name field on the prop type | `PiecesSection.tsx` | by reading | **confirmed** — four fields, none of them a name |
| `depend on the line-up` | `PiecesSection.tsx` | 1 | **1** |
| no waiting piece called missing | `PiecesSection.tsx` | 0 | **0** |
| no date construction | `PiecesSection.tsx` | 0 | **0** |
| a real checkbox | `ChecklistSection.tsx` | ≥ 1 | **2**, and no `role="checkbox"` |
| no stored lateness read | `ChecklistSection.tsx` | 0 | **0** |
| no date construction | `ChecklistSection.tsx` | 0 | **0** |
| `emphasis` spent once | `ChecklistSection.tsx` | 1 | **1** |
| two sentences, not one | `ChecklistSection.tsx` | 2 | **2** |
| no collapsed message | `ChecklistSection.tsx` | 0 | **0** |
| the alert region | `ChecklistSection.tsx` | ≥ 1 | **3** |
| the reversed glyph | all four files | 0 | **0**, matched by code point |

### What a green does **not** mean

- **No query in this plan has been executed against a database.** The RLS was not
  exercised, the embeds were not answered, and the three-outcome branch was not
  observed taking its third branch. There is no test runner for the product.
- **`npm run build` proves the JSX and the mappers type-check against the row
  types declared in this file** — no Supabase client in this repository is
  parameterised with `Database`, so the cast is an assertion. Every column name
  was read by hand out of `20260815120000_production_calendar.sql` and checked
  against the six interfaces in `src/types/database.ts`. That chain is the only
  check performed.
- **Nothing here says a proposed date does not read as settled.** That is the one
  thing only a person can settle, and it is `44-UI-SPEC.md` §15's own conclusion.
  It belongs in plan 44-13's written procedure and carries `Result: pending`
  until somebody runs it. **It is not claimed here.**
- **Nothing here says a door-assigned member of staff is refused this page.**
  `verify:routes` reads declarations and opens no session. That is plan 44-13's
  procedure too.
- **The touch target on the new checkbox is unmeasured.** See the refusal above.

---

## Issues Encountered

One, and it is not this plan's: `verify:touch-targets` refuses on D1's stale
manifest, so task 3's named automated gate measured nothing. Recorded above with
its consequence rather than reported as a green.

---

## Repository Safety

`.planning/` is tracked and this repository is public.

- **No production material** in any of the four files or in this SUMMARY: no
  venue name at all, no date of any night, no line-up, no personal name.
  `docs/Music-*.ics` was **not opened**.
- **The venue word travels from the query into the header line and nowhere
  else.** It is in no `console.*`, no thrown message, no page title, no analytics
  call and no `aria-label`. The two log lines carry `error.code` and
  `error.message` and never `details`, which would carry the rejected row.
- **`ticked_by_name` renders on the gated surface and reaches no artefact.** The
  name is authorised in the database and stops there; this document names roles.
- **No line-up can reach `PiecesSection`**: its prop type has no field for one.
- `re:sonate` is written with a normal `e` throughout; the reversed glyph is
  typed nowhere and was checked by code point.
- **No sound allusion.** No string, class name, component name or comment in the
  four files says what a format sounds like.

---

## Known Stubs

**One, declared rather than hidden: the checklist's tick is not wired.**
`ChecklistSection` takes `onTick` as an optional prop and the page passes none,
because the act that records a tick is plan 44-12's — the plan's own task 3 says
so in as many words. The boxes are therefore `disabled`, and **the section draws
a sentence saying exactly that**, distinguishable from both refusal sentences.
It is not a silent stub: a reader is told why the control cannot be operated, and
44-12 removes both the disabled state and the sentence by supplying the prop.

Nothing else. Every other branch draws a real value or a sentence saying why it
cannot, and no component receives hardcoded empty data.

---

## Threat Flags

None. Every surface this plan creates was in the plan's own threat register, and
the six `mitigate` dispositions were applied:

| id | how |
|---|---|
| T-44-02 | the page re-asks the key bound to this address in the map's single entry, and the read goes through the cookie-bound client so the policy is exercised rather than bypassed |
| T-44-30 | `UUID_PATTERN` is tested before the client is constructed; a failing shape is `notFound()`, not a query |
| T-44-20 | every date is rendered through `PieceDate`'s five-variant union, and `PiecesSection` imports no date formatter, so it holds no bare date to draw |
| T-44-31 | `PieceRowView` has no name field; a LiveCut renders its part marker and nothing else |
| T-44-28 | three outcomes and never two, made separable by `.maybeSingle()`; the failed read has its own `role="alert"` region and never `notFound()` |
| T-44-32 | the author and the day render on the row, the tick is reversible, and the sentence saying it is not a one-way switch sits beside the code |

**T-44-20's residual is unchanged and is not claimed closed here**: whether a
proposal reads as unsettled to a person is a human judgement, booked as a written
check with `Result: pending` in plan 44-13.

---

## Notes for whoever comes next

1. **44-12 wires `ChecklistSection`'s `onTick`.** The prop type is
   `(itemId: string, ticked: boolean) => Promise<ChecklistTickOutcome>`, and
   `ChecklistTickOutcome`'s refusal has **two** members — map the action's richer
   union onto them and put an unrecognised code in `unexpected`, which the
   section names beside the sentence. Passing the prop also removes the
   read-only notice and the `disabled` attribute; nothing else needs touching.
2. **The page is the only file that renders `ChecklistSection`**, so the wiring
   lands in `[id]/page.tsx`, which 44-12's `files_modified` does not currently
   list.
3. **`AnnounceNightDialog` has no home on this page yet.** §11.1 puts the
   `Announce this night` button on S2; this plan renders no button, because the
   act does not exist. 44-12 adds both.
4. **Do not add a second map entry or a second capability key.** 44-09's entry
   already binds both patterns, and `npm run verify:routes` is the check that
   sees the dynamic one — `next build` never will.
5. **D6 above** is the one gap this plan leaves open on purpose.

---

## Self-Check: PASSED

| Claim | Method | Result |
|---|---|---|
| `[id]/page.tsx` exists | `ls` | found |
| `[id]/loading.tsx` exists | `ls` | found |
| `PiecesSection.tsx` exists | `ls` | found |
| `ChecklistSection.tsx` exists | `ls` | found |
| `27610b4` exists | `git log --oneline` | found |
| `7c552b3` exists | `git log --oneline` | found |
| `c7972c0` exists | `git log --oneline` | found |
| no file was deleted by any of the three | `git diff --diff-filter=D HEAD~3 HEAD` | empty |
| `npm run build` exits 0 | run | exit 0, `/admin/calendar/[id]` in the route table |
| `npm run verify:routes` exits 0 | run | exit 0 |
