# Feature Landscape

**Domain:** Private, invitation-driven music events community platform
**Researched:** 2026-02-24
**Overall confidence:** MEDIUM (based on training data for event/community platform patterns; web research tools unavailable for live verification)

## Table Stakes

Features users expect in a private event community platform. Missing = product feels incomplete or broken.

### Authentication and Access

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email/password registration | Basic entry point to any platform | Low | Already exists (`/registrati`). Needs English route migration. |
| Session persistence | Users expect to stay logged in | Low | Already exists (Supabase cookie middleware). |
| Password strength enforcement | Users expect security, prevents account compromise | Low | Active requirement. Supabase auth supports custom password policies via `signUp` options or client-side validation. |
| Branded confirmation emails | Unbranded emails look like spam; erode trust immediately | Low | Active requirement. Resend already integrated; need HTML template with Resonate branding. |
| Logout | Users must be able to end their session | Low | Likely exists but verify. |

### Event Discovery and Details

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Browse upcoming events | Core value of the platform; this IS the product | Low | Exists but uses mock data. Must connect to Supabase. |
| Event detail page (title, date, time, location, lineup, cover image) | Users need to decide whether to attend | Low | Exists (`/eventi/[slug]`). Needs real data integration. |
| Past events archive | Members want to revisit events they attended | Low | Standard filter on event date. Pairs naturally with gallery/media. |
| Event capacity display | Members want to know if an event might sell out | Low | Schema already has `capacity` field. Show "X spots left" or "Sold out". |

### RSVP and Attendance

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| RSVP to events | Core engagement action before ticketing | Low | Exists. Schema has `rsvps` table. |
| Cancel RSVP | Users change plans; they expect to undo | Low | Schema has delete policy. |
| QR-based check-in at door | Private events need verification; this IS the gating mechanism at the venue | Medium | Exists (`/admin/scanner` + `/membership-card`). Already a differentiator realized as table stakes for this niche. |

### Member Profile

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| View own profile | Basic expectation of any membership platform | Low | Dashboard exists. Needs enrichment with role, referral stats, media. |
| Membership card with QR code | Identity within the community | Low | Already exists. |

### Admin/Organizer Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create events (organizer) | Without this, there IS no platform content | Medium | Active requirement. Needs form UI + Supabase insert + slug generation. |
| Edit own events (organizer) | Typos happen, details change | Medium | Active requirement. Standard CRUD. |
| View ticket sales for own events (organizer) | Organizers need to know revenue and headcount | Medium | Active requirement. Query tickets table grouped by tier. |
| Approve/reject pending members (admin/organizer) | Core to the "private" value proposition | Medium | Active requirement. Needs admin UI listing pending profiles with approve/reject actions. |

## Differentiators

Features that set Resonate apart from generic event platforms. Not expected everywhere, but these define the community's identity.

### Referral and Invitation System

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Unique referral link per member | Grows community organically through trust networks; members feel ownership | Medium | Active requirement. Each member gets one persistent link (e.g., `/join?ref=RSN-XXXXXXXX`). Simpler than per-invite links. Store `referred_by` on profile. |
| Auto-approval for referred signups | Removes friction for trusted introductions; rewards existing members | Low | Active requirement. On registration, if valid `ref` param present, set profile status to `approved` instead of `pending`. |
| Referral tracking (who invited whom) | Community graph visibility; enables future features (leaderboards, rewards) | Low | Store `referred_by uuid` on profiles table. Simple foreign key. |
| Pending state for non-referred signups | The "velvet rope" -- creates exclusivity and perceived value | Medium | Active requirement. Pending members can browse but cannot RSVP, buy tickets, or upload media. Requires middleware/RLS enforcement across multiple features. |

**How referral systems typically work in community platforms:**

The standard pattern is a single persistent referral link per member, not single-use invite codes. The link contains a unique identifier (membership code works well). On signup, the referral code is stored in the new user's profile as `referred_by`. The referred user bypasses the approval queue entirely. This is how platforms like Clubhouse (during invite-only phase), Luma, and private Discord communities operated. Key principle: the referrer vouches for the referee, so manual approval is unnecessary.

**Implementation pattern:**
1. Member shares link: `resonate.app/join?ref=RSN-A3B7K9M2`
2. Registration form pre-fills or stores the ref code in session/cookie
3. On signup trigger, check if `referred_by` is a valid member code
4. If valid: set `status = 'approved'`, record the referral relationship
5. If no ref code: set `status = 'pending'`, notify admins

### Ticket Tiers and Purchasing

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multiple ticket tiers per event (Early Bird, Regular, VIP) | Flexible pricing rewards early commitment and offers premium experiences | High | Active requirement. Needs `ticket_tiers` table with event_id, name, price, quantity, sales_start, sales_end. |
| SumUp payment integration | Members complete purchase without leaving the platform | High | Active requirement. SumUp offers hosted checkout and API-based flows. Hosted checkout is simpler: redirect to SumUp payment page, receive webhook on completion. |
| Ticket confirmation with QR code | Proof of purchase for door entry; distinct from membership QR | Medium | Generate unique ticket code on successful payment. Can reuse QR generation pattern from membership card. |
| Ticket sales dashboard for organizers | Organizers see revenue, tier breakdown, buyer list | Medium | Active requirement. Aggregate query on tickets table grouped by tier. |

**How ticket tiers typically work:**

Standard implementation uses a `ticket_tiers` table linked to events. Each tier has: name, price (in cents to avoid floating point), total quantity, description, and optional time windows (early bird available until X date). The purchase flow checks remaining quantity (total - sold) before allowing purchase. Overselling prevention requires either database-level constraints (decrement-and-check in a transaction) or optimistic locking.

**Tier patterns in music events:**
- **Early Bird**: Lower price, limited quantity, available first, time-limited
- **Regular / General Admission**: Standard price, largest allocation
- **VIP / Premium**: Higher price, limited quantity, may include perks (priority entry, backstage, drink tokens)
- **Door Price**: Highest price, available only at the venue (optional, handled outside platform)

**SumUp integration pattern:**
SumUp's online payments work via hosted checkout. The flow is:
1. Create a checkout on your server via SumUp API (amount, currency, description, redirect URLs)
2. Redirect user to SumUp-hosted payment page
3. User completes payment on SumUp's page
4. SumUp redirects back to your success/failure URL
5. Verify payment status via webhook or API polling
6. On confirmed payment, create ticket record in database

This is simpler than Stripe's embedded approach. SumUp handles PCI compliance entirely. The main constraint: SumUp's API is less developer-friendly than Stripe's, with fewer SDKs and less documentation. Plan for extra integration time.

### Role-Based Access Control

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Four-tier role system (master admin, organizer, member, pending) | Enables delegation without losing control; organizers self-serve | Medium | Active requirement. Current schema only has `is_admin` boolean. Needs migration to `role` enum field: `master`, `organizer`, `member`, `pending`. |
| Role-based UI rendering | Each role sees only what's relevant to them | Medium | Conditional rendering based on profile role. Admin sees management tools, organizer sees event creation, pending sees limited browse-only view. |
| Role-based API/RLS enforcement | Security cannot depend on UI alone | Medium | Supabase RLS policies need updating from `is_admin = true` to role-based checks. Every protected action needs server-side role verification. |

**How RBAC typically works in community platforms:**

The standard pattern is a single `role` column on the profiles table with an enum type. PostgreSQL enums work well here. RLS policies reference the role for authorization. The hierarchy is:
- **Master (admin)**: Full control. Approve members, manage all events, assign organizer role, platform settings.
- **Organizer**: Create/edit own events, view own event ticket sales, approve pending members.
- **Member (approved)**: Browse events, RSVP, buy tickets, upload media, share referral link.
- **Pending**: Browse published events only. Cannot RSVP, buy, upload, or invite.

Key decision already made in PROJECT.md: organizers CAN approve pending members, not just the master admin. This is good -- it distributes workload.

### Event Media Uploads

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Members upload photos/videos for attended events | Community-generated content; members relive experiences together | High | Active requirement. Needs file upload to Supabase Storage, media processing (thumbnails, compression), and moderation consideration. |
| Media on event detail page (gallery section) | Content lives where it's contextually relevant | Medium | Current `event_media` table exists but only admin can manage. Needs member upload capability with event_id tagging. |
| Media on member profile, tagged by event | Members build a visual history of their community participation | Medium | Active requirement. Query event_media by user_id, grouped by event. Needs `uploaded_by` column added to event_media table. |

**How event media typically works:**

Standard flow: member selects event they attended, uploads photos/videos, files go to object storage (Supabase Storage), metadata (URL, type, uploader, event) stored in database. Key concerns:
- **File size limits**: Photos up to 10MB, videos up to 100MB is reasonable for community uploads
- **Accepted formats**: JPEG, PNG, WebP for photos; MP4, MOV for video
- **Thumbnails**: Generate on upload or lazy-generate on first view. Supabase Storage has image transformation built in for photos
- **Video thumbnails**: More complex. Consider extracting first frame server-side or requiring a cover image
- **Moderation**: For a trusted community, post-upload review by organizer/admin is sufficient (not pre-approval). Flag/report mechanism as backup
- **Storage costs**: Video is expensive. Set reasonable per-event or per-member upload limits
- **Attendance gating**: Only allow uploads for events the member actually attended (check `attendances` table). This prevents random uploads and ties media to real experiences

## Anti-Features

Features to explicitly NOT build. These are tempting but wrong for Resonate.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time chat / messaging | Splits community attention, creates moderation burden, every community platform that adds chat regrets it. WhatsApp/Telegram groups already serve this need. | Link to external community group if desired. Keep platform focused on events. |
| OAuth / social login | Adds complexity, third-party dependency. Email/password is sufficient for a private community where members are vetted. Social login also leaks identity in ways a private community might not want. | Keep email/password. Consider magic link login as a future convenience feature. |
| Multi-language / i18n | Over-engineering for an English-only community. i18n frameworks add bundle size and development overhead for no current value. | Hardcode English strings. If internationalization is ever needed, extract strings then. |
| Native mobile app | PWA already provides home screen install, offline capability, push notifications. Building native apps doubles development cost with marginal benefit for an event discovery platform. | Maintain PWA quality. Ensure manifest and service worker are robust. |
| Automated event recommendations | Small community with curated events. Members should browse all events, not be algorithmically filtered. Recommendations require usage data that a small platform won't have. | Show all upcoming events chronologically. Simple and honest. |
| Complex analytics dashboard | Overhead for a platform with likely <100 events/year. Basic ticket sales visibility per event is sufficient. | Organizer sees tier breakdown and buyer count per event. Master admin sees total members and pending approvals count. |
| Waitlist system for sold-out events | Adds significant complexity (notification queues, time-limited holds, race conditions). For small community events, word-of-mouth handles this. | Show "Sold out" status. Members can contact organizer directly. |
| Transferable / resellable tickets | Creates secondary market dynamics, potential for scalping, and complex ownership transfer logic. Antithetical to a trust-based community. | Tickets are non-transferable. If someone can't attend, they contact the organizer for a manual refund. |
| Public event pages / SEO-optimized discovery | This is a PRIVATE community. Public visibility undermines the exclusivity that makes the community valuable. | Events are only visible to authenticated members (or pending members in browse-only mode). No public event pages for search engines. |
| User-generated events | Members should not create events. This is a curated platform where organizers control the calendar. User-generated events dilute quality and create moderation burden. | Only organizer and master admin roles can create events. |
| Complex refund automation | SumUp refund API adds complexity. For a small community, manual refunds through SumUp dashboard are sufficient. | Organizer processes refunds through SumUp directly. Platform shows "Contact organizer for refunds" messaging. |

## Feature Dependencies

```
Role system (RBAC) --> Everything else
  |
  |--> Approval workflow (requires pending/approved distinction)
  |     |
  |     |--> Referral system (auto-approval requires approval states)
  |
  |--> Event creation (requires organizer role)
  |     |
  |     |--> Ticket tiers (requires events to exist in DB)
  |           |
  |           |--> SumUp payment integration (requires tiers to price against)
  |                 |
  |                 |--> Ticket confirmation/QR (requires successful payment)
  |
  |--> Event media uploads (requires member role + attendance verification)
  |
  |--> Organizer dashboard (requires organizer role + events + tickets)

Referral link generation (requires member profile with membership_code -- already exists)
  |
  |--> Referral tracking on signup (requires referred_by field on profile)
       |
       |--> Auto-approval logic (requires both referral tracking + approval states)
```

**Critical path:** RBAC must come first. The current schema has only `is_admin` boolean. Every downstream feature depends on the role system being in place.

## MVP Recommendation

For the milestone adding these features to the existing app, prioritize in this order:

### Phase 1: Foundation (must be first)

1. **Role-based access control** -- Migrate from `is_admin` boolean to `role` enum. Update all RLS policies. This unblocks everything else.
2. **Approval workflow** -- Add `pending` state handling. Pending members see events but cannot act. Admin/organizer approval UI.
3. **Referral system** -- Referral link generation (uses existing membership_code), registration with ref param, auto-approval logic, referral tracking.

### Phase 2: Event Management

4. **Event creation by organizers** -- Form UI, Supabase integration, replace mock data with real DB queries.
5. **Ticket tiers** -- `ticket_tiers` table, tier management UI for organizers within event creation.
6. **SumUp payment integration** -- Hosted checkout flow, webhook handling, ticket record creation on payment confirmation.

### Phase 3: Community Content

7. **Event media uploads** -- File upload to Supabase Storage, attendance-gated uploads, gallery display on event pages and member profiles.
8. **Organizer dashboard** -- Ticket sales view, attendee lists, pending member management.

**Rationale:** RBAC is the foundation -- every other feature checks roles. Approval and referral are the community's identity mechanism and must work before you invite anyone. Ticketing is the revenue engine. Media is valuable but not blocking for launch.

### Defer

- **Referral leaderboards/rewards**: Nice-to-have gamification, but adds complexity. Build after referral tracking proves the community grows through referrals.
- **Push notifications for new events**: PWA supports this but implementation is non-trivial. Events are infrequent enough that email notification suffices initially.
- **Offline event browsing**: PWA can cache event data, but adds service worker complexity. Not critical for a platform where ticket purchase requires connectivity anyway.

## Complexity Assessment Summary

| Feature Area | Overall Complexity | Biggest Risk |
|-------------|-------------------|--------------|
| RBAC + Approval | Medium | RLS policy migration -- must update every existing policy without breaking current functionality |
| Referral System | Low-Medium | Edge cases: expired/deactivated referrer, self-referral prevention, referral link shared publicly |
| Event CRUD | Medium | Slug generation, image upload for cover, form validation, draft vs published states |
| Ticket Tiers | Medium-High | Overselling prevention (race conditions), tier time windows, capacity tracking |
| SumUp Integration | High | Less mature developer API than Stripe, webhook reliability, payment state management, error handling |
| Event Media | High | File size/type validation, storage costs, video handling, thumbnail generation, moderation |

## Sources

- Training data knowledge of event platforms (Eventbrite, Luma, Resident Advisor, Dice, Partiful) -- MEDIUM confidence
- Training data knowledge of SumUp API capabilities -- LOW confidence (verify against current SumUp developer docs before implementation)
- Training data knowledge of Supabase RLS, Storage, and Auth patterns -- MEDIUM confidence
- Direct codebase analysis of existing schema and routes -- HIGH confidence
- PROJECT.md requirements -- HIGH confidence

**Note:** Web research tools were unavailable during this research session. SumUp API specifics (endpoints, webhook format, hosted checkout flow) should be verified against current official documentation at `developer.sumup.com` before implementation begins. This is flagged as the area with lowest confidence.
