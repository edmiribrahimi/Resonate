---
phase: 26-discount-codes
plan: 02
subsystem: ticketing
tags: [discount-codes, buyer-flow, purchase, webhook, sumup]
dependency_graph:
  requires: [discount_codes_table, discount_code_tiers_table, validateDiscountCode]
  provides: [discount_code_buyer_input, discounted_purchase_flow, webhook_discount_passthrough]
  affects: [TierSelection, purchaseTicket, sumup_webhook, pending_purchases]
tech_stack:
  added: []
  patterns: [collapsible-input, strikethrough-pricing, server-side-discount-validation]
key_files:
  created: []
  modified:
    - src/app/(public)/events/[slug]/TierSelection.tsx
    - src/app/(organizer)/organizer/events/actions.ts
    - src/app/api/webhooks/sumup/route.ts
decisions:
  - Explicit "Applica" button for discount code validation (not debounced input)
  - Discount codes hidden for event-level tiers (partyId null) since codes are per-party
  - Codes bringing price below EUR 1.00 silently keep original price display (no green price) client-side and throw server-side
  - Anonymous user intent preserves discountCodeId for post-registration purchase
metrics:
  duration_seconds: 173
  completed: "2026-03-10T02:15:39Z"
---

# Phase 26 Plan 02: Buyer-Side Discount Code Integration Summary

Collapsible discount code input in TierSelection with strikethrough+green discounted pricing, server-side validation in purchaseTicket() with SumUp discounted checkout, and webhook passthrough of discount_code_id to reserve_ticket() RPC.

## Task Execution

### Task 1: TierSelection discount code input + discounted price display
**Commit:** 0c861b8

Modified `TierSelection.tsx` to add full discount code buyer experience:
- Import `validateDiscountCode` from tickets server actions
- State variables: showDiscountInput, discountCode, discount, discountError, isValidating
- `computeDiscountedPrice()` helper for percentage/fixed discount calculation
- `handleValidateCode()` async handler calling validateDiscountCode server action
- `handleClearDiscount()` to reset discount state
- Collapsible "Hai un codice sconto?" input section (only shown when partyId is not null)
- Strikethrough original price + green discounted price on applicable tiers (only when discounted price >= EUR 1.00)
- Confirmation banner with "Rimuovi" button when discount is active
- Enter key support on input field for validation
- Anonymous user intent includes `discountCodeId` for post-registration flow
- `purchaseTicket()` call updated to pass `discount?.id ?? null` as third argument

### Task 2: purchaseTicket() discount validation + webhook discount_code_id passthrough
**Commit:** 3e1ecc4

**purchaseTicket() in actions.ts:**
- Signature updated to accept optional `discountCodeId?: string | null`
- Server-side discount validation: fetches code, verifies is_active, party_id match
- Tier applicability check via discount_code_tiers junction table
- Usage limit enforcement (counts tickets with matching discount_code_id)
- Discounted price computation (percentage or fixed)
- EUR 1.00 minimum enforcement with Italian error message
- SumUp checkout created with `finalPrice` instead of `tier.price`
- `discount_code_id: validatedDiscountCodeId` stored in pending_purchases insert

**Webhook in route.ts:**
- `p_discount_code_id: purchase.discount_code_id ?? null` added to reserve_ticket() RPC call
- Backward compatible: existing purchases without discounts pass null (RPC parameter has DEFAULT NULL)

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| "Hai un codice sconto?" text in TierSelection | PASS |
| validateDiscountCode imported and called | PASS |
| computeDiscountedPrice helper function | PASS |
| line-through class for original price | PASS |
| discountCodeId in purchaseTicket signature | PASS |
| finalPrice used in SumUp checkout amount | PASS |
| p_discount_code_id in webhook RPC call | PASS |
| discount_code_id in pending_purchases insert | PASS |
| TypeScript compilation (npx tsc --noEmit) | PASS |

## Decisions Made

1. **Explicit "Applica" button** -- Uses a button instead of debounced input for discount validation, per research recommendation (clearer UX, avoids unnecessary API calls).
2. **Hidden for event-level tiers** -- Discount code input not shown when partyId is null, since discount codes are party-scoped.
3. **Client-side EUR 1.00 guard** -- Tiers where discounted price would be below EUR 1.00 keep the original price display (no green price) rather than showing an error, signaling the code doesn't apply to that tier.
4. **Anonymous intent preservation** -- discountCodeId stored in localStorage intent for post-registration purchase, ensuring discount survives the auth redirect.

## Self-Check: PASSED

All files exist, all commits verified.
