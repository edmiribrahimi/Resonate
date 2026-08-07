---
phase: 33-server-data-access-layer
plan: 04
subsystem: checkin-offline
tags: [door, capabilities, dal, checkin, offline, round-trips]
status: complete
human_verification: owed
human_verification_ref: "ACCESS-MODEL-DECISIONS.md decision 12 — manual verification deferred to the end of the build, deliberately, with its price written down"
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
  - "D-33-04-F: task 4's six manual steps are recorded as human-verification items OWED, per ACCESS-MODEL-DECISIONS.md decision 12 — deferred, not skipped, and not substituted"
metrics:
  duration: "~55 min (code); manual verification deferred by owner decision"
  completed: 2026-08-07
  tasks: 3 executed, 1 deferred as owed
  commits: 4
requirements: [CAP-05]
---

# Phase 33 Plan 04: The Door Summary

The five door routes now ask one function — `requireDoorOperator()`, asking
`door.operate`, **role alone** — and a scan costs one Supabase round trip
instead of two. **Task 4's six manual steps were NOT executed. They are recorded
below as human-verification items owed**, per `ACCESS-MODEL-DECISIONS.md`
decision 12: manual verification is deferred to the end of the build,
deliberately, with its price written down. Deferred is not done, and nothing was
substituted for it.

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | the one door authorisation | `5046510` | `src/lib/door/require-operator.ts` |
| 2 | the four door routes + the roster route | `ef73564` | `checkin/route.ts`, `checkin/undo/route.ts`, `tickets/attendance/route.ts`, `membership/verify/route.ts`, `membership/list/route.ts` |
| 3 | the scanner page, presentation only | `64871c0` | `src/app/(admin)/admin/scanner/page.tsx` |
| 4 | verify by hand, including offline | — | **DEFERRED — owed, see § Human verification owed** |
| — | this summary | `e354d35` + this commit | `33-04-SUMMARY.md` |

## Carried forward — index

Three findings the owner is carrying past this plan. Each is written out where
it belongs in the body; this is the index so none is lost in a long file.

| # | Finding | Where | Owner |
|---|---|---|---|
| 1 | `ScannerClient.tsx:81-87` builds the headline from the HTTP status, so an authorisation refusal reads as a failed write. Zero-silent-failures, at the door. **Do not fix inside this phase.** | § *Carried forward 1* | none in wave 2 |
| 2 | `select("role")` was **vacuous on 2 of 5 files** — third instance of a spelling-anchored check in this phase | § *Carried forward 2* | phase discipline |
| 3 | The meter base is **102 / 47**, not 98 / 45 — wave 1's own explanatory comments moved it | § *Carried forward 3* | **33-14** |

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

**This is the shape the rest of the phase is being held to** (owner, on reading
this summary): a check that returns **0 for the right reason**, with the run
that makes it return non-zero performed alongside it. A green with no
demonstrated way to go red is not evidence — this phase's planning already
removed five checks that could not fail, and wave 1 found a sixth inside its own
instrument.

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

## CARRIED FORWARD 1 — the observable effect, and `ScannerClient.tsx`'s wrong headline

**Owner is carrying this forward. Not fixed here, deliberately.**

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

**At 02:00, in front of a queue, the headline is what gets read.** This is a
zero-silent-failures problem in the place this project cares about most: the
headline names a cause that did not occur, and the true one is a size smaller,
underneath.

`ScannerClient.tsx` is **not** in this plan's `files_modified` and belongs to no
plan in this wave, so it was not edited. **This is shipped as a named gap, not
silently, and it must not be fixed opportunistically:** changing what the door
displays is a behaviour change outside this phase's contract, and it needs its
own verification **at the door**, not a green build.

The shape of the eventual fix, for whoever owns it: a branch in
`serverFaultMessage` keyed on `body.status === "capability_unresolved"` rather
than on the HTTP code — which means threading the body into that function, since
today it receives only the status.

| Field | Value |
|---|---|
| File | `src/app/(admin)/admin/scanner/ScannerClient.tsx` |
| Wrong headline built at | `:81-87` (`serverFaultMessage`) |
| True reason relegated to detail at | `:946-965` (`reportServerFault` → `showFlash`) |
| Owner | none in wave 2 — carried forward |
| Do not | fix it inside this phase |

## Round trips: one fewer before a scan, one more before a refusal

| Path | Before | After |
|---|---|---|
| Authorised scan | `auth.getUser()` + `profiles` select = **2** | `my_access_context()` rpc = **1** |
| Signed-out refusal | `auth.getUser()` = **1** | rpc (42501) + `auth.getUser()` = **2** |

**The admit path costs one round trip FEWER. The refusal path costs one MORE.**
Stated plainly rather than buried, because the second half is a real regression
and it was not free: `getAccessContext` separates "anonymous" from "the GRANT to
`authenticated` has gone" by asking who is calling (`server.ts:211-225`), and
that question is a second call.

**The trade is the right way round, and that is the whole justification.** At
the door the *admit* path is the one that runs on a failing network, on a staff
phone, with somebody standing there — and it is the one that got cheaper. Nobody
is waiting in a queue for a 401; a refusal that takes two round trips instead of
one costs a person who is not being let in anyway. If the asymmetry were
reversed, this conversion would be wrong even with identical totals.

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

### CARRIED FORWARD 3 — the meter base is 102 / 47, not 98 / 45. **For 33-14.**

| Point | Lines | Files |
|---|---|---|
| base `05212034` | **102** | **47** |
| after this plan | **100** | **46** |
| carried-forward briefing said | 98 | 45 |

The scanner page's 2 lines are the whole delta, confirmed by
`git show 05212034:…/scanner/page.tsx | grep -c 'x-user-'` → **2**. The four
door routes contributed **0** to the meter before and after: they never read a
header, which is exactly what `33-RESEARCH.md` § *The door* said.

**Why the base moved, and it is not a regression.** Wave 1 wrote comment-shaped
mentions of the header names while explaining what it was replacing — e.g.
`src/lib/capabilities/server.ts:139` and `:167`, `src/lib/capabilities/guards.ts:40`,
`src/types/database.ts:389` and `:405`. The meter counts those, and says so
itself: *"5 comment-shaped … the label is presentational; both count toward the
verdict."* Documenting the conversion raised the number the conversion is
measured by.

**Two sibling plans reconciled to 102/47 independently; this one makes three.**

⚠️ **33-14 must assert against 102/47, not 98/45.** If it does not, its gate
fails for an arithmetic reason and will be read as a conversion defect on a tree
where every conversion is correct — which is the most expensive kind of false
negative this phase can produce, because the reflex is to go looking for a
missing conversion that does not exist.

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

### CARRIED FORWARD 2 — a check that could not fail. **Third instance of this shape in the phase.**

The plan's task-2 assertion `grep -rc 'select("role")'` is **vacuous on 2 of the
5 files**: `checkin/route.ts` and `checkin/undo/route.ts` wrote
`select("role, status")`, so that literal scored **0 on both before the change,
while the code was still there**.

| Pattern | Before | After | Meaningful? |
|---|---|---|---|
| `select("role")` — the plan's literal | 0, 0, 1, 1, 1 | 0/5 | **no** — blind on `checkin` and `undo` |
| `select("role` — the broader form | 1/5 | 0/5 | **yes** — the one kept |

The broader form is the one reported as evidence. The vacuous one is recorded
here so it is not inherited as evidence by a later plan reading this summary.

**Three instances of the same shape in this phase now:**

1. **D-32-C** — `grep -c 'CREATE POLICY' supabase/schema.sql` → 0 because the
   file is lower-case. That zero became a false guardrail in `CLAUDE.md`.
2. **Wave 1's sixth check**, found inside its own instrument.
3. **This one** — and the near-miss below it, where a comment quoting
   `auth.user!` made a correct file fail its own assertion.

The lesson is one sentence: **a pattern anchored on a spelling measures the
spelling, not the fact.** Ask of every check what input would make it fail, and
run that input.

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

## Human verification owed — TASK 4

**None of the seven items below was executed. They are OWED, not done.** Nothing
was substituted for them and no result was inferred from a build, a grep or a
type. Per `ACCESS-MODEL-DECISIONS.md` decision 12, manual verification is
deferred to the end of the build, deliberately, with its price written down.
This section is that price, itemised.

There is no test runner for this product (`CLAUDE.md` Guardrail 1), so **these
observations are the only evidence that will ever exist for this change**. Each
must be written into its `result:` line as it is run — recorded, not remembered.

**Setup, once:** from the main checkout (which has `.env.local`),
`npm run build && PORT=3007 npm run start`.

### Why two of these were not automated — reasons, not apologies

Steps D-04 and D-06 are `curl` calls and would normally be automation, not human
work. Both were declined here, and both refusals are the domain applied
correctly:

1. **A local server without `.env.local` answers 503 from a broken client
   instead of the real 401.** Ignored files do not travel into a git worktree,
   so this worktree has none. Running the calls anyway would have produced a
   **fabricated observation** — a status code generated by a missing environment
   variable, recorded as though it were the door refusing an anonymous caller.
   In a repository whose only evidence is written observations, a fabricated one
   is worse than a missing one, because the missing one is visibly missing.
2. **Pointing a local server at production Supabase and POSTing to
   `/api/tickets/checkin` risks writing rows into a real night's
   `door_scan_events` record.** Signed out it should 401 before any write — but
   "should" is what is being tested. Contaminating the night's record to verify
   the thing that protects the night's record is not a trade worth making.

### D-01 — a `pending` organizer still works the door 🚪 **run this one first**

> **Step 1 is the one that decides the phase:** a `pending` organizer opens
> `/admin/scanner` and admits a ticket. If that fails, a status check has crept
> in and the phase stops.

- **role:** `organizer`, status `pending` — this persona does not exist in
  production; creating it is part of the test (same as phase 32's M-12)
- **url:** `http://localhost:3007/admin/scanner`
- **steps:** sign in as that account → open the URL → scan or paste a valid
  ticket code for tonight's party
- **expected:** the scanner **LOADS** (no bounce to `/dashboard`), and the code
  is **admitted**
- **evidence if it fails:**
  `supabase/migrations/20260807000000_capability_model.sql:416-417`, the two
  grant rows commented *"These two rows must not become true."*
- **stop condition:** if this fails, **stop the phase**. A status check has
  entered `door.operate`, and a pending organizer is locked out of the door in
  front of a queue.
- **result:** [pending]

### D-02 — the four door routes agree with one another

- **role:** the same `pending` organizer session from D-01
- **steps:** call each of `/api/tickets/checkin`, `/api/tickets/checkin/undo`,
  `/api/tickets/attendance`, `/api/membership/verify` with a minimal body
- **expected:** **none returns 403**
- **why:** the failure this guards is *"the same person refused by one scanner
  and admitted by another, on the same night"* — undiagnosable with no error
  tracking. After this plan there is one predicate, so agreement should be
  structural; this observes that it is.
- **result:** [pending]

### D-03 — an approved `member` is still refused, with 403

- **role:** `member`, status `approved`
- **steps:** call the same four routes
- **expected:** **403 on all four**, with the same body strings as before this
  phase
- **result:** [pending]

### D-04 — no session is still 401, not 403

- **role:** signed out
- **steps:**
  ```
  for p in /api/tickets/checkin /api/tickets/checkin/undo /api/membership/verify; do
    curl -s -o /dev/null -w "$p %{http_code}\n" -X POST "http://localhost:3007$p" \
      -H 'content-type: application/json' --data '{}'
  done
  curl -s -o /dev/null -w "/api/tickets/attendance %{http_code}\n" \
    "http://localhost:3007/api/tickets/attendance"
  ```
- **expected:** **401** on all four — **not** 403. The distinction is preserved
  deliberately: `sync-manager.ts:131` files both as `blocked`, so the bucket does
  not change, but the code is observable to anyone reading the network tab at the
  door.
- **not automated because:** see reason 1 above — no `.env.local` in the worktree
- **result:** [pending]

### D-05 — the offline path is unchanged 📴 **the one that must be done on a phone**

- **role:** any account holding `door.operate`
- **steps:** open the scanner → put the device in airplane mode (or devtools
  offline) → scan a code → restore the network
- **expected:** the scan is **queued exactly as before**, and the queue **drains**
  when the network returns. `src/lib/offline/` was not touched by this plan.
- **also observe, and this one is new:** a 503 must **NOT** appear in the *"Sign
  in again to record N entries"* banner. `unresolved` answers 503 →
  `sync-manager.ts:141` → `retry`, where a 401/403 would have gone to `blocked`
  (`:131`). If a 503 shows up in the blocked counter, the classification is
  wrong and a resolve failure is being held behind a sign-in that would not fix
  it.
- **result:** [pending]

### D-06 — a forged header changes nothing at the door

- **role:** signed out
- **steps:**
  ```
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    http://localhost:3007/api/tickets/checkin \
    -H 'x-user-role: master' -H 'x-user-id: 00000000-0000-0000-0000-000000000000' \
    -H 'content-type: application/json' --data '{}'
  ```
- **expected:** **401**, identical to the same call without the headers
- ⚠️ **record as a coupling check, NOT criterion-2 evidence:** these four routes
  never read a header in the first place (`33-RESEARCH.md` § *The door*), so the
  result is identical before and after this plan. Criterion 2 is carried by
  33-12's positive-controlled probe and 33-14's census.
- **not automated because:** see reasons 1 and 2 above
- **result:** [pending]

### D-07 — the fourth outcome, seen by the person holding the phone

- **role:** any account holding `door.operate`
- **steps:** revoke `EXECUTE` on `public.my_access_context()` inside a
  transaction → attempt a scan → observe the screen → **roll back**
- **expected:** the scanner shows something **other than a refusal**. Today, per
  the named gap above, the headline will read *"The scan was not written to the
  record — scan again"* and the true sentence
  (`DOOR_UNRESOLVED_ERROR`) will be the detail line beneath it.
- **why it is here:** this is the mutation proof for the `unresolved` arm — the
  one path in this plan whose value is entirely in what a human sees at 02:00,
  and therefore the one that cannot be proved by a type or a grep. It also
  measures the size of carried-forward gap 1.
- **result:** [pending]

## Success criteria

| # | Criterion | Status |
|---|---|---|
| 1 | One function authorises the door, used by all five routes | **met** — 5/5 |
| 2 | `door.operate`, role alone, no status test — asserted comment-filtered | **met**, with the filter's positive control |
| 3 | 401, 403 and a distinct third outcome, the third in a retryable bucket | **met** — 503, `sync-manager.ts:141` |
| 4 | A scan performs one Supabase round trip for authorisation, not two | **met** by construction — one `requireDoorOperator()` per handler, asserted |
| 5 | A `pending` organizer loads the scanner and admits a ticket | **NOT OBSERVED — owed as D-01** |

Criterion 5 is the only one not met, and it is not met because it was deferred,
not because it failed. **It is the criterion that decides the phase.**

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

## Self-Check — files and commits

- `src/lib/door/require-operator.ts` — FOUND
- `src/app/api/tickets/checkin/route.ts` — FOUND (modified)
- `src/app/api/tickets/checkin/undo/route.ts` — FOUND (modified)
- `src/app/api/tickets/attendance/route.ts` — FOUND (modified)
- `src/app/api/membership/verify/route.ts` — FOUND (modified)
- `src/app/api/membership/list/route.ts` — FOUND (modified)
- `src/app/(admin)/admin/scanner/page.tsx` — FOUND (modified)
- commits `5046510`, `ef73564`, `64871c0` — FOUND in `git log`

## Self-Check: PASSED

Tasks 1-3 executed, verified and committed. Task 4's seven observations are
**owed** — recorded above with role, URL, steps and what must be observed, each
with a `result: [pending]` line to be filled in when it is run. Deferred by
owner decision 12; deferred is not done, and nothing was substituted for it.
