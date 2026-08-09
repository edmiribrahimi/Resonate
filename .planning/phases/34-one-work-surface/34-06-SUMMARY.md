---
phase: 34-one-work-surface
plan: 06
subsystem: auth
tags: [routing, route-groups, capabilities, per-night-assignment, typed-routes]

requires:
  - phase: 34-one-work-surface
    plan: 01
    provides: "`CAPABILITY_ROUTES` — `party.manage` bound to one route, `organizer.access` bound to the assignments address, and `organizer-redirects.ts`"
  - phase: 34-one-work-surface
    plan: 03
    provides: "the middleware rewritten to one map lookup, and `assignmentOpenable: true` restored on the door's entry"
  - phase: 34-one-work-surface
    plan: 05
    provides: "`src/app/(admin)/admin/(work)/layout.tsx` — the two nav mounts and one access-context resolution"
  - phase: 34-one-work-surface
    plan: 07
    provides: "R-WORK-ROUTES — only route files enter `(work)`"
  - phase: 35-per-night-assignments
    provides: "the per-night gate on the review page, and `getPartyAccessContext`"
provides:
  - "**The route-group arrangement Wave 4 needs, measured: `(work)/events/[id]/…` INSIDE the group coexists with `admin/events/[id]/…` outside it.** Plans 34-09…34-14 and 34-15's census may hold their `(work)/…` paths"
  - "`/admin/events/[id]/assignments` and `/admin/events/[id]/review` at their collapsed addresses, the `(organizer)` originals gone"
  - "The per-night `party.manage` gate proved byte-identical across the move, by SHA"
  - "Two of the three remaining `(organizer)/organizer/events/[id]/…` route directories closed"
affects: [34-09, 34-10, 34-11, 34-12, 34-13, 34-14, 34-15, 34-16, 34-17]

tech-stack:
  added: []
  patterns:
    - "A gate proved unchanged by extracting the block from both revisions and comparing checksums — not by reading a diff and judging it"
    - "`typedRoutes` as the instrument that finds a stale address literal a grep on a module path cannot see"

key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/(work)/events/[id]/assignments/page.tsx (moved)"
    - "src/app/(admin)/admin/(work)/events/[id]/review/page.tsx (moved)"
    - "src/app/(admin)/admin/events/[id]/assignments/actions.ts (moved, byte-identical)"
    - "src/app/(admin)/admin/events/[id]/assignments/AssignmentsClient.tsx (moved, byte-identical)"
    - "src/app/(admin)/admin/events/[id]/review/ReviewListClient.tsx (moved)"
    - "src/app/(admin)/admin/members/register/page.tsx (one stale citation corrected)"

key-decisions:
  - "The compiler ACCEPTED the surfaces inside `(work)`; no escalation, Wave 4 needs no replanning"
  - "`assignmentOpenable` is asserted at TWO entries, not one — the plan's criterion predates plan 34-03's declared deviation, and asserting 1 would have demanded deleting the door's arm"
  - "`actions.ts` moved byte-identical, its two `/organizer/…` `revalidatePath` arguments deliberately untouched — plan 34-16 names itself as their only editor"
  - "The `/organizer/events` destinations inside the two moved pages WERE retargeted: same endpoint, one hop fewer, and leaving them would have handed 34-15 a type error it does not own"

patterns-established:
  - "When a criterion greps for a token, the plan's own prose must not spell it — carried forward from plan 34-03"

requirements-completed: [STAFF-01, STAFF-02]

duration: 78min
completed: 2026-08-10
---

# Phase 34 Plan 06: The two organizer-only surfaces move — Summary

**The compiler accepted `(work)/events/[id]/` inside the group beside
`admin/events/[id]/` outside it, so the arrangement six Wave-4 plans declare is
the arrangement that exists; both surfaces answer at their collapsed addresses;
and the per-night `party.manage` gate came through the move with the same
checksum it went in with.**

## The decision this plan was serialised to make

This plan ran alone in its wave for one reason: Task 1 carried a declared
escalation. If the compiler had refused `(work)/events/[id]/assignments/` while
`admin/events/[id]/{edit,tickets,sales,…}/` stayed outside the group — same
`/admin/events/[id]/` prefix, same `[id]` slug name, split across the boundary —
then six Wave-4 plans would be holding `artifacts`, `key_links` and
`files_modified` describing a tree that could not exist, and `34-15:179` would be
asserting a census against `(work)`.

**In one sentence, as the acceptance criterion requires: `npm run build`
accepted the surfaces INSIDE `(work)`.**

Measured immediately after the `git mv` and before any other edit, exit 0, and
the route manifest is what carries the claim — not a `curl` walk (see
*Evidence*, below):

```
├ ƒ /admin/events
├ ƒ /admin/events/[id]/analytics
├ ƒ /admin/events/[id]/assignments   ← inside (work)
├ ƒ /admin/events/[id]/drinks        ← outside (work)
├ ƒ /admin/events/[id]/edit          ← outside
├ ƒ /admin/events/[id]/guest-list    ← outside
├ ƒ /admin/events/[id]/media         ← outside
├ ƒ /admin/events/[id]/review        ← inside (work)
├ ƒ /admin/events/[id]/sales         ← outside
├ ƒ /admin/events/[id]/tickets       ← outside
```

No entry carries `(work)` in its address, which is the property a route group is
supposed to have and is here demonstrated across a shared dynamic segment rather
than assumed from the documentation.

**Consequence for Wave 4: nothing to replan.** Plans 34-09 through 34-14 may
keep their `(work)/…` paths, and 34-15's census assertion stands.

## Performance

- **Duration:** ~78 min
- **Tasks:** 2 of 2
- **Files moved:** 5 (2 into `(work)`, 3 outside it)
- **Files edited in place:** 1
- **Files created:** 0

## Task Commits

1. **Task 1: the assignments surface at its collapsed address** — `cf01d00` (feat)
2. **Task 2: the review surface, per-night gate intact** — `141c1a3` (feat)

## Task 2's substantive result — the gate is unchanged, and that is a checksum

The plan asks that the block re-asking `party.manage` against the night resolved
from `?party=` be *"byte-identical"*. A diff read by eye is not that claim, so
the block was extracted from both revisions and hashed:

```
$ git show 20c6fb7:<the pre-move path> > /tmp/review-before.tsx
$ awk '/── The gate, both arms, and the second one can FAIL/,/^  }$/' … 

39 lines, both sides
2cdbf86a6e750b3b4b9f409e78bff920a8057ae8  /tmp/gate-before.txt
2cdbf86a6e750b3b4b9f409e78bff920a8057ae8  /tmp/gate-after.txt
diff → exit 0
```

Re-confirmed after the last edit of the plan, not only after the first. The gate
was not simplified, not hoisted into the layout, and not wrapped in `try/catch`
— `hasCapability` still **throws** on a resolution failure rather than
returning `false`, which is D-34-08 state 3 and the one shape this phase exists
to prevent.

**The complete set of non-comment changes to the review page**, enumerated
rather than characterised:

```
-import MobileNav from "@/components/layout/MobileNav";
-import ReviewListClient from "./ReviewListClient";
-import type { UserRole, UserStatus, DoorScanEvent, EventParty } …
+import ReviewListClient from "@/app/(admin)/admin/events/[id]/review/ReviewListClient";
+import type { UserRole, DoorScanEvent, EventParty } …
-  const navStatus = ctx.status as UserStatus | null;
-    ? "/organizer/events"          +    ? "/admin/events"
-          href="/organizer/events" +          href="/admin/events"
-      <MobileNav role={navRole} status={navStatus} />
```

Nothing else. The `as UserRole` cast **survives**: `ReviewListClient` still takes
`role` for an interface affordance (the technical view offered to a master), so
it is a prop and not a decision, and converting it is not this phase's.

## The assignment arm, verified end to end

| Asked | Measured |
|---|---|
| `party.manage` binds **one** route | `routes: ["/admin/events/[id]/review"]` — one element |
| `assignmentOpenable` on that entry | present, `capability-routes.ts:301` |
| …and nowhere else | **two** entries carry it, not one — see the criterion correction below |
| The `ORGANIZER_ASSIGNMENT_ROUTES` docblock rule travelled verbatim | present, `capability-routes.ts:143-145`: *"A route earns a place here only once it already has its own server-side gate, and the list grows one route at a time, as a decision, never as a convenience."* |
| `assignmentBounceCause()` called only on `assignmentOpenable` entries | one executable call site, `middleware.ts:522`, inside `entry.assignmentOpenable ? … : null` |

Neither `capability-routes.ts` nor `src/lib/supabase/middleware.ts` appears in
this plan's diff. Both were read, neither was edited.

## Findings — recorded, not designed

### Finding 1 — `typedRoutes` found a stale address that no grep in this plan would have

Task 2's build failed, once, and the failure is the plan's most useful result
after the route-group verdict:

```
./src/app/(admin)/admin/events/[id]/review/ReviewListClient.tsx:277:17
Type error: Argument of type '`/organizer/events/${string}/review?party=${string}`'
  is not assignable to parameter of type 'RouteImpl<…>'.
```

That literal is the **night selector** — the `<select>` whose `onChange` rewrites
`?party=`. It is therefore the control that produces the input the per-night gate
judges. A stale address there is not cosmetic: it is the affordance that makes
the gate observable at all, and it is exactly what procedure M-6 will drive.

Two things worth carrying forward:

1. **This is D-34-14 working as designed.** The decision to emit the redirect
   from `src/middleware.ts` rather than declare it in `next.config` is what kept
   the route type union clean. Had the redirect been declared in `next.config`,
   its *source* would have entered the union, this literal would have compiled,
   and the sweep would have read green with a stale address in the one control
   that drives the gate — *"a false green on the exact sweep this phase exists to
   perform"*, in the research's own words. It is now observed rather than
   predicted.
2. **It complements plan 34-07's note.** 34-07 recorded that a grep on an alias
   prefix cannot see a *relative import*. This is the third case: a grep on a
   module path cannot see an *address literal* either. `typedRoutes` sees it, and
   only from the moment the destination page stops existing.

### Finding 2 — one of the plan's acceptance criteria predates a Wave-2 deviation

The plan asserts `grep -c "assignmentOpenable" src/lib/routes/capability-routes.ts`
returns **1**. It returns **9** as a raw token count (type declaration, three
docblocks, resolver), and **2** as data lines:

```
213-  [CAP.DOOR_OPERATE]: {   214-    routes: ["/admin/scanner"],   215:    assignmentOpenable: true,
299-  [CAP.PARTY_MANAGE]: {   300-    routes: ["/admin/events/[id]/review"],   301:    assignmentOpenable: true,
```

The criterion was written when the map had one such entry. Plan **34-03**
restored the door's arm as a declared Rule-2 deviation, having measured that the
code being replaced had it since Phase 35 and that without it the middleware
refuses the member of staff rostered on tonight's door.

**Executing the criterion literally would have meant deleting that arm.** The
criterion's intent — *the flag lives on route entries that each have their own
server-side gate, never on a key or a prefix* — is satisfied at two entries: the
door (`scanner/page.tsx` carries the same predicate deliberately) and this
review page (the per-night gate above). Recorded here rather than silently
passed, because a criterion that reads as satisfied when it was reinterpreted is
worse than one that fails.

### Finding 3 — the `grep → 0` criterion cannot reach 0, and must not

The plan asserts `grep -rn "organizer/events/\[id\]/{assignments,review}" src/`
returns 0. Two matches survive, and both are **required**:

```
src/lib/routes/organizer-redirects.ts:84:  ["/organizer/events/[id]/assignments", "/admin/events/[id]/assignments"],
src/lib/routes/organizer-redirects.ts:89:  ["/organizer/events/[id]/review",      "/admin/events/[id]/review"],
```

Those are the redirect table's **source addresses**. Deleting them to satisfy the
grep would delete the redirects D-34-04 requires and strand every link already
sent. Per `meta-gates.md` — *vince il piu' restrittivo* — the redirect wins and
the criterion is reinterpreted as *no reference to a module that no longer
exists*, which **is** at 0.

One match that was **not** required was removed: the moved review page's own
docblock spelled the prior address while explaining it. Rewritten to name
`organizer-redirects.ts` as the single place that address is written, per plan
34-03's recorded lesson that *a criterion a comment can defeat is a criterion
nobody can run*.

### Finding 4 — the address walk carries less here than in plan 34-05, one layer earlier

`/organizer/…` behaves exactly as required, and does so **without a session**,
which independently confirms 34-03's Task 1 claim that the translation is emitted
before any auth work:

```
/organizer/events/abc/assignments        → 307  location: /admin/events/abc/assignments
/organizer/events/abc/review?party=n-1   → 307  location: /admin/events/abc/review?party=n-1
```

The query string survives, which is load-bearing rather than tidy: `?party=` is
the input the per-night gate resolves the night from.

**Everything under `/admin` is unobservable in this worktree.** There is no
`.env.local` here, so `updateSession` throws on `createServerClient` before route
resolution and **every** `/admin` path answers 500 — an address that exists and
one that does not, indistinguishably:

```
/admin/events/abc/assignments      → 500
/admin/events/abc/does-not-exist   → 500
/admin/scanner                     → 500   ← same cause, not a scanner defect
```

This is 34-05's Finding 3 one layer earlier and one degree worse. **The evidence
that carries the claim is the build route manifest**, quoted at the top. The
scanner's untouched state rests on the diff, not on that 500:
`git diff --name-only 20c6fb7 HEAD | grep -c scanner` → **0**.

### Finding 5 — the assignments surface loses its refresh until plan 34-16

`assignments/actions.ts` moved **byte-identical** (rename similarity 100%),
including its two `revalidatePath` arguments:

```
:331  revalidatePath(`/organizer/events/${eventId}/assignments`);
:377  revalidatePath(`/organizer/events/${eventId}/assignments`);
```

After this move those revalidate an address with no page behind it, so assigning
or revoking somebody will not refresh the roster until the caller reloads. That
is precisely the silent failure D-34-16 exists for, and in a repository with no
error tracking nothing will report it.

**They were left alone deliberately, and the two plans agree in writing.**
`34-16-PLAN.md:99` states: *"plan 34-06 moved `assignments/actions.ts` unchanged,
so this plan is the first and only place they are edited."* Splitting the ten
template literals across two plans is how one half gets missed. The window is
this commit → 34-16.

**It is also the phase's named blind spot**, and it is not covered by
implication: `34-16:248` records that the two assignments calls stay
**unobserved**, because a live per-night assignment cannot be produced on demand.

## Decisions Made

1. **The three non-route modules stayed outside `(work)`, with no exception.**
   R-WORK-ROUTES was applied even though re-measurement confirmed the plan's
   claim — `actions.ts`, `AssignmentsClient.tsx` and `ReviewListClient.tsx` have
   no importer outside their own directory. The rule was applied anyway because
   34-15's census only holds if there is no exception to re-measure.
   `AssignmentsClient`'s `./actions` import survives untouched: both files
   landed in the same directory.

2. **The `/organizer/events` destinations inside the two moved pages were
   retargeted to `/admin/events`.** Three sites in `assignments`, two in
   `review`. Verdict-identical: `/organizer/events` answers with a redirect to
   `/admin/events`, and every one of those branches is reached only by somebody
   who has already cleared `organizer.access` — the key `/admin/events` is bound
   to. One hop fewer, nobody's destination changed. The `refusalDestination`
   ternary's other arm (`/dashboard`, for somebody who arrived by assignment)
   is untouched, which is the arm that mattered.

3. **`admin/members/register/page.tsx`'s citation was corrected, not carried.**
   It named the review page by its pre-move path as a template followed line for
   line. 34-07's house style: correct rather than carry, since a citation that
   silently stops resolving is what this phase removes.

4. **`getAccessContext()` is still called on both pages.** It looks redundant
   beside a layout that already resolved. It is not: the resolver is
   `cache()`-scoped so the second ask is free, and D-34-09 wants the page and
   the middleware to agree — not for one of them to stop asking.

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking] The night selector's stale address literal in `ReviewListClient.tsx`**

- **Found during:** Task 2, by `npm run build` — not by review, and not by any
  grep this plan runs.
- **Issue:** `router.push(\`/organizer/events/${eventId}/review?party=…\`)`.
  Once the page left the organizer tree the route type union no longer contained
  that address and `typedRoutes` refused it. Left uncorrected the night selector
  would route through a redirect on the one control that drives the per-night
  gate.
- **Fix:** retargeted to `/admin/events/${eventId}/review?party=…`, with the
  reason recorded in the file.
- **Verification:** `rm -rf .next && npm run build` exit 0.
- **Committed in:** `141c1a3`

**2. [Rule 1 — Stale citation] `src/app/(admin)/admin/members/register/page.tsx:39`**

- **Issue:** cited the review page by a path this plan deletes.
- **Fix:** corrected to the new path, with a note that it moved and why the
  citation is corrected rather than carried. One comment line; the file is not
  in this plan's `files_modified` and is owned by no concurrent plan — this plan
  ran alone in its wave.
- **Committed in:** `cf01d00`

**3. [Rule 1 — a comment defeating its own criterion] The moved review page's docblock**

- **Issue:** the docblock spelled the prior address while explaining the
  redirect, which would have kept the phase's sweep grep non-zero on prose.
- **Fix:** rewritten to point at `organizer-redirects.ts` as the single place
  that address is written. Plan 34-03 recorded this exact self-inflicted error
  and its remedy.
- **Committed in:** `141c1a3`

**No Rule 4 case arose.** No architectural change, no new table, no permission
granted, revoked or re-scoped, no migration, no new capability key, no package
installed. `/admin/scanner` did not move and nothing in this diff matches it.
`door.operate` keeps `requires_approved = false` — untouched, unread.

**Total deviations:** 3, all Rule 1/3, all inside files this plan owns except
one single-line comment correction.

## Verification Run

| Command | Result |
|---|---|
| `rm -rf .next && npm run build` — baseline, before any change | exit **0** (so nothing below is attributable to a pre-existing failure) |
| `rm -rf .next && npm run build` — immediately after the `git mv`, before any other edit | exit **0** — **the route-group verdict** |
| `rm -rf .next && npm run build` — after Task 1 | exit **0** |
| `rm -rf .next && npm run build` — after Task 2, first attempt | exit **1** — one error, Finding 1 |
| `rm -rf .next && npm run build` — final | exit **0**, `✓ Compiled successfully in 6.9s` |
| `npm run verify:persona` | exit **0** — 7/7, worst case 10 311 tokens of 12 000 |
| Route manifest contains `/admin/events/[id]/{assignments,review}` | yes; no route carries `(work)` |
| Gate block checksum before vs after | identical — `2cdbf86a…` both sides |
| `grep -c "ORGANIZER_ACCESS"` on the moved assignments page | **1** |
| `grep -c "PARTY_MANAGE"` on the moved review page | **1** |
| `party.manage` routes array length | **1** |
| `assignmentOpenable: true` data lines | **2** — door and review (Finding 2) |
| `assignmentBounceCause` executable call sites | **1**, inside the `assignmentOpenable` ternary |
| `git log --follow` on the four moved non-page/page files | all reach pre-move commits (`ReviewListClient` and `review/page.tsx` need no `-M` flag; both detected at 96% / 83%) |
| `git diff -M --name-status 20c6fb7 HEAD` | five renames + one modified file; **no add+delete pair** |
| `git diff --diff-filter=D --name-only 20c6fb7 HEAD` | empty — nothing deleted |
| `capability-routes.ts` / `supabase/middleware.ts` in the diff | **absent** |
| `scanner` in the diff | **absent** |
| Venue check across all five files | no venue, no address column, no `venue_reveal_sent` — read, not assumed |
| `/organizer/…` walk against `npm run dev` | both 307 to the collapsed address, query string preserved |
| `git status --porcelain` | empty before this file was written |
| `STATE.md` / `ROADMAP.md` | **not touched** — the orchestrator owns those writes |

**`npm run verify:capabilities` was not run:** it needs a live database, there is
no CI, and this plan edits no migration and no key. It stays a written pre-deploy
step (D-34-12).

**Not claimed, and it must not be inferred.** No capability refusal was observed
with a session — there are no credentials in this worktree, so every `/admin`
address answers 500 and the walk exercises only refusal state 1 and the redirect
table. Whether an organizer reaches the assignments surface, whether a member of
staff assigned to one night reaches the review surface for **that** night and is
refused on another, and whether the refusal happens **on the page rather than in
the middleware** are **procedure M-6**, and it is unrun. And **there is no test
runner for this product** — nothing here is verified because tests pass.

## Owed observations

- **M-6, in full, is owed and is recorded as owed rather than claimed.** The
  assigned night renders and another night refuses, **on the page, not in the
  middleware**. The night selector is the control that drives it, and Finding 1
  is the reason it now points at an address that exists.
- **Finding 5's window.** Between this commit and plan 34-16, the assignments
  roster does not refresh after an assign or a revoke.

## Known Stubs

None. No placeholder, no TODO, no hardcoded empty value was introduced. The
error and empty states on both surfaces are the ones the pages already carried,
and the distinction between them — which is the whole design of the assignments
page — was not touched.

## Threat Flags

None. No network endpoint, no auth path, no file-access pattern and no schema
change was introduced.

| Threat | Disposition | Evidence |
|---|---|---|
| T-34-28 — `assignmentOpenable` spreading beyond the review route | mitigated | `party.manage`'s routes array has one element; the flag appears on two entries, both named, both with their own server-side gate (Finding 2); the map is absent from this diff |
| T-34-29 — the per-night gate lost in the move | mitigated | gate block checksum identical before and after; every other changed line enumerated above. M-6 remains owed |
| T-34-30 — an assignment cause reported where no arm exists | mitigated | one executable `assignmentBounceCause()` call site, inside the `assignmentOpenable` ternary; middleware absent from this diff |
| T-34-31 — a server action reachable without its own re-check after the move | mitigated | `actions.ts` is a 100% rename — byte-identical, so no re-check could have been weakened. Server Functions POST to the route where they are **used**, not where they are defined |
| T-34-32 — a moved event surface advancing a venue reveal | accepted, **checked** | grep across all five files: no venue read, no address column, no `venue_reveal_sent`. Recorded as checked, not assumed |
| T-34-SC — package installs | mitigated | none attempted |

## User Setup Required

None.

## Next Phase Readiness

- **Wave 4 is unblocked and needs no replanning.** The arrangement its plans
  declare is the arrangement the compiler accepted. Plans 34-09…34-14 move their
  pages into `(work)/…` and leave `actions.ts` and co-located clients outside it;
  34-15's census against `(work)` stands.
- **Plan 34-03's Finding 2 is closed.** Both redirect destinations that had no
  page on disk now have one.
- **Plan 34-16** owns the two `revalidatePath` arguments in
  `admin/events/[id]/assignments/actions.ts`, at that path, unchanged, as it
  expects.
- **Plan 34-15** deletes what remains of the organizer tree. Two more of its
  `events/[id]/…` directories are gone; `analytics`, `drinks`, `edit`,
  `guest-list`, `media`, `sales` and `tickets` remain, all owned by Wave 4.
- **Plan 34-17** flips the redirect status to 308 and re-walks; both rows for
  these surfaces were observed answering 307 with the query string intact.
- **Phase 39** is unaffected. The door is outside `(work)` by construction and
  is absent from this diff.

## Self-Check: PASSED

Verified against the committed tree, not against this document:

- `src/app/(admin)/admin/(work)/events/[id]/assignments/page.tsx` — present
- `src/app/(admin)/admin/(work)/events/[id]/review/page.tsx` — present
- `src/app/(admin)/admin/events/[id]/assignments/{actions.ts,AssignmentsClient.tsx}` — present, **outside** `(work)`
- `src/app/(admin)/admin/events/[id]/review/ReviewListClient.tsx` — present, **outside** `(work)`
- `src/app/(organizer)/organizer/events/[id]/assignments/` — gone
- `src/app/(organizer)/organizer/events/[id]/review/` — gone
- `src/app/(admin)/admin/scanner/` — present, unmoved, absent from the diff
- Commits `cf01d00`, `141c1a3` — both present in `git log`
- `git status --porcelain` — empty before this file was written
- `STATE.md` and `ROADMAP.md` — **not touched**

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-10*
