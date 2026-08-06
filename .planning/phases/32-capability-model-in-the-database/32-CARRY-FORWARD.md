# Phase 32 → what the next phases inherit

Written at the close of phase 32, so phases 33–35 do not re-derive it. Every
line here was **measured** during phase 32, not argued. Where something is an
open decision it says so.

---

## What exists now

- `private` schema, unreachable from PostgREST by design. Two tables
  (`private.capabilities`, `private.role_capabilities`, **16 grant rows**) and
  `private.has_capability(text, uuid)` — `SECURITY DEFINER`, `search_path = ''`,
  every reference schema-qualified.
- `public.my_access_context()` — `EXECUTE` granted to `authenticated` only;
  `anon` and `public` revoked. An anonymous call gets a permission error, not an
  empty result. Treat that as a normal case, not an error path.
- **45 of 67 RLS policies** call `private.has_capability`. Zero policies name the
  four legacy helpers.
- `src/lib/capabilities/keys.ts` — the eight keys, TypeScript side.
- `src/lib/capabilities/server.ts` — the per-request resolver, one round trip,
  `cache()`-scoped per request (measured: does not leak across requests).
- `npm run verify:capabilities` — the four-sided parity check.
- The baseline harness: `npm run baseline:rls`, `baseline:container`,
  `rls-baseline-compare.mjs`. **Destructive writes now refuse by default** and
  need `--i-know-this-writes`.

## Hard constraints — breaking one is a behaviour change

1. **`door.operate` is `requires_approved = false` on both grant rows**
   (`supabase/migrations/20260807000000_capability_model.sql:416-417`, commented
   *"These two rows must not become true."*). The four check-in routes gate on
   **role alone** by owner decision recorded at
   `src/app/api/tickets/checkin/route.ts:110-130`; the escalation hole is closed
   in `updateMemberRole` (`src/app/(admin)/admin/members/actions.ts:129-134`).
   A status check here locks a `pending` organizer out of the scanner, in front
   of a queue.
2. **The `organizer/pending` asymmetry is intentional and measured:** can insert
   `ticket_tiers`, is refused on `venues` (`42501`); `organizer/approved` can do
   both. Two upstream documents disagreed; the container settled it. Reproduce
   it, do not tidy it.
3. **`catalogue.manage` carries `requires_approved = true`; `staff.manage` does
   not.** Collapsing the two is this model's named worst-case defect — it hands
   an unapproved organizer powers they do not have.
4. **`member` is not `approved`.** Role and status are two axes; the model keeps
   them apart via `requires_approved`. Any caller that collapses them is wrong.

## Traps that already cost time once

- **The eight keys partition exactly**: four consumed only by RLS policies, four
  only by `src/`. **Phase 34's CAP-02, if written as "every capability has a
  route", fails on half the model on day one.** (D-32-K)
- **`verify:capabilities` reads the CATALOGUE, not the GRANTS.**
  `private.role_capabilities` is never read by it. A green there is **not** a
  statement about who can do what — and a command named `verify` will be cited
  as if it were. (D-32-L)
- **Neither evidence artefact is the safety net; the pair is.** The container's
  write matrix caught a capability collapse the policy catalogue passed; the
  policy catalogue caught a misapplied wrap that both write matrices passed in
  silence. Dropping either removes a detector. (D-32-H)
- **An RLS write probe must end in `returning id`.** A refused `UPDATE` raises
  nothing and matches no row, so a naive probe reports success for refusals too.
  (D-32-I)
- **`--allow-lint-move` is LINT-wide, not entity-wide.** Diff entity lists by
  hand. (D-32-G)
- **`unused_index` must never be pinned** — it counts index scans since the last
  statistics reset and moves on its own. `multiple_permissive_policies` (46) and
  `unindexed_foreign_keys` (35) are structural and safe to pin.
- **Migration file names differ from applied versions.** Files are named
  `2026080700*`; the Supabase migrations endpoint assigned its own versions.
  Verify what a fresh environment rebuild would do before relying on either.
- **The 33 migrations cannot rebuild this database alone** — six of twenty tables
  come only from `supabase/schema.sql`.
- **A stale `.next` produces a false build failure after a worktree merge.**
  `rm -rf .next` before concluding anything is broken.
- **CREDENTIAL HAZARD:** `GET /v1/projects/{ref}/postgrest` returns the project's
  JWT signing secret in the same response as `db_schema`. Read the one field you
  need, persist nothing else, redact. The owner decided not to rotate it, which
  makes this rule stricter, not looser.

## Open, owed, and not this phase's to close

- **The privilege-escalation guard on `profiles`.** `profiles_update_own`'s
  `WITH CHECK` is an **unchanged-field guard**, not a permission check — no
  capability can express it. `UPDATE public.profiles` returns `42P17 infinite
  recursion` for **every** persona, on both targets, before and after phase 32.
  Both UPDATE policies are dead; nothing reaches them because every call site
  uses the service-role client. **The guard today refuses by crashing, not by
  denying.** Repairing it is a new design and needs its own phase with its own
  before/after evidence. Options A–D are in `32-07-SUMMARY.md`. (D-32-A)
- **`CLAUDE.md:140` and `.claude/rules/supabase-data.md:18` both carry the same
  false statement** — that `supabase/schema.sql` has zero `CREATE POLICY` and
  zero `ENABLE ROW LEVEL SECURITY`. It has **37** and **11**. The guardrail was
  written to prevent one error and now causes the opposite, worse one: it tells
  a reader not to look where 37 policies are. **Both files must be corrected in
  the same change**, or the corrected one will be contradicted by the other.
  Needs the `instruction architecture` gate: changelog entry, version bump,
  `npm run verify:persona`. (D-32-C)
- **Seven review warnings** (WR-01…WR-07) in `32-REVIEW.md`, with failure
  scenarios and patches. The two most relevant to phase 33: the B1 comparator
  validates the *shape* of a substitution but never *which key*; and there is no
  mechanical guard on `requires_approved`, which is the column
  `door.operate` must never move on.
- **14 manual verifications owed** — `32-HUMAN-UAT.md`. The door
  (`organizer/pending` must load `/admin/scanner`) and CAP-04's five timestamps
  are the two that matter.

## The planning lesson, measured

Phase 31: 13 plans in **6** waves — 2.2 plans per wave.
Phase 32: 11 plans in **9** waves — 1.2 plans per wave, because four consecutive
plans all extended the **same file**.

Agent work was 143 minutes; elapsed was 135. Parallelism saved **6%**. Owner
checkpoints cost about **3%**. **The serial chain is where the time goes.**

When planning phase 33: ask *"can these two run at the same time?"* **before**
asking *"what is the logical order?"*. Prefer several files each built once over
one file built in four passes. That single choice is worth roughly double the
throughput, and costs nothing in quality.
