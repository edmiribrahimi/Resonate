# Architecture Patterns

**Domain:** Private music events community platform
**Researched:** 2026-02-24
**Focus:** SumUp payments, referral tracking, role-based access, media uploads, approval flows

## Recommended Architecture

The existing Next.js 16 App Router + Supabase architecture is sound and should be extended, not restructured. The six new feature domains (payments, referrals, roles, media, approvals, event CRUD) integrate as new layers atop the existing route groups, middleware, and RLS policies.

### High-Level System Diagram

```
Browser (PWA)
  |
  v
Next.js Middleware (auth + role resolution)
  |
  +-- (public) routes ---- read-only, no auth required
  +-- (auth) routes ------- login, register (with referral code capture)
  +-- (members) routes ---- dashboard, tickets, referrals, media upload
  +-- (organizer) routes -- event CRUD, ticket sales view
  +-- (admin) routes ------ approval queue, member management, all events
  |
  v
API Routes (/api/...)
  +-- /api/webhooks/sumup --- SumUp payment callbacks (no auth, signature verification)
  +-- /api/checkout --------- create SumUp checkout (authenticated)
  +-- /api/media/upload ----- presigned URL generation (authenticated)
  +-- /api/auth/callback ---- existing auth callback
  +-- /api/membership/verify  existing QR verification
  |
  v
Supabase
  +-- Auth (users, sessions, JWT with role in app_metadata)
  +-- Database (profiles, events, ticket_tiers, orders, referrals, event_media, approval_queue)
  +-- Storage (event-media bucket with RLS)
  +-- Edge Functions (optional: SumUp webhook if Vercel cold starts are problematic)
```

### Component Boundaries

| Component | Responsibility | Communicates With | Auth Required |
|-----------|---------------|-------------------|---------------|
| **Middleware (role-aware)** | Session refresh + role resolution from profile; route gating by role | Supabase Auth, profile cache | N/A (runs on every request) |
| **Registration flow** | Capture referral code from URL, pass to signup, set initial approval status | Supabase Auth, profiles table, referrals table | No (public) |
| **Approval queue UI** | List pending members, approve/reject actions | profiles table (status field) | Admin or Organizer |
| **Event CRUD** | Create, edit, publish events with ticket tiers | events table, ticket_tiers table, Supabase Storage (cover images) | Organizer or Admin |
| **Checkout flow** | Select ticket tier, create SumUp checkout, redirect to payment | API route -> SumUp API, orders table | Approved Member |
| **SumUp webhook handler** | Receive payment confirmation, update order status, create ticket record | orders table, tickets table (no auth -- uses signature verification) |
| **Referral system** | Generate unique referral link, track who invited whom | profiles table (referral_code), referrals table | Member (to view/share link) |
| **Media upload pipeline** | Upload photos/videos to Supabase Storage, create event_media record | Supabase Storage, event_media table, attendances table (verify attendance) | Approved Member |
| **Ticket display** | Show purchased tickets with QR code for event entry | orders table, tickets table | Member |

### Data Flow

#### 1. Registration with Referral

```
1. Visitor clicks referral link: /register?ref=ABC123
2. Registration page captures `ref` query param, stores in form state
3. On signup, `ref` code sent as user_metadata: { referral_code: "ABC123" }
4. Supabase trigger `handle_new_user()` (modified):
   a. Creates profile row
   b. If referral_code present and valid:
      - Sets profile.status = 'approved'
      - Inserts row in referrals table (referrer_id, referred_id)
   c. If no referral_code:
      - Sets profile.status = 'pending'
5. Pending members can browse events but middleware/RLS blocks RSVP, ticket purchase, media upload
```

#### 2. Approval Flow

```
1. Admin/Organizer navigates to /admin/approvals
2. Server component fetches profiles WHERE status = 'pending'
3. Admin clicks Approve or Reject
4. Server Action updates profile.status to 'approved' or 'rejected'
5. (Optional) Resend sends email notification to member about approval status
6. Approved member can now RSVP, buy tickets, upload media
```

#### 3. SumUp Checkout Flow

```
1. Approved member on event detail page selects ticket tier
2. Client calls POST /api/checkout with { event_id, tier_id }
3. API route (authenticated):
   a. Validates member is approved
   b. Checks tier availability (capacity - sold)
   c. Creates order row: { user_id, event_id, tier_id, status: 'pending', amount }
   d. Calls SumUp API: POST /v0.1/checkouts with:
      - amount, currency, checkout_reference (order.id)
      - redirect_url: /tickets/[order_id]/confirmation
   e. Returns SumUp checkout_id and checkout URL to client
4. Client redirects to SumUp hosted checkout page (or renders SumUp card widget)
5. After payment:
   a. SumUp redirects user to /tickets/[order_id]/confirmation
   b. SumUp sends webhook POST to /api/webhooks/sumup
6. Webhook handler:
   a. Verifies request authenticity (SumUp webhook signature or checkout lookup)
   b. Finds order by checkout_reference
   c. Updates order.status = 'paid' (or 'failed')
   d. If paid: creates ticket record with unique QR code
7. Confirmation page polls order status (or uses Supabase realtime) to show ticket
```

**IMPORTANT -- SumUp Integration Notes (MEDIUM confidence, verify against current SumUp docs):**
- SumUp's Online Payments API uses a hosted checkout page or embeddable card form
- Create checkout via `POST https://api.sumup.com/v0.1/checkouts`
- Required fields: `amount`, `currency`, `checkout_reference`, `merchant_code`
- Auth: Bearer token (OAuth2 access token from SumUp merchant account)
- Webhook/callback: SumUp supports a `redirect_url` for post-payment redirect; webhook support may require configuration in SumUp dashboard
- If SumUp does not support server-to-server webhooks reliably, the confirmation page should poll the SumUp checkout status API: `GET /v0.1/checkouts/{id}`
- **Phase-specific research REQUIRED** to verify: webhook availability, signature verification method, and whether the SumUp card widget (sumup-card SDK) works in Next.js SSR context

#### 4. Event CRUD (Organizer)

```
1. Organizer navigates to /organizer/events/new
2. Form captures: title, description, date, time, location, lineup, capacity, cover image
3. Cover image uploaded to Supabase Storage (event-covers bucket)
4. On submit: Server Action inserts event row + ticket_tier rows
5. Slug auto-generated from title (slugify)
6. Event starts as is_published = false (draft)
7. Organizer can publish when ready (sets is_published = true)
8. Organizer can add/edit ticket tiers: { name, price, capacity, sales_start, sales_end }
```

#### 5. Media Upload Pipeline

```
1. Approved member on event detail page (for an event they attended) clicks "Upload"
2. Client validates: file type (image/video), file size (images < 10MB, videos < 100MB)
3. Client calls API route or Server Action to get presigned upload URL
4. Server verifies:
   a. User is approved member
   b. User has attendance record for this event
5. File uploaded directly to Supabase Storage (event-media bucket)
   Path: event-media/{event_id}/{user_id}/{timestamp}_{filename}
6. On upload complete: insert event_media row { event_id, uploaded_by, url, type, status: 'published' }
7. Media appears on event gallery and member profile
```

#### 6. Role-Based Access

```
Middleware on every request:
1. Refresh session (existing behavior)
2. If user authenticated, fetch profile (with caching strategy -- see below)
3. Attach role + status to request context

Role hierarchy:
  master > organizer > member (approved) > member (pending) > anonymous

Route protection matrix:
  /events, /gallery      -- anonymous OK
  /register, /login      -- anonymous only (redirect if logged in)
  /dashboard, /tickets   -- approved member+
  /events/:id/upload     -- approved member+ (with attendance check)
  /organizer/*            -- organizer+ only
  /admin/*                -- master only
```

## Patterns to Follow

### Pattern 1: Role in Profile, Not JWT Custom Claims

**What:** Store role in `profiles.role` column (enum: 'master', 'organizer', 'member') and status in `profiles.status` column (enum: 'pending', 'approved', 'rejected'). Query profile in middleware rather than embedding in JWT custom claims.

**Why:** Supabase custom claims require a database function call to update and don't take effect until next JWT refresh (up to 1 hour). Profile-based roles are immediately consistent after an admin changes them.

**When:** All role checks in middleware, RLS policies, and Server Components.

**Implementation:**
```typescript
// src/lib/supabase/middleware.ts -- updated
export async function updateSession(request: NextRequest) {
  // ... existing session refresh code ...

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Fetch profile for role/status (consider caching in cookie)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    // Inject into request headers for downstream Server Components
    if (profile) {
      supabaseResponse.headers.set('x-user-role', profile.role);
      supabaseResponse.headers.set('x-user-status', profile.status);
    }
  }

  // Route protection based on role + status
  // ...
}
```

**Trade-off:** One extra DB query per request. Mitigate by caching role in a short-lived cookie (5 min TTL) that middleware refreshes, avoiding a DB round-trip on every navigation.

### Pattern 2: Server Actions for Mutations, API Routes for Webhooks

**What:** Use Next.js Server Actions (functions marked `'use server'`) for all authenticated mutations (RSVP, approve member, create event). Reserve API routes (`/api/...`) for external integrations (SumUp webhook, membership verification).

**Why:** Server Actions provide built-in CSRF protection, work with the auth cookie context, and integrate naturally with React form handling. API routes are needed for external callers that don't have a browser session.

**When:** Every write operation.

```typescript
// src/app/(organizer)/events/new/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify organizer role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'organizer' && profile?.role !== 'master') {
    throw new Error('Forbidden')
  }

  const event = {
    title: formData.get('title') as string,
    // ... other fields
    created_by: user.id,
  }

  const { data, error } = await supabase.from('events').insert(event).select().single()
  if (error) throw error

  redirect(`/organizer/events/${data.slug}`)
}
```

### Pattern 3: RLS as the Authorization Backbone

**What:** Every authorization rule must exist as a Supabase RLS policy. Middleware and Server Actions provide UX-level gating (redirects, error messages) but RLS is the security boundary.

**Why:** If a client somehow bypasses the middleware or a developer forgets an auth check in a Server Action, RLS prevents unauthorized data access. Defense in depth.

**When:** Every table, every operation.

```sql
-- Example: Only approved members can insert RSVPs
create policy "Approved members can RSVP"
  on public.rsvps for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
      and status = 'approved'
    )
  );

-- Example: Organizers can manage their own events
create policy "Organizers manage own events"
  on public.events for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and (role = 'organizer' or role = 'master')
    )
  );

-- Example: Only attendees can upload media for an event
create policy "Attendees can upload event media"
  on public.event_media for insert
  with check (
    exists (
      select 1 from public.attendances
      where event_id = event_media.event_id
      and user_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
      and status = 'approved'
    )
  );
```

### Pattern 4: Supabase Storage with Path-Based RLS

**What:** Use Supabase Storage buckets with RLS policies tied to the file path structure.

**Why:** Storage RLS uses the same `auth.uid()` context as database RLS, keeping authorization consistent. Path structure (`event-media/{event_id}/{user_id}/...`) encodes ownership in the path itself.

**When:** All file uploads (event covers, event media).

```sql
-- Storage bucket: event-media (public read, authenticated upload)
-- Policy: Anyone can view
create policy "Public read event media"
  on storage.objects for select
  using (bucket_id = 'event-media');

-- Policy: Approved attendees can upload to their own path
create policy "Attendees upload own media"
  on storage.objects for insert
  with check (
    bucket_id = 'event-media'
    and auth.uid() is not null
    and (storage.foldername(name))[2] = auth.uid()::text
    -- Verify attendance via DB check in the upload API route, not in RLS
    -- (Storage RLS can't easily join to attendances table)
  );
```

**Note:** Storage RLS has limited ability to join against custom tables. For the attendance check, validate in the Server Action/API route before generating the upload path, then use path-based ownership in storage RLS.

### Pattern 5: Webhook Security Without Auth Cookies

**What:** The SumUp webhook endpoint (`/api/webhooks/sumup`) runs without user auth cookies. Secure it by verifying the request origin.

**Why:** Webhooks are server-to-server. They don't carry user sessions.

**When:** SumUp payment notifications.

```typescript
// src/app/api/webhooks/sumup/route.ts
import { createClient } from '@supabase/supabase-js' // admin client, NOT the SSR one

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role bypasses RLS
)

export async function POST(request: Request) {
  const body = await request.json()

  // Option A: Verify webhook signature (if SumUp provides one)
  // Option B: Look up checkout via SumUp API to verify status independently
  const checkoutId = body.id || body.checkout_reference
  // Verify with SumUp API: GET /v0.1/checkouts/{checkoutId}
  // This confirms the payment status server-to-server

  // Update order in database
  await supabaseAdmin
    .from('orders')
    .update({ status: body.status === 'PAID' ? 'paid' : 'failed' })
    .eq('sumup_checkout_id', checkoutId)

  return new Response('OK', { status: 200 })
}
```

**Critical:** Use `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) for webhook handlers because there's no user session. This bypasses RLS, so validate inputs carefully.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Role in JWT Custom Claims Only

**What:** Storing role exclusively in Supabase JWT custom claims via `auth.users.raw_app_meta_data`.

**Why bad:** JWT claims only refresh when the token expires (default 1 hour). If an admin promotes a user to organizer, the user doesn't see the change until their JWT refreshes. This creates confusing "I was approved but I can't do anything" states.

**Instead:** Store role in `profiles.role` and check it server-side. Optionally sync to JWT claims for RLS policies that need it, but always fetch the profile as the source of truth for middleware decisions.

### Anti-Pattern 2: Client-Side Role Checks as Security

**What:** Checking role in React components to hide/show UI and treating that as authorization.

**Why bad:** Anyone can modify client JavaScript. If the RLS policy doesn't enforce the role check, a crafted request can bypass it.

**Instead:** Client-side checks for UX (hide buttons the user can't use). RLS and Server Action checks for security. Both must exist.

### Anti-Pattern 3: Direct File Upload to Supabase Storage from Client Without Validation

**What:** Letting the client upload directly to Supabase Storage without server-side file validation.

**Why bad:** Users could upload malicious files, exceed size limits, or upload to wrong paths. Storage RLS alone can't validate file types or sizes.

**Instead:** Server Action validates file metadata (type, size), generates the correct storage path, then either:
- Returns a presigned URL for client-side upload (better for large files), or
- Proxies the upload through the server (simpler for small files)

### Anti-Pattern 4: Polling SumUp Status in Client Without Timeout

**What:** After SumUp redirect, the confirmation page polls the order status indefinitely waiting for the webhook to update it.

**Why bad:** If the webhook fails or is delayed, the user stares at a spinner forever.

**Instead:** Set a 30-second polling timeout. After timeout, show "Payment is being processed, check your tickets page in a few minutes" and stop polling. The webhook will eventually update the status.

## New Database Schema (Additions)

The following tables and columns need to be added to the existing schema.

### Modified: profiles

```sql
-- Add role and status columns
alter table public.profiles
  add column role text check (role in ('master', 'organizer', 'member')) default 'member',
  add column status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  add column referral_code text unique,
  add column referred_by uuid references public.profiles(id);

-- Generate referral_code on profile creation (modify existing trigger)
-- referral_code format: 6 alphanumeric chars, e.g., "X7K9M2"
```

### New: ticket_tiers

```sql
create table public.ticket_tiers (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events on delete cascade not null,
  name text not null,           -- 'Early Bird', 'Regular', 'VIP'
  price decimal(10,2) not null,
  currency text default 'EUR',
  capacity integer,             -- null = unlimited
  sales_start timestamptz,
  sales_end timestamptz,
  sort_order integer default 0,
  created_at timestamptz default now()
);
```

### New: orders

```sql
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  event_id uuid references public.events on delete cascade not null,
  tier_id uuid references public.ticket_tiers on delete set null,
  status text check (status in ('pending', 'paid', 'failed', 'refunded')) default 'pending',
  amount decimal(10,2) not null,
  currency text default 'EUR',
  sumup_checkout_id text,       -- SumUp's checkout ID for lookup
  sumup_transaction_id text,    -- SumUp's transaction ID after payment
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### New: referrals

```sql
create table public.referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references public.profiles(id) on delete cascade not null,
  referred_id uuid references public.profiles(id) on delete cascade not null unique,
  created_at timestamptz default now()
);
```

### Modified: event_media

```sql
-- Add uploaded_by column to track who uploaded
alter table public.event_media
  add column uploaded_by uuid references auth.users on delete set null;
```

### Modified: events

```sql
-- Add created_by to track which organizer created the event
alter table public.events
  add column created_by uuid references auth.users on delete set null;
```

## Build Order (Dependency Graph)

The features have hard dependencies that dictate implementation order.

```
Layer 0: Role + Status infrastructure
  |
  +-- profiles schema changes (role, status, referral_code)
  +-- middleware role resolution
  +-- RLS policy updates for role-based access
  |
  v
Layer 1: Approval + Referral (depends on Layer 0)
  |
  +-- Registration flow with referral code capture
  +-- handle_new_user trigger update (auto-approve referred, pending otherwise)
  +-- Referral link generation (member dashboard)
  +-- Approval queue UI (admin)
  |
  v
Layer 2: Event CRUD (depends on Layer 0, independent of Layer 1)
  |
  +-- events schema update (created_by)
  +-- ticket_tiers table
  +-- Organizer event creation form
  +-- Event editing
  +-- Cover image upload to Supabase Storage
  +-- Replace mock event data with real Supabase queries
  |
  v
Layer 3: Payments (depends on Layer 0 + Layer 2)
  |
  +-- orders table
  +-- SumUp API integration (checkout creation)
  +-- SumUp webhook handler
  +-- Checkout flow UI (tier selection -> payment -> confirmation)
  +-- Ticket display with QR code
  |
  v
Layer 4: Media Upload (depends on Layer 0, partially Layer 2)
  |
  +-- Supabase Storage bucket setup (event-media)
  +-- Storage RLS policies
  +-- Upload UI on event detail page
  +-- Gallery display (event page + member profile)
  +-- event_media schema update (uploaded_by)
```

**Ordering rationale:**

1. **Layer 0 first** because every other feature depends on knowing who the user is and what they're allowed to do. The existing `is_admin` boolean is insufficient for the three-tier role model (master/organizer/member) and the pending/approved status distinction.

2. **Layer 1 before Layer 3** because the payment flow must check approval status. If approvals aren't built first, there's no way to gate ticket purchases to approved members only.

3. **Layer 2 before Layer 3** because you need real events with ticket tiers before you can sell tickets. The current mock data won't work for payment flows.

4. **Layer 2 is independent of Layer 1** -- organizers can create events regardless of the referral/approval system. These can be built in parallel if desired.

5. **Layer 4 last** because it's the lowest-priority feature and has the most complex infrastructure (storage buckets, file validation, upload UI). It also benefits from Layer 2 being complete (real events to attach media to) and Layer 0 (attendance-gated uploads).

## Scalability Considerations

| Concern | At 100 members | At 1,000 members | At 10,000 members |
|---------|----------------|-------------------|-------------------|
| Profile query in middleware | Negligible | Add 5-min cookie cache | Add 5-min cookie cache; consider JWT custom claims sync |
| SumUp checkout creation | No issue | No issue | Check SumUp rate limits |
| Media storage | Free tier sufficient | ~50GB, free tier likely enough | Upgrade Supabase plan, add image optimization |
| Media upload concurrency | No issue | No issue | Queue uploads, add progress indication |
| Event gallery rendering | Client-side pagination | Server-side pagination | CDN + image transforms via Supabase Image Transformation |

This platform is designed for a curated community (invitation-gated), so member counts are unlikely to reach 10,000 in the near term. Architecture decisions optimize for the 100-1,000 range.

## Environment Variables (New)

```env
# SumUp
SUMUP_API_KEY=           # OAuth access token for SumUp API
SUMUP_MERCHANT_CODE=     # Merchant code from SumUp dashboard
SUMUP_WEBHOOK_SECRET=    # (if SumUp provides webhook signing -- verify in docs)

# Supabase (additional)
SUPABASE_SERVICE_ROLE_KEY=  # For webhook handlers that bypass RLS
```

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Role-based middleware + RLS | HIGH | Standard Supabase + Next.js pattern, well-documented |
| Approval flow | HIGH | Simple status field + query, no external dependencies |
| Referral tracking | HIGH | Standard pattern: unique code per user, FK tracking |
| Event CRUD + ticket tiers | HIGH | Standard Supabase CRUD, well-understood patterns |
| Supabase Storage media upload | HIGH | Well-documented, path-based RLS is standard |
| SumUp API checkout creation | MEDIUM | Based on training data; exact API shape, webhook support, and SDK availability need verification against current SumUp docs |
| SumUp webhook handling | LOW | Unclear whether SumUp sends server-to-server webhooks or relies on client redirect only; needs phase-specific research |
| SumUp card widget in Next.js | LOW | SumUp provides a JS SDK for embedded card forms, but compatibility with Next.js 16 SSR/client components is unverified |

## Sources

- Existing codebase analysis (direct file reads)
- Supabase documentation (training data, HIGH confidence for RLS, Storage, Auth patterns)
- SumUp Developer API (training data, MEDIUM confidence -- recommend verifying at https://developer.sumup.com/api before implementation)
- Next.js App Router patterns (training data, HIGH confidence for middleware, Server Actions, route groups)

---

*Architecture research: 2026-02-24*
