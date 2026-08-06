---
phase: 32-capability-model-in-the-database
plan: 03
subsystem: evidence-harness
tags: [rls, baseline, cap-03, personas, write-probes, rollback-guarantee]
requires:
  - "32-01 — scripts/rls-baseline.mjs, the target abstraction, the D-15 determinism contract"
provides:
  - "B2 (persona read matrix) and B3 (persona write matrix) capture under the same --only flag"
  - "the eleven-persona resolver plan 32-04 runs against a seeded container"
  - "the two-clause rollback guarantee every later write probe inherits"
affects:
  - "nothing under src/ — this plan adds no product code"
tech-stack:
  added: []
  patterns:
    - "persona impersonation inside a read-write transaction ending in a rollback"
    - "GET DIAGNOSTICS instead of RETURNING, so a read policy cannot confound a write measurement"
    - "a declared payload table with a coverage refusal, verify-persona.mjs's pattern applied to coverage"
    - "two independent guarantee clauses, checked and reported separately (verify-persona.mjs check F)"
key-files:
  created:
    - .planning/phases/32-capability-model-in-the-database/deferred-items.md
  modified:
    - scripts/rls-baseline.mjs
decisions:
  - "Foreign keys are pre-resolved ONCE with a privileged read, not sub-selected inside the persona transaction: an in-transaction sub-select runs under that persona's READ policies, so master and member would probe different rows and the matrix would stop being a matrix"
  - "Probes use a plpgsql block with GET DIAGNOSTICS, not `... returning 1`: Postgres applies the SELECT policy to a RETURNING clause, so a row a WITH CHECK allowed but a USING hid would be recorded as a refusal — measuring the read policy inside the write matrix"
  - "Table primary keys are read from pg_catalog, not information_schema: under read_only the endpoint runs as supabase_read_only_user, for whom information_schema.table_constraints returns zero rows"
  - "An `ok:0` on a table that holds no rows at all is inconclusive, on the same reasoning as D-19: nothing was there to refuse"
metrics:
  tasks: 2
  commits: 2
  duration: ~75 min
  completed: 2026-08-06
---

# Phase 32 Plan 03: The Persona Read and Write Matrices — Summary

B2 and B3 complete the evidence harness with the two artefacts that measure
what the database actually **permits** — including the only one that can
baseline a `WITH CHECK` clause — and B3 found, on its first run, that
`UPDATE public.profiles` is impossible for every persona alive today.

## What was built

`scripts/rls-baseline.mjs` grew from 641 to 1279 lines across two commits.
Still zero dependencies, still `node:`-prefixed imports only, still `fetch`.

| Piece | What it does |
|---|---|
| `PERSONA_LABELS` | the eleven of D-11: the 3×3 role × status grid, `authenticated/no-profile`, `anon` |
| `resolvePersonas()` | the nine grid personas from the lowest `id` per cell; `anon` needs no subject; `authenticated/no-profile` is a `crypto.randomUUID()` **asserted absent from `public.profiles`**, so it exists on every target. Every resolved uuid is `registerSecret()`-ed and **only the label reaches the artefact** |
| `getTables()` | the RLS-enabled tables with their primary keys, from `pg_catalog`; refuses on an unkeyed table or fewer than 20 |
| `captureB2()` | one transaction per persona, 20 tables batched, each cell `count` **and** the md5 of the sorted primary keys, with `vacuous` set when the count is zero |
| `PROBE_PAYLOADS` | one entry per RLS table — insert columns, minimal valid values, and a neutral update column — with a comment naming what makes the row valid |
| `captureB3()` | persona × table × verb, **one request per probe**, `ok:<affected>` or the SQLSTATE alone |
| `assertProbesRollBack()` | clause 1 of the guarantee, over the whole probe list, before a byte is sent |
| `assertRowCountsUnchanged()` | clause 2, in a `finally`, so an aborted run is checked too |

`--only` now accepts `B1,B2,B3,B5`.

## Observed verification — Task 1 (B2)

**Personas.** Exactly the four the plan predicted resolve on production; the
other seven are recorded `absent`, never omitted.

```
personas 11 anon|authenticated/no-profile|master/approved|master/pending|master/rejected|
            member/approved|member/pending|member/rejected|organizer/approved|
            organizer/pending|organizer/rejected
rows 220   vacuous 191
```

**The impersonation is real, not a silent fall-back to the service role.**

| table | anon | no-profile | member/approved | master/approved |
|---|---|---|---|---|
| artists | 7 | 7 | 7 | 7 |
| drink_items | 10 | 10 | 10 | 10 |
| drink_tokens | 0 | 0 | 0 | **16** |
| event_parties | 3 | 3 | 3 | 3 |
| events | 2 | 2 | 2 | 2 |
| guest_list_entries | 0 | 0 | 0 | **1** |
| **profiles** | **0** | **0** | **1** | **4** |
| ticket_tiers | 1 | 1 | 1 | 1 |
| tickets | 0 | 0 | 0 | **1** |
| venues | 5 | 5 | 5 | 5 |

- `anon` reads a non-zero count on **six** tables — `artists`, `drink_items`,
  `event_parties`, `events`, `ticket_tiers`, `venues`. Six is exactly the
  number of `qual = true` policies `32-RESEARCH.md` § *Measured Baseline*
  records. The two counts were derived independently and agree.
- `master/approved` reads **strictly more** than `anon` on four tables. On
  `profiles` the three-way split — anon 0, member 1, master 4 — is the clearest
  possible evidence that the role switch takes effect, since a service-role
  read would have returned 4 for all of them.
- `authenticated/no-profile` reads **0** profiles where `member/approved` reads
  1: the persona that exists for the `?? "member"` default is distinguishable
  from a real member, which is the whole reason it is in the set.

**No uuid reached the artefact.** `grep -cE '[0-9a-f]{8}-[0-9a-f]{4}-'` returns
`0`. A direct containment check against the live values of
`SUPABASE_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, the project reference,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `MASTER_EMAIL`
and `TICKET_SIGNING_SECRET`, plus email- and uuid-shaped regexes, reports
**CLEAN**.

**Mutation proof, with the mutation asserted as applied before its result was
read** (`ai-engineering.md`, gate *prova per mutazione*). Table enumeration
narrowed to `relname < 'p'`; `grep -n` confirmed line 629 carried the mutation;
the existing artefact was deleted first:

```
  ✗ B2 — implausible measurement: 13 RLS-enabled tables, floor is 20 (measured 2026-08-06).
        Nothing was written. Investigate the database — do not lower the floor.
FAILED 1/1: B2
exit=1
reads-file-exists=NO
```

Reverted, `grep -c` confirming `0` remnants, re-captured: **byte-identical** to
the pre-mutation run.

## Observed verification — Task 2 (B3)

**The two named evidence cells, as the plan required them:**

```
  member/approved  venues insert -> 42501   conclusive=true
  master/approved  venues insert -> ok:1    conclusive=true
```

and, for completeness, `anon` and `authenticated/no-profile` also `42501`.

**P3 and P5 are both captured, which is the point of B3** — no read touches
either:

| Predicate | Cell | anon | no-profile | member/approved | master/approved |
|---|---|---|---|---|---|
| **P3** `role IN (organizer,master) AND approved` | `artists` insert | 42501 | 42501 | **42501** | **ok:1** |
| **P3** | `venues` insert | 42501 | 42501 | **42501** | **ok:1** |
| **P5** `status = approved` | `event_media` insert | 42501 | 42501 | **ok:1** | ok:1 |
| **P5** | `rsvps` insert | 42501 | 42501 | **ok:1** | ok:1 |

The P5 rows are the ones that would silently move if Pitfall 1 were committed —
a member may insert an rsvp and a media row but not a venue, and that is now a
recorded fact rather than a reading of a policy body.

**The full result distribution, 240 real probes:**

```
{"delete ok:0":73, "update ok:0":69, "insert 42501":63, "insert ok:1":15,
 "update ok:1":7, "delete ok:1":6, "update 42P17":4, "insert 23503":2, "delete 23503":1}
inconclusive (real cells): 71 of 240
```

Plus 420 `absent` cells for the seven personas production cannot offer.

**The rollback guarantee, both clauses, reported separately:**

```
      clause 1/2: 240 probe strings end in a rollback and carry no forbidden token
      clause 2/2: 20/20 row counts re-read and unchanged after 240 probes
```

**Mutation proof 1 — a missing payload entry refuses before anything is sent.**
The `venues` entry removed, `grep -c` confirming the entry was gone (`0`) and
the marker present (`1`), the artefact deleted first:

```
  ✗ B3 — PROBE_PAYLOADS has no entry for: venues. Nothing was written — a write
        matrix that silently skips a table is a matrix that cannot fail.
exit=1   writes-file-exists=NO
```

**Mutation proof 2 — one probe string ending in the forbidden token aborts
before the first request.** `probes[0].sql` rewritten to end in the token;
`grep -n` confirmed the mutation at line 1234 before the run:

```
  ✗ B3 — 2 probe string(s) failed the rollback guarantee and NOTHING was sent:
        anon/artists/delete: does not end in a rollback
        anon/artists/delete: contains the forbidden token
exit=1   writes-file-exists=NO
```

*Both* conditions fired on the same string and were reported separately, which
is the two-clause shape.

**That no request was sent is mechanically observable, not asserted.** The
`clause 2/2` line lives in the `finally` of the probe loop
(`scripts/rls-baseline.mjs:1265`), so it prints whenever the loop is entered
at all — even on an abort. It did **not** print. The guard is called at
`:1235`, before the loop. Wall clock was **8.9 s** against **~140 s** for a
full run; the 8.9 s is the read-only setup (facts, tables, personas,
references, keys, pre-run counts).

Both mutations reverted, `grep -c MUTATION` returning `0`, `node --check`
clean, and a clean re-capture **byte-identical** to the pre-mutation artefact.

**The forbidden token, line by line.** `grep -ci 'commit'` returns **3**:

| Line | Text | Verdict |
|---|---|---|
| `:10` | `… as a committable artefact …` | prose from plan 32-01; `\bcommit\b` does not match `committable` |
| `:63` | `These artefacts are committed, …` | prose from plan 32-01; same |
| `:1010` | `const FORBIDDEN_PROBE_TOKEN = /\bcommit\b/i;` | **the guard itself** |

The standalone token appears **only** in the guard that forbids it.

**Determinism.** Three consecutive captures of each artefact — including the
combined `--only=B2,B3` run — compared with `cmp`, not `git diff`, because this
plan commits no artefact and `git diff` on an untracked file is empty for the
wrong reason:

```
B2 BYTE-IDENTICAL   B3 BYTE-IDENTICAL   (2/2 captured, exit 0)
```

**`npm run build` passes**, run after each task. There is no test runner for
the product; this is the typecheck gate, and nothing under `src/` changed.

## Findings

### F1 — `UPDATE public.profiles` fails `42P17` for every persona, and the two update policies on `profiles` are dead

The single most important thing this plan measured. `anon`,
`authenticated/no-profile`, `member/approved` and `master/approved` **all**
receive `42P17: infinite recursion detected in policy for relation "profiles"`
on an update. Confirmed with a **bare** statement — no plpgsql wrapper, no
`RETURNING` — in four variants, including a master changing another row's
`status`, which is the approval path.

The cause is `profiles_update_own`'s `WITH CHECK`, which sub-selects
`public.profiles` from inside a policy on `public.profiles`. Permissive
`WITH CHECK` clauses are OR'd and all are evaluated, so the recursion takes
`profiles_update_master` down with it even though its own predicate is a
`SECURITY DEFINER` call that would not recurse.

Nothing is broken today because **every** profile-update call site uses the
service-role client, which bypasses RLS — `api/auth/callback/route.ts:29`,
`api/webhooks/sumup/route.ts:87`, and eight sites in
`(admin)/admin/members/actions.ts`. The policies are unreachable.

Why it matters now: `profiles_update_own` is CAP-06's class E, one of the 26
policies this phase rewrites, and its `WITH CHECK` is the
**privilege-escalation guard** — the clause that stops a member setting their
own `role` to `master`. Today that guard refuses by crashing rather than by
denying. A rewrite that removes the recursion would turn two dead policies into
live ones as a side effect of a change made for a different reason, which is a
widening and CAP-03 forbids it. Recorded in `deferred-items.md` as **D-32-A**
with the decision the owner owes before the CAP-06 rewrite is written.

**This is what B3 is for.** No read touches a `WITH CHECK`, and no diff of a
policy body would have said `42P17`.

### F2 — `RETURNING` would have measured the read policy inside the write matrix

Postgres applies the `SELECT` policy to a `RETURNING` clause. The obvious way
to get an affected-row count out of the query endpoint —
`with probe as (insert … returning 1) select count(*) from probe` — would
therefore report `42501` for a row a `WITH CHECK` **allowed** but a `USING`
hid. The probes use a plpgsql block with `GET DIAGNOSTICS` instead, which reads
the count without asking to see anything. Verified: both forms were run against
`venues`, and the DO form returns `ok:1` / `ok:0` / `42501` correctly.

### F3 — the Supabase query endpoint returns the *last non-empty* result set

Not the last statement, and not the first. A bare `INSERT` inside the persona
transaction returns the **`set_config` row** — which carries the claims JSON,
and therefore the subject uuid. Two consequences, both now in the code: the
probe body always ends in a statement that returns exactly one row
(`select current_setting(…)`), so an affected count of `0` can never be
confused with a fall-through; and the claims statement is written
`select set_config(…) is not null`, reducing it to a boolean so a subject uuid
cannot come back in a response at all.

### F4 — `information_schema` is empty under the read-only role

Under `read_only: true` the endpoint runs as `supabase_read_only_user`, and
`information_schema.table_constraints` filters by privilege — **zero** rows.
The plan specified `information_schema.key_column_usage` for the primary-key
lookup; written that way it would have reported "no primary key" for all 20
tables and refused, for entirely the wrong reason. The lookup reads
`pg_catalog`. Recorded as **D-32-B** because any later plan reading schema
metadata through this endpoint will hit the same wall.

### F5 — no user trigger exists on any public table, so a rollback really is enough

Checked before the first write probe was designed, because a trigger that sent
mail or called a webhook would **not** be undone by a rollback — and
`event_parties` carries `venue_reveal_email_sent`. Measured:
`pg_trigger` where `not tgisinternal` over `public` returns **none**; the
installed extensions are `pg_stat_statements`, `pgcrypto`, `plpgsql`,
`supabase_vault`, `uuid-ossp` — **no `pg_net`**, no `supabase_functions`. The
venue-secrecy invariant is therefore untouched by this plan: no probe can move
`venue_reveal_sent`, and no update column in `PROBE_PAYLOADS` is a monotone
guard.

### F6 — a `42501` here is unambiguously an RLS refusal

`anon` and `authenticated` hold `SELECT`, `INSERT`, `UPDATE` and `DELETE`
grants on all 20 tables, so a missing table grant can never be mistaken for a
policy denial. Measured with `has_table_privilege` across the full set.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] the primary-key lookup could not use `information_schema`**

- **Found during:** Task 1
- **Issue:** the plan specifies `information_schema.key_column_usage`. That
  view, joined to `table_constraints`, returns zero rows for
  `supabase_read_only_user`, which is who the endpoint is under `read_only`.
  The harness would have refused all 20 tables as unkeyed.
- **Fix:** read primary keys from `pg_constraint` / `pg_attribute`, with the
  reason written beside the query so nobody "simplifies" it back.
- **Commit:** `66a2d7f`

**2. [Rule 1 — Bug] foreign keys resolved inside the persona transaction would have destroyed the matrix**

- **Found during:** Task 2
- **Issue:** the plan says to satisfy foreign keys by "selecting an existing id
  from the referenced table inside the same transaction". That sub-select runs
  under the impersonated persona's **read** policies, so `master` would insert
  against a real event while `member` inserted against `NULL`. The cells would
  stop being comparable across personas, and a read-policy change would surface
  as a write-policy change.
- **Fix:** references are resolved **once**, before any probe, with a
  privileged read-only query, and embedded as literals. Every persona probes
  the same row. The literals are `registerSecret()`-ed and never written.
  Where the referenced table is empty the nil uuid is used and the insert fails
  `23503` — the exact outcome the plan predicted, reached a safer way.
- **Commit:** `13904b2`

**3. [Rule 1 — Bug] `RETURNING` would have folded the read policy into the write matrix**

- **Found during:** Task 2 — see finding F2.
- **Fix:** a plpgsql block with `GET DIAGNOSTICS`.
- **Commit:** `13904b2`

**4. [Rule 2 — Missing critical functionality] a non-SQL failure must abort, not become a cell**

- **Issue:** a probe that fails for a non-database reason — a 500, a dropped
  connection — would have been recorded as a refusal. An unreachable API would
  then look like a database that denies, which is precisely the silent failure
  `meta-gates.md` forbids.
- **Fix:** only an HTTP 400 carrying a parseable SQLSTATE becomes a result.
  Anything else is rethrown and aborts the capture, and clause 2 still runs in
  the `finally`.
- **Commit:** `13904b2`

**5. [Format] `vacuous` and `absent` in the same row shape**

The plan declares the B2 row as `{persona, table, count, pk_md5, vacuous}` and
separately requires absent personas be "recorded, never omitted". An absent
persona has no count, so its row carries `count: null`, `pk_md5: null` and
`vacuous: true` — a null count proves nothing, which is the definition of
vacuous. The declared shape is unchanged, and B2's single trailing key,
`personas`, states resolution explicitly so absence is read rather than
inferred from nulls. B3 does the same with `result: "absent"`.

**6. [Format] `ok:0` on a globally empty table is inconclusive**

D-19 marks a result outside `{ok:*, 42501}` as inconclusive. An `UPDATE` or
`DELETE` returning `ok:0` on a table that holds **no rows at all** deserves the
same treatment for the same reason: nothing was there to refuse. An `ok:0` on a
table that *does* hold rows is the opposite — that is a policy filtering every
row, and it is conclusive. The row count used for the distinction is the
privileged pre-run count, not a persona-filtered one.

### Execution-environment note, not a code change

This plan ran in a git worktree, which holds no gitignored file. `.env.local`
and `node_modules` were symlinked in from the main checkout for the duration
and **both symlinks were removed before the SUMMARY commit**. Both paths are
gitignored; neither was ever staged. Same handling as plan 32-01.

### Tooling note, worth writing down

`perl -0pi -e` sets `$/` to a **NUL byte**, so a `$/` written into a
replacement string is interpolated as `\0` rather than left literal. One such
byte landed in `scripts/rls-baseline.mjs` during a mutation, and the visible
symptom was that `grep` silently reported no matches for text that was plainly
in the file — because grep had reclassified it as binary. Found by scanning for
control bytes, repaired, and `node --check` plus a byte-identical re-capture
confirm the file is clean. `CLAUDE.md` Guardrail 6 already fixes macOS/BSD
tooling; this is the same class of trap one level down.

## No artefact was committed

Deliberate, and it is the plan's instruction: the first committed capture is
plan `32-04`, against both targets. `32-BASELINE-reads.json` and
`32-BASELINE-writes.json` were written, verified, compared and **deleted**
before this commit. `git status` shows `baseline/` holding only B4, which
plan 32-02 wrote.

## What this does not cover

- **Seven of the eleven personas are `absent` on production.** Every
  `organizer` row and every non-`approved` row is missing, and
  `organizer/pending` is exactly where P1 and P3 disagree. The resolver and the
  payload table are ready for them; only plan `32-04`'s seeded container can
  supply them, and `32-VALIDATION.md` § *Known blocking dependency* still
  records Docker availability as **unverified**. This plan did not verify it.
- **71 of 240 real cells are inconclusive**, and 191 of 220 read cells are
  vacuous. Production is nearly empty — thirteen of the twenty tables hold no
  rows — so most of the matrix proves nothing on this target. That is measured
  and marked rather than hidden, which is the difference between a baseline and
  a green screen, but it is not coverage. Coverage is 32-04's job.
- **B3 does not prove a policy is correct.** It records what the database
  answered. `42P17` on `profiles` is a faithful recording of a defect, not an
  endorsement of it.
- **Nothing was compared.** Both artefacts are captures. The whitelist and the
  before/after comparison belong to later plans.

## Self-Check: PASSED

- `scripts/rls-baseline.mjs` — FOUND
- `.planning/phases/32-capability-model-in-the-database/deferred-items.md` — FOUND
- commit `66a2d7f` — FOUND
- commit `13904b2` — FOUND
- no file deletions in either commit — CONFIRMED
- `STATE.md` and `ROADMAP.md` untouched — CONFIRMED
