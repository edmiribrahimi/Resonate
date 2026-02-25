---
phase: 07-event-media
plan: 02
subsystem: media-upload-gallery-ui
tags: [upload, gallery, lightbox, drag-drop, media, client-components]
dependency_graph:
  requires: [07-01]
  provides: [media-upload-ui, media-gallery-display, media-lightbox]
  affects: [event-detail-page, member-experience]
tech_stack:
  added: []
  patterns: [drag-drop-upload, native-dialog-lightbox, file-validation, browser-supabase-storage]
key_files:
  created:
    - src/components/media/MediaGrid.tsx
    - src/components/media/Lightbox.tsx
    - src/components/media/MediaUpload.tsx
    - src/app/(public)/events/[slug]/MediaGallerySection.tsx
  modified:
    - src/app/(public)/events/[slug]/page.tsx
decisions:
  - Native dialog element for lightbox (accessibility, escape key, backdrop click built-in)
  - Simple progress states (pending/uploading/done/error) instead of percentage-based progress
  - Co-located MediaGallerySection in event slug directory for clean server/client boundary
metrics:
  duration: ~153s
  completed: 2026-02-25T13:55:00Z
---

# Phase 7 Plan 2: Upload UI and Event Gallery Summary

Drag-drop media upload with preview/validation and responsive gallery with native dialog lightbox on event detail page.

## What Was Built

### Task 1: Shared Media Components (MediaGrid, Lightbox, MediaUpload)
- **MediaGrid** (`src/components/media/MediaGrid.tsx`): Responsive thumbnail grid (`grid-cols-2 sm:grid-cols-3`) with photo `<img>` thumbnails and video play icon overlays. Supports `onItemClick` callback and optional `actions` render prop for overlay buttons.
- **Lightbox** (`src/components/media/Lightbox.tsx`): Full-size viewer using native `<dialog>` element with `showModal()`/`close()` lifecycle. Photos render with `object-contain`, videos with `controls autoPlay`. Supports Escape key (native), backdrop click, and close button. Dark overlay via `bg-black/90`.
- **MediaUpload** (`src/components/media/MediaUpload.tsx`): Complete upload interface with drag-and-drop area, hidden file input, multi-file selection, client-side validation (JPEG/PNG/WebP up to 10MB, MP4/MOV up to 100MB), preview grid with file info and remove buttons, per-file upload status tracking, Supabase Storage upload via browser client, server action integration for validation and registration, and success/error messaging.

### Task 2: Gallery Section on Event Detail Page
- **MediaGallerySection** (`src/app/(public)/events/[slug]/MediaGallerySection.tsx`): Client component wrapper managing lightbox state and upload complete callback via `router.refresh()`.
- **Event detail page** (`src/app/(public)/events/[slug]/page.tsx`): Server-side query for approved media (`event_media` where `status = 'approved'`), upload eligibility check (authenticated + approved + has ticket), gallery section placed after existing content with consistent heading style.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 53a1588 | feat(07-02): shared media components - MediaGrid, Lightbox, MediaUpload |
| 2 | ee5f23d | feat(07-02): wire gallery and upload into event detail page |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **Native `<dialog>` for lightbox** -- Built-in Escape key handling, backdrop click support, focus trapping, and screen reader accessibility without third-party libraries.
2. **Simple upload status states** -- Used `pending | uploading | done | error` per file instead of percentage-based progress since Supabase JS `.upload()` does not support progress callbacks. Spinner during upload, checkmark on success, X on error.
3. **Co-located MediaGallerySection** -- Placed in the event `[slug]` directory alongside the page rather than in shared components, since it is tightly coupled to the event detail page's data flow and server/client boundary.

## Verification

- `npx tsc --noEmit` passes with zero errors
- MediaGrid renders responsive grid with photo thumbnails and video play icon overlays
- Lightbox uses native `<dialog>` element for accessibility
- MediaUpload validates file types (JPEG/PNG/WebP, MP4/MOV) and sizes (10MB/100MB) client-side
- Upload flow calls `validateMediaUpload` then uploads to Supabase Storage then calls `registerMedia`
- Gallery section appears on event detail page with approved media query
- Upload area conditional on ticket ownership + approved status
- Empty states: "No photos or videos yet" and "Be the first to share photos from this event!"

## Self-Check: PASSED

All 5 files found. Both commits (53a1588, ee5f23d) verified in git log.
