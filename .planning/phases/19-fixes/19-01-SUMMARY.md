---
phase: 19-fixes
plan: 01
subsystem: sumup-integration
tags: [cleanup, tokenization-removal, payout-removal]
dependency_graph:
  requires: []
  provides: [leaner-sumup-integration]
  affects: [sumup-library, server-actions, ui-components, admin-finance]
tech_stack:
  removed: [card-tokenization, payout-reports, saved-cards-ui]
  patterns: [card-widget-only-checkout]
key_files:
  modified:
    - src/lib/sumup.ts
    - src/types/database.ts
    - src/app/(organizer)/organizer/events/actions.ts
    - src/app/(members)/dashboard/page.tsx
    - src/app/(public)/events/[slug]/TierSelection.tsx
    - src/app/(public)/events/[slug]/DrinkMenu.tsx
    - src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx
    - src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx
    - src/app/api/webhooks/sumup/route.ts
    - src/app/(admin)/admin/finance/page.tsx
    - src/app/(admin)/admin/finance/actions.ts
  deleted:
    - src/app/(members)/dashboard/SavedCardsSection.tsx
    - src/app/(members)/dashboard/actions.ts
    - src/app/(admin)/admin/finance/payouts/page.tsx
    - src/components/admin/PayoutList.tsx
    - src/components/admin/FinanceSubNav.tsx
    - supabase/migrations/20260306500000_phase18_card_tokenization.sql
decisions:
  - Removed entire dashboard/actions.ts since it only contained saved card functions
  - Kept DrinkMenu.tsx (dead code) but cleaned its saveCard references to avoid TS errors
metrics:
  duration: ~10min
  completed: "2026-03-06T22:55:00Z"
  lines_removed: ~1447
  files_deleted: 6
  files_modified: 11
---

# Phase 19 Plan 01: Remove Card Tokenization & Payout Reports Summary

Removed all Phase 18 card tokenization code and Phase 16 payout reports from the codebase, leaving only essential SumUp integrations (checkout, transactions, refunds).

## What Was Done

### Task 1: SumUp Library, Types, and Migration Cleanup
- Removed 5 tokenization functions from `src/lib/sumup.ts`: `getOrCreateCustomer`, `createTokenizationCheckout`, `processWithSavedCard`, `listSavedCards`, `deactivateCard`
- Updated SDK export comment from "phases (14-18)" to generic
- Removed `sumup_customer_id` field from Profile interface in `src/types/database.ts`
- Deleted Phase 18 migration file

### Task 2: Server Actions Cleanup
- Deleted `src/app/(members)/dashboard/actions.ts` entirely (only contained saved card functions)
- Removed `purchaseTicketWithSavedCard` and `purchaseDrinksWithSavedCard` from organizer events actions
- Removed `saveCard` parameter from `purchaseTicket` and `purchaseDrinks` functions
- Removed tokenization logic blocks (getOrCreateCustomer + createTokenizationCheckout branching) from both purchase flows
- Cleaned imports to only use `createCheckout`

### Task 3: UI Components Cleanup
- Deleted `SavedCardsSection.tsx` component
- Cleaned dashboard page: removed saved cards fetch, sumup_customer_id query, SavedCardsSection rendering
- Cleaned TierSelection: removed savedCards props, payment method selector, save-card checkbox, saved card checkout path
- Cleaned GuestDrinkMenu: removed savedCards props, payment method state, saved card checkout function and UI
- Cleaned PartyDrinkMenu: removed savedCards prop interface and passing
- Cleaned webhook handler: replaced tokenization comment with generic log

### Task 4: Payout Reports Removal
- Deleted payouts page and directory
- Deleted PayoutList component
- Deleted FinanceSubNav component
- Cleaned finance page: removed FinanceSubNav import and rendering
- Removed `listPayouts` function from finance actions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DrinkMenu.tsx saveCard reference**
- **Found during:** TypeScript verification
- **Issue:** Dead code file `DrinkMenu.tsx` called `purchaseDrinks` with 4 args (including `saveCard`) but signature was changed to 3
- **Fix:** Removed `saveCard` state, parameter, and checkbox UI from DrinkMenu.tsx
- **Files modified:** `src/app/(public)/events/[slug]/DrinkMenu.tsx`

**2. [Rule 3 - Blocking] Cleared .next/types cache**
- **Found during:** TypeScript verification
- **Issue:** `.next/types/validator.ts` had stale reference to deleted payouts page module
- **Fix:** Removed `.next/types` directory to clear cached type declarations

## Verification

- `npx tsc --noEmit` passes with zero errors
- No tokenization references remain in `src/`: grep for savedCards, SavedCards, listSavedCards, sumup_customer_id, WithSavedCard, tokenization, SETUP_RECURRING returns empty
- No payout references remain in `src/`: grep for FinanceSubNav, PayoutList, listPayouts returns empty
