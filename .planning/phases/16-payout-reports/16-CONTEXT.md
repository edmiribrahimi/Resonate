# Phase 16: Payout Reports

## Goal
Admin can view SumUp payout (bank transfer) history with date range filtering and payout type breakdown.

## Requirements
- **PAY-01**: Payout list page at `/admin/finance/payouts`
- **PAY-02**: Date range filter with start/end date pickers
- **PAY-03**: Payout details (amount, date, status, type)

## Key Files
- `src/lib/sumup.ts` -- uses `listPayouts()` from Phase 13
- `src/app/(admin)/admin/finance/payouts/` -- new route (to create)

## Dependencies
- Phase 13 (SumUp API client for `listPayouts()`)
- Phase 14 (admin finance section structure -- uses same nav/layout)

## Success Criteria
- Admin can browse payout history with date range selection
- Each payout shows amount, currency, date, status, type
- Handles multiple payout types: PAYOUT, CHARGE_BACK_DEDUCTION, REFUND_DEDUCTION
