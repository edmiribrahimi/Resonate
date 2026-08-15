---
phase: 44-the-production-calendar-comes-inside
plan: 07
subsystem: supabase-data
tags: [migration, production-write, rls, capability-model, read-back, types]
requires:
  - supabase/migrations/20260815120000_production_calendar.sql
  - supabase/migrations/20260815120100_production_calendar_access.sql
  - src/lib/production/ics/vocabulary.ts
  - scripts/rls-baseline.mjs
provides:
  - the six production tables, LIVE in production
  - party_series.ics_alias, LIVE and null on every row
  - private.capabilities row `production.read` + two grants, LIVE
  - six SELECT policies, zero write policies, LIVE
  - sixteen production_pipeline_rule rows, LIVE
  - src/types/database.ts row types for all six tables
affects:
  - 44-08 onwards (every plan after this one reads or writes these tables)
  - 44-10 (the import that fills them; the tables are empty until it runs)
  - 44-12 (owns record_checklist_tick's caller — and inherits the open finding below)
  - 44-13 (the written manual procedure; it is what proves the policies REFUSE)
tech-stack:
  added: []
  patterns:
    - "the migrations endpoint, never /database/query and never PUT, so the history stays truthful"
    - "the cascade closure walked from pg_constraint, then a strict superset counted anyway"
    - "the read-back reads the CATALOGUE, never the 200 on the POST"
    - "row types importing their vocabularies from a literal source that imports nothing"
key-files:
  created:
    - .planning/phases/44-the-production-calendar-comes-inside/44-07-SUMMARY.md
  modified:
    - src/types/database.ts
decisions:
  - "The owner's authorisation of 2026-08-15 was SPENT at 01:41:03Z and 01:41:07Z and is now exhausted"
  - "The corrective REVOKE for F-01 was NOT applied: it is outside the authorisation's stated bounds"
  - "ProductionChecklistKind is declared in database.ts, not in vocabulary.ts, and the asymmetry is stated"
metrics:
  tasks: 3
  commits: 2
  duration: ~40 min
  completed: 2026-08-15
---

# Phase 44 Plan 07: Applying the Production Calendar to Production Summary

Both migrations are live in production — versions `20260815014103` and `20260815014107`,
through the migrations endpoint — with six tables, six `SELECT` policies, zero write
policies, two hardened functions, one trigger, one capability row, two grants and sixteen
pipeline rules confirmed by reading the catalogues; not one pre-existing row moved.

**And the read-back found something the migration file claims is not true of it.** See
`## F-01` below, before anything else.

---

## ⚠ F-01 — OPEN FINDING, BLOCKING FOR PLAN 44-12: `record_checklist_tick` is executable by `anon` and `authenticated`

**This is not a defect in the applying; it is a defect in the file, which the applying
made visible.** It is recorded here and **has NOT been fixed**, because fixing it needs a
write the owner has not authorised.

### What the migration says about itself

`20260815120100_production_calendar_access.sql:544-558`, section 6:

> `record_checklist_tick` is granted to `service_role` **AND NOTHING WIDER** […]
> The corollary, stated so it is not discovered: **with no grant to `authenticated`, the
> function is unreachable at `/rest/v1/rpc/...` for a user session** — refused by the
> privilege system before any policy is consulted.

`44-04-SUMMARY.md` carries the same claim in its `decisions` block.

### What the catalogue says

```sql
SELECT p.proname, p.prosecdef, p.proacl::text
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname IN
   ('record_checklist_tick', 'record_venue_reveal_act');
```

| proname | prosecdef | proacl |
|---|---|---|
| `record_checklist_tick` | `true` | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` |
| `record_venue_reveal_act` | `true` | `{postgres=X/postgres,service_role=X/postgres}` |

`=X/postgres` is the grant to **PUBLIC**, and `anon` and `authenticated` carry their own.
The analog — the very function this section says it copies — carries neither.

### Why the two differ, measured rather than guessed

The analog is a **two-statement pair**, and its own comment at
`20260810160000_manual_venue_reveal.sql:598-607` says why:

> **REVOKE first and GRANT second**, in that order and as two statements rather than
> assumed: **Postgres grants EXECUTE to PUBLIC by default on every new function, so the
> GRANT alone would leave the default in place.**

```sql
REVOKE ALL ON FUNCTION public.record_venue_reveal_act(...) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.record_venue_reveal_act(...) TO service_role;
```

`20260815120100` cites `:606-607` — the `GRANT` — and **omits `:603-604`, the `REVOKE`**.
It copied the second half of a pair whose own comment says the first half is what makes it
work. Five other migrations in this repository write the pair in full
(`20260808000000:140`, `20260808004000:368`, `20260809001000:483`, `20260809007000:276`,
`20260810160000:603`).

### What it means today, and what it will mean

PostgREST exposes `public`, so the function is live at
`/rest/v1/rpc/record_checklist_tick` for an anonymous key and for any signed-in session.
It is `SECURITY DEFINER`, so it bypasses the six policies entirely.

- **Today the damage is bounded but not nil.** `production_checklist_item` holds **zero
  rows**, so a call can only reach `actor_unknown` or `item_not_found`. But those two
  codes are *different*, and that difference is an **oracle**: it tells an unauthenticated
  caller whether an arbitrary uuid is a real `public.profiles` row. The function's own
  comment (`:409-419`) cites **D-04 — no function may answer a yes/no question about an
  arbitrary identifier, since this repository has no rate limiting anywhere** — as the
  reason it declines to re-derive the capability join. The applied grant hands out exactly
  that oracle through the front door.
- **After plan 44-10's import it is worse.** Once the checklist has rows, a caller who
  obtains an item uuid and a profile uuid can tick and mis-attribute — turning the author
  column from a trace into a claim, which is the precise harm section 6 says the narrow
  grant exists to prevent.

### Why it was not fixed here

The owner's authorisation covers **the two migration files of this phase, this once**. A
`REVOKE` is a third migration, and applying it would be a write beyond the stated bound —
which `ai-engineering.md`'s gate *l'autorizzazione a scrivere in produzione e' un atto,
non un permesso* forbids: an authorisation *«copre esattamente cio' che e' stato descritto
quando e' stata chiesta»*. Editing `20260815120100` in place is also refused twice over:
it is applied (gate *migration in avanti*), and it belongs to plan 44-04.

### What closes it

A new migration, with its own authorisation, carrying the pair the analog carries:

```sql
REVOKE ALL ON FUNCTION public.record_checklist_tick(uuid, boolean, uuid, text)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_checklist_tick(uuid, boolean, uuid, text)
  TO service_role;
```

**It should land before plan 44-10 fills the tables**, not after. And the comments in
`20260815120100` §6 and the `decisions` block of `44-04-SUMMARY.md` state the narrow
posture as fact — both need correcting, or the next reader will verify the claim by
reading the sentence that is wrong.

**A note on `refuse_production_plan_renumber`, which shows the same `proacl`.** It is
benign and needs no fix: it is `RETURNS trigger`, PostgREST does not expose trigger
functions, and Postgres refuses a direct call outright. The migration deliberately granted
it nothing; the PUBLIC entry is the default, not an act. `bump_series_watermark` (in
production since Phase 36) carries the identical shape for the identical reason.

---

## The authorisation: granted, spent, exhausted

| | |
|---|---|
| **Granted** | 2026-08-15, by the owner, before this dispatch |
| **Scope, in the words it was asked in** | applying **this phase's two migrations** — they create new, empty tables and touch no existing table — through the migrations endpoint, with a snapshot before and a read-back after |
| **Spent** | `2026-08-15T01:41:03Z` (first migration) and `2026-08-15T01:41:07Z` (second) |
| **Status now** | **SPENT AND EXHAUSTED.** It does not extend to F-01's `REVOKE`, to plan 44-10's import, or to anything else later in this phase |

**What it explicitly did not cover, and what was therefore refused:** any `DELETE`,
`DROP`, `TRUNCATE` or `UPDATE` against a pre-existing table; seeding any row of production
material; any write beyond the two migration files. **None of those was performed.** No
statement issued by this plan deletes anything, and the working `read_only: true` flag was
set on every one of the read-back queries.

**The cascade set, stated rather than left unexamined.** The plan touches one pre-existing
table — `public.party_series` gains a column and a unique constraint — and **no
pre-existing row was modified at all**, so the set of rows reachable by cascade from
anything this plan changed is **empty**. The closure was walked anyway, and counted anyway,
because the D12 incident was seven tables nobody had enumerated: a snapshot covering only
what somebody thought to name repeats that mistake with better intentions.

---

## The evidence, in the order it was taken

Every query below was run through the Management API in `read_only` mode, except the two
`POST`s. **Neither `SUPABASE_ACCESS_TOKEN` nor the project reference was printed, written
to a file, or committed**; both are registered as secrets in `scripts/rls-baseline.mjs`'s
redaction list, and `.env.local` was passed to `node --env-file` from the main checkout —
never copied into the worktree, never into this repository.

### Step 1 — the pre-snapshot, before anything

The cascade closure, **read from `pg_constraint` and not from memory**:

```sql
WITH RECURSIVE seed AS (SELECT 'public.party_series'::regclass AS rel), closure AS (
  SELECT rel, 0 AS depth FROM seed
  UNION
  SELECT c.conrelid, cl.depth + 1 FROM pg_constraint c
    JOIN closure cl ON c.confrelid = cl.rel WHERE c.contype = 'f' AND cl.depth < 10)
SELECT n.nspname, t.relname, min(cl.depth) FROM closure cl
  JOIN pg_class t ON t.oid = cl.rel JOIN pg_namespace n ON n.oid = t.relnamespace
 GROUP BY 1,2 ORDER BY 3,1,2;
```

**20 tables, 79 foreign keys read:**

| depth | tables |
|---|---|
| 0 | `party_series` |
| 1 | `event_parties` |
| 2 | `attendances`, `discount_codes`, `door_scan_events`, `drink_items`, `drink_orders`, `drink_tokens`, `event_media`, `guest_list_entries`, `membership_acts`, `party_assignments`, `party_credits`, `pending_purchases`, `rsvps`, `ticket_tiers`, `tickets`, `venue_reveal_acts` |
| 3 | `discount_code_tiers`, `ticket_refunds` |

**All seven tables of the D12 incident are inside this perimeter** — tickets, drink orders,
drink tokens, the menu, guest list entries, ticket tiers and attendances.

Row counts were then taken over a **strict superset**: every base table in `public` and
`private`, 28 of them.

### Step 2 — the pre-state, which is what makes the idempotence claim checkable

| Question | Answer |
|---|---|
| History, last five | `20260811111530 live_attendance_channel`, `20260811001927 venues_read_narrowed`, `20260810210214 manual_venue_reveal`, `20260810144239 formats_and_series`, `20260806161753 20260807020000_wrap_auth_uid` |
| Do any of the six tables exist? | **`false` on all six** |
| Does `production.read` exist? | **0 rows** |
| Does `party_series.ics_alias` exist? | **0 columns** |

Nothing pre-existed. The idempotence guards were therefore **not exercised** by this
application — a fact worth stating, because it means their correctness rests on their
construction and on plan 44-02's throwaway-container measurement, not on this run.

The naming convention was read from the history rather than assumed: the four most recent
entries carry the stem **without** its timestamp prefix, so the two names sent were
`production_calendar` and `production_calendar_access`.

### Steps 3 and 4 — the apply, through the migrations endpoint

`POST https://api.supabase.com/v1/projects/{ref}/database/migrations`, body
`{ "query": "<file contents>", "name": "<stem>" }`. **Not `/database/query`**, which
applies DDL and writes nothing into the history. **Not `PUT`**, which upserts the history
without applying anything.

| | endpoint | HTTP | body |
|---|---|---|---|
| `20260815120000_production_calendar.sql` | `POST …/database/migrations` | **200** | `[]` |
| `20260815120100_production_calendar_access.sql` | `POST …/database/migrations` | **200** | `[]` |

The order was not optional: the second file's policies name tables and its trigger names a
column, and Postgres refuses a policy reading a column that does not exist, with the
transaction in rollback.

**A `200` is a report. The catalogue is the fact.** Hence step 5.

### Step 5 — the read-back, from the catalogues

**A. The six tables** — `information_schema.tables`, `table_schema = 'public'`,
`table_name LIKE 'production_%'`:

> `production_checklist_item`, `production_commitment`, `production_import_run`,
> `production_piece`, `production_pipeline_rule`, `production_plan`

**B. Named constraints** — `pg_constraint` joined to `pg_class`: **36 rows**, including
every constraint named in either file. The two the plan asked for by name are present:

> `production_piece_date_xor_reason` (contype `c`)
> `production_piece_proposal_has_no_source` (contype `c`)

and so are `party_series_ics_alias_unique` (`u`),
`production_pipeline_rule_series_format_fk` (`f`),
`production_plan_venue_stage_check` (`c`),
`production_checklist_item_plan_kind_label_unique` (`u`),
`production_commitment_uid_occurrence_unique` (`u`),
`production_pipeline_rule_weekday_required_check` (`c`), and the rest.

**C. Policies** — `pg_policies`: **exactly six, every one `cmd = 'SELECT'`**:

| table | policy | cmd |
|---|---|---|
| `production_checklist_item` | `production_checklist_item_select_production_read` | `SELECT` |
| `production_commitment` | `production_commitment_select_production_read` | `SELECT` |
| `production_import_run` | `production_import_run_select_production_read` | `SELECT` |
| `production_piece` | `production_piece_select_production_read` | `SELECT` |
| `production_pipeline_rule` | `production_pipeline_rule_select_production_read` | `SELECT` |
| `production_plan` | `production_plan_select_production_read` | `SELECT` |

```sql
SELECT count(*) FROM pg_policies WHERE schemaname='public'
  AND tablename LIKE 'production_%' AND cmd <> 'SELECT';
-- write_policies: 0
```

**Zero write policies.** And `relrowsecurity = true` on all six, `relforcerowsecurity =
false` — the latter being why the service client can still write.

**D. The two functions** — `pg_proc`:

| proname | prosecdef | proconfig |
|---|---|---|
| `record_checklist_tick` | `true` | `{"search_path=\"\""}` |
| `refuse_production_plan_renumber` | `true` | `{"search_path=\"\""}` |

Both `SECURITY DEFINER`, both with the search path pinned empty.

**E. The trigger** — `pg_trigger`, `pg_get_triggerdef`:

> `CREATE TRIGGER production_plan_refuse_renumber BEFORE UPDATE OF number ON
> public.production_plan FOR EACH ROW EXECUTE FUNCTION refuse_production_plan_renumber()`

`BEFORE UPDATE OF number`, on `production_plan`, as specified.

**F. The capability row and its grants:**

| key | role | requires_approved |
|---|---|---|
| `production.read` | `master` | `false` |
| `production.read` | `organizer` | `false` |

One key, two grants, `requires_approved = false` on both — **D-44-27, the owner's value**,
not the planner's, and it is a bet that holds only while no signup path can create a
pending organizer.

**G. `party_series.ics_alias`:**

```sql
SELECT count(*) AS series_rows, count(ics_alias) AS non_null_alias FROM public.party_series;
-- series_rows: 6   non_null_alias: 0
```

The column exists and **every one of the six rows holds null** — the runtime-arrival claim
made checkable. No venue word entered this repository or this database.

**H. Row counts of the six new tables:**

| table | rows |
|---|---|
| `production_plan` | **0** |
| `production_piece` | **0** |
| `production_commitment` | **0** |
| `production_checklist_item` | **0** |
| `production_import_run` | **0** |
| `production_pipeline_rule` | **16** |

Five empty, which is criterion 2 made checkable: **the schema arrived empty of material.**

**`production_pipeline_rule` holds 16, and 16 is the number the migration named in
advance** (`:1074-1076` — *«after this migration is applied, sixteen rules are expected. A
smaller number means a format code below is not in `public.formats`»*). A zero would have
been a finding, not a pass. The breakdown resolves every format code and the one series
code:

| format | series | rules |
|---|---|---|
| `RMDB` | — | 4 |
| `MTNLB` | — | 4 |
| `RSNT` | — | 4 |
| `SNST` | — | 2 |
| `RSNT` | `PRLN` | 2 |

Every one of the sixteen was already published in `.claude/rules/production-calendar.md`'s
weekday table. Nothing here says when a night happens, where, or who plays.

**I. The migration history, after:**

| version | name |
|---|---|
| `20260815014107` | `production_calendar_access` |
| `20260815014103` | `production_calendar` |
| `20260811111530` | `live_attendance_channel` |

**Two new versions, assigned by the server**, and they match the wall clock of the two
`POST`s to the second — which is a second, independent confirmation that the requests
applied when they said they did.

**The pre-existing history drift is untouched and remains the owner's call.**
`20260508000000_drink_token_active_state.sql` is applied but absent from the history, and
36-RESEARCH.md measured at least eighteen such gaps. Repairing them is a `PUT`, which
upserts without applying, and this plan neither performed nor was authorised to perform it.

**J.** `information_schema.routine_privileges` on `record_checklist_tick` returned
`PUBLIC / EXECUTE` — which is F-01 above.

### Step 6 — the post-snapshot

Every base table in `public` and `private`, counted again by the same query.

| table | before | after | |
|---|---|---|---|
| `private.capabilities` | 13 | **14** | +1 — the fourteenth key, as the file named it |
| `private.role_capabilities` | 28 | **30** | +2 — the two grants |
| `public.artists` | 7 | 7 | — |
| `public.attendances` | 0 | 0 | — |
| `public.discount_code_tiers` | 0 | 0 | — |
| `public.discount_codes` | 0 | 0 | — |
| `public.door_scan_events` | 0 | 0 | — |
| `public.drink_items` | 7 | 7 | — |
| `public.drink_orders` | 0 | 0 | — |
| `public.drink_tokens` | 0 | 0 | — |
| `public.event_media` | 0 | 0 | — |
| `public.event_parties` | 3 | 3 | — |
| `public.events` | 2 | 2 | — |
| `public.formats` | 5 | 5 | — |
| `public.guest_list_entries` | 0 | 0 | — |
| `public.membership_acts` | 2 | 2 | — |
| `public.newsletter_subscribers` | 0 | 0 | — |
| `public.party_assignments` | 0 | 0 | — |
| `public.party_credits` | 0 | 0 | — |
| `public.party_series` | 6 | 6 | — |
| `public.pending_purchases` | 0 | 0 | — |
| `public.profiles` | 4 | 4 | — |
| `public.rsvps` | 0 | 0 | — |
| `public.ticket_refunds` | 0 | 0 | — |
| `public.ticket_tiers` | 1 | 1 | — |
| `public.tickets` | 0 | 0 | — |
| `public.venue_reveal_acts` | 0 | 0 | — |
| `public.venues` | 5 | 5 | — |

**All 26 tables outside the capability schema are byte-for-byte identical, including all 20
of the cascade closure and all seven of the D12 incident.** The only two deltas are the
inserts the second migration declares in its own header, and the third delta is the six new
relations (34 tables after, 28 before).

**Total rows: 83 → 102.** The 19 added are 1 capability + 2 grants + 16 pipeline rules,
each of which is a criterion published on a public rules page. **Zero rows of production
material.**

---

## ⚠ What this does NOT establish

**The Management API connects as a role that BYPASSES row-level security.** Everything in
step 5 was read through it. So:

- The read-back proves the six policies **EXIST**. It says **nothing whatever** about
  whether they **REFUSE** anybody. A `SELECT` that returned rows to this token would have
  returned them with no policy at all.
- Nothing here shows that a `staff` session, a `member` session or an anonymous key is
  actually kept out of the calendar. That is settled only by a real session with a real
  role, and it is **plan 44-13's written procedure**. The phase is not verified until it
  runs.
- `scripts/verify-capabilities.mjs` side 5 asserts the *grant table* — that `staff` and
  `member` hold no row for `production.read`. That is a stronger statement than a comment
  and a weaker one than a session: it proves nobody granted the key, not that the policy
  refuses the holder.

**And a green build proves nothing about any of this.** `npm run build` passed before this
plan ran, with no schema live at all — the types come from a generated file, not from the
database. That false-positive state is what this plan closed, and it is closed by the
read-back, not by the build. Do not read a past green as evidence about the database.

---

## Task 3 — the row types

`src/types/database.ts`, +527 lines, commit `0db98fd`.

Six interfaces — `ProductionPlan`, `ProductionPiece`, `ProductionCommitment`,
`ProductionImportRun`, `ProductionChecklistItem`, `ProductionPipelineRule` — plus
`ics_alias: string | null` on `PartySeries`.

**The vocabularies are imported, not restated.** One import statement, from
`@/lib/production/ics/vocabulary`, which imports nothing precisely so this direction is the
only possible one:

```ts
import type {
  AnchorDirection, AnchorKind, CivilDate, CivilTime, EntryClass,
  NamingConvention, PieceDateOrigin, PieceKind, UnresolvedReason, VenueStage,
} from "@/lib/production/ics/vocabulary";
```

**The plan's acceptance greps, run:**

| check | expected | got |
|---|---|---|
| `grep -c 'from "@/lib/production/ics/vocabulary"'` | 1 | **1** |
| `grep -cE '"listing" \| "tonight"‹…›'` (vocabularies restated) | 0 | **0** |
| `grep -cE "Production(Plan\|Piece\|Commitment\|ChecklistItem\|ImportRun\|PipelineRule)"` | ≥6 | **7** |
| `grep -c "ics_alias"` | 1 | **1** |

**One deviation, and it is a naming decision rather than a fix.** The plan named six
vocabularies to import; the applied schema has a seventh union that has **no home in the
literal source** — `production_checklist_item.kind`. It is declared in `database.ts` as
`ProductionChecklistKind`, and the asymmetry is written into the file rather than left to
be noticed: the seven imported vocabularies describe what the calendar FILE contains and so
belong to the parser, while a checklist kind describes what PRODUCTION owes, which the file
knows nothing about. Adding it to `vocabulary.ts` was refused because that file belongs to
plan 44-01. Its only other copy is the `CHECK` constraint in the applied migration — the
same relationship every other literal union in `database.ts` has with its `CHECK`, and one
`tsc` cannot see.

**What the type comments say that the neighbours' do not.** Every name was read out of the
two migration files by hand and then confirmed against the step-5 catalogue read-back. The
neighbouring interfaces in this file were confirmed against a migration file only — so this
is a better check than they got, and the file says which check was performed rather than
implying a uniform one. It also records, at the head of the block, that **no Supabase client
in this repository is parameterised with `Database`** (measured at four call sites), so
`.select()` returns values the compiler cannot relate to a column and every consumer casts.

---

## Verification

| gate | result |
|---|---|
| `npm run build` | **exit 0** |
| `npm run verify:capabilities` | **exit 0 — 5/5 green, 0 warnings** |
| Catalogue read-back | recorded above, query by query |
| Pre- and post-snapshot | identical on all 26 pre-existing non-capability tables |

**`verify:capabilities` is green for the first time since plan 44-04**, which is the point
of running it here: it needs a live database, and it was RED from 44-04's commit until this
plan's task 2 — expected and documented at `keys.ts:168-172`. It now reports
**`TS 14 · DB 14 · POLICY 8 · SRC 14 · GRANT 30 rows`**, and side 5 reads *30 grants and 26
refusals over 4 roles × 14 keys, both directions* — the arithmetic the access migration
predicted in its own header (`:136`) before it was applied.

Its own disclaimer is worth repeating here, because it bounds what the green means: it
asserts that the four declarations name the same keys and that every role holds exactly its
declared grants. **It does not assert that any policy is correct.**

---

## Deviations from Plan

### Task 1 — the checkpoint, pre-granted

The plan's task 1 is a `checkpoint:human-action`. The owner granted it on 2026-08-15 before
dispatch, with the four points of `<how-to-verify>` covered by the grant. The executor did
not stop to re-ask, and honoured the bounds exactly. Recorded in full in *The authorisation*
above. **Granted — not deferred.**

### Auto-fixed: none

No deviation of Rules 1–3 arose. The two migration files were read in full and applied
unmodified; neither was edited, which the dispatch forbade and `supabase-data.md`'s gate
*migration in avanti* forbids independently.

### ⚠ Rule 4 — STOPPED and reported rather than fixed: F-01

The missing `REVOKE` is a real defect with a security consequence, and the ordinary Rule 2
reflex would be to add it. **It was not added.** Writing and applying a third migration is a
production write outside a spent, bounded authorisation, and that bound is itself the
control this project put in place after D12. Reported in full at the head of this document,
with the exact statement that closes it and the two documents that state the wrong thing.

**It needs an owner decision, and it should be taken before plan 44-10 fills the tables.**

---

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| `threat_flag: elevation-of-privilege` | `supabase/migrations/20260815120100_production_calendar_access.sql:567` | `record_checklist_tick` retains Postgres's default `EXECUTE` to `PUBLIC`/`anon`/`authenticated`; it is `SECURITY DEFINER` and live at `/rest/v1/rpc/`. See F-01. Not in the plan's `<threat_model>` — that register listed T-44-02 (the policies cannot be proved to refuse) but no threat against the function's own privilege surface |
| `threat_flag: information-disclosure` | same, same function | The `actor_unknown` vs `item_not_found` split is a profile-existence oracle reachable anonymously, in a repository with no rate limiting — the exact shape D-04 refused elsewhere in the same file |

Both flags concern a file this plan did not write and must not edit. They belong to the
follow-up migration.

---

## Known Stubs

None. Every table, constraint, policy, function, trigger and grant declared by the two
files is present in the catalogues, and every declared row type corresponds to a column read
back from the applied schema. The six tables are **empty of material by design** — that is
plan 44-10's work and is criterion 2, not a stub.

---

## Notes for whoever comes next

1. **F-01 first.** Before plan 44-10 runs.
2. **The tables are empty.** Any surface built now renders nothing, and that is correct.
3. **`ics_alias` is null on all six series.** The join a piece needs does not work yet, and
   the values cannot be committed — they are venue words. They arrive at runtime.
4. **The capability's `requires_approved = false` is a bet** on the signup path staying
   closed. If a path that can create a pending organizer is ever reopened, both grant rows
   are reconsidered **in the same commit** that reopens it.
5. **Migration first, deploy second.** That order held here, and the schema is live ahead of
   any code that reads it — which is the direction that degrades rather than takes pages
   down.

---

## Self-Check: PASSED

| claim | check | result |
|---|---|---|
| `44-07-SUMMARY.md` exists | `[ -f ... ]` | FOUND |
| `src/types/database.ts` modified | `git show --stat` | FOUND, +527 |
| Commit `0db98fd` exists | `git log --oneline --all \| grep` | FOUND |
| Build green | `npm run build; echo $?` | 0 |
| `verify:capabilities` green | exit code | 0 |
| No `STATE.md` / `ROADMAP.md` change | `git status --short` | neither appears |
