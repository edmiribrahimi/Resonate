# Phase 34: One Work Surface - Context

**Gathered:** 2026-08-09
**Status:** Ready for planning

**Source:** an interactive discuss-phase session in which the owner delegated
every technical decision — *"expert persona decide il lato tecnico informatico,
fermami solo se c'è un dubbio vero"*. Nothing below was left to the planner by
default: each decision is taken here, with the measurement it rests on, so that
it can be overturned in one sentence by naming the measurement that changed.

> **Roles only, never people.** This repository is public. Every statement names
> a role — `master`, `organizer`, `staff`, `member` — never a person. Any plan
> derived from this file inherits that rule.

Requirements: **CAP-02**, **STAFF-01**, **STAFF-02**, **STAFF-03**.

---

## The measured starting point — verified 2026-08-09, not quoted

| Fact | Evidence |
|---|---|
| Two trees: **21 pages** under `/admin`, **15** under `/organizer` | `find src/app/(admin) src/app/(organizer) -name page.tsx` |
| Four surfaces exist **twice**, and no pair is identical | `artists` 80/81, `venues` 85/86, `events` 90/136, `members` 171/118 lines |
| **No `layout.tsx` in either route group** — every page mounts both navs by hand | only `src/app/layout.tsx` exists |
| The tab nav carries the duplication **in its type** | `src/components/staff/StaffNav.tsx:9` — `context: "admin" \| "organizer"` |
| The bottom nav filters on **role and status**, not on capability | `src/lib/rbac/roles.ts:113` — `getVisibleNavItems(role, status)` |
| The code already names this phase as the owner | `src/app/(admin)/admin/artists/page.tsx:26`, `.../organizer/members/page.tsx` — *"Phase 34 (STAFF-03) owns these props"* |
| CAP-02's gate **already exists as a warning** | `scripts/verify-capabilities.mjs:1030` side 4 — *"Phase 34's CAP-02 will fail the production build … this is that failure, arriving early"* |
| **Five of the twelve keys gate tables, not routes** | same file, line 44 — the reason side 4 is a warning and not an error |
| Hardcoded prefixes: **48** `/admin…` in 22 files, **51** `/organizer…` in 20 | `grep -rEo '"/(admin\|organizer)[^"]*"' src/` |
| The `/admin/scanner` branch is tested **before** the general `/admin` branch, and that ordering is declared load-bearing | `src/lib/supabase/middleware.ts:346-351` |
| A live per-night assignment already opens `/admin/scanner` and one allow-listed `/organizer` route | `middleware.ts:385-392`, `:415-423`, `ORGANIZER_ASSIGNMENT_ROUTES` at `:88` |
| Refusal today is **not** a 403: it is `bounceToDashboard(cause)` with `?access=` carrying **three causes that never collapse** | `middleware.ts:293`, `src/app/(members)/dashboard/page.tsx:39` |
| The DAL **throws** `capabilities.resolve_failed: <code>` and never returns a degraded value | `src/lib/capabilities/server.ts:338` docblock |
| `organizer/events/[id]/media/page.tsx` **now has** a server-side check (`STAFF_MANAGE`) | `:63` — the middleware comment at `:66-74` calling it unchecked is stale |
| `organizer/page.tsx` is still a bare `redirect()` to a checked page | `src/app/(organizer)/organizer/page.tsx` |

---

<domain>
## Phase Boundary

**In scope.** The duplicated `/admin` and `/organizer` route trees become one
work surface that renders according to what the viewer is entitled to see.
Concretely:

- one address per work surface, with the second tree's addresses preserved as
  permanent redirects
- one declaration binding a route to the capability that opens it, read by the
  middleware, by the page guard and by the navigation — instead of three
  prefix rules and two hand-maintained menus
- navigation generated from that declaration, so a hidden entry always has a
  matching server-side refusal
- a production build that fails when a capability is mapped to no route
- what a staff role sees of the members list and the takings — explicitly
  deferred *to this phase* by `43-CONTEXT.md` (Deferred Ideas)

**Out of scope, and each fence has a failure mode behind it.**

- **The door does not move.** `/admin/scanner` keeps its address; STAFF-04 is
  Phase 39, alone, *because a redirect needs a network the door is designed not
  to have*. No plan in this phase may relocate it, and no redirect rule may
  match it.
- **No capability is granted, revoked or re-scoped.** This phase changes where
  a verdict is asked, never what the verdict is. `private.role_capabilities` is
  not edited. `door.operate` keeps `requires_approved = false` (D-06 of Phase
  43).
- **No new capability key.** If a collapsed surface would need one, it is
  recorded and the surface stays as restrictive as the more restrictive of the
  two pages it replaces.
- Formats and series numbering (Phase 36), manual venue reveal (Phase 37), live
  attendance freshness (Phase 38), brand tokens (Phase 40) and shared
  primitives (Phase 41). This phase changes **where** a surface lives and **who**
  reaches it, not what it looks like.

**Depends on Phase 35.** The route map must be able to express a binding that a
live per-night assignment can open — `ORGANIZER_ASSIGNMENT_ROUTES` is not a
special case to be flattened away.

</domain>

<decisions>
## Implementation Decisions

### The canonical address

- **D-34-01: `/admin` is the canonical prefix. `/organizer/*` redirects into
  it.** The prefixes are symmetric in cost (48 hardcoded references against 51),
  so the tie is broken by the door: `/admin/scanner` must not move, and it
  already lives under `/admin`. Any other canonical choice turns `/admin` into a
  redirect shell that has to **exclude** `/admin/scanner` — which recreates, in
  a second place, exactly the precedence hazard that `middleware.ts:346-351`
  exists to warn about. *The collapse must not add a second place where the
  door's precedence has to be remembered.* Keeping `/admin` also halves the
  number of already-sent addresses that become redirects.

- **D-34-02: the prefix stops carrying meaning; the route map carries it.**
  After the collapse, `/admin` is an address, not an authorisation. The
  middleware's three prefix rules (`/admin/scanner`, `/admin/*`, `/organizer/*`)
  are replaced by lookups in the route map. `admin.access` keeps its meaning —
  *reach the master-only surfaces* — and becomes the binding of the specific
  routes that are master-only (finance, analytics, newsletter), not the meaning
  of a path segment. **The word `admin` in a URL will no longer describe who is
  on it, and that is accepted deliberately**: renaming to a neutral third prefix
  would move both trees and cost the door its stable address for one phase.

- **D-34-03: the two organizer-only surfaces move with everything else.**
  `events/[id]/assignments` and `events/[id]/review` have no `/admin` twin and
  land at the collapsed address. **`review` carries the assignment allow-list
  with it** (`ORGANIZER_ASSIGNMENT_ROUTES`, `middleware.ts:88`) — that is a
  Critical edit, not a move: the allow-list is the whole safety of that arm, and
  it becomes an explicit per-route binding (`party.manage`, assignment-openable)
  rather than a regex tested against a prefix that will no longer exist. The
  per-night gate on the page, which re-asks `party.manage` against the night
  resolved from `?party=`, is untouched.

- **D-34-04: redirects are permanent (308) and one-directional.** Every
  `/organizer/*` address answers with a 308 to its collapsed twin. A 308 is
  cached by the browser and does not come back: the mapping is written once,
  reviewed as a table, and verified before the phase closes. No redirect may
  match `/admin/scanner`, and none may point at it.

### Collapsing the duplicated pages

- **D-34-05: one page per surface, and a divergence is a defect until proved
  otherwise.** The four duplicated surfaces become one file each. Where the two
  versions differ, **the verdict comes from `private.role_capabilities`, not
  from either page** — the differences are the drift the collapse exists to
  remove, and at least two of them are measurably wrong today: the organizer
  members page lacks the account-creation form that D-20 of Phase 43 permits,
  and lacks the way into the register that Phase 43 grants organizers
  (`register.read`). Each resolved divergence gets one line in the plan naming
  the capability that decided it.

- **D-34-06: a divergence may only be resolved *towards more* when an existing
  grant already says so.** This phase grants nothing (see the boundary). If
  closing a divergence would require a new grant or a `requires_approved` flip,
  the surface stays at the more restrictive of the two behaviours and the case
  is recorded as a finding. **Widening a policy to make a collapse pass is
  forbidden** — the same rule Phase 33 carried.

- **D-34-07: the two navs stop being mounted by hand.** There is no
  `layout.tsx` in either route group today, so every page repeats the mount and
  the `UserRole` cast the code already flags as this phase's to remove. A layout
  for the collapsed tree resolves the access context once and passes it down.
  This is also what makes D-34-08 enforceable rather than conventional.

### The shape of a refusal

- **D-34-08: three states, never collapsed into one.**
  1. **No session** → the existing redirect to `/login?redirect=`. Unchanged.
  2. **Session, capability missing** → the existing `bounceToDashboard(cause)`
     with a **named cause** on `?access=`. Not a 404 and not a bare 403: the
     mechanism already exists, already carries three causes that never collapse
     (`dashboard/page.tsx:39`), and a 404 would make a legitimate operator's
     refusal indistinguishable from a typo — in a product with **no error
     tracking**, an opaque refusal reaches nobody. Phase 41 restyles it; this
     phase must not invent a second refusal surface for it to restyle.
  3. **Could not resolve** → the DAL throws `capabilities.resolve_failed:
     <code>` and that must stay a throw. **No `try/catch` around a route guard
     may turn a resolution failure into a refusal.** This is the phase-32 lesson
     restated: an infrastructure fault dressed as a permission denial is a
     silent failure with an alibi.

- **D-34-09: the middleware and the page must give the same verdict, because
  they read the same entry.** Today they can disagree, and one disagreement is
  already recorded as a defect (the register is granted to organizers and the
  prefix rule bounces them). After this phase, a mismatch between the two is a
  build-time or review-time question about one declaration, not a discovery made
  by a person who cannot open a page they are entitled to open. **The middleware
  is still UX and the RLS is still the boundary** — one declaration read twice
  does not change which of the two is the security guarantee, and no comment may
  imply that it does.

### The route↔capability map, and the build gate

- **D-34-10: one declaration module, pure data, no `server-only`.** It binds a
  route pattern to the capability key that opens it, and marks the entries a
  live assignment may open. It imports `CAP` from `src/lib/capabilities/keys.ts`
  and nothing else — the same discipline `keys.ts` states for itself. It carries
  **no secrets and no resolution**: the capability set is resolved server-side
  and handed to the client navs as props, so that a `"use client"` nav can filter
  on the same keys without importing the DAL.

- **D-34-11: CAP-02 is enforced by the type system, not by a script that needs a
  database.** The map is a **total `Record<CapabilityKey, …>`** — the pattern
  `CAP_DESCRIPTIONS` already uses in `keys.ts:126`, chosen because that pattern
  has **already held four times in this repository** (when keys 9, 10, 11 and 12
  landed). Each key declares either the routes it opens or, explicitly,
  `scope: "table"` with a one-line reason — because five of the twelve gate
  tables and a gate that cannot say so would be satisfied by a lie. Adding a
  thirteenth key without an entry is an `npm run build` error. **No database
  credential is needed at build time**, which is the only way criterion 4 can be
  true on a Vercel production build.

- **D-34-12: `verify:capabilities` side 4 stays a warning, and its message is
  re-pointed at the new map.** It asks a different question — *does the database
  catalogue match the callers* — and turning it into the build gate would make
  the build depend on a live database. **The seam is stated rather than
  glossed:** CAP-02 holds as a chain — database ↔ `CAP` is asserted by
  `npm run verify:capabilities`, `CAP` ↔ routes by `next build` — and the chain
  is only as good as the discipline of running the first link. There is **no CI
  in this repository**, so that link is a written pre-deploy step, not an
  automation, and the plan must say so where someone will read it.

### Folded Todos

- **`register-read-unreachable-for-organizers.md`** — an organizer holds
  `register.read` but `middleware.ts` judges everything under `/admin` with
  `admin.access`, granted to the master alone, so the capability is granted and
  unreachable. The executor of plan 43-14 **deliberately did not loosen the
  middleware**, writing that the collapse of `/admin/*` onto `admin.access`
  belongs to this phase and that widening it inside an interface plan would
  change who enters every other `/admin` page as an invisible side effect. This
  phase closes it by construction: D-34-02 dissolves the prefix rule, and the
  register route binds to `register.read`. **It is the smallest true test of the
  whole phase** — if the collapse is real, this defect disappears without anyone
  editing a permission. Note the todo's own warning about ordering: a new rule
  inserted carelessly reproduces the scanner hazard. The route map is the answer
  to that warning, not an exception to it.

### Claude's Discretion

Left to research and planning, with the constraint that each choice is
justified in the plan:

- The concrete shape of the route map — pattern syntax (literal prefixes,
  matcher functions, or a small pattern language), where it lives, and how a
  dynamic segment (`events/[id]/…`) is expressed. The requirement is *one
  declaration, three readers, total over `CapabilityKey`*; the schema is a
  design choice.
- Whether the collapse ships as one sweep or in tranches, and if tranches, the
  order. Phase 33's measured lesson applies: **ask "can these two run at the
  same time" before "what is the logical order"** — 36 page files across
  disjoint directories is naturally parallel work, and Phase 32 lost its
  parallelism to four consecutive plans extending one shared file. The route map
  is that shared file here: write it once, early, then fan out.
- How the redirect table is expressed (`next.config` redirects, middleware, or a
  catch-all route) and how it is verified before the phase closes.
- Whether `StaffNav` and `MobileNav` converge into one component or stay two
  that read the same map. `StaffNav`'s `context` prop disappears either way.
- What a staff role sees of the members list and the takings, within D-34-06 —
  the existing grants decide it; this phase only stops asking the question twice.
- Whether `getVisibleNavItems(role, status)` is replaced or re-expressed. It
  filters on role and status today, which is the thing STAFF-03 refuses.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The requirement and the decisions it carries
- `.planning/ROADMAP.md` (Phase 34 section) — the four success criteria, the
  dependency on Phase 35, and the ordering constraint *"the door is not part of
  routing"*
- `.planning/REQUIREMENTS.md` — `CAP-02`, `STAFF-01`, `STAFF-02`, `STAFF-03`,
  and `STAFF-04` as the fence this phase must not cross
- `.planning/ACCESS-MODEL-DECISIONS.md` — the owner decisions of 2026-08-06 that
  the capability model executes
- `.planning/phases/43-role-model-account-creation/43-CONTEXT.md` — D-19
  (`register.read` must require `approved`), D-20 (an organizer may create an
  account directly as organizer), and the Deferred Idea that hands this phase
  *"what a staff member sees of the members list and the takings"*
- `.planning/phases/33-server-data-access-layer/33-CONTEXT.md` — the
  middleware/RLS split, the tagged-result rule for distinguishing *not
  permitted* from *could not resolve*, and the parallelism lesson

### The code this phase rewrites
- `src/lib/supabase/middleware.ts` — the three prefix rules (`:385-423`), the
  load-bearing scanner ordering (`:346-351`), `ORGANIZER_ASSIGNMENT_ROUTES`
  (`:88`), and `bounceToDashboard` / `BounceCause` (`:278-293`)
- `src/lib/capabilities/keys.ts` — the twelve keys, and `CAP_DESCRIPTIONS` at
  `:126` as the total-`Record` pattern D-34-11 reuses
- `src/lib/capabilities/server.ts:255-340` — `AccessContextResult`,
  `ANONYMOUS_CONTEXT`, and the `capabilities.resolve_failed` throw
- `src/lib/capabilities/guards.ts` — the page-level guards the collapsed pages
  will call
- `src/lib/rbac/roles.ts:41-140` — `NAV_ITEMS` and
  `getVisibleNavItems(role, status)`, the role-and-status filter STAFF-03 replaces
- `src/components/staff/StaffNav.tsx` — the tab nav and its `context` prop
- `src/components/layout/MobileNav.tsx` — the bottom nav
- `src/app/(members)/dashboard/page.tsx:39-80` — the `?access=` notice and its
  three non-collapsing causes, which D-34-08 extends rather than replaces
- `scripts/verify-capabilities.mjs:35-55` and `:1030-1053` — side 4, its stated
  hand-off to CAP-02, and why it is a warning

### The gates that govern this phase
- `.claude/rules/access-gating.md` — the middleware/RLS boundary, and `member`
  versus `approved` as two different axes
- `.claude/rules/meta-gates.md` — cross-domain impact, monotone guards, zero
  silent failures, and the verification gate in a repository with no test runner
- `.claude/rules/checkin-offline.md` — why the door does not move in this phase
- `.claude/rules/venue-secrecy.md` — any collapsed event surface must not
  advance a reveal
- `.claude/rules/nextjs-architecture.md` — route groups, layouts and server/client
  boundaries
- `.claude/rules/ai-engineering.md` — planning documents are published: roles,
  never people

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`CAP_DESCRIPTIONS` as a total `Record`** (`keys.ts:126`) — the exact
  mechanism D-34-11 needs, already proved four times in this repository.
- **`bounceToDashboard(cause)` + `?access=`** — a refusal channel that already
  carries distinguishable causes. Extended, not replaced.
- **`getAccessContext()` / `getPartyAccessContext()`** (`server.ts:338,380`) —
  `cache()`-scoped per request, so a layout resolving once costs one round trip
  for the whole tree.
- **`MemberTable`, `EventList`, `EventForm`, `SalesDashboard`** — already shared
  by both trees, which is why the collapse is mostly deletion rather than
  rewriting.

### Established Patterns
- **A key named after its question, never after its predicate** (`keys.ts`) —
  three keys resolve to the same predicate today on purpose. The route map must
  bind the *question*, so a later phase can move one route without moving three.
- **A comment that names what was NOT measured** — the house style of
  `verify-capabilities.mjs` and `seed.mjs:317-324`. The redirect table and the
  route map inherit it.
- **Proof by mutation** — every check in `verify-capabilities.mjs` was proved by
  breaking the invariant and confirming the break applied *before* reading the
  result. A new build gate inherits that obligation.

### Integration Points
- The middleware stops branching on prefixes and reads the map (`:385-423`).
- Every collapsed page's guard reads the same entry as the middleware (D-34-09).
- Both navs receive the resolved capability set as props and filter on the map.
- `next build` gains the CAP-02 failure through the total `Record`.
- Phase 39 will later move exactly one entry — the door's — and that is the
  measure of whether the map was written well.

</code_context>

<specifics>
## Specific Ideas

- **The register defect is the phase's acceptance test in miniature.** If the
  collapse is real, `register-read-unreachable-for-organizers` closes without a
  single permission being edited. If closing it requires touching a grant, the
  collapse did not happen — something was special-cased instead.
- **The middleware comment at `:66-74` is stale and must be corrected, not
  copied.** It says two `/organizer` pages carry no server-side check of their
  own; measured today, `media/page.tsx:63` gates on `STAFF_MANAGE`, and
  `organizer/page.tsx` is a bare redirect into a checked page. A stale comment
  carried into a rewrite becomes a stale comment nobody will re-measure.
- **`npm run build` will not find the route strings.** 99 hardcoded
  `"/admin…"` / `"/organizer…"` literals across 42 files are strings, not types.
  The compiler finds none of them — the same trap Phase 43 recorded, where
  seventeen `role as UserRole` casts laundered a new value silently. A list has
  to be walked, and the walk has to be a plan task, not a hope.
- **There is no test runner for this product.** Verification is `npm run build`
  (which is the typecheck), `npm run verify:capabilities`, the container
  baseline (`baseline:rls`, `baseline:container`, `baseline:compare`) and
  **written manual procedures**. A green `CAP-03` comparison before and after is
  the instrument that proves no permission moved — which for this phase is the
  whole claim. Nothing here may be called verified because tests pass.
- **A stale `.next` produces a false build failure after a worktree merge.**
  `rm -rf .next` before concluding anything is broken.
- **Verification debt is open upstream:** 9 `human_needed` items in
  `35-VERIFICATION.md` and 14 in `43-VERIFICATION.md`. This phase neither
  consumes nor worsens them, and it does not close them. They remain due before
  the milestone closes, and the migration queue being fully applied means the
  window to run them is open now.

</specifics>

<deferred>
## Deferred Ideas

- **A neutral third prefix** (`/backstage`, `/manage`) instead of `/admin` —
  refused here for the door's sake (D-34-01), not on merit. The natural moment
  to reconsider is **Phase 39**, when the door leaves for its own address and
  `/admin` no longer has to stay still for it.
- **Retiring the `admin` word from the URL and the page headings** — the heading
  collapse (`<h1>Admin</h1>` versus `<h1>Organizer</h1>`) is decided here by
  necessity; the vocabulary question belongs with Phase 40/41.
- **`getVisibleNavItems` for the public and member navigation** — this phase
  converts the staff surfaces. The public nav entries (`/`, `/events`,
  `/gallery`) are not capability-gated and are not in scope.

### Reviewed Todos (not folded)

- **`postgrest-details-leaks-the-row.md`** — on a `CHECK` violation PostgREST
  returns the whole row, `membership_code` included, and ~20 sites
  `console.error(err)` with the entire object. It reaches the server log, not a
  user. It is error hygiene across existing sites, not route collapse, and
  folding it would put an unrelated sweep inside a Critical access change. Still
  open, still unowned by any phase.
- **`profiles-email-not-unique.md`** — `public.profiles.email` has no unique
  constraint; plan 43-12 defended at the caller with an `ambiguous` branch. It is
  schema work that needs a production measurement before the remedy is chosen.
  Nothing to do with the route trees.

</deferred>

---

*Phase: 34-one-work-surface*
*Context gathered: 2026-08-09 — decisions taken under delegated technical
discretion, each recorded with the measurement it rests on*
