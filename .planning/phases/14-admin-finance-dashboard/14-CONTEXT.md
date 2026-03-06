# Phase 14: Admin Finance Dashboard

## Goal
Create a new admin finance section with transaction list, cursor-based pagination, date/status filters, and transaction detail view.

## Requirements
- **FIN-01**: "Finance" tab in admin navigation (master only)
- **FIN-02**: Transaction list page at `/admin/finance`
- **FIN-03**: Cursor-based pagination (prev/next)
- **FIN-04**: Date range and status filters
- **FIN-05**: Transaction detail view with fees, card info
- **FIN-06**: ECOM filter applied by default

## Key Files
- `src/components/admin/AdminNav.tsx` -- add Finance tab
- `src/app/(admin)/admin/finance/` -- new route (to create)
- `src/lib/sumup.ts` -- uses `listTransactions()`, `getTransaction()` from Phase 13

## Dependencies
- Phase 13 (SumUp API client functions)

## Success Criteria
- Admin can see all SumUp transactions in a paginated list
- Filters narrow results by date range and status
- Click on transaction reveals fee/card details
- Only ECOM transactions shown (no POS/terminal)
