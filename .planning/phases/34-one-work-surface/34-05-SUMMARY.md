---
phase: 34-one-work-surface
plan: 05
subsystem: auth
tags: [routing, route-groups, layout, capabilities, nextjs, navigation]

requires:
  - phase: 34-one-work-surface
    plan: 01
    provides: "`CAPABILITY_ROUTES` — the binding that puts `/admin` on `organizer.access` and the five master-only surfaces on `admin.access`"
  - phase: 32-capability-model-in-the-database
    provides: "`getAccessContext()`, `cache()`-scoped per request, throwing rather than degrading"
provides:
  - "`src/app/(admin)/admin/(work)/layout.tsx` — one access-context resolution and both navs for the whole collapsed work surface"
  - "The `(work)` route group: a boundary the door is deliberately outside of"
  - "`/admin` with a capability guard of its own for the first time (finding F2)"
  - "Five master-only surfaces at unchanged addresses, mounting nothing by hand"
affects: [34-06, 34-09, 34-10, 34-11, 34-12, 34-13, 34-17, 39-door-moves]

tech-stack:
  added: []
  patterns:
    - "A nested route group used as a LAYOUT boundary, not as an address: `(work)` exists so that the door can stay outside it"
    - "Layout resolves, page admits — the resolution is shared, the verdict is not"
    - "A `loading.tsx` under a layout drops the skeleton of anything the layout now draws for real"

key-files:
  created:
    - src/app/(admin)/admin/(work)/layout.tsx
  modified:
    - src/app/(admin)/admin/(work)/page.tsx
    - src/app/(admin)/admin/(work)/analytics/page.tsx
    - src/app/(admin)/admin/(work)/analytics/loading.tsx
    - src/app/(admin)/admin/(work)/analytics/compare/page.tsx
    - src/app/(admin)/admin/(work)/analytics/compare/loading.tsx
    - src/app/(admin)/admin/(work)/analytics/members/page.tsx
    - src/app/(admin)/admin/(work)/analytics/members/loading.tsx
    - src/app/(admin)/admin/(work)/newsletter/page.tsx
    - src/app/(admin)/admin/(work)/finance/page.tsx
    - src/app/(admin)/admin/(work)/finance/loading.tsx

key-decisions:
  - "The layout mounts `StaffNav` with plan 34-04's POST-change signature (`capabilities`), not the signature present in this worktree — the merged wave needs one correct file, not one that compiles alone"
  - "The four `loading.tsx` tab-bar skeletons were deleted, not just their nav references: under a layout they would draw a second row of pills beneath a nav already rendered"
  - "The two `UserRole` / `UserStatus` casts survive — once, in the layout, instead of twice on each of five pages"
  - "The `curl` walk was measured to be WEAKER evidence than the plan assumed, and the build route manifest is what actually carries the no-URL-changed claim"

patterns-established:
  - "Proof by additive mutation for a cross-plan coupling: widen a sibling's prop type, build, read, revert — the sibling stays byte-identical in the diff"

requirements-completed: [STAFF-01, STAFF-03]

duration: 62min
completed: 2026-08-09
---

# Phase 34 Plan 05: The Work-Surface Layout Summary

**The collapsed work surface now resolves the viewer's access context once for the whole tree instead of once per page, both navs are mounted by a layout the door is deliberately outside of, and `/admin` — a bare `redirect()` with no gate since it was written — refuses an unentitled visitor before the redirect runs.**

## Performance

- **Duration:** ~62 min
- **Tasks:** 2 of 2
- **Files created:** 1
- **Files moved:** 10 (nine route files in Task 2, plus `/admin`'s own page in Task 1)
- **Files modified in place:** 0 outside the moved set

## Task Commits

1. **Task 1: The work-surface layout, and `/admin` gets a gate of its own** — `d180dc4` (feat)
2. **Task 2: The four master-only surfaces move under the layout** — `71d8561` (feat)

## Accomplishments

- **One resolution for the whole tree.** `(work)/layout.tsx` calls `getAccessContext()` exactly once. Because the resolver is `cache()`-scoped per request, the five pages below that still ask it for their own guard cost **no second round trip** — the property is stated in the layout's docblock rather than assumed by whoever reads it next.
- **`/admin` has a lock.** Finding F2 is closed: the root was four lines of `redirect("/admin/events")` held up **solely** by the middleware's `/admin/*` prefix rule, which D-34-02 dissolves. It now refuses on absent `organizer.access` before the redirect runs.
- **The door is outside the boundary, and it is outside by construction.** `(work)` is a nested group precisely so that a layout does not reach `/admin/scanner`. `scanner/page.tsx` is absent from the diff; measured, its address still answers exactly as before.
- **R-WORK-ROUTES held with no exception.** Only route files entered the group. `finance/actions.ts` and the five newsletter modules stayed put, so **no file outside this plan's own tree changed a specifier** — in particular the two `src/components/admin/` files on the refund path.
- **Twenty-two hand mounts and ten casts became one mount pair and one cast pair.**

## Files Created/Modified

**Created**

- `src/app/(admin)/admin/(work)/layout.tsx` — the two mounts, `{children}`, and a docblock carrying the four things that must not be re-derived: why the group is nested, that the resolver is `cache()`-scoped, that it throws and is not wrapped, and that the layout is **not** a guard.

**Moved with `git mv` and edited**

`(work)/page.tsx` (the `/admin` root), plus `analytics/{page,loading}`, `analytics/compare/{page,loading}`, `analytics/members/{page,loading}`, `newsletter/page`, `finance/{page,loading}`.

**Deliberately not moved, and each for a stated reason**

| Stayed | Reason |
|---|---|
| `finance/actions.ts` | imported from **outside** its directory by `src/components/admin/RefundDialog.tsx:4` and `TransactionList.tsx:11`, both on the refund path |
| `newsletter/{actions.ts,NewsletterClient,ComposeForm,BroadcastList,FailureNotice}.tsx` | same rule, no external importer today — a rule with an exception is a rule the next reader has to re-measure |
| `members/`, `events/`, `artists/`, `venues/` | plans 34-06 and 34-10…34-13 |
| `scanner/` | the door does not move, in this phase or any other before Phase 39 |

The one edit R-WORK-ROUTES cost: three relative imports in `newsletter/page.tsx` became absolute — inside a file this plan owns, which is the point of the rule.

## Findings — recorded, not designed

### Finding 1 — this plan's committed tree does not build alone, and that is the wave, not a defect

`34-05-PLAN.md` instructs that *"`StaffNav` takes the capability key array, as rewritten by 34-04"*. Plan **34-04 runs in the same wave, in a different worktree**, and it is the plan that changes `StaffNav`'s props from `{ role, context }` to `{ capabilities }`. On this worktree's base, `StaffNav` still has the old signature.

Measured on the committed tree:

```
$ npx tsc --noEmit -p tsconfig.json
src/app/(admin)/admin/(work)/layout.tsx(75,17): error TS2322:
  Type '{ capabilities: CapabilityKey[]; }' is not assignable to type
  'IntrinsicAttributes & StaffNavProps'.
  Property 'capabilities' does not exist on type 'IntrinsicAttributes & StaffNavProps'.
```

**Exactly one error, and it is the coupling.** Nothing else in the plan is red.

The choice taken, and why it is the right one rather than the convenient one: writing the mount against the *current* signature would compile here and then be **wrong in the merged tree**, where 34-04's `StaffNav` is the one that exists. And the merged wave-2 tree needs reconciliation regardless of what this plan does — 34-04's prop change breaks the **twenty-two other pages** that still mount `StaffNav` by hand, none of which either plan owns. Given that the reconciliation is unavoidable, this file should be on the correct side of it.

### Finding 2 — the green build was obtained by additive mutation, and the mutation is not in the commit

To verify everything *except* the coupling, `StaffNavProps` was temporarily widened — `role` and `context` made optional, `capabilities?: readonly string[]` added. Additive, so the twenty-two existing call sites stayed valid. The mutation was **confirmed applied before its result was read**, per this repository's recorded incident:

```
$ git diff --stat src/components/staff/StaffNav.tsx
 src/components/staff/StaffNav.tsx | 5 +++--
 1 file changed, 3 insertions(+), 2 deletions(-)

$ rm -rf .next && npm run build
BUILD_EXIT=0
```

Reverted with `git checkout --`; `git status --porcelain` empty. **`StaffNav.tsx` is absent from this plan's diff.**

What this proves: every other claim in the plan — the route group, the nine moves, the guards, the stripped mounts, the absolute specifiers — is green. What it does **not** prove: that the merged tree compiles. That is 34-04's signature plus twenty-two call sites, and it belongs to whoever reconciles the wave.

### Finding 3 — the plan's `curl` criterion is weaker than it reads, and the build manifest is what carries the claim

The criterion asks that `curl -sI /admin/finance` return a redirect to `/login` and not a 404. It does:

```
HTTP/1.1 307 Temporary Redirect
location: /login?redirect=%2Fadmin%2Ffinance
```

**But so does an address that does not exist.** Negative control, same server:

```
/admin/(work)/finance  ->  307  /login?redirect=%2Fadmin%2F%2528work%2529%2Ffinance
/definitely-not-a-route ->  404
```

The middleware still branches on the `/admin/*` prefix (plan 34-03 replaces it) and bounces an unauthenticated request **before** route resolution, so every path under `/admin` answers 307 whether or not a page exists. The walk therefore shows that nothing *else* intercepted the address; it does not show that the address resolves.

**The evidence that does carry the claim is the `next build` route manifest**, which is generated from the routes that exist and lists none of them with `(work)` in it:

```
├ ƒ /admin
├ ƒ /admin/analytics
├ ƒ /admin/analytics/compare
├ ƒ /admin/analytics/members
├ ƒ /admin/finance
├ ƒ /admin/newsletter
├ ƒ /admin/scanner
```

Recorded rather than glossed, because a criterion that looks like a behavioural proof and is not is worse than no criterion.

### Finding 4 — the tab bar now draws above each page's heading

A layout wraps `{children}`; it cannot inject a mount *between* a page's `<header>` and its content. With `<StaffNav />` before `{children}`, as the plan prescribes, the tab bar moves from **below** each page's `<h1>` to **above** it.

This is a structural consequence of D-34-07, not a restyle: no token, no typography, no spacing and no component was changed, and the alternative — the layout owning the heading — would mean inventing one heading for five pages that have five different ones. It is visible, so it is written down. Phases 40 and 41 own the vocabulary and the visual.

### Finding 5 — `git log --follow` needs `-M40%` on one of the nine

The move used `git mv` throughout and `git status` staged all nine as renames. `finance/page.tsx` had the largest in-file edit, so the recorded similarity fell **below git's default 50% threshold** and the commit stored it as delete + create:

```
$ git log --follow --oneline -1 -- "src/app/(admin)/admin/(work)/finance/page.tsx"
71d8561 feat(34-05): …                       # stops at the move

$ git log --follow -M40% --oneline -3 -- "src/app/(admin)/admin/(work)/finance/page.tsx"
71d8561 feat(34-05): …
fb630bd refactor(33-03): ask the session on the SumUp surface, not a request header
c652967 feat(20-01): simplify MobileNav and replace AdminNav/OrganizerNav with StaffNav
```

The other eight follow at the default. The cause is the size of the edit, not the method of the move — and it is a property of rename *detection* at read time, so it costs nothing beyond knowing to pass `-M40%`.

## Decisions Made

1. **The `loading.tsx` tab-bar skeletons were deleted, not merely de-referenced.** Four of them drew a row of pills where the nav used to be. Under the layout the real nav is already rendered outside the suspense boundary, so the skeleton would be a second row beneath it. Removing them is the change that keeps the loading state honest — a skeleton for something already drawn is a lie about what is loading.
2. **The two casts survive, in the layout.** `MobileNav` keeps `role` / `status` because 34-04 deliberately did not change its signature — it is mounted on 44 pages, the door's among them. So `role as UserRole | null` still exists, once, where before it existed twice on every page. Ten casts became two.
3. **The pages kept their own `getAccessContext()` call.** It looks redundant next to a layout that already resolved. It is not: the resolver is `cache()`-scoped, so the second ask is free, and D-34-09 wants the page and the middleware to agree — not for one of them to stop asking.
4. **`createClient` stayed imported in `analytics/page.tsx` although nothing uses it.** It was unused before this plan and removing it is out of scope; a tidy-up inside a Critical access change is review noise that hides the change that matters.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The four `loading.tsx` files needed their tab-bar skeletons removed, which the plan's action text did not name**

- **Found during:** Task 2
- **Issue:** The plan says to delete the `<StaffNav>` and `<MobileNav>` **mounts** from each moved `loading.tsx`. Three of the four `loading.tsx` files never mounted either component — they drew a *skeleton* of the tab bar, referenced only in a comment. Left in place they would have failed the plan's own `grep -rc "StaffNav\|MobileNav" … returns 0` criterion, and worse, drawn a duplicate row of pills under the real nav.
- **Fix:** The skeleton block and its comment were replaced by a comment stating why nothing stands there any more, in wording that does not name either component.
- **Verification:** `grep -rn "StaffNav\|MobileNav" (work)/{analytics,newsletter,finance}` returns nothing; build exit 0.
- **Committed in:** `71d8561`

**No Rule 4 case arose.** No architectural change, no new table, no permission edited.

---

**Total deviations:** 1 auto-fixed (Rule 3)
**Impact on plan:** No scope creep. No capability was granted, revoked or re-scoped; no migration was touched; no new capability key exists; `/admin/scanner` did not move and nothing in this diff matches it.

## Verification Run

| Command | Result |
|---|---|
| `rm -rf .next && npm run build` (under the Finding 2 mutation) | exit 0 |
| `rm -rf .next && npm run build` (committed tree) | **exit 1 — one error, Finding 1**, the 34-04 coupling |
| `npx tsc --noEmit` (committed tree) | exactly one error, in `layout.tsx`, the same coupling |
| `npm run verify:persona` | exit 0 — 7/7, worst case 10 311 tokens of 12 000 |
| `find "(work)" -name page.tsx \| wc -l` | 6 |
| `grep -rn "StaffNav\|MobileNav\|as UserRole\|as UserStatus"` in the moved trees | no match |
| `grep -rl "ADMIN_ACCESS"` in the moved trees | exactly the five pages moved in Task 2 |
| `grep -c "ORGANIZER_ACCESS" "(work)/page.tsx"` / `grep -c "ADMIN_ACCESS"` | 1 / 0 |
| `grep -c "try {" "(work)/layout.tsx"` | 0 |
| `git diff --name-only` ∩ {`scanner/page.tsx`, `RefundDialog.tsx`, `TransactionList.tsx`} | empty |
| `grep -c 'admin/finance/actions'` on both components | 1 and 1 — unchanged |
| Address walk, `next dev` on port 3457 | all seven answer 307 to `/login`; see Finding 3 for what that does and does not prove |
| `git status --porcelain` | empty |

**`npm run verify:capabilities` was not run:** it needs a live database, there is no CI, and this plan edits no migration and no key. It stays a written pre-deploy step (D-34-12).

**Not claimed:** that this plan protects anything. The layout resolves and it draws. The middleware is still UX and the RLS is still the boundary, and mounting a nav from a resolved context changes neither. And **there is no test runner for this product** — nothing here is verified because tests pass.

## Known Stubs

None.

## Threat Flags

None. No network endpoint, no auth path, no file access and no schema change was introduced. Every threat in the plan's register is addressed by a mechanism recorded above, with one honest qualification on **T-34-27**: the `curl` assertion the register names is weaker than it reads, and the claim rests on the build route manifest instead (Finding 3).

## User Setup Required

None.

## Next Phase Readiness

Carried forward, explicitly:

- **Whoever reconciles wave 2** must close the `StaffNav` coupling: this plan's layout mounts the post-34-04 signature, and 34-04's prop change also leaves **twenty-two** hand mounts across `(admin)` and `(organizer)` pages that belong to the Wave 4 collapse plans. That reconciliation is the wave's, not this plan's, and it is the reason the committed tree here does not build alone (Finding 1).
- **Plans 34-10 … 34-13** move `members/`, `events/`, `artists/` and `venues/` into `(work)`. The layout is already there; those plans only strip the mounts and the casts, and each page keeps its own guard.
- **Plan 34-03** replaces the prefix middleware. Once it lands, an address that does not exist under `/admin` will stop answering 307, and the walk in Finding 3 becomes the behavioural proof it currently is not — worth re-running then.
- **Phase 39** moves the door. `scanner/` is already structurally separate from the work surface, which is the whole reason the group is nested.

## Self-Check: PASSED

- `src/app/(admin)/admin/(work)/layout.tsx` — present
- `src/app/(admin)/admin/(work)/page.tsx` — present; `src/app/(admin)/admin/page.tsx` — gone
- six `page.tsx` under `(work)/` — present
- `src/app/(admin)/admin/{finance/actions.ts,newsletter/actions.ts,newsletter/NewsletterClient.tsx,newsletter/ComposeForm.tsx,newsletter/BroadcastList.tsx,newsletter/FailureNotice.tsx}` — all present at their pre-plan paths
- `src/app/(admin)/admin/{scanner,members,events,artists,venues}` — present, unmoved
- Commits `d180dc4`, `71d8561` — both present in `git log`
- `git status --porcelain` — empty
- `STATE.md` and `ROADMAP.md` — **not touched**; the orchestrator owns those writes

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-09*
