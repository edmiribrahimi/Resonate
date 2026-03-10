---
phase: 25-guest-list-fixes
plan: 01
subsystem: guest-list
tags: [integration-gaps, csv-import-wiring, navigation, scanner-checkin, posthog-tracking]
dependency_graph:
  requires: [csv-import-component, guest-list-entries-table, attendance-api, posthog-server]
  provides: [csv-import-rendering, guest-list-navigation, scanner-guest-checkin, guest-list-analytics]
  affects: [guest-list-page, event-list, scanner-page, attendance-api]
tech_stack:
  added: []
  patterns: [server-side-posthog-capture, guest-list-badge-indicator, name-based-checkin-button]
key_files:
  created: []
  modified:
    - src/app/(organizer)/organizer/events/[id]/guest-list/GuestListClient.tsx
    - src/components/events/EventList.tsx
    - src/app/(admin)/admin/scanner/ScannerClient.tsx
    - src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts
    - src/app/(organizer)/organizer/events/[id]/guest-list/csv-actions.ts
    - src/app/api/tickets/attendance/route.ts
decisions:
  - "CSVImport rendered between add guest form and summary stats (natural workflow position)"
  - "Guest List link placed between Sales and Media in EventList actions (logical grouping)"
  - "Purple badge for guest list entries in scanner (visual distinction from ticket holders)"
  - "Guest list check-in button uses accent/20 color scheme (consistent with app accent pattern)"
  - "PostHog capture calls placed after successful DB operations but before return (non-blocking analytics)"
metrics:
  duration_seconds: 229
  completed: "2026-03-10T00:54:22Z"
  tasks: 3
  files_created: 0
  files_modified: 6
---

# Phase 25 Plan 01: Guest List Integration Fixes Summary

**One-liner:** Wire 5 orphaned guest list integration gaps: CSVImport rendering in GuestListClient, Guest List navigation in EventList, scanner guest check-in with badge/button in ScannerClient, and PostHog tracking across all guest list server actions.

## What Was Built

### CSVImport Wiring (GuestListClient.tsx)
- Imported CSVImport component and rendered it between the "Add Guest" form and "Summary Stats" sections
- Props match exactly: `eventId` (string) and `parties` (array of {id, title}) already available in GuestListClient

### Guest List Navigation (EventList.tsx)
- Added "Guest List" Link between "Sales" and "Media" action links
- Uses existing `basePath` prop for correct routing in both organizer and admin contexts
- Matches existing link styling (rounded-full border pill buttons)

### Scanner Guest List Support (ScannerClient.tsx)
- Extended `Attendee` interface with `guestListEntryId`, `isGuestList`, `hasEmail` fields (null-safe types)
- Extended `AttendanceEvent` interface with `guestListCount` field
- Progress bar now shows "+ N guest list" when guest list entries exist
- Purple "Guest List" badge on guest list attendee names
- "Check in" button for unchecked guest list entries (replaces "Not arrived" text)
- `handleGuestCheckIn` function POSTs to `/api/tickets/attendance` with `guestListEntryId`
- Handles success (refresh), 409 (already checked in), and error states
- React list key uses `ticketId || guestListEntryId` for unique identification

### PostHog Tracking (actions.ts, csv-actions.ts, route.ts)
- `guest_list_add` event in `addGuest` with event_id, has_email, party_id properties
- `guest_list_remove` event in `removeGuest` with event_id, had_ticket properties
- `guest_list_csv_import` event in `bulkAddGuests` with event_id, imported, skipped, failed counts
- `guest_list_clone` event in `cloneGuestList` with source/target event IDs and cloned/skipped counts
- `guest_list_checkin` event in attendance POST with guest_list_entry_id
- All events use proper distinctId from authenticated user

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] removeGuest userId capture**
- **Found during:** Task 3
- **Issue:** `removeGuest` called `verifyOrganizerAccess(eventId)` without capturing the returned userId, but PostHog tracking needs it
- **Fix:** Changed `await verifyOrganizerAccess(eventId)` to `const userId = await verifyOrganizerAccess(eventId)` to capture the userId for PostHog distinctId
- **Files modified:** `actions.ts`
- **Commit:** 3bc1363

## Verification Results

- `npm run build` passes without errors
- CSVImport imported and rendered in GuestListClient (lines 7, 240)
- Guest List link exists in EventList (line 186)
- ScannerClient uses guestListEntryId in interface, rendering, and check-in function
- PostHog tracking confirmed in all 3 server-side files (actions.ts, csv-actions.ts, route.ts)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 105efca | Wire CSVImport into GuestListClient + add Guest List link to EventList |
| 2 | 4253018 | Extend ScannerClient with guest list rendering and check-in |
| 3 | 3bc1363 | Add PostHog tracking to all guest list operations |

## Self-Check: PASSED
