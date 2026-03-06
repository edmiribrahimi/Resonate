# Phase 13: SumUp API Client Enhancement

## Goal
Refactor the SumUp client library to support multi-version API calls (v0.1, v1.0, v1.1, v2.1) and add TypeScript types for all new endpoints needed in v1.2.

## Requirements
- **API-01**: Multi-version API support from single base URL
- **API-02**: TypeScript types for transactions, payouts, receipts
- **API-03**: Environment variables documented in `.env.local.example`

## Key Files
- `src/lib/sumup.ts` -- existing SumUp client (currently hardcoded to v0.1)

## Research
- See `.planning/research/v1.2-sumup-api.md` for complete API endpoint catalog
- Transactions API uses v2.1, Payouts uses v1.0, Receipts uses v1.1, Checkouts/Refunds stay on v0.1

## Dependencies
- None (first phase)

## Success Criteria
- `listTransactions()`, `getTransaction()`, `listPayouts()` functions added
- All response types defined as TypeScript interfaces
- Existing checkout/refund functions continue to work unchanged
- `.env.local.example` includes `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE`
