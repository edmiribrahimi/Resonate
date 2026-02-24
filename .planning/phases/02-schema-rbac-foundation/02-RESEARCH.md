# Phase 2: Schema & RBAC Foundation - Research

**Researched:** 2026-02-24
**Domain:** PostgreSQL schema migration, Supabase RLS policies, Next.js middleware role-based access control
**Confidence:** HIGH

## Summary

Phase 2 migrates the authorization model from a simple `is_admin` boolean to a three-tier role system (master, organizer, member) with approval status tracking (pending, approved, rejected). This is the foundational layer upon which every subsequent phase depends -- referrals, approvals, events, payments, and media all require knowing a user's role and status.

The implementation spans four technical areas: (1) PostgreSQL schema changes via Supabase SQL Editor (ALTER TABLE to add `role` and `status` columns, modify the `handle_new_user` trigger, update all RLS policies), (2) Next.js middleware enhancement to resolve user role/status and enforce route-level access, (3) navigation component changes to show/hide items based on role, and (4) the `/admin/members` page for the master user to manage roles.

**Primary recommendation:** Use CHECK constraints (not native PostgreSQL enums) for `role` and `status` columns, store roles in the `profiles` table (not JWT custom claims), use a `security definer` helper function for RLS performance, and pass role/status to Server Components via request headers set in middleware.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Master account identified by `MASTER_EMAIL` environment variable
- Master registers through normal signup flow -- system detects the email and auto-promotes to role=master, status=approved
- Single master only -- no ability to promote others to master
- No visual badge or label distinguishing the master from regular members
- Dedicated `/admin/members` page for the master user
- Member list shows detailed info: name, email, role, status, join date, referred by, event count
- Master can: promote member to organizer, demote organizer to member, deactivate (reject) members
- No email notification sent when roles change -- member discovers it on next login
- Only the master can assign/revoke the organizer role
- Pending members see events-only navigation -- all other nav items hidden
- Dashboard shows account status ("Your account is pending approval") but no persistent banner on other pages
- RSVP and ticket buttons do NOT render for pending/rejected members -- section simply absent, not grayed out
- Rejected members get the same read-only experience as pending (can browse events, nothing else)
- Organizers access their features via a separate `/organizer` section (not `/admin`)
- Organizers can see the full member list (same data as master minus role management controls)
- Organizers can see and edit ALL events (not limited to their own)
- Organizers cannot promote/demote anyone -- that's master-only
- Organizers can approve/reject pending members (from Phase 3 -- approval queue)
- The current `is_admin` boolean field must be replaced -- not extended with additional fields alongside it
- The existing QR scanner at `/admin/scanner` should remain accessible to both master and organizers
- Existing routes: `/admin/scanner` stays under `/admin` (master), organizers get `/organizer` as a new section
- Member list should be sortable/filterable -- but implementation details are Claude's call
- The `MASTER_EMAIL` approach means deployment requires setting this env var before the master registers

### Claude's Discretion
- Database migration approach (ALTER TABLE vs new table with migration script)
- RLS policy structure and naming conventions
- Middleware implementation pattern for role checking
- Admin page table styling and layout
- How to handle edge cases (e.g., master email changes, role conflicts)
- Whether to use Supabase database functions or application-level role checks

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROLE-01 | Profile schema migrated from `is_admin` boolean to `role` enum field with values: master, organizer, member | Schema migration section: ALTER TABLE with CHECK constraints, data migration from is_admin, trigger update |
| ROLE-02 | Profile schema includes `status` field with values: pending, approved, rejected | Schema migration section: ADD COLUMN with CHECK constraint, default 'pending' |
| ROLE-03 | All existing RLS policies updated to use role-based checks instead of `is_admin` | RLS policies section: security definer helper function, policy rewrite patterns, performance optimization |
| ROLE-04 | Middleware enforces route access based on role | Middleware section: role resolution via profile query, route protection matrix, header injection for Server Components |
| ROLE-05 | Master user can assign and revoke Organizer role for any member | Server Actions section: role mutation pattern, admin/members page, RLS policy for master-only writes |
| ROLE-06 | Each role sees only relevant navigation items and page actions | Navigation section: role-aware MobileNav, conditional rendering patterns, dashboard status display |
| ROLE-07 | Dedicated master admin account can be created during initial setup | Trigger section: MASTER_EMAIL env var detection in handle_new_user, auto-promote logic |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.97.0 | Database client, auth, RLS | Already installed; all schema and RLS changes use this |
| @supabase/ssr | ^0.8.0 | Server-side Supabase client with cookie management | Already installed; middleware and Server Components use this |
| next | 16.1.6 | App Router, middleware/proxy, Server Actions | Already installed; role enforcement via middleware |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | Phase 2 requires no new npm packages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CHECK constraints for role/status | Native PostgreSQL ENUM types | Enums are harder to modify in production (no DROP VALUE, requires ACCESS EXCLUSIVE lock); CHECK constraints use lighter locks and are easier to extend |
| Profile-based role checks | JWT custom claims (app_metadata) | JWT claims don't refresh until token expiry (up to 1 hour); profile queries are immediately consistent after role changes |
| Security definer helper function | Inline EXISTS subquery in each RLS policy | Helper function can be cached by Postgres optimizer per-statement; inline subqueries re-execute per row |

## Architecture Patterns

### Recommended Project Structure (changes for Phase 2)
```
src/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       ├── scanner/page.tsx     # existing -- accessible to master + organizer
│   │       └── members/page.tsx     # NEW -- master-only member management
│   ├── (organizer)/                 # NEW route group
│   │   └── organizer/
│   │       └── members/page.tsx     # NEW -- organizer read-only member view (Phase 3 adds more)
│   ├── (members)/
│   │   └── dashboard/page.tsx       # MODIFIED -- show status for pending members
│   ├── (public)/
│   │   └── events/                  # existing -- accessible to all
│   └── (auth)/
│       └── register/page.tsx        # existing -- no changes in Phase 2
├── components/
│   └── layout/
│       └── MobileNav.tsx            # MODIFIED -- role-aware navigation
├── lib/
│   ├── supabase/
│   │   └── middleware.ts            # MODIFIED -- role resolution + route protection
│   └── rbac/
│       └── roles.ts                 # NEW -- role constants, helper types, route map
├── types/
│   └── database.ts                  # MODIFIED -- add role, status to Profile type
└── middleware.ts                     # existing -- delegates to updateSession
```

### Pattern 1: Role Resolution in Middleware via Profile Query
**What:** Middleware fetches the user's profile (role + status) after session refresh, and injects the values as request headers so downstream Server Components can read them without additional DB queries.
**When to use:** Every authenticated request to protected routes.
**Example:**
```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (user) {
    // Fetch role and status from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single()

    const role = profile?.role || "member"
    const status = profile?.status || "pending"

    // Inject into request headers for Server Components
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-role", role)
    requestHeaders.set("x-user-status", status)
    requestHeaders.set("x-user-id", user.id)

    supabaseResponse = NextResponse.next({
      request: { headers: requestHeaders },
    })
    // Re-apply cookies
    // ... (cookie setAll logic)

    // Route protection
    if (pathname.startsWith("/admin") && role !== "master") {
      // Organizers can access /admin/scanner
      if (pathname.startsWith("/admin/scanner") && role === "organizer") {
        // Allow
      } else {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }

    if (pathname.startsWith("/organizer") && role !== "organizer" && role !== "master") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Pending/rejected members blocked from member-only actions
    const approvedOnlyRoutes = ["/membership-card", "/attendance"]
    if (approvedOnlyRoutes.some(r => pathname.startsWith(r)) && status !== "approved") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  } else {
    // Unauthenticated -- redirect from protected routes
    const protectedPrefixes = ["/dashboard", "/membership-card", "/attendance", "/admin", "/organizer"]
    if (protectedPrefixes.some(r => pathname.startsWith(r))) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
```
**Source:** Supabase SSR docs + Next.js middleware header injection pattern (nextjs.org/docs)

### Pattern 2: Reading Role in Server Components via Headers
**What:** Server Components read the `x-user-role` and `x-user-status` headers set by middleware, avoiding a second DB query.
**When to use:** Any Server Component that needs to render differently based on role.
**Example:**
```typescript
// In a Server Component
import { headers } from "next/headers"

export default async function DashboardPage() {
  const headersList = await headers()
  const role = headersList.get("x-user-role") || "member"
  const status = headersList.get("x-user-status") || "pending"

  if (status === "pending") {
    return <PendingMemberDashboard />
  }
  // ... render full dashboard
}
```

### Pattern 3: Server Actions for Role Mutations
**What:** Use Next.js Server Actions for all write operations (promote, demote, deactivate members). Server Actions provide built-in CSRF protection and work with the auth cookie context.
**When to use:** All role-changing operations on the admin/members page.
**Example:**
```typescript
// src/app/(admin)/admin/members/actions.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateMemberRole(memberId: string, newRole: "organizer" | "member") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify caller is master
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (callerProfile?.role !== "master") {
    throw new Error("Forbidden: only master can change roles")
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", memberId)

  if (error) throw error
  revalidatePath("/admin/members")
}
```

### Pattern 4: RLS as Defense in Depth
**What:** Every authorization rule exists as both a middleware/Server Action check AND a Supabase RLS policy. Middleware provides UX (redirects, error messages); RLS is the security boundary.
**When to use:** Every table, every operation. Even if middleware blocks unauthorized access, RLS prevents data leaks from direct API calls.

### Anti-Patterns to Avoid
- **Client-side role checks as security:** Never rely on hiding UI elements as the sole access control. Always enforce in RLS and server-side code. Client-side checks are for UX only.
- **Role in JWT custom claims only:** JWT claims don't refresh until token expiry (up to 1 hour). A user promoted by the master wouldn't see changes for up to an hour. Profile-based checks are immediately consistent.
- **Inline EXISTS subqueries in every RLS policy:** Repeated `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ...)` in every policy is verbose and less optimizable. Use a security definer helper function instead.
- **Using native PostgreSQL ENUMs for role/status:** Cannot remove values without dangerous workarounds. CHECK constraints are easier to modify in production.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role-based route protection | Custom auth wrapper per page | Middleware with route map + header injection | Centralized, runs before any page renders, single source of truth |
| RLS role checks | Inline subqueries in each policy | `security definer` helper function (`get_user_role()`) | Postgres optimizer caches function result per-statement; 100x+ perf improvement on large tables |
| Profile type checking | Manual string comparisons everywhere | TypeScript union types + role constants module | Compile-time safety, autocomplete, single source of truth |
| Admin data tables | Custom table from scratch | Tailwind-styled HTML table with sort/filter | No component library needed for a single table; Tailwind provides all needed styling |

**Key insight:** The hardest part of RBAC is not the code -- it is ensuring every access path is covered. The combination of middleware (route-level), RLS (data-level), and Server Actions (operation-level) creates defense in depth. Missing any one layer creates exploitable gaps.

## Common Pitfalls

### Pitfall 1: Cookie Handling Lost After Header Injection
**What goes wrong:** When creating a new `NextResponse.next({ request: { headers } })` in middleware, the cookies set by Supabase's `setAll` callback are lost because a new response object replaces the one that had cookies set.
**Why it happens:** The Supabase SSR middleware creates a response and sets cookies on it. If you then create a new response for header injection, the cookies aren't carried over.
**How to avoid:** After creating the new response with headers, re-apply all cookies from the Supabase cookie callback. The cleanest approach: track cookies in an array during `setAll`, then re-apply them to the final response.
**Warning signs:** Users get logged out on every navigation, or auth state is lost intermittently.

### Pitfall 2: RLS Policy Ordering and Overlap
**What goes wrong:** Multiple SELECT policies on the same table can create unexpected behavior -- RLS policies are OR'd together for the same operation type.
**Why it happens:** If you have both "users can view own profile" and "master can view all profiles", both policies apply. This is correct behavior, but developers sometimes create conflicting policies or forget that ALL matching policies are evaluated.
**How to avoid:** Name policies clearly with the pattern `[table]_[operation]_[who]` (e.g., `profiles_select_own`, `profiles_select_admin`). Document which policies exist for each table.
**Warning signs:** Users can see data they shouldn't, or can't see data they should.

### Pitfall 3: Forgetting to Drop `is_admin` Column and Old Policies
**What goes wrong:** Leaving the old `is_admin` column and old RLS policies creates confusion. Old code might still reference `is_admin`, and old policies might grant unintended access.
**Why it happens:** Developers focus on adding new role logic but forget to remove the old boolean and its policies.
**How to avoid:** Migration script must: (1) add new columns, (2) migrate data, (3) update trigger, (4) drop ALL old policies, (5) create ALL new policies, (6) drop `is_admin` column. Do it in one SQL script.
**Warning signs:** Build succeeds but old `is_admin` checks silently pass/fail.

### Pitfall 4: Master Email Detection Race Condition
**What goes wrong:** The `handle_new_user` trigger needs to check `MASTER_EMAIL` env var, but PostgreSQL functions don't have direct access to application environment variables.
**Why it happens:** Supabase triggers run in the PostgreSQL context, not the Next.js application context.
**How to avoid:** Two approaches: (A) Store the master email in a Supabase app settings table or vault, and have the trigger read from there. (B) Handle master promotion in the application layer -- after signup completes, a Server Action or API route checks the email and promotes to master. Approach B is simpler and recommended.
**Warning signs:** Master user registers but gets role=member because the trigger couldn't read the env var.

### Pitfall 5: Middleware Performance on Every Request
**What goes wrong:** Fetching the profile on every single request adds latency, especially for unauthenticated users or static assets.
**Why it happens:** The middleware matcher already excludes static assets, but the profile query still runs on every page navigation for authenticated users.
**How to avoid:** For this community size (100-1,000 members), the latency is negligible (single indexed query by PK). If needed later, cache role/status in a short-lived cookie (5 min TTL). Do NOT prematurely optimize -- the current approach is correct for the scale.
**Warning signs:** Noticeable page load delay after login. (Unlikely at this scale.)

### Pitfall 6: Next.js 16 Middleware Deprecation
**What goes wrong:** Next.js 16 has deprecated `middleware.ts` in favor of `proxy.ts`. While `middleware.ts` still works in 16.x, it is officially deprecated and will be removed in a future version.
**Why it happens:** Next.js 16 renamed the file convention to clarify the network boundary purpose.
**How to avoid:** For Phase 2, continue using `middleware.ts` since it still functions. Do NOT rename to `proxy.ts` mid-phase -- that would be scope creep. Note: if the project later upgrades or if deprecation warnings appear, the rename is a simple `mv middleware.ts proxy.ts` plus renaming the exported function from `middleware` to `proxy`.
**Warning signs:** Deprecation warnings in build output mentioning "middleware is deprecated, use proxy".

## Code Examples

### SQL Migration: Schema Changes
```sql
-- Phase 2: Schema & RBAC Foundation Migration
-- Run in Supabase SQL Editor as a single transaction

BEGIN;

-- Step 1: Add role and status columns with CHECK constraints
ALTER TABLE public.profiles
  ADD COLUMN role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('master', 'organizer', 'member')),
  ADD COLUMN status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected'));

-- Step 2: Migrate existing data
-- All existing users get role='member', status='approved' (they registered before gating)
-- is_admin=true users get role='organizer' (will be manually promoted to master if needed)
UPDATE public.profiles SET role = 'organizer' WHERE is_admin = true;

-- Step 3: Drop the is_admin column
ALTER TABLE public.profiles DROP COLUMN is_admin;

-- Step 4: Update handle_new_user trigger to set default status
-- New users default to role='member', status='approved' initially
-- (Phase 3 will change default status to 'pending' when referral system is added)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  new_code := 'RSN-';
  FOR i IN 1..8 LOOP
    new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  INSERT INTO public.profiles (id, email, full_name, membership_code, role, status)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_code,
    'member',
    'approved'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create security definer helper functions for RLS
-- These bypass RLS internally and are cached by Postgres optimizer

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_status()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT status FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT get_user_role()) = 'master';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_organizer()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  user_role := (SELECT get_user_role());
  RETURN user_role = 'master' OR user_role = 'organizer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 6: Drop ALL old RLS policies
DROP POLICY IF EXISTS "Public profiles are viewable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Published events are viewable by all" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
DROP POLICY IF EXISTS "Users can view own RSVPs" ON public.rsvps;
DROP POLICY IF EXISTS "Users can create own RSVPs" ON public.rsvps;
DROP POLICY IF EXISTS "Users can delete own RSVPs" ON public.rsvps;
DROP POLICY IF EXISTS "Admins can view all RSVPs" ON public.rsvps;
DROP POLICY IF EXISTS "Users can view own attendances" ON public.attendances;
DROP POLICY IF EXISTS "Admins can manage attendances" ON public.attendances;
DROP POLICY IF EXISTS "Event media viewable by all" ON public.event_media;
DROP POLICY IF EXISTS "Admins can manage media" ON public.event_media;
DROP POLICY IF EXISTS "Admins can view subscribers" ON public.newsletter_subscribers;

-- Step 7: Create new role-based RLS policies

-- PROFILES
-- Users can read their own profile
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Master and organizers can read all profiles
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT USING ((SELECT is_admin_or_organizer()));

-- Users can update their own profile (non-role fields)
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
  );

-- Master can update any profile (for role/status changes)
CREATE POLICY profiles_update_master ON public.profiles
  FOR UPDATE USING ((SELECT is_master()));

-- EVENTS
-- Published events viewable by all (including anonymous)
CREATE POLICY events_select_published ON public.events
  FOR SELECT USING (
    is_published = true
    AND (
      early_access_until IS NULL
      OR early_access_until <= now()
      OR auth.uid() IS NOT NULL
    )
  );

-- Organizers and master can manage all events
CREATE POLICY events_all_admin ON public.events
  FOR ALL USING ((SELECT is_admin_or_organizer()));

-- RSVPs
-- Users can view their own RSVPs
CREATE POLICY rsvps_select_own ON public.rsvps
  FOR SELECT USING (auth.uid() = user_id);

-- Approved members can create RSVPs
CREATE POLICY rsvps_insert_approved ON public.rsvps
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (SELECT get_user_status()) = 'approved'
  );

-- Users can delete their own RSVPs
CREATE POLICY rsvps_delete_own ON public.rsvps
  FOR DELETE USING (auth.uid() = user_id);

-- Admin/organizer can view all RSVPs
CREATE POLICY rsvps_select_admin ON public.rsvps
  FOR SELECT USING ((SELECT is_admin_or_organizer()));

-- ATTENDANCES
-- Users can view own attendances
CREATE POLICY attendances_select_own ON public.attendances
  FOR SELECT USING (auth.uid() = user_id);

-- Admin/organizer can manage all attendances
CREATE POLICY attendances_all_admin ON public.attendances
  FOR ALL USING ((SELECT is_admin_or_organizer()));

-- EVENT MEDIA
-- All authenticated users can view media
CREATE POLICY event_media_select_all ON public.event_media
  FOR SELECT USING (true);

-- Admin/organizer can manage media
CREATE POLICY event_media_all_admin ON public.event_media
  FOR ALL USING ((SELECT is_admin_or_organizer()));

-- NEWSLETTER SUBSCRIBERS
-- Admin/organizer can view subscribers
CREATE POLICY newsletter_select_admin ON public.newsletter_subscribers
  FOR SELECT USING ((SELECT is_admin_or_organizer()));

COMMIT;
```
**Source:** Supabase RLS docs (supabase.com/docs/guides/database/postgres/row-level-security), RLS performance guide (supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

### Master Email Detection (Application Layer)
```typescript
// src/app/api/auth/callback/route.ts (modified)
// After successful auth callback, check if user should be promoted to master
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check master email promotion
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email === process.env.MASTER_EMAIL) {
        await supabase
          .from("profiles")
          .update({ role: "master", status: "approved" })
          .eq("id", user.id)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
```

### Role-Aware Navigation
```typescript
// src/components/layout/MobileNav.tsx (concept)
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type UserRole = "master" | "organizer" | "member" | null
type UserStatus = "pending" | "approved" | "rejected" | null

interface MobileNavProps {
  role: UserRole
  status: UserStatus
}

const allNavItems = [
  { href: "/", label: "Home", icon: "home", minRole: null, requireApproved: false },
  { href: "/events", label: "Events", icon: "calendar", minRole: null, requireApproved: false },
  { href: "/gallery", label: "Gallery", icon: "image", minRole: null, requireApproved: false },
  { href: "/dashboard", label: "Members", icon: "user", minRole: "member" as const, requireApproved: false },
  { href: "/admin/members", label: "Admin", icon: "shield", minRole: "master" as const, requireApproved: true },
]

function getVisibleNavItems(role: UserRole, status: UserStatus) {
  // Pending/rejected: events-only navigation
  if (status === "pending" || status === "rejected") {
    return allNavItems.filter(item => !item.minRole || item.href === "/dashboard")
  }
  // Filter by role
  return allNavItems.filter(item => {
    if (!item.minRole) return true
    if (item.minRole === "master") return role === "master"
    if (item.minRole === "organizer") return role === "organizer" || role === "master"
    return true
  })
}
```

### TypeScript Types Update
```typescript
// src/types/database.ts (updated Profile interface)
export type UserRole = "master" | "organizer" | "member"
export type UserStatus = "pending" | "approved" | "rejected"

export interface Profile {
  id: string
  email: string
  full_name: string
  membership_code: string
  role: UserRole
  status: UserStatus
  created_at: string
  updated_at: string
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` file convention | `proxy.ts` file convention | Next.js 16 (2025) | Deprecated but still works; rename when convenient |
| `is_admin` boolean | Role enum column with CHECK constraint | This phase | All RLS policies must be rewritten |
| Inline RLS subqueries | Security definer helper functions | Supabase best practice (2024+) | 100x+ performance improvement on large tables |
| JWT custom claims for roles | Profile-based role checks | Supabase community consensus (2024+) | Immediate consistency when roles change |

**Deprecated/outdated:**
- `middleware.ts`: Renamed to `proxy.ts` in Next.js 16. Still functional but deprecated. Do not rename during Phase 2.
- `is_admin` boolean: Being replaced by `role` CHECK constraint in this phase.
- `next lint` command: Removed in Next.js 16. Use `eslint` directly. (Already the case in package.json scripts.)

## Open Questions

1. **Master email detection timing**
   - What we know: The `handle_new_user` trigger runs in PostgreSQL context and cannot read Next.js env vars directly.
   - What's unclear: Whether to use Supabase Vault, a settings table, or the application-layer approach (post-signup check).
   - Recommendation: Use application-layer approach. After auth callback or on first login, check if user.email matches `MASTER_EMAIL` env var and promote. Simpler, no additional infrastructure.

2. **Existing `is_admin=true` users during migration**
   - What we know: There may be users with `is_admin=true` in the production database.
   - What's unclear: Whether these should become `master` or `organizer`.
   - Recommendation: Map `is_admin=true` to `role='organizer'` during migration. The actual master should be re-registered or manually promoted to `role='master'` via SQL after migration. This is a one-time operation.

3. **Profile query caching in middleware**
   - What we know: Fetching profile on every request adds one DB query per navigation.
   - What's unclear: Whether this adds noticeable latency.
   - Recommendation: Do not cache in Phase 2. The community is small (100-1,000 members), the query is indexed by PK, and Supabase connection pooling handles this efficiently. Add cookie-based caching later if needed.

4. **Scanner access for organizers**
   - What we know: Scanner is at `/admin/scanner`. Organizers should access it but the `/admin` prefix implies master-only.
   - What's unclear: Whether to move it or add an exception.
   - Recommendation: Add a middleware exception for `/admin/scanner` that allows organizer access. This is simpler than moving the page and potentially breaking bookmarks.

## Sources

### Primary (HIGH confidence)
- Supabase Row Level Security docs: https://supabase.com/docs/guides/database/postgres/row-level-security -- RLS policy syntax, USING vs WITH CHECK
- Supabase RLS Performance and Best Practices: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv -- security definer functions, function wrapping optimization, indexing
- Supabase Enums docs: https://supabase.com/docs/guides/database/postgres/enums -- CREATE TYPE, ALTER TYPE limitations
- Supabase Custom Claims and RBAC: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac -- JWT claims approach (evaluated and rejected in favor of profile-based)
- Next.js 16 Upgrade Guide: https://nextjs.org/docs/app/guides/upgrading/version-16 -- middleware to proxy rename, backward compatibility
- Next.js Proxy (middleware) docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy -- header injection, NextResponse.next with request headers
- Existing codebase: Direct file reads of `supabase/schema.sql`, `src/middleware.ts`, `src/lib/supabase/middleware.ts`, `src/types/database.ts`, `src/components/layout/MobileNav.tsx`

### Secondary (MEDIUM confidence)
- PostgreSQL enum vs CHECK constraint comparison: https://making.close.com/posts/native-enums-or-check-constraints-in-postgresql/ -- production locking behavior, modification ease
- Crunchy Data enums vs check constraints: https://www.crunchydata.com/blog/enums-vs-check-constraints-in-postgres -- storage and performance comparison

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new packages needed, all patterns verified against official Supabase and Next.js docs
- Architecture: HIGH -- middleware header injection pattern is documented in Next.js 16 proxy docs; RLS helper function pattern is in Supabase troubleshooting guide
- Pitfalls: HIGH -- cookie handling, RLS ordering, and env var access issues are well-documented in community discussions and official docs
- Schema migration: HIGH -- ALTER TABLE with CHECK constraints is standard PostgreSQL; security definer functions are official Supabase recommendation

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days -- stable technologies, unlikely to change)
