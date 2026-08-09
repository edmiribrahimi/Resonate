# Phase 34: One Work Surface — Research

**Researched:** 2026-08-09
**Domain:** Next.js 16 App Router route collapse · capability→route binding · middleware rewrite
**Confidence:** HIGH on the measurements, MEDIUM on the two design recommendations that
carry a trade-off (redirect location, map totality mechanism)

> **Roles only, never people.** This repository is public. Every statement below names a
> role — `master`, `organizer`, `staff`, `member` — never a person. No venue under
> negotiation, no unannounced date, no line-up appears here.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Copied verbatim from `34-CONTEXT.md` `<decisions>`. **None of these is re-opened by this
research.** Where a measurement bears on one, it is reported under it, not against it.

- **D-34-01: `/admin` is the canonical prefix. `/organizer/*` redirects into it.** The
  prefixes are symmetric in cost (48 hardcoded references against 51), so the tie is broken
  by the door: `/admin/scanner` must not move, and it already lives under `/admin`. Any
  other canonical choice turns `/admin` into a redirect shell that has to **exclude**
  `/admin/scanner` — which recreates, in a second place, exactly the precedence hazard that
  `middleware.ts:346-351` exists to warn about. *The collapse must not add a second place
  where the door's precedence has to be remembered.* Keeping `/admin` also halves the
  number of already-sent addresses that become redirects.

- **D-34-02: the prefix stops carrying meaning; the route map carries it.** After the
  collapse, `/admin` is an address, not an authorisation. The middleware's three prefix
  rules (`/admin/scanner`, `/admin/*`, `/organizer/*`) are replaced by lookups in the route
  map. `admin.access` keeps its meaning — *reach the master-only surfaces* — and becomes
  the binding of the specific routes that are master-only (finance, analytics, newsletter),
  not the meaning of a path segment. **The word `admin` in a URL will no longer describe
  who is on it, and that is accepted deliberately**: renaming to a neutral third prefix
  would move both trees and cost the door its stable address for one phase.

- **D-34-03: the two organizer-only surfaces move with everything else.**
  `events/[id]/assignments` and `events/[id]/review` have no `/admin` twin and land at the
  collapsed address. **`review` carries the assignment allow-list with it**
  (`ORGANIZER_ASSIGNMENT_ROUTES`, `middleware.ts:88`) — that is a Critical edit, not a move:
  the allow-list is the whole safety of that arm, and it becomes an explicit per-route
  binding (`party.manage`, assignment-openable) rather than a regex tested against a prefix
  that will no longer exist. The per-night gate on the page, which re-asks `party.manage`
  against the night resolved from `?party=`, is untouched.

- **D-34-04: redirects are permanent (308) and one-directional.** Every `/organizer/*`
  address answers with a 308 to its collapsed twin. A 308 is cached by the browser and does
  not come back: the mapping is written once, reviewed as a table, and verified before the
  phase closes. No redirect may match `/admin/scanner`, and none may point at it.

- **D-34-05: one page per surface, and a divergence is a defect until proved otherwise.**
  The four duplicated surfaces become one file each. Where the two versions differ, **the
  verdict comes from `private.role_capabilities`, not from either page** — the differences
  are the drift the collapse exists to remove, and at least two of them are measurably wrong
  today: the organizer members page lacks the account-creation form that D-20 of Phase 43
  permits, and lacks the way into the register that Phase 43 grants organizers
  (`register.read`). Each resolved divergence gets one line in the plan naming the
  capability that decided it.

- **D-34-06: a divergence may only be resolved *towards more* when an existing grant
  already says so.** This phase grants nothing (see the boundary). If closing a divergence
  would require a new grant or a `requires_approved` flip, the surface stays at the more
  restrictive of the two behaviours and the case is recorded as a finding. **Widening a
  policy to make a collapse pass is forbidden** — the same rule Phase 33 carried.

- **D-34-07: the two navs stop being mounted by hand.** There is no `layout.tsx` in either
  route group today, so every page repeats the mount and the `UserRole` cast the code
  already flags as this phase's to remove. A layout for the collapsed tree resolves the
  access context once and passes it down. This is also what makes D-34-08 enforceable
  rather than conventional.

- **D-34-08: three states, never collapsed into one.**
  1. **No session** → the existing redirect to `/login?redirect=`. Unchanged.
  2. **Session, capability missing** → the existing `bounceToDashboard(cause)` with a
     **named cause** on `?access=`. Not a 404 and not a bare 403: the mechanism already
     exists, already carries three causes that never collapse (`dashboard/page.tsx:39`),
     and a 404 would make a legitimate operator's refusal indistinguishable from a typo —
     in a product with **no error tracking**, an opaque refusal reaches nobody. Phase 41
     restyles it; this phase must not invent a second refusal surface for it to restyle.
  3. **Could not resolve** → the DAL throws `capabilities.resolve_failed: <code>` and that
     must stay a throw. **No `try/catch` around a route guard may turn a resolution failure
     into a refusal.** This is the phase-32 lesson restated: an infrastructure fault dressed
     as a permission denial is a silent failure with an alibi.

- **D-34-09: the middleware and the page must give the same verdict, because they read the
  same entry.** Today they can disagree, and one disagreement is already recorded as a
  defect (the register is granted to organizers and the prefix rule bounces them). After
  this phase, a mismatch between the two is a build-time or review-time question about one
  declaration, not a discovery made by a person who cannot open a page they are entitled to
  open. **The middleware is still UX and the RLS is still the boundary** — one declaration
  read twice does not change which of the two is the security guarantee, and no comment may
  imply that it does.

- **D-34-10: one declaration module, pure data, no `server-only`.** It binds a route
  pattern to the capability key that opens it, and marks the entries a live assignment may
  open. It imports `CAP` from `src/lib/capabilities/keys.ts` and nothing else — the same
  discipline `keys.ts` states for itself. It carries **no secrets and no resolution**: the
  capability set is resolved server-side and handed to the client navs as props, so that a
  `"use client"` nav can filter on the same keys without importing the DAL.

- **D-34-11: CAP-02 is enforced by the type system, not by a script that needs a database.**
  The map is a **total `Record<CapabilityKey, …>`** — the pattern `CAP_DESCRIPTIONS`
  already uses in `keys.ts:126`, chosen because that pattern has **already held four times
  in this repository** (when keys 9, 10, 11 and 12 landed). Each key declares either the
  routes it opens or, explicitly, `scope: "table"` with a one-line reason — because five of
  the twelve gate tables and a gate that cannot say so would be satisfied by a lie. Adding a
  thirteenth key without an entry is an `npm run build` error. **No database credential is
  needed at build time**, which is the only way criterion 4 can be true on a Vercel
  production build.

- **D-34-12: `verify:capabilities` side 4 stays a warning, and its message is re-pointed at
  the new map.** It asks a different question — *does the database catalogue match the
  callers* — and turning it into the build gate would make the build depend on a live
  database. **The seam is stated rather than glossed:** CAP-02 holds as a chain — database
  ↔ `CAP` is asserted by `npm run verify:capabilities`, `CAP` ↔ routes by `next build` — and
  the chain is only as good as the discipline of running the first link. There is **no CI in
  this repository**, so that link is a written pre-deploy step, not an automation, and the
  plan must say so where someone will read it.

- **Folded todo — `register-read-unreachable-for-organizers.md`.** An organizer holds
  `register.read` but `middleware.ts` judges everything under `/admin` with `admin.access`,
  granted to the master alone, so the capability is granted and unreachable. This phase
  closes it by construction: D-34-02 dissolves the prefix rule, and the register route binds
  to `register.read`. **It is the smallest true test of the whole phase** — if the collapse
  is real, this defect disappears without anyone editing a permission.

### Claude's Discretion

Left to research and planning, with the constraint that each choice is justified in the plan:

- The concrete shape of the route map — pattern syntax (literal prefixes, matcher functions,
  or a small pattern language), where it lives, and how a dynamic segment
  (`events/[id]/…`) is expressed. The requirement is *one declaration, three readers, total
  over `CapabilityKey`*; the schema is a design choice.
- Whether the collapse ships as one sweep or in tranches, and if tranches, the order.
  Phase 33's measured lesson applies: **ask "can these two run at the same time" before
  "what is the logical order"** — 36 page files across disjoint directories is naturally
  parallel work, and Phase 32 lost its parallelism to four consecutive plans extending one
  shared file. The route map is that shared file here: write it once, early, then fan out.
- How the redirect table is expressed (`next.config` redirects, middleware, or a catch-all
  route) and how it is verified before the phase closes.
- Whether `StaffNav` and `MobileNav` converge into one component or stay two that read the
  same map. `StaffNav`'s `context` prop disappears either way.
- What a staff role sees of the members list and the takings, within D-34-06 — the existing
  grants decide it; this phase only stops asking the question twice.
- Whether `getVisibleNavItems(role, status)` is replaced or re-expressed. It filters on role
  and status today, which is the thing STAFF-03 refuses.

### Deferred Ideas (OUT OF SCOPE)

- **A neutral third prefix** (`/backstage`, `/manage`) instead of `/admin` — refused here
  for the door's sake (D-34-01), not on merit. The natural moment to reconsider is
  **Phase 39**, when the door leaves for its own address and `/admin` no longer has to stay
  still for it.
- **Retiring the `admin` word from the URL and the page headings** — the heading collapse
  (`<h1>Admin</h1>` versus `<h1>Organizer</h1>`) is decided here by necessity; the
  vocabulary question belongs with Phase 40/41.
- **`getVisibleNavItems` for the public and member navigation** — this phase converts the
  staff surfaces. The public nav entries (`/`, `/events`, `/gallery`) are not
  capability-gated and are not in scope.
- **`postgrest-details-leaks-the-row.md`** and **`profiles-email-not-unique.md`** — reviewed
  and deliberately not folded.

### Fences this research must not cross (from the orchestrator brief)

- `/admin/scanner` does not move. No redirect rule may match it and none may point at it.
- No capability granted, revoked or re-scoped. `private.role_capabilities` is not edited.
- `door.operate`'s `requires_approved = false` is not flipped (D-06 of Phase 43).
- No new capability key. A surface that would need one is a **finding**, not a design.
- No visual design work. **No `UI-SPEC.md` exists for this phase and that is deliberate.**
- Nothing from Phases 36, 37, 38, 39, 40, 41, 42.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description (`.planning/REQUIREMENTS.md:48,77-79`) | Research support |
|----|-------------|------------------|
| **CAP-02** | A capability that exists in the database but is not assigned to a route fails the production build | § *CAP-02's honest boundary* measures all twelve keys against policy bodies, `src/` call sites and middleware rules; § *The map's type* gives the mechanism and the **two** totality directions the requirement implies; § *The chain and its weak link* states what `next build` cannot see |
| **STAFF-01** | Each work surface exists once, not once per role, and shows what the viewer is entitled to see | § *The collapse inventory* — **twelve** duplicated pairs measured (not four), each with the capability that decides the merged behaviour and the grant that permits it |
| **STAFF-02** | Existing `/admin/*` and `/organizer/*` addresses keep working through permanent redirects | § *Where the redirect lives* — verified execution order, verified 308 semantics, the measured consequence for the literal sweep, and the three caches a 308 lands in |
| **STAFF-03** | Navigation is generated from capabilities — a hidden entry always has a matching server-side check | § *Three hand-maintained menus, not two*; § *The three ungated pages* — the pages that have **no** server-side check at all today and would be left naked by D-34-02 |

**STAFF-04 is the fence, not the requirement.** It is Phase 39. No plan derived from this
research may relocate `/admin/scanner`.

</phase_requirements>

---

## Summary

The collapse is larger, and safer, than `34-CONTEXT.md` measured — in three specific ways,
each of which changes the plan rather than the decisions.

**It is larger.** `34-CONTEXT.md` records *"four surfaces exist twice"*. Measured on
2026-08-09 by diffing every pair, **twelve page pairs are duplicated**, not four: the four
named surfaces plus `events/new` and all seven `events/[id]/*` surfaces
`[VERIFIED: file diff, this session]`. D-34-05's rule — one page per surface, a divergence
is a defect until proved otherwise — applies to all twelve unchanged; only the count moves.
And **three pages have no server-side capability check of their own at all** —
`(admin)/admin/events/[id]/media/page.tsx`, `(admin)/admin/page.tsx`,
`(organizer)/organizer/page.tsx` — so they are held up by the prefix rule that D-34-02
dissolves. That is the `/admin`-side mirror of the hazard `ORGANIZER_ASSIGNMENT_ROUTES`
documents, and `34-CONTEXT.md` names it only on the `/organizer` side.

**It is safer than expected in one place and less safe in another.** Next.js 16's
`typedRoutes` is stable and, measured in this repository, turns route literals into
compile-checked types for `Link href`, `useRouter().push/replace/prefetch`, `redirect()`
and `permanentRedirect()` — **enabling it today produces exactly 14 type errors**, all at
sites that build an href by concatenation `[VERIFIED: npx tsc --noEmit, this session]`.
That would give the phase a real compiler sweep for the link-and-redirect half of the
99-literal walk. But the same measurement shows the trap: **`next.config` redirect sources
are admitted into the route type union** — `/galleria`, `/presenze`, `/registrati` and
`/eventi/[[...path]]` all appear in `StaticRoutes` / `DynamicRoutes`
(`.next/types/link.d.ts:67,79,81,93`, generated this session). So putting the 15
`/organizer/*` redirects in `next.config` would keep every `/organizer/...` literal
type-valid and hand the phase a **false green**. Emitting the redirect from the middleware
instead keeps `/organizer` out of the union and makes the stale literals compile errors.

**And the load-bearing ordering is not hypothetical.** After the collapse, `/admin/members`
(`organizer.access`), `/admin/members/growth` (`admin.access`) and `/admin/members/register`
(`register.read`) are three nested paths carrying three different capabilities, and
`/admin/events` (`organizer.access`), `/admin/events/[id]/media` (`staff.manage`),
`/admin/events/[id]/review` (`party.manage`) and `/admin/scanner` (`door.operate`) are four
more. A lookup that resolves by declaration order reproduces `middleware.ts:346-351`'s
warning in a table. The mechanism that cannot be got wrong by adding an entry later is
**longest-literal-match, computed from the pattern and never from the position**.

**Primary recommendation:** write one module — `src/lib/routes/capability-routes.ts` — that
declares the route↔capability binding **keyed by capability** (D-34-11's shape) and derives
both the middleware's longest-match resolver and the navs' href list from it; enable
`typedRoutes: true` in the same plan so the route literals become types; emit the
`/organizer/*` 308s **from the top of `src/middleware.ts`** rather than from
`next.config.redirects()`, precisely so the compiler keeps finding the stale literals; and
accept that `revalidatePath` (26 calls) is untyped in every option and must be walked by
hand.

---

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|------------|-------------|----------------|-----------|
| Address translation `/organizer/*` → `/admin/*` (STAFF-02) | Frontend server — middleware / `next.config` | CDN (Vercel edge cache of the 308) | It is a routing fact with no subject; it must not consult a session (see *Pitfall 3*) |
| Route reachability verdict (STAFF-01, STAFF-03) | Frontend server — middleware | Frontend server — page guard | Middleware is UX (`access-gating.md`, gate *RLS-è-il-confine*); the page guard is defence in depth. Neither is the boundary |
| What a row may be read or written | Database — RLS | — | Unchanged by this phase. `private.has_capability` is the one definition (CAP-01) |
| Navigation entry visibility (STAFF-03) | Browser / client (`"use client"` navs) | Frontend server — layout resolves and passes props | The nav cannot import the DAL; the layout resolves once per request (`server.ts:338`, `cache()`-scoped) |
| Capability→route totality (CAP-02) | Build — TypeScript | — | D-34-11: no database credential at build time |
| Capability↔catalogue agreement | Script — `verify:capabilities` (needs a live database) | — | D-34-12: stays outside the build |
| Per-night verdict (`party.manage` on `?party=`) | Frontend server — page, after the night is resolved | Database — RLS on `party_id` | Untouched by this phase (`review/page.tsx:177-206`) |
| The door's verdict | Device — IndexedDB, offline | — | **Out of scope.** STAFF-04 / Phase 39 |

---

## Standard Stack

**No package is added by this phase.** Every mechanism below already exists in
`package.json` or in Next.js itself.

### Core

| Library | Version | Purpose | Why standard |
|---------|---------|---------|--------------|
| `next` | **16.1.6** `[VERIFIED: package.json:32, node_modules/next/package.json]` | App Router, middleware, `typedRoutes`, `redirects()` | Already the framework |
| `react` / `react-dom` | 19.2.3 `[VERIFIED: package.json:33-34]` | — | Already |
| `typescript` | 5.9.3 `[VERIFIED: npx tsc --version]` | The CAP-02 gate | `next build` fails on type errors unless `typescript.ignoreBuildErrors` is set; it is **not** set (`next.config.ts`, read in full) `[CITED: nextjs.org/docs/app/api-reference/config/typescript — "Next.js fails your production build (next build) when TypeScript errors are present"]` |

### Framework features used (no install)

| Feature | Config | Purpose |
|---------|--------|---------|
| `typedRoutes: true` | `next.config.ts` | Turns route literals into a checked union. **Stable in Next 16** `[CITED: nextjs.org/docs/app/api-reference/config/next-config-js/typedRoutes — "This option has been marked as stable, so you should use typedRoutes instead of experimental.typedRoutes"]` |
| `next typegen` | CLI | Regenerates `.next/types/*.d.ts` without a full build. **Present in 16.1.6** `[VERIFIED: node_modules/next/dist/cli/next-typegen.js exists]` |
| `NextResponse.redirect(url, 308)` | middleware | `static redirect(url: string \| NextURL \| URL, init?: number \| ResponseInit)` `[VERIFIED: node_modules/next/dist/server/web/spec-extension/response.d.ts:19]` |
| `next.config.redirects()` | `next.config.ts` | Already in use for four Italian legacy paths (`next.config.ts`, `redirects()` block) — the precedent exists |

### Alternatives considered

| Instead of | Could use | Trade-off |
|------------|-----------|-----------|
| Middleware-emitted 308 | `next.config.redirects()` | Config redirects run **before** middleware and can be served from the edge with no function invocation — but they inject `/organizer/*` into the typed-route union, disarming the compiler sweep (**measured**, § *Where the redirect lives*) |
| Middleware-emitted 308 | A catch-all `app/(redirects)/organizer/[[...path]]/page.tsx` | Worst of both: it is a rendered route (so it lands in `AppRoutes` too), it costs a render, and `redirect()` from a Server Component "will insert a meta tag" rather than a 308 `[CITED: .next/types/link.d.ts:185-190, generated from Next 16.1.6]` |
| `typedRoutes` on | Leave it off and walk all 99 literals by hand | Off is the status quo and needs no decision; on costs 14 fixes today and converts ~49 of the literals into compile errors after the deletion. Recommended **on**, as a Wave-1 decision with the 14 fixes inside that plan |

**Installation:** none. `npm install` adds nothing this phase.

---

## Package Legitimacy Audit

**Not applicable — this phase installs no external package.**

Verified by reading the phase boundary (`34-CONTEXT.md` `<domain>`), which permits no new
dependency, and by confirming every mechanism recommended above already exists in
`package.json` (read in full) or in `node_modules/next@16.1.6` (inspected directly). No
`npm install` line appears anywhere in this document. `slopcheck` was therefore not run;
there is nothing for it to check.

---

## Project Constraints (from CLAUDE.md)

Extracted from `./CLAUDE.md` and the rule modules it names. The planner must verify
compliance; these carry the same authority as the locked decisions.

| # | Directive | Source | Bearing on this phase |
|---|-----------|--------|----------------------|
| C1 | **No test runner for the product.** Verification is `npm run build` + written manual procedures. Never claim "verified because tests pass" | `CLAUDE.md` Environment Guardrail 1 | § *Validation Architecture* is written entirely without a test framework |
| C2 | **The typecheck is the build.** No separate `typecheck` script | Guardrail 2, `package.json:6` | CAP-02's gate is `npm run build`, exactly as D-34-11 requires |
| C3 | **Migrations are the source of truth for RLS, not `schema.sql`** | Guardrail 3, `supabase-data.md` | Every grant cited below is read from a migration, never from `schema.sql` |
| C4 | **The repository is PUBLIC; a commit is an irreversible publication** | Guardrail 5 | Roles only. No venue, date or line-up in this file |
| C5 | **macOS/BSD** — `grep -E`, `sed -i ''` | Guardrail 6 | Every command in this file was run on macOS |
| C6 | **Middleware is UX; RLS is the security boundary** | `access-gating.md`, gate *RLS-è-il-confine* | D-34-09's second sentence. No comment in the rewritten middleware may imply otherwise |
| C7 | **Hiding a nav item is not protecting a route** | `access-gating.md`, gate *coerenza navigazione/permessi* | STAFF-03's whole point, and the reason the three ungated pages matter |
| C8 | **Zero silent failures; a log reaches nobody — there is no error tracking** | `meta-gates.md` | D-34-08's three states; and the `revalidatePath` finding, which is a silent failure with no log at all |
| C9 | **Server actions are public endpoints; each re-checks role and status inside itself** | `nextjs-architecture.md`, gate *server action autorizzata* | Confirmed by the docs: Server Functions are POSTs to their hosting route, and a matcher change silently removes proxy coverage `[CITED: nextjs.org/docs/app/api-reference/file-conventions/middleware, "Execution order" good-to-know]` |
| C10 | **A file goes in the route group of its audience** | `nextjs-architecture.md`, gate *gruppo = pubblico* | The collapse makes `(admin)` no longer mean "master". The module prose must be corrected, not inherited — see § *Persona coherence is a build gate here* |
| C11 | **A phase produces `{n}-VERIFICATION.md` with `file:line` evidence per requirement** | `CLAUDE.md`, Gate VERIFICATION.md | § *Validation Architecture* names the evidence shape per requirement |
| C12 | **Monotone guards** — a change may only make `venue_reveal_sent`, a payment→`completed`, or a series progressive harder to trip | `meta-gates.md` | None of the three is touched. **The 308 is a fourth monotone guard this phase creates** — see § *Runtime State Inventory* |

---

## The collapse inventory

### Every page under `(admin)` and `(organizer)`, with its gate today

Measured 2026-08-09 by `find … -name page.tsx` and by grepping `CAP.` in each file
`[VERIFIED: this session]`. `→` is the collapsed address.

| # | Today | → Collapsed | Gate on the page today | Twin? | Capability that opens it after |
|---|-------|-------------|------------------------|-------|-------------------------------|
| 1 | `/admin` | `/admin` | **none** (bare `redirect("/admin/events")`) | — | see *finding F2* |
| 2 | `/admin/analytics` | same | `admin.access` | admin-only | `admin.access` |
| 3 | `/admin/analytics/compare` | same | `admin.access` | admin-only | `admin.access` |
| 4 | `/admin/analytics/members` | same | `admin.access` | admin-only | `admin.access` |
| 5 | `/admin/artists` + `/organizer/artists` | `/admin/artists` | `admin.access` / `organizer.access` | **pair** | `organizer.access` (see *D1*) |
| 6 | `/admin/venues` + `/organizer/venues` | `/admin/venues` | `admin.access` / `organizer.access` | **pair** | `organizer.access` (see *D2*) |
| 7 | `/admin/members` + `/organizer/members` | `/admin/members` | `admin.access` / `organizer.access` | **pair** | `organizer.access` (see *D3*) |
| 8 | `/admin/members/growth` | same | `admin.access` | admin-only | `admin.access` |
| 9 | `/admin/members/register` | same | `register.read` | admin-only | **`register.read`** — this closes the folded todo |
| 10 | `/admin/newsletter` | same | `admin.access` | admin-only | `admin.access` |
| 11 | `/admin/finance` | same | `admin.access` | admin-only | `admin.access` |
| 12 | `/admin/events` + `/organizer/events` | `/admin/events` | `admin.access` / `organizer.access` + `master.manage` | **pair** | `organizer.access` (see *D4*) |
| 13 | `/admin/events/new` + `/organizer/events/new` | `/admin/events/new` | `admin.access` / `organizer.access` | **pair** | `organizer.access` |
| 14 | `…/events/[id]/edit` ×2 | `/admin/events/[id]/edit` | `admin.access` / `organizer.access` | **pair** | `organizer.access` |
| 15 | `…/events/[id]/tickets` ×2 | `/admin/events/[id]/tickets` | `admin.access` / `organizer.access` + `master.manage` | **pair** | `organizer.access` |
| 16 | `…/events/[id]/sales` ×2 | `/admin/events/[id]/sales` | `admin.access` / `organizer.access` | **pair** | `organizer.access` |
| 17 | `…/events/[id]/guest-list` ×2 | `/admin/events/[id]/guest-list` | `admin.access` / `organizer.access` | **pair** | `organizer.access` |
| 18 | `…/events/[id]/drinks` ×2 | `/admin/events/[id]/drinks` | `admin.access` / `organizer.access` | **pair** | `organizer.access` |
| 19 | `…/events/[id]/analytics` ×2 | `/admin/events/[id]/analytics` | `admin.access` / `organizer.access` | **pair** | `organizer.access` |
| 20 | `…/events/[id]/media` ×2 | `/admin/events/[id]/media` | **none** / `staff.manage` | **pair** | **`staff.manage`** — see *finding F1* |
| 21 | `/organizer/events/[id]/assignments` | `/admin/events/[id]/assignments` | `organizer.access` | organizer-only | `organizer.access` |
| 22 | `/organizer/events/[id]/review` | `/admin/events/[id]/review` | `organizer.access` **or** per-night `party.manage` | organizer-only | `party.manage`, **assignment-openable** (D-34-03) |
| 23 | `/admin/scanner` | **unchanged** | `door.operate` | admin-only | `door.operate` — **the door does not move** |
| 24 | `/organizer` | 308 → `/admin/events` | **none** (bare redirect) | — | disappears; see *Pitfall 5* on redirect chains |

**Counts.** 21 pages under `(admin)`, 15 under `(organizer)` `[VERIFIED: find]`. **Twelve
pairs**, not four. After the collapse: 23 addresses under `/admin` (21 existing + 2 moved),
15 files deleted from `(organizer)`, the route group folder removed.

`loading.tsx` files travel with their page: 7 under `(admin)` (`analytics`,
`analytics/compare`, `analytics/members`, `events`, `events/[id]/analytics`, `finance`,
`members`, `members/growth`) and 3 under `(organizer)` (`events`, `events/[id]/analytics`,
`members`) — the organizer ones are deleted with their pages.

### What actually differs, pair by pair, and the grant that decides it

`private.role_capabilities` as declared across the four migrations, read in full
`[VERIFIED: supabase/migrations/20260807000000_capability_model.sql:389-422,
20260808000500_staff_role.sql §3, 20260808002000_membership_register.sql:120-,
20260809001000_assignment_resolver.sql:194-207]`:

| capability | master | organizer | staff | member | `requires_approved` |
|---|---|---|---|---|---|
| `staff.manage` | ✓ | ✓ | — | — | false |
| `master.manage` | ✓ | — | — | — | false |
| `catalogue.manage` | ✓ | ✓ | — | — | **true** |
| `membership.active` | ✓ | ✓ | ✓ | ✓ | **true** |
| `admin.access` | ✓ | — | — | — | false |
| `organizer.access` | ✓ | ✓ | — | — | false |
| `door.operate` | ✓ | ✓ | — | — | false *(must not become true)* |
| `membership.card.view` | ✓ | ✓ | ✓ | ✓ | **true** |
| `register.read` | ✓ | ✓ | — | — | **true** |
| `door.supervise` | ✓ | ✓ | — | — | false *(must not become true)* |
| `media.upload` | ✓ | ✓ | — | — | **true** |
| `party.manage` | ✓ | ✓ | — | — | **true** |

**`staff` holds exactly two capabilities: `membership.card.view` and `membership.active`,
both requiring `approved`.** It holds **no** route in the collapsed tree. That answers the
question 43-CONTEXT deferred to this phase — *"what a staff member sees of the members list
and the takings"* — and the answer is **nothing, and no code is needed to produce it**: a
`staff` account holds neither `organizer.access` nor `admin.access` nor `staff.manage`, so
every entry in the collapsed nav is absent for it and every address refuses it. The finding
is that the deferred question is already closed by Phase 43's grants; this phase must record
that it was checked, not implement it. `[VERIFIED: the grant table above]`

**D1 — `artists`.** The two files are byte-identical except for: import order, the function
name, the capability in the guard (`admin.access` vs `organizer.access`), the `<h1>`, the
`StaffNav context` prop, and the comment above the `UserRole` cast `[VERIFIED: diff, 31
changed lines, no body difference]`. Collapsing to `organizer.access` is **not a widening**:
an organizer reaches the identical page today at `/organizer/artists`. Decided by:
`('organizer','organizer.access',false)`.

**D2 — `venues`.** Same shape, 31 changed lines, no body difference. The admin file's
comment warns that `catalogue.manage` "would additionally widen ADDRESS visibility to every
approved organizer" — but the diff proves the organizer page renders the same component,
so an organizer already sees venue addresses. Collapsing to `organizer.access` widens
nothing. `venue-secrecy.md` cross-check: this page shows `venues.address`; the collapse
changes **who reaches an address that already reaches them**, and touches no
`venue_reveal_sent` path. **Verified as neutral, not assumed.**

**D3 — `members`.** 131 changed lines — the largest divergence, and it is the one D-34-05
names. The organizer file lacks (a) `<CreateAccountForm />`, (b) the `Membership acts →`
link to `/admin/members/register`, (c) `AnimatedSection`. Both call the same `MemberTable`
with the same props. `[VERIFIED: diff]`
  - (a) is decided by **D-20 of Phase 43** (an organizer may create an account directly as
    organizer) and by the action's own gate: `createAccount` re-asks `staff.manage`, which
    an organizer holds. **Resolving towards *more* is permitted here because the grant
    already says so** (D-34-06). No grant changes.
  - (b) is decided by `('organizer','register.read',true)` — granted, and unreachable today
    only because of the prefix rule this phase dissolves. **This is the folded todo, closing
    by construction.**
  - Note the honest edge: `register.read` carries `requires_approved = true`, so a
    *pending* organizer reaching `/admin/members` will see a link that leads to a refusal.
    That is today's behaviour on the master side too (the admin page draws the link
    unconditionally and says why, `members/page.tsx` comment block). Keep it unconditional
    and keep the comment; making it conditional would be a nav change without a matching
    server change in the other direction — the inverse of STAFF-03, and worse.

**D4 — `events`.** 118 changed lines. The organizer version carries a `master.manage` branch
for conditional rendering; both mount `EventList`. `EventList` takes `basePath?: string`
defaulting to `"/organizer/events"` (`src/components/events/EventList.tsx:24,30`) and the
admin page overrides it (`(admin)/admin/events/page.tsx:84`). **After the collapse the prop
has one caller and one value: delete it and hardcode `/admin/events`.** The six per-event
hrefs at `EventList.tsx:163-198` are among the 14 sites `typedRoutes` flags.

**D5..D12 — the seven `events/[id]/*` pairs and `events/new`.** Diff sizes 32–140 lines. Each
differs in the same three axes (guard capability, `<h1>`, `StaffNav context`) **plus**
page-specific drift that must be read pair by pair in the plan, not assumed from the four
above. The two largest — `tickets` (140 changed lines, 365 vs 413 source lines) and `sales`
(77) — are the ones most likely to hold a real behavioural divergence and should not be
merged in the same plan as anything else.

### Findings — recorded, not designed

- **F1 — `(admin)/admin/events/[id]/media/page.tsx` has NO capability check.** It contains
  only `if (!user) redirect("/login")` `[VERIFIED: grep of the file — line 17 is the only
  guard]`. It is held up **solely** by `middleware.ts:394`'s `/admin/*` → `admin.access`
  rule. D-34-02 dissolves that rule. **The collapsed media page must carry `staff.manage`,
  taken from its organizer twin (`media/page.tsx:63`).** This is not a widening — it is
  giving a page its own gate, and the organizer twin already proves what the gate is.
  `34-CONTEXT.md` corrects the stale middleware comment about two unchecked `/organizer`
  pages; it does not record that an `/admin` page is in exactly that state.
- **F2 — `(admin)/admin/page.tsx` and `(organizer)/organizer/page.tsx` are bare
  `redirect()`s with no gate** `[VERIFIED: both files read in full — 4 lines each]`. After
  the collapse, `/admin` must either carry a binding or be reached only through a redirect
  that is itself gated. Simplest correct answer: bind `/admin` to `organizer.access` (the
  least of the capabilities any collapsed page needs) and keep the redirect, so an
  unentitled visitor is bounced by the middleware before the redirect runs.
- **F3 — `verify:capabilities` side 4 will still warn after this phase.** Its question is
  *"does a policy or `src/` ask for this key"*, and the route map **is** `src/`, so binding
  a key to a route makes it "asked for". `door.supervise` and `media.upload` are already
  asked for by `require-operator.ts` and `may-upload.ts`, so side 4 is green today for the
  wrong reason to celebrate — it is green because callers landed, not because routes did.
  D-34-12's re-pointed message must say **which** question it is not asking.
- **F4 — the login redirect parameter is broken today, and it changes how STAFF-02 is
  verified.** `middleware.ts:339` sets `?redirect=`; `(auth)/login/page.tsx:11` reads
  `?next=` `[VERIFIED: both files]`. So an unauthenticated hit on `/organizer/members`
  lands on `/dashboard` after sign-in, not on the collapsed page. **Not this phase's defect
  and not to be folded** — but the manual STAFF-02 procedure must start **signed in**, or it
  will measure the wrong thing and report a false failure.
- **F5 — `(auth)/login/page.tsx:52` is an unvalidated client-side redirect.**
  `window.location.href = nextUrl || "/dashboard"` with `nextUrl` read straight from
  `?next=` and no allow-list `[VERIFIED: file read]`. `access-gating.md`'s gate *redirect
  validato* requires an allow-list of relative paths; the server-side callback has one
  (`api/auth/callback/route.ts:44-49`), this client path does not. **Record as a new todo.
  Do not fold** — it is an auth defect, not a route collapse, and folding it would put an
  open-redirect fix inside a Critical access change.
- **F6 — the auth callback's `NEXT_ALLOW_LIST` needs no change.** It contains only
  `/dashboard`, `/set-password`, `/events/<slug>` and `/events/<slug>/menu`, and its own
  docblock at `:68` names `/admin` as *refused, because an allow-list refuses by default*
  `[VERIFIED: route.ts:44-49,68]`. One fewer thing to touch — say so in the plan, so nobody
  goes looking.

---

## CAP-02's honest boundary — all twelve keys, measured

Method: SQL policy bodies counted with `grep -o "has_capability('<key>'"` across
`supabase/migrations/`; `src/` call sites listed with `grep -rn "CAP\.<MEMBER>" src/` minus
`keys.ts`; route gates read from each call site `[VERIFIED: this session]`.

| Key | policy refs | Route gate today | Non-route call sites | Classification |
|-----|------------|------------------|----------------------|----------------|
| `staff.manage` | **41** | `/organizer/events/[id]/media` (page `:63`) | `guards.assertStaffManage`, 11 action/public-page files | **both** |
| `master.manage` | 7 | none | `guards.ownsOrIsMaster`, 3 action files, 2 pages (conditional render only) | **table** |
| `catalogue.manage` | 5 | none | `organizer/{artists,venues}/actions.ts` | **table** |
| `membership.active` | 6 | none | `lib/media/may-upload.ts` | **table** |
| `admin.access` | **0** | `middleware.ts:394` + 19 admin pages | none | **route** |
| `organizer.access` | **0** | `middleware.ts:415` + 13 organizer pages | none | **route** |
| `door.operate` | 2 | `middleware.ts:385`, `admin/scanner/page.tsx`, 4 API routes via `require-operator.ts:346` | `night-arm.ts`, `api/tickets/attendance` | **both** |
| `membership.card.view` | **0** | `middleware.ts:428` — `/membership-card`, `/attendance` | **middleware only** | **route — outside the collapsed tree** |
| `register.read` | 1 | `/admin/members/register` (page) | none | **both** |
| `door.supervise` | **0** | none — `/api/tickets/checkin/undo` via `require-operator.ts:356` | `assignments/actions.ts` | **table / action** |
| `media.upload` | **0** | none — `/api/media/finalize` via `may-upload.ts` | `MediaUpload.tsx`, public event page | **table / action** |
| `party.manage` | 2 | `middleware.ts:418` (assignment allow-list) + `review/page.tsx:203` per-night | `assignments/actions.ts` | **both** |

**The script's claim checks out.** "Five of the twelve keys gate tables, not routes"
(`verify-capabilities.mjs:44`) resolves to exactly: `master.manage`, `catalogue.manage`,
`membership.active`, `door.supervise`, `media.upload`. Those five take `scope: "table"` in
the map, each with its one-line reason as D-34-11 requires.

**Four keys are *both*** — `staff.manage`, `door.operate`, `register.read`, `party.manage`.
The map's shape must permit a key to declare routes **and** be honest that the routes are
not the whole of its reach. Recommend a third field on the route branch, e.g.
`alsoGatesTables: true`, rather than forcing a false binary.

**Two consequences the CONTEXT does not state:**

1. **`membership.card.view` gates `/membership-card` and `/attendance`** — routes that are
   not staff surfaces and are not in the collapsed tree. It is genuinely route-scoped, so
   `scope: "table"` would be a lie (exactly the lie D-34-11 exists to prevent). **The map is
   therefore the whole application's capability→route map, not `/admin`'s.** Design for that
   from the first line; retro-fitting a second scope later is the drift this phase removes.
2. **`door.supervise` and `media.upload` gate Route Handlers under `/api/*`**, reached
   through `require-operator.ts` and `may-upload.ts`. A Route Handler *is* a route, and the
   generated types even give it its own union (`AppRouteHandlerRoutes`). Whether the map
   covers `/api/*` is a real design fork:
   - **Cover it** → CAP-02 becomes stronger and `door.supervise` / `media.upload` stop
     needing `scope: "table"`; but the middleware then has a rule for `/api/*` paths where
     today it has none, and **the middleware matcher includes `/api/*`, which means the
     door's `/api/tickets/checkin` passes through it on every scan** (`middleware.ts:136-140`
     says so explicitly, and the reason is one round trip on a bad network in front of a
     queue). Adding a per-request map lookup there is cheap; adding a *refusal* there is a
     door change and is out of scope.
   - **Do not cover it** → the two keys stay `scope: "table"` with the reason *"gates a
     Route Handler, not a page; the guard is `require-operator.ts` / `may-upload.ts`"*.
     Honest, smaller, and does not touch the door's path.

   **Recommend: do not cover `/api/*` in this phase.** Record the fork as a finding. The
   fence *the door is not part of routing* is a phase-boundary rule, and a map entry that
   could ever refuse `/api/tickets/checkin` is on the wrong side of it.

### The chain, and its weak link — restating D-34-12 with the measurement

```
private.capabilities  ──[ npm run verify:capabilities, needs a live database ]──►  CAP
CAP                   ──[ npm run build,  no credential needed              ]──►  routes
```

`verify:capabilities` reads `private.capabilities`, `pg_policies` and
`private.role_capabilities` over the Management API or a container
`[VERIFIED: verify-capabilities.mjs docblock, lines 26-60]`. **There is no CI**
(`.github/` absent; `package.json` has no test or CI script) `[VERIFIED]`. So the first link
runs only when a person runs it. The plan must put that sentence where somebody reads it —
the CONTEXT's word is "a written pre-deploy step", and the natural home is the phase's
`VERIFICATION.md` plus a comment at the top of the map module.

---

## The route map — concrete shape

### Where it lives

`src/lib/routes/capability-routes.ts`. Not under `src/lib/capabilities/`, because that
directory's modules import the DAL and `guards.ts` is server-reaching; this module must stay
importable from a `"use client"` nav (D-34-10).

### Why it can stay client-importable — verified

A module is server-only in Next.js by one of two mechanisms: an `import 'server-only'`
sentinel, or a transitive import of something that throws on the client (this repo's
`capabilities/server.ts:13-19` relies on the second, via `next/headers`)
`[CITED: nextjs.org/docs/app/getting-started/server-and-client-components — "To prevent
accidental usage in Client Components, you can use the server-only package … Now, if you
try to import the module into a Client Component, there will be a build-time error"]`.
`keys.ts` imports **nothing** (`keys.ts:4-8` states it, and the file has no import
statement) `[VERIFIED: file read in full]`. A module importing only `keys.ts` therefore has
no server-reaching edge and is importable from both graphs. D-34-10 is achievable exactly
as written.

### The type — and the two totality directions CAP-02 actually needs

D-34-11 asks for one totality: every `CapabilityKey` accounted for. The register defect
proves a **second** is needed: every staff route accounted for. A key with routes and a
route with no key are two different holes, and only the first is what D-34-11 spells.

```ts
import { CAP, type CapabilityKey } from "@/lib/capabilities/keys";
import type { Route } from "next";           // requires typedRoutes: true

/** A route pattern, exactly as the generated union spells it (`/admin/events/[id]/edit`). */
type RoutePattern = Route | (string & {});   // see the caveat below

type Binding =
  | {
      /** The routes this key opens. Order is IRRELEVANT — see `resolve()`. */
      routes: readonly RoutePattern[];
      /** May a live per-night assignment open these? (D-34-03) */
      assignmentOpenable?: true;
      /** True when the key ALSO gates rows. Four of twelve do. */
      alsoGatesTables?: true;
    }
  | {
      scope: "table";
      /** One line, mandatory. A gate that cannot say so would be satisfied by a lie. */
      reason: string;
    };

export const CAPABILITY_ROUTES: Record<CapabilityKey, Binding> = { /* twelve entries */ };
```

`Record<CapabilityKey, Binding>` is the same mechanism as `CAP_DESCRIPTIONS`
(`keys.ts:136`), which has held four times in this repository `[VERIFIED: keys.ts:122-135
records the four occasions]`. A thirteenth key with no entry is `error TS2741` at
`next build`. **Proof by mutation is owed** (`verify-capabilities.mjs`'s house rule): add a
thirteenth member to `CAP`, confirm the mutation applied with `git diff --stat`, run
`npm run build`, read the failure, revert.

**The second totality, stated as a type-level assertion:**

```ts
type StaffRoute = Extract<Route, "/admin" | `/admin/${string}`>;
type Listed = Extract<Binding, { routes: readonly unknown[] }>["routes"][number];
type Unbound = Exclude<StaffRoute, Listed>;
/** A route with no capability is a page nobody declared. */
const _everyStaffRouteIsBound: Unbound extends never ? true : ["UNBOUND", Unbound] = true;
```

`[ASSUMED — the idiom family is standard TypeScript, but this exact assertion was not
compiled in this session.]` **Prove it by mutation in the same plan**: delete one route from
the map, confirm `npm run build` names it, restore. If it cannot be made to work, the
fallback is a module-load `throw` comparing the two sets — worse (runtime, not build) but
still louder than nothing, and the plan should say which it got.

**Caveat on `Route`.** `import type { Route } from "next"` is the **documented** surface
`[CITED: nextjs.org/docs/app/api-reference/config/typescript — "Statically Typed Links",
including the `NavItem<Route>[]` data-structure example, which is precisely this map's
shape]`. The generated `.next/types/routes.d.ts` also exports `AppRoutes`,
`AppRouteHandlerRoutes`, `RedirectRoutes` and `ParamMap` (line 95, measured this session),
but that file is generated and undocumented — **do not import from it**. If `Route` proves
too loose for `Extract<…, "/admin/${string}">`, fall back to a hand-written union of the 23
staff routes plus the `_everyStaffRouteIsBound` assertion against it; the assertion is what
carries the guarantee, not the union's provenance.

### How a dynamic segment is expressed — and it is the same string for both readers

The generated union spells a dynamic route **exactly as the folder does**:
`"/admin/events/[id]/tickets"` `[VERIFIED: .next/types/routes.d.ts, generated this session
— `AppRoutes` includes `"/admin/events/[id]/analytics"` … `"/admin/events/[id]/tickets"`,
and `ParamMap["/admin/events/[id]/tickets"] = { "id": string }`]`.

That one string serves both readers, differently and correctly:

- **The nav** builds an href by substituting: `pattern.replace("[id]", eventId)`. A helper
  `href(pattern, params)` typed on `ParamMap`-like shape keeps it honest.
- **The middleware** sees a concrete pathname (`/admin/events/abc-123/tickets`) and needs to
  match it against the pattern. Compile each pattern once, at module load, into a segment
  list: split on `/`, mark a segment `dynamic` when it starts with `[`. Matching is then a
  segment-wise walk with **no regex** — which matters, because `ORGANIZER_ASSIGNMENT_ROUTES`
  (`middleware.ts:80-86`) devotes a paragraph to the two anchoring mistakes a regex invites
  (`.*` anywhere re-opens the tree; an unanchored tail matches `/reviewers`). A segment walk
  cannot make either mistake: `[id]` matches exactly one non-empty segment and the walk
  compares lengths.

### The mechanism that replaces the load-bearing ordering

`middleware.ts:345-352` says the ordering *"is NOT a lookup table on purpose"* and names the
failure: invert the scanner and `/admin` branches and every organizer is locked out of the
door, in front of a queue. A map is a lookup table. The mechanism must therefore make
specificity a **property of the pattern**, never of the position:

```
resolve(pathname):
  candidates = every pattern whose segments match pathname segment-for-segment
  if none          → fail closed (bounce, no cause)
  if one           → it
  if several       → the one with (a) most segments, then (b) fewest dynamic segments
  if still tied    → THROW at module load, not at request time (see below)
```

Two properties make this safe against a careless later addition:

1. **Ambiguity is a load-time error, not a request-time coin flip.** Compute every
   pattern-pair that could tie (same segment count, same dynamic positions, and one is not
   strictly more literal than the other) **once, at module load**, and `throw`. A new entry
   that would create an ambiguity fails on the first import — which, because the map is
   imported by `src/middleware.ts`, means the first request in `next dev` and the first
   render at build time. `[ASSUMED — the throw-at-module-load behaviour under
   `next build --webpack` was not measured this session; if it turns out to be silently
   caught, move the check into the type-level assertion or a `verify:routes` script.]`
2. **Longest-literal-match is exactly today's ordering, expressed as data.** Today's three
   rules become: `/admin/scanner` (2 segments, 0 dynamic) beats `/admin` (1 segment) for
   `/admin/scanner`, and nothing else changes. The concrete nested cases this phase creates
   are the proof it is needed, not a hypothetical:

   | Path | Candidates | Winner | Would break under declaration order? |
   |------|-----------|--------|--------------------------------------|
   | `/admin/scanner` | `/admin`, `/admin/scanner` | `door.operate` | **yes — the door, in front of a queue** |
   | `/admin/members/register` | `/admin`, `/admin/members`, `/admin/members/register` | `register.read` | **yes — the folded todo, reopened** |
   | `/admin/members/growth` | `/admin`, `/admin/members`, `/admin/members/growth` | `admin.access` | yes — a master-only surface opened to organizers |
   | `/admin/events/xyz/media` | `/admin`, `/admin/events`, `/admin/events/[id]/media` | `staff.manage` | yes |
   | `/admin/events/xyz/review` | … , `/admin/events/[id]/review` | `party.manage` | yes — and this arm carries the assignment widening |

**`holdsByAssignment()` survives as a per-route property, not a regex.**
`ORGANIZER_ASSIGNMENT_ROUTES` (`middleware.ts:87-89`) becomes
`assignmentOpenable: true` on `party.manage`'s `/admin/events/[id]/review` entry, and the
middleware's arm becomes:

```ts
const entry = resolve(pathname);              // { key, assignmentOpenable }
if (!entry) return bounceToDashboard();       // fail closed — an unmapped path is refused
const openedByRole = capabilities.has(entry.key);
const openedByAssignment = entry.assignmentOpenable === true && holdsByAssignment(entry.key);
if (!openedByRole && !openedByAssignment) {
  return bounceToDashboard(entry.assignmentOpenable ? assignmentBounceCause() : null);
}
```

Two invariants to write into the plan as acceptance criteria, because both are one keystroke
from being lost:

- **`assignmentOpenable` is opt-in per route, never per key and never per prefix.** The
  docblock's rule — *"A route earns a place on this list only once it already has its own
  server-side gate, and the list grows one route at a time, as a decision, never as a
  convenience"* — must be carried onto the field, not left behind with the regex.
- **`assignmentBounceCause()` is called only on entries with `assignmentOpenable`.**
  `middleware.ts:259-267` states why: reporting an assignment cause on a rule that has no
  assignment arm "would explain a decision that was never taken that way". A map makes it
  trivially easy to call it everywhere. Do not.

### `src/middleware.ts` — what changes and what must not

```ts
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Nothing here has to change, and changing it is dangerous.** The matcher already covers
`/admin/*`, `/organizer/*` and `/api/*`. Three reasons it must not be narrowed:

1. **Server Functions are POSTs to their hosting route.** `[CITED: nextjs.org/docs/app/api-reference/file-conventions/middleware
   — "Server Functions are not separate routes in this chain. They are handled as POST
   requests to the route where they are used, so a Proxy matcher that excludes a path will
   also skip Proxy coverage on that path… A matcher change or a refactor that moves a Server
   Function to a different route can silently remove Proxy coverage."]` This phase **moves
   server actions' hosting routes** — `admin/members/actions.ts` is imported by a page
   rendered at `/organizer/members` today and at `/admin/members` after. Every action
   re-checks its own capability (`assertStaffManage`, `verifyMaster`), so the move is safe;
   but narrowing the matcher would not be.
2. The door's `/api/tickets/checkin` passes through this middleware on every scan, and the
   file says why the round trip is counted (`middleware.ts:136-140`).
3. `/membership-card` and `/attendance` are still judged here (`:428`), and they are outside
   the collapsed tree.

**`protectedPrefixes` (`middleware.ts:326-332`) does change.** `"/organizer"` can be dropped
once `/organizer/*` is a redirect — but only if the redirect is emitted *before* this array
is consulted. If the redirect is emitted at the very top of `src/middleware.ts` (the
recommendation below), a `/organizer/*` request never reaches `updateSession` at all, and the
entry is dead either way. **Leave the array otherwise untouched** — `/dashboard`,
`/membership-card`, `/attendance`, `/admin` are all still real.

---

## Where the redirect lives — the measured fork

### Verified facts

| Fact | Evidence |
|------|----------|
| `permanent: true` ⇒ **308**; `permanent: false` ⇒ 307 | `[CITED: nextjs.org/docs/app/api-reference/config/next-config-js/redirects — "if true will use the 308 status code which instructs clients/search engines to cache the redirect forever, if false will use the 307 status code which is temporary and is not cached"]` |
| A `statusCode` property exists as an alternative to `permanent`, but not both | same page |
| `next.config` `redirects` run **before** middleware | `[CITED: nextjs.org/docs/app/api-reference/file-conventions/middleware — "Execution order: 1. headers from next.config.js 2. redirects from next.config.js 3. Proxy (rewrites, redirects, etc.) 4. beforeFiles 5. Filesystem routes …"]` |
| Redirects are checked **before the filesystem** | same redirects page |
| Query values pass through to the destination | same page |
| `:id` in `source` is usable in `destination`; patterns are anchored to the start; `:slug` matches one segment, `:slug*` matches nested | same page |
| **`middleware.ts` is deprecated in Next 16 and renamed to `proxy.ts`** | `[CITED: same page, Version history — "v16.0.0 · Middleware is deprecated and renamed to Proxy. Proxy defaults to the Node.js runtime"]`. A codemod exists: `npx @next/codemod@canary middleware-to-proxy .` |
| `NextResponse.redirect(url, init?: number \| ResponseInit)` accepts a status | `[VERIFIED: node_modules/next/dist/server/web/spec-extension/response.d.ts:19]` |

> **On the deprecation.** This repository is on `next@16.1.6` and still uses
> `src/middleware.ts`, and it builds `[VERIFIED: package.json, src/middleware.ts, and the
> `npx tsc --noEmit` run this session]`. **I could not confirm whether 16.1.6 emits a
> deprecation warning at build time** — the grep of `node_modules/next/dist/build/index.js`
> for the warning string timed out and was abandoned. **Recommendation: do not rename in
> this phase.** It is a whole-file rename of the single most safety-critical file in the
> repo, in the same phase that rewrites its logic; two changes that each look like the other
> in a diff. Record it as a finding for its own small plan, after Phase 39.

### The measurement that decides it

Enabling `typedRoutes: true` and running `next typegen` in this repository produced
`.next/types/link.d.ts`, whose `StaticRoutes` union **includes the four existing
`next.config` redirect sources**:

```
| `/galleria`      ← next.config redirect source
| `/presenze`      ← next.config redirect source
| `/registrati`    ← next.config redirect source
…
type DynamicRoutes<T> = … | `/eventi/${OptionalCatchAllSlug<T>}`   ← next.config redirect source
```
`[VERIFIED: .next/types/link.d.ts:67,79,81,93 — generated this session with
`npx next typegen`, then deleted]`

`RouteImpl<T>` = `StaticRoutes | SearchOrHash | WithProtocol | …` and is the type of
`Link href`, `useRouter().push/replace/prefetch`, `redirect()` and `permanentRedirect()`
`[VERIFIED: .next/types/link.d.ts:108-115, and the `declare module 'next/navigation'` block
at :155-200]`.

**Therefore:** declaring `/organizer/:path*` as a `next.config` redirect source would put
`/organizer/*` back into the union, and **every one of the 20 stale
`redirect("/organizer/events")` calls and 29 stale `href="/organizer/…"` sites would keep
compiling.** The compiler would report a green on the exact sweep that most needs a
mechanical check.

Emitting the 308 from the middleware keeps `/organizer` out of `RedirectRoutes` and out of
`RouteImpl`, so after the `(organizer)` group is deleted those literals become type errors.

### Recommendation

**Emit the redirect from the top of `src/middleware.ts`, before `updateSession` is called**,
from a table that lives beside the route map:

```ts
// src/lib/routes/organizer-redirects.ts  — reviewed as a table (D-34-04)
export const ORGANIZER_REDIRECTS: ReadonlyArray<readonly [from: string, to: string]> = [
  ["/organizer",                        "/admin/events"],   // NOT "/admin": no chained 308
  ["/organizer/artists",                "/admin/artists"],
  ["/organizer/venues",                 "/admin/venues"],
  ["/organizer/members",                "/admin/members"],
  ["/organizer/events",                 "/admin/events"],
  ["/organizer/events/new",             "/admin/events/new"],
  ["/organizer/events/[id]/analytics",  "/admin/events/[id]/analytics"],
  ["/organizer/events/[id]/assignments","/admin/events/[id]/assignments"],
  ["/organizer/events/[id]/drinks",     "/admin/events/[id]/drinks"],
  ["/organizer/events/[id]/edit",       "/admin/events/[id]/edit"],
  ["/organizer/events/[id]/guest-list", "/admin/events/[id]/guest-list"],
  ["/organizer/events/[id]/media",      "/admin/events/[id]/media"],
  ["/organizer/events/[id]/review",     "/admin/events/[id]/review"],
  ["/organizer/events/[id]/sales",      "/admin/events/[id]/sales"],
  ["/organizer/events/[id]/tickets",    "/admin/events/[id]/tickets"],
];
```

Fifteen explicit rows, one per address that exists today `[VERIFIED against the generated
`AppRoutes` union — the 15 `/organizer*` members]`. **Not a `:path*` catch-all**, for three
reasons: D-34-04's own word is *"reviewed as a table"*; a catch-all silently aliases any
future `/admin/x` as `/organizer/x`; and a catch-all cannot express `/organizer` →
`/admin/events` (skipping the chained redirect).

**The `/admin/scanner` fence is structural here, not a rule to remember.** Every `from` is
under `/organizer`; no `from` can match `/admin/scanner`, and no `to` names it. Add a
module-load assertion anyway — `if (ORGANIZER_REDIRECTS.some(([f, t]) => f.startsWith("/admin") || t.includes("/scanner"))) throw` — so that the fence is a mechanism and not a
paragraph. The paragraph will be read once; the throw is read every time.

**Verification without deploying.** `curl -sI -H 'Cookie: …' http://localhost:3000/organizer/members`
against `next dev` returns the status and `Location` for every row; a 15-line shell loop
walks the whole table and prints a pass/fail column. **This is the only instrument in the
phase that can prove STAFF-02 mechanically, and it does not need production.** Write it as a
committed script (`scripts/verify-organizer-redirects.sh`) rather than as prose in a
`VERIFICATION.md` — a shell loop is re-runnable, a prose procedure is not.

### If the planner chooses `next.config` anyway

It is a defensible choice — edge-cacheable, no function invocation, runs before middleware,
and it matches the existing precedent in this repo. The costs, stated so the choice is made
with them:

- `typedRoutes` gives a **false green** on the literal sweep. The walk must then be
  exhaustive and manual, and the plan must say the compiler is not helping.
- A config redirect fires **before** any session exists, so it cannot carry a cause and
  cannot be conditioned on capability. That is correct for this phase (address translation
  has no subject) but it is a property to state, not to discover.
- **Do not add `has: [{ type: "cookie", … }]` to a config redirect.** A conditional redirect
  is a `Vary`-less response that a shared cache can serve to the wrong viewer. The
  unconditional 15 rows are safe to cache precisely because they are the same for everybody.

---

## Three hand-maintained menus, not two

`34-CONTEXT.md` says *"two hand-maintained menus"*. Measured, there are **three**
`[VERIFIED: files read in full]`:

| Component | Filters on | Hardcoded routes | After STAFF-03 |
|-----------|-----------|------------------|----------------|
| `src/components/staff/StaffNav.tsx` | `context: "admin" \| "organizer"` (`:9`) **and** `roles: ["master"]` on Finance/Analytics (`:22,28`) | 7 tab slugs + `basePath` at `:34` | Reads the map; `context` deleted; `roles` becomes the capability that opens each route |
| `src/components/layout/MobileNav.tsx` → `getVisibleNavItems(role, status)` (`roles.ts:113`) | role **and** status | `/admin/scanner` at `roles.ts:78` | The `/admin/scanner` entry becomes `door.operate` from the map; the three public entries (`/`, `/events`, `/gallery`) stay role-based — **explicitly out of scope** per the Deferred Ideas |
| `src/components/account/ManagementSection.tsx` | `role: "master" \| "organizer"` (`:8`) | **two literal lists**, 7 + 4 hrefs (`:10-25`) | Reads the map. This is the third menu, and it is the one most likely to be forgotten |

**All three are among the 14 sites `typedRoutes` flags today** (`StaffNav.tsx:56`,
`MobileNav.tsx:60`, `ManagementSection.tsx:39`) `[VERIFIED: npx tsc --noEmit, this session]`
— because all three build their href by concatenation. Converting them to read a
`Route`-typed map is simultaneously the STAFF-03 conversion and the fix for three of the 14
errors. `[CITED: nextjs.org/docs/app/api-reference/config/typescript — the documented
`navItems: NavItem<Route>[]` pattern is exactly this]`

**On `getVisibleNavItems(role, status)`.** Its docblock (`roles.ts:97-112`) already reasons
about `staff` and about why the Check-in tab must not appear for it — *"Adding `"staff"`
here would show a tab that leads to a redirect, which is the worst of both: a promise at the
door that the server then breaks."* That sentence **is** STAFF-03, written before the
requirement. Re-express the function as `getVisibleNavItems(capabilities: Set<CapabilityKey>)`
for the entries that are capability-gated, and keep `requireAuth` / `hideWhenAuth` /
`requireApproved` for the three public entries, which no capability governs. Replacing it
wholesale would drag the public nav into scope, which the Deferred Ideas forbid.

**On the `UserRole` cast.** Every collapsed page currently does
`role as UserRole` to feed the navs (`artists/page.tsx:24-26` and 30 more). D-34-07's layout
plus capability-driven navs delete the cast at the source: `AccessContextResult.role` and
`.status` can then leave the payload — and `capabilities/server.ts:200-208` says in so many
words that **phase 34 owns removing those two fields**. Doing so is a change to
`my_access_context()`'s consumers only; the SQL payload keeps the keys (removing them is a
migration and is out of scope). Say which of the two was done.

---

## Runtime State Inventory

This is a rename/refactor phase: an address is runtime state. *After every file in the repo
is updated, what runtime systems still have the old address cached, stored, or registered?*

| Category | Items found | Action required |
|----------|-------------|-----------------|
| **Stored data** | **None.** No table stores a route path. Verified by grepping the migrations for `/admin` and `/organizer`: the only hits are in comments describing the middleware `[VERIFIED: grep over supabase/migrations/]`. `membership_acts`, `party_assignments`, `door_scan_events` store no URL | none |
| **Live service config** | **1 — the browser HTTP cache of every already-visited client.** A 308 is cached "forever" by the client `[CITED: nextjs.org redirects doc]`. **2 — Vercel's edge**, if the redirect is a `next.config` one (it is served from the routing layer). **3 — the service worker's Cache Storage.** `next.config.ts` sets `cacheOnNavigation: true` and `src/app/sw.ts:60` uses `[...doorRuntimeCaching, ...defaultCache]`, where `defaultCache` is Serwist's inherited rule set. `skipWaiting: true`, `clientsClaim: true` and `cleanupOutdatedCaches: true` (`sw.ts:52-59`) mean the **precache** is replaced on deploy, but I **could not determine** from this session whether `defaultCache`'s navigation rule would hold a cached 308 for a `/organizer/*` document request `[NOT VERIFIED — reading Serwist's `defaultCache` internals was out of budget]` | **Recommend: verify the redirect table with 307 (`permanent: false`) during the phase and flip to 308 in the final plan, once the table has been walked.** D-34-04 requires 308 *at ship*; it does not require 308 during development, and the CONTEXT explicitly gives "how the redirect table is verified" to Claude's discretion. A wrong 307 is recoverable; a wrong 308 on a staff phone is not, and there is no error tracking to notice |
| **OS-registered state** | **None.** No launchd, no Task Scheduler, no pm2, no cron registration names a route. `vercel.json` cron paths are all `/api/cron/*` and untouched `[VERIFIED: grep]` | none |
| **Secrets / env vars** | **None.** No env var holds a route. `.env.local` and `.env.local.example` exist; `NEXT_PUBLIC_APP_URL` is an origin, not a path `[VERIFIED: grep for admin/organizer in .env.local.example]` | none |
| **Build artifacts** | **`.next/` — two ways.** (a) The known trap: a stale `.next` produces a false build failure after a worktree merge; `rm -rf .next` first (`34-CONTEXT.md`, and `33-CONTEXT.md` records it). (b) **New with `typedRoutes`: `.next/types/routes.d.ts` and `link.d.ts` are generated and are in `tsconfig.json`'s `include` (`.next/types/**/*.ts`, line 30)** `[VERIFIED: tsconfig.json]`. A stale generated union will validate a route that no longer exists — a false green on the exact sweep. **`rm -rf .next` before every type-check that is used as evidence**, and say so in the plan | plan task |
| **Bookmarks and already-sent links** | The reason STAFF-02 exists. Not enumerable — that is what the redirect table is for | the 15-row table |

**The 308 is a fourth monotone guard.** `meta-gates.md` names three one-way switches
(`venue_reveal_sent`, a payment reaching `completed`, a series progressive). A 308 served to
a client is a fourth: it cannot be withdrawn from that client's cache from the server side.
The rule that follows is the same as for the other three — **a change may only make it
harder to trip, never easier** — which in practice means: no redirect is added without the
table being walked, and no `from` is ever re-pointed at a different `to`.

---

## Persona coherence is a build gate here — and the CONTEXT does not name it

Deleting `src/app/(organizer)/` breaks `npm run verify:persona`, which is the repository's
only automatic check `[VERIFIED: scripts/verify-persona.mjs, read]`:

| Check | What it asserts | Why it breaks |
|-------|-----------------|---------------|
| **A** (`:236-244`) | No declared glob is dead — every `paths:` entry must match at least one file | `.claude/rules/access-gating.md:9` and `.claude/rules/nextjs-architecture.md:6` both declare `"src/app/(organizer)/**"`. With the folder gone, both globs match nothing → **exit 1** |
| **B** (`:247-261`) | The `CLAUDE.md` index and each frontmatter declare the **same** glob set | `CLAUDE.md:230` and `:235` both list `src/app/(organizer)/**`. Fixing the frontmatter without the index fails B; fixing the index without the frontmatter fails B the other way. **Both edits belong in the same commit** |
| **G** (`:~359+`) | Every row of `meta-gates.md`'s priority table routes to a module that really loads on those files | `meta-gates.md:50` names `src/app/(admin)/**, src/app/(organizer)/**`. The row must lose the organizer glob |
| **E** | Context budget under the pre-registered ceiling | Removing a glob only ever narrows; E cannot newly fail. Note it, do not worry about it |

Prose that becomes false and must be corrected rather than inherited (`C10`):

- `nextjs-architecture.md:34` — *"Quattro route group, e il gruppo **è** il pubblico"* with
  `(organizer)` — organizzatori / `(admin)` — master. **After this phase the group is no
  longer the audience**, which is exactly what D-34-02 accepts deliberately. That gate has
  to be rewritten, not silently left standing: it currently tells a future reader that
  putting a file in `(admin)` is an access decision, and after this phase it is not.
- `CLAUDE.md`'s Domain Module Index rows for Access & Gating and Next.js Architecture.

**This is a plan task with an owner, not a tidy-up.** `verify-persona` is not wired to
`next build` (deliberately, `verify-persona.mjs:19-22`), so nothing will stop a deploy — the
check simply goes red the next time somebody runs it, and a red check nobody caused is a
check people stop running. Put it in the same plan that deletes the route group.

---

## The literal sweep — 99 strings, and what the compiler can and cannot see

Measured 2026-08-09 `[VERIFIED: grep -rEo '"/(admin|organizer)[^"]*"' src/]`: **48**
`/admin…` literals in **22** files, **51** `/organizer…` in **20** — matching the CONTEXT
exactly. Classified by what they *are*:

| Kind | Count | Caught by `typedRoutes`? | Notes |
|------|-------|--------------------------|-------|
| `href="/…"` on `Link` | 29 | **Yes** — `RouteImpl` is the `href` type | Includes the three menus and `EventList`'s six |
| `redirect("/…")` from `next/navigation` | **20** | **Yes** — `redirect<RouteType>(url: RouteImpl<RouteType>)` `[VERIFIED: .next/types/link.d.ts:185-196]` | 15 of the 20 are `redirect("/organizer/events")` inside organizer pages that get deleted anyway |
| **`revalidatePath("/…")`** | **26** | **NO** | See below — this is the dangerous category |
| Middleware prefix strings (`startsWith`) | 6 | No — plain string comparison | All replaced by the map |
| `basePath` / component defaults | ~4 | Partially (the concatenation sites are 6 of the 14 errors) | `EventList.tsx:24,30` |
| Nav data literals | ~14 | Yes once typed as `Route` | `roles.ts:78`, `ManagementSection.tsx:10-25`, `StaffNav.tsx:12-30` |

### `revalidatePath` is the silent-failure category

26 calls across three files `[VERIFIED: grep -rEn 'revalidatePath\(\s*"/(admin|organizer)' src/]`:

- `src/app/(admin)/admin/members/actions.ts` — **16 calls**, in five matched pairs
  (`/admin/members` **and** `/organizer/members`) plus four `/admin/members`-only
- `src/app/(organizer)/organizer/events/actions.ts` — 7 calls (`/organizer/events`,
  `/admin/events`, `/events`, `/events/${slug}`)
- `src/app/(public)/tickets/refund-actions.ts` — 4 calls to `/organizer/events`

**`revalidatePath` on a path that no longer exists is a no-op with no error and no log.** It
is not caught by `typedRoutes` (its parameter is a plain `string`; the augmentation covers
`Link`, `useRouter`, `redirect` and `permanentRedirect` only `[VERIFIED: the `declare module`
blocks in `.next/types/link.d.ts` — `next/link`, `next/navigation`, `next/form`; no
`next/cache`]`), it is not caught by `next build`, and in a project with **no error
tracking** (`meta-gates.md`) the only observable effect is *a members list that stops
refreshing after an approval*. That is a member-facing consequence of a routing edit.

Two corollaries for the plan:
- Each matched pair collapses to **one** call. Deleting the wrong half of a pair is a
  one-character mistake with no detector.
- **This is the strongest argument for a committed `scripts/verify-routes.mjs`**, however
  small: read every string literal argument of `revalidatePath(` under `src/`, assert each
  is a member of the map or of a declared public-route allow-list, exit 1 naming any that is
  not. Twenty lines, zero dependencies, and it is the only mechanism that can see this
  category. Proof by mutation is cheap: point one call at `/organizer/members`, confirm the
  script names it.

---

## Parallelism — a wave structure that does not repeat Phase 32

Phase 32: 143 agent-minutes against 135 elapsed — parallelism saved **6%**, because four
consecutive plans extended the same file (`33-CONTEXT.md:154-158`). The shared file here is
the route map. Granularity is `medium`.

| Wave | Plans | Owns | Shared file risk |
|------|-------|------|------------------|
| **1** | **1** | `src/lib/routes/capability-routes.ts` + `organizer-redirects.ts` + `typedRoutes: true` + the 14 resulting type fixes + the two mutation proofs | **This is the only plan that writes the map.** Nothing after it extends it |
| **2** | **3, disjoint** | (a) `src/lib/supabase/middleware.ts` + `src/middleware.ts` — the three prefix rules become the resolver, redirects emitted at the top · (b) `src/app/(admin)/admin/layout.tsx` + `StaffNav` + `MobileNav` + `ManagementSection` + `roles.ts` · (c) the two organizer-only moves: `assignments`, `review` → `/admin/events/[id]/…` | (a) touches only `lib/supabase` + `src/middleware.ts`; (b) only `components/` + `lib/rbac`; (c) only new files under `(admin)` |
| **3** | **6, disjoint directories** | P1 `artists`+`venues` · P2 `members` (+`growth`, `register` links, `MemberTable`) · P3 `events`+`events/new` (+`EventList`, `EventForm`) · P4 `events/[id]/{edit,drinks}` · P5 `events/[id]/tickets` · P6 `events/[id]/{sales,guest-list,analytics,media}` | Each owns one directory set and at most one shared component. `tickets` alone because it is the largest divergence (140 changed lines) |
| **4** | **2** | (a) delete `src/app/(organizer)/` **and** correct the persona in the same commit (2 frontmatters, `CLAUDE.md` ×2 rows, `meta-gates.md:50`, `nextjs-architecture.md:34`) · (b) the literal sweep: 26 `revalidatePath`, remaining `redirect`/`href`, `scripts/verify-routes.mjs`, and the `verify:capabilities` side-4 message (D-34-12) | (a) and (b) touch different files if (b) is scoped to `actions.ts` files and `scripts/` |
| **5** | **1** | Verification: `rm -rf .next && npm run build`, `verify:persona`, `verify:capabilities`, `baseline:container` + `baseline:compare`, the redirect-table walk, the written manual procedures, `34-VERIFICATION.md` | Serial by nature |

**13 plans, 5 waves, 2.6 plans/wave** — against Phase 32's 1.2 and Phase 31's 2.2.

The one genuine serial dependency is Wave 1 → everything: the map must exist before any
consumer. Wave 3 depends on Wave 2(b) only for the layout's existence, which is one file;
if that becomes the bottleneck, land an empty-but-typed layout in Wave 1 and fill it in
Wave 2.

---

## Common Pitfalls

### Pitfall 1 — a lookup table that resolves by declaration order
**What goes wrong:** an entry added later shadows a more specific one; `/admin/scanner` is
judged by `admin.access`; every organizer is locked out of the door.
**Why it happens:** `middleware.ts:345-352` prevents it today with an `if/else if` pair whose
order is documented as load-bearing. A map has no order.
**How to avoid:** longest-literal-match computed from the pattern, plus a module-load throw
on ambiguity. **Warning sign:** any `.find()` over the map in the middleware.

### Pitfall 2 — `assignmentOpenable` spreading
**What goes wrong:** the per-route allow-list becomes a per-key or per-prefix flag, and every
route bound to `party.manage` becomes assignment-openable.
**Why it happens:** a map makes "apply to all of them" one keystroke shorter than "apply to
this one".
**How to avoid:** the flag lives on the route entry, never on the key; the docblock rule
travels with it verbatim. **Warning sign:** `assignmentOpenable` at the same nesting level
as `scope`.

### Pitfall 3 — a redirect that consults a session
**What goes wrong:** a `has: [{type: "cookie"}]` config redirect, or a middleware redirect
placed after `supabase.auth.getUser()`, produces a response that varies by viewer and can be
cached by a shared cache for the wrong one.
**How to avoid:** address translation has no subject. Emit before any auth work, with no
condition. **Warning sign:** the word `capabilities` anywhere in the redirect code path.

### Pitfall 4 — the false green from a stale `.next`
**What goes wrong:** `.next/types/routes.d.ts` still contains `/organizer/*` after the
folder is deleted, so the type-check passes and the sweep looks complete.
**Why it happens:** `tsconfig.json:30` includes `.next/types/**/*.ts`, and `typegen` runs
incrementally.
**How to avoid:** `rm -rf .next` before any type-check used as evidence. **Warning sign:** a
green build immediately after deleting 15 page files.

### Pitfall 5 — a 308 that points at another 308
**What goes wrong:** `/organizer` → `/admin` → (runtime redirect) `/admin/events`. Two hops,
two cache entries, and the middle one is a page with no gate (finding F2).
**How to avoid:** every `to` in the redirect table is a **rendered** address, never another
redirect. Assert it at module load: `to` must appear in the route map.

### Pitfall 6 — collapsing a divergence "towards more" without a grant
**What goes wrong:** the merged page shows a control that only one of the two originals
showed, and the grant does not cover it.
**How to avoid:** D-34-06. Each merged surface gets one line in the plan naming the grant
row. Where none exists, the surface takes **the more restrictive** behaviour and the case is
a finding. **Warning sign:** a plan line that says "the admin version is more complete, so
use it" without naming a grant.

### Pitfall 7 — reading the middleware as the boundary
**What goes wrong:** the map is described as "the permission system", and a later reader
assumes a route with an entry is protected.
**How to avoid:** C6. The map decides **where somebody may go**; RLS decides what they may
read. `capabilities/server.ts:161-182` already writes this sentence for
`liveAssignmentCapabilities`; the map inherits it verbatim. **Warning sign:** a comment on
the map module that omits it.

### Pitfall 8 — assuming the door is untouched because nobody edited it
**What goes wrong:** `/admin/scanner` keeps its address, but the middleware branch that
judges it is rewritten in the same file, and the rewrite is the risk.
**How to avoid:** the scanner's entry is written **first** in the map, with the
`door.operate` binding and the `requires_approved = false` note beside it; and the manual
procedure for it (a `pending` organizer loading `/admin/scanner`) is run **before** and
**after** the middleware plan lands, not once at the end.

---

## Code Examples

### Reading the map from the middleware — the shape that preserves the three states

```ts
// src/lib/supabase/middleware.ts — replacing :385-423
// The map is a lookup table, and the ordering it replaces was documented as NOT one
// (:345-352). What makes that safe is that `resolveRoute` picks by SPECIFICITY of the
// pattern, never by position in the object: /admin/scanner (2 literal segments) beats
// /admin (1) for every request, and no entry added later can change that.
const entry = resolveRoute(pathname);

if (entry) {
  const byRole = capabilities.has(entry.capability);
  const byAssignment =
    entry.assignmentOpenable === true && holdsByAssignment(entry.capability);

  if (!byRole && !byAssignment) {
    // The cause is reported ONLY where an assignment arm exists (:259-267): reporting
    // an assignment cause on a rule that has no assignment arm explains a decision that
    // was never taken that way.
    return bounceToDashboard(entry.assignmentOpenable ? assignmentBounceCause() : null);
  }
}
// No entry: fail closed. A path under the staff tree with no binding is a page nobody
// declared, and the type-level assertion in the map makes that a build error — this
// branch exists for the paths OUTSIDE the tree, which fall through unchanged.
```

### The redirect, emitted before any auth work

```ts
// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveOrganizerRedirect } from "@/lib/routes/organizer-redirects";

export async function middleware(request: NextRequest) {
  // Address translation, before anything that costs a round trip. It has no subject:
  // it must not read a session, must not vary by viewer, and must not be able to name
  // /admin/scanner (asserted at module load in the table's own file).
  const to = resolveOrganizerRedirect(request.nextUrl.pathname);
  if (to) {
    const url = request.nextUrl.clone();
    url.pathname = to;                 // query string is preserved by clone()
    return NextResponse.redirect(url, 308);
  }
  return await updateSession(request);
}
```
`[VERIFIED: `NextResponse.redirect(url, init?: number | ResponseInit)` —
node_modules/next/dist/server/web/spec-extension/response.d.ts:19]`

### A nav that cannot show what the server will refuse

```tsx
// A "use client" nav. It imports the map (pure data, no server edge) and the resolved
// capability set as a prop. STAFF-03 holds by construction: the entry is drawn from the
// same declaration the middleware reads, so a visible entry always has a matching gate.
// It does NOT hold the other way round, and must not be claimed to: hiding a link is not
// protecting a route (`access-gating.md`).
export default function StaffNav({ capabilities }: { capabilities: readonly CapabilityKey[] }) {
  const held = new Set(capabilities);
  const tabs = STAFF_TABS.filter((t) => held.has(t.capability));
  // …
}
```

---

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|--------------|------------------|--------------|-------------|
| `middleware.ts` file convention | `proxy.ts`; `middleware` deprecated and renamed | **Next 16.0.0** `[CITED: nextjs.org middleware/proxy version history]` | Do **not** rename in this phase. Record as its own finding |
| Middleware on the Edge runtime | Proxy defaults to the **Node.js runtime** | Next 16.0.0, same table | No action; this repo already relies on `@supabase/ssr` in middleware |
| `experimental.typedRoutes` | `typedRoutes` (stable) | marked stable in Next 16 `[CITED: typedRoutes doc]` | Enabling it is a one-line config change plus 14 fixes |
| Hand-written `PageProps` | Generated `PageProps<'/route'>`, `LayoutProps`, `RouteContext` globals | Next 16 `[VERIFIED: .next/types/routes.d.ts, generated this session]` | Available for the new layout, not required |

**Deprecated / outdated in this repository's own documents:**
- `middleware.ts:66-74`'s claim that two `/organizer` pages carry no server-side check —
  stale; `media/page.tsx:63` gates on `staff.manage` (the CONTEXT already corrects this).
  **But the correction is incomplete: an `/admin` page is in that state instead** (F1).
- `34-CONTEXT.md`'s "four surfaces exist twice" — twelve pairs, measured.
- `34-CONTEXT.md`'s "two hand-maintained menus" — three (`ManagementSection` is the third).

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | v25.6.1 | — |
| TypeScript | CAP-02's gate | ✓ | 5.9.3 | — |
| `next` CLI (`build`, `typegen`) | CAP-02, typedRoutes | ✓ | 16.1.6 | — |
| Docker | `npm run baseline:container` | ✓ | 29.2.1 | none — the container is the only source of persona truth |
| `.env.local` | `verify:capabilities`, `baseline:rls` | ✓ present | — | container target for capabilities side 1–3; side 4/5 need a database either way |
| `psql` | none of the scripts (they use `pg` from npm / the Management API) | ✗ | — | not needed |
| `curl` | the redirect-table walk | ✓ (macOS built-in) | — | — |
| Error tracking | **nothing** | ✗ | — | **no fallback.** Every new failure path in this phase must have an observable effect or be declared as having none |
| CI | **nothing** | ✗ | — | **no fallback.** `verify:capabilities` is a written pre-deploy step (D-34-12) |

---

## Validation Architecture

`.planning/config.json` has no `workflow.nyquist_validation` key, so it is treated as
enabled. **There is no test framework and none is proposed** (C1).

### Test framework

| Property | Value |
|----------|-------|
| Framework | **none** — `package.json` has no `test` script; no `*.test.*` / `*.spec.*` exists `[VERIFIED: package.json read in full]` |
| Config file | none |
| Quick run command | `rm -rf .next && npm run build` (this is also the typecheck) |
| Full suite command | `rm -rf .next && npm run build && npm run verify:persona && npm run verify:capabilities && npm run verify:no-header-identity` |

### Phase requirements → instrument map

| Req | Behaviour | Instrument | Automated command | Exists? |
|-----|-----------|-----------|-------------------|---------|
| **CAP-02** | A key with no route fails the production build | Type-level totality over `CapabilityKey` | `rm -rf .next && npm run build` **after** adding a 13th key to `CAP` (mutation) | ❌ Wave 1 — the map does not exist |
| **CAP-02 (inverse)** | A staff route with no key fails the build | `_everyStaffRouteIsBound` assertion | same, after deleting one route from the map | ❌ Wave 1 |
| **CAP-02 (chain)** | The catalogue matches `CAP` | `verify-capabilities` sides 1–3, 5 | `npm run verify:capabilities` | ✅ exists — **needs a database, no CI** |
| **STAFF-01** | Each surface exists once | File census | `find "src/app/(admin)" "src/app/(organizer)" -name page.tsx \| wc -l` → must be 23, and `src/app/(organizer)` must not exist | ❌ Wave 4 — trivially scriptable |
| **STAFF-01** | The merged surface shows what the viewer is entitled to | **Manual, per role.** No instrument can see this | written procedure, below | ❌ Wave 5 |
| **STAFF-02** | Old addresses answer 308 to the right twin | `scripts/verify-organizer-redirects.sh` against `next dev` | `bash scripts/verify-organizer-redirects.sh` — 15 rows, status + `Location` per row | ❌ Wave 1 (table) / Wave 5 (run) |
| **STAFF-02** | No redirect matches or points at `/admin/scanner` | module-load assertion in `organizer-redirects.ts` | any import — so `npm run build` | ❌ Wave 1 |
| **STAFF-03** | A hidden entry has a matching server-side refusal | **Type-level:** the nav and the middleware read the same map, so they cannot disagree about the *key*. **Manual:** that the key is the *right* one | build + written procedure | ❌ Wave 2 |
| **STAFF-03** | `revalidatePath` targets a real route | `scripts/verify-routes.mjs` | `node scripts/verify-routes.mjs` | ❌ Wave 4 |
| **All (no permission moved)** | RLS is unchanged | `baseline:container` + `baseline:compare` | see below | ✅ exists |

### Sampling rate

- **Per task commit:** `rm -rf .next && npm run build`. It is the typecheck, it is the CAP-02
  gate, and it is the only thing that runs in under two minutes.
- **Per wave merge:** the full suite command above, plus
  `bash scripts/verify-organizer-redirects.sh` once the table exists.
- **Phase gate, before `/gsd:verify-work`:** full suite green, redirect walk green, the
  container baseline compared, and every written procedure executed and recorded with its
  date in `34-VERIFICATION.md`.

### The container baseline — what it proves, and the claim it does **not** support

```bash
npm run baseline:container -- --phase-point=pre-34    # B1+B2+B3, throwaway postgres:17.6
# … the phase …
npm run baseline:container -- --phase-point=post-34
npm run baseline:compare -- --only=B1,B2,B3 --before-dir=… --after-dir=…
```
`[VERIFIED: scripts/rls-baseline-container.mjs usage block :34-38; rls-baseline-compare.mjs
usage :19-22]`

- **B3 writes.** On production it refuses without `--i-know-this-writes`
  `[VERIFIED: rls-baseline.mjs:25,2194-2200,2232]`. On the container it is safe by
  construction — the file reads **no** environment variable at all and only connects to a
  container it started itself `[VERIFIED: rls-baseline-container.mjs:26-32]`. **Use the
  container.**
- **A captured artefact is never overwritten**; an existing file aborts with exit 1 naming
  `--overwrite` `[VERIFIED: same docblocks]`.
- **The honest boundary, and it corrects a sentence in `34-CONTEXT.md`.** The CONTEXT says a
  green CAP-03 comparison *"is the instrument that proves no permission moved — which for
  this phase is the whole claim."* **It is not.** B1 dumps `pg_policies`, B2/B3 are persona
  read/write matrices, B5 is the Supabase advisor. **None of them can see a route.** This
  phase edits no migration, so a green comparison is very nearly guaranteed and proves only
  *"no row-level permission moved"* — which is true and worth recording, and is a small part
  of the claim. **What moved is who reaches which address, and the only instruments for that
  are the route map's type-level assertions and a person signing in as each role.** Say this
  in `34-VERIFICATION.md` rather than letting a green baseline stand in for it.

### Written manual procedures — the only proof for what no script can see

Each must be written before it is run, executed by a person, and recorded in
`34-VERIFICATION.md` with its date and its observed result (C11). Roles only.

| # | Role / state | Steps | What must be observed |
|---|--------------|-------|----------------------|
| M-1 | `master` / `approved` | Sign in. Open the collapsed nav. Visit each of the 23 addresses | Every nav entry present; every address renders; **no address bounces** |
| M-2 | `organizer` / `approved` | Sign in. Open the nav. Visit all 23 | Finance, Analytics ×3, Newsletter, `members/growth` **bounce to `/dashboard`**; everything else renders; **`/admin/members/register` renders** — this is the folded todo closing |
| M-3 | `organizer` / **`pending`** | Sign in (seed by hand — Phase 43's constraint forbids the state, see `43-CONTEXT.md` D-15) | Events/tickets surfaces render (`staff.manage` ignores status); **`/admin/members/register` bounces** (`register.read` requires approved); **`/admin/scanner` renders** — `door.operate`'s `requires_approved = false`, D-06 |
| M-4 | `staff` / `approved` | Sign in. Open the nav | **No staff entry at all.** Every one of the 23 addresses bounces. `/membership-card` and `/attendance` render. This is the answer to 43-CONTEXT's deferred question, observed rather than asserted |
| M-5 | `member` / `approved` | Sign in | Same as M-4 minus nothing — a member and a staff account see the same staff surface, which is none |
| M-6 | any, with a **live per-night assignment** carrying `party.manage` | Sign in. Open `/admin/events/<id>/review?party=<assigned>` then `?party=<other>` | The assigned night renders; the other **refuses on the page**, not in the middleware. `?access=not-assigned-here` where applicable |
| M-7 | signed in, any staff role | Visit each of the 15 `/organizer/*` addresses **in a browser** | 308 to the right twin; the twin renders. **Start signed in** — F4 means a signed-out run measures the broken `?next=`/`?redirect=` mismatch instead |
| M-8 | `organizer` / `approved` | On `/admin/members`, approve an account | The list **refreshes without a manual reload** — this is the only observable proof that the surviving `revalidatePath` is the right one |
| M-9 | door device, **network off** | Open `/admin/scanner`, scan | Unchanged from before the phase. **Run it before and after the middleware plan**, not once |

**M-8 and M-9 are the two that would otherwise be discovered by a person at a bad moment**:
M-8 by an organizer approving someone and seeing nothing happen, M-9 at a door.

### Wave 0 gaps

- [ ] `src/lib/routes/capability-routes.ts` — CAP-02 both directions
- [ ] `src/lib/routes/organizer-redirects.ts` — STAFF-02, with the `/admin/scanner` assertion
- [ ] `scripts/verify-organizer-redirects.sh` — STAFF-02, mechanical
- [ ] `scripts/verify-routes.mjs` — STAFF-03's `revalidatePath` half
- [ ] `typedRoutes: true` in `next.config.ts` + the 14 measured type fixes
- [ ] No test framework is installed. **This is correct and must not change** (C1)

---

## Security Domain

`.planning/config.json` has no `security_enforcement` key; absent = enabled.

### Applicable ASVS categories

| Category | Applies | Standard control, as this repository already implements it |
|----------|---------|-----------------------------------------------------------|
| **V2 Authentication** | no | Untouched. Session comes from `@supabase/ssr`; this phase adds no auth path |
| **V3 Session Management** | **indirectly** | The middleware's cookie re-application (`middleware.ts:482-495`) must survive the rewrite. **A redirect emitted before `updateSession` returns without re-applying cookies** — correct for a 308 (no session work happened), but it must not be moved *after* the Supabase client is built and *before* the cookie loop, or a navigation could drop a refreshed cookie |
| **V4 Access Control** | **yes — this is the phase** | Two layers, deliberately unequal: the middleware (UX) and RLS (the boundary), C6. **The phase adds no third layer and removes none.** The route map is a *declaration*, not an enforcement point |
| **V5 Input Validation** | **yes** | `pathname` is attacker-controlled. The segment-walk matcher must not use a regex built from user input, must not `decodeURIComponent` before matching (the middleware sees `nextUrl.pathname`, already normalised by Next), and must **fail closed** on no match |
| **V6 Cryptography** | no | Nothing cryptographic is touched. `src/utils/qr.ts`'s `Math.random()` remains an open, unowned defect (`access-gating.md`) and is **not** this phase's |

### Threat patterns for this change

| Pattern | STRIDE | Mitigation, and where it already exists |
|---------|--------|----------------------------------------|
| Path-confusion bypass (`/admin/../admin/finance`, `//admin/finance`, trailing slash) | Elevation of Privilege | Next normalises `nextUrl.pathname` before middleware; `skipTrailingSlashRedirect` is **not** set, so Next's own trailing-slash handling runs `[VERIFIED: next.config.ts read in full]`. **Acceptance criterion:** the matcher compares normalised segments and refuses an empty segment |
| An unmapped staff path admitting by fall-through | EoP | Fail closed on no match, **plus** the `_everyStaffRouteIsBound` build assertion so the case is unreachable in the first place |
| Open redirect via the redirect table | Tampering | Every `to` is a compile-time literal from the map; nothing user-supplied enters `url.pathname`. Module-load assertion that every `to` is a real route |
| Open redirect via `?next=` on the login page | Tampering | **Pre-existing, F5, not this phase's** — recorded as a todo. `access-gating.md`, gate *redirect validato* |
| A conditional/`Vary`-less cached redirect served to the wrong viewer | Information Disclosure | The 15 rows are unconditional. **No `has:` clause, ever** (Pitfall 3) |
| A capability check moved from server to a client nav | EoP | The nav receives a resolved `Set` as props and decides **visibility only**. Every route keeps its middleware entry and its page guard. C7 |
| The door judged by the wrong key | Denial of Service *at a queue* | `door.operate`'s entry written first; longest-literal-match; M-9 run before **and** after |
| A resolution failure rendered as a refusal | Repudiation / silent failure | D-34-08 state 3. **No `try/catch` may wrap `resolveRoute` or a page guard.** `capabilities/server.ts:33-46` is the precedent |
| Server action reachable at a route the matcher no longer covers | EoP | Matcher unchanged; and every action re-checks (C9). `[CITED: nextjs.org proxy doc — "Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone"]` |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | The `_everyStaffRouteIsBound` type-level assertion compiles and produces a named error | *The map's type* | The inverse totality falls back to a module-load `throw` — weaker (runtime not build) but still loud. **Prove by mutation in Wave 1** |
| A2 | A `throw` at module load in the route map surfaces as a `next build --webpack` failure rather than being swallowed | *Ambiguity is a load-time error* | Ambiguity detection degrades to a `verify:routes` script. **Measure in Wave 1** |
| A3 | Serwist's `defaultCache` navigation rule does not durably cache a `/organizer/*` 308 on installed PWA clients | *Runtime State Inventory* | A wrong 308 survives on staff phones beyond a deploy. **Mitigated by the 307-then-308 recommendation, which makes A3 not load-bearing** |
| A4 | Next 16.1.6 does not hard-fail on the `middleware.ts` convention (only 16.3.0 docs describe the deprecation) | *State of the Art* | The build already passes today, so the risk is a future minor upgrade, not this phase |
| A5 | Collapsing the eight `events/[id]/*` and `events/new` pairs to `organizer.access` reproduces today's verdicts exactly | *The collapse inventory* | Each pair must be diffed **individually** in its plan, not assumed from `artists`/`venues`. D-34-05 already requires the per-pair line |

---

## Open Questions

1. **Does the map cover `/api/*` Route Handlers?**
   - Known: `door.supervise` and `media.upload` gate Route Handlers via `require-operator.ts`
     and `may-upload.ts`; the generated types give handlers their own union; the middleware
     matcher already covers `/api/*` and the door's scan path runs through it.
   - Unclear: whether covering them strengthens CAP-02 enough to justify a middleware rule
     on the door's path.
   - **Recommendation: no.** Keep the two keys `scope: "table"` with the reason *"gates a
     Route Handler; the guard is X"*. Record as a finding for a later phase.

2. **`typedRoutes` on or off?**
   - Known: 14 errors today, all at concatenation sites, 3 of them in the menus this phase
     rewrites anyway. It types `Link`, `useRouter`, `redirect`, `permanentRedirect`. It does
     **not** type `revalidatePath`. Config redirect sources enter the union.
   - Unclear: nothing material.
   - **Recommendation: on, in Wave 1**, paired with the middleware-emitted redirect so the
     union stays clean.

3. **307 during the phase, 308 at ship?**
   - Known: D-34-04 requires 308; "how the redirect table is verified" is explicit discretion;
     a wrong 308 cannot be withdrawn from a client.
   - **Recommendation: yes**, with the flip as an acceptance criterion of the final plan and
     the walk re-run after the flip.

4. **Does `admin.access` keep any route?**
   - Known: yes — `finance`, `analytics` ×3, `newsletter`, `members/growth`. Six routes,
     master-only, matching D-34-02's own list plus `members/growth`.
   - **No question remains; recorded so the planner does not re-derive it.**

5. **What does `staff` see?** — 43-CONTEXT deferred it here. **Answered by measurement, not
   by design: nothing.** A `staff` account holds only `membership.card.view` and
   `membership.active`. No code implements this; the plan must record that it was **checked
   against the grant table and observed in M-4**, which is the difference between a decision
   and an assumption.

---

## Sources

### Primary (HIGH confidence)
- **This repository, read directly, 2026-08-09** — `src/lib/supabase/middleware.ts` (full),
  `src/middleware.ts`, `src/lib/capabilities/{keys,server,guards}.ts` (full),
  `src/lib/rbac/roles.ts` (full), `src/components/{staff/StaffNav,layout/MobileNav,account/ManagementSection}.tsx`,
  `src/app/(members)/dashboard/page.tsx`, `src/app/api/auth/callback/route.ts`,
  `src/app/(auth)/login/page.tsx`, `src/app/sw.ts`, `next.config.ts`, `tsconfig.json`,
  `package.json`, `scripts/{verify-capabilities,verify-persona,rls-baseline,rls-baseline-container,rls-baseline-compare}.mjs`,
  `supabase/migrations/{20260807000000_capability_model,20260808000500_staff_role,20260808002000_membership_register,20260809001000_assignment_resolver}.sql`
- **Measurements run this session** — the page census, the twelve pair diffs, the twelve-key
  policy/call-site count, the 48/51 literal counts and their classification, the
  `typedRoutes` enable → `next typegen` → `npx tsc --noEmit` → 14 errors → restore cycle, the
  generated `AppRoutes` / `StaticRoutes` / `RouteImpl` inspection, `NextResponse.redirect`'s
  signature, environment probes. **The working tree was left clean** (`git status
  --porcelain` empty; `next.config.ts` restored; `.next/types` removed).
- `nextjs.org/docs/app/api-reference/config/next-config-js/redirects` — 308/307 semantics,
  `statusCode`, path matching, `has`/`missing`. Doc version 16.3.0, lastUpdated 2026-06-30
- `nextjs.org/docs/app/api-reference/file-conventions/middleware` (now *proxy*) — the
  execution-order list, the matcher rules, the Server-Function/matcher warning, the v16.0.0
  deprecation. Doc version 16.3.0, lastUpdated 2026-08-04
- `nextjs.org/docs/app/api-reference/config/typescript` — Statically Typed Links, the `Route`
  type, the `NavItem<Route>[]` pattern, `.next/types` inclusion, "next build fails on
  TypeScript errors". Doc version 16.3.0, lastUpdated 2026-08-03
- `nextjs.org/docs/app/api-reference/file-conventions/route-groups` — groups do not affect
  the URL; conflicting paths across groups **cause an error**. Doc version 16.3.0
- `nextjs.org/docs/app/getting-started/server-and-client-components` — what makes a module
  server-only; `server-only` is optional in Next.js. Doc version 16.3.0, lastUpdated 2026-07-29
- `nextjs.org/docs/app/api-reference/config/next-config-js/typedRoutes` — stability

### Secondary (MEDIUM confidence)
- `.planning/phases/33-server-data-access-layer/33-CONTEXT.md:140-162` — the parallelism
  measurement and the stale-`.next` trap
- `.planning/phases/43-role-model-account-creation/43-CONTEXT.md:55,86-87,158` — D-06, D-19,
  D-20, and the deferred question this phase answers
- `.planning/todos/pending/register-read-unreachable-for-organizers.md` — the folded defect,
  including its own warning about ordering

### Not verified — stated as such
- Whether `next@16.1.6` emits a `middleware.ts` deprecation warning at build time (the grep
  timed out and was abandoned)
- Serwist `defaultCache`'s navigation caching behaviour for a 308 (A3)
- The `_everyStaffRouteIsBound` assertion and the module-load `throw` under
  `next build --webpack` (A1, A2) — both owed a proof by mutation in Wave 1

---

## Metadata

**Confidence breakdown:**
- **Inventory and grants:** HIGH — every count and every grant row was read from the file or
  produced by a command in this session
- **CAP-02 classification:** HIGH — the "five of twelve" claim in `verify-capabilities.mjs`
  was independently reproduced and the five named
- **Redirect mechanics:** HIGH — execution order, 308 semantics and the typed-route union
  contamination are all either cited from current official docs or measured here
- **Map design (longest-match, two totalities):** MEDIUM — the mechanism is sound and the
  hazard is concrete, but two of its guarantees (A1, A2) are owed a mutation proof
- **Service-worker cache behaviour:** LOW — A3, and the 307-then-308 recommendation exists
  so that it does not need to be resolved

**Research date:** 2026-08-09
**Valid until:** ~2026-09-08 for the repository measurements (they change with every
commit); ~2026-08-23 for the Next.js facts — 16.x is moving fast and the docs read this
session were already 16.3.0 against an installed 16.1.6
