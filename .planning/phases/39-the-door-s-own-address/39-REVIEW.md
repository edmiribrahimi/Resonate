---
phase: 39-the-door-s-own-address
reviewed: 2026-08-11T15:26:28Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - src/lib/routes/capability-routes.ts
  - src/lib/supabase/middleware.ts
  - src/lib/rbac/roles.ts
  - src/lib/routes/organizer-redirects.ts
  - src/app/(admin)/door/page.tsx
  - src/app/(admin)/admin/scanner/page.tsx
  - src/app/(admin)/admin/scanner/DoorSurface.tsx
  - src/components/layout/MobileNav.tsx
  - src/app/(admin)/admin/(work)/layout.tsx
  - src/app/page.tsx
  - src/app/(members)/dashboard/page.tsx
  - src/app/(members)/attendance/page.tsx
  - src/app/(members)/membership-card/page.tsx
  - src/app/(public)/events/page.tsx
  - src/app/(public)/events/[slug]/page.tsx
  - src/app/(public)/events/[slug]/menu/page.tsx
  - src/app/(public)/artists/[slug]/page.tsx
  - src/app/(public)/gallery/page.tsx
  - src/app/(public)/newsletter/page.tsx
  - src/app/(public)/tickets/[id]/page.tsx
  - src/types/database.ts
findings:
  critical: 0
  warning: 7
  info: 4
  total: 11
findings_resolved:
  warning: 7
  info: 0
findings_open:
  warning: 0
  info: 4
resolution:
  WR-01: fixed — 9f64e81 (compile-time type guard restored, proven by mutation)
  WR-02: fixed — 949ff15 (segment-boundary match; unreachable comparisons declared as type-guarded)
  WR-03: fixed — 00fcdd4 (WORK_TREE_ROOTS is a set; the second root is covered)
  WR-04: partially fixed — 00fcdd4 (DOOR_ADDRESSES derived from the map, no longer hand-copied). The blast radius of the module-load throw is UNCHANGED and is not a code problem — it is mitigated by the deploy rule in 39-DOOR-PASS.md §0.6.
  WR-05: fixed — 9f64e81 (the `rejected` row added to the outcomes table; the behaviour was already correct and agrees with the server)
  WR-06: closed by owner decision 2026-08-11 — asked whether the door deserves a runtime cache longer than 24 h, the answer is NO. The 24-hour window is now a chosen ceiling rather than an inherited default, no code changes, and the warm-up becomes a cost of every night instead of a migration step. Recorded in checkin-offline.md, 39-RESEARCH.md OQ3 and 39-DOOR-PASS.md §0.5. The EVICTION half (32-entry LRU, which bucket) is untouched by this and is still a dark-room reading — OQ2.
  WR-07: fixed — 00fcdd4 (staff-tabs.ts and organizer-redirects.ts no longer say the door has one address)
  IN-01 … IN-04: OPEN — informational, no behaviour at stake.
status: issues_found
resolved: 2026-08-11
---

# Phase 39: Code Review Report

**Reviewed:** 2026-08-11T15:26:28Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found — **all seven warnings resolved 2026-08-11; see `resolution:` in the frontmatter.**

> **Read the findings below as written at review time.** They are kept verbatim
> rather than edited in place, because a review rewritten after its fixes stops
> being evidence of what was found. WR-01, WR-02, WR-03, WR-05 and WR-07 are
> repaired in code and each repair is proven in its commit message; WR-04 is
> repaired in the part that was a code problem, the rest being a deploy rule.
>
> **WR-06 was not a code finding and was not fixed in code.** It asked whether
> the door should be served from a cache older than 24 hours. The owner answered
> **no** on 2026-08-11 — so the window stands, nothing changes in `sw.ts`, and
> the warm-up becomes a cost of every night rather than a step that expires with
> this phase. What the answer does **not** settle is the 32-entry eviction cap,
> which is a different question and is still a dark-room reading (OQ2).

## Summary

Reviewed against the diff `09fd5c0..HEAD -- src/`, not against the final files alone. The
phase adds `/door` as a second permanent address for the check-in surface, keeps
`/admin/scanner` as a real page, extracts the shared mount into `DoorSurface`, and switches
the Check-in navigation entry from a role list plus an approval flag to the `door.operate`
capability, threading two new props through 13 `MobileNav` mount sites.

**No Critical findings.** Nothing in this diff produces incorrect behaviour today, opens a
data path, or loses data. I looked for one and could not prove one — saying so plainly is
worth more than manufacturing a tier.

**What the findings are about instead is guard strength.** Three of the seven warnings are
the same shape: a check that used to be able to fire has been replaced by one that fires
later, fires wider, or cannot fire at all — each with a docblock asserting the replacement
is equivalent. In a repository with no test runner, no CI (D-34-12) and no error tracking,
the guards *are* the verification, so a guard that quietly weakens is the most expensive
kind of defect this codebase can ship.

Four claims the phase makes were checked and **hold**, and are recorded so the fix pass does
not re-litigate them:

- **`src/types/database.ts` really is comment-only.** Proved mechanically: every changed
  line in that file's diff is inside a docblock (`git diff … -- src/types/database.ts`
  filtered for non-` * ` changed lines returns nothing). No generated type moved.
- **An anonymous visitor's rendered navigation is unchanged.** `ANONYMOUS_CONTEXT`
  (`capabilities/server.ts:289-295`) carries an empty capability set, the Check-in entry
  also carries `requireAuth: true`, and the two clauses agree. What is added to a public
  page's payload for an anonymous viewer is two empty arrays.
- **No capability *grant* is serialised into a public page.** What crosses is the keys the
  viewer already holds — `[...ctx.capabilities]` — never the map, never another subject's
  set. `CAPABILITY_ROUTES` was already in the client bundle before this phase.
- **`/door` introduces no pattern ambiguity, and `npm run verify:routes` does census it.**
  `resolveRoute("/door")` is one literal segment against three other one-segment patterns,
  all with different literals; and `censusAddresses()` (`scripts/verify-routes.mjs:424-439`)
  strips `(group)` segments, so `src/app/(admin)/door/page.tsx` becomes `/door` and matches.
  The service worker needs no change either: `defaultCache`'s page rules match by request
  mode, not by path.

## Warnings

### WR-01: The one-element tuple was a compile-time guarantee; what replaced it is a runtime throw justified by a premise that is false

**File:** `src/lib/rbac/roles.ts:46-81`
**Classification:** WARNING

The phase-34 stop was `const DOOR_BINDING: { readonly routes: readonly [Route] }` — a *type
annotation*, checked by `tsc` inside `next build`. It could not fail to run and could not
fail at runtime. What stands in its place is a module-scope `throw` block.

The docblock claims equivalence on one sentence:

> *"This module is imported by `MobileNav` and is therefore evaluated while pages are
> prerendered"*

**That premise does not hold on this tree.** All 13 `MobileNav` mount sites call
`getAccessContext()`, which reaches `cookies()` — so every one of them is dynamic and none
is prerendered. And the same phase measured the *opposite* mechanism twice, in two sibling
files, both times with the word "Measured":

- `src/lib/supabase/middleware.ts:152-160` — *"Module-load code in a middleware bundle runs
  when the runtime instantiates the bundle: the first request after deploy, not
  `npm run build`."*
- `src/lib/routes/organizer-redirects.ts:38-45` — *"importing a module gets it bundled and
  does not get it evaluated."*

This file states its build-time claim as fact and shows no measurement. That is the
`ai-engineering.md` *Gate hallucination* pattern applied to the guard the whole change rests
on.

**The blast radius also got worse, not just the timing.** `roles.ts` is imported by
`MobileNav`, which is `"use client"`, so this `throw` ships to the browser. If it ever
fires it fires during hydration of **every page in the application**, including public pages
for anonymous visitors — a door-configuration mistake turned into a site-wide client crash.
A type error can never do that.

The docblock enumerates two "lazier repairs" and refuses both. A third was available, is
strictly better than either, and is not mentioned: it asks exactly the *meaning* question
the docblock says it wants, and asks it at typecheck.

**Fix:**
```ts
// `CAPABILITY_ROUTES` is `as const`, so this is the literal union
// "/admin/scanner" | "/door" — and it collapses the moment the map stops
// binding the address to the door's key.
type DoorAddress =
  (typeof CAPABILITY_ROUTES)[typeof CAP.DOOR_OPERATE]["routes"][number];

// A build error naming this file if `/door` leaves the door's entry, moves to
// another key, or the entry changes branch to `{ scope: "table" }`.
const DOOR_HREF: Extract<DoorAddress, Route> = "/door";
```
Keep the runtime block if desired as belt-and-braces, but stop describing it as the
build-time guarantee — or measure the claim and write the measurement down beside it, the
way the two sibling files do.

---

### WR-02: Fence 1 in `organizer-redirects.ts` was narrowed, and the reason given for narrowing it is not reachable

**File:** `src/lib/routes/organizer-redirects.ts:145-175`
**Classification:** WARNING

The fence changed from `row.to.includes("/scanner") || row.from.includes("/scanner")` to an
**equality** test against the map's two door addresses. The stated motivation:

> *"after the move a sixteenth row pointing at the door's new address would have **passed**"*

**That row cannot exist.** `RedirectRow` (`:64`) types `to` as `` `/admin${string}` ``, so
`["/organizer/x", "/door"]` is a compile error, not a row the old fence would have missed.
The change is justified against a failure the type system already forbids.

What the change *did* do is give up coverage that was reachable:

1. **A destination *under* a door address no longer trips fence 1.** `/admin/scanner/x` was
   caught by `includes("/scanner")`; equality does not catch it. Today fence 2 catches it as
   unbound — but only *because* nothing under `/admin/scanner` is bound. Bind one (a
   settings sub-page under `door.operate`, say) and the row passes both fences and silently
   points an `/organizer` address at the door.
2. **The `from` half of the fence is now dead by construction.** `from` is
   `` `/organizer${string}` ``, so `row.from === "/admin/scanner"` and
   `row.from === "/door"` can never be true. The docblock two lines above still promises the
   fence protects the door *"not as a source, which would redirect the door"* — that promise
   is now unenforceable. The old substring form could fire on `/organizer/scanner`; this one
   cannot fire on anything. `ai-engineering.md`, gate *un gate deve poter fallire*.

**Fix:** compare on a segment boundary, which keeps the loose-match worry the comment raises
(`/administrators`-style false claims) out while restoring sub-address coverage:
```ts
const namesDoor = (candidate: string) =>
  doorAddresses.find(
    (address) =>
      candidate === address ||
      candidate.startsWith(`${address}/`) ||
      candidate.startsWith(`${address}?`)
  );

const matchedDoorAddress = namesDoor(row.to) ?? namesDoor(row.from);
```
And correct the paragraph: the reason to read the map is that the door now has two addresses
and one of them is spelled in three files — not that a `/door` destination would have
compiled.

---

### WR-03: `/door` is a second staff tree, and the middleware's fail-closed branch does not cover it

**File:** `src/lib/supabase/middleware.ts:223-226`, `src/app/(admin)/door/page.tsx:17-21`
**Classification:** WARNING

`isUnderWorkTree` answers *"is this address one the map is supposed to have an opinion
about"* by testing `pathname.split("/")[1] === "admin"`. It is the whole of T-34-13: an
address inside the tree that the map does not bind is refused rather than admitted by
fall-through.

`/door` is outside it. So is everything that would ever sit under it. Concretely: add
`src/app/(admin)/door/settings/page.tsx` tomorrow and forget its map entry, and

- `resolveRoute("/door/settings")` returns `null`,
- `isUnderWorkTree("/door/settings")` returns `false`,
- the `else if` is not taken and **no bounce is emitted at all** — the exact fall-through the
  branch exists to prevent, on the tree that hosts the door.

The compiler cannot see it either: `StaffRoute` (`capability-routes.ts:500-503`) is
`Extract<Route, "/admin" | "/admin/${string}">`, so `_everyStaffRouteIsBound` will never
report an unbound `/door*` address. That leaves `npm run verify:routes` as the only
mechanism covering the new tree, and it is a manual pre-deploy step with no CI (D-34-12).

The `door/page.tsx` docblock names both gaps accurately and then treats naming them as
disposing of them. Naming a hole is not closing it, and this one costs one line.

**Fix:**
```ts
// A SET of first segments, not one, since Phase 39 the tree has two roots.
const WORK_TREE_ROOTS = new Set(["admin", "door"]);

const isUnderWorkTree = (pathname: string) =>
  WORK_TREE_ROOTS.has(pathname.split("/")[1] ?? "");
```
`/door` itself is bound, so it never reaches this branch; the change only closes the
fall-through for anything added beneath it.

---

### WR-04: Doubling the module-load assertion doubles a total-outage trigger that now includes the payment webhook

**File:** `src/lib/supabase/middleware.ts:188-211`
**Classification:** WARNING

The assertion is right to exist and its failure mode was already understood. What this phase
changed is its *size*: two addresses × two clauses, and `DOOR_ADDRESSES` is a hand-typed
duplicate of `CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes` living in a different file.

The matcher (`src/middleware.ts:93-97`) excludes only static assets, so a throw here is a 500
on:

- `/api/webhooks/sumup` — the money path. `ticketing-payments` inherits an outage nobody
  declared.
- `/api/cron/*` — four unattended jobs, in a product with no error tracking.
- `/api/tickets/checkin` — **the door's own scan path**.

That is a wide blast radius for a class of edit that is otherwise benign. Removing
`/admin/scanner` from the map is a plausible future cleanup — the entry is documented as
permanent, but documents are what this assertion exists because people edit. Under this
code, that cleanup is a site-wide outage rather than a route change, and the only mitigation
shipped is procedural (§0.6 of `39-DOOR-PASS.md`: deploy on a night-free day and make the
first request yourself).

Note also the asymmetry: because the address list is hand-copied, a **third** address added
to the map's door entry gets no assertion at all.

**Fix:** derive the list from the map and assert the property that actually matters — that
each address the map claims for the door *resolves back to* the door — which cannot be
satisfied by construction (a more specific pattern under another key can shadow it) and
which cannot go stale:
```ts
for (const doorAddress of CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes) {
  const doorBinding = resolveRoute(doorAddress);
  // …two clauses unchanged, each message still naming `doorAddress`…
}
```
This keeps the check that caught a real defect in plan 34-03 (`assignmentOpenable` missing),
keeps each message naming its address, covers a third address for free, and stops a map
deletion from being an outage.

---

### WR-05: The Check-in tab is now drawn for a **rejected** organizer or master, and the phase's own outcome table omits that row

**File:** `src/lib/rbac/roles.ts:250-262` (the outcomes list), `:337-346` (the filter)
**Classification:** WARNING

`private.has_capability` grants when
`not rc.requires_approved or p.status = 'approved'`
(`supabase/migrations/20260807000000_capability_model.sql:215`), and `door.operate` carries
`requires_approved = false` for both `master` and `organizer`. **Status is not consulted at
all** — so a `rejected` organizer holds `door.operate` exactly as an approved one does.

Before this phase the nav hid the entry behind `roles: ["master","organizer"]` **and**
`requireApproved: true`. After it, the only clause is the capability. A rejected organizer
therefore now sees the Check-in tab, follows it, is admitted by the middleware and by
`DoorSurface`.

The server side of that is pre-existing and out of scope. What is in scope is that the
rewritten outcomes list — introduced as *"rewritten against the filter as it stands after
plan 39-03"* — enumerates *approved* and *pending* privileged accounts and **never mentions
`rejected`**, which is the row the change widened most. `rejected` is the community's
refusal mechanism (`community-membership.md`, gate *un rifiuto e' una comunicazione*), and a
navigation that advertises the door to a refused account is a fact that belongs in the
table, not in a reader's inference.

**Fix:** add the row and state the disposition explicitly, e.g.
```
 * - Organizer or master, **rejected**: Events, Check-in, Account. `door.operate`
 *   is granted with `requires_approved = false`, and `has_capability` consults
 *   status only when that flag is true — so a rejected account holds the key.
 *   The nav now matches the server here rather than diverging from it; whether
 *   the GRANT should exclude `rejected` is a question for the capability model
 *   and is not decided by this phase.
```
If the answer is that it should not hold the key, that is a migration and a Critical-class
change under `access-gating.md` — raise it, do not fix it here.

---

### WR-06: The canonical address moved and the only mitigation shipped for the cold-cache hazard is a document

**File:** `src/lib/rbac/roles.ts:56`, `src/components/layout/MobileNav.tsx:23-30`
**Classification:** WARNING

`checkin-offline.md` gained a gate for this in the same phase — *"le chiavi di cache sono
URL: i due indirizzi della porta sono due voci indipendenti, e scaldarne uno **non** scalda
l'altro"* — and the runbook step that follows it is the right instruction. The concern is
that the instruction is the *entire* mitigation for a hazard whose failure lands at 02:00 in
front of a queue, and that no code mitigation appears to have been weighed.

Stated precisely, so the fix pass does not over- or under-read it:

- **Established:** a device warmed for months at `/admin/scanner` has no cache entry keyed
  `/door`, and the bottom nav now sends it there.
- **Likely mitigating, but not established in this phase's artifacts:** `<Link>` is in the
  viewport permanently (the nav is `fixed bottom-0`), so any online render that draws the tab
  should prefetch `/door`'s RSC payload into the `pages-rsc-prefetch` bucket, and
  `cacheOnNavigation: true` is set in `next.config.ts`. That would cover a *client-side* tap
  offline. It does **not** cover a cold hard-load at `/door` with no network, which needs the
  document bucket.
- **Not weighed anywhere in the diff:** precaching the two door documents, or a runtime rule
  in `src/app/sw.ts` that normalises both door URLs onto one cache key — which is available
  precisely because the two addresses render the identical surface, and which would make the
  cache question disappear rather than be managed by procedure.

**Fix:** either measure the prefetch behaviour on a real device with the radio off and record
the measurement beside the gate (the project's own standard — `middleware.ts:152-160` is the
model), or add the SW rule. A one-line runbook step is not the same class of mitigation as
the rest of `src/app/sw.ts`, which chooses caching route by route and explains each choice.

---

### WR-07: Comments left standing that contradict the line beneath them, in files this phase edited

**Files:** several, listed below
**Classification:** WARNING

This codebase treats comments as load-bearing, and this phase spends several hundred words
correcting a stale mount count on the grounds that *"a stale count in prose used to justify
leaving a decision alone is how a decision outlives its reason."* The same diff leaves seven
statements stale, four of them directly above the line that falsifies them:

| File:line | What it says | Why it is now false |
|---|---|---|
| `src/app/(members)/attendance/page.tsx:15-18` | *"no capability key belongs in this file"* | line 19 destructures `capabilities` |
| `src/app/(members)/membership-card/page.tsx:17-21` | identical sentence | line 22 destructures `capabilities` |
| `src/app/(public)/newsletter/page.tsx:8-10` | *"both are handed to MobileNav … Converting the nav itself to consume capabilities is phase 34 (STAFF-03)"* | four values are handed now, and the conversion happened in this phase |
| `src/app/(public)/gallery/page.tsx:12` | *"Both values go to MobileNav"* | four values do |
| `src/app/(admin)/admin/(work)/layout.tsx:17-21` | *"This phase does not touch the door's page (STAFF-04 is Phase 39, alone…)"* | left standing while the paragraph immediately below it was rewritten, in the same file, in this diff |
| `src/lib/routes/organizer-redirects.ts:10-13` | *"`/admin/scanner` must not move (STAFF-04 is Phase 39, alone…)"* | spent; the file was edited by this phase and this paragraph was not |
| `src/lib/routes/staff-tabs.ts:59-62` | *"The door. `/admin/scanner` is bound to `door.operate` … and it does not move in this phase (STAFF-04 is Phase 39's, alone)"* | the door has two addresses; and `roles.ts:58` explicitly names this file as the shape it copied |

`src/lib/capabilities/keys.ts:139` (*"Middleware `/admin/scanner` and the four door routes"*)
is in the same category, one address short.

**Fix:** reverse each in place with its reason, which is the convention this phase applies
elsewhere and applies well. The two files outside the diff (`organizer-redirects.ts`'s
header, `staff-tabs.ts`) matter most: they are the two places a future editor would go to
learn how many addresses the door has, and both currently answer one.

## Info

### IN-01: `/door` was added to `protectedPrefixes` as a prefix, in the file that argues against prefix tests

**File:** `src/lib/supabase/middleware.ts:497-503`
**Classification:** INFO

`protectedPrefixes.some((prefix) => pathname.startsWith(prefix))` matches `/doorway`,
`/doors`, `/door-policy`. Thirty lines above, `WORK_TREE_ROOT` exists as a constant purely to
explain why a first-segment comparison beats a prefix test (*"a prefix test would claim
`/administrators` for the work tree"*). No route collides today, so the effect is nil; the
inconsistency is worth one line.

**Fix:** `pathname === prefix || pathname.startsWith(`${prefix}/`)`.

### IN-02: The nav-prop ternary is copy-pasted verbatim 13 times

**File:** all 13 `<MobileNav>` mount sites
**Classification:** INFO

```ts
liveAssignmentCapabilities={
  liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
}
```
is identical at every site. The required-prop discipline the docblocks celebrate (a
fourteenth mount that forgets is a build error) survives intact if this is collapsed into a
helper that returns the prop bag from an `AccessContextResult` — a fourteenth mount would
still have to call it.

**Fix:** `export function navPropsFrom(ctx: AccessContextResult)` in
`src/lib/capabilities/server.ts` or beside `MobileNav`, returning
`{ role, status, capabilities, liveAssignmentCapabilities }` already narrowed — which also
retires the two `as UserRole | null` casts from 13 places to one.

### IN-03: `dashboard/page.tsx` spreads the same `Set` twice

**File:** `src/app/(members)/dashboard/page.tsx:259, 592`
**Classification:** INFO

`const managementCapabilities = [...capabilities];` at `:259`, then
`capabilities={[...capabilities]}` at `:592`. Two identical arrays from one Set.

**Fix:** pass `managementCapabilities`.

### IN-04: Two `async` page components with no `await`

**File:** `src/app/(admin)/door/page.tsx:23`, `src/app/(admin)/admin/scanner/page.tsx:17`
**Classification:** INFO

Both are `export default async function` bodies whose only statement is
`return <DoorSurface />;`. Harmless — and arguably deliberate, since both files are meant to
stay three lines and identical to each other — but neither awaits anything.

**Fix:** drop `async`, or leave both and note in one of the docblocks that the symmetry is
the point.

---

_Reviewed: 2026-08-11T15:26:28Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
</content>
</invoke>
