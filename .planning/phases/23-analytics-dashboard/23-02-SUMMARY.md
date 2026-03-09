---
phase: 23-analytics-dashboard
plan: 02
subsystem: analytics
tags: [analytics, recharts, market-insights, funnel, drink-popularity]
dependency_graph:
  requires: [event-queries.ts, CountUp component, Recharts]
  provides: [fetchMarketInsights, fetchPurchaseFunnel, DrinkPopularityChart, MarketInsightsCard, PurchaseFunnelChart]
  affects: [admin-event-analytics, organizer-event-analytics]
tech_stack:
  added: []
  patterns: [horizontal-bar-chart, funnel-chart, parallel-promise-all]
key_files:
  created:
    - src/components/analytics/DrinkPopularityChart.tsx
    - src/components/analytics/MarketInsightsCard.tsx
    - src/components/analytics/PurchaseFunnelChart.tsx
  modified:
    - src/lib/analytics/event-queries.ts
    - src/app/(admin)/admin/events/[id]/analytics/page.tsx
    - src/app/(organizer)/organizer/events/[id]/analytics/page.tsx
decisions:
  - Drink popularity reuses existing DrinkSalesItem data (sorted by quantity instead of revenue)
  - Organizer gets MarketInsightsCard only; DrinkPopularityChart and PurchaseFunnelChart are admin-only per ANLY-10/ANLY-15 scope
  - Peak purchase hours use client-side Date.getHours() on UTC timestamps (consistent with existing codebase pattern)
metrics:
  duration: 153s
  completed: "2026-03-09T21:28:00Z"
  tasks: 2
  files: 6
requirements: [ANLY-10, ANLY-11, ANLY-15]
---

# Phase 23 Plan 02: Per-Event Market Insights & Drink Analytics Summary

Market insights with avg spend per attendee and peak purchase hours, drink popularity horizontal bar chart, and purchase funnel visualization -- all computed from Supabase only (no PostHog).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Event query extensions + display components | e0f4dc1 | event-queries.ts, DrinkPopularityChart.tsx, MarketInsightsCard.tsx, PurchaseFunnelChart.tsx |
| 2 | Integrate into admin + organizer pages | 16b5a01 | admin analytics page.tsx, organizer analytics page.tsx |

## What Was Built

### Query Functions (event-queries.ts)
- **fetchMarketInsights**: Parallel fetch of ticket amounts, completed drink orders, and checked-in count. Computes avg spend per attendee (total revenue / checked-in) and top 5 peak purchase hours by combining ticket + drink order timestamps.
- **fetchPurchaseFunnel**: Four count queries (all drink_orders, completed drink_orders, all drink_tokens, redeemed drink_tokens) returning FunnelStep array with color palette.

### Display Components
- **DrinkPopularityChart**: Recharts horizontal BarChart (layout="vertical") ranking drinks by quantity sold. Dynamic height based on drink count. Project tooltip styling.
- **MarketInsightsCard**: Two-section card with CountUp-animated EUR avg spend and peak hours as styled pills with count badges. Empty state for zero attendance.
- **PurchaseFunnelChart**: Recharts FunnelChart with 4 color-coded steps (Checkouts -> Payments -> Tokens -> Redeemed). Empty state when all values are zero.

### Page Integration
- **Admin analytics**: Extended Promise.all from 5 to 7 parallel fetches. Added Drink Popularity, Market Insights, and Purchase Funnel sections after existing Drink Sales breakdown.
- **Organizer analytics**: Extended Promise.all from 5 to 6 parallel fetches. Added Market Insights section only (admin-only charts excluded per requirements).

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- TypeScript compilation: PASSED (zero errors)
- Full production build: PASSED (all routes compiled)
- Admin page renders all 3 new sections with correct data flow
- Organizer page renders MarketInsightsCard only
- Existing analytics sections unchanged

## Self-Check: PASSED

All 6 files verified on disk. Both commits (e0f4dc1, 16b5a01) verified in git log.
