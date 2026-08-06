-- =============================================================================
-- Phase 32 · plan 09 — every surviving bare auth.uid() becomes (select auth.uid())
-- =============================================================================
-- Requirements: CAP-06 (the 26 policies that re-evaluate the current user once
-- per row are reviewed, recorded and resolved) and CAP-03 (a master, an
-- organizer and a member can afterwards do neither more nor less than before).
--
-- What this file does, and nothing else:
--
--   20 policies still carry a bare auth.uid() after 20260807010000 — 25 tokens
--   in total. Each is dropped and re-created under the SAME name, cmd,
--   permissive value and TO clause, with every occurrence of the token
--   auth.uid() replaced by (select auth.uid()) and NOT ONE OTHER CHARACTER
--   changed (phase decision D-31).
--
--   Each predicate below is Postgres's own rendering of the policy as it
--   stands today, read out of baseline/32-BASELINE-policies.post-07.json — the
--   applied state — with that one substitution per call site. It was not
--   re-typed from the original migrations, because what is applied and what
--   was written are not guaranteed to be the same string.
--
-- What this file deliberately does NOT do:
--
--   * It does not wrap a COMPARISON. (select auth.uid() = user_id) would be a
--     correlated subquery — legal, useless, and no longer an InitPlan, because
--     user_id is a column of the row. The token, never the expression.
--
--   * It does not wrap an EXISTS. See the class-D note below.
--
--   * It does not replace any predicate with a capability call. That was the
--     previous migration's single transformation. Zero T2 here: one
--     transformation per migration keeps each diff answerable against exactly
--     one whitelist entry (D-27).
--
--   * It does not repair the 42P17 recursion on public.profiles. See the
--     class-E note below.
--
-- WHY THE WRAPPER WORKS, and a correction that matters more than it looks.
-- 20260224_rbac_migration.sql:97-98 attributes the single evaluation to STABLE
-- volatility. Measured on this database with EXPLAIN (VERBOSE, COSTS OFF):
-- auth.uid() and is_admin_or_organizer() are BOTH stable, and only the wrapped
-- one becomes an InitPlan. It is the (SELECT ...) syntax that does it, not the
-- volatility class (phase decision D-32). That wrong note is plausibly what
-- produced these unwrapped call sites in the first place, so it is not
-- repeated here.
--
-- The transformation is unconditionally safe on all of them for one reason:
-- auth.uid() takes no arguments, so the wrapped expression cannot depend on
-- row data — which is the only condition the pattern's own source attaches to
-- it. The danger is entirely in the larger rewrite it tempts, and the two
-- places that rewrite would break something carry a note on the line.
--
-- ONE TRANSACTION. A half-applied wrap would leave a security boundary in two
-- states with no error tracking in this project to report it.
-- =============================================================================

BEGIN;


-- ===========================================================================
-- public.attendances — 1 policy
-- ===========================================================================

DROP POLICY IF EXISTS attendances_select_own ON public.attendances;
CREATE POLICY attendances_select_own ON public.attendances
  AS PERMISSIVE
  FOR SELECT
  USING (((select auth.uid()) = user_id));

-- ===========================================================================
-- public.drink_orders — 1 policy
-- ===========================================================================

DROP POLICY IF EXISTS drink_orders_select_own ON public.drink_orders;
CREATE POLICY drink_orders_select_own ON public.drink_orders
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((select auth.uid()) = user_id));

-- ===========================================================================
-- public.drink_tokens — 1 policy
-- ===========================================================================

DROP POLICY IF EXISTS drink_tokens_select_own ON public.drink_tokens;
CREATE POLICY drink_tokens_select_own ON public.drink_tokens
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((select auth.uid()) = user_id));

-- ===========================================================================
-- public.event_media — 3 policies
-- ===========================================================================

DROP POLICY IF EXISTS event_media_delete_own ON public.event_media;
CREATE POLICY event_media_delete_own ON public.event_media
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((select auth.uid()) = uploaded_by));

DROP POLICY IF EXISTS event_media_insert_member ON public.event_media;
CREATE POLICY event_media_insert_member ON public.event_media
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((((select auth.uid()) = uploaded_by) AND ( SELECT private.has_capability('membership.active'::text) AS has_capability)));

DROP POLICY IF EXISTS event_media_select_own ON public.event_media;
CREATE POLICY event_media_select_own ON public.event_media
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((select auth.uid()) = uploaded_by));

-- ===========================================================================
-- public.event_parties — 2 policies
-- ===========================================================================

-- CLASS D — the correlated EXISTS is left WHOLE, and only the auth.uid()
-- token inside it is wrapped. That subquery references
-- event_parties.event_id, A COLUMN OF THE OUTER ROW: wrapping the EXISTS
-- would evaluate it once per statement against no defined row, and the
-- policy would stop scoping to the owned event — every holder of
-- staff.manage could then edit and delete every party of every event.
-- The other occurrence sits in an UNCORRELATED scalar sub-select on
-- profiles and is wrapped for the ordinary reason. Two tokens, two
-- wrappers, nothing else moved. The warning sign is a diff line that
-- MODIFIES event_parties.event_id; its presence here is required.
DROP POLICY IF EXISTS event_parties_delete_own ON public.event_parties;
CREATE POLICY event_parties_delete_own ON public.event_parties
  AS PERMISSIVE
  FOR DELETE
  USING ((( SELECT private.has_capability('staff.manage'::text) AS has_capability) AND ((( SELECT profiles.role
     FROM profiles
    WHERE (profiles.id = (select auth.uid()))) = 'master'::text) OR (EXISTS ( SELECT 1
     FROM events e
    WHERE ((e.id = event_parties.event_id) AND (e.created_by = (select auth.uid()))))))));

-- CLASS D — the same predicate as event_parties_delete_own above, for
-- UPDATE, and the same rule: the correlated EXISTS on
-- event_parties.event_id is untouched, only the two auth.uid() tokens
-- are wrapped.
DROP POLICY IF EXISTS event_parties_update_own ON public.event_parties;
CREATE POLICY event_parties_update_own ON public.event_parties
  AS PERMISSIVE
  FOR UPDATE
  USING ((( SELECT private.has_capability('staff.manage'::text) AS has_capability) AND ((( SELECT profiles.role
     FROM profiles
    WHERE (profiles.id = (select auth.uid()))) = 'master'::text) OR (EXISTS ( SELECT 1
     FROM events e
    WHERE ((e.id = event_parties.event_id) AND (e.created_by = (select auth.uid()))))))));

-- ===========================================================================
-- public.events — 3 policies
-- ===========================================================================

DROP POLICY IF EXISTS events_delete_own ON public.events;
CREATE POLICY events_delete_own ON public.events
  AS PERMISSIVE
  FOR DELETE
  USING ((((select auth.uid()) = created_by) OR ( SELECT private.has_capability('master.manage'::text) AS has_capability)));

DROP POLICY IF EXISTS events_select_published ON public.events;
CREATE POLICY events_select_published ON public.events
  AS PERMISSIVE
  FOR SELECT
  USING (((is_published = true) AND ((early_access_until IS NULL) OR (early_access_until <= now()) OR ((select auth.uid()) IS NOT NULL))));

DROP POLICY IF EXISTS events_update_own ON public.events;
CREATE POLICY events_update_own ON public.events
  AS PERMISSIVE
  FOR UPDATE
  USING ((((select auth.uid()) = created_by) OR ( SELECT private.has_capability('master.manage'::text) AS has_capability)));

-- ===========================================================================
-- public.pending_purchases — 1 policy
-- ===========================================================================

DROP POLICY IF EXISTS pending_select_own ON public.pending_purchases;
CREATE POLICY pending_select_own ON public.pending_purchases
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((select auth.uid()) = user_id));

-- ===========================================================================
-- public.profiles — 2 policies
-- ===========================================================================

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  AS PERMISSIVE
  FOR SELECT
  USING (((select auth.uid()) = id));

-- CLASS E — the privilege-escalation guard (access-gating.md): it forbids
-- a user changing their own role or status. FOUR occurrences: one in
-- USING, three in WITH CHECK. Wrapping does not change the guard and does
-- not remove the 42P17 recursion — the WITH CHECK reads profiles while
-- updating profiles, so the inner read is subject to profiles_select_own,
-- and (select auth.uid()) inside that read changes nothing about it. The
-- recursion is D-32-A and is deferred as a NEW DESIGN, not a
-- transformation. What proves this policy is unchanged is not this diff:
-- it is the dedicated write probe in 32-CAP06-REVIEW.md, run before and
-- after, on both targets.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  AS PERMISSIVE
  FOR UPDATE
  USING (((select auth.uid()) = id))
  WITH CHECK ((((select auth.uid()) = id) AND (role = ( SELECT profiles_1.role
     FROM profiles profiles_1
    WHERE (profiles_1.id = (select auth.uid())))) AND (status = ( SELECT profiles_1.status
     FROM profiles profiles_1
    WHERE (profiles_1.id = (select auth.uid()))))));

-- ===========================================================================
-- public.rsvps — 3 policies
-- ===========================================================================

DROP POLICY IF EXISTS rsvps_delete_own ON public.rsvps;
CREATE POLICY rsvps_delete_own ON public.rsvps
  AS PERMISSIVE
  FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS rsvps_insert_approved ON public.rsvps;
CREATE POLICY rsvps_insert_approved ON public.rsvps
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((((select auth.uid()) = user_id) AND ( SELECT private.has_capability('membership.active'::text) AS has_capability)));

DROP POLICY IF EXISTS rsvps_select_own ON public.rsvps;
CREATE POLICY rsvps_select_own ON public.rsvps
  AS PERMISSIVE
  FOR SELECT
  USING (((select auth.uid()) = user_id));

-- ===========================================================================
-- public.ticket_refunds — 2 policies
-- ===========================================================================

DROP POLICY IF EXISTS refunds_insert_own ON public.ticket_refunds;
CREATE POLICY refunds_insert_own ON public.ticket_refunds
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((requested_by = (select auth.uid())));

DROP POLICY IF EXISTS refunds_select_own ON public.ticket_refunds;
CREATE POLICY refunds_select_own ON public.ticket_refunds
  AS PERMISSIVE
  FOR SELECT
  USING ((requested_by = (select auth.uid())));

-- ===========================================================================
-- public.tickets — 1 policy
-- ===========================================================================

DROP POLICY IF EXISTS tickets_select_own ON public.tickets;
CREATE POLICY tickets_select_own ON public.tickets
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((select auth.uid()) = user_id));

COMMIT;
