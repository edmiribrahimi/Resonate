# Feature Landscape: v1.3 Refinement & Intelligence

**Domain:** Private event community platform (invitation-driven music events with ticketing, drinks, and media)
**Researched:** 2026-03-09
**Milestone:** v1.3 Refinement & Intelligence
**Competitors referenced:** Eventbrite, Luma, Partiful, Dice, zkipster, RSVPify
**Overall confidence:** HIGH

---

## Category 1: Comprehensive User Analytics & Data Collection

### Table Stakes

Features organizers expect from any platform with a payments/ticketing layer.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Revenue summary per event | Eventbrite/Luma both show gross/net sales per event; organizers need to know how events perform financially | Low | `tickets`, `drink_orders`, `drink_tokens` tables already exist | Aggregate existing data -- no new tracking needed |
| Ticket sales over time chart | Eventbrite shows daily ticket velocity; essential for gauging marketing effectiveness | Medium | `tickets.created_at` already stores purchase timestamps | Line/area chart grouped by day, filterable by event |
| Drink sales summary per event | Unique to Resonate's bar model; organizers need to see drink revenue alongside ticket revenue | Low | `drink_tokens` table has all data | Group by event, show totals and per-drink breakdown |
| Attendance rate (tickets sold vs checked in) | All platforms show check-in rate; critical for capacity planning | Low | `tickets` + `attendances` tables | Simple count comparison per event |
| Member growth over time | Luma tracks subscriber growth; essential for community-driven platforms | Medium | `profiles.created_at` | Count new members per week/month, referral vs organic split |
| Expired/refunded token rate | Unique to Resonate's drink token model; organizers need to see waste/loss | Low | `drink_tokens.status` already tracks `purchased`, `redeemed`, `refunded` | Percentage of tokens that expired vs redeemed per event |
| Top-level dashboard with KPIs | Eventbrite's main organizer view shows headline numbers; expected baseline | Medium | All data sources | Total revenue, total members, upcoming events, recent activity |
| Pageview + basic behavior tracking | Fundamental analytics expectation for any product in 2026 | Low | PostHog auto-captures pageviews with zero custom code | Free tier: 1M events/month, more than enough |

### Differentiators

Features that set Resonate apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Per-member spend profile | Shows total spent per member across events (tickets + drinks); no competitor does per-user revenue tracking for small community platforms | Medium | Cross-table aggregation on `user_id` across `tickets` and `drink_tokens` | Powerful for identifying VIP members and engagement patterns |
| Referral chain effectiveness | Track which referral links produce active, spending members vs dormant accounts; unique to referral-gated communities | Medium | `profiles.referred_by` + spending data | Simple table showing referrer -> referred member -> spending total |
| Drink popularity ranking | Which drinks sell most, least, and have highest redemption rates per event; helps optimize future menus | Low | `drink_tokens.drink_name` aggregation | Bar chart sorted by volume |
| Drink purchase funnel | Visualize drop-off: menu view -> add to cart -> checkout -> payment -> token received | Medium | PostHog funnel with custom events at each checkout step | Requires emitting events at each stage in the existing drink purchase flow |
| Session replay for guest UX | Watch how anonymous QR drink menu guests interact with the checkout flow; gold for UX optimization | Low | PostHog free tier: 5K recordings/month | Particularly valuable for the public `/events/[slug]/menu` guest flow |
| Guest-to-member conversion | Track anonymous drink buyers who later register and become members | Medium | PostHog anonymous_id -> identify linking on auth | Powerful growth metric unique to Resonate's guest->member pipeline |
| Market insights per event | Avg spend/attendee, popular drinks, peak purchase times | Medium | SQL views with time bucketing on `drink_orders.created_at` | Helps organizers plan drink inventory for future events |
| Event comparison view | Side-by-side metrics for two or more events | Medium | All analytics queries parameterized by event_id | Useful once there are 5+ events to compare |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Custom analytics dashboard UI from scratch | PostHog provides dashboards, funnels, retention charts, cohort analysis out of the box. Building custom visualization would take weeks. | Use PostHog dashboards for deep analysis. Add simple KPI summary cards (3-4 numbers) to the admin panel using SQL views. |
| Full behavioral heatmaps | PostHog offers this but session replay is more actionable for a community app | Focus on session replay for UX insights |
| Real-time live dashboard with WebSocket updates | Over-engineered for event frequency (a few events per month); adds infrastructure complexity | Server-rendered dashboard that refreshes on page load; PostHog processes events near-real-time |
| Third-party analytics integration (Google Analytics) | Adds external dependency and privacy/GDPR overhead alongside PostHog | PostHog covers all analytics needs; no need for a second tracker |
| AI-powered recommendations | Eventbrite is doing this at massive scale; irrelevant for a curated community of <1000 members | Manual curation is the brand value -- algorithmic recommendations contradict the curated ethos |
| Custom charting library (Chart.js, Recharts) | Would duplicate PostHog's visualization capabilities; adds bundle size | PostHog for rich charts; admin panel gets simple number/stat cards only |
| A/B testing framework | Not needed at current user scale; no data volume for statistical significance | PostHog includes feature flags for free if needed later |

---

## Category 2: Full App Audit (UX, Performance, Security, Accessibility, SEO)

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Lighthouse performance score >90 | Next.js apps should achieve this baseline; users expect fast load on mobile PWA | Medium | Bundle analysis + image optimization + code splitting | `@next/bundle-analyzer` + Lighthouse CI |
| HTTPS-only + secure headers (CSP, HSTS) | Basic web security; Vercel provides HTTPS but CSP needs manual config | Low | `next.config.js` security headers | Content-Security-Policy, X-Frame-Options, X-Content-Type-Options |
| Server Action input validation | All server actions should validate inputs; prevents injection and malformed data | Medium | Every server action across admin/organizer routes | Audit each action; add Zod schemas where missing |
| Accessible color contrast (WCAG AA) | Legal/ethical requirement in EU; dark theme needs contrast verification | Medium | Tailwind color tokens in `globals.css` | Audit `text-muted` on dark backgrounds especially; Orbitron font at small sizes |
| Keyboard navigation for interactive elements | Screen reader and keyboard users must use core flows (purchase, RSVP, redeem) | Medium | All interactive components (modals, bottom sheets, forms) | Focus rings, tab order, ARIA labels, escape-to-close on modals |
| SEO metadata on public pages | Event pages should be discoverable via search; drives organic traffic | Low | `metadata` exports in App Router pages | OpenGraph + Twitter cards for `/events/[slug]` pages |
| Image optimization consistency | Already using `next/image` in places; ensure ALL images use it | Low | Audit for raw `<img>` tags | Proper `width`/`height`/`sizes` on every image |
| Error boundaries per route group | Prevent white screen of death on component errors | Low | React error boundaries | Add `error.tsx` for `(members)`, `(admin)`, `(organizer)` route groups |
| eslint-plugin-jsx-a11y integration | Catch accessibility issues at lint time, not in production | Low | ESLint config | Add to existing ESLint setup; fix findings |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| JSON-LD structured data for events | Google rich results for events (date, venue, price); drives organic discovery | Low | Event data already server-side | Schema.org Event markup on `/events/[slug]`; test with Rich Results Test |
| PWA offline fallback page | Branded offline page instead of browser error when network drops | Low | Service worker already exists for PWA | Cache a simple offline.html in service worker |
| Rate limiting on auth endpoints | Prevents brute-force attacks on login/register | Medium | Middleware or Supabase built-in rate limiting | IP-based rate limit on auth routes |
| Bundle size CI monitoring | Prevent regression as new features (Motion, PostHog) are added | Low | Vercel build output or `@next/bundle-analyzer` | Set budget alerts in CI |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| WCAG AAA compliance | Extremely strict; conflicts with dark theme + Orbitron font aesthetics; AA is industry standard | Target WCAG AA consistently |
| Automated penetration testing | Expensive tooling; premature at current scale | Manual review of auth flows, RLS policies, server actions |
| Multi-language SEO (hreflang) | App is English-only by design constraint | `<html lang="en">` + single-language SEO |

---

## Category 3: Layout Elegance (Animations, Transitions, Visual Polish)

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Component enter animations | Modern apps (Luma, Partiful) have smooth content transitions; static page swaps feel dated in 2026 | Medium | Motion library (formerly Framer Motion) | `motion.div` with fade+translateY on each page's content wrapper; 200-300ms, ease-out |
| Skeleton loading states | Replace loading flashes with skeleton placeholders; Luma/Partiful both do this | Low | `loading.tsx` files per route + Tailwind `animate-pulse` | Industry standard UX pattern for async content |
| Button/card press feedback | Current `active:scale-95 active:opacity-80` is good; ensure consistency everywhere | Low | Tailwind utilities already partially in use | Audit ALL buttons, links, cards for consistent active state; or use Motion `whileTap` |
| Smooth scroll behavior | Native smooth scroll for anchor links | Low | CSS `scroll-behavior: smooth` on `html` | One-line CSS addition |
| Toast notifications with animations | Feedback for actions (copy link, save, invite sent) should animate in/out | Low | Sonner library or custom toast | Slide-in with auto-dismiss after 3-4s |
| Interactive button hover/tap feedback | `whileTap`, `whileHover` on primary action buttons signals responsiveness | Low | Motion library | Subtle scale(0.97) on tap, slight lift on hover |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Staggered list animations | Event lists, drink menus, member lists animate items in sequence; feels premium | Low | Motion `staggerChildren` variant | 50-80ms stagger, fade+translateY(8px); subtle, not flashy |
| Layout animations on filter/sort | Smooth item reordering when filtering events or sorting drink menu | Low | Motion `layout` prop on list items | Animates position changes automatically |
| Scroll-triggered content reveals | Content sections animate in as user scrolls (events list, dashboard sections) | Low | Motion `whileInView` with threshold | Lazy animation on scroll; performant |
| Micro-interactions on data changes | Numbers counting up in analytics cards, progress bars filling | Medium | Motion `animate` with number interpolation | Focus on analytics dashboard KPI cards |
| Dark mode ambient glow effects | Subtle colored glow behind accent elements; enhances dark theme depth | Low | Tailwind `shadow-accent/20` utilities | Already partially in use; systematize across all accent elements |
| Card hover/touch elevation | Cards subtly lift on hover (desktop) and press (mobile); creates layered depth | Low | Tailwind `hover:shadow-lg hover:-translate-y-0.5 transition-all` | Consistent across event cards, ticket cards |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Complex 3D transforms / WebGL effects | Performance-heavy on mobile, battery drain, breaks PWA experience; contradicts "minimal design" | Stick to 2D transforms (translate, scale, opacity) |
| Lottie animations / animated illustrations | Requires design assets, large bundle size increase, doesn't match typographic/minimal brand identity | CSS/Motion transitions only |
| Page-level AnimatePresence route transitions | Known broken/fragile in Next.js App Router as of 2026 (relies on unexposed internal methods); will break on Next.js updates | Component-level enter animations: `motion.div` with `initial`/`animate` per page content wrapper; no exit animations |
| Constant ambient animations (particles, pulsing) | Distracting, drains battery, contradicts "minimal design"; 2026 UX standards say 200-500ms micro-interactions | Static backgrounds; animation only on user interaction or data load |
| Spring physics everywhere | Motion's springs are beautiful but overuse makes the UI feel "bouncy" and unprofessional | Use springs for modals/sheets only; `tween` with `ease` for most transitions |
| Excessive animation orchestration | Over-animation feels slow and gimmicky; contradicts minimal aesthetic | Keep animations under 300ms, ease-out, only on meaningful state changes |

---

## Category 4: Guest List Per Event

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Add guests by name + email | Eventbrite, Luma, zkipster all support manual guest entry; organizer's primary workflow | Low | New `event_guests` table (event_id, name, email, status, invited_at) | Simple form with name/email fields, email validation |
| Guest list view with status | See who's invited, registered, has ticket, checked in; Luma and zkipster both show this | Low | Join `event_guests` with `profiles` and `tickets` | Status: invited -> registered -> has_ticket -> checked_in |
| Invitation email to guests | Branded email when added to guest list with event details and CTA | Medium | Resend + React Email (existing infra) | New template: event cover, title, date, registration/event link |
| Auto-registration for non-members | Guest clicks invite link -> register flow pre-fills email, auto-approves | High | Auth flow changes: guest token in URL, bypass pending state, link to `event_guests` | 3 cases: existing approved member, existing pending (auto-approve), new user (register + auto-approve) |
| Free ticket generation for existing members | Existing members on guest list get complimentary ticket without SumUp checkout | Medium | `tickets` table: `amount_paid: 0`, no `sumup_checkout_id` | New `issue_complimentary_ticket` DB function (bypasses payment fields) |
| Remove guest from list | Basic CRUD; organizer removes guests before or after invitation | Low | Delete from `event_guests` | Warn if free ticket already issued; don't auto-revoke ticket |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Guest list per party (not just per event) | Resonate's multi-party model means guest lists might differ per party; no competitor supports this | Medium | `party_id` column on `event_guests` (nullable = all parties) | Unique to Resonate's data model |
| Auto-approval on guest list email match | When someone registers with an email matching ANY guest list entry, auto-approve even without referral | Low | Modify `handle_new_user` trigger or post-registration hook | Guest list becomes alternative approval path alongside referrals |
| Guest-to-member conversion tracking | Track which guests become paying members; PostHog anonymous->identified linking | Medium | PostHog user identification on auth | Unique growth metric for Resonate's guest->member pipeline |
| Bulk CSV import | Upload CSV (name, email); parse, validate, deduplicate, preview, insert | Medium | CSV parsing (PapaParse or native), batch server action | Useful for lists >20 people |
| Reusable guest lists across events | Clone guest list from previous event to new event | Medium | Clone query or `guest_list_templates` table | For recurring event series |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| SMS invitations | Per-message cost, phone collection, privacy/regulatory complexity by country | Email only via Resend (free, already integrated) |
| Calendar invite (ICS) attachment | Complex cross-client rendering; low ROI for nightlife events | Link to event page with all details |
| Plus-one / guest-of-guest management | Complexity explosion; contradicts "each person is a known member" model | Each guest individually named; bring-a-friend = separate guest list entry |
| Public RSVP wall (Partiful-style) | Partiful shows guest list publicly for social proof; Resonate is private -- contradicts exclusivity | Guest list visible only to organizers; members see only their own status |
| Automated follow-up email sequences | Over-engineered for a community where organizers know guests personally | Single invite email + optional manual re-send |
| Guest list public sharing | Would undermine private/curated nature of the community | Guest list managed only through organizer UI |

---

## Category 5: Admin/Organizer Navigation Consolidation

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| Admin/organizer links in Account page | Current bottom nav popover (shield icon -> Dashboard/Scanner) is non-standard UX; admin controls belong in Account page where users expect management tools | Low | `MobileNav.tsx`, `dashboard/page.tsx`, `roles.ts` | Add "Management" section with links to admin/organizer sub-pages |
| 4-tab bottom nav maximum | NNG/Material Design standard: 3-5 tabs. Remove Admin/Organizer from bottom bar. New layout: Events, Gallery, Scanner, Account | Low | `MobileNav.tsx`, `roles.ts` | Scanner promoted to top-level for staff roles |
| Scanner always one tap away for staff | Scanner is the most time-critical tool (door check-in); must NOT be in popover or menu | Low | `roles.ts` nav items | Scanner tab visible for organizer/master only; replaces current popover |
| Role-aware Account page sections | Members see tickets/drinks/media; organizers see "Manage Events" + "Members"; master sees full admin links | Low | `dashboard/page.tsx`, conditional rendering on `role` | Role already read from headers; just UI restructure |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Quick-stats cards for staff on Account page | Instead of plain links, show: "5 pending members", "Next event: Saturday", "EUR 1,234 total revenue" | Medium | Dashboard queries for counts/summaries | Account page becomes a command center |
| Animated admin navigation dropdown | Smooth expand/collapse for management section in Account page | Low | Motion library | `AnimatePresence` + height animation for management links |
| Visual separation member vs staff sections | Clear divider in Account page separating "My Stuff" from "Management" | Low | CSS/Tailwind | Important for users who are both member and organizer |
| Unified staff sub-navigation component | Both admin and organizer sections use same `StaffNav` pill tabs (currently `AdminNav`) | Low | Generalize `AdminNav.tsx` | Already exists; ensure consistency between admin/organizer routes |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Hamburger menu for admin controls | NNG research: lower engagement than visible navigation; hides important controls | Visible cards/links in Account page |
| Separate admin app / subdomain | Over-engineered; admin surface is small (events, members, artists, venues, newsletter, finance) | Integrated admin via Account page |
| Floating action button (FAB) | No label, requires guessing, covers content, conflicts with bottom nav | Explicit labeled links in Account page |
| Tab bar with >5 items | Icons too small, labels truncated, cognitive overload | Maximum 4 tabs: Events, Gallery, Scanner, Account |
| Swipeable edge drawer for admin | Discoverable only by accident; conflicts with iOS back gesture | Admin access via explicit taps in Account page |

---

## Feature Dependencies (Affecting Phase Ordering)

```
Nav Consolidation (standalone -- no new tables, no data dependencies)
  |
  +--> Cleaner Account page structure where analytics links and guest list management will live

App Audit (standalone -- audits existing code)
  |
  +--> Security headers in next.config.js
  +--> Server action validation patterns reused by guest list actions
  +--> loading.tsx / error.tsx patterns used by analytics and guest list pages
  +--> eslint-plugin-jsx-a11y integrated for all future components

Layout Elegance (requires: Motion library installation)
  |
  +--> loading.tsx skeletons used by analytics and guest list pages
  +--> Toast component used by guest list actions (invite sent, guest added)
  +--> Enter animation pattern reused across all new pages
  +--> whileTap/whileHover applied to existing and new interactive elements

Analytics (requires: PostHog setup + existing data tables)
  |
  +--> PostHog SDK install + provider in layout
  +--> User identification on auth (posthog.identify)
  +--> Custom events in drink purchase/redeem flows
  +--> SQL views for revenue/token/member summaries -> admin KPI cards

Guest List (requires: new event_guests table, auth flow changes, new email template)
  |
  +--> New Supabase migration for event_guests table + RLS policies
  +--> Modify handle_new_user trigger OR post-registration check for auto-approval
  +--> New reserve_complimentary_ticket DB function
  +--> New React Email template for guest invitations
  +--> Server actions with Zod validation (pattern from audit phase)
```

### Recommended Phase Order

1. **Nav Consolidation first** -- Smallest scope, zero new dependencies, immediately improves UX. Creates the Account page structure that analytics and guest list management links live in.

2. **App Audit second** -- Establishes quality baseline (security headers, input validation, accessibility, error boundaries, loading states). Patterns discovered here (Zod validation, loading.tsx, error.tsx) are reused by all subsequent phases.

3. **Layout Elegance third** -- Install Motion, add skeletons, toasts, enter animations. These patterns are immediately used by analytics and guest list pages. Post-audit means animations apply to already-optimized components.

4. **Analytics fourth** -- PostHog setup + SQL views + admin KPI cards. Builds on existing data tables. Uses animation patterns from phase 3. Links from restructured Account page (phase 1).

5. **Guest List last** -- Most complex: new table, auth flow changes, email template, server actions, free ticket logic. Benefits from clean nav (1), validated patterns (2), loading states (3), and can integrate with PostHog tracking (4).

---

## MVP Recommendation

### Must Have (ship or v1.3 feels incomplete)

1. **PostHog setup + user identification** -- immediate analytics value, low effort
2. **Revenue + sales summary per event** -- organizers need financial visibility beyond raw SumUp dashboard
3. **Member growth + token lifecycle views** -- community health metrics
4. **Nav consolidation to 4-tab bottom nav** -- current popover is confusing; low-effort, high-impact
5. **Role-aware Account page with management links** -- replaces popover pattern
6. **Component enter animations + skeleton loading states** -- minimum bar for "layout elegance"
7. **Toast notifications** -- essential feedback for all user actions
8. **Basic guest list (add by name+email, view status, send invite)** -- core v1.3 feature
9. **Auto-registration for guest list non-members** -- without this, guest list workflow is broken
10. **Free ticket generation for guest list members** -- without this, guest list has no actionable outcome
11. **Security headers + server action validation audit** -- must-do for production
12. **eslint-plugin-jsx-a11y + accessibility fixes** -- EU compliance baseline

### Defer to v1.4

- **Conversion funnel visualization** (PostHog funnels) -- configure after events accumulate, not a build task
- **Session replay review** -- data accumulates automatically; analyze when volume exists
- **Event comparison view** -- useful after 5+ events
- **Per-member spend profile** -- interesting but not urgent
- **Guest-to-member conversion tracking** -- requires PostHog anonymous->identified linking; complex
- **Reusable guest list templates** -- premature; wait for organizer feedback
- **CSV bulk import for guest lists** -- manual entry fine for <50 guests
- **Referral chain effectiveness** -- complex visualization; defer
- **Parallax cover images** -- nice visual polish; trivial to add later
- **Layout animations on filter/sort** -- polish item; defer for simplicity

---

## Competitor Pattern Summary

### How competitors handle these feature areas

**Analytics:**
- **Eventbrite:** Comprehensive dashboard: ticket sales velocity, page views, attendee demographics by city, gross/net revenue, capacity tracking, traffic & conversion reports. Integrates with Google Analytics and CRMs. AI-powered listing optimization coming 2026.
- **Luma:** Subscriber growth, engagement metrics, exportable people lists with attendance data. Lighter analytics focused on community growth rather than financials.
- **Dice:** Real-time fan analytics, demand tracking via waiting lists, AI-powered event recommendations. Heavy focus on understanding fan behavior and demand signals.
- **Takeaway for Resonate:** Start with Eventbrite-level basics (revenue, sales, attendance rate). Add drink-specific metrics no competitor tracks (token lifecycle, drink popularity, redemption rates). Use PostHog for behavior tracking rather than building custom. Skip demographics -- community is small enough to know members.

**Guest Lists:**
- **Eventbrite:** Manual guest addition separate from sellable capacity. Email communication. CSV upload. Guest lists don't affect ticket inventory.
- **Luma:** Application-based attendance (hosts select attendees). Expanded table view with search/filter. QR check-in. Guest data export. Co-host capabilities.
- **Partiful:** Social RSVP wall (guests see who else is going). Text Blast messaging. Waitlist management. Shared photo albums. Completely free.
- **zkipster:** Premium guest management: drag-and-drop seating, table assignments, real-time check-in dashboard. Aimed at luxury/corporate events.
- **RSVPify:** Segment guests by RSVP status, ticket type, demographics. Automated confirmation/reminder emails. Custom form fields tied to guest records.
- **Takeaway for Resonate:** Follow Eventbrite's model (separate guest list from ticket capacity, manual entry, email invites) but add auto-registration which NO competitor offers natively. Avoid Partiful's public RSVP wall (contradicts private model). Free ticket generation for guest list members is unique to Resonate's needs.

**Admin Navigation:**
- **Eventbrite:** Separate "Organizer" app with dedicated navigation. Desktop-centric admin experience. Mobile app is check-in focused.
- **Luma:** "Manage Event" button on event page leads to management view. No separate admin app. Management is contextual to each event.
- **Partiful:** Minimal admin -- host controls are inline on event page. No separate admin navigation because admin surface is tiny (create event, manage RSVP, send blast).
- **Dice:** Artist/venue dashboards separate from fan app. Two distinct interfaces.
- **Takeaway for Resonate:** Follow Luma's integrated pattern. Management tools accessible from Account page, not a separate app. Scanner promoted to top-level bottom nav (unique to Resonate due to QR ticket/drink model). Current popover pattern has no equivalent in ANY competitor because it's inherently awkward UX.

---

## Sources

- [Eventbrite: Create a guest list and manage guests](https://www.eventbrite.com/help/en-us/articles/569587/create-a-guest-list-and-manage-guests/)
- [Eventbrite: Add attendees manually](https://www.eventbrite.com/help/en-us/articles/874192/how-to-add-attendees-manually/)
- [Eventbrite: How to measure event success (14 metrics)](https://www.eventbrite.com/blog/how-to-measure-event-success/)
- [Eventbrite: Event data analysis guide](https://www.eventbrite.com/blog/event-data-analysis/)
- [Eventbrite Analytics Dashboard Templates (Databox)](https://databox.com/dashboard-examples/eventbrite-event-analytics-dashboard)
- [Eventbrite Review 2026 (promotix)](https://blog.promotix.com/eventbrite-review)
- [Luma Help Center](https://help.luma.com/)
- [Luma vs Eventbrite comparison](https://help.luma.com/p/luma-vs-eventbrite)
- [Partiful: Managing Guest List](https://help.partiful.com/hc/en-us/sections/30470926071195--Managing-Guest-List)
- [Partiful App Review (party.pro)](https://party.pro/partiful/)
- [RSVPify: Guest List Management](https://rsvpify.com/guest-list-management/)
- [zkipster: RSVP Platform](https://www.zkipster.com/online-invitations-rsvp)
- [Swapcard: Event Analytics Platform](https://www.swapcard.com/features/event-analytics)
- [Webex Events: Event App Metrics](https://help.socio.events/en/articles/4701463-event-app-metrics)
- [PostHog Pricing](https://posthog.com/pricing)
- [Motion.dev (formerly Framer Motion)](https://motion.dev/)
- [Motion Complete Guide 2026 (inhaq)](https://inhaq.com/blog/framer-motion-complete-guide-react-nextjs-developers)
- [Solving Motion Page Transitions in Next.js App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router)
- [Motion Design & Micro-Interactions: What Users Expect in 2026](https://www.techqware.com/blog/motion-design-micro-interactions-what-users-expect)
- [CSS/JS Animation Trends 2026 (webpeak.org)](https://webpeak.org/blog/css-js-animation-trends/)
- [Next.js Production Checklist (official docs)](https://nextjs.org/docs/app/guides/production-checklist)
- [Next.js SEO Checklist 2025 (dev.to)](https://dev.to/vrushikvisavadiya/nextjs-15-seo-checklist-for-developers-in-2025-with-code-examples-57i1)
- [Mobile Navigation UX Best Practices 2026](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)
- [Bottom Navigation Design Golden Rules (Smashing Magazine)](https://www.smashingmagazine.com/2016/11/the-golden-rules-of-mobile-navigation-design/)
- [NNG: Basic Patterns for Mobile Navigation](https://www.nngroup.com/articles/mobile-navigation-patterns/)
- Codebase analysis: MobileNav.tsx, AdminNav.tsx, roles.ts, dashboard/page.tsx, schema.sql, database.ts
