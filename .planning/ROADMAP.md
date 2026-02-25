# Roadmap: Resonate

**Created:** 2026-02-24
**Depth:** Comprehensive
**Phases:** 7
**Total v1 Requirements:** 45

## Phases

- [x] **Phase 1: UI Foundation & English Migration** - Translate site to English, apply brand identity, fix UI bugs
- [x] **Phase 2: Schema & RBAC Foundation** - Migrate to role-based access control with master/organizer/member roles
- [x] **Phase 3: Referral & Approval System** - Referral links, auto-approval, pending member flow, admin approval UI
- [x] **Phase 4: Branded Emails** - Resonate-branded confirmation and notification emails via React Email + Resend
- [x] **Phase 5: Event Management** - Replace mock data with real Supabase events, organizer CRUD, event display features
- [ ] **Phase 6: Ticketing & Payments** - Ticket tiers, SumUp checkout, payment confirmation, organizer sales view
- [ ] **Phase 7: Event Media** - Member photo/video uploads for attended events, gallery integration

## Phase Details

### Phase 1: UI Foundation & English Migration
**Goal**: The platform presents as a polished, English-language branded experience
**Depends on**: Nothing (first phase)
**Requirements**: UIBR-01, UIBR-02, UIBR-03, UIBR-04, UIBR-05, UIBR-08
**Success Criteria** (what must be TRUE):
  1. Every page, label, error message, and placeholder displays in English with no remaining Italian text
  2. All routes use English paths (/events, /register, /gallery, /attendance) and old Italian paths redirect correctly
  3. The Orbitron font renders as the primary typeface on every page
  4. The homepage shows the Resonate logo image instead of a text heading
  5. A logged-in member viewing an event page sees no "diventa membro" prompt
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md -- Brand foundation: Orbitron font, logo asset, homepage redesign
- [x] 01-02-PLAN.md -- English migration: route renames, full translation, redirects
- [x] 01-03-PLAN.md -- Bug fixes: auth-aware event page, password validation

### Phase 2: Schema & RBAC Foundation
**Goal**: The platform enforces role-based access for master, organizer, and member roles
**Depends on**: Phase 1
**Requirements**: ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06, ROLE-07
**Success Criteria** (what must be TRUE):
  1. The profile table uses a `role` enum (master, organizer, member) instead of `is_admin` boolean, and a `status` enum (pending, approved, rejected)
  2. A dedicated master admin account exists and can access all admin routes
  3. The master user can assign or revoke the organizer role for any member
  4. Each role sees only its relevant navigation items and page actions (master sees everything, organizer sees event management, member sees browse/RSVP/profile)
  5. Unauthenticated or unauthorized requests to protected routes are blocked by middleware
**Plans:** 3/3 plans complete

Plans:
- [x] 02-01-PLAN.md -- Schema migration: role/status columns, RLS rewrite, master email detection
- [x] 02-02-PLAN.md -- Middleware RBAC: route enforcement, role-aware navigation, pending dashboard
- [x] 02-03-PLAN.md -- Admin member management: master role actions, organizer member view

### Phase 3: Referral & Approval System
**Goal**: New members join through referral (instant access) or application (pending approval), creating the trust-gated community
**Depends on**: Phase 2 (requires role and status fields, RBAC enforcement)
**Requirements**: REFR-01, REFR-02, REFR-03, REFR-04, REFR-05, REFR-06, APPR-01, APPR-02, APPR-03
**Success Criteria** (what must be TRUE):
  1. Every approved member has a unique referral link visible on their profile that they can copy
  2. A user who registers via a valid referral link is immediately set to "approved" status and can RSVP and buy tickets
  3. A user who registers without a referral link is set to "pending" status and can only browse events (no RSVP, no ticket purchase, no media upload)
  4. Master users and organizers see a pending members list and can approve or reject each one
  5. The referral relationship (who invited whom) is stored and visible in admin views
**Plans**: 3/3 plans complete

Plans:
- [x] 03-01-PLAN.md -- Referral data foundation: referred_by column, referral-aware trigger, registration ?ref capture
- [x] 03-02-PLAN.md -- Referral link display: CopyReferralLink component on dashboard and membership card
- [x] 03-03-PLAN.md -- Approval queue & admin UI: status tabs, bulk approve/reject, expandable detail rows, organizer support

### Phase 4: Branded Emails
**Goal**: All transactional emails reflect the Resonate brand identity
**Depends on**: Phase 3 (approval notifications require the approval system to exist)
**Requirements**: UIBR-06, UIBR-07, APPR-04
**Success Criteria** (what must be TRUE):
  1. The registration confirmation email displays the Resonate logo, brand colors, and styled layout
  2. When a pending member is approved, they receive a branded email notifying them of their new access
  3. When a pending member is rejected, they receive a branded email with appropriate messaging
**Plans**: 2/2 plans complete

Plans:
- [x] 04-01-PLAN.md -- Email infrastructure: React Email packages, shared EmailLayout, sendEmail utility, registration confirmation template
- [x] 04-02-PLAN.md -- Approval/rejection emails: branded templates, fire-and-forget integration into server actions

### Phase 5: Event Management
**Goal**: Organizers can create and manage real events, and members browse a live event calendar
**Depends on**: Phase 2 (organizer role required for event creation)
**Requirements**: EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06, EVNT-07
**Success Criteria** (what must be TRUE):
  1. An organizer can create an event with title, description, date/time, location, secret location toggle, lineup, cover image, and capacity -- and it appears on the events page
  2. An organizer can edit their own events and see changes reflected immediately
  3. The events page displays real Supabase data (no mock data) with upcoming events and a past events archive
  4. An event detail page shows remaining capacity ("X spots left") or "Sold out" when full
  5. A secret location is hidden on the event page until the viewing member has a ticket for that event
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md -- Data foundation: migration (created_by, RLS, storage), TypeScript types, slugify utility, event CRUD server actions
- [x] 05-02-PLAN.md -- Organizer/admin event management UI: TagInput, EventForm, organizer events pages, admin events page
- [x] 05-03-PLAN.md -- Public event pages: replace mock data with real queries, tab UI, capacity display, secret location CTA

### Phase 6: Ticketing & Payments
**Goal**: Members can purchase tickets through SumUp and organizers can track sales
**Depends on**: Phase 5 (events must exist to sell tickets for), Phase 3 (only approved members can buy)
**Requirements**: TICK-01, TICK-02, TICK-03, TICK-04, TICK-05, TICK-06, TICK-07
**Success Criteria** (what must be TRUE):
  1. An organizer can define multiple ticket tiers (e.g. Early Bird, Regular, VIP) with name, price, and quantity for each event
  2. An approved member can select a tier and complete payment through SumUp hosted checkout
  3. After successful payment, the member receives a ticket with a unique QR code (separate from membership QR)
  4. An organizer can view a ticket sales dashboard showing tier breakdown, total revenue, and buyer list for their events
  5. Ticket quantity is enforced -- a tier at capacity cannot be purchased, and concurrent purchases cannot oversell
**Plans**: 4 plans

Plans:
- [x] 06-01-PLAN.md -- Data foundation: ticketing tables, RLS policies, reserve_ticket RPC, TypeScript types, SumUp client, email extension
- [x] 06-02-PLAN.md -- Ticket tier management: CRUD server actions, organizer tier management page, event list integration
- [x] 06-03-PLAN.md -- Purchase flow: SumUp checkout, webhook handler, QR generation, confirmation page/email, secret location reveal, pending guard
- [ ] 06-04-PLAN.md -- Sales dashboard and My Tickets: organizer/admin sales pages, shared SalesDashboard component, dashboard tickets section

### Phase 7: Event Media
**Goal**: Members can share photos and videos from events they attended, building the community gallery
**Depends on**: Phase 5 (events and attendance records must exist)
**Requirements**: MDIA-01, MDIA-02, MDIA-03, MDIA-04, MDIA-05, MDIA-06
**Success Criteria** (what must be TRUE):
  1. An approved member who was checked in at an event can upload photos (JPEG/PNG/WebP, up to 10MB) and videos (MP4/MOV, up to 100MB) for that event
  2. A member who was NOT checked in at an event cannot upload media for it
  3. Uploaded media appears in a gallery section on the event detail page
  4. Uploaded media also appears on the uploading member's profile page, tagged by event
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. UI Foundation & English Migration | 3/3 | Complete | 2026-02-24 |
| 2. Schema & RBAC Foundation | 3/3 | Complete    | 2026-02-24 |
| 3. Referral & Approval System | 3/3 | Complete    | 2026-02-24 |
| 4. Branded Emails | 2/2 | Complete    | 2026-02-25 |
| 5. Event Management | 3/3 | Complete | 2026-02-25 |
| 6. Ticketing & Payments | 1/4 | In progress | - |
| 7. Event Media | 0/? | Not started | - |

## Coverage

| Category | Requirements | Phase |
|----------|-------------|-------|
| UI & Branding | UIBR-01, UIBR-02, UIBR-03, UIBR-04, UIBR-05, UIBR-08 | Phase 1 |
| UI & Branding (emails) | UIBR-06, UIBR-07 | Phase 4 |
| Roles & Permissions | ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06, ROLE-07 | Phase 2 |
| Referral | REFR-01, REFR-02, REFR-03, REFR-04, REFR-05, REFR-06 | Phase 3 |
| Approval | APPR-01, APPR-02, APPR-03 | Phase 3 |
| Approval (email) | APPR-04 | Phase 4 |
| Event Management | EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06, EVNT-07 | Phase 5 |
| Ticketing & Payments | TICK-01, TICK-02, TICK-03, TICK-04, TICK-05, TICK-06, TICK-07 | Phase 6 |
| Event Media | MDIA-01, MDIA-02, MDIA-03, MDIA-04, MDIA-05, MDIA-06 | Phase 7 |

**Mapped: 45/45** -- all v1 requirements covered, no orphans.

## Dependency Graph

```
Phase 1 (UI Foundation)
  |
  v
Phase 2 (RBAC) --------+
  |                     |
  v                     |
Phase 3 (Referral)      |
  |                     |
  v                     v
Phase 4 (Emails)    Phase 5 (Events)
                      |       |
                      v       v
                  Phase 6   Phase 7
                 (Tickets)  (Media)
```

Note: Phases 5-7 depend on Phase 2 (RBAC). Phases 6 and 7 depend on Phase 5 (events). Phase 6 also depends on Phase 3 (approved member status). Phase 7 is independent of Phase 6. Phases 6 and 7 can theoretically run in parallel after Phase 5 completes.

---
*Roadmap created: 2026-02-24*
