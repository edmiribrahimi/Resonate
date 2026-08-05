# Architecture Research

**Domain:** Gated events platform — Next.js 16 App Router + Supabase, PWA with an offline door
**Milestone:** v1.5 — unified work surface, capability access model, formats, realtime attendance
**Researched:** 2026-08-05
**Confidence:** HIGH (Next.js and Supabase guidance verified against current official docs; repo claims verified by reading the files)

> Integration research for an **existing** system. Where a claim is about this
> repo, the `file:line` is given so it can be re-checked rather than believed.
> `.planning/codebase/` was **not** used as a source: it carries
> *Analysis Date: 2026-02-24* and predates three shipped milestones.

---

## 0. What the repo actually looks like right now

| Fact | Evidence |
|---|---|
| Five route groups, no group-level layout — only `src/app/layout.tsx` exists | `find src/app -name layout.tsx` → 1 file |
| The staff surface is two trees: 35 files under `(admin)`, 24 under `(organizer)` | `src/app/(admin)/admin/**`, `src/app/(organizer)/organizer/**` |
| **45 files** read the middleware-injected `x-user-role` header | `grep -rln x-user-role src/` |
| Authorization is inlined per page in two variants | `(admin)/admin/venues/page.tsx:15` → `role !== "master"`; `(organizer)/organizer/venues/page.tsx:15` → `role !== "organizer" && role !== "master"` |
| Server actions live inside route groups — 8 `actions.ts` files split across both trees | `(admin)/admin/{finance,members,newsletter}/actions.ts`, `(organizer)/organizer/**/actions.ts` |
| Two different authorization idioms *inside* actions | header-derived at `finance/actions.ts:9-14`; session-derived at `organizer/events/actions.ts:31-51` |
| RLS helper functions already exist and are already wrapped in `(select …)` | `20260224_rbac_migration.sql:100-135`, used as `(SELECT public.is_admin_or_organizer())` at `:151` and throughout |
| `event_parties` already carries `date`, `venue_text`, `venue_secret`, `venue_secret_hint`, `venue_reveal_hours`, `lineup` | migrations `20260226300000`, `20260226400000`, `20260226500000` |
| No format column anywhere; no `formats` table | grep across `supabase/**` — no hits |
| **No Realtime anywhere** — zero `.channel(` calls | `grep -rn "\.channel(" src/` — no hits |
| Offline layer is two files, ~470 lines | `src/lib/offline/checkin-store.ts`, `src/lib/offline/sync-manager.ts` |
| `tickets.party_id` and `guest_list_entries.party_id` have **no index**; `rsvps` has only `(checked_in, party_id)` — party_id not leading | every `CREATE INDEX` in `supabase/**` grepped |
| `middleware.ts` is still the Next.js 15 filename | `src/middleware.ts`; Next.js 16 renamed this to `proxy.ts` |

### The defect that decides the build order

`src/lib/supabase/middleware.ts:122-127`:

```ts
const requestHeaders = new Headers(request.headers);
if (user) {
  requestHeaders.set("x-user-role", role ?? "member");
  ...
}
```

Incoming headers are **copied**, and `x-user-role` is overwritten **only when a
user is present**. On the anonymous branch the client's own `x-user-role`
survives into the Server Component / Server Action.

The redirect does not cover this: it fires only for `protectedPrefixes`
(`middleware.ts:62-77`), and a POST to a public path is not redirected. And
`src/app/(admin)/admin/finance/actions.ts:9-14` gates **SumUp refunds and a
service-role Supabase client** on exactly that header:

```ts
async function requireMaster() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  if (role !== "master") redirect("/dashboard");
}
```

Next.js's own guidance is unambiguous about the shape of this mistake:

> "even if a Server Action or utility function is not imported elsewhere in your
> code, it can still be called externally… you should still treat Server Actions
> as reachable via direct POST requests and verify authentication and
> authorization inside each one."
> — [nextjs.org/docs/app/guides/data-security](https://nextjs.org/docs/app/guides/data-security)

Practical exploitation additionally requires obtaining a valid encrypted action
ID (Next.js rotates these per build and dead-code-eliminates unused actions), so
this is **not** a one-line remote takeover. But it is a money path whose only
guard is an attacker-suppliable header, and `getServiceClient()` bypasses RLS
entirely, so RLS is not a backstop here. Critical, and the reason the access
model must land **before** the route-tree collapse, not after.

---

## 1. Standard architecture — target shape

### System overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  EDGE / PROXY  (src/proxy.ts — renamed from middleware.ts)           │
│  Session refresh + "is there a session?" only.  NO role lookup.      │
│  Optimistic redirect to /login. Injects NOTHING about identity.      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│  ROUTE LAYER   src/app/(staff)/staff/**   ← ONE tree, 13 routes      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ events   │ │ members  │ │ finance  │ │ artists  │ │ venues   │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│  pages call requireCapability(); thin "use server" wrappers only    │
└───────┴────────────┴────────────┴────────────┴────────────┴─────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│  DATA ACCESS LAYER   src/lib/**  —  import "server-only"             │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────────┐   │
│  │ auth/dal.ts    │ │ events/*.ts    │ │ finance/*.ts           │   │
│  │ getViewer()    │ │ tickets/*.ts   │ │ guest-list/*.ts        │   │
│  │ requireCap()   │ │ formats/*.ts   │ │ assignments/*.ts       │   │
│  └───────┬────────┘ └───────┬────────┘ └───────────┬────────────┘   │
│      ONE definition of every rule, one call site per rule           │
└──────────┴──────────────────┴──────────────────────┴────────────────┘
                                │  supabase-js (RLS-bound)  /  rpc()
┌───────────────────────────────▼──────────────────────────────────────┐
│  POSTGRES  —  the security boundary                                  │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ has_capability(cap) / assigned_parties(cap) / can(cap, party)  │   │
│  │   ← ONE definition, three callers: RLS, the DAL, the channel   │   │
│  └───────────────────────────────────────────────────────────────┘   │
│  capabilities · staff_roles · role_capabilities · staff_assignments  │
│  formats · series_counters · event_parties.format_key/series_code    │
│  realtime.messages  ← channel authz uses the SAME functions          │
└──────────────────────────────────────────────────────────────────────┘
                                │  Broadcast (private channel)
┌───────────────────────────────▼──────────────────────────────────────┐
│  DOOR CLIENT (PWA)  —  the decision path is LOCAL and stays local    │
│  scan → IndexedDB lookup → verdict + flash + haptic  (0 network)     │
│         ▲                    │                                        │
│  realtime freshener ─────────┘  pendingCheckins queue → sync-manager  │
│  (writes cache only, never a verdict; local pending always wins)      │
└──────────────────────────────────────────────────────────────────────┘
```

### Component responsibilities — new vs modified

| Component | Responsibility | New / Modified |
|---|---|---|
| `src/proxy.ts` | Session refresh, authenticated-or-not redirect. Nothing else. | **Modified** — renamed from `src/middleware.ts`; the profiles query (`:49-53`) and all three header injections (`:122-127`) deleted |
| `src/lib/auth/dal.ts` | `getViewer()` (React `cache()`-wrapped), `requireCapability(cap, partyId?)`, `can(cap, partyId?)` | **New** |
| `src/lib/auth/capabilities.ts` | Capability union type, derived from the generated DB enum | **New** |
| `src/app/(staff)/staff/**` | One copy of the 13 duplicated routes | **New files, replacing 59 existing ones** |
| `src/lib/{events,tickets,finance,guest-list,members,venues,artists,newsletter}/` | Server-only DAL modules holding the bodies of today's 8 `actions.ts` | **New** (bodies moved, not rewritten) |
| `public.has_capability(cap)` | Global capability from the role preset | **New** |
| `public.assigned_parties(cap)` | Party ids the viewer holds a capability on tonight | **New** |
| `public.can(cap, party)` | The union the app calls by `rpc` | **New** |
| `public.is_master()` / `is_admin_or_organizer()` | Kept, **redefined** over the above so ~40 existing policies keep working untouched | **Modified** — `20260224_rbac_migration.sql:120-135` |
| `staff_assignments`, `staff_roles`, `role_capabilities` | Per-night grants and presets | **New tables** |
| `formats`, `series_counters` | Format reference + monotone numbering | **New tables** |
| `event_parties.format_key / series_scope / series_number / series_code` | Format identity on the party | **Modified table** |
| `src/lib/offline/checkin-store.ts` | Gains `upsertAttendee()` / `applyRemote()` and a pending-wins guard | **Modified** |
| `src/lib/offline/attendance-realtime.ts` | Subscribe, reconnect, backfill — cache writes only | **New** |
| `src/lib/offline/sync-manager.ts` | Duplicate-collision reporting instead of silent `markSynced` on 409 (`:39-42`) | **Modified** |
| `src/components/staff/StaffNav.tsx` | `context: "admin" \| "organizer"` prop dies; tabs derive from capabilities | **Modified** |
| `src/lib/rbac/roles.ts` | `NAV_ITEMS` role arrays (`:36-82`) become capability arrays | **Modified** |

---

## 2. Recommended project structure

```
src/
├── proxy.ts                        # renamed; session-only, carries no role facts
├── app/
│   ├── (staff)/
│   │   └── staff/
│   │       ├── layout.tsx          # shell + coarse gate (holds ANY staff capability)
│   │       ├── page.tsx            # capability-aware landing
│   │       ├── events/             # ONE copy — was admin/events + organizer/events
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/{edit,tickets,sales,drinks,guest-list,media,analytics}/
│   │       ├── members/ artists/ venues/ newsletter/ finance/ analytics/
│   │       └── assignments/        # NEW — per-night staff grants
│   ├── door/                       # the scanner — SEPARATE, URL-stable, see §8
│   ├── (public)/ (auth)/ (members)/
│   └── api/                        # unchanged in shape; handlers call the DAL
├── lib/
│   ├── auth/{dal.ts,capabilities.ts}
│   ├── events/ tickets/ finance/ guest-list/ members/ venues/ artists/ newsletter/
│   ├── assignments/                # grant / revoke / roster
│   ├── formats/                    # series code composition + numbering client
│   ├── offline/
│   │   ├── checkin-store.ts        # + applyRemote, + pending-wins guard
│   │   ├── sync-manager.ts         # + collision reporting
│   │   └── attendance-realtime.ts  # NEW — freshener only
│   └── supabase/{server,client,service,proxy}.ts
└── supabase/migrations/            # capability model, formats, realtime authz
```

### Structure rationale

- **`(staff)` group, `/staff` URL prefix.** The URL must stop encoding the role.
  `/admin` and `/organizer` are both *role names in a path* — the exact thing
  being removed. Keeping either as canonical leaves the next role (door-only,
  bar-only) with no home.
- **DAL under `src/lib/`, not under `src/app/`.** Today's `actions.ts` files sit
  inside route groups, which is precisely why they duplicated when the routes
  did. Moving the bodies out makes the tree collapse a *deletion* of page files
  rather than a merge of logic.
- **The door lives outside the staff tree.** Not aesthetics — the service
  worker. See §8.

---

## 3. Pattern: where the authorization check belongs

**Question:** *given that server actions are public endpoints regardless of where
they are imported from, where does the check belong?*
**Answer:** in the DAL. The action is a three-line wrapper that calls it. This
is Next.js's current recommendation, and it also happens to solve the
duplicated-`actions.ts` problem for free.

Four layers, only one of which is a security boundary:

| Layer | Purpose | Security boundary? |
|---|---|---|
| `proxy.ts` | Redirect anonymous visitors to `/login` | **No** — optimistic UX |
| `layout.tsx` | Render the staff shell | **No** — and layouts do not re-execute on every child navigation, so a check placed only here goes stale |
| page / action / route handler → `requireCapability()` | Deny early, clean 403 | **Partly** — defence in depth |
| RLS policy in Postgres | Which rows the caller may touch | **Yes** |

```ts
// src/lib/auth/dal.ts
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Capability } from "./capabilities";

export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles").select("id, role, status").eq("id", user.id).single();
  return data ? { id: user.id, role: data.role, status: data.status } : null;
});

/** Single source of the answer: the SAME SQL function the RLS policies call. */
export const can = cache(async (cap: Capability, partyId?: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("can", { cap, party: partyId ?? null });
  if (error) {
    console.error("[authz] rpc can() failed", { cap, partyId, code: error.code });
    return false;                       // fail closed, but logged with a category
  }
  return data === true;
});

export async function requireCapability(cap: Capability, partyId?: string) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=" + encodeURIComponent(currentPath()));
  if (!(await can(cap, partyId))) {
    console.warn("[authz] denied", { userId: viewer.id, cap, partyId });
    throw new ForbiddenError(cap);      // distinct error type, not a generic throw
  }
  return viewer;
}
```

```ts
// src/app/(staff)/staff/finance/actions.ts — thin wrapper, nothing else
"use server";
import { refundTicket } from "@/lib/finance/refunds";   // auth + authz live in there
import { revalidatePath } from "next/cache";

export async function refundTicketAction(ticketId: string, amount: number) {
  const result = await refundTicket(ticketId, amount);
  revalidatePath("/staff/finance");
  return result;                          // return the minimum the UI needs
}
```

**Trade-offs.** `cache()` dedupes `getViewer` per request, so the profiles query
costs the same single round-trip the middleware pays today
(`middleware.ts:49-53`) — except it now runs only on requests that need it, not
on every path the broad matcher catches. `can()` adds one RPC per distinct
capability per request; at current data volume that is noise, and it buys the
no-drift property in §4.

**Rejected alternative — keeping `x-user-role` "just for the UI."** A header that
is authoritative in 43 places and decorative in 2 will be used authoritatively
in the 44th. Delete it in the same phase that introduces `getViewer()`.

---

## 4. Pattern: one definition of a capability, callable from both sides

**Question:** *how should capability checks be expressed so the server check and
the RLS policy cannot drift apart? Is a Postgres function callable from both the
right pattern?*

Yes — but only under a stricter rule than "share a function":

> **The server never re-derives an authorization answer. It either asks the
> database for it (`rpc`) or lets RLS answer it by returning zero rows.**

Two checks written carefully in two languages drift on the first exception, and
the drift is silent: one side allows, the other denies, and which one you notice
depends on which path the user took.

### Schema

```sql
create type public.app_capability as enum (
  'event.read','event.write','event.publish',
  'ticket.read','ticket.checkin','ticket.refund',
  'drink.read','drink.serve','drink.refund',
  'member.read','member.approve','member.role',
  'finance.read','finance.refund',
  'venue.reveal',
  'staff.assign'
);

create table public.staff_roles (
  key text primary key,                       -- 'master','organizer','door','bar', …
  label text not null,
  is_global boolean not null default false    -- grantable on profiles.role
);

create table public.role_capabilities (
  role_key   text not null references public.staff_roles(key) on delete cascade,
  capability public.app_capability not null,
  primary key (role_key, capability)
);

create table public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  party_id   uuid not null references public.event_parties(id) on delete cascade,
  role_key   text not null references public.staff_roles(key),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (profile_id, party_id, role_key)
);
```

`profiles.role` **stays**. It becomes a FK to `staff_roles.key` and now means
"which preset," not "which URL prefix." Nothing dropped, nothing backfilled —
which is what makes the step reversible.

### The functions everything calls

```sql
-- global capability, from the role preset
create or replace function public.has_capability(cap public.app_capability)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_capabilities rc on rc.role_key = p.role
    where p.id = (select auth.uid())
      and p.status = 'approved'      -- role AND status. Both axes, enforced once.
      and rc.capability = cap
  );
$$;

-- the parties the viewer holds this capability on for tonight only
create or replace function public.assigned_parties(cap public.app_capability)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select sa.party_id
  from public.staff_assignments sa
  join public.role_capabilities rc on rc.role_key = sa.role_key
  join public.profiles p on p.id = sa.profile_id
  where sa.profile_id = (select auth.uid())
    and sa.revoked_at is null
    and p.status = 'approved'
    and rc.capability = cap;
$$;

-- what the app calls, so app and RLS cannot disagree
create or replace function public.can(cap public.app_capability, party uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_capability(cap)
      or (party is not null and party in (select public.assigned_parties(cap)));
$$;
```

`status = 'approved'` lives **inside** the function, not with the caller. That
is `access-gating.md`'s two-axes gate enforced once instead of forty-five times —
today a page that checks `role !== "master"` says nothing about status, and the
status check exists only in the middleware for two member routes
(`middleware.ts:108-117`).

### Keeping the ~40 existing policies working

Do **not** rewrite the policies in the migration that introduces the model.
Redefine the two helpers those policies already call
(`20260224_rbac_migration.sql:120-135`):

```sql
create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_capability('member.role');
$$;

create or replace function public.is_admin_or_organizer()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_capability('event.write');
$$;
```

Seed `role_capabilities` so the three current roles map to exactly the sets they
have today; behaviour on day one is byte-identical. One `create or replace` back
undoes it.

### Preventing type drift on the TypeScript side

`app_capability` is a Postgres enum, so `supabase gen types` emits it as a string
union. Derive the type, never hand-write the list:

```ts
export type Capability = Database["public"]["Enums"]["app_capability"];
```

A capability added in SQL but not regenerated fails `npm run build`. In a repo
with no test runner, the typechecker is the only automatic gate available — use it.

### The JWT-claims alternative, and why not yet

Supabase's canonical RBAC guide injects the role into the JWT with a Custom
Access Token Auth Hook and reads it via `auth.jwt() ->> 'user_role'`
([docs](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac)).
It removes the `profiles` lookup from every policy. **Reject it for v1.5**, for
one domain reason:

> A per-night assignment granted at 21:50 must be effective at 22:00. A JWT
> claim is stale until the token refreshes — up to an hour by default. An access
> model whose grants take effect *eventually* is not an access model for a door.

Presets could live in the JWT while assignments stay table-backed, but that is
two mechanisms with two staleness profiles answering one question, and the
`master` promotion path in the auth callback would then need a forced refresh.
Table lookups, wrapped in `(select …)` so the planner evaluates them once per
statement, are correct and — at four profiles — free. Revisit only when a
slow-query log says to.

---

## 5. Pattern: per-night grants in RLS without unreadable or slow policies

Supabase's documented performance rules, applied:

1. **Wrap function calls in a sub-select** so the optimizer caches them as an
   initPlan instead of calling per row: `(select public.has_capability('x'))`.
   The repo already does this (`20260224_rbac_migration.sql:151`) — keep the habit.
2. **Never join inside a policy.** Supabase's own before/after example replaces a
   correlated join with a set-based `col in (select …)`. That is exactly the
   shape `assigned_parties()` produces.

The policy then reads in two lines, which is the readability requirement:

```sql
create policy tickets_checkin_staff on public.tickets
for update to authenticated
using (
  (select public.has_capability('ticket.checkin'))                    -- globally allowed
  or party_id in (select public.assigned_parties('ticket.checkin'))   -- or tonight
);
```

"Globally allowed, or assigned to this night." Anyone can audit that.

### Indexing this implies — and a gap that already exists

The filter inside `assigned_parties` is `profile_id = auth.uid()`, so
`profile_id` must lead:

```sql
create index idx_staff_assignments_lookup
  on public.staff_assignments (profile_id, role_key)
  include (party_id)
  where revoked_at is null;

create index idx_staff_assignments_by_party
  on public.staff_assignments (party_id) where revoked_at is null;   -- roster view
```

And the **target** tables need `party_id` indexed, or `party_id in (…)`
degrades to a sequential scan on every door query. Verified missing today:

| Table | `party_id` index | Status |
|---|---|---|
| `tickets` | none — only `(event_id)`, `(user_id)`, `(tier_id)`, `(checked_in, event_id)` | **Missing — add** |
| `guest_list_entries` | none — only `(event_id)`, `lower(email)`, `(status)` | **Missing — add** |
| `rsvps` | `(checked_in, party_id)` — `party_id` is not the leading column | **Effectively missing — add** |
| `drink_items` | `(party_id)` present | OK |
| `event_parties` | `(event_id)` present; needs `(format_key, date desc)` for §6 | Extend |

Not a theoretical optimisation. `supabase-data.md` states the rule in the terms
that matter here: *alla porta, una query lenta è una fila.*

### Assignment integrity

- **`staff.assign` is itself a capability.** Grant and revoke go through the DAL
  and are subject to RLS on `staff_assignments`.
- **No self-grant.** A `WITH CHECK` excluding `profile_id = auth.uid()` unless
  the grantor already holds the capability globally. Self-assignment is the
  obvious escalation path in any per-resource grant model, and
  `access-gating.md` already forbids any route by which a user raises their own
  privileges.
- **Revoke by setting `revoked_at`, never `DELETE`.** An assignment answers "who
  was on the door that night" — audit information for undo attribution.
  `checkin-offline.md` already requires undo to record who and when; the same
  reasoning applies to the grant itself.
- **A revoked assignment must not strand a queued scan.** Revocation affects
  future authorization, not check-ins already taken offline under a valid grant.
  The sync endpoint validates the grant *as of the scan timestamp*, or the
  door's asymmetry is violated after the fact.

---

## 6. Formats on the party, with monotone numbering

```sql
create table public.formats (
  key        text primary key,               -- the sigla root
  label      text not null,
  scoped     boolean not null default false, -- true = numbering runs per scope
  sort_order smallint not null default 0,
  is_active  boolean not null default true
);

alter table public.event_parties
  add column if not exists format_key    text references public.formats(key),
  add column if not exists series_scope  text,     -- opaque key — see the warning below
  add column if not exists series_number integer;

-- composed by Postgres, never hand-written in TypeScript
alter table public.event_parties
  add column if not exists series_code text
  generated always as (
    format_key || coalesce('-' || series_scope, '') ||
    '-' || lpad(series_number::text, 3, '0')
  ) stored;

create unique index if not exists uq_event_parties_series
  on public.event_parties (format_key, coalesce(series_scope, ''), series_number);

create index if not exists idx_event_parties_format_date
  on public.event_parties (format_key, date desc);
```

`format_key` is nullable, so existing parties are unaffected — the
`supabase-data.md` gate on adding columns to a populated table is satisfied by
construction: existing rows mean "no format assigned," which is true.

### Numbering must come from a counter, not from `max() + 1`

`production-calendar.md` and `meta-gates.md` both classify series numbering as a
**monotone guard**: *un progressivo assegnato è già su una locandina. Si aggiunge
in coda, non si rinumera.* `select max(series_number) + 1` violates that the
first time a party is deleted — the number is handed out twice, and the second
poster contradicts the first.

```sql
create table public.series_counters (
  format_key   text not null references public.formats(key),
  series_scope text not null default '',
  next_number  integer not null default 1,
  primary key (format_key, series_scope)
);

create or replace function public.next_series_number(fk text, scope text default '')
returns integer language sql volatile security definer set search_path = '' as $$
  insert into public.series_counters (format_key, series_scope, next_number)
  values (fk, coalesce(scope, ''), 2)
  on conflict (format_key, series_scope)
    do update set next_number = public.series_counters.next_number + 1
  returning next_number - 1;
$$;
```

Atomic under concurrency, never reuses a number, and a deleted party leaves a
hole rather than a collision — which is correct: the hole is a fact about what
was published.

### Cross-domain warning — series scope and venue secrecy

`event_parties` is readable by anonymous visitors whenever its event is published
(`20260225150000_party_architecture.sql:31-37`), and `series_code` is a generated
column on that same table.

**If `series_scope` encodes a venue, publishing a party makes its scope public.**
For a party with `venue_secret = true` that is a venue reveal through a column
nobody thought of as a venue column — and the reveal is a one-way switch that no
code can walk back. Two requirements:

1. `series_scope` is an **opaque key**, never a venue name or slug.
2. The public read path must not expose `series_code` for a party whose venue is
   still secret — omit the column via a view, or expose the code only once the
   party's venue is public.

`supabase-data.md`: *prima di aggiungere una colonna a una tabella con policy di
lettura pubblica, verifica che il suo contenuto possa essere pubblico.* This is
that check, and it fails by default.

---

## 7. Realtime beside the offline cache — the freshener, never the decision path

### The rule, stated as a rejection

> **Any design in which the door scanner waits on, checks, or is disabled by a
> realtime connection is rejected outright.** The verdict is produced from
> IndexedDB, and the flash and the haptic fire before any socket is consulted. A
> scanner that behaves differently when the socket is down has moved the decision
> onto the network — the single thing the offline layer exists to prevent.

Rejected, not "discouraged":

- `await channel.subscribe()` anywhere on the scan path.
- Gating the scan button, the party selector, or the verdict on connection state.
- Deriving "already checked in" from an inbound realtime message rather than from
  the local record.
- **Reusing the door's optimistic queue for the bar.** The bar's default is the
  opposite — *nessun drink risulta servito senza conferma del server*
  (PROJECT.md v1.5). One shared "offline mutation queue" abstraction has one
  default and would silently impose it on the other. Two components, two
  defaults, no shared abstraction.

### The bug to fix *before* Realtime lands

`src/lib/offline/checkin-store.ts:84-130` — `cacheAttendees()` deletes every row
for the party and re-inserts from the server payload, including
`checkedIn: a.checkedIn`. `ScannerClient.tsx:170` calls it on every refresh, and
only *afterwards* (`:178`) calls `syncPendingCheckins()`.

So a scan taken offline and still sitting in `pendingCheckins` has its attendee
row reverted to `checkedIn: false` by the next refresh. The queue survives (a
separate object store), so the check-in is not lost — but staff see an admitted
guest as not admitted, and a re-scan reports a duplicate that is not one.

Realtime widens this window from "once per refresh" to "on every inbound
message." **Fix first:** every write into `attendees` consults `pendingCheckins`
and refuses to lower `checkedIn` for a row with a pending entry.

```ts
// checkin-store.ts — the invariant every cache write must respect
async function applyRemote(tx, row: RemoteAttendee) {
  const pending = await tx.objectStore("pendingCheckins").get(row.ticketId);
  const local   = await tx.objectStore("attendees").get(row.ticketId);
  await tx.objectStore("attendees").put({
    ...row,
    // a local pending check-in is authoritative until it syncs
    checkedIn:   pending ? true : row.checkedIn,
    checkedInAt: pending ? (local?.checkedInAt ?? pending.checkedInAt) : row.checkedInAt,
  });
}
```

### Transport: Broadcast from the database, not `postgres_changes`

Supabase's current guidance is to migrate off `postgres_changes` to Broadcast
triggered from the database
([realtime getting started](https://supabase.com/docs/guides/realtime/getting_started)).
Here the decisive reason is not scale — it is **authorization**:

- `postgres_changes` re-evaluates RLS per subscriber per change, on `tickets`, at
  the moment a door is busiest.
- Broadcast on a **private channel** is authorized once, by an RLS policy on
  `realtime.messages` keyed on the topic. Which means the per-night assignment
  model gates the channel with **the same function** that gates the rows:

```sql
create policy attendance_channel_read on realtime.messages
for select to authenticated
using (
  topic like 'party:%:attendance'
  and (
    (select public.has_capability('ticket.checkin'))
    or split_part(topic, ':', 2)::uuid in (select public.assigned_parties('ticket.checkin'))
  )
);
```

That is the third caller of `assigned_parties()` — page, policy, channel — and
the reason the capability layer must exist before Realtime is planned, not
alongside it.

Trigger side:

```sql
create or replace function public.broadcast_attendance_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.broadcast_changes(
    'party:' || coalesce(new.party_id, old.party_id)::text || ':attendance',
    tg_op, tg_op, tg_table_name, tg_table_schema, new, old
  );
  return null;
end; $$;
```

### Client contract

```ts
// src/lib/offline/attendance-realtime.ts — cache writes ONLY
export function subscribeAttendance(partyId: string, onCacheUpdated: () => void) {
  supabase.realtime.setAuth();                       // required for private channels
  const channel = supabase
    .channel(`party:${partyId}:attendance`, { config: { private: true } })
    .on("broadcast", { event: "UPDATE" }, (m) => applyRemote(m.payload.record).then(onCacheUpdated))
    .on("broadcast", { event: "INSERT" }, (m) => applyRemote(m.payload.record).then(onCacheUpdated))
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") backfill(partyId);   // close the gap after a drop
      if (err) showStaffBanner("Live updates offline — scanning still works");
    });
  return () => supabase.removeChannel(channel);
}
```

Four non-negotiables encoded above:

1. **Backfill on every `SUBSCRIBED`.** A reconnect means messages were missed; a
   delta stream with a gap is worse than no stream, because it looks fresh.
2. **Ordering.** Carry a monotonic `updated_at` and drop any message older than
   the row it would overwrite. Broadcast does not guarantee ordering.
3. **The error is shown to the staff present.** `checkin-offline.md`: the project
   has no error tracking, so the person at the door is the only observer that
   exists. The banner says *scanning still works* — because it does, and because
   a staff member who believes otherwise will stop using it.
4. **`catch {}` is banned on this path.** `sync-manager.ts:70` swallows every sync
   failure into an empty catch, and `ScannerClient.tsx:146,185` comment their own
   catches as "silently fail." That is the newsletter anti-pattern from
   `CONCERNS.md`, on the door. Realtime work should reduce that count, not add a
   fifth.

### Duplicate scans

PROJECT.md v1.5 requires duplicates to be *reported instead of silently accepted*.
Two independent detectors, both local-first:

- **Same device:** the attendee row already has `checkedIn: true` → report it,
  **and still admit**. The door's asymmetry holds: a false refusal happens in
  front of a queue; a double entry is a wrong number in a report.
- **Two devices, both offline:** neither can know. Detection happens at sync,
  server-side, and the result must return to the staff UI as a listed collision.
  `sync-manager.ts:39-42` currently treats HTTP 409 as success and calls
  `markSynced()` — exactly the silent winner-picking `checkin-offline.md` forbids.
  **Modify:** record the collision, surface it, then mark synced.

---

## 8. Migration path from URL-encoded roles, with URLs that must keep working

Both legacy prefixes collapse into `/staff` and both keep working via
`next.config.ts` `redirects()` — evaluated before `proxy.ts`, no auth involved,
no code:

```ts
async redirects() {
  return [
    { source: "/admin",            destination: "/staff",        permanent: true },
    { source: "/admin/:path*",     destination: "/staff/:path*", permanent: true },
    { source: "/organizer",        destination: "/staff",        permanent: true },
    { source: "/organizer/:path*", destination: "/staff/:path*", permanent: true },
  ];
}
```

Because the trees are near-identical, the segments after the prefix map 1:1 for
the 13 duplicated routes. Routes that exist under only one prefix (`finance`,
`newsletter`, `analytics/*`, `members/growth` — admin only) land on `/staff/*`
and are gated by capability rather than by prefix. That is the whole point.

### The door URL is a hard constraint and gets its own step

`/admin/scanner` is the one URL that may be on a staff phone's home screen and
may be opened **with no network**. A 308 redirect requires the network.
Therefore:

- The door does **not** move in the same phase as the staff tree.
- Its final home is a short, permanent path (`/door`) that will not be
  reorganised again.
- The move ships together with a Serwist precached navigation rule resolving the
  legacy path from the cache, so an offline home-screen launch still lands on the
  scanner. Without that rule, the migration is a network-dependent door — which
  fails the offline-first gate and must be rejected on those grounds.
- Verification is not `npm run build`. It is: install to home screen from the old
  URL, airplane mode, launch, scan. Executed and recorded in the phase
  `VERIFICATION.md` with what was observed.

### Sequence, and what is reversible at each step

| Step | Change | Reversible by |
|---|---|---|
| A | Capability tables + functions, seeded to reproduce today's behaviour exactly; `is_master()` / `is_admin_or_organizer()` redefined | one `create or replace` back |
| B | DAL + `getViewer()`; per-file replacement of the 45 `x-user-role` reads | per file; each is independent |
| C | `middleware.ts` → `proxy.ts`; profiles query and header injection deleted | git revert; nothing depends on it once B is done |
| D | `/staff` tree created, 59 old page files deleted, `redirects()` added | the redirects keep old URLs alive either way |
| E | Per-night assignments: table, policies, indexes, UI | an empty assignments table = behaviour identical to A |
| F | Formats + numbering | `format_key` nullable; null = today |
| G | Realtime freshener | remove the subscription; the cache path is unchanged |

Step B is the only one touching 45 files, and it is mechanical: replace
`headersList.get("x-user-role")` with `await getViewer()` /
`await requireCapability(...)`. It can be split across plans by directory without
breaking the build at any point, because `getViewer()` and the header can coexist
during the transition — but **step C must not ship until B is complete**, or the
surviving header readers get `null` and every staff page redirects to
`/dashboard`.

---

## 9. Data flow changes

### A staff page request

```
BEFORE
  request → middleware: getUser() + SELECT profiles   (on every matched request)
          → inject x-user-role / x-user-status / x-user-id
          → page: headers().get("x-user-role"); role !== "master" ? redirect : render
          → query with RLS-bound client; is_admin_or_organizer() decides the rows

AFTER
  request → proxy: getUser() only; anonymous → /login
          → page: requireCapability('finance.read')
                    ├─ getViewer()   [cache()d — 1 query per request]
                    └─ rpc can()     [the same SQL the policy calls]
          → DAL module queries with the RLS-bound client
          → RLS: has_capability(...) OR party_id in assigned_parties(...)
```

### A check-in at the door

```
BEFORE                                   AFTER
scan                                     scan
 └─ IndexedDB lookup                      └─ IndexedDB lookup            ← unchanged
 └─ verdict + flash + haptic              └─ verdict + flash + haptic    ← unchanged
 └─ checkInLocally() → pending queue      └─ checkInLocally() → pending queue
 └─ refresh clears + rewrites cache,      └─ applyRemote() honours pending
    reverting pending rows  (bug)            (bug fixed)
                                          └─ broadcast msg → applyRemote → cache
                                          └─ sync: 409 → RECORDED and SHOWN,
                                             then marked synced
```

The decision arrow is identical in both columns. **That is the acceptance
criterion for the whole realtime workstream.**

### Creating a party (new flow)

```
organizer picks a format   → formats table
save                       → next_series_number(format_key, series_scope)  [atomic]
                           → event_parties.series_number stored
                           → series_code generated by Postgres, never composed in TS
                           → public read of series_code suppressed while venue_secret
```

---

## 10. Anti-patterns

### Anti-pattern 1: keeping the role in a request header

**What people do:** middleware resolves the role once and injects it as a header
so pages don't repeat the query.
**Why it's wrong:** the header is overwritten only on the authenticated branch
(`src/lib/supabase/middleware.ts:122-127`), so on the anonymous branch the
client's own value survives; and a Server Action is a separate entry point that
Next.js explicitly says must re-verify. It turns an optimistic UX signal into 45
authorization decisions.
**Instead:** `getViewer()` in a `server-only` DAL, wrapped in React `cache()`.
Same query count, no trust boundary crossed.

### Anti-pattern 2: writing the capability rule twice

**What people do:** a TypeScript `canRefund(role)` helper next to an RLS policy
expressing the same rule in SQL.
**Why it's wrong:** they drift on the first exception, silently.
**Instead:** one SQL function; RLS uses it directly, the app calls it by `rpc`.
Where a row exists, prefer letting RLS answer by returning nothing.

### Anti-pattern 3: `service_role` as the escape hatch for a hard policy

**What people do:** RLS blocks a legitimate staff query, so the action reaches for
`getServiceClient()` — already the case in `admin/finance/actions.ts:6`,
`admin/members/actions.ts:11`, `organizer/events/actions.ts:12`,
`organizer/events/[id]/tickets/actions.ts:7`.
**Why it's wrong:** it bypasses every policy, so the capability model stops being
the boundary for exactly the operations that need it most (refunds, role
changes). Combined with a header-based guard, the boundary is gone entirely.
**Instead:** the capability model should make the policy expressible, so the
service client can leave these paths. Where it genuinely cannot (cross-user
writes, webhook reconciliation), keep it, justify it in the commit per
`access-gating.md`, and prove no untrusted input reaches it.

### Anti-pattern 4: the layout as the only gate

**What people do:** one `requireCapability()` in `(staff)/layout.tsx` and none in
the pages.
**Why it's wrong:** layouts do not re-execute on every child navigation, and a
page's RSC payload is independently requestable. The layout controls the shell,
not access.
**Instead:** layout for the shell and the coarse gate; every page, action and
route handler re-checks; RLS decides the rows.

### Anti-pattern 5: a generic offline mutation queue

**What people do:** notice that door and bar both mutate while flaky and build one
queue for both.
**Why it's wrong:** their defaults are opposite by design — at the door, when in
doubt admit and record; at the bar, when in doubt record nothing.
**Instead:** the bar path stays server-confirmed. The door queue stays the door's.

### Anti-pattern 6: numbering a series with `max() + 1`

**What people do:** compute the next series number from the existing rows.
**Why it's wrong:** it reuses a number after a delete, and the number is already
printed.
**Instead:** an atomic counter table. Holes are correct; reuse is not.

### Anti-pattern 7: treating realtime connection state as door state

**What people do:** disable scanning, grey the button, or show a blocking error
when the channel drops.
**Why it's wrong:** it reintroduces the network into the decision path through
the UI instead of through the code.
**Instead:** the connection indicator is information. The scanner never reads it.

---

## 11. Scaling considerations

Production data is 2 events, 3 parties, 1 ticket, 4 profiles. Nothing here is a
throughput problem; the bottleneck that matters is **at one door on one night**,
not across users.

| Scale | Adjustment |
|---|---|
| Today (single-digit rows) | Table-backed capability lookups. No JWT claims. No caching beyond React `cache()`. |
| A few hundred attendees per night | The `party_id` indexes in §5 stop being hygiene and start being latency. Add them now, not then. |
| Multiple simultaneous doors | Broadcast (not `postgres_changes`) is already right; per-party topics keep fan-out bounded to the staff on that party. |
| If `profiles` lookups appear in slow queries | *Then* consider the JWT custom-claim hook for the **preset only**, keeping assignments table-backed. Not before, and never for assignments. |

**First bottleneck:** `party_id in (select assigned_parties(...))` against
`tickets` with no index on `tickets.party_id` — a sequential scan on the busiest
query of the night. One index fixes it.

**Second bottleneck:** the door's initial cache load. `ScannerClient.tsx:171-175`
fetches `/api/membership/list` — *all* members — to enable offline membership
verification. That grows with the community, not with the night, and it needs a
bound (approved members only, or paginated) before it becomes a two-minute wait
on venue wifi with the doors open.

---

## 12. Integration points

### External services

| Service | Integration pattern | v1.5 impact |
|---|---|---|
| Supabase Auth | `@supabase/ssr` cookie session; `getUser()` in proxy and DAL | Proxy stops querying `profiles`; that query moves into `getViewer()` |
| Supabase Postgres / RLS | Policies call `has_capability` / `assigned_parties` | ~40 existing policies keep working via the redefined helpers |
| Supabase Realtime | **New.** Private channel, Broadcast from DB triggers, RLS on `realtime.messages` | Needs `supabase.realtime.setAuth()`; `@supabase/supabase-js` ^2.97 already supports it |
| SumUp | Webhook + GET-verify, service-role writes | Untouched, but `finance.refund` becomes the capability guarding the in-app refund path currently guarded by a header |
| Resend | Transactional + venue reveal | Untouched. `venue.reveal` documents who may trigger an early reveal; the one-way switch stays one-way |
| Serwist SW | Precache + offline shell | **Touched** by the door URL move. Part of the door step, not the routing step |

### Internal boundaries

| Boundary | Communication | Considerations |
|---|---|---|
| `proxy.ts` ↔ pages | **Nothing.** Headers deleted | This is the change: the proxy stops being an information channel |
| page / action ↔ DAL | Direct import, `server-only` | Actions become wrappers; bodies leave the route groups so the tree collapse is a deletion |
| DAL ↔ Postgres | RLS-bound client + `rpc('can')` | The only two ways an authorization answer is produced |
| RLS ↔ realtime channel authz | Shared SQL functions | Channel and row agree because they call the same code |
| door client ↔ realtime | One-way, cache writes only | Realtime never returns a verdict; local pending always wins |
| door queue ↔ bar flow | **No shared abstraction** | Opposite defaults by design |

---

## 13. Build order

Ordered by dependency. Each entry states what makes it impossible to move earlier.

**0 — Door cache correctness (`applyRemote` / pending-wins).**
Independent of everything else. Small, isolated, protects the door immediately.
*Blocks 6: Realtime widens the exact window this bug opens.*

**1 — Capability model in the database.**
Enum, `staff_roles`, `role_capabilities`, `staff_assignments`,
`has_capability` / `assigned_parties` / `can`, indexes, seeds reproducing today's
behaviour exactly, `is_master()` / `is_admin_or_organizer()` redefined.
**No application change.** Verification is that the app behaves identically after.
*Blocks 2, 4, 6. Cannot move later: the DAL in step 2 calls these functions;
without them the DAL would reimplement the rules — the drift this milestone
exists to remove.*

**2 — Server DAL and removal of header trust.**
`src/lib/auth/dal.ts`; the 8 action bodies moved into `src/lib/<domain>/` with
`server-only`; the 45 `x-user-role` readers converted; then `middleware.ts` →
`proxy.ts` with the profiles query and header injection deleted.
**This is where the finance-action hole closes.**
*Cannot move later: collapsing the routes first would carry the header pattern
into the new tree and require doing this work twice.*

**3 — Unified `/staff` tree.**
One copy of the 13 routes importing the step-2 DAL modules; capability-driven
`StaffNav`; `redirects()` for both legacy prefixes; the 59 old page files deleted.
**The door route is explicitly excluded.**
*Cannot move earlier: the pages have nothing to call until step 2 exists.*

**4 — Per-night assignments.**
Policies wired onto the door tables, assignment UI under `/staff/assignments`,
revoke-by-timestamp, no self-grant, grant validated as of the scan timestamp.
*Cannot move earlier: needs 1 for the functions and 2/3 for a place to live.*

**5 — Formats and series numbering.**
`formats`, `series_counters`, the `event_parties` columns, the sticky format
filter, the secrecy suppression on `series_code`.
*Placed after 3 for a practical reason, not a technical one: it edits the event
editor pages, and doing it before the collapse means editing them twice, in two
trees — the exact cost this milestone is paying to eliminate.*

**6 — Realtime attendance freshener.**
Trigger, `realtime.messages` policy reusing `assigned_parties`, client
subscription, backfill on reconnect, collision reporting in `sync-manager`.
*Cannot move earlier: needs 0 (correctness), needs 1 (channel authorization),
needs 4 for a per-night channel scope to mean anything.*

**7 — Door URL move + remaining door/bar defect fixes.**
`/door` with the Serwist precached legacy-path rule; duplicate reporting;
refunded-ticket admit-and-flag; no-drink-without-server-confirmation.
*Separated from 3 because the door's URL is an offline constraint, not a routing
preference. The duplicate work depends on 0.*

**Design system and shared primitives (the other half of v1.5): after 3.**
Adopting eight primitives across two duplicated trees means adopting them sixteen
times and diverging again. The collapse is what makes the primitive work cost
what it is supposed to cost.

### Verification, in a repo with no test runner

There is no `test` script and no `*.test.*` file. `npm run build` (which runs the
Next typecheck) is the automatic gate; everything else is a written manual
procedure. Minimum evidence per step for `VERIFICATION.md`:

- **1** — a SQL transcript showing each seeded role returning the same
  `has_capability` answers that `is_master()` / `is_admin_or_organizer()` return
  today, plus `EXPLAIN` on one door query showing an index scan.
- **2** — a recorded attempt to invoke a money-path action with a forged
  `x-user-role` header, before and after, with the observed responses.
- **3** — each of the four legacy URL shapes followed to its `/staff` target,
  with the resulting status codes.
- **4** — grant, act, revoke, act again, with the observed denial; plus a
  self-grant attempt that fails.
- **6 / 7** — the airplane-mode pass: install to home screen from the legacy URL,
  network off, launch, scan, verdict observed, queue observed, network on, sync
  observed, collision observed. On the device, that day, with that account.

---

## Confidence and gaps

| Claim | Confidence | Basis |
|---|---|---|
| Server actions must re-verify; the DAL is the recommended home | **HIGH** | Next.js data-security guide, v16.3.0, updated 2026-06-17 |
| `middleware.ts` → `proxy.ts` in Next.js 16; no edge runtime in `proxy` | **HIGH** | Next.js 16 upgrade guide + codemod |
| Supabase RBAC via a callable SQL function; `(select fn())` initPlan; no joins in policies; index policy columns | **HIGH** | Supabase RLS, RBAC and RLS-performance docs |
| Broadcast-from-database preferred over `postgres_changes`; private channels authorized by RLS on `realtime.messages` | **HIGH** | Supabase Realtime getting-started + realtime prompt guide |
| Every repo fact in §0 and every `file:line` cited | **HIGH** | Read directly from the files |
| End-to-end exploitability of the header-spoof path | **MEDIUM** | The header gap and the action-as-endpoint property are both verified; obtaining a valid encrypted action ID was not attempted and is a real (rotating, per-build) obstacle. Treated as Critical regardless |
| Layouts not re-executing on every child navigation | **MEDIUM** | Consistent with App Router router-cache behaviour; the stronger and certain point — pages are independently reachable — is sufficient for the recommendation |
| Which role presets exist and what each may do | **OPEN** | A product decision, not a research finding. The schema makes presets data, not code: adding one is an insert |
| Whether a scoped format shares a counter with its format or holds its own | **OPEN** | `series_scope` supports both; the decision belongs to the production owner |
| Whether `venue.reveal` should be a capability at all, or stay cron-only | **OPEN** | Adding a human-triggerable path to a one-way switch is a decision that needs stating, not defaulting |

## Sources

- Next.js — How to think about data security (v16.3.0, updated 2026-06-17) — https://nextjs.org/docs/app/guides/data-security
- Next.js — Authentication (optimistic vs secure checks) — https://nextjs.org/docs/app/guides/authentication
- Next.js — Upgrading to version 16 (`middleware` → `proxy`) — https://nextjs.org/docs/app/guides/upgrading/version-16
- Supabase — Custom Claims & Role-based Access Control — https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac
- Supabase — Row Level Security (security definer functions, join removal) — https://supabase.com/docs/guides/auth/row-level-security
- Supabase — RLS performance and best practices — https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
- Supabase — Realtime getting started (Broadcast from database) — https://supabase.com/docs/guides/realtime/getting_started
- Repo, read 2026-08-05: `src/lib/supabase/middleware.ts`, `src/middleware.ts`, `src/lib/rbac/roles.ts`, `src/lib/offline/{checkin-store,sync-manager}.ts`, `src/app/(admin)/admin/**`, `src/app/(organizer)/organizer/**`, `src/app/(admin)/admin/scanner/ScannerClient.tsx`, `src/components/staff/StaffNav.tsx`, `supabase/migrations/**`, `supabase/schema.sql`, `package.json`
- Project gates: `.claude/rules/{access-gating,supabase-data,checkin-offline,meta-gates,production-calendar}.md`

---
*Architecture research for: v1.5 — unified work surface, capability access model, formats, realtime attendance*
*Researched: 2026-08-05*
