---
phase: 18-card-tokenization
plan: "01"
subsystem: payments
tags: [sumup, tokenization, customer, database, migration]
dependency_graph:
  requires: ["@sumup/sdk singleton (Phase 13)"]
  provides: ["sumup_customer_id column", "getOrCreateCustomer", "createTokenizationCheckout", "processWithSavedCard", "listSavedCards", "deactivateCard"]
  affects: ["src/lib/sumup.ts", "src/types/database.ts", "profiles table"]
tech_stack:
  added: []
  patterns: ["idempotent customer creation (get-or-create with 404/409)", "tokenization checkout with SETUP_RECURRING_PAYMENT purpose", "server-side token payment via checkouts.process()"]
key_files:
  created:
    - supabase/migrations/20260306500000_phase18_card_tokenization.sql
  modified:
    - src/types/database.ts
    - src/lib/sumup.ts
decisions:
  - "UUID Supabase used as SumUp customer_id for direct 1:1 mapping"
  - "sumup_customer_id nullable TEXT column (lazy creation pattern)"
  - "Partial index on sumup_customer_id for fast non-null lookups"
  - "getOrCreateCustomer handles 404 (not found) and 409 (conflict/race) gracefully"
  - "processWithSavedCard returns unified shape for both CheckoutSuccess and CheckoutAccepted (3DS)"
metrics:
  duration: "~3 minutes"
  completed: "2026-03-06T17:23:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 18 Plan 01: Supabase Migration + SumUp Customer Helpers Summary

Database migration for `sumup_customer_id` on profiles, 5 SumUp SDK wrapper functions for customer CRUD, tokenization checkout, server-side token payment, and card management.

## Tasks Completed

### Task 1: Database migration + TypeScript type update
**Commit:** `7c4f1d5`

- Created migration `20260306500000_phase18_card_tokenization.sql` adding `sumup_customer_id TEXT` column to profiles table
- Added partial index `idx_profiles_sumup_customer_id` for fast lookups on non-null values
- Updated `Profile` interface in `src/types/database.ts` with `sumup_customer_id: string | null`

### Task 2: SumUp SDK wrapper functions
**Commit:** `794bf85`

Added 5 new exported functions to `src/lib/sumup.ts`:

1. **`getOrCreateCustomer`** -- Idempotent customer creation using Supabase UUID as SumUp customer_id. Handles 404 (create new) and 409 (race condition, retrieve existing).
2. **`createTokenizationCheckout`** -- Creates checkout with `purpose: "SETUP_RECURRING_PAYMENT"` and `customer_id` for card save flow via Card Widget.
3. **`processWithSavedCard`** -- Server-side checkout processing with saved card token. Returns unified shape handling both CheckoutSuccess and CheckoutAccepted (3DS redirect).
4. **`listSavedCards`** -- Lists active payment instruments for a customer, mapped to `{ token, last4, cardType }`.
5. **`deactivateCard`** -- Deactivates a saved payment instrument by token.

All functions follow established error handling pattern: catch `APIError`, rethrow as plain `Error` with descriptive message.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` passes with zero errors
- `npm run build` passes clean
- Migration file exists at expected path
- Profile type includes `sumup_customer_id: string | null`
- 8 total exported functions in sumup.ts (3 existing + 5 new)
- All 3 existing functions (`createCheckout`, `getCheckout`, `refundTransaction`) remain unchanged

## Requirements Satisfied

- **TOK-01**: SumUp customer created and linked to Resonate profile via `sumup_customer_id` column and `getOrCreateCustomer` function

## Self-Check: PASSED

All files verified present. All commits verified in git log.
