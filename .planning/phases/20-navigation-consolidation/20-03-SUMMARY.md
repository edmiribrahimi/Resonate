---
phase: 20-navigation-consolidation
plan: 03
subsystem: check-in
tags: [scanner, attendance, search, attendee-list]
dependency_graph:
  requires: []
  provides: [attendee-search-api, attendee-list-ui]
  affects: [admin-scanner-page, attendance-api]
tech_stack:
  added: []
  patterns: [debounced-search, flat-attendee-list]
key_files:
  created: []
  modified:
    - src/app/api/tickets/attendance/route.ts
    - src/app/(admin)/admin/scanner/ScannerClient.tsx
decisions:
  - Attendee list is read-only (no tap-to-check-in) since existing checkin API requires QR token, not ticket ID
  - Search filtering done server-side in JS after fetch (attendee lists per party typically <500)
  - Removed old collapsible attendance in favor of always-visible flat list
metrics:
  duration: 118s
  completed: "2026-03-09T16:47:42Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 20 Plan 03: Check-in Attendee List Summary

Enhanced Check-in page with always-visible searchable attendee list and QR scanner, replacing the old collapsible recent-check-ins-only view.

## What Was Done

### Task 1: Extend attendance API with search and full attendee list
**Commit:** `105d5d6`

Extended `/api/tickets/attendance` GET endpoint to:
- Accept optional `?search=` query parameter for case-insensitive name filtering
- Return `attendees` array per party with `ticketId`, `name`, `checkedIn`, `checkedInAt`
- Fetch all ticket holders via `getServiceClient()` (RLS bypass), ordered unchecked-first
- Apply JS-level search filter after fetch for simplicity
- Preserve full backward compatibility (existing `recentCheckins` field unchanged)

### Task 2: Add attendee list with name search to ScannerClient
**Commit:** `55124fe`

Restructured Check-in page layout:
- Renamed page title from "QR Scanner" to "Check-in"
- Added always-visible search input with magnifying glass icon at top
- Flat attendee list per party showing name + check-in status (green checkmark with time, or "Not arrived")
- 300ms debounced search triggers API call with search parameter
- QR Scanner moved to dedicated section below attendee list with section divider
- Removed old collapsible "Today's Attendance" toggle and `showAttendance` state
- All existing QR scanner functionality (init, scan, verify, reset) preserved unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Read-only attendee list**: No tap-to-check-in since `/api/tickets/checkin` requires a signed QR token, not a ticket ID. Manual name-based check-in deferred to future iteration.
2. **JS-level search filtering**: Done after fetching all attendees per party (typically <500 people), simpler than complex SQL patterns.
3. **Replaced collapsible with flat list**: Old `showAttendance` toggle removed; attendee list is always visible for quick access.

## Verification Results

- `npm run build` passes with zero errors
- `grep -c "searchQuery\|attendees" ScannerClient.tsx` returns 11 matches
- `grep -c "searchParams.*search" route.ts` returns 1 match
- TypeScript type-check (`tsc --noEmit`) passes clean

## Self-Check: PASSED

- [x] 20-03-SUMMARY.md exists
- [x] src/app/api/tickets/attendance/route.ts exists
- [x] src/app/(admin)/admin/scanner/ScannerClient.tsx exists
- [x] Commit 105d5d6 found in git log
- [x] Commit 55124fe found in git log
