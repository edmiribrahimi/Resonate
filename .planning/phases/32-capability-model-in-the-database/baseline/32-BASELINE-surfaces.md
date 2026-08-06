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

---

## Section 5 — The five guard-helper families

Every server action and route handler that decides on role does it through one of
these. The **reads** column is the one that matters for phase 33: a guard that reads
the session queries `public.profiles` under RLS; a guard that reads the header trusts
`src/lib/supabase/middleware.ts:135-139` and performs no database read at all.

| Family | Every site | Predicate, exactly as written | Failure mode | Reads |
|---|---|---|---|---|
| `verifyOrganizer` | `src/app/(organizer)/organizer/events/actions.ts:25` (predicate `:47`)<br>`src/app/(organizer)/organizer/events/[id]/tickets/actions.ts:20` (predicate `:42`) | `profile.role !== "organizer" && profile.role !== "master"` | `throw new Error("Forbidden: …")` | session |
| `verifyOrganizerAccess` | `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:14` (predicate `:19`, ownership `:23-34`) | `role !== "organizer" && role !== "master"` | `throw new Error("Forbidden: organizer or master access required")` | **header** |
| `verifyOrganizerRole` | `src/app/api/tickets/attendance/route.ts:11` (predicate `:28`)<br>`src/app/api/tickets/checkin/route.ts:131` (predicate `:148`)<br>`src/app/api/tickets/checkin/undo/route.ts:32` (predicate `:49`) | `!profile \|\| (profile.role !== "master" && profile.role !== "organizer")` | returns `{ error: "Forbidden", status: 403 }` | session |
| `requireMaster` | `src/app/(admin)/admin/finance/actions.ts:9` (predicate `:12`)<br>`src/app/(admin)/admin/newsletter/actions.ts:15` (predicate `:18`) | `role !== "master"` | `redirect("/dashboard")` | **header** |
| `verifyMaster` / `verifyAdminOrOrganizer` | `src/app/(admin)/admin/members/actions.ts:45` (predicate `:65`)<br>`src/app/(admin)/admin/members/actions.ts:73` (predicate `:93`) | `profile.role !== "master"` / `profile.role !== "master" && profile.role !== "organizer"` | `throw new Error("Forbidden: …")` | session |

**A sixth site with no family.** `src/app/api/membership/verify/route.ts:83-110` is the
same door guard written **inline inside `POST`** rather than as a helper (Section 3).
It has no name, so nothing can call it, and nothing can find it by searching for one.

**A seventh, found while writing this register and named in no upstream document.**
`validateMediaUpload` (`src/app/(public)/events/[slug]/actions.ts:14`) is the only
server-side guard in the application that reads **both axes and a third fact**:

| Site | Predicate, exactly as written | Failure mode | Reads |
|---|---|---|---|
| `src/app/(public)/events/[slug]/actions.ts:14` | `:36` `profile.role === "organizer" \|\| profile.role === "master"`, and when false, `:40` `profile.status !== "approved"`, then `:52` `!attendance` | `throw new Error("Not approved")` / `throw new Error("You must have attended this event to upload media")` | session |

Staff bypass both the status check and the attendance check; a member must be
`approved` **and** have an `attendance` row for that event. It appears in neither
`32-PATTERNS.md` § *B4* nor `32-02-PLAN.md`, and it is the fourth
`select("role, status")` site counted in Section 6. Recording it is the point of
building this register by reading the source rather than by transcribing a plan.

**The two `verifyOrganizer` copies are byte-identical except for their error message.**
`actions.ts:48` throws `"Forbidden: only organizers can manage events"`;
`tickets/actions.ts:43` throws `"Forbidden: only organizers can manage ticket tiers"`.
Every other line — the `getUser()` call, the `authError || !user` branch, the
`select("role")`, the `profileError || !profile` branch, the predicate — is the same
text. **Deleting that duplication is phase 33's job (CAP-05), not this phase's.**
Phase 32 records it and gives it a name to be replaced by.

**Two corrections to `32-PATTERNS.md` § *B4*, made by reading the source.** A derived
document is a hypothesis until checked at the source (`ai-engineering.md`, gate
*hallucination*); both were checked and both are recorded here as the source reads:

1. `verifyOrganizerAccess` reads the **header** (`guest-list/actions.ts:15-17`), not
   the session. `32-PATTERNS.md:926` describes it as "same, plus event ownership",
   which reads as session-based. It is not: it is a `requireMaster`-shaped guard with
   an ownership check bolted on, and its ownership read uses `getServiceClient()`
   (`:24`), which bypasses RLS entirely.
2. `verifyAdminOrOrganizer` is declared at `src/app/(admin)/admin/members/actions.ts:73`.
   `32-02-PLAN.md` cites `:71`; `32-PATTERNS.md:929` cites `:73`. The source says `:73`.

---

## Section 6 — The census

Four counts, each with the command that produced it. Commands are macOS/BSD
(`CLAUDE.md` Guardrail 6), run from the repository root against commit `3f2ce4d`
on 2026-08-06.

| # | Command | Pre-registered | Observed | Verdict |
|---|---|---|---|---|
| 1 | `grep -rl 'x-user-' src \| wc -l` | 46 | **46** | matches |
| 2a | `grep -rn 'select("role"' src \| wc -l` | 21 | **17** | **diverges — see below** |
| 2b | `grep -rn 'select("role' src \| wc -l` | 21 | **21** | matches |
| 3 | `grep -rl 'getServiceClient' src \| wc -l` | 29 | **29** | matches |
| 4 | `grep -rn 'redirect("/dashboard")' src \| wc -l` | 32 | **32** | matches |

**The divergence on count 2, and what it is not.** `32-02-PLAN.md` writes the command
with a closing quote — `select("role"` — and pre-registers 21. That command returns
**17**. The un-terminated form `select("role` returns **21**, which is the
pre-registered number. The difference is the four call sites that select more than one
column, `select("role, status")`, which the closing quote excludes —
`src/lib/supabase/middleware.ts:51`, `src/app/api/tickets/checkin/route.ts:144`,
`src/app/api/tickets/checkin/undo/route.ts:45` and
`src/app/(public)/events/[slug]/actions.ts:28`. 17 + 4 = 21, and the four are
enumerated by `grep -rn 'select("role, status"' src`.

**This is a defect in the plan's transcription of the command, not a change in the
code.** Both numbers are recorded because both commands are re-runnable and a baseline
that quietly picks the convenient one is not a baseline. At the phase gate, use **2b**,
because it is the count the pre-registration was made against — and because the
`role, status` sites are exactly the ones this phase might stop reading.

### The coverage boundary of this register, measured rather than asserted

A fifth count, added while writing, because the register would otherwise imply a
completeness it cannot prove:

```
grep -rnE '(role|status) (!==|===) "' src | wc -l   →  178
grep -rlE '(role|status) (!==|===) "' src | wc -l   →   78
```

**178 role-or-status comparisons in 78 files.** Sections 1 to 5 record **21** of them:
the four middleware rules, the four door routes, the seven guard-helper sites across
five families, the inline door guard, `validateMediaUpload`, and the four `NAV_ITEMS`
filter tests. The remainder are overwhelmingly **presentational** — a page or a
component deciding whether to render a button, using the `x-user-*` headers the
middleware injected — and by `CLAUDE.md` Operating Principle 2 they are UX, not the
security boundary.

**"Overwhelmingly" is not "entirely", and the difference is stated on purpose.** This
register covers every guard that **refuses** an operation server-side, found by reading
the five families named in `32-RESEARCH.md` plus the two this document adds. It does
**not** claim that no seventy-ninth file contains a refusal nobody has looked at. The
count above is the population; the 21 are the sample that was read line by line.

**Consequence for the phase gate.** Re-run both commands after the phase. If 178
moves, something outside this register changed and must be accounted for before CAP-03
can be called clean. That is a weaker guarantee than a full enumeration and a much
stronger one than silence.

**What the census is for.** It is a blast-radius measure, not a permission decision.
Count 1 is the size of CAP-05 (phase 33). Count 3 is the number of files holding a
client that bypasses every RLS policy (`access-gating.md`, gate *service role*) — the
population against which "the capability check must not be performed with the service
client" has to be checked. Count 4 is the bounce target that four middleware rules and
one guard family share, and it is the number that would move if any of them stopped
redirecting.

---

## Section 7 — The three inconsistencies, recorded and not resolved

This is the load-bearing section of B4. Each entry carries **two citations** and one
sentence saying what would happen if the phase tidied it. None of the three is fixed
by this phase.

### 1. Two definitions of "organizer" in the database

`32-RESEARCH.md`, measured against the live database: **34** policies gate on
`public.is_admin_or_organizer()`, whose body reads `role` and **contains no `status`
at all** — `supabase/migrations/20260224_rbac_migration.sql:127-135`:

```sql
CREATE OR REPLACE FUNCTION public.is_admin_or_organizer()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  user_role := (SELECT public.get_user_role());
  RETURN user_role = 'master' OR user_role = 'organizer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**Four** policies — `artists_insert_organizer`, `artists_update_organizer`,
`venues_insert_organizer`, `venues_update_organizer` — instead use an inline `EXISTS`
requiring role **and** `status = 'approved'`
(`supabase/migrations/20260226200000_venues.sql:29-51`,
`supabase/migrations/20260226100000_artist_profiles.sql:28-51`):

```sql
create policy "venues_insert_organizer"
  on public.venues for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('organizer', 'master')
        and status = 'approved'
    )
  );
```

**Today a pending organizer can create a ticket tier but not a venue.** The two
predicates are not two spellings of one rule: they disagree on one of the two axes,
and the disagreement is reachable by a real account.

**Consequence if tidied.** Collapsing these into one capability is this phase's single
unrecoverable CAP-03 defect. Collapse onto `requires_approved = false` and a pending
organizer gains the ability to create venues and artists — a widening, which is the
one outcome CAP-03 forbids absolutely. Collapse onto `requires_approved = true` and a
pending organizer silently loses 34 policies' worth of access, including the door.
**They need two distinct capability keys, and the register that proves it is this one.**

**One adjacent measurement, recorded so nobody re-derives it.** The same P3 shape
appears on **four more** policies, on `storage.objects` rather than on a `public`
table: `venue_photos_insert_organizer`, `venue_photos_update_organizer`
(`supabase/migrations/20260226200000_venues.sql:75-98`),
`artist_photos_insert_organizer`, `artist_photos_update_organizer`
(`supabase/migrations/20260226100000_artist_profiles.sql:75-98`). Whether they are
inside the phase's 67-policy set depends on the schema scope of B1's `pg_policies`
query. **If B1 is scoped to `public`, these four are outside the baseline and must
not be touched** — and if the phase touches them anyway, B1 will not see it.

### 2. Navigation and route disagree on `/admin/scanner`

The nav entry at `src/lib/rbac/roles.ts:64-72` carries
`roles: ["master", "organizer"]` **and** `requireApproved: true`. The middleware rule
for the same path at `src/lib/supabase/middleware.ts:82-88` checks **role only**:

```ts
    if (pathname.startsWith("/admin/scanner")) {
      if (role !== "master" && role !== "organizer") {
```

**A pending organizer sees no link to a route that would admit them.** Both sides are
live, and they have been live together.

**Consequence if tidied.** Aligning the nav to the route (dropping `requireApproved`)
shows a link that was hidden — a visible widening. Aligning the route to the nav
(adding a status check) locks a pending organizer out of the door, which contradicts
the owner decision recorded at `src/app/api/tickets/checkin/route.ts:110-130` and is
the exact failure mode `checkin-offline.md` calls the worse of the two errors. **The
phase reproduces both sides and resolves neither.**

### 3. The login redirect parameter is dead

`src/lib/supabase/middleware.ts:75` writes the parameter as `redirect`:

```ts
      url.searchParams.set("redirect", pathname);
```

`src/app/(auth)/login/page.tsx:11` reads it as `next`:

```ts
  const nextUrl = searchParams.get("next") || "";
```

The two never meet, so an unauthenticated user bounced from a protected route lands on
the login form and, after signing in, is not returned to where they were going.

**Consequence if tidied.** This changes navigation, not access, so it does not touch
CAP-03 — and fixing it inside a constant-behaviour phase would put a behaviour change
inside the one diff that must contain none, blurring the comparison this artefact
exists to make. **Raised to the owner as its own item.**

---

## How this artefact is used

At the phase gate, this same register is **rebuilt from the post-phase code** — not
edited, rebuilt — and the two versions are compared row by row.

- The **call site** column may change. Moving a decision from a `role !== "master"`
  comparison to a capability lookup is what the phase is for.
- The **predicate** column may **not**. It must read **character-identical**, or the
  new predicate must be shown to be exactly equivalent to the old one, in writing,
  with the account states that distinguish them enumerated.
- **Any predicate that has moved is a CAP-03 defect until explained.** "It is
  equivalent" is a claim, not evidence; the evidence is the write probe and B1.
- The three entries in Section 7 must **still be three**. A phase that returns two has
  resolved one, and resolving one is a behaviour change however sensible it looks.
- Sections 2 and 4 must read identically. They are recorded precisely because nothing
  is supposed to happen to them.

There is no test runner for this product (`CLAUDE.md` Guardrail 1), so this document
is not a convenience: **it is the only record of what the application decided before
the phase started.** If it is wrong, nothing downstream can tell.
