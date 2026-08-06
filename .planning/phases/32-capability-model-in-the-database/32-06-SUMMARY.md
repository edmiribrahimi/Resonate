---
phase: 32-capability-model-in-the-database
plan: 06
subsystem: capability-model
tags: [cap-01, cap-04, rls, private-schema, security-definer, seed, migration]
requires:
  - "32-02 — B4, the surface register whose predicate column constrained every capability definition"
  - "32-04 — the committed pre-phase baseline on both targets, and the container that is the only place organizer/pending exists"
  - "32-05 — scripts/rls-baseline-compare.mjs, the comparator that judged this plan"
provides:
  - "private.capabilities and private.role_capabilities — the catalogue and the grants, as data"
  - "private.has_capability(text, uuid) — the single resolver, the only copy of the profiles-to-grants join"
  - "public.my_access_context() — the one exposed function, argument-less, authenticated only"
  - "src/lib/capabilities/keys.ts — the eight keys named once for TypeScript, with a total-Record build guard"
  - "Capability, RoleCapability and AccessContext in src/types/database.ts"
  - "the measured pg_policies re-print shape of a has_capability call site, which waves 6-9 would otherwise have to guess"
affects:
  - "the production database — two migrations applied, recorded as 20260806150550 and 20260806151221"
  - "nothing in src/ that runs: keys.ts and the three interfaces have no caller yet"
  - "no row-level policy anywhere — B1 is byte-identical to the pre-phase baseline"
tech-stack:
  added: []
  patterns:
    - "the evaluator in SQL in a non-exposed schema, because a policy cannot call TypeScript"
    - "the inherited inconsistency carried as a boolean column on a grant row, not resolved"
    - "one exposed wrapper with no arguments, because the shape of the API is the mitigation when there is no rate limiter to add"
    - "the capability list DERIVED from the predicate, never a second copy of the join"
    - "a prohibition written into the migration WITH its measured reason, because the vendor's own guide recommends the forbidden thing"
key-files:
  created:
    - supabase/migrations/20260807000000_capability_model.sql
    - supabase/migrations/20260807000100_capability_model_fk_index.sql
    - src/lib/capabilities/keys.ts
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.post-06.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.post-06.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.post-06.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-advisors.post-06.json
  modified:
    - src/types/database.ts
decisions:
  - "The two organizer definitions stay two. Sixteen grant rows, eight of them requires_approved = true. Proved on the container: organizer/pending holds exactly staff.manage, organizer.access and door.operate, and holds catalogue.manage false."
  - "door.operate is requires_approved = false on BOTH its grant rows, and the migration says why beside the row: the hole a status check would close is closed in updateMemberRole, and a status check here refuses a pending organizer in front of a queue."
  - "A second migration was written rather than the first edited. The advisor caught that role_capabilities' foreign key had no index of its own; 20260807000000 was already applied, so it is history and is corrected forward."
  - "The measured pg_policies re-print of `(select private.has_capability('staff.manage'))` is `( SELECT private.has_capability('staff.manage'::text) AS has_capability)` — the comparator's prediction is CORRECT, and the `private.` qualifier is preserved where `public.` is resolved away."
  - "Passing p_party_id explicitly changes the re-print to `…('staff.manage'::text, NULL::uuid)…`, which the whitelist does NOT accept. Wave 6 must call the resolver with one argument."
  - "REVOKE EXECUTE … FROM public, anon does not remove service_role's execute, because Supabase grants it by default privilege. service_role also has no USAGE on the private schema. Both measured, neither changed."
metrics:
  tasks: 3
  commits: 3
  duration: ~75 min
  completed: 2026-08-06
---

# Phase 32 Plan 06: The Capability Model, Created and Provably Inert — Summary

The single definition now exists in the production database, in a schema
PostgREST does not serve, and **not one of the 67 row-level policies has moved**.
B1 after is byte-identical to B1 before except for the `phase_point` label the
capture itself writes. That was the point: a model that has been created but not
yet wired changes nothing, and this plan's job was to prove it rather than
assert it.

The inherited inconsistency — the two live definitions of "organizer" — is now
**data**: a boolean on a grant row, visible, queryable, and reproduced on the
one persona that can show it.

---

## What was built

| Object | Where | What it is |
|---|---|---|
| schema `private` | production + container | not in PostgREST's exposed list, so nothing in it is routable |
| `private.capabilities` | 8 rows | the catalogue, read as **data** by phase 34 |
| `private.role_capabilities` | 16 rows | the grants, carrying `requires_approved` |
| `private.has_capability(text, uuid)` | `security definer`, `stable`, `search_path = ''` | the resolver — the **only** copy of the profiles-to-grants join |
| `public.my_access_context()` | `security definer`, `stable`, `search_path = ''`, **no arguments** | the one exposed function; `authenticated` only |
| `idx_role_capabilities_capability` | second migration | the index the first migration owed |
| `src/lib/capabilities/keys.ts` | imports nothing | the eight keys, plus a total-`Record` build guard |
| `Capability` · `RoleCapability` · `AccessContext` | `src/types/database.ts` | the shapes, with their honest limit written beside them |

**Commits**

| Hash | What |
|---|---|
| `4e092c6` | the migration, `keys.ts` and `src/types/database.ts` — one commit, three files |
| `a73a7bf` | the index migration and the four post-06 baseline artefacts |

---

## The three measured constraints, reproduced rather than tidied

### 1. The door capability is `requires_approved = false`

Observed on production after the migration:

```
door.operate grants (both must be requires_approved = false)
  [{"role":"master","requires_approved":false},{"role":"organizer","requires_approved":false}]
```

The reason is written into the catalogue row's own description, not only into a
plan: the hole a status check would close is closed elsewhere, in
`updateMemberRole` (`src/app/(admin)/admin/members/actions.ts:129-134`), which
sets `status = 'approved'` in the same write that grants the organizer role. A
`true` here would lock a pending organizer out of the scanner — the refusal that
happens in front of a queue, which `checkin-offline.md` names as the worse of
the two errors.

### 2. The `organizer/pending` asymmetry is reproduced exactly

Measured on a throwaway `postgres:17.6` built from this repository's own SQL —
the base schema and all 35 migration files — because production holds no
organizer of any status:

```
organizer/pending    -> role=organizer status=pending caps(3) [door.operate, organizer.access, staff.manage]

  organizer/pending  staff.manage           -> true
  organizer/pending  organizer.access       -> true
  organizer/pending  door.operate           -> true
  organizer/pending  catalogue.manage       -> false
  organizer/pending  membership.active      -> false
  organizer/pending  membership.card.view   -> false
  organizer/pending  master.manage          -> false
  organizer/pending  admin.access           -> false
```

**Exactly three, and exactly the right three.** `catalogue.manage` is false,
which is the P3 half of the disagreement; `staff.manage` is true, which is the
P1 half. Neither was tidied into the other.

The whole nine-persona matrix, for the record:

| persona | capabilities |
|---|---|
| `anon` | **refused** `42501` — cannot execute `my_access_context` at all |
| `master/approved` | 8 — all of them |
| `master/pending` | 5 — `admin.access`, `door.operate`, `master.manage`, `organizer.access`, `staff.manage` |
| `organizer/approved` | 6 |
| `organizer/pending` | 3 |
| `organizer/rejected` | 3 — same as pending, because every predicate it holds ignores status |
| `member/approved` | 2 — `membership.active`, `membership.card.view` |
| `member/pending` | 0 |
| `member/rejected` | 0 |

`master/pending` holding five is not a bug: P2 and P4 read `role = 'master'` and
neither reads `status`, and the migration says so beside the `master.manage`
row rather than leaving the equivalence to be re-derived.

### 3. D-32-A is untouched — and one design consequence must be stated

Nothing in this plan reads, writes or rewrites a policy on `public.profiles`.
The `42P17` cells in B3 are unchanged (the comparator confirms B3 clean over
660 cells), and no decision was taken implicitly.

**But there is a consequence of this design that constrains the D-32-A
decision, and it should be on the record before wave 7 rather than discovered
during it.**

`private.has_capability` is `SECURITY DEFINER`. It reads `public.profiles` as
its definer, so it does **not** evaluate the policies on `public.profiles` and
cannot itself recurse. That is correct and necessary — a resolver that
evaluated `profiles`' own policies would recurse on every table in the product.

The consequence: **if wave 6 converts `profiles_update_own`'s `WITH CHECK` by
replacing its sub-select with a capability call, the recursion disappears as a
side effect.** Two dead policies would become live ones. That is a widening, and
CAP-03 forbids it — so it must be a declared decision, not a by-product of a
rewrite made for a different reason.

Neither of D-32-A's two options is foreclosed by anything here. What is
foreclosed is the possibility of taking the decision *silently*: the comparator
fails on any change to those cells and names the direction (mutation N3b in
`32-05-SUMMARY.md`).

---

## The predicate shape actually produced — measured, not predicted

**This plan produced no policy predicate at all**, because it created no policy.
So the comparator's predicted right-hand side was still untested after it, and
wave 6 would have been the first to find out. Rather than leave that, the shape
was measured on a throwaway container by creating four probe policies, dumping
`pg_policies`, and destroying the container. Production was never touched.

| Source, as a wrap migration would write it | What `pg_policies` re-prints |
|---|---|
| `(select private.has_capability('staff.manage'))` | `( SELECT private.has_capability('staff.manage'::text) AS has_capability)` |
| `private.has_capability('staff.manage')` (unwrapped) | `private.has_capability('staff.manage'::text)` |
| `(select private.has_capability('staff.manage', null))` | `( SELECT private.has_capability('staff.manage'::text, NULL::uuid) AS has_capability)` |
| `(select auth.uid()) = user_id` | `(( SELECT auth.uid() AS uid) = user_id)` |

**The comparator's prediction is correct.** The first and fourth rows are
character-for-character the forms `scripts/rls-baseline-compare.mjs` enumerates.
`predicate_unexplained` will not fire for the re-print reason.

Two details worth carrying forward:

1. **The `private.` qualifier is preserved**, where `public.` is resolved away
   (`(SELECT public.is_admin_or_organizer())` comes back as
   `( SELECT is_admin_or_organizer() AS is_admin_or_organizer)`). The whitelist
   already expects `private.has_capability`; this confirms it must.
2. **Do not pass `p_party_id` explicitly.** Writing
   `has_capability('x', null)` renders `, NULL::uuid` into the re-print, which
   the whitelist does **not** accept. The parameter exists to be filled by a
   later phase, not to be spelled out now. One argument at every call site.

---

## The verdict

```
B1 — the policy set
  ✓ B1 — 67 policies, every difference explained by the whitelist
      67 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained
      67 roles/permissive pairs compared · policy_count 67 · rls_enabled_tables 20

B2 — the persona read matrix
  ✓ B2 — 220 cells compared

B3 — the persona write matrix
  ✓ B3 — 660 cells compared

B5 — the advisor, an oracle that has never read this plan
  ✓ auth_rls_initplan 26 → 26, as stated
      unused_index 12 → 13 — not pinned: derived from pg_stat_user_indexes.idx_scan
      authenticated_security_definer_function_executable 14 → 15 — allowed by --allow-lint-move=…
  ✓ hook_custom_access_token_enabled still false — CAP-04 reads live, not from the token
  ✓ db_schema still "public,graphql_public" — the private schema stays unreachable (D-06)

CAP-03: clean — B1, B2, B3, B5 compared, nothing moved that the whitelist does not explain.
```

**B1 is byte-identical**, which is stronger than "clean":

```
$ diff 32-BASELINE-policies.json 32-BASELINE-policies.post-06.json
6c6
<   "phase_point": "pre",
---
>   "phase_point": "post-06",
```

One line, and it is the label the capture writes about itself.

### The advisor, lint by lint, with the entity that moved

| Lint | Before | After | The one entity that changed |
|---|---|---|---|
| `auth_rls_initplan` | 26 | **26** | none — identical list |
| `multiple_permissive_policies` | 46 | **46** | none — identical list |
| `unindexed_foreign_keys` | 35 | **35** | none, after the index migration |
| `unused_index` | 12 | 13 | `+ private.role_capabilities.idx_role_capabilities_capability` |
| `function_search_path_mutable` | 13 | **13** | none — neither new function added a fourteenth |
| `anon_security_definer_function_executable` | 14 | **14** | none — `my_access_context` is **absent** |
| `authenticated_security_definer_function_executable` | 14 | 15 | `+ my_access_context` |

The last two rows are the security result and they are worth reading together.
`my_access_context` appears in the `authenticated` list and **not** in the
`anon` list. That is the mechanical proof that
`REVOKE EXECUTE … FROM public, anon` took effect — stronger than the REST call,
because it is the advisor saying it and the advisor has never read this plan.

`function_search_path_mutable` holding at 13 is the second: `set search_path =
''` on both new functions worked, and this phase did not add a fifth violation
to the four it inherited (T-32-06-02).

---

## The exposure boundary, observed from outside

| Call | Key | Result |
|---|---|---|
| `POST /rest/v1/rpc/my_access_context` | anon | **HTTP 401** `42501 permission denied for function my_access_context` |
| `POST /rest/v1/rpc/my_access_context` | service-role | HTTP 200 `{"role": null, "status": null, "capabilities": []}` |
| `POST /rest/v1/rpc/has_capability` | anon | **HTTP 404** `PGRST202 … no matches were found in the schema cache` |
| `POST /rest/v1/rpc/has_capability` | service-role | **HTTP 404** `PGRST202 … no matches were found in the schema cache` |

The service-role row is the argument-less design working rather than a hole:
the most privileged key in the project called the function and learned
**nothing about anybody**, because a service-role token carries no `sub`, so
`auth.uid()` is null and the answer is about no one. There is no identifier to
supply, which is the whole of D-04 — this repository has no rate limiter to add,
so the shape of the API had to be the mitigation.

`has_capability` is 404 under **both** keys because PostgREST serves
`public,graphql_public` and the function is in `private`. That is D-06's claim,
observed rather than reasoned.

### And the tables themselves

```
table privileges of anon/authenticated on the two private tables
  capabilities/anon: false · capabilities/authenticated: false
  role_capabilities/anon: false · role_capabilities/authenticated: false

USAGE on schema private
  anon: true · authenticated: true · service_role: false
```

On the container, both roles asking for the rows directly:

```
  anon           select private.capabilities         -> 42501
  anon           select private.role_capabilities    -> 42501
  authenticated  select private.capabilities         -> 42501
  authenticated  select private.role_capabilities    -> 42501
```

Two independent refusals — no route, and no privilege — which is why the tables
carry no RLS policy and why the migration writes a paragraph saying so and
naming the harmful repair.

---

## What was applied, and how

Through the Management API **migrations** endpoint
(`POST /v1/projects/{ref}/database/migrations`), not `/database/query` — the
same choice phase 31 made and for the same reason: `/database/query` would run
the SQL while leaving the project's history unaware, and a later `supabase db
push` would try to apply it again.

| File | Recorded as | HTTP |
|---|---|---|
| `20260807000000_capability_model.sql` | `20260806150550 capability_model` | 200 |
| `20260807000100_capability_model_fk_index.sql` | `20260806151221 capability_model_fk_index` | 200 |

**The endpoint assigns its own version from the wall clock and ignores the
`version` supplied in the body.** It was supplied, and it was not used — exactly
as in phase 31, where file `20260805120000` was recorded as `20260806111113`.
This is harmless here for the same reason it was harmless there: both files are
idempotent (`IF NOT EXISTS` on every object, `on conflict do nothing` on both
seeds, `CREATE OR REPLACE` on both functions), so a future re-application
changes nothing. Recorded rather than assumed.

The migration history now holds **34** entries against **35** files in the
repository. The gap is the pre-existing, unregistered
`20260508000000_drink_token_active_state.sql`, documented in
`31-VERIFICATION.md` and **not** repaired here — it is the owner's decision and
not this plan's.

---

## Every object reference inside the two functions, checked line by line

The acceptance criterion asks for this to be listed rather than claimed.
Both functions carry `set search_path = ''` (observed in `pg_proc.proconfig`:
`{"search_path=\"\""}` on both), so every reference must be qualified or the
function fails at run time.

**`private.has_capability`** — `public.profiles`, `private.role_capabilities`,
`auth.uid()`. Three references, three qualified. Everything else is an operator
or a keyword (`exists`, `not`, `or`, `=`), which resolves through `pg_catalog`,
always implicitly searched.

**`public.my_access_context`** — `private.capabilities`,
`private.has_capability`, `public.profiles` (twice), `auth.uid()` (twice). Five
references, five qualified. `jsonb_build_object`, `jsonb_agg`, `coalesce` and
the `jsonb` type name are `pg_catalog`.

Both are `prosecdef = true` and `provolatile = 's'` on production and on the
container.

---

## The seed, enumerated

Eight catalogue rows, observed on production:

```
admin.access · catalogue.manage · door.operate · master.manage ·
membership.active · membership.card.view · organizer.access · staff.manage
```

Sixteen grant rows. **Eight of them carry `requires_approved = true`**, observed:

| role | capability |
|---|---|
| master | `catalogue.manage` |
| organizer | `catalogue.manage` |
| master | `membership.active` |
| member | `membership.active` |
| organizer | `membership.active` |
| master | `membership.card.view` |
| member | `membership.card.view` |
| organizer | `membership.card.view` |

The other eight are `false`, and each `false` is a statement about a predicate
that ignores `status` today: the two `staff.manage` rows (P1, 34 policies), the
one `master.manage` row (P2 and P4), the one `admin.access` row, the two
`organizer.access` rows and the two `door.operate` rows.

> **The plan's acceptance criterion says "the four rows with `requires_approved`
> true".** It then enumerates *the `catalogue.manage` pair and the
> `membership.active` and `membership.card.view` sets* — which is 2 + 3 + 3 = **8**.
> The enumeration is right and the count is an arithmetic slip in the plan. The
> eight rows above are exactly the ones the enumeration names.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] the plan's verify command names a flag that does not exist**

- **Found during:** task 3, running the stated verification.
- **Issue:** the plan writes `npm run baseline:compare -- --after-suffix=post-06`.
  `scripts/rls-baseline-compare.mjs` has no `--after-suffix`; the flag is
  `--after-point`, and an unknown flag is exit 2 by design.
- **Fix:** `--after-point=post-06`. Nothing about the comparison changed.
- **Commit:** `a73a7bf` (evidence only — no script was edited)

**2. [Rule 2 — Missing critical functionality] the new foreign key had no index of its own**

- **Found during:** task 3, by the advisor and not by review — which is the
  point of having an oracle that has never read the plan.
- **Issue:** `private.role_capabilities` has `primary key (role, capability)`
  and a foreign key on `capability`. The primary-key index leads on `role`, so
  the foreign key's column is not served by any index.
  `unindexed_foreign_keys` moved **35 → 36**, and the single added entity was
  `role_capabilities/role_capabilities_capability_fkey`. Nothing else moved it.
- **Why it was fixed rather than waved through:** honestly, **not** for speed —
  at sixteen rows the planner will seq-scan the table whatever indexes exist,
  and an index added to silence an advisor is cargo cult. It was fixed because
  `unindexed_foreign_keys` is one of the three lints plan `32-05` **pins**.
  Leaving it at 36 would mean every later comparison in this phase passing
  `--allow-lint-move=unindexed_foreign_keys`, and that flag would then also
  absorb a genuinely new unindexed foreign key added by a later plan. **The
  index costs one statement; the blunted oracle would have cost six waves.**
  The reasoning is written into the migration, not only here.
- **Fix:** `supabase/migrations/20260807000100_capability_model_fk_index.sql`, a
  **second file**. `20260807000000` was already applied, so it is a historical
  fact and is corrected forward — `supabase-data.md`, gate *migration in avanti*.
- **Verified:** `unindexed_foreign_keys` back to **35**, with an entity list
  identical to the pre-phase baseline. B1, B2 and B3 re-captured and re-compared
  afterwards rather than assumed unaffected.
- **Commit:** `a73a7bf`

**3. [Rule 1 — Bug] `REVOKE ALL ON ALL TABLES IN SCHEMA private` would have been a no-op where the plan places it**

- **Found during:** task 1, writing the file.
- **Issue:** the plan lists the revoke in step 1, beside `CREATE SCHEMA`.
  `REVOKE … ON ALL TABLES IN SCHEMA` expands to the tables that exist **at the
  moment it runs**, so written before the two `CREATE TABLE`s it would have
  silently applied to nothing — a statement that reads like a guard and is not.
- **Fix:** moved below both tables, with the ordering reason written beside it,
  in the style `20260805120000_door_scan_events.sql:172-175` uses for its own
  order-dependent pair.
- **Verified on production:** `any_privilege` is `false` for `anon` and
  `authenticated` on both tables.
- **Commit:** `4e092c6`

### Deviation in process, not in code

**Tasks 1 and 2 share one commit, deliberately.** The executor contract asks for
one commit per task; the plan's task 3 and `supabase-data.md`'s gate *tipi
allineati* both ask for the migration and `src/types/database.ts` to move
**together**. `meta-gates.md` resolves a gate conflict in favour of the more
restrictive and requires the conflict to be documented in the commit — which it
is. Task 1 was briefly committed alone (`57d22cb`) and folded back with
`git reset --soft` before anything left this branch; the three files landed as
`4e092c6`. Task 3's own output — the second migration and the four artefacts —
is `a73a7bf`.

### Not done, deliberately

- **`32-VALIDATION.md`, `deferred-items.md`, `STATE.md` and `ROADMAP.md` were
  not touched.** The first two are shared phase files and this plan ran in a
  worktree alongside other agents (`ai-engineering.md`, gate *multi-agent*: two
  agents on one file are sequenced, not parallelised). The last two belong to
  the orchestrator.
- **The four existing helpers were not hardened.** They omit `search_path` and
  the advisor flags all four. Changing who can call what is a behaviour change,
  and this phase forbids one (`32-RESEARCH.md` § *Findings outside scope*).
- **The unregistered migration history entry was not repaired.** Owner's
  decision, recorded in `31-VERIFICATION.md`.

---

## Findings

### F1 — `REVOKE … FROM public, anon` does not remove `service_role`'s execute

Measured:

```
role x function -> has_function_privilege
  anon         private.has_capability      true
  authenticated private.has_capability     true
  service_role private.has_capability      true
  anon         public.my_access_context    FALSE
  authenticated public.my_access_context   true
  service_role public.my_access_context    true
```

`service_role` keeps `EXECUTE` on `my_access_context` despite the revoke,
because Supabase grants it through a **default privilege** on the `public`
schema rather than through `PUBLIC`. The revoke removed `anon`'s — which is what
it was for, and the advisor confirms it independently.

This is recorded because it matters to phase 33: **29 files in this repository
use the service-role client**, and any of them that eventually calls
`my_access_context` will succeed — but will get `{"role": null, "status": null,
"capabilities": []}`, because a service-role token has no `sub`. It will not
error. It will answer "no capabilities" for a client that bypasses RLS entirely.
That is a silent-failure shape (`meta-gates.md`), and the phase that writes the
first caller must not reach for the service client.

`service_role` has **no `USAGE` on `private`**, so it cannot call the resolver
directly at all — a second, independent reason the same mistake fails loudly
rather than quietly.

### F2 — the container's policy count is still 67 with the model applied

`policies in schema public: 67`, `policies in schema private: 0`,
`relrowsecurity false` on both new tables. The container rebuilt from 35
migration files agrees with production on all three. F1 of
`baseline/README.md` — that the container reproduces production's policy set
exactly — survives this plan.

### F3 — `organizer/rejected` holds the same three capabilities as `organizer/pending`

Not a defect, and worth stating because it looks like one: every capability an
organizer holds without approval is granted `requires_approved = false`, and
`false` means *status is not consulted* — not *status must be pending*. A
`rejected` organizer therefore still holds `staff.manage`, `organizer.access`
and `door.operate`.

**That is today's behaviour, faithfully reproduced.** `is_admin_or_organizer()`
reads `role` and contains no `status` at all, so a rejected organizer passes all
34 of its policies today, exactly as it passes all three capabilities here. If
that is wrong it was wrong before this phase, and fixing it is a behaviour
change CAP-03 forbids. Raised here rather than fixed.

### F4 — `npm run lint` fails on pre-existing issues, none of them this plan's

```
$ npx eslint src/lib/capabilities/keys.ts src/types/database.ts
(no output)
```

The repository-wide `npm run lint` reports pre-existing errors and warnings in
files this plan never opened. Not fixed, out of scope. Recorded here rather than
in `deferred-items.md` for the parallel-execution reason above.

---

## What this does not cover

- **No policy calls the resolver yet.** `private.has_capability` exists, is
  correct on nine personas, and is invoked by **nothing** in the database. The
  model is inert by design, and "inert" is exactly what the comparator
  certified.
- **No TypeScript calls anything.** `keys.ts` and the three interfaces have no
  importer. `CAP` is unused; `AccessContext` describes a payload nothing
  requests. That is plan 32-06's scope, and it means the RPC has never been
  called from application code — only from the Management API and from `curl`-
  equivalent fetches in this plan's own verification.
- **The eight keys are not yet checked against the catalogue by anything.**
  `keys.ts` says so in its own doc comment. `scripts/verify-capabilities.mjs`
  (plan 32-10) is the mechanism; until it exists the agreement between the
  TypeScript constant and the eight rows is a convention held by two humans
  reading two files. They were compared side by side for this plan and they
  match — but that is evidence, not a guarantee.
- **The REST call with a real authenticated session was not made, and could not
  be.** The observable subset was: anon (401), service-role (200, empty),
  `has_capability` under both (404). An authenticated PostgREST call needs a
  session, and the only ways to get one were to create a user — which would add
  a `profiles` row and **move B2's fingerprints**, invalidating the very
  comparison this plan exists to make — or to generate a link against a real
  member's account. Neither is acceptable. The authenticated payload was
  therefore proved one layer down instead: through the Management API with
  `set local role authenticated` and a real subject's claims, inside a
  rolled-back transaction. `master/approved` returned 8 capabilities,
  `member/approved` returned 2, both correct. **The gap is the transport, not
  the answer** — and it is stated rather than glossed.
- **`node_modules` and `.env.local` were symlinked in from the main checkout to
  run the build and the captures, and both symlinks were removed before every
  commit.** Both paths are gitignored; neither was ever staged. `git status
  --short` showed only tracked files each time. Same handling as plans 32-01,
  32-03, 32-04 and 32-05.

---

## Manual verification procedure (there is no test runner)

Written out because in this repository the written procedure is the only
evidence that will exist. Nothing below has a user-visible effect yet — the
model is inert — so this is the procedure for **confirming it stayed inert**.

**Who:** anyone holding `SUPABASE_ACCESS_TOKEN` in `.env.local`.

1. `npm run baseline:rls -- --phase-point=<point>` — captures B1, B2, B3, B5.
2. `diff baseline/32-BASELINE-policies.json baseline/32-BASELINE-policies.<point>.json`
   → **must** print exactly one hunk, `phase_point`. Anything else means a
   policy moved.
3. `npm run baseline:compare -- --only=B1,B2,B3,B5 --after-point=<point> --expect-initplan=26 --allow-lint-move=authenticated_security_definer_function_executable`
   → **must** end `CAP-03: clean`.
4. `curl -s -o /dev/null -w '%{http_code}' -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/my_access_context" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H 'Content-Type: application/json' -d '{}'`
   → **must** be `401`. A `200` means the anon revoke was undone.
5. Same call against `/rest/v1/rpc/has_capability` → **must** be `404`. A `200`
   means `private` was added to PostgREST's exposed schemas — the harmful repair
   the migration names.
6. `node scripts/rls-baseline-container.mjs --smoke` → the container must build
   from all 35 migration files without error.

**What must be observed:** one-hunk diff, `CAP-03: clean`, 401, 404, a clean
smoke build. Any other result is a regression on a security boundary, and with
no error tracking in this project nothing will report it on its own.

---

## Threat Flags

None. This plan adds one function to an exposed schema and it is the one the
plan's own `<threat_model>` designs — `T-32-06-01`, mitigated by the
argument-less shape, the `anon` revoke and the two 404s. No new network
endpoint, no new auth path, no schema change at a trust boundary beyond the
one the plan specifies.

---

## Self-Check: PASSED

```
$ [ -f supabase/migrations/20260807000000_capability_model.sql ]      FOUND
$ [ -f supabase/migrations/20260807000100_capability_model_fk_index.sql ] FOUND
$ [ -f src/lib/capabilities/keys.ts ]                                 FOUND
$ [ -f baseline/32-BASELINE-policies.post-06.json ]                   FOUND
$ [ -f baseline/32-BASELINE-reads.post-06.json ]                      FOUND
$ [ -f baseline/32-BASELINE-writes.post-06.json ]                     FOUND
$ [ -f baseline/32-BASELINE-advisors.post-06.json ]                   FOUND
$ git log --oneline --all | grep -c 4e092c6                           1  (FOUND)
$ git log --oneline --all | grep -c a73a7bf                           1  (FOUND)
$ git diff --diff-filter=D --name-only HEAD~2 HEAD                    (empty — no deletions)
$ grep -c '^import' src/lib/capabilities/keys.ts                      0
$ grep -v '^--' …_capability_model.sql | grep -c 'search_path'        2
$ grep -v '^--' …_capability_model.sql | grep -c 'STABLE volatility allows optimizer'   0
$ grep -v '^--' …_capability_model.sql | grep -n 'role_capabilities'
    16: CREATE TABLE IF NOT EXISTS private.role_capabilities (
    47:     join private.role_capabilities rc on rc.role = p.role      <- the ONE join
   128: INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
$ npm run build                                                       green
$ npx eslint src/lib/capabilities/keys.ts src/types/database.ts       no output
$ npm run baseline:compare … --expect-initplan=26 …                   CAP-03: clean, exit 0
$ node …/scan-artefacts.mjs                                           4/4 CLEAN
```

- `grep -c 'role_capabilities'` returns **3**, not 1. The acceptance criterion
  asks that *the join* appear once, and it does — line 47. The other two are the
  `CREATE TABLE` and the seed's `INSERT`, both of which must name the table.
  Enumerated rather than reported as a bare count, because a bare count would
  have looked like a failure.
- All four post-06 artefacts scanned for uuid-shaped strings, email-shaped
  strings, the project reference and the live values of eight secrets: **CLEAN**,
  the same scan `baseline/README.md` records for the pre-phase set.
- `STATE.md` and `ROADMAP.md` untouched — CONFIRMED.
- No file deleted by either commit — CONFIRMED.
- 1 mutation fired and was asserted as applied before its result was read (the
  ninth capability key → `npm run build` fails on the total `Record`; reverted
  and re-verified green).
