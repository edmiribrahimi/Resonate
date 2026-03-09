# Architecture Patterns

**Domain:** Private music events community platform -- v1.3 Refinement & Intelligence
**Researched:** 2026-03-09
**Focus:** Analytics data collection, audit integration, UI elegance, guest list management, nav consolidation

## Recommended Architecture

The existing Next.js 16 App Router + Supabase architecture remains sound. v1.3 features layer on top of the established patterns (Server Actions for mutations, route groups for access control, middleware for role resolution, service client for admin operations). No architectural restructuring is needed -- only targeted extensions.

### High-Level System Changes

```
Browser (PWA)
  |
  v
Next.js Middleware (existing -- no changes needed)
  |
  +-- (public) routes ---- [UNCHANGED]
  +-- (auth) routes ------- [UNCHANGED]
  +-- (members) routes ---- dashboard [MODIFIED: account hub integration]
  +-- (organizer) routes -- [MODIFIED: guest list management]
  +-- (admin) routes ------ [MODIFIED: analytics dashboard, guest list]
  |
  v
Server Actions (existing pattern)
  +-- trackEvent()     [NEW: analytics event recording]
  +-- addToGuestList() [NEW: guest list CRUD]
  +-- processGuest()   [NEW: auto-register, auto-approve, generate ticket]
  |
  v
Supabase
  +-- Database [MODIFIED: 2 new tables]
      +-- analytics_events [NEW]
      +-- guest_list_entries [NEW]
  +-- Auth [UNCHANGED]
  +-- Storage [UNCHANGED]
```

### Component Boundaries

| Component | Responsibility | Status | Communicates With |
|-----------|---------------|--------|-------------------|
| **analytics_events table** | Store all tracked user/system events | NEW | Server Actions, cron jobs |
| **trackEvent() utility** | Server-side event recording function | NEW | analytics_events table |
| **Analytics dashboard page** | Admin view of aggregated analytics | NEW | analytics_events, existing tables (drink_orders, tickets, profiles) |
| **guest_list_entries table** | Per-event guest list with processing status | NEW | Server Actions, profiles, tickets, rsvps |
| **Guest list management UI** | Admin/organizer CRUD for guest list | NEW | guest_list_entries table |
| **processGuestEntry() action** | Auto-register, auto-approve, generate ticket for guest | NEW | profiles, guest_list_entries, tickets |
| **MobileNav** | Bottom tab navigation | MODIFIED | Remove Admin/Organizer tabs |
| **Dashboard page** | Member account hub | MODIFIED | Add admin/organizer sections for elevated roles |
| **AnimatedSection wrapper** | Client component for scroll/mount animations | NEW | framer-motion (motion) |

### Data Flow

#### 1. Analytics Event Tracking (Server-Side)

```
1. User performs action (page view, purchase, RSVP, etc.)
2. Server Action / API route completes primary operation
3. After success, calls trackEvent() utility (fire-and-forget)
4. trackEvent() inserts row into analytics_events via service client
5. No client-side tracking code -- all server-side for privacy & reliability
6. Admin views aggregated data via analytics dashboard (SQL queries on analytics_events + existing tables)
```

**Why server-side only:** No need for client-side analytics SDKs (PostHog, Mixpanel). The community is small (hundreds, not millions). Server-side tracking via existing Server Actions captures all meaningful events without adding JS bundle weight or privacy concerns. The data already flows through Server Actions -- we just log it.

#### 2. Guest List Processing Flow

```
1. Admin/Organizer adds guest to event guest list:
   { email, full_name, event_id, party_id?, tier_id?, notes }
2. Guest entry stored in guest_list_entries with status: 'pending'
3. Admin triggers "Process Guest List" (or runs automatically on event publish)
4. For each pending entry:
   a. Check if profile exists with matching email
      - YES: use existing profile
      - NO: create Supabase Auth user + profile (auto-approved, random password)
   b. Set profile status = 'approved' (if not already)
   c. If tier_id specified: generate free ticket (amount_paid = 0)
      If party access_type = 'free_rsvp': create RSVP
   d. Update guest_list_entries.status = 'processed'
   e. Send welcome/ticket email via Resend
5. Guest receives email with login credentials + ticket link
```

#### 3. Nav Consolidation Flow

```
Current:
  MobileNav tabs: [Events] [Gallery] [Account] [Admin/Organizer]
  Admin/Organizer tab -> popover with Dashboard + Scanner links

Proposed:
  MobileNav tabs: [Events] [Gallery] [Account]
  Account tab -> /dashboard (existing)
  Dashboard page -> adds admin/organizer sections for elevated roles:
    - "Admin Dashboard" link card
    - "Organizer Dashboard" link card
    - "Scanner" link card
    - "Finance" link card (master only)

Result: MobileNav always has exactly 3 tabs. Admin/organizer controls accessed via Account.
```

#### 4. UI Animation Integration

```
Server Component (data fetching)
  |
  v
AnimatedSection (client boundary -- "use client")
  |
  +-- motion.div with initial/animate/whileInView props
  |
  v
Children rendered (can be server or client components)
```

## New Database Schema

### NEW: analytics_events

```sql
create table public.analytics_events (
  id uuid default gen_random_uuid() primary key,
  event_type text not null,           -- 'page_view', 'ticket_purchase', 'drink_purchase',
                                      -- 'rsvp', 'drink_redeem', 'token_expired', 'member_approved',
                                      -- 'media_upload', 'referral_signup', 'guest_processed'
  user_id uuid references auth.users on delete set null,  -- null for anonymous events
  event_id uuid references public.events on delete set null,  -- null for non-event actions
  party_id uuid references public.event_parties on delete set null,
  metadata jsonb default '{}',        -- flexible payload per event type:
                                      -- page_view: { path, referrer }
                                      -- ticket_purchase: { tier_id, amount, tier_name }
                                      -- drink_purchase: { order_id, items, total, is_guest }
                                      -- token_expired: { token_count, refund_amount }
  created_at timestamptz default now()
);

-- Indexes for common query patterns
create index idx_analytics_event_type on analytics_events(event_type);
create index idx_analytics_created_at on analytics_events(created_at);
create index idx_analytics_event_id on analytics_events(event_id);
create index idx_analytics_user_id on analytics_events(user_id);

-- Composite index for time-range queries by type
create index idx_analytics_type_time on analytics_events(event_type, created_at desc);
```

**Schema rationale:** Single table with `event_type` discriminator + `metadata` JSONB column. This avoids creating N tables for N event types while keeping queries simple (`WHERE event_type = 'ticket_purchase'`). JSONB indexes can be added for specific metadata fields if query performance becomes an issue.

**RLS policy:** No client access. Only service client (via Server Actions) inserts. Admin reads via service client in dashboard Server Components. No RLS needed -- table is invisible to anon/authenticated clients.

```sql
-- No RLS policies: table accessed exclusively via service client
-- Alternatively, enable RLS with no policies = deny all client access
alter table public.analytics_events enable row level security;
```

### NEW: guest_list_entries

```sql
create table public.guest_list_entries (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events on delete cascade not null,
  party_id uuid references public.event_parties on delete set null,
  tier_id uuid references public.ticket_tiers on delete set null,
  email text not null,
  full_name text not null,
  notes text,
  status text check (status in ('pending', 'processed', 'failed')) default 'pending',
  profile_id uuid references public.profiles on delete set null,  -- linked after processing
  ticket_id uuid references public.tickets on delete set null,    -- linked after ticket generation
  error_message text,                                              -- reason if failed
  added_by uuid references auth.users on delete set null not null,
  processed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Prevent duplicate guests per event
  unique(event_id, email)
);

create index idx_guest_list_event on guest_list_entries(event_id);
create index idx_guest_list_status on guest_list_entries(status);
```

**RLS policy:** Only master/organizer can read/write, enforced via service client in Server Actions (same pattern as existing admin actions like `approveMember`). Enable RLS with no public policies.

## Patterns to Follow

### Pattern 1: Server-Side Analytics via trackEvent()

**What:** A single utility function that inserts analytics events, called from existing Server Actions after successful operations.

**Why:** Minimal code changes -- add one `trackEvent()` call at the end of each existing Server Action. No client-side code. No new dependencies. Data immediately queryable via SQL.

**When:** After every significant user action (purchase, RSVP, redeem, approve, register).

**Implementation:**

```typescript
// src/lib/analytics.ts
import { getServiceClient } from "@/lib/supabase/service";

interface TrackEventParams {
  eventType: string;
  userId?: string | null;
  eventId?: string | null;
  partyId?: string | null;
  metadata?: Record<string, unknown>;
}

export function trackEvent(params: TrackEventParams): void {
  // Fire-and-forget: don't await, don't block the calling action
  const supabase = getServiceClient();
  supabase
    .from("analytics_events")
    .insert({
      event_type: params.eventType,
      user_id: params.userId ?? null,
      event_id: params.eventId ?? null,
      party_id: params.partyId ?? null,
      metadata: params.metadata ?? {},
    })
    .then(({ error }) => {
      if (error) console.error("Analytics tracking failed:", error);
    });
}
```

**Integration example (existing rsvpToParty action):**

```typescript
// src/app/(public)/events/[slug]/rsvp-actions.ts -- ADD after successful insert
import { trackEvent } from "@/lib/analytics";

// ... existing code ...
// After successful RSVP insert:
trackEvent({
  eventType: "rsvp",
  userId: user.id,
  eventId: eventId,
  partyId: partyId,
});
```

### Pattern 2: Animated Client Wrappers for Server Components

**What:** Thin `"use client"` wrapper components that add animations without affecting data fetching in Server Components.

**Why:** Next.js 16 Server Components can't use framer-motion directly (no DOM access). The existing codebase already uses this pattern (e.g., ScannerPage is a Server Component wrapping ScannerClient). Extend the same pattern for animations.

**When:** Scroll-triggered animations, page mount transitions, staggered list reveals.

**Implementation:**

```typescript
// src/components/ui/AnimatedSection.tsx
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function AnimatedSection({
  children,
  className,
  delay = 0,
}: AnimatedSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

**Usage in Server Components:**

```tsx
// Any page.tsx (Server Component)
import AnimatedSection from "@/components/ui/AnimatedSection";

export default async function EventDetailPage() {
  const event = await fetchEvent(); // server-side data fetch
  return (
    <div>
      <AnimatedSection>
        <h1>{event.title}</h1>
      </AnimatedSection>
      <AnimatedSection delay={0.1}>
        <p>{event.description}</p>
      </AnimatedSection>
    </div>
  );
}
```

**Bundle optimization:** Use `LazyMotion` with `domAnimation` feature set at the root layout level to reduce framer-motion bundle from ~30kb to ~15kb.

```typescript
// src/app/layout.tsx -- wrap children
import { LazyMotion, domAnimation } from "framer-motion";

// In the body:
<LazyMotion features={domAnimation}>
  {children}
</LazyMotion>
```

**Note:** LazyMotion is a client component. It must wrap children in a client boundary. This is acceptable at the layout level since the body already renders client-side SumUp SDK script.

### Pattern 3: Guest List with Atomic Processing

**What:** Guest list entries are processed atomically -- each guest is either fully processed (profile + approval + ticket) or marked as failed with an error message.

**Why:** Partial processing (profile created but ticket generation failed) creates inconsistent state that's hard to debug. Record the error per-entry so admins can see what went wrong and retry.

**When:** Processing guest list entries (individually or in bulk).

**Implementation:**

```typescript
// src/app/(admin)/admin/events/[id]/guest-list/actions.ts
"use server";

import { getServiceClient } from "@/lib/supabase/service";
import { trackEvent } from "@/lib/analytics";
import { createClient } from "@supabase/supabase-js";

export async function processGuestEntry(entryId: string) {
  const supabase = getServiceClient();

  const { data: entry } = await supabase
    .from("guest_list_entries")
    .select("*")
    .eq("id", entryId)
    .single();

  if (!entry || entry.status !== "pending") {
    throw new Error("Entry not found or already processed");
  }

  try {
    // 1. Find or create profile
    let profileId: string;
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, status")
      .eq("email", entry.email)
      .single();

    if (existingProfile) {
      profileId = existingProfile.id;
      // Auto-approve if pending
      if (existingProfile.status !== "approved") {
        await supabase
          .from("profiles")
          .update({ status: "approved" })
          .eq("id", profileId);
      }
    } else {
      // Create auth user + profile via Supabase Admin API
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: entry.email,
        email_confirm: true,
        user_metadata: { full_name: entry.full_name },
      });
      if (authError) throw authError;
      profileId = authUser.user.id;

      // Profile created by handle_new_user trigger, update status
      await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", profileId);
    }

    // 2. Generate ticket if tier specified
    let ticketId: string | null = null;
    if (entry.tier_id) {
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          event_id: entry.event_id,
          party_id: entry.party_id,
          tier_id: entry.tier_id,
          user_id: profileId,
          amount_paid: 0, // free ticket for guest list
        })
        .select("id")
        .single();
      if (ticketError) throw ticketError;
      ticketId = ticket.id;
    }

    // 3. Or create RSVP for free_rsvp parties
    if (!entry.tier_id && entry.party_id) {
      await supabase.from("rsvps").insert({
        event_id: entry.event_id,
        party_id: entry.party_id,
        user_id: profileId,
      });
    }

    // 4. Mark as processed
    await supabase
      .from("guest_list_entries")
      .update({
        status: "processed",
        profile_id: profileId,
        ticket_id: ticketId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", entryId);

    // 5. Track analytics
    trackEvent({
      eventType: "guest_processed",
      eventId: entry.event_id,
      metadata: { email: entry.email, created_new_profile: !existingProfile },
    });

  } catch (err) {
    // Mark as failed with error
    await supabase
      .from("guest_list_entries")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "Unknown error",
      })
      .eq("id", entryId);
    throw err;
  }
}
```

### Pattern 4: Dashboard as Account Hub (Nav Consolidation)

**What:** Transform the dashboard page into a role-aware account hub. Regular members see the current dashboard. Admin/organizer users see additional link cards to admin and organizer dashboards.

**Why:** Eliminates the 4th/5th tab from MobileNav (Admin/Organizer), reducing visual clutter. The Account tab becomes a single entry point for all user-specific functions. This follows the pattern of apps like Twitter/X where settings and admin controls live under the profile/account icon.

**When:** All authenticated users. Conditional rendering based on role.

**Changes to existing components:**

```
MODIFIED: src/components/layout/MobileNav.tsx
  - Remove Admin and Organizer from NAV_ITEMS
  - MobileNav always shows exactly: Events, Gallery, Account
  - Remove STAFF_ICONS popover logic entirely

MODIFIED: src/lib/rbac/roles.ts
  - Remove Admin and Organizer nav items from NAV_ITEMS array
  - Simplify getVisibleNavItems() (no more role-based filtering for nav)

MODIFIED: src/app/(members)/dashboard/page.tsx
  - Add "Staff Tools" section (visible for master/organizer roles)
  - Section contains link cards to:
    /admin/events (master only)
    /organizer/events (organizer only)
    /admin/scanner (master + organizer)
    /admin/finance (master only)
    /admin/members (master only)
```

**Existing pages remain unchanged:** AdminNav and OrganizerNav horizontal tab bars stay as-is within their respective route groups. Only the top-level navigation changes.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Analytics Tracking

**What:** Adding PostHog, Mixpanel, or custom client-side JS for tracking events.

**Why bad:** Adds bundle size (15-50kb), requires cookie consent in EU, can be blocked by ad blockers, creates a second data source disconnected from server truth. For a community of hundreds of users, this is massive over-engineering.

**Instead:** Track events server-side in existing Server Actions. The data flows through the server anyway -- just log it.

### Anti-Pattern 2: Separate Database for Analytics

**What:** Using a separate analytics database (ClickHouse, BigQuery, TimescaleDB).

**Why bad:** The community is small (<1000 active users). PostgreSQL handles analytical queries on thousands of rows without issue. A separate analytics service adds infrastructure complexity, cost, and data sync challenges for zero benefit at this scale.

**Instead:** Single `analytics_events` table in existing Supabase PostgreSQL. Use indexes and materialized views if queries become slow (unlikely at this scale).

### Anti-Pattern 3: Animated Layout Components at Server Boundary

**What:** Wrapping entire page layouts or route groups in animated client components.

**Why bad:** Forces the entire page tree below the animation component to become client-rendered, losing Server Component benefits (zero JS bundle for static content, direct DB access, streaming SSR).

**Instead:** Apply animation wrappers to specific sections, not entire layouts. Keep the animation boundary narrow: `AnimatedSection` wraps a `<div>` with children, not a page.

### Anti-Pattern 4: Guest Auto-Registration via Supabase Edge Functions

**What:** Processing guest list entries via Supabase Edge Functions (Deno runtime) instead of Next.js Server Actions.

**Why bad:** The entire codebase uses Server Actions for mutations. Introducing Edge Functions creates a second execution environment with different debugging, deployment, and error handling patterns. No benefit for this use case.

**Instead:** Process guest lists via Server Actions with `getServiceClient()`, same as all other admin operations (approveMember, updateMemberRole, etc.).

### Anti-Pattern 5: Over-Animating with Framer Motion

**What:** Adding entrance animations to every element, page transitions on route changes, spring physics to buttons.

**Why bad:** Violates the "minimal design" principle. Animations feel sluggish on low-end devices. PWA users expect native-like snappiness, not web app theatrics. Excessive animation wrappers add client-side JavaScript weight.

**Instead:** Limit animations to: (1) scroll-triggered section reveals (subtle opacity + translateY), (2) skeleton loading states, (3) feedback animations on user actions (already exists: `active:scale-95`). No page transitions.

## Integration Points -- Detailed

### Feature 1: Analytics Data Collection

**New components:**

| Component | Type | Location |
|-----------|------|----------|
| `analytics_events` table | Database | Supabase migration |
| `trackEvent()` | Utility function | `src/lib/analytics.ts` |
| Analytics dashboard page | Server Component | `src/app/(admin)/admin/analytics/page.tsx` |
| AnalyticsCharts | Client Component | `src/components/admin/AnalyticsCharts.tsx` |

**Modified components:**

| Component | Change |
|-----------|--------|
| `rsvpToParty()` | Add `trackEvent("rsvp", ...)` call |
| `purchaseDrinksGuest()` | Add `trackEvent("drink_purchase", ...)` call |
| `redeemDrinkTokenGuest()` | Add `trackEvent("drink_redeem", ...)` call |
| SumUp webhook handler | Add `trackEvent("ticket_purchase", ...)` call |
| `approveMember()` | Add `trackEvent("member_approved", ...)` call |
| Registration auth callback | Add `trackEvent("member_signup", ...)` call |
| Refund cron job | Add `trackEvent("token_expired", ...)` call |

**Analytics data sources (for dashboard):** The dashboard does NOT rely solely on `analytics_events`. It queries existing tables for definitive counts:

| Metric | Data Source | Query |
|--------|-------------|-------|
| Total revenue (tickets) | `tickets` | `SUM(amount_paid)` |
| Total revenue (drinks) | `drink_orders` WHERE status = 'completed' | `SUM(total_amount)` |
| Expired token refunds | `drink_tokens` WHERE status = 'refunded' | COUNT + `SUM(price)` |
| Member growth | `profiles` | COUNT grouped by `created_at` month |
| Event attendance | `attendance` | COUNT per event |
| RSVP rate | `rsvps` vs `event_parties.capacity` | COUNT ratio |
| Referral effectiveness | `profiles` WHERE `referred_by IS NOT NULL` | COUNT |
| Popular drinks | `drink_orders.items` (JSONB) | JSONB aggregate |

The `analytics_events` table supplements with behavioral data (page views, funnel steps) that existing tables don't capture.

### Feature 2: Audit Findings Integration

No new database tables or major architectural changes. Audit findings translate to targeted modifications across the codebase.

**Organization approach:** Group audit findings by domain and implement within existing component/action files:

| Domain | Example Fixes | Location |
|--------|--------------|----------|
| UX | Improve empty states, loading skeletons | Existing page components |
| Performance | Optimize N+1 queries in event detail page | `src/app/(public)/events/[slug]/page.tsx` |
| Security | Add rate limiting to Server Actions, CSRF hardening | Middleware, server actions |
| Accessibility | Add aria labels, focus management, color contrast | All UI components |
| SEO | Add structured data, OpenGraph per event | Event pages metadata |
| Code quality | Reduce `any` types, add error boundaries | Throughout |

### Feature 3: UI Elegance

**New components:**

| Component | Type | Location |
|-----------|------|----------|
| `AnimatedSection` | Client Component | `src/components/ui/AnimatedSection.tsx` |
| `StaggeredList` | Client Component | `src/components/ui/StaggeredList.tsx` |
| `SkeletonCard` | Server Component (CSS only) | `src/components/ui/SkeletonCard.tsx` |

**Modified components:** Various page components to wrap sections in `AnimatedSection`. No structural changes -- just wrapping existing JSX.

**New dependency:** `framer-motion` (or `motion` -- the package was renamed). Install via `npm install motion`.

### Feature 4: Guest List Management

**New components:**

| Component | Type | Location |
|-----------|------|----------|
| `guest_list_entries` table | Database | Supabase migration |
| Guest list page | Server Component | `src/app/(admin)/admin/events/[id]/guest-list/page.tsx` |
| `GuestListClient` | Client Component | `src/app/(admin)/admin/events/[id]/guest-list/GuestListClient.tsx` |
| Guest list actions | Server Actions | `src/app/(admin)/admin/events/[id]/guest-list/actions.ts` |
| `GuestListEntry` type | Type definition | `src/types/database.ts` |

**Modified components:**

| Component | Change |
|-----------|--------|
| `AdminNav` | Add "Guest List" tab (conditionally, when viewing event detail) |
| `OrganizerNav` | Same -- add "Guest List" tab in event context |
| `database.ts` types | Add `GuestListEntry` interface |

**Integration with existing systems:**

- Uses `supabase.auth.admin.createUser()` for new guest profiles (same admin API used by Supabase internally)
- Uses existing `handle_new_user` trigger for profile creation
- Generates tickets using same `tickets` table (with `amount_paid: 0` for guest list entries)
- Creates RSVPs using same `rsvps` table
- Sends emails via existing `sendEmail()` + React Email templates

### Feature 5: Nav Consolidation

**Modified components:**

| Component | Change |
|-----------|--------|
| `MobileNav.tsx` | Remove Admin/Organizer items, remove popover logic |
| `roles.ts` | Remove Admin/Organizer NavItems, simplify `getVisibleNavItems()` |
| Dashboard `page.tsx` | Add "Staff Tools" section with role-conditional link cards |

**New components:** None -- this is purely a restructuring of existing components.

**Route structure unchanged:** All `/admin/*` and `/organizer/*` routes stay exactly where they are. Only the navigation entry point changes (from MobileNav tab to Dashboard link cards).

## Build Order (Dependency Graph)

```
Phase 1: Analytics Infrastructure + Nav Consolidation
  |
  +-- analytics_events table + trackEvent() utility
  +-- Nav consolidation (MobileNav simplification + Dashboard hub)
  |   (These two are independent and can be parallel tasks)
  |
  v
Phase 2: Analytics Integration + UI Elegance
  |
  +-- Add trackEvent() calls to all existing Server Actions
  +-- Install framer-motion, create AnimatedSection + StaggeredList
  +-- Apply animations to key pages (events list, event detail, dashboard)
  |
  v
Phase 3: Full App Audit
  |
  +-- UX audit + fixes
  +-- Performance audit + fixes (benefits from analytics being active)
  +-- Security audit + fixes
  +-- Accessibility audit + fixes
  +-- SEO audit + fixes
  |
  v
Phase 4: Guest List Management
  |
  +-- guest_list_entries table + types
  +-- Guest list CRUD UI (admin/organizer event detail)
  +-- Guest processing logic (auto-register, auto-approve, ticket generation)
  +-- Email notifications for processed guests
  |
  v
Phase 5: Analytics Dashboard + Polish
  |
  +-- Analytics dashboard page with charts (needs data from Phase 2+)
  +-- Final polish pass across all new features
```

**Phase ordering rationale:**

1. **Analytics infra first** because every subsequent phase benefits from tracking. Nav consolidation pairs here because it's a quick, self-contained refactor that unblocks the dashboard improvements needed in later phases.

2. **Analytics integration + UI elegance together** because both involve modifying existing components. Touching the same files in the same phase reduces merge conflicts and redundant work. UI refinements also benefit from understanding current UX patterns (informed by audit thinking).

3. **Full app audit in Phase 3** because the audit should evaluate the new analytics and UI work alongside existing code. Doing the audit after UI changes prevents double-work (fixing something that's about to be redesigned).

4. **Guest list in Phase 4** because it's the most complex new feature (new table, auth user creation, ticket generation pipeline) and is completely independent of Phases 1-3. It also benefits from analytics being live (track guest processing events).

5. **Analytics dashboard last** because it needs real data to be useful. By Phase 5, several weeks of analytics events will have accumulated from Phase 2's tracking integration, making the dashboard immediately valuable rather than showing empty charts.

## Scalability Considerations

| Concern | Current (100s users) | At 1K users | At 10K users |
|---------|---------------------|-------------|-------------|
| analytics_events inserts | Negligible | Add batch inserts (queue + flush) | Consider partitioning by month |
| analytics_events queries | Direct SQL | Add materialized views for aggregates | Add materialized views with cron refresh |
| Guest list processing | Sequential, fine | Sequential, fine | Batch with Promise.allSettled |
| Framer-motion bundle | 15kb with LazyMotion | Same | Same (client-side, no scale concern) |
| Dashboard hub rendering | Single DB query for role | Same | Same |

**Key insight:** This community platform is invitation-gated. Growth is inherently limited by referral velocity. The architecture optimizes for the 100-1000 member range. If growth exceeds expectations, `analytics_events` is the only table that might need partitioning -- and PostgreSQL handles millions of rows well with proper indexes.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Analytics via PostgreSQL table | HIGH | Standard pattern, well-suited for this scale. No external service needed. |
| Server-side trackEvent() pattern | HIGH | Follows existing fire-and-forget pattern (same as email sending in codebase). |
| Framer-motion + Server Components | HIGH | Verified: Motion 12.x works with Next.js 16.x, client wrapper pattern well-documented. |
| Guest list auto-registration | MEDIUM | `supabase.auth.admin.createUser()` is well-documented. Password reset flow for new users needs verification -- guests may need a "Set your password" link in the welcome email. |
| Nav consolidation approach | HIGH | Simple component refactor. Follows common PWA pattern (3 bottom tabs max). |
| Analytics dashboard queries | MEDIUM | SQL aggregations on JSONB metadata and cross-table joins. Performance depends on data volume -- may need materialized views if queries slow down. |
| Audit integration | HIGH | No architectural risk -- it's targeted improvements to existing components. |

## Sources

- Existing codebase analysis: all source files in `src/` examined directly
- [Supabase Logs & Analytics](https://supabase.com/features/logs-analytics) -- Supabase's own analytics architecture (Postgres not optimized for high-volume analytics inserts, but fine for our scale)
- [Can I use Supabase for analytics?](https://www.tinybird.co/blog/can-i-use-supabase-for-user-facing-analytics) -- Analysis of Supabase analytics suitability
- [How to use Framer Motion with Next.js Server Components](https://www.hemantasundaray.com/blog/use-framer-motion-with-nextjs-server-components) -- Client wrapper pattern for animations
- [Framer Motion: Complete React & Next.js Guide 2026](https://inhaq.com/blog/framer-motion-complete-guide-react-nextjs-developers.html) -- Confirmed Motion 12.x + Next.js 16.x compatibility
- [Bottom Tab Bar Navigation Design Best Practices](https://uxdworld.com/bottom-tab-bar-navigation-design-best-practices/) -- 3-5 tabs maximum recommendation
- [Designing Reliable Analytics for Event](https://database.tools/2025/11/09/designing-reliable-analytics-for-event/) -- Event analytics schema patterns
- [Hatchet: Use Postgres for your events table](https://hatchet.run/blog/postgres-events-table) -- PostgreSQL event table design patterns

---

*Architecture research: 2026-03-09 -- v1.3 Refinement & Intelligence*
