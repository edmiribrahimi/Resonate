---
phase: 23-analytics-dashboard
plan: 01
subsystem: analytics
tags: [dashboard, kpi, admin, navigation]
dependency_graph:
  requires: [22-02-per-event-analytics, 21-01-motion-foundation]
  provides: [admin-kpi-dashboard, analytics-nav-tab]
  affects: [StaffNav, admin-analytics-route]
tech_stack:
  added: []
  patterns: [service-client-rls-bypass, parallel-promise-all, countup-animation]
key_files:
  created:
    - src/lib/analytics/dashboard-queries.ts
    - src/components/analytics/KPIDashboard.tsx
    - src/components/analytics/RecentActivityFeed.tsx
    - src/app/(admin)/admin/analytics/page.tsx
    - src/app/(admin)/admin/analytics/loading.tsx
  modified:
    - src/components/staff/StaffNav.tsx
decisions:
  - "fetchKPIDashboard uses getServiceClient() to bypass RLS for cross-user revenue aggregation"
  - "Revenue is gross (tickets + drinks) -- no refund deduction for simplicity at overview level"
  - "Recent activity merges latest 10 tickets + 10 drinks, sorts by date, takes top 10"
  - "RecentActivityFeed is a Server Component (no animation needed, just data display)"
metrics:
  duration_seconds: 171
  completed: "2026-03-09T21:28:03Z"
  tasks: 2
  files_created: 5
  files_modified: 1
---

# Phase 23 Plan 01: Admin KPI Dashboard Summary

**One-liner:** Admin KPI dashboard at /admin/analytics with revenue, members, upcoming events CountUp cards, recent activity feed, and Analytics tab in StaffNav for master role.

## What Was Built

### Dashboard Queries (`dashboard-queries.ts`)
- `fetchKPIDashboard()` function using service client to bypass RLS
- 4 parallel queries: profiles count, upcoming events count, all ticket amounts, completed drink order amounts
- Recent activity: fetches latest 10 tickets + 10 drink orders with profile/event joins, merges and sorts by date
- Exports `KPIDashboard` and `RecentActivityItem` interfaces

### KPI Dashboard Component (`KPIDashboard.tsx`)
- Client component with CountUp animations for all 3 metrics
- 3-card grid (1 col mobile, 3 cols desktop)
- Revenue card with accent gradient border; members and events with standard card style
- EUR format for revenue, plain numbers for counts

### Recent Activity Feed (`RecentActivityFeed.tsx`)
- Server Component rendering merged ticket/drink activity list
- Each item shows icon (ticket/drink emoji), user name, event title, EUR amount, relative time
- Empty state handled with "No recent activity" message

### Admin Analytics Page (`/admin/analytics`)
- Server Component with master-only role guard
- Calls fetchKPIDashboard and renders KPIDashboard + RecentActivityFeed
- Navigation links to future sub-pages (Member Insights, Event Comparison)
- AnimatedSection wrappers, StaffNav, MobileNav following existing admin page patterns

### Loading Skeleton (`loading.tsx`)
- Matches page layout with animate-pulse placeholders
- Header, StaffNav bar, 3 KPI cards, 2 link cards, 5 activity rows

### StaffNav Tab
- Added "Analytics" entry after "Finance" in STAFF_TABS array
- Restricted to admin context, master role only

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- TypeScript compiles without errors
- `npm run build` succeeds
- `/admin/analytics` route present in build output as dynamic route
- StaffNav contains analytics tab entry with master role restriction
- KPIDashboard uses CountUp for all 3 metrics
- RecentActivityFeed renders combined ticket + drink items

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b09a5b2 | Dashboard queries + KPI display components |
| 2 | eb6e309 | Admin analytics page + skeleton + StaffNav tab |

## Self-Check: PASSED

All 5 created files verified present. Both commits (b09a5b2, eb6e309) verified in git log.
