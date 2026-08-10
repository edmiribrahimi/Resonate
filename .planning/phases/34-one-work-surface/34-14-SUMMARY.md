---
phase: 34-one-work-surface
plan: 14
subsystem: auth
tags: [routing, route-groups, capabilities, media-moderation, finding-f1, drift-resolution]

requires:
  - phase: 34-one-work-surface
    plan: 01
    provides: "`CAPABILITY_ROUTES` — `staff.manage` bound to `/admin/events/[id]/media`, `organizer.access` bound to sales, guest-list and analytics; and `organizer-redirects.ts`"
  - phase: 34-one-work-surface
    plan: 05
    provides: "`src/app/(admin)/admin/(work)/layout.tsx` — the two nav mounts and one access-context resolution"
  - phase: 34-one-work-surface
    plan: 06
    provides: "the measured route-group arrangement — `(work)/events/[id]/…` coexists with `admin/events/[id]/…` outside it"
  - phase: 34-one-work-surface
    plan: 07
    provides: "R-WORK-ROUTES — only route files enter `(work)`"
provides:
  - "**Finding F1 closed: `/admin/events/[id]/media` has a server-side capability check for the first time**, taken from the organizer twin, with its reason written above it"
  - "`sales`, `guest-list` and `analytics` each exist once, under `organizer.access` plus the ownership check the `/admin` twins did not have"
  - "The last four of the phase's twelve page pairs collapsed"
  - "A measured cross-plan finding: every Wave-4 plan that deletes an `/organizer/events/[id]/*` twin cannot compile in isolation until plan 34-11's `EventList.tsx` change lands"
affects: [34-11, 34-13, 34-15, 34-16, 34-17]

tech-stack:
  added: []
  patterns:
    - "A drift resolved by rendering the master-only half behind the grant that already decided it — neither widening nor deleting"
    - "A sibling-owned compile break proved resolved by a temporary, reverted probe rather than by editing the sibling's file"

key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/(work)/events/[id]/media/page.tsx (collapsed, gate added)"
    - "src/app/(admin)/admin/(work)/events/[id]/sales/page.tsx (collapsed)"
    - "src/app/(admin)/admin/(work)/events/[id]/guest-list/page.tsx (collapsed)"
    - "src/app/(admin)/admin/(work)/events/[id]/analytics/page.tsx (collapsed)"
    - "src/app/(admin)/admin/(work)/events/[id]/analytics/loading.tsx (moved)"

key-decisions:
  - "The ownership check is kept on all three of sales, guest-list and analytics — the more restrictive of the two behaviours (D-34-06); the `/admin` twins had none, and all three read with the service-role client"
  - "The two master-only analytics panels render behind `admin.access` rather than being merged flat or deleted — verdict-identical for every role, decided by an existing grant row"
  - "The sales guest-list tile merges in unconditionally, on the grant `('master','organizer.access',false)` — a master already reached the organizer twin and saw it there"
  - "`EventList.tsx` was NOT edited despite being the sole cause of the build failure: plan 34-11 owns it in this same wave. Stop and report, not repair"

patterns-established:
  - "When a criterion greps for a token, this plan's own COMMENTS must not spell it either — hit twice here, on `if (!user)` and on the two cast tokens"

requirements-completed: [STAFF-01, STAFF-03]

duration: ~95min
completed: 2026-08-10
---

# Phase 34 Plan 14: The last four pairs, and the page that stopped being naked — Summary

**The media moderation surface has a capability check of its own for the first
time — `staff.manage`, taken from its organizer twin, with finding F1 written
above it so nobody deletes it as redundant — and `sales`, `guest-list` and
`analytics` each exist once, under `organizer.access` plus the ownership check
their `/admin` twins never had.**

## Task Commits

1. **Task 1: the media surface gets its own gate — F1 closed** — `76bb99e` (feat)
2. **Task 2: collapse sales, guest-list and analytics** — `2d95893` (feat)

## What the diff is, in full

```
R056  (organizer)/organizer/events/[id]/media/page.tsx      → (admin)/admin/(work)/events/[id]/media/page.tsx
R063  (organizer)/organizer/events/[id]/sales/page.tsx      → (admin)/admin/(work)/events/[id]/sales/page.tsx
R050  (organizer)/organizer/events/[id]/guest-list/page.tsx → (admin)/admin/(work)/events/[id]/guest-list/page.tsx
R053  (organizer)/organizer/events/[id]/analytics/page.tsx  → (admin)/admin/(work)/events/[id]/analytics/page.tsx
R098  (admin)/admin/events/[id]/analytics/loading.tsx       → (admin)/admin/(work)/events/[id]/analytics/loading.tsx
D     (admin)/admin/events/[id]/{media,sales,guest-list,analytics}/page.tsx
D     (organizer)/organizer/events/[id]/analytics/loading.tsx
```

Ten paths, and **every deletion is intentional**. Note the rename pairing: git
paired four of the five with the **organizer** source rather than the `/admin`
one, because the merged content is closer to the twin — which is the honest
record, since on all four surfaces it is the twin's guard that survived. `git
log --follow` on those four therefore reaches the organizer twin's history.

Absent from the diff, asserted mechanically
(`git diff --name-only ca9aa07 HEAD | grep -cE "scanner|SalesDashboard|EventList|capability-routes|middleware"` → **0**):
`SalesDashboard.tsx`, `EventList.tsx`, `capability-routes.ts`,
`supabase/middleware.ts`, and anything matching `scanner`.

## Finding F1, closed — the substantive result of Task 1

`src/app/(admin)/admin/events/[id]/media/page.tsx` held **one** guard: a
redirect to `/login` for an absent session. Nothing else. What kept it shut was
the middleware's `/admin/*` → `admin.access` prefix rule, and **D-34-02
dissolved that rule** in plan 34-03. Left alone it would have shipped a
media-moderation surface reachable by any signed-in account.

The merged page now asks `CAP.STAFF_MANAGE` — **the twin's gate, not a chosen
one**, and the same key `capability-routes.ts:285-288` binds to this address, so
the middleware and the page read one entry and give one verdict (D-34-09).

| Asked | Measured |
|---|---|
| `grep -c "STAFF_MANAGE"` on the merged page | **2** (the import and the guard) |
| `grep -c "if (!user)"` on the merged page | **0** — the bare test is **replaced**, not accompanied |
| the comment names F1, the dissolved prefix rule, and the twin | present, above the guard |

**Why replaced rather than accompanied.** D-34-08 state 1 — *no session →
`/login`* — is kept, as `if (!ctx.userId) redirect("/login")`, but asked of the
context that already answers the capability question instead of a second
`supabase.auth.getUser()` round trip. The three states still never collapse:
no session → `/login`, capability missing → `/dashboard`, could not resolve →
the resolver **throws** and is deliberately not caught.

**Is it a widening?** No, and the grant rows say so.
`('master','staff.manage',false)` and `('organizer','staff.manage',false)`
(`20260807000000_capability_model.sql:392-393`) — role only, status ignored, so
a `pending` organizer is not newly refused. Every holder already reached the
identical content at the twin address. This is a page getting its first check.

**A naming trap worth recording for M-4:** the `staff` **role** holds
`staff.manage` by **no row**. Its only two grants are
`('staff','membership.card.view',true)` and `('staff','membership.active',true)`
(`20260808000500_staff_role.sql:122,136`). The key is named after the *question*
— *may this person manage a staff surface* — never after the role that shares
its word. So M-4's expected observation (a `staff`/`approved` account refused at
this address) follows from the grant table, and this plan asserts it **in source
only**: nothing here was observed with a session.

## The sales money question, answered

**Neither version showed a refund control, a takings figure or a payout detail
the other did not.**

- **Refund control:** both mounted `SalesDashboard` with the same six props, and
  `SalesDashboard` mounts `RefundActions` for **every** buyer row
  unconditionally — `SalesDashboard.tsx:215` (desktop table) and `:255` (mobile
  card), read, not assumed. It takes no role and no capability. So the refund
  control was on both before and is on the one surface after; this merge neither
  adds nor removes it, and it reaches no new audience.
- **Takings:** `totalRevenue`, `totalSold` and `tierSalesData` are computed by
  identical code on both.
- **Payout:** neither version has one.

**`SalesDashboard.tsx` was read and not edited**, as the plan requires. Its
`RefundActions` specifier at `:30` is
`@/app/(admin)/admin/events/[id]/tickets/RefundActions`, and that file exists at
that exact path — confirmed by `ls`. Under R-WORK-ROUTES plan 34-13 does not
move it, so the specifier is already final. Nothing was repaired.

## The guest-list door question, answered

**Neither version differed in what it can do to a check-in.** Both mounted the
same `GuestListClient` with the same three props — `entries`, `parties`,
`eventId` — and that component's props interface
(`GuestListClient.tsx:9-13`) takes **no role and no capability**, so its
affordances cannot differ by page.

What may be done to an entry is decided inside
`src/app/(admin)/admin/events/[id]/guest-list/actions.ts`, which this plan
neither moved nor edited:

```
$ git diff -M HEAD --stat -- '…/guest-list/actions.ts' '…/guest-list/GuestListClient.tsx'
(empty — no rename, no hunk)
```

Both still sit at `src/app/(admin)/admin/events/[id]/guest-list/`, **outside**
`(work)`. The attribution `community-membership.md` demands of every lane around
the gate is therefore untouched: `addGuest` still writes `added_by: userId`
(`actions.ts:138`) from an identity `assertStaffManage` + `assertEventOwnership`
resolved (`:81,:88`). Nothing in this plan could have weakened it, because
nothing in this plan reached it.

The only difference was **reachability**, resolved towards the more restrictive
— below.

## Every difference, classified

Format per plan 34-09: **drift** (neither version intentional; the grant row
decides), **guard** (the capability asked; the map decides), **cosmetic**.

### media

| # | Difference | Class | Verdict and why |
|---|---|---|---|
| 1 | `/admin` has no capability check; the twin gates on `staff.manage` | **guard** | Not a divergence to weigh: one file has one and the other does not. The map binds `staff.manage` to this address (`capability-routes.ts:285-288`). Finding F1. |
| 2 | The twin declares `export const dynamic = "force-dynamic"`; `/admin` does not | **drift** | Kept. It is a *narrowing* of caching, not a widening of access, and `nextjs-architecture.md`'s gate *cache esplicita* requires an operational surface to declare itself uncacheable rather than inherit a default. No grant needed to be more careful. |
| 3 | Function name `Admin…` / `Organizer…`; `/organizer/events` vs `/admin/events` in two links | **cosmetic** | Neutral name `MediaReviewPage`; links take the collapsed address. |

### sales

| # | Difference | Class | Verdict and why |
|---|---|---|---|
| 1 | `/admin` asks `admin.access`; the twin asks `organizer.access` | **guard** | `organizer.access` — the key the map binds (`capability-routes.ts:258`). |
| 2 | `/admin` has **no ownership check**; the twin calls `ownsOrIsMaster` | **drift** | **Kept, as the more restrictive** (D-34-06). Grant row: `('master','master.manage',false)` — a master clears `ownsOrIsMaster` through that branch *before the row is read*, so it still sees every event. An organizer reached this content at the twin under exactly this condition. Dropping it would have let any organizer read any event's service-role data. |
| 3 | `.select("id, title")` vs `"id, title, created_by"` | **drift, consequential** | Takes the twin's: the ownership check needs the column. |
| 4 | The twin counts and renders a **guest-list tile**; `/admin` does not | **drift** | **Kept.** Grant row: `('master','organizer.access',false)` (`capability_model.sql:411`) — a master holds `organizer.access` and therefore already reached the twin, where this tile was drawn. Nobody sees a figure they could not already open. It is a count of **unpaid admissions**, not a takings figure, and `ticketing-payments.md`'s guest-list gate is the reason counting them is right. |
| 5 | Nav mount, two role/status narrowings | **guard-adjacent, cosmetic** | Deleted; `(work)/layout.tsx` resolves once and draws both navs (D-34-07). |
| 6 | Function name, `/organizer/events` destinations | **cosmetic** | Neutral name; collapsed address. |

### guest-list

| # | Difference | Class | Verdict and why |
|---|---|---|---|
| 1 | `/admin` asks `admin.access`; the twin asks `organizer.access` | **guard** | `organizer.access` (`capability-routes.ts:259`). |
| 2 | `/admin` has no ownership check; the twin has one | **drift** | Kept, as sales #2, and the stake is higher: the entries are read with the service-role client and a guest-list entry is an unpaid admission. |
| 3 | `.select` gains `created_by` | **drift, consequential** | As sales #3. |
| 4 | The CR-02 comment says *"At the door"* vs *"At 01:40 at the door"* | **cosmetic** | Took `/admin`'s wording. The substantive claim — `[]` is a valid answer, so the error state is not the empty state — is identical on both and is preserved verbatim. |
| 5 | Nav mount, casts, function name, destinations | **cosmetic** | As sales #5, #6. |

### analytics

| # | Difference | Class | Verdict and why |
|---|---|---|---|
| 1 | `/admin` asks `admin.access`; the twin asks `organizer.access` | **guard** | `organizer.access` (`capability-routes.ts:261`). |
| 2 | `/admin` has no ownership check; the twin has one | **drift** | Kept, as sales #2. |
| 3 | `.select` gains `created_by` | **drift, consequential** | As sales #3. |
| 4 | **`/admin` draws two panels the twin does not** — Drink Popularity and Purchase Funnel, plus the `fetchPurchaseFunnel` call | **drift** | **Rendered behind `capabilities.has(CAP.ADMIN_ACCESS)`.** See below. |
| 5 | `loading.tsx` differs only in its function name | **cosmetic** | One survives, neutrally named. |
| 6 | Nav mount, casts, function name, destinations | **cosmetic** | As sales #5, #6. |

**Analytics #4 is the one drift that could not be merged flat, and it is the
plan's most consequential judgement.** Merging the two panels in unconditionally
would show them to an organizer, who has never been able to open this address —
`/admin/*` was judged by `admin.access`, granted to the **master alone**
(`capability_model.sql:405`) — and **no grant row says an organizer may see
them**. That is a widening, and D-34-06 forbids widening a behaviour to make a
collapse pass. Deleting them instead would take a working view away from a
master for no reason and no gain.

So they are drawn behind `admin.access` — *the exact key the `/admin` page
already asked*. Verdict-identical for every role: a master saw them and still
sees them; an organizer did not and still does not. **No capability is granted,
revoked or re-scoped to achieve it**, and the route binding stays
`organizer.access`. The funnel **query** is skipped too, not just its panel
hidden, so an organizer pays no round trip for a figure they will not be shown.
`drinkSales` is fetched for everyone, because the Drink *Sales* breakdown — which
both versions drew — reads the same rows.

This is the discretion `34-CONTEXT.md` delegates explicitly: *"What a staff role
sees of the members list and the takings, within D-34-06 — the existing grants
decide it."*

**The forbidden sentence was not written.** No verdict here rests on "the admin
version is more complete, so use it".

## The venue cross-check — recorded as checked, with what was read

`grep -rniE "venue|address|reveal"` across all eight source files returned
**22 lines, and not one of them is a venue**:

- `sales/page.tsx:27` (`/admin`) and `:49` (twin) — the word is *"email
  addresses"*, in a comment about the service-role read
- `sales:83,175,196` / `:80,179,207` and every `analytics` hit — the word is
  *"revenue"* / `RevenueCard` / `fetchEventRevenue`
- `media/page.tsx:60-61` (twin) — the word is in the **prose** of the
  venue-secrecy cross-check the twin's author already wrote

**No file reads a venue column, renders an address, or touches
`venue_reveal_sent`.** Extended one level down and read, not assumed:
`grep -rniE "venue|reveal" src/lib/analytics/event-queries.ts
src/components/media/MediaReviewGrid.tsx` → every hit is `revenue`; **zero venue,
zero reveal**. Nothing is surfaced earlier than the page it replaces did.

## The `media-and-storage` cross-check — recorded, not intended

The merge changes **nothing** about what is uploaded, what is stripped, or what
`media.upload` gates. `media.upload` is a `scope: "table"` key in the map with
the reason *"Gates a Route Handler, not a page; the guard is
`src/lib/media/may-upload.ts`"* (`capability-routes.ts:339-343`), and this plan
does not touch that handler, that guard, or the bucket.

**And the standing defect is neither introduced nor closed here.** The objects
live in a public bucket with a derivable path, so a rejected item stays
downloadable — `media-and-storage.md`, gate *moderazione = rimozione*. That is
true before this commit and after it. Adding a gate to the *review page* does
not remove an object, and this SUMMARY says so rather than letting a new guard
imply a boundary it does not create.

## Deviations from Plan

### 1. [Rule 3 — Blocking, and NOT auto-fixed] The build fails on a sibling plan's file

**Found during:** Task 1's `<verify>` gate, immediately after the organizer media
twin was deleted.

**The failure**, verbatim from the first run:

```
./src/components/events/EventList.tsx:204:15
Type error: Type '`/admin/events/${string}/media` | `/organizer/events/${string}/media`'
  is not assignable to type 'UrlObject | RouteImpl<…>'.
```

**The cause.** `EventList.tsx:37,43` declares `basePath?: "/organizer/events" |
"/admin/events"` with the organizer literal as its **default**, and builds six
hrefs from it (`:176,183,190,197,204,211`). Deleting an
`/organizer/events/[id]/*` page removes that address from the `typedRoutes`
union, and the corresponding template stops compiling. My four deletions break
four of the six lines; plan 34-13's `tickets` deletion breaks a fifth.

**Why it was NOT repaired here. `src/components/events/EventList.tsx` is
`files_modified` line 13 of `34-11-PLAN.md`, wave 4 — a plan running *right now*
in a parallel worktree**, whose acceptance criteria include `grep -c "/organizer"
src/components/events/EventList.tsx` returns 0 and *"delete the `basePath` prop
from the interface"*. Editing it here would be a guaranteed merge conflict on
lines a sibling is rewriting — the exact hazard R-WORK-ROUTES exists to prevent,
and the treatment this plan's own text prescribes for `SalesDashboard.tsx`:
**stop and report, do not repair**.

**What was done instead — proof by temporary probe, applied and reverted.**
34-11's committed change was simulated by narrowing the prop and its default to
the single `/admin/events` literal. **The mutation was asserted before its result
was read**, per the house rule of `verify-capabilities.mjs`:

```
$ git diff --stat src/components/events/EventList.tsx
 1 file changed, 2 insertions(+), 2 deletions(-)
$ grep -n 'basePath?' … → 37:  basePath?: "/admin/events";
$ grep -n 'basePath = ' … → 43:  basePath = "/admin/events",
```

With the probe in place:

```
$ rm -rf .next && npm run build
✓ Compiled successfully in 9.9s
✓ Generating static pages (45/45)
```

and the route manifest, which is what carries the claim:

```
├ ƒ /admin/events/[id]/analytics     ← collapsed, inside (work)
├ ƒ /admin/events/[id]/guest-list    ← collapsed, inside (work)
├ ƒ /admin/events/[id]/media         ← collapsed, inside (work)
├ ƒ /admin/events/[id]/sales         ← collapsed, inside (work)
├ ƒ /admin/scanner                   ← unmoved
├ ƒ /organizer/events/[id]/drinks    ← 34-12's
├ ƒ /organizer/events/[id]/edit      ← 34-11's
├ ƒ /organizer/events/[id]/tickets   ← 34-13's
```

No route carries `(work)` in its address, and the four organizer twins this plan
owns are gone from the manifest. **The probe was then reverted with `git checkout
-- src/components/events/EventList.tsx`, and `EventList.tsx` appears in neither
commit** — asserted above.

**Status: OPEN in this worktree, resolved on merge.** This is not a defect of
this plan and not a defect of 34-11; it is a **wave-level structural fact**:
every Wave-4 plan that deletes an `/organizer/events/[id]/*` twin fails
`npm run build` in isolation until 34-11's `EventList.tsx` change lands.
It is the same shape as plan 34-07's Deviation 1 — *"the move alone cannot
compile"* — one wave later and across worktree boundaries instead of across
tasks. Combining this plan's two tasks into one commit would not have changed
it, so the per-task commits were kept for the better history.

**What the orchestrator should check at merge:** after 34-11 and this plan are
both in, `rm -rf .next && npm run build` must exit 0 with no `EventList.tsx`
error. If it does not, the cause is 34-11's criterion, not this plan's diff.

### 2. [Rule 1 — a comment defeating its own criterion] Twice, on two different tokens

**Found during:** running the acceptance criteria, before either commit.

Two of this plan's criteria grep for a token, and **my own explanatory comments
spelled it**:

| Criterion | First reading | Cause |
|---|---|---|
| `grep -c "if (!user)"` on the merged media page | **2** | the comment quoted the guard it was describing, twice |
| `grep -rc "StaffNav\|MobileNav\|as UserRole\|as UserStatus"` on the three merged pages | **1** each | each comment named the casts it had just removed |

Both rewritten to describe without naming — *"a redirect to `/login` for an
absent session"*, *"the two role/status narrowings"* — with a line in each file
saying why the token is absent, so the next editor does not helpfully put it
back. Re-measured: **0 and 0**.

Plan 34-03 recorded this exact failure and 34-06 carried it forward as a pattern.
**It has now fired three times in one phase**, which makes it a property of the
work rather than an accident: a plan whose criteria are greps must keep its own
prose out of their way. Recorded here as the third occurrence.

### 3. [Measurement, not a change] `git` pairs four renames with the organizer source

`git diff -M --name-status` pairs four of the five renames with the
**`(organizer)`** file rather than the `(admin)` one (50–63% similarity),
because the merged content is closer to the twin — on all four surfaces it is the
twin's guard that survived. The `/admin` originals therefore show as `D`. This is
rename *detection*, computed at read time and stored nowhere; no content was
lost, and the surface exists once at its collapsed address, which the route
manifest confirms. Recorded so that nobody reads the four `D` lines as a
deletion of the `/admin` surfaces.

**No Rule 4 case arose.** No architectural change, no new table, no migration, no
capability granted, revoked or re-scoped, no new capability key, no package
installed, no test framework, no restyle. `/admin/scanner` did not move and
nothing in this diff matches it.

## Verification Run

| Command | Result |
|---|---|
| `rm -rf .next && npm run build` — committed tree | **exit 1**, one error, in `EventList.tsx` — Deviation 1 |
| `rm -rf .next && npm run build` — with the 34-11 probe | **exit 0**, `✓ Compiled successfully`, 45/45 static pages |
| `npm run verify:persona` | **exit 0 — 7/7 verdi**, worst case 10 311 tokens of 12 000. Check A not yet due: `src/app/(organizer)/**` still matches remaining files; the persona edit belongs to 34-15 (D-34-17) |
| `find "src/app/(admin)" -path '*events/[id]/{media,sales,guest-list,analytics}/page.tsx'` | **one path each**, all under `(work)` |
| `ls "src/app/(organizer)/organizer/events/[id]/"` | `drinks  edit  tickets` — the four twins gone, the three remaining owned by 34-11/34-12/34-13 |
| `grep -c "STAFF_MANAGE"` merged media page | **2** |
| `grep -c "if (!user)"` merged media page | **0** |
| `grep -c "ORGANIZER_ACCESS"` on sales / guest-list / analytics | **1 / 1 / 1** |
| `grep -rc "StaffNav\|MobileNav\|as UserRole\|as UserStatus"` on the four pages **and** the moved `loading.tsx` | **0 / 0 / 0 / 0 / 0** |
| `guest-list/{actions.ts,GuestListClient.tsx}` at their exact paths, outside `(work)` | present; `git diff -M HEAD --stat` on both is **empty** — no rename, no hunk |
| `SalesDashboard.tsx` in the diff | **absent**; its `RefundActions` specifier at `:30` resolves to a file that exists — confirmed by `ls`, unchanged |
| `EventList.tsx` in the diff | **absent** |
| `scanner`, `capability-routes.ts`, `supabase/middleware.ts` in the diff | **absent** — combined grep over `git diff --name-only` returns 0 |
| venue cross-check, all eight files + `event-queries.ts` + `MediaReviewGrid.tsx` | **checked, file:line recorded above** — no venue column, no address, no `venue_reveal_sent` |
| `git status --porcelain` | empty before this file was written |
| `STATE.md` / `ROADMAP.md` | **not touched** — the orchestrator owns those writes |

### The address walk, observed

Against `npm run dev` in this worktree, **without a session** — which
independently re-confirms 34-03's claim that the translation is emitted before
any auth work:

```
/organizer/events/abc/sales       → 307  location: /admin/events/abc/sales
/organizer/events/abc/guest-list  → 307  location: /admin/events/abc/guest-list
/organizer/events/abc/analytics   → 307  location: /admin/events/abc/analytics
/organizer/events/abc/media       → 307  location: /admin/events/abc/media
/admin/scanner                    → 500  — no location header, NOT matched
```

307 and not 308 is D-34-15 working as intended: the flip to permanent is plan
34-17's, after its walk is green.

**A hazard worth recording for the other Wave-4 executors:** port 3000 was
already held by a sibling worktree's dev server, and the first `curl` returned a
**404 from somebody else's tree**. Next reported the fallback to 3001 in its
startup log; a walk that does not read that log measures the wrong application.

**The `/admin/scanner` 500 is 34-06's Finding 4, unchanged:** there is no
`.env.local` in this worktree, so `updateSession` throws before route resolution
and every `/admin` address answers 500 — an address that exists and one that
does not, indistinguishably. What it *does* prove is the negative that matters:
no redirect matches the door and none points at it. The stronger evidence is the
diff, which contains nothing matching `scanner`.

## Not claimed, and it must not be inferred

- **That a `staff`/`approved` account is refused at the media surface.** That is
  **M-4**, owed to plan 34-17, and it is unrun. Until then the gate is a **source
  assertion plus a grant-table reading**, not an observation.
- **That an organizer reaches sales, guest-list or analytics and that a
  non-owning organizer is refused.** No `/admin` address is observable in this
  worktree (500, above). Those are written manual procedures.
- **That the two analytics panels are hidden from an organizer in a running
  application.** The conditional is asserted in source. It is the one behavioural
  claim of this plan a person should check first, because it is the only place
  where what a role *sees* was decided rather than carried.
- **Nothing here is verified because tests pass.** There is no test runner for
  this product (`meta-gates.md`). `npm run verify:persona` covers the persona's
  coherence, not the product's correctness.

## Known Stubs

None. No placeholder, no TODO, no hardcoded empty value was introduced. The
error and empty states on all four surfaces are the ones the pages already
carried — including the guest list's CR-02 distinction between an empty list and
a failed read, which was preserved verbatim because at the door it is the
difference between an empty list and turning away a guest who is on it.

## Threat Flags

None. No network endpoint, no auth path, no file-access pattern and no schema
change was introduced.

| Threat | Disposition | Evidence |
|---|---|---|
| T-34-67 — media moderation reachable by any signed-in account after the prefix rule dissolves | **mitigated** | The merged page asks `staff.manage`, the key the map binds; `grep -c "STAFF_MANAGE"` → 2, `grep -c "if (!user)"` → 0. **M-4 remains owed** |
| T-34-68 — a check-in behaviour changed inside a routing merge | mitigated | `guest-list/{actions.ts,GuestListClient.tsx}` show **no rename and no hunk**; the door question was answered before any edit; `added_by` attribution untouched |
| T-34-68b — `SalesDashboard.tsx` pointing at a moved `RefundActions.tsx` | mitigated | Not edited, absent from the diff; the specifier at `:30` resolves to a file confirmed present |
| T-34-69 — a takings or refund detail shown to a new audience | mitigated | The refund control is unconditional in `SalesDashboard` on both sides and reaches no new audience; the guest-list tile is named to `('master','organizer.access',false)`; the two analytics panels stay behind `admin.access` rather than widening |
| T-34-70 — a media or analytics surface advancing a venue reveal | **accepted, checked** | 22 grep hits across eight files, every one *revenue* or *email addresses* or the twin's own cross-check prose; extended to `event-queries.ts` and `MediaReviewGrid.tsx`; no venue column, no `venue_reveal_sent` |
| T-34-71 — a gate added without its reason, later removed as redundant | mitigated | The comment above the media gate names F1, the dissolved prefix rule, the twin it came from, the grant rows, and the three rejected neighbours |
| T-34-SC — package installs | mitigated | None attempted |

## Next Phase Readiness

- **All twelve page pairs of the phase are collapsed** once 34-09…34-13 land.
  This plan closed the last four.
- **Plan 34-11 must land for this worktree's build to go green.** Deviation 1
  states the exact assertion to run at merge.
- **Plan 34-15** finds four fewer directories under
  `src/app/(organizer)/organizer/events/[id]/`: only `drinks`, `edit` and
  `tickets` remain, all owned by siblings in this wave.
- **Plan 34-17** owns the 307 → 308 flip and the re-walk; all four addresses were
  observed answering 307 with the collapsed destination. It also owns **M-4**,
  which is the only observation that can turn this plan's central claim from a
  source assertion into evidence.
- **Phase 39** is unaffected. The door is outside `(work)` by construction and
  absent from this diff.

## Self-Check: PASSED

Verified against the committed tree, not against this document:

- `src/app/(admin)/admin/(work)/events/[id]/media/page.tsx` — **FOUND**
- `src/app/(admin)/admin/(work)/events/[id]/sales/page.tsx` — **FOUND**
- `src/app/(admin)/admin/(work)/events/[id]/guest-list/page.tsx` — **FOUND**
- `src/app/(admin)/admin/(work)/events/[id]/analytics/page.tsx` — **FOUND**
- `src/app/(admin)/admin/(work)/events/[id]/analytics/loading.tsx` — **FOUND**
- `src/app/(admin)/admin/events/[id]/guest-list/{actions.ts,GuestListClient.tsx}` — **FOUND**, outside `(work)`, unchanged
- `src/app/(organizer)/organizer/events/[id]/{media,sales,guest-list,analytics}/` — **GONE**
- `src/app/(admin)/admin/scanner/` — **FOUND**, unmoved, absent from the diff
- Commits `76bb99e`, `2d95893` — both present in `git log`
- `must_haves` artifacts: `media/page.tsx` contains `STAFF_MANAGE` (**2**);
  `sales/page.tsx` contains `ORGANIZER_ACCESS` (**1**)
- `key_links`: the media page asks `staff.manage`, the key
  `src/lib/routes/capability-routes.ts:285-288` binds to this address
- `STATE.md` and `ROADMAP.md` — **not touched**

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-10*
