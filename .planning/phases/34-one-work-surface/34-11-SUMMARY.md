---
phase: 34-one-work-surface
plan: 11
subsystem: routing
tags: [route-collapse, capabilities, typed-routes, shared-component, wave-parallelism]

requires:
  - phase: 34-one-work-surface
    plan: 01
    provides: "`CAPABILITY_ROUTES` binding `/admin/events` and `/admin/events/new` to `organizer.access`, and the narrowed prefix prop on `EventList`"
  - phase: 34-one-work-surface
    plan: 05
    provides: "`(work)/layout.tsx` — one access-context resolution, both navs mounted once"
  - phase: 34-one-work-surface
    plan: 06
    provides: "the measured verdict that `(work)/events/[id]/…` coexists with `admin/events/[id]/…`"
  - phase: 34-one-work-surface
    plan: 07
    provides: "R-WORK-ROUTES, and `admin/events/actions.ts` at a path that survives the deletion"
provides:
  - "`/admin/events` and `/admin/events/new`, each existing once, guarded on `organizer.access`"
  - "`EventList` with no tree-prefix prop, one destination, and six hrefs checked by inference"
  - "**A measured wave-4 hazard: deleting `/organizer/events/page.tsx` takes that address out of the route type union, and nineteen type errors surface in seven files owned by concurrent siblings**"
affects: [34-12, 34-13, 34-14, 34-15, 34-16, 34-17]

tech-stack:
  added: []
  patterns:
    - "A post-merge build proved by moving concurrent siblings' files aside, building, restoring, and asserting every checksum unchanged"
    - "An explanatory comment written so it cannot spell the tokens its own acceptance criteria grep for"

key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/(work)/events/page.tsx (merged, from both twins)"
    - "src/app/(admin)/admin/(work)/events/new/page.tsx (merged, from both twins)"
    - "src/app/(admin)/admin/(work)/events/loading.tsx (moved; tab-bar skeleton removed)"
    - "src/components/events/EventList.tsx (prefix prop deleted, literal inlined)"
    - "src/components/events/EventForm.tsx (one stale address literal — declared deviation)"
    - "src/app/(organizer)/organizer/page.tsx (one stale address literal — declared deviation)"

key-decisions:
  - "Reachability on `organizer.access`, row scope on `master.manage` — two keys because they are two questions, and the second is why no row verdict moved"
  - "The merged body is the organizer version's, not the `/admin` one's: it is the one that carries the row filter"
  - "`<h1>Events</h1>` on both, taken from the label `staff-tabs.ts:88` already gives the address — neither `Admin` nor `Organizer` survives a surface that serves both"
  - "`EventForm.tsx` WAS edited, contradicting a plan criterion written before `typedRoutes` could see the literal — plan 34-09 had already assigned the file here"

requirements-completed: [STAFF-01, STAFF-03]

duration: ~95min
completed: 2026-08-10
---

# Phase 34 Plan 11: Collapse the events pairs, delete EventList's prefix prop — Summary

**Two surfaces where four were, a shared list with one destination and no prop
— and one measured finding the plan could not have carried: deleting the events
list address makes nineteen type errors appear in seven files this plan does not
own.**

**Commit:** `326f460`

---

## Task 1 — both pairs classified against a grant

No file was modified. `git status --porcelain` was empty before Task 2 began.

### The `events` pair — every difference

| # | Difference | Verdict | Decided by |
|---|---|---|---|
| 1 | Guard: `admin.access` vs `organizer.access` | **guard** | `CAPABILITY_ROUTES` binds `/admin/events` to `CAP.ORGANIZER_ACCESS` (`capability-routes.ts:254`). The page reads the entry the middleware reads (D-34-09) |
| 2 | The `master.manage` branch scoping the query | **guard**, and the one that keeps the collapse honest | `master.manage`, declared `scope: "table"` at `capability-routes.ts:315-319` — *"gates rows and server-side operations, not addresses"* |
| 3 | `userId` narrowing + its measured docblock | **drift** — present only on the organizer side | Required by difference 2. Taken with it |
| 4 | `EventList basePath="/admin/events"` on the admin side, default on the organizer side | **drift** | Resolved by deleting the prop |
| 5 | `<h1>Admin</h1>` vs `<h1>Organizer</h1>` | **cosmetic**, but forced | Neither survives — see below |
| 6 | Error-state `<h1>Event Management</h1>` vs `<h1>Events</h1>` | **cosmetic** | Organizer's taken, for the same reason |
| 7 | `href="/admin/events/new"` vs `href="/organizer/events/new"` | **drift** | Collapsed address |
| 8 | Admin's `.map()` copying five columns onto themselves | **cosmetic** | A no-op over the same `select()`. Organizer's direct `events ?? []` taken |
| 9 | Import order of `EventList` / `StaffNav` | **cosmetic** | — |
| 10 | Nav mounts and the two `UserRole`/`UserStatus` narrowings, in both | **drift** | `(work)/layout.tsx` holds them once (D-34-07) |

### The `events/new` pair — every difference

| # | Difference | Verdict | Decided by |
|---|---|---|---|
| 1 | Guard: `admin.access` vs `organizer.access` | **guard** | `capability-routes.ts:255` |
| 2 | Back-link `/admin/events` vs `/organizer/events` | **drift** | Collapsed address |
| 3 | Destructuring shape and comment wording | **cosmetic** | — |
| 4 | Nav mounts and the two narrowings, in both | **drift** | The layout's |

Both already imported `createEvent` from `@/app/(admin)/admin/events/actions` —
plan 34-07 had rewritten them — so no specifier needed touching.

### The `loading.tsx` pair

Three cosmetic differences: function name, one skeleton width (`w-24` vs
`w-32`), and five skeleton rows vs four. The `/admin` file was the one moved.

### The `master.manage` decision, recorded rather than assumed

The plan and `34-RESEARCH.md:437` both describe the organizer version's
`master.manage` branch as *"conditional rendering"* and as *"master-only
controls"*. **Measured, it is neither.** It is a query scope:

```
(organizer)/organizer/events/page.tsx:89-91
  if (!capabilities.has(CAP.MASTER_MANAGE)) {
    query.eq("created_by", userId);
  }
```

There is no master-only control drawn anywhere on this surface. Delete is drawn
for everyone; `deleteEvent` re-asks `master.manage` inside itself, which is where
that boundary actually is. So the branch gates **rows**, which is precisely what
`master.manage` is declared to do — `scope: "table"`, *"Gates rows and
server-side operations, not addresses"* (`capability-routes.ts:316-318`).

The decision the plan asked for therefore lands the same way with a truer
description:

- **Reachability** — *may this account reach the events surface* —
  `organizer.access`.
- **Row scope** — *may this account manage events it does not own* —
  `master.manage`, held from the same resolved set, one round trip, no second
  query and no role string.

Two questions, two keys, as `keys.ts:38-45` requires. The plan's criterion
`grep -c 'role === "master"'` returns **0**.

**Nothing widened (D-34-06).** A master holds both keys → unfiltered query,
identical to what `/admin/events` showed. An organizer holds `organizer.access`
and not `master.manage` → `created_by = <their id>`, identical to what
`/organizer/events` showed. The *address* a role reaches widened — that was
decided upstream by plan 34-01 when it bound `/admin/events` to
`organizer.access` — but the *rows* did not. Pitfall 6's forbidden sentence does
not appear here in any form: the `/admin` version's `admin.access` guard is not
"the more complete one being abandoned", it is a guard on an address whose
binding moved, and the restrictive half of that page (there was none — it had no
row filter at all) is supplied by the organizer twin, not dropped.

### Venue-secrecy cross-check — read, not assumed

`venue-secrecy.md` requires the exit points to be re-enumerated by reading. Both
pages, both `new` pages, `loading.tsx` and `EventList.tsx` were grepped for
`venue`, `address` and `reveal`, case-insensitively. **One match, and it is not a
venue:**

```
src/components/events/EventList.tsx:25   "Narrowed from `string` to the two addresses that are actually passed"
```

— a comment about URL prefixes, since removed. Read positively as well:

- `(organizer)/organizer/events/page.tsx:60-62` and its merged successor select
  `id, title, date, is_published, created_by`. **No venue column, no
  `venue_reveal_sent`, no address.**
- `EventList.tsx:12-19` — the `EventItem` interface is those five fields plus an
  optional `creator_name`. It cannot render a venue because it is never given
  one.
- No write of any kind: the three actions it calls are `deleteEvent`,
  `publishEvent`, `unpublishEvent`, and none is `venue_reveal_sent`.

`publishEvent` is the one worth naming out loud, because publishing an event is
adjacent to visibility. It is untouched by this plan — `admin/events/actions.ts`
has **no hunk** in this diff — and it is not a reveal path: the reveal is
per-ticket and per-RSVP (`tickets.venue_reveal_sent`, `rsvps.venue_reveal_sent`),
driven by the cron, not by an event's published flag.

**Nothing this plan collapsed can show a venue earlier than the page it
replaced, because neither page could show one at all.**

---

## Task 2 — the collapse

### What exists now

```
src/app/(admin)/admin/(work)/events/page.tsx
src/app/(admin)/admin/(work)/events/new/page.tsx
src/app/(admin)/admin/(work)/events/loading.tsx
```

`find "src/app/(admin)" -path '*events/page.tsx'` returns one path; likewise for
`events/new/page.tsx`. The three `(organizer)/organizer/events/{page,loading,new/page}.tsx`
are gone.

From the build route manifest — the evidence that carries the claim, since every
`/admin` address is unobservable in this worktree (below):

```
├ ƒ /admin/events
├ ƒ /admin/events/new
```

Once each, and no route carries `(work)` in its address.

### `EventList` — the prop gone AND the six hrefs still there

Both asserted, not just the first, because a criterion of the form *grep returns
0* is also satisfied by deleting the links:

| Assertion | Result |
|---|---|
| `grep -c "basePath"` | **0** |
| `grep -c "/organizer"` | **0** |
| `grep -c '/admin/events/'` | **7** — the six hrefs plus the `actions` import specifier |
| `grep -c 'as Route'` | **0** |

The six, enumerated at their new lines:

```
192  href={`/admin/events/${event.id}/edit`}
199  href={`/admin/events/${event.id}/tickets`}
206  href={`/admin/events/${event.id}/sales`}
213  href={`/admin/events/${event.id}/guest-list`}
220  href={`/admin/events/${event.id}/media`}
227  href={`/admin/events/${event.id}/analytics`}
```

**Unannotated, uncast.** The plan's measurement was followed exactly: an
annotation with the bare route type does not compile (`RouteImpl`'s dynamic arm
collapses to `never` when parameterised by `string`), and the cast that would
make it compile switches the check off entirely. `<Link>` is generic, so the
template is inferred and checked. That is now the property that matters: with the
prefix prop gone and the literal inlined, a stale link in this component is a
build error rather than a 404 — which is exactly what this plan then hit in three
other files, from the other direction.

### The heading

`<h1>Admin</h1>` and `<h1>Organizer</h1>` both named a **role**, and the merged
page serves both, so neither could survive. `Events` is not an invention: it is
the label `staff-tabs.ts:88` already gives this address, so the tab clicked and
the heading landed on now read the same word. The wider vocabulary question —
retiring `admin` from URLs and headings — is Phase 40/41's and was not touched.
No restyle of any kind.

### `admin/events/actions.ts` — R-WORK-ROUTES held

| Assertion | Result |
|---|---|
| Still at `src/app/(admin)/admin/events/actions.ts` | yes |
| In `git diff -M --name-only` | **absent** |
| Rename in `git diff -M --stat` | **none** |
| Hunk of any kind | **none** |
| `revalidatePath(` calls | **8**, unchanged, untouched — plan 34-16's |
| Any `(public)` file in the diff | **0** |

The nine external importers — five on the public ticket and drink purchase path
— are untouched by construction, not by care.

---

## Deviations from Plan

### 1. [Rule 3 — Blocking] `EventForm.tsx` was edited, and the criterion forbidding it predates the measurement

- **Found during:** Task 2, by `rm -rf .next && npm run build`. Not by review,
  and not by any grep this plan runs.
- **Issue:** `src/components/events/EventForm.tsx:437` was
  `router.push("/organizer/events")` — the destination after **creating or
  editing an event**. Deleting `/organizer/events/page.tsx` takes that address
  out of the generated route union, so `typedRoutes` refuses the literal and the
  whole tree stops compiling.
- **Why the criterion is wrong rather than the fix:** the plan's reasoning about
  this file is entirely about **import specifiers** — *"its two specifiers,
  rewritten in Wave 2, remain correct and no plan in this wave can make them
  stale"*. That claim is true, and was re-verified:
  `EventForm.tsx:11-12` still name `@/app/(admin)/admin/{artists,venues}/actions`
  and both files are where 34-07 put them. What R-WORK-ROUTES cannot protect is
  an **address literal**, which is plan 34-06's Finding 1 exactly: *"a grep on a
  module path cannot see an address literal either."*
- **Ownership is not in doubt.** `34-09-PLAN.md:160` states *"`EventForm.tsx`
  belongs to plan 34-11"*, and 34-09's own criteria assert the file is absent
  from **its** diff for that reason. No concurrent plan holds it.
- **Fix:** retargeted to `/admin/events`, with the reason recorded in the file.
  Deliberately not left to the redirect table: this is the destination after a
  successful create or edit, and D-34-15 flips those redirects to a 308 the
  browser caches and does not come back from.
- **Consequence for the acceptance criteria:** *"`src/components/events/EventForm.tsx`
  is not in this plan's diff"* **FAILS, and is reported as failing.** It is
  listed. A criterion that reads as satisfied because it was quietly
  reinterpreted is worse than one that fails.

### 2. [Rule 3 — Blocking] `(organizer)/organizer/page.tsx`, one line, to keep `main` compiling

- **Issue:** `redirect("/organizer/events")` — the same class of error, in a file
  outside this plan's `files_modified`.
- **Ownership:** `34-15-PLAN.md:8,75` — plan **34-15**, which **deletes** it, in
  **Wave 5**. Not concurrent with this worktree, so no merge conflict is
  possible: 34-15 operates on the tree after this merge.
- **Why not leave it:** it is the only stale literal outside the seven files the
  concurrent siblings delete. Left alone, the wave-4 merge lands a `main` that
  does not typecheck, and stays that way until 34-15 runs — in a repository with
  **no CI**, where `npm run build` is the entire gate, and where the next
  executor could not tell inherited breakage from their own.
- **Verdict-neutral, and measured so:** `ORGANIZER_REDIRECTS` translates
  `/organizer` in the middleware before route resolution, so this body never
  runs. Confirmed on the walk below — `/organizer` answers **307 →
  /admin/events**, never reaching the page.
- **Fix:** retargeted to `/admin/events`, with a note saying 34-15 deletes the
  file and why the line moved anyway.

### 3. [Rule 1 — a comment defeating its own criterion] Three times, in two files

- **Found during:** running the acceptance criteria, which is the only reason it
  was found at all.
- **Issue:** the explanatory docblocks written for `EventList.tsx` and the merged
  page spelled the very tokens the criteria grep for — `basePath`, `as Route`,
  `StaffNav`, `MobileNav`. First run: `grep -c "basePath"` → **1**,
  `grep -c 'as Route'` → **1**, nav grep → **1**. All prose; all would have
  reported a failure that was not a failure, or worse, trained the next reader to
  wave it through.
- **Fix:** all three rewritten to describe the thing without naming it, with a
  closing line in `EventList.tsx` saying explicitly which tokens it declines to
  spell and why. Plans 34-03 and 34-06 both recorded this same self-inflicted
  error; this is its third occurrence in one phase, which is worth saying.
- **Re-measured:** all four greps at 0.

### 4. [Rule 1 — Bug] The tab-bar skeleton in `loading.tsx`

- **Issue:** the moved `loading.tsx` drew a five-pill skeleton for the tab bar.
  Inside `(work)`, the layout mounts the **real** tab bar outside the suspense
  boundary, so during loading the viewer would see a real nav with a second row
  of grey pills under it.
- **Fix:** skeleton removed, with the same comment plan 34-05 wrote when it did
  this to `finance/loading.tsx:8-11` and the analytics skeletons. Nothing else in
  the file changed. Function renamed `AdminEventsLoading` → `EventsLoading`, the
  surface no longer being one tree's.

### 5. [Measurement correction] `34-09-SUMMARY.md` does not exist yet

The plan's `read_first` names it as the source of the classification format.
34-09 is a **concurrent sibling in this same wave**, so its summary cannot exist
when this plan runs. The format was taken from `34-09-PLAN.md` and from
`34-RESEARCH.md`'s own per-pair treatment (§ D3, D4) instead: one row per
difference, verdict of drift / guard / cosmetic, and the naming of the
`private.role_capabilities` row for every guard.

**No Rule 4 case arose.** No migration, no grant, revoke or re-scope, no new
capability key, no package installed, no test framework, no visual redesign.
`/admin/scanner` did not move and is absent from the diff
(`git diff -M --name-only | grep -c scanner` → 0). `capability-routes.ts` and
`src/lib/supabase/middleware.ts` are likewise absent — both read, neither edited.

---

## Finding 1 — the wave-4 hazard, measured

**This is the plan's most useful result after the collapse itself.**

Deleting `src/app/(organizer)/organizer/events/page.tsx` removes `/organizer/events`
from the generated route union. Every surviving `redirect("/organizer/events")`
and `href="/organizer/events"` in the tree becomes a type error at once.

`npx tsc --noEmit` reports **nineteen**, in **seven** files:

| File | Errors | Owner |
|---|---|---|
| `(organizer)/organizer/events/[id]/tickets/page.tsx` | 5 | plan **34-13** |
| `(organizer)/organizer/events/[id]/analytics/page.tsx` | 3 | plan **34-14** |
| `(organizer)/organizer/events/[id]/guest-list/page.tsx` | 3 | plan **34-14** |
| `(organizer)/organizer/events/[id]/sales/page.tsx` | 3 | plan **34-14** |
| `(organizer)/organizer/events/[id]/edit/page.tsx` | 2 | plan **34-12** |
| `(organizer)/organizer/events/[id]/media/page.tsx` | 2 | plan **34-14** |
| `(organizer)/organizer/events/[id]/drinks/page.tsx` | 1 | plan **34-12** |

**Every one of the seven is deleted by its owning plan in this same wave**
(`34-12:169`, `34-13:185`, `34-14:214`). So the errors are an artefact of a
worktree holding one sibling's deletion and not the others' — not a defect this
plan introduced into the phase, and not one it may fix, since editing a file a
concurrent sibling deletes produces a modify/delete conflict.

Two things follow, and neither is optional reading:

1. **`rm -rf .next && npm run build` cannot exit 0 in this worktree alone.** The
   plan's `<verify>` is unreachable in isolation for exactly the reason plan
   34-07's Deviation 1 recorded about its own two-commit split. How it was
   discharged instead is below.
2. **The two literals outside those seven files were fixed here** (Deviations 1
   and 2), because nothing else in the wave would have.

### How the build gate was discharged

The post-merge tree was **simulated**, not assumed:

```
1. checksum all 8 files under (organizer)/organizer/events/[id]/   → recorded
2. move that directory out of the tree                              (what 34-12/13/14 do)
3. rm -rf .next && npm run build                                    → EXIT 0
4. move it back
5. re-checksum all 8                                                → identical, byte for byte
6. git status --porcelain                                           → the plan's own changes only
```

All eight checksums matched on restore. The build log is the ordinary one:
`✓ Compiled successfully`, TypeScript clean, and the route manifest quoted above.

**What this proves and what it does not.** It proves that every file this plan
owns typechecks against a regenerated route union in the tree that will exist
once the wave merges. It does **not** prove the merge itself is clean — that is
the orchestrator's, and it is why the seven owners are named above rather than
characterised.

---

## Finding 2 — nine `revalidatePath` calls now name an address with no page

Left untouched, deliberately, and the two plans agree in writing.

```
src/app/(admin)/admin/events/actions.ts        5 × revalidatePath("/organizer/events")
src/app/(public)/tickets/refund-actions.ts     4 × revalidatePath("/organizer/events")
```

`34-16-PLAN.md:11-12,95,101` names both files and names those calls. Splitting a
matched `/admin/…` + `/organizer/…` pair across two plans is how one half gets
deleted, and `revalidatePath` is untyped, so nothing else in the toolchain can
see it (D-34-16).

**The consequence, stated rather than implied:** between this commit and 34-16,
publishing, unpublishing, deleting an event or processing a refund will not
refresh a cached events list, and **there is no error tracking to report it**.
This is plan 34-06's Finding 5 on a second surface, with the same window.

---

## Finding 3 — the address walk, and what it cannot show

`npm run dev` in this worktree. **A first measurement was discarded**: port 3000
was already held by another process, and the 404s it returned were another
tree's. The server was on **3001**, and that is where these came from:

```
/organizer/events       → 307   location: /admin/events
/organizer/events/new   → 307   location: /admin/events/new
/organizer              → 307   location: /admin/events
```

307 is correct in flight; the flip to 308 is 34-17's (D-34-15). The third row is
the evidence that Deviation 2 is verdict-neutral: `/organizer` is translated in
the middleware and its page body never runs.

**Everything under `/admin` is unobservable here.** There is no `.env.local` in
this worktree, so `updateSession` throws before route resolution and every
`/admin` address answers 500 — one that exists and one that does not,
indistinguishably:

```
/admin/events                   → 500
/admin/events/does-not-exist-xyz → 500
```

Plan 34-06's Finding 4, unchanged. **The route manifest carries the existence
claim, not the walk.**

---

## Not claimed

- **That an organizer sees the right rows, or a master the others'.** No
  capability refusal was observed with a session — there are no credentials in
  this worktree. Procedures **M-1 and M-2** in `34-VALIDATION.md` observe that,
  in plan 34-17, and they are unrun.
- **That creating an event works end to end.** `EventForm`'s post-submit
  destination changed; the compiler proves the address exists, nothing here
  proves the round trip.
- **Nothing is verified because tests pass.** There is no test runner for this
  product. The gates are `npm run build`, `npm run verify:persona`, and written
  procedures.
- **`npm run verify:capabilities` was not run** — it needs a live database, there
  is no CI, and this plan edits no migration and no key. It remains a written
  pre-deploy step (D-34-12).

---

## Verification Run

| Command | Result |
|---|---|
| `rm -rf .next && npm run build` — this worktree as it stands | exit **1**, 19 errors, all in the seven sibling-owned files (Finding 1) |
| `rm -rf .next && npm run build` — simulated post-merge tree | exit **0**, `✓ Compiled successfully` |
| Sibling files checksummed before and after the simulation | 8 of 8 **identical** |
| `npm run verify:persona` | exit **0** — 7/7 verdi, worst case 10 311 tokens of 12 000 |
| `find "src/app/(admin)" -path '*events/page.tsx'` | one path |
| `find "src/app/(admin)" -path '*events/new/page.tsx'` | one path |
| `(organizer)/organizer/events/{page,loading,new/page}.tsx` | gone |
| `grep -c "basePath" EventList.tsx` | **0** |
| `grep -c "/organizer" EventList.tsx` | **0** |
| `grep -c '/admin/events/' EventList.tsx` | **7** (six hrefs + one import) |
| `grep -c 'as Route' EventList.tsx` | **0** |
| `grep -c ORGANIZER_ACCESS` on both merged pages | **1** each |
| `grep -c 'role === "master"'` on both merged pages | **0** each |
| `grep -rc "StaffNav\|MobileNav\|as UserRole\|as UserStatus"` across the three `(work)/events` files | **0**, **0**, **0** |
| `admin/events/actions.ts` in `git diff -M --name-only` | **absent** |
| `admin/events/actions.ts` rename or hunk in `git diff -M` | **none** |
| `revalidatePath(` count in that file | **8**, unchanged |
| any `(public)` file in the diff | **0** |
| `scanner` in the diff | **0** |
| `capability-routes.ts` / `supabase/middleware.ts` in the diff | **absent** |
| `git diff --diff-filter=D` on the commit | 3 deletions, all intentional and named below |
| `git status --porcelain` | empty before this file was written |
| `STATE.md` / `ROADMAP.md` | **not touched** — the orchestrator owns those writes |

The three deletions are `(admin)/admin/events/{page,new/page}.tsx` and
`(organizer)/organizer/events/loading.tsx`. Git attributed the two merged pages
as renames **from the organizer twins**, not from the admin ones, because the
merged body is the organizer version's plus the collapse edits — which is the
Task 1 verdict showing up in the rename detector.

---

## Known Stubs

None. No placeholder, no TODO, no hardcoded empty value, no mock. The empty and
error states on both surfaces are the ones the pages already carried.

---

## Threat Flags

None. No network endpoint, no auth path, no file-access pattern and no schema
change was introduced.

| Threat | Disposition | Evidence |
|---|---|---|
| T-34-53 — master-only controls drawn for an organizer | mitigated, **and the threat re-described** | There are no master-only *controls* on this surface; the `master.manage` branch is a row scope. It is held from the resolved set, never a role string (`grep` → 0), and `deleteEvent` re-asks `master.manage` inside itself — untouched, no hunk |
| T-34-54 — reachability conflated with deletion rights | mitigated | Two keys, two questions: `organizer.access` opens the address (`capability-routes.ts:254`), `master.manage` scopes the rows (`:316-318`, `scope: "table"`). `keys.ts:38-45` cited above |
| T-34-55 — a collapsed event surface advancing a venue reveal | mitigated, **checked** | Grep across all six files: one match, a comment about URL prefixes. No venue column in the `select()`, none in `EventItem`, no `venue_reveal_sent` write. Recorded with the lines read |
| T-34-56 — a stale `/organizer/events` link surviving in the shared list | mitigated | Prefix prop deleted, literal inlined; `grep -c "/organizer"` → 0 and `grep -c 'as Route'` → 0, so the check cannot be cast away. The six hrefs asserted **present**, not merely the prop absent |
| T-34-57 — a list that stops refreshing | **transferred, and now observed** | Nine calls named in Finding 2, all owned by 34-16, window open from this commit |
| T-34-57b — the public purchase path losing its actions | mitigated | `admin/events/actions.ts` did not move and has no hunk; zero `(public)` files in the diff |
| T-34-SC — package installs | mitigated | None attempted |

---

## Next Plan Readiness

- **34-12, 34-13, 34-14** will each find their organizer twin already carrying
  stale `/organizer/events` literals that fail `typedRoutes`. Those are the
  nineteen errors of Finding 1, and deleting the twin removes them. **If a plan
  in that group chooses to retarget rather than delete, it must retarget to
  `/admin/events`.**
- **34-15** finds `(organizer)/organizer/page.tsx` still present, still the last
  file, now redirecting to `/admin/events`. Its `find` → one path and
  `grep -rn '(organizer)' src/` → 0 assertions are unaffected.
- **34-16** owns nine `revalidatePath("/organizer/events")` calls across two
  files, unchanged and at the paths it expects.
- **34-17** flips 307 → 308; both events rows were observed answering 307.
- **Phase 39** is unaffected. The door is outside `(work)` by construction and
  absent from this diff.

---

## Self-Check: PASSED

Verified against the committed tree, not against this document:

- `src/app/(admin)/admin/(work)/events/page.tsx` — FOUND
- `src/app/(admin)/admin/(work)/events/new/page.tsx` — FOUND
- `src/app/(admin)/admin/(work)/events/loading.tsx` — FOUND
- `src/app/(admin)/admin/events/actions.ts` — FOUND, outside `(work)`, no hunk
- `src/app/(admin)/admin/events/page.tsx` — GONE
- `src/app/(admin)/admin/events/new/page.tsx` — GONE
- `src/app/(organizer)/organizer/events/page.tsx` — GONE
- `src/app/(organizer)/organizer/events/loading.tsx` — GONE
- `src/app/(organizer)/organizer/events/new/page.tsx` — GONE
- `src/app/(admin)/admin/scanner/` — present, unmoved, absent from the diff
- Commit `326f460` — present in `git log`
- `STATE.md` and `ROADMAP.md` — **not touched**

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-10*
