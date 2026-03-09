# Phase 20: Navigation Consolidation - Research

**Researched:** 2026-03-09
**Domain:** UI Navigation Architecture / React Server Components / RBAC
**Confidence:** HIGH

## Summary

Phase 20 is a pure UI refactoring phase with zero new dependencies, zero database changes, and zero new API endpoints. The current navigation system uses three separate components (MobileNav, AdminNav, OrganizerNav) with a popover-based staff menu pattern in MobileNav that hides the Scanner behind a two-tap interaction. The goal is to simplify to a 3-tab bottom nav for members (Events, Gallery, Account) and 4-tab for staff (Events, Gallery, Check-in, Account), replacing the current popover with a direct Check-in tab.

The largest structural change is transforming the current `/dashboard` page from a monolithic mixed-content page (header, membership info, quick actions, tickets, drinks, media, settings) into a role-aware Account page with clear "My Stuff" and "Management" sections. The current dashboard fetches tickets, drink tokens, and media all inline -- this content maps naturally to "My Stuff." The new "Management" section (organizer/master only) will show quick-stats cards and expandable management links, replacing the need for the popover in MobileNav.

The secondary navigation (AdminNav/OrganizerNav) needs unification into a single `StaffNav` component. Currently AdminNav has 5-6 tabs (Events, Members, Artists, Venues, Newsletter, Finance) while OrganizerNav has 4 (Events, Members, Artists, Venues). These are nearly identical with AdminNav having Newsletter and master-only Finance. A unified StaffNav accepting a `role` prop solves this cleanly.

**Primary recommendation:** Refactor in three stages: (1) create StaffNav and update all admin/organizer pages, (2) restructure MobileNav to 3-4 tabs by removing Home and staff popovers, (3) rebuild Dashboard into role-aware Account page with "My Stuff" / "Management" sections.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | Bottom nav shows 3 tabs for members (Events, Gallery, Account) and 4 tabs for staff (Events, Gallery, Check-in, Account) | Refactor `getVisibleNavItems()` in roles.ts + update NAV_ITEMS array. Remove Home item for authenticated users (already hidden), remove Admin/Organizer items, add Check-in item for staff roles. MobileNav currently rendered in 33 pages -- all will reflect changes automatically via the shared component. |
| NAV-02 | Account page shows role-aware sections: "My Stuff" for all, "Management" for organizer/master | Restructure existing `/dashboard` page. "My Stuff" = existing tickets + drink tokens + media + settings. "Management" = new section with links to /admin/* or /organizer/* routes + quick-stats cards. Role already available via `x-user-role` header. |
| NAV-03 | Check-in tab is always one tap away for organizer/master roles | Currently Scanner requires 2 taps (staff icon popover -> Scanner link). New MobileNav adds Check-in as a direct tab for staff roles. Scanner page already at `/admin/scanner` with middleware allowing both master and organizer. |
| NAV-04 | Check-in page shows unified attendee list for the event (ticket holders + guest list) with name search and QR scan | Current ScannerClient.tsx has QR scanner + collapsible attendance. Needs enhancement: add a name search input that queries `/api/tickets/attendance` (or new endpoint) with search param, show flat attendee list (not just recent check-ins), and manual check-in by name. Guest list integration is future (Phase 24) -- for now, attendee list = ticket holders. |
| NAV-05 | Account page "Management" section shows quick-stats cards (pending members, next event, total revenue) | New data fetching in Account page. Pending members count: `profiles.count().eq('status', 'pending')`. Next event: `events.select().gte('date', today).order('date').limit(1)`. Total revenue: `tickets.select('amount_paid').sum()` or aggregate query. All queries use existing tables. |
| NAV-06 | Account page management section has animated expand/collapse | Phase 21 introduces Motion library. For now, use CSS-only height transition with `overflow-hidden` + `max-height` pattern, or a simple `useState` toggle with Tailwind `transition-all`. Keep it simple; Phase 21 can enhance with Motion. |
| NAV-07 | Clear visual separation between "My Stuff" and "Management" sections | Use existing design tokens: section headers with `text-sm font-semibold uppercase tracking-widest text-muted` (pattern already used in Dashboard for "My Tickets", "Settings"). Add a `border-t border-card-border` divider or a distinct background (`bg-accent/5`) for the Management section. |
| NAV-08 | Unified StaffNav component used consistently across admin and organizer routes | Merge AdminNav and OrganizerNav into a single `StaffNav` component. Accept `role` prop. Show Newsletter tab only for admin routes, Finance tab only for master. Currently AdminNav is used in 5 admin pages, OrganizerNav in 3 organizer pages. Unified component handles both with a `variant` or `context` prop. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Components, middleware | Already in use -- no changes |
| React | 19.2.3 | UI rendering | Already in use -- no changes |
| Tailwind CSS | v4 | Styling with design tokens | Already in use -- no changes |
| Supabase | current | Data fetching, auth, RBAC | Already in use -- no changes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | Phase 20 requires zero new dependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS expand/collapse for NAV-06 | Motion library (v12) | Motion arrives in Phase 21 -- use CSS `transition-all` + `max-height` now, upgrade later |
| html5-qrcode (already used) | @yudiel/react-qr-scanner | html5-qrcode already works in ScannerClient.tsx -- no reason to switch |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Current Navigation Architecture (Before)
```
src/
├── components/
│   ├── layout/
│   │   ├── MobileNav.tsx          # Bottom nav (5+ items, popover for staff)
│   │   └── OrganizerNav.tsx       # Horizontal pills for organizer pages
│   └── admin/
│       └── AdminNav.tsx           # Horizontal pills for admin pages
├── lib/rbac/
│   └── roles.ts                   # NAV_ITEMS array + getVisibleNavItems()
└── app/
    ├── (members)/dashboard/       # Monolithic dashboard page
    ├── (admin)/admin/scanner/     # QR scanner (under admin route group)
    └── ... (33 pages import MobileNav individually)
```

### Target Navigation Architecture (After)
```
src/
├── components/
│   ├── layout/
│   │   └── MobileNav.tsx          # Bottom nav (3-4 items, no popover)
│   └── staff/
│       └── StaffNav.tsx           # Unified horizontal pills (replaces AdminNav + OrganizerNav)
├── lib/rbac/
│   └── roles.ts                   # Updated NAV_ITEMS (3-4 items) + getVisibleNavItems()
└── app/
    ├── (members)/dashboard/       # Renamed to Account page with "My Stuff" + "Management"
    ├── (admin)/admin/scanner/     # Enhanced Check-in page (name search + attendee list)
    └── ... (33 pages -- MobileNav stays in each, changes propagate automatically)
```

### Pattern 1: Role-Aware Navigation Items
**What:** Update `NAV_ITEMS` in `roles.ts` to the new 3-4 tab structure
**When to use:** Drives the entire MobileNav rendering
**Example:**
```typescript
// Source: existing roles.ts pattern, adapted for new requirements
const NAV_ITEMS: NavItem[] = [
  {
    href: "/events",
    label: "Events",
    icon: "calendar",
    roles: null,
    requireApproved: false,
    requireAuth: false,
  },
  {
    href: "/gallery",
    label: "Gallery",
    icon: "image",
    roles: null,
    requireApproved: true,
    requireAuth: false,
  },
  {
    href: "/admin/scanner",
    label: "Check-in",
    icon: "qrcode",
    roles: ["master", "organizer"],
    requireApproved: true,
    requireAuth: true,
  },
  {
    href: "/dashboard",
    label: "Account",
    icon: "user",
    roles: null,
    requireApproved: false,
    requireAuth: true,
  },
];
```

### Pattern 2: Unified StaffNav Component
**What:** Single component replacing AdminNav and OrganizerNav
**When to use:** All admin and organizer route pages
**Example:**
```typescript
// Source: merged from existing AdminNav.tsx + OrganizerNav.tsx patterns
interface StaffNavProps {
  role: UserRole | null;
  context: "admin" | "organizer";
}

const STAFF_TABS = [
  { href: "events", label: "Events", contexts: ["admin", "organizer"] },
  { href: "members", label: "Members", contexts: ["admin", "organizer"] },
  { href: "artists", label: "Artists", contexts: ["admin", "organizer"] },
  { href: "venues", label: "Venues", contexts: ["admin", "organizer"] },
  { href: "newsletter", label: "Newsletter", contexts: ["admin"] },
  { href: "finance", label: "Finance", contexts: ["admin"], roles: ["master"] },
];

export default function StaffNav({ role, context }: StaffNavProps) {
  const pathname = usePathname();
  const basePath = context === "admin" ? "/admin" : "/organizer";

  const visibleTabs = STAFF_TABS.filter(tab => {
    if (!tab.contexts.includes(context)) return false;
    if (tab.roles && (!role || !tab.roles.includes(role))) return false;
    return true;
  });

  return (
    <div className="admin-nav-scroll mb-6 overflow-x-auto">
      <div className="flex gap-2 px-6" style={{ width: "max-content" }}>
        {visibleTabs.map(tab => {
          const href = `${basePath}/${tab.href}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all active:scale-95 active:opacity-80 ${
                isActive ? "bg-accent text-white" : "bg-card border border-card-border text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

### Pattern 3: Role-Aware Account Page Sections
**What:** Account page with conditional "Management" section
**When to use:** The `/dashboard` page restructure
**Example:**
```typescript
// Source: adapted from existing dashboard/page.tsx pattern
export default async function AccountPage() {
  // ... existing auth + data fetching ...
  const isStaff = role === "master" || role === "organizer";

  return (
    <div className="min-h-dvh pb-24">
      {/* Header (existing) */}

      {/* My Stuff section -- visible to all authenticated users */}
      <section>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">My Stuff</p>
        {/* Quick actions, tickets, drink tokens, media, settings */}
      </section>

      {/* Management section -- staff only */}
      {isStaff && (
        <section className="mt-6 border-t border-card-border pt-6">
          <ManagementSection role={role} />
        </section>
      )}

      <MobileNav role={role} status={status} />
    </div>
  );
}
```

### Pattern 4: CSS-Only Expand/Collapse (NAV-06)
**What:** Animated expand/collapse without Motion library (Phase 21 will enhance)
**When to use:** Management section toggle
**Example:**
```typescript
// Source: standard React + Tailwind pattern
"use client";

export function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-3">
        <span className="text-sm font-semibold uppercase tracking-widest text-muted">{title}</span>
        <svg className={`h-4 w-4 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div className={`grid transition-all duration-200 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Popover for primary navigation:** The current popover pattern for Admin/Organizer is bad UX -- primary navigation should be directly tappable. Remove entirely.
- **MobileNav in root layout:** MobileNav is currently imported per-page (33 pages), not in a layout. This is intentional because each page is a Server Component that reads `x-user-role` from headers. Do NOT move MobileNav to layout.tsx -- it would break the role-awareness pattern.
- **Separate admin/organizer route trees with duplicated components:** AdminNav and OrganizerNav are 95% identical. Do NOT maintain two separate nav components. Unify into StaffNav.
- **Breaking existing route structure:** The `/admin/*` and `/organizer/*` route groups and middleware protection must stay. This phase changes navigation UI, not route architecture.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR scanning | Custom camera/scanner logic | html5-qrcode (already used) | Complex browser API surface, already working |
| Role-based access control | Custom auth checks | Middleware headers + `getVisibleNavItems()` (already used) | Existing pattern is solid, just update the items list |
| Expand/collapse animation | Complex JS animation | CSS `grid-rows-[0fr/1fr]` transition | Works perfectly for simple show/hide, Motion comes in Phase 21 |
| Mobile safe area handling | Manual padding calculations | `env(safe-area-inset-bottom)` (already used) | Browser-native, already working in MobileNav |

**Key insight:** Phase 20 requires zero new libraries. Every UI pattern needed already exists in the codebase or is achievable with Tailwind CSS transitions.

## Common Pitfalls

### Pitfall 1: Scanner Access Regression
**What goes wrong:** Changing MobileNav breaks the ability for organizer/master to reach the scanner page
**Why it happens:** The scanner page is under `/admin/scanner` but is accessible by both master AND organizer (special middleware rule). If the new Check-in tab points to `/admin/scanner`, it must remain accessible to organizers despite the `/admin` prefix.
**How to avoid:** Verify middleware rule at line 82-88 of `middleware.ts` -- the `/admin/scanner` path has a special exemption for organizers. Keep this intact. Test with both master and organizer roles.
**Warning signs:** Organizer clicking Check-in tab gets redirected to `/dashboard`

### Pitfall 2: Breaking Unauthenticated Navigation
**What goes wrong:** Removing Home from NAV_ITEMS breaks the unauthenticated user experience
**Why it happens:** Unauthenticated users currently see: Home, Events, Gallery. If we remove Home entirely, they should see: Events, Gallery. The Home page (`/`) already redirects authenticated users to `/dashboard`. Unauthenticated users land on Home first, so removing it from the nav is fine -- they can still access `/` via direct URL.
**How to avoid:** Test all three states: unauthenticated (2 tabs: Events, Gallery), member (3 tabs: Events, Gallery, Account), staff (4 tabs: Events, Gallery, Check-in, Account). Verify pending/rejected members see appropriate tabs.
**Warning signs:** Unauthenticated users see empty nav or broken layout

### Pitfall 3: MobileNav Popover State Leaking
**What goes wrong:** Removing the popover code from MobileNav but not cleaning up the associated `useState`, `useRef`, and event listeners
**Why it happens:** The popover logic (lines 59-76 of MobileNav.tsx) has click-outside handling and pathname-based reset. If partially removed, it creates dead code or React warnings.
**How to avoid:** Remove the entire popover system: `popoverOpen` state, `popoverRef`, both `useEffect` hooks for click-outside and pathname reset, `STAFF_ICONS` constant, and the conditional popover rendering block.
**Warning signs:** Console warnings about unused state, unnecessary event listeners

### Pitfall 4: Dashboard URL vs Account Mental Model
**What goes wrong:** Renaming "Dashboard" to "Account" in the UI but keeping the `/dashboard` URL creates confusion
**Why it happens:** The route is `/dashboard` but the tab says "Account". This is actually fine for v1 -- changing the URL would require updating middleware protected routes, login redirect (`?next=/dashboard`), and the Home page redirect. Too much churn for a label change.
**How to avoid:** Keep the URL as `/dashboard` but change the MobileNav label to "Account". The NAV_ITEMS already has `label: "Account"` and `href: "/dashboard"`. Document this intentional URL/label mismatch for future cleanup.
**Warning signs:** Users bookmarking `/dashboard` would break if URL changed

### Pitfall 5: Quick-Stats Data Fetching in Server Component
**What goes wrong:** Adding quick-stats queries (pending members, next event, revenue) to the Account page causes slow page loads
**Why it happens:** The Dashboard page already makes 3-4 Supabase queries (user, profile, tickets, drink tokens, media). Adding 3 more for stats could push load time over acceptable thresholds.
**How to avoid:** For staff quick-stats, use `count: 'exact', head: true` for pending members (no row data transferred). For next event, `.limit(1)`. For revenue, consider a simple SUM aggregate. All queries run in parallel with `Promise.all()`. If performance is still slow, defer to a client-side fetch.
**Warning signs:** Account page taking >2 seconds to load

### Pitfall 6: Check-in Page Name Search Needs Service Client
**What goes wrong:** Name search on the Check-in page fails because RLS prevents ticket-holder name lookup
**Why it happens:** Supabase RLS on `profiles` and `tickets` restricts what data a user can see. The attendance API already uses `getServiceClient()` to bypass RLS (see `/api/tickets/attendance/route.ts`). Name search must follow the same pattern.
**How to avoid:** Extend the existing `/api/tickets/attendance` endpoint with a `?search=` query parameter, or create a new server action. Use `getServiceClient()` for the query.
**Warning signs:** Empty search results despite known attendees existing

### Pitfall 7: OrganizerNav Page Updates Missing
**What goes wrong:** StaffNav is created but some organizer pages still import OrganizerNav
**Why it happens:** OrganizerNav is imported in 3 pages (events, artists, venues). AdminNav in 5 pages (events, members, artists, venues, newsletter). Easy to miss one during the find-and-replace.
**How to avoid:** After creating StaffNav, grep for `OrganizerNav` and `AdminNav` imports -- both must return zero results (except the old files themselves, which should be deleted).
**Warning signs:** Inconsistent navigation styling between admin and organizer pages

## Code Examples

### MobileNav Simplification (removing popover)
```typescript
// Source: adapted from existing MobileNav.tsx
// The new MobileNav is drastically simpler -- no popover, no state management
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole, UserStatus } from "@/types/database";
import { getVisibleNavItems } from "@/lib/rbac/roles";

interface MobileNavProps {
  role: UserRole | null;
  status: UserStatus | null;
}

export default function MobileNav({ role, status }: MobileNavProps) {
  const pathname = usePathname();
  const visibleItems = getVisibleNavItems(role, status);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-card-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around px-4 pb-[env(safe-area-inset-bottom)] pt-2">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard" || pathname.startsWith("/dashboard")
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs transition-all active:scale-95 active:opacity-80 ${
                isActive ? "text-accent" : "text-muted"
              }`}
            >
              {icons[item.icon]}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### Quick-Stats Cards for Management Section
```typescript
// Source: adapted from existing dashboard patterns + Supabase query patterns
// Server-side data fetching for management stats
async function getManagementStats(supabase: SupabaseClient) {
  const today = new Date().toISOString().split("T")[0];

  const [pendingResult, nextEventResult, revenueResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("events")
      .select("id, title, date")
      .gte("date", today)
      .eq("is_published", true)
      .order("date", { ascending: true })
      .limit(1),
    supabase
      .from("tickets")
      .select("amount_paid"),
  ]);

  const totalRevenue = (revenueResult.data ?? [])
    .reduce((sum, t) => sum + (t.amount_paid ?? 0), 0);

  return {
    pendingMembers: pendingResult.count ?? 0,
    nextEvent: nextEventResult.data?.[0] ?? null,
    totalRevenue,
  };
}
```

### Enhanced Attendee List with Name Search
```typescript
// Source: extending existing /api/tickets/attendance/route.ts pattern
// Add search parameter support to attendance API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().toLowerCase();

  // ... existing auth checks ...

  const serviceClient = getServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch today's parties
  const { data: parties } = await serviceClient
    .from("event_parties")
    .select("id, title, date, time, event_id, events(title)")
    .eq("date", today);

  // For each party, fetch attendee list with optional name filter
  // ... build unified attendee list combining tickets + profiles join ...
  // If search: filter by profiles.full_name ilike '%search%'
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Popover menus in bottom nav | Direct tabs (max 5) | UX best practice (NNG research) | Popover adds tap friction; direct tabs are discoverable |
| Separate admin/organizer nav components | Single role-aware component | DRY principle | Reduces maintenance, ensures consistency |
| Monolithic dashboard page | Role-sectioned account hub | Modern mobile app patterns | Cleaner UX, manageable code |

**Deprecated/outdated:**
- Popover pattern in MobileNav: was a quick solution when admin/organizer had separate entry points. Now that Account becomes the hub, popovers are unnecessary.
- Separate AdminNav/OrganizerNav: 95% code duplication with no architectural justification.

## Open Questions

1. **Check-in page URL: `/admin/scanner` vs `/check-in`**
   - What we know: Scanner is currently at `/admin/scanner` with a special middleware exemption for organizers. The middleware checks `pathname.startsWith("/admin/scanner")` before the general `/admin` check.
   - What's unclear: Should we create a new `/check-in` route outside the admin group to avoid the awkward "admin path accessible by organizer" pattern?
   - Recommendation: Keep `/admin/scanner` for now. Moving it would require middleware changes, and the current special-case handling works. A URL rename can happen later without UI impact. The MobileNav tab label says "Check-in" regardless of the URL.

2. **Revenue aggregation query performance**
   - What we know: `tickets` table will grow over time. A `SELECT amount_paid FROM tickets` to sum client-side works for small datasets.
   - What's unclear: At what scale this becomes slow.
   - Recommendation: Use client-side sum for now (simple, no new SQL views). If performance degrades, create a Supabase SQL view or RPC in a future phase. Phase 22-23 (Analytics) will create proper aggregate views anyway.

3. **Drink revenue in quick stats**
   - What we know: NAV-05 says "total revenue." Currently ticket revenue and drink revenue are in separate tables (`tickets.amount_paid` vs `drink_orders.total_amount`).
   - What's unclear: Should quick-stats "total revenue" include both tickets and drinks?
   - Recommendation: Include both. Sum `tickets.amount_paid` + `drink_orders.total_amount` where `status = 'completed'`. This gives the most accurate picture.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test infrastructure exists |
| Config file | none -- see Wave 0 |
| Quick run command | `npm run lint` (ESLint only) |
| Full suite command | `npm run build` (type-checking + build) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | Bottom nav shows correct tabs per role | manual | Visual check: login as member (3 tabs), organizer (4 tabs), master (4 tabs) | N/A |
| NAV-02 | Account page shows role-aware sections | manual | Visual check: member sees "My Stuff" only, organizer/master sees "My Stuff" + "Management" | N/A |
| NAV-03 | Check-in tab one tap away for staff | manual | Tap Check-in tab from any page as organizer -- should navigate directly | N/A |
| NAV-04 | Check-in page has attendee list + name search + QR scan | manual | Open Check-in page, verify QR scanner present, type in search, verify list filters | N/A |
| NAV-05 | Management shows quick-stats cards | manual | Login as organizer/master, verify pending count, next event, revenue shown | N/A |
| NAV-06 | Management section expand/collapse | manual | Tap Management header, verify content animates open/closed | N/A |
| NAV-07 | Visual separation between My Stuff and Management | manual | Visual check: clear divider/background difference between sections | N/A |
| NAV-08 | StaffNav used consistently | unit | `grep -r "AdminNav\|OrganizerNav" src/app/ src/components/` returns 0 results | N/A |

### Sampling Rate
- **Per task commit:** `npm run lint && npm run build`
- **Per wave merge:** `npm run build` (full build catches type errors and broken imports)
- **Phase gate:** Full build green + manual visual testing across all three roles

### Wave 0 Gaps
- [ ] No test framework -- all validation is manual (lint + build + visual check)
- [ ] `grep` check for old component imports can serve as automated verification for NAV-08
- [ ] Consider adding a build-time check that `AdminNav` and `OrganizerNav` imports are absent

*(This phase is a UI refactor -- the primary validation method is visual inspection across roles. The build command catches type errors, broken imports, and ensures all pages compile correctly.)*

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** -- Direct reading of all 7 navigation-related source files (MobileNav.tsx, AdminNav.tsx, OrganizerNav.tsx, roles.ts, dashboard/page.tsx, scanner/page.tsx, ScannerClient.tsx)
- **Codebase analysis** -- grep across all 33 files importing MobileNav, 5 files importing AdminNav, 3 files importing OrganizerNav
- **Codebase analysis** -- middleware.ts route protection rules (especially `/admin/scanner` organizer exemption)
- **Codebase analysis** -- API routes `/api/tickets/attendance` and `/api/tickets/checkin` for existing check-in infrastructure

### Secondary (MEDIUM confidence)
- **v1.3 Research Summary** (.planning/research/SUMMARY.md) -- confirmed nav consolidation is lowest-risk feature, pure UI refactor

### Tertiary (LOW confidence)
- None -- all findings are from direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all existing tech
- Architecture: HIGH -- patterns derived directly from existing codebase analysis
- Pitfalls: HIGH -- all pitfalls identified from reading actual code and middleware rules

**Research date:** 2026-03-09
**Valid until:** Indefinite (no external dependencies, purely internal refactoring)

---

## Appendix: Current State Inventory

### Files to Modify
| File | Change |
|------|--------|
| `src/lib/rbac/roles.ts` | Update NAV_ITEMS to 4 items (Events, Gallery, Check-in, Account), update `getVisibleNavItems()` logic |
| `src/components/layout/MobileNav.tsx` | Remove popover system, simplify to direct Link rendering |
| `src/app/(members)/dashboard/page.tsx` | Restructure into "My Stuff" + "Management" sections |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` | Add name search + unified attendee list |
| `src/app/api/tickets/attendance/route.ts` | Add search query parameter support |

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/staff/StaffNav.tsx` | Unified navigation for admin/organizer pages |
| `src/components/account/ManagementSection.tsx` | Staff-only management section with quick-stats and links |
| `src/components/account/CollapsibleSection.tsx` | Reusable expand/collapse wrapper (client component) |

### Files to Delete
| File | Replaced By |
|------|-------------|
| `src/components/admin/AdminNav.tsx` | `src/components/staff/StaffNav.tsx` |
| `src/components/layout/OrganizerNav.tsx` | `src/components/staff/StaffNav.tsx` |

### Files to Update (import changes only)
| Count | Change |
|-------|--------|
| 5 admin pages | Replace `AdminNav` import with `StaffNav` |
| 3 organizer pages | Replace `OrganizerNav` import with `StaffNav` |

### Key Measurements
- MobileNav appears in: **33 pages** (changes propagate automatically)
- AdminNav appears in: **5 pages** (events, members, artists, venues, newsletter)
- OrganizerNav appears in: **3 pages** (events, artists, venues)
- Total files to touch: ~14 (5 modify + 3 create + 2 delete + ~8 import updates)
