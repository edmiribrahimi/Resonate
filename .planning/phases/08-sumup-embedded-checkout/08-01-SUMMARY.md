---
phase: 08-sumup-embedded-checkout
plan: 01
subsystem: payments
tags: [sumup, embedded-checkout, card-widget, backend]
dependency-graph:
  requires: []
  provides: [createCheckout-card-mode, SumUpCardWidget-component, sumup-sdk-global]
  affects: [purchaseTicket, TierSelection, PendingIntentHandler]
tech-stack:
  added: [sumup-card-widget-sdk]
  patterns: [useRef-stable-callbacks, global-sdk-script]
key-files:
  created:
    - src/components/SumUpCardWidget.tsx
  modified:
    - src/lib/sumup.ts
    - src/app/(organizer)/organizer/events/actions.ts
    - src/app/(public)/events/[slug]/TierSelection.tsx
    - src/app/(public)/events/[slug]/PendingIntentHandler.tsx
    - src/app/layout.tsx
decisions:
  - "Used useRef for callback stability to prevent widget re-mounts on parent re-renders"
  - "Placed SDK script in root layout (not per-page) for site-wide availability"
metrics:
  duration: 152s
  completed: 2026-03-06T00:08:28Z
---

# Phase 8 Plan 01: Backend Changes + SumUpCardWidget Summary

Switched SumUp checkout from hosted redirect to embedded card widget mode, removing hosted_checkout and redirect_url from API calls and returning checkoutId for frontend widget consumption.

## What Was Done

### Task 1: Modify createCheckout() and purchaseTicket()

- **src/lib/sumup.ts**: Removed `redirectUrl` from params interface, removed `redirect_url` and `hosted_checkout: { enabled: true }` from the JSON body sent to SumUp API. Updated return type to remove `hosted_checkout_url`. Kept `return_url` for webhook flow (critical for SUMP-03).
- **src/app/(organizer)/organizer/events/actions.ts**: Removed `redirectUrl` construction. Updated `createCheckout()` call to omit `redirectUrl`. Changed return from `{ checkoutUrl: response.hosted_checkout_url }` to `{ checkoutId: response.id }`.

### Task 2: Create SumUpCardWidget and Load SDK

- **src/components/SumUpCardWidget.tsx**: Created new "use client" component with full TypeScript types for the SumUp Card Widget SDK. Uses `useRef` for stable callback references and proper mount/unmount lifecycle handling (including React Strict Mode double-mount).
- **src/app/layout.tsx**: Added `next/script` import and SumUp SDK script tag with `strategy="afterInteractive"`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript errors in checkoutUrl consumers**
- **Found during:** Task 1 verification
- **Issue:** `TierSelection.tsx` and `PendingIntentHandler.tsx` referenced `result.checkoutUrl` which no longer exists (now `result.checkoutId`). TypeScript compilation failed with 4 errors.
- **Fix:** Updated both files to use `result.checkoutId` with TODO comments for Plan 08-02 (which will replace the redirect logic with the checkout modal).
- **Files modified:** `src/app/(public)/events/[slug]/TierSelection.tsx`, `src/app/(public)/events/[slug]/PendingIntentHandler.tsx`
- **Commit:** 62f4dbe

## Commits

| Hash | Message |
|------|---------|
| 62f4dbe | feat(payments): switch SumUp from hosted checkout to embedded card widget |

## Verification Results

- TypeScript compilation: PASSED (no errors)
- `createCheckout()` no longer contains `hosted_checkout` or `redirect_url`: CONFIRMED
- `createCheckout()` retains `return_url`: CONFIRMED
- `purchaseTicket()` returns `checkoutId`: CONFIRMED
- `SumUpCardWidget.tsx` mounts/unmounts correctly: CONFIRMED
- `layout.tsx` loads SumUp SDK: CONFIRMED

## Self-Check: PASSED

All created files exist, all modified files verified, commit 62f4dbe confirmed in git history.
