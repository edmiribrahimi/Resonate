---
phase: 16-payout-reports
plan: 01
subsystem: admin-finance
tags: [payouts, sumup-sdk, admin-ui, date-filter]
dependency_graph:
  requires: [13-sdk-migration]
  provides: [payout-list-page, finance-sub-navigation, listPayouts-action]
  affects: [admin-finance-page]
tech_stack:
  added: []
  patterns: [server-action-data-fetch, client-component-filters, sub-navigation-tabs]
key_files:
  created:
    - src/components/admin/FinanceSubNav.tsx
    - src/app/(admin)/admin/finance/payouts/page.tsx
    - src/components/admin/PayoutList.tsx
  modified:
    - src/app/(admin)/admin/finance/page.tsx
    - src/app/(admin)/admin/finance/actions.ts
decisions:
  - FinanceSubNav uses exact match for Transactions tab, startsWith for Payouts to prevent both being active
  - Initial useEffect with [] deps pattern (same as TransactionList) for predictable mount behavior
  - Default 30-day date range calculated inline at component level, not in separate utility
metrics:
  duration: 170s
  completed: "2026-03-06T17:14:40Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
requirements_satisfied: [PAY-01, PAY-02, PAY-03]
---

# Phase 16 Plan 01: Payout Reports Summary

Finance sub-navigation (Transactions/Payouts tabs) and payout list page at /admin/finance/payouts with date range filter calling sumup.payouts.list(), colored badges for 5 payout types and 2 statuses, responsive desktop table + mobile cards.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create FinanceSubNav, add to finance page, add listPayouts server action | 1ccbf7f | FinanceSubNav.tsx, finance/page.tsx, actions.ts |
| 2 | Create payouts page and PayoutList client component | 07ace74 | payouts/page.tsx, PayoutList.tsx |

## What Was Built

### FinanceSubNav Component
Client component with two tabs: "Transactions" (links to /admin/finance, exact pathname match) and "Payouts" (links to /admin/finance/payouts, startsWith match). Uses accent color for active state, muted for inactive. Added to both the existing finance page and the new payouts page.

### listPayouts Server Action
Added to existing actions.ts file. Calls `sumup.payouts.list(merchantCode, { start_date, end_date, format: "json", limit, order })` with requireMaster() auth check. Returns flat array (FinancialPayouts type). Default limit 100, default order desc.

### Payouts Page
Server component at /admin/finance/payouts matching the exact layout of the existing finance page: auth header check, AdminNav, FinanceSubNav, PayoutList, MobileNav. Redirects non-master users to /dashboard.

### PayoutList Component
Client component with:
- Date range filter (From/To date inputs + Apply button), default last 30 days
- Desktop table (hidden on mobile) with columns: Date, Type, Amount, Fee, Status
- Mobile card layout (hidden on desktop) with compact payout info
- TypeBadge with 5 colors: PAYOUT (green), CHARGE_BACK_DEDUCTION (red), REFUND_DEDUCTION (orange), DD_RETURN_DEDUCTION (yellow), BALANCE_DEDUCTION (blue)
- StatusBadge: SUCCESSFUL (green), FAILED (red)
- Loading skeleton, error state with retry button, empty state message
- No pagination (API returns flat array filtered by date range)

## Decisions Made

1. **Exact match for Transactions tab** -- Using `pathname === "/admin/finance"` prevents both tabs being active when on /admin/finance/payouts
2. **Initial useEffect with [] deps** -- Follows TransactionList pattern for predictable mount-time data fetch, avoids dependency on fetchPayouts callback
3. **Inline default date calculation** -- 30-day range calculated at component level using `new Date()` and `setDate(-30)`, no separate utility needed

## Deviations from Plan

None -- plan executed exactly as written.

## Pre-existing Issues Noted

**Build failure in TransactionList.tsx** -- The existing `TransactionList.tsx` imports `RefundDialog` from `@/components/admin/RefundDialog`, but this file is untracked (not committed). This is Phase 15 (Refunds) work that was not fully committed. The `next build` fails due to this missing module. This is NOT caused by Phase 16 changes. TypeScript compilation of all Phase 16 files passes cleanly.

## Requirements Satisfied

- **PAY-01**: /admin/finance/payouts page exists with auth check, accessible via FinanceSubNav
- **PAY-02**: Date range filter with start/end date pickers, default last 30 days, Apply button triggers refetch
- **PAY-03**: Each payout displays amount, currency, date, fee, status (SUCCESSFUL/FAILED), type (5 variants with colored badges)

## Self-Check: PASSED

- All 3 created files exist on disk
- All 2 modified files confirmed in git history
- Both task commits (1ccbf7f, 07ace74) verified in git log
