---
phase: 9
plan: 1
subsystem: drinks
tags: [database, server-actions, webhook, payments]
dependency-graph:
  requires: [phase-8-sumup-checkout]
  provides: [drink-schema, drink-server-actions, drink-webhook]
  affects: [webhook-handler]
tech-stack:
  added: []
  patterns: [security-definer-rpc, service-client-bypass, webhook-fallback]
key-files:
  created:
    - supabase/migrations/20260306000000_phase9_drinks.sql
  modified:
    - src/types/database.ts
    - src/app/(organizer)/organizer/events/actions.ts
    - src/app/api/webhooks/sumup/route.ts
decisions:
  - Webhook uses fallback pattern: check pending_purchases first, then drink_orders
  - drink_tokens admin SELECT policy added for bar-side redemption
  - fulfill_drink_order ignores p_transaction_code param (stored nowhere) but keeps signature for future audit
metrics:
  duration: 137s
  completed: 2026-03-06
---

# Phase 9 Plan 1: Database + Backend for Drink Menu & Purchase Summary

Three new tables (drink_items, drink_orders, drink_tokens) with RLS, fulfill_drink_order SECURITY DEFINER function for token generation, 5 server actions for CRUD + purchase, webhook extended with fallback to drink_orders.

## Tasks Completed

| Task | Description | Status |
|------|-------------|--------|
| 1 | Database migration for drink tables | Done |
| 2 | TypeScript types for drink tables | Done |
| 3 | Drink CRUD and purchase server actions | Done |
| 4 | Extend webhook handler for drink payments | Done |

## Commits

| Hash | Message |
|------|---------|
| 7ace8ce | feat(drinks): add database schema, server actions, and webhook for drink ordering |

## Key Implementation Details

### Database Migration (Task 1)
- `drink_items`: per-event menu items with price, sort_order, is_available
- `drink_orders`: tracks SumUp checkout with JSONB items snapshot
- `drink_tokens`: one token per unit purchased (quantity expansion), unique token string for QR
- `fulfill_drink_order(p_order_id, p_transaction_code)`: SECURITY DEFINER, idempotent, loops items JSONB, creates tokens, marks order completed
- 5 indexes on foreign keys and lookup columns
- RLS: authenticated read for drink_items, user_id match for orders/tokens, admin read for tokens

### TypeScript Types (Task 2)
- DrinkItem, DrinkOrder, DrinkOrderItem, DrinkToken interfaces added to database.ts

### Server Actions (Task 3)
- `getDrinkItems(eventId)`: fetch ordered by sort_order
- `addDrinkItem(eventId, name, price)`: auto-increments sort_order
- `updateDrinkItem(itemId, data)`: partial update with organizer check
- `removeDrinkItem(itemId)`: delete with organizer check
- `purchaseDrinks(eventId, items)`: validates availability, calculates total, creates SumUp checkout, inserts drink_orders via service client

### Webhook Extension (Task 4)
- Restructured from early-return pattern to if/else-if pattern
- Ticket handling stays in `if (purchase)` block with early return
- Drink handling added as fallback: looks up drink_orders by checkout ID, calls fulfill_drink_order RPC
- Final else: logs error for unmatched checkouts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added drink_tokens admin SELECT policy**
- **Found during:** Task 1
- **Issue:** Plan only specified user_id SELECT for tokens, but organizers need to view/redeem tokens at the bar
- **Fix:** Added `drink_tokens_select_admin` policy using `is_admin_or_organizer()`
- **Files modified:** supabase/migrations/20260306000000_phase9_drinks.sql

**2. [Rule 1 - Bug] Removed unused purchaseError variable**
- **Found during:** Task 4
- **Issue:** After restructuring webhook from early-return to if/else, the `purchaseError` destructured variable was no longer needed
- **Fix:** Changed to `const { data: purchase }` without error destructuring
- **Files modified:** src/app/api/webhooks/sumup/route.ts

## Verification

- TypeScript compilation: PASSED (npx tsc --noEmit, zero errors)

## Self-Check: PASSED
