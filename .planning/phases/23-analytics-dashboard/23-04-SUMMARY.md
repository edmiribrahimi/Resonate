---
phase: 23-analytics-dashboard
plan: 04
subsystem: analytics
tags: [comparison, events, admin, bar-chart]
dependency_graph:
  requires: [23-01-kpi-dashboard]
  provides: [event-comparison-page, comparison-queries]
  affects: [admin-analytics-compare-route]
tech_stack:
  added: []
  patterns: [grouped-bar-chart, url-search-params-state, parallel-promise-all]
key_files:
  created:
    - src/lib/analytics/comparison-queries.ts
    - src/components/analytics/EventSelector.tsx
    - src/components/analytics/EventComparisonChart.tsx
    - src/app/(admin)/admin/analytics/compare/page.tsx
    - src/app/(admin)/admin/analytics/compare/loading.tsx
  modified: []
decisions:
  - "fetchEventComparison runs all per-event queries in parallel with nested Promise.all for optimal performance"
  - "EventSelector uses useRouter().push() with URL search params for server-side re-render on selection change"
  - "Per-attendee mode is default (fair comparison per research recommendation)"
  - "Mode toggle uses Link-based navigation preserving event selection in search params"
metrics:
  duration_seconds: 167
  completed: "2026-03-09T21:35:34Z"
  tasks: 2
  files_created: 5
  files_modified: 0
---

# Phase 23 Plan 04: Event Comparison Summary

**One-liner:** Admin event comparison page at /admin/analytics/compare with multi-event selector (2-4 events), grouped bar charts, and per-attendee/absolute mode toggle via URL search params.

## What Was Built

### Comparison Queries (`comparison-queries.ts`)
- `fetchEventComparison()` aggregates key metrics (revenue, attendance, tickets, drink tokens, avg spend) for multiple events in parallel
- `fetchAllEvents()` fetches all events with id, title, date for the selector dropdown
- `EventComparisonData` interface with 8 fields for comprehensive per-event metrics
- Nested Promise.all: outer parallelizes across events, inner parallelizes per-event queries

### Event Selector Component (`EventSelector.tsx`)
- Client component with checkbox list of all events
- Max selection enforced (default 4) with disabled state when limit reached
- Selection count indicator ("N/4 selected")
- URL search params navigation via `useRouter().push()` (events=id1,id2,id3)
- Date formatted as short date (e.g., "Mar 9, 2026")
- Scrollable list with max height for many events

### Event Comparison Chart (`EventComparisonChart.tsx`)
- Client component with Recharts grouped BarChart
- Two modes: absolute (Revenue, Tickets Sold, Drink Tokens, Attendance) and per-attendee (Revenue/Attendee, Drinks/Attendee, Attendance Rate %)
- Color palette: accent, indigo, emerald, amber for up to 4 events
- Rounded bar tops, legend, dark tooltip with project card styling
- Empty state when fewer than 2 events selected

### Comparison Page (`/admin/analytics/compare`)
- Server Component with master-only role guard
- Reads events and mode from URL search params
- EventSelector + mode toggle pills (Link-based, preserving event selection)
- Per-attendee default, absolute as secondary option
- Conditional rendering: chart when 2+ events selected, empty state otherwise

### Loading Skeleton (`loading.tsx`)
- Matches page layout: header, StaffNav, event selector rows, toggle pills, chart area
- All animate-pulse placeholders

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- TypeScript compiles without errors
- `npm run build` succeeds
- `/admin/analytics/compare` route present in build output as dynamic route
- EventSelector limits selection to 4 events maximum
- EventComparisonChart renders grouped bars with different colors per event
- Mode toggle uses Link-based navigation preserving event selection
- Per-attendee mode is default

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 6086a22 | Comparison queries + EventSelector + EventComparisonChart |
| 2 | 09f5926 | Admin comparison page + skeleton |

## Self-Check: PASSED

All 5 created files verified present. Both commits (6086a22, 09f5926) verified in git log.
