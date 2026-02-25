---
phase: 05-event-management
plan: 02
subsystem: event-management-ui
tags: [components, pages, forms, image-upload, crud-ui]
dependency_graph:
  requires: [05-01-event-data-foundation]
  provides: [event-form-components, organizer-event-pages, admin-event-pages]
  affects: [organizer-routes, admin-routes, event-images-storage]
tech_stack:
  added: []
  patterns: [tag-input-component, shared-form-component, client-side-upload, bound-server-actions]
key_files:
  created:
    - src/components/events/TagInput.tsx
    - src/components/events/EventForm.tsx
    - src/components/events/EventList.tsx
    - src/app/(organizer)/organizer/events/page.tsx
    - src/app/(organizer)/organizer/events/new/page.tsx
    - src/app/(organizer)/organizer/events/[id]/edit/page.tsx
    - src/app/(admin)/admin/events/page.tsx
  modified: []
decisions:
  - "Shared EventList client component for both organizer and admin pages (avoids duplication)"
  - "Bound server action pattern for edit page (closure over eventId in server component)"
  - "window.confirm() for published event delete confirmation (simple, effective)"
metrics:
  duration: 192s
  completed: 2026-02-25T11:56:19Z
---

# Phase 5 Plan 02: Organizer/Admin Event Management UI Summary

TagInput chip component, shared EventForm with client-side Supabase Storage upload, organizer event CRUD pages (list/create/edit), admin event management page with creator attribution, and shared EventList with publish/unpublish/delete actions.

## What Was Built

### Task 1: TagInput and EventForm components with cover image upload
**Commit:** bd39b23

- **TagInput** (`src/components/events/TagInput.tsx`):
  - Tag-style chip input with Enter/comma to add, click X to remove, backspace on empty to remove last
  - Case-insensitive duplicate prevention
  - Whitespace trimming, comma-separated paste handling
  - Styled with `rounded-full bg-accent/20 px-3 py-1 text-sm text-accent` pills
  - Focus-within ring on container, click-to-focus behavior

- **EventForm** (`src/components/events/EventForm.tsx`):
  - Shared create/edit form accepting `initialData`, `action`, and `submitLabel` props
  - All event fields: title, description, date, time, location, secret location toggle, lineup (via TagInput), cover image, capacity
  - Client-side image upload to Supabase Storage `event-images` bucket via browser client
  - 5MB max size and JPEG/PNG/WebP type validation with user-friendly error messages
  - Image preview thumbnail with clear/replace option
  - Loading state during upload and submission
  - Error display at top of form, redirect to `/organizer/events` on success
  - Secret location toggle with explanatory text and accessible switch component
  - Mobile-first layout consistent with existing codebase styling

### Task 2: Organizer and admin event management pages
**Commit:** e911ec7

- **EventList** (`src/components/events/EventList.tsx`):
  - Shared client component for interactive event list (used by both organizer and admin pages)
  - Publish/Unpublish/Delete action buttons with useTransition for pending states
  - Published event deletion requires window.confirm() confirmation dialog
  - Status badges: green "Published" or gray "Draft"
  - Displays date, capacity, and optional creator name
  - Empty state message

- **Organizer Events Page** (`src/app/(organizer)/organizer/events/page.tsx`):
  - Server component following existing organizer/members pattern
  - Role/status/userId from middleware headers with defense-in-depth redirect
  - Organizer sees own events; master sees all (via conditional `.eq("created_by", userId)`)
  - "Create Event" button linking to `/organizer/events/new`
  - Error state handling

- **Create Event Page** (`src/app/(organizer)/organizer/events/new/page.tsx`):
  - Thin server component wrapper with back link to events list
  - Renders EventForm with createEvent action and "Create Event" label

- **Edit Event Page** (`src/app/(organizer)/organizer/events/[id]/edit/page.tsx`):
  - Server component fetching event by id from Supabase
  - Ownership check: organizer can only edit own events, master can edit all
  - notFound() if event doesn't exist
  - Bound server action via inline `"use server"` closure over eventId
  - Renders EventForm with initialData and "Save Changes" label

- **Admin Events Page** (`src/app/(admin)/admin/events/page.tsx`):
  - Server component for master admin, role-gated
  - Queries all events with creator join (`profiles!created_by(full_name)`)
  - Displays creator name column via EventList's `showCreator` prop
  - Error and empty state handling

## Deviations from Plan

### Auto-added Functionality

**1. [Rule 2 - Missing Critical Functionality] Shared EventList client component**
- **Found during:** Task 2
- **Issue:** Plan specified extracting interactive portions to a client component but didn't define a specific shared component. Both organizer and admin pages need identical interactive event list behavior.
- **Fix:** Created `src/components/events/EventList.tsx` as a shared client component, avoiding code duplication between the two pages.
- **Files created:** `src/components/events/EventList.tsx`
- **Commit:** e911ec7

## Verification Results

- `npx next build` completes with 0 errors
- `/organizer/events` page exists and renders event list with create button
- `/organizer/events/new` page renders EventForm for creation
- `/organizer/events/[id]/edit` page renders EventForm for editing with ownership check
- `/admin/events` page renders all events with creator names
- TagInput supports add-on-Enter, remove-on-click, backspace-remove, duplicate prevention
- EventForm handles client-side image upload to Supabase Storage with preview
- Published event deletion requires confirmation via window.confirm()

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Shared EventList client component | Both organizer and admin pages need identical interactive list behavior; single component avoids duplication |
| Bound server action for edit page | Closure over eventId in server component is cleaner than hidden form fields; leverages Next.js server action closures |
| window.confirm() for delete confirmation | Simple, native, accessible; no need for custom modal component for a single confirmation prompt |
| Creator name extraction helper | Supabase join may return object or array depending on FK detection; same defensive pattern as admin/members page |

## Self-Check: PASSED
