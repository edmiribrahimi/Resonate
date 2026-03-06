---
phase: 10
plan: 1
subsystem: drinks
tags: [database, server-actions, webhook, security, hmac]
dependency-graph:
  requires: [phase-9-drink-schema]
  provides: [redeem-drink-token-rpc, hmac-signed-tokens, redeem-server-action]
  affects: [webhook-handler, organizer-actions]
tech-stack:
  added: []
  patterns: [security-definer-rpc, hmac-signing, for-update-row-lock]
key-files:
  created:
    - supabase/migrations/20260306100000_phase10_redemption.sql
  modified:
    - src/app/api/webhooks/sumup/route.ts
    - src/app/(organizer)/organizer/events/actions.ts
decisions:
  - Token signing happens in webhook handler after fulfill_drink_order (not in PG function) because HMAC uses Node.js crypto
  - redeemDrinkToken verifies ownership via authenticated supabase client before calling service-role RPC
metrics:
  duration: 94s
  completed: 2026-03-06
---

# Phase 10 Plan 1: Backend for Drink Token Redemption Summary

SECURITY DEFINER `redeem_drink_token` function with FOR UPDATE row lock, HMAC signing of drink tokens in webhook after fulfillment, and `redeemDrinkToken` server action with signature verification + ownership check.

## Tasks Completed

| Task | Description | Status |
|------|-------------|--------|
| 1 | Database migration for redeem_drink_token function | Done |
| 2 | HMAC token signing in webhook + redeemDrinkToken server action | Done |

## Commits

| Hash | Message |
|------|---------|
| bf896f8 | feat(10-01): add redeem_drink_token SECURITY DEFINER function |
| 14a9eb5 | feat(10-01): add HMAC token signing in webhook and redeemDrinkToken server action |

## Key Implementation Details

### Database Migration (Task 1)
- `redeem_drink_token(p_token_id uuid)`: SECURITY DEFINER PL/pgSQL function
- Uses `SELECT ... FOR UPDATE` to lock the token row and prevent concurrent redemption
- Returns `false` (idempotent) if token already has `status = 'redeemed'`
- Raises exception if token not found
- Updates `status` to `'redeemed'` and `redeemed_at` to `now()` on success

### Webhook Token Signing (Task 2, Part A)
- After `fulfill_drink_order` RPC completes, queries all newly created `drink_tokens` for the order
- Loops through each token and updates the `token` column with `generateTicketToken(t.id)`
- Reuses existing `generateTicketToken` import (already present for ticket QR codes)
- Signed token format: `{token_id}.{hmac_sha256_hex}`

### Server Action (Task 2, Part B)
- `redeemDrinkToken(signedToken: string)` exported from organizer actions
- Step 1: `verifyTicketToken(signedToken)` validates HMAC signature (uses `timingSafeEqual`)
- Step 2: `createClient()` + `getUser()` verifies authentication
- Step 3: Queries `drink_tokens` to verify ownership (`user_id === user.id`) and status
- Step 4: `getServiceClient().rpc("redeem_drink_token", { p_token_id })` calls SECURITY DEFINER function
- Throws descriptive errors: "Invalid token signature", "Not authenticated", "Not your token", "Already redeemed", "Redemption failed"

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation: PASSED (npx tsc --noEmit, zero errors)
- Migration file contains `redeem_drink_token` function with `FOR UPDATE` row lock: VERIFIED
- Webhook route contains token signing loop after `fulfill_drink_order`: VERIFIED
- actions.ts exports `redeemDrinkToken` that calls `verifyTicketToken` before RPC: VERIFIED

## Self-Check: PASSED
