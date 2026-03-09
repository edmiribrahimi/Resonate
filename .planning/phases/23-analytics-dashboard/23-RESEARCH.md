# Phase 23: Analytics Dashboard & Cross-Event Insights - Research

**Researched:** 2026-03-09
**Domain:** Analytics dashboards, cross-entity Supabase queries, Recharts visualization
**Confidence:** HIGH

## Summary

Phase 23 builds on the existing Phase 22 analytics infrastructure (PostHog, Recharts, per-event query functions, analytics components) to add a top-level admin KPI dashboard, cross-event intelligence (member spend profiles, drink popularity, repeat attendance, referral chains), guest-to-member conversion tracking, a drink purchase funnel, and side-by-side event comparison.

All data for requirements ANLY-07 through ANLY-14 and ANLY-16 exists in the Supabase database today: `profiles` (with `referred_by`), `tickets`, `drink_orders`, `drink_tokens`, `events`, and `event_parties`. No new tables or PostHog custom events are needed -- everything derives from existing Supabase data via aggregation queries. ANLY-15 (drink purchase funnel) is the one requirement that depends on PostHog pageview/event data, since "menu view" counts are tracked automatically by PostHog's `capture_pageview: "history_change"` setting in `instrumentation-client.ts`.

**Primary recommendation:** Extend `src/lib/analytics/` with new cross-event query modules. Create a new admin route at `/admin/analytics` with sub-routes for the KPI dashboard, member insights, and event comparison. Reuse existing components (CountUp, AnimatedSection, card patterns) and Recharts chart types (BarChart, AreaChart, FunnelChart, RadarChart) for visualization.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLY-07 | Admin KPI dashboard (total revenue, total members, upcoming events, recent activity) | Data already partially computed in `ManagementSection` (pendingMembers, nextEvent, totalRevenue). Extend with additional queries for recent activity feed. |
| ANLY-09 | Per-member spend profile (total across events: tickets + drinks) | Join `profiles` -> `tickets` (amount_paid) + `drink_orders` (total_amount, status=completed). Group by user_id. |
| ANLY-10 | Drink popularity ranking per event (most sold, highest redemption rate) | `fetchDrinkSales` already returns per-drink quantity/revenue/redeemed/refunded. Reuse with sorting + ranking UI. |
| ANLY-11 | Market insights per event (avg spend/attendee, peak purchase times) | Avg spend = (ticket revenue + drink revenue) / attendance count. Peak times = GROUP BY hour on drink_orders.created_at and tickets.created_at. |
| ANLY-12 | Repeat attendee rate (% members attending multiple events) | Query `tickets` grouped by user_id, count distinct event_id. Members with count > 1 are repeaters. |
| ANLY-13 | Referral chain effectiveness (referrer -> referred -> spending) | Join `profiles` (referred_by) with aggregated spend data (tickets + drink_orders by user_id). Chain: referrer -> referred members -> their total spend. |
| ANLY-14 | Guest-to-member conversion (anonymous buyers who later register) | `drink_orders` with `user_id IS NOT NULL` that were originally created with `user_id IS NULL` (claimed via `claimGuestOrders`). Track via `drink_orders.created_at` vs `profiles.created_at` for the same user_id. |
| ANLY-15 | Drink purchase funnel (menu view -> cart -> checkout -> payment -> token) | Menu view = PostHog pageview on `/events/[slug]/menu`. Cart/checkout/payment/token steps derivable from `drink_orders` status transitions. Funnel visualization via Recharts FunnelChart. |
| ANLY-16 | Side-by-side event comparison for 2+ events | Multi-event selector UI. Run existing per-event query functions for each selected event, display in parallel columns or grouped bar charts. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8.0 | Chart visualization | Already used in Phase 22 for AreaChart, BarChart. Supports FunnelChart, RadarChart, PieChart natively. |
| @supabase/supabase-js | (installed) | Database queries | All data lives in Supabase. Cross-event queries via standard `.from().select()` patterns. |
| posthog-js | ^1.360.0 | Pageview/event data | Menu views tracked automatically. Query via PostHog Insights API or compute locally. |
| motion | ^12.35.2 | Animations | AnimatedSection, CountUp already used in Phase 22 components. |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| posthog-node | ^5.28.0 | Server-side PostHog queries | For ANLY-15 funnel data (pageview counts by URL). Alternative: compute funnel from Supabase data only. |

### No New Dependencies Needed
All Phase 23 requirements can be met with the existing stack. No additional libraries required.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/analytics/
    event-queries.ts       # (existing) Per-event queries
    member-queries.ts      # (existing) Member growth
    dashboard-queries.ts   # NEW: Top-level KPI aggregations
    cross-event-queries.ts # NEW: Member spend, repeat rate, referral chains
    comparison-queries.ts  # NEW: Multi-event comparison data
    funnel-queries.ts      # NEW: Drink purchase funnel
  components/analytics/
    RevenueCard.tsx           # (existing)
    AttendanceCard.tsx        # (existing)
    ...                       # (existing components)
    KPIDashboard.tsx          # NEW: Top-level KPI cards grid
    MemberSpendTable.tsx      # NEW: Per-member spend profiles
    DrinkPopularityChart.tsx  # NEW: Drink ranking visualization
    RepeatAttendeeCard.tsx    # NEW: Repeat attendee rate
    ReferralChainTable.tsx    # NEW: Referral effectiveness
    GuestConversionCard.tsx   # NEW: Guest-to-member conversion
    PurchaseFunnelChart.tsx   # NEW: Recharts FunnelChart
    EventComparisonChart.tsx  # NEW: Side-by-side grouped bars
    EventSelector.tsx         # NEW: Multi-event picker for comparison
    MarketInsightsCard.tsx    # NEW: Avg spend, peak times
  app/(admin)/admin/
    analytics/
      page.tsx               # NEW: Top-level KPI dashboard (ANLY-07)
      loading.tsx             # NEW: Skeleton
      members/
        page.tsx              # NEW: Member insights (ANLY-09, ANLY-12, ANLY-13, ANLY-14)
        loading.tsx           # NEW: Skeleton
      compare/
        page.tsx              # NEW: Event comparison (ANLY-16)
        loading.tsx           # NEW: Skeleton
  app/(admin)/admin/events/[id]/analytics/
    page.tsx                   # (existing) -- extend with ANLY-10, ANLY-11
  app/(organizer)/organizer/events/[id]/analytics/
    page.tsx                   # (existing) -- extend with ANLY-11
```

### Pattern 1: Server Component with Parallel Data Fetching
**What:** All analytics pages are Server Components that fetch data in parallel via `Promise.all`, passing serialized data as props to client chart components.
**When to use:** Every analytics page.
**Example:**
```typescript
// Source: Existing pattern from admin/events/[id]/analytics/page.tsx
const [revenue, velocity, drinkSales, attendance, lifecycle] =
  await Promise.all([
    fetchEventRevenue(supabase, eventId),
    fetchDailyVelocity(supabase, eventId),
    fetchDrinkSales(supabase, eventId),
    fetchAttendanceRate(supabase, eventId),
    fetchTokenLifecycle(supabase, eventId),
  ]);
```

### Pattern 2: Query Module with Typed Return
**What:** Each analytics domain gets its own query module in `src/lib/analytics/` with exported interfaces and async functions that accept a Supabase client.
**When to use:** For all new cross-event queries.
**Example:**
```typescript
// Source: Existing pattern from event-queries.ts
export interface MemberSpendProfile {
  userId: string;
  fullName: string;
  email: string;
  ticketSpend: number;
  drinkSpend: number;
  totalSpend: number;
  eventsAttended: number;
}

export async function fetchMemberSpendProfiles(
  supabase: SupabaseClient
): Promise<MemberSpendProfile[]> {
  // Use getServiceClient() to bypass RLS for cross-user aggregation
}
```

### Pattern 3: Card Component with CountUp
**What:** KPI cards are "use client" components that display numeric values with CountUp animation, using consistent styling (rounded-2xl, border, bg-card, p-6).
**When to use:** For all numeric KPI displays.
**Example:**
```typescript
// Source: Existing pattern from RevenueCard.tsx, GrowthSummaryCard.tsx
"use client";
import CountUp from "@/components/motion/CountUp";

export default function KPICard({ label, value, format }: Props) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">
        <CountUp value={value} format={format} />
      </p>
    </div>
  );
}
```

### Pattern 4: Recharts Wrapper with Project Theme
**What:** All chart components use consistent Recharts styling with CSS variables for colors.
**When to use:** For every chart.
**Example:**
```typescript
// Source: Existing pattern from TicketVelocityChart.tsx, MemberGrowthChart.tsx
<XAxis tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
<Tooltip
  contentStyle={{
    backgroundColor: "var(--color-card)",
    border: "1px solid var(--color-card-border)",
    borderRadius: "0.75rem",
  }}
  labelStyle={{ color: "var(--color-foreground)" }}
/>
```

### Pattern 5: RLS Bypass for Cross-User Aggregation
**What:** Use `getServiceClient()` (service role key) for queries that aggregate across users, since RLS restricts per-user access.
**When to use:** Member spend profiles, repeat attendees, referral chains -- any query that reads data for ALL users.
**Example:**
```typescript
// Source: Existing pattern from member search in admin pages
import { getServiceClient } from "@/lib/supabase/service";
const serviceClient = getServiceClient();
const { data } = await serviceClient.from("tickets").select("user_id, amount_paid");
```

### Anti-Patterns to Avoid
- **Client-side aggregation of unbounded data:** Do NOT fetch all tickets/orders to the client and aggregate in JS. Aggregate in the query module (server-side JS after Supabase fetch), keep client components pure display.
- **Multiple sequential queries when parallel is possible:** Always use `Promise.all` for independent queries.
- **Custom SQL views for simple aggregations:** The existing pattern aggregates in JS after simple SELECTs. Keep that pattern -- no need for Supabase SQL views/functions.
- **Fetching PostHog data client-side:** Use server-side PostHog node client or skip PostHog queries entirely by computing funnel steps from Supabase data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Funnel chart | Custom SVG funnel | Recharts `<FunnelChart>` + `<Funnel>` | Built-in support, consistent styling, tooltips |
| Side-by-side comparison | Custom grid with individual charts | Recharts `<BarChart>` with multiple `<Bar>` components (different dataKey per event) | Grouped/clustered bars are native in Recharts |
| Radar comparison | Custom spider diagram | Recharts `<RadarChart>` + `<Radar>` | Built-in with polygon, tooltip, legend |
| Number formatting | Custom EUR formatter | Extend existing `eur()` pattern from RevenueCard.tsx | Consistency across components |
| Animated numbers | Custom counter | Existing `<CountUp>` component | Already built, handles reduced motion |
| Skeleton loading | Custom shimmer | Existing `animate-pulse` Tailwind pattern from Phase 21 | Every analytics page already has loading.tsx |

**Key insight:** Recharts already supports FunnelChart, RadarChart, grouped BarChart -- these are the three main chart types needed for Phase 23 that weren't used in Phase 22.

## Common Pitfalls

### Pitfall 1: RLS Blocking Cross-User Queries
**What goes wrong:** Admin analytics pages return empty data because Supabase RLS policies restrict access to own rows (e.g., `drink_orders` only shows own orders).
**Why it happens:** Standard `createClient()` uses session-based auth with RLS enforcement.
**How to avoid:** Use `getServiceClient()` for all cross-user aggregation queries (member spend, referral chains, repeat attendee rate). Admin/organizer pages already have role checks via middleware headers -- RLS bypass is safe here.
**Warning signs:** Empty or partial data in analytics when admin user has no personal tickets/orders.

### Pitfall 2: Unbounded Data Fetching
**What goes wrong:** Fetching ALL tickets, ALL drink_orders, ALL profiles in a single query causes slow page loads or timeouts.
**Why it happens:** As events and members grow, aggregate queries scan more rows.
**How to avoid:** For the KPI dashboard (ANLY-07), use `SELECT count(*)` with `head: true` for totals, and `SUM` via Supabase aggregate functions where possible. For member spend profiles (ANLY-09), add pagination or a top-N limit. For event comparison (ANLY-16), limit to selected events only.
**Warning signs:** Page load >3s, Supabase timeout errors.

### Pitfall 3: Guest-to-Member Conversion False Positives
**What goes wrong:** Counting ALL drink_orders with non-null user_id as "converted guests" when most were purchased by authenticated members from the start.
**Why it happens:** `claimGuestOrders` sets user_id on orders that were originally null, but there's no explicit "was_guest" flag.
**How to avoid:** A guest-converted order has `drink_orders.created_at < profiles.created_at` for the same user_id (the order was placed before the user registered). OR check `drink_orders.updated_at > drink_orders.created_at` as a proxy for claimed orders (the update happened when user_id was set).
**Warning signs:** Conversion count equals total member orders instead of a small subset.

### Pitfall 4: PostHog Funnel vs Supabase Funnel Mismatch
**What goes wrong:** Using PostHog for some funnel steps and Supabase for others leads to inconsistent numbers (different time windows, different user identification).
**Why it happens:** PostHog tracks anonymous pageviews; Supabase tracks authenticated actions.
**How to avoid:** For ANLY-15 (drink purchase funnel), compute all steps from Supabase data where possible: menu page visits can be approximated by counting distinct sessions on drink_orders per event (users who saw the menu = users who created a checkout + users who viewed but didn't buy). Alternatively, accept that the funnel top is approximate and clearly label it. If using PostHog for menu views, query via `posthog-node` server-side.
**Warning signs:** Funnel top number is smaller than funnel bottom (impossible -- indicates data source mismatch).

### Pitfall 5: Event Comparison With Different Scales
**What goes wrong:** Comparing a 50-person event with a 500-person event on the same chart makes the smaller one invisible.
**Why it happens:** Absolute numbers dominate visualization.
**How to avoid:** Offer both absolute and normalized (percentage/per-attendee) comparison modes. Default to per-attendee metrics for fair comparison.
**Warning signs:** One event's bars are visually negligible next to another's.

## Code Examples

### Cross-Event KPI Dashboard Query
```typescript
// Source: Pattern from ManagementSection in dashboard/page.tsx
export interface KPIDashboard {
  totalRevenue: number;
  totalMembers: number;
  upcomingEvents: number;
  recentActivity: RecentActivityItem[];
}

export async function fetchKPIDashboard(
  supabase: SupabaseClient
): Promise<KPIDashboard> {
  const now = new Date().toISOString().split("T")[0];

  const [membersResult, upcomingResult, ticketRevResult, drinkRevResult] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("date", now)
        .eq("is_published", true),
      supabase.from("tickets").select("amount_paid"),
      supabase
        .from("drink_orders")
        .select("total_amount")
        .eq("status", "completed"),
    ]);

  // Recent activity: latest tickets + orders combined, sorted by time
  // ...
}
```

### Member Spend Profile Query
```typescript
// Source: Pattern from event-queries.ts aggregation style
export async function fetchMemberSpendProfiles(
  serviceClient: SupabaseClient,
  limit = 50
): Promise<MemberSpendProfile[]> {
  // Fetch all profiles
  const { data: profiles } = await serviceClient
    .from("profiles")
    .select("id, full_name, email");

  // Fetch all ticket spend grouped by user
  const { data: tickets } = await serviceClient
    .from("tickets")
    .select("user_id, amount_paid");

  // Fetch all completed drink order spend grouped by user
  const { data: drinkOrders } = await serviceClient
    .from("drink_orders")
    .select("user_id, total_amount")
    .eq("status", "completed");

  // Aggregate in JS (following existing pattern from member-queries.ts)
  const spendMap = new Map<string, { tickets: number; drinks: number; events: Set<string> }>();
  // ... aggregate and return top spenders
}
```

### Recharts FunnelChart for Purchase Funnel (ANLY-15)
```typescript
"use client";
import { FunnelChart, Funnel, Tooltip, Cell, ResponsiveContainer } from "recharts";

const COLORS = [
  "var(--color-accent)",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#c084fc",
];

interface FunnelStep {
  name: string;
  value: number;
}

export default function PurchaseFunnelChart({ data }: { data: FunnelStep[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-card-border)",
              borderRadius: "0.75rem",
            }}
          />
          <Funnel dataKey="value" data={data} isAnimationActive>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Grouped BarChart for Event Comparison (ANLY-16)
```typescript
"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Data shape: [{ metric: "Revenue", Event1: 5000, Event2: 3200 }, ...]
interface ComparisonData {
  metric: string;
  [eventName: string]: string | number;
}

const EVENT_COLORS = ["var(--color-accent)", "#6366f1", "#10b981", "#f59e0b"];

export default function EventComparisonChart({
  data,
  eventNames,
}: {
  data: ComparisonData[];
  eventNames: string[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="metric" tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
          <YAxis tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-card-border)",
              borderRadius: "0.75rem",
            }}
          />
          <Legend />
          {eventNames.map((name, i) => (
            <Bar key={name} dataKey={name} fill={EVENT_COLORS[i]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Referral Chain Query (ANLY-13)
```typescript
export interface ReferralChain {
  referrerId: string;
  referrerName: string;
  referredCount: number;
  referredMembers: { name: string; totalSpend: number }[];
  totalChainSpend: number;
}

export async function fetchReferralChains(
  serviceClient: SupabaseClient
): Promise<ReferralChain[]> {
  // 1. Get all profiles with referred_by
  const { data: profiles } = await serviceClient
    .from("profiles")
    .select("id, full_name, referred_by");

  // 2. Get all ticket + drink spend per user
  const { data: tickets } = await serviceClient
    .from("tickets")
    .select("user_id, amount_paid");
  const { data: orders } = await serviceClient
    .from("drink_orders")
    .select("user_id, total_amount")
    .eq("status", "completed");

  // 3. Build spend map, group by referrer, compute chain totals
  // ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chart.js with react-chartjs-2 | Recharts 3 (composable React components) | Already adopted in Phase 22 | Better React integration, tree-shaking |
| Custom dashboards from scratch | Reuse existing Phase 22 components + query patterns | Phase 22 established patterns | Faster development, consistent UX |
| PostHog dashboards for everything | Supabase queries + PostHog for pageview tracking | Decision in REQUIREMENTS.md out-of-scope | Custom UI matches app design language |

**Note from REQUIREMENTS.md Out of Scope:** "Custom analytics dashboard UI (Chart.js/Recharts) -- PostHog provides dashboards, funnels, charts -- no need to build custom" was listed as out-of-scope but then ANLY-07 through ANLY-16 were added as requirements, overriding this. The approach is: build custom dashboard UI with Recharts (already installed), using Supabase data primarily.

## Data Availability Analysis

### What Exists in Supabase Today

| Requirement | Data Source | Table(s) | Key Columns | Available? |
|-------------|------------|----------|-------------|------------|
| ANLY-07 KPI | Multi-table aggregation | profiles, events, tickets, drink_orders | count, amount_paid, total_amount, date | YES |
| ANLY-09 Member spend | tickets + drink_orders by user | tickets, drink_orders | user_id, amount_paid, total_amount | YES |
| ANLY-10 Drink popularity | drink_tokens per event | drink_tokens | drink_name, event_id, status, price | YES (fetchDrinkSales exists) |
| ANLY-11 Market insights | tickets + drink_orders + attendance | tickets, drink_orders, drink_tokens | user_id, created_at (for peak times) | YES |
| ANLY-12 Repeat attendees | tickets by user across events | tickets | user_id, event_id | YES |
| ANLY-13 Referral chains | profiles + spend data | profiles, tickets, drink_orders | referred_by, user_id, amount_paid | YES |
| ANLY-14 Guest conversion | drink_orders claimed by later-registered users | drink_orders, profiles | user_id, created_at (both tables) | YES (partial -- no explicit "was_guest" flag) |
| ANLY-15 Purchase funnel | drink_orders + drink_tokens + PostHog pageviews | drink_orders, drink_tokens | status, created_at | PARTIAL (menu views need PostHog or approximation) |
| ANLY-16 Event comparison | Reuse per-event queries for multiple events | All analytics tables | event_id | YES |

### Guest-to-Member Conversion Detection (ANLY-14)

The `claimGuestOrders` action sets `user_id` on previously-null orders. To detect converted guests:
- **Method A:** Find `drink_orders` where `user_id IS NOT NULL` AND `profiles.created_at > drink_orders.created_at` (order placed before user registered)
- **Method B:** Count distinct user_ids in `drink_orders` that also have `user_id IS NULL` orders (same user bought as guest AND member). But `claimGuestOrders` updates user_id to non-null, so old null orders no longer exist.
- **Best approach:** Method A is reliable. If a user's profile was created AFTER their drink order, they were a guest who later converted.

### Funnel Data Strategy (ANLY-15)

The funnel steps and data sources:
1. **Menu view:** PostHog pageview on `/events/*/menu` -- requires `posthog-node` server query OR approximate by counting unique users who created orders (they must have viewed the menu)
2. **Cart (add to cart):** No explicit tracking. Approximate: unique users with `drink_orders` for the event (they added items to cart to create a checkout)
3. **Checkout initiated:** Count of `drink_orders` with any status (pending, completed, failed)
4. **Payment completed:** Count of `drink_orders` with `status = 'completed'`
5. **Token generated:** Count of `drink_tokens` for the event

**Practical approach:** Steps 2-5 are derivable from Supabase. Step 1 (menu views) can be:
- Approximated as "unique visitors >= checkout initiators" (set it equal to checkout count as minimum)
- Or queried from PostHog via the `/api/event/` query endpoint using `posthog-node`
- Or computed as distinct `user_id` + anonymous session count from drink_orders

**Recommendation:** For v1.3, compute funnel from Supabase only (steps 2-5). Label step 1 as "Checkouts initiated" instead of "Menu views" to avoid needing PostHog API. This avoids complexity and keeps data consistent. PostHog funnel visualization is explicitly deferred to v1.4 (ANLY-D1).

## Routing & Navigation

### New Admin Routes

| Route | Purpose | Requirement |
|-------|---------|-------------|
| `/admin/analytics` | Top-level KPI dashboard | ANLY-07 |
| `/admin/analytics/members` | Member insights (spend, repeat, referral, conversion) | ANLY-09, ANLY-12, ANLY-13, ANLY-14 |
| `/admin/analytics/compare` | Side-by-side event comparison | ANLY-16 |

### Modified Routes

| Route | Change | Requirement |
|-------|--------|-------------|
| `/admin/events/[id]/analytics` | Add drink popularity ranking + market insights sections | ANLY-10, ANLY-11 |
| `/organizer/events/[id]/analytics` | Add market insights section (avg spend, peak times) | ANLY-11 |

### StaffNav Update

Add "Analytics" tab to StaffNav for admin context:
```typescript
{ href: "analytics", label: "Analytics", contexts: ["admin"], roles: ["master"] as UserRole[] },
```

This integrates naturally with the existing tab pattern. Place it after "Finance" in the array.

## Open Questions

1. **PostHog API for menu pageviews (ANLY-15)**
   - What we know: PostHog tracks pageviews automatically via `capture_pageview: "history_change"`. `posthog-node` can query events server-side.
   - What's unclear: Whether querying PostHog for pageview counts is worth the complexity vs approximating from Supabase data.
   - Recommendation: Skip PostHog pageview queries for v1.3. Compute funnel from Supabase data only (checkout -> payment -> token). Note that ANLY-D1 (conversion funnel via PostHog dashboards) is already deferred to v1.4.

2. **Pagination for member spend profiles (ANLY-09)**
   - What we know: With <1000 members, fetching all profiles + aggregating in JS is fine.
   - What's unclear: Whether to show all members or top-N with pagination.
   - Recommendation: Show top 20 spenders by default with "Show all" toggle. This keeps page load fast.

3. **Event comparison maximum (ANLY-16)**
   - What we know: Requirement says "2+ events".
   - What's unclear: Whether there should be an upper limit.
   - Recommendation: Allow 2-4 events for comparison. More than 4 makes charts unreadable.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/analytics/event-queries.ts`, `member-queries.ts` -- established patterns
- Existing codebase: `src/components/analytics/` -- 8 existing components, consistent styling
- Existing codebase: `src/app/(admin)/admin/events/[id]/analytics/page.tsx` -- server component pattern
- Existing codebase: Database schema from migrations and `src/types/database.ts`
- Existing codebase: `src/components/staff/StaffNav.tsx` -- tab navigation pattern
- Existing codebase: `src/lib/supabase/service.ts` -- RLS bypass pattern

### Secondary (MEDIUM confidence)
- [Recharts FunnelChart API](https://recharts.github.io/en-US/api/FunnelChart/) -- verified component exists
- [Recharts RadarChart API](https://recharts.github.io/en-US/api/Radar/) -- verified component exists
- Recharts grouped BarChart -- multiple `<Bar>` components with different dataKeys (standard pattern)

### Tertiary (LOW confidence)
- PostHog Node.js API for querying pageview events server-side -- not verified against current posthog-node v5.28.0 API

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and used in Phase 22
- Architecture: HIGH - extending established patterns from Phase 22
- Data availability: HIGH - all required data exists in Supabase tables
- Pitfalls: HIGH - identified from actual codebase patterns (RLS, guest conversion, etc.)
- Funnel tracking: MEDIUM - PostHog pageview query approach not fully verified; Supabase-only alternative is solid

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no external API changes expected)
