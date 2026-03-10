---
phase: 28-single-event-tier-fix
plan: 01
subsystem: tickets
tags: [ui, conditional-rendering, event-pass]
dependency_graph:
  requires: []
  provides: [conditional-event-pass-visibility]
  affects: [organizer-ticket-management, admin-ticket-management, buyer-event-detail]
tech_stack:
  added: []
  patterns: [total-party-count-query, conditional-section-rendering]
key_files:
  created: []
  modified:
    - src/app/(organizer)/organizer/events/[id]/tickets/page.tsx
    - src/app/(admin)/admin/events/[id]/tickets/page.tsx
    - src/app/(public)/events/[slug]/page.tsx
decisions:
  - Organizer/admin pages use separate count query for total parties (existing query filters by paid only)
  - Buyer page reuses existing parties array length (already fetches all access types)
  - Event-level tier DB fetch skipped entirely for single-party events on buyer page (optimization)
metrics:
  duration: 102s
  completed: "2026-03-10T02:28:03Z"
  tasks: 2
  files_modified: 3
---

# Phase 28 Plan 01: Single Event Tier Fix Summary

Hide event pass tiers across organizer, admin, and buyer pages when event has only one sub-event, using total party count queries on organizer/admin and existing parties array on buyer page.

## Changes Made

### Task 1: Hide event pass section on organizer and admin ticket management pages
**Commit:** `3546ac5`

- Added `totalPartyCount` query counting ALL parties (not just paid) on both organizer and admin pages
- Derived `showEventPass = totalPartyCount > 1` boolean
- Wrapped entire Event Pass Tiers section (heading + AddTierForm + tier list) in `{showEventPass && (...)}` conditional
- Organizers cannot create event-level tiers for single-party events (AddTierForm hidden too)

**Files modified:**
- `src/app/(organizer)/organizer/events/[id]/tickets/page.tsx`
- `src/app/(admin)/admin/events/[id]/tickets/page.tsx`

### Task 2: Hide event pass section on buyer-side event detail page
**Commit:** `db078a7`

- Added `parties.length > 1` condition to event pass section rendering
- Wrapped event-level tier fetch in `if (parties.length > 1)` to skip unnecessary DB queries
- No additional query needed since `parties` array already contains all access types (no `access_type` filter in buyer page query)

**Files modified:**
- `src/app/(public)/events/[slug]/page.tsx`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation: PASSED (both tasks)
- All three pages conditionally render event pass section based on party count
- Single-party events: no event pass section visible
- Multi-party events: event pass section renders as before (no regression)

## Self-Check: PASSED
