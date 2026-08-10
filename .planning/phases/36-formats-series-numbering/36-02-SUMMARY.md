---
phase: 36-formats-series-numbering
plan: 02
subsystem: database
tags: [catalogue, backfill, production-calendar, series-numbering, public-repo, read-only]

# Dependency graph
requires:
  - phase: 34-one-work-surface
    provides: the route↔capability map the catalogue surface will enter
provides:
  - The three production nights read read-only, with their uuids
  - A proposed format/series/number assignment for each night, every cell labelled PROPOSED
  - The catalogue seed list, filtered to names already published in a tracked rules file
  - One structural finding plan 36-03 would otherwise have hit at write time
affects: [36-03, 36-05, 36-07, 36-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grep-before-write: a venue name enters a tracked file only if the identical string is already in .claude/rules/production-calendar.md or .claude/rules/brand-visual-system.md"

key-files:
  created:
    - .planning/phases/36-formats-series-numbering/36-02-SUMMARY.md
  modified: []

key-decisions:
  - "Night titles and venue names of all three nights are deliberately absent from this file — identification is by date, slot, hours and uuid"
  - "Nothing is CONFIRMED until the owner answers; this file ships with every assignment cell PROPOSED"

patterns-established:
  - "A proposal file states the counter-evidence beside the hypothesis when the value is monotone"

requirements-completed: []

# Metrics
duration: 14min
completed: 2026-08-10
---

# Phase 36 Plan 02: What the three nights were, proposed and not yet decided — Summary

**Production holds exactly the three nights the plan expects; two of them read as `re:sonate` on the calendar's own coordinates, the third matches none of the four formats — and the numbers cannot be derived from this side at all.**

## Performance

- **Duration:** ~14 min
- **Tasks:** 1 of 2 (task 2 is the owner's gate, still open)
- **Files modified:** 1
- **Database writes:** 0 — every Management API call carried `{"read_only": true}`

---

## Status: PROPOSED — the owner has not answered

**Nothing below is CONFIRMED.** This plan is `autonomous: false` and its second
task is a blocking decision. Plan 36-03 must not transcribe this file until the
`CONFIRMED` block at the bottom has been filled in with a date.

---

## What was read

Read-only against production through
`POST https://api.supabase.com/v1/projects/{ref}/database/query` with
`{"read_only": true}`, project ref derived from `NEXT_PUBLIC_SUPABASE_URL` in
`.env.local`.

**Count: exactly three `event_parties` rows across two events, both
`is_published = true`.** This reproduces `36-RESEARCH.md` § *Nel database di
produzione* (2 · 3 · 5) and `.planning/STATE.md`. No fourth night has appeared.
The backfill's premise holds.

### What is deliberately not written here

This repository is public and `.planning/` is tracked, so this file is a
publication. Two things were dropped on purpose, and their absence is the point:

- **The venue of each night.** Grepped first:
  `Booze`, `Muro` and `Perlone` appear in `.claude/rules/production-calendar.md`
  and `.claude/rules/brand-visual-system.md`. **None of the three venues these
  nights actually ran in does.** Two of the three nights carry
  `venue_secret = true` besides.
- **The title of each night.** One of the two titles is a play on its venue's
  name; the other collides with a word this phase must keep out of its files
  entirely (`sound-manifesto.md`). Neither is needed: date, slot and door hours
  identify each night without ambiguity, and the orchestrator can say the titles
  aloud when it asks — speaking is not publishing.

The uuids are written, and that is deliberate too: a uuid names nothing, and for
a published event it is already readable with the anonymous key
(`36-RESEARCH.md` § *Findings outside scope*, V1 — threat T-36-02-02, accepted).

---

## The three nights — PROPOSED

| # | Night uuid | When | Slot | Doors | Access | Venue kept secret | Selectors | Format | Series | Number |
|---|---|---|---|---|---|---|---|---|---|---|
| A | `fd975999-95df-4402-bc82-03a95424831b` | Sat 7 Feb 2026 | first act (`sort_order` 0) | 20:00 → 00:00 | free RSVP | no | 1 | **PROPOSED — none of the four fits. See below.** | **PROPOSED — withheld** | **PROPOSED — see below** |
| B | `11e43718-2e37-42b1-91b7-cc2d0754474e` | Sat 7 Feb 2026 | second act (`sort_order` 1) | 22:00 → 06:00 | paid | yes | 4 | **`re:sonate` — PROPOSED** | **`re:sonate` (`RSNT`) — PROPOSED** | **`001` — PROPOSED, low confidence** |
| C | `3db716af-8ce3-446e-a327-62b110bfe7ce` | Fri 8 May 2026 | only act (`sort_order` 0) | 22:00 → 04:00 | paid | yes | 4 | **`re:sonate` — PROPOSED** | **`re:sonate` (`RSNT`) — PROPOSED** | **`002` — PROPOSED, low confidence** |

Nights A and B are the two acts of one event; night C is its own event.

### The sentence behind each proposal

**Night B — `re:sonate`.** `production-calendar.md:36`:

> `RSNT` | Resonate — la notte | **22:00 → 06:00** | **venerdi' o sabato** | irregolare…

The doors are 22:00 → 06:00 to the minute, and 7 Feb 2026 is a Saturday. No
other format in the table starts at 22:00. It is also what D-36-03 already
settled: *«il secondo tempo di una serata SunSet e' una notte re:sonate, con nome
e numero propri»* — the second act is a night with its own name and its own
number, not the after of the first act. This is the strongest cell in the table.

**Night C — `re:sonate`.** Same row of the same table: 8 May 2026 is a Friday,
and the doors open at 22:00. **One divergence, flagged rather than smoothed
over:** the night closes at 04:00, not 06:00. That moves no format — nothing else
in the calendar opens at 22:00 — but it is a real difference from the declared
coordinate and the owner should see it stated, not discover it later.

**Night A — no format in the catalogue fits it.** This is the finding of the
plan, and it is why this cell is left open rather than filled with a plausible
guess. Each of the four was checked against `production-calendar.md:35-39` and
each is excluded by that file's own words:

| Format | Its declared coordinate | Night A | Verdict |
|---|---|---|---|
| `SNST` SunSet | 18:00 → 22:00, **3 date l'anno, solo aprile–ottobre** | 20:00 → 00:00, **February** | Excluded twice — by the hours and by the seasonal window. *Gate finestra stagionale:* a winter date «contraddice l'identita' del format, non solo il calendario» |
| `RMDB` RamaDub | 18:00 → 22:00, **giovedi', senza eccezioni su 27 date** | 20:00 → 00:00, **Saturday** | Excluded by the weekday, which that file states as a verified fact over 27 dates |
| `MTNLB` MotionLab | 18:00 → 22:00, one every 6 weeks | 20:00 → 00:00 | Excluded by the hours. Its weekday is an undecided placeholder, so it argues nothing either way |
| `RSNT` re:sonate | 22:00 → 06:00, Friday or Saturday | 20:00 → 00:00 | Weekday matches, hours do not — and night B, on the same evening, already is the 22:00 night |

Night A is a free-entry first act at a public venue with one selector, opening at
20:00 on a Saturday in February and closing at midnight. It is recognisably the
warm-up half of a double bill — but D-36-04 makes the format mandatory, and there
is no honest way to derive **which** format that is from this side. Only the
owner knows.

**Three ways night A can be answered, with what each costs:**

1. **It was a satellite** (`RamaDub`, or a format whose Saturday/February
   exception the calendar does not record). Then its series would carry its
   venue's name — **and that name is not in either tracked file**, so
   `withhold-series` applies. See the structural note below before choosing this.
2. **It was a fifth thing the catalogue does not hold yet.** Then a fifth format
   row is seeded and the owner names it, its code and its colour — but D-36-11
   fixed only four colours, and the colour of an active format is unique by
   construction (`36-03-PLAN.md:106`), so a fifth needs a fifth colour decided.
3. **It goes to the `unclassified` fallback** that `36-03-PLAN.md:183-187` adds,
   retired at birth. **This has a cross-plan cost that must be said out loud:**
   `36-05-PLAN.md:201` asserts *«the count of nights on the fallback format in
   production is `0`»* as an acceptance criterion. Choosing this makes it 1, and
   plan 36-05 has to be amended rather than silently failed.

### The numbers — the cell this side genuinely cannot fill

`meta-gates.md` lists the series numbering among the three monotone guards: an
assigned progressivo is already on a poster, so it is appended, never renumbered.
So the hypothesis is given with its counter-evidence beside it, not on its own:

- **For `001` / `002`:** the app's archive holds these two `re:sonate` nights and
  no others, in this order, February before May. The February event's own slug
  calls it the opening.
- **Against `001` / `002`:** `production-calendar.md:86` cites, as a live
  example, *«l'after movie di RSNT-008 attende RSNT-009»* — a night numbered
  **008** that has already run. The calendar's counter is nowhere near 001 today.
  The two nights in the database are not the two nights in the calendar's
  sequence; the app only started holding events recently, and *gate il calendario
  e' la fonte* says the calendar decides, not the table.

**This is a straight ask, not a proposal to approve:** the two integers come off
the calendar. If the answer is not `001` and `002`, correcting them now costs
nothing; correcting them after the migration ships costs a renumbering, which the
monotone guard forbids.

---

## Structural note plan 36-03 would otherwise hit at write time

`36-03-PLAN.md:274` adds
`event_parties_series_format_fk FOREIGN KEY (series_id, format_id) REFERENCES public.party_series (id, format_id)`,
and `:271` sets all three columns `NOT NULL`.

**Consequence: a night's series must belong to the night's format.** So the
`withhold-series` option, as `36-02-PLAN.md:156` words it — *«that night's
backfill uses the deliberately-retired fallback series»* — is only writable if
the night also takes the `unclassified` **format**, because that fallback series
hangs under `unclassified`. Format-known-but-series-withheld and
fallback-series are mutually exclusive under the composite key.

**The clean form of `withhold-series`, which does work:** seed a series under the
night's real format whose **name carries no venue** — the same shape as the plain
`re:sonate` series proposed for nights B and C, whose sigla in the calendar
(`RSNT-###`) carries no venue code either. The night attaches to that, and the
venue-named series is created through the catalogue surface after the phase
ships, when the venue may be named. Nothing is published that should not be.

Recorded here so 36-03 does not have to guess. Not acted on: the owner's answer
decides whether it is needed at all.

---

## Catalogue seed list — PROPOSED

### The four formats, all `listed = true`

The colours are adopted, not invented (D-36-11, `36-UI-SPEC.md:186-189`). They
are already decided and already public; this table re-states them, it does not
re-open them.

| Name (verbatim, as a visitor reads it) | Slug | Code | Colour |
|---|---|---|---|
| `SunSet` | `sunset` | `SNST` | `#FFB25E` |
| `RamaDub` | `ramadub` | `RMDB` | `#FF7A2F` |
| `MotionLab` | `motionlab` | `MTNLB` | `#FF5C93` |
| `re:sonate` | `resonate` | `RSNT` | `#A874E8` |

The fifth row `36-03-PLAN.md:183` adds — `unclassified`, `listed = false`,
retired at birth — is structural and names nothing, so it is not part of what the
owner clears.

### The series — only names already published in a tracked file

Each row was grepped before being written. The evidence column carries the
`file:line` where the name already exists.

| Format | Series name | Code | Already published at | Seed? |
|---|---|---|---|---|
| `re:sonate` | `re:sonate` | `RSNT` | `production-calendar.md:36` — the sigla is `RSNT`, with no venue code in it | **yes** — and it is the series nights B and C need |
| `re:sonate` | `re:sonate x Perlone` | `PRLN` | `production-calendar.md:30, 41` — «titolo `Resonate x Perlone`, sigla `RSNT-PRLN-###`» | **yes** — see the spelling note |
| `RamaDub` | `RamaDub x Booze` | `BZ` | `production-calendar.md:38, 43`; the venue's own wording at `brand-visual-system.md:69` | **yes** |
| `RamaDub` | `RamaDub x Muro` | `MR` | `production-calendar.md:38, 44` | **yes** |
| `SunSet` | `SunSet` | `SNST` | `production-calendar.md:37` — the sigla is `SNST`, with no venue code | **yes** — names no venue |
| `MotionLab` | — | — | **nothing.** `production-calendar.md:46-48`: *«La sede di MotionLab non si nomina qui»* | **no — and its absence is the point** |

**MotionLab ships with no series.** That is not an omission to fix in 36-03: its
series is created through the catalogue surface after the phase ships, by a
person, on the day the venue may be named. D-36-07 already decided that
MotionLab's progressivo restarts per venue, so the series it needs is a
venue-named one — exactly the kind that cannot be written into a public file
today.

**Spelling note, for question 3.** `production-calendar.md` writes the Nice
series as `Resonate x Perlone`, with a capital R. `brand-visual-system.md` holds
that the brand is written `re:sonate` with a normal e *«nelle grafiche, nell'app,
nelle mail, in prosa, ovunque»*, and that *«il nome sull'app e' il nome del
format»*. Since this string is the **public name a visitor reads on a card**, the
proposal above writes it `re:sonate x Perlone`. If the owner prefers the
calendar's casing, say so and it is written that way instead — but the two files
should then be reconciled, because one of them is wrong.

---

## The three questions for the owner

1. **Is this what each night was?** Nights B and C read as `re:sonate` on the
   calendar's own hours and weekday. **Night A matches none of the four** — what
   was it?
2. **Is this the number each carries?** `001` and `002` are a hypothesis from the
   app's archive, and `production-calendar.md:86` already names an `RSNT-008`
   that has run. What are the two integers on the calendar?
3. **May each of these names be written into a public file today?** The list is
   `re:sonate`, `re:sonate x Perlone`, `RamaDub x Booze`, `RamaDub x Muro`,
   `SunSet`, and the four format names. MotionLab's series is deliberately not on
   it.

---

## CONFIRMED — to be filled by task 2

> **Empty by design.** Plan 36-03 reads this block, not the proposal above. If it
> is still empty, the migration cannot be written.

| Night uuid | Format | Series | Number | Confirmed on |
|---|---|---|---|---|
| `fd975999-95df-4402-bc82-03a95424831b` | — | — | — | — |
| `11e43718-2e37-42b1-91b7-cc2d0754474e` | — | — | — | — |
| `3db716af-8ce3-446e-a327-62b110bfe7ce` | — | — | — | — |

**Catalogue rows cleared for the migration:** — *(pending)*

**Fallback in use, if any:** — *(pending)*

---

## Decisions Made

- **Venue names and night titles left out of this file.** The grep against the
  two tracked rules files returned nothing for any of the three venues, so
  invariant 1 forbids writing them. The titles were dropped by the same
  reasoning — one is derived from its venue's name, the other contains a word
  this phase keeps out of its files. Identification is by date, slot, hours and
  uuid, which is unambiguous and publishes nothing.
- **Night A's format is left open rather than guessed.** Four exclusions are
  documented with the line that produces each. A filled cell here would be a
  machine inferring what a night was, which is exactly what the plan's objective
  forbids.
- **The number hypothesis ships with its counter-evidence attached.** On a
  monotone value, a proposal the owner can approve without seeing the
  counter-argument is worse than no proposal.

## Deviations from Plan

None. The read returned the expected count, and the plan halts at task 2 by
design.

One thing was **added** and not asked for — the structural note about the
composite foreign key versus the `withhold-series` option. It is recorded because
plan 36-03 would otherwise write a backfill statement the constraint refuses, and
`36-02-PLAN.md:165` asks that the fallback be recorded explicitly *«so plan 36-03
does not have to guess»*.

## Issues Encountered

- `event_parties` has no `start_time` column and `venues` has no `city` column;
  the door time is `event_parties.time`. Two failed read-only probes, corrected
  by reading `information_schema.columns`. No writes attempted at any point.

## Verification

- Read-only enforced: every Management API call carried `{"read_only": true}`.
  Zero `INSERT`, `UPDATE` or `DELETE` (threat T-36-02-03).
- Count reproduced: 3 nights / 2 events / both published, matching
  `36-RESEARCH.md` § *Nel database di produzione*.
- Venue-name grep run **before** writing, against
  `.claude/rules/production-calendar.md` and
  `.claude/rules/brand-visual-system.md`: `Booze`, `Muro`, `Perlone` present;
  the three real venues absent, therefore unwritten (threat T-36-02-01).
- Nothing in this file says what any format sounds like — no style, no tempo, no
  adjective that reads as a promise (`sound-manifesto.md`).
- Spelling: `re:sonate` with a normal e throughout; `SunSet`, `RamaDub`,
  `MotionLab` in CamelCase.

## Next Phase Readiness

**Blocked on the owner.** Plan 36-03 needs the `CONFIRMED` block filled. Until
then it has three uuids and no assignments, and `36-03-PLAN.md:252` requires one
explicit statement per night.

Downstream to watch: if night A lands on the `unclassified` fallback,
`36-05-PLAN.md:201` needs amending, because it asserts that count is zero.

---
*Phase: 36-formats-series-numbering*
*Proposal written: 2026-08-10 — awaiting the owner's answer*
