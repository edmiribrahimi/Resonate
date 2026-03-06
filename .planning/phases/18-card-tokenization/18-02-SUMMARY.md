---
phase: 18-card-tokenization
plan: "02"
subsystem: payments
tags: [sumup, tokenization, checkout, save-card, webhook]
dependency_graph:
  requires: ["18-01 (getOrCreateCustomer, createTokenizationCheckout, sumup_customer_id column)"]
  provides: ["purchaseTicket with saveCard", "purchaseDrinks with saveCard", "save-card checkbox UI", "tokenization-aware webhook"]
  affects: ["src/app/(organizer)/organizer/events/actions.ts", "src/app/api/webhooks/sumup/route.ts", "src/app/(public)/events/[slug]/TierSelection.tsx", "src/app/(public)/events/[slug]/DrinkMenu.tsx"]
tech_stack:
  added: []
  patterns: ["conditional tokenization checkout (saveCard flag)", "lazy SumUp customer creation at checkout time", "graceful webhook handling for tokenization checkouts"]
key_files:
  created: []
  modified:
    - src/app/(organizer)/organizer/events/actions.ts
    - src/app/api/webhooks/sumup/route.ts
    - src/app/(public)/events/[slug]/TierSelection.tsx
    - src/app/(public)/events/[slug]/DrinkMenu.tsx
decisions:
  - "Tokenization combined with real purchase (single checkout with purpose + amount) rather than separate flows"
  - "Save-card checkbox placed in TierSelection/DrinkMenu (before checkout creation), not in modal"
  - "SumUpCheckoutModal left unchanged -- Card Widget auto-handles tokenization consent UI"
  - "GuestDrinkMenu unmodified -- guests cannot save cards"
metrics:
  duration: "~3 minutes"
  completed: "2026-03-06T17:28:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 4
---

# Phase 18 Plan 02: Tokenization Checkout Flow Summary

Save-card checkbox in ticket and drink purchase flows, conditional tokenization checkout with SumUp customer creation, and graceful webhook handling for tokenization completions.

## Tasks Completed

### Task 1: Extend server actions for tokenization checkout + extend webhook
**Commit:** `2e2130d`

- Added optional `saveCard` parameter to `purchaseTicket(partyId, tierId, saveCard?)` and `purchaseDrinks(eventId, partyId, items, saveCard?)`
- When `saveCard=true`: fetches user profile, calls `getOrCreateCustomer()` with user UUID, updates `sumup_customer_id` in profiles if not set, then creates tokenization checkout via `createTokenizationCheckout()` instead of standard `createCheckout()`
- When `saveCard` is false/undefined: existing flow completely unchanged (backward compatible)
- Imported `getOrCreateCustomer` and `createTokenizationCheckout` from `@/lib/sumup`
- Replaced webhook `console.error` for unmatched checkouts with `console.log` noting possible tokenization checkout -- prevents false error alerts

### Task 2: Add save-card checkbox to checkout modal and wire to purchase flows
**Commit:** `d2d588a`

- Added `saveCard` state to `TierSelection.tsx` with checkbox shown only when `isAuthenticated` is true
- Added `saveCard` state to `DrinkMenu.tsx` with checkbox always visible (drink menu is members-only)
- Checkbox state passed to server action calls: `purchaseTicket(partyId, selectedTierId, saveCard)` and `purchaseDrinks(eventId, partyId, items, saveCard)`
- Checkbox resets after successful checkout creation
- `SumUpCheckoutModal.tsx` left completely unchanged -- the SumUp Card Widget automatically shows tokenization consent UI when checkout has `purpose: "SETUP_RECURRING_PAYMENT"`
- `GuestDrinkMenu.tsx` not modified -- guests cannot save cards

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` passes with zero errors
- `npm run build` passes clean
- `purchaseTicket` accepts optional `saveCard` parameter (3rd argument)
- `purchaseDrinks` accepts optional `saveCard` parameter (4th argument)
- TierSelection renders save-card checkbox when `isAuthenticated=true`
- DrinkMenu renders save-card checkbox in order summary
- GuestDrinkMenu is unmodified
- Webhook handles tokenization checkouts without error logs
- SumUpCheckoutModal is unchanged

## Requirements Satisfied

- **TOK-01**: SumUp customer created lazily during save-card checkout (via `getOrCreateCustomer`)
- **TOK-02**: Checkbox "Save card for future payments" during checkout creates tokenization checkout with `purpose: "SETUP_RECURRING_PAYMENT"` and `customer_id`

## Self-Check: PASSED

All files verified present. All commits verified in git log.
