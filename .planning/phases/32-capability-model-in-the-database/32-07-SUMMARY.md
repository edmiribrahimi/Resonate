---
phase: 32-capability-model-in-the-database
plan: 07
subsystem: capability-model
status: PAUSED — blocking human review at task 2, nothing applied to production
tags: [cap-01, cap-03, rls, policies, migration, checkpoint]
requires:
  - "32-04 — the committed pre-phase B1 dump, which is this plan's only input"
  - "32-05 — scripts/rls-baseline-compare.mjs, whose five enumerated left-hand sides the generator imports"
  - "32-06 — private.has_capability, the resolver these 45 call sites will ask"
provides:
  - "supabase/migrations/20260807010000_policies_to_capabilities.sql — 45 predicate fragments replaced in place, generated from the baseline, NOT YET APPLIED"
  - "32-POLICY-MAP.md — the derived policy → capability mapping, 45 rows plus a full before/after appendix"
  - "a measured correction to the plan's arithmetic: 45 call sites in 45 policies, not 43"
  - "the pg_policies re-print of a has_capability call site, MEASURED on a container rather than predicted"
affects:
  - "nothing yet — no database was written. The migration file exists and applies cleanly on a throwaway container; production is untouched."
tech-stack:
  added: []
  patterns:
    - "the mapping generated FROM the artefact the comparator reads, with the whitelist imported rather than re-typed, so generator and judge cannot drift"
    - "predicate replacement written from Postgres's own re-print, so the re-print after application is idempotent"
    - "the inherited inconsistency reproduced as two keys, and proved by probe rather than by table-reading"
key-files:
  created:
    - supabase/migrations/20260807010000_policies_to_capabilities.sql
    - .planning/phases/32-capability-model-in-the-database/32-POLICY-MAP.md
  modified: []
decisions:
  - "45 policies, not 43. event_parties_update_own and event_parties_delete_own carry ONE enumerated fragment each (P1), not two: their second 'role = master' test is a scalar sub-select on profiles, not is_master(), and is therefore not one of the five recognised shapes. Left untouched."
  - "The scalar profiles sub-select is left alone for a second reason beyond the whitelist: is_master() is SECURITY DEFINER and reads profiles as its definer, while the inline sub-select reads profiles as the caller and is itself subject to profiles_select_own. Swapping one for the other is a behaviour change dressed as a rename."
  - "profiles_update_own is NOT convertible by this plan. Its WITH CHECK is an unchanged-field guard, not a permission check, and no capability means 'my role is unchanged'. The owner's D-32-A instruction cannot be executed here — see the blocker below."
  - "The container was used three times, deliberately, before the review rather than after it: to prove the file applies, to measure the re-print, and to measure the escalation guard and the organizer asymmetry. A reviewer of a Critical artefact should be handed evidence, not a promise."
metrics:
  tasks_completed: 1
  tasks_total: 3
  commits: 1
  duration: ~50 min
  completed: 2026-08-06
---

# Phase 32 Plan 07: The Cutover, Generated and Measured — Not Yet Applied

**Status: PAUSED at the plan's own blocking checkpoint (task 2).** The migration
that rewrites the security boundary of eighteen tables exists, applies cleanly on
a throwaway container, and has been measured. **Nothing has been applied to
production, and nothing will be until the reviewer answers.**

Two things happened that the plan did not anticipate, and both are reported here
rather than absorbed:

1. The policy count is **45**, not 43. The class counts — the numbers that carry
   the safety meaning — match the measured populations exactly.
2. **The owner's D-32-A decision, as transmitted to this executor, cannot be
   executed by this plan.** It is a blocker, not a deviation, and it is stated in
   full below.

---

## What was built

| Artefact | What it is |
|---|---|
| `supabase/migrations/20260807010000_policies_to_capabilities.sql` | 45 `DROP POLICY IF EXISTS` / `CREATE POLICY` pairs, one `BEGIN;`…`COMMIT;`, 18 tables. Generated from the baseline. |
| `.planning/phases/32-capability-model-in-the-database/32-POLICY-MAP.md` | 653 lines: the counts, the three equivalence claims, the 45-row table, a full before/after block per policy, and the offline pre-check. |

**Commit**

| Hash | What |
|---|---|
| `981c254` | the migration and the map — one commit, because the map is the migration's source |

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

### CAP-01 evidence (ii), on the container

```
  policies calling has_capability: 45
  policies in public            : 67
  policies still naming a helper: 0
```

Zero policies still name `is_admin_or_organizer`, `is_master` or
`get_user_status`. That is the evidence CAP-01 asks for — pending its repeat
against production's own B1 in task 3.

---

## BLOCKER — the owner's D-32-A decision cannot be executed by this plan

This executor was instructed that the owner has decided to **convert
`profiles_update_own` like every other policy, accepting that the `42P17`
recursion disappears**, and to prove the privilege-escalation guard refuses by
**denying** rather than by crashing, with five measured probes.

**That instruction cannot be carried out inside plan 32-07, and it was not
carried out.** Three measured reasons, in order of how conclusive they are.

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

### What the owner is actually deciding, stated so it can be decided

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

Whichever is chosen, it needs **its own plan, its own before/after probes, and
its own comparator allowance**, because it will move B3's `profiles` UPDATE cells
on both targets. **This plan moves none of them**, which is why no comparator
allowance is proposed here and why the success criterion asking for one is not
met: there is nothing to allow.

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

### Done before the review rather than after it, deliberately

The plan's task 2 says *"print three things and wait"*. Three container runs were
made **before** printing them, all on throwaway `postgres:17.6` instances built
from this repository's own SQL, all destroyed, none touching production:

1. `npm run baseline:container -- --smoke` — the file applies. A reviewer should
   not be asked to review a Critical artefact that may not even parse.
2. the escalation probe, twice — the table above.
3. the asymmetry probe — the table above.

`CLAUDE.md`'s *misura due volte* asks that the approach be shown before it acts.
Showing it with measurements rather than with claims is the stronger reading. No
baseline artefact was captured and no comparator was run: that is task 3's work
and it remains undone.

### Not done

- **Task 3 in full** — nothing applied to production, no B1/B2/B3/B5 re-capture,
  no comparator run, `npm run build` not run (this commit contains no TypeScript
  and no build input; the build gate belongs to task 3).
- **`deferred-items.md`, `32-VALIDATION.md`, `STATE.md`, `ROADMAP.md`** — not
  touched. The first two are shared phase files and plan 32-08 is running in
  parallel; the last two belong to the orchestrator. Everything that would have
  gone to `deferred-items.md` is in *Deferred* below.

---

## Deferred (for the orchestrator to merge — this worktree did not write the shared file)

- **D-32-A is still open, and is now narrower.** It is no longer "keep the
  recursion or fix it": it is "choose a mechanism for the privilege-escalation
  guard", options A–D above. Plan 32-07 does not touch it; plan 32-09 as written
  does not close it either.
- **D-32-D (new) — the plan's `43` should be `45`** in `32-07-PLAN.md`'s
  acceptance criteria, in `32-VALIDATION.md` if it repeats the number, and in any
  later plan that pins the T2 tally.
- **D-32-E (new) — `T-32-07-03` understates its own surface.** The threat model
  says `event_media_insert_member` is *"the one policy carrying `TO
  authenticated`"*. Measured on B1: **20 of the 67** carry a non-`{public}` role
  list, **12 of them among the 45 rewritten here**. The mitigation is unaffected
  and is in fact stronger than claimed — `roles` is compared per policy by the
  comparator, and all 45 were asserted equal to B1 before the commit — but the
  sentence is wrong and would mislead a reader who trusted it as a checklist.
- **Pre-existing `npm run lint` state** — 21 errors / 108 warnings, none in any
  file this plan opened. This plan changed no TypeScript at all.

---

## Threat Flags

None. This plan opens no network endpoint, adds no auth path and changes no
schema at a trust boundary beyond the 45 policy predicates its own
`<threat_model>` designs. The one surface it *could* have widened —
`public.profiles` UPDATE — is measured unchanged in both directions above.

---

## Manual verification procedure (there is no test runner)

Written out because in this repository the written procedure is the only evidence
that will exist. **Everything below is safe to run now, before approval, because
none of it touches production.**

**Who:** anyone with Docker running. No Supabase credential is needed — the
container runner reads no environment variable at all.

1. `npm run baseline:container -- --smoke`
   → must print `applied the shim, the base schema and 36 migration files` and
   `✓ smoke`. A failure here means the migration does not parse or does not
   apply, and **nothing else in this plan is worth reading**.
2. Open `32-POLICY-MAP.md`, read the class counts.
   → must read **34 / 3 / 4 / 2 / 2**.
3. Read the four rows mapped to `catalogue.manage`.
   → must be exactly `artists_insert_organizer`, `artists_update_organizer`,
   `venues_insert_organizer`, `venues_update_organizer`. **Any fifth name, or any
   of these four appearing under `staff.manage`, is the widening this phase
   exists to prevent — stop there.**
4. Pick any three policies from the map's appendix and find the same name in
   `baseline/32-BASELINE-policies.json`.
   → the `before` string must match `qual`/`with_check` character for character
   after whitespace collapse.
5. `grep -c 'DROP POLICY IF EXISTS'` and `grep -c 'CREATE POLICY'` on the
   migration → both **45**, and equal to each other.
6. Count surviving `auth.uid()` in the migration's executable SQL:
   `grep -v '^--' <file> | grep -o 'auth.uid()' | wc -l` → **8**, and
   `grep -o 'select auth.uid()' | wc -l` → **0**. This plan wraps nothing (D-27).
   (Eight, not 26, because only the eight that sit inside a *rewritten* policy
   appear in this file at all; the other eighteen policies are not opened.)

**What must be observed:** a green smoke build, 34/3/4/2/2, those four names and
no others, three matching before-strings, 45 = 45, and zero wrapped `auth.uid()`.
Any other result means the generated file is not what this document describes.

---

## Self-Check: PASSED

```
$ [ -f supabase/migrations/20260807010000_policies_to_capabilities.sql ]   FOUND
$ [ -f .planning/…/32-POLICY-MAP.md ]                                      FOUND
$ git log --oneline --all | grep -c 981c254                                1  (FOUND)
$ git diff --diff-filter=D --name-only HEAD~1 HEAD                         (empty — no deletions)
$ git status --short                                                       (clean before commit)
$ grep -c 'DROP POLICY IF EXISTS' …                                        45
$ grep -c 'CREATE POLICY' …                                                45
$ has_capability calls outside a (select …) wrapper, comments excluded     0
$ 45 CREATE POLICY blocks asserted equal to B1 on name/table/cmd/
    permissive/roles                                                       0 mismatches
$ CREATE POLICY names absent from B1                                        0
$ npm run baseline:container -- --smoke                                    ✓ 36 migrations
```

- `STATE.md`, `ROADMAP.md`, `deferred-items.md` untouched — CONFIRMED.
- `src/lib/capabilities/server.ts`, `src/lib/supabase/middleware.ts` and
  `src/app/(admin)/admin/newsletter/actions.ts` (plan 32-08's files) untouched —
  CONFIRMED, this plan touched no TypeScript at all.
- The `node_modules` symlink used for the container runs was removed before the
  commit; `git status --short` showed only the two tracked files. It is
  gitignored and was never staged.
- The migration file was moved aside and restored during the before/after probe;
  restoration was asserted by the script and re-confirmed by `git status`.
