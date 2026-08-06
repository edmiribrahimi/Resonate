---
phase: 32
slug: capability-model-in-the-database
date: 2026-08-06
requirements: [CAP-01, CAP-03, CAP-04, CAP-06]
verdict: THREE OF FOUR VERIFIED — CAP-04 structurally proved, its timing demonstration OWED
nyquist_compliant: false
outstanding: "CAP-04 evidence (ii) — the revoke/restore demonstration with five timestamps (§ CAP-04, procedure M-01)"
---

# Phase 32 — Verification

> **There is no test runner for this product.** `package.json` has `dev`, `build`,
> `start`, `lint`, `verify:persona`, `verify:capabilities` and the three baseline
> scripts. No `*.test.*` or `*.spec.*` file exists. **Nothing below is claimed
> verified on the grounds that a suite came back green** — there is no suite.
> Every claim resolves to one of three things: a `file:line` anyone can re-open,
> a pasted command output, or a written manual procedure — and where a procedure
> was **not executed**, this document says so in the same sentence as the claim.
>
> *(The sentence above deliberately avoids the two-word phrase this phase's own
> acceptance criterion greps for — and this note avoids spelling it too, because
> the first draft of this very paragraph quoted the command and tripped its own
> check. A census cannot read a negation: a literal inside a denial counts
> exactly as a literal inside a claim. It is the same shape as
> `32-08-SUMMARY.md`'s census counting a comment as a reader, and it fired here
> within a minute of being written about. **The wording moved; the warning
> stayed.** No claim was softened to satisfy a grep.)*

**The distinction this document keeps, section by section:**

| | |
|---|---|
| **MEASURED** | a command was run and its output is pasted, or an artefact was captured and compared |
| **ARGUED** | an equivalence stated in writing, resting on a measurement made elsewhere and cited |
| **OWED** | a written procedure that has **not** been executed. Deferred is not verified |

---

## The verdict

| Req | Behaviour | Verdict | Evidence kind |
|---|---|---|---|
| **CAP-01** | One definition, three callers | ✅ **green** | file:line + three pasted outputs |
| **CAP-03** | Neither more nor less | ✅ **green** | five artefacts, both targets, comparator clean in both windows |
| **CAP-04** | A grant takes effect on the next request | ⚠️ **structure proved, timing OWED** | two configuration values + the function body + a grep — the demonstration is procedure **M-01**, not executed |
| **CAP-06** | All 26 reviewed, per policy | ✅ **green** | the 26-row review, the advisor at zero, two `EXPLAIN` pairs, two write probes |

**`nyquist_compliant: false`, deliberately.** Phase 31 set the precedent and the
reason holds here: the CAP-04 demonstration is written out and was not run, and a
deliberate `false` with the outstanding item named is worth more than an unearned
`true`. It flips when procedure **M-01** below is executed and its five
timestamps are written into this file.

---

## The final re-capture

All five artefacts were re-captured at `--phase-point=final`, on **both**
targets, and compared in two windows: the isolating one (`post-09 → final`,
which must show *nothing at all* moved after the last migration) and the
whole-phase one (`pre → final`).

```
$ npm run baseline:rls       -- --phase-point=final      # production, B1 B2 B3 B5
$ npm run baseline:container -- --phase-point=final      # container, B1 B2 B3
```

```
container   post-09 → final
  ✓ B1 — 67 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained
  ✓ B2 — 220 cells, 11/11 personas resolved, vacuous 0/220 (0.0%)
  ✓ B3 — 660 cells, 641 carrying real evidence (19 inconclusive, 2.9%)
  CAP-03: clean

container   pre → final
  ✓ B1 — 8 unchanged · 14 by T1 · 39 by T2 · 6 by both · 0 unexplained
  ✓ B2 — 220 cells        ✓ B3 — 660 cells
  CAP-03: clean

production  post-09 → final
  ✓ B1 — 67 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained
  ✓ B2 — 220 cells, 4/11 personas resolved, vacuous 172/220 (78.2%)
  ✓ auth_rls_initplan 0 → 0, as stated (the advisor no longer reports the lint at all)
  ✓ hook_custom_access_token_enabled still false
  ✓ db_schema still "public,graphql_public"
  CAP-03: clean

production  pre → final    (--expect-initplan=0 --allow-lint-move=authenticated_security_definer_function_executable)
  ✓ B1 — 8 unchanged · 14 by T1 · 39 by T2 · 6 by both · 0 unexplained
  ✓ auth_rls_initplan 26 → 0, as stated
      unused_index 12 → 13 — NOT pinned (see § The unused_index correction)
      authenticated_security_definer_function_executable 14 → 15 — allowed; the single
      added entity is public.my_access_context, plan 32-06's, diffed by hand (D-32-G)
  CAP-03: clean
```

**Production's B3 is reported separately because it had to be re-run**, and
because the run that failed is worth a line of its own:

```
production  post-09 → final    ✓ B3 — 660 cells compared    CAP-03: clean
production  pre     → final    ✓ B3 — 660 cells compared    CAP-03: clean
      B3 proves nothing on 491/660 cells (74.4%): 420 where the persona does not
      exist on this target and no probe was ever sent, and 71 where a probe ran
      but a constraint — not a policy — answered.
      169 of 660 cells carry real evidence.
```

**No row was written to production.** The write probes cannot use the API's
read-only flag — `set local role` is refused under it — so they run in a
read-write transaction, and the safety comes from two independent clauses,
reported separately because satisfying one says nothing about the other:

```
clause 1/2: 240 probe strings end in a rollback and carry no forbidden token
clause 2/2: 20/20 row counts re-read and unchanged after 240 probes
```

**The two earlier attempts returned `HTTP 429 ThrottlerException` and neither
printed clause 2/2** — see D-32-M under § *Operational notes*. Clause 1 is
asserted over the whole probe list before a single byte reaches the network, so
nothing could have persisted; but the row-count assertion was not *made* on those
runs, and making it is the discipline. It is made on the run above.

**The two whole-phase B1 tallies are identical on both targets** — `8 unchanged ·
14 by T1 · 39 by T2 · 6 by both · 0 unexplained` — which is a second, independent
statement that the repository's own SQL, applied in order to a throwaway
container, reproduces what production is running.

### The advisor, side by side

| Lint | pre | final | pinned? |
|---|---|---|---|
| `auth_rls_initplan` | **26** | **0** (absent) | the phase's own target |
| `multiple_permissive_policies` | 46 | **46** | **pinned — unmoved** |
| `unindexed_foreign_keys` | 35 | **35** | **pinned — unmoved** |
| `unused_index` | 12 | 13 | **not pinned** |
| `anon_security_definer_function_executable` | 14 | 14 | — |
| `authenticated_security_definer_function_executable` | 14 | 15 | allowed once, entity diffed by hand |
| `function_search_path_mutable` | 13 | 13 | — |
| `auth_leaked_password_protection` | 1 | 1 | — |

`multiple_permissive_policies` holding at **46** across the whole phase is the
independent proof that no `CREATE POLICY` ever landed **beside** an existing one
instead of replacing it. Sixty-five `DROP POLICY IF EXISTS` / `CREATE POLICY`
pairs were applied across two migrations, and the count that would have risen if
one had missed did not move.

### The unused_index correction — `32-VALIDATION.md` was wrong to pin it

`32-VALIDATION.md`'s CAP-03 row pinned `unused_index` at **14** alongside
`multiple_permissive_policies` (46) and `unindexed_foreign_keys` (35). **That
pin is removed, and the file is corrected in this phase.**

The advisor derives that lint from `pg_stat_user_indexes.idx_scan` — it counts
indexes *not scanned since the statistics were last reset*, so it moves as the
database is **used**, with no schema change at all. Measured: `32-RESEARCH.md`
and plan 32-01's capture both read **14** on 2026-08-06; plan 32-04's capture,
**the same day**, read **12**; it has read 13 ever since 32-06 added
`idx_role_capabilities_capability`.

A criterion that fails for a reason unrelated to the change is worse than no
criterion, because it teaches the reader to wave the check through — and the next
time it is the pinned lint that moved. `multiple_permissive_policies` and
`unindexed_foreign_keys` are **structural** — they are properties of the schema,
not of its usage — and they stay pinned. Recorded in `baseline/README.md` § F3
and now in `32-VALIDATION.md`.

---

## CAP-01 — one definition, three callers

> *Every capability is defined once in the database and evaluated by the same
> function whether the caller is a page, a server action, or a row-level policy*
> — `.planning/REQUIREMENTS.md:47`

### (i) Exactly one definition — MEASURED

```sql
select count(*)::int from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where p.proname = 'has_capability';
```

Run against the applied production database, `read_only: true`:

```
-- has_capability definitions in pg_proc
{"n":1}

-- the two functions, schema and security
{"schema":"private","name":"has_capability",   "security_definer":true,"config":"{search_path=\"\"}"}
{"schema":"public", "name":"my_access_context","security_definer":true,"config":"{search_path=\"\"}"}
```

**Exactly one.** Not one per schema, not one overload set — one row in `pg_proc`
across the whole database, and it lives in `private`. Both functions carry
`SET search_path = ''`, so every reference inside them must be schema-qualified
or it fails; `function_search_path_mutable` held at 13 across the phase, which is
the advisor saying the same thing independently.

The definition is `supabase/migrations/20260807000000_capability_model.sql:192-217`
— `LANGUAGE sql`, `STABLE`, `SECURITY DEFINER`, `SET search_path = ''`, one
`select exists` over `public.profiles ⋈ private.role_capabilities`. Its body is
where a per-night grant will be added as a second arm of the same `OR`
(`:201-204`), which is why no policy and no caller changes when that phase lands.

The one exposed wrapper is `public.my_access_context()` at `:262`, revoked from
`public` and `anon` at `:296` and granted to `authenticated` at `:297`.

### (ii) No policy names an inherited helper — MEASURED, both targets

```
$ grep -c 'is_admin_or_organizer\|is_master\|get_user_status' \
    baseline/32-BASELINE-policies.final.json            0
$ grep -c 'is_admin_or_organizer\|is_master\|get_user_status' \
    baseline/32-BASELINE-policies.container.final.json  0

$ grep -o "has_capability('" baseline/32-BASELINE-policies.final.json | wc -l
      45
```

**Zero of sixty-seven policies still name any of the four inherited helpers, and
45 call sites now ask the one definition.** Those 45 are enumerated per policy in
`32-POLICY-MAP.md`, derived from the committed pre-phase B1 dump with the
whitelist imported from the comparator that judges the result, not typed by hand.

### (iii) The four declarations name the same eight keys — MEASURED, both targets

```
$ npm run verify:capabilities -- --target=container

  TS 8 · DB 8 · POLICY 4 (45 call sites in 67 policies) · SRC 4 (230 files walked)
  ✓ 0 · both declarations hold the pre-registered 8 keys
  ✓ 1 · TS and DB name the same keys
  ✓ 2 · every key a policy asks for exists in the catalogue
  ✓ 3 · every key application code asks for exists in the catalogue
  ✓ 4 · every catalogue key is asked for by a policy or by src/
  4/4 green, 0 warnings.
```

`32-10-SUMMARY.md` records the same four numbers on `--target=production`, and
**nine mutations, all nine fired**, each asserted as applied with the check's own
reader before its result was read.

### The three callers, named at `file:line`

| Caller | Where | What it asks |
|---|---|---|
| **the row-level policies** | 45 call sites in 67 policies, enumerated in `32-POLICY-MAP.md`; applied by `supabase/migrations/20260807010000_policies_to_capabilities.sql` | `staff.manage` ×34, `master.manage` ×5, `catalogue.manage` ×4, `membership.active` ×2 |
| **the middleware** | `src/lib/supabase/middleware.ts:84` (the one RPC), rules at `:168`, `:174`, `:181`, `:193` | `door.operate`, `admin.access`, `organizer.access`, `membership.card.view` |
| **a server action** | `src/app/(admin)/admin/newsletter/actions.ts:57`, through `hasCapability` at `src/lib/capabilities/server.ts:191` and `getAccessContext` at `:119` | `admin.access` |

**MEASURED, not argued:** the middleware's round-trip count is unchanged.

```
$ grep -n 'await supabase' src/lib/supabase/middleware.ts
59:  } = await supabase.auth.getUser();
84:    const { data, error } = await supabase.rpc("my_access_context");
```

Two awaited calls — the session refresh the file exists for, and **one** data
call. The `profiles.select("role, status")` that stood there became one
`rpc("my_access_context")`: same count, different question. That matters because
the matcher includes `/api/*`, so this path runs before every door scan, and a
second query here is a second query on a phone on a bad network in front of a
queue.

**VERDICT: CAP-01 green.**

---

## CAP-03 — neither more nor less

> *Existing role behaviour is reproduced exactly by the new model — a master, an
> organizer and a member can do neither more nor less than before this milestone*
> — `.planning/REQUIREMENTS.md:49`

CAP-03 is a **measurement** problem, not a coding one. Sixty-seven policies
cannot be judged by reading a diff, and **a baseline taken after the change is
not a baseline**. The pre-phase capture is committed in a commit that provably
predates the first migration of this phase (`baseline/README.md`).

### The comparator verdicts — MEASURED

Above, under § *The final re-capture*: **four `CAP-03: clean` verdicts**, two
targets × two windows, with the whole-phase B1 tally identical on both targets.

### The two cells that carry the whole argument — MEASURED

The phase's single unrecoverable defect would be collapsing the two live
definitions of "organizer" into one capability. Read out of
`baseline/32-BASELINE-writes.container.final.json`, every cell
`conclusive_for_rls: true`:

```
organizer/pending   ticket_tiers  insert -> ok:1
organizer/pending   venues        insert -> 42501
organizer/pending   artists       insert -> 42501
organizer/approved  ticket_tiers  insert -> ok:1
organizer/approved  venues        insert -> ok:1
member/approved     venues        insert -> 42501
master/pending      ticket_tiers  insert -> ok:1
master/pending      venues        insert -> 42501
```

**`ok:1` ≠ `42501` for `organizer/pending`.** A pending organizer may still
insert a ticket tier and may still not insert a venue — identical to the
pre-phase baseline. Had those two agreed, the shapes had been collapsed. The
phase reproduced the disagreement as **two keys**: `staff.manage`
(`requires_approved = false`, 34 policies) and `catalogue.manage`
(`requires_approved = true`, 4 policies), granted at
`supabase/migrations/20260807000000_capability_model.sql:392-393` and `:399-400`.

`master/pending` reading `ok:1` on `ticket_tiers` and `42501` on `venues` is the
same claim showing up where it should: `master.manage` and `staff.manage` ignore
status, `catalogue.manage` does not.

### The surface register, rebuilt and compared row by row — MEASURED

`baseline/32-BASELINE-surfaces.post.md` is B4 rebuilt from the post-phase code —
rebuilt, not edited.

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
(`src/app/(admin)/admin/newsletter/actions.ts:56`). Every equivalence is stated
against the grant row that makes it true, and the measurement that closes it is
`32-08-SUMMARY.md`'s eleven-persona table: **40 comparable cells, 0 mismatches**,
measured on a throwaway container by calling `public.my_access_context()` as each
persona and applying the four rules to the returned array.

That table is an **oracle and not a tautology**, proved by mutation: mapping
`/admin/scanner` to `admin.access` — which is what inverting the `if` / `else if`
pair does — produced **3 differing cells**, every organizer, at the door.

### The three inconsistencies are still three — MEASURED

`32-BASELINE-surfaces.md` § 7 requires that a phase which returns two has
**resolved** one, and resolving one is a behaviour change however sensible it
looks. Each was re-observed at `--phase-point=final`, not restated:

1. **P1 vs P3 — two definitions of organizer.** The eight cells above.
2. **Nav vs route on `/admin/scanner`.** `src/lib/rbac/roles.ts:64-72` still carries `requireApproved: true`; `src/lib/supabase/middleware.ts:167-171` still admits on `door.operate`, whose two grant rows are `requires_approved = false` (`supabase/migrations/20260807000000_capability_model.sql:416-417`). A pending organizer still sees no link to a route that would still admit them.
3. **The login redirect parameter is dead.** `src/lib/supabase/middleware.ts:149` writes `redirect`; `src/app/(auth)/login/page.tsx:11` reads `next`.

### The census — MEASURED, and the plan's number corrected

| # | Command | B4 | now |
|---|---|---|---|
| 1 | `grep -rl 'x-user-' src \| wc -l` | 46 | **46** |
| 1b | `grep -rlE '\.get\("x-user-' src \| wc -l` | 45 (at `cb35ffc`) | **44** |
| 2b | `grep -rn 'select("role' src \| wc -l` | 21 | **21** |
| 3 | `grep -rl 'getServiceClient' src \| wc -l` | 29 | **29** |
| 4 | `grep -rn 'redirect("/dashboard")' src \| wc -l` | 32 | **32** |
| — | `grep -rnE '(role\|status) (!==\|===) "' src \| wc -l` | 178 | **177** |

`32-11-PLAN.md` expects count 1 to read **45**. It reads **46**, and the reader
census reads **44** — the plan's 45 is produced by neither command, because it
mixes the loose pre-registration with the reader series' decrement. Derived in
full in `baseline/32-BASELINE-surfaces.post.md` § 6 and recorded as **D-32-N**.

The single line that moved in the coverage boundary (178 → 177) is accounted for
exactly: −5 real permission decisions removed, +4 lines added of which **none is
a decision** (two are prose quoting the old predicate, which B4 *requires* for an
equivalence claim; two are `typeof … === "string"` type narrowings). The same
census restricted to files the phase did not touch reads **173 before and 173
after**.

### What this evidence does **not** cover — the honest limits (D-37)

Stated because a green result read without them is a green screen.

| | production | container |
|---|---|---|
| personas resolved | **4 of 11** | **11 of 11** |
| B2 vacuous cells | **172 of 220 (78.2%)** | **0 of 220 (0.0%)** |
| B3 cells carrying real evidence | 169 of 660 | **641 of 660** |
| data | real, and thirteen of twenty tables are **empty** | **synthetic**, seeded, two differently-owned rows per table |

- **Production's B2 is 78.2% vacuous.** A cell is vacuous when the persona saw nothing *and there was nothing to see*: the md5 is that of the empty string and two captures agree for a reason that has nothing to do with a policy.
- **`organizer/pending` does not exist in production.** Neither does any non-approved profile. The personas where the inconsistency this phase had to preserve actually lives are measurable **only** on the container.
- **The container's data is synthetic.** It proves what the policies do to rows of the right shape and ownership; it cannot prove anything about the real distribution of rows.
- **Neither target alone is a baseline. The pair is** — and the same is true of the artefacts, below (D-32-H).

### D-32-H — neither artefact is the safety net; the PAIR is

This must be stated as a pair, because half of it stated alone invites dropping
the other half. Both halves are **measured by mutation**, not argued:

| Defect deliberately introduced | B1 (the policy dump) | B3 on the container |
|---|---|---|
| a **capability collapse** — the four `catalogue.manage` call sites re-pointed at `staff.manage` (32-07) | **passes it in silence** — `explainPredicate` accepts *any* key on the right-hand side of T2, by design | **catches it, 16 times**, and names it `WIDENING`. All 16 cells belong to personas production does not have |
| a **misapplied wrap** — `(select auth.uid() = user_id)` instead of `(select auth.uid()) = user_id` (32-09) | **catches it, twice**, as `predicate_unexplained` | **passes it in silence** — 220 and 660 cells identical, because the misapplication changes performance, not verdicts |

`32-07-SUMMARY.md` concluded *"the container is the only detector"*. That is true
for that defect and **false as a general statement**; `32-09` is the
counter-example. A later plan that drops either artefact has removed half the
net, and the half it drops will be the half that mattered.

**A third detector exists and catches a third defect** (D-32-H, extended by
32-10): neither B1 nor B3 would notice a key spelled differently in `keys.ts` and
in the catalogue, because both artefacts compare a database against itself.
`scripts/verify-capabilities.mjs` is the only thing in the repository that
compares the database against the TypeScript.

**VERDICT: CAP-03 green — with the coverage limits above written down rather than
implied.**

---

## CAP-04 — a permission change takes effect on the next request

> *A per-night grant takes effect immediately, without waiting for a session or
> token to refresh* — `.planning/REQUIREMENTS.md:50`

### (i) The two configuration values — MEASURED

Captured in B5 and re-asserted at `--phase-point=final`, read from
`GET /v1/projects/{ref}/config/auth` by `scripts/rls-baseline.mjs`:

```
$ node -e "…require('baseline/32-BASELINE-advisors.final.json').invariants"
{
  "hook_custom_access_token_enabled": false,
  "jwt_exp": 3600,
  "db_schema": "public,graphql_public"
}
```

```
$ npm run baseline:compare -- --after-point=final --expect-initplan=0 …
  ✓ hook_custom_access_token_enabled still false — CAP-04 reads live, not from the token
  ✓ db_schema still "public,graphql_public" — the private schema stays unreachable (D-06)
```

**These two numbers are the requirement's whole premise.** No custom access-token
hook is enabled, so nothing about a capability is minted into a JWT — and if
anything were, `jwt_exp = 3600` means it would be stale for **up to an hour**
after a change.

### (ii) The structure that makes it true — MEASURED at `file:line`

`supabase/migrations/20260807000000_capability_model.sql:209-216`:

```sql
  select exists (
    select 1
    from public.profiles p
    join private.role_capabilities rc on rc.role = p.role
    where p.id = (select auth.uid())
      and rc.capability = p_capability
      and (not rc.requires_approved or p.status = 'approved')
  );
```

Every call reads `public.profiles` and `private.role_capabilities` **at
evaluation time**. The token contributes exactly one thing — `auth.uid()`, the
subject's identity — and nothing about what that subject may do.

The grant table itself, read live from production at the gate (`read_only: true`)
rather than from the migration file — **16 rows**, which is the precondition
procedure M-01 asserts at its step 6:

```
select count(*) from private.role_capabilities;   ->  16

master     admin.access          false     master     membership.card.view  true
master     catalogue.manage      true      member     membership.card.view  true
organizer  catalogue.manage      true      organizer  membership.card.view  true
master     door.operate          FALSE     master     organizer.access      false
organizer  door.operate          FALSE     organizer  organizer.access      false
master     master.manage         false     master     staff.manage          false
master     membership.active     true      organizer  staff.manage          false
member     membership.active     true
organizer  membership.active     true
```

**The two `door.operate` rows read `requires_approved = false` on the applied
database, not only in the migration file.** That is the door invariant, measured:
a pending organizer holds `door.operate`, and `/admin/scanner` admits them. Those
two rows becoming `true` is the phase's single most dangerous regression, and the
migration says so beside them
(`supabase/migrations/20260807000000_capability_model.sql:414-415`).

There is no cache with a lifetime longer than one render:

```
$ grep -rn 'my_capabilities\|has_capability' src
src/lib/capabilities/keys.ts:18: *   - a string inside a policy body — …
src/lib/capabilities/server.ts:5: * `private.has_capability` (…
src/lib/supabase/middleware.ts:64:  // private.has_capability() the row-level policies ask, …

$ grep -rn 'access_token' src
(no output)
```

**Three hits, all three inside comments; no `src/` file reads a capability from a
token, and no `src/` file reads the access token at all.** The one memoisation
that exists — `cache()` at `src/lib/capabilities/server.ts:119` — was *measured*
rather than assumed in `32-08-SUMMARY.md`: six calls across three requests
produced **three** body runs, one per render, and the counter incremented across
requests, so the cache does **not** span them. A capability cache that did would
serve one session's answer to another, which on this surface is an access-control
failure rather than a performance bug.

### (iii) The demonstration — **OWED, NOT DONE**

**This is the one item in this phase that no static assertion can express.** The
claim is about **elapsed time between a write and a reload**, and the only thing
that can answer it is a human with two browser windows and the Supabase SQL
editor. It was **not executed**: this executor has no account credentials, this
repository has no test runner, and `private` is deliberately unreachable over the
REST API, so there is no in-product path to the grant table and there is not
meant to be.

Saying it was done would be the failure `CLAUDE.md` Guardrail 1 exists to
prevent. It is written out in full as procedure **M-01** below.

**VERDICT: CAP-04 — the premise and the structure are MEASURED; the timing
demonstration is OWED. This is why `nyquist_compliant` is `false`.**

---

## CAP-06 — every row-level policy reviewed for the per-row re-evaluation

> *Every existing row-level policy is reviewed for the performance pattern that
> re-evaluates the current user per row* — `.planning/REQUIREMENTS.md:52`

### (i) The 26-row review — MEASURED, recorded per policy

`32-CAP06-REVIEW.md`, 669 lines. **26 rows**, counted mechanically
(`sed -n '50,90p' 32-CAP06-REVIEW.md | grep -c "^| [0-9]"` → `26`), each carrying
its table, policy, `cmd`, `auth.uid()` occurrences before and after the cutover,
class, transformation and **measured** result. Referenced here rather than
duplicated.

```
rows enumerated from the pre-phase advisor dump: 26
class counts: A 15 · B 2 · C 6 · D 2 · E 1
expected:     A 15 · B 2 · C 6 · D 2 · E 1  -> MATCH
auth.uid() occurrences  pre-phase: 31   post-07: 25
result cells: wrapped in 20260807020000 = 20 · predicate replaced in 20260807010000 = 6
20 + 6 = 26
```

Every advisor entity name was resolved back to **exactly one** pre-phase B1
policy; a resolution producing zero or two matches would have stopped the plan.

### (ii) The advisor moves 26 → 0 — MEASURED

```
                                                    pre   post-07  post-09  final
auth_rls_initplan                                    26        20   absent  absent
multiple_permissive_policies                         46        46       46      46
unindexed_foreign_keys                               35        35       35      35
```

**The advisor does not say zero — it stops speaking.** Supabase emits a row per
lint only when that lint has at least one entity, so `auth_rls_initplan` is
present in one capture and gone from the other. The comparator could not express
that, which made `--expect-initplan=0` **unsatisfiable by any database**; it now
reads an absent lint as a count of zero, and that change was proved by mutation
on all three of its branches.

The entity lists were then diffed by hand: `auth_rls_initplan` **+0 / −20**,
every other lint **+0 / −0**, and the 20 dropped entities are character for
character the 20 policies the wrap migration named.

Confirmed on the final capture:

```
$ grep -o "auth\.uid()"               baseline/32-BASELINE-policies.final.json | wc -l   25
$ grep -o "SELECT auth\.uid() AS uid" baseline/32-BASELINE-policies.final.json | wc -l   25
```

**Twenty-five occurrences, twenty-five wrapped, zero bare.**

### (iii) `EXPLAIN` before and after — MEASURED, with a second-order effect reported

For the two class-D policies (`event_parties_update_own`,
`event_parties_delete_own`) and the class-E policy (`profiles_update_own`),
`32-CAP06-REVIEW.md` § *Proof 2*:

| # | Fact | BEFORE | AFTER |
|---|---|---|---|
| 1 | `auth.uid()`'s body | inlined into the per-row `Filter` | **an `InitPlan`** — the intended change |
| 2 | the correlated `EXISTS` on `event_parties` | `EXISTS(SubPlan n)`, `Index Cond: (e.id = event_parties.event_id)` | `ANY (event_parties.event_id = (hashed SubPlan n).col1)` — **changed shape** |
| 3 | the uncorrelated scalar sub-select on `profiles` | `InitPlan` | `InitPlan` — unchanged |
| 4 | `private.has_capability('staff.manage')` | `InitPlan` | `InitPlan` — unchanged |

Fact 2 **is not glossed**: the `EXISTS` did not become an `InitPlan` — the
criterion's danger is absent — but it is no longer an `EXISTS(SubPlan n)` either.
Once `auth.uid()` became a statement-level constant, every remaining qualifier
inside the subquery was uncorrelated and the planner pulled the correlation out
into a hashed semi-join. That is Postgres's ordinary rewrite and a **second-order
effect of the intended transformation**, not a second transformation.

**That is an argument, and the threat is elevation, so it was put to the database
instead** — an organizer who created event A and not event B, on two containers,
every probe inside `begin … rollback`:

```
                                     BEFORE    AFTER
  organizer/approved OWNED     update  rows:1   rows:1
  organizer/approved OWNED     delete  rows:1   rows:1
  organizer/approved NOT-OWNED update  rows:0   rows:0
  organizer/approved NOT-OWNED delete  rows:0   rows:0
  master/approved    NOT-OWNED update  rows:1   rows:1     (the role='master' branch)

cells that moved between before and after: 0
```

**`rows:1` against `rows:0` for the organizer is the whole proof.** Had the
`EXISTS` been hoisted, the ownership test would have stopped discriminating and
every party of every event would have become writable by every holder of
`staff.manage`.

`profiles_update_own` (class E) **cannot** be planned on either side: it raises
`42P17` at plan time, before and after. That is recorded as the honest absence it
is, with the coupled read `profiles_select_own` captured instead. See D-32-A.

### (iv) The privilege-escalation write probe — MEASURED, before and after, both targets

| Target | Attempt | BEFORE | AFTER |
|---|---|---|---|
| container | `set role = 'master'` | **`42P17`** | **`42P17`** |
| container | `set status = 'approved'` | **`42P17`** | **`42P17`** |
| production | `set role = 'master'` | **`42P17`** | **`42P17`** |
| production | `set status = 'approved'` | **`42P17`** | **`42P17`** |

```
production rollback check: profiles rows 4 -> 4, rows with role='master' 1 -> 1

production pre / post-07 / post-09 / final   11 profiles UPDATE cells {"42P17":4,"absent":7}
container  pre / post-07 / post-09 / final   11 profiles UPDATE cells {"42P17":11}
```

**Unmoved on both targets at all four phase points.** The guard is unchanged —
and it refuses by **crashing**, not by denying. That is D-32-A, deferred by owner
decision, below.

### D-32-I — why the probe had to end in `returning id`

**An `UPDATE` or `DELETE` refused by RLS raises nothing — it matches no row.**
The first version of the class-D probe asked only *"did it error"* and reported
`ok:1` for all eight cells, including the four that had to be refusals. It
measured nothing and looked green. `returning id` turns the verdict into a row
count, and the probe function now **refuses to run** a body that lacks it.

In a repository with no test runner, a probe that cannot fail is worse than no
probe, because it will be quoted. Nothing in `baseline/README.md` warns the next
person writing an ad-hoc probe; it is recorded here instead.

**VERDICT: CAP-06 green.**

---

## Anti-patterns found

**None introduced by this phase.** Scanned across every file the phase created or
modified — the two capability modules, the middleware, the converted server
action, the four migrations, and the four scripts:

```
$ grep -rn 'TODO\|FIXME\|XXX\|HACK' src/lib/capabilities/ src/lib/supabase/middleware.ts \
    "src/app/(admin)/admin/newsletter/actions.ts" scripts/verify-capabilities.mjs \
    scripts/rls-baseline-compare.mjs supabase/migrations/2026080700*.sql \
    supabase/migrations/2026080701*.sql supabase/migrations/2026080702*.sql
(no output)

$ grep -rn 'TODO\|FIXME\|XXX\|HACK\|placeholder\|coming soon' \
    scripts/rls-baseline.mjs scripts/rls-baseline-container.mjs \
    src/lib/capabilities/keys.ts src/lib/capabilities/server.ts
scripts/rls-baseline.mjs:1075:/** The tables a `{{placeholder}}` may point at. */
```

The single hit is a doc comment naming a probe-payload substitution token, not a
stub.

**No stub, no mock, no hardcoded empty value.** `getAccessContext` returns the
empty capability set only for a caller who genuinely has no session
(`src/lib/capabilities/server.ts:97`, `ANONYMOUS_CONTEXT`), and every failure
path **throws** rather than returning a degraded value — because an empty set on
failure would refuse a master exactly the way it refuses a pending member, and
there is no error tracking in this project to tell the two apart.

**Lint state, pre-existing and unchanged:**

```
$ npm run lint
✖ 129 problems (21 errors, 108 warnings)
…  src/lib/supabase/middleware.ts:26:7  error  'pendingCookies' is never reassigned  prefer-const
```

That one error is **pre-existing** — at `:7` before the phase and at `:26` after,
only because a new constant shifted the line. It was deliberately not fixed: an
unrelated tidy-up inside an access-control commit makes that commit harder to
review, which is the wrong trade in this file. It being the *only* error in the
file is also the evidence that the phase introduced none.

**No package was installed by any plan in this phase.** Every script uses `node:`
built-ins plus the already-present `pg` devDependency.

---

## Deferred — and deferred is **not** verified

### Owed to the owner as decisions

**D-32-A — the privilege-escalation guard. DEFERRED BY OWNER DECISION.**

`profiles_update_own`'s `WITH CHECK` is an **unchanged-field guard** — *the role
you are writing must equal the role you already have* — not a permission check.
There is no capability that means *"my role is unchanged"*, so *"convert it like
every other policy"* has no target. It sub-selects `public.profiles` from inside
a policy **on** `public.profiles`, and because permissive `WITH CHECK` clauses
are OR'd and all are evaluated, the recursion also takes down
`profiles_update_master`.

Measured, before and after, on both targets, at all four phase points:

```
production pre / post-07 / post-09 / final   11 profiles UPDATE cells {"42P17":4,"absent":7}
container  pre / post-07 / post-09 / final   11 profiles UPDATE cells {"42P17":11}
```

And the five probes on two otherwise-identical containers, one built without the
cutover migration and one with it:

| # | Persona | Attempt | BEFORE | AFTER |
|---|---|---|---|---|
| 1 | `member/approved` | set own `role = 'master'` — **must DENY** | `42P17` | `42P17` |
| 2 | `member/approved` | set own `status = 'approved'` — **must DENY** | `42P17` | `42P17` |
| 3 | `member/approved` | set own `full_name` — **ought to ALLOW** | `42P17` | `42P17` |
| 4 | `member/approved` | set another user's `full_name` — must DENY | `42P17` | `42P17` |
| 5 | `master/approved` | set another row's `status` — **ought to ALLOW** | `42P17` | `42P17` |

**All five collapse to `42P17`, including the two that ought to be allowed.** The
guard does not deny selectively: it crashes on every update of `public.profiles`
by anyone. **The two `UPDATE` policies on `profiles` are dead** — nothing reaches
them, because every profile write in the product goes through the **service-role
client**, which bypasses RLS entirely: `src/app/api/auth/callback/route.ts:29`,
`src/app/api/webhooks/sumup/route.ts:87`, and eight sites in
`src/app/(admin)/admin/members/actions.ts` (`:128`, `:154`, `:172`, `:200`,
`:234`, `:271`, `:316`).

**Repairing it is a NEW DESIGN, not a transformation** — deviation Rule 4, an
architectural change no executor may take. The options, none of them endorsed
here:

| Option | Shape | What it costs |
|---|---|---|
| **A** | a `private.my_role()` / `private.my_status()` `SECURITY DEFINER` pair, called from the `WITH CHECK` | two more definer functions; the guard becomes live and must then be proved by probe |
| **B** | a `BEFORE UPDATE` trigger comparing `NEW.role` to `OLD.role` | the only option that can see `OLD`; moves the guard out of RLS |
| **C** | column-level `REVOKE UPDATE (role, status)` from `authenticated` | the narrowest; refuses at grant level, before any policy runs |
| **D** | leave it dead and delete the two dead policies in a declared change | honest, but removes the guard entirely and relies on every write going through the service client — which is true today and is a **fact, not a design** |

Whichever is chosen needs **its own phase, its own before/after probes and its own
comparator allowance**, because it *will* move B3's `profiles` UPDATE cells on
both targets. This phase moved none of them, and the table above is that phase's
starting evidence — the honest zero point.

> **The stakes do not shrink by being deferred.** After whichever rewrite happens,
> a `member/approved` setting their own `role = 'master'` must be **DENIED**.
> Today it is refused only because the policy crashes. There is no error tracking
> in this project. If a future change ever routes a profile update through an
> authenticated client while the guard is live-but-wrong, **nothing reports it.**

**D-32-C — `CLAUDE.md` Guardrail 3 is FALSE, and it is wrong in two files.**

The claim, at `CLAUDE.md:140` and — **not previously recorded** — at
`.claude/rules/supabase-data.md:18`:

> «`supabase/schema.sql` contiene **zero** `ENABLE ROW LEVEL SECURITY` e **zero**
> `CREATE POLICY`»

Measured:

```
$ grep -c 'create policy\|CREATE POLICY'      supabase/schema.sql   37
$ grep -ic 'enable row level security'        supabase/schema.sql   11
```

**RLS lives in BOTH `supabase/schema.sql` and `supabase/migrations/`.** The
guardrail exists to prevent one error — *"there is no RLS here"* — and now causes
the opposite and worse one: it tells a reader **not to look where 37 policies
are**. Its *conclusion* still points the right way (the migrations are the source
of truth for what is applied), but `schema.sql` is neither the pre-migration base
nor the current schema: it was maintained alongside five migrations up to phase
26 and then abandoned, so replaying the chain over it fails on a duplicate column
and a duplicate table (`baseline/README.md` § F2).

**Not fixed in this phase, deliberately.** `CLAUDE.md` is the persona, and
`ai-engineering.md` requires any change to it to carry a semantic-version bump, a
`.claude/CHANGELOG.md` entry, a cross-domain coherence review and a green
`npm run verify:persona`. That is its own piece of work, and two agents touching
the persona in parallel must be sequenced rather than parallelised.

**Owed to the owner:** correct both files in one change, stating what
`schema.sql` **is** — a partially-maintained snapshot that is neither the base
nor the current schema — rather than only what it lacks.

**The `?redirect=` / `?next=` mismatch** — `src/lib/supabase/middleware.ts:149`
writes `redirect`, `src/app/(auth)/login/page.tsx:11` reads `next`. An
unauthenticated user bounced from a protected route is never returned to where
they were going. It changes navigation, not access, so it does not touch CAP-03 —
and fixing it inside a constant-behaviour phase would put a behaviour change
inside the one diff that must contain none. **Raised to the owner as its own
item.**

### Carried forward unresolved

**The three inconsistencies of `32-BASELINE-surfaces.md` § 7**, all still live and
all re-observed above: the P1/P3 organizer disagreement, the nav-versus-middleware
mismatch on `/admin/scanner`, and the dead login redirect parameter. **Resolving
any of them is a behaviour change**, which is why none was resolved here — but
they remain three open questions, not three settled facts.

**The four inherited `SECURITY DEFINER` helpers, still in `public` without a
`search_path`.** No policy calls one any more, and nobody dropped them. Measured
on the final advisor capture:

```
function_search_path_mutable_public_get_user_role_…
function_search_path_mutable_public_get_user_status_…
function_search_path_mutable_public_is_admin_or_organizer_…
function_search_path_mutable_public_is_master_…

anon_security_definer_function_executable  14 (includes all four)
```

**`anon` can still execute all four over `/rest/v1/rpc/…`.** What changed is the
cost of the decision, not the decision: as of the cutover they are
**unreferenced**, so removing or hardening them is a far smaller blast radius
than it was. Raised, not taken — dropping them changes who can call what.

**The 46 `multiple_permissive_policies` warnings** and the **35
`unindexed_foreign_keys`**. Both are pinned invariants of this phase's comparator
and both are unmoved; neither is *fixed*. They are structural properties of an
inherited policy set that this phase deliberately did not redesign.

**D-32-K — the four table-gated capabilities have no route of their own, and it
is a known Phase 34 CAP-02 risk.**

`staff.manage`, `master.manage`, `catalogue.manage` and `membership.active` are
asked for **only by policies**. `admin.access`, `organizer.access`,
`door.operate` and `membership.card.view` are asked for **only by `src/`**. The
two consuming sides partition the eight keys exactly — no overlap, no remainder —
and `npm run verify:capabilities` prints the split on every run.

**CAP-02 is *"a capability that exists in the database but is not assigned to a
route fails the production build"* (`.planning/REQUIREMENTS.md:48`). Written that
way, it fails on half the model on day one**, because four of the eight gate
*tables* and will never have a route.

**This line is required, because 32-10's unused-key warning cannot surface the
concern.** All four *are* referenced by policies, so comparison 4 — which flags
only a key asked for by neither a policy nor `src/` — correctly reports zero.
Without this paragraph the exposure exists in no artefact this phase produces,
and Phase 34 meets it cold at its own build gate. **The rule is Phase 34's to
decide; naming the exposure is this phase's to hand over.**

**D-32-L — `verify:capabilities` reads the CATALOGUE, not the GRANTS.**

`private.role_capabilities` is **never read** by that script. A capability
granted to the wrong role passes it unmoved. That is deliberate — grants are
behaviour, and behaviour is what B2 and B3 measure — but it means a green there
is **not a statement about who can do what**. The script says so in its own
closing note, and it is repeated here because **a command with `verify` in its
name will be quoted as if it were.**

```
Note: this asserts that the four declarations name the same keys. It does NOT assert
that a capability is granted to the right roles — private.role_capabilities is not
read here — and it does not assert that any policy is correct.
```

**D-32-G — `--allow-lint-move` is lint-wide, not entity-wide.** Allowing
`authenticated_security_definer_function_executable` for 32-06's
`my_access_context` would equally have hidden a **second** `SECURITY DEFINER`
function added in `public`. The entity list was diffed by hand in 32-06, 32-07,
32-09 and again here. Until the flag takes an entity, every later plan either
repeats the manual step or silently stops doing it.

### Corrections to plan files, so no later document repeats a wrong number

| ID | Where the wrong number is | Says | Measured |
|---|---|---|---|
| **D-32-D** | `32-07-PLAN.md` acceptance criteria | 43 policies | **45** — `event_parties_update_own` / `_delete_own` carry one enumerated fragment each, not two; their second `role = master` test is a scalar sub-select on `profiles`, not `is_master()` |
| **D-32-E** | `32-07-PLAN.md` threat `T-32-07-03` | `event_media_insert_member` is *"the one policy carrying `TO authenticated`"* | **20 of 67** carry a non-`{public}` role list, **12 of them among the 45 rewritten**. The mitigation is unaffected and is in fact stronger than claimed — `roles` is compared per policy — but the sentence would mislead anyone reading it as a checklist |
| **D-32-J** | `32-09-PLAN.md` task 1 | the class-D policies lose one of their two `auth.uid()` occurrences in `20260807010000` | **they lose none.** The residual is 25 tokens, not 23; using the plan's number would have left two unwrapped and finished the advisor at 2 rather than 0 |
| **D-32-N** | `32-11-PLAN.md` task 1 | the `x-user-` census must read 45 | **46 loose, 44 readers.** 45 is produced by neither command; the plan mixes the loose pre-registration with the reader series' decrement |

### Operational notes the next phase will otherwise re-derive

**Migration file names and applied versions differ — verified, and the answer is
benign but only by construction.**

```
$ GET /v1/projects/{ref}/database/migrations   →  36 entries
  …
  20260806150550  capability_model
  20260806151221  capability_model_fk_index
  20260806154724  policies_to_capabilities
  20260806161753  20260807020000_wrap_auth_uid
```

The **files** are named `20260807000000`, `20260807000100`, `20260807010000`,
`20260807020000`; the Management API's migrations endpoint assigned its own
version from the wall clock and ignored the one in the body, every time.

**Consequence, stated rather than assumed: a future `supabase db push` would
attempt to apply all four again**, because none of the four file versions appears
in the remote history. It would be **harmless** — but only because every one of
the four is idempotent by construction, which was checked rather than hoped:

```
$ grep -nE '^(CREATE|ALTER|DROP|GRANT|REVOKE|INSERT|COMMENT|BEGIN|COMMIT)' \
    supabase/migrations/20260807000000_capability_model.sql
  CREATE SCHEMA IF NOT EXISTS · CREATE TABLE IF NOT EXISTS ×2 · CREATE OR REPLACE FUNCTION ×2
  GRANT/REVOKE (idempotent) ×5 · INSERT … ON CONFLICT DO NOTHING ×2
  20260807000100: CREATE INDEX IF NOT EXISTS
  20260807010000 / 20260807020000: DROP POLICY IF EXISTS immediately before CREATE POLICY, 65 pairs
```

Applied in filename order, `…010000` then `…020000`, the end state is the wrapped
one — correct. **The next file added to this directory does not inherit that
property**, and the history gap is one wider than the phase's own: 37 files
against 36 entries, the extra being the pre-existing unregistered
`20260508000000_drink_token_active_state.sql`, the owner's decision, documented in
`31-VERIFICATION.md`.

**A fresh environment cannot be rebuilt from the migrations alone**, and that is
the larger trap. Six of the twenty tables — `profiles`, `events`, `rsvps`,
`attendances`, `event_media`, `newsletter_subscribers` — are created by **no**
migration, and the first migration opens by `ALTER TABLE public.profiles ADD
COLUMN role`. They come from `supabase/schema.sql` **as it stood at the initial
commit**; the current file cannot be replayed over the chain
(`baseline/README.md` § F2). `scripts/rls-baseline-container.mjs` reads that base
from the repository's own object database and asserts the blob hash.

**Post-merge builds need a clean cache.** A stale `.next` produced a **false**
build failure during this phase. `rm -rf .next && npm run build` — green, and
that is the command to use after any merge in phase 33.

**The Management API throttles.** The final production B3 capture returned
`HTTP 429 ThrottlerException` twice before succeeding. Worse: **when the throttle
hits, the safety clause in the capture's `finally` throws too**, because it is
itself a query — so the run reports `clause 1/2` and never prints `clause 2/2`.
Clause 1 is asserted over the whole probe list before a single byte reaches the
network, so no write can have persisted; but the *assertion* was not made on the
aborted runs, and asserting it is the discipline. Recorded as **D-32-M**: the
row-count re-read should retry, or say plainly that it could not be made.

---

## Manual verification procedures — OWED, not done

**Eleven procedures. None of them has been executed.** Ten come from plan 32-08,
whose executor had no account credentials and said so rather than glossing it;
the eleventh is CAP-04's demonstration. They are written out because **in this
repository the written procedure is the only evidence that will ever exist**, and
because a procedure that is owed and named is worth more than one that is quietly
absent.

The measurement made *instead* is stated with each block: the same verdicts were
measured **one layer down**, as real database subjects on a container. That
measures the **decision**; it does not measure the **transport** — cookie →
session → RPC → redirect.

### M-01 — CAP-04: a permission change takes effect on the next request ⚠️ **the phase gate**

**Who:** the owner, with a signed-in `member` account and the Supabase SQL editor.
`private` is deliberately not reachable over the REST API, so there is no
in-product path to the grant table and there is not meant to be.

**The demonstration REVOKES first and restores** (D-35). Grant rows are per role,
so *granting* a capability to `member` would widen access for **every** member for
the length of the demonstration; removing one narrows it, and proves the same
immediacy in both directions.

1. In window A, sign in as a **member**. Open `/membership-card`. It loads. **Note the time to the second.**
2. In the SQL editor:
   ```sql
   delete from private.role_capabilities
    where role = 'member' and capability = 'membership.card.view';
   ```
   **Note the time.**
3. In window A, **reload the page — without signing out and without closing the tab.** It must redirect to `/dashboard`. **Note the time.**
4. In the SQL editor, restore the row:
   ```sql
   insert into private.role_capabilities (role, capability, requires_approved)
   values ('member','membership.card.view',true) on conflict do nothing;
   ```
   **Note the time.**
5. Reload again, still without signing out. `/membership-card` loads. **Note the time.**
6. `select count(*) from private.role_capabilities;` must read **16**.

**What must be observed:** five timestamps; the intervals 2→3 and 4→5 both under
one minute and **neither an hour**; the member never signed out and the tab never
closed, stated explicitly; and the grant table back at 16 rows.

**If the reload does not change the verdict, STOP.** A capability is being cached
somewhere it must not be and CAP-04 fails. Report where.

**Record the result in this file** and set `nyquist_compliant: true` only then.

### M-02 to M-05 — the four routes as a `master`

**Who:** a signed-in account with `role = master`, any status.

- **M-02** `/admin` → **must load**. A bounce to `/dashboard` means `admin.access` is not resolving.
- **M-03** `/admin/scanner` → **must load**.
- **M-04** `/organizer` → **must load**.
- **M-05** `/membership-card` → **must load if the account is `approved`**. If the master is `pending` it must bounce — that is correct and unchanged.

### M-06 to M-09 — the four routes as an approved `member`

**Who:** `role = member`, `status = approved`.

- **M-06** `/admin` → **must bounce to `/dashboard`**
- **M-07** `/admin/scanner` → **must bounce to `/dashboard`**
- **M-08** `/organizer` → **must bounce to `/dashboard`**
- **M-09** `/membership-card` → **must load**

### M-10, M-11 — the converted server action

- **M-10** As `master`, open `/admin/newsletter` and let the subscriber count load → **must succeed**.
- **M-11** As an approved `member`, invoke the same surface → **must redirect to `/dashboard`**, exactly as before.

### M-12 — the door, and the one that must not be got wrong 🚪

**Who:** an account with `role = organizer` and `status = pending`.
**This persona does not exist in production** — production holds one master and
three approved members — **so creating one is part of the test, and it is the
reason production cannot run this check at all.**

**Visit `/admin/scanner` → it must LOAD.**

If it bounces, `door.operate` has acquired a status check and **a pending
organizer has been locked out of the door in front of a queue**. That is the
single most dangerous regression in this phase, it is the error
`checkin-offline.md` calls the worse of the two, and it is the one cell the
container already proves and production cannot.

The container's answer, for what it is worth here: `organizer/pending` ×
`/admin/scanner` reads **PASS** on both the old and the new predicate, and the
two grant rows that make it true are at
`supabase/migrations/20260807000000_capability_model.sql:416-417` with the comment
*"These two rows must not become true."*

### M-13 — the degraded path

Temporarily misspell the RPC name at `src/lib/supabase/middleware.ts:84`, reload
any gated route while signed in, and observe **all three**:

1. the bounce to `/dashboard`;
2. `x-capabilities-resolve-failed: 1` in the response headers — browser devtools → Network → **the redirect entry, not the final document**;
3. one `[capabilities.resolve_failed]` line in the server log, carrying the PostgREST code.

Then revert and `diff` against the pristine file rather than trusting the eye.

*(This one was exercised in 32-08 with two asserted mutations and a `curl`, and
the three signals were observed. It is repeated here because it was never
exercised **through a real authenticated browser session**.)*

**What must be observed overall:** eleven loads-or-bounces exactly as tabulated,
one successful and one refused newsletter call, three simultaneous signals on the
degraded path, and CAP-04's five timestamps. **Any single verdict that differs
from `32-08-SUMMARY.md`'s 40-cell table is a CAP-03 defect** — the middleware is
UX, but a UX rule that changed is still a rule that changed.

**The honest limit of the whole set:** it exercises the **transport**. What the
database permits is B1, B2 and B3's subject, and those are measured.

---

## What this phase does not claim

- **That any of the 67 policies is *right*.** They were inherited, not designed here. The comparator says what moved; correctness is a human judgement made against that, and CAP-06 was a **performance** requirement treated as a security one only because two of the policies it touches sit on a trust boundary.
- **That `npm run build` proves anything about a column, a table or an RPC name.** No Supabase client in this repository is parameterised with `Database` (`src/lib/supabase/client.ts:4`, `server.ts:7`, `middleware.ts:15`, `service.ts:4`), so `supabase.rpc("my_access_context")` is untyped and a misspelled capability key is a runtime `false`, not a compile error. That gap is what `scripts/verify-capabilities.mjs` closes.
- **That a failure will be noticed.** There is no error tracking in this project. `x-capabilities-resolve-failed` and the categorised log line make a resolver failure **diagnosable in seconds instead of hours**; they do not make it **noticed**. Nobody is watching.
- **That CAP-02 or CAP-05 moved.** They belong to phases 34 and 33. 44 files still read an `x-user-*` header.

---

## Sign-off

- [x] Baseline captured on both targets **before** the first migration
- [x] `npm run build` green at every task commit (and after `rm -rf .next` here)
- [x] All five artefacts re-captured and compared clean at the phase gate, both targets, both windows
- [ ] **The CAP-04 manual procedure executed, with the timestamps recorded** — **OUTSTANDING (M-01)**
- [x] 26 rows in the CAP-06 review table, each with its class and result
- [ ] `nyquist_compliant: true` — **deliberately `false` until M-01 is executed**

**Requirements:** CAP-01 ✅ · CAP-03 ✅ · CAP-06 ✅ · CAP-04 ⚠️ structure proved,
demonstration owed.

**Approval:** pending the owner, on M-01.
