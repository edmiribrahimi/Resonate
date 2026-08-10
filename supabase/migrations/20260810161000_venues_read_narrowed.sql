-- Closing the anonymous read of venue addresses, and building the one public
-- road that replaces it
-- Phase 37, Plan 02: VENUE-01, under decisions D-37-02, D-37-10, D-37-23,
-- D-37-24 and D-37-25
--
-- Changes:
-- 1. public.party_start_instant(date, time) — when a night starts, decided by
--    the database, under the same Turin wall-clock rule that already lives in
--    TypeScript at `src/utils/datetime.ts`
-- 2. public.venues — `venues_select_public` DROPPED, `venues_select_staff`
--    created in its place, and NO SELECT policy for `anon` at all
-- 3. public.venue_for_parties(uuid[]) — the only public road to an address,
--    which decides PER NIGHT and never per venue
--
-- Three changes, ONE transaction. Half of this file is worse than none of it,
-- and each half is bad in its own direction:
--
--   * the DROP without the function closes the address for everybody, including
--     the anonymous reader of a NON-secret night that D-37-24 says must keep
--     seeing it;
--   * the function without the DROP is a second road beside a door that is
--     still open — `venues_select_public` grants unconditionally, PERMISSIVE
--     policies are OR'd, and while that row exists NO policy added beside it
--     can narrow anything (`supabase-data.md`, gate *RLS contestuale*);
--   * `party_start_instant` without the function is a second implementation of
--     a temporal rule with no caller — a duplicate free to drift with nothing
--     holding it, which is the exact defect commit `8f4e004` centralised
--     `src/utils/datetime.ts` to end.
--
-- ── WHAT THIS FILE IS FIXING, MEASURED ───────────────────────────────────────
--
-- `venues_select_public` (`20260226200000_venues.sql:25-27`) has an
-- unconditional predicate: it grants SELECT on every row, to every role.
-- Composed with `event_parties_select_published`
-- (`20260225150000_party_architecture.sql:31-37`) it returns the name, the
-- ADDRESS and the Maps link of a SECRET night to anybody holding the anonymous
-- key, with no session at all. Measured in production and recorded at
-- `.planning/todos/pending/secret-venue-address-readable-by-anon.md`.
--
-- The precondition that todo declared — *measure first whether the same path
-- exists through `events` or `event_media`, or you close one door on a wall
-- that has two* — was executed by the phase research (37-RESEARCH.md § B.1):
-- `public.events` no longer carries ANY address column (`location`,
-- `preparty_location`, `afterparty_location` were dropped by
-- `20260225150000_party_architecture.sql:164-171`), and `public.event_media` is
-- not readable by `anon` at all (its two wide policies were dropped by
-- `20260225120000_phase7_media.sql:19-20`). The RLS wall has ONE door, and it
-- is this one.
--
-- ── WHY NARROWING THE POLICY IS NOT ENOUGH, AND WHY THERE IS NO `anon` POLICY -
--
-- An anonymous reader ALREADY reads `event_parties.venue_id` for every night of
-- a published event, secret nights included. So ANY row of `public.venues` an
-- anonymous reader can reach is joinable to the secret night that names it, and
-- the address comes out anyway. A policy shaped "only non-secret venues" would
-- read as the generous option and would be the same leak with one extra step:
-- the leak is per-VENUE reasoning applied to a per-NIGHT secret, and a venue
-- that hosts one public night and one secret night carries both.
--
-- The only shape that holds is therefore: take `anon` off `public.venues`
-- entirely, and serve the public from a function that decides FOR EACH NIGHT.
-- That is section 3, and it is where the three levels of D-37-02 are written
-- once, in the tier `CLAUDE.md` operating principle 2 names as the boundary.
--
-- ── THE CONSEQUENCE THIS FILE CANNOT PAY FOR BY ITSELF ───────────────────────
--
-- Two public pages read the venue through a NESTED EMBED — `events/page.tsx:212`
-- and `events/[slug]/page.tsx:223`. A PostgREST embed a reader is not entitled
-- to does NOT raise: it returns empty. From the instant this file is applied,
-- those two embeds come back `null` for an anonymous reader on EVERY night,
-- non-secret ones included — which is a D-37-24 regression that nothing logs
-- and nothing measures. Plans 37-05 and 37-06 move both call sites onto
-- `public.venue_for_parties` and are what pays that cost; plan 37-13 is the
-- anonymous check that proves it with the anon key against the real pages,
-- reading the SOURCE and not the rendering.
--
-- Said here, in the file, because the window between applying this and shipping
-- those two pages is real and is not visible from either side of it.
--
-- ── WHAT THIS FILE DOES NOT TOUCH ────────────────────────────────────────────
--
-- The three WRITE policies of `public.venues` — `venues_insert_organizer`,
-- `venues_update_organizer`, `venues_delete_master`, as rewritten by
-- `20260807010000_policies_to_capabilities.sql:401-417` — are left exactly as
-- they are. This phase changes who may READ an address, and touching a write
-- predicate in the same file would make the diff impossible to audit against
-- that question.
--
-- No column is added, so `src/types/database.ts` gains nothing from this file;
-- the two function signatures are added to it by plan 37-03, in the same commit
-- that applies the migrations (`supabase-data.md`, gate *tipi allineati*).
--
-- Idempotence, item by item. This queue is applied BY HAND, one file at a time,
-- and a `42710` on a second run rolls back the transaction and leaves every
-- file after it unapplied:
--
--   * `CREATE OR REPLACE` for both functions — the idempotent form for an
--     object that cannot take `IF NOT EXISTS`;
--   * `DROP POLICY IF EXISTS` for `venues_select_public`, which is the point of
--     the file on a first run and a no-op on every run after;
--   * `DROP POLICY IF EXISTS` before `CREATE POLICY venues_select_staff`;
--   * `REVOKE` / `GRANT` are idempotent by nature.
--
-- Re-eseguire deve essere sicuro, o nessuno ri-esegue quando dovrebbe.

BEGIN;

-- =============================================================================
-- 1. public.party_start_instant — the start of a night, in SQL, once
-- =============================================================================
--
-- WHAT IT ANSWERS: given the calendar date a night is filed under and the hour
-- it opens, what real instant is that. `event_parties.date` is a `date` and
-- `event_parties.time` is a `time`, both without a zone: they mean wall-clock
-- time in Turin and nothing else says so.
--
-- No midnight rule here, and the asymmetry with `party_end_instant` is the
-- point: a CLOSING hour before noon belongs to the next calendar day (a night
-- runs 22:00 → 06:00), a STARTING hour never does. The two functions are
-- siblings and they are deliberately not the same arithmetic.
--
-- ── THE COST, DECLARED RATHER THAN DISCOVERED ────────────────────────────────
--
-- This is a SECOND IMPLEMENTATION of a rule this repository already owns.
-- `src/utils/datetime.ts` holds the first, in `partyStartInstant` built on
-- `zonedInstant`, and that module exists for a recorded reason (commit
-- `8f4e004`): the same question was answered in six slightly different places,
-- each parsing a stored `date` + `time` in the RUNTIME's zone — UTC on Vercel,
-- the visitor's own zone in a browser. That failure never raised an error. It
-- moved a window by an hour, and on a daily cron an hour can move an item past
-- the only window that would have caught it.
--
-- Writing it again is therefore a DELIBERATE DEROGATION, and the reason is that
-- section 3's predicate runs inside a function body reached from RLS-governed
-- reads, where TypeScript does not go. A body cannot call TypeScript, and
-- passing a client-computed instant into the predicate would put the answer
-- under the control of the caller being checked.
--
-- THE MITIGATION IS THAT THE TWO HALVES NAME EACH OTHER. This comment names
-- `src/utils/datetime.ts`. **Changing one without the other is the defect**, and
-- it would not fail loudly — no build breaks, no error is raised, no test exists
-- to go red (there is no test runner for this product). It would move a window,
-- and on this particular window the thing on the other side is an address.
--
-- `Europe/Rome` by name, never a fixed numeric hour offset: the calendar runs
-- August → July, so the daylight-saving change is always inside it
-- (`time-and-scheduling.md`, gate *l'ora legale non e' costante*).
--
-- A NULL `p_time` yields NULL, and every comparison against NULL in section 3
-- is NULL — which is not true, so it grants nothing. The closed default holds
-- by construction (`venue-secrecy.md`, gate *default chiuso*).
--
-- ── IMMUTABLE, AND THE SAME CAVEAT AS ITS SIBLING ────────────────────────────
--
-- `IMMUTABLE` is honest: `date + time` and `timezone(text, timestamp)` are both
-- immutable in Postgres itself, and this function reads no table and no
-- setting. The caveat, stated rather than assumed: a system tzdata update could
-- in principle change the answer for a historical instant. Postgres makes the
-- same trade for its own operator, and this function does not get to be more
-- careful than the operator it is built from.
--
-- ── NO SPECIAL GRANT, AND THAT IS A DECISION ─────────────────────────────────
--
-- `public.party_end_instant` (`20260809000000_party_assignments.sql:141-149`)
-- carries no `REVOKE`/`GRANT` pair and says out loud that the omission is
-- deliberate. The same holds here for the same reason: this function is not
-- `SECURITY DEFINER`, it takes two scalars, it reads nothing and it returns
-- arithmetic. The default `EXECUTE` to `PUBLIC` is LEFT IN PLACE ON PURPOSE, and
-- it is written down so the next reader does not take the missing pair for an
-- oversight and "repair" it into a permission nobody needs.

CREATE OR REPLACE FUNCTION public.party_start_instant(
  p_date date,
  p_time time
) RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT (p_date + p_time) AT TIME ZONE 'Europe/Rome';
$$;

COMMENT ON FUNCTION public.party_start_instant(date, time) IS
  'When a night filed under p_date and opening at p_time begins, as a real instant, in Europe/Rome. '
  'No midnight rule, unlike public.party_end_instant: a closing hour before noon belongs to the next day, a starting hour never does. '
  'SECOND IMPLEMENTATION of the rule in src/utils/datetime.ts (partyStartInstant / zonedInstant): '
  'it exists because a SQL body cannot call TypeScript. Changing one half without the other is the defect '
  'and it would not fail loudly - it would move a window, and on this window the other side is an address.';

-- =============================================================================
-- 2. public.venues — the anonymous read, closed
-- =============================================================================
--
-- `venues_select_public` has never been redefined: the three later migrations
-- that touch `public.venues` rewrite only insert, update and delete
-- (`20260807010000_policies_to_capabilities.sql:401-417`). It is dropped HERE,
-- in a NEW migration, because an applied migration is a historical fact and is
-- not edited (`supabase-data.md`, gate *migration in avanti*).
--
-- And it must be DROPPED, not narrowed beside: PERMISSIVE policies are OR'd, so
-- while a row with an unconditional predicate exists no policy added next to it
-- can restrict anything at all.

DROP POLICY IF EXISTS venues_select_public ON public.venues;

-- The staff read, which is what `/admin/venues` and every work surface that
-- lists venues actually run on.
--
-- `staff.manage` and not another key, verified by reading
-- `20260807000000_capability_model.sql:390-423` rather than assuming: the roles
-- holding `organizer.access` (master, organizer) are EXACTLY the roles holding
-- `staff.manage` (master, organizer). There is no role that reaches
-- `/admin/venues` and would lose the list, so no second key needs OR-ing in.
--
-- `staff.manage` carries `requires_approved = false` on both its grant rows, ON
-- PURPOSE (`capability_model.sql:392-393`), which means a PENDING organizer can
-- read the venue list. That is what happens today and this file does not change
-- it: today a pending organizer reads it because the policy being dropped
-- grants it to literally everybody. This whole section is a RESTRICTION —
-- from "anybody with the anonymous key" to "master and organizer" — and it is
-- written here so nobody reads the surviving pending-organizer access as
-- something this migration introduced.
--
-- `TO authenticated` is narrower than the plan's minimum and costs nothing: for
-- `anon` the predicate can only ever answer false anyway, since `auth.uid()` is
-- null and the resolver finds no profile row
-- (`capability_model.sql:219-224`). `service_role` bypasses RLS entirely and is
-- unaffected. Same shape as `tickets_select_admin`
-- (`20260807010000_policies_to_capabilities.sql:390-395`).
--
-- The `(select …)` wrapper is LOAD-BEARING and it is not `STABLE` that produces
-- it: it makes Postgres evaluate the call once per statement as an InitPlan
-- instead of once per row, proved by `EXPLAIN` on this database and written up
-- at `20260807000000_capability_model.sql:177-184`.

DROP POLICY IF EXISTS venues_select_staff ON public.venues;

CREATE POLICY venues_select_staff ON public.venues
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((select private.has_capability('staff.manage')));

-- -----------------------------------------------------------------------------
-- 2b. No SELECT policy for `anon`, and the omission is the decision
-- -----------------------------------------------------------------------------
--
-- There is deliberately no third policy here, and without this paragraph the
-- next reader would take the gap for an oversight and close it with the
-- "obvious" one — a policy granting anonymous read of the venues that host at
-- least one published NON-secret night.
--
-- That policy is the harmful repair, and here is why, named so it is recognised
-- if it is ever proposed: it reasons PER VENUE about a secret that is PER
-- NIGHT. A venue hosting one public night and one secret night would become
-- readable — and an anonymous reader already holds `event_parties.venue_id` for
-- the secret night, so the join is one request away. The public page of a venue
-- already treats this same edge case by WITHHOLDING
-- (`src/app/(public)/venues/[slug]/page.tsx:39-72`, which names phase 37 and is
-- closed by it), and withholding costs visibility, which is recoverable, while
-- the other direction is not.
--
-- The public road is section 3, which decides per night. It is not a
-- convenience: it is the only shape in which the question "may THIS reader see
-- THIS night's address" can be asked at all.

-- =============================================================================
-- 3. public.venue_for_parties — the one public road, and it decides PER NIGHT
-- =============================================================================
--
-- WHAT IT ANSWERS: of these nights, which ones may THIS caller be told the venue
-- of, and what is it. It takes an array because both call sites need many nights
-- at once (`events/page.tsx` renders a list); one round trip per night on the
-- hottest public page of the site would be the cost of asking the question
-- badly, not the cost of the question.
--
-- ── IT NEVER RETURNS A PARTIAL ROW, AND THAT IS THE DESIGN ───────────────────
--
-- A night is either in the result with all four venue fields, or it is absent.
-- There is no third shape — no name without the address, no "revealed soon".
-- A fallback row would be a state that none of the three lines of D-37-02
-- describes, and the page would have to invent a meaning for it. **Absent means
-- NO ENTITLEMENT**, and the caller renders the hint, never a stand-in
-- (`venue-secrecy.md`, gate *default chiuso*).
--
-- ── SECURITY DEFINER, AND WHY IT IS NOT A HOLE ───────────────────────────────
--
-- It must be `SECURITY DEFINER`, because after section 2 the caller cannot read
-- `public.venues` at all and the whole point is to answer for a caller who
-- cannot. What keeps that from being an escalation primitive is that the
-- function is not given a way to name anybody but the caller: it resolves the
-- subject itself, with `(select auth.uid())` and `private.has_capability`, from
-- INSIDE the body. There is no user-id argument, so there is nobody else to ask
-- about — the same shape, and the same reason, as `public.my_access_context`
-- (`20260807000000_capability_model.sql:226-242`).
--
-- `SET search_path = ''` with every reference schema-qualified: a
-- `SECURITY DEFINER` with a mutable search_path lets the caller choose which
-- `profiles` the definer reads (`capability_model.sql:166-171`).
--
-- `STABLE` and not `VOLATILE`: it reads, it never writes. It is not `IMMUTABLE`
-- and cannot be — it reads tables, and it reads `now()`.
--
-- ── THE ORACLE QUESTION, ANSWERED RATHER THAN IGNORED ────────────────────────
--
-- A caller can learn from the absence of a night that the night is secret and
-- they have no entitlement. That is ACCEPTED, not overlooked: it is exactly what
-- the public event page already tells the same caller, out loud, by rendering
-- the hint instead of the address. It leaks no address and no membership. The
-- usual mitigation for an oracle is rate limiting, and **this repository has
-- none anywhere**; introducing one is an architecture decision, not a line in a
-- migration.
--
-- ── THE FIVE ARMS OF ENTITLEMENT ─────────────────────────────────────────────
--
-- Arms 1-3 and the second half of arm 5 are today's behaviour, moved from an
-- `if` in a page (`events/[slug]/page.tsx:87-117`) into the tier that
-- `CLAUDE.md` operating principle 2 says owns this decision. Arm 4 and the
-- first half of arm 5 are the widening this phase is authorised to make, and
-- they are the ONLY widening in this file.
--
-- ── THE PUBLICATION FLOOR IS UNDER FOUR ARMS, NOT UNDER FIVE ─────────────────
--
-- `e.is_published` used to sit in front of every arm, as one conjunct. It has
-- been moved INSIDE, so it governs the four PUBLIC arms (1, 3, 4, 5) and not
-- the staff arm. The reason is measured, not preferred, and it is written here
-- rather than only in a plan because the next reader will otherwise take the
-- asymmetry for a slip and "repair" it:
--
--   * In front of the arms, this function answered NOBODY on a draft event —
--     `staff.manage` included. Measured in plan 37-13, in a throwaway
--     container: on an unpublished event, `venue_for_parties` returned 0 rows to
--     a master, while the SAME master reading `public.venues` directly returned
--     the rows. Staff see drafts on the events list, and from that measurement
--     they would have seen them WITHOUT the venue name.
--   * So this is not a widening. Whoever holds `staff.manage` already reads
--     `public.venues` outright, through `venues_select_staff` created in
--     section 2 of this very file. The function refusing them a name on a draft
--     protected nothing: it denied one road while another stood open. It
--     removes an incoherence and adds no reader.
--
-- Decided at the phase's close, 2026-08-11, on 37-13's measurement — while this
-- migration is still UNAPPLIED, which is the only reason it costs the edit of a
-- file (`deferred-items.md`, entry 4, now closed).
--
-- The direction of the four public arms is unchanged: a draft event answers
-- nobody who is not staff, and that is the whole of what the floor was for.
--
-- ── WHAT PER-NIGHT DOES NOT BUY, MEASURED ON A THROWAWAY CONTAINER ───────────
--
-- Deciding per night closes the deduction that comes from a venue being
-- readable on its own. It does NOT close the one that comes from a venue being
-- SHARED. Measured, not reasoned: a venue hosting one published NON-secret
-- night and one secret night returns its address to an anonymous caller for the
-- open night — including `venue_id` — and that same `venue_id` is on the secret
-- night's row, which `anon` already reads through
-- `event_parties_select_published`. The join is one request away.
--
-- It is a RESIDUE, not a regression: today an anonymous caller reads every venue
-- row outright and has nothing to deduce. It is left open because closing it
-- means WITHHOLDING the venue of the open night — which is the reading the
-- public venue page already applies to the same edge case
-- (`src/app/(public)/venues/[slug]/page.tsx:39-72`) and the reading that the
-- gate *default chiuso* prefers — and that contradicts D-37-24, which is an
-- owner decision and is not overturned by a migration comment.
--
-- Written here so the entry that calls T-37-08 "mitigated" is read with its
-- scope attached. A threat register that says mitigated where it means
-- partially mitigated is how the remaining half stops being looked for.

CREATE OR REPLACE FUNCTION public.venue_for_parties(
  p_party_ids uuid[]
) RETURNS TABLE (
  party_id        uuid,
  venue_id        uuid,
  name            text,
  slug            text,
  address         text,
  google_maps_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    ep.id,
    v.id,
    v.name,
    v.slug,
    v.address,
    v.google_maps_url
  FROM public.event_parties ep
  JOIN public.events e ON e.id = ep.event_id
  JOIN public.venues v ON v.id = ep.venue_id
  WHERE ep.id = ANY(p_party_ids)
    AND (
      -- ARM 2 — staff. Branch `:101` of today's predicate, and the substitution
      -- is not like-for-like in either direction, so it is written down: today
      -- the page grants to `isOrganizer`, which is NOT the role but
      -- `event.created_by = auth.uid()` (`page.tsx:192`). This key is WIDER
      -- (every organizer, not only the one who created the event — which is
      -- D-37-13's requirement, since that person may be unreachable on the very
      -- Friday the reveal is needed) and far NARROWER than the policy being
      -- removed, which granted to everybody including sessionless readers. Net
      -- direction: a restriction.
      --
      -- It is written FIRST, outside the publication floor, and the position is
      -- the decision: this is the one arm a DRAFT event answers. See the
      -- paragraph above the function — staff already read `public.venues`
      -- through `venues_select_staff`, so refusing them here denied a road while
      -- leaving another open. The arm keeps its number: the five arms are
      -- D-37-02's vocabulary, and renumbering them would break every reference
      -- written in this phase.
      (select private.has_capability('staff.manage'))

      OR (
        -- THE PUBLICATION FLOOR, under the four public arms and only those. An
        -- unpublished event answers nobody who is not staff.
        e.is_published
        AND (
          -- ARM 1 — the night is not secret (D-37-24). True for a reader with no
          -- session at all, and that is the decision: it is today's behaviour and it
          -- matches the posters, which name the venue in full
          -- (`brand-visual-system.md`, gate *nome e luogo di una venue*). What this
          -- phase closes is the venues page and the SECRET nights, not the name of a
          -- public bar.
          ep.venue_secret = false

          -- ARM 3 — a ticket for this night, or a MASTER TICKET for its event
          -- (`party_id IS NULL`), **and only where buying is configured to unlock
          -- the address**. Level 1 of D-37-02, and it mirrors the ticket branch of
          -- `isVenueVisible` (`events/[slug]/page.tsx:178-185`), which is the
          -- SOURCE this was read from rather than reconstructed from memory:
          --
          --     (venueRevealOnPurchase && (hasTicketForParty || hasMasterTicket))
          --
          -- The two ticket shapes are the ones the cron already treats as
          -- entitlement (`api/cron/venue-reveal/route.ts:57-76`), read from there
          -- rather than re-derived.
          --
          -- ── The conjunct was missing, and it is not a cosmetic difference ────────
          --
          -- Written without it, a night deliberately configured
          -- `venue_reveal_on_purchase = false` — *the ticket does not unlock the
          -- address* — would refuse the address on the page and hand it over to the
          -- same person through `POST /rest/v1/rpc/venue_for_parties` with their own
          -- JWT, since this function is granted to `authenticated`. In a project
          -- whose first principle is *the page is UX, the RLS is the boundary*, that
          -- means the flag in the form promises a control the boundary does not
          -- apply. Two verdicts on one question, and the one that counts was the
          -- looser one.
          --
          -- `coalesce(…, true)` and not a bare read, because that is the page's
          -- semantics and not a choice made here: the column is a nullable
          -- `boolean DEFAULT true` (`20260305200000_venue_reveal_on_purchase.sql:2-3`),
          -- and the page normalises it with `?? true` before the predicate sees it
          -- (`page.tsx:519`). A bare `ep.venue_reveal_on_purchase` would evaluate
          -- NULL — hence not true — on any pre-default row, and this arm would go
          -- silently closed for a ticket holder the page shows the address to.
          --
          -- Arm 4 (RSVP) is deliberately NOT under this flag, and arm 5 is not
          -- either: an RSVP is not a purchase, and an approved member at the window
          -- is not entitled through a ticket. See each arm's own note.
          OR (
            coalesce(ep.venue_reveal_on_purchase, true)
            AND EXISTS (
              SELECT 1
              FROM public.tickets t
              WHERE t.user_id = (select auth.uid())
                AND (
                  t.party_id = ep.id
                  OR (t.party_id IS NULL AND t.event_id = ep.event_id)
                )
            )
          )

          -- ARM 4 — an RSVP for this night. Level 1, NEW (D-37-10). Today
          -- `isVenueVisible` has no RSVP input at all — `party.userRsvp` is fetched
          -- and never passed — while the cron mails that same person the address
          -- like any other holder. This arm removes an asymmetry rather than adding
          -- one: after it, the page and the mail speak about the same set of people.
          --
          -- It is deliberately NOT guarded by `venue_reveal_on_purchase`. An RSVP is
          -- not a purchase, and hanging it on that flag would mean switching the flag
          -- off on an RSVP night takes the address away from someone who has said
          -- they are coming WHILE THE CRON KEEPS SENDING IT — which is precisely the
          -- asymmetry D-37-10 exists to close.
          OR EXISTS (
            SELECT 1
            FROM public.rsvps r
            WHERE r.user_id = (select auth.uid())
              AND r.party_id = ep.id
          )

          -- ARM 5 — an approved member, at the window, or once somebody has revealed
          -- by hand. Level 2 of D-37-02, and THE ONLY WIDENING OF THIS PHASE: today
          -- an approved member without a ticket never sees the address before the
          -- night. It is per-EVENT reasoning applied to a per-recipient secret, which
          -- `venue-secrecy.md` used to forbid outright; the owner took that decision
          -- with the cost written down (more people know the address than walk in —
          -- neighbours, a 150-300 room, private spaces with no public-entertainment
          -- licence), and the gate itself is rewritten in the same phase (D-37-03),
          -- or it would keep flagging the intended behaviour as a violation until
          -- somebody "repaired" it.
          --
          -- The OR of three terms is D-37-04, and each one has a job:
          --   * `venue_revealed_at IS NOT NULL` — the manual act. This is what makes
          --     the button OBSERVABLE: pressed before the window, the page opens.
          --     It is deliberately NOT `venue_reveal_email_sent`, which the cron
          --     raises even on a night with ZERO recipients
          --     (`route.ts:108-115`) — that boolean would open the page on a night
          --     that was merely swept.
          --   * the window — `now()` past `start - venue_reveal_hours`.
          --   * the night has started — branch `:109` of today's predicate. It looks
          --     subsumed by the window term and it is not, for a negative
          --     `venue_reveal_hours`: the column is a bare `integer` with no CHECK,
          --     and on a negative value the window term opens AFTER the doors while
          --     this one still opens at them.
          --
          -- On `coalesce(ep.venue_reveal_hours, 25)`: this is the SECOND HOME of that
          -- number. The first is `DEFAULT_VENUE_REVEAL_HOURS` in
          -- `src/utils/datetime.ts` (plan 37-04). Postgres does not import
          -- TypeScript, so the duplication is unavoidable — and therefore it is
          -- DECLARED here and in the COMMENT below rather than suffered. 25 and not
          -- 24 because the plan is Hobby: the cron runs once a day with +-59 minutes
          -- of jitter, so two consecutive runs can be 24h59m apart, and a 24-hour
          -- window is not guaranteed to contain one (D-37-06/D-37-07).
          OR (
            EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE p.id = (select auth.uid())
                AND p.status = 'approved'
            )
            AND (
              ep.venue_revealed_at IS NOT NULL
              OR now() >= public.party_start_instant(ep.date, ep.time)
                   - make_interval(hours => coalesce(ep.venue_reveal_hours, 25))
              OR now() > public.party_start_instant(ep.date, ep.time)
            )
          )
        )
      )
    );
$$;

-- REVOKE first and GRANT second, in that order and as two statements rather
-- than assumed: Postgres grants EXECUTE to PUBLIC by default on every new
-- function, so the GRANT alone would leave the default in place. Same shape as
-- `20260808002000_membership_register.sql:479-488`.
REVOKE ALL ON FUNCTION public.venue_for_parties(uuid[]) FROM public;

-- `anon` is on this grant ON PURPOSE and it is not a slip. It is the road
-- D-37-24 needs: a visitor with no login, on a NON-secret night, must still get
-- the venue name and address, and after section 2 there is no other way for
-- them to get it. The function grants them nothing else — for `anon`,
-- `auth.uid()` is null, so arms 3, 4 and 5 can only ever answer false, and
-- `private.has_capability` finds no profile row, so arm 2 answers false too.
-- Arm 1 is the whole of what an anonymous caller can reach.
GRANT EXECUTE ON FUNCTION public.venue_for_parties(uuid[]) TO anon, authenticated;

COMMENT ON FUNCTION public.venue_for_parties(uuid[]) IS
  'The ONE public road to a venue address, and it decides PER NIGHT, never per venue. '
  'A night is returned with all four venue fields or not at all: absent means NO ENTITLEMENT, and the caller renders the hint. '
  'Five arms (D-37-02): (1) the night is not secret; (2) staff.manage; '
  '(3) a ticket for the night or a master ticket for its event, AND venue_reveal_on_purchase (coalesced to true), which is the same conjunction the page predicate applies; '
  '(4) an RSVP for the night, deliberately NOT gated on venue_reveal_on_purchase since an RSVP is not a purchase (D-37-10); '
  '(5) an approved member, once venue_revealed_at is set, or at the reveal window, or after the night has started (D-37-04). '
  'events.is_published gates arms 1, 3, 4 and 5 and NOT arm 2: on a DRAFT event only staff.manage is answered. '
  'That is not a widening - staff already read public.venues outright through venues_select_staff, created in the same migration - '
  'and it removes an incoherence measured in plan 37-13, where a master got 0 rows here and the rows directly. '
  'It exists because closing the anonymous read of public.venues without it would silently strip the venue name from every night: '
  'a nested PostgREST embed a reader is not entitled to returns EMPTY, not an error. '
  'SECURITY DEFINER with no subject argument: it resolves the caller itself and cannot be asked about anybody else. '
  'THE 25 IN coalesce(venue_reveal_hours, 25) LIVES IN TWO PLACES - here and DEFAULT_VENUE_REVEAL_HOURS in src/utils/datetime.ts. '
  'Postgres cannot import TypeScript. Changing one without the other does not fail loudly: it moves a window, and behind this window is an address.';

COMMIT;
