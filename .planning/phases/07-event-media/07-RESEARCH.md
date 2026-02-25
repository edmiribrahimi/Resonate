# Phase 7: Event Media - Research

**Researched:** 2026-02-25
**Domain:** File upload, Supabase Storage, media gallery UI, moderation workflow
**Confidence:** HIGH

## Summary

Phase 7 adds member-uploaded photos and videos to events. The core challenge is wiring Supabase Storage uploads from a client component (with progress tracking) through server-side validation that confirms the uploader has a ticket for the event. The existing `event_media` table in `schema.sql` needs significant modification: it currently lacks `uploaded_by`, `status` (for moderation), and `file_size` columns that this phase requires. A new `event-media` storage bucket is needed alongside the existing `event-images` bucket (which is for organizer cover images only).

The upload flow is client-side (Supabase JS client direct upload to Storage for progress tracking), gated by a server action that verifies ticket ownership before returning a signed upload URL or performing the upload. The moderation workflow (organizer approval before gallery visibility) adds a `status` column to `event_media` with values `pending`/`approved`/`rejected`. The gallery is a responsive grid on the event detail page with a lightbox for full-size viewing, and a grouped-by-event section on the member dashboard/profile.

**Primary recommendation:** Use Supabase Storage direct upload from the browser client for progress tracking, with a server action that validates ticket ownership and inserts the `event_media` record. Use the native HTML `<dialog>` element for the lightbox (no external library needed -- consistent with the project's zero-extra-dependency approach).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Upload interface is inline on the event detail page -- upload button/area directly in the gallery section, no separate page
- Multiple files can be uploaded at once -- multi-file picker or drag-and-drop area with progress per file
- Thumbnail previews shown before upload -- member can review and remove individual files before confirming
- File validation: photos JPEG/PNG/WebP up to 10MB, videos MP4/MOV up to 100MB (from requirements MDIA-05)
- Grid layout on event detail page -- simple responsive grid of thumbnails, click to view full-size in a lightbox/modal
- Photos and videos mixed in the same grid (videos with play icon overlay)
- Media grouped by event on the member's profile page -- organized under event headings (event name + date)
- Organizer review required -- uploaded media is hidden until the event's organizer approves it. Not immediately visible in the gallery.
- No per-event upload limits -- members can upload as much as they want
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MDIA-01 | Approved members can upload photos for events they attended (verified against attendance record) | Ticket ownership check via `tickets` table query; Supabase Storage direct upload with server action gate |
| MDIA-02 | Approved members can upload videos for events they attended | Same upload flow as photos; separate MIME type and size validation (MP4/MOV, 100MB) |
| MDIA-03 | Uploaded media appears on the event detail page in a gallery section | Gallery grid component on event detail page; queries `event_media` filtered by `status = 'approved'` |
| MDIA-04 | Uploaded media appears on the member's profile page, tagged by event | Dashboard query joins `event_media` with `events` to group by event; new section on dashboard page |
| MDIA-05 | File validation enforced (photos: JPEG/PNG/WebP up to 10MB, videos: MP4/MOV up to 100MB) | Client-side validation before upload + server-side MIME/size check; Storage bucket size limit as backstop |
| MDIA-06 | Only members who were checked in at an event (attendance record exists) can upload media for that event | CONTEXT.md clarifies: "checked in" = ticket ownership. Query `tickets` table for `(event_id, user_id)` match |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.97.0 | Storage uploads + DB queries | Already installed; native Storage API with upload progress |
| Next.js 16 | 16.1.6 | Server actions for validation, App Router pages | Already installed; project framework |
| Tailwind CSS v4 | ^4 | Gallery grid, upload UI styling | Already installed; project styling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | No new dependencies required for this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<dialog>` for lightbox | react-lightbox, yet-another-react-lightbox | External dependency for something achievable with `<dialog>` + minimal CSS; project has zero UI component libraries |
| Supabase Storage direct upload | Pre-signed URL upload, server-side proxy upload | Direct upload gives progress events; server proxy would hide storage from client but lose progress tracking |
| Static video placeholder icon | Client-side video thumbnail via canvas | Canvas thumbnail extraction is fragile across browsers/codecs; a play icon overlay on a dark gradient is simpler and reliable |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(public)/events/[slug]/
│   ├── page.tsx              # Add gallery section + upload area (server component)
│   ├── TierSelection.tsx     # Existing (unchanged)
│   ├── MediaGallery.tsx      # NEW: client component -- gallery grid + lightbox
│   ├── MediaUpload.tsx       # NEW: client component -- drag-drop, preview, upload
│   └── actions.ts            # NEW: server actions -- upload validation, media CRUD
├── app/(members)/dashboard/
│   └── page.tsx              # Add "My Media" section grouped by event
├── app/(organizer)/organizer/events/[id]/
│   └── media/
│       └── page.tsx          # NEW: organizer media review queue
├── components/media/
│   ├── MediaGrid.tsx         # Shared: responsive thumbnail grid (used on event + dashboard)
│   └── Lightbox.tsx          # Shared: full-size media viewer using <dialog>
└── types/database.ts         # Update EventMedia interface
supabase/
└── migrations/
    └── 20260225_phase7_media.sql  # Schema changes + storage bucket + RLS
```

### Pattern 1: Client-Side Upload with Server Action Gate
**What:** Member selects files in a client component. Before uploading, a server action validates ticket ownership. Then the client component uploads directly to Supabase Storage (for progress events). After upload, another server action inserts the `event_media` record.
**When to use:** Any upload that needs both progress tracking and server-side authorization.
**Example:**
```typescript
// actions.ts (server action)
"use server";
import { createClient } from "@/lib/supabase/server";

export async function validateMediaUpload(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check approved status
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (profile?.status !== "approved") throw new Error("Not approved");

  // Check ticket ownership (= attendance gate per CONTEXT.md)
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ticket) throw new Error("No ticket for this event");

  return { userId: user.id, canUpload: true };
}

export async function registerMedia(
  eventId: string,
  storagePath: string,
  type: "photo" | "video",
  fileSize: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-media/${storagePath}`;

  const { error } = await supabase.from("event_media").insert({
    event_id: eventId,
    uploaded_by: user.id,
    url: publicUrl,
    type,
    file_size: fileSize,
    status: "pending",
  });
  if (error) throw new Error(error.message);
}
```

```typescript
// MediaUpload.tsx (client component) -- upload with progress
"use client";
import { createClient } from "@/lib/supabase/client";

async function uploadFile(file: File, eventId: string, userId: string) {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${eventId}/${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("event-media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;
  return path;
}
```

### Pattern 2: Moderation Status Filter
**What:** Gallery queries filter by `status = 'approved'` for public views. Organizer review page shows `status = 'pending'`. Uploader sees their own media regardless of status.
**When to use:** Any content requiring moderation before public display.
**Example:**
```typescript
// Public gallery query (event detail page)
const { data: media } = await supabase
  .from("event_media")
  .select("id, url, type, uploaded_by, created_at")
  .eq("event_id", event.id)
  .eq("status", "approved")
  .order("created_at", { ascending: false });

// Organizer review query
const { data: pendingMedia } = await supabase
  .from("event_media")
  .select("id, url, type, uploaded_by, created_at, profiles(full_name)")
  .eq("event_id", eventId)
  .eq("status", "pending")
  .order("created_at", { ascending: true });
```

### Pattern 3: Shared MediaGrid Component
**What:** A single responsive grid component used on: event detail gallery, organizer review queue, and member dashboard.
**When to use:** Whenever displaying media thumbnails in a grid.
**Example:**
```typescript
// MediaGrid.tsx
interface MediaItem {
  id: string;
  url: string;
  type: "photo" | "video";
}

export default function MediaGrid({
  items,
  onItemClick,
}: {
  items: MediaItem[];
  onItemClick?: (item: MediaItem) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className="relative aspect-square overflow-hidden rounded-xl bg-card"
        >
          {item.type === "photo" ? (
            <img src={item.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-card">
              <span className="text-4xl">&#9654;</span>
            </div>
          )}
          {item.type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-black/50 p-3">
                <span className="text-white text-xl">&#9654;</span>
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Server-side upload proxy for large files:** Do NOT route 100MB video uploads through the Next.js server action body. Use direct Supabase Storage uploads from the client. Server actions have body size limits (typically 1-4MB).
- **Polling for upload progress:** Supabase JS client provides upload progress via the `onUploadProgress` option -- do not implement custom polling.
- **Fetching full media list without pagination:** For events with many uploads, paginate or use `.range()` to avoid loading hundreds of records.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload to cloud storage | Custom upload endpoint with multer/formidable | Supabase Storage `upload()` from browser client | Handles multipart, progress, retries, CDN URLs |
| Image optimization/thumbnails | Sharp-based server-side thumbnail generation | Next.js `<Image>` component with width/height props | Automatic optimization, lazy loading, responsive |
| File type validation | Custom MIME sniffing | `file.type` check on client + Storage bucket MIME restriction | Browser provides MIME type; Supabase can enforce allowed types |
| Lightbox/modal overlay | Custom portal + focus trap + scroll lock | Native `<dialog>` element with `showModal()` | Built-in focus trapping, backdrop, Escape key, accessibility |

**Key insight:** Supabase Storage handles the hard parts (multipart upload, CDN, access control via RLS). The application layer only needs to validate authorization (ticket ownership) and manage metadata (event_media table records).

## Common Pitfalls

### Pitfall 1: Server Action Body Size Limits
**What goes wrong:** Attempting to upload files through Next.js server actions hits the default body size limit (1MB in many configurations, up to 4MB configurable).
**Why it happens:** Server actions serialize form data; large files exceed the limit.
**How to avoid:** Upload files directly from the client component to Supabase Storage. Use server actions only for validation (pre-upload) and metadata insertion (post-upload).
**Warning signs:** "Request body too large" errors on file upload.

### Pitfall 2: Missing `uploaded_by` Column on Existing event_media Table
**What goes wrong:** The existing `event_media` table in `schema.sql` does NOT have an `uploaded_by` column. Without it, you cannot track who uploaded what, cannot show media on member profiles, and cannot allow members to delete their own uploads.
**Why it happens:** The original schema was designed for organizer-managed media (Phase 5 gallery placeholder), not member uploads.
**How to avoid:** Migration MUST add: `uploaded_by uuid REFERENCES auth.users`, `status text DEFAULT 'pending'`, `file_size bigint`. Update existing RLS policies to support member uploads.
**Warning signs:** Foreign key errors when trying to insert `uploaded_by`, missing column errors.

### Pitfall 3: RLS Policy Gaps for Member Uploads
**What goes wrong:** Current `event_media` RLS only allows admin/organizer to manage media. Members cannot insert their own uploads or delete them.
**Why it happens:** Original policies assumed only organizers manage event media.
**How to avoid:** Add INSERT policy for authenticated approved members (with ticket check), DELETE policy for own media (`auth.uid() = uploaded_by`), and UPDATE policy for organizer/master to change `status`.
**Warning signs:** "new row violates row-level security policy" errors when members try to upload.

### Pitfall 4: Video Files and Next.js Image Component
**What goes wrong:** Trying to use `<Image>` component for video thumbnails or passing video URLs to image optimization.
**Why it happens:** Mixed media grid treats all items the same.
**How to avoid:** Conditionally render `<img>` (or `<Image>`) for photos and `<video>` (or a static play icon placeholder) for videos. Never pass video URLs to `next/image`.
**Warning signs:** 400 errors from Next.js image optimization API, broken thumbnails.

### Pitfall 5: Storage Path Collisions
**What goes wrong:** Two members upload files with the same name to the same event, overwriting each other.
**Why it happens:** Using original filename as the storage path.
**How to avoid:** Use a path structure like `{eventId}/{userId}/{timestamp}.{ext}` to guarantee uniqueness.
**Warning signs:** Files disappearing or being replaced unexpectedly.

## Code Examples

### Database Migration for Phase 7
```sql
-- Phase 7: Event Media -- Member Uploads
-- Adds columns to event_media, creates event-media storage bucket, updates RLS

BEGIN;

-- Step 1: Add columns to existing event_media table
ALTER TABLE public.event_media
  ADD COLUMN uploaded_by uuid REFERENCES auth.users ON DELETE CASCADE,
  ADD COLUMN status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN file_size bigint;

-- Step 2: Add indexes
CREATE INDEX idx_event_media_event_id ON public.event_media (event_id);
CREATE INDEX idx_event_media_uploaded_by ON public.event_media (uploaded_by);
CREATE INDEX idx_event_media_status ON public.event_media (status);

-- Step 3: Drop existing overly-broad policies
DROP POLICY IF EXISTS event_media_select_all ON public.event_media;
DROP POLICY IF EXISTS event_media_all_admin ON public.event_media;

-- Step 4: New RLS policies

-- Approved media visible to all authenticated users
CREATE POLICY event_media_select_approved ON public.event_media
  FOR SELECT TO authenticated
  USING (status = 'approved');

-- Users can see their own media regardless of status
CREATE POLICY event_media_select_own ON public.event_media
  FOR SELECT TO authenticated
  USING (auth.uid() = uploaded_by);

-- Organizer/master can see all media (for moderation)
CREATE POLICY event_media_select_admin ON public.event_media
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

-- Approved members can insert media (ticket check done in server action)
CREATE POLICY event_media_insert_member ON public.event_media
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (SELECT public.get_user_status()) = 'approved'
  );

-- Members can delete their own uploads
CREATE POLICY event_media_delete_own ON public.event_media
  FOR DELETE TO authenticated
  USING (auth.uid() = uploaded_by);

-- Organizer/master can update status (approve/reject)
CREATE POLICY event_media_update_admin ON public.event_media
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

-- Step 5: Create storage bucket for member-uploaded event media
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('event-media', 'event-media', true, 104857600)
  ON CONFLICT DO NOTHING;
-- 104857600 = 100MB (videos up to 100MB)

-- Step 6: Storage RLS policies for event-media bucket

-- Approved members can upload to event-media bucket
CREATE POLICY "Members can upload event media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-media'
    AND (SELECT public.get_user_status()) = 'approved'
  );

-- Anyone can view event media (public bucket)
CREATE POLICY "Anyone can view event media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-media');

-- Members can delete their own uploads from storage
-- Storage path: {eventId}/{userId}/{filename}
CREATE POLICY "Members can delete own event media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Organizer/master can delete any event media from storage
CREATE POLICY "Admins can delete event media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-media'
    AND (SELECT public.is_admin_or_organizer())
  );

COMMIT;
```

### Updated EventMedia TypeScript Interface
```typescript
// types/database.ts -- updated
export interface EventMedia {
  id: string;
  event_id: string;
  uploaded_by: string;
  url: string;
  type: "photo" | "video";
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  file_size: number | null;
  order: number;
  created_at: string;
}
```

### Client-Side File Validation
```typescript
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;  // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

function validateFile(file: File): { valid: boolean; error?: string; type: "photo" | "video" } {
  if (ALLOWED_PHOTO_TYPES.includes(file.type)) {
    if (file.size > MAX_PHOTO_SIZE) return { valid: false, error: "Photo exceeds 10MB limit", type: "photo" };
    return { valid: true, type: "photo" };
  }
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
    if (file.size > MAX_VIDEO_SIZE) return { valid: false, error: "Video exceeds 100MB limit", type: "video" };
    return { valid: true, type: "video" };
  }
  return { valid: false, error: "Unsupported file type", type: "photo" };
}
```

### Lightbox with Native `<dialog>`
```typescript
"use client";
import { useRef, useEffect } from "react";

export default function Lightbox({
  item,
  onClose,
}: {
  item: { url: string; type: "photo" | "video" } | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (item) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [item]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none bg-black/90 backdrop:bg-transparent p-0"
    >
      <div className="flex h-full w-full items-center justify-center p-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          &times;
        </button>
        {item?.type === "photo" ? (
          <img src={item.url} alt="" className="max-h-full max-w-full object-contain" />
        ) : item?.type === "video" ? (
          <video src={item.url} controls autoPlay className="max-h-full max-w-full" />
        ) : null}
      </div>
    </dialog>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side file upload proxy | Direct client-to-storage upload | Supabase Storage v2 (2023+) | Eliminates server memory/timeout issues for large files |
| Custom modals with portals + focus trap | Native `<dialog>` element | Baseline support in all modern browsers (2022+) | Built-in accessibility, no library needed |
| multer/formidable file parsing | FormData + Storage SDK | Next.js App Router (2023+) | Server actions handle metadata; Storage SDK handles binary |

**Deprecated/outdated:**
- `event_media.order` column: The existing schema has an `order` column which was designed for organizer-curated ordering. For member uploads, chronological ordering (`created_at`) is more appropriate. The `order` column can remain but defaults to 0 -- not actively used.

## Open Questions

1. **Supabase Storage `file_size_limit` per bucket vs per file type**
   - What we know: Bucket-level `file_size_limit` applies to ALL files in the bucket. Set to 100MB for videos.
   - What's unclear: Photos should be limited to 10MB but bucket limit is 100MB. Per-file-type limits are not natively supported.
   - Recommendation: Enforce the 10MB photo limit in client-side validation and server action validation. The 100MB bucket limit is a backstop for videos. This is sufficient -- members uploading a 50MB photo that passes the bucket limit would be caught by the server action.

2. **Organizer review queue -- which organizer?**
   - What we know: Each event has a `created_by` field linking to the organizer who created it. Moderation should be scoped to the event's organizer.
   - What's unclear: Should ANY organizer be able to moderate ANY event's media, or only the event creator?
   - Recommendation: Allow any organizer or master to moderate (consistent with existing event management patterns where `is_admin_or_organizer()` grants broad access). The review page is accessed from the organizer's event management flow, so they naturally see their own events first.

3. **Gallery page at /gallery**
   - What we know: A `/gallery` page exists as a placeholder ("Photos and videos from upcoming events will appear here"). CONTEXT.md does not mention updating this page.
   - What's unclear: Should this phase populate the /gallery page or leave it as-is?
   - Recommendation: Focus on event detail page gallery (MDIA-03) and profile page (MDIA-04) per requirements. The /gallery page can aggregate approved media across all events as a nice-to-have if time permits, but it is not required by any MDIA requirement.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `supabase/schema.sql` (event_media table, storage bucket patterns, RLS patterns)
- Existing codebase analysis: `src/app/(public)/events/[slug]/page.tsx` (event detail page structure, ticket ownership check pattern)
- Existing codebase analysis: `src/app/(members)/dashboard/page.tsx` (member profile page structure)
- Existing codebase analysis: `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts` (client patterns)
- Existing codebase analysis: `supabase/migrations/20260225_phase5_events.sql` (storage bucket + RLS policy pattern)
- Existing codebase analysis: `next.config.ts` (Supabase image remote patterns already configured)

### Secondary (MEDIUM confidence)
- Supabase Storage API: upload progress, bucket configuration, RLS on storage.objects (verified against existing bucket patterns in codebase)
- Native `<dialog>` element: MDN documentation, baseline browser support

### Tertiary (LOW confidence)
- `storage.foldername()` function for path-based RLS on storage objects -- needs verification against Supabase docs for exact API

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all patterns exist in codebase from prior phases
- Architecture: HIGH - Upload + moderation pattern is well-established; codebase patterns are clear
- Pitfalls: HIGH - Identified from direct codebase analysis (missing columns, RLS gaps, body size limits)
- Storage RLS path functions: MEDIUM - `storage.foldername()` pattern needs verification

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable -- Supabase Storage API is mature)
