---
phase: 32-capability-model-in-the-database
plan: 11
subsystem: capability-model
status: COMPLETE with one CHECKPOINT OUTSTANDING — Task 1 and Task 3 done, Task 2 (CAP-04 demonstration) is owed and cannot be executed by an agent
tags: [cap-01, cap-03, cap-04, cap-06, verification, phase-gate, baseline, checkpoint]
requires:
  - "32-02 — baseline/32-BASELINE-surfaces.md, the pre-phase surface register this plan rebuilds"
  - "32-04 — the committed pre-phase baseline on both targets, and the container harness"
  - "32-05 — scripts/rls-baseline-compare.mjs, the judge"
  - "32-06..32-10 — everything measured, whose numbers this document collects"
provides:
  - "baseline/32-BASELINE-surfaces.post.md — B4 rebuilt from the post-phase code, 34 rows compared"
  - "seven *.final.json artefacts, both targets, all scanned CLEAN"
  - "32-VERIFICATION.md — the phase gate: per-requirement evidence, the owed manual set, the deferred list"
  - "32-VALIDATION.md corrected: unused_index UNPINNED, four requirement rows marked, nyquist_compliant false with the outstanding item named"
  - "deferred-items.md extended from three items to fourteen"
affects:
  - "nothing in src/, nothing in supabase/. This plan changed no product code and applied no migration."
  - "no row was written to production — both rollback clauses reported and passed"
tech-stack:
  added: []
  patterns:
    - "the register rebuilt from the code rather than edited, so a moved predicate cannot survive as a diff nobody reads"
    - "a plan's own expected number reported as measured-false rather than absorbed — the fourth time in this phase"
    - "a document that distinguishes MEASURED from ARGUED from OWED, section by section"
    - "a grep criterion satisfied by moving the wording, never by softening the claim"
key-files:
  created:
    - .planning/phases/32-capability-model-in-the-database/32-VERIFICATION.md
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-surfaces.post.md
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.final.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.final.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.final.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-advisors.final.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.final.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.final.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.final.json
  modified:
    - .planning/phases/32-capability-model-in-the-database/32-VALIDATION.md
    - .planning/phases/32-capability-model-in-the-database/deferred-items.md
decisions:
  - "The CAP-04 checkpoint was NOT approximated and NOT skipped: it is written out as procedure M-01 and reported as OUTSTANDING to the orchestrator. nyquist_compliant stays false. The phase-31 precedent is explicit that a deliberate false beats an unearned true, and 32-11-PLAN.md task 3 provides that branch by name."
  - "32-VALIDATION.md's unused_index pin is REMOVED. It read 14 in the research and 12 the same day with no schema change, because the advisor derives it from pg_stat_user_indexes.idx_scan. A criterion that fails for a reason unrelated to the change teaches people to ignore the check."
  - "The plan's expected x-user- census of 45 is measured false. The loose count is 46 and the reader count is 44; 45 is produced by neither command. Recorded as D-32-N rather than absorbed."
  - "deferred-items.md was extended rather than left at three entries. A file that lists three deferrals when fourteen exist is a second index that has drifted — the exact failure verify-persona check G was written from."
  - "The verification's own opening paragraph tripped its own acceptance grep, twice. The wording moved; the warning stayed. No claim was softened to satisfy a string count."
metrics:
  tasks_completed: 2
  tasks_total: 3
  tasks_outstanding: 1
  commits: 2
  duration: ~2h
  completed: 2026-08-06
---

# Phase 32 Plan 11: The Phase Gate — Three Requirements Green, One Demonstration Owed

**Everything measurable was measured again, on both targets, and nothing moved
that the whitelist does not explain.**

```
container   post-09 → final   B1 67 unchanged · 0 T1 · 0 T2 · 0 unexplained   CAP-03: clean
container   pre     → final   B1  8 unchanged · 14 T1 · 39 T2 · 6 both · 0    CAP-03: clean
production  post-09 → final   B1 67 unchanged · 0 T1 · 0 T2 · 0 unexplained   CAP-03: clean
production  pre     → final   B1  8 unchanged · 14 T1 · 39 T2 · 6 both · 0    CAP-03: clean

auth_rls_initplan 26 → 0 · multiple_permissive_policies 46 unmoved · unindexed_foreign_keys 35 unmoved
```

**The whole-phase B1 tally is identical on both targets**, which is a second,
independent statement that the repository's own SQL reproduces what production is
running.

**Two commits, and one task returned rather than approximated.**

| Hash | What |
|---|---|
| `bcd8f1a` | task 1 — seven `final` artefacts, both targets, and B4 rebuilt |
| `a3174cf` | task 3 — `32-VERIFICATION.md`, `32-VALIDATION.md` corrected, `deferred-items.md` extended |

---

## ⚠️ CHECKPOINT OUTSTANDING — Task 2, the CAP-04 demonstration

**Not done. It cannot be done by an agent, and it was not approximated.**

The plan's Task 2 is a `checkpoint:human-verify` with `gate="blocking"`. It needs
a human, two browser windows, a signed-in `member` account and the Supabase SQL
editor. This executor has no account credentials — the same wall plan 32-08 hit
and recorded — and `private` is deliberately unreachable over the REST API, so
there is no in-product path to the grant table and there is not meant to be.

**What was done instead, and it is not a substitute:**

| | |
|---|---|
| **MEASURED** | `hook_custom_access_token_enabled = false` and `jwt_exp = 3600`, captured in B5 and re-asserted at `final` |
| **MEASURED** | `private.role_capabilities` holds **16** rows, read live from production — the precondition the demonstration asserts at its step 6 |
| **MEASURED** | the two `door.operate` grant rows read `requires_approved = false` **on the applied database**, not only in the migration file |
| **MEASURED** | `private.has_capability` reads `public.profiles` and the grant table at evaluation time (`supabase/migrations/20260807000000_capability_model.sql:209-216`) |
| **MEASURED** | no `src/` file reads a capability from a token — three hits, all three in comments — and no `src/` file reads `access_token` at all |
| **OWED** | **the five timestamps.** The claim is about elapsed time between a write and a reload, and nothing static can express it |

The procedure is written out in full as **M-01** in `32-VERIFICATION.md`, with
the revoke-then-restore ordering the plan's D-35 requires — grant rows are per
role, so *granting* to `member` would widen access for every member for the
length of the demonstration; removing one narrows it and proves the same
immediacy in both directions.

**`nyquist_compliant` stays `false`, with the outstanding item named in the
frontmatter.** `32-11-PLAN.md` task 3 provides that branch by name, and phase 31
set the precedent: a deliberate `false` beats an unearned `true`.

**The orchestrator should put M-01 to the owner.** It is six steps and takes
about two minutes.

---

## Task 1 — what was re-measured

### The seven artefacts

```
$ npm run baseline:rls       -- --phase-point=final     B1 B2 B3 B5, production
$ npm run baseline:container -- --phase-point=final     B1 B2 B3, container
      applied the shim, the base schema and 37 migration files
      seeded 20 tables, 9 profiles, 9/9 role × status cells
      container destroyed, nothing left behind
```

**No row was written to production**, and both safety clauses are reported
separately because satisfying one says nothing about the other:

```
clause 1/2: 240 probe strings end in a rollback and carry no forbidden token
clause 2/2: 20/20 row counts re-read and unchanged after 240 probes
```

### B4 rebuilt — `baseline/32-BASELINE-surfaces.post.md`

Rebuilt from the post-phase code, not edited.

```
rows in the register                                     34
rows whose predicate is character-identical              29
rows converted, with a written equivalence                5
rows whose predicate moved WITHOUT an equivalence         0
files carrying a converted row                            2
inconsistencies in section 7, before / after            3 / 3
```

The five converted rows are the four middleware prefix rules
(`src/lib/supabase/middleware.ts:167`, `:173`, `:180`, `:189`) and one guard
(`src/app/(admin)/admin/newsletter/actions.ts:56`). Each equivalence is stated
against the grant row that makes it true, and the measurement that closes it is
`32-08-SUMMARY.md`'s 40-cell, eleven-persona table.

**Section 2 is not byte-identical and the register says so**: the header block
gained one line — `requestHeaders.delete(CAPABILITY_DIAGNOSTIC_HEADER)` at
`:217` — which deletes the inbound copy of a response-only header, for the same
reason the three `x-user-*` names are deleted. It is not a permission decision
and it does not touch the transport.

### The three inconsistencies, re-observed rather than restated

1. **P1 vs P3.** From `32-BASELINE-writes.container.final.json`, every cell conclusive: `organizer/pending` × `ticket_tiers` `ok:1`, × `venues` `42501`, × `artists` `42501`. **They still disagree.**
2. **Nav vs route on `/admin/scanner`.** `src/lib/rbac/roles.ts:64-72` still `requireApproved: true`; the two `door.operate` grants still `requires_approved = false`, read live.
3. **The dead login parameter.** `src/lib/supabase/middleware.ts:149` writes `redirect`; `src/app/(auth)/login/page.tsx:11` reads `next`.

---

## Findings — three, all reported rather than absorbed

### Finding 1 — the plan's `x-user-` census of 45 is reachable by neither command

`32-11-PLAN.md` task 1 expects **45**, *"down from 46 by exactly one"*. Measured:

| Point | loose `grep -rl 'x-user-'` | reader `grep -rlE '\.get\("x-user-'` |
|---|---|---|
| `3f2ce4d` — B4 written | **46** (pre-registered) | — |
| `cb35ffc` — after wave 5 | **47** — `src/types/database.ts` *names* the header in a doc comment and reads nothing | **45** |
| now | **46** | **44** |

The loose census is unchanged at 46 by a **coincidence of two offsetting
changes**: wave 5 added a mention (+1), plan 32-08 converted a reader (−1). The
reader census fell by exactly one, which answers the question the census was
asked. The plan's 45 mixes the loose pre-registration with the reader series'
decrement.

Same shape as D-32-D (43 that should read 45) and D-32-J (the class-D count).
**This is the fourth plan-arithmetic correction in this phase**, and the pattern
is worth naming: every one of them was a number *derived in prose* rather than
measured, and every one would have been quietly wrong in a committed document.
Recorded as **D-32-N**.

### Finding 2 — a throttled capture loses its own safety assertion

The production B3 capture returned `HTTP 429 ThrottlerException` on two attempts
before succeeding. The important part is not the throttle:

```
clause 1/2: 240 probe strings end in a rollback and carry no forbidden token
60/240 probes sent
✗ B3 — [management-api/query] HTTP 429
```

**`clause 2/2` never printed.** The row-count re-read lives in a `finally`
(`scripts/rls-baseline.mjs:1354-1357`) — and it is itself a query, so the same
throttle that aborted the run also killed the assertion meant to prove the run
was safe.

Nothing could have persisted: clause 1 is asserted over the whole probe list
**before a single byte reaches the network**, and every probe string ends
`rollback;`. But the assertion was not *made*, and making it is the discipline —
this phase has already recorded twice what happens when a check is assumed rather
than watched. Recorded as **D-32-M**; the successful run reports both clauses.

### Finding 3 — the verification's own warning tripped its own acceptance grep, twice

The plan requires `grep -ci 'tests pass'` to return `0`. The document's opening
paragraph said *"nothing below is claimed verified because tests pass"* — a
**denial**, and the grep counted it. The first repair explained the problem and
quoted the command, which contained the literal, and tripped it again.

**A census cannot read a negation.** It is `32-08-SUMMARY.md`'s lesson —
`src/types/database.ts` entering the `x-user-` count by *mentioning* the header —
firing a third time in the same phase, inside the document written to record it.

The wording moved; the warning stayed, and the note explaining why deliberately
does not spell the phrase. **No claim was softened to satisfy a string count.**

---

## What went into `32-VERIFICATION.md`

1,106 lines, **26 `file:line`-shaped citations**, at least one pasted command
output per requirement, and a stated distinction between **MEASURED**, **ARGUED**
and **OWED** in every section.

| Req | Verdict | Load-bearing evidence |
|---|---|---|
| **CAP-01** | ✅ green | `select count(*) from pg_proc … 'has_capability'` → **1**; 0 helper names in 67 policies on **both** targets; `verify:capabilities` 4/4 green on both; three callers at `file:line`; the middleware's round-trip count unchanged (`grep -n 'await supabase'` → two lines) |
| **CAP-03** | ✅ green | four `CAP-03: clean` verdicts; the B4 row-by-row; `ok:1 ≠ 42501` for `organizer/pending`; the census; **and the honest limits** |
| **CAP-04** | ⚠️ structure proved, timing **OWED** | `hook_custom_access_token_enabled = false`, `jwt_exp = 3600`, the live grant table at 16 rows, the function body, two greps — and **M-01 not executed** |
| **CAP-06** | ✅ green | 26 rows referenced from `32-CAP06-REVIEW.md`; advisor 26 → 0; both `EXPLAIN` pairs including the semi-join that changed shape; both write probes |

### The ten debts the orchestrator asked to see, all present

| Debt | Where it landed |
|---|---|
| **D-32-C** — `CLAUDE.md` Guardrail 3 is FALSE (37 / 11, not zero / zero) | § Deferred, **with a new finding: it is wrong in TWO files** — `CLAUDE.md:140` **and** `.claude/rules/supabase-data.md:18`. Not fixed here; the persona needs its own change with the `instruction architecture` gate, a changelog entry and a version bump |
| **`unused_index` pinned at 14** | **corrected.** `32-VALIDATION.md`'s CAP-03 row now unpins it, with the 14 → 12 same-day measurement written beside it |
| **D-32-H** — the PAIR, not either artefact | § CAP-03, as a two-row table with both mutations, plus the third detector 32-10 added |
| **D-32-L** — the check reads the catalogue, not the grants | § Deferred, with the script's own closing note quoted |
| **D-32-K** — the eight keys partition exactly; a Phase 34 CAP-02 risk | § Deferred, **with the reason 32-10's warning cannot surface it** |
| **D-32-A** — the privilege-escalation guard | § Deferred, with the `42P17` table at four phase points, the five probes, and options A–D |
| **D-32-I / D-32-J / D-32-D / D-32-E / D-32-G** | § CAP-06 and § Corrections to plan files |
| **the ten owed manual observations** | § Manual verification procedures — **eleven**, M-01 to M-13, the pending organizer at the door as **M-12** |
| **migration names vs applied versions** | § Operational notes — verified against the live endpoint |
| **the stale `.next`** | § Operational notes |

### The migration-version question, answered rather than flagged

```
GET /v1/projects/{ref}/database/migrations   →  36 entries
  20260806150550  capability_model
  20260806151221  capability_model_fk_index
  20260806154724  policies_to_capabilities
  20260806161753  20260807020000_wrap_auth_uid
```

The **files** are named `20260807000000`, `…000100`, `…010000`, `…020000`. None
of those four versions is in the remote history, so **a future `supabase db push`
would attempt to apply all four again.**

**It would be harmless — but only because every one of the four is idempotent by
construction**, which was checked and not hoped: `CREATE SCHEMA/TABLE IF NOT
EXISTS`, `CREATE OR REPLACE FUNCTION`, `GRANT`/`REVOKE`, `INSERT … ON CONFLICT DO
NOTHING`, `CREATE INDEX IF NOT EXISTS`, and 65 `DROP POLICY IF EXISTS` /
`CREATE POLICY` pairs applied in filename order so the end state is the wrapped
one. **The next file added to that directory does not inherit that property.**

**The larger trap is the fresh rebuild**, and it predates this phase: six of the
twenty tables are created by **no** migration, so `supabase db reset` cannot
build this database at all (`baseline/README.md` § F2).

---

## Deviations from Plan

### Returned rather than executed

**Task 2, the CAP-04 checkpoint.** Reported as OUTSTANDING above and written out
as M-01. The plan's own Task 3 names this branch: *"If the CAP-04 checkpoint was
not run, leave it `false` and say which item is outstanding."* Tasks 1 and 3 were
completed so the phase has its gate document; the demonstration is the owner's
two minutes.

### Auto-fixed

**1. [Rule 1 — a bug in a measurement] the plan's expected census of 45**

- **Found during:** task 1, running the four census commands.
- **Issue:** neither the loose nor the reader command produces 45 at this commit.
- **Fix:** both numbers published with the three-point series that explains them, derived in `baseline/32-BASELINE-surfaces.post.md` § 6. **No code was changed to satisfy a grep.**
- **Commit:** `bcd8f1a`

**2. [Rule 1 — a bug in a document] the verification tripped its own acceptance grep**

- **Found during:** task 3, running the plan's own `<verify>` command.
- **Issue:** the opening warning contained the literal the criterion forbids, inside a denial. The first repair quoted the command and re-introduced it.
- **Fix:** reworded twice, verified at `0`, with a note that itself avoids the phrase. Finding 3 above.
- **Commit:** `a3174cf`

### Done that the plan did not ask for

- **`deferred-items.md` extended from three entries to fourteen.** It listed D-32-A, B and C while eleven more had accumulated in plan SUMMARYs, because parallel executors correctly did not write a shared file. A file that says "three" when the answer is "fourteen" is a second index that has drifted — the exact failure `verify-persona` check G exists for.
- **The live grant table read from production.** The plan cites the migration file for the grant list; reading it from the applied database is strictly stronger, and it produces the `16` that M-01's step 6 asserts as a **pre**-condition rather than only a post-condition.
- **`pg_proc` and `proconfig` read directly** for CAP-01 (i), instead of inferring uniqueness from the migration file.
- **The migration-history question answered**, not just flagged: the endpoint was queried, the four idempotency profiles were checked statement by statement, and the conclusion is written with its reasoning.

### Not done

- **`.planning/STATE.md` and `ROADMAP.md`** — untouched by instruction; they belong to the orchestrator. Everything that would have gone there is in this file.
- **`CLAUDE.md` and `.claude/rules/supabase-data.md`** — untouched. D-32-C is a persona change and needs its own gates (`ai-engineering.md`, gate *instruction architecture*), which is precisely why it is deferred rather than done in passing.
- **No product code, no migration, no `src/`, no `supabase/`.** This plan wrote no SQL that survives a run and changed no TypeScript.
- **The four inherited helpers** — still `SECURITY DEFINER` in `public` without `search_path`, still callable by `anon`. Measured on the final advisor capture; raised, not taken.

---

## Threat Flags

None. This plan opens no network endpoint, adds no auth path, changes no schema
and touches no trust boundary. It reads system views and one private table
read-only and writes documents.

The plan's own register, with what closed each row:

| Threat | Closed by |
|---|---|
| **T-32-11-01** the CAP-04 demonstration widening access for every member while it runs | D-35 honoured in the written procedure: it **revokes** first and restores, so the window narrows rather than widens, and step 6 asserts 16 rows. **The demonstration has not run**, so the risk has not been taken either |
| **T-32-11-02** the demonstration leaving the grant table altered | the table was read at **16** rows at the gate, before anything, so the pre-condition is on the record. `verify:capabilities` is 4/4 green |
| **T-32-11-03** a verification document that asserts without evidence | 26 `file:line`-shaped citations, a pasted output per requirement, `grep -ci 'tests pass'` → **0**, and `nyquist_compliant` left `false` because one item was not executed |
| **T-32-11-04** timestamps, account names or addresses in a published document | the document names **roles and files**, never a person, an email or a uuid. All ten committed files scanned against eight live secret values plus uuid- and email-shaped patterns: **10/10 CLEAN** |
| **T-32-11-SC** npm installs | **nothing was installed.** This phase installed no package, and the verification states it |

---

## Manual verification procedure (there is no test runner)

The full set is **§ Manual verification procedures** in `32-VERIFICATION.md` —
M-01 to M-13, all owed. To re-confirm *this plan's* work, which is measurement
rather than behaviour:

1. `npm run baseline:container -- --phase-point=check` → must apply **37**
   migration files and capture B1, B2, B3.
2. `npm run baseline:compare -- --target=container --only=B1,B2,B3 --before-point=final --after-point=check`
   → **`CAP-03: clean`**, B1 reading `67 unchanged · 0 by T1 · 0 by T2`.
   **Anything else means something moved after the phase closed.**
3. In that output find `organizer/pending` × `ticket_tiers` and × `venues`.
   → `ok:1` and `42501`. **If those two ever agree, the two organizer shapes have
   been collapsed and a pending organizer can write the catalogue.** That is the
   one check that cannot be replaced by reading a file.
4. `npm run baseline:rls -- --phase-point=check` → four artefacts, and the run
   must report **both** clauses. If only `clause 1/2` prints, the API throttled
   and the row-count assertion was not made — re-run it (D-32-M).
5. `npm run baseline:compare -- --before-point=final --after-point=check --expect-initplan=0`
   → **`CAP-03: clean`**, `multiple_permissive_policies` **46** and
   `unindexed_foreign_keys` **35** unmoved. `unused_index` **may move and is not
   pinned** — that is this plan's correction, and treating a move there as a
   defect is the mistake it removes.
6. `npm run verify:capabilities` → `4/4 green, 0 warnings`,
   `TS 8 · DB 8 · POLICY 4 · SRC 4`.
7. `rm -rf .next && npm run build` → green. **The `rm -rf` is not optional**: a
   stale cache produced a false failure in this phase.

**What must be observed:** two `CAP-03: clean` verdicts, `ok:1 ≠ 42501` on the
pending organizer, both rollback clauses, 46 and 35 unmoved, `4/4 green`, and a
green build.

**What this procedure cannot tell you:** whether a permission is *right*. It
tells you nothing moved. And it cannot tell you anything about CAP-04's timing —
that is M-01, and it is owed.

---

## Self-Check: PASSED

```
$ [ -f .planning/…/32-VERIFICATION.md ]                              FOUND (1106 lines)
$ [ -f baseline/32-BASELINE-surfaces.post.md ]                       FOUND
$ [ -f baseline/32-BASELINE-policies.final.json ]                    FOUND
$ [ -f baseline/32-BASELINE-reads.final.json ]                       FOUND
$ [ -f baseline/32-BASELINE-writes.final.json ]                      FOUND
$ [ -f baseline/32-BASELINE-advisors.final.json ]                    FOUND
$ [ -f baseline/32-BASELINE-policies.container.final.json ]          FOUND
$ [ -f baseline/32-BASELINE-reads.container.final.json ]             FOUND
$ [ -f baseline/32-BASELINE-writes.container.final.json ]            FOUND
$ git log --oneline --all | grep -c bcd8f1a                          1  (FOUND)
$ git log --oneline --all | grep -c a3174cf                          1  (FOUND)
$ git diff --diff-filter=D --name-only HEAD~1 HEAD  (each commit)    (empty — no deletions)

$ grep -c 'file:line\|\.ts:[0-9]\|\.sql:[0-9]'  32-VERIFICATION.md   26
$ grep -ci 'tests pass'                          32-VERIFICATION.md   0
$ grep -c '32-BASELINE-'                         32-VERIFICATION.md   11
$ grep -c '32-CAP06-REVIEW'                      32-VERIFICATION.md   3
$ grep -c 'nyquist_compliant'                    32-VALIDATION.md     1  (false)
$ rows counted in 32-CAP06-REVIEW.md's table                         26

$ compare container  post-09 → final                                 CAP-03: clean
$ compare container  pre     → final                                 CAP-03: clean
$ compare production post-09 → final  --expect-initplan=0            CAP-03: clean
$ compare production pre     → final  --expect-initplan=0            CAP-03: clean
$ npm run verify:capabilities -- --target=container                  4/4 green, 0 warnings
$ rm -rf .next && npm run build                                      green
$ npm run lint                                        21 errors / 108 warnings — ALL PRE-EXISTING
$ uuid / email / 8 live secret values, all 10 committed files        10/10 CLEAN
```

- **`STATE.md` and `ROADMAP.md` untouched — CONFIRMED.** The name-only diff of both commits is nine `.planning/phases/32-…` files and nothing else.
- **No product code changed — CONFIRMED.** `git diff --name-only eaa849f HEAD` touches nothing under `src/` or `supabase/`.
- **No row written to production — CONFIRMED**, and asserted rather than assumed: `clause 1/2: 240 probe strings end in a rollback` and `clause 2/2: 20/20 row counts re-read and unchanged after 240 probes`.
- **No stubs.** This plan created two documents and seven captured artefacts; it introduced no code path, no placeholder and no TODO.
- **The `node_modules` and `.env.local` symlinks** used for the captures and the build were removed before this SUMMARY was committed. Both paths are gitignored and neither was ever staged; `git status --short` showed only tracked files at every commit.
- **One task is outstanding and is reported as outstanding**, in the frontmatter, in `32-VERIFICATION.md`'s frontmatter, in its sign-off, and at the top of this file. Nothing about it is implied.
