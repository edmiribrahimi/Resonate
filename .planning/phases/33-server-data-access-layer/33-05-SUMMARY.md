---
phase: 33-server-data-access-layer
plan: 05
subsystem: access-gating
tags: [capabilities, dal, admin, header-identity, cap-05]
requires:
  - "getAccessContext().userId (33-01)"
  - "CAP.ADMIN_ACCESS (32-xx keys.ts)"
provides:
  - "eight (admin) non-event pages gating on admin.access"
  - "the page-boundary nav cast pattern the other wave-2 plans meet too"
affects:
  - "plan 33-14 (phase gate: the meter falls by 17 lines / 8 files)"
  - "phase 34 STAFF-03 (owns MobileNav/StaffNav props and deletes navRole/navStatus)"
tech-stack:
  added: []
  patterns:
    - "gate by the QUESTION (admin.access), never by the predicate that matches"
    - "resolve once at the top of the surface, pass values down as props"
    - "identity as `string | null`, narrowed with `?? \"\"` only after reading the consumer"
key-files:
  created: []
  modified:
    - src/app/(admin)/admin/analytics/page.tsx
    - src/app/(admin)/admin/analytics/compare/page.tsx
    - src/app/(admin)/admin/analytics/members/page.tsx
    - src/app/(admin)/admin/artists/page.tsx
    - src/app/(admin)/admin/venues/page.tsx
    - src/app/(admin)/admin/newsletter/page.tsx
    - src/app/(admin)/admin/members/page.tsx
    - src/app/(admin)/admin/members/growth/page.tsx
decisions:
  - "D-33-05-A: ADMIN_ACCESS on all eight — CATALOGUE_MANAGE rejected in writing for the catalogue listings"
  - "D-33-05-B: currentUserId takes `?? \"\"`; the consumer was read, and the false branch grants a UI affordance, not a permission"
  - "D-33-05-C: the UserRole/UserStatus narrowing is a cast at the PAGE boundary — the nav components were not touched"
  - "D-33-05-D: on the newsletter page a resolve failure now stops at the gate instead of drawing FailureNotice; stated, not discovered"
metrics:
  duration: "~35 min"
  completed: 2026-08-07
  tasks: 2
  commits: 2
requirements: [CAP-05]
---

# Phase 33 Plan 05: The Eight Non-Event Admin Pages Summary

Eight `(admin)` pages stopped deciding reachability from a client-supplied request
header and now ask `capabilities.has(CAP.ADMIN_ACCESS)` — the same question, of the
same authority, that the middleware already asks for `/admin/*` — while the member
management page also takes its viewer's identity from the session instead of
`x-user-id`.

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | analytics ×3, artists, venues, newsletter | `b2eec6e` | 6 pages |
| 2 | members + members/growth, and the identity rewire | `c083f11` | 2 pages |

Diffstat across both: 8 files, +166 / −64.

## The census delta — measured, not estimated

| Reading | Lines | Files |
|---|---|---|
| meter at my base (`0521203`), derived | **102** | **47** |
| meter after this plan, **run** | **85** | **39** |
| this plan's contribution | **−17** | **−8** |

The "after" row is `npm run verify:no-header-identity` actually run: it printed
`✗ 85 line(s) across 39 file(s)` and exited 1, which is the meter working as
designed until 33-14. **The "before" row is arithmetic, not a second run** — I did
not check out the base tree to re-run it. What was directly measured instead:

- `git grep -h "x-user-" <base> -- <the eight paths>` → **17 lines**;
- `grep -c` for any of the eight paths in the meter's own output → **0**.

So all 17 lines that those eight files carried are gone and none of the eight is
still named by the meter. 85 + 17 = 102, 39 + 8 = 47.

**Why this is not the 98 / 45 the phase briefing quotes.** That reading predates
wave 1. At my base, five *comment-shaped* mentions of the header names exist that
did not exist at phase start — `guards.ts:40`, `server.ts:139`, `server.ts:167`,
`database.ts:389`, `database.ts:405`, all written by 33-01 to explain what is being
replaced — and the meter counts comment-shaped lines toward its verdict by design.
The meter's own output confirms the shape of this: `85 line(s): 80 in code, 5
comment-shaped`. The number went **up** before it went down, for a documentation
reason, and a plan that reported "98 → 85" without saying so would be crediting
itself with four lines it never touched.

## Decisions

### `ADMIN_ACCESS` on all eight, chosen by the question

The question every one of these pages asks is *"may this person reach the admin
area"*. That is verbatim what `keys.ts:61-62` says `admin.access` is for and
verbatim what the middleware asks for `/admin/*`. After this plan the page gate
and the route gate ask the same question of the same authority.

`CATALOGUE_MANAGE` was refused on `admin/artists` and `admin/venues` despite the
matching word: it is granted to organizers **and** requires an approved status, so
it would both **widen** (an organizer reaching a master-only page) and **narrow** (a
`pending` master-role account refused). `MASTER_MANAGE` was refused too — it matches
the predicate today, and three of the eight keys share that predicate on purpose;
picking by predicate is invisible until phase 35.

No role list appears anywhere in the eight: `grep -n 'includes(role)'` across them
exits 1. A fourth role (`staff`) arrives one phase later, and a capability question
is fourth-role-safe by construction where `["master","organizer"].includes(role)`
is not — and would pass review as a tidy-up.

### `currentUserId` takes `?? ""` — the consumer was read

**What it is used for:** one consumer, one line. `MemberTable.tsx:173`,
`if (member.id === currentUserId) return "--"`, which suppresses the actions cell on
the viewer's **own** row.

**Whether its false branch grants anything:** it grants a *UI affordance*, not a
permission. The authoritative self-protection is server-side and does not consult
this prop — `admin/members/actions.ts:109` throws `"Cannot change own role"` when
`memberId === user.id`, with `user` from `supabase.auth.getUser()`.

**Why `?? ""` is behaviour-identical.** The regression `ownsOrIsMaster` exists to
prevent — `null == null` admitting where `"" !== null` refused — cannot arise here:
`member.id` is a non-null `profiles` primary key and the comparison is `===`, which
does not coerce, so neither `""` nor `null` ever equals a real row id. `?? ""` is
additionally identical to what shipped yesterday in the degraded case where the
`user_id` migration is not applied and a real session resolves `userId` to `null`.

**And why not widen the prop.** Widening would edit
`src/components/admin/MemberTable.tsx`, which the *organizer* members page also
renders and which belongs to another plan in this wave. The narrow change is also
the one that does not collide.

The whole argument is written at the call site in the file, not only here.

### The nav cast — the one thing the plan did not foresee

`MobileNav` is typed `role: UserRole | null, status: UserStatus | null`
(`MobileNav.tsx:8-9`) and `StaffNav` is typed `role: UserRole | null`
(`StaffNav.tsx:8`). `getAccessContext()` answers `string | null`. The conversion
contract's `<MobileNav role={role} status={status} />` therefore does **not**
type-check as written.

Resolved as a **cast at the page boundary** — two locals, `navRole` / `navStatus` —
and **not** by editing the nav components:

- Editing them would be the nav redesign this plan is explicitly not doing, and
  phase 34 (STAFF-03) would redo it against four roles.
- They are files outside this plan's `files_modified`, shared with sibling plans in
  the same wave; eleven plans editing one component is a merge conflict, not a fix.
- The cast is **the same cast the header read already made** —
  `headersList.get("x-user-role") as UserRole` — from a strictly better source:
  `profiles`, whose columns carry those unions, rather than an attacker-controllable
  request header. It is not a new weakening; it is the old one, better sourced.

**The other wave-2 plans will hit this identically.** Whoever consolidates should
know the choice was deliberate and where the four lines to delete live: every one
carries the comment naming phase 34 (STAFF-03) as their owner.

### The newsletter page's error path changed shape

`getAccessContext()` is **not** wrapped, per the contract: a resolve failure throws
and reaches Next's error boundary, with the `[capabilities.resolve_failed]` console
line as the diagnosis. Wrapping it would refuse a master exactly the way it refuses a
pending member — which is the defect this page's own history is the recorded example
of (CR-01).

One consequence, stated rather than left to be discovered: a resolve failure on this
page now stops **at the gate**, so `FailureNotice` no longer draws the
`resolve_failed` kind here. That kind is still reachable from the client actions,
which run after the gate has passed. Both outcomes are observable and distinguishable
from one another; neither is a silent failure. It is written into the file's own
docstring.

## Behaviour equivalence, argued

For an anonymous caller `getAccessContext()` returns `ANONYMOUS_CONTEXT` — empty set,
`role: null`, `status: null` — so `!capabilities.has(...)` redirects to `/dashboard`,
which the middleware turns into `/login`. The header path produced the same two hops
from `role === null`. All eight sit behind `protectedPrefixes` and are additionally
unreachable anonymously, so **this closes a coupling rather than an open hole** — and
overstating it would be the wrong claim to put in a security summary.

## Verification

**There is no test runner for this product and none was added. Nothing here is
verified because tests pass.** What was actually run:

| Check | Result |
|---|---|
| `rm -rf .next && npm run build` after task 1 | exit **0**, `✓ Compiled successfully` |
| `rm -rf .next && npm run build` after task 2 | exit **0**, `✓ Compiled successfully` |
| `grep -rni 'x-user-'` across the eight | **0 lines** |
| files containing `CAP.ADMIN_ACCESS` | **8 / 8** |
| `grep -n 'includes(role)'` across the eight | no match (exit 1) |
| `redirect("/dashboard")` per file | exactly **1** in each |
| `grep -n 'role={role}\|status={status}'` across the eight | **0** — every nav prop goes through the cast |
| `npm run verify:no-header-identity` | 85 / 39, exit 1 **by design** until 33-14 |

### Mutation proof — the build gate really sees these files

`ai-engineering.md`, gate *prova per mutazione*, and its corollary: assert the
mutation was **applied** before reading any result.

| Step | Evidence |
|---|---|
| mutation applied | `grep -n 'const navRole'` → `27:  const navRole: number = role as UserRole \| null;` |
| build with mutation | exit **1**, `./src/app/(admin)/admin/artists/page.tsx:27:9 — Type error` |
| restored | `grep -n` → `27:  const navRole = role as UserRole \| null;` |
| build after restore | exit **0** |

Wave 1 had proved the build gate sees `src/lib/`. This proves it sees
`src/app/(admin)/`, which is where this plan's work is.

*What this check would NOT catch:* it proves `next build` type-checks these files.
It says nothing about whether `ADMIN_ACCESS` is the right key or whether the gate
refuses the right people — no type error can tell you that. That is what the written
procedure below is for.

## Manual verification owed — with an honest note on what it can and cannot prove

No step here has been performed; there is no environment in this worktree to perform
it in. Written because in a repo without tests the written procedure is the only
evidence that will exist.

**1. A master still reaches all eight.** Sign in as `master` / `approved`. Visit
`/admin/analytics`, `/admin/analytics/compare`, `/admin/analytics/members`,
`/admin/artists`, `/admin/venues`, `/admin/newsletter`, `/admin/members`,
`/admin/members/growth`. **Observe:** each renders, and the staff tab bar shows
*Finance* and *Analytics* — the two tabs `StaffNav` renders only for
`role === "master"` (`StaffNav.tsx:20-28`).

*What would make this fail:* if the cast produced `null`, those two tabs would
disappear while the pages still rendered. That makes it a real check on the new
source of `role`, not decoration.

**2. An organizer and a member are still bounced.** Sign in as `organizer` /
`approved`, then as `member` / `approved`. Visit `/admin/analytics`. **Observe:**
`/dashboard`, no flash of admin content.

**3. The member table still knows the viewer's own row.** As `master`, open
`/admin/members` and find your own row. **Observe:** its actions cell shows `--`,
not buttons; every other row shows buttons.

*What would make this fail:* `userId` resolving to `null`/`""` — the exact failure
mode of this task's rewire — makes the own row show buttons like any other. **This
is the one step in this list that observes the rewired identity directly, and it is
falsifiable.** Do not skip it.

**4. The gate refuses when the grant is gone.** As `master`, inside a transaction,
revoke `admin.access` from `master` in `private.role_capabilities`; **re-read the row
and assert the revoke applied** before reading any page result; reload
`/admin/artists`; **observe** the bounce to `/dashboard`; `ROLLBACK`, re-read the row,
reload, **observe** the page render again.

⚠️ **What step 4 does not prove.** The middleware gates `/admin/*` on the *same*
capability (`middleware.ts:172-177`), so with the grant revoked the middleware
refuses first and the browser cannot tell which of the two gates fired. Step 4
proves **the capability model refuses**; it does not isolate the page-level check.
Nothing observable from a browser can, while the middleware check stands — that is
what "defense in depth" means here, and it is why the plan calls this a coupling
closed rather than a hole. The page check's correctness rests on the code being
read, the shared key, and the type-checked build. Presenting step 4 as proof of the
page gate would be a false negative dressed as evidence.

## Cross-domain impact

- **Access & gating.** Who passes each gate is unchanged: master before, master
  after. `role` and `status` remain two distinct axes and nothing collapses them;
  the gate asks neither directly. `door.operate` is untouched — no shared helper in
  this plan reaches it.
- **Venue secrecy.** `admin/venues/page.tsx` renders `venues.address`. The audience
  is unchanged, and `CATALOGUE_MANAGE` — which would have widened address visibility
  to every approved organizer — was refused partly for that reason, recorded in the
  file. `venue_reveal_sent` is not read or written anywhere in this plan; the
  monotone guard is untouched.
- **Next.js architecture.** Resolve once at the top of the surface and pass values
  down as props is Next's own guidance for the `"use client"` nav components, and is
  what these pages now do. In a page render `cache()` memoises, so the single
  destructure costs one round trip.
- **RLS.** Nothing here is an RLS change and no comment implies a page check
  substitutes for one. The reads on these pages remain subject to the same policies.

## Deviations from Plan

**1. [Rule 3 — blocking issue] The conversion contract does not type-check as
written.** `<MobileNav role={role} status={status} />` with `role: string | null`
against a `UserRole | null` prop is a build error. Fixed inline with a cast at the
page boundary (`navRole` / `navStatus`), which keeps the nav props' shape exactly and
touches no file outside this plan. Full reasoning above under *The nav cast*.
Commits `b2eec6e`, `c083f11`.

**2. [naming] The plan names the component `MembersTable`; it is `MemberTable`**
(`src/components/admin/MemberTable.tsx`), rendered by both the admin and organizer
members pages. No behavioural consequence — recorded so the next reader searching for
`MembersTable` does not conclude the file moved.

Nothing else departs from the plan. No package was installed, no dependency added, no
architectural change proposed.

## Deferred / noted, not fixed here

- **`src/app/(admin)/admin/analytics/page.tsx:4` imports `createClient` and never
  uses it.** Pre-existing, unrelated to this conversion, and in a file this plan
  otherwise touches. Left alone deliberately: removing it would put a non-CAP-05 line
  in a CAP-05 diff, and the phase's rule is not to attribute pre-existing lint to this
  change. One line, zero risk, whoever wants it.
- Pre-existing `npm run lint` state (~21 errors / ~108 warnings) untouched and
  unrelated.
- The middleware's own `x-user-*` block and its degraded path (WR-04) belong to plan
  33-14.

## Known Stubs

None. No hardcoded empty value, placeholder string, TODO or unwired component was
introduced. Every changed line replaces a working read with another working read.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access pattern and no
schema change. It removes eight surfaces' dependence on client-supplied headers and
adds one call to an existing resolver. T-33-24 through T-33-26 are mitigated as the
plan's register specifies; T-33-27 is accepted as specified (the resolve failure
throws to Next's error boundary, deliberately uncaught); T-33-28 holds because no
package was installed.

## Self-Check: PASSED

- `src/app/(admin)/admin/analytics/page.tsx` — FOUND (modified)
- `src/app/(admin)/admin/analytics/compare/page.tsx` — FOUND (modified)
- `src/app/(admin)/admin/analytics/members/page.tsx` — FOUND (modified)
- `src/app/(admin)/admin/artists/page.tsx` — FOUND (modified)
- `src/app/(admin)/admin/venues/page.tsx` — FOUND (modified)
- `src/app/(admin)/admin/newsletter/page.tsx` — FOUND (modified)
- `src/app/(admin)/admin/members/page.tsx` — FOUND (modified)
- `src/app/(admin)/admin/members/growth/page.tsx` — FOUND (modified)
- commit `b2eec6e` — FOUND in `git log`
- commit `c083f11` — FOUND in `git log`
- STATE.md, ROADMAP.md, `deferred-items.md` — NOT modified, as instructed
