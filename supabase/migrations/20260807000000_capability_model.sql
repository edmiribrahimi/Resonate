-- The capability model: one definition, in a schema the API cannot reach
-- Phase 32, Plan 06: CAP-01 (defined once, evaluated by one function) and
-- CAP-04 (a grant takes effect on the next request, never on the next token)
--
-- Changes:
-- 1. Create the `private` schema, grant USAGE on it, and state why USAGE is
--    granted to a role that must never read anything inside it
-- 2. Create private.capabilities — the catalogue, read as DATA by phase 34
-- 3. Create private.role_capabilities — the grants, carrying `requires_approved`
--    because this database holds two different definitions of "organizer"
-- 4. Create private.has_capability(...) — the resolver — and
--    public.my_access_context() — the single exposed wrapper, argument-less
-- 5. Seed eight catalogue rows and sixteen grant rows, in this same transaction,
--    because an empty grant table denies everything: the rows ARE the behaviour
--
-- Five changes, one transaction. A half-applied version of this file is worse
-- than none of it — a database holding the resolver but not its grants answers
-- `false` to every question, and a database holding the tables but not the
-- resolver holds a catalogue nothing can read. So BEGIN; ... COMMIT; is not
-- decoration.
--
-- THIS MIGRATION CHANGES NO POLICY AND NO BEHAVIOUR. Not one of the 67
-- row-level policies is touched, no GRANT on an existing object is altered, and
-- no existing function is redefined. After it, B1 must be byte-identical to the
-- committed pre-phase baseline and the performance advisor must still report
-- `auth_rls_initplan` = 26. A model that has been created but not yet wired
-- changes nothing, and proving that is the point of applying it on its own.
--
-- Idempotence: `IF NOT EXISTS` on the schema and both tables, `on conflict do
-- nothing` on both seeds. Functions cannot take `IF NOT EXISTS`; `CREATE OR
-- REPLACE` is their idempotent form and is used for both.

BEGIN;

-- =============================================================================
-- 1. The `private` schema — and why `anon` is granted USAGE on it
-- =============================================================================
--
-- USAGE is granted to `authenticated` AND to `anon`, and that looks like an
-- exposure until you know how a policy predicate is evaluated: it runs with the
-- privileges of the **querying role**, not of the policy's author. Measured on
-- the committed baseline (`baseline/32-BASELINE-policies.json`): **47** of the
-- 67 live policies apply to `{public}`, which includes `anon`. A predicate that
-- calls a function in a schema the querying role cannot enter fails with a
-- permission error instead of returning false — which at the door reads as a
-- broken scanner, not as a refusal.
--
-- Unreachability over the API does NOT come from these grants. It comes from
-- PostgREST's exposed-schema list, which on this project is `public,
-- graphql_public` (verified 2026-08-06, `GET /v1/projects/{ref}/postgrest`).
-- Nothing in `private` is routable at `/rest/v1/rpc/...` because PostgREST does
-- not serve the schema at all. **Adding `private` to that list would turn every
-- helper in here into a REST endpoint**, which is the specific mistake this
-- comment exists to prevent.
--
-- For `anon`, `auth.uid()` is null, so the resolver below can only ever answer
-- false. The grant buys a correct `false`; it buys nothing else.

CREATE SCHEMA IF NOT EXISTS private;

GRANT USAGE ON SCHEMA private TO authenticated, anon;

-- =============================================================================
-- 2. private.capabilities — the catalogue
-- =============================================================================
--
-- A table and not a `CASE` in a function body, for one measurable reason:
-- phase 34's build check reads the capability list as **data** and compares it
-- to `src/lib/capabilities/keys.ts`. A `CASE` cannot be selected from, so a
-- catalogue in code makes that check impossible and makes every new capability
-- a deploy rather than a row.
--
-- `description` is `not null` on purpose. A key whose meaning is not written
-- down is a key the next reader will guess at, and a guessed capability is
-- granted to the wrong role exactly once.

CREATE TABLE IF NOT EXISTS private.capabilities (
  key         text primary key,
  description text not null
);

-- =============================================================================
-- 3. private.role_capabilities — the grants, and the column that carries the
--    inconsistency this phase inherited
-- =============================================================================
--
-- `requires_approved` is not tidiness and it is not a feature. It exists
-- because this database holds **two different definitions of "organizer"**, and
-- CAP-03 says reproduce them, not resolve them:
--
--   * 34 policies gate on `public.is_admin_or_organizer()`, whose body reads
--     `role` and contains no `status` at all
--     (20260224_rbac_migration.sql:127-135);
--   * 4 policies — `artists_insert_organizer`, `artists_update_organizer`,
--     `venues_insert_organizer`, `venues_update_organizer` — use an inline
--     EXISTS requiring role **and** `status = 'approved'`
--     (20260226200000_venues.sql:29-51, 20260226100000_artist_profiles.sql:28-51).
--
-- Measured on a throwaway container built from this repository's own SQL,
-- because production holds no organizer of any status:
--
--     organizer/pending    ticket_tiers  insert -> ok        (P1, status ignored)
--     organizer/pending    venues        insert -> 42501     (P3, status required)
--     organizer/approved   ticket_tiers  insert -> ok
--     organizer/approved   venues        insert -> ok
--
-- Today a pending organizer can create a ticket tier and cannot create a venue.
-- That asymmetry is reachable by a real account. Collapsing the two into one
-- capability is this phase's single unrecoverable defect: onto `false` it hands
-- a pending organizer the ability to create venues and artists (a widening);
-- onto `true` it takes 34 policies' worth of access away, **including the
-- door**. This column is where that disagreement lives — visibly, as data, one
-- boolean per grant row — so that a later phase can settle it as a declared
-- decision instead of as a side effect.
--
-- The CHECK on `role` mirrors `UserRole` in `src/types/database.ts:15`. There is
-- deliberately no CHECK tying a role to a set of capabilities: which role holds
-- what is the seed's business, and it is data.

CREATE TABLE IF NOT EXISTS private.role_capabilities (
  role              text not null check (role in ('master', 'organizer', 'member')),
  capability        text not null references private.capabilities(key) on delete cascade,
  requires_approved boolean not null default false,
  primary key (role, capability)
);

-- -----------------------------------------------------------------------------
-- 3b. No RLS on either table, and the omission is deliberate
-- -----------------------------------------------------------------------------
--
-- Both tables above are created WITHOUT `ENABLE ROW LEVEL SECURITY` and with no
-- policy. **No other table in this repository omits its policies on purpose**
-- (the one previous exception, `door_scan_events`, omits only its *write*
-- policies and says so at 20260805120000_door_scan_events.sql:158-163). Without
-- this paragraph the next reader would take the omission for a bug and repair
-- it.
--
-- Why it is not a bug: RLS is what decides which rows a role may read **once
-- the role can reach the table at all**. Nothing here can be reached. PostgREST
-- serves `public,graphql_public` only, so there is no URL that selects from
-- `private.capabilities`; and the tables carry no grant to `authenticated` or
-- `anon`, so even a SQL path that reached them would be refused by the
-- privilege system before any policy was consulted. Unreachability is a
-- stronger answer than a policy, because a policy can be widened by adding a
-- second permissive one beside it and unreachability cannot.
--
-- The harmful repair, named so it is recognised if it is ever proposed: adding
-- `private` to PostgREST's exposed-schema list so that these tables "work" over
-- the API. That single settings change would publish `private.has_capability`
-- at `/rest/v1/rpc/has_capability` as a two-argument oracle, which is the exact
-- shape section 5 below refuses to create. If these tables ever genuinely need
-- to be read by a client, the answer is a view or a function in `public`, never
-- a change to the exposed schemas.
--
-- The revoke below is belt-and-braces and it is placed HERE, after both tables
-- exist, on purpose: `REVOKE ... ON ALL TABLES IN SCHEMA` expands to the tables
-- present at the moment it runs, so the same statement written above section 2
-- would have been a silent no-op.

REVOKE ALL ON ALL TABLES IN SCHEMA private FROM authenticated, anon;

-- =============================================================================
-- 4. private.has_capability — the resolver, and the only place the join lives
-- =============================================================================
--
-- `set search_path = ''` with every reference schema-qualified. The four
-- existing helpers (20260224_rbac_migration.sql:100-135) omit it and the live
-- security advisor raises `function_search_path_mutable` on all four; this
-- phase does not add a fifth. A SECURITY DEFINER function with a mutable
-- search_path is a privilege-escalation vector: the caller chooses which
-- `profiles` the definer reads.
--
-- `language sql`, diverging deliberately from the four plpgsql helpers. A SQL
-- body can be inlined by the planner and is the shape Supabase's own examples
-- use. Declared here rather than switched silently.
--
-- On the parenthesis, and on a comment that must not be copied forward: the
-- call sites of this function are written `(select private.has_capability('…'))`
-- because the **`(select …)` wrapper** is what makes Postgres evaluate it once
-- per statement as an InitPlan. It is not `STABLE` that does that. The comment
-- at 20260224_rbac_migration.sql:97-98 credits STABLE with the once-per-query
-- evaluation; `EXPLAIN` on this database proved otherwise, and repeating that
-- sentence here would re-publish the misunderstanding that produced 26 policies
-- with an unwrapped call site.
--
-- This function reads `public.profiles` as its definer, so it does NOT evaluate
-- the policies on `public.profiles` and cannot take part in the recursion those
-- policies currently produce on UPDATE. It neither causes that defect nor cures
-- it; the decision about it is owed to the owner and is recorded outside this
-- file.

CREATE OR REPLACE FUNCTION private.has_capability(
  p_capability text,
  p_party_id   uuid default null
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- A subject holds a capability if ANY source grants it. Phase 32 has exactly
  -- one source: the role grant below. A second source — a per-night assignment
  -- — is added by a later phase as another arm of this same OR, by editing this
  -- body. No policy and no caller changes when it lands.
  --
  -- `p_party_id` is accepted and unused today, deliberately. Adding the
  -- parameter later would mean rewriting every policy body that calls this
  -- function; adding it now costs one ignored argument.
  select exists (
    select 1
    from public.profiles p
    join private.role_capabilities rc on rc.role = p.role
    where p.id = (select auth.uid())
      and rc.capability = p_capability
      and (not rc.requires_approved or p.status = 'approved')
  );
$$;

-- Execute for `authenticated` AND `anon`, for the policy-evaluation reason
-- written in section 1: a predicate runs with the querying role's privileges,
-- and 47 of the 67 live policies apply to `{public}`. For `anon`,
-- `auth.uid()` is null, the EXISTS finds no profile row and the function can
-- only ever answer false — so the grant buys a correct refusal, not access.
GRANT EXECUTE ON FUNCTION private.has_capability(text, uuid) TO authenticated, anon;

-- =============================================================================
-- 5. public.my_access_context — the ONE exposed function, and it takes no
--    argument
-- =============================================================================
--
-- No arguments (D-04). A `has_capability(user_id, capability)` reachable over
-- REST would be a free enumeration oracle: it answers a yes/no question about
-- an arbitrary identifier, and **this repository has no rate limiting
-- anywhere** (verified 2026-08-05). Normally the mitigation for an oracle is a
-- limiter; there is no limiter to add here, so the shape of the API is the
-- mitigation. This function answers about `auth.uid()` and about nobody else,
-- because it is not given a way to name anybody else.
--
-- It returns exactly one row, always, even for a caller with no profile: the
-- capability array is then empty and `role` and `status` are JSON null. A
-- function that returned zero rows for an unknown subject would make "no
-- profile" and "no answer" indistinguishable at the caller.
--
-- Why `role` and `status` are in this payload at all — this is the part that
-- looks like a leak of the old model into the new one, and it is deliberate and
-- temporary. The middleware's header-injection block
-- (`src/lib/supabase/middleware.ts:135-139`) still needs both as **values**: 46
-- files read `x-user-role` / `x-user-status`. Removing that transport is a
-- later phase's work and touches all 46. Returning the two fields here keeps
-- the middleware at **one** database round trip instead of two; the alternative
-- would add a round trip to every `/api/*` request, which means every door
-- scan, on a phone, on a bad network, in front of a queue.
--
-- **No new caller may branch on `role` or `status`.** They exist to be copied
-- into two headers that already exist. Every new decision asks the capability
-- array. The two fields are removed from this payload by the phase that deletes
-- the header transport.
--
-- `language sql`, `stable`, `security definer`, `set search_path = ''`, every
-- reference schema-qualified — same reasoning as section 4.

CREATE OR REPLACE FUNCTION public.my_access_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- The capability list is DERIVED from the predicate: one call to
  -- private.has_capability per catalogue row. It is deliberately NOT a second
  -- copy of the profiles-to-grants join. Two implementations of one
  -- table-driven rule are two definitions, and two definitions drift — which is
  -- the single thing CAP-01 forbids. The join exists once, in section 4, and
  -- this function asks it questions.
  select jsonb_build_object(
    'capabilities', coalesce(
      (
        select jsonb_agg(c.key order by c.key)
        from private.capabilities c
        where private.has_capability(c.key)
      ),
      '[]'::jsonb
    ),
    'role', (
      select p.role from public.profiles p where p.id = (select auth.uid())
    ),
    'status', (
      select p.status from public.profiles p where p.id = (select auth.uid())
    )
  );
$$;

-- The exposure boundary, written as two statements rather than assumed.
-- REVOKE first: Postgres grants EXECUTE to PUBLIC by default on every new
-- function, so without this line an anonymous request could call it.
REVOKE EXECUTE ON FUNCTION public.my_access_context() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_access_context() TO authenticated;

-- =============================================================================
-- 6. The prohibition CAP-04 rests on, written with its reason
-- =============================================================================
--
-- **No capability is ever minted into an access token.** Not now, not as an
-- optimisation later.
--
-- The reason is measured on this project, not inherited from a style guide.
-- `GET /v1/projects/{ref}/config/auth`, read 2026-08-06:
--
--     hook_custom_access_token_enabled = false
--     jwt_exp                          = 3600
--
-- A capability carried in the JWT would therefore be stale for up to **3600
-- seconds** after it was granted or revoked, with no sign-out and no error —
-- grants would simply arrive late, and a revocation would keep working for an
-- hour. CAP-04 promises the opposite: a grant takes effect on the **next
-- request**. Lowering `jwt_exp` does not fix it; it trades the violation for a
-- refresh storm and still leaves a window.
--
-- This is written down because **Supabase's own RBAC guide recommends exactly
-- the approach forbidden here** — the custom access token hook — so the next
-- engineer who reads that guide will propose it in good faith. The answer is
-- not "we prefer not to"; it is the two numbers above.
--
-- The resolver in section 4 reads the database on the request that asks. That
-- is what makes CAP-04 true, and it costs nothing: the middleware already
-- queried `profiles` on the same path.

-- =============================================================================
-- 7. The seed — the rows ARE the behaviour
-- =============================================================================
--
-- In this same transaction and this same file, because an empty grant table
-- denies everything. These are not fixtures: a catalogue with no grants is a
-- database in which no master, no organizer and no member can do anything the
-- model governs.
--
-- `on conflict do nothing` on both inserts, so re-running the file is safe and
-- so that a re-run never silently rewrites a description or flips a
-- `requires_approved` that a later migration deliberately changed.
--
-- Eight keys, and **three of them share one predicate today, on purpose**:
-- `staff.manage`, `organizer.access` and `door.operate` all resolve to
-- role ∈ {master, organizer} with status ignored. They are kept distinct
-- because they are three different QUESTIONS — "may this subject manage the
-- staff surfaces", "may this subject reach the organizer area", "may this
-- subject work the door" — and a later phase that grants one night's door must
-- be able to do so without also granting sixteen tables. Naming a capability
-- after its predicate instead of after its question is how that becomes
-- impossible.

INSERT INTO private.capabilities (key, description) VALUES
  (
    'staff.manage',
    'P1 — the 34 policies gating on public.is_admin_or_organizer(): role in (master, organizer), status IGNORED. The broad staff surface: events, parties, tickets, tiers, drinks, guest lists, media moderation.'
  ),
  (
    'master.manage',
    'P2 and P4 — public.is_master() (3 policies) AND the two inline master EXISTS bodies on artists and venues (artists_delete_master, venues_delete_master). The equivalence is claimed out loud rather than assumed: both read role = master and NEITHER reads status. It is claimed out loud because the artists/venues pair looked equivalent to is_admin_or_organizer() too, and was not — it carries a status check the helper does not.'
  ),
  (
    'catalogue.manage',
    'P3 — the four artists/venues organizer policies requiring role in (organizer, master) AND status = approved. This is the OTHER definition of organizer, and the reason requires_approved exists.'
  ),
  (
    'membership.active',
    'P5 — public.get_user_status() = approved, role irrelevant. Granted to all three roles with requires_approved true, which is how one column reproduces a status-only predicate.'
  ),
  (
    'admin.access',
    'The middleware rule for /admin/* other than the scanner (src/lib/supabase/middleware.ts:90-91): role = master, status ignored.'
  ),
  (
    'organizer.access',
    'The middleware rule for /organizer/* (src/lib/supabase/middleware.ts:99-100): role in (master, organizer), status ignored.'
  ),
  (
    'door.operate',
    'The middleware rule for /admin/scanner (src/lib/supabase/middleware.ts:82-83), which matches the four door routes: ROLE ALONE. requires_approved is false on both grants and must stay false — the hole a status check would close is closed elsewhere, in updateMemberRole, which sets status = approved in the same write that grants the organizer role. A status check here locks a pending organizer out of the scanner, in front of a queue.'
  ),
  (
    'membership.card.view',
    'The middleware rule for /membership-card and /attendance (src/lib/supabase/middleware.ts:108-112): status = approved, ANY role.'
  )
ON CONFLICT (key) DO NOTHING;

-- Sixteen grant rows. Eight of them carry requires_approved = true: the
-- catalogue.manage pair, and the membership.active and membership.card.view
-- sets of three each. Every other row is false, and each false is a decision
-- about a predicate that ignores status today.
INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  -- P1: role only, status ignored on all 34 policies.
  ('master',    'staff.manage',         false),
  ('organizer', 'staff.manage',         false),

  -- P2 / P4: master only, status ignored.
  ('master',    'master.manage',        false),

  -- P3: the four artists/venues organizer policies — role AND status.
  ('master',    'catalogue.manage',     true),
  ('organizer', 'catalogue.manage',     true),

  -- P5: status alone, role irrelevant — hence all three roles, all true.
  ('master',    'membership.active',    true),
  ('organizer', 'membership.active',    true),
  ('member',    'membership.active',    true),

  -- Middleware /admin/* except the scanner: master, status ignored.
  ('master',    'admin.access',         false),

  -- Middleware /organizer/*: role only, status ignored.
  ('master',    'organizer.access',     false),
  ('organizer', 'organizer.access',     false),

  -- Middleware /admin/scanner and the four door routes: ROLE ALONE.
  -- These two rows must not become true. See the door.operate description.
  ('master',    'door.operate',         false),
  ('organizer', 'door.operate',         false),

  -- Middleware /membership-card and /attendance: status alone, any role.
  ('master',    'membership.card.view', true),
  ('organizer', 'membership.card.view', true),
  ('member',    'membership.card.view', true)
ON CONFLICT (role, capability) DO NOTHING;

COMMIT;
