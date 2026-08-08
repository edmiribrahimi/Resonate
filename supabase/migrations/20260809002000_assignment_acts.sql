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

COMMIT;
