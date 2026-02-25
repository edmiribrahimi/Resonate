---
phase: 05-event-management
plan: 01
subsystem: event-data-foundation
tags: [database, migration, rls, storage, server-actions, slugify]
dependency_graph:
  requires: [02-01-schema-migration]
  provides: [event-crud-actions, event-rls-policies, event-storage-bucket, slugify-utility]
  affects: [events-table, storage-objects, typescript-types]
tech_stack:
  added: []
  patterns: [service-role-bypass, ownership-rls, slug-generation]
key_files:
  created:
    - supabase/migrations/20260225_phase5_events.sql
    - src/utils/slugify.ts
    - src/app/(organizer)/organizer/events/actions.ts
  modified:
    - supabase/schema.sql
    - src/types/database.ts
decisions:
  - "ON DELETE SET NULL for created_by (preserves events if user deleted)"
  - "Slug uniqueness via timestamp base36 suffix on collision"
  - "Validation: title 3-100 chars, description 10-5000 chars, capacity positive int"
metrics:
  duration: 148s
  completed: 2026-02-25T11:49:45Z
---

# Phase 5 Plan 01: Event Data Foundation Summary

Database migration adding created_by ownership column with granular RLS (organizer-owns, master-manages-all), event-images storage bucket with upload policies, slugify utility, and 5 event CRUD server actions (create/update/delete/publish/unpublish).

## What Was Built

### Task 1: Database migration, storage bucket setup, and TypeScript types
**Commit:** d389d18

- **Migration SQL** (`supabase/migrations/20260225_phase5_events.sql`):
  - Added `created_by uuid` column to events table (references auth.users, ON DELETE SET NULL)
  - Dropped overly-permissive `events_all_admin` policy
  - Created 5 granular RLS policies: `events_select_published` (anon reads published), `events_select_admin` (organizers see all), `events_insert_admin` (organizers create), `events_update_own` (owner or master), `events_delete_own` (owner or master)
  - Created `event-images` storage bucket (public) with 4 storage RLS policies for upload/view/update/delete
- **Schema** (`supabase/schema.sql`): Updated to reflect all new columns, policies, and storage bucket
- **Types** (`src/types/database.ts`): Added `created_by: string | null` to Event interface

### Task 2: Slug utility and event CRUD server actions
**Commit:** 26503ae

- **Slugify** (`src/utils/slugify.ts`): Vanilla slug generation - lowercase, NFD normalize, strip diacritics, remove special chars, collapse hyphens, trim, limit 80 chars
- **Server Actions** (`src/app/(organizer)/organizer/events/actions.ts`):
  - `createEvent(formData)`: Validates input, generates unique slug, inserts as draft with created_by
  - `updateEvent(eventId, formData)`: Ownership check, master bypass via service-role client
  - `deleteEvent(eventId)`: Ownership check, master bypass
  - `publishEvent(eventId)`: Sets is_published = true with ownership check
  - `unpublishEvent(eventId)`: Sets is_published = false with ownership check
  - Shared `verifyOrganizer` helper (role check, returns isMaster flag)
  - Shared `verifyEventOwnership` helper (created_by check, master bypass)
  - Shared `validateEventData` helper (title, description, date, time, capacity validation)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx next build` completes with 0 errors
- Migration SQL file exists with created_by, 5 RLS policies, and storage setup
- `src/types/database.ts` Event interface includes `created_by: string | null`
- `src/utils/slugify.ts` exports named `slugify` function
- `src/app/(organizer)/organizer/events/actions.ts` exports all 5 actions
- Server actions follow established pattern (service-role client, verify helper, revalidatePath)
- Key links verified: actions.ts imports slugify, queries events table via `.from("events")`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| ON DELETE SET NULL for created_by | Events should be preserved even if the creating user is deleted; orphaned events can be managed by master |
| Timestamp base36 suffix for slug collision | Low-volume event creation makes collision rare; base36 timestamp is short and unique enough |
| Title 3-100 chars, description 10-5000 chars | Balances minimum quality (no empty/trivial entries) with practical limits |
| Capacity must be positive integer if provided | Zero or negative capacity is meaningless; null means unlimited |

## Self-Check: PASSED

All 5 created/modified files verified on disk. Both task commits (d389d18, 26503ae) verified in git log.
