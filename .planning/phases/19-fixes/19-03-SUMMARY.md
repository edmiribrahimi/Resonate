---
phase: 19-fixes
plan: 03
subsystem: admin-finance
tags: [search, refund, tickets, member-lookup]
dependency_graph:
  requires: [19-01]
  provides: [member-search-ticket-refund]
  affects: [admin-finance-page]
tech_stack:
  added: []
  patterns: [service-client-bypass-rls, optimistic-ui-update, conditional-fee-warning]
key_files:
  created: []
  modified:
    - src/app/(admin)/admin/finance/actions.ts
    - src/components/admin/TransactionList.tsx
    - src/components/admin/RefundDialog.tsx
decisions:
  - Service client used to bypass RLS for admin search (already behind requireMaster)
  - Search results limited to completed pending_purchases only (tickets, never drinks)
  - Fee warning conditional on payoutDate presence (pre-payout refunds have no fee penalty)
  - Search mode passes feeAmount=0 and payoutDate=null to RefundDialog (no misleading warning)
metrics:
  duration: 176s
  completed: "2026-03-06T22:56:13Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 19 Plan 03: Member Search for Ticket Refunds Summary

**Member-name search on finance page for quick ticket refunds with conditional fee warning on RefundDialog.**

## What Was Done

### Task 1: searchTicketsByMember Server Action
Added a new server action to `actions.ts` that:
- Accepts a name query string, requires master role
- Searches profiles by `full_name` ILIKE (case-insensitive partial match, limit 10)
- Queries `pending_purchases` joined with `ticket_tiers` and `events` for completed purchases (limit 20)
- Fetches SumUp checkout for each purchase to retrieve `transaction_code`
- Returns `TicketSearchResult[]` with member name, email, event title, tier label, amount, currency, purchase date, transaction code, checkout ID, and status

### Task 2: Member Search UI + Conditional Fee Warning
Updated `TransactionList.tsx`:
- Added search input above existing date/status filters with Search and Clear buttons
- Search mode displays ticket purchase cards with member info, event details, and refund button
- Refund button on search results opens the same RefundDialog used by the regular transaction list
- Optimistic update on search results after successful refund (status changes to REFUNDED)
- Regular transaction list refund button unchanged (works for all eligible transactions)

Updated `RefundDialog.tsx`:
- Added optional `payoutDate` prop
- Fee warning now only shows when `payoutDate` is truthy AND `feeAmount > 0`
- Search mode refunds pass `feeAmount=0` and `payoutDate=null` (no warning displayed)

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 83e50bd | feat(19-03): add searchTicketsByMember server action |
| 2 | 4da42d5 | feat(19-03): member search UI and conditional fee warning |

## Verification

- `npx tsc --noEmit` passes with no errors
- All expected patterns found in TransactionList.tsx (searchTicketsByMember, isSearchMode, searchResults)

## Self-Check: PASSED

All files exist, all commits verified.
