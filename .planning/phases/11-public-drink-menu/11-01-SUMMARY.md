---
phase: 11
plan: 1
subsystem: drinks
tags: [rls, server-actions, api-route, guest-access, security]
dependency-graph:
  requires: [phase-9-drink-schema, phase-10-redemption]
  provides: [drink-items-anon-rls, guest-purchase-action, guest-redeem-action, guest-token-api]
  affects: [public-menu-page]
tech-stack:
  added: []
  patterns: [service-role-bypass, uuid-capability-token, hmac-guest-guard]
key-files:
  created:
    - supabase/migrations/20260306200000_phase11_public_menu.sql
    - src/app/(public)/events/[slug]/menu/actions.ts
    - src/app/api/drinks/tokens/route.ts
  modified: []
decisions:
  - Guest server actions use getServiceClient() from @/lib/supabase/service for all DB ops (service-role bypasses RLS)
  - Guest token API route uses UUID as capability token, secured by user_id null guard
  - redeemDrinkTokenGuest guards user_id === null to prevent misuse on authenticated tokens
metrics:
  duration: 97s
  completed: 2026-03-06
---

# Phase 11 Plan 1: Backend Infrastructure for Public Drink Menu Summary

RLS anon read policy for drink_items, guest purchase/redeem server actions with null user_id and service-role DB access, plus GET /api/drinks/tokens route with UUID capability token pattern.

## Tasks Completed

| Task | Description | Status |
|------|-------------|--------|
| 1 | RLS migration + guest server actions (purchaseDrinksGuest, redeemDrinkTokenGuest) | Done |
| 2 | Guest token retrieval API route (GET /api/drinks/tokens) | Done |

## Commits

| Hash | Message |
|------|---------|
| 94caef1 | feat(11-01): add RLS migration and guest server actions |
| 51708a6 | feat(11-01): add guest token retrieval API route |

## Key Implementation Details

### RLS Migration (Task 1, Part A)
- Drops existing `drink_items_select` policy (was `TO authenticated` only)
- Recreates with `TO anon, authenticated USING (true)` for public read access
- No other RLS changes needed; guest tokens accessed via service-role API route

### Guest Server Actions (Task 1, Part B)
- `purchaseDrinksGuest(eventId, items)`: Mirrors `purchaseDrinks` without auth
  - Uses `getServiceClient()` for all DB operations (service-role bypasses RLS)
  - Sets `user_id: null` in drink_orders insert
  - Returns `{ success, checkoutId, orderId }` using `.select("id").single()` on insert
  - Same validation: items non-empty, drink availability, quantity >= 1
  - Same SumUp checkout flow via `createCheckout()`
- `redeemDrinkTokenGuest(signedToken)`: Mirrors `redeemDrinkToken` without auth
  - Verifies HMAC signature via `verifyTicketToken()`
  - Guards `token.user_id !== null` to prevent misuse on authenticated tokens
  - Checks `status === "redeemed"` before RPC call
  - Calls `redeem_drink_token` SECURITY DEFINER RPC

### Guest Token API Route (Task 2)
- `GET /api/drinks/tokens?order_id=<uuid>` — public, no auth middleware
- UUID format validation via regex
- Fetches order, returns 404 if not found
- Security guard: returns 403 if `order.user_id !== null` (only guest orders exposed)
- Returns `{ tokens, orderStatus }` using service-role client
- Token fields: id, drink_name, price, token, status, redeemed_at

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation: PASSED (npx tsc --noEmit, zero errors)
- Migration file drops old policy and creates new with `TO anon, authenticated`: VERIFIED
- actions.ts exports `purchaseDrinksGuest` with `user_id: null` and orderId return: VERIFIED
- actions.ts exports `redeemDrinkTokenGuest` with user_id null guard: VERIFIED
- route.ts exports GET handler with UUID validation and user_id null guard: VERIFIED

## Self-Check: PASSED
