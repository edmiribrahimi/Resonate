# Requirements: Resonate

**Defined:** 2026-02-24
**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### UI & Branding

- [ ] **UIBR-01**: Entire site translated to English -- all visible text, labels, error messages, placeholders
- [ ] **UIBR-02**: All URL routes migrated to English (e.g. /eventi -> /events, /registrati -> /register, /presenze -> /attendance, /galleria -> /gallery) with redirects from old Italian paths
- [x] **UIBR-03**: Orbitron font (Google Fonts) applied as the primary font site-wide
- [x] **UIBR-04**: Homepage displays Resonate logo image instead of text heading "Resonate Music events community"
- [ ] **UIBR-05**: Logged-in users no longer see "diventa membro per confermare la tua presenza" on event pages
- [ ] **UIBR-06**: Registration confirmation email includes Resonate branding (logo, name, styled template)
- [ ] **UIBR-07**: Approval notification email includes Resonate branding when member is approved/rejected
- [ ] **UIBR-08**: Stronger password requirements enforced at registration (minimum 8 characters, at least one uppercase, one number, one special character)

### Roles & Permissions

- [ ] **ROLE-01**: Profile schema migrated from `is_admin` boolean to `role` enum field with values: master, organizer, member
- [ ] **ROLE-02**: Profile schema includes `status` field with values: pending, approved, rejected
- [ ] **ROLE-03**: All existing RLS policies updated to use role-based checks instead of `is_admin`
- [ ] **ROLE-04**: Middleware enforces route access based on role (master/organizer access admin routes, approved members access member routes, pending members see browse-only)
- [ ] **ROLE-05**: Master user can assign and revoke Organizer role for any member
- [ ] **ROLE-06**: Each role sees only relevant navigation items and page actions
- [ ] **ROLE-07**: Dedicated master admin account can be created during initial setup

### Referral & Approval

- [ ] **REFR-01**: Each approved member has a unique referral link (e.g. /join?ref=RSN-XXXXXXXX using membership_code)
- [ ] **REFR-02**: Members can view and copy their referral link from their profile/dashboard
- [ ] **REFR-03**: Registration form accepts referral code from URL parameter
- [ ] **REFR-04**: Users who register via valid referral link are automatically set to status "approved"
- [ ] **REFR-05**: Users who register without referral link are set to status "pending"
- [ ] **REFR-06**: Referral relationship tracked in profile (referred_by field)
- [ ] **APPR-01**: Pending members can browse published events but cannot RSVP, buy tickets, or upload media
- [ ] **APPR-02**: Master user and Organizers see a list of pending members awaiting approval
- [ ] **APPR-03**: Master user and Organizers can approve or reject pending members
- [ ] **APPR-04**: Member receives email notification when their account is approved

### Event Management

- [ ] **EVNT-01**: Organizer can create events with: title, description, date, time, location, secret location toggle, lineup, cover image, capacity
- [ ] **EVNT-02**: Organizer can edit their own events
- [ ] **EVNT-03**: Events page displays real data from Supabase (replacing current mock data)
- [ ] **EVNT-04**: Events page shows upcoming events and past events archive
- [ ] **EVNT-05**: Event detail page shows remaining capacity ("X spots left") or "Sold out" status
- [ ] **EVNT-06**: Secret location is hidden until member has purchased a ticket for the event
- [ ] **EVNT-07**: Events generate URL-friendly slugs automatically from title

### Ticketing & Payments

- [ ] **TICK-01**: Organizer can define multiple ticket tiers per event (e.g. Early Bird, Regular, VIP) with name, price, and quantity
- [ ] **TICK-02**: Approved members can purchase tickets via SumUp hosted checkout
- [ ] **TICK-03**: Payment confirmation creates a ticket record with unique QR code
- [ ] **TICK-04**: Member receives ticket confirmation with QR code (for door entry, separate from membership QR)
- [ ] **TICK-05**: Organizer can view ticket sales dashboard: tier breakdown, revenue total, buyer list
- [ ] **TICK-06**: Ticket purchase decrements available quantity; prevents overselling via database constraints
- [ ] **TICK-07**: Pending members cannot purchase tickets (browse-only)

### Event Media

- [ ] **MDIA-01**: Approved members can upload photos for events they attended (verified against attendance record)
- [ ] **MDIA-02**: Approved members can upload videos for events they attended
- [ ] **MDIA-03**: Uploaded media appears on the event detail page in a gallery section
- [ ] **MDIA-04**: Uploaded media appears on the member's profile page, tagged by event
- [ ] **MDIA-05**: File validation enforced (photos: JPEG/PNG/WebP up to 10MB, videos: MP4/MOV up to 100MB)
- [ ] **MDIA-06**: Only members who were checked in at an event (attendance record exists) can upload media for that event

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: Push notifications for new events via PWA
- **NOTF-02**: Email notification when new event is published
- **NOTF-03**: Configurable notification preferences per member

### Referral Gamification

- **GAMF-01**: Referral leaderboard showing top inviters
- **GAMF-02**: Referral rewards or badges for active inviters

### Advanced Event Features

- **ADVT-01**: Organizer can duplicate an existing event as template
- **ADVT-02**: Recurring events support
- **ADVT-03**: Waitlist for sold-out events with automatic notification

### Offline & Performance

- **OFFL-01**: Offline event browsing via PWA cache
- **OFFL-02**: Performance monitoring and analytics

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time chat / messaging | Splits attention, moderation burden. WhatsApp/Telegram serves this need. |
| OAuth / social login | Adds complexity. Email/password sufficient for private community. |
| Multi-language / i18n | English only. No framework needed. |
| Native mobile app | PWA covers mobile experience adequately. |
| Automated event recommendations | Small community, manual discovery preferred. |
| Complex analytics dashboard | Overkill. Basic sales visibility per event is enough. |
| Transferable / resellable tickets | Prevents scalping, maintains trust-based community. |
| Public event pages / SEO | Private community -- events only visible to authenticated users. |
| User-generated events | Only organizers and master create events. Curated calendar. |
| Complex refund automation | Manual refunds via SumUp dashboard. Platform shows "contact organizer". |
| Waitlist system | Word-of-mouth handles this for small community events. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UIBR-01 | Phase 1 | Pending |
| UIBR-02 | Phase 1 | Pending |
| UIBR-03 | Phase 1 | Complete |
| UIBR-04 | Phase 1 | Complete |
| UIBR-05 | Phase 1 | Pending |
| UIBR-06 | Phase 4 | Pending |
| UIBR-07 | Phase 4 | Pending |
| UIBR-08 | Phase 1 | Pending |
| ROLE-01 | Phase 2 | Pending |
| ROLE-02 | Phase 2 | Pending |
| ROLE-03 | Phase 2 | Pending |
| ROLE-04 | Phase 2 | Pending |
| ROLE-05 | Phase 2 | Pending |
| ROLE-06 | Phase 2 | Pending |
| ROLE-07 | Phase 2 | Pending |
| REFR-01 | Phase 3 | Pending |
| REFR-02 | Phase 3 | Pending |
| REFR-03 | Phase 3 | Pending |
| REFR-04 | Phase 3 | Pending |
| REFR-05 | Phase 3 | Pending |
| REFR-06 | Phase 3 | Pending |
| APPR-01 | Phase 3 | Pending |
| APPR-02 | Phase 3 | Pending |
| APPR-03 | Phase 3 | Pending |
| APPR-04 | Phase 4 | Pending |
| EVNT-01 | Phase 5 | Pending |
| EVNT-02 | Phase 5 | Pending |
| EVNT-03 | Phase 5 | Pending |
| EVNT-04 | Phase 5 | Pending |
| EVNT-05 | Phase 5 | Pending |
| EVNT-06 | Phase 5 | Pending |
| EVNT-07 | Phase 5 | Pending |
| TICK-01 | Phase 6 | Pending |
| TICK-02 | Phase 6 | Pending |
| TICK-03 | Phase 6 | Pending |
| TICK-04 | Phase 6 | Pending |
| TICK-05 | Phase 6 | Pending |
| TICK-06 | Phase 6 | Pending |
| TICK-07 | Phase 6 | Pending |
| MDIA-01 | Phase 7 | Pending |
| MDIA-02 | Phase 7 | Pending |
| MDIA-03 | Phase 7 | Pending |
| MDIA-04 | Phase 7 | Pending |
| MDIA-05 | Phase 7 | Pending |
| MDIA-06 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-24 after roadmap creation*
