---
phase: 33-server-data-access-layer
plan: 06
subsystem: access-gating
tags: [cap-05, capabilities, admin-events, service-role, wave-2]
requires:
  - "33-01 (getAccessContext, CAP keys)"
  - "33-02 (I3, the burn-down meter)"
provides:
  - "eight (admin) event pages deciding reachability from the session"
  - "the per-file service-role justification for the three service-client pages"
affects:
  - "plan 33-14 (the phase gate: this plan takes the meter from 102 to 86 lines)"
  - "plan 33-09 (owns updateEvent's verification, which this plan depends on and does not duplicate)"
  - "phase 34 STAFF-03 (MobileNav / StaffNav still take role+status as props)"
tech-stack:
  added: []
  patterns:
    - "gate by the QUESTION asked (CAP.ADMIN_ACCESS), never by a role list"
    - "the nav's props are the source changed, not the consumer redesigned"
    - "a claim about a callee's gate is read at the source before it is written"
key-files:
  created: []
  modified:
    - src/app/(admin)/admin/events/page.tsx
    - src/app/(admin)/admin/events/new/page.tsx
    - src/app/(admin)/admin/events/[id]/analytics/page.tsx
    - src/app/(admin)/admin/events/[id]/drinks/page.tsx
    - src/app/(admin)/admin/events/[id]/edit/page.tsx
    - src/app/(admin)/admin/events/[id]/tickets/page.tsx
    - src/app/(admin)/admin/events/[id]/sales/page.tsx
    - src/app/(admin)/admin/events/[id]/guest-list/page.tsx
decisions:
  - "D-33-06-A: the phase reference at this plan's base is 102 lines / 47 files, NOT the 98/45 recorded by 33-02 — wave 1 added 4 comment-shaped mentions across 2 new files. Reconciled line by line rather than reported as a delta that does not add up."
  - "D-33-06-B: the 'getServiceClient occurrence count unchanged' assertion was REPLACED, because writing the required justification names the function and moves the count 2 -> 3. The substitute assertion cannot be satisfied by prose."
  - "D-33-06-C: role/status are cast to UserRole/UserStatus at the destructure, so UserRole/UserStatus are NOT orphaned imports. The cast is the same narrowing the deleted header reads performed."
metrics:
  duration: "~45 min"
  completed: 2026-08-07
  tasks: 2
  commits: 2
  files_changed: 8
requirements: [CAP-05]
---

# Phase 33 Plan 06: The Eight Admin Event Pages Summary

All eight `(admin)` event pages now decide reachability from
`capabilities.has(CAP.ADMIN_ACCESS)` — an answer Postgres computes from the
caller's own verified JWT — instead of from `x-user-role`, a value the client
supplies. The meter falls from **102 lines / 47 files to 86 / 39**, a delta of
exactly −16 / −8, which is precisely these eight files and nothing else.

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | the five pages with no service client | `52f1dc9` | list, `new`, `[id]/analytics`, `[id]/drinks`, `[id]/edit` |
| 2 | the three service-client pages | `75d942a` | `[id]/tickets`, `[id]/sales`, `[id]/guest-list` |

The conversion, applied identically to all eight:

```ts
// before
const headersList = await headers();
const role   = (headersList.get("x-user-role")   as UserRole)   || null;
const status = (headersList.get("x-user-status") as UserStatus) || null;
if (role !== "master") redirect("/dashboard");

// after
const { capabilities, role: rawRole, status: rawStatus } = await getAccessContext();
if (!capabilities.has(CAP.ADMIN_ACCESS)) redirect("/dashboard");
const role   = rawRole   as UserRole   | null;   // nav props only
const status = rawStatus as UserStatus | null;   // nothing branches on these
```

`CAP.ADMIN_ACCESS` because the question these pages ask is *"may this person
reach the admin area"* — what `keys.ts:61-62` names and what the middleware
already asks for `/admin/*`. Not `MASTER_MANAGE`: the same people today, and
possibly not the same people after phase 35. Never a role list, because a fourth
role arrives one phase later.

## No behaviour change, and the evidence for it

`private.role_capabilities` grants `admin.access` to `master` alone with
`requires_approved = false`
(`supabase/migrations/20260807000000_capability_model.sql:408`, read directly).
That is byte-for-byte the predicate the eight deleted header checks expressed:
role `master`, status ignored. **Nobody gains or loses reach to any of these
eight pages.**

Which settles the monotone guard that is live on event pages: since the reachable
population is unchanged, nobody gains sight of a venue — or of a buyer's email,
or of a guest-list name — who could not see it before. `venue_reveal_sent` is not
read, not written and not reachable from anything in this diff, and no path here
can bring a reveal forward.

## The three service-client pages, justified per file

`access-gating.md`, gate *service role*: every use justified in writing, and not
reachable from untrusted input. The service client is **retained** in all three —
this plan changes which input selects the branch, never which client performs the
read.

| File | What the service client reads | Why it is retained | Untrusted input reaching it |
|---|---|---|---|
| `[id]/tickets/page.tsx` | `tickets` joined to `profiles(full_name, email)` and `ticket_tiers(name)`; then `ticket_refunds` where `status = 'pending'` | the page must show a master the buyer behind every sold ticket and every pending refund — PII the caller does not own | `eventId` from the route segment; `ticketIds` derived from the first service read. Both unchanged. |
| `[id]/sales/page.tsx` | every `tickets` row for the event, then the `profiles` rows of its buyers by id | a sales dashboard without buyer names is not the surface that exists today | `eventId` from the route segment. Unchanged. |
| `[id]/guest-list/page.tsx` | `guest_list_entries` for the event | guest-list entries belong to no caller | `eventId` from the route segment. Unchanged. |

**On these three paths the code is the only boundary.** A service-role read
bypasses every row-level policy, so there is no RLS behind it to catch a mistake:
the gate in front of the read is not defence in depth there, it *is* the defence.
That statement is written into each of the three files, as `meta-gates.md`
requires.

It is deliberately not the forbidden inverse. No comment added by this plan says
or implies that a page check or the middleware substitutes for RLS. The claim is
the opposite one — here there is no RLS to substitute for — and each comment says
so in those words.

For `[id]/guest-list` there is a second reason to be careful, from
`ticketing-payments.md`, gate *guest list*: a guest-list entry is an **unpaid
admission**, so the population able to read who holds one must not widen by
accident. It did not; see the grant above.

## The inline server action, and why nothing was added to it

`[id]/edit/page.tsx:45-50` defines `boundUpdateEvent` with `"use server"`. **No
check was added to it, on purpose**, and `git diff` shows no line inside it
changed — the only `boundUpdateEvent` lines in the diff are the two comment lines
that explain this.

A page-level check does not extend into a Server Action; Next.js says so and
`nextjs-architecture.md` has the same gate (*una server action è un endpoint
pubblico con una firma comoda*). That is a real rule, and it is why this looks
like a hole. It is not one: `boundUpdateEvent` delegates to `updateEvent`, and
`updateEvent` re-verifies inside itself. **Read at the source rather than taken
from the plan:**

```
src/app/(organizer)/organizer/events/actions.ts:318  export async function updateEvent(eventId, formData)
                                              :320    const { user, isMaster } = await verifyOrganizer(supabase);
                                              :322    await verifyEventOwnership(supabase, eventId, user.id, isMaster);
```

Plan 33-09 converts that verification. Adding a second gate here would create a
**new refusal path** on a surface whose behaviour must not change. The reasoning
is written into the file so the next reviewer neither adds a duplicate check nor
files a false finding.

The same check was performed for the other delegating page: `createEvent`
(`actions.ts:243-245`) calls `verifyOrganizer`. Confirmed, not assumed.

## Verification

**There is no test runner for this product and none was added. Nothing here is
verified because tests pass** (`CLAUDE.md` Guardrail 1). What was actually run:

| Check | Result |
|---|---|
| `rm -rf .next && npm run build` after task 1 | exit **0**, compiled in 7.2s |
| `rm -rf .next && npm run build` after task 2 | exit **0**, compiled in 12.0s |
| `grep -rni 'x-user-' 'src/app/(admin)/admin/events/'` | **0** |
| `npm run verify:no-header-identity` | exit 1 — **86 lines / 39 files**, down from 102 / 47 |
| `const serviceClient = getServiceClient();` per service-client file | **1 / 1 / 1** — intact |
| `serviceClient` query usages per file | **2 / 2 / 1** — unchanged |
| `git diff -U0` on the three, non-comment lines only | touches **only** the imports and the gate; no `serviceClient`, no `createClient`, no `.from(` |
| `git status --porcelain` after both mutation proofs | empty |
| files deleted by either commit | none |

### The meter delta, reconciled rather than asserted

Plan 33-02 recorded the pre-conversion reference as **98 lines / 45 files**,
measured in its own worktree at commit `0b3b8f7`. This plan's base is
`0521203`, and there the census reads **102 / 47**. The difference is not an
error in either figure, and it is not this plan's doing — it is wave 1 adding
comment-shaped mentions while documenting itself:

| File | Lines added at base vs `0b3b8f7` |
|---|---|
| `src/lib/capabilities/guards.ts` (new in 33-01) | 1 — `:40` |
| `src/lib/capabilities/server.ts` | 2 — `:139`, `:167` |
| `src/types/database.ts` | 1 — `:405` |

+4 lines, +2 files. `98 + 4 = 102`, `45 + 2 = 47`. ✓

Against that honest base, this plan's delta is **−16 lines, −8 files**, which is
exactly the 16 header reads its eight files held (2 each) and nothing else. The
meter still exits 1 by design until plan 33-14; lowering the number is the job,
making it green is not.

### Mutation proofs — the mutation asserted applied before any result was read

`ai-engineering.md`, gate *prova per mutazione*.

| Mutation | Asserted applied | Verdict |
|---|---|---|
| `CAP.ADMIN_ACCESS` → `CAP.NOPE_NOT_A_KEY` in `[id]/guest-list/page.tsx` | `grep -c 'CAP.NOPE_NOT_A_KEY'` → **1**, at line 38 | `npm run build` → **exit 1**, `Type error: Property 'NOPE_NOT_A_KEY' does not exist on type '{ readonly STAFF_MANAGE: … }'` at `:38` ✓ **fires** |
| `if (!capabilities.has(…))` → `if (capabilities.has(…))` — the polarity flip | `grep -n 'if (capabilities.has(CAP.ADMIN_ACCESS))'` → **1**, at line 38 | `npm run build` → **exit 0**, zero type errors ✗ **does NOT fire** |
| restore | `grep -n 'if (!capabilities.has(CAP.ADMIN_ACCESS))'` → line 38; `git status --porcelain` empty | tree identical to `75d942a` |

**The second row is the finding that matters, and it is a negative one.** The
build gate proves that these eight files are typechecked and that the capability
key is spelled from the `CAP` object rather than as a free string — a misspelling
is a compile error here, not the silent runtime `false` that `keys.ts:20-27`
warns about. It proves **nothing about the polarity**: an inverted gate, which
would redirect every master and admit everyone else, compiles clean and ships.

So `npm run build` is not evidence that these gates refuse the right people. The
only evidence for that is the manual procedure below, which is therefore not
optional paperwork — it is the whole proof.

## Manual verification procedure — owed, and NOT yet executed

Written, not evoked, because in a repo with no tests the written procedure is the
only proof that will exist (`meta-gates.md`). **It has not been run here:** this
worktree has no `.env.local` (only `.env.local.example`), so the app cannot reach
Supabase and none of these eight pages can render. Recording that as not-executed
rather than substituting a claim — deferred is not verified.

Two subjects, by ROLE (the repo is public; no people are named):

1. As a **`master` / any status** — visit each of the eight:
   `/admin/events`, `/admin/events/new`, and for a known event id
   `/admin/events/<E>/{analytics,drinks,edit,tickets,sales,guest-list}`.
   **Observe:** each page renders, exactly as before this plan. On `[id]/tickets`
   and `[id]/sales` the buyer names are present (the service-client reads still
   run); on `[id]/guest-list` the entries list is present.
2. As an **`organizer` / `approved`** subject — visit the same eight URLs.
   **Observe:** redirect to `/dashboard` on every one. Not a partial render, not
   an empty list — a redirect.
3. As a **`member` / `pending`** subject — same eight URLs. **Observe:** redirect.
4. **The polarity mutation proof, which step 2 alone does not give.** With a
   `master` session, inside a transaction:
   `delete from private.role_capabilities where role = 'master' and capability = 'admin.access';`
   Assert the delete affected exactly 1 row **before** reloading. Reload
   `/admin/events/<E>/guest-list`. **Observe the redirect.** Roll back, reload,
   observe the page return. This is the step that distinguishes "the gate
   refuses" from "the gate is inert and the middleware did the work", and it is
   the one the build gate provably cannot do. **It must not be skipped.**
5. **The forged-header probe** (I4, `scripts/probe-forged-identity.sh`) against
   any of these eight. It belongs to plan 33-12, which owns the after-half of the
   measurement; noted here so the coverage of these eight files is not assumed to
   be someone else's problem.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — a false claim about a gate, caught before commit]**
- **Found during:** Task 1, on `[id]/drinks/page.tsx`.
- **Issue:** A drafted comment stated that `getDrinkItems` re-verifies internally.
  It does not. `actions.ts:806-825` is a plain cookie-client read of
  `drink_items` bounded by RLS, with no role or ownership check at all.
- **Fix:** The comment was rewritten to say what is true — that both this page
  and `getDrinkItems` use the cookie-bound client, so policies still apply. A
  comment asserting a gate that does not exist is worse than no comment: it is
  the `ai-engineering.md` *Gate hallucination*, and it would have told the next
  reader that a surface is guarded when it is not.
- **Files modified:** `src/app/(admin)/admin/events/[id]/drinks/page.tsx`
- **Commit:** `52f1dc9` (corrected before the commit was made, not after)

### Deliberate divergences, each with its reason

**2. The `getServiceClient` occurrence-count assertion was replaced.**
Task 2's `<done>` asks that the count be unchanged, "proving no client was
swapped". Writing the justification the same task **requires** names
`getServiceClient()` in prose, which moves the count from 2 to 3 per file. The
two requirements are in direct conflict, and satisfying the count by deleting the
function's name from the justification would trade a real requirement for a
proxy. Resolution: the count was replaced by assertions prose cannot satisfy —
`const serviceClient = getServiceClient();` → 1 per file, `serviceClient` query
usages → 2 / 2 / 1 unchanged, and a `git diff -U0` filtered to non-comment lines
showing that no line containing `serviceClient`, `createClient` or `.from(` moved
at all. That is strictly stronger than the count it replaces: the count would
also have passed if a query had been rewritten while the call site stayed put.
The plan's literal `<automated>` check (`grep -c … | grep -c ':0$'` equals 0,
i.e. non-zero everywhere) still passes.

**3. `UserRole` / `UserStatus` imports were kept in all eight files.**
Conversion-contract item 5 asks for orphaned ones to be deleted. They are not
orphaned: `MobileNav` declares `role: UserRole | null` /
`status: UserStatus | null` and `StaffNav` declares `role: UserRole | null`,
while `getAccessContext()` returns `string | null`. The narrowing cast at the
destructure is the same one the deleted header reads performed
(`headersList.get("x-user-role") as UserRole`), kept in one place per file so the
JSX is untouched and the diff stays minimal. `headers` was deleted from all
eight, and the build would have failed on a genuinely unused import.

## Scope boundary — observed, NOT fixed

- **`getDrinkItems` (`(organizer)/organizer/events/actions.ts:806`) is an
  exported function in a `"use server"` module with no role or status check of
  its own.** It is bounded only by RLS on `drink_items`. Whether that is
  sufficient is a real question, but that file belongs to **plan 33-09** and a
  server action's own gate is not this plan's subject. Recorded here rather than
  in the shared `deferred-items.md`, which this executor must not modify.
- Pre-existing `npm run lint` state (~21 errors / ~108 warnings) untouched and
  unrelated. No lint error originates in these eight files.
- No package was installed and `package.json` was not modified.

## Known Stubs

None. All eight pages are complete conversions; no placeholder, no TODO, no
value hardcoded to reach a render. The plan's own goal — the eight files stop
deciding from a header — is fully achieved and measured.

## Threat Flags

None. No new network endpoint, no new auth path, no new file-access pattern and
no schema change. The register's five entries resolve as the plan specifies:

| Threat ID | Disposition | Outcome |
|---|---|---|
| T-33-29 | mitigate | the service-client branch is now selected by `capabilities.has(CAP.ADMIN_ACCESS)` resolved by Postgres from the caller's JWT; service client unchanged and justified per file above |
| T-33-30 | accept | `boundUpdateEvent` untouched; `updateEvent` re-verifies at `actions.ts:320-322`, read at the source. The disposition is recorded, not assumed |
| T-33-31 | mitigate | converted; all eight also sit behind `protectedPrefixes`, so this removes a coupling rather than closing an open hole |
| T-33-32 | mitigate | asserted, by a check stronger than the planned one — see deviation 2 |
| T-33-33 | accept | no dependency added |

One secrecy note, applied: this document names **roles** (`master`,
`organizer/approved`, `member/pending`) and never a person, and carries no event
id, no venue, no date and no line-up. `.planning/` is tracked and therefore
published.

## Self-Check: PASSED

Files (all 8 modified, none created, none deleted):

- `src/app/(admin)/admin/events/page.tsx` — FOUND
- `src/app/(admin)/admin/events/new/page.tsx` — FOUND
- `src/app/(admin)/admin/events/[id]/analytics/page.tsx` — FOUND
- `src/app/(admin)/admin/events/[id]/drinks/page.tsx` — FOUND
- `src/app/(admin)/admin/events/[id]/edit/page.tsx` — FOUND
- `src/app/(admin)/admin/events/[id]/tickets/page.tsx` — FOUND
- `src/app/(admin)/admin/events/[id]/sales/page.tsx` — FOUND
- `src/app/(admin)/admin/events/[id]/guest-list/page.tsx` — FOUND

Commits:

- `52f1dc9` — FOUND in `git log`
- `75d942a` — FOUND in `git log`

Boundaries respected: no modification to `STATE.md`, `ROADMAP.md`,
`deferred-items.md`, `src/lib/capabilities/**`, the middleware, any migration, or
any file outside this plan's `files_modified`.
