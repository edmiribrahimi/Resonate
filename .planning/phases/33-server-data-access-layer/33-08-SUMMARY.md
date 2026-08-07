---
phase: 33-server-data-access-layer
plan: 08
subsystem: access-gating
tags: [capabilities, ownership, organizer, CAP-05, criterion-1, criterion-3]
requires:
  - "src/lib/capabilities/guards.ts (ownsOrIsMaster) — plan 33-01"
  - "src/lib/capabilities/server.ts (getAccessContext) — phase 32"
  - "src/lib/capabilities/keys.ts (CAP) — phase 32"
provides:
  - "Seven per-event organizer pages deciding reachability and ownership from the session"
  - "Seven inline ownership expressions deleted; every ownership decision is one call"
affects:
  - "Phase 34 STAFF-03 — navRole/navStatus casts are the seam it removes"
  - "Plan 33-14 — meter arithmetic and the unrun end-to-end procedure"
tech-stack:
  added: []
  patterns:
    - "ctx kept whole for the guard; only nav-bound fields destructured and cast"
    - "master short-circuit outside the row read where a read exists"
key-files:
  created: []
  modified:
    - "src/app/(organizer)/organizer/events/[id]/analytics/page.tsx"
    - "src/app/(organizer)/organizer/events/[id]/drinks/page.tsx"
    - "src/app/(organizer)/organizer/events/[id]/edit/page.tsx"
    - "src/app/(organizer)/organizer/events/[id]/guest-list/page.tsx"
    - "src/app/(organizer)/organizer/events/[id]/review/page.tsx"
    - "src/app/(organizer)/organizer/events/[id]/sales/page.tsx"
    - "src/app/(organizer)/organizer/events/[id]/tickets/page.tsx"
decisions:
  - "The plan's claim that review/page.tsx reads through getServiceClient is wrong; it does not, and the file's own comment forbids naming that module. Left at zero."
  - "The tickets page's error/not-found/not-owner arms were split into three conditions rather than the plan's single disjunction, per the plan's own note 2."
  - "A categorised console.error was added to the tickets lookup failure, and recorded in the code as a diagnosis aid rather than an observable effect."
metrics:
  duration: "~40 min"
  completed: 2026-08-07
  tasks: 2
  commits: 2
---

# Phase 33 Plan 08: Per-Event Organizer Pages Summary

Seven per-event organizer pages now resolve identity from the session instead of
from a client-supplied request header, and seven separately-written ownership
decisions became one call each to `ownsOrIsMaster`.

## What changed

| Page | Old reachability | Old ownership | New ownership |
|---|---|---|---|
| `analytics/page.tsx` | `:36` role compare | `:54` | `:69` `ownsOrIsMaster` |
| `drinks/page.tsx` | `:24` | `:40` | `:46` |
| `edit/page.tsx` | `:23` | `:41` | `:58` |
| `guest-list/page.tsx` | `:23` | `:41` | `:55` |
| `review/page.tsx` | `:72` | `:100` | `:118` |
| `sales/page.tsx` | `:23` | `:41` | `:54` |
| `tickets/page.tsx` | `:28` | `:35-44` guarded fetch | `:48` `CAP.MASTER_MANAGE` + `:78` `ownsOrIsMaster` |

All seven reachability gates are now `CAP.ORGANIZER_ACCESS` (role only, status
ignored — the question `middleware.ts:180-184` asks). All seven redirect targets
are unchanged.

### The seven deleted expressions, for plan 33-14's criterion-3 count

At base commit `0521203`, verbatim:

1. `analytics/page.tsx:54` — `if (role === "organizer" && event.created_by !== userId) redirect("/organizer/events");`
2. `drinks/page.tsx:40` — same expression
3. `edit/page.tsx:41` — same expression
4. `guest-list/page.tsx:41` — same expression
5. `review/page.tsx:100` — same expression
6. `sales/page.tsx:41` — same expression
7. `tickets/page.tsx:35-44` — the same truth as a guarded fetch: `if (role === "organizer") { … if (error || !event || event.created_by !== userId) redirect(…) }`

Seven expressions removed, zero remaining. `grep -c 'created_by !== '` and
`grep -c 'role === "organizer"'` are both **0** across all seven files. Note that
this required rewording one of my own explanatory comments in
`analytics/page.tsx`: the comment originally spelled the forbidden expression out
while explaining why not to write it, and a substring check does not care about
intent. That is the same class of thing wave 1 hit with the meter.

## The meter

**Base at commit `0521203`: 102 lines / 47 files** — reconciled against
`npm run verify:no-header-identity`, not against `33-02-SUMMARY.md`'s 98/45. The
briefing's correction is confirmed: the difference is comment-shaped mentions
written by wave 1, which the meter counts on purpose.

**After this plan: 81 lines / 40 files.**

| | Lines | Files |
|---|---|---|
| Base | 102 | 47 |
| Removed by this plan | 21 (3 per file × 7) | 7 |
| Expected | 81 | 40 |
| Measured | **81** | **40** |

The total fell by **exactly** the number removed, so nothing moved sideways into
another file. The two residual `x-user-` lines under
`organizer/events/[id]/` are in `guest-list/actions.ts:16-17`, which belongs to
plan 33-09 and was not touched.

## Was the end-to-end procedure run? No. Plainly, and here is why.

**It was not run, and it cannot be run from this worktree.** Not "was skipped for
time" — two independent blockers:

1. **The only reachable Supabase is the hosted production project.** The
   `.env.local` in the main checkout points `NEXT_PUBLIC_SUPABASE_URL` at the
   hosted project; the only `localhost` value in that file is
   `NEXT_PUBLIC_APP_URL`. The mutation-proof half of the procedure requires
   revoking `master.manage` and rolling it back. Doing that against production
   would refuse **every** master on the live site for the duration, in a project
   with no error tracking to notice. An unattended executor must not do that.
2. **No live sessions.** The role half needs three authenticated browser
   sessions — organizer A, organizer B, and a master. I hold no credentials and
   have no interactive login.

Handed to plan 33-14. The procedure it must run, on a non-production database:

> **Setup.** Two events, E1 created by organizer A, E2 created by organizer B.
>
> **Step 1 — an organizer is refused another organizer's event.** Signed in as
> organizer B, open `/organizer/events/<E1>/edit`. **Must observe:** redirected
> to `/organizer/events`; the edit form never renders, and neither does any
> `venue_secret` value. Repeat for the other six addresses under `<E1>` —
> `analytics`, `drinks`, `guest-list`, `review`, `sales`, `tickets`.
>
> **Step 2 — an organizer reaches their own.** Still as organizer B, open
> `/organizer/events/<E2>/edit`. **Must observe:** the form renders.
>
> **Step 3 — a master reaches any.** Signed in as a master, open
> `/organizer/events/<E1>/edit`. **Must observe:** the form renders, on an event
> the master does not own.
>
> **Step 4 — the mutation, which is what makes steps 1-3 mean anything.**
> Without it step 3 passes on what could be dead code. Revoke the `master.manage`
> grant for the master account, then **assert the revoke was applied before
> reading any page** — re-run `my_access_context()` for that session and confirm
> `master.manage` is absent from `capabilities`. Only then reload
> `/organizer/events/<E1>/edit`. **Must observe:** now redirected to
> `/organizer/events`. Restore the grant; confirm the page renders again.
>
> Step 4 is the answer to *"what input would make this fail?"*. Steps 1-3 alone
> are consistent with a gate that admits everybody.

## What the build does and does not prove

`rm -rf .next && npm run build` exits **0** after each of the two commits
(logs: `/tmp/33-08-build-t1.log`, `/tmp/33-08-build-t2.log`; only the pre-existing
`outputFileTracingRoot` workspace warning).

That proves the capability keys name real constants and the types line up.
**It proves nothing about who is refused.** Measured by a sibling plan this wave,
in both directions: a misspelled `CAP.*` key fails the build (exit 1), but
inverting `if (!capabilities.has(…))` to `if (capabilities.has(…))` builds
**clean** (exit 0). An inverted gate would refuse every master, admit everyone
else, compile green and ship. This repository has **no test runner**; nothing
here was verified by tests, because there are none.

## Security posture

Nothing widens. Per role, against the base commit:

| Role | Before | After |
|---|---|---|
| master | fell through the ownership `if` because it began `role === "organizer"` | admitted at step 1 of the guard, **before** the row is considered |
| organizer, own event | `created_by === headerUserId` | `created_by === auth.uid()` |
| organizer, another's event | refused | refused |
| row with null `created_by` | refused, because `null !== ""` happened to differ | refused, by a stated rule (`!createdBy`) |
| no identity | refused, because `created_by !== ""` | refused, by a stated rule (`!ctx.userId`) |

Two real improvements, not just parity:

- **Identity source (T-33-39).** The old comparison used
  `headersList.get("x-user-id")`, i.e. client-supplied input trusted on the
  strength of a middleware strip in a different file. It now comes from
  `auth.uid()` inside the JWT.
- **Master no longer depends on the row read (T-33-41).** Under the old shape a
  master's verdict silently depended on the `events` SELECT policy returning
  `created_by`. It no longer does — a strictly better failure mode if that policy
  is ever narrowed.

**Venue secrecy.** `edit/page.tsx` renders `venue_secret`, `venue_secret_hint`,
`venue_reveal_hours` and `venue_reveal_on_purchase` for every party. Per the
table above, no role gains sight of a venue it could not already see, and no code
path here writes or reads `venue_reveal_sent`. The monotone switch is untouched.

**Service-role client, stated in writing per file** (`access-gating.md` gate
*service role*; `meta-gates.md` requires the statement, not a commit aside):

- `guest-list/page.tsx:64` — `getServiceClient()` reads `guest_list_entries`.
  RLS is bypassed there, so the ownership `if` at `:55` is the only boundary
  scoping that query. Call count unchanged (2 occurrences, import + call).
- `sales/page.tsx:88` — `getServiceClient()` reads `tickets` and `profiles`, and
  ships buyer names and email addresses into a client component. Same statement.
  Call count unchanged (2).
- `review/page.tsx` — **the plan is wrong about this file.** It uses no service
  client and never did; its own comment explains that the module's name is
  deliberately not written out because a grep checks for its absence. Count
  remains **0**, and this conversion did not introduce it.
- `tickets/page.tsx:155-158` — builds a service-role client **inline** from
  `SUPABASE_SERVICE_ROLE_KEY` rather than via `getServiceClient()`. Pre-existing,
  untouched, reported below.

## Deviations from Plan

### 1. [Rule 1 — factual correction] `review/page.tsx` does not use the service client

- **Found during:** Task 1
- **Issue:** The plan states `guest-list`, `sales` **and** `review` "additionally
  read through `getServiceClient()`". `review/page.tsx` does not, and its own
  file comment says the absence is grep-checked and the module name is therefore
  not spelled out even in prose.
- **Fix:** No service client introduced. Left at 0. Recorded here so 33-14 does
  not go looking for an unchanged call count that never existed.
- **Commit:** `76e3431`

### 2. [Rule 2 — zero silent failures] Three arms instead of one on the tickets page

- **Found during:** Task 2
- **Issue:** The plan's sample code collapses `error || !event || !ownsOrIsMaster(…)`
  into one condition while its own note 2 asks that the arms stay separate.
- **Fix:** Written as three conditions — lookup failed, no such row, not the
  owner — each with its own comment, sharing one destination today so a future
  change can give them different ones. Added
  `console.error("tickets:ownership_lookup_failed", { eventId, code })`.
- **Stated honestly in the code:** with no error tracking in this project that
  log reaches nobody, so it is a **diagnosis aid, not an observable effect**. The
  three causes remain indistinguishable to the person redirected. Claiming
  otherwise would be the recorded newsletter defect with a category attached.
- **Commit:** `8ed1c77`

### 3. [Rule 1 — self-inflicted] A comment spelling out the forbidden expression

- **Found during:** Task 1 verification
- **Issue:** My explanatory comment in `analytics/page.tsx` wrote
  `created_by !== userId` verbatim while explaining why nobody should. The
  plan's own automated check greps for that substring; a substring check has no
  notion of intent. Same class as the four comment-shaped meter lines wave 1 left.
- **Fix:** Reworded to describe the comparison without spelling it, matching the
  discipline `review/page.tsx` already applies to the service client's name.
- **Commit:** `76e3431`

### 4. [Rule 2 — stale justification] `force-dynamic` comment in `review/page.tsx`

- **Found during:** Task 1
- **Issue:** The comment justified `export const dynamic = "force-dynamic"` as
  "belt and braces, the page already reads `headers()`". After conversion the
  page reads no headers; the implicit dynamic opt-out now comes from `cookies()`
  inside `getAccessContext()`, one import further away.
- **Fix:** Comment rewritten to say the line is **no longer redundant** and why it
  must stay. A stale justification on a cache directive over per-night operational
  data is how such a line gets deleted as dead weight.
- **Commit:** `76e3431`

## Reported, not fixed (out of this plan's scope)

- **`tickets/page.tsx:155-158`** constructs a service-role Supabase client inline
  from `process.env.SUPABASE_SERVICE_ROLE_KEY` instead of using
  `getServiceClient()`. Pre-existing; changing which client reads what would be a
  behaviour change wearing a refactor's clothes.
- **`getDrinkItems`** (imported by `drinks/page.tsx:6`, defined in
  `src/app/(organizer)/organizer/events/actions.ts`) is exported from a
  `"use server"` module with no gate of its own, bounded only by RLS on
  `drink_items` — observed independently by plan 33-06. **It is not in this
  plan's `files_modified`,** so it was reported rather than fixed. It belongs to
  whichever plan owns `events/actions.ts` (33-09).
- **`ReviewListClient`** (`review/page.tsx`) still receives `role` as a prop and
  branches `role === "master"` on the client for the technical-view affordance.
  Its own comment calls that an interface affordance and not a security boundary.
  The prop was left alone per the scope line — phase 34 (STAFF-03) owns it.
- Pre-existing lint (~21 errors / ~108 warnings, none from this phase) untouched.

## Known Stubs

None. No hardcoded empty value, placeholder string, TODO or unwired component was
introduced.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change
was introduced; the seven files' data reads are byte-for-byte the queries they
were before, with only the decision above them replaced.

## Self-Check: PASSED

Files (all 7 present):

- `src/app/(organizer)/organizer/events/[id]/analytics/page.tsx` — FOUND
- `src/app/(organizer)/organizer/events/[id]/drinks/page.tsx` — FOUND
- `src/app/(organizer)/organizer/events/[id]/edit/page.tsx` — FOUND
- `src/app/(organizer)/organizer/events/[id]/guest-list/page.tsx` — FOUND
- `src/app/(organizer)/organizer/events/[id]/review/page.tsx` — FOUND
- `src/app/(organizer)/organizer/events/[id]/sales/page.tsx` — FOUND
- `src/app/(organizer)/organizer/events/[id]/tickets/page.tsx` — FOUND

Commits: `76e3431` FOUND, `8ed1c77` FOUND.

Assertions re-run at the end of the plan:

- `grep -ci 'x-user-'` across the seven → **0**
- `grep -c 'created_by !== '` across the seven → **0**
- `grep -c 'role === "organizer"'` across the seven → **0**
- `ownsOrIsMaster` present in all seven → **yes**
- `getServiceClient` counts: guest-list 2, sales 2, review 0 → **unchanged**
- `npm run build` → **exit 0** after each commit
- meter → **81 / 40**, exactly base minus what was removed

No modification to `STATE.md`, `ROADMAP.md`, `deferred-items.md`, or any file
outside this plan's `files_modified`.
