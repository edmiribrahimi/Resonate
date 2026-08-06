# Phase 31 — Verification

**Phase:** 31 — live defects at the door and the bar
**Written:** 2026-08-06
**Requirements covered:** FIX-01 … FIX-13 (fourteen rows, FIX-11 carries two)
**Contract this answers:** `31-VALIDATION.md` § Per-Requirement Verification Map

> `.planning/` is tracked in a **public** repository. This document names **roles,
> never people**. It carries identifiers, never names or addresses of any kind.

---

## How to read this document

There is **no test runner for the product**. `package.json` has no `test` script
(`package.json:6-10` lists `dev`, `build`, `start`, `lint`, `verify:persona` and
nothing else), and the repository contains no `*.test.*` or `*.spec.*` file.
**Nothing here is verified because tests pass.** Every claim below is exactly one
of three things, and each section says which:

- **`file:line`** — a static assertion anyone can re-check by opening the file at
  that line. Every line number in this document was **re-read against the tree at
  commit `3b8f5e7`**, not copied from a plan or a summary. Line numbers moved
  during the phase; a citation pointing at the wrong line is worse than none,
  because it looks checked.
- **observable** — a behaviour visible on a screen, in the data, or in a response
  body.
- **manual** — a written procedure naming the role, the device and the network
  state, executed and written down.

Where the third kind does not exist yet, this document **says so in that
requirement's own section**. A green build is not allowed to stand in for it.

---

## The state of this phase in one table

| | |
|---|---|
| `npm run build` on the merged branch | **PASS** — `next build --webpack`, every route emitted |
| Service worker produced by the build | **YES**, 53,166 bytes at `public/sw.js`, containing the door's four route patterns |
| Refund probe (both DDL claims) | **EXECUTED**, both CONFIRMED — throwaway PostgreSQL 16.14 container, destroyed |
| 31-04 migration applied to a throwaway container | **YES**, and verified structurally |
| 31-04 migration applied to the **production** database | **YES — 2026-08-06**, via the Management API migrations endpoint, recorded as version `20260806111113`. Eight structural observations verified below |
| A third foreign key to `tickets` found by doing it | **`pending_purchases`** — the SumUp payment record, still `NO ACTION`, reproducing Probe B on a table no plan had looked at. Corrected **before** applying |
| Code paths that write to `door_scan_events` | **still never executed.** The table exists; the behaviour is unobserved |
| The door pass — production build, phone, radio off | **NOT EXECUTED** |
| Blocking checkpoints | **one closed** (31-04 Task 3), **three open** (31-01 Task 3, 31-11 Task 4, 31-13 Task 2), **plus** 31-04's RLS half, which the Management API cannot close because it bypasses RLS |

Everything written under **observable** and **manual** below still stands
unexecuted. The schema now exists in production, which removes the reason those
observations were impossible — it does not make them done.

---

## The limit on the automatic gate, discovered during this phase

**None of the four Supabase clients is parameterised with `Database`.** Verified
by opening all four:

- `src/lib/supabase/client.ts:4` — `return createBrowserClient(` — no generic
- `src/lib/supabase/server.ts:7` — `return createServerClient(` — no generic
- `src/lib/supabase/middleware.ts:15` — `const supabase = createServerClient(` — no generic
- `src/lib/supabase/service.ts:4` — `return createClient(` — no generic

`src/types/database.ts` exists and is imported for local annotations, but it is
**never wired to a client**. The consequence is exact and it narrows every green
build in this phase: **no column name in any Supabase query in this repository is
checked by the type checker.** On a phase that adds a sixteen-column table and
rewrites five refund writers, "npm run build passes" means *the TypeScript is
well-formed*. It does not mean a single column exists.

This is recorded here rather than in a plan summary because it changes what the
only automatic gate this project has is able to prove.

---

## The service worker was never built in production, and now is

**The defect.** `@serwist/next` 9.5.6 is a **webpack** plugin. Next 16 builds
with Turbopack by default and `turbopack: {}` is set at `next.config.ts:17`, so
the plugin printed its own incompatibility warning and emitted nothing.
`public/sw.js` did not exist after a successful build; `grep -rl "serviceWorker"
.next/static` returned 0.

**The fix, in this phase.** `package.json:7` now reads:

```
"build": "next build --webpack",
```

**The evidence it works, run on 2026-08-06 in this worktree:**

```
$ npm run build
  ✓ Compiled successfully
$ ls -la public/sw.js
  -rw-r--r--  53166  public/sw.js
$ grep -c "api/tickets/attendance" public/sw.js   → 1
$ grep -c "api/tickets/checkin"    public/sw.js   → 1
$ grep -c "api/membership/list"    public/sw.js   → 1
$ grep -c "api/membership/verify"  public/sw.js   → 1
```

`public/sw.js` is gitignored (`.gitignore:40`), which is why the file is a build
artefact and not a commit.

**The consequence for what shipped before, stated plainly.** v1.4 shipped
"offline support via IndexedDB + service worker". The IndexedDB half worked. **The
service-worker half never existed in production.** Every offline claim made about
releases before this phase rested on a worker that was not there.

---

## Per-requirement evidence

### FIX-01 — an inbound `x-user-*` header never reaches server code

**Evidence kind:** `file:line` (present) · observable (**not executed**)
**Applied 2026-08-05 in commit `a36b7d9`, re-asserted here against current code.**

`src/lib/supabase/middleware.ts` — the three deletes:

```
131:  requestHeaders.delete("x-user-role");
132:  requestHeaders.delete("x-user-status");
133:  requestHeaders.delete("x-user-id");
```

and the three sets, on the authenticated branch:

```
136:    requestHeaders.set("x-user-role", role ?? "member");
137:    requestHeaders.set("x-user-status", status ?? "pending");
138:    requestHeaders.set("x-user-id", user.id);
```

**131, 132, 133 are each strictly lower than 136, 137, 138.** The deletes are
unconditional; the sets are inside the authenticated branch. An anonymous request
carrying a forged `x-user-role` therefore reaches server code with the header
gone, not with it forwarded. The reason is written in the file at `:124-130`.

**Not executed:** the observable half — `curl -H "x-user-role: master"` against a
deployment returning the anonymous page. No deployment was exercised.

---

### FIX-02 — a second "serve" on a drink token fails distinctly

**Evidence kind:** `file:line` (present) · manual (**not executed**)
**Applied 2026-08-05 in commit `a36b7d9`, re-asserted here against current code.**

Both callers of the `redeem_drink_token` RPC throw on `false`.

`src/app/(organizer)/organizer/events/actions.ts:1192`:

```ts
  if (applied === false) {
    throw new Error(
      action === "serve"
        ? "This token has already been served"
```

`src/app/(public)/events/[slug]/menu/actions.ts:311`:

```ts
  if (applied === false) {
    throw new Error(
      action === "serve"
        ? "This token has already been served"
```

Both sit after the RPC call (`:1180` and `:299` respectively) and after the
`rpcError` throw (`:1184` and `:303`). The RPC returns `false` when it changed
nothing; discarding that boolean is what poured the second drink.

**Not executed:** the manual half — pressing Serve twice on one token as an
organizer and observing that the count does not move.

---

### FIX-03 — a genuine duplicate survives synchronisation

**Evidence kind:** manual (**not executed**) · supported by `file:line`

The ordering FIX-03 depends on is structural, in one place. `respond()` in
`src/app/api/tickets/checkin/route.ts:282` is the only exit once the night is
known:

```
308:      const { error: insertError } = await serviceClient
309:        .from("door_scan_events")
310:        .insert(insert);
```

and the two returns that follow it:

```
326:        return NextResponse.json(
327:          { valid: false, status: "record_failed", error: "Scan could not be recorded" },
328:          { status: 503 }
329:        );
...
333:      return NextResponse.json(
334:        { ...outcome, ...legacyStatus, ...legacy },
335:        { status: DOOR_HTTP[outcome.outcome] }
336:      );
```

**308 < 326 and 308 < 333.** The `already_recorded` branch reaches its answer only
through `respond()` — `src/app/api/tickets/checkin/route.ts:550`:

```ts
      return respond(
        {
          outcome: "already_recorded",
```

There is no other path in the file to a 409. A failed insert answers **503 with no
`outcome` field**, so `isDoorOutcome` is false and the drain retries rather than
draining a conflict that was never written (the reason is written at `:322-325`).

**NOT EXECUTED — and this is the requirement that most needs it.** The two-device
pass has not been run: no two installs, no two `device_id` values, no reconnection
observed. The static ordering is proved; the behaviour is not.

---

### FIX-04 — three outcomes, identical with the network on and off

**Evidence kind:** manual (**not executed**) · supported by `file:line`

**The route** — every outcome literal in `src/app/api/tickets/checkin/route.ts`,
and there are only three distinct ones:

| Line | Literal |
|---|---|
| `:201`, `:232` | `outcome: "not_valid", reason: "no_party_selected"` |
| `:342`, `:351` | `outcome: "not_valid", reason: "invalid_signature"` |
| `:464` | `outcome: "recorded"` (refunded holder, admitted) |
| `:483` | `outcome: "not_valid", reason: "unknown_code"` |
| `:511` | `outcome: "not_valid", reason: "wrong_night"` |
| `:552` | `outcome: "already_recorded"` |
| `:614` | `outcome: "recorded"` |

**The scanner** — `src/app/(admin)/admin/scanner/ScannerClient.tsx`, the same
three names on both paths:

```
1037:    switch (parsed.outcome) {
1038:      case "recorded": {
1079:      case "already_recorded": {
1099:      case "not_valid": {
```

and for the membership half:

```
1274:    switch (parsed.outcome) {
1275:      case "recorded": {
1289:      case "already_recorded": {
1304:      case "not_valid": {
```

The union is closed at three by `src/lib/door/outcome.ts`, and
`src/components/scanner/ScanFlash.tsx:22` mirrors it:

```ts
export type ScanFlashType = "success" | "already_recorded" | "error";
```

**NOT EXECUTED:** the six scans — valid, repeat, unknown — once online and once
with the radio physically off. No pass of any kind has been run on a phone.

---

### FIX-04a — the third outcome states a fact, not a verdict

**Evidence kind:** observable (**not executed**) · `file:line` (present)

**The row carries no cause.** `src/app/api/tickets/checkin/route.ts:563`, inside
the `already_recorded` branch:

```ts
          cause: null,
```

The same holds on every `not_valid` branch — `:343`, `:352`, `:484`, `:515` — and
on the recorded path at `:621`. `cause` is written by the classifier afterwards,
never by the scanner.

**The rendered sentence carries no cause word.**
`src/app/(admin)/admin/scanner/ScannerClient.tsx:111-119`:

```ts
function recordedFact(
  at: string | null | undefined,
  operatorLabel: string | null | undefined
): string {
  const clock = at && at.trim() !== "" ? formatClock(at) : null;
  const when = clock ? `Recorded at ${clock}` : "Recorded earlier (time not on record)";
  const label = operatorLabel && operatorLabel.trim() !== "" ? operatorLabel.trim() : null;
  return label ? `${when} by ${label}` : `${when} (operator not on record)`;
}
```

There is no cause word in it, and an absent value is **stated** rather than
blanked. The third flash state is amber, not the pill's yellow —
`src/components/scanner/ScanFlash.tsx:91`:

```ts
    bg: "bg-amber-500/90",
```

**NOT EXECUTED:** reading the amber flash on a device, and reading back the row it
produced to confirm `cause` is NULL in the database. The second half cannot be
done at all until the migration is applied to a real database.

---

### FIX-05 — an unsynced check-in survives a refresh

**Evidence kind:** manual (**not executed**) · `file:line` (present)

Two negative greps, reproduced with their output:

```
$ grep -c "\.clear()"       src/lib/offline/checkin-store.ts   → 0
$ grep -c "cursor.delete()" src/lib/offline/checkin-store.ts   → 0
```

The store has no path that empties itself. The monotone rule is one line —
`src/lib/offline/checkin-store.ts:510-511`:

```ts
    const localWins =
      local && local.checkedIn === true && hasUnreportedEntry ? local : null;
```

and it decides all three fields at `:524`, `:525-527` and `:528-529`. A refresh
may add knowledge; it may never subtract an admission that has not yet been
reported.

**NOT EXECUTED:** an offline check-in followed by a forced refresh with the queue
non-empty, on a device.

---

### FIX-06 — the attendee cache is never momentarily empty

**Evidence kind:** manual (**not executed**) · observable (**not executed**) · `file:line` (present)

The plausibility guard returns a refusal **as a value**, not as an exception —
`src/lib/offline/checkin-store.ts:481-491`:

```ts
  if (rows.length === 0 && cached > 0) {
    return { applied: false, reason: "empty_payload", cached, received: 0 };
  }
  if (unreported > 0 && rows.length < cached) {
    return {
      applied: false,
      reason: "payload_smaller_than_cache",
      cached,
      received: rows.length,
    };
  }
```

The reason it is a value rather than a throw is at `:477-480`: with no error
tracking anywhere, the screen is the only observer a refused refresh has. The
refusal is rendered as a persistent banner by `ScannerClient.tsx`, and
`grep -c "cacheAttendees"` over that file returns **0** — the replacing call is
gone.

**NOT EXECUTED:** the Slow 3G pass, watching the IndexedDB row count in DevTools
never reach 0.

---

### FIX-07 — the same person, two parties, one device

**Evidence kind:** manual (**not executed**) · `file:line` (present)

The composite key exists in exactly one place —
`src/lib/offline/checkin-store.ts:205-211`:

```ts
export function attendeeKey(
  partyId: string,
  subjectType: DoorSubjectType,
  subjectId: string
): string {
  return `${partyId}:${subjectType}:${subjectId}`;
}
```

The party is the **first** segment, so one subject at two parties produces two
distinct keys and neither overwrites the other.

Server side, both halves carry the party predicate —
`src/app/api/membership/verify/route.ts:341` on the `attendances` insert:

```ts
        party_id: party.id,
```

and `:368` on the `23505` re-fetch:

```ts
          .eq("party_id", party.id)
```

They must agree with the migration's partial unique index
(`supabase/migrations/20260805120000_door_scan_events.sql`, `attendances_party_user_unique`
`ON (party_id, user_id) WHERE party_id IS NOT NULL`), and the reason two partial
indexes were used instead of one three-column key — Postgres treats NULLs as
distinct — is written at `:352-356`.

**NOT EXECUTED:** the two-party offline pass, and the two pending keys read out of
DevTools and recorded verbatim.

---

### FIX-08 — a permanent failure is recorded as failed

**Evidence kind:** manual (**not executed**) · observable (**not executed**) · `file:line` (present)

The four buckets, declared once — `src/lib/offline/sync-manager.ts:55-59`:

```ts
type Classification =
  | { bucket: "done"; via: "recorded" | "already_recorded" | "legacy_success" }
  | { bucket: "retry"; cause: RetryCause }
  | { bucket: "dead"; reason: FailureReason }
  | { bucket: "blocked" };
```

Each bucket has exactly one call site: `store.markSynced` (`:280`, the **only**
path that removes an entry), `store.markBlocked` (`:290`), `store.markFailed`
(`:300`), `store.bumpAttempts` (`:319`).

The three chips render **outside** the connectivity ternary. The ternary occupies
`src/app/(admin)/admin/scanner/ScannerClient.tsx:1722-1732`; the chips are at
`:1789` (`Pending ({queue.pending})`), `:1795-1801`
(`Could not be recorded ({queue.failed})`) and `:1804-1811`
(`Sign in again to record {queue.blocked}`). **1722–1732 and 1789–1815 are
disjoint** — the count is no longer only visible while offline, which was the
standing defect.

**NOT EXECUTED:** queueing a scan for a deleted member and observing it leave
`pending` exactly once; and expiring a session and observing `blocked` with the
queue intact.

---

### FIX-09 — a refunded ticket is admitted and flagged

**Evidence kind:** manual ×3 (**not executed**) · observable (**not executed**) · `file:line` (present)

Five call sites. In each, the evidence write precedes the delete:

| Writer | Evidence write | `delete()` | Order |
|---|---|---|---|
| `src/app/(public)/tickets/refund-actions.ts` free/guest-list branch | `:149` `refunded_ticket_id: ticket.id,` | `:180` `.delete()` | 149 < 180 |
| `src/app/(public)/tickets/refund-actions.ts` paid branch | `:238` | `:268` | 238 < 268 |
| `src/app/(public)/tickets/refund-actions.ts` `adminRefund` | `:494` | `:521` | 494 < 521 |
| `src/app/(admin)/admin/finance/actions.ts` | `:118` | `:151` | 118 < 151 |
| `src/app/api/cron/reconcile-refunds/route.ts` | `:173` | `:202` | 173 < 202 |

The cron's idempotency guard is at `reconcile-refunds/route.ts:137`
(`.eq("refunded_ticket_id", ticket.id)`) — it skips the insert when a refund row
already names this ticket, so a ticket whose delete keeps failing does not collect
a new approved refund row every night.

The refunded holder is admitted, not refused: `checkin/route.ts:464` answers
`outcome: "recorded"` on the refund branch, with the flag rather than a refusal.

**NOT EXECUTED:** all three manual passes — refund before the night online, the
same with the radio off, and a refund after the night's start producing **no**
review entry. None can run until the migration is applied to a real database.

---

### FIX-10 — the queued scan carries the signed token

**Evidence kind:** `file:line` (present, by negative grep) · manual (**not executed**)

Three greps, reproduced with command and output:

```
$ grep -c "offlineSync"     src/app/api/tickets/checkin/route.ts   → 0
$ grep -c "directTicketId"  src/app/api/tickets/checkin/route.ts   → 0
$ grep -c "res.ok"          src/lib/offline/sync-manager.ts        → 0
```

The first two prove the bare-identifier shortcut is gone from the route — the
branch that accepted an id from the request body as proof a code had been read and
handed it to an RLS-bypassing service client. The file's header comment says the
two identifiers must not be named even to explain the history, precisely because a
grep returning nothing is this requirement's standing assertion.

The third proves the drain no longer classifies on the transport flag. It
classifies on the body — `sync-manager.ts:143` (`isDoorOutcome`) and the switch
that follows.

The scanner keeps the full scanned string: `ScannerClient.tsx:131-134`
(`ticketIdFromToken`) derives the lookup id by cutting at the **last** dot, for the
cache key only; the whole token travels as `token`. `grep -c "code.split"` over
that file returns **0**.

**NOT EXECUTED:** reading `pendingCheckins` in DevTools to see a `uuid.64-hex`
token rather than a bare id; and the negative probe
`POST /api/tickets/checkin {"ticketId":"…","offlineSync":true}` returning
`not_valid`.

---

### FIX-11 (a) — the review list, classified by cause

**Evidence kind:** manual, four seeded causes (**not executed**) · observable (**not executed**) · `file:line` (present)

`double_read` is **counted and not listed**. Counted first —
`src/lib/door/classify.ts:312-313`:

```ts
    if (cause) {
      counters[cause] += 1;
```

excluded afterwards — `src/lib/door/classify.ts:341-346`:

```ts
  const listed = entries.filter(
    (entry) =>
      entry.cause !== null &&
      entry.cause !== "double_read" &&
      entry.cause !== "refunded_after_night"
  );
```

`refunded_after_night` is excluded on the same filter (`:345`): a refund issued
after the night began is accounting, and finance queries the complement.

The four causes take four separate branches: `:205`
(`return row.ticket_id ? "wrong_night" : "invalid_signature";`), `:213`
(`second_ticket_same_holder`), `:218` (`two_devices`), `:235` (`double_read`),
with the double-read window a named constant at `:64`
(`export const DOUBLE_READ_WINDOW_SECONDS = 20;`). A device id of `"unknown"`
never reaches `double_read` — `:225` sends it to `second_ticket_same_holder`
instead — because `double_read` is the one classification that **hides** a row,
and hiding requires certainty.

**NOT EXECUTED:** seeding all four causes on one night and reading the list.

### FIX-11 (b) — empty on a normal night

**Evidence kind:** observable (**not executed**) · `file:line` (present)

The empty state is the designed default, in neutral card vocabulary —
`src/app/(organizer)/organizer/events/[id]/review/ReviewListClient.tsx:321`:

```
            Nothing needed attention on this night.
```

The alarm styling exists **only** in the read-failure block, so a quiet night and
a failed read cannot look alike. There is no badge and no notification path
anywhere in this plan's files.

**NOT EXECUTED:** opening the list for a real night with no conflicts.

---

### FIX-12 — prose for the supervisor, identifiers for a master

**Evidence kind:** observable (**not executed**) · `file:line` (present)

**The table has no column to leak.** `supabase/migrations/20260805120000_door_scan_events.sql:60-120`
is the whole `CREATE TABLE` block. Its sixteen columns are: `id`, `party_id`,
`event_id`, `subject_type`, `ticket_id`, `guest_entry_id`, `subject_user_id`,
`outcome`, `cause`, `scanned_at`, `recorded_at`, `operator_id`, `device_id`,
`source`, `token_fingerprint`, `is_undo`. **There is no `name` column, no
`full_name` column and no column for a contact address.** Every subject link is an
identifier:

```sql
  ticket_id uuid REFERENCES public.tickets ON DELETE SET NULL,
  guest_entry_id uuid REFERENCES public.guest_list_entries ON DELETE SET NULL,
  subject_user_id uuid REFERENCES auth.users ON DELETE SET NULL,
```

RLS and the single policy are in the same file: `:147`
(`ALTER TABLE public.door_scan_events ENABLE ROW LEVEL SECURITY;`), `:149`
(`DROP POLICY IF EXISTS door_scan_events_select_admin …`), `:155`
(`CREATE POLICY door_scan_events_select_admin …`). There is no
`door_scan_events_select_master`.

**The technical view cannot receive a label map — by signature.**
`ReviewListClient.tsx:136`:

```ts
function TechnicalView({ entries }: { entries: ClassifiedEntry[] }) {
```

It takes `entries` and **nothing else**. There is no parameter through which the
operator-label map could arrive. Its nine exported columns are at `:139-149`:

```ts
  const COLUMNS = [
    "id",
    "subject_type",
    "subject_id",
    "cause",
    "scanned_at",
    "recorded_at",
    "operator_id",
    "device_id",
    "source",
  ];
```

Every one is an identifier or a timestamp. The guarantee is a function signature,
not a rule somebody has to remember.

**NOT EXECUTED:** copying the technical view as a master and pasting it into a
plain editor. No pasted text exists, and none can until the table holds rows.

---

### FIX-13 — no automatic label is attached to a member

**Evidence kind:** `file:line` (negative) — **executed, with full output**

This one is proved by a negative, so the grep and its complete output are recorded
here rather than summarised.

```
$ grep -rn 'from("profiles")' src/lib/door/ src/app/api/tickets/checkin/ \
    src/app/api/membership/ src/lib/offline/ \
    "src/app/(organizer)/organizer/events/[id]/review/"

src/app/api/tickets/checkin/route.ts:143:    .from("profiles")
src/app/api/tickets/checkin/route.ts:536:          .from("profiles")
src/app/api/tickets/checkin/undo/route.ts:44:    .from("profiles")
src/app/api/membership/list/route.ts:19:    .from("profiles")
src/app/api/membership/list/route.ts:30:    .from("profiles")
src/app/api/membership/verify/route.ts:63:    .from("profiles")
src/app/api/membership/verify/route.ts:97:      .from("profiles")
src/app/api/membership/verify/route.ts:260:        .from("profiles")
src/app/api/membership/verify/route.ts:388:            .from("profiles")
src/app/(organizer)/organizer/events/[id]/review/page.tsx:201:      .from("profiles")
```

Ten hits. **Every one is followed immediately by `.select(`** — checked by opening
each:

| Hit | Next line |
|---|---|
| `checkin/route.ts:143` | `:144` `.select("role, status")` |
| `checkin/route.ts:536` | `:537` `.select("id, full_name")` |
| `checkin/undo/route.ts:44` | `:45` `.select("role, status")` |
| `membership/list/route.ts:19` | `:20` `.select("role")` |
| `membership/list/route.ts:30` | `:31` `.select("id, full_name, membership_code")` |
| `membership/verify/route.ts:63` | `:64` `.select("id, full_name, membership_code")` |
| `membership/verify/route.ts:97` | `:98` `.select("role")` |
| `membership/verify/route.ts:260` | `:261` `.select("id, full_name, membership_code")` |
| `membership/verify/route.ts:388` | `:389` `.select("id, full_name")` |
| `review/page.tsx:201` | `:202` `.select("id, full_name")` |

**Zero writes to `public.profiles`.** The full set of writes in these directories,
by the complementary grep, is:

```
$ grep -rn '\.update(\|\.insert(\|\.upsert(\|\.delete(' src/lib/door/ \
    src/app/api/tickets/checkin/ src/app/api/membership/ \
    "src/app/(organizer)/organizer/events/[id]/review/"

src/app/api/tickets/checkin/undo/route.ts:215:        .insert(undoEvent);
src/app/api/tickets/checkin/undo/route.ts:245:        .update({
src/app/api/tickets/checkin/undo/route.ts:300:        .update({
src/app/api/tickets/checkin/undo/route.ts:333:        .delete()
src/app/api/tickets/checkin/route.ts:269:      ? crypto.createHash("sha256").update(rawToken).digest("hex")
src/app/api/tickets/checkin/route.ts:310:        .insert(insert);
src/app/api/tickets/checkin/route.ts:587:      .update({
src/app/api/membership/verify/route.ts:169:      const { error } = await serviceClient.from("door_scan_events").insert({
src/app/api/membership/verify/route.ts:339:      .insert({
```

Their targets, read at each site: `door_scan_events` (`undo:215`, `route:310`,
`verify:169`), `tickets` (`undo:245`, `route:587`), `guest_list_entries`
(`undo:300`), `attendances` (`undo:333` delete, `verify:339` insert). The one
`.update(` at `checkin/route.ts:269` is `crypto.createHash(…).update(…)` — a hash,
not a database write. **`src/lib/door/` and the review route write nothing at
all.**

**No per-member aggregate.** `counters` in `classify.ts:129-140` is keyed by
`DoorScanCause`, never by a user id; the list is sorted by time (`classify.ts:350`),
never grouped by person; there is no `groupBy` and no per-subject tally anywhere.
The subject of a row is rendered as a truncated identifier, never a name.

---

## The schema, as applied

**Applied — to a throwaway container, and nowhere else.**

| | |
|---|---|
| Target | A throwaway **PostgreSQL 16.14** container, destroyed after the run |
| Production or any Supabase project | **No.** Neither was contacted |
| Date | 2026-08-05 / 2026-08-06 |
| Supabase CLI on this machine | **absent** (`which supabase` → not found) |

**The seven observations, from the migrated schema:**

1. The migration **applies cleanly** in one transaction.
2. **Exactly one policy** exists on `door_scan_events` —
   `door_scan_events_select_admin`, a `SELECT` policy. There is **no**
   `door_scan_events_select_master`.
3. **RLS is enabled** on the table.
4. The table carries **no name column and no contact-address column** (the
   sixteen columns are listed under FIX-12).
5. **All three foreign keys to `tickets` and its neighbours are `SET NULL`** —
   `ticket_id`, `guest_entry_id`, `subject_user_id`.
6. **`ticket_refunds.ticket_id` is nullable**, and its foreign key is
   `ON DELETE SET NULL` — the ordering matters and the migration does the
   `DROP NOT NULL` before re-creating the constraint.
7. **`attendances` gained `party_id`** plus the **two partial unique indexes**;
   the old `unique(event_id, user_id)` is dropped.

**Both refund probes were re-run on the migrated schema**, and the fix behaves:
the refund row now **survives** the ticket delete with `ticket_id` NULL, and the
guest-list delete is **no longer blocked**.

**A member-session RLS check returning zero rows was not part of this run.** The
container carries no Supabase auth layer, so a member session does not exist there
to test with. That observation remains owed, and it is the one that matters most:
the policy is the boundary, and the redirect is not.

**The migration WAS applied to the production database on 2026-08-06.** *(This
paragraph previously read "NOT applied to any real database" — superseded, and the
history is left visible rather than rewritten.)*

Applied through the Supabase Management API's migrations endpoint
(`POST /v1/projects/{ref}/database/migrations`) rather than `/database/query`,
**so the migration is recorded in the project's migration history** — registered
as version `20260806111113`, name `door_scan_events`, bringing the total to 32.
The endpoint choice matters: `/database/query` would have executed the SQL while
leaving the history unaware, and a later `supabase db push` would have tried to
apply it again.

Eight structural observations were made against production immediately after,
each one recorded here because it is the evidence, not the summary of it:

| # | Observation | Result |
|---|---|---|
| 1 | `door_scan_events` exists, `relrowsecurity` | `true` |
| 2 | Policies on the table | exactly one — `door_scan_events_select_admin`, `SELECT`. **No `_select_master`**, as FIX-12 requires |
| 3 | Columns matching `%name%` or `%email%` | none |
| 4 | `pg_constraint` foreign keys to `public.tickets` | **all four** `SET NULL` — `door_scan_events`, `guest_list_entries`, `pending_purchases`, `ticket_refunds` |
| 5 | `ticket_refunds.ticket_id` nullable | `YES` — the `NOT NULL` drop preceded the FK change, as the statement order required |
| 6 | `attendances` | gained `party_id`, plus `attendances_event_user_unique`, `attendances_party_user_unique`, `idx_attendances_party` |
| 7 | The four `CHECK` constraints | match `src/lib/door/outcome.ts` literally — 3 outcomes, 8 causes, 3 subject types, 2 sources |
| 8 | Migration history | `20260806111113 door_scan_events` present |

**A third foreign key was found by doing this, and it was not in any plan.**
`pg_constraint` on the live database reported **three** foreign keys to
`public.tickets`, not two. The refund probe had run against a throwaway database
built from the repository's own DDL, where `pending_purchases` does not appear —
so no amount of care on that container could have surfaced it. `pending_purchases`
is the **SumUp payment record**, and `webhooks/sumup/route.ts:81` writes
`ticket_id` onto the row when it marks a purchase completed; the live table
already held a populated row. Left as `NO ACTION` it reproduced Probe B exactly,
on a different table: the refund's delete raises `23503`, the ticket survives, the
refund cannot complete. The migration was corrected **before** being applied — it
was not yet applied, so correcting it was legitimate; correcting an applied
migration would not have been. Verified on a throwaway container first, then in
production.

**The version recorded (`20260806111113`) does not match the file name
(`20260805120000`).** This is harmless and was checked rather than assumed: every
`ADD COLUMN` in the file carries `IF NOT EXISTS`, every `CREATE POLICY` is
preceded by `DROP POLICY IF EXISTS`, and no `CREATE` is unguarded — the migration
is **idempotent**, so a future `supabase db push` re-applying it changes nothing.

**A pre-existing history drift was found and is NOT repaired.** The repository
holds 33 migration files; 31 were registered before this one. The unregistered one
is `20260508000000_drink_token_active_state.sql` — and its **content is present in
production** (verified: `activate_drink_token`, `deactivate_drink_token` and
`redeem_drink_token` all exist and return `boolean`, and `drink_tokens_status_check`
admits `'active'`). So it was applied by hand without being recorded. This is a
history gap, not a schema gap, and repairing it is a decision for the project
owner — the Management API's `PUT .../database/migrations` upserts an entry
without applying, which is the tool for it.

**What the application does NOT prove.** Every code path that writes to
`door_scan_events` — `checkin/route.ts:310`, `undo/route.ts:215`,
`membership/verify/route.ts:169` — now has a table to write into, but **still has
never run**. The schema exists; the behaviour is unobserved. And the RLS
observation that matters most remains owed: the Management API connects with
privileges that **bypass RLS**, so a query of mine returning rows would prove
nothing about the boundary. Only a logged-in member session can establish that
`door_scan_events` returns zero rows to someone who is not staff.

---

## The refund probe

**CLOSED. Both DDL claims executed 2026-08-05 and CONFIRMED.** Target: a throwaway
PostgreSQL 16.14 container carrying the two constraint definitions copied verbatim
from the repository, destroyed afterwards. **No production database and no
Supabase project of any kind was contacted.**

- **A1 — CONFIRMED.** `refunds_before = 1`, `DELETE 1`, then `refunds_after = 0`.
  The cascade destroys the audit row written one statement earlier.
- **A2 — CONFIRMED.** `SQLSTATE=23503`, and the ticket **survived**
  (`ticket_survived = 1`, `entry_survived = 1`). The delete was blocked, so a
  refund could be marked approved while the ticket still admitted its holder.
- Independent confirmation from `pg_constraint`: `confdeltype = 'c'` (CASCADE) and
  `'a'` (NO ACTION).

Full protocol and literal output: `31-REFUND-PROBE.md`, which is closed.

---

## The blocking checkpoints — one closed, three open

None of the open ones has been run, and none of their outcomes has been assumed.

| Plan | Task | What it needs | Status |
|---|---|---|---|
| **31-04** | Task 3 | Applying the migration to the real database | ✅ **CLOSED 2026-08-06.** Applied via the Management API migrations endpoint, recorded as `20260806111113`, eight structural observations verified above. **The RLS half is still owed** — see below |
| **31-01** | Task 3 | A production build on a phone: confirm the `"apis"` Cache Storage bucket no longer holds the door's routes | ⬜ open. An empty bucket was previously indistinguishable from *no service worker at all*. The worker now builds, so this check finally means something — and it still has not been done |
| **31-11** | Task 4 | A dark room, amber against the Offline yellow, the three states told apart by icon and vibration | ⬜ open. Colour is not the only channel by design; whether that holds has never been observed |
| **31-13** | Task 2 | The whole door pass — production build, phone, radio physically off, two devices | ⬜ open. Everything under **manual** and **observable** in this document depends on it |
| **31-04** | RLS half | A logged-in member session reading `door_scan_events` and getting zero rows | ⬜ open, and it cannot be closed from here: the Management API bypasses RLS, so a query returning rows would prove nothing. Only a real member session establishes that the policy — not a redirect — is the boundary |

---

## What was lost

The `ticket_refunds` rows destroyed in production **before** this phase, along
with the tickets they referenced, are **unrecoverable**. `ticket_refunds` was the
only record, and the cascade removed it one statement after it was written.
`STATE.md` reports one ticket in production, so the loss is **negligible in size
and total in kind**.

**`refunded_ticket_id IS NULL` on a pre-existing row means *unknown*, never
*none*.** No backfill is possible and none was attempted. A future reader must not
infer from a quiet table that the history is intact.

A second consequence, larger and still open:
**`fetchEventRevenue` has been reporting ticket refunds as structurally zero since
2026-02-27, silently.** `src/lib/analytics/event-queries.ts:88-93`:

```ts
    const { data: refunds } = await supabase
      .from("ticket_refunds")
      .select("amount")
      .in("ticket_id", ticketIds)
      .eq("status", "approved");
    ticketRefundsTotal = (refunds ?? []).reduce((s, r) => s + r.amount, 0);
```

Both sides of that join were destroyed by the cascade, so `ticketRefundsTotal` was
always 0 and `netTickets` at `:96` was always the gross figure. Nothing failed, so
nothing was raised — the exact shape of a silent failure, in a repository with no
error tracking. **Whether this earns its own milestone note is the project owner's
decision, not this phase's.**

---

## What stays open, by name

| Item | Where | Why it is not in this phase |
|---|---|---|
| **QR-01** | `src/utils/qr.ts:49` — `code += chars.charAt(Math.floor(Math.random() * chars.length));` | Still true, still open. It does **not** affect FIX-10: ticket tokens are HMAC-signed and independent of it. It **does** interact with the offline membership path — the whole roster is cached on the device, so a guessed code resolves locally with no server in the way. Plan 31-11 made a door decision *because* of it: an unknown membership code stays **refused** offline, while a signed ticket in the same position is **admitted**, since a membership QR carries no signature and its code space is not sound. Deferred, not fixed, and not pretended fixed |
| **RATE-01** | Nowhere — `grep -rniE "ratelimit\|rate-limit\|rate_limit" src/ package.json` returns **no match** | No rate limiting exists anywhere in the repository, and `GET /api/membership/verify` is unauthenticated. Deferred |
| **OBS-01** | Nowhere — `grep -rniE "sentry\|bugsnag\|rollbar\|datadog\|newrelic\|logtail\|opentelemetry" package.json` returns **no match** | No error tracking. This is why every failure path this phase added was required to have an **on-screen effect**: the person holding the phone is the only observer that exists. Deferred as a capability |
| **Option A for the ticket lifecycle** | 63 `from("tickets")` call sites across 22 files | Soft-invalidating `tickets` rather than deleting them. The owner chose Option B. Recorded as deferred and **deliberately not partially built** |
| **`door_scan_events_select_admin` is deliberately coarse** | `20260805120000_door_scan_events.sql:155` | The policy is `is_admin_or_organizer()` and is **not** per-night. Per-night scoping of an organizer does not exist yet; it arrives with **Phase 35**, and the migration says so at `:151-154`. Anyone reading the wide policy should find this note rather than assume it was the final shape |

---

## An owner decision taken during execution — 2026-08-06

**Staff always get in.** The door decides on **role alone**, and all four door
routes now agree. Before, they did not: the ticket scanner and the undo refused a
`pending` organizer while membership verify and attendance admitted them — the
same person refused by one scanner and admitted by another, on the same night,
undiagnosable with no error tracking.

The four guards, as they stand:

- `src/app/api/tickets/checkin/route.ts:148` — `if (!profile || (profile.role !== "master" && profile.role !== "organizer"))`
- `src/app/api/tickets/checkin/undo/route.ts:49` — identical
- `src/app/api/tickets/attendance/route.ts:28` — identical
- `src/app/api/membership/verify/route.ts:104` — identical

The hole is closed **at its source** instead —
`src/app/(admin)/admin/members/actions.ts:127-134`:

```ts
  const { error } = await serviceClient
    .from("profiles")
    .update(
      newRole === "organizer"
        ? { role: newRole, status: "approved" }
        : { role: newRole }
    )
    .eq("id", memberId);
```

Granting the organizer role approves the account in the same write. **Demotion does
not revoke approval** — `member` and `approved` are different axes, and someone who
was approved stays approved when they stop being staff. The reasoning is written in
the file at `:113-125`.

---

## Deferred items, collected, with the phase that owns each

| Item | Owner |
|---|---|
| The review list has no navigation link. `EventList.tsx` is shared by the organizer and admin trees via `basePath`; an unconditional link would produce `/admin/events/{id}/review`, which does not exist, and a master would land on a 404 | **Phase 34** — it collapses the two trees. The route works by address meanwhile |
| The membership route admits on `membership_code` alone and **never reads `status`**. Left untouched deliberately: adding a status check would create a **new** way to refuse someone at the door, which is the error this phase exists to remove | **Phase 35** — a product decision, not a fix |
| Narrowing `door_scan_events_select_admin` to a per-night scope | **Phase 35** |
| A manual refresh control (LIVE-05) and a live channel (LIVE-01) | **Phase 38** |
| The guest sync path carries no device clock, no `deviceId` and no `source` — `/api/tickets/attendance` accepts `guestListEntryId` and nothing else — so a guest row can never be classified `two_devices` | unassigned; a change to that route's contract |
| Guest-list and membership undos still write no `door_scan_events` row; the scanner now sends `partyId` and `deviceId`, the route has yet to use them on those two branches | follow-up on `undo/route.ts` |
| A membership admission queued offline cannot be undone once back online. It now fails **loudly**; before this phase it failed silently | follow-up on `undo/route.ts` |
| `pruneParty` (`src/lib/offline/checkin-store.ts:548`) is **called by nothing** — `grep -rn "pruneParty" src/` returns only its declaration and two doc references. Cached rows for old parties accumulate on the device | unassigned — a bounded leak on a staff phone, deliberate |
| A refunded holder is admitted amber **without a name**, and the row cannot name its ticket: the ticket is gone and `door_scan_events.ticket_id` is a foreign key, so a value would raise `23503`. The scan survives as `token_fingerprint` only | the real edge of Option B; unassigned |
| `not_in_cache` is a `DoorFlag` with **no writer** as a stored cause, so its counter reads zero. The sentence for it is already written | recorded, not a gap in the classifier |
| `invalid_signature` and `unknown_code` cannot be told apart from a stored row; both are bucketed as `invalid_signature` and the sentence declines the certainty | recovering it needs a column, hence a second migration |
| `finance/actions.ts` deletes the ticket on a **partial** refund too, and writes the refund row with the full price | pre-existing; a change to the refund flow |
| The drink loop in `reconcile-refunds` still does not destructure its write errors | same defect class, left outside this phase's scope |
| `adminRefund` and `refundTransactionAction` have no idempotency guard; mitigated only by wording | a change to the refund flow |
| `partyEndInstant` (`src/utils/datetime.ts:104`) has **never been exercised against a `06:00` end time across the March or October changeover** — and the night's calendar always spans one | unassigned, and it is a data-correctness risk, not a cosmetic one |
| `fetchEventRevenue`'s silent under-reporting (above) | **project owner** |

---

## What a future reader should not conclude

`npm run build` passing means **the types agree**. It does not mean the door works,
and on this repository it does not even mean the column names are right: none of
the four Supabase clients is parameterised with `Database`, so no `.select()`
string and no `.insert()` object in this project is checked by the compiler.

**No step in this document was proved by a test, because there is no test runner
for the product.** The one automatic command that does verify something —
`npm run verify:persona` — covers the persona's coherence, never the product's
correctness, and does not apply to this phase.

Every **offline** claim, every **observable** claim and every **manual** claim in
this document rests on the door pass in `31-13` Task 2, and **that pass has not
been run.** Nothing here was executed on a phone, in a dark room, or with a radio
switched off. When it is run, it will have been run on a specific day, on specific
devices, against a specific build — and those three facts belong in this document
beside its results, because a pass is evidence about the thing that was passed,
not about the thing in general.

Until the 31-04 migration is applied to a real database, **the parts of this phase
that write to `door_scan_events` have never executed at all.** That is not a
caveat on the verification. It is the verification.
