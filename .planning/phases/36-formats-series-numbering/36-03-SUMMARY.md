---
phase: 36-formats-series-numbering
plan: 03
subsystem: database
tags: [migration, rls, constraints, backfill, watermark, public-repo, not-applied]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: the confirmed assignment of the three production nights (36-02)
  - phase: 32-capability-model-in-the-database
    provides: private.has_capability and the `catalogue.manage` key
provides:
  - public.formats and public.party_series, with two opposite read policies
  - format_id / series_id / number on public.event_parties
  - the monotone series watermark and its trigger
  - the named constraints FMT-03 rests on
  - a file plan 36-04 can hand to a throwaway postgres:17.6 and plan 36-05 can apply
affects: [36-04, 36-05, 36-06, 36-07, 36-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A referenced constraint is created through a DO block against pg_constraint, never DROP IF EXISTS + ADD (2BP01 on the second run)"
    - "A policy that reads a column of another table must be created AFTER that column exists — measured, not assumed"
    - "A backfill fills only what is empty (`AND format_id IS NULL`), so a second run cannot overwrite a later human correction"
    - "A fallback catalogue row is retired at birth, and the migration PRINTS how many rows landed on it"

key-files:
  created:
    - supabase/migrations/20260810120000_formats_and_series.sql
    - .planning/phases/36-formats-series-numbering/36-03-SUMMARY.md
  modified: []

key-decisions:
  - "Section order changed against 36-RESEARCH.md §6: the three columns come BEFORE the RLS, because party_series_select_published names ep.series_id and Postgres refuses a policy referencing a column that does not exist"
  - "The join is written `ep.series_id = party_series.id` and the paragraph explaining why is in the file, not only in the plan"
  - "`formats_select_listed` is `USING (listed = true)`, not the `USING (true)` 36-RESEARCH.md §2 recommended — D-36-17 was decided after the research"
  - "The fallback rows get a real progressivo offset by the series watermark, so a second run continues the sequence instead of colliding with it"
  - "`number` stays nullable and the constraint comment carries the sentence that says why"
  - "One commit for two tasks: the two halves are one file in one transaction, and the ordering defect proved they cannot be validated apart"

patterns-established:
  - "A migration that cannot be applied by the plan that writes it is still verified by the plan that writes it — against a throwaway container with stubbed dependencies"

requirements-completed: []  # deliberately empty — D-36-19, see the closing section

# Metrics
duration: 12min
completed: 2026-08-10
---

# Phase 36 Plan 03: The migration that refuses — Summary

**One transaction that makes four things unwritable — a night with no format, two editions sharing a triple, a night whose format contradicts its own series, and a series number that goes back down — with the whole series catalogue kept behind the publication gate by a single qualified join.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2 of 2
- **Files created:** 1 (plus this summary)
- **Lines:** 1043
- **Database writes to production:** **zero.** This plan writes the file; plan 36-05 applies it.

---

## What was built

`supabase/migrations/20260810120000_formats_and_series.sql` — one `BEGIN`/`COMMIT`, twelve numbered sections:

| § | What |
|---|---|
| 1 | `public.formats` — slug, name, code, colour, `listed`, `retired_at`, `sort_order`, named constraints inside the table, plus the **partial** unique index that makes an active format's colour its own and releases it on retirement |
| 2 | `public.party_series` — format, public name, code, `retired_at`, `highest_assigned`; `party_series_id_format_unique` through a `DO` block, with the `COMMENT ON CONSTRAINT` that forbids removing it as tidying |
| 3 | The three columns on `public.event_parties` — nullable, **no default** |
| 4 | RLS — two opposite read answers, plus the paragraph that says why neither table gets a write policy |
| 5 | The catalogue rows: four listed formats with their fixed colours, five series, one fallback format retired at birth |
| 6 | `public.bump_series_watermark()` + trigger, created **before** the backfill so the backfill raises it |
| 7 | The backfill — three nights by explicit uuid, then the residual rows onto the fallback with a **real** progressivo |
| 8 | The guard — counts, raises with the count, or prints two notices |
| 9 | `SET NOT NULL` on two columns of three, and 9a: why `number` stays nullable |
| 10 | `event_parties_series_format_fk`, `event_parties_format_series_number_unique`, `event_parties_number_positive`, one index and one deliberately absent |
| 11 | The three new refusals, declared instead of discovered |
| 12 | What is **not** defended: no column-level `REVOKE`, and the anon-readable secret venue address that belongs to phase 37 |

---

## Verification — measured, in a container, not reasoned

There is no test runner for this product (`meta-gates.md`). What follows was run against a throwaway `postgres:17.6` with the four dependencies stubbed (`public.profiles`, `public.events`, `public.event_parties`, `private.has_capability`), seeded with the three production uuids plus two extra nights standing in for what a container or a development database holds. The container was destroyed afterwards. **This is not the plan 36-04 run** — that one builds the real schema from the real queue.

### The migration applies, and applies twice

Run 1 ended `COMMIT` with the guard's two notices:

```
NOTICE:  formats backfill: every event_parties row carries a format.
NOTICE:  formats backfill: 2 row(s) landed on the retired fallback format. In production this number is expected to be 0.
```

Run 2 against the same database ended `COMMIT` with only `already exists, skipping` notices and **identical** counts afterwards — 5 formats, 6 series, watermark 2, one numberless night. Idempotence is measured, not declared.

### The assignment landed as 36-02 confirmed it

```
                  id                  | format | series | number
--------------------------------------+--------+--------+--------
 fd975999-95df-4402-bc82-03a95424831b | RSNT   | RSNT   |          <- the act: no number
 11e43718-2e37-42b1-91b7-cc2d0754474e | RSNT   | RSNT   |      1
 3db716af-8ce3-446e-a327-62b110bfe7ce | RSNT   | RSNT   |      2
 <container night>                    | UNCL   | UNCL   |      1   <- real progressivo, not 0
 <container night>                    | UNCL   | UNCL   |      2
```

### The policy is a gate and not a tautology

Read back from `pg_policies.qual` — the **rendered** predicate, after Postgres resolved the names:

```
(EXISTS ( SELECT 1
   FROM (event_parties ep
     JOIN events e ON ((e.id = ep.event_id)))
  WHERE ((ep.series_id = party_series.id) AND (e.is_published = true))))
```

`party_series.id`, not `ep.series_id`. This is the one line the plan exists to get right.

**And it refuses.** With one of the two events flipped to a draft, a non-privileged role sees:

| Table | What the anonymous-equivalent role reads |
|---|---|
| `public.formats` | `motionlab`, `ramadub`, `resonate`, `sunset` — **not** `unclassified` |
| `public.party_series` | `re:sonate`, `Unclassified` — **not** `re:sonate x Perlone`, `RamaDub x Booze`, `RamaDub x Muro`, `SunSet` |

The four series with no published night are invisible, which is the whole point of section 4b: a series prepared before its first night does not publish the place in its name.

**Writes:** with the grants Supabase gives `anon`, `INSERT INTO party_series` returns `new row violates row-level security policy` — the absence of a write policy is what refuses. `UPDATE` returns `UPDATE 0`: no `UPDATE` policy means no row qualifies, so it is a silent no-op rather than an error. It writes nothing either way, and the distinction is recorded rather than smoothed over.

### The five refusals, each arriving by name

| Probe | Result |
|---|---|
| Second night with the same format, series and number | `ERROR: duplicate key value violates unique constraint "event_parties_format_series_number_unique"` |
| Night with `re:sonate` format under a `RamaDub` series | `ERROR: violates foreign key constraint "event_parties_series_format_fk"` |
| Night with `number = 0` | `ERROR: violates check constraint "event_parties_number_positive"` |
| Night with no format at all | `ERROR: null value in column "format_id" ... violates not-null constraint` |
| A **second** night with no number | `INSERT 0 1` — accepted, because two `NULL`s are distinct and neither is an edition |

### The watermark only rises

| Step | `highest_assigned` |
|---|---|
| after inserting a night numbered 5 | 5 |
| after **deleting** that night | **5** |
| after blanking a night's number to `NULL` | **5** |

`GREATEST` ignores `NULL` arguments, so a numberless act leaves the level where it was instead of erasing it — stated in the file at section 6 and confirmed here.

### The grep gates from the plan, all with comment lines stripped

| Gate | Required | Got |
|---|---|---|
| `ep.series_id = party_series.id` | ≥1 | 1 |
| `using (true)` (case-insensitive) | 0 | 0 |
| `is_admin_or_organizer` | 0 | 0 |
| `(SELECT private.has_capability('catalogue.manage'))` | ≥2 | 2 |
| `ALTER TABLE event_parties` unqualified | 0 | 0 |
| `DROP CONSTRAINT IF EXISTS` | 0 | 0 |
| `COMMENT ON CONSTRAINT party_series_id_format_unique` | present | present |
| `bpm\|techno\|house\|downtempo\|genre` (whole file) | 0 | 0 |
| the reversed e | 0 | 0 |
| `GREATEST(highest_assigned` / plain assignment | ≥1 / 0 | 1 / 0 |
| `RAISE EXCEPTION` with a `%` for the count | ≥1 | 1 |
| `SET search_path = ''` | ≥1 | 1 |
| `FOREIGN KEY (series_id, format_id)` | 1 | 1 |
| `event_parties_format_series_number_unique` | ≥1 | 3 |
| `number = 0` | 0 | 0 |
| `ADD COLUMN` of the three carrying a `DEFAULT` | 0 | 0 |
| `secret-venue-address-readable-by-anon.md` named, phase 37 stated | yes | yes |
| one `BEGIN;`, one `COMMIT;`, guard before every `SET NOT NULL` | yes | guard@778, `SET NOT NULL`@803 |

### What this does **not** prove

- **It is not applied.** Production is untouched; plan 36-05 owns the Management API call, and `supabase db push` is not runnable here.
- **The container run was stubbed.** Four dependencies were fakes, and `private.has_capability` returned `false` unconditionally — so the `catalogue.manage` arm of both policies was never exercised as a **grant**, only as a non-grant. Plan 36-04 exercises it against the real queue with twelve seeded personas.
- `npm run build` was **not** run and would prove nothing here: no TypeScript changed.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] The section order in the plan (and in `36-RESEARCH.md` §6) cannot be applied**

- **Found during:** Task 1, at the first container run.
- **Issue:** `party_series_select_published` names `ep.series_id`. In the order the research proposes — tables, RLS, seeds, then `ADD COLUMN` — that column does not exist yet, and Postgres answers `ERROR: column ep.series_id does not exist` with the transaction in rollback. The file would never have applied, in any database, on the first try.
- **Fix:** the three columns moved from section 5 to section 3, ahead of the RLS. Every cross-reference renumbered. The measured error and the reason the research's order looks correct and is not are written into section 3, so the next reader does not restore the "tidier" order.
- **Files modified:** `supabase/migrations/20260810120000_formats_and_series.sql`
- **Commit:** `2a0fcb9`

**2. [Rule 2 — Missing critical] The fallback progressivo is offset by the series watermark**

- **Found during:** Task 2.
- **Issue:** the plan asks for `row_number()` inside the fallback series. On its own that restarts at 1 on every run, so a second application on a database that acquired new unclassified nights would collide with the numbers the first run wrote (`23505`).
- **Fix:** `fallback.base + residual.n`, where `base` is the series' `highest_assigned`. The sequence continues instead of restarting, which is the same monotone rule the watermark exists to enforce.
- **Commit:** `2a0fcb9`

**3. [Rule 2 — Missing critical] The backfill fills only what is empty**

- **Found during:** Task 2.
- **Issue:** an unguarded `UPDATE ... WHERE id = '<uuid>'` re-asserts the assignment on every run, so a re-application months later would silently undo a correction a person had made in the meantime.
- **Fix:** `AND format_id IS NULL` on all three statements, declared in the header's idempotence list. A backfill fills; it does not re-assert.
- **Commit:** `2a0fcb9`

### Departures from the plan text, deliberate and stated

- **One commit for two tasks.** The two tasks produce one file inside one transaction, and deviation 1 proved the halves cannot even be applied apart — task 1's policy needs task 2's column. Committing a half would have committed a file that no database accepts. The commit message names both halves.
- **`formats` is `USING (listed = true)`, not `USING (true)`.** `36-RESEARCH.md` §2 recommends the unconditional read; D-36-17 was decided after the research and the plan carries the newer answer. The file argues the newer one and does not cite the older as precedent.

### Not done, on purpose

- **No `FMT-*` ticked in `REQUIREMENTS.md`** — see the closing section.
- **`src/types/database.ts` not touched.** `supabase-data.md` gate *tipi allineati* asks for the type change in the same commit; **plan 36-06 owns that file** in this phase, and the migration is not applied until 36-05, so nothing reads the columns in between. Recorded here rather than absorbed, because the gate is real and this plan does not satisfy it — 36-06 does.

## Issues Encountered

- The first container run failed at `CREATE POLICY party_series_select_published`. That failure is the reason the file now applies, and it is exactly the class of defect a grep gate cannot catch: the policy was correct, its position was not.
- A probe that corrected a night's number downward was refused by `event_parties_format_series_number_unique` (the lower number was already taken). Correct behaviour, and worth recording: **a downward correction is only possible into a free number**, which the surface plans will meet.

## Threat Flags

None. Every surface this file introduces is in the plan's threat register, and the two Information Disclosure entries (T-36-03-01, T-36-03-02) were measured rather than argued — see *The policy is a gate and not a tautology* above.

## Requirements: not marked complete, on purpose

D-36-19. This plan writes a file that **is not applied**: no column exists in any database anyone uses, no surface reads a label or a colour, and no refusal reaches a person as a sentence. FMT-01, FMT-02, FMT-03, FMT-05 and FMT-06 are claimed by eleven of this phase's fourteen plans; ticking them at plan 3 of 14 would make `REQUIREMENTS.md` — the traceability source — assert something no applied schema supports. The phase verification ticks them once, with the evidence beside it.

## Self-Check: PASSED

- `supabase/migrations/20260810120000_formats_and_series.sql` — present, 1043 lines
- `.planning/phases/36-formats-series-numbering/36-03-SUMMARY.md` — present
- `2a0fcb9` — present in git history
- No tracked file deleted by that commit (`git diff --diff-filter=D` empty)

---
*Phase: 36-formats-series-numbering*
*Written and verified in a container: 2026-08-10. Applied: not yet — plan 36-05.*
