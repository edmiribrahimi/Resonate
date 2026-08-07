---
phase: 33-server-data-access-layer
plan: 03
subsystem: ticketing-payments
tags: [capabilities, money, refunds, sumup, dal, access-gating]
requires:
  - "AccessContextResult.userId (33-01)"
  - "public.my_access_context() -> user_id (33-01)"
provides:
  - "admin/finance gated on CAP.ADMIN_ACCESS, session-derived"
  - "the three refund actions gated on CAP.STAFF_MANAGE, session-derived"
  - "measured: the /admin/finance forged-header probe CANNOT fire"
  - "measured: a cross-route Server Action POST does not execute its body"
affects:
  - "plan 33-14 (three of the 45 header-reading files disappear from the census)"
  - "phase 34 STAFF-03 (owns removing role/status from the payload and the two navs)"
tech-stack:
  added: []
  patterns:
    - "resolve the access context ONCE per Server Action invocation"
    - "the key is chosen by the QUESTION, and the rejected keys are named with the verdict each would have changed"
    - "a doc comment never quotes a literal the phase gate counts"
key-files:
  created: []
  modified:
    - src/app/(admin)/admin/finance/actions.ts
    - src/app/(admin)/admin/finance/page.tsx
    - src/app/(public)/tickets/refund-actions.ts
decisions:
  - "D-33-03-A: ADMIN_ACCESS on the finance surface — chosen by the question, same question the middleware asks of /admin/*"
  - "D-33-03-B: STAFF_MANAGE on the three refund actions — its predicate is byte-equal to the one replaced; admin.access would narrow, catalogue.manage would change the status axis"
  - "D-33-03-C: requireMaster() stays at the head of every exported action (T-33-12), even though the middleware answers the same question"
  - "D-33-03-D: the money-path criterion-2 row stays OWED as a direct observation — evidence is routed to 33-12 and 33-14"
  - "D-33-03-E: requestRefund deliberately NOT converted — it is an ownership check, not a staff gate"
  - "D-33-03-F: the two live-session steps are NOT executed, under owner decision 12 — recorded as owed, never as done"
human_verification_owed: 2
deferred_findings:
  - "the /login?redirect= vs ?next= mismatch — pre-existing, confirmed with file:line, not fixed here"
metrics:
  duration: "~85 min"
  completed: 2026-08-07
  tasks: 3 of 3 (task 3 closed as far as it can go without a live session)
  commits: 3
requirements: [CAP-05]
---

# Phase 33 Plan 03: The Money Paths Summary

The SumUp surface and the three refund actions now ask the session instead of a
request header — and the checkpoint step that was supposed to demonstrate it was
**measured to be incapable of firing**, so it is recorded as a coupling check and
the criterion-2 evidence is routed elsewhere.

## Status: complete, with two human-verification items OWED

Tasks 1 and 2 are complete and committed. Task 3 was a `checkpoint:human-verify`
with `gate="blocking"`; the owner resolved it and it is now closed **as far as it
can go without a live session**.

Every step of its procedure that does not require a signed-in session was
**executed** and is recorded below with its verbatim result — steps 3, 4 and 5.
Steps 1 and 2 require a real `master` and a real `organizer` session and were
**not executed**. They are written out as human-verification items under
*Manual verification owed* below, in the form `32-HUMAN-UAT.md` uses.

**Why they were not executed, stated plainly so nothing downstream assumes
them:** an agent has no live authenticated session, and there is no test runner
for this product (`CLAUDE.md` Guardrail 1) — so there is no mechanism by which
this plan could have produced that evidence. Nothing was substituted for them.
Under **owner decision 12** (`.planning/ACCESS-MODEL-DECISIONS.md:128`, *"manual
verification is deferred to the end of the build, deliberately"*), they are
deferred with their price stated rather than skipped.

**33-14's gate must INHERIT these two, not assume them.** `32-VERIFICATION.md`
set the precedent that deferred is not verified.

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | The SumUp surface — admin/finance | `fb630bd` | `src/app/(admin)/admin/finance/actions.ts`, `page.tsx` |
| 2 | The three refund predicates | `8bff48d` | `src/app/(public)/tickets/refund-actions.ts` |
| 3 | Manual verification | `b98beb9` + this update | steps 3–5 **executed**; steps 1–2 **owed**, under owner decision 12 |

### Task 1 — `admin/finance`

`requireMaster()` read `x-user-role` and refused on `role !== "master"`. It now
destructures `getAccessContext()` once and asks
`capabilities.has(CAP.ADMIN_ACCESS)`. `page.tsx` asks the same question and takes
`role` / `status` from the resolved context, purely as props for the two
`"use client"` navs — nothing branches on them.

**The key, by the question.** *"May this person reach the finance surface of the
admin area."* That is `admin.access`, and it is the same question
`middleware.ts:172-177` already asks of `/admin/*`, so the two gates in front of
this file now ask one question of one authority. `master.manage` was rejected: it
asks *"is this a reserved operation"* — a different question about the same
people **today**, and three of the eight keys share a predicate right now.

**No reach moved.** `admin.access` is granted to `master` alone with
`requires_approved = false` (`20260807000000_capability_model.sql:408`) — that is
`role !== "master"` inverted for every real subject.

**Why the in-action gate stays.** A Server Function is a POST to its host route.
A matcher change or a refactor that moves one of these functions to a route
outside `/admin` removes proxy coverage, and behind this file there is **no RLS
at all** — `getServiceClient()` bypasses every policy and SumUp has none. On
these files the code IS the security boundary, and the commit says so.

### Task 2 — the three refund predicates

`approveRefund`, `rejectRefund` and `adminRefund` each opened with an
`auth.getUser()` plus a read of the caller's own role column, then refused anyone
who was neither master nor organizer. Each now resolves once and asks
`CAP.STAFF_MANAGE`.

**The key, by the question, with the rejected two named.** `staff.manage`'s
predicate is role ∈ {master, organizer}, status ignored
(`…capability_model.sql:392-393`) — **byte-equal to the predicate replaced**.
`admin.access` is master-only and would have **narrowed** the gate, locking an
organizer out of a refund they can perform today. `catalogue.manage` requires an
approved status and would have locked out a `pending` organizer — the other axis.
Both would have been scope changes disguised as a refactor.

**Attribution.** `requested_by` / `processed_by` now take `userId` from the
resolved context — the same subject, same JWT, verified by Postgres instead of by
a second round trip to the Auth server. `if (!userId) throw` precedes every
write, which is what makes those columns non-null.

**The failure shape is unchanged.** These threw before and throw after, with the
same two messages. Not converted to a tagged result: that pattern is for a
category a client must branch on, and no client of these three does.

## Verification

**There is no test runner for this product, and none was added. Nothing here is
verified because tests pass.** What was actually run:

| Check | Before | After |
|---|---|---|
| `grep -rci 'x-user-'` on `finance/actions.ts` | 1 | **0** |
| `grep -rci 'x-user-'` on `finance/page.tsx` | 2 | **0** |
| `grep -rci 'x-user-'` on `refund-actions.ts` | 0 | **0** |
| `grep -ciE 'role !== ?"(master\|organizer)"'` on `refund-actions.ts` | **3** | **0** |
| `grep -c 'select("role")'` on `refund-actions.ts` | **3** | **0** |
| `grep -c 'from("profiles")'` on `refund-actions.ts` | 5 | **2** — the two notification lookups, which MUST survive |
| `grep -c 'await hasCapability('` on `finance/actions.ts` | — | **0** |
| resolve call sites in `refund-actions.ts` | — | **3**, one per guarded action |
| `rm -rf .next && npm run build` after each task commit | — | **passes** |

**Money lines: none changed.** `git diff <base>..HEAD` over both money files,
with comment lines excluded, matches `sumup` / `refundTransaction` /
`getServiceClient` / `ticket_refunds` / `drink_` / `revalidatePath` /
`status: "approved"` / `.delete()` on **0** lines. Refund idempotency and the
monotone progression of a payment toward `completed` are untouched by
construction, and the diff shows it rather than asserting it.

### A comment nearly re-created the recorded census defect

The first draft of the block comment in `refund-actions.ts` quoted
`profiles.select("role")` as a literal — which would have kept the file inside a
`grep`-based count that exists to measure how many files still **perform** that
read, exactly the 46→47 incident from `33-01`. Caught before commit; the comment
now describes the pattern in prose and names why it must not quote it.

## The checkpoint — what was executed, and what it proves

### Step 3 — the forged-header comparison, AND the proof that it cannot fire

Run against a production build (`PORT=3017 npm run start`; 3007 was already held
by another parallel plan's server, 3000/3002 by Docker), signed out:

```
CONVERTED CODE
  FORGED  307 http://localhost:3017/login?redirect=%2Fadmin%2Ffinance
  CLEAN   307 http://localhost:3017/login?redirect=%2Fadmin%2Ffinance
```

Byte-identical, including the query string. **The plan required that the reason
be written next to the result. It was instead MEASURED.** Both plan files were
reverted to their pre-conversion state, the mutation was asserted applied before
any result was read (`git diff --cached --stat` non-empty; header reads back to
`1` and `2`), the app was rebuilt, and the same two requests were re-issued:

```
PRE-CONVERSION CODE
  FORGED  307 http://localhost:3017/login?redirect=%2Fadmin%2Ffinance
  CLEAN   307 http://localhost:3017/login?redirect=%2Fadmin%2Ffinance
```

**Identical.** The outcome is produced by `middleware.ts:172-177` and is the same
before and after the conversion, whatever `requireMaster()` reads. Files restored
from `HEAD`; `git status --porcelain` empty; header reads back to `0`/`0`.

So step 3 is a **coupling check**, confirmed insensitive by measurement rather
than by argument. It is not criterion-2 evidence and is not recorded as one.

### Step 4 — the T-33-12 measurement, with its control

Server Action ids were read out of `.next/server/server-reference-manifest.json`
and mapped to their exported names by locating each id in the built page chunk.
Five ids belong to `app/(admin)/admin/finance/page`, and one of them —
`60c7005d…` — is `refundTransactionAction`. **It was deliberately never POSTed.**
Every probe used a read-only action; on a money path, identifying the target
before firing is not optional.

| Probe | Result |
|---|---|
| real id POST → `/admin/finance` (host route, protected prefix), signed out | `307` → `/login?redirect=%2Fadmin%2Ffinance` |
| real id POST → `/` (not a protected prefix), `Origin` set, signed out | `200`, `application/json`, body `{}` (2 bytes) |
| real id POST → `/events`, with a real argument | `200`, body `{}` |
| a second read-only action id POST → `/`, with a real argument | `200`, body `{}` |
| **CONTROL:** a fabricated id POST → `/` | `404`, `Server action not found`, and the server log carries `Failed to find Server Action` |

The `200 {}` is **not** any of these actions' return type — `listTransactions`
returns `{items, nextCursor, nextCursorParam, hasMore}` and
`searchPurchasesByMember` returns an array. So `{}` is a generic envelope, not a
value the code produced.

**The discriminator that settled it was timing, calibrated rather than assumed.**
If a body had run, `getAccessContext()` would have made a Supabase round trip.
Measured on the same server:

| Request | time_total |
|---|---|
| real id POST → `/` (×3) | 4.3 ms / 3.0 ms / 2.7 ms |
| fabricated id POST → `/` (×3) | 1.7 ms / 1.8 ms / 1.6 ms |
| `GET /events` — a page that really does read Supabase anonymously (×3) | **1309 ms / 446 ms / 249 ms** |

Two orders of magnitude. **No Supabase call happened**, so the action body did
not execute.

**Recorded reading, and nothing inferred beyond it:** the id was *found* (the
control proves an unknown id 404s) but the framework did **not execute** it at a
route that does not host it — the plan's **first** listed outcome, *the
framework's routing, not a permission verdict*. On the host route, the plan's
**second** outcome: the middleware path gate **does** extend to Server Action
POSTs, which supports the plan's claim that `/admin/finance` is refused before
`requireMaster()` runs.

The third outcome — *the action body runs* — **was not reproduced on this
vector.** That is not a disproof of T-33-12: it says this probe could not exhibit
it, and a future matcher change or a refactor that relocates one of these actions
to a route that does host it would change the answer. `requireMaster()` stays at
the head of every exported action for exactly that reason.

### Step 5 — no line that moves money changed

Executed and green: see *Money lines* above. `git diff` over `finance/actions.ts`
matches `sumup` / `refundTransaction` / `getServiceClient` on **three comment
lines and no code line**; the only changed code is inside `requireMaster()` and
the import block.

### Steps 1 and 2 — NOT EXECUTED. See *Manual verification owed*.

## Manual verification owed

**Two items, neither executed.** They are criterion-4 evidence — *no role's reach
moved* — and they are the only outstanding work in this plan. Written in the form
`32-HUMAN-UAT.md` uses so they can be lifted straight into the phase UAT.

Environment for both: `npm run build && PORT=3017 npm run start`. Port 3007 was
held by another parallel plan's server and 3000/3002 by Docker, which is why 3017.
This worktree has **no `.env.local`** of its own — one was copied in for the
probes and **deleted afterwards** (`.env*` is gitignored; the tree is clean), so
whoever runs these must supply the environment.

### 1. F-01 — a master still reaches the money 💶

- **role:** `master` (any status — `admin.access` has `requires_approved = false`)
- **steps:** sign in as that account; open `http://localhost:3017/admin/finance`
- **expected:** the transaction list loads with **real SumUp rows** — not an
  empty state, not a redirect, not a "Newsletter not configured"-shaped notice
  pointing at the wrong system
- **evidence if it fails:** `src/app/(admin)/admin/finance/actions.ts`
  `requireMaster()`, and the grant row
  `supabase/migrations/20260807000000_capability_model.sql:408`
  (`'master', 'admin.access', false`)
- **stop condition:** *if 1 or 2 diverge, STOP: a money surface has moved, and
  this phase does not have permission to move one.*
- **result:** [not executed — no live session available to an agent]

### 2. F-02 — an organizer is still bounced from the money 💶

- **role:** `organizer`, any status
- **steps:** sign in as that account; open the same URL,
  `http://localhost:3017/admin/finance`
- **expected:** redirected to `/dashboard`, **exactly as before this phase** —
  and NOT to the transaction list. An organizer reaching the SumUp surface would
  be a widening of access, which criterion 4 forbids.
- **evidence if it fails:** no row grants `admin.access` to `organizer` in
  `…capability_model.sql`; a pass here would mean the key resolved to the wrong
  predicate
- **stop condition:** *if 1 or 2 diverge, STOP: a money surface has moved, and
  this phase does not have permission to move one.*
- **result:** [not executed — no live session available to an agent]

> **These are OWED, not done.** Nothing in this plan substitutes for them. Steps
> 3 and 4 above were executed and are recorded as what they are — a coupling
> check whose blindness was measured, and one measurement of the threat model —
> and neither is evidence that F-01 or F-02 would pass. **Plan 33-14's gate
> inherits both.**

## The criterion-2 row for the money path stays OWED

**This plan's checkpoint is not criterion-2 evidence for the money path**, and
that is now a measured statement rather than a cautious one. The evidence lives
in two other places:

1. **Plan 33-12, checkpoint task 4** — the probe on
   `(public)/events/[slug]/menu` with its positive control, the one surface where
   the mechanism is shown to fire.
2. **Plan 33-14, tasks 1 and 3** — the structural claim: after the phase,
   `npm run verify:no-header-identity` reads 0 against the pre-phase 98.
   `admin/finance/actions.ts` and `finance/page.tsx` are two of the readers that
   disappear, and **a surface that cannot read the header cannot be fooled by
   it** — a property of the repository rather than a sample of one request.

`32-VERIFICATION.md` set the precedent that a deliberate "owed" beats an unearned
green.

## Question raised for the owner — not decided here

**Should moving money be reserved to `master`?**

The current rule, **stated as measured** rather than as an impression:
`staff.manage` is granted to `master` and to `organizer`, both with
`requires_approved = false`
(`supabase/migrations/20260807000000_capability_model.sql:392-393`). So **an
organizer can process a refund today**, of any status, and that was equally true
before this plan — the predicate replaced was byte-equal.

Reserving money to `master` is a defensible product position. It is also a
**real** access change, which criterion 4 forbids this phase from making: every
role must still reach exactly the surfaces it reached before. Recorded for the
owner; **not implemented**, and no line of this plan moves in that direction.

## Deferred finding — a real pre-existing defect, confirmed

**`/admin/finance` bounces to `/login?redirect=…`, but the login page reads
`?next=`. The post-login return is broken on every gated route.**

Observed during step 3, in **both** the pre- and post-conversion builds, so it
predates this phase and this plan neither causes nor worsens it. Confirmed in the
code, not inferred from the observation:

| Evidence | What it says |
|---|---|
| `src/lib/supabase/middleware.ts:149` | `url.searchParams.set("redirect", pathname);` — the bounce writes **`redirect`** |
| `src/app/(auth)/login/page.tsx:11` | `const nextUrl = searchParams.get("next") \|\| "";` — the login page reads **`next`** |
| measured, step 3 | `307 → http://localhost:3017/login?redirect=%2Fadmin%2Ffinance` |

The two never meet, so `nextUrl` is `""` and a user bounced from `/admin/finance`
— or from any other gated route — does not come back to where they were after
signing in. The project's own notes already record *"Login page reads `?next=`
param (NOT `?redirect=`)"*, which is the same fact from the other direction.

**Not fixed here, deliberately.** It is in `middleware.ts`, which is not this
plan's file, and a redirect-parameter change touches **every gated route** — it
belongs in its own change with its own verification, not smuggled into a money
conversion. This is `meta-gates.md`'s cross-domain rule applied to a tempting
one-line fix.

## Deviations from Plan

1. **[Rule 3 — blocking] Port 3007 was already held** by another parallel plan's
   server (`node … TCP *:3007 (LISTEN)`), and 3000/3002 by Docker. The probes ran
   on **3017**. The plan's port was a note about the development machine, not a
   requirement.
2. **[Rule 2 — missing critical verification] The plan asked for the insensitivity
   of step 3 to be *written down*; it was *measured* instead** by reverting both
   files, asserting the mutation applied, rebuilding, and re-running. Strictly
   more than the plan required, and it is the difference between "the plan says
   it cannot fire" and "it does not fire".
3. **Step 4's second half was executed differently than written.** The plan says
   to discover the `Next-Action` id from the rendered HTML of `/admin/finance`.
   Signed out that URL answers 307 and renders no HTML, so no id is discoverable
   that way. The ids were read from the build's server-reference manifest and
   mapped to their function names — which also made it possible to identify and
   **avoid** `refundTransactionAction`.
4. **A control was added to step 4 that the plan did not ask for** (a fabricated
   action id) plus a calibrated timing measurement. Without them, the `200 {}`
   would have been recorded as *"the action body runs"* — the plan's third
   outcome, and the wrong one. This is the fourth time in two phases that a check
   in this area looked like it was measuring something it was not.
5. **`requestRefund` was not converted**, and this is deliberate rather than an
   omission: its `auth.getUser()` anchors an **ownership** check
   (`.eq("user_id", user.id)` read under RLS), not a staff gate. It reads no
   header and no role column. Recorded in the file's own comment so a later
   reader does not "finish the job".
6. **The blocking checkpoint was resolved by the owner, not by execution.** Steps
   1 and 2 were **not run and nothing was substituted for them**, under decision
   12 (`.planning/ACCESS-MODEL-DECISIONS.md:128`). They are recorded as F-01 and
   F-02 above with role, URL, steps, expected result and the stop condition
   verbatim, so they can be lifted into the phase UAT unchanged.
7. **`rm -rf .next` was used before each build and was unnecessary.** This
   worktree's `.next` is one this agent built itself, never a cache inherited
   from another tree — that hazard belongs to the orchestrator after a merge.
   The extra clean cost build time and changed no result; noted so the rest of
   the wave skips it.

## Deferred / noted, not fixed here

- `npm run verify:no-header-identity` was **not** run: ten other plans are
  converting concurrently and a whole-repo census now is a torn reading. The
  per-file measurement above is deterministic and is what this plan owes. The
  gate belongs to 33-14.
- The baseline capture and comparator were not run, per the wave-2 instruction.
- The `?redirect=` / `?next=` mismatch — written up as its own deferred finding
  above, with `file:line` confirmation on both halves.
- **F-01 and F-02**, the two human-verification items above. They are the
  substantive debt of this plan and are listed here so nothing downstream reads
  their absence as a pass.
- Pre-existing `npm run lint` state is untouched and unrelated.

## Known Stubs

None. All three files are complete; nothing is placeheld and no data source is
left unwired.

## Threat Flags

None. No network endpoint, auth path, file-access pattern or schema was added —
this plan only changes **who may call** three existing surfaces, and the changed
gates are narrower-or-equal to what they replace for every real subject.

## Self-Check: PASSED

- `src/app/(admin)/admin/finance/actions.ts` — FOUND (modified)
- `src/app/(admin)/admin/finance/page.tsx` — FOUND (modified)
- `src/app/(public)/tickets/refund-actions.ts` — FOUND (modified)
- commit `fb630bd` — FOUND in `git log`
- commit `8bff48d` — FOUND in `git log`
- commit `b98beb9` — FOUND in `git log`
- `.planning/ACCESS-MODEL-DECISIONS.md:128` (decision 12) — FOUND, cited
- `src/lib/supabase/middleware.ts:149` (`"redirect"`) — FOUND, cited
- `src/app/(auth)/login/page.tsx:11` (`"next"`) — FOUND, cited
- working tree clean; no `.env.local` left behind; no probe server left listening
- STATE.md, ROADMAP.md and `deferred-items.md` — **not modified**, verified by
  `git status` and by the diff touching only this plan's three source files and
  this summary
