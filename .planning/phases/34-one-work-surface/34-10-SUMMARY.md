---
phase: 34-one-work-surface
plan: 10
subsystem: auth
tags: [routing, route-groups, capabilities, members, membership-register, folded-todo]

requires:
  - phase: 34-one-work-surface
    plan: 01
    provides: "`CAPABILITY_ROUTES` — `/admin/members` on `organizer.access`, `/admin/members/growth` on `admin.access`, `/admin/members/register` on `register.read`"
  - phase: 34-one-work-surface
    plan: 03
    provides: "the middleware rewritten to one map lookup — the prefix rule that made `register.read` unreachable is gone"
  - phase: 34-one-work-surface
    plan: 05
    provides: "`src/app/(admin)/admin/(work)/layout.tsx` — both nav mounts and one access-context resolution"
  - phase: 34-one-work-surface
    plan: 06
    provides: "the measured verdict that `(work)/…` coexists with `admin/…` outside the group"
  - phase: 34-one-work-surface
    plan: 07
    provides: "R-WORK-ROUTES — only route files enter `(work)`"
  - phase: 43-role-model-account-creation
    provides: "D-19 (`register.read` requires `approved`), D-20 (an organizer may create an account directly as organizer), and the `('organizer','register.read',true)` grant"
provides:
  - "**One `members` surface** — the phase's largest divergence collapsed, on `organizer.access`, with the account-creation form and an unconditional way into the register"
  - "The whole `members` tree under the work layout: `members`, `members/growth`, `members/register`"
  - "**The folded todo closed by construction** — `register-read-unreachable-for-organizers`, with an empty `supabase/` diff across the entire phase as its evidence"
  - "A correction to the mechanism the phase had been describing by shorthand: map patterns are EXACT, not prefixes, so a parent binding never competes with a child's"
affects: [34-15, 34-16, 34-17]

tech-stack:
  added: []
  patterns:
    - "A collapsed page names, in its own docblock, the grant that decided each resolved divergence — so the reasoning survives the reviewer"
    - "A stale comment describing a defect is corrected in the commit that removes the defect, never carried"

key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/(work)/members/page.tsx (moved + merged — the pair)"
    - "src/app/(admin)/admin/(work)/members/loading.tsx (moved)"
    - "src/app/(admin)/admin/(work)/members/growth/page.tsx (moved)"
    - "src/app/(admin)/admin/(work)/members/growth/loading.tsx (moved)"
    - "src/app/(admin)/admin/(work)/members/register/page.tsx (moved)"
    - "src/app/(organizer)/organizer/members/{page,loading}.tsx (deleted)"
    - ".planning/todos/completed/register-read-unreachable-for-organizers.md (moved from pending/, closing note added)"

key-decisions:
  - "The guard moves to `organizer.access` — the organizer twin's own key, and the key the map binds to `/admin/members`"
  - "`<CreateAccountForm />` is kept for organizers on D-20 + `createAccount`'s `staff.manage` re-check; D-34-06 permits it because an existing grant already said so"
  - "The register link stays UNCONDITIONAL — a pending organizer sees a link that leads to a refusal, and that is the honest behaviour"
  - "No permission edited: zero files and zero commits under `supabase/` across the whole phase"
  - "The `(work)` route group's exactness — not a precedence rule — is what keeps `growth` master-only"

requirements-completed: [STAFF-01, STAFF-03]

metrics:
  duration: "~55 min"
  completed: 2026-08-10
---

# Phase 34 Plan 10: The `members` pair collapses — Summary

**The phase's largest divergence is one file, every resolved difference names the
capability that decided it, and the folded todo closed with `git diff --name-only
99b8b89..HEAD -- supabase/` returning nothing at all — no migration, no grant, no
`requires_approved` flip, no new key.**

## The claim this plan existed to test

The plan called itself *"the smallest true test of the whole phase"*: if the
collapse is real, the register defect disappears **without anyone editing a
permission**. It did.

| Asked | Measured |
|---|---|
| `git diff --name-only 99b8b89..HEAD -- supabase/` | **empty** — 0 files, 0 commits, across the entire phase |
| `grep -ci "register" src/lib/supabase/middleware.ts` | **0** — no special case, no new prefix rule |
| `register.read`'s `routes` array | **1** element, `/admin/members/register` |
| The grant, read at source | `20260808002000_membership_register.sql:130` — `('organizer', 'register.read', true)`, exactly where it always was |
| `src/lib/capabilities/keys.ts` in this plan's diff | **absent** (the phase changed only its docblocks, in an earlier plan — no key added) |

The four checks are reproduced in the closing note on the todo file itself, so
the evidence travels with the artefact rather than only with this document.

## The four divergences, and the grant that decided each (D-34-05)

The two files were 171 and 118 lines. The organizer page was **missing things
the capability model already permitted** — that is the direction the drift ran,
and it is why the collapse resolves towards *more* three times without widening
anything.

| Divergence | Verdict | The grant that decided it |
|---|---|---|
| Guard `admin.access` vs `organizer.access` | **`organizer.access`** | `capability-routes.ts:253` binds `/admin/members` there, and the organizer twin already asked exactly that key. `admin.access` was the *prefix's* meaning (D-34-02), never this surface's |
| `<CreateAccountForm />`, absent on the organizer side | **kept** | **D-20 of Phase 43** — *an organizer may create an account directly as organizer* — plus `createAccount`'s own `staff.manage` re-check, which an organizer holds. D-34-06 satisfied: an existing grant already said so |
| The `Membership acts →` link, absent on the organizer side | **kept, unconditional** | `('organizer','register.read',true)`, granted since Phase 43 and unreachable only because of the prefix rule this phase dissolves |
| `AnimatedSection` | **kept**, from the admin file | **Cosmetic** — and named as cosmetic in the file, so nobody later reads it as a difference that meant something |

`growth` keeps `admin.access`. `register` keeps `register.read`. Neither guard
changed in key or in meaning.

### The edge that was handled rather than tidied

`register.read` carries `requires_approved = true` — **D-19's non-negotiable
requirement** — so a `pending` organizer who reaches `/admin/members` sees a link
that leads to a refusal. That was already true on the master side, and it stays
true. Making the link conditional would have been a navigation change with no
matching server change: the inverse of STAFF-03, and worse, because *a link that
vanishes tells the holder of a granted capability that they do not hold it.*

`grep -n "capabilities.has"` on the merged page returns **one** line — the guard.
Nothing wraps the link.

**`register.read` is not gated on `staff.manage`**, and that was checked rather
than assumed: `staff.manage` carries `requires_approved = false` and would admit
an organizer whose own access was never approved. The flag is not flipped either
— the door depends on it (D-06 of Phase 43).

## Attribution paths: none removed, none bypassed

`community-membership.md`, gate *chi decide è tracciato*. The register — the
reading without which the recording is a table nobody opens — **gained a way in
for organizers and lost nothing**. `actions.ts` is absent from this diff, so no
act's author-recording path was touched, and the link that makes the register
reachable is now drawn on a surface an organizer opens instead of one they were
bounced from.

## R-WORK-ROUTES, and why `MemberTable.tsx` is not in this diff

`actions.ts`, `CreateAccountForm.tsx` and `MemberActionNotice.tsx` stayed at
`src/app/(admin)/admin/members/`, outside `(work)`.

```
$ ls "src/app/(admin)/admin/members/"
CreateAccountForm.tsx   MemberActionNotice.tsx   actions.ts
```

`git diff --name-only ca9aa07..HEAD` over those three paths: **0**. No rename at
any similarity threshold. `src/components/admin/MemberTable.tsx` — the surface
that approves and rejects members — is **absent from this plan's diff entirely**,
and its three import specifiers at `:13`, `:17` and `:20` are unchanged.

The merged page reaches its former sibling with an absolute specifier,
`@/app/(admin)/admin/members/CreateAccountForm` — an edit **inside** the page,
which is the only file that carried it.

## Verification Run

| Command | Result |
|---|---|
| `rm -rf .next && npm run build` — baseline, before any change | exit **0** (so nothing below is attributable to a pre-existing failure) |
| `rm -rf .next && npm run build` — after Task 1 | exit **0** |
| `rm -rf .next && npm run build` — after Task 1's comment correction | exit **0** |
| `rm -rf .next && npm run build` — final, after Task 2 | exit **0** |
| `npm run verify:persona` | exit **0** — 7/7, worst case 10 311 tokens of 12 000 |
| `node scripts/verify-routes.mjs` check 2 (route census) | **ok** — 23 pages under `src/app/(admin)`, every one resolves to a pattern in the map |
| `node scripts/verify-routes.mjs` check 1 | **FAIL, expected and unchanged** — 29 calls, the worklist plan 34-16 owns; the six `/organizer/members` lines are exactly the six pairs left alone |
| Route manifest | `/admin/members`, `/admin/members/growth`, `/admin/members/register` present; **`/organizer/members` gone**; no route carries `(work)` |
| `find "src/app/(admin)" -path '*members*' -name page.tsx` | **4** — see Finding 1; the `members` **tree** has exactly 3 |
| `grep -rc "StaffNav\|MobileNav\|as UserRole\|as UserStatus"` over the moved tree | 0 for four files, **2** for `members/page.tsx` — see Finding 2 |
| `git diff -M` grep for `revalidatePath` / `assertStaffManage` / `verifyMaster` | **0** |
| `grep -c "revalidatePath" admin/members/actions.ts` | **17** — 16 call sites plus the import, before and after |
| `supabase/`, `capabilities/`, `routes/`, `middleware.ts`, `MemberTable.tsx`, `scanner/` in this plan's diff | **0 files** |
| `src/app/(organizer)/organizer/members/` | **gone** |
| `git status --porcelain` | empty before this file was written |
| `STATE.md` / `ROADMAP.md` | **not touched** — the orchestrator owns those writes |

**`npm run verify:capabilities` was not run:** it needs a live database, there is
no CI, and this plan edits no migration and no key. It stays a written pre-deploy
step (D-34-12).

**Not claimed, and it must not be inferred.** *That an organizer can now open the
register is not verified here.* The type system cannot see who reaches an address,
and there are no credentials in this worktree. **Until M-2 runs, the todo's
closure is a construction argument, not an observation** — and the plan required
those words. **There is no test runner for this product**; nothing above is
verified because tests pass.

## Findings — recorded, not designed

### Finding 1 — a criterion's `find` catches a fourth page that is not in this tree

`find "src/app/(admin)" -path '*members*' -name page.tsx | wc -l` returns **4**,
not the 3 the criterion asks:

```
src/app/(admin)/admin/(work)/analytics/members/page.tsx   ← a different surface
src/app/(admin)/admin/(work)/members/page.tsx
src/app/(admin)/admin/(work)/members/growth/page.tsx
src/app/(admin)/admin/(work)/members/register/page.tsx
```

The fourth is `/admin/analytics/members`, moved by plan 34-05 and absent from
this plan's diff. `*members*` matches it. The criterion's intent — *the members
tree has exactly three pages* — **holds**, and the extra match is named here
rather than passed silently, because a criterion that reads as satisfied after
being reinterpreted is worse than one that fails.

### Finding 2 — two `as UserRole` casts survive, and deleting them would be a type error

The criterion asks `grep -rc "StaffNav\|MobileNav\|as UserRole\|as UserStatus"`
to return 0 for every file under the moved tree. It returns 0 for four files and
**2** for `members/page.tsx`:

```
127:    role: m.role as UserRole,
128:    status: m.status as UserStatus,
```

These are **not** the nav casts the criterion targets. They narrow two `profiles`
columns for `MemberTable`'s prop type, inside the row-flattening `.map()`, and
**both original pages carried them identically** (admin `:77-78`, organizer
`:85-86`). Deleting them would not remove a cast; it would fail the build.

The casts the criterion means — `const navRole = role as UserRole | null` — are
gone from all five files, together with every `StaffNav` and `MobileNav` mount:
`grep -c "StaffNav\|MobileNav"` over the whole moved tree returns **0**.

### Finding 3 — the phase has been describing its own resolution mechanism by a shorthand that is weaker than the truth

The plan, and threat T-34-48, say *"longest-literal-match makes
`/admin/members/growth` beat `/admin/members`"*. Read at the source, that is not
what happens, and the real mechanism is **stronger**:

```
capability-routes.ts:523
  if (candidate.segments.length !== segments.length) return false;
```

`matchesPattern` requires an **equal segment count**, so patterns are **exact,
not prefixes** — the module's own docblock says so at `:553`: *"`/admin` opens
`/admin` and nothing below it."* `/admin/members` is two segments and
`/admin/members/growth` is three, so the parent **never matches the child's
address at all**. It is not beaten; it never competes. The `dynamicCount`
tiebreak at `:562` settles a different kind of case — `/admin/events/new` against
an `[id]` sibling — and has no live case in this three-way nesting.

The consequence for the todo is worth stating plainly: the todo's own warning was
that *a new rule inserted carelessly reproduces the scanner hazard*. **There is
no ordering to get wrong here.** The map is not a list of rules tested in
sequence.

A comment written earlier in this same plan repeated the shorthand; it was
corrected in the second commit, in the file where it stood.

### Finding 4 — the register page was carrying a paragraph describing the defect this plan closes

`register/page.tsx:150-158` recorded, correctly at the time, that
*"at this address an organizer holding the capability is bounced before this file
runs"* and that the collapse belonged to Phase 34. Carrying that into the moved
file would have left a stale statement that a later reader re-reads as current —
the exact failure `34-CONTEXT.md` names about the middleware comment at `:66-74`.

Corrected rather than carried, in the same commit that removed the defect, and
the replacement names the mechanism (D-34-02, the map binding, D-19's
`requires_approved = true`) rather than only the outcome.

## Decisions Made

1. **The `<h1>` on the merged page is `Members`, not `Admin`.** The admin file
   said `Admin` — that was the prefix speaking, and after D-34-02 the word
   `admin` in a URL no longer describes who is on it. `growth` keeps its
   `Admin` heading: it is genuinely master-only, and the plan scoped it to nav
   mounts and casts only. The vocabulary question beyond this is phases 40/41's.

2. **The `loading.tsx` files lost their tab-bar skeletons.** `(work)/layout.tsx`
   mounts the real `StaffNav` **outside** the loading boundary, so a skeleton
   inside it draws a second row of pills under a nav already rendered. The same
   edit, with the same comment, that plan 34-05 made on
   `(work)/analytics/loading.tsx` — followed rather than re-derived.

3. **The todo went to `.planning/todos/completed/`, not `done/`.** The plan said
   to check the repository's convention first. `ls .planning/todos/` showed only
   `pending/`, so the convention came from the tooling that creates them
   (`add-todo.md:23` — `mkdir -p .planning/todos/pending .planning/todos/completed`).

4. **`getAccessContext()` is still called on every moved page.** It looks
   redundant beside a layout that already resolved. It is not: the resolver is
   `cache()`-scoped so the second ask is free, and D-34-09 wants the page and the
   middleware to agree — not for one of them to stop asking. Carried from plan
   34-06's decision 4.

## Deviations from Plan

### Auto-fixed

**1. [Rule 1 — stale comment] `register/page.tsx`'s paragraph on the very defect this plan closes**

- **Found during:** Task 1, reading the file before moving it.
- **Issue:** it stated as current that an organizer is bounced from this address
  by `admin.access`. True on 2026-08-08; false the moment this commit lands.
- **Fix:** replaced with a paragraph naming what closed it and, explicitly, that
  no permission was edited. Finding 4.
- **Committed in:** `778a519`

**2. [Rule 1 — a duplicated nav] the two `loading.tsx` tab-bar skeletons**

- **Found during:** Task 1, after the move put both files under a layout that
  already mounts `StaffNav`.
- **Issue:** a skeleton row of pills drawn under an already-rendered real nav.
- **Fix:** removed, with the same comment plan 34-05 wrote on the analytics
  loading file. Decision 2.
- **Committed in:** `778a519`

**3. [Rule 1 — a comment that would defeat its own criterion] my own docblock spelling `revalidatePath`**

- **Found during:** Task 1, running the acceptance criterion against the staged
  diff — it matched three lines, all prose.
- **Issue:** an acceptance criterion greps this diff for the token; a comment
  that trips it is plan 34-03's recorded self-inflicted error.
- **Fix:** rephrased to *"cache-revalidation argument"*, with the reason written
  beside it. The criterion now reads **0**. One inherited match on
  `ownsOrIsMaster` survives — carried verbatim from the original file on both
  sides of the rename, explaining a real null-coercion hazard, and therefore not
  removed to satisfy a grep.
- **Committed in:** `778a519`

**4. [Rule 1 — an inaccurate mechanism in a comment I had just written] "longest-literal match"**

- **Found during:** Task 2, reading `resolveRoute` at the source for check 4
  instead of quoting the plan.
- **Issue:** the shorthand describes a precedence that does not exist; the actual
  guarantee is exactness. Finding 3.
- **Fix:** the growth page's docblock now names `matchesPattern`'s equal-length
  requirement and cites the line.
- **Committed in:** `629a0fd`

**No Rule 4 case arose.** No architectural change, no new table, no migration, no
permission granted, revoked or re-scoped, no new capability key, no package
installed, no test framework, no visual redesign. `/admin/scanner` did not move
and nothing in this diff matches it.

**Total deviations:** 4, all Rule 1, all inside files this plan owns.

## Owed observations

- **M-2 and M-3 are owed and are recorded as owed rather than claimed.** M-2: an
  `organizer` / `approved` account renders `/admin/members/register`. M-3: an
  `organizer` / `pending` account is **refused** there — `register.read` requires
  approved, and that refusal is the proof D-19 survived the collapse. Until M-2
  runs, the todo's closure is a construction argument, not an observation.
- **The account-creation form has not been exercised by an organizer.** D-20
  permits it and `createAccount` re-checks `staff.manage`; that an organizer
  actually completes a creation from this surface is unobserved.
- **`/organizer/members` now answers by redirect only.** `organizer-redirects.ts:80`
  carries the row; plan 34-17 flips it to 308 and re-walks.
- **The six `/organizer/members` cache-revalidation arguments are still there**,
  as plan 34-16 expects, and until it runs the members list may not refresh from
  that half of each pair. No error tracking will report it.

## Known Stubs

None. No placeholder, no TODO, no hardcoded empty value was introduced. The error
and empty states on all three surfaces are the ones the pages already carried,
and the register's distinction between *empty* and *unreadable* — the one place a
silent failure would read as reassurance — was not touched.

## Threat Flags

None. No network endpoint, no auth path, no file-access pattern and no schema
change was introduced.

| Threat | Disposition | Evidence |
|---|---|---|
| T-34-47 — the merged surface admitting somebody the organizer twin refused | mitigated | `organizer.access` **is** the twin's own key, unchanged; the `CreateAccountForm` addition rests on D-20 and on `createAccount`'s `staff.manage` re-check, both cited in the file |
| T-34-48 — `growth` opened to organizers by the collapse | mitigated | `growth` keeps `admin.access`; the map binds it there; and the separation is exactness, not precedence — the parent pattern cannot match a three-segment address (Finding 3) |
| T-34-49 — the register opened by editing a grant | mitigated | `supabase/` diff empty across the whole phase — 0 files, 0 commits; `grep -ci "register"` on the middleware returns 0; the grant read at source, unchanged |
| T-34-50 — a members list that stops refreshing | transferred to 34-16, **asserted unchanged** | 16 call sites before and after; `git diff -M` matches the token 0 times |
| T-34-51 — a nav link hidden from somebody who holds the capability | mitigated | the register link is unconditional, its comment survives and was extended with the `pending` edge; one `capabilities.has` on the page, and it is the guard |
| T-34-52 — a member named in a published planning document | mitigated | this SUMMARY and the todo's closing note name **roles only** — `master`, `organizer`, `staff`, `member` |
| T-34-52b — `MemberTable` losing three imports | mitigated | the three non-route modules did not move; no rename at any threshold; `MemberTable.tsx` absent from this diff; its three specifiers unchanged |
| T-34-SC — package installs | mitigated | none attempted |

## User Setup Required

None.

## Next Phase Readiness

- **Plan 34-15** — one more organizer directory gone. `artists`, `events`,
  `venues` and `organizer/page.tsx` remain.
- **Plan 34-16** — `admin/members/actions.ts` is at that path, unchanged, with
  its 16 calls intact, exactly as that plan expects.
- **Plan 34-17** — M-2 and M-3 are the procedures that turn this plan's
  construction argument into an observation, and the redirect row for
  `/organizer/members` is due its 308.
- **Phase 39** is unaffected. The door is outside `(work)` by construction and is
  absent from this diff.

## Self-Check: PASSED

Verified against the committed tree, not against this document:

- `src/app/(admin)/admin/(work)/members/page.tsx` — present, guards on `ORGANIZER_ACCESS`, renders `<CreateAccountForm />`, links to `/admin/members/register`
- `src/app/(admin)/admin/(work)/members/loading.tsx` — present
- `src/app/(admin)/admin/(work)/members/growth/{page,loading}.tsx` — present, `ADMIN_ACCESS`
- `src/app/(admin)/admin/(work)/members/register/page.tsx` — present, `REGISTER_READ`
- `src/app/(admin)/admin/members/{actions.ts,CreateAccountForm.tsx,MemberActionNotice.tsx}` — present, **outside** `(work)`, absent from the diff
- `src/app/(organizer)/organizer/members/` — gone
- `.planning/todos/completed/register-read-unreachable-for-organizers.md` — present; `pending/` copy gone
- `src/components/admin/MemberTable.tsx` — absent from the diff
- Commits `778a519`, `629a0fd` — both present in `git log`
- `STATE.md` and `ROADMAP.md` — **not touched**

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-10*
