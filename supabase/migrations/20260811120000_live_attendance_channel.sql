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

COMMIT;
