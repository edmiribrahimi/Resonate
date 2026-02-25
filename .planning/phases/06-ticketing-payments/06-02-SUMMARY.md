---
phase: 06-ticketing-payments
plan: 02
subsystem: ticket-tier-management
tags: [ticketing, crud, server-actions, organizer-ui]
dependency_graph:
  requires: [ticket_tiers-table, events-table, profiles-table]
  provides: [tier-crud-actions, tier-management-page, event-list-tickets-link]
  affects: [EventList.tsx]
tech_stack:
  added: []
  patterns: [server-actions-with-formdata, client-component-inline-edit, service-role-bypass-for-master]
key_files:
  created:
    - src/app/(organizer)/organizer/events/[id]/tickets/actions.ts
    - src/app/(organizer)/organizer/events/[id]/tickets/page.tsx
    - src/components/tickets/AddTierForm.tsx
    - src/components/tickets/TierCard.tsx
  modified:
    - src/components/events/EventList.tsx
decisions:
  - "Extracted AddTierForm and TierCard as separate client components for clean server/client boundary"
  - "Delete button only rendered when sold count is 0 (hidden, not disabled)"
metrics:
  duration: 172s
  completed: 2026-02-25T13:01:07Z
---

# Phase 6 Plan 02: Ticket Tier Management Summary

Tier CRUD server actions (create/update/delete) with ownership verification, plus tier management page at /organizer/events/[id]/tickets with inline edit cards and "Manage Tickets" link in EventList.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Ticket tier CRUD server actions | 17996bc | src/app/(organizer)/organizer/events/[id]/tickets/actions.ts |
| 2 | Tier management page and event list tickets link | 33a506d | src/app/(organizer)/organizer/events/[id]/tickets/page.tsx, src/components/tickets/AddTierForm.tsx, src/components/tickets/TierCard.tsx, src/components/events/EventList.tsx |

## What Was Built

### Server Actions (actions.ts)
- **createTier**: Validates name (1-100 chars), price (>= 0), quantity (> 0); verifies organizer role and event ownership; inserts into ticket_tiers table; service-role client for master admin
- **updateTier**: Same validation; allows editing all fields at any time even after sales (per user decision); existing tickets retain original price
- **deleteTier**: Checks ticket count via SELECT COUNT on tickets table; blocks deletion when tier has sales ("Cannot delete a tier with existing sales"); only unsold tiers can be removed
- Shared helpers: verifyOrganizer, verifyEventOwnership, getServiceClient (same pattern as events/actions.ts)

### Tier Management Page (page.tsx)
- Server component at /organizer/events/[id]/tickets
- Reads role/status/userId from middleware headers; defense-in-depth redirect for non-organizers
- Verifies event ownership (organizer sees own, master sees all)
- Fetches event title, all tiers, and sold count per tier
- Back link to /organizer/events, header with event title subtitle
- MobileNav for consistent navigation

### Client Components
- **AddTierForm**: Form with name, price (step 0.01), quantity inputs; calls createTier server action; resets form on success; error display
- **TierCard**: Displays tier name, formatted EUR price, sold/quantity count; Edit button toggles inline edit form (pre-filled fields); Delete button only shown when sold=0; uses window.confirm() before deletion

### EventList Update
- Added "Manage Tickets" link to each event row, styled consistently with existing Edit link
- Links to /organizer/events/${event.id}/tickets

## Deviations from Plan

### Out-of-Scope Discovery

**Pre-existing build error in SumUp webhook route**
- **File:** src/app/api/webhooks/sumup/route.ts
- **Issue:** Imports @/emails/ticket-confirmation (not yet created) and qrcode (not installed), causing next build to fail
- **Verified:** Error exists without any 06-02 changes (stash test confirmed)
- **Logged to:** .planning/phases/06-ticketing-payments/deferred-items.md
- **Resolution:** Later Phase 6 plan will create the email template and install the qrcode package

## Verification

- `npx tsc --noEmit` passes with 0 errors (TypeScript compilation clean)
- `next build` fails only on pre-existing /api/webhooks/sumup issue (not caused by this plan)
- actions.ts exports createTier, updateTier, deleteTier
- Tier management page exists at correct route path
- EventList includes "Manage Tickets" link
- deleteTier checks ticket count and blocks deletion when sales > 0
- Edit form allows changing name/price/quantity anytime (no sales restriction)

## Self-Check: PASSED

All 5 created/modified files verified present on disk. Both task commits (17996bc, 33a506d) verified in git log.
