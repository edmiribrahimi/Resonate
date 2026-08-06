---
phase: 32-capability-model-in-the-database
plan: 05
subsystem: evidence-harness
tags: [rls, baseline, cap-03, comparator, whitelist, mutation-proof, advisors]
requires:
  - "32-01 — scripts/rls-baseline.mjs, the reporter and the exit contract this file copies"
  - "32-03 — B2 and B3, the rollback_guarantee trailing key this comparator re-asserts"
  - "32-04 — the committed pre-phase baseline on both targets; the vacuity rule; findings F1–F6"
provides:
  - "scripts/rls-baseline-compare.mjs — the B1/B2/B3/B5 comparator and the two-transformation whitelist"
  - "npm run baseline:compare — one entry point, four artefacts, one verdict, one exit code"
  - "the capability-to-policy mapping as a by-product, derived from the applied database"
  - "the two standing configuration invariants asserted on every run, not only at the phase gate"
affects:
  - "package.json (one scripts entry)"
  - "nothing under src/ and nothing under supabase/ — this plan adds no product code and no DDL"
tech-stack:
  added: []
  patterns:
    - "generate-and-match: the before predicate is expanded through the whitelist and the after must match exactly, with the capability key as the only free variable"
    - "a report whose tick is earned per artefact — no ✓ printed next to a defect list"
    - "an expectation the caller must state (--expect-initplan) rather than a default the tool assumes"
    - "an escape hatch that costs a command-line flag (--allow-lint-move), so an intended movement lands in the record"
key-files:
  created:
    - scripts/rls-baseline-compare.mjs
  modified:
    - package.json
decisions:
  - "T2's five legal left-hand sides are enumerated in Postgres's RE-PRINT form, not in migration-source form. pg_policies re-prints the parsed expression: `(SELECT public.is_admin_or_organizer())` is stored and returned as `( SELECT is_admin_or_organizer() AS is_admin_or_organizer)`. Comparing source against re-print would have reported a defect on all 67 rows"
  - "`unused_index` is not pinned. It is derived from pg_stat_user_indexes.idx_scan and moved 14 → 12 on a single day with no schema change. It is reported as a movement with that reason printed beside it"
  - "Every OTHER advisor lint movement is a defect until the caller names it with --allow-lint-move, so an intended movement is stated rather than absorbed"
  - "42P17 and 42501 are kept as different facts (D-32-A). A comparator that normalised both to `denied` would hide exactly the change the owner still owes a decision on"
  - "`ok:1` → `ok:0` is reported as a narrowing-without-an-error, because on an UPDATE or DELETE it is the USING clause matching a different row set and no SQLSTATE is raised either way"
  - "rls_enabled_tables is compared: a table whose RLS is switched off keeps every policy row and enforces none of them, and B1's rows alone would show nothing"
metrics:
  tasks: 2
  commits: 3
  duration: ~70 min
  completed: 2026-08-06
---

# Phase 32 Plan 05: The Comparator, and the Whitelist That Has Exactly Two Entries — Summary

CAP-03 now has a mechanical verdict instead of an opinion. `npm run
baseline:compare` reads the committed pre-phase baseline and a later capture
and answers one question per artefact — **did anything move that the whitelist
does not explain?** — with a defect list and an exit code.

**Thirteen mutations were made to fire, and each was asserted as applied before
its result was read.** A fourteenth proof runs in the other direction: the
whole phase simulated at once, all 67 policies rewritten, explained with zero
unexplained.

## What was built

| File | What it is |
|---|---|
| `scripts/rls-baseline-compare.mjs` | 1163 lines. Structural comparison first, predicates second, four artefacts, one verdict. Three `node:` imports, zero `process.env`, no write path |
| `package.json:13` | `"baseline:compare": "node scripts/rls-baseline-compare.mjs"` |

Exit codes match the rest of the harness: `0` clean, `1` a defect, `2` a wrong
environment or a wrong invocation.

## Task 1 — the B1 comparator and its whitelist

**The baseline compared against itself, which is the plan's verify command:**

```
$ npm run baseline:compare -- --before=…/32-BASELINE-policies.json \
                             --after=…/32-BASELINE-policies.json --only=B1
  ✓ B1 — 67 policies, every difference explained by the whitelist
      67 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained
      67 roles/permissive pairs compared · policy_count 67 · rls_enabled_tables 20
CAP-03: clean                                                        exit=0
```

### The seven mutations the plan asked for

Each produced by `mutate-b1.mjs`, which **refuses to hand on a mutation it
cannot confirm it applied** (`ai-engineering.md`, gate *prova per mutazione*).
The `MUTATION APPLIED` line is the assertion; the comparator output is the
result read afterwards.

**M1 — one `auth.uid()` hand-wrapped → T1, exit 0, policy named**

```
MUTATION APPLIED — m1: attendances_select_own.qual
  "(auth.uid() = user_id)" -> "(( SELECT auth.uid() AS uid) = user_id)"

  ✓ B1 — 66 unchanged · 1 by T1 · 0 by T2 · 0 by both · 0 unexplained
      transformed, policy by policy:
        T1     attendances.attendances_select_own (SELECT)          exit=0
```

**M2 — P1 replaced by a capability call → T2, exit 0, key listed**

```
MUTATION APPLIED — m2: attendances_all_admin.qual
  "( SELECT is_admin_or_organizer() AS is_admin_or_organizer)"
  -> "( SELECT private.has_capability('staff.manage'::text) AS has_capability)"

  ✓ B1 — 66 unchanged · 0 by T1 · 1 by T2 · 0 by both · 0 unexplained
      capability → policy, derived from the applied database:
        staff.manage   P1  attendances.attendances_all_admin (ALL qual)   exit=0
```

**M3 — the same predicate replaced by `true` → `predicate_unexplained`**

```
MUTATION APPLIED — m3: attendances_all_admin.qual "( SELECT is_admin_or_organizer() …)" -> "true"

  ✗ predicate_unexplained — attendances.attendances_all_admin (ALL) qual
      before: (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
      after : true
      Not reachable by T1 or T2. …                                  exit=1
```

**M4 — one policy row deleted → `policy_dropped`**

```
MUTATION APPLIED — m4: rows 67 -> 66, venues.venues_delete_master removed
  ✗ policy_dropped — venues.venues_delete_master (DELETE)           exit=1
```

**M5 — one extra policy row → `policy_added`** (and `supporting_count_changed`,
because the mutation moved `policy_count` too — both were expected and both
fired)

```
MUTATION APPLIED — m5: rows 67 -> 68, venues.venues_select_everyone_mutation added
  ✗ policy_added — venues.venues_select_everyone_mutation (SELECT)
  ✗ supporting_count_changed — policy_count  67 → 68                exit=1
```

**M6 — one `policyname` changed → `policy_renamed`**

```
MUTATION APPLIED — m6: tickets.tickets_select_own -> tickets.tickets_select_mine
  ✗ policy_renamed — tickets.tickets_select_own (SELECT)
      renamed to "tickets_select_mine". D-24: … B1 joins on
      policyname, so a rename destroys the comparison rather than appearing in it.
                                                                    exit=1
```

**M7 — `event_media_insert_member` loses `TO authenticated` → `roles_changed`**

```
MUTATION APPLIED — m7: event_media_insert_member.roles ["authenticated"] -> ["public"]
  ✗ roles_changed — event_media.event_media_insert_member (INSERT)  exit=1
```

### An eighth proof the plan did not ask for — the whole phase at once

The seven above are single-fault. The interesting failures are combinatorial
and live in three policies: `profiles_update_own` (class E, **four**
`auth.uid()` occurrences) and the two `event_parties` policies (class D, a P1
fragment **plus** two `auth.uid()` occurrences, one of them inside a
*correlated* `EXISTS`). A comparator that passed the seven and choked here
would be useless on the day it matters.

So the entire rewrite was simulated — every `auth.uid()` wrapped, every P1–P5
fragment replaced — and the mutation refused to hand on a half-applied result:

```
MUTATION APPLIED — full rewrite: 45 capability replacements, 25 auth.uid() wraps,
  0 rows still carrying a bare auth.uid(), 0 rows still naming a helper function

  ✓ B1 — 8 unchanged · 14 by T1 · 39 by T2 · 6 by both · 0 unexplained    exit=0
```

45 = 34 P1 + 3 P2 + 4 P3 + 2 P4 + 2 P5. **Five distinct predicates behind the
catalogue**, which is `32-PATTERNS.md`'s warning sign satisfied rather than
tripped: *"a capability catalogue with fewer than five distinct predicates
behind it has collapsed one of these five."*

The run also emitted the capability-to-policy mapping — 45 rows, grouped by key
— **derived from the applied database rather than hand-maintained**, which is
what the phase gate needs.

## Task 2 — the read, write and advisor comparators

```
$ npm run baseline:compare -- --only=B1,B2,B3,B5 --before-dir=… --after-dir=… \
                              --expect-initplan=unchanged
  ✓ B1 — 67 policies …
  ✓ B2 — 220 cells compared · 4/11 personas resolved on this target
  ✓ B3 — 660 cells compared
  ✓ auth_rls_initplan unchanged at 26, as stated
  ✓ hook_custom_access_token_enabled still false — CAP-04 reads live, not from the token
  ✓ db_schema still "public,graphql_public" — the private schema stays unreachable (D-06)
CAP-03: clean                                                        exit=0
```

The container target passes the same way, and its numbers reproduce
`baseline/README.md` exactly — which is the evidence the comparator is reading
the artefacts the way the capture wrote them:

| | production | container |
|---|---|---|
| personas resolved | **4/11** | **11/11** |
| B2 vacuous | **172/220 (78.2%)** | **0/220 (0.0%)** |
| B3 inconclusive after a probe ran | **71** | **19** |

### How much of the agreement is worth nothing, said out loud

```
  measurements — these belong in 32-VERIFICATION.md, not only on this screen:
    B2 vacuous fraction: 172/220 (78.2%) agreed with a count of zero on a globally
      empty table — that agreement has nothing to do with a policy…
    B3 proves nothing on 491/660 cells (74.4%): 420 where the persona does not exist
      on this target and no probe was ever sent, and 71 where a probe ran but a
      constraint — not a policy — answered.
      169 of 660 cells carry real evidence.
```

**B3's two causes are split rather than summed.** 420 cells where no probe was
ever sent and 71 where a probe ran and a constraint answered are not the same
kind of nothing, and adding them would flatter the target that has fewer
personas. On the container the same line reads `19/660 (2.9%) … 641 of 660
cells carry real evidence`.

### The six mutations the plan asked for

**N1 — one `pk_md5` changed on a cell that holds rows → names persona and table**

```
MUTATION APPLIED — n1: anon × artists: count stays 7,
  pk_md5 0c19595889aed6a9c26a35e94c28cd30 -> ffffffffffffffffffffffffffffffff

  ✗ b2_fingerprint_changed — anon × artists
      count unchanged at 7, but the primary-key fingerprint moved …
      The policy shows a different set of rows, not a different number of them.
                                                                    exit=1
```

**N2 — `42501` → `ok:1`, the exact shape of a widening**

```
MUTATION APPLIED — n2: anon × artists × insert: 42501 -> ok:1
  ✗ b3_result_changed — anon × artists × insert
      WIDENING — the database refused this write before and permits it now.
      This is the exact shape CAP-03 forbids.                        exit=1
```

**N3 — `ok:1` → `ok:0`, the exact shape of a narrowing**

```
MUTATION APPLIED — n3: master/approved × artists × delete: ok:1 -> ok:0
  ✗ b3_result_changed — master/approved × artists × delete
      NARROWING WITHOUT AN ERROR — … it now affects 0 rows instead of 1. On an
      UPDATE or a DELETE that is the USING clause matching a different set of rows.
      No SQLSTATE is raised either way, so this is the change a permitted-vs-refused
      comparison would wave through.                                 exit=1
```

**N4 — `multiple_permissive_policies` 46 → 45**

```
MUTATION APPLIED — n4: multiple_permissive_policies 46 -> 45
  ✗ b5_pinned_lint_moved — multiple_permissive_policies
      … Movement means the policy SET was restructured rather than its predicates
      replaced — which is the failure the independent oracle exists to catch.
                                                                    exit=1
```

**N5 — `hook_custom_access_token_enabled` set to `true`, message naming CAP-04**

```
MUTATION APPLIED — n5: hook_custom_access_token_enabled false -> true
  ✗ b5_auth_hook_enabled — hook_custom_access_token_enabled
      is true, expected false. CAP-04 promises a grant takes effect on the NEXT
      REQUEST with no session or token refresh. A custom access-token hook puts the
      answer inside the JWT, where it lives until the token expires — 3600 seconds
      of stale authority.
      CAP-04 would break silently: nothing would error, grants would simply arrive late.
                                                                    exit=1
```

The `3600` is read from the artefact's own `jwt_exp`, so the message states the
real window rather than a round number.

**N6 — `--expect-initplan=0` against a capture still reporting 26**

```
MUTATION APPLIED — n6: auth_rls_initplan left at 26 deliberately — the mutation is
  the stated expectation, not the artefact

  ✗ b5_initplan_unexpected — auth_rls_initplan
      26 → 26, but --expect-initplan=0 was stated. …                exit=1
```

**And the default, which is that there is none:**

```
$ node scripts/rls-baseline-compare.mjs --only=B5 --before=… --after=…
FATAL: comparing B5 requires --expect-initplan=26|0|unchanged.
The same comparator runs after the model migration (where 26 is still correct) and
after the wrap migration (where 0 is required).
Stating which one you expect is the whole point; guessing it would turn the oracle
into a rubber stamp. Nothing was compared.                           exit=2
```

### Three more mutations, added because the plan's list had holes

**N3b — `42P17` → `42501` (D-32-A)**

```
MUTATION APPLIED — n3b: anon × profiles × update: 42P17 -> 42501
  ✗ b3_result_changed — anon × profiles × update
      the SQLSTATE changed. Two refusals are not the same fact: 42P17 (recursion)
      and 42501 (denied) are different behaviours, and collapsing them would hide
      exactly the change D-32-A leaves to the owner.                 exit=1
```

This is the carried-forward instruction proved rather than promised. Nothing in
the comparator normalises a SQLSTATE.

**N7 — `unused_index` 12 → 14 must be REPORTED, never a defect**

```
MUTATION APPLIED — n7: unused_index 12 -> 14
  ✓ auth_rls_initplan unchanged at 26, as stated
      unused_index 12 → 14 — not pinned: derived from pg_stat_user_indexes.idx_scan
      — moves with database use, not with schema (baseline/README.md, finding F3)
CAP-03: clean                                                        exit=0
```

**N8 — an ungoverned lint moves: a defect until the caller states it**

```
MUTATION APPLIED — n8: function_search_path_mutable 13 -> 14
  ✗ b5_lint_moved — function_search_path_mutable
      13 → 14. Every advisor movement needs an explanation. If this one is intended,
      state it: --allow-lint-move=function_search_path_mutable, and write the reason
      into 32-VERIFICATION.md. A comparator that guesses is a comparator that excuses.
                                                                    exit=1

# the same copy, with the expectation stated on the command line
$ … --allow-lint-move=function_search_path_mutable
      function_search_path_mutable 13 → 14 — allowed by --allow-lint-move=…
CAP-03: clean                                                        exit=0
```

`function_search_path_mutable` is not an arbitrary choice: a new
`SECURITY DEFINER` function without a pinned `search_path` is exactly what this
phase could add, and it is a security lint.

**N9 — vacuity flips while count and fingerprint hold still**

```
MUTATION APPLIED — n9: anon × attendances: count stays 0, pk_md5 untouched,
  vacuous true -> false

  ✗ b2_vacuity_changed — anon × attendances
      … That is not a policy change — it is the two captures no longer measuring the
      same database, which is worse, because it invalidates every other cell's
      agreement.                                                     exit=1
```

This is the case the carried-forward brief flagged: a vacuous cell becoming
conclusive is **not** a widening. It is named for what it actually is — a data
change — rather than mislabelled in either direction.

### The environment guards (exit 2)

Each exercised:

```
production before vs container after   → FATAL: … "management-api" … "postgres-container".
                                          Those are two databases, not two moments.     exit=2
B1 file vs B2 file                     → FATAL: … declares artefact "B2", not B1.        exit=2
--only=B5 --target=container           → FATAL: B5 … has no container equivalent.        exit=2
a missing artefact file                → FATAL: the before B1 artefact does not exist …  exit=2
--pretend-it-passed                    → FATAL: unknown flag …                            exit=2
```

### T-32-05-01 proved mechanically, not asserted

```
$ grep -cE 'writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync|createWriteStream|fetch\(|execSync|spawnSync' \
    scripts/rls-baseline-compare.mjs
       1
$ grep -nE 'writeFileSync|…' scripts/rls-baseline-compare.mjs
14: * this file — no `writeFileSync`, no `mkdirSync`, no `fetch`.
$ grep -c 'process\.env' scripts/rls-baseline-compare.mjs
       0
$ grep -nE '^import ' scripts/rls-baseline-compare.mjs
78: import { existsSync, readFileSync } from 'node:fs';
79: import { dirname, relative, resolve } from 'node:path';
80: import { fileURLToPath } from 'node:url';
```

**The single match is the comment that makes the claim** — `32-03`'s
forbidden-token pattern applied to this file. The comparator has no write path,
reads no environment variable, and imports three node built-ins. D-25 is a
property of the file, not a promise in a docblock.

## Findings

### F1 — the plan's whitelist is written in SQL source; B1 holds Postgres's re-print

`pg_policies` returns the **parsed** expression re-printed, not the text the
migration wrote. Measured on the committed baseline:

| Migration source | What B1 actually holds |
|---|---|
| `(SELECT public.is_admin_or_organizer())` | `( SELECT is_admin_or_organizer() AS is_admin_or_organizer)` |
| `(SELECT public.get_user_status()) = 'approved'` | `(( SELECT get_user_status() AS get_user_status) = 'approved'::text)` |

Schema qualifier resolved away, an alias appended, whitespace changed, a
`::text` cast added. D-23 enumerates the five left-hand sides in the first
column's form. **A comparator built from that column would have reported a
defect on all 67 rows** — and, worse, would have looked like a working
comparator until the first real capture.

The enumeration is written in the second column's form, verified against the
committed artefact. The same fact governs the right-hand sides, so the
comparator accepts **exactly two** renderings of each — the literal source form
and Postgres's re-print — and nothing else. If Postgres ever emits a third
shape, the run fails as `predicate_unexplained`: loudly, in the safe direction.

### F2 — 20 policies carry a `TO` clause, not one

The plan states *"`event_media_insert_member` is the one policy in the set
carrying `TO authenticated`, so the column is not decorative."* Measured:

```
$ # rows whose roles are not exactly ["public"]
20
```

`drink_items` (4), `event_media` (7), `ticket_tiers` (3), `tickets` (2),
`drink_tokens` (2), `drink_orders` (1), `pending_purchases` (1). The plan's
conclusion is right and its count is not — the column is **less** decorative
than it supposed. `roles`, `permissive` and `schemaname` are compared on every
surviving triple, not on one.

### F3 — one predicate looks like the whitelist and is not

`event_media_select_approved` reads `(status = 'approved'::text)`. It is one
character-class away from P5 and it is **not a capability**: it tests the
**row's own** `status` column, not the caller's membership status. It is
deliberately absent from the enumeration, and the reason is written into the
file's header rather than left to be rediscovered.

This is the concrete form of `32-PATTERNS.md`'s warning: the way to collapse
five predicates into four is to match on something that reads the same.

### F4 — `npm run lint` fails on pre-existing issues, none of them this plan's

`npm run lint` exits 1 on `public/sw.js` (generated by Serwist) and on several
files under `src/` — `SumUpCardWidget.tsx` (three `react-hooks/refs` errors),
`TransactionList.tsx` (three `no-explicit-any`), and others. **All in files
this plan never opened.**

```
$ npx eslint scripts/rls-baseline-compare.mjs
(no output)
```

Not fixed: out of scope. **Not written into `deferred-items.md` either**, and
that is deliberate — this plan ran in a worktree alongside other agents of the
same wave, `deferred-items.md` is a shared phase file, and `ai-engineering.md`'s
gate *multi-agent* says two agents touching the same file must be sequenced,
not parallelised. Recorded here instead, where it cannot collide. The phase
verifier should carry it forward.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] the whitelist was specified in a form the artefact does not contain**

- **Found during:** Task 1, before writing the enumeration — the distinct
  predicates were dumped from the committed B1 first.
- **Issue:** finding F1. D-23's five left-hand sides are migration source; B1
  holds Postgres's re-print.
- **Fix:** the enumeration is written in the re-print form, verified against the
  artefact, with the discrepancy and its evidence in the file's header.
- **Commit:** `b5748e0`

**2. [Rule 1 — Bug] the `TO`-clause claim was wrong by a factor of twenty**

- **Issue:** finding F2.
- **Fix:** `roles`, `permissive` and `schemaname` compared on every surviving
  triple.
- **Commit:** `b5748e0`

**3. [Rule 2 — Missing critical functionality] `rls_enabled_tables` was not being compared**

- **Issue:** a table whose RLS is switched off keeps **every** policy row and
  enforces **none** of them. B1's 67 rows would be byte-identical and the
  comparator would say `clean` on the largest possible widening.
- **Fix:** `supporting_counts.policy_count` and `rls_enabled_tables` are
  compared, with the reason written beside the check.
- **Commit:** `b5748e0`

**4. [Rule 2 — Missing critical functionality] the after capture's own safety clauses were not re-asserted**

- **Issue:** B3 carries a `rollback_guarantee` trailing key. A probe run whose
  rollbacks did not hold, or whose row counts moved, is not evidence of
  anything — and its 660 cells would have been compared as if they were.
- **Fix:** `every_string_ends_in_rollback` and `row_counts_unchanged` are
  asserted on the after artefact.
- **Commit:** `3c48c39`

**5. [Rule 3 — Blocking] `unused_index` cannot be pinned**

- **Issue:** `32-VALIDATION.md`'s CAP-03 row asks that it hold at 14. It read
  14 in the research and **12** in plan `32-04`'s capture, the same day, with no
  schema change (finding F3 of `baseline/README.md`). Pinning it makes the
  comparator fail on a correct phase.
- **Fix:** not pinned. Reported as a movement with the reason printed beside it
  (mutation N7). `multiple_permissive_policies` and `unindexed_foreign_keys`
  **are** pinned, as they are structural.
- **Commit:** `3c48c39`

**6. [Rule 2 — Missing critical functionality] every other advisor lint was ungoverned**

- **Issue:** the plan pins three lints and says nothing about the other five.
  `function_search_path_mutable` and the two
  `*_security_definer_function_executable` counts are security lints that this
  phase can plausibly move, and an unpinned lint is a lint nobody reads.
- **Fix:** any other movement is a defect until the caller names it with
  `--allow-lint-move`, which puts the expectation on the command line and
  therefore into the record (mutation N8).
- **Commit:** `3c48c39`

**7. [Rule 1 — Bug] a `✓` printed next to a defect list**

- **Found during:** mutation N1 — B2 reported the defect and then printed
  `✓ B2 — 220 cells compared` underneath it.
- **Issue:** a report that contradicts itself. Someone skimming for ticks
  would have read it as a pass.
- **Fix:** the tick is earned per artefact — shown only when nothing was
  recorded since that artefact's comparison began.
- **Commit:** `3c48c39`

**8. [Rule 1 — Bug] `ok:1` → `ok:0` was described as "a row count change"**

- **Issue:** technically true and practically useless. On an UPDATE or DELETE
  probe it is the `USING` clause matching a different row set — a narrowing (or
  a widening) that raises **no SQLSTATE**, and therefore precisely the one a
  permitted-vs-refused comparison waves through.
- **Fix:** classified and named by direction, with the row counts quoted.
- **Commit:** `3c48c39`

### Deviation in process, not in code

**The two tasks share one file, and it was written in one pass.** Both tasks
name `scripts/rls-baseline-compare.mjs`. The file was authored complete and the
B1 mutations were run first, so commit `b5748e0` — labelled Task 1 — already
carries the B2/B3/B5 comparators, which are proved by the mutations in
`3c48c39`. Splitting it faithfully would have meant committing an intermediate
version that was never executed, which is a worse trade than an honest note:
**an unrun commit is a commit whose green means nothing.** Both commits are
working states; the task boundary between them is not clean, and this is the
record of that.

### Not done, deliberately

**`32-VALIDATION.md` was not edited.** Its CAP-03 row still pins `unused_index`
at 14, which finding F3 of `baseline/README.md` and deviation 5 above both
contradict. The file is shared across the phase and no task in this plan
instructs an edit to it. **The correction belongs to the phase verifier**, and
the comparator behaves correctly regardless — it reports that lint rather than
pinning it.

**`deferred-items.md` was not edited** — see finding F4 for the reason, which is
parallel-execution safety rather than indifference.

**`STATE.md` and `ROADMAP.md` were not touched** — the orchestrator owns those.

## Execution-environment note, not a code change

This plan ran in a git worktree, which holds no gitignored file. `.env.local`
and `node_modules` were symlinked in from the main checkout **only** to run
`npm run build`, and **both symlinks were removed before the commit that needed
them**; `git status --short` showed only the tracked file afterwards. Both paths
are gitignored, neither was ever staged. Same handling as plans `32-01`,
`32-03` and `32-04`.

The comparator itself needs neither: three node built-ins, no dependency, no
environment variable.

## What this does not cover

- **Nothing has been compared against a real post-change capture.** Both sides
  of every comparison here are the committed pre-phase baseline or a
  hand-mutated copy of it. The comparator's whitelist is a *prediction* of what
  the migrations will produce; the first genuine after-capture is what tests
  that prediction. It is designed to fail loudly if the prediction is wrong.
- **The `AS <alias>` re-print shape is inferred from one datum.** It is measured
  for `is_admin_or_organizer`, `is_master` and `get_user_status`; it is
  *predicted* for `auth.uid()` and `private.has_capability`. If Postgres renders
  either differently, the first post-migration run reports
  `predicate_unexplained` — the safe direction, and a one-line fix to the
  enumeration once the real rendering is in hand.
- **B4 is not compared here.** `32-VALIDATION.md` requires B4's predicate column
  to be character-identical, but B4 is a hand-written Markdown reading of the
  code, not a JSON artefact, and this plan's `<files>` do not include it.
- **The comparator does not judge.** It says what moved. Whether a movement is
  acceptable is a human decision, and this repository has no test runner — the
  script prints that sentence on every run rather than letting a green be
  mistaken for a correctness proof.
- **D-32-A is still the owner's.** The comparator now guarantees the decision
  cannot be taken implicitly: any change to the `42P17` cells fails the
  comparison and names the direction.

## Self-Check: PASSED

```
$ [ -f scripts/rls-baseline-compare.mjs ]                       FOUND
$ grep -c 'baseline:compare' package.json                       1  (FOUND)
$ git log --oneline --all | grep -c b5748e0                     1  (FOUND)
$ git log --oneline --all | grep -c 3c48c39                     1  (FOUND)
$ git log --oneline --all | grep -c 0f3e20c                     1  (FOUND)
$ git diff --diff-filter=D --name-only HEAD~3 HEAD              (empty — no deletions)
$ git status --short                                            (clean before this SUMMARY)
```

- `scripts/rls-baseline-compare.mjs` — FOUND (1163 lines)
- `package.json` entry `baseline:compare` — FOUND
- commit `b5748e0` (Task 1) — FOUND
- commit `3c48c39` (Task 2) — FOUND
- commit `0f3e20c` (measurements recap) — FOUND
- no file deletions in any of the three commits — CONFIRMED
- `STATE.md` and `ROADMAP.md` untouched — CONFIRMED
- `npm run build` — green
- `npx eslint scripts/rls-baseline-compare.mjs` — no output
- `npm run baseline:compare -- --only=B1,B2,B3,B5 … --expect-initplan=unchanged` — `CAP-03: clean`, exit 0
- 13 mutations fired, each asserted as applied before its result was read — CONFIRMED
- the full-phase simulation explained all 67 policies, 0 unexplained — CONFIRMED
- no `supabase/migrations/` file was created by this plan — CONFIRMED
