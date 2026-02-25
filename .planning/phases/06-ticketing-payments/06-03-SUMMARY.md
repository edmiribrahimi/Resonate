---
phase: 06-ticketing-payments
plan: 03
subsystem: ticket-purchase-flow
tags: [sumup, webhook, qrcode, email, ticketing, payments]
dependency_graph:
  requires: [ticket_tiers-table, tickets-table, pending_purchases-table, reserve_ticket-rpc, sumup-client, email-attachments]
  provides: [purchaseTicket-action, sumup-webhook, ticket-confirmation-email, ticket-confirmation-page, tier-selection-ui]
  affects: [events-detail-page, email.ts]
tech_stack:
  added: []
  patterns: [SumUp hosted checkout redirect, fire-and-forget email with CID QR, lazy Resend initialization]
key_files:
  created:
    - src/app/api/webhooks/sumup/route.ts
    - src/emails/ticket-confirmation.tsx
    - src/app/(public)/events/[slug]/TierSelection.tsx
    - src/app/(public)/tickets/[id]/page.tsx
  modified:
    - src/app/(organizer)/organizer/events/actions.ts
    - src/app/(public)/events/[slug]/page.tsx
    - src/lib/email.ts
decisions:
  - "Lazy Resend initialization to prevent build-time errors in webhook route (env vars unavailable during page data collection)"
  - "Extracted TierSelection as co-located client component for interactive tier selection with server action call"
  - "QR code uses transparent background with light foreground for dark theme consistency"
metrics:
  duration: 304s
  completed: 2026-02-25T13:03:19Z
---

# Phase 6 Plan 03: Ticket Purchase Flow Summary

Full ticket purchase flow with SumUp checkout creation, webhook payment verification calling reserve_ticket RPC atomically, QR code generation (CID email + data URL page), branded confirmation email/page, and event detail page integration with tier selection, pending member guard, and secret location reveal.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Purchase server action, webhook handler, and ticket confirmation email | 9b66e17 | src/app/(organizer)/organizer/events/actions.ts, src/app/api/webhooks/sumup/route.ts, src/emails/ticket-confirmation.tsx, src/lib/email.ts |
| 2 | Event detail page (tier selection, buy button, secret location reveal) and ticket confirmation page | 5f19358 | src/app/(public)/events/[slug]/page.tsx, src/app/(public)/events/[slug]/TierSelection.tsx, src/app/(public)/tickets/[id]/page.tsx |

## What Was Built

### Purchase Server Action (purchaseTicket)
- Verifies user is approved (TICK-07 guard at action layer)
- Checks one-ticket-per-event constraint before SumUp call
- Creates SumUp hosted checkout via createCheckout
- Records pending_purchase with service-role client (bypass RLS)
- Returns checkout URL for client-side redirect to SumUp hosted payment

### SumUp Webhook Handler (/api/webhooks/sumup)
- Filters for CHECKOUT_STATUS_CHANGED events only
- Verifies payment via GET checkout API (never trusts webhook body)
- Idempotent: skips already-completed purchases
- Calls reserve_ticket RPC for atomic ticket creation (oversell prevention)
- Updates pending_purchase status (completed/failed)
- Fire-and-forget: generates QR code buffer, renders email HTML, sends via Resend with CID attachment
- Email failure never blocks webhook response (try/catch)

### Ticket Confirmation Email
- Branded template using established EmailLayout pattern
- Accent-colored heading "You're In, {memberName}"
- Event title, tier name, date/time display
- CID-referenced QR code image (attached as base64 inline)
- "View Your Ticket" button linking to /tickets/{id}

### Event Detail Page (Modified)
- Fetches ticket_tiers and computes availability per tier
- Secret location reveals actual address for ticket holders (not just authenticated users)
- Capacity display switches from RSVP-based to ticket-based when tiers exist
- TierSelection client component: interactive tier cards with price, availability, buy button
- Already-purchased state: green banner with "View Your Ticket" link
- Pending member guard: message about pending approval (TICK-07 UI layer)
- Payment result banners: success and cancelled states from SumUp redirect

### Ticket Confirmation Page (/tickets/[id])
- Server component with auth check and user ownership verification
- Branded ticket card: cover image, event title, tier, date/time, location
- QR code generated server-side as data URL with dark-theme-compatible colors
- "Show this QR code at the door" helper text
- Back to Events navigation link

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Lazy Resend initialization in email.ts**
- **Found during:** Task 1 build verification
- **Issue:** Webhook route import of sendEmail triggered Resend constructor at build time when RESEND_API_KEY env var is unavailable during page data collection phase
- **Fix:** Changed from module-level `new Resend()` to lazy `getResend()` function that initializes on first call; moved FROM_ADDRESS to function scope
- **Files modified:** src/lib/email.ts
- **Commit:** 9b66e17

## Verification

- `npx next build` passes with 0 errors
- Event detail page fetches from ticket_tiers and tickets tables
- Webhook handler verifies payment via getCheckout before creating ticket
- Webhook handler calls reserve_ticket RPC (not direct insert)
- purchaseTicket checks user status === 'approved' (TICK-07)
- Secret location shows real address when user has ticket
- Ticket confirmation page generates QR code from ticket UUID
- Email template references CID for QR code image
