# Phase 22: Analytics Infrastructure & Event Metrics - Research

**Researched:** 2026-03-09
**Domain:** PostHog analytics integration, Supabase aggregate queries, in-app event metrics
**Confidence:** HIGH

## Summary

Phase 22 builds two orthogonal systems: (1) PostHog behavioral tracking (pageviews, custom events) running silently in the background, and (2) in-app analytics views that query existing Supabase tables (tickets, drink_tokens, drink_orders, profiles) to present organizer-facing revenue, sales, attendance, and token lifecycle metrics.

The project runs Next.js 16.1.6, which natively supports `instrumentation-client.ts` -- the simplest and recommended way to initialize PostHog on the client side. For server-side event capture (purchase confirmations, redemptions), `posthog-node` provides the Node SDK with immediate flush settings appropriate for serverless functions.

For the charting requirements (ANLY-02 ticket velocity, ANLY-05 member growth), use Recharts v3 -- the standard React charting library built on SVG with composable components. The project's Out of Scope note about "Custom analytics dashboard UI (Chart.js/Recharts)" refers to building a full-blown analytics product; the ANLY requirements explicitly demand in-app charts for organizers, which are simple focused views, not a custom analytics platform.

**Primary recommendation:** Initialize PostHog via `instrumentation-client.ts` with EU host (`eu.i.posthog.com`), add `posthog-node` for server-side captures, build analytics pages as Server Components querying Supabase directly, use Recharts for the two chart views (velocity + growth).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLY-01 | Organizer can view revenue summary per event (gross/net ticket + drink sales) | Supabase queries on `tickets` (amount_paid) + `drink_orders` (total_amount, status=completed) + `ticket_refunds` (approved) per event_id. Extend existing SalesDashboard pattern. |
| ANLY-02 | Organizer can view ticket sales over time chart per event (daily velocity) | Query `tickets.created_at` grouped by date for the event. Render with Recharts BarChart (daily bars). |
| ANLY-03 | Organizer can view drink sales summary per event with per-drink breakdown | Query `drink_tokens` joined with `drink_items` grouped by drink_name, sum price, count redeemed vs purchased. |
| ANLY-04 | Organizer can view attendance rate per event (tickets sold vs checked in) | Query `tickets` count where event_id matches, vs count where checked_in=true. Simple percentage calculation. |
| ANLY-05 | Admin can view member growth over time (weekly/monthly, referral vs organic split) | Query `profiles.created_at` grouped by week/month. `referred_by IS NOT NULL` = referral, otherwise organic. Recharts AreaChart. |
| ANLY-06 | Organizer can view expired/refunded token rate per event (% redeemed vs wasted) | Query `drink_tokens` by event_id: count status='redeemed' vs status='refunded'. Percentage display. |
| ANLY-08 | App tracks pageviews and user behavior via PostHog (EU instance, free tier) | PostHog EU cloud at `eu.i.posthog.com`, `posthog-js` for client, `posthog-node` for server-side captures. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| posthog-js | ^1.357 | Client-side analytics (pageviews, autocapture, identify) | Official PostHog JS SDK, only option for client-side tracking |
| posthog-node | ^5.26 | Server-side event capture (purchase, redeem, refund) | Official PostHog Node SDK for serverless environments |
| recharts | ^3.8 | SVG charts (bar, area) for velocity and growth views | React-native composable chart components, 3.6M weekly downloads, lightweight D3 submodules |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | existing | Query existing tables for analytics aggregations | Already installed, used for all data fetching |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Hand-rolled SVG | Less code for 2 simple charts, but no tooltips/responsiveness/animations -- Recharts is worth it for professional feel |
| Recharts | Chart.js (react-chartjs-2) | Canvas-based, harder to style with Tailwind, less React-idiomatic |
| PostHog Cloud EU | Self-hosted PostHog | Massive ops overhead, free tier is more than sufficient for this community scale |

**Installation:**
```bash
npm install posthog-js posthog-node recharts
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── instrumentation-client.ts          # PostHog client-side init (NEW)
├── lib/
│   └── posthog/
│       └── server.ts                  # PostHog Node client singleton (NEW)
├── components/
│   └── analytics/
│       ├── RevenueCard.tsx            # Gross/net revenue display (client, uses CountUp)
│       ├── AttendanceCard.tsx         # Sold vs checked-in rate
│       ├── TokenLifecycleCard.tsx     # Redeemed vs refunded rate
│       ├── DrinkSalesBreakdown.tsx    # Per-drink item table
│       ├── TicketVelocityChart.tsx    # Recharts BarChart (client component)
│       └── MemberGrowthChart.tsx      # Recharts AreaChart (client component)
├── app/
│   ├── (admin)/admin/events/[id]/
│   │   └── analytics/
│   │       ├── page.tsx               # Server Component: fetch + render
│   │       └── loading.tsx            # Skeleton
│   ├── (organizer)/organizer/events/[id]/
│   │   └── analytics/
│   │       ├── page.tsx               # Server Component: fetch + render
│   │       └── loading.tsx            # Skeleton
│   └── (admin)/admin/members/
│       └── growth/
│           ├── page.tsx               # Member growth page (ANLY-05)
│           └── loading.tsx            # Skeleton
```

### Pattern 1: PostHog Client Init via instrumentation-client.ts
**What:** Initialize PostHog once in the client entry point, no provider wrapper needed
**When to use:** Next.js 15.3+ (this project uses 16.1.6)
**Example:**
```typescript
// src/instrumentation-client.ts
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
  defaults: '2025-11-30',
  // EU instance, respect DNT, no session replay on free tier to save quota
  capture_pageview: 'history_change',
  capture_pageleave: 'if_capture_pageview',
  persistence: 'localStorage+cookie',
})
```

### Pattern 2: PostHog Server-Side Singleton
**What:** Singleton PostHog Node client for server actions/API routes with immediate flush
**When to use:** Server-side event capture (purchases, redemptions, key actions)
**Example:**
```typescript
// src/lib/posthog/server.ts
import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

export function getPostHogServer(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
        flushAt: 1,
        flushInterval: 0,
      }
    )
  }
  return posthogClient
}
```

### Pattern 3: PostHog User Identification in Middleware
**What:** Identify authenticated users to PostHog after login so client events have user context
**When to use:** After Supabase auth resolves the user in middleware or on dashboard load
**Example:**
```typescript
// In a client component that loads after auth (e.g., dashboard)
'use client'
import posthog from 'posthog-js'
import { useEffect } from 'react'

export function PostHogIdentify({ userId, email, role }: { userId: string; email: string; role: string }) {
  useEffect(() => {
    posthog.identify(userId, { email, role })
  }, [userId, email, role])
  return null
}
```

### Pattern 4: Analytics Page as Server Component with Client Chart Children
**What:** Fetch all analytics data server-side, pass to lightweight client chart components
**When to use:** Every analytics page -- keeps data fetching on server, only interactivity on client
**Example:**
```typescript
// app/(organizer)/organizer/events/[id]/analytics/page.tsx
export default async function EventAnalyticsPage({ params }) {
  const { id: eventId } = await params
  const supabase = await createClient()

  // Parallel queries
  const [ticketData, drinkData, tokenData, velocityData] = await Promise.all([
    fetchTicketRevenue(supabase, eventId),
    fetchDrinkSales(supabase, eventId),
    fetchTokenLifecycle(supabase, eventId),
    fetchDailyVelocity(supabase, eventId),
  ])

  return (
    <>
      <RevenueCard tickets={ticketData} drinks={drinkData} />
      <AttendanceCard data={ticketData} />
      <TicketVelocityChart data={velocityData} /> {/* client component */}
      <DrinkSalesBreakdown data={drinkData} />
      <TokenLifecycleCard data={tokenData} />
    </>
  )
}
```

### Pattern 5: Supabase Aggregate Queries for Analytics
**What:** Query existing tables with GROUP BY and aggregate functions server-side
**When to use:** All ANLY metrics -- no new tables needed, just smart queries
**Example:**
```typescript
// Ticket velocity: daily count of ticket sales for an event
async function fetchDailyVelocity(supabase, eventId: string) {
  const { data } = await supabase
    .from('tickets')
    .select('created_at')
    .eq('event_id', eventId)
    .order('created_at')

  // Group by date in JS (Supabase JS SDK doesn't support GROUP BY natively)
  const dailyCounts = new Map<string, number>()
  for (const ticket of data ?? []) {
    const day = ticket.created_at.split('T')[0]
    dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1)
  }
  return Array.from(dailyCounts.entries()).map(([date, count]) => ({ date, count }))
}
```

### Anti-Patterns to Avoid
- **Fetching analytics data client-side:** Never expose raw ticket/order data to the client. All aggregation happens server-side in Server Components.
- **Creating Supabase views/functions for simple aggregates:** The dataset sizes (typically <500 tickets, <1000 tokens per event) are small enough for JS aggregation after a simple SELECT. Don't over-engineer with SQL views.
- **PostHog for in-app analytics display:** PostHog is for behavioral tracking (pageviews, funnels, retention). The organizer-facing metrics come from Supabase directly, not from PostHog queries.
- **Adding PostHog provider wrapper:** With `instrumentation-client.ts`, no React provider is needed. Import `posthog` directly from `posthog-js` anywhere in client code.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pageview tracking | Custom event listeners | PostHog autocapture + `capture_pageview: 'history_change'` | Handles SPA navigation, UTM params, referrers automatically |
| User identification | Custom user tracking system | PostHog `identify()` + `$set` | Merges anonymous + authenticated sessions automatically |
| SVG chart rendering | Raw SVG path calculations | Recharts composable components | Tooltips, responsive containers, animations, axes all built-in |
| Date grouping for velocity | Complex SQL GROUP BY | JS Map after simple SELECT | Dataset sizes <500 per event, JS is simpler and more testable |

**Key insight:** The analytics data already exists in Supabase tables (tickets, drink_orders, drink_tokens, profiles). This phase is about querying and presenting existing data, not creating new data pipelines. PostHog is the only genuinely new infrastructure.

## Common Pitfalls

### Pitfall 1: PostHog Double-Counting Pageviews
**What goes wrong:** Both autocapture and manual `posthog.capture('$pageview')` fire, doubling pageview counts
**Why it happens:** Default PostHog config captures pageviews automatically. Adding manual captures creates duplicates.
**How to avoid:** Use `capture_pageview: 'history_change'` (enabled in defaults: '2025-11-30') and never manually capture `$pageview`. PostHog handles SPA navigation automatically.
**Warning signs:** Pageview counts are 2x expected values in PostHog dashboard

### Pitfall 2: PostHog Server-Side Events Not Flushing
**What goes wrong:** Events captured in server actions or API routes never arrive in PostHog
**Why it happens:** Serverless functions terminate before the batch flush interval fires
**How to avoid:** Initialize with `flushAt: 1, flushInterval: 0` so each capture sends immediately. Alternatively, call `await posthog.shutdown()` after captures.
**Warning signs:** Server-side events missing from PostHog, client-side events working fine

### Pitfall 3: Recharts SSR Hydration Mismatch
**What goes wrong:** Server-rendered chart HTML differs from client render, causing React hydration errors
**Why it happens:** Recharts uses browser APIs (window dimensions) for responsive sizing
**How to avoid:** Always mark chart components with `'use client'` directive. Use `<ResponsiveContainer>` wrapper. Don't attempt to SSR charts.
**Warning signs:** "Hydration mismatch" errors in console, charts flicker on load

### Pitfall 4: Revenue Calculation Missing Refunds
**What goes wrong:** Revenue summary shows gross amounts without accounting for refunds
**Why it happens:** Ticket refunds are in a separate `ticket_refunds` table, drink refunds change `drink_tokens.status` to 'refunded'
**How to avoid:** For ticket revenue: sum `tickets.amount_paid` minus sum of `ticket_refunds.amount` where status='approved'. For drink revenue: sum `drink_orders.total_amount` where status='completed', then subtract refunded tokens' prices.
**Warning signs:** Revenue numbers higher than actual SumUp payouts

### Pitfall 5: PostHog EU Instance Wrong Host
**What goes wrong:** Data sent to US instance instead of EU, GDPR non-compliance
**Why it happens:** Using `us.i.posthog.com` (default) instead of `eu.i.posthog.com`
**How to avoid:** Set `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com` explicitly. Verify in PostHog dashboard that instance is EU.
**Warning signs:** Data appears in US PostHog project, or no data appears at all

### Pitfall 6: Drink Revenue Counting Guest Orders
**What goes wrong:** Drink revenue for an event includes guest (anonymous) orders that may have been refunded
**Why it happens:** `drink_orders.user_id` can be NULL for guest orders. Must include all completed orders regardless of user_id.
**How to avoid:** Filter by `status = 'completed'` and `event_id`, not by user_id. Subtract refunded token prices separately.
**Warning signs:** Revenue discrepancies between ticket sales (members only) and drink sales (members + guests)

## Code Examples

### PostHog Client-Side Custom Event Capture
```typescript
// In any 'use client' component
import posthog from 'posthog-js'

// Track drink purchase
posthog.capture('drink_purchased', {
  event_id: eventId,
  total_amount: totalAmount,
  item_count: items.length,
})

// Track ticket purchase
posthog.capture('ticket_purchased', {
  event_id: eventId,
  tier_name: tierName,
  amount: amountPaid,
})

// Track token redemption
posthog.capture('token_redeemed', {
  event_id: eventId,
  drink_name: drinkName,
})
```

### PostHog Server-Side Capture in Server Action
```typescript
// In a server action (e.g., after successful payment webhook)
import { getPostHogServer } from '@/lib/posthog/server'

const posthog = getPostHogServer()
posthog.capture({
  distinctId: userId,
  event: 'purchase_completed',
  properties: {
    event_id: eventId,
    type: 'ticket',
    amount: amountPaid,
    tier: tierName,
  },
})
// No await shutdown needed with flushAt: 1
```

### Revenue Summary Query Pattern
```typescript
async function fetchEventRevenue(supabase, eventId: string) {
  const [ticketsResult, drinkOrdersResult, ticketRefundsResult, drinkRefundsResult] = await Promise.all([
    supabase.from('tickets').select('amount_paid').eq('event_id', eventId),
    supabase.from('drink_orders').select('total_amount').eq('event_id', eventId).eq('status', 'completed'),
    supabase.from('ticket_refunds').select('amount, ticket_id, tickets!inner(event_id)').eq('tickets.event_id', eventId).eq('status', 'approved'),
    supabase.from('drink_tokens').select('price').eq('event_id', eventId).eq('status', 'refunded'),
  ])

  const grossTickets = (ticketsResult.data ?? []).reduce((s, t) => s + t.amount_paid, 0)
  const grossDrinks = (drinkOrdersResult.data ?? []).reduce((s, d) => s + d.total_amount, 0)
  const ticketRefunds = (ticketRefundsResult.data ?? []).reduce((s, r) => s + r.amount, 0)
  const drinkRefunds = (drinkRefundsResult.data ?? []).reduce((s, t) => s + t.price, 0)

  return {
    grossTickets,
    grossDrinks,
    netTickets: grossTickets - ticketRefunds,
    netDrinks: grossDrinks - drinkRefunds,
    totalGross: grossTickets + grossDrinks,
    totalNet: (grossTickets - ticketRefunds) + (grossDrinks - drinkRefunds),
  }
}
```

### Recharts Bar Chart for Ticket Velocity
```typescript
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface VelocityData { date: string; count: number }

export default function TicketVelocityChart({ data }: { data: VelocityData[] }) {
  if (data.length === 0) return <p className="text-sm text-muted/60">No sales data yet</p>

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
            tickFormatter={(d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-card-border)', borderRadius: '0.75rem' }}
            labelStyle={{ color: 'var(--color-foreground)' }}
          />
          <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### Member Growth Area Chart
```typescript
'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface GrowthData { period: string; referral: number; organic: number; total: number }

export default function MemberGrowthChart({ data }: { data: GrowthData[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis dataKey="period" tick={{ fill: 'var(--color-muted)', fontSize: 10 }} />
          <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} allowDecimals={false} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-card-border)', borderRadius: '0.75rem' }} />
          <Area type="monotone" dataKey="referral" stackId="1" fill="var(--color-accent)" stroke="var(--color-accent)" fillOpacity={0.6} />
          <Area type="monotone" dataKey="organic" stackId="1" fill="#666" stroke="#666" fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### Attendance Rate Calculation
```typescript
async function fetchAttendanceRate(supabase, eventId: string) {
  const [soldResult, checkedInResult] = await Promise.all([
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('checked_in', true),
  ])

  const sold = soldResult.count ?? 0
  const checkedIn = checkedInResult.count ?? 0
  const rate = sold > 0 ? Math.round((checkedIn / sold) * 100) : 0

  return { sold, checkedIn, rate }
}
```

### Token Lifecycle Calculation
```typescript
async function fetchTokenLifecycle(supabase, eventId: string) {
  const { data: tokens } = await supabase
    .from('drink_tokens')
    .select('status')
    .eq('event_id', eventId)

  const all = tokens ?? []
  const total = all.length
  const redeemed = all.filter(t => t.status === 'redeemed').length
  const refunded = all.filter(t => t.status === 'refunded').length
  const purchased = all.filter(t => t.status === 'purchased').length

  return {
    total,
    redeemed,
    refunded,
    purchased,
    redeemedRate: total > 0 ? Math.round((redeemed / total) * 100) : 0,
    wastedRate: total > 0 ? Math.round((refunded / total) * 100) : 0,
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PostHogProvider wrapper component | `instrumentation-client.ts` init | Next.js 15.3 (2025) | No wrapper needed, simpler setup, earlier initialization |
| `capture_pageview: false` + manual tracking | `capture_pageview: 'history_change'` | PostHog defaults 2025-11-30 | Automatic SPA pageview tracking, no custom PageView component |
| Recharts 2.x | Recharts 3.x | 2024 | Improved tree-shaking, React 19 support, better TypeScript |
| posthog-node v4 | posthog-node v5 | 2025 | Better serverless support, TypeScript improvements |

**Deprecated/outdated:**
- **PostHogPageView component:** No longer needed with `capture_pageview: 'history_change'`
- **PostHogProvider in layout.tsx:** Not needed with `instrumentation-client.ts` approach
- **capture_pageview: false + usePathname tracking:** Replaced by automatic history_change mode

## Open Questions

1. **PostHog API key creation**
   - What we know: Need to create a PostHog EU Cloud project and get API key
   - What's unclear: Whether user has already created a PostHog account
   - Recommendation: Document the env vars needed (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`). Setup instructions can be inline comments.

2. **Ticket refunds joined query**
   - What we know: `ticket_refunds` references `ticket_id`, not `event_id` directly
   - What's unclear: Whether Supabase JS SDK supports the nested filter `tickets.event_id` in a join
   - Recommendation: If join filter doesn't work, fetch all refunds for the event's tickets in two steps: get ticket IDs for event, then get refunds for those IDs. Test during implementation.

3. **Analytics route placement**
   - What we know: Current sales pages are at `/admin/events/[id]/sales` and `/organizer/events/[id]/sales`
   - What's unclear: Whether to extend existing sales pages or create new `/analytics` routes
   - Recommendation: Create new `/analytics` route (broader scope than just sales) and link from event management. Keep existing `/sales` page as-is for backward compatibility.

## Sources

### Primary (HIGH confidence)
- [PostHog Next.js Docs](https://posthog.com/docs/libraries/next-js) - instrumentation-client.ts setup, App Router integration
- [PostHog Node.js Docs](https://posthog.com/docs/libraries/node) - Server-side capture, flushAt/flushInterval config
- [PostHog Pricing](https://posthog.com/pricing) - EU free tier: 1M events/month, 5K recordings
- [PostHog Capture API](https://posthog.com/docs/api/capture) - EU host: `eu.i.posthog.com` for public endpoints
- [Next.js instrumentation-client docs](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client) - Client-side init for Next.js 16.1.6
- [Recharts GitHub](https://github.com/recharts/recharts) - v3.8, composable React chart components

### Secondary (MEDIUM confidence)
- [PostHog SPA Pageviews Tutorial](https://posthog.com/tutorials/single-page-app-pageviews) - `capture_pageview: 'history_change'` config
- [posthog-js npm](https://www.npmjs.com/package/posthog-js) - v1.357.1 (March 2026)
- [posthog-node npm](https://www.npmjs.com/package/posthog-node) - v5.26.2 (March 2026)

### Tertiary (LOW confidence)
- None -- all critical findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official PostHog docs confirm Next.js 16 support with instrumentation-client.ts. Recharts v3 is the standard React charting library.
- Architecture: HIGH - Pattern follows existing project conventions (Server Components with client children, Supabase queries, motion components). No new architectural patterns needed.
- Pitfalls: HIGH - PostHog double-counting and flush issues are well-documented. Revenue calculation edge cases identified from schema analysis.

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable libraries, unlikely to change)
