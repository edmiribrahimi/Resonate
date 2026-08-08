-- The resolver's second arm — three keys, and the per-night source that makes
-- them mean something
-- Phase 35, Plan 03: ASSIGN-01, ASSIGN-02, ASSIGN-05
--
-- Changes:
-- 1. private.capabilities / private.role_capabilities — THREE new keys —
--    `door.supervise`, `media.upload`, `party.manage` — with twelve decisions
--    behind them: six grants, and six refusals that are the ABSENCE of a row
-- 2. private.has_capability(text, uuid) — re-issued with a SECOND ARM: the
--    per-night assignment, read from `public.party_assignments`, and switched
--    OFF when no night is named
-- 3. public.my_access_context(uuid) — an OVERLOAD, not a change of signature:
--    the same payload as the argument-less version, with the capabilities
--    resolved ON THAT NIGHT
--
-- Three changes, ONE transaction, and no half stands alone:
--
--   * the keys without the arm are three catalogue rows nothing can ever
--     satisfy — the only source that would answer `true` for them is the arm,
--     since none of the three is conferred by any role for a night;
--   * the arm without the keys reads a table whose
--     `party_assignments_capability_assignable` names four keys of which the
--     catalogue holds one, so the second source could only ever resolve
--     `door.operate` — a per-night model with three quarters of its vocabulary
--     missing, which reads as working;
--   * and a key in the catalogue whose grant rows did not land is a permission
--     nobody holds and every caller can ask for, while a grant row whose
--     catalogue key did not land cannot exist at all
--     (`private.role_capabilities.capability` references
--     `private.capabilities(key)`);
--   * the arm without the overload is a per-night answer that only a policy can
--     ask for. The data-access layer reaches this model through ONE exposed
--     function, so without change 3 nothing outside a policy body can pose the
--     question at all — and a guard that cannot ask falls back to the role,
--     which is the shape the whole phase exists to replace.
--
-- So `BEGIN; ... COMMIT;` is not decoration here either.
--
-- THIS FILE CHANGES NO POLICY. Not one of the seventy row-level policies is
-- touched, added or removed — and that is the entire reason the second source
-- goes into the resolver's body instead of beside them. Every one of those
-- predicates already calls this function, so the arm reaches all of them at
-- once, with no widening on any table the phase did not intend
-- (`35-RESEARCH.md` § Pitfall 4). The assertion is not left as a claim: B1 after
-- this file must be byte-identical to the `35-02` capture.
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

-- =============================================================================
-- 3. private.has_capability — the second arm, and the line that is ASSIGN-01
-- =============================================================================
--
-- The resolver was written with this edit in mind and says so:
-- `20260807000000_capability_model.sql:201-208` reads *"A second source — a
-- per-night assignment — is added by a later phase as another arm of this same
-- OR, by editing this body. No policy and no caller changes when it lands."*
-- and *"`p_party_id` is accepted and unused today, deliberately."* This is that
-- phase, and the promise is kept literally: same name, same argument list, same
-- volatility class, same `SECURITY DEFINER`, same empty `search_path` — so
-- every existing call site is untouched and the `EXECUTE` privileges survive
-- the replacement.
--
-- ── THE FIRST ARM IS REPRODUCED BYTE FOR BYTE ───────────────────────────────
--
-- Not paraphrased and not improved. It is the predicate seventy policies are
-- currently measured against, and the captured B2/B3 matrices are the evidence
-- that they admit who they admit. A re-worded arm would make every one of those
-- cells a claim again.
--
-- ── THE NULL GUARD IS THE FIRST CONDITION, AND IT IS NOT DEFENSIVE ──────────
--
-- **It is ASSIGN-01**, which promises that an assignment gives somebody a
-- night's tools *"without changing what they can do on any other night"*.
--
-- The seventy live policies call this function with ONE argument, so
-- `p_party_id` is `NULL` in every one of them. Without the guard the arm would
-- be a rule about the whole database: an equality against a NULL night is `NULL`
-- and not `false`, so the shape that looks tolerant — coalescing the argument
-- with the row's own night column, which a reader may propose as "match any
-- night when none is asked for" — makes ONE night's assignment resolve `true`
-- EVERYWHERE, on every table, for ever (`35-RESEARCH.md` § Pitfall 1). That is
-- the exact opposite of what the assignment is for, and it would arrive
-- silently: no error, no failed build, no changed policy text.
--
-- (The guard and the wrong shape are DESCRIBED here rather than written out.
-- The plan's own check for this file asserts that the guard appears once and
-- before the night comparison, so a paragraph quoting either literally would be
-- the only match and the check would have to be read around — which is a check
-- that gets ignored the third time it goes red. Same choice, for the same
-- reason, as `20260809000000_party_assignments.sql` made for the zone offsets.)
--
-- THE ALARM THAT WOULD MEAN THIS LINE IS WRONG, written down so it is
-- recognised rather than reasoned about: a cell of the B3 write matrix moving on
-- a table this phase never touched.
--
-- ── `now() < pa.ends_at` IS ASSIGN-02, ON THE SIDE THAT DECIDES ─────────────
--
-- `now()` is the SERVER's clock. There is no argument a caller can send to move
-- it and no device setting that reaches it — which is the whole difference
-- between this line and an expiry evaluated on a phone. The device's own copy of
-- a deadline decides what it DRAWS; this decides what is permitted
-- (`src/app/api/membership/verify/route.ts:412`, *"a device clock is evidence,
-- never authority"*). `now()` is left unqualified deliberately: `pg_catalog` is
-- searched implicitly even under `search_path = ''`, and it is the one schema a
-- caller cannot shadow.
--
-- ── `pa.revoked_at is null` IS ASSIGN-03 ───────────────────────────────────
--
-- A revocation UPDATES the row; it never deletes it
-- (`20260809000000_party_assignments.sql:214-220`), because the offline drain
-- has to be able to ask *"was this live at 01:40?"* at 03:00. So the arm must
-- EXCLUDE revoked rows rather than expect them to be absent — an arm written on
-- the assumption that a revoked assignment has disappeared keeps resolving
-- `true` after every revocation this product performs.
--
-- ── WHY THIS ARM READS NEITHER `requires_approved` NOR `status` ─────────────
--
-- The next reader will ask, so: it is not an omission.
--
-- `party_assignments_live_role_present` and the composite key
-- `party_assignments_assignee_role_fk` together mean that only a `master`, an
-- `organizer` or a `staff` account can hold a LIVE assignment, checked by the
-- database on every write including the service client's. Beside phase 43's
-- `profiles_role_implies_approved` — applied to production on 2026-08-08 — every
-- account holding one of those three roles IS `approved`, as a rule of the
-- database rather than as a habit of the writer. So the question *what if the
-- assignee is pending* does not need an answer here: it cannot arise.
--
-- AND A STATUS TEST HERE WOULD BE A NEW WAY TO REFUSE SOMEBODY AT THE DOOR. It
-- would add a second, independent condition that a valid assignee could fail —
-- for a state that the structure already forbids — and refusing a valid member
-- of staff in front of a queue is the failure this project holds to be the worse
-- of the two (`CLAUDE.md`, operating principle 3). The right place for the rule
-- is the constraint that makes the bad state unreachable, and it is already
-- there.

CREATE OR REPLACE FUNCTION private.has_capability(
  p_capability text,
  p_party_id   uuid default null
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- ARM 1 — the role grant. Byte-identical to
  -- `20260807000000_capability_model.sql:209-216`.
  select exists (
    select 1
    from public.profiles p
    join private.role_capabilities rc on rc.role = p.role
    where p.id = (select auth.uid())
      and rc.capability = p_capability
      and (not rc.requires_approved or p.status = 'approved')
  )
  -- ARM 2 — the per-night assignment. A subject holds a capability if ANY
  -- source says so, and this is the second and last source today.
  or exists (
    select 1
    from public.party_assignments pa
    -- ASSIGN-01, and it is the FIRST condition on purpose. Every existing
    -- caller passes no night, so this is what keeps one night's assignment
    -- from becoming a permission everywhere. See the paragraph above.
    where p_party_id is not null
      and pa.party_id = p_party_id
      and pa.user_id = (select auth.uid())
      and pa.capability = p_capability
      -- ASSIGN-03: a revocation is a row that was updated, never one that was
      -- removed.
      and pa.revoked_at is null
      -- ASSIGN-02, on the server's clock, which no device can move.
      and now() < pa.ends_at
  );
$$;

-- Re-issued rather than assumed. `CREATE OR REPLACE` keeps the existing ACL
-- because the signature is unchanged, so this line repairs nothing on THIS
-- database — it is here for the other one: an environment replaying these files
-- from empty must reach the same exposure boundary without depending on a
-- retention rule nobody read. `anon` is included for the reason stated at
-- `20260807000000_capability_model.sql:219-223`: a policy predicate runs with
-- the QUERYING role's privileges, and 47 of the live policies apply to
-- `{public}`. For `anon`, `auth.uid()` is null, both arms find nothing, and the
-- privilege buys a correct `false` rather than access.
GRANT EXECUTE ON FUNCTION private.has_capability(text, uuid) TO authenticated, anon;

-- =============================================================================
-- 4. public.my_access_context(uuid) — the per-night question, exposed once
-- =============================================================================
--
-- An OVERLOAD. The argument-less `public.my_access_context()` is left exactly as
-- it stands (`20260808000000_access_context_user_id.sql`), with its two callers
-- — `src/lib/supabase/middleware.ts:90` and `src/lib/capabilities/server.ts:202`
-- — untouched. This file adds a SECOND function with the same name and a
-- different argument list, which in Postgres is a second object.
--
-- ── WHY AN OVERLOAD AND NOT ONE FUNCTION WITH AN OPTIONAL ARGUMENT ──────────
--
-- The alternative was changing the existing function to take a defaulted
-- `uuid`. The replace-in-place form cannot do that — Postgres refuses a
-- signature change with `42P13` — so the existing function would have to be
-- removed and re-created inside this transaction.
--
-- THAT IS THE ONE THING NOT TO DO HERE, and the reason is not stylistic. This
-- queue is applied BY HAND, one row at a time (`35-HUMAN-UAT.md`). Removing and
-- re-creating leaves a window in which the function does not exist — and if the
-- transaction is interrupted in that window, the window does not close. The
-- function it would leave missing is the one `src/lib/supabase/middleware.ts`
-- calls on EVERY navigation, which means every scan, on a phone, on a bad
-- network, in front of a queue. An overload cannot produce that state: until
-- `COMMIT`, nothing that exists has been taken away.
--
-- (The removal statement is DESCRIBED and not written out, deliberately: the
-- plan's check for this file asserts the file does not contain it, and a check
-- whose only match is the sentence forbidding the thing is a check that gets
-- ignored. Same choice `20260809000000_party_assignments.sql` made for the zone
-- offsets and the update cascade.)
--
-- ── THE OBJECTION SOMEBODY WILL MAKE IN GOOD FAITH, AND ITS ANSWER ──────────
--
-- `20260807000000_capability_model.sql:231-237` refuses an exposed function that
-- takes an identifier, and the reason it gives is measured rather than
-- stylistic: a `has_capability(user_id, capability)` reachable over REST would
-- be a free enumeration oracle, and **this repository has no rate limiting
-- anywhere** (verified 2026-08-05). Normally the mitigation for an oracle is a
-- limiter; there is none to add, so the SHAPE of the API is the mitigation.
--
-- `p_party_id` IS NOT THAT SHAPE. The rule forbids naming a SUBJECT — *whom
-- shall I answer about* — and this argument names a CONTEXT — *in which night*.
-- The function still answers about `auth.uid()` and about nobody else, because
-- it is still not given any way to name anybody else: both arms of the resolver
-- it calls are anchored on the caller's own id. A caller passing a night they
-- have no assignment for learns exactly what they already knew — their own role
-- capabilities — and a caller passing a night that does not exist learns the
-- same. Nothing about any other person, and nothing about the night itself,
-- crosses this boundary.
--
-- Without this paragraph somebody will refuse the function for the right rule
-- and the wrong reason, and the phase will lose the only way its guards have to
-- ask a per-night question.
--
-- ── THE PAYLOAD IS THE SAME PAYLOAD ─────────────────────────────────────────
--
-- The same four keys as the argument-less version — `capabilities`, `user_id`,
-- `role`, `status` — in the same order, with no key added. The ONLY difference
-- is that the capability list is resolved for `p_party_id`, which by the
-- resolver's `OR` is the UNION of what the caller's role confers and what their
-- live assignment on that night confers. A different set of keys here would make
-- the two versions two payload shapes, and the layer that reads them would need
-- to know which one it called.
--
-- `role` and `status` are carried for the reason stated at
-- `…capability_model.sql:243-252` and re-stated at
-- `20260808000000_access_context_user_id.sql`: they are values two client
-- components still take as props, and their removal belongs to the phase that
-- deletes that transport. **No new caller may branch on them.** Every new
-- decision asks the capability array.

CREATE OR REPLACE FUNCTION public.my_access_context(p_party_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- The capability list is DERIVED from the predicate — one call to
  -- private.has_capability per catalogue row — and is deliberately NOT a second
  -- copy of the profiles-to-grants join, nor a second copy of the assignment
  -- lookup. Two implementations of one rule are two definitions, and two
  -- definitions drift, which is the single thing CAP-01 forbids. The join and
  -- the assignment arm exist once, in section 3 above, and this function asks
  -- them questions.
  select jsonb_build_object(
    'capabilities', coalesce(
      (
        select jsonb_agg(c.key order by c.key)
        from private.capabilities c
        where private.has_capability(c.key, p_party_id)
      ),
      '[]'::jsonb
    ),
    'user_id', (select auth.uid()),
    'role', (
      select p.role from public.profiles p where p.id = (select auth.uid())
    ),
    'status', (
      select p.status from public.profiles p where p.id = (select auth.uid())
    )
  );
$$;

-- The exposure boundary, written as two statements in this order and never
-- assumed — and written FOR THE NEW SIGNATURE, which is the part that is easy to
-- get wrong. `CREATE OR REPLACE` retains the ACL of the function it replaces,
-- but this is not a replacement: it is a NEW object, and Postgres grants
-- `EXECUTE` to `PUBLIC` by default on every new function. The argument-less
-- version's REVOKE does not reach here. Without the first line below, this
-- function would be live to an anonymous request at
-- `/rest/v1/rpc/my_access_context`.
REVOKE ALL ON FUNCTION public.my_access_context(uuid) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.my_access_context(uuid) TO authenticated;

COMMENT ON FUNCTION public.my_access_context(uuid) IS
  'Phase 35: the per-night form of public.my_access_context(). Same four payload keys, with capabilities resolved for p_party_id '
  '- the union of what the caller''s role confers and what their live, unrevoked, unexpired assignment on that night confers. '
  'It is an OVERLOAD and not a signature change: the argument-less version is what the middleware calls on every navigation, '
  'and removing it inside a hand-applied queue would leave a window in which it does not exist. '
  'p_party_id names a CONTEXT, never a SUBJECT: the function still answers about auth.uid() and has no way to name anybody else, '
  'which is why it does not become the enumeration oracle capability_model.sql:231-237 refuses. '
  'EXECUTE is revoked from public, anon and authenticated, and then given to authenticated alone.';

COMMIT;
