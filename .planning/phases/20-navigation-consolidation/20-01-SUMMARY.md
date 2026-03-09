---
phase: 20-navigation-consolidation
plan: 01
subsystem: navigation
tags: [ui, refactor, rbac, navigation]
dependency_graph:
  requires: []
  provides: [StaffNav, simplified-MobileNav, 4-tab-nav-structure]
  affects: [admin-pages, organizer-pages, mobile-navigation]
tech_stack:
  added: []
  patterns: [unified-staff-nav, role-aware-tab-filtering, context-based-nav]
key_files:
  created:
    - src/components/staff/StaffNav.tsx
  modified:
    - src/lib/rbac/roles.ts
    - src/components/layout/MobileNav.tsx
    - src/app/(admin)/admin/events/page.tsx
    - src/app/(admin)/admin/members/page.tsx
    - src/app/(admin)/admin/venues/page.tsx
    - src/app/(admin)/admin/newsletter/page.tsx
    - src/app/(admin)/admin/finance/page.tsx
    - src/app/(admin)/admin/artists/page.tsx
    - src/app/(organizer)/organizer/events/page.tsx
    - src/app/(organizer)/organizer/artists/page.tsx
    - src/app/(organizer)/organizer/venues/page.tsx
  deleted:
    - src/components/admin/AdminNav.tsx
    - src/components/layout/OrganizerNav.tsx
decisions:
  - Kept /dashboard URL despite "Account" label in nav (avoids middleware/redirect churn)
  - Passed role prop to StaffNav in organizer pages (role already available from headers)
metrics:
  duration: 219s
  completed: "2026-03-09T16:49:24Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 14
---

# Phase 20 Plan 01: Navigation Consolidation - StaffNav & MobileNav Simplification Summary

Unified StaffNav component replacing AdminNav/OrganizerNav with role-aware context-based tab filtering; MobileNav simplified from popover-based staff menu to direct 2-4 tab Links

## What Was Done

### Task 1: Create StaffNav and update roles.ts NAV_ITEMS (7793822)

**roles.ts changes:**
- Replaced 6-item NAV_ITEMS array (Home, Events, Gallery, Account, Admin, Organizer) with 4-item structure (Events, Gallery, Check-in, Account)
- Added Check-in tab for master/organizer roles pointing to /admin/scanner
- Removed Home item entirely (was already hidden for authenticated users)
- Removed Admin and Organizer entries (replaced by direct Check-in tab)
- Updated getVisibleNavItems JSDoc to reflect new tab counts per role

**StaffNav.tsx created:**
- Unified component accepting `role` and `context` ("admin" | "organizer") props
- STAFF_TABS array with 6 entries: Events, Members, Artists, Venues, Newsletter (admin only), Finance (master only in admin context)
- Tab filtering by context and role
- Dynamic href construction from basePath + tab href
- Exact styling match with previous AdminNav: scrollable container, hidden scrollbars, rounded pill buttons, active/inactive states

### Task 2: Simplify MobileNav and replace AdminNav/OrganizerNav imports (c652967)

**MobileNav.tsx simplified:**
- Removed entire popover system: useState, useRef, useEffect hooks
- Removed STAFF_ICONS constant and SCANNER_HREF constant
- Removed popover rendering block and click-outside listener
- Removed unused icon entries (home, shield, users)
- All items now render as simple Link components
- Active state uses pathname.startsWith() with special case for /dashboard

**9 page updates:**
- 6 admin pages: replaced AdminNav import/usage with StaffNav context="admin"
- 3 organizer pages: replaced OrganizerNav import/usage with StaffNav context="organizer"
- All organizer pages now pass role prop (was already available from headers)

**2 files deleted:**
- src/components/admin/AdminNav.tsx
- src/components/layout/OrganizerNav.tsx

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **URL/label mismatch kept intentional:** The Account tab points to /dashboard URL. Changing the URL would require updating middleware protected routes, login redirect (?next=/dashboard), and Home page redirect. The label change is sufficient for now.

2. **Role passed in organizer pages:** The plan suggested role={null} for organizer pages, but since all three pages already read role from headers, passing the actual role value is more correct and enables future Finance tab visibility if a master user visits organizer routes.

## Verification Results

- `npm run build`: PASSED (zero errors)
- `grep -r "AdminNav|OrganizerNav" src/app/ src/components/`: zero results (confirmed no stale imports)
- `grep -r "popoverOpen|popoverRef|STAFF_ICONS" src/components/layout/MobileNav.tsx`: zero results (confirmed no popover code)
- `grep -c "NavItem" src/lib/rbac/roles.ts`: 4 matches (type still exported correctly)

## Tab Counts by Role

| Role | Status | Tabs | Items |
|------|--------|------|-------|
| Unauthenticated | - | 2 | Events, Gallery |
| Member | pending/rejected | 2 | Events, Account |
| Member | approved | 3 | Events, Gallery, Account |
| Organizer | approved | 4 | Events, Gallery, Check-in, Account |
| Master | approved | 4 | Events, Gallery, Check-in, Account |

## Self-Check: PASSED

- StaffNav.tsx: FOUND
- MobileNav.tsx: FOUND
- roles.ts: FOUND
- AdminNav.tsx: CONFIRMED DELETED
- OrganizerNav.tsx: CONFIRMED DELETED
- Commit 7793822: FOUND
- Commit c652967: FOUND
