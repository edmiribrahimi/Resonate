# Technology Stack: Milestone Additions

**Project:** Resonate -- Private Music Events Community Platform
**Researched:** 2026-02-24
**Scope:** Additional libraries and services for: SumUp payments, referral system, role-based access, media uploads, branded emails, Orbitron font
**Existing stack (not re-researched):** Next.js 16.1.6, React 19.2.3, Supabase (JS SDK 2.97.0, SSR 0.8.0), Tailwind CSS 4.x, PWA via next-pwa

---

## Recommended Additions

### 1. SumUp Payment Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| SumUp Checkout API (REST) | v1 | Server-side checkout creation and payment processing | SumUp does not provide a first-party Node.js SDK. The REST API is well-documented and straightforward -- create a checkout server-side, redirect the user to SumUp's hosted payment page, receive a webhook on completion. No npm package needed. |

**How it works:**

SumUp's online payment flow uses their **Checkout API**:
1. Server creates a checkout via `POST https://api.sumup.com/v0.1/checkouts` with amount, currency, description, and merchant code
2. Response includes a `checkout_id` and optionally a redirect URL to SumUp's hosted payment page
3. User completes payment on SumUp's hosted page (PCI-compliant -- no card data touches our server)
4. SumUp sends a webhook to a configured callback URL with payment status
5. Our webhook handler updates the ticket/order status in Supabase

**Authentication:** OAuth2 bearer token. SumUp provides API keys via the SumUp Dashboard. Store `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE` as environment variables.

**Why NOT a client-side SDK:** SumUp offers a card widget for embedding, but the hosted checkout page is simpler, handles PCI compliance entirely on their side, and works perfectly for a ticket purchase flow (user clicks "Buy" -> redirect to SumUp -> return to our confirmation page).

**Confidence:** MEDIUM -- Based on SumUp developer documentation from training data. SumUp's API surface is stable, but exact endpoint paths and OAuth flow details should be verified against https://developer.sumup.com before implementation.

**Environment variables to add:**
```
SUMUP_API_KEY=your-sumup-api-key
SUMUP_MERCHANT_CODE=your-merchant-code
SUMUP_WEBHOOK_SECRET=your-webhook-secret (if SumUp supports webhook signature verification)
NEXT_PUBLIC_SUMUP_REDIRECT_URL=https://yourdomain.com/api/payments/callback
```

**No npm packages required.** Use native `fetch()` (available in Next.js server components and API routes) to call SumUp's REST API.

---

### 2. Branded Transactional Emails via Resend + React Email

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@react-email/components` | ^0.0.31 | Build branded HTML email templates with React components | Resend's recommended approach. Write emails as React components with type safety. Renders to cross-client-compatible HTML. |
| `resend` (existing) | ^6.9.2 | Send transactional emails | Already installed. Extend usage from newsletter-only to all transactional emails (confirmation, approval, ticket receipt, referral invite). |

**Why React Email:** Resend and React Email are built by the same team (Resend, Inc.). React Email provides components like `<Html>`, `<Head>`, `<Body>`, `<Container>`, `<Section>`, `<Text>`, `<Img>`, `<Button>`, `<Hr>` that render to battle-tested HTML compatible with Gmail, Outlook, Apple Mail, etc. Writing raw HTML emails is painful and error-prone; React Email solves this with a component model.

**Why NOT:**
- **MJML:** Adds a separate template language and compilation step. React Email stays in the TypeScript/React ecosystem you already use.
- **Handlebars/EJS templates:** No type safety, hard to maintain, poor DX compared to React components.
- **Inline HTML strings:** Unmaintainable for branded emails with logos, colors, and responsive layouts.

**Email templates to build:**
1. Welcome / registration confirmation (with Resonate branding)
2. Member approved notification
3. Member rejected notification
4. Ticket purchase confirmation / receipt
5. Referral invite (shareable link)
6. Password reset (branded override of Supabase default)

**Supabase email customization:** Supabase Auth sends its own emails for signup confirmation and password reset. You can customize these templates in the Supabase Dashboard (Authentication > Email Templates) with HTML. For full control, disable Supabase's default emails and send your own via Resend using auth webhooks or the `handle_new_user` trigger pattern. The recommended approach for Resonate is to customize Supabase's built-in templates with Resonate branding for auth flows, and use Resend directly for all other transactional emails.

**Confidence:** MEDIUM -- React Email API is stable and widely used with Resend. Version number should be verified via npm before installing.

**Installation:**
```bash
npm install @react-email/components
```

---

### 3. Orbitron Google Font Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `next/font/google` (built-in) | N/A (part of Next.js 16) | Load Orbitron font with zero layout shift and self-hosting | Next.js has built-in Google Fonts support via `next/font/google`. It automatically self-hosts the font files at build time (no external requests to Google at runtime), provides font-display swap, and generates CSS variable bindings for use with Tailwind. |

**No npm package needed.** `next/font` is built into Next.js.

**Implementation pattern:**
```typescript
// src/app/layout.tsx
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

// Apply to <html> or <body>:
<html lang="en" className={orbitron.variable}>
```

Then in `globals.css` or Tailwind config, set Orbitron as the default font family, or use the CSS variable `var(--font-orbitron)` where needed.

**Why NOT:**
- **Google Fonts CDN `<link>` tag:** Causes external network requests, FOUT/FOIT issues, and is slower than self-hosting. Next.js font optimization is strictly better.
- **Manual font file download:** Unnecessary complexity when `next/font` handles this automatically.

**Confidence:** HIGH -- `next/font/google` has been stable since Next.js 13 and is the documented approach. Orbitron is available in Google Fonts.

---

### 4. Media Uploads (Photos/Videos)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Storage (existing) | N/A (part of Supabase) | Store uploaded photos and videos | Already configured in the project (image remote patterns for `*.supabase.co` in `next.config.ts`). Supabase Storage provides S3-compatible object storage with RLS policies, image transformations, and CDN delivery. No additional service needed. |

**No new npm packages required.** The existing `@supabase/supabase-js` SDK includes the Storage API (`supabase.storage.from('bucket').upload(...)`, `.getPublicUrl(...)`, `.createSignedUrl(...)`).

**Implementation considerations:**

- **Storage buckets:** Create separate buckets for different media types:
  - `event-photos` -- public bucket for event photos
  - `event-videos` -- public bucket for event videos
  - Consider a single `event-media` bucket with folder structure: `event-media/{event_id}/photos/`, `event-media/{event_id}/videos/`

- **Upload limits:** Supabase free tier allows 1GB storage, 2GB bandwidth/month. Paid plans scale. For video uploads, set reasonable file size limits (e.g., 50MB for videos, 10MB for photos) in the upload handler.

- **Image transformations:** Supabase Storage supports on-the-fly image transformations (resize, crop) via URL parameters. Use this for generating thumbnails without a separate image processing service.

- **RLS on storage:** Supabase Storage supports RLS-like policies on buckets. Configure so that authenticated members can upload to event-media buckets, and files are publicly readable.

**Schema changes needed:**
- Add `uploaded_by` (uuid, references auth.users) column to `event_media` table
- Update RLS policies so members can insert their own media (not just admins)

**Video considerations:**
- Supabase Storage does not transcode video. Users must upload web-compatible formats (MP4/H.264).
- For large videos, consider client-side compression before upload, or accept the limitation.
- Video playback uses native HTML5 `<video>` element -- no additional player library needed for basic playback.

**Why NOT:**
- **Cloudinary/Imgix:** Adds external service dependency and cost for a feature that Supabase Storage handles natively. Reconsider only if image transformation needs exceed Supabase's capabilities.
- **AWS S3 directly:** Supabase Storage is S3-compatible under the hood and already integrated. No reason to add another service.
- **Uploadthing:** Adds dependency and routing complexity. Supabase Storage is already in the stack.

**Confidence:** HIGH -- Supabase Storage is well-documented and already partially configured in this project.

---

### 5. Role-Based Access Control

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase RLS + custom `role` column | N/A (PostgreSQL/Supabase) | Enforce master/organizer/member roles at the database level | The existing schema already has `is_admin` boolean on `profiles`. Replace this with a proper `role` enum column. RLS policies enforce access at the database level -- no additional library needed. |

**No new npm packages required.** Role-based access is implemented entirely through:
1. A `role` column on the `profiles` table (PostgreSQL enum: `master`, `organizer`, `member`)
2. RLS policies that check `role` for authorization
3. Next.js middleware that checks role for route protection
4. Server-side role checks in API routes

**Schema migration:**
```sql
-- Create role enum
CREATE TYPE user_role AS ENUM ('master', 'organizer', 'member', 'pending');

-- Add role column (replace is_admin)
ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'pending';

-- Migrate existing data
UPDATE public.profiles SET role = 'master' WHERE is_admin = true;
UPDATE public.profiles SET role = 'member' WHERE is_admin = false;

-- Eventually drop is_admin after migration is verified
-- ALTER TABLE public.profiles DROP COLUMN is_admin;
```

**RLS policy patterns:**
```sql
-- Example: Only organizers and master can create events
CREATE POLICY "Organizers can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('organizer', 'master')
    )
  );

-- Example: Pending members can browse but not RSVP
CREATE POLICY "Approved members can RSVP"
  ON public.rsvps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('member', 'organizer', 'master')
    )
  );
```

**Middleware enhancement:** Extend the existing `middleware.ts` to check roles for route segments:
- `/admin/*` -- master only
- `/organizer/*` -- organizer + master
- `/dashboard/*`, `/events/*/buy` -- member + organizer + master (not pending)

**Why NOT:**
- **CASL or similar authorization libraries:** Overkill for 4 roles. RLS + middleware covers this cleanly. CASL adds complexity for a simple role hierarchy.
- **Supabase custom claims (JWT):** Storing roles in JWT claims avoids a DB lookup on every request but adds complexity around claim refresh when roles change. For a community platform with low request volume, querying the `profiles` table is fine. Reconsider if performance becomes an issue.

**Confidence:** HIGH -- This is standard Supabase/PostgreSQL pattern. RLS with role checks is well-documented.

---

### 6. Referral System

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `nanoid` | ^5.1.0 | Generate unique, URL-safe referral codes | Lightweight (130 bytes), no dependencies, cryptographically random, configurable length and alphabet. Better than UUID for user-facing URLs (shorter, URL-safe by default). |

**Implementation approach:**

The referral system is primarily a database + application logic feature, not a library-heavy one.

**Schema additions:**
```sql
-- Add referral columns to profiles
ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN referred_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Generate referral code for existing members
-- (Done via application code using nanoid on approval)
```

**Referral flow:**
1. Each approved member gets a unique referral code (generated with `nanoid`, e.g., `RSN-abc123xy`)
2. Referral link: `https://resonate.app/join?ref=abc123xy`
3. Registration page reads `ref` query param, stores it
4. On signup, if valid `ref` code found: set `referred_by` to referrer's ID, set `status` to `approved`
5. On signup without `ref`: set `status` to `pending`

**Why nanoid over alternatives:**
- **UUID:** Too long for URLs (36 chars). nanoid generates 8-12 char codes that are user-friendly.
- **shortid:** Deprecated, recommends nanoid as replacement.
- **crypto.randomUUID():** Produces full UUIDs, not short codes.
- **Custom random string function:** nanoid is battle-tested and handles edge cases (collision resistance, URL safety).

**Confidence:** HIGH -- nanoid is a stable, widely-used library. The referral logic is straightforward application code.

**Installation:**
```bash
npm install nanoid
```

---

### 7. Member Approval Flow

No additional libraries needed. This is implemented entirely with:
- The `status` column on `profiles` (from referral system schema above)
- The `role` column (from RBAC schema above)
- RLS policies that check status
- Admin/organizer UI pages for reviewing pending members
- Resend emails for approval/rejection notifications

**Flow:**
1. Non-referred user signs up -> `status = 'pending'`, `role = 'pending'`
2. Referred user signs up -> `status = 'approved'`, `role = 'member'` (auto-approved)
3. Master/organizer reviews pending members in admin panel
4. On approval: `status = 'approved'`, `role = 'member'`, referral code generated, notification email sent
5. On rejection: `status = 'rejected'`, notification email sent

**Confidence:** HIGH -- Pure application logic with existing tools.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Payments | SumUp Checkout API (REST) | Stripe | Project constraint: SumUp is required (owner already uses SumUp) |
| Payments | SumUp hosted checkout | SumUp card widget embed | Hosted checkout is simpler, fully PCI-compliant, no iframe complexity |
| Email templates | React Email | MJML | Different ecosystem; React Email stays in TypeScript/React |
| Email templates | React Email | Handlebars/EJS | No type safety, worse DX |
| Fonts | next/font/google | CDN link tag | Self-hosting is faster, no external requests, no FOUT |
| Media storage | Supabase Storage | Cloudinary | Already in stack, no additional service needed |
| Media storage | Supabase Storage | Uploadthing | Already in stack, adds unnecessary dependency |
| Authorization | RLS + role column | CASL | Overkill for 4-role system |
| Authorization | DB role check | JWT custom claims | Adds claim refresh complexity for minimal perf gain |
| Referral codes | nanoid | UUID | UUIDs are too long for user-facing referral links |
| Video player | Native HTML5 video | Video.js/Plyr | Basic playback is sufficient; no custom controls needed |

---

## Complete Installation

```bash
# New dependencies
npm install @react-email/components nanoid

# Type definitions (nanoid ships its own types, no @types needed)
# React Email ships its own types, no @types needed
```

That is all. Two new npm packages total. Everything else uses existing infrastructure (Supabase, Resend, Next.js built-ins) or raw REST API calls (SumUp).

---

## New Environment Variables

```bash
# SumUp Payments
SUMUP_API_KEY=your-sumup-api-key
SUMUP_MERCHANT_CODE=your-merchant-code

# Resend (expand existing)
RESEND_FROM_EMAIL=no-reply@resonate.app
RESEND_AUDIENCE_ID=your-audience-id  # Already used but not documented in .env.example
```

Note: `SUMUP_WEBHOOK_SECRET` may also be needed if SumUp supports webhook signature verification (verify during implementation).

---

## New Database Objects

### Tables to add:
- `ticket_tiers` -- Stores tier definitions per event (name, price, capacity, sort order)
- `orders` -- Stores ticket purchase records (user, event, tier, amount, SumUp checkout ID, status)

### Columns to add to `profiles`:
- `role` (user_role enum) -- Replaces `is_admin` boolean
- `status` (text: pending/approved/rejected) -- Approval state
- `referral_code` (text, unique) -- For referral links
- `referred_by` (uuid, FK to profiles) -- Who invited this member

### Columns to add to `event_media`:
- `uploaded_by` (uuid, FK to auth.users) -- Track who uploaded

### Storage buckets to create:
- `event-media` -- For photos and videos uploaded by members

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| SumUp API | MEDIUM | API structure from training data. Endpoint URLs, auth flow, and webhook format should be verified against official docs before implementation. |
| React Email | MEDIUM | Package is well-known and stable. Exact latest version should be verified via npm at install time. |
| Orbitron / next/font | HIGH | Built-in Next.js feature, well-documented, no version concerns. |
| Supabase Storage | HIGH | Already partially configured in the project. Standard usage patterns. |
| Role-based access (RLS) | HIGH | Standard PostgreSQL/Supabase patterns. Already using RLS in the schema. |
| Referral system (nanoid) | HIGH | Stable library, simple integration. |
| Approval flow | HIGH | Pure application logic, no new dependencies. |
| Email templates | MEDIUM | React Email is the right choice but version pinning should be verified. |

---

## Research Limitations

Web search and web fetch tools were unavailable during this research session. All recommendations are based on:
1. Codebase analysis (HIGH confidence -- direct observation)
2. Training data knowledge with May 2025 cutoff (MEDIUM confidence -- may be slightly outdated)

**Before implementation, verify:**
- SumUp Checkout API current endpoint paths and authentication flow at https://developer.sumup.com
- `@react-email/components` latest version via `npm info @react-email/components`
- `nanoid` latest version via `npm info nanoid`
- Supabase Storage image transformation availability on your plan

---

## Sources

- Codebase analysis: `/Users/etiesse/Resonate/package.json`, `supabase/schema.sql`, `next.config.ts`, `src/app/layout.tsx`
- SumUp Developer Documentation: https://developer.sumup.com (not fetched -- training data)
- React Email Documentation: https://react.email (not fetched -- training data)
- Next.js Font Optimization: https://nextjs.org/docs/app/building-your-application/optimizing/fonts (not fetched -- training data)
- Supabase Storage Documentation: https://supabase.com/docs/guides/storage (not fetched -- training data)
- nanoid: https://github.com/ai/nanoid (not fetched -- training data)

*Stack analysis: 2026-02-24*
