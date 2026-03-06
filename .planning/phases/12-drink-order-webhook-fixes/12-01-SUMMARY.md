---
phase: 12
plan: 1
subsystem: drinks
tags: [webhook, error-handling, database, tech-debt]
dependency-graph:
  requires: [phase-9-drink-schema, phase-10-drink-redemption]
  provides: [drink-order-error-handling, clean-fulfill-drink-order-signature]
  affects: [webhook-handler]
tech-stack:
  added: []
  patterns: [rpc-error-check-with-status-update]
key-files:
  created:
    - supabase/migrations/20260306300000_phase12_webhook_fixes.sql
  modified:
    - src/app/api/webhooks/sumup/route.ts
decisions:
  - No error_message column added to drink_orders (table lacks it unlike pending_purchases) -- just set status to failed
  - DROP old 2-param function before CREATE new 1-param (PostgreSQL treats different param lists as overloads)
metrics:
  duration: 60s
  completed: 2026-03-06
---

# Phase 12 Plan 1: Drink Order Webhook Fixes Summary

Error-checked fulfill_drink_order RPC in webhook (mark drink_orders as "failed" on error, mirroring ticket pattern) and removed unused p_transaction_code parameter via DROP + CREATE migration.

## Tasks Completed

| Task | Description | Status |
|------|-------------|--------|
| 1 | Migration to remove unused parameter + webhook error handling | Done |

## Commits

| Hash | Message |
|------|---------|
| 0d4d519 | fix(12-01): add webhook error handling for drink orders and remove unused RPC param |

## Key Implementation Details

### Migration (Part A)
- `DROP FUNCTION IF EXISTS public.fulfill_drink_order(uuid, text)` removes old 2-parameter overload
- `CREATE OR REPLACE FUNCTION public.fulfill_drink_order(p_order_id uuid)` creates clean 1-parameter version
- Function body unchanged -- only the signature was modified
- PostgreSQL requires explicit DROP because different parameter lists create separate function overloads

### Webhook Error Handling (Part B)
- Replaced bare `await supabase.rpc(...)` with destructured `{ error: drinkRpcError }` pattern
- On RPC error: updates `drink_orders.status` to `"failed"` and `updated_at`, logs error, returns early
- Mirrors the ticket purchase error pattern at lines 61-72 (pending_purchases)
- Removed `transactionCode` extraction (lines 198-199) -- no longer needed
- Removed `p_transaction_code` from RPC call parameters
- Token signing block (HMAC) only executes after successful RPC (unchanged)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation: PASSED (npx tsc --noEmit, zero errors)
- Migration drops old fulfill_drink_order(uuid, text): VERIFIED
- Migration creates new fulfill_drink_order(uuid): VERIFIED
- Webhook destructures drinkRpcError and updates status to "failed": VERIFIED
- No p_transaction_code or transactionCode in drink order section: VERIFIED (only in ticket section)
- Token signing block unchanged and only reached after successful RPC: VERIFIED

## Self-Check: PASSED
