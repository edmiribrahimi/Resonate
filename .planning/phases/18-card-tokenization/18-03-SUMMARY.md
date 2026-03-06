---
phase: 18-card-tokenization
plan: "03"
subsystem: payments
tags: [sumup, tokenization, saved-card, card-management, dashboard]
dependency_graph:
  requires: ["18-01 (sumup_customer_id column, listSavedCards, deactivateCard, processWithSavedCard)", "18-02 (saveCard checkbox, tokenization checkout flow)"]
  provides: ["purchaseTicketWithSavedCard", "purchaseDrinksWithSavedCard", "getSavedCards", "deleteSavedCard", "SavedCardsSection", "saved card payment UI in checkout"]
  affects: ["src/app/(organizer)/organizer/events/actions.ts", "src/app/(public)/events/[slug]/TierSelection.tsx", "src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx", "src/app/(members)/dashboard/page.tsx"]
tech_stack:
  added: []
  patterns: ["server-side token payment via processWithSavedCard", "saved cards fetched in server components and passed as props", "optimistic card deletion in SavedCardsSection"]
key_files:
  created:
    - src/app/(members)/dashboard/actions.ts
    - src/app/(members)/dashboard/SavedCardsSection.tsx
  modified:
    - src/app/(organizer)/organizer/events/actions.ts
    - src/app/(public)/events/[slug]/TierSelection.tsx
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx
    - src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx
    - src/app/(public)/events/[slug]/menu/page.tsx
    - src/app/(members)/dashboard/page.tsx
decisions:
  - "GuestDrinkMenu updated instead of DrinkMenu.tsx (DrinkMenu is dead code, GuestDrinkMenu is the actual component used in the drink menu page)"
  - "Saved cards fetched in server components (event page, menu page, dashboard) and passed as props to client components"
  - "WithSavedCard server actions kept separate from original purchase actions to maintain clean separation"
  - "SavedCardsSection renders null when no cards (component self-hides, no conditional rendering needed in parent)"
metrics:
  duration: "~6 minutes"
  completed: "2026-03-06T17:38:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 7
---

# Phase 18 Plan 03: Pay with Saved Card + Profile Card Management Summary

Server-side saved card payment in ticket and drink checkout flows, payment method selector UI for returning members, and saved cards view/delete section in member dashboard.

## Tasks Completed

### Task 1: Server actions for saved cards management + token payment
**Commit:** `c7efecb`

- Created `src/app/(members)/dashboard/actions.ts` with three server actions:
  - `getSavedCards()`: authenticates user, fetches `sumup_customer_id` from profile, calls `listSavedCards()`, returns empty array if no customer ID
  - `deleteSavedCard(token)`: authenticates, fetches customer ID, calls `deactivateCard()`, revalidates `/dashboard`
  - `payWithSavedCard(params)`: creates standard checkout, processes with saved card token server-side, handles 3DS redirect/paid/pending
- Added `purchaseTicketWithSavedCard(partyId, tierId, cardToken)` to organizer events actions -- full ticket validation (chain status, duplicates, party checks) then server-side token payment
- Added `purchaseDrinksWithSavedCard(eventId, partyId, items, cardToken)` to organizer events actions -- full drink validation (availability, quantities) then server-side token payment
- Both WithSavedCard actions create pending_purchases/drink_orders records before processing, so webhook can handle completion
- Imported `processWithSavedCard` from `@/lib/sumup`

### Task 2: Saved card option in checkout UI + card management in dashboard
**Commit:** `41344f3`

- **TierSelection.tsx**: Added `savedCards` prop, `paymentMethod` and `selectedCardToken` state, payment method selector UI showing saved cards and "New card" option, calls `purchaseTicketWithSavedCard` when saved card selected, hides save-card checkbox when using saved card
- **GuestDrinkMenu.tsx**: Added `savedCards` prop, payment method selector in order summary, `handleSavedCardCheckout()` calling `purchaseDrinksWithSavedCard`, handles redirect/paid/pending responses
- **SavedCardsSection.tsx**: New client component with optimistic card deletion, renders card type + last 4 digits, "Remove" button per card, returns null when no cards
- **Dashboard page.tsx**: Extended profile query to include `sumup_customer_id`, fetches saved cards via `listSavedCards()`, renders `SavedCardsSection` above Settings for members
- **Event detail page.tsx**: Fetches saved cards for authenticated users, passes `savedCards` prop to both event-level and party-level TierSelection
- **Menu page.tsx**: Fetches saved cards for authenticated users, passes through PartyDrinkMenu to GuestDrinkMenu
- **PartyDrinkMenu.tsx**: Extended to accept and pass through `savedCards` prop

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated GuestDrinkMenu instead of DrinkMenu**
- **Found during:** Task 2
- **Issue:** Plan referenced `src/app/(public)/events/[slug]/DrinkMenu.tsx` for saved card integration, but this component is dead code -- never imported anywhere. The actual drink ordering component used by the menu page is `GuestDrinkMenu.tsx` (rendered via `PartyDrinkMenu`)
- **Fix:** Added saved card support to `GuestDrinkMenu.tsx` and updated `PartyDrinkMenu.tsx` to pass `savedCards` through
- **Files modified:** `GuestDrinkMenu.tsx`, `PartyDrinkMenu.tsx`, `menu/page.tsx`
- **Commit:** `41344f3`

## Verification Results

- `npx tsc --noEmit` passes with zero errors
- `npm run build` passes clean
- `dashboard/actions.ts` exports `getSavedCards`, `deleteSavedCard`, `payWithSavedCard`
- `organizer/events/actions.ts` exports `purchaseTicketWithSavedCard`, `purchaseDrinksWithSavedCard`
- TierSelection renders payment method selector when `savedCards` prop has items
- GuestDrinkMenu renders payment method selector when `savedCards` prop has items
- SavedCardsSection renders in dashboard with view/delete functionality
- Guest checkout shows no saved card options (savedCards is undefined for unauthenticated users)
- 3DS redirect handled via existing `/payment/callback` page

## Requirements Satisfied

- **TOK-03**: Returning member sees "Pay with saved card" option that charges their stored payment instrument (via payment method selector in TierSelection and GuestDrinkMenu)
- **TOK-04**: Member can view and delete saved cards from profile/settings (SavedCardsSection in dashboard)

## Self-Check: PASSED

All files verified present. All commits verified in git log.
