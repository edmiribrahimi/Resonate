-- The manual venue reveal — the key that authorises it, the fact that records
-- it, and the trace that attributes it
-- Phase 37, Plan 01: VENUE-02, with D-37-13 … D-37-22 written beside the lines
-- that implement them
--
-- Changes:
-- 1. private.capabilities / private.role_capabilities — a THIRTEENTH capability,
--    `venue.reveal`, granted to `master` and `organizer`, both with
--    `requires_approved = true` (D-37-14)
-- 2. public.event_parties.venue_revealed_at — nullable, no DEFAULT: WHEN the
--    address was let out BY HAND, which is not the same fact as
--    `venue_reveal_email_sent`
-- 3. public.venue_reveal_acts — the trace: append-only, one row per human act,
--    with its author BY NAME (D-37-18) and how many people it meant to reach
-- 4. RLS on that table: enabled, one SELECT policy, and DELIBERATELY no write
--    policy
--
-- Four changes, ONE transaction. A half-applied version of this file is strictly
-- worse than none of it, and each half is bad in its own way:
--
--   * the capability without the rest is a thirteenth key that
--     `scripts/verify-capabilities.mjs` and `src/lib/capabilities/keys.ts` both
--     hold, all three agreeing about a permission over nothing;
--   * the column without the trace is a night that can say *the address went
--     out* and cannot say who let it out — the untraced act D-37-17 forbids;
--   * the trace without the column records acts about a fact that does not
--     exist, so the surface has nothing to render the button's state from;
--   * the trace without its RLS is the whole register readable by anyone holding
--     the anonymous key, which is a list of which nights are no longer secret.
--
-- So `BEGIN; ... COMMIT;` is not decoration here either.
--
-- WHAT THIS FILE DOES NOT YET CONTAIN, so the gap is not read as an oversight:
-- **the writer**. Nothing can set the column or insert into the trace until
-- `public.record_venue_reveal_act` lands in the next commit of this same plan.
-- Until it does, the table has no write policy and no function, so it is
-- permanently empty BY CONSTRUCTION — which is the correct state for a register
-- of acts nobody has been able to perform yet, and not a defect to repair with a
-- policy.
--
-- ── IDEMPOTENZA, voce per voce ──────────────────────────────────────────────
--
--   * `ON CONFLICT … DO NOTHING` on both seed inserts;
--   * `ADD COLUMN IF NOT EXISTS` for the column, and it carries no `DEFAULT`, so
--     a second run cannot rewrite an existing value;
--   * `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`;
--   * `DROP POLICY IF EXISTS` before the policy;
--   * `COMMENT ON COLUMN` is a replacement by construction.
--
-- Ri-eseguire deve essere sicuro, o nessuno ri-esegue quando dovrebbe.

BEGIN;

-- =============================================================================
-- 1. `venue.reveal` — the thirteenth capability, and why it is a NEW key
-- =============================================================================
--
-- Named by the QUESTION it answers — *may this subject make this night's address
-- public, now?* — and not by the predicate it happens to resolve to, which is
-- the rule `src/lib/capabilities/keys.ts:38-45` states.
--
-- ── D-37-14: why a thirteenth key and not one of the twelve ──────────────────
--
-- `staff.manage` IGNORES STATUS ON PURPOSE. Its two grants carry
-- `requires_approved = false` (`20260807000000_capability_model.sql:390-393`)
-- for the door's reason: an organizer whose own access is still pending must not
-- be refused in front of a queue at two in the morning, because that error
-- happens in front of people. **That reason does not exist here.** Nobody is
-- standing in a queue while an address is published, and the error in this
-- direction is not recoverable at all. The obvious repair — flipping that flag —
-- is the one thing this phase must not do: the same `false` is what keeps
-- `door.operate` open, and `20260807000000_capability_model.sql:415` says of the
-- two door rows *"These two rows must not become true."*
--
-- `catalogue.manage` was the other candidate: it already has the right SHAPE
-- (`requires_approved = true` on both grants). It is refused for the naming rule
-- above — *may this subject create an artist or a venue* is not *may this
-- subject make an address public* — and reusing it would make the two impossible
-- to separate later, on the day somebody wants a catalogue editor who may not
-- publish.
--
-- `party.manage` is refused by D-37-15, and this one is the subtle refusal.
-- It governs the work OF THE NIGHT — that night's review, its door register, its
-- guest list — and it arrives from a per-night assignment that expires with the
-- night. The reveal happens BEFORE the night and does not expire, because it
-- cannot be undone. A power that ends at 06:00 is the wrong container for an act
-- whose effect does not.
--
-- ── Who is refused, and each refusal is a decision ───────────────────────────
--
--   `staff`   — refused. D-03: work permissions are not granted by the role.
--               Publishing an address is not a night's work, and it would not
--               expire with the night.
--   `member`  — refused. Nothing grants it.
--   `anon`    — refused. `private.has_capability` answers false for a null
--               `auth.uid()` by construction
--               (`20260807000000_capability_model.sql:55-57`).
--
-- WHERE THOSE TWO REFUSALS ARE ASSERTED rather than merely written here:
-- `scripts/verify-capabilities.mjs`, side 5. Its `ROLE_GRANTS` declares every
-- (role × capability) pair — 52 after this file, 28 grants and 24 refusals — and
-- exits 1 naming the pair both when a declared refusal acquires a row and when a
-- declared grant loses one. A comment can be ignored; that check cannot.

INSERT INTO private.capabilities (key, description) VALUES
  (
    'venue.reveal',
    'Reveal a night''s secret venue by hand, before the automatic window, and send the address to everyone entitled to it. Requires an APPROVED staff role on both grants (D-37-14) because the act is irreversible — staff.manage ignores status ON PURPOSE, so a pending organizer is not refused in front of a queue, and that reason does not exist here.'
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  -- The master already holds every surface this act is performed from. The row
  -- exists so the key is not silently master-by-absence: a capability nobody is
  -- granted resolves false for everyone, including the master.
  ('master',    'venue.reveal', true),

  -- D-37-13: EVERY approved organizer, not only the one who created the night.
  -- The creator can be unreachable on exactly the evening the button exists for,
  -- and a reveal that waits for one person is a reveal that happens late — or
  -- through a channel that leaves no trace at all, which is worse.
  ('organizer', 'venue.reveal', true)
ON CONFLICT (role, capability) DO NOTHING;

-- =============================================================================
-- 2. `event_parties.venue_revealed_at` — the fact, and the fact it is NOT
-- =============================================================================
--
-- Nullable and WITHOUT a `DEFAULT`, on a populated table
-- (`supabase-data.md`, gate *default sulle righe esistenti*). The precedent for
-- the shape is `20260226500000_venue_secret_hint_reveal_hours.sql`, which added
-- two columns to this same table the same way.

ALTER TABLE public.event_parties
  ADD COLUMN IF NOT EXISTS venue_revealed_at timestamptz;

COMMENT ON COLUMN public.event_parties.venue_revealed_at IS
  'WHEN this night''s address was let out BY HAND, or NULL if it never was. '
  'NULL is the right value for every row that existed before this column: none of them was revealed by hand, because there was no way to do it. '
  'THIS IS NOT `venue_reveal_email_sent` UNDER A NEW NAME. They are two different facts — *the act happened* and *the mails left* — and this phase exists because they can diverge: a manual reveal that reached 20 of 50 people has happened and has not finished (D-37-12). '
  'AND IT IS WHY THE PAGE PREDICATE CANNOT BE `venue_reveal_email_sent`: the cron raises that flag even when there is NO recipient at all (`src/app/api/cron/venue-reveal/route.ts:107-114`, the `emailMap.size === 0` branch), so a night the cron merely swept would open its address to everyone. '
  'Written only by `public.record_venue_reveal_act`. Set to NULL again only by that function''s `re_hidden` branch, which is master-only (D-37-22) and does not erase the trace.';

-- =============================================================================
-- 3. public.venue_reveal_acts — the trace
-- =============================================================================
--
-- D-37-17: the trace lives on the NIGHT, in the work surface, not in a separate
-- register — it is also where the second press finds its answer (D-37-19), and
-- the two serve each other.
--
-- A TABLE OF ITS OWN, and not two more rows in `public.membership_acts`. That
-- register records changes to an account's ROLE AND STATUS — who somebody IS —
-- and it speaks in `membership_code` because it can reach an artefact. This one
-- records an act performed on a NIGHT, names its author in full, and counts
-- recipients. Two registers holding overlapping truths is worse than either of
-- them; two registers holding DIFFERENT truths under one schema is worse still,
-- because the naming rule of the first would have to be broken to fit the
-- second. Recorded here or the next reader merges them.

CREATE TABLE IF NOT EXISTS public.venue_reveal_acts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHICH NIGHT. `ON DELETE SET NULL`, and it is DELIBERATELY NOT `CASCADE`.
  -- Sixteen constraints already point at `public.event_parties` with `CASCADE`;
  -- this trace does not become the seventeenth. Deleting a night must not delete
  -- the proof that its address was made public — that proof is most valuable
  -- exactly where the row it names has gone.
  party_id uuid REFERENCES public.event_parties ON DELETE SET NULL,

  -- ...and which night it WAS, denormalised, so a row whose `party_id` has gone
  -- to NULL still says what it was about. Same reasoning as
  -- `membership_acts.subject_label` (`20260808002000:190-203`) and
  -- `ticket_refunds.refunded_ticket_id` (`20260805120000:188-193`).
  --
  -- **THE EVENT'S TITLE AND THE NIGHT'S DATE. NEVER THE VENUE'S NAME AND NEVER
  -- THE ADDRESS.** The whole subject of this table is an address becoming
  -- public; writing that address into the record of the act would mean the act
  -- is logged together with the thing it released, in a row that outlives the
  -- night and can reach a screenshot. Section 5's function composes this value
  -- itself, from `events.title` and `event_parties.date` and nothing else, so
  -- the rule is enforced by the only writer rather than by the caller
  -- remembering it.
  party_label text NOT NULL,

  -- WHAT WAS DONE. THREE human acts and not two.
  --
  --   `revealed`  — the address was let out for the first time. This is the act
  --                 that sets `venue_revealed_at`.
  --   `completed` — D-37-20's *send it to the N who are missing*. It sets
  --                 nothing on the night, and it is recorded ANYWAY: it mails
  --                 the address to N more people, so it is exactly as
  --                 attributable as the first act. A model with only two acts
  --                 would make the second, third and fourth send invisible while
  --                 each of them is a publication.
  --   `re_hidden` — D-37-22, master only. The page goes back to secret; the
  --                 mails do not come back.
  act text NOT NULL CHECK (act IN ('revealed', 'completed', 're_hidden')),

  -- WHO DID IT. SET NULL: an author who later leaves the project does not
  -- un-perform their acts.
  actor_id uuid REFERENCES auth.users ON DELETE SET NULL,

  -- ── D-37-18 — THE DIVERGENCE FROM `membership_acts`, MADE DELIBERATELY ─────
  --
  -- `membership_acts.subject_label` is a `membership_code`, **never a full
  -- name**, and its migration says so in capitals (`20260808002000:195-202`).
  -- This column is the opposite, and the opposite is right here for a reason of
  -- MEANING and not of convenience: there the subject is a person being JUDGED,
  -- and a public repository is one paste away from publishing who was rejected.
  -- Here the subject is a person who ACTED, on a staff surface, and
  -- accountability is the entire point of the act. A trace that says
  -- *revealed by ORG-0042* answers nobody's question at 19:00 on a Friday.
  --
  -- **THE DIVERGENCE IS AUTHORISED IN THE DATABASE AND STOPS THERE.** That name
  -- does not enter a PLAN, a SUMMARY, a VERIFICATION or any other artefact under
  -- `.planning/`, which is tracked and public (`CLAUDE.md` Guardrail 5,
  -- `ai-engineering.md`, gate *la pianificazione e' pubblica*). Artefacts name
  -- ROLES.
  actor_name text NOT NULL CHECK (length(btrim(actor_name)) > 0),

  -- HOW MANY PEOPLE THIS ACT MEANT TO REACH — the number D-37-16 puts in the
  -- confirmation and D-37-12 reports back afterwards. It is a count of
  -- RECIPIENTS after de-duplication by email, never a count of tickets plus
  -- rsvps, which double-counts anybody holding both.
  recipients_intended integer NOT NULL,

  -- WHEN. The SERVER clock, always.
  at timestamptz NOT NULL DEFAULT now()

  -- ── AND ONE COLUMN THAT IS DELIBERATELY ABSENT: `actor_kind` ───────────────
  --
  -- `membership_acts` carries `actor_kind IN ('user','system')` with a CHECK
  -- pairing it to `actor_id`, because a reconciliation can demote an account
  -- with no human author (`20260808002000:209-231`). Nothing of the sort exists
  -- here: **every row in this table is a human act.** The scheduled path — the
  -- `venue-reveal` cron — writes NO row at all, and THE ABSENCE OF A ROW IS THE
  -- DISTINCTION. Adding a `'system'` kind would invite the cron to start writing
  -- rows, and the day it did, *"who revealed this?"* would answer *the system*
  -- for a night nobody decided to reveal.
);

-- One index, named for the only read this table actually has: the acts of THIS
-- night, most recent first — which is what the work surface renders under the
-- button (D-37-17). `at DESC` because an index whose order does not match the
-- query's is an index the planner steps around.
CREATE INDEX IF NOT EXISTS idx_venue_reveal_acts_party
  ON public.venue_reveal_acts (party_id, at DESC);

-- =============================================================================
-- 4. RLS — and the omission that is not an omission
-- =============================================================================
--
-- Without this, anyone holding the anonymous key reads the whole trace through
-- PostgREST. The middleware decides where somebody may GO; this decides what
-- they may READ, and only this is the security boundary (`CLAUDE.md`, operating
-- principle 2).

ALTER TABLE public.venue_reveal_acts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS venue_reveal_acts_select_staff ON public.venue_reveal_acts;

-- `staff.manage` and NOT a new read key — D-37-18: whoever already sees that
-- night at work sees its trace too. A second key here would produce a surface
-- where the button is visible and the answer to *who pressed it* is not, which
-- is the shape D-37-19 exists to refuse.
--
-- The `(select …)` wrapper is LOAD-BEARING and it is not `STABLE` that produces
-- it: it makes Postgres evaluate the call once per statement as an InitPlan
-- instead of once per row, proved by `EXPLAIN` on this database and written up
-- at `20260807000000_capability_model.sql:177-184`.
CREATE POLICY venue_reveal_acts_select_staff ON public.venue_reveal_acts
  FOR SELECT USING ((SELECT private.has_capability('staff.manage')));

-- No INSERT, UPDATE or DELETE policy, and the omission is DELIBERATE. Writes
-- come only through `public.record_venue_reveal_act`, which runs as its
-- definer and is executable by `service_role` alone; so with RLS enabled and no
-- write policy, no session — authenticated, anonymous, or a master's — can add,
-- edit or remove a row. That is what "append-only by construction" means here:
-- it is not a convention the writers observe, it is the absence of any granted
-- path to a write.
--
-- **AND IT IS THE CONSTRAINT THAT MAKES D-37-22 HONEST.** Re-hiding a venue
-- returns the page to secret; it does not return the mails. The night therefore
-- goes on saying *revealed on … by …* after it has gone back to secret, and it
-- says so because nobody — including the master who re-hid it — has a path to
-- remove the row. Without this paragraph the gap reads as a bug, and the repair
-- would be one `CREATE POLICY` away from letting the roles whose acts this table
-- records edit it. Two other tables in this repository omit their write policies
-- on purpose, for the same reason: `20260805120000_door_scan_events.sql:158-163`
-- and `20260808002000_membership_register.sql:337-349`.

COMMIT;
