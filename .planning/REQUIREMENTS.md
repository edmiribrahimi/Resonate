# Requirements: Resonate v1.4 — Check-in Overhaul

**Defined:** 2026-03-10
**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community — the gating mechanism (referral + approval) is what makes the community valuable.

## Check-in Flow

- [ ] **CHKIN-01**: Party selector screen when opening check-in — staff picks a single party before scanning or viewing attendees
- [ ] **CHKIN-02**: Attendee list, name search, and filter tabs (All / Not Arrived / Checked In) scoped to selected party
- [ ] **CHKIN-03**: Progress bar shows check-in count for selected party only

## QR Scanner UX

- [ ] **SCAN-01**: Continuous camera scanning — point at QR, no capture/photo button needed
- [ ] **SCAN-02**: Green flash overlay + haptic vibration on valid scan — shows attendee name + ticket type
- [ ] **SCAN-03**: Red flash overlay + haptic vibration + reason text on invalid scan (already checked in / not found / wrong event)
- [ ] **SCAN-04**: Auto-return to scanning mode after flash (~1-1.5s delay), near-instant verify cycle
- [ ] **SCAN-05**: Cross-event validation — ticket for a different party/event triggers red flash with specific message
- [ ] **SCAN-06**: Duplicate scan shows date/time of previous check-in in the red flash message
- [ ] **SCAN-07**: Offline support — check-in works without connectivity, syncs when back online
- [ ] **SCAN-08**: Flashlight/torch toggle for scanning in dark venues
- [ ] **SCAN-09**: Undo check-in from scan history — tap any of the last 5 scans to reverse the check-in
- [ ] **SCAN-10**: Last 5 scans history visible below the scanner viewfinder

## Membership Door Check-in

- [ ] **MEMB-01**: Membership QR scan → verify member → instant check-in for selected party
- [ ] **MEMB-02**: Record attendance in database for membership-based check-in (no ticket created — cash tracked via SumUp app)
- [ ] **MEMB-03**: Invalid/unknown membership code → red flash with "Member not found" message

## Deferred from v1.3

### App Audit

- **AUDT-01**: Lighthouse performance score >90 on all pages
- **AUDT-02**: Security headers configured (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **AUDT-03**: All server actions validated with Zod schemas
- **AUDT-04**: WCAG AA color contrast on all text elements
- **AUDT-05**: Keyboard navigation for all interactive elements
- **AUDT-06**: SEO metadata (OpenGraph, Twitter cards) on all public pages
- **AUDT-07**: All images use next/image with proper width/height/sizes
- **AUDT-08**: Error boundaries (error.tsx) per route group
- **AUDT-09**: eslint-plugin-jsx-a11y integrated and findings fixed
- **AUDT-10**: JSON-LD structured data for events
- **AUDT-11**: PWA offline fallback page
- **AUDT-12**: Rate limiting on auth endpoints
- **AUDT-13**: Bundle size CI monitoring

### Analytics Deferred

- **ANLY-D1**: Conversion funnel visualization via PostHog dashboards
- **ANLY-D2**: Session replay analysis workflow
- **ANLY-D3**: Layout animations on filter/sort

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cash payment tracking in Resonate | Cash handled via SumUp app directly |
| Ticket creation for cash payers | No digital ticket needed — attendance record suffices |
| Non-member door entry without membership QR | Must register (referral/approval) or buy ticket online |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHKIN-01 | Phase 29 | Planned |
| CHKIN-02 | Phase 29 | Planned |
| CHKIN-03 | Phase 29 | Planned |
| SCAN-01 | Phase 29 | Planned |
| SCAN-02 | Phase 29 | Planned |
| SCAN-03 | Phase 29 | Planned |
| SCAN-04 | Phase 29 | Planned |
| SCAN-05 | Phase 29 | Planned |
| SCAN-06 | Phase 29 | Planned |
| SCAN-07 | Phase 29 | Planned |
| SCAN-08 | Phase 29 | Planned |
| SCAN-09 | Phase 29 | Planned |
| SCAN-10 | Phase 29 | Planned |
| MEMB-01 | Phase 30 | Planned |
| MEMB-02 | Phase 30 | Planned |
| MEMB-03 | Phase 30 | Planned |

**Coverage:**
- v1.4 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
