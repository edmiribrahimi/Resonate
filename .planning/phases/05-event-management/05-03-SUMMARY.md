---
phase: 05-event-management
plan: 03
subsystem: public-event-pages
tags: [events, supabase, tabs, capacity, secret-location, slug]
dependency_graph:
  requires: [05-01-event-data-foundation]
  provides: [public-events-browsing, event-detail-page, capacity-display, secret-location-cta]
  affects: [events-page, event-detail-page]
tech_stack:
  added: []
  patterns: [server-component-data-fetching, client-component-tabs, parallel-queries, notFound-404]
key_files:
  created:
    - src/app/(public)/events/EventTabs.tsx
  modified:
    - src/app/(public)/events/page.tsx
    - src/app/(public)/events/[slug]/page.tsx
decisions:
  - "Separate EventTabs client component for tab interactivity while keeping page as server component"
  - "Capacity shown as number on list view, spots left on detail view"
  - "Lock emoji for secret location in list view, detailed CTA in detail view"
metrics:
  duration: 140s
  completed: 2026-02-25T11:55:29Z
---

# Phase 5 Plan 03: Public Event Pages Summary

Replaced mock event data in both public event pages with real Supabase queries. Events list page has Upcoming/Past tab UI with compact cards. Event detail page shows capacity as "X spots left" / "Sold out", secret location with CTA, lineup as styled chips, and medium cover image via Next.js Image.

## What Was Built

### Task 1: Replace events list page with real data and tab UI
**Commit:** 5f059e8

- **Events page** (`src/app/(public)/events/page.tsx`):
  - Removed all mock data, fetches real events from Supabase with `is_published = true` filter
  - Parallel queries for upcoming (date >= today, ascending) and past (date < today, descending) events
  - Select fields: slug, title, date, time, location, location_secret, capacity
  - Graceful try/catch fallback renders empty state if DB unavailable
  - Passes data to EventTabs client component
- **EventTabs client component** (`src/app/(public)/events/EventTabs.tsx`):
  - Tab switcher with "Upcoming" and "Past" tabs, defaults to Upcoming
  - Active tab: `text-accent border-b-2 border-accent`, inactive: `text-muted`
  - Compact event cards: title, formatted date/time, location or "Secret Location" (with lock emoji), capacity
  - Past events: `opacity-70 hover:opacity-100 bg-card/50`
  - Empty states: "No upcoming events -- check back soon." / "No past events yet."
  - Each card links to `/events/{slug}`

### Task 2: Replace event detail page with real data, capacity, and secret location CTA
**Commit:** 78a0fd3

- **Event detail page** (`src/app/(public)/events/[slug]/page.tsx`):
  - Fetches event by slug with `is_published = true` filter using `.single<Event>()`
  - Returns proper 404 via Next.js `notFound()` for missing/unpublished events
  - RSVP count query for capacity calculation: `spotsLeft = capacity - rsvpCount`
  - Capacity display: "X spots left" (muted text) or "Sold out" (red-400 font-medium)
  - Secret location logic: unauthenticated sees "Sign up to become a member", authenticated sees "Buy a ticket to reveal the address"
  - Removed old "You'll receive the address 24h before the event" messaging
  - Lineup: flex-wrap row of styled chips (`bg-accent/20 text-accent rounded-full`)
  - Cover image: Next.js `<Image>` with `max-h-80 rounded-2xl` (medium, not full-bleed hero)
  - Placeholder: smaller contained music note in rounded card when no cover image
  - Preserved auth check, RSVP button, and MobileNav

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx next build` completes with 0 errors
- No `mockEvents` variable remains in either events page
- Events page queries Supabase with `is_published = true` filter
- Events page has tab switching between Upcoming and Past
- Event detail page fetches by slug, shows capacity, shows secret location CTA
- Lineup renders as styled chips in flex-wrap row
- Empty states display appropriate messages
- Key links verified: events page queries `from("events")` with `is_published`, detail page queries `from("events")` by `slug` and `from("rsvps")` for capacity

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Separate EventTabs client component | Tab interactivity requires "use client" but data fetching stays in server component for performance |
| Capacity as number on list, spots left on detail | List view shows raw capacity for quick scanning; detail page shows computed spots left for actionability |
| Lock emoji for secret location | Distinct from pin emoji used for regular locations; communicates exclusivity |
| whitespace-pre-line for description | Preserves line breaks in event descriptions without requiring HTML parsing |

## Self-Check: PASSED

All 3 created/modified files verified on disk. Both task commits (5f059e8, 78a0fd3) verified in git log.
