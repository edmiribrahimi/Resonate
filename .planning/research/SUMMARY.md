# Project Research Summary

**Project:** Resonate (re:sonate) — v1.5 Platform Layout, Access Model & Door Fixes
**Domain:** Private, invitation-gated music-events platform (Next.js 16 / React 19 / Supabase / Tailwind 4 PWA) — design-system pass, unified staff access model, format data model, and door/bar defect correction on a live, shipped product
**Researched:** 2026-08-05
**Confidence:** HIGH

## Executive Summary

v1.5 touches five things that are normally shipped as five separate projects — visual system, routing, the permission model, the data-access boundary, and the door's concurrency model — on an app that already has real money moving through it and a route (`/admin/scanner`) that must work with the network off. All four researchers converge on the same underlying architecture: Postgres/RLS is the actual security boundary, not the middleware header it uses today; per-night staff grants cannot live in a JWT claim because a grant made at 21:50 must work at 22:00, not after the next token refresh; and the door and the bar must never share an offline mechanism because their correctness defaults are opposites (door: when in doubt, admit and record; bar: when in doubt, record nothing). No new npm packages are required — this is version bumps (`tailwindcss`, `@supabase/supabase-js`), two `next/font` calls, and a set of SQL migrations on a stack that already has the right shapes in place.

The stack researcher and the features researcher disagree on one point that this summary does **not** resolve (see below): whether the attendee list should be freshened by a Supabase Realtime subscription at all, or by polling plus manual pull-to-refresh, which is what a comparable ticketing product ships in production. Both positions are evidence-backed; the disagreement is left to the roadmap owner because it is a product risk decision, not a technical one.

Independent of that decision, PITFALLS surfaced four defects that are live in production **today**, not hazards of new work: a drink token can be marked served twice because the RPC's idempotent-`false` return is discarded; a genuine two-operator double check-in is silently deleted from the offline sync queue instead of surfaced; a refunded ticket checks in green with no flag, online or offline; and `x-user-role` — a header trusted by the master-only finance/refund action — is attacker-suppliable on the anonymous request branch. These four outrank every net-new risk in this milestone and should be fixed first, before the larger architecture changes land on top of them. ARCHITECTURE and PITFALLS independently converge on the same build order for the rest: fix the door cache correctness bug before Realtime (Realtime turns a rare race into the normal case), build the capability model in the database before touching a single route, collapse the duplicated `/admin`+`/organizer` trees before adding per-night assignments (so they are not built twice), and treat the door's URL migration as an offline-first constraint with its own verification step, separate from the general route collapse.

## Key Findings

### Recommended Stack

The verdict from STACK.md is that this milestone needs **zero new npm packages** — the correct primitives (native `<dialog>`, the `@theme inline`/`static` token shape, container queries) are already proven in the repo or shipped by the platform. The two real actions are version bumps: `@supabase/supabase-js` 2.97.0 → 2.112.1 (four realtime bug fixes bear directly on this milestone's gates — a real `Error` on `CHANNEL_ERROR` instead of a stringified blob, column-scoped `select` on `postgres_changes`, and an auth-on-socket fix for long-lived door sessions) and `tailwindcss`/`@tailwindcss/postcss` 4.2.1 → 4.3.3 (fixes the default `--font-sans` platform stack, which this milestone's interface face depends on). `@supabase/supabase-js` 2.110.0 dropped Node 20 support — confirm the Vercel Node runtime before bumping.

**Core technologies:**
- `next/font/google` (Anton + Space Mono, bundled with Next) — self-hosts both faces at build time; both are static weights, so `weight` is a required, build-breaking-if-omitted prop. `subsets: ['latin']` does **not** cover the wordmark's reversed-e glyph (`ɘ`, U+0258) — flag this if any heading ever renders it as live text rather than as the logo image.
- Native `<dialog>` + `showModal()` — Baseline since March 2022, already proven in 3 of the repo's overlay implementations; replaces 15 hand-rolled `fixed inset-0` overlays, 13 of which lack `Escape` handling today.
- Postgres enums + tables + `SECURITY DEFINER` functions + RLS — the capability model, deliberately with **no JS authorization library**, because the security boundary is RLS and a second policy language would drift from it with no test runner to catch it.
- A local 6-line `cn()` helper instead of `clsx`/`tailwind-merge`/`cva` — justified by the fact that hand-rolled primitives own both sides of every variant, so there is no class conflict to resolve.

Two decisions are flagged as open rather than defaulted: whether Orbitron (still named as a **Constraint** in `PROJECT.md`) is retired or kept for one named role, and which tables enter the `supabase_realtime` publication (each addition is a permanent WAL cost).

### Expected Features

FEATURES.md answers four questions with industry-convergent patterns, expressed as deltas against what already exists (ticketing, drink tokens, offline check-in, guest list, referral gating are out of scope for re-research).

**Must have (table stakes):**
- Single-select format filter chips (All + 4 formats — inside the 5–6-option ceiling for this UI pattern), URL-encoded (`?format=`), sticky, scroll-preserving, with a designed per-format empty state and a stated default
- A three-way staff model every surveyed product converges on: **account-wide role**, **per-event/per-night assignment** (granted without changing account-wide rights), and **public credit** (carries zero permissions, requires no account)
- Duplicate scan reporting with the first-scan time and the recording staff member — both fields (`checked_in_at`, `checked_in_by`) already exist and are already written; only the door-facing message is missing
- Attendee cache freshness on the order of seconds while the scanner is open, plus an always-available manual pull-to-refresh, plus an online/offline badge with a pending-sync count
- Bar: never mark a drink served without server confirmation — explicitly the opposite default from the door, and must not share the door's mechanism

**Should have (competitive):**
- Per-format counts on the chips (only once computed from the same draft-aware, visibility-filtered query as the list — otherwise it leaks an unannounced night)
- Assignment-driven door surface ("is this person on tonight?" rather than "does this person have a permission?")
- A staleness statement beside the count ("updated 4s ago"), not just a spinner

**Defer (v2+):**
- Refused-entry reasons (adds a decision at the door — the worst place to add one)
- Credit-to-member profile pages (a discovery feature; discovery is deliberately manual here)
- A custom role builder (explicitly deferred, not silently deferred — the team's size is the argument against it)

**Anti-features worth naming explicitly:** a custom role builder, multi-select format filters, a venue facet on the listing (venue is a secrecy surface), deriving door access from a credit or a credit from an assignment (both invert the independence invariant), time-expiring assignments ("access ends at 06:00" fails during the last twenty minutes of a queue), and — the point of direct disagreement with STACK, below — per-row realtime subscriptions and staff-presence indicators.

### Architecture Approach

ARCHITECTURE.md's target shape moves the security boundary fully into Postgres: a thin `proxy.ts` (renamed from `middleware.ts` per Next 16) that does session refresh only and injects nothing about identity; a server-only DAL (`src/lib/auth/dal.ts`) holding `getViewer()` and `requireCapability()`; one unified `/staff` route tree replacing the duplicated `(admin)`/`(organizer)` trees; and a single set of SQL functions (`has_capability`, `assigned_parties`, `can`) called from three places — the page/action layer via `rpc()`, RLS policies directly, and (if Realtime ships) the `realtime.messages` channel-authorization policy. The existing ~40 RLS policies keep working unmodified because `is_master()`/`is_admin_or_organizer()` are redefined over the new functions rather than rewritten.

**Major components:**
1. `src/lib/auth/dal.ts` + `capabilities.ts` — the one place an authorization answer is produced or asked for; never re-derived in TypeScript
2. `staff_roles` / `role_capabilities` / `staff_assignments` (Postgres) — general role stays a JWT-eligible preset table; per-night assignments are explicitly **table-backed only, never a claim**
3. `formats` / `series_counters` / `event_parties.series_code` (generated, atomic-counter-backed) — monotone numbering that survives deletes without renumbering
4. `src/lib/offline/{checkin-store,sync-manager,attendance-realtime}.ts` — the IndexedDB store stays the source of truth for the scan verdict; a realtime channel (if adopted) writes to the cache and never gates the scan path
5. `/door` (moved out of the staff tree, on its own migration step with a Serwist precached-navigation rule, because it is the one URL that may be opened with the network off)

### Critical Pitfalls

1. **Drink token can be served twice** — `redeem_drink_token`'s idempotent `false` return is discarded by both callers, and an already-redeemed token is deliberately let through on `action === "serve"`. Live in production; fix before any design work touches the redeem flow.
2. **Offline sync queue silently deletes evidence of a genuine double check-in** — the ticket check-in route encodes conflict as HTTP 200 with an in-band status string, and `sync-manager.ts` treats `res.ok` as "delete the queue entry," destroying the only record that two doors disagreed.
3. **Realtime cache refresh wipes unsynced local check-ins** — `cacheAttendees()` clears and re-inserts the whole party's attendee set on every refresh; a pending offline check-in gets reverted to "not arrived." This is rare today (refresh only on party selection); Realtime would make frequent refresh the normal case, turning a rare race into the standard failure mode. **Must be fixed before Realtime is switched on, regardless of which realtime approach is chosen.**
4. **The route collapse silently removes an implicit guard** — 20 admin-only pages are guarded today purely by the `/admin` URL prefix; collapsing to a neutral `/staff` prefix removes that guard unless every route gets an explicit, exhaustive capability mapping. Convergent with the header-trust finding below.
5. **`x-user-role` is trusted on a money path on the anonymous request branch** — `middleware.ts` only overwrites the header when a user is present, and `admin/finance/actions.ts` gates SumUp refunds and a service-role client on exactly that header. Not a one-line remote takeover (requires a valid, build-rotated Server Action ID), but a real gap on the highest-value path in the app, and the reason the access model must land before the route-tree collapse, not after.

## An Open Disagreement — Not Resolved Here

**STACK.md** recommends Supabase Realtime `postgres_changes` (or, per ARCHITECTURE.md's stricter authorization argument, Broadcast-from-database) with a mandatory full refetch on every `SUBSCRIBED`/rejoin, treating the socket purely as "a hint the cache is stale." Rationale: the app is genuinely new to Realtime (zero `.channel(` calls exist today), the setup cost is one migration and one RLS policy, and the free-tier ceilings (200 connections, 100 msg/s) are orders of magnitude above a staff-sized door.

**FEATURES.md** lists "a live websocket subscription per attendee row / staff presence indicators" as an **anti-feature**, and cites a comparable, shipped ticketing product's published numbers instead: ticket/check-in data polled every ~7 seconds, events every 2 minutes, permissions every 3 minutes, plus an always-available manual pull-to-refresh. Its argument: the actual requirement is *freshness*, not *presence*; a subscription multiplies connections on a phone with bad signal and degrades exactly when the network does — the moment it is needed most — and this would be genuinely new infrastructure on the single most failure-sensitive surface in the product.

Both positions are evidence-based and neither researcher is wrong on its own terms — they differ on how much a socket buys over a well-published poll interval for a door with single-digit concurrent devices. **PITFALLS.md and ARCHITECTURE.md both add a load-bearing constraint that applies whichever way this is decided:** if Realtime is adopted, it must never become the decision path (the scanner's verdict comes from IndexedDB, full stop), the channel dies silently on token expiry across an offline/background gap and must be torn down and rebuilt rather than trusted to self-heal, and the cache-wipe bug (finding 3, above) must be fixed first regardless. **This is an open decision for the project owner, to be made explicitly in the phase that would implement it — not defaulted by whichever researcher's file is read last.**

## Implications for Roadmap

Based on combined research (ARCHITECTURE §13 and PITFALLS "Ordering consequences" agree on the shape below; ARCHITECTURE's numbered steps and PITFALLS' phase mapping are reconciled into one sequence):

### Phase 0: Live-defect corrections (bar + door foundations)
**Rationale:** These are bugs in production today, independent of everything else in the milestone, and the door-cache bug specifically must land before Realtime touches the same code path. Both researchers place this first for different reasons that agree: PITFALLS because it's live and money-adjacent; ARCHITECTURE because Realtime "widens the exact window this bug opens."
**Delivers:** Drink-token double-serve fixed; sync-queue conflict reporting instead of silent deletion; offline "Connection error" split into four distinct outcomes; refunded-ticket admit-and-flag (both online and offline); the `checkin-store.ts` clear-and-replace bug replaced with a pending-wins merge.
**Addresses:** FEATURES table stakes "duplicate scan reported," "refunded ticket admits and flags," "bar never marks served without confirmation."
**Avoids:** PITFALLS 1, 2, 3, 4, 12.

### Phase 1: Capability model in the database
**Rationale:** ARCHITECTURE: the DAL in the next phase calls these functions — building it after would mean reimplementing the rules in TypeScript, which is the exact drift this milestone exists to remove. No application code changes in this phase; verification is that behavior is byte-identical to today.
**Delivers:** `app_capability` enum, `staff_roles`/`role_capabilities`/`staff_assignments` tables, `has_capability`/`assigned_parties`/`can` SQL functions, `is_master()`/`is_admin_or_organizer()` redefined over them, indexes, seeds reproducing today's role behavior exactly.
**Avoids:** PITFALLS 8 (fail-open capability refactor), 10 (slow/recursive RLS — the `(select auth.uid())` wrap and `TO authenticated` sweep belong here, mechanically, on all 71 existing policies).

### Phase 2: Server DAL and removal of header trust
**Rationale:** This is where the finance-action header-spoof hole (finding 5, above) actually closes. Cannot move later — collapsing routes first would carry the header pattern into the new tree.
**Delivers:** `src/lib/auth/dal.ts` (`getViewer`, `requireCapability`), the 8 duplicated `actions.ts` bodies moved into server-only `src/lib/<domain>/` modules, the 45 `x-user-role` call sites converted, `middleware.ts` → `proxy.ts` with the profiles query and header injection deleted.
**Avoids:** PITFALLS 9 (forgotten API-route and server-action guards — extract and delete the duplicated `verifyOrganizerRole`), 11 (service-client bypass of RLS on the door/bar paths).

### Phase 3: Unified `/staff` tree
**Rationale:** Pages have nothing to call until Phase 2's DAL exists. The door route is explicitly excluded (see Phase 7).
**Delivers:** One copy of the 13 duplicated routes, capability-driven `StaffNav`, `redirects()` for both legacy `/admin` and `/organizer` prefixes, 59 old page files deleted.
**Avoids:** PITFALLS 8's route-guard-removal risk directly — requires the total, type-checked route→capability map as a phase deliverable, not a note.

### Phase 4: Per-night assignments
**Rationale:** Needs Phase 1 for the functions and Phase 2/3 for a UI home.
**Delivers:** Assignment grant/revoke UI under `/staff/assignments`, RLS wired onto the door tables, revoke-by-timestamp (never delete), no self-grant, grant validated as of the scan timestamp (a revoked assignment must not strand a queued offline scan).
**Addresses:** FEATURES "per-night assignments with a small fixed set of types," "revocation is one action." Undo-scope decision (door staff vs. supervisor-only) must be made explicitly here, not left as an implicit widening.

### Phase 5: Formats and series numbering
**Rationale:** Placed after the route collapse for a practical reason, not a technical one — it edits the event editor pages, and doing it before Phase 3 means editing them twice in two trees.
**Delivers:** `formats`/`series_counters` tables, atomic `next_series_number()`, `event_parties.series_code` as a generated column, the sticky format filter with URL state and per-format empty states, secrecy suppression on `series_code` for parties with a secret venue.
**Addresses:** FEATURES "format data model + filter chips" (P1 in its own prioritization matrix).
**Avoids:** ARCHITECTURE's cross-domain warning that `series_scope`, if it ever encodes a venue, publishes a venue reveal through a column nobody thought of as a venue column.

### Phase 6: Realtime attendance freshener — OR poll + pull-to-refresh
**Rationale:** This is the phase where the open disagreement above must be resolved by the project owner. Whichever path is chosen, it cannot move earlier: it needs Phase 0 (cache correctness), Phase 1 (channel/query authorization), and Phase 4 (for a per-night channel scope, if Realtime, to mean anything; for a per-party poll scope, if polling).
**Delivers (if Realtime):** Trigger + `realtime.messages` RLS policy reusing `assigned_parties`, client subscription with backfill-on-`SUBSCRIBED`, three-state liveness indicator defaulting pessimistic, collision reporting in `sync-manager`.
**Delivers (if poll):** Interval poll while the scanner is open (7–10s range, published to staff), manual pull-to-refresh, online/offline badge with pending-sync count, live sold/checked-in/remaining counts.
**Avoids:** PITFALLS 5 (silent channel death) if Realtime is chosen; either way, non-negotiable: the connection/poll state is never read by the scan decision path.

### Phase 7: Door URL move + remaining door/bar polish
**Rationale:** The door's URL is an offline constraint, not a routing preference — a 308 redirect requires the network, which the door may not have. Separated from Phase 3 for that reason.
**Delivers:** `/door` as the permanent home, shipped together with a Serwist precached-navigation rule so an offline home-screen launch still resolves; `offlineSync` requiring the signed token instead of a bare `ticketId`.
**Verification:** install-to-home-screen from the old URL, airplane mode, launch, scan — executed and recorded, not asserted.

### Design system and primitives (parallel track, sequenced after Phase 3)
**Rationale:** PITFALLS: adopting eight primitives across two duplicated trees means adopting them sixteen times and diverging again — the route collapse is what makes this work cost what it should. The nav-clearance (6 hard-coded paddings) and z-index extraction should be pulled forward into this phase's foundation step, before any breakpoint work, per PITFALLS 16.
**Avoids:** PITFALLS 13 (service worker serving a stale build on a door device — pair with an explicit deploy-freeze-during-events operational rule), 14 (token swap missing 68 hex literals and 8 `rgba()` literals — grep count is a phase exit criterion), 15 (incremental adoption stalling at 80% — sample 12 of 493 card instances before building the API, migrate in surface-complete slices).
**Sequencing constraint:** the scanner is migrated last within this track, and only after its behavioral fixes (Phase 0, Phase 7) have shipped and been used at a real night — a visual regression on the scanner is a safety issue, not a cosmetic one.

### Phase Ordering Rationale

- **Live defects before architecture:** Phase 0 fixes bugs that exist regardless of this milestone; everything else is new risk being introduced deliberately, and should not be reasoned about together with pre-existing risk.
- **Database before application:** the capability functions (Phase 1) must exist before the DAL (Phase 2) can call them, and before RLS policies (Phase 4) can reuse them, and before a realtime channel policy (Phase 6) can reuse them a third time — one definition, three callers, is only true if the definition comes first.
- **Route collapse before assignments and formats:** both would otherwise be built twice, once per duplicated tree — the exact cost the collapse itself is meant to eliminate.
- **The door is not "part of routing"** — it gets its own phase because a 308 redirect requires a network connection the door is designed not to need.
- **Design work sequenced around, not through, behavioral fixes** — the scanner is where a visual regression is a safety issue, so it is the last surface migrated, and only after Phase 0/7 have been proven at a real event.

### Research Flags

Needs research during phase planning:
- **Realtime vs. polling phase (Phase 6):** the disagreement above is unresolved by design; whichever direction the owner picks, the specific Supabase Broadcast-vs-`postgres_changes` mechanics (private channel setup, trigger function, `realtime.messages` RLS) or the specific poll-interval/battery tradeoff needs a short focused pass at plan time.
- **RLS performance verification (Phase 1/4):** requires a seeded, realistic dataset (a few hundred tickets, several staff) and `EXPLAIN ANALYZE` — production data (4 profiles) proves nothing about the join-based per-night-grant policies.
- **Service worker update strategy (design-system phase):** `reloadOnOnline`/`skipWaiting` behavior on a live door device needs to be re-decided with the door as the deciding case, verified on a device that already has the *old* service worker installed, not a fresh profile.

Phases with standard, well-documented patterns (research-phase optional):
- **Phase 2 (DAL/header removal):** Next.js's own data-security guidance is unambiguous and directly cited.
- **Phase 5 (formats/numbering):** the atomic-counter pattern is a standard Postgres idiom, fully specified in ARCHITECTURE.md.
- **Native `<dialog>` modal extraction:** the pattern is already proven in three files in this repo.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against Context7 docs, official Supabase/Tailwind/Next.js documentation, installed `node_modules` source, and npm registry — not against training data |
| Features | MEDIUM-HIGH | Vendor documentation for staff-role and door-freshness claims is official and current across 4+ independent products; the filter-UX source (SaaSUI.Design) is a single authored source, though its claims are widely corroborated conventions |
| Architecture | HIGH | Next.js and Supabase guidance verified against current official docs; every repo claim carries a `file:line` citation re-checked from the current tree, not from the stale `.planning/codebase/` |
| Pitfalls | HIGH for repo-verified findings (all read from current tree, cross-checked against the known-stale `CONCERNS.md`); HIGH for Supabase RLS/Realtime behavior (official docs); MEDIUM for the Realtime-channel-death claims (community issue trackers, multiple independent reports in agreement, not official documentation) |

**Overall confidence:** HIGH

### Gaps to Address

- **The Realtime-vs-polling decision itself** is not a research gap — it is a genuine, evidence-backed disagreement that must be decided by the project owner at the Phase 6 planning step, not resolved by further research.
- **Assignment vocabulary** (exact named types — "Door," "Bar," "Photo," etc.) and **assignment level** (event-only, party-only, or both) are explicitly product decisions per FEATURES.md, not research findings; needs a decision, not more research, before Phase 4 can be planned in detail.
- **Undo scope** (door staff vs. supervisor-only) is currently an implicit widening of what an assignment grants — must be a declared decision in Phase 4, per both FEATURES and PITFALLS.
- **Orbitron's fate** (retire vs. keep for one named role) is a design-system decision blocking the token-swap phase; leaving it undecided risks the "looks done but isn't" failure mode PITFALLS names (a font import surviving with zero rendered glyphs, and a stale Constraint in `PROJECT.md`).
- **Whether `venue.reveal` becomes a human-triggerable capability or stays cron-only** is flagged as open in ARCHITECTURE — adding any human-triggerable path to a documented one-way switch needs an explicit decision, not a default.
- **Poll interval / Realtime battery and Supabase-read cost over a full night** was not researched by any of the four files and should be measured, not assumed, whichever direction Phase 6 takes.

## Sources

### Primary (HIGH confidence)
- Context7 `/websites/supabase`, `/websites/tailwindcss` — Realtime `postgres_changes`/Broadcast/RLS, Tailwind v4 `@theme` namespaces
- Supabase official docs — Realtime (postgres-changes, subscribing, broadcast, limits), custom-claims RBAC guide, RLS performance and best practices
- Next.js official docs — data security (Server Actions must re-verify), authentication guide, v16 upgrade guide (`middleware` → `proxy`), font component reference, responsive design
- npm registry and installed `node_modules` source — version verification, `REALTIME_SUBSCRIBE_STATES`, buffer/timeout constants
- Google Fonts CSS API — Anton/Space Mono weight and subset verification
- Direct repo reads (2026-08-05) — `src/lib/supabase/middleware.ts`, `src/lib/offline/{checkin-store,sync-manager}.ts`, `src/app/api/tickets/checkin/route.ts`, `supabase/migrations/**`, `src/app/sw.ts`, `next.config.ts`, `src/app/globals.css`, and 20+ other files cited with `file:line` throughout ARCHITECTURE.md and PITFALLS.md

### Secondary (MEDIUM-HIGH confidence)
- Cvent, Momentus Elite, Zoho Backstage, Venuera — staff-role and per-event-assignment vendor documentation (official support/knowledge bases)
- Resident Advisor Pro, Evessio — public-credit-vs-account vendor documentation
- Ticket Tailor, Turtini, ThunderTix, QR Code Ticket, AizuPass — door freshness and offline-sync vendor documentation
- SaaSUI.Design — filter UX conventions (single authored source, widely corroborated)
- W3C WAI — Understanding SC 2.5.8 Target Size (Minimum), normative

### Tertiary (MEDIUM confidence, needs validation)
- supabase-js #1732, realtime-js #274, Supabase discussions #37002/#5312 — Realtime channel death after offline/background token expiry (community issue trackers, multiple independent reports in agreement, not official documentation)

---
*Research completed: 2026-08-05*
*Ready for roadmap: yes*
