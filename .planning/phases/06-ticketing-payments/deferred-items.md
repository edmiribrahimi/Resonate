# Phase 6: Deferred Items

## Pre-existing Build Error: SumUp Webhook Route

**Found during:** 06-02 Task 2 verification
**File:** `src/app/api/webhooks/sumup/route.ts`
**Issue:** Route imports `@/emails/ticket-confirmation` (does not exist yet) and `qrcode` package (not installed). This causes `next build` to fail on `/api/webhooks/sumup` page data collection.
**Not caused by:** 06-02 changes (verified by stashing changes and rebuilding).
**Expected resolution:** Later plan in Phase 6 that implements ticket confirmation email and installs qrcode dependency.
