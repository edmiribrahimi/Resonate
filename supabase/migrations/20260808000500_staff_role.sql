-- The fourth role: `staff` — and the two capabilities it holds, no more
-- Phase 43, Plan 05: ROLE-01, with the six refusals visible as decisions
--
-- Changes:
-- 1. public.profiles — drop and re-add `profiles_role_check` so `role` admits
--    a fourth value, `staff`
-- 2. private.role_capabilities — drop and re-add `role_capabilities_role_check`
--    for the same four values, because `role` is constrained in TWO places
-- 3. Two grant rows for `staff`: `membership.card.view` and `membership.active`,
--    both with `requires_approved = true`
--
-- Three statements, ONE transaction. A half-applied version of this file is
-- strictly worse than none of it: a database that admits `role = 'staff'` but
-- whose `private.role_capabilities` still refuses the row is a database in which
-- a staff account can exist and **cannot see its own membership card** — which
-- is the entire purpose of the role (D-01). The card is how someone who worked a
-- single date gets back in through the door, so the half-applied state is not an
-- inconvenience: it is an account that was promised entry and does not have it.
-- BEGIN; ... COMMIT; is therefore not decoration here either.
--
-- `supabase-data.md`, gate *migration in avanti*. Both files this one corrects
-- are applied to production and are therefore historical facts that are NOT
-- edited:
--
--   * `20260224_rbac_migration.sql:13-15` added `role` with the three-value
--     CHECK that production enforces today;
--   * `20260807000000_capability_model.sql:120-125` created
--     `private.role_capabilities` with a second, independent three-value CHECK.
--
-- Neither is touched. This file corrects both forward, in the same transaction,
-- which is the same discipline `20260807000100_capability_model_fk_index.sql`
-- followed when the advisor found the index its predecessor owed.
--
-- WHY BOTH CONSTRAINTS ARE NAMED EXPLICITLY RATHER THAN DERIVED. Postgres
-- auto-names a CHECK `<table>_<column>_check`, and both live names happen to
-- match that rule — but they were **read from `pg_constraint`** on 2026-08-08
-- rather than derived from it (`43-MEASUREMENTS.md` measurement 2, both
-- `convalidated = true`). A derived name that is wrong produces a silent no-op
-- on `DROP ... IF EXISTS` followed by a duplicate-name error on the `ADD`, and
-- the phase would learn about it from a failing deploy rather than from a query.
--
-- Idempotence: `IF EXISTS` on both drops, `ON CONFLICT (role, capability) DO
-- NOTHING` on the insert. The two `ADD CONSTRAINT`s cannot take `IF NOT EXISTS`
-- — no Postgres version supports it for table constraints — but they are
-- preceded by their own drop, so re-running the file is safe.

BEGIN;

-- =============================================================================
-- 1. public.profiles — the constraint production actually enforces
-- =============================================================================
--
-- Widening an `IN` list is a **strict relaxation**: every value the old
-- constraint admitted, the new one admits too. So every existing row already
-- satisfies it, the validating scan Postgres runs on `ADD CONSTRAINT` cannot
-- fail, and `NOT VALID` is neither needed nor wanted here.
--
-- That word belongs to exactly one constraint in this phase — plan 43-06's
-- `role ⇒ approved`, which is a **restriction** and whose `NOT VALID` variant
-- was measured to freeze any pre-existing violating row against every future
-- update on every column (`43-RESEARCH.md` § B.1b). Production holds zero such
-- rows (`43-MEASUREMENTS.md` measurement 1), so 43-06 adds its constraint
-- VALIDATED. Writing `NOT VALID` here out of caution would be cargo-culting a
-- decision that belongs to a different constraint.
--
-- Cross-domain note (`meta-gates.md`): this widens WHAT MAY BE STORED, and
-- nothing else. No policy is touched, no GRANT is altered, no function is
-- redefined. A `staff` row cannot exist yet — nothing in this file creates one —
-- so no RLS verdict and no write-matrix cell can move because of it.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'member'));

-- =============================================================================
-- 2. private.role_capabilities — the second constraint, and why skipping it
--    would break this file in its own transaction
-- =============================================================================
--
-- `role` is constrained in TWO places, not one. This one guards the grant table
-- (`20260807000000_capability_model.sql:121`), and its comment there says why it
-- exists: it *"mirrors `UserRole` in `src/types/database.ts`"*. A mirror that is
-- only half-updated is no longer a mirror.
--
-- What is missed by widening only section 1: the two grant rows in section 3
-- would be refused with SQLSTATE **23514** against THIS constraint. Because all
-- three statements share one transaction, that refusal aborts the whole file and
-- nothing is applied — which is the outcome this file wants, and the reason the
-- three are not three files. The failure mode being designed against is the
-- other one: two separate migrations, the first applied and the second not, and
-- a production database that admits a role holding no capabilities at all.

ALTER TABLE private.role_capabilities
  DROP CONSTRAINT IF EXISTS role_capabilities_role_check;

ALTER TABLE private.role_capabilities
  ADD CONSTRAINT role_capabilities_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'member'));

-- =============================================================================
-- 3. The two grant rows — and they are the behaviour, not fixtures
-- =============================================================================
--
-- `on conflict do nothing`, in the shape of the seed this file extends
-- (`20260807000000_capability_model.sql:390-423`), so a re-run never silently
-- rewrites a `requires_approved` that a later migration deliberately changed.

INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  -- D-01 — THE ONE THING THE ROLE GRANTS. Entry to a night through the
  -- membership card, permanently, including for someone who worked a single
  -- date. Middleware rule for /membership-card and /attendance
  -- (src/lib/supabase/middleware.ts:108-112): status = approved, ANY role — so
  -- `requires_approved = true`, exactly as the three existing roles carry it.
  --
  -- That `true` is not a gate this role can fail: plan 43-06's `role ⇒ approved`
  -- rule makes `status = 'approved'` a database-enforced property of every
  -- `staff` row, so the flag is always satisfied for a staff account and stays
  -- honest about the predicate it reproduces.
  ('staff', 'membership.card.view', true),

  -- D-14 — every account is a member of the community, and refusing this would
  -- make `staff` the only role that cannot RSVP to a night.
  --
  -- **THIS DOES NOT WEAKEN D-03.** A `member` already holds `membership.active`
  -- (`20260807000000_capability_model.sql:405`), so `staff` gains nothing here
  -- that a member lacks — it is levelled UP to member, not up from it. The
  -- upload ROLE-01 refuses is Phase 35's **per-night work** upload, the
  -- photographer uploading to the night they worked, which expires with the
  -- night; it is not the member-level contribution every approved account
  -- already has. This sentence is written into the migration because
  -- *"staff can upload photos"* is how a reader would otherwise summarise this
  -- row, and that summary is exactly what D-03 forbids.
  ('staff', 'membership.active', true)
ON CONFLICT (role, capability) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3b. THE SIX REFUSALS — decisions, expressed as the ABSENCE of a row
-- -----------------------------------------------------------------------------
--
-- `staff` receives NONE of:
--
--     door.operate        staff.manage        catalogue.manage
--     organizer.access    admin.access        master.manage
--
-- Each of the six is a **decision** (D-02, D-03), not an omission. Work
-- permissions are not granted by the role: they come from the per-night
-- assignment of Phase 35 and expire with the night. A role that carried them
-- permanently would let a power granted for one door leak into every later
-- night, and into every trade.
--
-- HOW A REFUSAL IS EXPRESSED, and the trap that inverts it. A refusal is the
-- absence of a row — there is deliberately **no `granted` column** on this
-- table. The resolver at `20260807000000_capability_model.sql:209-216` is:
--
--     select exists (
--       select 1 from public.profiles p
--       join private.role_capabilities rc on rc.role = p.role
--       where p.id = (select auth.uid())
--         and rc.capability = p_capability
--         and (not rc.requires_approved or p.status = 'approved')
--     );
--
-- There is no `granted` in that `EXISTS`. A `granted = false` row would
-- therefore **GRANT** the capability — reading as an explicit denial to a human
-- and as a permission to Postgres, in every policy call site at once. Anyone
-- adding such a column must edit that resolver in the same migration; while the
-- declaration described below carries the meaning, the column should not be
-- added at all.
--
-- WHERE THE SIX ARE ASSERTED, so this comment is a pointer to a mechanism and
-- not a substitute for one: `scripts/verify-capabilities.mjs`, side 5. Its
-- `ROLE_GRANTS` constant declares all 32 (role × capability) pairs — 18 grants
-- and 14 refusals after this file — and fails, naming the pair, both when a
-- declared refusal acquires a row and when a declared grant loses one. Proved by
-- mutation in three directions on 2026-08-08. A comment can be ignored; that
-- check exits 1.
--
-- AND ONE ROW THAT MUST NOT MOVE WHILE ANYONE IS IN HERE. `door.operate` carries
-- `requires_approved = false` for `master` and `organizer`
-- (`20260807000000_capability_model.sql:414-417`, *"These two rows must not
-- become true"*). Once 43-06's `role ⇒ approved` constraint exists those two
-- flags will LOOK redundant, and flipping them is the ROADMAP's declared trap to
-- refuse. The two guard different things: the constraint protects the database,
-- those flags protect the night from the day the constraint is relaxed for one
-- special case. Refusing a valid staff member at the door, in front of a queue,
-- at two in the morning, is worse than the alternative — the first error happens
-- in front of people. **If `staff` is ever granted `door.operate` by a later
-- phase, it takes the same treatment for the same reason.**

COMMIT;
