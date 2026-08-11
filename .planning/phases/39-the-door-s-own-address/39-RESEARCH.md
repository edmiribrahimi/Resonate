# Phase 39: The Door's Own Address — Research

**Researched:** 2026-08-11
**Domain:** Next.js App Router routing · Serwist service worker / precache · the capability route map · human verification procedure design
**Confidence:** HIGH on the code facts (all measured on this tree), MEDIUM on two browser-runtime behaviours named explicitly in Open Questions

---

## Summary

This phase installs no packages, adds no dependency, and touches no product logic. It is
an **addressing** change with a **service-worker** consequence and a **verification**
deliverable, and every hard question in it turns out to be answerable by measurement
rather than by design taste.

Three measurements reframe the phase.

**One.** `src/lib/rbac/roles.ts:20-21` annotates the door's binding as
`{ readonly routes: readonly [Route] }` — a **one-element tuple**, written by Phase 34
precisely so that "binding `door.operate` to a second address becomes a build error here
— naming this file. There is exactly one door." Adding `/door` to
`CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes` is therefore **not** a one-line change: it
is a deliberate tripwire that fires on `npm run build` and forces a decision about which
of the two addresses the bottom nav draws. Proved by running the repository's own `tsc`
against the shape (`error TS2322 … Source has 2 element(s) but target allows only 1`).

**Two.** `self.__SW_MANIFEST` contains **no documents at all**. Measured against the
built `public/sw.js` on this tree: **127 precache entries — 104 JS chunks, 2 CSS, 8
fonts, 2 build manifests, 11 files from `public/`. Zero HTML, zero routes, zero RSC
payloads.** `@serwist/next` builds the manifest from webpack's emitted assets plus a
glob of `public/`, and nothing else. And `.next/prerender-manifest.json` lists **six**
statically prerendered routes, of which neither `/` nor `/admin/scanner` is one. So no
build output for either address exists to precache in the first place. **Every offline
document in this product comes from a runtime `NetworkFirst` cache with a 24-hour
expiry and a 32-entry cap, populated only by a previous online visit.** Success
criterion 2 is a question about *that*, and the answer for `/door` on the night of the
move is *nothing has ever visited it*.

**Three.** `public/manifest.json` has `start_url: "/"` and no `scope`, and a missing
`scope` defaults to `start_url` minus its filename — i.e. `/`, the whole origin. `/door`
is therefore already inside the installed app's scope, and D-39-04 is not contradicted by
adding it. What D-39-05 does not yet say is the second half: `src/app/page.tsx` redirects
a signed-in caller to `/dashboard`, so the home-screen launch is a **two-document** hop
before the nav item is even on screen.

**Primary recommendation:** serve both addresses from **two thin `page.tsx` files under
`src/app/(admin)/` sharing one server component**, add `/door` to the existing
`door.operate` entry, and spend the tripwire in `roles.ts` deliberately — pointing the nav
at `/door` and widening the tuple to a two-element one with a docblock that says why there
are now two. Reject `rewrites()`: it buys one build output and loses both mechanical
checks that would otherwise cover the new address. Then treat the offline half as its own
problem, because **the mechanism choice does not affect it at all**: cache keys are
request URLs, so two addresses are two cache entries under every mechanism, and neither is
warm until somebody opens it online.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**The address**

- **D-39-01: the door's permanent address is `/door`.** Short enough to be typed at two in
  the morning, and — the real reason — **out of `/admin`**. In this project `admin` in an
  address is an address, not an authorisation (`capability-routes.ts` module docblock); the
  person working the door is not an administrator, and the address should stop implying
  they are.

- **D-39-02: `/admin/scanner` keeps serving the door, permanently, as a real page — never
  as a redirect.** A redirect needs a network the door is designed not to have. That
  sentence is not a preference: it is the literal justification STAFF-04 gives for existing
  as its own phase (`REQUIREMENTS.md:80`). Two addresses, one door, zero round trips. The
  old address is not deprecated on a timer and not removed in a later phase — it is part of
  the deliverable.

- **D-39-03: STAFF-04 and the roadmap goal do not contradict each other.** STAFF-04 says
  the door *keeps an address of its own and is not moved together with the rest*; the
  ROADMAP goal says it *moves to its permanent address in a step all its own*. Both hold at
  once. This was a document reading, not a choice, and it is recorded so the next reader
  does not re-litigate it.

**Installation and the home screen**

- **D-39-04 (owner, 2026-08-11): one app, one manifest. `start_url` stays `"/"`.** Pointing
  it at `/door` would make *every* install — members included — open the door. The
  alternative considered and declined was a second manifest scoped to the door, giving staff
  a separate installable icon.

- **D-39-05: the accepted cost of D-39-04, written down rather than discovered.**
  `public/manifest.json` today carries `start_url: "/"` and **no `scope`** (measured
  2026-08-11). So "a device that installed the door" does not exist as a thing distinct from
  "a device that installed the app", and **launching from the home screen lands on `/`, the
  members' home — not on the door.** This is true *before* this phase and is not caused by
  the move.

  **Therefore success criterion 2 is not a question about the old URL. It is: with the
  network off, can the person working the door get from the home screen to a working door?**
  That is carried by the service worker's precache and by client-side navigation, not by any
  redirect. Plans must treat it that way.

**The inherited item**

- **D-39-06: the Phase 34 carry-forward is closed here.** `door.operate` carries
  `requires_approved = false` (D-06 of Phase 43) while the bottom nav's Check-in entry is
  filtered by `requireApproved: true` and by role — so an organizer in `pending` sees **no**
  Check-in tab that the server **would** admit. It is the safe direction of the two (a hidden
  entry the server would allow, never a drawn entry it refuses), which is why Phase 34 left
  it. The owner assigned it here alongside STAFF-04 (`34-04-SUMMARY.md:197`,
  `34-VERIFICATION.md:431`).

  Closing it means giving `getVisibleNavItems` the capability set, which means changing
  `MobileNav`'s props, which means editing the door's own page — the same file this phase
  opens anyway. Doing it in a later phase would mean opening that file twice, and it is the
  one file this project least wants opened by accident.

**The proof**

- **D-39-07 (owner, 2026-08-11): one door pass, not two.** This phase's door pass absorbs
  the seven procedures Phase 38 deferred. Same dark room, same two phones, same night, at
  the end of milestone v1.5.

  **Consequence, accepted:** Phase 39 does not close before that night, exactly like Phase
  38. **Gain:** one trip instead of two — and the two things get verified *together*, which
  is also more truthful, because it is the same door.

  Practically, the plans must write **one procedure** that closes criterion 3 *and* Phase
  38's P1, P2, P3, P4, P5 and P7 — and must say, per item, which requirement each
  observation closes. P6 stays separate: it writes to production and needs its own fresh
  authorisation (see `38-HUMAN-UAT.md`, test 2).

### Claude's Discretion

- The mechanism by which `/admin/scanner` and `/door` both serve the door — one route
  re-exporting the other, a shared component, or a rewrite — is the planner's, subject to
  D-39-02 (no redirect) and to the constraint that `capability-routes.ts` must gate **both**
  addresses with the same entry rather than growing a second predicate.
- Precache strategy for the two addresses, within `sw.ts`'s existing structure.
- Whether the door pass procedure lives in this phase's directory or extends
  `38-PROCEDURES.md`; either is fine as long as **one** document is the thing a person reads
  in the dark room.

### Deferred Ideas (OUT OF SCOPE)

- **A separate installable door app** — its own manifest, its own `start_url`, its own icon
  and name on the staff phone's home screen. Declined for now (D-39-04). If it is ever
  revisited, the name and the icon are **brand**, not engineering:
  `brand-visual-system.md` governs both.
- **Retiring `/admin/scanner`.** Not deferred so much as refused: D-39-02 makes the old
  address permanent. Recorded here so that a future tidy-up phase does not read it as
  leftovers.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **STAFF-04** | *"The door keeps its own address and is not moved in the same step as the rest, because a redirect needs a network the door may not have"* (`.planning/REQUIREMENTS.md:80`, tracked at `:235` as `Phase 39 / Pending`) | §A gives four mechanisms with the round-trip cost of each and a recommendation; §B gives the exact map edit and the five readers it must survive; §C proves what "may not have a network" actually costs today; §F gives the written proof |

</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

Directives extracted from `./CLAUDE.md` and `.claude/rules/`, each of which the plans must
comply with. These carry the same authority as the locked decisions above.

| # | Directive | Source | Bearing on this phase |
|---|-----------|--------|-----------------------|
| C1 | **No test runner for the product.** No `test` script, no `*.test.*`, no `*.spec.*`. A product change may never be called verified because "tests pass". | `CLAUDE.md` Environment Guardrails 1 | Every success criterion below is closed by `npm run build`, a source assertion, a DevTools reading, or a person in a dark room. §Validation Architecture says which. |
| C2 | **`npm run build` is also the typecheck.** There is no separate `typecheck` script; `next build --webpack` carries it. | `package.json:6`, Guardrail 2 | The `roles.ts` tuple tripwire (§B) fires here and nowhere else. |
| C3 | **Migrations are the schema truth, not `schema.sql`.** | Guardrail 3 | No migration is needed by this phase. §Runtime State Inventory records the one row of stored prose that names the old address. |
| C4 | **`.planning/codebase/` is stale** (`Analysis Date: 2026-02-24`). Verify each claim against current code. | Guardrail 4 | Nothing in this document is sourced from `.planning/codebase/`. |
| C5 | **The repository is PUBLIC and every commit is an irreversible publication.** Roles, never names; no unannounced dates, venues under negotiation or line-ups. | Guardrail 5 | The door pass (§F) names *an account holding `door.operate` for the night*, never a person, and carries no date and no venue. |
| C6 | **macOS/BSD**: `grep -E`, `sed -i ''`. | Guardrail 6 | Applies to any sweep script a plan writes. |
| C7 | **The middleware is UX; the RLS is the boundary.** Hiding a nav entry is not protecting a route. | `access-gating.md`, `meta-gates.md` | D-39-06 is a **visibility** change only. §E names the server-side guard that must stay. |
| C8 | **Monotone guards may only get harder to trip.** `venue_reveal_sent`, payment→`completed`, format series numbering — and the 308 redirect table is treated as a fourth. | `meta-gates.md` | The `/events/**` `NetworkOnly` rule is the venue-secrecy guard this phase must not loosen (§C, §G). |
| C9 | **Zero silent failures, and there is no error tracking.** A failure that matters must have an *observable* effect, not only a log line. | `meta-gates.md`, `checkin-offline.md` | Drives the recommendation in §B to add a module-load assertion for the **second** address, matching the one that already exists for the first. |
| C10 | **Cache is chosen per route, never inherited.** No surface showing payment status, ticket validity or a venue address may be served stale. | `nextjs-architecture.md`, gate *service worker* | §C's whole analysis. |
| C11 | **Dark-venue accessibility is a use condition, not a finish.** One-handed, in the dark, colour never the only channel. | `nextjs-architecture.md`, gate *accessibilità al buio* | `38-HUMAN-UAT` test 8 belongs in the door pass for this reason (§F). |
| C12 | **The runbook gate and "provato prima della porta".** The scan path is tested *that day, on that device, with that account* — a service-worker update, an expired session or a denied camera permission is found in five minutes at home or in ten in front of a queue. | `checkin-offline.md` | §C's 24-hour cache expiry turns this gate from advice into arithmetic. |
| C13 | **The route group picks the address, never the audience.** Reachability is bound in `capability-routes.ts`; a new surface under `(admin)` with no row is refused by `next build`. | `nextjs-architecture.md`, gate *il gruppo non autorizza* | §B measures exactly how far that refusal reaches, and where it stops. |
| C14 | **The persona verifies itself.** `npm run verify:persona` runs seven checks; **A** refuses a dead glob, **B** requires the `CLAUDE.md` index and the module frontmatter to declare the *same* glob set, **G** requires each `meta-gates.md` routing row's primary module to actually load on the files it claims. | `scripts/verify-persona.mjs:236,247,369`; `ai-engineering.md` | Moving or duplicating the door's page has a **persona consequence** most readers will miss. §G, landmine 6. |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| The door's second address exists and renders | Frontend Server (SSR route file) | — | A route is a file on disk in this codebase; every mechanical check in the repo censuses files, not config |
| Deciding *who may arrive* at either address | Frontend Server (middleware) | — | `src/lib/supabase/middleware.ts` reads `resolveRoute` on every request; it decides where somebody may **go** |
| Deciding *who may see the door's data* | Database (RLS) + Route Handler guards | — | `require-operator.ts` on the three door routes, which write with the service client and see no policy. **Address-independent** — untouched by this phase |
| The nav entry's visibility | Browser (client component) | Frontend Server (props) | `MobileNav` is `"use client"`; the capability set is resolved by a parent Server Component and passed down |
| Offline reachability of both addresses | Browser (service worker + Cache Storage) | — | Nothing on the server can make a document reachable with the radio off |
| The door's offline scan state | Browser (IndexedDB) | — | `src/lib/offline/`, never Cache Storage (`sw.ts:14-23`). **Out of scope**, and must stay so |
| Proof that any of this works at 02:00 | A person, in a dark room, on two phones | — | C1: there is no runner that can stand at a door |

---

## Standard Stack

**This phase installs nothing.** No new library solves any part of it, and adding one
would be the wrong answer to every question below.

### Versions in play, verified on this tree

| Package | Declared | Purpose | Evidence |
|---------|----------|---------|----------|
| `next` | **16.1.6** | App Router, `typedRoutes`, middleware | `package.json:23` [VERIFIED: package.json] |
| `react` / `react-dom` | 19.2.3 | — | `package.json:26-27` |
| `@serwist/next` | ^9.5.6 | Webpack plugin, manifest injection, `cacheOnNavigation` | `package.json:12` |
| `serwist` | ^9.5.6 | `Serwist` class, `NetworkOnly`, strategies | `package.json` devDependencies |
| `idb` | ^8.0.3 | The door's IndexedDB store — **out of scope** | `package.json:19` |

> **Build command is `next build --webpack`** (`package.json:6`), not Turbopack.
> `next.config.ts` also declares `turbopack: {}`. Serwist's `injectManifest` is a webpack
> plugin; a plan that flips the build to Turbopack would silently produce a service worker
> with no precache. Nothing in this phase should touch that flag.
> [VERIFIED: package.json + next.config.ts read 2026-08-11]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two `page.tsx` files | `next.config` `rewrites()` | One build output, but invisible to `verify-routes.mjs`'s disk census and to `_everyStaffRouteIsBound`, and it introduces an ordering question against the middleware that this repo has never measured. See §A. |
| Widening the `roles.ts` tuple | A `DOOR_HREF` constant typed loosely | Deletes a guard Phase 34 wrote on purpose. Refused. |
| Precaching the door document | `precacheOptions.navigateFallback` | Requires a precached HTML file. This build produces **none** for either address. See §C. |

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.** No `npm install`, no
`pip`, no `cargo`. The Package Legitimacy Gate was therefore not run, and the absence is
a fact about the phase rather than a skipped step. If a plan proposes a dependency, the
gate applies to it and this section must be filled before that plan is approved.

---

# A. Two addresses, one door, no redirect (D-39-02)

## A.0 What "costs a network round trip" actually means here

The premise worth stating before comparing mechanisms: **the door's page is dynamically
rendered under every mechanism.** `src/app/(admin)/admin/scanner/page.tsx:88` calls
`await getAccessContext()`, which reads cookies, so the route can never be statically
generated — and `.next/prerender-manifest.json` confirms it, listing exactly six
prerendered routes (`/_global-error`, `/_not-found`, `/login`, `/register`,
`/payment/callback`, `/favicon.ico`) and not the door. [VERIFIED: built artefact on this
tree]

So a *cold* arrival at either address needs a server response under all four mechanisms.
The distinction D-39-02 is protecting is narrower and still real:

- a **redirect** is a guaranteed *extra* round trip, in front of the one you were already
  paying, and a `3xx` cannot be usefully served from Cache Storage — Serwist's own
  start-url worker refuses to cache a redirected response outright
  (`node_modules/@serwist/next/dist/sw-entry-worker.js:6`, `if (!response.redirected)`);
- a **rendered page at both addresses** pays the ordinary one, and that one *can* come
  from a runtime cache when it has been warmed.

That is the whole of the difference, and it is enough to justify D-39-02 — but plans
should not write "no round trip" without the qualifier, because the offline behaviour in
§C does not support the unqualified sentence.

## A.1 The four mechanisms, compared on this codebase

| | 1. Route re-export | 2. Shared component, two thin pages | 3. `rewrites()` | 4. Route group / parallel route |
|---|---|---|---|---|
| **Shape** | `src/app/(admin)/door/page.tsx` = `export { default } from "@/app/(admin)/admin/scanner/page"` | one server component in a non-route module, rendered by two `page.tsx` | `{ source: "/door", destination: "/admin/scanner" }` in `next.config.ts` | a group cannot produce two URLs for one page; parallel routes are slots within one URL |
| **Redirect?** | no | no | no [CITED: nextjs.org/docs/…/rewrites — *"Rewrites act as a URL proxy and mask the destination path"*] | n/a |
| **Extra round trip on navigation** | none beyond the ordinary dynamic render | none | none; *"Rewrites are applied to client-side routing"* [CITED: same page] | n/a |
| **Build outputs** | **two** route entries, one shared `ScannerClient` chunk | **two** route entries, one shared chunk | **one** route entry | n/a |
| **Effect on `self.__SW_MANIFEST`** | one extra small route chunk; **still zero documents** | same | none; **still zero documents** | n/a |
| **`(admin)` layout inherited?** | **there is no `(admin)` layout.** `find "src/app/(admin)" -name layout.tsx` returns exactly one file: `admin/(work)/layout.tsx` | same | same | n/a |
| **Seen by `verify-routes.mjs` check 2?** | **yes** if the file sits under `src/app/(admin)/` | **yes**, same condition | **no** — no page on disk to census | n/a |
| **Enters `typedRoutes`?** | yes, once the page exists | yes | **yes** — Next 16.1.6 folds `rewriteRoutes` into the union | n/a |
| **Keeps `capability-routes.ts` to one entry?** | yes | yes | yes, but the entry is then unverifiable against disk | n/a |

**Option 4 is not a candidate.** A route group changes no URL by construction — that is
exactly why `(work)` was introduced (`admin/(work)/layout.tsx:18-24`) — and parallel routes
render multiple slots *within one* URL. Neither can produce a second address. Recorded so
it is not re-proposed.

## A.2 The layout question, answered by measurement

The prompt asks whether the door *wants* the `(admin)` layout. **There is no `(admin)`
layout to want.** The only layouts on this tree are `src/app/layout.tsx` (root) and
`src/app/(admin)/admin/(work)/layout.tsx`, and the latter's docblock says in as many
words why it was nested rather than placed at `admin/layout.tsx`:

> *"A layout at `src/app/(admin)/admin/layout.tsx` would also wrap `/admin/scanner`,
> which would put a tab bar and a SECOND bottom nav on the door … It also pre-positions
> Phase 39: when the door leaves for its own address, it is already structurally
> separate."* — `src/app/(admin)/admin/(work)/layout.tsx:14-24` [VERIFIED: file read]

So under every mechanism the door renders under the root layout alone, at both
addresses, and no plan needs to do anything to keep it that way. What a plan **must** do
is not create an `(admin)/layout.tsx` or a `door/layout.tsx` by reflex.

## A.3 Why `rewrites()` is rejected despite being the tidiest

`rewrites()` is genuinely the smallest diff and it does satisfy D-39-02. It is rejected
for three reasons, in descending weight.

1. **It disappears from the repository's own disk census.**
   `scripts/verify-routes.mjs` check 2 walks `src/app/(admin)` for `page.tsx` files and
   demands each resolve to a map pattern (`scripts/verify-routes.mjs:censusAddresses`).
   A rewrite has no page, so the check has nothing to see. `_everyStaffRouteIsBound` in
   `capability-routes.ts:497` cannot see it either — `StaffRoute` extracts only
   `/admin`-prefixed members of the union, and `/door` is not one. The result is an
   address bound in the map with **nothing anywhere asserting that the binding is honest**,
   in a repository whose whole Phase-34 discipline is that the map and the disk must be
   forced to agree. That is a step backwards on the one axis this project has spent a
   phase building.

2. **The middleware-versus-rewrite ordering has never been measured here.** If the
   rewrite is applied before `updateSession` runs, `request.nextUrl.pathname` is
   `/admin/scanner` and the `/door` row in the map is decorative; if after, the row is
   load-bearing. Both are defensible, but the phase would be shipping a door whose
   authorisation path depends on an ordering nobody in this repo has read off a running
   server. See Open Question 1 for the one-line measurement that settles it — and note
   that with a page-based mechanism **the question does not arise**.

3. **`next.config.ts` is where this project has already decided routing tables do not
   go.** `organizer-redirects.ts:29-36` records D-34-14 verbatim: the fifteen redirects
   were kept out of `next.config` precisely because a config-declared source enters the
   generated route union and hands the phase a false green. The same reasoning applies,
   in the same direction, to a config-declared rewrite.

## A.4 Recommendation

**Mechanism 2 — a shared server component rendered by two thin `page.tsx` files, both
under `src/app/(admin)/`.**

```
src/app/(admin)/admin/scanner/DoorSurface.tsx   ← the guard + <ScannerClient/> + <MobileNav/>
src/app/(admin)/admin/scanner/page.tsx          ← thin: renders <DoorSurface/>
src/app/(admin)/door/page.tsx                   ← thin: renders <DoorSurface/>
src/app/(admin)/admin/scanner/ScannerClient.tsx ← UNTOUCHED except its MobileNav props
```

Why this shape and not the re-export (mechanism 1):

- **`ScannerClient.tsx` stays where it is**, so `checkin-offline.md`'s
  `src/app/**/scanner/**` glob keeps matching it and `npm run verify:persona` control A
  stays green without a persona edit (§G, landmine 6).
- **`DoorSurface.tsx` is a non-route module and stays out of `(work)`**, satisfying
  R-WORK-ROUTES (`nextjs-architecture.md`). It is at `src/app/(admin)/admin/scanner/`,
  a level outside `(work)`, exactly as that rule prescribes.
- **`src/app/(admin)/door/page.tsx` serves `/door`** — the route group contributes no URL
  segment — so D-39-01's "out of `/admin`" is satisfied in the *address*, which is what
  D-39-01 is about, while the *file* stays inside the tree that `verify-routes.mjs` and
  the persona globs already cover.
- A re-export (`export { default } from …`) would work identically at runtime but does
  not carry segment config, does not read as two pages to a person scanning the tree, and
  makes the diff of the door's own file look like a deletion.

**The one trade-off, stated:** two `page.tsx` files means the door's guard is written
once and mounted twice, so a future editor could add a check to one page and not the
other. The mitigation is structural, not procedural — the guard lives in `DoorSurface`,
and both pages are three lines with nothing in them to diverge.

**On `capability-routes.ts`:** all four mechanisms allow a single entry with two routes.
The recommendation adds `"/door"` to the existing `routes` array and grows no second
predicate. The cost of that one array element is §B.

---

# B. The capability map and the middleware assertion

## B.1 The door's entry today, verbatim

```ts
// src/lib/routes/capability-routes.ts:213-217
[CAP.DOOR_OPERATE]: {
  routes: ["/admin/scanner"],
  assignmentOpenable: true,
  alsoGatesTables: true,
},
```

`assignmentOpenable: true` was restored by plan 34-03 after being left behind, and the
entry's docblock (`:189-211`) records that its absence *"refuses the person rostered to
work the door, at two in the morning, in front of a queue"*. **Nothing in this phase may
touch that flag.**

## B.2 The assertion in the middleware: what exactly it asserts

`src/lib/supabase/middleware.ts:162-183` — a **module-load** block, not a build check:

```ts
const DOOR_ADDRESS = "/admin/scanner";
const doorBinding = resolveRoute(DOOR_ADDRESS);
if (doorBinding === null || doorBinding.key !== CAP.DOOR_OPERATE) { throw … }
if (!doorBinding.assignmentOpenable) { throw … }
```

- **Matching is neither prefix nor longest-match: it is an exact segment walk with a
  specificity tiebreak.** `resolveRoute` (`capability-routes.ts:659`) splits the path,
  requires **equal segment count**, compares literals, treats `[id]` as exactly one
  non-empty segment, and among matches picks the one with the **fewest dynamic segments**.
  `/admin` opens `/admin` and nothing below it. Declaration order is irrelevant, proved by
  mutation C of plan 34-01.
- **Where it fires:** the file says it explicitly (`:152-160`) — *"Module-load code in a
  middleware bundle runs when the runtime instantiates the bundle: **the first request
  after deploy**, not `npm run build`."* Measured by plan 34-03 with the import in place.
  A wrong map is a loud 500 on every covered route on the first request after deploy.
- **Ambiguity is a load-time throw**, not a request-time coin flip
  (`capability-routes.ts:588-617`). `/door` is one literal segment; `/admin`,
  `/membership-card` and `/attendance` are the other one-segment patterns and all carry
  different literals, so **no ambiguity is introduced**. [VERIFIED: read the resolver]

**Recommendation (C9):** add a second module-load assertion in the same file for the
second address. The existing one exists because *"the binding itself is data now, and data
can be edited"* (`:126-131`). That sentence is exactly as true of `/door`, and a phase that
adds an address without adding its assertion leaves the newer half of the door unguarded
by the mechanism the older half has.

## B.3 Is adding `/door` to `routes` sufficient for all readers? **No.**

There are **five** readers of the map, not three. The CONTEXT's "three readers" is the
Phase-34 docblock's phrasing; measured on this tree the count is five.

| # | Reader | File:line | Effect of a second route in the door's entry |
|---|--------|-----------|----------------------------------------------|
| 1 | Middleware, per-request | `src/lib/supabase/middleware.ts:495` | ✅ Works. `resolveRoute("/door")` returns `door.operate`, assignment-openable. |
| 2 | Middleware, module-load | `middleware.ts:162-183` | ✅ Unaffected (still asserts `/admin/scanner`). Should be **extended**, per B.2. |
| 3 | **Navigation** | **`src/lib/rbac/roles.ts:20-21`** | 🔴 **BUILD ERROR.** See B.4. |
| 4 | Staff tab bar | `src/lib/routes/staff-tabs.ts:131` | ✅ Unaffected — the door is deliberately not a tab (`staff-tabs.ts:59-63`). Do not add it. |
| 5 | Organizer redirect table | `src/lib/routes/organizer-redirects.ts:136-155` | ⚠️ Passes, but its fence weakens. See B.5. |
| — | **The page guard** | `src/app/(admin)/admin/scanner/page.tsx:88-101` | ✅ Does **not** read the map at all. It asks `ctx.capabilities.has(CAP.DOOR_OPERATE)` and the live-assignment set directly. Address-independent, and it must be mounted on **both** pages. |
| — | Disk census | `scripts/verify-routes.mjs` | ✅ Covers the new page **iff** it lives under `src/app/(admin)`. |

## B.4 The tripwire in `roles.ts` — the single most consequential fact in this phase

```ts
// src/lib/rbac/roles.ts:6-23
/**
 * … Phase 39 moves the door to its own address (STAFF-04), and this file must
 * not be a second place where that address has to be remembered.
 *
 * **The type annotation is the guard, and it is not decoration.** A one-element
 * tuple is asserted, so binding `door.operate` to a second address becomes a
 * build error here — naming this file — instead of a silent `[0]` that keeps
 * drawing the first one. There is exactly one door.
 */
const DOOR_BINDING: { readonly routes: readonly [Route] } =
  CAPABILITY_ROUTES[CAP.DOOR_OPERATE];

const DOOR_HREF: Route = DOOR_BINDING.routes[0];
```

**Proved, not assumed.** Reproducing the shape and running the repository's own compiler
(`node_modules/.bin/tsc --noEmit --strict`):

```
error TS2322: Type '{ readonly routes: readonly ["/admin/scanner", "/door"]; … }'
  is not assignable to type '{ readonly routes: readonly [string]; }'.
    Type 'readonly ["/admin/scanner", "/door"]' is not assignable to type 'readonly [string]'.
      Source has 2 element(s) but target allows only 1.
```
[VERIFIED: executed against `node_modules/.bin/tsc` on this tree, 2026-08-11]

This is Phase 34 handing Phase 39 a deliberate stop. The plan must **spend** it, in the
file, with a docblock replacing the one above: there are now two addresses, `/door` is
canonical for the nav, and the tuple becomes a two-element one — or, better, the constant
becomes an explicit `const DOOR_HREF: Route = "/door"` **verified against the map**, in the
staff-tabs style (`staff-tabs.ts:130-148`): assert that `resolveRoute(DOOR_HREF)` returns
`door.operate` and throw by name if it does not. That converts an arity guard into a
meaning guard, which is what the tuple was standing in for.

**Which address the nav draws is a real decision, not a formality.** `/door` is
recommended: it is the canonical address (D-39-01), and every device that follows the nav
thereafter warms the `/door` cache entry rather than the old one — which is precisely what
success criterion 2 needs (§C.6).

## B.5 The redirect table's `/scanner` fence

```ts
// src/lib/routes/organizer-redirects.ts:147-153
if (row.to.includes("/scanner") || row.from.includes("/scanner")) { throw … }
```

The fence protects the door by **substring on the old address**. After the move it no
longer covers the new one: a sixteenth row pointing at `/door` would pass. Nobody would
write such a row today — every row must start `/organizer` by type — but the fence is
there because *"a reverse row would put that address one careless entry away from being
redirected"*, and that sentence is now half-true.

**Recommendation:** replace the substring test with a read of the door's entry —
`CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes.some(r => row.to === r || row.from === r)` —
so the fence follows the map instead of a spelling. Low cost, and it removes a place
where the door's address has to be remembered, which is the same argument `roles.ts`
already makes about itself.

## B.6 Does `next build` refuse a surface under `(admin)` with no map row? Partly.

The claim in `nextjs-architecture.md` and in the CONTEXT is true **for static
`/admin/*` pages only**, and the map's own docblock says so at `capability-routes.ts:60-77`:

- `_everyStaffRouteIsBound` (`:497`) computes `Exclude<StaffRoute, Listed>` where
  `StaffRoute = Extract<Route, "/admin" | \`/admin/${string}\`>` minus the query/hash arms.
  **It covers 14 static staff routes, measured 2026-08-09.** It cannot see dynamic routes
  at all (`RouteImpl`'s dynamic arm collapses to `never` for a bare `Route`).
- The third link is `scripts/verify-routes.mjs`, run by hand — **there is no CI**
  (D-34-12, `capability-routes.ts:49-53`).

### And the equivalent for a surface *outside* `(admin)` — the honest answer

**There is none, in either direction, and this is the phase's most important structural
finding.**

1. **The type assertion will never see `/door`.** `StaffRoute` extracts `/admin`-prefixed
   members of the union. `/door` is not one. A `/door` page with no map row would produce
   **no build error**.
2. **`verify-routes.mjs` check 2 censuses `src/app/(admin)` only** — the docblock states
   it (`"The census sees src/app/(admin) only"`). A page at `src/app/door/page.tsx` is
   invisible to it. A page at `src/app/(admin)/door/page.tsx` **is** censused, turned into
   the address `/door`, and required to match a map pattern.
3. **The middleware's fail-closed branch does not reach it either.**
   `isUnderWorkTree` (`middleware.ts:197`) compares the **first segment** to `"admin"`.
   For `/door` it is `false`, so an unmapped `/door` takes the `entry === null`
   fall-through and **the middleware admits everybody**, leaving the page guard as the only
   refusal. That is not a security hole — the page guard is real and must be mounted — but
   it silently changes which of the two gates refuses, and it moves the refusal from a
   bounce with an `?access=` cause to a bare `redirect("/dashboard")`.

**Therefore:** put the page under `src/app/(admin)/`. That single placement decision buys
back check 3 of the CAP-02 chain for the new address at zero cost, and it is the reason
mechanism 2 in §A.4 specifies the group.

## B.7 The `protectedPrefixes` gap — a door regression the phase must not ship

```ts
// src/lib/supabase/middleware.ts:454-459
const protectedPrefixes = ["/dashboard", "/membership-card", "/attendance", "/admin"];
```

This list decides one thing: whether an **unauthenticated** caller is sent to `/login`
with their destination in `?redirect=`. `/door` is not on it and would not be by
default.

What happens tonight if it is left off, for a person whose session expired in a pocket:

1. `/door` → not protected → no bounce to login;
2. the page guard resolves `ANONYMOUS_CONTEXT`, `maySeeTheDoor` is false, `redirect("/dashboard")`;
3. `/dashboard` **is** protected → `/login?redirect=/dashboard`;
4. and blocker **D7** (`.planning/STATE.md`, and `src/app/(auth)/login/page.tsx:38-39`
   in the source: *"`middleware.ts:466` writes `?redirect=`; this file reads `?next=`"*)
   means the destination is lost anyway.

So the person working the door signs in and arrives at the **dashboard**, in the dark,
with a queue. Adding `"/door"` to `protectedPrefixes` makes step 1 a direct bounce and
removes step 2 and 3. It does not fix D7 — that is a pre-existing blocker and out of scope
— but it stops this phase from adding a second wrong turn on top of it.

**This is a required task, not an optional one.** It is the only place in the phase where
omitting a line produces a worse door than the one that exists today.

---

# C. Service worker and precache — what actually carries the door offline

## C.1 What `self.__SW_MANIFEST` contains: measured, not inferred

`@serwist/next` builds the precache manifest from **webpack's emitted assets plus a glob
of `public/`** and nothing else (`node_modules/@serwist/next/dist/index.js:192,227-249` —
`publicDir = path.resolve(options.dir, "public")`, `globSync(globPublicPatterns, { cwd: publicDir })`,
`additionalPrecacheEntries`). No route, no document, no RSC payload can enter it by
construction. [VERIFIED: package source read on this tree]

Measured against the built `public/sw.js` (local build, 2026-08-11 13:44 — the file is
gitignored, `.gitignore:40`):

| Group | Entries |
|---|---|
| `/_next/static/chunks/*.js` | 104 |
| `/_next/static/css/*` | 2 |
| `/_next/static/media/*` (fonts) | 8 |
| `/_next/static/<buildId>/_buildManifest.js`, `_ssgManifest.js` | 2 |
| `public/` files (`/manifest.json`, the two icons, five svgs, two images, `/swe-worker-*.js`) | 11 |
| **HTML documents** | **0** |
| **Route URLs** | **0** |
| **RSC payloads** | **0** |
| **Total** | **127** |

## C.2 Is the door statically renderable? No — and neither is the launch target

`.next/prerender-manifest.json` on this tree lists **six** prerendered routes:
`/_global-error`, `/_not-found`, `/login`, `/register`, `/payment/callback`,
`/favicon.ico`. Neither `/` nor `/admin/scanner` is among them, because both call
`await getAccessContext()` which reads cookies. [VERIFIED: built artefact]

**Consequence:** there is no build-time document for either address that a precache
strategy could pick up even if one wanted it to. `precacheOptions.navigateFallback`
(supported by Serwist [CITED: serwist.pages.dev/docs/serwist/core/serwist — *"An URL that
should point to a HTML file with which navigation requests for URLs that aren't precached
will be fulfilled"*]) has nothing to point at.

## C.3 The four `NetworkOnly` API rules: address-independent, confirmed

`src/app/sw.ts:32-48` matches on `url.pathname === "/api/tickets/attendance"`,
`"/api/tickets/checkin"`, `"/api/membership/list"`, `"/api/membership/verify"`. Four
pathname equality tests on API routes. **The door's address appears nowhere in `sw.ts`.**
These rules survive the move byte-identically and no plan needs to touch them.

Why they are `NetworkOnly` and must stay so is in the file's own docblock (`:14-31`): the
inherited `defaultCache` carries a `NetworkFirst` for every same-origin `GET /api/*`
(`cacheName: "apis"`, 24 h, 10 s network timeout), so on a weak signal the attendee fetch
would resolve from a day-old payload while `navigator.onLine` is still `true` and the
scanner would write that stale list over the good local one — and `/api/membership/list`
returns the whole roster, which must not sit at rest in a browser cache on a staff phone.
**Order matters:** `runtimeCaching: [...doorRuntimeCaching, ...defaultCache]` (`sw.ts:125`).

## C.4 The `/events/**` rule — do not touch, in either direction

`sw.ts:110-113` puts everything under `/events/` on `NetworkOnly`, with a 57-line docblock
explaining that it is a **deliberate resolution of a conflict between two domain gates**:
`checkin-offline.md` wants the door to default open, `venue-secrecy.md` wants a venue
address closed, the more restrictive wins, and the accepted cost is that **the event page
does not open at all without network** (T-37-27, disposition ACCEPT).

**This phase must not loosen it, and must not tighten it either.** It is C8's monotone
class: the only permitted direction is harder-to-trip, and it is already at
`NetworkOnly`. Any plan that finds itself editing this rule to make the door work has
taken a wrong turn — the door's state is IndexedDB (`sw.ts:14-23`) and does not live under
`/events/`.

## C.5 Navigation handling today: no `NavigationRoute`, no fallback

- `sw.ts:116-126` passes `navigationPreload: true`, `skipWaiting: true`,
  `clientsClaim: true`, `cleanupOutdatedCaches: true`, `concurrency: 10`.
- **No `fallbacks` option. No `precacheOptions.navigateFallback`. No `NavigationRoute`
  import.** [VERIFIED: full file read]
- So navigation requests are handled by the `runtimeCaching` list, in order. After the
  five door/venue rules, `defaultCache` applies. Reading
  `node_modules/@serwist/next/dist/index.worker.js`, the relevant tail is:

  | Order | Matcher | Handler | Cache | Expiry |
  |---|---|---|---|---|
  | … | `RSC:1` + `Next-Router-Prefetch:1`, same-origin, not `/api/` | `NetworkFirst` | `pages-rsc-prefetch` | 32 entries / 24 h |
  | … | `RSC:1`, same-origin, not `/api/` | `NetworkFirst` | `pages-rsc` | 32 / 24 h |
  | … | request `Content-Type` includes `text/html`, same-origin, not `/api/` | `NetworkFirst` | `pages` | 32 / 24 h |
  | … | same-origin, not `/api/` | `NetworkFirst` | `others` | 32 / 24 h |
  | last | `/.*/i`, GET | `NetworkOnly` | — | — |

- And **`cacheOnNavigation: true`** (`next.config.ts:6`) adds a second, independent writer:
  `sw-entry.js` monkey-patches `history.pushState` / `replaceState` and, **only when
  `navigator.onLine`**, posts `__FRONTEND_NAV_CACHE__` to a dedicated worker
  (`/swe-worker-*.js`, itself precached) which does
  `caches.open("pages")` → `if (already cached) return` → `fetch(url)` → `put`.
  [VERIFIED: `node_modules/@serwist/next/dist/sw-entry.js:16-38`,
  `sw-entry-worker.js:11-27`]

- `reloadOnOnline: false` is deliberate (`next.config.ts:9-12`): a reload when the signal
  returns would tear down the camera stream, the selected party and `ScannerClient`'s
  in-memory undo list while entries are still queued. **Nothing in this phase may flip
  it.**

## C.6 What criterion 2 actually asks, and the answer

> *With the radio off, starting from the home-screen launch at `/`, what carries the person
> to a working door — client-side navigation from a precached shell, or a precached
> document for `/door`?*

**Neither. There is no precached shell and no precached document.** What carries them, if
anything does, is a **runtime `NetworkFirst` cache entry written during a previous online
visit**, and there are two independent chains, both fragile:

**Chain 1 — document.** A hard navigation to `/door` (typed, or the standalone launch)
issues a document request. It routes to `pages` or to `others` (both `NetworkFirst`,
32 entries, 24 h). Offline, the network arm fails and the handler falls back to that
cache. **Warm only if the same URL was fetched online within the last 24 hours.**

**Chain 2 — client-side navigation.** From `/dashboard`, tapping the Check-in tab is a
`<Link>` navigation: the App Router requests the RSC payload for the target. Offline that
routes to `pages-rsc` (`NetworkFirst`, 32 / 24 h). **Warm only if that route's RSC payload
was fetched online within the last 24 hours** — which prefetch does do, on a page where the
link is rendered, while online.

**What must be true in `sw.ts` for this to hold for BOTH addresses:** *nothing in
`sw.ts` changes it, and that is the finding.* Cache keys are request URLs. `/door` and
`/admin/scanner` are two different URLs and therefore two independent entries in every
bucket above, under **every** mechanism in §A — including `rewrites()`, where the browser
still requests `/door`. **Visiting one address does not make the other reachable
offline.** A device that warmed `/admin/scanner` yesterday and is handed `/door` tonight
with the radio off has a cold cache for the address it is being sent to.

**And the launch is a two-document hop, not one.** `src/app/page.tsx:8-12` resolves the
access context and *redirects a signed-in caller to `/dashboard`*. So the home-screen
launch at `start_url: "/"` needs, offline, either a usable cached `/` (which for a
signed-in account is a *redirected* response — the least cacheable kind) or a usable
cached `/dashboard`. D-39-05 says the launch "lands on `/`, the members' home"; measured,
it lands on `/` and is *sent onward*. This does not change D-39-05's conclusion — it
strengthens it — but the plans should write the chain as it is, because a procedure that
expects one document and meets two produces an observation nobody can interpret.

### The operational consequence, which belongs in the runbook and not only in a plan

`checkin-offline.md` already carries the gate *provato prima della porta* — the scan path
is tested **that day, on that device, with that account**. §C.5's numbers turn that from
advice into arithmetic: **24 hours and 32 entries**. A door warmed the day before is a
door whose document may have expired by 02:00, and 32 entries is a small LRU on a phone
that also browses events, tickets and the gallery.

**Recommendation for the plans, and it is a documentation task rather than a code one:**
the runbook line for a night becomes *"open the door at its address, online, on that
phone, on the night"* — and the door pass (§F) must contain that step as an explicit,
timed precondition rather than as an assumption. If a plan wants a code answer instead,
the only honest one is an explicit `NetworkFirst` runtime rule for the door's two
addresses with a longer `maxAgeSeconds` and its own `cacheName` — which is a **new
decision** about serving a stale door, and therefore belongs to the owner, not to a
planner. Recorded as Open Question 3.

---

# D. The manifest

## D.1 The measurement, confirmed

```json
// public/manifest.json — read 2026-08-11
{ "name": "Resonate", "short_name": "Resonate", "description": "motion music hub",
  "start_url": "/", "display": "standalone",
  "background_color": "#0a0a0a", "theme_color": "#0a0a0a", "orientation": "portrait",
  "icons": [ 192, 512 — both "any maskable" ] }
```

**No `scope` key.** D-39-05's measurement is confirmed exactly. [VERIFIED: file read]

## D.2 What the absence of `scope` means

> *"If `scope` is missing or invalid, it defaults to the `start_url` value after removing
> its filename, query, and fragment."* [CITED: developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope]

With `start_url: "/"`, the default scope is **`/` — the entire origin**. Therefore:

- **Every same-origin URL opens inside the installed app**, `/door` included. A link to
  `/door` tapped from within the standalone window stays in the standalone window; one
  tapped from outside opens wherever the OS sends it, which is unchanged by this phase.
- **Adding `/door` changes nothing about scope.** It was already in scope before the page
  existed. There is no scope edit to make, and a plan that adds `"scope": "/"` for
  clarity is making a cosmetic change to the one file whose semantics govern what an
  already-installed home-screen icon does — not worth the risk on the phone that works
  the door.
- Serwist's registration path uses the same value: `sw-entry.js:13` registers only
  `if (register && !isCurrentPageOutOfScope(scope))`, with `scope` defaulting to
  `basePath` (`/`). So the worker registers on `/door` as it does everywhere else.
  [VERIFIED: package source]

## D.3 What contradicts D-39-04 — nothing; what is flagged rather than decided

**Nothing in this phase contradicts D-39-04.** One app, one manifest, `start_url` stays
`/`. Flagged for the owner, not decided here:

- **A `shortcuts` entry pointing at `/door`** would put a long-press shortcut on the
  installed icon that launches straight into the door, without a second manifest, without
  a second icon on the home screen, and without changing `start_url`. It is a genuinely
  different thing from the deferred "separate installable door app", and it would collapse
  §C.6's two-document launch hop into one. It is **not proposed here**, because (a) it is
  a change to the installed app's presentation and therefore touches brand
  (`brand-visual-system.md` governs any name and icon that reaches a home screen), and
  (b) shortcut support is uneven across platforms and the door's platform is the staff
  phone, whose behaviour must be observed and not assumed. If the owner wants it, it is a
  decision for `/gsd:discuss-phase`, not a task a planner may add.

---

# E. The inherited navigation item (D-39-06)

## E.1 The current signature and every call site

```ts
// src/lib/rbac/roles.ts:161-164
export function getVisibleNavItems(
  role: UserRole | null,
  status: UserStatus | null
): NavItem[]
```

**One caller:** `src/components/layout/MobileNav.tsx:48` —
`const visibleItems = getVisibleNavItems(role, status);` inside a `"use client"`
component whose props are `{ role: UserRole | null; status: UserStatus | null }`.

**`<MobileNav>` mount sites — 13, measured on this tree:**

| # | File |
|---|------|
| 1 | `src/app/page.tsx:67` |
| 2 | `src/app/(public)/gallery/page.tsx:71` |
| 3 | `src/app/(public)/tickets/[id]/page.tsx:212` |
| 4 | `src/app/(public)/artists/[slug]/page.tsx:172` |
| 5 | `src/app/(public)/newsletter/page.tsx:16` |
| 6 | `src/app/(public)/events/page.tsx:567` |
| 7 | `src/app/(public)/events/[slug]/page.tsx:1272` |
| 8 | `src/app/(public)/events/[slug]/menu/page.tsx:235` |
| 9 | `src/app/(members)/attendance/page.tsx:63` |
| 10 | `src/app/(members)/membership-card/page.tsx:69` |
| 11 | `src/app/(members)/dashboard/page.tsx:588` |
| 12 | `src/app/(admin)/admin/(work)/layout.tsx:77` — covers every work surface |
| 13 | `src/app/(admin)/admin/scanner/page.tsx:104` — **the door** |

> The docblocks say "44 pages" (`roles.ts:120`, `(work)/layout.tsx:65`). That number is
> from before plan 34-05 introduced `(work)/layout.tsx`, which collapsed all the work
> surfaces into mount #12. **Measured today: 13 mount sites.** Plans should use 13 and
> correct the two docblocks in passing — a stale count in a file whose docblock is used to
> justify *not* changing a signature is exactly the kind of prose that keeps a decision
> alive after its reason expired.

## E.2 What "giving `getVisibleNavItems` the capability set" costs

Every one of the 13 sites already resolves the context it would need:

- **Sites 1–11 and 13** call `await getAccessContext()` (or receive `role`/`status` from
  it) and pass `role as UserRole | null, status as UserStatus | null`. Adding
  `capabilities={[...capabilities]}` is one extra destructured field and one extra prop.
  `getAccessContext` is `cache()`-scoped per request (`capabilities/server.ts`), so no
  site pays a second round trip.
- **Site 12** already destructures `{ capabilities, role, status }` and already passes
  `capabilities` to `StaffNav`. It is a one-word change.
- **`MobileNav` must not import the DAL** — it is `"use client"`. The prop must be a
  serialisable `CapabilityKey[]`, exactly as `StaffNav` already takes
  (`(work)/layout.tsx:76`). This is the established pattern in this repo; do not invent a
  second one.
- **`getVisibleNavItems` keeps its other three filters.** `34-04-SUMMARY.md:198` records
  the reason and it still holds: no capability governs `/`, `/events` or `/gallery`, and
  three of the five entries are not capability-gated at all. The change is **narrow** —
  the Check-in entry stops being filtered by `roles: [...] + requireApproved: true` and
  starts being filtered by `capabilities.includes(CAP.DOOR_OPERATE)`.

**Public-surface caution:** sites 2–8 are public pages served to anonymous visitors. For
those, `getAccessContext()` returns `ANONYMOUS_CONTEXT` with `capabilities: new Set()`, so
the Check-in entry is filtered out exactly as it is today. No verdict on a public surface
changes — but a plan must say so explicitly, because CAP-05 criterion 4 forbids a verdict
change on a public surface and this touches eight of them.

## E.3 The coarse-assignment question this raises, which the plan must answer explicitly

The middleware admits the door on **role `or` live assignment**
(`middleware.ts:506-508`), and the page guard repeats that predicate
(`scanner/page.tsx:97-101`). `getVisibleNavItems` will only be given `capabilities`.

So a member of staff rostered to tonight's door — who holds `door.operate` **by
assignment and by nothing else**, `staff` being one of the six declared refusals of the
role (`capability-routes.ts:193-198`) — would still see **no** Check-in tab after D-39-06
if only `capabilities` crosses the boundary.

**That is the same safe direction the divergence already had** (a hidden entry the server
would allow, never a drawn entry it refuses), so it is not a regression. But it means
D-39-06 closes the `pending`-organizer half and leaves the assignment half open unless the
plan also passes `liveAssignmentCapabilities`. Both are defensible:

- **Pass capabilities only** — smallest change, closes what D-39-06 names, leaves a
  documented remainder.
- **Pass both** — the nav then matches the server exactly, and the rostered staff member
  gets a tab. It is also *wider*: `liveAssignmentCapabilities` is coarse and does not name
  a night (`capabilities/server.ts`, *"wider than the real permission, always and by
  construction"*), so a person assigned to a **different** night would be drawn a tab that
  the middleware admits and the page then admits — and they simply do not find their night
  in the list. No refusal, no promise broken.

**Recommendation: pass both, and write the widening down.** A tab that appears for
somebody assigned to another night leads to a working door with an empty night list — no
false refusal anywhere, which is the asymmetry `checkin-offline.md` optimises for. But
this is a widening of a *drawn* entry, so it is presented as a decision the plan states
out loud rather than a detail it absorbs.

## E.4 The gate that must not move — confirmed from `access-gating.md`

> **Gate coerenza navigazione/permessi:** *"La lista `NAV_ITEMS` in `src/lib/rbac/roles.ts`
> nasconde le voci per ruolo. Nascondere un link **non è proteggere una rotta**: ogni voce
> nascosta deve avere il suo controllo lato server."*

**This is a visibility change and nothing else.** The server-side guard is
`src/app/(admin)/admin/scanner/page.tsx:88-101` — the coarse `door.operate` role-or-
assignment check whose docblock states that *"anybody who clears the coarse gate clears
this one; if the two ever diverge, this is the copy that is wrong."* That guard must be
mounted on **both** pages (§A.4's `DoorSurface` does this by construction). The real
boundary on the door's data is `requireDoorOperator({ partyId })` in the three door Route
Handlers, which write with the service client and see no policy — **untouched by this
phase**.

**Where the capability set is already computed on the server:** `getAccessContext()` in
`src/lib/capabilities/server.ts`, memoised with `cache()`, returning
`{ capabilities: Set<CapabilityKey>, userId, role, status, liveAssignmentCapabilities }`.
Every one of the 13 mount sites is inside a Server Component that can call it.

---

# F. The door pass (criterion 3 + D-39-07)

## F.1 Inventory of what Phase 38 deferred — and a discrepancy the plans must resolve

`38-HUMAN-UAT.md` carries **eight** tests: one blocked, **seven pending**.
`.planning/STATE.md ## Blockers` says *"Le sette procedure umane di fase 38 sono
DIFFERITE"*. `39-CONTEXT.md` D-39-07 enumerates *"P1, P2, P3, P4, P5 and P7"* — **six**.

**The seventh pending item is test 8, which carries no P number.** It is not in D-39-07's
list and it is not P6. Measured:

| UAT test | Procedure | Observes | Closes | Sole witness to |
|---|---|---|---|---|
| 1 | **P5** | two devices, one account each holding `door.operate` for the same night; B's counter changes untouched within ~2 s, three times | LIVE-01 | Pitfall 2 — a channel that joins, says `SUBSCRIBED`, delivers nothing |
| 2 | **P6** | null-party fan-out + reassignment; both doors reload untouched; delete by captured PK | LIVE-01 further | Pitfall 1 (LIVE-01 degrading to LIVE-04 silently), D-38-24 |
| 3 | **P7** | an approved `member` with no assignment gets `CHANNEL_ERROR` and no message, using **that account's own session** | LIVE-06 | RLS actually refusing a real browser session |
| 4 | **P1** | Realtime socket blocked *before* opening; counter climbs, verdict latency unchanged, band at ~5 min, tap resets, **no permission language on screen** | LIVE-02, LIVE-04, LIVE-05 | — |
| 5 | **P2** | channel dropped mid-night; verdict from cache, band appears, reload on restore **with nobody touching the screen** | LIVE-02, LIVE-03, LIVE-05 | absence of a human action — primary evidence for LIVE-03 |
| 6 | **P3** | the pocket — real staff phone, home-screen install, ≥65 min locked, past the 3600 s token lifetime; reload on resume, `updated 0s ago`, **not** the 5-min parachute | LIVE-03 | assumption A1 — whether a suspended iOS home-screen PWA fires the composed wake signal at all |
| 7 | **P4** | Slow 3G with the channel **up**; verdict latency unchanged against an unthrottled baseline | LIVE-02 | IndexedDB contention at scan time |
| 8 | *(unnumbered)* | the counter row tapped **one-handed, at minimum brightness, without moving the camera** | LIVE-05 | thumb hittability and legibility on a physical screen at minimum brightness |

**P6 stays separate**, and the reason is not scheduling: it **writes to production**, the
only authorisation this project held was spent on plan 38-04's schema-only apply at
2026-08-11T11:15:24Z and is recorded exhausted, **and this project lost 63 production rows
to a verification script on 2026-08-10 with no PITR** (`STATE.md`, D12). Its deadline is
an act rather than a date: *before the next night is published with tickets on sale.*

**Test 8 belongs in the door pass and D-39-07's enumeration should be read as including
it.** It is literally a dark-room, one-handed, minimum-brightness observation — the same
room, the same phone, the same minute as criterion 3. Excluding it would leave one item
requiring a second trip to the dark room, which is the exact cost D-39-07 exists to avoid.
The plan should say this explicitly rather than quietly folding it in.

## F.2 A coverage gap the merge closes for free

`38-HUMAN-UAT.md:64` records a divergence inside Phase 38's own documents — `38-VALIDATION.md`
describes P4 as **airplane mode**, PLAN and RESEARCH as **Slow 3G** — and draws the right
conclusion: *"Neither has been run, so neither was chosen — **the fully-offline door is not
covered by P1–P7 as written**."*

Criterion 3 of this phase **is** the fully-offline door. So the merged document closes a
gap Phase 38 declared open, at no extra cost — provided it runs **both**: Slow 3G with the
channel up (P4 as written, which measures IndexedDB contention) **and** radio off (criterion 3,
which measures the door existing at all). They are different measurements and one does not
substitute for the other. Say so in the document, or a later reader will assume the offline
run covered P4 and quietly retire a check.

## F.3 Where the document should live, and why

**In this phase's directory:** `.planning/phases/39-the-door-s-own-address/39-DOOR-PASS.md`,
with `38-PROCEDURES.md` gaining a short pointer block at its head and each of its seven
procedures gaining a one-line *"executed as part of §N of `39-DOOR-PASS.md`"*.

Reasons, in order:

1. **D-39-07's own criterion is that ONE document is the thing a person reads in the dark
   room.** `38-PROCEDURES.md` is 521 lines of procedures plus their reasons-for-pending.
   Extending it means the reader in the dark room is holding a document whose first 100
   lines explain why nothing has been run yet. That is a document for an auditor, not for a
   person at a door.
2. **The two artefacts have different lifetimes.** `38-PROCEDURES.md` is the record of
   *what Phase 38 asked for*, written in wave 1 before a line of that phase's code existed —
   *"a procedure written after the observation is a description, not a check."* Rewriting it
   now to include Phase 39's steps would retro-edit a document whose value is that it
   predates its own results.
3. **Phase 39 owns the sitting.** The night belongs to this phase's criterion 3; the six
   (seven) inherited procedures ride along. The owning document should be the owner's.

**The rule the pointer must carry:** `38-PROCEDURES.md`'s `Result` fields stay the record
of record for LIVE-01…LIVE-06. `39-DOOR-PASS.md` produces the observations; both files
receive the outcome, and neither is allowed to say "passed" while the other says "pending".
A split record that drifts is worse than one document that is slightly too long.

## F.4 Proposed structure of `39-DOOR-PASS.md`

Ordered so that one evening, two phones and one account-pair produce every observation
without re-staging, and so that the destructive-to-state steps come after the ones that
need a clean state.

```
---
phase: 39-the-door-s-own-address
absorbs: 38-PROCEDURES.md P1 P2 P3 P4 P5 + test 8   (P6 excluded — production write)
devices: two, one of them the actual staff phone with the app installed to the home screen
accounts: two, each holding door.operate for the same night — roles, never names
status: all pending
---

§0  Preconditions, read ON THE DAY and recorded with their wall-clock time
    0.1  Realtime `suspend` is false            → GET /v1/projects/{ref}/config/realtime
    0.2  the four triggers and the one SELECT policy on realtime.messages are present
    0.3  the deployed build is the one under test (build id, read from the page)
    0.4  the service worker under test is the new one   ← NEW, and §G landmine 1 is why
    0.5  BOTH addresses opened ONLINE on the staff phone, timed  ← the §C.6 warm-up

§1  The move — network ON, both devices                       [criterion 1]
    1.1  /door renders the door.       Observed, not asserted: no URL change in the bar.
    1.2  /admin/scanner renders the door. Same observation.
    1.3  DevTools → Network: neither request produced a 3xx. Record both status codes.
    1.4  The bottom nav's Check-in entry points at /door.
    1.5  A pending organizer account is drawn the Check-in entry.      [D-39-06]

§2  The pocket — the staff phone, ≥65 minutes                 [P3 · LIVE-03 · A1]
    (started first because it is the only step with a 65-minute floor;
     everything in §3–§6 runs on device B while §2's phone is in the pocket)

§3  Channel never established — desktop, request blocking      [P1 · LIVE-02/04/05]
§4  Channel dropped mid-night                                  [P2 · LIVE-02/03/05]
§5  Degraded not dropped — Slow 3G, channel UP                 [P4 · LIVE-02]
§6  Two devices, the headline behaviour                        [P5 · LIVE-01]
§7  A person not assigned to the night hears nothing           [P7 · LIVE-06]

§8  THE DARK ROOM — radio off, both phones                     [criterion 2 + 3 + test 8]
    8.1  minimum brightness, one hand, camera not moved
    8.2  radio off (airplane), app launched FROM THE HOME SCREEN
    8.3  what appears at the launch, verbatim — and which document it came from
    8.4  reach the door.  Record: which address, by which route (tap or typed),
         and whether it rendered.  If it did not, that is the finding.
    8.5  scan.  Verdict, latency, haptics, flash.
    8.6  the counter row tapped one-handed at minimum brightness      [test 8 · LIVE-05]
    8.7  radio on.  Reconnect.  Sync.  Record the elapsed time to a settled queue.
    8.8  repeat 8.2–8.4 for the OTHER address, cold          ← §C.6: two cache entries

§9  Results table — one row per observation, mapping each to the requirement it closes
```

**§0.5 and §8.8 are the two steps that exist because of this research** and would not be
in a procedure written from the phase description alone. §0.5 is the warm-up the 24-hour
runtime cache demands; §8.8 is the proof that warming one address did not warm the other.

## F.5 The production-write rule, restated for this document

Any step that creates a row **captures its primary key at creation and deletes by that
primary key**, never by clicking a delete control and never by a name match; the cascade
set is enumerated by **reading `pg_constraint`**, not remembered; and the deletion is
confirmed from a source **different** from the one used to delete
(`38-HUMAN-UAT.md:34`, and D12's 63 lost rows are why).

**The door pass as structured above contains no production write.** §1.5 needs a `pending`
organizer account, §6 and §7 need existing accounts and an existing night — all reads and
all check-ins, which write to `door_scan_events` in the ordinary way the product writes
them. If a plan finds itself needing to *create* a guest-list entry or a night, it has
drifted into P6 and needs the owner's fresh, explicitly scoped authorisation first.

---

# G. Risks and landmines

Each with the file that would carry the mistake.

### 1. An already-installed worker serving a stale precache after the move
**File:** `src/app/sw.ts` (nothing to change) / the verification procedure.
`skipWaiting: true` and `clientsClaim: true` update the **worker** on the next visit; they
do **not** empty the buckets the old worker filled — `sw.ts:100-108` says so in the
`/events/**` docblock, with the operational consequence spelled out: *"the first cache
measurement is taken in a PRIVATE window, or it measures the old worker and reports a
result about code that is no longer running."* The same trap applies to every reading in
§8 of the door pass. **Mitigation:** §0.4 above — record the active worker's script URL
from DevTools → Application → Service Workers before any offline observation, and take the
first measurement in a private window or after an explicit unregister-and-reload.

### 2. A `/door` document that is never cached because the route is dynamic
**File:** `src/app/(admin)/door/page.tsx` — but the cause is not in it.
There is no build output to precache (§C.2) and no runtime entry until somebody opens it
online (§C.5). The failure mode is silent and arrives at the worst moment: a phone that
has worked the door for months at the old address, sent to the new one, radio off, cold.
**Mitigation:** §0.5 of the door pass; the runbook line; and §8.8 as the standing proof.
**Do not mitigate it by loosening a cache rule** — see landmine 5.

### 3. The `(admin)` layout inherited or lost unintentionally
**File:** any new `layout.tsx`.
There is no `(admin)` layout today (§A.2). The risk is a plan **creating** one — a
`door/layout.tsx` "for consistency", or an `(admin)/layout.tsx` — either of which would
undo the entire reason `(work)` exists and would put a second bottom nav or a tab bar on
the door. **Mitigation:** a plan task that asserts, after the change,
`find "src/app/(admin)" -name layout.tsx` returns exactly `admin/(work)/layout.tsx`.

### 4. The middleware map assertion firing in production at 02:00
**File:** `src/lib/supabase/middleware.ts:162-183`.
It is a **module-load throw in a middleware bundle** — it fires on the **first request
after deploy**, not at build (`middleware.ts:152-160`, measured by plan 34-03). A 500 on
every covered route. If the deploy happens on the day of a night, "the first request after
deploy" and "the door opening" can be the same request.
**Mitigation, and it is a scheduling rule, not a code one:** deploy this phase on a day
with no night, and make the first request yourself. Add it to the plan as an explicit
step. And when adding the second assertion recommended in §B.2, add it in the **same**
commit as the map edit, so the two cannot be deployed apart.

### 5. The venue-secrecy `/events/**` rule loosened as collateral
**File:** `src/app/sw.ts:110-113`.
The plausible path to this mistake: a plan discovers §C's finding that no document is
precached, reaches for a broader page-caching rule to make the door work offline, and
writes a matcher that re-admits `/events/**` to Cache Storage — undoing T-37-27 and
putting a venue address at rest on a staff phone. **There is no rollback for a revealed
address.** **Mitigation:** any new runtime rule this phase adds must match the door's two
pathnames **by equality**, exactly as the four API rules do, and never by a prefix that
could grow. Add a source assertion to the plan's verification: `grep -c '"/events/"'`
in `sw.ts` is unchanged and the rule is still `NetworkOnly`.

### 6. The persona's own checks going red — or worse, staying green over a hole
**Files:** `.claude/rules/checkin-offline.md` frontmatter, `CLAUDE.md` Domain Module
Index, `.claude/rules/meta-gates.md` path table.
`checkin-offline.md` declares `src/app/**/scanner/**`. Measured consequences:

| If the plan… | Then |
|---|---|
| keeps `ScannerClient.tsx` under `.../scanner/` and adds a thin `(admin)/door/page.tsx` | control **A** and **G** stay green; but the new page loads `access-gating` + `nextjs-architecture` (via `src/app/(admin)/**`) and **not** `checkin-offline` — a coverage hole, not a check failure |
| **moves** the door's files into a `door/` directory | `src/app/**/scanner/**` matches nothing → control **A** fails and control **G** reports *"non matcha alcun file"* |
| adds `src/app/**/door/**` to `checkin-offline.md` only | control **B** fails — the frontmatter and the `CLAUDE.md` index must declare the **same** glob set |
| puts the page at `src/app/door/page.tsx` (outside every group) | it matches **no** domain module at all — `src/app/*.tsx` matches only direct children of `src/app` — so the door's page would load `meta-gates.md` and nothing else |

**Mitigation:** the recommendation in §A.4 (implementation stays under `.../scanner/`,
new thin page under `src/app/(admin)/`), **plus** a persona task that adds
`"src/app/**/door/**"` to `checkin-offline.md`'s `paths:` **and** to the matching row of
`CLAUDE.md`'s Domain Module Index in the same commit, **plus** a row in `meta-gates.md`'s
path table, **plus** `npm run verify:persona` green (7/7) in the plan's verification.
`ai-engineering.md` governs this and `meta-gates.md`'s impact pattern names it: *"Modifica
a `CLAUDE.md` o a un modulo di `.claude/rules/` → verifica coerenza indice ↔ frontmatter,
assenza di path morti, e rimisura il context budget."*

### 7. The `roles.ts` tuple widened without being replaced
**File:** `src/lib/rbac/roles.ts:20-21`.
The lazy fix is `readonly [Route, Route]` or `readonly Route[]` and `routes[0]`. The first
is a guard that no longer says anything true; the second silently keeps drawing whichever
address is written first and reintroduces exactly the *"silent `[0]`"* the docblock names.
**Mitigation:** §B.4's recommendation — an explicit `DOOR_HREF` verified against the map
with a named throw, in the `staff-tabs.ts:130-148` style.

### 8. `/door` left off `protectedPrefixes`
**File:** `src/lib/supabase/middleware.ts:454-459`. See §B.7. This is the one omission that
makes the door **worse** than it is today for a signed-out staff phone.

### 9. Two stale comments on the door's page, silently made staler
**Files:** `src/app/(admin)/admin/scanner/page.tsx:74` and `src/types/database.ts:762`.
`34-VERIFICATION.md:431` assigns both to Phase 39: they describe a `StaffNav` prop shape
that plan 34-04 changed. This phase opens the door's page anyway (D-39-06), and D-39-06's
change makes the `MobileNav` half of those sentences wrong too. Fixing them is three lines;
leaving them is how the next reader learns to distrust the comments.

### 10. Renaming `middleware.ts` → `proxy.ts` in this phase
**File:** `src/middleware.ts:43-50`. Next 16 deprecated the convention and the file says so,
and says the rename is *"work for its own small plan, **after** Phase 39"*
(`34-VERIFICATION.md:431` agrees). **Out of scope.** A plan that folds it in produces two
changes that look like each other in a diff, on the most safety-critical file in the repo.

---

## Architecture Patterns

### System architecture — a request for the door, both addresses

```
  HOME SCREEN ICON (start_url "/", display standalone, scope defaults to "/")
        │
        ▼
   ┌─────────────┐  radio ON ──────────────────────────────┐
   │ navigation  │                                          │
   │  request    │  radio OFF ─▶ Serwist runtime rules      │
   └─────────────┘                (NO precached document)   │
        │                              │                    │
        │                              ▼                    ▼
        │                   NetworkFirst → cache      src/middleware.ts
        │                   "pages" | "others"               │
        │                   32 entries · 24 h        ┌───────┴────────┐
        │                   warm ONLY from a         │ organizer      │
        │                   previous ONLINE visit    │ redirect table │ 308, never /scanner, never /door
        │                              │             └───────┬────────┘
        │                              │                     ▼
        │                              │            updateSession()
        │                              │              resolveRoute(pathname)
        │                              │                     │
        │                              │        ┌────────────┴─────────────┐
        │                              │        │ door.operate entry       │
        │                              │        │ routes: /admin/scanner   │
        │                              │        │         /door   ← NEW    │
        │                              │        │ assignmentOpenable: true │
        │                              │        └────────────┬─────────────┘
        │                              │            role OR live assignment
        │                              │                     ▼
        │                              │            (admin)/door/page.tsx
        │                              │            (admin)/admin/scanner/page.tsx
        │                              │                  both render
        │                              │                     ▼
        │                              │              ┌─────────────┐
        │                              └─────────────▶│ DoorSurface │ guard: door.operate
        │                                             │             │  by role OR assignment
        │                                             └──────┬──────┘
        ▼                                                    ▼
  MobileNav (client)                             ScannerClient  ── camera ──▶ verdict
   getVisibleNavItems(capabilities)                    │                       (local, no network)
   Check-in ▶ /door                                    │
                                                       ├── IndexedDB (src/lib/offline/) ◀ the ONLY door state
                                                       └── POST /api/tickets/checkin
                                                             │
                                                       NetworkOnly (sw.ts) ── matched by PATHNAME,
                                                             │                  address-independent
                                                             ▼
                                                    requireDoorOperator({ partyId })
                                                    service client · no RLS · THE boundary
```

### Recommended file layout

```
src/app/(admin)/
├── door/
│   └── page.tsx                     # NEW — thin, renders <DoorSurface/>. Serves /door.
└── admin/
    ├── (work)/                      # untouched — its layout must NOT reach the door
    └── scanner/
        ├── page.tsx                 # thin, renders <DoorSurface/>. Serves /admin/scanner.
        ├── DoorSurface.tsx          # NEW — the guard + ScannerClient + MobileNav
        └── ScannerClient.tsx        # ~3450 lines. UNTOUCHED except MobileNav props.
```

### Pattern: a second address is a second row in the same entry, never a second predicate

```ts
// src/lib/routes/capability-routes.ts
[CAP.DOOR_OPERATE]: {
  routes: ["/admin/scanner", "/door"],   // one entry, two addresses
  assignmentOpenable: true,              // a property of the ENTRY, unchanged
  alsoGatesTables: true,
},
```
Both addresses inherit `assignmentOpenable` from the entry, which is what keeps the person
rostered to the door admitted at either one. A second entry, or a second key, would be the
"second predicate" `39-CONTEXT.md` explicitly forbids.

### Pattern: a declared address verified against the map, with a named throw

```ts
// the staff-tabs.ts:130-148 shape, applied to the door's nav href
const DOOR_HREF: Route = "/door";
{
  const r = resolveRoute(DOOR_HREF);
  if (r === null || r.key !== CAP.DOOR_OPERATE) {
    throw new Error(
      `roles: the Check-in entry points at "${DOOR_HREF}", which CAPABILITY_ROUTES ` +
      `binds to ${r === null ? "nothing" : `"${r.key}"`}. The map is the source.`
    );
  }
}
```
This module is imported by `MobileNav`, a `"use client"` component, and is evaluated
during `next build` while pages are prerendered — so the throw is a **build** failure, not
a first-request one. Its whole transitive closure (`keys.ts` → nothing;
`capability-routes.ts` → `keys.ts` + `next`) has no server-reaching edge, which is D-34-10
and must not be broken.

### Anti-patterns to avoid

- **A redirect from one address to the other.** D-39-02, and §A.0 gives the mechanical
  reason.
- **`routes[0]`.** Reintroduces the silent-first-address bug the tuple was built to stop.
- **A layout anywhere near the door.**
- **A broadened Cache Storage rule to "fix" offline.** Landmine 5.
- **Adding the door to `staff-tabs.ts`.** It is drawn by the bottom nav, and the door's
  page does not mount the tab bar (`staff-tabs.ts:59-63`).
- **Touching `reloadOnOnline`, `ScannerClient`'s logic, the IndexedDB store, the channel,
  or the freshness display.** All settled by Phase 38 and out of scope.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Serving one page at two addresses | a redirect, a client-side `router.replace`, a `<meta refresh>` | two thin `page.tsx` sharing a server component | D-39-02; and every alternative costs the round trip the door may not have |
| Knowing which capability opens an address | a second predicate, a prefix rule, a `startsWith` | the existing `resolveRoute` | three prefix rules already disagreed once and it is a recorded defect (`capability-routes.ts:5-11`) |
| Asserting the map matches the disk | a new script | `npm run verify:routes` + the file placement in §B.6 | it exists, it censuses pages, and it is the third link of the CAP-02 chain |
| Making a nav entry match the server | duplicating the role/status logic | the capability set already resolved by `getAccessContext()` | `keys.ts` imports nothing, which is what makes one filter usable on both sides |
| Precaching a dynamic route's document | a custom install-time `fetch` + `cache.put` in `sw.ts` | nothing — or an explicit runtime rule as an owner decision | an install-time fetch of an authenticated dynamic page would cache **one account's rendered door** and hand it to whoever opens the app next. This is the single most dangerous "obvious fix" available in this phase |
| Proving offline behaviour | reasoning about it | a person, two phones, a dark room | C1 |

**Key insight:** everything hard in this phase is already solved *somewhere in this
repository*, by a mechanism written in a previous phase with its reason attached. The
failure mode is not missing infrastructure — it is a plan that reaches for a new mechanism
because it did not read the docblock of the old one.

---

## Runtime State Inventory

The phase is a rename/move in the sense that matters: after every file in the repo is
correct, what still has the old address cached, stored or registered?

| Category | Items found | Action required |
|---|---|---|
| **Stored data** | **One row of prose.** `private.capabilities.description` for `door.operate` reads *"The middleware rule for /admin/scanner (src/lib/supabase/middleware.ts:82-83)…"* (`supabase/migrations/20260807000000_capability_model.sql:378`); the `admin.access` row names *"/admin/\* other than the scanner"* (`:370`). Both are **already stale** — the middleware rules they describe were replaced in Phase 34. `scripts/verify-capabilities.mjs` does **not** compare descriptions (grepped: one incidental mention at `:271`), so nothing breaks either way. No table stores the door's URL as a value. | **Optional** forward migration updating the two description strings, or an explicit sentence in the plan saying they are left as provenance prose. Not a blocker. |
| **Live service config** | **None.** `vercel.json` contains four cron paths, all `/api/cron/*`, none naming the door. `next.config.ts` has four redirect rows, none naming the door. No dashboard-held routing rule exists for this project. | none |
| **OS-registered state** | **This is the real one.** (a) The **installed service worker and its Cache Storage buckets** on every device that has opened the app — `pages`, `pages-rsc`, `pages-rsc-prefetch`, `others`, `apis`, `precache-v2`, and the runtime buckets from `defaultCache`. `cleanupOutdatedCaches: true` prunes stale **precache** versions; it does not touch runtime buckets. (b) The **home-screen shortcut** on the staff phone, which encodes `start_url: "/"` — unchanged by this phase, since `start_url` does not move (D-39-04). | (a) Landmine 1's mitigation, and §0.4 + §8.8 of the door pass. (b) nothing — but the procedure must confirm the launch target is still `/` after the deploy rather than assume it. |
| **Secrets / env vars** | **None.** No environment variable names or references the door's address. `TICKET_SIGNING_SECRET`, `CRON_SECRET`, `RESEND_FROM_EMAIL`, the Supabase keys — none are address-derived. | none |
| **Build artefacts** | `public/sw.js`, `public/sw.js.map` and `public/swe-worker-*.js` are **generated and gitignored** (`.gitignore:40-45`). The manifest measured in §C.1 is a **local** build artefact of 2026-08-11 13:44, not the deployed one. `.next/` likewise. | Re-measure the precache against the **deployed** worker before drawing any conclusion about production; the composition (chunks + `public/`, no documents) is determined by the plugin and is stable, but the entry count is not. |

**Nothing found in a category is stated as such above.** Two categories are genuinely
empty; one contains only stale prose; one contains the single hardest thing in the phase.

---

## Common Pitfalls

### Pitfall 1: measuring the new worker and reading the old one's caches
**What goes wrong:** an offline observation succeeds (or fails) for reasons that belong to
a build that is no longer running.
**Why:** `skipWaiting`/`clientsClaim` replace the worker, not the buckets (`sw.ts:100-108`).
**Avoid:** first measurement in a private window, or unregister-and-reload; record the
active worker's script URL.
**Warning sign:** a cache entry whose response body references a build id different from
the one on the page.

### Pitfall 2: concluding "offline works" from the address that was just used online
**What goes wrong:** the tester opens `/door` online to check the move, then goes offline
and finds it works — and reports the door offline-reachable.
**Why:** the online check **warmed the cache entry** the offline check then reads.
**Avoid:** §8.8 — the cold address is tested last, and "cold" means never opened on that
device since the deploy.

### Pitfall 3: a build error read as an obstacle rather than as the message it is
**What goes wrong:** the `roles.ts` tuple error is "fixed" by widening the type.
**Why:** it looks like a compiler complaint; it is a Phase-34 decision speaking.
**Avoid:** §B.4. The docblock above the line says what to do.
**Warning sign:** a diff that changes `readonly [Route]` and nothing else.

### Pitfall 4: assuming `next build` covers the new address
**What goes wrong:** an unbound `/door` ships, the middleware falls through, and the page
guard becomes the only refusal — with no `?access=` cause and no build error.
**Why:** `_everyStaffRouteIsBound` only sees `/admin*`; `isUnderWorkTree` only fails closed
on a first segment of `admin` (§B.6).
**Avoid:** the file placement in §A.4 plus the second module-load assertion in §B.2.

### Pitfall 5: closing D-39-06 on the nav and calling the divergence closed
**What goes wrong:** the pending-organizer half closes, the assignment half is left, and
nobody records which.
**Why:** `capabilities` and `liveAssignmentCapabilities` are two fields, and the server
reads both (§E.3).
**Avoid:** the plan states which of the two it passes, and what remains open if it passes
one.

### Pitfall 6: a procedure written after the observation
**What goes wrong:** the door pass is drafted the morning after and reads as a description.
**Why:** it is the failure `38-PROCEDURES.md` opens by naming.
**Avoid:** the door pass document is a **wave-1 deliverable** of this phase, written before
the code, with every `Result` empty and reading `pending`.

---

## Code Examples

### The map edit — the whole authorisation change
```ts
// src/lib/routes/capability-routes.ts:213
[CAP.DOOR_OPERATE]: {
  routes: ["/admin/scanner", "/door"],
  assignmentOpenable: true,
  alsoGatesTables: true,
},
```

### The second module-load assertion, mirroring the first
```ts
// src/lib/supabase/middleware.ts — beside the existing DOOR_ADDRESS block
const DOOR_ADDRESSES = ["/admin/scanner", "/door"] as const;
for (const address of DOOR_ADDRESSES) {
  const b = resolveRoute(address);
  if (b === null || b.key !== CAP.DOOR_OPERATE) {
    throw new Error(
      `middleware: "${address}" resolves to ${b === null ? "no capability at all" : `"${b.key}"`}, ` +
      `not "${CAP.DOOR_OPERATE}". Fix the binding in src/lib/routes/capability-routes.ts.`
    );
  }
  if (!b.assignmentOpenable) {
    throw new Error(
      `middleware: "${address}" is bound to "${CAP.DOOR_OPERATE}" but is not ` +
      `assignment-openable — without this flag the middleware refuses the person ` +
      `rostered to work the door.`
    );
  }
}
```

### The unauthenticated bounce
```ts
// src/lib/supabase/middleware.ts:454
const protectedPrefixes = ["/dashboard", "/membership-card", "/attendance", "/admin", "/door"];
```

### The thin page
```tsx
// src/app/(admin)/door/page.tsx
import DoorSurface from "@/app/(admin)/admin/scanner/DoorSurface";

/**
 * `/door` — the door's permanent address (D-39-01). `/admin/scanner` serves the
 * same surface, permanently and as a real page, never as a redirect (D-39-02):
 * a redirect needs a network the door is designed not to have.
 *
 * Both addresses are opened by ONE entry in `capability-routes.ts`, and the
 * guard lives in `DoorSurface` so the two pages have nothing in them to diverge.
 * The file sits under `(admin)` — which contributes no URL segment — so that
 * `npm run verify:routes` censuses it. Outside that group nothing would.
 */
export default function DoorPage() {
  return <DoorSurface />;
}
```

### The nav item after D-39-06
```ts
// src/lib/rbac/roles.ts — the Check-in entry
{
  href: DOOR_HREF,                     // "/door", verified against the map
  label: "Check-in",
  icon: "qrcode",
  capability: CAP.DOOR_OPERATE,        // replaces roles + requireApproved
  requireAuth: true,
  hideWhenAuth: false,
}
```

---

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|---|---|---|---|
| Prefix rules in the middleware deciding `/admin/*` | one declaration in `capability-routes.ts`, read by five modules | Phase 34 | the second address goes in the entry, never beside it |
| Every work page mounting its own navs | `admin/(work)/layout.tsx` | plan 34-05 | the door is already structurally separate; keep it that way |
| `middleware.ts` file convention | deprecated in Next 16 in favour of `proxy.ts` | next@16.0.0 | **out of scope**, its own plan after Phase 39 |
| `@ducanh2912/next-pwa` | `@serwist/next` | before v1.4 | `.planning/codebase/CONCERNS.md` is stale on this point; do not cite it |

**Deprecated/outdated in this repository's own documents:**
- `roles.ts:120` and `(work)/layout.tsx:65` say `MobileNav` is mounted on **44 pages**.
  Measured today: **13**. Correct in passing.
- `scanner/page.tsx:74` and `types/database.ts:762` describe a `StaffNav` prop shape plan
  34-04 changed. Assigned to this phase (`34-VERIFICATION.md:431`).

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node + npm | `npm run build`, the four verify scripts | ✓ | repo's own toolchain | — |
| `tsc` (via `next build --webpack`) | the only automated gate for the product | ✓ | `typescript ^5`, exercised in §B.4 | — |
| `npm run verify:routes` | map ↔ disk census | ✓ | script present, zero deps | — |
| `npm run verify:persona` | 7 persona checks incl. A, B, G | ✓ | script present, zero deps | — |
| `npm run verify:capabilities` | database ↔ `CAP` | ✓ **but needs a live database** | — | skip with the omission stated; it is unrelated to this phase's change |
| Desktop Chrome DevTools (Application, Network, request blocking, throttling) | every §C observation, P1, P4 | ✓ (CDP on :9222 is configured for this machine) | — | none — these readings have no substitute |
| **Two devices, one of them the actual staff phone with the app installed** | criterion 2, criterion 3, P3, P5 | **✗ at planning time** | — | **none.** Deferred to the end-of-v1.5 sitting (D-39-07) |
| **Two accounts each holding `door.operate` for one night** | P5, P7, §1.5 | **✗ at planning time** | — | **none** — batched with the 32 open `human_needed` items |
| A fresh production-write authorisation | P6 only | **✗** | — | **none.** P6 stays out of this phase's door pass |

**Missing with no fallback:** the devices, the accounts, the dark room. This is not a
gap to close in planning — it is the phase's declared shape (D-39-07), and it means
**Phase 39 does not close before that sitting**, exactly like Phase 38.

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json`, so this section is
included. It is written for a repository with **no test runner** (C1): the sampling points
are `npm run build`, source assertions at named `file:line`, DevTools readings, and a
person in a dark room. **No test file is proposed, and none should be.**

### "Test framework"

| Property | Value |
|---|---|
| Framework | **none for the product.** No `test` script; no `*.test.*` / `*.spec.*` on this tree |
| Config file | none — and no Wave 0 task should create one |
| Quick run | `npm run build` (carries the Next typecheck) |
| Full suite | `npm run build && npm run verify:routes && npm run verify:persona` — plus `npm run verify:capabilities` where a database is reachable |

### Success criteria → sampling point

| Criterion | Behaviour | Sampling point | Automated? | Closes it? |
|---|---|---|---|---|
| **1** — one permanent address, no redirect, no round trip | `/door` and `/admin/scanner` both render the door | `npm run build` green with the two-route entry; `npm run verify:routes` check 2 green with the new page censused; source assertion that neither page contains `redirect(` for the other; **DevTools → Network: both requests return 200, neither 3xx** | build/scripts: **yes**. The 3xx observation: **no** | build + scripts prove the wiring; **§1.3 of the door pass proves the absence of a redirect** |
| **1** (cont.) — the map gates both by one entry | `resolveRoute` returns `door.operate`, `assignmentOpenable`, for both | the module-load assertion in §B.2 fires on the first request; `npm run build` green after the `roles.ts` change | **partly** — the assertion is a **first-request** throw, not a build one (`middleware.ts:152-160`) | landmine 4's deploy rule is the mitigation, not a test |
| **2** — a device that installed the door still opens a working door after the move, from the home screen, radio off | see §C.6 | **DevTools → Application → Cache Storage:** which bucket holds a document for each address, and its age. **DevTools → Application → Manifest:** `start_url`, `display`, no `scope`. Then **the phone**: §8.2–§8.4 and §8.8 | **no.** Nothing in this repository can hold a phone | **only §8 of the door pass closes it.** Every other reading is a precondition |
| **3** — the full door pass executed on a device and written down | dark room, radio off, launch, scan, reconnect, sync | **the person.** §8 of `39-DOOR-PASS.md`, with wall-clock times and verbatim observations | **no, by definition** | **§8, and nothing before it** |
| **D-39-06** — the inherited nav item | a `pending` organizer is drawn the Check-in entry | `npm run build` green after the signature change (13 call sites); source assertion that the server-side guard in `DoorSurface` is unchanged | build: **yes**. The drawn entry: **no** | **§1.5 of the door pass** |
| **The non-regressions** | `/events/**` still `NetworkOnly`; four API rules unchanged; `reloadOnOnline` still `false`; no new `layout.tsx`; IndexedDB untouched | source assertions: `grep` on `sw.ts`, `next.config.ts`, and `find "src/app/(admin)" -name layout.tsx` | **yes** | fully closed by the assertions |

### Sampling rate

- **Per task commit:** `npm run build`.
- **Per wave merge:** `npm run build && npm run verify:routes && npm run verify:persona`.
- **Phase gate:** all three green, **plus** `39-DOOR-PASS.md` written with every `Result`
  empty and reading `pending` — and the phase does **not** close until that document is
  filled in from the sitting.

### Wave 0 gaps

- [ ] `39-DOOR-PASS.md` — written **before** the code (F.6's rule), all Results `pending`
- [ ] the pointer block added to `38-PROCEDURES.md` head, in the same commit
- [ ] a `## Non-regression assertions` block in each plan, naming the exact `grep`/`find`
      commands for the six non-regressions above

*(No test file, no framework install, no fixtures. Proposing any would contradict C1.)*

### Where a criterion can only be closed by a human in a dark room — stated plainly

**Criteria 2 and 3, and the drawn nav entry.** No build, no script and no static reading
can show that a phone with its radio off opened a working door. `checkin-offline.md` says
it in its own words — *"Un aggiornamento del service worker, una sessione scaduta o un
permesso fotocamera negato si scoprono in cinque minuti a casa o in dieci minuti davanti a
una fila"* — and this phase changes exactly the first of those three.

---

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json`, so this section is
included.

### Applicable ASVS categories

| ASVS category | Applies | Standard control on this tree |
|---|---|---|
| **V2 Authentication** | yes, indirectly | Supabase auth via `@supabase/ssr`; unchanged. §B.7's `protectedPrefixes` gap is the only authentication-adjacent edit |
| **V3 Session Management** | no change | cookie-bound sessions; `getAccessContext()` `cache()`-scoped per request |
| **V4 Access Control** | **yes — the core of the phase** | `capability-routes.ts` for reachability, the page guard for the surface, `require-operator.ts` + RLS for the data. **The middleware is UX; the RLS is the boundary** (C7) |
| **V5 Input Validation** | no new input | the phase adds no parameter, no form and no query string |
| **V6 Cryptography** | untouched | `TICKET_SIGNING_SECRET`; note the standing repo defect `src/utils/qr.ts:49` uses `Math.random()` — **pre-existing, out of scope, do not "fix in passing"** |
| **V7 Error handling & logging** | **yes** | C9: no error tracking. A refusal must be observable — hence the `?access=` causes the middleware already emits, and hence the second module-load assertion |

### Known threat patterns for this change

| Pattern | STRIDE | Mitigation on this tree |
|---|---|---|
| A new address reachable without a capability check (unmapped `/door` falling through) | Elevation of Privilege | the map row + the second module-load assertion + the page guard mounted on **both** pages via `DoorSurface` (§B.6) |
| A drawn nav entry the server refuses | Spoofing (of entitlement) | `getVisibleNavItems` filters on the **same keys** the server refuses on; `keys.ts` imports nothing, which is what makes one filter serve both sides |
| An authenticated dynamic page cached and served to a different account | Information Disclosure | **do not precache the door.** The `defaultCache` `pages`/`others` buckets are per-URL and per-device, not shared — but an install-time `cache.put` of a rendered door would be. Named in §Don't Hand-Roll as the phase's most dangerous obvious fix |
| A venue address at rest in Cache Storage on a handed-over staff phone | Information Disclosure, **irreversible** | the `/events/**` `NetworkOnly` rule (`sw.ts:110-113`), T-37-27 ACCEPT. **Landmine 5.** Monotone (C8): may only get harder to trip |
| A redirect cached permanently against the door's address | Denial of Service at the door | `organizer-redirects.ts` fence 1, strengthened per §B.5 to follow the map rather than the string `/scanner` |
| The map assertion 500-ing every route on the first request after deploy | Denial of Service | landmine 4: deploy on a day with no night, make the first request yourself |
| A signed-out staff phone bounced to the dashboard instead of the door | availability at the door — the asymmetry `checkin-offline.md` names | §B.7 |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| **A1** | The `defaultCache` `pages` matcher — `request.headers.get("Content-Type")?.includes("text/html")` — does or does not fire for a browser **navigation** request, which normally carries `Accept` but not `Content-Type`. If it does not, navigation documents land in the `others` bucket while `cacheOnNavigation`'s worker writes to `pages`, and entries could be **written to a bucket nothing reads**. | §C.5 | The offline chain in §C.6 could be weaker than described. Both buckets are `NetworkFirst`/24 h/32 entries, so the *class* of behaviour is the same either way, but the arithmetic of "which visit warms which address" changes. **Settled by one DevTools reading — see Open Question 2.** |
| **A2** | With `rewrites()`, the middleware sees `/door` (afterFiles) rather than `/admin/scanner`. | §A.3 | Only matters if `rewrites()` is chosen, which is not the recommendation. **Open Question 1.** |
| **A3** | iOS Safari's standalone mode keeps same-origin navigations inside the installed window regardless of `scope`. | §D.2 | Low — `scope` defaults to `/` anyway, so `/door` is in scope under either reading. |
| **A4** | The measured precache (127 entries) is representative of the deployed worker. The **composition** is determined by the plugin and is stable; the **count** is not. | §C.1 | A plan quoting "127" as a production figure would be quoting a local build. Quote the composition, re-measure the count. |
| **A5** | `next build --webpack` remains the build command. Serwist's `injectManifest` is a webpack plugin; a Turbopack build would produce a worker with no precache. | §Standard Stack | Severe if flipped, but nothing in this phase has a reason to flip it. |

---

## Open Questions (RESOLVED)

> All four carry a disposition, and each disposition is threaded into the plans. Recorded
> here on 2026-08-11 during plan-phase, so that a mechanical scan does not read this phase
> as carrying open research. **Resolved does not mean answered** — OQ3 is resolved *as a
> deferral*, which is a decision with a named route back.

1. **Does the middleware see `/door` or `/admin/scanner` under a `rewrites()` mechanism?**
   **RESOLVED — moot.** `rewrites()` was rejected (§A); the recommended mechanism is two
   thin pages over one component, so the question does not arise. Plan `39-02` asserts it
   mechanically: `grep -c 'rewrites' next.config.ts` = 0.
   - **Known:** rewrites are applied to client-side routing and mask the destination
     [CITED: nextjs.org rewrites]; a default-array rewrite is checked after the filesystem.
   - **Unclear:** where `src/middleware.ts` sits in that order on next@16.1.6 — the docs
     page that lists the order did not extract cleanly and I did not want to answer it from
     training data.
   - **Recommendation:** **the question does not arise under the recommended mechanism.**
     If a planner nonetheless wants `rewrites()`, settle it in one minute: add a
     temporary `console.log(pathname)` in `updateSession`, `npm run dev`, request `/door`,
     read the value. Do not ship a rewrite without that reading.

2. **Which Cache Storage bucket actually holds a navigation document for the door?**
   **RESOLVED — operationalised, not answered here.** It is a DevTools reading and it lives
   in `39-DOOR-PASS.md` §0.5, as a precondition of interpreting §8. It is deliberately not
   a plan's verification step, because it needs a browser.
   - **Known:** four candidate buckets and their exact handlers (§C.5); the
     `cacheOnNavigation` worker writes explicitly to `pages`.
   - **Unclear:** A1 above.
   - **Recommendation:** a five-minute reading, and it belongs in **§0** of the door pass
     rather than in a plan's verification: online, open the door at both addresses;
     DevTools → Application → Cache Storage; record which bucket holds a document keyed on
     each address and what the response body is. Then go offline and reload. The reading is
     cheap, it is a precondition of interpreting §8, and it needs a browser — which is why
     it is a procedure step and not a task.

3. **Should the door get an explicit runtime cache rule with a longer life than 24 hours?**
   **RESOLVED — the owner answered `no` on 2026-08-11**, ahead of the dark-room sitting
   rather than after it. The 24-hour window stands as a **chosen ceiling**, not an
   inherited default, and no code changes: the phase ships with the existing runtime rules
   plus the warm-up step, which is what was planned.

   **The consequence, accepted rather than discovered:** the warm-up (§0.5 of the door
   pass) is **not** a migration step that expires with this phase — it is a cost of every
   night. A phone that has not opened the door online at *its* address within the window
   has no document to serve when the radio goes off. Written into
   `.claude/rules/checkin-offline.md`, gate *l'indirizzo che si scalda e' quello che si
   usera'*, so it loads on the door rather than living only here.

   **One half of the question is still a reading, not a decision.** The 32-entry LRU cap
   shares its bucket with other navigations, so a door document can be evicted *inside* the
   window as well as expire at the end of it. Which bucket, and therefore what it competes
   with, is Open Question 2 / Assumption A1 — still a DevTools reading in §0.5. The owner's
   `no` settles the **duration**; it does not settle the **eviction**, and nobody should
   read it as having done so.
   - **Known:** `pages`/`others` expire at 24 h with a 32-entry LRU (§C.5); the runbook
     gate already demands a same-day test (C12).
   - **Unclear:** whether the owner wants a door document served from a cache older than a
     day — which is *serving a stale door*, and the door's own gate says a stale surface
     is a hazard.
   - **Recommendation:** **do not decide this in a plan.** Ship the phase with the existing
     runtime rules and the warm-up step, observe §8 in the dark room, and bring the
     question back to `/gsd:discuss-phase` with a real observation attached. A cache
     lifetime for the door is a product decision about how old a door may be.

4. **Does D-39-07's list include `38-HUMAN-UAT` test 8?**
   **RESOLVED — folded in, visibly.** Test 8 is `39-DOOR-PASS.md` §8.6, marked so that one
   line removes it if the owner disagrees. Same room, same minute; leaving it out would
   force the second trip D-39-07 exists to avoid.
   - **Known:** seven items are pending; D-39-07 enumerates six; STATE.md says seven; test
     8 has no P number and is a dark-room, one-handed, minimum-brightness observation.
   - **Recommendation:** fold it in, and **say so in the plan** rather than silently. It is
     the same room and the same minute, and leaving it out would require a second trip —
     the exact cost D-39-07 exists to avoid. If the owner disagrees, it is one line to
     remove.

---

## Sources

### Primary (HIGH confidence) — measured on this tree, 2026-08-11

- `package.json`, `next.config.ts`, `public/manifest.json`, `vercel.json`, `.gitignore`
- `src/lib/routes/capability-routes.ts` (full), `src/lib/supabase/middleware.ts` (full),
  `src/middleware.ts` (full), `src/lib/rbac/roles.ts` (full),
  `src/components/layout/MobileNav.tsx` (full), `src/app/sw.ts` (full),
  `src/app/(admin)/admin/scanner/page.tsx` (full),
  `src/app/(admin)/admin/(work)/layout.tsx` (full),
  `src/lib/routes/staff-tabs.ts`, `src/lib/routes/organizer-redirects.ts`,
  `src/lib/capabilities/server.ts`, `src/app/page.tsx`
- `scripts/verify-routes.mjs` (full), `scripts/verify-persona.mjs` (full)
- `node_modules/next/dist/server/lib/router-utils/typegen.js:32-33,60-67,180-186` —
  redirect **and rewrite** sources enter the typed-route union
- `node_modules/@serwist/next/dist/index.js:192,227-249` — manifest = webpack assets + `public/` glob
- `node_modules/@serwist/next/dist/index.worker.js` — the full `defaultCache` list and its
  cache names, strategies and expiries
- `node_modules/@serwist/next/dist/sw-entry.js:16-38` and `sw-entry-worker.js:1-27` — `cacheOnNavigation`
- Built artefacts: `public/sw.js` (127 precache entries enumerated),
  `.next/prerender-manifest.json` (6 prerendered routes),
  `.next/types/link.d.ts` (the typed-route union), `.next/app-path-routes-manifest.json`
- Executed: `node_modules/.bin/tsc --noEmit --strict` on the tuple shape → `TS2322`
- `supabase/migrations/20260807000000_capability_model.sql:370,378`
- `.planning/phases/38-live-attendance-freshness/38-HUMAN-UAT.md`, `38-PROCEDURES.md`
- `.planning/phases/34-one-work-surface/34-04-SUMMARY.md:197`, `34-VERIFICATION.md:431`
- `.planning/STATE.md ## Blockers`, `.planning/REQUIREMENTS.md:80,235`
- `CLAUDE.md`; `.claude/rules/` — `meta-gates.md`, `checkin-offline.md`,
  `nextjs-architecture.md`, `access-gating.md`, `supabase-data.md`

### Secondary (MEDIUM–HIGH confidence) — official documentation

- nextjs.org/docs/app/api-reference/config/next-config-js/rewrites — rewrites mask the
  destination and apply to client-side routing *(docs served for 16.3.0; the project is on
  16.1.6, so every framework claim above was **re-verified against `node_modules` on this
  tree**)*
- developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope —
  the default-scope rule
- serwist.pages.dev/docs/serwist/core/serwist — `precacheOptions.navigateFallback`,
  `fallbacks`, `navigationPreload`

*(Fetched via the Firecrawl Cloud API, per the crawling priority chain.)*

### Tertiary (LOW confidence) — none

No claim in this document rests on an unverified web search. Where I could not verify, I
said so: Open Questions 1 and 2, Assumptions A1–A2.

---

## Metadata

**Confidence breakdown**

| Area | Level | Reason |
|---|---|---|
| The map, its five readers, the tuple tripwire | **HIGH** | every file read in full; the tripwire proved by running the repository's own compiler |
| Mechanism comparison and recommendation | **HIGH** | the disqualifying facts for `rewrites()` are properties of scripts and types in this repo, not opinions |
| Precache composition and the absence of documents | **HIGH** | measured against the built worker **and** confirmed against the plugin source |
| Which cache bucket serves an offline navigation | **MEDIUM** | Assumption A1 / Open Question 2. The *class* of behaviour (NetworkFirst, 24 h, 32 entries, warm only from a prior online visit) is HIGH; the bucket name is not |
| The manifest and scope | **HIGH** | file read + MDN's default-scope rule |
| The nav change and its 13 call sites | **HIGH** | enumerated by grep and read |
| The door pass structure | **MEDIUM–HIGH** | the inventory and the mappings are measured; the ordering is a proposal, and the owner may reorder it |
| Landmines | **HIGH** for 1–8 and 10 (each names a file and a mechanism), **MEDIUM** for 9 (a judgement about comment rot) |

**Research date:** 2026-08-11
**Valid until:** ~2026-09-10 for the framework claims; **until the next `npm install` or
Next upgrade** for the `node_modules` measurements; **until the next deploy** for the
precache figures.
