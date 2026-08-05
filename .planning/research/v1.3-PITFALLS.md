# Domain Pitfalls

**Domain:** Adding analytics, UI polish, guest list, audit, and nav consolidation to existing event community platform
**Project:** Resonate v1.3 Refinement & Intelligence
**Researched:** 2026-03-09
**Overall Confidence:** MEDIUM-HIGH (codebase analysis HIGH, web research MEDIUM)

---

## Critical Pitfalls

Mistakes that cause data integrity issues, broken features, security vulnerabilities, or require significant rework.

---

### Pitfall 1: Guest List Auto-Registration Bypasses Referral Gating and Creates Phantom Accounts

**What goes wrong:** The guest list feature auto-registers users and auto-approves them with free tickets. But Resonate's entire value proposition is referral-gated access: the `handle_new_user` trigger in PostgreSQL explicitly sets `status = 'pending'` for users without a valid referral code. Guest list auto-registration must bypass this trigger logic, but if done carelessly, it either: (a) creates Supabase Auth accounts that the trigger sets to `pending`, defeating the purpose, or (b) uses `service_role` to forcefully override status, leaving no audit trail of WHY this user was approved (was it a referral? an admin approval? a guest list entry?).

**Why it happens:** The current `handle_new_user()` trigger fires on every `auth.users` INSERT. It always runs the referral check logic. There is no mechanism to signal "this user is being created via guest list, skip normal gating." Developers either fight the trigger or bypass it entirely, both of which have problems.

**Consequences:**
- Guest list users stuck in `pending` if trigger is not handled, defeating the feature
- If trigger is bypassed with `service_role`, `referred_by` is NULL and `status` is force-set, losing the audit trail of how the user was approved
- Existing members who happen to be on a guest list may get duplicate profiles or conflicting states
- If auto-registered guests later sign up organically with a referral link, the referral is lost because the profile already exists
- RLS policies that check `status = 'approved'` may not cover the new approval pathway correctly

**Prevention:**
1. **Add an `approved_via` column to profiles** (enum: `referral`, `admin`, `guest_list`). This preserves the audit trail of how each member was approved, regardless of pathway.
2. **Modify the `handle_new_user()` trigger** to check for a `guest_list_event_id` key in `raw_user_meta_data`. If present, set `status = 'approved'` and `approved_via = 'guest_list'` directly in the trigger, avoiding service_role bypass.
3. **Handle existing members on guest lists:** Before auto-registering, check if the email already exists in `auth.users`. If so, just create the free ticket for the existing profile -- do NOT create a new auth account.
4. **For non-registered guests:** Use `supabase.auth.admin.createUser()` with `email_confirm: true` (pre-confirmed) and pass `guest_list_event_id` in user metadata so the trigger handles it correctly. Send a welcome email with a password-set link.
5. **Store the guest list source** (which event, who added them) so organizers can track who invited which guests.

**Detection:** Add a guest via guest list, then check: (a) is their profile `status = 'approved'`? (b) do they have a free ticket? (c) can they log in? (d) does the admin view show HOW they were approved? If any of these fail, the integration is broken.

**Phase relevance:** Guest List phase. Must be designed carefully before implementation because it touches the core auth trigger.

**Confidence:** HIGH (direct analysis of existing `handle_new_user()` trigger and referral system in codebase)

---

### Pitfall 2: Analytics Tracking Inflates Client Bundle and Degrades Core Web Vitals

**What goes wrong:** Adding comprehensive event tracking to an existing Next.js App Router app means adding tracking calls throughout the codebase. Every component that needs to track user behavior must be a Client Component (or have a Client Component wrapper), because tracking requires browser APIs (`window`, `navigator`, event listeners). This pushes Server Components down to Client Components, increasing the JavaScript bundle, and degrading Largest Contentful Paint (LCP), First Input Delay (FID), and Total Blocking Time (TBT).

**Why it happens:** The current Resonate app has a clean Server/Client component split -- pages like `dashboard/page.tsx` and `events/[slug]/page.tsx` are Server Components that pass data to targeted Client Components. Adding analytics means either: (a) converting these Server Components to Client Components (destroying the performance benefit), or (b) creating tracking wrapper components that bubble events up from Server-rendered content.

Additionally, third-party analytics scripts (GA4, Mixpanel, etc.) loaded directly block the main thread. The current `layout.tsx` already loads the SumUp SDK via `next/script` with `afterInteractive` -- adding more scripts compounds the problem.

**Consequences:**
- LCP regression if analytics scripts block rendering
- Increased client-side JavaScript bundle (every `'use client'` boundary pulls its entire import tree into the client)
- Mobile performance degradation on the PWA, especially on lower-end Android devices at events
- Analytics calls on every page navigation cause unnecessary re-renders if implemented as effects in root layouts

**Prevention:**
1. **Use a lightweight, self-hosted or privacy-focused analytics solution** instead of GA4. Plausible, Umami, or PostHog are good candidates. They add <5KB to the bundle vs GA4's ~45KB.
2. **Load analytics via `next/script` with `strategy="lazyOnload"`** so it loads after everything else. Never use `beforeInteractive`.
3. **Create a single `AnalyticsProvider` Client Component** at the layout level that handles all tracking. Do NOT scatter `useEffect` tracking calls in individual components.
4. **For custom event tracking in Server Components**, use a thin Client Component wrapper pattern:
   ```tsx
   // TrackView.tsx - "use client", renders nothing, just tracks
   "use client";
   import { useEffect } from "react";
   export function TrackView({ event, data }: { event: string; data?: Record<string, unknown> }) {
     useEffect(() => { analytics.track(event, data); }, []);
     return null;
   }
   // Use in Server Component: <TrackView event="event_viewed" data={{ slug }} />
   ```
5. **Measure before and after** with Vercel Speed Insights or Lighthouse. Set a performance budget: LCP must stay under 2.5s, TBT under 200ms.
6. **For Supabase-based custom analytics** (tracking drink purchases, token usage, etc.), use server-side logging in Server Actions and API routes, not client-side tracking. This adds zero client bundle cost.

**Detection:** Run Lighthouse before adding analytics and after. Compare LCP, TBT, and JavaScript bundle size. Use `@next/bundle-analyzer` to identify bloated imports.

**Phase relevance:** Analytics phase. Architecture decision must be made first -- which analytics tool and tracking pattern -- before writing any tracking code.

**Confidence:** HIGH (Next.js official guidance on third-party scripts, web search verification of bundle impact patterns)

**Sources:**
- [Next.js Analytics Guide](https://nextjs.org/docs/app/guides/analytics)
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)

---

### Pitfall 3: Broad App Audit Introduces Regressions Across Stable Features

**What goes wrong:** v1.3 includes a "full app audit across all domains (UX, performance, security, code quality, accessibility, SEO)." This is inherently dangerous because it touches every part of the app simultaneously. A CSS fix for accessibility (e.g., adding focus rings) breaks the dark theme aesthetic. A performance optimization (e.g., lazy loading images) breaks the gallery scroll behavior. A security hardening (e.g., tightening RLS policies) silently blocks legitimate operations. Changes are scattered across the entire codebase, making each one hard to test in isolation and easy to miss in review.

**Why it happens:** Audits generate a long list of findings across unrelated domains. Developers fix them in one large branch, creating hundreds of small changes that individually seem safe but collectively create unexpected interactions. There are no automated tests in the current Resonate codebase to catch regressions.

**Consequences:**
- Drink token redemption breaks because a "cleanup" refactored the modal z-index stack (currently using `z-[60]`)
- SumUp checkout fails silently because an RLS "fix" tightened a policy that the webhook handler relies on
- PWA home screen launch breaks because a performance optimization changed the service worker caching strategy
- Referral auto-approval stops working because a security audit added email confirmation requirements
- MobileNav safe-area padding breaks because an accessibility fix changed the CSS for `pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))]`

**Prevention:**
1. **Categorize audit findings by risk level** before fixing anything. Each fix gets tagged as LOW (cosmetic), MEDIUM (behavior change), or HIGH (security/data/auth change) risk.
2. **Fix HIGH-risk items in isolated, single-purpose commits.** Never bundle security fixes with UX tweaks.
3. **Create a manual regression checklist** for the critical user flows before the audit begins:
   - Member registration with referral
   - Ticket purchase via SumUp
   - Drink token purchase and redemption
   - QR code check-in (membership and ticket)
   - Admin member approval
   - Media upload and moderation
   - PWA install and launch
4. **Run the regression checklist after each batch of audit fixes,** not just at the end.
5. **Do NOT audit and fix security (RLS/auth) issues in the same phase as UX/CSS fixes.** Separate them into distinct sub-phases. Security changes need careful isolated testing.
6. **Preserve the existing z-index convention:** modals at `z-[60]`, MobileNav at `z-50`. Document this in a code comment or style guide before the audit begins.

**Detection:** After each batch of audit fixes, test all critical flows on mobile (iOS Safari and Chrome Android) in the actual PWA, not just desktop browser.

**Phase relevance:** App Audit phase. This phase needs the strictest change management discipline of any v1.3 phase.

**Confidence:** HIGH (universal software engineering pattern: broad refactoring causes regressions; verified by community frustration documented in web research about Next.js upgrade regressions)

**Sources:**
- [Common mistakes with the Next.js App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)

---

### Pitfall 4: Guest List Free Tickets Bypass SumUp Revenue Tracking, Creating Financial Blind Spots

**What goes wrong:** Resonate's ticket system is tightly coupled to SumUp payments. Every existing ticket has a `sumup_checkout_id` and `sumup_transaction_code` (from the schema in `database.ts`). The admin finance dashboard, refund system, and sales dashboard all query based on these SumUp fields. Guest list free tickets have no SumUp checkout -- they are created directly in the database. This means:
- The finance dashboard underreports total attendees because free tickets are not in the SumUp transaction list
- The sales dashboard per event shows only paid tickets, masking actual event capacity usage
- Refund logic may crash if it encounters a ticket with `sumup_checkout_id = NULL` (assuming all tickets were paid)
- The existing `SalesDashboard` component and `TransactionList` component may not handle zero-price tickets

**Why it happens:** The current schema does not have a concept of "free ticket" or "complimentary ticket." Every ticket was created through the SumUp checkout flow. The `Ticket` type has `amount_paid: number` and `sumup_checkout_id: string | null` -- the null case was designed for error states, not intentionally free tickets.

**Consequences:**
- Organizer sees "15 tickets sold" but 25 people show up (10 were guest list)
- Finance dashboard revenue calculations are correct but headcount is wrong
- Check-in scanner works (QR codes are based on ticket ID, not payment), but the organizer is surprised by unexpected attendees
- If the same user has both a paid ticket and a guest list free ticket for the same event, the check-in logic may get confused

**Prevention:**
1. **Add a `ticket_type` column** to the `tickets` table: `'purchased' | 'guest_list' | 'complimentary'`. Default to `'purchased'` to preserve backward compatibility.
2. **Update `SalesDashboard`** to show separate sections: "Paid: X tickets (EUR Y)" and "Guest List: Z tickets (free)". Total attendance = paid + free.
3. **Add a UNIQUE constraint** on `(event_id, party_id, user_id)` for tickets to prevent duplicate tickets for the same user at the same party.
4. **Set `amount_paid = 0` and `sumup_checkout_id = NULL`** for guest list tickets. Ensure the refund flow checks `amount_paid > 0` before attempting a SumUp refund.
5. **Update `TransactionList` and finance queries** to distinguish between paid and free tickets. Filter free tickets from SumUp-related aggregations.

**Detection:** Create a guest list ticket, then check: (a) does the sales dashboard count it? (b) does the finance dashboard handle it? (c) does the check-in scanner work? (d) can you "refund" a free ticket? (e) What happens if the same user also buys a paid ticket?

**Phase relevance:** Guest List phase, but impacts Finance/Sales dashboards built in v1.2.

**Confidence:** HIGH (direct codebase analysis of Ticket type, SalesDashboard, TransactionList, and refund flow)

---

## Moderate Pitfalls

Mistakes that cause significant UX degradation, performance issues, or require non-trivial fixes but are recoverable.

---

### Pitfall 5: Animations on Server Components Cause Hydration Mismatches and Flash of Unstyled Content

**What goes wrong:** Adding visual polish (entrance animations, transitions, micro-interactions) to the existing Resonate UI requires careful handling of the Server/Client component boundary. If a developer adds Framer Motion (now `motion`) to a Server Component, the build fails because motion components need DOM access. If they convert the Server Component to a Client Component to use motion, they lose the SSR data fetching benefit and increase the bundle. If they use CSS animations but the initial state differs between server and client, React throws hydration mismatch warnings and users see a flash of incorrectly styled content (FOISC).

**Why it happens:** The current Resonate app uses clean Server Components for data-heavy pages (`events/[slug]/page.tsx` is ~720 lines of Server Component). Adding animations to elements within these pages requires either Client Component wrappers (each adding to the bundle) or CSS-only animations (which avoid the bundle cost but can still cause hydration issues if they depend on viewport state or JavaScript-computed values like `window.innerHeight`).

**Consequences:**
- Hydration mismatch console warnings (React 18/19 is strict about this)
- Flash of content jumping into position on page load
- 30-50KB bundle increase if Framer Motion is added as a dependency (web research confirms this)
- Performance degradation on mobile, especially during event page scrolling with animated elements
- Animations that look great on desktop but stutter on mobile Safari at crowded events (CPU throttled by heat)

**Prevention:**
1. **Prefer CSS-only animations** for simple transitions (fade-in, slide-up, scale). CSS transitions on `transform` and `opacity` run on the GPU compositor thread and cost zero JavaScript bytes:
   ```css
   .fade-in {
     animation: fadeIn 0.3s ease-out;
   }
   @keyframes fadeIn {
     from { opacity: 0; transform: translateY(8px); }
     to { opacity: 1; transform: translateY(0); }
   }
   ```
2. **If using a JS animation library, use `motion` (formerly Framer Motion)** with the `motion/react` import, which supports tree-shaking. Create thin `"use client"` wrapper components:
   ```tsx
   // components/ui/FadeIn.tsx
   "use client";
   import { motion } from "motion/react";
   export function FadeIn({ children }: { children: React.ReactNode }) {
     return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{children}</motion.div>;
   }
   ```
3. **Never animate `width`, `height`, `margin`, or `padding`** -- these trigger layout reflow and cause jank. Only animate `transform` and `opacity`.
4. **Set `initial={false}` on motion components** when the animated state should match the server-rendered state, avoiding hydration mismatches.
5. **Test all animations with Chrome DevTools Performance panel** at 4x CPU throttle to simulate mobile at a crowded event.
6. **Add `prefers-reduced-motion` media query** to respect accessibility preferences:
   ```css
   @media (prefers-reduced-motion: reduce) {
     .fade-in { animation: none; }
   }
   ```

**Detection:** Load any page with animations in Chrome DevTools with CPU throttle at 4x. If animations stutter or frame rate drops below 30fps, the approach needs optimization. Check console for hydration mismatch warnings.

**Phase relevance:** UI/UX Elegance phase. Must define the animation approach (CSS vs motion library) before starting, not ad-hoc per component.

**Confidence:** HIGH (web research confirms Framer Motion bundle size impact and hydration issues; Next.js Server Component constraints are well-documented)

**Sources:**
- [Framer Motion with Next.js Server Components](https://www.hemantasundaray.com/blog/use-framer-motion-with-nextjs-server-components)
- [CSS vs Framer Motion performance comparison](https://blog.ryanaque.com/fuck-framer-motion-im-going-to-css-instead/)

---

### Pitfall 6: Navigation Consolidation Breaks Existing Role-Based Popover and Scanner Access

**What goes wrong:** The current MobileNav has a carefully designed role-based system: the `getVisibleNavItems()` function in `roles.ts` returns different items based on role and status, and the staff popover (for master/organizer) provides access to both Dashboard and Scanner via a popover menu. Consolidating admin/organizer items into the Account button means restructuring this system. If done carelessly:
- The Scanner quick-access is lost (it's currently one tap: popover -> Scanner)
- The organizer and admin dashboards become buried behind multiple navigation steps
- The popover logic (click handler, outside-tap dismissal, close-on-navigation) needs to be rebuilt on the Account button
- The middleware route protection (`/admin/*`, `/organizer/*`) still works but the navigation no longer matches

**Why it happens:** The current MobileNav is a stateful Client Component with `useState` for popover state, `useRef` for outside-click detection, and `useEffect` for close-on-navigation. This is working correctly. Moving the admin/organizer entry point from a dedicated tab to a sub-menu of Account requires rewriting this interaction while preserving all three behaviors (state management, outside click, route-change close).

**Consequences:**
- Staff users (master/organizer) lose quick access to Scanner -- critical at events for ticket checking
- If the Account button opens a new panel/modal instead of navigating to `/dashboard`, the current page state may be lost
- Role-based visibility logic in `getVisibleNavItems()` becomes more complex (now the Account item needs sub-items)
- If the popover is moved to Account but the z-index stacking is wrong, it could be hidden behind modals (current modals use `z-[60]`, MobileNav uses `z-50`)
- The popover may not work correctly on iOS Safari if it overlaps the safe area

**Prevention:**
1. **Keep Scanner access as a primary action.** If consolidating into Account, the Scanner must be at most 2 taps away, not buried in a settings page. Consider keeping Scanner as a standalone bottom-nav tab and only consolidating the dashboard links.
2. **Design the Account menu as a bottom sheet**, not a small popover. Bottom sheets work better on mobile for multiple options and respect the safe area natively.
3. **Preserve the existing z-index stack:** bottom sheet should be `z-[60]` (same as modals), with backdrop overlay. MobileNav stays at `z-50`.
4. **Test the full navigation matrix:**
   - Unauthenticated user: Events, Gallery, Login
   - Pending member: Events, Account (no admin/organizer options)
   - Approved member: Events, Gallery, Account
   - Organizer: Events, Gallery, Account (with Organizer Dashboard + Scanner in sub-menu)
   - Master: Events, Gallery, Account (with Admin Dashboard + Scanner in sub-menu)
5. **Do NOT remove the `getVisibleNavItems()` function.** Extend it, don't replace it. The role-based logic is solid and battle-tested.
6. **Consider a floating action button (FAB) for Scanner** for staff users instead of embedding it in navigation. The Scanner is a frequent-use tool at events and deserves prominent access.

**Detection:** After restructuring, have a master user and an organizer user test the full navigation on mobile. Time how many taps it takes to reach Scanner. If it's more than 2, the consolidation has made things worse.

**Phase relevance:** Navigation Consolidation phase.

**Confidence:** HIGH (direct codebase analysis of MobileNav.tsx, roles.ts, and OrganizerNav.tsx)

---

### Pitfall 7: Guest List Conflicts with Existing Member Records and Ticket Constraints

**What goes wrong:** An organizer adds "john@example.com" to the guest list for Event X. But John is already an approved member with a paid ticket for Event X. The guest list system tries to auto-register and auto-create a free ticket, resulting in: (a) `auth.users` INSERT fails because email already exists, (b) free ticket INSERT may fail if there's a unique constraint on `(event_id, user_id)`, or (c) both succeed and John now has two tickets -- one paid, one free.

This also fails in the reverse direction: guest is added, auto-registered, gets free ticket. Later, the same person discovers Resonate independently and tries to register with a referral link. The auth signup fails because the email is already in `auth.users`, but the error message doesn't explain that they already have an account (created via guest list).

**Why it happens:** The guest list feature creates users and tickets programmatically, but the existing system was designed for user-initiated signups and user-initiated ticket purchases. The two pathways don't know about each other.

**Consequences:**
- Duplicate tickets for the same user at the same event
- Auth errors with confusing error messages
- Financial discrepancy (paid ticket + free ticket for same person)
- Guest list processing fails silently on existing members

**Prevention:**
1. **Before auto-registering, always check `auth.users` and `profiles` for existing email.** If the user exists, skip registration and only create the free ticket (if they don't already have one).
2. **Before creating a free ticket, check `tickets` table for existing ticket** at the same event/party. If a paid ticket exists, do NOT create a free one. Optionally, mark the guest list entry as "already has ticket."
3. **Add a `guest_list_entries` table** that tracks all guest list additions independently from tickets:
   ```sql
   CREATE TABLE guest_list_entries (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_id UUID NOT NULL REFERENCES events(id),
     party_id UUID REFERENCES event_parties(id),
     email TEXT NOT NULL,
     full_name TEXT,
     added_by UUID NOT NULL REFERENCES profiles(id),
     status TEXT DEFAULT 'pending', -- pending, registered, existing_member, ticket_created
     profile_id UUID REFERENCES profiles(id),
     ticket_id UUID REFERENCES tickets(id),
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```
   This decouples the guest list tracking from the ticket/auth systems and provides clear status tracking.
4. **Process guest list entries asynchronously** (server action, not inline), with clear error handling and status updates per entry.

**Detection:** Add an existing member's email to a guest list. If it crashes, creates duplicates, or silently does nothing with no feedback, this pitfall is present.

**Phase relevance:** Guest List phase.

**Confidence:** HIGH (direct analysis of `handle_new_user()` trigger, `auth.users` uniqueness constraint, and existing ticket schema)

---

### Pitfall 8: Accessibility Fixes During Audit Break the Intentional Dark Theme Design

**What goes wrong:** An accessibility audit reveals multiple issues: low contrast ratios (muted text `#a1a1aa` on dark background `#0a0a0a` = 4.6:1 ratio, barely passing AA for body text but failing for small text), missing focus indicators (current interactive elements use `active:scale-95 active:opacity-80` for touch but no visible `focus-visible` ring for keyboard users), and missing ARIA labels. Fixing these naively -- adding bright focus rings, increasing text contrast to WCAG AAA standards, adding visible outlines -- can clash with the intentional dark, minimal Resonate aesthetic.

**Why it happens:** The Resonate design system uses very specific brand colors defined in CSS custom properties: `--accent: #e5484d`, `--muted: #a1a1aa`, `--card: #141414`. These were chosen for visual aesthetics, not accessibility compliance. A naive accessibility fix might change `--muted` to a lighter gray, but this changes the entire app's look and feel across every page.

**Consequences:**
- Brand inconsistency if contrast fixes are applied inconsistently across components
- Focus indicators that look jarring against the dark theme (default blue outlines look terrible on `#0a0a0a` background)
- Screen reader confusion if ARIA labels are added without understanding the component structure
- Organizer/admin UI becomes harder to use if focus traps are added to modals but not to the popover in MobileNav

**Prevention:**
1. **Design a brand-consistent focus ring** that matches the Resonate aesthetic before fixing any components:
   ```css
   :focus-visible {
     outline: 2px solid var(--accent);
     outline-offset: 2px;
   }
   ```
   The accent red `#e5484d` has excellent contrast on dark backgrounds and stays on-brand.
2. **For contrast fixes, adjust only the `--muted` variable** to the minimum that passes WCAG AA for small text (4.5:1). Test value: `#b4b4bc` (5.0:1 on `#0a0a0a`). Do not change it component by component.
3. **Add skip links and landmark roles** (header, main, nav) without visual changes -- these are invisible to sighted users but essential for screen readers.
4. **Apply focus styles globally via CSS, not per-component.** The current approach of `active:scale-95` on every button is a touch-specific pattern. Add a `focus-visible:ring-2 focus-visible:ring-accent` Tailwind utility class as a global pattern.
5. **Test with VoiceOver on iOS** (the primary PWA device) after changes, not just automated axe-core scans. Automated tools catch ~30-40% of accessibility issues (confirmed by web research).

**Detection:** Run axe-core or Lighthouse accessibility audit before and after fixes. Compare scores, but also visually inspect every page to ensure the dark theme still looks intentional, not "broken."

**Phase relevance:** App Audit phase (accessibility domain).

**Confidence:** MEDIUM-HIGH (contrast ratios calculated from actual CSS values in globals.css; accessibility audit patterns from web research)

**Sources:**
- [Accessibility Audit Reports Guide 2025](https://testparty.ai/blog/accessibility-audit-reports-complete-guide-for-2025)

---

### Pitfall 9: Analytics Data Collection Without Privacy Strategy Creates GDPR Liability

**What goes wrong:** v1.3 calls for "comprehensive user analytics and data collection (behavior tracking, drink purchases, expired tokens, market insights)." This is behavioral tracking of identified users. Resonate has user profiles with real names and emails. Tracking which events they view, which drinks they buy, how long they spend on pages, and linking this to their identity creates a GDPR personal data processing obligation. Without a privacy policy update, cookie consent, and data retention policy, this is a legal liability for an EU-targeted music events platform.

**Why it happens:** Analytics is treated as a purely technical feature. Developers add tracking, data flows into a dashboard, and nobody considers that "user X viewed event Y at timestamp Z" is personal data under GDPR because it's linked to an identified individual.

**Consequences:**
- GDPR non-compliance (fines up to 4% of revenue or 20M EUR, whichever is higher)
- Member trust erosion if the community discovers they're being tracked without consent
- If using third-party analytics (GA4, Mixpanel), data leaves the EU without appropriate safeguards
- Cookie consent banners required if analytics uses cookies (GA4 uses cookies)

**Prevention:**
1. **Prefer server-side analytics** that don't require cookies or client-side tracking. Track aggregated metrics (total page views, event popularity, drink purchase volumes) rather than per-user behavior trails.
2. **If tracking individual user behavior,** update the privacy policy and add a consent mechanism. For a PWA, this can be a one-time consent prompt, not a cookie banner.
3. **Use a privacy-focused analytics tool** that stores data in the EU (Plausible, Umami self-hosted, PostHog EU cloud). Avoid GA4 which sends data to Google's US servers.
4. **Implement data retention:** auto-delete analytics data older than 13 months (GDPR best practice).
5. **For drink purchase analytics and token tracking,** this is already in the database (Supabase). Use SQL aggregation queries on existing data rather than adding new tracking instrumentation. This is not "analytics tracking" -- it's "reporting on existing transactional data," which has a legitimate interest basis under GDPR.
6. **Separate "operational analytics" from "behavioral tracking."** Counting total tickets sold per event is operational. Tracking which pages User X visited in which order is behavioral. The first needs no consent; the second does.

**Detection:** Review every analytics event being tracked. For each one, ask: "Is this linked to an identified user?" If yes, it needs a legal basis (consent or legitimate interest).

**Phase relevance:** Analytics phase. Privacy strategy must be decided before any tracking code is written.

**Confidence:** MEDIUM (GDPR requirements are well-documented but application to this specific use case requires legal review)

---

## Minor Pitfalls

Issues that cause friction, cosmetic bugs, or minor technical debt but are easily fixed.

---

### Pitfall 10: Animations on MobileNav Safe Area Create Layout Shift on iOS

**What goes wrong:** Adding animations to the MobileNav (e.g., tab transitions, badge animations, popover entrance) can cause layout shifts because the MobileNav uses `pb-[env(safe-area-inset-bottom)]` for iOS safe area. The safe area inset value is computed at render time and is not available during SSR. If an animation triggers a re-render that recalculates the safe area, the nav jumps.

**Prevention:**
1. Never animate the height, padding, or position of the MobileNav itself. Only animate content inside it (icon transitions, badge pulsing).
2. If adding a slide-up bottom sheet from the Account button, position it above the MobileNav (with `bottom: calc(env(safe-area-inset-bottom) + NAV_HEIGHT)`), don't overlap it.
3. Test on actual iOS devices with the Home Indicator (iPhone X and later), not just Chrome DevTools mobile emulation.

**Phase relevance:** UI/UX Elegance phase and Navigation Consolidation phase.

**Confidence:** HIGH (known iOS PWA safe-area behavior)

---

### Pitfall 11: SEO Audit Changes Conflict with Private Community Model

**What goes wrong:** A standard SEO audit recommends: adding meta descriptions to all pages, structured data (JSON-LD events schema), open graph images, sitemap.xml, and making pages crawlable. But Resonate is a PRIVATE community. Event pages are behind authentication. Making event details crawlable or adding structured data exposes private community information to Google, which contradicts the platform's exclusivity value proposition.

**Prevention:**
1. **SEO improvements should only apply to public pages:** landing page, login, register, public artist/venue profiles.
2. **Keep `noindex` on authenticated pages.** Do not add event structured data to pages that should not be discoverable.
3. **The public menu page (`/events/[slug]/menu`)** is intentionally public for QR scanning at events. This CAN get SEO attention, but consider whether you want it indexed (probably not -- it's for in-person use).
4. **Limit SEO audit scope** to: (a) og:image for link sharing (already exists in `layout.tsx`), (b) manifest.json accuracy for PWA install, (c) performance (which helps both SEO and UX).

**Phase relevance:** App Audit phase (SEO domain).

**Confidence:** HIGH (Resonate's private community model is explicitly defined in PROJECT.md; anti-feature list explicitly excludes "public event pages / SEO-optimized discovery")

---

### Pitfall 12: Guest List Bulk Operations Hit Supabase Rate Limits

**What goes wrong:** An organizer uploads a CSV of 200 guest emails. The system tries to create 200 Supabase Auth accounts, 200 profile rows, and 200 tickets in rapid succession. Supabase Auth has rate limits (default: 30 signups per hour on the free plan, 3600/hour on Pro with email confirmation). The bulk operation fails partway through, leaving some guests registered and others not, with no clear indication of which succeeded.

**Prevention:**
1. **Process guest list entries in batches** (10-20 at a time) with delays between batches to stay under rate limits.
2. **Use `supabase.auth.admin.createUser()` (admin API, not signup API)** which has different (higher) rate limits.
3. **Track processing status per entry** in the `guest_list_entries` table so the operation can resume if interrupted.
4. **Show progress to the organizer** ("Processing 45 of 200...") rather than waiting for the entire batch to complete.
5. **Validate all emails before processing** (format check, duplicate check against existing users) to avoid wasting API calls on invalid entries.

**Phase relevance:** Guest List phase.

**Confidence:** MEDIUM (Supabase rate limits vary by plan and may have changed; verify against current Supabase documentation)

---

### Pitfall 13: Performance Audit Fixes Cause Service Worker Cache Invalidation Storm

**What goes wrong:** Performance audit fixes may involve changing static asset paths, reorganizing CSS, modifying layout components, or adding new chunks. Each change invalidates cached assets in the PWA service worker. Users who have the app installed on their home screen suddenly need to re-download everything. If many assets change at once, the service worker update takes a long time, and the app may show stale content during the transition.

**Prevention:**
1. **Batch performance fixes together** and deploy in a single release, not multiple small deploys that each invalidate different cache entries.
2. **Ensure the service worker uses a `NetworkFirst` strategy for pages** and `CacheFirst` only for immutable static assets (fonts, images). Verify the current `next-pwa` configuration.
3. **Consider adding a "New version available" toast** that prompts users to reload after a service worker update. This is standard PWA practice and avoids the "stale app" confusion.
4. **Test the PWA update flow:** install the app, make changes, deploy, verify the update is picked up within a reasonable time (should be immediate on next navigation, not hours later).

**Phase relevance:** App Audit phase (performance domain).

**Confidence:** MEDIUM (service worker behavior varies by `next-pwa` or `@ducanh2912/next-pwa` version; verify current configuration)

---

### Pitfall 14: Custom Event Tracking Creates Data Schema Without Migration Strategy

**What goes wrong:** The analytics phase creates new Supabase tables for tracking events (e.g., `analytics_events`, `page_views`, `user_actions`). These tables accumulate data rapidly. Without a migration strategy for schema changes, adding new tracked events or changing the data shape later becomes painful. Without data retention policies, these tables grow unboundedly and slow down queries.

**Prevention:**
1. **Use a flexible schema** for analytics events:
   ```sql
   CREATE TABLE analytics_events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     event_type TEXT NOT NULL, -- 'page_view', 'ticket_purchase', 'drink_order', etc.
     properties JSONB DEFAULT '{}', -- flexible key-value pairs
     user_id UUID REFERENCES profiles(id),
     session_id TEXT,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);
   CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
   ```
   The JSONB `properties` column avoids schema changes when adding new event types.
2. **Add a data retention policy** via a cron job that deletes analytics older than a defined period (e.g., 6 months for detailed events, aggregate into monthly summaries before deletion).
3. **Enable RLS on analytics tables** -- analytics data is sensitive. Only `service_role` should INSERT; only `master` role should SELECT.
4. **Consider using existing transactional data** (tickets, drink_orders, rsvps, attendance) for most "analytics" instead of duplicating data into a separate analytics table. SQL queries on existing tables are analytics.

**Phase relevance:** Analytics phase.

**Confidence:** HIGH (standard data engineering pattern)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Analytics & Tracking | Client bundle bloat from tracking code; privacy/GDPR exposure; analytics tables without retention | Use server-side analytics on existing data; privacy-first approach; JSONB schema with retention cron (Pitfalls 2, 9, 14) |
| App Audit & Fixes | Regressions across stable features; accessibility fixes breaking dark theme; SEO conflicting with private model; service worker cache storms | Risk-categorize findings; isolated commits; manual regression checklist; scope SEO to public pages only (Pitfalls 3, 8, 11, 13) |
| UI/UX Elegance | Animations causing hydration mismatches; bundle bloat from motion library; iOS safe-area layout shifts | CSS-first animations; thin Client Component wrappers; respect `prefers-reduced-motion`; test on real iOS devices (Pitfalls 5, 10) |
| Guest List | Auth trigger bypass; conflicts with existing members; financial tracking blind spots; Supabase rate limits on bulk ops | Extend `handle_new_user()` trigger; check-before-create pattern; `ticket_type` column; batch processing with status tracking (Pitfalls 1, 4, 7, 12) |
| Navigation Consolidation | Scanner access regression; popover interaction rewrite; role-based menu complexity; z-index conflicts | Keep Scanner prominent; bottom sheet pattern; extend `getVisibleNavItems()`; preserve z-index convention (Pitfall 6) |

---

## Integration Pitfalls: Cross-Feature Conflicts

These pitfalls arise specifically from the COMBINATION of v1.3 features interacting with each other and with the existing system.

### Integration 1: Guest List + Referral System Conflict

**Risk:** Guest list auto-approval undermines the referral system's value. If organizers can just add anyone to a guest list and bypass the referral requirement, the referral system becomes meaningless. Members who worked to earn approval via referral may feel their status is devalued.

**Mitigation:** Guest list entries should be scoped to a specific event, not grant permanent community membership. After the event, guest accounts could either: (a) revert to `pending` unless they also got a referral, or (b) remain `approved` but with a `guest` tag that distinguishes them from referral-approved members. Define the business rule clearly before implementation.

### Integration 2: Analytics + UI Polish Performance Conflict

**Risk:** Adding both analytics tracking AND animation library in the same milestone creates a compounding performance hit. Analytics adds tracking scripts and event handlers. Animations add a JS library (or extra CSS). Together, they could push the client bundle past the tipping point for mobile performance.

**Mitigation:** Implement analytics first, measure performance impact, THEN add animations. Never add both in the same phase without measuring after each. Set a hard performance budget (e.g., max 150KB total JavaScript, LCP under 2.5s).

### Integration 3: App Audit + Everything Else Conflict

**Risk:** The app audit phase touches everything. If it runs concurrently with or just before other v1.3 phases, audit fixes may conflict with feature changes. For example, an audit fix that refactors a component's prop interface will conflict with an animation change to the same component.

**Mitigation:** Run the app audit FIRST in the milestone, get it merged and stable, then build new features on top of the audited codebase. Do not run audit and features in parallel.

### Integration 4: Navigation Consolidation + Analytics Tracking Conflict

**Risk:** Navigation restructuring changes which pages users visit and how. If analytics is tracking page views and navigation patterns, the data becomes meaningless if the navigation structure changes mid-measurement. "Dashboard visits dropped 50%!" might just mean the route changed, not that users stopped using the feature.

**Mitigation:** Implement navigation consolidation BEFORE analytics tracking. Track against the final navigation structure, not the transitional one.

---

## Recommended Phase Ordering Based on Pitfalls

The pitfall analysis reveals a clear dependency and risk chain:

1. **App Audit & Fixes** -- Do first. Stabilize the foundation before adding new features. Separate security fixes from UX/CSS fixes. Run regression checklist after. (Pitfalls 3, 8, 11, 13)

2. **Navigation Consolidation** -- Do second. Changes the app's navigation structure, which affects every subsequent feature's UI placement and user flow. Must be settled before analytics can meaningfully track anything. (Pitfall 6)

3. **Guest List** -- Do third. Most complex feature, touches auth, ticketing, and referral systems. Needs careful database schema design (`guest_list_entries`, `ticket_type`, `approved_via`). (Pitfalls 1, 4, 7, 12)

4. **UI/UX Elegance** -- Do fourth. Adds animations and polish on top of the stabilized, restructured app. Performance impact can be measured against the audit-improved baseline. (Pitfalls 5, 10)

5. **Analytics & Tracking** -- Do last. Tracks user behavior against the FINAL navigation structure and UI. Privacy strategy should be defined early but implementation comes last so it measures the finished product. (Pitfalls 2, 9, 14)

**Rationale:**
- Audit first: fix before building (Pitfall 3 -- regressions are hardest to diagnose when mixed with new features)
- Nav before analytics: track the final structure, not a transitional one (Integration 4)
- Guest list before polish: database schema changes are harder to retrofit than CSS animations
- Analytics last: measures the final product, not a work-in-progress

---

## Sources

- Direct codebase analysis: `src/components/layout/MobileNav.tsx`, `src/lib/rbac/roles.ts`, `src/lib/supabase/middleware.ts`, `src/types/database.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `supabase/migrations/20260225000000_phase3_referral.sql`, `src/app/(public)/events/[slug]/page.tsx`, `src/app/(members)/dashboard/page.tsx`
- [Next.js Analytics Guide](https://nextjs.org/docs/app/guides/analytics)
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Common mistakes with the Next.js App Router - Vercel](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)
- [Framer Motion with Next.js Server Components](https://www.hemantasundaray.com/blog/use-framer-motion-with-nextjs-server-components)
- [CSS vs Framer Motion performance comparison](https://blog.ryanaque.com/fuck-framer-motion-im-going-to-css-instead/)
- [Bottom navigation bar guide 2025](https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/)
- [Supabase RLS security dangers](https://dev.to/fabio_a26a4e58d4163919a53/supabase-security-the-hidden-dangers-of-rls-and-how-to-audit-your-api-29e9)
- [Accessibility Audit Reports Guide 2025](https://testparty.ai/blog/accessibility-audit-reports-complete-guide-for-2025)
- [Supabase Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
