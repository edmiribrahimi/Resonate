---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Refinement & Intelligence
status: in_progress
stopped_at: Completed 26-03-PLAN.md (Organizer CRUD UI + Sales Dashboard Discount Tracking)
last_updated: "2026-03-10T02:16:53Z"
progress:
  total_phases: 9
  completed_phases: 7
  total_plans: 20
  completed_plans: 20
---

# State: Resonate

## Project Reference

**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

**Stack:** Next.js 16 + Supabase + Tailwind CSS v4 + PWA (Vercel hosting)

**Current Focus:** v1.3 Refinement & Intelligence -- Phase 26 complete, Phase 27 next

## Current Position

**Phase:** Phase 26 (Discount Codes) -- COMPLETE
**Plan:** 3/3
**Status:** Phase 26 complete, ready for Phase 27

```
[Phase Progress]  ████████████████░░░░  7/9 phases
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 7/7 |
| Plans completed | 3/3 (Phase 20), 3/3 (Phase 21), 3/3 (Phase 22), 4/4 (Phase 23), 3/3 (Phase 24), 1/1 (Phase 25), 3/3 (Phase 26) |
| Requirements shipped | 54/54 |
| Phase 20 Plan 01 | 2 tasks, 219s |
| Phase 20 Plan 02 | 2 tasks, 213s |
| Phase 20 Plan 03 | 2 tasks, 118s |
| Phase 21 Plan 01 | 3 tasks, 248s |
| Phase 21 Plan 02 | 2 tasks, 188s |
| Phase 21 Plan 03 | 2 tasks, 537s |
| Phase 22 Plan 01 | 2 tasks, 136s |
| Phase 22 Plan 02 | 2 tasks, 229s |
| Phase 22 Plan 03 | 2 tasks, 183s |
| Phase 23 Plan 01 | 2 tasks, 171s |
| Phase 23 Plan 02 | 2 tasks, 153s |
| Phase 23 Plan 03 | 2 tasks, 200s |
| Phase 23 Plan 04 | 2 tasks, 167s |
| Phase 24 Plan 01 | 2 tasks, 214s |
| Phase 24 Plan 02 | 2 tasks, 269s |
| Phase 24 Plan 03 | 2 tasks, 282s |
| Phase 25 Plan 01 | 3 tasks, 229s |
| Phase 26 Plan 01 | 2 tasks, 211s |
| Phase 26 Plan 02 | 2 tasks, 173s |
| Phase 26 Plan 03 | 2 tasks, 233s |

## Decisions

- [20-01] Kept /dashboard URL despite "Account" label in nav (avoids middleware/redirect churn)
- [20-01] Passed actual role prop to StaffNav in organizer pages (role available from headers)
- [20-02] ManagementSection as client component with pre-fetched data props (parallel Promise.all queries in parent)
- [20-02] CSS grid-rows animation for collapsible sections (no motion library needed)
- [20-02] Management links verified against actual admin/organizer route paths
- [20-03] Attendee list is read-only (no tap-to-check-in); existing checkin API requires QR token
- [20-03] Search filtering done in JS after fetch (attendee lists per party typically <500)
- [20-03] Replaced collapsible attendance with always-visible flat list
- [21-02] Used inline Tailwind animate-pulse skeletons (Plan 01 primitives not yet available)
- [21-02] All loading.tsx files are Server Components (no "use client")
- [21-02] Each skeleton mirrors actual page layout (read page.tsx first, replicated structure)
- [21-01] CountUp imports useReducedMotion from motion/react (hook not available in motion/react-m, tree-shakes to ~1kb)
- [21-01] ToastContainer receives toasts as props from ToastContext (avoids double useContext call)
- [21-01] Toast icons are inline SVG (no external icon library dependency)
- [21-03] EventTabs tab switcher buttons keep CSS active:scale-* (simple nav, not high-value interactive cards)
- [21-03] DrinkMenu quantity +/- buttons keep CSS active:scale-95 (small utility buttons)
- [21-03] Event detail artist link chips keep CSS active:scale-95 (link elements, not primary actions)
- [21-03] Order Drinks button in DrinkMenu upgraded to PressableButton (primary purchase action, auto-added)
- [22-01] PostHog init guarded with typeof window check + env var presence (no crash without config)
- [22-01] Server singleton uses no-op object when NEXT_PUBLIC_POSTHOG_KEY is missing (safe local dev)
- [22-01] PostHogIdentify placed in dashboard only (PostHog persists identity across pages via localStorage)
- [22-01] Role defaults to "member" when x-user-role header is null
- [22-03] Weekly/monthly toggle uses Link-based navigation with search params (server-side re-render, no client state)
- [22-03] Cumulative member counts computed in JS after simple profiles SELECT (no SQL GROUP BY needed)
- [22-02] Two-step ticket refund lookup (get ticket IDs first, then query refunds) to avoid unreliable Supabase nested join filters
- [22-02] DrinkSalesBreakdown is Server Component (no animation), other cards are client components for CountUp
- [22-02] Revenue card uses accent gradient border to visually distinguish from standard cards
- [22-02] Stacked progress bar in TokenLifecycleCard shows green/red/gray for redeemed/refunded/pending
- [22-02] Attendance progress bar color-coded by threshold (green >=70%, yellow 40-70%, muted below)
- [22-03] ISO week calculation done in pure JS (no date-fns dependency)
- [23-02] Drink popularity reuses existing DrinkSalesItem data (sorted by quantity instead of revenue)
- [23-02] Organizer gets MarketInsightsCard only; DrinkPopularityChart and PurchaseFunnelChart are admin-only per ANLY-10/ANLY-15 scope
- [23-02] Peak purchase hours use client-side Date.getHours() on UTC timestamps (consistent with existing codebase pattern)
- [23-01] fetchKPIDashboard uses getServiceClient() to bypass RLS for cross-user revenue aggregation
- [23-01] Revenue is gross (tickets + drinks) at overview level -- no refund deduction for simplicity
- [23-01] Recent activity merges latest 10 tickets + 10 drinks, sorts by date, takes top 10
- [23-01] RecentActivityFeed is a Server Component (no animation needed, just data display)
- [23-03] All 4 cross-event queries use getServiceClient() to bypass RLS (cross-user aggregation requires service role)
- [23-03] Guest conversion detection via profile.created_at > drink_order.created_at (order before registration = was guest)
- [23-03] ReferralChainTable uses native HTML details/summary for collapsible rows (no JS state needed)
- [23-03] MemberSpendTable follows DrinkSalesBreakdown responsive pattern (hidden/block for table vs cards)
- [23-04] fetchEventComparison runs all per-event queries in parallel with nested Promise.all for optimal performance
- [23-04] EventSelector uses useRouter().push() with URL search params for server-side re-render on selection change
- [23-04] Per-attendee mode is default (fair comparison per research recommendation)
- [23-04] Mode toggle uses Link-based navigation preserving event selection in search params
- [24-01] tier_id made nullable (not hidden tier approach) -- simpler, ticket_type already distinguishes guest list tickets
- [24-01] approveRefund gracefully handles free tickets (skip SumUp, update records, delete ticket)
- [24-01] adminRefund throws error on free tickets (complimentary ticket safety net)
- [24-01] Email matching in trigger uses LOWER() for case-insensitive comparison
- [24-02] Recovery link type (not invite) for password-set URL to avoid duplicate user creation
- [24-02] Existing users get ticket URL instead of password-set link in invitation email
- [24-02] 500ms delay after createUser to allow handle_new_user trigger to create profile row
- [24-02] ilike for case-insensitive email matching in profiles lookup
- [24-02] maybeSingle instead of single for profile lookup to avoid error on no match
- [24-03] Dynamic import for processGuestEntry in bulkAddGuests (graceful handling when Plan 02 not yet executed)
- [24-03] PapaParse client-side parsing with header normalization (trim, lowercase, underscore spaces)
- [24-03] Clone only copies name+email, does NOT auto-process entries (organizer triggers manually)
- [24-03] Attendance API sorts unchecked first then alphabetical for check-in usability
- [24-03] POST check-in returns 409 for already-checked-in guests (idempotent with feedback)
- [24-03] fetchOrganizerEvents filters to only events with guest list entries (avoids empty clone sources)
- [25-01] CSVImport rendered between add guest form and summary stats (natural workflow position)
- [25-01] Guest List link placed between Sales and Media in EventList actions (logical grouping)
- [25-01] Purple badge for guest list entries in scanner (visual distinction from ticket holders)
- [25-01] PostHog capture calls placed after successful DB operations but before return (non-blocking analytics)
- [26-01] Junction table (discount_code_tiers) for many-to-many discount-to-tier mapping instead of nullable tier_id
- [26-01] Open SELECT RLS for discount_codes (buyers validate codes; distribution via passaparola)
- [26-01] Italian error messages for discount code validation (Codice non valido, Codice non piu attivo, Codice esaurito)
- [26-01] p_discount_code_id DEFAULT NULL preserves backward compatibility with existing reserve_ticket() calls
- [26-02] Explicit "Applica" button for discount code validation (not debounced input, clearer UX)
- [26-02] Discount code input hidden for event-level tiers (partyId null) since codes are party-scoped
- [26-02] Client-side EUR 1.00 guard: tiers below minimum keep original price display (no green price)
- [26-02] Anonymous user intent preserves discountCodeId in localStorage for post-registration purchase
- [26-03] Tier selection via multi-checkbox for better mobile UX (not multi-select dropdown)
- [26-03] DiscountCodeCard derives selectedTierIds from tier_names matching (display-to-id resolution)
- [26-03] Backward-compatible discountSummary prop (optional, existing SalesDashboard usage unchanged)
- [26-03] Admin sales page receives identical discount tracking to organizer sales page

## Accumulated Context

### From v1.2
- Singleton SDK pattern for @sumup/sdk
- Server-side cursor extraction for pagination
- Scanner page uses server/client split for MobileNav
- Member search uses getServiceClient() to bypass RLS
- RefundDialog fee warning conditional on payout_date
- Auto-refund cron runs daily at 07:00 UTC

### Roadmap Evolution
- Phase 26 added: Discount Codes (percentage/fixed discounts for ticket tiers, case-insensitive, usage limits, SumUp €1 minimum guard)
- Phase 27 added: Guest Navigation Fix (Home tab for non-authenticated guests → landing page with registration CTA)
- Phase 28 added: Single Event Tier Fix (hide event pass tier when event has only one sub-event)

### v1.3 Roadmap Notes
- Phase numbering starts at 20 (v1.2 ended at 19)
- App Audit deferred to v1.4 (AUDT requirements excluded)
- Analytics split into infrastructure (Phase 22) and dashboard (Phase 23)
- Guest List is most complex phase -- touches auth trigger, creates new ticket type, new table
- Research needed for Phase 22 (PostHog EU, instrumentation-client.ts) and Phase 24 (auth.admin.createUser, handle_new_user trigger)
- Motion v12 with LazyMotion (~4.6kb bundle) for animations
- PostHog EU instance free tier: 1M events/month, 5K session recordings

## Blockers

(None)

## Session Continuity

**Last session:** 2026-03-10T02:16:53Z
**Stopped at:** Completed 26-03-PLAN.md (Organizer CRUD UI + Sales Dashboard Discount Tracking)
**Next step:** Execute Phase 27 (Guest Navigation Fix)

---
*State initialized: 2026-03-09*
*Last updated: 2026-03-10T02:16:53Z*
