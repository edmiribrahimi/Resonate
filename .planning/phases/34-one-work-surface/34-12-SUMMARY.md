---
phase: 34-one-work-surface
plan: 12
subsystem: routing
tags: [route-collapse, capabilities, work-group, drinks, venue-secrecy, no-money-path-change]

requires:
  - phase: 34-one-work-surface
    provides: "`src/lib/routes/capability-routes.ts` — `organizer.access` binds both addresses (plan 34-01)"
  - phase: 34-one-work-surface
    provides: "`src/app/(admin)/admin/(work)/layout.tsx` — the one context resolution and both nav mounts (plan 34-06)"
  - phase: 34-one-work-surface
    provides: "R-WORK-ROUTES, and `DrinkMenuManager.tsx` already at its post-collapse path with an absolute specifier (plan 34-07)"
provides:
  - "`/admin/events/[id]/edit` — the single event edit surface, on `organizer.access`, with an ownership check it did not have"
  - "`/admin/events/[id]/drinks` — the single drinks surface, on `organizer.access`, with an ownership check it did not have"
  - "A measured statement that the drinks pair held **no** divergence on the money side"
affects: [34-11, 34-15, 34-16, 34-17]

tech-stack:
  added: []
  patterns:
    - "A divergence resolved towards the more restrictive twin, and the row-level policy named as the reason it is the safe direction"
    - "A cross-plan type seam proved by a temporary mutation in a sibling's file, reverted, rather than fixed across the wave fence"

key-files:
  created:
    - "src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx"
    - "src/app/(admin)/admin/(work)/events/[id]/drinks/page.tsx"
  modified:
    - "src/app/(admin)/admin/events/[id]/edit/page.tsx (deleted — moved into `(work)`)"
    - "src/app/(admin)/admin/events/[id]/drinks/page.tsx (deleted — moved into `(work)`)"
    - "src/app/(organizer)/organizer/events/[id]/edit/page.tsx (deleted)"
    - "src/app/(organizer)/organizer/events/[id]/drinks/page.tsx (deleted)"

key-decisions:
  - "Both surfaces collapse onto `organizer.access` — the key the map binds and the key each organizer twin already asked; not a widening, because an organizer opened a byte-equivalent page at the `/organizer` address today"
  - "The ownership check is kept on both pages, taken from the organizer twin: the more restrictive of the two behaviours (D-34-06), and the same truth table as the `events` row-level policy"
  - "The `Manage Drink Menu` link survives the merge: `/admin/events/[id]/drinks` is bound to the same `organizer.access` row, so a link reveals nothing to a reader who may already open the page"
  - "`EventList.tsx` was NOT edited despite a type error originating there — it is plan 34-11's file, and that file's own docblock says so"

requirements-completed: [STAFF-01]

metrics:
  duration: "~55 min"
  completed: 2026-08-10
---

# Phase 34 Plan 12: Collapse the `edit` and `drinks` pairs — Summary

**Four `events/[id]` pages became two, both on `organizer.access`, and both gained an ownership check the `/admin` twin never had — while the drinks money path was measured rather than assumed and turned out to hold no divergence at all, so not one line of it changed.**

**Commit:** `2bd6833`

---

## Task 1 — the classification, every difference against a grant

Both pairs were diffed on disk, not recalled. Assumption A5 (`34-RESEARCH.md`) is honoured: nothing below is inherited from `artists` or `venues`.

### The grant rows this plan reads (and edits none of)

| Row | Where |
|---|---|
| `('master','admin.access',false)` | `20260807000000_capability_model.sql:408` |
| `('master','organizer.access',false)` | `:411` |
| `('organizer','organizer.access',false)` | `:412` |
| `('master','master.manage',false)` | `:396` |
| `events` UPDATE — `(auth.uid() = created_by) OR has_capability('master.manage')` | `20260807010000_policies_to_capabilities.sql:255` |
| `/admin/events/[id]/edit` → `organizer.access` | `src/lib/routes/capability-routes.ts:256` |
| `/admin/events/[id]/drinks` → `organizer.access` | `src/lib/routes/capability-routes.ts:260` |

### `edit` — 5 axes

| # | Difference | Verdict | Decided by |
|---|---|---|---|
| 1 | guard `ADMIN_ACCESS` vs `ORGANIZER_ACCESS` | **guard** → `organizer.access` | `capability-routes.ts:256`; grants `:411-412`. Not a widening — an organizer opened the twin today; `organizer.access` is held by `master` and `organizer` only, so a `staff` role gains nothing |
| 2 | `ownsOrIsMaster` present only on the organizer twin | **drift** → keep it (more restrictive, D-34-06) | `master.manage` `:396` short-circuits; the retained check mirrors the `events` UPDATE policy `:255` |
| 3 | `Manage Drink Menu` link, organizer twin only | **drift** → keep | `/admin/events/[id]/drinks` is the **same** `organizer.access` row (`:260`). Every reader of this page already reaches that one; a link is an affordance, not access |
| 4 | back link / refusal `/organizer/events` vs `/admin/events` | **cosmetic** (address) | D-34-01. `/organizer/events` answers with a redirect to `/admin/events`, so only the hop is gone |
| 5 | function name, comment wording, import order, one stray comment | **cosmetic** | no verdict attached |

Deleted from both, by D-34-07: the `MobileNav` mount, its import, and the `role as UserRole` / `status as UserStatus` casts.

### `drinks` — 3 axes

| # | Difference | Verdict | Decided by |
|---|---|---|---|
| 1 | guard `ADMIN_ACCESS` vs `ORGANIZER_ACCESS` | **guard** → `organizer.access` | `capability-routes.ts:260`; grants `:411-412` |
| 2 | `created_by` in the `SELECT` + `ownsOrIsMaster`, organizer twin only | **drift** → keep both (more restrictive, D-34-06) | same policy `:255`, same master short-circuit `:396` |
| 3 | back link: `← Back to Events` → `/admin/events` vs a chevron `Back to Edit` | **cosmetic** → the `/admin` shape | D-34-01, and it is the shape the sibling `(work)` pages already use. The way *forward* survives as the edit page's `Manage Drink Menu` link. No restyle — one of two existing shapes was picked, not a new one drawn |

The `<h1>` was already identical on both (`Drink Menu`); the only remaining difference was Tailwind class **order** on the subtitle, which renders identically.

### The money path — the answer the plan demanded in writing

**The `drinks` pair holds NO divergence in token or closing-time behaviour, so the stop condition did not fire and nothing on that path was merged, chosen or edited.** Measured, not assumed:

| Question | Measurement |
|---|---|
| Does either twin mention `menu_closes_at`, a token, a grace period or a redeem call? | `grep` → **0** on both twins **and** on `DrinkMenuManager.tsx` |
| Where does the closing time actually get written? | `updateMenuClosesAt`, in `src/app/(public)/events/[slug]/menu/actions.ts` + `PartyDrinkMenu.tsx` — files this plan neither touches nor imports |
| Do the two twins load drinks differently? | No — `getDrinkItems(eventId)`, byte-identical on both |
| Do they mount the shared components differently? | No — `DrinkMenuManager` with the identical three props, `EventQRCode` with the identical `menuUrl` |

One neighbouring fact worth recording, because it is the one place `menu_closes_at` *does* appear in this plan's blast radius: the **`edit`** page reads it in the `event_parties` SELECT and passes it to `EventForm`. That SELECT and that mapping were **byte-identical in both twins** (the diff shows no hunk across the whole block) and were carried across unchanged. A routing merge is not the place to edit a closing time.

**No file was modified during Task 1** — `git status --porcelain` was empty at its close.

## Task 2 — the merge

`git mv` moved the two `/admin` pages into `src/app/(admin)/admin/(work)/events/[id]/{edit,drinks}/`; the two `/organizer` twins were deleted. Both merged pages carry a docblock recording the axes above at the point of use, so the reasoning does not live only here.

### The assertions, run rather than claimed

| Assertion | Result |
|---|---|
| `find "src/app/(admin)" -path '*events/[id]/edit/page.tsx'` | **1 path**, under `(work)` |
| …and for `drinks` | **1 path**, under `(work)` |
| `(organizer)/organizer/events/[id]/{edit,drinks}/page.tsx` | gone |
| both merged pages contain `ORGANIZER_ACCESS` | yes |
| `grep -c "StaffNav\|MobileNav\|as UserRole\|as UserStatus"` on both merged pages | **0** and **0** |
| `DrinkMenuManager.tsx` still at `src/app/(admin)/admin/events/[id]/drinks/` | yes — **no rename and no hunk** in `git diff -M --stat` |
| `PartyDrinkMenu.tsx` in `git diff --name-only` | **absent** |
| every `DrinkMenuManager` specifier | `@/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager` — **2 of 2**, zero naming `(organizer)`, zero naming `(work)` |
| `git diff -M` hunk on `DrinkMenuManager.tsx` touching a token / closing time / redeem call | **none — the file is not in the diff at all** |
| `next build` route list | `/admin/events/[id]/edit` and `/admin/events/[id]/drinks`, **no `(work)` in either URL**; neither `/organizer` twin listed |
| `curl -sI /organizer/events/abc/drinks` | `307` → `/admin/events/abc/drinks` |
| `curl -sI /organizer/events/abc/edit` | `307` → `/admin/events/abc/edit` |
| `curl -sI /admin/scanner` | `307` → `/login?redirect=%2Fadmin%2Fscanner` — **the door did not move** |
| `npx eslint` on both merged pages | clean |
| `npm run verify:persona` | **7/7 green** |

307 rather than 308 is D-34-15 behaving as designed: the redirects run as 307 while the phase is in flight, and plan 34-17 owns the flip.

The redirect rows for both addresses already exist in `src/lib/routes/organizer-redirects.ts:85-86` — read, not added; that table belongs to plans 34-01/34-03.

### One thing the plan asked for that was already true

The plan's action says to *rewrite* the moved `drinks/page.tsx` import of `DrinkMenuManager` to the absolute specifier. It was **already absolute** — plan 34-07 had rewritten it — so the `git mv` left it valid and **zero lines changed**, which is a stronger result than the one asked for. Re-measured with `grep -rn "DrinkMenuManager" src/` before and after.

## Finding 1 — a cross-plan type seam, left for its owner

`rm -rf .next && npm run build` **failed on first run**, and the failure was **not in either of this plan's files**:

```
./src/components/events/EventList.tsx:176:15
Type error: Type '`/admin/events/${string}/edit` | `/organizer/events/${string}/edit`'
  is not assignable to type 'UrlObject | RouteImpl<…>'.
```

`EventList.tsx:37` types `basePath?: "/organizer/events" | "/admin/events"` and defaults to the organizer arm, so all six of its per-event hrefs can still form a `/organizer/...` literal. Deleting `/organizer/events/[id]/edit` removes that arm from the route union and the template stops checking.

**It was deliberately not fixed here.** Three reasons, in order of weight:

1. `EventList.tsx` is in **plan 34-11's** `files_modified`, and 34-11's own must-have is *"`EventList` has no `basePath` prop and links only into `/admin/events`"*. It is running in a parallel worktree right now.
2. The file **says so itself**, at `:33-35`: *"The `/organizer/events` default survives this task deliberately: deleting it belongs to plan 34-11, and doing it here would touch a file that plan rewrites."*
3. Editing it would guarantee a merge conflict on the one file the wave's parallelism depends on staying single-owner — the same reasoning R-WORK-ROUTES rests on.

**Proof that this plan's two files typecheck**, taken the way this repository requires (mutation asserted applied *before* its result was read — there is a recorded incident of the opposite):

```
$ git diff --stat src/components/events/EventList.tsx
 src/components/events/EventList.tsx | 4 ++--
$ grep -n 'basePath?:\|basePath = ' src/components/events/EventList.tsx
37:  basePath?: "/admin/events";
43:  basePath = "/admin/events",
```

With the union narrowed to what 34-11 will produce: `rm -rf .next && npm run build` → **`✓ Compiled successfully`, exit 0**, 45/45 pages generated, both collapsed routes listed. Reverted with `git checkout --`; `git status --short` shows the file clean and only this plan's four route files staged.

**Consequence for the orchestrator:** the wave does not build green until 34-11 lands. The same seam will be reported by every sibling deleting an `/organizer/events/[id]/*` twin (`tickets`, `sales`, `guest-list`, `media`, `analytics` — the other five hrefs at `EventList.tsx:183-211`). It is one edit in one file, and it is already assigned.

## Deviations from Plan

**1. [Rule 3 — Blocking, resolved without touching the blocking file] The build failure in `EventList.tsx`**

- **Found during:** Task 2, first `npm run build`
- **Issue:** Deleting `/organizer/events/[id]/edit` breaks a sibling-owned type union.
- **Fix:** None applied to the file. Ownership traced to plan 34-11, confirmed by that plan's frontmatter *and* by the file's own docblock; this plan's typecheck proved by a temporary, reverted narrowing. Recorded as Finding 1 rather than fixed across the wave fence.
- **Committed in:** no code change.

**2. [Rule 3 — Blocking] The worktree had no `node_modules`**

- **Fix:** `npm ci` restored the declared lockfile. `git status --short -- package.json package-lock.json` is empty — no package added, no version moved. No package-manager *install of a new package* occurred, so the slopsquatting checkpoint does not apply.
- **Committed in:** no code change.

**3. [Rule 3 — Blocking] No `.env.local`, so no dev server for the redirect check**

- **Fix:** A placeholder `.env.local` holding **no real credential** (verified gitignored with `git check-ignore -v`), used to boot `next dev` on port 3941 for the three `curl -sI` observations above, then **deleted**. The redirect is a table lookup at the top of the proxy and needs no database, which is why the observation is valid without one.
- **Committed in:** no code change; `git status --short` empty afterwards.

---

**Total deviations:** 3, all Rule 3, none altering behaviour.
**Impact on plan:** No scope creep. **No capability granted, revoked or re-scoped. No migration. No new capability key. No test framework. No dependency. No visual redesign. `/admin/scanner` did not move and nothing points at it.**

## Cross-domain impact, stated rather than assumed

- **Venue secrecy.** The `edit` surface renders `venue_secret`, `venue_secret_hint`, `venue_reveal_hours` and `venue_reveal_on_purchase`. This merge makes **neither** gate easier to pass — it **adds** an ownership gate the `/admin` twin lacked, so the monotone guard moves in the permitted direction only. No `venue_reveal_sent` path, cron, email or public event component is in this diff. Nobody sees an address one moment sooner than yesterday.
- **Money.** Nothing on the drinks path changed; see the table in Task 1. The public paying surface `PartyDrinkMenu.tsx` is absent from the diff, and `DrinkMenuManager.tsx` did not move.
- **Access.** The middleware is still UX and RLS is still the boundary. Both pages keep their own guard (D-34-09) and both now agree with the `events` policy instead of merely coexisting with it.
- **The door.** `/admin/scanner` is outside `(work)`, unedited, and observed still bouncing to `/login`.

## Known Stubs

None. Both surfaces are complete and render the same components with the same props they rendered before.

## Verification Run

| Command | Result |
|---|---|
| `diff` on both pairs (Task 1) | recorded above; no file modified |
| `npm ci` | lockfile unchanged |
| `rm -rf .next && npm run build` | **fails on `EventList.tsx:176`** — sibling-owned, Finding 1 |
| same, with 34-11's narrowing applied temporarily | **exit 0**, `✓ Compiled successfully`, 45/45 pages |
| `npx eslint` on both merged pages | clean |
| `npm run verify:persona` | **7/7** |
| `curl -sI` on both legacy addresses | 307 to the collapsed twin |
| `curl -sI /admin/scanner` | `/login` bounce — not a relocation |
| `git status --short` before this SUMMARY | empty |

**Not claimed:** that a drink token still redeems, or that an event still saves. There is no test runner for this product. What is claimed is that **no line on either path changed**, proved by diff — and the plan's own verification block says exactly that.

`npm run verify:capabilities` was **not** run: it needs a live database, there is no CI, and this plan edits no migration and no key.

## Self-Check: PASSED

- `src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx` — present
- `src/app/(admin)/admin/(work)/events/[id]/drinks/page.tsx` — present
- `src/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager.tsx` — present, unmoved, unedited
- `src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx` — present, unedited
- Commit `2bd6833` — present in `git log`
- `STATE.md` and `ROADMAP.md` — **not touched**; the orchestrator owns those writes

## Threat Flags

None. No network endpoint, no auth path, no schema change and no new file-access pattern is introduced. Every threat in the plan's register has a mechanism above: T-34-58 (`organizer.access` is the twin's own key, every drift named against a grant row), T-34-59 (the money path measured before the merge, and absent from the diff), T-34-60 (`DrinkMenuManager.tsx` did not enter `(work)`; `PartyDrinkMenu.tsx` out of the diff; build is the type gate behind it), T-34-61 (three-verdict classification, grant named for each drift), T-34-SC (no package installed).

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-10*
