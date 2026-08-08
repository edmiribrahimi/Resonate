-- The register's writer must not be able to erase its own trace
-- Phase 43, WR-01 of 43-REVIEW.md — the half of "append-only by construction"
-- that RLS does not cover
--
-- =============================================================================
-- WHY THIS FILE EXISTS, AND WHY IT IS NOT AN EDIT OF 20260808002000
-- =============================================================================
--
-- `20260808002000_membership_register.sql:337-343` states the property in as many
-- words:
--
--   "with RLS enabled and no write policy, no session — authenticated,
--    anonymous, or a master's — can add, edit or remove a row. That is what
--    'append-only by construction' means here."
--
-- For those three categories it is TRUE, and it is true for the right reason.
-- It is not true for the FOURTH category, which that paragraph does not name:
-- `service_role`. In Supabase that role is created with `BYPASSRLS`, so the
-- SELECT-only policy set does not constrain it at all — and the project's
-- default grants on `schema public` leave it holding `INSERT`, `UPDATE` and
-- `DELETE` on any table created there. The `REVOKE` written in that file
-- (`:484-485`) is on the FUNCTION, not on the table.
--
-- `src/app/(admin)/admin/members/actions.ts:18-23` builds exactly that client,
-- and every act in the file runs through it. So the same client that PERFORMS
-- the acts could rewrite or delete the rows that RECORD them.
--
-- ── WHY THAT MATTERS, in this project's own terms ────────────────────────────
--
-- The register is the only thing that answers *who let this person in* —
-- `community-membership.md`, gate *chi decide e' tracciato*: approvals and
-- rejections are privileged operations and must be recorded with WHO and WHEN.
-- An audit table that its own writer can edit answers that question only for as
-- long as nobody lies, which is not what an audit table is for. And the failure
-- does not need malice to arrive: a future cleanup job, a cron, or one
-- `.delete()` written without its filter is enough, and it would be silent —
-- there is no error tracking in this product (`meta-gates.md`, verified
-- 2026-08-05), and a register that lost rows looks exactly like a register in
-- which those acts never happened.
--
-- After this file, the ONLY path to a write on `public.membership_acts` is
-- `public.record_membership_act`, which is `SECURITY DEFINER` and therefore runs
-- as its owner. Table grants are checked independently of RLS, so `BYPASSRLS`
-- does not bypass them: this closes the gap for `service_role` whether or not
-- that role carries the attribute, which is the reason the statement is written
-- as a grant change and not as a policy.
--
-- ── WHY A NEW MIGRATION AND NOT AN EDIT ──────────────────────────────────────
--
-- `supabase-data.md`, gate *migration in avanti*: a migration that has been
-- applied is a historical fact and is not modified — another one is written.
-- `20260808002000` is committed and may already be applied by the time this
-- lands, and its filename prefix is Supabase's `version` primary key: editing
-- the file would change nothing on a database that already recorded that
-- version. This prefix, `20260808005000`, was checked free and sorts after
-- `20260808004000_master_reconcile.sql`, so the queue stays in order.
--
-- ── IDEMPOTENT, and deliberately so ──────────────────────────────────────────
--
-- `REVOKE` and `GRANT` are idempotent by nature: re-running this file on a
-- database where it has already run is a no-op rather than an error. That is the
-- same gate WR-04 raises against `20260808001000` — a migration that fails on its
-- second run blocks a deploy at an inconvenient moment, and on a phase whose
-- migrations are applied by hand that moment is precisely the risk.
--
-- ── WHAT THIS FILE DOES NOT DO ───────────────────────────────────────────────
--
-- It does not restrict the OWNER, and it cannot: a table's owner holds its
-- privileges implicitly, and it is the owner that `record_membership_act` runs
-- as. That is the intended writer, so this is the boundary being drawn and not a
-- hole left in it. Anybody holding the database owner's credentials was never
-- constrained by a grant.
--
-- It also changes no column, so `src/types/database.ts` is unaffected
-- (`supabase-data.md`, gate *tipi allineati*).
--
-- ── HOW TO SEE THAT IT WORKED, since this repository has no test runner ──────
--
-- `CLAUDE.md` Guardrail 1: there is no test runner for the product, and a DDL
-- privilege is not something `npm run build` can observe. The observable effect,
-- to be run against a CONTAINER and never against production — a write probe on
-- production would leave a permanent false act in a table whose rows outlive
-- their subject:
--
--   1. as `service_role`:  DELETE FROM public.membership_acts WHERE false;
--      expected: ERROR 42501 (insufficient_privilege) — NOT "0 rows".
--   2. as `service_role`:  SELECT count(*) FROM public.membership_acts;
--      expected: a number. Reading is untouched.
--   3. through the product: perform one member act and confirm the register
--      gained exactly one row. The definer path still writes.
--
-- Step 1 is the one that matters: before this file it answers "DELETE 0", which
-- is a success, and after it answers with a refusal.

-- =============================================================================
-- `anon` AND `authenticated` KEEP THEIR GRANTS. That is a decision, and the
-- reason is not tidiness
-- =============================================================================
--
-- The obvious form of this repair — and the one WR-01 proposes — revokes from
-- `anon, authenticated, service_role` together. It was written that way first,
-- and `npm run verify:capabilities -- --target=container` refused to measure
-- anything at all:
--
--   "these table/role pairs lack one of SELECT, INSERT, UPDATE, DELETE:
--    membership_acts/anon, membership_acts/authenticated. A 42501 would then
--    mean a missing grant, not a policy refusal. Nothing was measured."
--
-- That refusal is correct and it is worth more than the redundancy it costs.
-- `scripts/rls-baseline-container.mjs:290-320` states the premise the whole
-- harness rests on — *RLS narrows a grant; it cannot create one* — and asserts
-- that `anon` and `authenticated` hold all four DML privileges on every
-- RLS-enabled table, so that when a persona's write comes back `42501` the
-- harness knows it was a POLICY that refused and not a missing grant. Take those
-- grants away on one table and the only automated check this repository has for
-- the access model can no longer tell its two answers apart — on every table, not
-- just this one, because it refuses to measure at all.
--
-- And for those two roles the layer would be redundant, not merely expensive.
-- `20260808002000` enables RLS on this table and writes no INSERT, UPDATE or
-- DELETE policy, so every `anon` and `authenticated` session is already refused
-- completely, by the mechanism this project calls the security boundary
-- (`CLAUDE.md`, operating principle 2). The paragraph quoted at the top of this
-- file is TRUE for them. It is `service_role` it does not cover, and
-- `service_role` is what this file is for.
--
-- Trade named rather than left implicit: refusing those two by policy alone means
-- the refusal depends on RLS staying enabled on this table. That is the same
-- dependency the other 20 RLS tables in this database already carry, and the
-- harness above is what watches it — which is precisely the check that keeping
-- the grants preserves.

BEGIN;

-- `PUBLIC` is included so that a role created later, inheriting whatever this
-- database grants to everybody, does not silently acquire what is being taken
-- away here. `service_role` is the target: it carries `BYPASSRLS`, so no policy
-- constrains it, and a table grant is the only thing that can.
REVOKE INSERT, UPDATE, DELETE ON public.membership_acts
  FROM PUBLIC, service_role;

-- Reading is unchanged and is stated rather than assumed. For `service_role`,
-- which bypasses RLS, this is now the whole of its access to the table: read,
-- and nothing else.
GRANT SELECT ON public.membership_acts TO service_role;

COMMENT ON TABLE public.membership_acts IS
  'D-11 / ACCT-04: the register of acts on a member''s role and status. Append-only, and append-only against its own writer, by two mechanisms: '
  'RLS with no write policy refuses anon, authenticated and every user session; the REVOKE of 20260808005000 refuses service_role, '
  'which carries BYPASSRLS and would otherwise be able to rewrite or delete the rows recording the acts it performs. '
  'The only write path is public.record_membership_act, which runs as its definer.';

COMMIT;
