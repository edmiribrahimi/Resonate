# Phase 5: Event Management - Research

**Researched:** 2026-02-25
**Domain:** Event CRUD, Supabase Storage image upload, slug generation, RLS policies, Next.js server actions
**Confidence:** HIGH

## Summary

Phase 5 replaces mock event data with real Supabase-backed event management. The existing codebase already has an `events` table with the correct columns for most fields (title, description, date, time, location, location_secret, lineup, cover_image, capacity, is_published, slug), but is missing a `created_by` column needed to track event ownership for the "organizer edits own events" requirement. The existing RLS policy `events_all_admin` allows all organizers to manage ALL events -- this needs refinement so organizers can only manage their own events while master manages all.

The main technical areas are: (1) database migration to add `created_by` and update RLS, (2) Supabase Storage bucket setup and image upload from client, (3) server actions for event CRUD with service-role client for bypass where needed, (4) replacing the mock data in two existing pages, and (5) creating the organizer/admin event management UI. The project already uses the pattern of server actions with `revalidatePath`, service-role clients for RLS bypass, and middleware-injected headers for role/status checks -- all of which should be followed consistently.

**Primary recommendation:** Add `created_by` column to events table, create a public Supabase Storage bucket for cover images, build event CRUD via server actions following the existing actions.ts pattern, and replace mock data in the two existing event pages with real Supabase queries.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Event Creation Form**: Lineup field uses tag-style input (type artist name, press enter to add as chip/tag, click to remove). Cover image uses direct upload to Supabase Storage from the form (no external URL field). Events start as drafts, organizer explicitly publishes when ready. Only published events visible to members. Secret location uses single location field + toggle; when "secret" is on, event page shows fixed "Secret Location" placeholder text to non-ticket-holders. No custom teaser text.
- **Events Browsing Experience**: Tabs on same page (Upcoming / Past) with tab switcher. Compact list card style -- no cover images in list view. Title, date, location (or "Secret Location"), capacity status in a dense row/card format. Cover image only on detail page. Chronological sorting only -- upcoming sorted nearest-first, past sorted most-recent-first. No filters, no search. Simple text empty state (e.g. "No upcoming events -- check back soon.").
- **Event Detail Page**: Capacity display shows exact count as secondary detail text ("23 spots left"), not a headline element. "Sold out" when full. Lineup displayed as styled tags/chips matching the tag-style input. Secret location placeholder shows CTA: "Secret Location -- Buy a ticket to reveal" linking to ticket section (drives conversion). Cover image medium size -- displayed but not full-width hero.
- **Organizer Editing Workflow**: Add "Events" page under /organizer/ alongside existing members page. Master admin also gets this under /admin/. Edit permissions: always editable, any field at any time even after publishing. Master can edit all events regardless of creator. Delete allowed for both draft and published events; published events require explicit confirmation dialog.

### Claude's Discretion
- Form layout and field ordering
- Validation rules (title length limits, description limits, date constraints)
- Slug generation algorithm (from title)
- Supabase Storage bucket configuration and image optimization
- Event card and detail page responsive layout
- Date/time picker component choice
- How "unpublish" (revert to draft) works in the UI, if offered alongside delete
- Exact wording and styling of capacity indicators, empty states, confirmation dialogs

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EVNT-01 | Organizer can create events with: title, description, date, time, location, secret location toggle, lineup, cover image, capacity | Database schema already has all columns except `created_by`. Supabase Storage for cover image upload. Server action for insert. |
| EVNT-02 | Organizer can edit their own events | Requires `created_by` column + refined RLS. Server action for update. Master edits all via service-role client or RLS policy. |
| EVNT-03 | Events page displays real data from Supabase (replacing current mock data) | Existing events page at `src/app/(public)/events/page.tsx` uses mock data -- replace with Supabase query. |
| EVNT-04 | Events page shows upcoming events and past events archive | Tab-based UI with date comparison. Upcoming: `date >= today` sorted ascending. Past: `date < today` sorted descending. |
| EVNT-05 | Event detail page shows remaining capacity ("X spots left") or "Sold out" status | Requires counting RSVPs or tickets against capacity. Current schema has RSVPs table with event_id. Phase 6 adds tickets. For now, use RSVP count. |
| EVNT-06 | Secret location is hidden until member has purchased a ticket for the event | Per CONTEXT.md specifics: ticket ownership check arrives in Phase 6. For now, show CTA "Secret Location -- Buy a ticket to reveal" to all members. Wire actual reveal in Phase 6. |
| EVNT-07 | Events generate URL-friendly slugs automatically from title | Vanilla JS slugify function (no npm dependency needed). Generate on server action, ensure uniqueness with suffix. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.97.0 | Database queries, Storage uploads | Already installed, used throughout project |
| @supabase/ssr | ^0.8.0 | Server-side Supabase client | Already installed, used for server components and actions |
| Next.js | 16.1.6 | App router, server actions, server components | Already installed, project framework |
| Tailwind CSS | v4 | Styling | Already installed, used site-wide |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/image | (bundled) | Optimized image rendering for cover images | Event detail page cover image display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla slugify function | `slugify` npm package | Only ~10 lines of code needed; no npm dependency justified for this simple case |
| Native date/time input | react-datepicker or similar | Native `<input type="date">` and `<input type="time">` work fine for this use case; no library needed with Orbitron font |
| Client-side direct upload | Server action upload | Client-side upload to Supabase Storage is simpler (avoids Next.js 1MB body size limit on server actions) and is the recommended pattern |

**Installation:**
No new npm packages needed. Everything is already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (organizer)/
      organizer/
        events/
          page.tsx          # Organizer event list + create button
          new/
            page.tsx        # Event creation form
          [id]/
            edit/
              page.tsx      # Event edit form
          actions.ts        # Server actions: createEvent, updateEvent, deleteEvent, publishEvent
    (admin)/
      admin/
        events/
          page.tsx          # Master event list (all events)
    (public)/
      events/
        page.tsx            # Public events browsing (replace mock data)
        [slug]/
          page.tsx          # Public event detail (replace mock data)
  components/
    events/
      EventForm.tsx         # Shared form component for create/edit
      EventCard.tsx         # Compact list card for events list
      TagInput.tsx          # Reusable tag/chip input for lineup
  types/
    database.ts             # Update Event interface with created_by
supabase/
  migrations/
    20260225_phase5_events.sql  # Add created_by, update RLS, create storage bucket
```

### Pattern 1: Server Actions for Event CRUD
**What:** All event mutations (create, update, delete, publish/unpublish) go through server actions in a single `actions.ts` file, following the established pattern from `src/app/(admin)/admin/members/actions.ts`.
**When to use:** Every event mutation.
**Example:**
```typescript
// src/app/(organizer)/organizer/events/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-")      // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "")          // Trim leading/trailing hyphens
    .substring(0, 80);                 // Limit length
}

async function verifyOrganizer(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "organizer" && profile.role !== "master")) {
    throw new Error("Forbidden: only organizers can manage events");
  }

  return { user, isMaster: profile.role === "master" };
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const { user } = await verifyOrganizer(supabase);

  const title = formData.get("title") as string;
  let slug = slugify(title);

  // Ensure slug uniqueness by appending random suffix if needed
  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const { error } = await supabase
    .from("events")
    .insert({
      title,
      slug,
      description: formData.get("description") as string,
      date: formData.get("date") as string,
      time: formData.get("time") as string,
      location: formData.get("location") as string || null,
      location_secret: formData.get("location_secret") === "true",
      lineup: JSON.parse(formData.get("lineup") as string || "[]"),
      cover_image: formData.get("cover_image") as string || null,
      capacity: Number(formData.get("capacity")) || null,
      is_published: false,
      created_by: user.id,
    });

  if (error) throw new Error(`Failed to create event: ${error.message}`);

  revalidatePath("/organizer/events");
  revalidatePath("/events");
  return { success: true, slug };
}
```

### Pattern 2: Client-Side Image Upload to Supabase Storage
**What:** Upload cover image directly from the browser client to a public Supabase Storage bucket, then pass the public URL to the server action as a string field.
**When to use:** Event creation and editing with cover image.
**Example:**
```typescript
// In client component (EventForm.tsx)
import { createClient } from "@/lib/supabase/client";

async function uploadCoverImage(file: File, eventSlug: string): Promise<string> {
  const supabase = createClient();
  const fileExt = file.name.split(".").pop();
  const fileName = `${eventSlug}-${Date.now()}.${fileExt}`;
  const filePath = `covers/${fileName}`;

  const { error } = await supabase.storage
    .from("event-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from("event-images")
    .getPublicUrl(filePath);

  return publicUrl;
}
```

### Pattern 3: Shared Event Form Component
**What:** A single `EventForm` component used for both create and edit, accepting optional initial values.
**When to use:** `/organizer/events/new` and `/organizer/events/[id]/edit` pages.
**Example:**
```typescript
// src/components/events/EventForm.tsx
"use client";

interface EventFormProps {
  initialData?: {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string | null;
    location_secret: boolean;
    lineup: string[];
    cover_image: string | null;
    capacity: number | null;
    is_published: boolean;
  };
  onSubmit: (formData: FormData) => Promise<void>;
  submitLabel: string;
}
```

### Pattern 4: Tab-Based Events Browsing (Client Component)
**What:** Events page uses a client component for tab switching between Upcoming and Past, with data fetched server-side and passed as props.
**When to use:** Public events page.
**Example:**
```typescript
// Server component fetches data, client component handles tabs
// Server: page.tsx
const supabase = await createClient();
const today = new Date().toISOString().split("T")[0];

const { data: upcoming } = await supabase
  .from("events")
  .select("*")
  .eq("is_published", true)
  .gte("date", today)
  .order("date", { ascending: true });

const { data: past } = await supabase
  .from("events")
  .select("*")
  .eq("is_published", true)
  .lt("date", today)
  .order("date", { ascending: false });
```

### Anti-Patterns to Avoid
- **Uploading images via server actions:** Next.js server actions have a 1MB default body size limit. Upload directly from the browser client to Supabase Storage instead.
- **Using RLS bypass for reads on public pages:** The anon key + existing RLS policies are sufficient for reading published events. Only use service-role client for admin operations where RLS blocks legitimate access.
- **Storing lineup as JSON string:** The schema already uses `text[]` (PostgreSQL array). Keep using `text[]` and parse/stringify only at the form boundary.
- **Creating separate CRUD files for admin vs organizer:** Use a single `actions.ts` file with role checks inside each action. Import from the same location for both admin and organizer pages.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image upload | Custom file streaming through server action | Supabase Storage client-side upload | Next.js body size limits, CDN caching, simpler code |
| Image optimization/resizing | Manual sharp/jimp processing | Supabase Image Transformations or Next.js `<Image>` component | Automatic WebP conversion, CDN-cached, no server processing |
| Slug uniqueness | Complex distributed locking | Simple check + timestamp suffix fallback | Events are low-volume; collision chance is near zero; suffix handles edge case |
| Date/time picker | Custom calendar widget | Native HTML `<input type="date">` and `<input type="time">` | Good mobile support, no library weight, consistent with Orbitron font styling |
| File type validation | Server-side MIME checking | Client-side `accept` attribute + file type check before upload | Quick feedback, Supabase Storage also validates |

**Key insight:** The codebase already has all infrastructure (Supabase client, service-role pattern, server actions pattern, middleware role injection). This phase is primarily about applying established patterns to a new domain, not introducing new architectural concepts.

## Common Pitfalls

### Pitfall 1: Missing `created_by` Column
**What goes wrong:** The existing events table has no `created_by` column. Without it, there is no way to enforce "organizers edit only their own events."
**Why it happens:** The original schema was designed with a simpler `is_admin` model where all admins managed all events.
**How to avoid:** Add `created_by uuid references auth.users not null` column in the Phase 5 migration. Update the `Event` TypeScript interface accordingly.
**Warning signs:** RLS policies that use `is_admin_or_organizer()` for ALL operations will let any organizer edit any event.

### Pitfall 2: Current RLS Policy Too Permissive for Organizers
**What goes wrong:** The existing `events_all_admin` policy uses `is_admin_or_organizer()` for ALL operations, meaning any organizer can edit/delete any other organizer's events.
**Why it happens:** The initial schema was a scaffold without the full RBAC granularity.
**How to avoid:** Replace `events_all_admin` with separate policies:
  - SELECT for admin/organizer (keep -- they need to see events to manage them)
  - INSERT for admin/organizer (keep -- both can create)
  - UPDATE: organizer can update WHERE `created_by = auth.uid()`, master can update any
  - DELETE: organizer can delete WHERE `created_by = auth.uid()`, master can delete any
**Warning signs:** Test with two organizer accounts to verify isolation.

### Pitfall 3: Next.js Server Action Body Size Limit
**What goes wrong:** Attempting to upload a cover image through a server action FormData will fail for images larger than 1MB.
**Why it happens:** Next.js defaults to 1MB body size for server actions.
**How to avoid:** Upload images directly from the browser client to Supabase Storage using the anon key client. Pass only the resulting public URL string to the server action.
**Warning signs:** Large image uploads silently fail or throw "413 Payload Too Large."

### Pitfall 4: Slug Collision Without Uniqueness Check
**What goes wrong:** Two events with the same title produce identical slugs, causing a unique constraint violation on insert.
**Why it happens:** Slugify is deterministic -- same input always produces same output.
**How to avoid:** After generating the slug, check if it already exists. If so, append a short suffix (timestamp in base36 or a counter).
**Warning signs:** Database insert error on duplicate slug.

### Pitfall 5: Capacity Calculation Race Condition
**What goes wrong:** Two users checking capacity simultaneously could both see "1 spot left" and both succeed, exceeding capacity.
**Why it happens:** Reading count and writing RSVP are separate operations without a transaction lock.
**How to avoid:** For Phase 5, capacity display is informational (the actual enforcement comes in Phase 6 with ticket purchasing and database constraints). Display the count but don't enforce it at the RSVP level yet. Document this as a Phase 6 concern.
**Warning signs:** Capacity shows negative numbers or more RSVPs than capacity.

### Pitfall 6: Forgetting to Update TypeScript Event Interface
**What goes wrong:** Adding `created_by` to the database but forgetting to update `src/types/database.ts` causes TypeScript errors or missing data.
**Why it happens:** Schema changes span SQL migration + TypeScript types + queries.
**How to avoid:** Always update `database.ts` in the same task as the migration. Add `created_by: string` to the Event interface.
**Warning signs:** TypeScript compile errors, `created_by` being `undefined` in queries.

### Pitfall 7: Storage Bucket Not Created
**What goes wrong:** Uploads fail because the `event-images` bucket doesn't exist.
**Why it happens:** Supabase Storage buckets must be created explicitly -- they are not auto-created.
**How to avoid:** Create the bucket in the migration SQL or provide Supabase Dashboard instructions. The bucket must be set to PUBLIC for `getPublicUrl` to work.
**Warning signs:** "Bucket not found" error on upload.

## Code Examples

### Database Migration (Phase 5)
```sql
-- Phase 5: Event Management Schema Updates
BEGIN;

-- Step 1: Add created_by column to events table
ALTER TABLE public.events
  ADD COLUMN created_by uuid REFERENCES auth.users ON DELETE SET NULL;

-- Step 2: Drop the overly-permissive existing policy
DROP POLICY IF EXISTS events_all_admin ON public.events;

-- Step 3: Create granular RLS policies for event management

-- Organizers and master can view all events (including unpublished, for management)
CREATE POLICY events_select_admin ON public.events
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

-- Organizers and master can create events
CREATE POLICY events_insert_admin ON public.events
  FOR INSERT WITH CHECK ((SELECT public.is_admin_or_organizer()));

-- Organizers can update their own events; master can update any
CREATE POLICY events_update_own ON public.events
  FOR UPDATE USING (
    auth.uid() = created_by
    OR (SELECT public.is_master())
  );

-- Organizers can delete their own events; master can delete any
CREATE POLICY events_delete_own ON public.events
  FOR DELETE USING (
    auth.uid() = created_by
    OR (SELECT public.is_master())
  );

-- Step 4: Create storage bucket for event cover images
-- NOTE: This must be done via Supabase Dashboard or supabase CLI:
-- 1. Create bucket named "event-images" with public access
-- 2. Add RLS policy on storage.objects for authenticated upload:
--
-- CREATE POLICY "Organizers can upload event images"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'event-images'
--   AND (SELECT public.is_admin_or_organizer())
-- );
--
-- CREATE POLICY "Anyone can view event images"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'event-images');
--
-- CREATE POLICY "Organizers can delete own event images"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'event-images'
--   AND (SELECT public.is_admin_or_organizer())
-- );

COMMIT;
```

### Slug Generation Function
```typescript
// Vanilla slugify -- no npm package needed
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // Remove diacritics (accents)
    .replace(/[^a-z0-9\s-]/g, "")      // Remove non-alphanumeric except spaces and hyphens
    .replace(/[\s-]+/g, "-")           // Replace spaces and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, "")           // Trim leading/trailing hyphens
    .substring(0, 80);                  // Limit length
}
```

### Tag Input Component Pattern
```typescript
// src/components/events/TagInput.tsx
"use client";

import { useState, type KeyboardEvent } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div className="rounded-xl border border-card-border bg-card p-3">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-sm text-accent"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="text-accent/60 hover:text-accent"
            >
              x
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? (placeholder || "Type and press Enter") : "Add another..."}
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
```

### Public Events Query Pattern
```typescript
// Server component query for public events page
const supabase = await createClient();
const today = new Date().toISOString().split("T")[0];

const [{ data: upcoming }, { data: past }] = await Promise.all([
  supabase
    .from("events")
    .select("slug, title, date, time, location, location_secret, capacity")
    .eq("is_published", true)
    .gte("date", today)
    .order("date", { ascending: true }),
  supabase
    .from("events")
    .select("slug, title, date, time, location, location_secret, capacity")
    .eq("is_published", true)
    .lt("date", today)
    .order("date", { ascending: false }),
]);
```

### Capacity Calculation Pattern
```typescript
// On the event detail page, count RSVPs to compute remaining capacity
const { count: rsvpCount } = await supabase
  .from("rsvps")
  .select("*", { count: "exact", head: true })
  .eq("event_id", event.id);

const spotsLeft = event.capacity ? event.capacity - (rsvpCount || 0) : null;
// Display: spotsLeft === 0 ? "Sold out" : `${spotsLeft} spots left`
// spotsLeft === null means no capacity limit
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server action file upload | Client-side direct upload to Storage | Always preferred | Avoids Next.js 1MB body limit, simpler code |
| Custom image processing | Supabase Image Transformations | 2024 | Automatic WebP, CDN-cached resize (Pro plan) |
| `is_admin` boolean for access | Role-based `created_by` ownership | Phase 2 migration | Granular per-organizer event ownership |
| Mock event data in pages | Real Supabase queries | This phase | Live data, real CRUD |

**Deprecated/outdated:**
- Mock data in events pages: Being replaced this phase
- `events_all_admin` RLS policy: Needs replacement with granular ownership-based policies

## Open Questions

1. **Capacity source: RSVPs or Tickets?**
   - What we know: The events table has a `capacity` column. RSVPs exist now, tickets arrive in Phase 6.
   - What's unclear: Should capacity count RSVPs (Phase 5) or ticket purchases (Phase 6)?
   - Recommendation: For Phase 5, count RSVPs against capacity for the "spots left" display. Phase 6 will refine this to count ticket purchases instead. The display logic stays the same; only the source table changes.

2. **Storage bucket creation method**
   - What we know: Supabase Storage buckets can be created via Dashboard, SQL, or CLI. RLS on `storage.objects` controls access.
   - What's unclear: Whether SQL `INSERT INTO storage.buckets` works in all Supabase environments or requires Dashboard.
   - Recommendation: Include bucket creation SQL in the migration for documentation, but note in task instructions that it may need to be created via Dashboard. The RLS policies on `storage.objects` can be created via SQL.

3. **Secret location reveal timing**
   - What we know: EVNT-06 says "hidden until member has purchased a ticket." Tickets arrive in Phase 6.
   - What's unclear: Nothing -- CONTEXT.md explicitly states: "The reveal logic will be wired in Phase 6."
   - Recommendation: For Phase 5, show CTA "Secret Location -- Buy a ticket to reveal" to all authenticated members. No actual reveal logic yet.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/schema.sql` -- complete database schema with all tables and RLS policies
- Existing codebase: `src/types/database.ts` -- TypeScript interfaces for all entities
- Existing codebase: `src/app/(admin)/admin/members/actions.ts` -- established server action patterns
- Existing codebase: `src/app/(public)/events/page.tsx` and `[slug]/page.tsx` -- current mock data pages to replace
- Existing codebase: `src/lib/supabase/middleware.ts` -- middleware role injection pattern
- Supabase Storage docs: upload API, getPublicUrl, access control, image transformations
- Supabase RLS docs: policy patterns for ownership-based access control

### Secondary (MEDIUM confidence)
- Supabase Storage standard uploads documentation -- 6MB limit for standard upload, TUS for larger files
- Supabase Image Transformations -- Pro plan required for server-side transforms; Next.js Image component works on all plans

### Tertiary (LOW confidence)
- None -- all findings verified against official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all patterns established in prior phases
- Architecture: HIGH -- follows existing project patterns exactly (server actions, middleware headers, RLS)
- Pitfalls: HIGH -- identified from direct codebase analysis (missing column, permissive RLS) and official docs (body size limits)
- Database migration: HIGH -- verified existing schema, identified exact gaps

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable -- no fast-moving dependencies)
