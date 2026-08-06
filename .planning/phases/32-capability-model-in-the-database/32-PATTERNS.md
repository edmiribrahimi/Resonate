# Phase 32: Capability Model in the Database — Pattern Map

**Mapped:** 2026-08-06
**Files analyzed:** 12 (8 new, 4 modified)
**Analogs found:** 9 / 12 exact or role-match · 2 partial · 1 with no in-repo analog

> **This repository is public.** Every excerpt below is code already published in
> this repo. No project reference, no identifier, no key, no address and no person's
> name appears here. Where an example needs a person, it names a **role**.

> **Sources of the file list:** `32-RESEARCH.md` § *Architecture Patterns*
> (Patterns 1–4), § *(f) What the middleware does today*, § *Runtime State
> Inventory*; `32-VALIDATION.md` § *Wave 0 Requirements* and § *Per-Requirement
> Verification Map*. No `32-CONTEXT.md` exists — `/gsd:discuss-phase` has not run
> for this phase, so the discretionary items in RESEARCH § *Claude's discretion*
> are still open and are marked below where a pattern choice depends on them.

> **This is a constant-behaviour phase.** Every pattern below is chosen to make a
> *replacement* possible, never an *addition*. `supabase-data.md`, gate *RLS
> contestuale*: PERMISSIVE policies are OR'd, so a policy added beside an existing
> one widens access — which is the one defect CAP-03 forbids absolutely.

---

## File Classification

| New/Modified file | New? | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|---|
| `scripts/rls-baseline.mjs` | **new** | script (evidence harness) | request-response (HTTP) + file-I/O (JSON) | `scripts/verify-persona.mjs` | **partial** — conventions yes, external API and JSON output have no precedent |
| `scripts/rls-baseline-container.mjs` (or a flag on the above) | **new** | script (throwaway DB harness) | batch + file-I/O | `scripts/verify-persona.mjs` for shape; `31-REFUND-PROBE.md` for the *method* | **partial** — the container probe was run ad hoc and never committed as code |
| `scripts/verify-capabilities.mjs` (CAP-01 evidence iii) | **new** | script (consistency check) | transform | `scripts/verify-persona.mjs` check **G** (`:369-441`) | **exact** |
| `.../baseline/32-BASELINE-{policies,reads,writes,advisors}.json` | **new** | artefact (committed evidence) | file-I/O | **none** — `.planning/` holds no JSON artefact today except `config.json` | none |
| `.../baseline/32-BASELINE-surfaces.md` (B4) | **new** | artefact (hand-written evidence) | — | `31-REFUND-PROBE.md`; `31-VERIFICATION.md` | **exact** |
| `supabase/migrations/<ts>_capability_model.sql` | **new** | migration (schema + tables + RLS + functions + seed) | schema DDL | `20260805120000_door_scan_events.sql` (structure) + `20260224_rbac_migration.sql:95-142` (functions, naming) | **exact** |
| `supabase/migrations/<ts>_policies_to_capabilities.sql` | **new** | migration (policy replacement in place) | schema DDL | `20260224_rbac_migration.sql:27-56` (drop-before-recreate) + `20260805120000_door_scan_events.sql:149-156` | **exact** |
| `supabase/migrations/<ts>_wrap_auth_uid.sql` | **new** | migration (26-policy mechanical rewrite) | schema DDL | same as above; the wrapped call form at `20260224_rbac_migration.sql:151` | **exact** |
| `src/lib/capabilities/keys.ts` | **new** | shared type contract | transform (pure) | `src/lib/door/outcome.ts` | **exact** |
| `src/lib/capabilities/server.ts` | **new** | service (per-request resolver) | request-response | `src/lib/supabase/server.ts` + `src/app/api/webhooks/sumup/route.ts:48-60` | **partial** — no `cache()` usage exists in the repo |
| `src/lib/supabase/middleware.ts` | modified | middleware | request-response | itself — `:44-57`, `:78-118` | **exact** (self) |
| `src/types/database.ts` | modified | model / types | transform | itself — `:1-13`, `Profile:19-30` | **exact** (self) |
| `package.json` (one `scripts` entry) | modified | config | — | itself — `:5-11` | **exact** (self) |

**Whether the policy rewrite is one migration or three** is a plan decision, not a
pattern decision. The repo has both precedents: `20260805120000_door_scan_events.sql`
puts four unrelated table changes in one transaction and says why in its header
(`:14-15`); `20260224_rbac_migration.sql` does the same for a whole RBAC cutover.
What the patterns require either way is that **each migration is one `BEGIN;` …
`COMMIT;`** and that the B1 whitelist can explain every predicate it moves.

---

## Pattern Assignments

### `supabase/migrations/<ts>_capability_model.sql` (migration, DDL + RLS + seed)

**Analog:** `supabase/migrations/20260805120000_door_scan_events.sql` — applied to
production on 2026-08-06 and verified there. It is the current template, and it is
the one to copy rather than an older migration: it is the only file in the repo that
combines a new table, its indexes, its RLS **and** a written justification for every
non-obvious choice, all inside one transaction.

**Header block + transaction wrapper** (`20260805120000_door_scan_events.sql:1-17`):

```sql
-- Door scan events, refund evidence, per-party presence, guest-list check-in
-- Phase 31, Plan 04: the schema foundation for the live door defects
--
-- Changes:
-- 1. Create public.door_scan_events (append-only) with its indexes and RLS,
--    in this same file
-- 2. ticket_refunds: ticket_id becomes nullable and ON DELETE SET NULL, plus
--    four non-FK evidence columns that survive the ticket they name (Option B)
...
-- Four tables, one transaction. A half-applied version of this file is worse
-- than none of it, so BEGIN; ... COMMIT; is not decoration.

BEGIN;
```

…and it closes with `COMMIT;` at `:335`. Copy the shape exactly: a numbered change
list, then a sentence saying why the transaction wrapper is there.

**Section banners** (`:19-21`) — the file's own visual grammar:

```sql
-- =============================================================================
-- 1. public.door_scan_events — the night's record
-- =============================================================================
```

**Idempotent DDL** (`:60-61`, `:123-124`, `:194-195`) — `supabase-data.md`, gate
*idempotenza DDL*:

```sql
CREATE TABLE IF NOT EXISTS public.door_scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
...
CREATE INDEX IF NOT EXISTS idx_door_scan_events_party
  ON public.door_scan_events (party_id, recorded_at);
...
ALTER TABLE public.ticket_refunds
  ADD COLUMN IF NOT EXISTS refunded_ticket_id uuid;
```

RESEARCH § *Architecture Patterns* Pattern 1 already writes the new objects in this
form (`create schema if not exists private;`, `create table if not exists
private.capabilities (…)`). Keep it, and keep the repo's `DROP … IF EXISTS` before
every `CREATE POLICY` (`:149`).

**RLS in the same file as the table** (`:140-163`) — `supabase-data.md`, gate
*tabella nuova = policy nuova*. Note the paragraph that explains an omission,
because this phase has the same problem in a stronger form:

```sql
ALTER TABLE public.door_scan_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS door_scan_events_select_admin ON public.door_scan_events;

CREATE POLICY door_scan_events_select_admin ON public.door_scan_events
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

-- No INSERT, UPDATE or DELETE policy, and the omission is deliberate. […]
-- No other table in this repository omits its write policies on purpose, so
-- without this paragraph the next reader would take it for a bug and repair it.
```

**Apply the same discipline, inverted.** `private.capabilities` and
`private.role_capabilities` get **no** policy — because PostgREST exposes
`public,graphql_public` only, so nothing in `private` is reachable over REST
(RESEARCH § *Measured Baseline*, `GET /postgrest` [VERIFIED]). That is a *stronger*
answer than RLS, and it is also the first time this repo creates a table without one.
**Write the paragraph.** Without it the next reader repairs a non-bug, and the repair
— `ALTER TABLE private.capabilities ENABLE ROW LEVEL SECURITY` with a policy — would
be harmless, while the *other* plausible repair (adding `private` to the exposed
schemas so the tables "work") turns every helper into a REST endpoint.

**The security-definer helper, and everything wrong with the existing four**
(`20260224_rbac_migration.sql:95-135`). This is the analog to follow **in structure
and to diverge from in three specific attributes**:

```sql
-- ============================================================
-- Step 5: Create security definer helper functions for RLS
-- ============================================================
-- These bypass RLS internally and are cached by Postgres optimizer per-statement.
-- STABLE volatility allows optimizer to call once per query instead of per-row.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

| Attribute | The four existing helpers | The new resolver | Why |
|---|---|---|---|
| Schema | `public` | **`private`** | PostgREST exposes `public`; the security advisor already raises `anon_security_definer_function_executable` on all four |
| `search_path` | **not set** | **`SET search_path = ''`** + fully-qualified references | 13 × `function_search_path_mutable` on the live advisor |
| Language | `plpgsql` | **open decision** — RESEARCH *Open Question 4* | Either is defensible. **Declare it in the plan; do not switch silently** |
| Volatility | `STABLE` | `STABLE` | Copy. But note the measured finding below |
| Grants | none written | `REVOKE … FROM public, anon, authenticated` on the private resolver; `GRANT EXECUTE … TO authenticated` on the one public wrapper | RESEARCH Pattern 2 |

**The comment at `:97-98` is wrong and must not be copied forward.** It says `STABLE`
is what makes the optimizer call the function once per query. RESEARCH § *(e)* proved
with `EXPLAIN (VERBOSE, COSTS OFF)` on this database that `STABLE` alone buys nothing:
**the `(SELECT …)` wrapper is what creates the InitPlan.** Both `auth.uid()` and
`is_admin_or_organizer()` are `STABLE`; only the wrapped one becomes an InitPlan. If
the new migration repeats that sentence it re-publishes the misunderstanding that
produced the 26 unwrapped call sites.

**The wrapped call form — the in-repo precedent for the whole CAP-06 transformation**
(`20260224_rbac_migration.sql:151`):

```sql
-- Master and organizers can read all profiles
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));
```

The same form appears at `20260224_rbac_migration.sql:164, 181, 202, 212, 222, 228`,
`20260225150000_party_architecture.sql:50, 63`, `20260227200000_ticket_refunds.sql:27`,
`20260310000000_guest_list.sql:77` and `20260805120000_door_scan_events.sql:156`, and
`:153-154` of the newest migration states the rule in prose:

```sql
-- The parentheses around the helper call are load-bearing — a bare call is
-- re-evaluated per row (20260224_rbac_migration.sql:127-135).
```

**Policy naming convention, declared in the repo itself**
(`20260224_rbac_migration.sql:140-142`):

```sql
-- Naming convention: {table}_{operation}_{who}
-- Helper functions used instead of inline subqueries for performance.
```

CAP-03 forbids renaming: **B1 compares `pg_policies.policyname`**, so a policy whose
predicate is replaced keeps its existing name, whatever the convention would have
called it. The convention governs only a policy this phase creates from nothing —
and this phase should create none.

**Seed rows are behaviour, not fixtures.** RESEARCH § *Runtime State Inventory*:
an empty `role_capabilities` denies everything. The in-repo precedent for data
written inside a schema migration is `20260224_rbac_migration.sql:25`:

```sql
UPDATE public.profiles SET role = 'organizer' WHERE is_admin = true;
```

Put the catalogue and grant `INSERT`s in the same file as the DDL, inside the same
transaction, with `ON CONFLICT DO NOTHING` for idempotence — the repo's existing
conflict-tolerant insert is `20260226200000_venues.sql:65-67`:

```sql
insert into storage.buckets (id, name, public, file_size_limit)
values ('venue-photos', 'venue-photos', true, 5242880)
on conflict (id) do nothing;
```

---

### The two organizer shapes — map them as **two distinct analogs**

This is the phase's single highest-risk mapping, and the excerpts exist so that no
plan can collapse them by accident.

**Shape P1 — role only, status ignored (34 policies).** Analog:
`20260224_rbac_migration.sql:127-135` (the function) and `:151` (a call site):

```sql
CREATE OR REPLACE FUNCTION public.is_admin_or_organizer()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  user_role := (SELECT public.get_user_role());
  RETURN user_role = 'master' OR user_role = 'organizer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

There is **no `status` in that body.** A pending organizer passes it.
→ grant rows with `requires_approved = false`.

**Shape P3 — role AND `status = 'approved'` (4 policies).** Analog:
`20260226200000_venues.sql:29-51` and, byte-identically,
`20260226100000_artist_profiles.sql:30-42`:

```sql
-- Organizers and master can insert
create policy "venues_insert_organizer"
  on public.venues for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('organizer', 'master')
        and status = 'approved'
    )
  );
```

→ grant rows with `requires_approved = true`, on their **own** capability key.

**Shape P4 — master only, inline (2 policies)** (`20260226200000_venues.sql:53-62`):

```sql
create policy "venues_delete_master"
  on public.venues for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'master'
    )
  );
```

No `status`. → `requires_approved = false`, and note it is **not** the same capability
as P2's `is_master()` unless the plan proves the two predicates are equivalent — they
are (`role = 'master'`, both), but that equivalence must be *stated*, because the
`artists`/`venues` pair looked equivalent to `is_admin_or_organizer()` too and is not.

**Shape P5 — status only, role irrelevant (2 policies)**
(`20260225120000_phase7_media.sql:40-45`) — and note the `TO authenticated` clause,
which is present on this one policy and on very few others. **`pg_policies.roles` is
part of B1.** Do not add or remove a `TO` clause anywhere:

```sql
CREATE POLICY event_media_insert_member ON public.event_media
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (SELECT public.get_user_status()) = 'approved'
  );
```

**Warning sign for the planner** (RESEARCH § *Pitfall 1*): a capability catalogue with
fewer than five distinct predicates behind it has collapsed one of these five.

---

### `supabase/migrations/<ts>_wrap_auth_uid.sql` (migration, the 26-policy rewrite)

**Analog:** the drop-then-recreate sequence at `20260224_rbac_migration.sql:27-56`,
and the `DROP POLICY IF EXISTS` immediately before `CREATE POLICY` at
`20260805120000_door_scan_events.sql:149-156`.

```sql
-- ============================================================
-- Step 3: Drop old RLS policies that reference is_admin
-- ============================================================
-- Must drop these BEFORE dropping is_admin column (dependency order)

DROP POLICY IF EXISTS "Public profiles are viewable by owner" ON public.profiles;
```

**Class A — the mechanical case (15 policies).** Analog for what the predicate looks
like before and after (`20260224_rbac_migration.sql:186-198`):

```sql
-- Users can view their own RSVPs
CREATE POLICY rsvps_select_own ON public.rsvps
  FOR SELECT USING (auth.uid() = user_id);

-- Approved members can create RSVPs
CREATE POLICY rsvps_insert_approved ON public.rsvps
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (SELECT public.get_user_status()) = 'approved'
  );
```

The transformation is `auth.uid()` → `(select auth.uid())`, **and nothing else on the
line**. In `rsvps_insert_approved` the second half is P5 and changes in the *other*
migration; if both changes land in the same `CREATE POLICY` statement, say so in the
B1 whitelist entry, because the diff will show two transformations on one policy.

**Class B — ownership OR capability (2 policies)** (`20260225100000_phase5_events.sql:24-35`).
Note the right-hand side is already wrapped and already an InitPlan:

```sql
CREATE POLICY events_update_own ON public.events
  FOR UPDATE USING (
    auth.uid() = created_by
    OR (SELECT public.is_master())
  );
```

**Class D — the one that breaks if applied blindly (2 policies)**
(`20260225150000_party_architecture.sql:48-58`):

```sql
CREATE POLICY event_parties_update_own ON public.event_parties
  FOR UPDATE USING (
    (SELECT public.is_admin_or_organizer())
    AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master'
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND e.created_by = auth.uid()
      )
    )
  );
```

`event_parties_delete_own` (`:61-71`) is the same predicate for `DELETE`.

Read the two `auth.uid()` occurrences separately:

- `:52` — inside an **uncorrelated** scalar subquery on `profiles`. Wrap the call.
  This is also predicate P2 (`role = 'master'`), so it is a capability call site too.
- `:55` — inside an `EXISTS` that references `event_id`, **a column of the outer
  `event_parties` row**. Wrap the `auth.uid()` token only. Wrapping the `EXISTS`
  evaluates it once per statement against no defined row.

**Warning sign** (RESEARCH § *Pitfall 2*): any diff line touching
`event_parties.event_id`.

**Class E — the privilege-escalation guard, 4 occurrences in one policy**
(`20260224_rbac_migration.sql:153-160`). This is `access-gating.md`, gate *escalation
privilegi*, and RESEARCH classifies touching it as **Critical**:

```sql
-- Users can update their own profile (but cannot change role or status)
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
  );
```

Its `WITH CHECK` reads `profiles` while updating `profiles`, so the inner read is
itself subject to `profiles_select_own` (`:146-147`) — a cross-policy coupling no
single-policy diff will show. Wrapping does not change it; the dedicated write probe
in `32-VALIDATION.md` (CAP-06 evidence iv) is what proves it.

**Verification artefact this migration owes:** the 26-row table in
`32-VERIFICATION.md`. The nearest in-repo precedent for a per-item evidence table with
the database's own reporting as the closing column is `31-REFUND-PROBE.md`:

```markdown
**Closing evidence — the constraints as the database itself reports them:**

| Constraint | `confdeltype` | Meaning |
|---|---|---|
| `ticket_refunds_ticket_id_fkey` | `c` | `CASCADE` |
| `guest_list_entries_ticket_id_fkey` | `a` | `NO ACTION` |
```

---

### `src/lib/capabilities/keys.ts` (shared type contract, pure)

**Analog:** `src/lib/door/outcome.ts` — an **exact** match, and the repo's only
existing instance of the pattern this file needs. It was written for the same reason:
a set of literals shared by TypeScript and a SQL `CHECK`, in a repository where the
build checks neither.

**The doc comment that states the inversion** (`src/lib/door/outcome.ts:1-32`,
condensed to the load-bearing paragraphs):

```ts
/**
 * The door's three outcomes, named once.
 *
 * This module is the source. It imports nothing — not even `@/types/database`,
 * which will import *from here* — so that a divergence between the two paths is
 * a type error at `npm run build`. In a repository with no test runner, that
 * build is the only automatic gate there is.
 *
 * ── Cross-check 1: the SQL mirror ────────────────────────────────────────────
 * `DoorScanCause` and `DoorSubjectType` are duplicated as SQL `CHECK`
 * constraints on `public.door_scan_events` in this phase's migration.
 * `next build` catches the TypeScript side, the `CHECK` catches the SQL side,
 * and the two agree only because they were written once *here* and copied.
 * Editing either literal set means editing both, in the same commit.
 */
```

**And the other end of the inversion** (`src/types/database.ts:1-13`) — the import
direction, written out because it is unusual:

```ts
// The one import in this file, and the direction is inverted on purpose. The
// door's contract is shared by three places at once — the wire, the client and
// the `door_scan_events` table — so it is defined once in `@/lib/door/outcome`,
// which imports nothing, and is read from here.
import type {
  DoorSubjectType,
  DoorScanOutcomeKind,
  DoorScanCause,
  DoorScanSource,
} from "@/lib/door/outcome";
```

**The `as const` map form** (`src/lib/rbac/roles.ts:6-18`) — the shape RESEARCH
Pattern 4 uses for `CAP`:

```ts
// Role constants
export const ROLES = {
  MASTER: "master",
  ORGANIZER: "organizer",
  MEMBER: "member",
} as const;
```

**The total-`Record` trick, for anything that must stay exhaustive**
(`src/lib/door/outcome.ts:44-48`, `:147-151`):

```ts
export const DOOR_HTTP = {
  recorded: 200,
  already_recorded: 409,
  not_valid: 422,
} as const satisfies Record<DoorScanOutcomeKind, number>;
```

```ts
const DOOR_OUTCOME_KINDS: Record<DoorScanOutcomeKind, true> = {
  recorded: true,
  already_recorded: true,
  not_valid: true,
};
```

**The difference the planner must not miss.** `outcome.ts`'s literals are checked by
a SQL `CHECK` constraint — one half of the cross-check is automatic. A capability key
is checked by **nothing**: it is a string passed to `private.has_capability('…')`
inside a policy body and a string in `private.capabilities`. `npm run build` proves
neither exists. That gap is why `scripts/verify-capabilities.mjs` is a Wave 0 file and
not a nice-to-have (`32-VALIDATION.md`, CAP-01 evidence iii). Write that sentence in
the file's doc comment, the way `outcome.ts` writes its own.

**Conventions to copy exactly:**
- Path alias `@/…` everywhere (`tsconfig` baseUrl `src`).
- `export type CapabilityKey = (typeof CAP)[keyof typeof CAP];` — the derived-union
  form; the repo's equivalent is `DoorScanOutcomeKind = DoorOutcome["outcome"]`
  (`outcome.ts:116`).
- The file imports nothing. That is what makes it the source.

---

### `src/lib/capabilities/server.ts` (service, request-response)

**Analog:** **partial.** Three separate sources; no single file in the repo does what
this one does.

**Client construction** (`src/lib/supabase/server.ts:4-7`) — the anon-key, cookie-bound
client, which is the one that must be used here, because the point is that RLS applies:

```ts
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
```

**Not** `src/lib/supabase/service.ts:3-8`, which bypasses every policy —
`access-gating.md`, gate *service role*, and RESEARCH § *Architectural Responsibility
Map*: a capability check performed with the service client proves nothing.

**`.rpc()` call shape and error handling** (`src/app/api/webhooks/sumup/route.ts:48-60`)
— one of only four `.rpc()` call sites in the repo, and the one that names its
parameters with the `p_` prefix the new resolver uses:

```ts
      // Atomic ticket reservation via RPC
      const { data: ticketId, error: rpcError } = await supabase.rpc(
        "reserve_ticket",
        {
          p_tier_id: purchase.tier_id,
          p_user_id: purchase.user_id,
          ...
        }
      );

      if (rpcError) {
```

The other three are `src/app/(organizer)/organizer/events/actions.ts:1180`,
`src/app/(public)/events/[slug]/menu/actions.ts:299` and
`src/app/api/webhooks/sumup/route.ts:203`. All four destructure `{ data, error }` and
branch on `error` — none swallows it. Keep that.

**Error path — the requirement, not boilerplate.** `meta-gates.md`, *zero fallimenti
silenziosi*, and RESEARCH § *Pitfall 5*: a resolver that returns an empty set on
failure denies everything and is indistinguishable from a correctly-refused member.
The correct in-repo model is `src/app/api/membership/verify/route.ts:124-147`, which
separates `23505` from everything else and returns a distinct status per cause. The
anti-patterns to avoid are named in `31-PATTERNS.md` § *Error handling with an
observable effect*: `checkin/route.ts:137-142` (one catch, one `status: "error"`) and
`reconcile-refunds/route.ts:125-127` (`catch { errors++ }`).

**Warning sign:** any `catch` in the capability path that returns a value.

**No analog for `cache()`.** `grep -rn 'from "react"' src` returns **zero** files
importing `cache`. RESEARCH assumption **A4** flags this: verify on first use that it
memoises within a render, and introduce it in this one module rather than scattering
it. Budget one round trip in the middleware and one in the render — they are separate
executions and cannot share a cache (RESEARCH § *(b)*).

---

### `src/lib/supabase/middleware.ts` (middleware, request-response)

**Analog:** itself. What follows is what must be preserved character-for-character in
verdict, and where the one substitution goes.

**The round trip that becomes the one definition** (`:44-57`). RESEARCH § *(b)*: the
replacement is round-trip-neutral, and the call must stay inside the `if (user)`
branch, because `public.my_capabilities()` is revoked from `anon`:

```ts
  // Resolve role and status from profiles table
  let role: string | null = null;
  let status: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    role = profile?.role ?? "member";
    status = profile?.status ?? "pending";
  }
```

**Two things this excerpt hides, and both are behaviour.** `?? "member"` and
`?? "pending"` mean an authenticated user with **no profile row** is treated as a
pending member. A capability set resolved from `private.role_capabilities` for a
missing profile is the **empty set** — which is the same verdict on all four prefix
rules (a pending member passes none of them), but it is not the same *mechanism*.
Record the equivalence in B4; do not assume it.

Second: the `{ data: profile }` destructuring **discards the error** (`:49`). A failed
query today silently produces `member` / `pending` — a fail-closed default. A failed
`rpc('my_capabilities')` must not become a *different* silent default; it is the same
`meta-gates.md` gate as `server.ts` above, on the hotter path.

**The four prefix rules, with the load-bearing ordering** (`:81-117`). The
`if` / `else if` pair at `:82` / `:90` is the ordering RESEARCH § *Pitfall 7* is
about — inverting it locks organizers out of the door:

```ts
    // /admin/scanner -> master OR organizer
    if (pathname.startsWith("/admin/scanner")) {
      if (role !== "master" && role !== "organizer") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
    // /admin/* (except scanner) -> master only
    else if (pathname.startsWith("/admin")) {
      if (role !== "master") {
```

…then two **separate** `if` statements, not `else if` (`:99`, `:108`):

```ts
    // /organizer/* -> master OR organizer
    if (pathname.startsWith("/organizer")) {
      if (role !== "master" && role !== "organizer") {
...
    // /membership-card, /attendance -> approved only
    if (
      pathname.startsWith("/membership-card") ||
      pathname.startsWith("/attendance")
    ) {
      if (status !== "approved") {
```

**Warning sign:** a route→capability map keyed by prefix with no longest-match rule.
If the plan replaces this chain with a lookup table, the table must reproduce
`/admin/scanner` winning over `/admin`, and B4 must record the line numbers.

**The redirect body, repeated four times** (`:84-87`) — three lines, identical each
time. Whatever shape replaces the chain, the redirect target stays `/dashboard`:
`CLAUDE.md` Operating Principle 2, the middleware is UX, and deleting the bounce would
give a member a broken page instead.

**What must not be touched** (`:120-139`) — the header injection, with the comment that
records why the unconditional delete exists:

```ts
  // An inbound x-user-* header is attacker-supplied input: the client can send
  // whatever it likes. These are cleared unconditionally BEFORE the branch
  // below […] Only this middleware may set them.
  requestHeaders.delete("x-user-role");
  requestHeaders.delete("x-user-status");
  requestHeaders.delete("x-user-id");

  if (user) {
    requestHeaders.set("x-user-role", role ?? "member");
    requestHeaders.set("x-user-status", status ?? "pending");
    requestHeaders.set("x-user-id", user.id);
  }
```

CAP-05 is Phase 33 and touches 46 files. **This block still needs `role` and `status`
as values** — so if the profile read is replaced by the RPC, either the RPC returns
enough to reconstruct them or the profile read stays alongside it, which costs the
round trip RESEARCH counted as zero. **This is a real design fork the plan must
resolve explicitly**, and the honest options are: keep both reads for one phase and
say the delta is +1 round trip, or have the resolver return role and status as well as
capabilities. Discovering it during execution is how a constant-behaviour phase
acquires a regression.

**Also untouched:** `:74`'s `?redirect=` parameter, which `login/page.tsx:11` reads as
`?next=`. RESEARCH § *Findings outside scope* item 1 — a real defect, and fixing it
inside this phase would blur the B4 comparison.

---

### `src/types/database.ts` (model / types)

**Analog:** itself. Hand-written, one exported interface per table, in table order,
`snake_case` fields mirroring columns, nullable as `| null` never `?`.

```ts
export type UserRole = "master" | "organizer" | "member";
export type UserStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  membership_code: string;
  role: UserRole;
  status: UserStatus;
  referred_by: string | null;
  approved_via: 'referral' | 'guest_list' | 'admin_manual' | null;
  created_at: string;
  updated_at: string;
}
```

`supabase-data.md`, gate *tipi allineati*: the new shapes land in the **same commit**
as the migration. Two candidates — the `private` tables, and the `my_capabilities()`
return. Note the honest limit, and write it down rather than implying otherwise: this
file contains **no `Database` type and no `Functions` map**, and none of the four
clients is parameterised with it (`client.ts:4`, `server.ts:7`, `middleware.ts:15`,
`service.ts:4`). Adding an interface here documents the shape; it does not make
`supabase.rpc("my_capabilities")` type-checked, and it does not make a misspelled
function name a build error.

---

### `scripts/rls-baseline.mjs` (script, evidence harness)

**Analog:** `scripts/verify-persona.mjs` — the **only** script in the repo. Everything
about its conventions transfers; nothing about its *subject* does, so this is a partial
match and the gaps are listed at the end.

**Header comment: why it exists, what it does not prove** (`:1-23`):

```js
#!/usr/bin/env node
/**
 * verify-persona.mjs — controlli meccanici sull'Expert Persona di re:sonate.
 *
 * Perche' esiste: questo repo non ha un test runner, quindi ogni gate della
 * persona e' prosa che nessuno esegue. […]
 *
 * Zero dipendenze, ESM puro. Exit non-zero se un controllo fallisce.
 *
 * Uso:  npm run verify:persona
 *
 * NON e' agganciato a `next build` di proposito […]
 */
```

Note the language: this script's prose is **Italian**, while `.planning/` and the
source comments are English. The comment style in `src/` and in the newest migration
is English (`20260805120000_door_scan_events.sql`, `src/lib/door/outcome.ts`), and
`32-RESEARCH.md` § *Decisions Already Fixed Upstream* locks "the interface stays
English only". **Pick one and say so in the plan** — the repo currently has both.

**Imports: node built-ins only, no dependency** (`:25-28`):

```js
import { readdirSync, readFileSync, lstatSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
```

**Pre-registered constants with the reason inline** (`:52-62`) — the pattern for
anything the harness asserts a number against (67 policies, 26 lints, 20 tables):

```js
/**
 * Tetto del context budget, PRE-REGISTRATO il 2026-08-04 prima di misurare
 * quale file lo raggiunge.
 *
 * Derivato, non scelto […] Se scatta, la correzione e' restringere i `paths:`
 * o accorciare la prosa — **non alzare questo numero**.
 */
const BUDGET_CEILING_TOKENS = 12000;
```

**The reporter and the exit contract** (`:198-210`, `:455-459`):

```js
const failures = [];

function check(label, problems, detail) {
  if (problems.length === 0) {
    console.log(`  ✓ ${label}`);
    if (detail) console.log(`      ${detail}`);
  } else {
    console.log(`  ✗ ${label}`);
    for (const p of problems) console.log(`      ${String(p).replace(/\n/g, '\n      ')}`);
    failures.push(label);
  }
}
```

```js
if (failures.length) {
  console.error(`FALLITI ${failures.length}/7: ${failures.join(' · ')}\n`);
  process.exit(1);
}
console.log('7/7 verdi.\n');
```

Three exit codes are in use: `0` green, `1` a check failed, `2` the environment is
wrong (`:216`, `:230`). Copy all three — a missing `SUPABASE_ACCESS_TOKEN` is a `2`,
a moved fingerprint is a `1`.

**The refusal to be green on an empty set** (`:225-233`) — this is the most important
line to carry into a baseline harness, and RESEARCH § *Pitfall 3* is the same failure
in the data dimension:

```js
// Il controllo non deve poter passare su un insieme vuoto: senza questa
// asserzione un parser rotto renderebbe verdi tutti i controlli sotto.
if (modules.length < 5 || files.length < 100 || index.length < 5) {
  console.error(
    `FATAL: misurazione implausibile (moduli=${modules.length}, file=${files.length}, righe indice=${index.length}). ` +
      'Il controllo si rifiuta di dichiarare verde su un insieme vuoto.'
  );
  process.exit(2);
}
```

**Applied here:** refuse to write a baseline if `pg_policies` returns fewer than 67
rows, if fewer than 20 tables report `relrowsecurity`, or if any persona × table
fingerprint is the md5 of the empty string on **both** sides (RESEARCH § *Pitfall 3*'s
named warning sign). A harness that cannot fail is not evidence.

**The two-clause check — a pattern for the rollback assertion** (`:319-356`, check F).
It verifies two *independent* conditions and reports them separately, because
satisfying one says nothing about the other:

```js
    // 1. Se esiste su disco, git deve ignorarlo.
    …
    // 2. Nulla al suo interno deve essere gia' tracciato. .gitignore non
    //    ha effetto su cio' che e' gia' in indice: le due condizioni sono
    //    indipendenti e vanno verificate separatamente.
```

The write-probe harness needs exactly this shape: (1) every probe string ends
`rollback;` and contains no `commit`, asserted **before** the request is sent; and
(2) all 20 row counts are re-read afterwards and are unchanged. RESEARCH § *Pitfall 6*
— the trailing `rollback;` is the only thing between a probe and a permanent write in
production.

**What has no precedent in this repo, and must be designed rather than copied:**

| Concern | Precedent | Note |
|---|---|---|
| Reading `SUPABASE_ACCESS_TOKEN` from `.env.local` | **none** — `verify-persona.mjs` reads no env at all | `.env*` is gitignored (`.gitignore:34`). Node ≥ 20.6 has `process.loadEnvFile()`; `--env-file` is the other option. Choose one and write it in the npm script |
| Making an HTTP request from a script | **none** | `fetch` is global in Node 25.6.1 (RESEARCH § *Environment Availability*). No dependency needed |
| Writing a committable JSON artefact | **none** — `.planning/` contains one JSON file, `config.json`, and it is configuration | Determinism is the whole value: sort keys, sort rows, fixed float formatting, trailing newline. An artefact that reorders itself produces a diff that hides the real one |
| Talking to a database over `pg` | `pg@^8.18.0` is a devDependency, added in Phase 31 — **but no committed code imports it**; `31-REFUND-PROBE.md` records the container run as an ad-hoc probe | The container harness is genuinely new code |
| An npm script entry | `package.json:5-11` — `"verify:persona": "node scripts/verify-persona.mjs"` | Copy the naming style: `"baseline:rls"` or similar, colon-separated |

**Secrecy constraint on the artefacts themselves.** `.planning/` is tracked and the
repository is public (`ai-engineering.md`, gate *la pianificazione e' pubblica*;
`CLAUDE.md` Guardrail 5). The baselines are committed. Therefore:

- B2's fingerprint is an **md5 of the sorted primary keys**, never the keys. That is
  already RESEARCH's design; the harness must not "helpfully" also emit the id list.
- No email, no full name, no membership code, no project reference and no token may
  reach any artefact. The `pg_policies` dump is safe by nature (predicates, not rows);
  B2 and B3 are the ones that touch data, and the persona identifiers used to
  impersonate must not be written into the output.
- The precedent for saying this out loud in an evidence document is
  `31-REFUND-PROBE.md`'s *Where it was run* block — it names the target, states that
  production was not touched, and says why.

---

### `scripts/verify-capabilities.mjs` (script, consistency check)

**Analog:** `scripts/verify-persona.mjs` check **G** (`:358-441`) — an **exact** match
in purpose. Check G exists because a table in `meta-gates.md` was a *second index* that
nobody verified, and it had already drifted. `src/lib/capabilities/keys.ts` versus
`private.capabilities` versus the policy predicates is the same structure: three
declarations of one set, no compiler between them.

**The comment that states why the check exists** (`:358-368`):

```js
// G — la tabella di priorita' in meta-gates.md descrive il routing reale
//
// Perche' esiste: fino alla v1.4 quella tabella era un SECONDO indice che
// nessuno verificava, e aveva gia' derivato […]
//
// Cosa asserisce: per ogni riga, il modulo PRIMARIO dichiarato si carica
// davvero su tutti i file che la riga copre.
```

**The two-sided set comparison** (`:275-289`, check D) — the shape for "the keys in
`keys.ts` and the rows in `private.capabilities` are the same set", reported in both
directions so neither a missing key nor an orphan row hides:

```js
  const actual = new Set(scoped.filter(m => m.paths.length === 0).map(m => m.name));
  const problems = [];
  for (const n of actual)
    if (!MANUAL_MODULES.has(n))
      problems.push(`${n} non ha paths ma non e' nel set dichiarato in questo script`);
  for (const n of MANUAL_MODULES)
    if (!actual.has(n)) problems.push(`${n} e' dichiarato manuale ma ora ha paths (o non esiste)`);
```

**One gate to apply from `ai-engineering.md` — *prova per mutazione*.** Every check
added to a verification script must be proved by deliberately breaking the invariant,
watching it fire, and restoring — *and the mutation itself must be verified as
applied*, because a substitution that silently fails to match produces a green that
means nothing. That gate was written from an incident in this very script.

---

### `.../baseline/32-BASELINE-surfaces.md` (B4, hand-written artefact)

**Analog:** `31-PATTERNS.md` § *File Classification* for the table shape;
`31-VERIFICATION.md` and `31-REFUND-PROBE.md` for the evidence register.

The content it must carry is already enumerated with line numbers in
`32-RESEARCH.md` § *Where the permission decision is taken in application code*. The
five guard-helper families exist and are read here so the B4 author does not have to
find them again:

| Family | Sites | Predicate |
|---|---|---|
| `verifyOrganizer` | `src/app/(organizer)/organizer/events/actions.ts:25`, `src/app/(organizer)/organizer/events/[id]/tickets/actions.ts:20` | `role !== "organizer" && role !== "master"` → throw |
| `verifyOrganizerAccess` | `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:14` | same, plus event ownership |
| `verifyOrganizerRole` | `src/app/api/tickets/attendance/route.ts:11`, `src/app/api/tickets/checkin/route.ts:131`, `src/app/api/tickets/checkin/undo/route.ts:32` | same, returns `{ error, status }` |
| `requireMaster` | `src/app/(admin)/admin/finance/actions.ts:9`, `src/app/(admin)/admin/newsletter/actions.ts:15` | reads the **header**, `role !== "master"` → `redirect("/dashboard")` |
| `verifyMaster` / `verifyAdminOrOrganizer` | `src/app/(admin)/admin/members/actions.ts:45`, `:73` | `role !== "master"` / `role !== "master" && role !== "organizer"` → throw |

**Two shapes, and the difference is the evidence.** Session-reading
(`src/app/(organizer)/organizer/events/actions.ts:25-51`):

```ts
async function verifyOrganizer(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profileError || !profile) throw new Error("Profile not found");

  if (profile.role !== "organizer" && profile.role !== "master") {
    throw new Error("Forbidden: only organizers can manage events");
  }
  return { user, isMaster: profile.role === "master" };
}
```

Header-reading (`src/app/(admin)/admin/finance/actions.ts:9-15`) — no database read at
all, and it is the shape CAP-05 (Phase 33) exists to end:

```ts
async function requireMaster() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  if (role !== "master") {
    redirect("/dashboard");
  }
}
```

The two `verifyOrganizer` copies are byte-identical except for the error message
("only organizers can manage events" vs "…manage ticket tiers"). **That divergence is
Phase 33's to delete.** Phase 32 records it in B4 and gives it something to call.

**`NAV_ITEMS`** (`src/lib/rbac/roles.ts:36-82`) — the fifth surface, and the one that
is not a server-side check at all. `access-gating.md`, gate *coerenza
navigazione/permessi*: hiding a link is not protecting a route. Note the mismatch B4
must record verbatim rather than resolve: the `/admin/scanner` entry (`:64-72`) carries
`roles: ["master","organizer"]` **and** `requireApproved: true`, while the middleware
rule for the same path (`:82-88`) checks role **only**. A nav entry hidden from a
pending organizer whose route would admit them is a live inconsistency, and CAP-03
requires reproducing it.

```ts
  {
    href: "/admin/scanner",
    label: "Check-in",
    icon: "qrcode",
    roles: ["master", "organizer"],
    requireApproved: true,
    requireAuth: true,
    hideWhenAuth: false,
  },
```

---

## Shared Patterns

### The `(SELECT …)` wrapper

**Source:** `20260224_rbac_migration.sql:151`; the rule stated in prose at
`20260805120000_door_scan_events.sql:153-154`.
**Apply to:** every policy predicate this phase writes or rewrites — the 26 bare
`auth.uid()` calls and every new `private.has_capability('…')` call site.
**The reason, corrected:** the wrapper creates the InitPlan. `STABLE` does not.
Verified by `EXPLAIN (VERBOSE, COSTS OFF)` on this database, PostgreSQL 17.6
(RESEARCH § *(e)*). Do not repeat the claim at `20260224_rbac_migration.sql:97-98`.

### Migration file conventions

**Source:** `20260805120000_door_scan_events.sql` — enumerated header, `BEGIN;` …
`COMMIT;`, `IF NOT EXISTS` / `IF EXISTS` throughout, RLS in the same file, a written
reason beside every non-obvious choice.
**Filename:** `YYYYMMDDHHMMSS_snake_case_description.sql` — 34 files, all conforming.
**Application path:** the Supabase CLI is **not installed** (`31-VERIFICATION.md`).
Every migration in this repo is plain SQL with no CLI directives, so the same file
runs verbatim through the Management API migrations endpoint (proven 2026-08-06) or a
SQL editor. Write the task so it works either way, and record in `32-VERIFICATION.md`
which path was used and what was observed afterwards.
**Gate:** `supabase-data.md`, *migration in avanti* — the 34 applied migrations are
historical fact. Never edit one; write another.

### Replace, never add

**Source:** `20260224_rbac_migration.sql:27-56` (drop the old policies before creating
the new), `20260805120000_door_scan_events.sql:149` (`DROP POLICY IF EXISTS`
immediately before `CREATE POLICY`).
**Apply to:** all 67 policies touched.
**Gate:** `supabase-data.md`, *RLS contestuale* — PERMISSIVE policies are OR'd, so a
new policy beside an old one **widens**. B1's whitelist rejects any added policy, and
B5 catches it independently: `multiple_permissive_policies` moving off 46 means the
policy set was restructured.

### Security-definer hygiene, and three violations not to inherit

**Source (what to do):** RESEARCH § *Architecture Patterns* Patterns 1 and 2 —
`private` schema, `SET search_path = ''`, fully-qualified references, `REVOKE
EXECUTE … FROM public, anon`, `GRANT … TO authenticated` on the single argument-less
public wrapper.
**Source (what exists):** `20260224_rbac_migration.sql:100-135` — four functions in
`public`, no `search_path`, no grants written. The live security advisor raises
`function_search_path_mutable` and `anon_security_definer_function_executable` on all
four.
**Apply to:** every function this phase creates.
**Do not** harden the existing four in this phase — that changes who can call what,
which is a behaviour change (RESEARCH § *Findings outside scope* item 2).

### Zero silent failures, with no error tracking

**Source (correct):** `src/app/api/membership/verify/route.ts:124-147` — distinguishes
`23505` from everything else, logs the rest with a category, returns a distinct status.
**Source (anti-pattern, in files this phase touches):** `src/lib/supabase/middleware.ts:49`
discards the profile query's error entirely.
**Apply to:** the resolver in `src/lib/capabilities/server.ts`, the middleware's RPC
call, and every error path in the harness.
**Gate:** `meta-gates.md` — `package.json` has no monitoring dependency, so **no
production error reaches a human on its own**. A log is a place nobody looks; a failure
that matters needs an observable effect.

### Roles, never people; nothing that cannot be published

**Source:** `31-PATTERNS.md:7-10`, `31-REFUND-PROBE.md`'s *Where it was run* block.
**Apply to:** every artefact this phase commits — the five baselines,
`32-VERIFICATION.md`, and any excerpt quoted into a plan.
**Gate:** `ai-engineering.md`, *la pianificazione e' pubblica*; `CLAUDE.md` Guardrail 5.
A commit is a publication and a publication is irreversible.

---

## No Analog Found

| File | Role | Data flow | Why nothing matches |
|---|---|---|---|
| `.../baseline/32-BASELINE-*.json` (the four JSON artefacts) | artefact | file-I/O | `.planning/` has never held a machine-generated artefact; its only JSON is `config.json`, which is configuration. There is no precedent for the determinism rules a diffable artefact needs — sorted keys, sorted rows, stable formatting — and no precedent for a committed file that a script rewrites. **The plan must state the determinism contract explicitly**, because it is the difference between a diff that shows the change and a diff that hides it. |
| `scripts/rls-baseline-container.mjs` | script | batch | `pg@^8.18.0` is a devDependency and **no committed file imports it**. `31-REFUND-PROBE.md` records the container method — throwaway `postgres:16` under Docker, definitions copied verbatim from the repository, destroyed afterwards — but as a written procedure, not as code. Two gaps carry forward: **production is 17.6, and the probe used 16.14**, and RESEARCH assumption **A7** flags Docker availability as unverified. `32-VALIDATION.md` § *Known blocking dependency* already names this as blocking for CAP-03's evidence. **Check Docker in the first task of Wave 0**, and if it is absent, say so — CAP-03's evidence then covers 3 personas of 7 and **cannot exercise `organizer` at all**, which is the role the phase is mostly about. |
| `src/lib/capabilities/server.ts`'s `cache()` memoisation | service | request-response | Zero files in `src/` import `cache` from `react`. RESEARCH assumption **A4**. Verify on first use rather than assuming; introduce it in this one module. |

**Consequence for the planner:** the first two are the phase's real risk. They are the
*evidence*, not the code — and `32-VALIDATION.md` is explicit that a baseline captured
after the change is not a baseline. If the harness is weak, CAP-03 is unprovable no
matter how correct the migration is.

---

## Metadata

**Analog search scope:** `supabase/migrations/` (34 files, list read; 6 read in full or
in targeted ranges), `scripts/`, `src/lib/supabase/**`, `src/lib/rbac/**`,
`src/lib/door/**`, `src/types/database.ts`, `src/app/api/webhooks/sumup/route.ts`,
the five guard-helper sites, `package.json`, `.gitignore`,
`.planning/phases/31-*/{31-PATTERNS.md, 31-REFUND-PROBE.md}`.

**Files read in full:** `supabase/migrations/20260805120000_door_scan_events.sql`,
`supabase/migrations/20260224_rbac_migration.sql`,
`supabase/migrations/20260226200000_venues.sql`, `scripts/verify-persona.mjs`,
`src/lib/supabase/middleware.ts`, `src/lib/supabase/server.ts`,
`src/lib/supabase/service.ts`, `src/lib/door/outcome.ts`, `src/lib/rbac/roles.ts`,
`.planning/phases/31-live-defects-at-the-door-and-the-bar/31-PATTERNS.md`.

**Files read in targeted ranges:** `src/types/database.ts` (`:1-60`),
`src/app/api/webhooks/sumup/route.ts` (`:40-70`),
`src/app/(organizer)/organizer/events/actions.ts` (`:1-60`),
`src/app/(admin)/admin/finance/actions.ts` (`:1-35`),
`src/app/(admin)/admin/members/actions.ts` (`:40-110`),
`supabase/migrations/20260225100000_phase5_events.sql` (`:24-35`),
`supabase/migrations/20260225120000_phase7_media.sql` (`:40-48`),
`supabase/migrations/20260225150000_party_architecture.sql` (`:48-71`),
`supabase/migrations/20260226100000_artist_profiles.sql` (`:30-62`),
`.planning/phases/31-.../31-REFUND-PROBE.md` (`:1-70`).

**Not used:** `.planning/codebase/` — dated 2026-02-24, three milestones stale
(`CLAUDE.md` Guardrail 4). `supabase/schema.sql` — contains zero `CREATE POLICY`;
RESEARCH re-verified every helper body against `pg_proc` on the live database instead.

**Pattern extraction date:** 2026-08-06
