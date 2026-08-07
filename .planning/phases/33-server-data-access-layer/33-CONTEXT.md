# Phase 33 — Context

Assembled 2026-08-06 from the owner conversation that closed phase 32 and from
facts measured directly against the current code. **Roles, never people** — this
repository is public.

Requirement: **CAP-05** — *no surface derives permission from a request header;
identity comes from the session.*

---

## The measured starting point — verified today, not quoted

| Fact | Evidence |
|---|---|
| **44 files** read an `x-user-*` header, **97 reads** in total | `grep -rlE '\.get\("x-user-' src/` |
| Inbound `x-user-*` headers **are stripped** before injection | `src/lib/supabase/middleware.ts:210-212` |
| One server action derives **role AND identity** from headers, then checks ownership with a **service-role client that bypasses RLS** | `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:14-36` |
| The capability model exists and is live | `supabase/migrations/20260807000000_capability_model.sql`; 45 of 67 policies call `private.has_capability` |
| A per-request resolver already exists | `src/lib/capabilities/server.ts`, one round trip, `cache()`-scoped per request (measured: does not leak across requests) |
| `public.my_access_context()` is granted to `authenticated` only | `anon` and `public` revoked; an anonymous call gets a permission error, not an empty result |

### What this phase is actually for

**The header hole is already bolted shut, by one bolt.** The middleware clears
inbound `x-user-*` unconditionally, and the comment at `:203-209` names the worst
case in its own words: the refund path gated on `x-user-role` that then used a
service-role client bypassing every RLS policy.

So phase 33 is **not** repairing an open door. It is removing the need for the
bolt. Today 44 surfaces are safe for exactly one reason — a single middleware
line protects all of them at once. One route excluded from the matcher, one
refactor of that block, and 44 surfaces become forgeable together.

That is the difference between *"nothing is wrong"* and *"nothing is wrong yet"*.
The phase's second success criterion states the target directly: a request that
forges an identity header must be answered exactly as an anonymous request would
be, **including on the paths that move money**.

---

## Owner decisions of 2026-08-06 that bear on this phase

Full record in `.planning/ACCESS-MODEL-DECISIONS.md`. What matters here:

1. **Four roles are coming**: `master`, `organizer`, `staff`, `member`. The schema
   admits three today (`supabase/schema.sql:59`). Phase 33 must not hard-code the
   three-role world it can see — anything that enumerates roles will need a fourth
   within one phase.
2. **`staff` grants one thing only**: free entry via the membership card. It grants
   **no** work permission. Work permissions come from a per-night assignment and
   expire with the night.
3. **Phase 35 (per-night assignments) now precedes phase 34.** Phase 33 is
   unaffected in ordering and still comes first, but the resolver it builds will
   be asked, one phase later, a question of the shape *"may this person do X **on
   this night**"* — not only *"what is this person"*. A resolver whose shape
   cannot carry a night is a resolver to be rewritten in phase 35.
4. **Attribution is required**: approval, rejection, account creation, role
   promotion, per-night assignment and door override each record **who** and
   **when**. The identity this phase resolves is the identity those records will
   name.
5. **`MASTER_EMAIL` promotes and never demotes** (`src/app/api/auth/callback/route.ts:27`),
   checked on every login. An undeclared one-way switch. Recorded as a work item;
   **not** this phase's to fix unless planning shows it is cheaper here.

---

## Constraints inherited from phase 32 — measured, not argued

- **`door.operate` is `requires_approved = false`** on both grant rows
  (`supabase/migrations/20260807000000_capability_model.sql:416-417`). The four
  check-in routes gate on **role alone** by owner decision. A status check here
  locks a `pending` organizer out of the scanner **in front of a queue** — the
  failure `checkin-offline.md` names as the worse of the two.
- **The `organizer/pending` asymmetry is intentional**: can insert `ticket_tiers`,
  refused on `venues` (`42501`); `organizer/approved` can do both. Reproduce it,
  do not tidy it.
- **`profiles` UPDATE returns `42P17`** for every persona, on both targets. Both
  UPDATE policies are dead; every call site uses the service-role client. Deferred
  by owner decision (D-32-A) — **out of bounds for this phase**.
- **Middleware is UX; RLS is the security boundary.** A middleware change never
  substitutes for an RLS guarantee, and no comment may imply it does.
- **Neither evidence artefact is the safety net; the pair is** (D-32-H). The
  container's write matrix caught a defect the policy catalogue passed; the
  catalogue caught one both write matrices passed in silence.
- **`verify:capabilities` reads the catalogue, not the grants** (D-32-L). A green
  there is not a statement about who can do what.
- **`unused_index` must never be pinned.** `multiple_permissive_policies` (46) and
  `unindexed_foreign_keys` (35) are structural and safe to pin.
- **CREDENTIAL HAZARD**: `GET /v1/projects/{ref}/postgrest` returns the project's
  JWT signing secret alongside `db_schema`. Read one field, persist nothing else,
  redact. The owner decided not to rotate it, which makes this stricter.

---

## What the phase must decide, and what it must not

**Must decide:**
- Whether the 44 header readers are converted in one sweep or in tranches, and if
  tranches, which surfaces go first. The money paths and the door are the two that
  cannot be got wrong.
- What the one server-only module returns — identity alone, or identity plus
  capabilities. The existing `src/lib/capabilities/server.ts` already resolves
  capabilities per request; duplicating that would create the second divergent
  copy this phase exists to remove.
- What happens to the `x-user-*` injection once nothing reads it. Leaving a
  header nobody reads is a trap for the next person; removing it while one reader
  survives is a silent breakage.
- How a caller distinguishes *"not permitted"* from *"could not resolve"*. The
  project has **no error tracking**, so an infrastructure failure that renders as
  a permission denial reaches nobody. Phase 32 hit exactly this and fixed it with
  a tagged result value, not a parsed error string — Next redacts server-action
  error messages in production builds, so string matching works in `next dev` and
  silently stops working where it matters.

**Must not:**
- Touch `profiles_update_own` or the `42P17` recursion (D-32-A, owner-deferred).
- Move `door.operate` off `requires_approved = false`.
- Widen any RLS policy to make a refactor pass.
- Write names or personal addresses into `.planning/`.

---

## Verification reality

**There is no test runner for this product.** No `test` script, no `*.test.*` or
`*.spec.*` file. Verification is `npm run build` (which runs the type check), the
baseline harness from phase 32 (`npm run baseline:rls`, `baseline:container`,
`rls-baseline-compare.mjs`) and **written manual procedures**. Nothing may be
claimed verified because tests pass.

Two instruments phase 32 leaves behind and this phase should use rather than
reinvent:
- `npm run baseline:rls` / `baseline:container` + the comparator — a green
  `CAP-03` before and after proves no permission moved.
- `npm run verify:capabilities` — four-sided key parity (catalogue, not grants).

Note: destructive baseline writes now **refuse by default** and need
`--i-know-this-writes`.

**A trap worth one line:** a stale `.next` produces a false build failure after a
worktree merge. `rm -rf .next` before concluding anything is broken.

---

## Planning shape — a measured lesson, not a preference

| | Phase 31 | Phase 32 |
|---|---|---|
| Plans | 13 | 11 |
| Waves | **6** | **9** |
| Plans per wave | **2.2** | **1.2** |

Phase 32's agent work was 143 minutes against 135 elapsed: parallelism saved
**6%**, because four consecutive plans all extended the **same file**. Owner
checkpoints cost about 3%. **The serial chain is where the time goes.**

For this phase: ask *"can these two run at the same time?"* **before** asking
*"what is the logical order?"*. 44 files across many route groups is naturally
parallel work — prefer several plans each owning a disjoint set of files over one
plan that rewrites a shared module four times.

Granularity is now `medium` (was `fine`).
