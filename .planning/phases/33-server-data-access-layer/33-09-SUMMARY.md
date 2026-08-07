---
phase: 33-server-data-access-layer
plan: 09
subsystem: access-gating
tags: [capabilities, server-actions, ownership, guest-list, service-role, dedup]
requires:
  - "33-01: ownsOrIsMaster / assertEventOwnership / AccessContextResult.userId"
provides:
  - "assertStaffManage — the one staff-surface gate"
  - "three action files converted; five ownership copies deleted"
  - "the cookie-vs-service-client carry-forward, with its one-target evidence"
affects:
  - "33-14 (phase gate: the meter reaches 100/46 through this plan)"
  - "phase 34 STAFF-03 (MobileNav/StaffNav still take role/status as props)"
  - "phase 35 (hasCapability(key, { partyId }) stays source-compatible)"
tech-stack:
  added: []
  patterns:
    - "resolve ONCE per Server Action invocation, thread ctx onward"
    - "the Supabase client is an ARGUMENT, so a divergence stays visible"
    - "failure categories decided by position, never by parsing a message"
key-files:
  created: []
  modified:
    - src/lib/capabilities/guards.ts
    - src/app/(organizer)/organizer/events/actions.ts
    - src/app/(organizer)/organizer/events/[id]/tickets/actions.ts
    - src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts
decisions:
  - "D-33-09-A: staff.manage chosen by the QUESTION; equivalence read out of the grant table, not assumed"
  - "D-33-09-B: the guest-list ownership read KEEPS the service client — evidence is one target out of two"
  - "D-33-09-C: getDrinkItems stays ungated — it is reached from the PUBLIC menu, and anon reads drink_items 2 of 2"
  - "D-33-09-D: fetchGuestList GAINED a gate (Rule 2) — it returned guest PII through a service client with no check"
metrics:
  duration: "~55 min"
  completed: 2026-08-07
  tasks: 3
  commits: 3
requirements: [CAP-05]
---

# Phase 33 Plan 09: Criterion 3's Centre of Gravity Summary

Five copies of "may this person manage this event" became one shared call, the
guest list stopped deriving its identity from a forged-able header, and the one
genuine difference between the copies — a service-role read among cookie-client
reads — was made **visible in an argument** instead of being merged away.

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | `assertStaffManage`, the one staff-surface gate | `fcb0f3e` | `src/lib/capabilities/guards.ts` |
| 2 | Delete the two duplicate pairs + the fifth inline copy | `9da50e6` | `organizer/events/actions.ts`, `organizer/events/[id]/tickets/actions.ts` |
| 3 | The guest list stops trusting a request header | `c3df54f` | `organizer/events/[id]/guest-list/actions.ts` |

## The meter

**102 lines / 47 files → 100 lines / 46 files.**

The base is 102/47 at commit `0521203`, **not** the 98/45 recorded in
`33-02-SUMMARY.md`: wave 1 added four comment-shaped mentions that the meter
counts on purpose. This plan owned exactly two lines in one file
(`guest-list/actions.ts:16,17`), and the total fell by exactly two. **No other
file moved**, which is the check that matters — a delta of −2 with a different
file's count changing would mean this plan had reached outside its own set.

One consequence worth stating because it is a trap for the next author: the new
documentation deliberately **does not spell the header names**. The meter counts
comment-shaped mentions toward its verdict (fail-safe over-counting, WR-07), so
a well-meaning explanatory comment naming the headers would have kept this file
on the meter and stopped 33-14 reaching green.

## The deleted duplicates, with their old locations

| Old location | Function | Replaced by |
|---|---|---|
| `organizer/events/actions.ts:25-52` | `verifyOrganizer` | `assertStaffManage` |
| `organizer/events/actions.ts:58-79` | `verifyEventOwnership` | `assertEventOwnership` |
| `organizer/events/[id]/tickets/actions.ts:20-47` | `verifyOrganizer` | `assertStaffManage` |
| `organizer/events/[id]/tickets/actions.ts:53-74` | `verifyEventOwnership` | `assertEventOwnership` |
| `organizer/events/actions.ts:933-942` | the **fifth, inline** copy in `reorderDrinkItems` | `assertEventOwnership` |
| `organizer/events/[id]/guest-list/actions.ts:14-37` | `verifyOrganizerAccess` **body** (name and signature kept — it has call sites that use its return value) | `assertStaffManage` + `assertEventOwnership` |

**They are deleted, and nothing calls them.** The search that proves it:

```
$ grep -rn 'function verifyOrganizer(\|function verifyEventOwnership(' src/
  (none)

$ grep -rn "verifyOrganizer\b\|verifyEventOwnership\b" src/
  events/actions.ts:27          * ...are GONE, not unused,          [comment]
  events/actions.ts:44          * `verifyEventOwnership` did...     [comment]
  tickets/actions.ts:22         * ...are GONE, not unused.          [comment]
  tickets/actions.ts:39         * `verifyEventOwnership` did...     [comment]
```

Four comment lines, zero definitions, zero callers. The three
`verifyOrganizerRole` functions in `src/app/api/tickets/**` are a **different
name and another plan's files**; they are untouched.

## What was MEASURED that makes each merge equivalent

The plan's central warning is that "looks equivalent" is not equivalent, and
this repository has already produced two counterexamples. So for every pair
merged, here is the measurement — not the resemblance.

### 1. The role predicate → `staff.manage`

Read directly out of the grant table,
`supabase/migrations/20260807000000_capability_model.sql:390-423`:

```
('master',    'staff.manage', false)
('organizer', 'staff.manage', false)
```

Role ∈ {master, organizer}, `requires_approved = false`. That is **byte-equal**
to the predicate deleted:

```ts
if (profile.role !== "organizer" && profile.role !== "master") throw
```

Status-ignoring on both sides, so a **`pending` organizer keeps managing events
and tiers**. The container write matrix names that exact cell:
`organizer/pending` · `ticket_tiers` · insert is `ok:1`, and it must stay so.

Two keys that *look* like they would also fit were rejected because each changes
a verdict, and both rejections are written into `guards.ts`:

- `catalogue.manage` carries `requires_approved = true` (`:396`) → refuses the
  pending organizer above.
- `organizer.access` answers a **routing** question. A Server Action is not a
  route; it is a POST to whatever route hosts it, and a middleware matcher
  change can remove proxy coverage without touching the action.

### 2. `isMaster` → `ctx.capabilities.has(CAP.MASTER_MANAGE)`

This one is easy to wave through, and it decides which callers get a
**service-role client**. Same table, one row:

```
('master', 'master.manage', false)
```

Role `master`, status ignored — byte-equal to `profile.role === "master"`. The
service-client write branch is therefore taken by exactly the same callers as
before.

### 3. The divergence I did NOT round up

`verifyOrganizer` read the role from `profiles` **through the cookie client**,
subject to `profiles_select_own`. `my_access_context()` reads it as
`SECURITY DEFINER`. These are not the same read.

Where they could differ: a staff caller who cannot read their own `profiles`
row. Old code threw `"Profile not found"` — a refusal. New code resolves the
real role and may **admit**.

Measured, phase-32 container read matrix, `public.profiles`:

| persona | rows read through RLS |
|---|---|
| `master/approved` · `/pending` · `/rejected` | 9 of 9 |
| `organizer/approved` · `/pending` · `/rejected` | 9 of 9 |
| `member/*` | 1 of 9 |
| `anon`, `authenticated/no-profile` | 0 |

So the divergent case is **unreachable today on the container**. It is *not*
proven on production, where `organizer/*` is `resolved: false` — no such account
exists there. Evidence on one target out of two, stated rather than rounded up.

### 4. The pair I refused to merge — the guest-list client

`verifyOrganizerAccess` checked ownership with `getServiceClient()`, which
**bypasses every row-level policy**, while its two look-alikes used the cookie
client, where RLS applies. They agree today. They are not behaviour-equivalent:
for a caller whose RLS would have refused the read, the cookie client answers
"no row" where the service client answers the truth.

**Not merged.** `assertEventOwnership` takes the client as an argument, so the
difference is one legible line at the call site instead of a third copy of the
function. The evidence for a swap, in full and with its limit:

| target | `public.events` read by `organizer/*` through RLS |
|---|---|
| **container** | `approved` / `pending` / `rejected` each **2 of 2** → a swap *would* be equivalent |
| **production** | `resolved: false` — **no organizer account exists**, so the matrix says nothing |

The two targets' `events` fixtures already differ (container `anon` reads 0,
production `anon` reads 2), so the container result does not transfer by
analogy. Criterion 4 asks that every role reach exactly what it reached before;
a client swap is not that change, and it is not worth making inside a transport
conversion. **Carried forward with the evidence attached, written into the code
so the next reader finds it there and not only here.**

### 5. `getDrinkItems` — flagged by 33-06, decided here

It is exported from a `"use server"` module with **no gate**, bounded only by
RLS on `drink_items`. It is in my file, so the plan requires a deliberate
decision. **Left open**, and the measurement is decisive:

- It is called from `src/app/(public)/events/[slug]/menu/page.tsx` — the
  customer-facing drinks menu.
- Container read matrix: `drink_items` is **2 of 2 rows readable by `anon`**.

The menu works *because* RLS permits an anonymous read. `assertStaffManage()` on
it would refuse every guest standing at the bar trying to buy a drink — a money
surface. Closing it is the trap in the opposite direction. The decision and its
two callers are written into the file's header comment.

## Resolve counts — every gated invocation is exactly 1

`cache()` does **not** memoise inside a Server Action body (measured, three
executions for three calls). A second `assertStaffManage()` in one action is a
second full round trip, invisible to `npm run build` and on a fast connection.

| File | Gated actions | `assertStaffManage()` calls each |
|---|---|---|
| `events/actions.ts` | `createEvent`, `updateEvent`, `deleteEvent`, `publishEvent`, `unpublishEvent`, `addDrinkItem`, `updateDrinkItem`, `removeDrinkItem`, `reorderDrinkItems` | **1** (9 actions) |
| `tickets/actions.ts` | `createTier`, `updateTier`, `deleteTier`, `createDiscountCode`, `updateDiscountCode`, `deleteDiscountCode` | **1** (6 actions) |
| `guest-list/actions.ts` | `addGuest`, `removeGuest`, `fetchGuestList` — all via `verifyOrganizerAccess` | **1** (3 actions) |

**18 gated invocations, every count 1.** Verified by reading each converted
action between its `export async function` and the next.

Round-trip arithmetic, which is why the threading matters: before, a guarded
action cost `auth.getUser()` + a `profiles` select (**2**), plus an `events`
read for a non-master (**3**). After: one `my_access_context()` plus, for a
non-master, one `events` read (**2**). Un-guarded-by-ownership actions go 2 → 1.

**Not gated, deliberately, each for a stated reason:** `getDrinkItems` (above);
`purchaseTicket`, `purchaseDrinks`, `redeemDrinkToken` (member-facing money
paths with their own `auth.getUser()` checks — **untouched**, the money rule is
not relaxed and no path that moves money was modified);
`validateDiscountCode` (marked PUBLIC in its own comment, pre-existing, see
*Deferred* below).

## Verification, and exactly what it does not cover

**There is no test runner for this product and none was added. Nothing here is
verified because tests pass.** What was actually run:

| Check | Result |
|---|---|
| `rm -rf .next && npm run build` after each of the three task commits | passes |
| `grep -rn 'function verifyOrganizer(\|function verifyEventOwnership('` on `src/` | none |
| `grep -rn "verifyOrganizer\b\|verifyEventOwnership\b"` on `src/` | 4 comment lines, 0 definitions, 0 callers |
| `grep -rn 'profile.role !== \|created_by !== '` on the three files | 1 line, inside a comment explaining what was removed |
| `grep -ci 'x-user-'` on `guest-list/actions.ts` | **0** |
| `getServiceClient()` calls in `guest-list/actions.ts`, comments excluded | **4 before, 4 after — unchanged** |
| `npm run verify:no-header-identity` | 102/47 → **100/46**, exit 1 as expected until 33-14 |
| `grep -v '^ *\*' src/lib/capabilities/guards.ts \| grep -c 'catch'` | `0` |

### Mutation proofs — both asserted APPLIED before their result was read

`ai-engineering.md`, gate *prova per mutazione*. Each mutation was confirmed by
`grep` to have landed **before** the build verdict was believed, because a
substitution that silently fails to match produces a false green.

| Mutation | Asserted applied | Build verdict |
|---|---|---|
| `CAP.STAFF_MANAGE` → `CAP.STAFF_MANAGE_TYPO` | `grep -c` → 1 | **exit 1**, `Type error … Property 'STAFF_MANAGE_TYPO' does not exist … guards.ts:163` ✓ flips |
| `if (!ctx.capabilities.has(…))` → `if (ctx.capabilities.has(…))` — **inverted gate** | `grep -n` → line 163 | **exit 0**, zero type errors ✗ does NOT flip |

Both reverted; `git diff` on `guards.ts` afterwards was empty, and that emptiness
was checked rather than assumed.

**So, stated plainly: `npm run build` holds the capability key's SPELLING and is
completely blind to the gate's POLARITY.** An inverted `assertStaffManage`
refuses every master and organizer, admits every member and every anonymous
caller to eighteen staff actions, and **ships green**. This is the second
independent reproduction of the finding in this phase, this time on the gate
this plan wrote. No amount of building substitutes for the procedure below.

## Manual verification procedure — owed, written, not yet performed

It cannot be performed from this worktree: it needs two organizer sessions and a
running app. It belongs to the phase gate (33-14).

1. Sign in as an **organizer/approved** who **owns** event *E*. Open
   `/organizer/events/<E>/guest-list`, add a guest with an email.
   **Observe:** the guest appears; the `guest_list_entries.added_by` column holds
   **that organizer's** `auth.uid()`, not null and not another id. Attribution is
   the requirement (`ticketing-payments.md`, gate *guest list*).
2. As the same organizer, call the action against **another organizer's** event
   id. **Observe:** refused, and the guest list of the other event is unchanged.
3. Sign in as **master**. Repeat step 2's target. **Observe:** permitted — the
   master short-circuit runs before the ownership read.
4. Sign in as an **organizer/pending**. **Observe:** still permitted to create an
   event and a ticket tier. This is the `requires_approved = false` decision made
   observable; if this step refuses, `catalogue.manage` has been substituted for
   `staff.manage` somewhere.
5. **The mutation proof, which must not be skipped.** Inside a transaction,
   revoke `staff.manage` from `organizer` in `private.role_capabilities`; assert
   the delete affected 1 row **before reading any result**; reload; **observe the
   refusal**; roll back and re-read to confirm the grant is restored. Without
   this step, steps 1–4 cannot distinguish a working gate from no gate at all.
6. As a plain **member/approved**, call `fetchGuestList` with any event id.
   **Observe:** refused. Before this plan it returned every guest's name and
   email.

## Deviations from Plan

### 1. [Rule 2 — missing authorization] `fetchGuestList` gained a gate

- **Found during:** Task 3, reading the file's remaining exports.
- **Issue:** `fetchGuestList` is exported from a `"use server"` module, which
  makes it a **public POST endpoint** with a convenient signature — not a
  private helper of the page importing it (`nextjs-architecture.md`, gate
  *server action autorizzata*). It took an attacker-chosen `eventId` straight to
  a **service client**, which bypasses every row-level policy, and returned every
  guest's first name, last name and email address. Any authenticated caller
  could read any event's guest list. `access-gating.md`, gate *service role*,
  forbids exactly that reach.
- **Fix:** it now calls the same `verifyOrganizerAccess` as its two siblings.
- **Who is refused who was not before:** anyone without `staff.manage`, and any
  organizer who does not own the event. **Nobody legitimate** — both real
  callers are staff surfaces (`organizer/…/guest-list/page.tsx` and
  `admin/…/guest-list/page.tsx`), whose users hold `staff.manage` and either own
  the event or are master.
- **Why it was permissible without asking:** the guard moves **only in the
  harder-to-trip direction**, which is the sole direction `meta-gates.md`
  permits unauthorised. It costs nothing on the page, because `cache()` *does*
  memoise within one render.
- **Commit:** `c3df54f`.

### 2. [Rule 1 — latent bug] `reorderDrinkItems` gained a refusal it never had

The inline fifth copy read `event.created_by !== user.id`. With a **null**
`created_by` and a real user it refused by luck; had both sides been null it
would have **admitted**. `ownsOrIsMaster` refuses both halves explicitly. This
is the null-identity trap `guards.ts` exists to prevent, found in the wild.
Commit `9da50e6`.

### 3. Error prose collapsed into stable categories — with the measurement

The four deleted strings differed only in prose (`"…manage events"` /
`"…manage ticket tiers"`, `"…your own events"` / `"…tiers for your own
events"`). They now collapse into `forbidden.staff_manage_required` and
`forbidden.not_event_owner`. The reason this is not a lost diagnostic: **Next
redacts the message of an error thrown out of a Server Action in a production
build** (CR-01), so those four strings were already invisible in the deployment
that matters and existed only in `next dev`.

**One nuance measured while doing it, because it cuts the other way:** the
guest-list actions `catch` and **return** the message as a value
(`{ error: message }`). Next redacts *thrown* errors, not returned values, so
those four categories **do** survive to the client today — as strings, not as a
tagged discriminant. Converting that shape touches client components owned by
another plan. Carried forward; not changed here.

## Carry-forward for the next phase

1. **The cookie-vs-service-client swap in the guest list.** Evidence, with its
   limit, is in §4 above and in the file's own comment. Container: every
   organizer persona reads `events` 2 of 2 through RLS. Production: `organizer/*`
   unresolved, no such account. Do not re-derive it; do not treat the container
   result as proof for production.
2. **`validateDiscountCode`** (`tickets/actions.ts`) is marked PUBLIC in its own
   comment and answers valid/invalid for an arbitrary code with **no rate
   limiting anywhere in this repo** (`access-gating.md`, verified). A free
   oracle. Pre-existing, out of this plan's scope, not widened by it.
3. **Failure categories still travel as strings inside returned values** in the
   guest-list actions. They work, they are distinguishable, and they are not a
   tagged discriminant. The conversion belongs with the client components.
4. **`getDrinkItems` stays ungated on purpose.** Anyone tempted to "finish the
   job" should read §5 first: it is the public menu, and `anon` must read it.

## Known Stubs

None. Every converted action is complete and gated; nothing returns a
placeholder, an empty array in place of a decision, or a TODO. The one function
left deliberately ungated (`getDrinkItems`) is documented in the file with the
measurement that makes leaving it correct.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| `threat_flag: information_disclosure` | `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts` | `fetchGuestList` was an ungated, service-client read of guest PII (names, emails) keyed on attacker-chosen `eventId`. **Not in the plan's threat register** — T-33-47 covers `eventId` reaching a service client *before any write*, and this was a read. **Closed in this plan** (deviation 1); flagged so the register gains the read case. |

## Self-Check: PASSED

| Claim | Check | Result |
|---|---|---|
| `src/lib/capabilities/guards.ts` | `test -f` | FOUND |
| `src/app/(organizer)/organizer/events/actions.ts` | `test -f` | FOUND (modified) |
| `src/app/(organizer)/organizer/events/[id]/tickets/actions.ts` | `test -f` | FOUND (modified) |
| `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts` | `test -f` | FOUND (modified) |
| commit `fcb0f3e` | `git log` | FOUND |
| commit `9da50e6` | `git log` | FOUND |
| commit `c3df54f` | `git log` | FOUND |
| no write to `STATE.md`, `ROADMAP.md`, `deferred-items.md`, or another plan's files | `git show --stat` on all three commits | confirmed — 4 files total, all in `files_modified` |
