---
phase: 20-navigation-consolidation
plan: 02
subsystem: dashboard-account
tags: [dashboard, management, role-aware, collapsible, quick-stats]
dependency_graph:
  requires: []
  provides: [ManagementSection, CollapsibleSection, role-aware-dashboard]
  affects: [dashboard-page, staff-navigation]
tech_stack:
  added: []
  patterns: [CSS-grid-rows-animation, role-conditional-rendering, parallel-supabase-queries]
key_files:
  created:
    - src/components/account/CollapsibleSection.tsx
    - src/components/account/ManagementSection.tsx
  modified:
    - src/app/(members)/dashboard/page.tsx
decisions:
  - ManagementSection as client component receiving pre-fetched data props (not async server component)
  - Management stats fetched in parent page via Promise.all for parallel execution
  - CSS grid-rows animation for collapsible (no JS animation library needed)
metrics:
  duration: 213s
  completed: "2026-03-09T16:49:08Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 20 Plan 02: Role-Aware Dashboard Summary

Role-aware Account page with "My Stuff" and "Management" sections, quick-stats cards (pending members, next event, total revenue), and CSS grid-rows collapsible for management tools.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create CollapsibleSection and ManagementSection components | 9405252 | src/components/account/CollapsibleSection.tsx, src/components/account/ManagementSection.tsx |
| 2 | Restructure dashboard/page.tsx into Account page with sections | d6ffdc7 | src/app/(members)/dashboard/page.tsx |

## Implementation Details

### CollapsibleSection (Client Component)
- Reusable `"use client"` component with `useState` toggle
- CSS `grid-rows-[1fr]`/`grid-rows-[0fr]` animation with opacity transition
- Props: `title`, `defaultOpen`, `children`
- Chevron SVG rotates 180deg on expand

### ManagementSection (Client Component)
- Receives pre-fetched data as props: `role`, `pendingMembers`, `nextEvent`, `totalRevenue`
- 3 quick-stats cards in `grid-cols-3`: Pending (links to members page), Next Event (title+date), Revenue (formatted EUR)
- Management links in CollapsibleSection (defaultOpen): master gets 6 links (events, members, artists, venues, newsletter, finance), organizer gets 4
- Links styled as vertical list with chevron indicators
- Visual separation from My Stuff via `border-t border-card-border pt-6 mt-6`

### Dashboard Page Changes
- Added "My Stuff" section label before quick actions (approved users only)
- Added `isStaff` detection from middleware role header
- Staff-only parallel data fetching: pending profiles count, next published event, ticket revenue sum, completed drink orders sum
- ManagementSection rendered conditionally after Settings section
- All existing functionality preserved (tickets, drinks, media, settings, MobileNav)

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **ManagementSection as client component with props** - Data fetching happens in the server-side parent page via `Promise.all` for parallel queries, avoiding supabase client prop-drilling
2. **CSS grid-rows animation** - Pure CSS approach (no motion library), using `grid-rows-[1fr]`/`grid-rows-[0fr]` with opacity for smooth expand/collapse
3. **Management links use actual route paths** - Verified admin routes (events, members, artists, venues, newsletter, finance) and organizer routes (events, members, artists, venues) exist

## Verification Results

- TypeScript compilation: PASSED (0 errors)
- Full build (`npm run build`): PASSED
- ManagementSection import count in dashboard: 2 (import + JSX)
- "My Stuff" label count in dashboard: 1
- CollapsibleSection usage in ManagementSection: 3 (import + JSX + type)

## Self-Check: PASSED

- CollapsibleSection.tsx: FOUND
- ManagementSection.tsx: FOUND
- 20-02-SUMMARY.md: FOUND
- Commit 9405252: FOUND
- Commit d6ffdc7: FOUND
