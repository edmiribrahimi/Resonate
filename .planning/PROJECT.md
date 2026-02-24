# Resonate

## What This Is

Resonate (re:sonate — motion music hub) is a private, invitation-driven music events community platform. Members discover upcoming events, buy tickets, share event photos and videos, and invite trusted friends via referral links. Access is gated: referred members join instantly, while non-referred registrations require approval from an admin or organizer.

## Core Value

Members can discover events, confirm attendance, and buy tickets within a trusted, curated community — the gating mechanism (referral + approval) is what makes the community valuable.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ User can sign up with email and password — existing (`/registrati`)
- ✓ User can log in with email and password — existing (`/login`)
- ✓ User session persists across browser refresh — existing (Supabase cookie middleware)
- ✓ User receives membership card with QR code — existing (`/membership-card`)
- ✓ Admin can scan QR codes to verify members — existing (`/admin/scanner`)
- ✓ User can browse published events — existing (`/eventi`, mock data)
- ✓ User can view event details — existing (`/eventi/[slug]`)
- ✓ User can RSVP to events — existing (RSVP model)
- ✓ User can subscribe to newsletter — existing (`/newsletter` + Resend)
- ✓ PWA support for mobile-first experience — existing (next-pwa + manifest)
- ✓ User can view gallery — existing (`/galleria`)

### Active

<!-- Current scope. Building toward these. -->

**Bug Fixes & Polish:**
- [ ] Entire site translated to English (text + URL routes)
- [ ] Logged-in users no longer see "diventa membro" prompt on event pages
- [ ] Stronger password requirements for registration
- [ ] Confirmation emails branded with Resonate identity
- [ ] Homepage displays Resonate logo instead of text heading
- [ ] Orbitron font applied site-wide

**Roles & Permissions:**
- [ ] Master user role (dedicated admin account) with full platform control
- [ ] Organizer role — can create and edit events
- [ ] Members have standard access (browse, RSVP, buy tickets, upload media, invite friends)

**Event Management:**
- [ ] Organizers can create events with details (title, date, time, location, lineup, cover image, capacity)
- [ ] Organizers can edit their own events
- [ ] Events support multiple ticket tiers (e.g. Early Bird, Regular, VIP) with different prices

**Ticket Payments:**
- [ ] SumUp payment integration for ticket purchases
- [ ] Members can buy tickets for events through the platform
- [ ] Organizers can see ticket sales for their events

**Referral System:**
- [ ] Each member has a unique referral link
- [ ] Referred members are auto-approved on registration (no approval needed)
- [ ] Referral tracked — who invited whom

**Approval Flow:**
- [ ] Non-referred members enter "pending approval" state on registration
- [ ] Pending members can browse events but cannot RSVP or buy tickets
- [ ] Master user or Organizer can approve/reject pending members

**Event Media:**
- [ ] Members can upload photos and videos for events they attended
- [ ] Media appears on the event detail page (gallery section)
- [ ] Media also appears on the member's profile, tagged by event

### Out of Scope

- Real-time chat — not core to event community value
- OAuth/social login — email/password sufficient for now
- Multi-language support — English only
- Native mobile app — PWA covers mobile experience
- Automated event recommendations — keep discovery manual
- Complex analytics dashboard — basic ticket sales visibility is enough

## Context

**Existing codebase:** Next.js 16 + Supabase + Tailwind CSS v4 + PWA. App Router with route groups: `(public)`, `(auth)`, `(members)`, `(admin)`. Supabase handles auth, database (PostgreSQL), and file storage. Resend handles email (newsletter). Current routes and UI text are in Italian — full migration to English needed.

**Database schema:** Tables exist for `profiles`, `events`, `rsvps`, `attendances`, `event_media`, `newsletter_subscribers`. Profile has `membership_code` and `is_admin` fields. Events use mock data currently — need real Supabase integration.

**Branding:** Logo files provided — "re:sonate" with "motion music hub" tagline. Available in white-on-transparent and black-on-transparent variants. Font: Orbitron (Google Fonts).

**Payment provider:** SumUp — account needs to be set up. Will need API keys and merchant configuration.

**Email:** Resend already integrated for newsletter. Confirmation/transactional emails need Resonate branding applied.

## Constraints

- **Tech stack**: Next.js 16 + Supabase + Tailwind CSS v4 — already established, continue with same
- **Payment**: SumUp specifically — not Stripe, not PayPal
- **Font**: Orbitron — Google Font, must be applied globally
- **Language**: English only — no i18n framework needed
- **PWA**: Must maintain PWA functionality throughout changes
- **Hosting**: Vercel (implied by Next.js setup)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| English-only site | Owner's preference, international audience | — Pending |
| SumUp for payments | Owner already uses SumUp for business | — Pending |
| Orbitron font site-wide | Brand identity consistency | — Pending |
| One referral link per member | Simpler than per-invite links, standard pattern | — Pending |
| Dedicated admin account for master user | Separation from personal account | — Pending |
| Browse-only for pending members | Allow discovery but gate participation | — Pending |
| Multiple ticket tiers per event | Flexibility for organizers (Early Bird, Regular, VIP) | — Pending |
| Media on both event page and member profile | Maximum visibility for community content | — Pending |

---
*Last updated: 2026-02-24 after initialization*
