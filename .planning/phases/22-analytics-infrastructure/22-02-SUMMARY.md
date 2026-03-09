---
phase: 22-analytics-infrastructure
plan: 02
subsystem: analytics
tags: [analytics, recharts, supabase, event-metrics, revenue, attendance]
dependency_graph:
  requires: [posthog-client-init, recharts-dependency]
  provides: [event-analytics-page, event-revenue-queries, drink-sales-breakdown, ticket-velocity-chart, attendance-rate, token-lifecycle]
  affects: [admin-events, organizer-events]
tech_stack:
  added: []
  patterns: [server-component-with-client-children, parallel-promise-all-queries, js-aggregation-after-select, countup-animation, responsive-table-cards]
key_files:
  created:
    - src/lib/analytics/event-queries.ts
    - src/components/analytics/RevenueCard.tsx
    - src/components/analytics/AttendanceCard.tsx
    - src/components/analytics/TokenLifecycleCard.tsx
    - src/components/analytics/DrinkSalesBreakdown.tsx
    - src/components/analytics/TicketVelocityChart.tsx
    - src/app/(admin)/admin/events/[id]/analytics/page.tsx
    - src/app/(admin)/admin/events/[id]/analytics/loading.tsx
    - src/app/(organizer)/organizer/events/[id]/analytics/page.tsx
    - src/app/(organizer)/organizer/events/[id]/analytics/loading.tsx
  modified: []
decisions:
  - Two-step ticket refund lookup (get ticket IDs first, then query refunds) to avoid unreliable Supabase nested join filters
  - DrinkSalesBreakdown is a Server Component (no animation needed), all other cards are client components for CountUp
  - Revenue card uses accent gradient border to visually distinguish it from standard cards
  - Stacked progress bar in TokenLifecycleCard shows green/red/gray segments for redeemed/refunded/pending
  - Attendance progress bar color-coded by threshold (green >=70%, yellow 40-70%, muted below)
metrics:
  duration_seconds: 229
  completed: "2026-03-09T20:23:32Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 22 Plan 02: Per-Event Analytics Page Summary

Five analytics query functions with typed return values powering revenue summary (gross/net with refund accounting), ticket velocity Recharts BarChart, per-drink sales breakdown table, attendance rate with progress bar, and token lifecycle stacked bar -- served from parallel Promise.all on admin and organizer Server Component pages with ownership verification.

## What Was Built

### Task 1: Analytics Query Functions + Display Components
**Commit:** `d6ea84a`

- Created `src/lib/analytics/event-queries.ts` with 5 exported functions:
  - `fetchEventRevenue` -- gross/net for tickets and drinks, accounting for approved ticket refunds (two-step lookup) and refunded drink tokens
  - `fetchDailyVelocity` -- daily ticket count grouped by date in JS Map, sorted chronologically
  - `fetchDrinkSales` -- per-drink breakdown (quantity, revenue, redeemed, refunded) sorted by revenue descending
  - `fetchAttendanceRate` -- tickets sold vs checked-in with head-only count queries
  - `fetchTokenLifecycle` -- redeemed/refunded/purchased counts and percentage rates
- Created 5 display components:
  - `RevenueCard` (client) -- gradient accent card with CountUp-animated EUR values, two-column gross/refund/net breakdown for tickets and drinks
  - `AttendanceCard` (client) -- large percentage with CountUp, color-coded progress bar (green/yellow/muted by threshold)
  - `TokenLifecycleCard` (client) -- redeemed % primary metric, stacked progress bar (green=redeemed, red=refunded, gray=pending), legend with counts
  - `DrinkSalesBreakdown` (server) -- desktop table with Name/Qty/Revenue/Redeemed/Refunded columns, mobile card layout, empty state
  - `TicketVelocityChart` (client) -- Recharts BarChart with ResponsiveContainer, accent-colored bars with rounded tops, dark-themed tooltip, "Mon DD" date formatting

### Task 2: Admin + Organizer Analytics Pages with Loading Skeletons
**Commit:** `a657d7a`

- Created `/admin/events/[id]/analytics` (Server Component):
  - Master role guard, event title fetch, parallel Promise.all for all 5 query functions
  - AnimatedSection header + content wrapper with staggered delay
  - Full layout: RevenueCard (full width) > AttendanceCard + TokenLifecycleCard (2-col grid) > TicketVelocityChart (card wrapper) > DrinkSalesBreakdown (card wrapper)
  - MobileNav with role and status
- Created `/organizer/events/[id]/analytics` (Server Component):
  - Organizer OR master role guard + ownership verification (organizers see only their events)
  - Identical layout to admin version, back link points to /organizer/events
- Created loading.tsx for both routes:
  - Server Components with animate-pulse skeletons matching exact page layout
  - Revenue gradient card, 2-col small cards, chart area, drink table rows

## Verification Results

1. `npm run build` -- PASSED (zero errors)
2. Both analytics routes appear in build output (`/admin/events/[id]/analytics`, `/organizer/events/[id]/analytics`) -- PASSED
3. Revenue calculation accounts for ticket refunds (two-step: ticket IDs then refunds) AND drink refunds (status='refunded') -- PASSED
4. TicketVelocityChart uses Recharts BarChart with 'use client' directive -- PASSED
5. RevenueCard, AttendanceCard, TokenLifecycleCard all use CountUp for animated numbers -- PASSED
6. Loading skeletons exist for both routes -- PASSED
7. Query functions are reusable in src/lib/analytics/event-queries.ts with exported types -- PASSED

## Deviations from Plan

None -- plan executed exactly as written.

## Self-Check: PASSED

- All 10 created files verified on disk
- Commit d6ea84a verified in git log
- Commit a657d7a verified in git log
