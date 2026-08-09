-- Per-night assignments — the register, and the one writer that may touch it
-- Phase 35, Plan 04: ASSIGN-03, ASSIGN-04, with the rewrite of D-18 written
-- beside the line that performs it
--
-- Changes:
-- 1. public.membership_acts — the `act` CHECK widened from seven values to
--    NINE, adding `assigned` and `unassigned`, mirrored in the same commit by
--    `MembershipAct` in `src/lib/membership/acts.ts`
-- 2. public.membership_acts.party_id — D-18 REWRITTEN, not appended to: an
--    override at the door admits a person, an assignment grants a power, and
--    only the second belongs in this register
-- 3. public.record_party_assignment_act — the atomic writer: the row in
--    `public.party_assignments` and its act in `public.membership_acts`, in ONE
--    transaction, for both granting and revoking
--
-- Three changes, ONE transaction. Each half is bad in its own way:
--
--   * the widened CHECK without the writer is a database that will accept two
--     act values nothing in this repository writes — harmless, but it is the
--     half that makes the OTHER half look optional;
--   * the writer without the widened CHECK cannot run at all: its first call to
--     `public.record_membership_act` raises `23514` on
--     `membership_acts_act_check`, and it raises it at the moment somebody
--     performs an assignment rather than when the file is applied
--     (`src/lib/membership/acts.ts:18-25` says exactly this about the mirror);
--   * the rewritten D-18 without either is a paragraph promising a behaviour
--     that does not exist, on a register somebody reads a season later.
--
-- So `BEGIN; ... COMMIT;` is not decoration here either.
--
-- The template for this file is `20260808002000_membership_register.sql` — the
-- migration that BUILT the register this one writes into, and which named this
-- phase in two places while doing so. What is copied from it: the numbered
-- header, the `SELECT … FOR UPDATE` that reads the subject as it is NOW, the
-- `RAISE EXCEPTION` that names an IDENTIFIER and never a person, and
-- `REVOKE` **then** `GRANT` as two statements in that order.
--
-- ── IDEMPOTENZA, voce per voce ──────────────────────────────────────────────
--
-- Questa coda si applica A MANO, una riga alla volta
-- (`.planning/phases/35-per-night-assignments/35-HUMAN-UAT.md`), e WR-04 della
-- code review del 2026-08-08 ha registrato cosa costa una seconda esecuzione
-- quando questo manca: `42710`, la transazione in rollback, e TUTTA la coda che
-- segue lasciata non applicata.
--
--   * `DROP CONSTRAINT IF EXISTS` prima dell'`ADD CONSTRAINT` sul CHECK di
--     `act` — ed e' l'unico `ADD CONSTRAINT` del file;
--   * `COMMENT ON COLUMN` e `COMMENT ON FUNCTION` sono sostituzioni per
--     costruzione: rieseguirli riscrive lo stesso testo;
--   * `CREATE OR REPLACE` per la funzione — la forma idempotente per un oggetto
--     che non accetta `IF NOT EXISTS`;
--   * `REVOKE` e `GRANT` sono idempotenti per natura.
--
-- Ri-eseguire deve essere sicuro, o nessuno ri-esegue quando dovrebbe.

BEGIN;

-- =============================================================================
-- 1. The `act` CHECK — seven values become nine
-- =============================================================================
--
-- The seven that were there stay exactly as they were
-- (`20260808002000_membership_register.sql:174-183`). Two are added:
--
--   `assigned`    — *Assigned to a night*
--   `unassigned`  — *Assignment revoked*
--
-- Those two human phrases are the whole of what a reader of this register is
-- shown, and neither of them names anybody: the register speaks in
-- `membership_code` and in nothing else, because `subject_label` is written by
-- `public.record_membership_act` from `public.profiles.membership_code` and the
-- caller is never asked (`20260808002000:195-202`).
--
-- ── WHY THIS IS ONE COMMIT WITH A TYPESCRIPT FILE ───────────────────────────
--
-- `src/lib/membership/acts.ts:10-33` states the rule and its reason, and the
-- reason is that a divergence between the two sides DOES NOT FAIL LOUDLY. A
-- value added here and not there is a row the register holds and no reader in
-- this repository can name. A value added there and not here is a value
-- TypeScript accepts everywhere and the database refuses with a `23514` **at
-- the moment somebody performs the act** — which, for this phase, is somebody
-- assigning a member of staff to a night, possibly on the evening of it.
--
-- Nothing compares the two sides. `npm run build` catches the TypeScript half,
-- this CHECK catches the SQL half, and the mirror between them is held by this
-- paragraph and by the commit that carries both files.

ALTER TABLE public.membership_acts
  DROP CONSTRAINT IF EXISTS membership_acts_act_check;

ALTER TABLE public.membership_acts
  ADD CONSTRAINT membership_acts_act_check
  CHECK (act IN (
    'created',
    'approved',
    'rejected',
    'promoted',
    'demoted',
    'deactivated',
    'reactivated',
    'assigned',
    'unassigned'
  ));

COMMENT ON CONSTRAINT membership_acts_act_check ON public.membership_acts IS
  'The register vocabulary: nine values, mirrored literally by MembershipAct in src/lib/membership/acts.ts. '
  'Seven from D-11 (20260808002000), plus assigned / unassigned from phase 35 — "Assigned to a night" and "Assignment revoked". '
  'Editing either side means editing both, in the same commit: a divergence raises 23514 when somebody performs the act, never at build time.';

-- =============================================================================
-- 2. D-18, REWRITTEN — what enters this register, and what does not
-- =============================================================================
--
-- ── WHAT D-18 SAID, AND WHY IT CANNOT BE LEFT STANDING ──────────────────────
--
-- `20260808002000_membership_register.sql:299-312` refuses a door override a
-- place in this register, and gives this reason:
--
--   "an override does not change who somebody IS. It admits one person, on one
--    night, and expires with that night; this register records changes to an
--    account's role and status, which persist."
--
-- Read literally, that criterion EXCLUDES THE PER-NIGHT ASSIGNMENT TOO. An
-- assignment also concerns one person on one night, also expires with that
-- night (`party_assignments.ends_at`), and also changes neither role nor
-- status — its four role/status columns in this register are null by design.
--
-- Yet the same migration added `party_id` to this table **ON PURPOSE**
-- (`:259-272`) so that the per-night assignment would write HERE, and
-- `ACCESS-MODEL-DECISIONS.md` § 5 names "per-night assignment" in the list of
-- things that must record who and when. Two paragraphs of the same phase
-- therefore point in opposite directions.
--
-- **Leaving both in place would be worse than either of them**, and that is not
-- a stylistic judgement: it is the sentence D-18 itself uses to forbid a second
-- register — *"the first question of every later reader becomes which one is
-- right"*. A contradiction inside ONE register is that same failure with the
-- reader's question moved one level down.
--
-- ── THE CRITERION THAT WAS ACTUALLY BEING REACHED FOR ───────────────────────
--
-- Expiry is not the criterion. Both acts expire with the night.
--
-- The criterion is: **admitting a person is not granting a power.**
--
--   * A door override ADMITS. It lets one person through one door on one
--     evening, and afterwards that person can do exactly what they could do
--     before. Nothing about what they MAY DO moved.
--   * An assignment GRANTS. It hands somebody the door, the gallery upload, or
--     the running of a night — `door.operate`, `door.supervise`,
--     `media.upload`, `party.manage`
--     (`20260809000000_party_assignments.sql`, `party_assignments_capability_assignable`).
--     After it, that person may do something they could not do before, and
--     somebody chose to let them.
--
-- That is what makes it attributable under `ACCESS-MODEL-DECISIONS.md` § 5, and
-- it is why the acts are `assigned` and `unassigned` rather than a note on a
-- scan.
--
-- ── WHAT STAYS TRUE OF D-18 ────────────────────────────────────────────────
--
-- A door override still does NOT enter this register. It stays in
-- `public.door_scan_events`, which already holds its outcome, its operator, its
-- device and `is_undo` — a reversal being a further event and not an erasure
-- (`20260805120000:118-119`). § 5 requires attribution for an override as well,
-- and it HAS it: the question this rewrite answers is not *whether* an act is
-- attributed but *which register* holds it, and the answer follows from the
-- criterion above.
--
-- **This rewrite does not widen the register. It defines it.** Nothing that was
-- outside is now inside except the one act `party_id` was added for.
--
-- ── AND STILL NO SECOND REGISTER ───────────────────────────────────────────
--
-- Quoted rather than paraphrased, from the paragraph being rewritten:
-- *"Two registers holding overlapping truths is worse than either of them,
-- because the first question of every later reader becomes which one is right."*
-- That sentence survives this rewrite intact, and it is the reason the
-- assignment writes into `public.membership_acts` instead of getting its own
-- table of who-assigned-whom.
--
-- ── WHY THE REWRITE IS A `COMMENT ON COLUMN` AND NOT AN EDIT ────────────────
--
-- `20260808002000_membership_register.sql` was APPLIED TO PRODUCTION on
-- 2026-08-08. `supabase-data.md`, gate *migration in avanti*: an applied
-- migration is a historical fact and is not edited — a new one is written. So
-- the superseded paragraph stays in that file, where it will keep being read.
--
-- This statement is therefore where the CURRENT reading lives, and it lives on
-- the database object rather than in a file: `\d+ public.membership_acts` shows
-- it, and it is the same text for anyone who never opens `supabase/`. It
-- REPLACES the paragraph — a `COMMENT ON COLUMN` has no accumulating form —
-- and it says so, so that a reader who arrives at `:299-312` first is told
-- there is a later one and which of the two governs.

COMMENT ON COLUMN public.membership_acts.party_id IS
  'Which night this act concerns. Null for every act about an account rather than an evening. '
  'D-18, REWRITTEN by 20260809002000_assignment_acts.sql — this text supersedes the paragraph at 20260808002000_membership_register.sql:299-312, which is left in place because that migration is applied and applied migrations are not edited. '
  'The criterion is NOT that an act expires with the night: a per-night assignment expires too. The criterion is that ADMITTING A PERSON IS NOT GRANTING A POWER. '
  'An override at the door admits one person for one evening and changes nothing about what they may do; it stays in public.door_scan_events with its outcome, operator, device and is_undo. '
  'An assignment grants a power — door.operate, door.supervise, media.upload, party.manage — so it is recorded here, as assigned / unassigned, which is what ACCESS-MODEL-DECISIONS.md section 5 requires when it names per-night assignment. '
  'Both acts are attributed; the question this settles is which register holds which, not whether an author is recorded. '
  'No second register: two registers holding overlapping truths is worse than either, because the first question of every later reader becomes which one is right.';

-- =============================================================================
-- 3. public.record_party_assignment_act — one transaction, two effects
-- =============================================================================
--
-- ── WHY THIS IS A FUNCTION AND NOT TWO POSTGREST CALLS ──────────────────────
--
-- The mutation and its record must not be able to disagree. Two calls from a
-- Server Action — an insert into `public.party_assignments`, then an `.rpc` to
-- `public.record_membership_act` — leave a state in which the FIRST succeeded
-- and the SECOND failed: a person holding a power nobody granted, as far as the
-- register is concerned. **And it fails in silence**: there is no error tracking
-- in this product (`meta-gates.md`), so nothing carries that divergence to a
-- human. It would be found by whoever reads the register a season later and
-- finds an assignment with no act, which is the one thing a register may not
-- become.
--
-- `public.record_membership_act` was built for exactly this reason
-- (`20260808002000:490-493`, *"performs the profiles write and its register row
-- in ONE transaction, so a mutation cannot succeed while its record fails"*).
-- This function is the same sentence applied to a different mutation, and it
-- DELEGATES to that one rather than re-implementing it: `subject_label` must
-- stay a `membership_code` imposed by the writer, and a second writer is a
-- second place that rule can be forgotten.
--
-- ── WHY ONE FUNCTION AND NOT TWO ────────────────────────────────────────────
--
-- `record_party_assignment_act` covers granting AND revoking. Two functions of
-- the same shape diverge: the day somebody adds a check, a lock or a message
-- rule, they add it to the one they were looking at. The `p_act` argument is
-- what keeps the two branches in one file, in one grant, under one comment.
--
-- ── WHAT IS DELIBERATELY NOT READ HERE ──────────────────────────────────────
--
-- The subject's `membership_code`. It would be one interpolation away from a
-- `RAISE EXCEPTION`, and a raised message reaches a log and a log reaches a
-- screenshot on a PUBLIC repository. The label is `record_membership_act`'s job
-- and it reads it itself; every message below names an IDENTIFIER — a party, a
-- subject, a capability — and nothing else.

CREATE OR REPLACE FUNCTION public.record_party_assignment_act(
  p_party_id   uuid,
  p_subject_id uuid,
  p_capability text,
  p_act        text,
  p_actor_id   uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_assignee_role  text;
  v_ends_at        timestamptz;
  v_assignment_id  uuid;
BEGIN
  -- Only the two acts this register has words for. Any other value would reach
  -- `membership_acts_act_check` and come back as a `23514` naming a constraint
  -- about the register, for a mistake that was made about the ARGUMENT — the
  -- right error for the wrong reader.
  IF p_act NOT IN ('assigned', 'unassigned') THEN
    RAISE EXCEPTION 'party_assignments.unknown_act: %', p_act
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- An unattributed grant or revocation is refused HERE, with its own name,
  -- rather than downstream. Without this it still fails — `assigned_by` is NOT
  -- NULL (`23502`), `party_assignments_revocation_paired` refuses a half
  -- revocation (`23514`), `membership_acts_actor_attributed` refuses an
  -- authorless act (`23514`) — but it fails as three different codes depending
  -- on the branch, and a caller cannot branch on the CAUSE. D-11: an
  -- unattributed act is indistinguishable from an act whose author was simply
  -- not written.
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'party_assignments.actor_required: % %', p_party_id, p_subject_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_act = 'assigned' THEN

    -- ── 1. The subject, as they are IN THIS STATEMENT ──────────────────────
    --
    -- `FOR UPDATE` is not caution. `assignee_role` is a COPY of the role at the
    -- grant, and the composite foreign key
    -- `party_assignments_assignee_role_fk` checks that copy against the live
    -- row. Without the lock a concurrent demotion can land between this read
    -- and the insert, and the row would then carry a role its holder no longer
    -- has — which is D-A defeated by timing rather than by design.
    SELECT p.role
      INTO v_assignee_role
      FROM public.profiles p
     WHERE p.id = p_subject_id
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'party_assignments.subject_not_found: %', p_subject_id
        USING ERRCODE = 'no_data_found';
    END IF;

    -- ── 2. When the night is over — computed HERE, never sent by a client ───
    --
    -- A boundary supplied by the caller is a permission window chosen by
    -- whoever is being checked. This reads it from the night, through the one
    -- SQL implementation of the midnight rule
    -- (`20260809000000_party_assignments.sql`, section 1).
    --
    -- **BOTH COLUMNS COME FROM THE PARTY. THERE IS NO JOIN TO `public.events`,
    -- AND THAT IS THE POINT.** `public.events` also has a `date`, and reading
    -- the boundary from it is the obvious thing to write and is wrong:
    -- `20260226300000_multi_sub_events.sql:20-27` gave `public.event_parties`
    -- its OWN `date` and backfilled it from the parent, precisely so a
    -- sub-event can sit on a different calendar day from the event containing
    -- it. Measured against a container, the two readings diverge by exactly
    -- twenty-four hours on such a night — and the direction of that error is
    -- the UNSAFE one: an `ends_at` a day early is an assignment that expires
    -- BEFORE the night, which is a member of staff refused at the door in front
    -- of a queue (`CLAUDE.md`, operating principle 3, the worse of the two
    -- failures). Recorded as item 1 of
    -- `.planning/phases/35-per-night-assignments/deferred-items.md`, and the
    -- same expression is written out at section 3d of the migration above.
    --
    -- Every TypeScript call site already passes the PARTY's date —
    -- `review/page.tsx:164`, `checkin/route.ts:438`, `venue-reveal/route.ts:40`,
    -- `event-reminders/route.ts:40`, and every `menuCloseInstant`. This is the
    -- SQL half of that same rule; fed the other column the two halves answer
    -- different questions while looking identical.
    --
    -- THE FALLBACK IS NOT AN INVENTED DEFAULT. `event_parties.end_time` is
    -- nullable (`20260225150000_party_architecture.sql:16`), and `'06:00'` is
    -- the DECLARED close of a night in this product — it runs 22:00 → 06:00 —
    -- the same literal `review/page.tsx:164` uses on the TypeScript side. Its
    -- error direction is the safe one: a window slightly too wide admits;
    -- a window too narrow refuses.
    SELECT public.party_end_instant(ep.date, coalesce(ep.end_time, '06:00'::time))
      INTO v_ends_at
      FROM public.event_parties ep
     WHERE ep.id = p_party_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'party_assignments.party_not_found: %', p_party_id
        USING ERRCODE = 'no_data_found';
    END IF;

    -- ── 3. The row ─────────────────────────────────────────────────────────
    --
    -- **NO `ON CONFLICT`, deliberately.** The partial unique index
    -- `party_assignments_live_unique` must REFUSE a second live assignment of
    -- the same capability on the same night to the same person, with `23505`,
    -- and the caller branches on that code. Swallowing it with a `DO NOTHING`
    -- would return success for an operation that did not happen, and the
    -- surface would show a grant that is somebody else's.
    --
    -- The other refusals are NOT caught either, and travel to the caller
    -- intact: `23514` from `party_assignments_no_self_grant` (nobody assigns to
    -- themselves — ASSIGN-04) and from
    -- `party_assignments_capability_assignable`, `23503` from the composite
    -- `party_assignments_assignee_role_fk` (only a staff role may hold a live
    -- assignment — D-A). A caller branches on `error.code` and NEVER on a
    -- parsed message — Next redacts a Server Action's message in a production
    -- build — and never logs or returns `error.details`, which on these tables
    -- carries the ENTIRE failing row
    -- (`20260808001000_role_implies_approved.sql:194-201`).
    INSERT INTO public.party_assignments (
      party_id, user_id, capability, assignee_role, assigned_by, ends_at
    ) VALUES (
      p_party_id, p_subject_id, p_capability, v_assignee_role, p_actor_id, v_ends_at
    )
    RETURNING id INTO v_assignment_id;

  ELSE

    -- ── THE REVOCATION IS AN UPDATE. IT IS NEVER A DELETE. ─────────────────
    --
    -- ASSIGN-03: recorded rather than deleted. The reason is a question that
    -- gets asked AFTER the revocation and that a deleted row cannot answer:
    -- the offline drain arrives with a scan stamped `scannedAt` and asks *was
    -- this assignment live at that moment?* A revoked row answers — it carries
    -- `granted_at` and `revoked_at`. A deleted row does not, and the scan stays
    -- hanging: neither admitted nor refused, which is precisely the state the
    -- door cannot be left in.
    --
    -- Nulling `assignee_role` is what RELEASES the holder's role from the
    -- composite foreign key: with `MATCH SIMPLE` the key stops being checked
    -- the moment one of its columns is null, so after this the person can be
    -- demoted while the revoked row survives to prove the revocation happened.
    -- Without this line it looks like a forgotten field; it is the mechanism
    -- (`20260809000000_party_assignments.sql`, section 3b), and
    -- `party_assignments_live_role_present` refuses the row without it anyway.
    UPDATE public.party_assignments
       SET revoked_at    = now(),
           revoked_by    = p_actor_id,
           assignee_role = NULL
     WHERE party_id   = p_party_id
       AND user_id    = p_subject_id
       AND capability = p_capability
       AND revoked_at IS NULL
    RETURNING id INTO v_assignment_id;

    -- A revocation that found nothing to revoke is NOT a quiet success. It is
    -- the information that two people are looking at two different states —
    -- one of them at a screen showing an assignment that was already revoked,
    -- or revoked by somebody else a moment ago. Returning normally here would
    -- make that invisible, and there is no error tracking to catch it later.
    IF NOT FOUND THEN
      RAISE EXCEPTION 'party_assignments.no_live_assignment: % % %',
        p_party_id, p_subject_id, p_capability
        USING ERRCODE = 'no_data_found';
    END IF;

  END IF;

  -- ── THE ACT, IN THE SAME TRANSACTION AS THE ROW ABOVE ────────────────────
  --
  -- Both role/status arguments are NULL because an assignment moves NEITHER
  -- axis. That is what makes `record_membership_act` skip its
  -- `public.profiles` write entirely (`20260808002000:437-442`): this function
  -- must not change who somebody IS, and passing a role here is the one way it
  -- could.
  --
  -- ── WHAT THAT DOES **NOT** MEAN, MEASURED RATHER THAN ASSUMED ────────────
  --
  -- It does not leave the four register columns null. The shared writer
  -- computes them itself — `role_before = v_subject.role`,
  -- `role_after = coalesce(p_role, v_subject.role)`
  -- (`20260808002000:459-460`) — so on an assignment act all four come out
  -- NON-NULL and equal: before == after, on both axes. Measured against a
  -- container; the opposite was written here first, and was wrong.
  --
  -- **`before == after` is this register's way of saying an act moved neither
  -- axis, and for an assignment that is the true statement, told in the shape
  -- the writer produces.** The nullability described at
  -- `20260808002000:244-246` is a property of the COLUMNS, not of any row this
  -- writer emits; no act recorded through it has ever left them null, and that
  -- divergence predates this file and is not repaired by it (an applied
  -- migration is not edited — `supabase-data.md`, gate *migration in avanti*).
  --
  -- And the by-product is worth naming, because a later reader will need it:
  -- `role_before` on the `assigned` act **preserves the role its holder held at
  -- the grant** — which is precisely the fact `party_assignments.assignee_role`
  -- is nulled out of on revocation, and which
  -- `20260809000000_party_assignments.sql` declared as the accepted price of
  -- the composite-key mechanism. The price is paid on the operational table and
  -- refunded here. That is what having a register instead of a second column
  -- is for.
  --
  -- `p_note` is NULL because a note about an assignment could only name a
  -- person, and this register speaks in `membership_code`.
  --
  -- `'user'` and never `'system'`: an assignment always has a human author.
  -- The null-actor guard at the top is what makes that statement enforceable
  -- rather than hopeful.
  PERFORM public.record_membership_act(
    p_subject_id,   -- p_subject_id
    p_act,          -- p_act: 'assigned' or 'unassigned'
    p_actor_id,     -- p_actor_id
    'user',         -- p_actor_kind
    NULL,           -- p_role
    NULL,           -- p_status
    NULL,           -- p_note
    p_party_id      -- p_party_id — the column D-18 was rewritten for
  );

  RETURN v_assignment_id;
END;
$$;

-- ── THE LOCK-DOWN, AND IT IS NOT OPTIONAL ───────────────────────────────────
--
-- This function is `SECURITY DEFINER` and it GRANTS PER-NIGHT POWERS. PostgREST
-- exposes functions in `public` by default and the exposed-schema list on this
-- project is `public, graphql_public` (verified 2026-08-06), so without the two
-- statements below it is live at `/rest/v1/rpc/record_party_assignment_act` and
-- any signed-in member can hand themselves the door. `party_assignments_no_self_grant`
-- would refuse the literal self-grant; nothing would stop two accounts granting
-- to each other.
--
-- REVOKE first and GRANT second, in that order and as two statements rather
-- than assumed: Postgres grants EXECUTE to PUBLIC by default on every new
-- function, so the GRANT alone would leave the default in place. Same shape as
-- `20260808002000_membership_register.sql:484-488`.

REVOKE ALL ON FUNCTION public.record_party_assignment_act(uuid, uuid, text, text, uuid)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_party_assignment_act(uuid, uuid, text, text, uuid)
  TO service_role;

COMMENT ON FUNCTION public.record_party_assignment_act(uuid, uuid, text, text, uuid) IS
  'ASSIGN-03 / ASSIGN-04: performs the party_assignments row and its membership_acts act in ONE transaction, so a grant cannot succeed while its record fails — a divergence nothing in this product would report, since there is no error tracking. '
  'ONE function for both acts, not two: two functions of the same shape diverge, and the next check gets added only to the one somebody was looking at. '
  'ends_at is computed here from event_parties.date and event_parties.end_time — never from events.date, which is a different calendar day for a sub-event, and never from the caller. '
  'Revocation is an UPDATE that nulls assignee_role; nothing in this product deletes an assignment, because the offline drain asks whether it was live at scannedAt AFTER the revocation. '
  'SECURITY DEFINER and it grants per-night powers: execute is revoked from public, anon and authenticated, and granted to service_role alone.';

COMMIT;
