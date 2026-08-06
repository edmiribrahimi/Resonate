# CAP-06 — the 26 policies that re-evaluate the current user once per row

**Requirement:** every policy the pre-phase advisor named under
`auth_rls_initplan` is **reviewed and recorded**, one by one, with its class and
its result. Not *changed* — **recorded**. Six of the 26 were already resolved by
the capability cutover in `20260807010000`, and a row that says so is a reviewed
row. A **missing** row is an unreviewed policy (phase decision D-30).

**The transformation itself is unconditionally safe.** `auth.uid()` takes no
arguments, so the wrapped expression cannot depend on row data — which is the
one condition the pattern's own source attaches to it. The danger is entirely in
the larger rewrite the transformation tempts you into, and this document exists
to name the two places where that rewrite would break something.

**Why the wrapper works, and the note that is not repeated.**
`20260224_rbac_migration.sql:97-98` attributes the InitPlan to `STABLE`
volatility. Measured on this database with `EXPLAIN (VERBOSE, COSTS OFF)`: both
`auth.uid()` and `is_admin_or_organizer()` are `STABLE`, and only the **wrapped**
one becomes an InitPlan. It is the `(SELECT …)` syntax, not the volatility
class (phase decision D-32). That wrong note is plausibly what produced these 26
unwrapped call sites in the first place, so it is corrected here and not
repeated in the migration.

---

## Where the 26 come from

Enumerated **mechanically** from `baseline/32-BASELINE-advisors.json` — the
committed pre-phase B5 dump, captured before a line of this phase's DDL existed
— and cross-checked against `baseline/32-BASELINE-policies.json`, the pre-phase
B1 dump. Neither list was typed.

The advisor names an entity as `auth_rls_init_plan_<schema>_<table>_<policy>`.
Each name is resolved back to **exactly one** B1 policy row, and a resolution
that produced zero or two matches would have stopped the plan.

```
rows enumerated from the pre-phase advisor dump: 26
class counts: A 15 · B 2 · C 6 · D 2 · E 1
expected:     A 15 · B 2 · C 6 · D 2 · E 1  -> MATCH
class names not among the 26: none
auth.uid() occurrences  pre-phase: 31   post-07: 25
```

`15 + 2 + 6 + 2 + 1 = 26`, and `15·1 + 2·1 + 6·1 + 2·2 + 1·4 = 31`. Both agree
with `32-RESEARCH.md` § *(e)*.

---

## The 26

`occ pre` is the number of `auth.uid()` tokens in the policy as the **pre-phase**
B1 dump renders it; `occ post-07` the same count after the capability cutover.

| # | Table | Policy | `cmd` | occ pre | occ post-07 | Class | Transformation | Result — measured on the applied post-09 database |
|---|---|---|---|---|---|---|---|---|
| 1 | `artists` | `artists_delete_master` | DELETE | 1 | 0 | C | predicate replaced in `20260807010000` | no bare call survived that migration; the advisor dropped it at post-07 |
| 2 | `artists` | `artists_insert_organizer` | INSERT | 1 | 0 | C | predicate replaced in `20260807010000` | no bare call survived that migration; the advisor dropped it at post-07 |
| 3 | `artists` | `artists_update_organizer` | UPDATE | 1 | 0 | C | predicate replaced in `20260807010000` | no bare call survived that migration; the advisor dropped it at post-07 |
| 4 | `attendances` | `attendances_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 5 | `drink_orders` | `drink_orders_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 6 | `drink_tokens` | `drink_tokens_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 7 | `event_media` | `event_media_delete_own` | DELETE | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 8 | `event_media` | `event_media_insert_member` | INSERT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 9 | `event_media` | `event_media_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 10 | `event_parties` | `event_parties_delete_own` | DELETE | 2 | 2 | **D** | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 11 | `event_parties` | `event_parties_update_own` | UPDATE | 2 | 2 | **D** | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 12 | `events` | `events_delete_own` | DELETE | 1 | 1 | B | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 13 | `events` | `events_select_published` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 14 | `events` | `events_update_own` | UPDATE | 1 | 1 | B | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 15 | `pending_purchases` | `pending_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 16 | `profiles` | `profiles_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 17 | `profiles` | `profiles_update_own` | UPDATE | 4 | 4 | **E** | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 18 | `rsvps` | `rsvps_delete_own` | DELETE | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 19 | `rsvps` | `rsvps_insert_approved` | INSERT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 20 | `rsvps` | `rsvps_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 21 | `ticket_refunds` | `refunds_insert_own` | INSERT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 22 | `ticket_refunds` | `refunds_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 23 | `tickets` | `tickets_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | 0 bare, all wrapped; the advisor names it no longer |
| 24 | `venues` | `venues_delete_master` | DELETE | 1 | 0 | C | predicate replaced in `20260807010000` | no bare call survived that migration; the advisor dropped it at post-07 |
| 25 | `venues` | `venues_insert_organizer` | INSERT | 1 | 0 | C | predicate replaced in `20260807010000` | no bare call survived that migration; the advisor dropped it at post-07 |
| 26 | `venues` | `venues_update_organizer` | UPDATE | 1 | 0 | C | predicate replaced in `20260807010000` | no bare call survived that migration; the advisor dropped it at post-07 |

**The residual set is 20 policies and 25 occurrences.** That number is not a
coincidence and it is not this plan's derivation: it is the advisor's own count
after `20260807010000`, measured and recorded in `32-07-SUMMARY.md` as
`auth_rls_initplan 26 → 20`, with the six dropped entities being character for
character the six class-C rows above.

### A correction to the plan's own arithmetic

`32-09-PLAN.md` task 1 instructs that *"the two class-D policies lose one of
their two"* occurrences in `20260807010000`. **Measured false**, on the applied
post-07 dump: both `event_parties_update_own` and `event_parties_delete_own`
still carry **two** `auth.uid()` tokens each.

The cutover replaced their **P1 fragment** — `(SELECT is_admin_or_organizer())`
— and that fragment contains no `auth.uid()` at all. The two tokens that do
exist live in the scalar sub-select on `profiles` and in the correlated
`EXISTS`, and `32-07-SUMMARY.md` records explicitly that neither was touched:
the scalar sub-select is **not** one of the five enumerated left-hand sides, so
it was left alone.

The arithmetic corrects itself and nothing else moves: 31 − 6 = **25**, not 23.
Had the plan's number been used, two occurrences would have gone unwrapped and
the advisor would have finished at 2 rather than 0.

---

## Class D — why it breaks if applied blindly

`event_parties_update_own` and `event_parties_delete_own` each contain, as
Postgres prints it today:

```
(EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_parties.event_id) AND (e.created_by = auth.uid()))))
```

That subquery references **`event_parties.event_id` — a column of the outer
row**. It is a *correlated* subquery: the planner must evaluate it once per row
of `event_parties`, with that row's `event_id` bound.

Wrapping the `EXISTS` whole — `(select EXISTS (…))` — would ask Postgres to
evaluate it **once per statement**, against no defined outer row. The policies
would stop scoping to the owned event, and every holder of `staff.manage` would
be able to edit and delete every party of every event. That is exactly the
elevation this phase exists to prevent, dressed as an optimisation.

**Only the `auth.uid()` token is wrapped.** Not the `EXISTS`. Not the
comparison `e.created_by = auth.uid()` — wrapping *that* would make it a
correlated subquery, legal, useless, and no longer an InitPlan.

**The warning sign is a diff line that touches `event_parties.event_id`.** Its
*presence* in the file is correct and required; its *modification* is the
defect.

The second `auth.uid()` in the same predicate sits inside
`(SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid())`, which is
**uncorrelated** — it names no column of `event_parties`. It is wrapped for the
same mechanical reason as class A, and its own outer `(SELECT …)` is already an
InitPlan today.

---

## Class E — why it is Critical

`profiles_update_own` is the guard `access-gating.md` names: it forbids a user
changing their own `role` or `status`. Its `WITH CHECK`, as applied:

```
((auth.uid() = id) AND (role = ( SELECT profiles_1.role
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid()))) AND (status = ( SELECT profiles_1.status
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid()))))
```

It reads `profiles` **while updating** `profiles`, so the inner read is itself
subject to `profiles_select_own` — a cross-policy coupling that **no diff of a
single policy will show**. Four occurrences: one in `USING`, three in
`WITH CHECK`.

Wrapping does not change that coupling. `(select auth.uid())` inside
`(SELECT role FROM profiles WHERE id = (select auth.uid()))` still reads
`profiles` from a policy on `profiles`. **This plan does not remove the `42P17`
recursion and does not try to** — that is deferred item **D-32-A**, whose
resolution is a *new design* with options A–D, not a transformation. An executor
may not take it (deviation Rule 4).

The consequence for this plan is a hard constraint, stated so it can be checked
rather than trusted: **the `profiles` UPDATE cells must still read `42P17` after
the migration** — 4 on production, 11 on the container. Only the dedicated write
probe below proves it, and it is recorded before and after.

---

## The bracketing evidence, BEFORE

Captured while `20260807010000` is the newest applied migration and
`20260807020000` does not yet exist.

**Two things about how it was captured, said rather than assumed.** The
`EXPLAIN` runs on a throwaway `postgres:17.6` container built from this
repository's own SQL and destroyed afterwards, because production holds four
personas and none of them is an organizer — the container is where a persona can
be chosen at all. `EXPLAIN` without `ANALYZE` does not execute the statement,
and every probe additionally runs inside a transaction that is rolled back.

**Redaction.** Two seeded primary keys are replaced by `<seeded-party-id>` and
`<seeded-subject>`. They are deterministic synthetic values whose first group is
the literal `32000004`, not anyone's identifier — and `.planning/` is tracked in
a public repository, so they do not go in anyway. Nothing else in the output is
altered.

### Class D — `event_parties_update_own` (UPDATE), persona `master/approved`

```
Update on public.event_parties
  InitPlan 1
    ->  Result
          Output: private.has_capability('staff.manage'::text, NULL::uuid)
  InitPlan 3
    ->  Seq Scan on public.profiles
          Output: profiles.role
          Filter: ((((COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid = profiles.id) OR (InitPlan 2).col1) AND (profiles.id = (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid))
          InitPlan 2
            ->  Result
                  Output: private.has_capability('staff.manage'::text, NULL::uuid)
  InitPlan 12
    ->  Result
          Output: private.has_capability('staff.manage'::text, NULL::uuid)
  InitPlan 13
    ->  Result
          Output: private.has_capability('staff.manage'::text, NULL::uuid)
  InitPlan 15
    ->  Seq Scan on public.profiles profiles_1
          Output: profiles_1.role
          Filter: ((((COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid = profiles_1.id) OR (InitPlan 14).col1) AND (profiles_1.id = (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid))
          InitPlan 14
            ->  Result
                  Output: private.has_capability('staff.manage'::text, NULL::uuid)
  InitPlan 24
    ->  Result
          Output: private.has_capability('staff.manage'::text, NULL::uuid)
  ->  Index Scan using event_parties_pkey on public.event_parties
        Output: event_parties.title, event_parties.ctid
        Index Cond: (event_parties.id = '<seeded-party-id>'::uuid)
        Filter: ((InitPlan 13).col1 AND (((InitPlan 15).col1 = 'master'::text) OR EXISTS(SubPlan 17)) AND (EXISTS(SubPlan 21) OR (InitPlan 24).col1))
        SubPlan 17
          ->  Index Scan using events_pkey on public.events e_2
                Index Cond: (e_2.id = event_parties.event_id)
                Filter: (((e_2.is_published AND ((e_2.early_access_until IS NULL) OR (e_2.early_access_until <= now()) OR ((COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid IS NOT NULL))) OR (InitPlan 16).col1) AND (e_2.created_by = (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid))
                InitPlan 16
                  ->  Result
                        Output: private.has_capability('staff.manage'::text, NULL::uuid)
        SubPlan 21
          ->  Index Scan using events_pkey on public.events e_3
                Index Cond: (e_3.id = event_parties.event_id)
                Filter: (e_3.is_published AND ((e_3.is_published AND ((e_3.early_access_until IS NULL) OR (e_3.early_access_until <= now()) OR ((COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid IS NOT NULL))) OR (InitPlan 20).col1))
                InitPlan 20
                  ->  Result
                        Output: private.has_capability('staff.manage'::text, NULL::uuid)
  SubPlan 5
    ->  Index Scan using events_pkey on public.events e
          Index Cond: (e.id = event_parties.event_id)
          Filter: (((e.is_published AND ((e.early_access_until IS NULL) OR (e.early_access_until <= now()) OR ((COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid IS NOT NULL))) OR (InitPlan 4).col1) AND (e.created_by = (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid))
          InitPlan 4
            ->  Result
                  Output: private.has_capability('staff.manage'::text, NULL::uuid)
  SubPlan 9
    ->  Index Scan using events_pkey on public.events e_1
          Index Cond: (e_1.id = event_parties.event_id)
          Filter: (e_1.is_published AND ((e_1.is_published AND ((e_1.early_access_until IS NULL) OR (e_1.early_access_until <= now()) OR ((COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid IS NOT NULL))) OR (InitPlan 8).col1))
          InitPlan 8
            ->  Result
                  Output: private.has_capability('staff.manage'::text, NULL::uuid)
```

### Class D — `event_parties_delete_own` (DELETE), persona `master/approved`

```
Delete on public.event_parties
  InitPlan 1
    ->  Result
          Output: private.has_capability('staff.manage'::text, NULL::uuid)
  InitPlan 3
    ->  Seq Scan on public.profiles
          Output: profiles.role
          Filter: ((((COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid = profiles.id) OR (InitPlan 2).col1) AND (profiles.id = (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid))
          InitPlan 2
            ->  Result
                  Output: private.has_capability('staff.manage'::text, NULL::uuid)
  InitPlan 12
    ->  Result
          Output: private.has_capability('staff.manage'::text, NULL::uuid)
  ->  Index Scan using event_parties_pkey on public.event_parties
        Output: event_parties.ctid
        Index Cond: (event_parties.id = '<seeded-party-id>'::uuid)
        Filter: ((InitPlan 1).col1 AND (((InitPlan 3).col1 = 'master'::text) OR EXISTS(SubPlan 5)) AND (EXISTS(SubPlan 9) OR (InitPlan 12).col1))
        SubPlan 5
          ->  Index Scan using events_pkey on public.events e
                Index Cond: (e.id = event_parties.event_id)
                Filter: (((e.is_published AND ((e.early_access_until IS NULL) OR (e.early_access_until <= now()) OR ((COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid IS NOT NULL))) OR (InitPlan 4).col1) AND (e.created_by = (COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid))
                InitPlan 4
                  ->  Result
                        Output: private.has_capability('staff.manage'::text, NULL::uuid)
        SubPlan 9
          ->  Index Scan using events_pkey on public.events e_1
                Index Cond: (e_1.id = event_parties.event_id)
                Filter: (e_1.is_published AND ((e_1.is_published AND ((e_1.early_access_until IS NULL) OR (e_1.early_access_until <= now()) OR ((COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid IS NOT NULL))) OR (InitPlan 8).col1))
                InitPlan 8
                  ->  Result
                        Output: private.has_capability('staff.manage'::text, NULL::uuid)
```

### Class E — `profiles_update_own` (UPDATE), persona `member/approved`

```
SQLSTATE 42P17: infinite recursion detected in policy for relation "profiles"
```

**The plan cannot be captured because the policy cannot be planned.** That is
`42P17`, D-32-A, and it is the state this plan must preserve rather than repair.
The nearest thing to an execution plan for the class-E policy is the read it is
coupled to, and that one does plan:

### Class E — the coupled read, `profiles_select_own` (SELECT), persona `member/approved`

```
Index Only Scan using profiles_pkey on public.profiles
  Output: profiles.id
  Index Cond: (profiles.id = '<seeded-subject>'::uuid)
  Filter: (((COALESCE(NULLIF(current_setting('request.jwt.claim.sub'::text, true), ''::text), ((NULLIF(current_setting('request.jwt.claims'::text, true), ''::text))::jsonb ->> 'sub'::text)))::uuid = profiles.id) OR (InitPlan 1).col1)
  InitPlan 1
    ->  Result
          Output: private.has_capability('staff.manage'::text, NULL::uuid)
```

### What to read in those plans

Plan rendering is **not** guaranteed stable run to run (`32-RESEARCH.md`
assumption A6), so the comparison after the change is over these four structural
facts, never over the literal text:

| # | Structural fact, BEFORE |
|---|---|
| 1 | `auth.uid()`'s SQL body is **inlined into a per-row `Filter`** — the `COALESCE(NULLIF(current_setting('request.jwt.claim.sub'…)))::uuid` expression. It is not an InitPlan anywhere. |
| 2 | The correlated `EXISTS` appears as **`EXISTS(SubPlan n)`** with `Index Cond: (e.id = event_parties.event_id)` — a **SubPlan**, evaluated per outer row. |
| 3 | The uncorrelated scalar sub-select on `profiles` appears as an **InitPlan** (`InitPlan 3` / `InitPlan 15` above) — it already is one, because its outer `(SELECT …)` is already wrapped. |
| 4 | `private.has_capability('staff.manage')` appears as an **InitPlan** everywhere it appears. |

Fact 1 is what this migration changes. **Facts 2, 3 and 4 must be unchanged.**
Fact 2 is the one that carries the elevation risk.

### The privilege-escalation write probe, BEFORE

An `approved member` attempting to set their own `role` to `'master'`, then
their own `status`. Both inside `begin … rollback`.

```
container   member/approved  set own role   = 'master'    ->  42P17
container   member/approved  set own status = 'approved'  ->  42P17

production  member/approved  set own role   = 'master'    ->  42P17
production  member/approved  set own status = 'approved'  ->  42P17

  rollback check: profiles rows 4 -> 4
  rollback check: profiles with role='master' 1 -> 1
```

**The attempt is refused.** It is refused by crashing rather than by denying —
which is D-32-A's whole content, and is a defect recorded faithfully, not
endorsed. What CAP-06 requires of *this* plan is narrower and is checkable: the
refusal must be **identical** afterwards, same SQLSTATE, on both targets. A
`42501` appearing here would mean somebody redesigned the guard; a `ok:1` would
mean somebody removed it.

---

## Result

`20260807020000_wrap_auth_uid.sql` was applied to production through the
Management API **migrations** endpoint — not `/database/query`, which runs SQL
while leaving the project's migration history unaware.

| File | Recorded as | HTTP |
|---|---|---|
| `20260807020000_wrap_auth_uid.sql` | `20260806161753 20260807020000_wrap_auth_uid` | **200** |

The endpoint assigned its own version from the wall clock and ignored the one in
the body — the fourth time this phase has observed it. History: **36** entries
against **37** files; the gap is still the pre-existing, unregistered
`20260508000000_drink_token_active_state.sql`, the owner's decision, and not
repaired here.

### The verdict

```
production   post-07 → post-09    (this migration alone)
  ✓ B1 — 67 policies, every difference explained by the whitelist
        47 unchanged · 20 by T1 · 0 by T2 · 0 by both · 0 unexplained
  ✓ B2 — 220 cells compared          ✓ B3 — 660 cells compared
  ✓ auth_rls_initplan 20 → 0, as stated
  CAP-03: clean

container    post-07 → post-09    (this migration alone)
  ✓ B1 — 47 unchanged · 20 by T1 · 0 by T2 · 0 by both · 0 unexplained
  ✓ B2 — 220 cells, 11/11 personas, vacuous 0/220
  ✓ B3 — 660 cells, 641 carrying real evidence
  CAP-03: clean

production   pre → post-09        (the whole phase)
  ✓ B1 — 8 unchanged · 14 by T1 · 39 by T2 · 6 by both · 0 unexplained
  ✓ auth_rls_initplan 26 → 0, as stated
  CAP-03: clean

container    pre → post-09        (the whole phase)
  ✓ B1 — 8 unchanged · 14 by T1 · 39 by T2 · 6 by both · 0 unexplained
  CAP-03: clean
```

**`0 by T2` in the post-07 → post-09 window is the load-bearing zero**: this
migration performed one transformation and only one. The 20 policies it names
are exactly the 20 the review's residual set names.

### Proof 1 — the advisor names none of the 26

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

**`auth_rls_initplan` is not `0` — it is gone**, and that is how the Supabase
advisor says zero: it emits a row per lint only when that lint has at least one
entity. This was measured on these two captures, not assumed, and the
comparator was corrected to read an absent lint as a count of zero. Before the
correction, `--expect-initplan=0` — the terminal state CAP-06 requires — could
not be satisfied by any database.

Entity list diffed **by hand**, post-07 → post-09:

```
auth_rls_initplan:  +0 / -20   (all of them)
every other lint :  +0 / -0
```

And the 20 entities the advisor dropped are, character for character, the 20
policies the migration wrapped — checked mechanically:

```
entities the advisor dropped  : 20
policies the migration wrapped: 20
the two sets are identical, character for character: true
```

**The two pinned lints did not move.** `multiple_permissive_policies` holding at
46 is the independent proof that no `CREATE POLICY` landed *beside* an existing
one instead of replacing it. `unused_index` is not pinned (README F3) and in
fact did not move either.

**`--allow-lint-move` was used only in the whole-phase window**, for
`authenticated_security_definer_function_executable` 14 → 15. D-32-G says that
flag is lint-wide, not entity-wide, so the entity list was diffed by hand:

```
added:   public.my_access_context      (plan 32-06's, not this plan's)
removed: none
```

Exactly one entity, and it is the expected one. **In the window that isolates
this migration, no allowance was needed at all.**

### Proof 2 — `EXPLAIN` after, and a second-order effect that is reported rather than absorbed

The four structural facts, before and after:

| # | Fact | BEFORE | AFTER |
|---|---|---|---|
| 1 | `auth.uid()`'s body | **inlined into the per-row `Filter`** as the `COALESCE(NULLIF(current_setting(…)))::uuid` expression | **an `InitPlan`** (`InitPlan 2`, `6`, `30`, …), evaluated once per statement |
| 2 | the correlated `EXISTS` on `event_parties` | `EXISTS(SubPlan n)`, `Index Cond: (e.id = event_parties.event_id)` | `ANY (event_parties.event_id = (hashed SubPlan n).col1)` — **changed shape** |
| 3 | the uncorrelated scalar sub-select on `profiles` | `InitPlan` | `InitPlan` — unchanged |
| 4 | `private.has_capability('staff.manage')` | `InitPlan` | `InitPlan` — unchanged |

Fact 1 is the intended change and it landed. Facts 3 and 4 are unchanged.

**Fact 2 changed more than the token did, and it must not be glossed.** The
acceptance criterion asked that the `EXISTS` still be a per-row correlated
subquery and **not** an `InitPlan`. It is **not** an `InitPlan` — the criterion's
danger is absent. But it is no longer an `EXISTS(SubPlan n)` either: once
`auth.uid()` became a statement-level constant, every remaining qualifier inside
the subquery was uncorrelated, so the planner pulled the correlation out into a
per-row `ANY (event_parties.event_id = …)` test and hashed the inner result
once. This is Postgres's ordinary `EXISTS` → hashed semi-join rewrite, and it
is a **second-order effect of the intended transformation**, not a second
transformation.

**The correlation was moved, not removed** — `event_parties.event_id` is still
tested per outer row. That is an argument, though, and the threat here is
elevation, so it was settled by asking the database instead.

### Proof 2b — the class-D ownership test, measured

An **organizer** (holds `staff.manage`, is not master) who created event A and
did not create event B, attempting `UPDATE` and `DELETE` on a party of each.
Two containers, one built **without** the wrap migration and one **with** it,
otherwise identical; every probe inside `begin … rollback`; both destroyed.

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
It did not. The master reads `rows:1` on both, which is the `role = 'master'`
branch of the `OR` behaving as designed.

**A note on how this probe had to be written, because it is the trap in it.**
An `UPDATE` or `DELETE` refused by RLS **does not raise** — it simply matches no
row. The first version of this probe asked only "did it error", and reported
success for the refusal and for the permission alike: it measured nothing and
looked green. `returning id` is what turns the verdict into a row count. In this
repository, where the only evidence is the written procedure, a probe that
cannot fail is worse than no probe.

### Proof 3 — the privilege-escalation write probe, before and after

An `approved member` setting their own `role`, then their own `status`, on their
own row. Inside `begin … rollback`.

| Target | Attempt | BEFORE | AFTER |
|---|---|---|---|
| container | `set role = 'master'` | **`42P17`** | **`42P17`** |
| container | `set status = 'approved'` | **`42P17`** | **`42P17`** |
| production | `set role = 'master'` | **`42P17`** | **`42P17`** |
| production | `set status = 'approved'` | **`42P17`** | **`42P17`** |

```
production rollback check: profiles rows 4 -> 4, rows with role='master' 1 -> 1
```

**The same SQLSTATE, all four pairs.** The guard refuses exactly as it did — by
crashing rather than by denying, which is D-32-A and is not this plan's to
repair.

And the cells the comparator actually reads, which matter more than the
transcript:

```
production pre       11 profiles UPDATE cells {"42P17":4,"absent":7}
production post-07   11 profiles UPDATE cells {"42P17":4,"absent":7}
production post-09   11 profiles UPDATE cells {"42P17":4,"absent":7}
container  pre       11 profiles UPDATE cells {"42P17":11}
container  post-07   11 profiles UPDATE cells {"42P17":11}
container  post-09   11 profiles UPDATE cells {"42P17":11}
```

`profiles_update_own`'s `EXPLAIN` is still `42P17` after the wrap, on both
targets: the policy still cannot be planned, so the recursion survived the
wrapping exactly as `32-07-SUMMARY.md` predicted it would.

### The organizer asymmetry, still there

Not this plan's requirement, but it is the phase's single unrecoverable defect
and it costs nothing to re-read it out of the committed container artefacts:

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

A pending organizer may still insert a ticket tier and may still **not** insert
a venue. The two answers still disagree, which is the point.

---

## The mutation proof — B1 is the only detector for a misapplied T1

Run **before** production was written to, because *"the comparator will catch
it"* is an assumption until the invariant is broken and the check is watched to
fire.

The threat is **T-32-09-03**: wrapping the **comparison** instead of the
**call**. `(select auth.uid() = user_id)` is legal SQL, is semantically
identical — `user_id` resolves as a correlated reference — and is **no longer an
InitPlan**. It is precisely the mistake this transformation tempts, and it would
undo the plan's entire purpose while looking correct.

Two class-A policies were deliberately broken, and **the mutation was asserted
applied before any result was read**:

```
mutation applied? (executable SQL only) correct form 8 -> 6, broken form 1 -> 3
```

> The first attempt at that assertion **failed**, and it failed correctly: it
> counted the broken form in the migration's own header comment, where the file
> quotes it as the thing it does not do. The assertion refused to proceed on
> arithmetic it could not confirm — which is the whole reason to assert the
> mutation rather than trust it.

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

**B1 caught it, twice. B2 and B3 passed it in silence** — 220 cells and 660
cells identical, because the misapplication changes performance, not verdicts.

> **This is the exact mirror image of `32-07-SUMMARY.md`'s finding, and the two
> belong together.** For a **capability collapse** (T2), B1 passes and only
> B3-on-the-container catches it. For a **misapplied wrap** (T1), B3 passes and
> only B1 catches it. **Neither artefact is the safety net; the pair is.** A
> later plan that drops either one has removed half of it, and the half it drops
> will be the half that mattered.

### The comparator's own checks, also proved by mutation

The comparator was changed in this plan, so its changed branches were broken
deliberately too:

```
--expect-initplan=1 against a database at 0
  ✗ b5_initplan_unexpected — 20 → 0, but --expect-initplan=1 was stated

a PINNED lint removed from the after artefact
  ✓ auth_rls_initplan 20 → 0, as stated (the advisor no longer reports the lint)
  ✗ b5_pinned_lint_moved — multiple_permissive_policies 46 → 0

a NON-pinned lint removed from the after artefact
  ✗ b5_lint_moved — function_search_path_mutable 13 → 0 (no longer reported at all)
```

All three fire. The change is **expressive, not permissive**: every branch is
stricter than or equal to what it replaced.

---

## What this document does not say

It says nothing moved that the whitelist does not explain, and that the two
policies which would have broken under a blind rewrite did not break. It does
**not** say any of the 67 policies is *right*. They were inherited, not designed
here; `42P17` on `profiles` is a faithful recording of a defect, not an
endorsement of it; and CAP-06 was a performance requirement that this phase
treated as a security one only because the two policies it touches sit on a
trust boundary.
