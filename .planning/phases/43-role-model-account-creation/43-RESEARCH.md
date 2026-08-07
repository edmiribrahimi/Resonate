# Phase 43: Role Model & Account Creation — Research

**Researched:** 2026-08-07
**Domain:** PostgreSQL constraint design · Supabase admin auth · the container write-matrix harness · role enumeration across a Next.js 16 app
**Confidence:** HIGH on the database mechanics (measured in a throwaway PostgreSQL 17.6 container this session), HIGH on the codebase claims (every one carries a `file:line`), MEDIUM on production's current row shape (cannot be queried from here — see Open Questions)

> **Roles only, never people.** This file is in `.planning/`, which is tracked, and
> `github.com/edmiribrahimi/Resonate` is **public**. Every subject below is a role —
> `master`, `organizer`, `staff`, `member` — or a persona label. No person, no
> unannounced date, no venue under negotiation appears.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Copied verbatim from `.planning/phases/43-role-model-account-creation/43-CONTEXT.md`.

**The role set**

- **D-01:** A fourth role `staff` exists — the role constraint moves from `check (role in ('master','organizer','member'))` at `supabase/schema.sql:59` to include `staff` — and it grants exactly one thing: entry to a night through the membership card, permanently, including for someone who worked a single date. (ROLE-01)
- **D-02:** `staff` receives `membership.card.view` with `requires_approved = true` in `private.role_capabilities`, and receives **none** of `door.operate`, `staff.manage`, `catalogue.manage`, `organizer.access`, `admin.access`, `master.manage`. Every capability in the catalogue gets an explicit decision for `staff`, not a default. (ROLE-01)
- **D-03:** Work permissions are **not** granted by the `staff` role. They come from the per-night assignment of Phase 35 and expire with the night. Neither a role-per-trade split (`staff_photo`, `staff_door`, …) nor one `staff` role carrying every work permission is acceptable: the first makes every new trade a schema change, the second lets powers leak across jobs. (scope fence — decision 3)

**The database rule, and the price it charges**

- **D-04:** An account holding a staff role (`master`, `organizer`, `staff`) is `approved` **by database rule**. A write that would leave a staff role unapproved is refused by the database, not caught by a call site that remembered. This replaces a convention currently upheld by four separate functions. (ROLE-02)
- **D-05:** The baseline harness keeps the ability to seed the four states the rule forbids — `organizer/pending`, `organizer/rejected`, `master/pending`, `master/rejected` — by dropping the constraint while seeding and restoring it afterwards. Those four personas are the only reason phase 32's write matrix caught its worst defect (sixteen cells, every one of them theirs), so this is not a convenience and it is not optional: whoever implements the constraint owns it. (ROLE-03)
- **D-06:** `door.operate`'s `requires_approved = false` is **not** removed as redundant once the constraint exists. The constraint protects the database; the door's setting protects the night from the day the constraint is relaxed for one special case. Refusing a valid staff member at the door, in front of a queue, stays worse than the alternative. (trap to refuse)

**Account creation**

- **D-07:** Only `master` and `organizer` create an account, and neither creates a `master`; an `organizer` may promote a staff member to `organizer`. The self-replicating power is permitted on purpose — requiring the master for every promotion makes one person the bottleneck of their own community — and the ceiling is deliberate: it must not reach the top. (ACCT-01)
- **D-08:** Creating an account **is** the act of approval, performed by someone already entitled to approve — not a lane around the gate. It is therefore counted like an approval, never treated as an administrative side door. (decision 4)
- **D-09:** A created account is valid for entry **immediately**: the person can enter a night with their membership card without ever having logged in. (ACCT-02)
- **D-10:** The message a created account receives carries a **link to set a password, never a password** — a password sent by email lives in that inbox forever. The pattern already exists at `src/lib/guest-list/process-entry.ts` (`auth.admin.createUser` at :220, `auth.admin.generateLink` at :235) and is reused, not reinvented. (ACCT-03)

**Attribution**

- **D-11:** Creation, promotion, rejection and deactivation all land in the **same register as an ordinary approval**, with the same author and the same timestamp. Two entry paths where only one leaves a trace makes the entry history unusable within a season. (ACCT-04, decision 5)

**Recovery and seat cost**

- **D-12:** `MASTER_EMAIL` demotes as well as promotes. Today `src/app/api/auth/callback/route.ts:27` promotes on every login and never demotes, so every past master stays master forever and nothing declares it — an undeclared one-way switch, the class of error this project treats as most dangerous. Repairing it yields a clean recovery path without a permanently live second administrator. (ROLE-04)
- **D-13:** Staff accounts do not expire and deactivation is manual; the seat cost is made visible instead — a free staff entry is recorded in the night's attendance like any other entry, so a permanent free entry never makes the night's numbers wrong. (ACCT-05, decision 8)

### Claude's Discretion

- The concrete shape of the attribution register: one new table versus extending an existing audit surface, column names, indexes, and whether the register is append-only at the database level. The requirement is *same register, same author, same timestamp, for all four acts* — the schema that satisfies it is an implementation choice, to be justified in the plan.
- Which mechanism enforces D-04 (`CHECK` constraint versus trigger), and how D-05's seed-time relaxation is expressed (explicit drop/restore in the seed script, a session-scoped switch, or a `SECURITY DEFINER` seeding function) — provided the harness demonstrably regains all four forbidden personas.
- Where the account-creation surface lives inside the existing organizer/admin tree, and its interaction and copy. No `UI-SPEC.md` was produced for this phase (decision recorded below), so the surface follows the components already in use.
- How the demotion of D-12 is triggered and bounded (on login of the new master, on a startup reconciliation, or a one-shot migration plus the login path) and how a demoted account's `status` is left, given D-04.
- Whether the staff attendance record of D-13 reuses the existing per-party attendance path unchanged or needs a distinguishing marker.

### Deferred Ideas (OUT OF SCOPE)

- **Phase 32's fourteen manual checks (`32-HUMAN-UAT.md`, status `partial`)** — deliberately deferred by owner decision of 2026-08-06 (decision 12): the build continues through 33, 43, 35 and 34 and everything is verified by hand at the end. The price is recorded, not discovered. The two that carry most: a `pending` organizer must be able to load `/admin/scanner`, and a permission change must take effect on the next request.
  **⚠ Research finding: one of those two checks becomes unrunnable if D-04 lands first. See § E.0 below — this is the single most consequential interaction found.**
- **The association, and whether an app `member`/`approved` is a socio** — decision 9, dated 2026-08-06 and to be re-opened rather than inherited.
- **Whether a night's assignment can be delegated further, and by whom** — Phase 35 at the earliest.
- **What a staff member sees of the members list, the takings and other people's data** — Phase 34's subject.
- **Public credit for a performer** — Phase 35.
- **`UI-SPEC.md` for this phase** — not produced, by decision taken at planning time.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description (from `.planning/REQUIREMENTS.md:59-73`) | Research Support |
|----|------|------------------|
| ROLE-01 | A fourth role `staff` exists and grants exactly one thing — entry through the membership card — and no ability to upload, scan or manage anything | § A. **Two** role CHECK constraints, not one; the full current grant catalogue; three shapes for an *explicit* refusal, with the silent-widening trap in option (a) named |
| ROLE-02 | An account holding a staff role is `approved` **by database rule**; a write that would leave a staff role unapproved is refused by the database | § B.1 (mechanism options, all four bypass paths measured), § B.2 (how a refusal surfaces: SQLSTATE `23514` measured, and where today's code would collapse it) |
| ROLE-03 | The baseline harness keeps the ability to seed the four forbidden states | § B.3 — five candidate mechanisms tested; **four of the five do not work with a CHECK constraint**, measured, not argued |
| ROLE-04 | `MASTER_EMAIL` demotes as well as promotes | § E — the promotion site read, three trigger options, the unset/malformed cases, and the `status` question D-04 raises |
| ACCT-01 | Only `master` and `organizer` create an account; neither creates a `master`; an organizer may promote staff → organizer | § C.4 — the two existing capability gates (`verifyMaster` / `verifyAdminOrOrganizer`) already encode exactly this ceiling; the surface to extend, with line numbers |
| ACCT-02 | A created account is valid for entry immediately, without ever having logged in | § C.2 — traced end to end. It is **already structurally true**; the columns that must be set are named, and the one offline failure mode is named |
| ACCT-03 | The message carries a link to set a password, never a password | § C.3 — the reusable pattern, verified against official Supabase docs. **And a gap the CONTEXT does not name: this repository has no password-set surface at all** |
| ACCT-04 | Creation, promotion, rejection and deactivation recorded in the same register, with author and timestamp | § D — no audit table exists today; the register template the repo already owns (`door_scan_events`); how the author is captured; future writers from Phase 35 |
| ACCT-05 | A free staff entry is recorded in the night's attendance like any other | § F — verified: it already flows through unchanged. The open question is *readability*, and it is a real one |
</phase_requirements>

---

## Summary

Three of this phase's nine requirements are, structurally, already satisfied by
code that exists — and knowing that changes what the plans should contain.
`ACCT-02` (valid for entry immediately) needs no new mechanism: neither
`/api/membership/verify`'s door path nor `/api/membership/list`'s roster reads
`role` or `status` at all, so a profile row with a `membership_code` is admissible
the moment the `handle_new_user` trigger writes it. `ACCT-05` likewise: the
attendance insert at `src/app/api/membership/verify/route.ts:348-357` has no role
branch, so a staff entry is recorded today without a line of new code — the real
question is not *whether* it is counted but whether the night's numbers can be
**read**, and that needs a decision, not a mechanism. And `ACCT-01`'s ceiling is
already encoded: `verifyMaster` / `verifyAdminOrOrganizer`
(`src/app/(admin)/admin/members/actions.ts:88-109`) implement exactly "an
organizer may approve and promote, an organizer may not reach master", with the
reasoning written against `ACCESS-MODEL-DECISIONS.md` §6 in the file itself.

The hard item is `ROLE-02`/`ROLE-03`, and this session **measured** it in a
throwaway PostgreSQL 17.6 container rather than reasoning about it. The result
narrows the design space sharply: of the five relaxation mechanisms the phase
brief lists, **four cannot relax a `CHECK` constraint at all**. A CHECK cannot be
`DEFERRABLE` (Postgres refuses the DDL outright), `NOT VALID` still refuses every
new insert *and* every update to an already-violating row, a `SECURITY DEFINER`
function does not bypass it, superuser does not bypass it, and
`session_replication_role = 'replica'` does not bypass it. With a CHECK the only
mechanism is drop-and-restore — and the restore **must** be `NOT VALID` or it
fails on the rows just seeded. A trigger, by contrast, is compatible with all of
them. That is the fork, and it is decidable on evidence.

Two findings are not in the CONTEXT and should change the plan. First: `ACCT-03`
asks for a link to set a password, and **no surface in this repository can set
one** — `supabase.auth.updateUser({ password })` appears nowhere
(`grep -rn "updateUser" src/` returns two hits, both `{ email }`). The link
therefore lands an authenticated person on `/dashboard` with no password field.
Second: `32-HUMAN-UAT.md`'s test M-12 — the one the owner called "run this one
first", the door — requires **creating an `organizer/pending` account in
production**, and D-04's constraint makes that state unrepresentable. Those two
decisions collide, and the collision has an ordering answer.

**Primary recommendation:** enforce D-04 with a **`CHECK` constraint** on
`public.profiles`, add it in the same migration that widens both role constraints,
and express D-05 as an explicit `DROP CONSTRAINT` / `ADD CONSTRAINT … NOT VALID`
pair inside `seedContainer`'s existing `try/finally` — the same shape
`scripts/container/seed.mjs:223-238` already uses for `on_auth_user_created`. Run
`32-HUMAN-UAT.md` M-12 **before** the constraint migration is applied, in a plan
of its own, or record in writing that it can never be run as written.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| The fourth role exists | Database / Storage | — | Two `CHECK` constraints and a set of grant rows. `src/types/database.ts:20` mirrors it, but the database is the definition (`supabase-data.md`, migrations are the source of truth) |
| `role ⇒ approved` | Database / Storage | — | D-04 is the decision that this must **not** live in the API tier. Any application-tier copy re-creates the convention it replaces |
| Capability grant for `staff` | Database / Storage | — | `private.role_capabilities` is data; `private.has_capability` is the only resolver (`20260807000000_capability_model.sql:192-217`) |
| Account creation (auth user) | API / Backend | — | Requires the service-role key; `getServiceClient()` is server-only by construction (`src/lib/supabase/service.ts:3-8`) |
| The invitation email | API / Backend | — | Resend via `src/lib/email.ts:12`; a client component must never hold the key |
| Setting a password | Browser / Client | Frontend Server (SSR) | `supabase.auth.updateUser({password})` needs the recovery session in the browser's cookie. **This surface does not exist yet** |
| Authorisation for creation | API / Backend | — | Server action; asks Phase 33's `getAccessContext()`. Never the middleware alone (`access-gating.md`, gate *RLS-è-il-confine*) |
| The attribution register | Database / Storage | API / Backend | The rows are the record; the author is captured server-side from `ctx.userId` — never from a form field |
| Reading the register | Frontend Server (SSR) | Database / Storage | A Server Component read, gated by capability, with RLS as the actual boundary |
| `MASTER_EMAIL` reconciliation | API / Backend | — | `src/app/api/auth/callback/route.ts` — a route handler with the service client |
| Free staff entry counted | API / Backend | Database / Storage | Already `src/app/api/membership/verify/route.ts:348`; the door's offline tier only *reads* the roster |

**Where this map already prevents a mistake:** the temptation on D-04 is to add a
guard in `updateMemberRole` and call it enforced. That is the API tier doing the
database tier's job, and it is precisely the convention D-04 exists to abolish.

---

## Project Constraints (from CLAUDE.md)

These are binding, and each one changes something concrete in this phase.

| Directive | Source | Consequence here |
|---|---|---|
| **No test runner exists for the product** | `CLAUDE.md` Guardrail 1; verified: `package.json:5-16` has no `test` script, `find src -name '*.test.*' -o -name '*.spec.*'` returns nothing | Nothing in this phase may be called verified because tests pass. The available gates are `npm run build`, `npm run verify:capabilities`, `npm run verify:persona`, `npm run verify:no-header-identity`, `npm run baseline:container`, `npm run baseline:compare`, and written manual procedures |
| **`next build` is the typecheck gate** | Guardrail 2; `package.json:7` — `next build --webpack` | A migration is not typechecked. A new table's column names are not typechecked either — **no Supabase client in this repo is parameterised with `Database`** (`src/lib/supabase/service.ts:4`, `src/lib/capabilities/server.ts:202` calls `.rpc()` untyped), recorded in `.planning/STATE.md` |
| **Migrations are the source of truth for RLS, not `schema.sql`** | Guardrail 3; `supabase-data.md` | The role constraint must be widened by a **migration**. `schema.sql:59` is edited too, but only because it is the fresh-database base — see § A.1 for why both matter and why the container reads neither current one |
| **`.planning/codebase/` is dated 2026-02-24 and partly stale** | Guardrail 4 | Nothing from it is cited in this file without re-verification against current code |
| **The repository is PUBLIC** | Guardrail 5; `ai-engineering.md` gate *la pianificazione è pubblica* | This file names roles only. If the account-creation surface needs example copy naming a person, that copy belongs in `docs/` (gitignored), not in a plan |
| **macOS/BSD**: `grep -E`, `sed -i ''` | Guardrail 6 | Applies to any script the plans add |
| **No error tracking exists** | `meta-gates.md`, verified 2026-08-05 | A refused write from D-04's constraint must have an **observable** effect. See § B.2 — three of the five member-mutation actions would today render it as an unstyled Next error boundary, and `bulkApproveMember` would report success for a batch that partly failed |
| **Migration in avanti** | `supabase-data.md` | `20260807000000_capability_model.sql` is applied to production. Its `role` CHECK is corrected **forward**, in a new file, never edited |
| **Tabella nuova = policy nuova** | `supabase-data.md` | The attribution register gets `ENABLE ROW LEVEL SECURITY` and at least one policy **in the same migration** |
| **Tipi allineati** | `supabase-data.md` | `src/types/database.ts:20` (`UserRole`) and a `Profile`-adjacent interface for the register change in the same commit as the migration |
| **Email in Italian, transactional from `noreply@`** | `comms-analytics.md` | The invitation email copy is Italian; the interface stays English |
| **Una mail non si richiama** | `comms-analytics.md` | The creation path must be idempotent **per recipient**. Creating the same email twice must not send two invitations — and `auth.admin.createUser` on a duplicate email errors, which is the natural idempotency key |
| **Guardie monotone** | `meta-gates.md` | D-12 is the analogue case, and the demotion path must not become a *new* undeclared switch. § E.4 |

---

## Standard Stack

No new library is needed for this phase. Every mechanism it requires is already a
dependency or already in the database.

### Core

| Library / mechanism | Version | Purpose | Why standard here |
|---|---|---|---|
| PostgreSQL `CHECK` constraint | 17.6 | Enforce `role ⇒ approved` | Cannot be bypassed by superuser, by `SECURITY DEFINER`, or by `session_replication_role` — all three **measured this session**. That un-bypassability is the whole value of D-04 |
| `private.role_capabilities` rows | — | Grant `membership.card.view` to `staff` | The model exists (`20260807000000_capability_model.sql:120-125`); a new role is **data**, not schema — that was phase 32's point |
| `@supabase/supabase-js` `auth.admin.createUser` | `^2.97.0` (`package.json:23`) | Create the auth user | Already the pattern at `src/lib/guest-list/process-entry.ts:220` |
| `@supabase/supabase-js` `auth.admin.generateLink({type:'recovery'})` | `^2.97.0` | Produce a set-password link | `recovery` requires an existing user and **does** allow setting a password; `invite` creates a user and does **not** set a password `[CITED: supabase.com/docs/reference/javascript/auth-admin-generatelink]`. The existing comment at `process-entry.ts:234` is accurate |
| `resend` via `src/lib/email.ts:12` | `^6.9.2` (`package.json:37`) | Send the invitation | The one send path; already used by `sendApprovalEmail` (`admin/members/actions.ts:24-33`) |
| `@react-email/render` + a template in `src/emails/` | `^2.0.4` | The message body | Eleven templates exist; `guest-invitation.tsx` already renders a `claimUrl` at :100 |

### Supporting

| Mechanism | Purpose | When to use |
|---|---|---|
| `ALTER TABLE … DISABLE TRIGGER` inside `try/finally` | Seed-time relaxation | **Only if D-04 is a trigger.** The precedent is `scripts/container/seed.mjs:223-238` |
| `ALTER TABLE … ADD CONSTRAINT … NOT VALID` | Restore after a drop-and-seed | **Mandatory** if D-04 is a CHECK and the seed drops it — a plain re-add fails (§ B.3, C1) |
| Supabase Management API `POST /v1/projects/{ref}/database/migrations` | Apply the migration | Recorded working in `.planning/STATE.md`; keeps the migration history truthful, unlike `/database/query` |

### Alternatives Considered

| Instead of | Could use | Trade-off |
|---|---|---|
| `CHECK` constraint for D-04 | `BEFORE INSERT OR UPDATE` trigger | The trigger can be relaxed four ways instead of one, and can choose its own SQLSTATE and message. But `ALTER TABLE … DISABLE TRIGGER` is available to the **table owner**, not only to a superuser — **measured** (§ B.1, G4) — so the rule is weaker than a CHECK against anyone who reaches the owner role |
| A new register table | Extending `profiles` with `approved_by` / `approved_at` columns | Columns hold the *latest* act only. A promotion followed by a demotion overwrites the promotion, and D-11 asks for a register a season can be read from. Rejected |
| A new register table | Reusing `approved_via` (`profiles.approved_via`, three values, `20260310000000_guest_list.sql:17-18`) | Same defect, plus `approved_via` records the *channel*, never the author or the moment. It is a useful **secondary** signal for D-08 ("counted like an approval") and should be set, but it is not the register |
| A native `ENUM` for `role` | — | The RBAC migration chose `CHECK` over `ENUM` explicitly and said why: *"Using CHECK constraints (not native PostgreSQL ENUMs) for easier production modifications"* (`20260224_rbac_migration.sql:10`). Adding `staff` is exactly the modification that reasoning anticipated. Do not switch |

**Installation:** none. No package is added by this phase.

---

## Package Legitimacy Audit

**Not applicable — this phase installs no external package.**

Every mechanism above is either a PostgreSQL feature or an already-present
dependency of `package.json`. The legitimacy gate was therefore not run, and this
is a scope statement, not a skipped check: if a plan later proposes a package
(for example a `server-only` guard, which `src/lib/capabilities/server.ts:15-19`
explicitly declines to add), that plan owns running
`slopcheck install <pkg> --json` plus `npm view <pkg> version` before the install
task, and must gate it behind a `checkpoint:human-verify`.

---

## Architecture Patterns

### System Architecture Diagram

```
                        ┌─────────────────────────────────────────────┐
   an organizer or      │  Server Action: createAccount(…)            │
   master, in a         │  ── src/app/(…)/…/members/actions.ts        │
   browser        ──────▶  1. getAccessContext()  ← Phase 33 DAL      │
                        │     asks public.my_access_context()         │
                        │     REFUSES on null userId                  │
                        │  2. capability gate:                        │
                        │     STAFF_MANAGE  → may create member/staff │
                        │     MASTER_MANAGE → may create organizer    │
                        │     nothing       → may create master       │
                        └───────────┬─────────────────────────────────┘
                                    │ service-role client (bypasses RLS)
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
        ┌─────────────────────────┐   ┌─────────────────────────────┐
        │ auth.admin.createUser   │   │ auth.admin.generateLink     │
        │ email_confirm: true     │   │ type: 'recovery'            │
        └───────────┬─────────────┘   └──────────┬──────────────────┘
                    │ INSERT on auth.users        │ properties.action_link
                    ▼                             │
        ┌───────────────────────────────┐         │
        │ TRIGGER on_auth_user_created  │         │
        │ → handle_new_user()           │         │
        │   writes role='member'        │         │
        │   status = pending | approved │         │
        │   membership_code RSN-xxxxxxxx│         │
        └───────────┬───────────────────┘         │
                    │                             │
        ┌───────────▼───────────────────┐         │
        │ UPDATE profiles               │         │
        │   role   = 'staff'|'organizer'│         │
        │   status = 'approved'         │◀── D-04 constraint judges
        │   approved_via = admin_manual │    THIS write. 23514 or nothing.
        └───────────┬───────────────────┘         │
                    │                             │
        ┌───────────▼───────────────────┐         │
        │ INSERT membership_acts        │  ← D-11 register: actor_id,
        │ (the register, § D)           │    subject_id, act, at
        └───────────┬───────────────────┘         │
                    │                             ▼
                    │                  ┌──────────────────────────┐
                    │                  │ Resend · Italian copy    │
                    │                  │ noreply@ · link, never   │
                    │                  │ a password               │
                    │                  └──────────┬───────────────┘
                    │                             │
                    │                             ▼
                    │                  ┌──────────────────────────┐
                    │                  │ /api/auth/callback       │
                    │                  │  exchangeCodeForSession  │
                    │                  │  MASTER_EMAIL reconcile  │
                    │                  │  → redirect ?next=       │
                    │                  └──────────┬───────────────┘
                    │                             ▼
                    │                  ┌──────────────────────────┐
                    │                  │ set-password surface     │
                    │                  │ updateUser({password})   │
                    │                  │ ★ DOES NOT EXIST TODAY   │
                    │                  └──────────────────────────┘
                    │
   ── the door, entirely independent of everything to the right ──
                    │
                    ▼
        ┌──────────────────────────────────────────────────────────┐
        │ GET /api/membership/list  (door.operate)                  │
        │   select id, full_name, membership_code from profiles     │
        │   ── NO role filter, NO status filter ─────────────────    │
        └───────────┬──────────────────────────────────────────────┘
                    │ cacheMembers() → IndexedDB "members"
                    ▼
        ┌───────────────────────┐        ┌──────────────────────────┐
        │ radio ON:             │        │ radio OFF:               │
        │ POST /api/membership/ │        │ findMember(code)         │
        │      verify           │        │  not in cache → REFUSED  │
        │ → INSERT attendances  │        │  in cache → queued       │
        │   (no role branch)    │        │            locally       │
        │ → INSERT door_scan_   │        └──────────────────────────┘
        │        events         │
        └───────────────────────┘
```

Read the diagram's two halves separately. Everything right of `createUser` is the
person's *account*. Everything below `/api/membership/list` is the *door*, and the
door never asks who they are beyond "is this code in the roster". That separation
is why `ACCT-02` is nearly free and why its one failure mode is a caching
problem, not an authorisation one.

### Pattern 1: Correct a constraint forward, in one transaction, both tables

**What:** `role` is constrained in **two** places. Widening one and not the other
produces a database where `staff` accounts exist and hold no capability at all.

**When to use:** the migration that lands `staff`.

```sql
-- Source: shape derived from supabase/migrations/20260807000100_capability_model_fk_index.sql
--         (the repo's own "correct it forward" precedent) and 20260805120000_door_scan_events.sql
BEGIN;

-- 1. public.profiles.role — created by 20260224_rbac_migration.sql:14-15 as an
--    inline unnamed CHECK on ADD COLUMN. Postgres auto-names that
--    `profiles_role_check` — VERIFIED by reproducing the exact DDL in a
--    PostgreSQL 17.6 container this session.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'member'));

-- 2. private.role_capabilities.role — a SECOND constraint, at
--    20260807000000_capability_model.sql:121. Auto-named
--    `role_capabilities_role_check` by the same rule. Miss this one and the
--    INSERT of staff's grant rows below fails.
ALTER TABLE private.role_capabilities
  DROP CONSTRAINT IF EXISTS role_capabilities_role_check;
ALTER TABLE private.role_capabilities
  ADD CONSTRAINT role_capabilities_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'member'));

COMMIT;
```

**Why one transaction:** the same reason
`20260807000000_capability_model.sql:16-20` gives — a half-applied version is
worse than none. A database that admits `role = 'staff'` but whose
`role_capabilities` refuses the row is a database in which a `staff` account can
be created and can do nothing, including see its own membership card.

**Widening a CHECK never needs `NOT VALID`.** Adding a value to an `IN` list is a
strict relaxation, so every existing row already satisfies the new predicate and
the validating scan cannot fail. `NOT VALID` is only relevant to the *new*
constraint of § B.

### Pattern 2: `schema.sql` is edited too, and for a reason that is not the obvious one

`supabase/schema.sql:59` also carries `check (role in ('master','organizer','member'))`.
It must be updated — `supabase-data.md` gate *tipi allineati* by analogy — but
**not because production reads it**. Production's constraint came from the RBAC
migration, and the container reads neither: it builds from
`supabase/schema.sql` **as it stood at the initial commit**, pinned by blob hash
(`scripts/rls-baseline-container.mjs:109-111`, `BASE_SCHEMA_COMMIT` /
`BASE_SCHEMA_BLOB`), then applies every migration in order. The reason is written
at :96-101: the *current* `schema.sql` has drifted alongside five later
migrations and re-applying those over it fails on a duplicate column.

**Consequence, and it is load-bearing:** an edit to `supabase/schema.sql` changes
nothing the container measures and nothing production enforces. It only affects a
hypothetical fresh database. So `schema.sql:59` must be updated for honesty, and
**a plan that updates only `schema.sql` has changed nothing at all.**

### Pattern 3: The explicit refusal — three shapes, one of which is dangerous

D-02 requires that "considered and refused" be distinguishable from "forgotten".

**(a) A `granted boolean` column on `private.role_capabilities`, with `false` rows.**
The most legible: the refusal is a row you can `select`.
**⚠ This is the phase's silent-widening trap.** The resolver at
`20260807000000_capability_model.sql:209-216` is:

```sql
select exists (
  select 1 from public.profiles p
  join private.role_capabilities rc on rc.role = p.role
  where p.id = (select auth.uid())
    and rc.capability = p_capability
    and (not rc.requires_approved or p.status = 'approved')
);
```

Insert `('staff','door.operate', false, granted=false)` **without** adding
`and rc.granted` to that predicate and the `EXISTS` matches — which hands `staff`
the door, `staff.manage`, `master.manage` and every other refused key at once. It
is a one-row-per-refusal widening of the worst possible kind, and it would pass
`npm run verify:capabilities`, because that script reads the **catalogue** and
never the grants (`32-CARRY-FORWARD.md` trap D-32-L, re-verified: `grep -n
"role_capabilities" scripts/verify-capabilities.mjs` returns only a comment at
:50 and a help string at :660). If option (a) is chosen, `has_capability` is
edited in the **same migration**, and the container write matrix is the check
that would catch a mistake.

**(b) A separate declarations table** — e.g. `private.role_capability_decisions
(role, capability, granted, decided_on, reason)` — never read by the resolver, only
by a verification script. No widening risk, because no resolver reads it. Costs a
table nobody consults at runtime.

**(c) Comments in the migration plus a script assertion.** Extend
`scripts/verify-capabilities.mjs` with a fifth side: for every
`(role × capability)` pair in the cross product, assert the pair is either a grant
row or appears in a declared refusal list in the script. Cheapest, and it converts
D-02 from a convention into a mechanism — which is the only form that survives a
later reader.

**Recommendation: (c), or (b) if the refusal must be queryable from SQL. Not (a)
unless `has_capability` is edited in the same file.**

### Anti-Patterns to Avoid

- **Enforcing D-04 in a server action.** `updateMemberRole` already does the right
  thing (`admin/members/actions.ts:136-144`) and D-04 exists because four
  functions each remembering is not a rule. A fifth guard is the defect, not the fix.
- **Removing `door.operate`'s `requires_approved = false`.** D-06 and
  `ROADMAP.md`'s "trap to refuse". The two rows carry the comment *"These two rows
  must not become true"* at `20260807000000_capability_model.sql:415`.
- **Granting `staff` a capability "so the surface works".** If a `staff` account
  needs to reach something, the answer is Phase 35's per-night assignment — which
  `private.has_capability` was built to accept as *another arm of the same OR*
  (`:201-204`). Widening the role instead contradicts D-03.
- **Reading `role` to make a decision.** `src/lib/capabilities/server.ts:149-150`:
  *"No new caller may branch on `role` or `status`."* The two fields survive in the
  payload only for `MobileNav` / `StaffNav` props, and Phase 34 removes them.
- **A `catch` that returns `false` around a capability check.**
  `server.ts:85-87` names this as the defect the file was written to prevent.
- **Adding a fifth role-enumerating switch.** § G lists the eleven that exist. Each
  new one is a place `staff` can be forgotten with no build error.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| "A staff role implies approved" | A shared `assertRoleStatusCoherent()` helper called from every write path | A `CHECK` constraint on `public.profiles` | A helper is the convention D-04 abolishes. **Measured:** the constraint is not bypassable by superuser, by `SECURITY DEFINER`, or by `session_replication_role='replica'` |
| Creating a user with a password | `crypto.randomUUID()` as a temporary password, emailed | `auth.admin.createUser` + `generateLink({type:'recovery'})` | D-10. A password in an inbox is permanent. The pattern is at `process-entry.ts:220-241` |
| A membership code | `generateMembershipCode()` in `src/utils/qr.ts:45-52` | Let `handle_new_user` mint it | Two generators for one identifier will drift. **Note both are `Math.random()`** — the trigger at `20260310000000_guest_list.sql:98-102` and `qr.ts:49`. Open defect QR-01, not this phase's, and not to be *added to* |
| Knowing who did something | A `changed_by` column overwritten per act | An append-only register (§ D) | A column holds only the latest act. `door_scan_events` is this repo's own precedent for "a reversal is a further event, not an erasure" (`20260805120000_door_scan_events.sql:118`) |
| Preventing writes to the register | Application discipline | RLS enabled + **no** write policy | `door_scan_events` is append-only *by construction*: writes come only from the service client, and with RLS on and no write policy no session can add, edit or delete (`20260805120000_door_scan_events.sql:159-163`) |
| Resolving who is calling | `headers().get("x-user-id")` | `getAccessContext().userId` | Phase 33 took the header-reader count to 0 and `npm run verify:no-header-identity` asserts it (`middleware.ts:216-219`) |
| Idempotent invitation | A `sent_invitations` table | `auth.admin.createUser` erroring on a duplicate email | The uniqueness of `auth.users.email` is the idempotency key. `comms-analytics.md`: mark per recipient, not per batch |

**Key insight:** almost every mechanism this phase needs has a precedent *in this
repository*, written with its reasoning. The failure mode is not choosing a bad
library — it is re-inventing a pattern whose original carries a comment
explaining why the obvious alternative was rejected.

---

## A. The role constraint and the capability grants (ROLE-01, D-01, D-02)

### A.1 There are two role constraints, not one — and a third enumeration in the harness

| # | Where | Line | Auto-generated name | Effect if missed |
|---|---|---|---|---|
| 1 | `supabase/migrations/20260224_rbac_migration.sql` | `:14-15` | `profiles_role_check` | **This is the one production enforces.** Missing it: `role = 'staff'` is refused with `23514` |
| 2 | `supabase/migrations/20260807000000_capability_model.sql` | `:121` | `role_capabilities_role_check` | Missing it: staff's grant rows cannot be inserted; every `staff` account holds zero capabilities |
| 3 | `supabase/schema.sql` | `:59` | `profiles_role_check` (fresh DB only) | Missing it: a fresh database diverges from production. Changes nothing the container or production measures — § Pattern 2 |
| 4 | `scripts/rls-baseline.mjs` | `:692` (`PERSONA_SQL`, `where role in ('master','organizer','member')`) | — | A seeded `staff` persona is silently skipped by `resolvePersonas`, then reported `absent` and exits 1. Fails loudly, which is correct |

The auto-generated names were **verified this session** by reproducing the exact
`ALTER TABLE … ADD COLUMN role text … CHECK (…)` DDL of
`20260224_rbac_migration.sql:14-17` in a PostgreSQL 17.6 container:

```
 profiles_role_check   | CHECK ((role = ANY (ARRAY['master'::text, 'organizer'::text, 'member'::text])))
 profiles_status_check | CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
```

`[VERIFIED: postgres:17.6 container, this session]`

A plan should still confirm the live names against production rather than trust
the derivation:

```sql
select conname, pg_get_constraintdef(oid), convalidated
  from pg_constraint
 where conrelid = 'public.profiles'::regclass and contype = 'c';
```

The `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` form with an **explicit name**
is what makes this survivable either way: an explicitly named constraint is
findable by the next migration, whereas a second inline unnamed CHECK would be
auto-named `profiles_role_check1` and the pair would both be enforced.

### A.2 The current grant catalogue, read from the migration — not from memory

Eight capabilities, sixteen grant rows across three roles. Reproduced from
`supabase/migrations/20260807000000_capability_model.sql:351-423`, with the
`requires_approved` value of each row and the D-02 decision for `staff`.

| Capability | Line | `master` | `organizer` | `member` | **`staff` per D-02** |
|---|---|---|---|---|---|
| `staff.manage` | :392-393 | ✔ `false` | ✔ `false` | — | **REFUSED** |
| `master.manage` | :396 | ✔ `false` | — | — | **REFUSED** |
| `catalogue.manage` | :399-400 | ✔ `true` | ✔ `true` | — | **REFUSED** |
| `membership.active` | :403-405 | ✔ `true` | ✔ `true` | ✔ `true` | **open — see A.3** |
| `admin.access` | :408 | ✔ `false` | — | — | **REFUSED** |
| `organizer.access` | :411-412 | ✔ `false` | ✔ `false` | — | **REFUSED** |
| `door.operate` | :416-417 | ✔ `false` | ✔ `false` | — | **REFUSED** |
| `membership.card.view` | :420-422 | ✔ `true` | ✔ `true` | ✔ `true` | **GRANTED, `requires_approved = true`** |

Counting: 2+1+2+3+1+2+2+3 = **16**. Matches the migration's own claim at :386 and
`32-CARRY-FORWARD.md`. `[VERIFIED: supabase/migrations/20260807000000_capability_model.sql:390-423]`

### A.3 `membership.active` is the one capability D-02 does not decide, and it matters

D-02 names seven capabilities: one granted (`membership.card.view`) and six
refused (`door.operate`, `staff.manage`, `catalogue.manage`, `organizer.access`,
`admin.access`, `master.manage`). The catalogue has **eight**. The eighth,
`membership.active`, is unlisted — and it is granted to *all three* existing roles
with `requires_approved = true` (:403-405), because it reproduces a status-only
predicate: `get_user_status() = 'approved'`, role irrelevant
(`20260807000000_capability_model.sql:365-366`).

What it actually gates: *"Act as an approved member: upload event media, rsvp"*
(`src/lib/capabilities/keys.ts:96-97`).

This is a genuine decision, not an omission to paper over, and it deserves the
owner's answer rather than a default:

- **Granted** — a `staff` account is an approved member of the community, which is
  what `ACCESS-MODEL-DECISIONS.md` §9 says today (*"every account (master,
  organizer, staff, member) is a member of the community"*). It could then RSVP
  and upload event media like any member.
- **Refused** — `staff` becomes the only role that cannot RSVP or upload, which
  reads as a punishment rather than a design, and contradicts §9.

**Note the collision with the scope fence if it is granted.** `membership.active`
covers *upload event media*, and D-03 says photo upload is a **per-night
assignment, Phase 35**. Those are two different uploads — a member uploading to a
gallery they attended versus a photographer delivering a night's set — but they
resolve through the same capability today. Granting `membership.active` to `staff`
does not violate D-03 (a `member` already holds it, so `staff` gains nothing a
member lacks), but a plan should say so out loud, because the phrase "staff can
upload photos" would otherwise look like exactly what D-03 forbids.

**Recommendation:** grant it, `requires_approved = true`, and record the sentence
above as the reason. Nine grant rows would then exist for `staff`… no: **two**
grant rows (`membership.card.view`, `membership.active`) and six declared refusals.
Eighteen grant rows in total.

### A.4 What "refused" must look like

Per § Pattern 3. The plan must pick one of (b) or (c) — or (a) *with*
`has_capability` edited in the same file — and the acceptance criterion is:
**someone reading the database or one script in six months can tell that
`staff` × `door.operate` was decided and refused, not overlooked.** A comment in a
migration alone does not meet that bar, because `20260807000000` already
demonstrates how much comment a reader can skim past.

---

## B. `role ⇒ approved` as a database rule (ROLE-02, D-04) and the harness cost (ROLE-03, D-05)

This is the phase's hardest item. Everything in this section marked
`[VERIFIED: postgres:17.6 container]` was measured this session in a throwaway
`postgres:17.6` container — production's exact major.minor per
`scripts/rls-baseline-container.mjs:75` — and then destroyed.

### B.1 The mechanism options, with every bypass path measured

Candidate predicate: `role NOT IN ('master','organizer','staff') OR status = 'approved'`.

| Question | `CHECK` constraint | `BEFORE INSERT OR UPDATE` trigger |
|---|---|---|
| Can it be `DEFERRABLE`? | **No.** `ERROR: CHECK constraints cannot be marked DEFERRABLE` `[VERIFIED]` | N/A — a trigger has no deferral, but see the next three rows |
| Does `SECURITY DEFINER` bypass it? | **No.** Refused inside a `security definer` function body `[VERIFIED]` | **No** `[VERIFIED]` |
| Does superuser bypass it? | **No.** Refused as `postgres`, `usesuper = t` `[VERIFIED]` | Yes, indirectly — see the two rows below |
| Does `session_replication_role='replica'` bypass it? | **No** `[VERIFIED]` | **Yes** — the insert succeeded `[VERIFIED]`. Requires superuser: a plain role gets `ERROR: permission denied to set parameter "session_replication_role"` `[VERIFIED]` |
| Can it be disabled per-table? | Only by `DROP CONSTRAINT` | **Yes**, `ALTER TABLE … DISABLE TRIGGER` — and **the table OWNER may do it, not only a superuser** `[VERIFIED]` |
| SQLSTATE on refusal | `23514`, with `SCHEMA NAME`, `TABLE NAME`, `CONSTRAINT NAME` fields populated `[VERIFIED]` | Whatever `RAISE … USING errcode`, `constraint`, `table`, `schema` sets — including an exact `23514` + `role_implies_approved` impersonation `[VERIFIED]` |
| Does the FK-style `NOT VALID` escape hatch help? | **No** — see B.1b | N/A |

**B.1b — the `NOT VALID` misconception, measured, because it is the trap in the
phase brief.** `ADD CONSTRAINT … NOT VALID` skips the validating scan of
*existing* rows. It does **not** stop enforcement:

```
insert into t (role, status) values ('organizer','rejected');
  → ERROR: 23514 new row for relation "t" violates check constraint "ria"     [VERIFIED]

-- a compliant row (member/pending) updated INTO violation (organizer/pending)
  → ERROR: 23514                                                              [VERIFIED]

-- an already-violating row (organizer/pending) touched on an UNRELATED column
update t set note = 'x' where id = <the violating row>;
  → ERROR: 23514 … Failing row contains (…, organizer, pending, x)            [VERIFIED]
```

That last one is the important one and it has a direct consequence for the
harness (§ B.3). A `NOT VALID` CHECK **freezes** every pre-existing violating row:
no column of it can ever be updated again while the constraint stands.

**Existing rows.** No claim is made here about whether production holds a
violating row. `.planning/phases/32-…` documents state production holds four
profiles — one `master/approved`, three `member/approved`
(`scripts/rls-baseline-container.mjs:5-6`, `rls-baseline.mjs:653-654`) — which
would violate nothing, but that is a derived claim dated 2026-08-06 and
`ai-engineering.md` gate *documentazione datata* requires re-measuring it. **The
migration must open with the count, not assume it:**

```sql
select role, status, count(*)
  from public.profiles
 where role in ('master','organizer','staff') and status <> 'approved'
 group by role, status;
```

Zero rows → add the constraint **validated**. Non-zero → the plan owes a written
decision per row *before* the DDL, because a `NOT VALID` add would freeze those
rows permanently.

### B.2 How a refused write surfaces — and where today's code would swallow it

A CHECK violation arrives at the Supabase JS client as a PostgREST error with
`code: "23514"`. The `error.message` and `error.details` carry the constraint name
and the failing row. `[VERIFIED: SQLSTATE and error fields measured in-container;
the PostgREST mapping is inferred from the shape of existing handling —
`membership/verify/route.ts:275` already branches on `profileError.code !== "PGRST116"`,
so PostgREST error codes do reach this code`] `[ASSUMED: that PostgREST forwards
23514 unchanged rather than remapping it]` — a plan should confirm this once by
attempting a violating update through the service client and printing
`error.code`.

**What today's five member-mutation actions would do with a `23514`** — read from
`src/app/(admin)/admin/members/actions.ts`:

| Action | Line | Current error handling | What a `23514` becomes |
|---|---|---|---|
| `updateMemberRole` | :146-148 | `throw new Error("Failed to update role: " + error.message)` | A throw. `MemberTable.tsx:182-190` catches it into `setError(e.message)` — so in `next dev` the constraint name is visible. **In production Next redacts a Server Action error message** (`src/lib/capabilities/server.ts:59-63`), so the user sees the generic redacted text |
| `deactivateMember` | :167-169 | same shape | same |
| `reactivateMember` | :184-186 | same shape | same |
| `approveMember` | :211-213 | same shape | same |
| `rejectMember` | :244-246 | same shape | same |
| `bulkApproveMember` | :275-282 | `.in("id", memberIds)` — one statement | **The whole batch fails**, and the message names one failing row out of N. Worse: if the statement had partly succeeded there would be no way to say which |
| `bulkRejectMember` | :319-326 | same | same |

Three things follow, and they are `meta-gates.md` *zero fallimenti silenziosi*
applied literally:

1. **The redaction boundary is real and is already documented in this repo.**
   `server.ts:59-63`: a client that branches on `err.message` works in `next dev`
   and stops working in production. So a caller that must show *"this write was
   refused because a staff role must be approved"* has to carry the category as a
   **value** — a tagged result — not as a message. The precedent to copy is
   `NewsletterResult` (`server.ts:79-81`).
2. **Because there is no error tracking, the log is not the answer.** The
   observable effect must be the surface: a distinct notice in `MemberTable`, not
   a generic "Action failed".
3. **A refusal that only the constraint can produce should be unreachable by
   design.** `updateMemberRole` already writes `{role, status:'approved'}` together
   when promoting (:140-142). The new paths must do the same. The constraint is
   then a net that never fires in normal use — which is exactly what a good
   constraint looks like, and it is also why (1) and (2) still matter: the day it
   fires, it fires on a path nobody tested.

### B.3 How the container harness regains the four forbidden personas — the seam

**What the harness actually seeds.** Correct a number the upstream documents get
slightly wrong: `ACCESS-MODEL-DECISIONS.md` §11 and `43-CONTEXT.md` both say
"eleven personas". `scripts/container/seed.mjs:102-124` seeds **nine profile
rows** — `PERSONA_ROLES` (3) × `PERSONA_STATUSES` (3), `rls-baseline.mjs:638-639`.
The number eleven is the count of persona *labels*, which adds `anon` and
`authenticated/no-profile` (`rls-baseline.mjs:642-646`) — neither of which is a
profile row. Both statements are right about different things; the plan needs the
nine, because the constraint only touches rows.

**Where the harness would break, precisely.** Three places, in the order they fire:

1. `scripts/container/seed.mjs:230-234` — the `insert into public.profiles` loop.
   With D-04 in place, four of the nine iterations raise `23514` and
   `seedContainer` throws.
2. `scripts/container/seed.mjs:357-367` — `assertDiscriminating` requires the
   **full** grid: `if (grid.length !== expectedCells) throw`. A grid with the four
   cells missing is an explicit, named refusal — *"a grid with a hole cannot show
   it. Nothing was measured."* This is the harness refusing to hand back a
   database it cannot discriminate with, and it is working as designed.
3. `scripts/rls-baseline.mjs:664-666` — `EXPECTED_PERSONAS.container` is
   `[...PERSONA_LABELS]`, all eleven. A missing persona is exit 1.

The harness therefore **fails loudly**, not silently. That is good news: the phase
cannot lose the net by accident. It can only lose it by lowering a floor, which
`seed.mjs:318-324` explicitly forbids (*"investigate the seed, never lower the
requirement"*).

**The five candidate mechanisms, and which pair with which enforcement:**

| Option | With a `CHECK` constraint | With a trigger |
|---|---|---|
| **1. Explicit drop / restore around seeding** | **WORKS — and is the only option that does.** The restore **must** be `ADD CONSTRAINT … NOT VALID`: a plain re-add fails with `ERROR: check constraint "ria" of relation "t2" is violated by some row` `[VERIFIED]` | Works (`DROP TRIGGER` / `CREATE TRIGGER`), but heavier than option 3 |
| **2. Session-scoped disable (`SET CONSTRAINTS ALL DEFERRED`)** | **IMPOSSIBLE.** A CHECK cannot be `DEFERRABLE`, so `SET CONSTRAINTS` has nothing to defer `[VERIFIED]` | N/A |
| **3. `ALTER TABLE … DISABLE TRIGGER` in `try/finally`** | **IMPOSSIBLE** — there is no trigger | **WORKS, and matches the existing precedent exactly.** `seed.mjs:223-238` already does this for `on_auth_user_created` `[VERIFIED: all four forbidden personas seeded, re-enable restored enforcement]` |
| **4. A `SECURITY DEFINER` seeding function** | **IMPOSSIBLE.** `SECURITY DEFINER` does not bypass a CHECK `[VERIFIED]` | Does not help either — the trigger still fires inside the function `[VERIFIED]` |
| **5. Set the constraint `NOT VALID` in the container only** | **DOES NOT WORK.** `NOT VALID` still refuses every new violating insert `[VERIFIED]`. This is the most plausible-sounding option in the brief and it is wrong | N/A |
| *(bonus)* `session_replication_role = 'replica'` | Does not bypass a CHECK `[VERIFIED]` | **Bypasses an origin trigger** `[VERIFIED]`; requires superuser `[VERIFIED]`, which the container admin is |

**The CHECK recipe, verified end to end in-container:**

```js
// inside seedContainer(admin), wrapping the existing persona loop —
// same try/finally shape as seed.mjs:223-238, and for the same stated reason
await admin.query(
  'alter table public.profiles drop constraint profiles_role_implies_approved'
);
try {
  // … the nine-persona loop, unchanged …
} finally {
  // NOT VALID is MANDATORY: four rows now violate the predicate, and a plain
  // re-add fails with 23514. VERIFIED in postgres:17.6.
  await admin.query(
    `alter table public.profiles
       add constraint profiles_role_implies_approved
       check (role not in ('master','organizer','staff') or status = 'approved')
       not valid`
  );
}
```

**Two consequences of the `NOT VALID` restore that the plan must own:**

- **`convalidated` differs between container and production** (`f` vs `t`). Neither
  B1 (policy dump) nor B2/B3 (persona matrices) captures `pg_constraint`, so no
  comparator will notice — **which is itself the risk**, because the container is
  then enforcing a slightly different object than production. It should be
  asserted deliberately: after the restore, read back
  `pg_get_constraintdef(oid)` and assert it is byte-identical to the migration's
  predicate modulo the trailing ` NOT VALID`.
- **The four seeded rows become frozen.** Per B.1b, a `NOT VALID` CHECK refuses any
  update to an already-violating row, even on an unrelated column. This directly
  threatens the write matrix — and the next paragraph is the good news.

**Does the frozen-row effect poison the sixteen cells? Measured: no, but by one
row's luck.** The write matrix's `update` probe targets **one** row per table:
`buildProbeStatement` (`rls-baseline.mjs:1270-1271`) uses
`where (pk) = '<key>'`, and `key` comes from `resolveProbeKeys`
(`:1221-1231`) as `min(pk)` — the **lowest** primary key. Persona ids are
`32000004-0000-4000-8000-<index padded to 12>` (`seed.mjs:115`), assigned by
`for role of PERSONA_ROLES { for status of PERSONA_STATUSES }` (:105-106) with
`PERSONA_ROLES = ['master','organizer','member']` and
`PERSONA_STATUSES = ['approved','pending','rejected']` (`rls-baseline.mjs:638-639`).
Index 1 is therefore **`master/approved`** — which satisfies the constraint. The
`profiles × update` cells are unaffected.

That is **fragile**, and the plan should nail it down rather than inherit it:

- Reorder `PERSONA_STATUSES` so `pending` comes first, and index 1 becomes
  `master/pending` — a frozen row — and all eleven `profiles × update` cells flip
  from an RLS verdict to `23514`. The comparator would report eleven
  `b3_cell_changed` defects with no obvious cause.
- Insert `'staff'` **before** `'master'` in `PERSONA_ROLES` and index 1 becomes
  `staff/approved` — still compliant, still fine. Append it after `'member'` and
  index 1 is unchanged.

**Recommendation:** add an assertion to `seed.mjs` that the row chosen by
`min(id)` in `profiles` satisfies the constraint, with a comment saying why. Two
lines that prevent a silent eleven-cell regression.

### B.4 Should `staff` be added to `PERSONA_ROLES`? — a real fork with a measurable price

`ROLE-03` names only the four states, so the literal requirement is met without
touching `PERSONA_ROLES`. Adding `staff` would be *more* coverage — 4×3 = 12
profile personas, 14 labels, and two further forbidden states (`staff/pending`,
`staff/rejected`).

**The price is unwaivable.** `scripts/rls-baseline-compare.mjs` treats a new
persona and a new cell as **defects**:

- `:705-708` — `b2_persona_added`: *"absent from the before capture, present in the after."*
- `:751` — `b3_cell_added`: *"absent before, probed after."*

And there is **no override flag for either**. The only escape hatch in the
comparator is `--allow-lint-move` (`:1076-1086`), which applies to B5 structural
lints only. So adding `staff` to `PERSONA_ROLES` makes every subsequent
before/after comparison in this phase report defects — the exact "waved through on
every later comparison" cost that
`20260807000100_capability_model_fk_index.sql:31-38` describes and refuses to pay
for a different invariant.

| Option | Coverage | Comparator cost |
|---|---|---|
| Leave `PERSONA_ROLES` at three | Satisfies `ROLE-03` literally. `staff` is never probed by the write matrix — so a policy that accidentally admitted `staff` would not be caught | Zero. Every comparison stays clean |
| Add `staff` | 12 personas; `staff` × 20 tables × 3 verbs = 60 new write cells, plus 20 read cells | `b2_persona_added` ×1, `b3_cell_added` ×60, unwaivable, on every comparison for the rest of the phase. Also requires editing `PERSONA_SQL` at `:692` and re-baselining |

**Recommendation:** add `staff`, but **in its own plan, as a deliberate
re-baseline**, sequenced so that the constraint work's before/after comparisons
all happen either wholly before or wholly after it. Adding a fourth role to the
model and never probing it is how a role acquires a capability nobody notices —
and the write matrix is the only detector this repository has that has ever caught
that class of defect. The re-baseline is a cost; a blind spot is a defect.

---

## C. Account creation (ACCT-01, ACCT-02, ACCT-03, D-07…D-10)

### C.1 The exact existing pattern, to be reused

From `src/lib/guest-list/process-entry.ts`, Path 3 (`:218-241`):

```ts
// :136  const serviceClient = getServiceClient();
//       → src/lib/supabase/service.ts:3-8 — createClient(NEXT_PUBLIC_SUPABASE_URL,
//         SUPABASE_SERVICE_ROLE_KEY). Bypasses ALL RLS.

// :219-226
const { data: authUser, error: authError } =
  await serviceClient.auth.admin.createUser({
    email: emailLower,
    email_confirm: true,                 // no confirmation mail; the account is live
    user_metadata: {
      full_name: `${entry.first_name} ${entry.last_name}`,
      guest_list_event_id: entry.event_id,   // ← read by handle_new_user
    },
  });
if (authError) throw new Error(`Failed to create user: ${authError.message}`);

// :234-238 — "recovery type for existing user, NOT invite which creates users"
const { data: linkData, error: linkError } =
  await serviceClient.auth.admin.generateLink({ type: "recovery", email: emailLower });
if (linkError) console.error("Failed to generate recovery link:", linkError);
// :240-241 — continues WITHOUT the link on failure

// :243-245
const claimUrl = linkData?.properties?.action_link
  || `${process.env.NEXT_PUBLIC_APP_URL || "https://resonate.app"}/login`;

// :247-249 — a 500 ms sleep, waiting for the handle_new_user trigger
await new Promise((resolve) => setTimeout(resolve, 500));
```

Verified against official documentation: `generateLink` accepts
`signup | invite | magiclink | recovery | email_change_current | email_change_new`;
`recovery` requires an **existing** user and produces a password-setting link;
`invite` creates a user and does **not** set a password
`[CITED: supabase.com/docs/reference/javascript/auth-admin-generatelink]`. The
code comment at :234 is accurate.

**Three things in this pattern are defects to fix rather than copy:**

1. **`await new Promise(resolve => setTimeout(resolve, 500))` at :247-249.** A
   sleep is not a synchronisation primitive. `handle_new_user` is a synchronous
   `AFTER INSERT` trigger on `auth.users`, so by the time `createUser` returns the
   profile row should already exist — the sleep suggests either observed
   flakiness or defensive superstition, and neither is recorded. **This phase must
   not sleep**, because the very next statement is the `UPDATE` that sets
   `role='staff'`, and if that update finds no row it affects zero rows and
   `error` is `null` — a **silent** failure of exactly the shape `meta-gates.md`
   forbids. Instead: read the row back, or use `.select()` on the update and assert
   one row.
2. **The link failure at :239-241 is swallowed** — `console.error` then continue,
   and `claimUrl` silently falls back to `/login`. The recipient gets an
   invitation whose button goes to a login page for an account with no password.
   Given `ACCT-03`, that is the requirement failing quietly. It must be an
   observable failure: either the whole creation fails, or the surface tells the
   organizer *"the account exists but the invitation link could not be generated"*.
3. **`process.env.NEXT_PUBLIC_APP_URL || "…"`** — `comms-analytics.md` gate
   *variabili d'ambiente verificate*. And `MEMORY.md` records a real incident:
   `NEXT_PUBLIC_APP_URL` with a trailing newline broke the SumUp webhook URL.

### C.2 What makes a created account "valid for entry immediately" — traced

Follow the entry path and find that ACCT-02 needs **no new mechanism**:

| Step | File:line | What it checks | Does it read `role` or `status`? |
|---|---|---|---|
| Roster download | `src/app/api/membership/list/route.ts:52-56` | `select id, full_name, membership_code from profiles where membership_code is not null` | **No.** No role filter, no status filter |
| Roster caching | `src/lib/offline/checkin-store.ts:939-952` | `cacheMembers` keyed on `membershipCode` | No |
| Door, radio on | `src/app/api/membership/verify/route.ts:270-274` | `select id, full_name, membership_code from profiles where membership_code = code` | **No** — grep for `approved` in that file returns only comments (:86-96) |
| Attendance write | `src/app/api/membership/verify/route.ts:348-357` | `insert into attendances (event_id, party_id, user_id, checked_in_at, checked_in_by)` | No |
| Door, radio off | `src/app/(admin)/admin/scanner/ScannerClient.tsx:1337-1348` | `findMember(code)` against IndexedDB; **unknown code is refused** | No |

**The columns that must be set at creation for entry to work before any login:**

| Column | Set by | Required? |
|---|---|---|
| `profiles.id` | `handle_new_user` (= `auth.users.id`) | Yes — FK target for `attendances.user_id` |
| `profiles.membership_code` | `handle_new_user`, `20260310000000_guest_list.sql:98-102` | **Yes — this is the credential.** Nothing else is looked up |
| `profiles.full_name` | `handle_new_user` from `raw_user_meta_data->>'full_name'` | Not for admission, but the door shows it (`ScannerClient.tsx:1366`). Blank means the door names nobody |
| `profiles.role` | `handle_new_user` hardcodes `'member'` (`20260310000000_guest_list.sql:150`) | Must be **UPDATEd** to `'staff'` — `createUser` cannot set it |
| `profiles.status` | `handle_new_user`: `'approved'` if guest-list metadata or a valid referral, else **`'pending'`** (`:105-142`) | **Yes, and this is the trap** — see below |
| `profiles.approved_via` | `handle_new_user` | `'admin_manual'` is a declared value (`20260310000000_guest_list.sql:18`) never written by any code today (`grep -rn approved_via src/` → one hit, `process-entry.ts:160`, `'guest_list'`). Setting it makes D-08 legible |

**The `status` trap.** A plain `createUser` with no referral and no guest-list
metadata produces **`status = 'pending'`** (`:139-140`). For a `member` created by
an organizer, that contradicts D-08 — creating an account *is* approval, so it
must be `approved`, and leaving it `pending` puts a created member in the queue
they were just let out of. For a `staff` account D-04 makes it a hard error. So the
creation path **must** write `status = 'approved'` in the same statement as
`role`, exactly as `updateMemberRole:140-142` already does — and the whole point
of D-04 is that if it forgets, the database says so.

**The one real offline consequence, and it is already documented in the code.**
`ScannerClient.tsx:1322-1336` explains why an uncached membership code is
**refused** offline while an uncached ticket is admitted: a membership QR carries
no signature (`checkin-store.ts:28-32`) and the code space is `Math.random()`
(`qr.ts:49`), so admitting an unknown one would be an unbounded hole. Therefore:

> **A staff account created after a door phone downloaded its roster will be
> refused at that door with the radio off.**

The mitigation exists: the roster-refresh failure is a banner
(`ScannerClient.tsx:583-590`) and the runbook answer is *"check them in from the
list rather than refusing them"*. But `ACCT-02` says "valid for entry
immediately", and *immediately* is false for an offline door. The manual procedure
must state this, and `checkin-offline.md`'s asymmetry — refusing a valid guest is
worse than admitting a duplicate — makes it a real cost, not a footnote. **The
plan should not engineer around it** (`attendance/route.ts:265-268` calls that the
honest limit of an offline door), but it must be written into the night's runbook
and into the account-creation surface's copy: *create staff accounts before the
night, not during it.*

### C.3 The gap the CONTEXT does not name: there is no password-set surface

`ACCT-03` requires a link to set a password. Measured:

```
$ grep -rn "updateUser" src/
src/components/auth/ChangeEmailButton.tsx:20:  supabase.auth.updateUser({ email: trimmed });
```

**One hit, and it is the email, not the password.** `supabase.auth.updateUser({
password })` appears nowhere. `src/components/auth/ResetPasswordButton.tsx:19-21`
only *sends* `resetPasswordForEmail` with `redirectTo: origin + "/dashboard"`.
`find src/app -path "*auth*"` returns `(auth)/login`, `(auth)/register` and
`api/auth/callback` — no reset, no update, no set-password route.

So the current recovery flow is: link → `/api/auth/callback` →
`exchangeCodeForSession` → redirect to `?next=` (default `/dashboard`,
`route.ts:9`) → an authenticated person on their dashboard **with no field in
which to type a password**. Their only recourse is "Reset Password", which sends
the same kind of link back to `/dashboard`. A loop.

**This is a required work item for ACCT-03 that no upstream document names.** The
phase needs a `/set-password` (or `/account/password`) surface calling
`supabase.auth.updateUser({ password })`, and the invitation's `action_link` must
carry `redirectTo` pointing at it — `generateLink` accepts
`options.redirectTo`, which `process-entry.ts:235-237` does not pass
`[ASSUMED: that generateLink honours options.redirectTo in supabase-js ^2.97.0 —
verify against the docs before writing the task]`.

Note also that the existing guest-list invitation has the same hole today: the
`claimUrl` at `guest-invitation.tsx:100` lands a guest in a session with no way to
choose a password. That is a pre-existing defect this phase's fix would also cure.
Whether to cure it is a scope question for the plan; naming it is not optional.

### C.4 Where the mutation actions live, and the ceiling that already exists

All in **`src/app/(admin)/admin/members/actions.ts`** — one file, and note it is
under `(admin)` yet four of its exports are reachable by an organizer:

| Function | Line | Gate | Writes |
|---|---|---|---|
| `verifyMaster` | :88-99 | `CAP.MASTER_MANAGE` + refuses `!ctx.userId` | — |
| `verifyAdminOrOrganizer` | :102-109 | `CAP.STAFF_MANAGE` + refuses `!ctx.userId` | — |
| `updateMemberRole(id, "organizer"\|"member")` | :113-152 | `verifyMaster`; refuses self at :119-121 | `{role, status:'approved'}` on promote; `{role}` only on demote (:140-143) |
| `deactivateMember` | :154-173 | `verifyMaster`; refuses self at :157-159 | `{status:'rejected', role:'member'}` |
| `reactivateMember` | :175-190 | `verifyMaster` — **no self-check** | `{status:'approved'}` only |
| `approveMember` | :194-225 | `verifyAdminOrOrganizer` | `{status:'approved'}` + approval email |
| `rejectMember` | :227-258 | `verifyAdminOrOrganizer` | `{status:'rejected', role:'member'}` + rejection email |
| `bulkApproveMember` | :260-302 | `verifyAdminOrOrganizer` | `{status:'approved'}` over `.in()` |
| `bulkRejectMember` | :304-346 | `verifyAdminOrOrganizer` | `{status:'rejected', role:'member'}` over `.in()` |

Callers: `src/components/admin/MemberTable.tsx:6-10`, buttons at
:199, :204, :221, :230, :239, :248, :258, :263.

**ACCT-01's ceiling is already implemented, and the file says so.**
`actions.ts:46-63` is a comment block that cites
`.planning/ACCESS-MODEL-DECISIONS.md` §6 by name and explains why `verifyMaster`
and `verifyAdminOrOrganizer` must not be merged: merging onto `STAFF_MANAGE`
hands every organizer the power to change a role; merging onto `MASTER_MANAGE`
takes approve/reject from every organizer. So the mapping for creation is
determined by what already exists:

| Act | Gate | Why |
|---|---|---|
| create a `member` | `STAFF_MANAGE` | D-07: creation is approval, and approval is `verifyAdminOrOrganizer` |
| create a `staff` | `STAFF_MANAGE` | Same power as approving; `staff` grants only entry |
| promote `staff` → `organizer` | **`STAFF_MANAGE`** | D-07 says an organizer may do this. **This is a widening**: today changing a role is `MASTER_MANAGE` (`updateMemberRole:117`). It is authorised by D-07 and must be declared as a widening in the commit, not slipped in |
| create an `organizer` directly | `STAFF_MANAGE` if the previous row is granted; otherwise `MASTER_MANAGE` | Open — see Open Questions Q3 |
| create or promote to `master` | **nothing.** No capability. No path | D-07's ceiling |

**A gap worth closing while here.** `reactivateMember:175-190` has **no self-check**
where its three siblings do (`:119`, `:157`). It is `MASTER_MANAGE`-gated so the
blast radius is small, and reactivating yourself is harmless. Worth a line;
not worth a plan.

**And a UI enumeration `staff` will break.** `MemberTable.tsx:178-180` returns "--"
for `member.role === "master"`, and :460-468 offers a role filter with exactly
three `<option>` values. Neither has a `staff` case. See § G.

---

## D. The attribution register (ACCT-04, D-11)

### D.1 What is recorded today: nothing but the mutated row

Measured:

- `grep -l "audit" supabase/migrations/` → one file, `20260805120000_door_scan_events.sql`,
  and that is a scan log, not an act log.
- The complete table list across `schema.sql` + all migrations is 20 public tables
  plus `private.capabilities` / `private.role_capabilities`. **There is no audit,
  log or history table for member acts.**
- Every one of the seven mutation actions in § C.4 writes `profiles` and nothing
  else. No `approved_by`, no `approved_at`, no `promoted_by` column exists on
  `profiles` (`src/types/database.ts:24-34` is the full interface: `id`, `email`,
  `full_name`, `membership_code`, `role`, `status`, `referred_by`, `approved_via`,
  `created_at`, `updated_at`).

So the trace today is **the mutated row and nothing else** — and `updated_at`
carries only the last write. `approved_via` (`'referral' | 'guest_list' |
'admin_manual'`) records the *channel* but never the author or the moment, and
`'admin_manual'` is written by no code path (only by a one-time backfill,
`20260310000000_guest_list.sql:26-27`).

That is the honest starting position: `ACCT-04` is not an extension of an existing
register. **It is the first one.**

### D.2 Options for one register serving all five acts

**Option A — extend `profiles` with `last_acted_by` / `last_acted_at`.** Rejected.
A column holds the latest act; a promotion followed by a demotion erases the
promotion. D-11 asks for something a season can be read from.

**Option B — a new append-only table.** Recommended. The repo already owns the
template, with its reasoning: `public.door_scan_events`
(`20260805120000_door_scan_events.sql:60-163`). The four properties to copy:

1. **A reversal is a further event, not an erasure** (`:118`, `is_undo`).
2. **The subject links are `ON DELETE SET NULL`, not `CASCADE`** (`:75-81`) — *"a
   row whose ticket_id has gone to NULL still says that a scan happened, by whom,
   on which device, at which moment."* Applied here: if a profile is deleted, the
   register must still say an act happened. That means `subject_id uuid REFERENCES
   auth.users ON DELETE SET NULL` plus a **denormalised `subject_membership_code`**
   or similar so the row is still readable — the same reasoning as
   `ticket_refunds.refunded_ticket_id` (`:184-190`), which is deliberately **not**
   a foreign key so it can outlive the row it names.
3. **RLS enabled, `SELECT` policy only, no write policy** (`:145-163`) — append-only
   by construction, because writes come only from the service client.
4. **Text `CHECK` constraints mirroring a TypeScript union** (`:69-99`), with the
   union defined in a module that imports nothing — `src/lib/door/outcome.ts` is
   the precedent, and `src/lib/capabilities/keys.ts:9-23` explains why that
   direction is inverted on purpose.

Shape to consider — the columns, not the final DDL:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `act` | `text not null check (act in (…))` | `'created'`, `'approved'`, `'rejected'`, `'promoted'`, `'demoted'`, `'deactivated'`, `'reactivated'` — and see D.4 for the two Phase 35 values |
| `subject_id` | `uuid references auth.users on delete set null` | who it was done to |
| `subject_label` | `text` | denormalised, survives the delete. **Not an email** — a membership code. `.planning/` and this repo are public and `rls-baseline.mjs:686-689` sets the precedent that a label reaches an artefact and an identifier does not |
| `actor_id` | `uuid not null references auth.users` | **`NOT NULL`.** An unattributed act is the thing D-11 forbids. `door_scan_events.operator_id` is `NOT NULL` for the same reason (`:107`), and `membership/verify/route.ts:146-147` calls an attendance row with no operator *"an unattributed…"* |
| `role_before` / `role_after` | `text` | null on `created`; both set on promote/demote |
| `status_before` / `status_after` | `text` | same |
| `at` | `timestamptz not null default now()` | **The server clock.** `membership/verify/route.ts:343-345`: *"a device clock is evidence, never authority"* |
| `party_id` | `uuid references event_parties on delete set null` | **Nullable, for Phase 35** — see D.4 |
| `note` | `text` | optional; must never carry a person's name given Guardrail 5 |

Indexes: `(subject_id, at desc)` to read one person's history; `(at desc)` to read
the season; `(actor_id, at desc)` because *"the simplest path to let somebody in
is also the one that must be made visible"* (`community-membership.md`, gate *chi
decide è tracciato*).

**Option C — a `private` schema table.** `private.capabilities` is unreachable
from PostgREST at all (`20260807000000_capability_model.sql:48-54`). That would be
maximally safe but makes the register unreadable by any surface, and D-11 exists
so the history can be *read*. **Rejected**, unless the register is only ever read
through a `public` view — which is the escape hatch that migration names at
:150-153.

### D.3 How the author is captured

From Phase 33's module, and only from there:

```ts
const ctx = await getAccessContext();          // src/lib/capabilities/server.ts:198
if (!ctx.userId) throw new Error("capabilities.resolve_failed: no_subject");
// actor_id = ctx.userId
```

`verifyMaster` / `verifyAdminOrOrganizer` **already do exactly this**
(`actions.ts:93-98`, with the comment: *"Attribution (§5) requires every approval,
rejection and promotion to record WHO — so an action must never proceed on a null
identity. It sits here rather than at each call site because seven call sites are
seven chances to omit it."*). The register's author is available at every one of
the seven existing call sites, today, with no new plumbing.

Three rules, each with its source:

1. **Never from a form field or a header.** `middleware.ts:216-245` deletes inbound
   `x-user-id`; `npm run verify:no-header-identity` asserts nothing reads it.
2. **`getAccessContext()` once per Server Action.** `server.ts:104-116`: `cache()`
   does **not** memoise inside a Server Action or Route Handler — three calls are
   three round trips. Destructure once into a local.
3. **The register write and the `profiles` write should be one transaction.** They
   are not today: the actions do a single `.update()`. Two separate PostgREST calls
   cannot be atomic, so a mutation that succeeds while its register row fails
   produces exactly the untraced act D-11 forbids. **This is the register's real
   design constraint.** Two ways out:
   - a `SECURITY DEFINER` function in `public` doing both writes in one statement,
     called via `.rpc()` — atomic, and it puts the rule next to the data;
   - or an `AFTER UPDATE` trigger on `profiles` that writes the register itself,
     with the actor read from `auth.uid()`. **⚠ This does not work for the service
     client**: `auth.uid()` is null under a service-role token, measured in
     `32-06-SUMMARY.md` § F1 and quoted at `server.ts:26-29`. Every one of the
     seven mutation paths uses the service client, so a trigger reading
     `auth.uid()` would record `null` for every act — a `NOT NULL actor_id` would
     then reject the write and the mutation with it. **Named so it is not
     attempted.**

   **Recommendation: the `SECURITY DEFINER` RPC**, with the actor passed as an
   argument from `ctx.userId`. Note that this is one of the very few cases where
   passing an identifier into a database function is correct — the argument is
   *who is acting*, resolved server-side, not *who to answer about*, so it is not
   the enumeration-oracle shape `20260807000000_capability_model.sql:231-237`
   refuses.

### D.4 Future writers, so the shape does not have to change again

Phase 35 (per-night assignments) and the door override are named by
`ACCESS-MODEL-DECISIONS.md` §5 as writers of this same register. They are **not
planned here**; the only thing this phase owes them is a shape that accommodates
them:

| Future writer | Phase | What it needs |
|---|---|---|
| A per-night assignment granted | 35 | `party_id` non-null, `act = 'assigned'`, and something naming *what* was assigned — a capability key. So consider a nullable `capability text` column, or accept that Phase 35 adds one |
| An assignment revoked | 35 | `act = 'unassigned'`, same columns |
| A door override | 35 (`ACCESS-MODEL-DECISIONS.md` §5) | `party_id` non-null. **Note:** the door already has `door_scan_events`, which records outcome, operator, device and `is_undo`. An override is arguably a *door* event, not a *membership* event, and duplicating it into two registers creates two truths |

**Two decisions this phase should make now, not later:**

1. **`party_id` nullable from the start.** Adding it later is an `ALTER TABLE` on a
   populated table (`supabase-data.md`, gate *default sulle righe esistenti*).
   Adding it now costs one nullable column, and the precedent is explicit:
   `private.has_capability` accepts `p_party_id` *"and unused today, deliberately.
   Adding the parameter later would mean rewriting every policy body"*
   (`20260807000000_capability_model.sql:206-208`).
2. **Whether the door override belongs here or in `door_scan_events`.** Answering
   it now costs a sentence. Answering it in Phase 35 costs a migration or a second
   register.

### D.5 RLS on the register — is it needed, and who may read it

**Yes, needed, and in the same migration** (`supabase-data.md`, gate *tabella nuova
= policy nuova*). Without it, anyone holding the anonymous key reads the whole
register through PostgREST — the sentence `20260805120000_door_scan_events.sql:143-146`
already writes for its own table.

Who may read:

| Reader | Verdict | Reasoning |
|---|---|---|
| `master` | Yes | `master.manage`'s description already names *"changing another member's role or status"* (`keys.ts:88-89`) |
| `organizer` | Yes, probably | D-07 lets an organizer create and promote. An actor who cannot see the register cannot check their own work, and `community-membership.md` gate *chi decide è tracciato* is about visibility |
| the subject, about themselves | **Open.** `attendances_select_own` sets a precedent for own-row reads (`schema.sql:243-244`). But a rejection row visible to the rejected person turns `rejected` into a communication — and `community-membership.md` gate *un rifiuto è una comunicazione* says the wording is chosen deliberately and *"non deve spiegare più di quanto si è disposti a difendere."* **Recommendation: no own-row read**, stated as a decision |
| `staff`, `member` | No | Nothing grants it |
| `anon` | No | |

The capability to gate on is `staff.manage` if an organizer may read, `master.manage`
if not. Do **not** invent a ninth capability without deciding it against
`keys.ts:38-45` ("named by the question, not by the predicate") — and note that a
ninth key means editing `keys.ts`, `CAP_DESCRIPTIONS` (a total `Record`, so the
compiler enforces it), **and** the catalogue migration in the same commit
(`keys.ts:36-38`).

---

## E. `MASTER_EMAIL` demotion (ROLE-04, D-12)

### E.0 The finding that changes the phase's ordering

**⚠ `32-HUMAN-UAT.md` test M-12 becomes unrunnable once D-04's constraint lands.**

```
### 1. M-12 — the door 🚪 (run this one first)
role: organizer, status pending — **this persona does not exist in production;
creating it is part of the test**
steps: sign in as that account, visit `/admin/scanner`
expected: the page LOADS. A bounce means `door.operate` acquired a status check
and a pending organizer is locked out of the door in front of a queue — the
single most dangerous regression in this phase.
```
— `.planning/phases/32-capability-model-in-the-database/32-HUMAN-UAT.md:15-19`

The test requires **creating an `organizer/pending` account in production**. D-04
makes that state unrepresentable. The owner deferred all fourteen checks to the
end of the build (decision 12) and named M-12 as the one to run first. Those two
decisions were taken on the same day and they collide.

Checked: M-12 is the **only** one of the fourteen that needs a forbidden persona.
The other thirteen use `master`, `approved member`, or the owner with the SQL
editor (`grep -n "^role:" 32-HUMAN-UAT.md`).

Three ways out, and the plan must pick one in writing:

1. **Run M-12 before the constraint migration is applied.** One manual check, one
   throwaway account, ten minutes. It also *unblocks* the phase: M-12 verifies the
   foundation this phase builds on, which is precisely the risk decision 12
   accepted.
2. **Substitute the container.** The write matrix measures `organizer/pending`
   against `door.operate`'s grant rows — but it measures **row-level policies**,
   not the **middleware**, and M-12 is a middleware verdict
   (`middleware.ts:181-185`). The container cannot substitute. Rejected.
3. **Record M-12 as permanently unrunnable-as-written** and replace it with a
   check of the grant rows plus a reading of `middleware.ts:178-185`. That is a
   *code review*, not a test, and it would not have caught the phase 32 defect.
   Weakest.

**Recommendation: (1), in a plan of its own, sequenced before the constraint
migration.** This is a Critical-class item under `CLAUDE.md`'s classification
(the door, and access) and it is the kind of thing that must be surfaced before
acting, not discovered after.

### E.1 The promotion site as it stands

`src/app/api/auth/callback/route.ts:25-33`:

```ts
if (user) {
  // Check if user should be promoted to master
  const masterEmail = process.env.MASTER_EMAIL;
  if (masterEmail && user.email === masterEmail) {
    await serviceClient
      .from("profiles")
      .update({ role: "master", status: "approved" })
      .eq("id", user.id);
  }
  // … newsletter auto-subscribe, fire-and-forget
}
return NextResponse.redirect(`${origin}${next}`);
```

Five observations, each a work item:

1. **It promotes and never demotes.** D-12's whole point.
2. **The result is discarded.** No `error` destructuring, no `.select()`. A failed
   promotion is invisible — and given no error tracking, invisible means nobody
   ever knows. `meta-gates.md`, zero silent failures.
3. **It fires on every login,** so the write is idempotent by luck rather than by
   design: the second login re-writes the same values.
4. **`user.email === masterEmail` is exact, case-sensitive and untrimmed.**
   `MEMORY.md` records that `NEXT_PUBLIC_APP_URL` once carried a trailing newline
   on Vercel and broke the SumUp webhook. The same accident here means the master
   is silently never promoted — and after D-12, silently never demoted either, so
   the old master keeps master. Compare `.trim().toLowerCase()` on both sides;
   note that `handle_new_user`'s guest-list branch already uses `LOWER()` on both
   sides (`20260310000000_guest_list.sql:116`), so case-insensitive comparison is
   the house style.
5. **`next` reaches `NextResponse.redirect` unvalidated** (:9, :45).
   `access-gating.md` gate *redirect validato* — pre-existing, out of scope, worth
   a line in the plan since § C.3 will add a `redirectTo` and thus a second
   parametric redirect. **A new one must use an allow-list of relative paths.**

### E.2 When demotion can be triggered — three options

| Option | Triggers when | Bounded? | Fails how |
|---|---|---|---|
| **On login of the new master** | the account matching `MASTER_EMAIL` signs in | Yes — one write, one subject | If the new master never logs in, **the old master keeps master indefinitely.** The switch is repaired in principle and unrepaired in fact |
| **On every login of anyone** | any user signs in; reconcile *"is exactly one account master, and is it the right one"* | Yes, but it is a query on every login — including every door request, since the matcher includes `/api/*` (`middleware.ts:66-68`)… **no**: this is the callback route, not the middleware, so it runs on login only | A second query per login. Acceptable. Detects the drift without waiting for the right person |
| **A one-shot migration + the login path** | migration reconciles now; login keeps it reconciled | Yes | Best coverage. The migration is a **data** change to `profiles.role`, which is access control — Critical under `CLAUDE.md`, needs the owner's validation before it is written |

**Recommendation: the third.** The migration makes the repair *true now* rather
than true-when-someone-logs-in, and the login path keeps it true. And the
migration is the only form in which the demotion is **declared** — it appears in
the migration history, dated, with its reason, which is exactly what D-12 says the
current promotion lacks.

### E.3 What happens to a demoted account's `status` — and it is not the hard case

Ask D-04 directly. The constraint is `role NOT IN ('master','organizer','staff') OR
status = 'approved'`. A demoted master becomes `role = 'member'`, which is not a
staff role, so `status` is **unconstrained** and `approved` stays valid.

That is also the right answer on the merits, and the repo already says why:

> *"Demotion does NOT revoke approval: `member` and `approved` are different axes
> (`access-gating.md`, gate due assi), and someone who was approved stays approved
> when they stop being staff."*
> — `src/app/(admin)/admin/members/actions.ts:133-135`

So the demotion writes `{ role: 'member' }` **only** — mirroring
`updateMemberRole:142` exactly. It must **not** write `status`.

**Where care is genuinely needed** is the other direction, and it is not this one:

- Demoting to `role = 'staff'` instead of `'member'` **would** require
  `status = 'approved'` in the same write. If a plan reasons "a past master is
  presumably still staff", it acquires a constraint obligation. **Recommendation:
  demote to `member`**, matching `deactivateMember:164` and `rejectMember:241`,
  which both demote to `member`.
- **Demoting the *only* master.** If `MASTER_EMAIL` is set to an address with no
  account, a naive "demote everyone who is not `MASTER_EMAIL`" leaves the product
  with **zero** masters and no path back except `MASTER_EMAIL` itself. That is a
  lockout, and the recovery path is the thing being repaired. See E.4.

### E.4 `MASTER_EMAIL` unset or malformed, and making the change *declared*

| Case | Today | After D-12 — required behaviour |
|---|---|---|
| **Unset / empty** | `if (masterEmail && …)` short-circuits: no promotion, no demotion | **Must NOT demote.** An unset variable is a deployment accident (a Vercel env var dropped in a redeploy), not an instruction to remove every administrator. Demoting on unset turns a config slip into a lockout |
| **Malformed** — whitespace, trailing newline, wrong case | Silently never matches | **Must be observable.** A value that is non-empty and contains no `@` should be refused loudly. And both sides trimmed + lowercased before comparison |
| **Set, no matching account** | No promotion | **Must NOT demote the incumbent.** Demote only *after* the new master exists, or the recovery path becomes a lockout |
| **Set, matching account exists** | Promote it | Promote it **and** demote every other `master` |

**How to make the demotion declared rather than a new silent switch.** D-12 exists
because the promotion is an undeclared one-way switch. A demotion that fires
without leaving a trace is the same defect pointing the other way. Four things
make it declared, and each maps to something this phase already builds:

1. **It writes to the register of § D**, `act = 'demoted'`, with the actor. The
   actor is not a person: it is the reconciliation itself. So the register needs a
   representation for a **system actor** — and `actor_id NOT NULL REFERENCES
   auth.users` has no room for one. **This is a real design consequence of D-12 on
   D-11's schema, and the plan must resolve it**: either the actor is the new
   master's id (defensible — their login caused it), or `actor_id` becomes
   nullable with a companion `actor_kind text not null check (actor_kind in
   ('user','system'))`, which keeps "unattributed" impossible while allowing
   "attributed to the system". **Recommendation: the second.** Making `actor_id`
   plainly nullable would re-open the unattributed act D-11 forbids.
2. **The one-shot migration is itself a declaration** — dated, in the history, with
   its reason in the header.
3. **It is observable.** The result of the write is read, and a failure is logged
   with a distinct category **and** has an effect: the simplest is that the
   redirect after login carries a flag, in the shape `middleware.ts:137-139`
   already uses (`?access=unavailable`).
4. **`meta-gates.md`'s monotone-guard rule applies verbatim**: a change may only
   make a one-way switch *harder* to trip, never easier, **salvo autorizzazione
   esplicita documentata nel commit**. D-12 is that authorisation, and the commit
   must say so and cite it. This is the single place in the phase where the
   monotone-guard rule is being deliberately worked against, and it must be
   written down.

---

## F. Staff entry in attendance (ACCT-05, D-13)

### F.1 The per-party attendance recording from Phase 31

Two paths write `attendances`; the membership one is `ACCT-05`'s:

```ts
// src/app/api/membership/verify/route.ts:348-357
const { data: attendance, error: insertError } = await serviceClient
  .from("attendances")
  .insert({
    event_id: party.event_id,
    party_id: party.id,
    user_id: profile.id,
    checked_in_at: new Date().toISOString(),   // the SERVER clock, :343-345
    checked_in_by: operatorId,
  })
  .select("id, checked_in_at")
  .single();
```

Table shape: `schema.sql:231-238` (`id`, `event_id`, `user_id`, `checked_in_at`,
`checked_in_by`), amended by `20260805120000_door_scan_events.sql:232-256` — `party_id`
added, the `unique(event_id, user_id)` key dropped and split into two partial
unique indexes (`attendances_party_user_unique` where `party_id is not null`,
`attendances_event_user_unique` where it is null) plus `idx_attendances_party`.

**Does a free staff entry flow through unchanged? Yes.** Verified: `grep -n
"approved\|role" src/app/api/membership/verify/route.ts` returns three hits, all
comments (:86, :90, :92). The insert has no role branch and no status branch. A
`staff` account scanning its membership card produces an `attendances` row
identical in shape to any member's, on the correct party, with the operator
recorded. **`ACCT-05` needs no code.**

### F.2 Does it need a distinguishing marker? — the real question

`ACCESS-MODEL-DECISIONS.md` §8 states the *purpose*: target venues hold 150–300,
each staff account is a permanent free entry, and after two seasons that is a
standing block of seats given away months in advance. *"Uncounted entries make the
night's numbers wrong exactly where they are relied on."*

Counted ≠ readable. To answer *"how many of tonight's 180 were free staff
entries"* you need to distinguish them, and the options are not equivalent:

| Option | Mechanism | Verdict |
|---|---|---|
| **Join to `profiles.role` at read time** | `attendances ⋈ profiles` | **Wrong, and subtly so.** `role` is mutable. A `staff` account demoted next month makes last month's night report a different number. `20260805120000_door_scan_events.sql:184-190` states the principle for `ticket_refunds`: evidence that must outlive the row it names is **denormalised at write time**, deliberately not a foreign key |
| **Read `door_scan_events.subject_type = 'membership'`** | Already recorded (`:69-71`) | Distinguishes a membership scan from a ticket scan — but **not** a staff member's card from an ordinary approved member's card. Both are `'membership'`. Insufficient |
| **Denormalise the role onto `attendances` at write time** | `add column entry_role text` | Correct and cheap. One nullable column, written from the profile already fetched at `verify/route.ts:270-274`. **`supabase-data.md`, gate *default sulle righe esistenti*: existing rows get NULL, and NULL means "written before this column existed", never "was a member"** — the same distinction `20260805120000:186-190` makes for `refunded_ticket_id` |
| **A boolean `is_free_staff_entry`** | | Narrower and it will be wrong later: a comped guest is also a free entry and is not staff. Prefer the role |

**Recommendation:** add `attendances.entry_role text` (nullable, no default, no
FK, no CHECK tied to the role list — or a CHECK, but then it is a third
enumeration to widen, see § G), written from the profile the route already has.
The column must be added in the same migration as the role widening or a later one,
and `src/types/database.ts`'s attendance interface updated in the same commit.

**And one thing to check while there:** does the profile `select` at
`verify/route.ts:271-273` fetch `role`? It selects `id, full_name,
membership_code` — so it does **not**. Adding `role` to that select is a one-word
change on the door's hot path, and the door's hot path is a queue, so it must be
the *same* query, not a second one.

---

## G. Cross-domain impact

Per `.claude/rules/meta-gates.md`, the impact-analysis pattern. **What does adding
a role break?**

### G.1 Every place that enumerates roles

| # | File:line | Shape | Effect of a fourth role | Build error? |
|---|---|---|---|---|
| 1 | `src/types/database.ts:20` | `export type UserRole = "master" \| "organizer" \| "member"` | The union must widen. Until it does, `role as UserRole` casts (17 sites) launder `'staff'` into a lie | **No** — every consumer casts (`page.tsx:68`, `venues/page.tsx:28`, …), so the compiler never sees the mismatch |
| 2 | `src/lib/rbac/roles.ts:6-11` | `ROLES` const with three members | Should gain `STAFF`. Unused-in-practice, but it is the declared vocabulary | No |
| 3 | `src/lib/rbac/roles.ts:68` | `NAV_ITEMS` `/admin/scanner` → `roles: ["master","organizer"]` | **Correct as-is** — `staff` must not see the scanner tab (D-02 refuses `door.operate`) | No |
| 4 | `src/lib/rbac/roles.ts:90-131` | `getVisibleNavItems(role, status)` | **Safe by construction**: `roles: null` items show to everyone; the one restricted item excludes `staff`. A `staff/approved` account sees Events, Gallery, Account. Correct | No |
| 5 | `src/components/staff/StaffNav.tsx:22,28` | `roles: ["master"] as UserRole[]` | Correct as-is | No |
| 6 | `src/components/account/ManagementSection.tsx:7,30` | `role: "master" \| "organizer"`; `role === "master" ? masterLinks : organizerLinks` | Never reached by `staff` — gated by `isStaff` at `dashboard/page.tsx:408` | No |
| 7 | `src/app/(members)/dashboard/page.tsx:190` | `const isStaff = role === "master" \|\| role === "organizer"` | **Correct, and the naming is now actively misleading**: a variable called `isStaff` that is `false` for the `staff` role. `:180-189` explains it gates a nav affordance and belongs to Phase 34 (STAFF-03). **Leave the logic, fix the name or add a comment** — a future reader will "fix" it the wrong way |
| 8 | `src/app/(members)/dashboard/page.tsx:409` | `role as "master" \| "organizer"` | Guarded by `isStaff`. Safe | No |
| 9 | `src/components/admin/MemberTable.tsx:178-180` | `if (member.role === "master") return "--"` | A `staff` row **does** get action buttons — correct, they must be promotable and deactivatable | No |
| 10 | `src/components/admin/MemberTable.tsx:461-468` | Role filter `<select>` with three `<option>`s | **A real UI defect once `staff` exists**: staff accounts cannot be filtered for, and the count of staff — the seat cost D-13 exists to make visible — is unreadable | **No** |
| 11 | `src/components/admin/MemberTable.tsx:221,230` | `updateMemberRole(id, "organizer" \| "member")` and the signature at `actions.ts:115` | The signature must widen to accept `"staff"` | **YES** — the only place the compiler helps |
| 12 | `src/app/(public)/venues/[slug]/page.tsx:165`, `artists/[slug]/page.tsx:101` | `role === "master" \|\| role === "organizer"` — an edit affordance | Correct as-is | No |
| 13 | `src/app/(public)/events/[slug]/actions.ts:38` | `profile.role === "organizer" \|\| profile.role === "master"` | Correct as-is. **But note it reads `role` directly** — a capability question wearing a role check, and `server.ts:149` forbids new ones. Pre-existing |
| 14 | `src/app/(organizer)/organizer/events/[id]/review/ReviewListClient.tsx:411` | `role === "master"` | Correct as-is | No |
| 15 | `src/app/(admin)/admin/members/page.tsx:120` | `callerRole="master"` — a hardcoded prop | Correct: the `(admin)` tree is `admin.access`, master only | No |
| 16 | **`private.role_capabilities` CHECK** | `20260807000000_capability_model.sql:121` | § A.1 #2 | No — a runtime `23514` |
| 17 | **`public.profiles` role CHECK** | `20260224_rbac_migration.sql:14-15` | § A.1 #1 | No — a runtime `23514` |
| 18 | **`scripts/rls-baseline.mjs:638`** `PERSONA_ROLES` | | § B.4 | Exit 1 if inconsistent — good |
| 19 | **`scripts/rls-baseline.mjs:692`** `PERSONA_SQL` `where role in (…)` | | Silently skips a `staff` persona, then exit 1 via `EXPECTED_PERSONAS` | Exit 1 |
| 20 | **`public.is_admin_or_organizer()`** | `20260224_rbac_migration.sql:127-135`; also `schema.sql:40-48` | Returns `false` for `staff` — **correct**. Note phase 32 rewrote 45 of 67 policies to capabilities (`20260807010000_policies_to_capabilities.sql`, 45 × `CREATE POLICY`) and `32-CARRY-FORWARD.md` records zero policies naming the legacy helpers | No |
| 21 | **A live policy with a hardcoded role literal** | `20260807010000_policies_to_capabilities.sql:227,245` — `event_parties` policies contain `(SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) = 'master'` | `staff` → false. Correct, and worth knowing it exists: it is the one surviving role literal inside a live policy | No |

**The headline: of twenty-one enumeration sites, exactly one produces a build
error** (#11, `updateMemberRole`'s parameter type). `next build` is therefore a
very weak detector for this phase, and § Validation Architecture is built around
that fact.

### G.2 RLS policies

Adding a role adds **no policy work**, and that is phase 32's dividend. 45 of the
67 policies ask `private.has_capability`; a new role is rows in
`private.role_capabilities`, which the resolver joins on `rc.role = p.role`
(`:212`). A `staff` account with two grant rows holds two capabilities and is
refused by every other policy — **without a single policy being edited.**

The exception is the register's own new policy (§ D.5), which the same migration
must create.

### G.3 The middleware, and what a `staff` account sees

`src/lib/supabase/middleware.ts:181-210`, four rules, all capability-based:

| Path | Capability | `staff/approved` verdict |
|---|---|---|
| `/admin/scanner` | `DOOR_OPERATE` | Bounce to `/dashboard` — D-02 refuses it |
| `/admin/*` | `ADMIN_ACCESS` | Bounce |
| `/organizer/*` | `ORGANIZER_ACCESS` | Bounce |
| `/membership-card`, `/attendance` | `MEMBERSHIP_CARD_VIEW` | **Allowed** — D-02 grants it, `requires_approved = true`, and D-04 guarantees `approved` |

`/dashboard` has no capability rule; a `staff` account reaches it and sees the
member view without the Management section (`dashboard/page.tsx:408`). So the
`staff` experience is: dashboard, membership card, attendance history, events,
gallery. **Exactly D-01, with no middleware change at all.**

**And note the D-04 → membership-card interaction, which is neat rather than
accidental.** `MEMBERSHIP_CARD_VIEW` requires `approved`. D-04 guarantees a
`staff` account *is* `approved`. So a `staff` account can always see its own card
— which is how it gets the QR — and it is the constraint, not a call site, that
makes that guarantee. That is D-04 paying for itself.

### G.4 Does anything in this phase touch the door? Yes — three things

1. **The roster widens.** `/api/membership/list` has no role filter
   (`route.ts:52-56`), so every `staff` account appears in every door phone's
   IndexedDB. Not a defect: they must be admissible. But the payload is *"every
   full name in the community"* (`route.ts:28-31`), served `NetworkOnly` by the
   service worker (`src/app/sw.ts:42`), and it now grows by one row per staff
   account. At 150–300-capacity venues the roster is small; the plan should not
   pretend otherwise, but should not engineer for it either.
2. **A staff account created mid-night is refused offline.** § C.2. The runbook
   answer exists (`ScannerClient.tsx:1332-1335`); the copy must say *create staff
   accounts before the night*.
3. **`attendances.entry_role`, if § F.2 is adopted,** adds a column to the door's
   hot-path insert (`verify/route.ts:348-357`) and a field to its profile select
   (:271-273). `checkin-offline.md`: at the door a slow query is a queue. It must
   be the same query, not a second one. And the **offline** path
   (`checkInMemberLocally`, `checkin-store.ts:686-710`) does not know the role at
   all — it holds only `{id, full_name, membership_code}` from `cacheMembers`
   (`:939-952`). So either `entry_role` is filled server-side on sync (from the
   profile, at sync time — which reintroduces the mutable-role problem, at a
   *different* time) or the roster payload carries `role` and the offline store
   caches it. **This is the one place where § F.2's cheap column is not cheap**,
   and the plan must choose deliberately.

### G.5 The classification, and what it obliges

Under `CLAUDE.md`'s table this phase is **Critical**: it touches roles and access,
the recovery path for administrative access, the door's roster, and personal data
about members. Critical requires a **full impact analysis presented and validated
by the owner BEFORE acting**. Concretely, three items should be validated before
any plan is written, not after:

- § E.0 — running `32-HUMAN-UAT.md` M-12 before the constraint, or declaring it
  unrunnable;
- § A.3 — whether `staff` holds `membership.active`;
- § E.2/E.4 — the demotion's trigger and its behaviour when `MASTER_EMAIL` is
  unset or names no account.

---

## Common Pitfalls

### Pitfall 1: Widening one role constraint and not the other
**What goes wrong:** `staff` accounts can be created and hold zero capabilities —
including their own membership card, which is the one thing the role is for.
**Why:** `role` is constrained in two tables (`20260224_rbac_migration.sql:14`,
`20260807000000_capability_model.sql:121`) and the second is in a schema nobody
browses.
**Avoid:** both `ALTER TABLE`s in one transaction (§ Pattern 1).
**Warning sign:** the grant `INSERT` fails with `23514` naming
`role_capabilities_role_check`.

### Pitfall 2: Believing `NOT VALID` relaxes enforcement
**What goes wrong:** the container seed is written expecting `NOT VALID` to let
the four forbidden personas in. It does not. The seed throws, and the fix
attempted under time pressure is to lower a floor in `assertDiscriminating` —
which `seed.mjs:318-324` forbids by name and which silently destroys the only
detector this repo has.
**Why:** `NOT VALID` is widely described as "not enforced", which is true only of
the scan of existing rows.
**Avoid:** `NOT VALID` on the **restore**, drop on the way in. Measured (§ B.3).
**Warning sign:** `23514` during seeding.

### Pitfall 3: A `NOT VALID` CHECK freezes the rows it forgave
**What goes wrong:** the four seeded personas can never be updated again, on any
column. If the write matrix's `profiles × update` probe ever targets one of them,
eleven cells flip from an RLS verdict to `23514` with no obvious cause.
**Why:** measured — even an unrelated column is refused (§ B.1b).
**Avoid:** it happens not to today, because `min(id)` is `master/approved` (§ B.3).
Add the assertion; do not inherit the luck.
**Warning sign:** `b3_cell_changed` on `profiles × update` for several personas at
once.

### Pitfall 4: `granted = false` rows without editing `has_capability`
**What goes wrong:** every "refusal" row **grants** the capability. `staff` gets
`door.operate`, `master.manage`, everything.
**Why:** the resolver's `EXISTS` matches any row for `(role, capability)` and
never looks at a `granted` column that did not exist when it was written
(`:209-216`).
**Avoid:** § Pattern 3 — prefer (b) or (c). If (a), edit the resolver in the same
file.
**Warning sign:** none from `npm run verify:capabilities` — it reads the catalogue,
never the grants (`32-CARRY-FORWARD.md`, D-32-L). The container write matrix is
the only detector.

### Pitfall 5: An `AFTER UPDATE` trigger writing the register
**What goes wrong:** `actor_id` is `null` for every act, and a `NOT NULL` column
then rejects the register write **and the mutation with it** — every approval in
the product breaks.
**Why:** all seven mutation paths use the service client, under which
`auth.uid()` is null (measured in `32-06-SUMMARY.md` § F1, quoted at
`server.ts:26-29`).
**Avoid:** a `SECURITY DEFINER` RPC taking the actor as an argument (§ D.3).
**Warning sign:** approvals fail in production and work locally, where you were
signed in as yourself.

### Pitfall 6: Assuming `createUser` produces an approved member
**What goes wrong:** an organizer creates an account and it lands `pending` — in
the queue it was created to bypass. For a `staff` account it is a hard `23514`.
**Why:** `handle_new_user` defaults to `pending` without a referral or guest-list
metadata (`20260310000000_guest_list.sql:139-140`).
**Avoid:** write `{role, status:'approved', approved_via:'admin_manual'}` in the
same statement, as `updateMemberRole:140-142` does.
**Warning sign:** for `member`, none — it looks like it worked. Only D-04 catches
the `staff` case, which is D-04 earning its keep.

### Pitfall 7: A sleep instead of a read-back
**What goes wrong:** the `UPDATE` after `createUser` finds no row, affects zero
rows, and returns `error: null`. A silent failure: an auth user with no profile,
so no membership code, so no entry — and `ACCT-02` fails invisibly.
**Why:** copied from `process-entry.ts:247-249`.
**Avoid:** `.select()` on the update and assert exactly one row.
**Warning sign:** an account that cannot be found at the door and appears nowhere
in the members list.

### Pitfall 8: Reporting success for a partly-failed batch
**What goes wrong:** `bulkApproveMember`/`bulkRejectMember` use one `.in()`
statement (`actions.ts:275-278`, `:319-322`). Under D-04 the whole batch fails on
one bad row and the message names one id. Worse, if a future refactor loops
per-row, `{ success: true, count: memberIds.length }` would report N successes for
fewer.
**Avoid:** either keep it one statement and report the constraint refusal
distinctly, or loop and return per-subject outcomes.
**Warning sign:** `count` is asserted rather than measured.

### Pitfall 9: Believing `npm run build` verifies this phase
**What goes wrong:** a green build is read as "the role is wired". § G.1: one of
twenty-one enumeration sites errors at compile time.
**Why:** `role` is cast at 17 sites (`role as UserRole | null`), no Supabase client
is parameterised with `Database` (`.planning/STATE.md`), and a capability key is a
string in a policy body.
**Avoid:** § Validation Architecture.
**Warning sign:** a plan whose verification step is `npm run build`.

### Pitfall 10: Naming a person in a plan or in seeded data
**What goes wrong:** an irreversible publication.
`ai-engineering.md`: *"When writing anything into `.planning/`: name roles, never
people — it is published."*
**Avoid:** the harness's own convention — *"Every name is a ROLE, never a person"*
(`seed.mjs:36`), every address at `.invalid`, every seeded membership code
`RSN-SEED000n`, which `handle_new_user` **cannot** mint because its alphabet has
no `0` (`seed.mjs:32-39`).
**Warning sign:** an example in a plan that reads naturally.

---

## Code Examples

### Widening both role constraints
See § Pattern 1. `[VERIFIED: constraint auto-naming reproduced in postgres:17.6]`

### The D-04 constraint
```sql
-- Source: predicate derived from ACCESS-MODEL-DECISIONS.md §11; every
-- enforcement property measured in postgres:17.6 this session.
-- Run the violating-row count FIRST (§ B.1b). Zero rows → validated add.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_implies_approved
  CHECK (role NOT IN ('master', 'organizer', 'staff') OR status = 'approved');
```
Named explicitly, not inline: an inline second CHECK would be auto-named
`profiles_role_check1` and both would be enforced. `[VERIFIED]`

### The container's seed-time relaxation
See § B.3. The `NOT VALID` on the restore is mandatory. `[VERIFIED]`

### The trigger alternative, with a chosen SQLSTATE
```sql
-- Source: measured in postgres:17.6. A trigger can impersonate a constraint
-- violation exactly — same SQLSTATE, same CONSTRAINT NAME field — while
-- remaining relaxable by DISABLE TRIGGER and by session_replication_role.
CREATE OR REPLACE FUNCTION private.enforce_role_implies_approved()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF new.role IN ('master','organizer','staff') AND new.status <> 'approved' THEN
    RAISE EXCEPTION 'a staff role implies approved: role=% status=%', new.role, new.status
      USING errcode = '23514',
            constraint = 'profiles_role_implies_approved',
            schema = 'public', table = 'profiles';
  END IF;
  RETURN new;
END $$;
```
`set search_path = ''` follows `20260807000000_capability_model.sql:166-171` —
the four legacy helpers omit it and the live advisor raises
`function_search_path_mutable` on all four; this phase must not add a fifth.
**Weaker than a CHECK**: the table owner can `DISABLE TRIGGER`. `[VERIFIED]`

### Capturing the author from Phase 33's module
```ts
// Source: src/app/(admin)/admin/members/actions.ts:88-99 — the pattern already
// in the file. ONE getAccessContext() per Server Action: cache() does not
// memoise there (src/lib/capabilities/server.ts:104-116).
const ctx = await getAccessContext();
if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) throw new Error("forbidden.staff_manage_required");
if (!ctx.userId) throw new Error("capabilities.resolve_failed: no_subject");
// ctx.userId is the register's actor_id — never a form field, never a header.
```

### Creating an account, without the two defects of the original
```ts
// Source: shape from src/lib/guest-list/process-entry.ts:218-249, with the
// 500 ms sleep replaced by a read-back and the swallowed link error surfaced.
const service = getServiceClient();

const { data: created, error: createError } = await service.auth.admin.createUser({
  email, email_confirm: true, user_metadata: { full_name: fullName },
});
if (createError) throw new Error(`account.create_failed: ${createError.message}`);

// role and status TOGETHER — the shape updateMemberRole:140-142 already uses,
// and the write D-04 judges. .select() so zero rows is not silence.
const { data: profile, error: roleError } = await service
  .from("profiles")
  .update({ role, status: "approved", approved_via: "admin_manual" })
  .eq("id", created.user.id)
  .select("id, membership_code, role, status")
  .single();
if (roleError) throw new Error(`account.role_write_failed: ${roleError.code ?? "unknown"}`);
if (!profile) throw new Error("account.profile_missing: handle_new_user did not run");

// A link, never a password (D-10). generateLink type 'recovery' requires an
// existing user and permits setting a password.
// [CITED: supabase.com/docs/reference/javascript/auth-admin-generatelink]
const { data: link, error: linkError } = await service.auth.admin.generateLink({
  type: "recovery", email,
  // options: { redirectTo: … }  ← the set-password surface of § C.3.
  // [ASSUMED] verify generateLink honours options.redirectTo in supabase-js ^2.97.0
});
if (linkError || !link?.properties?.action_link) {
  // NOT swallowed. The account exists and can enter; the invitation cannot be
  // sent. The organizer must be told which of the two happened.
  return { ok: false, reason: "invitation_link_failed", membershipCode: profile.membership_code };
}
```

### The register's RLS, in the same migration
```sql
-- Source: the pattern and its reasoning are at
-- supabase/migrations/20260805120000_door_scan_events.sql:143-163
ALTER TABLE public.membership_acts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membership_acts_select_staff ON public.membership_acts;
CREATE POLICY membership_acts_select_staff ON public.membership_acts
  FOR SELECT USING ((select private.has_capability('staff.manage')));
-- The (select …) wrapper is load-bearing: it is what makes Postgres evaluate the
-- call once per statement as an InitPlan, and it is NOT `STABLE` that does that
-- (20260807000000_capability_model.sql:177-184 — EXPLAIN proved it).

-- No INSERT, UPDATE or DELETE policy, deliberately. Writes come only from the
-- SECURITY DEFINER RPC, so the register is append-only by construction: with RLS
-- on and no write policy, no session can add, edit or remove a row.
```

---

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|---|---|---|---|
| `role`/`status` injected as `x-user-*` request headers, read by 44 files | `public.my_access_context()` via `src/lib/capabilities/server.ts` | Phase 33, 2026-08-07 | Every new check asks the module. `npm run verify:no-header-identity` enforces it |
| Scattered `profile.role === "master"` predicates | `private.has_capability` + eight capability keys | Phase 32, 2026-08-06 | A new role is **rows**, not policies |
| `is_admin` boolean | `role` + `status`, two independent axes | `20260224_rbac_migration.sql` | `member` is not `approved`; four roles now |
| `unique(event_id, user_id)` on `attendances` | Two partial unique indexes on `(party_id, user_id)` and `(event_id, user_id)` | Phase 31, `20260805120000:240-252` | A presence belongs to a **party**. A staff entry per party, not per evening |
| Capabilities minted into the JWT | Never — read on the request that asks | Phase 32, `20260807000000:299-326` | `hook_custom_access_token_enabled = false`, `jwt_exp = 3600`, so a token-carried capability would be stale for an hour. **Supabase's own RBAC guide recommends the forbidden approach**, so it will be proposed in good faith |

**Deprecated / outdated:**
- `public.get_user_role()`, `get_user_status()`, `is_master()`,
  `is_admin_or_organizer()` — still defined, referenced by **zero** policies after
  `20260807010000`. They still enumerate three roles and return `false` for
  `staff`, which is correct. Do not extend them.
- `generateMembershipCode()` in `src/utils/qr.ts:45-52` — dead for account
  creation; the trigger mints the code. Still `Math.random()`, open defect QR-01.
- The claim "eleven personas are seeded" (`ACCESS-MODEL-DECISIONS.md` §11,
  `43-CONTEXT.md`) — nine **profiles**, eleven **labels** (§ B.3).

---

## Runtime State Inventory

This phase is not a rename, but it **is** a schema and role-model migration, so
the same question applies: after every file in the repo is updated, what runtime
systems still hold the old shape?

| Category | Items found | Action required |
|---|---|---|
| **Stored data** | `public.profiles` — the row shape D-04 constrains. Whether any live row violates it is **unmeasured from here**; the count query of § B.1b must run before the DDL. `public.attendances` — existing rows get `NULL` in a new `entry_role`, meaning *unknown*, never *member* | Data measurement, then possibly a data decision per row. Code edit for new writes |
| **Live service config** | Vercel environment variables: `MASTER_EMAIL` (the subject of ROLE-04), `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`. None lives in git. Supabase Auth config: the project's **Site URL / redirect allow-list** must permit the set-password surface of § C.3, and that is a dashboard setting, not a repo file | `MASTER_EMAIL`: verify no trailing newline (`MEMORY.md` precedent). Supabase Auth redirect allow-list: manual, and a plan task must name it |
| **OS-registered state** | **None.** No Task Scheduler, no pm2, no launchd. Scheduled work is Vercel cron declared in `vercel.json`, in git, and this phase touches no cron | None — verified by the absence of any such reference in the repo |
| **Secrets / env vars** | `MASTER_EMAIL` is read by name at `src/app/api/auth/callback/route.ts:27`. **The variable is not renamed by this phase**, only its semantics extended, so no key changes | None. Do **not** rename it: a rename is a Vercel edit plus a code edit, and getting them out of order silently disables the recovery path |
| **Build artifacts / installed packages** | `.next` build output — regenerated. `src/types/database.ts` is hand-maintained, not generated, so no codegen step is stale. **The offline IndexedDB on every door phone** is the real one: `cacheMembers` stores `{id, fullName, membershipCode}` (`checkin-store.ts:939-952`), so if § G.4 adds `role` to the roster the store schema version must bump — and `.planning/STATE.md` warns that the v2→v3 upgrade must be exercised **before the first real night** | If the roster payload gains a field: a store version bump plus an upgrade path, and the phone-side check is **not** deferrable |

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| `docker` + daemon | `npm run baseline:container` — the only automated net for the write matrix | ✓ | Docker 29.2.1 | None. `rls-baseline-container.mjs:125-140` exits **2**, not 1, when absent: nothing was measured |
| `postgres:17.6` image | production's exact major.minor (`:75`) | ✓ | pulled and run this session | None — a different planner is a different baseline |
| `node` | every verify script | ✓ | v25.6.1 | — |
| `npm` | `npm run build` | ✓ | 11.9.0 | — |
| Supabase Management API + `SUPABASE_ACCESS_TOKEN` | applying the migration | ✓ per `.planning/STATE.md` (token in `.env.local`; the CLI is **not** installed) | — | The SQL editor by hand — but then the migration history lies. Use `POST /v1/projects/{ref}/database/migrations`, **not** `/database/query` |
| `supabase` CLI | — | ✗ | — | The Management API above. Not needed |
| A real member session | confirming a member reads **zero** rows from the new register | ✗ from here | — | **None.** The Management API bypasses RLS, so no query from a tool settles it. Written manual procedure only. `.planning/STATE.md` records the identical outstanding item for `door_scan_events` |
| A phone with the radio off | the door path for a newly created account | ✗ from here | — | None. Manual procedure |
| Resend + a real inbox | the invitation and its link | ✗ from here | — | None. Manual procedure |
| `slopcheck` | package legitimacy | not installed | — | Not needed: this phase installs no package |

**Missing with no fallback (all manual, all owed):** a real member session for the
register's RLS; a phone with the radio off; a real inbox for the invitation link.
Each of these is a written manual procedure and none can be automated in this
repository.

---

## Validation Architecture

> Nyquist validation is enabled — `.planning/config.json` has no
> `workflow.nyquist_validation` key, which the researcher's contract says to treat
> as enabled.

### Test Framework

| Property | Value |
|---|---|
| Framework | **None for the product.** `package.json:5-16` has no `test` script; no `*.test.*` / `*.spec.*` exists |
| Config file | none — and none is to be added by this phase |
| Quick run command | `npm run build` (which is also the typecheck gate) |
| Full suite command | `npm run build && npm run verify:capabilities && npm run verify:no-header-identity && npm run verify:persona && npm run baseline:container` |
| The evidence harness | `npm run baseline:container` → B1 policy dump, B2 read matrix, B3 write matrix; `npm run baseline:compare` diffs two captures |

**Nothing in this phase may be described as passing tests.** There are none.

### Phase Requirements → Detection Map

| Req | Behaviour | What detects a failure | Command / procedure | Exists? |
|---|---|---|---|---|
| ROLE-01 | `role = 'staff'` is accepted by both tables | Container build: `rls-baseline-container.mjs:255-259` applies every migration and names the file that fails | `npm run baseline:container -- --smoke` | ✅ |
| ROLE-01 | `staff` holds exactly the intended capabilities | **B3 write matrix — only if `staff` is in `PERSONA_ROLES`** (§ B.4). Otherwise **nothing automated detects it** | `npm run baseline:container` then `npm run baseline:compare` | ⚠️ conditional |
| ROLE-01 | the catalogue and `CAP` agree | `verify-capabilities.mjs` — four-sided parity on the **catalogue** | `npm run verify:capabilities` | ✅ |
| ROLE-01 | every capability has an explicit decision for `staff` | **Nothing today.** `verify-capabilities.mjs` never reads `role_capabilities` (only a comment at :50). Wave 0 gap | new assertion in `scripts/verify-capabilities.mjs` | ❌ Wave 0 |
| ROLE-02 | a violating write is refused by the database | B3 cells + a direct probe. The cleanest is a **container assertion**: attempt the four forbidden inserts *after* the constraint is restored and assert `23514` on each | new assertion in `scripts/container/seed.mjs` | ❌ Wave 0 |
| ROLE-02 | the refusal is not a generic message | **Manual only.** Next redacts a Server Action message in production (`server.ts:59-63`), so `next dev` proves nothing about production | written procedure M-43-04 | ❌ Wave 0 |
| ROLE-03 | the four forbidden personas survive | `seed.mjs:357-367` — the grid assertion, which already **throws** on a hole. It is the ROLE-03 detector and it exists | `npm run baseline:container -- --seed-only --report` | ✅ |
| ROLE-03 | the sixteen cells still carry evidence | `baseline:compare` B3 — `b3_cell_missing` / `b3_cell_changed` at `:746-751`. Note `absent` and `inconclusive` are reported separately (`:761`), so a cell that stopped proving anything is not read as agreement | `npm run baseline:compare` | ✅ |
| ROLE-03 | the constraint's definition is the same object in container and production | `convalidated` differs after a `NOT VALID` restore and **no capture notices** (§ B.3) | new read-back assertion in `seed.mjs` | ❌ Wave 0 |
| ROLE-04 | demotion happens | **Manual.** Requires two accounts and an env-var change | written procedure M-43-05 | ❌ Wave 0 |
| ROLE-04 | unset `MASTER_EMAIL` does not demote | **Manual.** And it is the highest-consequence check in the phase: getting it wrong is a lockout | written procedure M-43-06 | ❌ Wave 0 |
| ACCT-01 | an organizer cannot create a `master` | B3 cannot see it — the ceiling lives in a Server Action, not a policy. **Manual**, plus `grep` evidence that no code path passes `role: 'master'` | M-43-07 + a `grep` assertion | ❌ Wave 0 |
| ACCT-02 | valid for entry **before first login** | **Manual, and this is the load-bearing one.** No automated observation reaches it: it needs a created account, a real party, a phone, and a scan performed before the account has ever signed in | M-43-01 (see below) | ❌ Wave 0 |
| ACCT-02 | valid for entry with the radio **off** | **Manual.** § C.2 predicts a refusal if the account postdates the roster download. The procedure must test **both** orders | M-43-02 | ❌ Wave 0 |
| ACCT-03 | the message carries a link, never a password | Static: `grep -n "password" src/emails/<template>.tsx` must find no interpolated secret. Semantic: **manual** | grep + M-43-03 | ❌ Wave 0 |
| ACCT-03 | the link actually lets a password be set | **Manual**, and it will **fail today** — no set-password surface exists (§ C.3) | M-43-03 | ❌ Wave 0 |
| ACCT-04 | all five acts land in one register | B3 gains one table × 3 verbs × 11 personas = 33 new cells, which prove RLS, **not** that the act was recorded. The recording is **manual**, or a container assertion that calls the RPC and counts rows | M-43-08 + a container assertion | ❌ Wave 0 |
| ACCT-04 | the register is append-only | **B3 proves this well** — `update` and `delete` on the register must refuse for **every** persona including `master`. That is 22 cells of real evidence | `npm run baseline:container` | ✅ once the table exists |
| ACCT-04 | a member reads zero rows | **Manual only.** The Management API bypasses RLS; `.planning/STATE.md` records the identical outstanding item for `door_scan_events`. B2 measures it in the *container*, which is evidence about the policy but not about production | M-43-09 + B2 | ⚠️ container yes, production manual |
| ACCT-05 | a free staff entry appears in attendance | **Manual** — scan a staff card at a real party, then read the night's list | M-43-10 | ❌ Wave 0 |
| ACCT-05 | the night's numbers are readable | **Manual.** A count is not a detector of legibility | M-43-10 | ❌ Wave 0 |

### What the container write matrix can observe — the specific cells

This is the net that already caught a real defect, so be exact about what it can
and cannot see this time.

**It can observe:**

1. **The register's append-only property.** New table → 11 personas × 3 verbs = 33
   cells. `insert`, `update` and `delete` must refuse for **every** persona,
   `master/approved` included. Any `ok:n` there means a write policy was added by
   accident, and 22 of those 33 cells are genuinely conclusive evidence.
2. **The register's read boundary.** B2 gives 11 read cells: `master`,
   `organizer` (all statuses, if `staff.manage` is the gate — `requires_approved =
   false`, so a `pending` organizer reads it too, which the plan should notice and
   decide) see rows; `member`, `anon`, `authenticated/no-profile` see zero.
3. **That the constraint did not change any existing verdict.** All 20 tables × 3
   verbs × 11 personas = 660 cells must be **byte-identical** to the pre-phase
   capture apart from the register's new ones. A capability grant that leaked into
   an existing role would move a cell.
4. **The four forbidden personas' sixteen cells** — the `catalogue.manage` /
   `staff.manage` pair on `venues`, `artists`, `ticket_tiers`, `event_parties`
   across `organizer/pending`, `organizer/rejected`, `master/pending`,
   `master/rejected`. **These are the cells ROLE-03 exists to preserve**, and the
   comparison against the pre-phase capture is the only thing that proves they
   still carry evidence rather than having quietly become `absent`.
5. **`staff`'s own 60 write cells and 20 read cells** — **only** if `staff` joins
   `PERSONA_ROLES` (§ B.4). Without that, the fourth role is never probed.

**It cannot observe:**

- **Any middleware verdict.** All four route rules are in
  `middleware.ts:181-210`; the harness speaks SQL. This is why § E.0's M-12 cannot
  be substituted by the container.
- **Any Server Action gate.** `ACCT-01`'s ceiling is `verifyMaster` versus
  `verifyAdminOrOrganizer`, invisible to a policy probe.
- **Anything about email**, the link, or the door's offline path.
- **Whether the act was *recorded*.** B3 proves who may write; it never proves
  that a successful approval also wrote its register row. **That is `ACCT-04`'s
  real risk and the harness does not cover it.**

### What `npm run build` proves — and what it does not

**Proves:** TypeScript compiles; `CAP_DESCRIPTIONS` is total over `CapabilityKey`
(`keys.ts:74-82`), so a ninth key without a description is an error; `updateMemberRole`'s
widened parameter type is checked at its call sites (`MemberTable.tsx:221,230`).

**Does not prove — and each of these is a real hole in this phase:**

- **That a capability key string is spelled correctly.** No client is
  parameterised with `Database`, so `supabase.rpc("my_access_context")` is
  untyped; a misspelled key is a runtime `false`, which at the door is a refusal
  in front of a queue (`keys.ts:24-32`).
- **That a migration applies, or that a constraint exists.**
- **That a column name in any query is real.** `.planning/STATE.md` records this
  explicitly. A new register table's columns are unchecked at every call site.
- **That `role` is handled anywhere it is enumerated.** § G.1: **one** of
  twenty-one sites errors. The 17 `role as UserRole` casts launder `'staff'`
  silently, so widening `UserRole` produces **no** new errors — which means the
  build cannot tell you which switches you forgot.
- **That the invitation carries a link and not a password.**
- **That an account is admissible at the door.**

### Sampling rate / coverage argument

| When | What runs | Why at that rate |
|---|---|---|
| **Every plan's commit** | `npm run build` | Cheap, and it is the only compile gate. It catches #11 of § G.1 and nothing else |
| **Every plan that touches a capability key or the catalogue** | `npm run verify:capabilities` | Reads the live catalogue; a drift between `keys.ts` and the rows is otherwise a runtime `false` |
| **Every plan that adds an identity read** | `npm run verify:no-header-identity` | Phase 33 took the header-reader count to 0; a regression must not be discovered in Phase 34 |
| **Every plan that touches `CLAUDE.md` or `.claude/**`** | `npm run verify:persona` | The repo's only mutation-proven check |
| **Every plan that changes DDL, a policy, a grant row, or the seed** | `npm run baseline:container` **and** `npm run baseline:compare` against the pre-phase capture | This is the sampling-rate argument. Phase 32's defect was introduced by **one** plan (32-07) and caught by the matrix. Running the comparison only at phase end would leave the defect installed across every intervening plan, and the rework is proportional to what was built on top — the exact price `ACCESS-MODEL-DECISIONS.md` §12 records for deferring the fourteen manual checks. **Do not batch this to the end.** |
| **Once, before the constraint migration** | `32-HUMAN-UAT.md` **M-12** | § E.0. After the constraint it is unrunnable |
| **Phase end, before `/gsd:verify-work`** | the full suite, plus the ten written manual procedures | The manual set is where `ACCT-02`, `ACCT-03` and `ACCT-05` actually live |

**The coverage claim, stated honestly.** Of the nine requirements, **two**
(`ROLE-03`, and `ACCT-04`'s append-only half) have strong automated detection
today. **One** (`ROLE-01`'s constraint) has weak automated detection. **Six**
depend primarily on written manual procedures, and three of those six
(`ACCT-02` before first login, `ACCT-02` with the radio off, `ACCT-03`'s link)
cannot be observed by any tool in this repository. A phase that reports itself
verified without those procedures **written and executed** has verified two of
nine.

### Wave 0 Gaps

- [ ] `scripts/container/seed.mjs` — the constraint drop/restore, in `try/finally`,
      restore `NOT VALID` (ROLE-03)
- [ ] `scripts/container/seed.mjs` — assert the row chosen by `min(id)` in
      `profiles` satisfies the constraint, so the eleven `profiles × update` cells
      cannot silently flip (§ B.3)
- [ ] `scripts/container/seed.mjs` — read back `pg_get_constraintdef` after the
      restore and assert it matches the migration's predicate (ROLE-02)
- [ ] `scripts/container/seed.mjs` — attempt the four forbidden writes *after* the
      restore and assert `23514` on each. **This is ROLE-02's only automated
      detector** (ROLE-02)
- [ ] `scripts/verify-capabilities.mjs` — a fifth side: every `(role × capability)`
      pair is a grant row or a declared refusal (ROLE-01 / D-02)
- [ ] `scripts/rls-baseline.mjs:638,692` — `staff` in `PERSONA_ROLES` and in
      `PERSONA_SQL`, **if** § B.4's fork is taken. Own the re-baseline in its own plan
- [ ] `43-HUMAN-UAT.md` — ten written procedures: M-43-01 (entry before first
      login), M-43-02 (entry with the radio off, **both** orders relative to the
      roster download), M-43-03 (the link sets a password), M-43-04 (the
      constraint refusal is distinguishable in a **production** build), M-43-05
      (demotion), M-43-06 (unset `MASTER_EMAIL` does not demote), M-43-07 (an
      organizer cannot create a master), M-43-08 (five acts, one register),
      M-43-09 (a member reads zero register rows — real session required),
      M-43-10 (a staff entry in the night's attendance, and readable)
- [ ] **`32-HUMAN-UAT.md` M-12, run before the constraint migration** — or a
      written record that it can never be run as designed (§ E.0)
- [ ] Framework install: **none.** No test runner is added by this phase

---

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json`, so this
section is required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control in this phase |
|---|---|---|
| **V2 Authentication** | **yes** | `auth.admin.createUser` + `generateLink({type:'recovery'})`. No password is ever generated, transmitted or stored by this application (D-10). `email_confirm: true` bypasses confirmation deliberately: the creator vouched |
| **V3 Session Management** | yes | Supabase-managed. The recovery link produces a session via `exchangeCodeForSession` (`callback/route.ts:13`). **The set-password surface of § C.3 must not widen that session's lifetime** |
| **V4 Access Control** | **yes — the phase's centre** | `private.has_capability` as the single definition; RLS as the boundary; the middleware as UX only (`access-gating.md`). D-07's ceiling: **no capability grants creating a `master`**, so it is not a permission that can be misgranted — it is a path that does not exist |
| **V5 Input Validation** | yes | An email address reaches `auth.admin.createUser`. **No validation library is a dependency** — no `zod`, no `joi` (`package.json:17-40`). Validation is hand-written, which makes it a review item, not a library choice. And `role` must come from a **closed set in code**, never from a form value, or an organizer posts `role=master` |
| **V6 Cryptography** | partial | Nothing new. **Do not touch** `src/utils/qr.ts:49` or the trigger's `random()` code minting — open defect QR-01, and a change to the code space invalidates every membership card in circulation, which is a door problem |
| **V7 Error Handling & Logging** | **yes** | No error tracking exists. Every new failure path needs an **observable** effect: § B.2 for the constraint refusal, § C.1 for the link failure, § E.4 for the demotion |
| **V13 API / Web Service** | yes | The creation Server Action is a **public endpoint with a convenient signature** (`nextjs-architecture.md`). It re-checks capability inside itself and does not rely on being imported from a protected page |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard mitigation, as it applies here |
|---|---|---|
| **Privilege escalation via a role parameter** — an organizer posts `role: 'master'` | Elevation of Privilege | The role argument is a closed union validated server-side against a code constant; the `master` branch does not exist. `access-gating.md`: *no path in which a user modifies their own `role` or `status`* |
| **Self-promotion via the creation surface** | Elevation of Privilege | `updateMemberRole:119-121` and `deactivateMember:157-159` already refuse `memberId === ctx.userId`. The creation path creates a *new* subject, so self-targeting is impossible by shape — but a **promotion** path must keep the check. Note `reactivateMember:175-190` lacks it (§ C.4) |
| **Service-role reachable from untrusted input** | Elevation of Privilege | `access-gating.md` gate *service role*: every new use justified in the commit, and no untrusted input reaches it. The creation action takes an email and a role; both are validated before the service client is constructed |
| **Enumeration oracle** | Information Disclosure | **This repository has no rate limiting anywhere** (verified 2026-08-05). A creation endpoint that answers differently for an existing versus a new email is an account-existence oracle. It is capability-gated, which is the mitigation — but the response must not distinguish more finely than the organizer needs |
| **An email address in a published planning document** | Information Disclosure | Guardrail 5. The harness's convention: `.invalid` addresses, `RSN-SEED000n` codes, role names only |
| **An unattributed privileged act** | Repudiation | `actor_id NOT NULL` (or `actor_kind` per § E.4). `community-membership.md`, gate *chi decide è tracciato* |
| **A silent one-way switch** | Repudiation / Tampering | D-12's whole subject. `meta-gates.md`: a monotone guard may be made harder to trip, never easier, save explicit authorisation documented in the commit |
| **A grey lane around approval** | Elevation of Privilege | `community-membership.md`, gate *nessuna corsia grigia*: every route in that bypasses approval is an exception, to be **counted and attributed**. D-08 is the same rule, and the register is how it is obeyed |
| **A denial of service at the door** | Denial of Service | A slow query at the door is a queue (`checkin-offline.md`). § G.4: the register write must not be added to the door's hot path, and `entry_role` must not become a second query |
| **The register readable by the subject of a rejection** | Information Disclosure | § D.5. Recommendation: no own-row read, stated as a decision rather than left to a default |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | PostgREST forwards SQLSTATE `23514` unchanged to the Supabase JS client as `error.code` | § B.2 | Every error-surfacing decision in § B.2 is built on it. **Cheap to settle:** attempt one violating update through the service client and print `error.code`. Should be a task, not an assumption |
| A2 | `generateLink` accepts `options.redirectTo` in `supabase-js ^2.97.0` | § C.3 | The set-password surface would be unreachable from the invitation link. Verify against the docs before writing the task |
| A3 | Production holds no row violating `role ⇒ approved` | § B.1b | A `NOT VALID` add would **freeze** the violating rows permanently. The count query in § B.1b removes the assumption. Derived from documents dated 2026-08-06, not measured this session |
| A4 | `handle_new_user` runs synchronously and completes before `createUser` returns | § C.1 | The read-back of the `.select()` would return zero rows. The recommendation (read back rather than sleep) is **safe either way**, which is why it is the recommendation |
| A5 | `public.profiles` is owned by `postgres` in production, so `service_role` cannot `DISABLE TRIGGER` | § B.1 | If a Supabase API role can disable it, the trigger route is materially weaker than measured. Only relevant if the trigger route is chosen. Settle with `select relowner::regrole from pg_class where oid='public.profiles'::regclass` |
| A6 | `attendances`' RLS policies (`schema.sql:243-248`) survive unchanged after phase 32's rewrite | § F.1 | A new `entry_role` column inherits table-level policies; if those changed, the read path differs. Verify against the live policy dump in `baseline/`, not against `schema.sql` |
| A7 | No Vercel cron or external service reads `profiles.role` | § G, Runtime State | A widened role set could surprise a consumer outside `src/`. Verified within `src/`; `vercel.json` was not read this session |

---

## Open Questions (RESOLVED)

> All seven were closed on 2026-08-07 and recorded as locked decisions in
> `43-CONTEXT.md` — four by the owner, three under the discretion that file
> grants. The closing decision is named beside each. Nothing here is still open.

1. **Does `staff` hold `membership.active`?** — **RESOLVED → D-14** (owner): granted, `requires_approved = true`. The upload ROLE-01 refuses is the per-night work upload of Phase 35, not the member-level contribution. (§ A.3)
   - Known: it is the eighth catalogue capability; D-02 lists seven; it is granted
     to all three existing roles with `requires_approved = true`; it gates *upload
     event media, rsvp*.
   - Unclear: whether the owner's "`staff` grants ONE thing" means one capability
     or one *additional* thing on top of ordinary membership. `ACCESS-MODEL-DECISIONS.md`
     §9 says every account is a member of the community, which points to granted.
   - Recommendation: **grant it**, with the § A.3 sentence as the recorded reason,
     and note explicitly that it does not violate D-03. Confirm with the owner —
     it is a capability grant, therefore Critical.

2. **Does the door override belong in the new register or in `door_scan_events`?** — **RESOLVED → D-18**: it stays in `door_scan_events`. An override does not change who someone is, and that table already records operator, device, outcome and `is_undo`. (§ D.4)
   - Known: `ACCESS-MODEL-DECISIONS.md` §5 lists it with the other four acts.
     `door_scan_events` already records outcome, operator, device, `is_undo`.
   - Unclear: whether an override is a *membership* act or a *door* act.
   - Recommendation: answer now in one sentence. Two registers holding overlapping
     truths is worse than either.

3. **May an organizer create an `organizer` directly, or only promote to it?** — **RESOLVED → D-20**: directly. The two-step is no barrier, since whoever can promote reaches the same end state, and forcing it would write two register rows for one act. The master ceiling of D-07 is unchanged. Related finding **D-21**: promotion is master-only today (`actions.ts:117` calls `verifyMaster()`), so widening it is work this phase must do. (§ C.4)
   - Known: D-07 says *"an `organizer` may promote a staff member to `organizer`"* —
     promote, not create.
   - Unclear: whether direct creation as `organizer` is intended. Functionally it
     is create-then-promote in one step, so forbidding it is a formality unless the
     two-step is deliberate friction.
   - Recommendation: allow it, and say so — or forbid it and say why. Leaving it
     to the implementation means the answer is whichever the first plan happened
     to write.

4. **May a `pending` organizer read the register?** — **RESOLVED → D-19**: no. Reading requires an **approved** staff role. The register is not gated on `staff.manage` (`requires_approved = false`), and that flag is not flipped, because the door depends on it. Plan 43-07 implements this as a ninth capability `register.read` with `requires_approved = true`. (§ D.5)
   - Known: `staff.manage` carries `requires_approved = false`
     (`20260807000000:392-393`), so gating on it admits a `pending` organizer. That
     asymmetry is deliberate and measured (`32-CARRY-FORWARD.md` hard constraint 2).
   - Unclear: whether the register — which contains rejections — should be visible
     to an organizer who is not yet approved.
   - Recommendation: if it should not, `catalogue.manage` (`requires_approved =
     true`) is the existing key with that shape. Do **not** flip `staff.manage`'s
     flag: `20260807000000:415` and `32-CARRY-FORWARD.md` both forbid it.

5. **What happens to `MASTER_EMAIL` when it names an account that does not exist?** — **RESOLVED → D-16** (owner): it demotes nobody. Demotion is conditional on the named account existing and having acquired `master`, the reconciliation never leaves zero masters, and the unmatched case must have an observable effect rather than a log. Related: **D-22**, `actor_kind`, because a reconciliation-driven act has no human author. (§ E.4)
   - Known: today nothing happens. After D-12 a naive reconciliation would demote
     the incumbent and leave zero masters.
   - Unclear: whether demotion should require the new master to exist first.
   - Recommendation: **yes, require it.** Demoting into a zero-master state turns
     the recovery path into a lockout, and the recovery path is what D-12 repairs.
     This is Critical and needs the owner.

6. **Is `attendances.entry_role` worth its cost on the offline path?** — **RESOLVED → D-17** (owner): yes, taken completely, including the offline path — the column, the role in the roster payload, and the IndexedDB version bump. The upgrade must be exercised inside this phase, and it may not strand a queued scan. (§ F.2, § G.4)
   - Known: online it is one word in an existing `select` and one field in an
     existing `insert`. Offline the store holds no role, so it needs either a
     roster-payload change plus an IndexedDB version bump, or a sync-time lookup
     that reintroduces the mutable-role problem at a different moment.
   - Unclear: whether ACCT-05 needs the marker at all, or whether "recorded like
     any other entry" is satisfied by the count alone.
   - Recommendation: read `ACCESS-MODEL-DECISIONS.md` §8 as asking for
     *readability*, and take the column — but scope the offline half explicitly
     rather than discovering it mid-phase. `.planning/STATE.md` warns that an
     IndexedDB upgrade must be exercised before the first real night.

7. **When does `32-HUMAN-UAT.md` M-12 run?** — **RESOLVED → D-15** (owner): before the constraint migration, as the first plan of the phase and `[BLOCKING]`. Plan 43-01 owns it, and 43-06 refuses to apply the constraint while M-12 still reads `[pending]`. Taken knowing the state is a database anomaly rather than a reachable persona: what it buys is dated evidence for the day D-06's trap is proposed. (§ E.0)
   - Known: it needs an `organizer/pending` account in production; D-04 forbids
     that state; the owner deferred all fourteen checks and named M-12 first.
   - Unclear: nothing technical. This is a decision.
   - Recommendation: run it before the constraint migration, in a plan of its own.
     It is one manual check and it verifies the foundation everything after it
     stands on.

---

## Sources

### Primary (HIGH confidence)

**Measured in a throwaway `postgres:17.6` container, this session, then destroyed:**
- CHECK constraints cannot be marked `DEFERRABLE`
- `ADD CONSTRAINT … NOT VALID` still refuses new violating inserts, refuses
  compliant→violating updates, and refuses **any** update to an already-violating
  row, including on an unrelated column
- A plain `ADD CONSTRAINT` after seeding violating rows fails; `NOT VALID` succeeds
- A CHECK is not bypassed by `SECURITY DEFINER`, by superuser, or by
  `session_replication_role='replica'`
- SQLSTATE `23514` with `SCHEMA NAME`, `TABLE NAME`, `CONSTRAINT NAME` populated
- A `RAISE … USING errcode/constraint/table/schema` trigger reproduces that error
  shape exactly
- `ALTER TABLE … DISABLE TRIGGER` seeds all four forbidden personas and re-enable
  restores enforcement
- `session_replication_role='replica'` **does** bypass an origin trigger, and is
  superuser-only
- A non-superuser table **owner** may `DISABLE TRIGGER`
- Inline column CHECKs on `ALTER TABLE … ADD COLUMN` are auto-named
  `profiles_role_check` / `profiles_status_check`

**Read in this repository (every claim above carries its `file:line`):**
`supabase/schema.sql`, `supabase/migrations/20260224_rbac_migration.sql`,
`20260225000000_phase3_referral.sql`, `20260310000000_guest_list.sql`,
`20260805120000_door_scan_events.sql`, `20260807000000_capability_model.sql`,
`20260807000100_capability_model_fk_index.sql`,
`20260807010000_policies_to_capabilities.sql`;
`scripts/rls-baseline.mjs`, `scripts/rls-baseline-container.mjs`,
`scripts/rls-baseline-compare.mjs`, `scripts/container/seed.mjs`,
`scripts/verify-capabilities.mjs`;
`src/lib/capabilities/{keys,server,guards}.ts`, `src/lib/supabase/{middleware,service}.ts`,
`src/lib/rbac/roles.ts`, `src/lib/offline/{checkin-store,sync-manager}.ts`,
`src/lib/guest-list/process-entry.ts`, `src/lib/email.ts`, `src/utils/qr.ts`,
`src/types/database.ts`;
`src/app/api/auth/callback/route.ts`, `src/app/api/membership/{list,verify}/route.ts`,
`src/app/api/tickets/attendance/route.ts`,
`src/app/(admin)/admin/members/{actions.ts,page.tsx}`,
`src/app/(admin)/admin/scanner/ScannerClient.tsx`,
`src/app/(members)/{dashboard,membership-card}/page.tsx`,
`src/components/admin/MemberTable.tsx`, `src/components/auth/ResetPasswordButton.tsx`;
`package.json`, `.planning/config.json`.

**Project gates:** `CLAUDE.md`; `.claude/rules/` — `meta-gates.md`,
`access-gating.md`, `supabase-data.md`, `checkin-offline.md`,
`community-membership.md`, `comms-analytics.md`, `nextjs-architecture.md`,
`ai-engineering.md`.

**Official documentation:**
- `supabase.com/docs/reference/javascript/auth-admin-generatelink` — the six
  `type` values, which create users, which permit setting a password

### Secondary (MEDIUM confidence)

Derived planning documents, each **re-verified against current code** before being
repeated here per `ai-engineering.md` gate *documentazione datata*:
`.planning/ACCESS-MODEL-DECISIONS.md` (2026-08-06),
`.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`,
`.planning/phases/32-…/32-CARRY-FORWARD.md`,
`.planning/phases/32-…/32-HUMAN-UAT.md`.

**Corrected in this file:** the "eleven personas" figure in
`ACCESS-MODEL-DECISIONS.md` §11 and `43-CONTEXT.md` — nine profile rows, eleven
persona labels (§ B.3).

### Tertiary (LOW confidence)

- A1 (PostgREST forwards `23514`) — inferred from the shape of existing error
  handling, not measured
- A2 (`generateLink` honours `options.redirectTo`) — not verified against docs
- A3 (production holds no violating row) — from documents dated 2026-08-06
- `.planning/codebase/` (dated 2026-02-24) — **not cited anywhere in this file**,
  per Guardrail 4

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| The D-04 mechanism and its bypass paths | **HIGH** | Nine distinct properties measured in `postgres:17.6` this session. Four of the five relaxation options in the brief were **disproved**, not reasoned about |
| The harness seam (ROLE-03) | **HIGH** | The three break points and the comparator's unwaivable defect codes read at exact line numbers; the drop/`NOT VALID` recipe verified |
| The role enumeration surface | **HIGH** | Twenty-one sites enumerated by grep with line numbers; the count of build-detectable ones (**one**) is measured, not estimated |
| Account creation and entry | **HIGH** | Traced end to end. The `ACCT-03` gap (no password-set surface) is a `grep` result, not an inference |
| The attribution register | **MEDIUM** | The absence of any audit table is verified; the recommended shape is a design proposal following the repo's own `door_scan_events` precedent, and the RPC-versus-trigger choice rests on A1 |
| `MASTER_EMAIL` demotion | **MEDIUM** | The promotion site and its five defects are verified; the trigger choice and the zero-master lockout are analysis needing the owner's decision |
| Staff entry in attendance | **HIGH** on "it already works"; **MEDIUM** on the marker | The absence of a role branch is verified by grep; whether the marker is needed, and its offline cost, is an open question |
| Production's current row shape | **LOW** | Cannot be queried from here. The count query must run before the DDL |

**Research date:** 2026-08-07
**Valid until:** the codebase claims are pinned to `file:line` and go stale on the
next commit that touches those files — re-verify any citation before repeating it.
The PostgreSQL behaviours are stable across 17.x. **The single most perishable
item is A3** (production's row shape), which must be measured immediately before
the migration is written, not before the plan is written.

---

## RESEARCH COMPLETE

**Phase:** 43 — Role Model & Account Creation
**Confidence:** HIGH on mechanism, MEDIUM on two design choices that need the owner

### Key findings

1. **Four of the five relaxation mechanisms in the phase brief cannot relax a
   `CHECK` constraint** — measured in `postgres:17.6`. `DEFERRABLE` is refused
   outright; `NOT VALID` still refuses new writes; `SECURITY DEFINER`, superuser
   and `session_replication_role` all fail to bypass it. With a CHECK the only
   route is drop-and-restore, and the restore **must** be `NOT VALID`. A trigger
   is compatible with all five but is disable-able by the table owner.
2. **`32-HUMAN-UAT.md` M-12 — the door check the owner said to run first — becomes
   unrunnable once D-04 lands.** It requires creating an `organizer/pending`
   account in production. It is the only one of the fourteen that does. This is an
   ordering decision, and it should be taken before any plan is written.
3. **`ACCT-03` has no surface to land on.** `supabase.auth.updateUser({ password })`
   appears nowhere in `src/`. The recovery link deposits an authenticated person on
   `/dashboard` with no password field. A set-password surface is required work
   that no upstream document names — and the existing guest-list invitation has the
   same hole today.
4. **`ACCT-02` and `ACCT-05` are already structurally true.** Neither the door's
   verify path nor the roster route reads `role` or `status`; the attendance insert
   has no role branch. What they need is not mechanism but a decision (a
   distinguishing marker) and a written manual procedure — including the honest one
   that an account created after a roster download **will** be refused at an
   offline door.
5. **`npm run build` detects one of twenty-one role enumeration sites.** Seventeen
   `role as UserRole` casts launder the new value silently. The container write
   matrix and written manual procedures are the real detectors, and the matrix must
   run **per plan**, not batched to the end — Phase 32's only serious defect was
   introduced by one plan and caught by that matrix.

### File created

`/Users/etiesse/Resonate/.planning/phases/43-role-model-account-creation/43-RESEARCH.md`

### Ready for planning

Research complete. Seven Open Questions are listed; three of them (§ A.3, § E.0,
§ E.5) are Critical under `CLAUDE.md`'s classification and want the owner's answer
before plans are written rather than after.
