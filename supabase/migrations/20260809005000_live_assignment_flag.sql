-- =============================================================================
-- Phase 35 · plan 15 — the COARSE question, inside the payload that is already
-- being fetched
-- =============================================================================
-- Requirement: ASSIGN-01.
--
-- Row 14 of the queue in `.planning/phases/35-per-night-assignments/35-HUMAN-UAT.md`
-- — the last row of block A2, the last one that must be applied BEFORE the code
-- of this phase is deployed. It is deliberately last in that block because the
-- function it edits is the one `src/lib/supabase/middleware.ts:90` calls on
-- EVERY request: it goes in when everything it reads is already standing.
--
-- WHAT THIS FILE DOES, and nothing else:
--
--   ONE new key — `live_assignment_capabilities` — added to the payload of BOTH
--   signatures of `public.my_access_context`. Nothing else changes: no table, no
--   column, no row-level policy, no capability key, no grant beyond the two
--   exposure boundaries re-stated below, and no new index (the reason is in
--   section 1c).
--
-- TWO OBJECTS, ONE TRANSACTION, and the halves are bad in opposite ways:
--
--   * `public.my_access_context()` alone, without the overload, gives the two
--     signatures two DIFFERENT payload shapes behind ONE TypeScript type
--     (`AccessContextResult`, `src/lib/capabilities/server.ts:190-195`). The
--     per-night form would then answer with the key ABSENT, and an absent key
--     read through a boolean coercion is a `false` — a refusal wearing the
--     costume of an answer. Which surface got which shape would depend on which
--     function it happened to call.
--   * the overload alone, without the argument-less form, adds the key to the
--     one signature the middleware does NOT call — which is the only caller this
--     key exists for.
--
-- So `BEGIN; ... COMMIT;` is not decoration here either.
--
-- IDEMPOTENCE — WR-04 of the 2026-08-08 code review. This queue is applied BY
-- HAND, one row at a time, and somebody who re-runs a file after a doubt must be
-- able to. `CREATE OR REPLACE FUNCTION` is the idempotent form for an object
-- that cannot take `IF NOT EXISTS`; neither signature changes, so no object has
-- to be removed and re-created first. That matters beyond tidiness: removing and
-- re-creating the argument-less function would open a window in which the
-- function the middleware calls on every navigation does not exist, and if the
-- transaction were interrupted in that window the window would not close. The
-- statement that would do it is DESCRIBED here and never written, for the same
-- reason `20260809001000_assignment_resolver.sql:396-400` gives: this plan's
-- check asserts the file does not contain it, and a check whose only match is
-- the sentence forbidding the thing is a check that gets ignored.
--
-- -----------------------------------------------------------------------------
-- TWO CORRECTIONS TO THE PLAN THAT COMMISSIONED THIS FILE, stated here because
-- an artefact with a timestamp is the place a later reader looks.
-- -----------------------------------------------------------------------------
--
--   1. `35-15-PLAN.md` calls this «la migration 12 della coda — l'ultima». It is
--      row **14** of **15**, and it is the last of block A2, not of the queue:
--      row 15 (`20260809006000_event_media_server_upload_only.sql`) is the one
--      row that is applied AFTER the code deploy. `35-HUMAN-UAT.md` is the only
--      place the application order is written in full and it is the authority;
--      the plan's count is the document to correct.
--
--   2. The plan calls `live_assignment_capabilities` the «quarta chiave». It is
--      the **fifth**. The plan's `<interfaces>` quotes the payload as
--      `capabilities`, `role`, `status` from
--      `20260807000000_capability_model.sql:262-297` — which is the definition
--      that migration SUPERSEDED. The applied payload has FOUR keys, because
--      `20260808000000_access_context_user_id.sql` added `user_id`, and that
--      file is applied in production (verified 2026-08-08 by query). All four
--      are reproduced below byte for byte: this migration ADDS, it does not
--      rewrite.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. The key, defined once here and written identically into both signatures
-- =============================================================================
--
-- ── 1a. THE QUESTION IT ANSWERS ─────────────────────────────────────────────
--
-- *«Does this subject hold ANY live assignment, and for which trades?»*
--
-- One question, not N. It goes inside the payload the middleware already asks
-- for, as a sub-select, and not as a second RPC: that path runs before every
-- request, which means before every scan at the door, on a phone, on a bad
-- network, in front of a queue. The same reasoning that put `role`, `status`
-- (`…capability_model.sql:243-252`) and `user_id`
-- (`20260808000000_access_context_user_id.sql`) in this payload rather than in a
-- call of their own. One key on a payload already in flight costs nothing.
--
-- ── 1b. WHAT THIS KEY IS NOT — and without this paragraph somebody will use it
--        as a permission ────────────────────────────────────────────────────
--
--   * IT DOES NOT SAY WHICH NIGHT. Saying so would require a night, and the
--     caller this key exists for — the middleware — DOES NOT KNOW ONE: at
--     routing time the person has not chosen a date yet. Adding the night
--     dimension here would mean asking N questions instead of one, on the path
--     that runs before every door scan. The per-night question has its own
--     function and always has: `public.my_access_context(p_party_id)`, and
--     `private.has_capability(key, party_id)` underneath it.
--
--   * IT IS NOT A SECURITY BOUNDARY. It is what lets a UX gate stop bouncing
--     somebody who has title to be there. The middleware decides where a person
--     may GO; it has never decided what they may READ (`CLAUDE.md`, operating
--     principle 2). The per-night boundary is `private.has_capability(key,
--     party_id)` inside the row-level policies, and `requireDoorOperator({
--     partyId })` on the three door routes that write with the service client —
--     which bypasses every policy, so on those three the guard is the only
--     boundary there is.
--
--   * IT IS WIDER THAN THE REAL PERMISSION, always and by construction. A
--     surface that settled for this key would be open to somebody holding an
--     assignment on ANOTHER night. That is not a defect to fix in a later file:
--     it is the price of asking one coarse question instead of N precise ones,
--     and it is written here, where whoever discovers the key reads it.
--
-- ── 1c. NO NEW INDEX, and the reason rather than the silence ────────────────
--
-- `idx_party_assignments_lookup` — `(user_id, party_id) WHERE revoked_at IS
-- NULL`, `20260809000000_party_assignments.sql:522-524` — has `user_id` as its
-- LEADING column and carries the same partial predicate this sub-select uses, so
-- it already serves this read. A second index on a table that was born four
-- rows ago is write cost with no read asking for it.
--
-- ── 1d. WHY THE SUB-SELECT SEES THE ROWS AT ALL, said out loud ──────────────
--
-- `public.party_assignments` has row-level security enabled with two SELECT
-- policies (`…party_assignments.sql`, section 3f). This function is
-- `SECURITY DEFINER`, so the read below runs as the function's owner and is not
-- filtered by them — exactly as arm 2 of `private.has_capability` already is
-- (`20260809001000_assignment_resolver.sql:341-356`). That is safe here for one
-- structural reason and not for a stylistic one: the predicate is anchored on
-- `pa.user_id = (select auth.uid())`, and NEITHER signature takes an argument
-- naming a subject. The function can only ever answer about the caller, which is
-- the shape rule `…capability_model.sql:231-237` states — and states because
-- this repository has NO rate limiting anywhere, so a function that answered
-- about an arbitrary identifier would be a free enumeration oracle with no
-- limiter available to put in front of it. The shape of the API is the
-- mitigation, and this file does not spend it.
--
-- ── 1e. THE THREE CONDITIONS, each one a requirement and not a precaution ───
--
--   `pa.revoked_at is null`  — ASSIGN-03. A revocation UPDATES the row, it never
--                              deletes it (`…party_assignments.sql:290-292`),
--                              because the offline drain must be able to ask
--                              *«was this live at 01:40?»* at 03:00. An
--                              expression written on the assumption that a
--                              revoked assignment has disappeared keeps
--                              answering `true` after every revocation this
--                              product performs.
--   `now() < pa.ends_at`     — ASSIGN-02, on the SERVER's clock. No argument a
--                              caller can send moves it and no device setting
--                              reaches it. `now()` is left unqualified
--                              deliberately even under `search_path = ''`:
--                              `pg_catalog` is searched implicitly and it is the
--                              one schema a caller cannot shadow.
--   `coalesce(…, '[]'::jsonb)` — never `null`, for the same reason
--                              `capabilities` avoids it: a consumer that has to
--                              tell «no rows» from «no key» must not ALSO have
--                              to tell them from «key present, value null».
--                              Three states are two too many, and the two that
--                              survive are the two that mean different things —
--                              see `src/lib/capabilities/server.ts`.
--
-- `distinct` is on the aggregate because one person can hold the same trade on
-- several live nights at once, and the answer to *«for which trades»* is a set,
-- not a tally.

-- =============================================================================
-- 2. public.my_access_context() — the one the middleware calls
-- =============================================================================
--
-- Signature unchanged, so this is a replacement of a live object and there is no
-- moment at which it is absent. The four existing keys are reproduced from the
-- applied definition (`20260808000000_access_context_user_id.sql:115-136`)
-- unchanged, in their order; the new key is APPENDED rather than threaded into
-- the middle, so the diff against the applied definition is a pure addition.

CREATE OR REPLACE FUNCTION public.my_access_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- The capability list is DERIVED from the predicate: one call to
  -- private.has_capability per catalogue row. It is deliberately NOT a second
  -- copy of the profiles-to-grants join. Two implementations of one
  -- table-driven rule are two definitions, and two definitions drift — which is
  -- the single thing CAP-01 forbids. The join exists once, in section 4 of
  -- 20260807000000_capability_model.sql, and this function asks it questions.
  select jsonb_build_object(
    'capabilities', coalesce(
      (
        select jsonb_agg(c.key order by c.key)
        from private.capabilities c
        where private.has_capability(c.key)
      ),
      '[]'::jsonb
    ),
    -- jsonb null for a caller with no session — which cannot happen through the
    -- granted path, since anon is revoked below, but the resolver treats an
    -- absent user_id as "nobody" rather than manufacturing one
    -- (src/lib/capabilities/server.ts).
    'user_id', (select auth.uid()),
    'role', (
      select p.role from public.profiles p where p.id = (select auth.uid())
    ),
    'status', (
      select p.status from public.profiles p where p.id = (select auth.uid())
    ),
    -- NEW in this migration, and the only difference from the applied
    -- definition. The COARSE question — see section 1, and 1b before using it
    -- for anything: it does not say which night, it is not a boundary, and it is
    -- wider than the permission it stands next to.
    'live_assignment_capabilities', coalesce(
      (
        select jsonb_agg(distinct pa.capability order by pa.capability)
        from public.party_assignments pa
        where pa.user_id = (select auth.uid())
          and pa.revoked_at is null
          and now() < pa.ends_at
      ),
      '[]'::jsonb
    )
  );
$$;

-- The exposure boundary, written as two statements rather than assumed.
-- `CREATE OR REPLACE` retains the existing ACL because the signature is
-- unchanged, so these two lines repair nothing on THIS database — they are here
-- for the other one: an environment replaying these files from empty must reach
-- the same boundary without depending on a retention rule nobody read. REVOKE
-- first, because Postgres grants EXECUTE to PUBLIC by default on every new
-- function, and without that line an anonymous request could call it.
REVOKE EXECUTE ON FUNCTION public.my_access_context() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_access_context() TO authenticated;

COMMENT ON FUNCTION public.my_access_context() IS
  'The session''s access context, in one payload and one round trip: capabilities, user_id, role, status, live_assignment_capabilities. '
  'The last key is Phase 35''s COARSE question — does this caller hold any live, unrevoked, unexpired assignment, and for which trades. '
  'It deliberately does NOT say which night: the middleware calls this on every request, before the person has chosen one. '
  'It is therefore WIDER than the real permission and is NOT a security boundary: a caller with an assignment on another night is inside it. '
  'The per-night question is public.my_access_context(p_party_id); the per-night boundary is private.has_capability(key, party_id) in the policies. '
  'Answers about auth.uid() and about nobody else: neither signature takes an argument naming a subject.';

-- =============================================================================
-- 3. public.my_access_context(uuid) — the per-night form, and why it gets the
--    SAME key with the SAME definition
-- =============================================================================
--
-- The overload created by `20260809001000_assignment_resolver.sql`, section 4.
-- In Postgres these are two objects: `CREATE OR REPLACE` does not change an
-- argument list, so this second signature has to be written out again rather
-- than inherited. If it were skipped, the two forms would return two payload
-- SHAPES behind one TypeScript type — and the layer that reads them would have
-- to know which one it called in order to know whether an absent key meant
-- «no assignment» or «this is the other function». That is how an absent field
-- becomes a `false`, and a `false` here is a refusal dressed as an answer.
--
-- THE KEY IS COARSE ON THIS SIGNATURE TOO, and that is not an inconsistency to
-- tidy. It is the same account-wide question with the same definition — it does
-- not narrow to `p_party_id`. The per-night answer on this signature is
-- `capabilities`, which the resolver's OR already resolves FOR that night. Two
-- keys, two questions, and collapsing them would leave the caller unable to ask
-- either one cleanly.

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
  -- the assignment arm exist once, in section 3 of
  -- 20260809001000_assignment_resolver.sql, and this function asks them
  -- questions.
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
    ),
    -- The SAME definition as the argument-less form, word for word and NOT
    -- narrowed to p_party_id. See the paragraph above section 3's function: the
    -- per-night answer on this signature is `capabilities`; this key is the
    -- account-wide one, and the two payloads must have one shape.
    'live_assignment_capabilities', coalesce(
      (
        select jsonb_agg(distinct pa.capability order by pa.capability)
        from public.party_assignments pa
        where pa.user_id = (select auth.uid())
          and pa.revoked_at is null
          and now() < pa.ends_at
      ),
      '[]'::jsonb
    )
  );
$$;

-- The boundary for THIS signature, and it is the part that is easy to get wrong:
-- the argument-less version's REVOKE does not reach here, because these are two
-- objects. Re-stated as two statements in this order rather than assumed to have
-- survived, for the same replay-from-empty reason as above.
REVOKE EXECUTE ON FUNCTION public.my_access_context(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_access_context(uuid) TO authenticated;

-- Re-issued because the previous text said «Same four payload keys», which this
-- file makes false. A comment on a live object that describes a shape the object
-- no longer has is worse than no comment: it is read as current.
COMMENT ON FUNCTION public.my_access_context(uuid) IS
  'Phase 35: the per-night form of public.my_access_context(). FIVE payload keys, the same five as the argument-less version, '
  'with `capabilities` resolved for p_party_id - the union of what the caller''s role confers and what their live, unrevoked, '
  'unexpired assignment on that night confers. `live_assignment_capabilities` is NOT narrowed to that night: it is the same '
  'account-wide coarse answer both signatures carry, so the two payloads have one shape, and it is wider than the real permission. '
  'It is an OVERLOAD and not a signature change: the argument-less version is what the middleware calls on every navigation, '
  'and removing it inside a hand-applied queue would leave a window in which it does not exist. '
  'p_party_id names a CONTEXT, never a SUBJECT: the function still answers about auth.uid() and has no way to name anybody else, '
  'which is why it does not become the enumeration oracle capability_model.sql:231-237 refuses. '
  'EXECUTE is revoked from public and anon, and then given to authenticated.';

COMMIT;
