-- The live attendance channel — a door hears its own night, and only its own
-- Phase 38, Plan 02: LIVE-01, LIVE-06
--
-- Changes:
-- 1. private.notify_attendance_changed(uuid, uuid) — the ONE place that decides
--    which topic a changed row belongs to. It emits an EMPTY payload on
--    `door:<party>`, and when the row carries no night it fans out over every
--    night of its event. Section 1.
-- 2. public.door_scan_events_notify_attendance() and its trigger on
--    public.door_scan_events, AFTER INSERT. This single table is the WHOLE
--    door: ticket check-in, membership admission, undo, and the offline queue
--    drain — the drain POSTs to the check-in route, so it arrives here for free
--    and `src/lib/offline/sync-manager.ts` is not touched by this phase.
--    Section 2.
-- 3. public.tickets_notify_attendance() and its trigger on public.tickets,
--    AFTER INSERT OR UPDATE OR DELETE. A ticket is bought, checked in, moved
--    between nights, or deleted when it is refunded, and each of the four
--    changes the list the door is reading. Section 3.
-- 4. public.guest_list_entries_notify_attendance() and its trigger on
--    public.guest_list_entries, AFTER INSERT OR UPDATE OR DELETE. The unpaid
--    entrance; the same four verbs reach the same list. Section 4.
-- 5. public.ticket_refunds_notify_attendance() and its trigger on
--    public.ticket_refunds, AFTER INSERT OR UPDATE. A refunded ticket's row is
--    deleted, so this table is the only way a night learns that a holder is no
--    longer expected. Section 5.
-- 6. realtime_messages_select_door_assigned — ONE SELECT policy on
--    realtime.messages, resolved by `private.has_capability('door.operate', …)`
--    and by nothing else. Section 6.
-- 7. NO INSERT, UPDATE or DELETE policy on realtime.messages, and the omission
--    IS the design. Section 7 says so at length, because it is load-bearing.
--
-- ── FOR THE READER WHO ARRIVES FROM `ticketing-payments.md` ──────────────────
--
-- Two of these triggers sit on the money tables — `public.tickets` and
-- `public.ticket_refunds` — so the question they raise is the right one and it
-- is answered here rather than left to be discovered.
--
-- They are `AFTER` triggers. They return `NULL`. They perform no write of their
-- own: each reads two uuids off the row and calls one function that only ever
-- calls `realtime.send`. And `realtime.send` wraps its whole insert in
-- `EXCEPTION WHEN OTHERS THEN RAISE WARNING 'WarnSendingBroadcastMessage: %'`
-- — read from `pg_proc.prosrc` on this project, 2026-08-11 — so it cannot
-- raise, and therefore cannot abort the transaction it hangs off.
--
-- The consequence, stated plainly: adding these triggers introduces ZERO new
-- ways for a purchase, a check-in or a refund to fail. That is not a courtesy
-- to the payments reader — it is the server half of LIVE-02.
--
-- The other side of the same coin, and it is not hidden: because
-- `realtime.send` cannot raise, a refused or failed emit is INVISIBLE except in
-- the Postgres log, and this repository has no error tracking (verified
-- 2026-08-05, `meta-gates.md`). That is precisely why the emit must be
-- `SECURITY DEFINER` (section 2) and why the door carries a 5-minute safety
-- reload and a visible staleness band: the observability lives at the door,
-- because it cannot live here.
--
-- ── FOR `meta-gates.md`: THE THREE MONOTONE GUARDS ARE UNTOUCHED ────────────
--
-- * `venue_reveal_sent` is neither read nor written by any object in this file.
-- * No payment state is read or written — no `status`, no `completed`, nothing
--   on the way to a terminal state. The two money-table triggers read only
--   `party_id` / `event_id` (and `refunded_party_id` / `refunded_event_id`).
-- * No series progressivo is read or written. `public.event_parties` is read in
--   section 1, for `id` and `event_id` only, and never written.
--
-- Nothing in this file can make any of the three monotone switches easier to
-- trip, because nothing in this file writes at all: every object here reads two
-- uuids and emits a message.
--
-- ── WHY THIS IS INVISIBLE FROM THE TYPESCRIPT, AND WHY THAT COST WAS TAKEN ──
--
-- A trigger in the database does not appear in any route handler, so a
-- developer reading `src/app/api/tickets/checkin/route.ts` will not see that a
-- message goes out. That is a real cost and it is paid deliberately.
--
-- The alternative is an emit written into each write path, and there are SIX of
-- them today (check-in, membership verify, undo, guest-list actions, the SumUp
-- purchase webhook, the refund action) with a seventh appearing every time a
-- new one is added. A forgotten route-handler emit produces A STALE ATTENDEE
-- LIST AT A DOOR WITH NO ERROR ANYWHERE — this project's canonical silent
-- failure, the newsletter form moved to the entrance. A trigger that fires more
-- often than strictly necessary produces one extra GET, which the client's
-- coalescing debounce absorbs.
--
-- Between a failure nobody sees and a cost nobody feels, this file takes the
-- cost. `checkin-offline.md` states the same asymmetry for admissions, and it
-- points the same way here. The price of the invisibility is this header: every
-- table carrying a trigger is named above, with the reason.
--
-- ── ONE CHANGE, ONE TRANSACTION ─────────────────────────────────────────────
--
-- A `CREATE POLICY` that committed without its helper and triggers would leave
-- a live door subscribed to a channel NOBODY SENDS TO: it would join cleanly,
-- report `SUBSCRIBED`, show no band, and deliver nothing — the deceptive half
-- of this phase's failure surface. The reverse half is as bad: triggers without
-- the policy emit to a topic no operator may read. So every statement below is
-- inside the same `BEGIN`/`COMMIT` and neither half can survive alone.
--
-- IDEMPOTENT, and by two mechanisms rather than one, because the objects differ:
-- functions use `CREATE OR REPLACE` (the form `20260810120000_formats_and_series.sql:590`
-- uses); the four triggers and the one policy are each preceded by their
-- `DROP … IF EXISTS`. Re-running this file against a database that already
-- holds these objects reproduces the state rather than raising `42710` and
-- stopping the queue behind it.
--
-- PREREQUISITE, stated so a failure is legible: this file calls
-- `private.has_capability` and creates into schema `private`, both from
-- `20260807000000_capability_model.sql`. Against a database without phase 32
-- it fails at the first reference, which is the correct place to fail.

BEGIN;

-- =============================================================================
-- 1. private.notify_attendance_changed — the one definition of "which topic"
-- =============================================================================
--
-- ── WHY `SECURITY DEFINER`, MEASURED RATHER THAN CHOSEN ─────────────────────
--
-- `realtime.send` is `prosecdef = false` — SECURITY INVOKER — measured against
-- this project on 2026-08-11 (plan 38-01, `emit_path`). Its INSERT into
-- `realtime.messages` therefore executes with the privileges of whichever role
-- performed the write that fired the trigger, and `realtime.messages` has
-- `relrowsecurity = true` with no INSERT policy (section 7, on purpose).
--
-- So an INVOKER emit is refused by RLS for any writing role without
-- `rolbypassrls`, `realtime.send` swallows that refusal in its own exception
-- handler, no error surfaces anywhere, and the 5-minute safety reload keeps
-- every door screen LOOKING CORRECT. LIVE-01 would have silently become
-- LIVE-04. `SECURITY DEFINER`, owned by the migration role, closes it:
-- `public.door_scan_events.relowner` is `postgres` (measured) and `postgres`
-- has `rolbypassrls = true`.
--
-- And the trap worth naming: an INVOKER emit would WORK TODAY, because every
-- write path this file hangs a trigger on currently runs through the service
-- client and `service_role` carries `rolbypassrls = true`. That is a property
-- of today's callers, not of the schema, and nothing pins it. The first write
-- reaching one of these four tables from a session client would turn every emit
-- on that path into silence. Do not "simplify" the DEFINER away.
--
-- `SET search_path = ''` with every reference fully qualified is the mandatory
-- other half of `SECURITY DEFINER`: without it the caller chooses which
-- `public.event_parties` the definer reads, and Supabase's advisor reports
-- `function_search_path_mutable`.

CREATE OR REPLACE FUNCTION private.notify_attendance_changed(
  p_party_id uuid,
  p_event_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_party_id IS NOT NULL THEN
    -- The payload is EMPTY and stays empty. `realtime.send` adds a random `id`
    -- key and nothing else, so what lands on the wire is exactly
    -- `{"id": "<uuid>"}`. That is what D-38-01 means concretely: the channel
    -- carries the FACT that a night's list changed, never the row. No name, no
    -- email, no refund detail can leak, because none is put on the wire — not
    -- because a client chooses to ignore it.
    --
    -- The fourth argument is `true` — PRIVATE — and it MUST match
    -- `{ config: { private: true } }` on the client. If the two disagree the
    -- channel joins, reports SUBSCRIBED, and delivers nothing: the door looks
    -- healthy and only the 5-minute parachute keeps its list alive. It is the
    -- most deceptive failure in this phase and no automated check catches it.
    PERFORM realtime.send('{}'::jsonb, 'attendance_changed',
                          'door:' || p_party_id::text, true);
    RETURN;
  END IF;

  IF p_event_id IS NOT NULL THEN
    -- THE FAN-OUT, and the reason for it rather than the mechanism.
    --
    -- A ticket or a guest-list entry may carry `party_id IS NULL`, and such a
    -- row is valid for EVERY night of its event — the endpoint that composes
    -- the door's list says so in its own words and queries it that way
    -- (`src/app/api/tickets/attendance/route.ts:585-614`, the NULL-tolerant
    -- `or(party_id.eq.…,party_id.is.null)` predicate on both tickets and
    -- guest-list entries).
    --
    -- Sending to `'door:' || NULL` would produce a NULL topic, reach nobody,
    -- and — this is the part that matters — the defect would HIDE: the safety
    -- reload keeps every screen looking right, so LIVE-01 would have silently
    -- become LIVE-04 for exactly the rows an event-level sale creates. A defect
    -- that shows nothing is worse than one that shows an error.
    --
    -- COST, so the next reader can re-measure instead of guess: this fans out
    -- one message per night of the event, and `public.event_parties` holds 3
    -- rows in total today (assumption A4). If an event ever carries many
    -- nights, THIS is the line to measure again.
    PERFORM realtime.send('{}'::jsonb, 'attendance_changed',
                          'door:' || ep.id::text, true)
    FROM public.event_parties ep
    WHERE ep.event_id = p_event_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION private.notify_attendance_changed(uuid, uuid) IS
  'Tells a night''s door that its attendee list changed, and tells it nothing else. The payload is '
  'empty by construction; realtime.send adds only a random id. It REFUSES to carry any part of the '
  'row - no name, no email, no refund detail - because the endpoint that composes the list is the '
  'one that redacts, and a second copy of a redaction diverges from the first. When the row names '
  'no night it fans out over every night of its event, since an event-level ticket is valid for all '
  'of them. SECURITY DEFINER because realtime.send is SECURITY INVOKER and realtime.messages has RLS '
  'on with no INSERT policy: an invoker emit would be refused and the refusal swallowed.';

-- ── THE REVOKE, WHICH IS THE POINT OF THIS SECTION (F1) ─────────────────────
--
-- This function takes two `uuid` arguments, so it is NOT a trigger function: it
-- is an ordinary callable. Under PostgreSQL's default `EXECUTE` to `PUBLIC` an
-- ordinary callable in an exposed schema is reachable at
-- `/rest/v1/rpc/<name>` by any signed-in member — who could then forge "this
-- night's list changed" on any night whose id they know, and turn every door on
-- that night into a reload storm from an ordinary account.
--
-- TWO measures, deliberately, not either:
--   * the schema — `private` is not in PostgREST's exposed schemas, which
--     removes the RPC route today;
--   * the revoke — which is the greppable evidence, and the half that SURVIVES
--     a future change to which schemas are exposed. A configuration change
--     elsewhere must not be able to open this.
--
-- There is no re-grant, and that is not an omission: the only caller is a
-- trigger wrapper running as its own definer, and a definer needs no privilege
-- of its own to call a function it owns.
--
-- The revoke-then-grant precedent is `20260809001000_assignment_resolver.sql:483-485`;
-- here the grant half is dropped on purpose. And note what does NOT apply: the
-- `20260809004500_event_media_party_id.sql:253-262` paragraph about a trigger
-- wrapper needing no REVOKE/GRANT pair rests on two legs — (a) a `RETURNS
-- trigger` function cannot be called directly (`0A000`), and (b) it is SECURITY
-- INVOKER and writes nothing. Leg (a) transfers to the four wrappers below.
-- Neither leg transfers HERE: this one is directly callable and it is DEFINER.

REVOKE ALL ON FUNCTION private.notify_attendance_changed(uuid, uuid) FROM public, anon, authenticated;

-- =============================================================================
-- 2. public.door_scan_events — one trigger, and it is the whole door
-- =============================================================================
--
-- ── THE `SECURITY` CLAUSE ON ALL FOUR WRAPPERS, IN ONE SENTENCE ─────────────
--
-- All four are `SECURITY DEFINER` because plan 38-01 measured `realtime.send`
-- to be `prosecdef = false` on this project, so a `SECURITY INVOKER` wrapper
-- would have its emit refused by RLS-with-no-INSERT-policy for any writing role
-- without `rolbypassrls`, and `realtime.send`'s own `EXCEPTION WHEN OTHERS THEN
-- RAISE WARNING` would swallow the refusal — no error, no emit, and a list that
-- only ever changes every five minutes. The full measurement, including why
-- today's service-client callers do not settle the question, is in section 1.
--
-- ── NO `WHEN` CLAUSE ON ANY OF THE FOUR, AND THE REASON IS THE ASYMMETRY ────
--
-- None of these four triggers carries a `WHEN` condition, and that is D-38-21
-- rather than an oversight. A filter slightly too narrow drops a real change
-- and leaves a STALE LIST AT A DOOR; a filter slightly too wide costs ONE GET,
-- which the client's coalescing debounce absorbs. `checkin-offline.md` already
-- states which direction to err in when the two errors are unequal, and it
-- points the same way here.
--
-- ── WHY THIS TABLE ALONE COVERS THE ENTIRE DOOR ─────────────────────────────
--
-- Ticket check-in, membership admission and undo all write a row here, and the
-- offline queue drain POSTs to the check-in route — so it arrives through the
-- same path and `src/lib/offline/sync-manager.ts` needs no change at all.
--
-- ── AND WHY IT HAS NO UPDATE BRANCH WHILE THE OTHER THREE DO ────────────────
--
-- The asymmetry is deliberate, and it is written down so the next reader does
-- not add the missing branch and then wonder why it never fires:
-- `public.door_scan_events` is APPEND-ONLY BY CONSTRUCTION — it carries no
-- write policy at all (`20260805120000_door_scan_events.sql:158-163`,
-- re-stated at `20260809004000_door_scan_events_by_assignment.sql:198-210`) —
-- so there is no update whose old night could differ from its new one, and no
-- delete whose `OLD` record would have to be read. `NEW.party_id` is `NOT NULL`
-- on this table, so the fan-out branch of the helper is never reached from here.

CREATE OR REPLACE FUNCTION public.door_scan_events_notify_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.notify_attendance_changed(NEW.party_id, NEW.event_id);
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.door_scan_events_notify_attendance() IS
  'Tells the night named by door_scan_events.party_id that its attendee list changed. AFTER INSERT '
  'only - the table is append-only by construction - so it reads NEW and never OLD. It writes '
  'nothing and returns NULL: it cannot alter, delay or fail the check-in that fired it.';

DROP TRIGGER IF EXISTS door_scan_events_notify_attendance ON public.door_scan_events;

CREATE TRIGGER door_scan_events_notify_attendance
  AFTER INSERT ON public.door_scan_events
  FOR EACH ROW
  EXECUTE FUNCTION public.door_scan_events_notify_attendance();

-- =============================================================================
-- 3. public.tickets — bought, checked in, moved between nights, or deleted
-- =============================================================================
--
-- ── THE `TG_OP` BRANCH IS NOT A STYLE CHOICE ───────────────────────────────
--
-- On `DELETE` the `NEW` record does not exist and referencing it raises; on
-- `INSERT` the `OLD` record does not. `COALESCE(NEW.party_id, OLD.party_id)` is
-- NOT a shorthand for the branch in plpgsql — it is exactly the error the
-- branch exists to avoid, because the missing record is not a null value.
--
-- ── D-38-24: ON UPDATE, THE NIGHT THAT LOST AN ATTENDEE IS TOLD TOO ────────
--
-- Without the second call below, a ticket moved from one night of an event to
-- another notifies only the DESTINATION door. The door that just LOST an
-- attendee hears nothing and falls back to the five-minute parachute — and for
-- those five minutes it reads a person who is no longer expected there as
-- expected. Same hiding shape as the fan-out defect in section 1: every screen
-- looks right while LIVE-01 has quietly become LIVE-04 for one door.
--
-- Three things about the guard, each of which is the reason it is written this
-- way and not another:
--
--   * `IS DISTINCT FROM`, NOT `<>`. `party_id` is nullable on this table, and
--     `<>` answers NULL — neither true nor false — on precisely the transitions
--     that matter: a ticket leaving the event level for a single night, or
--     arriving at it. `IS DISTINCT FROM` treats null as a value and answers.
--   * THE GUARD IS WHAT KEEPS THE HOT PATH AT ONE EMIT. The door's own check-in
--     updates this table on every scan without touching the night or the event,
--     so the comparison is false and exactly one message goes out — the same as
--     it would without the branch. The second emit happens only on a genuine
--     reassignment, which is rare and is the case that is invisible today.
--   * THE OLD BRANCH INHERITS THE FAN-OUT FOR FREE. Passing the OLD pair to the
--     same helper means an old `party_id` of NULL fans out over every night of
--     the OLD event, which is correct: an event-level ticket that becomes a
--     single-night ticket was valid for all of them. It also covers a ticket
--     moved between two EVENTS, since the old event id travels with it.
--
-- The guard lives in the FUNCTION BODY and not on the trigger. Narrowing the
-- trigger to `AFTER UPDATE OF party_id` would stop an update to any other
-- column — `checked_in` above all — from emitting at all, which is the single
-- most frequent real change this whole file exists to carry.

CREATE OR REPLACE FUNCTION public.tickets_notify_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_id uuid;
  v_event_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_party_id := OLD.party_id;
    v_event_id := OLD.event_id;
  ELSE
    v_party_id := NEW.party_id;
    v_event_id := NEW.event_id;
  END IF;

  PERFORM private.notify_attendance_changed(v_party_id, v_event_id);

  IF TG_OP = 'UPDATE'
     AND (OLD.party_id, OLD.event_id) IS DISTINCT FROM (NEW.party_id, NEW.event_id)
  THEN
    PERFORM private.notify_attendance_changed(OLD.party_id, OLD.event_id);
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.tickets_notify_attendance() IS
  'Tells a night that its attendee list changed after a write to public.tickets. Reads party_id and '
  'event_id from OLD on DELETE and from NEW otherwise; on a reassignment it also tells the night '
  'that lost the holder. It writes nothing and returns NULL, so it cannot alter, delay or fail a '
  'purchase, a check-in or a refund.';

DROP TRIGGER IF EXISTS tickets_notify_attendance ON public.tickets;

CREATE TRIGGER tickets_notify_attendance
  AFTER INSERT OR UPDATE OR DELETE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.tickets_notify_attendance();

-- =============================================================================
-- 4. public.guest_list_entries — the unpaid entrance, same four verbs
-- =============================================================================
--
-- `party_id` is nullable here too (`20260310000000_guest_list.sql:46-47`), and
-- the endpoint that composes the door's list queries this table with the same
-- NULL-tolerant predicate it uses for tickets — so an entry with no night is
-- valid for every night of its event and the fan-out applies unchanged.
--
-- The `TG_OP` branch and the old-pair guard are the same as section 3, for the
-- same two reasons: `NEW` does not exist on a delete, and a name moved between
-- two nights leaves one door reading somebody it should no longer expect.

CREATE OR REPLACE FUNCTION public.guest_list_entries_notify_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_id uuid;
  v_event_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_party_id := OLD.party_id;
    v_event_id := OLD.event_id;
  ELSE
    v_party_id := NEW.party_id;
    v_event_id := NEW.event_id;
  END IF;

  PERFORM private.notify_attendance_changed(v_party_id, v_event_id);

  IF TG_OP = 'UPDATE'
     AND (OLD.party_id, OLD.event_id) IS DISTINCT FROM (NEW.party_id, NEW.event_id)
  THEN
    PERFORM private.notify_attendance_changed(OLD.party_id, OLD.event_id);
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.guest_list_entries_notify_attendance() IS
  'Tells a night that its attendee list changed after a write to public.guest_list_entries. Reads '
  'party_id and event_id from OLD on DELETE and from NEW otherwise; on a reassignment it also tells '
  'the night that lost the name. It writes nothing and returns NULL.';

DROP TRIGGER IF EXISTS guest_list_entries_notify_attendance ON public.guest_list_entries;

CREATE TRIGGER guest_list_entries_notify_attendance
  AFTER INSERT OR UPDATE OR DELETE ON public.guest_list_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.guest_list_entries_notify_attendance();

-- =============================================================================
-- 5. public.ticket_refunds — how a night learns a holder is no longer expected
-- =============================================================================
--
-- THE COLUMN NAMES ARE DIFFERENT ON THIS TABLE and getting them wrong is the
-- easy mistake here: the night is `refunded_party_id` and the event is
-- `refunded_event_id` (`20260805120000_door_scan_events.sql:198-201`). There is
-- no `party_id` and no `event_id` on `public.ticket_refunds`.
--
-- BOTH ARE NULLABLE, and when both are null the helper emits nothing at all —
-- which is correct rather than a gap: there is no night to tell.
--
-- The trigger carries INSERT and UPDATE and not DELETE, because a refund row is
-- the durable record of something that happened and is not removed. The old-pair
-- guard is still written, for the same reason as sections 3 and 4: if a refund
-- is ever re-attributed to a different night, the night it left must be told.

CREATE OR REPLACE FUNCTION public.ticket_refunds_notify_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.notify_attendance_changed(NEW.refunded_party_id, NEW.refunded_event_id);

  IF TG_OP = 'UPDATE'
     AND (OLD.refunded_party_id, OLD.refunded_event_id)
         IS DISTINCT FROM (NEW.refunded_party_id, NEW.refunded_event_id)
  THEN
    PERFORM private.notify_attendance_changed(OLD.refunded_party_id, OLD.refunded_event_id);
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.ticket_refunds_notify_attendance() IS
  'Tells a night that its attendee list changed after a write to public.ticket_refunds, reading '
  'refunded_party_id and refunded_event_id - this table has no party_id or event_id column. INSERT '
  'and UPDATE only, so NEW always exists. It writes nothing and returns NULL: a refund path cannot '
  'fail because of it.';

DROP TRIGGER IF EXISTS ticket_refunds_notify_attendance ON public.ticket_refunds;

CREATE TRIGGER ticket_refunds_notify_attendance
  AFTER INSERT OR UPDATE ON public.ticket_refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.ticket_refunds_notify_attendance();

-- =============================================================================
-- 6. realtime_messages_select_door_assigned — who may hear a night
-- =============================================================================
--
-- ── THE NAME, AND WHY IT IS NOT THE ONE RESEARCH PROPOSED ──────────────────
--
-- The policy name follows this repository's convention —
-- `<subject>_<verb>_<question>`, where the subject slot names the OBJECT THE
-- POLICY SITS ON: `door_scan_events_select_admin`,
-- `event_media_quarantine_insert_approved`. This policy sits on
-- `realtime.messages`, hence `realtime_messages_select_door_assigned`.
--
-- Research proposed `door_attendance_broadcast_read` — verb last, question in
-- the middle. It is a perfectly readable name and it is not taken, because two
-- naming forms coexisting is how a greppable convention stops being one. The
-- form has held for every policy written since
-- `20260805120000_door_scan_events.sql`; a single exception is enough to make
-- the next person grep twice, and the time after that, not at all.
--
-- Unquoted identifier and explicit `TO authenticated`, following
-- `20260809004600_event_media_quarantine_bucket.sql:129-143` — the precedent
-- for writing a policy on a schema this project does not own.
--
-- ── ONE ARM, AND WHY IT IS ONE AND NOT THREE ───────────────────────────────
--
-- `door_scan_events_select_admin` takes three arms because the night comes from
-- a COLUMN of the row being filtered. Here the night comes from CLIENT-SUPPLIED
-- TEXT, which inverts the question: the policy is not asking "may you read this
-- row about that night", it is asking "may you listen to the night you just
-- named". No `staff.manage` arm and no `party.manage` arm is added.
--
-- The admitted set is therefore every `master`, every `organizer` (both hold
-- `door.operate` from the role) and any staff account holding a LIVE
-- `door.operate` assignment for THAT night — the resolver's arm 2 tests
-- `revoked_at is null` and `now() < ends_at`. That is exactly the set that may
-- operate that door. LIVE-06.
--
-- And nothing about "assigned to this night" is re-derived here. The question
-- is asked once, where phase 32 put it. A second predicate answering the same
-- question is the failure that phase was built to prevent.
--
-- NO NEW GRANT. `20260809001000_assignment_resolver.sql:368` already grants
-- EXECUTE on `private.has_capability(text, uuid)` to `authenticated` and
-- `anon`; for `anon`, `auth.uid()` is null, both arms find nothing, and the
-- answer is a correct `false`.
--
-- ── THREE THINGS IN THE EXPRESSION THAT ARE DEFECTS IF "SIMPLIFIED" ────────
--
--   * `CASE`, NOT `AND`. The topic is untrusted text — whatever the client
--     typed into `supabase.channel(...)`. PostgreSQL does NOT define the
--     evaluation order of subexpressions and names `CASE` as the construct to
--     force it. Casting `banana` to uuid raises `22P02`, and an error inside a
--     policy is a REFUSED CONNECTION, not a `false`. An `AND` form would work
--     in testing and refuse a door on the night somebody typed a topic wrong.
--   * THE REGEX IS CASE-SENSITIVE `[0-9a-f]`, DELIBERATELY. Postgres renders
--     `uuid::text` lowercase, so the trigger always sends lowercase and the
--     client lowercases too. A case mismatch is then refused LOUDLY at join
--     time, which sets the door's `channelLive` to false and shows the band —
--     instead of joining cleanly and delivering nothing, which no check catches.
--   * THE `(SELECT …)` WRAPPER ON THE CAPABILITY CALL. It is what makes
--     Postgres evaluate the call once per statement as an `InitPlan`, and it is
--     NOT `STABLE` that produces that. The reasoning is written at
--     `20260809004000_door_scan_events_by_assignment.sql:125-131` and proved
--     there with `EXPLAIN`. Here the call is uncorrelated — the night comes
--     from the topic, not from the row — so the wrapper buys what it promises.
--
-- One layout note, because it is load-bearing for this phase's own checks: the
-- second `WHEN` is broken before its parenthesis on purpose, so that the
-- structural check "no trigger carries a `WHEN (` clause" stays readable
-- against the finished file instead of only against a snapshot of it.

DROP POLICY IF EXISTS realtime_messages_select_door_assigned ON realtime.messages;

CREATE POLICY realtime_messages_select_door_assigned
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    CASE
      -- Broadcast only. Presence is disabled on this project and nothing here
      -- starts admitting it by omission.
      WHEN realtime.messages.extension <> 'broadcast' THEN false

      WHEN
        (SELECT realtime.topic()) ~
        '^door:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN
        (SELECT private.has_capability('door.operate',
                  substring((SELECT realtime.topic()) FROM 6)::uuid))

      ELSE false
    END
  );

-- =============================================================================
-- 7. The policies this file does NOT create, and the omission IS the design
-- =============================================================================
--
-- There is no INSERT policy, no UPDATE policy and no DELETE policy on
-- `realtime.messages`, for anybody, and the gap is the boundary rather than a
-- piece of unfinished work.
--
-- THE FIGURE THAT MAKES IT LOAD-BEARING, measured on this project on
-- 2026-08-11 and recorded by plan 38-01 under `messages_acl_expanded`: `anon`
-- and `authenticated` each hold `arw` on `realtime.messages` — that is
-- table-level INSERT, SELECT and UPDATE. The grant is already there. With RLS
-- enabled and no INSERT policy, every insert from a client session is refused
-- and THE DATABASE IS THE ONLY SENDER. Add an INSERT policy of any shape and a
-- signed-in member can broadcast on a door's topic — an arbitrary "the list
-- changed" at an arbitrary moment, from an ordinary account.
--
-- (The reason the grant is visible at all is worth one line: the plan's first
-- probe read `information_schema.role_table_grants` and came back EMPTY, which
-- means "you may not see them" and not "there are none". The figure above comes
-- from `pg_class.relacl` via `aclexplode`, which is unfiltered.)
--
-- Two other tables in this repository omit their write policies on purpose, and
-- naming them is the point of this paragraph — so the next reader recognises a
-- pattern instead of repairing a gap:
-- `20260805120000_door_scan_events.sql:158-163` and
-- `20260808002000_membership_register.sql:345-349`.
--
-- The emit path is unaffected by the omission, and section 1 explains why: the
-- four wrappers are `SECURITY DEFINER` owned by the migration role, which
-- carries `rolbypassrls`. RLS refuses the client and does not refuse the
-- trigger. That is the whole design in one sentence.

COMMIT;
