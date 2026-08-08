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

COMMIT;
