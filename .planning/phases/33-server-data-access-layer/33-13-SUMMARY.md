---
phase: 33-server-data-access-layer
plan: 13
subsystem: access-gating
tags: [capabilities, criterion-3, media, drinks, member-management, rls]
requires:
  - "33-01 — getAccessContext().userId, AccessContextResult"
provides:
  - "five profile-read permission predicates resolved from the session"
  - "verifyMaster / verifyAdminOrOrganizer as two session-derived gates with two keys"
affects:
  - "33-14 (phase gate — owns the behavioural sweep this plan cannot perform)"
  - "phase 34 STAFF-03 (master.manage and admin.access part company there)"
tech-stack:
  added: []
  patterns:
    - "resolve getAccessContext() ONCE into a local inside a Server Action — cache() does not memoise there"
    - "equivalence claimed from the GRANT ROWS, never from how the deleted code read"
    - "two gates that look identical stay two, with the reason written above the pair"
key-files:
  created: []
  modified:
    - src/app/(public)/events/[slug]/actions.ts
    - src/app/(public)/events/[slug]/menu/actions.ts
    - src/app/(admin)/admin/members/actions.ts
decisions:
  - "D-33-13-A: all five predicates map to requires_approved = false grants, because all five read select(\"role\") and never fetched status"
  - "D-33-13-B: assertStaffManage() does not exist in guards.ts — the gate is written inline, in the plan's own task-3 shape, rather than adding a symbol to a file another plan owns"
  - "D-33-13-C: the anonymous case keeps its own thrown category instead of collapsing into the capability refusal"
  - "D-33-13-D: validateMediaUpload is NOT converted — it is not one of the plan's five sites and it asks a different question"
metrics:
  duration: "~55 min"
  completed: 2026-08-07
  tasks: 3
  commits: 3
requirements: [CAP-05]
---

# Phase 33 Plan 13: The Last Five Predicates Summary

Five database-sourced permission tests in three files now ask the session instead of
re-reading `profiles`, with each conversion grounded in the grant rows that make it
equivalent — and the one pair that must survive as a pair survives, with its reason
written into the file.

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Media moderation and deletion | `8241563` | `src/app/(public)/events/[slug]/actions.ts` |
| 2 | The menu-closing action | `27f3a6c` | `src/app/(public)/events/[slug]/menu/actions.ts` |
| 3 | The two member gates that must stay two | `4fc1b85` | `src/app/(admin)/admin/members/actions.ts` |

## The equivalence, per predicate — what was MEASURED

A predicate that merely *reads alike* is not equivalent. Every one of the five was
checked against `private.role_capabilities` in
`supabase/migrations/20260807000000_capability_model.sql`, not against how the deleted
code happened to read.

| # | Site | Deleted predicate | Client it read with | Capability | Grant rows | `requires_approved` |
|---|---|---|---|---|---|---|
| 1 | `updateMediaStatus` | `role !== "organizer" && role !== "master"` | cookie client, RLS applies | `staff.manage` | `('master',…)` `:392`, `('organizer',…)` `:393` | **false**, false |
| 2 | `deleteMedia` (staff arm) | same | cookie client | `staff.manage` | `:392`, `:393` | **false** |
| 3 | `updateMenuClosesAt` | `role !== "master" && role !== "organizer"` | cookie client | `staff.manage` | `:392`, `:393` | **false** |
| 4 | `verifyMaster` | `role !== "master"` | cookie client | `master.manage` | `('master',…)` `:396` | **false** |
| 5 | `verifyAdminOrOrganizer` | `role !== "master" && role !== "organizer"` | cookie client | `staff.manage` | `:392`, `:393` | **false** |

**The single fact that decides `requires_approved` for all five: every one of them read
`select("role")`. `status` was never fetched, so it could not be part of any of the five
predicates.** That is what maps them to `requires_approved = false` rows and what
excludes `catalogue.manage`, whose two rows carry `true` (`:399-400`). Nothing here
collapses `catalogue.manage` into `staff.manage`; getting it backwards would have locked
out a **pending** organizer who can do all five of these today.

**All five read with the cookie client, so none of them is the `verifyOrganizerAccess`
trap** — no site converted here answered a question through `getServiceClient()` that its
capability equivalent would answer under RLS. (The `event_parties` *write* in
`updateMenuClosesAt` is a service-client write, which is a different thing and is
addressed below.)

### The two near neighbours, rejected in writing

- **`catalogue.manage`** — `requires_approved = true`. Would refuse a pending organizer
  who moderates media, deletes media and sets `menu_closes_at` today. Verdict change.
- **`admin.access`** — granted to `master` alone (`:408`). Would refuse every organizer
  on sites 1, 2, 3 and 5. Verdict change.
- **`master.manage` over `admin.access` for `verifyMaster`** — the two resolve to the
  *same predicate* today, so choosing by predicate is invisible. They are different
  questions: `CAP_DESCRIPTIONS["master.manage"]` names *changing another member's role or
  status* by hand; `admin.access` asks "may they reach the admin area". Phase 34 collapses
  the admin and organizer trees into one surface, which is where the two part company.

## The pair that stays a pair

`verifyMaster` and `verifyAdminOrOrganizer` are now four lines each and differ in exactly
one — the capability key. That is what would tempt the next reader running `diff` on them
into merging them, so the reason is written **into the file, above the pair**.

- Merging onto `STAFF_MANAGE` hands **every organizer the power to change another
  member's role**, which is exactly the ceiling `ACCESS-MODEL-DECISIONS.md` §6 puts in
  place: *a self-replicating power must not reach the top*.
- Merging onto `MASTER_MANAGE` takes approve/reject away from every organizer.

Neither is a tidy-up. Both are verdict changes.

**Asserted mechanically:** 2 definitions + 7 call sites = **9**
(`grep -c 'verifyMaster(\|verifyAdminOrOrganizer('` → `9`).
`CAP.MASTER_MANAGE` and `CAP.STAFF_MANAGE` each appear in the file, in different
functions.

## The duplicates are deleted, and here is the search that proves it

The duplicate was never the two functions — it was the **preamble**, twenty lines of
`getUser()` + `profiles` select repeated across five sites. It is gone, not orphaned.

A `select("role")` assertion is vacuous wherever the code writes `select("role, status")`,
so the broad, case-insensitive, variable-agnostic form was used instead:

```
grep -cEi '\.role *(!==|===|==|!=) *"' <file>

  src/app/(admin)/admin/members/actions.ts       -> 0
  src/app/(public)/events/[slug]/menu/actions.ts -> 0
  src/app/(public)/events/[slug]/actions.ts      -> 1   (validateMediaUpload, out of scope — below)
```

```
grep -nE 'select\("role' across the three files
  -> only comment lines, plus ONE code hit:
     src/app/(public)/events/[slug]/actions.ts:30  .select("role, status")   <- validateMediaUpload
```

`grep -n 'from("profiles")'`:
- `menu/actions.ts` — **zero**.
- `events/[slug]/actions.ts` — one, in `validateMediaUpload` (out of scope).
- `admin/members/actions.ts` — eleven, and **none is an authorisation read**: they are the
  service-client member writes and the email/name lookups the actions always did.

`grep -rniE 'x-user-'` across the three files → **0**. None read a header before; the
assertion guards against one being introduced.

`createClient` (the cookie client) is gone entirely from `admin/members/actions.ts` — it
existed only to feed the deleted preamble. It is **kept** in `menu/actions.ts`, where
`claimGuestOrders` still uses it, and in `events/[slug]/actions.ts`, where three functions
still need it. No client is left constructed-and-unused.

## The meter

**Delta: 0. Base 102 lines / 47 files, after 102 lines / 47 files.**

Measured at the base commit with `npm run verify:no-header-identity`, and re-measured after
each of the three task commits: `102 line(s): 97 in code, 5 comment-shaped`, 47 distinct
files, unchanged throughout.

**Zero is the correct and expected result, not a failure to do the work.** The meter counts
identities derived from **inbound request headers** — criterion-1 work. All five predicates
here read `public.profiles`, which makes them **criterion 3** (one function, duplicates
deleted). Confirmed at the base commit before any edit: none of this plan's three files
appears anywhere in the meter's 47.

The phase total therefore still stands at 102, and it falls by exactly what this plan
removed from it — nothing.

## `deleteMedia`: the shape that had to survive, and the null trap

A member may delete their own upload and nobody else's; staff may delete anyone's. That is
today's answer and it is reproduced exactly — media uploaded by members is user content and
who may moderate it is an access decision (`media-and-storage.md`).

The ownership arm keeps its position, and it **gains** an explicit `if (!ctx.userId) throw`:

- `AccessContextResult.userId` is `string | null`; `event_media.uploaded_by` is nullable.
- The old code compared `user.id`, which could not be null past its auth guard.
- Without the throw, a caller with no identity meeting a row owned by nobody compares
  `null !== null` → false → **admitted through the ownership arm**.
- That arm runs precisely when the capability arm is false, so the capability check does
  **not** cover it. The comment in the file says so, to stop the next editor deleting the
  line as redundant.

`.eq()` would not have caught this: no Supabase client in this repository carries a
`Database` generic, so `string | null` compiles green. Narrowing is the only thing that
refuses.

## The service client in `updateMenuClosesAt`, justified in writing

Retained deliberately: an organizer has **no RLS write permission on `event_parties`**, so
the write cannot be performed as the caller. The consequence, stated rather than left
implicit (`access-gating.md`, gate *service role*):

> On this path **the code is the security boundary**. There is no row-level policy behind
> the gate to catch a caller the gate let through, and `partyId` is untrusted client input.
> That is why the capability check runs **before** the write, not after it.

`menu_closes_at` is money-adjacent — it decides when drink tokens stop being purchasable and
when the one-hour redeem grace period starts. `git diff` on that file touches **no** line
matching `menu_closes_at` / `end_time` / `graceEnd` / `menuCloseInstant` outside comments:
the written value, the `end_time` fallback and the grace window are byte-identical.

Middleware is UX; RLS is the security boundary. No comment added by this plan implies
otherwise — and on this one path, where RLS is bypassed by design, the summary says so out
loud instead of letting the reader assume a policy is standing behind it.

## Venue secrecy and the monotone switch

`venue_reveal_sent` is untouched, and nothing here widens who sees anything.

- The two media sites change **who may moderate and who may delete** — both write-side
  decisions. Nobody gains sight of a photo they could not already see; the read paths for
  `event_media` are unchanged.
- `updateMenuClosesAt` writes a closing time on `event_parties` and reads nothing.
- The seven member actions write `profiles` rows.

No storage path, bucket or public-URL line changed in any commit — verified by grepping the
diffs for `storage|bucket|event-media|publicUrl|NEXT_PUBLIC_SUPABASE_URL`, which matched
**only comment lines**. No checkpoint was required.

## `updateMemberRole` is byte-identical below its guard

The owner decision of 2026-08-06 — granting `organizer` approves the account in the same
write; demotion does **not** revoke approval because `member` and `approved` are different
axes — and the role/status coupling write it governs are proven unchanged:

```
awk '/Granting the organizer role approves/,/eq\("id", memberId\)/'  on HEAD~1 and on the new file
  -> 22 lines each, diff clean
```

**And that check was proven non-vacuous by mutation.** Asked of it: *what input would make
this fail?* — a changed character anywhere in those 22 lines. Demonstrated:

| Step | Evidence |
|---|---|
| Mutation: drop `status: "approved"` from the coupling, on a copy | asserted applied — `grep -c 'role: newRole, status: "approved"'` → **0** |
| Re-run the anchored diff | **fires**: `19c19  ? { role: newRole, status: "approved" }` vs `? { role: newRole }` |
| Restore | copy discarded; the real file never mutated |

The diff on that function is exactly what the plan allows: two lines removed (the cookie
client construction and the old parameterised guard call), one added (`const ctx = await
verifyMaster();`), and `memberId === user.id` → `memberId === ctx.userId`.

## Resolve counts — every one is 1

`cache()` does **not** memoise inside a Server Action body (measured in 33-RESEARCH: three
calls → three executions). Each converted action is a Server Action, so the context is
resolved once into a local and reused; `hasCapability` is called **nowhere** in these three
files, which is what would have produced a second round trip.

| Action | Kind | `getAccessContext()` calls |
|---|---|---|
| `updateMediaStatus` | Server Action | 1 |
| `deleteMedia` | Server Action | 1 |
| `updateMenuClosesAt` | Server Action | 1 |
| `updateMemberRole` | Server Action | 1 (via `verifyMaster`) |
| `deactivateMember` | Server Action | 1 (via `verifyMaster`) |
| `reactivateMember` | Server Action | 1 (via `verifyMaster`) |
| `approveMember` | Server Action | 1 (via `verifyAdminOrOrganizer`) |
| `rejectMember` | Server Action | 1 |
| `bulkApproveMember` | Server Action | 1 |
| `bulkRejectMember` | Server Action | 1 |

`grep -n 'getAccessContext('` finds exactly two call sites in the members file (one per
verify function), two in the events file, one in the menu file. No Server Component render
is involved in any of these ten paths, so the memoisation exemption applies to all of them
and the "resolve once" rule is the binding one.

## Attribution — reported, not claimed

`ACCESS-MODEL-DECISIONS.md` §5 requires approval, rejection, account creation, role
promotion, per-night assignment and door override each to record **who** and **when**.

**Measured, and the honest answer is that none of the seven actions writes an attribution
column, because no such column exists:**

```
grep -rniE "approved_by|rejected_by|promoted_by|updated_by" supabase/migrations/
  -> no matches
```

What the seven actions write today is `{ status }`, `{ status, role }` or
`{ role, status }` on `profiles`, and nothing else. §5 is a **stated requirement not yet
implemented in schema**, and this plan does not implement it — that would be a new column,
which is Rule 4 territory.

What this plan does contribute is the precondition: `if (!ctx.userId) throw` sits **inside**
both verify functions rather than at each call site, so no member-management action can
proceed without a real subject in hand. Seven call sites would have been seven chances to
omit it. When §5 lands, the actor is already guaranteed non-null at every one of them.

## Deviations from Plan

**1. [Rule 3 — blocking] `assertStaffManage()` does not exist.** Tasks 1 and 2 instruct
"replace with `assertStaffManage()` from `@/lib/capabilities/guards.ts`". That symbol is not
in `guards.ts` and `grep -rn "assertStaffManage\|assertMasterManage\|assertCapability" src/`
returns nothing at the base commit. `guards.ts` exports `ownsOrIsMaster` and
`assertEventOwnership` only.

Not created, and the reason is the parallel-execution constraint: `guards.ts` is **not** in
this plan's `files_modified`, other wave-2 plans convert `staff.manage` sites too, and two
worktrees adding the same export produces a merge conflict on a security-critical file.
Instead the gate is written **inline in the plan's own task-3 shape** —
`getAccessContext()` → `capabilities.has(CAP.STAFF_MANAGE)` → throw — which is what the plan
itself prescribes for `deleteMedia` and for both member gates. The three files are therefore
internally consistent, and no symbol was added to a file this plan does not own.

**2. [Rule 2 — the anonymous case keeps its own category.]** The plan's task-1 and task-2
instructions replace the whole preamble, which would collapse "there is nobody here" into
"this person may not" — one message for two causes, the recorded newsletter defect
(`meta-gates.md`, *zero fallimenti silenziosi*). Both files previously threw a distinct
`"Not authenticated"`. That distinction is kept as an explicit `if (!ctx.userId) throw new
Error("Not authenticated")` placed **before** the capability check.

**It changes no verdict**: an anonymous caller resolves to `ANONYMOUS_CONTEXT`, whose
capability set is empty, so they were already refused by the line below. It names the cause
rather than widening or narrowing access.

**3. `createClient` was NOT removed from `menu/actions.ts`.** The plan says *"`supabase = await createClient()` may become unnecessary once the auth preamble goes. If nothing else in the
function uses it, delete it."* It is unnecessary **inside `updateMenuClosesAt`**, and it was
deleted there — that function now constructs no client at all. The module-level import
stays, because `claimGuestOrders` still uses the cookie client. Deleting the import would
not have compiled.

## Out of scope, reported rather than fixed

- **`validateMediaUpload`** (`src/app/(public)/events/[slug]/actions.ts:14-58`) still reads
  `getUser()` + `select("role, status")`. It is **not** one of this plan's five sites — the
  plan enumerates two sites in this file, `:124-136` and `:180-196` — and it asks a
  different question: an approved member with attendance for the event, with a staff bypass
  (`role === "organizer" || role === "master"`). Converting it needs `membership.active`
  **and** `staff.manage` **and** the attendance read, and its status arm makes the
  `requires_approved` mapping non-obvious. It is the only remaining `profiles` authorisation
  read in the three files this plan owns. Left for whichever plan owns it; flagged here so
  it is not lost.
- **`PartyDrinkMenu.tsx:82-99`** (`handleSave` / `handleClear`) awaits `updateMenuClosesAt`
  with **no `try`/`catch`**, then calls `onUpdate()` and `setSaved(true)`. If the gate
  refuses, the promise rejects, neither line runs, and the UI shows nothing — no error, no
  saved state. That is a pre-existing silent failure and the file is not in this plan's
  `files_modified` (it is also a client component shared with the drinks surface). Not
  fixed. The gate's refusal on that path currently has **no observable effect** for the
  operator, which matters more now that the thrown message is redacted in production.
- Pre-existing `npm run lint` state (~21 errors / ~108 warnings) untouched and unrelated.

## Verification

**There is no test runner for this product, and none was added. Nothing here is verified
because tests pass.** What was actually run:

| Check | Result |
|---|---|
| `rm -rf .next && npm run build` after task 1 | passes |
| `rm -rf .next && npm run build` after task 2 | `✓ Compiled successfully in 22.0s` |
| `rm -rf .next && npm run build` after task 3 | `✓ Compiled successfully in 24.0s` |
| `npm run verify:no-header-identity` at base and after each task | `102 line(s)`, 47 files — unchanged, as expected |
| `grep -cEi '\.role *(!==\|===\|==\|!=) *"'` on the three files | `0`, `0`, `1` (the out-of-scope `validateMediaUpload`) |
| `grep -rniE 'x-user-'` on the three files | 0 |
| `grep -c 'verifyMaster(\|verifyAdminOrOrganizer('` | `9` (2 definitions + 7 call sites) |
| anchored `diff` on `updateMemberRole`'s 22-line decision block | clean; **and proven to fire under mutation** |
| `git diff --diff-filter=D --name-only HEAD~3 HEAD` | empty — no file deleted by any commit |
| storage/bucket/URL grep over all three diffs | matches comment lines only |

### What a green build does NOT say

**`npm run build` cannot see an inverted gate.** Measured earlier in this phase: a wrong
capability key → build exit 1; `if (!has)` → `if (has)` → build **exit 0**. An inverted gate
refuses every master, admits everyone else, and ships clean. Nothing in this summary claims
behaviour on the strength of the build.

There is also **no error tracking** in this repository, so a refusal that lands in a caller's
`catch` reaches nobody. Two of the three client callers here (`MediaReviewGrid`,
`MyMediaSection`) display `err.message`; the third (`PartyDrinkMenu`) does not catch at all.
Next **redacts server-action error messages in production builds**, so the new
`forbidden.staff_manage_required` / `forbidden.master_manage_required` strings are visible
only in `next dev` — which is precisely why **no caller branches on them**, and none was made
to. A category that must cross to a client has to travel as a tagged value decided by
position, never as a parsed string; no caller in this plan needs one.

## Manual verification still owed

The owner has deferred manual verification to the end of the build, so none of the below was
run. Written out so it exists as a procedure rather than as an intention. It belongs to the
33-14 phase-gate sweep.

1. Sign in as an **organizer / approved**. Open `/admin/members` (or `/organizer/members`).
   Approve a `pending` member. **Observe:** it succeeds, and the member's status becomes
   `approved`.
2. Same session. Attempt a **role change** on any member. **Observe:** refused. In `next dev`
   the message reads `forbidden.master_manage_required`; in production it is redacted, so the
   observable is that the row's `role` is **unchanged** in the database.
3. Sign in as **master**. Change the same member's role to `organizer`. **Observe:** it
   succeeds **and** the same write sets `status = 'approved'` — the 2026-08-06 coupling.
   Demote to `member`. **Observe:** `status` stays `approved`.
4. Sign in as an **organizer / pending** (the asymmetry that must be reproduced, not tidied).
   **Observe:** moderating media, deleting another member's media, and setting
   `menu_closes_at` all still **succeed** — `staff.manage` is `requires_approved = false`. If
   any of these now refuses, `catalogue.manage` was used by mistake somewhere.
5. Sign in as a **member / approved** who uploaded a photo. Delete **their own** upload.
   **Observe:** succeeds. Attempt to delete **someone else's**. **Observe:** refused, and the
   other member's row still exists in `event_media`.
6. **Mutation proof for the polarity, which the build cannot give.** In a transaction, delete
   the `('organizer','staff.manage')` row from `private.role_capabilities`. Assert the delete
   was applied (`select count(*) … → 0`) **before** reading any result. Reload as the
   organizer, attempt an approval, **observe the refusal**, then roll back and re-assert the
   row is present. Without step 6 nothing here distinguishes a correct gate from an inverted
   one.

## Known Stubs

None. All five predicates are converted and gated; nothing returns a placeholder value and no
surface renders empty data.

## Threat Flags

None. No new network endpoint, no new auth path, no file-access change, no schema change.
Every trust boundary touched — the three Server Action POSTs and the one service-client write
to `event_parties` — was already in the plan's threat register (T-33-68 … T-33-74). T-33-74
(`accept`) holds: no dependency was added, no package-manager install was run.

## Self-Check: PASSED

- `src/app/(public)/events/[slug]/actions.ts` — FOUND (modified)
- `src/app/(public)/events/[slug]/menu/actions.ts` — FOUND (modified)
- `src/app/(admin)/admin/members/actions.ts` — FOUND (modified)
- `.planning/phases/33-server-data-access-layer/33-13-SUMMARY.md` — FOUND (this file)
- commit `8241563` — FOUND in `git log`
- commit `27f3a6c` — FOUND in `git log`
- commit `4fc1b85` — FOUND in `git log`
- STATE.md, ROADMAP.md, `deferred-items.md` — NOT modified, as instructed
- no file outside this plan's `files_modified` was edited
</content>
</invoke>
