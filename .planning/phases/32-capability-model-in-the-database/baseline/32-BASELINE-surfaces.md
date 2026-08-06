# 32 — B4: every server-side permission decision in application code, before the phase

**Written against commit:** `3f2ce4d`
**Date:** 2026-08-06
**Requirement:** CAP-03
**Status:** PRE-PHASE RECORD. Not a summary, not a review — a photograph.

**What this artefact is.** B1, B2, B3 and B5 measure the database. Nothing measures
the application. ROADMAP success criterion 1 says the before/after comparison is made
"surface by surface", and this is the surface list. Every row below carries a
`file:line` and the predicate **as the source writes it**, character for character.

**How it must read at the phase gate.** At the gate this same table is rebuilt from
the post-phase code. The **call site** column may change — that is what the phase is
for. The **predicate** column may not. Any predicate that has moved is a CAP-03 defect
until it is explained in writing.

**Why nothing here is tidied.** Three live inconsistencies are recorded in Section 7
verbatim and unresolved (phase decision D-16). A register that repairs what it finds
is not a baseline: CAP-03 requires the phase to *reproduce* today's behaviour, so
today's behaviour — including the parts that look like mistakes — has to be written
down first.

**What is deliberately absent.** `.planning/` is tracked and this repository is
public (`ai-engineering.md`, gate *la pianificazione e' pubblica*; `CLAUDE.md`
Guardrail 5). This register names **roles, files and line numbers**. It names no
person, no address, no identifier and no credential. Every excerpt below is code
already published in this repository.

---

## Section 1 — The four middleware prefix rules

`src/lib/supabase/middleware.ts`, inside the `else` branch at `:78` that runs only
when a user is authenticated.

| # | Prefix | Rule line | Predicate line | Predicate, exactly as written | Action on failure | Capability key this phase will map it to |
|---|---|---|---|---|---|---|
| 1 | `/admin/scanner` | `src/lib/supabase/middleware.ts:82` | `:83` | `role !== "master" && role !== "organizer"` | `redirect` to `/dashboard` (`:84-87`) | `door.operate` |
| 2 | `/admin` (all except scanner) | `src/lib/supabase/middleware.ts:90` | `:91` | `role !== "master"` | `redirect` to `/dashboard` (`:92-95`) | `admin.access` |
| 3 | `/organizer` | `src/lib/supabase/middleware.ts:99` | `:100` | `role !== "master" && role !== "organizer"` | `redirect` to `/dashboard` (`:101-104`) | `organizer.access` |
| 4 | `/membership-card` **or** `/attendance` | `src/lib/supabase/middleware.ts:108` | `:112` | `status !== "approved"` | `redirect` to `/dashboard` (`:113-116`) | `membership.card.view` |

The prefix test itself, quoted for rules 1 to 3, is `pathname.startsWith("…")`. Rule 4
is a two-arm `||` written across `:109-110`:

```ts
    if (
      pathname.startsWith("/membership-card") ||
      pathname.startsWith("/attendance")
    ) {
```

**The redirect body is identical four times** (`:84-87` and its three copies):

```ts
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
```

### The ordering is load-bearing, and the chain is not one chain

`/admin/scanner` at `:82` is tested **before** the general `/admin` branch at `:90`,
and the two form an `if` / `else if` pair — `:89` is the comment
`// /admin/* (except scanner) -> master only` and `:90` opens with `else if`. An
organizer reaching `/admin/scanner` therefore matches rule 1, passes, and **never
reaches** rule 2. **Invert that pair and every organizer is locked out of the door**:
`/admin/scanner` would match `startsWith("/admin")` first and be judged by
`role !== "master"`.

The other two are **separate `if` statements, not a continuation of that chain**.
`:99` (`/organizer`) opens a new `if`; `:108` (`/membership-card` / `/attendance`)
opens another. A request that fell through the `/admin` pair is still tested against
both. Any replacement that turns these four into a single lookup table must reproduce
**both** facts: longest-match precedence inside the `/admin` pair, and independent
evaluation of rules 3 and 4.

### Two behaviours the rules table hides, and both must survive

**(a) The `?? "member"` / `?? "pending"` defaults** (`src/lib/supabase/middleware.ts:55-56`):

```ts
    role = profile?.role ?? "member";
    status = profile?.status ?? "pending";
```

An authenticated user with **no profile row** is therefore treated as a **pending
member**, and a pending member passes none of the four rules. That is today's
fail-closed default and it is behaviour, not an implementation detail. A capability
set resolved for a missing profile would be the **empty set** — the same verdict on
all four rules, by a different mechanism. The equivalence must be *demonstrated* at
the gate, not assumed.

**(b) The discarded query error** (`src/lib/supabase/middleware.ts:49`):

```ts
    const { data: profile } = await supabase
```

The destructuring drops `error`. A failed profile read is indistinguishable from a
missing profile row and produces the same `member` / `pending` default silently.
`meta-gates.md`, *zero fallimenti silenziosi*: this is an existing silent failure on
the hottest path in the application, and the phase must not replace it with a
*different* silent default. Recording it here is not endorsing it — CAP-03 forbids
fixing it inside a constant-behaviour phase, and it is raised to the owner as its own
item.

---

## Section 2 — The header-injection block (`:120-139`) — OUT OF SCOPE

`src/lib/supabase/middleware.ts:120-139` is **not** a permission decision. It is the
transport by which `role` and `status` reach 46 files that read them. It is listed
here because the phase must leave it reading identically.

The unconditional delete (`:131-133`), preceded by the comment at `:124-130` that
records why it is unconditional:

```ts
  requestHeaders.delete("x-user-role");
  requestHeaders.delete("x-user-status");
  requestHeaders.delete("x-user-id");
```

The conditional set (`:135-139`):

```ts
  if (user) {
    requestHeaders.set("x-user-role", role ?? "member");
    requestHeaders.set("x-user-status", status ?? "pending");
    requestHeaders.set("x-user-id", user.id);
  }
```

**Scope statement.** Replacing the `x-user-*` transport is **CAP-05, phase 33**, and
it touches 46 files. This phase does not touch it. Consequence for the design: this
block still needs `role` and `status` **as values**, so whatever replaces the profile
read at `:49-53` must either return them or leave that read in place. Note the
`?? "member"` / `?? "pending"` defaults appear here a **second** time, independently
of `:55-56`.

---

## Section 3 — The four door routes

All four are `POST` handlers guarded by a locally-declared `verifyOrganizerRole` (or,
in one case, an inline block). **All four check role alone.** None of them reads
`status` into its decision.

| Route | Guard declared at | Predicate line | Predicate, exactly as written | Failure mode | Reads |
|---|---|---|---|---|---|
| `src/app/api/tickets/checkin/route.ts` | `:131` | `:148` | `!profile \|\| (profile.role !== "master" && profile.role !== "organizer")` | returns `{ error: "Forbidden", status: 403 }` | session |
| `src/app/api/tickets/checkin/undo/route.ts` | `:32` | `:49` | `!profile \|\| (profile.role !== "master" && profile.role !== "organizer")` | returns `{ error: "Forbidden", status: 403 }` | session |
| `src/app/api/membership/verify/route.ts` | inline in `POST`, `:83` | `:102-105` | `!userProfile \|\| (userProfile.role !== "master" && userProfile.role !== "organizer")` | returns `{ valid: false, status: "forbidden" }`, HTTP 403 | session |
| `src/app/api/tickets/attendance/route.ts` | `:11` | `:28` | `!profile \|\| (profile.role !== "master" && profile.role !== "organizer")` | returns `{ error: "Forbidden", status: 403 }` | session |

All four also return `{ error: "Unauthorized", status: 401 }` (or the `valid: false`
equivalent) when `authError || !user`.

**A difference in the read that is not a difference in the decision.**
`checkin/route.ts:144` and `undo/route.ts:45` select `"role, status"`; the other two
select `"role"` only (`membership/verify/route.ts:98`, `attendance/route.ts:24`).
`status` is fetched by two routes and used by none. Recorded because a replacement
that stops fetching it changes the query without changing the verdict — a diff that
looks like a behaviour change and is not.

**They must never diverge, and the source says so.** The comment at
`src/app/api/tickets/checkin/route.ts:110-130` states it in full: *"Role decides the
door. Status does not."*, and:

> The three other door routes — `undo`, `membership/verify`, `attendance` —
> check role alone as well. They must stay identical: the same person refused by
> one scanner and admitted by another, on the same night, is undiagnosable with
> no error tracking anywhere in this repository.

That comment also records where the hole a status check would have closed is closed
instead: `updateMemberRole` sets `status = 'approved'` in the same write that grants
the organizer role (`src/app/(admin)/admin/members/actions.ts:129-134`). **Any
capability that gates the door must therefore be `requires_approved = false`, or the
door changes behaviour for a pending organizer.** That is the single most dangerous
mapping in this phase.

`undo/route.ts:26` carries a doc comment whose first line reads *"Role **and**
status, the same guard the check-in route applies."* — while `:53-56` immediately
below the predicate says *"Role decides the door; status does not."* The code checks
role only. The doc comment's first line is stale; it is recorded here as observed and
not corrected, because correcting prose inside a constant-behaviour phase is still a
diff on a door file.

---

## Section 4 — `NAV_ITEMS` (client-side visibility, not protection)

`src/lib/rbac/roles.ts:36-82`. Five entries, four flags each.

| # | `href` | `label` | `roles` | `requireApproved` | `requireAuth` | `hideWhenAuth` | Lines |
|---|---|---|---|---|---|---|---|
| 1 | `/` | Home | `null` | `false` | `false` | `true` | `:37-45` |
| 2 | `/events` | Events | `null` | `false` | `false` | `false` | `:46-54` |
| 3 | `/gallery` | Gallery | `null` | `true` | `false` | `false` | `:55-63` |
| 4 | `/admin/scanner` | Check-in | `["master", "organizer"]` | `true` | `true` | `false` | `:64-72` |
| 5 | `/dashboard` | Account | `null` | `false` | `true` | `false` | `:73-81` |

The filter, `getVisibleNavItems` (`src/lib/rbac/roles.ts:94-129`), evaluates four
tests in this order inside `NAV_ITEMS.filter` at `:101-128`:

1. `:103` — `if (item.hideWhenAuth && isAuthenticated)` → hide
2. `:108` — `if (item.requireAuth && !isAuthenticated)` → hide
3. `:114-115` — `if (item.requireApproved) { if (isAuthenticated && !isApproved)` → hide
4. `:121-122` — `if (item.roles !== null) { if (!role || !item.roles.includes(role))` → hide

with `isAuthenticated = role !== null` (`:98`) and `isApproved = status === "approved"`
(`:99`). Note test 3: `requireApproved` hides an item from an authenticated
non-approved user but **not** from an unauthenticated visitor, which is why `/gallery`
is visible to a logged-out visitor and hidden from a pending member.

Entry 4 quoted in full, because Section 7 turns on it (`src/lib/rbac/roles.ts:64-72`):

```ts
  {
    href: "/admin/scanner",
    label: "Check-in",
    icon: "qrcode",
    roles: ["master", "organizer"],
    requireApproved: true,
    requireAuth: true,
    hideWhenAuth: false,
  },
```

**Hiding a link is not protecting a route.** `access-gating.md`, gate *coerenza
navigazione/permessi*. Every entry above is client-visible filtering; the server-side
counterpart for entry 4 is middleware rule 1 (Section 1), and the two **disagree** —
see Section 7, inconsistency 2.

**`NAV_ITEMS` is not converted in this phase.** It is recorded so the gate can prove
it did not move, and so inconsistency 2 has both of its sides written down.
