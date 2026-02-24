# Codebase Structure

**Analysis Date:** 2026-02-24

## Directory Layout

```
Resonate/
├── src/                           # Source code root
│   ├── app/                       # Next.js App Router - all pages and API routes
│   │   ├── (public)/              # Public/unauthenticated routes
│   │   │   ├── eventi/            # Event listing and detail pages
│   │   │   ├── galleria/          # Gallery/media page
│   │   │   └── newsletter/        # Newsletter signup page
│   │   ├── (auth)/                # Authentication routes
│   │   │   ├── login/             # Login form page
│   │   │   └── registrati/        # Registration page
│   │   ├── (members)/             # Member-only routes (protected by middleware)
│   │   │   ├── dashboard/         # Member dashboard
│   │   │   ├── membership-card/   # QR code membership card
│   │   │   └── presenze/          # Attendance history
│   │   ├── (admin)/               # Admin-only routes (protected by middleware)
│   │   │   └── admin/
│   │   │       ├── scanner/       # QR code scanner for check-in
│   │   │       ├── eventi/        # Event management
│   │   │       └── membri/        # Member management
│   │   ├── api/                   # Server API routes
│   │   │   ├── auth/
│   │   │   │   └── callback/      # OAuth/magic link callback
│   │   │   ├── newsletter/        # Newsletter subscription endpoint
│   │   │   ├── membership/        # Membership operations
│   │   │   │   └── verify/        # QR code verification
│   │   │   ├── events/            # Event CRUD endpoints
│   │   │   └── rsvp/              # Event RSVP endpoints
│   │   ├── layout.tsx             # Root layout (metadata, viewport, HTML structure)
│   │   ├── page.tsx               # Home page
│   │   ├── globals.css            # Global styles + Tailwind imports
│   ├── components/                # Reusable React components
│   │   ├── layout/                # Layout components used across pages
│   │   │   └── MobileNav.tsx      # Bottom navigation bar (client)
│   │   ├── events/                # Event-related components
│   │   ├── membership/            # Membership-related components
│   │   │   └── MembershipCardView.tsx  # Membership card display + QR (client)
│   │   └── ui/                    # Basic UI components
│   ├── lib/                       # Libraries and utilities
│   │   └── supabase/              # Supabase client configuration
│   │       ├── server.ts          # Server-side Supabase client factory
│   │       ├── client.ts          # Browser-side Supabase client factory
│   │       └── middleware.ts      # Session management for middleware
│   ├── utils/                     # Standalone utility functions
│   │   └── qr.ts                  # QR code generation utilities
│   ├── types/                     # TypeScript type definitions
│   │   └── database.ts            # Supabase database schema types
│   └── middleware.ts              # Next.js middleware entry point
├── public/                        # Static assets
│   ├── manifest.json              # PWA manifest
│   ├── icons/                     # App icons for PWA
│   └── *.svg                      # Miscellaneous SVG graphics
├── supabase/                      # Supabase configuration
│   └── .temp/                     # Temporary Supabase files (generated)
├── .planning/                     # Planning documentation (generated)
│   └── codebase/                  # Architecture documentation
├── .next/                         # Next.js build output (generated)
├── node_modules/                  # Dependencies (generated)
├── package.json                   # Node dependencies and scripts
├── package-lock.json              # Locked dependency versions
├── tsconfig.json                  # TypeScript configuration
├── next.config.ts                 # Next.js configuration (PWA setup)
├── eslint.config.mjs              # ESLint configuration
├── postcss.config.mjs             # PostCSS configuration (Tailwind)
├── .env.local                     # Environment variables (not committed)
├── .env.local.example             # Example environment template
├── .gitignore                     # Git ignore rules
└── README.md                      # Project documentation
```

## Directory Purposes

**src/:**
- Purpose: All application source code
- Contains: Pages, components, libraries, utilities, types, middleware
- Key files: middleware.ts (entry point for server-side auth)

**src/app/:**
- Purpose: Next.js App Router file-based routing - defines URL structure
- Contains: Page components, API routes, layout components
- Key files: `page.tsx` (routes to /), `layout.tsx` (root layout)

**src/app/(public)/:**
- Purpose: Public routes accessible without authentication
- Contains: Event listing, event details, gallery, newsletter signup
- Access: Anyone

**src/app/(auth)/:**
- Purpose: Authentication routes
- Contains: Login and registration forms
- Access: Anyone (these pages allow login/signup)

**src/app/(members)/:**
- Purpose: Authenticated member-only routes
- Contains: Dashboard, membership card display, attendance history
- Access: Authenticated users only (protected by middleware)

**src/app/(admin)/:**
- Purpose: Admin-only routes
- Contains: QR scanner, event management, member management
- Access: Authenticated admin users only (protected by middleware)

**src/app/api/:**
- Purpose: Server-side API endpoints
- Contains: Route handlers for external integrations
- Key routes: `/api/auth/callback` (OAuth), `/api/newsletter` (Resend), `/api/membership/verify` (QR verification)

**src/components/:**
- Purpose: Reusable React components
- Contains: Layout, events, membership, ui component files
- Pattern: Each component is a `.tsx` file with default export

**src/components/layout/:**
- Purpose: Layout components used across multiple pages
- Contains: MobileNav (persistent bottom navigation)
- Usage: Imported into pages that need the navigation

**src/components/membership/:**
- Purpose: Membership-specific components
- Contains: MembershipCardView (displays user card with QR code)
- Usage: Imported into membership-card page

**src/lib/supabase/:**
- Purpose: Supabase client configuration and session management
- Contains: Server client factory, browser client factory, middleware session logic
- Pattern: Separate factories for server vs. browser contexts due to cookie handling differences

**src/utils/:**
- Purpose: Standalone utility functions
- Contains: QR code generation utilities
- Usage: Imported by components and pages as needed

**src/types/:**
- Purpose: TypeScript type definitions for type safety
- Contains: Database schema interfaces matching Supabase tables
- Usage: Imported throughout app for type checking

## Key File Locations

**Entry Points:**
- `src/middleware.ts`: Runs on every request, handles session and route protection
- `src/app/layout.tsx`: Root layout applied to all pages, sets metadata and viewport
- `src/app/page.tsx`: Home page route

**Configuration:**
- `next.config.ts`: Next.js config with PWA setup
- `tsconfig.json`: TypeScript compiler options with path alias `@/*` → `src/*`
- `eslint.config.mjs`: ESLint rules
- `postcss.config.mjs`: PostCSS (for Tailwind CSS)
- `.env.local`: Environment variables (not in git)

**Core Logic:**
- `src/lib/supabase/server.ts`: Server-side database access
- `src/lib/supabase/client.ts`: Browser-side database access
- `src/lib/supabase/middleware.ts`: Session refresh and route protection
- `src/utils/qr.ts`: QR code generation and membership code utilities
- `src/types/database.ts`: TypeScript types for all Supabase tables

**Testing:**
- No test files present in codebase

## Naming Conventions

**Files:**
- React Components: PascalCase with `.tsx` extension (e.g., `MobileNav.tsx`, `MembershipCardView.tsx`)
- Pages: lowercase with `.tsx` extension (e.g., `page.tsx`, `layout.tsx`)
- API Routes: lowercase with `.ts` extension (e.g., `route.ts`)
- Utilities: camelCase with `.ts` extension (e.g., `qr.ts`)
- Types: singular PascalCase in files (e.g., `database.ts` contains Profile, Event interfaces)
- Config: specific names (e.g., `next.config.ts`, `tsconfig.json`)

**Directories:**
- Route groups: lowercase in parentheses (e.g., `(public)`, `(members)`, `(admin)`)
- Feature directories: lowercase plural (e.g., `components`, `events`, `membership`, `utils`, `types`)
- Dynamic routes: brackets with parameter name (e.g., `[slug]` for `src/app/(public)/eventi/[slug]/page.tsx`)

**Functions:**
- Utility functions: camelCase (e.g., `generateMembershipQR()`, `createClient()`)
- Component export: `default export` (e.g., `export default function LoginPage()`)
- Factory functions: `createX` pattern (e.g., `createClient()`)

**Variables:**
- State variables: camelCase (e.g., `email`, `loading`, `membershipCode`)
- Constants: UPPER_SNAKE_CASE only for truly immutable configs (not used in this codebase)
- Type names: PascalCase (e.g., `Profile`, `Event`, `MembershipCardViewProps`)

**Types:**
- Database types: PascalCase interface matching table name (e.g., `Profile`, `Event`)
- Component props: `[ComponentName]Props` (e.g., `MembershipCardViewProps`)

## Where to Add New Code

**New Public Page:**
- Location: `src/app/(public)/[feature]/page.tsx`
- Structure: Server or client component with Tailwind styling
- Import MobileNav if bottom nav needed
- Example: Event detail page at `src/app/(public)/eventi/[slug]/page.tsx`

**New Member-Only Page:**
- Location: `src/app/(members)/[feature]/page.tsx`
- Structure: Server-side page with `createClient()` to get authenticated user
- Redirect to login if user not authenticated: `if (!user) redirect("/login")`
- Import MobileNav for navigation
- Example: Dashboard at `src/app/(members)/dashboard/page.tsx`

**New API Endpoint:**
- Location: `src/app/api/[feature]/[operation]/route.ts`
- Structure: `export async function GET/POST/PUT/DELETE(request)`
- Return NextResponse with JSON payload and status codes
- Import server Supabase client: `const supabase = await createClient()`
- Example: Verify endpoint at `src/app/api/membership/verify/route.ts`

**New Reusable Component:**
- Location: `src/components/[feature]/[ComponentName].tsx`
- Structure: PascalCase file name matching component export
- Export default: `export default function ComponentName(props)`
- Client component: Add `"use client"` at top if using hooks
- Server component: Default if only rendering static content
- Example: `src/components/membership/MembershipCardView.tsx`

**New Utility Function:**
- Location: `src/utils/[feature].ts`
- Structure: Named exports or default export
- Example: QR utils at `src/utils/qr.ts` with `generateMembershipQR()` and `generateMembershipCode()`

**New Type Definition:**
- Location: `src/types/[domain].ts`
- Structure: Interfaces matching Supabase table schemas
- Example: Database types at `src/types/database.ts`

## Special Directories

**public/:**
- Purpose: Static assets served directly by Next.js
- Generated: No (manually created)
- Committed: Yes
- Contents: manifest.json (PWA), icons/ directory, SVG graphics

**public/icons/:**
- Purpose: App icons for PWA installation
- Generated: No
- Committed: Yes
- Contents: icon-192x192.png and other size variants (expected)

**supabase/.temp/:**
- Purpose: Temporary Supabase configuration during development
- Generated: Yes (by Supabase CLI)
- Committed: No (in .gitignore)
- Contents: Temporary files created during `supabase start`

**.next/:**
- Purpose: Next.js build artifacts and runtime cache
- Generated: Yes (by next build and next dev)
- Committed: No (in .gitignore)
- Contents: Compiled pages, chunks, sourcemaps, types

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes (by npm install)
- Committed: No (in .gitignore)
- Contents: All packages from package.json and their transitive deps

---

*Structure analysis: 2026-02-24*
