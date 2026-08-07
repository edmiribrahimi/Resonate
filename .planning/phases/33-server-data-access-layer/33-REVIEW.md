---
phase: 33-server-data-access-layer
reviewed: 2026-08-07T00:00:00Z
depth: deep
diff_base: 0b3b8f7a5bb52d20d2d6e2c192b17601aee172f9
files_reviewed: 22
files_reviewed_list:
  - src/lib/capabilities/server.ts
  - src/lib/capabilities/guards.ts
  - src/lib/capabilities/keys.ts
  - src/lib/door/require-operator.ts
  - src/lib/supabase/middleware.ts
  - src/app/api/tickets/checkin/route.ts
  - src/app/api/tickets/checkin/undo/route.ts
  - src/app/api/tickets/attendance/route.ts
  - src/app/api/membership/verify/route.ts
  - src/app/api/membership/list/route.ts
  - src/app/(admin)/admin/finance/actions.ts
  - src/app/(admin)/admin/finance/page.tsx
  - src/app/(admin)/admin/members/actions.ts
  - src/app/(public)/tickets/refund-actions.ts
  - src/app/(public)/events/[slug]/page.tsx
  - src/app/(public)/events/[slug]/actions.ts
  - src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts
  - src/app/(organizer)/organizer/venues/actions.ts
  - src/app/(organizer)/organizer/artists/actions.ts
  - src/app/(organizer)/organizer/events/actions.ts
  - src/app/(organizer)/organizer/events/[id]/tickets/actions.ts
  - supabase/migrations/20260808000000_access_context_user_id.sql
findings:
  critical: 2
  warning: 6
  info: 2
  total: 10
status: issues_found
---

# Phase 33: Code Review Report

**Reviewed:** 2026-08-07
**Depth:** deep (cross-file: import graph, gate polarity census, null-identity trace)
**Files Reviewed:** 22 source files out of 67 changed (weighted by stakes)
**Status:** issues_found

## Summary

The core module is the strongest part of this phase and I could not break it.
`getAccessContext()` throws on every failure and never returns a degraded value;
`ownsOrIsMaster` refuses on both halves of the null/null pair; `requireDoorOperator`
gates on `door.operate` with **no status test**, resolves once, and answers 503 on
the fourth arm so a failed lookup lands in `sync-manager`'s retry bucket rather than
its `blocked` bucket. The migration is `SECURITY DEFINER` with `SET search_path = ''`,
fully schema-qualified, revoked from `anon`, granted to `authenticated`.

What I checked and found **clean**, by category from the review brief:

- **Gate polarity (brief item 3).** I read all 63 `.has(CAP.*)` call sites.
  Every gate is `if (!…has(…))`. The four positive-polarity uses are deliberate
  and correct: `ownsOrIsMaster`'s master short-circuit (`guards.ts:197`), the two
  `canSeeDrafts`/`canManage` presentational booleans, and the ten
  `client = ctx.capabilities.has(CAP.MASTER_MANAGE) ? service : cookie` selections.
  **No inverted gate.**
- **Per-request resolution (brief item 4).** All five door routes call
  `requireDoorOperator()` exactly once per handler; the two handlers in
  `attendance/route.ts` (`:203`, `:527`) are separate exports, not a double call.
  `events/actions.ts` and `tickets/actions.ts` call `assertStaffManage()` once and
  thread the returned `ctx` into `assertEventOwnership`. No added round trip before
  a door scan — the scan is one round trip *cheaper*.
- **The kept strip (brief item 7).** MEASURED, not grepped:
  `npm run verify:no-header-identity` reports `3 live delete(s), 0 live set(s)`
  with comments filtered, across 232 files. The strip is armed and uncommented;
  the injection is genuinely gone.
- **`door.operate` stayed role-alone.** No status test anywhere in
  `require-operator.ts` or the five routes.
- **Null-identity trap.** Every ownership site routes through `ownsOrIsMaster` or
  guards on `!ctx.userId` first. The one hand-written comparison I found
  (`events/[slug]/actions.ts:214`, `media.uploaded_by !== ctx.userId`) is preceded
  by an explicit `if (!ctx.userId) throw` at `:197`, so `null !== null` is
  unreachable.

The defects are all at the **edges** the phase converted last: two catalogue
surfaces that hand-wrote their own gate instead of importing the one this phase
built, a venue-reveal path still deciding on the un-migrated axis, and three
different spellings of one error category.

---

## Critical Issues

### CR-01: The catalogue write gate asks `staff.manage`, not `catalogue.manage` — the exact collapse the phase forbade

**File:** `src/app/(organizer)/organizer/venues/actions.ts:59-76` (used at `:112`, `:171`)
**Also:** `src/app/(organizer)/organizer/artists/actions.ts:76-93` (used at `:129`, `:188`)

**Issue.** Both files define a **local, hand-written** `assertStaffManage()` that gates
on `CAP.STAFF_MANAGE`. Per `keys.ts:54` and the migration, `staff.manage` grants are
`requires_approved = false`. The correct key for these four writes is
`CAP.CATALOGUE_MANAGE` — `keys.ts:57-58` names it *"P3 — the four `artists`/`venues`
organizer policies. **Status REQUIRED**"*, and `CAP_DESCRIPTIONS` at `keys.ts:90-91`
says in as many words: *"Create and edit artists and venues. Requires an approved
status as well as the role."*

This is the collapse `guards.ts:139-143` explicitly rejects in writing for its own
call sites — and then two files in the same phase perform it anyway.

**Failure scenario (concrete).** An `organizer` whose `profiles.status = 'pending'`
POSTs to the `updateVenue` Server Action with a `venueId` and an `address` field:

1. `assertStaffManage()` at `:171` — `capabilities` contains `staff.manage`
   (`requires_approved = false`) → **the application gate ADMITS.**
2. The `UPDATE venues` at `:192-195` runs with the cookie client, so the P3 RLS
   policy — which calls `private.has_capability('catalogue.manage')`,
   `requires_approved = true` — refuses.
3. The user receives `Failed to update venue: new row violates row-level security
   policy for table "venues"` (`:198`).

**Why this is Critical rather than a naming quibble, stated honestly:**

- **MEASURED:** app-layer behaviour is unchanged versus the deleted code. The diff
  shows the removed predicate was
  `profile.role !== "organizer" && profile.role !== "master"` — role-only. So this
  phase did not *introduce* the looseness; it **re-certified** it under a capability
  key while the surrounding module documentation claims the opposite.
- **ARGUED:** RLS is the only thing refusing a pending organizer here, and the
  single load-bearing detail is `createClient()` on line `:110` / `:169`. This very
  phase demonstrates how fast that flips: `guest-list/actions.ts:87` and `:300`
  pass `getServiceClient()` to the same shape of check. One `createClient()` →
  `getServiceClient()` edit on `updateVenue` — which is a plausible fix for an
  unrelated RLS-visibility bug — and a pending organizer writes `venues.address`
  with nothing left to refuse them. That is a **venue-secrecy write surface**
  (`venue-secrecy.md`; `createVenue`/`updateVenue` are the only paths that set
  `venues.address` and `google_maps_url`).
- The module's own comment at `venues/actions.ts:34-37` asserts *"the set of callers
  who may write an address is byte-identical before and after"*. True against the old
  code, and it is the wrong comparison: the phase's stated contract
  (`guards.ts:127-131`) is that the TypeScript gate and the row-level gate *"ask the
  same key of the same authority, instead of two predicates that happen to agree."*
  Here they ask **different keys of the same authority** and are documented as if
  they agree.

**Fix.**

```ts
// venues/actions.ts and artists/actions.ts — same edit in both
import { CAP } from "@/lib/capabilities/keys";

async function assertCatalogueManage(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  // catalogue.manage — requires_approved = true. This is the key the P3 RLS
  // policies on `artists` and `venues` ask. Do NOT substitute staff.manage:
  // it is requires_approved = false and admits a pending organizer.
  if (!capabilities.has(CAP.CATALOGUE_MANAGE)) {
    throw new Error("forbidden.catalogue_manage_required");
  }
  if (!userId) { /* … unchanged … */ }
  return { userId };
}
```

**Verification available (no test runner exists).** `npm run build` for the typecheck,
then the phase-32 container write matrix: re-run `npm run baseline:container` and
`npm run baseline:compare` and confirm the `organizer/pending · venues · update` cell
still reads refused, and that `organizer/pending · ticket_tiers · insert` still reads
`ok:1` (the cell CR-01's fix must **not** move — `ticket_tiers` stays on
`staff.manage`). Plus a written manual pass: sign in as an organizer with
`status = 'pending'`, open `/organizer/venues`, attempt an address edit, and record
that the refusal arrives before the write rather than as an RLS error string.

---

### CR-02: `fetchGuestList` returns an empty array when the read fails — a silent failure at the door

**File:** `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:308-311`

**Issue.**

```ts
if (error) {
  console.error("Failed to fetch guest list:", error);
  return [];
}
```

`[]` is a **valid, indistinguishable answer**: "this event has no guests" and "I could
not read the guest list" render identically. This is the shape
`server.ts:32-46` was written to prevent (*"`catch { return new Set() }` … is the one
thing this module must never do"*) and the recorded newsletter defect
(`.planning/codebase/CONCERNS.md`), reproduced two files away from the doctrine that
forbids it. `meta-gates.md` is explicit that with **no error tracking in this
repository**, the `console.error` on line `:309` reaches nobody.

**Failure scenario (concrete).** 01:40, the door. An organizer opens the guest-list
page to check a name. The service-client `SELECT` on `guest_list_entries` (`:302-306`)
fails transiently — a Supabase connection reset, a pooler timeout, a `PGRST` error.
The page renders **"no guests"**. The person at the door is on the list and is turned
away. `checkin-offline.md` names the false refusal — the one that happens in front of
a queue — as the worse of the two failures, and there is no observable signal
anywhere that a read failed.

Note this function was *closed* during this phase (`verifyOrganizerAccess` at `:298`),
which is correct and already recorded. The gate is not the defect; the `return []`
under it is, and the phase touched the function without correcting it.

**Fix.** Throw with a distinct category so the surface breaks visibly instead of
lying quietly, matching what `assertEventOwnership` already does for `event.lookup_failed`:

```ts
if (error) {
  console.error(
    `[guest_list.lookup_failed] could not read guest_list_entries for ` +
      `${eventId}: ${error.code ?? "unknown"}. This is NOT an empty list.`
  );
  throw new Error(`guest_list.lookup_failed: ${error.code ?? "unknown"}`);
}
```

If the calling page must stay renderable, return a **discriminated value** —
`{ ok: false, reason: "lookup_failed" }` — and render a distinct notice. Never `[]`.
A blank list and a failed read must not share a pixel.

---

## Warnings

### WR-01: The venue-reveal decision still branches on `role` and `status`, against this module's own stated rule

**File:** `src/app/(public)/events/[slug]/page.tsx:143-144`, consumed at `:529`, `:531`

`server.ts:149-150` states the rule without qualification: *"**No new caller may branch
on `role` or `status`.** A page passing them to a nav is not branching. Every decision
asks `capabilities`."* This page then does exactly that:

```ts
const isApproved  = status === "approved";
const isMasterRole = role === "master";
```

and feeds both into `isVenueVisible` (`:523-531`), where `isMasterRole` short-circuits
to visible at `:77` and `isApproved` opens the two time-and-ticket branches at `:85`
and `:87`. These are **not presentational** — they decide whether a secret venue
address is rendered. The same two values also gate `canUpload` at `:385`.

The keys exist and are exact: `CAP.MEMBERSHIP_ACTIVE` is *"`get_user_status() =
'approved'` alone; role irrelevant"* (`keys.ts:59-60`), and `CAP.MASTER_MANAGE`
covers the master arm.

**Failure scenario.** Phase 34 (STAFF-03) is chartered to remove `role` and `status`
from the `my_access_context()` payload once `MobileNav`/`StaffNav` are converted —
that is written into `server.ts:145-147`. When that lands, `status` here becomes
`null`, `isApproved` becomes `false`, and the venue stops being revealed to approved
members holding tickets. That direction is safe (a monotone switch made *harder* to
trip). The unsafe symmetric edit is `isMasterRole = role !== "member"` or any
equivalent widening, which nothing in the repo would catch: `npm run build` cannot
see it, and `verify-no-header-identity` only counts header names.

**Opinion, marked as such:** I found no widening in the current code. This is a
rule violation on the highest-stakes path, not a live exposure.

**Fix.** `const isApproved = capabilities.has(CAP.MEMBERSHIP_ACTIVE);` and
`const isMasterRole = capabilities.has(CAP.MASTER_MANAGE);`, with a comment naming
`isVenueVisible` as the consumer so nobody "simplifies" them back.

### WR-02: Two hand-written copies of `assertStaffManage` shadow the exported one

**File:** `src/app/(organizer)/organizer/venues/actions.ts:59`, `src/app/(organizer)/organizer/artists/actions.ts:76`

Independent of the key choice in CR-01, these are **three definitions of one gate**
with the same name and different bodies. The exported `guards.ts:161` returns the full
`AccessContextResult` and does *not* check `userId`; the two locals return
`{ userId: string }` and *do*. Both files carry a comment admitting this
(*"Its natural home is `src/lib/capabilities/guards.ts` … hoisting it is a follow-up,
not this commit"*) — the follow-up did not happen inside the phase, so the phase closes
with the duplication it was created to remove. CAP-01 forbids a second definition of a
rule; this is the second and third.

**Failure scenario.** Someone hardens `guards.ts:assertStaffManage` — adds a party
scope, changes the thrown category, adds an audit line. The change reaches every
converted surface except `venues` and `artists`, and nothing reports the gap. Reading
`grep -rn assertStaffManage src/` gives a false sense of coverage: the two locals match
the grep but not the import.

**Fix.** Move the identity-refusing variant into `guards.ts` as a distinct export
(e.g. `assertCatalogueManage`, per CR-01) and delete both locals. Re-run
`npm run build`.

### WR-03: `addGuest` / `removeGuest` flatten four error categories into one string field — contradicting the file's own doc comment

**File:** `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:209-211`, `:260-262`

The doc block at `:64-70` enumerates four distinct categories
(`forbidden.staff_manage_required`, `forbidden.not_event_owner`,
`event.lookup_failed: <code>`, `capabilities.resolve_failed: no_subject`) and asserts
**"No `catch` here flattens them."** The `catch` twelve lines later does:

```ts
const message = error instanceof Error ? error.message : "Unknown error";
return { error: message };
```

All four — plus every Supabase error and every validation throw — arrive at the client
in one untyped `error` field. The only way for the caller to tell "you may not" from
"I could not find out" is to **parse the string**, which `guards.ts:73-79` names as the
thing a caller must never do.

Note the message *does* survive here — it is returned as a value, not thrown, so Next's
production redaction does not apply. That makes it worse, not better: the pattern works
well enough that nobody will notice it is string-parsing until someone changes a
category spelling.

**Failure scenario.** An organizer at the door adds a walk-up guest. The service-client
insert fails on a constraint. The UI toast reads `event.lookup_failed: PGRST116` — an
internal category string shown to a human as though it were guidance, and
indistinguishable in the code from a permission refusal.

**Fix.** Return a discriminated result decided **by position**, not by message:

```ts
type GuestResult =
  | { ok: true }
  | { ok: false; reason: "forbidden" | "not_owner" | "lookup_failed" | "invalid" };
```

Map the throw sites to `reason` at the point each is caught, and render one distinct
notice per `reason`. Then correct the `:64-70` doc block, which currently states a
guarantee the code does not provide.

### WR-04: `requireMaster()` refuses money surfaces with `redirect()`, which a caller `catch` can swallow — and the repo already knows this

**File:** `src/app/(admin)/admin/finance/actions.ts:65-70`

```ts
async function requireMaster() {
  const { capabilities } = await getAccessContext();
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }
}
```

`redirect()` signals by **throwing** `NEXT_REDIRECT`. Every other refusal this phase
wrote is an explicit `throw new Error("forbidden.…")` or a tagged return value, for the
stated reason that a refusal must be distinguishable. Here the refusal is control flow
that a `catch` intercepts — and the callers are client components that catch:
`src/components/admin/TransactionList.tsx:285`, `:332`, `:364`, `:428` all wrap these
actions in `catch`.

**The repo already documents this exact hazard**, in this phase's own diff:
`src/app/(admin)/admin/newsletter/actions.ts:109-110` — *"`unstable_rethrow` is what
lets this catch anything at all: `redirect()` signals itself by throwing, and a `catch`
that swallowed it would turn the …"*. The money file does not use `unstable_rethrow`
and does not reference it.

**Failure scenario (ARGUED, not measured — I did not run a production build).** A
non-master session reaches `refundTransactionAction` (`:137`) — the surface that moves
money. `requireMaster()` throws `NEXT_REDIRECT`; the client `catch (e)` at
`TransactionList.tsx:364` intercepts it and renders a generic failure toast instead of
navigating. The operator sees "something went wrong" on a refund and retries, and no
signal distinguishes "you are not permitted" from "the refund failed". The refusal
still holds — nothing is refunded — so this is a diagnosis and UX defect on a money
path, not an authorisation bypass.

**Fix.** Make the refusal a throw with a category, consistent with every other gate
in this phase, and let the *page* (`finance/page.tsx:20`, which already redirects)
own the routing:

```ts
if (!capabilities.has(CAP.ADMIN_ACCESS)) {
  throw new Error("forbidden.admin_access_required");
}
```

**Verification:** `npm run build`, then a written manual pass — sign in as `organizer`,
open `/admin/finance` (the page redirect fires first), and separately invoke the action
via the browser console POST to confirm the refusal category, since the page redirect
masks the action gate.

### WR-05: One condition, three category strings

**Files:**
- `src/app/(organizer)/organizer/venues/actions.ts:71-78` → `capabilities.identity_missing`
- `src/app/(organizer)/organizer/artists/actions.ts:83-90` → `capabilities.identity_missing`
- `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:82-84` → `capabilities.resolve_failed: no_subject`
- `src/app/(public)/tickets/refund-actions.ts:158-160`, `:405-407`, `:491-493` → `"Not authenticated"`
- `src/app/(public)/events/[slug]/actions.ts:197-199` → `"Not authenticated"`

All five sites test the identical condition — `!ctx.userId` after a successful resolve —
and label it three different ways. `capabilities.resolve_failed: no_subject` is the
actively wrong one: the resolve **succeeded**, and that prefix is the category
`server.ts:195` reserves for a lookup that failed. It sends the reader to the wrong
table, which is precisely the harm `server.ts:36-40` describes.

`"Not authenticated"` is also inaccurate on the money paths: the caller *is*
authenticated (they got past `staff.manage`); what is missing is `user_id` in the
payload, which per `server.ts:254-261` means the migration has not been applied.

**Failure scenario.** `20260808000000_access_context_user_id.sql` is not applied to an
environment. Refunds fail with "Not authenticated" to a signed-in master, the guest list
fails with `capabilities.resolve_failed`, and venues fail with
`capabilities.identity_missing`. With **no error tracking**, the person debugging sees
three unrelated symptoms of one unapplied migration and starts with the auth cookie.

**Fix.** Export the category once from `@/lib/capabilities/keys` (or a small
`categories.ts`) as `IDENTITY_MISSING = "capabilities.identity_missing"` and use it at
all five sites.

### WR-06: `requireMaster` is named for a role it does not check

**File:** `src/app/(admin)/admin/finance/actions.ts:65`

The function is `requireMaster()` and asks `CAP.ADMIN_ACCESS`. Per `keys.ts:61-62`,
`admin.access` is *"Middleware `/admin/*` except the scanner: master, status ignored"* —
so the predicate happens to be master-only **today**, and the name is accidentally
accurate.

`keys.ts:38-45` states the governing rule: *"a key named after its predicate makes
[phase 35] impossible"* — three keys resolve to one predicate on purpose. A function
named after the *predicate* while asking a *question key* inverts that discipline in the
one file that moves money.

**Failure scenario.** Phase 35 splits `admin.access` from `master.manage` — the stated
direction of travel. `requireMaster()` silently starts meaning "anyone who may reach the
admin area", and every reader who greps `requireMaster` on the SumUp surface concludes
the refund action is master-gated when it is not. Nothing in the build sees a rename
that did not happen.

**Fix.** Rename to `requireAdminAccess()`, or switch to `CAP.MASTER_MANAGE` if
master-only is the intended contract for money. Choose deliberately and record which,
in the commit — the two keys are equal today and will not stay equal.

---

## Info

### IN-01: `keys.ts:29-32` points at a verification script whose scope is narrower than the sentence claims

**File:** `src/lib/capabilities/keys.ts:29-32`

The comment says `scripts/verify-capabilities.mjs` *"reads `private.capabilities` and
asserts that the set below and the catalogue are the same eight strings"*, and closes
*"Until it runs, the guarantee here is a convention, not a mechanism."* The script
exists (`package.json:11`) and requires a live database. It is not wired into `build`,
and there is no test runner. So on any ordinary change the guarantee stays a convention,
and the sentence reads as though it does not. Worth stating in the phase record that
this check is **operator-invoked**, not automatic.

### IN-02: `venues/actions.ts` and `artists/actions.ts` export ungated read endpoints

**File:** `src/app/(organizer)/organizer/venues/actions.ts:79-105`, `src/app/(organizer)/organizer/artists/actions.ts:97-122`

`searchVenues`, `checkVenueExists`, `searchArtists` and `checkArtistExists` are exports
of `"use server"` modules — which both files' own comments identify as public POST
endpoints (*"every export of a `"use server"` module is a public endpoint"*) — and none
takes a gate. `checkVenueExists` returns `address` in its result (`:98`, `:104`).

Filed as Info, not a finding, for two measured reasons: this is **pre-existing and
untouched by the diff**, and `venues` SELECT is governed by RLS, so the exposure is
whatever the `venues` SELECT policy already permits — the same surface as the public
venue page. It belongs to the venue-page/RLS work already scheduled for phase 37 and is
recorded here only so the phase-37 scope includes these four exports, which are easy to
miss because they live under `(organizer)`.

**Deliberately not written here:** no request shape, no reproduction. `.planning/` is
tracked and this repository is public.

---

## What I could not check

- **`npm run build`** was not run in this review (read-only pass, and the phase records
  it as run). Every finding above is reachable by reading; none depends on a type error.
- **`scripts/probe-forged-identity.sh`** was not executed — it needs a running server.
  The static half of its claim is confirmed by `verify:no-header-identity` above.
- **The `redirect()` behaviour in WR-04** is argued from `newsletter/actions.ts:109-110`'s
  own documented precedent and the four client `catch` sites, not measured in a
  production build.
- **RLS refusal in CR-01** is argued from `keys.ts:57-58` and the P3 policy family named
  there; I did not run `baseline:container` against a live database to confirm the
  `organizer/pending · venues · update` cell.

---

_Reviewed: 2026-08-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
