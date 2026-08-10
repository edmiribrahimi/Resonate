---
phase: 36-formats-series-numbering
plan: 11
subsystem: public-surface
tags: [searchparams, filter, rls, disclosure, venue-secrecy, postgrest-embed, measured]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: "the applied schema and the four policies as production holds them (36-05)"
  - phase: 36-formats-series-numbering
    provides: "FormatMarker, typed and until now never mounted (36-06)"
provides:
  - "The `/events` URL contract: `?format=` and `?tab=`, read as untrusted input, no redirect on any value"
  - "One catalogue query, outside the catch, identical for anonymous and staff"
  - "The format axis on the card, with the series name gated on the stored `venue_secret` flag"
  - "FormatFilterRow — the chip row that is not given the results"
  - "The measured PostgREST embed hint the rest of the phase must copy"
affects: [36-12, 36-13, 36-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A PostgREST embed of `party_series` through `event_parties` MUST carry `!event_parties_series_id_fkey`: two relationships exist, and the unqualified form is `HTTP 300 PGRST201`"
    - "A component that must not depend on data is given no data — the guarantee is the prop list, not a rule somebody keeps"
    - "A Supabase `error` that is discarded turns a refusal into an empty list; splitting it by `error.code` separates a defect (throw) from a transport failure (today's behaviour)"

key-files:
  created:
    - src/app/(public)/events/FormatFilterRow.tsx
    - .planning/phases/36-formats-series-numbering/36-11-SUMMARY.md
  modified:
    - src/app/(public)/events/page.tsx
    - src/app/(public)/events/EventTabs.tsx
    - src/components/formats/FormatMarker.tsx

key-decisions:
  - "The venue gate uses the stored `venue_secret` flag and `!== false`, so a missing row or a failed join is treated as secret — the narrower of the two candidates wins"
  - "An absent format row renders no marker rather than a placeholder: an unlisted format is one nobody announced, and a placeholder would announce it"
  - "The events query error is no longer discarded; a database refusal is thrown after the catch, a transport failure keeps today's graceful-empty behaviour"
  - "EventTabs took an additive optional `activeTab` prop so a shared `?tab=past` link opens on Past before 36-12 lands"
  - "FormatMarker took an additive optional `dimmed` prop so the chip mounts it instead of re-implementing a format label"
  - "Nessun `FMT-*` spuntato in REQUIREMENTS.md — D-36-19"

patterns-established:
  - "Where an acceptance grep and the plan's own action text disagree, the code satisfies the rule and the summary reports the grep's hits line by line — a token in prose that forbids it is not the defect the grep was written to catch"

requirements-completed: []  # deliberately empty — D-36-19

# Metrics
duration: 55min
completed: 2026-08-10
---

# Phase 36 Plan 11: The filter in the address, and the count with nowhere to appear — Summary

**`/events` now reads two parameters, builds its chip row from the catalogue and
from nothing else, and degrades a card to the format name whenever any night on
it is secret — and the one thing that had to be measured rather than reasoned
was measured: the obvious form of this page's own query answers `HTTP 300
PGRST201`, which a green build would never have told anybody.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3 of 3
- **Commits:** 3 of task + 1 of documentation
- **Database writes:** zero. Every probe run for this plan was a `GET` with the anonymous key.

---

## What was built

### Task 1 — the two parameters and the catalogue query (`812d3f7`)

`searchParams` in the local-interface form, awaited, with the index-signature
type that is the honest one: a repeated parameter arrives as `string[]`, and
that is **not a case with a behaviour of its own** — it is an unrecognised
value, and an unrecognised value means no filter. Both parameters are read only
when they are strings.

The catalogue read sits **outside** the `try/catch`, next to
`getAccessContext()`, and carries the reasoning already written there. Two
sentences, both load-bearing:

- a failed catalogue read swallowed into an empty array renders a chip row
  indistinguishable from a healthy one — the shape `meta-gates.md` forbids, and
  with no error tracking in this project nothing else would ever say so;
- the row must not vary with the **viewer** either. One query, one path, for
  anonymous and staff alike (D-36-13, D-36-16).

It filters `listed` **and** `retired_at`, which are two different facts
(D-36-17) — and the code says that RLS asks only the first, so the second filter
is the page's, not the database's. No count, no join to the nights, no
aggregate.

The filter is validated by **membership of the active catalogue**: an allow-list
drawn from the data, the narrowest form available. Unknown, retired, unlisted,
repeated and absent all resolve identically. No redirect on any value, because a
redirect that fired for unknown slugs and not for known ones would answer *"is
this a real format?"* one probe at a time.

### Task 2 — the format axis on the card, and the venue gate on the name (`1e84094`)

Formats travel the road venues and lineup already travel: collected from the
nights, sorted by `sort_order`, deduplicated. Two nights of one format make one
marker; one card per event, never one card per night.

The gate on which name a marker shows is a venue-secrecy clause, and the code
declares its predicate rather than leaving it inferable:

| | |
|---|---|
| Predicate used | the **stored flag** `event_parties.venue_secret` |
| Predicate **not** used | the time- and entitlement-dependent verdict `isVenueVisible` returns |
| Test written | `some((p) => p.venue_secret !== false)` |
| Why `!== false` | a missing row, a failed join or an absent column is treated as secret; the fallback is always the narrower string |
| Why the stored flag | it is the narrower of the two — a night whose venue has since been revealed still shows the format name — and `venue-secrecy.md`'s default-closed gate says the narrower wins |

An **absent format row renders no marker**, and the sentence saying why is in the
code so nobody repairs it into a placeholder: the embed is refused by the same
`formats_select_listed` that refuses the catalogue, so an absent row means an
unlisted format, which means a format nobody has announced.

The filter runs **on the array already rendered**. There is no second query, and
the code says why: a separate *"does this format have anything?"* read is exactly
the shape that would see a draft and turn it into a visible difference.

### Task 3 — `FormatFilterRow` (`58cbbc5`)

A server component. Anchors with `aria-current`, not buttons with a pressed
state — the filter is navigation, so it works with no JavaScript, opens in a new
tab and copies from the context menu. `All` first with no swatch, then one chip
per catalogue entry in the catalogue's own order, exactly one current.

**The guarantee that no chip depends on the data is structural rather than a
rule to keep: this component is not given the results.** Its props are the
catalogue, the active slug and the active tab. A chip cannot go dark for a
format with nothing published, because nothing in scope knows.

Every href is a template literal built at the call site — a bare `string`
variable does not compile under `typedRoutes` — carrying the other axis, and
never writing a default into the address.

---

## Verification — what was run, and what each thing can prove

| Gate | Result |
|---|---|
| `npm run build` after each task | green (see the note on the shared working tree below) |
| `npx tsc --noEmit` | **0 errors** |
| Production probe of the embed, anonymous key, read-only | see below — **this is the one that found a defect** |
| Production probe of the transform and the filter | see below |

### The thing a green build could not have told anybody

`36-06-SUMMARY.md` records that no Supabase client here is parameterised with
`Database`, so a query is documentation until it is run. It was run, against
production, with the anonymous key, before a line of the page was written:

```
A: HTTP 300 — code=PGRST201
   message="Could not embed because more than one relationship was found for
            'event_parties' and 'party_series'"
   hint="Try changing 'party_series' to one of the following:
         'party_series!event_parties_series_format_fk',
         'party_series!event_parties_series_id_fkey'."
B: HTTP 200 — (with `!event_parties_series_id_fkey`)
```

The migration declares **two** relationships between those tables — the plain
`series_id` reference and the composite `event_parties_series_format_fk` — so the
obvious form of this page's query fails. And it fails **silently**: PostgREST
answers `data: null` with no exception, the `catch` never fires, and the page
renders *"No upcoming events"* to every visitor. The hint is now in the code with
the measurement beside it, and `36-12` must copy it on the night detail.

### The transform and the filter, over the real anonymous payload

Shapes and booleans only — no name, no slug, no value left the probe.

| Observation | Result |
|---|---|
| Published events readable by `anon` | 2 |
| Card with 2 nights → markers | **1** — the dedup collapses two nights of one format |
| Cards where any night is secret | **2 of 2** |
| Cards rendering a **series** name | **0** — both degraded to the format name, as the gate requires |
| Marker colours well-formed `#RRGGBB` | all |
| Marker slugs present in the active catalogue | all |
| Marker names containing a digit run | none |

And the filter, over every catalogue slug plus three unrecognised values:

| Probe | Recognised | `All` current | List |
|---|---|---|---|
| the one format with published nights | yes | no | 2 cards |
| the other three catalogue formats | yes | no | 0 cards — the same empty state for each |
| an invented slug | **no** | **yes** | **complete** |
| `unclassified` (exists, unlisted, retired) | **no** | **yes** | **complete** |
| the empty string | **no** | **yes** | **complete** |

The fourth row is the retired-slug rule proved rather than asserted: a slug that
**exists in the database** behaves byte-identically to one that was invented,
because the allow-list is the *active* catalogue and not the table.

### The grep gates, honestly

Two acceptance criteria in the plan contradict the plan's own action text, which
asks for a sentence naming the very token the grep forbids. The code satisfies
the rule; the summary reports the hits.

`src/app/(public)/events/page.tsx`:

| Gate | Asked | Got | Where |
|---|---|---|---|
| `searchParams` | ≥1, awaited | 4, awaited | — |
| `redirect` | 0 | **2** | both inside the comment that forbids one. `grep -c "redirect("` → **0**; `grep -c "next/navigation"` → **0** |
| `.select(...code|number)` | 0 | 0 | — |
| `from(` | exactly the two reads | **2** | `events`, `formats` |
| `isVenueVisible` | 0 | **1** | the comment naming the predicate this surface does **not** use. `grep -c "isVenueVisible("` → **0**; no import |
| `.length}` / `disabled` / `head: true` | 0 | 0 | — |
| `count` | 0 | **2** | both in prose forbidding it |
| the reversed e | 0 | 0 | — |

`src/app/(public)/events/FormatFilterRow.tsx`:

| Gate | Asked | Got |
|---|---|---|
| `"use client"` | 0 | 0 |
| `aria-current` | ≥1 | 5 |
| `aria-pressed` | 0 | **0** |
| `uppercase` / `tracking-widest` | 0 | **0** |
| `bg-accent` | 0 | **0** |
| `.length` / `disabled` | 0 | **0** |
| `aria-label` / `title=` containing a number | none | none — one `aria-label`, `"Filter events by format"` |
| the reversed e | 0 | 0 |

Where prose could carry the meaning without the token, the token was removed —
the file's claim that *no element in `src/` carries the pressed-state attribute*
would otherwise have been falsified by the comment making it. Where the token
**is** the subject of a distinction the plan demanded be written down
(`isVenueVisible` against `venue_secret`; the absence of a redirect), the
sentence was kept and the code-level grep is reported instead.

### What this plan does **not** prove

1. **It does not prove FMT-06, and the page now says so in its own comment.**
   `/events` reports *"no difference"* because it cannot see one: RLS refuses
   unpublished rows to `anon` regardless of what this page decides. A filter that
   does not show a draft has not been shown to be **incapable** of showing one.
   The proof is plan 36-13's written procedure, against a night seeded
   unpublished on purpose.
2. **The series-name branch of the venue gate is untaken in production today.**
   Both published events carry a secret night, so both cards degrade. The branch
   that renders a series public name has been reasoned and typed, and never
   observed. Whoever runs 36-13's procedure can observe it by seeding a night
   with `venue_secret = false`.
3. **Nothing here was looked at.** The chip row, its contrast against the real
   ground, its scroll behaviour on a phone and the marker's fit inside a 44px
   chip have not been seen by a human. `36-06-SUMMARY.md` asked that the first
   plan to mount `FormatMarker` look at it; this plan mounted it and **did not**,
   because no browser was available to it. That is a debt for 36-13's procedure,
   not a claim quietly skipped.
4. **A green build checks no column name.** It did not catch `PGRST201`; the
   probe did.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] `EventTabs` could not honour `?tab=past`**

- **Found during:** Task 2.
- **Issue:** the plan's success criterion is that `/events?format=<slug>&tab=past`
  *renders the right list*, and its action text says to pass the active tab to
  the children. `EventTabs` holds the tab in `useState` initialised to
  `"upcoming"` and declares only `upcoming` / `past` as props, so passing a third
  is an excess-property error and, without it, a shared `?tab=past` link opens on
  Upcoming.
- **Fix:** one **additive optional** prop, `activeTab?: "upcoming" | "past"`,
  used as the initial state. Nothing else changed: the component still owns the
  tab locally, because that state drives `baseOffset` and therefore the swipe,
  and a gesture that waits on a navigation is a broken gesture on the shop
  window. The prop's docblock says the other half — writing the address back and
  resyncing — belongs to **plan 36-12, which owns this file** and is a later
  wave.
- **Files modified:** `src/app/(public)/events/EventTabs.tsx`
- **Commit:** `1e84094`

**2. [Rule 3 — Blocking] `FormatMarker` had no off state, and the instruction was to mount it rather than re-implement it**

- **Found during:** Task 3.
- **Issue:** the chip anatomy in `36-UI-SPEC.md` §S1 asks for a swatch at
  `opacity .4` and `text-muted` ink when a chip is off. `FormatMarker` hardcodes
  full opacity and `text-foreground`, and its `className` prop is documented as
  *"never used to restyle the name"*. Hand-rolling the label instead would have
  produced a **second** element rendering a format name with no guarantee about
  its own casing — the exact failure `normal-case` exists to prevent, and the one
  that publishes to every visitor at once.
- **Fix:** one **additive optional** prop, `dimmed?: boolean`, defaulting to
  `false`, which lowers the square to `opacity-40` and the name to `text-muted`
  and touches nothing else. Its docblock states what it is **not**: it answers
  *"is this the chip the address selected?"*, never *"does this format have
  anything to show?"* — the second question is a count with one bit of
  resolution.
- **Why this was safe to do to another plan's file:** no plan in flight or ahead
  lists `src/components/formats/FormatMarker.tsx` in `files_modified` (36-09 wave
  7 and 36-12 wave 6 both mount it, neither edits it), and an additive optional
  prop cannot break either.
- **Files modified:** `src/components/formats/FormatMarker.tsx`
- **Commit:** `58cbbc5`

**3. [Rule 2 — Missing critical] The events query's `error` was discarded**

- **Found during:** Task 1.
- **Issue:** the line was `const { data: events } = await query;`. Adding two
  embeds is what makes that untenable — PostgREST answers a malformed or refused
  embed with `data: null` **and no exception**, so the surrounding `catch` never
  fires and the page renders *"No upcoming events"*. That is the anti-pattern
  table's own entry, reached by a new road, and this project has no error
  tracking, so a log alone reaches nobody. The measured `PGRST201` above is not a
  hypothetical: it is what the obvious version of this query returns.
- **Fix:** the error is destructured, logged with its own category, and **split
  by cause**, because the two deserve opposite answers. A database refusal
  carries a SQLSTATE or `PGRST…` code — it is a defect, it will never fix itself,
  and it is recorded and thrown **after** the catch so it reaches Next's error
  boundary. A transport failure carries no code, and that is the transient case
  the catch was written for; **its behaviour is left exactly as it was.**
- **Files modified:** `src/app/(public)/events/page.tsx`
- **Commit:** `812d3f7`

### Departures from the plan text, deliberate and stated

1. **`FormatFilterRow` is mounted in Task 3's commit, not Task 2's.** Task 2's
   action text says to pass the catalogue and the active slug to the children,
   but the child does not exist until Task 3. Mounting it in Task 2 would have
   left a commit that does not build. Every commit in this plan builds.
2. **Two acceptance greps are reported rather than satisfied literally**
   (`redirect` → 2, `isVenueVisible` → 1), because the same plan's action text
   demands the sentences that contain them. The corresponding code-level greps
   are 0 and are reported above.
3. **The current chip is not scrolled into view on mount.** `36-UI-SPEC.md` §S1
   asks for it; it needs JavaScript, and the same section requires this to be a
   server component so the filter works without any. The second ask wins because
   FMT-04 depends on it. The current chip carries `scroll-margin-inline: 24px`,
   so the scroll a browser performs on its own — the one it does when a chip
   takes keyboard focus — lands on the gutter. Recorded as **D4** in
   `deferred-items.md`, and recorded there only after plan 36-10 had committed
   its own entries: that file was held uncommitted by a parallel executor for
   most of this plan's execution, and appending to it earlier would have swept
   their work into one of these commits.

### Not done, on purpose

- **No `FMT-*` ticked in `REQUIREMENTS.md`** — D-36-19. This plan cannot prove
  the requirement that lives on its own surface; the phase verification ticks
  them once, with the evidence beside it.
- **`EventTabs` was not converted to drive the address**, and the card marker row
  is not rendered. Both are plan 36-12's, wave 6, and the one prop added here is
  named as the seam.
- **`src/app/(admin)/admin/events/actions.ts` and
  `src/app/(admin)/admin/formats/actions.ts` were not touched** — 36-10 and 36-07
  own them and were executing in parallel.
- **The number and the codes are not fetched by this page**, on either side of
  either embed. The disclosure matrix is enforced at the query rather than at the
  template: a column that never arrives cannot be rendered by an edit that was
  not thinking about the rule.

## Issues Encountered

**The working tree is shared with two concurrent executors, and it cost one
build.** Plans 36-07 and 36-10 executed in the **same checkout** — one worktree,
no isolation. Two consequences, both handled and neither hidden:

- Task 2's `npm run build` failed with two type errors in
  `src/app/(admin)/admin/(work)/events/new/page.tsx` and `…/[id]/edit/page.tsx`,
  from an uncommitted mid-flight `EventForm.tsx` belonging to **36-10**, whose
  `files_modified` lists all three. Out of scope by the scope-boundary rule, and
  not repaired. `npx tsc --noEmit` was run instead and reported **exactly those
  two errors and nothing under `src/app/(public)/events/`** — which is the
  evidence that Task 2 typechecked. Both errors were gone by Task 3, when 36-10's
  work landed, and the build has been green since.
- `next build` holds a lock on `.next/`; two concurrent builds meet
  *"Unable to acquire lock"*. The final build was retried until the lock freed.

## Known Stubs

None. No placeholder string, no mock, no default colour, no hardcoded empty
value. The one case that renders nothing — a night whose format row the reader
was refused — is a **decision** with its reason in the code, not a stub: a
placeholder there would announce the format it was standing in for.

## Threat Flags

No security surface beyond the plan's own register. Each entry, with what closed
it:

| Threat | Closed by |
|---|---|
| T-36-11-01 · a count on a public surface | No aggregate fetched, no number in any label or attribute, the child is not given a total to render |
| T-36-11-02 · a chip whose appearance depends on the data | `FormatFilterRow` has no results prop — structural, not a rule |
| T-36-11-03 · enumeration through a redirect | No redirect on any value; measured that a real-but-retired slug behaves identically to an invented one |
| T-36-11-04 · a series name publishing a venue | The stored-flag gate, declared in the code, with `!== false` so the unknown case degrades |
| T-36-11-05 · two construction paths for the chip row | One query, before the branch that decides drafts, for everyone |
| T-36-11-06 · `?format=` as untrusted input | Allow-list drawn from the active catalogue; no library, no error, no redirect |
| T-36-11-07 · a failed catalogue read rendering as an empty row | The read is outside the catch and throws |
| T-36-11-SC · package installs | No package installed |

One note that is not a flag but is worth writing down: the two probes run for
this plan read production with the anonymous key. Both were `GET`, both printed
**shapes and booleans only** — no name, no slug, no address, no key — and both
live outside the repository, which is public.

## Self-Check: PASSED

- `src/app/(public)/events/FormatFilterRow.tsx` — present, contains `aria-current`
- `src/app/(public)/events/page.tsx` — present, contains `searchParams`
- `src/app/(public)/events/EventTabs.tsx` — present, contains the optional `activeTab` prop
- `src/components/formats/FormatMarker.tsx` — present, contains `normal-case` and `dimmed`
- `812d3f7`, `1e84094`, `58cbbc5` — all present in `git log`
- No tracked file deleted by any of the three commits (`git diff --diff-filter=D` empty for each)
- The comment at the old `:42-57` survives **line for line**, with the filter's
  inheritance of its problem appended beneath it rather than replacing it

---
*Phase: 36-formats-series-numbering*
*Written and verified: 2026-08-10. One green build per task, one clean `tsc`, two read-only production probes — and one of them found the defect the build could not.*
