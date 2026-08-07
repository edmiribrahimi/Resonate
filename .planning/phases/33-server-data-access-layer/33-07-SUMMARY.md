---
phase: 33-server-data-access-layer
plan: 07
subsystem: access-gating
tags: [capabilities, dal, organizer, query-scope, polarity]
requires:
  - "33-01 (getAccessContext().userId, CAP keys)"
provides:
  - "the (organizer) top level decides reachability from the session"
  - "the event-list scope expressed as a deny-list (!MASTER_MANAGE)"
  - "the prop-boundary cast convention for role/status (phase 34 removes it)"
affects:
  - "phase 34 STAFF-03 (owns MobileNav / StaffNav and the navRole/navStatus casts)"
  - "plan 33-14 (phase gate; this plan lowers the meter by 12)"
  - "plan 33-05 (shares MemberTable, whose signature this plan deliberately did NOT change)"
tech-stack:
  added: []
  patterns:
    - "capability key chosen by the QUESTION, never by the predicate that matches today"
    - "query scope as a deny-list, so a future role inherits the narrow set"
    - "identity narrowed by an explicit refusal, never by `?? \"\"`"
key-files:
  created: []
  modified:
    - src/app/(organizer)/organizer/artists/page.tsx
    - src/app/(organizer)/organizer/venues/page.tsx
    - src/app/(organizer)/organizer/members/page.tsx
    - src/app/(organizer)/organizer/events/new/page.tsx
    - src/app/(organizer)/organizer/events/page.tsx
decisions:
  - "D-33-07-A: the event-list scope is `!MASTER_MANAGE` (deny-list), not `is organizer` (allow-list) — same truth table for three roles, safe default for the fourth"
  - "D-33-07-B: `currentUserId` uses `userId ?? \"\"` — behaviour-identical, and widening the prop would edit MemberTable.tsx, which plan 33-05 shares"
  - "D-33-07-C: guards.ts is deliberately NOT imported — there is no fetched row to own; the filter runs before the read"
  - "D-33-07-D: MEASURED — the `.eq()` value argument is unchecked in this repo, so the `userId` narrowing is a runtime guard the build cannot enforce"
metrics:
  duration: "~35 min"
  completed: 2026-08-07
  tasks: 2
  commits: 2
requirements: [CAP-05]
---

# Phase 33 Plan 07: The Organizer Top Level Summary

The five top-level `(organizer)` pages now decide reachability from the session
instead of from a header the client can send, and the event list's query scope —
the one line here that was never a refusal but a *scope* — is rewritten as a
deny-list so the role arriving in phase 34 lands on the narrow side by default.

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | the four pages with no query-narrowing identity use | `e0f7022` | `artists/page.tsx`, `venues/page.tsx`, `events/new/page.tsx`, `members/page.tsx` |
| 2 | the event list, where the header narrowed a query | `417648d` | `events/page.tsx` |

### The census delta

| | meter total | of which in these five files |
|---|---|---|
| base `0521203` | 102 lines (97 code, 5 comment-shaped) | **12** |
| after `417648d` | **90 lines** (85 code, 5 comment-shaped) | **0** |

**This plan removed 12 meter hits**, and the total fell by exactly 12 — no line
moved sideways into another file. `npm run verify:no-header-identity` still
exits 1, by design, until plan 33-14. Lowering the number was the job; making it
green was not.

## The decisions, and the question each one answers

**`ORGANIZER_ACCESS` on all five gates.** The question is *"may this person
reach the organizer area"* (`keys.ts:64`) — the same one
`middleware.ts:180-184` already asks for `/organizer/*`.

- **Not `STAFF_MANAGE`**, which asks *"may they manage the staff surfaces"* —
  sixteen tables, a different question that happens to share a predicate today.
- **Not `CATALOGUE_MANAGE`** on `artists` and `venues`, the tempting near-match
  on two catalogue pages. It carries `requires_approved = true`, so it would
  refuse a `pending` organizer who reaches those listings today. That is a
  verdict change, which criterion 4 forbids. The distinction is the project's
  own: `member` is not `approved`, and role and status are two different axes.
- **Never a role list.** An allow-list of three would have to be found again to
  admit `staff`.

**The polarity flip on the event list (D-33-07-A).** Before, an allow-list of
one narrowed the query. After:

```ts
if (!capabilities.has(CAP.MASTER_MANAGE)) {
  query.eq("created_by", userId);
}
```

The truth table for the three roles that exist today is identical — that is what
criterion 4 requires. What changes is the fourth. `staff` arrives one phase
later and grants no work permission; under the old allow-list it would fail the
organizer equality, **skip the filter entirely, and see every organizer's
events**. Under the deny-list it inherits the narrow scope and sees its own,
which is none. The safe default costs nothing today and does not depend on
anyone remembering this file tomorrow.

`MASTER_MANAGE` is chosen because the question is *"may this person manage
events they do not own"* — the reserved-operation question `keys.ts:55` names —
not `ADMIN_ACCESS`, *"may they reach the admin area"*, which this page is not in.
Both are granted to the same role today; they are not the same question.

**`guards.ts` is deliberately not imported (D-33-07-C), and that is not an
omission.** `ownsOrIsMaster(ctx, createdBy)` decides ownership of **a row the
caller has already fetched**. On this page there is no row yet: the decision
runs *before* the read, to choose what to ask for. There is no ownership check
anywhere in these five files to hand-transcribe, correctly or otherwise. The
ten sites `guards.ts` was written for are the per-event pages, which plans 33-08
and 33-09 own.

**`currentUserId`, the finding the plan asked for (D-33-07-B).** `?? ""`, and
the reason was read rather than guessed. The prop is consumed at exactly one
place — `MemberTable.tsx:173`, `member.id === currentUserId` — where a **match
suppresses** the action cell on the viewer's own row. So a null-versus-null
match would refuse *more*, never admit more; and it cannot occur at all, because
`member.id` is a non-null `profiles` primary key (`MemberTable.tsx:16`) that
equals neither `""` nor `null`. The two are behaviour-identical.

The widened prop was **not** written, and that is a scope decision as much as a
correctness one: `MemberTable` is shared with `admin/members/page.tsx`, which
plan 33-05 converts in a parallel worktree. Changing its signature from here
would edit a file this plan does not own and would collide with 33-05's work.
Worth comparing notes afterwards — 33-05 faces the identical prop.

**`role` / `status` still flow to the navigation, and the navigation was not
redesigned.** `MobileNav` and `StaffNav` are `"use client"` and cannot import
the DAL. The source changed; the consumer did not. `getAccessContext()` types
both `string | null` on purpose so that nothing branches on them, so the pages
cast once at the prop boundary into named locals:

```ts
const navRole = role as UserRole | null;
const navStatus = status as UserStatus | null;
```

No precedent existed — `grep -rln 'getAccessContext' src/app src/components`
returned nothing at the base commit, so these five pages set the convention that
the other wave-2 plans will meet. Phase 34 (STAFF-03) converts the navs against
four roles and deletes these casts with them.

## Verification

**There is no test runner for this product, and none was added. Nothing here is
verified because tests pass.** What was actually run:

| Check | Result |
|---|---|
| `rm -rf .next && npm run build` after each task | passes (three clean builds) |
| `npx tsc --noEmit` on the final tree | clean |
| `grep -rn 'x-user-'` across the five files | **0** |
| `grep -rlc 'CAP.ORGANIZER_ACCESS'` across the four | **4** |
| `grep -c 'role === "organizer"'` on `events/page.tsx` | **0** |
| `grep -rn 'CATALOGUE_MANAGE'` across the five | **0** |
| `grep -c 'includes(role)'` / `'["master"'` across the five | **0** |
| `npm run verify:no-header-identity` | 102 → **90**; these five contribute 0 |
| `git diff --name-only <base> HEAD` | exactly the five files |

The build gate is real and was confirmed rather than assumed: `tsconfig.json`
has `strict: true` and `next.config.ts` sets no `typescript.ignoreBuildErrors`.

### Mutation proofs — and one that did not flip

*Every check was broken on purpose, and each mutation was asserted applied
before its result was read.*

| Mutation | Asserted applied | Result |
|---|---|---|
| comment text containing the literal `role === "organizer"` | `grep -c` → 1 | the plan's own anti-pattern gate **fired on a comment** ✓ — reworded, then 0 |
| remove `if (!userId) redirect(...)`, pass `string \| null` to `.eq()` | probe marker present, `if (!userId)` → 0 | `npx tsc --noEmit` **GREEN — did NOT flip** |
| pass an object literal `{ MUTATION_PROBE_33_07: true }` to `.eq()` | `grep -c` → 1 | `npx tsc --noEmit` **GREEN — did NOT flip** |

**What the two green results mean, since a green from an insensitive check is
the false negative this project has a recorded incident for.** The `userId`
narrowing is **not compiler-enforced**. The cause is the one `keys.ts:22-24`
already names: no Supabase client in this repository is parameterised with a
`Database` generic, so `eq()`'s value argument degrades to an unchecked type and
its `NonNullable` constraint never bites. The build would not have noticed if
that line had been omitted — so the runtime refusal is the entire guard, and the
file now says so at the line rather than implying the compiler holds it.

This strengthens the plan's prohibition on `?? ""` instead of weakening it, and
the plan's claim that the two are different requests was **verified by reading
the installed package** rather than repeated: postgrest-js appends the filter
through a template literal (`PostgrestFilterBuilder.ts:115`), so `null` leaves
as `created_by=eq.null` and `""` leaves as `created_by=eq.`.

The first mutation is also a finding about the *instrument*: the plan's
`role === "organizer"` gate is a plain `grep` and cannot tell code from prose. It
fired on an explanatory comment. Left as is — a gate that over-fires on a
comment is the safe direction — but recorded so the next reader does not spend
time on a phantom.

### The two event-list verdicts, and how each was reached

Confirmed **by reading the code path**, which the plan asked for:

| Session | Path through `events/page.tsx` | Query |
|---|---|---|
| `master` | holds `master.manage` → `!capabilities.has(...)` is false → the `.eq` is skipped | unfiltered, sees all |
| `organizer` | does not hold `master.manage` → `.eq("created_by", <their id>)` | filtered to their own |

Same two outcomes as before this plan, reached by asking a different authority.

## Manual verification: what was NOT run, and why

Wave 1 left an end-to-end procedure to whichever plan first converts a page. It
**was not run**, and rather than omit that, here is precisely why:

1. **Its target is not this plan's file.** The procedure exercises
   `/organizer/events/<E>/edit` — an ownership-gated page owned by plan 33-08.
   In this worktree that page is still on the old header path, so running the
   procedure here would measure the code this plan did not change.
2. **Step 4 (revoke `master.manage`, observe the refusal, roll back) needs a
   live database and a live session.** Both exist for the phase gate; neither is
   reachable from a parallel executor worktree that must not touch shared state.
3. **Production could not show the organizer verdict even with a session.**
   `33-01-SUMMARY.md` records production as holding four profiles and **no
   organizer row** — so "an organizer sees only their own events" has no data to
   be observed against there. The container carries the persona truth.

**The procedure this plan owes, for whoever holds a session at the phase gate**
(`33-14`), naming roles only:

1. Sign in as an `organizer`/`approved` subject who owns at least one event and
   is not the creator of at least one other. Visit `/organizer/events`.
   **Observe:** only their own events are listed; the event owned by the other
   organizer is absent.
2. Sign in as a `master`. Visit `/organizer/events`. **Observe:** both events
   are listed, including the one owned by neither.
3. Sign in as an `organizer`/**`pending`** subject. Visit `/organizer/artists`
   and `/organizer/venues`. **Observe:** both pages render. A redirect to
   `/dashboard` here means `CATALOGUE_MANAGE` crept in where
   `ORGANIZER_ACCESS` belongs, and is the exact verdict change criterion 4
   forbids.
4. Sign in as a `member`. Visit each of the five. **Observe:** redirected to
   `/dashboard` every time.
5. **The mutation proof, which must not be skipped.** With the master session of
   step 2, revoke `master.manage` from `master` in `private.role_capabilities`
   inside a transaction; **assert the revoke was applied by reading the row
   back**; reload `/organizer/events`. **Observe:** the list narrows to the
   master's own events — proving the `.eq` branch is genuinely reached and the
   step-2 result was not a coincidence of the data. Roll back, re-read, confirm.

Step 5 is what distinguishes "the check works" from "the check was never
exercised". Without it, step 2 passes on a page whose filter is dead code.

## Deviations from Plan

**One, and it is the same shape wave 1 recorded.**

1. **[Rule 2 — missing critical information]** The plan's task 2 says the
   explicit narrowing is "the honest way to make `userId` a `string`", which
   reads as though the typechecker demands it. Measured, it does not: both
   mutations above stayed green. The line was **kept** — the plan is binding,
   and the measurement makes it *more* necessary, not less — and the measured
   fact was written into the file's comment so a later reader does not delete it
   believing the compiler has their back. Commit `417648d`.

2. Minor, recorded for the instrument's sake: one explanatory comment had to be
   reworded because it contained the literal `role === "organizer"` and tripped
   the plan's own `grep`-based gate. The gate was **not** edited.

## Deferred / noted, not fixed here

- **`.eq()` is type-unchecked repository-wide**, not only on this line, and the
  same is true of every filter argument on every untyped client. Parameterising
  the clients with a `Database` generic would turn a whole class of silent
  runtime filters into build errors. Out of scope here, and it is not this
  plan's file to change — noted for whoever picks up the typed-client question.
- `MemberTable.currentUserId` stays `string`. If plan 33-05 reaches the opposite
  conclusion on the admin side, the two should be reconciled in one edit to
  `MemberTable.tsx` by whichever plan owns it — not by two plans in parallel.
- Pre-existing `npm run lint` state (~21 errors / ~108 warnings) is untouched
  and unrelated to these files.
- The `organizer`/`pending` asymmetry was **not touched**: this plan changes no
  migration, no policy and no grant. `git diff --name-only` against the base
  lists five `.tsx` files and nothing else.

## Known Stubs

None. All five pages are fully wired: every gate resolves a real capability set,
the event list's filter uses a real session identity, and nothing renders from a
hardcoded empty value or a placeholder.

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change is
introduced — five Server Components stopped trusting an inbound header and
started asking the session. T-33-34 through T-33-37 are mitigated as the plan's
register specifies; T-33-38 (`accept`) holds because no dependency was added.

One thing the register is worth reading against, stated plainly rather than left
implied: the middleware decides where a caller may *go*, and the row-level
policies decide what may be *read*. This plan improves the first and changes
nothing about the second. A page whose only protection were these redirects
would still be exposed to a direct API call.

## Self-Check: PASSED

- `src/app/(organizer)/organizer/artists/page.tsx` — FOUND (modified)
- `src/app/(organizer)/organizer/venues/page.tsx` — FOUND (modified)
- `src/app/(organizer)/organizer/members/page.tsx` — FOUND (modified)
- `src/app/(organizer)/organizer/events/new/page.tsx` — FOUND (modified)
- `src/app/(organizer)/organizer/events/page.tsx` — FOUND (modified)
- commit `e0f7022` — FOUND in `git log`
- commit `417648d` — FOUND in `git log`
- STATE.md, ROADMAP.md, `deferred-items.md` — NOT modified, as required
</content>
</invoke>
