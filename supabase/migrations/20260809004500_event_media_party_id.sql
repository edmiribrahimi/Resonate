-- event_media carries the NIGHT, not only the event
-- Phase 35, Plan 18: ASSIGN-01
--
-- WHY THIS FILE EXISTS, in one sentence. `public.event_media` carries
-- `event_id` and no night (`supabase/schema.sql:254-262`), so a per-night grant
-- of `media.upload` for ONE night would unlock uploads on EVERY night of that
-- event. The ROADMAP's success criterion 1 says, textually, *"nothing changes
-- for them on any other night"*. A per-night key writing to a per-event table is
-- that sentence made false, so the column lands here and not in a later phase.
--
-- AND "EVERY NIGHT" IS NOT CAPPED AT THREE, which is the correction this file
-- records rather than repeats. `20260225150000_party_architecture.sql:12,23`
-- did carry `type IN ('preparty','main','afterparty')` with
-- `UNIQUE (event_id, type)` — a ceiling of three — but
-- `20260226300000_multi_sub_events.sql:11-17` DROPPED both the check and the
-- unique constraint and removed the column, giving each night its own `date`
-- (`:20-27`). An event may therefore hold ARBITRARILY MANY nights today, and the
-- blast radius of one per-night key is the whole event, not three evenings.
-- Verified by reading the two files, and by the container refusing a fixture
-- written against the old shape.
--
-- SIX changes, ONE transaction. A half-applied version of this file is worse
-- than none of it, and each half is bad in its own way:
--
--   * the column without the trigger is a column every new row may leave empty,
--     and `NULL` then means two different things at once — *legacy* on the old
--     rows and *not bothered* on the new ones. The moment those two share a
--     value, no reader can tell a row that predates the night from a row that
--     refused to name one, and the phase's whole guarantee becomes a convention;
--   * the trigger without the column raises `42703` on every insert into this
--     table and takes the media surface down;
--   * the backfill without the column is the same `42703`; the column without
--     the backfill leaves EVERY row `NULL`, including the ones whose night is
--     not a guess but the only possibility, and the first reader of the data
--     concludes the column was never populated;
--   * the accessor (change 5) without the policy is an unused function; the
--     policy without the accessor cannot be created at all — and, worse, the
--     obvious hand-written substitute for it is the defect this file records in
--     section 5. Read that section before "simplifying" it;
--   * the policy without the trigger enforces the rule only where RLS runs.
--     **RLS does not apply to the service role; a trigger does.** *"The service
--     client bypasses every RLS policy and bypasses no constraint"*
--     (`20260809000000_party_assignments.sql:302-304`) — the same sentence, for
--     the same reason, one table over.
--
-- So `BEGIN; ... COMMIT;` is not decoration here either.
--
-- IDEMPOTENZA, voce per voce — e con UN'ECCEZIONE DICHIARATA. Questa coda si
-- applica A MANO, una riga alla volta (`35-HUMAN-UAT.md`), e WR-04 della code
-- review del 2026-08-08 ha registrato quanto costa una seconda esecuzione
-- quando manca: `42710`, transazione in rollback, e TUTTA la coda che segue
-- lasciata non applicata.
--
--   * `ADD COLUMN IF NOT EXISTS` per la colonna — **e qui la disciplina di
--     questa fase si applica AL CONTRARIO, di proposito**. Per un vincolo o un
--     indice si scrive `DROP ... IF EXISTS` e poi `ADD`, perche' un vincolo
--     ricreato e' lo stesso vincolo. Per una colonna no: rimuoverla prima di
--     riaggiungerla butterebbe via il backfill a ogni riesecuzione, cioe' i dati
--     che questo file esiste per scrivere. `ADD COLUMN IF NOT EXISTS` e'
--     idempotente **e** non perde niente. E' un'eccezione dichiarata, non una
--     dimenticanza: chi la legge sappia che e' stata guardata;
--   * `DROP CONSTRAINT IF EXISTS` prima dell'`ADD CONSTRAINT` sulla chiave
--     esterna;
--   * `IF NOT EXISTS` sull'indice;
--   * il backfill porta `party_id IS NULL` nella sua `WHERE`, quindi la seconda
--     esecuzione tocca zero righe invece di riscrivere le stesse;
--   * `CREATE OR REPLACE` per le due funzioni — la forma idempotente per un
--     oggetto che non accetta `IF NOT EXISTS`;
--   * `DROP TRIGGER IF EXISTS` prima del trigger;
--   * `DROP POLICY IF EXISTS` prima dell'unica policy toccata.
--
-- Re-eseguire deve essere sicuro, o nessuno ri-esegue quando dovrebbe.
--
-- ── THE WINDOW THIS FILE OPENS, DECLARED INSTEAD OF DISCOVERED ───────────────
--
-- After this migration is applied, **an insert into `public.event_media` that
-- does not name a night is refused** — and the one writer in the product today,
-- `registerMedia` (`src/app/(public)/events/[slug]/actions.ts:84-95`), does not
-- name one. Plan 35-20 records that the night becomes `registerMedia`'s job
-- (*"quella resta `registerMedia`, che porta il suo predicato e la serata"*);
-- until that ships, applying this row breaks that path with a `23514`.
--
-- Who reaches it today, measured rather than assumed: `validateMediaUpload`
-- (`:38-57`) lets an `organizer` or a `master` through unconditionally, and
-- sends everybody else to a table named `attendance` — while the table is
-- `public.attendances`. PostgREST answers with an error, the code destructures
-- only `{ data }`, and that arm therefore always refuses. **So the path this row
-- would break is the organizer/master one, not an ordinary member's**, because
-- an ordinary member has no working upload today. That defect is deliberately
-- left alone here: repairing it WIDENS who may upload, which is an access
-- decision and belongs to `access-gating.md`, not to a column.
--
-- The ordering consequence, in one line: **this row is applied together with, or
-- after, the deploy that teaches `registerMedia` the night** — never before it.

BEGIN;

-- =============================================================================
-- 1. The column
-- =============================================================================
--
-- Nullable, and the nullability is not a shortcut: it is what lets the rows that
-- already exist keep existing. Making it `NOT NULL` would require every historic
-- row to be attributed to a night, and section 3 is the paragraph explaining why
-- some of them cannot be attributed to one honestly. What replaces `NOT NULL` is
-- section 4's trigger, which refuses the same thing for every row written FROM
-- NOW ON without touching a single row written before.

ALTER TABLE public.event_media
  ADD COLUMN IF NOT EXISTS party_id uuid;

-- =============================================================================
-- 2. The foreign key, with the clause `event_id` already carries
-- =============================================================================
--
-- WHY `CASCADE` AND NOT `RESTRICT`, because this is the choice a reader will
-- challenge. `event_media.event_id` is already
-- `references public.events on delete cascade` (`supabase/schema.sql:256`), and
-- deleting an event deletes its nights. With `RESTRICT` on the new key, deleting
-- an event would fail because of a media row — which means this migration would
-- change what happens when an event is deleted, and that is in none of the eight
-- requirements. `CASCADE` reproduces EXACTLY what happens today.
--
-- The consequence is the one `media-and-storage.md` already names — deleting the
-- row does not delete the object in the bucket — and it is PRE-EXISTING, not
-- introduced here: the cascade from `events` already had it.

ALTER TABLE public.event_media
  DROP CONSTRAINT IF EXISTS event_media_party_id_fkey;

ALTER TABLE public.event_media
  ADD CONSTRAINT event_media_party_id_fkey
  FOREIGN KEY (party_id) REFERENCES public.event_parties (id) ON DELETE CASCADE;

-- The read this index exists for: *the media of THIS night* — the query every
-- per-night surface of this phase makes, and the one the accessor of section 5
-- makes on the reverse side of the same key. `supabase-data.md`, gate *indici
-- sulle colonne di lookup*: the three indexes phase 7 added
-- (`20260225120000_phase7_media.sql:14-16`) each carry the same justification.
CREATE INDEX IF NOT EXISTS idx_event_media_party_id
  ON public.event_media (party_id);

-- =============================================================================
-- 3. The backfill — it fills only where the answer is a FACT
-- =============================================================================
--
-- Only the rows of events that hold EXACTLY ONE night. There the night is not a
-- hypothesis: it is the only one there is.
--
-- **The rows of events with two or three nights stay `NULL`, and that is the
-- decision.** Attributing them to the `main` party would be INVENTING A FACT,
-- and for a file shot inside a secret venue inventing the night is worse than
-- declaring that we do not know it: the night is what says whether that venue
-- was secret, and a wrong night is a wrong answer given confidently
-- (`venue-secrecy.md`, gate *default chiuso* — when the state cannot be
-- determined, refuse).
--
-- RE-RUNNABLE: `party_id IS NULL` in the `WHERE` means a second run of this file
-- touches zero rows rather than rewriting the same ones.
--
-- ── HOW MANY ROWS IT TOUCHES, AND HOW THAT IS KNOWN ──────────────────────────
--
-- **This file does not claim a number, it PRINTS one.** No count measured on a
-- laptop would be about production, and this repository has no error tracking
-- (`meta-gates.md`): a backfill whose scale is only in a plan document is a write
-- to real rows that nobody watched. The `RAISE NOTICE` below reports, at apply
-- time and in the operator's own terminal, how many rows were filled and how many
-- were deliberately left `NULL`. That is the observable effect the gate asks for
-- — and the second number is the one that matters, because it is the size of the
-- legacy set every later reader will meet.
--
-- The same two numbers can be read BEFORE applying anything, with:
--
--   select count(*) filter (where m.party_id is null
--            and (select count(*) from public.event_parties ep
--                  where ep.event_id = m.event_id) = 1) as would_fill,
--          count(*) filter (where m.party_id is null
--            and (select count(*) from public.event_parties ep
--                  where ep.event_id = m.event_id) <> 1) as would_stay_null
--     from public.event_media m;

DO $$
DECLARE
  v_filled bigint;
  v_left   bigint;
BEGIN
  UPDATE public.event_media m
     SET party_id = (
       SELECT ep.id
         FROM public.event_parties ep
        WHERE ep.event_id = m.event_id
     )
   WHERE m.party_id IS NULL
     AND (
       SELECT count(*)
         FROM public.event_parties ep
        WHERE ep.event_id = m.event_id
     ) = 1;

  GET DIAGNOSTICS v_filled = ROW_COUNT;

  SELECT count(*) INTO v_left
    FROM public.event_media
   WHERE party_id IS NULL;

  -- Counts and nothing else. No url, no caption, no event: a raised message
  -- reaches a log, and on this project a log reaches a screenshot
  -- (`20260808002000_membership_register.sql:313-315`, the same rule for the
  -- same reason).
  RAISE NOTICE
    'event_media.party_id backfill: % row(s) given their night (single-night events); % row(s) left NULL = legacy, event-scope (multi-night events, where a night would have been invented).',
    v_filled, v_left;
END;
$$;

-- =============================================================================
-- 4. What NULL means, made mechanical
-- =============================================================================
--
-- The sentence is written in THREE places that must say the same thing — this
-- comment, the trigger below, and `EventMediaRow` in `src/types/database.ts` —
-- because the next reader arrives from one of the three. Two formulations of one
-- rule are two rules.

COMMENT ON COLUMN public.event_media.party_id IS
  'The night this file belongs to. NULL means LEGACY ROW, EVENT SCOPE - uploaded before this column '
  'existed, on an event with more than one night, where attributing a night after the fact would be '
  'inventing it. A legacy row is read and moderated exactly as before, and is NEVER a valid target for '
  'a NEW write: the trigger event_media_require_party refuses every INSERT without a night. '
  'NULL does NOT mean "every night": the per-night test is an equality between identifiers '
  '(private.has_capability: pa.party_id = p_party_id) and in SQL NULL equals nothing, not even itself.';

CREATE OR REPLACE FUNCTION private.event_media_require_party()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.party_id IS NULL THEN
    -- The message names the COLUMN and nothing else. No url, no caption, no
    -- account: this text reaches a log and a client, and neither is a place for
    -- the contents of the row.
    RAISE EXCEPTION
      'event_media.party_id is required: a new row must name the night it belongs to. NULL means LEGACY (event scope) and never "every night".'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- No REVOKE/GRANT pair, and that is a decision rather than an oversight. Every
-- other function this phase family adds is `SECURITY DEFINER` and writes, so each
-- carries `REVOKE ... FROM public, anon, authenticated` and a grant to
-- `service_role`. This one is `SECURITY INVOKER`, writes nothing, and cannot be
-- called usefully at all outside a trigger — Postgres refuses a direct call with
-- `0A000`. Postgres checks EXECUTE on a trigger function when the TRIGGER is
-- created, not when it fires, so the default `EXECUTE` to `PUBLIC` grants nobody
-- anything here. Said out loud so the missing pair is not "repaired" into a
-- permission nobody needs (`20260809000000_party_assignments.sql:141-149`, the
-- same paragraph for the same reason).

DROP TRIGGER IF EXISTS event_media_require_party ON public.event_media;

CREATE TRIGGER event_media_require_party
  BEFORE INSERT ON public.event_media
  FOR EACH ROW
  EXECUTE FUNCTION private.event_media_require_party();

COMMENT ON TRIGGER event_media_require_party ON public.event_media IS
  'No new row without a night. INSERT only, never UPDATE - see the migration 20260809004500, section 4.';

-- ── THE THREE THINGS THAT DECIDE WHETHER THIS SECTION IS WORTH ANYTHING ──────
--
-- (a) **INSERT ONLY, and never a trigger on the UPDATE of this table.** A rule
--     enforced on UPDATE would break the MODERATION of every legacy row:
--     `updateMediaStatus` (`src/app/(public)/events/[slug]/actions.ts:129-156`)
--     writes `status` on rows that may carry `party_id` NULL, and a rule that
--     refused those updates would break the review of every file uploaded before
--     this phase. That is the whole reason the form here is a TRIGGER and not a
--     table constraint: a `CHECK` declared as unvalidated is not checked against
--     the rows that already exist, but IT IS STILL APPLIED TO EVERY UPDATE — so
--     it would produce exactly that breakage while looking like the careful
--     choice. This paragraph exists so that nobody "simplifies" the trigger into
--     that constraint; without it, somebody will.
--
-- (b) **Why a trigger and not only the policy.** An RLS policy is not evaluated
--     for the service role; a trigger is. The rule *no new row without a night*
--     must not depend on which key the writer happens to hold — and the writers
--     that matter here hold the service key: plan 35-20's finalize route runs
--     with it, and so does every seed and every repair script.
--
-- (c) **Why NULL is not a wildcard.** The per-night arm compares two identifiers
--     — `pa.party_id = p_party_id` inside `private.has_capability`
--     (`20260809001000_assignment_resolver.sql:348`) — and in SQL `NULL` is equal
--     to nothing, not even to itself. There is no path on which a NULL row
--     satisfies a per-night arm. That is not a convention anybody has to keep:
--     it is the algebra.

-- =============================================================================
-- 5. private.party_event_id — the night's event, answered as a FACT
-- =============================================================================
--
-- WHAT IT ANSWERS: which event a night belongs to. One row, one column.
--
-- ── WHY THIS FUNCTION EXISTS AT ALL, WHICH IS THE INTERESTING PART ───────────
--
-- The policy in section 6 has to refuse a night that belongs to a DIFFERENT
-- event. The obvious way to write that is an inline `EXISTS (SELECT 1 FROM
-- public.event_parties ...)` inside the `WITH CHECK`, and **that obvious way is
-- wrong here, measurably.**
--
-- A subquery inside a policy body is evaluated with the PRIVILEGES OF THE
-- CALLER, so it sees `public.event_parties` through that caller's own read
-- policies. And `event_parties_select_published`
-- (`20260225150000_party_architecture.sql:30-37`) only shows a night whose event
-- is published, while `event_parties_select_admin` shows all of them to
-- `staff.manage`. An inline `EXISTS` would therefore answer TRUE for an
-- organizer and FALSE for an ordinary member **on the same row** — turning a
-- check about the SHAPE of the row into a check about WHO IS WRITING IT, and
-- silently refusing exactly the members this table exists for. This plan changes
-- what a row must carry; it does not change who may write one, and an inline
-- `EXISTS` would have changed the second thing while claiming the first.
--
-- Measured, not reasoned: with the inline form the write matrix of `event_media`
-- moves for the member personas; with this accessor it does not move at all. The
-- mutation and both readings are in `35-18-SUMMARY.md`.
--
-- `SECURITY DEFINER` is therefore load-bearing and is the same answer
-- `private.has_capability` gives to the same question
-- (`20260807000000_capability_model.sql:186-190`): a policy must not depend on
-- what the account being checked is allowed to read.
--
-- `SET search_path = ''` with every reference schema-qualified: a
-- `SECURITY DEFINER` with a mutable search path lets the caller choose which
-- `event_parties` the definer reads (`:166-171`).
--
-- STABLE, not IMMUTABLE: it reads a table.

CREATE OR REPLACE FUNCTION private.party_event_id(p_party_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ep.event_id
    FROM public.event_parties ep
   WHERE ep.id = p_party_id;
$$;

-- Execute for `authenticated` AND `anon`, for the policy-evaluation reason
-- written at `20260807000000_capability_model.sql:219-223`: a predicate runs with
-- the querying role's privileges. For `anon` the function is reachable and
-- useless — the policy it serves is `TO authenticated` — so the grant buys a
-- correct refusal rather than access, and its absence would buy a `42501` that
-- reads like a policy decision and is not one.
GRANT EXECUTE ON FUNCTION private.party_event_id(uuid) TO authenticated, anon;

COMMENT ON FUNCTION private.party_event_id(uuid) IS
  'Which event a night belongs to. SECURITY DEFINER on purpose: an inline EXISTS inside a policy body '
  'reads public.event_parties through the CALLER''s read policies, so the same row would answer TRUE for '
  'an organizer and FALSE for a member - turning a check about the row into a check about who is writing it. '
  'Returns NULL for a night that does not exist, which makes the comparison in event_media_insert_member '
  'fail closed.';

-- =============================================================================
-- 6. The insert policy, narrowed in FORM only
-- =============================================================================
--
-- Rewritten from the text it holds TODAY, which is the wrapped form of
-- `20260807020000_wrap_auth_uid.sql:103-108` and not the earlier one of
-- `20260807010000_policies_to_capabilities.sql:198-203`. Two conjunctions are
-- added and nothing else:
--
--   * `party_id IS NOT NULL` — the row names a night;
--   * `private.party_event_id(party_id) = event_id` — and it is THIS event's
--     night. Section 5 is why that is a function call and not an inline EXISTS.
--
-- The WHO arm is IDENTICAL, character for character: `(select auth.uid()) =
-- uploaded_by` and `(select private.has_capability('membership.active'))`. Every
-- call that reaches the resolver keeps the `(select ...)` wrapper, which is
-- load-bearing: it is the wrapper and NOT `STABLE` that makes Postgres evaluate
-- the predicate once per statement as an InitPlan
-- (`20260807000000_capability_model.sql:177-184`).
--
-- ── WHY THE *WHO* IS NOT TOUCHED HERE, AND WHAT THAT COSTS ───────────────────
--
-- Narrowing who may insert is a change to the gating model and goes through
-- `access-gating.md`; this plan changes WHAT THE ROW MUST CARRY. The per-night
-- predicate lives in plan 35-16 and in plan 35-20's route, and the consequence is
-- DECLARED rather than hidden: **RLS alone still admits every account holding
-- `membership.active` — `staff` included, because D-14 grants it that key — as
-- long as the row is well formed.** That is exactly why the per-night predicate
-- has to sit inside `registerMedia` too, and not only inside
-- `validateMediaUpload`.
--
-- ── FAIL-CLOSED, SPELLED OUT ────────────────────────────────────────────────
--
-- A `party_id` that names no existing night makes `private.party_event_id`
-- return NULL, so `NULL = event_id` evaluates to NULL, and a `WITH CHECK` that is
-- not TRUE refuses. The foreign key of section 2 would refuse the same row a
-- moment later; both are kept, because the policy answers *may this account
-- write this row* and the key answers *does this night exist*, and a reader must
-- be able to tell the two refusals apart by their SQLSTATE.
--
-- **NO OTHER POLICY IS TOUCHED.** `event_media_select_approved`,
-- `event_media_select_own`, `event_media_select_admin`,
-- `event_media_update_admin`, `event_media_delete_own` and
-- `event_media_delete_admin` stay word for word as they are: this migration
-- changes NO READ.

DROP POLICY IF EXISTS event_media_insert_member ON public.event_media;

CREATE POLICY event_media_insert_member ON public.event_media
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((select auth.uid()) = uploaded_by)
    AND (select private.has_capability('membership.active'))
    AND (party_id IS NOT NULL)
    AND ((select private.party_event_id(party_id)) = event_id)
  );

COMMIT;
