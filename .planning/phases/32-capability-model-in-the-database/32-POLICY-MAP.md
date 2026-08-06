# Phase 32 — the policy-to-capability map

**Derived, not typed.** Every row below was read out of
`baseline/32-BASELINE-policies.json` — the committed pre-phase B1 dump, which is
Postgres's own rendering of every applied `USING` and `WITH CHECK` — and the five
recognised left-hand sides were **imported from `scripts/rls-baseline-compare.mjs`**
rather than re-typed. That coupling is deliberate (phase decision D-26): if the
generator's list and the comparator's list ever diverge, the comparator refuses the
result instead of quietly accepting a sixth shape. A hand-typed list is how the 46th
policy gets forgotten.

`supabase/migrations/20260807010000_policies_to_capabilities.sql` was generated **from
this map**, not the other way round.

---

## The counts, beside the populations the research measured

| Class | What the predicate asks | Research measured | Derived from B1 | Capability |
|---|---|---|---|---|
| **P1** | `is_admin_or_organizer()` — role only, **status ignored** | 34 | **34** | `staff.manage` |
| **P2** | `is_master()` — master only, via the helper | 3 | **3** | `master.manage` |
| **P3** | inline `EXISTS` — role IN (organizer, master) **AND status = 'approved'** | 4 | **4** | `catalogue.manage` |
| **P4** | inline `EXISTS` — role = master, no status | 2 | **2** | `master.manage` |
| **P5** | `get_user_status() = 'approved'` — status only, role irrelevant | 2 | **2** | `membership.active` |
| | | **45** | **45** | |

**All five class counts match the measured populations exactly: 34 / 3 / 4 / 2 / 2.**
Those are the numbers that carry the safety meaning, and they are the ones the plan
said would stop it if they moved. They did not move.

Per capability key:

| Key | Call sites | `requires_approved` on its grants |
|---|---|---|
| `catalogue.manage` | **4** | **true** |
| `master.manage` | **5** | false |
| `membership.active` | **2** | **true** |
| `staff.manage` | **34** | false |

---

## One number in the plan is wrong, and it is arithmetic, not measurement

The plan states **45 call sites in 43 policies**, on the ground that
`event_parties_update_own` and `event_parties_delete_own` *"each carry both a P1 and a
P2 fragment"*. Derived from B1, the answer is **45 call sites in 45 policies** — one
fragment per policy, none carrying two.

The claim is checkable in one place. Here is `event_parties_update_own`'s `qual`
exactly as `pg_policies` prints it:

```
(( SELECT is_admin_or_organizer() AS is_admin_or_organizer) AND ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'master'::text) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_parties.event_id) AND (e.created_by = auth.uid()))))))
```

The first operand is P1 and is replaced. The second is a **scalar sub-select on
`profiles`**, and it is *not* `is_master()`: it is a different expression that happens
to mean the same English sentence. It is **not one of the five enumerated left-hand
sides**, so it is not a call site, it is not replaced, and if it were replaced the
comparator would report `predicate_unexplained` — correctly, because the whitelist
enumerates shapes rather than pattern-matching intent.

There is a second reason to leave it alone, and it is not cosmetic. `is_master()` is
`SECURITY DEFINER` and reads `profiles` as its definer; this inline sub-select reads
`profiles` **as the caller**, so it is itself subject to `profiles_select_own`. The two
agree today only because that policy happens to return the caller's own row. Swapping
one for the other is a behaviour change dressed as a rename, and CAP-03 forbids it.

The two policies keep both of their `auth.uid()` occurrences and their sub-select. They
appear in this map **once**, under P1.

**Consequence for the acceptance criteria:** the migration contains **45**
`DROP POLICY IF EXISTS` / `CREATE POLICY` pairs, not 43, and the comparator — which
tallies **per policy**, not per clause — will report **45 by T2** and
**22 unchanged**, not 43 and 24.

---

## The three equivalence claims this mapping rests on

Each is a place a silent widening could hide, so each is claimed out loud rather than
left to be re-derived by whoever reads the diff next.

**1. P2 and P4 both reduce to `role = 'master'` with no reference to `status`, so both
map to `master.manage`.** P2 is `(SELECT is_master())`; P4 is an inline
`EXISTS … profiles.role = 'master'`. Neither reads `status`, and `master.manage` is
granted with `requires_approved = false` — which is why `master/pending` holds it
(measured in 32-06: five capabilities, `master.manage` among them). This is claimed
explicitly **because the `artists`/`venues` organizer pair also looked equivalent to
`is_admin_or_organizer()` and was not**. Two predicates that read alike are not
therefore alike; these two were checked, character by character, against the dump.

**2. For a subject with no `profiles` row, the verdicts agree.**
`is_admin_or_organizer()` and `get_user_status()` return `NULL` for such a subject, and
a `NULL` predicate filters a row exactly as `false` does. `private.has_capability`
returns `false` — its body is an `EXISTS`, which is never null. `NULL` and `false`
behave identically in a policy, so the row is refused either way. This is the one
equivalence with **no user in production to observe it**, which is precisely why the
container carries an `authenticated/no-profile` persona and why B2/B3 are compared
there as well as here.

**3. P5 asks only about `status`, and `membership.active` keeps it that way.** The
capability is granted to **all three roles** with `requires_approved = true`, so role
remains irrelevant to the answer — a `master/pending` and a `member/pending` are both
refused, an `organizer/approved` and a `member/approved` are both allowed. Granting it
to only one role would have narrowed the predicate, which is a change in the other
direction and equally forbidden.

---

## The four `catalogue.manage` policies — the group that must be exactly these

- `artists_insert_organizer`
- `artists_update_organizer`
- `venues_insert_organizer`
- `venues_update_organizer`

These are the only four policies in the product that require an organizer to be
**`approved`**. If a fifth name ever appears in this group, or if one of these four
appears under `staff.manage`, that is the widening this whole phase exists to avoid: a
**pending** organizer would gain insert and update on `venues` and `artists`.

The mechanical check that closes it is not this document — it is the container probe:
`organizer/pending` must still insert a `ticket_tiers` row (`ok:1`, via
`staff.manage`) and must still be refused a `venues` insert (`42501`, via
`catalogue.manage`). **If those two answers ever agree with each other, the two shapes
were collapsed.**

---

## What is NOT in this map, and why

- **Row-ownership comparisons** — `auth.uid() = user_id`, `auth.uid() = uploaded_by`,
  `created_by = auth.uid()`, `requested_by = auth.uid()`. They answer *is this row
  mine*, not *am I allowed*. They are not capabilities and folding them in would change
  15 policies for no requirement.
- **Bare `auth.uid()` tokens** — not wrapped here. That is the next migration's single
  transformation (D-27). 26 policies carry a bare `auth.uid()` before this
  file; **20** carry one after it. The six that lose theirs do so because the
  `EXISTS` body that contained it was itself the capability fragment:
  `artists_delete_master`, `artists_insert_organizer`, `artists_update_organizer`, `venues_delete_master`, `venues_insert_organizer`, `venues_update_organizer`. That is why the
  `auth_rls_initplan` advisor moves in a migration that wrapped nothing — derived here,
  so a disagreement with the advisor is a finding rather than a rounding.
- **`profiles_update_own`** — its `WITH CHECK` is the privilege-escalation guard, and
  its predicate is none of the five: it compares `role` and `status` to the caller's
  **own current values**, which is an unchanged-field guard, not a permission check.
  There is no capability that means "my role is unchanged". It is untouched by this
  migration, so the `42P17` recursion recorded as **D-32-A** is untouched too, and B3's
  `profiles` UPDATE cells must still read `42P17` after this plan.
- **The 22 policies with no enumerated fragment** — `qual = true` public reads,
  ownership-only policies, and `profiles_select_own` / `profiles_update_own`. They are
  not opened.

---

## Every mapped policy

`cmd`, `permissive` and `roles` are reproduced from B1 character for character in the
migration; they are listed here so a reviewer can check the reproduction without
opening the JSON. Twelve of the 45 carry `TO authenticated` and the rest are
`{public}`, where the migration omits the `TO` clause because `public` is the default
and B1 will re-print it identically.

| Table | Policy | `cmd` | `permissive` | `roles` | Class | Capability | Clause |
|---|---|---|---|---|---|---|---|
| `artists` | `artists_delete_master` | DELETE | PERMISSIVE | `{public}` | **P4** | `master.manage` | USING |
| `artists` | `artists_insert_organizer` | INSERT | PERMISSIVE | `{public}` | **P3** | `catalogue.manage` | WITH CHECK |
| `artists` | `artists_update_organizer` | UPDATE | PERMISSIVE | `{public}` | **P3** | `catalogue.manage` | USING |
| `attendances` | `attendances_all_admin` | ALL | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `discount_code_tiers` | `discount_code_tiers_delete` | DELETE | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `discount_code_tiers` | `discount_code_tiers_insert` | INSERT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | WITH CHECK |
| `discount_code_tiers` | `discount_code_tiers_update` | UPDATE | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `discount_codes` | `discount_codes_delete` | DELETE | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `discount_codes` | `discount_codes_insert` | INSERT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | WITH CHECK |
| `discount_codes` | `discount_codes_update` | UPDATE | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `door_scan_events` | `door_scan_events_select_admin` | SELECT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `drink_items` | `drink_items_delete` | DELETE | PERMISSIVE | `authenticated` | **P1** | `staff.manage` | USING |
| `drink_items` | `drink_items_insert` | INSERT | PERMISSIVE | `authenticated` | **P1** | `staff.manage` | WITH CHECK |
| `drink_items` | `drink_items_update` | UPDATE | PERMISSIVE | `authenticated` | **P1** | `staff.manage` | USING |
| `drink_tokens` | `drink_tokens_select_admin` | SELECT | PERMISSIVE | `authenticated` | **P1** | `staff.manage` | USING |
| `event_media` | `event_media_delete_admin` | DELETE | PERMISSIVE | `authenticated` | **P1** | `staff.manage` | USING |
| `event_media` | `event_media_insert_member` | INSERT | PERMISSIVE | `authenticated` | **P5** | `membership.active` | WITH CHECK |
| `event_media` | `event_media_select_admin` | SELECT | PERMISSIVE | `authenticated` | **P1** | `staff.manage` | USING |
| `event_media` | `event_media_update_admin` | UPDATE | PERMISSIVE | `authenticated` | **P1** | `staff.manage` | USING |
| `event_parties` | `event_parties_delete_own` | DELETE | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `event_parties` | `event_parties_insert_admin` | INSERT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | WITH CHECK |
| `event_parties` | `event_parties_select_admin` | SELECT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `event_parties` | `event_parties_update_own` | UPDATE | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `events` | `events_delete_own` | DELETE | PERMISSIVE | `{public}` | **P2** | `master.manage` | USING |
| `events` | `events_insert_admin` | INSERT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | WITH CHECK |
| `events` | `events_select_admin` | SELECT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `events` | `events_update_own` | UPDATE | PERMISSIVE | `{public}` | **P2** | `master.manage` | USING |
| `guest_list_entries` | `guest_list_delete_admin` | DELETE | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `guest_list_entries` | `guest_list_insert_admin` | INSERT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | WITH CHECK |
| `guest_list_entries` | `guest_list_select_admin` | SELECT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `guest_list_entries` | `guest_list_update_admin` | UPDATE | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `newsletter_subscribers` | `newsletter_select_admin` | SELECT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `profiles` | `profiles_select_admin` | SELECT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `profiles` | `profiles_update_master` | UPDATE | PERMISSIVE | `{public}` | **P2** | `master.manage` | USING |
| `rsvps` | `rsvps_insert_approved` | INSERT | PERMISSIVE | `{public}` | **P5** | `membership.active` | WITH CHECK |
| `rsvps` | `rsvps_select_admin` | SELECT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `ticket_refunds` | `refunds_select_admin` | SELECT | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `ticket_refunds` | `refunds_update_admin` | UPDATE | PERMISSIVE | `{public}` | **P1** | `staff.manage` | USING |
| `ticket_tiers` | `ticket_tiers_delete` | DELETE | PERMISSIVE | `authenticated` | **P1** | `staff.manage` | USING |
| `ticket_tiers` | `ticket_tiers_insert` | INSERT | PERMISSIVE | `authenticated` | **P1** | `staff.manage` | WITH CHECK |
| `ticket_tiers` | `ticket_tiers_update` | UPDATE | PERMISSIVE | `authenticated` | **P1** | `staff.manage` | USING |
| `tickets` | `tickets_select_admin` | SELECT | PERMISSIVE | `authenticated` | **P1** | `staff.manage` | USING |
| `venues` | `venues_delete_master` | DELETE | PERMISSIVE | `{public}` | **P4** | `master.manage` | USING |
| `venues` | `venues_insert_organizer` | INSERT | PERMISSIVE | `{public}` | **P3** | `catalogue.manage` | WITH CHECK |
| `venues` | `venues_update_organizer` | UPDATE | PERMISSIVE | `{public}` | **P3** | `catalogue.manage` | USING |

---

## Before and after, per policy

Every `before` below is `pg_policies`' rendering from the committed baseline, with
whitespace collapsed and `(select` case-folded — the same normalisation
`rls-baseline-compare.mjs` applies before it compares, so these strings are directly
checkable against `baseline/32-BASELINE-policies.json`.

#### `artists_delete_master` — `public.artists` · DELETE · P4 → `master.manage`

```
before (qual, as pg_policies prints it)
  (EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'master'::text))))
after
  (select private.has_capability('master.manage'))
```

#### `artists_insert_organizer` — `public.artists` · INSERT · P3 → `catalogue.manage`

```
before (with_check, as pg_policies prints it)
  (EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['organizer'::text, 'master'::text])) AND (profiles.status = 'approved'::text))))
after
  (select private.has_capability('catalogue.manage'))
```

#### `artists_update_organizer` — `public.artists` · UPDATE · P3 → `catalogue.manage`

```
before (qual, as pg_policies prints it)
  (EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['organizer'::text, 'master'::text])) AND (profiles.status = 'approved'::text))))
after
  (select private.has_capability('catalogue.manage'))
```

#### `attendances_all_admin` — `public.attendances` · ALL · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `discount_code_tiers_delete` — `public.discount_code_tiers` · DELETE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `discount_code_tiers_insert` — `public.discount_code_tiers` · INSERT · P1 → `staff.manage`

```
before (with_check, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `discount_code_tiers_update` — `public.discount_code_tiers` · UPDATE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `discount_codes_delete` — `public.discount_codes` · DELETE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `discount_codes_insert` — `public.discount_codes` · INSERT · P1 → `staff.manage`

```
before (with_check, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `discount_codes_update` — `public.discount_codes` · UPDATE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `door_scan_events_select_admin` — `public.door_scan_events` · SELECT · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `drink_items_delete` — `public.drink_items` · DELETE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `drink_items_insert` — `public.drink_items` · INSERT · P1 → `staff.manage`

```
before (with_check, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `drink_items_update` — `public.drink_items` · UPDATE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `drink_tokens_select_admin` — `public.drink_tokens` · SELECT · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `event_media_delete_admin` — `public.event_media` · DELETE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `event_media_insert_member` — `public.event_media` · INSERT · P5 → `membership.active`

```
before (with_check, as pg_policies prints it)
  ((auth.uid() = uploaded_by) AND ((SELECT get_user_status() AS get_user_status) = 'approved'::text))
after
  ((auth.uid() = uploaded_by) AND (select private.has_capability('membership.active')))
```

#### `event_media_select_admin` — `public.event_media` · SELECT · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `event_media_update_admin` — `public.event_media` · UPDATE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `event_parties_delete_own` — `public.event_parties` · DELETE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  ((SELECT is_admin_or_organizer() AS is_admin_or_organizer) AND (((SELECT profiles.role FROM profiles WHERE (profiles.id = auth.uid())) = 'master'::text) OR (EXISTS (SELECT 1 FROM events e WHERE ((e.id = event_parties.event_id) AND (e.created_by = auth.uid()))))))
after
  ((select private.has_capability('staff.manage')) AND (((SELECT profiles.role FROM profiles WHERE (profiles.id = auth.uid())) = 'master'::text) OR (EXISTS (SELECT 1 FROM events e WHERE ((e.id = event_parties.event_id) AND (e.created_by = auth.uid()))))))
```

#### `event_parties_insert_admin` — `public.event_parties` · INSERT · P1 → `staff.manage`

```
before (with_check, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `event_parties_select_admin` — `public.event_parties` · SELECT · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `event_parties_update_own` — `public.event_parties` · UPDATE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  ((SELECT is_admin_or_organizer() AS is_admin_or_organizer) AND (((SELECT profiles.role FROM profiles WHERE (profiles.id = auth.uid())) = 'master'::text) OR (EXISTS (SELECT 1 FROM events e WHERE ((e.id = event_parties.event_id) AND (e.created_by = auth.uid()))))))
after
  ((select private.has_capability('staff.manage')) AND (((SELECT profiles.role FROM profiles WHERE (profiles.id = auth.uid())) = 'master'::text) OR (EXISTS (SELECT 1 FROM events e WHERE ((e.id = event_parties.event_id) AND (e.created_by = auth.uid()))))))
```

#### `events_delete_own` — `public.events` · DELETE · P2 → `master.manage`

```
before (qual, as pg_policies prints it)
  ((auth.uid() = created_by) OR (SELECT is_master() AS is_master))
after
  ((auth.uid() = created_by) OR (select private.has_capability('master.manage')))
```

#### `events_insert_admin` — `public.events` · INSERT · P1 → `staff.manage`

```
before (with_check, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `events_select_admin` — `public.events` · SELECT · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `events_update_own` — `public.events` · UPDATE · P2 → `master.manage`

```
before (qual, as pg_policies prints it)
  ((auth.uid() = created_by) OR (SELECT is_master() AS is_master))
after
  ((auth.uid() = created_by) OR (select private.has_capability('master.manage')))
```

#### `guest_list_delete_admin` — `public.guest_list_entries` · DELETE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `guest_list_insert_admin` — `public.guest_list_entries` · INSERT · P1 → `staff.manage`

```
before (with_check, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `guest_list_select_admin` — `public.guest_list_entries` · SELECT · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `guest_list_update_admin` — `public.guest_list_entries` · UPDATE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `newsletter_select_admin` — `public.newsletter_subscribers` · SELECT · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `profiles_select_admin` — `public.profiles` · SELECT · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `profiles_update_master` — `public.profiles` · UPDATE · P2 → `master.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_master() AS is_master)
after
  (select private.has_capability('master.manage'))
```

#### `rsvps_insert_approved` — `public.rsvps` · INSERT · P5 → `membership.active`

```
before (with_check, as pg_policies prints it)
  ((auth.uid() = user_id) AND ((SELECT get_user_status() AS get_user_status) = 'approved'::text))
after
  ((auth.uid() = user_id) AND (select private.has_capability('membership.active')))
```

#### `rsvps_select_admin` — `public.rsvps` · SELECT · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `refunds_select_admin` — `public.ticket_refunds` · SELECT · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `refunds_update_admin` — `public.ticket_refunds` · UPDATE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `ticket_tiers_delete` — `public.ticket_tiers` · DELETE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `ticket_tiers_insert` — `public.ticket_tiers` · INSERT · P1 → `staff.manage`

```
before (with_check, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `ticket_tiers_update` — `public.ticket_tiers` · UPDATE · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `tickets_select_admin` — `public.tickets` · SELECT · P1 → `staff.manage`

```
before (qual, as pg_policies prints it)
  (SELECT is_admin_or_organizer() AS is_admin_or_organizer)
after
  (select private.has_capability('staff.manage'))
```

#### `venues_delete_master` — `public.venues` · DELETE · P4 → `master.manage`

```
before (qual, as pg_policies prints it)
  (EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'master'::text))))
after
  (select private.has_capability('master.manage'))
```

#### `venues_insert_organizer` — `public.venues` · INSERT · P3 → `catalogue.manage`

```
before (with_check, as pg_policies prints it)
  (EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['organizer'::text, 'master'::text])) AND (profiles.status = 'approved'::text))))
after
  (select private.has_capability('catalogue.manage'))
```

#### `venues_update_organizer` — `public.venues` · UPDATE · P3 → `catalogue.manage`

```
before (qual, as pg_policies prints it)
  (EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['organizer'::text, 'master'::text])) AND (profiles.status = 'approved'::text))))
after
  (select private.has_capability('catalogue.manage'))
```

---

## The offline check that was run before anything was applied

The generated predicates were fed back through the comparator's own
`explainPredicate()`, against the committed baseline, in **two** renderings: as this
migration writes them, and as `pg_policies` will re-print them — the re-print measured
on a throwaway container in plan 32-06, `(select private.has_capability('x'))` →
`( SELECT private.has_capability('x'::text) AS has_capability)`. Both agree:

```
[as-written]    89 clauses unchanged · 0 by T1 · 45 by T2 · 0 by both · 0 unexplained
[as-reprinted]  89 clauses unchanged · 0 by T1 · 45 by T2 · 0 by both · 0 unexplained
  capability keys as the comparator reads them:
    {"master.manage":5,"catalogue.manage":4,"staff.manage":34,"membership.active":2}
```

This is a **prediction, not a measurement**: it proves the generated SQL text is
reachable from the baseline by transformation T2 alone, and that the comparator will
read back the same four keys with the same four counts. It does not prove what
Postgres does with the file. Only applying it and re-capturing B1 does that, and that
is the task the reviewer gates.
