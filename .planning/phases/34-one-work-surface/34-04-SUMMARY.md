---
phase: 34-one-work-surface
plan: 04
subsystem: auth
tags: [nextjs, typedRoutes, rbac, capabilities, navigation, react]

requires:
  - phase: 34-one-work-surface
    provides: "34-01 — `src/lib/routes/capability-routes.ts`, the one address↔capability map, plus `typedRoutes` and `Route`-typed nav data"
  - phase: 32-capability-model-in-the-database
    provides: "`CAP` / `CapabilityKey` and `getAccessContext()`, the server-side resolver"
  - phase: 43
    provides: "the fourth role, and D-06 — `door.operate` granted with `requires_approved = false`"
provides:
  - "`src/lib/routes/staff-tabs.ts` — the seven staff tabs (href, label, capability) declared once, verified against the map at module load"
  - "`StaffNav` filtering on a resolved capability set instead of a role and a tree name"
  - "`ManagementSection` with one capability-filtered list where two literal href lists were"
  - "The door's address read from the map in `src/lib/rbac/roles.ts` instead of typed a second time"
  - "The residual `pending`-organizer / Check-in divergence recorded in source with Phase 39 named as owner"
affects: [34-05, 34-09, 34-10, 34-11, 34-12, 34-13, 34-14, 34-17, phase-39, phase-40, phase-41]

tech-stack:
  added: []
  patterns:
    - "A menu filters on the same declaration the middleware reads — one map, two readers, no third list"
    - "A copied binding is verified against its source at module load and throws when the two disagree"
    - "A one-element tuple annotation as a build-time cardinality guard, proved by mutation"

key-files:
  created:
    - src/lib/routes/staff-tabs.ts
  modified:
    - src/components/staff/StaffNav.tsx
    - src/components/account/ManagementSection.tsx
    - src/lib/rbac/roles.ts
    - src/app/(members)/dashboard/page.tsx

key-decisions:
  - "The tab list lives in its own module, `src/lib/routes/staff-tabs.ts`; `capability-routes.ts` was not extended to hold labels, because it is written by one plan and read by every other"
  - "Each tab declares its capability AND is checked against `resolveRoute` at module load — a copy that throws rather than a copy that drifts"
  - "One shared filter, `visibleStaffTabs`, called by both menus; two filters over one list are two chances to disagree"
  - "`MobileNav`'s signature is deliberately unchanged — it is mounted on 44 pages including the door's"
  - "`roles.ts` reads the door's address through a one-element tuple annotation, so binding a second address is a build error naming the file"
  - "The `pending`-organizer / Check-in divergence is recorded, not closed: closing it means editing the door's page"

patterns-established:
  - "Capability-driven navigation: the resolved key array crosses to the client as a prop; the client resolves nothing"
  - "Declaration verified against source at import time, with one error message per distinguishable failure"

requirements-completed: [STAFF-03]

duration: ~25min
completed: 2026-08-09
---

# Phase 34 Plan 04: The two staff menus read the map Summary

**The tab bar and the account list stopped filtering on role and started filtering on the capability the middleware will ask for at each address — seven tabs declared once in `src/lib/routes/staff-tabs.ts`, verified against `CAPABILITY_ROUTES` at module load, and the door's address read from the map instead of typed a second time.**

## Performance

- **Duration:** ~25 min (start not separately recorded; first task commit at 2026-08-09T21:31:42Z)
- **Completed:** 2026-08-09T21:34:10Z
- **Tasks:** 2
- **Files modified:** 18 (1 created, 17 modified — see the deviation below for why 18 and not 5)

## Accomplishments

- **`StaffNav` no longer knows the two staff trees apart.** The prop that named which tree the bar was being drawn in is gone, the `contexts` arrays are gone, the base-plus-segment concatenation is gone, and the `roles: ["master"]` filter on Finance and Analytics is *replaced* — not translated — by `admin.access`, which is the key the middleware actually asks.
- **`ManagementSection`'s two literal lists (seven addresses and four) are gone.** It renders the same declaration `StaffNav` renders, through the same filter.
- **The seven tabs exist in exactly one place in `src/`.** `grep -rln '"Newsletter"' src/components src/lib/routes` lists `src/lib/routes/staff-tabs.ts` and nothing else.
- **The declaration cannot silently drift from the map.** `staff-tabs.ts` asks `resolveRoute` what `CAPABILITY_ROUTES` says about each address and throws at module load — during `next build`, since the module is evaluated while the staff pages are prerendered — when a tab points at an unbound address or claims the wrong key. Two failures, two distinct messages.
- **`roles.ts` holds no route literal for the door.** Its `href` reads `door.operate`'s binding, behind a one-element tuple annotation that makes a second bound address a build error naming `roles.ts:20`.
- **The one divergence this plan does not close is written down**, with its direction, its size and its owner.

## Task Commits

1. **Task 1: the tab nav and the account menu read the map** — `bd04086` (refactor)
2. **Task 2: the door's address stops being a literal, and the residual divergence is recorded** — `bf3e146` (refactor)

## Files Created/Modified

**Created**

- `src/lib/routes/staff-tabs.ts` — the seven tabs as `{ href: Route; label: string; capability: CapabilityKey }`, the load-time agreement check against the map, and `visibleStaffTabs()`, the one filter both menus call.

**Modified — the plan's own four**

- `src/components/staff/StaffNav.tsx` — takes `capabilities: readonly CapabilityKey[]`; filters through `visibleStaffTabs`; imports nothing that resolves anything.
- `src/components/account/ManagementSection.tsx` — takes the same prop, renders the same filtered list.
- `src/lib/rbac/roles.ts` — imports `CAPABILITY_ROUTES` and `CAP`; the Check-in entry's `href` is `DOOR_HREF`; `getVisibleNavItems(role, status)` is untouched in signature and in behaviour.
- `src/app/(members)/dashboard/page.tsx` — destructures `capabilities`, passes it down, and the two-member cast on `role` is deleted. `canReachManagementTools` is now *"would the section draw anything"* rather than *"is this role one of two"*.

**Modified — the thirteen call sites (deviation, see below)**

`src/app/(admin)/admin/{artists,venues,events,members,members/growth,newsletter,finance,analytics,analytics/compare,analytics/members}/page.tsx` and `src/app/(organizer)/organizer/{artists,venues,events}/page.tsx` — one line each: `<StaffNav role={…} context="…" />` became `<StaffNav capabilities={[...capabilities]} />`. Every one of the thirteen already destructured `capabilities` from `getAccessContext()`, so no page gained a round trip and none gained a new import. One stale comment in `admin/events/page.tsx` was corrected in the same edit, because it asserted that `StaffNav` still takes `role` and `status`.

## Decisions Made

1. **The tab list is its own module.** The plan made this unconditional and the reason holds: `capability-routes.ts` is written by plan 34-01 and read by everything else, and a second plan extending a shared file is what costs a phase its parallelism.
2. **The capability is declared beside each label *and* verified against the map.** Deriving it silently would have made the list unreadable; copying it without a check would have made it drift. The load-time comparison gives both — the list reads as a list, and a disagreement fails the build.
3. **One filter, not two.** `visibleStaffTabs` is exported from `staff-tabs.ts` and called by both menus. Three menus already disagreed once; two copies of a `Set` walk is how that starts again.
4. **`capabilities` crosses as an array, not a `Set`.** A `Set` is not serialisable across the server/client boundary. Stated in both components' props docblocks so nobody "tidies" it back.
5. **`dashboard/page.tsx`'s role predicate was converted, not just uncast.** The comment that stood there said phase 34 owned the rewrite. The set of accounts is unchanged, and that was **checked rather than assumed** against `supabase/migrations/20260807000000_capability_model.sql:407-412`: `master` holds `admin.access` and `organizer.access`; `organizer` holds `organizer.access`; the fourth role holds neither. Master still sees seven links, organizer still sees four, the fourth role still sees none — and now for a reason the model states rather than a literal that happens to omit it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Thirteen `StaffNav` call sites updated so the new signature compiles**

- **Found during:** Task 1
- **Issue:** The plan declares five `files_modified`. Changing `StaffNav`'s props breaks **thirteen** mounts, measured with `grep -rn "<StaffNav" src`: ten under `(admin)` and three under `(organizer)`. TypeScript rejects both the missing `capabilities` and the excess `role` / `context` attributes, so `npm run build` cannot pass with the plan's five files alone. Wave 4 (plans 34-09…34-14) deletes those mounts once the `(work)` layout supplies the nav, but wave 4 is three waves away and this plan's own verification demands a green build now.
- **Fix:** One line per file. No page needed a new call, a new import or a new round trip — all thirteen already destructure `capabilities` from `getAccessContext()`.
- **Files modified:** the thirteen listed above.
- **Verification:** `rm -rf .next && npm run build` exits 0; `grep -rn "<StaffNav" src` shows thirteen capability mounts and two prose mentions (`scanner/page.tsx:74`, `admin/events/page.tsx:26`), the second of which was corrected.
- **Committed in:** `bd04086`

**2. [Rule 1 — Bug] A comment in `admin/events/page.tsx` asserted a prop shape that no longer exists**

- **Found during:** Task 1
- **Issue:** `admin/events/page.tsx:26-29` read *"role/status still flow to `<MobileNav>` / `<StaffNav>` as props"*. After this plan that is half false, and a comment that describes a signature wrongly is the kind of thing the next reader trusts instead of the code.
- **Fix:** Rewritten to say that `role`/`status` now flow to `MobileNav` alone, and why `MobileNav`'s signature is deliberately unchanged.
- **Files modified:** `src/app/(admin)/admin/events/page.tsx`
- **Committed in:** `bd04086`

**3. [Rule 3 — Blocking] Three acceptance greps would have failed on the docblocks that satisfy the other criteria**

- **Found during:** Task 1
- **Issue:** The criteria are literal greps. Writing *"must never import `@/lib/capabilities/server` or `@/lib/capabilities/guards`"* in a docblock makes `grep -c "capabilities/server\|capabilities/guards"` return 1 on a file that imports neither; the same for `server-only` in `staff-tabs.ts`, for the word naming the deleted prop in `StaffNav.tsx`, and for quoting the deleted cast in `dashboard/page.tsx`. Measured before the fix: three files returning 1 where 0 was required.
- **Fix:** The rules are stated without spelling the forbidden strings — *"the resolver or the guard helpers under `src/lib/capabilities/`"*, *"no sentinel pinning a module to the server"*, *"the prop that named which of the two staff trees this bar was being drawn in"*, *"the cast that stood here, narrowing `role` to a two-member union"*. The prohibitions survive; the greps return 0.
- **Verification:** all nine greps re-run, all at their required values (evidence table below).
- **Committed in:** `bd04086`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** No scope creep in substance — thirteen of the extra files changed by exactly one line, and none gained logic. The plan's `files_modified` count was simply wrong: it should have read 18, not 5. Flagged for the verifier below, because it collides with a sibling.

## ⚠️ Merge note for the orchestrator — five expected conflicts with plan 34-05

**Five of the thirteen call sites are files plan 34-05 owns**, and 34-05 `git mv`s each into `admin/(work)/` while deleting its `StaffNav` mount:

`admin/analytics/page.tsx` · `admin/analytics/compare/page.tsx` · `admin/analytics/members/page.tsx` · `admin/newsletter/page.tsx` · `admin/finance/page.tsx`

**This was measured, not guessed.** The merge was reproduced in a throwaway repository with realistic file proportions, twice:

| What 34-04 does to the line | Result |
|---|---|
| Rewrites the attribute | rename detected; **one content conflict** per file in the moved path |
| Deletes the mount (matching 34-05) | rename detected; **same one content conflict** |

So deleting instead of rewriting buys nothing, and rewriting is the honest state for this branch on its own. The conflict is minimal and unambiguous:

```
<<<<<<< HEAD:src/app/(admin)/admin/(work)/analytics/page.tsx
=======
      <StaffNav capabilities={[...capabilities]} />
>>>>>>> 34-04:src/app/(admin)/admin/analytics/page.tsx
```

**Resolution: take HEAD — 34-05's deletion — in all five.** The `(work)` layout mounts the nav for those pages, so the mount must not survive. No route file is duplicated and no history is lost; git detects the rename in every case (verified: the degenerate `modify/delete` outcome only appeared with an unrealistically small file, and does not occur at these proportions).

Nothing else in this plan's eighteen files overlaps 34-03, 34-07 or 34-08.

## Evidence — the acceptance criteria, as run

| # | Criterion | Command | Result |
|---|---|---|---|
| 1 | the deleted prop's name is gone from `StaffNav` | `grep -c "context" src/components/staff/StaffNav.tsx` | `0` |
| 2 | the tree union is gone | `grep -c '"admin" \| "organizer"' src/components/staff/StaffNav.tsx` | `0` |
| 3 | the two literal lists are gone | `grep -c "masterLinks\|organizerLinks" …/ManagementSection.tsx` | `0` |
| 4 | neither menu reaches the server side | `grep -c "capabilities/server\|capabilities/guards"` on both | `0`, `0` |
| 5 | `staff-tabs.ts` stays client-safe | `grep -c "capabilities/server\|capabilities/guards\|server-only" src/lib/routes/staff-tabs.ts` | `0` |
| 6 | the labels exist once | `grep -rln '"Newsletter"' src/components src/lib/routes` | `src/lib/routes/staff-tabs.ts` only |
| 7 | the cast is deleted | `grep -c 'as "master" \| "organizer"' "src/app/(members)/dashboard/page.tsx"` | `0` |
| 8 | no door literal outside comments | `grep -vE '^[[:space:]]*(\*\|//\|/\*)' src/lib/rbac/roles.ts \| grep -c '/admin/scanner'` | `0` |
| 9 | `roles.ts` reads the map | `grep -c "lib/routes/capability-routes" src/lib/rbac/roles.ts` | `1` |
| 10 | `getVisibleNavItems` signature unchanged | `git diff` on its parameter list | no change (`roles.ts:163-166`) |
| 11 | the map was not extended | `git diff --name-only` vs base | `capability-routes.ts` absent |
| 12 | `MobileNav` untouched | `git diff --name-only` vs base | `MobileNav.tsx` absent |
| 13 | the door's page untouched | `git diff --name-only` vs base | `scanner/page.tsx` absent |
| 14 | build | `rm -rf .next && npm run build` | `✓ Compiled successfully`, exit 0 |

**Proof by mutation — the door's cardinality guard.** `door.operate`'s binding was temporarily given a second route; the mutation was confirmed applied (`grep -c` returned 1) *before* its result was read, per `ai-engineering.md`'s gate. The build then failed with:

```
./src/lib/rbac/roles.ts:20:7
Type error: Type '{ readonly routes: readonly ["/admin/scanner", "/admin/scanner-mutation-probe"]; … }'
  is not assignable to type '{ readonly routes: readonly [Route]; }'.
```

The mutation was reverted, the revert confirmed (`grep -c` returned 0, `git status` clean on that file), and the build re-run green. `src/lib/routes/capability-routes.ts` is **not** in this plan's diff.

## Findings recorded, not fixed

1. **The `pending` organizer sees no Check-in tab the server would have admitted.** `door.operate` carries `requires_approved = false` (D-06 of Phase 43) while the bottom nav's Check-in entry is filtered by `requireApproved: true` and by role. It is the **safe direction** of the two — a hidden entry the server would have allowed, not a drawn entry the server refuses — and closing it means giving `getVisibleNavItems` the capability set, which means changing `MobileNav`'s props, which means editing the door's own page. **Owner: Phase 39**, alongside STAFF-04. Written into `src/lib/rbac/roles.ts`'s Check-in docblock, with the grant, the decision reference and the owner.
2. **`getVisibleNavItems` keeps `requireAuth` / `hideWhenAuth` / `requireApproved`, and that is deliberate.** No capability governs `/`, `/events` or `/gallery`; replacing the function wholesale would drag the public and member navigation into a phase whose Deferred Ideas exclude it. Three of its five entries are not capability-gated at all.
3. **Two comments elsewhere now describe `StaffNav`'s props wrongly, and were left alone on purpose.**
   - `src/app/(admin)/admin/scanner/page.tsx:74` — *"`<MobileNav>` and `<StaffNav>` keep taking `role` and `status` as props"*. True of `MobileNav`, no longer true of `StaffNav`. **The door's page is not edited by this phase.** Phase 39.
   - `src/types/database.ts:762` — *"they survive in this payload for exactly two client components — `MobileNav` and `StaffNav`"*. Now one component, not two. The obligation the note carries (*"no new caller may branch on `role` or `status`"*) still holds, so the note is stale rather than misleading. It belongs with whichever plan removes those fields from the payload.
4. **Tab highlighting on the `/organizer/*` pages is inert until 34-03 lands.** The tabs now point at `/admin/*`, so `pathname.startsWith(href)` matches nothing while an organizer page renders at its old address. 34-03 (same wave) redirects `/organizer/*` to its `/admin` twin, after which those pages are never rendered. Cosmetic, wave-internal, and gone by the end of the wave.
5. **A master visiting `/organizer/*` would briefly see seven tabs where four were drawn.** Same window, same cause, same closure by 34-03. Nothing is reachable that was not reachable: every one of the seven addresses is judged by the middleware and by its own page guard.

## Threat Flags

None. This plan added no endpoint, no auth path, no file access and no schema change. It moved a *visibility* decision from a role literal to the capability set the server already resolved, and it moved no check from the server to the client — asserted by criterion 4 above.

Against the plan's own register: T-34-19 mitigated (neither menu imports the resolver or the guards; both receive a resolved array as props); T-34-21 mitigated (both filter on the key the middleware resolves for that route, and the tab list throws at load if it disagrees with the map); T-34-22 mitigated (the `pending`-organizer divergence is in source with an owner). T-34-20 was accepted by the plan and is unchanged: the map is pure data — route patterns and key strings, both already visible in the URL bar — and it now reaches the client bundle by design (D-34-10), carrying no secret and performing no resolution.

## What is NOT claimed

**That a hidden entry is a protected route.** It is not, and neither menu says it is. STAFF-03 holds in one direction by construction: a drawn entry has a matching server-side rule, because both readers read one declaration. The converse does not hold. The refusal is the middleware's, and the boundary on the data is the RLS policy in the migrations.

**That anything here was verified by tests.** There is no test runner for the product. The verification is `rm -rf .next && npm run build` (which is also the typecheck), the fourteen greps above, and one proof by mutation. A manual walk of the five menus belongs to plan 34-17 (M-1…M-5), which observes rather than assumes.

## User Setup Required

None.

## Next Phase Readiness

- `visibleStaffTabs(capabilities)` is the call the `(work)` layout (plan 34-05) needs; `StaffNav` is ready for it and expects `readonly CapabilityKey[]`.
- Wave 4's collapse plans delete the thirteen hand mounts this plan updated; each is a single JSX line plus its import.
- Phase 39 inherits two items: the `pending`-organizer Check-in divergence, and the two stale comments named above.

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-09*
