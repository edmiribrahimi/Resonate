-- The manual venue reveal — the key that authorises it, the fact that records
-- it, the trace that attributes it, and the one writer that may perform any of
-- the three acts
-- Phase 37, Plan 01: VENUE-02, with D-37-13 … D-37-22 written beside the lines
-- that implement them
--
-- Changes:
-- 1. private.capabilities / private.role_capabilities — a THIRTEENTH capability,
--    `venue.reveal`, granted to `master` and `organizer`, both with
--    `requires_approved = true` (D-37-14)
-- 2. public.event_parties.venue_revealed_at — nullable, no DEFAULT: WHEN the
--    address was let out BY HAND, which is not the same fact as
--    `venue_reveal_email_sent`
-- 3. public.venue_reveal_acts — the trace: append-only, one row per human act,
--    with its author BY NAME (D-37-18) and how many people it meant to reach
-- 4. RLS on that table: enabled, one SELECT policy, and DELIBERATELY no write
--    policy
-- 5. public.record_venue_reveal_act(...) — the SECURITY DEFINER writer that
--    performs the `event_parties` write and the trace insert in ONE transaction,
--    and is executable by `service_role` alone
--
-- Five changes, ONE transaction. A half-applied version of this file is strictly
-- worse than none of it, and each half is bad in its own way:
--
--   * the capability without the rest is a thirteenth key that
--     `scripts/verify-capabilities.mjs` and `src/lib/capabilities/keys.ts` both
--     hold, all three agreeing about a permission over nothing;
--   * the column without the writer is a fact nothing can set, so the page
--     predicate D-37-19 depends on is permanently NULL and the button never
--     turns off — on an act that cannot be undone;
--   * the trace without the writer is a register with no writer, and since the
--     table has no write policy at all it would be permanently empty — which
--     reads, to anybody who opens it, as *no address has ever been let out*;
--   * the writer without the trace raises `42P01` at the moment somebody presses
--     the button, which is the worst possible moment for this particular button:
--     the operator learns the act failed and has no way to learn whether the
--     mail left;
--   * the trace without its RLS is the whole register readable by anyone holding
--     the anonymous key, which is a list of which nights are no longer secret;
--   * the writer without its REVOKE is a `SECURITY DEFINER` writer of
--     `public.event_parties.venue_revealed_at` reachable by any authenticated
--     session, which is a path to publishing an address and not a partial
--     feature.
--
-- So `BEGIN; ... COMMIT;` is not decoration here either.
--
-- WHY A `SECURITY DEFINER` WRITER AT ALL, since the obvious thing is a
-- PostgREST `.update()` from the organizer's own session. It does not work, and
-- the reason is a policy that already exists: `event_parties_update_own`
-- (`20260807020000_wrap_auth_uid.sql:145-155`) requires `staff.manage` AND
-- (master OR owner of the parent event). D-37-13 wants precisely the organizer
-- who did NOT create the night — the person who created it can be unreachable on
-- exactly the Friday the button exists for. The early symptom of getting this
-- wrong is *"it works in development"*, where whoever is testing is almost
-- always the owner.
--
-- AND WHY ONE FUNCTION AND NOT TWO CALLS. Two PostgREST calls cannot be atomic,
-- so a reveal that succeeded while its trace failed is representable — and it is
-- the ONE outcome D-37-17 exists to forbid. It would also be invisible: this
-- product has no error tracking (`meta-gates.md`), so nothing would report the
-- divergence and the night would show an address let out by nobody.
--
-- ── IDEMPOTENZA, voce per voce ──────────────────────────────────────────────
--
--   * `ON CONFLICT … DO NOTHING` on both seed inserts;
--   * `ADD COLUMN IF NOT EXISTS` for the column, and it carries no `DEFAULT`, so
--     a second run cannot rewrite an existing value;
--   * `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`;
--   * `DROP POLICY IF EXISTS` before the policy;
--   * `CREATE OR REPLACE` for the function — the idempotent form for an object
--     that cannot take `IF NOT EXISTS`;
--   * `COMMENT ON COLUMN` and `COMMENT ON FUNCTION` are replacements by
--     construction;
--   * `REVOKE` and `GRANT` are idempotent by nature.
--
-- Ri-eseguire deve essere sicuro, o nessuno ri-esegue quando dovrebbe.

BEGIN;

-- =============================================================================
-- 1. `venue.reveal` — the thirteenth capability, and why it is a NEW key
-- =============================================================================
--
-- Named by the QUESTION it answers — *may this subject make this night's address
-- public, now?* — and not by the predicate it happens to resolve to, which is
-- the rule `src/lib/capabilities/keys.ts:38-45` states.
--
-- ── D-37-14: why a thirteenth key and not one of the twelve ──────────────────
--
-- `staff.manage` IGNORES STATUS ON PURPOSE. Its two grants carry
-- `requires_approved = false` (`20260807000000_capability_model.sql:390-393`)
-- for the door's reason: an organizer whose own access is still pending must not
-- be refused in front of a queue at two in the morning, because that error
-- happens in front of people. **That reason does not exist here.** Nobody is
-- standing in a queue while an address is published, and the error in this
-- direction is not recoverable at all. The obvious repair — flipping that flag —
-- is the one thing this phase must not do: the same `false` is what keeps
-- `door.operate` open, and `20260807000000_capability_model.sql:415` says of the
-- two door rows *"These two rows must not become true."*
--
-- `catalogue.manage` was the other candidate: it already has the right SHAPE
-- (`requires_approved = true` on both grants). It is refused for the naming rule
-- above — *may this subject create an artist or a venue* is not *may this
-- subject make an address public* — and reusing it would make the two impossible
-- to separate later, on the day somebody wants a catalogue editor who may not
-- publish.
--
-- `party.manage` is refused by D-37-15, and this one is the subtle refusal.
-- It governs the work OF THE NIGHT — that night's review, its door register, its
-- guest list — and it arrives from a per-night assignment that expires with the
-- night. The reveal happens BEFORE the night and does not expire, because it
-- cannot be undone. A power that ends at 06:00 is the wrong container for an act
-- whose effect does not.
--
-- ── Who is refused, and each refusal is a decision ───────────────────────────
--
--   `staff`   — refused. D-03: work permissions are not granted by the role.
--               Publishing an address is not a night's work, and it would not
--               expire with the night.
--   `member`  — refused. Nothing grants it.
--   `anon`    — refused. `private.has_capability` answers false for a null
--               `auth.uid()` by construction
--               (`20260807000000_capability_model.sql:55-57`).
--
-- WHERE THOSE TWO REFUSALS ARE ASSERTED rather than merely written here:
-- `scripts/verify-capabilities.mjs`, side 5. Its `ROLE_GRANTS` declares every
-- (role × capability) pair — 52 after this file, 28 grants and 24 refusals — and
-- exits 1 naming the pair both when a declared refusal acquires a row and when a
-- declared grant loses one. A comment can be ignored; that check cannot.

INSERT INTO private.capabilities (key, description) VALUES
  (
    'venue.reveal',
    'Reveal a night''s secret venue by hand, before the automatic window, and send the address to everyone entitled to it. Requires an APPROVED staff role on both grants (D-37-14) because the act is irreversible — staff.manage ignores status ON PURPOSE, so a pending organizer is not refused in front of a queue, and that reason does not exist here.'
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  -- The master already holds every surface this act is performed from. The row
  -- exists so the key is not silently master-by-absence: a capability nobody is
  -- granted resolves false for everyone, including the master.
  ('master',    'venue.reveal', true),

  -- D-37-13: EVERY approved organizer, not only the one who created the night.
  -- The creator can be unreachable on exactly the evening the button exists for,
  -- and a reveal that waits for one person is a reveal that happens late — or
  -- through a channel that leaves no trace at all, which is worse.
  ('organizer', 'venue.reveal', true)
ON CONFLICT (role, capability) DO NOTHING;

-- =============================================================================
-- 2. `event_parties.venue_revealed_at` — the fact, and the fact it is NOT
-- =============================================================================
--
-- Nullable and WITHOUT a `DEFAULT`, on a populated table
-- (`supabase-data.md`, gate *default sulle righe esistenti*). The precedent for
-- the shape is `20260226500000_venue_secret_hint_reveal_hours.sql`, which added
-- two columns to this same table the same way.

ALTER TABLE public.event_parties
  ADD COLUMN IF NOT EXISTS venue_revealed_at timestamptz;

COMMENT ON COLUMN public.event_parties.venue_revealed_at IS
  'WHEN this night''s address was let out BY HAND, or NULL if it never was. '
  'NULL is the right value for every row that existed before this column: none of them was revealed by hand, because there was no way to do it. '
  'THIS IS NOT `venue_reveal_email_sent` UNDER A NEW NAME. They are two different facts — *the act happened* and *the mails left* — and this phase exists because they can diverge: a manual reveal that reached 20 of 50 people has happened and has not finished (D-37-12). '
  'AND IT IS WHY THE PAGE PREDICATE CANNOT BE `venue_reveal_email_sent`: the cron raises that flag even when there is NO recipient at all (`src/app/api/cron/venue-reveal/route.ts:107-114`, the `emailMap.size === 0` branch), so a night the cron merely swept would open its address to everyone. '
  'Written only by `public.record_venue_reveal_act`. Set to NULL again only by that function''s `re_hidden` branch, which is master-only (D-37-22) and does not erase the trace.';

-- =============================================================================
-- 3. public.venue_reveal_acts — the trace
-- =============================================================================
--
-- D-37-17: the trace lives on the NIGHT, in the work surface, not in a separate
-- register — it is also where the second press finds its answer (D-37-19), and
-- the two serve each other.
--
-- A TABLE OF ITS OWN, and not two more rows in `public.membership_acts`. That
-- register records changes to an account's ROLE AND STATUS — who somebody IS —
-- and it speaks in `membership_code` because it can reach an artefact. This one
-- records an act performed on a NIGHT, names its author in full, and counts
-- recipients. Two registers holding overlapping truths is worse than either of
-- them; two registers holding DIFFERENT truths under one schema is worse still,
-- because the naming rule of the first would have to be broken to fit the
-- second. Recorded here or the next reader merges them.

CREATE TABLE IF NOT EXISTS public.venue_reveal_acts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHICH NIGHT. `ON DELETE SET NULL`, and it is DELIBERATELY NOT `CASCADE`.
  -- Sixteen constraints already point at `public.event_parties` with `CASCADE`;
  -- this trace does not become the seventeenth. Deleting a night must not delete
  -- the proof that its address was made public — that proof is most valuable
  -- exactly where the row it names has gone.
  party_id uuid REFERENCES public.event_parties ON DELETE SET NULL,

  -- ...and which night it WAS, denormalised, so a row whose `party_id` has gone
  -- to NULL still says what it was about. Same reasoning as
  -- `membership_acts.subject_label` (`20260808002000:190-203`) and
  -- `ticket_refunds.refunded_ticket_id` (`20260805120000:188-193`).
  --
  -- **THE EVENT'S TITLE AND THE NIGHT'S DATE. NEVER THE VENUE'S NAME AND NEVER
  -- THE ADDRESS.** The whole subject of this table is an address becoming
  -- public; writing that address into the record of the act would mean the act
  -- is logged together with the thing it released, in a row that outlives the
  -- night and can reach a screenshot. Section 5's function composes this value
  -- itself, from `events.title` and `event_parties.date` and nothing else, so
  -- the rule is enforced by the only writer rather than by the caller
  -- remembering it.
  party_label text NOT NULL,

  -- WHAT WAS DONE. THREE human acts and not two.
  --
  --   `revealed`  — the address was let out for the first time. This is the act
  --                 that sets `venue_revealed_at`.
  --   `completed` — D-37-20's *send it to the N who are missing*. It sets
  --                 nothing on the night, and it is recorded ANYWAY: it mails
  --                 the address to N more people, so it is exactly as
  --                 attributable as the first act. A model with only two acts
  --                 would make the second, third and fourth send invisible while
  --                 each of them is a publication.
  --   `re_hidden` — D-37-22, master only. The page goes back to secret; the
  --                 mails do not come back.
  act text NOT NULL CHECK (act IN ('revealed', 'completed', 're_hidden')),

  -- WHO DID IT. SET NULL: an author who later leaves the project does not
  -- un-perform their acts.
  actor_id uuid REFERENCES auth.users ON DELETE SET NULL,

  -- ── D-37-18 — THE DIVERGENCE FROM `membership_acts`, MADE DELIBERATELY ─────
  --
  -- `membership_acts.subject_label` is a `membership_code`, **never a full
  -- name**, and its migration says so in capitals (`20260808002000:195-202`).
  -- This column is the opposite, and the opposite is right here for a reason of
  -- MEANING and not of convenience: there the subject is a person being JUDGED,
  -- and a public repository is one paste away from publishing who was rejected.
  -- Here the subject is a person who ACTED, on a staff surface, and
  -- accountability is the entire point of the act. A trace that says
  -- *revealed by ORG-0042* answers nobody's question at 19:00 on a Friday.
  --
  -- **THE DIVERGENCE IS AUTHORISED IN THE DATABASE AND STOPS THERE.** That name
  -- does not enter a PLAN, a SUMMARY, a VERIFICATION or any other artefact under
  -- `.planning/`, which is tracked and public (`CLAUDE.md` Guardrail 5,
  -- `ai-engineering.md`, gate *la pianificazione e' pubblica*). Artefacts name
  -- ROLES.
  actor_name text NOT NULL CHECK (length(btrim(actor_name)) > 0),

  -- HOW MANY PEOPLE THIS ACT MEANT TO REACH — the number D-37-16 puts in the
  -- confirmation and D-37-12 reports back afterwards. It is a count of
  -- RECIPIENTS after de-duplication by email, never a count of tickets plus
  -- rsvps, which double-counts anybody holding both.
  recipients_intended integer NOT NULL,

  -- WHEN. The SERVER clock, always.
  at timestamptz NOT NULL DEFAULT now()

  -- ── AND ONE COLUMN THAT IS DELIBERATELY ABSENT: `actor_kind` ───────────────
  --
  -- `membership_acts` carries `actor_kind IN ('user','system')` with a CHECK
  -- pairing it to `actor_id`, because a reconciliation can demote an account
  -- with no human author (`20260808002000:209-231`). Nothing of the sort exists
  -- here: **every row in this table is a human act.** The scheduled path — the
  -- `venue-reveal` cron — writes NO row at all, and THE ABSENCE OF A ROW IS THE
  -- DISTINCTION. Adding a `'system'` kind would invite the cron to start writing
  -- rows, and the day it did, *"who revealed this?"* would answer *the system*
  -- for a night nobody decided to reveal.
);

-- One index, named for the only read this table actually has: the acts of THIS
-- night, most recent first — which is what the work surface renders under the
-- button (D-37-17). `at DESC` because an index whose order does not match the
-- query's is an index the planner steps around.
CREATE INDEX IF NOT EXISTS idx_venue_reveal_acts_party
  ON public.venue_reveal_acts (party_id, at DESC);

-- =============================================================================
-- 4. RLS — and the omission that is not an omission
-- =============================================================================
--
-- Without this, anyone holding the anonymous key reads the whole trace through
-- PostgREST. The middleware decides where somebody may GO; this decides what
-- they may READ, and only this is the security boundary (`CLAUDE.md`, operating
-- principle 2).

ALTER TABLE public.venue_reveal_acts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS venue_reveal_acts_select_staff ON public.venue_reveal_acts;

-- `staff.manage` and NOT a new read key — D-37-18: whoever already sees that
-- night at work sees its trace too. A second key here would produce a surface
-- where the button is visible and the answer to *who pressed it* is not, which
-- is the shape D-37-19 exists to refuse.
--
-- The `(select …)` wrapper is LOAD-BEARING and it is not `STABLE` that produces
-- it: it makes Postgres evaluate the call once per statement as an InitPlan
-- instead of once per row, proved by `EXPLAIN` on this database and written up
-- at `20260807000000_capability_model.sql:177-184`.
CREATE POLICY venue_reveal_acts_select_staff ON public.venue_reveal_acts
  FOR SELECT USING ((SELECT private.has_capability('staff.manage')));

-- No INSERT, UPDATE or DELETE policy, and the omission is DELIBERATE. Writes
-- come only through `public.record_venue_reveal_act`, which runs as its
-- definer and is executable by `service_role` alone; so with RLS enabled and no
-- write policy, no session — authenticated, anonymous, or a master's — can add,
-- edit or remove a row. That is what "append-only by construction" means here:
-- it is not a convention the writers observe, it is the absence of any granted
-- path to a write.
--
-- **AND IT IS THE CONSTRAINT THAT MAKES D-37-22 HONEST.** Re-hiding a venue
-- returns the page to secret; it does not return the mails. The night therefore
-- goes on saying *revealed on … by …* after it has gone back to secret, and it
-- says so because nobody — including the master who re-hid it — has a path to
-- remove the row. Without this paragraph the gap reads as a bug, and the repair
-- would be one `CREATE POLICY` away from letting the roles whose acts this table
-- records edit it. Two other tables in this repository omit their write policies
-- on purpose, for the same reason: `20260805120000_door_scan_events.sql:158-163`
-- and `20260808002000_membership_register.sql:337-349`.

-- =============================================================================
-- 5. public.record_venue_reveal_act — the write and its trace, one transaction
-- =============================================================================
--
-- ── WHY ONE FUNCTION AND NOT THREE ──────────────────────────────────────────
--
-- It covers revealing, completing and re-hiding. Three functions of the same
-- shape diverge: the day somebody adds a check, a lock or a refusal rule, they
-- add it to the one they were looking at. The `p_act` argument is what keeps the
-- three branches in one file, under one grant, under one comment.
--
-- ── WHY THE ACTOR IS AN ARGUMENT AND NOT `auth.uid()` ───────────────────────
--
-- Every path that reaches this function goes through the SERVICE client, under
-- which `auth.uid()` is **null** (measured, `32-06-SUMMARY.md` § F1, quoted at
-- `src/lib/capabilities/server.ts:26-29`). A trigger or an internal
-- `auth.uid()` would record NOBODY, on every act, which is precisely the
-- unattributed act D-37-18 forbids. The actor is resolved server-side by the
-- caller and passed in — and the caller cannot lie about the one thing that
-- matters, because the ROLE is read here (see the `re_hidden` branch) and never
-- accepted as an argument.
--
-- ── WHY THE REFUSALS ARE RETURNED VALUES AND NOT EXCEPTIONS ─────────────────
--
-- This is the divergence from `record_party_assignment_act`, and it is not
-- style. On a constraint violation PostgREST returns the ENTIRE failing row in
-- `error.details` (`20260808001000_role_implies_approved.sql:194-201`). The
-- failing row here is a row of `public.event_parties`, which carries
-- `venue_text`, `venue_id`, `venue_secret_hint` and every reveal parameter. A
-- refusal that hands back the address is a self-inflicted disclosure by the very
-- function written to control the address, and it is one careless
-- `console.error(error)` away from a log. So the guards below are `RETURN`s, and
-- there is no `error` object for anybody to log by mistake.
--
-- ── WHAT IS DELIBERATELY NOT READ HERE ──────────────────────────────────────
--
-- `venue_text`, `venue_id`, `venue_secret_hint` and the actor's email. Any of
-- them would be one interpolation away from a `RAISE EXCEPTION`, and a raised
-- message reaches a log and a log reaches a screenshot on a PUBLIC repository.
-- The two messages below name an IDENTIFIER and nothing else.
--
-- ── WHAT NO BRANCH TOUCHES: `venue_reveal_email_sent` ───────────────────────
--
-- That column means *the mails left*, and once they have left they have left.
-- `meta-gates.md` names it as one of this product's three one-way switches, and
-- lowering it in the `re_hidden` branch is the obvious-looking edit this
-- paragraph exists to refuse: D-37-22 authorises the PAGE going back to secret,
-- never the pretence that the send never happened. A night coming back from
-- `re_hidden` is a night whose address is already in fifty inboxes, and a flag
-- that said otherwise would send the cron out to mail it again.
--
-- `SET search_path = ''` with every reference schema-qualified, per
-- `20260807000000_capability_model.sql:166-171`: a SECURITY DEFINER function
-- with a mutable search_path lets the CALLER choose which `event_parties` the
-- definer reads.
--
-- THE RETURN CONTRACT, which the server action of plan 37-10 and the surface of
-- plan 37-11 read:
--
--   success  {"ok": true,  "act_id": "<uuid>", "revealed_at": <timestamptz|null>}
--   refusal  {"ok": false, "reason": "<code>", "revealed_at": <timestamptz|null>}
--
--   reasons  party_not_found · not_secret · already_revealed · not_revealed ·
--            re_hide_requires_master

CREATE OR REPLACE FUNCTION public.record_venue_reveal_act(
  p_party_id            uuid,
  p_act                 text,
  p_actor_id            uuid,
  p_actor_name          text,
  p_recipients_intended integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_venue_secret  boolean;
  v_revealed_at   timestamptz;
  v_event_title   text;
  v_party_date    date;
  v_actor_role    text;
  v_act_id        uuid;
BEGIN
  -- ── 1. The argumental refusals, first, each with its own name ─────────────
  --
  -- These are PROGRAMMING errors, not user paths: no surface can produce them,
  -- and a caller cannot recover from one. They are exceptions rather than
  -- returned values for exactly that reason — and neither of them touches a row
  -- of `public.event_parties`, so neither can carry an address in
  -- `error.details`.

  IF p_act NOT IN ('revealed', 'completed', 're_hidden') THEN
    RAISE EXCEPTION 'venue_reveal.unknown_act: %', p_act
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- An unattributed reveal is refused HERE, with its own name, rather than
  -- downstream. Without this it still fails — `actor_name` is NOT NULL and its
  -- CHECK refuses blank — but it fails as two different codes depending on
  -- which half is missing, and a caller cannot branch on the CAUSE. The message
  -- names the PARTY and never the actor: a person's name in a raised message is
  -- the one thing this table's own column is authorised to hold and its
  -- artefacts are not.
  IF p_actor_id IS NULL OR btrim(coalesce(p_actor_name, '')) = '' THEN
    RAISE EXCEPTION 'venue_reveal.actor_required: %', p_party_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── 2. The night, as it is IN THIS STATEMENT ──────────────────────────────
  --
  -- `FOR UPDATE OF ep` is not caution. Two people pressing the button within the
  -- same second is the ordinary case this exists to close: without the lock both
  -- read `venue_revealed_at IS NULL`, both pass the guard, and the address is
  -- mailed twice by two acts each believing it was the first. `OF ep` and not a
  -- bare `FOR UPDATE`, so the join to `public.events` does not lock the event
  -- row as well — a night is revealed while its event is being edited, and
  -- neither should wait on the other.
  SELECT ep.venue_secret, ep.venue_revealed_at, ep.date, e.title
    INTO v_venue_secret, v_revealed_at, v_party_date, v_event_title
    FROM public.event_parties ep
    JOIN public.events e ON e.id = ep.event_id
   WHERE ep.id = p_party_id
     FOR UPDATE OF ep;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'party_not_found',
      'revealed_at', NULL
    );
  END IF;

  -- ── 3. The guards, as VALUES ──────────────────────────────────────────────

  IF p_act = 'revealed' THEN

    -- A night that was never secret has no address to release. This is not a
    -- no-op to be swallowed: it means the surface and the database disagree
    -- about what this night is, and the operator is looking at a button that
    -- should not have been there.
    IF NOT coalesce(v_venue_secret, false) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'not_secret',
        'revealed_at', v_revealed_at
      );
    END IF;

    -- D-37-19: the second press gets an ANSWER, not silence. `revealed_at`
    -- travels back in the refusal precisely so the surface can say *when*, which
    -- is what turns a dead button into a record of what already happened.
    IF v_revealed_at IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'already_revealed',
        'revealed_at', v_revealed_at
      );
    END IF;

  ELSIF p_act = 'completed' THEN

    -- D-37-20 sends to the people the first act missed. There is nothing to
    -- complete before something has begun, and calling this on a night that was
    -- never revealed would record a publication with no first publication —
    -- a trace that reads backwards a season later.
    IF v_revealed_at IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'not_revealed',
        'revealed_at', NULL
      );
    END IF;

  ELSE  -- p_act = 're_hidden'

    IF v_revealed_at IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'not_revealed',
        'revealed_at', NULL
      );
    END IF;

    -- D-37-22: master alone. **THE ROLE IS READ HERE AND IS NOT AN ARGUMENT.**
    -- A `p_actor_role text` parameter would let whoever calls declare their own
    -- role, which on a function reachable only by `service_role` sounds
    -- harmless right up to the day a second caller is written by somebody who
    -- read the signature and not this paragraph. A missing profile falls through
    -- to the same refusal: `v_actor_role` stays NULL and NULL is not 'master'.
    SELECT p.role
      INTO v_actor_role
      FROM public.profiles p
     WHERE p.id = p_actor_id;

    IF v_actor_role IS DISTINCT FROM 'master' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 're_hide_requires_master',
        'revealed_at', v_revealed_at
      );
    END IF;

  END IF;

  -- ── 4. The row ────────────────────────────────────────────────────────────

  IF p_act = 'revealed' THEN

    UPDATE public.event_parties
       SET venue_revealed_at = now()
     WHERE id = p_party_id
    RETURNING venue_revealed_at INTO v_revealed_at;

  ELSIF p_act = 're_hidden' THEN

    -- ── THE ONE WIDENING IN THIS FILE, AND IT IS DECLARED ──────────────────
    --
    -- `meta-gates.md` allows a monotone guard to be made easier to trip only
    -- with an authorisation documented in the commit. This is that line:
    -- clearing `venue_revealed_at` means a later `revealed` act no longer meets
    -- `already_revealed`, so the same night can be revealed a second time. That
    -- is D-37-22 as the owner decided it, and it is bounded by three things:
    -- only a master reaches this branch, the trace of the first reveal cannot be
    -- deleted, and the second reveal writes its own row beside the first.
    --
    -- The two columns this branch writes are the two it is allowed to write. The
    -- column it must NOT write is named in the function docblock above, under
    -- *WHAT NO BRANCH TOUCHES*, and the reason lives there rather than here so
    -- that this branch cannot be read as the only place the rule applies.
    UPDATE public.event_parties
       SET venue_revealed_at = NULL,
           venue_secret      = true
     WHERE id = p_party_id;

    v_revealed_at := NULL;

  -- `completed` deliberately performs NO update. The instant of the reveal is
  -- the instant of the FIRST act and it does not move: if a completing send
  -- rewrote it, *who was there when the address went out* would drift forward
  -- every time somebody topped up the recipients, and the count of who was
  -- missing would be measured from the wrong moment.
  END IF;

  -- ── 5. The act, in the same transaction as the write above ────────────────
  --
  -- `party_label` is composed HERE, from the two values read under the lock at
  -- step 2, and from nothing else. Neither `venue_text` nor `venue_id` nor
  -- `venue_secret_hint` is in scope in this function — that is by construction
  -- and not by discipline.
  INSERT INTO public.venue_reveal_acts (
    party_id, party_label, act, actor_id, actor_name, recipients_intended
  ) VALUES (
    p_party_id,
    v_event_title || ' — ' || to_char(v_party_date, 'YYYY-MM-DD'),
    p_act,
    p_actor_id,
    btrim(p_actor_name),
    p_recipients_intended
  )
  RETURNING id INTO v_act_id;

  RETURN jsonb_build_object(
    'ok', true,
    'act_id', v_act_id,
    'revealed_at', v_revealed_at
  );
END;
$$;

-- ── THE LOCK-DOWN, AND IT IS NOT OPTIONAL ───────────────────────────────────
--
-- This function is `SECURITY DEFINER` and it PUBLISHES ADDRESSES. PostgREST
-- exposes functions in `public` by default and the exposed-schema list on this
-- project is `public, graphql_public` (verified 2026-08-06), so without the two
-- statements below it is live at `/rest/v1/rpc/record_venue_reveal_act` and any
-- signed-in member can flip a night to revealed — which, once the surfaces of
-- plans 37-04 and 37-11 read that flag, is an address on a public page.
--
-- REVOKE first and GRANT second, in that order and as two statements rather than
-- assumed: Postgres grants EXECUTE to PUBLIC by default on every new function,
-- so the GRANT alone would leave the default in place. Same shape as
-- `20260809002000_assignment_acts.sql:485-489`.

REVOKE ALL ON FUNCTION public.record_venue_reveal_act(uuid, text, uuid, text, integer)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_venue_reveal_act(uuid, text, uuid, text, integer)
  TO service_role;

COMMENT ON FUNCTION public.record_venue_reveal_act(uuid, text, uuid, text, integer) IS
  'VENUE-02: performs the event_parties write and its venue_reveal_acts trace in ONE transaction, so an address cannot be released while the record of who released it fails — a divergence nothing in this product would report, since there is no error tracking. '
  'ONE function for three acts, not three: three functions of the same shape diverge, and the next check gets added only to the one somebody was looking at. '
  'The refusals are RETURNED VALUES and not exceptions, deliberately: on a constraint violation PostgREST returns the entire failing row in error.details, and the failing row here carries venue_text, venue_id and venue_secret_hint. '
  'The actor is an argument because auth.uid() is null under the service client; the actor ROLE is read here from public.profiles and is never an argument, so a caller cannot declare itself master to reach the re_hidden branch (D-37-22). '
  'venue_reveal_email_sent is not touched by any branch: re-hiding returns the page to secret, never the mails. '
  'SECURITY DEFINER and it publishes addresses: execute is revoked from public, anon and authenticated, and granted to service_role alone.';

COMMIT;
