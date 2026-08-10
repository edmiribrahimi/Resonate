---
phase: 34-one-work-surface
plan: 13
subsystem: ticketing
tags: [route-collapse, capabilities, money-surface, service-role]
requires:
  - "34-01 (the route map: `/admin/events/[id]/tickets` bound to `organizer.access`)"
  - "34-02 (the redirect row `/organizer/events/[id]/tickets` → `/admin/events/[id]/tickets`)"
  - "34-06 (the `(work)` route group and its layout)"
  - "34-07 (R-WORK-ROUTES, and `tickets/{actions.ts,RefundActions.tsx}` at their surviving path)"
provides:
  - "one `events/[id]/tickets` surface, on `organizer.access`, inside `(work)`"
  - "the ownership branch carried onto the collapsed address, above the service-role read"
  - "a hunk-by-hunk verdict on the phase's largest divergence, and three answered money questions"
affects:
  - "34-15 — one fewer page under `src/app/(organizer)/`"
  - "34-17 — the 307→308 flip and the fifteen-address walk"
tech-stack:
  added: []
  patterns:
    - "a divergence on a money surface resolved towards the more restrictive twin, never towards the fuller one"
key-files:
  created:
    - "src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx"
  modified: []
  deleted:
    - "src/app/(admin)/admin/events/[id]/tickets/page.tsx"
    - "src/app/(organizer)/organizer/events/[id]/tickets/page.tsx"
decisions:
  - "The guard is `organizer.access` because that is the key the route map binds, not because it is the wider of the two"
  - "The `/organizer` twin's ownership branch is kept verbatim in structure — it is the more restrictive behaviour (D-34-06) and the only thing scoping a service-role read of buyer identities"
  - "The narrower of the two service-role projections is taken: `party_id`, `status` and `requested_by` were dead payload in both twins"
  - "The ownership block was NOT restructured into a single read, even though it would save a round trip — collapsing the three arms would delete a distinction this plan has no mandate to delete"
metrics:
  duration: "~50 min"
  completed: 2026-08-10
requirements: [STAFF-01]
---

# Phase 34 Plan 13: Collapse the events/[id]/tickets pair — Summary

The phase's largest divergence — **138 changed lines across 13 hunks**, measured
today — resolved into one file at `/admin/events/[id]/tickets`, on
`organizer.access`, with the refund and tier code proved unchanged by a diff that
contains neither a rename nor a hunk for either module.

**Commit:** `7dd53b5`

---

## The plan's premise was inverted, and it mattered

The plan states the `/admin` twin is *"the larger of the two at ~413 lines, and
it carries the `master.manage` branch"*. Measured 2026-08-10 with `wc -l`:

| File | Lines | Guard | Ownership check |
|---|---|---|---|
| `(admin)/admin/events/[id]/tickets/page.tsx` | **365** | `admin.access` | **none** |
| `(organizer)/organizer/events/[id]/tickets/page.tsx` | **413** | `organizer.access` | `master.manage` short-circuit + `ownsOrIsMaster` |

It is the **organizer** twin that is 48 lines longer and that carries the
ownership branch. That inversion is not a footnote: the plan's own warning —
*"the admin version is genuinely 48 lines longer"*, offered as the temptation to
resist — pointed at the wrong file. Had it been trusted, the collapse would have
taken the `/admin` twin as the fuller one and **dropped the ownership check** on
its way to a wider guard. That is the exact failure the plan exists to prevent,
arriving through the plan's own text.

---

## Every hunk, classified

`diff` output: 187 lines. Changed lines: **138**. Hunks: **13**.
`A` = the `/admin` twin, `B` = the `/organizer` twin.

| # | Range (A/B) | What differs | Class | Verdict, and what decided it |
|---|---|---|---|---|
| 1 | 1-8 / 1-9 | A imports `getServiceClient`; B builds a service client inline from `@supabase/supabase-js`. B additionally imports `ownsOrIsMaster` | **guard** | **A's helper, B's import.** `getServiceClient` (`src/lib/supabase/service.ts:3-8`) is byte-equivalent to B's inline construction — same two variables, same order — so this is not a privilege change but a count of how many places build a service client (`access-gating.md`, gate *service role*). `ownsOrIsMaster` is required by hunk 2 |
| 2a | 19 / 20 | `AdminTicketTiersPage` vs `TicketTiersPage` | cosmetic | B's name. There is one page now; `Admin` in the identifier would describe the folder, not the audience (D-34-02) |
| 2b | 22-26 / 24 | destructured `{capabilities, role, status}` vs a single `ctx` | cosmetic | B's `ctx`, because hunk 2e passes it to `ownsOrIsMaster` |
| 2c | 42 / 32 | **`CAP.ADMIN_ACCESS` vs `CAP.ORGANIZER_ACCESS`** | **guard** | **`organizer.access`** — `capability-routes.ts:257` binds `/admin/events/[id]/tickets` to it, and the middleware reads the same entry (D-34-09). Rows: `('master','organizer.access',false)` and `('organizer','organizer.access',false)`, `20260807000000_capability_model.sql:411-412`. The discarded key is `('master','admin.access',false)`, `:408` — master alone |
| 2d | 28-41 / — | A's 14-line docblock on the service-role read | cosmetic (prose) | Kept and extended. Its claim — *on a service-role path the code is the only boundary* — is more true after the collapse, not less |
| 2e | — / 36-81 | **B's whole ownership branch, 33 lines** | **guard** | **Kept.** `('master','master.manage',false)`, `:396` — master alone — is the short-circuit; every non-master falls to `ownsOrIsMaster`. D-34-06: where the twins diverge, the surface takes the more restrictive of the two, and A's absence of any check is the less restrictive |
| 2f | 47-50 / 26-29 | the `as UserRole` / `as UserStatus` casts, above vs below the guard | cosmetic | Both **deleted**. `admin/(work)/layout.tsx` performs them once for the tree (D-34-07) |
| 3 | 61 / 91 | `redirect("/admin/events")` vs `redirect("/organizer/events")` | **drift (address)** | `/admin/events` — D-34-01. Verdict-identical: the old destination now answers with a redirect to the new one, so only the hop is gone |
| 4 | 80-100 / 110-132 | three comment lines and one blank line | cosmetic | A's spacing; B's comment wording where it says more |
| 5 | 117 / 149 | comment *"Compute usage counts for each discount code"* | cosmetic | Dropped with A; the code below states it |
| 6 | 124 / 157 | comment *"Get tier names for restricted codes"* | cosmetic | Dropped with A |
| 7 | 147 / 181 | comment *"Group discount codes by party"* | cosmetic | Dropped with A |
| 8a | 156 / 191-194 | service client construction | **guard** | A's `getServiceClient()` — see hunk 1 |
| 8b | 159 / 198 | B additionally selects `tickets.party_id` | **drift (projection)** | **A's narrower list.** `party_id` is rendered by neither twin. D-34-06 |
| 8c | 165-172 / 204-211 | B additionally selects `ticket_refunds.status` and `.requested_by`, and types both | **drift (projection)** | **A's narrower list.** Neither is rendered by either twin, and `requested_by` is a person's id crossing a service-role read. The **row set is identical** — same `.in(ticketIds)`, same `.eq("status","pending")`, same order — so this narrows a projection, not a set of refunds |
| 9a | 190-192 / 230-235 | `formatPrice` on one line vs four | cosmetic | A's |
| 9b | 198 / 241 | header `Link href` `/admin/events` vs `/organizer/events` | **drift (address)** | `/admin/events` — D-34-01 |
| 9c | 203 / 246-248 | `<h1>` on one line vs three | cosmetic | A's |
| 9d | 208 / 253 | comment *"(event-level)"* | cosmetic | A's |
| 10 | 276 / 320-322 | empty state: *"No discount codes for this sub-event."* vs *"Nessun codice sconto per questo sub-event."* | cosmetic | **A's English.** The four neighbouring empty states in the same file are English; the Italian line was the outlier, not the standard |
| 11 | 297 / 343 | one blank line before *Pending Refund Requests* | cosmetic | A's |
| 12 | 319 / 365-367 | the refund-reason paragraph on one line vs three | cosmetic | A's |
| 13 | 362 / 410 | `<MobileNav role={role} …>` vs `{navRole}` | cosmetic | Both **deleted** — the layout mounts it (D-34-07) |

**Count:** 4 guard, 4 drift, 13 cosmetic. Not one verdict rests on *"the fuller
version wins"* — and the file that would have won that argument is the one that
had no ownership check.

---

## The three money questions, answered

### 1. Does either version show a refund control the other does not? — **No.**

Both twins mount `RefundActions` in exactly two places, in the same positions:
once per pending refund (`refundId`) and once per sold ticket (`ticketId`,
`isDirectRefund`). No control exists on one and not the other.

**And no audience gains a refund control it did not hold.** The merged surface
guards on `organizer.access`, which is the guard the `/organizer` twin already
carried — an account holding it already reached this identical surface at
`/organizer/events/[id]/tickets`, which now answers with a redirect here. The
address collapsed; the entitlement did not move. **No grant was needed and none
was edited.**

The control is drawn on one key and **executed** on another. `RefundActions.tsx`
calls `approveRefund`, `rejectRefund` and `adminRefund` in
`src/app/(public)/tickets/refund-actions.ts`, and all three re-check
`CAP.STAFF_MANAGE` inside themselves — `:162`, `:409`, `:495`. Rows:
`('master','staff.manage',false)` and `('organizer','staff.manage',false)`,
`20260807000000_capability_model.sql:392-393`. **Not one of those three lines was
read into this plan's diff.** A server action is a public POST with a convenient
signature (`nextjs-architecture.md`), so that re-check — not the page's guard —
is what a refund actually passes, and it is untouched.

Checked, because a fourth role exists: **`staff` holds neither
`organizer.access` nor `staff.manage`.** `20260808000500_staff_role.sql:111-137`
grants it exactly two capabilities — `membership.card.view` and
`membership.active`. No staff account reaches this surface before or after.

### 2. Does either version differ in what it passes to `RefundActions`? — **No.**

Byte-identical props on both mounts: `refundId={refund.id}`, and
`ticketId={ticket.id} isDirectRefund`. Same event scope (`.eq("event_id",
eventId)`), same refund filter (`.eq("status","pending")`), same ordering, same
confirmation flow — the confirmation lives inside `RefundActions.tsx`, which is
one file with one behaviour and was not opened.

The **set** of refunds is identical; only the projection differed, and it
narrowed (hunks 8b, 8c).

### 3. Does either version differ in tier or discount-code handling? — **No.**

`AddTierForm`, `TierCard`, `AddDiscountCodeForm` and `DiscountCodeCard` are
mounted in both twins at the same positions with the same props, including the
per-party `tiers={...}` restriction list on the discount-code forms. The only
difference in that whole region is one empty-state string (hunk 10).

The six actions in `tickets/actions.ts` each resolve `assertStaffManage()` once
and then `assertEventOwnership(...)`, with a service-client branch selected by
`ctx.capabilities.has(CAP.MASTER_MANAGE)` — read to confirm what they are, and
**not edited**. `validateDiscountCode` (`:469`) remains reachable from the public
purchase surface: `src/app/(public)/events/[slug]/TierSelection.tsx:5` still names
`@/app/(admin)/admin/events/[id]/tickets/actions`, unchanged.

**No case required a new grant or a `requires_approved` flip.** Nothing was
widened to make the collapse pass.

---

## The money path, proved unchanged by absence

```
$ git diff -M --cached --stat -- "…/tickets/actions.ts" "…/tickets/RefundActions.tsx"
(no output)
```

Neither a rename nor a hunk. The refund path is not merely unchanged in content —
it is unchanged in the module graph.

The six external importers, none of them in this plan's diff:

```
$ git diff --cached --name-only | grep -E "SalesDashboard|components/tickets/|TierSelection"
(no output)
```

Every importer still names the surviving path — verified by sweep, not assumed:

| Importer | Specifier |
|---|---|
| `src/components/events/SalesDashboard.tsx:30` | `@/app/(admin)/admin/events/[id]/tickets/RefundActions` |
| `src/components/tickets/AddTierForm.tsx:4` | `…/tickets/actions` |
| `src/components/tickets/AddDiscountCodeForm.tsx:4` | `…/tickets/actions` |
| `src/components/tickets/TierCard.tsx:8` | `…/tickets/actions` |
| `src/components/tickets/DiscountCodeCard.tsx:8` | `…/tickets/actions` |
| `src/app/(public)/events/[slug]/TierSelection.tsx:5` | `…/tickets/actions` |

```
$ grep -rn "tickets/actions\|RefundActions" src/ | grep -c "(organizer)"     → 0
$ grep -rn 'from "@/app/(admin)/admin/(work)' src/ | wc -l                   → 0
```

Nothing imports **into** `(work)` from anywhere. R-WORK-ROUTES holds.

---

## What the collapse actually moved, and what now holds it

The `/admin` twin was master-only and read buyer names, buyer emails and pending
refunds through a **service-role client**, which bypasses every row-level policy.
It needed no ownership check because `admin.access` admitted one role.

On `organizer.access` that is no longer true, and the ownership branch is what
scopes those reads to an event the caller may see. Two properties were therefore
treated as load-bearing rather than incidental:

1. **It runs above the service client.** Guard at `:105`, ownership branch at
   `:125-158`, `getServiceClient()` at `:271`. On that path there is no RLS
   behind the code to catch a mistake.
2. **Its three arms were not collapsed.** The `/organizer` twin split *"I could
   not find out"* (logged as `tickets:ownership_lookup_failed` with the error
   code), *"there is no such row"* and *"you may not"* onto separate lines, with
   a paragraph explaining why. Folding the ownership read into the title read
   would have saved a round trip for a non-master and cost that distinction.
   **Not done.** This is a route collapse; deleting a deliberate distinction is
   not in its mandate, and `meta-gates.md` names collapsing distinguishable
   causes as the recorded newsletter defect.

Stated plainly, since it cannot be tested here: the log line reaches no human.
This project has **no error tracking**. The observable effect of a failed
ownership lookup is the redirect, and that is the honest claim.

---

## Deviations from Plan

### 1. [Rule 3 — Blocking] The build cannot be green in this worktree, and the reason is a sibling's file

**Found during:** Task 2, at its `<verify>` gate.

**Issue:** `rm -rf .next && npm run build` fails with a `typedRoutes` error that
is **not in this plan's files**:

```
./src/components/events/EventList.tsx:183:15
Type error: Type '`/admin/events/${string}/tickets` | `/organizer/events/${string}/tickets`'
  is not assignable to type 'UrlObject | RouteImpl<…>'.
```

Deleting `/organizer/events/[id]/tickets` removes it from the route union, so
`EventList`'s `basePath` prop — typed `"/organizer/events" | "/admin/events"`
with a `/organizer/events` **default** — no longer type-checks. The file says so
itself at `EventList.tsx:33-35`: *"The `/organizer/events` default survives this
task deliberately: deleting it belongs to plan 34-11, and doing it here would
touch a file that plan rewrites."* `34-11-PLAN.md:13` lists it in
`files_modified`, and `:223-224` makes its removal that plan's acceptance
criterion.

**`EventList.tsx` was therefore not edited.** It is a sibling plan's file in this
same wave, in a worktree this plan cannot see.

**What was done instead — a controlled, reverted experiment**, following the
repository's proof-by-mutation discipline (assert the mutation applied *before*
reading the result):

1. Backed the file up, then narrowed `basePath` to `"/admin/events"` and changed
   its default to match — the shape plan 34-11 declares.
2. **Asserted the mutation landed:** `grep -n` returned `37:  basePath?:
   "/admin/events";` and `43:  basePath = "/admin/events",`.
3. `rm -rf .next && npm run build` → **exit 0**, `✓ Compiled successfully`, and
   the route manifest lists `ƒ /admin/events/[id]/tickets` with no
   `/organizer/events/[id]/tickets`.
4. `git checkout -- src/components/events/EventList.tsx`, then `diff` against the
   backup → **identical**. The file is absent from this plan's commit.

**What that proves and what it does not.** It proves the merged page and the
deletion are type-clean, and that the only obstacle is a change a sibling owns
and is making now. It does **not** prove the wave's merged tree builds — that is
an integration gate, and it belongs to whoever merges the wave, then to plan
34-17. Saying otherwise would be claiming a green somebody else has to earn.

### 2. [Measurement correction] The plan's line counts and guard attribution are inverted

Recorded above in full. The `/admin` twin is 365 lines with no ownership check;
the `/organizer` twin is 413 with one. `34-13-PLAN.md:89` and `:121` both say the
opposite, and `:121` frames the wrong file as the tempting one.

### 3. [Artifact, not a finding] Git paired the rename with the organizer twin

`git diff -M --cached --name-status` reports:

```
R063  src/app/(organizer)/organizer/events/[id]/tickets/page.tsx → src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx
D     src/app/(admin)/admin/events/[id]/tickets/page.tsx
```

The `git mv` was performed on the `/admin` twin, as the plan directs. Rename
detection then re-paired it at 63% similarity with the `/organizer` twin, because
the merged file keeps that twin's ownership branch. The net is what matters and
is unambiguous: **both prior paths are gone, one file exists at the collapsed
address.**

---

## Findings

| ID | Finding |
|---|---|
| **F-13-1** | This pair has **no master-only control**. The plan's must-have *"the master-only ticket controls are drawn on `master.manage`, not on a role string"* is satisfied without one existing: `master.manage` appears only as the ownership short-circuit, asked as `capabilities.has(CAP.MASTER_MANAGE)`. `grep -c 'role === "master"'` returns **0**, as it did in both twins. No control was invented to fill the sentence |
| **F-13-2** | `src/app/(admin)/admin/events/[id]/guest-list/actions.ts:43` carries a **stale prose citation** naming `organizer/events/[id]/tickets/actions.ts`, a path that has not existed since plan 34-07. It is a comment, not an import, and the file belongs to another plan. Not edited — recorded for the phase's sweep |
| **F-13-3** | The 307 at the old address is emitted **before** `updateSession`, and this was observed rather than assumed: with no Supabase credentials in the worktree, `/organizer/events/abc/tickets` still answered `307 → /admin/events/abc/tickets` while `/admin/events/abc/tickets` returned 500 from `middleware.ts:211`. Address translation carries no subject, exactly as `src/middleware.ts:51-71` declares |

---

## Verification

| Gate | Result |
|---|---|
| `find "src/app/(admin)" -path '*events/[id]/tickets/page.tsx'` | **one path** — `…/admin/(work)/events/[id]/tickets/page.tsx` |
| `src/app/(organizer)/organizer/events/[id]/tickets/` | **gone** (directory removed) |
| merged page guards on `ORGANIZER_ACCESS` | `grep -c ORGANIZER_ACCESS` → **1** |
| `grep -c 'role === "master"'` in the merged page | **0** |
| `grep -c "StaffNav\|MobileNav\|as UserRole\|as UserStatus"` in the merged page | **2 — both `*` docblock lines**, at `:82-83`, naming what was removed. No mount, no cast. Same treatment as the already-merged `(work)/events/[id]/assignments/page.tsx:83-85` |
| `git diff -M --cached --stat` on `actions.ts` and `RefundActions.tsx` | **empty** — no rename, no hunk |
| six external importers in the diff | **none** |
| `grep -rn "tickets/actions\|RefundActions" src/` under `(organizer)` | **0** |
| anything importing into `(work)` | **0** |
| `rm -rf .next && npm run build` | **fails in isolation** on `EventList.tsx` (plan 34-11's file); **exit 0** with that plan's declared change simulated and reverted — see Deviation 1 |
| `curl -sI http://localhost:3113/organizer/events/abc/tickets` | **`307 Temporary Redirect`, `location: /admin/events/abc/tickets`** — 307 is correct while the phase is in flight (D-34-15); the 308 flip is plan 34-17's |
| `/admin/scanner` | **absent from the commit** — no rule here matches it or points at it |
| STATE.md / ROADMAP.md | **untouched** |

**Not claimed: that a refund works, or that a discount code still applies.**
There is no test runner for this product, and no purchase or refund was executed.
What is claimed is narrower and provable: **not one line of the refund, tier or
discount-code path changed**, and the diff is the proof. The behavioural check is
a real refund against a real SumUp transaction, and it belongs to the phase's
written manual procedures.

**Not claimed: that the wave builds.** See Deviation 1.

---

## Known Stubs

None. No placeholder, no TODO, no hardcoded empty value. Every value rendered by
the merged page comes from the same query the twin it replaced used.

---

## Threat Flags

None. No network endpoint, no auth path, no file-access pattern and no schema
change was created. The one trust boundary that moved is an **address**:
`/admin/events/[id]/tickets` is now reachable by `organizer.access` rather than
`admin.access` — and the same surface was already reachable by that same key at
the address that now redirects to it. The service-role read behind it gained a
scope it did not have at that address, in the form of the ownership branch, and
lost three columns it never rendered.

Register dispositions, all met: T-34-62 (no rename, no hunk on the money
modules), T-34-62b (the six importers absent from the diff), T-34-63 (no refund
control drawn for a new audience; the executing grant is `staff.manage`,
untouched), T-34-64 (`capabilities.has(CAP.MASTER_MANAGE)`, no role string),
T-34-65 (`validateDiscountCode` still imported by the public purchase surface),
T-34-66 (a line per hunk, not a paragraph), T-34-SC (no package installed).

---

## Self-Check: PASSED

```
FOUND: src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx
FOUND: src/app/(admin)/admin/events/[id]/tickets/actions.ts        (unmoved, unedited)
FOUND: src/app/(admin)/admin/events/[id]/tickets/RefundActions.tsx (unmoved, unedited)
GONE:  src/app/(admin)/admin/events/[id]/tickets/page.tsx
GONE:  src/app/(organizer)/organizer/events/[id]/tickets/page.tsx
FOUND: commit 7dd53b5
```

`must_haves.artifacts`: the single tickets surface contains `ORGANIZER_ACCESS` —
present at `:105`. `must_haves.key_links`: the merged page reaches
`RefundActions` through an absolute specifier matching
`admin/events/\[id\]/tickets/RefundActions` — present at `:12`, pointing outside
`(work)`, with the refund path unchanged.
