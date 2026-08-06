# 32 — B4 rebuilt: every server-side permission decision in application code, after the phase

**Written against the merged phase-32 branch, at `--phase-point=final`**
**Date:** 2026-08-06
**Requirement:** CAP-03
**Status:** POST-PHASE RECORD. The counterpart photograph. Rebuilt from the code,
not edited from `32-BASELINE-surfaces.md`.

**The rule this document is judged by**, quoted from its own predecessor
(`baseline/32-BASELINE-surfaces.md`, § *How this artefact is used*):

> The **call site** column may change. […] The **predicate** column may **not**.
> It must read **character-identical**, or the new predicate must be shown to be
> exactly equivalent to the old one, in writing, with the account states that
> distinguish them enumerated.
> […] The three entries in Section 7 must **still be three**.

**The verdict, up front.**

```
rows in the register                                     34
rows whose predicate is character-identical              29
rows converted, with a written equivalence                5
rows whose predicate moved WITHOUT an equivalence         0
files carrying a converted row                            2
inconsistencies in section 7, before / after            3 / 3
```

The **five** converted rows live in **two** files: the four middleware prefix
rules (`src/lib/supabase/middleware.ts`) and one guard-helper site
(`src/app/(admin)/admin/newsletter/actions.ts`). Nothing else in this register
changed its predicate, and the line numbers that moved did so because those two
files grew, not because a decision moved with them.

---

## Section 1 — The four middleware prefix rules — **CONVERTED**

`src/lib/supabase/middleware.ts`, inside the `else` branch at `:152` that runs
only when a user is authenticated.

| # | Prefix | OLD rule / predicate | OLD predicate, exactly | NEW rule / predicate | NEW predicate, exactly | Action on failure |
|---|---|---|---|---|---|---|
| 1 | `/admin/scanner` | `:82` / `:83` | `role !== "master" && role !== "organizer"` | `:167` / `:168` | `!capabilities.has(CAP.DOOR_OPERATE)` | `bounceToDashboard()` (`:169`) |
| 2 | `/admin` (all except scanner) | `:90` / `:91` | `role !== "master"` | `:173` / `:174` | `!capabilities.has(CAP.ADMIN_ACCESS)` | `bounceToDashboard()` (`:175`) |
| 3 | `/organizer` | `:99` / `:100` | `role !== "master" && role !== "organizer"` | `:180` / `:181` | `!capabilities.has(CAP.ORGANIZER_ACCESS)` | `bounceToDashboard()` (`:182`) |
| 4 | `/membership-card` **or** `/attendance` | `:108` / `:112` | `status !== "approved"` | `:189-192` / `:193` | `!capabilities.has(CAP.MEMBERSHIP_CARD_VIEW)` | `bounceToDashboard()` (`:194`) |

### The equivalence, one sentence per row, with the grant that makes it true

The grants are `supabase/migrations/20260807000000_capability_model.sql:390-423`.
An equivalence claim here is not an argument: it is the mapping from a role/status
comparison to a grant row, and the eleven-persona table in `32-08-SUMMARY.md`
(40 comparable cells, 0 mismatches, measured on a throwaway container) is the
measurement that closes it.

| # | Capability | Granted to | `requires_approved` | Grant at | Equivalent because |
|---|---|---|---|---|---|
| 1 | `door.operate` | `master`, `organizer` | **false**, both rows | `:416-417` | with `requires_approved = false` on both rows the check is role membership alone — which is `role !== "master" && role !== "organizer"` inverted, for every status |
| 2 | `admin.access` | `master` | false | `:408` | one role, status ignored — `role !== "master"` inverted, for every status |
| 3 | `organizer.access` | `master`, `organizer` | false, both rows | `:411-412` | role alone, both rows, status ignored |
| 4 | `membership.card.view` | `master`, `organizer`, **`member`** | **true**, all three | `:420-422` | granted to **all three** roles with approval required, which *is* `status = 'approved'` for any role. This is the only non-obvious row, and it holds **only** because no role is left out — had one been, the rule would have silently narrowed for that role |

**Row 1 carries the phase's most dangerous mapping**, and it is written into the
migration as a comment beside the two rows
(`supabase/migrations/20260807000000_capability_model.sql:414-415`: *"These two
rows must not become true"*). A `requires_approved = true` there locks a pending
organizer out of `/admin/scanner` — the refusal that happens in front of a queue.

### The ordering is still load-bearing, and it is still not a lookup table

`/admin/scanner` at `:167` is tested **before** the general `/admin` branch at
`:173`, and the two are still an `if` / `else if` pair (`:172` is the comment,
`:173` opens with `else if`). Rules 3 (`:180`) and 4 (`:189`) are still
**separate `if` statements**, so a request that fell through the `/admin` pair is
still tested against both.

Both facts survive, and the reason they are not a lookup table is written into
the source at `:155-162`. `32-08-SUMMARY.md` proves the ordering is load-bearing
by mutation rather than by assertion: mapping `/admin/scanner` to `admin.access`
produced **3 differing cells** — every organizer, at the door.

### Two behaviours the rules table hides

**(a) The `?? "member"` / `?? "pending"` defaults — PRESERVED, moved.**
Old `src/lib/supabase/middleware.ts:55-56`, new `:109-110`:

```ts
    role = context?.role ?? "member";
    status = context?.status ?? "pending";
```

Character-identical on the right-hand side; only the source of `context` changed.
An authenticated user with **no profile row** is still a pending member. B4
required that the capability equivalence be *demonstrated* and not assumed: it is
the `authenticated/no-profile` row of the 40-cell table — four rules, four
agreements, measured against a uuid asserted absent from `public.profiles`. The
payload returns `role: null, status: null, capabilities: []`, and the empty
capability set fails all four rules exactly as `member`/`pending` did.

**(b) The discarded query error — DELIBERATELY NOT PRESERVED, and the verdict is
unchanged.** Old `:49` destructured `const { data: profile } = await supabase`
and dropped `error`. New `:84` reads `const { data, error } = await supabase.rpc("my_access_context");`
and `:86-97` sets `capabilitiesResolveFailed` and logs a categorised line.

This is the one place in this register where the code deliberately does not read
identically, and it is recorded as such rather than smoothed over:

- the **defaults** are preserved (`:109-110`), so **every verdict is the one it was** — which is what CAP-03 governs;
- the **silence** is gone, which CAP-03 does not govern and `meta-gates.md` § *zero fallimenti silenziosi* requires;
- the new signal is `x-capabilities-resolve-failed` (`src/lib/supabase/middleware.ts:21`), set on the four bounces **and** on the final response, plus one `[capabilities.resolve_failed]` log line.

**It narrows nothing and widens nothing.** The honest limit, restated from
`32-08-SUMMARY.md`: nobody is watching for the header or the log. They make the
failure diagnosable in seconds instead of hours; they do not make it *noticed*.
Closing that gap needs error tracking, which this project does not have.

---

## Section 2 — The header-injection block — OUT OF SCOPE, one line added

Old `src/lib/supabase/middleware.ts:120-139`, new `:199-223`. Still not a
permission decision; still the transport by which `role` and `status` reach the
files that read them.

The unconditional delete, old `:131-133`, new `:210-212` — **character-identical**:

```ts
  requestHeaders.delete("x-user-role");
  requestHeaders.delete("x-user-status");
  requestHeaders.delete("x-user-id");
```

The conditional set, old `:135-139`, new `:219-223` — **character-identical**:

```ts
  if (user) {
    requestHeaders.set("x-user-role", role ?? "member");
    requestHeaders.set("x-user-status", status ?? "pending");
    requestHeaders.set("x-user-id", user.id);
  }
```

**One line was added inside the block**, at `:217`:

```ts
  requestHeaders.delete(CAPABILITY_DIAGNOSTIC_HEADER);
```

It deletes the **inbound** copy of the diagnostic header for the same reason the
three above are deleted, written at `:213-216`: an inbound header is
attacker-supplied input, and a client that could assert *"the capability lookup
failed"* to a downstream reader would be handing it a forged excuse. It is not a
permission decision and it does not touch the `x-user-*` transport.

**Scope statement, unchanged.** Replacing the `x-user-*` transport is CAP-05,
phase 33. This phase did not touch it: the block still needs `role` and `status`
as values, and `:75-77` records why in the source.

---

## Section 3 — The four door routes — **UNCHANGED, character for character**

None of the four was converted. Every line number below is the line number B4
recorded, re-read from the post-phase code.

| Route | Guard declared at | Predicate line | Predicate, exactly as written | Failure mode |
|---|---|---|---|---|
| `src/app/api/tickets/checkin/route.ts` | `:131` | `:148` | `!profile \|\| (profile.role !== "master" && profile.role !== "organizer")` | `{ error: "Forbidden", status: 403 }` |
| `src/app/api/tickets/checkin/undo/route.ts` | `:32` | `:49` | `!profile \|\| (profile.role !== "master" && profile.role !== "organizer")` | `{ error: "Forbidden", status: 403 }` |
| `src/app/api/membership/verify/route.ts` | inline in `POST`, `:83` | `:102-105` | `!userProfile \|\| (userProfile.role !== "master" && userProfile.role !== "organizer")` | `{ valid: false, status: "forbidden" }`, HTTP 403 |
| `src/app/api/tickets/attendance/route.ts` | `:11` | `:28` | `!profile \|\| (profile.role !== "master" && profile.role !== "organizer")` | `{ error: "Forbidden", status: 403 }` |

**All four still check role alone.** None reads `status` into its decision. The
owner decision recorded at `src/app/api/tickets/checkin/route.ts:110-130` —
*"Role decides the door. Status does not."* — is intact, and it is the reason
`door.operate` is granted with `requires_approved = false`.

The stale doc-comment line at `undo/route.ts:26` is still stale and still not
corrected, for the reason B4 gave: correcting prose inside a constant-behaviour
phase is still a diff on a door file.

---

## Section 4 — `NAV_ITEMS` — **UNCHANGED, character for character**

`src/lib/rbac/roles.ts:36-82`. Five entries, four flags each, all at the line
numbers B4 recorded. Not converted (D-29).

| # | `href` | `roles` | `requireApproved` | `requireAuth` | `hideWhenAuth` | Lines |
|---|---|---|---|---|---|---|
| 1 | `/` | `null` | `false` | `false` | `true` | `:37-45` |
| 2 | `/events` | `null` | `false` | `false` | `false` | `:46-54` |
| 3 | `/gallery` | `null` | `true` | `false` | `false` | `:55-63` |
| 4 | `/admin/scanner` | `["master", "organizer"]` | `true` | `true` | `false` | `:64-72` |
| 5 | `/dashboard` | `null` | `false` | `false` | `false` | `:73-81` |

The filter `getVisibleNavItems` (`:94-129`) still evaluates its four tests in the
same order, at `:103`, `:108`, `:114-115`, `:121-122`.

`git diff` across the whole phase returns **zero lines** for this file.

---

## Section 5 — The five guard-helper families — **one site converted**

| Family | Every site | Predicate, exactly as written | Failure mode | Reads |
|---|---|---|---|---|
| `verifyOrganizer` | `src/app/(organizer)/organizer/events/actions.ts:25` (predicate `:47`)<br>`src/app/(organizer)/organizer/events/[id]/tickets/actions.ts:20` (predicate `:42`) | `profile.role !== "organizer" && profile.role !== "master"` | `throw new Error("Forbidden: …")` | session |
| `verifyOrganizerAccess` | `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:14` (predicate `:19`) | `role !== "organizer" && role !== "master"` | `throw new Error(…)` | **header** |
| `verifyOrganizerRole` | `src/app/api/tickets/attendance/route.ts:11` (`:28`)<br>`src/app/api/tickets/checkin/route.ts:131` (`:148`)<br>`src/app/api/tickets/checkin/undo/route.ts:32` (`:49`) | `!profile \|\| (profile.role !== "master" && profile.role !== "organizer")` | `{ error: "Forbidden", status: 403 }` | session |
| `requireMaster` | `src/app/(admin)/admin/finance/actions.ts:9` (predicate `:12`) — **UNCHANGED**<br>`src/app/(admin)/admin/newsletter/actions.ts:56` (predicate `:57`) — **CONVERTED** | finance: `role !== "master"`<br>newsletter: `!(await hasCapability(CAP.ADMIN_ACCESS))` | `redirect("/dashboard")` | finance: **header**<br>newsletter: **session, via the RPC** |
| `verifyMaster` / `verifyAdminOrOrganizer` | `src/app/(admin)/admin/members/actions.ts:45` (predicate `:65`)<br>`src/app/(admin)/admin/members/actions.ts:73` (predicate `:93`) | `profile.role !== "master"` / `profile.role !== "master" && profile.role !== "organizer"` | `throw new Error("Forbidden: …")` | session |

**The sixth site with no family** (`src/app/api/membership/verify/route.ts:83-110`)
and **the seventh, `validateMediaUpload`** (`src/app/(public)/events/[slug]/actions.ts:14`,
predicates `:36`, `:40`, `:52`) are both unchanged, at the same lines, with the
same text. Staff still bypass both the status and the attendance check; a member
still needs `approved` **and** an `attendance` row.

### The one converted site, and its equivalence

Old `src/app/(admin)/admin/newsletter/actions.ts:15` (predicate `:18`):
read `x-user-role` from the header and refused on `role !== "master"`.
New `:56` (predicate `:57`): `if (!(await hasCapability(CAP.ADMIN_ACCESS)))`.

`admin.access` is granted to `master` and to nobody else, with
`requires_approved = false` (`supabase/migrations/20260807000000_capability_model.sql:408`)
— which is `role !== "master"` inverted, for every real subject. A `master` of
any status holds it; an `organizer` or a `member` of any status does not.

**This conversion narrows nothing, and it is not a security fix.** The middleware
already deletes every inbound `x-user-*` header and re-sets them from the session
(`src/lib/supabase/middleware.ts:210-212`, `:219-223`), so the header was not
forgeable here either. What changed is a dependency, and its cost is stated in
the source at `:40-49`: one extra database round trip per render of this surface,
paid deliberately on a low-traffic admin surface so that *"one definition, three
callers"* is an observation rather than a claim.

**Its byte-identical twin next door is deliberately NOT converted.**
`src/app/(admin)/admin/finance/actions.ts:9-13` still reads the header and still
compares `role !== "master"`. It is a money surface (D-13), and phase 33 owns it.

---

## Section 6 — The census, re-run

Commands are macOS/BSD (`CLAUDE.md` Guardrail 6), run from the repository root
against the merged phase-32 branch.

| # | Command | B4 pre-registered | B4 observed | **Now** | Verdict |
|---|---|---|---|---|---|
| 1 | `grep -rl 'x-user-' src \| wc -l` | 46 | 46 | **46** | unchanged — see below |
| 1b | `grep -rlE '\.get\("x-user-' src \| wc -l` | — | 45 (at `cb35ffc`) | **44** | **−1, the one converted guard** |
| 2a | `grep -rn 'select("role"' src \| wc -l` | 21 | 17 | **17** | unchanged |
| 2b | `grep -rn 'select("role' src \| wc -l` | 21 | 21 | **21** | unchanged |
| 3 | `grep -rl 'getServiceClient' src \| wc -l` | 29 | 29 | **29** | unchanged |
| 4 | `grep -rn 'redirect("/dashboard")' src \| wc -l` | 32 | 32 | **32** | unchanged |

### Count 1 is 46, not 45, and the plan's 45 is reachable by neither command

`32-11-PLAN.md` task 1 states that *"files reading `x-user-` must be **45**, down
from 46 by exactly one"*. **Measured: the loose census reads 46 and the reader
census reads 44.** Neither command produces 45 at this commit, and the two series
are not the same series:

| Point | loose (`grep -rl 'x-user-'`) | reader (`grep -rlE '\.get\("x-user-'`) |
|---|---|---|
| `3f2ce4d` — B4 written | **46** (pre-registered) | — |
| `cb35ffc` — after wave 5 | **47** — `src/types/database.ts` *names* the header in a doc comment and reads nothing | **45** |
| now — after wave 8 | **46** | **44** |

The loose census is unchanged at 46 by a **coincidence of two offsetting
changes**: wave 5 added a mention (+1) and plan 32-08 converted a reader (−1).
The reader census fell by exactly one, which is the number that answers the
question the census was asked. The plan's `45` mixes the loose pre-registration
with the reader series' decrement.

**This is a defect in the plan's arithmetic, not in the code** — the same shape
as D-32-D (43 that should read 45) and D-32-J (the class-D occurrence count).
Recorded as **D-32-N**.

### The coverage boundary, and the number B4 told us to watch

```
grep -rnE '(role|status) (!==|===) "' src | wc -l   →  177   (B4: 178)
grep -rlE '(role|status) (!==|===) "' src | wc -l   →   77   (B4:  78)
```

B4 § 6: *"Re-run both commands after the phase. If 178 moves, something outside
this register changed and must be accounted for."* It moved by **one**, and it is
accounted for exactly, from `32-08-SUMMARY.md`:

| | lines |
|---|---|
| removed by the phase, in the three touched files | **−5** — newsletter `:18`, middleware `:83`, `:91`, `:100`, `:112`. All five are real permission decisions, all replaced by capability questions |
| added by the phase | **+4** — and **none is a decision**: two are prose quoting the old predicate (which B4 *requires* for an equivalence claim), two are `typeof … === "string"` type narrowings the regex cannot distinguish from a role comparison |
| net | 178 − 5 + 4 = **177** ✓ |

And the check that matters — the same census restricted to files the phase did
**not** touch: **173 before, 173 after**. Nothing outside this register moved.

---

## Section 7 — The three inconsistencies: **still three, each re-observed**

Not restated from B4 — re-measured at `--phase-point=final`.

### 1. Two definitions of "organizer" — **STILL LIVE**

The phase reproduced the disagreement as **two keys** rather than resolving it:
`staff.manage` (`requires_approved = false`, 34 policies) and `catalogue.manage`
(`requires_approved = true`, 4 policies).

Fresh observation, read out of `baseline/32-BASELINE-writes.container.final.json`
— eleven personas, every probe rolled back, every cell `conclusive_for_rls: true`:

```
organizer/pending   ticket_tiers  insert -> ok:1
organizer/pending   venues        insert -> 42501
organizer/pending   artists       insert -> 42501
organizer/approved  ticket_tiers  insert -> ok:1
organizer/approved  venues        insert -> ok:1
member/approved     venues        insert -> 42501
master/pending      ticket_tiers  insert -> ok:1
master/pending      venues        insert -> 42501
```

**`ok:1` ≠ `42501` for `organizer/pending`.** A pending organizer can still
create a ticket tier and still cannot create a venue. Had the two agreed, the
shapes had been collapsed — which `32-07-SUMMARY.md` proved by mutation is a
defect **only the container can catch**: B1 accepts a collapsed mapping as a
legal T2, and all 16 cells that catch it belong to personas production does not
have.

### 2. Navigation and route disagree on `/admin/scanner` — **STILL LIVE**

- `src/lib/rbac/roles.ts:64-72` — `roles: ["master", "organizer"]` **and** `requireApproved: true`
- `src/lib/supabase/middleware.ts:167-171` — asks `CAP.DOOR_OPERATE`, whose two grant rows are `requires_approved = false` (`supabase/migrations/20260807000000_capability_model.sql:416-417`)

**A pending organizer still sees no link to a route that would still admit them.**
The phase moved the route side from a role comparison to a capability lookup and
kept the verdict — `32-08-SUMMARY.md`'s `organizer/pending` × `/admin/scanner`
cell reads **PASS** on both sides — so the disagreement is intact rather than
resolved.

### 3. The login redirect parameter is dead — **STILL LIVE**

- `src/lib/supabase/middleware.ts:149` — `url.searchParams.set("redirect", pathname);`
- `src/app/(auth)/login/page.tsx:11` — `const nextUrl = searchParams.get("next") || "";`

The two still never meet. The line number moved from `:75` to `:149` because the
file grew; the string is character-identical. Raised to the owner as its own
item, and still not fixed — it changes navigation, not access, and fixing it
inside a constant-behaviour phase would put a behaviour change inside the one
diff that must contain none.

---

## How the two registers compare, row by row

| Section | Rows | Predicate character-identical | Converted, equivalence written | Moved without explanation |
|---|---|---|---|---|
| 1 — middleware rules | 4 | 0 | **4** | 0 |
| 2 — header injection (out of scope) | 2 | 2 | 0 | 0 |
| 3 — door routes | 4 | 4 | 0 | 0 |
| 4 — `NAV_ITEMS` + filter | 9 | 9 | 0 | 0 |
| 5 — guard families + the two unnamed | 12 | 11 | **1** | 0 |
| 7 — the three inconsistencies | 3 | 3 | 0 | 0 |
| **total** | **34** | **29** | **5** | **0** |

**Two files carry all five converted rows.** Every other line number in this
register is the line number B4 recorded, and every other predicate is the string
B4 recorded, character for character.

---

## What this register still cannot tell you

Unchanged from B4, and worth repeating at the gate rather than assuming it
carried:

- **It covers the guards that refuse server-side, not every file that mentions a role.** 177 role-or-status comparisons live in 77 files; this register reads 21 of them line by line. The remainder are overwhelmingly presentational — and *"overwhelmingly"* is not *"entirely"*.
- **The middleware is UX.** Everything in Sections 1, 4 and 5 decides where a person may *go*. What they may *read* is the row-level policies, and that is B1, B2 and B3's subject, not this document's.
- **There is no test runner** (`CLAUDE.md` Guardrail 1). This register is a reading of the source by a human process, checked against a container measurement. If it is wrong, nothing downstream can tell.
