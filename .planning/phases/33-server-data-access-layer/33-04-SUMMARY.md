---
phase: 33-server-data-access-layer
plan: 04
subsystem: checkin-offline
tags: [door, capabilities, dal, checkin, offline, round-trips]
status: awaiting-checkpoint
requires:
  - "33-01 (getAccessContext().userId, AccessContextResult)"
provides:
  - "requireDoorOperator() — the one door authorisation"
  - "DoorAuth four-armed tagged union (401 / 403 / 503 / ok)"
  - "DOOR_UNRESOLVED_STATUS, DOOR_UNRESOLVED_ERROR"
affects:
  - "phase 34 STAFF-03 (MobileNav / StaffNav still take role+status as props)"
  - "phase 35 ASSIGN-05 (door.operate is grantable without staff.manage)"
  - "plan 33-14 (the census gate; this plan lowered the meter, did not green it)"
tech-stack:
  added: []
  patterns:
    - "one door predicate, not four copies — they cannot diverge because there is one"
    - "a fourth outcome for 'could not find out', never collapsed into 'not permitted'"
    - "resolve ONCE per Route Handler into a local — cache() does not memoise there"
    - "the category is a value decided by POSITION, never a parsed error message"
key-files:
  created:
    - src/lib/door/require-operator.ts
  modified:
    - src/app/api/tickets/checkin/route.ts
    - src/app/api/tickets/checkin/undo/route.ts
    - src/app/api/tickets/attendance/route.ts
    - src/app/api/membership/verify/route.ts
    - src/app/api/membership/list/route.ts
    - src/app/(admin)/admin/scanner/page.tsx
decisions:
  - "D-33-04-A: door.operate, ROLE ALONE — no status test exists in the new module, and the comment-filtered assertion proves it"
  - "D-33-04-B: 503 for `unresolved`, chosen against sync-manager.ts's retryable bucket (:141), not its blocked one (:131)"
  - "D-33-04-C: membership/list asks door.operate, not staff.manage — identical predicate today, a statement about phase 35"
  - "D-33-04-D: the subject id is captured into a const before respond() is declared; TypeScript drops narrowing inside a hoisted function declaration, which is what the old `!` was paying for"
  - "D-33-04-E: no capability gate added to the scanner page — it has never had one, and a second refusal path in front of the door is not defence in depth"
metrics:
  duration: "~55 min (tasks 1-3; task 4 is a pending checkpoint)"
  completed: 2026-08-07
  tasks: 3 of 4
  commits: 3
requirements: [CAP-05]
---

# Phase 33 Plan 04: The Door Summary

The five door routes now ask one function — `requireDoorOperator()`, asking
`door.operate`, **role alone** — and a scan costs one Supabase round trip
instead of two. **Task 4 is a blocking human-verify checkpoint and has not been
executed: the door is not signed off until it is.**

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | the one door authorisation | `5046510` | `src/lib/door/require-operator.ts` |
| 2 | the four door routes + the roster route | `ef73564` | `checkin/route.ts`, `checkin/undo/route.ts`, `tickets/attendance/route.ts`, `membership/verify/route.ts`, `membership/list/route.ts` |
| 3 | the scanner page, presentation only | `64871c0` | `src/app/(admin)/admin/scanner/page.tsx` |
| 4 | **verify by hand, including offline** | — | **CHECKPOINT — NOT RUN** |

## The door still gates on ROLE ALONE

The hard constraint of this plan, and the one that would stop the phase.

`door.operate` carries `requires_approved = false` on both grant rows
(`supabase/migrations/20260807000000_capability_model.sql:416-417`, *"These two
rows must not become true"*). **No status test was introduced anywhere on this
path.** `requireDoorOperator` asks exactly two questions in this order: is there
a subject (`ctx.userId`), and does the subject hold `CAP.DOOR_OPERATE`. Nothing
else.

The assertion, and why it is filtered:

```
comment-filtered  status === "approved" | requires_approved  ->  0
UNFILTERED        same pattern                               ->  1
```

The unfiltered count is **1** because the module's own comment explains
`requires_approved = false`. That is the positive control: it proves the filter
is load-bearing rather than decorative, and it proves the assertion cannot be
defeated by documenting the decision it protects.

## The HTTP code for `unresolved`, and the bucket that justifies it

**503**, read out of `src/lib/offline/sync-manager.ts`'s classification table
(`:102-175`) rather than chosen by convention:

| Line | Condition | Bucket | Fit |
|---|---|---|---|
| `:131` | `401 \|\| 403` | **blocked** | Wrong. Held until the operator signs in again — and signing in again fixes nothing when the *lookup* failed. |
| `:133` | `408 \|\| 429` | retry (`throttled`) | Wrong category. |
| `:141` | `>= 500` | **retry** (`server`) | **Correct.** A capability lookup that failed at 02:00 is retried when the network returns. |

503 is also already the code `checkin/route.ts`'s `respond()` returns when a
`door_scan_events` insert fails, so the drain's handling of it is exercised
rather than new.

## The observable effect — and the named gap

`checkin-offline.md`, gate *il fallimento va visto*: with no error tracking in
this repository, an error path must show itself to the staff present. The
`unresolved` arm therefore carries a distinct human string (`DOOR_UNRESOLVED_ERROR`)
and a distinct machine-readable classification (`DOOR_UNRESOLVED_STATUS =
"capability_unresolved"`) inside each route's own envelope.

**GAP — `ScannerClient.tsx` renders the headline from the HTTP status, before
it reads the body.** Measured, not assumed:

- `ScannerClient.tsx:81-87` — `serverFaultMessage(503)` returns *"The scan was
  not written to the record — scan again"*.
- `ScannerClient.tsx:946-965` — `reportServerFault` passes that string as the
  **headline** and `body.error` as the **detail** line under it.

So at 02:00 a capability-resolve failure currently reads as a failed write in
the headline, which is not what happened, with the true sentence below it. The
staff member is not told "not authorised" — which is the failure this outcome
exists to prevent — but the headline is still wrong.

`ScannerClient.tsx` is **not** in this plan's `files_modified` and belongs to no
plan in this wave, so it was not edited. **This is shipped as a named gap, not
silently.** The one-line fix is a fourth branch in `serverFaultMessage` keyed on
`body.status === "capability_unresolved"` rather than on the HTTP code.

## Round trips: one fewer before a scan, one more before a refusal

| Path | Before | After |
|---|---|---|
| Authorised scan | `auth.getUser()` + `profiles` select = **2** | `my_access_context()` rpc = **1** |
| Signed-out refusal | `auth.getUser()` = **1** | rpc (42501) + `auth.getUser()` = **2** |

The scan — the thing that happens in front of a queue, on a phone, on a bad
signal — is one round trip cheaper. The **refusal** path costs one more, because
`getAccessContext` separates "anonymous" from "the GRANT to `authenticated` has
gone" by asking who is calling (`server.ts:211-225`). Stated rather than
buried: it is the correct trade, since nobody is standing in a queue waiting for
a 401, but it is a real regression on that path and it was not free.

`requireDoorOperator()` is called **once per handler**, into a local.
`attendance/route.ts` calls it twice *in the file* — once in `GET`, once in
`POST` — never twice in one handler. `cache()` does not memoise inside a Route
Handler (measured in 33-RESEARCH: three calls, three executions, identically in
`next dev` and in a production build).

## `membership/list` — the key choice, recorded

`door.operate`, not `staff.manage`. The two predicates are **identical today**,
so no role's reach changes with this line. The choice is a statement about phase
35: someone granted one night's door who is not otherwise staff needs tonight's
roster, and must not thereby be granted the sixteen tables `staff.manage`
carries. Using `requireDoorOperator()` here also means the roster and the scan
cannot diverge — a phone that may scan can always look someone up.

**`sw.ts` was READ, not assumed** (the plan asked which): `src/app/sw.ts:41-44`
registers `/api/membership/list` as `NetworkOnly`, deliberately, because the
payload is every full name in the community and must not sit at rest in a cache
bucket on a staff phone. This plan changes **who may call**, not the path and
not the response body, so no cache rule is affected and no invalidation is
required.

## Attribution

`operator_id`, `checked_in_by` and the PostHog `distinctId` now come from
`auth.uid()` inside the JWT, verified by Postgres, instead of from a second call
to the Auth server. **Both non-null assertions in `checkin/route.ts` are gone**
— removed, not moved. `grep -c 'auth.user!'` on that file → **0**.

## Verification

**There is no test runner for this product, and none was added. Nothing below is
verified because tests pass.** What was actually run:

| Check | Result |
|---|---|
| `rm -rf .next && npm run build` after each task commit | exit **0**, three times |
| `grep -rciE 'role !== ?"(master\|organizer)"'` on the five routes | **0/5** (measured at **1/5** before) |
| same pattern across all of `src/app/api/` | **0 lines** |
| `grep -rni 'x-user-'` across `src/app/api/` and the scanner dir | **0 lines** |
| `grep -ci 'x-user-'` on `scanner/page.tsx` | **0** (was 2) |
| `grep -rlc 'requireDoorOperator'` on the five routes | **5/5** |
| `grep -c 'auth.user!'` on `checkin/route.ts` | **0** |
| comment-filtered status assertion on the new module | **0** (unfiltered **1** — control) |
| `npm run verify:no-header-identity` | **100 lines / 46 files, exit 1** — expected, 33-14 owns the gate |

### The meter, measured on this tree

| Point | Lines | Files |
|---|---|---|
| base `05212034` | 102 | 47 |
| after this plan | 100 | 46 |

The scanner page's 2 lines are the whole delta, confirmed by
`git show 05212034:…/scanner/page.tsx | grep -c 'x-user-'` → **2**. The four
door routes contributed **0** to the meter before and after: they never read a
header, which is exactly what `33-RESEARCH.md` § *The door* said.

⚠️ **The carried-forward figure of 98 hits / 45 files does not match this tree.**
Measured here the base is 102/47. Not smoothed over — whichever number 33-14
asserts against must be re-measured on the merged tree, or its gate will fail
for an arithmetic reason and be read as a conversion defect.

### Mutation proofs — every check below was broken on purpose first

`ai-engineering.md`, gate *prova per mutazione*: each mutation was asserted
**applied** before its result was read.

| Mutation | Asserted applied | Result |
|---|---|---|
| `requireDoorOperator` returns `userId: 12345` | `grep -c 'userId: 12345'` → 1 | `npm run build` → **Type error at require-operator.ts:187** ✓ the build gate really sees the new file |
| A dead `userProfile.role !== "master" && …` reinstated in `membership/verify` | `grep -c 'userProfile.role !== "master"'` → 1 | corrected pattern → **1** ✓ flips; blind `profile.role !== ` on code lines → **0** ✗ blind |

Both were restored and the tree rebuilt to exit 0 afterwards.

The second proof is **T-33-84 demonstrated, not asserted**: with a real
duplicate sitting beside its replacement in the code, the variable-agnostic
pattern catches it and the variable-anchored one reports a green. The route it
would have gone green on is `membership/verify` — the one that decides whether a
membership card is honoured at the door.

### A check that could not fail, found and replaced

The plan's task-2 assertion `grep -rc 'select("role")'` is **vacuous on 2 of the
5 files**: `checkin/route.ts` and `checkin/undo/route.ts` wrote
`select("role, status")`, so that literal scored **0 on both before the change,
while the code was still there**. The broader `select("role` form scored **1 on
all five** before and **0 on all five** after, and is the one that carries
meaning. Both are reported above; the vacuous one is recorded so it is not
inherited as evidence.

This is the same shape as D-32-C and as the sixth check wave 1 found inside its
own instrument. It is now the third instance in this phase.

## Deviations from Plan

**1. [Rule 3 — blocking] The subject id is captured into a `const` before
`respond()` is declared.**
- **Found during:** Task 2, at the build gate.
- **Issue:** `auth.userId` inside `respond()` failed to compile —
  *"Property 'userId' does not exist on type 'DoorAuth'"*. `respond` is a nested
  **function declaration**, and TypeScript drops the `auth.ok` narrowing inside
  one because declarations are hoisted and the compiler cannot know the guard
  ran first. This is exactly what the old `auth.user!.id` was paying for; the
  `!` was never about a genuinely nullable subject.
- **Fix:** `const operatorId: string = auth.userId;` immediately after the
  guard, used by both writes. **Strictly stronger than the plan's letter** —
  the plan asked for the `!` to be removed, and this removes the need for one
  rather than relocating it.
- **Commit:** `ef73564`

**2. [Rule 2 — self-invalidating check] A comment was reworded so the plan's
literal assertion stays able to pass.**
- **Found during:** Task 2, running the assertions.
- **Issue:** the comment explaining why the `!` existed quoted the old
  expression verbatim, and the standing assertion for that file is a literal
  `grep -c` for it. The check reported **1** on a correct file — the identical
  self-invalidating shape the plan already guards against on
  `requires_approved`, appearing on a second check.
- **Fix:** the reasoning was kept and the token was not spelled out, with a note
  in the file saying why. The assertion now reports **0** unfiltered.
- **Commit:** `ef73564`

**3. [Named behavioural change, not a deviation] `scanner/page.tsx` can now
throw where a header read could not.**
`getAccessContext()` throws on a resolve failure, so a failure that previously
rendered the page with `role = null` now reaches Next's error boundary and the
scanner does not load. It was **not** wrapped in a `catch` — the conversion
contract forbids one, and a `catch` returning `{role: null}` would collapse
causes.

Why this adds no reachable state: the middleware gates `/admin/scanner` on the
**same** resolver and already fails closed —
`src/lib/supabase/middleware.ts:88-96` logs `capabilities.resolve_failed` and
`:167-171` bounces to `/dashboard` when `door.operate` is absent from a set that
is empty precisely because the lookup failed. An operator whose resolver is down
never reaches the page. And where the middleware's redirect is invisible, the
error boundary is at least visible. **Recorded rather than hidden, because it is
the door.**

## Manual verification still owed — TASK 4, BLOCKING

**Not executed. The plan is not signed off.** This is the only evidence that
will ever exist for this change (`CLAUDE.md` Guardrail 1), and it must be
written down as it is run.

**Why steps 4 and 6 were not automated here, honestly:** this worktree has no
`.env.local` (ignored files do not travel into a worktree), so a locally started
server cannot reach Supabase. A run without it would answer 503 from a broken
client instead of the real 401, and recording that as evidence would be a
fabricated observation. Separately, pointing a local server at **production**
Supabase and POSTing to `/api/tickets/checkin` risks writing rows into a real
night's `door_scan_events` record. Neither was done.

Run from the main checkout, which has `.env.local`:
`rm -rf .next && npm run build && PORT=3007 npm run start`

1. **A `pending` organizer still works the door.** Sign in as `role = organizer`,
   `status = pending`. Open `/admin/scanner`. **Expect:** the scanner loads, no
   bounce to `/dashboard`. Scan a valid ticket code. **Expect:** admitted.
   **If this fails, a status check has crept in and the phase must stop.**
2. **The four routes agree.** Same `pending` organizer session; call
   `/api/tickets/checkin`, `/api/tickets/checkin/undo`,
   `/api/tickets/attendance`, `/api/membership/verify` with a minimal body.
   **Expect:** none returns 403.
3. **An approved `member` is still refused, with 403** on all four, same body
   strings as before this phase.
4. **No session is still 401** — not 403 — on all four:
   ```
   for p in /api/tickets/checkin /api/tickets/checkin/undo /api/membership/verify; do
     curl -s -o /dev/null -w "$p %{http_code}\n" -X POST "http://localhost:3007$p" \
       -H 'content-type: application/json' --data '{}'
   done
   curl -s -o /dev/null -w "/api/tickets/attendance %{http_code}\n" \
     "http://localhost:3007/api/tickets/attendance"
   ```
5. **The offline path is unchanged.** Scanner open, device in airplane mode (or
   devtools offline). Scan a code. **Expect:** queued exactly as before —
   `src/lib/offline/` was not touched by this plan. Restore the network and
   confirm the queue drains.
6. **A forged header changes nothing.** Signed out:
   ```
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     http://localhost:3007/api/tickets/checkin \
     -H 'x-user-role: master' -H 'x-user-id: 00000000-0000-0000-0000-000000000000' \
     -H 'content-type: application/json' --data '{}'
   ```
   **Expect:** 401, identical to the same call without the headers.
   ⚠️ Record as a **coupling check, not criterion-2 evidence**: these four routes
   never read a header, so the result is identical before and after this plan.
   Criterion 2 is carried by 33-12's positive-controlled probe and 33-14's census.

**Additionally worth observing while the network is off (not in the plan, but it
is the door):** confirm the queue's *blocked* counter behaves as before, since
`unresolved` now answers 503 → `retry`, where a 401/403 would have been
`blocked`. A 503 must **not** appear in the "sign in again to record N entries"
banner.

## Success criteria

| # | Criterion | Status |
|---|---|---|
| 1 | One function authorises the door, used by all five routes | **met** — 5/5 |
| 2 | `door.operate`, role alone, no status test — asserted comment-filtered | **met**, with the filter's positive control |
| 3 | 401, 403 and a distinct third outcome, the third in a retryable bucket | **met** — 503, `sync-manager.ts:141` |
| 4 | A scan performs one Supabase round trip for authorisation, not two | **met** by construction; observation belongs to task 4 |
| 5 | A `pending` organizer loads the scanner and admits a ticket | **NOT OBSERVED — task 4** |

## Known Stubs

None. Every path added is complete. The one incompleteness is the
`ScannerClient.tsx` headline, documented above as a named gap in a file this
plan does not own — not a stub in a file it does.

## Threat Flags

None new. The register's dispositions hold: T-33-17 (one function, cannot
diverge), T-33-18 (no status test, asserted), T-33-19 (fourth outcome, 503,
retryable — with the rendering gap named), T-33-20 (`!` removed, not moved),
T-33-21 (the routes never read a header and now cannot), T-33-22
(`door.operate`, justified against phase 35), T-33-23 (`accept` — no dependency
added), T-33-84 (variable-agnostic assertion, **proven by mutation**).

No new network endpoint, no new auth path, no schema change.

## Self-Check

- `src/lib/door/require-operator.ts` — FOUND
- `src/app/api/tickets/checkin/route.ts` — FOUND (modified)
- `src/app/api/tickets/checkin/undo/route.ts` — FOUND (modified)
- `src/app/api/tickets/attendance/route.ts` — FOUND (modified)
- `src/app/api/membership/verify/route.ts` — FOUND (modified)
- `src/app/api/membership/list/route.ts` — FOUND (modified)
- `src/app/(admin)/admin/scanner/page.tsx` — FOUND (modified)
- commits `5046510`, `ef73564`, `64871c0` — FOUND in `git log`

## Self-Check: PASSED (for tasks 1-3)

Task 4 is an unexecuted blocking checkpoint. **This plan is not complete.**
