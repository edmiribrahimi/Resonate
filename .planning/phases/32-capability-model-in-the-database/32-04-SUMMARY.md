---
phase: 32-capability-model-in-the-database
plan: 04
subsystem: evidence-harness
tags: [rls, baseline, cap-03, container, postgres-17.6, personas, determinism]
requires:
  - "32-01 — scripts/rls-baseline.mjs, the target abstraction, the D-15 determinism contract"
  - "32-02 — 32-BASELINE-surfaces.md (B4), which the README indexes"
  - "32-03 — B2 and B3, PROBE_PAYLOADS, the two-clause rollback guarantee"
provides:
  - "scripts/rls-baseline-container.mjs — a throwaway PostgreSQL 17.6 target behind the same target signature"
  - "scripts/container/auth-shim.sql and scripts/container/seed.mjs — the only hand-written schema, and nine personas"
  - "the committed pre-phase baseline: eight artefacts and a README, on both targets, before any phase-32 DDL exists"
  - "the P1/P3 disagreement captured as data, on the only target that can hold an organizer"
affects:
  - "package.json (one scripts entry)"
  - "nothing under src/ — this plan adds no product code"
tech-stack:
  added: []
  patterns:
    - "a capture script that is both a CLI and a module, guarded by an import.meta.url check"
    - "per-target caches (WeakMap) so one process can hold two targets without mixing them"
    - "a container built from the repository's own git history, with the base blob hash asserted"
    - "deterministic synthetic seeding: every primary key derived from (table, row index)"
key-files:
  created:
    - scripts/rls-baseline-container.mjs
    - scripts/container/auth-shim.sql
    - scripts/container/seed.mjs
    - .planning/phases/32-capability-model-in-the-database/baseline/README.md
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-advisors.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.json
  modified:
    - scripts/rls-baseline.mjs
    - package.json
    - .planning/phases/32-capability-model-in-the-database/deferred-items.md
decisions:
  - "The container is built from supabase/schema.sql AS IT STOOD AT THE INITIAL COMMIT plus all 33 migrations, because six of the twenty tables are created by no migration and the current schema.sql cannot be replayed against the chain. That is production's real construction history, read from the repository's own object database with the blob hash asserted"
  - "A B2 cell is vacuous only when the persona saw nothing AND the table is globally empty. A zero on a populated table is the policy refusing, and marking it vacuous would discard exactly the evidence the container exists to produce"
  - "The seed reuses PROBE_PAYLOADS for its column lists, so the seed and the write matrix cannot drift into describing two different tables"
  - "Every seeded primary key is explicit and derived from (table, row index): a gen_random_uuid() default would make B2's fingerprint differ between two identical runs"
  - "B5 has no container equivalent and the CLI refuses --target=container --only=B5 rather than writing an empty artefact"
metrics:
  tasks: 3
  commits: 4
  duration: ~85 min
  completed: 2026-08-06
---

# Phase 32 Plan 04: The Container, the Seed, and the Committed Baseline — Summary

Wave 0 is closed. The pre-phase baseline exists on both targets, is committed,
and the commit provably predates the first line of this phase's DDL — and the
container answered the one question production cannot be asked: **a pending
organizer may insert a ticket tier and may not insert a venue.**

## What was built

| File | What it is |
|---|---|
| `scripts/container/auth-shim.sql` | 170 lines. The three Supabase roles, a minimal `auth.users`, the two `storage` tables, and `auth.uid()` / `auth.jwt()` / `auth.role()` / `storage.foldername()` copied **verbatim** from production. Plus the grants RLS narrows |
| `scripts/rls-baseline-container.mjs` | 430 lines. Starts `postgres:17.6`, applies the schema, asserts, seeds, captures, destroys — always destroys |
| `scripts/container/seed.mjs` | 330 lines. Nine personas, two differently-owned rows per table, and two refusals that make an under-seeded database impossible to hand on |
| `scripts/rls-baseline.mjs` | now a module as well as a CLI, so the capture code is **shared** with the container rather than copied |
| `package.json:12` | `"baseline:container": "node scripts/rls-baseline-container.mjs"` |

## Task 1 — the container and the shim

**The smoke run, all four observations the plan asked for:**

```
      container started from postgres:17.6
      applied the shim, the base schema and 33 migration files
      postgres 17.6, 20 tables with row-level security
      40 table/role grant pairs verified
  ✓ smoke — the container built, asserted and is about to be destroyed
      container destroyed, nothing left behind
$ docker ps -a --filter "ancestor=postgres:17.6" --format '{{.Names}}' | wc -l
       0
```

**A broken migration halts the run naming the file and the SQLSTATE.** A copy of
the migrations with one deliberately invalid statement appended, the mutation
asserted as applied (`grep -c deliberately_broken_probe` → `1`) before its
result was read:

```
  ✗ supabase/migrations/20260226200000_venues.sql failed to apply — SQLSTATE 42704: type "no_such_type" does not exist (at character 2994)
exit=1
```

The container was still destroyed. Reverted, `grep -c MUTATION` → `0`, re-run
green.

**The environment is distinguished from the measurement.** Both exit-2 paths
were exercised without touching the machine's Docker installation:

```
$ DOCKER_HOST=unix:///nonexistent-rls-baseline.sock node scripts/rls-baseline-container.mjs --smoke
FATAL: the Docker daemon is not answering (`docker info` failed). …  exit=2

$ PATH=/opt/homebrew/bin:/usr/bin:/bin node scripts/rls-baseline-container.mjs --smoke
FATAL: `docker` is not on the PATH. …  exit=2
```

**The shim's provenance.** `auth.uid()` carries the date its body was copied and
the fact that it is `language sql`, `STABLE` and **not** `SECURITY DEFINER` —
which matters, because a `SECURITY DEFINER` `auth.uid()` would change how all 67
policies evaluate. `storage.foldername()` was copied the same way rather than
approximated.

**It cannot reach a real database.** `grep -c 'process\.env'
scripts/rls-baseline-container.mjs` → **0**. The three occurrences of the word
SUPABASE are all inside the comment that makes the claim (`32-03`'s
forbidden-token pattern, applied to a different word).

## Task 2 — the seed

```
      seeded 20 tables, 9 profiles, 9/9 role × status cells
      artists                    2 rows  owner: created_by
      attendances                2 rows  owner: user_id
      discount_code_tiers        2 rows
      discount_codes             2 rows
      door_scan_events           2 rows  owner: operator_id
      drink_items                2 rows
      drink_orders               2 rows  owner: user_id
      drink_tokens               2 rows  owner: user_id
      event_media                2 rows  owner: uploaded_by
      event_parties              2 rows
      events                     2 rows  owner: created_by
      guest_list_entries         2 rows  owner: added_by
      newsletter_subscribers     2 rows
      pending_purchases          2 rows  owner: user_id
      profiles                   9 rows
      rsvps                      2 rows  owner: user_id
      ticket_refunds             2 rows  owner: requested_by
      ticket_tiers               2 rows
      tickets                    2 rows  owner: user_id
      venues                     2 rows  owner: created_by
      profiles role × status: master/approved=1 master/pending=1 master/rejected=1
                              member/approved=1 member/pending=1 member/rejected=1
                              organizer/approved=1 organizer/pending=1 organizer/rejected=1
```

Thirteen tables carry an owner column; each holds rows from **two** distinct
personas. `profiles` is owned through its own `id` and holds nine.

**Proved by mutation, twice, each mutation asserted as applied before its result
was read** (`ai-engineering.md`, gate *prova per mutazione*):

```
# one venues row removed
  ✗ these tables hold fewer than 2 rows after seeding: venues (1). A table with one
    row cannot distinguish "mine" from "not mine". Nothing was measured.     exit=1

# the two owners collapsed into one
  ✗ these owner columns carry rows from fewer than 2 distinct personas:
    artists.created_by (1), attendances.user_id (1), door_scan_events.operator_id (1),
    drink_orders.user_id (1), drink_tokens.user_id (1), event_media.uploaded_by (1),
    events.created_by (1), guest_list_entries.added_by (1), pending_purchases.user_id (1),
    rsvps.user_id (1), ticket_refunds.requested_by (1), tickets.user_id (1),
    venues.created_by (1). …                                                exit=1
```

Both reverted, `grep -c MUTATION` → `0`, re-run green. Two independent clauses,
reported separately.

**Nothing in the seed resembles a real member.** Every uuid begins with the
literal `32000004`; every address is at `.invalid`; every name is a **role**;
every membership code contains zeroes, and `handle_new_user()` draws from
`ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — an alphabet with no `0` — so a seeded code
can never collide with a real one. `grep -nE '[0-9a-f]{8}-…'` over the seed
returns nothing: no uuid is copied, all are constructed.

## Task 3 — the capture, on both targets, committed before any DDL

```
production: 4/11 personas · B1 67 rows · B2 220 rows, 172 vacuous · B3 240 probes · B5 8 lint kinds
container : 11/11 personas · B1 67 rows · B2 220 rows,   0 vacuous · B3 660 probes
```

### The cell the container exists for

```
organizer/pending    ticket_tiers  insert -> ok:1     conclusive=true
organizer/pending    venues        insert -> 42501    conclusive=true
organizer/approved   ticket_tiers  insert -> ok:1     conclusive=true
organizer/approved   venues        insert -> ok:1     conclusive=true
```

P1 (34 policies, no status check) and P3 (4 policies, `status = 'approved'`)
disagree on exactly this pair, and the disagreement is now a recorded fact
rather than a reading of two policy bodies. The same asymmetry shows on
`artists`, P3's other table: `organizer/pending` → `42501`,
`organizer/approved` → `ok:1`.

### The ordering assertion, made before committing

```
$ ls supabase/migrations | wc -l                    →  33
$ ls supabase/migrations | grep -icE 'capab|32'     →   0
$ git log --oneline -1 -- supabase/migrations/
acda813 fix(31-04): pending_purchases is the third foreign key to tickets…
```

The last migration change is phase 31's. **No phase-32 migration file exists at
the baseline commit.**

### Determinism

Two full build-seed-capture-destroy cycles, compared with `cmp` rather than
`git diff` (the second run's files were untracked at the time, and a `git diff`
on an untracked file is empty for the wrong reason):

```
B1 BYTE-IDENTICAL   B2 BYTE-IDENTICAL   B3 BYTE-IDENTICAL
```

### Nothing forbidden reached an artefact

All eight files plus B4 scanned for uuid- and email-shaped strings and for the
live values of `SUPABASE_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, the project
reference, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`MASTER_EMAIL`, `TICKET_SIGNING_SECRET`, `CRON_SECRET`, `SUMUP_API_KEY` and
`RESEND_API_KEY`. Every file: **CLEAN**.

### No row was written to production

```
clause 1/2: 240 probe strings end in a rollback and carry no forbidden token
clause 2/2: 20/20 row counts re-read and unchanged after 240 probes
```

## Findings

### F1 — the container's B1 is **identical** to production's, all 67 rows

D-22 predicted a difference and told us to record it. There is none. Compared on
`tablename`, `policyname`, `cmd`, `permissive`, `roles`, `qual` and
`with_check`: **0 rows only in production, 0 only in the container, 0 of the 67
shared rows differing**, same supporting counts on both.

That is stronger than D-22 asked for. It says the repository's own SQL, applied
in order, reproduces production's applied policy set exactly — so the container
is a legitimate stand-in for policy comparisons, not only for persona coverage.
It does **not** say the whole schema matches: B1 covers policies, and phase 31
recorded a drift of a different kind (a foreign key on `pending_purchases`) that
B1 would not have caught. That particular one is now in the repository and does
apply to the container.

### F2 — the 33 migrations cannot build this database on their own

The plan's D-21 says the container is built from `supabase/migrations/**`.
Measured: six of the twenty tables — `profiles`, `events`, `rsvps`,
`attendances`, `event_media`, `newsletter_subscribers` — are created by **no**
migration, and the first migration opens with
`ALTER TABLE public.profiles ADD COLUMN role`.

The **current** `supabase/schema.sql` is not the missing base either: it was
updated alongside five later migrations up to phase 26 and then abandoned, so it
already carries `role`, `status`, `ticket_tiers` and `discount_codes`, and
replaying those migrations over it fails on a duplicate column and a duplicate
table.

What composes is `supabase/schema.sql` **as it stood at the initial commit**,
before any migration existed — production's real construction history. It is
read from this repository's own object database and its blob hash is asserted,
so an amended history is caught rather than silently producing a different
schema. **F1 is the evidence that the reconstruction is right.**

### F3 — `unused_index` is 12, not the 14 the research measured the same day

`32-RESEARCH.md` and plan `32-01`'s capture both recorded **14** on 2026-08-06;
this capture, hours later, reports **12**. The advisor derives that lint from
`pg_stat_user_indexes.idx_scan` — indexes not scanned since the statistics were
last reset — so it moves as the database is used, with no schema change at all.

**Consequence for the phase gate:** `32-VALIDATION.md`'s CAP-03 row asks that
`unused_index (14)` not move. Compare against the number **committed here**,
and do not treat it as an invariant. `multiple_permissive_policies` (46) and
`unindexed_foreign_keys` (35) are structural and are safe to pin.

### F4 — `UPDATE public.profiles` fails `42P17` on **both** targets

D-32-A, reproduced faithfully rather than smoothed over: **4** cells on
production (its four personas) and **11** on the container (all eleven). The
container's fresh, fully-seeded `profiles` behaves identically, which answers
the obvious worry — the recursion is a property of the policy, not of
production's data.

The owner's decision is still owed before the CAP-06 rewrite is written. This
baseline is what makes either choice visible: B3 will fail the comparison if the
rewrite changes the cell.

### F5 — one container cell is inconclusive for a seeding reason

`member/approved` inserting into `rsvps` answers `23505` rather than `ok:1`:
`rsvps` carries `unique (party_id, user_id)` and the seed has already placed
that persona's rsvp on the party the probe targets. It is marked
`conclusive_for_rls: false` and is not hidden — D-19's machinery doing its job.

Swapping the seed's owner order would only move the collision to
`master/approved`, so it was left general and recorded instead. The P5 predicate
is still captured conclusively on its other surface and on the negative half
here: `member/pending → 42501` on both `rsvps` and `event_media`,
`member/approved → ok:1` on `event_media`.

### F6 — `CLAUDE.md` Guardrail 3 is wrong about `supabase/schema.sql`

It states the file holds *zero* `CREATE POLICY` and *zero* `ENABLE ROW LEVEL
SECURITY`. Measured: **37** and **11**. Its conclusion still points the right
way — the migrations are the source of truth — but its reason is false, and the
file is now neither the base nor the current schema (F2). Deferred as **D-32-C**
rather than fixed here: the persona has its own gates (version bump, changelog,
`npm run verify:persona`, cross-domain coherence review) and two agents must
never touch it in parallel.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] the container cannot be built from the migrations alone**

- **Found during:** Task 1 — see finding F2.
- **Issue:** D-21 says "built from `supabase/migrations/**`". Six tables are
  created by no migration; the first migration `ALTER`s one of them. The
  container would have failed on file 1 of 33.
- **Fix:** the base is `supabase/schema.sql` at the initial commit, read from
  git with its blob hash asserted. No hand-written schema was added — D-21's
  real constraint ("the shim is the only hand-written schema") is preserved.
- **Commit:** `eb6ffeb`

**2. [Rule 3 — Blocking] the shim needs `storage.objects` and `storage.foldername`, not only `storage.buckets`**

- **Found during:** Task 1
- **Issue:** the plan names `storage.buckets` because of the venues migration's
  insert. Four migrations also `CREATE POLICY … ON storage.objects`, and one
  calls `storage.foldername(name)`. Without them the chain stops at file 3.
- **Fix:** both added to the shim, with `storage.foldername` copied verbatim
  from production rather than approximated. Neither is read by any artefact —
  B1 filters `schemaname = 'public'` — and the shim says so.
- **Commit:** `eb6ffeb`

**3. [Rule 2 — Missing critical functionality] a grant assertion after the migrations**

- **Issue:** RLS narrows a grant; it cannot create one. A bare PostgreSQL grants
  nothing, so a missing `GRANT SELECT` would make every persona read zero rows
  and refuse every write — and the container's matrix would agree with
  production's for a reason that has nothing to do with a policy (T-32-04-03).
  The shim's `ALTER DEFAULT PRIVILEGES` is the mechanism; an assertion is what
  makes its failure visible.
- **Fix:** `assertGrants()` checks all four verbs for `anon` and `authenticated`
  on all 20 RLS tables and refuses naming the pairs. Observed: **40/40**.
- **Commit:** `eb6ffeb`

**4. [Rule 1 — Bug] `vacuous` marked a real refusal as proving nothing**

- **Found during:** Task 3 — the first container capture reported **69** vacuous
  cells on a database where every table holds at least two rows.
- **Issue:** `vacuous` was `count === 0`. Its own docstring says vacuity is about
  "two empty sides agree for a reason that has nothing to do with the policy" —
  which is true only when the table is empty. On a seeded target a zero **is**
  the policy, and marking it vacuous discards exactly the evidence the container
  exists to produce.
- **Fix:** `vacuous` is now `count === 0 && the table is globally empty`, the
  same rule D-19 already applies to an `ok:0` in B3. The privileged row counts
  are carried in a new `table_row_counts` trailing key so the judgement is
  auditable from the artefact. Container 69 → **0**; production 191 → **172**,
  the 19 difference being real refusals previously discounted.
- **Commit:** `bc1e3d0`

**5. [Rule 3 — Blocking] `rls-baseline.mjs` ran its CLI on import**

- **Issue:** the plan requires the capture code be shared, not copied. Importing
  it would have demanded a Supabase access token and started capturing
  production — the exact thing the container target must never do.
- **Fix:** the main block is guarded by an `import.meta.url` check, the capture
  functions are exported, and the per-run caches moved from module-level
  variables to `WeakMap`s keyed by target — one process can now hold both
  targets, and a module-level cache would have handed production's numbers to
  the container.
- **Commit:** `eb6ffeb`

**6. [Format] a second trailing key on B2**

D-15 allows an artefact to append its own trailing key after `rows`. B2 already
appends `personas`; it now also appends `table_row_counts`, without which the
vacuity judgement in deviation 4 would have to be taken on trust. The six
declared keys keep their order and position.

### Not done, deliberately

**`32-VALIDATION.md` was not edited.** Its § *Known blocking dependency* still
records Docker as unverified and its Wave 0 checkboxes are still unticked. Docker
**was** verified on this machine on 2026-08-06 (server 29.2.1) and all four Wave 0
items are now satisfied, but no task in this plan instructs an edit to that file,
and it is shared across the phase. Ticking it belongs to the phase verifier.

**`STATE.md` and `ROADMAP.md` were not touched** — the orchestrator owns those.

## Execution-environment note, not a code change

This plan ran in a git worktree, which holds no gitignored file. `.env.local`
and `node_modules` were symlinked in from the main checkout for the duration and
**both symlinks were removed before this commit**. Both paths are gitignored;
neither was ever staged. Same handling as plans `32-01` and `32-03`.

## What this does not cover

- **B5 has no container equivalent.** The advisor is a Supabase service, not a
  database object. The CLI refuses `--target=container --only=B5` rather than
  writing an empty artefact, and the README says so instead of leaving a gap.
- **The container is not production.** F1 shows the policy sets agree; it says
  nothing about extensions, triggers installed by the platform, or Auth
  configuration. The `auth` and `storage` objects in the shim are minimal by
  design and no artefact reads them.
- **Nothing was compared against a post-change capture.** These are captures.
  The whitelist and the before/after comparison belong to later plans; this plan
  only fixes what they will be compared against.
- **`42P17` is recorded, not judged.** D-32-A remains the owner's decision.

## Self-Check: PASSED

- `scripts/rls-baseline-container.mjs` — FOUND
- `scripts/container/auth-shim.sql` — FOUND
- `scripts/container/seed.mjs` — FOUND
- `baseline/README.md` — FOUND
- `baseline/32-BASELINE-policies.json` — FOUND
- `baseline/32-BASELINE-reads.json` — FOUND
- `baseline/32-BASELINE-writes.json` — FOUND
- `baseline/32-BASELINE-advisors.json` — FOUND
- `baseline/32-BASELINE-policies.container.json` — FOUND
- `baseline/32-BASELINE-reads.container.json` — FOUND
- `baseline/32-BASELINE-writes.container.json` — FOUND
- commit `eb6ffeb` — FOUND
- commit `c9cee83` — FOUND
- commit `bc1e3d0` — FOUND
- commit `15e5937` — FOUND
- no file deletions in any of the four commits — CONFIRMED
- `STATE.md` and `ROADMAP.md` untouched — CONFIRMED
