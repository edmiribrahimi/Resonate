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

| # | Table | Policy | `cmd` | occ pre | occ post-07 | Class | Transformation | Result |
|---|---|---|---|---|---|---|---|---|
| 1 | `artists` | `artists_delete_master` | DELETE | 1 | 0 | C | predicate replaced in `20260807010000` | — |
| 2 | `artists` | `artists_insert_organizer` | INSERT | 1 | 0 | C | predicate replaced in `20260807010000` | — |
| 3 | `artists` | `artists_update_organizer` | UPDATE | 1 | 0 | C | predicate replaced in `20260807010000` | — |
| 4 | `attendances` | `attendances_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 5 | `drink_orders` | `drink_orders_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 6 | `drink_tokens` | `drink_tokens_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 7 | `event_media` | `event_media_delete_own` | DELETE | 1 | 1 | A | wrapped in `20260807020000` | — |
| 8 | `event_media` | `event_media_insert_member` | INSERT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 9 | `event_media` | `event_media_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 10 | `event_parties` | `event_parties_delete_own` | DELETE | 2 | 2 | **D** | wrapped in `20260807020000` | — |
| 11 | `event_parties` | `event_parties_update_own` | UPDATE | 2 | 2 | **D** | wrapped in `20260807020000` | — |
| 12 | `events` | `events_delete_own` | DELETE | 1 | 1 | B | wrapped in `20260807020000` | — |
| 13 | `events` | `events_select_published` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 14 | `events` | `events_update_own` | UPDATE | 1 | 1 | B | wrapped in `20260807020000` | — |
| 15 | `pending_purchases` | `pending_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 16 | `profiles` | `profiles_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 17 | `profiles` | `profiles_update_own` | UPDATE | 4 | 4 | **E** | wrapped in `20260807020000` | — |
| 18 | `rsvps` | `rsvps_delete_own` | DELETE | 1 | 1 | A | wrapped in `20260807020000` | — |
| 19 | `rsvps` | `rsvps_insert_approved` | INSERT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 20 | `rsvps` | `rsvps_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 21 | `ticket_refunds` | `refunds_insert_own` | INSERT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 22 | `ticket_refunds` | `refunds_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 23 | `tickets` | `tickets_select_own` | SELECT | 1 | 1 | A | wrapped in `20260807020000` | — |
| 24 | `venues` | `venues_delete_master` | DELETE | 1 | 0 | C | predicate replaced in `20260807010000` | — |
| 25 | `venues` | `venues_insert_organizer` | INSERT | 1 | 0 | C | predicate replaced in `20260807010000` | — |
| 26 | `venues` | `venues_update_organizer` | UPDATE | 1 | 0 | C | predicate replaced in `20260807010000` | — |

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

*(filled in Task 3, after the migration is applied and both targets re-captured)*
