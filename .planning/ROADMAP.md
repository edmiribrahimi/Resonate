# Roadmap: Resonate

## Completed Milestones

- [x] **v1.0** -- Trust-gated music events community: RBAC, referral/approval, SumUp ticketing, event media, branded emails (7 phases, 22 plans, 45 requirements) -- [archive](.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1** -- SumUp embedded checkout + drink ordering system: embedded payments, drink menu CRUD, token redemption with anti-fraud, public QR menu for guests (5 phases, 9 plans, 18 requirements) -- [archive](.planning/milestones/v1.1-ROADMAP.md)
- [x] **v1.2** -- SumUp API deep integration: official SDK, admin finance dashboard, refunds, APMs (Satispay/MyBank/Apple Pay/Google Pay), menu closing + auto-refund (7 phases, 12 plans, 33 requirements) -- [archive](.planning/milestones/v1.2-ROADMAP.md)
- [x] **v1.3** -- Refinement & Intelligence: analytics (PostHog + Recharts dashboards), layout elegance (motion, skeletons, toast), guest list management, discount codes, navigation consolidation (9 phases, 19 plans, 60 requirements) -- [archive](.planning/milestones/v1.3-ROADMAP.md)
- [x] **v1.4** -- Check-in Overhaul: party selection, continuous QR scanner with flash/haptic, offline support, membership door check-in (2 phases, 5 plans, 16 requirements) -- [archive](.planning/milestones/v1.4-ROADMAP.md)

---

# Milestone v1.5 — Platform Layout, Access Model & Door Fixes

## Overview

v1.5 rebuilds four things that today sit on top of each other badly: the defects
live at the door and the bar right now, the permission model, the duplicated
work surfaces, and the visual system. The order is not a preference — it is the
whole plan. The live defects go first because they exist regardless of this
milestone and because one of them (an attendee-cache refresh that reverts an
unsynced check-in) turns from a rare race into the normal case the moment live
updates are switched on. Then the capability model is defined **in the
database**, once, so that a page, a server action and a row-level policy all ask
the same question of the same definition; the server data-access layer is built
on top of it and header trust ends there; the fourth role and account creation
land next, then per-night assignments, and **only then** do the duplicated route
trees collapse into one — so the collapse is built once, against four roles and
assignments that already exist, rather than once for three roles and again
afterwards. The format model and the design conversion follow the collapse for
the same reason. The door is never bundled with the routing work: a redirect
needs a network the door is designed not to need, so its address moves in a step
of its own, verified on a device with the network off. The design track runs
last, and the scanner is the last surface it touches — a visual regression there
is a safety issue, not a cosmetic one.

**A fifth thing was added on 2026-08-11:** the production material stops living
outside the product. The calendar, and then each production section under its own
entitlement, come inside (44, 45). They run **after** the visual track and not
before it, for the reason phase 41 states about itself — a surface converts whole
or not at all, and the production section is the largest set of new surfaces in
the project. Building it before the token layer and the shared primitives exist
would create the biggest half-converted surface in the product and force 41 and
42 to reopen every screen just written.

**Milestone numbering continues from v1.4:** phases run 31 → 45. Phase 43 was
added on 2026-08-06, after 34 and 35 had already been numbered and cited; it
executes between 33 and 35, not at the end. Phases **44 and 45 were added on
2026-08-11** (owner decision) and execute **after 42** — they carry PROD-01 and
PROD-02, promoted out of Future Requirements once the capability model (32) and
the format model (36) had both shipped, which were the only stated reasons they
were deferred. See the note below.

## Phases

**Phase Numbering:**

- Integer phases (31, 32, 33): Planned milestone work
- Decimal phases (32.1, 32.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

> **This list is in execution order, and execution order is NOT numerically
> ascending. That is deliberate.**
>
> **A phase number is an identity, not a position.** Phase 43 was added on
> 2026-08-06, when 34 and 35 were already numbered and already cited by twelve
> committed documents — citations that bind requirement IDs to phase numbers
> (*"Phase 34's CAP-02"*), one of them inside the closed verification record of a
> completed phase. Renumbering would make a closed record false, and a record is
> corrected only when it was wrong when written, never to match a decision taken
> afterwards. So the numbers stay fixed and **order is expressed by position in
> this list and by `Depends on`** — nowhere else.
>
> **Why the order moved (owner decision, 2026-08-06):** phase 34 collapses the
> admin and organizer trees into one capability-driven surface. Building it
> before the fourth role and before per-night assignments exist would mean
> building it once for three roles, and again for four roles plus assignments.
>
> Execution order: **33 → 43 → 35 → 34 → 36 → 37 → …**

- [x] **Phase 31: Live Defects at the Door and the Bar** - Correct the nine defects present in production today, before anything is built on top of them (completed 2026-08-06)
- [x] **Phase 32: Capability Model in the Database** - One definition of every permission, evaluated identically by pages, actions and row-level policies (completed 2026-08-06)
- [x] **Phase 33: Server Data-Access Layer** - Identity and capability resolved from the session in one server-only place; no surface trusts a request header (completed 2026-08-07)
- [x] **Phase 43: Role Model & Account Creation** - The fourth role grants entry and nothing else; master and organizer create accounts, and every act that changes who someone is is recorded with its author (executed 2026-08-08 — **verification `human_needed`: nothing deployed, 16/16 manual checks pending**, see `43-VERIFICATION.md`)
- [x] **Phase 35: Per-Night Assignments** - What a person can do on one night is granted for that night alone, separate from role and separate from public credit (completed 2026-08-09)
- [x] **Phase 34: One Work Surface** - The duplicated admin and organizer trees become a single capability-driven surface; the door is deliberately untouched (completed 2026-08-10)
- [x] **Phase 36: Formats & Series Numbering** - Each night carries its format and stored series number; the events surface filters to one format (completed 2026-08-10)
- [x] **Phase 37: Manual Venue Reveal** - The scheduled reveal stays the normal path, with a confirmed and recorded manual path for master and organizer (executed 2026-08-11 — NOT deployed, NOT verified; the anonymous address read is still open in production by owner decision)
- [ ] **Phase 38: Live Attendance Freshness** - The attendee list updates by itself while the network is there, and never stands between a scan and its verdict
- [ ] **Phase 39: The Door's Own Address** - The door moves to its permanent address in a step of its own, verified with the network off — *code executed 2026-08-11, four plans, all automated gates green; **not complete**: `39-VERIFICATION.md` is `human_needed` and criteria 2 and 3 close only at the end-of-v1.5 sitting (D-39-07), same night as Phase 38*
- [~] **Phase 40: Brand Tokens & Typography** - Colour, surface, line and type come from one token set, released whole (5/5 plans executed 2026-08-11 — **verification `human_needed`**, not complete: DS-10 and DS-06's home-screen half are proven only by `40-RELEASE-PASS.md` H1/H3, every `Result: pending`, in the end-of-v1.5 sitting. Scheduled is not verified.)
- [ ] **Phase 41: Shared Primitives & Three-Tier Layout** - The shared layer is built and proven on its first eight whole surfaces
- [ ] **Phase 41.1: Work-Surface Conversion** - The 22 remaining work pages convert onto the layer, and the work-surface gates stop being ratchets
- [ ] **Phase 41.2: Public, Member and Money Surfaces** - The public and member surfaces convert, and the three knots — the bar, the event form, the refunds — are taken on their own
- [ ] **Phase 42: Scanner Conversion** - The scanner takes the visual system last, with its behaviour untouched
- [ ] **Phase 44: The Production Calendar Comes Inside** - The calendar stops living outside the product; it is imported into the database and never through the repository
- [ ] **Phase 45: Production Sections, Section by Section** - Each production section is entitled separately, because they do not carry the same risk

## Phase Details

*Sections below are in execution order, matching the checklist above.*

### Phase 31: Live Defects at the Door and the Bar

**Goal**: The defects that exist in production today are corrected, so the door reports what actually happened and the bar records nothing it cannot confirm. Nothing in this milestone is built on top of an uncorrected door.
**Depends on**: Nothing (first phase of the milestone)
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-04a, FIX-05, FIX-06, FIX-07, FIX-08, FIX-09, FIX-10, FIX-11, FIX-12, FIX-13
**Success Criteria** (what must be TRUE):

  1. An inbound `x-user-*` header never reaches a Server Component or a server action, and pressing "serve" on an already-served drink token fails with a distinct message instead of reporting success *(both applied 2026-08-05)*
  2. The door has three outcomes and only three — recorded now, already recorded, not valid — identical with the network on and off. A ticket already recorded shows who recorded it and when, is never refused, and never reads as a connection error. The queued entry is kept rather than deleted
  2b. The night's review list is empty on a normal night, raises no notification, and separates a double read from a second unused ticket from two devices minutes apart from a signature this system never issued. A double read does not appear but is counted. A refund issued after the night began does not appear at all — it is accounting
  2c. A conflict is recorded against the ticket and never as a label on a member; an admitted entry counts as admitted; the technical detail is available to a master and carries identifiers rather than names or email addresses

  3. A check-in recorded offline is still shown as arrived after an attendee-cache refresh, the list is never momentarily empty during that refresh, and the same person checked in at two different nights on one device produces two queued entries
  4. A ticket refunded after the cache was downloaded is admitted and flagged for review, with the network on and with the network off
  5. A membership sync that cannot ever succeed is shown as failed rather than retried forever, so the pending count means what it says
  6. Synchronising a queued offline scan still proves possession of the ticket: the signed token read from the code travels with the queued entry, and a bare ticket identifier is no longer accepted as a check-in

**Plans**: 13 plans, in 6 waves

Plans:
**Wave 1**

- [x] 31-01-PLAN.md — The door's offline ground: route-specific service-worker cache, no reload on reconnection, and the night's runbook
- [x] 31-02-PLAN.md — The shared three-outcome contract, plus partyEndInstant and the third haptic
- [x] 31-03-PLAN.md — Settle the two refund unknowns against a real database before the migration is written

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 31-04-PLAN.md — Schema: door_scan_events with RLS, refund evidence, attendance per party, guest-list check-in columns — applied and observed
- [x] 31-05-PLAN.md — Offline store v3: composite keys, a stable device id, a merging refresh, a four-state queue

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 31-06-PLAN.md — The attendee payload the offline door needs: Event Pass included, operator labels, refund evidence
- [x] 31-07-PLAN.md — The check-in route: verify every path, admit every valid holder, record before answering
- [x] 31-08-PLAN.md — Membership verify: the same three outcomes, and attendance recorded per party
- [x] 31-09-PLAN.md — The refund keeps its evidence, and a failed delete stops being invisible

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 31-10-PLAN.md — The sync manager stops trusting res.ok: done, retry, dead, blocked
- [x] 31-12-PLAN.md — The night's review list, classified by cause, empty on a normal night

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 31-11-PLAN.md — The scanner: a third state, the same three outcomes on both paths, counters visible online

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 31-13-PLAN.md — The evidence: static assertions, the door pass on a phone with the radio off, and 31-VERIFICATION.md

### Phase 32: Capability Model in the Database

**Goal**: Every permission answer has exactly one definition, held in the database, so a page, a server action and a row-level policy all reach the same verdict from the same source. Behaviour is identical to today when this phase ends.
**Depends on**: Nothing technically — ordered after Phase 31 because the live defects come first
**Requirements**: CAP-01, CAP-03, CAP-04, CAP-06
**Success Criteria** (what must be TRUE):

  1. A master, an organizer and a member can do neither more nor less than they could before this phase, verified surface by surface against the pre-phase behaviour
  2. The same capability question asked by a page, by a server action and by a row-level policy returns the same answer, produced by the same definition
  3. A permission granted for a single night takes effect on the next request, without signing out and without waiting for a session or token to refresh
  4. Every existing row-level policy has been reviewed for the pattern that re-evaluates the current user once per row, and the review is recorded with its result per policy

**Plans**: 11 plans, 9 waves

Plans:

**Wave 1** *(the baseline, before any DDL exists)*

- [x] 32-01-PLAN.md — The evidence harness: the policy dump and the advisor oracle
- [x] 32-02-PLAN.md — B4, the register of every permission surface in application code

**Wave 2** *(blocked on 32-01)*

- [x] 32-03-PLAN.md — The persona read and write matrices, and the rollback guarantee

**Wave 3** *(blocked on 32-02, 32-03)*

- [x] 32-04-PLAN.md — The throwaway PostgreSQL 17.6 target, and the first capture on both targets, committed

**Wave 4** *(blocked on 32-04)*

- [x] 32-05-PLAN.md — The comparator and its two-transformation whitelist

**Wave 5** *(blocked on 32-05)*

- [x] 32-06-PLAN.md — The capability model: private schema, catalogue, grants, one resolver, one exposed wrapper

**Wave 6** *(blocked on 32-06)*

- [x] 32-07-PLAN.md — The policy cutover: 45 predicate call sites replaced in place
- [x] 32-08-PLAN.md — The resolver, the middleware's four rules, and one reference conversion

**Wave 7** *(blocked on 32-07)*

- [x] 32-09-PLAN.md — CAP-06: the 26-row review and the wrapping migration

**Wave 8** *(blocked on 32-08, 32-09)*

- [x] 32-10-PLAN.md — The four-sided capability key check the build cannot perform

**Wave 9** *(blocked on 32-10)*

- [x] 32-11-PLAN.md — The phase gate: final re-capture, the CAP-04 demonstration, 32-VERIFICATION.md

### Phase 33: Server Data-Access Layer

**Goal**: Identity and capability are resolved from the session in one server-only module, and every surface asks that module instead of reading a request header.
**Depends on**: Phase 32
**Requirements**: CAP-05
**Success Criteria** (what must be TRUE):

  1. No page, server action or API route derives a role or an identity from a request header — identity comes from the session, resolved in one place
  2. A request that forges an identity header is answered exactly as an anonymous request would be, including on the paths that move money
  3. Each permission check that existed in two divergent copies is now one function, and the duplicates are deleted rather than left unused
  4. `npm run build` passes and every role still reaches exactly the surfaces it reached before this phase

**Plans**: TBD

### Phase 43: Role Model & Account Creation

**Goal**: The four roles exist with `staff` granting entry and nothing else; master and organizer create accounts, and every act that changes who someone is, is recorded with its author.
**Depends on**: Phase 33
**Requirements**: ROLE-01, ROLE-02, ROLE-03, ROLE-04, ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05
**Success Criteria** (what must be TRUE):

  1. A fourth role `staff` exists and grants exactly one thing — entry to a night via the membership card — and no ability to upload, scan or manage anything
  2. An account holding a staff role (`master`, `organizer`, `staff`) is `approved` **by database rule**, not by four call sites each remembering; a write that would leave a staff role unapproved is refused by the database
  3. The baseline harness can still create the four states that rule forbids (`organizer/pending`, `organizer/rejected`, `master/pending`, `master/rejected`), so the container keeps the detection power that caught phase 32's only serious defect
  4. `master` and `organizer` can create an account; the created account is valid for entry immediately, and the message it receives carries a link to set a password, never a password
  5. Creating an account appears in the same register as an ordinary approval, with the same author and timestamp — as do promotion, rejection and deactivation
  6. An organizer may promote a staff member to organizer and may not create a master
  7. `MASTER_EMAIL` demotes as well as promotes: changing it does not leave a past master holding master
  8. A free staff entry is recorded in the night's attendance like any other entry

**The cost of criterion 2, which is real and is paid deliberately.** The
constraint makes four personas unrepresentable — `organizer/pending`,
`organizer/rejected`, `master/pending`, `master/rejected` — and **those four
personas are the only reason phase 32 caught its worst defect.** When plan 32-07
deliberately collapsed two capabilities, the policy catalogue passed it and
production's write matrix would have passed it in silence; only the container's
write matrix caught it — **sixteen cells, every one of them belonging to those
four personas.** So criterion 3 is not a convenience: the harness must keep the
ability to seed those states (drop the constraint while seeding, restore it
afterwards), or this phase buys a real rule at the price of the only net that has
already caught something. Whoever implements the constraint owns that, and it is
not optional.

**The trap to refuse when it comes.** Once the constraint exists,
`door.operate`'s `requires_approved = false` will **look** redundant, and someone
will propose removing it as tidying. **It must not be removed.** The constraint
protects the database; the door's setting protects the night from the day the
constraint is relaxed for one special case. The two guard different things, and
the asymmetry is unchanged: refusing a valid staff member at the door, in front
of a queue, is worse than the alternative.

*Source: `.planning/ACCESS-MODEL-DECISIONS.md`, decisions 1, 2, 4, 6, 7, 8, 10, 11.*

**Plans**: 15 plans, in 10 waves
**UI hint**: yes

Plans:
**Wave 1**

- [x] 43-01-PLAN.md — [BLOCKING] M-12 while the state it needs still exists, production's row shape, and the shape of a refusal
- [x] 43-02-PLAN.md — verify-capabilities gains a fifth side: every role × capability pair is a declared grant or a declared refusal

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 43-03-PLAN.md — the harness keeps its four forbidden personas: the seed-time relaxation and the assertions that make ROLE-02 measurable
- [x] 43-04-PLAN.md — the set-password surface the invitation will land on, and the redirect it must not be able to leave

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 43-05-PLAN.md — the fourth role lands: both role CHECKs, two grant rows, six declared refusals — applied and observed

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 43-06-PLAN.md — `role ⇒ approved` as a database rule, and the harness that still seeds what it forbids — applied and observed

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 43-07-PLAN.md — the register: one append-only table for five acts, with a system actor and an atomic write — applied and observed

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 43-08-PLAN.md — `staff` joins the write matrix: the deliberate re-baseline, and staff proved equal to member cell for cell
- [x] 43-09-PLAN.md — the six acts write the register in one transaction, and a refused write becomes a value

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 43-10-PLAN.md — the seat cost made readable: `attendances.entry_role` and the roster payload — applied and observed
- [x] 43-11-PLAN.md — account creation: the action, the Italian invitation carrying a link, and the form

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 43-12-PLAN.md — `MASTER_EMAIL` demotes as well as promotes, bounded so it can never empty itself — applied and observed
- [x] 43-13-PLAN.md — the door's store gains a field without stranding a queued scan, exercised on a real device

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 43-14-PLAN.md — the members surface learns the fourth role, stops swallowing refusals, and the register gets its reader

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 43-15-PLAN.md — the evidence: eleven written procedures, the whole-of-phase comparison, and an honest coverage claim

### Phase 35: Per-Night Assignments

**Goal**: What a person can do on one night is granted for that night alone — separate from their account-wide role, and separate from public credit, which grants nothing.
**Depends on**: Phase 43
**Requirements**: ASSIGN-01, ASSIGN-02, ASSIGN-03, ASSIGN-04, ASSIGN-05, ASSIGN-06, ASSIGN-07, ASSIGN-08
**Success Criteria** (what must be TRUE):

  1. A person assigned to one night as door, photo or organizer can use that night's tools and nothing changes for them on any other night; the scanner resolves that assignment once when it opens rather than at every scan
  2. Access to a night's tools does not outlive the night, and revoking an assignment is one action that is recorded rather than deleted and never strands a scan already queued offline
  3. Nobody can grant an assignment to themselves
  4. Undoing a check-in is refused for a person assigned only to the door for that night, and allowed for an organizer
  5. A dj or photographer credit can be created for a person who has no account, grants access to no tool, and creates no account

**Plans**: 21 plans, in 9 waves
**UI hint**: yes

Plans:
**Wave 1**

- [x] 35-01-PLAN.md — Wave 0: the baseline before the first line of DDL, and the 6 + 8 + 1 migration queue as a blocking checkpoint

**Wave 2** *(blocked on Wave 1)*

- [x] 35-02-PLAN.md — `party_assignments` as a temporal record, the no-self-grant CHECK, the composite FK that makes only staff roles assignable, and the SQL night clock

**Wave 3** *(blocked on Wave 2)*

- [x] 35-03-PLAN.md — The resolver's second arm, null-safe, plus three new capability keys and the per-night `my_access_context` overload
- [x] 35-04-PLAN.md — The assignment acts in the existing register, the atomic writer, and D-18 rewritten with the right criterion
- [x] 35-05-PLAN.md — `party_credits`: the table without an account column, the publication gate on its reads, and the structural check for ASSIGN-07

**Wave 4** *(blocked on Wave 3)*

- [x] 35-06-PLAN.md — The harness: two probe payloads, the dedicated self-grant probe proved by mutation, and the seed's third axis
- [x] 35-07-PLAN.md — `hasCapability(key, { partyId })` and a door guard that resolves once and returns the supervision verdict
- [x] 35-08-PLAN.md — The assignment surface, and the single action that revokes then demotes when the database refuses

**Wave 5** *(blocked on Wave 4)*

- [x] 35-09-PLAN.md — The door register narrowed by assignment rather than by role, with the read set proved unshrunk
- [x] 35-10-PLAN.md — `doorAuth` on the payload the scanner already asks for, and a night list that only ever adds rows
- [x] 35-11-PLAN.md — Undo requires a supervising capability, with its status chosen by reading the drain's table
- [x] 35-12-PLAN.md — The drain judges at `scannedAt`: no queued scan is ever stranded
- [x] 35-15-PLAN.md — `live_assignment_capabilities` in the payload the middleware already asks for: the coarse question, never the per-night one
- [x] 35-18-PLAN.md — `party_id` on `event_media`: the column, the fact-only backfill, and the trigger that makes NULL legacy rather than a wildcard
- [x] 35-19-PLAN.md — The metadata strip and the private quarantine bucket: `sharp` declared, and every non-success is a refusal

**Wave 6** *(blocked on Wave 5)*

- [x] 35-13-PLAN.md — The device: store v5, the verdict read from cache, and the offline undo that no longer bypasses supervision
- [x] 35-16-PLAN.md — `media.upload` gets its real consumer, scoped to the night: one predicate read by the action that validates and by the action that writes
- [x] 35-17-PLAN.md — The coarse gate widened and the per-night gates landed together: scanner and per-night review reachable, with three distinguishable rebounds

**Wave 7** *(blocked on Wave 6)*

- [x] 35-20-PLAN.md — `POST /api/media/finalize`: the only path into the public bucket, and it goes through the strip

**Wave 8** *(blocked on Wave 7)*

- [x] 35-21-PLAN.md — The surface names the night, the browser loses the public bucket, and a structural check fails if a second writer appears

**Wave 9** *(blocked on Wave 8)*

- [x] 35-14-PLAN.md — `35-HUMAN-UAT.md` written: twelve procedures, the honest coverage declaration, and the deferred debt named

### Phase 34: One Work Surface

**Goal**: The duplicated admin and organizer route trees become a single work surface that shows the viewer what they are entitled to see, with old addresses still working — and with the door deliberately left where it is.
**Depends on**: Phase 35
**Requirements**: CAP-02, STAFF-01, STAFF-02, STAFF-03
**Success Criteria** (what must be TRUE):

  1. Each work surface exists at one address and renders according to what the viewer is entitled to see, not according to which tree they arrived from
  2. Addresses under the previous `/admin/*` and `/organizer/*` prefixes land on the new surface through permanent redirects, so links and bookmarks already sent still work
  3. A navigation entry appears only where the matching server-side check also passes — typing the address of a hidden entry is refused, not rendered
  4. A capability that exists in the database but is mapped to no route fails the production build

**Plans**: 17 plans, in 6 waves
**UI hint**: yes

Plans:
**Wave 1**

- [x] 34-01-PLAN.md — The route↔capability map, the fifteen-row redirect table, and `typedRoutes`, with CAP-02 proved by mutation in both directions
- [x] 34-02-PLAN.md — Pre-phase observations: the `pre-34` container baseline, the catalogue link, and the door with the network off

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 34-03-PLAN.md — The middleware: three prefix rules become one resolver, and the redirect is emitted before any session work
- [x] 34-04-PLAN.md — The two staff menus read the map; the bottom nav's door entry stops being a literal
- [x] 34-05-PLAN.md — The work-surface layout, and the four master-only surfaces move under it; `/admin` gets a gate of its own
- [x] 34-07-PLAN.md — The eight shared modules leave the organizer tree, 36 import specifiers follow them, and R-WORK-ROUTES is declared
- [x] 34-08-PLAN.md — The three mechanical checks: the redirect walk, the `revalidatePath` scan and the route census

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 34-06-PLAN.md — The two organizer-only surfaces move, the assignment allow-list becomes a per-route binding, and the route-group arrangement is recorded for the next wave

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 34-09-PLAN.md — `artists` and `venues` collapse onto `organizer.access`
- [x] 34-10-PLAN.md — The `members` tree collapses, and the folded register defect closes by construction
- [x] 34-11-PLAN.md — `events` and `events/new` collapse, and `EventList` loses its `basePath`
- [x] 34-12-PLAN.md — `events/[id]/edit` and `events/[id]/drinks` collapse, with the drinks money path untouched
- [x] 34-13-PLAN.md — `events/[id]/tickets` collapses alone — 140 changed lines on a money path
- [x] 34-14-PLAN.md — `sales`, `guest-list`, `analytics` and `media` collapse; the media surface gets the gate it never had

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 34-15-PLAN.md — `src/app/(organizer)/` is deleted and the persona is corrected in the same commit
- [x] 34-16-PLAN.md — The literal sweep: 36 `revalidatePath` calls, and side 4's message re-pointed at the map

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 34-17-PLAN.md — The flip to 308, both redirect walks, the nine written procedures, and `34-VERIFICATION.md`

### Phase 36: Formats & Series Numbering

**Goal**: Each night carries its format and its stored series number, and a visitor can narrow the events surface to a single format without ever seeing what has not been announced.
**Depends on**: Phase 34
**Requirements**: FMT-01, FMT-02, FMT-03, FMT-04, FMT-05, FMT-06
**Success Criteria** (what must be TRUE):

  1. One event can hold two nights of different formats, and each night shows its own format
  2. A night's sigla is composed from its stored series code and its stored number — the number is never recomputed from a count — and the database refuses two nights sharing the same format, series and number
  3. A visitor can see all events or filter to one format; the choice survives navigation and can be shared as a link that opens on the same filter
  4. A format's label and colour change without a deploy, and a retired sigla cannot appear on any surface
  5. No count, label or code on a public surface reveals an unannounced night or a secret venue

**Plans**: 14 plans, in 9 waves
**UI hint**: yes

Plans:
**Wave 1**

- [x] 36-01-PLAN.md — the `pre-36` baseline, on both targets, taken before a phase-36 migration exists on disk
- [x] 36-02-PLAN.md — what the catalogue holds on day one, and what each of the three existing nights carries — a blocking decision

**Wave 2** *(blocked on Wave 1)*

- [x] 36-03-PLAN.md — the migration: two catalogue tables with opposite read policies, three columns on the night, the backfill and its raising guard, the composite key and the named unique

**Wave 3** *(blocked on Wave 2)*

- [x] 36-04-PLAN.md — the harness keeps measuring: widened probe payloads, the two new tables seeded first, and the two constraint probes that make FMT-03 automated
- [x] 36-06-PLAN.md — the contracts: the two types, the capability branch change that opens the catalogue address, and `FormatMarker` with its explicit `normal-case`

**Wave 4** *(blocked on Wave 3)*

- [x] 36-05-PLAN.md — apply through the Management API migrations endpoint, then read the policy predicates back from `pg_policies`

**Wave 5** *(blocked on Wave 4)*

- [x] 36-07-PLAN.md — the catalogue actions, where the guard is the whole boundary and every refusal is a returned value
- [x] 36-10-PLAN.md — format, series and number on the work surface, and the end of `updateEvent`'s swallowed per-night errors
- [x] 36-11-PLAN.md — `/events`: two parameters, one chip row for everyone, and a card that degrades to the narrower name

**Wave 6** *(blocked on Wave 5)*

- [x] 36-08-PLAN.md — the colour control that cannot express a gradient, and the two catalogue modals
- [x] 36-12-PLAN.md — the tab in the address without breaking the swipe, and the marker on every night

**Wave 7** *(blocked on Wave 6)*

- [x] 36-09-PLAN.md — the catalogue surface, and the only destructive confirmation in the phase

**Wave 8** *(blocked on Wave 7)*

- [x] 36-13-PLAN.md — V3: an unannounced night seeded on purpose, the anonymous key asked directly, and the source read rather than the rendering

**Wave 9** *(blocked on Wave 8)*

- [x] 36-14-PLAN.md — V1, V2, V4, V5, and a validation record that keeps `nyquist_compliant: false` on purpose

### Phase 37: Manual Venue Reveal

**Goal**: The scheduled reveal remains the normal path; a manual path exists for master and organizer, behind an explicit confirmation, and every use of it is recorded.
**Depends on**: Phase 32 (capability model), Phase 34 (work surface)
**Requirements**: VENUE-01, VENUE-02
**Success Criteria** (what must be TRUE):

  1. A night with no manual action reveals its venue exactly as it does today, at the scheduled moment
  2. A master or an organizer can reveal a venue by hand only after an explicit confirmation that names what is about to become public
  3. A completed manual reveal records who triggered it and when, visible to the staff entitled to see it
  4. A second reveal attempt on a night already revealed changes nothing and says so — the switch stays one-way

**Plans:** 15/15 plans complete

Plans:
- [x] 37-01-PLAN.md — lo schema dell'atto: la tredicesima chiave, l'istante, la traccia append-only e lo scrittore atomico
- [x] 37-02-PLAN.md — la lettura anonima degli indirizzi chiusa, e la funzione che concede per titolo
- [x] 37-03-PLAN.md — [BLOCKING] le due migration applicate in produzione, i tipi allineati
- [x] 37-04-PLAN.md — la finestra di 25 ore in un posto solo, e il pavimento che dice perche'
- [x] 37-05-PLAN.md — la fuga nel payload RSC della lista eventi
- [x] 37-06-PLAN.md — il modello a tre livelli sulla pagina della serata, e il gate di casa riscritto
- [x] 37-07-PLAN.md — il dialogo dell'indizio, e la pagina fuori dalle cache del service worker
- [x] 37-08-PLAN.md — la scheda delle sedi esce dal pubblico, e i tre anelli tornano a concordare
- [x] 37-09-PLAN.md — il cuore condiviso, il cron che completa, e il gate che segue il codice
- [x] 37-10-PLAN.md — l'atto: gate dentro l'azione, rifiuti per valore, e la porta laterale del form
- [x] 37-11-PLAN.md — la conferma che conta le persone, il bottone a tre stati e la traccia
- [x] 37-12-PLAN.md — il redirect dopo il login (todo piegato, commit separato)
- [x] 37-13-PLAN.md — la verifica anonima, la strada positiva di D-37-24 e la prova di cache
- [x] 37-14-PLAN.md — chiusura dei reperti del review: CR-01 alle due estremita', WR-01, WR-05, WR-07

**Wave 1** — 37-01, 37-02, 37-04, 37-12
**Wave 2** *(blocked on Wave 1)* — 37-03 `[BLOCKING]`
**Wave 3** *(blocked on Wave 2)* — 37-05, 37-06
**Wave 4** *(blocked on Wave 3)* — 37-07, 37-08, 37-09
**Wave 5** *(blocked on Wave 4)* — 37-10
**Wave 6** *(blocked on Wave 5)* — 37-11
**Wave 7** *(blocked on Wave 6)* — 37-13

### Phase 38: Live Attendance Freshness

**Goal**: The attendee list updates by itself while the device has network, and never stands between a scan and its verdict.
**Depends on**: Phase 31 (cache merge fix), Phase 32 (channel authorisation), Phase 35 (per-night assignments)
**Requirements**: LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05, LIVE-06, LIVE-07
**Success Criteria** (what must be TRUE):

  1. With the network on, a check-in recorded on one device appears on another device's attendee list without anyone touching either device
  2. A scan is decided from the on-device cache and returns its verdict with the live connection dropped, degraded, or never established at all
  3. Every reconnection triggers a full reload, and an infrequent safety reload runs underneath it, so a connection that dies without saying so cannot leave a stale list
  4. Staff can see whether the list is live and how fresh it is, and can force a reload by hand at any moment
  5. A person not assigned to a night receives no updates for that night, and the door's offline mechanism and the bar's remain separate implementations

**Plans:** 6/7 plans executed

Plans:
- [x] 38-01-PLAN.md — the realtime baseline captured before any migration file exists, the emit-path privileges measured, and P1–P7 written before they are run
- [x] 38-02-PLAN.md — the migration written: the private fan-out helper with its EXECUTE revoked, four AFTER triggers, one SELECT policy on realtime.messages
- [x] 38-03-PLAN.md — one reload entry point that defers behind a scan in progress, the freshness measurement, and the re-armed foreground-only safety reload
- [x] 38-04-PLAN.md — `[BLOCKING]` apply the migration through the Management API migrations endpoint, then measure the boundary as Postgres renders it
- [x] 38-05-PLAN.md — one private channel per night, the resume signal assembled by hand, and the heartbeat — with the door's offline mechanism left ungeneralised
- [x] 38-06-PLAN.md — the counter row becomes the freshness display and the reload control, and the staleness band is derived state rather than a stored notice
- [ ] 38-07-PLAN.md — the evidence: every B/G/S check pasted, and P1–P7 executed with their observations and times

**Wave 1** — 38-01
**Wave 2** *(blocked on Wave 1)* — 38-02, 38-03
**Wave 3** *(blocked on Wave 2)* — 38-04 `[BLOCKING]`, 38-05
**Wave 4** *(blocked on Wave 3)* — 38-06
**Wave 5** *(blocked on Wave 4)* — 38-07

### Phase 39: The Door's Own Address

**Goal**: The door moves to its permanent address in a step of its own — never bundled with the route collapse — and the move is proven on a device with the network off.
**Depends on**: Phase 34 (route collapse complete), Phase 38 (door behaviour settled)
**Requirements**: STAFF-04
**Success Criteria** (what must be TRUE):

  1. The door has one permanent address, reached without a redirect and without a network round trip
  2. A device that installed the door from the previous address still opens a working door after the move, launched from the home screen with the network off
  3. The full door pass — dark room, network off, launch, scan, reconnect, sync — is executed on a device and written down, not asserted

**Plans**: 4 plans, in 3 waves

Plans:
**Wave 1**

- [x] 39-01-PLAN.md — The door pass, written before the code: one document for the dark room, absorbing Phase 38's deferred procedures

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 39-02-PLAN.md — The second address and its bindings: two thin pages on one guarded surface, one map entry, the assertion and the bounce

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 39-03-PLAN.md — D-39-06: the Check-in entry follows the capability the server refuses on, threaded through thirteen mount sites
- [x] 39-04-PLAN.md — The persona routing repair: the door's gates load on the door's new address, with the budget re-measured

### Phase 40: Brand Tokens & Typography

**Goal**: Colour, surface, line and type resolve to one token set, and a release lands whole on every device rather than half-applied.
**Depends on**: Phase 34
**Requirements**: DS-01, DS-02, DS-03, DS-05, DS-06, DS-10
**Success Criteria** (what must be TRUE):

  1. Colour, surface and line resolve to tokens on every converted surface, and no page defines its own brand colour
  2. Format colours appear only where a format is identified, semantic colours come from a set separate from the brand's, and the sunset gradient appears on SunSet surfaces and on no other surface
  3. Display, data and interface each render in exactly one typeface, and figures in a column align on a common width
  4. The brand is written with a normal "e" in page titles, social previews and the installed app name; the reversed glyph appears only inside the logo artwork
  5. After a release, a device that already carried the previous version loads the new styles whole — no device is left serving a mixture of old and new

**Plans**: 5 plans, in 4 waves
**UI hint**: yes

Plans:
**Wave 1**

- [x] 40-01-PLAN.md — The token gate, written before the first token moves: G1, because the build is proven blind to a rename

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 40-02-PLAN.md — The token layer: the artifact's colours adopted, the semantics held apart, the gradient declared once, and the legacy names aliased so nothing goes dark

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 40-03-PLAN.md — Three faces and one document shell: Inter at the root, the local escape deleted, one CSS chunk, and the brand where the OS reads it
- [x] 40-04-PLAN.md — The two gates that hold DS-02 and DS-03, each proven able to go red and blind to an accent fade

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 40-05-PLAN.md — The version boundary: a release purges the document caches, the never-refreshing writer goes, and H1–H3 are written before the release they test

### Phase 41: Shared Primitives & Three-Tier Layout

**Goal**: The shared layer exists — one implementation per recurring pattern, three tiers, finger-sized targets — and is proven on its first eight whole surfaces. The remaining surfaces convert in 41.1 and 41.2 onto this layer, unchanged.

**Depends on**: Phase 40
**Requirements**: DS-07, DS-08, DS-09, RESP-01, RESP-02, RESP-03, RESP-04 — **all seven partially delivered here; RESP-01 closes only after 41.2**

> **The goal was restated on 2026-08-12, and the restatement is the point.** It
> previously read *"…until every surface is workable on phone, tablet and
> desktop"*, which these twelve plans do not achieve and were never going to:
> 141 of 181 `.tsx` files still read a legacy token. Leaving the old wording and
> ticking the phase would have recorded a requirement as closed that says
> *every* surface. The owner took the three-way split on 2026-08-12; the wording
> now describes what this phase delivers, and 41.1/41.2 carry the rest.

**Success Criteria** (what must be TRUE):

  1. A recurring pattern is one shared component with one implementation, and a surface shows it only once that whole surface has been converted — **no surface is left half-converted**. This holds absolutely: it is about what a person meets, and it is as true of eight surfaces as of thirty-four
  2. A dialog opens as a sheet on a phone and as a window on tablet and desktop from a single implementation, and closes with Escape
  3. A dense table reads as cards on a phone instead of scrolling sideways
  4. Every **converted** surface is workable on phone, tablet and desktop; content stops widening on large screens instead of stretching; and **work-surface filters and navigation are visible without opening a menu from tablet width up — this one lands whole here**, for all 24 work pages at once, because the navigation has a single mount point
  5. Touch targets stay finger-sized wherever the input is a finger, large touch screens included — on every converted surface

**What "partially delivered" means here, so it is not read as a hedge:** the
*layer* is complete — the primitives, the three tiers, the tokens, the seven
gates. What is partial is the *manifest of surfaces that have adopted it*: eight
of roughly thirty-four. Criterion 1 is what makes that honest rather than
half-finished — an unconverted surface is untouched, not half-converted.

**Plans**: 17 plans — 12 in 9 waves for the layer and its first eight surfaces, plus 5
gap-closure plans in 2 waves added 2026-08-12 after verification. The remaining
conversion units are **not** covered by any of them; see the note below.

Plans:
- [x] 41-01-PLAN.md — the control token, the two layout variables, the pointer variant, pinch-zoom
- [x] 41-02-PLAN.md — G6 breakpoints and G7 no-viewport-read, the two gates with no exception
- [x] 41-03-PLAN.md — Button/Chip, and the navigation spine in two tiers with the door's wrapper
- [x] 41-04-PLAN.md — the toast off its third hard-coded 5rem, and FormatMarker
- [x] 41-05-PLAN.md — PageShell/Card/PageTitle, /payment/callback, and the conversion manifest
- [x] 41-06-PLAN.md — Input/Textarea/Select on a boundary that measures, and the three (auth) screens
- [x] 41-07-PLAN.md — G1 conversion and G4 container, over the manifest
- [x] 41-08-PLAN.md — Skeleton's first importer ever: /gallery and /admin/members/register
- [x] 41-09-PLAN.md — the Dialog primitive, /admin/formats, and G2
- [x] 41-10-PLAN.md — DataTable, Checkbox, /admin/members, and G3
- [x] 41-11-PLAN.md — G5 touch targets, proven red and proven green on MemberTable — or not written
- [x] 41-12-PLAN.md — `npm run verify`, and 41-RELEASE-PASS.md with H41-1 … H41-6
- [x] 41-13-PLAN.md — CR-01: the focus form stops reserving a navigation its four surfaces never mount
- [x] 41-14-PLAN.md — verify-all's reconciliation, from an identity that cannot fail to a refusal that can
- [x] 41-15-PLAN.md — G5's exemption 2a, from a file-wide blanket to ten declared elements with ten reasons
- [x] 41-16-PLAN.md — G2's overlay matcher, keyed on the shape of an overlay rather than on one z rung
- [ ] 41-17-PLAN.md — G4 check E: the clearance a surface reserves must match the navigation it mounts

> **Gap closure, 2026-08-12.** `41-VERIFICATION.md` returned `gaps_found` with one
> blocking gap — CR-01, a live layout regression on `/login`, `/register`,
> `/set-password` and `/payment/callback` that no gate could see — and `41-REVIEW.md`
> returned three gate-integrity defects alongside it. Plans 41-13…41-17 close exactly
> those four items and nothing else; the owner fixed the scope on 2026-08-12 and routed
> the login error message, the payment-callback error string and `CreateSeriesModal`'s
> reachability test to a phase of their own, since all three decide what the product
> tells someone about their account or their money. **None of the seven requirements
> closes here:** all remain PARTIAL, and RESP-01 closes only after 41.2. Six human
> observations (H41-1…H41-6) stay owed, and 41-13 adds a seventh.

> **Scope note, 2026-08-12 — split decided.** The seven requirements are delivered as a
> system plus a declared manifest of converted surfaces. **141 of 181 `.tsx` files still
> read a legacy token and 74 carry a raw palette colour**; these twelve plans convert the
> spine plus eight whole surfaces. The remaining ~26 conversion units go to **41.1** (the
> work group) and **41.2** (public, member, and the three knots). **Owner decision,
> 2026-08-12: three-way split accepted**, on the ground that the riskiest surfaces — the
> bar, where money and venue secrecy meet on one page; the 1 668-line event form; the
> refunds — deserve a phase that looks at them directly, rather than arriving as the tail
> of a thirty-plan phase, which is exactly where attention drops.

**UI hint**: yes

### Phase 41.1: Work-Surface Conversion

**Goal**: The 22 remaining work pages convert onto the layer Phase 41 built, and the gates that shipped as ratchets stop being ratchets for the work group.
**Depends on**: Phase 41
**Requirements**: DS-07, DS-09, RESP-01, RESP-02, RESP-03 *(continued from Phase 41)*
**Success Criteria** (what must be TRUE):

  1. Every page under the work surface has converted whole, and the `(work)` layout shim Phase 41 wrote to protect the unconverted ones is **deleted**, not left behind
  2. The five analytics tables and the finance transaction list read as cards on a phone, and G3's `REMAINING` list is empty for the work group
  3. No file under the work surface reads a legacy token name or carries a raw palette colour
  4. G6's `REMAINING` list is empty for the work group — no `sm:`, `xl:` or `2xl:` survives there

**Plans**: TBD
**UI hint**: yes — inherits Phase 41's UI-SPEC; no new contract

> Includes the review surface, the guest list, the events surface, and
> `ReviewListClient.tsx`, which **stays a table** by D-41-16 and whose exemption
> must survive this phase rather than be quietly converted.

### Phase 41.2: Public, Member and Money Surfaces

**Goal**: The public and member surfaces convert, and the three knots — where a mistake costs money or reveals an address — are taken deliberately and on their own.
**Depends on**: Phase 41.1
**Requirements**: DS-07, DS-08, RESP-01, RESP-02, RESP-03 *(RESP-01 closes here, and only here)*
**Success Criteria** (what must be TRUE):

  1. The public and member surfaces have each converted whole
  2. **The three knots are converted with their domain gates held, not despite them:** the bar and its tokens carry money **and** the venue's secrecy on the same pages; the event form is 1 668 lines; the refunds move money. A visual conversion here is Critical, not cosmetic
  3. `RevealVenueDialog` adopts the Dialog primitive — deliberately last, because the reveal is **monotone**: once the mail is sent the address is public and there is no undo
  4. Every `REMAINING` list in every ratchet gate is empty, and the gates become the absolutes the UI-SPEC wrote them as
  5. **RESP-01 is finally true in its own words** — *every* surface is usable on phone, tablet and desktop — and is closed by the written human pass, since no script can close it

**Plans**: TBD
**UI hint**: yes — inherits Phase 41's UI-SPEC; no new contract

> **Why the knots are last and together.** They are the only surfaces in the
> conversion where the failure is not visual: a wrong query on the bar's pages
> can show an address before its reveal, and a refund path is money. Phase 41's
> own plans deliberately kept `RevealVenueDialog` away from the Dialog
> primitive's first use for the same reason — *"prove it on the hardest correct
> file"* is not *"convert the most dangerous surface first."*

### Phase 42: Scanner Conversion

**Goal**: The scanner is the last surface to take the visual system, and it takes colour, contrast and type only — its behaviour is a safety surface and is not touched.
**Depends on**: Phase 39 (door corrections shipped and used at a real night), Phase 41
**Requirements**: DS-04, RESP-05
**Success Criteria** (what must be TRUE):

  1. Accept and refuse stay saturated and unmistakable at arm's length in a dark room, and each carries a second channel besides colour
  2. The viewfinder centres at every width instead of stretching, on phone, tablet and desktop
  3. Every scanner behaviour — flash timing, haptics, auto-return, torch, offline verdict, undo — is unchanged from before the conversion, verified by running the door pass again on a device

**Plans**: TBD
**UI hint**: yes

## Progress

*Rows are in execution order, not numeric order — see the note under Phases.*

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 31. Live Defects at the Door and the Bar | 13/13 | Complete   | 2026-08-06 |
| 32. Capability Model in the Database | 11/11 | Complete    | 2026-08-06 |
| 33. Server Data-Access Layer | 14/14 | Complete    | 2026-08-07 |
| 43. Role Model & Account Creation | 15/15 | Complete   | 2026-08-08 |
| 35. Per-Night Assignments | 22/22 | Complete   | 2026-08-09 |
| 34. One Work Surface | 17/17 | Complete   | 2026-08-10 |
| 36. Formats & Series Numbering | 14/14 | Complete   | 2026-08-10 |
| 37. Manual Venue Reveal | 15/15 | Complete   | 2026-08-11 |
| 38. Live Attendance Freshness | 6/7 | In Progress|  |
| 39. The Door's Own Address | 4/4 | Complete   | 2026-08-11 |
| 40. Brand Tokens & Typography | 5/5 | Complete   | 2026-08-11 |
| 41. Shared Primitives & Three-Tier Layout | 16/17 | In Progress|  |
| 42. Scanner Conversion | 0/TBD | Not started | - |

*`Executed*` = tutti i piani hanno un SUMMARY su disco, **non** che la fase sia deployata o verificata. Per la 37: il ramo e' 219 commit avanti a `origin/main`, la seconda migration e' applicata a zero, e undici voci `human_needed` restano aperte (`37-13-SUMMARY.md`).

## Decisions Fixed Before Planning

These were decided by the project owner and are not re-opened at plan time:

| Decision | Applies to |
|---|---|
| Live freshness uses a **push channel**, not polling — with a mandatory full reload on every reconnection and an infrequent safety reload underneath | Phase 38 |
| Undoing a check-in requires a **supervising capability**; a person assigned to the door for one night cannot undo unless they are also an organizer | Phase 35 |
| The venue reveal stays scheduled **plus** a manual path for master and organizer, behind confirmation and recorded | Phase 37 |
| A staff role **implies `approved`, enforced by the database** — and the baseline harness keeps the ability to seed the four personas that rule forbids | Phase 43 |
| `door.operate` keeps `requires_approved = false`; it is not redundant with the constraint above and is not removed as tidying | Phase 43 |
| **Phase numbers are identity, not position.** No phase is renumbered to match an ordering decision taken after it was cited | All phases |
| The interface stays **English only** — no translation work in this milestone | All phases |

## Ordering Constraints

Not preferences — each one has a failure mode behind it.

- **Live defects first.** They exist in production today and are independent of the new architecture. The attendee-cache merge fix (FIX-05, FIX-06) must land before Phase 38: the live channel's whole purpose is to run that refresh constantly, which turns a rare race into the normal case.
- **Database before application.** The capability definition (32) exists before the data-access layer (33) calls it, before the role model (43) adds a fourth role to it, before assignment policies (35) reuse it, before the route map (34) maps to it, and before the channel authorisation (38) reuses it a third time. One definition, several callers, only works if the definition comes first.
- **The role model and assignments before the route collapse.** Phase 34 renders one surface from what the viewer is entitled to. Built before the fourth role (43) and before per-night assignments (35) exist, it would be built once for three roles and again for four roles plus assignments — the same "build it twice" cost the collapse exists to remove, relocated rather than avoided.
- **Route collapse before formats and design.** Otherwise each is built twice, once per duplicated tree — the exact cost the collapse exists to remove.
- **The door is not part of routing.** Its address moves in Phase 39, alone, because a redirect needs a network the door is designed not to need.
- **The scanner is converted last** (42), and only after the door's behavioural corrections (31, 39) have shipped and been used at a real night.

### Phase 44: The Production Calendar Comes Inside

**Goal**: The production calendar stops living outside the product. A night's format, series number, venue state and editorial anchors are readable in the app by the people entitled to them — imported from the local material into the database, and never through the repository.
**Depends on**: Phase 32 (capability model), Phase 36 (format model and series numbering), Phase 41 (shared primitives, so the surface lands in the finished visual system rather than being converted afterwards)
**Requirements**: PROD-01
**Success Criteria** (what must be TRUE):

  1. A night is readable in the product carrying its format, its series number, its venue state and its editorial anchors — nobody opens a document outside the app to know what is on
  2. The material reaches the database **without passing through the repository**: no venue under negotiation, no unannounced date and no line-up appears in a migration, a seed, a fixture, a test or a planning document
  3. A night's editorial pieces are **derived** from its date and format rather than typed in — listing at −2, tonight on the day, recap and podcast cover at +4, timetable at −1 for the night — and the after movie is anchored to the **next edition's listing**, never to a day count
  4. The calendar is reachable only by someone the capability model admits, and the middleware, the page guard and the row-level policy ask the same question of the same definition
  5. Moving a night recomputes everything downstream of it, and a series progressivo is appended, never renumbered

**Plans**: TBD
**UI hint**: yes

### Phase 45: Production Sections, Section by Section

**Goal**: Each production section is entitled separately, because they do not carry the same risk — scouting holds open negotiations, the visual system holds nothing secret. Holding one section grants no other.
**Depends on**: Phase 44
**Requirements**: PROD-02
**Success Criteria** (what must be TRUE):

  1. Entitlement is **per section**, not per role: a viewer holding one section is refused the others, and the refusal comes from the row-level policy — not from the navigation hiding a link
  2. A space in the scouting section carries its stage — mapped, verified, contacted, acquired — and a stage that is not `acquired` is visible as such wherever the space is named
  3. A section whose content is not yet written **declares the emptiness** instead of filling it, and no surface implies a decision the owner has not taken
  4. Every section's read path is proven refused by a session that lacks its capability, exercised with a real role rather than a service key

**Plans**: TBD
**UI hint**: yes

---
*Last updated: 2026-08-06 — Phase 43 added (role model and account creation); execution order set to 33 → 43 → 35 → 34 → 36 → …, with no phase renumbered*
