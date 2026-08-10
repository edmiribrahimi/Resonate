# Phase 36: Formats & Series Numbering — Pattern Map

**Mapped:** 2026-08-10
**Files analysed:** 18 (8 new, 10 modified)
**Analogs found:** 15 / 18 with a real in-tree analog · 3 with **no analog** (stated plainly below)

> **This file is a publication.** `.planning/` is tracked and
> `github.com/edmiribrahimi/Resonate` is public. It names **roles**, never people;
> no venue under negotiation, no unannounced date, no line-up, no address. Where a
> series name would carry a venue, it is written `<venue>`.
>
> Every excerpt below was **copied from the current tree today**, with its
> `file:line`. Nothing is paraphrased from memory. Where the tree holds no analog,
> that is said instead of invented — an invented analog is worse than an admitted
> gap.

---

## File Classification

| New / Modified file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `supabase/migrations/2026XXXXXXXXXX_formats_and_series.sql` | migration (DDL + RLS) | schema / batch backfill | `supabase/migrations/20260809003000_party_credits.sql` | **exact** |
| ↳ its composite-key half | migration (referenced constraint) | schema | `20260809000000_party_assignments.sql:227-244` | **exact** |
| ↳ its backfill half | migration (data migration) | batch | `20260226400000_party_lineup_venue_secret.sql:4-16` | partial — *the value here derives from nothing* |
| ↳ its public read policy | RLS policy | request-response | `20260225150000_party_architecture.sql:31-37` + `20260226200000_venues.sql:25-27` | **exact** (two opposite answers, both in tree) |
| `src/types/database.ts` | model / types | — | `EventParty` at `:71-91` | **exact** |
| `src/lib/routes/capability-routes.ts` | config / declaration | — | `CAP.ORGANIZER_ACCESS` at `:248-264` (target shape) vs `CAP.CATALOGUE_MANAGE` at `:321-325` (current shape) | **exact — but a branch change** |
| `src/lib/routes/staff-tabs.ts` | config / nav | — | `staff-tabs.ts:88-94` | **exact** |
| `src/app/(admin)/admin/(work)/formats/page.tsx` *(new)* | route file (page) | CRUD read | `src/app/(admin)/admin/(work)/venues/page.tsx` | **exact** for shape · **gap** for the `Add` button |
| `src/app/(admin)/admin/formats/actions.ts` *(new)* | server actions | CRUD | `src/app/(admin)/admin/venues/actions.ts` | **exact** |
| `src/app/(admin)/admin/formats/CreateFormatModal.tsx` *(new)* | component (client) | form / CRUD | `src/components/venues/CreateVenueModal.tsx` | **exact** for the `<dialog>`, **gap** for its mount point |
| `src/app/(admin)/admin/formats/RetireFormatDialog.tsx` *(new)* | component (client) | destructive confirm | `CreateVenueModal.tsx:140-172` (dialog + error box) | role-match — **no destructive-confirm dialog exists in the tree** |
| `src/components/formats/FormatMarker.tsx` *(new)* | component (server-safe) | presentational | `EventTabs.tsx:82-92` (the lineup pill) | role-match — **no runtime-hex inline style exists in product code** |
| `src/components/formats/ColorSwatchPicker.tsx` *(new)* | component (client) | form input | `EventForm.tsx:780-804` (native `<select>` styling) | partial — **no `radiogroup` exists in the tree** |
| `src/app/(public)/events/FormatFilterRow.tsx` *(new)* | component (server) | navigation | `members/growth/page.tsx:63-71` (`<Link>` pill toggle) | **role-match, strong** |
| `src/app/(public)/events/page.tsx` | page (server component) | request-response + searchParams | `(work)/analytics/compare/page.tsx:15-36`; `members/growth/page.tsx:27-48` | **exact** |
| `src/app/(public)/events/EventTabs.tsx` | component (client) | client state → address | `analytics/compare/page.tsx:49-60` (typed href) | partial — **no client component in the tree drives state through the URL** |
| `src/app/(public)/events/[slug]/page.tsx` | page (server component) | request-response | itself, `:628-639` | **exact** (self-analog) |
| `src/app/(admin)/admin/events/actions.ts` | server actions | CRUD + named-refusal branch | `[id]/assignments/actions.ts:88-140`; `admin/venues/actions.ts:174-180` | **exact** |
| `src/components/events/EventForm.tsx` | component (client) | form | itself, `:14-127`, `:780-823` | **exact** (self-analog) |
| `scripts/rls-baseline.mjs` | test harness / probe | batch | `:1226-1229` (payload), `:1467-1475` (refs), `:1566-1589` (constraint probe) | **exact** |
| `scripts/container/seed.mjs` | test harness / seed | batch | `:92` `SEED_ORDER`, `:101-109` `REFERENCEABLE` | **exact** |

---

## Pattern Assignments

### `supabase/migrations/2026XXXXXXXXXX_formats_and_series.sql` (migration, schema + batch)

**Analog:** `supabase/migrations/20260809003000_party_credits.sql` — 361 lines, and the
closest thing in the repository to what this phase writes: a catalogue-referencing
table hanging off `event_parties`, with named constraints, capability policies,
`(select …)` wrapping, and a paragraph for every choice that could be misread.

**Header form — the shape of the docblock** (`20260809003000_party_credits.sql:1-45`):

```sql
-- Public credits for a night — the table whose guarantee is a MISSING COLUMN
-- Phase 35, Plan 05: ASSIGN-06, ASSIGN-07
--
-- Changes:
-- 1. public.party_credits — who is credited on a night, by relation to
--    `public.artists`, with NO column naming an account and NO write policy
-- 2. its RLS, which INHERITS the publication gate of `event_parties` and must
--    never be given the unconditional read its nearest neighbour carries
-- 3. the sentence that says which of `event_parties.lineup` and this table wins
--    for what — a deliverable of this migration, not a courtesy
--
-- Three changes, ONE transaction, and each half is bad in its own way:
--
--   * the table without its RLS is the LINE-UP OF EVERY NIGHT, announced or not,
--     readable in full by anyone holding the anonymous key through PostgREST.
```

> Copy the **structure**: numbered list of changes, then *"n changes, ONE
> transaction, and each half is bad in its own way"* with the concrete damage of
> each half. For phase 36 the halves are: the catalogue without its RLS; the RLS
> without the tables (`42P01`); the columns without the backfill (`SET NOT NULL`
> on a populated table); the backfill without the guard (`23502` with no sentence).

**Idempotence, declared not presumed** (`:31-45`, condensed at `:37-43`):

```sql
--   * `CREATE TABLE IF NOT EXISTS` for `public.party_credits`, with both named
--     constraints declared INSIDE it — re-running this file against a database
--     that already holds the table is a no-op on the table, which is the
--     intended behaviour. A CHANGED constraint set is a NEW migration, never an
--     edit to this one (`supabase-data.md`, gate *migration in avanti*);
--   * `IF NOT EXISTS` on the index;
--   * `DROP POLICY IF EXISTS` before each of the two policies.
```

**Transaction envelope:** `BEGIN;` at `:47`, `COMMIT;` at `:361`.

**Named constraints declared INSIDE the table, with the reason in prose**
(`20260809003000_party_credits.sql:73-75` and `:100-107`) — **this is the exact
precedent D-36-08 asks for:**

```sql
  -- IN WHICH ROLE. Four values, and the constraint is NAMED so that a refusal
  -- arrives as `party_credits_credit_check` and not as an anonymous `23514`
  -- somebody has to go looking for.
  credit text NOT NULL,
```

```sql
  CONSTRAINT party_credits_credit_check CHECK (
    credit IN ('dj', 'photographer', 'host', 'visual')
  ),

  -- The same artist, in the same role, twice on the same night is a duplicate
  -- and not a fact. Two DIFFERENT roles for the same artist on the same night —
  -- somebody who plays and also shoots — is legitimate and this key allows it.
  CONSTRAINT party_credits_unique UNIQUE (party_id, artist_id, credit)
);
```

**`ON DELETE` carries its motivation, in the first person** (`:60-71`) — the model
for `format_id` / `series_id` both taking `RESTRICT`:

```sql
  -- WHICH NIGHT. `CASCADE`, the same choice `party_assignments.party_id` makes
  -- (`20260809000000:225-231`) and for the same reason: a credit on a night that
  -- no longer exists is not evidence of anything. […]
  party_id uuid NOT NULL REFERENCES public.event_parties ON DELETE CASCADE,

  -- WHO IS CREDITED — by RELATION to a catalogue row, never by name repeated
  -- here. `ON DELETE RESTRICT` and not `CASCADE`: deleting an artist who is
  -- credited on a night would silently rewrite what that night was, and the
  -- credit is the only structured record that the attribution was ever made.
  -- Detach the credit first, which is a deliberate act.
  artist_id uuid NOT NULL REFERENCES public.artists ON DELETE RESTRICT,
```

**Index rule — one only if the unique key does not already lead with the column**
(`:158-167`):

```sql
-- The read this table actually serves is *"the credits of this night"*, and it
-- is already covered: `party_credits_unique` creates a btree index leading with
-- `party_id`, so no second index on that column is added here — a redundant
-- index is write cost with no read benefit […]
CREATE INDEX IF NOT EXISTS idx_party_credits_artist ON public.party_credits (artist_id);
```

**The inherited publication gate — copy verbatim, change only the join column**
(`:211-228`). ⚠️ **The comment at `:215-218` is the trap the research measured**
(Pitfall 3): it is true for `party_credits` and **false** for `party_series`.

```sql
ALTER TABLE public.party_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS party_credits_select_published ON public.party_credits;

-- The publication gate, inherited through the night. `ep.id = party_id` compares
-- the inner alias against THIS table's column — `event_parties` has no column of
-- that name, so the reference is unambiguous, the same shape
-- `event_parties_select_published` uses with `event_id`.
CREATE POLICY party_credits_select_published ON public.party_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1
        FROM public.event_parties ep
        JOIN public.events e ON e.id = ep.event_id
       WHERE ep.id = party_id
         AND e.is_published = true
    )
  );
```

> **`event_parties` WILL have a `series_id` column after this migration**, so
> the unqualified form becomes `ep.series_id = ep.series_id` — a tautology that
> compiles, never fails, and is `USING (true)` in disguise. Qualify with the
> policy's own table: `WHERE ep.series_id = party_series.id`.

**The capability read arm, with the `(select …)` wrapper declared load-bearing**
(`:230-249`):

```sql
DROP POLICY IF EXISTS party_credits_select_catalogue_manage ON public.party_credits;

-- […]
-- The `(select …)` wrapper is LOAD-BEARING and it is not `STABLE` that produces
-- it: it makes Postgres evaluate the call once per statement as an InitPlan
-- instead of once per row (`20260807000000_capability_model.sql:177-184`). A new
-- policy written in the older `public.is_admin_or_organizer()` shape would be
-- both a wrong predicate and a per-row call.
--
-- `catalogue.manage` and not a new key: […] Minting
-- a ninth key for it would create a permission nobody holds and a decision
-- nobody took.
CREATE POLICY party_credits_select_catalogue_manage ON public.party_credits
  FOR SELECT USING ((SELECT private.has_capability('catalogue.manage')));
```

**The absence of write policies is a paragraph, not a hole** (`:251-275`):

```sql
-- =============================================================================
-- 3. No INSERT, UPDATE or DELETE policy — and the omission is DELIBERATE
-- =============================================================================
--
-- Writes arrive from the catalogue surface with the SERVICE client, which
-- bypasses every policy: a write policy here would therefore constrain nothing
-- on the only path that writes, while reading to the next person as though the
-- boundary were covered. […]
-- Two other tables in this repository omit their write policies on purpose
-- (`20260805120000_door_scan_events.sql:158-163`,
-- `20260808002000_membership_register.sql:337-343`), and
-- `20260809000000_party_assignments.sql` is the third. Without this paragraph
-- the next reader takes the gap for a bug and repairs it […]
```

**A new refusal is declared AND measured** (`:323-343`) — the model for the
`ON UPDATE NO ACTION` refusal that the composite key introduces:

```sql
-- MEASURED, not reasoned. `npm run baseline:compare --target=container
-- --before-point=35-02 --after-point=35-05` reports three cells moving:
--
--     master/approved × artists × delete   ok:1 → 23503
--     master/pending  × artists × delete   ok:1 → 23503
--     master/rejected × artists × delete   ok:1 → 23503
--
-- No policy changed — `artists_delete_master` is byte-identical across the two
-- captures. The comparator labels this NARROWING because it compares outcomes
-- and cannot see that a constraint, not a policy, produced it […]
```

**And it names what it did NOT do** (`:350-359`) — the model for recording that
this phase does **not** fix the anon-readable secret venue address (D-36-18):

```sql
-- WHAT IS NOT DONE HERE, AND MUST BE. Today the deletion path at
-- `src/app/(organizer)/organizer/artists` would surface this as whatever a raw
-- PostgREST error looks like. This repository has NO ERROR TRACKING
-- (`meta-gates.md`), so an unexplained failure on that button reaches a human
-- only if that human is looking at it. […]
-- Recorded in `.planning/phases/35-per-night-assignments/deferred-items.md`; it
-- is NOT done in this plan, and saying so is the point.
```

---

#### Sub-pattern: the referenced composite key (FMT-03)

**Analog:** `supabase/migrations/20260809000000_party_assignments.sql:200-244` —
`profiles_id_role_unique`, which exists *only* to be a foreign-key target. This
is the pattern to reuse literally for `party_series_id_format_unique`.

**Why `DO` and not `DROP … IF EXISTS` + `ADD`** (`:200-220`):

```sql
-- **La forma precedente produceva esattamente il fallimento che dichiarava di
-- prevenire.** Era `DROP CONSTRAINT IF EXISTS` seguito da `ADD CONSTRAINT`, e
-- l'`IF EXISTS` sopprime *«non esiste»*, non *«qualcos'altro dipende da essa»*:
-- […]
--   ERROR:  cannot drop constraint profiles_id_role_unique on table profiles
--           because other objects depend on it
--   DETAIL:  constraint party_assignments_assignee_role_fk on table
--            party_assignments depends on index profiles_id_role_unique
--
-- `2BP01` invece di `42710`, transazione in rollback, coda ferma […]
-- La forma corretta e' **non toccare un vincolo referenziato**: crearlo se
-- manca, e altrimenti lasciarlo esattamente dov'e'. Non c'e' `ALTER TABLE ...
-- ADD CONSTRAINT IF NOT EXISTS` in Postgres — di qui il `DO` […]
```

**The block itself + the comment that forbids tidying it away** (`:227-244`):

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'profiles_id_role_unique'
       AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_role_unique UNIQUE (id, role);
  END IF;
END;
$$;

COMMENT ON CONSTRAINT profiles_id_role_unique ON public.profiles IS
  'Redundant against the primary key as a rule about data; NOT redundant as a referenced key. '
  'party_assignments_assignee_role_fk REFERENCES public.profiles (id, role) and Postgres refuses '
  'a foreign key whose referenced columns carry no unique constraint (42830). Do not remove as tidying.';
```

---

#### Sub-pattern: the public read gate this phase must not open

**The gate itself, still byte-intact** (`20260225150000_party_architecture.sql:31-37`):

```sql
-- Published events' parties readable by anyone
CREATE POLICY event_parties_select_published ON public.event_parties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.is_published = true
    )
  );
```

**The unconditional neighbour — right for `formats`, wrong for `party_series`**
(`20260226200000_venues.sql:25-27`; identical at
`20260226100000_artist_profiles.sql:25-27`):

```sql
create policy "venues_select_public"
  on public.venues for select
  using (true);
```

**Also at `20260226200000_venues.sql:29-39` — the deprecated write-policy shape.
Do NOT copy it** (the current form is `(select private.has_capability('…'))`):

```sql
-- Organizers and master can insert
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

---

#### Sub-pattern: the backfill, and why the in-tree analog does not transfer

**Analog:** `20260226400000_party_lineup_venue_secret.sql:4-16` — the only prior
`event_parties` column addition with a backfill.

```sql
ALTER TABLE event_parties
  ADD COLUMN IF NOT EXISTS lineup text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS venue_secret boolean NOT NULL DEFAULT false;

-- Backfill from parent event values
UPDATE event_parties ep
SET
  lineup = COALESCE(e.lineup, '{}'),
  venue_secret = COALESCE(e.venue_secret, false)
```

**Two reasons the planner must NOT copy this form:**

1. **It works there because the value derives from the parent event.** A format
   derives from nothing, so a constant `DEFAULT` would write the same format onto
   every night (against D-36-04) and would survive the migration — a night saved by
   a path that forgets the column would silently acquire that format, which is the
   exact silent failure `meta-gates.md` forbids.
2. **It omits the `public.` schema qualifier** (`ALTER TABLE event_parties`, not
   `ALTER TABLE public.event_parties`). Every migration written since — including
   both `20260809*` analogs above — qualifies. Follow the recent files, not this one.

**The older backfill-then-`SET NOT NULL` sequence does exist in tree**
(`20260225150000_party_architecture.sql:108-116`) and is the correct *order*, minus
the guard:

```sql
ALTER TABLE public.ticket_tiers ADD COLUMN party_id uuid REFERENCES public.event_parties ON DELETE CASCADE;

UPDATE public.ticket_tiers tt
SET party_id = (
  SELECT ep.id FROM public.event_parties ep
  WHERE ep.event_id = tt.event_id AND ep.type = 'main'
);

ALTER TABLE public.ticket_tiers ALTER COLUMN party_id SET NOT NULL;
```

**No analog exists for the `RAISE EXCEPTION` guard between the backfill and the
`SET NOT NULL`.** No migration in `supabase/migrations/` counts residual rows and
raises with the count. `36-RESEARCH.md` §6 gives the shape; the planner writes it
new. Its nearest sibling in discipline is not SQL at all — it is
`scripts/rls-baseline-container.mjs:243-251`, which refuses to say *"a migration
failed"* without the file name.

---

### `src/types/database.ts` (model / types)

**Analog:** the `EventParty` interface it must extend, `:71-91`:

```ts
export interface EventParty {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  end_time: string | null;
  menu_closes_at: string | null;
  venue_text: string | null;
  access_type: AccessType;
  capacity: number | null;
  venue_id: string | null;
  lineup: string[];
  venue_secret: boolean;
  venue_secret_hint: string | null;
  venue_reveal_hours: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

Style to copy: flat interface, snake_case keys matching columns exactly, `| null`
for nullable, no `Database` generic anywhere. New `Format` and `PartySeries`
interfaces follow the same shape (see `Event` at `:55-69` for the
`created_by: string | null` / `created_at: string` tail).

**The warning that must travel into the plan:** none of the four Supabase clients
is parameterised with `Database`, so this file is documentation, not enforcement.
A misspelt `format_id` in a `.select()` produces **no build error**.
(`supabase-data.md`, gate *tipi allineati*, is still a hard requirement — it just
buys less than it looks like it does.)

---

### `src/lib/routes/capability-routes.ts` (config / declaration) — **a branch change, not a line addition**

**The union both branches come from** (`:129-160`):

```ts
type Binding =
  | {
      /** The addresses this key opens. Declaration order is IRRELEVANT. */
      routes: readonly RoutePattern[];
      /**
       * May a live per-night assignment open these? (D-34-03)
       * […]
       */
      assignmentOpenable?: true;
      /** True when the key ALSO gates rows. Four of the twelve do. */
      alsoGatesTables?: true;
    }
  | {
      scope: TableOnly;
      /** One line, mandatory. A gate that cannot say so would be satisfied by a lie. */
      reason: string;
    };
```

**Branch B — where `CAP.CATALOGUE_MANAGE` sits TODAY** (`:321-325`). It opens
**no address**; `resolveRoute` returns `null` for a page bound to it, and the
middleware fails closed — the surface would be unreachable for everyone:

```ts
  [CAP.CATALOGUE_MANAGE]: {
    scope: "table",
    reason:
      "Gates rows, not addresses; the enforcement is the four `artists` / `venues` organizer policies in the migrations.",
  },
```

**Branch A — the shape the rewrite must take.** Two in-tree examples of a key that
opens addresses *and* gates rows (`:274-277`, `:285-288`):

```ts
  [CAP.REGISTER_READ]: {
    routes: ["/admin/members/register"],
    alsoGatesTables: true,
  },
```

```ts
  [CAP.STAFF_MANAGE]: {
    routes: ["/admin/events/[id]/media"],
    alsoGatesTables: true,
  },
```

**The closing line that makes the whole thing a build gate** (`:344`) — and the
docblock at `:162-171` explaining that `satisfies` and `as const` are both
load-bearing:

```ts
} as const satisfies Record<CapabilityKey, Binding>;
```

**Cost of the rewrite, stated for the planner:** `reason` has no home on branch A
— the sentence moves to a `/** … */` comment above the entry, which is what every
branch-A entry already does (`:266-273`, `:279-284`, `:290-298`). And
`alsoGatesTables: true` is **optional**: forgetting it produces no build error and
a declaration that lies by omission — the lie D-34-11 exists to prevent.

**If the plan instead binds the route to `CAP.ORGANIZER_ACCESS`** (the twins'
choice), the change is one array element at `:249-263` and no branch moves:

```ts
  [CAP.ORGANIZER_ACCESS]: {
    routes: [
      "/admin",
      "/admin/artists",
      "/admin/venues",
      […]
    ],
  },
```

The divergence between page key and action key is already documented in tree and
must be read before choosing — `(work)/venues/page.tsx:38-40`:

```
 * `catalogue.manage` is still the key the **actions** re-ask inside themselves
 * (`admin/venues/actions.ts`) — a different question from reachability, and one
 * that `requires_approved` where this one does not.
```

---

### `src/lib/routes/staff-tabs.ts` (config / nav)

**Analog:** the tab table at `:88-94`, and the assertion below it that every tab's
`href` resolves to the capability the tab declares:

```ts
  { href: "/admin/events", label: "Events", capability: CAP.ORGANIZER_ACCESS },
  { href: "/admin/members", label: "Members", capability: CAP.ORGANIZER_ACCESS },
  { href: "/admin/artists", label: "Artists", capability: CAP.ORGANIZER_ACCESS },
  { href: "/admin/venues", label: "Venues", capability: CAP.ORGANIZER_ACCESS },
  { href: "/admin/newsletter", label: "Newsletter", capability: CAP.ADMIN_ACCESS },
  { href: "/admin/finance", label: "Finance", capability: CAP.ADMIN_ACCESS },
  { href: "/admin/analytics", label: "Analytics", capability: CAP.ADMIN_ACCESS },
```

The runtime check at `:104-118` fails loudly if the two disagree:

```ts
  const resolution = resolveRoute(tab.href);
```
```
      `staff-tabs: the "${tab.label}" tab points at "${tab.href}", which no entry `
```

> If the plan adds a tab, its `capability` must be **the same key** the map binds
> to that address. Hiding a nav item is not protecting a route
> (`access-gating.md`, gate *coerenza navigazione/permessi*).

---

### `src/app/(admin)/admin/(work)/formats/page.tsx` (new — route file, CRUD read)

**Analog:** `src/app/(admin)/admin/(work)/venues/page.tsx` — the nearest existing
catalogue-management surface, and the file `36-UI-SPEC.md` §S5 names for structure.

**Imports + guard + query, whole** (`(work)/venues/page.tsx:1-6`, `:49-64`):

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
```

```tsx
export default async function AdminVenuesPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09).
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, slug, address, photo_url")
    .order("name", { ascending: true });
```

**Layout + empty state + row markup** (`:66-107`) — this is exactly the
`space-y-2` / `rounded-xl border border-card-border bg-card p-3` skeleton
`36-UI-SPEC.md` §S5 asks for:

```tsx
  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Venues</h1>
      </header>

      <div className="px-6">
        {!venues || venues.length === 0 ? (
          <p className="text-center text-muted py-12">No venues yet.</p>
        ) : (
          <div className="space-y-2">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.slug}`}
                className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3 hover:bg-card/80 transition-colors"
              >
```

The twin at `(work)/artists/page.tsx:63-99` is byte-similar; both are one file
where there were two (D-34-05), and both carry the merge reasoning in a docblock
(`(work)/artists/page.tsx:8-44`) worth copying in form.

**⚠️ Gap the planner must own — there is NO analog for the `Add format` button.**
Neither catalogue page has a create affordance at all. The only creation entry
points for `venues` / `artists` are the modals mounted inside `EventForm.tsx:1195`
(from the venue autocomplete). The catalogue surface S5 asks for a page-level
`[ Add format ]` primary action, and **no page in the tree has one.** Its shape has
to be designed, not copied — nearest ingredients: the submit button styling at
`CreateVenueModal.tsx:291-297`, and the `<dialog>` open/close plumbing at
`CreateVenueModal.tsx:37-50`.

---

### `src/app/(admin)/admin/formats/actions.ts` (new — server actions, CRUD)

**Analog:** `src/app/(admin)/admin/venues/actions.ts` — same key, same client
choice, same 23505 branch. Copy it closely.

**The guard, whole** (`admin/venues/actions.ts:64-85`) — including the second
throw category for an unresolvable identity:

```ts
async function assertCatalogueManage(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();

  // catalogue.manage — requires_approved = true. This is the key the P3 RLS
  // policies on `artists` and `venues` ask. Do NOT substitute staff.manage:
  // it is requires_approved = false and admits a pending organizer to a
  // surface that writes `venues.address`.
  if (!capabilities.has(CAP.CATALOGUE_MANAGE)) {
    throw new Error("forbidden.catalogue_manage_required");
  }

  if (!userId) {
    console.error(
      "[capabilities.identity_missing] a caller holds catalogue.manage but " +
        "my_access_context() returned no user_id. This is NOT a refusal on " +
        "the merits — the migration adding user_id has not been applied."
    );
    throw new Error("capabilities.identity_missing");
  }

  return { userId };
}
```

Its docblock at `:44-50` states two rules the format actions inherit verbatim:

```
 * ── Why it is a local function and not an import ──────────────────────────────
 * […] It is deliberately NOT exported — every export of a `"use server"`
 * module is a public endpoint, and a gate is not one.
```

**Which client, and why the cookie client is not an accident** (`:122-132`):

```ts
export async function createVenue(formData: FormData) {
  // ⚠️ `createClient()` — the COOKIE client, on purpose. Under it the P3 RLS
  // policy on `venues` is a second, independent refusal of an unapproved
  // caller. `getServiceClient()` bypasses every row-level policy, so swapping
  // it here would leave `assertCatalogueManage()` below as the ONLY thing
  // refusing one […] Do not swap it.
  const supabase = await createClient();
  const { userId } = await assertCatalogueManage();
```

> **Decision the plan owes a sentence to.** `36-RESEARCH.md` §2 recommends *no
> write policy* on `formats` / `party_series` because the writer is the service
> client — which is the opposite of what this analog does. Whichever is chosen, the
> migration and the action must agree, and the file must say which.

**The write, the slug-collision handling, and the 23505 branch** (`:146-183`):

```ts
  // Generate slug
  let slug = slugify(name);
  const { data: existingSlug } = await supabase
    .from("venues")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
```
```ts
  if (error) {
    // Handle unique constraint violation
    if (error.code === "23505") {
      throw new Error("A venue with this name already exists");
    }
    throw new Error(`Failed to create venue: ${error.message}`);
  }

  revalidatePath("/admin/venues");
  return { success: true, id: venue.id, slug: venue.slug };
```

> `revalidatePath` here is what `npm run verify:routes` **check 1** reads
> (`scripts/verify-routes.mjs:34-51`, `:459-466`): the argument must be a declared
> address or the script fails. Any `revalidatePath("/admin/formats")` requires the
> map entry to exist first.

---

### `src/app/(admin)/admin/formats/CreateFormatModal.tsx` (new — client component, form)

**Analog:** `src/components/venues/CreateVenueModal.tsx` — the repository's only
`<dialog>` modal pattern, and the one `36-UI-SPEC.md` §S5 names.

**Open/close plumbing** (`:37-50`):

```tsx
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  const handleDialogClose = useCallback(() => {
    onClose();
  }, [onClose]);
```

**Dialog shell + backdrop-click-to-close + `max-w-md rounded-2xl`** (`:140-155`):

```tsx
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none bg-black/80 backdrop:bg-transparent p-0"
      onClose={handleDialogClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
    >
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-card-border bg-background p-6">
```

**The error box — the exact `red-500/10` + `red-400` treatment `36-UI-SPEC.md`
reserves for the destructive path** (`:168-172`):

```tsx
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
```

**Text field styling to reuse for Name / Code** (`:205-217`):

```tsx
              <input
                id="venue-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address..."
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50 text-sm"
              />
```

**Submit / cancel pair** (`:289-306`):

```tsx
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Profile"}
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                disabled={isSubmitting}
                className="rounded-full border border-card-border px-6 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
```

**Error handling shape to copy, and its one flaw** (`:119-123`):

```tsx
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
```

> ⚠️ **Do not copy this branch as-is for the duplicate-number path.** It renders
> `err.message` directly, and `src/lib/capabilities/server.ts:59-63` records that
> **Next redacts the message of an error thrown out of a Server Action in a
> production build** — so a client branching on message text works in `next dev`
> and stops where it counts. The category must travel as a **returned value**.
> See the refusal-union analog below.

---

### `src/app/(admin)/admin/formats/RetireFormatDialog.tsx` (new — destructive confirm)

**No analog exists.** There is no confirmation dialog for a destructive action
anywhere in `src/`. The pieces to assemble it from:

- the `<dialog>` shell and open/close effect — `CreateVenueModal.tsx:37-50`, `:140-152`
- the destructive fill and ink — `CreateVenueModal.tsx:169-171` (`red-500/10` +
  `red-400`), which is the only place in the tree those two co-occur
- `Cancel` as the default-focused button — **new**; `CreateVenueModal` focuses nothing
  in particular

Recording this as a gap rather than pointing the planner at an approximate file:
the retire flow is the only place in this phase where a wrong default costs a
catalogue row's usability, and `36-UI-SPEC.md` §S5 specifies `Cancel` focused.

---

### `src/components/formats/FormatMarker.tsx` (new — presentational component)

**Nearest analog by role and placement:** the lineup pill on the event card,
`src/app/(public)/events/EventTabs.tsx:82-92` — a small inline chip rendered in
the exact slot the marker row goes above:

```tsx
              {event.lineup.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {event.lineup.map((artist) => (
                    <span
                      key={artist}
                      className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent font-medium"
                    >
                      {artist}
                    </span>
                  ))}
                </div>
              )}
```

**The insertion point on the card** (`EventTabs.tsx:71-81`) — `36-UI-SPEC.md` §S2
puts the marker row between the date line and the title:

```tsx
              <p className="mb-1 text-sm text-muted">
                {formatDateRange(event.start_date, event.end_date)}
              </p>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-semibold">{event.title}</h3>
                {event.is_draft && (
                  <span className="shrink-0 rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                    Draft
                  </span>
                )}
              </div>
```

**Gap 1 — no runtime-hex inline style exists in product code.** Measured today:
88 `style={{ … }}` sites across `src/`, and **not one** applies a colour from a
runtime value. The only colour-bearing inline styles are in the email tree, from a
compile-time constant (`src/emails/components/email-layout.tsx:76`,
`style={{ borderColor: BRAND.cardBorder }}`). The swatch's
`style={{ background: color }}` is therefore **new to this codebase** — which is
also the point of D-36-12, and the plan should say so rather than imply a precedent.

**Gap 2 — no `normal-case`, no `aria-current`, no `aria-pressed` anywhere in
`src/`.** Measured today: zero matches for all three. `tabular-nums` **does** exist
(4 sites, e.g. `src/app/(public)/events/[slug]/DrinkMenu.tsx:105`). So the explicit
`normal-case` that `36-UI-SPEC.md` §0 rule 3 mandates is a first, and nothing in
tree is being made inconsistent by adding it.

**The inherited-uppercase hazard the spec names, in tree** (`EventTabs.tsx:197`,
`:207`) — the adjacent tabs whose classes must not be copied onto a format chip:

```tsx
          className={`pb-3 text-sm font-semibold uppercase tracking-widest transition-all active:scale-95 active:opacity-80 ${
```

---

### `src/components/formats/ColorSwatchPicker.tsx` (new — form input)

**No `radiogroup` exists in the tree** (zero matches for `radiogroup` and
`role="radio"`). The closest existing control is a native `<select>`, with the
input styling the phase should stay inside — `EventForm.tsx:780-804`:

```tsx
        {/* Access Type */}
        <div className="space-y-2">
          <label
            htmlFor={`${idPrefix}-access-type`}
            className="block text-sm font-medium text-foreground"
          >
            Access Type
          </label>
          <select
            id={`${idPrefix}-access-type`}
            value={subEvent.access_type}
            onChange={(e) =>
              updateSubEvent(index, "access_type", e.target.value)
            }
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus:ring-1 focus:ring-accent/50"
          >
```

**The total-`Record` label pattern to copy for the six palette choices**
(`EventForm.tsx:100-104`) — a value added without a label fails the build:

```tsx
const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  free_public: "Free (Open to all)",
  free_rsvp: "Free (RSVP required)",
  paid: "Paid (Tickets)",
};
```

The same discipline is documented as a deliberate contract at
`[id]/assignments/actions.ts:72-82`:

```
 * Exported for the surface, which holds a **total** `Record` of labels over it —
 * so a fifth assignable key cannot reach the interface without a label, and a
 * key removed here leaves an unreachable label.
```

---

### `src/app/(public)/events/page.tsx` (page, server component, request-response + searchParams)

**Analog for the `searchParams` signature:** four pages already use the local-interface
form; `36-RESEARCH.md` §4 says to follow it and not the Next 16 global
`PageProps` helper. Best excerpt — `(work)/analytics/compare/page.tsx:15-36`:

```tsx
interface PageProps {
  searchParams: Promise<{ events?: string; mode?: string }>;
}

export default async function AdminEventComparisonPage({
  searchParams,
}: PageProps) {
  […]
  const params = await searchParams;
  const selectedIds =
    params.events?.split(",").filter(Boolean) ?? [];
  const mode: "absolute" | "per-attendee" =
    params.mode === "absolute" ? "absolute" : "per-attendee";
```

The inline-annotation variant, if the plan prefers it — `members/growth/page.tsx:27-48`:

```tsx
export default async function MemberGrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ granularity?: string }>;
}) {
  […]
  const { granularity: granularityParam } = await searchParams;
  const granularity: "weekly" | "monthly" =
    granularityParam === "weekly" ? "weekly" : "monthly";
```

> **Both analogs already implement the "unrecognised value means the default"
> rule** the phase needs (`params.mode === "absolute" ? … : …`). No validation
> library, no error, no redirect — exactly what `36-UI-SPEC.md` §*The URL contract*
> requires for `?format=` and `?tab=`.

**The typed-href pattern, and the trap it documents** —
`(work)/analytics/compare/page.tsx:49-60`. This is the measured answer to *"why
can't I build the href in a variable?"*:

```tsx
  // Build search params string preserving events for mode toggle.
  //
  // Both hrefs are stored in a variable, so they need a type: form 3 of plan
  // 34-01. `Route` (i.e. `Route<string>`) is enough here and checks something
  // real — the base is a STATIC route, so the value lands on `RouteImpl`'s
  // `${StaticRoutes}${SearchOrHash}` arm and a misspelt base fails to compile.
  // The ternary is what makes each branch a literal: the previous single
  // template widened the whole expression to `string`, which is what
  // `typedRoutes` refused. The strings produced are byte-for-byte the same.
  const eventsParam = selectedIds.length > 0 ? `events=${selectedIds.join(",")}` : "";
  const perAttendeeHref: Route = eventsParam
    ? `/admin/analytics/compare?${eventsParam}&mode=per-attendee`
```

**The query and the draft gate to extend** (`events/page.tsx:57-68`):

```tsx
    const canSeeDrafts = capabilities.has(CAP.STAFF_MANAGE);

    const query = supabase
      .from("events")
      .select("slug, title, date, venue_secret, lineup, is_published, event_parties(id, date, venue_text, sort_order, venue_secret, venue_secret_hint, lineup, venues(name, address, google_maps_url))")
      .order("date", { ascending: true });

    if (!canSeeDrafts) {
      query.eq("is_published", true);
    }
```

**The aggregation to extend with a format axis** (`events/page.tsx:85-104`) — the
dedup-by-key loop over `sort_order`-sorted parties. Formats travel the same road:

```tsx
      // Build deduplicated venues array from all parties
      const seen = new Set<string>();
      const venues: VenueInfo[] = [];
      const sorted = [...parties].sort((a, b) => a.sort_order - b.sort_order);
      for (const p of sorted) {
        const venueData = p.venues;
        const venue = venueData ? (Array.isArray(venueData) ? venueData[0] ?? null : venueData) : null;
        const key = venue?.name ?? p.venue_text ?? "";
        if (!key && !p.venue_secret) continue;
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
```

**The comment that must NOT be deleted or weakened** (`events/page.tsx:42-57`,
head) — it is the record that this page cannot prove a gate:

```tsx
    // MEASURED, and quoted rather than re-derived (33-RESEARCH.md): forging a
    // master identity header on this page returns the SAME two event slugs as
    // an anonymous request — AND STILL DOES WITH THE MIDDLEWARE STRIP REMOVED
    // — because RLS on `public.events` refuses unpublished rows to `anon`
    // regardless of what `canSeeDrafts` decides. […] `/events` IS NOT A VALID CRITERION-2 PROBE:
    // it reports "no difference" because it cannot see one.
```

**⚠️ The `catch` that swallows everything** (`events/page.tsx:135-139`) — a live
instance of the pattern `meta-gates.md` forbids, sitting on the page this phase
edits. The plan should decide, in writing, whether the catalogue query goes inside
or outside it:

```tsx
  } catch {
    // Graceful fallback: render empty state if DB unavailable
    upcoming = [];
    past = [];
  }
```

Note that `getAccessContext()` is deliberately resolved **outside** it
(`:29-33`), and the reason is written there — the same reasoning applies to a
catalogue read whose failure would silently empty the chip row.

---

### `src/app/(public)/events/FormatFilterRow.tsx` (new — server component, navigation)

**Analog:** the granularity toggle at `members/growth/page.tsx:63-71` — the only
`<Link>`-as-toggle in the tree, and structurally what a chip row is:

```tsx
        <div className="flex gap-2">
          <Link
            href="/admin/members/growth?granularity=weekly"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              granularity === "weekly"
                ? "bg-accent text-white"
                : "bg-card border border-card-border text-muted hover:text-foreground"
```

**What to take:** `rounded-full`, the ternary on active state, `<Link>` with a
literal href, server-rendered with no client boundary.
**What NOT to take:** the active state here is `bg-accent text-white` — accent is
**barred from the format channel** by `36-UI-SPEC.md` §*Color*. The chip's on-state
is `bg-card` + `text-foreground` + `aria-current`, never accent. And this analog
has no `aria-current` at all (zero in the tree), so that attribute is new.

---

### `src/app/(public)/events/EventTabs.tsx` (modified — client component, state → address)

**Self-analog.** The state to move (`:117`), the derived offset (`:125`), and the
two setters (`:151-185`):

```tsx
export default function EventTabs({ upcoming, past }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
```
```tsx
  // Base offset: 0% for upcoming, -50% for past
  const baseOffset = activeTab === "upcoming" ? 0 : -50;
```
```tsx
  const switchTab = useCallback((tab: "upcoming" | "past") => {
    if (isAnimating || tab === activeTab) return;
    setIsAnimating(true);
    setDragX(0);
    setActiveTab(tab);
    setTimeout(() => setIsAnimating(false), 300);
  }, [isAnimating, activeTab]);
```

The swipe terminus that must keep working without waiting on the network
(`:151-177`, tail):

```tsx
    if (dragX < -threshold && activeTab === "upcoming") {
      setIsAnimating(true);
      setDragX(0);
      setActiveTab("past");
      setTimeout(() => setIsAnimating(false), 300);
    } else if (dragX > threshold && activeTab === "past") {
```

**No analog exists for a client component that drives its state through the URL.**
Measured: `useSearchParams` appears only in three client pages
(`(public)/payment/callback/page.tsx:10`, `(auth)/register/page.tsx:25`,
`(auth)/login/page.tsx:10`), and all three **read** a param on mount — none writes
one back with `router.replace`. The pattern `36-RESEARCH.md` §4 recommends
(keep `useState` for the animation, add `router.replace` inside `useTransition`,
resync from the prop with `useEffect`) is **new to this codebase**, and the plan
should carry the reason rather than present it as house style.

---

### `src/app/(public)/events/[slug]/page.tsx` (modified — page)

**Self-analog.** The party header block the marker goes above (`:628-639`):

```tsx
              {/* Party header */}
              <div className="mb-3">
                <p className="text-foreground font-medium">{party.title}</p>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon /> {formatPartyDate(party.date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon /> {formatTime(party.time)}
                    {party.end_time && ` - ${formatTime(party.end_time)}`}
                  </span>
                </div>
```

**The per-night secrecy verdict already computed on this page** (`:609-621`) —
this is the value the marker's series-name degradation (`36-UI-SPEC.md` §S3) must
read, not a second derivation:

```tsx
          const { visible: venueVisible, hint: venueHint } = isVenueVisible({
            partyDate: party.date,
            partyTime: party.time,
            venueSecret: party.venue_secret,
            hasTicketForParty,
            hasMasterTicket,
            isApproved,
            isOrganizer,
            isMasterRole,
            venueRevealHours: party.venue_reveal_hours,
            venueSecretHint: party.venue_secret_hint,
            venueRevealOnPurchase: party.venue_reveal_on_purchase,
          });
```

> **Read carefully before wiring:** `36-UI-SPEC.md` §S2/§S3 gates the series name
> on `venue_secret` (the *stored flag*), while `isVenueVisible` returns a
> *time- and entitlement-dependent* verdict. They are not the same predicate. The
> narrower one wins (`venue-secrecy.md`, gate *default chiuso*), and the plan must
> say which it uses.

---

### `src/app/(admin)/admin/events/actions.ts` (modified — server actions, CRUD + refusal branch)

**Analog for the refusal union — the strongest error-path model in the tree:**
`src/app/(admin)/admin/events/[id]/assignments/actions.ts:88-140`.

**Named SQLSTATE constants** (`:88-95`):

```ts
/** PostgreSQL `check_violation`. */
const CHECK_VIOLATION = "23514";
/** PostgreSQL `foreign_key_violation`. */
const FOREIGN_KEY_VIOLATION = "23503";
/** PostgreSQL `unique_violation`. */
const UNIQUE_VIOLATION = "23505";
```

**The refusal type, with the reason it is a union and not a string** (`:97-112`):

```ts
/**
 * Every way a grant or a revocation can be refused, one value each.
 *
 * There is no shared "something went wrong": the recorded precedent in this
 * repository is the newsletter form collapsing three causes into one sentence
 * (`.planning/codebase/CONCERNS.md`), and this product has **no error tracking**
 * (`meta-gates.md`), so this returned value is the only place a refusal exists
 * for a human.
 */
export type AssignmentRefusal =
  /** `partyId` is not a uuid. Nothing was asked of the database. */
  | "invalid_party"
```

**And the two-halves rule for a constraint that is also guarded in the app**
(`:123-140`) — the shape the duplicate-number path should take:

```ts
  /**
   * ASSIGN-04, refused by this file **before** the database is asked.
   *
   * The `CHECK` is the RULE; this is the SENTENCE A PERSON READS. If this guard
   * were deleted the database would still refuse
   * (`party_assignments_no_self_grant`, `23514`) — and that is precisely why the
   * two halves do not substitute for each other: one keeps the row from
   * existing, the other tells the operator what happened instead of handing them
   * a constraint name.
   */
  | "self_assignment"
  /**
   * The same rule, reached at the database.
   *
   * Practically unreachable now that the guard above runs first, and kept for
   * exactly that reason: the day it is returned, the app-level guard has stopped
   * working and this value says so instead of hiding it inside `write_failed`.
   */
```

**The bug this phase MUST fix, in the file it edits** — `updateEvent`'s per-night
writes discard their result (`admin/events/actions.ts:375-420`). The named
constraint of D-36-08 would fire and reach nobody:

```ts
  // Upsert parties
  for (const party of data.parties) {
    if (party.id && existingIds.has(party.id)) {
      await client
        .from("event_parties")
        .update({
          title: party.title.trim(),
          […]
          updated_at: new Date().toISOString(),
        })
        .eq("id", party.id);
    } else {
      await client.from("event_parties").insert({
        event_id: eventId,
        […]
      });
    }
  }
```

**The contrast, in the same file** — `createEvent` **does** check (`:296-302`):

```ts
  const { error: partyError } = await supabase
    .from("event_parties")
    .insert(partyRows);

  if (partyError) {
    throw new Error(`Failed to create parties: ${partyError.message}`);
  }
```

**Where the three new fields are validated** — the per-party loop at
`admin/events/actions.ts:134-187`. Follow its form: one `throw new Error` per
distinct cause, numeric coercion in place:

```ts
    if (!VALID_ACCESS_TYPES.includes(party.access_type)) {
      throw new Error("Invalid access type for a sub-event");
    }
    if (party.capacity !== undefined && party.capacity !== null) {
      const cap = Number(party.capacity);
      if (isNaN(cap) || cap < 1) {
        throw new Error("Capacity must be a positive integer");
      }
      party.capacity = cap;
    }
```

**Revalidation helper to extend if a new address is added** (`:210-217`):

```ts
/** Revalidate all paths that display events */
function revalidateEventPaths(slug?: string) {
  revalidatePath("/admin/events");
  revalidatePath("/events");
  if (slug) {
    revalidatePath(`/events/${slug}`);
  }
}
```

---

### `src/components/events/EventForm.tsx` (modified — client component, form)

**Self-analog.** Three parallel shapes must all gain `format_id`, `series_id`,
`number` together, or the field silently never reaches the action.

`SubEventFormState` + its default (`:20-56`, tail):

```tsx
    access_type: "paid",
    capacity: "",
    sort_order: sortOrder,
  };
}
```

`PartyInitialData` (`:58-77`, tail):

```tsx
  access_type: AccessType;
  capacity: number | null;
  sort_order: number;
}
```

`subEventFromInitial` (`:106-127`, tail) — note the `?.toString() ?? ""`
convention for numbers held as strings in form state:

```tsx
    venue_reveal_hours: p.venue_reveal_hours?.toString() ?? "",
    venue_reveal_on_purchase: p.venue_reveal_on_purchase ?? true,
    access_type: p.access_type,
    capacity: p.capacity?.toString() ?? "",
    sort_order: p.sort_order,
  };
}
```

**The numeric input styling for the series-number field** (`:806-823`) — add
`tabular-nums`, keep everything else:

```tsx
          <input
            id={`${idPrefix}-capacity`}
            type="number"
            value={subEvent.capacity}
            onChange={(e) => updateSubEvent(index, "capacity", e.target.value)}
            placeholder="Leave empty for unlimited"
            min={1}
            className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
          />
```

**No analog for helper text under a field.** The spec asks for two
(`text-xs text-muted` beneath the number field and beneath the series name).
`EventForm` uses `placeholder` instead. New, small, and worth naming so it is not
dropped as decoration — the number-field helper is the only place the
"stored, never recalculated" contract is stated to the person typing.

---

### `scripts/rls-baseline.mjs` (modified — probe harness)

**The payload that breaks the moment `format_id` becomes `NOT NULL`** (`:1224-1229`):

```js
  // A party needs its event, a title and a start time. `venue_secret` defaults
  // to false, so nothing here creates a row that could later be revealed.
  event_parties: {
    insert: { columns: ['event_id', 'title', 'time'], values: ['{{events}}', PROBE_TEXT, `'18:00'::time`] },
    update: 'description',
  },
```

**The placeholder mechanism and its quoting rule** (`:1205-1210`):

```js
  // NOTE ON THE QUOTES, because getting them wrong produces a syntax error and
  // not a wrong measurement: `substituteReferences` expands `{{table}}` to
  // `'<uuid>'::uuid` — the literal quotes AND the cast are part of the
  // substitution. So the placeholder is written BARE here, exactly as every
  // other entry in this table writes it.
```

**The reference list to extend, with the precedent that says why** (`:1460-1475`):

```js
/**
 * The tables a `{{placeholder}}` may point at.
 *
 * `artists` was added by plan 35-05 for `party_credits.artist_id`, which is
 * `NOT NULL` against it: without a real id there, the probe would fail `23503`
 * on every persona and measure the foreign key instead of the policy.
 */
export const PROBE_REFERENCE_TABLES = [
  'artists',
  'discount_codes',
  'drink_orders',
  'event_parties',
  'events',
  'profiles',
  'ticket_tiers',
];
```

**The constraint-probe pattern for FMT-03 and the composite key** (`:1566-1589`) —
runs on the privileged connection, asserts the constraint **name** and not only
the SQLSTATE:

```js
export const CONSTRAINT_PROBES = [
  {
    id: 'ASSIGN-04',
    what: 'nobody assigns to themselves',
    table: 'party_assignments',
    sqlstate: '23514',
    constraint: 'party_assignments_no_self_grant',
    insert: {
      columns: ['party_id', 'user_id', 'capability', 'assignee_role', 'assigned_by', 'ends_at'],
      values: [
        '{{event_parties}}',
        '{{profiles}}',
        `'door.supervise'`,
        `'master'`,
        // The self-grant, and the whole point: the SAME account in both columns.
        '{{profiles}}',
        PROBE_FUTURE_INSTANT,
      ],
    },
  },
];
```

And the rule that makes such a probe measure **one** rule (`:1504-1513`):

```js
 * WHAT MAKES THE ROW MEASURE ONE RULE AND NOT ANY OTHER. Every other condition
 * on the row is deliberately SATISFIED: […] The ONLY
 * thing wrong with it is that `assigned_by` equals `user_id`. If a run reports
 * `23514` from a DIFFERENT constraint, the row has drifted and the probe is
 * measuring something else — which is why the constraint's NAME is asserted and
 * not only the SQLSTATE.
```

> For FMT-03 that means: a duplicate-triple probe must satisfy the composite FK
> (a series that really belongs to that format), or it measures `23503` instead of
> `23505`. And the composite-key probe must use a **valid** number so the unique
> key does not fire first.

---

### `scripts/container/seed.mjs` (modified — seed harness)

**The ordered list the two new tables must enter, before `event_parties`** (`:87-92`):

```js
/**
 * Seeding order. Not alphabetical: a foreign key has to point at a row that
 * already exists. Everything not named here is seeded afterwards, in sorted
 * order, and by then every referenced table is populated.
 */
const SEED_ORDER = ['events', 'event_parties', 'ticket_tiers', 'discount_codes', 'drink_orders'];
```

**The referenceable list, and the precedent that explains when `SEED_ORDER` is
NOT needed** (`:94-109`) — note it explicitly does **not** apply here, because
`event_parties` is inside `SEED_ORDER` and therefore seeded before the sorted
`rest`:

```js
/**
 * The tables a `{{placeholder}}` in a payload may point at.
 *
 * `artists` was added by plan 35-05 for `party_credits.artist_id`. It is not in
 * `SEED_ORDER` and does not need to be: `rest` is sorted, and `artists` sorts
 * before `party_credits`, so its ids exist by the time the credits are seeded.
 */
const REFERENCEABLE = [
  'artists',
  'discount_codes',
  'drink_orders',
  'event_parties',
  'events',
  'profiles',
  'ticket_tiers',
];
```

**The declaration-not-derivation rule this file states about itself** (`:119-123`)
— worth quoting into the plan if the seed gains a format declaration:

```js
 * WHY IT IS DECLARED HERE INSTEAD OF READ. Written down, not derived from the
 * database, for the reason `verify-capabilities.mjs:107-121` gives about its own
 * constant and `rls-baseline.mjs:113-130` about its floors: **a check that reads
 * its expectation off the thing it is checking cannot fail.**
```

---

## Shared Patterns

### Capability guard on a work page

**Source:** `src/app/(admin)/admin/(work)/venues/page.tsx:52-58` (identical at
`(work)/artists/page.tsx:46-55`, `members/growth/page.tsx:32-44`,
`analytics/compare/page.tsx:22-30`)
**Apply to:** the new catalogue `page.tsx`

```tsx
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09).
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }
```

Never a role list. The key asked here must be the key the map binds to this
address, or the middleware and the page can disagree.

### Capability guard inside every server action

**Source:** `src/app/(admin)/admin/venues/actions.ts:64-85`
**Apply to:** every export of `admin/formats/actions.ts`, and any new export of
`admin/events/actions.ts`

Non-exported local function; two distinct throw categories (`forbidden.*` and
`capabilities.identity_missing`); a `console.error` only on the second, because it
is not a refusal on the merits. A server action is a public endpoint with a
convenient signature (`nextjs-architecture.md`, gate *server action autorizzata*).

### Error categories as returned values, never as messages

**Source:** `src/lib/capabilities/server.ts:59-63`
**Apply to:** the duplicate-number path, every catalogue action, the retire path

```
 * There is also a boundary that no message can cross on its own: Next **redacts**
 * the message of an error thrown out of a Server Action in a production build.
 * A client that branches on `err.message.startsWith("capabilities.resolve_failed")`
 * works in `next dev` and stops working where it matters. A caller that needs the
 * category on the client must carry it as a **value**, not as a message.
```

The union to model on is `AssignmentRefusal`
(`admin/events/[id]/assignments/actions.ts:106-140`). Branch on `error.code`
(`"23505"`), never on `error.message`; log `error.code` and `error.message`, never
the whole object and never `error.details` (`postgrest-details-leaks-the-row.md`).

### Existing 23505 handling, three sites to stay consistent with

- `admin/venues/actions.ts:174-180` — `if (error.code === "23505") throw new Error("A venue with this name already exists");`
- `admin/artists/actions.ts:189`
- `admin/events/[id]/tickets/actions.ts:288`, `:383`

All three **throw a message**. The phase-36 path should return a value instead
(previous pattern) — a deliberate divergence, and one the plan should declare
rather than let the reviewer discover.

### The input/field styling contract

**Source:** `CreateVenueModal.tsx:209-216` (text), `EventForm.tsx:788-794`
(select), `EventForm.tsx:814-822` (number)
**Apply to:** the format `<select>`, the series `<select>`, the number field, the
modal's name/code fields

```
rounded-xl border border-card-border bg-background px-4 py-3 text-foreground
placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50 text-sm
```

Labels: `block text-sm font-medium text-foreground`, wrapped in `space-y-2`.

### Card / row surface

**Source:** `(work)/venues/page.tsx:81` and `events/[slug]/page.tsx:626`
**Apply to:** catalogue rows (S5), and anything mounted in the party block (S3)

```
rounded-xl border border-card-border bg-card p-3 hover:bg-card/80 transition-colors
```

### Destructive treatment

**Source:** `CreateVenueModal.tsx:169-171` — the only `red-500/10` + `red-400`
pair in the tree
**Apply to:** the retire confirmation and its error box, and nothing else

```tsx
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
```

### Migration prose conventions

**Source:** `20260809003000_party_credits.sql` throughout
**Apply to:** the phase's single migration

1. Header enumerating the changes + *"n changes, ONE transaction, and each half is
   bad in its own way"* (`:1-45`)
2. `BEGIN;` / `COMMIT;` (`:47`, `:361`)
3. `CREATE TABLE IF NOT EXISTS` with named constraints **inside**;
   `CREATE INDEX IF NOT EXISTS`; `DROP POLICY IF EXISTS` before each `CREATE POLICY`
   (`:37-43`)
4. Every constraint **named**, with the reason in the comment above it (`:73-75`)
5. Every `ON DELETE` motivated in the first person (`:60-71`)
6. `(select private.has_capability('…'))` with the wrapper declared load-bearing
   (`:234-239`)
7. A missing write policy is a **paragraph** (`:251-275`)
8. An index only where the unique key does not already lead (`:158-167`)
9. A new refusal path is declared **and measured** against `baseline:compare`
   (`:323-359`), and what was **not** done is named (`:350-359`)

---

## No Analog Found

| File / concern | Role | Data flow | What is actually missing |
|---|---|---|---|
| `RetireFormatDialog.tsx` | component (client) | destructive confirm | **No confirmation dialog exists anywhere in `src/`.** The `<dialog>` shell and the red treatment can be borrowed from `CreateVenueModal.tsx`; the two-button confirm, the `Cancel`-focused default and the focus trap are new. |
| `FormatMarker.tsx` — the runtime-hex swatch | component | presentational | **Zero product components apply a colour from a runtime value.** 88 `style={{ … }}` sites in `src/`, none colour-bearing from data; the only colour inline styles are in `src/emails/**` from the compile-time `BRAND` constant (`email-layout.tsx:76`). Also new: `normal-case` (0 matches), `aria-current` (0), `aria-pressed` (0). |
| `ColorSwatchPicker.tsx` | component (client) | form input | **No `radiogroup` and no `role="radio"` in the tree.** Arrow-key roving focus, `aria-disabled` on a taken colour, and a check glyph on the selected swatch are all new. Nearest ingredient is the total-`Record` label pattern (`EventForm.tsx:100-104`). |
| `EventTabs.tsx` — state written back to the URL | component (client) | navigation | **No client component in the tree writes a search param.** `useSearchParams` appears 3× and only reads (`payment/callback/page.tsx:10`, `register/page.tsx:25`, `login/page.tsx:10`). The `router.replace` + `useTransition` + `useEffect` resync shape is new. |
| The catalogue page's `Add format` button | route file | CRUD | **Neither `(work)/venues/page.tsx` nor `(work)/artists/page.tsx` has any create affordance.** Creation happens only through modals mounted inside `EventForm.tsx:1195`. A page-level primary action on a catalogue surface has no precedent. |
| The migration's backfill guard (`RAISE EXCEPTION` with a count) | migration | batch | **No migration in the tree counts residual rows and raises with the count.** The nearest discipline is a script: `scripts/rls-baseline-container.mjs:243-251`, which refuses to report a failure without naming the file. |
| Helper text under a form field | component | form | `EventForm.tsx` uses `placeholder` only. The two `text-xs text-muted` helpers §S4/§S5 require are new. |

---

## Anti-patterns visible in the analogs — copy the shape, not these lines

| Where | What | Why not |
|---|---|---|
| `events/page.tsx:135-139` | `catch { upcoming = []; past = []; }` | A failed catalogue read would render an empty chip row indistinguishable from a healthy one. `meta-gates.md`, *zero fallimenti silenziosi*. Note `getAccessContext()` is deliberately outside it (`:29-33`). |
| `admin/events/actions.ts:375-420` | per-night writes whose result is never destructured | The named constraint of D-36-08 would fire and the action would still return `{ success: true }`. Fixing this is a **deliverable** of the phase, not a courtesy. |
| `20260226200000_venues.sql:29-39` | policies written as `exists (select 1 from public.profiles where … role in (…))` | Superseded by `(select private.has_capability('…'))` since 2026-08-07. |
| `20260226400000_party_lineup_venue_secret.sql:4-6` | `ALTER TABLE event_parties` unqualified, with a constant `DEFAULT` | Recent migrations qualify with `public.`; a constant default is precisely what D-36-04 forbids here. |
| `20260809003000_party_credits.sql:215-218` | unqualified `ep.id = party_id` in a policy | Correct there, a **tautology** for `party_series` because `event_parties` will have a `series_id` column. Qualify: `ep.series_id = party_series.id`. |
| `CreateVenueModal.tsx:119-121` | `setError(err instanceof Error ? err.message : …)` | Next redacts Server Action messages in production builds (`capabilities/server.ts:59-63`). |
| `members/growth/page.tsx:66-70` | active toggle = `bg-accent text-white` | Accent is barred from the format channel (`36-UI-SPEC.md` §*Color*). |
| `EventTabs.tsx:197`, `:207` | `uppercase tracking-widest` on the adjacent tabs | Copying these classes onto a format chip breaks `re:sonate` / CamelCase for every visitor at once (`36-UI-SPEC.md` §0 rule 3). |

---

## Metadata

**Analog search scope:** `supabase/migrations/` · `src/app/(public)/events/**` ·
`src/app/(admin)/admin/**` · `src/components/**` · `src/lib/routes/**` ·
`src/lib/capabilities/**` · `src/types/database.ts` · `scripts/**` · `src/emails/**`

**Files read in full or in targeted ranges:** 22
**Tree-wide measurements taken today:** `style={{` sites (88, none colour-from-data),
`aria-current` (0), `aria-pressed` (0), `radiogroup` / `role="radio"` (0),
`normal-case` (0), `tabular-nums` (4), `searchParams` server-page signatures (5),
`23505` handling sites (6 files), `CreateVenueModal` mount points (1).

**Pattern extraction date:** 2026-08-10

*Phase 36 — pattern map. Every excerpt copied from the current tree with its
`file:line`; every gap named instead of filled. Contains no venue under
negotiation, no unannounced date, no line-up and no personal name: `.planning/`
is tracked and this repository is public.*
