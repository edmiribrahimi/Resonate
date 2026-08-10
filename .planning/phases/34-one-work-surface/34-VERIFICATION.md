---
phase: 34-one-work-surface
verified: 2026-08-10
status: human_needed
score: "4/4 requirements have matching, measured source and a green automated suite; 0/4 observed by a person signing in as a role — the nine written procedures M-1…M-9 are all unrun by the owner's decision of 2026-08-09"
must_haves_total: 4
requirements: [CAP-02, STAFF-01, STAFF-02, STAFF-03]
code_in_place: "4/4 — the total route map with both CAP-02 assertions, one work surface of 23 addresses, fifteen legacy addresses answering 308, and two menus filtering on the declaration the middleware reads"
automated_evidence: "rm -rf .next && npm run build exit 0 · npm run verify:persona 7/7 · npm run verify:capabilities 5/5 green 0 warnings · npm run verify:no-header-identity exit 0 · node scripts/verify-routes.mjs exit 0 · npm run verify:redirects 15/15 twice (307, then 308) · baseline:compare B1/B2/B3 clean"
observed_in_production: false
deployed: false
migrations_committed: 0
migrations_applied: 0
manual_procedures_written: 9
manual_procedures_executed: 0
test_runner: "none — and none was added; adding one was out of scope"
human_verification:
  - test: "M-1 — master / approved reaches all 23 addresses"
    expected: "Every nav entry present; every address renders; no address bounces"
    why_human: "No instrument in this repository can sign in as a role. The map's type-level assertions prove a route is bound; they cannot prove the binding admits the right person."
  - test: "M-2 — organizer / approved, and the folded todo"
    expected: "Finance, Analytics ×3, Newsletter and members/growth bounce to /dashboard; everything else renders; /admin/members/register RENDERS"
    why_human: "The register's closure is a construction argument until a person opens it. It is the phase's acceptance test in miniature and the only observation that turns it into evidence."
  - test: "M-3 — organizer / pending, seeded by hand"
    expected: "Events and tickets surfaces render (staff.manage ignores status); /admin/members/register BOUNCES (register.read requires approved); /admin/scanner RENDERS (door.operate has requires_approved = false, D-06 of Phase 43)"
    why_human: "43-CONTEXT D-15 forbids producing this state through the product; the row is seeded by hand. It is the observation that defends D-06 against being tidied away as redundant."
  - test: "M-4 — staff / approved sees none of the work surface"
    expected: "No staff nav entry at all; every one of the 23 addresses bounces; /membership-card and /attendance render"
    why_human: "This is 43-CONTEXT's deferred question — what a staff member sees of the members list and the takings — and the answer is NOTHING. It is currently asserted from the grant table only. It is also the only observation of the media gate plan 34-14 added."
  - test: "M-5 — member / approved is identical to M-4"
    expected: "A member and a staff account see the same staff surface, which is none"
    why_human: "Same reason as M-4; and the equality of the two is itself the claim."
  - test: "M-6 — a live per-night party.manage on the review surface"
    expected: "The assigned night renders; another night refuses ON THE PAGE, not in the middleware"
    why_human: "The per-night gate came through the move with an identical checksum, which proves it was not edited — not that it still refuses. Only a live assignment can show the refusal happening at the page."
  - test: "M-7 — the fifteen legacy addresses in a browser, SIGNED IN"
    expected: "308 to the right twin, and the twin renders"
    why_human: "The mechanical walk sends no cookie: it proves address translation and has no subject. It cannot show that the destination renders for the person who followed the link. Must be run signed in — a signed-out run measures finding F4 instead."
  - test: "M-8a/b/c — a members approval, a tier change, a guest-list edit each refresh without a manual reload"
    expected: "Each surface refreshes on its own after the act"
    why_human: "revalidatePath is untyped and invisible to every compiler. Its failure mode is a surface that silently stops refreshing, and there is no error tracking to report it."
  - test: "M-9 — the door, network off, AFTER the middleware rewrite"
    expected: "/admin/scanner renders, a night can be selected, a scan queues offline"
    why_human: "NO BEFORE EXISTS. M-9's before half was recorded human_needed in plan 34-02 and its window closed when f59776b landed. An after run has nothing to compare against, and this record must never be read as a before/after pair."
---

# Phase 34 — One Work Surface: Verification

**Two route trees are one. Twelve page pairs collapsed into twelve files,
`src/app/(organizer)/` no longer exists, fifteen legacy addresses answer **308**
— walked green at 307, flipped, and walked again — three menus read one
declaration, and one map lookup replaced three prefix rules. `/admin/scanner`
did not move, its page file was never modified in any commit of this phase, and
nothing matches it. Every automated instrument in this repository is green, and
**not one person has signed in as a role.**

---

## Three things this record says plainly, before anything else

This project treats an over-claiming verification record as worse than a gap.
These three come first so that no reader reaches them after the green table.

### 1. A green container baseline proves that no row-level permission moved — and nothing more

`baseline:compare --only=B1,B2,B3 --target=container` is clean: 72 policies
unchanged, 322 read cells compared, 966 write cells compared, nothing moved that
the whitelist does not explain.

**None of those instruments can see a route.** B1 dumps `pg_policies`; B2 and B3
are persona read/write matrices; B5 is the Supabase advisor and has no container
equivalent at all. This phase edited **no migration** — `git diff --name-only`
over the whole phase against `supabase/` is empty, 0 files and 0 commits — so
that green was **close to guaranteed before it was run**.

`34-CONTEXT.md` originally called a green comparison *"the instrument that proves
no permission moved — which for this phase is the whole claim."* **It is not the
whole claim, and this record corrects it.** What moved is **who reaches which
address**, and the only instruments for that are the map's type-level assertions
(`npm run build`) and a person signing in as each role. Nothing below lets that
green stand in for evidence it cannot produce.

### 2. M-9 was observed neither before nor after — and there is no comparison to make

`34-VALIDATION.md:92` requires the offline door scan to be run **before and
after** the middleware plan, *"not once"*. Plan 34-02 recorded M-9 (before) as
`human_needed` under the project owner's decision of **2026-08-09** that every
manual procedure of this milestone runs together at the end of v1.5. Plan 34-03
recorded M-9 (after) the same way.

A baseline deferred past its own window is **destroyed, not postponed**. The
state the "before" could have been read from stopped existing when `f59776b`
landed.

**The sentence this record is required to carry, and does:** *the door will be
observed after the change; it was **not** observed before it, so **no comparison
was made**.* It must never be written as a before/after pair, because that would
imply a comparison that cannot happen.

Unrecoverable for this phase: whether `/admin/scanner` rendered and a night could
be selected before the rewrite; the scan outcome with the radio off and whether
the entry queued; which bottom-navigation entries were present; the final URL.
**No pass is reported for any of them.**

### 3. Every manual procedure M-1 … M-9 is unrun

By the same owner decision of 2026-08-09. **Nine written, zero executed.** The
table in *The nine procedures* below names, for each one, the requirement it is
the **only** evidence for — so that a reader can tell exactly what is asserted by
construction and what is observed.

And one automated link is not automated: **`npm run verify:capabilities` needs a
live database and there is no CI in this repository.** It was run by hand for
this record, from a checkout, with credentials supplied locally and deleted
afterwards. It is a **written pre-deploy step, not an automation.**

---

## What was run for this record, 2026-08-10

| Command | Result |
|---|---|
| `rm -rf .next && npm run build` (before the flip) | **exit 0** — route manifest lists 23 `/admin` addresses, **zero** `/organizer` |
| `npm run verify:persona` | **exit 0 — 7/7**; worst case `src/app/(admin)/admin/scanner/ScannerClient.tsx`, 38 240 byte ≈ **10 622 token of 12 000** |
| `npm run verify:capabilities` | **exit 0 — 5/5 green, 0 warnings** (12 keys, 26 grants / 22 refusals, 4 roles) |
| `npm run verify:no-header-identity` | **exit 0** — 3 live deletes, 0 live sets |
| `node scripts/verify-routes.mjs` | **exit 0** — 47 literals read, **0** offenders, **0** non-literal arguments skipped; census 23 pages / 23 patterns |
| `npm run verify:redirects` — **walk 1, at 307** | **PASS, 15/15**, each row at its declared destination |
| *the flip* | `REDIRECT_STATUS` 307 → **308**, `src/lib/routes/organizer-redirects.ts:85` |
| `rm -rf .next && npm run build` (after the flip) | **exit 0** |
| `npm run verify:redirects` — **walk 2, at 308** | **PASS, 15/15**, **same fifteen destinations** |
| `npm run baseline:container -- --phase-point=post-34` | B1 72 rows · B2 322 rows, 14/14 personas, 0 vacuous · B3 966 probes, 249 refusals, 692 successes, 25 inconclusive |
| `npm run baseline:compare -- --only=B1,B2,B3 --target=container --before-point=pre-34 --after-point=post-34` | **clean** — see honesty item 1 for what that does and does not mean |

The `rm -rf .next` is not superstition: `tsconfig.json` includes
`.next/types/**/*.ts`, so a stale generated route union validates addresses that
no longer exist — a false green on the exact sweep this phase performed.

**The two walks are two measurements, and only the second describes what ships.**
They are recorded separately for that reason and never merged into one row.

---

## CAP-02 — a capability bound to no route fails the production build

| Evidence | Where |
|---|---|
| The declaration, total over `CapabilityKey` | `src/lib/routes/capability-routes.ts:172` — `export const CAPABILITY_ROUTES = {` |
| The totality assertion itself | `src/lib/routes/capability-routes.ts:344` — `} as const satisfies Record<CapabilityKey, Binding>;` |
| The **inverse** totality, achieved as a **type-level assertion** | `src/lib/routes/capability-routes.ts:394` — `const _everyStaffRouteIsBound: Unbound extends never …`, with `StaffRoute` at `:367` excluding `RouteImpl`'s query and fragment arms |
| Five keys declare `scope: "table"` with a reason naming their guard | same file — `master.manage`, `catalogue.manage`, `membership.active`, `door.supervise`, `media.upload` |

**Which inverse mechanism was achieved: the type-level assertion, not a
module-load fallback.** It reads the **value** of the map, not the type of its
element union. That distinction is the whole gate: the research's
`Extract<Binding, …>` form is **vacuous** — it compiles green on both mutations
below — and was replaced. Recorded in `34-01-SUMMARY.md`, decision 1.

### Proved by mutation, in both directions, with the mutation confirmed applied first

This repository has a recorded incident of a green read taken from a mutation
that had not applied, so `git diff --stat` was run and read **before** every
build.

| Mutation | Confirmation read first | Result |
|---|---|---|
| **A** — a 13th key with no route | `git diff --stat src/lib/capabilities/keys.ts` → `1 file changed, 1 insertion(+)` | **build fails**, `TS1360` at the `satisfies` line, naming the missing key |
| **B1** — a staff route deleted from the map (`register.read`'s routes emptied) | `git diff --stat` → `1 insertion(+), 1 deletion(-)`; `grep -n 'routes: \[\],'` → `248` | **build fails**: `Type 'boolean' is not assignable to type '["UNBOUND", "/admin/members/register"]'` |
| **B2** — the **typo**, which is the failure that actually happens (`/admin/newsletter` → `/admin/newsleter`) | `git diff --stat` → `1 insertion(+), 1 deletion(-)`; `grep -n 'newsleter'` → `206` | **build fails**, naming **`/admin/newsletter`** — the route that lost its binding, not the one that was written |

B2 is the discriminating test: under the research's form both B1 and B2 compile
green. Every mutation was reverted and `git status --porcelain` confirmed empty.

### The chain, and its link with no automation

> CAP-02 holds as a chain. `private.capabilities` ↔ `CAP` is asserted by
> `npm run verify:capabilities`, **which needs a live database**. `CAP` ↔ routes
> is asserted by `npm run build`, which needs no credential. The map ↔ the pages
> on disk is asserted by `node scripts/verify-routes.mjs`. **There is no CI in
> this repository** — `.github/` is absent and `package.json` carries no test or
> CI script — so the first and third links run only when a person runs them. They
> are **written pre-deploy steps, not automations**, and a deployer who assumes
> the Vercel build covers them is assuming a check that does not exist.

Two further reasons a green `verify:capabilities` side 4 misleads, both written
into that script's docblock by plan 34-16:

- **(a) the route map is itself under `src/`**, so binding a key to a route
  **makes** that key "asked for" by side 4's own definition. Binding produces the
  green; the green does not evidence the binding. `CAP.MEMBERSHIP_CARD_VIEW` has
  exactly one reference anywhere under `src/` — line 311 of the map — and its
  green is produced entirely by its route binding.
- **(b)** `door.supervise` and `media.upload` were green **before** this phase,
  because their Route Handler guards landed, not because any route did.

---

## STAFF-01 — each work surface exists once

### The census, measured today

```
$ find "src/app/(admin)" -name page.tsx | wc -l
      23
$ test -d "src/app/(organizer)" && echo EXISTS || echo GONE
GONE
$ grep -rn '(organizer)' src/ .claude/rules/ CLAUDE.md | wc -l
       0
$ find "src/app/(admin)/admin/(work)" -type f ! -name page.tsx ! -name loading.tsx ! -name layout.tsx | wc -l
       0
```

23 = **22 work surfaces inside `(work)` + the door outside it**. The pre-phase
count was 21 under `(admin)` and 15 under `(organizer)` (`34-02-SUMMARY.md`).
The last empty line is R-WORK-ROUTES holding across every plan of the phase
**without one exception**, which is the only reason the census can be quoted as
evidence rather than as a hope.

### The twelve pairs, each with the grant row that decided its guard

| # | Surface | Guard after | The row that decided it | Plan |
|---|---|---|---|---|
| 1 | `/admin/artists` | `organizer.access` | `('organizer','organizer.access',false)` | 34-09 |
| 2 | `/admin/venues` | `organizer.access` | same row | 34-09 |
| 3 | `/admin/members` | `organizer.access` | same row; the account-creation form kept on **D-20** + `createAccount`'s own `staff.manage` re-check; the register link kept **unconditional** on `('organizer','register.read',true)` | 34-10 |
| 4 | `/admin/events` | `organizer.access` for **reachability**, `master.manage` for **row scope** | `capability-routes.ts:254`; `master.manage` declared `scope: "table"` — *gates rows, not addresses* | 34-11 |
| 5 | `/admin/events/new` | `organizer.access` | `capability-routes.ts:255` | 34-11 |
| 6 | `…/[id]/edit` | `organizer.access` **+ the ownership check the `/admin` twin lacked** | `20260807010000_policies_to_capabilities.sql:255` (the `events` UPDATE policy) — the check mirrors it | 34-12 |
| 7 | `…/[id]/drinks` | `organizer.access` + ownership kept | same policy | 34-12 |
| 8 | `…/[id]/tickets` | `organizer.access` + **the whole 33-line ownership branch kept** | `('master','master.manage',false)` short-circuits; every non-master falls to `ownsOrIsMaster` | 34-13 |
| 9 | `…/[id]/media` | **`staff.manage` — the page's first capability check ever** | `('master','staff.manage',false)`, `('organizer','staff.manage',false)`, `20260807000000_capability_model.sql:392-393` | 34-14 |
| 10 | `…/[id]/sales` | `organizer.access` + ownership kept; the guest-list tile kept on `('master','organizer.access',false)` | `capability_model.sql:411` | 34-14 |
| 11 | `…/[id]/guest-list` | `organizer.access` + ownership kept | same | 34-14 |
| 12 | `…/[id]/analytics` | `organizer.access` + ownership kept; **the two master-only panels render behind `admin.access`** rather than merged flat or deleted | `20260807000000_capability_model.sql:408` — `('master','admin.access',false)` is the **only** row for that key, so it is the master's alone | 34-14 |

Two organizer-only surfaces moved with everything else and are **not** pairs:
`…/[id]/assignments` and `…/[id]/review` (34-06). The review page's per-night
`party.manage` gate was proved **byte-identical across the move by checksum** —
`2cdbf86a6e750b3b4b9f409e78bff920a8057ae8`, both sides, 39 lines — not by reading
a diff and judging it.

### Two results worth naming, because both invert what a plan assumed

- **Pair 8's premise was inverted.** `34-13-PLAN.md` describes the `/admin` twin
  as the larger one carrying the ownership branch. Measured: `/admin` was 365
  lines with **no** ownership check, the organizer twin 413 lines **with** one.
  Trusting the plan would have dropped the check on the way to a wider guard —
  the exact failure the plan existed to prevent, arriving through its own text.
- **Pair 9 is the phase's single most consequential save.** The media surface's
  only guard was `if (!user) redirect("/login")`. What kept it shut was the
  `/admin/*` → `admin.access` prefix rule that D-34-02 dissolved. Left alone, the
  phase would have shipped a media-moderation surface reachable by **any
  signed-in account**.

**Nothing was widened to make a collapse pass.** `git diff --name-only` over the
whole phase against `supabase/` is **empty**: no migration, no grant, no
`requires_approved` flip, no new capability key.

---

## STAFF-02 — the old addresses keep working, permanently

### The two walks

| | Status | Rows | Destinations |
|---|---|---|---|
| **Walk 1**, before the flip | **307** | 15/15 ok | each at its declared twin |
| **Walk 2**, after the flip | **308** | 15/15 ok | **the same fifteen** |

`REDIRECT_STATUS` is at `src/lib/routes/organizer-redirects.ts:85`. The walk
script reads that constant from the module rather than hardcoding it (proved by
mutation in plan 34-08, proof 5), so the flip needed no edit to the check.

**The order is the safeguard, not a formality.** A 308 is a fourth monotone
guard in the sense of `meta-gates.md`: a browser caches it and it does not come
back, so a wrong one cannot be withdrawn from a client that has already seen it.
There is no error tracking to notice that a wrong one shipped. The flip happened
**after** a green walk and the walk was **re-run after it**.

### The door, and the fence that is still holding

| Assertion | Where | State after the flip |
|---|---|---|
| No row may name the scanner on either side | `src/lib/routes/organizer-redirects.ts:147` — a module-load `throw` | **holds** — `grep -n scanner` returns 7 hits, **none in a row**: 4 docblock, 1 fence comment, 2 the fence itself |
| The door's address resolves to `door.operate` **and** is assignment-openable | `src/lib/supabase/middleware.ts:162-180` — a second module-load assertion | **holds** — both clauses proved able to fire in plan 34-03, transcripts in that summary |
| The walk's own door check | `scripts/verify-organizer-redirects.sh` | **`/admin/scanner` answered 307 → `/login` on BOTH walks** |

That last row is the observation the flip makes worth having: the fifteen table
rows moved from 307 to 308 and **the door did not**, because it is not in the
table. Its 307 is the unauthenticated bounce, which the script deliberately
accepts as an access mechanism and refuses to confuse with a relocation.

No `Location` in either walk contained `/scanner`.
`src/app/(admin)/admin/scanner/page.tsx` appears in **no commit of this phase**
(`git log` over the phase range on that path: 0 commits).

**What the walk cannot do:** it sends no cookie. It proves address translation
and **has no subject** — it says nothing about who may see a destination. That
half is **M-7**, and M-7 must be run **signed in**, because a signed-out run
measures finding F4 instead of the redirect and would report a false failure.

---

## STAFF-03 — navigation generated from capabilities

| Evidence | Where |
|---|---|
| The seven staff tabs declared **once**, each with its capability | `src/lib/routes/staff-tabs.ts:125` — `export const STAFF_TABS` |
| Each tab **verified against the map at module load**, throwing when the two disagree | `src/lib/routes/staff-tabs.ts:104` — `const resolution = resolveRoute(tab.href);` |
| **One** filter, called by both menus | `src/lib/routes/staff-tabs.ts:138` — `visibleStaffTabs(...)` |
| The tab bar's call site | `src/components/staff/StaffNav.tsx:57` |
| The account menu's call site — the same function, not a second walk | `src/components/account/ManagementSection.tsx:42` |
| The middleware reading the **same declaration** | `src/lib/supabase/middleware.ts:495` — `const entry = resolveRoute(pathname);` |
| An unmapped staff path fails **closed**, by segment and not by prefix | `src/lib/supabase/middleware.ts:197` and `:528` — `isUnderWorkTree` |
| The door's address read from the map instead of typed a second time | `src/lib/rbac/roles.ts` — behind a one-element tuple annotation, so binding a second address is a build error naming the file |
| `revalidatePath` targets an address a route serves | `node scripts/verify-routes.mjs` — **exit 0**, 47 literals, 0 offenders |

**Neither menu resolves anything.** Both receive the resolved capability array as
a prop; `grep -c "capabilities/server\|capabilities/guards"` returns 0 on both.

**What holds by construction, and what does not.** A **drawn** entry has a
matching server-side rule, because the nav and the middleware read one
declaration and cannot disagree about the *key*. **The converse does not hold**,
and neither menu claims it does: a hidden entry is not a protected route. The
refusal is the middleware's and the boundary on the data is the RLS policy.
Whether the key bound to a route is the **right** key is **M-1 … M-6**, and no
type can hold that.

---

## What the instruments cannot see

- **The container baseline cannot see a route.** B1 dumps `pg_policies`, B2 and
  B3 are persona matrices, B5 is the advisor. **None of them can see a route.**
  Restated here in those words because the phase is required to carry it.
- **`npm run build` cannot see a string.** 99 hardcoded `/admin…` / `/organizer…`
  literals across 42 files were strings, not types. `typedRoutes: true` converted
  a large share of them into type errors — and it earned that decision twice, at
  `ReviewListClient.tsx:277` (the night selector, the one control that drives the
  per-night gate) and at `EventForm.tsx:437` (the destination after creating or
  editing an event). Neither would have been found by any grep this phase ran.
- **No compiler can see a `revalidatePath` argument.** `scripts/verify-routes.mjs`
  is the only reader. Its blind spots are declared and one of them is a measured
  number: **0** non-literal arguments today, so it is a number and not an
  impression. A path built by concatenation remains invisible.
- **A module-load throw is not a build error.** Plan 34-01 hoped that importing
  `organizer-redirects.ts` from `src/middleware.ts` would make its `/scanner`
  fence build-enforced. Plan 34-03 measured, with the import in place, that it
  **does not**: importing a module gets it bundled, not evaluated. The throw
  fires on the **first request after deploy**. What it buys is a loud 500 on
  every covered route rather than a door that quietly refuses the people rostered
  to work it.
- **`verify:persona` proves coherence, not correctness.** Its own closing note
  says so. A green means the files agree with each other.
- **Nothing here is verified because tests pass.** There is **no test runner for
  this product**, none was added, and adding one was out of scope.

---

## The nine procedures — all `human_needed`, and what each is the only evidence for

**Nine written. Zero executed.** Deferred by the project owner's decision of
**2026-08-09**, reaffirming the decision of 2026-08-06, that every manual
procedure of this milestone runs together at the end of v1.5. Recorded as
deferred, with their dates — **not** as passes.

| # | Role / state | Status | The **only** evidence it can produce |
|---|---|---|---|
| **M-1** | `master` / `approved` | `human_needed` — not run, owner decision 2026-08-09 | **STAFF-01 + STAFF-03.** That the collapsed surface renders for the role that has always reached everything. Asserted by construction only. |
| **M-2** | `organizer` / `approved` | `human_needed` — not run, 2026-08-09 | **STAFF-01 + STAFF-03, and the folded todo.** That `/admin/members/register` **renders** for an organizer. Until it runs, `register-read-unreachable-for-organizers` is closed **by a construction argument, not an observation** — plan 34-10 required those words. Also the only check that Finance, Analytics ×3, Newsletter and `members/growth` still bounce. |
| **M-3** | `organizer` / **`pending`** | `human_needed` — not run, 2026-08-09; and the row must be **seeded by hand** (43-CONTEXT D-15 forbids the state through the product) | That `register.read`'s `requires_approved = true` **survived** the collapse, and that **`/admin/scanner` renders** for a pending organizer — the observation that defends D-06 against being tidied away as redundant. |
| **M-4** | `staff` / `approved` | `human_needed` — not run, 2026-08-09 | **43-CONTEXT's deferred question, and the media gate.** That a `staff` account reaches **none** of the 23 addresses and sees **no** staff nav entry. It **is** checked against the grant table: `staff` holds exactly `('staff','membership.card.view',true)` and `('staff','membership.active',true)`, `20260808000500_staff_role.sql:122,136` — and **nothing else**, so it holds neither `organizer.access` nor `staff.manage`. **Checked against the table is not observed**, and the difference is the whole point of running it. It is also the only observation of plan 34-14's new `staff.manage` gate on the media surface. |
| **M-5** | `member` / `approved` | `human_needed` — not run, 2026-08-09 | That a member and a staff account see the same staff surface, which is none. The **equality** is the claim. |
| **M-6** | any role holding a **live per-night** `party.manage` | `human_needed` — not run, 2026-08-09; also needs a live assignment | That the assigned night renders and another **refuses on the page, not in the middleware**. The checksum proves the gate was not edited; only this shows it still refuses. The night selector is the control that drives it. |
| **M-7** | signed in, any staff role | `human_needed` — not run, 2026-08-09 | That the **308 destination renders** for the person who followed the link. The mechanical walk has no subject. **Must start signed in** — see F4. |
| **M-8a** | `organizer` / `approved`, `/admin/members` | `human_needed` — not run, 2026-08-09 | That the surviving half of each of the **six** members pairs was the right half. The pairs are listed with their enclosing functions in `34-16-SUMMARY.md`: `deactivateMember`, `reactivateMember`, `approveMember`, `rejectMember`, `runBulk`, `createAccount`. Any of the four approval paths on that surface exercises it; the list is the cross-reference. |
| **M-8b** | same, `/admin/events/[id]/tickets` | `human_needed` — not run, 2026-08-09 | **Six** of the ten template-literal calls plan 34-16 rewrote live here, and **no earlier procedure watched them**. |
| **M-8c** | same, `/admin/events/[id]/guest-list` | `human_needed` — not run, 2026-08-09 | **Two more** of the ten. |
| **M-9** | door device, **network off** | `human_needed` — **after not run, and before NEVER OBSERVED** | See honesty item 2. There is no baseline. When the after runs it must be recorded as *observed after, not observed before, no comparison made.* |

### The gap M-8 does **not** cover, written rather than implied

**The two `revalidatePath` calls in
`src/app/(admin)/admin/events/[id]/assignments/actions.ts` stay unobserved.**
Observing them needs a **live per-night assignment, which cannot be produced on
demand**, and no procedure in this phase substitutes for one. `human_needed`,
for that reason.

M-8b and M-8c must **not** be read as covering it. Three surfaces observed out of
four is a measurement; calling it four is the failure this project treats as
worse than the gap.

---

## Anti-patterns found

**Searched, then reported.**

```
$ grep -rn "TODO\|FIXME\|XXX:\|@ts-ignore\|@ts-expect-error" \
    "src/app/(admin)" src/lib/routes/ src/lib/supabase/middleware.ts src/middleware.ts \
    src/lib/rbac/roles.ts src/components/staff/ src/components/account/ \
    src/components/events/EventList.tsx src/components/events/EventForm.tsx \
    scripts/verify-routes.mjs scripts/verify-organizer-redirects.sh
(no output)
```

**Zero** TODO, FIXME, stub, mock, `@ts-ignore` or `@ts-expect-error` across the
collapsed tree, the route modules, the middleware, the two menus and both new
checks. Every SUMMARY of the phase reports *Known Stubs: None*, and each says
what it searched for.

One recurring **process** anti-pattern is recorded rather than hidden, because it
fired **three times in one phase** (plans 34-03, 34-06/34-11, 34-14): *a plan
whose acceptance criteria are greps must keep its own prose out of their way.* A
comment that spells the token its own criterion forbids defeats the criterion —
and the dangerous half is not the false red, it is that it trains the next reader
to wave the criterion through.

---

## Findings recorded, not fixed — each with an owner

| ID | Finding | Owner |
|---|---|---|
| **F4** | `src/lib/supabase/middleware.ts:466` sets `?redirect=`; `src/app/(auth)/login/page.tsx:11` reads `?next=`. Somebody bounced to sign in loses their destination and lands on `/dashboard`. **Pre-existing, a usability defect, not this phase's, and deliberately not folded.** It is the reason M-7 must start signed in. | filed with F5 |
| **F5** | `src/app/(auth)/login/page.tsx:52` — `window.location.href = nextUrl \|\| "/dashboard"` with **no allow-list**, while the server-side callback **has** one at `src/app/api/auth/callback/route.ts:44-49`. `access-gating.md`, gate *redirect validato*, is the reference. **Deliberately not folded: an open-redirect fix does not belong inside a Critical access change.** | **new todo** — `.planning/todos/pending/login-client-redirect-not-allow-listed.md` |
| **F6** | The auth callback's allow-list needs **no change**: its own docblock at `src/app/api/auth/callback/route.ts:68-70` already names `/admin` as **refused**, because an allow-list refuses by default. One fewer thing to touch. | closed — nothing to do |
| **D-34-13's fork** | Route Handlers under `/api/*` stay out of the map, so `door.supervise` and `media.upload` remain `scope: "table"`, each with a reason naming its guard (`require-operator.ts`, `may-upload.ts`). Bringing `/api/*` under CAP-02 means a middleware rule on the **door's scan path**. | a later phase |
| **`middleware.ts` → `proxy.ts`** | Deprecated in Next 16. Observed on every `next dev` start of this plan: *"The `middleware` file convention is deprecated. Please use `proxy` instead."* Not renamed here — the door's judge is not a file to rename inside a Critical access change. | its own small plan, **after Phase 39** |
| **The `pending`-organizer / Check-in divergence** | `door.operate` carries `requires_approved = false` (D-06) while the bottom nav's Check-in entry is filtered by `requireApproved: true` and by role — so a `pending` organizer sees **no** Check-in tab that the server **would** admit. It is the **safe direction** (a hidden entry the server would allow, not a drawn entry it refuses). Closing it means giving `getVisibleNavItems` the capability set → changing `MobileNav`'s props → **editing the door's own page**. Recorded in source, in `src/lib/rbac/roles.ts`'s Check-in docblock. | **Phase 39**, alongside STAFF-04 (plan 34-04) |
| **The `(work)` route group** | Introduced by plan 34-05 so that **no layout wraps the door**: `/admin/scanner` is outside it by construction. Phase 39 should read `nextjs-architecture.md` § `(work)` before moving the scanner. | **Phase 39** |
| **Two stale comments about `StaffNav`'s props** | `src/app/(admin)/admin/scanner/page.tsx:74` and `src/types/database.ts:762` describe a prop shape that plan 34-04 changed. The first is on the door's page, which this phase does not edit. | **Phase 39** / whichever plan removes `role`/`status` from the payload |
| **Upstream verification debt** | **9** `human_verification` entries in `35-VERIFICATION.md` (whose frontmatter also records **13 procedures written, 0 executed**) and **14** in `43-VERIFICATION.md` (**16 written, 2 executed**). Counted today, not quoted. **This phase neither consumes nor worsens them and does not close them.** They remain due before the milestone closes. | the milestone |

Two further findings from within the phase, closed inside it and recorded so the
reasoning survives:

- **The door's assignment arm was missing from the map** as wave 1 left it, and
  the fence written to guard the door **fired on the unmutated tree** before the
  question could be asked. Restored as `assignmentOpenable: true` in the same
  commit (`f59776b`). Not a widening: it restores in data the arm the code being
  replaced had since Phase 35. Without it the middleware refuses the member of
  **staff rostered on tonight's door**, in front of a queue.
- **Four `revalidatePath` calls named a public address that never existed**
  (`/artists`, `/venues` — neither has a listing page). Pre-existing no-ops, not
  collapse debris. **Re-pointed at the staff listings, not deleted and not
  allow-listed** — which is why plan 34-16's after-count is 33 and not the
  predicted 29. *29 would have been the number produced by removing four
  refreshes; 33 is the number produced by fixing them.*

---

## What is not verified

- **Every one of M-1 … M-9**, above, each with its reason.
- **The two `assignments` `revalidatePath` calls** — no live per-night assignment
  can be produced on demand.
- **That any surface was observed refreshing at all.** `verify-routes.mjs` reads
  literals; it does not watch a page.
- **That a ticket purchase, a refund, a discount code or a drink token still
  works.** No purchase and no refund was executed. What **is** claimed is
  narrower and provable: not one line of the refund, tier or discount-code path
  changed, and the diff is the proof — `admin/events/[id]/tickets/actions.ts` and
  `RefundActions.tsx` show neither a rename nor a hunk.
- **That the two master-only analytics panels are hidden from an organizer in a
  running application.** The conditional is asserted in source. Plan 34-14 named
  it the one behavioural claim a person should check first, because it is the
  only place where what a role *sees* was decided rather than carried.
- **That anything here is deployed.** `deployed: false`. Nothing in this phase has
  been observed in production.

**And the standing sentence, which is not a formality: nothing in this phase is
verified because tests pass.** There is no test runner for this product, none was
added, and adding one was out of scope — `34-VALIDATION.md` states it as a Wave 0
requirement that *must not change*.

---

## Nyquist sign-off

`34-VALIDATION.md`'s `nyquist_compliant` stays **`false`**, and the unmet items
are named rather than left to be inferred:

| Sign-off item | Met? |
|---|---|
| Every plan task carries an automated command or a named M-procedure | ✅ |
| Sampling continuity: no three consecutive tasks without `npm run build` | ✅ — every SUMMARY records a build per task commit |
| Wave 0 gaps closed in Wave 1 | ✅ — 34-01 and 34-08 |
| CAP-02's gate **proved by mutation in both directions**, mutation confirmed applied before its result is read | ✅ — mutations A, B1, B2 above |
| **M-9 run before and after the middleware plan** | ❌ — **neither half was run**, and the before half is **unrecoverable** |
| No test framework installed | ✅ |
| `nyquist_compliant: true` | ❌ — **withheld**, on the item above |

One unmet item is enough, and it is the right one to fail on: M-9 is the
procedure whose window was **this phase** rather than the milestone, and it is
the only one whose deferral destroyed evidence instead of postponing it.

---

## Roles only

Every statement in this record names a **role** — `master`, `organizer`, `staff`,
`member`. No person is named. `.planning/` is tracked and this repository is
public, so a commit here is an **irreversible publication**: no venue under
negotiation, no unannounced date, no line-up, no contact.

---

*Phase: 34-one-work-surface*
*Verified: 2026-08-10 — automated instruments green, human observation owed*
