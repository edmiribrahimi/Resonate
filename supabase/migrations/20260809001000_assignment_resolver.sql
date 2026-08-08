-- The resolver's second arm — three keys, and the per-night source that makes
-- them mean something
-- Phase 35, Plan 03: ASSIGN-01, ASSIGN-02, ASSIGN-05
--
-- Changes:
-- 1. private.capabilities / private.role_capabilities — THREE new keys —
--    `door.supervise`, `media.upload`, `party.manage` — with twelve decisions
--    behind them: six grants, and six refusals that are the ABSENCE of a row
--
-- One change, ONE transaction, and even alone it is not divisible: a key in the
-- catalogue whose grant rows did not land is a permission nobody holds and every
-- caller can ask for, and a grant row whose catalogue key did not land cannot
-- exist at all (`private.role_capabilities.capability` references
-- `private.capabilities(key)`). So `BEGIN; ... COMMIT;` is not decoration here
-- either.
--
-- The template for this file is `20260808002000_membership_register.sql`
-- section 1 — the previous phase minting a key, with its grant rows, its
-- refusals declared elsewhere, and the paragraph that points at the mechanism
-- instead of standing in for one.
--
-- WHY THREE KEYS AND NOT A REUSE. The rule is
-- `src/lib/capabilities/keys.ts:38-45`: a key is named after the QUESTION it
-- answers, never after the predicate it happens to resolve to. That rule is why
-- `staff.manage`, `organizer.access` and `door.operate` are three keys sharing
-- one predicate rather than one key, and it is why a per-night assignment can
-- hand somebody one night's door without also handing them sixteen tables.
-- `20260809000000_party_assignments.sql:340-342` already names all four
-- assignable keys in `party_assignments_capability_assignable`; three of them
-- have had no row to point at since that file was applied, and this is the file
-- that gives them one.
--
-- IDEMPOTENZA — WR-04 della code review del 2026-08-08. Questa coda si applica
-- A MANO, una riga alla volta (`35-HUMAN-UAT.md`), e chi ri-esegue per sicurezza
-- dopo un dubbio deve poterlo fare. `ON CONFLICT (key) DO NOTHING` sul
-- catalogo e `ON CONFLICT (role, capability) DO NOTHING` sui grant: una seconda
-- esecuzione non riscrive una `description` e non ribalta un `requires_approved`
-- che una migration successiva avesse deliberatamente cambiato.

BEGIN;

-- =============================================================================
-- 1. Three keys, each named by the question it answers
-- =============================================================================
--
-- ── `door.supervise` — and why it is not `door.operate` and not `staff.manage`
--
-- The question is *may this subject REVERSE a check-in that has already been
-- recorded at the door*, and it is a different question from *may this subject
-- work the door*. ASSIGN-05 is exactly that distinction: undoing a check-in is
-- refused for somebody assigned only to the door for that night, and allowed for
-- the night's organizer.
--
-- The two reuses that look obvious are both wrong, and in opposite directions:
--
--   * `staff.manage` would hand the supervision of one door thirty-four
--     policies' worth of back office — events, parties, tickets, tiers, drinks,
--     guest lists, media moderation — for ever;
--   * `door.operate` would make EVERY operator a supervisor, which is the one
--     thing ASSIGN-05 forbids. The undo is the cheapest way to admit somebody
--     who was refused, so it is the one action at the door that must be
--     attributable to a person who was put there to hold it.
--
-- ── `media.upload` — the key that did not exist, which is why the trade did not
--
-- The question is *may this subject add media to this night*. It is ASSIGN-01's
-- «photo» trade, and until this row there was no way to express it: the trade
-- existed in the plan and the key did not, so a photographer could not be given
-- the night they worked without being given something permanent instead.
--
-- Not `membership.active`, which every approved account already holds and which
-- is the MEMBER-level contribution — the one
-- `20260808000500_staff_role.sql:125-136` is careful to distinguish from this
-- one, in a paragraph written precisely so this key would not be confused with
-- it: *"the upload ROLE-01 refuses is Phase 35's per-night work upload, the
-- photographer uploading to the night they worked, which expires with the
-- night"*.
--
-- ── `party.manage` — one night's surfaces, and deliberately not the area
--
-- The question is *may this subject manage the operational surfaces OF THIS
-- NIGHT*. It is ASSIGN-01's «organizer» trade scoped to a single date.
--
-- Deliberately NOT `organizer.access`, and the difference is the whole point:
-- that key answers *may this subject reach the organizer AREA*, which is a
-- property of the account and has no night in it. A per-night assignment
-- carrying `organizer.access` would open the area itself, permanently in effect
-- for as long as any night is live, which is a widening of the gating model and
-- not a night's work (`CLAUDE.md`, operating principle 1).

INSERT INTO private.capabilities (key, description) VALUES
  (
    'door.supervise',
    'Reverse a check-in already recorded at the door. ASSIGN-05: a DIFFERENT question from door.operate, which is may this subject work the door. Reusing door.operate would make every operator a supervisor; reusing staff.manage would hand one night''s supervision the whole back office for ever. Per-night assignable (party_assignments_capability_assignable).'
  ),
  (
    'media.upload',
    'Upload media to a night. ASSIGN-01''s photo trade, scoped to the night that was worked. NOT membership.active, which is the member-level contribution every approved account already holds — the distinction 20260808000500_staff_role.sql:125-136 states. Per-night assignable.'
  ),
  (
    'party.manage',
    'Manage one night''s operational surfaces. ASSIGN-01''s organizer trade for a single date. Deliberately NOT organizer.access, which answers may this subject reach the organizer AREA — a property of the account with no night in it. Per-night assignable.'
  )
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 2. Twelve decisions — six rows, and six absences that are decisions too
-- =============================================================================
--
-- HOW A REFUSAL IS EXPRESSED, and the trap that inverts it. A refusal is the
-- ABSENCE of a row. There is deliberately no boolean column on
-- `private.role_capabilities` saying *no*, and adding one would not express a
-- denial: the resolver's `EXISTS`
-- (`20260807000000_capability_model.sql:209-216`) matches on `(role,
-- capability)` and reads no such column, so a row meant as a refusal would hand
-- the capability to that role in every policy call site at once — reading as an
-- explicit denial to a human and as a permission to Postgres. This is stated in
-- two applied migrations already (`20260808000500_staff_role.sql:154-171`,
-- `20260808002000_membership_register.sql`), and it is stated again here because
-- three keys arriving at once is exactly when somebody reaches for a tidier
-- shape.
--
-- WHERE THE SIX REFUSALS ARE ASSERTED, so this paragraph points at a mechanism
-- rather than substituting for one: `scripts/verify-capabilities.mjs`, side 5.
-- Its `ROLE_GRANTS` declares every (role × capability) pair — **48 after this
-- file, 26 grants and 22 refusals** — and exits 1 naming the pair both when a
-- declared refusal acquires a row and when a declared grant loses one. A comment
-- can be ignored; that check cannot.
--
-- ── THE TWO `false` ON `door.supervise`, AND THEY DO NOT GET CLEANED UP ──────
--
-- `door.supervise` carries `requires_approved = false` on BOTH grants, for the
-- same reason `door.operate` does and with the same instruction attached:
-- **these two rows must not become true.**
--
-- Beside phase 43's `role ⇒ approved` constraint
-- (`20260808001000_role_implies_approved.sql`) the flag will LOOK redundant, and
-- somebody will propose flipping it as tidying. That is the ROADMAP's declared
-- trap to refuse, and the two guard DIFFERENT things: the constraint protects
-- the DATABASE, this flag protects the NIGHT from the day the constraint is
-- relaxed for one special case. The asymmetry that decides it is unchanged and
-- it is this file's subject matter — a supervisor who cannot reverse a wrong
-- refusal is a queue that stays refused, in front of people, at two in the
-- morning.
--
-- `media.upload` and `party.manage` take `true` instead, and the difference is
-- not an inconsistency: neither of them is at the door. Nothing about a photo
-- upload or a night's back-office surface happens in front of a queue, so the
-- reason the two door flags are `false` does not reach them, and an account
-- whose own access was never approved has no business on either.
--
-- ── AND THE REFUSAL OF `media.upload` TO `staff` IS THE POINT OF THE PHASE ───
--
-- Being `staff` does NOT confer the ability to upload a night's media. A
-- photographer gets it from the ASSIGNMENT, for the night they worked, and it
-- expires with that night. That refusal is what makes the per-night model a
-- mechanism instead of a decoration of the role: if the role carried the key,
-- every past collaborator would keep uploading to every future night, and the
-- assignment would be a label on something that was true anyway. D-03 says work
-- permissions are not conferred by the role; these three keys are the first test
-- of whether that was meant.

INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  -- ASSIGN-05. `false` on both, and see the paragraph above before changing it.
  ('master',    'door.supervise', false),
  ('organizer', 'door.supervise', false),

  -- The role-level upload for the two roles that already hold the whole back
  -- office. `true`: not at the door, so the door's reason does not apply.
  ('master',    'media.upload',   true),
  ('organizer', 'media.upload',   true),

  -- The role-level counterpart of the per-night trade. `true`, same reason.
  ('master',    'party.manage',   true),
  ('organizer', 'party.manage',   true)
ON CONFLICT (role, capability) DO NOTHING;

-- The six refusals, written out so that «considered and refused» is
-- distinguishable from «forgotten» by reading, and asserted by side 5 of
-- `scripts/verify-capabilities.mjs` by running:
--
--   staff  × door.supervise    D-03. Working the door is the per-night
--                              assignment; SUPERVISING one is a narrower
--                              question still, and a role that carried it would
--                              let the supervision of one night reach every
--                              later night.
--   staff  × media.upload      D-03, and the paragraph above: this is the
--                              refusal the per-night model is FOR.
--   staff  × party.manage      D-03. A night's back office is a night's, and
--                              `staff` has no organizer surface at all.
--   member × door.supervise    Nothing grants it. A member holding it would
--                              reverse check-ins.
--   member × media.upload      Nothing grants it. The member-level contribution
--                              is `membership.active`, which they already hold.
--   member × party.manage      Nothing grants it.
--
-- `anon` is refused by construction and not by a row: `auth.uid()` is null for
-- it, so the resolver's first arm finds no profile
-- (`20260807000000_capability_model.sql:55-57`) and — from the next section of
-- this same file — the second arm finds no assignment.

COMMIT;
