# Phase 13: SumUp SDK Migration

## Goal
Replace the custom `src/lib/sumup.ts` client with the official `@sumup/sdk` package (v0.1.1). All existing payment flows must continue working unchanged.

## Requirements
- **SDK-01**: Replace custom client with `@sumup/sdk`
- **SDK-02**: Existing checkout and refund operations work unchanged
- **SDK-03**: Environment variables documented in `.env.local.example`

## Key Files
- `src/lib/sumup.ts` -- current custom client (3 functions: createCheckout, getCheckout, refundTransaction)
- `src/app/api/webhooks/sumup/route.ts` -- webhook handler (calls getCheckout)
- All files that import from `@/lib/sumup` (ticket/drink purchase actions, refund)

## SDK Details
- Package: `@sumup/sdk` v0.1.1 (published 2026-03-04, zero dependencies)
- Resources: `checkouts`, `transactions`, `payouts`, `customers`, `receipts`, `merchants`
- Auth: `new SumUp({ apiKey: process.env.SUMUP_API_KEY })`
- Multi-version handled internally by SDK (v0.1 checkouts, v2.1 transactions, v1.0 payouts)

## Research
- See `.planning/research/v1.2-sumup-api.md` for complete API endpoint catalog
- SDK type definitions inspected -- full TypeScript coverage for all resources

## Dependencies
- None (first phase)

## Success Criteria
- `@sumup/sdk` installed and SumUp client singleton exported
- `createCheckout()`, `getCheckout()`, `refundTransaction()` reimplemented via SDK methods
- All import sites updated
- `.env.local.example` includes `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE`
- Existing payment flows work unchanged
