---
phase: 17-alternative-payment-methods
plan: "01"
subsystem: payments-apm
tags: [payments, apm, satispay, mybank, apple-pay, google-pay, sumup, card-widget]
dependency_graph:
  requires: [sdk-singleton, sumup-card-widget, checkout-creation]
  provides: [redirect-url-checkout, google-pay-widget, payment-callback-page, apm-support]
  affects: [purchaseTicket, purchaseDrinks, purchaseDrinksGuest, SumUpCardWidget]
tech_stack:
  added: []
  patterns: [optional-param-backward-compat, conditional-env-config, polling-with-timeout, suspense-boundary]
key_files:
  created:
    - src/app/(public)/payment/callback/actions.ts
    - src/app/(public)/payment/callback/page.tsx
  modified:
    - src/lib/sumup.ts
    - src/app/(organizer)/organizer/events/actions.ts
    - src/app/(public)/events/[slug]/menu/actions.ts
    - src/components/SumUpCardWidget.tsx
    - .env.local.example
decisions:
  - "redirectUrl is optional in createCheckout params -- backward compatible, undefined value is harmless in SDK call"
  - "purchaseDrinks() fetches event slug via separate query (eventForSlug) to avoid variable name clash with existing scope"
  - "Google Pay config is conditional on NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID env var -- avoids errors before dashboard setup"
  - "Payment callback page uses client-side polling (5 attempts, 2s interval) to handle race condition with webhook"
metrics:
  duration_seconds: 161
  completed: "2026-03-06T16:45:15Z"
  tasks_completed: 2
  tasks_total: 2
requirements_satisfied: [APM-01, APM-02, APM-03, APM-04, APM-05]
---

# Phase 17 Plan 01: Alternative Payment Methods (APMs) Summary

Add redirect_url to SumUp checkout creation for Satispay/MyBank redirect flows, configure Card Widget for Google Pay with conditional env-based merchantId, and create /payment/callback page for APM redirect handling with status polling.

## What Was Done

### Task 1: Add redirect_url to createCheckout and update all call sites + Card Widget
- **Commit:** ef4988f
- Added optional `redirectUrl?: string` param to `createCheckout()` in `src/lib/sumup.ts`, passed as `redirect_url` to SumUp SDK
- Updated `purchaseTicket()` to build redirect URL with `ctx=ticket`, `ref={checkoutReference}`, `slug={event.slug}`
- Updated `purchaseDrinks()` to fetch event slug via separate query and build redirect URL with `ctx=drink`, `party={partyId}`
- Updated `purchaseDrinksGuest()` with same pattern using `serviceClient` for slug fetch
- Added `googlePay` field to `SumUpCardConfig` interface in `SumUpCardWidget.tsx`
- Updated `SumUpCard.mount()` to conditionally include `googlePay: { merchantId, merchantName }` when `NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID` env var is set
- Documented `NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID` in `.env.local.example`
- TypeScript check passed with zero errors

### Task 2: Create /payment/callback page for APM redirect flows
- **Commit:** ef4988f (same commit -- atomic per plan instructions)
- Created `src/app/(public)/payment/callback/actions.ts` with `checkPaymentStatus()` server action that calls `getCheckout()` and returns status
- Created `src/app/(public)/payment/callback/page.tsx` as client component with Suspense boundary:
  - Reads `ref`, `slug`, `ctx` from URL search params
  - Polls `checkPaymentStatus` on mount, retries up to 5 times at 2s intervals for PENDING status
  - Shows spinner for checking/pending states
  - Shows green check for PAID with context-aware message (ticket vs drink)
  - Shows red X for FAILED/EXPIRED with retry link
  - Shows yellow warning for NOT_FOUND
  - Back-to-event link uses slug param from URL
- `npm run build` passed -- `/payment/callback` route compiled as static page

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS - zero errors |
| `npm run build` | PASS - all routes compiled, /payment/callback present |
| `redirect_url` in sumup.ts | PASS - `redirect_url: params.redirectUrl` present |
| redirectUrl in organizer actions | PASS - 11 occurrences (purchaseTicket + purchaseDrinks) |
| redirectUrl in guest actions | PASS - 6 occurrences (purchaseDrinksGuest) |
| googlePay in SumUpCardWidget | PASS - interface field + conditional mount config |
| NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID | PASS - documented in .env.local.example |
| callback directory | PASS - actions.ts + page.tsx present |
| checkPaymentStatus action | PASS - exported server action exists |

## Requirements Satisfied

- **APM-01:** Satispay enabled -- checkout includes `redirect_url` (required for Satispay redirect flow), callback page handles redirect-back. Dashboard activation is manual (documented in user_setup).
- **APM-02:** MyBank enabled -- same mechanism as Satispay. Checkout includes `redirect_url`, callback page handles redirect-back. Dashboard activation is manual.
- **APM-03:** Apple Pay enabled -- Card Widget handles Apple Pay natively when domain is registered in dashboard. No additional code changes needed. Domain registration is manual (documented in user_setup).
- **APM-04:** Google Pay enabled -- Card Widget includes `googlePay` config with `merchantId` and `merchantName` when `NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID` env var is set. Dashboard onboarding is manual (documented in user_setup).
- **APM-05:** All 3 `createCheckout()` call sites pass `redirectUrl` pointing to `/payment/callback` with context parameters (`ref`, `slug`, `ctx`, optionally `party`).

## Deviations from Plan

None -- plan executed exactly as written.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/sumup.ts` | Added optional `redirectUrl` param, passed as `redirect_url` to SDK |
| `src/app/(organizer)/organizer/events/actions.ts` | Added redirect URL to purchaseTicket() and purchaseDrinks() |
| `src/app/(public)/events/[slug]/menu/actions.ts` | Added redirect URL to purchaseDrinksGuest() |
| `src/components/SumUpCardWidget.tsx` | Added googlePay interface field + conditional mount config |
| `.env.local.example` | Added NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID |
| `src/app/(public)/payment/callback/actions.ts` | NEW - checkPaymentStatus server action |
| `src/app/(public)/payment/callback/page.tsx` | NEW - APM callback page with polling UI |

## Decisions Made

1. **Optional redirectUrl param:** The `redirectUrl` parameter in `createCheckout()` is optional with `undefined` default. When undefined, the SDK simply doesn't include `redirect_url` in the API call. This preserves backward compatibility.
2. **Separate slug query in purchaseDrinks:** Named the query result `eventForSlug` to avoid variable name clash with other scoped variables in the function.
3. **Conditional Google Pay config:** The `googlePay` mount config is only included when `NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID` is set. This prevents errors in environments where Google Pay onboarding hasn't been completed yet.
4. **Client-side polling strategy:** The callback page polls up to 5 times (2s intervals, 10s total) to handle the race condition where the user arrives before the webhook processes the payment. After 5 attempts, whatever status is returned (likely PENDING) is shown to the user.

## Self-Check: PASSED
