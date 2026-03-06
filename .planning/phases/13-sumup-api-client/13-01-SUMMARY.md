---
phase: 13-sumup-api-client
plan: "01"
subsystem: payments
tags: [sumup, sdk, migration, payments]
dependency_graph:
  requires: []
  provides: [sdk-singleton, checkout-api, refund-api]
  affects: [organizer-events, guest-menu, webhooks, refunds]
tech_stack:
  added: ["@sumup/sdk@0.1.1"]
  patterns: [singleton, sdk-wrapper, error-normalization]
key_files:
  created: []
  modified:
    - src/lib/sumup.ts
    - .env.local.example
    - package.json
    - package-lock.json
decisions:
  - "Singleton SDK pattern at module level for reuse across requests and future phases"
  - "Export raw SDK client (sumup) for Phase 14-18 direct access"
  - "Preserve exact return type shapes via type assertions for backward compatibility"
metrics:
  duration_seconds: 94
  completed: "2026-03-06T04:32:25Z"
  tasks_completed: 3
  tasks_total: 3
requirements_satisfied: [SDK-01, SDK-02, SDK-03]
---

# Phase 13 Plan 01: SumUp SDK Migration Summary

Migrated custom fetch-based SumUp client to official @sumup/sdk v0.1.1 singleton with error-normalizing wrappers preserving all 3 function signatures.

## What Was Done

### Task 1: Install @sumup/sdk and rewrite src/lib/sumup.ts
- **Commit:** 091a57c
- Installed `@sumup/sdk@0.1.1` with exact pinning (no caret)
- Rewrote `src/lib/sumup.ts` from 93 lines of raw fetch calls to 73 lines of SDK wrappers
- SDK singleton instantiated once at module level, exported for future phases
- Three wrapper functions: `createCheckout`, `getCheckout`, `refundTransaction`
- Error normalization: `APIError` caught and rethrown as standard `Error` with same message format
- TypeScript check passed with zero errors

### Task 2: Document SumUp env vars in .env.local.example
- **Commit:** fd26d3a
- Added `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE` entries with `# SumUp` header
- All existing env vars preserved unchanged

### Task 3: Build verification and import check
- **No commit** (verification only, no file changes)
- `npm run build` completed successfully -- all routes compiled
- Verified zero `fetch()` calls remain in `src/lib/sumup.ts`
- Verified zero references to old `SUMUP_API_BASE` constant
- Confirmed all 4 call sites import from `@/lib/sumup` unchanged:
  - `src/app/(organizer)/organizer/events/actions.ts` -- `createCheckout`
  - `src/app/(public)/events/[slug]/menu/actions.ts` -- `createCheckout`
  - `src/app/api/webhooks/sumup/route.ts` -- `getCheckout`
  - `src/app/(public)/tickets/refund-actions.ts` -- `refundTransaction`
- SDK version `"0.1.1"` confirmed in package.json (exact, no caret)

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS - zero errors |
| `npm run build` | PASS - all routes compiled |
| `grep fetch( src/lib/sumup.ts` | PASS - 0 matches |
| `grep SUMUP_API_BASE src/lib/sumup.ts` | PASS - 0 matches |
| Call sites unchanged (4 imports) | PASS |
| SDK version exact `0.1.1` | PASS |
| Env vars documented | PASS - both present |

## Requirements Satisfied

- **SDK-01:** `src/lib/sumup.ts` uses `@sumup/sdk` v0.1.1 singleton, no raw fetch calls remain
- **SDK-02:** All 4 call sites work without any code changes -- verified by successful `npm run build`
- **SDK-03:** `.env.local.example` documents `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE`

## Deviations from Plan

None -- plan executed exactly as written.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/sumup.ts` | Complete rewrite: fetch-based -> SDK wrappers |
| `.env.local.example` | Appended SumUp env var section |
| `package.json` | Added `@sumup/sdk: "0.1.1"` dependency |
| `package-lock.json` | Updated lockfile with SDK |

## Decisions Made

1. **Singleton pattern:** SDK client instantiated once at module scope, reused across all requests. Avoids per-request overhead and enables future phases to import `sumup` directly.
2. **Export raw client:** `export { sumup }` exposes the SDK singleton for Phase 14+ (finance dashboard, payouts, APMs) which need direct SDK method access.
3. **Type assertions for backward compat:** SDK types mark fields as optional (conservative OpenAPI spec), but create/get always return them. Assertions preserve exact return types that call sites depend on.

## Self-Check: PASSED

- All 4 files exist on disk
- Both commits (091a57c, fd26d3a) exist in git history
- SUMMARY.md created at expected path
