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
on top of it and header trust ends there; only then do the duplicated route trees
collapse into one, because per-night assignments, the format model and the design
conversion would otherwise each be built twice. The door is never bundled with
the routing work: a redirect needs a network the door is designed not to need, so
its address moves in a step of its own, verified on a device with the network
off. The design track runs last, and the scanner is the last surface it touches —
a visual regression there is a safety issue, not a cosmetic one.

**Milestone numbering continues from v1.4:** phases run 31 → 42.

## Phases

**Phase Numbering:**

- Integer phases (31, 32, 33): Planned milestone work
- Decimal phases (32.1, 32.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 31: Live Defects at the Door and the Bar** - Correct the nine defects present in production today, before anything is built on top of them (completed 2026-08-06)
- [ ] **Phase 32: Capability Model in the Database** - One definition of every permission, evaluated identically by pages, actions and row-level policies
- [ ] **Phase 33: Server Data-Access Layer** - Identity and capability resolved from the session in one server-only place; no surface trusts a request header
- [ ] **Phase 34: One Work Surface** - The duplicated admin and organizer trees become a single capability-driven surface; the door is deliberately untouched
- [ ] **Phase 35: Per-Night Assignments** - What a person can do on one night is granted for that night alone, separate from role and separate from public credit
- [ ] **Phase 36: Formats & Series Numbering** - Each night carries its format and stored series number; the events surface filters to one format
- [ ] **Phase 37: Manual Venue Reveal** - The scheduled reveal stays the normal path, with a confirmed and recorded manual path for master and organizer
- [ ] **Phase 38: Live Attendance Freshness** - The attendee list updates by itself while the network is there, and never stands between a scan and its verdict
- [ ] **Phase 39: The Door's Own Address** - The door moves to its permanent address in a step of its own, verified with the network off
- [ ] **Phase 40: Brand Tokens & Typography** - Colour, surface, line and type come from one token set, released whole
- [ ] **Phase 41: Shared Primitives & Three-Tier Layout** - Recurring patterns become shared components that change form by device, adopted surface by surface
- [ ] **Phase 42: Scanner Conversion** - The scanner takes the visual system last, with its behaviour untouched

## Phase Details

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

- [ ] 32-05-PLAN.md — The comparator and its two-transformation whitelist

**Wave 5** *(blocked on 32-05)*

- [ ] 32-06-PLAN.md — The capability model: private schema, catalogue, grants, one resolver, one exposed wrapper

**Wave 6** *(blocked on 32-06)*

- [ ] 32-07-PLAN.md — The policy cutover: 45 predicate call sites replaced in place
- [ ] 32-08-PLAN.md — The resolver, the middleware's four rules, and one reference conversion

**Wave 7** *(blocked on 32-07)*

- [ ] 32-09-PLAN.md — CAP-06: the 26-row review and the wrapping migration

**Wave 8** *(blocked on 32-08, 32-09)*

- [ ] 32-10-PLAN.md — The four-sided capability key check the build cannot perform

**Wave 9** *(blocked on 32-10)*

- [ ] 32-11-PLAN.md — The phase gate: final re-capture, the CAP-04 demonstration, 32-VERIFICATION.md

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

### Phase 34: One Work Surface

**Goal**: The duplicated admin and organizer route trees become a single work surface that shows the viewer what they are entitled to see, with old addresses still working — and with the door deliberately left where it is.
**Depends on**: Phase 33
**Requirements**: CAP-02, STAFF-01, STAFF-02, STAFF-03
**Success Criteria** (what must be TRUE):

  1. Each work surface exists at one address and renders according to what the viewer is entitled to see, not according to which tree they arrived from
  2. Addresses under the previous `/admin/*` and `/organizer/*` prefixes land on the new surface through permanent redirects, so links and bookmarks already sent still work
  3. A navigation entry appears only where the matching server-side check also passes — typing the address of a hidden entry is refused, not rendered
  4. A capability that exists in the database but is mapped to no route fails the production build

**Plans**: TBD
**UI hint**: yes

### Phase 35: Per-Night Assignments

**Goal**: What a person can do on one night is granted for that night alone — separate from their account-wide role, and separate from public credit, which grants nothing.
**Depends on**: Phase 34
**Requirements**: ASSIGN-01, ASSIGN-02, ASSIGN-03, ASSIGN-04, ASSIGN-05, ASSIGN-06, ASSIGN-07, ASSIGN-08
**Success Criteria** (what must be TRUE):

  1. A person assigned to one night as door, photo or organizer can use that night's tools and nothing changes for them on any other night; the scanner resolves that assignment once when it opens rather than at every scan
  2. Access to a night's tools does not outlive the night, and revoking an assignment is one action that is recorded rather than deleted and never strands a scan already queued offline
  3. Nobody can grant an assignment to themselves
  4. Undoing a check-in is refused for a person assigned only to the door for that night, and allowed for an organizer
  5. A dj or photographer credit can be created for a person who has no account, grants access to no tool, and creates no account

**Plans**: TBD
**UI hint**: yes

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

**Plans**: TBD
**UI hint**: yes

### Phase 37: Manual Venue Reveal

**Goal**: The scheduled reveal remains the normal path; a manual path exists for master and organizer, behind an explicit confirmation, and every use of it is recorded.
**Depends on**: Phase 32 (capability model), Phase 34 (work surface)
**Requirements**: VENUE-01, VENUE-02
**Success Criteria** (what must be TRUE):

  1. A night with no manual action reveals its venue exactly as it does today, at the scheduled moment
  2. A master or an organizer can reveal a venue by hand only after an explicit confirmation that names what is about to become public
  3. A completed manual reveal records who triggered it and when, visible to the staff entitled to see it
  4. A second reveal attempt on a night already revealed changes nothing and says so — the switch stays one-way

**Plans**: TBD

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

**Plans**: TBD

### Phase 39: The Door's Own Address

**Goal**: The door moves to its permanent address in a step of its own — never bundled with the route collapse — and the move is proven on a device with the network off.
**Depends on**: Phase 34 (route collapse complete), Phase 38 (door behaviour settled)
**Requirements**: STAFF-04
**Success Criteria** (what must be TRUE):

  1. The door has one permanent address, reached without a redirect and without a network round trip
  2. A device that installed the door from the previous address still opens a working door after the move, launched from the home screen with the network off
  3. The full door pass — dark room, network off, launch, scan, reconnect, sync — is executed on a device and written down, not asserted

**Plans**: TBD

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

**Plans**: TBD
**UI hint**: yes

### Phase 41: Shared Primitives & Three-Tier Layout

**Goal**: Recurring patterns become shared components that change form by device, adopted one whole surface at a time until every surface is workable on phone, tablet and desktop.
**Depends on**: Phase 40
**Requirements**: DS-07, DS-08, DS-09, RESP-01, RESP-02, RESP-03, RESP-04
**Success Criteria** (what must be TRUE):

  1. A recurring pattern is one shared component with one implementation, and a surface shows it only once that whole surface has been converted — no surface is left half-converted
  2. A dialog opens as a sheet on a phone and as a window on tablet and desktop from a single implementation, and closes with Escape
  3. A dense table reads as cards on a phone instead of scrolling sideways
  4. Every converted surface is workable on phone, tablet and desktop; content stops widening on large screens instead of stretching; and work-surface filters and navigation are visible without opening a menu from tablet width up
  5. Touch targets stay finger-sized wherever the input is a finger, large touch screens included

**Plans**: TBD
**UI hint**: yes

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

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 31. Live Defects at the Door and the Bar | 13/13 | Complete   | 2026-08-06 |
| 32. Capability Model in the Database | 4/11 | In Progress|  |
| 33. Server Data-Access Layer | 0/TBD | Not started | - |
| 34. One Work Surface | 0/TBD | Not started | - |
| 35. Per-Night Assignments | 0/TBD | Not started | - |
| 36. Formats & Series Numbering | 0/TBD | Not started | - |
| 37. Manual Venue Reveal | 0/TBD | Not started | - |
| 38. Live Attendance Freshness | 0/TBD | Not started | - |
| 39. The Door's Own Address | 0/TBD | Not started | - |
| 40. Brand Tokens & Typography | 0/TBD | Not started | - |
| 41. Shared Primitives & Three-Tier Layout | 0/TBD | Not started | - |
| 42. Scanner Conversion | 0/TBD | Not started | - |

## Decisions Fixed Before Planning

These were decided by the project owner and are not re-opened at plan time:

| Decision | Applies to |
|---|---|
| Live freshness uses a **push channel**, not polling — with a mandatory full reload on every reconnection and an infrequent safety reload underneath | Phase 38 |
| Undoing a check-in requires a **supervising capability**; a person assigned to the door for one night cannot undo unless they are also an organizer | Phase 35 |
| The venue reveal stays scheduled **plus** a manual path for master and organizer, behind confirmation and recorded | Phase 37 |
| The interface stays **English only** — no translation work in this milestone | All phases |

## Ordering Constraints

Not preferences — each one has a failure mode behind it.

- **Live defects first.** They exist in production today and are independent of the new architecture. The attendee-cache merge fix (FIX-05, FIX-06) must land before Phase 38: the live channel's whole purpose is to run that refresh constantly, which turns a rare race into the normal case.
- **Database before application.** The capability definition (32) exists before the data-access layer (33) calls it, before the route map (34) maps to it, before assignment policies (35) reuse it, and before the channel authorisation (38) reuses it a third time. One definition, three callers, only works if the definition comes first.
- **Route collapse before assignments, formats and design.** Otherwise each is built twice, once per duplicated tree — the exact cost the collapse exists to remove.
- **The door is not part of routing.** Its address moves in Phase 39, alone, because a redirect needs a network the door is designed not to need.
- **The scanner is converted last** (42), and only after the door's behavioural corrections (31, 39) have shipped and been used at a real night.

---
*Last updated: 2026-08-05 — milestone v1.5 roadmap created*
