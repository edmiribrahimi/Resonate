---
phase: 14-admin-finance-dashboard
plan: "01"
subsystem: admin-finance
tags: [admin, finance, transactions, sumup, dashboard]
dependency_graph:
  requires: [sdk-singleton]
  provides: [finance-nav, finance-page, transaction-actions, transaction-list]
  affects: [admin-nav, admin-members, admin-events, admin-newsletter, admin-venues, admin-artists]
tech_stack:
  added: []
  patterns: [server-actions, cursor-pagination-state, conditional-nav, responsive-table-cards]
key_files:
  created:
    - src/app/(admin)/admin/finance/actions.ts
    - src/app/(admin)/admin/finance/page.tsx
    - src/components/admin/TransactionList.tsx
  modified:
    - src/components/admin/AdminNav.tsx
    - src/app/(admin)/admin/members/page.tsx
    - src/app/(admin)/admin/events/page.tsx
    - src/app/(admin)/admin/newsletter/page.tsx
    - src/app/(admin)/admin/venues/page.tsx
    - src/app/(admin)/admin/artists/page.tsx
decisions:
  - "AdminNav receives optional role prop for conditional Finance tab -- backward compatible"
  - "All 5 existing admin pages pass role to AdminNav so Finance tab is visible everywhere for master"
  - "Server actions use requireMaster() guard pattern from newsletter actions"
  - "Cursor extraction done server-side -- client only sees nextCursor string and nextCursorParam"
  - "TransactionList state includes nextCursor/cursorStack/hasMore ready for Plan 02 pagination"
metrics:
  duration_seconds: 189
  completed: "2026-03-06T16:39:16Z"
  tasks_completed: 2
  tasks_total: 2
requirements_satisfied: [FIN-01, FIN-02, FIN-06]
---

# Phase 14 Plan 01: Admin Finance Dashboard Foundation Summary

Finance tab in AdminNav (master-only via role prop), /admin/finance page with ECOM-filtered transaction listing via SumUp SDK server actions, and responsive TransactionList component with table/card layouts.

## What Was Done

### Task 1: Add conditional Finance tab to AdminNav and create server actions
- **Commit:** 48b8760
- Modified `AdminNav.tsx` to accept optional `role?: UserRole | null` prop
- Computed `allTabs` conditionally: Finance tab appended only when `role === "master"`
- Updated all 5 existing admin pages (`members`, `events`, `newsletter`, `venues`, `artists`) to pass `role={role}` to `<AdminNav>`
- Created `src/app/(admin)/admin/finance/actions.ts` with two server actions:
  - `listTransactions`: fetches ECOM transactions with `payment_types: ["ECOM"]` hardcoded, extracts next cursor from links array, returns `{ items, nextCursor, nextCursorParam, hasMore }`
  - `getTransactionDetail`: fetches full transaction detail by transaction code
- Both actions guard with `requireMaster()` before SDK calls
- TypeScript check passed with zero errors

### Task 2: Create finance page and TransactionList client component
- **Commit:** 48b8760 (same commit -- atomic per plan instructions)
- Created `src/app/(admin)/admin/finance/page.tsx` following admin page pattern: Server Component with `x-user-role` header check, redirects non-master to `/dashboard`
- Created `src/components/admin/TransactionList.tsx` as client component:
  - Fetches transactions on mount via `useEffect` calling `listTransactions({})`
  - Desktop: full table with Date, Description, Amount, Status columns
  - Mobile: card layout with same information
  - Status badges: green (SUCCESSFUL), red (FAILED/CHARGE_BACK), yellow (PENDING), zinc (CANCELLED), blue (REFUNDED)
  - Loading skeleton: 5 animated pulse rows
  - Error state: red border card with retry button
  - Empty state: "No transactions found" card
  - State includes `nextCursor`, `nextCursorParam`, `cursorStack`, `hasMore` for Plan 02
- `npm run build` passed -- `/admin/finance` route compiled successfully

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS - zero errors |
| `npm run build` | PASS - all routes compiled, /admin/finance present |
| AdminNav backward compat | PASS - role defaults to undefined, Finance tab hidden |
| AdminNav master tab | PASS - Finance tab shows when role="master" |
| payment_types ECOM | PASS - hardcoded in listTransactions |
| requireMaster() guard | PASS - both actions check role before SDK calls |
| Cursor state shape | PASS - nextCursor/cursorStack/hasMore in component state |

## Requirements Satisfied

- **FIN-01:** Finance tab visible in AdminNav only for master role users (role prop check)
- **FIN-02:** `/admin/finance` page shows transaction list with amount, date, status, description columns
- **FIN-06:** `payment_types: ["ECOM"]` hardcoded in `listTransactions` server action

## Deviations from Plan

None -- plan executed exactly as written.

## Files Modified

| File | Change |
|------|--------|
| `src/components/admin/AdminNav.tsx` | Added role prop, conditional Finance tab |
| `src/app/(admin)/admin/members/page.tsx` | Pass role to AdminNav |
| `src/app/(admin)/admin/events/page.tsx` | Pass role to AdminNav |
| `src/app/(admin)/admin/newsletter/page.tsx` | Pass role to AdminNav |
| `src/app/(admin)/admin/venues/page.tsx` | Pass role to AdminNav |
| `src/app/(admin)/admin/artists/page.tsx` | Pass role to AdminNav |
| `src/app/(admin)/admin/finance/actions.ts` | NEW - server actions for transaction fetch |
| `src/app/(admin)/admin/finance/page.tsx` | NEW - finance page server component |
| `src/components/admin/TransactionList.tsx` | NEW - transaction list client component |

## Decisions Made

1. **AdminNav role prop:** Optional prop with undefined default ensures full backward compatibility. All existing `<AdminNav />` calls work unchanged.
2. **All admin pages updated:** Rather than only passing role from the finance page, all 5 existing admin pages now pass `role={role}` so the Finance tab is visible from any admin page for master users.
3. **Server-side cursor extraction:** The `listTransactions` action parses the SumUp `links[]` array server-side and returns a simple `nextCursor` string + `nextCursorParam` to the client. This keeps cursor logic out of the client component.
4. **Typed statuses with cast:** The `statuses` parameter accepts `string[]` from the client but is cast to the SDK's union type at the action boundary, keeping the client API flexible.
5. **Pagination state prepared:** Component state includes `nextCursor`, `cursorStack`, `hasMore`, and `nextCursorParam` even though Plan 01 renders no pagination UI -- ensures Plan 02 can add it without state refactoring.

## Self-Check: PASSED
