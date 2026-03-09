---
phase: 24-guest-list-management
plan: 03
subsystem: guest-list
tags: [csv-import, bulk-operations, clone, attendance-api, check-in, papaparse]
dependency_graph:
  requires: [guest-list-entries-table]
  provides: [csv-import-component, bulk-add-guests, clone-guest-list, attendance-guest-list, guest-checkin-post]
  affects: [attendance-api, check-in-page]
tech_stack:
  added: [papaparse]
  patterns: [client-side-csv-parsing, drag-and-drop-upload, sequential-rate-limited-processing, name-based-checkin]
key_files:
  created:
    - src/app/(organizer)/organizer/events/[id]/guest-list/CSVImport.tsx
    - src/app/(organizer)/organizer/events/[id]/guest-list/csv-actions.ts
  modified:
    - src/app/api/tickets/attendance/route.ts
    - package.json
decisions:
  - "Dynamic import for processGuestEntry in bulkAddGuests (graceful handling when Plan 02 not yet executed)"
  - "PapaParse client-side parsing with header normalization (trim, lowercase, underscore spaces)"
  - "Clone only copies name+email, does NOT auto-process entries (organizer triggers manually)"
  - "Attendance API sorts unchecked first then alphabetical (not checked-in first as plan suggested)"
  - "POST check-in returns 409 for already-checked-in guests (idempotent with feedback)"
  - "fetchOrganizerEvents filters to only events with guest list entries (avoids empty clone sources)"
metrics:
  duration_seconds: 282
  completed: "2026-03-09T22:51:09Z"
  tasks: 2
  files_created: 2
  files_modified: 2
---

# Phase 24 Plan 03: Bulk Operations & Check-in Integration Summary

**One-liner:** CSV import with PapaParse client-side parsing, preview table with validation, bulk add with rate limiting, clone from previous event, and extended attendance API with POST endpoint for name-based guest check-in.

## What Was Built

### CSV Import Component (`CSVImport.tsx`)
- Drag-and-drop file upload zone with `.csv` acceptance filter
- PapaParse parsing with `header: true`, `skipEmptyLines: true`, and header normalization (`trim().toLowerCase().replace(/\s+/g, '_')`)
- Flexible column mapping: accepts `first_name`/`name` and `last_name`/`surname` headers
- Client-side validation: required name fields, email format check, within-file duplicate detection by lowercase email
- Preview table showing row number, names, email, and color-coded status (green valid, red error, yellow duplicate)
- Summary bar showing valid/error/duplicate counts
- Party selector dropdown for assignment
- Import button calling `bulkAddGuests` server action with progress state
- Import results display showing imported/skipped/failed counts with error details
- Cancel button to clear preview

### Clone Guest List Feature (`CSVImport.tsx` + `csv-actions.ts`)
- "Clone from Previous Event" section with source event picker
- `fetchOrganizerEvents` returns past events filtered to those with guest list entries, showing guest count
- `cloneGuestList` copies name+email from source event, skips duplicates via email check, resets status to pending
- Clone does NOT auto-process entries (manual processing by organizer per plan spec)
- Party selector for target assignment

### Bulk Server Actions (`csv-actions.ts`)
- `bulkAddGuests`: validates each guest (name required, email format), normalizes emails to lowercase, checks for existing entries via `ilike` before insert, handles unique constraint violations, processes email-bearing guests via `processGuestEntry` with 500ms delay between each (rate limiting), tracks imported/skipped/failed counts
- `cloneGuestList`: verifies organizer access to both source and target events, copies entries with deduplication, returns cloned/skipped counts
- `fetchOrganizerEvents`: returns organizer's events (excluding current) that have guest list entries
- All actions verify organizer/master role and event ownership

### Extended Attendance API (`route.ts`)
- GET: now queries `guest_list_entries` without tickets alongside ticket-based attendees
- Guest list entries filtered: `ticket_id IS NULL`, `status != 'failed'`, matching party_id or null
- Each attendee includes: `ticketId`, `guestListEntryId`, `name`, `checkedIn`, `checkedInAt`, `isGuestList`, `hasEmail`
- Search filter applied to both ticket holders and guest list entries
- Sorting: unchecked first, then alphabetical by name
- Response includes `guestListCount` alongside `totalTickets`
- POST: accepts `{ guestListEntryId }`, verifies entry exists, handles already-checked-in (409), updates status to `checked_in` with timestamp
- Refactored auth verification into shared `verifyOrganizerRole()` function

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] processGuestEntry dependency (Plan 02 not executed)**
- **Found during:** Task 1
- **Issue:** `processGuestEntry` from `@/lib/guest-list/process-entry` does not exist yet (Plan 02 creates it)
- **Fix:** Used dynamic `import()` wrapped in try/catch in `bulkAddGuests` -- if the module is unavailable, entries are inserted as pending and can be processed later when Plan 02 is executed
- **Files modified:** `csv-actions.ts`
- **Commit:** 8071bfb

**2. [Rule 2 - Missing Critical] fetchOrganizerEvents helper**
- **Found during:** Task 1
- **Issue:** Clone feature needs a way to list organizer's past events with guest lists -- not specified in plan actions
- **Fix:** Added `fetchOrganizerEvents` server action that queries events with guest list entries, filtered by organizer ownership
- **Files modified:** `csv-actions.ts`
- **Commit:** 8071bfb

## Verification Results

- `npm run build` passes without errors
- PapaParse installed (`papaparse@^5.5.3`, `@types/papaparse@^5.5.2`)
- CSVImport component renders with drag-and-drop zone, preview table, import button, clone section
- csv-actions.ts contains bulkAddGuests, cloneGuestList, fetchOrganizerEvents with proper auth/ownership checks
- Attendance API GET returns both ticket holders and guest list entries with isGuestList flag
- Attendance API POST handles guest-list check-in with proper validation and error handling
- All files follow project patterns (dark theme Tailwind, rounded-xl, border-white/10, bg-white/5)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 8071bfb | CSV import component + bulk/clone server actions + PapaParse install |
| 2 | 35e899e | Extended attendance API with guest list entries + POST check-in endpoint |

## Self-Check: PASSED
