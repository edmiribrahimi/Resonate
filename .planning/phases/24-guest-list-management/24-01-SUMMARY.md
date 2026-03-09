---
phase: 24-guest-list-management
plan: 01
subsystem: guest-list
tags: [database, schema, migration, trigger, types, refund-guard, sales]
dependency_graph:
  requires: []
  provides: [guest-list-entries-table, approved-via-column, ticket-type-column, guest-list-trigger, refund-guard, sales-guest-count]
  affects: [profiles, tickets, handle_new_user, refund-actions, sales-page]
tech_stack:
  added: []
  patterns: [schema-migration, trigger-update, rls-policies, type-guards]
key_files:
  created:
    - supabase/migrations/20260310000000_guest_list.sql
  modified:
    - src/types/database.ts
    - src/app/(public)/tickets/refund-actions.ts
    - src/app/(organizer)/organizer/events/[id]/sales/page.tsx
    - src/app/(public)/events/[slug]/page.tsx
decisions:
  - "tier_id made nullable (not hidden tier approach) -- simpler, ticket_type already distinguishes guest list tickets"
  - "approveRefund gracefully handles free tickets (skip SumUp, update records, delete ticket)"
  - "adminRefund throws error on free tickets (complimentary ticket safety net)"
  - "Email matching in trigger uses LOWER() for case-insensitive comparison"
  - "Guest list tickets show as 'Guest List' in buyer tier name column"
metrics:
  duration_seconds: 214
  completed: "2026-03-09T22:42:17Z"
  tasks: 2
  files_created: 1
  files_modified: 4
---

# Phase 24 Plan 01: Database Foundation Summary

**One-liner:** Guest list database schema with guest_list_entries table, approved_via/ticket_type columns, nullable tier_id, updated handle_new_user trigger for auto-approval, refund guards for free tickets, and sales page guest list count display.

## What Was Built

### Database Migration (`20260310000000_guest_list.sql`)
- `approved_via` column on profiles with CHECK constraint (referral/guest_list/admin_manual) and backfill
- `ticket_type` column on tickets with CHECK constraint (purchased/guest_list), default 'purchased'
- `tier_id` made nullable on tickets for guest list tickets without a tier
- `guest_list_entries` table with full lifecycle tracking (pending -> invited -> registered -> ticket_issued -> checked_in)
- Case-insensitive unique index on (event_id, LOWER(email))
- 3 performance indexes (event_id, email, status)
- 4 RLS policies using existing `is_admin_or_organizer()` function
- Updated `handle_new_user()` trigger: checks `guest_list_event_id` metadata, checks guest_list_entries for email match, falls through to referral logic

### TypeScript Types (`database.ts`)
- `GuestListStatus` type with all 7 statuses
- `GuestListEntry` interface matching DB schema exactly
- `Profile` interface updated with `approved_via` field
- `Ticket` interface updated: `tier_id: string | null`, added `ticket_type`

### Refund Guards (`refund-actions.ts`)
- `approveRefund`: early return for `amount_paid === 0` or `ticket_type === 'guest_list'` -- skips SumUp, updates refund record, deletes ticket
- `adminRefund`: throws descriptive error for free/guest_list tickets -- prevents accidental refund attempts

### Sales Dashboard (`sales/page.tsx`)
- Separate query counts guest list tickets per event
- Info box displayed above SalesDashboard when guest list tickets exist
- Buyer list shows "Guest List" as tier name for guest_list ticket_type

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed tier_id nullability in event slug page**
- **Found during:** Task 2
- **Issue:** `src/app/(public)/events/[slug]/page.tsx` had `tier_id: string` type annotation (2 occurrences) which would be incorrect after making tier_id nullable in the DB
- **Fix:** Changed to `tier_id: string | null` in both interface and variable declaration
- **Files modified:** `src/app/(public)/events/[slug]/page.tsx`
- **Commit:** dba6f57

## Verification Results

- `npm run build` passes without errors
- `GuestListEntry` and `GuestListStatus` exported from `database.ts`
- `Profile` interface includes `approved_via`
- `Ticket` interface includes `ticket_type` and `tier_id: string | null`
- Migration SQL contains all schema changes + trigger update (14 DDL statements)
- Refund actions guard against `amount_paid === 0` and `ticket_type === 'guest_list'`
- Sales page queries and displays guest list ticket count

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 943a53b | Database migration: guest_list_entries table, schema changes, trigger update |
| 2 | dba6f57 | TypeScript types, refund guards, sales dashboard update |

## Self-Check: PASSED
