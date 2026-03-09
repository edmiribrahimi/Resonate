---
phase: 23-analytics-dashboard
plan: 03
subsystem: analytics
tags: [analytics, member-insights, cross-event, referrals, guest-conversion]
dependency_graph:
  requires: [getServiceClient, CountUp, AnimatedSection, StaffNav, MobileNav]
  provides: [fetchMemberSpendProfiles, fetchRepeatAttendeeRate, fetchReferralChains, fetchGuestConversion, MemberSpendTable, RepeatAttendeeCard, ReferralChainTable, GuestConversionCard]
  affects: [admin-analytics]
tech_stack:
  added: []
  patterns: [service-client-rls-bypass, details-summary-collapsible, parallel-promise-all, responsive-table-cards]
key_files:
  created:
    - src/lib/analytics/cross-event-queries.ts
    - src/components/analytics/MemberSpendTable.tsx
    - src/components/analytics/RepeatAttendeeCard.tsx
    - src/components/analytics/ReferralChainTable.tsx
    - src/components/analytics/GuestConversionCard.tsx
    - src/app/(admin)/admin/analytics/members/page.tsx
    - src/app/(admin)/admin/analytics/members/loading.tsx
  modified: []
decisions:
  - All 4 queries use getServiceClient() to bypass RLS (cross-user aggregation requires service role)
  - Guest conversion detection via profile.created_at > drink_order.created_at (order placed before registration = was guest)
  - ReferralChainTable uses native HTML details/summary for collapsible rows (no JS state needed)
  - MemberSpendTable follows DrinkSalesBreakdown responsive pattern (hidden/block for table vs cards)
metrics:
  duration: 200s
  completed: "2026-03-09T21:29:00Z"
  tasks: 2
  files: 7
requirements: [ANLY-09, ANLY-12, ANLY-13, ANLY-14]
---

# Phase 23 Plan 03: Member Insights Cross-Event Intelligence Summary

Cross-event member intelligence page with ranked spend profiles, repeat attendee rate, referral chain effectiveness, and guest-to-member conversion tracking -- all using service client for RLS bypass.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Cross-event query module + display components | 68e02a4 | cross-event-queries.ts, MemberSpendTable.tsx, RepeatAttendeeCard.tsx, ReferralChainTable.tsx, GuestConversionCard.tsx |
| 2 | Admin member insights page + skeleton | b5ebf33 | members/page.tsx, members/loading.tsx |

## What Was Built

### Query Functions (cross-event-queries.ts)
- **fetchMemberSpendProfiles**: Parallel fetch of profiles, tickets, and completed drink_orders. Builds spendMap aggregating ticket + drink spend per user with unique event tracking via Set. Returns top N members sorted by total spend.
- **fetchRepeatAttendeeRate**: Groups tickets by user_id, counts distinct event_ids per user. Returns total members, repeat members (2+ events), and percentage rate.
- **fetchReferralChains**: Parallel fetch of profiles (with referred_by), tickets, and drink_orders. Builds per-user spend, groups by referrer, sums chain spend. Returns top 20 referrers sorted by total chain spend.
- **fetchGuestConversion**: Compares drink_order.created_at with profile.created_at to detect orders placed before user registration (guest who later converted). Returns distinct conversion count, total guest orders, and converted spend.

### Display Components
- **MemberSpendTable**: Server component with responsive layout -- desktop table with rank/name/email/tickets/drinks/total/events columns; mobile card layout with key stats. EUR formatting.
- **RepeatAttendeeCard**: Client component with CountUp-animated percentage and "N of M members attended 2+ events" secondary text.
- **ReferralChainTable**: Server component with native details/summary for collapsible referral chains. Desktop table rows expand to show referred members; mobile cards with collapsible detail sections.
- **GuestConversionCard**: Client component with CountUp-animated conversion count, guest order count, and total spend. Zero-state message when no conversions.

### Page & Loading
- **Admin member insights page** at /admin/analytics/members: Master-only role guard, Promise.all for 4 parallel queries, AnimatedSection layout with KPI grid + table sections.
- **Loading skeleton**: Mirrors page layout with animate-pulse placeholders for header, StaffNav, KPI cards, tables.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- TypeScript compilation: PASSED (zero errors)
- Full production build: PASSED (all routes compiled)
- `/admin/analytics/members` route present in build output
- All 4 query functions use getServiceClient() for RLS bypass
- MemberSpendTable shows responsive layout (hidden sm:block / sm:hidden)
- Guest conversion uses profile.created_at > order.created_at detection
- Referral chains sorted by totalChainSpend descending

## Self-Check: PASSED

All 7 files verified on disk. Both commits (68e02a4, b5ebf33) verified in git log.
