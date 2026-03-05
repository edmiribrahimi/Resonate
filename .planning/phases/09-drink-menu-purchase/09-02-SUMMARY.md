---
phase: "09"
plan: "02"
subsystem: "drinks-frontend"
tags: [frontend, drinks, organizer, event-page, sumup]
dependency-graph:
  requires: [09-01]
  provides: [organizer-drink-management, member-drink-ordering]
  affects: [event-detail-page, organizer-edit-page]
tech-stack:
  added: []
  patterns: [server-component-wrapping-client, useTransition-for-mutations, quantity-selector-ui]
key-files:
  created:
    - src/app/(organizer)/organizer/events/[id]/drinks/page.tsx
    - src/app/(organizer)/organizer/events/[id]/drinks/DrinkMenuManager.tsx
    - src/app/(public)/events/[slug]/DrinkMenu.tsx
  modified:
    - src/app/(organizer)/organizer/events/[id]/edit/page.tsx
    - src/app/(public)/events/[slug]/page.tsx
decisions:
  - Separated DrinkMenuManager into its own file for cleaner server/client boundary
  - Used toggle switch UI pattern for drink availability (consistent with mobile UX)
  - DrinkMenu quantity selector uses +/- buttons with min 0 max 10 range
  - Cast Supabase query result to DrinkItem[] type inline to avoid separate type assertion variable
metrics:
  duration: "156s"
  completed: "2026-03-06T00:00:00Z"
---

# Phase 9 Plan 2: Frontend for Drink Menu & Purchase Summary

Organizer drink menu management page with CRUD controls plus member-facing DrinkMenu component with quantity selectors, SumUp checkout modal, and event page integration.

## Tasks Completed

### Task 1: Organizer drink menu management page
- **Commit:** 0cb549f
- Created server component `drinks/page.tsx` with auth checks (organizer/master only), event ownership verification, and DrinkItem fetch
- Created client component `DrinkMenuManager.tsx` with add form (name + price inputs), item list with availability toggle switch, and remove button
- All mutations use `useTransition` for pending states
- Added "Manage Drink Menu" link on the event edit page pointing to `/organizer/events/${eventId}/drinks`
- Follows existing organizer UI patterns: back link, rounded-xl cards, bg-card/border-card-border styling, MobileNav

### Task 2: DrinkMenu component and event page integration
- **Commit:** 0cb549f (single atomic commit)
- Created `DrinkMenu.tsx` client component with quantity selectors (+/- buttons, 0-10 range)
- Order summary bar appears when total > 0, shows item count and formatted EUR total
- Purchase flow: builds items array, calls `purchaseDrinks()`, opens SumUpCheckoutModal on success
- Error display uses same red border pattern as TierSelection
- Integrated into event detail page: queries `drink_items` server-side, renders DrinkMenu after parties section (before gallery), only for authenticated users
- Price formatting uses `Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript: `npx tsc --noEmit` passes cleanly after both tasks
- All imports resolve correctly (server actions, types, SumUpCheckoutModal default export)

## Self-Check: PASSED

- All 3 created files exist on disk
- All 2 modified files verified
- Commit 0cb549f found in git history
