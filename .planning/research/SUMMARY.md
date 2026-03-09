# Research Summary: v1.3 Refinement & Intelligence

**Project:** Resonate -- Private Music Events Community Platform
**Synthesized:** 2026-03-09
**Inputs:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Overall Confidence:** HIGH

---

## Executive Summary

Resonate v1.3 adds five capabilities to a mature Next.js 16 + Supabase platform: analytics/data collection, a full app audit, UI animation polish, per-event guest lists, and admin navigation consolidation. Research confirms this is achievable with only 5 new npm packages (3 production, 2 dev-only) and zero architectural restructuring. The existing Server Actions + Supabase + App Router patterns extend naturally to all five feature areas.

The most consequential architectural decision is the **hybrid analytics strategy**: PostHog Cloud (EU instance, free tier -- 1M events/month, 5K session recordings) for behavioral analytics combined with a custom `analytics_events` Supabase table for business-critical transactional data. This avoids vendor lock-in for financial metrics while gaining professional funnels, session replay, and dashboards for free. The ARCHITECTURE.md researcher recommended server-side-only analytics without PostHog, but this conflicts with FEATURES.md findings that building funnels, retention charts, and session replay from scratch would take months. The hybrid approach is the correct trade-off: PostHog for product analytics, SQL views on existing tables for financial reporting.

The **highest-risk feature is the guest list**, which touches the auth trigger (`handle_new_user()`), creates a new ticket type (free/complimentary), and must coexist with the referral-gating system without undermining it. Three separate pitfalls (auth bypass, existing member conflicts, financial tracking blind spots) converge here. This demands careful database schema design upfront -- specifically an `approved_via` column on profiles, a `ticket_type` column on tickets, and check-before-create logic in the processing pipeline. The lowest-risk features are navigation consolidation and UI animations, both of which are pure UI refactors with no data model changes.

---

## Key Findings

### From STACK.md

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| `posthog-js` + `posthog-node` | Behavioral analytics (client + server) | Free tier sufficient (1M events/month). EU instance for GDPR. Supabase themselves use PostHog. |
| `motion` (v12.35.x) | UI animations | Formerly Framer Motion. React 19 compatible (fix in v12.1.0). `LazyMotion` reduces bundle to ~4.6kb. |
| `@next/bundle-analyzer` (v16.1.6) | Bundle size audit | Matches project Next.js version exactly. One-time audit tool. |
| `eslint-plugin-jsx-a11y` (v6.x) | Accessibility linting | ESLint 9 flat config support confirmed. Permanent dev dependency. |
| Lighthouse CI (via npx) | Performance/a11y/SEO auditing | No install needed. Includes axe-core internally. |

**Critical: `@axe-core/react` does NOT support React 18+.** Deque has deprecated the React wrapper. Use `eslint-plugin-jsx-a11y` + Lighthouse instead.

**New environment variables:** `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` (EU: `https://eu.i.posthog.com`).

### From FEATURES.md

**Must-have (v1.3 incomplete without these):**
- PostHog setup + user identification (immediate analytics value)
- Revenue + sales summary per event (organizers need financial visibility)
- Member growth + token lifecycle SQL views (community health metrics)
- 4-tab bottom nav maximum (Events, Gallery, Scanner, Account)
- Role-aware Account page with management links
- Component enter animations + skeleton loading states
- Toast notifications for action feedback
- Basic guest list (add by name+email, view status, send invite)
- Auto-registration for guest list non-members
- Free ticket generation for guest list members
- Security headers + server action input validation audit
- `eslint-plugin-jsx-a11y` integration + accessibility fixes

**Defer to v1.4+:**
- Conversion funnel visualization, session replay analysis, event comparison view
- Per-member spend profiles, guest-to-member conversion tracking
- Reusable guest list templates, CSV bulk import
- Referral chain effectiveness, layout animations on filter/sort

**Anti-features (explicitly avoid):**
- Custom analytics dashboard UI from scratch (PostHog provides this)
- Any charting library (Chart.js, Recharts) -- duplicates PostHog
- Page-level AnimatePresence route transitions (broken in Next.js App Router as of 2026)
- Public RSVP wall (contradicts private community model)
- SMS invitations, plus-one management, AI recommendations
- WCAG AAA compliance (AA is the target; AAA conflicts with dark theme aesthetics)

### From ARCHITECTURE.md

**Two new database tables:**
1. `analytics_events` -- Single table with `event_type` discriminator + `metadata` JSONB. No RLS needed (service client only). Indexes on `event_type`, `created_at`, `event_id`.
2. `guest_list_entries` -- Per-event entries with `status` (pending/processed/failed), linked `profile_id` and `ticket_id` after processing. UNIQUE constraint on `(event_id, email)`.

**Key patterns:**
- `trackEvent()` utility: fire-and-forget server-side function called from existing Server Actions after successful operations. Zero client bundle cost for business event tracking.
- `AnimatedSection` client wrapper: thin `"use client"` component wrapping `motion.div` with `whileInView`. Keeps animation boundary narrow; does not force parent Server Components to become client components.
- Atomic guest processing: each entry is fully processed (profile + approval + ticket) or marked as failed with an error message. No partial states.
- Dashboard as account hub: role-conditional "Staff Tools" section with link cards to admin/organizer routes. MobileNav drops to 3 tabs.

**Analytics dashboard queries existing tables directly** (tickets, drink_orders, profiles, attendance) for definitive counts. The `analytics_events` table supplements with behavioral data that existing tables do not capture.

### From PITFALLS.md

**Top 5 pitfalls with prevention strategies:**

| # | Pitfall | Severity | Prevention |
|---|---------|----------|------------|
| 1 | Guest list auto-registration bypasses referral gating | CRITICAL | Add `approved_via` column to profiles. Modify `handle_new_user()` trigger to check `guest_list_event_id` in user metadata. Check-before-create for existing members. |
| 2 | Analytics tracking inflates client bundle, degrades Core Web Vitals | CRITICAL | Server-side `trackEvent()` for business events (zero bundle cost). PostHog loaded via `lazyOnload` strategy. Measure LCP/TBT before and after. |
| 3 | Broad app audit introduces regressions across stable features | CRITICAL | Risk-categorize findings (LOW/MEDIUM/HIGH). Isolated commits for HIGH-risk items. Manual regression checklist for critical flows. Never bundle security fixes with UX tweaks. |
| 4 | Guest list free tickets bypass SumUp revenue tracking | CRITICAL | Add `ticket_type` column (`purchased`/`guest_list`/`complimentary`). Update SalesDashboard to show paid vs free. Refund flow must check `amount_paid > 0`. |
| 7 | Guest list conflicts with existing member records | MODERATE | Before auto-registering, check `auth.users` for existing email. Before creating free ticket, check for existing ticket at same event. |

**Cross-feature conflict warnings:**
- Guest list + referral system: auto-approval must not permanently devalue referral gating. Consider scoping guest approval to event-level, not permanent community membership.
- Analytics + animations: compounding performance hit. Add sequentially, measure after each.
- Nav consolidation before analytics: track the final navigation structure, not a transitional one.
- App audit must not run in parallel with feature work -- audit the stable codebase, then build on top.

---

## Implications for Roadmap

### Resolving Phase Order Conflicts

The three research files that suggest phase ordering disagree:

- **FEATURES.md:** Nav -> Audit -> Elegance -> Analytics -> Guest List
- **ARCHITECTURE.md:** Analytics+Nav -> Analytics+Elegance -> Audit -> Guest List -> Dashboard
- **PITFALLS.md:** Audit -> Nav -> Guest List -> Elegance -> Analytics

**Synthesized recommendation:** The FEATURES.md ordering is the strongest because it prioritizes foundational changes (nav structure, quality baseline) before adding new capabilities. However, I adjust it based on pitfall analysis: Scanner must stay prominent in nav (PITFALLS), and the audit should establish quality patterns (Zod validation, error boundaries, loading states) that subsequent phases reuse.

### Recommended Phase Structure (5 phases, starting from Phase 20)

**Phase 20: Navigation Consolidation**
- Delivers: 4-tab bottom nav (Events, Gallery, Scanner, Account), role-aware Account page, Staff Tools section
- Features: Nav consolidation table stakes + differentiators from FEATURES.md Category 5
- Pitfalls to avoid: Scanner access regression (keep at 1-2 taps), z-index conflicts (modals z-[60], MobileNav z-50)
- Rationale: Smallest scope, zero new dependencies, zero data model changes. Creates the Account page structure where analytics links and guest list management will live. Must happen before analytics so tracking reflects the final navigation structure.
- Research needed: NO -- standard UI refactor with well-documented patterns

**Phase 21: App Audit**
- Delivers: Security headers, server action input validation (Zod), accessibility fixes, performance baseline, error boundaries, loading skeletons, SEO metadata on public pages
- Features: App audit table stakes from FEATURES.md Category 2 + JSON-LD structured data
- Pitfalls to avoid: Regressions (risk-categorize findings, isolated commits), dark theme breakage from a11y fixes (brand-consistent focus ring using `--accent`), SEO conflicting with private model (only public pages)
- Rationale: Establishes quality patterns (Zod schemas, error.tsx, loading.tsx) reused by all subsequent phases. Creates the performance baseline that animations and analytics are measured against. Security hardening before guest list (which creates auth users programmatically).
- Research needed: NO -- audit generates its own findings. Lighthouse + bundle analyzer produce the research.

**Phase 22: Layout Elegance**
- Delivers: Motion library integration, AnimatedSection wrapper, skeleton loading states, toast notifications, enter animations, micro-interactions (whileTap/whileHover), scroll-triggered reveals
- Features: Layout elegance table stakes + staggered lists + scroll reveals from FEATURES.md Category 3
- Pitfalls to avoid: Hydration mismatches (use `initial={false}` where needed, thin client wrappers), over-animation (max 300ms, ease-out, meaningful transitions only), bundle bloat (LazyMotion + domAnimation = ~4.6kb), iOS safe-area layout shifts (never animate MobileNav dimensions)
- Rationale: Post-audit means animations apply to already-optimized components. Creates reusable animation patterns (AnimatedSection, StaggeredList, SkeletonCard) used by analytics dashboard and guest list pages. Respect `prefers-reduced-motion`.
- Research needed: NO -- Motion API is stable and well-documented

**Phase 23: Analytics & Data Collection**
- Delivers: PostHog Cloud setup (EU), `analytics_events` Supabase table, `trackEvent()` utility, PostHog user identification on auth, custom events in purchase/redeem flows, SQL views for revenue/token/member summaries, admin KPI cards
- Features: Analytics table stakes + per-member spend profile + drink popularity + session replay from FEATURES.md Category 1
- Pitfalls to avoid: Client bundle bloat (server-side trackEvent for business events, PostHog via lazyOnload), GDPR exposure (EU instance, separate operational analytics from behavioral tracking, data retention policy), analytics schema without migration strategy (JSONB metadata column for flexibility)
- Rationale: Benefits from final navigation structure (Phase 20), quality patterns (Phase 21), and animation components (Phase 22). PostHog starts collecting data immediately, making the dashboard valuable from day one. Privacy strategy (operational vs behavioral tracking) must be defined at phase start.
- Research needed: YES -- PostHog EU GDPR specifics, `instrumentation-client.ts` integration with Next.js 16 App Router, data retention cron job pattern

**Phase 24: Guest List Management**
- Delivers: `guest_list_entries` table, guest CRUD UI (admin + organizer), auto-registration via `supabase.auth.admin.createUser()`, auto-approval, free ticket generation, invitation email template, guest list per party
- Features: Guest list table stakes + per-party guest lists + auto-approval on email match from FEATURES.md Category 4
- Pitfalls to avoid: Auth trigger bypass (modify `handle_new_user()` to check metadata, add `approved_via` column), existing member conflicts (check-before-create), financial blind spots (add `ticket_type` column, update SalesDashboard), Supabase rate limits on bulk operations (batch processing with status tracking)
- Rationale: Most complex feature -- new table, auth flow changes, email template, free ticket logic. Benefits from all prior phases: clean nav (20), validated patterns and Zod schemas (21), animation components and toasts (22), PostHog tracking for guest processing events (23). Auth trigger modification is the riskiest change in v1.3 and benefits from a stable, well-audited codebase.
- Research needed: YES -- `supabase.auth.admin.createUser()` password reset flow for newly created users, `handle_new_user()` trigger modification strategy, batch processing rate limits

---

## Research Flags

| Phase | Needs `/gsd:research-phase`? | Reason |
|-------|------------------------------|--------|
| Phase 20 (Nav) | NO | Pure UI refactor, no new patterns |
| Phase 21 (Audit) | NO | Generates its own findings via tooling |
| Phase 22 (Elegance) | NO | Motion API well-documented, animation patterns standard |
| Phase 23 (Analytics) | YES | PostHog EU setup, instrumentation-client.ts integration, GDPR data retention |
| Phase 24 (Guest List) | YES | Auth trigger modification, admin.createUser() flow, password reset for auto-created users, batch processing limits |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified on npm with correct versions. PostHog free tier limits confirmed. Motion React 19 compatibility verified. |
| Features | HIGH | Competitor analysis covers 6 platforms. Table stakes vs differentiators clearly delineated. Anti-features well-justified. |
| Architecture | HIGH | Extends existing patterns. No restructuring. Two new tables with clean schemas. trackEvent() follows existing fire-and-forget pattern. |
| Pitfalls | HIGH | 14 pitfalls identified with concrete prevention strategies. Cross-feature conflicts mapped. All critical pitfalls from direct codebase analysis. |

### Gaps to Address During Planning

1. **PostHog EU GDPR specifics** -- Verify data processing agreement and retention controls at posthog.com/docs/privacy before Phase 23 starts
2. **Guest auto-registration password flow** -- Test `supabase.auth.admin.createUser()` with `email_confirm: true` to confirm what email the guest receives and how they set their password
3. **handle_new_user() trigger modification** -- The trigger currently has no mechanism to signal "skip referral check." Determine whether to modify the trigger or work around it.
4. **Bundle size after PostHog + Motion** -- Measure actual impact. PostHog (~5kb with lazyOnload) + Motion (~4.6kb with LazyMotion) should total ~10kb gzipped, but verify.
5. **Guest list and referral system coexistence** -- Business rule needed: do guest-list-approved users keep permanent community access, or is it event-scoped?
6. **AnimatePresence behavior with loading.tsx** -- Motion docs confirm `AnimatePresence` works with conditional rendering, but test with Next.js streaming/Suspense boundaries

---

## Aggregated Sources

### Stack & Integration
- [PostHog Next.js Docs](https://posthog.com/docs/libraries/next-js)
- [PostHog Pricing](https://posthog.com/pricing) -- Free tier: 1M events/month, 5K recordings
- [How Supabase Uses PostHog](https://posthog.com/customers/supabase)
- [Motion.dev](https://motion.dev/) -- Official docs, React 19 compatibility, LazyMotion
- [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer) -- v16.1.6
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) -- ESLint 9 flat config

### Features & Competitors
- [Eventbrite Analytics + Guest List](https://www.eventbrite.com/help/en-us/articles/569587/create-a-guest-list-and-manage-guests/)
- [Luma Help Center](https://help.luma.com/)
- [Partiful Guest Management](https://help.partiful.com/hc/en-us/sections/30470926071195--Managing-Guest-List)
- [zkipster RSVP Platform](https://www.zkipster.com/online-invitations-rsvp)
- [NNG Mobile Navigation Patterns](https://www.nngroup.com/articles/mobile-navigation-patterns/)

### Architecture
- [Framer Motion with Next.js Server Components](https://www.hemantasundaray.com/blog/use-framer-motion-with-nextjs-server-components)
- [Hatchet: PostgreSQL Events Table Patterns](https://hatchet.run/blog/postgres-events-table)
- [Supabase Custom Analytics](https://bootstrapped.app/guide/how-to-create-custom-analytics-with-supabase)

### Pitfalls
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Common mistakes with Next.js App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)
- [Supabase RLS Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

*Research synthesis: 2026-03-09 -- v1.3 Refinement & Intelligence*
