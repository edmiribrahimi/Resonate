---
phase: 32-capability-model-in-the-database
plan: 08
subsystem: capability-model
tags: [cap-01, cap-03, cap-04, middleware, resolver, react-cache, rpc, access-gating]
requires:
  - "32-06 — private.has_capability, public.my_access_context and src/lib/capabilities/keys.ts. Without them this plan has nothing to call."
  - "32-02 — B4, the surface register. Its predicate column is the contract every verdict here was checked against."
  - "32-04 — the container harness, which is the only place organizer/pending exists and therefore the only place the door mapping can be proved."
provides:
  - "src/lib/capabilities/server.ts — getAccessContext (memoised per render) and hasCapability, with a failure path that throws instead of refusing"
  - "the middleware's four prefix rules asked as capability questions, at zero extra round trips"
  - "x-capabilities-resolve-failed — the diagnostic response header that makes a resolver failure observable in a project with no error tracking"
  - "the 40-cell verdict table, measured on a container, with the mutation that proves it is an oracle"
  - "one converted server-action guard, which is what makes 'one definition, three callers' an observation"
affects:
  - "every authenticated request: the middleware now calls one RPC instead of one profiles select — same count, different question"
  - "the newsletter admin surface: one extra round trip per render, stated and deliberate"
  - "NOTHING in the database — this plan applied no migration and issued no DDL"
  - "no row-level policy, no door route, no NAV_ITEMS entry, no finance guard"
tech-stack:
  added: []
  patterns:
    - "React cache() for per-request memoisation — the first use in this repository, measured before being relied on"
    - "a permission-denied code read as an ANSWER for an anonymous caller and as a FAILURE for an authenticated one, separated by asking who is calling"
    - "a diagnostic header carried by the redirect as well as the final response, because a failure invisible on the bounce is invisible where it matters"
    - "a doc comment that deliberately avoids a literal string, because a phase-gate census greps for it"
key-files:
  created:
    - src/lib/capabilities/server.ts
  modified:
    - src/lib/supabase/middleware.ts
    - src/app/(admin)/admin/newsletter/actions.ts
decisions:
  - "The four rules stay an if / else-if pair plus two separate ifs. No lookup table. Proved load-bearing by mutation, not by argument: mapping /admin/scanner to admin.access produces 3 differing cells and locks every organizer out of the door."
  - "The bounce became one named function rather than four inline copies, so the diagnostic header rides the redirects too. A failure observable on the final response but not on the four redirects would be invisible on exactly the requests it breaks."
  - "42501 is the correct ANSWER for an anonymous caller and a LOUD FAILURE for an authenticated one. Reading it as 'anonymous' unconditionally would turn a lost GRANT into a silent lockout of every signed-in user."
  - "The resolver throws on failure and never returns a degraded value. An empty set refuses a master exactly the way it refuses a pending member."
  - "The pre-registered x-user- census is not fit for the question it is asked: it counts comments as readers. The reader-count command is given instead, and both numbers are published."
metrics:
  tasks: 3
  commits: 3
  duration: ~95 min
  completed: 2026-08-06
---

# Phase 32 Plan 08: The Application Asks the One Definition — Summary

The middleware no longer decides who may reach `/admin/scanner` by comparing a
string to `"organizer"`. It asks the same `private.has_capability` the
row-level policies ask, through the same exposed wrapper, and it asks it
**once** — the `profiles.select("role, status")` that stood there became one
`rpc("my_access_context")`, so the round-trip count is unchanged on a path that
runs before every door scan.

**Every verdict is where it was.** Forty comparable cells, measured on a
throwaway container, zero mismatches.

The one thing that deliberately did *not* stay the same is the silence. The old
code discarded the query error and defaulted to `member` / `pending` without
telling anyone. The defaults are preserved — CAP-03 requires it — and the
silence is gone.

---

## What was built

| Artefact | Where | What it is |
|---|---|---|
| `getAccessContext()` | `src/lib/capabilities/server.ts` | the per-request resolver, memoised for the render, throwing on failure |
| `hasCapability(key)` | same | the thin question, reading the memoised context |
| `x-capabilities-resolve-failed` | `src/lib/supabase/middleware.ts:21` | the diagnostic header — response only, inbound copy deleted |
| the four rules as capability questions | `src/lib/supabase/middleware.ts:155-197` | same order, same shape, same redirects |
| `requireMaster` converted | `src/app/(admin)/admin/newsletter/actions.ts:56` | the reference: one server action asking the one definition |

**Commits**

| Hash | What |
|---|---|
| `1d9dab2` | the resolver, with the error path that cannot be mistaken for a refusal |
| `0aa6f89` | the middleware — four capability questions, one round trip |
| `f3f5349` | the reference conversion |

No file was deleted by any of the three (`git diff --diff-filter=D cb35ffc HEAD`
is empty).

---

## D-05, the round-trip claim, asserted at `file:line`

```
$ grep -n 'await supabase' src/lib/supabase/middleware.ts
59:  } = await supabase.auth.getUser();
84:    const { data, error } = await supabase.rpc("my_access_context");
```

Two awaited calls: the session refresh the file exists for, and **one** data
call. There is no third. The `if (user)` branch contains exactly the `rpc`.

The call stays inside `if (user)` because `public.my_access_context()` is
revoked from `anon` — an anonymous request must not call it and be refused, it
must not call it at all (T-32-08-02).

---

## The verdict table — 40 cells, and why it is not 44

Measured on a throwaway `postgres:17.6` container built from all 35 migration
files, by calling `public.my_access_context()` as each persona inside a
rolled-back transaction and applying the four rules to the returned array. The
old side is the predicate B4 records. **Production was never touched, and no
migration was applied by this plan.**

> **The plan asks for 44 cells — eleven personas × four rules. The honest number
> is 40 comparable cells plus four that do not exist.** `anon` never reaches
> these four rules: the unauthenticated branch at `:144-151` redirects it to
> `/login` first, before and after this change. Its four cells are `n/a` on both
> sides, not `PASS` and not `redirect`. Counting them as agreeing cells would be
> counting a comparison that was never made.

| persona | rule | OLD predicate | NEW capability | match |
|---|---|---|---|---|
| `anon` | (all four) | never evaluated — the `if (user)` branch | **refused `42501`** — wrapper revoked from anon | n/a |
| `authenticated/no-profile` | `/admin/scanner` | redirect | redirect | = |
| `authenticated/no-profile` | `/admin (others)` | redirect | redirect | = |
| `authenticated/no-profile` | `/organizer` | redirect | redirect | = |
| `authenticated/no-profile` | `/membership-card,/attendance` | redirect | redirect | = |
| `master/approved` | `/admin/scanner` | PASS | PASS | = |
| `master/approved` | `/admin (others)` | PASS | PASS | = |
| `master/approved` | `/organizer` | PASS | PASS | = |
| `master/approved` | `/membership-card,/attendance` | PASS | PASS | = |
| `master/pending` | `/admin/scanner` | PASS | PASS | = |
| `master/pending` | `/admin (others)` | PASS | PASS | = |
| `master/pending` | `/organizer` | PASS | PASS | = |
| `master/pending` | `/membership-card,/attendance` | redirect | redirect | = |
| `master/rejected` | `/admin/scanner` | PASS | PASS | = |
| `master/rejected` | `/admin (others)` | PASS | PASS | = |
| `master/rejected` | `/organizer` | PASS | PASS | = |
| `master/rejected` | `/membership-card,/attendance` | redirect | redirect | = |
| `member/approved` | `/admin/scanner` | redirect | redirect | = |
| `member/approved` | `/admin (others)` | redirect | redirect | = |
| `member/approved` | `/organizer` | redirect | redirect | = |
| `member/approved` | `/membership-card,/attendance` | PASS | PASS | = |
| `member/pending` | `/admin/scanner` | redirect | redirect | = |
| `member/pending` | `/admin (others)` | redirect | redirect | = |
| `member/pending` | `/organizer` | redirect | redirect | = |
| `member/pending` | `/membership-card,/attendance` | redirect | redirect | = |
| `member/rejected` | `/admin/scanner` | redirect | redirect | = |
| `member/rejected` | `/admin (others)` | redirect | redirect | = |
| `member/rejected` | `/organizer` | redirect | redirect | = |
| `member/rejected` | `/membership-card,/attendance` | redirect | redirect | = |
| `organizer/approved` | `/admin/scanner` | PASS | PASS | = |
| `organizer/approved` | `/admin (others)` | redirect | redirect | = |
| `organizer/approved` | `/organizer` | PASS | PASS | = |
| `organizer/approved` | `/membership-card,/attendance` | PASS | PASS | = |
| `organizer/pending` | `/admin/scanner` | **PASS** | **PASS** | **=** |
| `organizer/pending` | `/admin (others)` | redirect | redirect | = |
| `organizer/pending` | `/organizer` | PASS | PASS | = |
| `organizer/pending` | `/membership-card,/attendance` | redirect | redirect | = |
| `organizer/rejected` | `/admin/scanner` | PASS | PASS | = |
| `organizer/rejected` | `/admin (others)` | redirect | redirect | = |
| `organizer/rejected` | `/organizer` | PASS | PASS | = |
| `organizer/rejected` | `/membership-card,/attendance` | redirect | redirect | = |

```
CELLS COMPARED: 40
MISMATCHES: 0
VERDICT: IDENTICAL
      container destroyed, nothing left behind
```

**The bolded row is the one this phase could most easily have broken.** A
`pending` organizer keeps the door, because `door.operate` is granted with
`requires_approved = false` on both its rows. Locking that person out is the
refusal that happens in front of a queue.

### The mapping, stated rather than assumed

| Rule | Old predicate (B4) | Capability | Granted to | `requires_approved` | Equivalent because |
|---|---|---|---|---|---|
| `/admin/scanner` | `role !== "master" && role !== "organizer"` | `door.operate` | master, organizer | false | role alone, both rows |
| `/admin` others | `role !== "master"` | `admin.access` | master | false | one role, status ignored |
| `/organizer` | `role !== "master" && role !== "organizer"` | `organizer.access` | master, organizer | false | role alone, both rows |
| `/membership-card`, `/attendance` | `status !== "approved"` | `membership.card.view` | master, organizer, **member** | **true** | granted to all three roles with approval required — which *is* `status = 'approved'` for any role |

The fourth row is the only one where the equivalence is non-obvious, and it
holds only because the capability is granted to **all three** roles. Had one
role been left out, the rule would have silently narrowed for that role.

### The equivalence B4 asked to be demonstrated, not assumed

B4 § *(a)*: an authenticated user with **no profile row** is treated as a
pending member today, and the capability set for that subject is the empty set —
"the same verdict on all four rules, by a different mechanism. The equivalence
must be *demonstrated* at the gate, not assumed."

It is the `authenticated/no-profile` row above: four cells, four agreements,
measured against a uuid asserted absent from `public.profiles`. The mechanism is
different (the payload returns `role: null`, `status: null`, `capabilities: []`,
and the `?? "member"` / `?? "pending"` defaults still fire for the header
injection); the verdict is not.

---

## The mutation — proving the table is an oracle and not a tautology

A 40-cell table of agreements proves nothing unless a wrong mapping would make
it disagree. Pitfall 7 names the exact wrong mapping: `/admin/scanner` falling
into the general `/admin` branch.

The mutation was applied to the probe's rule 1 (`door.operate` →
`admin.access`, which is what inverting the `if` / `else if` pair does),
**asserted applied before any result was read**:

```
--- ASSERTING THE MUTATION WAS APPLIED ---
grep -c 'cap: CAP.ADMIN_ACCESS'  -> 2
grep -c 'cap: CAP.DOOR_OPERATE'  -> 0
```

and it fired:

```
| `organizer/approved` | `/admin/scanner` | PASS | redirect | **DIFFERS** |
| `organizer/pending`  | `/admin/scanner` | PASS | redirect | **DIFFERS** |
| `organizer/rejected` | `/admin/scanner` | PASS | redirect | **DIFFERS** |
CELLS COMPARED: 40
MISMATCHES: 3
VERDICT: CAP-03 DEFECT
```

Three cells, every organizer, the door. The mutant probe was deleted; the
container destroys itself either way.

---

## D-28 — the degraded path, observed rather than described

The plan asks for three observations on the degraded path. All three were made,
with two temporary mutations to the middleware — the RPC name misspelled, and
the session stubbed so the failure branch is reachable without credentials
(the RPC is only called inside `if (user)`, and no account password was
available to this agent). **Both mutations were asserted applied before any
result was read**, then reverted:

```
=== ASSERTING BOTH MUTATIONS ARE ACTUALLY APPLIED ===
grep -c 'my_access_context_MUTANT'  -> 1
grep -c 'MUTANT-probe-subject'      -> 1
85:    const { data, error } = await supabase.rpc("my_access_context_MUTANT");
```

**Observation 1 and 2 — the bounce and the header, on the same response:**

```
$ curl -s -o /dev/null -D - http://localhost:3287/admin
HTTP/1.1 307 Temporary Redirect
location: /dashboard
x-capabilities-resolve-failed: 1
```

**Observation 3 — the categorised log line, naming a cause no other path
produces:**

```
[capabilities.resolve_failed] middleware could not resolve the access context
for /admin — code=PGRST202. Failing closed to member/pending with no
capabilities: every capability-gated route now bounces to /dashboard.
```

`PGRST202` is "no function matches in the schema cache" — the misspelling's own
signature, distinguishable from a network fault, from a revoked grant (`42501`)
and from a correct refusal (which produces no line at all).

**Revert verified byte-for-byte**, not by eye:

```
$ diff middleware.PRISTINE.ts src/lib/supabase/middleware.ts
diff exit: 0 (0 = byte-identical to pre-mutation)
$ grep -c MUTANT src/lib/supabase/middleware.ts
0
```

### What an operator would actually see

Stated plainly, because `meta-gates.md` requires a failure to have an effect
someone can see and this project has **no error tracking** — no monitoring
dependency in `package.json`, so nothing reaches a human on its own.

| Where | What is seen | Distinguishable from a refusal? |
|---|---|---|
| the middleware, on a gated route | a bounce to `/dashboard` — **identical to a refusal by design**, because CAP-03 requires the verdict not to move | **not by the user**, and that is the point of the next two rows |
| every response on the degraded path, redirects included | `x-capabilities-resolve-failed: 1` | **yes** — one header, present only on failure |
| the server log | one line beginning `[capabilities.resolve_failed]`, carrying the PostgREST code | yes |
| a render calling `getAccessContext` | an **exception** — Next's error boundary, a broken surface, not a "you may not do this" page | yes, loudly |

The honest limit: **nobody is watching for the header or the log.** They make
the failure *diagnosable in seconds instead of hours*; they do not make it
*noticed*. Closing that gap needs error tracking, which this project does not
have and this plan did not add.

---

## The resolver, line by line where the criterion asked

**Every failure path throws; no `catch` returns a value.** The plan's greps hit
this file's own doc comment, so they are reported with the prose stripped:

```
$ grep -c 'catch'   src/lib/capabilities/server.ts   -> 2   (both in the doc comment)
$ grep -c 'service' src/lib/capabilities/server.ts   -> 3   (all three in the doc comment)

$ grep -vE '^[[:space:]]*(\*|/\*|//)' src/lib/capabilities/server.ts > code-only
$ grep -c 'catch'   code-only   -> 0
$ grep -c 'service' code-only   -> 0
$ grep -n 'return\|throw' code-only
33:          return ANONYMOUS_CONTEXT;      <- the anonymous ANSWER, not a failure
43:      throw new Error(                   <- resolve failed
49:      throw new Error("capabilities.resolve_failed: malformed_payload");
59:      throw new Error("capabilities.resolve_failed: malformed_capabilities");
62:    return {                             <- the success value
72:  return capabilities.has(key);          <- hasCapability
```

**Deviation on the criterion's command, not on its intent** — the same shape
`32-06-SUMMARY.md` handled for its `role_capabilities` count of 3-not-1. The
criterion says `grep -c 'service'` returns `0`; it returns `3`, because the file
*explains why the service client is not used*, which the plan's own action text
asked for ("Write that reason in the file"). Deleting a written warning to
satisfy a string count would be the wrong trade: the warning is load-bearing
(`32-06-SUMMARY.md` § F1 — a service-role call to `my_access_context` returns a
confident empty set about nobody). The dependency graph is the real check:

```
$ grep -nE '^import' src/lib/capabilities/server.ts
70:import { cache } from "react";
71:import { createClient } from "@/lib/supabase/server";
72:import type { CapabilityKey } from "./keys";
```

Three imports, none of them the service client.

### `cache()` — measured, because assumption A4 said to

No file in `src/` imported `cache` from `react` before this one. Instrumented
run, three requests, two `getAccessContext()` calls each:

```
[__cap_probe] render start — two getAccessContext calls follow
[__cap_probe] resolver body run #1 — one PostgREST request follows
[__cap_probe] render end — same object: true, caps: 0
[__cap_probe] render start — two getAccessContext calls follow
[__cap_probe] resolver body run #2 — one PostgREST request follows
[__cap_probe] render end — same object: true, caps: 0
[__cap_probe] render start — two getAccessContext calls follow
[__cap_probe] resolver body run #3 — one PostgREST request follows
[__cap_probe] render end — same object: true, caps: 0
```

**Six calls, three body runs — one PostgREST request per render.** The number
is **one**, so assumption A4 holds and D-05's budget stands as written.

The counter is the derivation: the RPC is the only network call in the body, so
body executions and PostgREST requests are the same number.

**A second property, worth more than the first and not asked for:** the counter
increments across requests (`#1`, `#2`, `#3`). The cache does **not** span
requests. A capability cache that did would serve one session's answer to
another — which on this surface is an access-control failure, not a performance
bug. Measured, not assumed.

`same object: true` on every render confirms the memoised value is the identical
object, not a re-fetch that happened to agree.

The instrumentation and the temporary probe page were removed; the file
committed at `1d9dab2` contains neither.

### The anonymous case, handled as a case and not as an error

Confirmed by the same run: those requests were unauthenticated, the RPC returned
`42501`, and the resolver returned `caps: 0` **without throwing**. The wrapper is
granted to `authenticated` only, so a refusal for a caller with no session is a
correct answer.

It is separated from a genuine failure by asking who is calling: on `42501` the
resolver checks `auth.getUser()`, and only an absent user makes it an answer. A
`42501` for an **authenticated** caller means the `GRANT` has gone, and that
throws — because reading it as "anonymous" would silently lock every signed-in
user out of every capability-gated surface while looking like a normal refusal.
That second round trip is paid only on the refusal path; the happy path pays
nothing for it.

---

## The census, and why the pre-registered number lies

`grep -rl 'x-user-' src | wc -l` reads **46 before and 46 after this plan**,
which reads as "nothing was converted". It is a coincidence of two offsetting
changes, and it is written down here rather than left to be re-derived:

| Point | Loose census | Why |
|---|---|---|
| `3f2ce4d` (B4 written) | 46 | the pre-registered number |
| `cb35ffc` (this plan's base, after wave 5) | **47** | `src/types/database.ts` **names the header in a doc comment**. It reads nothing. |
| after this plan | **46** | −1 real reader converted, and the wave-5 comment still counted |

Verified with `git grep -l 'x-user-' <commit> -- src`; the added path is exactly
`src/types/database.ts` and nothing else.

**The command counts comments as readers, so it does not answer the question it
was asked.** The count of files that actually read one of those headers:

```
$ grep -rlE '\.get\("x-user-' src | wc -l
   base cb35ffc : 45
   after        : 44
```

**Exactly one file converted (D-13), and no further.** This file's own doc
comment deliberately avoids the literal string, and says so in the comment, so
that a genuine conversion is not masked by its own explanation.

### B4 § 6's coverage boundary — the movement, accounted for

B4: *"Re-run both commands after the phase. If 178 moves, something outside this
register changed and must be accounted for before CAP-03 can be called clean."*

```
$ grep -rnE '(role|status) (!==|===) "' src | wc -l
   3f2ce4d : 178      cb35ffc : 178      after : 177
$ grep -rlE '(role|status) (!==|===) "' src | wc -l
   3f2ce4d :  78      cb35ffc :  77      after :  77
```

Accounted exactly, and it balances:

| | lines |
|---|---|
| in the three touched files, at `cb35ffc` | **5** — newsletter `:18`, middleware `:83`, `:91`, `:100`, `:112` |
| removed by this plan | **−5** — all five are real permission decisions, all replaced by capability questions |
| added by this plan | **+4** — and **none is a decision** |
| net | 178 − 5 + 4 = **177** ✓ |

The four added lines, enumerated so nobody has to guess:

| Line | Text | What it actually is |
|---|---|---|
| `newsletter/actions.ts:20` | ``refused on `role !== "master"` `` | prose — the old predicate quoted, which B4 *requires* for an equivalence claim |
| `newsletter/actions.ts:29` | ``is `role !== "master"` inverted`` | prose, same |
| `capabilities/server.ts:176` | `typeof payload.role === "string"` | a **type** narrowing — the regex cannot tell `"string"` from `"master"` |
| `capabilities/server.ts:177` | `typeof payload.status === "string"` | the same |

And the check that matters — the census restricted to the files this plan did
**not** touch:

```
   base cb35ffc : 173      after : 173
```

**Nothing outside the register moved.** Five real permission decisions removed,
zero added.

---

## What was deliberately not touched

Verified by `git diff cb35ffc HEAD` returning zero lines for each:

- **`src/lib/rbac/roles.ts`** — `NAV_ITEMS` is not converted (D-29). Its
  `/admin/scanner` entry carries `requireApproved: true` while the middleware
  rule for the same path checks role only, and B4 § 7 records that disagreement
  as one of three that must **still be three** at the gate. Resolving it is a
  product decision: dropping `requireApproved` shows a link that was hidden;
  adding a status check to the route locks a pending organizer out of the door.
- **The four door routes** (`api/tickets/checkin`, `checkin/undo`,
  `membership/verify`, `api/tickets/attendance`) — untouched. They gate on role
  alone by owner decision.
- **`admin/finance/actions.ts`** — the byte-identical copy of the converted
  guard, untouched because it is a money surface (D-13).
- **The header-injection block** — `role` and `status` still reach it as values,
  46 files still read them, and the only edit inside it is one added inbound
  `delete` for the new diagnostic header, with its reason beside it.
- **The `?redirect=` dead parameter** (B4 § 7.3) — out of scope, still dead.
- **The database** — no migration written, no DDL issued, no baseline captured
  and no comparator run. Plan `32-07` is applying DDL to the shared database in
  parallel; a capture taken during that would be a torn reading.
- **`STATE.md`, `ROADMAP.md`, `deferred-items.md`** and `32-07`'s two files —
  not modified. Confirmed by name-only diff.

---

## Deviations from Plan

### 1. [Rule 2 — missing critical functionality] the diagnostic header rides the redirects, not only the final response

- **Found during:** task 2, writing D-28.
- **Issue:** the plan says "set a diagnostic header on the **final response**".
  The four rules `return` a redirect **before** the final response is
  constructed, so on the degraded path the four bounces — the only visible
  symptom — would have carried no header at all. The plan's own manual check
  asks for the header on a request to `/admin` that redirects, so the letter and
  the check disagree.
- **Fix:** the three-line redirect body became one named `bounceToDashboard()`
  that sets the header when the resolve failed. Same target, same status, same
  ordering. The header is also set on the final response, as written.
- **Cost, stated:** B4 § 1 records the redirect body as "identical four times".
  It is now one function called four times. The **predicate** column is
  untouched; the **action** column now reads through a name. B4 permits the call
  site to change and forbids the predicate to.
- **Commit:** `0aa6f89`

### 2. [Rule 3 — blocking] the plan's `grep -c 'service'` criterion cannot be met without deleting a required comment

- **Found during:** task 1.
- **Issue:** the criterion asks `grep -c 'service' src/lib/capabilities/server.ts`
  to return `0`. The same task's action text asks for the reason the service
  client is not used to be written **in the file**. Both cannot hold.
- **Fix:** kept the reason, reported the raw number, and gave the check that
  tests the intent — the import list, and the comment-stripped count (both 0).
- **Commit:** `1d9dab2`

### 3. [Rule 3 — blocking] the manual browser observations could not be made by this agent

- **Issue:** the plan asks for eight route observations signed in as `master`
  and as an approved `member`, and two newsletter observations. **This agent has
  no account credentials**, and this repository has no test runner, so there is
  no mechanism by which it could sign in.
- **What was done instead:** the same ten verdicts were measured one layer down,
  on the container, as real database subjects — the `master/approved` and
  `member/approved` rows of the 40-cell table above. That measures the
  **decision**; it does not measure the **transport** (cookie → session → RPC →
  redirect), which was exercised separately by the degraded-path curl.
- **What is therefore owed:** the ten manual observations, written out in full
  below. **They are not done.** Saying they are would be the failure
  `CLAUDE.md` Guardrail 1 exists to prevent.

### 4. [Rule 1 — bug in a measurement, not in code] the `x-user-` census counts comments as readers

- **Found during:** task 3, when the census moved the wrong way.
- **Issue:** wave 5 took the pre-registered count from 46 to 47 by *naming* the
  header in a doc comment in `src/types/database.ts`; this plan's own first
  draft was about to do the same, which would have masked the real conversion.
- **Fix:** the literal was removed from this plan's prose (with the reason
  written in the comment), and the reader-count command is published alongside
  the loose one. **No code was changed to satisfy a grep** — only prose.
- **Commit:** `f3f5349`

### Not a deviation: the pre-existing lint error

```
src/lib/supabase/middleware.ts:26:7  error  'pendingCookies' is never reassigned. Use 'const' instead
```

Pre-existing, at `:7` before this plan and at `:26` after only because the new
header constant shifted the line. **Not fixed**: an unrelated tidy-up inside an
access-control commit makes that commit harder to review, which is the wrong
trade in this file. It is the **only** lint error in the file, which is also the
evidence that this plan introduced none.

---

## Findings (recorded here, not in the shared `deferred-items.md`, because plan 32-07 is running in parallel)

**F1 — a middleware redirect drops the refreshed Supabase cookies.** Pre-existing
and untouched. `pendingCookies` are re-applied only to `finalResponse`; the four
bounces and the `/login` redirect construct their own `NextResponse.redirect`
and never receive them. If Supabase rotated the session on that request, the
rotation is lost and re-done on the next one. Not a security hole and not this
plan's to fix — but it is now four bounces produced by one function, so fixing
it later is a one-line change in one place instead of four.

**F2 — Next 16 reports the middleware file convention as deprecated.** Observed
in the dev log: *"The `middleware` file convention is deprecated. Please use
`proxy` instead."* The build's route table already prints `ƒ Proxy
(Middleware)`. Out of scope, and worth knowing before phase 33 rewrites 46 files
that depend on this file.

**F3 — `src/types/database.ts` is now counted by the `x-user-` census without
reading anything.** See the census section. It is a measurement defect, not a
code defect; the register's command should be tightened at the phase gate rather
than the file edited.

---

## Manual verification procedure (there is no test runner)

Written out because in this repository the written procedure is the only
evidence that will exist, and because **the ten observations below are owed, not
done** — this agent has no credentials.

### A. The four routes, as a `master`

**Who:** a signed-in account with `role = master`, any status.

1. Visit `/admin` → **must load.** A bounce to `/dashboard` means `admin.access`
   is not resolving.
2. Visit `/admin/scanner` → **must load.**
3. Visit `/organizer` → **must load.**
4. Visit `/membership-card` → **must load if the account is `approved`.** If the
   master is `pending` it must bounce to `/dashboard` — that is correct and
   unchanged (see the `master/pending` row above).

### B. The four routes, as an approved `member`

**Who:** a signed-in account with `role = member`, `status = approved`.

5. `/admin` → **must bounce to `/dashboard`.**
6. `/admin/scanner` → **must bounce to `/dashboard`.**
7. `/organizer` → **must bounce to `/dashboard`.**
8. `/membership-card` → **must load.**

### C. The converted server action

**Who:** the same two accounts.

9. As `master`, open `/admin/newsletter` and let the subscriber count load →
   **must succeed.**
10. As an approved `member`, invoke the same surface → **must redirect to
    `/dashboard`**, exactly as before.

### D. The door, which is the one that must not be got wrong

**Who:** an account with `role = organizer` and `status = pending`. **This
persona does not exist in production** (production holds one master and three
approved members), so creating one is part of the test.

11. Visit `/admin/scanner` → **must load.** If it bounces, `door.operate` has
    acquired a status check and a pending organizer has been locked out of the
    door in front of a queue. This is the single most dangerous regression in
    the phase, and it is the one cell the container already proves and
    production cannot.

### E. The degraded path

12. Temporarily misspell the RPC name at `src/lib/supabase/middleware.ts:84`,
    reload any gated route while signed in, and observe **all three**: the
    bounce to `/dashboard`, `x-capabilities-resolve-failed: 1` in the response
    headers (browser devtools → Network → the redirect entry, **not** the final
    document), and one `[capabilities.resolve_failed]` line in the server log.
    Then revert, and `diff` against the pristine file rather than trusting the
    eye.

**What must be observed overall:** eleven loads-or-bounces exactly as tabulated,
one successful and one refused newsletter call, and three simultaneous signals
on the degraded path. **Any single verdict that differs from the 40-cell table
is a CAP-03 defect**, not a UX preference — the middleware is UX, but a UX rule
that changed is still a rule that changed.

---

## Threat Flags

None. This plan adds no network endpoint, no auth path and no schema change. The
one new surface it introduces is a **response** header, and its inbound copy is
deleted in the same block as the three `x-user-*` names, with the reason written
beside it (T-32-08-01, mitigated and asserted at `src/lib/supabase/middleware.ts:217`).

The threat register's other five dispositions were all implemented: the RPC
stays inside `if (user)` (T-32-08-02), the resolver imports only the cookie-bound
client (T-32-08-03), the failure is loud and fails closed (T-32-08-04), the
`if` / `else if` ordering is preserved and mutation-tested (T-32-08-05), and no
package was installed (T-32-08-SC).

---

## What this does not cover

- **No policy calls anything from this plan.** The third caller of the one
  definition — the row-level policies — is plan `32-07`'s work, running in
  parallel. Until it lands, "one definition, three callers" is **two** callers
  observed and the third by design.
- **The transport was exercised anonymously and on the degraded path, never with
  a real authenticated session.** Same gap `32-06-SUMMARY.md` records for its own
  REST verification, and for the same reason: creating a user would add a
  `profiles` row and move B2's fingerprints, invalidating the comparison the
  phase exists to make.
- **45 header readers remain** (D-13). Converting them is phase 33.
- **`node_modules` and `.env.local` were symlinked in from the main checkout** to
  run the build, the dev server and the container, exactly as plans 32-01 and
  32-04 to 32-06 did. Both paths are gitignored; `git status --short` showed only
  tracked files before every commit, and every `git add` named a single file.

---

## Self-Check: PASSED

```
$ [ -f src/lib/capabilities/server.ts ]                        FOUND
$ [ -f src/lib/supabase/middleware.ts ]                        FOUND
$ [ -f "src/app/(admin)/admin/newsletter/actions.ts" ]         FOUND
$ git log --oneline --all | grep -c 1d9dab2                    1  (FOUND)
$ git log --oneline --all | grep -c 0aa6f89                    1  (FOUND)
$ git log --oneline --all | grep -c f3f5349                    1  (FOUND)
$ git diff --diff-filter=D --name-only cb35ffc HEAD            (empty — no deletions)
$ npm run build                                                green, after every task
$ npx eslint src/lib/capabilities/server.ts                    no output
$ npx eslint "src/app/(admin)/admin/newsletter/actions.ts"     no output
$ npx eslint src/lib/supabase/middleware.ts                    1 error — PRE-EXISTING (prefer-const)
$ grep -n 'await supabase' src/lib/supabase/middleware.ts      2 lines: getUser + one rpc
$ grep -c MUTANT src/lib/supabase/middleware.ts                0
$ git diff cb35ffc HEAD -- src/lib/rbac/roles.ts | wc -l       0
$ git diff cb35ffc HEAD --name-only | grep -c STATE\|ROADMAP   0
```

- **Three commits, three files, no deletions.** The name-only diff is exactly the
  three files in the plan's `files_modified`.
- **2 mutations fired and each was asserted applied before its result was read** —
  the probe's door mapping (3 cells differed, as it must) and the middleware's
  RPC name plus stubbed session (three degraded-path signals observed). Both
  reverted; the middleware revert was verified byte-identical by `diff`, not by
  eye.
- **`STATE.md` and `ROADMAP.md` untouched — CONFIRMED.** `deferred-items.md`
  untouched — findings are in this file instead, because plan `32-07` is running
  in parallel and two agents on one file are sequenced, not parallelised.
- **No stubs.** No hardcoded empty value, placeholder or TODO was introduced;
  `getAccessContext` returns the empty set only for a caller who genuinely has no
  session, and that path is documented and measured.
