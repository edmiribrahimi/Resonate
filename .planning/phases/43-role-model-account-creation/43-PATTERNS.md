# Phase 43: Role Model & Account Creation — Pattern Map

**Mapped:** 2026-08-07
**Files analyzed:** 24 (7 new, 17 modified)
**Analogs found:** 21 / 24 — three have **no analog and are reported as absent**, not approximated

> **Roles only, never people.** This file is in `.planning/`, which is tracked, and
> the repository is **public**. Every subject below is a role — `master`,
> `organizer`, `staff`, `member` — or a persona label. No person, no unannounced
> date, no venue.

> **Every analog carries `file:line`, read this session.** Where the research
> asserted a line number, it was re-opened and confirmed before being repeated
> here. Three claims are recorded as **absent**: the set-password write, an
> incremental IndexedDB upgrade, and a member-act register. Those are findings the
> planner needs, not gaps to fill by analogy.

---

## File Classification

### New files

| New file | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/migrations/*_staff_role.sql` | migration | DDL + data seed | `20260807000000_capability_model.sql:390-423` + `20260807000100_capability_model_fk_index.sql` (whole file) | exact |
| `supabase/migrations/*_role_implies_approved.sql` | migration | DDL (constraint) | `20260805120000_door_scan_events.sql:179-186` (named drop/add) | exact |
| `supabase/migrations/*_membership_acts.sql` | migration | DDL + RLS (append-only) | `20260805120000_door_scan_events.sql:60-163` | exact |
| `public.record_membership_act(...)` RPC (same or adjacent migration) | migration / stored procedure | transactional write | `20260508000000_drink_token_active_state.sql:90-124` + `20260807000000_capability_model.sql:192-217` (`search_path`) | role-match |
| `supabase/migrations/*_master_reconcile.sql` (one-shot demotion) | migration | data backfill | `20260310000000_guest_list.sql:20-28` | role-match |
| `src/emails/account-invitation.tsx` | email template | transform (render) | `src/emails/member-approved.tsx` (whole file) + `guest-invitation.tsx:99-114` | exact |
| Set-password surface — page + client form | page + component | request-response (auth write) | **NO ANALOG for the write.** Closest shapes: `src/components/auth/ChangeEmailButton.tsx:12-28`, `src/app/(auth)/register/page.tsx:8-22` | **absent** |
| Account-creation form (client component) | component | request-response | `src/app/(admin)/admin/newsletter/ComposeForm.tsx:18-52` | exact |
| Register-read surface (page) | page (Server Component) | CRUD read, capability-gated | `src/app/(organizer)/organizer/events/[id]/review/page.tsx:58-129` | exact |

### Modified files

| Modified file | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `supabase/schema.sql:59` | schema base | DDL (honesty only) | — (see Shared Pattern 6) | n/a |
| `scripts/container/seed.mjs` | harness | batch (seed + assert) | **itself**: `:223-238` (try/finally relaxation), `:325-367` (the refusal) | exact |
| `scripts/rls-baseline.mjs:638,689-695` | harness | batch (persona resolution) | **itself**: `:638-646`, `:662-665`, `:689-695` | exact |
| `scripts/verify-capabilities.mjs` | harness | transform (parity) | **itself**: `:104` (pre-registered count), `:118-127` (`check`), `:497-540` (a side) | exact |
| `src/app/(admin)/admin/members/actions.ts` — new `createAccount` | server action | request-response + email | `src/lib/guest-list/process-entry.ts:218-251` | exact |
| `src/app/(admin)/admin/members/actions.ts:113-152` — widen `updateMemberRole` | server action | CRUD write | **itself**: `:88-109`, `:123-148` | exact |
| `.../actions.ts` — register write in 5 acts | server action | CRUD write + audit | `src/app/api/membership/verify/route.ts:348-358` (`.select()` read-back) | role-match |
| `.../actions.ts` — refusal surfaced as a value | server action | request-response | `src/app/(admin)/admin/newsletter/actions.ts:92-135` | exact |
| `src/app/api/auth/callback/route.ts:25-45` | route handler | request-response | **itself**: `:25-33` (the promotion to repair) | exact |
| `src/app/api/membership/verify/route.ts:270-274, 348-358` | route handler | CRUD write (door hot path) | **itself** (same lines) | exact |
| `src/app/api/membership/list/route.ts:51-54` | route handler | CRUD read (roster) | **itself** (same lines) | exact |
| `src/lib/offline/checkin-store.ts` — `DB_VERSION` 3 → 4 | store (IndexedDB) | file-I/O / schema migration | **itself**: `:294-368` — the **only** prior upgrade, and it is not incremental | **partial** |
| `src/lib/offline/checkin-store.ts:89-93, 939-955` — `MemberRecord` gains a role | store | CRUD write | **itself** (same lines) | exact |
| `src/lib/offline/sync-manager.ts:201-212` | service | pub-sub / drain | **itself** (same lines) | exact |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx:573-590, 1338-1351` | component | offline-first read | **itself** (same lines) | exact |
| `src/components/admin/MemberTable.tsx:178-180, 219-234, 461-471` | component | request-response | **itself** (same lines) | exact |
| `src/types/database.ts:20, 24-35` | types | — | **itself**: `:1-19` (inverted-import rule) | exact |
| `src/lib/rbac/roles.ts:6-11` | config (vocabulary) | — | **itself** | exact |
| `src/lib/capabilities/keys.ts` (only if a ninth key is minted) | config | — | **itself**: `:36-38`, `:74-82` | exact |

---

## Pattern Assignments

### 1. `supabase/migrations/*_staff_role.sql` (migration, DDL + data seed)

**Analog A — the "correct it forward, one transaction" file:** `supabase/migrations/20260807000100_capability_model_fk_index.sql`

The whole file is the pattern. Its header states the rule this phase inherits
(`:22-24`):

```sql
-- `supabase-data.md`, gate *migration in avanti*: 20260807000000 is applied to
-- production and is therefore a historical fact. It is not edited; this file
-- corrects it forward.
```

and one statement still gets a transaction (`:8-10`, `:42-47`):

```sql
-- One statement, but still BEGIN; ... COMMIT;, for the same reason as every
-- other migration in this directory: the transaction is the unit, not the
-- statement count.
BEGIN;
CREATE INDEX IF NOT EXISTS idx_role_capabilities_capability
  ON private.role_capabilities (capability);
COMMIT;
```

**Analog B — the named drop/add of an auto-named constraint:** `20260805120000_door_scan_events.sql:181-186`

This is the repository's own precedent for replacing a constraint by **explicit
name**, which is what makes the two role `CHECK`s survivable:

```sql
ALTER TABLE public.ticket_refunds
  DROP CONSTRAINT IF EXISTS ticket_refunds_ticket_id_fkey;

ALTER TABLE public.ticket_refunds
  ADD CONSTRAINT ticket_refunds_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;
```

**Analog C — the grant rows, and their comment discipline:** `20260807000000_capability_model.sql:386-423`

Copy this shape verbatim, including the `ON CONFLICT` and the per-block comment
that names *the predicate* each grant reproduces:

```sql
-- Sixteen grant rows. Eight of them carry requires_approved = true: the
-- catalogue.manage pair, and the membership.active and membership.card.view
-- sets of three each. Every other row is false, and each false is a decision
-- about a predicate that ignores status today.
INSERT INTO private.role_capabilities (role, capability, requires_approved) VALUES
  -- P1: role only, status ignored on all 34 policies.
  ('master',    'staff.manage',         false),
  ('organizer', 'staff.manage',         false),
  ...
  -- Middleware /admin/scanner and the four door routes: ROLE ALONE.
  -- These two rows must not become true. See the door.operate description.
  ('master',    'door.operate',         false),
  ('organizer', 'door.operate',         false),
  ...
ON CONFLICT (role, capability) DO NOTHING;

COMMIT;
```

**The two constraints to widen, both confirmed this session:**

| # | File:line | Text read |
|---|---|---|
| 1 | `supabase/migrations/20260224_rbac_migration.sql:14-15` | the inline `CHECK` on `ADD COLUMN role` — production's constraint |
| 2 | `supabase/migrations/20260807000000_capability_model.sql:121` | `role text not null check (role in ('master', 'organizer', 'member'))` |

Constraint 2 read in full at `:120-125`:

```sql
CREATE TABLE IF NOT EXISTS private.role_capabilities (
  role              text not null check (role in ('master', 'organizer', 'member')),
  capability        text not null references private.capabilities(key) on delete cascade,
  requires_approved boolean not null default false,
  primary key (role, capability)
);
```

The comment immediately above it (`:116-118`) is the sentence the plan must
answer to, because it is the reason the second constraint exists at all:

```sql
-- The CHECK on `role` mirrors `UserRole` in `src/types/database.ts:15`. There is
-- deliberately no CHECK tying a role to a set of capabilities: which role holds
-- what is the seed's business, and it is data.
```

**Trap already documented in the resolver — read before choosing a refusal shape.**
`20260807000000_capability_model.sql:209-216`:

```sql
  select exists (
    select 1
    from public.profiles p
    join private.role_capabilities rc on rc.role = p.role
    where p.id = (select auth.uid())
      and rc.capability = p_capability
      and (not rc.requires_approved or p.status = 'approved')
  );
```

There is no `granted` column in this predicate. A `granted = false` row **grants**
the capability. (RESEARCH § Pattern 3(a), Pitfall 4.)

---

### 2. `supabase/migrations/*_role_implies_approved.sql` (migration, DDL)

**Analog:** `20260805120000_door_scan_events.sql` — the header, the transaction, and the "state what happens to existing rows" discipline.

**Header pattern** (`:1-17`):

```sql
-- Door scan events, refund evidence, per-party presence, guest-list check-in
-- Phase 31, Plan 04: the schema foundation for the live door defects
--
-- Changes:
-- 1. Create public.door_scan_events (append-only) with its indexes and RLS,
--    in this same file
-- ...
-- Four tables, one transaction. A half-applied version of this file is worse
-- than none of it, so BEGIN; ... COMMIT; is not decoration.

BEGIN;
```

**Existing-rows pattern** (`:235-239` and `:215-220`) — this is `supabase-data.md`
gate *default sulle righe esistenti* in prose, and the D-04 migration owes the
same paragraph after running the violating-row count:

```sql
-- Existing rows keep party_id NULL and therefore mean *event-level*. That is
-- correct and is not a migration artefact: every attendance written before this
-- migration was recorded against an event, because there was nothing else to
-- record it against.
```

**Named, not inline.** RESEARCH § Code Examples measured that a second inline
`CHECK` is auto-named `profiles_role_check1` and **both** are then enforced. The
constraint gets an explicit name, as in Analog B of § 1.

---

### 3. `supabase/migrations/*_membership_acts.sql` (migration, new append-only table + RLS)

**Analog:** `supabase/migrations/20260805120000_door_scan_events.sql:60-163` — the only append-only register this repository owns. Four properties to copy, each with its reasoning already written.

**(a) The subject link survives its subject** (`:41-45`, `:73-81`):

```sql
-- ON DELETE SET NULL, not CASCADE — a scan event must outlive its ticket. That
-- is the lesson of the ticket_refunds cascade this same migration repairs
-- (section 2): a cascade destroyed the audit row written one statement earlier,
-- confirmed against a throwaway PostgreSQL 16.14 container on 2026-08-05.

  -- The three subject links. All three are SET NULL on delete: see the note
  -- above. A row whose ticket_id has gone to NULL still says that a scan
  -- happened, by whom, on which device, at which moment.
  ticket_id uuid REFERENCES public.tickets ON DELETE SET NULL,
  ...
  subject_user_id uuid REFERENCES auth.users ON DELETE SET NULL,
```

**(b) The actor is `NOT NULL`; the two clocks are separate** (`:101-109`):

```sql
  -- When the phone read the code, and when the server durably held it. ...
  scanned_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),

  -- Who was holding the phone, and which phone it was.
  operator_id uuid NOT NULL REFERENCES auth.users,
  device_id text NOT NULL,
```

> For D-22 this is the seam: `operator_id NOT NULL REFERENCES auth.users` has no
> room for a system actor. The register's `actor_kind` companion is the deviation
> from this analog, and the plan owns declaring it.

**(c) A reversal is a further event** (`:118-119`):

```sql
  -- A reversal is a further event, not an erasure. See the is_undo note above.
  is_undo boolean NOT NULL DEFAULT false
```

**(d) RLS on, read policy only, no write policy — and the paragraph that says so** (`:140-163`):

```sql
-- Without this, anyone holding the anonymous key reads the whole night through
-- PostgREST. The middleware decides where somebody may go; this decides what
-- they may read, and only this is the security boundary.

ALTER TABLE public.door_scan_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS door_scan_events_select_admin ON public.door_scan_events;

CREATE POLICY door_scan_events_select_admin ON public.door_scan_events
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

-- No INSERT, UPDATE or DELETE policy, and the omission is deliberate. Writes
-- come only from the service client in the check-in route, which bypasses RLS,
-- so the table is append-only by construction: with RLS enabled and no write
-- policy, no authenticated session can add, edit or remove a row. No other
-- table in this repository omits its write policies on purpose, so without this
-- paragraph the next reader would take it for a bug and repair it.
```

**Two divergences the plan must make deliberately, not by copying:**

1. The analog gates on the **legacy helper** `public.is_admin_or_organizer()`.
   Phase 32 moved 45 of 67 policies to `private.has_capability`, and the new
   policy must use the capability form with the `(select …)` wrapper — the
   wrapper is load-bearing and the reason is at
   `20260807000000_capability_model.sql:177-184`.
2. D-19 requires an **approved** staff role, and `staff.manage` carries
   `requires_approved = false` (`20260807000000_capability_model.sql:392-393`).
   `catalogue.manage` is the existing key already shaped `requires_approved = true`
   (`:399-400`). Do not flip `staff.manage` — `:415` forbids it in the file.

**Index pattern** (`:122-138`):

```sql
-- The review list is read per night, most recent first.
CREATE INDEX IF NOT EXISTS idx_door_scan_events_party
  ON public.door_scan_events (party_id, recorded_at);
...
-- Reversals are rare and are read on their own.
CREATE INDEX IF NOT EXISTS idx_door_scan_events_undo
  ON public.door_scan_events (party_id, recorded_at)
  WHERE is_undo;
```

---

### 4. `public.record_membership_act(...)` — the atomic write (stored procedure)

**Analog:** `supabase/migrations/20260508000000_drink_token_active_state.sql:90-124` — a `SECURITY DEFINER` function in `public` doing a guarded, idempotent write, called from TypeScript via `.rpc()`.

```sql
CREATE OR REPLACE FUNCTION public.redeem_drink_token(p_token_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token record;
BEGIN
  SELECT * INTO v_token
  FROM public.drink_tokens
  WHERE id = p_token_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token not found: %', p_token_id;
  END IF;

  -- Idempotent: already redeemed
  IF v_token.status = 'redeemed' THEN
    RETURN false;
  END IF;
  ...
  UPDATE public.drink_tokens
  SET status = 'redeemed', redeemed_at = now()
  WHERE id = p_token_id;

  RETURN true;
END;
$$;
```

**Mandatory divergence — `search_path`.** This analog omits it. The newer
convention, with its reason, is `20260807000000_capability_model.sql:166-171`:

```sql
-- `set search_path = ''` with every reference schema-qualified. The four
-- existing helpers (20260224_rbac_migration.sql:100-135) omit it and the live
-- security advisor raises `function_search_path_mutable` on all four; this
-- phase does not add a fifth. A SECURITY DEFINER function with a mutable
-- search_path is a privilege-escalation vector: the caller chooses which
-- `profiles` the definer reads.
```

Signature form to copy, from the same file (`:192-199`):

```sql
CREATE OR REPLACE FUNCTION private.has_capability(
  p_capability text,
  p_party_id   uuid default null
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
```

**Existing `.rpc()` call sites, for the TypeScript side:**
`src/lib/capabilities/server.ts:202`, `src/app/api/webhooks/sumup/route.ts:203`,
`src/app/(organizer)/organizer/events/actions.ts:1178`. All untyped —
`src/lib/capabilities/keys.ts:24` explains why a misspelled argument is a runtime
failure and not a build error.

**Named so it is not attempted** (RESEARCH § D.3, Pitfall 5): an `AFTER UPDATE`
trigger reading `auth.uid()` records `null` under the service client, which every
one of the five mutation paths uses. The RPC takes the actor as an argument.

---

### 5. `supabase/migrations/*_master_reconcile.sql` (one-shot data backfill)

**Analog:** `supabase/migrations/20260310000000_guest_list.sql:20-28` — the repository's only one-shot backfill of `profiles`, and the origin of the `'admin_manual'` value this phase's creation path will write:

```sql
-- Backfill existing approved users
UPDATE public.profiles
SET approved_via = 'referral'
WHERE status = 'approved' AND referred_by IS NOT NULL AND approved_via IS NULL;

UPDATE public.profiles
SET approved_via = 'admin_manual'
WHERE status = 'approved' AND referred_by IS NULL AND approved_via IS NULL;
```

Note the shape: every `UPDATE` is guarded by `IS NULL` so a re-run is a no-op.
D-16's reconciliation needs the same property plus two guards this analog does not
have — *demote only when the named account exists and holds `master`*, and *never
leave zero masters*. Neither is in the analog; both are new and must be written.

---

### 6. `src/app/(admin)/admin/members/actions.ts` — the creation action (server action)

**Analog A — the create + link pattern:** `src/lib/guest-list/process-entry.ts:218-251`, read in full this session:

```ts
    // Path 3: New user -- create account via admin API
    const { data: authUser, error: authError } =
      await serviceClient.auth.admin.createUser({
        email: emailLower,
        email_confirm: true,
        user_metadata: {
          full_name: `${entry.first_name} ${entry.last_name}`,
          guest_list_event_id: entry.event_id,
        },
      });

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    // Generate password-set link (recovery type for existing user, NOT invite which creates users)
    const { data: linkData, error: linkError } =
      await serviceClient.auth.admin.generateLink({
        type: "recovery",
        email: emailLower,
      });

    if (linkError) {
      console.error("Failed to generate recovery link:", linkError);
      // Continue without password link -- user can still use "forgot password"
    }

    const claimUrl =
      linkData?.properties?.action_link ||
      `${process.env.NEXT_PUBLIC_APP_URL || "https://resonate.app"}/login`;

    // Wait briefly for the handle_new_user trigger to create the profile
    // The trigger fires on auth.users INSERT and creates the profile row
    await new Promise((resolve) => setTimeout(resolve, 500));
```

**Three lines of this analog are defects to fix, not copy** (RESEARCH § C.1, Pitfalls 7 and 2):

| Line | Defect | Replacement pattern, and where it already exists |
|---|---|---|
| `:249-251` | a 500 ms sleep instead of a synchronisation | `.select(...).single()` on the following update — the shape at `src/app/api/membership/verify/route.ts:357-358` |
| `:240-243` | the link failure is `console.error`-ed and swallowed; `claimUrl` silently degrades to `/login` | a tagged result — `src/app/(admin)/admin/newsletter/actions.ts:98-100` |
| `:246-247` | `process.env.NEXT_PUBLIC_APP_URL \|\| "…"` | `comms-analytics.md` gate *variabili d'ambiente verificate*; `MEMORY.md` records the trailing-newline incident on this exact variable |

**Analog B — the status the trigger writes, which is the trap.** `20260310000000_guest_list.sql:107-155`, read this session. Without guest-list metadata and without a valid referral:

```sql
      ELSE
        new_status := 'pending';
        new_approved_via := NULL;
      END IF;
...
  INSERT INTO public.profiles (id, email, full_name, membership_code, role, status, referred_by, approved_via)
  VALUES (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_code,
    'member',
    new_status,
    referrer_id,
    new_approved_via
  );
```

So `createUser` yields `role='member', status='pending'`. The creation path must
write `role` and `status` **in one statement**, which is exactly the shape the file
already uses at `:136-148` (§ 7 below).

**Analog C — the membership code is minted by the trigger, not by the app.**
Same file, `:95-105`: the code is drawn from `'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'`
with `random()`. `src/utils/qr.ts:45-52` is a second generator and must not be
called here (RESEARCH § Don't Hand-Roll; open defect QR-01, not this phase's).

---

### 7. `src/app/(admin)/admin/members/actions.ts:113-152` — widening `updateMemberRole`

**Analog: itself.** The gate pair at `:87-109` is the ceiling ACCT-01 needs, and
`:46-85` is a comment block that says out loud why the two functions must not be
merged — the planner should quote it rather than re-derive it:

```ts
/** Master-only: role management, deactivate, reactivate. */
async function verifyMaster(): Promise<AccessContextResult> {
  const ctx = await getAccessContext();
  if (!ctx.capabilities.has(CAP.MASTER_MANAGE)) {
    throw new Error("forbidden.master_manage_required");
  }
  // A real subject, or nothing happens. Attribution (§5) requires every
  // approval, rejection and promotion to record WHO — so an action must never
  // proceed on a null identity. It sits here rather than at each call site
  // because seven call sites are seven chances to omit it.
  if (!ctx.userId) throw new Error("capabilities.resolve_failed: no_subject");
  return ctx;
}

/** Master or organizer: approve / reject. */
async function verifyAdminOrOrganizer(): Promise<AccessContextResult> {
  const ctx = await getAccessContext();
  if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    throw new Error("forbidden.staff_manage_required");
  }
  if (!ctx.userId) throw new Error("capabilities.resolve_failed: no_subject");
  return ctx;
}
```

**The write to widen, and the comment that must survive the widening** (`:113-148`):

```ts
export async function updateMemberRole(
  memberId: string,
  newRole: "organizer" | "member"
) {
  const ctx = await verifyMaster();

  if (memberId === ctx.userId) {
    throw new Error("Cannot change own role");
  }

  // Granting the organizer role approves the account in the same write.
  // ...
  // Demotion does NOT revoke approval: `member` and `approved` are different
  // axes (`access-gating.md`, gate *due assi*), and someone who was approved
  // stays approved when they stop being staff.
  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .update(
      newRole === "organizer"
        ? { role: newRole, status: "approved" }
        : { role: newRole }
    )
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`);
  }
```

Three things the planner should carry from this excerpt:

1. `verifyMaster()` at `:117` is what D-21 changes. **Nothing else guarded by
   `verifyMaster` may widen with it** — the other two callers are
   `deactivateMember:155` and `reactivateMember:176`.
2. The self-check at `:119-121` exists on `updateMemberRole` and
   `deactivateMember:157-159` and is **missing** on `reactivateMember:175-190`.
3. `{ role, status: 'approved' }` written together is the exact shape D-04's
   constraint judges. Every new path copies it.

**The four register-writing sites, with their current writes read this session:**

| Action | Line | Writes today |
|---|---|---|
| `updateMemberRole` | `:137-144` | `{role, status:'approved'}` on promote; `{role}` on demote |
| `deactivateMember` | `:162-165` | `{status:'rejected', role:'member'}` |
| `reactivateMember` | `:179-182` | `{status:'approved'}` |
| `approveMember` | `:206-209` | `{status:'approved'}` + email at `:216-220` |
| `rejectMember` | `:239-242` | `{status:'rejected', role:'member'}` + email at `:249-253` |
| `bulkApproveMember` | `:275-278` | `{status:'approved'}` over `.in()` |
| `bulkRejectMember` | `:319-322` | `{status:'rejected', role:'member'}` over `.in()` |

**Fire-and-forget email pattern, to copy for the invitation** (`:215-220`):

```ts
  // Send approval email fire-and-forget
  if (member?.email) {
    sendApprovalEmail(member.email, member.full_name).catch((err) =>
      console.error("Failed to send approval email:", err)
    );
  }
```

⚠ **This is an analog to copy only for `approveMember`-shaped acts.** For ACCT-03
the invitation *is* the requirement, so a swallowed send is the requirement
failing quietly. Use the tagged-result pattern of § 8 instead.

---

### 8. The refusal must be a value, not a message (server action, cross-cutting)

**Analog:** `src/app/(admin)/admin/newsletter/actions.ts:62-135` — written *because* three call sites swallowed a throw, and the only precedent in this repo for carrying a failure category across the Server Action boundary.

```ts
export type NewsletterFailure =
  /** The permission lookup itself failed. Nothing was asked of Resend. */
  | "capabilities_unavailable"
  /** The guard passed; Resend or its configuration did not answer. */
  | "provider_unavailable";

export type NewsletterResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: NewsletterFailure; detail: string };

async function guarded<T>(
  action: string,
  run: () => Promise<T>
): Promise<NewsletterResult<T>> {
  try {
    await requireMaster();
  } catch (error) {
    unstable_rethrow(error);
    const detail = describe(error);
    console.error(`[newsletter.capabilities_unavailable] ${action}: ${detail}`);
    return { ok: false, failure: "capabilities_unavailable", detail };
  }

  try {
    return { ok: true, data: await run() };
  } catch (error) {
    unstable_rethrow(error);
    const detail = describe(error);
    console.error(`[newsletter.provider_unavailable] ${action}: ${detail}`);
    return { ok: false, failure: "provider_unavailable", detail };
  }
}
```

Two lines of that file's own reasoning the planner should reuse verbatim
(`:75-84`):

```
 * A thrown message cannot carry the diagnosis across the wire. Next redacts the
 * message of an error thrown out of a Server Action in a production build ...
 * The tag is decided by POSITION, not by parsing a message: the capability guard
 * runs in its own try, the provider call in another.
```

`unstable_rethrow` is load-bearing and the reason is at `:106-113` — a `catch` that
swallowed `redirect()` would turn a refusal into a rendered error.

**Anti-pattern in the same tree, to be replaced not copied:**
`src/components/admin/MemberTable.tsx:182-189`:

```tsx
  const handleAction = async (action: () => Promise<{ success: boolean }>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  };
```

In production `e.message` is Next's redacted string. This is the exact defect
`server.ts:59-63` names, and it is where a `23514` refusal would land today.

---

### 9. Account-creation form (client component)

**Analog:** `src/app/(admin)/admin/newsletter/ComposeForm.tsx:18-52` — the only client form in the repo that renders a tagged failure distinctly from a validation complaint. Its own header (`:7-17`) explains why:

```tsx
export default function ComposeForm({ onSent }: { onSent: () => void }) {
  const [subject, setSubject] = useState("");
  const [isPending, startTransition] = useTransition();
  const [inputError, setInputError] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ kind: NoticeKind; detail?: string } | null>(null);

  const handleSend = () => {
    setFailure(null);
    if (!subject.trim() || !htmlContent.trim()) {
      setInputError("Subject and content are required");
      return;
    }
    setInputError(null);
    startTransition(async () => {
      try {
        const result = await createAndSendBroadcast(subject.trim(), wrappedHtml);
        if (!result.ok) {
          setFailure({ kind: result.failure, detail: result.detail });
          return;
        }
        ...
      } catch (err) {
        setFailure({
          kind: "transport_unavailable",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };
```

The distinct-notice renderer is a sibling file:
`src/app/(admin)/admin/newsletter/FailureNotice.tsx` (one component per cause) —
the register/creation surface should have its own equivalent rather than a shared
"Action failed".

**Input styling and control shapes** to match the tree:
`ComposeForm.tsx:91-127` (input, textarea, pill buttons) and
`src/components/auth/ChangeEmailButton.tsx:49-78` (collapsed → open card form,
`rounded-2xl border border-card-border bg-card p-5`).

**Role `<select>` shape, and the enumeration to widen:**
`src/components/admin/MemberTable.tsx:461-471`:

```tsx
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent/50 focus:outline-none"
          >
            <option value="all">All roles</option>
            <option value="master">Master</option>
            <option value="organizer">Organizer</option>
            <option value="member">Member</option>
          </select>
```

Three options, no `staff`. RESEARCH § G.1 #10: this is the surface where the seat
cost of D-13 becomes unreadable, and `npm run build` reports nothing.

---

### 10. Register-read surface (page, Server Component)

**Analog:** `src/app/(organizer)/organizer/events/[id]/review/page.tsx:47-129` — the repository's only capability-gated read of an append-only register, and it carries the reasoning for every line the new page needs.

```ts
export const dynamic = "force-dynamic";

/** The columns of `door_scan_events`, named once. There is no join. */
const SCAN_EVENT_COLUMNS =
  "id, party_id, event_id, subject_type, ticket_id, guest_entry_id, subject_user_id, outcome, cause, scanned_at, recorded_at, operator_id, device_id, source, token_fingerprint, is_undo";

export default async function DoorReviewPage({ params, searchParams }: PageProps) {
  ...
  // Identity from the session, not from an inbound header.
  const ctx = await getAccessContext();

  // Defense in depth: may this person reach the organizer area at all.
  //
  // This is the **interface** layer — it decides where somebody may go. What
  // decides what they may read is `door_scan_events_select_admin`, and this
  // surface needs both: the redirect alone would leave the night readable
  // through the API by anyone holding the anonymous key.
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  // The normal server client, and **not** the RLS-bypassing service client from
  // `@/lib/supabase/service`. That client bypasses every policy, so reading the
  // night through it would move the boundary into this page and leave
  // `door_scan_events_select_admin` decorative ...
  const supabase = await createClient();
```

Four transferable rules, each with its line:

1. `export const dynamic = "force-dynamic"` at `:47`, with the reason at `:40-46`
   — the opt-out is now implicit via `cookies()` and therefore easy to lose.
2. Capability gate **and** RLS, stated as two layers (`:81-89`).
3. **Never the service client on a read surface** (`:91-97`) — and note the last
   sentence: *"Its absence here is checked by a grep, which is why the name is
   not written out even in this comment."*
4. Untrusted query params resolved against owned rows, never trusted (`:131-138`).

Error-state pattern for a failed read (`:140-150`):

```ts
  let rows: DoorScanEvent[] = [];
  let readError: string | null = null;

  if (partiesError) {
    console.error("review:parties_read", {
      eventId, code: partiesError.code, message: partiesError.message,
    });
    readError = "The night's list could not be loaded: reading the parties failed.";
  }
```

---

### 11. `src/app/api/auth/callback/route.ts` — the `MASTER_EMAIL` reconciliation (route handler)

**Analog: itself**, `:25-45`, read in full this session. This is the code being repaired, and every defect ROLE-04 must fix is visible in nine lines:

```ts
      if (user) {
        // Check if user should be promoted to master
        const masterEmail = process.env.MASTER_EMAIL;
        if (masterEmail && user.email === masterEmail) {
          await serviceClient
            .from("profiles")
            .update({ role: "master", status: "approved" })
            .eq("id", user.id);
        }

        // Auto-subscribe to newsletter (fire-and-forget)
        ...
      }

      return NextResponse.redirect(`${origin}${next}`);
```

| Defect | Line | Pattern to apply, and where it exists |
|---|---|---|
| the result is discarded — no `error`, no `.select()` | `:29-32` | `.select(...).single()` + explicit error branch: `membership/verify/route.ts:348-358` |
| exact, case-sensitive, untrimmed comparison | `:28` | `LOWER()` on both sides is the house style: `20260310000000_guest_list.sql:116` |
| `next` reaches `NextResponse.redirect` unvalidated | `:9`, `:45` | `access-gating.md` gate *redirect validato*. Pre-existing; a **new** parametric redirect (the set-password `redirectTo`) must use an allow-list of relative paths |
| no observable effect on failure | `:29-33` | the redirect-flag shape used by the middleware, `src/lib/supabase/middleware.ts` `?access=unavailable` |

**The route's own service-client construction** (`:16-19`) is inline rather than
`getServiceClient()` from `src/lib/supabase/service.ts:3-7` — worth unifying while
here, and `access-gating.md` gate *service role* requires the commit to justify
each use.

---

### 12. `src/app/api/membership/verify/route.ts` — `attendances.entry_role` (route handler, door hot path)

**Analog: itself.** Both edit sites read this session.

**The profile select that must gain one word** (`:263-274`):

```ts
    let profile: {
      id: string;
      full_name: string;
      membership_code: string;
    } | null = null;

    if (typeof code === "string" && code.trim() !== "") {
      const { data, error: profileError } = await serviceClient
        .from("profiles")
        .select("id, full_name, membership_code")
        .eq("membership_code", code)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
```

Note `:276` — this route **already branches on a PostgREST error code**
(`PGRST116`), which is the closest existing evidence for assumption A1 (that a
`23514` reaches the client as `error.code`).

**The attendance insert, and its `.select()` read-back** (`:348-358`):

```ts
    const { data: attendance, error: insertError } = await serviceClient
      .from("attendances")
      .insert({
        event_id: party.event_id,
        party_id: party.id,
        user_id: profile.id,
        checked_in_at: new Date().toISOString(),
        checked_in_by: operatorId,
      })
      .select("id, checked_in_at")
      .single();
```

The comment above it (`:345-347`) is the rule for the register's `at` column too:

```
    // `checked_in_at` is the **server** clock even when the phone supplied a
    // `scannedAt`: a device clock is evidence, never authority.
```

`checkin-offline.md` gate: **the same query, never a second one.** `role` is added
to the `select` at `:272`, not fetched separately.

---

### 13. `src/app/api/membership/list/route.ts` — the roster payload (route handler)

**Analog: itself**, `:33-61`:

```ts
export async function GET() {
  // Once per handler — `cache()` does not memoise inside a Route Handler.
  const auth = await requireDoorOperator();
  if (!auth.ok) { ... }

  const serviceClient = getServiceClient();
  const { data: members, error } = await serviceClient
    .from("profiles")
    .select("id, full_name, membership_code")
    .not("membership_code", "is", null);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }

  return NextResponse.json({ members: members ?? [] });
}
```

Two things in the file's own header (`:13-31`) that the plan must respect when the
payload gains `role`:

```
 * The payload is every full name in the community, so the route is
 * `NetworkOnly` in the service worker (`src/app/sw.ts:41-44`) — read before
 * touching this route, not assumed. This plan changes **who may call**, not the
 * path and not the response body, so no cache rule and no invalidation is
 * affected.
```

That last sentence stops being true the moment `role` is added: this phase
**does** change the response body, so the service-worker note must be re-read and
the sentence corrected. And `no dato sensibile in colonna pubblica` applies — the
payload already carries every full name; a role label is design, not new PII, but
the plan should say so rather than leave it inferred.

---

### 14. `src/lib/offline/checkin-store.ts` — `DB_VERSION` 3 → 4 (store, IndexedDB)

**Analog: itself, and it is a *partial* match — read the caveat.**

**The record shape to widen** (`:88-93`) and its writer (`:932-955`):

```ts
/** A member of the roster, resolvable offline. A membership code is genuinely global. */
export interface MemberRecord {
  membershipCode: string;
  userId: string;
  fullName: string;
}
```

```ts
/**
 * Merge the member roster.
 *
 * It does not clear: the roster is the device's only way to resolve a
 * membership code offline, and emptying it during a refresh is the same defect
 * as emptying the attendee cache, in a different store.
 */
export async function cacheMembers(
  members: Array<{ id: string; full_name: string; membership_code: string }>
): Promise<number> {
  const db = await getDB();
  const tx = db.transaction("members", "readwrite");
  let merged = 0;
  for (const m of members) {
    await tx.store.put({
      membershipCode: m.membership_code,
      userId: m.id,
      fullName: m.full_name,
    });
    merged++;
  }
  await tx.done;
  return merged;
}
```

**The one prior upgrade** (`:41-42`, `:287-368`) — the pattern for the version bump, and the reason it is only a partial analog:

```ts
const DB_NAME = "resonate-checkin";
const DB_VERSION = 3;
```

```ts
  dbPromise = openDB<CheckinDB>(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion >= 3) return;

      // ── The route taken for the rekey, stated because a reader needs to know
      // the copy happened before the delete ─────────────────────────────────
      // IndexedDB cannot change a store's `keyPath` in place, ...
      //   1. READ every legacy row into memory — this is the copy;
      //   2. only then `deleteObjectStore` the legacy stores;
      //   3. re-create them under the SAME final names with `keyPath: "key"`;
      //   4. write the rekeyed rows back.
      // Never `deleteObjectStore` before the copy: those rows are attendance
      // records for people who paid, and some of them are on a device that is
      // offline right now and cannot be audited. If any step throws, the whole
      // `versionchange` transaction aborts and rolls back as a unit (W3C
      // IndexedDB: an aborted transaction undoes every change it made), so the
      // version-2 stores survive intact.
      //
      // Only `idb` promises are awaited in here — `getAll`, `get`, `put`. One
      // await on anything else would let the transaction close mid-migration,
      // and there is no test runner in this repository that could catch it.
```

**Why this is only a partial analog — a finding, not a nitpick.** The guard at
`:296` is `if (oldVersion >= 3) return;`, and the body is written as a **single
one-shot rebuild from "anything below 3"**. It never branches on `oldVersion`. A
v4 has to serve **two** entry paths — a device at v2 (never opened since the
Phase 31 release) and a device at v3 — and the existing code gives no shape for
that. The v3 body also unconditionally `deleteObjectStore`s `attendees` and
`pendingCheckins`; re-running that for a v3 → v4 hop would destroy queued
admissions.

**Consequence for the plan:** the v4 upgrade is a *new* pattern in this
repository, not a copy. `.planning/STATE.md` warns the upgrade must be exercised
before the first real night, and D-17 puts that exercise inside this phase.
`checkin-offline.md`: *an upgrade that strands a queued scan is unacceptable.*

**The queued-entry shape a stranded scan would live in** (`:96-114`, `:693-725`):
`PendingCheckin` is keyed `${partyId}:${subjectType}:${subjectId}`
(`attendeeKey`), and `checkInMemberLocally` writes `token: null` because a
membership QR has no signature.

---

### 15. `src/lib/offline/sync-manager.ts` — what travels with a queued membership scan

**Analog: itself**, `:177-212`:

```ts
/** Where an entry goes, and what travels with it. */
interface Target {
  url: string;
  body: Record<string, unknown>;
  legacySuccess: LegacySuccessCheck | null;
}

function targetFor(entry: PendingCheckin): Target {
  switch (entry.type) {
    ...
    case "membership":
      return {
        url: "/api/membership/verify",
        body: {
          code: entry.subjectId,
          partyId: entry.partyId,
          scannedAt: entry.scannedAt,
          deviceId: entry.deviceId,
          source: "offline_sync",
        },
        legacySuccess: null,
      };
```

The `guest` branch immediately below (`:213-224`) is the precedent for **stating a
missing field rather than sending one that would be ignored**:

```
      // `/api/tickets/attendance` accepts `guestListEntryId` and nothing else
      // (`route.ts:537`), so this path carries **less evidence** than the other
      // two: no device clock, no device id, and no `source` ... Stated rather
      // than papered over by sending fields that would be silently ignored.
```

That is the shape of the D-17 decision: either the roster carries `role` and the
queued entry carries it forward, or the marker is derived at sync time and the
plan says so out loud. D-17 has already chosen the first.

---

### 16. `src/app/(admin)/admin/scanner/ScannerClient.tsx` — the roster fetch and the offline refusal

**Analog: itself.** Both sites read this session.

**Roster refresh, with its non-fire-and-forget decision** (`:566-590`):

```tsx
        // `cacheMembers` is **not** fire-and-forget any more, and that is a
        // decision with a reason: its failure does have a consequence for a
        // scan. Offline, an unknown membership code is refused (see
        // `membershipOffline`), so a stale roster turns a member who joined
        // recently into a red screen in front of a queue. ...
        try {
          const membersRes = await fetch("/api/membership/list");
          if (!membersRes.ok) throw new Error(`HTTP ${membersRes.status}`);
          const membersBody = await membersRes.json();
          if (!Array.isArray(membersBody?.members)) {
            throw new Error("no members array in payload");
          }
          await cacheMembers(membersBody.members);
        } catch (error) {
          console.error("scanner:member_roster_failed", error);
          notices.push({
            key: "members",
            tone: "error",
            text: "The member list on this device was NOT refreshed. With the radio off, a member who joined recently may not be recognised — check them in from the list rather than refusing them.",
          });
        }
```

**The offline refusal, and the honest limit ACCT-02's manual procedure must
record** (`:1321-1351`):

```tsx
  /**
   * A membership code, from the roster this device downloaded.
   *
   * **A code the roster does not know is refused here, and a ticket in the same
   * position is admitted.** ... A membership QR carries no signature at all
   * (checkin-store.ts:29-32) and the code space is generated with
   * `Math.random()` (`src/utils/qr.ts:49`, open defect QR-01), so admitting an
   * unknown one offline would be an unbounded hole rather than a bounded one ...
   *
   * The cost is a real false refusal for a member who joined after the roster was
   * downloaded — which is why a failed roster refresh is now a banner on this
   * screen, and why the door runbook's answer is to check that person in from
   * the list rather than to re-scan.
   */
  async function membershipOffline(membershipCode: string, partyId: string) {
    try {
      const member = await findMember(membershipCode);
      if (!member) {
        refuse("unknown_code", membershipCode, "membership",
          "Not in the member list on this device — check them in from the list instead");
        return;
      }
```

This is the code that makes *"valid for entry immediately"* false at an offline
door. It must not be engineered around; the account-creation surface's copy says
*create staff accounts before the night*.

---

### 17. `scripts/container/seed.mjs` — the constraint relaxation and the four new assertions

**Analog: itself.** Two shapes to copy, both read this session.

**(a) The `try/finally` relaxation — the exact precedent D-05 needs** (`:216-238`):

```js
  // ── the nine personas ────────────────────────────────────────────────────
  //
  // The trigger `on_auth_user_created` mints a membership code with `random()`.
  // It is real product behaviour and it is left installed; it is only silenced
  // for the length of the seed, because a random code would make two identical
  // runs produce two different databases and the determinism contract is what
  // makes a diff between two captures mean anything.
  await admin.query('alter table auth.users disable trigger on_auth_user_created');
  try {
    for (const p of personas) {
      await admin.query(
        `insert into auth.users (id, email, raw_user_meta_data) values ($1::uuid, $2, '{}'::jsonb)`,
        [p.id, p.email]
      );
      await admin.query(
        `insert into public.profiles (id, email, full_name, membership_code, role, status)
         values ($1::uuid, $2, $3, $4, $5, $6)`,
        [p.id, p.email, p.fullName, p.membershipCode, p.role, p.status]
      );
    }
  } finally {
    await admin.query('alter table auth.users enable trigger on_auth_user_created');
  }
```

The D-04 relaxation wraps this same loop, with `DROP CONSTRAINT` before the `try`
and `ADD CONSTRAINT … NOT VALID` in the `finally`. RESEARCH § B.3 verified the
`NOT VALID` is **mandatory** on the restore.

**(b) The refusal shape for the four new assertions** (`:317-367`):

```js
/**
 * The refusal, and it is the reason this file is worth its length.
 *
 * A seed that silently under-fills a table produces a baseline that agrees for
 * the one reason that proves nothing. Exit 1 naming the table, on the same
 * principle as `rls-baseline.mjs`'s plausibility floors: investigate the seed,
 * never lower the requirement.
 */
async function assertDiscriminating(admin, allTables, owners, personas) {
  ...
  const { rows: grid } = await admin.query(
    `select role, status, count(*)::int as n from public.profiles group by role, status order by role, status`
  );
  const expectedCells = PERSONA_ROLES.length * PERSONA_STATUSES.length;
  if (grid.length !== expectedCells) {
    throw new Error(
      `the profiles table holds ${grid.length} of the ${expectedCells} role × status pairs. ` +
        '`organizer/pending` is the one cell where the two definitions of "organizer" disagree, and a ' +
        'grid with a hole cannot show it. Nothing was measured.'
    );
  }
```

Every new assertion follows this template: a measurement, a comparison against a
**written** expectation, and a `throw` whose message ends by naming what was *not*
measured. Note `expectedCells` is derived from `PERSONA_ROLES.length ×
PERSONA_STATUSES.length` at `:360` — adding `staff` to `PERSONA_ROLES` moves this
number to 12 automatically, which is correct, and is also why the seed and the
comparator must move in the same plan.

**The persona identity convention, which the four forbidden writes must not
violate** (`:32-39`, `:101-124`):

```js
 * NOTHING HERE RESEMBLES A REAL MEMBER (threat T-32-04-02). ... Every address is
 * at `.invalid` ... Every name is a ROLE, never a person. And every membership
 * code is one a real signup **cannot** mint: `handle_new_user()` draws from
 * `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, an alphabet with no `0` and no `1`, while
 * every code here is `RSN-SEED000<n>` — three zeroes in the middle.
```

```js
        id: `32000004-0000-4000-8000-${String(index).padStart(12, '0')}`,
```

The ordering of `PERSONA_ROLES` / `PERSONA_STATUSES` determines index 1, and index
1 is the row `min(id)` selects for the write matrix's `update` probe (RESEARCH
§ B.3). Append `'staff'` after `'member'`, or insert before `'master'`; never
reorder `PERSONA_STATUSES`.

---

### 18. `scripts/rls-baseline.mjs` — the fourth persona role

**Analog: itself**, `:638-646`, `:662-665`, `:689-695`:

```js
export const PERSONA_ROLES = ['master', 'organizer', 'member'];
export const PERSONA_STATUSES = ['approved', 'pending', 'rejected'];
const PERSONA_ANON = 'anon';
const PERSONA_NO_PROFILE = 'authenticated/no-profile';
export const PERSONA_LABELS = [
  PERSONA_ANON,
  PERSONA_NO_PROFILE,
  ...PERSONA_ROLES.flatMap((role) => PERSONA_STATUSES.map((status) => `${role}/${status}`)),
].sort(compareStrings);
```

```js
const EXPECTED_PERSONAS = {
  production: [PERSONA_ANON, PERSONA_NO_PROFILE, 'master/approved', 'member/approved'],
  container: [...PERSONA_LABELS],
};
```

```js
const PERSONA_SQL = `
select role, status, (array_agg(id order by id))[1]::text as subject
  from public.profiles
 where role in ('master','organizer','member')
   and status in ('approved','pending','rejected')
 group by role, status
`;
```

Three sites, not one: `PERSONA_ROLES` at `:638`, the `where role in (…)` literal
at `:692`, and — for production — `EXPECTED_PERSONAS.production` at `:663`, which
must **not** gain `staff` unless a `staff` row actually exists in production.

The secrecy rule for this file, at `:679-687`, applies to anything the plan adds:

```
 * **The uuid is used and discarded: only the label reaches the artefact.**
 * `.planning/` is tracked and this repository is PUBLIC (CLAUDE.md Guardrail
 * 5) — a member's uuid is a member identifier, and publishing one is
 * irreversible.
```

---

### 19. `scripts/verify-capabilities.mjs` — the fifth side

**Analog: itself.** Three shapes.

**(a) The pre-registered expectation, and the instruction not to edit it** (`:90-104`):

```js
/**
 * ── The pre-registered expectation ────────────────────────────────────────
 *
 * MEASURED on 2026-08-06 against `supabase/migrations/20260807000000_capability_model.sql`
 * section 7 and against `src/lib/capabilities/keys.ts`: eight rows, eight keys.
 * Written here, not derived from either side, for the reason
 * `rls-baseline.mjs:113-130` states about its floors: a check that reads its
 * expectation off the thing it is checking cannot fail.
 *
 * **If this trips, look at the capability model, not at this constant.** ...
 */
const EXPECTED_KEY_COUNT = 8;
```

The declared-refusal list of D-02 is exactly this shape: written in the script,
never derived from `role_capabilities`.

**(b) The refusal when a side measures empty** (`:465-489`):

```js
  const empty = [];
  if (tsKeys.length === 0) empty.push(`TS — ${capObject.reason ?? 'no keys parsed'}`);
  if (dbKeys.length === 0) empty.push('DB — private.capabilities returned no rows');
  ...
  if (empty.length) {
    refuse(
      `${empty.length} of the four sides measured EMPTY, so every comparison below would be ` +
        'vacuously green:\n  - ' + empty.join('\n  - ') +
        '\nA check that cannot fail is not a check. Nothing is asserted.',
      1
    );
  }
```

**(c) A side's own comparison, both directions, with an actionable message** (`:520-540`):

```js
  {
    const dbSet = new Set(dbKeys);
    const tsSet = new Set(tsKeys);
    const problems = [];
    for (const key of tsKeys)
      if (!dbSet.has(key))
        problems.push(
          `"${key}" is in ${KEYS_FILE} but has NO ROW in private.capabilities — ` +
            'MISSING FROM THE DATABASE. Every check against it answers false, forever.'
        );
    ...
    check('1 · TS and DB name the same keys', problems, `${tsKeys.length} keys, both directions`);
  }
```

**The sentence the fifth side falsifies, and which must be rewritten in the same
commit** (`:48-53`):

```
 * WHAT A GREEN MEANS, AND WHAT IT DOES NOT. It means the four declarations name
 * the same strings. It does not mean a capability is granted to the right
 * roles, and it does not mean a policy is correct — `private.role_capabilities`
 * is not read here at all.
```

A fifth side that reads the grant rows makes half of that paragraph false. Leaving
it is how a script's own documentation becomes a lie.

---

### 20. `src/emails/account-invitation.tsx` (email template)

**Analog A — the whole file:** `src/emails/member-approved.tsx:1-75`. It is the
shortest complete template and the closest act (an approval, which D-08 says
creation *is*):

```tsx
import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

interface MemberApprovedEmailProps {
  memberName: string;
  loginUrl: string;
}

export function MemberApprovedEmail({ memberName, loginUrl }: MemberApprovedEmailProps) {
  return (
    <EmailLayout preview="Your Resonate membership has been approved">
      <Heading style={{ color: BRAND.foreground, fontSize: "24px", fontWeight: "bold",
                        margin: "0 0 16px", fontFamily: "'Orbitron', 'Arial', sans-serif" }}>
        You&apos;re In, {memberName}
      </Heading>
      <Text style={{ color: BRAND.muted, fontSize: "16px", lineHeight: "1.5",
                     margin: "0 0 16px", fontFamily: "'Arial', sans-serif" }}>
        ...
      </Text>
      <Button href={loginUrl} style={{ backgroundColor: BRAND.accent, color: "#ffffff",
              fontWeight: "bold", borderRadius: "9999px", padding: "12px 32px",
              fontSize: "14px", textDecoration: "none", display: "inline-block",
              fontFamily: "'Orbitron', 'Arial', sans-serif" }}>
        Open Resonate
      </Button>
    </EmailLayout>
  );
}

export default MemberApprovedEmail;
```

**Analog B — the link-carrying button:** `src/emails/guest-invitation.tsx:99-114`,
whose label is already the sentence ACCT-03 needs and whose destination is the
hole D-23 names:

```tsx
      <Button
        href={claimUrl}
        style={{ ... }}
      >
        Set Your Password &amp; Claim Account
      </Button>
```

**Analog C — the send path:** `src/app/(admin)/admin/members/actions.ts:24-33`:

```ts
async function sendApprovalEmail(email: string, fullName: string) {
  const html = await render(
    MemberApprovedEmail({ memberName: fullName || "Member", loginUrl: APP_URL })
  );
  await sendEmail({ to: email, subject: "Welcome to Resonate - You're Approved!", html });
}
```

`sendEmail` is `src/lib/email.ts:12-40`; it throws on a Resend error (`:36-39`) and
picks the sender from `RESEND_FROM_EMAIL` at `:27-28`.

**Two gates that break this analog and must be applied deliberately:**

- `comms-analytics.md` gate *template in italiano*: every template above is in
  English. Member-facing transactional copy is **Italian**; the interface stays
  English. The new invitation is Italian.
- `comms-analytics.md` gate *due mittenti, due funzioni*: transactional from
  `noreply@`. And ACCT-03's static check — `grep -n "password" src/emails/<new>.tsx`
  must find no interpolated secret.

---

### 21. `src/types/database.ts` — widening `UserRole`, and the new register interface

**Analog: itself**, `:1-35`. The header states the import direction that governs
where the register's act union lives:

```ts
// The one import in this file, and the direction is inverted on purpose. The
// door's contract is shared by three places at once — the wire, the client and
// the `door_scan_events` table — so it is defined once in `@/lib/door/outcome`,
// which imports nothing, and is read from here. Re-declaring the literals would
// mean a divergence between the table and the response could survive until a
// night; importing them makes it a `npm run build` error ...
import type { DoorSubjectType, ... } from "@/lib/door/outcome";
import type { CapabilityKey } from "@/lib/capabilities/keys";

export type UserRole = "master" | "organizer" | "member";
export type UserStatus = "pending" | "approved" | "rejected";
```

So the register's `act` and `actor_kind` unions belong in a module that imports
nothing — `src/lib/door/outcome.ts` and `src/lib/capabilities/keys.ts` are the two
precedents — and are mirrored by the SQL `CHECK`, editing both sides in one commit.

**The `Profile` interface to keep aligned** (`:24-35`) already carries
`approved_via: 'referral' | 'guest_list' | 'admin_manual' | null`, so `admin_manual`
needs no type change — only a writer.

⚠ **Widening `UserRole` produces no new build errors.** RESEARCH § G.1: 17 sites
cast `role as UserRole`. The single compile-detectable site is
`updateMemberRole`'s parameter type at `actions.ts:113-116`, reached from
`MemberTable.tsx:221` and `:230`.

---

## Shared Patterns

### S-1 · Resolve identity once, from the DAL, never from a header

**Source:** `src/app/(admin)/admin/members/actions.ts:88-109` (quoted in § 7) and
`src/lib/capabilities/server.ts:103-116`.
**Apply to:** every new server action, every new route handler, the register write.

```
 * **And the half that was missing ... `cache()` does NOT memoise inside a Server
 * Action body, and does NOT memoise inside a Route Handler.** ...
 *   - In a **Server Action** or a **Route Handler**: destructure
 *     `getAccessContext()` **once** into a local and reuse the local. Never
 *     call `hasCapability()` twice ...
```

`server.ts:149-150`: *"**No new caller may branch on `role` or `status`.**"*
The register's `actor_id` is `ctx.userId` — never a form field, never a header.
`npm run verify:no-header-identity` asserts the header-reader count stays 0.

### S-2 · A failure must be a value at the boundary and observable in the UI

**Source:** `src/app/(admin)/admin/newsletter/actions.ts:92-135` (§ 8),
`src/lib/capabilities/server.ts:59-72`.
**Apply to:** `createAccount`, the widened `updateMemberRole`, the register write,
the `MASTER_EMAIL` reconciliation, the set-password surface.

```
 * There is also a boundary that no message can cross on its own: Next **redacts**
 * the message of an error thrown out of a Server Action in a production build.
 * ... A caller that needs the category on the client must carry it as a
 * **value**, not as a message.
```

Combined with `meta-gates.md` (no error tracking, verified 2026-08-05): a log line
reaches nobody. A `23514` refusal needs a rendered, distinct notice.

### S-3 · The service client bypasses all RLS — justify each use, and never on a read surface

**Source:** `src/lib/supabase/service.ts:3-7`; the refusal to use it is at
`src/app/(organizer)/organizer/events/[id]/review/page.tsx:91-97` (§ 10).
**Apply to:** the creation action (service client: **yes**, it needs
`auth.admin.*`), the register **write** (yes, via the RPC), the register **read**
(**no** — the normal server client, so RLS is the boundary).

`access-gating.md` gate *service role*: every new use justified in the commit,
and no untrusted input reaches it.

### S-4 · One transaction per migration, and say what happens to existing rows

**Source:** `20260805120000_door_scan_events.sql:14-17`, `:215-220`, `:235-239`;
`20260807000100_capability_model_fk_index.sql:8-10`.
**Apply to:** all five new migrations.

`supabase-data.md`: `IF NOT EXISTS` / `IF EXISTS` throughout; a new table gets RLS
and at least one policy **in the same migration**; `src/types/database.ts` moves in
the same commit.

### S-5 · A refusal must name what was *not* measured

**Source:** `scripts/container/seed.mjs:317-324`, `:332-339`;
`scripts/verify-capabilities.mjs:465-489`.
**Apply to:** every harness assertion this phase adds.

```
 * Exit 1 naming the table, on the same principle as `rls-baseline.mjs`'s
 * plausibility floors: investigate the seed, never lower the requirement.
```

Every message in both scripts ends with *"Nothing was measured."* — the phrase is
the convention, and a new assertion that reports a bare `false` breaks it.

### S-6 · `schema.sql` is edited for honesty and changes nothing measurable

**Source:** RESEARCH § Pattern 2, derived from
`scripts/rls-baseline-container.mjs:96-111` (`BASE_SCHEMA_COMMIT` /
`BASE_SCHEMA_BLOB` pin the initial-commit blob).
**Apply to:** `supabase/schema.sql:59`.

A plan that edits **only** `schema.sql` has changed nothing at all — not
production, not the container. It is still edited, in the same commit as the
migration.

### S-7 · Roles, never people — in seeds, in artefacts, in plans

**Source:** `scripts/container/seed.mjs:32-39`, `:117-119`;
`scripts/rls-baseline.mjs:679-687`.
**Apply to:** every new seed row, every new script message, every plan file.

`.invalid` addresses; `RSN-SEED000<n>` codes the trigger's alphabet cannot mint;
labels reach artefacts and identifiers do not.

### S-8 · At the door, the same query — never a second one

**Source:** `checkin-offline.md`;
`src/app/api/membership/verify/route.ts:263-274`, `:348-358`;
`20260805120000_door_scan_events.sql:126-130`.
**Apply to:** `entry_role`, the roster payload, and anything the register might
tempt someone to write from the door.

`role` joins the existing `select` at `verify/route.ts:272`. The register write
does **not** go on the door's hot path — D-18 already keeps a door override in
`door_scan_events`.

---

## No Analog Found

Three items have no precedent in this repository. Each is reported as absent
because approximating it would hand the planner a false analog.

| Item | Role | Data Flow | Evidence of absence |
|---|---|---|---|
| **The set-password write** — `supabase.auth.updateUser({ password })` | component + page | request-response (auth) | `grep -rn "updateUser" src/` returns **one** hit: `src/components/auth/ChangeEmailButton.tsx:20`, and it is `{ email: trimmed }`. `find src/app -path "*auth*"` returns only `(auth)/login`, `(auth)/register`, `api/auth/callback` — no reset, no update, no set-password route. `src/components/auth/ResetPasswordButton.tsx:19-21` only *sends* `resetPasswordForEmail` with `redirectTo: origin + "/dashboard"`, and `api/auth/callback/route.ts:9` defaults `next` to `/dashboard` — a loop, confirmed by reading both files |
| **An incremental IndexedDB upgrade** (v3 → v4) | store | file-I/O / schema migration | `src/lib/offline/checkin-store.ts:42` (`DB_VERSION = 3`) and `:294-368` — the **only** upgrade the file has ever contained. It is guarded by `if (oldVersion >= 3) return;` at `:296` and never branches on `oldVersion`; its body unconditionally `deleteObjectStore`s `attendees` and `pendingCheckins` at `:336-337`. There is no pattern here for "a device at v3 gains one field without losing its queue" |
| **A register of member acts** | migration + RPC | audit / append-only | RESEARCH § D.1, re-verified: `grep -l "audit" supabase/migrations/` returns one file, `20260805120000_door_scan_events.sql`, which is a **scan** log. `src/types/database.ts:24-35` is the complete `Profile` interface and carries no `approved_by` / `approved_at` / `promoted_by`. `door_scan_events` is an analog **by shape**, not by role: it records what was scanned at a party, not who changed whose identity, and its `operator_id NOT NULL REFERENCES auth.users` (`:108`) has no room for D-22's system actor |

**Two partial gaps, named so a plan does not mistake them for covered:**

| Item | What exists | What does not |
|---|---|---|
| A `staff` role option in the members UI | the `<select>` at `MemberTable.tsx:461-471` and the row guard at `:178-180` | any `staff` branch. `npm run build` reports nothing — the only compile-detectable role site is `updateMemberRole`'s parameter type at `actions.ts:113-116` |
| A "declared refusal" mechanism for a grant | the pre-registered constant pattern, `verify-capabilities.mjs:104` | any code that reads `private.role_capabilities`. `grep -n "role_capabilities" scripts/verify-capabilities.mjs` returns a comment at `:50` and a help string only — re-verified this session |

---

## Metadata

**Analog search scope:** `supabase/migrations/` (38 files listed, 7 read),
`supabase/schema.sql`, `scripts/` (`container/seed.mjs` in full,
`rls-baseline.mjs` §§ 625-740, `verify-capabilities.mjs` §§ 1-115 and 456-540),
`src/app/(admin)/admin/members/`, `src/app/(admin)/admin/newsletter/`,
`src/app/api/auth/callback/`, `src/app/api/membership/{list,verify}/`,
`src/app/(auth)/register/`, `src/app/(admin)/admin/scanner/ScannerClient.tsx`,
`src/app/(organizer)/organizer/events/[id]/review/`, `src/components/auth/`,
`src/components/admin/MemberTable.tsx`, `src/lib/offline/`,
`src/lib/guest-list/process-entry.ts`, `src/lib/capabilities/`,
`src/lib/supabase/{service,middleware}.ts`, `src/lib/email.ts`, `src/emails/`,
`src/types/database.ts`.

**Files opened this session:** 27. **Analogs cited with `file:line`:** 21 files.

**Project skills:** none — `.claude/skills/` and `.agents/skills/` do not exist.
The domain gates loaded from `.claude/rules/` were `meta-gates.md`,
`access-gating.md`, `supabase-data.md`, `checkin-offline.md`,
`comms-analytics.md`, `nextjs-architecture.md`, plus the six manual modules from
`CLAUDE.md`.

**Perishability:** every citation is a `file:line` against the working tree at
`gsd/phase-32-capability-model-in-the-database`, commit `6a741d6`. Re-verify any
citation before repeating it in a plan.

---

## PATTERN MAPPING COMPLETE

**Phase:** 43 — Role Model & Account Creation
**Files classified:** 24 (7 new, 17 modified)
**Analogs found:** 21 / 24

### Coverage
- Files with an exact analog: **18**
- Files with a role-match / partial analog: **3** (the register RPC, the one-shot
  reconciliation, the IndexedDB v4 upgrade)
- Files with **no analog**: **3** (the set-password write, an incremental
  IndexedDB upgrade, a member-act register)

### Key patterns identified
- **A migration corrects forward, in one transaction, and states what happens to
  rows that already exist.** `20260807000100_capability_model_fk_index.sql` is the
  correct-forward precedent; `20260805120000_door_scan_events.sql:14-17,215-220`
  is the transaction-and-existing-rows precedent. Both role `CHECK`s move in one
  file, by explicit name.
- **An append-only register already has a template in this repository, with its
  reasoning written.** `door_scan_events` (`:60-163`): `ON DELETE SET NULL` not
  `CASCADE`, a `NOT NULL` actor, a reversal as a further event, RLS on with a
  `SELECT` policy and **no** write policy. The one place it does not fit is
  D-22's system actor.
- **A capability gate resolves identity once, from Phase 33's module, and a
  failure crosses the Server Action boundary as a value.** `actions.ts:88-109`
  plus `newsletter/actions.ts:92-135`. `MemberTable.tsx:182-189` is the
  anti-pattern in the same tree, and it is where a `23514` would land today.
- **The harness refuses rather than degrades, and every refusal names what was not
  measured.** `seed.mjs:317-367` gives both the `try/finally` relaxation shape and
  the assertion shape for all four Wave 0 seed items.
- **The door's offline path has no pattern for gaining a field.** The only
  IndexedDB upgrade in the repo is a one-shot rebuild from "below v3" that deletes
  the queue. D-17's version bump is new work, and `checkin-offline.md` forbids
  stranding a queued scan.

### File created
`/Users/etiesse/Resonate/.planning/phases/43-role-model-account-creation/43-PATTERNS.md`

### Ready for planning
Pattern mapping complete. The planner can cite an analog with `file:line` for
every file this phase creates or modifies — and must treat the three absent
analogs as design work with no precedent to lean on, in particular the
set-password surface (ACCT-03 / D-23) and the IndexedDB v4 upgrade (D-17).
