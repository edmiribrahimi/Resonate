# Resonate

## What This Is

Resonate (re:sonate — motion music hub) is a private, invitation-driven music events community platform. Members discover upcoming events, buy tickets, share event photos and videos, and invite trusted friends via referral links. Access is gated: referred members join instantly, while non-referred registrations require approval from an admin or organizer.

## Core Value

Members can discover events, confirm attendance, and buy tickets within a trusted, curated community — the gating mechanism (referral + approval) is what makes the community valuable.

## Current State

**Shipped:** v1.3 (2026-03-10) — [milestone archive](.planning/milestones/v1.3-ROADMAP.md)

All 60 v1.3 requirements implemented across 9 phases. New capabilities:
- Navigation consolidated to 3-4 role-aware tabs with Account as management hub
- Motion library (4.6kb) with enter animations, staggered lists, pressable feedback, CountUp, toast, 11 skeleton loading states
- PostHog EU analytics + Recharts dashboards: per-event metrics, KPI overview, member insights, event comparison
- Guest list management with auto-registration, invitation emails with QR, scanner check-in
- Discount codes with case-insensitive validation, SumUp integration, sales tracking

<details>
<summary>v1.2 (2026-03-07)</summary>

All 33 v1.2 requirements implemented across 7 phases — [archive](.planning/milestones/v1.2-ROADMAP.md):
- Official `@sumup/sdk` migration (singleton pattern, type-safe wrappers)
- Admin finance dashboard with transaction list, cursor-based pagination, filters, detail view
- In-app refund management (full/partial) with confirmation flow and fee warning
- Alternative payment methods: Satispay, MyBank, Apple Pay, Google Pay
- Manual menu closing time per party with 1h grace period for token redemption
- Daily cron auto-refunds expired unclaimed tokens, 24h cleanup of old tokens
</details>

<details>
<summary>v1.1 (2026-03-06)</summary>

All 18 v1.1 requirements across 5 phases — [archive](.planning/milestones/v1.1-ROADMAP.md):
- SumUp embedded checkout (in-app card widget, no redirect)
- Per-event drink menu with CRUD management
- Drink purchase via embedded checkout with individual HMAC-signed tokens
- Drink redemption with SERVED animation
- Public drink menu page (`/events/[slug]/menu`) for anonymous guests via QR
- Guest token persistence via localStorage + URL param fallback
</details>

<details>
<summary>v1.0 (2026-03-05)</summary>

All 45 v1 requirements across 7 phases — [archive](.planning/milestones/v1.0-ROADMAP.md):
- English-only UI with Orbitron font and Resonate branding
- Role-based access (master/organizer/member) with middleware enforcement
- Referral system with auto-approve, purchase-based auto-approval for pending members
- Event management with multi-party events, secret venue logic, cover images
- SumUp ticketing with atomic reservation, QR codes, sales dashboard
- Media uploads with moderation workflow and gallery display
- Branded transactional emails via React Email + Resend
</details>

## Requirements

### v1.0 (Complete)

All 45 requirements shipped. See [v1.0-REQUIREMENTS.md](.planning/milestones/v1.0-REQUIREMENTS.md) for full list.

### v1.1 (Complete)

All 18 requirements shipped. See [v1.1-REQUIREMENTS.md](.planning/milestones/v1.1-REQUIREMENTS.md) for full list.

### v1.2 (Complete)

All 33 requirements shipped. See [v1.2-REQUIREMENTS.md](.planning/milestones/v1.2-REQUIREMENTS.md) for full list.

### Out of Scope

- Real-time chat — not core to event community value
- OAuth/social login — email/password sufficient for now
- Multi-language support — English only
- Native mobile app — PWA covers mobile experience
- Automated event recommendations — keep discovery manual
- Complex analytics dashboard — admin finance dashboard covers SumUp data; no custom analytics engine

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
*Last updated: 2026-03-09 after v1.3 milestone initialization*
