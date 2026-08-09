-- Door scan events, refund evidence, per-party presence, guest-list check-in
-- Phase 31, Plan 04: the schema foundation for the live door defects
--
-- Changes:
-- 1. Create public.door_scan_events (append-only) with its indexes and RLS,
--    in this same file
-- 2. ticket_refunds: ticket_id becomes nullable and ON DELETE SET NULL, plus
--    four non-FK evidence columns that survive the ticket they name (Option B)
-- 3. attendances: add party_id and split the unique key into two partial
--    unique indexes, so one member can be present at two parties of one event
-- 4. guest_list_entries: add checked_in_at / checked_in_by, and give ticket_id
--    an explicit ON DELETE SET NULL
--
-- Four tables, one transaction. A half-applied version of this file is worse
-- than none of it, so BEGIN; ... COMMIT; is not decoration.

BEGIN;

-- =============================================================================
-- 1. public.door_scan_events — the night's record
-- =============================================================================
--
-- FIX-13 — the subject of a row here is a ticket, an entry or a membership,
-- never a person: because the row's identity is an identifier of a thing that
-- was scanned, no code path reading this table can drift into writing a label
-- against a member.
--
-- FIX-12 — there is deliberately no column holding a full name and none holding
-- an address for contacting anyone. The copyable technical view renders these
-- columns straight, so it cannot export a member's personal data by
-- construction. That is a serialisation rule enforced in the schema, not a
-- second RLS policy: an organizer can already read every profile through
-- profiles_select_admin (20260224_rbac_migration.sql:151), so a master-only
-- policy here would be an interface affordance dressed up as a boundary.
--
-- FIX-04a — `cause` is NULL on every row the scanner produces. Classification
-- happens afterwards, over these rows, so a classification rule can be
-- corrected after a night without redeploying anything to a phone held by a
-- member of staff in front of a queue.
--
-- ON DELETE SET NULL, not CASCADE — a scan event must outlive its ticket. That
-- is the lesson of the ticket_refunds cascade this same migration repairs
-- (section 2): a cascade destroyed the audit row written one statement earlier,
-- confirmed against a throwaway PostgreSQL 16.14 container on 2026-08-05
-- (.planning/phases/31-live-defects-at-the-door-and-the-bar/31-REFUND-PROBE.md).
--
-- is_undo — the reversal of an admission is recorded here as a further event,
-- written by src/app/api/tickets/checkin/undo/route.ts, which today sets
-- attendances.checked_in_by = NULL and so erases who admitted the person
-- without recording who reversed it. **Who may** undo is Phase 35's question
-- (ASSIGN-05); **who did** belongs here, because the review list is unreadable
-- without it.
--
-- The subject_type / outcome / cause / source CHECK sets below are mirrored
-- literally from src/lib/door/outcome.ts (DoorSubjectType:56,
-- DoorScanOutcomeKind:116, DoorScanCause:127-135, DoorScanSource:138). They
-- were written once there and copied here. Editing either side means editing
-- both, in the same commit.

CREATE TABLE IF NOT EXISTS public.door_scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which night. A double bill is one event with two parties, so the party is
  -- the unit of the review list, not the event.
  party_id uuid NOT NULL REFERENCES public.event_parties ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,

  -- What was scanned — mirrors DoorSubjectType.
  subject_type text NOT NULL
    CHECK (subject_type IN ('ticket', 'guest_list_entry', 'membership')),

  -- The three subject links. All three are SET NULL on delete: see the note
  -- above. A row whose ticket_id has gone to NULL still says that a scan
  -- happened, by whom, on which device, at which moment.
  ticket_id uuid REFERENCES public.tickets ON DELETE SET NULL,
  guest_entry_id uuid REFERENCES public.guest_list_entries ON DELETE SET NULL,

  -- The holder of the subject, as an identifier only. Used by classification to
  -- tell second_ticket_same_holder from double_read. It is never a label and is
  -- never rendered by the technical view.
  subject_user_id uuid REFERENCES auth.users ON DELETE SET NULL,

  -- What the door decided — mirrors DoorScanOutcomeKind.
  outcome text NOT NULL
    CHECK (outcome IN ('recorded', 'already_recorded', 'not_valid')),

  -- Why, decided afterwards — mirrors DoorScanCause. NULL means unclassified,
  -- which is what every scanner-written row carries (FIX-04a).
  cause text
    CHECK (cause IN (
      'double_read',
      'second_ticket_same_holder',
      'two_devices',
      'invalid_signature',
      'not_in_cache',
      'wrong_night',
      'refunded_before_night',
      'refunded_after_night'
    )),

  -- When the phone read the code, and when the server durably held it. On the
  -- offline path these are minutes or hours apart, and the interval between two
  -- scanned_at values is what tells a double read from two devices.
  scanned_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),

  -- Who was holding the phone, and which phone it was.
  operator_id uuid NOT NULL REFERENCES auth.users,
  device_id text NOT NULL,

  -- Which path produced the row — mirrors DoorScanSource.
  source text NOT NULL
    CHECK (source IN ('online', 'offline_sync')),

  -- A non-reversible digest of the scanned token, never the token itself.
  token_fingerprint text,

  -- A reversal is a further event, not an erasure. See the is_undo note above.
  is_undo boolean NOT NULL DEFAULT false
);

-- The review list is read per night, most recent first.
CREATE INDEX IF NOT EXISTS idx_door_scan_events_party
  ON public.door_scan_events (party_id, recorded_at);

-- The door looks a subject up by ticket on a conflict; at the door a slow query
-- is a queue.
CREATE INDEX IF NOT EXISTS idx_door_scan_events_ticket
  ON public.door_scan_events (ticket_id)
  WHERE ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_door_scan_events_event
  ON public.door_scan_events (event_id, recorded_at);

-- Reversals are rare and are read on their own.
CREATE INDEX IF NOT EXISTS idx_door_scan_events_undo
  ON public.door_scan_events (party_id, recorded_at)
  WHERE is_undo;

-- -----------------------------------------------------------------------------
-- 1b. RLS for door_scan_events, in this same file
-- -----------------------------------------------------------------------------
-- Without this, anyone holding the anonymous key reads the whole night through
-- PostgREST. The middleware decides where somebody may go; this decides what
-- they may read, and only this is the security boundary.

ALTER TABLE public.door_scan_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS door_scan_events_select_admin ON public.door_scan_events;

-- SUPERSEDED TWICE, not current: 20260807010000 moved it to a capability, then
-- 20260809004000_door_scan_events_by_assignment.sql narrowed it BY ASSIGNMENT.
-- The parentheses around the helper call are load-bearing — a bare call is
-- re-evaluated per row (20260224_rbac_migration.sql:127-135).
CREATE POLICY door_scan_events_select_admin ON public.door_scan_events
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

-- No INSERT, UPDATE or DELETE policy, and the omission is deliberate. Writes
-- come only from the service client in the check-in route, which bypasses RLS,
-- so the table is append-only by construction: with RLS enabled and no write
-- policy, no authenticated session can add, edit or remove a row. No other
-- table in this repository omits its write policies on purpose, so without this
-- paragraph the next reader would take it for a bug and repair it.

-- =============================================================================
-- 2. public.ticket_refunds — the evidence outlives the ticket (Option B)
-- =============================================================================
-- Owner decision: keep deleting the ticket, persist the refund's evidence.
-- Option A (soft-invalidating tickets, 63 call sites across 22 files) is
-- recorded as deferred and is not to be drifted into partially.
--
-- Order matters below, and it is not a style choice: a foreign-key action
-- cannot write NULL into a NOT NULL column, so ticket_id must lose NOT NULL
-- **before** its foreign key becomes ON DELETE SET NULL. The reverse order
-- leaves a constraint that raises on every refund.

-- This looks like a weakening and is the opposite: NOT NULL here is what let
-- the cascade take the whole row away instead of only the link.
ALTER TABLE public.ticket_refunds ALTER COLUMN ticket_id DROP NOT NULL;

ALTER TABLE public.ticket_refunds
  DROP CONSTRAINT IF EXISTS ticket_refunds_ticket_id_fkey;

ALTER TABLE public.ticket_refunds
  ADD CONSTRAINT ticket_refunds_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;

-- The four evidence columns. **None of these is a foreign key**, which inverts
-- this repository's default and is the owner's decision: the entire point of
-- refunded_ticket_id is to survive the row it names, and a foreign key —
-- whatever its ON DELETE — would either take the value away or block the
-- delete. They are written by the refund path *before* the delete, because
-- after it the values are unreadable.
ALTER TABLE public.ticket_refunds
  ADD COLUMN IF NOT EXISTS refunded_ticket_id uuid;

ALTER TABLE public.ticket_refunds
  ADD COLUMN IF NOT EXISTS refunded_party_id uuid;

ALTER TABLE public.ticket_refunds
  ADD COLUMN IF NOT EXISTS refunded_event_id uuid;

ALTER TABLE public.ticket_refunds
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- The door reads this column on every not-found, to tell a refunded holder from
-- an unknown code. At the door a slow query is a queue.
CREATE INDEX IF NOT EXISTS idx_ticket_refunds_refunded_ticket
  ON public.ticket_refunds (refunded_ticket_id)
  WHERE refunded_ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_refunds_refunded_party
  ON public.ticket_refunds (refunded_party_id, refunded_at);

-- Existing rows: there is no backfill and there cannot be one. The tickets
-- those rows named were already destroyed by the cascade this section repairs,
-- and ticket_refunds was the only record of them. On a row written before this
-- migration, `refunded_ticket_id IS NULL` therefore means **unknown**, not
-- **none** — no reader should infer otherwise, and no report should count those
-- rows as refunds against no ticket.

-- =============================================================================
-- 3. public.attendances — a presence belongs to a party, not only to an event
-- =============================================================================
-- A double bill is one event with two parties (owner decision), and
-- attendances is unique(event_id, user_id) — so the same member checking in at
-- the second party collides with the first, server-side, every time, and reads
-- as a conflict at the door. FIX-07 cannot be met without this column.

-- Nullable on purpose: an event-level presence is a real thing in this product,
-- exactly as an event-level ticket is (20260226300000_multi_sub_events.sql:65-67).
ALTER TABLE public.attendances
  ADD COLUMN IF NOT EXISTS party_id uuid REFERENCES public.event_parties ON DELETE CASCADE;

-- Existing rows keep party_id NULL and therefore mean *event-level*. That is
-- correct and is not a migration artefact: every attendance written before this
-- migration was recorded against an event, because there was nothing else to
-- record it against. They fall under the second partial index below, which
-- reproduces exactly the constraint they were written under.
ALTER TABLE public.attendances
  DROP CONSTRAINT IF EXISTS attendances_event_id_user_id_key;

-- Two partial unique indexes, not one three-column unique key: Postgres treats
-- NULLs as distinct, so unique(event_id, party_id, user_id) would silently
-- allow unlimited duplicates on the event-level rows. Same pattern as
-- 20260226300000_multi_sub_events.sql:54-67.
CREATE UNIQUE INDEX IF NOT EXISTS attendances_party_user_unique
  ON public.attendances (party_id, user_id)
  WHERE party_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS attendances_event_user_unique
  ON public.attendances (event_id, user_id)
  WHERE party_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_attendances_party
  ON public.attendances (party_id);

-- The consumer of the constraint just dropped is
-- src/app/api/membership/verify/route.ts:124-141, whose 23505 branch re-fetches
-- the existing row by (event_id, user_id) alone. Plan 31-08 must give that
-- lookup the same party_id predicate, or on a double bill it fetches the wrong
-- row and tells the door a member was already admitted at the other party. The
-- file is named here so the link is not lost.

-- The existing attendances_select_own and attendances_all_admin policies
-- (schema.sql:243-248) are deliberately untouched.

-- =============================================================================
-- 4. public.guest_list_entries — who recorded it, and when
-- =============================================================================
-- The entry carries `status` only, which is why
-- src/app/api/tickets/attendance/route.ts:129 hard-codes checkedInAt: null. The
-- third outcome promises a fact; a blank where a fact is promised is worse than
-- the weaker sentence.

ALTER TABLE public.guest_list_entries
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

ALTER TABLE public.guest_list_entries
  ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES auth.users;

-- Existing rows keep both NULL, including rows already at status 'checked_in':
-- the moment and the operator were never recorded, so NULL here means
-- **not recorded**, never *not checked in*. Read the status for that.

-- 31-REFUND-PROBE.md, Consequences row 2, settled 2026-08-05: **REQUIRED**.
-- Probe B deleted a ticket that a guest-list entry pointed at and Postgres
-- raised SQLSTATE 23503 — pg_constraint reported confdeltype = 'a' (NO ACTION)
-- for guest_list_entries_ticket_id_fkey — and the ticket survived. Without the
-- explicit SET NULL, every refund of a guest-list ticket fails at the delete,
-- and since none of the four refund writers inspects that delete's error the
-- refund is marked approved while the ticket still admits its holder at the
-- door. Plan 31-09 adds the error check; this is what makes the refund
-- completable at all. Both, not either.
ALTER TABLE public.guest_list_entries
  DROP CONSTRAINT IF EXISTS guest_list_entries_ticket_id_fkey;

ALTER TABLE public.guest_list_entries
  ADD CONSTRAINT guest_list_entries_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;

-- 7b. pending_purchases.ticket_id — the third foreign key to tickets, and the
--     one nobody had looked at.
--
-- Found on 2026-08-06 by reading the live database rather than the repository:
-- `pg_constraint` reported THREE foreign keys pointing at `public.tickets`, not
-- two. The refund probe ran against a throwaway database built from the
-- repository's DDL, where `pending_purchases` does not appear at all, so it
-- could not have surfaced there.
--
-- `pending_purchases` is the **SumUp payment record** — every ticket payment this
-- project receives passes through it, and `src/app/api/webhooks/sumup/route.ts:81`
-- writes `ticket_id` onto the row when it marks the purchase completed. The live
-- table already holds a row with a populated `ticket_id`, so this is a reachable
-- state and not a theoretical one.
--
-- Left as `NO ACTION` it reproduces Probe B exactly, on a different table:
-- deleting a refunded ticket raises SQLSTATE 23503, the ticket survives, and the
-- refund cannot complete. Plan 31-09's error check would make that loud rather
-- than silent — but loud and unfinishable is still unfinishable.
--
-- `SET NULL` and not `CASCADE`, deliberately and for the same reason as
-- `ticket_refunds`: this is money that was actually taken. The payment record
-- outlives the ticket it produced, carrying a null link — it is never destroyed
-- by the refund of the thing it paid for. `meta-gates.md`, monotone guard on a
-- payment's state: reconciliation corrects forward, it never pretends an amount
-- was not taken.
ALTER TABLE public.pending_purchases
  DROP CONSTRAINT IF EXISTS pending_purchases_ticket_id_fkey;

ALTER TABLE public.pending_purchases
  ADD CONSTRAINT pending_purchases_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;

COMMIT;
