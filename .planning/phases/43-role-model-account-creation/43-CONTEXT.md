# Phase 43: Role Model & Account Creation - Context

**Gathered:** 2026-08-07
**Status:** Ready for planning
**Source:** Synthesised from `.planning/ACCESS-MODEL-DECISIONS.md` (owner decisions of 2026-08-06, decisions 1, 2, 4, 5, 6, 7, 8, 10, 11) and the Phase 43 section of `.planning/ROADMAP.md`. No interactive discuss-phase session was run: the decisions were already taken and recorded, and that document exists precisely so later phases stop re-deriving them.

> **Roles only, never people.** This repository is public. Every statement below
> names a role — `master`, `organizer`, `staff`, `member` — and never a person.
> Any plan derived from this file inherits that rule.

<domain>
## Phase Boundary

**In scope.** The account-wide identity layer: which roles exist, what each one
grants, which states the database will accept, who may create an account, and
where every act that changes who someone is gets recorded.

Concretely:
- the fourth role `staff`, in the role constraint and in the capability grants
- the database rule that a staff role implies `approved`, and the harness change it forces
- account creation by `master` and `organizer`, with an invitation that carries a link
- the attribution register — who did it, and when — shared by creation, promotion, rejection and deactivation
- the `MASTER_EMAIL` recovery path, repaired so it demotes as well as promotes
- a free staff entry counted in the night's attendance

**Out of scope — and this fence matters.** What a person may *do on one night* is
not a property of their role. Photo upload, running the door, editing a performer
page: those are per-night assignments and they are **Phase 35**. A `staff`
account that is not working tonight enters free and can do nothing else. Planning
any work permission into the `staff` role in this phase contradicts the decision
that created the role.

Also out of scope: the single capability-driven work surface (**Phase 34**), and
what a staff member sees of the members list and the takings (Phase 34's subject).

**Depends on Phase 33** — identity and capability are resolved in one server-only
module. Every new check in this phase asks that module; none of them reads a
request header.

</domain>

<decisions>
## Implementation Decisions

### The role set

- **D-01:** A fourth role `staff` exists — the role constraint moves from `check (role in ('master','organizer','member'))` at `supabase/schema.sql:59` to include `staff` — and it grants exactly one thing: entry to a night through the membership card, permanently, including for someone who worked a single date. (ROLE-01)
- **D-02:** `staff` receives `membership.card.view` with `requires_approved = true` in `private.role_capabilities`, and receives **none** of `door.operate`, `staff.manage`, `catalogue.manage`, `organizer.access`, `admin.access`, `master.manage`. Every capability in the catalogue gets an explicit decision for `staff`, not a default. (ROLE-01)
- **D-03:** Work permissions are **not** granted by the `staff` role. They come from the per-night assignment of Phase 35 and expire with the night. Neither a role-per-trade split (`staff_photo`, `staff_door`, …) nor one `staff` role carrying every work permission is acceptable: the first makes every new trade a schema change, the second lets powers leak across jobs. (scope fence — decision 3)

### The database rule, and the price it charges

- **D-04:** An account holding a staff role (`master`, `organizer`, `staff`) is `approved` **by database rule**. A write that would leave a staff role unapproved is refused by the database, not caught by a call site that remembered. This replaces a convention currently upheld by four separate functions. (ROLE-02)
- **D-05:** The baseline harness keeps the ability to seed the four states the rule forbids — `organizer/pending`, `organizer/rejected`, `master/pending`, `master/rejected` — by dropping the constraint while seeding and restoring it afterwards. Those four personas are the only reason phase 32's write matrix caught its worst defect (sixteen cells, every one of them theirs), so this is not a convenience and it is not optional: whoever implements the constraint owns it. (ROLE-03)
- **D-06:** `door.operate`'s `requires_approved = false` is **not** removed as redundant once the constraint exists. The constraint protects the database; the door's setting protects the night from the day the constraint is relaxed for one special case. Refusing a valid staff member at the door, in front of a queue, stays worse than the alternative. (trap to refuse)

### Account creation

- **D-07:** Only `master` and `organizer` create an account, and neither creates a `master`; an `organizer` may promote a staff member to `organizer`. The self-replicating power is permitted on purpose — requiring the master for every promotion makes one person the bottleneck of their own community — and the ceiling is deliberate: it must not reach the top. (ACCT-01)
- **D-08:** Creating an account **is** the act of approval, performed by someone already entitled to approve — not a lane around the gate. It is therefore counted like an approval, never treated as an administrative side door. (decision 4)
- **D-09:** A created account is valid for entry **immediately**: the person can enter a night with their membership card without ever having logged in. (ACCT-02)
- **D-10:** The message a created account receives carries a **link to set a password, never a password** — a password sent by email lives in that inbox forever. The pattern already exists at `src/lib/guest-list/process-entry.ts` (`auth.admin.createUser` at :220, `auth.admin.generateLink` at :235) and is reused, not reinvented. (ACCT-03)

### Attribution

- **D-11:** Creation, promotion, rejection and deactivation all land in the **same register as an ordinary approval**, with the same author and the same timestamp. Two entry paths where only one leaves a trace makes the entry history unusable within a season. (ACCT-04, decision 5)

### Recovery and seat cost

- **D-12:** `MASTER_EMAIL` demotes as well as promotes. Today `src/app/api/auth/callback/route.ts:27` promotes on every login and never demotes, so every past master stays master forever and nothing declares it — an undeclared one-way switch, the class of error this project treats as most dangerous. Repairing it yields a clean recovery path without a permanently live second administrator. (ROLE-04)
- **D-13:** Staff accounts do not expire and deactivation is manual; the seat cost is made visible instead — a free staff entry is recorded in the night's attendance like any other entry, so a permanent free entry never makes the night's numbers wrong. (ACCT-05, decision 8)

### Claude's Discretion

- The concrete shape of the attribution register: one new table versus extending an existing audit surface, column names, indexes, and whether the register is append-only at the database level. The requirement is *same register, same author, same timestamp, for all four acts* — the schema that satisfies it is an implementation choice, to be justified in the plan.
- Which mechanism enforces D-04 (`CHECK` constraint versus trigger), and how D-05's seed-time relaxation is expressed (explicit drop/restore in the seed script, a session-scoped switch, or a `SECURITY DEFINER` seeding function) — provided the harness demonstrably regains all four forbidden personas.
- Where the account-creation surface lives inside the existing organizer/admin tree, and its interaction and copy. No `UI-SPEC.md` was produced for this phase (decision recorded below), so the surface follows the components already in use.
- How the demotion of D-12 is triggered and bounded (on login of the new master, on a startup reconciliation, or a one-shot migration plus the login path) and how a demoted account's `status` is left, given D-04.
- Whether the staff attendance record of D-13 reuses the existing per-party attendance path unchanged or needs a distinguishing marker.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The decisions themselves
- `.planning/ACCESS-MODEL-DECISIONS.md` — the owner decisions of 2026-08-06 this phase carries, with the rejected alternatives and the declared costs
- `.planning/ROADMAP.md` (Phase 43 section) — the eight success criteria, the cost of criterion 2, and the trap to refuse
- `.planning/REQUIREMENTS.md` — `ROLE-01…04`, `ACCT-01…05`, and the "explicitly not doing" rows for a second standing master and for auto-expiring staff accounts

### The schema and the capability model this phase extends
- `supabase/schema.sql:59` — the role check constraint that admits three roles today
- `supabase/migrations/20260807000000_capability_model.sql` — `private.role_capabilities`, its columns including `requires_approved`, and the 16 grant rows across three roles
- `supabase/migrations/20260807010000_policies_to_capabilities.sql` — the RLS policies expressed through capabilities
- `supabase/migrations/20260807000100_capability_model_fk_index.sql`

### The harness whose detection power must survive
- `scripts/container/seed.mjs` — where the eleven personas are seeded, four of which the new constraint forbids
- `scripts/rls-baseline-container.mjs`, `scripts/rls-baseline.mjs`, `scripts/rls-baseline-compare.mjs` — the write matrix and the comparison that caught phase 32's worst defect
- `.planning/phases/32-capability-model-in-the-database/32-CARRY-FORWARD.md` — what phase 32 left open
- `.planning/phases/32-capability-model-in-the-database/32-HUMAN-UAT.md` — fourteen manual checks, deliberately deferred (see Deferred Ideas)

### The patterns to reuse rather than reinvent
- `src/lib/guest-list/process-entry.ts` — `auth.admin.createUser` (:220) and `auth.admin.generateLink` (:235), the existing invitation-without-a-password pattern
- `src/app/api/auth/callback/route.ts:27` — the `MASTER_EMAIL` promotion that never demotes
- Phase 33's server-only identity/capability module — every new check asks it; none reads a request header

### The gates that govern this phase
- `.claude/rules/access-gating.md` — the middleware/RLS boundary, and `member` versus `approved` as two different axes
- `.claude/rules/meta-gates.md` — monotone guards, cross-domain impact, zero silent failures
- `.claude/rules/supabase-data.md` — migrations are the source of truth for RLS, not `schema.sql`
- `.claude/rules/checkin-offline.md` — the door has no network, and refusing a valid guest is worse than admitting a duplicate
- `.claude/rules/community-membership.md` — no grey lane around approval; every act on a member's status is recorded with its author
- `.claude/rules/ai-engineering.md` — planning documents are published: roles, never people

</canonical_refs>

<specifics>
## Specific Ideas

- The role constraint is a three-value `check` today; adding `staff` is a migration on it, not a new column.
- `private.role_capabilities` holds 16 grant rows across three roles. `staff` needs its own rows, and every existing capability needs an explicit yes/no for the new role — a capability silently absent is indistinguishable from a capability considered and refused, so the plan should make the refusals visible.
- Measured before this phase, the four paths that write `role` or `status` — promote, deactivate, reject, reactivate — plus the `MASTER_EMAIL` promotion and the 2026-02-24 RBAC migration already keep `organizer/pending` and `organizer/rejected` unreachable *through the application*. Nothing states the rule, and five new paths are arriving. That is what D-04 changes.
- The container harness is the only automated net in this repository for the write matrix. There is no product test runner (`package.json` has no `test` script, and no `*.test.*` / `*.spec.*` files exist), so `npm run build` plus the container baseline plus a written manual procedure are the verification available. Nothing in this phase may be declared verified because "tests pass".
- Because there is no error tracking in the product, a failure in a new write path reaches a human only if it has an observable effect. A refused write from D-04's constraint must surface as a distinguishable error, not a generic "something went wrong".

</specifics>

<deferred>
## Deferred Ideas

- **Phase 32's fourteen manual checks (`32-HUMAN-UAT.md`, status `partial`)** — deliberately deferred by owner decision of 2026-08-06 (decision 12): the build continues through 33, 43, 35 and 34 and everything is verified by hand at the end. The price is recorded, not discovered: this phase builds on phase 32's capability model, and if one of those checks is red the rework is proportional to what was built on top. The two that carry most: a `pending` organizer must be able to load `/admin/scanner`, and a permission change must take effect on the next request.
- **The association, and whether an app `member`/`approved` is a socio** — decision 9, dated 2026-08-06 and to be re-opened rather than inherited. Until the association exists, "socio" means "approved member". The day it opens, that sentence becomes a legal statement. Not this phase's work.
- **Whether a night's assignment can be delegated further, and by whom** — open, and Phase 35's subject at the earliest.
- **What a staff member sees of the members list, the takings and other people's data** — stated as "only their own assigned work"; the exact surfaces are Phase 34's subject.
- **Public credit for a performer** — already kept separate from permissions by the roadmap; Phase 35.
- **`UI-SPEC.md` for this phase** — not produced, by decision taken at planning time. The frontend surface is an account-creation form and a register view inside the existing organizer/admin tree, while Phase 40 (Brand Tokens), Phase 41 (Shared Primitives) and Phase 34 (single work surface) are all still ahead: a design contract written now would be rewritten twice. Accepted risk: no visual contract for this phase, coherence carried by the components already in use.

</deferred>

---

*Phase: 43-role-model-account-creation*
*Context synthesised 2026-08-07 from `.planning/ACCESS-MODEL-DECISIONS.md` + `.planning/ROADMAP.md` — no interactive discuss-phase session*
