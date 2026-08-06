-- =============================================================================
-- Phase 32 · plan 07 — the five inherited predicates become one resolver
-- =============================================================================
-- Requirements: CAP-01 (one definition, evaluated by the same function) and
-- CAP-03 (a master, an organizer and a member can do neither more nor less
-- than before).
--
-- What this file does, and nothing else:
--
--   45 predicate fragments across 45 policies are replaced, IN PLACE,
--   by a call to private.has_capability — the resolver created in
--   20260807000000_capability_model.sql, which until now answered nobody.
--
-- What this file deliberately does NOT do:
--
--   * It adds no policy, drops no policy, and renames none. Every CREATE below
--     re-creates a name that already exists, with the same cmd, the same
--     permissive value and the same TO clause. The phase's B1 comparison keys
--     on policyname; a rename would destroy the comparison, not merely
--     complicate it (phase decision D-12).
--
--   * It does NOT wrap any bare auth.uid() in a (select ...). That is the next
--     migration's single transformation (D-27). 20 policies still carry a
--     bare auth.uid() after this file, down from 26: the six artists/venues
--     policies lose theirs together with the EXISTS body that contained it,
--     which is why the auth_rls_initplan advisor moves in a file that wrapped
--     nothing. One transformation per migration keeps each diff answerable
--     against exactly one whitelist entry.
--
--   * It does NOT touch the row-ownership comparisons (auth.uid() = user_id,
--     created_by = auth.uid(), and the scalar profiles.role sub-select inside
--     event_parties_update_own / event_parties_delete_own). Those answer "is
--     this row mine", not "am I allowed", and folding them into the capability
--     model would change 15 policies for no requirement.
--
-- ONE TRANSACTION, and the reason is not tidiness: a half-applied cutover
-- leaves some tables asking the old helper and some asking the resolver, on a
-- security boundary, with no error tracking in this project to report it.
--
-- -------------------------------------------------------------------------
-- The two organizer shapes stay two — the single highest-stakes line here
-- -------------------------------------------------------------------------
-- 34 policies ask is_admin_or_organizer(), which reads role and never reads
-- status. 4 policies (artists/venues insert+update) require role IN
-- (organizer, master) AND status = 'approved'. They are the same English
-- sentence with two different meanings, and they map to TWO capabilities:
--
--     staff.manage      requires_approved = false   -> the 34
--     catalogue.manage  requires_approved = true    -> the 4
--
-- Collapsing them into one key would silently grant a PENDING organizer
-- insert and update on venues and artists. The container probe that closes
-- this plan exists to refuse exactly that: organizer/pending must still
-- insert a ticket_tier and must still be refused a venue with 42501.
--
-- Capability keys used here, with their call-site counts:
--     catalogue.manage      4
--     master.manage         5
--     membership.active     2
--     staff.manage         34
-- =============================================================================

BEGIN;

-- ===========================================================================
-- public.artists — 3 policies (P3, P4)
-- ===========================================================================

DROP POLICY IF EXISTS artists_delete_master ON public.artists;
CREATE POLICY artists_delete_master ON public.artists
  AS PERMISSIVE
  FOR DELETE
  USING ((select private.has_capability('master.manage')));

DROP POLICY IF EXISTS artists_insert_organizer ON public.artists;
CREATE POLICY artists_insert_organizer ON public.artists
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((select private.has_capability('catalogue.manage')));

DROP POLICY IF EXISTS artists_update_organizer ON public.artists;
CREATE POLICY artists_update_organizer ON public.artists
  AS PERMISSIVE
  FOR UPDATE
  USING ((select private.has_capability('catalogue.manage')));

-- ===========================================================================
-- public.attendances — 1 policy (P1)
-- ===========================================================================

DROP POLICY IF EXISTS attendances_all_admin ON public.attendances;
CREATE POLICY attendances_all_admin ON public.attendances
  AS PERMISSIVE
  FOR ALL
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.discount_code_tiers — 3 policies (P1)
-- ===========================================================================

DROP POLICY IF EXISTS discount_code_tiers_delete ON public.discount_code_tiers;
CREATE POLICY discount_code_tiers_delete ON public.discount_code_tiers
  AS PERMISSIVE
  FOR DELETE
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS discount_code_tiers_insert ON public.discount_code_tiers;
CREATE POLICY discount_code_tiers_insert ON public.discount_code_tiers
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS discount_code_tiers_update ON public.discount_code_tiers;
CREATE POLICY discount_code_tiers_update ON public.discount_code_tiers
  AS PERMISSIVE
  FOR UPDATE
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.discount_codes — 3 policies (P1)
-- ===========================================================================

DROP POLICY IF EXISTS discount_codes_delete ON public.discount_codes;
CREATE POLICY discount_codes_delete ON public.discount_codes
  AS PERMISSIVE
  FOR DELETE
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS discount_codes_insert ON public.discount_codes;
CREATE POLICY discount_codes_insert ON public.discount_codes
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS discount_codes_update ON public.discount_codes;
CREATE POLICY discount_codes_update ON public.discount_codes
  AS PERMISSIVE
  FOR UPDATE
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.door_scan_events — 1 policy (P1)
-- ===========================================================================

DROP POLICY IF EXISTS door_scan_events_select_admin ON public.door_scan_events;
CREATE POLICY door_scan_events_select_admin ON public.door_scan_events
  AS PERMISSIVE
  FOR SELECT
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.drink_items — 3 policies (P1)
-- ===========================================================================

DROP POLICY IF EXISTS drink_items_delete ON public.drink_items;
CREATE POLICY drink_items_delete ON public.drink_items
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS drink_items_insert ON public.drink_items;
CREATE POLICY drink_items_insert ON public.drink_items
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS drink_items_update ON public.drink_items;
CREATE POLICY drink_items_update ON public.drink_items
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.drink_tokens — 1 policy (P1)
-- ===========================================================================

DROP POLICY IF EXISTS drink_tokens_select_admin ON public.drink_tokens;
CREATE POLICY drink_tokens_select_admin ON public.drink_tokens
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.event_media — 4 policies (P1, P5)
-- ===========================================================================

DROP POLICY IF EXISTS event_media_delete_admin ON public.event_media;
CREATE POLICY event_media_delete_admin ON public.event_media
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS event_media_insert_member ON public.event_media;
CREATE POLICY event_media_insert_member ON public.event_media
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((auth.uid() = uploaded_by) AND (select private.has_capability('membership.active'))));

DROP POLICY IF EXISTS event_media_select_admin ON public.event_media;
CREATE POLICY event_media_select_admin ON public.event_media
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS event_media_update_admin ON public.event_media;
CREATE POLICY event_media_update_admin ON public.event_media
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.event_parties — 4 policies (P1)
-- ===========================================================================

DROP POLICY IF EXISTS event_parties_delete_own ON public.event_parties;
CREATE POLICY event_parties_delete_own ON public.event_parties
  AS PERMISSIVE
  FOR DELETE
  USING (((select private.has_capability('staff.manage')) AND (((SELECT profiles.role FROM profiles WHERE (profiles.id = auth.uid())) = 'master'::text) OR (EXISTS (SELECT 1 FROM events e WHERE ((e.id = event_parties.event_id) AND (e.created_by = auth.uid())))))));

DROP POLICY IF EXISTS event_parties_insert_admin ON public.event_parties;
CREATE POLICY event_parties_insert_admin ON public.event_parties
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS event_parties_select_admin ON public.event_parties;
CREATE POLICY event_parties_select_admin ON public.event_parties
  AS PERMISSIVE
  FOR SELECT
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS event_parties_update_own ON public.event_parties;
CREATE POLICY event_parties_update_own ON public.event_parties
  AS PERMISSIVE
  FOR UPDATE
  USING (((select private.has_capability('staff.manage')) AND (((SELECT profiles.role FROM profiles WHERE (profiles.id = auth.uid())) = 'master'::text) OR (EXISTS (SELECT 1 FROM events e WHERE ((e.id = event_parties.event_id) AND (e.created_by = auth.uid())))))));

-- ===========================================================================
-- public.events — 4 policies (P1, P2)
-- ===========================================================================

DROP POLICY IF EXISTS events_delete_own ON public.events;
CREATE POLICY events_delete_own ON public.events
  AS PERMISSIVE
  FOR DELETE
  USING (((auth.uid() = created_by) OR (select private.has_capability('master.manage'))));

DROP POLICY IF EXISTS events_insert_admin ON public.events;
CREATE POLICY events_insert_admin ON public.events
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS events_select_admin ON public.events;
CREATE POLICY events_select_admin ON public.events
  AS PERMISSIVE
  FOR SELECT
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS events_update_own ON public.events;
CREATE POLICY events_update_own ON public.events
  AS PERMISSIVE
  FOR UPDATE
  USING (((auth.uid() = created_by) OR (select private.has_capability('master.manage'))));

-- ===========================================================================
-- public.guest_list_entries — 4 policies (P1)
-- ===========================================================================

DROP POLICY IF EXISTS guest_list_delete_admin ON public.guest_list_entries;
CREATE POLICY guest_list_delete_admin ON public.guest_list_entries
  AS PERMISSIVE
  FOR DELETE
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS guest_list_insert_admin ON public.guest_list_entries;
CREATE POLICY guest_list_insert_admin ON public.guest_list_entries
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS guest_list_select_admin ON public.guest_list_entries;
CREATE POLICY guest_list_select_admin ON public.guest_list_entries
  AS PERMISSIVE
  FOR SELECT
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS guest_list_update_admin ON public.guest_list_entries;
CREATE POLICY guest_list_update_admin ON public.guest_list_entries
  AS PERMISSIVE
  FOR UPDATE
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.newsletter_subscribers — 1 policy (P1)
-- ===========================================================================

DROP POLICY IF EXISTS newsletter_select_admin ON public.newsletter_subscribers;
CREATE POLICY newsletter_select_admin ON public.newsletter_subscribers
  AS PERMISSIVE
  FOR SELECT
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.profiles — 2 policies (P1, P2)
-- ===========================================================================

DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin ON public.profiles
  AS PERMISSIVE
  FOR SELECT
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS profiles_update_master ON public.profiles;
CREATE POLICY profiles_update_master ON public.profiles
  AS PERMISSIVE
  FOR UPDATE
  USING ((select private.has_capability('master.manage')));

-- ===========================================================================
-- public.rsvps — 2 policies (P1, P5)
-- ===========================================================================

DROP POLICY IF EXISTS rsvps_insert_approved ON public.rsvps;
CREATE POLICY rsvps_insert_approved ON public.rsvps
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK (((auth.uid() = user_id) AND (select private.has_capability('membership.active'))));

DROP POLICY IF EXISTS rsvps_select_admin ON public.rsvps;
CREATE POLICY rsvps_select_admin ON public.rsvps
  AS PERMISSIVE
  FOR SELECT
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.ticket_refunds — 2 policies (P1)
-- ===========================================================================

DROP POLICY IF EXISTS refunds_select_admin ON public.ticket_refunds;
CREATE POLICY refunds_select_admin ON public.ticket_refunds
  AS PERMISSIVE
  FOR SELECT
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS refunds_update_admin ON public.ticket_refunds;
CREATE POLICY refunds_update_admin ON public.ticket_refunds
  AS PERMISSIVE
  FOR UPDATE
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.ticket_tiers — 3 policies (P1)
-- ===========================================================================

DROP POLICY IF EXISTS ticket_tiers_delete ON public.ticket_tiers;
CREATE POLICY ticket_tiers_delete ON public.ticket_tiers
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS ticket_tiers_insert ON public.ticket_tiers;
CREATE POLICY ticket_tiers_insert ON public.ticket_tiers
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((select private.has_capability('staff.manage')));

DROP POLICY IF EXISTS ticket_tiers_update ON public.ticket_tiers;
CREATE POLICY ticket_tiers_update ON public.ticket_tiers
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.tickets — 1 policy (P1)
-- ===========================================================================

DROP POLICY IF EXISTS tickets_select_admin ON public.tickets;
CREATE POLICY tickets_select_admin ON public.tickets
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((select private.has_capability('staff.manage')));

-- ===========================================================================
-- public.venues — 3 policies (P3, P4)
-- ===========================================================================

DROP POLICY IF EXISTS venues_delete_master ON public.venues;
CREATE POLICY venues_delete_master ON public.venues
  AS PERMISSIVE
  FOR DELETE
  USING ((select private.has_capability('master.manage')));

DROP POLICY IF EXISTS venues_insert_organizer ON public.venues;
CREATE POLICY venues_insert_organizer ON public.venues
  AS PERMISSIVE
  FOR INSERT
  WITH CHECK ((select private.has_capability('catalogue.manage')));

DROP POLICY IF EXISTS venues_update_organizer ON public.venues;
CREATE POLICY venues_update_organizer ON public.venues
  AS PERMISSIVE
  FOR UPDATE
  USING ((select private.has_capability('catalogue.manage')));

-- =============================================================================
-- Closing note — what a reader should check if this file is ever suspected
-- =============================================================================
-- Every predicate above is Postgres's own rendering of the policy as it stood
-- before this phase (pg_policies.qual / with_check, captured in
-- .planning/phases/32-capability-model-in-the-database/baseline/
-- 32-BASELINE-policies.json), with exactly one substring replaced per call
-- site. It was generated from that artefact, not typed from a research
-- document: a hand-typed list is how the 46th policy gets forgotten.
--
-- The (select ...) wrapper around every has_capability call is load-bearing.
-- It is what makes Postgres evaluate the call once per statement as an
-- InitPlan instead of once per row. STABLE volatility does NOT do that on its
-- own, whatever a comment elsewhere in this repository claims.
--
-- has_capability is called with ONE argument. Passing p_party_id explicitly,
-- even as null, changes the way pg_policies re-prints the call site and the
-- phase comparator's whitelist does not accept that form. The parameter exists
-- to be filled by phase 35, not to be spelled out now.
-- =============================================================================

COMMIT;
