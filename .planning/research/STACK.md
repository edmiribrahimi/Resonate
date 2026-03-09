# Technology Stack: v1.3 Refinement & Intelligence

**Project:** Resonate -- Private Music Events Community Platform
**Researched:** 2026-03-09
**Scope:** Stack additions for analytics/data collection, app audit tooling, UI animations, guest list, admin nav consolidation
**Existing stack (NOT re-researched):** Next.js 16.1.6, React 19.2.3, Supabase (JS SDK 2.97.0, SSR 0.8.0), Tailwind CSS 4.x, PWA, SumUp SDK 0.1.1, Resend, React Email, Orbitron font

---

## Recommended Additions

### 1. Analytics: PostHog Cloud (Free Tier) + Custom Supabase Events Table

**Approach: Hybrid** -- PostHog for behavioral analytics (pageviews, funnels, session replay), custom Supabase table for business-critical transactional data (drink purchases, expired tokens, revenue metrics).

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `posthog-js` | ^1.357.x | Client-side behavior tracking, pageviews, custom events, session replay | Industry-standard product analytics with generous free tier (1M events/month). React hooks (`usePostHog`), automatic pageview capture, and `instrumentation-client.ts` support for Next.js 15.3+. |
| `posthog-node` | ^5.26.x | Server-side event capture from server actions and API routes | Required for tracking server-side events (drink purchases, token redemptions, refunds). Singleton pattern with `flushAt: 1` and `flushInterval: 0` for short-lived serverless functions. |

**Why PostHog Cloud (not self-hosted, not custom-only, not Mixpanel):**

- **Free tier is more than enough:** 1M events/month, 5K session recordings, unlimited team size. A community event app with ~100-1000 users will never hit these limits.
- **Zero infrastructure:** No Docker containers, no maintenance. PostHog Cloud just works on Vercel.
- **Session replay included:** See exactly how users interact with the drink menu, ticket purchasing, and event pages. This is worth the integration alone.
- **Supabase themselves use PostHog** -- confirmed in PostHog's customer stories. The integration is well-tested.
- **Not Mixpanel:** PostHog is open-source, has a more generous free tier, and does not require enterprise plans for basic features like funnels and retention.
- **Not custom-only:** Building a full analytics dashboard from scratch (charting, funnels, cohorts, retention) would be a massive effort. PostHog gives this out of the box.

**Why ALSO a custom Supabase events table:**

PostHog is excellent for product analytics but your transactional/business data (drink revenue per event, expired token counts, ticket sales trends) already lives in Supabase. Rather than piping everything to PostHog, query these aggregations directly from PostgreSQL with simple SQL views. This avoids vendor lock-in for critical business metrics.

**Custom analytics_events table (Supabase):**

```sql
CREATE TABLE public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  event_id UUID REFERENCES public.events(id),
  party_id UUID REFERENCES public.event_parties(id),
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_event ON public.analytics_events(event_id);
CREATE INDEX idx_analytics_events_created ON public.analytics_events(created_at);

-- RLS: allow inserts from authenticated users, reads only for admins/organizers
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
```

**Events to track in this table:**
- `drink_purchase` (amount, items, guest vs member)
- `token_expired` (order_id, amount_refunded)
- `ticket_purchase` (tier, amount)
- `ticket_refund` (amount, reason)
- `member_joined` (referred_by, auto_approved)
- `guest_list_added` (event_id, added_by)

**PostHog setup pattern (Next.js 16 App Router):**

Client-side: Use `instrumentation-client.ts` (supported since Next.js 15.3) for lightweight initialization -- no provider wrapping needed for basic tracking. For `usePostHog()` hook in components, add a `PostHogProvider` in `app/layout.tsx`.

Server-side: Create `src/lib/posthog.ts` with a singleton `PostHog` node client. In server actions, call `posthog.capture()` then `await posthog.flush()`.

**Environment variables:**
```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Use the EU instance (`eu.i.posthog.com`) for GDPR compliance since Resonate operates in Italy/EU.

**Confidence:** HIGH -- PostHog's Next.js App Router integration is extensively documented. Free tier limits verified via official pricing page. `instrumentation-client.ts` support verified for Next.js 15.3+.

---

### 2. UI Animations: Motion (formerly Framer Motion)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `motion` | ^12.35.x | Micro-interactions, page transitions, layout animations, exit animations | The de-facto React animation library. 30M+ npm downloads/month. Declarative API (`animate`, `exit`, `layout`) that works naturally with React 19 and Tailwind CSS v4. |

**Why `motion` (not `framer-motion`, not CSS-only, not GSAP):**

- **`motion` is the new package name.** Framer Motion was rebranded to "Motion" in late 2024. The `motion` package is the maintained version. `framer-motion` still works (same API) but new projects should use `motion` with imports from `motion/react`.
- **React 19 compatibility:** AnimatePresence bug in React 19 strict mode was fixed in v12.1.0 (Feb 2025). Current v12.35.x is fully compatible.
- **Tailwind CSS v4 integration is clean:** Motion handles animation via inline styles and native browser animations, which override Tailwind classes without conflict. Let Tailwind handle static styling, let Motion handle animation.
- **Not CSS-only animations:** Tailwind's built-in `animate-*` utilities are fine for simple loading spinners, but insufficient for exit animations (`AnimatePresence`), layout transitions, gesture-based interactions, and coordinated staggered animations.
- **Not GSAP:** GSAP is timeline-based and imperative. Motion is declarative and React-native. For a React app, Motion integrates with the component lifecycle naturally. GSAP also has licensing complexity for commercial use.

**Bundle size considerations:**

Full Motion bundle is ~34kb (gzipped). This can be reduced to ~4.6kb using `LazyMotion` + `domAnimation` feature set for initial render, with full features loaded asynchronously. For Resonate's use case (micro-interactions, not complex timeline animations), the `domAnimation` subset is sufficient:

```typescript
import { LazyMotion, domAnimation } from "motion/react";

// Wrap app or specific pages
<LazyMotion features={domAnimation}>
  {children}
</LazyMotion>
```

**Specific use cases for Resonate v1.3:**

1. **Page transitions:** `AnimatePresence` with `mode="wait"` for smooth route transitions
2. **Card/list animations:** Staggered entry for event cards, drink menu items
3. **Modal transitions:** Bottom-sheet slide-up on mobile (matches existing z-[60] pattern)
4. **Layout animations:** `layout` prop for smooth reordering when filtering/sorting
5. **Micro-interactions:** Button press feedback, icon state changes, toggle transitions
6. **Scroll-triggered reveals:** `whileInView` for content appearing as user scrolls

**Confidence:** HIGH -- Motion v12.35.x verified on npm. React 19 compatibility confirmed. Tailwind CSS v4 integration documented on motion.dev.

---

### 3. App Audit Tooling (Dev Dependencies -- ONE-TIME USE)

These tools are for the audit phase only. They produce reports, inform fixes, then can be removed.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@next/bundle-analyzer` | ^16.1.6 | Visualize JavaScript bundle sizes | Matches Next.js 16.1.6. Generates interactive treemap of bundles. Essential for identifying bloat before optimizing. |
| `eslint-plugin-jsx-a11y` | ^6.x | Static accessibility linting for JSX | Catches a11y issues at lint time (missing alt text, improper ARIA roles, etc). Supports ESLint 9 flat config via `jsxA11y.flatConfigs.recommended`. |
| Lighthouse CI (CLI) | latest | Automated performance, a11y, SEO, best practices audits | Run `npx @lhci/cli autorun` against production build. Generates reports for all audit domains. No npm install needed (use npx). |

**IMPORTANT: `@axe-core/react` is NOT recommended.** It does not support React 18+, and Resonate uses React 19.2.3. Deque has deprecated the React wrapper. Use `eslint-plugin-jsx-a11y` for build-time checks and Lighthouse for runtime accessibility audits instead.

**Why these tools and not others:**

- **`@next/bundle-analyzer`** is official from the Next.js team, matches the project's Next.js version exactly. No alternative needed.
- **`eslint-plugin-jsx-a11y`** is the only maintained static a11y linter for JSX/React. It now supports ESLint 9 flat config, which matches eslint-config-next's setup.
- **Lighthouse CI via `npx`** avoids installing yet another dev dependency. Run it once, get the report, fix issues. Lighthouse includes axe-core internally for accessibility testing.

**Audit workflow (run once, not permanent):**

```bash
# 1. Bundle analysis
ANALYZE=true npm run build   # with @next/bundle-analyzer configured

# 2. Lighthouse audit (production build required)
npm run build && npm start &
npx @lhci/cli autorun --collect.url=http://localhost:3000

# 3. Accessibility lint (permanent -- keep in eslint config)
# Already runs via eslint on every lint
```

**Confidence:** HIGH -- `@next/bundle-analyzer` v16.1.6 verified on npm. `eslint-plugin-jsx-a11y` flat config support confirmed via GitHub issues. Lighthouse CI is Google-maintained.

---

### 4. Guest List: Database Changes Only (No New Libraries)

The guest list feature requires new Supabase tables and server actions, NOT new npm packages.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase (existing) | N/A | Guest list storage, RLS policies, auto-registration logic | All guest list logic is CRUD operations + server actions. Adding a library for this would be over-engineering. |

**New database table:**

```sql
CREATE TABLE public.guest_list_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  party_id UUID REFERENCES public.event_parties(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'no_show')),
  auto_register BOOLEAN DEFAULT false,
  auto_approve BOOLEAN DEFAULT false,
  free_ticket BOOLEAN DEFAULT false,
  ticket_id UUID REFERENCES public.tickets(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_guest_list_event ON public.guest_list_entries(event_id);
CREATE INDEX idx_guest_list_email ON public.guest_list_entries(email);
```

**Guest list flow:**
1. Organizer adds names to guest list (with optional email)
2. If `auto_register = true` and email provided: system creates a pending profile
3. If `auto_approve = true`: profile is auto-approved (skips approval queue)
4. If `free_ticket = true`: free ticket generated automatically
5. Guest receives email invitation (via existing Resend integration)

**No new npm packages needed.** This is 100% server actions + Supabase queries + existing email infrastructure.

**Confidence:** HIGH -- Standard CRUD pattern with Supabase. No new technology required.

---

### 5. Admin Navigation Consolidation: No New Libraries

The admin/organizer navigation consolidation into the account button is a pure UI refactor. No new libraries.

**Implementation approach:**
- Move admin/organizer links from sidebar/separate nav into a dropdown menu anchored to the account avatar/button
- Role-based menu items (master sees admin links, organizer sees organizer links, member sees member links)
- Use Motion (from section 2) for dropdown animation
- No new routing changes -- just UI reorganization

**Confidence:** HIGH -- Pure UI work using existing stack.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Analytics | PostHog Cloud (free) | Custom Supabase-only analytics | Building funnels, retention charts, session replay from scratch is months of work. PostHog gives this free. |
| Analytics | PostHog Cloud (free) | Mixpanel | Less generous free tier, closed-source, more expensive at scale. |
| Analytics | PostHog Cloud (free) | Google Analytics | Not designed for product analytics. No session replay. Privacy concerns for EU users. |
| Analytics | PostHog Cloud (free) | Self-hosted PostHog | Unnecessary infrastructure burden for a small community app. Cloud free tier is sufficient. |
| Analytics | Hybrid (PostHog + Supabase table) | PostHog-only | Business metrics (revenue, refunds) belong in your database. Don't depend on PostHog for financial reporting. |
| Animations | Motion (`motion`) | Framer Motion (`framer-motion`) | Same library, but `motion` is the current package name. Use the new one for new installs. |
| Animations | Motion | CSS animations + Tailwind animate-* | Insufficient for exit animations, layout transitions, gesture interactions. |
| Animations | Motion | GSAP | Imperative API, licensing complexity, heavier bundle for React apps. |
| Animations | Motion | React Spring | Smaller community, less documentation, no `AnimatePresence` equivalent. |
| A11y audit | eslint-plugin-jsx-a11y | @axe-core/react | @axe-core/react does NOT support React 18+. Deprecated by Deque. |
| Bundle audit | @next/bundle-analyzer | webpack-bundle-analyzer | @next/bundle-analyzer IS webpack-bundle-analyzer, pre-configured for Next.js. |

---

## Complete Installation

```bash
# Production dependencies (2 packages)
npm install posthog-js motion

# Dev dependencies (2 packages)
npm install -D @next/bundle-analyzer eslint-plugin-jsx-a11y

# Server-side analytics (1 package)
npm install posthog-node
```

**Total: 5 new npm packages.** Three production, two dev-only.

**What NOT to install:**
- `@axe-core/react` -- incompatible with React 19
- `framer-motion` -- use `motion` instead (same library, new name)
- `mixpanel-browser` -- PostHog is better for this use case
- `react-spring` -- Motion is more feature-complete
- `gsap` -- overkill and licensing issues
- `@vercel/analytics` -- PostHog covers this and more
- Any charting library for analytics dashboard -- PostHog dashboard is the analytics UI
- Any guest list management library -- pure CRUD, no library needed

---

## New Environment Variables

```bash
# PostHog Analytics (required)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

No other new environment variables needed. Guest list uses existing Supabase and Resend credentials.

---

## New Database Objects

### Tables to add:
- `analytics_events` -- Custom business event tracking (purchases, refunds, token lifecycle)
- `guest_list_entries` -- Guest list per event with auto-registration/approval/ticket flags

### SQL Views to add (for admin analytics dashboard):
- `v_revenue_per_event` -- Aggregate ticket + drink revenue per event
- `v_token_lifecycle` -- Token purchase/redeem/expire/refund rates
- `v_member_growth` -- New members over time, referral sources
- `v_event_attendance` -- RSVP vs actual attendance rates

### Columns to add:
- None on existing tables. All new data goes into new tables.

---

## Integration Points with Existing Stack

| Existing Component | Integration With | How |
|--------------------|-----------------|-----|
| Next.js App Router | PostHog | `instrumentation-client.ts` for auto-pageviews, `PostHogProvider` in layout for hooks |
| Server Actions | PostHog Node | `posthog.capture()` in purchase/redeem/refund server actions |
| Server Actions | analytics_events table | Supabase insert in same server action (co-located with PostHog capture) |
| Supabase Auth | PostHog | Identify user on login: `posthog.identify(userId, { role, status })` |
| Tailwind CSS v4 | Motion | Tailwind for static styles, Motion for animation props. No conflict. |
| Existing modals (z-[60]) | Motion | Wrap modal content in `motion.div` with `AnimatePresence` for enter/exit |
| ESLint 9 (eslint-config-next) | eslint-plugin-jsx-a11y | Add `jsxA11y.flatConfigs.recommended` to flat config |
| next.config.ts | @next/bundle-analyzer | Wrap config with `withBundleAnalyzer()`, conditionally enabled via ANALYZE env |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| PostHog (posthog-js, posthog-node) | HIGH | Official docs for Next.js App Router verified. Free tier limits confirmed. EU instance available. |
| Motion (animation library) | HIGH | v12.35.x on npm confirmed. React 19 + strict mode fix verified (v12.1.0). Tailwind v4 integration documented. |
| @next/bundle-analyzer | HIGH | v16.1.6 matches project's Next.js version exactly. Official Next.js package. |
| eslint-plugin-jsx-a11y | HIGH | ESLint 9 flat config support confirmed. Standard React a11y tooling. |
| Lighthouse CI | HIGH | Google-maintained, runs via npx, includes axe-core for a11y. |
| Custom Supabase analytics table | HIGH | Standard PostgreSQL pattern. No special tooling needed. |
| Guest list database design | HIGH | Standard CRUD. Uses existing Supabase infrastructure. |
| @axe-core/react incompatibility | HIGH | Confirmed: does NOT support React 18+. Verified via npm page and Deque deprecation notice. |

---

## Sources

- [PostHog Next.js Docs](https://posthog.com/docs/libraries/next-js) -- Official integration guide for App Router
- [PostHog Tutorials: Next.js App Directory Analytics](https://posthog.com/tutorials/nextjs-app-directory-analytics) -- Setup walkthrough
- [PostHog Pricing](https://posthog.com/pricing) -- Free tier limits (1M events/month)
- [Vercel KB: PostHog + Next.js](https://vercel.com/kb/guide/posthog-nextjs-vercel-feature-flags-analytics) -- Vercel-specific configuration
- [How Supabase Uses PostHog](https://posthog.com/customers/supabase) -- Confirms Supabase + PostHog is a proven combination
- [PostHog + Supabase Signup Funnel](https://posthog.com/tutorials/nextjs-supabase-signup-funnel) -- Hybrid tracking approach
- [Motion.dev](https://motion.dev/) -- Official Motion documentation
- [Motion npm](https://www.npmjs.com/package/motion) -- v12.35.x confirmed
- [Motion: Reduce Bundle Size](https://motion.dev/docs/react-reduce-bundle-size) -- LazyMotion documentation (~4.6kb)
- [Motion: Tailwind CSS Integration](https://motion.dev/docs/react-tailwind) -- Official Tailwind guide
- [Motion: AnimatePresence](https://motion.dev/docs/react-animate-presence) -- React 19 strict mode fix noted
- [Motion Changelog](https://motion.dev/changelog) -- v12.1.0 React 19 fix confirmed
- [@next/bundle-analyzer npm](https://www.npmjs.com/package/@next/bundle-analyzer) -- v16.1.6 confirmed
- [eslint-plugin-jsx-a11y GitHub](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) -- ESLint 9 flat config support
- [@axe-core/react npm](https://www.npmjs.com/package/@axe-core/react) -- React 18+ incompatibility confirmed
- [Lighthouse CI GitHub](https://github.com/GoogleChrome/lighthouse) -- Includes axe-core
- [Supabase Custom Analytics Guide](https://bootstrapped.app/guide/how-to-create-custom-analytics-with-supabase) -- Custom events table pattern
- [Supabase Performance Tuning](https://supabase.com/docs/guides/platform/performance) -- PostgreSQL insert optimization

*Stack analysis: 2026-03-09*
