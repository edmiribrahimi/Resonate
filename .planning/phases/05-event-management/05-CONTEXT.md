# Phase 5: Event Management - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace mock event data with real Supabase-backed events. Organizers create and manage events via CRUD interface. Members browse a live event calendar with upcoming/past tabs. Event detail pages show capacity, lineup, cover image, and secret location logic. Slug-based URLs for event pages.

</domain>

<decisions>
## Implementation Decisions

### Event Creation Form
- Lineup field: tag-style input (type artist name, press enter to add as chip/tag, click to remove)
- Cover image: direct upload to Supabase Storage from the form (no external URL field)
- Event state: draft then publish -- events start as drafts, organizer explicitly publishes when ready. Only published events visible to members.
- Secret location: single location field + toggle. When "secret" is on, event page shows a fixed "Secret Location" placeholder text to non-ticket-holders. No custom teaser text.

### Events Browsing Experience
- Layout: tabs on same page -- tab switcher (Upcoming / Past) on the events page. Only one set visible at a time.
- Card style: compact list -- no cover images in list view. Title, date, location (or "Secret Location"), capacity status in a dense row/card format. Cover image only on detail page.
- Sorting: chronological only -- upcoming sorted nearest-first, past sorted most-recent-first. No filters, no search.
- Empty state: simple text message (e.g. "No upcoming events -- check back soon.") with no additional CTAs or redirects.

### Event Detail Page
- Capacity display: exact count, subtle -- show exact number (e.g. "23 spots left") as secondary detail text, not a headline element. "Sold out" when full.
- Lineup display: styled tags/chips -- each artist name in a pill/chip style, matching the tag-style input from creation. Visual consistency.
- Secret location placeholder: CTA to buy ticket -- "Secret Location -- Buy a ticket to reveal" with a link/button pointing to the ticket section. Drives conversion.
- Cover image: medium size -- displayed but not full-width hero. Sized alongside event info, balanced approach.

### Organizer Editing Workflow
- Event management location: add "Events" page under /organizer/ alongside existing members page. Consistent with current admin layout. Master admin also gets this under /admin/.
- Edit permissions: always editable -- organizers can edit any field at any time, even after publishing. Maximum flexibility.
- Master access: master can edit all -- full CRUD on all events regardless of creator. Safety net for corrections or emergencies.
- Delete policy: delete with confirmation -- deletion allowed for both draft and published events, but published events require explicit confirmation dialog ("This event is published and visible to members. Are you sure?").

### Claude's Discretion
- Form layout and field ordering
- Validation rules (title length limits, description limits, date constraints)
- Slug generation algorithm (from title)
- Supabase Storage bucket configuration and image optimization
- Event card and detail page responsive layout
- Date/time picker component choice
- How "unpublish" (revert to draft) works in the UI, if offered alongside delete
- Exact wording and styling of capacity indicators, empty states, confirmation dialogs

</decisions>

<specifics>
## Specific Ideas

- The existing events page at `src/app/(public)/events/page.tsx` currently uses mock data -- this phase replaces it with real Supabase queries
- The event detail page at `src/app/(public)/events/[slug]/page.tsx` exists with mock data and auth-aware RSVP gating from Phase 1
- Supabase Storage is partially configured (image remote patterns already in next.config.ts)
- The organizer section at `src/app/(organizer)/` already has a members page -- events page follows the same pattern
- Admin section at `src/app/(admin)/admin/` follows the same pattern for master's event management
- RLS policies from Phase 2 need extension for the events table (organizers manage own events, master manages all, approved members read published)
- Secret location reveal depends on ticket ownership, which arrives in Phase 6 -- for now, the CTA links to a placeholder or the ticket section. The reveal logic will be wired in Phase 6.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 05-event-management*
*Context gathered: 2026-02-25*
