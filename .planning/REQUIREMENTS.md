# Requirements: Resonate v1.3

**Defined:** 2026-03-09
**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

## v1.3 Requirements

### Analytics & Data Collection

- [x] **ANLY-01**: Organizer can view revenue summary per event (gross/net ticket + drink sales)
- [x] **ANLY-02**: Organizer can view ticket sales over time chart per event (daily velocity)
- [x] **ANLY-03**: Organizer can view drink sales summary per event with per-drink breakdown
- [x] **ANLY-04**: Organizer can view attendance rate per event (tickets sold vs checked in)
- [x] **ANLY-05**: Admin can view member growth over time (weekly/monthly, referral vs organic split)
- [x] **ANLY-06**: Organizer can view expired/refunded token rate per event (% redeemed vs wasted)
- [ ] **ANLY-07**: Admin can view top-level KPI dashboard (total revenue, total members, upcoming events, recent activity)
- [x] **ANLY-08**: App tracks pageviews and user behavior via PostHog (EU instance, free tier)
- [ ] **ANLY-09**: Admin can view per-member spend profile (total spent across events: tickets + drinks)
- [x] **ANLY-10**: Admin can view drink popularity ranking per event (most sold, highest redemption rate)
- [x] **ANLY-11**: Organizer can view market insights per event (avg spend/attendee, peak purchase times)
- [ ] **ANLY-12**: Admin can view repeat attendee rate (% members attending multiple events)
- [ ] **ANLY-13**: Admin can view referral chain effectiveness (referrer -> referred member -> spending total)
- [ ] **ANLY-14**: Admin can track guest-to-member conversion (anonymous drink buyers who later register)
- [x] **ANLY-15**: Admin can view drink purchase funnel (menu view -> cart -> checkout -> payment -> token)
- [ ] **ANLY-16**: Admin can compare metrics side-by-side for 2+ events

### Layout Elegance

- [x] **UI-01**: All pages have component enter animations (fade + translateY, 200-300ms, ease-out)
- [x] **UI-02**: Async content shows skeleton loading states instead of blank/flash
- [x] **UI-03**: All buttons and cards have consistent press/tap feedback (whileTap scale)
- [x] **UI-04**: Page has smooth scroll behavior for anchor links
- [x] **UI-05**: User actions show toast notifications with slide-in animation and auto-dismiss
- [x] **UI-06**: Primary action buttons have hover/tap micro-interactions
- [x] **UI-07**: Lists (events, drinks, members) use staggered item animations (50-80ms delay)
- [x] **UI-08**: Content sections animate in on scroll (whileInView with threshold)
- [x] **UI-09**: Analytics KPI cards have number counting-up micro-interactions
- [x] **UI-10**: Dark mode accent elements have subtle ambient glow effects
- [x] **UI-11**: Cards have hover elevation (desktop) and press feedback (mobile)
- [x] **UI-12**: App respects prefers-reduced-motion and disables animations accordingly

### Guest List

- [ ] **GSTL-01**: Organizer can add guests to event guest list by name, surname, and email (email optional)
- [ ] **GSTL-02**: Organizer can view guest list with status per entry (invited / registered / has ticket / checked in)
- [ ] **GSTL-03**: System sends branded invitation email with QR code to guests with email address
- [ ] **GSTL-04**: Non-member guests with email are auto-registered and auto-approved on the platform
- [ ] **GSTL-05**: Existing approved members on guest list receive a free ticket (ticket_type: guest_list, amount_paid: 0)
- [ ] **GSTL-06**: Pending members on guest list are auto-approved and receive a free ticket
- [ ] **GSTL-07**: Organizer can remove a guest from the list (warning if ticket already issued)
- [ ] **GSTL-08**: Guest list supports per-party granularity (nullable party_id: null = all parties)
- [ ] **GSTL-09**: New user registering with email matching a guest list entry is auto-approved (alternative approval path)
- [ ] **GSTL-10**: Organizer can bulk import guests via CSV (name, surname, email -- parse, validate, deduplicate, preview)
- [ ] **GSTL-11**: Organizer can clone a guest list from a previous event to a new event
- [ ] **GSTL-12**: Guests without email have no QR code -- check-in is by name lookup at the door
- [ ] **GSTL-13**: Invitation email includes event details, QR code, and link to set password and claim account
- [ ] **GSTL-14**: Profiles track approval method (approved_via: referral / guest_list / admin_manual)
- [ ] **GSTL-15**: Tickets distinguish type (ticket_type: purchased / guest_list) and sales dashboard separates paid vs free
- [ ] **GSTL-16**: Email deliverability ensured via SPF, DKIM, DMARC records on sending domain

### Navigation Consolidation

- [x] **NAV-01**: Bottom nav shows 3 tabs for members (Events, Gallery, Account) and 4 tabs for staff (Events, Gallery, Check-in, Account)
- [x] **NAV-02**: Account page shows role-aware sections: "My Stuff" for all, "Management" for organizer/master
- [x] **NAV-03**: Check-in tab is always one tap away for organizer/master roles
- [x] **NAV-04**: Check-in page shows unified attendee list for the event (ticket holders + guest list) with name search and QR scan
- [x] **NAV-05**: Account page "Management" section shows quick-stats cards (pending members, next event, total revenue)
- [x] **NAV-06**: Account page management section has animated expand/collapse
- [x] **NAV-07**: Clear visual separation between "My Stuff" and "Management" sections
- [x] **NAV-08**: Unified StaffNav component used consistently across admin and organizer routes

## v1.4 Requirements (Deferred)

### App Audit (Research Complete -- see .planning/research/)

- **AUDT-01**: Lighthouse performance score >90 on all pages
- **AUDT-02**: Security headers configured (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **AUDT-03**: All server actions validated with Zod schemas
- **AUDT-04**: WCAG AA color contrast on all text elements
- **AUDT-05**: Keyboard navigation for all interactive elements (modals, forms, bottom sheets)
- **AUDT-06**: SEO metadata (OpenGraph, Twitter cards) on all public pages
- **AUDT-07**: All images use next/image with proper width/height/sizes
- **AUDT-08**: Error boundaries (error.tsx) per route group
- **AUDT-09**: eslint-plugin-jsx-a11y integrated and findings fixed
- **AUDT-10**: JSON-LD structured data for events (Schema.org Event markup)
- **AUDT-11**: PWA offline fallback page
- **AUDT-12**: Rate limiting on auth endpoints
- **AUDT-13**: Bundle size CI monitoring with @next/bundle-analyzer

### Analytics Deferred

- **ANLY-D1**: Conversion funnel visualization via PostHog dashboards
- **ANLY-D2**: Session replay analysis workflow
- **ANLY-D3**: Layout animations on filter/sort (Motion layout prop)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom analytics dashboard UI (Chart.js/Recharts) | PostHog provides dashboards, funnels, charts -- no need to build custom |
| Page-level route transitions (AnimatePresence) | Broken in Next.js App Router as of 2026 |
| Public RSVP wall (Partiful-style) | Contradicts private/curated community model |
| SMS invitations for guest list | Per-message cost, privacy/regulatory complexity |
| Plus-one / guest-of-guest management | Contradicts "each person is a known member" model |
| Calendar ICS attachment in emails | Complex cross-client rendering, low ROI for nightlife events |
| AI-powered event recommendations | Irrelevant at <1000 members; manual curation is the brand value |
| WCAG AAA compliance | AAA conflicts with dark theme + Orbitron aesthetics; AA is the target |
| Real-time WebSocket dashboard | Over-engineered for event frequency; server-rendered refresh sufficient |
| Google Analytics integration | PostHog covers all needs; avoid duplicate tracking + GDPR overhead |
| A/B testing framework | Not needed at current user scale |
| 3D transforms / WebGL / Lottie animations | Performance-heavy on mobile, contradicts minimal design |
| Automated email follow-up sequences | Over-engineered for a community where organizers know guests |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 20 | Complete |
| NAV-02 | Phase 20 | Complete |
| NAV-03 | Phase 20 | Complete |
| NAV-04 | Phase 20 | Complete |
| NAV-05 | Phase 20 | Complete |
| NAV-06 | Phase 20 | Complete |
| NAV-07 | Phase 20 | Complete |
| NAV-08 | Phase 20 | Complete |
| UI-01 | Phase 21 | Complete |
| UI-02 | Phase 21 | Complete |
| UI-03 | Phase 21 | Complete |
| UI-04 | Phase 21 | Complete |
| UI-05 | Phase 21 | Complete |
| UI-06 | Phase 21 | Complete |
| UI-07 | Phase 21 | Complete |
| UI-08 | Phase 21 | Complete |
| UI-09 | Phase 21 | Complete |
| UI-10 | Phase 21 | Complete |
| UI-11 | Phase 21 | Complete |
| UI-12 | Phase 21 | Complete |
| ANLY-01 | Phase 22 | Pending |
| ANLY-02 | Phase 22 | Pending |
| ANLY-03 | Phase 22 | Pending |
| ANLY-04 | Phase 22 | Pending |
| ANLY-05 | Phase 22 | Complete |
| ANLY-06 | Phase 22 | Pending |
| ANLY-08 | Phase 22 | Complete |
| ANLY-07 | Phase 23 | Pending |
| ANLY-09 | Phase 23 | Pending |
| ANLY-10 | Phase 23 | Complete |
| ANLY-11 | Phase 23 | Complete |
| ANLY-12 | Phase 23 | Pending |
| ANLY-13 | Phase 23 | Pending |
| ANLY-14 | Phase 23 | Pending |
| ANLY-15 | Phase 23 | Complete |
| ANLY-16 | Phase 23 | Pending |
| GSTL-01 | Phase 24 | Pending |
| GSTL-02 | Phase 24 | Pending |
| GSTL-03 | Phase 24 | Pending |
| GSTL-04 | Phase 24 | Pending |
| GSTL-05 | Phase 24 | Pending |
| GSTL-06 | Phase 24 | Pending |
| GSTL-07 | Phase 24 | Pending |
| GSTL-08 | Phase 24 | Pending |
| GSTL-09 | Phase 24 | Pending |
| GSTL-10 | Phase 24 | Pending |
| GSTL-11 | Phase 24 | Pending |
| GSTL-12 | Phase 24 | Pending |
| GSTL-13 | Phase 24 | Pending |
| GSTL-14 | Phase 24 | Pending |
| GSTL-15 | Phase 24 | Pending |
| GSTL-16 | Phase 24 | Pending |

**Coverage:**
- v1.3 requirements: 52 total
- Mapped to phases: 52
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after roadmap creation*
