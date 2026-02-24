# External Integrations

**Analysis Date:** 2026-02-24

## APIs & External Services

**Email Services:**
- Resend - Manages newsletter subscriptions
  - SDK/Client: `resend` 6.9.2
  - Auth: `RESEND_API_KEY` environment variable
  - Usage: `/src/app/api/newsletter/route.ts`
  - Features: Contact creation, audience management
  - Integration point: `audienceId` stored in environment (currently missing from example config)

## Data Storage

**Primary Database:**
- Supabase PostgreSQL
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`
  - Client: `@supabase/supabase-js` 2.97.0
  - Server utilities: `@supabase/ssr` 0.8.0
  - Schema: `/supabase/schema.sql`
  - Tables: `profiles`, `events`, `rsvps`, `attendances`, `event_media`, `newsletter_subscribers`
  - Row-Level Security (RLS) policies enforce user access control

**File Storage:**
- Supabase Storage
  - Stores event media (photos and videos)
  - Accessible via `event_media` table references
  - Images served through Supabase CDN (`*.supabase.co` domain)
  - Configured in Next.js image optimization: `next.config.ts`

**Caching:**
- None configured at application level
- Supabase handles connection pooling and query caching

## Authentication & Identity

**Auth Provider:**
- Supabase Authentication (built-in Auth service)
  - Implementation: OAuth and email/password flows
  - Server-side client: `@supabase/ssr` via `/src/lib/supabase/server.ts`
  - Browser client: `@supabase/ssr` via `/src/lib/supabase/client.ts`
  - Middleware auth: `/src/lib/supabase/middleware.ts`
  - Cookie management for session persistence
  - Auth callback route: `/src/app/api/auth/callback/route.ts` (exchanges code for session)

**Session Management:**
- Cookie-based sessions via Supabase SSR utilities
- Middleware enforces authentication for protected routes:
  - Member routes (`/dashboard`, `/membership-card`, `/presenze`) - requires user login
  - Admin routes (`/admin`) - requires user login and admin status
- Session refresh handled automatically by Supabase middleware
- User retrieval via `supabase.auth.getUser()`

**User Profiles:**
- Custom `profiles` table extends Supabase Auth
  - Stores: `email`, `full_name`, `membership_code`, `is_admin`
  - Auto-created via trigger on auth signup
  - Membership codes: Generated randomly (format: `RSN-XXXXXXXX`)
  - Access control: Users can only view/update own profile (RLS policy)

## Monitoring & Observability

**Error Tracking:**
- Not detected in codebase
- Basic error handling returns NextResponse with status codes and error messages

**Logs:**
- Console logging only
- No centralized logging service configured
- Application relies on Node.js/Next.js default logging to stdout

**Performance:**
- PWA support with Workbox (via `@ducanh2912/next-pwa`)
- Image optimization via Next.js built-in support
- No analytics or performance monitoring detected

## CI/CD & Deployment

**Hosting:**
- Not determined from codebase - likely Vercel (Next.js native support) or self-hosted Node.js
- Environment variables must be configured on hosting platform

**CI Pipeline:**
- Not detected - no GitHub Actions, GitLab CI, or similar workflows found

**Build Process:**
- `npm run build` → Next.js compilation
- `npm run dev` → Development server with hot reload
- `npm start` → Production server

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public, exposed to client)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public, safe for browser)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role (server-side only, DO NOT expose)
- `RESEND_API_KEY` - Resend email service API key
- `NEXT_PUBLIC_APP_URL` - App base URL for redirects (e.g., `http://localhost:3000`)
- `RESEND_AUDIENCE_ID` - Resend audience ID for newsletter (referenced in code but not in example)

**Secrets location:**
- `.env.local` (Git-ignored, not committed)
- Template: `.env.local.example` shows configuration structure

**Missing from example:**
- `RESEND_AUDIENCE_ID` is used in newsletter endpoint but not documented in `.env.local.example`

## Webhooks & Callbacks

**Incoming:**
- Auth callback: `/src/app/api/auth/callback/route.ts`
  - Receives `code` and `next` query parameters from Supabase OAuth callback
  - Exchanges auth code for session via `supabase.auth.exchangeCodeForSession(code)`
  - Redirects to dashboard or login on failure

**Outgoing:**
- None detected - application does not send webhooks to external services
- Newsletter subscriptions are push-based (client sends email, app adds to Resend)

## Data Flow

**Authentication:**
1. User initiates login → Supabase Auth UI or OAuth redirect
2. Supabase redirects to `/api/auth/callback?code=...`
3. Backend exchanges code for session
4. Session stored in cookies via SSR utilities
5. Subsequent requests include session in headers

**Newsletter Signup:**
1. User submits email on `/newsletter` page
2. POST to `/api/newsletter` with JSON payload
3. Backend creates Resend contact via `resend.contacts.create()`
4. Contact added to configured `RESEND_AUDIENCE_ID` audience
5. Success/error response returned to client

**Membership Verification:**
1. QR code scanned on `/admin/scanner` page
2. Verification request to `/api/membership/verify?code=...`
3. Backend queries `profiles` table for membership code
4. Returns member details if valid, error if not found

**Event Access:**
1. Published events visible to all users (RLS policy: `is_published = true`)
2. Early access events visible to authenticated users until deadline (if `early_access_until > now()`)
3. Admin events only visible to users with `is_admin = true`

---

*Integration audit: 2026-02-24*
