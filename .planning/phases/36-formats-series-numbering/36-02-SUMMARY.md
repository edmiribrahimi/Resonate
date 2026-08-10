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
  - The confirmed assignment - night id → format, series, number - which plan 36-03 transcribes verbatim
  - The catalogue rows the migration may seed, every name cleared by the owner for a public file
  - The reason `number` stays nullable while `format_id` and `series_id` do not
affects: [36-03, 36-05, 36-07, 36-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grep-before-write: a venue name enters a tracked file only if the identical string is already in .claude/rules/production-calendar.md or .claude/rules/brand-visual-system.md"
    - "A night may carry no number: the number is what makes a sigla, and an act of another night has no sigla of its own"

key-files:
  created:
    - .planning/phases/36-formats-series-numbering/36-02-SUMMARY.md
  modified: []

key-decisions:
  - "Night A is the first act of night B, not an edition: same format, same series, NO number"
  - "`number` stays nullable on event_parties; `format_id` and `series_id` become NOT NULL"
  - "Nights B and C are re:sonate 001 and 002 - the owner's answer, against the RSNT-008 counter-evidence this plan raised"
  - "Five series names cleared for a public file; MotionLab ships with none, and the absence is the point"
  - "The public name of the Nice series is `re:sonate x Perlone`; production-calendar.md still writes `Resonate x Perlone` and is owed an alignment"
  - "Night titles and venue names of all three nights are deliberately absent - identification is by date and uuid"

patterns-established:
  - "A proposal file states the counter-evidence beside the hypothesis when the value is monotone"
  - "A CONFIRMED block, dated, is what a downstream migration reads - never the proposal above it"

requirements-completed: [FMT-01, FMT-02, FMT-05]

# Metrics
duration: 21min
completed: 2026-08-10
---

# Phase 36 Plan 02: What the three nights were, confirmed — Summary

**Two `re:sonate` nights numbered 001 and 002, and a third that is the first act of one of them and therefore carries no number at all — which is why `number` stays nullable while the format and the series do not.**

## Performance

- **Duration:** ~21 min
- **Tasks:** 2 of 2
- **Files modified:** 1
- **Database writes:** 0 — every Management API call carried `{"read_only": true}`

---

## Status: CONFIRMED by the owner, 2026-08-10

Every cell below is the owner's answer, not an inference. Plan 36-03 reads the
`CONFIRMED` block near the bottom of this file and transcribes it into three
explicit statements against three known uuids.

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
  identify each night without ambiguity, and the owner was asked with the titles
  spoken aloud — speaking is not publishing.

The uuids are written, and that is deliberate too: a uuid names nothing, and for
a published event it is already readable with the anonymous key
(`36-RESEARCH.md` § *Findings outside scope*, V1 — threat T-36-02-02, accepted).

---

## The three nights — CONFIRMED

| # | Night uuid | When | Slot | Doors | Format | Series | Number |
|---|---|---|---|---|---|---|---|
| A | `fd975999-95df-4402-bc82-03a95424831b` | Sat 7 Feb 2026 | first act (`sort_order` 0) | 20:00 → 00:00 | **`re:sonate`** — CONFIRMED | **`re:sonate` (`RSNT`)** — CONFIRMED | **none** — CONFIRMED |
| B | `11e43718-2e37-42b1-91b7-cc2d0754474e` | Sat 7 Feb 2026 | second act (`sort_order` 1) | 22:00 → 06:00 | **`re:sonate`** — CONFIRMED | **`re:sonate` (`RSNT`)** — CONFIRMED | **`1`** (`RSNT-001`) — CONFIRMED |
| C | `3db716af-8ce3-446e-a327-62b110bfe7ce` | Fri 8 May 2026 | only act (`sort_order` 0) | 22:00 → 04:00 | **`re:sonate`** — CONFIRMED | **`re:sonate` (`RSNT`)** — CONFIRMED | **`2`** (`RSNT-002`) — CONFIRMED |

Nights A and B are the two acts of one event; night C is its own event.

### Night A: the first act of B, not an edition

The owner's answer closed the cell this plan deliberately left open. **A is the
first act of the night B, not an edition of its own.** It therefore takes B's
format and B's series and **carries no number**.

The proposal had documented four exclusions — `SNST` out twice (hours, and
February against the April–October window), `RMDB` out on the weekday
(«giovedì, senza eccezioni su 27 date», that Saturday), `MTNLB` out on the hours,
`RSNT` matching the weekday but not the hours. The answer explains all four at
once: A's coordinates match no format **because it is not a format's edition** —
it is the opening half of one, and the calendar's table describes editions.

### Nights B and C: `re:sonate`, 001 and 002

`production-calendar.md:36` — «`RSNT` | Resonate — la notte | **22:00 → 06:00** |
**venerdì o sabato**». The 7th of February is a Saturday, the 8th of May a
Friday, both open at 22:00, and no other format in that table opens at 22:00.
D-36-03 had already settled that the second act of a double bill is a night with
its own name and its own number.

**On the numbers, and what was raised against them.** This plan flagged that
`production-calendar.md:86` cites, as a live example, «l'after movie di
**RSNT-008** attende RSNT-009» — a night numbered 008 that has already run, which
argues the calendar's counter is nowhere near 001. **Raising it was right; the
owner's answer is `001` and `002`, and it stands.** Recorded, not reopened. The
monotone guard (`meta-gates.md`) now applies: these two are appended to, never
renumbered.

**One archive fact, flagged and not corrected: night C closes at 04:00, not
06:00** as the `RSNT` coordinate declares. That is what that night was. The
migration records it; it does not tidy it.

---

## Why `number` stays nullable — the constraint change this answer forces

Plan 36-03 was amended on 2026-08-10, by the orchestrator, before this SUMMARY
closed: **`format_id` and `series_id` become `NOT NULL`, and `number` does
not.** The reason belongs here so 36-03 finds it already written rather than
having to reconstruct it:

> A night without a number is a night that is **the act of another night**, and
> it has no sigla of its own. With `number NOT NULL` night A's row is not
> writable at all: giving it B's number gets it refused by the uniqueness
> constraint, and giving it a number of its own enters it into the sequence as an
> edition — which writes a false fact about what that night was. FMT-02 says the
> code and the number **compose** the sigla; it does not say every night has one.
> In Postgres two `NULL`s are distinct, so
> `UNIQUE (format_id, series_id, number)` keeps working and two numberless acts
> are not a duplicate.

**Consequence for the guard in the migration:** the `DO` block counts the rows
still carrying a null **`format_id`**. It must **not** count the rows carrying a
null `number` — under this decision that count is legitimately non-zero, and a
guard that failed on it would refuse the very row it exists to protect.

This also narrows what FMT-03 rejects, and the narrowing is intended: the
uniqueness constraint refuses two *editions* sharing a triple, and says nothing
about two acts that are not editions.

---

## Catalogue seed list — CONFIRMED, cleared for a public file 2026-08-10

### The four formats, all `listed = true`

The colours are adopted, not invented (D-36-11, `36-UI-SPEC.md:186-189`). They
were already decided and already public; this table re-states them, it does not
re-open them.

| Name (verbatim, as a visitor reads it) | Slug | Code | Colour |
|---|---|---|---|
| `SunSet` | `sunset` | `SNST` | `#FFB25E` |
| `RamaDub` | `ramadub` | `RMDB` | `#FF7A2F` |
| `MotionLab` | `motionlab` | `MTNLB` | `#FF5C93` |
| `re:sonate` | `resonate` | `RSNT` | `#A874E8` |

The fifth row `36-03-PLAN.md:183` adds — `unclassified`, `listed = false`,
retired at birth — is structural and names nothing, so it was not part of what
the owner cleared. **It is expected to hold zero rows in production**, and this
answer keeps it that way: all three nights land on `re:sonate`.

### The series — five names, each cleared by the owner

Each row was grepped before being written. The evidence column carries the
`file:line` where the name already existed.

| Format | Series name | Code | Already published at | Seed? |
|---|---|---|---|---|
| `re:sonate` | `re:sonate` | `RSNT` | `production-calendar.md:36` — the sigla is `RSNT`, with no venue code in it | **yes** — and it is the series all three nights take |
| `re:sonate` | `re:sonate x Perlone` | `PRLN` | `production-calendar.md:30, 41` | **yes** — spelling decided, see below |
| `RamaDub` | `RamaDub x Booze` | `BZ` | `production-calendar.md:38, 43`; the venue's own wording at `brand-visual-system.md:69` | **yes** |
| `RamaDub` | `RamaDub x Muro` | `MR` | `production-calendar.md:38, 44` | **yes** |
| `SunSet` | `SunSet` | `SNST` | `production-calendar.md:37` — the sigla is `SNST`, with no venue code | **yes** — names no venue |
| `MotionLab` | — | — | **nothing.** `production-calendar.md:46-48`: «La sede di MotionLab non si nomina qui» | **no — and its absence is the point** |

**MotionLab ships with no series.** That is not an omission for 36-03 to fix: its
series is created through the catalogue surface after the phase ships, by a
person, on the day the venue may be named. D-36-07 already decided MotionLab's
progressivo restarts per venue, so the series it needs is a venue-named one —
exactly the kind that cannot be written into a public file today.

**Spelling, decided: `re:sonate x Perlone`, with the normal e.**
`brand-visual-system.md` holds that the brand is written `re:sonate` «nelle
grafiche, nell'app, nelle mail, in prosa, ovunque», and that «il nome sull'app è
il nome del format». This string is the public name a visitor reads on a card, so
it takes the brand's spelling.

**Owed, and not this phase's work:** `production-calendar.md:30` still writes
`Resonate x Perlone` with a capital R. Aligning it is an update to a persona
module — version bump, changelog, `npm run verify:persona`
(`ai-engineering.md`) — and is recorded here so it is not lost, not folded in.
It joins the deferred item this phase already owes that module: D-36-07 closes
the gate *progressivo per sede o per format*, which `production-calendar.md`
still holds open.

---

## CONFIRMED — what plan 36-03 transcribes

**Confirmed by the owner on 2026-08-10.** Three explicit statements, three known
uuids, no question left for 36-03 to ask anyone.

| Night uuid | Format | Series | Number |
|---|---|---|---|
| `fd975999-95df-4402-bc82-03a95424831b` | `re:sonate` (`RSNT`) | `re:sonate` (`RSNT`) | **NULL** — it is an act, not an edition |
| `11e43718-2e37-42b1-91b7-cc2d0754474e` | `re:sonate` (`RSNT`) | `re:sonate` (`RSNT`) | `1` |
| `3db716af-8ce3-446e-a327-62b110bfe7ce` | `re:sonate` (`RSNT`) | `re:sonate` (`RSNT`) | `2` |

**Catalogue rows cleared for the migration:** the four formats above with their
fixed colours and `listed = true`; the five series above. **No MotionLab series.**

**Fallback in use:** **none.** All three nights carry a real format and a real
series, so the `unclassified` format and its series hold **zero** rows in
production — which is what `36-05-PLAN.md:201` asserts and now measures true.

**Nullability, as amended:** `format_id` `NOT NULL`, `series_id` `NOT NULL`,
`number` **nullable**. The guard counts null `format_id` only.

---

## Decisions Made

- **Night A is an act, not an edition** — same format and series as B, no number.
  This is the owner's answer and it resolves, in one sentence, the four
  exclusions this plan had documented: A matches no format's coordinates because
  the calendar's table describes editions, and A is not one.
- **`number` stays nullable.** Recorded above with its full reasoning, because it
  is the column a later reader would tighten to `NOT NULL` as tidying and thereby
  make night A's row unwritable.
- **`001` and `002` stand**, against the `RSNT-008` counter-evidence this plan
  raised. Raising it was correct; the answer is the owner's and is now monotone.
- **Venue names and night titles left out of this file.** The grep against the
  two tracked rules files returned nothing for any of the three venues, so
  invariant 1 forbids writing them. The titles were dropped by the same
  reasoning — one is derived from its venue's name, the other contains a word
  this phase keeps out of its files. Identification is by date and uuid, which is
  unambiguous and publishes nothing.
- **The number hypothesis shipped with its counter-evidence attached.** On a
  monotone value, a proposal the owner can approve without seeing the
  counter-argument is worse than no proposal — and here it is what made the
  answer a decision instead of a nod.

## Deviations from Plan

None in execution: the read returned the expected count, and the plan halted at
its blocking gate by design.

Two things were **added** and not asked for, both recorded rather than acted on:

1. **The structural note on the composite foreign key.**
   `36-03-PLAN.md:274` adds
   `event_parties_series_format_fk (series_id, format_id) → public.party_series (id, format_id)`,
   so a night's series must belong to the night's format. That makes the
   `withhold-series` option, as `36-02-PLAN.md:156` words it, unwritable in the
   shape it describes: the fallback series hangs under `unclassified`, so
   format-known-with-series-withheld and fallback-series are mutually exclusive.
   **Moot under the confirmed answer** — no series was withheld — but left here
   because the option survives in the plan text and the next reader would try it.
2. **The `number` nullability change**, decided by the orchestrator and recorded
   above at its request.

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
- Every night is `CONFIRMED`, none `PROPOSED`. Every number written is an
  integer greater than zero; night A carries no number at all, by decision.
- The decision carries its date: 2026-08-10 (threat T-36-02-04).
- Nothing in this file says what any format sounds like — no style, no tempo, no
  adjective that reads as a promise (`sound-manifesto.md`).
- Spelling: `re:sonate` with a normal e throughout; `SunSet`, `RamaDub`,
  `MotionLab` in CamelCase.

**What this file does not prove.** It records what three nights were, on the
owner's word. It is not evidence that the migration writes them correctly — that
is plan 36-03's to produce, and plan 36-05's to measure. In a repository with no
test runner for the product, saying which is which is the whole discipline
(`meta-gates.md`).

## Next Phase Readiness

**Plan 36-03 is unblocked.** It has three uuids, one format, one series, two
numbers and one deliberate absence of a number, plus the nullability the last of
those forces and the guard's narrowed scope.

Two things it must carry, both stated above rather than left to be rediscovered:
`number` nullable with the guard counting `format_id` only; and no MotionLab
series in the seed.

Owed elsewhere, recorded not done: `production-calendar.md` writes
`Resonate x Perlone` and the public name is `re:sonate x Perlone` — a persona
module update, with the D-36-07 gate closure, when the phase ships.

---
*Phase: 36-formats-series-numbering*
*Proposed and confirmed: 2026-08-10*
