---
phase: 32-capability-model-in-the-database
plan: 09
subsystem: capability-model
status: COMPLETE — applied to production, CAP-03 clean on both targets, advisor at zero
tags: [cap-06, cap-03, rls, auth-uid, initplan, migration, mutation-proof]
requires:
  - "32-04 — the committed pre-phase B5 dump, which is the only legitimate enumeration of the 26"
  - "32-05 — scripts/rls-baseline-compare.mjs, the judge whose whitelist the generator imports"
  - "32-07 — the applied post-07 predicates, which are this migration's input, and the finding that the container is not optional"
provides:
  - "supabase/migrations/20260807020000_wrap_auth_uid.sql — 20 policies, 25 tokens wrapped, APPLIED as 20260806161753"
  - "32-CAP06-REVIEW.md — the 26-row review with class, transformation and measured result, plus EXPLAIN and write probes before and after"
  - "CAP-06 satisfied: the advisor that named 26 policies names none, on the applied production database"
  - "the seven post-09 baseline artefacts, both targets"
  - "a comparator that can express `--expect-initplan=0`, which no database could satisfy before"
  - "the measured proof that B1 is the ONLY detector for a misapplied T1 — the mirror image of 32-07's finding about T2"
  - "the measured proof that the class-D ownership test survives the wrap, by row count rather than by execution plan"
affects:
  - "the production database — one migration applied, recorded as 20260806161753. 20 of 67 row-level policies re-created with their auth.uid() wrapped."
  - "scripts/rls-baseline-compare.mjs — the B5 comparison reads an absent advisor lint as a count of zero"
  - "nothing in src/ — this plan touched no TypeScript at all"
tech-stack:
  added: []
  patterns:
    - "the migration generated from Postgres's own re-print of the APPLIED policy, with one substring substituted per call site and nothing else"
    - "the offline pre-check run through the comparator's own explainPredicate, so generator and judge cannot disagree about what is legal"
    - "a write probe that ends in `returning id`, because an UPDATE refused by RLS does not raise — it matches no row"
    - "the mutation asserted applied, comment lines excluded from the count, before any result is read"
key-files:
  created:
    - supabase/migrations/20260807020000_wrap_auth_uid.sql
    - .planning/phases/32-capability-model-in-the-database/32-CAP06-REVIEW.md
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.post-09.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.post-09.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.post-09.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-advisors.post-09.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.post-09.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.post-09.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.post-09.json
  modified:
    - scripts/rls-baseline-compare.mjs
decisions:
  - "The plan's task-1 instruction that the class-D policies 'lose one of their two' occurrences in 20260807010000 is measured FALSE: both keep two. The cutover replaced their P1 fragment, which contains no auth.uid() at all. The residual is 25 tokens, not 23 — and using the plan's number would have left two unwrapped and finished the advisor at 2 rather than 0."
  - "auth_rls_initplan is not 0 after this migration: it is ABSENT. The Supabase advisor emits a lint row only when that lint has at least one entity. Measured on the post-07/post-09 pair, not assumed. The comparator now reads an absent lint as zero, which makes --expect-initplan=0 satisfiable for the first time."
  - "The correlated EXISTS on event_parties DID change plan shape — to a hashed semi-join — as a second-order effect of auth.uid() becoming a statement-level constant. It did not become an InitPlan, which is what the criterion forbids, and the behaviour was then settled by row-count probe rather than by reading the plan."
  - "A class-D probe must end in `returning id`. The first version asked only 'did it error' and reported success for a refusal and a permission alike: an UPDATE refused by RLS matches no row and raises nothing. It measured nothing and looked green."
  - "The mutation proof was run BEFORE production was written to, not after. If the harness could not catch a misapplied T1, that is worth knowing before the change is live rather than afterwards."
  - "profiles_update_own was wrapped and NOT redesigned. D-32-A stays deferred; the 42P17 cells are unmoved on both targets, 4 on production and 11 on the container."
metrics:
  tasks_completed: 3
  tasks_total: 3
  commits: 3
  duration: ~2h40m
  completed: 2026-08-06
---

# Phase 32 Plan 09: CAP-06 — The Advisor That Named 26 Policies Names None

**Applied to production. `CAP-03: clean` on both targets, in both comparison
windows.** Twenty policies were dropped and re-created with every bare
`auth.uid()` wrapped in `(select …)`, and **not one verdict moved** — 220 read
cells and 660 write cells identical on production, the same on the container
where eleven personas exist instead of four.

```
post-07 → post-09    47 unchanged · 20 by T1 · 0 by T2 · 0 by both · 0 unexplained
pre     → post-09     8 unchanged · 14 by T1 · 39 by T2 · 6 by both · 0 unexplained
auth_rls_initplan    26 → 0
```

**`0 by T2` in the isolating window is the load-bearing zero.** This migration
performed one transformation, and the twenty policies it names are exactly the
twenty the review's residual set names.

Four things happened that the plan did not anticipate, and all four are reported
rather than absorbed:

1. **The plan's class-D arithmetic is wrong.** Both `event_parties` policies keep
   **two** occurrences, not one. Using the plan's number would have left two
   tokens unwrapped and finished the advisor at 2.
2. **`auth_rls_initplan` does not reach `0` — it disappears.** The comparator
   could not express that, so `--expect-initplan=0` was unsatisfiable by any
   database. Fixed, and the fix proved by mutation on three branches.
3. **The correlated `EXISTS` changed plan shape.** Not to an `InitPlan` — to a
   hashed semi-join, as a second-order effect of the intended change. Settled by
   behaviour, not by argument.
4. **The first version of the class-D probe measured nothing** and looked green.

And one thing was measured that nobody asked for: **B1 is the only detector for
a misapplied T1, and B3-on-the-container is the only detector for a collapsed
T2.** Neither artefact is the safety net. The pair is.

---

## What was built

| Artefact | What it is |
|---|---|
| `supabase/migrations/20260807020000_wrap_auth_uid.sql` | 20 `DROP POLICY IF EXISTS` / `CREATE POLICY` pairs, one `BEGIN;`…`COMMIT;`, 11 tables. Generated from the applied post-07 dump. |
| `32-CAP06-REVIEW.md` | 669 lines: the 26-row table with class, transformation and measured result; the class-D and class-E sections; `EXPLAIN` before and after under a persona; the write probes on both targets; the mutation proof. |
| seven `*.post-09.json` artefacts | B1, B2, B3, B5 on production; B1, B2, B3 on the container. All scanned CLEAN before commit. |

**Commits**

| Hash | What |
|---|---|
| `8c34939` | task 1 — the 26-row review and the before side of both bracketing measurements |
| `c441a6d` | task 2 — the wrap migration |
| `6813b88` | task 3 — applied, seven artefacts, the filled result column, the comparator fix |

### What was applied, and how

Through the Management API **migrations** endpoint, not `/database/query` —
`/database/query` runs the SQL while leaving the project's history unaware, so a
later `supabase db push` would try to apply it again.

| File | Recorded as | HTTP |
|---|---|---|
| `20260807020000_wrap_auth_uid.sql` | `20260806161753 20260807020000_wrap_auth_uid` | **200** |

The endpoint assigned its own version from the wall clock and ignored the one in
the body — the fourth time this phase has observed it. History now holds **36**
entries against **37** files; the gap is still the pre-existing, unregistered
`20260508000000_drink_token_active_state.sql`, the owner's decision, documented
in `31-VERIFICATION.md` and not repaired here.

The file is idempotent by construction, not by accident: every statement is
`DROP POLICY IF EXISTS` immediately followed by `CREATE POLICY`.

### The derivation

The 26 were enumerated **mechanically** from `baseline/32-BASELINE-advisors.json`
— the committed pre-phase dump — with every advisor entity name resolved back to
**exactly one** pre-phase B1 policy. A resolution producing zero or two matches
would have stopped the plan.

```
rows enumerated from the pre-phase advisor dump: 26
class counts: A 15 · B 2 · C 6 · D 2 · E 1
expected:     A 15 · B 2 · C 6 · D 2 · E 1  -> MATCH
class names not among the 26: none
auth.uid() occurrences  pre-phase: 31   post-07: 25
```

The migration was then generated from `32-BASELINE-policies.post-07.json` —
Postgres's own re-print of the **applied** policies, not the migration files —
with exactly one substring replaced per call site, by `split`/`join` rather than
by a regex with a replacement string, so no capture group or escape sequence
could rewrite more than the literal token.

Before anything was applied, the generated predicates were handed to the
**judge**, `explainPredicate` imported from the comparator that would grade the
result:

```
[as-written]  47 unchanged · 21 by T1 · 0 by T2 · 0 by both · 0 unexplained
predicates present in the file, whitespace aside: all
```

(21 clauses across 20 policies: `profiles_update_own` changes in both its
`USING` and its `WITH CHECK`. The comparator tallies per policy, so it reports
20.)

---

## Finding 1 — the plan's class-D arithmetic, corrected

`32-09-PLAN.md` task 1 instructs that *"the two class-D policies lose one of
their two"* occurrences in `20260807010000`. Measured on the applied post-07
dump: **both keep two.**

The cutover replaced their **P1 fragment**, `(SELECT is_admin_or_organizer())`,
which contains **no `auth.uid()` at all**. Their two tokens live in the scalar
sub-select on `profiles` and in the correlated `EXISTS`, and `32-07-SUMMARY.md`
records explicitly that neither was touched — the scalar sub-select is not one
of the five enumerated left-hand sides.

`31 − 6 = 25`, not 23. **Had the plan's number been used, two occurrences would
have gone unwrapped and the advisor would have finished at 2 rather than 0** —
and the plan's own success criterion would have failed at the last step, for a
reason written into the plan itself.

The class counts, which are what the plan's stop-rule actually protects, did not
move.

---

## Finding 2 — the advisor does not say zero, it stops speaking

```
                                                    pre   post-07  post-09
auth_rls_initplan                                    26        20   absent
multiple_permissive_policies                         46        46       46
unindexed_foreign_keys                               35        35       35
unused_index                                         12        13       13
anon_security_definer_function_executable            14        14       14
authenticated_security_definer_function_executable   14        15       15
function_search_path_mutable                         13        13       13
auth_leaked_password_protection                       1         1        1
```

The Supabase advisor emits a row per lint **only when that lint has at least one
entity**. Seven lints are present in both captures; `auth_rls_initplan` is
present in one and gone from the other.

The comparator read an absent lint as `undefined`, so it reported
`b5_lint_missing` **and** `20 → undefined, but --expect-initplan=0 was stated`.
**The expectation CAP-06 requires was unreachable, not merely awkward to state.**

Fixed — see *Deviations* — and the entity lists were then diffed by hand:

```
auth_rls_initplan:  +0 / -20   (all of them)
every other lint :  +0 / -0
```

The 20 dropped entities are, character for character, the 20 policies the
migration wrapped. Checked mechanically:

```
entities the advisor dropped  : 20
policies the migration wrapped: 20
the two sets are identical, character for character: true
```

**`multiple_permissive_policies` holding at 46 is the independent proof that no
`CREATE POLICY` landed beside an existing one instead of replacing it.**

`--allow-lint-move` was needed **only** in the whole-phase window, for
`authenticated_security_definer_function_executable` 14 → 15. D-32-G says the
flag is lint-wide, so the entity list was diffed by hand: **exactly one entity
added, `public.my_access_context`, plan 32-06's, not this plan's.** In the
window that isolates this migration, no allowance was needed at all.

---

## Finding 3 — the correlated EXISTS changed shape, and why that is not the defect

`32-09-PLAN.md`'s acceptance criterion asks that the `EXISTS` on `event_parties`
still be a per-row correlated subquery and **not** an `InitPlan`. Measured:

| | BEFORE | AFTER |
|---|---|---|
| `auth.uid()`'s body | inlined into the per-row `Filter` | **an `InitPlan`** — the intended change |
| the correlated `EXISTS` | `EXISTS(SubPlan 17)`, `Index Cond: (e.id = event_parties.event_id)` | `ANY (event_parties.event_id = (hashed SubPlan 33).col1)` |
| the uncorrelated scalar sub-select | `InitPlan` | `InitPlan` — unchanged |
| `has_capability('staff.manage')` | `InitPlan` | `InitPlan` — unchanged |

**It did not become an `InitPlan`** — the criterion's danger is absent. But it is
no longer an `EXISTS(SubPlan n)` either. Once `auth.uid()` became a
statement-level constant, every remaining qualifier inside the subquery was
uncorrelated, so the planner pulled the correlation out into a per-row
`ANY (event_parties.event_id = …)` test and hashed the inner result once. That
is Postgres's ordinary `EXISTS` → hashed semi-join rewrite, and it is a
**second-order effect of the intended transformation**, not a second
transformation.

The correlation was **moved, not removed**. But that is an argument, and the
threat is elevation, so it was put to the database instead.

### The probe, and the trap inside it

An **organizer** — holds `staff.manage`, is not master, so the ownership branch
of the `OR` is the only one available to them — who created event A and did not
create event B, attempting `UPDATE` and `DELETE` on a party of each. Two
containers, one built **without** the wrap migration and one **with** it,
otherwise identical. Every probe inside `begin … rollback`. Both destroyed.

```
                                     BEFORE    AFTER
  organizer/approved OWNED   update   rows:1   rows:1
  organizer/approved OWNED   delete   rows:1   rows:1
  organizer/approved NOT-OWNED update  rows:0   rows:0
  organizer/approved NOT-OWNED delete  rows:0   rows:0
  master/approved    OWNED   update   rows:1   rows:1
  master/approved    OWNED   delete   rows:1   rows:1
  master/approved    NOT-OWNED update  rows:1   rows:1
  master/approved    NOT-OWNED delete  rows:1   rows:1

cells that moved between before and after: 0
```

**`rows:1` against `rows:0` for the organizer is the whole proof.** Had the
`EXISTS` been hoisted to a statement-level `InitPlan`, the ownership test would
have stopped discriminating and the NOT-OWNED party would have become writable.
The master reads `rows:1` on both, which is the `role = 'master'` branch
behaving as designed.

**The first version of this probe measured nothing and looked green.** It asked
only *"did it error"*, and an `UPDATE` or `DELETE` refused by RLS **does not
raise** — it matches no row. So the refusal and the permission produced the same
answer, and the run reported `ok:1` for all eight cells including the four that
should have been refusals. `returning id` is what turns the verdict into a row
count. In a repository with no test runner, a probe that cannot fail is worse
than no probe, because it will be quoted.

---

## Finding 4 — the mutation proof, and the half of the net that 32-07 could not see

Run **before** production was written to, because *"the comparator will catch
it"* is an assumption until the invariant is broken and the check is watched.

The threat is **T-32-09-03**: wrapping the **comparison** instead of the
**call**. `(select auth.uid() = user_id)` is legal SQL, is semantically identical
— `user_id` resolves as a correlated reference — and is **no longer an
InitPlan**. It is exactly the mistake this transformation tempts, and it would
undo the plan's entire purpose while looking correct.

Two class-A policies were deliberately broken, and the mutation was **asserted
applied before any result was read**:

```
mutation applied? (executable SQL only) correct form 8 -> 6, broken form 1 -> 3
```

> The first attempt at that assertion **failed, and failed correctly**: it
> counted the broken form in the migration's own header comment, where the file
> quotes it as the thing it does not do. The assertion refused to proceed on
> arithmetic it could not confirm. That is the whole reason to assert a mutation
> rather than trust it — in the other direction, the same error would have
> certified a dead check as working.

A container built from the mutated repository:

```
  ✗ predicate_unexplained — rsvps.rsvps_select_own (SELECT) qual
      before: (auth.uid() = user_id)
      after : (SELECT (auth.uid() = rsvps.user_id))
  ✗ predicate_unexplained — tickets.tickets_select_own (SELECT) qual
      47 unchanged · 18 by T1 · 0 by T2 · 0 by both · 2 unexplained
  ✓ B2 — 220 cells compared
  ✓ B3 — 660 cells compared
  CAP-03: 2 defects — predicate_unexplained

migration restored byte-for-byte: true
  removed mutant artefact 32-BASELINE-policies.container.mutant.json
  removed mutant artefact 32-BASELINE-reads.container.mutant.json
  removed mutant artefact 32-BASELINE-writes.container.mutant.json
```

**B1 caught it, twice. B2 and B3 passed it in silence** — 220 and 660 cells
identical, because the misapplication changes performance, not verdicts.

> **This is the exact mirror image of `32-07-SUMMARY.md`'s finding, and the two
> belong together.**
>
> | Defect | B1 | B3 on the container |
> |---|---|---|
> | a **capability collapse** (T2) — 32-07 | **passes it** | catches it, 16 times |
> | a **misapplied wrap** (T1) — this plan | **catches it, twice** | passes it |
>
> **Neither artefact is the safety net; the pair is.** 32-07 concluded "the
> container is the only detector" — true for that defect, and this plan is the
> counter-example that keeps the sentence from being generalised. A later plan
> that drops either artefact has removed half the net, and the half it drops
> will be the half that mattered.

---

## The three proofs CAP-06 asked for

### (i) and (ii) — the 26-row table, and the advisor at zero

All 26 result cells are filled, and every row names its resolution as either
`wrapped in 20260807020000` (20 rows) or `predicate replaced in 20260807010000`
(6 rows). `20 + 6 = 26`.

```
bare auth.uid() remaining across all 26, production : 0
production/container disagreement on any of the 26  : 0
auth_rls_initplan still reported by the advisor     : false
```

### (iii) — `EXPLAIN` before and after

Finding 3 above. The intended change landed; the two facts that carry the
elevation risk are unchanged in substance and the one that changed shape was
proved harmless by row count.

`profiles_update_own` still raises `42P17` at **plan** time, before and after, so
its execution plan cannot be captured on either side — recorded as the honest
absence it is, with the coupled read (`profiles_select_own`) captured instead.

### (iv) — the privilege-escalation write probe

| Target | Attempt | BEFORE | AFTER |
|---|---|---|---|
| container | `set role = 'master'` | **`42P17`** | **`42P17`** |
| container | `set status = 'approved'` | **`42P17`** | **`42P17`** |
| production | `set role = 'master'` | **`42P17`** | **`42P17`** |
| production | `set status = 'approved'` | **`42P17`** | **`42P17`** |

```
production rollback check: profiles rows 4 -> 4, rows with role='master' 1 -> 1
```

And the cells the comparator reads, which matter more than the transcript:

```
production pre / post-07 / post-09   11 profiles UPDATE cells {"42P17":4,"absent":7}
container  pre / post-07 / post-09   11 profiles UPDATE cells {"42P17":11}
```

**Unmoved on both targets, at all three phase points.** D-32-A is untouched and
still deferred: the guard refuses by crashing rather than by denying, and
redesigning it is a new design, not a transformation (deviation Rule 4).

---

## The organizer asymmetry, still there

Not this plan's requirement, but it is the phase's single unrecoverable defect
and it costs nothing to re-read out of the committed container artefacts:

```
organizer/pending  x ticket_tiers   pre ok:1     post-09 ok:1
organizer/pending  x venues         pre 42501    post-09 42501
organizer/pending  x artists        pre 42501    post-09 42501
organizer/approved x ticket_tiers   pre ok:1     post-09 ok:1
organizer/approved x venues         pre ok:1     post-09 ok:1
organizer/approved x artists        pre ok:1     post-09 ok:1
member/approved    x ticket_tiers   pre 42501    post-09 42501
member/approved    x venues         pre 42501    post-09 42501
master/pending     x ticket_tiers   pre ok:1     post-09 ok:1
master/pending     x venues         pre 42501    post-09 42501

10 of 10 cells identical; ok:1 != 42501 for organizer/pending: true
```

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking] the comparator could not express this migration's terminal state**

- **Found during:** task 3, running the plan's own stated verification command.
- **Issue:** the advisor omits a lint that has no entities, so after this
  migration `auth_rls_initplan` is **absent** rather than `0`. The comparator
  read an absent lint as `undefined` and reported two defects —
  `b5_lint_missing` and `20 → undefined, but --expect-initplan=0 was stated`.
  **The expectation CAP-06 requires was unreachable by any database**, which is
  a different problem from an awkward flag: the plan's success criterion could
  not be satisfied at all.
- **Fix:** an absent lint is read as a count of **zero**, in all three count
  comparisons, with the measurement that justifies it written beside the check.
  The `b5_lint_missing` branch is removed as redundant, and the "everything
  else" loop now iterates the **union** of both sides, so a lint that vanished is
  still compared instead of skipped.
- **Why it is expressive and not permissive.** Every branch is stricter than or
  equal to what it replaced:
  - `--expect-initplan=n` still asserts equality with a stated `n`; `0` now
    means what it says.
  - a **pinned** lint that disappears now reads `46 → 0` and is still a defect.
  - any other lint that disappears now needs `--allow-lint-move` and a written
    reason, where before it was one defect kind and is now another.
- **Proved by mutation, all three branches:**
  ```
  --expect-initplan=1 against a database at 0
    ✗ b5_initplan_unexpected — 20 → 0, but --expect-initplan=1 was stated
  a PINNED lint removed from the after artefact
    ✗ b5_pinned_lint_moved — multiple_permissive_policies 46 → 0
  a NON-pinned lint removed from the after artefact
    ✗ b5_lint_moved — function_search_path_mutable 13 → 0 (no longer reported at all)
  ```
- **Verified:** `npx eslint scripts/rls-baseline-compare.mjs` → no output.
- **Commit:** `6813b88`

**2. [Rule 3 — Blocking] the plan's class-D occurrence count would have left the advisor at 2**

- **Found during:** task 1, deriving the residual set from the applied dump.
- **Issue:** the plan states the two class-D policies lose one of their two
  `auth.uid()` occurrences in `20260807010000`. Measured false — the cutover
  replaced their P1 fragment, which contains no `auth.uid()`.
- **Fix:** derive the residual from the applied post-07 dump (20 policies, 25
  tokens) instead of from the plan's prose, and report the discrepancy with the
  evidence rather than absorb it.
- **Commit:** `8c34939`

**3. [Rule 1 — Bug] the class-D ownership probe could not fail**

- **Found during:** task 3, reading a result of `ok:1` on a cell that had to be a
  refusal.
- **Issue:** an `UPDATE` or `DELETE` refused by RLS does not raise — it matches
  no row. The probe asked only whether the statement errored, so it reported
  success for the refusal and the permission alike, on all eight cells. It was
  a green screen.
- **Fix:** every class-D probe now ends in `returning id`, and the probe
  function **refuses to run** a body that does not. The verdict is a row count.
- **Commit:** `6813b88` (the probe is a throwaway; its result is in
  `32-CAP06-REVIEW.md`, and the discipline is written there so the next reader
  does not repeat it)

### Done in task 3 that the plan did not ask for

- **The mutation proof**, above, and **before** production was written to rather
  than after. If the harness could not catch a misapplied T1, that is worth
  knowing before the change is live.
- **The class-D ownership probe on two containers.** The plan closes T-32-09-02
  with `EXPLAIN`. `EXPLAIN` turned out to show a *changed* plan shape, so the
  execution plan became an argument rather than evidence, and an argument is not
  what closes an elevation threat.
- **Both comparison windows.** The plan's `<verify>` compares against the
  pre-phase baseline, which mixes this migration's T1 with 32-07's T2 and cannot
  show `0 by T2`. The isolating window `post-07 → post-09` was added; both are
  reported.

### Not done

- **`deferred-items.md`, `32-VALIDATION.md`, `STATE.md`, `ROADMAP.md`** — not
  touched. The last two belong to the orchestrator; everything that would have
  gone to the first is in *Deferred* below.
- **`profiles_update_own` was not redesigned.** D-32-A stays deferred, with its
  evidence now confirmed a third time: wrapping does not remove the recursion,
  measured on both targets at post-09.
- **The four inherited helper functions were not dropped.** Still unreferenced by
  any policy since 32-07, still `SECURITY DEFINER` in `public` without
  `search_path`, still callable by `anon` over REST —
  `anon_security_definer_function_executable` holds at 14. Raised, not fixed.
- **`32-VERIFICATION.md` was not written.** It is the phase's deliverable, not
  this plan's.

---

## Deferred (for the orchestrator to merge — this worktree did not write the shared file)

- **D-32-H (new) — the two comparison artefacts catch different defects, and the
  phase should say so once.** 32-07 proved B1 passes a capability collapse and
  only B3-on-the-container catches it; this plan proves B3 passes a misapplied
  wrap and only B1 catches it. `baseline/README.md` currently carries only the
  first half (as D-32-F). Stated alone, *"the container is the only detector"*
  invites dropping B1. Both halves belong in `32-VERIFICATION.md` and in the
  README, as one table.
- **D-32-I (new) — a write probe against RLS must end in `returning id`.** An
  `UPDATE` or `DELETE` refused by a policy raises nothing and matches no row, so
  a probe that only catches exceptions reports success for a refusal. This bit
  this plan once. The same property is why B3 marks so many `UPDATE` cells
  inconclusive; the harness handles it correctly, but nothing in
  `baseline/README.md` warns the next person writing an ad-hoc probe.
- **D-32-J (new) — the plan's class-D occurrence count.** `32-09-PLAN.md` task 1
  says the class-D policies lose one of their two occurrences in
  `20260807010000`. They lose none. Corrected in `32-CAP06-REVIEW.md`; the plan
  file itself still says it, and any later document that repeats "23" should read
  **25**.
- **D-32-A — unchanged, and now confirmed a third time.** Wrapping did not remove
  the `42P17` recursion, exactly as `32-07-SUMMARY.md` predicted. The guard still
  refuses by crashing rather than by denying, every profile write in the product
  still goes through the service-role client which bypasses RLS entirely, and
  this project still has no error tracking. The redesign — options A–D — needs
  its own phase, its own before/after probes and its own comparator allowance,
  because it **will** move B3's `profiles` UPDATE cells on both targets. This
  plan moved none of them.
- **D-32-G — still open, and still costing a manual step.** `--allow-lint-move`
  remains lint-wide. The entity list was diffed by hand again here. Until the
  flag takes an entity, every later plan either repeats the manual step or
  silently stops doing it.
- **Pre-existing `npm run lint` state** — 21 errors / 108 warnings, none in any
  file this plan opened. This plan changed no TypeScript;
  `npx eslint scripts/rls-baseline-compare.mjs` is clean.

---

## Threat Flags

None. This plan opens no network endpoint, adds no auth path and changes no
schema at a trust boundary beyond the 20 policy predicates its own
`<threat_model>` designs. The surface it could have widened —
`public.event_parties` UPDATE/DELETE and `public.profiles` UPDATE — is measured
unchanged in both directions above.

The plan's own register, with what closed each row:

| Threat | Closed by |
|---|---|
| **T-32-09-01** `profiles_update_own` weakened, letting a member set their own `role` | the token wrapped and nothing else; the dedicated write probe for `role` **and** `status`, before and after, on both targets, `42P17` every time; and the 11 `profiles` UPDATE cells unmoved at all three phase points |
| **T-32-09-02** the correlated `EXISTS` hoisted, so every organizer edits every party | `EXPLAIN` before and after — it is **not** an InitPlan — **plus** the row-count probe that the `EXPLAIN` made necessary: `rows:1` owned against `rows:0` not-owned, identical before and after, on two containers |
| **T-32-09-03** the comparison wrapped instead of the call | the generator substitutes the literal token by `split`/`join`; the offline pre-check reports `0 unexplained`; and **the mutation**, which proved B1 is the only thing that would have caught it |
| **T-32-09-04** a review recording fewer than 26 policies | 26 rows regardless of resolution; every name resolved mechanically from the pre-phase advisor dump to exactly one B1 policy; class counts asserted A 15 · B 2 · C 6 · D 2 · E 1 |
| **T-32-09-05** a policy silently renamed while being recreated | names copied from the applied dump; 0 CREATE names absent from it, 0 duplicates; the comparator reports 0 `policy_added` and `multiple_permissive_policies` unmoved at 46 |
| **T-32-09-SC** npm installs | nothing was installed |

---

## Manual verification procedure (there is no test runner)

Written out because in this repository the written procedure is the only evidence
that will exist. This is the procedure for **re-confirming that 25 tokens were
wrapped and no verdict moved with them**. Steps 1–4 need Docker only; 5–7 need
`SUPABASE_ACCESS_TOKEN` in `.env.local`. **Nothing below writes a row:** every
persona probe runs inside a transaction that is rolled back, and the capture
asserts that separately.

1. `npm run baseline:container -- --phase-point=check`
   → must build from **37 migration files** and capture B1, B2, B3. A failure
   here means the repository's own SQL no longer composes.
2. `npm run baseline:compare -- --target=container --only=B1,B2,B3 --before-point=post-07 --after-point=check`
   → must end **`CAP-03: clean`**, with B1 reading
   `47 unchanged · 20 by T1 · 0 by T2 · 0 unexplained`.
   **`0 by T2` is not decoration**: a non-zero there means a capability
   replacement landed in a migration whose whitelist entry does not cover it.
3. ```
   grep -v '^--' supabase/migrations/20260807020000_wrap_auth_uid.sql \
     | grep -o 'auth\.uid()' | wc -l          # 25
   grep -v '^--' supabase/migrations/20260807020000_wrap_auth_uid.sql \
     | grep -o '(select auth\.uid())' | wc -l # 25
   ```
   → the two numbers must be **equal**. A bare `auth.uid()` that survived is a
   policy still re-evaluating the caller once per row.
4. In `baseline/32-BASELINE-policies.container.check.json`, read the `qual` of
   `event_parties_update_own`.
   → it must still contain `(e.id = event_parties.event_id)`, **unmodified**.
   **If that line ever changes, the policy has stopped scoping to the owned
   event**, and every holder of `staff.manage` can edit and delete every party
   of every event. That is the one check in this plan that cannot be replaced by
   reading a count.
5. `npm run baseline:rls -- --phase-point=check`
   → four artefacts, and the run must report both rollback clauses:
   `240 probe strings end in a rollback` and `20/20 row counts re-read and
   unchanged`.
6. `npm run baseline:compare -- --before-point=post-07 --after-point=check --expect-initplan=0`
   → must end **`CAP-03: clean`**, with
   `auth_rls_initplan 20 → 0 (the advisor no longer reports the lint at all)`.
   `multiple_permissive_policies` **46** and `unindexed_foreign_keys` **35** must
   not have moved. `unused_index` may move on its own and is not pinned.
7. Read the `profiles` UPDATE cells of `baseline/32-BASELINE-writes.check.json`
   → still **`42P17` × 4** on production, **× 11** on the container. A `42501`
   there means somebody redesigned the privilege-escalation guard, which is
   **deferred** — it would be a real change and it needs its own before/after
   evidence, not a passing comparison.

**What must be observed:** two `CAP-03: clean` verdicts, `20 by T1` and `0 by
T2`, 25 = 25 on the token counts, `event_parties.event_id` untouched, the
advisor silent on `auth_rls_initplan` while 46 and 35 hold, and the `profiles`
cells still `42P17`. Any other result is a regression on a security boundary —
and with no error tracking in this project, nothing will report it on its own.

**The one thing this procedure cannot tell you:** whether a policy is *right*. It
tells you nothing moved. Sixty-seven policies were inherited, not designed here,
and CAP-06 was a **performance** requirement that this phase treated as a
security one only because two of the policies it touches sit on a trust boundary.

---

## Self-Check: PASSED

```
$ [ -f supabase/migrations/20260807020000_wrap_auth_uid.sql ]              FOUND
$ [ -f .planning/…/32-CAP06-REVIEW.md ]                                    FOUND
$ [ -f baseline/32-BASELINE-policies.post-09.json ]                        FOUND
$ [ -f baseline/32-BASELINE-reads.post-09.json ]                           FOUND
$ [ -f baseline/32-BASELINE-writes.post-09.json ]                          FOUND
$ [ -f baseline/32-BASELINE-advisors.post-09.json ]                        FOUND
$ [ -f baseline/32-BASELINE-policies.container.post-09.json ]              FOUND
$ [ -f baseline/32-BASELINE-reads.container.post-09.json ]                 FOUND
$ [ -f baseline/32-BASELINE-writes.container.post-09.json ]                FOUND
$ git log --oneline -4  →  8c34939, c441a6d, 6813b88 all present           FOUND
$ git diff --diff-filter=D --name-only HEAD~1 HEAD  (each commit)          (empty — no deletions)

$ auth.uid() / (select auth.uid()) in executable SQL                       25 / 25
$ bare auth.uid() left unwrapped in the migration                          0
$ DROP POLICY IF EXISTS / CREATE POLICY                                    20 / 20
$ CREATE names absent from the post-07 dump / duplicates                   0 / 0
$ event_parties.event_id in executable SQL, unmodified                     2
$ grep -v '^--' <file> | grep -c 'STABLE volatility allows optimizer'      0
$ policy rows in 32-CAP06-REVIEW.md                                        26
$ result cells filled: wrapped 20 + predicate replaced 6                   26
$ class counts asserted A 15 · B 2 · C 6 · D 2 · E 1                       MATCH
$ uuid / email in 32-CAP06-REVIEW.md                                       0 / 0

$ POST /v1/projects/{ref}/database/migrations                              HTTP 200
$ npm run baseline:container -- --smoke                                    37 files applied
$ compare production  post-07 → post-09  --expect-initplan=0               CAP-03: clean
$ compare container   post-07 → post-09                                    CAP-03: clean
$ compare production  pre → post-09      --expect-initplan=0               CAP-03: clean
$ compare container   pre → post-09                                        CAP-03: clean
$ npm run build (after rm -rf .next)                                       green
$ npx eslint scripts/rls-baseline-compare.mjs                              no output
$ post-09 artefact + review + comparator scan (uuid, email, 8 secrets)     9/9 CLEAN
```

- **4 mutations fired, and every one was asserted applied before its result was
  read.** One on the migration (the misapplied T1 on two class-A policies →
  2 `predicate_unexplained`, migration restored byte-for-byte, three mutant
  artefacts deleted) and three on the comparator's own changed branches
  (`--expect-initplan=1`, a pinned lint removed, a non-pinned lint removed → all
  three fired). **The first mutation assertion FAILED and stopped the run**,
  because it counted the broken form in the file's own header comment; it was
  corrected to exclude comment lines, and that failure is reported rather than
  quietly fixed.
- `STATE.md`, `ROADMAP.md`, `deferred-items.md` untouched — CONFIRMED.
- No TypeScript in `src/` was read or written by this plan — CONFIRMED. The only
  non-artefact file changed is `scripts/rls-baseline-compare.mjs`.
- The `node_modules` and `.env.local` symlinks used for the captures were removed
  before the final commit; `git status --short` showed only tracked files at
  every commit. Both paths are gitignored and neither was ever staged.
- The migration file was moved aside during the class-D before/after probe and
  restored in a `finally`; restoration was asserted by SHA-256 and re-confirmed
  by `git status`. Same for the mutation.
- **No row was written to production.** The write probes run in a read-write
  transaction because `set local role` is refused under the API's read-only
  flag; the capture reports both safety clauses separately, and both passed:
  `240 probe strings end in a rollback and carry no forbidden token` and
  `20/20 row counts re-read and unchanged after 240 probes`. The dedicated
  escalation probe re-read the `profiles` row count and the `role='master'`
  count independently: `4 → 4` and `1 → 1`.
