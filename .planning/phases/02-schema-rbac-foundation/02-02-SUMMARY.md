---
phase: 02-schema-rbac-foundation
plan: 02
subsystem: middleware-rbac-navigation
tags: [rbac, middleware, navigation, role-gating, pending-state]
dependency_graph:
  requires: [role-column, status-column]
  provides: [middleware-role-resolution, header-injection, route-protection, role-nav-filtering, pending-dashboard, rsvp-gating]
  affects: [admin-members, organizer-pages, future-approval-queue]
tech_stack:
  added: []
  patterns: [middleware-header-injection, cookie-preservation, server-component-header-reading, client-server-component-split]
key_files:
  created:
    - src/lib/rbac/roles.ts
    - src/components/newsletter/NewsletterForm.tsx
  modified:
    - src/lib/supabase/middleware.ts
    - src/components/layout/MobileNav.tsx
    - src/app/(members)/dashboard/page.tsx
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/page.tsx
    - src/app/(members)/attendance/page.tsx
    - src/app/(members)/membership-card/page.tsx
    - src/app/(public)/gallery/page.tsx
    - src/app/(public)/events/page.tsx
    - src/app/(public)/newsletter/page.tsx
decisions:
  - Inline route checks in middleware rather than importing from roles.ts (Edge runtime minimizes imports)
  - Cookie preservation via pendingCookies array to prevent auth loss after header injection
  - Newsletter page refactored to server/client split for header access
  - Gallery visible to unauthenticated users but hidden from pending/rejected authenticated users
metrics:
  duration: 255s
  completed: 2026-02-24
---

# Phase 2 Plan 2: Middleware RBAC & Role-Aware Navigation Summary

Middleware role resolution with header injection, route protection matrix, role-filtered MobileNav using getVisibleNavItems, pending member dashboard state, and RSVP visibility gating on event detail page.

## What Was Built

### Task 1: RBAC Constants Module and Middleware Role Enforcement
**Commit:** b350788

**Created `src/lib/rbac/roles.ts`:**
- Re-exports `UserRole` and `UserStatus` types from `@/types/database`
- Exports `ROLES` and `STATUSES` constant objects
- Defines `NavItem` interface with role/status/auth requirements per item
- Full navigation items list: Home, Events, Gallery, Members, Admin, Organizer
- `getVisibleNavItems(role, status)` function that filters navigation items:
  - Unauthenticated: Home, Events, Gallery
  - Pending/rejected authenticated: Home, Events, Members (dashboard)
  - Approved member: Home, Events, Gallery, Members
  - Organizer (approved): + Organizer link
  - Master (approved): + Admin link

**Rewrote `src/lib/supabase/middleware.ts`:**
- After `getUser()`, queries `profiles` table for `role` and `status` columns
- Injects `x-user-role`, `x-user-status`, and `x-user-id` into request headers via `NextResponse.next({ request: { headers } })`
- Cookie preservation: tracks all Supabase cookies in a `pendingCookies` array, re-applies them to the final response after header injection to prevent users being logged out
- Route protection logic (in order):
  - Unauthenticated + protected route -> redirect to `/login?redirect={pathname}`
  - `/admin/scanner` -> master OR organizer only
  - `/admin/*` -> master only
  - `/organizer/*` -> master OR organizer only
  - `/membership-card`, `/attendance` -> approved status only
- All route checks are inlined string comparisons (no import from `roles.ts`)

### Task 2: Role-Aware Navigation, Pending Dashboard, and RSVP Gating
**Commit:** 05c2b53

**Rewrote `src/components/layout/MobileNav.tsx`:**
- Now accepts `{ role: UserRole | null; status: UserStatus | null }` props
- Uses `getVisibleNavItems(role, status)` to filter rendered navigation items
- Added `shield` icon (Heroicons outline) for Admin nav item
- Added `users` icon (Heroicons outline) for Organizer nav item
- Existing active state highlighting logic preserved

**Updated `src/app/(members)/dashboard/page.tsx`:**
- Reads `x-user-role` and `x-user-status` from headers
- Pending members see: "Your account is pending approval" card + "Discover events" link
- Rejected members see: "Your account has been reviewed" card + same events link
- Membership Card, Attendance, and RSVP cards are completely omitted (not grayed out) for pending/rejected
- Approved members see the existing dashboard unchanged

**Updated `src/app/(public)/events/[slug]/page.tsx`:**
- Reads `x-user-role` and `x-user-status` from headers
- RSVP section: `isAuthenticated && isApproved` -> show RSVP button
- `isAuthenticated && !isApproved` -> RSVP section entirely absent
- Not authenticated -> show "Sign up to confirm attendance" link
- Secret location section unchanged (visible to all authenticated users)

**Updated all 8 pages using MobileNav to pass role/status props:**
- `src/app/page.tsx` (homepage)
- `src/app/(members)/dashboard/page.tsx`
- `src/app/(members)/attendance/page.tsx`
- `src/app/(members)/membership-card/page.tsx`
- `src/app/(public)/events/page.tsx`
- `src/app/(public)/events/[slug]/page.tsx`
- `src/app/(public)/gallery/page.tsx`
- `src/app/(public)/newsletter/page.tsx`

**Newsletter page refactored:** Extracted `NewsletterForm` client component into `src/components/newsletter/NewsletterForm.tsx` so the page itself could become a Server Component with `headers()` access.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Inline route checks in middleware (not imported from roles.ts) | Middleware runs in Edge runtime; minimizing imports reduces bundle and avoids compatibility issues |
| Cookie preservation via pendingCookies array | Creating a new NextResponse for header injection loses Supabase cookies; tracking and re-applying prevents auth loss |
| Newsletter page server/client split | Client components cannot use `headers()` from `next/headers`; extracted form to client component so page can be server component |
| Gallery hidden from pending/rejected but shown to unauthenticated | Unauthenticated users see public gallery; once authenticated with pending/rejected status, gallery is hidden per events-only navigation decision |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Newsletter page client/server split**
- **Found during:** Task 2
- **Issue:** Newsletter page was a client component (`"use client"`) and could not use `headers()` from `next/headers` to read middleware-injected role/status headers for MobileNav props
- **Fix:** Extracted the form logic into `src/components/newsletter/NewsletterForm.tsx` as a client component, and converted the page itself to a Server Component that reads headers and passes props to both `NewsletterForm` and `MobileNav`
- **Files created:** `src/components/newsletter/NewsletterForm.tsx`
- **Files modified:** `src/app/(public)/newsletter/page.tsx`
- **Commit:** 05c2b53

## Verification Results

- `npx next build` completes with 0 errors
- `src/lib/rbac/roles.ts` exists and exports `getVisibleNavItems`, `ROLES`, `STATUSES`
- `src/lib/supabase/middleware.ts` queries profiles for role/status and injects `x-user-role`/`x-user-status` headers
- `src/lib/supabase/middleware.ts` has route protection for /admin, /organizer, and approved-only routes
- `src/lib/supabase/middleware.ts` does NOT import from `src/lib/rbac/roles.ts`
- `src/components/layout/MobileNav.tsx` accepts role and status props
- `src/app/(members)/dashboard/page.tsx` reads `x-user-role` header and shows pending state
- `src/app/(public)/events/[slug]/page.tsx` reads `x-user-status` header and hides RSVP for pending/rejected
- All 8 `<MobileNav>` instances pass `role` and `status` props (no bare `<MobileNav />` calls)

## Self-Check: PASSED

All 12 files verified present on disk. Both commit hashes (b350788, 05c2b53) verified in git history.
