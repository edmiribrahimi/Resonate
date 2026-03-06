# Phase 12: Drink Order Webhook Fixes - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix two minor tech debt issues identified during v1.1 milestone audit:
1. Webhook does not error-handle `fulfill_drink_order` RPC — if it fails, drink order stays "pending" silently
2. `p_transaction_code` parameter in `fulfill_drink_order` is accepted but never used

</domain>

<decisions>
## Implementation Decisions

### Error Handling Pattern
- Mirror the existing ticket purchase error handling (webhook lines 61-72): check RPC error, update `drink_orders.status` to `"failed"`, log error, return early
- The `drink_orders` table already has `"failed"` as a valid status value (CHECK constraint)

### Parameter Removal
- Create a new migration that replaces `fulfill_drink_order` function without `p_transaction_code`
- Update the webhook call site to stop passing the parameter
- The transaction code was never stored — removing it is safe

### Claude's Discretion
- Migration file naming convention
- Whether to add an `error_message` column to `drink_orders` (matching `pending_purchases` pattern) or just use the status field

</decisions>

<code_context>
## Existing Code Insights

### Webhook Route (src/app/api/webhooks/sumup/route.ts)
- Lines 61-72: Ticket purchase error handling pattern (the model to follow)
- Lines 201-204: Current drink order RPC call (no error check)
- Lines 198-199: `transactionCode` extracted but passed uselessly

### Migration (supabase/migrations/20260306000000_phase9_drinks.sql)
- Lines 111-174: `fulfill_drink_order` function with `p_transaction_code text` parameter
- The parameter is never referenced in the function body (unused)
- `drink_orders.status` CHECK constraint: `('pending', 'completed', 'failed', 'expired')`

</code_context>

---

*Phase: 12-drink-order-webhook-fixes*
*Context gathered: 2026-03-06*
