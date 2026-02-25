# Phase 7: Event Media - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Members who were checked in at an event can upload photos and videos for that event. Media appears in a gallery on the event detail page (after organizer approval) and on the uploading member's profile page grouped by event. File validation enforced (photos: JPEG/PNG/WebP up to 10MB, videos: MP4/MOV up to 100MB).

</domain>

<decisions>
## Implementation Decisions

### Upload Experience
- Upload interface is inline on the event detail page -- upload button/area directly in the gallery section, no separate page
- Multiple files can be uploaded at once -- multi-file picker or drag-and-drop area with progress per file
- Thumbnail previews shown before upload -- member can review and remove individual files before confirming
- File validation: photos JPEG/PNG/WebP up to 10MB, videos MP4/MOV up to 100MB (from requirements MDIA-05)

### Gallery Display
- Grid layout on event detail page -- simple responsive grid of thumbnails, click to view full-size in a lightbox/modal
- Photos and videos mixed in the same grid (videos with play icon overlay)

### Member Profile Media
- Media grouped by event on the member's profile page -- organized under event headings (event name + date), clear context for each upload

### Moderation & Limits
- Organizer review required -- uploaded media is hidden until the event's organizer approves it. Not immediately visible in the gallery.
- No per-event upload limits -- members can upload as much as they want. Trust the community; storage is the only constraint.
- Members can delete their own uploads (implied by ownership)

### Claude's Discretion
- Lightbox/modal component choice for full-size viewing
- Grid column count and responsive breakpoints
- Upload progress indicator style (per-file progress bars, overall progress, etc.)
- Drag-and-drop area visual design
- How organizer review queue is presented (inline on event page, separate section, etc.)
- Video thumbnail generation approach (first frame, placeholder icon, etc.)
- Supabase Storage bucket configuration for event media
- Database schema for media records (event_media table)
- How attendance/check-in verification works (ticket ownership check)
- Profile page media section layout within existing profile structure

</decisions>

<specifics>
## Specific Ideas

- Supabase Storage is already configured for event images (Phase 5 created the `event-images` bucket) -- this phase needs a separate `event-media` bucket for member uploads
- The attendance/check-in gate (MDIA-01, MDIA-06) maps to ticket ownership -- a member who purchased a ticket for an event is considered "checked in" for media upload purposes
- The existing event detail page at `src/app/(public)/events/[slug]/page.tsx` already has the gallery section placeholder from Phase 5
- React Email + Resend infrastructure exists for potential upload notification emails to organizers (optional)
- next.config.ts already has Supabase Storage image remote patterns configured

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 07-event-media*
*Context gathered: 2026-02-25*
