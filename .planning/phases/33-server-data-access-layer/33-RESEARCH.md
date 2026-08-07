# Phase 33: Server Data-Access Layer — Research

**Researched:** 2026-08-07
**Domain:** Next.js 16 App Router server identity resolution · Supabase RLS · permission-predicate consolidation
**Confidence:** HIGH on the census and on the execution-context behaviour (both re-run in a
production build); MEDIUM on the conversion sequencing (a judgement, argued from the census);
LOW on nothing that this document states as fact.

> **Evidence discipline, inherited from phase 32.** Every claim below is tagged:
>
> | | |
> |---|---|
> | **MEASURED** | a command was run against this repository or a running server, and its output is pasted or quoted |
> | **CITED** | taken from official documentation, with the URL |
> | **ARGUED** | a conclusion drawn from a measurement made elsewhere in this document and cited |
> | **ASSUMED** | training knowledge, not verified in this session — needs owner or planner confirmation |
>
> Where this document could not settle a question, it says so rather than smoothing it over.

---

<user_constraints>

## User Constraints (from `33-CONTEXT.md`)

`33-CONTEXT.md` is not a `/gsd:discuss-phase` output with `## Decisions` / `## Claude's
Discretion` / `## Deferred Ideas` headings. It is an assembled context document. The
constraints below are copied from its own sections and are binding on the planner exactly as
locked decisions would be.

### Locked — "What the phase must decide"

- Whether the 44 header readers are converted in one sweep or in tranches, and if tranches,
  which surfaces go first. **The money paths and the door are the two that cannot be got
  wrong.**
- What the one server-only module returns — identity alone, or identity plus capabilities.
  `src/lib/capabilities/server.ts` already resolves capabilities per request; duplicating that
  would create the second divergent copy this phase exists to remove.
- What happens to the `x-user-*` injection once nothing reads it. Leaving a header nobody reads
  is a trap for the next person; removing it while one reader survives is a silent breakage.
- How a caller distinguishes *"not permitted"* from *"could not resolve"*. The project has **no
  error tracking**, so an infrastructure failure that renders as a permission denial reaches
  nobody. Phase 32 hit exactly this and fixed it with a tagged result value, not a parsed error
  string — Next redacts server-action error messages in production builds, so string matching
  works in `next dev` and silently stops working where it matters.

### Locked — "Must not"

- Touch `profiles_update_own` or the `42P17` recursion (D-32-A, owner-deferred).
- Move `door.operate` off `requires_approved = false`.
- Widen any RLS policy to make a refactor pass.
- Write names or personal addresses into `.planning/`.

### Locked — constraints inherited from phase 32 (`33-CONTEXT.md` § *Constraints inherited*)

- `door.operate` is `requires_approved = false` on both grant rows
  (`supabase/migrations/20260807000000_capability_model.sql:416-417`). The four check-in routes
  gate on **role alone** by owner decision.
- The `organizer/pending` asymmetry is **intentional**: can insert `ticket_tiers`, refused on
  `venues` (`42501`); `organizer/approved` can do both. Reproduce it, do not tidy it.
- **Middleware is UX; RLS is the security boundary.** A middleware change never substitutes for
  an RLS guarantee, and no comment may imply it does.
- Neither evidence artefact is the safety net; the pair is (D-32-H).
- `verify:capabilities` reads the **catalogue**, not the **grants** (D-32-L). A green there is
  not a statement about who can do what.
- `unused_index` must never be pinned. `multiple_permissive_policies` (46) and
  `unindexed_foreign_keys` (35) are structural and safe to pin.
- **CREDENTIAL HAZARD**: `GET /v1/projects/{ref}/postgrest` returns the project's JWT signing
  secret alongside `db_schema`. Read one field, persist nothing else, redact.

### Locked — planning shape (`33-CONTEXT.md` § *Planning shape*)

> Ask *"can these two run at the same time?"* **before** asking *"what is the logical order?"*.
> 44 files across many route groups is naturally parallel work — prefer several plans each
> owning a disjoint set of files over one plan that rewrites a shared module four times.

Granularity is `medium` (was `fine`). Phase 32: 11 plans in 9 waves, parallelism saved 6%.

### From `.planning/ACCESS-MODEL-DECISIONS.md` (owner, 2026-08-06) — bearing on this phase

1. **Four roles are coming**: `master`, `organizer`, `staff`, `member`. The schema admits three
   today. Phase 33 **must not hard-code the three-role world it can see**.
2. `staff` grants **one** thing: free entry via the membership card. No work permission.
3. **Phase 35 (per-night assignments) now precedes phase 34.** The resolver phase 33 builds will
   be asked, one phase later, *"may this person do X **on this night**"*. A resolver whose shape
   cannot carry a night is a resolver to be rewritten in phase 35.
4. **Attribution is required**: approval, rejection, account creation, role promotion, per-night
   assignment and door override each record **who** and **when**. The identity this phase
   resolves is the identity those records will name.
5. `MASTER_EMAIL` promotes and never demotes (`src/app/api/auth/callback/route.ts:27`). Recorded
   as a work item; **not this phase's to fix** unless planning shows it is cheaper here.

### Deferred / out of scope

- `profiles_update_own`, the `42P17` recursion, and the privilege-escalation guard (D-32-A).
- WR-01 … WR-07 and IN-01 … IN-05 from `32-REVIEW.md`, except where this phase touches the same
  line (see § *Two outstanding warnings land on this phase*).
- The `middleware.ts` → `proxy.ts` rename (see § *Forward compatibility*, item F-4).
- D-32-C, the false `schema.sql` guardrail in `CLAUDE.md` and `.claude/rules/supabase-data.md`
  (see § *Project Constraints*, correction note).

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description (`.planning/REQUIREMENTS.md:51`) | Research support |
|----|-------------|------------------|
| **CAP-05** | No surface derives permission from a request header; identity comes from the session | The full census (§ *The census*), the execution-context matrix that determines what "in one place" can mean (§ *Where `cache()` works and where it does not*), the runnable forged-header procedure (§ *The forged-header probe*), the duplicate inventory (§ *The divergent duplicates*), and the removal order (§ *What to do with the injection*) |

`.planning/REQUIREMENTS.md:169` maps CAP-05 → Phase 33, status Pending. **MEASURED.**

</phase_requirements>

---

## Summary

**This phase is not closing an open hole, and it is not cosmetic either.** Inbound `x-user-*`
headers are already deleted unconditionally at `src/lib/supabase/middleware.ts:210-212`, before
the injection block. I proved that deletion is load-bearing rather than decorative by removing
those three lines on a running dev server and re-running the same request: on
`/events/<slug>/menu`, an **anonymous** request carrying `x-user-role: master` gained the drink
management UI and **+10.5 KB / +23.4 KB** of payload on the two live events. With the three
lines restored, the same request is byte-for-byte an anonymous one on the marker that matters.
**MEASURED**, both directions, positive and negative control (§ *The forged-header probe*).

So the phase's real subject is the *shape of the dependency*: 44 files are safe for exactly one
reason, and that reason is three lines in a file that also does routing. What phase 33 removes
is the coupling, not a vulnerability.

**The census is smaller than it looks and larger than it reads.** 44 files, 97 reads
(`x-user-role` 44, `x-user-status` 42, `x-user-id` 11) — but **42 of the 44 are `page.tsx`,
2 are server actions, and 0 are route handlers**. 42 of the 44 pass `role`/`status` straight
into `<MobileNav>` or `<StaffNav>`, which are **client** components: those props are
presentation, not permission. Only 31 files gate a `redirect()` on the value. **MEASURED.**

**The permission duplication this phase must delete is mostly not in the header readers.** The
same predicate — *role ∈ {master, organizer}* — exists **13 times** read from the header and
**19 times** read from `public.profiles` through the anon client, in server actions and API
routes that never touch a header at all. Two pairs are byte-identical except for one error
string (`verifyOrganizer` and `verifyEventOwnership`, duplicated between
`organizer/events/actions.ts` and `organizer/events/[id]/tickets/actions.ts` — **MEASURED by
`diff`**). One pair *looks* identical and is not: `verifyOrganizerAccess`
(`organizer/events/[id]/guest-list/actions.ts:14-37`) reads ownership with the **service-role
client**, which bypasses RLS, where its two look-alikes read it with the cookie client, which
does not. That is the phase-32 `event_parties` trap in a different costume.

**The one finding that will change the plan.** React's `cache()` — the memoisation the existing
`src/lib/capabilities/server.ts` relies on — **works in a Server Component render and does not
work in a Server Action body or in a Route Handler.** Three calls to a `cache()`-wrapped
function executed the underlying function **once** during a page render and **three times**
inside a Server Action and **three times** inside a Route Handler. Identical in `next dev` and
in a `next build --webpack` + `next start` production build. **MEASURED, reproduced twice, both
build modes** (§ *Where `cache()` works*). Every plan that converts an action or a route must
resolve once into a local and pass it down; a plan that sprinkles `hasCapability()` calls
through an action buys one Supabase round trip each — and two of those actions sit on the money
path.

**Primary recommendation:** extend `src/lib/capabilities/server.ts` into the one module — do not
create a second one — by adding a session-identity field (`userId`) to the existing
`AccessContextResult`, converting the 42 pages to `getAccessContext()` in disjoint per-route-group
tranches, converting the 2 server actions and the 19 database-sourced predicate sites to
`hasCapability()`, deleting the duplicate `verify*` helpers, then removing **only** the header
*injection* and keeping the header *deletion* forever as a guard.

---

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|---|---|---|---|
| Resolve *who is calling* | **API / Backend** (Postgres, `auth.uid()` inside `my_access_context()`) | — | The JWT is verified by Postgres; nothing in Next decides identity |
| Resolve *what they may do* | **API / Backend** (`private.has_capability`, one definition) | — | CAP-01, already true |
| Cache that answer for one request | **Frontend Server (SSR)** (`cache()` in `src/lib/capabilities/server.ts`) | — | Per-render only — and **not** in actions or route handlers (MEASURED) |
| Route protection / bounce | **Frontend Server (proxy/middleware)** | — | UX only. `access-gating.md`: *"Il middleware decide dove un utente puo' andare; la RLS decide cosa puo' leggere"* |
| Data-access refusal | **Database (RLS)** | — | The security boundary. 45 of 67 policies already call `private.has_capability` |
| Refusal on service-client paths | **Frontend Server (the DAL)** | — | The service client bypasses RLS, so the *only* gate is the code. This is why the 9 service-client header readers are the risk concentration |
| Nav visibility | **Browser / Client** (`MobileNav`, `StaffNav`) | Frontend Server (props) | Client components cannot import the DAL — Next's own guidance is to resolve in a parent Server Component and pass down [CITED] |

**The line the planner must not cross:** nothing in this map moves a decision from the database
to the Node process. The DAL is a *transport and a cache*, not a second authority.

---

## Project Constraints (from `CLAUDE.md` and `.claude/rules/`)

Binding on every plan of this phase.

| Constraint | Source | Consequence for phase 33 |
|---|---|---|
| **No test runner for the product.** No `test` script, no `*.test.*`/`*.spec.*` | `CLAUDE.md` Guardrail 1; **MEASURED**: `package.json` scripts are `dev build start lint verify:persona verify:capabilities baseline:rls baseline:container baseline:compare` | No plan step may assume a suite. Verification is `npm run build`, the phase-32 baseline harness, and **written** manual procedures |
| **Typecheck runs inside the build.** `next build --webpack` | `CLAUDE.md` Guardrail 2; **MEASURED**: `"build": "next build --webpack"` | `npm run build` is the type gate. A stale `.next` gives a false failure — `rm -rf .next` first |
| **No error tracking anywhere** | `meta-gates.md`; **MEASURED**: no monitoring dependency in `package.json` | A logged failure reaches nobody. Every new error path needs an **observable effect** |
| **Middleware is UX; RLS is the boundary** | `access-gating.md`, gate *RLS-e'-il-confine* | A converted surface must not become *more* dependent on Next-side checks. Where the service client is used, the code **is** the only boundary — say so in the commit |
| **Two axes: role ≠ status** | `access-gating.md`, gate *due assi*; `32-CARRY-FORWARD.md` §4 | `requires_approved` keeps them apart. A caller that collapses them is wrong |
| **Service client must be justified in writing** | `access-gating.md`, gate *service role* | 9 of the 44 header readers use it (§ *The money paths and the door*). Converting them does not remove that obligation |
| **A server action is a public endpoint** | `nextjs-architecture.md`, gate *server action autorizzata*; independently **CITED** by Next.js: *"A page-level authentication check does not extend to the Server Actions defined within it. Always re-verify inside the action"* | The two header-reading actions and the 15 `"use server"` files all owe their own check |
| **`.planning/` is public** | `ai-engineering.md`, gate *la pianificazione e' pubblica*; **MEASURED**: `github.com/edmiribrahimi/Resonate` is public | Roles, never people. No unannounced dates, venues in negotiation, or line-ups in any phase-33 artefact |
| **Money: never trust the announcement; idempotent; monotone terminal states** | `ticketing-payments.md` | `admin/finance/actions.ts` is the one header reader that calls SumUp. Converting its gate must not touch refund idempotency |
| **The door: role alone, offline-first, failure shown to staff** | `checkin-offline.md`; `32-CARRY-FORWARD.md` §1 | `door.operate` stays `requires_approved = false`. A refusal at the door happens in front of a queue |
| **macOS/BSD** | `CLAUDE.md` Guardrail 6 | `grep -E`, `sed -i ''` |

### Correction carried into this phase, not to be fixed here

`CLAUDE.md` Guardrail 3 and `.claude/rules/supabase-data.md:18` both state that
`supabase/schema.sql` has **zero** `CREATE POLICY` and **zero** `ENABLE ROW LEVEL SECURITY`.
That is false, and I measured **why the error is so easy to make**:

```
$ grep -c  'CREATE POLICY'              supabase/schema.sql   →  0
$ grep -ci 'create policy'              supabase/schema.sql   → 37
$ grep -c  'ENABLE ROW LEVEL SECURITY'  supabase/schema.sql   →  0
$ grep -ci 'enable row level security'  supabase/schema.sql   → 11
```

**MEASURED.** `schema.sql` is written in lower case; the migrations are written in upper case.
A case-sensitive search for the upper-case form finds nothing in `schema.sql` and everything in
`migrations/` — which is exactly the false conclusion both files record. **Any phase-33 search
for a policy must be case-insensitive.** Tracked as D-32-C; not this phase's to fix.

---

## The census — MEASURED

All figures from this repository at commit `fabc08f`, 2026-08-07.

```
$ grep -rlE '\.get\("x-user-' src/ | wc -l     →  44 files
$ grep -rnE '\.get\("x-user-' src/ | wc -l     →  97 reads
```

| Header | Reads | Files |
|---|---|---|
| `x-user-role` | 44 | 44 |
| `x-user-status` | 42 | 42 |
| `x-user-id` | 11 | 11 |

Two more files mention `x-user-` and are **not** readers: `src/lib/supabase/middleware.ts`
(deletes and sets them) and `src/types/database.ts:389` (a comment). That is the 46 vs 44
discrepancy a naive `grep -rl 'x-user-'` produces.

### By kind — the number that shapes the plan

| Kind | Files |
|---|---|
| `page.tsx` (Server Component) | **42** |
| `actions.ts` (Server Action) | **2** |
| `route.ts` (Route Handler) | **0** |

**Zero API routes read a header.** All fourteen `src/app/api/**/route.ts` files authenticate
with `supabase.auth.getUser()` plus a `public.profiles` read, or with `CRON_SECRET`. **MEASURED.**
This matters for criterion 1, which names *"page, server action or API route"*: the API-route
third of that sentence is already satisfied — but see § *The divergent duplicates*, because
those routes hold six copies of the predicate the phase must consolidate.

### By route group

| Group | Files |
|---|---|
| `(admin)` | 19 |
| `(organizer)` | 13 |
| `(public)` | 8 |
| `(members)` | 3 |
| `src/app/page.tsx` | 1 |

These groups are **disjoint file sets**. Per the planning-shape constraint, they are the natural
parallel tranches.

### By what the value is used for — the finding that halves the risk

| Use | Files |
|---|---|
| Passed to `<MobileNav role status />` or `<StaffNav role />` | **42** |
| Gates a `redirect()` / `notFound()` on `role` | **31** |
| Compares `x-user-id` to `events.created_by` (ownership) | **9** (+ 1 action) |

`MobileNav` and `StaffNav` are both `"use client"` (`src/components/layout/MobileNav.tsx:1`,
`src/components/staff/StaffNav.tsx:1`). `MobileNav` calls `getVisibleNavItems(role, status)`
from `src/lib/rbac/roles.ts`, a pure function of the two values. **MEASURED.**

**Consequence, ARGUED:** criterion 1 says *identity comes from the session*. It does **not** say
*role and status stop existing*. A page that obtains `role` and `status` from
`getAccessContext()` and passes them to `MobileNav` satisfies CAP-05 completely — the source
changed from an attacker-controllable header to the session. Rewriting `MobileNav` to consume
capabilities is **phase 34's** subject (STAFF-01, STAFF-03: *"a navigation entry appears only
where the matching server-side check also passes"*). A planner who conflates the two turns a
44-file transport swap into a nav redesign.

### `x-user-id` — the eleven identity reads

`x-user-id` is compared against `events.created_by` at ten sites and used as a filter at one:

```
(organizer)/organizer/members/page.tsx:24
(organizer)/organizer/events/page.tsx:16
(organizer)/organizer/events/[id]/drinks/page.tsx:21     → :40  created_by !== userId
(organizer)/organizer/events/[id]/sales/page.tsx:20      → :41  created_by !== userId
(organizer)/organizer/events/[id]/edit/page.tsx:20       → :41  created_by !== userId
(organizer)/organizer/events/[id]/tickets/page.tsx:25    → :42  created_by !== userId
(organizer)/organizer/events/[id]/guest-list/page.tsx:20 → :41  created_by !== userId
(organizer)/organizer/events/[id]/analytics/page.tsx:33  → :54  created_by !== userId
(organizer)/organizer/events/[id]/review/page.tsx:62     → :100 created_by !== userId
(organizer)/organizer/events/[id]/guest-list/actions.ts:17 → :31 created_by !== userId
(admin)/admin/members/page.tsx:26
```

**MEASURED.** The DAL must therefore return a **user id**, not only a capability set — nine
ownership checks and every attribution record decision 5 of `ACCESS-MODEL-DECISIONS.md` demands
need it.

---

## Where `cache()` works and where it does not — the load-bearing measurement

`src/lib/capabilities/server.ts:89-101` already states one half of this:

> `cache()` memoises **within one render**. It does not span requests, and it does not span
> *executions*: `src/lib/supabase/middleware.ts` runs in its own execution before the render
> begins and cannot share this cache.

**The other half was not known, and it changes the plan.** I built a temporary probe — a
`cache()`-wrapped function incrementing a module counter — and called it three times from a
Server Component page, three times from a Server Action, and three times from a Route Handler.
The probe was deleted afterwards and the tree verified clean (`git status --porcelain` empty).

| Execution context | 3 calls → underlying executions | Same object reference? |
|---|---|---|
| **Server Component (page render)** | **1** | yes |
| **Server Action body** | **3** | no |
| **Route Handler** | **3** | no |
| Middleware / proxy | separate execution — cannot share (already documented, phase 32) | — |

Raw output, `next dev`, Next.js 16.1.6 + Turbopack, two consecutive runs:

```
[ZZPROBE-PAGE]   cache: callsBefore=0 callsAfter=1 a.n=1 b.n=1 c.n=1 sameRef=true
[ZZPROBE-ACTION] cache: callsBefore=1 callsAfter=4 a.n=2 b.n=3 c.n=4 sameRef=false
[ZZPROBE-PAGE]   cache: callsBefore=4 callsAfter=5 a.n=5 b.n=5 c.n=5 sameRef=true
[ZZPROBE-ACTION] cache: callsBefore=5 callsAfter=8 a.n=6 b.n=7 c.n=8 sameRef=false
```

```
GET /api/zzprobe  → {"callsBefore":0,"callsAfter":3,"ns":[1,2,3],"sameRef":false}
GET /api/zzprobe  → {"callsBefore":3,"callsAfter":6,"ns":[4,5,6],"sameRef":false}
```

**And the same in a production build** (`rm -rf .next && npm run build` → `BUILD_EXIT=0`, then
`PORT=3007 npm run start`):

```
GET /api/zzprobe → {"callsBefore":0,"callsAfter":3,"ns":[1,2,3],"sameRef":false}
[ZZPROBE-PAGE]   cache: callsBefore=0 callsAfter=1 a.n=1 b.n=1 c.n=1 sameRef=true
[ZZPROBE-ACTION] cache: callsBefore=1 callsAfter=4 a.n=2 b.n=3 c.n=4 sameRef=false
```

**MEASURED.** This is one of the few cases where dev and production agree; phase 32 was burnt by
a case where they did not, so it was worth the build.

React's own reference documents the boundary in one line: *"`cache` is for use in Server
Components only"* and *"React will invalidate the cache for all memoized functions for each
server request"*
[CITED: https://react.dev/reference/react/cache]. A Server Action body and a Route Handler are
not Server Component renders. Next.js's Authentication guide nevertheless says *"You can then
invoke the `verifySession()` function in your data requests, Server Actions, Route Handlers"*
[CITED: https://nextjs.org/docs/app/guides/authentication] — which is true (it works) but does
not say what it costs, and a planner reading only that sentence would assume memoisation it does
not get.

### What this costs, per surface — ARGUED from the measurement

| Surface | Round trips today | After conversion, if resolved **once** | After conversion, if `hasCapability()` is called *n* times |
|---|---|---|---|
| A page (42 of them) | 1 (middleware RPC) + 0 | 1 + **1** | 1 + **1** (memoised) |
| A server action (2 of them) | 1 (middleware RPC) + 0 | 1 + **1** | 1 + **n** |
| An API route (0 readers, 6 predicate sites) | 1 (middleware) + `getUser()` + `profiles` select = **3** | 1 + **1** = **2** | 1 + *n* |

The door route (`src/app/api/tickets/checkin/route.ts:130-153`) currently pays
`supabase.auth.getUser()` **and** a `public.profiles` select. `public.my_access_context()`
derives the subject from `auth.uid()` inside the JWT and needs neither. **Converting the door to
`hasCapability(CAP.DOOR_OPERATE)` is round-trip *negative* — one fewer network call before a
scan resolves** — provided it is called once. That is a genuine argument in favour of converting
the door, and `checkin-offline.md` gate *feedback immediato* is the reason it matters.

⚠️ **The counter-rule the planner must write into every action/route task:**

```ts
// CORRECT — one round trip
const { capabilities, userId } = await getAccessContext();
if (!capabilities.has(CAP.STAFF_MANAGE)) { … }
if (!capabilities.has(CAP.MASTER_MANAGE)) { … }

// WRONG in a Server Action or Route Handler — two round trips, silently
if (!(await hasCapability(CAP.STAFF_MANAGE))) { … }
if (!(await hasCapability(CAP.MASTER_MANAGE))) { … }
```

In a **page** both forms cost the same. In an **action** or a **route** they do not. This is
invisible to `npm run build` and invisible in `next dev` on a fast connection — it becomes
visible at the door, on a phone, on a bad network.

---

## How a server action gets the session — with what does and does not work

### The routing fact — MEASURED and CITED

Next.js's own Proxy reference states it, and the wording is unusually direct:

> Server Functions are not separate routes in this chain. They are handled as **POST requests to
> the route where they are used**, so a Proxy matcher that excludes a path will also skip Server
> Function calls on that path.
>
> A matcher change or a refactor that moves a Server Function to a different route can silently
> remove Proxy coverage. **Always verify authentication and authorization inside each Server
> Function rather than relying on Proxy alone.**
>
> [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/proxy#execution-order]

**MEASURED** in this repository: a Server Action POST to `/zzprobe` produced the dev-server log
line `POST /zzprobe 200 in 100ms (compile: …, proxy.ts: 1919µs, render: …)`. The middleware ran
on the action POST — `proxy.ts` appears in the timing breakdown.

### The four contexts, settled

| Context | How identity is obtained | What does **not** work |
|---|---|---|
| **Server Component page** | `await getAccessContext()` — `cookies()` → anon client → `my_access_context()`. `cache()` memoises across layout, page and every nested server component in the same render | `headers().get("x-user-*")` — the value is attacker-supplied unless the middleware strips it, and it is `null` for an anonymous caller (MEASURED below) |
| **Server Action** | Identical call. `cookies()` is available; the middleware ran on the POST | `cache()` does **not** memoise (MEASURED). Page-level checks do **not** extend into the action [CITED] |
| **Route Handler** | Identical call | `cache()` does **not** memoise (MEASURED) |
| **Middleware / proxy** | `supabase.auth.getUser()` + `supabase.rpc("my_access_context")` on its own client, as today | It cannot import `@/lib/supabase/server` — that calls `cookies()` from `next/headers`, which is not the middleware's request store. And it cannot share `cache()` |

### What `headers()` returns to a Server Action for a forged header — MEASURED

Probe result, forging all three headers on an anonymous Server Action POST:

```
[ZZPROBE-ACTION] role=null status=null id=null
```

The strip at `middleware.ts:210-212` covers Server Action POSTs, not only GET renders.
**MEASURED.**

### Two mechanics a forged-header procedure must know — MEASURED

1. **Next.js rejects a Server Action POST whose `Origin` does not match `Host`.** My first
   attempts returned `500` with `Error: Connection closed. digest: '3654956902'`. Adding
   `-H "Origin: http://localhost:PORT"` and sending the body as
   `Content-Type: text/plain;charset=UTF-8` with `[]` produced `200`. **This is a second,
   independent barrier in front of every server action**, and it is worth knowing before someone
   concludes from a `500` that their forge was refused on permission grounds.
2. **The action id is discoverable from the rendered HTML** as `$ACTION_ID_<40+ hex>` — that is
   how the probe below obtains it without a browser.

---

## The forged-header probe — a runnable procedure, with its positive control

Criterion 2 demands that *a request that forges an identity header is answered exactly as an
anonymous request would be*. This repository has no test runner, so the procedure below is the
evidence. **It was executed today, in both directions.**

### Why the obvious probe is insensitive — MEASURED, and it is the D-32-I lesson again

My first attempt used `/events` and `canSeeDrafts` (`src/app/(public)/events/page.tsx:41`).
Forging `x-user-role: master` produced **the same two event slugs** as an anonymous request —
**and still did with the strip removed.** The reason is that RLS on `public.events` refuses
unpublished rows to `anon` regardless of what `canSeeDrafts` decides. The probe reports "no
difference" because it cannot see one, not because there is none. *A probe that has never been
shown to fire proves nothing* — the same shape as D-32-I (*"a refused `UPDATE` raises nothing
and matches no row"*).

### The sensitive surface, and why it is that one

`src/app/(public)/events/[slug]/menu/page.tsx` is the only header reader that combines all
three properties:

- it is in the **`(public)` route group**, so **no middleware prefix rule gates it**
  (`protectedPrefixes` at `middleware.ts:136-142` is `/dashboard /membership-card /attendance
  /admin /organizer`);
- `const canManage = role === "master" || role === "organizer"` (`:72`) is decided **from the
  header alone**;
- the branch it selects reads through **`getServiceClient()`** (`:48`), which bypasses every RLS
  policy — so there is no second boundary behind it.

### The procedure

```bash
# 0. Start the app. Note the port it actually chose.
npm run dev            # or: rm -rf .next && npm run build && PORT=3007 npm run start

# 1. GET a public drink menu anonymously.
curl -s -o /tmp/anon.html \
  "http://localhost:PORT/events/<published-event-slug>/menu"

# 2. GET the same page forging every identity header.
curl -s -o /tmp/forged.html \
  -H 'x-user-role: master' \
  -H 'x-user-status: approved' \
  -H 'x-user-id: 00000000-0000-0000-0000-000000000000' \
  "http://localhost:PORT/events/<published-event-slug>/menu"

# 3. The observable. PASS = both zero.
grep -c 'Add Item' /tmp/anon.html /tmp/forged.html
```

**What must be observed:** `Add Item` — the management affordance that only the `canManage`
branch renders — must be **absent from both**. Byte size is **not** a valid observable: two
anonymous requests to the same URL differed by up to 2.3 KB in `next dev` (build ids, RSC nonces).
**MEASURED** — do not write a size assertion into a plan.

### For a server action

```bash
AID=$(curl -s "http://localhost:PORT/<page-hosting-the-action>" \
      | grep -oE '\$ACTION_ID_[a-f0-9]{40,}' | head -1 | sed 's/\$ACTION_ID_//')

curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:PORT/<same-page>" \
  -H "Next-Action: $AID" \
  -H "Origin: http://localhost:PORT" \
  -H "Content-Type: text/plain;charset=UTF-8" \
  -H 'x-user-role: master' -H 'x-user-id: FORGED' \
  --data '[]'
```

`Origin` is required or the request dies as `500 Connection closed` before the action body runs.
**MEASURED.**

### The positive control — the part that makes the procedure worth running

Run the probe **once** with the three `requestHeaders.delete("x-user-*")` lines commented out at
`src/lib/supabase/middleware.ts:210-212`, confirm the probe **fires**, then restore them and
confirm it goes quiet. Executed today:

| State of `middleware.ts:210-212` | `Add Item` in anon | `Add Item` in forged | Payload delta |
|---|---|---|---|
| **commented out** | 0 | **1** | **+10 522 B** (`resonate-pres-opening-party`), **+23 442 B** (`resonates-pres-club-house`) |
| **restored** | 0 | **0** | +2 334 B / −4 B (noise) |

**MEASURED.** The file was restored from a byte copy and `git status --porcelain` was empty
afterwards.

⚠️ **Do this on a dev server only, and revert in the same session.** The mutation removes the
single protection covering all 44 surfaces. `ai-engineering.md`, gate *prova per mutazione*:
assert the mutation was applied before reading its result — otherwise a green is a false
negative.

### Where the probe must be re-run at the end of the phase

The whole point of criterion 2 is that the answer stays the same **after** the readers are gone.
The end-state assertion is stronger and cheaper:

```bash
grep -rn 'x-user-' src/ | grep -v 'src/lib/supabase/middleware.ts'
```

**Zero lines** (including `src/types/database.ts:389`, whose comment must be updated or deleted
in the same change). A surface that cannot read the header cannot be fooled by it, and that is a
structural claim rather than a sampled one.

---

## The money paths and the door — which of the 44 sit there

Criterion 2 singles out *"the paths that move money"*. Measured, by grepping the 44 readers for
`getServiceClient` / `supabase/service` and for `lib/sumup` / `refundTransaction` /
`createCheckout`:

### Money — exactly one header reader touches SumUp

| File:line | What the header decides | RLS behind it? |
|---|---|---|
| **`src/app/(admin)/admin/finance/actions.ts:11-14`** — `requireMaster()`, `role !== "master"` → `redirect("/dashboard")` | Guards **every** exported action in the file: `listTransactions`, and the refund paths that call `refundTransaction` from `@/lib/sumup` | **None.** The file uses `getServiceClient()` and the SumUp API. SumUp has no RLS. **The header is the entire gate.** |

This is the surface the middleware's own comment names
(`src/lib/supabase/middleware.ts:206-209`): *"including the SumUp refund path, which gates on
`x-user-role` and then uses a service-role client that bypasses every RLS policy."` **MEASURED**
— it is still true today, and it is the single highest-value conversion in the phase.

⚠️ Note that this is a **Server Action** file, so per § *Where `cache()` works*, it must resolve
once and reuse. `requireMaster()` is called at the head of every exported action; if it is
rewritten as `await hasCapability(CAP.ADMIN_ACCESS)` it costs one round trip per action call —
which is correct and acceptable (one per invocation), but it must not become two.

### No RLS backstop — the nine service-client header readers

| File | Group | Middleware prefix gate? |
|---|---|---|
| `src/app/(public)/events/[slug]/menu/page.tsx` | `(public)` | **NO** — this is the exposed one |
| `src/app/(admin)/admin/finance/actions.ts` | `(admin)` action | POST to `/admin/finance` → yes, `admin.access` |
| `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts` | `(organizer)` action | yes, `organizer.access` |
| `src/app/(organizer)/organizer/events/[id]/guest-list/page.tsx` | `(organizer)` | yes |
| `src/app/(organizer)/organizer/events/[id]/sales/page.tsx` | `(organizer)` | yes |
| `src/app/(organizer)/organizer/events/[id]/review/page.tsx` | `(organizer)` | yes |
| `src/app/(admin)/admin/events/[id]/tickets/page.tsx` | `(admin)` | yes |
| `src/app/(admin)/admin/events/[id]/sales/page.tsx` | `(admin)` | yes |
| `src/app/(admin)/admin/events/[id]/guest-list/page.tsx` | `(admin)` | yes |

**MEASURED.** Eight of the nine sit behind a middleware capability gate, so an anonymous forger
is bounced before the page runs and a signed-in member is bounced by
`capabilities.has(ADMIN_ACCESS | ORGANIZER_ACCESS)`. **One does not**, and it is the `(public)`
drink menu — which is also the probe surface above, for exactly that reason.

### The guest list — the worst single case, and why

`src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:14-37`:

```ts
async function verifyOrganizerAccess(eventId: string): Promise<string> {
  const headersList = await headers();
  const role   = (headersList.get("x-user-role") as UserRole) || null;   // :16
  const userId = headersList.get("x-user-id") || "";                     // :17
  if (role !== "organizer" && role !== "master") throw new Error(…);      // :19
  if (role === "organizer") {
    const serviceClient = getServiceClient();                            // :24  ← bypasses RLS
    const { data: event } = await serviceClient
      .from("events").select("created_by").eq("id", eventId).single();
    if (!event || event.created_by !== userId) throw new Error(…);       // :31
  }
  return userId;                                                          // :36
}
```

Both the role **and** the identity come from headers, and the ownership check is then performed
with a client that answers regardless of who is asking. `ticketing-payments.md`, gate *guest
list*: *"Un ingresso in guest list e' un ingresso non pagato … Ogni percorso che aggiunge nomi va
tracciato con chi lo ha fatto"* — and the `userId` it returns is what that record names. Under
`ACCESS-MODEL-DECISIONS.md` §5 the attribution requirement makes this identity legally
load-bearing, not merely convenient.

### The door — no header reader decides anything at the door

| Surface | Reads a header? | Gate |
|---|---|---|
| `src/app/(admin)/admin/scanner/page.tsx:8-9` | **yes** — but only to pass `role`/`status` to `<MobileNav>`; the page renders `<ScannerClient />` unconditionally | Middleware `door.operate`, `middleware.ts:167-171` |
| `src/app/api/tickets/checkin/route.ts:130-153` | no | `auth.getUser()` + `profiles.select("role, status")`, role alone |
| `src/app/api/tickets/checkin/undo/route.ts:49` | no | same |
| `src/app/api/tickets/attendance/route.ts:28` | no | same |
| `src/app/api/membership/verify/route.ts:104` | no | same |

**MEASURED.** The scanner page is a **presentation-only** conversion — the lowest-risk file in
the whole census, despite sitting on the highest-consequence path. Say so in the plan, or it will
be treated as Critical and serialised for no reason.

The four API routes carry the comment block at `checkin/route.ts:110-130` recording the owner
decision — *"Role decides the door. Status does not … The three other door routes … must stay
identical"*. Any consolidation of those four into one function **must preserve role-alone**, and
`CAP.DOOR_OPERATE` is exactly that predicate (`keys.ts:66`: *"Middleware `/admin/scanner` and the
four door routes: ROLE ALONE"*).

---

## The divergent duplicates — criterion 3, inventoried

Criterion 3: *"Each permission check that existed in two divergent copies is now one function,
and the duplicates are **deleted** rather than left unused."*

**The duplication is a two-source problem, not a header problem.** The same predicate exists in
two independent transports.

```
role ∈ {master, organizer}   — from the header:            13 sites
role ∈ {master, organizer}   — from public.profiles:       19 sites
role === "master"            — from the header:            18 sites
role === "master"            — from public.profiles:        1 site
```

**MEASURED** (`grep -rnF`, full lists reproducible from the commands in § *Sources*).

### Genuinely equivalent — deletable with confidence

**D-1. `verifyOrganizer` — byte-identical except one error string.**

```
$ diff <(sed -n '25,52p' 'src/app/(organizer)/organizer/events/actions.ts') \
       <(sed -n '20,47p' 'src/app/(organizer)/organizer/events/[id]/tickets/actions.ts')
24c24
<     throw new Error("Forbidden: only organizers can manage events");
---
>     throw new Error("Forbidden: only organizers can manage ticket tiers");
```

**D-2. `verifyEventOwnership` — byte-identical except one error string.**

```
$ diff <(sed -n '56,78p' 'src/app/(organizer)/organizer/events/actions.ts') \
       <(sed -n '51,73p' 'src/app/(organizer)/organizer/events/[id]/tickets/actions.ts')
22c22
<     throw new Error("Forbidden: you can only manage your own events");
---
>     throw new Error("Forbidden: you can only manage tiers for your own events");
```

**D-3. `createArtist` / `createVenue` inline role blocks — byte-identical except one string.**

```
$ diff <(sed -n '41,60p' '…/organizer/artists/actions.ts') \
       <(sed -n '41,59p' '…/organizer/venues/actions.ts')
19,20c19
<     throw new Error("Forbidden: only organizers can create artist profiles");
---
>     throw new Error("Forbidden: only organizers can create venue profiles");
```

`updateArtist` (`artists/actions.ts:118-136`) and `updateVenue` (`venues/actions.ts:118-136`)
are a fourth and fifth copy of the same block. **MEASURED.** All four are inline — there is no
named function to delete, so the plan must state that "delete the duplicate" here means *remove
the inline block and call the shared function*.

**⚠️ D-3 carries a live semantic difference that must NOT be preserved by accident.**
`artists`/`venues` are the two tables whose policies use `catalogue.manage`, which carries
`requires_approved = true` (`32-CARRY-FORWARD.md` §3, `32-REVIEW.md` § summary). The **TypeScript**
check at these four sites tests role only and ignores status; the **RLS policy** behind them
tests status too. That is the measured `organizer/pending` asymmetry
(`32-CARRY-FORWARD.md` §2: *"can insert `ticket_tiers`, is refused on `venues` (`42501`)"*).
Replacing these four with `hasCapability(CAP.CATALOGUE_MANAGE)` would make the TypeScript check
**stricter than it is today** — a `pending` organizer would be refused in the action instead of
being refused by RLS one layer later. The final verdict is the same (refused), but the failure
*shape* changes: `Forbidden: only organizers can create venue profiles` becomes whatever the new
path renders. **CAP-03's rule was "neither more nor less"; this phase's criterion 4 is "every
role still reaches exactly the surfaces it reached before".** Reaching the same surfaces is
preserved. The error text is not. Flag it to the owner rather than deciding it silently.

### Look-alike, **not** equivalent — the phase-32 trap in a new costume

**D-4. `verifyOrganizerAccess` (guest-list) vs `verifyEventOwnership` (events, tickets).**

| | `verifyEventOwnership` (`events/actions.ts:56-78`, `tickets/actions.ts:51-73`) | `verifyOrganizerAccess` (`guest-list/actions.ts:14-37`) |
|---|---|---|
| role source | `public.profiles` via the **cookie/anon client** — RLS applies | `x-user-role` **header** |
| identity source | `supabase.auth.getUser()` | `x-user-id` **header** |
| ownership read | `supabase.from("events")` — **RLS applies** | `getServiceClient().from("events")` — **RLS bypassed** |
| master short-circuit | `if (isMaster) return` before any read | `if (role === "organizer")` guards the read |

They produce the same verdict *today*, because `events` has a SELECT policy that admits the
owner. They are **not behaviour-equivalent**: change the `events` SELECT policy and one of them
changes answer while the other does not. This is the same shape phase 32 recorded — *"two
`event_parties` policies whose second test looked like `is_master()` but was a scalar sub-select
read AS THE CALLER"*. **ARGUED**, from the two code readings above; not measured against a
mutated policy.

**D-5. The eight page-level ownership checks vs the two action-level ones.** The pages
(`drinks:40`, `sales:41`, `edit:41`, `guest-list:41`, `analytics:54`, `review:100`, and the two
variants at `tickets/page.tsx:42` and `events/page.tsx:31`) write
`if (role === "organizer" && event.created_by !== userId)` — the master case is expressed as an
implicit else. `verifyEventOwnership` writes `if (isMaster) return;` first. Same truth table,
opposite polarity. Consolidating them into one helper is safe **only** if the helper's master
branch is `return`, not `continue to the read` — inverting it would make a master's page depend
on `events` RLS for a row they may not read under some future policy.

**D-6. The six API-route copies of `role ∈ {master, organizer}`.** `attendance/route.ts:28`,
`checkin/undo/route.ts:49`, `checkin/route.ts:148`, `membership/list/route.ts:24`,
`membership/verify/route.ts:104`, and `refund-actions.ts:93/349/444`. They differ in **failure
shape**, not verdict: the routes `return { error, status }`, the actions `throw`. The comment at
`checkin/route.ts:126-129` states the requirement explicitly — *"The three other door routes …
must stay identical: the same person refused by one scanner and admitted by another, on the same
night, is undiagnosable with no error tracking anywhere in this repository."* Consolidating
these four is arguably the single most valuable deletion in the phase, and it is **not** in the
44 header readers.

**D-7. `verifyMaster` vs `verifyAdminOrOrganizer` (`admin/members/actions.ts:45-67`, `:73-95`)
are NOT duplicates.** They differ in the one line that matters (`role !== "master"` vs
`role !== "master" && role !== "organizer"`) and their preambles are identical only because the
preamble is boilerplate. They map to two different capabilities (`master.manage` /
`admin.access` vs `staff.manage`). Do not merge them. **MEASURED** by reading both bodies.

### The count the plan should target

| Family | Sites | Becomes |
|---|---|---|
| header `role !== "master"` | 18 (17 pages + `finance/actions.ts:12`) | `capabilities.has(CAP.ADMIN_ACCESS)` — the middleware already uses exactly this for `/admin/*` (`middleware.ts:173-177`) |
| header `role ∈ {org, master}` | 13 | `capabilities.has(CAP.ORGANIZER_ACCESS)` — matches `middleware.ts:180-184` |
| DB `role ∈ {org, master}` | 19 | `CAP.STAFF_MANAGE` (16 tables, status ignored) **or** `CAP.CATALOGUE_MANAGE` (artists/venues, status required) — **not interchangeable**; see the ⚠️ under D-3 |
| DB `role === "master"` | 1 | `CAP.MASTER_MANAGE` |
| door role check ×4 | 4 | `CAP.DOOR_OPERATE` — role alone, `requires_approved = false` |
| ownership `created_by !== userId` | 10 | one helper taking `(eventId, ctx)`; master short-circuits |

**Choosing between `STAFF_MANAGE`, `ADMIN_ACCESS`, `ORGANIZER_ACCESS` and `CATALOGUE_MANAGE` is
the highest-risk judgement in this phase**, because three of the eight keys resolve to the same
predicate *today* and are deliberately three keys
(`src/lib/capabilities/keys.ts:39-46`: *"They are deliberately three keys and not one, because
they are three different questions … a key named after its predicate makes that impossible"*).
Picking the wrong one is invisible until phase 35 grants one night's door and accidentally
grants sixteen tables. **Every substitution must be justified by which QUESTION the site asks,
not by which predicate currently matches.**

---

## The shape of the one module

### Recommendation: extend `src/lib/capabilities/server.ts`. Do not create a second module.

`33-CONTEXT.md` already names the risk. The measurement that settles it: the existing module is
already the exact shape Next.js documents as the recommended Data Access Layer —
`cache()`-wrapped, `cookies()`-based, server-only by import graph, returning a minimal DTO
[CITED: https://nextjs.org/docs/app/guides/data-security#data-access-layer,
https://nextjs.org/docs/app/guides/authentication#creating-a-data-access-layer-dal]. A second
module would be the second definition CAP-01 forbids and criterion 3 exists to delete.

### The change to the return type

```ts
export interface AccessContextResult {
  capabilities: Set<CapabilityKey>;
  userId: string | null;   // ← NEW. 10 ownership checks + every attribution record need it.
  role: string | null;     // kept: 42 surfaces feed <MobileNav>/<StaffNav>. See below.
  status: string | null;   // kept, same reason.
}
```

**Why `userId` is new and where it comes from.** `public.my_access_context()`
(`20260807000000_capability_model.sql:265-289`) returns `capabilities`, `role`, `status` — no
subject id. The eleven `x-user-id` reads need one. Two options, and the planner should choose
deliberately:

| Option | Cost | Note |
|---|---|---|
| **A.** `supabase.auth.getUser()` inside `getAccessContext()` | **+1 network call** on every resolve | `getUser()` contacts the Auth server. It is already what every API route does |
| **B.** add `'user_id', (select auth.uid())` to the `my_access_context()` payload | **0** extra calls; one forward migration | The JWT is already verified by Postgres to produce `auth.uid()`. Consistent with the reason `role`/`status` are in the payload at all (`…capability_model.sql:243-252`) |

**Option B is the recommendation** — ARGUED. It costs one small forward migration, keeps the
resolver at one round trip, and removes the temptation to reach for `getUser()` in a route
handler where `cache()` will not save you. It also keeps the CAP-04 property intact (the answer
comes from the current request, not from a token that may be stale). `supabase-data.md`, gate
*migration in avanti*: a new file, never an edit to `20260807000000`.

⚠️ Option B has one subtlety the plan must check: `my_access_context()` is `SECURITY DEFINER`
with `SET search_path = ''`, so `auth.uid()` must be written schema-qualified as `auth.uid()`
inside a `(select …)` wrapper, exactly as `has_capability` does at `:214`. **ASSUMED** that the
existing pattern transfers cleanly; verify against `20260807020000_wrap_auth_uid.sql` when
writing it.

### Why `role` and `status` stay — and why that is not a violation of CAP-05

`src/lib/capabilities/server.ts:111-115` and `…capability_model.sql:255-258` both say the same
thing: *"No new caller may branch on `role` or `status` … The two fields are removed from this
payload by the phase that deletes the header transport."*

That sentence, read literally, points at this phase. **Reading it that way would be a mistake.**
The two fields have a second consumer that is not the header transport: `MobileNav` and
`StaffNav` are client components that take `role` and `status` as props and cannot import the
DAL [CITED: Next.js Authentication guide — *"Client Components can't import the DAL. Run
`verifySession()` … in a parent Server Component, then pass data to client children as props"*].
Converting those two components to consume capabilities is **STAFF-03 / phase 34**.

**CAP-05 is about the SOURCE, not the vocabulary.** `role` obtained from
`getAccessContext()` is session-derived; `role` obtained from `headers()` is not. Phase 33
satisfies CAP-05 by changing the first; phase 34 removes the second.

The planner should record this explicitly, because the two comments above will otherwise be read
as an instruction to delete the fields, and doing so turns 42 mechanical page edits into a nav
redesign in the same phase.

### The API the callers see

```ts
// One resolve, everything from it. The correct default in EVERY context.
const { capabilities, userId, role, status } = await getAccessContext();

// Single-question convenience. Correct in a page (memoised);
// one round trip PER CALL in an action or a route handler.
if (!(await hasCapability(CAP.ADMIN_ACCESS))) redirect("/dashboard");
```

`getAccessContext()` and `hasCapability()` already exist and already take no user identifier —
and must keep taking none (D-04, `…capability_model.sql:230-238`: *"this repository has no rate
limiting anywhere … a resolver that answered a yes/no question about an arbitrary id would be a
free enumeration oracle"*).

### `server-only`

The module comment (`server.ts:13-19`) argues the boundary is enforced by the import graph
because `@/lib/supabase/server` calls `cookies()`. That is true, and Next.js nevertheless
recommends the explicit marker
[CITED: https://nextjs.org/docs/app/guides/data-security#preventing-client-side-execution-of-server-only-code].
Adding it is a one-line, zero-behaviour change. See § *Package Legitimacy Audit* — and note it is
**optional**, not required by any criterion.

---

## What to do with the injection — the safe order

Both halves of `middleware.ts:199-223` are involved and they must be treated differently.

```
:201  const requestHeaders = new Headers(request.headers);
:210  requestHeaders.delete("x-user-role");     ┐
:211  requestHeaders.delete("x-user-status");   │  THE STRIP  — attacker-supplied input
:212  requestHeaders.delete("x-user-id");       ┘
:217  requestHeaders.delete(CAPABILITY_DIAGNOSTIC_HEADER);
:219  if (user) {
:220    requestHeaders.set("x-user-role", …);   ┐
:221    requestHeaders.set("x-user-status", …); │  THE INJECTION — this phase's target
:222    requestHeaders.set("x-user-id", …);     ┘
:223  }
```

### The order, and why each step is where it is

| # | Step | Failure if done out of order |
|---|---|---|
| 1 | Convert every reader. `grep -rn 'x-user-' src/ \| grep -v middleware.ts` → **0 lines** | — |
| 2 | Update or delete the stale comment at `src/types/database.ts:389` and the `46 files` figures at `middleware.ts:76`, `server.ts:112`, `…capability_model.sql:245` (all say 45 or 46; the measured number is 44) | A comment that lies survives the code it described |
| 3 | Delete **only** `:219-223`, the injection | Removing it earlier: every `headers().get()` returns `null` → `role = null` → `if (role !== "master") redirect("/dashboard")` → **every master locked out of every `/admin` surface.** Fails *closed*, so it is an availability break rather than a security one — but it is total, and `npm run build` cannot see it |
| 4 | **KEEP `:210-212`.** Rewrite the comment: it no longer protects readers, it prevents any future reader from being born trusting client input | Removing it: a client can send `x-user-role: master` and it arrives intact at every `headers()` call in the app. Nothing reads it *today*. The next person who writes `headers().get("x-user-role")` — from muscle memory, or copying a pattern out of git history — gets attacker input with **no** protection at all |
| 5 | Add a mechanical guard so step 1 cannot silently regress | Without it, CAP-05 is a fact about one commit, not a property of the repository |

**Step 4 is a recommendation, not a certainty, and it is worth arguing in the plan.** The
counter-argument — *"a header nobody reads is a trap for the next person"* (`33-CONTEXT.md`) —
applies to the **injection**, which manufactures a value that looks authoritative. It does not
apply to the **deletion**, which manufactures nothing and costs three lines. Keeping a strip
while deleting the source is the asymmetric-cost choice: the failure it prevents is silent and
security-relevant; the cost is three lines and a comment.

### Step 5, concretely

This repository already builds exactly this kind of guard (`scripts/verify-capabilities.mjs`).
The cheapest version is a grep, not a parser:

```js
// scripts/verify-no-header-identity.mjs  (or a fifth check inside verify-capabilities.mjs)
// A plain grep, deliberately. verify-capabilities.mjs's own comment stripper is unsound
// in two ways (32-REVIEW.md WR-07) and must not be reused for a security assertion.
```

⚠️ **Do not reuse `splitCodeAndComments` from `verify-capabilities.mjs`.** WR-07 records that a
regex literal containing a quote — and one exists at
`src/app/(auth)/register/page.tsx:13` — opens a phantom string that runs for many lines,
so line comments inside that span land in the "code" bucket. A guard built on it would be a
guard that can be defeated by an unrelated file. Use a literal substring match.

**MEASURED cost of the check today:** `grep -rn 'x-user-' src/ | grep -v middleware.ts` returns
98 lines (97 reads + one comment). After the phase it must return 0.

---

## Forward compatibility — what would have to be rewritten one phase later

### F-1. The night — `staff` work permissions expire with the night (phase 35)

`private.has_capability` **already carries the parameter**:

```sql
CREATE OR REPLACE FUNCTION private.has_capability(
  p_capability text,
  p_party_id   uuid default null
) RETURNS boolean
```
`supabase/migrations/20260807000000_capability_model.sql:192-196`, with the comment at `:205-208`:
*"`p_party_id` is accepted and unused today, deliberately. Adding the parameter later would mean
rewriting every policy body that calls this function; adding it now costs one ignored
argument."* **MEASURED.**

**`public.my_access_context()` does not.** It takes no argument by design (D-04) and returns a
flat capability array. So a night-scoped question cannot be answered by the payload phase 33's
DAL returns.

**The rewrite risk, and how to avoid it — ARGUED:**

| Design | Survives phase 35? |
|---|---|
| `getAccessContext()` returns a `Set` and surfaces pass **the Set** down as props | **No.** A `Set<CapabilityKey>` cannot answer *"…on this night"*. Every surface that received the Set must be reopened |
| `hasCapability(key)` — a **function**, exported from the DAL | **Yes**, if the signature is allowed to grow: `hasCapability(key, opts?: { partyId?: string })` is source-compatible with every phase-33 call site |

**Recommendation:** phase 33 should (a) treat `hasCapability(key)` as the primary API and the raw
`Set` as an optimisation for pages that ask several questions in one render, and (b) **not**
introduce a pattern of passing the `Set` across module boundaries. If phase 33 ships a
`<Something capabilities={caps}>` prop convention, phase 35 pays for it.

⚠️ Phase 35 will also need a **new exposed SQL wrapper** — something of the shape
`public.my_party_capabilities(p_party_id uuid)`. Its argument is a *party* id, not a *person* id,
so the D-04 enumeration-oracle objection does not apply (it still answers only about
`auth.uid()`). Worth recording now so phase 35 does not re-derive it.

### F-2. The fourth role

`ACCESS-MODEL-DECISIONS.md` §1: `staff` is coming. **Nothing in phase 33 may enumerate roles.**
Three places enumerate them today and are outside this phase's scope but adjacent to it:
`supabase/schema.sql:59` (the CHECK), `src/types/database.ts:15` (the union),
`src/lib/rbac/roles.ts:7-11` (`ROLES`), and `private.role_capabilities.role`'s CHECK
(`…capability_model.sql:121`, recorded as IN-04). **A conversion that replaces
`role !== "master" && role !== "organizer"` with `capabilities.has(CAP.STAFF_MANAGE)` is
automatically fourth-role-safe.** A conversion that replaces it with
`["master","organizer"].includes(role)` is not — and it would pass review as a tidy-up.

### F-3. `MobileNav` / `StaffNav`

`getVisibleNavItems(role, status)` (`src/lib/rbac/roles.ts:88-…`) and `StaffNav`'s `STAFF_TABS`
(`src/components/staff/StaffNav.tsx:12-27`, with `roles: ["master"]` on the Finance tab) both
enumerate roles. Phase 34 (STAFF-03) rewrites them. Phase 33 should leave them alone and merely
change where their props come from — otherwise phase 33 pays for a redesign that phase 34 will
redo against four roles.

### F-4. `middleware.ts` → `proxy.ts`

**MEASURED**, from this repository's own dev server today:

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
   Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
```

And in the production build output: `ƒ Proxy (Middleware)`.

[CITED: https://nextjs.org/docs/app/api-reference/file-conventions/proxy — version history,
`v16.0.0`: *"Middleware is deprecated and renamed to Proxy. Proxy defaults to the Node.js
runtime"*]. A codemod exists: `npx @next/codemod@canary middleware-to-proxy .`

**Recommendation: NOT this phase.** It renames the file this phase edits, on a path that carries
every request including the door. Doing both in one phase makes a git blame that cannot be read.
But phase 33 **will** touch `middleware.ts:219-223`, so the deprecation is worth recording as an
adjacent work item — and worth *not* being surprised by when a plan-checker sees the warning in
a build log. (⚠️ `npx --yes` auto-downloads unverified packages; if the codemod is ever run, it
should be after an explicit `npm view @next/codemod` check.)

### F-5. `MASTER_EMAIL` promotes and never demotes

`src/app/api/auth/callback/route.ts:27`. `ACCESS-MODEL-DECISIONS.md` §10 and `33-CONTEXT.md`
both record it as **not this phase's** unless planning shows it is cheaper here. It is an
undeclared monotone switch, which `meta-gates.md` treats as the most dangerous class. **My
reading: it is NOT cheaper here.** Phase 33 does not touch the auth callback, and folding a
one-way-switch repair into a 44-file transport swap would put a Critical change inside a
mechanical phase. Recommend leaving it.

---

## Failure semantics — "not permitted" vs "could not resolve"

### The precedent, and the boundary no message can cross

Phase 32 hit this and closed it as CR-01. The rule it established, from `32-REVIEW.md`
§ *CR-01 closed*:

> Next **redacts** the message of an error thrown out of a Server Action in a production build,
> so the review's proposed `err.message.startsWith("capabilities.resolve_failed")` would work in
> `next dev` and silently stop working in the deployment where it matters. **The category has to
> be a value to survive the boundary.** The tag is decided by **position** — the guard runs in
> its own `try`, the provider call in another — so nothing depends on the text of an error a
> framework is free to rewrite.

**Every new converted call site inherits this.** `src/lib/capabilities/server.ts:85-88` says so
in its own words: *"A new caller of `hasCapability` inherits obligation 2. Wrapping it in a
`catch` that returns `false`, or `[]`, re-creates the defect this file was written to prevent."*

### What each surface class owes

| Surface class | Refusal ("not permitted") | Resolve failure ("could not find out") |
|---|---|---|
| **Page (42)** | `redirect("/dashboard")` — the existing behaviour, unchanged | Let it throw. Next's error boundary is the observable effect; `[capabilities.resolve_failed]` in the runtime log is the diagnosis. **Do not wrap in `try/catch`** |
| **Server Action (2)** | Today: `redirect()` (`finance`) or `throw` (`guest-list`). Keep the existing shape | Return a **tagged value** decided by position, exactly as the four newsletter call sites do. Never `err.message.startsWith(...)` |
| **API route (0 readers, 6 predicate sites)** | `return { error, status: 403 }` — unchanged | Must be distinguishable from 403. `500` with a distinct body, not a 403 |
| **Middleware** | Bounce (unchanged) | WR-04, still open — see below |

⚠️ **The `redirect()` interaction.** `redirect()` throws `NEXT_REDIRECT`. Any `try/catch` placed
around a `getAccessContext()` call that also contains a `redirect()` must `unstable_rethrow`, or
a refusal becomes a rendered fault. The newsletter conversion already does this
(`admin/newsletter/actions.ts`, per `32-REVIEW.md` § *CR-01 closed*). **ARGUED** from that
precedent.

⚠️ **`cache()` caches errors.** React: *"`cachedFn` will also cache errors. If `fn` throws an
error for certain arguments, it will be cached, and the same error is re-thrown"*
[CITED: https://react.dev/reference/react/cache#caveats]. So within one page render a resolve
failure is *consistent* — good — and *not retryable* — which is correct, but worth knowing before
someone writes a retry.

### The door, specifically

`checkin-offline.md` gate *il fallimento va visto*: *"ogni percorso di errore del check-in deve
mostrarsi allo staff sul posto — l'unico osservatore che esiste davvero."* If the four door
routes are consolidated onto `hasCapability(CAP.DOOR_OPERATE)`, a resolve failure must surface to
the scanner UI as something other than "not authorised" — because at 02:00 the difference decides
whether staff reboot the phone or fetch a different account.

### Two outstanding warnings land on this phase

- **WR-04** (`32-REVIEW.md:354-392`): the middleware's degraded path signals only through
  `x-capabilities-resolve-failed`, a response header the code itself says *"is never read"*.
  Phase 33 is editing that exact block (`:219-223`) to remove the injection. **If any phase is
  cheap for WR-04, it is this one** — the proposed fix is `url.searchParams.set("access",
  "unavailable")` on the bounce plus a one-line banner on `/dashboard`. Recommend the planner
  raise it as an explicit in/out decision rather than letting it fall through.
- **IN-01** (`32-REVIEW.md:511-521`): when the RPC fails, `role`/`status` fall back to
  `member`/`pending` and are **injected as fact** into headers that 44 files read — those files
  receive an assertion, not an unknown. IN-01 closes with: *"it is the shape the header transport
  imposes, and it is worth naming in the phase that deletes that transport."* **This is that
  phase.** After conversion the fallback lives in one place (`getAccessContext()`'s throw), and
  IN-01 closes by construction. Worth stating in `33-VERIFICATION.md`.

---

## Architecture Patterns

### Pattern 1 — the page conversion (42 files, the mechanical bulk)

```ts
// BEFORE
import { headers } from "next/headers";
import type { UserRole, UserStatus } from "@/types/database";

const headersList = await headers();
const role   = (headersList.get("x-user-role")   as UserRole)   || null;
const status = (headersList.get("x-user-status") as UserStatus) || null;
const userId = headersList.get("x-user-id") || "";

if (role !== "master") redirect("/dashboard");
```

```ts
// AFTER
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";

const { capabilities, role, status, userId } = await getAccessContext();

if (!capabilities.has(CAP.ADMIN_ACCESS)) redirect("/dashboard");
// role / status still flow to <MobileNav role={role} status={status} /> — see
// "Why role and status stay". Their SOURCE changed; their consumer has not.
```

**Behaviour equivalence, ARGUED:** for an anonymous caller `getAccessContext()` returns
`ANONYMOUS_CONTEXT` — empty set, `role: null`, `status: null` (`server.ts:131-135`), so
`!capabilities.has(...)` → `redirect("/dashboard")`, which the middleware then turns into
`/login`. Today `role` is `null` from the header and `role !== "master"` → the same
`redirect("/dashboard")`. **Same two hops, same destination.** The `(admin)` and `(organizer)`
pages are additionally unreachable anonymously because of `protectedPrefixes`.

The `as UserRole` cast disappears, which is a real gain: `headers().get()` returns
`string | null` and the cast asserts a union the header cannot guarantee.

### Pattern 2 — the server action conversion (2 files, and the 15 `"use server"` files behind them)

```ts
// src/app/(admin)/admin/finance/actions.ts — BEFORE
async function requireMaster() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  if (role !== "master") redirect("/dashboard");
}
```

```ts
// AFTER — one resolve, reused. cache() does NOT help here (MEASURED).
async function requireMaster() {
  const { capabilities } = await getAccessContext();
  if (!capabilities.has(CAP.ADMIN_ACCESS)) redirect("/dashboard");
}
```

Next.js states the obligation this preserves: *"The page-level redirect controls which UI is
rendered, but the Server Action is a separate entry point and must verify the caller on its own"*
[CITED: https://nextjs.org/docs/app/guides/data-security#authentication-and-authorization]. This
is `nextjs-architecture.md` gate *server action autorizzata* stated by the framework.

### Pattern 3 — the ownership helper (10 sites)

```ts
// One function. Master short-circuits BEFORE the read (D-5).
export async function assertOwnsEvent(eventId: string): Promise<void> {
  const { capabilities, userId } = await getAccessContext();
  if (capabilities.has(CAP.MASTER_MANAGE)) return;          // never reads the row
  const supabase = await createClient();                     // cookie client — RLS applies
  const { data } = await supabase.from("events")
    .select("created_by").eq("id", eventId).single();
  if (!data || data.created_by !== userId) { /* refuse */ }
}
```

⚠️ Note the client. `guest-list/actions.ts:24` uses the **service** client for this read.
Consolidating onto the cookie client changes the read's RLS exposure. Whether that is a fix or a
behaviour change depends on the `events` SELECT policy and must be checked against the phase-32
baseline artefacts, not assumed. **This is the highest-risk single line in the whole
consolidation.**

### Anti-patterns to avoid

- **`catch { return false }` / `catch { return new Set() }` around the resolver.** An empty set
  refuses a master exactly the way it refuses a pending member (`server.ts:33-46`).
- **`err.message.startsWith("capabilities.resolve_failed")` on anything reachable from a client.**
  Redacted in production builds. Use a tagged value decided by position.
- **Calling `hasCapability()` more than once in an action or a route handler.** One round trip
  each. **MEASURED.**
- **Passing the capability `Set` across module boundaries as a prop convention.** Phase 35 pays
  for it (F-1).
- **Enumerating roles** in any new code. The fourth role arrives one phase later (F-2).
- **Substituting a capability key because its predicate currently matches.** Match the *question*
  (`keys.ts:39-46`).
- **`grep 'CREATE POLICY'` case-sensitively.** Misses 37 objects in `schema.sql`. **MEASURED.**

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Resolve identity + capabilities per request | A second resolver module | `getAccessContext()` / `hasCapability()`, `src/lib/capabilities/server.ts` | CAP-01: one definition. A second is the divergent copy criterion 3 deletes |
| Per-render memoisation | A module-level `Map`, a `WeakMap`, a request-id cache | React `cache()` — already in place, **and know it does not apply in actions/routes** | A hand-rolled cache keyed by anything other than the React request store leaks across requests |
| Server-only enforcement | A runtime `typeof window` check | The import graph (`cookies()` throws in a client component) + optionally `server-only` | [CITED: Next.js Data Security guide] |
| Prove no surface reads the header | A hand-written parser | `grep -rn 'x-user-'` | WR-07: the existing parser is unsound on regex literals containing quotes |
| Prove no permission moved | A written argument | `npm run baseline:rls` / `baseline:container` + `baseline:compare` | D-32-H: neither artefact is the safety net; the pair is |
| Prove the capability keys still line up | Reading the migration | `npm run verify:capabilities` | …but D-32-L: it reads the **catalogue**, not the **grants** |
| Route protection | New checks in the middleware | The four existing rules, unchanged | `middleware.ts:155-162`: the `/admin/scanner` before `/admin` ordering is load-bearing and is *not* a lookup table on purpose |

---

## Common Pitfalls

### P-1. Assuming `cache()` memoises everywhere
**What goes wrong:** an action that asks three capability questions makes three Supabase round
trips. **Why:** the Next.js Authentication guide invites `verifySession()` in "Server Actions,
Route Handlers" without saying what it costs. **How to avoid:** destructure once.
**Warning sign:** more than one `await hasCapability(` in a single `"use server"` function.

### P-2. Removing the strip instead of the injection
**What goes wrong:** 44 surfaces become forgeable simultaneously. **Why:** the two blocks are
eleven lines apart in the same function and read as one concern. **How to avoid:** step 3 and
step 4 of § *What to do with the injection* are different steps with opposite verdicts.
**Warning sign:** a diff that touches `:210-212`.

### P-3. A probe that has never been shown to fire
**What goes wrong:** the `/events` probe reported "no difference" with the strip **removed**,
because RLS was doing the work. **How to avoid:** run every criterion-2 probe once with the
protection disabled and confirm it fires. **MEASURED** — this happened during this research.

### P-4. Substituting the wrong capability key
**What goes wrong:** `staff.manage`, `organizer.access` and `door.operate` resolve to the same
predicate today, so any of the three "works". **Why:** `keys.ts:39-46` deliberately keeps them
apart. **How to avoid:** justify each substitution by the question, and note that
`catalogue.manage` (status required) vs `staff.manage` (status ignored) is *"this model's named
worst-case defect"* (`32-CARRY-FORWARD.md` §3). **Warning sign:** a plan that says "replace all
`role ∈ {master, organizer}` with `STAFF_MANAGE`".

### P-5. Deleting `role`/`status` from the payload
**What goes wrong:** 42 pages lose their `<MobileNav>` props and the phase becomes a nav redesign.
**Why:** two source comments say the fields go away "in the phase that deletes the header
transport". **How to avoid:** CAP-05 is about the source. Phase 34 owns the vocabulary.

### P-6. A stale `.next` after a worktree merge
**MEASURED** in `32-CARRY-FORWARD.md`. `rm -rf .next` before concluding anything is broken.

### P-7. Trusting `verify:capabilities` as a permission statement
D-32-L: it reads the catalogue, never `private.role_capabilities`. A green there says nothing
about who can do what.

### P-8. `Origin` mismatch read as a permission refusal
A Server Action POST without a matching `Origin` returns `500 Connection closed` **before the
body runs**. **MEASURED.** Someone probing criterion 2 with `curl` will otherwise conclude the
forge was refused on permission grounds.

---

## Runtime State Inventory

This is a refactor phase, so this section is required. Every category was checked; none is left
blank.

| Category | Items found | Action required |
|---|---|---|
| **Stored data** | **None.** The `x-user-*` strings exist only in source, never in a column, a policy body, or a stored value. `grep -rn 'x-user' supabase/` → 0 hits. **MEASURED** | none |
| **Live service config** | **None.** No Vercel rewrite, header rule or edge config references `x-user-*`. `grep -rn 'x-user' vercel.json next.config.*` → 0 hits. **MEASURED** | none |
| **OS-registered state** | **None.** No scheduled task, launchd plist or pm2 process refers to these names. This is a Vercel-hosted Next.js app | none |
| **Secrets / env vars** | **None** relating to this phase. `.env.local` holds 9 keys (`SUPABASE_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `NEXT_PUBLIC_APP_URL`, `MASTER_EMAIL`, `TICKET_SIGNING_SECRET`); none names a header. **MEASURED**. `CRON_SECRET` is Vercel-only and unaffected | none |
| **Build artifacts** | `.next/`. A stale build after a merge produces a false failure — `rm -rf .next` before diagnosing. Additionally, the **service worker** (`@serwist/next`) caches responses; `nextjs-architecture.md` gate *service worker* forbids serving payment/ticket/venue surfaces stale. **This phase changes no route and no response body**, so no cache invalidation is required — but that is a claim worth re-checking if any plan changes a rendered output | `rm -rf .next` before build verification |
| **Database objects** | If Option B is taken (`user_id` in the `my_access_context()` payload), a **new forward migration** is required, plus `src/types/database.ts` in the same commit (`supabase-data.md`, gate *tipi allineati*), plus a re-run of the phase-32 baseline pair | one forward migration; never edit `20260807000000` |
| **Stale comments** (the refactor-specific category) | `src/types/database.ts:389` says *"46"*; `src/lib/supabase/middleware.ts:76` says *"46 files"*; `src/lib/capabilities/server.ts:112` says *"46 files"*; `…capability_model.sql:245` says *"46 files"*; `32-REVIEW.md` IN-01 says *"45"*. **The measured number is 44.** | update or delete all four in the same change that deletes the transport |

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node + npm | everything | ✓ | — | — |
| Next.js | the build gate | ✓ | **16.1.6** (measured, `package.json` and the dev banner) | — |
| React / React-DOM | `cache()` | ✓ | **19.2.3** | — |
| `@supabase/ssr` / `supabase-js` | the DAL | ✓ | `^0.8.0` / `^2.97.0` | — |
| `curl` | the forged-header probe | ✓ | system | — |
| A dev or prod server on a free port | the probe | ✓ — ⚠️ **ports 3000 and 3002 are held by Docker on this machine** (measured: `com.docke … TCP *:3000 (LISTEN)`, `*:3002`). `next dev` auto-selected 3001; `npm start` needed an explicit `PORT=3007` | — | pick an explicit port |
| Supabase project (production) | the baseline harness, and the probe's data reads | ✓ (`.env.local`) | — | container target for B2/B3 |
| Docker | `baseline:container` | ✓ (running — it is holding the ports above) | — | — |
| `slopcheck` | package legitimacy | ✓ installed this session | — | — |
| Test runner | — | **✗, by design** | — | `npm run build` + baseline harness + written manual procedures |
| Error tracking | — | **✗** | — | observable effects (`meta-gates.md`) |

**Missing with no fallback:** none.
**Missing with fallback:** test runner and error tracking — both are permanent project
conditions, not phase blockers.

---

## Package Legitimacy Audit

This phase needs **no new dependency**. The only candidate is optional.

| Package | Registry | Age | Downloads | Source repo | slopcheck | Disposition |
|---|---|---|---|---|---|---|
| `server-only` | npm | published **2022-09-03**, ~4 yr (`npm view server-only time.created`) | **13 379 681 / week** (`api.npmjs.org/downloads/point/last-week`) | **none linked** on the registry entry | **`[OK]`** — *"No source repository linked. Harder to verify what this code actually does."* | **Optional.** Approved if the planner wants the explicit marker |

Verification performed:

```
$ npm view server-only version                 → 0.0.1
$ npm view server-only time.created            → 2022-09-03T01:07:25.909Z
$ npm view server-only scripts.postinstall     → (empty — no postinstall)
$ npm view server-only maintainers             → sebmarkbage <sebastian@calyptus.eu>
$ curl api.npmjs.org/downloads/point/last-week/server-only → 13 379 681
$ slopcheck install server-only                → [OK] server-only (npm), 1 OK
```

⚠️ **`slopcheck install` actually runs `npm install`.** It modified `package.json` and
`package-lock.json`; both were reverted with `git checkout --` and `git status --porcelain` is
empty. A planner who runs it must expect the same and revert.

**Provenance honesty:** `server-only` was discovered via the official Next.js Data Security guide
[CITED], is maintained by a React core author, and passes slopcheck — but its npm entry links **no
source repository**, which is the one weak signal. Tagged **`[VERIFIED: npm registry]`** on the
strength of the official-documentation discovery plus the clean slopcheck run, with the
missing-repo caveat stated rather than hidden.

**Packages removed due to `[SLOP]`:** none.
**Packages flagged `[SUS]`:** none.

---

## Validation Architecture

`.planning/config.json` has no `workflow.nyquist_validation` key, so this section is included.

### Test framework

| Property | Value |
|---|---|
| Framework | **None.** No `test` script, no `*.test.*`, no `*.spec.*`. **MEASURED** |
| Config file | none |
| Quick run command | `npm run build` (includes the Next type check) |
| Full suite command | `rm -rf .next && npm run build` + `npm run baseline:rls` / `baseline:container` / `baseline:compare` + `npm run verify:capabilities` |

**No plan step may assume a suite. Nothing may be claimed verified because tests pass.**

### CAP-05 → evidence map

| Criterion | Behaviour | Kind | Command / procedure | Exists? |
|---|---|---|---|---|
| **1** | No page, action or route derives role/identity from a header | mechanical | `grep -rn 'x-user-' src/ \| grep -v 'src/lib/supabase/middleware.ts'` → **0 lines** | ✅ runnable today (returns 98) |
| **1** | The build still typechecks | mechanical | `rm -rf .next && npm run build` | ✅ |
| **2** | A forged header is answered as an anonymous request | manual, scripted | § *The forged-header probe*, both controls | ✅ executed today |
| **2** | …including on the money paths | manual | Sign in as `master`, open `/admin/finance`, confirm the transaction list loads; sign out, `curl` the same action id with `x-user-role: master` and confirm the redirect | ❌ **owed** — needs a session |
| **3** | Each divergent check is one function; duplicates deleted | mechanical | `grep -rnF 'role !== "master"' src/`, `grep -rnF 'profile.role !== ' src/` → counts must fall to the consolidated number, and `grep -rn 'function verifyOrganizer'` → 1 | ✅ runnable |
| **4** | Every role reaches exactly the surfaces it reached before | artefact | `npm run baseline:rls` / `baseline:container` at a new `--phase-point`, then `baseline:compare` → `CAP-03: clean` | ✅ harness exists |
| **4** | Middleware verdicts unchanged for all personas | manual | Phase 32's eleven-persona verdict table, re-run | ✅ procedure exists |

### Sampling rate

- **Per task commit:** `npm run build` (from a cleared `.next` if a merge preceded it).
- **Per wave merge:** `npm run build` + `grep -rn 'x-user-' src/` census delta.
- **Phase gate:** full build + baseline pair + `verify:capabilities` + the forged-header probe
  with its positive control, before `/gsd:verify-work`.

### Wave 0 gaps

- [ ] A `scripts/verify-no-header-identity.mjs` (or a fifth check in `verify-capabilities.mjs`)
      asserting zero `x-user-` outside `middleware.ts` — **a literal substring match, not the
      WR-07 parser**.
- [ ] A written, executable forged-header procedure committed alongside the phase — this document
      § *The forged-header probe* is the draft; it needs an event slug that exists in whatever
      environment it is run against.
- [ ] A decision, recorded before conversion begins, on whether the money-path manual check
      (criterion 2, second row above) is executed or explicitly OWED. `32-VERIFICATION.md` set the
      precedent that *deferred is not verified* and that a deliberate `nyquist_compliant: false`
      beats an unearned `true`.

*No test framework will be installed. That is `CLAUDE.md` Guardrail 1, not an omission.*

---

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json`, so this section is
included.

### Applicable ASVS categories

| ASVS category | Applies | Standard control in this repository |
|---|---|---|
| **V2 Authentication** | yes | Supabase Auth; JWT in cookies; `auth.uid()` verified in Postgres. Not modified by this phase |
| **V3 Session Management** | yes | `@supabase/ssr` cookie handling in `middleware.ts` and `lib/supabase/server.ts`. ⚠️ `middleware.ts:235-248` re-applies cookies to the final response — *"Without this, users would be logged out on every navigation"*. **Any edit to the header block must not disturb the cookie re-application below it** |
| **V4 Access Control** | **yes — this is the phase** | Capability model (`private.has_capability`), 45 of 67 RLS policies, plus the DAL. IDOR is the ownership family (10 sites) |
| **V5 Input Validation** | yes, marginally | The request header **is** the untrusted input. The strip at `:210-212` is the control. No validation library in the repo; none needed for this phase |
| **V6 Cryptography** | no (not touched) | ⚠️ Standing defect elsewhere: `src/utils/qr.ts:49` generates membership codes with `Math.random()` (`access-gating.md`, still true) |
| **V7 Error Handling & Logging** | **yes** | No error tracking. Every new failure path needs an observable effect. See § *Failure semantics* |

### Known threat patterns for this stack

| Pattern | STRIDE | Standard mitigation | Status here |
|---|---|---|---|
| Client-forged identity header reaching a trusted read | **Spoofing** | Never derive identity from a request header; derive it from a verified session | The phase's subject. Currently mitigated by three lines |
| Authorization check bypassed via direct Server Action invocation | **Elevation of privilege** | Re-verify inside every action [CITED] | 15 `"use server"` files; 2 read headers |
| Service-role client on a path reachable by untrusted input | **Elevation of privilege** | `access-gating.md` gate *service role* | 9 of 44 readers; 1 in `(public)` with no prefix gate |
| IDOR on `events` | **Tampering** | Ownership check, master short-circuit | 10 sites, 3 divergent implementations (D-4, D-5) |
| Enumeration oracle on a capability API | **Information disclosure** | The API takes no subject id (D-04) — **no rate limiting exists anywhere** to put in front of one | Preserved; must stay preserved |
| Failure rendered as refusal | **Repudiation / availability** | Tagged result values; observable effects | CR-01 precedent |
| CSRF on a Server Action | **Spoofing** | Next enforces `Origin` = `Host` on action POSTs — **MEASURED** | Framework-provided; do not weaken |

---

## Sources

### Primary — HIGH confidence

- **This repository at `fabc08f`** — every `file:line` cited above is re-openable.
- **A running dev server and a production build of this repository**, 2026-08-07 — the
  `cache()` matrix, the forged-header probe with both controls, the Server Action `headers()`
  result, the `Origin` requirement, the middleware deprecation warning.
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy — Server Functions are POSTs
  to their host route; the explicit instruction to verify inside each Server Function; the
  `NextResponse.next({ request: { headers } })` mechanics; the v16.0.0 rename and codemod.
- https://nextjs.org/docs/app/guides/data-security — the Data Access Layer pattern; *"A
  page-level authentication check does not extend to the Server Actions defined within it"*;
  `server-only`; the DAL-for-mutations pattern.
- https://nextjs.org/docs/app/guides/authentication — `verifySession()` + `cache()`; *"Client
  Components can't import the DAL"*; *"Proxy … should not be your only line of defense."*
- https://react.dev/reference/react/cache — *"cache is for use in Server Components only"*;
  per-request invalidation; **errors are cached**.
- `.planning/phases/32-capability-model-in-the-database/32-CARRY-FORWARD.md`, `32-REVIEW.md`,
  `32-VERIFICATION.md`; `.planning/ACCESS-MODEL-DECISIONS.md`; `.planning/REQUIREMENTS.md`;
  `.planning/ROADMAP.md`; `.planning/STATE.md`.
- `CLAUDE.md` and `.claude/rules/{meta-gates,access-gating,nextjs-architecture,supabase-data,
  checkin-offline,ticketing-payments,ai-engineering}.md`.

### Reproducible commands behind the census

```bash
grep -rlE '\.get\("x-user-' src/ | wc -l                      # 44
grep -rnE '\.get\("x-user-' src/ | wc -l                      # 97
grep -rnF '.get("x-user-role")'   src/ | wc -l                # 44
grep -rnF '.get("x-user-status")' src/ | wc -l                # 42
grep -rnF '.get("x-user-id")'     src/ | wc -l                # 11
grep -rlE '\.get\("x-user-' src/ | grep -c 'page.tsx'         # 42
grep -rlE '\.get\("x-user-' src/ | grep -c 'actions.ts'       # 2
grep -rlE '\.get\("x-user-' src/ | grep -c 'route.ts'         # 0
grep -rnF 'if (role !== "master")'    src/ | wc -l            # 18
grep -rnF 'profile.role !== "master"' src/ | wc -l            # 18 (17 org-or-master + 1 master)
grep -rn  'created_by !== userId'     src/ | wc -l            # 10
grep -ci  'create policy'             supabase/schema.sql     # 37  (grep -c 'CREATE POLICY' → 0)
grep -ci  'enable row level security' supabase/schema.sql     # 11  (case-sensitive → 0)
```

### Secondary — MEDIUM confidence

- The Vercel/Next deprecation message rendered by this project's own dev server
  (`⚠ The "middleware" file convention is deprecated`) — a first-party runtime signal rather than
  a doc page, cross-checked against the Proxy version-history table.

### Tertiary — LOW confidence / flagged

- Nothing in this document rests on a WebSearch result. Where I could not measure, the claim is
  tagged **ARGUED** or **ASSUMED** in place.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| **A1** | Adding `'user_id', (select auth.uid())` to `my_access_context()` transfers the existing `SECURITY DEFINER` + `search_path = ''` pattern cleanly | § *The shape of the one module*, Option B | A migration that fails to apply, or an `auth.uid()` that resolves under the wrong schema. **Verify against `20260807020000_wrap_auth_uid.sql` before writing** |
| **A2** | The `cache()` behaviour measured under Turbopack dev and `--webpack` production is the same on Vercel's runtime | § *Where `cache()` works* | If Vercel differs, the round-trip budget for actions/routes is wrong. Both local modes agreed, which is reassuring but not the deployment target |
| **A3** | `verifyEventOwnership`'s cookie-client read and `verifyOrganizerAccess`'s service-client read produce the same verdict today | § D-4 | If the `events` SELECT policy is narrower than assumed, consolidating them changes who can manage a guest list. **Check against the phase-32 baseline artefacts, do not assume** |
| **A4** | Replacing the four `artists`/`venues` inline checks with `CATALOGUE_MANAGE` changes only the error text, not which surfaces a role reaches | § D-3 ⚠️ | A `pending` organizer would be refused earlier and differently. Owner-visible behaviour change; must be raised, not decided silently |
| **A5** | `MobileNav` and `StaffNav` may keep taking `role`/`status` through phase 33 | § *Why `role` and `status` stay* | If the owner reads CAP-05 as "role stops existing", the phase scope doubles |
| **A6** | The service worker needs no cache invalidation because no route or response body changes | § *Runtime State Inventory* | A stale cached page could serve a surface whose gate has changed. Re-check if any plan alters rendered output |
| **A7** | `MASTER_EMAIL` is not cheaper to fix here | § F-5 | If the planner finds it is, it is a Critical change and needs its own owner checkpoint |

---

## Open Questions

1. **Does the phase convert the 19 database-sourced predicate sites, or only the 44 header
   readers?**
   *What we know:* criterion 1 names only header derivation; criterion 3 names *"each permission
   check that existed in two divergent copies"* without restricting to headers, and the largest
   genuinely-divergent family (D-4, D-6) is entirely outside the header readers.
   *What's unclear:* scope.
   *Recommendation:* convert both, but in separate waves — headers first (mechanical, parallel,
   44 disjoint files), predicates second (semantic, needs the key-choice judgement of § P-4).
   Doing only the headers satisfies criterion 1 and leaves criterion 3 half-done; doing only the
   predicates satisfies neither. **Raise as an explicit owner checkpoint before wave 1.**

2. **Is WR-04 in or out?**
   *What we know:* the phase edits the exact block WR-04 concerns, and the proposed fix is two
   lines plus a banner.
   *Recommendation:* raise it as an explicit in/out decision. My inclination is **in** — it will
   never be cheaper — but it is scope, and scope is the owner's.

3. **The `user_id` payload migration: Option A or B?**
   *Recommendation:* B, argued above. But it means a migration in a phase that otherwise touches
   no SQL, which changes the phase's risk profile and its verification burden (the baseline pair
   must be re-run). Worth an explicit decision rather than a plan-time default.

4. **`ROADMAP.md` still says phase 34 depends on 33 and phase 35 depends on 34** (`:182`, `:197`),
   while `ACCESS-MODEL-DECISIONS.md` § *Roadmap consequence* says 35 now precedes 34.
   *What's unclear:* whether the ROADMAP is stale or the decision was revised.
   *Recommendation:* not this phase's to fix (I was instructed not to modify ROADMAP), but the
   divergence should be closed by someone before phase 34 is planned. It does not affect phase
   33's ordering — both documents agree 33 comes first.

5. **Does the drink-menu probe surface survive the phase?**
   `(public)/events/[slug]/menu/page.tsx` is the only header reader with neither a middleware
   prefix gate nor an RLS backstop. After conversion its `canManage` will come from
   `getAccessContext()` — correct — but it will still branch a service-client read on a
   TypeScript boolean. That is a legitimate remaining concentration of trust in code, and it is
   worth naming in `33-VERIFICATION.md` even though the phase fixes the part it is asked to fix.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| The census (44 / 97 / 42-2-0 / route groups / use classes) | **HIGH** | Every number from a pasted command against this commit |
| `cache()` execution-context matrix | **HIGH** | Measured, reproduced twice, in both dev and a production build |
| Forged-header behaviour and the probe | **HIGH** | Measured with a positive control; the insensitive first probe is documented rather than hidden |
| The duplicate inventory | **HIGH** for the `diff`-proven pairs (D-1, D-2, D-3); **MEDIUM** for D-4/D-5 equivalence, which is argued from reading, not from a mutated policy |
| Capability-key substitution choices | **MEDIUM** | The mapping is argued from `keys.ts` intent; three keys share a predicate today, so a wrong choice is invisible until phase 35 |
| Conversion sequencing | **MEDIUM** | A judgement from the census and from phase 32's parallelism measurement, not a measurement of its own |
| The `user_id` migration shape | **LOW-MEDIUM** | A1 — the SQL was not written or applied |

**Research date:** 2026-08-07
**Valid until:** 2026-09-06 for the documentation citations; **indefinitely** for the
repository measurements, which carry their own commands and can be re-run. The `cache()` finding
should be re-measured on any Next.js minor upgrade — it is undocumented behaviour, and
undocumented behaviour is the kind that moves.
