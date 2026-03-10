---
phase: 27-guest-navigation-fix
plan: 01
subsystem: navigation
tags: [bottom-nav, guest-ux, landing-page, registration-cta]
dependency_graph:
  requires: [MobileNav, NavItem, getVisibleNavItems]
  provides: [Home_tab_for_guests, hideWhenAuth_field]
  affects: [MobileNav, roles]
tech_stack:
  added: []
  patterns: [hideWhenAuth-visibility-flag, exact-path-match-for-root]
key_files:
  created: []
  modified:
    - src/lib/rbac/roles.ts
    - src/components/layout/MobileNav.tsx
decisions:
  - hideWhenAuth boolean field on NavItem interface (extensible for future guest-only items)
  - Exact pathname match for "/" to prevent always-active state on Home tab
metrics:
  duration_seconds: 98
  completed: "2026-03-10T02:27:48Z"
---

# Phase 27 Plan 01: Guest Navigation Home Tab Summary

Home tab with hideWhenAuth flag on NavItem, Heroicons outline home icon, exact "/" path match for isActive logic.

## Task Execution

### Task 1: Aggiungere Home nav item e icona
**Commit:** 2300616

**src/lib/rbac/roles.ts:**
- Added `hideWhenAuth: boolean` field to `NavItem` interface with JSDoc comment
- Added Home nav item as first element: href="/", label="Home", icon="home", hideWhenAuth=true
- Added `hideWhenAuth: false` to all existing nav items (Events, Gallery, Check-in, Account)
- Added filter check in `getVisibleNavItems`: `if (item.hideWhenAuth && isAuthenticated) return false`
- Updated JSDoc: Unauthenticated sees Home, Events, Gallery (3 tabs)

**src/components/layout/MobileNav.tsx:**
- Added `home` icon to icons map (Heroicons outline home SVG)
- Fixed isActive logic: "/" uses exact match (`pathname === "/"`), "/dashboard" uses prefix match, others use startsWith

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| NavItem.hideWhenAuth field exists | PASS |
| Home nav item in NAV_ITEMS array | PASS |
| hideWhenAuth filter in getVisibleNavItems | PASS |
| home icon in MobileNav icons map | PASS |
| isActive exact match for "/" | PASS |
| TypeScript compilation (npx tsc --noEmit) | PASS |

## Decisions Made

1. **hideWhenAuth boolean field** -- Extensible approach: any future guest-only nav items can use the same flag without code changes to the filter logic.
2. **Exact pathname match for "/"** -- `pathname === "/"` instead of `pathname.startsWith("/")` prevents Home tab from being always active (every path starts with "/").

## Self-Check: PASSED
