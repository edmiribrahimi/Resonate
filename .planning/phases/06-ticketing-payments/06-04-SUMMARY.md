---
phase: 06-ticketing-payments
plan: 04
subsystem: sales-dashboard-my-tickets
tags: [sales, dashboard, organizer, admin, member-tickets]
dependency_graph:
  requires: [ticket_tiers-table, tickets-table, events-table, profiles-table]
  provides: [sales-dashboard-component, organizer-sales-page, admin-sales-page, member-tickets-section]
  affects: [EventList.tsx, dashboard-page]
tech_stack:
  added: []
  patterns: [shared-presentational-component, context-aware-basePath, responsive-table-cards]
key_files:
  created:
    - src/components/events/SalesDashboard.tsx
    - src/app/(organizer)/organizer/events/[id]/sales/page.tsx
    - src/app/(admin)/admin/events/[id]/sales/page.tsx
  modified:
    - src/components/events/EventList.tsx
    - src/app/(admin)/admin/events/page.tsx
    - src/app/(members)/dashboard/page.tsx
decisions:
  - "basePath prop on EventList only applied to Sales link; Edit and Manage Tickets stay on organizer routes since admin lacks those pages"
  - "Upcoming tickets sorted before past tickets with reduced opacity for visual distinction"
metrics:
  duration: 176s
  completed: 2026-02-25T13:09:38Z
---

# Phase 6 Plan 04: Sales Dashboard & My Tickets Summary

Shared SalesDashboard component with tier breakdown, revenue totals, and responsive buyer list; organizer/admin sales pages at /[context]/events/[id]/sales; member dashboard extended with My Tickets section showing upcoming/past ticket cards.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Sales dashboard component and organizer/admin sales pages | 1c27426 | SalesDashboard.tsx, organizer sales page, admin sales page, EventList.tsx |
| 2 | My Tickets section on member dashboard | 76a476e | dashboard/page.tsx |

## What Was Built

### SalesDashboard Component
- Revenue summary with total revenue (EUR formatted, accent text) and ticket count
- Per-tier breakdown cards: name, price, sold/quantity count, tier revenue, progress bar
- Sold-out tiers highlighted with red badge
- Buyer list as responsive table (desktop) / stacked cards (mobile)
- Buyer data: member name, email, tier badge, purchase date
- Empty state: "No tickets sold yet"

### Organizer Sales Page (/organizer/events/[id]/sales)
- Server component with role check (organizer or master)
- Ownership verification (organizer sees own events, master sees all)
- Fetches tiers with sold counts via individual count queries
- Fetches buyers with profile and tier joins
- Computes total revenue and total sold
- Back link to /organizer/events, MobileNav

### Admin Sales Page (/admin/events/[id]/sales)
- Identical data fetching as organizer but master-only role check
- No ownership check (master sees all events)
- Back link to /admin/events

### EventList Update
- Added "Sales" link alongside existing Edit and Manage Tickets links
- basePath prop (default: /organizer/events) for context-aware Sales link routing
- Admin events page passes basePath="/admin/events"

### Member Dashboard My Tickets Section
- Queries tickets with events and ticket_tiers joins
- Upcoming tickets (date >= today) shown first, past tickets with reduced opacity
- Each ticket as a styled card: cover image thumbnail, event title, tier badge, date, chevron
- Cards link to /tickets/[id] confirmation page
- Empty state: "No tickets yet" with "Discover events" link

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] basePath scoped to Sales link only**
- **Found during:** Task 1
- **Issue:** Applying basePath to Edit and Manage Tickets links would create dead links for admin context (admin has no /admin/events/[id]/edit or /admin/events/[id]/tickets routes)
- **Fix:** Only the Sales link uses basePath; Edit and Manage Tickets remain hardcoded to /organizer/events/ paths
- **Files modified:** src/components/events/EventList.tsx
- **Commit:** 1c27426

## Verification

- `npx next build` passes with 0 errors
- SalesDashboard component exists with tier breakdown and buyer list
- Organizer sales page at /organizer/events/[id]/sales
- Admin sales page at /admin/events/[id]/sales
- Dashboard page queries tickets table joined with events and ticket_tiers
- EventList shows Edit, Manage Tickets, and Sales links per event
- Buyer list shows member name, tier, date, and email

## Self-Check: PASSED

All 6 created/modified files verified present on disk. Both task commits (1c27426, 76a476e) verified in git log.
