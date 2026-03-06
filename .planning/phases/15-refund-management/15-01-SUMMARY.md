---
phase: 15-refund-management
plan: 01
subsystem: admin-finance-refunds
tags: [refund, sumup, admin, dialog, optimistic-update]
dependency_graph:
  requires: [14-admin-finance-dashboard]
  provides: [refund-management-ui, refund-server-action]
  affects: [TransactionList, admin-finance-actions]
tech_stack:
  added: []
  patterns: [useTransition-refund, optimistic-state-update, modal-overlay-pattern]
key_files:
  created:
    - src/components/admin/RefundDialog.tsx
  modified:
    - src/components/admin/TransactionList.tsx
    - src/app/(admin)/admin/finance/actions.ts
decisions:
  - Refund button inside TransactionDetailInline (detail already loaded, fee_amount available)
  - StatusBadge enhanced with refundedAmount prop for PARTIALLY REFUNDED display
  - handleRefundComplete invalidates detailCache instead of optimistic detail update
  - refundTransactionAction was already present in actions.ts from Phase 16 commit (no-op edit)
metrics:
  duration: 250s
  completed: "2026-03-06T17:15:35Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 15 Plan 01: Refund Management Summary

Full and partial refund support from admin transaction detail view with confirmation dialog, fee warning, eligibility gating, and optimistic UI update.

## What Was Built

### Task 1: Server Action, Refund Button, and Partially Refunded Badge
**Commit:** `9e7a711`

- **refundTransactionAction** in `actions.ts`: wraps `refundTransaction()` from `sumup.ts` with `requireMaster()` auth guard. Accepts optional `amount` param (undefined = full refund, number = partial).
- **Refund button** in `TransactionDetailInline`: appears only on eligible transactions (`status === "SUCCESSFUL"` AND `refunded_amount < amount`). Red border styling matching `RefundActions.tsx` pattern.
- **StatusBadge** enhanced: accepts optional `refundedAmount` prop. Displays "PARTIALLY REFUNDED" in orange when `status === "SUCCESSFUL"` and `refundedAmount > 0`.
- **DesktopTransactionRow** updated: passes `onRefundClick` prop through to `TransactionDetailInline`.
- **Mobile card layout** updated: both StatusBadge and TransactionDetailInline receive refund-related props.
- **refundTarget state** and **handleRefundComplete** callback in TransactionList: manages dialog lifecycle, optimistically updates `transactions` array (adjusts `status` and `refunded_amount`), invalidates `detailCache` for fresh re-fetch.
- **RefundDialog rendering** wired at bottom of TransactionList JSX with all required props from state and detailCache.

### Task 2: RefundDialog Component
**Commit:** `9e7a711` (same commit, both tasks)

- **RefundDialog.tsx**: new client component with full/partial toggle, amount input, fee warning, and confirmation flow.
- **Full/Partial toggle**: two radio-style buttons. Full refund = `maxRefundable` (amount - refundedAmount). Partial = custom input.
- **Amount validation**: partial amount must be > 0 and <= maxRefundable. Error message shown inline.
- **Fee warning**: yellow box displays non-refundable SumUp fee amount (from `feeAmount` prop) when > 0.
- **Double-click protection**: `useTransition` with `isPending` disables both Confirm and Cancel buttons during processing.
- **Error handling**: catches server action errors and displays in red within the dialog.
- **Summary line**: shows exact refund amount before confirmation.
- **Modal pattern**: `div` + fixed overlay matching `RefundActions.tsx` and `RefundRequestButton.tsx` (not `<dialog>`).

## Requirements Satisfied

| Requirement | How |
|-------------|-----|
| REF-01 | Refund button appears only on SUCCESSFUL transactions with refunded_amount < amount |
| REF-02 | RefundDialog has full/partial toggle with custom amount input for partial |
| REF-03 | Partial amount validated: > 0 and <= (transactionAmount - refundedAmount) |
| REF-04 | handleRefundComplete optimistically updates transactions state and invalidates detailCache |
| REF-05 | Yellow warning box displays SumUp fee as non-refundable |

## Deviations from Plan

### Note: refundTransactionAction already committed

The `refundTransactionAction` function and its import were already present in `actions.ts` from the Phase 16 commit (1ccbf7f). The Phase 16 executor had modified actions.ts and the linter auto-saved the refund additions. The edit was effectively a no-op but the function exists and works correctly. No action required.

No other deviations -- plan executed exactly as written.

## Decisions Made

1. **Refund button placement inside detail view**: The refund button appears inside `TransactionDetailInline` (not in the table row) because `fee_amount` for the dialog is only available from the detail cache, which is loaded when the row is expanded.
2. **StatusBadge enhanced instead of separate component**: Added `refundedAmount` prop to existing `StatusBadge` rather than creating a new component, keeping the UI consistent and avoiding duplication.
3. **Cache invalidation over optimistic detail update**: `handleRefundComplete` deletes the detail cache entry instead of optimistically updating it, ensuring the next expand fetches fresh data from SumUp with accurate post-refund values.
4. **Single commit for both tasks**: Since Task 2 (RefundDialog) is imported by Task 1 changes, both tasks were committed together to avoid a broken intermediate state.

## Verification

- `npx tsc --noEmit` -- passed with no errors
- `npm run build` -- passed, all routes compile successfully
- refundTransactionAction calls requireMaster() before processing
- Refund button only on eligible transactions (SUCCESSFUL + not fully refunded)
- RefundDialog shows full/partial toggle, amount input, fee warning
- Partial amount validated: 0 < amount <= maxRefundable
- After refund: transactions list updated optimistically, detailCache invalidated
- Double-click prevented via disabled={isPending}
- "PARTIALLY REFUNDED" badge shown in orange for partially refunded transactions

## Self-Check: PASSED

All files verified present, all commit hashes found, all key patterns confirmed in source files.
