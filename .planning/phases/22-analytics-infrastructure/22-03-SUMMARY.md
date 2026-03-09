---
phase: 22-analytics-infrastructure
plan: 03
subsystem: analytics
tags: [recharts, member-growth, admin, area-chart, cumulative]
dependency_graph:
  requires: [posthog-client-init, recharts-dependency]
  provides: [member-growth-page, member-growth-query]
  affects: [admin-members]
tech_stack:
  added: []
  patterns: [server-component-with-client-chart, cumulative-aggregation, link-based-toggle]
key_files:
  created:
    - src/lib/analytics/member-queries.ts
    - src/components/analytics/MemberGrowthChart.tsx
    - src/components/analytics/GrowthSummaryCard.tsx
    - src/app/(admin)/admin/members/growth/page.tsx
    - src/app/(admin)/admin/members/growth/loading.tsx
  modified: []
decisions:
  - Weekly/monthly toggle uses Link-based navigation with search params (server-side re-render, no client state)
  - Cumulative counts computed in JS after simple profiles SELECT (no SQL GROUP BY needed)
  - ISO week calculation done in pure JS (no date-fns dependency)
  - GrowthSummaryCard uses gradient border style consistent with project card patterns
metrics:
  duration_seconds: 183
  completed: "2026-03-09T20:23:04Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 22 Plan 03: Member Growth Analytics Summary

Admin member growth page at /admin/members/growth with Recharts stacked AreaChart showing cumulative referral vs organic members, weekly/monthly granularity toggle via URL search params, and animated summary card with CountUp.

## What Was Built

### Task 1: Member Growth Query and Chart Components
**Commit:** `b475e44`

- Created `src/lib/analytics/member-queries.ts`:
  - `fetchMemberGrowth(supabase, granularity)` queries profiles table ordered by created_at
  - Groups by ISO week (YYYY-Wnn) or month (YYYY-MM) in JavaScript
  - Builds cumulative referral/organic counts per period
  - Returns `GrowthDataPoint[]` with display labels and `GrowthSummary` with totals/rates
  - Handles empty data gracefully (returns zeroed summary)

- Created `src/components/analytics/MemberGrowthChart.tsx`:
  - `"use client"` component with Recharts AreaChart in ResponsiveContainer (h-56)
  - Two stacked Areas: referral (accent, opacity 0.6) and organic (#666, opacity 0.3)
  - Dark-themed Tooltip with card bg/border styling
  - Empty state text when no data

- Created `src/components/analytics/GrowthSummaryCard.tsx`:
  - `"use client"` component using CountUp for animated numbers
  - Gradient border card showing total members, referral %, organic %
  - Secondary stat row for new members this period

### Task 2: Admin Member Growth Page and Loading Skeleton
**Commit:** `7f31caf`

- Created `src/app/(admin)/admin/members/growth/page.tsx`:
  - Server Component with role guard (master only, redirect to /dashboard)
  - Reads granularity from `searchParams` Promise (Next.js 16 pattern)
  - Link-based toggle pills for Weekly/Monthly with accent active styling
  - Renders GrowthSummaryCard + MemberGrowthChart inside AnimatedSections
  - Full admin page layout: header, StaffNav, content, MobileNav

- Created `src/app/(admin)/admin/members/growth/loading.tsx`:
  - Server Component skeleton with animate-pulse placeholders
  - Mirrors page layout: header, StaffNav, toggle buttons, summary card, chart

## Verification Results

1. `npm run build` -- PASSED (zero errors)
2. `/admin/members/growth` page listed in build output as dynamic route -- PASSED
3. Granularity toggle uses Link components with search params -- PASSED
4. Chart uses stacked Areas with referral (accent) and organic (#666) -- PASSED
5. Summary card uses CountUp for animated totals -- PASSED
6. Loading skeleton exists at loading.tsx -- PASSED
7. Master role guard with redirect -- PASSED

## Deviations from Plan

None -- plan executed exactly as written.

## Self-Check: PASSED

- All 5 created files verified on disk
- Commit b475e44 verified in git log
- Commit 7f31caf verified in git log
