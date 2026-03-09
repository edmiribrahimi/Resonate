# Roadmap: Resonate

## Completed Milestones

- [x] **v1.0** -- Trust-gated music events community: RBAC, referral/approval, SumUp ticketing, event media, branded emails (7 phases, 22 plans, 45 requirements) -- [archive](.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1** -- SumUp embedded checkout + drink ordering system: embedded payments, drink menu CRUD, token redemption with anti-fraud, public QR menu for guests (5 phases, 9 plans, 18 requirements) -- [archive](.planning/milestones/v1.1-ROADMAP.md)
- [x] **v1.2** -- SumUp API deep integration: official SDK, admin finance dashboard, refunds, APMs (Satispay/MyBank/Apple Pay/Google Pay), menu closing + auto-refund (7 phases, 12 plans, 33 requirements) -- [archive](.planning/milestones/v1.2-ROADMAP.md)

## Current Milestone: v1.3 Refinement & Intelligence

**Goal:** Transform Resonate from functional to polished -- comprehensive analytics for data-driven decisions, elegant UI refinements, guest list management, and streamlined navigation.

**Requirements:** 52 total across 4 categories
**Granularity:** Fine

## Phases

- [x] **Phase 20: Navigation Consolidation** - Streamline bottom nav to 3-4 tabs with role-aware Account page as management hub
- [ ] **Phase 21: Layout Elegance** - Motion library integration with enter animations, skeletons, toasts, and micro-interactions
- [ ] **Phase 22: Analytics Infrastructure & Event Metrics** - PostHog setup, trackEvent utility, analytics_events table, per-event revenue/sales/attendance views
- [ ] **Phase 23: Analytics Dashboard & Cross-Event Insights** - Admin KPI dashboard, per-member spend, drink popularity, repeat attendees, referral chains, event comparison
- [ ] **Phase 24: Guest List Management** - Per-event guest lists with auto-registration, auto-approval, free tickets, invitation emails, CSV import

## Phase Details

### Phase 20: Navigation Consolidation
**Goal:** Members and staff navigate the app through a clean 3-4 tab structure with Account as the unified hub for personal settings and management tools
**Depends on:** Nothing (first phase of v1.3)
**Requirements:** NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06, NAV-07, NAV-08
**Success Criteria** (what must be TRUE):
  1. Member sees exactly 3 bottom tabs (Events, Gallery, Account); organizer/master sees 4 tabs (Events, Gallery, Check-in, Account)
  2. Account page shows "My Stuff" section for all users and "Management" section (with quick-stats cards and expand/collapse) only for organizer/master roles
  3. Organizer/master can reach the Check-in page in one tap from any screen, and the Check-in page shows a unified attendee list with name search and QR scan
  4. All admin and organizer routes use a single unified StaffNav component with clear visual separation between personal and management sections
**Plans:** 3/3 plans complete

Plans:
- [x] 20-01-PLAN.md -- StaffNav + MobileNav simplification + roles.ts update (NAV-01, NAV-03, NAV-08)
- [x] 20-02-PLAN.md -- Account page restructure with My Stuff + Management sections (NAV-02, NAV-05, NAV-06, NAV-07)
- [x] 20-03-PLAN.md -- Check-in page enhancement with attendee list and name search (NAV-04)

### Phase 21: Layout Elegance
**Goal:** Every interaction in the app feels responsive and polished through consistent animations, loading states, and feedback -- while respecting user motion preferences
**Depends on:** Phase 20 (animations apply to final nav structure)
**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11, UI-12
**Success Criteria** (what must be TRUE):
  1. All page components animate in on load (fade + translateY) and list items appear with staggered delays; users with prefers-reduced-motion see no animations
  2. Every async data load (events, members, drinks, analytics) shows skeleton placeholders instead of blank space or layout shift
  3. User actions (save, delete, purchase, redeem) show toast notifications that slide in and auto-dismiss, and all buttons/cards give tactile press feedback (scale on tap/hover)
  4. Content sections animate into view on scroll, dark mode elements have subtle ambient glow, and cards have hover elevation on desktop / press feedback on mobile
  5. Analytics KPI cards (when built in Phase 22-23) have number counting-up micro-interactions
**Plans:** TBD

### Phase 22: Analytics Infrastructure & Event Metrics
**Goal:** Organizers can see comprehensive per-event performance data (revenue, ticket velocity, drink sales, attendance, token lifecycle) and the app silently tracks user behavior via PostHog
**Depends on:** Phase 21 (animation components for dashboard UI, skeleton loading patterns)
**Requirements:** ANLY-01, ANLY-02, ANLY-03, ANLY-04, ANLY-05, ANLY-06, ANLY-08
**Success Criteria** (what must be TRUE):
  1. PostHog tracks pageviews and user behavior on EU instance; events fire on page load, navigation, and key user actions (purchase, redeem, RSVP)
  2. Organizer can open any event and see revenue summary (gross/net ticket + drink sales), ticket sales velocity chart (daily), and drink sales breakdown with per-item detail
  3. Organizer can see attendance rate (sold vs checked-in) and expired/refunded token rate (redeemed vs wasted percentage) for any event
  4. Admin can view member growth over time with weekly/monthly granularity showing referral vs organic split
**Plans:** TBD

### Phase 23: Analytics Dashboard & Cross-Event Insights
**Goal:** Admin has a comprehensive KPI dashboard with cross-event intelligence -- member spending profiles, drink popularity, repeat attendance, referral effectiveness, and side-by-side event comparison
**Depends on:** Phase 22 (analytics infrastructure, PostHog, per-event views)
**Requirements:** ANLY-07, ANLY-09, ANLY-10, ANLY-11, ANLY-12, ANLY-13, ANLY-14, ANLY-15, ANLY-16
**Success Criteria** (what must be TRUE):
  1. Admin can view a top-level KPI dashboard showing total revenue, total members, upcoming events, and recent activity at a glance
  2. Admin can view per-member spend profiles (total across events), drink popularity rankings per event, and repeat attendee rate across events
  3. Admin can view referral chain effectiveness (referrer to referred to spending), guest-to-member conversion tracking, and drink purchase funnel (menu view to token)
  4. Organizer can see market insights per event (avg spend per attendee, peak purchase times) and admin can compare metrics side-by-side for 2+ events
**Plans:** TBD

### Phase 24: Guest List Management
**Goal:** Organizers can manage per-event guest lists that automatically handle registration, approval, and free ticket generation -- with both email-based (invitation + QR) and no-email (door check-in) flows
**Depends on:** Phase 22, Phase 23 (PostHog tracking for guest processing events, animation components, toast notifications)
**Requirements:** GSTL-01, GSTL-02, GSTL-03, GSTL-04, GSTL-05, GSTL-06, GSTL-07, GSTL-08, GSTL-09, GSTL-10, GSTL-11, GSTL-12, GSTL-13, GSTL-14, GSTL-15, GSTL-16
**Success Criteria** (what must be TRUE):
  1. Organizer can add guests by name/surname/email (email optional), view guest list with real-time status (invited/registered/has ticket/checked in), remove guests (with warning if ticket issued), and assign guests to specific parties or all parties
  2. Guests with email receive a branded invitation email with event details, QR code, and link to set password and claim their account; non-member guests are auto-registered and auto-approved on the platform
  3. Existing approved members on the guest list automatically receive a free ticket (ticket_type: guest_list, amount: 0); pending members are auto-approved then receive a free ticket; the sales dashboard separates paid vs free tickets
  4. Organizer can bulk import guests via CSV (with parse, validate, deduplicate, preview) and clone a guest list from a previous event; guests without email are checked in by name lookup at the door
  5. Profiles track approval method (approved_via: referral/guest_list/admin_manual), new users registering with a guest-list email are auto-approved, and email deliverability is ensured via SPF/DKIM/DMARC

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 20. Navigation Consolidation | 3/3 | Complete    | 2026-03-09 |
| 21. Layout Elegance | 0/? | Not started | - |
| 22. Analytics Infrastructure & Event Metrics | 0/? | Not started | - |
| 23. Analytics Dashboard & Cross-Event Insights | 0/? | Not started | - |
| 24. Guest List Management | 0/? | Not started | - |

---
*Roadmap created: 2026-03-09*
*Last updated: 2026-03-09*
