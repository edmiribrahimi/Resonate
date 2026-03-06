---
phase: 19-fixes
plan: 02
subsystem: ui-fixes
tags: [mobilenav, drink-menu, dashboard-tabs, navigation]
dependency_graph:
  requires: []
  provides: [persistent-mobilenav, events-first-tabs, admin-redirect, organizer-redirect]
  affects: [menu-page, scanner-page, event-detail-page, admin-nav, organizer-nav, roles]
tech_stack:
  added: []
  patterns: [server-client-split-for-mobilenav]
key_files:
  created:
    - src/app/(admin)/admin/scanner/ScannerClient.tsx
    - src/app/(admin)/admin/page.tsx
    - src/app/(organizer)/organizer/page.tsx
  modified:
    - src/app/(public)/events/[slug]/menu/page.tsx
    - src/app/(admin)/admin/scanner/page.tsx
    - src/app/(public)/events/[slug]/page.tsx
    - src/components/admin/AdminNav.tsx
    - src/components/layout/OrganizerNav.tsx
    - src/lib/rbac/roles.ts
decisions:
  - Scanner page split into ScannerClient (use client) + page.tsx (server) to support MobileNav with headers
  - Drink menu button shows static text instead of count to avoid cross-party count confusion
metrics:
  duration: 7m
  completed: "2026-03-06T22:48:00Z"
  tasks_completed: 4
  tasks_total: 4
---

# Phase 19 Plan 02: UI Fixes Summary

MobileNav added to menu/scanner pages, drink count replaced with static label, dashboard defaults to Events tab.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add MobileNav to menu and scanner pages | 86b8bc4 | menu/page.tsx, ScannerClient.tsx, scanner/page.tsx |
| 2 | Fix drink menu button count | 86b8bc4 | events/[slug]/page.tsx |
| 3 | Events-first tabs and redirect pages | 86b8bc4 | AdminNav.tsx, OrganizerNav.tsx, roles.ts, admin/page.tsx, organizer/page.tsx |
| 4 | Verify SumUp API keys documentation | 86b8bc4 | (verification only - no changes needed) |

## What Was Done

### Task 1: MobileNav on menu and scanner pages
- Added `MobileNav` import and rendering to the drink menu page (`/events/[slug]/menu`)
- Added `status` header extraction alongside existing `role` header
- Split scanner page into `ScannerClient.tsx` (client component with QR logic) and `page.tsx` (server wrapper that reads headers and renders MobileNav)

### Task 2: Drink menu button count fix
- Replaced `drinkItems` full fetch with `drinkItemCount` head-only count query
- Changed condition from `drinkItems && drinkItems.length > 0` to `(drinkItemCount ?? 0) > 0`
- Replaced misleading "{count} items available" text with "View available drinks"

### Task 3: Events-first dashboard tabs
- Reordered `AdminNav` tabs array: Events first, then Members, Artists, Venues, Newsletter
- Reordered `OrganizerNav` tabs array: Events first, then Members, Artists, Venues
- Updated `roles.ts` nav item hrefs: `/admin/members` to `/admin/events`, `/organizer/members` to `/organizer/events`
- Created `/admin/page.tsx` with `redirect("/admin/events")`
- Created `/organizer/page.tsx` with `redirect("/organizer/events")`

### Task 4: SumUp API keys verification
- Confirmed `.env.local.example` contains `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE`
- Confirmed `src/lib/sumup.ts` reads both via `process.env.*!` assertions
- No changes needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed leftover savedCards/listSavedCards from menu page and event detail page**
- **Found during:** Task 1 and Task 2
- **Issue:** Plan 19-01 removed `listSavedCards` from `sumup.ts` but left import and usage in `menu/page.tsx` and `events/[slug]/page.tsx`, causing TypeScript compilation errors
- **Fix:** Removed `import { listSavedCards }` and all `savedCards` fetching/prop-passing code from both files
- **Files modified:** `src/app/(public)/events/[slug]/menu/page.tsx`, `src/app/(public)/events/[slug]/page.tsx`
- **Commit:** 86b8bc4

### Out-of-scope issues logged

Pre-existing TypeScript errors in files modified by Plan 19-01 (uncommitted changes):
- `TierSelection.tsx` - savedCards/purchaseTicketWithSavedCard references not cleaned up
- `GuestDrinkMenu.tsx` - purchaseDrinksWithSavedCard import broken
- `DrinkMenu.tsx` - wrong argument count
- `dashboard/SavedCardsSection.tsx` - module not found
- `dashboard/page.tsx` - listSavedCards import broken

These are outside the scope of Plan 19-02 and should be resolved by completing Plan 19-01 commit.

## Decisions Made

1. **Scanner split pattern:** Created ScannerClient.tsx as a separate "use client" component rather than trying to make MobileNav work in a client component, since MobileNav requires role/status from server headers
2. **Static drink label:** Replaced per-item count with "View available drinks" text because the count was misleading (showed total across all parties, not per-party)

## Self-Check: PASSED

All 10 files verified present. Commit 86b8bc4 verified in git log. TypeScript passes for all Plan 19-02 files (pre-existing errors in Plan 19-01 files are out of scope).
