---
phase: 43
measured: 2026-08-08
source: production via the Supabase Management API, read-only (`read_only: true` on every query)
method: a throwaway node script reusing `loadEnvironment()` + `createManagementApiTarget()` from `scripts/rls-baseline.mjs`, deleted after the run — no script and no package was added
---

# Phase 43 — the measurements the later plans are written against

Nothing in phase 43 is written against an assumption where a measurement was
available. Each section below carries the query that produced it, the verbatim
result, and the one thing it decides.

> **This repository is public.** Counts, role labels, status labels, constraint
> definitions and capability keys are recorded here. No uuid, no address and no
> person's name is — `scripts/rls-baseline.mjs:679-687` sets the precedent that
> a label reaches an artefact and an identifier does not.

---

## Measurement 1 — the rows that would violate `role ⇒ approved`

```sql
select role, status, count(*) as n
  from public.profiles
 where role in ('master','organizer','staff')
   and status <> 'approved'
 group by role, status
 order by role, status;
```

**Result:** `[]` — zero rows.

Because an empty group-by is also what an empty table returns, the totals were
read separately so the two are distinguishable:

```sql
select count(*) as total_profiles,
       count(*) filter (where status = 'approved') as approved,
       count(*) filter (where role in ('master','organizer','staff')) as staff_roles
  from public.profiles;
```

**Result:** `total_profiles: 4, approved: 4, staff_roles: 1`.

**What it decides.** Production holds **zero** violating rows, so **plan 43-06
adds the `role ⇒ approved` constraint VALIDATED**, not `NOT VALID`. No per-row
decision is owed. This matters beyond tidiness: `43-RESEARCH.md` § B.1b measured
that a `NOT VALID` add **freezes** every pre-existing violating row against any
future update on any column, permanently. With zero violating rows that hazard
does not arise — but the constraint must still be added validated, because a
`NOT VALID` add would leave the phase's central rule unenforced against exactly
the rows it was written for.

---

## Measurement 2 — the live CHECK constraints, by name and definition

```sql
select conrelid::regclass::text as tbl,
       conname,
       pg_get_constraintdef(oid) as def,
       convalidated
  from pg_constraint
 where conrelid in ('public.profiles'::regclass, 'private.role_capabilities'::regclass)
   and contype = 'c'
 order by 1, 2;
```

**Result — four constraints, all `convalidated: true`:**

| table | conname | definition | convalidated |
|---|---|---|---|
| `private.role_capabilities` | `role_capabilities_role_check` | `CHECK ((role = ANY (ARRAY['master'::text, 'organizer'::text, 'member'::text])))` | true |
| `profiles` | `profiles_approved_via_check` | `CHECK ((approved_via = ANY (ARRAY['referral'::text, 'guest_list'::text, 'admin_manual'::text])))` | true |
| `profiles` | `profiles_role_check` | `CHECK ((role = ANY (ARRAY['master'::text, 'organizer'::text, 'member'::text])))` | true |
| `profiles` | `profiles_status_check` | `CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))` | true |

**What it decides.** Plan 43-04 drops and re-adds the two role CHECKs by
**these** names — `profiles_role_check` and `role_capabilities_role_check` —
read from `pg_constraint`, not derived from Postgres' auto-naming rule.
`43-RESEARCH.md` § A.1 derived both correctly; this confirms the derivation
rather than trusting it.

**A third constraint the research did not name.** `profiles_approved_via_check`
admits `referral | guest_list | admin_manual`. Phase 43 creates accounts by an
act that D-08 calls *"the act of approval, performed by someone already
entitled to approve"* — and **none of those three labels names it**. Whichever
plan writes the account-creation path either reuses `admin_manual` or widens
this constraint; it cannot leave `approved_via` unset if the column is
`not null`. This is a decision plan 43-04 or the creation plan owes, and it is
recorded here so it is not discovered against a failing insert.

**It also gates the A1 probe.** `profiles_status_check` is present and
`convalidated = true`, which is the precondition measurement 5's probe required
before it was allowed to run.

---

## Measurement 3 — the grant rows as production holds them

```sql
select role, capability, requires_approved
  from private.role_capabilities
 order by role, capability;
```

**Result — 16 rows across three roles, as expected:**

| role | capability | requires_approved |
|---|---|---|
| master | `admin.access` | **false** |
| master | `catalogue.manage` | true |
| master | `door.operate` | **false** |
| master | `master.manage` | **false** |
| master | `membership.active` | true |
| master | `membership.card.view` | true |
| master | `organizer.access` | **false** |
| master | `staff.manage` | **false** |
| member | `membership.active` | true |
| member | `membership.card.view` | true |
| organizer | `catalogue.manage` | true |
| organizer | `door.operate` | **false** |
| organizer | `membership.active` | true |
| organizer | `membership.card.view` | true |
| organizer | `organizer.access` | **false** |
| organizer | `staff.manage` | **false** |

**The two rows D-06 is about.** `('master', 'door.operate', false)` and
`('organizer', 'door.operate', false)` — both `requires_approved = false`, as
`supabase/migrations/20260807000000_capability_model.sql:414-416` declares with
the comment *"These two rows must not become true."*

**What it decides.** **D-06 refuses to remove these two `false` values as
redundant once the `role ⇒ approved` constraint exists.** The constraint
protects the database; this setting protects the night from the day the
constraint is relaxed for one special case. This measurement is what makes a
later flip visible: any future run of this query that returns `true` for either
row is the regression, and there is now a dated row shape to compare against.

**And it is what M-12 confirms from the other side.** The container measurement
recorded in `32-HUMAN-UAT.md` on the same date shows an `organizer` / `pending`
persona resolving `door.operate` — the observable consequence of these two
rows, not merely their declared intent.

**A hazard this table makes visible.** `staff.manage` also carries
`requires_approved = false` for both `master` and `organizer`. That is exactly
why D-19 forbids gating the attribution register on `staff.manage`: it would
admit an organizer whose access was never approved. The same container run
confirmed it — the `organizer/pending` persona resolved
`[door.operate, organizer.access, staff.manage]`.

---

## Measurement 4 — the owner of `public.profiles`

```sql
select relowner::regrole::text as owner
  from pg_class
 where oid = 'public.profiles'::regclass;
```

**Result:** `postgres`.

**What it decides — assumption A5.** `43-RESEARCH.md` § B.1 weighed a trigger
against a CHECK for enforcing D-04, and the trigger's weakness is that
**the table owner, not only a superuser, can disable it**. The owner is
`postgres`, which is the role migrations are applied as. So a single
`ALTER TABLE public.profiles DISABLE TRIGGER …` inside any future migration
would silently switch the rule off, and the schema would still *contain* the
trigger — a reader would see enforcement that is not running.

A CHECK has no equivalent one-line off switch: relaxing it requires an explicit
`DROP CONSTRAINT`, which is visible in the migration and detectable by
re-running measurement 2. **The trigger alternative is therefore materially
weaker, and the CHECK route stands** — with D-05's drop-and-restore as the
seed-time relaxation, restored `NOT VALID` as § B.1b requires.

---

## Measurement 5 — does SQLSTATE 23514 reach the Supabase JS client as `error.code`?

**Why this one could not be measured on a container.** The question is not what
Postgres does — that is settled — but what **PostgREST** does to the error on
its way to the JS client. The phase-32 container has no PostgREST, so it cannot
answer this at all. The probe therefore ran against production, against the
already-validated `profiles_status_check` of measurement 2, and against a
throwaway `member` / `pending` account created and deleted inside a single
script run. It was never aimed at a member's row and no `organizer` row was
ever created in production.

Attempt (through `getServiceClient()`, which bypasses RLS):

```js
await supabase.from('profiles').update({ status: 'bogus' }).eq('id', id).select().single()
```

**Result:**

| field | value |
|---|---|
| `error.code` | `23514` |
| `error.message` | `new row for relation "profiles" violates check constraint "profiles_status_check"` |
| `error.details` | `Failing row contains (…)` — **see the warning below; the real value is not reproduced here** |
| `error.hint` | `null` |
| returned data | `null` |

The account was created by the trigger as `role = member` / `status = pending`
— observed, not assumed, and asserted by the script before the probe ran. The
row's `status` was read before the attempt and re-read after: **`pending` both
times, unchanged**. Postgres refused the statement and no row was written. The
account was then deleted in the same run and
`select count(*) … where id = '<uuid>'` returned **0**.

**What it decides.** A CHECK violation arrives as a **code**, `23514`, and the
constraint's own name is inside `error.message`. Every *"the refusal must be
observable"* task in plans 43-06, 43-09 and 43-14 therefore branches on
`error.code === '23514'` — **never on a parsed message**, because Next redacts a
Server Action's message in a production build
(`src/lib/capabilities/server.ts:59-63`), and a message that survives locally
and vanishes in production is the silent-failure pattern `meta-gates.md`
forbids. The constraint name in `message` may be used to *enrich* an operator
log, never as the branch condition.

The precedent that codes reach this codebase at all —
`src/app/api/membership/verify/route.ts:270-280` branching on `PGRST116` — now
has a second, measured instance.

### ⚠️ `error.details` leaks the entire row — an unplanned finding

This was not what the probe went looking for, and it is the more important
result. On a CHECK violation against `public.profiles`, PostgREST returns:

```
details: "Failing row contains (<uuid>, <email address>, <full_name>,
          <membership_code>, <created_at>, <updated_at>, <role>, <status>, …)."
```

**Every column of the offending row, in order** — including the **`membership_code`**,
which `src/app/api/membership/list/route.ts:52-54` shows is the door's only
credential, and the member's **email address**.

Consequences, and they are binding on the rest of this phase:

1. **`error.details` must never be logged, returned to a client, or shown in an
   error message** on any path that can violate a constraint on `profiles`.
   A generic operator log that prints `JSON.stringify(error)` publishes a
   membership code.
2. This is the reason the *"branch on the code"* rule is not merely a
   robustness preference: `code` is the only field of that error object that is
   safe to propagate. `message` carries the constraint name (safe, useful);
   `details` carries member data (never).
3. It applies to the `role ⇒ approved` constraint plan 43-06 adds, not only to
   `profiles_status_check` — same table, same failure shape.

Nothing in the plan anticipated this, so it is recorded here rather than left
for the first plan that logs an error to discover.

---

## Measurement 6 — does `generateLink` honour `options.redirectTo`?

**Settled from the installed package, not from a live send.** No invitation was
sent to any inbox and no `generateLink` call was made.

**Source — stronger than the web documentation.** The published reference
describes whatever version is current; what binds this repository is the version
it actually resolves. `@supabase/supabase-js` is pinned `^2.97.0` in
`package.json` and **2.97.0 is what is installed**, so the answer was read from
that package's own type declarations and implementation:

- `@supabase/auth-js/dist/module/lib/types.d.ts:743-748`
- `@supabase/auth-js/dist/module/GoTrueAdminApi.js:89-101`
- `@supabase/auth-js/dist/module/lib/fetch.js:146-151`

**Answer — yes, with a restriction the web reference does not make obvious.**

```ts
export type GenerateRecoveryLinkParams = {
    type: 'recovery';
    email: string;
    options?: Pick<GenerateLinkOptions, 'redirectTo'>;
};
```

`options.redirectTo` is accepted for `type: 'recovery'`. **But `recovery` takes
`redirectTo` only** — the `Pick<>` excludes `data`, which `signup`, `invite` and
`magiclink` do accept. A recovery link therefore **cannot carry metadata**; if
plan 43-11 needs to pass anything alongside the invitation, it must ride in the
`redirectTo` URL itself or come from the database.

**How it travels.** `generateLink` merges `options` into the request **body**
(`{...rest, ...options}` → `POST /admin/generate_link`) — it is *not* a query
parameter. Note the contrast with the ordinary client flows, which build
`redirect_to` as a query string (`fetch.js:77-78`,
`GoTrueClient.js:2324`); the admin path does not go through that code.

**And it is verifiable without sending anything.** `_generateLinkResponse`
(`fetch.js:146-151`) destructures **`redirect_to`** out of the response and
returns it in `properties`, alongside `action_link`, `hashed_token` and
`verification_type`. So the call returns what the server actually resolved.

**What it decides.** Plan 43-11 may aim the invitation at the set-password
surface plan 43-04 builds; it does not need a different route.

**The allow-list, stated honestly.** The target URL is expected to require an
entry in the project's Auth redirect allow-list (Authentication → URL
Configuration). **This was NOT verified in this session** — it is not a fact
that lives in the package, and no live call was made to test it. It is recorded
as an assumption, not a measurement.

What *was* established is how to close it without guessing: because the response
carries `properties.redirect_to`, plan 43-11 can call `generateLink` once and
**compare the returned `redirect_to` against the one it asked for**. If they
differ, the allow-list entry is missing. That turns a silent misconfiguration —
a link that works but lands on `/dashboard`, the exact loop D-23 describes —
into an observable assertion, which is what `meta-gates.md` requires of a
critical path in a repository with no error tracking. **Plan 43-04 owes the
allow-list entry; plan 43-11 owes this check.**

---

## What no measurement here covers

- **No test runner exists for the product** (`CLAUDE.md` Guardrail 1). Nothing
  above is verified because tests pass; each line is a query result or a cited
  document.
- Measurement 5 proves the code reaches the JS client. It does **not** prove
  what any particular Server Action does with it — that is the subject of the
  plans that branch on it.
- Measurement 6 reads the installed package, not a live call. The **allow-list
  requirement is an assumption, explicitly not measured** — the check that
  settles it is written into measurement 6 for plan 43-11 to run.
- M-12's rendering leg is deduced from `src/lib/supabase/middleware.ts:170-186`,
  not observed in a browser. See `32-HUMAN-UAT.md` for what would close it.
- **A1 could not be measured on the container.** The question is what PostgREST
  does to a Postgres error on its way to the JS client, and the phase-32
  container has no PostgREST — it is Postgres alone
  (`scripts/rls-baseline-container.mjs:14-20`). That is why measurement 5 is the
  one measurement in this file that ran against production.
