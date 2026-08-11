---
phase: 39-the-door-s-own-address
plan: 02
subsystem: access
tags: [door, routing, capability-map, middleware, offline, staff-04]

# Dependency graph
requires:
  - phase: 34-one-work-surface
    provides: the capability map, its resolver, the middleware's module-load door assertion, the one-element tuple tripwire in `roles.ts`, and the redirect table's door fence
  - phase: 38-live-attendance-freshness
    provides: the door's behaviour, untouched by this plan
  - phase: 39-the-door-s-own-address
    plan: 01
    provides: 39-DOOR-PASS.md §0.6, the deploy precondition this plan's middleware assertion creates
provides:
  - "`/door` — the door's permanent address, a real page under `(admin)` so the disk census sees it"
  - "`/admin/scanner` kept permanently as a real page, never a redirect"
  - "`DoorSurface.tsx` — the guard written once and mounted twice"
  - "one `door.operate` entry listing both addresses, `assignmentOpenable` intact"
  - "`roles.ts`'s arity tripwire spent and replaced by a meaning guard with two named throws"
  - "a module-load assertion in the middleware over BOTH addresses, each message naming its own"
  - "`/door` in `protectedPrefixes`"
  - "a redirect fence that reads the map instead of matching the string `/scanner`"
affects: [39-03, 39-04, phase-39-verification, end-of-v1.5 sitting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two thin pages sharing one server component — one address is a file, not a redirect"
    - "A second address is a second row in the SAME map entry, never a second predicate"
    - "A declared address verified against the map with two distinct named throws (the staff-tabs shape)"
    - "An arity guard is SPENT when its phase arrives, and replaced by a meaning guard — never widened"

key-files:
  created:
    - src/app/(admin)/admin/scanner/DoorSurface.tsx
    - src/app/(admin)/door/page.tsx
  modified:
    - src/app/(admin)/admin/scanner/page.tsx
    - src/lib/routes/capability-routes.ts
    - src/lib/rbac/roles.ts
    - src/lib/supabase/middleware.ts
    - src/lib/routes/organizer-redirects.ts

key-decisions:
  - "The Phase-34 tuple tripwire is spent, not widened: `readonly [Route, Route]` would be a guard that no longer says anything true, and an index read at position zero reintroduces the silent `[0]` the original docblock existed to prevent"
  - "The nav draws `/door` deliberately — the canonical address, and the one whose runtime-cache entry gets warmed by every device that follows the nav (success criterion 2)"
  - "The `verify:redirects` walk was run against this build on a private port, because port 3000 was already occupied by a server this agent did not start and must not walk"
  - "No production credentials were placed in this worktree; the walk ran against placeholder Supabase env, which is sufficient because the redirect table answers before `updateSession` and the unauthenticated bounce needs no session"

patterns-established:
  - "The guard lives in the shared component so a future editor cannot add a check to one address and not the other — a structural mitigation, not a procedural one"
  - "A fence that protects an address reads the map, so the address is remembered in one place"

requirements-completed: []

# Metrics
duration: 25min
completed: 2026-08-11
---

# Phase 39 Plan 02: The Door's Own Address Summary

**`/door` exists as a real page and `/admin/scanner` still serves the same surface with
no redirect between them; one `door.operate` entry opens both, the middleware asserts both
at module load with each message naming its own address, `/door` is in `protectedPrefixes`,
and the redirect fence now asks the map instead of matching the string `/scanner`.**

## THE SHIPPING RULE — read this before deploying

The assertion in `src/lib/supabase/middleware.ts` is a `throw` at **module load inside a
middleware bundle**. It does **not** fire at `npm run build`. It fires on the **first
request after deploy**, and a wrong map is therefore a **500 on every route the middleware
covers**, discovered by whoever makes that first request.

There is no code fix for a first-request throw. The mitigation is a scheduling one and it
is stated as one, in the source comment and in `39-DOOR-PASS.md` §0.6:

> **Deploy on a day with no night scheduled, and make the first request yourself.**

Record the deploy time and the first-request time in §0.6 when it is done.

## Performance

- **Duration:** ~25 min
- **Tasks:** 3 of 3
- **Files:** 2 created, 5 modified — all under `src/`. Nothing under `supabase/`, `public/`, `.claude/` or `.planning/` except this summary.

## Accomplishments

- **The guard is written once and mounted twice.** `DoorSurface.tsx` holds the coarse
  `door.operate` predicate (role **or** live assignment, with the `null` refusing), the
  `redirect("/dashboard")` refusal, the `ScannerClient` mount and the `MobileNav` mount —
  moved verbatim, with the entire 79-line docblock intact and one paragraph appended. Both
  pages are three lines and have nothing in them to diverge.
- **`/door` exists and is bound in the commit that creates it.** The map's `door.operate`
  entry is now `routes: ["/admin/scanner", "/door"]` — **one** entry, two addresses, with
  `assignmentOpenable: true` and `alsoGatesTables: true` unchanged. `verify:routes` check 2
  went from **25 pages to 26**, and `grep -c 'DOOR_OPERATE'` in the map is **1 before and 1
  after**: no second predicate was created.
- **The Phase-34 tripwire was spent, not defeated.** `DOOR_BINDING` and its one-element
  tuple are gone; `const DOOR_HREF: Route = "/door"` is verified against the map at module
  load with **two** distinct throws — one for *no entry binds this address*, one for *the
  map binds it to a different key* — in the `staff-tabs.ts` shape. `grep -c 'DOOR_BINDING'`
  → 0, `grep -c 'readonly \[Route\]'` → 0, `grep -c 'routes\[0\]'` → 0.
- **Both addresses are asserted at module load.** `DOOR_ADDRESS` became
  `DOOR_ADDRESSES = ["/admin/scanner", "/door"] as const` and the two existing assertions
  run over it, **each message naming the address it is about** — because two doors exist and
  a failure at 02:00 saying only "the door" sends somebody to the wrong file.
- **`/door` is in `protectedPrefixes` — five entries.** This is the one omission that would
  have made the door *worse* than it is today (T-39-07). Observed on the wire: `/door`
  answers **307 → `/login?redirect=%2Fdoor`**, not a fall-through to the page guard and out
  to the dashboard.
- **The redirect fence follows the map.** `row.to.includes("/scanner")` is gone; every
  element of `CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes` is compared by **equality** against
  both sides of every row, and the throw names *which* door address matched. Fence 2 and the
  `/admin`-source check are untouched.
- **No `rewrites()`, no redirect, no layout, no new dependency.** `grep -c 'rewrites'
  next.config.ts` → 0; `grep -c 'redirect('` → 0 on both pages; the only layout under
  `(admin)` is still `admin/(work)/layout.tsx`; `package.json` and `package-lock.json` are
  byte-identical in the final diff.

## Task Commits

1. **Task 1: Extract `DoorSurface` — the guard written once** — `a1a1dd1` (refactor)
2. **Task 2: The second address, bound in the same commit that creates it** — `e39123d` (feat)
3. **Task 3: The assertion, the bounce and a fence that follows the map** — `f6971ee` (feat)

## Files Created/Modified

- `src/app/(admin)/admin/scanner/DoorSurface.tsx` — **created**, 130 lines. The door's
  server-side guard and both mounts. Non-route module, outside `(work)` by R-WORK-ROUTES, and
  deliberately still inside `scanner/` so `checkin-offline.md`'s glob keeps loading on it.
- `src/app/(admin)/door/page.tsx` — **created**, 25 lines. `/door`, the permanent address.
  Under `(admin)` so `verify:routes` censuses it; outside that group nothing would, the type
  assertion cannot see a non-`/admin` route, and `isUnderWorkTree` would not reach it either.
- `src/app/(admin)/admin/scanner/page.tsx` — reduced from 110 lines to 18. Kept permanently,
  as a real page, never a redirect.
- `src/lib/routes/capability-routes.ts` — the door's entry gains `/door`; the docblock
  reverses the spent Phase-34 sentence in place, records D-39-03 as a reading, and states why
  the resolver's ambiguity throw does not fire.
- `src/lib/rbac/roles.ts` — arity guard → meaning guard, with both lazy repairs refused in
  writing and the reason the throw is a **build** failure here (imported by `MobileNav`,
  evaluated during prerender) rather than a first-request one.
- `src/lib/supabase/middleware.ts` — `DOOR_ADDRESSES`, the loop, the deploy rule, and
  `/door` in `protectedPrefixes` with D7 named as pre-existing and unrepaired.
- `src/lib/routes/organizer-redirects.ts` — fence 1 reads the map.

## Verification performed

### Automated gates

| Gate | Command | Result |
|---|---|---|
| Typecheck + build | `npm run build` | **exit 0**; `✓ Compiled successfully`; both `ƒ /door` and `ƒ /admin/scanner` in the route table |
| Map ↔ disk | `npm run verify:routes` | **exit 0** — `pages found: 26` (25 before this plan), every page resolves |
| Redirect table | `bash scripts/verify-organizer-redirects.sh http://localhost:3100` | **PASS** — 15 rows, all 308 at their declared destination, the door not relocated |
| Persona coherence | `npm run verify:persona` | **7/7 verdi**, control A green (`57 glob su 1096 file`) |
| Capability model ↔ database | `npm run verify:capabilities` | **NOT RUN** — needs a live database, which this worktree has no credentials for. Unrelated to this plan's change: no key was added, removed or re-scoped. |

### Task acceptance criteria, measured

| Criterion | Expected | Got |
|---|---|---|
| `DoorSurface.tsx` length | ≥ 40 | **130** |
| Guard moved intact | `liveAssignmentCapabilities` ≥ 2 | **3** |
| Refusal target intact | `redirect("/dashboard")` = 1 | **1** |
| Guard left the page | `getAccessContext` in `scanner/page.tsx` = 0 | **0** |
| Page delegates | `DoorSurface` in `scanner/page.tsx` ≥ 1 | **3** |
| Page is thin | ≤ 30 lines | **18** |
| `/door` page is thin | ≤ 30 lines | **25** |
| One entry, two addresses | `"/admin/scanner", "/door"` in the map = 1 | **1** |
| No second predicate | `DOOR_OPERATE` count in the map, before → after | **1 → 1** |
| `assignmentOpenable` survived | 1 within 3 lines of the entry | **1** |
| Tripwire spent, not widened | `DOOR_BINDING` / `readonly [Route]` / `routes[0]` | **0 / 0 / 0** |
| Meaning guard, two throws | `resolveRoute(DOOR_HREF)` = 1, `throw new Error(` = 2 | **1 / 2** |
| Nav points at canonical | `const DOOR_HREF: Route = "/door"` = 1 | **1** |
| Nothing else beside the page | `find "src/app/(admin)/door" -type f` | **exactly `door/page.tsx`** |
| No rewrite mechanism | `rewrites` in `next.config.ts` = 0 | **0** |
| No redirect between the two | `redirect(` on either page = 0 | **0 / 0** |
| Both addresses asserted | `DOOR_ADDRESSES` ≥ 2, the pair string = 1 | **2 / 1** |
| Single-address constant gone | `const DOOR_ADDRESS =` = 0 | **0** |
| Both assertion arms survived | `assignmentOpenable` ≥ 2 | **6** |
| Bounce covers the door | `"/door"` in the block = 1, entries = 5 | **1 / 5** |
| Fence reads the map | `CAP.DOOR_OPERATE` ≥ 1, `includes("/scanner")` = 0 | **2 / 0** |
| Fence 2 intact | `startsWith("/admin")` = 1 | **1** |
| Deploy rule in the source | `first request after deploy` ≥ 1 | **1** |
| `src/middleware.ts`, `next.config.ts` untouched | absent from `git diff --name-only` | **both absent** |

### The eight non-regression assertions — run after every task, all three times

| # | Assertion | Expected | Got |
|---|---|---|---|
| 1 | `/events/**` still `NetworkOnly` (T-37-27, monotone, irreversible if loosened) | 1 | **1** |
| 2 | Four `NetworkOnly` API pathname rules, five handlers | 4 then 5 | **4 then 5** |
| 3 | `reloadOnOnline` still `false` | one line | **`next.config.ts:12  reloadOnOnline: false,`** |
| 4 | No new layout under `(admin)` | exactly `admin/(work)/layout.tsx` | **exactly that one** |
| 5 | No door state moved into Cache Storage | 0 | **0** |
| 6 | No rewrite mechanism, no routing table in `next.config.ts` | 0 | **0** |
| 7 | `sw.ts` not opened by this plan | 0 | **0** |
| 8 | `ScannerClient.tsx` and `src/lib/offline/` not opened | 0 | **0** |

### Observed on the wire — this build, private port, no production credentials

Port 3000 was already occupied by a server this agent did not start, so `npm run
verify:redirects` at its default base URL would have walked **somebody else's server**. The
same script was run against this build on port 3100 instead. The server was started with
**placeholder** Supabase values, never production ones — which is sufficient here because
the redirect table answers *before* `updateSession`, and the unauthenticated bounce needs no
session.

| Address | Observed | What it proves |
|---|---|---|
| 15 `/organizer/*` rows | 308 at each declared destination | the middleware bundle **instantiated without throwing** — so both new module-load fences (the `DOOR_ADDRESSES` loop and the map-reading fence 1) loaded clean, since either throw would 500 every row |
| `/admin/scanner` | **307 → `/login?redirect=%2Fadmin%2Fscanner`** | the old address still answers the access bounce and was **not relocated**; the walk's own door assertion passes |
| `/door` | **307 → `/login?redirect=%2Fdoor`** | `protectedPrefixes` covers the new address, and the destination carried is `/door` itself — not the dashboard. T-39-07 closed and observed. |

**Neither address answers a redirect to the other.** D-39-02 holds on the wire for the
unauthenticated case.

### Mutation proof — the guards were shown to fire, then reverted

The plan does not require this; it was run because a guard nobody has seen fire is
indistinguishable from a decoration. `/door` was removed from the map's `routes`, the
mutation was **asserted to have applied** (`grep -n` confirmed line 244 before reading any
result), then both checks were run and the file restored with `git checkout --`:

- `npm run verify:routes` → **FAIL — 1 page(s) reach no binding: `/door` (src/app/(admin)/door/page.tsx)`**
- `npm run build` → **`Error: roles: the Check-in entry points at "/door", which no entry of CAPABILITY_ROUTES binds. Bind the address in the map, or change the entry — a drawn entry with no server-side rule is a promise nothing keeps.`**

Both name the address and the failure. `git status` after the revert: clean.

### What none of this proves, stated plainly

- **That an entitled account renders the door at either address.** Every observation above
  is unauthenticated. The authenticated `200` at both addresses is `39-DOOR-PASS.md` §1.3, a
  person and a device.
- **That a phone with the radio off reaches a working door** (§8), or that the warm-up at
  both addresses behaves as §0.5 expects. Cache keys are request URLs; warming one address
  does not warm the other.
- **That the module-load assertion does not 500 the first request after deploy** (§0.6).
  The walk above ran against a *local* build with the correct map. It is evidence that the
  assertion does not fire on a **right** map; it is not evidence about deploy day.
- **The `/door` arm of the middleware assertion was not shown firing in isolation.** Any
  mutation that makes `/door` resolve wrongly also trips `roles.ts` at build time, so the
  build never gets far enough to serve. That redundancy is the design — three layers, of
  which the earliest one wins — and it is recorded rather than papered over.
- And the standing rule: **there is no test runner for this product.** Nothing here is
  verified because tests pass.

## Decisions Made

- **The tripwire is spent, not widened.** Written into `roles.ts` with both refused repairs
  and their reasons, so neither is proposed again.
- **The nav draws `/door`.** Canonical address, and the one whose runtime-cache entry every
  nav-following device warms — which is what success criterion 2 needs.
- **The walk ran on a private port with placeholder credentials.** Two reasons, both
  recorded: port 3000 held a foreign server, and copying production secrets into a git
  worktree in a project whose repository is public is a risk out of proportion to the
  marginal evidence.
- **Nothing was written to any database**, and no page was reached that could write one.

## Deviations from Plan

**One, and it is a plan-text impossibility rather than a scope change.**

**1. [Rule 3 — Blocking] `npm run verify:redirects` cannot mean what task 3's acceptance
criterion says in this worktree**

- **Found during:** Task 3 verification
- **Issue:** `npm run verify:redirects` walks a **live server at `http://localhost:3000`**.
  This worktree has no `.env.local`, and port 3000 was already occupied by a server this
  agent did not start — the first invocation returned 404 on all fifteen rows, i.e. it had
  walked a foreign process. Taking that as the plan's criterion would have meant either
  reporting a red that says nothing, or pointing production credentials at a scratch
  worktree.
- **Fix:** started **this build** on port 3100 with placeholder Supabase values and ran the
  same script against it — `bash scripts/verify-organizer-redirects.sh http://localhost:3100`
  → **PASS, 15 rows**. The script reads the table and the expected status out of the source
  module, so nothing about the check was weakened; only its base URL moved. The two extra
  observations (`/door` and `/admin/scanner`) were taken on the same server.
- **Files modified:** none — this is a verification-procedure deviation.
- **Verification:** the walk output is reproduced above, row by row.
- **Committed in:** n/a (no source change); recorded here and in `f6971ee`'s message.

**Everything else executed exactly as written.** No architectural change, no package
install, no checkpoint.

## Issues Encountered

- **`npm ci` was required** to make this worktree buildable; it is a setup step, not a
  dependency change. `package.json` and `package-lock.json` are **unchanged in the final
  diff** — confirmed by `git diff --stat` against the base commit, which lists seven files,
  all under `src/`.
- **`npm run verify:capabilities` not run** — no reachable database. Unrelated to this
  plan: no capability key was added, removed or re-scoped, and the migration's two stale
  `description` strings were deliberately left alone (the plan's own constraint; the
  verifier does not compare descriptions).

## Known Stubs

None. Every file this plan created is complete and reachable: `/door` renders, is censused,
is asserted at module load, is in `protectedPrefixes`, and is what the bottom nav draws.

## Threat Flags

None. This plan created **no** new network endpoint, no new auth path, no file-access
pattern and no schema change. The one new address is inside the existing trust boundary and
is bound to the existing `door.operate` entry by the same `resolveRoute` every other address
uses — which is T-39-01's own mitigation (a), (b) and (c), all three present.

`src/app/sw.ts` was not opened. The `/events/**` `NetworkOnly` rule is byte-identical, and
the plan's landmine 5 — *reaching for a broader page-caching rule to make the door work
offline* — was not taken.

## Next Phase Readiness

- **For plan 39-03 (D-39-06):** the door's page is now three lines and the guard is in
  `DoorSurface.tsx`. Giving `getVisibleNavItems` the capability set means changing
  `MobileNav`'s props, and the mount to edit is **in `DoorSurface.tsx`**, once — not in two
  pages. T-39-02 is transferred there intact: this plan points the Check-in entry at `/door`
  and verifies the address, but the entry's *visibility* still disagrees with the server for
  a `pending` organizer.
- **For plan 39-04:** the persona-routing repair is untouched by this plan. `CLAUDE.md` and
  `.claude/**` are absent from every commit here, and `verify:persona` is **7/7** on this
  tree — including control A, which the `DoorSurface.tsx` placement inside `scanner/` was
  chosen to keep green.
- **For whoever deploys:** the shipping rule at the top of this document. It is the whole of
  T-39-06's mitigation, and it is a scheduling one because there is no other kind.
- **The phase is *executed*, not *complete*.** Criteria 2 and 3 close at the end-of-v1.5
  sitting, when `39-DOOR-PASS.md` is filled in (D-39-07). Every `Result` in that document is
  still `pending`, and that is the honest state.
- **OQ3 remains deferred** with its return route: whether the door gets a runtime cache rule
  longer than 24 h goes back to `/gsd:discuss-phase` with the §8 reading attached. This plan
  added no cache rule at all.

## Self-Check: PASSED

All four named files exist on disk; all three task commits are in this branch's history
(`a1a1dd1`, `e39123d`, `f6971ee`). `STATE.md`, `ROADMAP.md`, `CLAUDE.md` and `.claude/**`
are absent from every commit of this plan — the orchestrator owns those writes.

---
*Phase: 39-the-door-s-own-address*
*Completed: 2026-08-11*
