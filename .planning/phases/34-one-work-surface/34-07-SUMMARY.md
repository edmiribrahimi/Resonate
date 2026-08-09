---
phase: 34-one-work-surface
plan: 07
subsystem: routing
tags: [refactor, route-groups, server-actions, mechanical-sweep]
requires:
  - "34-01 (the route map and the redirect table)"
provides:
  - "R-WORK-ROUTES — the phase rule that only Next.js route files enter `(work)`"
  - "the eight shared modules at a path that survives the deletion of `src/app/(organizer)/`"
  - "zero references into `src/app/(organizer)/` from outside it, middleware prose excepted"
affects:
  - "34-05, 34-06, 34-09, 34-10, 34-11, 34-12, 34-13, 34-14 — each cites R-WORK-ROUTES"
  - "34-15 — the deletion, which this plan unblocks"
  - "34-16 — the 22 `revalidatePath` calls, carried across untouched"
tech-stack:
  added: []
  patterns:
    - "non-route modules stay outside the route group that governs routing"
key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/artists/actions.ts (moved)"
    - "src/app/(admin)/admin/venues/actions.ts (moved)"
    - "src/app/(admin)/admin/events/actions.ts (moved)"
    - "src/app/(admin)/admin/events/[id]/tickets/actions.ts (moved)"
    - "src/app/(admin)/admin/events/[id]/tickets/RefundActions.tsx (moved)"
    - "src/app/(admin)/admin/events/[id]/guest-list/actions.ts (moved)"
    - "src/app/(admin)/admin/events/[id]/guest-list/GuestListClient.tsx (moved)"
    - "src/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager.tsx (moved)"
decisions:
  - "R-WORK-ROUTES declared here once: non-route modules never enter `(work)`"
  - "One commit, not two — the move without the sweep cannot compile, and this repo has no CI"
  - "Three stale path citations corrected rather than carried, resolving a conflict between two of the plan's own criteria in favour of the more restrictive one"
metrics:
  duration: "~35 min"
  completed: 2026-08-09
requirements: [STAFF-01]
---

# Phase 34 Plan 07: Move the shared modules out of the organizer tree — Summary

Eight server-action and client modules relocated from `src/app/(organizer)/` to
`src/app/(admin)/admin/...` with `git mv`, and every one of the 33 import
specifiers that named them rewritten — so that `src/app/(organizer)/` can be
deleted in Wave 4 without taking a public ticket purchase with it.

**Commit:** `4c1b9e3`

---

## R-WORK-ROUTES — declared here, cited everywhere else

> **Only Next.js route files enter `(work)`.**
> `page.tsx` and `loading.tsx` move into `src/app/(admin)/admin/(work)/...`.
> **Every other module — `actions.ts`, co-located client components — stays at
> its `src/app/(admin)/admin/...` path, outside the group, exactly where this
> plan puts it.** A moved page reaches its former siblings with an absolute
> `@/app/(admin)/admin/...` specifier; that edit is *inside the page*, so it
> belongs to the plan that moves the page and to no other.

The rule is declared in one place on purpose. A route group governs **routing**
and nothing else, so a non-route module gains nothing by entering `(work)` —
while moving it would change its specifier and force an edit in every importer,
and those importers are owned by sibling plans running in parallel worktrees
where a sibling's `git mv` is invisible to `grep`.

**Consequence: no external import specifier changes after this plan.** Plans
34-05, 34-06, 34-09, 34-10, 34-11, 34-12, 34-13 and 34-14 cite this; none needs
to re-derive it.

---

## What moved

| From | To | similarity |
|---|---|---|
| `(organizer)/organizer/artists/actions.ts` | `(admin)/admin/artists/actions.ts` | 100% |
| `(organizer)/organizer/venues/actions.ts` | `(admin)/admin/venues/actions.ts` | 99% |
| `(organizer)/organizer/events/actions.ts` | `(admin)/admin/events/actions.ts` | 100% |
| `(organizer)/organizer/events/[id]/tickets/actions.ts` | `(admin)/admin/events/[id]/tickets/actions.ts` | 99% |
| `(organizer)/organizer/events/[id]/tickets/RefundActions.tsx` | same directory under `(admin)` | 100% |
| `(organizer)/organizer/events/[id]/guest-list/actions.ts` | same directory under `(admin)` | 100% |
| `(organizer)/organizer/events/[id]/guest-list/GuestListClient.tsx` | same directory under `(admin)` | 100% |
| `(organizer)/organizer/events/[id]/drinks/DrinkMenuManager.tsx` | same directory under `(admin)` | 100% |

`git diff -M --cached --stat` showed all eight as renames, never as add+delete
pairs.

**History follows.** Spot-checked on four of the eight — each reaches commits
from before this plan:

```
src/app/(admin)/admin/events/actions.ts
  4c1b9e3 refactor(34-07): sposta gli otto moduli condivisi …
  9da50e6 refactor(33-09): delete the two verifyOrganizer/verifyEventOwnership pairs
  a36b7d9 fix(security): stop trusting an inbound role header …

src/app/(admin)/admin/events/[id]/tickets/actions.ts
  4c1b9e3 · 9da50e6 · cea0d62

src/app/(admin)/admin/events/[id]/guest-list/GuestListClient.tsx
  4c1b9e3 · 8a7b6e3 · 105efca

src/app/(admin)/admin/artists/actions.ts
  4c1b9e3 · 5b70357 (CR-01) · 41b7f7d (33-10)
```

The docblocks recording decisions from Phases 25, 31, 33 and 43 still reach the
commits that made them.

---

## The sweep: 36 matches to 2

**Before**, re-measured 2026-08-09 rather than trusted:
`grep -rn '(organizer)/organizer' src/` → **36 matches across 31 files**.
(The plan said 28 files; the file count was the number that had drifted, not
the match count.)

**After:**

```
$ grep -rn '(organizer)/organizer' src/
src/lib/supabase/middleware.ts:69: *   - `src/app/(organizer)/organizer/page.tsx` — a bare `redirect()`, nothing
src/lib/supabase/middleware.ts:71: *   - `src/app/(organizer)/organizer/events/[id]/media/page.tsx` — had none
```

Both surviving matches are **prose inside the `:66-74` docblock**, not imports.
That file is one of plan **34-03**'s two files, and 34-03 rewrites that exact
block to the measured truth in this same wave. Two plans editing the same
comment is a merge conflict over a sentence, so it was left alone. The scoped
grep the plan asserts returns **0**; after both plans merge the unscoped grep is
0, and 34-15 asserts that at the deletion.

`src/lib/supabase/middleware.ts` is **absent from the commit's file list** —
verified with `git show --name-only --format="" HEAD | grep -c middleware` → 0.

`/admin/scanner` is likewise absent: `git show --stat HEAD | grep -c scanner` → 0.
Nothing in this plan matched it or pointed at it.

---

## The five `(admin)/admin/events/**/page.tsx` files, verified line by line

`git diff -U0` on the five, pasted in full, with a statement per file:

```diff
diff --git a/src/app/(admin)/admin/events/[id]/drinks/page.tsx b/src/app/(admin)/admin/events/[id]/drinks/page.tsx
--- a/src/app/(admin)/admin/events/[id]/drinks/page.tsx
+++ b/src/app/(admin)/admin/events/[id]/drinks/page.tsx
@@ -7 +7 @@ import MobileNav from "@/components/layout/MobileNav";
-import { getDrinkItems } from "@/app/(organizer)/organizer/events/actions";
+import { getDrinkItems } from "@/app/(admin)/admin/events/actions";
@@ -9 +9 @@ import type { UserRole, UserStatus } from "@/types/database";
-import DrinkMenuManager from "@/app/(organizer)/organizer/events/[id]/drinks/DrinkMenuManager";
+import DrinkMenuManager from "@/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager";
diff --git a/src/app/(admin)/admin/events/[id]/edit/page.tsx b/src/app/(admin)/admin/events/[id]/edit/page.tsx
--- a/src/app/(admin)/admin/events/[id]/edit/page.tsx
+++ b/src/app/(admin)/admin/events/[id]/edit/page.tsx
@@ -8 +8 @@ import EventForm from "@/components/events/EventForm";
-import { updateEvent } from "@/app/(organizer)/organizer/events/actions";
+import { updateEvent } from "@/app/(admin)/admin/events/actions";
@@ -30,4 +30,5 @@ export default async function AdminEditEventPage({ params }: EditEventPageProps)
-  // `updateEvent`, which calls `verifyOrganizer` and then
-  // `verifyEventOwnership` inside itself (`(organizer)/organizer/events/
-  // actions.ts:318-322`, verified — not assumed). Adding a check here would
-  // create a NEW refusal path on a surface whose behaviour must not change.
+  // `updateEvent`, which calls `assertStaffManage` and then
+  // `assertEventOwnership` inside itself (`(admin)/admin/events/
+  // actions.ts:314-316`, re-measured 2026-08-09 — not assumed). Adding a check
+  // here would create a NEW refusal path on a surface whose behaviour must not
+  // change.
diff --git a/src/app/(admin)/admin/events/[id]/guest-list/page.tsx b/src/app/(admin)/admin/events/[id]/guest-list/page.tsx
--- a/src/app/(admin)/admin/events/[id]/guest-list/page.tsx
+++ b/src/app/(admin)/admin/events/[id]/guest-list/page.tsx
@@ -8 +8 @@ import MobileNav from "@/components/layout/MobileNav";
-import GuestListClient from "@/app/(organizer)/organizer/events/[id]/guest-list/GuestListClient";
+import GuestListClient from "@/app/(admin)/admin/events/[id]/guest-list/GuestListClient";
diff --git a/src/app/(admin)/admin/events/[id]/tickets/page.tsx b/src/app/(admin)/admin/events/[id]/tickets/page.tsx
--- a/src/app/(admin)/admin/events/[id]/tickets/page.tsx
+++ b/src/app/(admin)/admin/events/[id]/tickets/page.tsx
@@ -12 +12 @@ import DiscountCodeCard from "@/components/tickets/DiscountCodeCard";
-import RefundActions from "@/app/(organizer)/organizer/events/[id]/tickets/RefundActions";
+import RefundActions from "@/app/(admin)/admin/events/[id]/tickets/RefundActions";
diff --git a/src/app/(admin)/admin/events/new/page.tsx b/src/app/(admin)/admin/events/new/page.tsx
--- a/src/app/(admin)/admin/events/new/page.tsx
+++ b/src/app/(admin)/admin/events/new/page.tsx
@@ -7 +7 @@ import EventForm from "@/components/events/EventForm";
-import { createEvent } from "@/app/(organizer)/organizer/events/actions";
+import { createEvent } from "@/app/(admin)/admin/events/actions";
```

| File | Hunks | Statement |
|---|---|---|
| `[id]/drinks/page.tsx` | 2 | both `+`/`-` pairs are `import` statements |
| `[id]/edit/page.tsx` | 2 | one pair is an `import` statement; **one is a `//` comment** — see the conflict below |
| `[id]/guest-list/page.tsx` | 1 | the `+`/`-` pair is an `import` statement |
| `[id]/tickets/page.tsx` | 1 | the `+`/`-` pair is an `import` statement |
| `new/page.tsx` | 1 | the `+`/`-` pair is an `import` statement |

**Stronger, and asserted mechanically across all 37 files, not just these five:**

```
$ git diff -M --cached | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' \
    | grep -vE '^[+-] *(//|\*|\})' | grep -vE '^[+-](import|} from|              )' | sort -u
(no output)
```

**Zero executable lines changed in the whole plan.** Every one of the 48
insertions and 44 deletions is an `import` statement or a comment.

---

## The five ticketing / drinks actions, read back by hand

There is no test runner and no automated proof of the purchase path, so each was
read back at its new path:

| Action | New path | Imported by |
|---|---|---|
| `purchaseTicket` | `@/app/(admin)/admin/events/actions` (`:538`) | `(public)/events/[slug]/TierSelection.tsx:4`, `(public)/events/[slug]/PendingIntentHandler.tsx:4` |
| `purchaseDrinks` | `@/app/(admin)/admin/events/actions` (`:963`) | `(public)/events/[slug]/DrinkMenu.tsx:4` |
| `redeemDrinkToken` | `@/app/(admin)/admin/events/actions` (`:1106`) | `(public)/events/[slug]/RedeemConfirmationModal.tsx:4` |
| `getDrinkItems` | `@/app/(admin)/admin/events/actions` (`:808`) | `(public)/events/[slug]/menu/page.tsx:7`, plus the `(admin)` and `(organizer)` drinks pages |
| `validateDiscountCode` | `@/app/(admin)/admin/events/[id]/tickets/actions` (`:469`) | `(public)/events/[slug]/TierSelection.tsx:5` |

None of the five lost an import. The two files that import from **two** moved
modules — `src/components/events/EventForm.tsx` (`artists/actions` +
`venues/actions`) and `src/app/(public)/events/[slug]/TierSelection.tsx`
(`events/actions` + `events/[id]/tickets/actions`) — each had **both**
specifiers rewritten, confirmed in the diff.

---

## Capability re-checks: untouched

T-34-33 asserted mechanically over the whole staged diff:

```
$ git diff -M --cached | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' \
    | grep -E 'assertStaffManage|verifyMaster|ownsOrIsMaster|CAP\.|hasCapability|assertCatalogueManage|assertEventOwnership'
+  // `updateEvent`, which calls `assertStaffManage` and then
+  // `assertEventOwnership` inside itself (`(admin)/admin/events/
```

Two matches, **both `//` comment lines** in the corrected citation described
below. No executable re-check was read, edited or moved. Every moved action
remains a public POST endpoint that re-asks its own question inside itself —
which is the property that made moving them safe, and the one `access-gating.md`
warns against mistaking for redundancy next to the middleware.

---

## `revalidatePath`: carried across, not edited

| | grep matches | actual calls |
|---|---|---|
| before the move | 27 | **22** |
| after the move | 27 | **22** |

(The 5-match gap is the `import { revalidatePath } from "next/cache"` line in
each of the five action files.)

Distribution, at the **new** paths, for plan 34-16:

| File | Calls |
|---|---|
| `(admin)/admin/events/actions.ts` | 8 |
| `(admin)/admin/events/[id]/tickets/actions.ts` | 6 |
| `(admin)/admin/artists/actions.ts` | 3 |
| `(admin)/admin/venues/actions.ts` | 3 |
| `(admin)/admin/events/[id]/guest-list/actions.ts` | 2 |

Ten of these are the backtick template literals that the double-quoted grep in
34-16's ancestry could not see — six in `tickets/actions.ts`, two in
`guest-list/actions.ts`, and two more in `assignments/actions.ts` which plan
34-06 moves. **No argument was changed here.** Splitting a matched
`/admin/…` + `/organizer/…` pair across two plans is how one half gets deleted.

---

## Deviations from Plan

### 1. [Rule 3 — Blocking] One commit, not two

**Found during:** Task 1, at its `<verify>` gate.

**Issue:** Task 1's acceptance criteria include `rm -rf .next && npm run build`
exits 0. That is unreachable in isolation: the eight `git mv` calls leave 33
import specifiers pointing at files that no longer exist, and `next build` is
this repo's typecheck. The move alone **cannot** compile.

**Fix:** Both tasks executed in the plan's order and committed as one atomic
commit (`4c1b9e3`), with the build gate run once at the end. Splitting them
would have put a tree that cannot compile onto a branch that merges to `main`,
in a repository with **no CI** where `npm run build` is the entire verification
gate (`meta-gates.md`, *il gate della verifica, in un repo senza test*). Task 1's
other four criteria — eight renames, `git log --follow`, no re-check hunk,
identical `revalidatePath` count — are all verifiable on that single commit via
`git diff -M`, and are evidenced above.

**Commit:** `4c1b9e3`

### 2. [Rule 3 — Blocking] Three relative imports the plan's grep could not see

**Found during:** Task 2, after the sweep drove `grep -rn '(organizer)/organizer'`
to zero but before the build.

**Issue:** Three surviving `(organizer)` pages import the moved client
components **relatively** — `./DrinkMenuManager`, `./RefundActions`,
`./GuestListClient` — so they carry no `(organizer)/organizer` substring and are
**invisible to the grep the plan uses as its instrument**. The scoped grep would
have read 0 with three broken imports still present. Only `npm run build` could
have found them, and only after the fact.

**Fix:** rewritten to absolute `@/app/(admin)/admin/...` specifiers in:
- `src/app/(organizer)/organizer/events/[id]/drinks/page.tsx:10`
- `src/app/(organizer)/organizer/events/[id]/tickets/page.tsx:13`
- `src/app/(organizer)/organizer/events/[id]/guest-list/page.tsx:9`

The last two are **not** in the plan's `files_modified` frontmatter, though both
fall inside Task 2's declared `src/app/(organizer)/organizer/**` glob. Both are
collapsed in Wave 4 (34-11…34-14), a later wave, so no sibling races them.
`./actions` in `events/[id]/assignments/*` and `./ReviewListClient` in
`review/*` were left alone — those files belong to plan 34-06.

**Note for later plans:** a grep on an alias prefix cannot see a relative
import. Where a module moves, the sweep must also run
`grep -rn 'from "\.' <the old directory tree>`.

**Commit:** `4c1b9e3`

### 3. [Rule 1 — Stale citation] Three path references corrected, not carried

**Found during:** Task 2, and it is a **conflict between two of the plan's own
acceptance criteria**, resolved per `meta-gates.md` (*vince il piu' restrittivo.
Documenta il conflitto nel commit*).

**The conflict:** the grep-to-zero criterion requires every
`(organizer)/organizer` substring in `src/` to go, including three that live in
**prose comments**, not imports. The "changes to import lines only, no body
hunks" criterion would forbid touching them. The grep is the more restrictive
gate and also the plan's automated `<verify>`, so it wins — and the plan's own
Task 1 already mandates exactly this treatment for docblock cross-references:
*"correct them to the new path … this repository's house style is to correct
rather than carry."*

All three were **already stale before the move**, in their line numbers and in
the function names they cite — so carrying the path across would have produced a
citation that now *resolves* and sends the reader to unrelated code, which is
worse than one that obviously does not:

| File | Was | Now |
|---|---|---|
| `(admin)/admin/events/[id]/edit/page.tsx:30-33` | `verifyOrganizer` / `verifyEventOwnership` at `(organizer)/organizer/events/actions.ts:318-322` — those two functions were deleted in 33-09, and `:318-322` now points at `validateEventData` and the service-client branch | `assertStaffManage` / `assertEventOwnership` at `(admin)/admin/events/actions.ts:314-316`, re-measured |
| `(public)/artists/[slug]/page.tsx:87-90` | "re-checks identity and role" at `…/artists/actions.ts:125-137` — `:125-137` is `checkArtistExists` | "re-checks the catalogue-manage capability" at `(admin)/admin/artists/actions.ts:207`, re-measured |
| `(public)/venues/[slug]/page.tsx:151-153` | "re-checks identity and role" at `…/venues/actions.ts:125-137` | "re-checks the catalogue-manage capability" at `(admin)/admin/venues/actions.ts:198`, re-measured |

The substantive claim of all three comments — *the action re-asks its own
question inside itself, so the page-level gate need not be duplicated* — was
**true before and is true after**. Only the citation moved, and it now points at
the line it names.

**Commit:** `4c1b9e3`

### 4. [Measurement correction] Which moved files held a specifier vs. a docblock

The plan states that two of the eight moved files carry
`@/app/(organizer)/organizer/...` **import specifiers**
(`events/[id]/tickets/actions.ts`, `venues/actions.ts`). Measured: those two
carry **docblock path references**, and the one real import specifier among the
eight is `events/[id]/drinks/DrinkMenuManager.tsx:10`. All three were corrected;
the correction set is the same size, only its composition differed.

---

## Authentication Gates

None. No package was installed, no credential was needed, no external service
was contacted.

---

## Verification

| Gate | Result |
|---|---|
| `rm -rf .next && npm run build` | **exit 0** — `✓ Compiled successfully in 6.9s`, zero type errors |
| `grep -rn '(organizer)/organizer' src/ \| grep -v '^src/lib/supabase/middleware.ts:'` | **0 matches** |
| `npm run verify:persona` | **exit 0 — 7/7 verdi.** Check A not yet due: `src/app/(organizer)/**` still matches the remaining page files, and the persona edit belongs to 34-15 in the same commit as the deletion (D-34-17) |
| `git diff -M --stat` | eight renames, no add+delete pairs |
| `git log --follow` on the moved modules | reaches pre-move commits |
| `revalidatePath` call count | 22 before, 22 after |
| capability re-check hunks | none — the two grep hits are `//` comment lines |
| executable lines changed | **zero** |
| `src/lib/supabase/middleware.ts` in the commit | **absent** |
| `/admin/scanner` in the commit | **absent** |
| STATE.md / ROADMAP.md | **untouched**, as the orchestrator requires |

**Not claimed: that a ticket purchase works.** There is no test runner for this
product, and nothing here may be called verified because tests pass. What is
claimed is that every import specifier resolves — which the compiler proves —
and that the five ticketing and drinks action names are imported by the same
`(public)` components as before, which was read back by hand and tabulated
above. The behavioural proof is a real purchase against a real SumUp checkout,
and it is not this plan's; it belongs with the phase's written manual
procedures.

**Persona context budget** re-measured green at 10 311 tokens against a 12 000
ceiling; the worst case is `src/app/api/cron/venue-reveal/route.ts`. This plan
widened no `paths:`.

---

## Known Stubs

None. No placeholder, no TODO, no hardcoded empty value was introduced — this
plan wrote no new logic, only paths.

---

## Threat Flags

None. This plan created no network endpoint, no auth path, no file-access
pattern and no schema change. It moved existing surface without changing what
any of it asks: the trust boundary *public browser → server action* is in the
same place, guarded by the same re-checks, and the set of callers each action
admits is byte-identical before and after.

---

## Self-Check: PASSED

Created/moved files, all present:

```
FOUND: src/app/(admin)/admin/artists/actions.ts
FOUND: src/app/(admin)/admin/venues/actions.ts
FOUND: src/app/(admin)/admin/events/actions.ts
FOUND: src/app/(admin)/admin/events/[id]/tickets/actions.ts
FOUND: src/app/(admin)/admin/events/[id]/tickets/RefundActions.tsx
FOUND: src/app/(admin)/admin/events/[id]/guest-list/actions.ts
FOUND: src/app/(admin)/admin/events/[id]/guest-list/GuestListClient.tsx
FOUND: src/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager.tsx
```

Source paths, all gone:

```
GONE: src/app/(organizer)/organizer/artists/actions.ts
GONE: src/app/(organizer)/organizer/venues/actions.ts
GONE: src/app/(organizer)/organizer/events/actions.ts
GONE: src/app/(organizer)/organizer/events/[id]/tickets/actions.ts
GONE: src/app/(organizer)/organizer/events/[id]/tickets/RefundActions.tsx
GONE: src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts
GONE: src/app/(organizer)/organizer/events/[id]/guest-list/GuestListClient.tsx
GONE: src/app/(organizer)/organizer/events/[id]/drinks/DrinkMenuManager.tsx
```

Commit: `FOUND: 4c1b9e3`

The `must_haves.artifacts` entry — `src/app/(admin)/admin/events/actions.ts`,
`min_lines: 200` — measured at **1201 lines**. The `key_links` entry —
`src/components/events/EventList.tsx` importing the event actions via a
specifier matching `admin/events/actions` — present at `EventList.tsx:10`.
