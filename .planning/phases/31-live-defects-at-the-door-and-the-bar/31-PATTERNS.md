# Phase 31: Live Defects at the Door and the Bar — Pattern Map

**Mapped:** 2026-08-05
**Files analyzed:** 17 (5 new, 12 modified)
**Analogs found:** 14 / 17 (3 have no in-repo analog — listed at the end)

> **This repository is public.** Every excerpt below is code already published in
> this repo. No member name, no email address, no unannounced date, no venue under
> negotiation appears here. Where an example needs a person, it names a **role**.

> **Sources of the file list:** `31-RESEARCH.md` § *Architectural Responsibility
> Map*, § *Validation Architecture → Wave 0 gaps*, and the owner-locked decisions
> carried in the planning prompt (Option B for the refund; the review list under
> the **organizer** tree; `party_id` on `attendances`).

---

## File Classification

| New/Modified file | New? | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|---|
| `src/lib/door/outcome.ts` | **new** | shared type contract | transform (pure) | `src/types/database.ts:236-253` + `src/lib/rbac/roles.ts:1-33` | role-match |
| `supabase/migrations/<ts>_door_scan_events.sql` | **new** | migration (table + RLS) | schema DDL | `supabase/migrations/20260310000000_guest_list.sql:11-86` | **exact** |
| …same file: refund evidence on `ticket_refunds` (Option B) | **new** | migration (ALTER + FK swap) | schema DDL | `20260226300000_multi_sub_events.sql:11-17,54-67` + `20260310100000_discount_codes.sql:41-44` | **exact** |
| …same file: `party_id` on `public.attendances` | **new** | migration (nullable column + unique rework) | schema DDL | `20260226300000_multi_sub_events.sql:54-67` | **exact** |
| `src/types/database.ts` | modified | model / types | transform | itself — `TicketRefund:174-187`, `GuestListEntry:255-271`, `Attendance:67-73` | **exact** |
| `src/app/sw.ts` | modified | config (service worker) | request-response caching | **none in repo** — library pattern only | none |
| `src/lib/offline/checkin-store.ts` | modified | store (IndexedDB) | file-I/O / durable queue | itself — `cacheAttendees:84-130`, `upgrade:59-77` | self-only |
| `src/lib/offline/sync-manager.ts` | modified | service (queue drain) | batch | `src/app/api/cron/reconcile-refunds/route.ts:95-127` (per-item progress) | partial |
| `src/app/api/tickets/checkin/route.ts` | modified | route handler | request-response | `src/app/api/tickets/attendance/route.ts:6-28,120,200-235` | **exact** |
| `src/app/api/membership/verify/route.ts` | modified | route handler | request-response | same as above, plus its own `23505` branch `:124-141` | **exact** |
| `src/app/api/tickets/attendance/route.ts` | modified | route handler | request-response (payload) | itself — `:116-134` | **exact** |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` | modified | client component | event-driven | itself — `:84-89, 101-135, 345-479, 858-868` | self-only |
| `src/components/scanner/ScanFlash.tsx` | modified | presentational component | event-driven | itself — `:5-34` (the semantic `type` prop) | **exact** |
| `src/utils/haptics.ts` | modified | utility | event-driven | itself — `:3-13` | **exact** |
| `src/utils/datetime.ts` | modified (`partyEndInstant`) | utility | transform | itself — `menuCloseInstant:66-82` | **exact** |
| `src/app/(organizer)/organizer/events/[id]/<review>/page.tsx` | **new** | page (server component) | CRUD read | `…/events/[id]/sales/page.tsx:1-50,170-203` | **exact** |
| `…/<review>/ReviewListClient.tsx` | **new** | client component | CRUD read | `…/events/[id]/guest-list/page.tsx:1-12,45-80` + its `GuestListClient` split | **exact** |
| refund writers: `src/app/(public)/tickets/refund-actions.ts`, `src/app/(admin)/admin/finance/actions.ts`, `src/app/api/cron/reconcile-refunds/route.ts` | modified | server action / cron | CRUD write | `refund-actions.ts:128-141` and `reconcile-refunds/route.ts:109-121` | **exact** |

---

## Pattern Assignments

### `src/lib/door/outcome.ts` (shared type contract, pure)

**Analog:** `src/types/database.ts` for the union/interface style, `src/lib/rbac/roles.ts` for the `as const` map.

**Union-of-string-literals pattern** (`src/types/database.ts:236, 255`):

```ts
export type DrinkTokenStatus = "purchased" | "active" | "redeemed" | "refunded";

export type GuestListStatus = 'pending' | 'invited' | 'registered' | 'ticket_issued' | 'checked_in' | 'already_has_ticket' | 'failed';
```

**Const-map pattern for the HTTP table** (`src/lib/rbac/roles.ts:6-18`):

```ts
// Role constants
export const ROLES = {
  MASTER: "master",
  ORGANIZER: "organizer",
  MEMBER: "member",
} as const;
```

**Re-export convention** (`src/lib/rbac/roles.ts:1-4`) — the repo already keeps a
domain module that re-exports the database types rather than duplicating them:

```ts
import type { UserRole, UserStatus } from "@/types/database";

// Re-export types for convenience
export type { UserRole, UserStatus };
```

**Notes for the planner:**
- There is **no discriminated union anywhere in this repo today** — every union is a
  flat string. `DoorOutcome` is the first. Keep the discriminant field named
  `outcome`, matching the `door_scan_events.outcome` column, so a row and a
  response never need translating.
- Path alias is `@/…` (`tsconfig` baseUrl `src`), used everywhere — e.g.
  `import { verifyTicketToken } from "@/utils/qr";` (`checkin/route.ts:4`).
- The three literal sets in this file (`outcome`, `reason`, `flags`) must be the
  same strings as the `CHECK` constraints in the migration. That duplication is
  the only automatic cross-check this phase gets: `next build` catches the TS side,
  the `CHECK` catches the SQL side, and they only agree if someone writes them once
  and copies.

---

### `supabase/migrations/<timestamp>_door_scan_events.sql` (migration, DDL + RLS)

**Analog:** `supabase/migrations/20260310000000_guest_list.sql` — the closest match
in the repo: a new table, its indexes, its RLS policies and a set of `ALTER TABLE`s
on existing tables, all in **one** transaction-wrapped file.

**Header + transaction wrapper** (`20260310000000_guest_list.sql:1-11`):

```sql
-- Guest List Management: schema migration
-- Phase 24, Plan 01: Database foundation
--
-- Changes:
-- 1. Add approved_via column to profiles
-- 2. Add ticket_type column to tickets
-- 3. Make tier_id nullable on tickets
-- 4. Create guest_list_entries table with indexes, unique constraint, and RLS
-- 5. Update handle_new_user() trigger for guest list auto-approval

BEGIN;
```

…and the file closes with `COMMIT;` at `:160`. Five migrations in this repo use the
`BEGIN;`/`COMMIT;` wrapper (`20260224_rbac_migration.sql`, `20260225000000`,
`20260225100000`, `20260225120000`, `20260310000000`). **Use it here** — this phase's
migration touches three tables and a half-applied version is worse than none.

**Table + `ON DELETE` choices** (`20260310000000_guest_list.sql:44-59`):

```sql
CREATE TABLE public.guest_list_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,
  party_id uuid REFERENCES public.event_parties ON DELETE CASCADE,
  ...
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invited', 'registered', 'ticket_issued', 'checked_in', 'already_has_ticket', 'failed')),
  ...
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes, including a partial one** (`:62-69`):

```sql
-- Unique constraint: one entry per email per event (case-insensitive)
CREATE UNIQUE INDEX guest_list_entries_event_email_unique
  ON public.guest_list_entries (event_id, LOWER(email))
  WHERE email IS NOT NULL;

-- Indexes
CREATE INDEX idx_guest_list_event_id ON public.guest_list_entries (event_id);
CREATE INDEX idx_guest_list_email ON public.guest_list_entries (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX idx_guest_list_status ON public.guest_list_entries (status);
```

**RLS in the same file** (`:71-86`) — this is the pattern `supabase-data.md`'s *gate
tabella nuova = policy nuova* names, and it is followed by every table migration in
the repo:

```sql
ALTER TABLE public.guest_list_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY guest_list_select_admin ON public.guest_list_entries
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

CREATE POLICY guest_list_insert_admin ON public.guest_list_entries
  FOR INSERT WITH CHECK ((SELECT public.is_admin_or_organizer()));
...
```

**Policy naming convention, stated in the repo itself** (`20260224_rbac_migration.sql:141-142`):

```sql
-- Naming convention: {table}_{operation}_{who}
-- Helper functions used instead of inline subqueries for performance.
```

So the new policy is `door_scan_events_select_admin` — not `select_door_events` or
anything else.

**The helper functions already exist — do not define new ones**
(`20260224_rbac_migration.sql:100-135`):

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

`get_user_role` (`:100-108`), `get_user_status` (`:110-118`), `is_master` (`:120-125`)
are all there. The wrapping-parentheses call form — `(SELECT public.is_admin_or_organizer())`
— is used at `20260224_rbac_migration.sql:151`, `20260227200000_ticket_refunds.sql:27`,
`20260310000000_guest_list.sql:77` and in `schema.sql:248`. Copy the parentheses.

**A second table with the same audience, for the shape of a mixed policy set**
(`20260227200000_ticket_refunds.sql:19-35`):

```sql
ALTER TABLE public.ticket_refunds ENABLE ROW LEVEL SECURITY;

-- Users can see their own refund requests
CREATE POLICY refunds_select_own ON public.ticket_refunds
  FOR SELECT USING (requested_by = auth.uid());

-- Admin/organizer can see all refund requests
CREATE POLICY refunds_select_admin ON public.ticket_refunds
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));
```

**Append-only is achieved by omission, and that must be commented.** No table in this
repo currently omits its write policies on purpose, so a reader will assume the
omission is a bug. Write the reason in the migration — and, per RESEARCH § Answer A,
also write that the `SELECT` policy is deliberately coarse until Phase 35 narrows it.

**Anti-pattern to avoid:** `20260310000000_guest_list.sql:55` — `ticket_id uuid
REFERENCES public.tickets(id)` with **no** `ON DELETE` clause, i.e. `NO ACTION`. That
omission is exactly the live defect in Answer E / Pitfall N5. `door_scan_events.ticket_id`
must carry an explicit `ON DELETE SET NULL`; a scan event outlives its ticket by design.

---

### …same migration: refund evidence on `ticket_refunds` (Option B)

**Analog A — adding a nullable FK column with an explicit `ON DELETE`**
(`20260310100000_discount_codes.sql:39-44`):

```sql
ALTER TABLE public.tickets
  ADD COLUMN discount_code_id uuid REFERENCES public.discount_codes ON DELETE SET NULL;

ALTER TABLE public.pending_purchases
  ADD COLUMN discount_code_id uuid REFERENCES public.discount_codes ON DELETE SET NULL;
```

**Analog B — the idempotent form the repo also uses** (`20260310000000_guest_list.sql:16-18`):

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_via text
    CHECK (approved_via IN ('referral', 'guest_list', 'admin_manual'));
```

`supabase-data.md` gate *idempotenza DDL* asks for the `IF NOT EXISTS` form. Seven
migrations use it. Use it here.

**Analog C — dropping and reshaping an existing constraint**
(`20260226300000_multi_sub_events.sql:56-67`):

```sql
-- Drop existing unique constraint
ALTER TABLE public.tickets DROP CONSTRAINT tickets_party_id_user_id_key;
```

The FK swap on `ticket_refunds.ticket_id` (`CASCADE` → `SET NULL`) is the same two
statements: `ALTER TABLE public.ticket_refunds DROP CONSTRAINT IF EXISTS
ticket_refunds_ticket_id_fkey;` then re-add with `ON DELETE SET NULL`. The
`DROP CONSTRAINT IF EXISTS` form is already used at
`20260508000000_drink_token_active_state.sql:8`.

**The three new evidence columns are deliberately NOT foreign keys.** That is the
owner's locked decision and it inverts the repo's default, so it needs a comment in
the migration saying why — the point of `refunded_ticket_id` is to survive the row it
names, which an FK would prevent. The existing column it replaces is
`20260227200000_ticket_refunds.sql:3`:

```sql
  ticket_id uuid NOT NULL REFERENCES public.tickets ON DELETE CASCADE,
```

**Backfill note (`supabase-data.md`, gate *default sulle righe esistenti*):** the
existing rows cannot be backfilled — their tickets are already gone. Say so in the
migration comment and in `31-VERIFICATION.md`; do not leave a reader to infer that
`refunded_ticket_id IS NULL` means something.

---

### …same migration: `party_id` on `public.attendances`

**Current definition** (`supabase/schema.sql:231-248`) — note that the RLS *is* here
for this one table, unusually, and it is `FOR ALL`:

```sql
create table public.attendances (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  checked_in_at timestamptz default now(),
  checked_in_by uuid references auth.users,
  unique(event_id, user_id)
);

alter table public.attendances enable row level security;

-- Admin/organizer can manage all attendances
create policy attendances_all_admin on public.attendances
  for all using ((select public.is_admin_or_organizer()));
```

**Analog — how this repo already splits a unique key across a nullable column**
(`20260226300000_multi_sub_events.sql:54-67`). This is the exact pattern the phase
needs, because Postgres treats NULLs as distinct and a single
`unique(event_id, user_id, party_id)` would silently allow unlimited duplicates on
the event-level rows:

```sql
ALTER TABLE public.tickets ALTER COLUMN party_id DROP NOT NULL;

-- Drop existing unique constraint
ALTER TABLE public.tickets DROP CONSTRAINT tickets_party_id_user_id_key;

-- Add partial unique for party-specific tickets
CREATE UNIQUE INDEX tickets_party_user_unique
  ON public.tickets (party_id, user_id)
  WHERE party_id IS NOT NULL;

-- Add partial unique for event-level (master) tickets
CREATE UNIQUE INDEX tickets_event_user_master_unique
  ON public.tickets (event_id, user_id)
  WHERE party_id IS NULL;
```

Applied to `attendances`: drop `attendances_event_id_user_id_key`, then two partial
unique indexes — `(party_id, user_id) WHERE party_id IS NOT NULL` and
`(event_id, user_id) WHERE party_id IS NULL`. The consumer of that constraint is
`membership/verify/route.ts:124-141`, which reads `23505` (see below) — its lookup
after the conflict must gain the same `party_id` predicate or it will fetch the wrong
row on a double bill.

**Index gate:** `supabase-data.md` requires an index on every lookup column. The
existing example is `20260228200000_ticket_checkin.sql:5`:

```sql
CREATE INDEX idx_tickets_checked_in ON public.tickets (checked_in, event_id);
```

---

### `src/types/database.ts` (model / types)

**Analog:** itself. The file is hand-written (271 lines), not generated, and one
interface per table, in table order.

**Interface pattern for a table with enum-ish columns** (`:174-187`):

```ts
export interface TicketRefund {
  id: string;
  ticket_id: string;
  requested_by: string;
  processed_by: string | null;
  reason: string | null;
  admin_note: string | null;
  amount: number;
  status: "pending" | "approved" | "rejected";
  sumup_status: "pending" | "completed" | "failed" | null;
  type: "user_request" | "admin_initiated";
  created_at: string;
  processed_at: string | null;
}
```

**Named union extracted when it is used elsewhere** (`:236-253`):

```ts
export type DrinkTokenStatus = "purchased" | "active" | "redeemed" | "refunded";

export interface DrinkToken {
  ...
  status: DrinkTokenStatus;
  activated_at: string | null;
  redeemed_at: string | null;
  refunded_at: string | null;
  created_at: string;
}
```

**Conventions to copy exactly:**
- `snake_case` field names — these mirror columns, not the camelCase used in the
  IndexedDB store or in API payloads. `checkin-store.ts` uses `checkedInAt`;
  `database.ts` uses `checked_in_at`. Do not unify them.
- Nullable columns are `| null`, never optional (`?`). Optional appears only in the
  IndexedDB value types.
- `timestamptz` → `string`, `numeric` → `number`, `uuid` → `string`.
- The three files that change in this phase — the migration, this file, and
  `src/lib/door/outcome.ts` — carry the same literal sets. Same commit, per
  `supabase-data.md` gate *tipi allineati*.

**`Attendance` needs the new column** (`:67-73`), and it is currently missing
`party_id` entirely:

```ts
export interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  checked_in_at: string;
  checked_in_by: string;
}
```

Note the two existing lies to fix while here: `checked_in_at` and `checked_in_by`
are nullable in SQL (`schema.sql:235-236` — one has a default, the other has no
`NOT NULL`) but typed non-nullable here. A type that lies is worse than no type.

---

### `src/lib/offline/checkin-store.ts` (store, IndexedDB)

**Analog:** itself — it is the only IndexedDB module in the repo. What follows is
what to preserve, and what is the defect.

**Schema declaration to extend** (`:12-48`) — note the key comments, which record
exactly the collision FIX-07 is about:

```ts
interface CheckinDB extends DBSchema {
  attendees: {
    key: string; // ticketId or guestListEntryId
    value: { ticketId: string; partyId: string; name: string; ... };
    indexes: { "by-party": string };
  };
  ...
  pendingCheckins: {
    key: string; // ticketId, guestListEntryId, or membership_code
    value: { id: string; type: "ticket" | "guest" | "membership"; checkedInAt: string; partyId: string };
  };
}
```

**Upgrade callback pattern** (`:50-81`) — currently create-if-absent only, with no
`oldVersion` branching, which is why the rekey needs a genuinely new shape:

```ts
const DB_NAME = "resonate-checkin";
const DB_VERSION = 2;

dbInstance = await openDB<CheckinDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("attendees")) {
      const store = db.createObjectStore("attendees", { keyPath: "ticketId" });
      store.createIndex("by-party", "partyId");
    }
    ...
  },
});
```

**Transaction pattern to keep** (`:98-129`) — one `db.transaction(...)`, only IDB
promises awaited inside, `await tx.done` last. That discipline is correct today and
must survive the merge rewrite:

```ts
const db = await getDB();
const tx = db.transaction("attendees", "readwrite");
...
await tx.done;
```

**The defect to remove — clear-then-insert** (`:101-107`, and `:232` for members):

```ts
  // Clear existing data for this party
  const index = tx.store.index("by-party");
  let cursor = await index.openCursor(partyId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
```

**Exported-function style to follow** — every export is a single-purpose `async
function` with a one-line JSDoc, taking a db handle from `getDB()` and returning a
plain value; there is no class and no singleton store object. Keep that. New
functions (`mergeAttendees`, `getDeviceId`, `markFailed`, `markBlocked`,
`bumpAttempts`) follow the same shape, e.g. (`:193-211`):

```ts
/** Get all pending (unsynced) check-ins. */
export async function getPendingCheckins(): Promise<CheckinDB["pendingCheckins"]["value"][]> {
  const db = await getDB();
  return db.getAll("pendingCheckins");
}

/** Remove a check-in from the pending queue after successful sync. */
export async function markSynced(ticketId: string): Promise<void> {
  const db = await getDB();
  await db.delete("pendingCheckins", ticketId);
}
```

`markSynced` takes the old bare id. Every caller changes when the key becomes
composite — `sync-manager.ts:38, 53, 65` and `checkin-store.ts:190`.

---

### `src/lib/offline/sync-manager.ts` (service, queue drain)

**Analog for the four-bucket rewrite:** there is no other queue drainer in the repo.
The closest **discipline** analog is the reconciliation cron, which demonstrates the
per-item progress rule that `ticketing-payments.md` names
(*gate cron non atomico*) — `src/app/api/cron/reconcile-refunds/route.ts:107-127`:

```ts
      if (isRefunded) {
        // Create refund record for audit trail
        await supabase.from("ticket_refunds").insert({ ... });

        // Delete the ticket
        await supabase.from("tickets").delete().eq("id", ticket.id);
        ticketsInvalidated++;
      }
    } catch {
      errors++;
    }
  }
```

Two things to copy: the per-item `try/catch` **inside** the loop (one bad entry never
aborts the drain), and the counters returned to the caller. Two things not to copy:
the bare `catch { errors++ }` collapses every cause into one number, which is the
`meta-gates.md` *zero fallimenti silenziosi* anti-pattern, and it is precisely what
FIX-08 forbids for the queue.

**The defect being replaced** (`sync-manager.ts:26-40`):

```ts
          const res = await fetch("/api/tickets/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticketId: checkin.id,
              partyId: checkin.partyId,
              offlineSync: true,
            }),
          });

          if (res.ok || res.status === 409) {
            // 409 = already checked in, which is fine for idempotent sync
            await markSynced(checkin.id);
            synced++;
          }
```

Three separate faults in fourteen lines: the bare `ticketId` (FIX-10), `res.ok`
against a route that returns 200 for conflicts (FIX-03), and no `else` at all — a
non-ok, non-409 response silently falls through to the next iteration and is retried
forever (FIX-08).

**Listener pattern to preserve and extend** (`:87-105`):

```ts
export function setupSyncListeners(): () => void {
  const onOnline = () => { syncPendingCheckins(); };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      syncPendingCheckins();
    }
  };

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => { ... };
}
```

The `isSyncing` re-entrancy guard (`:3, 11, 13, 74`) is the existing mutex — keep it
rather than adding a second scheduler (`RESEARCH.md` § *Don't Hand-Roll*).

---

### `src/app/api/tickets/checkin/route.ts` (route handler, request-response)

**Analog:** `src/app/api/tickets/attendance/route.ts` — same directory, same audience,
same service-client pattern, and it is the only route in the repo that already does
**three** of the things this phase needs: a factored auth guard, a real `409`, and the
NULL-tolerant party predicate.

**Auth guard, factored** (`attendance/route.ts:6-28`) — the check-in route inlines the
same twenty lines at `:8-27`; extract or import this shape:

```ts
async function verifyOrganizerRole() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "master" && profile.role !== "organizer")) {
    return { error: "Forbidden", status: 403 };
  }

  return { user, profile };
}
```

Call-site shape (`attendance/route.ts:35-41`):

```ts
  const auth = await verifyOrganizerRole();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
```

**The Event Pass fix — the analog is already in this file** (`attendance/route.ts:116-122`).
This is the pattern that `checkin/route.ts:63` must adopt, in both directions (the
cross-party check **and** the attendee query that feeds the offline cache):

```ts
      const { data: guestListEntries } = await serviceClient
        .from("guest_list_entries")
        .select("id, first_name, last_name, status, email")
        .eq("event_id", party.event_id)
        .or(`party_id.eq.${party.id},party_id.is.null`)
        .is("ticket_id", null)
        .not("status", "eq", "failed");
```

The defect it replaces (`checkin/route.ts:62-63`) — for an event-level ticket
(`party_id IS NULL`, a real product per `20260226300000_multi_sub_events.sql:65-67`)
this comparison is always true and the holder is refused:

```ts
    // Cross-event validation: if partyId provided, check ticket belongs to that party
    if (partyId && ticket.party_id !== partyId) {
```

Note the same gap on the read side: `attendance/route.ts:73` filters tickets with
`.eq("party_id", party.id)` and therefore never puts an event-level ticket in the
offline cache either. Both sides change together or the fix only works online.

**A genuine `409`, already in this repo** (`attendance/route.ts:214-219`) — this is
what `sync-manager.ts:36` was written against, and the check-in route never matched:

```ts
  if (entry.status === "checked_in") {
    return NextResponse.json(
      { error: "Guest already checked in", alreadyCheckedIn: true },
      { status: 409 }
    );
  }
```

**Body parsing with an explicit failure** (`attendance/route.ts:180-196`) — the
check-in route destructures an untyped body at `:29-30` with no `try`. ASVS V5 in
RESEARCH § Security Domain asks for validation; this is the in-repo shape to copy:

```ts
  let body: { guestListEntryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { guestListEntryId } = body;
  if (!guestListEntryId) {
    return NextResponse.json({ error: "guestListEntryId is required" }, { status: 400 });
  }
```

**Unique-violation handling** (`membership/verify/route.ts:124-141`) — the pattern the
`door_scan_events` insert and the `attendances` insert both need, and the one that
must gain a `party_id` predicate once the constraint changes:

```ts
    if (insertError) {
      // Unique constraint violation (already checked in)
      if (insertError.code === "23505") {
        // Fetch existing attendance to get checked_in_at
        const { data: existing } = await serviceClient
          .from("attendances")
          .select("id, checked_in_at")
          .eq("event_id", party.event_id)
          .eq("user_id", profile.id)
          .single();

        return NextResponse.json({ valid: true, status: "already_checked_in", ... });
      }

      console.error("Attendance insert error:", insertError);
      return NextResponse.json({ valid: false, error: "Failed to record attendance" }, { status: 500 });
    }
```

**Service client** (`src/lib/supabase/service.ts:1-8`) — eight lines, RLS-bypassing,
imported as `getServiceClient()`:

```ts
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

`access-gating.md` gate *service role*: each new call site is justified in writing in
the commit and must be unreachable from untrusted input. The `door_scan_events`
insert is a new call site.

**Anti-patterns visible in the analog — do not carry them forward:**

- `checkin/route.ts:50-56` destructures only `{ data: ticket }` from a `.single()`,
  discarding the error. `checkin-offline.md` gate *query a esito singolo*: zero rows
  and two rows are different failures and must be logged differently.
- `checkin/route.ts:112-119` performs the update with no error check at all — a failed
  write returns a green screen to the door.
- The five `NextResponse.json` calls with no status argument (`:41, 44, 59, 66, 101`)
  are the phase's root cause. Every new return carries an explicit status from
  `DOOR_HTTP`.
- `checkin/route.ts:96` `already_by_you: true` — produced, read by nothing. Delete it
  (RESEARCH § Answer B, consequence 1).

---

### `src/app/api/membership/verify/route.ts` (route handler, request-response)

**Analog:** the same file's own structure, plus the check-in route it must now agree
with. Two returns move to the shared contract:

`:94-96` — an unknown code returns **HTTP 200** with `valid: false`, which is the
exact `res.ok` trap on the membership path:

```ts
    if (!profile) {
      return NextResponse.json({ valid: false, status: "not_found" });
    }
```

`:135-140` — the conflict already carries the two facts `already_recorded` needs
(`at`, and the member), but not the operator; `attendances.checked_in_by` exists
(`schema.sql:236`) and is simply not selected:

```ts
        return NextResponse.json({
          valid: true,
          status: "already_checked_in",
          member_name: profile.full_name,
          checked_in_at: existing?.checked_in_at || null,
        });
```

---

### `src/app/api/tickets/attendance/route.ts` (route handler, payload)

**Analog:** itself. The payload shape the offline cache is built from (`:103-134`) —
the new fields (`checkedInBy`, `refundedAt`, `subjectType`) go here, in the same
camelCase, and the guest-list branch is where `checkedInAt: null` is hard-coded:

```ts
      const ticketAttendees = (attendeesData ?? []).map((t) => ({
        ticketId: t.id as string,
        guestListEntryId: null as string | null,
        name: profileMap.get(t.user_id as string) ?? "Unknown",
        checkedIn: t.checked_in as boolean,
        checkedInAt: t.checked_in_at as string | null,
        isGuestList: false,
        hasEmail: true,
        ticketType: (t.ticket_type as string) || "purchased",
        tierName: tierMap.get((t as unknown as { tier_id: string }).tier_id) || null,
      }));

      const guestListAttendees = (guestListEntries ?? []).map((g) => ({
        ...
        checkedIn: g.status === "checked_in",
        checkedInAt: null as string | null,
```

**Separate-fetch-then-map pattern** (`:77-101`) — this repo does **not** join profiles
through Supabase on these paths (there is an ambiguous FK through `auth.users`, noted
at `sales/page.tsx:81`); it fetches ids, then builds a `Map`:

```ts
      const userIds = [...new Set((attendeesData ?? []).map((t) => t.user_id).filter(Boolean))] as string[];
      const profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await serviceClient
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        for (const p of profiles ?? []) {
          profileMap.set(p.id, p.full_name ?? "Unknown");
        }
      }
```

Use exactly this for the operator label on `already_recorded` — and **only** for the
prose view (see FIX-12 under the review list).

---

### `src/app/(admin)/admin/scanner/ScannerClient.tsx` (client component, event-driven)

**Analog:** itself. 1,237 lines; the sections that change are below and nothing else
was read.

**Flash state to widen from two to three** (`:84-89`):

```ts
  // Flash overlay state
  const [flash, setFlash] = useState<{
    type: "success" | "error";
    title: string;
    subtitle?: string;
  } | null>(null);
```

**Online / pending effect** (`:101-135`) — the `pendingCount` already updates on a 5 s
interval regardless of connectivity; only the *rendering* is gated:

```ts
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  ...
    const updatePending = async () => {
      try {
        const count = await getPendingCount();
        setPendingCount(count);
      } catch {
        // IndexedDB not available
      }
    };
    updatePending();
    const interval = setInterval(updatePending, 5000);
```

**The status pill — the FIX-08 surface defect** (`:858-868`). The count lives only in
the `false` branch of the ternary:

```tsx
                  {isOnline ? (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Online
                    </span>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-medium text-yellow-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                      Offline{pendingCount > 0 ? ` (${pendingCount})` : ""}
                    </span>
                  )}
```

Copy the pill's class vocabulary — `bg-<colour>-500/15` fill, `text-<colour>-500`,
a `h-1.5 w-1.5 rounded-full` dot, `animate-pulse` when something is outstanding — for
the new pending / failed / blocked chips. **Note:** yellow-500 is already taken by
"Offline". The amber third scan state must not be confused with it; that is a design
decision for the plan to make explicitly, not to discover on the night.

**The offline branch** (`:345-404`) — where the local three outcomes are decided today,
and where "not in cache" is currently a **red refusal**, which the asymmetry in
`checkin-offline.md` forbids:

```ts
      if (TICKET_TOKEN_PATTERN.test(code)) {
        const ticketIdFromQR = code.split(".")[0];   // FIX-10: the signature is thrown away here

        // Offline flow: check IndexedDB cache
        if (!navigator.onLine) {
          try {
            const attendee = await findAttendee(ticketIdFromQR);
            if (attendee && !attendee.checkedIn) {
              await checkInLocally(ticketIdFromQR);
              ...
              showFlash("success", attendee.name, subtitle);
            } else if (attendee && attendee.checkedIn) {
              showFlash("error", "Already checked in", `${attendee.name}${time ? ` ${time}` : ""}`);
            } else {
              showFlash("error", "Ticket not found (offline)");
            }
```

**The online branch** (`:414-479`) — the `if (data.valid) … else if (data.status === …)`
chain that the discriminated union replaces with a `switch (data.outcome)`:

```ts
        if (data.valid) {
          ...
          showFlash("success", data.member_name, subtitle);
          markCheckedInLocally(ticketIdFromQR).catch(() => {});
        } else if (data.status === "wrong_event") {
          ...
        } else if (data.status === "already_checked_in") {
```

**The catch that produces "Connection error" for a duplicate** (`:597-622`):

```ts
    } catch {
      // Network error — try offline fallback for ticket tokens
      if (TICKET_TOKEN_PATTERN.test(code)) {
        ...
      }
      showFlash("error", "Connection error");
    }
```

**Fire-and-forget cache write** (`:168-176`) — `cacheAttendees(...).catch(() => {})`
means the merge guard's `{ applied: false }` currently has **nowhere to surface**.
A new state and a visible message are needed here, not a wider `.catch`:

```ts
          // Cache attendees in IndexedDB for offline (only full list, not search-filtered)
          if (eventData && !search) {
            cacheAttendees(selectedPartyId, eventData.attendees).catch(() => {});
```

**The token shape check** (`:24`) — the local `not_valid / unknown_code` test:

```ts
const TICKET_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/i;
```

---

### `src/components/scanner/ScanFlash.tsx` (presentational component)

**Analog:** itself — and it already has the right architecture, which is why RESEARCH
forbids passing a colour. The `type` prop is **semantic**; add a third value.

**Props and derived timing** (`:5-24`):

```ts
interface ScanFlashProps {
  type: "success" | "error";
  title: string;
  subtitle?: string;
  onDismiss: () => void;
}

  useEffect(() => {
    const delay = type === "success" ? 1500 : 2000;
    const timer = setTimeout(onDismiss, delay);
    return () => clearTimeout(timer);
  }, [type, onDismiss]);

  const isSuccess = type === "success";
```

**Container, colour and a11y** (`:26-34`):

```tsx
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center ${
        isSuccess ? "bg-green-500/90" : "bg-red-500/90"
      } animate-[flash-in_150ms_ease-out]`}
      onClick={onDismiss}
      role="status"
      aria-live="assertive"
    >
```

**Icon per state** (`:35-66`) — a 20×20 stroked SVG, `strokeWidth={2.5}`: a check for
success, an ✕ for error. The third state needs its **own** icon, per
`nextjs-architecture.md` — *«il colore non e' mai l'unico canale»*. `z-[70]` is
above the `z-[60]` modal layer; keep it.

**Refactor note:** the two `isSuccess ? … : …` ternaries (`:29-30`, `:37-65`) do not
extend to three cleanly. Replace both with a lookup keyed by `type` — one object,
three entries, holding `{ bg, icon, delay }` — rather than nesting ternaries. That
also leaves Phase 42 (DS-04) one place to retint.

---

### `src/utils/haptics.ts` (utility)

**Analog:** itself, in full (`:1-13`) — a feature-detected `navigator.vibrate` with a
distinct pattern per outcome:

```ts
/** Haptic feedback for scan results. Graceful degradation on unsupported devices (iOS). */

export function vibrateSuccess() {
  if ("vibrate" in navigator) {
    navigator.vibrate(200);
  }
}

export function vibrateError() {
  if ("vibrate" in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
}
```

The third outcome gets `vibrateAlreadyRecorded()` in the same shape — a pattern
distinguishable from both by feel alone, since the note says iOS degrades to nothing
and the door is dark.

---

### `src/utils/datetime.ts` (utility, `partyEndInstant`)

**Analog:** `menuCloseInstant` (`:66-82`) — the same crossing-midnight rule the night's
end needs, already written, already commented with why it was centralised:

```ts
/**
 * When the drink menu closes, as an instant.
 *
 * A night runs 22:00 → 06:00, so a closing time before noon belongs to the
 * *next* calendar day. The rule was previously repeated in five places, each
 * reading the hour in the runtime's zone; here it is applied to the declared
 * Turin hour, before the conversion, where it cannot drift.
 */
export function menuCloseInstant(date: string, closeTime: string): Date {
  const hour = Number(closeTime.split(":")[0] ?? "0");
  if (hour >= 12) return zonedInstant(date, closeTime);

  const [y, m, d] = date.split("-").map(Number);
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
  const shifted = nextDay.toISOString().slice(0, 10);
  return zonedInstant(shifted, closeTime);
}
```

**The before/after-the-night comparison uses** (`:61-64`):

```ts
/** When a party starts, as an instant. */
export function partyStartInstant(date: string, time: string | null): Date {
  return zonedInstant(date, time);
}
```

`partyEndInstant(date, endTime)` is `menuCloseInstant` with a different argument name.
Add it **in this file** — commit `8f4e004` exists to stop the six-variant drift, and
`time-and-scheduling.md` makes it a rule, not a preference.

---

### `src/app/(organizer)/organizer/events/[id]/<review>/page.tsx` (page, server component, CRUD read)

**Analog:** `src/app/(organizer)/organizer/events/[id]/sales/page.tsx` — the closest
match by role and audience: a read-only per-event organizer surface with no mutation.
`guest-list/page.tsx` is the analog for the page-plus-client split.

**Imports and the params signature** (`sales/page.tsx:1-15`):

```ts
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import MobileNav from "@/components/layout/MobileNav";
import SalesDashboard from "@/components/events/SalesDashboard";
import type { UserRole, UserStatus } from "@/types/database";

export default async function OrganizerSalesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
```

**Guard + ownership check** (`sales/page.tsx:17-43`) — identical in `guest-list/page.tsx:17-43`.
This is the repo's per-event organizer gate, and note it reads the headers the
middleware sets (which FIX-01 made trustworthy by deleting inbound copies first):

```ts
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;
  const userId = headersList.get("x-user-id") || "";

  // Defense in depth: verify organizer or master access
  if (role !== "organizer" && role !== "master") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/organizer/events");
  }

  // Verify ownership (organizer owns event OR user is master)
  if (role === "organizer" && event.created_by !== userId) {
    redirect("/organizer/events");
  }
```

**Party selector data** (`guest-list/page.tsx:54-59`) — the review list is **per night**,
so it needs the same party list:

```ts
  // Fetch event parties for the party selector dropdown
  const { data: parties } = await supabase
    .from("event_parties")
    .select("id, title")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
```

**Page chrome** (`sales/page.tsx:170-202`) — back link, `h1`, event title, `MobileNav`
with the role and status. Copy verbatim, changing the heading:

```tsx
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link href="/organizer/events" className="text-sm text-muted hover:text-foreground transition-colors">
          &larr; Back to Events
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Sales</h1>
        <p className="text-sm text-muted">{event.title}</p>
      </header>

      <div className="px-6">
        ...
      </div>

      <MobileNav role={role} status={status} />
    </div>
```

**Server-page → client-component handoff** (`guest-list/page.tsx:61-80`) — data is cast
to the `database.ts` types on the server and passed as plain props:

```ts
  const guestEntries = (entries ?? []) as GuestListEntry[];
  const partyList = (parties ?? []) as { id: string; title: string }[];
  ...
        <GuestListClient entries={guestEntries} parties={partyList} ... />
```

**Critical divergence — FIX-12 forbids copying one part of this analog.**
`sales/page.tsx:88-99` builds a `profileMap` of `full_name` **and `email`** and ships
it into the client component:

```ts
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", buyerUserIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name ?? "Unknown", email: p.email ?? "" });
    }
```

The review list's **prose** view may join names this way at render time. The
**technical / copyable** view may not join anything: it renders `door_scan_events`
columns straight, which by construction hold no name and no email. Per RESEARCH
§ Answer A, that is a **serialisation rule**, not a second RLS policy — a plan that
adds `door_scan_events_select_master` has misread the requirement.

**Nav registration:** `src/lib/rbac/roles.ts:36+` holds `NAV_ITEMS`, and
`access-gating.md` gate *coerenza navigazione/permessi* is explicit that hiding a link
is not protecting a route. The per-event surfaces here are reached from the event page,
not from `NAV_ITEMS`; check how `sales` / `guest-list` are linked from
`organizer/events/page.tsx` before inventing a new entry point.

---

### The four refund writers (server action / cron, CRUD write)

**Analog:** they are analogs of each other — all four do *write the refund record, then
delete the ticket*, and Option B adds the same three columns to each write.

**Free / guest-list branch** (`src/app/(public)/tickets/refund-actions.ts:126-141`):

```ts
    await serviceClient
      .from("ticket_refunds")
      .update({
        status: "approved",
        processed_by: user.id,
        sumup_status: null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", refundId);

    await serviceClient
      .from("tickets")
      .delete()
      .eq("id", ticket.id);
```

**Paid branch** (`refund-actions.ts:168-183`) — same shape, after `refundTransaction`.

**Cron branch** (`src/app/api/cron/reconcile-refunds/route.ts:109-121`) — an `insert`
rather than an `update`, and the one place where the evidence columns must come from
`ticket` fields that are about to disappear:

```ts
        // Create refund record for audit trail
        await supabase.from("ticket_refunds").insert({
          ticket_id: ticket.id,
          requested_by: ticket.user_id,
          processed_by: ticket.user_id,
          amount: ticket.amount_paid,
          status: "approved",
          sumup_status: "completed",
          type: "admin_initiated",
          processed_at: now,
        });

        // Delete the ticket
        await supabase.from("tickets").delete().eq("id", ticket.id);
```

**Ordering rule for all four:** write `refunded_ticket_id`, `refunded_party_id`,
`refunded_at` **before** the `delete()`. After the delete the values are unreadable —
that is the whole defect Option B repairs.

**Anti-pattern present in the analog:** none of the four checks the `delete()`'s error
(`refund-actions.ts:138-141`). Per RESEARCH § Answer E, a guest-list ticket referenced
by `guest_list_entries.ticket_id` (`20260310000000_guest_list.sql:55`, no `ON DELETE`)
raises an FK violation there, and the refund is marked approved while the ticket
survives — silently. Check the error, per `meta-gates.md`.

---

## Shared Patterns

### Authentication and role gate

**API routes** — `src/app/api/tickets/attendance/route.ts:6-28` (the factored
`verifyOrganizerRole`), applied at `:35-41` and `:172-178`.
**Pages** — `src/app/(organizer)/organizer/events/[id]/sales/page.tsx:17-43` (headers,
role check, then event-ownership check).
**Database** — `(SELECT public.is_admin_or_organizer())` inside every policy
(`20260224_rbac_migration.sql:127-135` for the function, `:151` for a call site).

**Apply to:** every route handler and every page this phase adds or changes.
**Layering rule (`access-gating.md`):** the redirect decides where someone may *go*;
the RLS decides what they may *read*. The review list needs both.

### Service-role client, and the rule that comes with it

**Source:** `src/lib/supabase/service.ts:1-8`.
**Apply to:** the check-in route, the membership route, the review-list page.
Each new call site is justified in writing in the commit and must be unreachable from
untrusted input (`access-gating.md`). The `offlineSync && directTicketId` branch
(`checkin/route.ts:34-36`) is the current violation FIX-10 removes: a body-supplied id
reaching an RLS-bypassing client.

### Error handling with an observable effect

**Source (correct):** `membership/verify/route.ts:124-147` — distinguishes `23505` from
everything else, logs the rest with a category, returns a distinct status.
**Source (anti-pattern, in this phase's own files):**
- `checkin/route.ts:137-142` — one `catch` for every cause, one `status: "error"`.
- `ScannerClient.tsx:597-621` — one `catch`, one "Connection error", covering a
  duplicate, a 500 and a dead radio.
- `reconcile-refunds/route.ts:125-127` — `catch { errors++ }`.

**Apply to:** every new error path. `meta-gates.md`: with no error tracking in
`package.json`, a log is a place nobody looks — the failure needs an effect the staff
member at the door can see.

### Validation before the service client

**Source:** `attendance/route.ts:180-196` (typed body, `try` around `request.json()`,
explicit required-field check with 400).
**Apply to:** `checkin/route.ts` (`token`, `partyId`, `scannedAt`, `deviceId`, `source`)
and `membership/verify/route.ts`. There is **no validation library in this repo** and
RESEARCH says not to add one for this alone — validate explicitly: UUID shape,
`TICKET_TOKEN_PATTERN`, ISO timestamp.

### Turin time

**Source:** `src/utils/datetime.ts` — `zonedInstant:49-59`, `partyStartInstant:62-64`,
`menuCloseInstant:66-82`, `zonedDateString:85-92`.
**Apply to:** every before/after-the-night decision, and to grouping the review list by
night rather than by calendar day. A `date` + `time` read from the database is never
passed to `new Date()`.

### Migration file conventions

**Source:** `20260310000000_guest_list.sql` (header comment block enumerating the
changes; `BEGIN;` … `COMMIT;`; `IF NOT EXISTS` DDL; RLS in the same file;
`{table}_{operation}_{who}` policy names).
**Filename:** `YYYYMMDDHHMMSS_snake_case_description.sql` — 32 files, all conforming.
**Application path:** the Supabase CLI is **not verified as available here**
(RESEARCH § Environment Availability). Every migration in this repo is plain SQL with
no CLI-specific syntax and no `supabase/` directives, so the same file runs verbatim
through the dashboard SQL editor. Write the task so it works either way, and record
in `31-VERIFICATION.md` **which** path was used and what was observed afterwards
(`\d door_scan_events`, or the equivalent dashboard view).

---

## No Analog Found

| File | Role | Data flow | Why nothing matches |
|---|---|---|---|
| `src/app/sw.ts` (`/api/*` runtime-caching override) | config | request-response caching | The file adopts `runtimeCaching: defaultCache` wholesale (`sw.ts:23`) and no route-specific rule has ever been written in this repo. The pattern to copy is **inside the library**: `@serwist/next` 9.5.6 already treats `/api/auth/*` as its own rule — read `node_modules/@serwist/next/dist/index.worker.js` rather than inventing a shape. Also unverifiable in `npm run dev` (`next.config.ts:9` — `disable: NODE_ENV === "development"`). |
| `src/lib/offline/checkin-store.ts` (merge + plausibility guard + versioned rekey) | store | file-I/O | The only IndexedDB module in the repo; nothing else does a versioned data migration. The reference is the `idb` README's transaction-lifetime rule and the W3C spec, both quoted in RESEARCH § Answer D. What *is* copyable is the file's own transaction discipline (`:98-129`) and its exported-function shape (`:193-211`). |
| `src/lib/offline/sync-manager.ts` (four-bucket classification, `failedCheckins`, `blocked`) | service | batch | No other queue drainer exists. The nearest discipline analog is `reconcile-refunds/route.ts:95-127` (per-item try/catch, counters returned), but its `catch { errors++ }` is the anti-pattern FIX-08 exists to remove — copy the loop shape, not the error handling. |

**Consequence for the planner:** these three carry the phase's real risk. They have no
in-repo precedent, no test runner, and — for the first two — no behaviour observable in
`npm run dev`. Their verification is entirely the manual door pass in `31-VALIDATION.md`,
against a production build on a phone.

---

## Metadata

**Analog search scope:** `supabase/migrations/` (32 files), `supabase/schema.sql`,
`src/app/api/tickets/**`, `src/app/api/membership/**`, `src/app/api/cron/**`,
`src/lib/offline/**`, `src/lib/supabase/**`, `src/lib/rbac/**`,
`src/app/(organizer)/organizer/events/[id]/**`, `src/app/(admin)/admin/scanner/**`,
`src/components/scanner/**`, `src/utils/**`, `src/types/database.ts`,
`src/app/sw.ts`, `next.config.ts`.

**Files read in full:** `checkin/route.ts`, `attendance/route.ts`, `checkin-store.ts`,
`sync-manager.ts`, `database.ts`, `ScanFlash.tsx`, `datetime.ts`, `haptics.ts`,
`service.ts`, `sw.ts`, `next.config.ts`, `sales/page.tsx`,
`20260227200000_ticket_refunds.sql`, `20260228200000_ticket_checkin.sql`.

**Files read in targeted ranges:** `ScannerClient.tsx` (`:80-199`, `:340-479`,
`:590-639`, `:845-874`), `membership/verify/route.ts` (`:60-164`),
`20260226300000_multi_sub_events.sql` (`:1-90`), `20260224_rbac_migration.sql`
(`:100-175`), `20260310000000_guest_list.sql` (`:1-90`), `guest-list/page.tsx` (`:1-80`),
`refund-actions.ts` (`:118-185`), `reconcile-refunds/route.ts` (`:95-130`),
`rbac/roles.ts` (`:1-45`), `schema.sql` (attendances block, `:231-249`).

**Not used:** `.planning/codebase/` — dated 2026-02-24, three milestones stale
(`CLAUDE.md` Guardrail 4).

**Pattern extraction date:** 2026-08-05
