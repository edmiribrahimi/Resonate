# Phase 15: Refund Management

## Goal
Enable admin to issue full or partial refunds from the transaction detail view with confirmation flow and fee warnings.

## Requirements
- **REF-01**: Refund button on eligible transactions
- **REF-02**: Confirmation dialog with full/partial choice
- **REF-03**: Partial refund with custom amount validation
- **REF-04**: Optimistic UI update after refund
- **REF-05**: Non-refundable fee warning

## Key Files
- Transaction detail component from Phase 14
- `src/lib/sumup.ts` -- existing `refundTransaction()` function
- New server action for refund flow

## Dependencies
- Phase 14 (transaction detail view)

## Gotchas
- SumUp docs say refunds may require Authorization Code flow (not Client Credentials). Current API key may work but needs sandbox testing.
- SumUp fees on original transaction are NOT refunded -- must warn admin.
- No webhook for refund events -- must verify via transaction status polling.

## Success Criteria
- Admin can refund any successful, non-refunded transaction
- Partial refund validates amount <= original
- Fee warning displayed before confirmation
- Transaction list reflects updated status after refund
