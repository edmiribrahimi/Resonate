# Phase 6: Ticketing & Payments - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement ticket purchasing via SumUp hosted checkout. Organizers define ticket tiers per event, approved members buy tickets (one per member per event), successful payment generates a QR code ticket, and organizers view sales data. Also wire the secret location reveal for ticket holders (deferred from Phase 5). Pending members cannot purchase (TICK-07 enforced at payment layer).

</domain>

<decisions>
## Implementation Decisions

### Ticket Purchase Flow
- Purchase starts on the event detail page directly -- tier selection and "Buy" button appear below event info, no separate ticket page
- After successful SumUp payment, redirect to a dedicated ticket confirmation page showing the QR code, event details, and success message
- One ticket per member per event -- no multi-ticket purchases. Friends register and buy their own.
- Payment failure or cancellation redirects back to the event detail page with an error/cancelled message. Member can retry.

### Ticket Tier Management
- Tier management lives in a separate section, accessible after the event is created -- not inline in the event creation form
- Tiers are fully editable always -- organizer can change price, name, and quantity at any time, even after sales. Existing tickets remain valid at their original price.
- No limit on how many tiers an organizer can create per event
- Tiers with existing sales cannot be deleted. Only unsold tiers can be removed.

### Ticket Display & QR Code
- Tickets appear as a section on the existing member dashboard -- no separate "My Tickets" page
- QR code encodes ticket ID only (UUID). Door staff scan it and the app looks up details server-side. Minimal, secure.
- Ticket confirmation email includes the QR code image inline so the member can show the email at the door without opening the app
- Tickets are visually styled as branded ticket cards -- event cover image, Resonate branding, event details, and QR code. Looks like a real ticket.

### Sales Dashboard
- Sales dashboard is a tab on the event management page alongside event details. Context stays with the event.
- Buyer list shows: member name, tier purchased, purchase date, and member email
- Revenue display shows per-tier breakdown (revenue and sold/available count per tier) plus a total across all tiers
- Master admin sees the same per-event sales view as organizers (just for all events). No cross-event overview.

### Claude's Discretion
- SumUp API integration approach (Checkout API endpoints, webhook handling)
- QR code generation library choice
- QR code image format and size for email embedding
- Ticket confirmation page layout
- Sales dashboard table/card layout and responsive behavior
- Database schema for tickets and ticket_tiers tables
- Oversell prevention mechanism (database constraints, row-level locking, etc.)
- How the "Tickets" tab appears on the organizer event management page
- Secret location reveal logic (check ticket ownership before showing real address)
- Ticket confirmation email template design (using existing React Email + Resend infrastructure)

</decisions>

<specifics>
## Specific Ideas

- SumUp has no first-party Node.js SDK -- use raw fetch() to the Checkout API (noted in STATE.md research)
- The existing React Email + Resend infrastructure from Phase 4 should be reused for ticket confirmation emails
- The branded email layout (EmailLayout component) from Phase 4 provides consistent theming for the ticket email
- The event detail page already has a "Secret Location -- Buy a ticket to reveal" CTA from Phase 5 -- this needs to be wired to check actual ticket ownership
- The existing event management pages at `/organizer/events/` and `/admin/events/` need a new "Tickets/Sales" section
- Phase 5's capacity display (RSVP count) should switch to ticket count for events that have tiers defined

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 06-ticketing-payments*
*Context gathered: 2026-02-25*
