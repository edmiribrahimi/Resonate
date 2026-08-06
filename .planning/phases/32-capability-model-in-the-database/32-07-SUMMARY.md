---
phase: 32-capability-model-in-the-database
plan: 07
subsystem: capability-model
status: COMPLETE — applied to production, CAP-03 clean on both targets
tags: [cap-01, cap-03, rls, policies, migration, checkpoint]
requires:
  - "32-04 — the committed pre-phase B1 dump, which is this plan's only input"
  - "32-05 — scripts/rls-baseline-compare.mjs, whose five enumerated left-hand sides the generator imports"
  - "32-06 — private.has_capability, the resolver these 45 call sites now ask"
provides:
  - "supabase/migrations/20260807010000_policies_to_capabilities.sql — 45 predicate fragments replaced in place, generated from the baseline, APPLIED as 20260806154724"
  - "32-POLICY-MAP.md — the derived policy → capability mapping, 45 rows plus a full before/after appendix"
  - "CAP-01 satisfied in the database: 0 of 67 policies still name any of the four inherited helpers, on BOTH targets"
  - "a measured correction to the plan's arithmetic: 45 call sites in 45 policies, not 43"
  - "the seven post-07 baseline artefacts, both targets"
  - "a widened --expect-initplan on the comparator, so an intermediate advisor count can be stated instead of B5 being dropped"
  - "the measured proof that B1 CANNOT catch a capability collapse and B3-on-the-container CAN"
affects:
  - "the production database — one migration applied, recorded as 20260806154724. 45 of 67 row-level policies now ask private.has_capability."
  - "nothing in src/ — this plan touched no TypeScript at all"
tech-stack:
  added: []
  patterns:
    - "the mapping generated FROM the artefact the comparator reads, with the whitelist imported rather than re-typed, so generator and judge cannot drift"
    - "predicate replacement written from Postgres's own re-print, so the re-print after application is idempotent"
    - "the inherited inconsistency reproduced as two keys, and proved by probe rather than by table-reading"
    - "the advisor's entity LIST diffed by hand where the comparator only compares its COUNT — a blunt allowance flag made sharp"
key-files:
  created:
    - supabase/migrations/20260807010000_policies_to_capabilities.sql
    - .planning/phases/32-capability-model-in-the-database/32-POLICY-MAP.md
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.post-07.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.post-07.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.post-07.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-advisors.post-07.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.post-07.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.post-07.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.post-07.json
  modified:
    - scripts/rls-baseline-compare.mjs
decisions:
  - "45 policies, not 43. event_parties_update_own and event_parties_delete_own carry ONE enumerated fragment each (P1), not two: their second 'role = master' test is a scalar sub-select on profiles, not is_master(), and is therefore not one of the five recognised shapes. Left untouched."
  - "The scalar profiles sub-select is left alone for a second reason beyond the whitelist: is_master() is SECURITY DEFINER and reads profiles as its definer, while the inline sub-select reads profiles as the caller and is itself subject to profiles_select_own. Swapping one for the other is a behaviour change dressed as a rename."
  - "profiles_update_own is NOT convertible by this plan, and the orchestrator agreed and reversed the instruction. Its WITH CHECK is an unchanged-field guard, not a permission check, and no capability means 'my role is unchanged'. Deferred to a future phase as a NEW DESIGN with options A–D and a measured starting point."
  - "No comparator allowance was proposed for the profiles UPDATE cells, because none is needed: they are unmoved on both targets, 42P17 x4 on production and x11 on the container."
  - "--expect-initplan was widened from 26|0|unchanged to any non-negative integer. Expressive, not permissive. The alternative was dropping B5 from the comparison, which would have blinded the only oracle that has never read the plan."
  - "The one allowed lint move — authenticated_security_definer_function_executable 14 -> 15 — is plan 32-06's my_access_context, not this plan's. The flag is blunt (it allows the whole lint), so the entity list was diffed by hand: exactly one entity added, and it is that function."
  - "The container was used five times, all throwaway: smoke, re-print measurement, escalation probes (twice), asymmetry probe, and the collapse mutation. Production was written to exactly once."
metrics:
  tasks_completed: 3
  tasks_total: 3
  commits: 3
  duration: ~2h
  completed: 2026-08-06
---

# Phase 32 Plan 07: The Cutover — 45 Policies Now Ask One Definition

**Applied to production. `CAP-03: clean` on both targets.** Forty-five of the
sixty-seven row-level policies now ask `private.has_capability` instead of one of
four inherited helpers, and **not one verdict moved** — 220 read cells and 660
write cells identical on production, the same on the container where eleven
personas exist instead of four.

Three things happened that the plan did not anticipate, and all three are
reported rather than absorbed:

1. The policy count is **45**, not 43. The class counts — the numbers that carry
   the safety meaning — match the measured populations exactly.
2. **The owner's D-32-A instruction rested on a false premise, and the
   orchestrator reversed it** after the measurement. `profiles_update_own` is
   untouched, the phase stays behaviour-unchanged, and the guard redesign is
   deferred with its evidence attached.
3. The comparator could not express this plan's derived advisor expectation. It
   was widened rather than bypassed.

And one thing was measured that nobody asked for and that changes how the rest of
this phase should be read: **B1 cannot catch a capability collapse. Only B3 on
the container can.** Proved by mutation, below.

---

## What was built

| Artefact | What it is |
|---|---|
| `supabase/migrations/20260807010000_policies_to_capabilities.sql` | 45 `DROP POLICY IF EXISTS` / `CREATE POLICY` pairs, one `BEGIN;`…`COMMIT;`, 18 tables. Generated from the baseline. |
| `.planning/phases/32-capability-model-in-the-database/32-POLICY-MAP.md` | 653 lines: the counts, the three equivalence claims, the 45-row table, a full before/after block per policy, and the offline pre-check. |
| seven `*.post-07.json` artefacts | B1, B2, B3, B5 on production; B1, B2, B3 on the container. All scanned CLEAN before commit. |

**Commits**

| Hash | What |
|---|---|
| `981c254` | task 1 — the migration and the map, one commit, because the map is the migration's source |
| `71bd937` | the checkpoint SUMMARY, written before stopping |
| `0ccdbb1` | task 3 — the seven post-07 artefacts and the comparator's widened flag |

### What was applied, and how

Through the Management API **migrations** endpoint
(`POST /v1/projects/{ref}/database/migrations`), not `/database/query` — the
same choice phases 31 and 32-06 made, and for the same reason: `/database/query`
runs the SQL while leaving the project's history unaware, so a later
`supabase db push` would try to apply it again.

| File | Recorded as | HTTP |
|---|---|---|
| `20260807010000_policies_to_capabilities.sql` | `20260806154724 policies_to_capabilities` | **200** |

The endpoint assigns its own version from the wall clock and ignores the one
supplied in the body — the third time this phase has observed it, and it is
recorded rather than assumed. The history now holds **35** entries against **36**
files; the gap is the pre-existing, unregistered
`20260508000000_drink_token_active_state.sql`, the owner's decision, documented
in `31-VERIFICATION.md` and not repaired here.

Unlike this phase's earlier migrations, **this one is not idempotent by
accident** — it is idempotent by construction: every statement is
`DROP POLICY IF EXISTS` immediately followed by `CREATE POLICY`, so a
re-application replaces each policy with itself.

### The derivation, and why it is not a list somebody typed

`32-POLICY-MAP.md` was produced by a generator that reads
`baseline/32-BASELINE-policies.json` — the committed pre-phase B1 dump — and
**imports the five recognised left-hand sides from
`scripts/rls-baseline-compare.mjs`**, the comparator that will judge the result.
The two lists are one list. If a sixth shape were ever added to the comparator,
the generator would pick it up; if the generator recognised a shape the
comparator does not, the comparator would refuse the output. That coupling is
D-26 made mechanical.

The migration was then generated **from the map**. Every predicate it writes is
Postgres's own rendering of the policy as it stands today, with exactly one
substring replaced per call site.

---

## The counts

| Class | Predicate | Research measured | Derived from B1 | Capability |
|---|---|---|---|---|
| P1 | `is_admin_or_organizer()` — role only, status ignored | 34 | **34** | `staff.manage` |
| P2 | `is_master()` via the helper | 3 | **3** | `master.manage` |
| P3 | inline `EXISTS` — organizer/master **AND `approved`** | 4 | **4** | `catalogue.manage` |
| P4 | inline `EXISTS` — master, no status | 2 | **2** | `master.manage` |
| P5 | `get_user_status() = 'approved'` | 2 | **2** | `membership.active` |
| | | **45** | **45** | |

```
$ grep -c 'DROP POLICY IF EXISTS' …_policies_to_capabilities.sql   45
$ grep -c 'CREATE POLICY'          …_policies_to_capabilities.sql   45
$ grep -c "has_capability('staff.manage')"        34
$ grep -c "has_capability('master.manage')"        5     (3 × P2 + 2 × P4)
$ grep -c "has_capability('catalogue.manage')"     4
$ grep -c "has_capability('membership.active')"    2
$ (has_capability outside a (select …) wrapper, comments excluded)   0
```

Asserted mechanically, not by eye: all 45 `CREATE POLICY` statements reproduce
their B1 `policyname`, `tablename`, `cmd`, `permissive` and `roles` **exactly**;
the DROP set and the CREATE set are equal; no name is created that B1 does not
already hold; there are no duplicates.

### The four `catalogue.manage` policies, named

```
artists_insert_organizer   artists_update_organizer
venues_insert_organizer    venues_update_organizer
```

Exactly the four the plan requires, and nothing else. These are the only four
policies in the product that require an organizer to be `approved`.

---

## Finding 1 — 45 policies, not 43. The plan's arithmetic, not the database.

The plan states *"45 call sites in 43 policies"*, on the ground that
`event_parties_update_own` and `event_parties_delete_own` *"each carry both a P1
and a P2 fragment"*. They do not. Here is `event_parties_update_own`'s `qual`
from the committed baseline:

```
(( SELECT is_admin_or_organizer() AS is_admin_or_organizer) AND ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'master'::text) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_parties.event_id) AND (e.created_by = auth.uid()))))))
```

The first operand is P1 and is replaced. The second is a **scalar sub-select on
`profiles`** — not `is_master()`. It is the same English sentence written a
different way, and it is **not one of the five enumerated left-hand sides**, so
it is not a call site.

**It was not "tidied" into one, and that is the important half.** Two independent
reasons:

1. The comparator enumerates shapes rather than pattern-matching intent. A
   replacement there would come back as `predicate_unexplained` and fail CAP-03 —
   correctly.
2. It would not be behaviour-preserving. `is_master()` is `SECURITY DEFINER` and
   reads `profiles` as its definer; this inline sub-select reads `profiles` **as
   the caller**, so it is itself subject to `profiles_select_own`. They agree
   today only because that policy happens to return the caller's own row.
   Swapping one for the other is a behaviour change dressed as a rename.

**Consequence for the acceptance criteria.** The criteria that say "43" should
read **45**, and the comparator — which tallies **per policy**, not per clause —
will report **45 by T2 · 22 unchanged**, not 43 and 24. The class counts, which
are the numbers the plan said would stop it if they moved, did not move.

---

## Finding 2 — the re-print is now measured, not predicted

Plan 32-06 measured the shape of a `has_capability` call site by creating probe
policies on a throwaway container. This plan measured the real thing: the actual
migration, applied to a container built from this repository's own SQL.

```
policy profiles_update_master
  qual : ( SELECT private.has_capability('master.manage'::text) AS has_capability)
```

Character for character the form
`scripts/rls-baseline-compare.mjs`'s `T2_RIGHT_HAND_SIDE` accepts. The `private.`
qualifier survives; no `NULL::uuid` appears, because every call site passes one
argument.

The offline pre-check agrees, in both renderings:

```
[as-written]    89 clauses unchanged · 0 by T1 · 45 by T2 · 0 by both · 0 unexplained
[as-reprinted]  89 clauses unchanged · 0 by T1 · 45 by T2 · 0 by both · 0 unexplained
  keys the comparator reads back:
    {"master.manage":5,"catalogue.manage":4,"staff.manage":34,"membership.active":2}
```

---

## Finding 3 — the inherited asymmetry survives, measured on the container

Built from the repository including this migration, seeded with nine personas,
every probe rolled back, container destroyed:

```
  organizer/pending    ticket_tiers   insert -> ok:1
  organizer/pending    venues         insert -> 42501
  organizer/approved   ticket_tiers   insert -> ok:1
  organizer/approved   venues         insert -> ok:1
  member/approved      ticket_tiers   insert -> 42501
  member/approved      venues         insert -> 42501
  master/pending       ticket_tiers   insert -> ok:1
  master/pending       venues         insert -> 42501
```

The first four lines are **identical to the pre-phase baseline recorded in
`baseline/README.md`**. A pending organizer may still insert a ticket tier and
may still not insert a venue. **The two answers disagree, which is the whole
point: if they agreed, the two shapes had been collapsed.**

`master/pending` behaving the same way is the P2/P4 equivalence claim showing up
where it should: `master.manage` and `staff.manage` ignore `status`,
`catalogue.manage` does not.

And the same cells read out of the committed B3 artefacts, before and after,
which is the record rather than the transcript:

```
--- container B3 pre              --- container B3 post-07
  organizer/pending  ticket_tiers  ok:1        organizer/pending  ticket_tiers  ok:1
  organizer/pending  venues        42501       organizer/pending  venues        42501
  organizer/pending  artists       42501       organizer/pending  artists       42501
  organizer/approved ticket_tiers  ok:1        organizer/approved ticket_tiers  ok:1
  organizer/approved venues        ok:1        organizer/approved venues        ok:1
  organizer/approved artists       ok:1        organizer/approved artists       ok:1
  member/approved    ticket_tiers  42501       member/approved    ticket_tiers  42501
  member/approved    venues        42501       member/approved    venues        42501
  master/pending     ticket_tiers  ok:1        master/pending     ticket_tiers  ok:1
  master/pending     venues        42501       master/pending     venues        42501
```

Every cell `conclusive_for_rls = true`. Twelve cells, twelve matches.

### CAP-01 evidence (ii), on BOTH targets

```
$ grep -c 'is_admin_or_organizer\|is_master\|get_user_status' \
    baseline/32-BASELINE-policies.post-07.json              0
$ grep -c 'is_admin_or_organizer\|is_master\|get_user_status' \
    baseline/32-BASELINE-policies.container.post-07.json     0
```

On the container, counted directly out of `pg_policies`:

```
  policies calling has_capability: 45
  policies in public            : 67
  policies still naming a helper: 0
```

**Zero of sixty-seven policies still name any of the four inherited helpers.**
That is CAP-01 evidence (ii), now on the applied production database and not
only on a container. The four helper functions themselves still exist — nothing
dropped them, and dropping them is not this plan's business — but no policy
calls one.

---

## The verdict — Task 3

### Production

```
B1 — the policy set
  ✓ B1 — 67 policies, every difference explained by the whitelist
      22 unchanged · 0 by T1 · 45 by T2 · 0 by both · 0 unexplained
      67 roles/permissive pairs compared · policy_count 67 · rls_enabled_tables 20

B2 — the persona read matrix
  ✓ B2 — 220 cells compared
      4/11 personas resolved on this target
      B2 vacuous fraction: 172/220 (78.2%) agreed with a count of zero on a
      globally empty table — that agreement has nothing to do with a policy,
      and it is the honest measure of how much the rest is worth.

B3 — the persona write matrix
  ✓ B3 — 660 cells compared
      B3 proves nothing on 491/660 cells (74.4%): 420 where the persona does not
      exist on this target and no probe was ever sent, and 71 where a probe ran
      but a constraint — not a policy — answered.
      169 of 660 cells carry real evidence.

B5 — the advisor, an oracle that has never read this plan
  ✓ auth_rls_initplan 26 → 20, as stated
      unused_index 12 → 13 — not pinned
      authenticated_security_definer_function_executable 14 → 15 — allowed
  ✓ hook_custom_access_token_enabled still false
  ✓ db_schema still "public,graphql_public"

CAP-03: clean — B1, B2, B3, B5 compared, nothing moved that the whitelist does not explain.
```

**`0 by T1` is the load-bearing zero.** No `auth.uid()` was wrapped. One
transformation, one migration, one whitelist entry to answer to (D-27).

### Container — the one that actually proves something

```
B1  ✓ 67 policies — 22 unchanged · 0 by T1 · 45 by T2 · 0 by both · 0 unexplained
B2  ✓ 220 cells compared — 11/11 personas resolved, vacuous fraction 0/220 (0.0%)
B3  ✓ 660 cells compared — 641 of 660 carry real evidence (19 inconclusive, 2.9%)

CAP-03: clean — B1, B2, B3 compared, nothing moved that the whitelist does not explain.
```

Production's B2 is **78.2% vacuous** and its B3 proves nothing on 74.4% of its
cells, because thirteen of twenty tables are empty and seven of eleven personas
do not exist there. The container's B2 is **0% vacuous** and its B3 carries real
evidence on **641 of 660** cells. Both are restated here so that nobody reads
production's green as the strong result. It is not; the container's is.

### The advisor, lint by lint, with the entity that moved

The comparator compares the advisor's **counts**. A count can hold still while
its membership changes, so the entity lists were diffed by hand:

| Lint | Before | After | The entities that changed |
|---|---|---|---|
| `auth_rls_initplan` | 26 | **20** | **−6, and exactly the six derived**: `artists_delete_master`, `artists_insert_organizer`, `artists_update_organizer`, `venues_delete_master`, `venues_insert_organizer`, `venues_update_organizer` |
| `multiple_permissive_policies` | 46 | **46** | none — **pinned, unmoved** |
| `unindexed_foreign_keys` | 35 | **35** | none — **pinned, unmoved** |
| `function_search_path_mutable` | 13 | **13** | none |
| `anon_security_definer_function_executable` | 14 | **14** | none |
| `authenticated_security_definer_function_executable` | 14 | 15 | `+ public.my_access_context` — **plan 32-06's, not this plan's** |
| `unused_index` | 12 | 13 | `+ private.role_capabilities.idx_role_capabilities_capability` — 32-06's index; **not pinned** (README F3) |

Two of these deserve to be read rather than skimmed.

**`auth_rls_initplan` 26 → 20 is a derivation that matched an oracle.** Before
applying anything, the expectation was computed from the generated SQL: count
the policies whose post-migration predicate still contains a bare `auth.uid()`.
Twenty. The advisor — which has never read this plan — then said twenty, and the
six entities it dropped are **character for character** the six the derivation
named. `32-RESEARCH.md` § (e) class C predicted this in prose; it is now
measured. **No `auth.uid()` was wrapped to achieve it**: those six policies
carried their only bare `auth.uid()` *inside* the inline `EXISTS` that the
capability replacement deletes outright.

**`multiple_permissive_policies` holding at 46 is the independent proof of
T-32-07-02.** If any `CREATE POLICY` had landed *beside* an existing one instead
of replacing it, this count would have risen. It did not, and its entity list is
identical.

**The one allowed lint move is not this plan's, and the flag that allows it is
blunt.** `--allow-lint-move=authenticated_security_definer_function_executable`
allows the *whole lint* to move by any amount — it would equally have hidden a
second `SECURITY DEFINER` function added in `public`. So the entity list was
diffed by hand before the flag was used: **exactly one entity added, and it is
`public.my_access_context`**, created by plan 32-06 and allowed there for the
same reason. Stated because a flag that hides more than it is being asked to
hide should be said out loud, not passed quietly.

---

## The mutation proof — B1 cannot catch a collapse, and B3 can

This was not asked for. It was run because the plan's threat model names
T-32-07-01 — collapsing `catalogue.manage` into `staff.manage` — as the phase's
single unrecoverable defect, and *"the comparator will catch it"* was, until
now, an assumption.

**It is half false, and the false half matters.**

The migration was deliberately mutated — all four `catalogue.manage` call sites
re-pointed at `staff.manage` — and the mutation was **asserted applied before
any result was read**:

```
mutation applied? catalogue.manage call sites = 0 (was 4), staff.manage = 38 (was 34)
```

A container was then built from the mutated repository and compared:

```
  B1 says: ✓ B1 — 67 policies, every difference explained by the whitelist
  ✗ b3_result_changed — organizer/pending × venues × insert
      WIDENING — the database refused this write before and permits it now.
      This is the exact shape CAP-03 forbids.
  ✗ b3_result_changed — organizer/pending × artists × insert
  ✗ b3_result_changed — organizer/pending × venues × update
  ✗ b3_result_changed — organizer/pending × artists × update
  ✗ b3_result_changed — organizer/rejected × … (4 cells)
  ✗ b3_result_changed — master/pending × … (4 cells)
  ✗ b3_result_changed — master/rejected × … (4 cells)
  CAP-03: 16 defects — b3_result_changed

migration restored byte-for-byte: true
  removed mutant artefact 32-BASELINE-policies.container.mutant.json
  removed mutant artefact 32-BASELINE-reads.container.mutant.json
  removed mutant artefact 32-BASELINE-writes.container.mutant.json
```

**B1 passed the collapse.** That is not a bug in the comparator, it is its
design: `explainPredicate` accepts *any* capability key on the right-hand side
of T2, because the key is the free variable it exists to report. A collapsed
mapping is therefore a perfectly legal T2 and B1 says so.

**B3 caught it, sixteen times, and named it a widening.** And every one of those
sixteen cells belongs to a persona that **does not exist in production**:
`organizer/pending`, `organizer/rejected`, `master/pending`, `master/rejected`.
Production has four personas, all `approved`, and its B3 would have passed the
collapse in silence.

> **Consequence for the rest of this phase, and it should be carried forward.**
> The container is not a convenience or a rehearsal. On this specific defect —
> the one the phase was created to prevent — **it is the only detector that
> exists**. A future plan that skips the container capture because production
> came back green has removed the net without noticing.

---

## D-32-A — RESOLVED as deferred, on measured grounds

This executor was instructed that the owner had decided to **convert
`profiles_update_own` like every other policy, accepting that the `42P17`
recursion disappears**, and to prove the privilege-escalation guard refuses by
**denying** rather than by crashing, with five measured probes.

**The instruction was returned to the orchestrator rather than executed, the
premise was measured false, and the orchestrator reversed it: DEFER — do not
redesign the guard in this plan or this phase.** `profiles_update_own` is
untouched, and the phase remains behaviour-unchanged and provably so.

The three measured reasons, kept in full because they are the starting evidence
for whichever phase does the redesign.

### 1. `profiles_update_own` is not one of the five convertible shapes

Its `WITH CHECK`, from the baseline:

```
((auth.uid() = id)
 AND (role   = ( SELECT profiles_1.role   FROM profiles profiles_1 WHERE (profiles_1.id = auth.uid())))
 AND (status = ( SELECT profiles_1.status FROM profiles profiles_1 WHERE (profiles_1.id = auth.uid()))))
```

This is an **unchanged-field guard**: *the role you are writing must equal the
role you already have*. It is not a permission check, and **there is no
capability that means "my role is unchanged"**. "Convert it like every other
policy" has no target — the transformation this plan performs is
`<enumerated predicate> → has_capability('<key>')`, and there is no key to write.

### 2. Wrapping does not remove the recursion either, so 32-09 does not close it

Plan 32-09 owns `profiles_update_own` as CAP-06 class E and wraps its four
`auth.uid()` occurrences. `(select auth.uid())` inside
`(SELECT role FROM profiles WHERE id = (select auth.uid()))` still reads
`profiles` from a policy on `profiles`. **The recursion survives wrapping.** So
no plan currently in this phase removes it.

### 3. Measured: the guard is dead, before and after, all five probes

Two throwaway containers, one built **without** this migration and one **with**
it, otherwise identical. Every probe inside a transaction that was rolled back.

| # | Persona | Attempt | BEFORE | AFTER |
|---|---|---|---|---|
| 1 | `member/approved` | set own `role = 'master'` | **`42P17`** | **`42P17`** |
| 2 | `member/approved` | set own `status = 'approved'` | **`42P17`** | **`42P17`** |
| 3 | `member/approved` | set own `full_name` (non-privileged) | **`42P17`** | **`42P17`** |
| 4 | `member/approved` | set **another** user's `full_name` | **`42P17`** | **`42P17`** |
| 5 | `master/approved` | set **another** row's `status` (approval path) | **`42P17`** | **`42P17`** |

And the policy text itself, before and after, byte for byte the same:

```
BEFORE  policy profiles_update_own
  qual       : (auth.uid() = id)
  with_check : ((auth.uid() = id) AND (role = ( SELECT profiles_1.role FROM profiles profiles_1
               WHERE (profiles_1.id = auth.uid()))) AND (status = ( SELECT profiles_1.status
               FROM profiles profiles_1 WHERE (profiles_1.id = auth.uid()))))

AFTER   policy profiles_update_own
  qual       : (auth.uid() = id)
  with_check : ((auth.uid() = id) AND (role = ( SELECT profiles_1.role FROM profiles profiles_1
               WHERE (profiles_1.id = auth.uid()))) AND (status = ( SELECT profiles_1.status
               FROM profiles profiles_1 WHERE (profiles_1.id = auth.uid()))))
```

**All five collapse to `42P17` — including the two that ought to be ALLOWED.**
That is the honest state of the guard: it does not deny selectively, it crashes
on every update of `profiles` by anyone. The requested distinction between
probes 1–2 (must DENY) and probes 3, 5 (must ALLOW) **cannot be observed until
the guard is redesigned**, and asserting a `42501` where the database says
`42P17` would be exactly the fabricated evidence this phase exists to prevent.

**And the cells stayed where they were, on both targets** — the check that
matters more than the transcript, because it is what the comparator reads:

```
production pre       11 profiles UPDATE cells {"42P17":4,"absent":7}
production post-07   11 profiles UPDATE cells {"42P17":4,"absent":7}
container  pre       11 profiles UPDATE cells {"42P17":11}
container  post-07   11 profiles UPDATE cells {"42P17":11}
```

**No comparator allowance was proposed, and none was needed.** The orchestrator's
instruction on this point was explicit and is worth repeating: if the comparator
had reported anything on those cells it would have been a real finding, not
noise. It reported nothing.

### The redesign, deferred with its options intact

Removing the recursion is **not a transformation, it is a new design** — and
therefore deviation Rule 4, an architectural change no executor may take. The
guard needs a mechanism that can read the caller's *current* role without
reading `profiles` through `profiles`' own policies. The candidates, none of
which this plan implements or endorses:

| Option | Shape | What it costs |
|---|---|---|
| A | a `private.my_role()` / `private.my_status()` `SECURITY DEFINER` pair, called from the `WITH CHECK` | two more definer functions; the guard becomes live and must then be proved by probe |
| B | a `BEFORE UPDATE` trigger comparing `NEW.role` to `OLD.role` | the only option that can see `OLD`; moves the guard out of RLS |
| C | column-level `REVOKE UPDATE (role, status)` from `authenticated` | the narrowest; refuses at grant level, before any policy runs |
| D | leave it dead, and delete the two dead policies in a declared change | honest, but removes the guard entirely and relies on every write going through the service client — which is true today and is a fact, not a design |

Whichever is chosen, it needs **its own phase, its own before/after probes, and
its own comparator allowance**, because it *will* move B3's `profiles` UPDATE
cells on both targets. **This plan moves none of them.** The table above is that
phase's starting evidence, and it is the honest zero point: five probes, one
`42P17` each.

> **The stakes, restated because they do not shrink by being deferred.** After
> whichever rewrite happens, a `member/approved` setting their own
> `role = 'master'` must be **DENIED**. Today it is refused only because the
> policy crashes, and every profile write in the product goes through the
> service-role client, which bypasses RLS entirely
> (`src/app/(admin)/admin/members/actions.ts`, `src/app/api/auth/callback/route.ts:29`,
> `src/app/api/webhooks/sumup/route.ts:87`). There is no error tracking in this
> project. If a future change ever routes a profile update through an
> authenticated client and the guard is live-but-wrong, nothing reports it.

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking] the plan's `43` would have made the file wrong**

- **Found during:** task 1, deriving the map from B1.
- **Issue:** the plan's acceptance criteria pin 43 DROP/CREATE pairs on an
  arithmetic assumption about `event_parties_*_own`. Emitting 43 would have
  required *not* replacing two genuine P1 call sites, or replacing a shape the
  comparator refuses.
- **Fix:** emit 45, derived; report the discrepancy with the evidence rather than
  absorb it. The class counts are unchanged and are what the plan's stop-rule
  actually protects.
- **Commit:** `981c254`

**2. [Rule 3 — Blocking] `--expect-initplan` could not express this plan's derived expectation**

- **Found during:** task 3, running the plan's own stated verification command.
- **Issue:** the plan's `<verify>` says `--expect-initplan=20`.
  `scripts/rls-baseline-compare.mjs` accepted only `26`, `0` or `unchanged`, and
  refused with `FATAL: --expect-initplan="20" is not one of 26, 0, unchanged`.
  The enumeration was written in plan 32-05 on the assumption that only the wrap
  migration can move that number — an assumption `32-RESEARCH.md` § (e) class C
  had already contradicted in prose, and that this migration contradicts in fact.
- **Fix:** accept any non-negative integer, with the reason and the measurement
  written into the source beside the check. **Expressive, not permissive:**
  `--expect-initplan=n` still asserts `initAfter === n` exactly, and a value must
  still be stated — the comparator still refuses to guess.
- **Why not the other option.** The alternative was `--only=B1,B2,B3`, dropping
  B5. That would have removed the only oracle in this phase that has never read
  a plan, on the one migration that moves an advisor count. Blinding a witness to
  avoid widening a flag is the worse trade, and it would not have been visible in
  a green result.
- **Verified:** `npx eslint scripts/rls-baseline-compare.mjs` → no output.
- **Commit:** `0ccdbb1`

### The instruction that was returned instead of executed

The orchestrator instructed this executor to convert `profiles_update_own` and
to record five probes distinguishing DENY from ALLOW. The premise was measured
false and the instruction was **returned at the checkpoint rather than
approximated**. The orchestrator then reversed it. Recorded here because it is
the process working: an executor that had written `42501` where the database says
`42P17` would have produced a document that reads better and proves nothing.

### Done before the review rather than after it, deliberately

The plan's task 2 says *"print three things and wait"*. Three container runs were
made **before** printing them, all on throwaway `postgres:17.6` instances built
from this repository's own SQL, all destroyed, none touching production:

1. `npm run baseline:container -- --smoke` — the file applies. A reviewer should
   not be asked to review a Critical artefact that may not even parse.
2. the escalation probe, twice — the `42P17` table above.
3. the asymmetry probe — the `ok:1` / `42501` table above.

`CLAUDE.md`'s *misura due volte* asks that the approach be shown before it acts.
Showing it with measurements rather than with claims is the stronger reading.
**No baseline artefact was captured and no comparator was run before approval** —
that boundary was kept.

### Done in task 3 that the plan did not ask for

The **collapse mutation**, above. The plan asserts that the comparator catches
T-32-07-01; `meta-gates.md` and this project's own mutation-proof discipline say
an assertion of that kind is worth nothing until the invariant is deliberately
broken and the check is watched to fire. It was broken, the mutation was asserted
applied before its result was read, and the result **overturned half the
assumption**: B1 does not catch it, B3-on-the-container does. That is a finding
about the phase's evidence harness, not about this migration, and it would not
have been found by any green result.

### Not done

- **`deferred-items.md`, `32-VALIDATION.md`, `STATE.md`, `ROADMAP.md`** — not
  touched. The first two are shared phase files and plan 32-08 ran in parallel;
  the last two belong to the orchestrator. Everything that would have gone to
  `deferred-items.md` is in *Deferred* below.
- **The four inherited helper functions were not dropped.** No policy calls them
  any more, but `is_admin_or_organizer`, `is_master`, `get_user_role` and
  `get_user_status` still exist, still lack `search_path`, and are still callable
  at `/rest/v1/rpc/…` by an anonymous request — `anon_security_definer_function_executable`
  holds at 14. Dropping them changes who can call what, which is a behaviour
  change this phase forbids. Raised, not fixed.
- **`32-VERIFICATION.md` was not written.** It is the phase's deliverable, not
  this plan's, and it needs the numbers this SUMMARY records — the two vacuous
  fractions and the two lint notes the comparator prints under *"these belong in
  32-VERIFICATION.md"*.

---

## Deferred (for the orchestrator to merge — this worktree did not write the shared file)

- **D-32-A — RESOLVED as deferred by the orchestrator, and now narrower.** It is
  no longer *"keep the recursion or fix it"*: it is *"choose a mechanism for the
  privilege-escalation guard"*, options **A–D** above, in a phase of its own.
  Its starting evidence is the five-probe `42P17` table above, measured before
  and after on two containers. **Plan 32-09 does not close it either** — wrapping
  `auth.uid()` leaves the sub-select on `profiles` intact, so the recursion
  survives that plan too. Worth saying plainly for whoever plans the redesign:
  today the guard refuses by crashing, every profile write in the product goes
  through the service-role client which bypasses RLS entirely, and this project
  has no error tracking. The redesign is the moment that guard becomes load-
  bearing for the first time.
- **D-32-D (new) — the plan's `43` should be `45`** in `32-07-PLAN.md`'s
  acceptance criteria, in `32-VALIDATION.md` if it repeats the number, and in any
  later plan that pins the T2 tally. The comparator's own output now reads
  `22 unchanged · 45 by T2`.
- **D-32-E (new) — `T-32-07-03` understates its own surface.** The threat model
  says `event_media_insert_member` is *"the one policy carrying `TO
  authenticated`"*. Measured on B1: **20 of the 67** carry a non-`{public}` role
  list, **12 of them among the 45 rewritten here**. The mitigation is unaffected
  and is in fact stronger than claimed — `roles` is compared per policy by the
  comparator, and all 45 were asserted equal to B1 before the commit — but the
  sentence is wrong and would mislead a reader who trusted it as a checklist.
- **D-32-F (new) — the container is the only detector for a capability
  collapse.** Measured by mutation, above: B1 accepts a collapsed mapping as a
  legal T2, and the sixteen cells that catch it all belong to personas production
  does not have. Any later plan in this phase that captures production and skips
  the container has removed the net. This belongs in `baseline/README.md` beside
  finding F1, and in `32-VERIFICATION.md`.
- **D-32-G (new) — `--allow-lint-move` is a lint-wide flag, not an entity-wide
  one.** Allowing `authenticated_security_definer_function_executable` for
  32-06's `my_access_context` would equally have hidden a second `SECURITY
  DEFINER` function added in `public`. The entity list was diffed by hand for
  this plan; the flag should eventually take an entity, or every later plan
  repeats the manual step or silently stops doing it.
- **The four inherited helpers are now referenced by no policy, and dropped by
  nobody.** They remain `SECURITY DEFINER` in `public` without `search_path`, and
  `anon` can still execute all four over REST —
  `anon_security_definer_function_executable` holds at 14. Nothing about that
  changed here. What *did* change is the cost of the decision: as of this
  migration they are **unreferenced**, so removing or hardening them is a much
  smaller blast radius than it was yesterday. Raised, not taken.
- **Pre-existing `npm run lint` state** — 21 errors / 108 warnings, none in any
  file this plan opened. This plan changed no TypeScript at all;
  `npx eslint scripts/rls-baseline-compare.mjs` is clean.

---

## Threat Flags

None. This plan opens no network endpoint, adds no auth path and changes no
schema at a trust boundary beyond the 45 policy predicates its own
`<threat_model>` designs. The one surface it *could* have widened —
`public.profiles` UPDATE — is measured unchanged in both directions above.

The plan's own register, with what closed each row:

| Threat | Closed by |
|---|---|
| **T-32-07-01** two shapes collapsed, pending organizer gains the catalogue | two keys by construction; the blocking human review; and the container probe — `organizer/pending` → `ticket_tiers` `ok:1`, → `venues` `42501`. **Plus the mutation**, which proved the probe is the *only* thing that would have caught it |
| **T-32-07-02** a policy added beside an existing one, widening by OR | `DROP` immediately before `CREATE`, 45 = 45; comparator reports 0 `policy_added`; and `multiple_permissive_policies` unmoved at **46**, entity list identical |
| **T-32-07-03** a `TO` clause dropped, so a predicate runs for `anon` | `roles` asserted equal to B1 for all 45 before the commit, and compared per policy by the comparator — 67 roles/permissive pairs. (The threat's own text is wrong about how many policies carry `TO authenticated`; see D-32-E) |
| **T-32-07-04** a mapping typed instead of derived | generated from the committed B1 with the whitelist imported from the comparator; class counts 34/3/4/2/2 asserted, and the generator throws on divergence |
| **T-32-07-05** a half-applied migration | one `BEGIN;`…`COMMIT;`, HTTP 200, and B1 re-captured afterwards showing all 45 moved together |
| **T-32-07-06** a mistake that refuses everyone, found only in production | the container carried the same migration first, and its B2/B3 cover **11 personas and 641 conclusive write cells** against production's 4 and 169 |
| **T-32-07-SC** npm installs | nothing was installed |

---

## Manual verification procedure (there is no test runner)

Written out because in this repository the written procedure is the only evidence
that will exist. This is the procedure for **re-confirming that 45 policies moved
to one definition and no verdict moved with them**. Steps 1–4 need Docker only;
5–7 need `SUPABASE_ACCESS_TOKEN` in `.env.local`. **Nothing below writes a row:
every persona probe runs inside a transaction that is rolled back, and the
capture asserts that separately.**

1. `npm run baseline:container -- --phase-point=check`
   → must build from **36 migration files** and capture B1, B2, B3. A failure
   here means the repository's own SQL no longer composes, and nothing else in
   this document is worth reading.
2. `npm run baseline:compare -- --target=container --only=B1,B2,B3 --after-point=check`
   → must end **`CAP-03: clean`**, with B1 reading
   `22 unchanged · 0 by T1 · 45 by T2 · 0 by both · 0 unexplained`.
   **`0 by T1` is not decoration**: a non-zero there means somebody wrapped an
   `auth.uid()` in a migration whose whitelist entry does not cover it.
3. In that same output, find the twelve `organizer`/`master` × `venues`/
   `ticket_tiers`/`artists` insert cells.
   → `organizer/pending` must read `ok:1` on `ticket_tiers` and **`42501` on
   `venues`**. **If those two ever agree, the two organizer shapes have been
   collapsed and a pending organizer can write the catalogue.** That is the one
   check that cannot be replaced by reading a file.
4. `grep -c 'is_admin_or_organizer\|is_master\|get_user_status' baseline/32-BASELINE-policies.container.check.json`
   → **0**. Any other number means a policy went back to a helper.
5. `npm run baseline:rls -- --phase-point=check`
   → four artefacts, and the run must report both rollback clauses:
   `240 probe strings end in a rollback` and `20/20 row counts re-read and
   unchanged`.
6. `npm run baseline:compare -- --after-point=check --expect-initplan=20 --allow-lint-move=authenticated_security_definer_function_executable`
   → must end **`CAP-03: clean`**. `auth_rls_initplan` must read **20**;
   `multiple_permissive_policies` **46** and `unindexed_foreign_keys` **35** must
   not have moved. `unused_index` may move on its own and is not pinned.
7. Read the `profiles` UPDATE cells of `baseline/32-BASELINE-writes.check.json`
   → still **`42P17` × 4** on production, **× 11** on the container. A `42501`
   there means somebody redesigned the privilege-escalation guard, which is
   **deferred** — it would be a real change, and it needs its own before/after
   evidence, not a passing comparison.

**What must be observed:** two `CAP-03: clean` verdicts, `45 by T2` and `0 by
T1`, `ok:1` **≠** `42501` on the pending organizer, zero helper names, the
advisor at 20/46/35, and the `profiles` cells still `42P17`. Any other result is
a regression on a security boundary — and with no error tracking in this project,
nothing will report it on its own.

**The one thing this procedure cannot tell you:** whether a policy is *right*.
It tells you nothing moved. Sixty-seven policies were inherited, not designed
here, and `42P17` on `profiles` is a faithful recording of a defect, not an
endorsement of it.

---

## Self-Check: PASSED

```
$ [ -f supabase/migrations/20260807010000_policies_to_capabilities.sql ]   FOUND
$ [ -f .planning/…/32-POLICY-MAP.md ]                                      FOUND
$ [ -f baseline/32-BASELINE-policies.post-07.json ]                        FOUND
$ [ -f baseline/32-BASELINE-reads.post-07.json ]                           FOUND
$ [ -f baseline/32-BASELINE-writes.post-07.json ]                          FOUND
$ [ -f baseline/32-BASELINE-advisors.post-07.json ]                        FOUND
$ [ -f baseline/32-BASELINE-policies.container.post-07.json ]              FOUND
$ [ -f baseline/32-BASELINE-reads.container.post-07.json ]                 FOUND
$ [ -f baseline/32-BASELINE-writes.container.post-07.json ]                FOUND
$ git log --oneline --all | grep -c 981c254                                1  (FOUND)
$ git log --oneline --all | grep -c 71bd937                                1  (FOUND)
$ git log --oneline --all | grep -c 0ccdbb1                                1  (FOUND)
$ git diff --diff-filter=D --name-only HEAD~1 HEAD                         (empty — no deletions)
$ grep -c 'DROP POLICY IF EXISTS' …                                        45
$ grep -c 'CREATE POLICY' …                                                45
$ has_capability calls outside a (select …) wrapper, comments excluded     0
$ auth.uid() in executable SQL / wrapped in (select …)                     8 / 0
$ 45 CREATE POLICY blocks asserted equal to B1 on name/table/cmd/
    permissive/roles                                                       0 mismatches
$ CREATE POLICY names absent from B1                                        0
$ POST /v1/projects/{ref}/database/migrations                             HTTP 200
$ npm run baseline:compare … --expect-initplan=20 --allow-lint-move=…     CAP-03: clean
$ npm run baseline:compare … --target=container --only=B1,B2,B3           CAP-03: clean
$ grep -c 'is_admin_or_organizer|is_master|get_user_status' post-07 B1
    production / container                                                 0 / 0
$ npm run build                                                            green
$ npx eslint scripts/rls-baseline-compare.mjs                              no output
$ post-07 artefact scan (uuid, email, project ref, 9 secrets)              7/7 CLEAN
```

- **1 mutation fired, and it was asserted applied before its result was read.**
  The four `catalogue.manage` call sites re-pointed at `staff.manage`; the file
  was re-read and the counts checked (`0` catalogue, `38` staff) before the
  container was built. B3 produced 16 `WIDENING` defects; the migration was
  restored **byte-for-byte** and the three mutant artefacts were deleted, so
  nothing from the mutation is committed.
- `STATE.md`, `ROADMAP.md`, `deferred-items.md` untouched — CONFIRMED.
- `src/lib/capabilities/server.ts`, `src/lib/supabase/middleware.ts` and
  `src/app/(admin)/admin/newsletter/actions.ts` (plan 32-08's files) untouched —
  CONFIRMED, this plan touched no TypeScript at all. Those files were never read
  from this worktree either: 32-08's changes are not merged here, so this
  `npm run build` is green on the code as it stood at the base commit.
- The `node_modules` and `.env.local` symlinks used for the captures were removed
  before every commit; `git status --short` showed only tracked files each time.
  Both paths are gitignored and neither was ever staged.
- The migration file was moved aside during the before/after escalation probe and
  restored in a `finally`; restoration was asserted by the script and re-confirmed
  by `git status`. Same for the mutation.
- **No row was written to production.** The write probes run in a read-write
  transaction because `set local role` is refused under the API's read-only flag;
  the capture reports both safety clauses separately, and both passed:
  `240 probe strings end in a rollback and carry no forbidden token` and
  `20/20 row counts re-read and unchanged after 240 probes`.
