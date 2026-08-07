-- =============================================================================
-- Phase 33 · plan 01 — public.my_access_context() also returns the caller's id
-- =============================================================================
-- Requirement: CAP-05 (identity is resolved from the session, in one place).
--
-- WHAT THIS FILE DOES, and nothing else:
--
--   public.my_access_context() is re-issued with ONE added key in its
--   jsonb_build_object: 'user_id', (select auth.uid()). The three existing keys
--   — capabilities, role, status — are byte-identical to the applied
--   definition in 20260807000000_capability_model.sql, section 5. No policy is
--   touched, no table is touched, no grant is changed, no capability key is
--   added.
--
-- WHY THIS WIDENS NOTHING.
--
--   auth.uid() is the `sub` claim of the caller's OWN JWT, which Postgres has
--   already verified in order to authenticate the request at all. The function
--   takes no argument (D-04): it can only ever answer about the subject making
--   the call, so it tells that caller a fact the caller already possesses and
--   already sent. Nobody learns anything about anybody else. The claim is not
--   left as an argument — it is PROVED by the CAP-03 comparator, captured at
--   phase points 33-pre and 33-post on BOTH targets (plan 33-01, task 4).
--
-- WHY IN THE PAYLOAD RATHER THAN A SECOND CALL.
--
--   Eleven surfaces read an `x-user-id` request header today, and ten of them
--   decide who owns an event with it. Replacing that transport needs a
--   session-derived identity. The alternative considered and rejected
--   (33-RESEARCH.md § *The shape of the one module*, option A) was a
--   supabase.auth.getUser() inside the resolver: getUser() contacts the Auth
--   server, and the resolver runs on EVERY render while the middleware runs on
--   EVERY navigation — including every door scan, on a phone, on a bad network,
--   in front of a queue. One key on a payload that is already being fetched
--   costs nothing. It is the same reasoning that put `role` and `status` here
--   (…capability_model.sql:243-252).
--
-- THE (select auth.uid()) WRAPPER IS DELIBERATE.
--
--   A bare auth.uid() here would re-introduce exactly what
--   20260807020000_wrap_auth_uid.sql exists to remove. It is the (SELECT …)
--   SYNTAX that produces an InitPlan, not the volatility class (phase decision
--   D-32) — and the transformation is unconditionally safe because auth.uid()
--   takes no arguments, so the wrapped expression cannot depend on row data.
--   The two pre-existing sub-selects in this same function already write it
--   that way; this copies their form rather than inventing one.
--
--   SET search_path = '' is retained, which is why auth.uid() stays
--   schema-qualified as auth.uid(). SECURITY DEFINER + an empty search_path is
--   the pair that keeps a caller from resolving `uid` to something of their
--   own; dropping either is an elevation-of-privilege change, not a tidy-up.
--
-- THE GRANT PAIR IS RE-ISSUED ON PURPOSE.
--
--   CREATE OR REPLACE FUNCTION retains the existing ACL, so the REVOKE/GRANT
--   below repairs nothing on this database. It is here for the OTHER database:
--   a fresh environment that replays these files from empty must arrive at the
--   same exposure boundary without depending on a retention rule nobody read.
--   REVOKE first — Postgres grants EXECUTE to PUBLIC by default on every new
--   function, so without that line an anonymous request could call it.
--
-- ONE TRANSACTION. A half-applied change to a SECURITY DEFINER function leaves
-- a security boundary in two states, and this project has NO error tracking to
-- report it (meta-gates.md, verified 2026-08-05).
--
-- -----------------------------------------------------------------------------
-- A SUPERSESSION, stated here because the file that carries the error may not
-- be edited.
-- -----------------------------------------------------------------------------
--
--   20260807000000_capability_model.sql:245 says "46 files read `x-user-role` /
--   `x-user-status`". THE MEASURED NUMBER IS 44, and after phase 33 it is 0.
--   (`grep -rlE '\.get\("x-user-' src/ | wc -l` → 44 at commit fabc08f,
--   re-measured while writing this file. The 46 came from a `grep -rl 'x-user-'`
--   that also counted two NON-readers: src/lib/supabase/middleware.ts, which
--   SETS the headers, and a comment in src/types/database.ts.)
--
--   That applied migration is NOT edited to correct it. supabase-data.md, gate
--   *migration in avanti*: a migration with a timestamp is a historical fact,
--   and the gate admits no exception for prose — a file whose comments are
--   maintained is a file that will eventually have its DDL maintained too. The
--   correction lives here, in the forward file, naming the line it supersedes.
--   The three other copies of the same figure were in TypeScript and are
--   corrected directly: src/types/database.ts and src/lib/capabilities/server.ts
--   in this plan's commits, src/lib/supabase/middleware.ts in plan 33-14.
--
--   `role` and `status` STAY in this payload. The sentence at
--   …capability_model.sql:255-258 — "removed by the phase that deletes the
--   header transport" — reads like an instruction to delete them here, and
--   following it would be wrong: they have a second consumer that is not the
--   header transport. MobileNav and StaffNav are client components
--   (src/components/layout/MobileNav.tsx:1, src/components/staff/StaffNav.tsx:1)
--   which take role and status as props and CANNOT import the data-access
--   layer; Next.js's own guidance is to resolve in a parent Server Component
--   and pass props down. Converting them is phase 34 (STAFF-03), which owns
--   their removal from this payload. CAP-05 is about the SOURCE of the value,
--   not its vocabulary.
-- =============================================================================

BEGIN;

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
  -- the single thing CAP-01 forbids. The join exists once, in section 4 of
  -- 20260807000000_capability_model.sql, and this function asks it questions.
  select jsonb_build_object(
    'capabilities', coalesce(
      (
        select jsonb_agg(c.key order by c.key)
        from private.capabilities c
        where private.has_capability(c.key)
      ),
      '[]'::jsonb
    ),
    -- NEW in this migration, and the only difference from the applied
    -- definition. jsonb null for a caller with no session — which cannot
    -- happen through the granted path, since anon is revoked below, but the
    -- resolver treats an absent user_id as "nobody" rather than manufacturing
    -- one (src/lib/capabilities/server.ts).
    'user_id', (select auth.uid()),
    'role', (
      select p.role from public.profiles p where p.id = (select auth.uid())
    ),
    'status', (
      select p.status from public.profiles p where p.id = (select auth.uid())
    )
  );
$$;

-- The exposure boundary, written as two statements rather than assumed.
REVOKE EXECUTE ON FUNCTION public.my_access_context() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_access_context() TO authenticated;

COMMIT;
