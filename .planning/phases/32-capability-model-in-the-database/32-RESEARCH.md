# Phase 32: Capability Model in the Database — Research

**Researched:** 2026-08-06
**Domain:** PostgreSQL row-level security · Supabase Auth · Next.js 16 server-side authorisation
**Confidence:** HIGH on the measured baseline and on CAP-04/CAP-06 · MEDIUM on the recommended shape of the single definition (a design choice with one forced constraint and several free ones)

> `.planning/` is tracked in a **public** repository. This document names **roles, never people**, and carries **no** identifiers, project references, keys or addresses. Every command below uses a placeholder where a project reference would appear.

---

## Summary

Phase 32 is a behaviour-preserving refactor of an authorisation system that is currently defined in **five different places at once**: 67 row-level policies in the database, four route-prefix rules in the middleware, five differently-worded guard helpers in server actions, a role list inside `NAV_ITEMS`, and 46 page files that read the permission out of a request header. The phase's goal — one definition, three callers — is achievable, but the hard part is not building the definition. The hard part is that **the behaviour being reproduced is not internally consistent**, and CAP-03 requires reproducing it exactly rather than tidying it.

The measurement that dominates the plan: the database already holds **two different definitions of "organizer"**. Thirty-four policies gate on `public.is_admin_or_organizer()`, which checks `role` and **ignores `status`**. Four policies — `artists_insert_organizer`, `artists_update_organizer`, `venues_insert_organizer`, `venues_update_organizer` — gate on an inline `EXISTS` that checks `role` **and** `status = 'approved'`. A capability model that maps both to one capability will silently widen access on `artists` and `venues` (a pending or rejected organizer would gain insert and update) or narrow it on the other thirty-four. Either is a CAP-03 defect. The model must therefore carry the existing inconsistency as data, so that a later phase can resolve it deliberately and visibly.

The second measurement that dominates the plan: **capabilities cannot live in the JWT**. This project's Auth configuration was read directly — `hook_custom_access_token_enabled = false`, `jwt_exp = 3600`, `refresh_token_rotation_enabled = true`. A capability minted into an access token would be stale for up to one hour after a grant. CAP-04 rules that out structurally, not stylistically. The check must read the database on the request that needs it — which is what the middleware already does today, once per request.

**Primary recommendation:** Put the evaluator in SQL, in a **non-exposed `private` schema**, backed by a capability catalogue and a `role → capability` grant table whose grant rows carry a `requires_approved` flag; expose exactly one argument-less `public` wrapper for the TypeScript side; give the resolver its per-night scope parameter **now** so Phase 35 adds a grant source rather than a signature; rewrite the 26 `auth.uid()` occurrences by wrapping **only the function call**, never the surrounding predicate; and prove CAP-03 with a five-artefact before/after baseline captured before the first line of DDL.

---

## Project Constraints (from CLAUDE.md)

These are not advice. They are the conditions a valid plan must satisfy.

| Directive | Source | Consequence for this phase |
|---|---|---|
| **The middleware is UX; RLS is the security boundary** | Operating Principle 2 | A capability that only redirects is not enforced. Every capability that gates data must reach a policy. |
| **Role and status are two independent axes** | `access-gating.md`, gate *due assi* | `member` ≠ `approved`. The model must be able to express "role only", "status only", and "role and status" — because all three exist in the live policy set. |
| **No path lets a user change their own `role` or `status`** | `access-gating.md`, gate *escalation privilegi* | `profiles_update_own` is the guard. Touching it is **Critical** and needs an explicit write probe. |
| **A new table with non-public data gets RLS and a policy in the same migration** | `supabase-data.md`, gate *tabella nuova = policy nuova* | The catalogue and grant tables need RLS in their own migration — or must live in a schema PostgREST does not expose, which is the stronger answer. |
| **Adding a policy to a table that has one sums permissions (PERMISSIVE is OR)** | `supabase-data.md`, gate *RLS contestuale* | Any new policy added alongside the existing 67 **widens**. In a constant-behaviour phase, prefer replacing a policy in place over adding one. |
| **An applied migration is never edited; write another** | `supabase-data.md`, gate *migration in avanti* | All 33 existing migrations are historical fact. Phase 32 writes new ones. |
| **Schema changes update `src/types/database.ts` in the same commit** | `supabase-data.md`, gate *tipi allineati* | New tables and function return shapes must land in the hand-written type file in the same commit. |
| **The service-role client bypasses every RLS policy; each new use is justified in writing** | `access-gating.md`, gate *service role* | 29 files already use it. A capability check performed with the service client proves nothing about RLS. |
| **There is no test runner for the product** | Environment Guardrail 1 | "Verified" means `npm run build` plus written, executed manual or observable evidence. Never "the tests pass". |
| **`npm run build` does not check any Supabase column name** | Guardrail 4 / `31-VERIFICATION.md` | None of the four clients is parameterised with `Database`. A green build proves the TypeScript is well-formed, not that a column or an RPC exists. |
| **There is no error tracking anywhere** | `meta-gates.md` | A failure that matters needs an **observable effect**, not a log line. |
| **The repository is public; a commit is a publication** | Guardrail 5 | No identifiers, keys, project references or personal data in any artefact this phase produces — including the baselines. |
| **`grep -E` and `sed -i ''`** | Guardrail 6 | macOS/BSD tooling in every script. |

---

## Decisions Already Fixed Upstream

No `32-CONTEXT.md` exists — `/gsd-discuss-phase` has not been run for this phase. These are the decisions already locked in `.planning/STATE.md` and `.planning/ROADMAP.md` that constrain the plan. **They are not reopened at plan time.**

### Locked

- **The door decides on role alone.** All four door routes check `role IN ('master','organizer')` and do **not** read `status`. Verified: `src/app/api/tickets/checkin/route.ts:148`, `src/app/api/tickets/checkin/undo/route.ts:49`, `src/app/api/membership/verify/route.ts:104`, `src/app/api/tickets/attendance/route.ts:28`. The comment at `checkin/route.ts:113-127` records the reasoning and states the four must never diverge.
- **`updateMemberRole` sets `status = 'approved'` when granting the organizer role**; demotion does not revoke approval. `src/app/(admin)/admin/members/actions.ts:100`.
- **`member` and `approved` remain two independent axes** everywhere else. Not quietly unified.
- **Behaviour is identical when this phase ends.** Anything that widens or narrows access is a defect, including a defensible one.
- **The interface stays English only** — this milestone.

### Claude's discretion (research made a recommendation; the owner has not ruled)

- Where the single definition physically lives (schema, table shape, function signature).
- Whether the capability catalogue is seeded from a migration or from a fixture.
- How the CAP-03 baseline is produced (container, production, or both).

### Deferred — out of scope for phase 32

- **CAP-05**, ending header trust — Phase 33. The 46 files reading `x-user-*` stay as they are.
- **CAP-02**, the build-time check that every capability maps to a route — Phase 34.
- **ASSIGN-01…08**, the per-night assignment table, expiry, revocation, self-grant prohibition, the supervising-capability rule for undo — Phase 35.
- **LIVE-06**, channel authorisation reusing the model — Phase 38.
- The 46 `multiple_permissive_policies` advisor warnings. Merging permissive policies changes the predicate set; this is a constant-behaviour phase.
- The `?redirect=` / `?next=` mismatch found during this research (see *Findings outside scope*).

---

## Phase Requirements

| ID | Description | Research support |
|---|---|---|
| **CAP-01** | Every capability is defined once in the database and evaluated by the same function whether the caller is a page, a server action, or a row-level policy | § *(a) Where the single definition lives* — the placement is forced, not chosen; § *Architecture Patterns* gives the shape; § *The five predicates that exist today* gives the exact set that must be reproduced |
| **CAP-03** | Existing role behaviour is reproduced exactly — a master, an organizer and a member can do neither more nor less than before | § *(d) How "neither more nor less" is verified* — five baseline artefacts, all captured before the first DDL, all re-runnable; § *Validation Architecture* names them |
| **CAP-04** | A per-night grant takes effect immediately, without waiting for a session or token to refresh | § *(b) CAP-04 rules out the JWT* — measured against this project's own Auth configuration, not assumed |
| **CAP-06** | Every existing row-level policy is reviewed for the pattern that re-evaluates the current user per row | § *(e) Is `(select auth.uid())` safe on all 26?* — a five-class table covering all 26, a mechanical decision rule, and an EXPLAIN proof run on this database |

---

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|---|---|---|---|
| Deciding whether a subject holds a capability | **Database (Postgres)** | — | It is the only tier every caller can reach. A policy cannot call TypeScript; TypeScript can call SQL. The placement is forced. |
| Enforcing a capability on data | **Database (RLS policies)** | — | `CLAUDE.md` Operating Principle 2. Anything else is UX. |
| Enforcing a capability on an action (refund, role change, reveal) | **API / server action** | Database | A server action calling the service-role client bypasses RLS entirely; its own check is the only boundary there. 29 files use that client. |
| Refusing to render a page | **Frontend server (middleware + RSC)** | — | UX. It stops a person arriving, not a request reading. |
| Hiding a navigation entry | **Frontend server** | — | `NAV_ITEMS` in `src/lib/rbac/roles.ts`. Hiding a link is not protecting a route (`access-gating.md`). |
| Resolving identity | **Frontend server (session)** | — | Already true; the middleware calls `auth.getUser()` at `src/lib/supabase/middleware.ts:40`. Ending header trust is Phase 33. |
| Per-night scope of a capability | **Database — signature only in this phase** | — | Phase 35 owns the data. Phase 32 owns the shape that lets Phase 35 land without a redesign. |
| Caching a capability answer | **Frontend server, per request** | — | Never in the token. § *(b)*. |

---

## Measured Baseline of the Live Database

Every number below was read from the production database on **2026-08-06** through the Supabase Management API — `POST /v1/projects/{ref}/database/query` and `GET /v1/projects/{ref}/advisors/{performance,security}` — not from `supabase/migrations/**`, which drifts from what is applied. All are re-checkable with the commands in § *Validation Architecture*.

| Fact | Value | Source |
|---|---|---|
| PostgreSQL version | **17.6** | `select version()` [VERIFIED] |
| Tables in `public` | **20**, all with RLS enabled | `pg_class.relrowsecurity` [VERIFIED] |
| Policies in `public` | **67** | `pg_policies` [VERIFIED] |
| Policies re-evaluating `auth.uid()` per row | **26** (31 occurrences) | `pg_policies` + performance advisor, independently agreeing [VERIFIED] |
| Policies with `auth.uid()` already wrapped | **0** | `pg_policies` [VERIFIED] |
| `auth_rls_initplan` advisor warnings | **26** — the same 26, named | `GET /advisors/performance` [VERIFIED] |
| Other performance lints | `multiple_permissive_policies` **46** · `unindexed_foreign_keys` **35** · `unused_index` **14** | same [VERIFIED] |
| Policies calling `is_admin_or_organizer()` | **34** | `pg_policies` [VERIFIED] |
| Policies calling `is_master()` | **3** | `pg_policies` [VERIFIED] |
| Policies calling `get_user_status()` | **2** | `pg_policies` [VERIFIED] |
| Policies with an inline `profiles.role` lookup | **8** | `pg_policies` [VERIFIED] |
| Policies with `qual = true` (fully public read) | **6** | `pg_policies` [VERIFIED] |
| Helper functions `get_user_role`, `get_user_status`, `is_master`, `is_admin_or_organizer` | plpgsql, **STABLE**, **SECURITY DEFINER**, **`search_path` not set** | `pg_proc` [VERIFIED] |
| `auth.uid()`, `auth.jwt()`, `auth.role()` | **SQL**, STABLE, *not* SECURITY DEFINER | `pg_get_functiondef` [VERIFIED] |
| PostgREST exposed schemas | **`public,graphql_public`** — a `private` schema would not be exposed | `GET /postgrest` [VERIFIED] |
| Custom access token hook | **disabled** | `GET /config/auth` [VERIFIED] |
| Access-token lifetime | **3600 s**, refresh-token rotation on, reuse interval 10 s | `GET /config/auth` [VERIFIED] |
| Profiles in production | **4** — 1 `master/approved`, 3 `member/approved`. **No `organizer`. No non-approved row.** | aggregate query, no identifiers read [VERIFIED] |
| Security advisor | 13 × `function_search_path_mutable` (includes all four helpers) · 14 × `anon_security_definer_function_executable` · 14 × `authenticated_…` · 1 × `auth_leaked_password_protection` | `GET /advisors/security` [VERIFIED] |

### The five predicates that exist today

This is the set CAP-03 must reproduce. It is not one rule; it is five, and two of them disagree about the same word.

| # | Predicate | Where | Count | Status checked? |
|---|---|---|---|---|
| **P1** | `role IN ('master','organizer')` — via `(SELECT public.is_admin_or_organizer())` | 34 policies across 16 tables | 34 | **No** |
| **P2** | `role = 'master'` — via `(SELECT public.is_master())` | `events_update_own`, `events_delete_own`, `profiles_update_master` | 3 | **No** |
| **P3** | `role IN ('organizer','master') AND status = 'approved'` — inline `EXISTS` on `profiles` | `artists_insert_organizer`, `artists_update_organizer`, `venues_insert_organizer`, `venues_update_organizer` | 4 | **Yes** |
| **P4** | `role = 'master'` — inline `EXISTS` on `profiles` | `artists_delete_master`, `venues_delete_master` | 2 | **No** |
| **P5** | `status = 'approved'` alone — via `(SELECT public.get_user_status())` | `event_media_insert_member`, `rsvps_insert_approved` | 2 | **Yes** (role irrelevant) |

**P1 and P3 are the same English sentence with two different meanings.** A pending organizer can insert a ticket tier, a drink item, a guest-list entry, an event and an event party (P1), but cannot insert a venue or an artist (P3). That asymmetry is live today. **Reproduce it. Do not resolve it in this phase.**

Alongside these sit the row-scoping predicates — `auth.uid() = user_id`, `auth.uid() = uploaded_by`, `requested_by = auth.uid()`, `created_by = auth.uid()`. **These are not capabilities.** They answer "is this row mine", not "am I allowed". Folding them into the capability model is a scope trap: it would make every ownership check depend on a resolver call and would change 15 policies for no requirement. Leave them as column comparisons.

### Where the permission decision is taken in application code

| Site | Count | Evidence |
|---|---|---|
| Files reading `x-user-role` / `x-user-status` / `x-user-id` | **46** | `grep -rl 'x-user-' src` |
| `select("role")` or `select("role, status")` against `profiles` | **21** sites | `grep -rn 'select("role' src` |
| `redirect("/dashboard")` on a failed check | **32** sites | `grep -rn 'redirect("/dashboard")' src` |
| Named guard helpers, each a private copy | **5** — `verifyOrganizer` (×2, `.../events/actions.ts:25` and `.../events/[id]/tickets/actions.ts:20`), `verifyOrganizerAccess` (`.../guest-list/actions.ts:14`), `verifyOrganizerRole` (×3 door routes), `requireMaster` (×2, `admin/finance/actions.ts:9` and `admin/newsletter/actions.ts:15`), `verifyMaster` / `verifyAdminOrOrganizer` (`admin/members/actions.ts:45,71`) | read directly |
| Route-prefix rules in the middleware | **4** | `src/lib/supabase/middleware.ts:82,90,99,108` |
| Nav visibility rules | **1 list**, 5 entries | `src/lib/rbac/roles.ts` |
| API routes | 14, of which **4** are door routes with their own guard | `find src/app/api -name route.ts` |
| Files using the service-role client (bypasses all RLS) | **29** | `grep -rl 'getServiceClient' src` |

The two `verifyOrganizer` copies are byte-identical except for the error message ("only organizers can manage events" vs "…manage ticket tiers"). That is the divergence Phase 33 criterion 3 exists to delete — but the *deletion* is Phase 33. Phase 32 gives them something to call.

---

## The Six Questions

### (a) Where does the single definition live, and in what form?

**The placement is forced, not chosen.** "One definition" cannot mean one piece of code that both languages execute — a row-level policy runs inside Postgres and cannot call out to Node. Of the three candidate placements, only one survives:

| Candidate | Verdict |
|---|---|
| Evaluator in TypeScript, SQL calls it | **Impossible.** A policy cannot invoke application code. |
| Data in the database, evaluator written twice | **Forbidden by CAP-01** — "evaluated by the same function". Two implementations of a table-driven rule are two definitions. |
| **Evaluator in SQL; TypeScript calls it** | **The only one that satisfies CAP-01.** |

So the answer to "a SQL function? a table? both?" is **both, and the roles are distinct**: tables hold *what is granted*, the function holds *how a grant is read*. A function alone (a `CASE role WHEN …`) would put the grants in code, which makes Phase 34's CAP-02 build check impossible — it needs a capability list it can read as data — and makes every grant change a deploy. A table alone leaves the evaluation duplicated.

**Recommended shape** (each element earns its place from a measured constraint):

- **Schema `private`** — not `public`. Verified: PostgREST exposes `public,graphql_public` only, so nothing in `private` is reachable over the REST API. This follows Supabase's own instruction: *"Security-definer functions should never be created in a schema in the 'Exposed schemas' inside your API settings"* [CITED: supabase.com/docs/guides/database/postgres/row-level-security]. The four existing helpers violate it — the security advisor raises `anon_security_definer_function_executable` for `is_admin_or_organizer`, `is_master`, `get_user_role` and `get_user_status`, all callable at `/rest/v1/rpc/…` by an anonymous request. Do not repeat that.

- **`private.capabilities(key text primary key, description text)`** — the catalogue. Phase 34's CAP-02 reads it.

- **`private.role_capabilities(role text, capability text, requires_approved boolean not null default false)`** — the grants. The `requires_approved` column is what lets one function reproduce P1, P2, P3, P4 and P5 without five branches: P1/P2/P4 are grants with `requires_approved = false`, P3 is a grant with `true`, P5 is a capability granted to all three roles with `true`. **This column is the phase's honesty about the inconsistency it inherited** — it makes the disagreement between `artists`/`venues` and everything else visible as a data row rather than buried in a policy body, so a later phase can resolve it as a decision.

- **`private.has_capability(p_capability text, p_party_id uuid default null) returns boolean`** — `SECURITY DEFINER`, `STABLE`, **`SET search_path = ''`** (the four existing helpers omit it; the security advisor flags all four). Reads `profiles.role` and `profiles.status` for `auth.uid()`, then the grant tables. The `p_party_id` parameter is inert in this phase — see (c).

- **`public.my_capabilities() returns text[]`** — the *only* exposed surface, `SECURITY DEFINER`, `SET search_path = ''`, **no arguments**, `REVOKE EXECUTE ON FUNCTION public.my_capabilities() FROM public, anon; GRANT EXECUTE TO authenticated;`. Argument-less is not tidiness: a `has_capability(user_id, cap)` reachable over REST is an enumeration oracle, and `access-gating.md` records that **this repository has no rate limiting anywhere** — verified 2026-08-05 and still true. An endpoint that answers "valid / not valid" for an arbitrary identifier is a free oracle.

- **Policies** call `(SELECT private.has_capability('…'))` — wrapped, exactly as `is_admin_or_organizer()` already is.

- **TypeScript** calls `supabase.rpc('my_capabilities')` once per request and memoises with React `cache()` for the render. No `cache` import exists in the repository today; this is a new pattern and should be introduced in one module, not scattered.

**The type gap, stated plainly.** `src/types/database.ts` is a **hand-written** interface file — it contains no `Database` type and therefore no `Functions` map, and none of the four clients is parameterised. Consequently `supabase.rpc('my_capabilities')` is untyped: a misspelled function name is a runtime error, not a build error, and so is a misspelled capability key. The repository already has a precedent for closing this by hand — `src/lib/door/outcome.ts` defines the door's three outcome literals once and both the wire type and the table read from it, so a divergence becomes a `npm run build` error (`src/types/database.ts:1-13` explains the inversion). **Apply the same pattern: one `src/lib/capabilities/keys.ts` exporting a const object of capability keys, imported by every caller, and asserted against `private.capabilities` by a written check.** Without it, "one definition" holds in the database and is a string literal everywhere else.

### (b) CAP-04 rules out the obvious shortcut — confirmed against this project

The reading in the brief is correct, and it is now measured rather than inferred.

Supabase's documented mechanism for putting roles or permissions into the token is the **custom access token hook**, which the docs describe as running *"before a token is issued"* [CITED: supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac]. A claim therefore changes only when a new token is minted. On this project:

- `hook_custom_access_token_enabled = **false**` — nothing is minted into the token today. [VERIFIED: `GET /v1/projects/{ref}/config/auth`]
- `jwt_exp = **3600**` — an access token issued one second before a grant stays valid for **the following hour**. [VERIFIED, same source]

So a capability carried in the JWT would take up to **3600 seconds** to take effect, with no sign-out. That is not a tuning problem — lowering `jwt_exp` trades the violation for a refresh storm and still leaves a window. **CAP-04 forbids JWT-carried capabilities structurally.** Tag this in the plan as a rule with a reason, because the Supabase RBAC guide recommends exactly the approach CAP-04 forbids, and a future engineer reading that guide will propose it.

**Where the check must happen, and what it costs.** The check must read the database on the request that needs the answer. The good news is that this is already the status quo, so the phase costs nothing new in the hot path:

| Path | Today | After phase 32 | Delta |
|---|---|---|---|
| Middleware, every matched request | `auth.getUser()` + `profiles.select("role, status")` (`src/lib/supabase/middleware.ts:40,51`) | `auth.getUser()` + `rpc('my_capabilities')` | **0 round trips** |
| A page that needs a capability | reads the injected header — free, and untrusted | reads the same header (Phase 33 changes this) or asks once, memoised | 0 in this phase |
| Four door routes | `auth.getUser()` + `profiles.select("role"…)` | `auth.getUser()` + one resolver call | **0 round trips** |
| Every RLS policy evaluation | `(SELECT is_admin_or_organizer())` — one InitPlan per statement | `(SELECT private.has_capability(…))` — one InitPlan per statement | **0**, provided the wrapper is kept |

The one place a cost could appear is a Server Component that asks independently of the middleware: middleware and render are separate executions, so `cache()` cannot span them. Budget one extra round trip per page that asks, and prefer passing the resolved set down rather than re-asking in a leaf component.

**The door constraint.** `ASSIGN-08` (Phase 35) already fixes that the scanner resolves its assignment once when it opens, not per scan. Phase 32 must not make a per-scan check more expensive, and must not change any door route's response shape — `public/sw.js` precaches all four door routes (`31-VERIFICATION.md`), so a phone can hold a cached response from before the deploy.

### (c) The boundary with Phase 35

CAP-04 lives in Phase 32; the assignments that make it concrete live in Phase 35. The boundary is drawn by asking what Phase 35 would have to *redesign* if Phase 32 got it wrong.

**Phase 32 MUST build:**

1. The catalogue, the role grants, and the resolver — the parts that exist regardless of assignments.
2. **The resolver's scope parameter, from the first migration**: `private.has_capability(p_capability text, p_party_id uuid default null)`. Today the parameter is accepted and unused. Adding it later means changing every policy body and every caller — which is exactly the redesign the ordering constraint in `ROADMAP.md` ("Database before application… one definition, three callers, only works if the definition comes first") exists to prevent.
3. **The source-composition structure**, documented in the function body as a comment: a subject holds a capability if **any** source grants it. Today there is exactly one source — the role grant. Phase 35 adds a second by editing one function body, and no policy and no caller changes.
4. The demonstration for CAP-04 with the source that exists today (see *Validation Architecture*).

**Phase 32 MUST NOT build:**

- Any `party_assignments` table, or its columns, expiry semantics (ASSIGN-02), revocation-as-record (ASSIGN-03), or the self-grant prohibition (ASSIGN-04). All Phase 35, all with UI.
- Any capability that **only** a per-night assignment could grant. Inventing `door.scan.for.party` in phase 32 is designing Phase 35's data model with no data behind it — and every capability created in 32 must be exercised by a real caller, or Phase 34's CAP-02 build check will fail on it.
- **The supervising-capability split for undo (ASSIGN-05).** Today `POST /api/tickets/checkin/undo` requires `role IN ('master','organizer')`, full stop (`undo/route.ts:49`). Encoding "door-only cannot undo" now would *narrow* behaviour, which CAP-03 forbids. In phase 32, undo maps to the same capability the other three door routes map to.

**The whole contract Phase 32 owes Phase 35** is one sentence: *a resolver whose signature and source-composition do not need to change when a second grant source appears.*

### (d) How "neither more nor less" is verified, with no test runner

A behaviour-preserving refactor of 67 policies and five in-code guard families needs a before/after comparison that someone else can re-run. This research established that **all of it is achievable**, and demonstrated each technique live.

The load-bearing discovery: **the Management API query endpoint can impersonate a role.** Executed successfully on 2026-08-06:

```sql
begin;
  select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);
  set local role authenticated;
  <the probe>;
rollback;
```

This makes the RLS predicates evaluate as they do for a real request. Two constraints found by running it:

- **`"read_only": true` cannot switch role** — it returns `42501: permission denied to set role "authenticated"`. So persona probes must run in a read-write transaction. Rule for the plan: **one probe per request, every statement string ends in `rollback;`, no `commit` anywhere**, and the harness re-reads the row counts afterwards and asserts they are unchanged. This was confirmed: a `master` insert into `venues` succeeded inside the transaction and the table still held its original row count afterwards.
- **`"read_only": true` is still the right flag for everything that does not switch role** — the policy dump, the advisor, the schema reads. It is a hard guarantee, verified: an `INSERT` under it fails with `25006: cannot execute INSERT in a read-only transaction`.

**Five artefacts, all captured before the first line of DDL, all committed under `.planning/phases/32-.../baseline/`:**

| # | Artefact | What it captures | How it is compared |
|---|---|---|---|
| **B1** | `32-BASELINE-policies.json` | All 67 rows of `pg_policies` — `tablename`, `policyname`, `cmd`, `permissive`, `roles`, `qual`, `with_check` — sorted deterministically. **Postgres's own rendering**, not the migration text: it compares what is *applied*, not what was written. | Re-capture; normalised diff. Every differing line must be explained by exactly one whitelisted transformation: `auth.uid()` → `(select auth.uid())`, or a P1–P5 predicate → `(select private.has_capability('<key>'))`. **Any other diff is a defect.** |
| **B2** | `32-BASELINE-reads.json` | For each persona × each of the 20 tables: the visible row **count** *and* the **md5 of the sorted list of visible primary keys**. The count alone is too weak — a policy can change *which* rows without changing *how many*. | Every count and every fingerprint identical. |
| **B3** | `32-BASELINE-writes.json` | For each persona × table × `INSERT`/`UPDATE`/`DELETE`: `ok`, or the SQLSTATE. This is the **only** way to baseline `WITH CHECK` — B2 never touches it. Demonstrated: `member` inserting into `venues` → `42501 new row violates row-level security policy for table "venues"`; `master` → succeeds. | Every cell identical, SQLSTATE included. |
| **B4** | `32-BASELINE-surfaces.md` | Every server-side permission decision in application code with `file:line` and its **exact predicate**: the 4 middleware prefix rules, the 5 guard-helper families, the 4 door routes, the `NAV_ITEMS` list, the 21 `select("role")` sites. | After: same table, new call site, **predicate column character-identical**. This is what proves ROADMAP criterion 1's "surface by surface". |
| **B5** | `32-BASELINE-advisors.json` | `GET /advisors/performance` and `/advisors/security`, full lint lists. | After: `auth_rls_initplan` **0** (from 26); `multiple_permissive_policies` still **46**, `unindexed_foreign_keys` still **35**, `unused_index` still **14**. A change in those three means the policy *set* was restructured — which CAP-03 forbids. An independent third-party oracle for both the intended change and the absence of unintended ones. |

**The persona gap, and the honest answer to it.** Production holds four profiles: one `master/approved` and three `member/approved`. There is **no organizer** and **no non-approved row**. B2 and B3 therefore cannot be produced from production data for the personas that matter most — and `organizer` × `pending` is precisely the pair where P1 and P3 disagree.

The plan should run the baseline **twice, and say which is which**:

- **Against a throwaway PostgreSQL container**, built from `supabase/migrations/**` and seeded with one profile per (role × status) — seven personas including `anon` — plus a handful of rows in each of the 20 tables. This gives complete coverage with synthetic data. There is precedent and tooling: plan `31-03` did exactly this against a throwaway PostgreSQL 16.14 container, and `pg@^8.18.0` is already a devDependency for it. **Note the version gap: production is 17.6.** Match it.
- **Against production**, for the three personas that exist (`anon`, `master`, `member/approved`). This proves the container is not lying about the applied schema — the container is built from migration files, and `31-VERIFICATION.md` records that those files had already drifted once (a third foreign key to `tickets`, on `pending_purchases`, that no plan had looked at).

Neither alone is sufficient. Together they are: the container covers the personas, production covers the schema.

### (e) Is `(SELECT auth.uid())` safe on all 26?

**The rule, from the source that defines the pattern:** *"You can only use this technique if the results of the query or function do not change based on the row data."* [CITED: supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select]

`auth.uid()` takes no arguments. The expression being wrapped therefore **cannot** depend on row data, on any of the 26. **Wrapping the function call itself is unconditionally safe.** The danger is not in the transformation; it is in the larger rewrite the transformation tempts you into.

**Verified empirically on this database** (PostgreSQL 17.6), with `EXPLAIN (VERBOSE, COSTS OFF)` run under an impersonated persona:

- Bare `auth.uid() = user_id` — the SQL body is **inlined into the per-row `Filter`**: `(COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''), …::jsonb ->> 'sub'))::uuid = rsvps.user_id`.
- Wrapped `(select auth.uid()) = user_id` — becomes **`InitPlan 1`**, and the filter reads `(InitPlan 1).col1 = rsvps.user_id`.
- In the *same* plan, `(SELECT is_admin_or_organizer())` already appears as an InitPlan.

That last line answers the question the brief posed. **The two differ for one reason and it is not the functions.** Both `auth.uid()` and `is_admin_or_organizer()` are `STABLE`; `STABLE` alone buys nothing here. It is the `(SELECT …)` syntax that creates the InitPlan. Whoever wrote the helpers into policies used the wrapper; whoever wrote `auth.uid()` did not. There is no semantic reason for the asymmetry, and no reason to preserve it.

**The 26, in five classes:**

| Class | Policies | Occurrences | Safe transformation | The unsafe temptation |
|---|---|---|---|---|
| **A — function compared to a column of the row** (15) | `attendances_select_own`, `drink_orders_select_own`, `drink_tokens_select_own`, `event_media_select_own`, `event_media_delete_own`, `event_media_insert_member` (CHECK), `pending_select_own`, `profiles_select_own`, `rsvps_select_own`, `rsvps_delete_own`, `rsvps_insert_approved` (CHECK), `refunds_select_own` , `refunds_insert_own` (CHECK), `tickets_select_own`, `events_select_published` | 1 each | Wrap the call. Pure optimisation. | Wrapping the **comparison** — `(select auth.uid() = user_id)` — makes it a *correlated* subquery, since `user_id` is a column of the row. Legal, useless, and no longer an InitPlan. |
| **B — ownership OR capability** (2) | `events_update_own`, `events_delete_own` | 1 each | Wrap the call. The `(select is_master())` half is already an InitPlan. | none |
| **C — uncorrelated `EXISTS` on another table** (6) | `artists_insert_organizer`, `artists_update_organizer`, `artists_delete_master`, `venues_insert_organizer`, `venues_update_organizer`, `venues_delete_master` | 1 each | Wrap the call. | Wrapping the whole `EXISTS(…)` is *semantically* safe here — it references no column of the target row — but it rewrites the predicate far beyond the whitelist and would fail B1's diff. These six are also P3/P4, so they are being replaced by a capability call anyway; do it as **one** transformation, not two. |
| **D — mixed, with a genuinely correlated `EXISTS`** (2) | `event_parties_update_own`, `event_parties_delete_own` | **2 each** | Wrap **each call** individually. | **This is the one place the pattern breaks if applied blindly.** The predicate contains `EXISTS (SELECT 1 FROM events e WHERE e.id = event_parties.event_id AND e.created_by = auth.uid())` — that subquery **references the outer row** (`event_parties.event_id`). Wrapping it whole would evaluate it once per statement against an undefined row. The `(SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid())` half in the same predicate *is* uncorrelated and is P2. |
| **E — self-referential guard on the same table** (1) | `profiles_update_own` — **4 occurrences**: 1 in `USING`, 3 in `WITH CHECK` | 4 | Wrap each call. | **Critical.** This is the privilege-escalation guard from `access-gating.md`: it forbids a user changing their own `role` or `status`. Its `WITH CHECK` reads `profiles` *while updating* `profiles`, and that inner read is itself subject to `profiles_select_own` — a cross-policy coupling that no diff of a single policy will show. Wrapping does not change it, but it must carry a **dedicated write probe**: an approved member attempting `update profiles set role='master'` on their own row must still fail, before and after. |

15 + 2 + 6 + 2 + 1 = **26**. ✓

**The decision procedure to hand the planner** — mechanical, per policy, no judgement required:

1. Rewrite **only** the token `auth.uid()` → `(select auth.uid())`. Do not alter another character of the predicate in the same step.
2. Re-capture `pg_policies` (B1). The normalised diff must show that substitution and nothing else.
3. Re-run B2 and B3. Every fingerprint and every SQLSTATE identical.
4. Re-run B5. `auth_rls_initplan` = 0; the other three lint counts unchanged.
5. For classes **D** and **E** only, additionally capture `EXPLAIN (VERBOSE, COSTS OFF)` before and after under a persona, and confirm **no correlated subquery became an InitPlan**.

Steps 1–4 are the same for every policy. Step 5 is the two-policy exception, and it exists because the failure it catches is invisible to steps 2–4 when a table holds few rows — and production holds 3 `event_parties` and 4 `profiles`.

### (f) What the middleware does today, and what must stop

`src/lib/supabase/middleware.ts` runs on every request the matcher in `src/middleware.ts` admits — which excludes static assets and `sw.js` but **includes `/api/*`**, so it runs before every door route too. It does six things:

| Line | What it does | Verdict |
|---|---|---|
| `:15` | Creates a `createServerClient` — **without the `Database` generic** | Stays; the generic is a separate, worthwhile fix |
| `:40` | `auth.getUser()` — resolves identity from the session | **Stays.** This is the session refresh the file exists for. |
| `:51` | `profiles.select("role, status")` — one DB round trip on **every** matched request | **Becomes the one definition.** Same round-trip count. |
| `:62-76` | Unauthenticated on a protected prefix → `/login` | **Stays.** UX. |
| `:82,90,99,108` | Four route-prefix rules | **Become capability questions**, with identical verdicts |
| `:131-138` | Clears then conditionally sets `x-user-role`/`-status`/`-id` | **Stays untouched in this phase.** Removing it is CAP-05, Phase 33, and it would break 46 files inside a constant-behaviour phase. |

**The four prefix rules, and their exact capability mapping.** These live today *only* as string prefixes in one file; nothing else in the system knows them. Moving them into the model is where the phase earns its keep, and each mapping must be verdict-identical:

| Prefix | Today | Capability | Granted to | `requires_approved` |
|---|---|---|---|---|
| `/admin/scanner` | `role IN ('master','organizer')` (`:82`) | `door.operate` | master, organizer | **false** — matches the door's role-only decision |
| `/admin/*` (all others) | `role = 'master'` (`:90`) | `admin.access` | master | false |
| `/organizer/*` | `role IN ('master','organizer')` (`:99`) | `organizer.access` | master, organizer | false |
| `/membership-card`, `/attendance` | `status = 'approved'`, **any role** (`:108`) | `membership.card.view` | master, organizer, member | **true** |

Note the ordering at `:82`/`:90`: `/admin/scanner` is tested *before* the general `/admin` branch, in an `else if`. That ordering is load-bearing — inverting it locks organizers out of the door. Preserve it, and record it in B4.

**What must stay where it is.** The redirects. `CLAUDE.md` Operating Principle 2 says the middleware is UX, and a redirect that saves a member from landing on a page they cannot use is UX. Deleting the redirects to "let RLS handle it" would give a member an empty broken page instead of a bounce — narrower usability, and it does not improve security by one byte, because the policies were always the boundary.

**What must never move in.** Anything per-night. The middleware runs on the Edge on every request; a party-scoped lookup there would pay for a decision on requests that never need it. ASSIGN-08 already fixes the opposite discipline for the door.

**One caution.** The middleware's client is created per request with the anon key and the user's cookies. Calling `rpc('my_capabilities')` from it is an ordinary PostgREST call, but the function will be `GRANT EXECUTE TO authenticated` and revoked from `anon` — so the call must stay inside the existing `if (user)` branch at `:44`. An anonymous request must not call it and get an error; it must not call it at all.

---

## Standard Stack

**No new package is required by this phase, and none is recommended.** Everything it needs already exists: PostgreSQL 17.6 (functions, RLS, `SECURITY DEFINER`), `@supabase/supabase-js` 2.97 (`.rpc()`), React 19.2 (`cache()`), and the Supabase Management API for evidence.

### Already present and load-bearing

| Package | Version in `package.json` | Role in this phase |
|---|---|---|
| `@supabase/supabase-js` | `^2.97.0` | `.rpc()` — already used at four sites |
| `@supabase/ssr` | `^0.8.0` | the middleware and server clients |
| `react` | `19.2.3` | `cache()` for per-request memoisation — **not used anywhere in the repo today** |
| `next` | `16.1.6` | `headers()`, middleware, server actions |
| `pg` | `^8.18.0` (dev) | already a devDependency, added in Phase 31 for the throwaway-container probe — reuse it for the CAP-03 container baseline |
| `typescript` | `^5` | `npm run build` is `next build --webpack` and is the only automatic gate |

### Deliberately not adopted

| Instead of | Could use | Why not |
|---|---|---|
| A hand-rolled RLS baseline harness | `pgTAP` + `supabase-test-helpers` | Real and recommended by Supabase's own testing guide, but it requires the Supabase CLI, which `31-VERIFICATION.md` records as **not installed here**, and it introduces a test framework in a repository that has deliberately never had one. The Management API harness needs nothing new and produces a committable JSON artefact, which is what the verification gate asks for. Revisit if the CLI is ever installed. |
| Capabilities in the token | Supabase custom access token hook | **Violates CAP-04.** Measured: `jwt_exp = 3600`. See (b). |
| A generated `Database` type | `supabase gen types typescript` | Would close the largest verification gap in the repository — but it needs the CLI, and doing it inside a constant-behaviour phase means a large diff whose failures are indistinguishable from capability-model failures. Propose as its own phase. |

**Version verification** (`npm view`, 2026-08-06): every package above is already installed and pinned in `package-lock.json`. No install step, so no package-legitimacy exposure.

---

## Package Legitimacy Audit

**Not applicable — this phase installs no external package.** The Package Legitimacy Gate was not run because there is nothing to check: the design uses only what `package.json` already pins, and the recommendation in § *Standard Stack* is explicitly to add nothing.

If the plan later introduces a dependency (the most likely candidate being a test runner for the baseline harness), the gate must be run before it appears in any task, and each package gated behind a `checkpoint:human-verify` until it is.

---

## Architecture Patterns

### The shape, end to end

```
                          ┌──────────── one definition ────────────┐
                          │                                        │
  Browser                 │            PostgreSQL 17.6             │
    │                     │                                        │
    │ request             │   private.capabilities        (catalogue)
    ▼                     │   private.role_capabilities   (grants,
  Next 16 middleware      │        role → capability + requires_approved)
    │  auth.getUser()     │                    │                   │
    │  ─────────────────► │   private.has_capability(cap, party?)  │
    │  rpc(my_capabilities)         │        │                     │
    │  ◄───────────────── │           │        │                   │
    │  redirect? (UX)     │           │        └── ◄── source 1: role grant
    ▼                     │           │            ◄── source 2: per-night  ← Phase 35
  Server Component /      │           │                (signature reserved,
  Server Action           │           │                 inert in phase 32)
    │  ─────────────────► │  public.my_capabilities()  ── the ONLY exposed
    │  (memoised, cache())│      SECURITY DEFINER, no args,          wrapper
    │                     │      EXECUTE: authenticated only
    ▼                     │           │
  supabase.from(...)      │           │
    │  ─────────────────► │  RLS policy: (SELECT private.has_capability('…'))
    │                     │           └── evaluated once per statement (InitPlan)
    ▼                     │
  rows                    └────────────────────────────────────────┘

  Same question, three callers, one evaluator. Nothing is carried in the JWT,
  so a grant written at T is visible at T+1 request.
```

### Pattern 1 — the resolver, with its scope reserved

```sql
-- Source: shape derived from supabase.com/docs/.../row-level-security
--         (security-definer helper, non-exposed schema, wrapped call site)
create schema if not exists private;

create table if not exists private.capabilities (
  key         text primary key,
  description text not null
);

create table if not exists private.role_capabilities (
  role              text not null check (role in ('master','organizer','member')),
  capability        text not null references private.capabilities(key) on delete cascade,
  -- Not tidiness: today `artists` and `venues` require `approved` for the
  -- organizer path and thirty-four other policies do not. CAP-03 says reproduce,
  -- not resolve. This column is where that disagreement lives, visibly, as data.
  requires_approved boolean not null default false,
  primary key (role, capability)
);

create or replace function private.has_capability(
  p_capability text,
  p_party_id   uuid default null   -- inert in phase 32; Phase 35 fills it
) returns boolean
language sql
stable
security definer
set search_path = ''               -- the four existing helpers omit this;
as $$                              -- the security advisor flags all four
  -- A subject holds a capability if ANY source grants it.
  -- Phase 32 has exactly one source. Phase 35 adds a second by editing
  -- this body — no policy and no caller changes.
  select exists (
    select 1
    from public.profiles p
    join private.role_capabilities rc on rc.role = p.role
    where p.id = (select auth.uid())
      and rc.capability = p_capability
      and (not rc.requires_approved or p.status = 'approved')
  );
$$;

revoke all on function private.has_capability(text, uuid) from public, anon, authenticated;
```

**Why `language sql` rather than `plpgsql`:** the four existing helpers are plpgsql; a SQL function can be inlined by the planner and is the shape Supabase's own examples use. Either works. If the plan keeps plpgsql for consistency with the existing helpers, say so as a decision — do not switch silently.

### Pattern 2 — the one exposed wrapper

```sql
create or replace function public.my_capabilities()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(rc.capability order by rc.capability), '{}')
  from public.profiles p
  join private.role_capabilities rc on rc.role = p.role
  where p.id = (select auth.uid())
    and (not rc.requires_approved or p.status = 'approved');
$$;

-- No arguments, on purpose. This repository has NO rate limiting anywhere
-- (verified 2026-08-05, access-gating.md). A has_capability(user_id, cap)
-- reachable at /rest/v1/rpc/... is a free enumeration oracle.
revoke execute on function public.my_capabilities() from public, anon;
grant  execute on function public.my_capabilities() to authenticated;
```

### Pattern 3 — the call site in a policy

```sql
-- BEFORE (live today, on 34 policies)
--   using ((SELECT public.is_admin_or_organizer()))
-- AFTER
--   using ((select private.has_capability('event.manage')))
--
-- Keep the (select …) wrapper. Verified on this database with EXPLAIN:
-- it is the wrapper, not STABLE, that produces the InitPlan.
```

### Pattern 4 — the call site in TypeScript

```ts
// src/lib/capabilities/keys.ts — the same inversion as src/lib/door/outcome.ts
// (see src/types/database.ts:1-13 for why that file exists). Imports nothing.
export const CAP = {
  ADMIN_ACCESS:         "admin.access",
  ORGANIZER_ACCESS:     "organizer.access",
  DOOR_OPERATE:         "door.operate",
  MEMBERSHIP_CARD_VIEW: "membership.card.view",
  // ...
} as const;
export type CapabilityKey = (typeof CAP)[keyof typeof CAP];
```

```ts
// src/lib/capabilities/server.ts
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CapabilityKey } from "./keys";

// Memoised for the render. The middleware runs in a separate execution and
// cannot share this cache — budget one round trip there and one here.
export const getCapabilities = cache(async (): Promise<Set<CapabilityKey>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_capabilities");
  if (error) {
    // Zero silent failures (meta-gates.md): no error tracking exists, so a
    // swallowed failure here is a silent, total denial. Distinguish the cause,
    // and make the denial observable rather than indistinguishable from "no
    // capabilities".
    throw new Error(`capabilities.resolve_failed: ${error.code ?? "unknown"}`);
  }
  return new Set((data ?? []) as CapabilityKey[]);
});
```

**The error path is not boilerplate.** `meta-gates.md` records the newsletter precedent — every error collapsed into "Qualcosa è andato storto". A resolver that returns an empty set on failure denies everything and looks exactly like a correctly-refused member. Distinguish them.

### Anti-patterns to avoid

- **Adding a capability policy alongside an existing one.** PERMISSIVE policies are OR'd (`supabase-data.md`). Adding widens. Replace in place.
- **Folding ownership into the model.** `auth.uid() = user_id` answers "is this mine", not "am I allowed". Fifteen policies would change for no requirement.
- **One capability for every organizer-gated policy.** Silently changes `artists` and `venues`. This is *the* CAP-03 defect this phase can commit.
- **A resolver that takes a user id.** Enumeration oracle, no rate limiting.
- **A `SECURITY DEFINER` function in `public` without `search_path`.** Both mistakes are already present on the four existing helpers and flagged by the security advisor. Do not add a fifth.
- **Deleting the header injection.** Phase 33.
- **Wrapping a correlated `EXISTS`.** Class D, § (e).
- **Trusting `npm run build` to have checked a column or an RPC name.** It has not, and cannot.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Knowing which policies re-evaluate the user per row | A regex over `supabase/migrations/**` | `GET /v1/projects/{ref}/advisors/performance` | The advisor reads the *applied* database and names all 26. Migrations drift — `31-VERIFICATION.md` records a foreign key that no plan had seen. |
| Comparing policies before and after | Diffing migration SQL | Diffing `pg_policies` output | Postgres re-prints the predicate in its own normalised form. Comparing renderings compares what is applied, not what was typed. |
| Evaluating RLS as a given role | Reasoning about the predicate | `set local role` + `set_config('request.jwt.claims', …)` inside `begin/rollback` | Demonstrated working. Reasoning about 67 predicates by hand is how a widening slips through. |
| Caching a permission per request | A module-level `Map` or a global | React `cache()` | A module-scoped cache in a server runtime leaks across requests — a permission leak, not a stale render. |
| Making a capability answer fast in a policy | A materialised table of resolved permissions | `(select …)` wrapping | One InitPlan per statement, verified by EXPLAIN. A resolved-permissions table needs invalidation, and stale invalidation violates CAP-04. |
| Getting capabilities to the client | A custom access token hook | A per-request resolver call | `jwt_exp = 3600`. See (b). |
| Type-safety across the SQL/TS boundary | Trusting the build | One shared const module, plus a written assertion that its keys match `private.capabilities` | No client is parameterised with `Database`; `.rpc()` is untyped. |

**Key insight:** the expensive parts of this phase are not the code — they are *knowing what the behaviour is* and *proving it did not change*. Both are already solved by tools this project can reach today; the only thing worth hand-rolling is the harness that calls them and writes the JSON.

---

## Runtime State Inventory

This is a refactor phase, so the question is: after every file in the repository is updated, what still holds the old shape?

| Category | Items found | Action required |
|---|---|---|
| **Stored data** | `profiles.role` and `profiles.status` are the **only** stored permission state — 4 rows: 1 `master/approved`, 3 `member/approved`. **No `organizer` row and no non-approved row exists in production.** Two new tables will need seed rows (the catalogue and the grants), and those rows *are* the behaviour. | **Data migration in the same migration as the DDL** (`supabase-data.md`, gate *tabella nuova = policy nuova*). The seed is not a fixture — an empty `role_capabilities` denies everything. Also: the persona baseline cannot be produced from production; use a container (§ (d)). |
| **Live service config** | Two settings that live in the Supabase dashboard, **not in git**, and that this phase depends on: `hook_custom_access_token_enabled = false` (must stay false, or CAP-04 breaks silently) and PostgREST `db_schema = "public,graphql_public"` (the `private` schema must **not** be added to it, or every helper becomes REST-callable). Both were read via the Management API. | **No change. Record both as invariants in the plan**, with the command to re-check each, because nothing in the repository would notice if either changed. |
| **OS-registered state** | None. The four Vercel cron entries in `vercel.json` authenticate with `CRON_SECRET`, not with a role, and are untouched. | None. |
| **Secrets / env vars** | `MASTER_EMAIL` — `src/app/api/auth/callback/route.ts:28,31` promotes a matching email by writing `profiles.role = 'master', status = 'approved'`. Since the model reads `profiles.role`, this path keeps working with **no change**. `TICKET_SIGNING_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` — unaffected. | **None** — but assert it: the promotion path is a privileged escalation route (`access-gating.md`, gate *escalation privilegi*), and a plan that changes where role is read from must prove it still lands. |
| **Build artefacts / installed packages** | `public/sw.js` — gitignored, 53,166 bytes, **precaches all four door routes** (`31-VERIFICATION.md`). A phone can hold a cached response produced before this deploy. `src/types/database.ts` is hand-written and must gain the new shapes in the same commit. `tsconfig.tsbuildinfo` is incremental state, harmless. | **Do not change any door route's response shape in this phase.** Update `src/types/database.ts` in the same commit as the migration. |

---

## Common Pitfalls

### Pitfall 1 — unifying P1 and P3

**What goes wrong:** one `event.manage`-style capability replaces both `is_admin_or_organizer()` and the inline `role + approved` EXISTS. A pending organizer silently gains insert and update on `venues` and `artists` — or thirty-four other policies silently start requiring approval.
**Why it happens:** the two predicates read as the same sentence in English, and a capability model's whole appeal is collapsing sentences.
**How to avoid:** distinct grant rows with `requires_approved` set per capability, and B3 (the write matrix) run with an `organizer/pending` persona — which **cannot** come from production, because no such row exists.
**Warning sign:** the capability catalogue has fewer than five distinct predicates behind it.

### Pitfall 2 — wrapping the correlated `EXISTS`

**What goes wrong:** `event_parties_update_own` / `_delete_own` stop scoping to the owned event; every organizer can edit every party, or none can.
**Why it happens:** the advisor says "wrap the function call"; the surrounding `EXISTS` looks like the same kind of thing.
**How to avoid:** class D in § (e) — wrap only the `auth.uid()` token; capture `EXPLAIN` before and after for these two.
**Warning sign:** a diff line touching `event_parties.event_id`.

### Pitfall 3 — a baseline that passes because the data is empty

**What goes wrong:** B2 and B3 show identical results because most tables hold 0 rows. `rsvps`, `attendances`, `event_media`, `discount_codes`, `ticket_refunds`, `newsletter_subscribers` and `door_scan_events` are all **empty in production**. A policy could be inverted and the fingerprint would not move.
**Why it happens:** production is nearly empty — `STATE.md` calls it the safest moment for a deep change, and for the change it is; for the *proof* it is the weakest.
**How to avoid:** the container baseline must seed **at least two rows per table, owned by different personas**, so that "mine" and "not mine" are distinguishable. State the seed rule in the plan; it is the difference between a baseline and a green screen.
**Warning sign:** any fingerprint equal to `d41d8cd9…` (the md5 of the empty string) on both sides.

### Pitfall 4 — a green build read as a verified schema

**What goes wrong:** `npm run build` passes, the phase is called verified, and a mistyped column or a non-existent RPC name ships.
**Why it happens:** none of the four clients is parameterised with `Database` (`client.ts:4`, `server.ts:7`, `middleware.ts:15`, `service.ts:4`) and `src/types/database.ts` is hand-written with no `Functions` map.
**How to avoid:** every claim about a column or an RPC needs a database-side observation, not a build.
**Warning sign:** the phrase "the build passes" in a verification document, unaccompanied by an observation.

### Pitfall 5 — a resolver failure that denies everything, quietly

**What goes wrong:** the RPC fails; the resolver returns an empty set; every surface refuses. A refused master is indistinguishable from a correctly-refused member, and **no error tracking exists** to say otherwise.
**Why it happens:** `catch { return new Set() }` is the natural shape.
**How to avoid:** throw with a distinguishable category; make the denial observable. `meta-gates.md` records the newsletter precedent.
**Warning sign:** any `catch` in the capability path that returns a value.

### Pitfall 6 — a probe that commits

**What goes wrong:** a write probe inserts a row into production and it stays.
**Why it happens:** `read_only: true` cannot switch role (verified: `42501`), so probes must run read-write, and the only thing standing between the probe and a permanent write is the trailing `rollback;`.
**How to avoid:** one probe per request; every statement string ends `rollback;`; no `commit` anywhere; the harness re-reads all 20 row counts afterwards and asserts they are unchanged. Verified during this research: `venues` still held its original row count after a successful-then-rolled-back master insert.
**Warning sign:** a probe string containing `commit`, or two probes concatenated into one request.

### Pitfall 7 — ordering the middleware branches wrong

**What goes wrong:** `/admin/scanner` falls into the general `/admin` branch and organizers lose the door.
**Why it happens:** `:82` and `:90` are an `if` / `else if` pair and the specific case is first. A rewrite that turns four prefix rules into a lookup table can lose the ordering.
**How to avoid:** record the ordering in B4 with its line numbers, and probe `/admin/scanner` as an organizer explicitly.
**Warning sign:** a route→capability map keyed by prefix with no longest-match rule.

---

## Findings outside this phase's scope

Raised because `CLAUDE.md` requires competence to generate questions, not only answers. **None of these should be fixed inside phase 32** — the first two would change behaviour, and this phase's contract is that behaviour does not change.

1. **The login redirect parameter is dead.** `src/lib/supabase/middleware.ts:74` writes `?redirect=<pathname>`; `src/app/(auth)/login/page.tsx:11` reads `?next=`. A member bounced from a protected route is never returned to it. This changes navigation, not access, so it does not touch CAP-03 — but fixing it silently inside a constant-behaviour phase would blur the baseline. Raise it to the owner as its own small item.
2. **The four capability helpers have a mutable `search_path` and are REST-callable by `anon`.** Thirteen `function_search_path_mutable` and 14 + 14 `*_security_definer_function_executable` warnings from the security advisor. New functions must not repeat it; hardening the existing four is a separate, deliberate change.
3. **No client is parameterised with `Database`.** The single largest verification gap in the repository. Closing it needs generated types, which needs the Supabase CLI, which is not installed. Worth its own phase.
4. **46 `multiple_permissive_policies` warnings.** Real, and out of scope: merging permissive policies changes the predicate set.
5. **`src/utils/qr.ts` still generates membership codes with `Math.random()`.** Tracked as QR-01, deferred, still true.

---

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|---|---|---|---|
| Role in a column, read per request | Still the mainstream Supabase pattern for permissions that must change immediately | — | Confirms the phase's direction; CAP-04 requires it |
| Permissions in JWT custom claims | Supabase's documented RBAC guide recommends it *for performance* | since Auth Hooks GA | **Recommended by the vendor and forbidden here.** Say so in the plan with the reason, or it will be proposed again |
| `auth.uid()` written bare in policies | `(select auth.uid())`, enforced by the `auth_rls_initplan` linter | linter shipped with Database Advisors | Exactly the 26 policies of CAP-06 |
| Policies with no `TO` clause | `to authenticated`, so the predicate never runs for `anon` | same doc | **Out of scope** — 41 of 67 policies are `{public}`; adding `TO` clauses changes the policy set and would break the B1 whitelist. Record as a follow-up |
| `SECURITY DEFINER` helpers in `public` | Same helpers in a non-exposed schema | same doc | Why the new functions go in `private` |

**Deprecated / superseded in this repository:** the assumption in `.planning/codebase/CONCERNS.md` (dated 2026-02-24) that the middleware has no role check — it does, at `:82`–`:118`. `CLAUDE.md` Guardrail 4 already warns that this directory is stale; re-verify every entry against current code before citing it.

---

## Validation Architecture

There is **no test runner for the product**. `package.json` has `dev`, `build`, `start`, `lint`, `verify:persona` and nothing else; no `*.test.*` or `*.spec.*` file exists. Every requirement below therefore states its evidence as exactly one of: **`file:line`** (a static assertion anyone can re-open), **observable** (a behaviour visible in a response, on a screen, or in the data), or **manual** (a written procedure naming the role and the steps, executed and written down).

### Framework

| Property | Value |
|---|---|
| Product test framework | **none** — and none is introduced |
| Automatic gate | `npm run build` → `next build --webpack`, which is also the typecheck. **Proves the TypeScript is well-formed. Proves nothing about any column, table or RPC name** — no client is parameterised with `Database` |
| Persona gate | `npm run verify:persona` — covers `.claude/**` consistency only, not the product |
| Evidence harness | a script under `scripts/` calling the Supabase Management API, producing committable JSON under `.planning/phases/32-.../baseline/` |
| Quick run | `npm run build` |
| Full run | `npm run build` **plus** the five baseline artefacts re-captured and compared |

### Phase requirements → evidence

| Req | Behaviour | Evidence kind | Concrete evidence |
|---|---|---|---|
| **CAP-01** | One definition, three callers | `file:line` + observable | (i) exactly one `has_capability` definition exists: `select count(*) from pg_proc … proname='has_capability'` → **1**; (ii) `grep -c 'is_admin_or_organizer\|is_master\|get_user_status' <post-change pg_policies dump>` → **0**; (iii) the same capability key appears in `private.capabilities`, in the policy predicate, and in `src/lib/capabilities/keys.ts` — asserted by a script, since the build cannot |
| **CAP-03** | Neither more nor less | **B1 + B2 + B3 + B4 + B5** | **The named artefacts, in `.planning/phases/32-.../baseline/`:** `32-BASELINE-policies.json` (67 rows of `pg_policies`, normalised diff against a two-transformation whitelist) · `32-BASELINE-reads.json` (persona × table: count **and** md5 of sorted visible primary keys) · `32-BASELINE-writes.json` (persona × table × verb: `ok` or SQLSTATE) · `32-BASELINE-surfaces.md` (`file:line` + exact predicate for all 4 middleware rules, 5 guard families, 4 door routes, `NAV_ITEMS`, 21 role reads) · `32-BASELINE-advisors.json`. **Comparison:** B1 diff explained entirely by the whitelist; B2 every count and fingerprint identical; B3 every cell identical including SQLSTATE; B4 predicate column character-identical; B5 `auth_rls_initplan` 26 → **0** and `multiple_permissive_policies` **46**, `unindexed_foreign_keys` **35**, `unused_index` **14** all unchanged. Captured **twice**: against a throwaway PostgreSQL **17.6** container seeded with one profile per (role × status) and ≥2 differently-owned rows per table (7 personas, full coverage), and against production for the 3 personas that exist (schema truth) |
| **CAP-04** | A grant takes effect on the next request, with no session or token refresh | observable + `file:line` | (i) `select count(*) from pg_proc p join pg_namespace n … where n.nspname='auth' and p.proname='jwt'` is irrelevant — the real assertion is `GET /config/auth` → `hook_custom_access_token_enabled = false`, captured in B5 and re-asserted after; (ii) **manual, written down:** sign in as a member in one browser; a master inserts one row into `private.role_capabilities` granting that member a capability; the member **reloads the page without signing out** and the surface changes; the row is deleted and the next reload reverts it. Record the two reload timestamps — the point is that neither is an hour after the grant; (iii) `grep -rn 'my_capabilities\|has_capability' src` shows no call reading from `session.access_token` |
| **CAP-06** | All 26 reviewed, per policy, with the result recorded | `file:line` + observable | (i) a table in `32-VERIFICATION.md` with **26 rows**: table, policy, cmd, class (A–E), transformation applied, and result; (ii) B5 after → `auth_rls_initplan` **0**; (iii) for classes **D** (`event_parties_update_own`, `event_parties_delete_own`) and **E** (`profiles_update_own`), `EXPLAIN (VERBOSE, COSTS OFF)` captured under a persona before and after, showing no correlated subquery became an InitPlan; (iv) a dedicated write probe: an `approved member` running `update public.profiles set role='master' where id = <own>` fails identically before and after — this is the privilege-escalation guard |

### Sampling rate

- **Per task commit:** `npm run build`.
- **Per wave merge:** `npm run build` + re-capture B1 and B5 and diff. Both are read-only and take seconds.
- **Phase gate:** all five artefacts re-captured on both targets, all comparisons clean, plus the CAP-04 manual procedure executed and written into `32-VERIFICATION.md` with `file:line` evidence per requirement (`CLAUDE.md`, *Gate VERIFICATION.md* — a document without a single `file:line` citation does not satisfy the gate).

### Wave 0 gaps — what must exist before any DDL is written

- [ ] `scripts/rls-baseline.mjs` — captures B1, B2, B3, B5 against a target given by env; writes deterministic JSON; **one probe per request; every write probe string ends `rollback;`; no `commit`; asserts all 20 row counts unchanged afterwards**
- [ ] `scripts/rls-baseline-container.mjs` (or a flag on the above) — builds a throwaway **PostgreSQL 17.6** container from `supabase/migrations/**`, seeds 7 personas and ≥2 differently-owned rows per table, runs the same capture. `pg@^8.18.0` is already a devDependency; precedent is plan `31-03`
- [ ] `32-BASELINE-surfaces.md` (B4) — written by hand from the code, before anything moves
- [ ] Baseline captured on **both** targets and committed **before the first migration file exists**. A baseline taken after the change is not a baseline

*(There is no gap for "install a test framework": none is introduced, deliberately.)*

---

## Security Domain

### Applicable ASVS categories

| Category | Applies | Standard control in this phase |
|---|---|---|
| **V1 Architecture** | yes | The database is the boundary; the middleware is UX. Stated in `CLAUDE.md`, enforced by making every capability reach a policy |
| **V2 Authentication** | no change | Session comes from Supabase Auth; `auth.getUser()` at `middleware.ts:40`. Untouched |
| **V3 Session Management** | **yes, by exclusion** | Capabilities must **not** enter the session token — `jwt_exp = 3600` makes a token-carried capability stale for an hour (CAP-04) |
| **V4 Access Control** | **yes — the whole phase** | One definition, evaluated by RLS. Two specific controls: no self-escalation (`profiles_update_own`, class E) and no path that grants a capability to the caller |
| **V5 Input Validation** | yes, narrowly | The resolver takes a capability key, never a user identifier. The exposed wrapper takes **no argument at all** |
| **V6 Cryptography** | no | Nothing cryptographic in this phase. `src/utils/qr.ts`'s `Math.random()` remains open as QR-01 |
| **V7 Error Handling** | **yes** | No error tracking exists. A resolver failure must be distinguishable and observable, never an empty set |
| **V14 Configuration** | **yes** | `SECURITY DEFINER` in a non-exposed schema, `SET search_path = ''`, `EXECUTE` revoked from `anon`. All three are already violated by the four existing helpers and flagged by the security advisor |

### Known threat patterns for this stack

| Pattern | STRIDE | Standard mitigation |
|---|---|---|
| Privilege escalation by self-update of `role`/`status` | Elevation | `profiles_update_own`'s `WITH CHECK` — class E, probed explicitly before and after |
| A `SECURITY DEFINER` function in an exposed schema, callable by `anon` | Elevation / Information disclosure | New functions in `private`; the one `public` wrapper takes no argument and is granted to `authenticated` only |
| `search_path` hijack against a `SECURITY DEFINER` function | Elevation | `SET search_path = ''` and fully-qualified references. 13 existing functions lack it |
| Enumeration oracle on a "valid / not valid" endpoint | Information disclosure | Argument-less resolver. **No rate limiting exists anywhere** (verified 2026-08-05) — the mitigation is the shape of the API, not a limiter |
| Widening via an added PERMISSIVE policy | Elevation | Replace policies in place; B1's whitelist rejects any added policy |
| Bypassing RLS via the service-role client | Elevation | 29 files use it. Any capability check performed with it proves nothing; justify each use in the commit (`access-gating.md`) |
| A stale capability carried in a token | Elevation (after revocation) | Never in the token — CAP-04, and `hook_custom_access_token_enabled` asserted `false` before and after |
| Trusting a request header for a role | Spoofing | Already mitigated at `middleware.ts:131-133`; **ending the trust entirely is CAP-05, Phase 33** |

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node | build, harness | ✓ | 25.6.1 | — |
| npm | build | ✓ | 11.9.0 | — |
| `npm run build` | the only automatic gate | ✓ | `next build --webpack` | — |
| Supabase Management API | policy dump, persona probes, advisors, applying migrations | ✓ | `SUPABASE_ACCESS_TOKEN` present in `.env.local`; migrations endpoint proven on 2026-08-06 (version `20260806111113`) | — |
| Production database | schema truth, 3-persona spot check | ✓ | PostgreSQL 17.6 | — |
| `pg` (node driver) | throwaway-container baseline | ✓ | `^8.18.0`, already a devDependency | — |
| Docker / a throwaway PostgreSQL 17.6 | the 7-persona baseline | **unverified in this session** | — | Without it, the baseline covers only 3 of 7 personas and **cannot exercise `organizer` at all** — which is the role CAP-03 is mostly about. There is no adequate fallback; treat as **blocking for CAP-03**, not for the phase's code |
| Supabase CLI | `gen types`, pgTAP | **✗** — recorded absent in `31-VERIFICATION.md` | — | Management API for everything; generated types deferred to their own phase |
| A second browser session / two roles | the CAP-04 manual procedure | needs a human | — | None. It is a manual step by nature |

**Missing with no adequate fallback:** a PostgreSQL 17.6 container for the 7-persona baseline. **Verify Docker before planning Wave 0** — if it is unavailable, the plan must say so and CAP-03's evidence is materially weaker, rather than pretending otherwise.

**Missing with a fallback:** the Supabase CLI — every capability it would provide is reachable through the Management API.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | The `private` schema plus `requires_approved` grant shape is the right form for the single definition | (a), Architecture Patterns | Design churn at plan time. The *placement* (SQL, non-exposed) is forced and verified; the *table shape* is a judgement. Worth a `/gsd-discuss-phase` before planning |
| A2 | Replacing the middleware's `profiles.select` with one RPC is round-trip-neutral | (b) | If PostgREST function invocation is measurably slower than a single-row select, every request pays. Measure once during Wave 1 rather than assuming |
| A3 | The capability keys named for the four middleware rules (`admin.access`, `organizer.access`, `door.operate`, `membership.card.view`) are the right granularity | (f) | Naming only — but Phase 34's CAP-02 makes every key a build-time contract, so renaming later costs more than it looks |
| A4 | React `cache()` behaves as documented in Next 16 with the App Router in this configuration | Pattern 4 | If it does not memoise, a page asking twice pays twice. No `cache` usage exists in the repo to copy from — verify on first use |
| A5 | Seeding ≥2 differently-owned rows per table is sufficient to make the baseline discriminating | Pitfall 3 | An under-seeded table produces a baseline that passes vacuously |
| A6 | `EXPLAIN` output shape is stable enough to diff for classes D and E | (e), CAP-06 evidence | If plan text varies run to run, compare the *presence* of InitPlans and the correlation of subqueries rather than the literal text |
| A7 | Docker is available on this machine | Environment Availability | The 7-persona baseline is unbuildable; CAP-03 evidence weakens to 3 personas, none of them `organizer` |

Everything in § *Measured Baseline*, § (b), § (e) and § *Findings outside scope* is `[VERIFIED]` — read from the live database, the live Auth configuration, the advisors, or the files at the cited lines during this session. Everything in § *Architecture Patterns* is a recommendation built on those measurements.

---

## Open Questions

1. **Do `artists` and `venues` keep requiring `approved`?**
   *Known:* they do today, and thirty-four other policies do not (P1 vs P3).
   *Unclear:* whether that is a decision or an accident of authorship.
   *Recommendation:* **reproduce it in phase 32 regardless** — CAP-03 leaves no choice. Surface it to the owner as a question for a later phase, and let the `requires_approved` column carry it in the meantime so the question stays visible.

2. **Does a capability key belong to a route, a table, or an action?**
   *Known:* Phase 34's CAP-02 will fail the build for a capability mapped to no route, which pulls the naming towards routes; but a policy gates a table, which pulls it towards tables.
   *Unclear:* what happens to a capability that gates a server action with no route of its own — `updateMemberRole`, the SumUp refund path.
   *Recommendation:* decide the naming axis in `/gsd-discuss-phase` **before** planning. Renaming after Phase 34 costs a build-breaking migration.

3. **Does the plan create a real `organizer` profile in production for verification?**
   *Known:* none exists; the door, `/organizer/*` and P3 are all organizer-shaped, and none of them can be observed in production today.
   *Unclear:* whether the owner wants a staff account created now, or the container baseline accepted as sufficient.
   *Recommendation:* ask. This is the single largest gap between the evidence a plan can produce and the behaviour CAP-03 is about.

4. **Is `language sql` or `language plpgsql` used for the new functions?**
   *Known:* all four existing helpers are plpgsql; Supabase's examples use both.
   *Unclear:* whether consistency with the existing four or inlinability matters more here.
   *Recommendation:* either is defensible; make it a declared decision in the plan rather than a silent one.

5. **Is Docker available on this machine?**
   *Known:* `pg@^8.18.0` is present and plan `31-03` ran a throwaway container successfully.
   *Unclear:* whether that container came from Docker and whether it is available today.
   *Recommendation:* check in the first task of Wave 0. It determines whether CAP-03's evidence covers seven personas or three.

---

## Sources

### Primary (HIGH confidence)

- **The live production database**, read 2026-08-06 through the Supabase Management API: `pg_policies` (67 rows, full predicates), `pg_proc` (function volatility, `prosecdef`, `proconfig`), `pg_class.relrowsecurity` (20 tables), `select version()` (PostgreSQL 17.6), `EXPLAIN (VERBOSE, COSTS OFF)` under an impersonated persona, and read/write persona probes inside `begin/rollback`.
- **`GET /v1/projects/{ref}/advisors/performance`** — 26 `auth_rls_initplan`, 46 `multiple_permissive_policies`, 35 `unindexed_foreign_keys`, 14 `unused_index`, each naming its policy or table.
- **`GET /v1/projects/{ref}/advisors/security`** — 13 `function_search_path_mutable`, 14 + 14 `*_security_definer_function_executable`, 1 `auth_leaked_password_protection`.
- **`GET /v1/projects/{ref}/config/auth`** — `hook_custom_access_token_enabled=false`, `jwt_exp=3600`, `refresh_token_rotation_enabled=true`.
- **`GET /v1/projects/{ref}/postgrest`** — `db_schema="public,graphql_public"`.
- **supabase.com/docs/guides/database/postgres/row-level-security** — "Call functions with `select`", the InitPlan mechanism and its one precondition; "Use security definer functions" and the instruction never to place them in an exposed schema; "Specify roles in your policies".
- **supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac** — the custom access token hook "runs before a token is issued".
- **The repository at `main` (a36b7d9)** — every `file:line` in this document was re-read against the working tree during this session.
- **`.planning/phases/31-.../31-VERIFICATION.md`** — the untyped-client finding, the service-worker finding, the migration applied to production on 2026-08-06.
- **`CLAUDE.md` and `.claude/rules/{access-gating,supabase-data,meta-gates,community-membership}.md`**.

### Secondary (MEDIUM confidence)

- `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` — decisions and boundaries, authoritative for intent, not for the state of the code.

### Not used

- `.planning/codebase/**` — dated 2026-02-24; `CLAUDE.md` Guardrail 4 records that several entries are superseded. No claim in this document rests on it.
- `supabase/schema.sql` — contains no RLS at all; read only for the helper-function bodies, and every one of those was re-verified against `pg_proc` on the live database.

---

## Metadata

**Confidence breakdown:**

- **Measured baseline** — HIGH. Read from the live database and cross-checked: the 26 policies were counted independently by a predicate scan and by Supabase's own advisor, and the two agree exactly.
- **CAP-06 safety analysis** — HIGH. The decision rule comes from the vendor's documented precondition, and the InitPlan mechanism was confirmed with `EXPLAIN` on this database, on this Postgres version.
- **CAP-04** — HIGH. The conclusion follows from two configuration values read from this project, not from a general argument about JWTs.
- **CAP-03 verification method** — HIGH on feasibility (every technique was executed successfully, including the two constraints that limit it), MEDIUM on completeness (the 7-persona baseline depends on Docker, which was not verified).
- **The recommended shape of the single definition** — MEDIUM. The placement is forced and verified; the table shape and the capability naming are judgements that should survive `/gsd-discuss-phase` before they survive a plan.
- **Middleware analysis** — HIGH. Read line by line; every line number re-checked.

**Research date:** 2026-08-06
**Valid until:** 2026-09-05 for the documentation citations. **The measured baseline is valid only until the next migration is applied** — re-capture B1 and B5 at the start of planning if any DDL has landed in between.
