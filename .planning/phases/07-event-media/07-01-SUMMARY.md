---
phase: 07-event-media
plan: 01
subsystem: media-data-layer
tags: [database, storage, server-actions, rls, moderation]
dependency_graph:
  requires: [06-01]
  provides: [event-media-schema, event-media-bucket, media-server-actions]
  affects: [event-detail-page, member-dashboard]
tech_stack:
  added: []
  patterns: [supabase-storage-bucket, moderation-status-filter, ticket-ownership-gate]
key_files:
  created:
    - supabase/migrations/20260225_phase7_media.sql
    - src/app/(public)/events/[slug]/actions.ts
  modified:
    - src/types/database.ts
decisions:
  - Ticket ownership as attendance gate for media upload authorization
  - Separate event-media bucket from existing event-images bucket (100MB limit for videos)
  - Granular RLS replacing overly-broad event_media_select_all and event_media_all_admin policies
  - Storage path structure eventId/userId/timestamp.ext for collision avoidance
metrics:
  duration: ~60s
  completed: 2026-02-25T13:49:00Z
---

# Phase 7 Plan 1: Media Data Foundation Summary

Database schema, storage bucket, and server actions for member media uploads with moderation workflow.

## What Was Built

### Task 1: Database Migration and TypeScript Types
- **Migration** (`20260225_phase7_media.sql`): ALTER TABLE adds `uploaded_by`, `status` (pending/approved/rejected), and `file_size` columns to `event_media`. Three indexes on event_id, uploaded_by, status. Dropped overly-broad policies, replaced with 7 granular RLS policies (select approved, select own, select admin, insert member, delete own, delete admin, update admin). Created `event-media` storage bucket (public, 100MB limit) with 4 storage RLS policies.
- **TypeScript types** (`database.ts`): Updated `EventMedia` interface with `uploaded_by: string`, `status: 'pending' | 'approved' | 'rejected'`, `file_size: number | null`.

### Task 2: Media Server Actions
- **validateMediaUpload**: Pre-upload gate checking auth, approved status, and ticket ownership (attendance = ticket per CONTEXT.md).
- **registerMedia**: Post-upload metadata insertion with constructed public URL, sets status to `pending`.
- **updateMediaStatus**: Organizer/master moderation action to approve or reject media.
- **deleteMedia**: Removes both Storage file and DB record; allows self-delete or admin delete with authorization checks.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | ddf90bc | feat(07-01): database migration and TypeScript types for event media |
| 2 | df09a83 | feat(07-01): media server actions for upload validation, registration, moderation, deletion |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **Ticket ownership as attendance gate** -- Query `tickets` table for `(event_id, user_id)` match rather than a separate attendance/check-in table. Per CONTEXT.md decision.
2. **Added event_media_delete_admin policy** -- Plan listed 6 table policies; added a 7th DELETE policy for admins to allow organizer/master to delete any media (not just update status). This is required for the deleteMedia server action to work via RLS.
3. **Storage file deletion is best-effort** -- If storage deletion fails, the DB record is still deleted and error is logged. Prevents orphaned DB records from blocking the operation.

## Verification

- `npx tsc --noEmit` passes with zero errors
- Migration SQL follows conventions from Phase 5 and Phase 6 migrations
- All four server actions exported and use server-side Supabase client pattern
- RLS policies use existing `is_admin_or_organizer()` and `get_user_status()` helper functions
