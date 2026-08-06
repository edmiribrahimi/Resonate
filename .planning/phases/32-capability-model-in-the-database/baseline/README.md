# The phase 32 pre-phase baseline

**Captured 2026-08-06, before a single line of this phase's DDL existed.**

Phase 32 replaces the predicate of every row-level security policy in this
database while promising, in CAP-03, that a master, an organizer and a member
can afterwards do **neither more nor less than before**. Sixty-seven policies
cannot be judged by reading a diff. So this directory holds what the database
actually answered, before anything moved, in a form a second person can
re-capture and compare byte for byte.

**A baseline taken after the change is not a baseline.** That is why these files
are committed now, in a commit that provably predates the first migration of
this phase: `ls supabase/migrations/` shows **33** files at this commit, none of
them mentioning capabilities, and the last commit to touch that directory is
phase 31's `acda813`.

---

## Two targets, because neither one alone is a baseline

| | production | container |
|---|---|---|
| what it is | the live Supabase project, through the Management API | a throwaway `postgres:17.6`, built and destroyed per run |
| what it is the truth about | **the schema** — what is actually applied | **the personas** — who can be measured |
| profiles it holds | 4 — one `master/approved`, three `member/approved` | 9 — one per `role` × `status` pair |
| personas resolved | **4 of 11** | **11 of 11** |
| rows per table | 13 of the 20 tables are **empty** | at least **2** in every table, two different owners |
| the advisor (B5) | available | **not** available — it is a Supabase service, not a database object |

**`organizer/pending` exists only on the container.** That single pair is where
the two live definitions of "organizer" disagree: predicate **P1** (34 policies,
via `is_admin_or_organizer()`) does not check status, while predicate **P3** (4
policies, on `artists` and `venues`) requires `status = 'approved'`. A pending
organizer may therefore insert a ticket tier and may **not** insert a venue.
CAP-03 must reproduce that asymmetry rather than resolve it, and production
cannot show it at all, because production has no organizer of any status.

It is captured here as data:

```
organizer/pending    ticket_tiers  insert -> ok:1     conclusive
organizer/pending    venues        insert -> 42501    conclusive
organizer/approved   ticket_tiers  insert -> ok:1     conclusive
organizer/approved   venues        insert -> ok:1     conclusive
```

---

## The artefacts

| File | ID | Serves | Re-capture with |
|---|---|---|---|
| `32-BASELINE-policies.json` | B1 | CAP-03, CAP-01 | `npm run baseline:rls -- --only=B1` |
| `32-BASELINE-reads.json` | B2 | CAP-03 | `npm run baseline:rls -- --only=B2` |
| `32-BASELINE-writes.json` | B3 | CAP-03, CAP-06 | `npm run baseline:rls -- --only=B3 --i-know-this-writes` |
| `32-BASELINE-advisors.json` | B5 | CAP-03, CAP-04, CAP-06 | `npm run baseline:rls -- --only=B5` |
| `32-BASELINE-policies.container.json` | B1 | CAP-03 | `npm run baseline:container` |
| `32-BASELINE-reads.container.json` | B2 | CAP-03 | `npm run baseline:container` |
| `32-BASELINE-writes.container.json` | B3 | CAP-03, CAP-06 | `npm run baseline:container` |
| `32-BASELINE-surfaces.md` | B4 | CAP-03 | by hand — it is a reading of the code, not of the database |

The three non-writing production artefacts at once: `npm run baseline:rls`.
All three container artefacts at once: `npm run baseline:container`.

### Two refusals, and why they are the default

**These files are never overwritten.** Every destination is checked *before*
anything is measured; an existing file aborts the run with exit 1, naming the
file and naming `--overwrite`. `writeArtefact` checks a second time, so a script
that imports the capture functions cannot route around it. Re-capturing over
`pre` would not corrupt an artefact — it would produce a perfectly consistent
one, which is worse: every later `--before=pre` comparison would then agree with
itself and report **clean** for the only reason that cannot be detected from the
files. To re-capture the same phase point deliberately:

```
npm run baseline:rls -- --phase-point=post-10 --overwrite
```

and say in the commit why the previous capture was replaced.

**B3 is not in the default set, and on production it needs
`--i-know-this-writes`.** It is the only capture that sends `read_only: false`
INSERT/UPDATE/DELETE transactions, and against `production` those reach the live
database. The two rollback clauses below are real and are asserted twice — but a
destructive default guarded by an assertion is still a destructive default. On
the throwaway container B3 needs no extra flag: there is nothing there to
protect.

Both refusals close CR-02 of `32-REVIEW.md`, which found that the no-argument
invocation printed in this file destroyed the pre-phase evidence chain *and*
fired the write probes at production.

### What each one proves, and what it does not

**B1 — the policy dump.** *Proves:* what the applied policy set **is**, in
Postgres's own rendering of every `USING` and `WITH CHECK`, so a later capture
can be diffed against it. *Does not prove:* that any policy is correct, or that
it does what its name says. It is a rendering, not a judgement.

**B2 — the persona read matrix.** *Proves:* for every persona and every table,
how many rows are visible **and**, through the md5 of the sorted primary keys,
*which* rows — so a policy that changes which rows it shows without changing how
many is still caught. *Does not prove:* anything about writing. No read ever
evaluates a `WITH CHECK`.

**B3 — the persona write matrix.** *Proves:* what the database answers to an
`INSERT`, `UPDATE` and `DELETE` under each persona — `ok:<n>` or the bare
SQLSTATE. It is the **only** artefact that can baseline a `WITH CHECK` clause,
and four of the five inherited predicates (P3 on `artists`/`venues`, P5 on
`event_media`/`rsvps`) live in one. *Does not prove:* that an answer is the
right answer. `42P17` on `profiles` is a faithful recording of a defect, not an
endorsement of it.

**B4 — the application surfaces.** *Proves:* with `file:line`, the middleware
rules, guard families, door routes and role reads that decide what a person
sees. *Does not prove:* anything the database enforces. The middleware is UX;
RLS is the security boundary.

**B5 — the advisor oracle.** *Proves:* what a tool that has never read this plan
says about the schema — an outside witness both to the intended change
(`auth_rls_initplan` 26 → 0) and to the absence of unintended ones. *Does not
prove:* anything about behaviour. An advisor counts patterns.

---

## Where it was run, and what was touched

**Production.** Read through `POST /v1/projects/{ref}/database/query` and
`GET /v1/projects/{ref}/advisors/{performance,security}`.

**No row was written.** The write probes cannot use the API's read-only flag —
`set local role` is refused under it — so they run in a read-write transaction,
and the safety comes from two independent clauses, checked and reported
separately:

```
clause 1/2: 240 probe strings end in a rollback and carry no forbidden token
clause 2/2: 20/20 row counts re-read and unchanged after 240 probes
```

Clause 1 is asserted over the **whole** probe list before a single byte reaches
the network. Clause 2 runs in a `finally`, so a run that aborted halfway is
checked too. Everything that does not switch role — the policy dump, the
advisors, the schema reads, the row-count re-read — uses `read_only: true`,
under which an `INSERT` fails `25006`.

**Container.** `postgres:17.6` on an ephemeral loopback port with a password
generated for that one run, built from `scripts/container/auth-shim.sql`, the
repository's base schema and all 33 migrations, seeded, captured, and destroyed
— including on failure. The same two clauses were reported, over 660 probes.
The container runner reads **no** environment variable at all, so it has no path
to a real database.

**Nothing publishable-forbidden reached an artefact.** All eight files were
scanned for uuid- and email-shaped strings and for the live values of
`SUPABASE_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, the project reference,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `MASTER_EMAIL`,
`TICKET_SIGNING_SECRET`, `CRON_SECRET`, `SUMUP_API_KEY` and `RESEND_API_KEY`.
Every file: **CLEAN**. B2 identifies a row set by the md5 of its primary keys
precisely so that it can say *which* rows without naming one.

---

## The determinism contract (phase decision D-15)

These files exist to be diffed, and a file that reorders itself between two
identical runs produces a diff that **hides** the real one. So:

1. Top-level keys in the order `artefact`, `target`, `postgres_version`,
   `captured_at`, `phase_point`, `rows`. An artefact may append its own trailing
   keys after `rows`; the six never move.
2. Every row object is rebuilt with an explicit key order.
3. Every row array is sorted by a declared composite key, with a plain codepoint
   comparison — never `localeCompare`, whose result depends on the locale.
4. Every nested array is sorted.
5. `JSON.stringify(value, null, 2)` plus exactly one trailing newline.
6. `captured_at` is a **date**, never a timestamp.

Verified by capturing twice and comparing with `cmp`: B1, B2 and B3 on the
container are **byte-identical** across two full build-seed-capture-destroy
cycles. That is why every seeded primary key is derived from `(table, row
index)` rather than left to `gen_random_uuid()`.

---

## The two comparisons this phase will make

**B1 — a diff explained entirely by a whitelist of two transformations.**
Nothing else may differ: no policy added or removed, no `cmd` changed, no `TO`
clause moved, no `permissive` flipped.

| # | Allowed transformation |
|---|---|
| 1 | `auth.uid()` → `(select auth.uid())` |
| 2 | a P1–P5 predicate → `(select private.has_capability('<key>'))` |

**B2, B3 and B4 — identical.** Every count, every fingerprint, every cell
**including the SQLSTATE**, and every predicate in B4's column, character for
character.

**B5 — one number moves, three do not.** `auth_rls_initplan` must go **26 → 0**;
`multiple_permissive_policies` (46) and `unindexed_foreign_keys` (35) must not
move. See the finding on `unused_index` below before pinning it.

---

## How much of each matrix actually proves something

A cell is **vacuous** when the persona saw nothing *and there was nothing to
see* — the table is globally empty, so the md5 is `d41d8cd9…`, the md5 of the
empty string, and two captures agree for a reason that has nothing to do with a
policy. A zero on a table that **holds** rows is the opposite: that is the
policy refusing, and it is among the strongest evidence in the matrix.

| | production | container |
|---|---|---|
| B2 vacuous cells | **172 of 220 (78.2%)** | **0 of 220 (0.0%)** |
| B2 cells for an absent persona | 140 | 0 |
| B3 cells actually probed | 240 of 660 | **660 of 660** |
| B3 inconclusive (D-19) | 71 | 19 |

**Production's 78.2% is a known limitation, recorded rather than hidden.**
Thirteen of its twenty tables hold no rows and seven of its eleven personas do
not exist, so most of its matrix proves nothing on its own. That is the whole
reason the container exists, and it is the difference between a baseline and a
green screen.

---

## Findings

### F1 — the container's B1 is **identical** to production's, all 67 rows

Phase decision D-22 expected a difference and told us to record it. There is
none. Compared on `tablename`, `policyname`, `cmd`, `permissive`, `roles`,
`qual` and `with_check`: **0 rows only in production, 0 only in the container, 0
of the 67 shared rows differing**, and the same supporting counts (67 policies,
20 RLS-enabled tables) on both.

That is a stronger result than D-22 asked for, and it says something worth
saying: the repository's own SQL, applied in order, reproduces production's
applied policy set exactly. The container is therefore a legitimate stand-in for
policy comparisons, not only for persona coverage.

**What it does not say.** B1 covers policies, not the rest of the schema.
Phase 31 recorded a real drift of a different kind — a foreign key on
`pending_purchases` that no plan had seen — and B1 would not have caught it.
(That particular one is now in the repository and does apply to the container:
`pending_purchases_ticket_id_fkey` is `ON DELETE SET NULL` in both.)

### F2 — the 33 migrations cannot build this database on their own

Six of the twenty tables — `profiles`, `events`, `rsvps`, `attendances`,
`event_media`, `newsletter_subscribers` — are created by **no** migration, and
the first migration opens by `ALTER TABLE public.profiles ADD COLUMN role`. They
come from `supabase/schema.sql`, whose header calls itself the "fresh database
setup".

The **current** `supabase/schema.sql` is not that base either: it was updated
alongside five later migrations, so it already carries `role`, `status`,
`ticket_tiers` and `discount_codes`, and replaying those migrations over it
fails on a duplicate column and a duplicate table.

The base that composes is `supabase/schema.sql` **as it stood at the initial
commit**, before any migration existed — which is production's real construction
history. `scripts/rls-baseline-container.mjs` reads it from this repository's own
object database and asserts the blob hash, so an amended history is caught
rather than silently producing a different schema. F1 is the evidence that the
reconstruction is right.

### F3 — `unused_index` is **12**, not the 14 the research measured

`32-RESEARCH.md` and plan `32-01`'s capture both recorded 14 on 2026-08-06;
this capture, the same day, reports 12. The advisor derives that lint from
`pg_stat_user_indexes.idx_scan`, so it counts indexes *not scanned since the
statistics were last reset* — it moves as the database is used, without any
schema change.

**Consequence for the phase gate:** compare against the number committed here,
never against the number in the research, and do not treat `unused_index` as an
invariant. `multiple_permissive_policies` (46) and `unindexed_foreign_keys` (35)
are structural and are safe to pin; this one is not.

### F4 — `UPDATE public.profiles` fails `42P17` on **both** targets

Recorded as **D-32-A** in `deferred-items.md`. Every persona that exists gets
`42P17: infinite recursion detected in policy for relation "profiles"` on an
update — 4 cells on production, **11 on the container**. The container does not
smooth it over, which is the answer to the obvious worry: the recursion is a
property of the policy, not of production's data.

The two `UPDATE` policies on `profiles` are therefore dead, and one of them,
`profiles_update_own`, carries the **privilege-escalation guard** — the clause
that stops a member setting their own `role` to `master`. Today that guard
refuses by crashing rather than by denying. **The owner owes a decision before
the CAP-06 rewrite is written**, and this baseline is what makes the choice
visible either way: B3 will fail the comparison if the rewrite changes the cell.

### F5 — one container cell is inconclusive for a seeding reason

`member/approved` inserting into `rsvps` answers `23505` (unique violation)
rather than `ok:1`, because `rsvps` carries `unique (party_id, user_id)` and the
seed already placed that persona's rsvp on the party the probe targets. It is
marked `conclusive_for_rls: false` and is not hidden.

The P5 predicate it was meant to exercise (`status = 'approved'` alone) is still
captured conclusively on the other P5 surface, and on the negative half here:

```
member/pending   event_media insert -> 42501   conclusive
member/approved  event_media insert -> ok:1    conclusive
member/pending   rsvps       insert -> 42501   conclusive
```

### F6 — `supabase/schema.sql` does contain RLS, contrary to `CLAUDE.md` Guardrail 3

Not this phase's to fix; recorded in `deferred-items.md` as **D-32-C**.

---

## The rule this directory exists to enforce

**No task in any later plan of this phase may create a file under
`supabase/migrations/` until this commit exists.** The ordering is not a
formality — it is the entire value of the artefact.
