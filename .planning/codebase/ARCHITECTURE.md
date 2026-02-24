# Architecture

**Analysis Date:** 2026-02-24

## Pattern Overview

**Overall:** Next.js 16 App Router with Server-Side Rendering (SSR) and Client Components

**Key Characteristics:**
- Route-based architecture using Next.js 13+ App Router (file-based routing)
- Hybrid server/client component model for optimal performance
- Middleware-based authentication and session management
- Database-first design with Supabase as primary data source
- Progressive Web App (PWA) enabled for mobile-first experience
- Tailwind CSS v4 with custom design tokens for consistent styling

## Layers

**Presentation Layer:**
- Purpose: User interface components and page layouts
- Location: `src/app/` (pages), `src/components/`
- Contains: Page components (`.tsx` files in `src/app/`), UI components, layout wrappers
- Depends on: Server/Client libraries, utilities, types
- Used by: Browser client

**Route Layer:**
- Purpose: Organize pages and API endpoints using file-based routing
- Location: `src/app/` with directory groups `(public)`, `(auth)`, `(members)`, `(admin)`
- Contains: Route segments using Next.js App Router conventions
- Depends on: Supabase client/server, middleware, utilities
- Used by: Next.js router to handle HTTP requests

**API Layer:**
- Purpose: Server-side API routes for external integrations and backend logic
- Location: `src/app/api/`
- Contains: Route handlers (RPC-style endpoints) for auth callback, newsletter, membership verification
- Depends on: Supabase server client, Resend SDK, external services
- Used by: Client-side fetch calls and external webhooks

**Authentication Layer:**
- Purpose: Session management and route protection
- Location: `src/middleware.ts`, `src/lib/supabase/middleware.ts`
- Contains: Next.js middleware for route guards, session initialization
- Depends on: Supabase Auth, cookies, NextRequest/NextResponse
- Used by: All protected routes

**Data Access Layer:**
- Purpose: Database communication and caching
- Location: `src/lib/supabase/`
- Contains: Server client (`server.ts`) and browser client (`client.ts`) factories
- Depends on: Supabase JS SDK (@supabase/supabase-js, @supabase/ssr)
- Used by: Pages, API routes, components

**Utilities Layer:**
- Purpose: Shared utility functions and helpers
- Location: `src/utils/`
- Contains: QR code generation, membership utilities
- Depends on: External libraries (qrcode, html5-qrcode)
- Used by: Components and pages

**Type Layer:**
- Purpose: TypeScript type definitions for database schema
- Location: `src/types/`
- Contains: Database interfaces (Profile, Event, RSVP, Attendance, EventMedia, NewsletterSubscriber)
- Depends on: None (foundational)
- Used by: All layers for type safety

## Data Flow

**Authentication Flow:**

1. User navigates to `/login` (public page)
2. User enters credentials in login form (client-side state in `(auth)/login/page.tsx`)
3. Form submission calls `supabase.auth.signInWithPassword()` via browser client
4. On success, client redirects to `/dashboard`
5. Middleware intercepts request, calls `updateSession()` to refresh auth state
6. Middleware updates session cookies and allows request to proceed
7. Server-side `dashboard/page.tsx` calls `createClient()` from server context
8. Server retrieves authenticated user with `supabase.auth.getUser()`
9. User metadata rendered in dashboard greeting

**Membership Card Flow:**

1. Authenticated user navigates to `/membership-card`
2. Server-side page fetches user from Supabase auth (TODO: fetch membership_code from profiles table)
3. Page passes membership code to `<MembershipCardView>` client component
4. Component effect calls `generateMembershipQR()` utility function
5. QR code generated client-side using qrcode library with verification URL
6. QR code rendered as image in membership card display

**QR Scanner Flow:**

1. Admin navigates to `/admin/scanner`
2. Client component dynamically imports `html5-qrcode` library
3. Scanner initializes video stream access from device camera
4. On QR code detection, decoded text sent to `/api/membership/verify?code=...`
5. API route queries Supabase profiles table for matching membership_code
6. API returns member name and code validity
7. Scanner displays success/error feedback to admin
8. Admin can reset and scan next member

**Event Display Flow:**

1. User navigates to `/eventi` (public page)
2. Page loads (TODO: fetch from Supabase, currently using mock data)
3. Events filtered into upcoming and past sections
4. Links to event detail pages (`/eventi/[slug]`)
5. Server renders static event listings with dynamic title/dates

**Newsletter Subscription Flow:**

1. User submits email on `/newsletter` page
2. POST to `/api/newsletter` with email in JSON body
3. API route initializes Resend client with `RESEND_API_KEY`
4. Resend SDK adds contact to audience using `RESEND_AUDIENCE_ID`
5. Response returns success or error to client
6. Client displays feedback to user

**State Management:**

- **Authentication:** Supabase Auth (JWT in cookies managed by middleware)
- **Session:** Server-side via next/cookies (refreshed by middleware)
- **User Metadata:** Stored in Supabase auth user object
- **UI State:** Client-side React hooks (useState, useRef) in client components
- **Navigation State:** usePathname() hook in MobileNav for active route highlighting

## Key Abstractions

**Supabase Client Factories:**
- Purpose: Provide correctly-configured database clients for server and browser contexts
- Examples: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`
- Pattern: Factory functions that handle cookie management and configuration separately for each context

**Database Types:**
- Purpose: Enforce type safety across all database operations
- Examples: `src/types/database.ts` (Profile, Event, RSVP, Attendance, EventMedia, NewsletterSubscriber)
- Pattern: TypeScript interfaces matching Supabase table schemas

**Route Groups:**
- Purpose: Organize routes by access level without affecting URL structure
- Examples: `(public)`, `(auth)`, `(members)`, `(admin)`
- Pattern: Directories in parentheses create logical groupings visible in middleware

**Mobile Navigation:**
- Purpose: Persistent bottom navigation accessible across all pages
- Examples: `src/components/layout/MobileNav.tsx`
- Pattern: Client component with usePathname() for active state detection

**Membership Card Component:**
- Purpose: Reusable membership display with QR code generation
- Examples: `src/components/membership/MembershipCardView.tsx`
- Pattern: Client component with useEffect for async QR generation

## Entry Points

**App Entry:**
- Location: `src/app/page.tsx`
- Triggers: User navigates to root `/`
- Responsibilities: Home page with navigation to events and registration

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Applied to all routes
- Responsibilities: Metadata setup (PWA manifest, apple-web-app), viewport configuration, HTML structure, global styles

**Middleware:**
- Location: `src/middleware.ts`
- Triggers: Every request matching matcher pattern
- Responsibilities: Session refresh via `updateSession()`, route protection for member/admin routes, redirect to login if unauthorized

**Auth Callback:**
- Location: `src/app/api/auth/callback/route.ts`
- Triggers: OAuth/magic link redirects from Supabase
- Responsibilities: Exchange auth code for session, persist cookies, redirect to dashboard or error page

**Admin Scanner:**
- Location: `src/app/(admin)/admin/scanner/page.tsx`
- Triggers: Admin navigates to `/admin/scanner`
- Responsibilities: Initialize QR scanner, verify membership codes, display check-in feedback

## Error Handling

**Strategy:** Try-catch blocks in async operations with fallback states

**Patterns:**
- API routes return NextResponse with status codes and error messages (400 for missing params, 500 for server errors)
- Client components use state for error display (login page shows "Email o password non corretti")
- Supabase client operations wrapped in try-catch, errors handled silently or displayed to user
- QR scanner catches errors during initialization but continues scanning
- Missing env vars checked at runtime and return friendly error messages

## Cross-Cutting Concerns

**Logging:** Not implemented - uses browser console.log and server-side logging via Next.js

**Validation:**
- Required fields checked in forms (HTML5 required attribute)
- API routes validate presence of required query parameters (code, email)
- TypeScript provides compile-time type validation

**Authentication:**
- Middleware protects `/dashboard`, `/membership-card`, `/presenze` routes
- Middleware protects `/admin` routes
- Unauthorized redirects to `/login` with redirect parameter for post-auth navigation
- Session managed via Supabase Auth JWT + cookie refresh cycle

**PWA Configuration:**
- Manifest: `public/manifest.json`
- Icons: `public/icons/` directory
- Service worker registered via next-pwa configuration
- Safe area insets in global CSS for notched devices

---

*Architecture analysis: 2026-02-24*
