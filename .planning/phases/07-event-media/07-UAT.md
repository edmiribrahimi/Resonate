---
status: testing
phase: 07-event-media
source: 07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md
started: 2026-02-25T14:05:00Z
updated: 2026-02-25T14:05:00Z
---

## Current Test

number: 1
name: Event Media Gallery Display
expected: |
  Navigate to an event detail page. Below the existing content, you should see a "Photos & Videos" section. If no media has been approved yet, it shows an empty state like "No photos or videos yet." If approved media exists, it appears in a responsive thumbnail grid (2 columns on mobile, 3 on wider screens). Videos show a play icon overlay.
awaiting: user response

## Tests

### 1. Event Media Gallery Display
expected: Navigate to an event detail page. Below existing content, a "Photos & Videos" section appears. Empty state if no approved media, or a responsive thumbnail grid (2 cols mobile, 3 cols wider). Videos show play icon overlay.
result: [pending]

### 2. Media Lightbox Viewer
expected: Click any media thumbnail in the gallery. A full-screen dark overlay opens showing the photo at full size (or video with playback controls). You can close it with Escape key, clicking the backdrop, or clicking a close button.
result: [pending]

### 3. Media Upload Area (Ticket Holder)
expected: As a logged-in user with a ticket for the event, you see a drag-and-drop upload area on the event page (in/near the gallery section). It accepts file selection via click or drag-and-drop. Non-ticket-holders or logged-out users should NOT see the upload area.
result: [pending]

### 4. Upload Files with Validation
expected: Select files to upload. Invalid files (wrong type or too large) show client-side error messages. Valid files (JPEG/PNG/WebP up to 10MB, MP4/MOV up to 100MB) show a preview grid with file names, sizes, and remove buttons. Clicking upload shows per-file status (spinner during upload, checkmark on success, X on error).
result: [pending]

### 5. Organizer Media Review Page
expected: As an organizer, navigate to your event's media review page (via the "Media" link in the event list). You see pending uploads in a grid with uploader name, upload date, file size, and approve/reject buttons. Status count badges show pending/approved/rejected counts.
result: [pending]

### 6. Approve or Reject Media
expected: On the organizer media review page, click Approve on a pending upload. The item is optimistically removed from the pending list. Similarly, Reject dismisses the item. Approved media then appears in the public event gallery.
result: [pending]

### 7. Admin Media Review Page
expected: As an admin, navigate to an event's media review page from the admin panel. Same moderation grid as organizer with approve/reject. Back link goes to admin context (not organizer).
result: [pending]

### 8. EventList Media Link
expected: In the organizer or admin event list, each event row has a "Media" link alongside other action links (like Sales). Clicking it navigates to the correct media review page for that context (organizer or admin).
result: [pending]

### 9. Member Dashboard My Media
expected: On the member dashboard, below the My Tickets section, a "My Media" section appears. Your uploads are grouped by event with event name and date as section headings. Each upload shows a thumbnail, status badge (pending/approved/rejected), and a delete button.
result: [pending]

### 10. Delete Own Media from Dashboard
expected: On the My Media section, click delete on one of your uploads. A confirmation dialog appears (window.confirm). Confirming removes the media. The item disappears from the list.
result: [pending]

### 11. My Media Lightbox
expected: On the My Media section, click a thumbnail. A lightbox overlay shows the full-size image or video with close functionality.
result: [pending]

## Summary

total: 11
passed: 0
issues: 0
pending: 11
skipped: 0

## Gaps

[none yet]
