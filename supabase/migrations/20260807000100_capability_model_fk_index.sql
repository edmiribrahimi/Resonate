-- The index the previous migration owed, found by the advisor and not by review
-- Phase 32, Plan 06: a correction forward, because 20260807000000 is applied
--
-- Changes:
-- 1. Create an index on private.role_capabilities (capability), the column of
--    role_capabilities_capability_fkey
--
-- One statement, but still BEGIN; ... COMMIT;, for the same reason as every
-- other migration in this directory: the transaction is the unit, not the
-- statement count.
--
-- WHY THIS EXISTS, and why it is a second file rather than an edit.
--
-- `20260807000000_capability_model.sql` created private.role_capabilities with
-- `primary key (role, capability)` and a foreign key on `capability`. The
-- primary-key index leads on `role`, so the foreign key's own column has no
-- index that can serve it. The Supabase performance advisor caught it
-- immediately: `unindexed_foreign_keys` moved 35 -> 36, and the single added
-- entity was `role_capabilities/role_capabilities_capability_fkey`. Nothing
-- else moved it.
--
-- `supabase-data.md`, gate *migration in avanti*: 20260807000000 is applied to
-- production and is therefore a historical fact. It is not edited; this file
-- corrects it forward.
--
-- `supabase-data.md`, gate *indici sulle colonne di lookup*: the gate is
-- written for lookup columns, and this repository already treats the advisor's
-- count as the mechanical form of it. The honest measurement is that at
-- sixteen rows the planner will seq-scan this table whatever indexes exist, so
-- **this index is not here for speed** — it is here because
-- `unindexed_foreign_keys` is one of the three structural lints the phase's
-- comparator PINS (plan 32-05), and a pinned invariant left broken has to be
-- waved through with `--allow-lint-move` on every later comparison in this
-- phase. That flag would then also absorb a genuinely new unindexed foreign key
-- added by a later plan. Restoring the pin costs one index; leaving it broken
-- costs the oracle six waves of sharpness.
--
-- This index changes no behaviour: an index cannot widen or narrow what a role
-- may read or write. B1, B2 and B3 must be unchanged by it, and are re-captured
-- to show so rather than assumed.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_role_capabilities_capability
  ON private.role_capabilities (capability);

COMMIT;
