# Phase 31: Live Defects at the Door and the Bar — Research

**Researched:** 2026-08-05
**Domain:** Offline-first door check-in (IndexedDB + service worker), HTTP conflict contracts, refund/ticket lifecycle, per-night review surface
**Confidence:** HIGH for repo facts (every claim carries a `file:line`), HIGH for the two external claims (W3C IndexedDB spec, `idb` official README, `@serwist/next` source read from `node_modules`), MEDIUM for two behaviours that can only be confirmed by running SQL against a real database (marked inline)

> **No `CONTEXT.md` exists for this phase.** `/gsd:discuss-phase` has not run. The
> constraints below are copied from `.planning/STATE.md`, `.planning/REQUIREMENTS.md`
> and `CLAUDE.md`, which are the binding upstream documents. Every item marked
> **[NEEDS CONFIRMATION]** in the Assumptions Log should be settled before planning.

> **This repository is public.** This document names roles — *a staff member
> assigned to the door*, *a person supervising the night*, *a master* — and never
> people. It contains no unannounced date, no venue under negotiation, no line-up.

---

## User Constraints

### Locked decisions (from `.planning/STATE.md` — not re-opened at plan time)

- Live freshness uses a **push channel**, not polling (Phase 38 — *not this phase*).
- Undoing a check-in requires a **supervising capability** (Phase 35 — *not this phase*).
- Venue reveal stays scheduled **plus** a manual path (Phase 37 — *not this phase*).
- The interface stays **English only** — no translation work this milestone.

### Milestone guiding constraints (from `.planning/REQUIREMENTS.md`, override any requirement that appears to contradict them)

1. **The door decides locally.** No scan outcome ever waits on the network, a socket, or a poll. The verdict comes from the on-device cache, always.
2. **The door admits and flags; the bar records nothing without confirmation.** Opposite defaults, deliberately.
3. **The database is the security boundary.** Capability checks improve the interface and the server's answer; RLS is what actually holds when someone calls the API directly.

### Explicitly deferred — out of scope for this phase

| ID | Item | Where it lives |
|---|---|---|
| QR-01 | Access-granting codes generated with a cryptographic source | Deferred (`REQUIREMENTS.md` Future). **Still true:** `src/utils/qr.ts:49` uses `Math.random()` — re-verified 2026-08-05 |
| RATE-01 | Rate limiting on "valid / not valid" endpoints | Deferred. No rate limiting exists anywhere in the repo |
| OBS-01 | A production failure reaching a human by itself | Deferred. No error-tracking dependency in `package.json` |
| ASSIGN-05 | Undo requires a supervising capability | Phase 35 |
| LIVE-* | Realtime attendee freshness | Phase 38 |
| DS-04 | Scanner colour/contrast work | Phase 42 |

---

## Project Constraints (from `CLAUDE.md`)

These are directives, not preferences. A plan that violates one is wrong regardless of how well it reads.

| # | Directive | Consequence for this phase |
|---|---|---|
| G1 | **No test runner exists for the product.** No `test` script in `package.json` (verified), no `*.test.*` / `*.spec.*` files | Nothing may be called "verified" because tests pass. Verification = `npm run build` + a **written** manual procedure. See `## Validation Architecture` |
| G2 | **Typecheck runs through `next build`** — there is no separate `typecheck` script | The build is the type gate; a type error blocks the Vercel deploy |
| G3 | **Migrations are the schema source of truth**, not `supabase/schema.sql` (which has zero `CREATE POLICY`) | Any new table gets `ENABLE ROW LEVEL SECURITY` + at least one policy **in the same migration** |
| G4 | **`.planning/codebase/` is stale** (*Analysis Date: 2026-02-24*) | Not used as a source here. Every claim below was read from the current tree |
| G5 | **The repository is public** | No names, no addresses, no unannounced dates in any artefact this phase produces — including the review-list technical export (FIX-12) |
| G6 | **macOS/BSD** — `grep -E`, `sed -i ''` | Applies to any script a plan writes |
| — | **Zero silent failures**, and no error tracking exists | A failure that matters needs an **observable effect** — visible to the staff member at the door — not a log line |
| — | **Monotone guards**: `venue_reveal_sent`, payment terminal states, series numbering | A local check-in must be monotone too: local-true never loses to server-false until it has synced |
| — | **A `.single()` throws on 0 or on >1** | "not found" and "duplicate" are different errors and must be logged differently |
| — | **VERIFICATION.md gate** — `workflow.verifier: true` | The phase closes with `31-VERIFICATION.md` carrying at least one `file:line` per requirement |

---

## Phase Requirements

| ID | Description | Research support |
|---|---|---|
| FIX-01 | Inbound `x-user-*` header can never reach a Server Component or server action | **Already applied and re-verified today** — `src/lib/supabase/middleware.ts:131-133` deletes all three headers unconditionally *before* `:136-138` sets them on the authenticated branch. No further work; the plan should assert it, not redo it |
| FIX-02 | Serving an already-served drink token fails with a distinct message | **Already applied and re-verified today** — both callers check the RPC's `false` return: `src/app/(organizer)/organizer/events/actions.ts:1189-1199` and `src/app/(public)/events/[slug]/menu/actions.ts:305-315`. The RPC that produces the `false` is `redeem_drink_token` in `supabase/migrations/20260508000000_drink_token_active_state.sql`. No further work |
| FIX-03 | A genuine duplicate survives synchronisation as a conflict | § Answer B — the sync manager's `res.ok` test against a route that returns 200 for conflicts |
| FIX-04 | Exactly three door outcomes, identical online and offline | § Answer B — the outcome contract |
| FIX-04a | The third outcome states a fact, not a verdict | § Answer B — `already_recorded` carries `by` + `at`; no `cause` is computed at the scanner |
| FIX-05 | Cache refresh merges, never reverts an unsynced local check-in | § Answer D — merge, local-true wins |
| FIX-06 | The cache is never momentarily empty during a refresh | § Answer D — and the *real* mechanism is the service worker, not the transaction |
| FIX-07 | Same person at two parties on one device = two queued entries | § Answer D — the composite record key |
| FIX-08 | A permanently-failing membership sync is recorded as failed | § Answer F — three-bucket classification + a fourth `blocked` state |
| FIX-09 | Refunded ticket admitted and flagged; before/after the night distinguished | § Answer E — **the refunded ticket does not exist today**. This is the largest finding in this document |
| FIX-10 | A queued offline scan carries the signed token | § Answer C |
| FIX-11 | Per-night review list, empty on a normal night, classified by cause | § Answer A — requires a schema change |
| FIX-12 | Prose for the supervisor, identifiers-only technical detail for a master | § Answer A — a serialisation rule, **not** a second RLS policy. Explained there |
| FIX-13 | A conflict is recorded against the ticket, never as a label on a person | § Answer A — the row's subject is a ticket/entry id; nothing is ever written to `profiles` |

---

## Summary

Two of the fourteen requirements are already shipped. The remaining twelve are not
twelve independent bugs: they are **four defects with one shared root** plus one
that has been mis-scoped from the start.

The shared root is that **failure is encoded in the JSON body while success is
encoded in the HTTP status, and the two disagree.** `/api/tickets/checkin` returns
HTTP 200 with `{ valid: false, status: "already_checked_in" }`
(`src/app/api/tickets/checkin/route.ts:101-108` — a bare `NextResponse.json` with
no status argument), while `src/lib/offline/sync-manager.ts:36` deletes the queue
entry on `res.ok || res.status === 409`. `res.ok` is `true`, so the only evidence
that two people walked in on one ticket is deleted at the moment it arrives. The
same mismatch explains why the offline path shows "Connection error" for a
duplicate (`ScannerClient.tsx:599-621` — the truthy-and fall-through), why the
same-operator re-read renders as a fresh green admission (`route.ts:96` sets
`already_by_you: true`, and **nothing in `src/` ever reads it** — verified by grep),
and why a permanently-failed membership sync is retried forever
(`sync-manager.ts:52`).

The mis-scoped one is FIX-09. Milestone research assumed a refunded ticket still
exists and merely lacks a flag. It does not: **all three refund paths delete the
ticket row** (`refund-actions.ts:139/177`, `admin/finance/actions.ts:109`,
`api/cron/reconcile-refunds/route.ts:120`), and `ticket_refunds.ticket_id` is
`REFERENCES public.tickets ON DELETE CASCADE`
(`supabase/migrations/20260227200000_ticket_refunds.sql:3`) — so the delete that
follows the refund destroys the refund record that was written one statement
earlier. Today a refunded ticket at the door reaches `status: "not_found"`
(`checkin/route.ts:58-60`) and the scanner shows a **red "Ticket not found"** —
the false refusal in front of a queue that `checkin-offline.md` exists to prevent.
There is no row to admit-and-flag and no timestamp to classify before/after the
night. FIX-09 cannot be built without deciding what a refunded ticket *is*.

And there is a mechanism nobody has written down yet. `@serwist/next` 9.5.6's
`defaultCache` — which `src/app/sw.ts:23` uses wholesale — includes a
`NetworkFirst` rule matching **every same-origin `GET /api/*`**, cache name
`"apis"`, `maxEntries: 16`, `maxAgeSeconds: 86400`, `networkTimeoutSeconds: 10`
(read from `node_modules/@serwist/next/dist/index.worker.js`). On a flaky signal
the attendee fetch therefore *succeeds* — after up to ten seconds, with a list that
may be a day old — while `navigator.onLine` is still `true`. The scanner takes the
online path and `cacheAttendees()` overwrites the good local cache with the stale
one. This is the operative cause of FIX-05 and FIX-06, and it is invisible in
`npm run dev` because `next.config.ts:9` sets `disable: NODE_ENV === "development"`.

**Primary recommendation:** make the three door outcomes a single discriminated
union returned by both paths with a matching HTTP status; make the offline record
key composite (`partyId:type:subjectId`) and the refresh a merge; store the full
signed token on the queued entry; add one append-only server-side table for the
night's scan events; and settle the refunded-ticket question **before** writing
plans, because it is the only item in this phase whose answer changes the shape of
the work.

---

## Direct Answers to the Six Planning Questions

### Answer A — Do FIX-11 / FIX-12 / FIX-13 require a schema change?

**Yes. One new table, plus one migration for the refund question in Answer E.**

Why a schema change is unavoidable, in the requirements' own terms:

- The review list is **per night** and read **after** the night, by a person who was not holding the phone. Nothing in `pendingCheckins` survives that: it is per-device, per-install, and drained on success.
- FIX-11 says a double read "does **not** appear, because one person cannot enter twice from one door in seconds; **but it is counted**". A count that must exist while the thing counted is deliberately not shown requires a durable record. There is nowhere to put it today.
- FIX-11's classification needs facts the check-in path currently never persists: **which device**, **which operator on the second read**, and **the interval between the two reads**. `tickets.checked_in_by` holds only the *first* operator (`20260228200000_ticket_checkin.sql:2-4`); the second read writes nothing at all.
- FIX-13 requires the record's subject to be the **ticket**. That is a column choice, and it is the whole safeguard: if the row's identity is a ticket id, no code path can drift into labelling a member.

**Recommended shape — one append-only table.**

```sql
-- supabase/migrations/2026080600000X_door_scan_events.sql
CREATE TABLE IF NOT EXISTS public.door_scan_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id       uuid NOT NULL REFERENCES public.event_parties ON DELETE CASCADE,
  event_id       uuid NOT NULL REFERENCES public.events        ON DELETE CASCADE,

  -- FIX-13: the subject is a ticket or an entry, never a person.
  subject_type   text NOT NULL CHECK (subject_type IN ('ticket','guest_list_entry','membership')),
  ticket_id      uuid REFERENCES public.tickets            ON DELETE SET NULL,
  guest_entry_id uuid REFERENCES public.guest_list_entries ON DELETE SET NULL,
  subject_user_id uuid REFERENCES auth.users               ON DELETE SET NULL,

  -- FIX-04: the three outcomes, and only three.
  outcome        text NOT NULL CHECK (outcome IN ('recorded','already_recorded','not_valid')),

  -- FIX-11: classified afterwards, never at the scanner (FIX-04a). NULL = unclassified.
  cause          text CHECK (cause IN (
                   'double_read','second_ticket_same_holder','two_devices',
                   'invalid_signature','not_in_cache','wrong_night',
                   'refunded_before_night','refunded_after_night')),

  scanned_at     timestamptz NOT NULL,           -- device clock at the read
  recorded_at    timestamptz NOT NULL DEFAULT now(),  -- when the server learned
  operator_id    uuid NOT NULL REFERENCES auth.users,
  device_id      text NOT NULL,                  -- stable per install, from IndexedDB
  source         text NOT NULL CHECK (source IN ('online','offline_sync')),
  token_fingerprint text                          -- sha256 of the scanned token; proves the read without storing the token
);

CREATE INDEX IF NOT EXISTS idx_door_scan_events_party    ON public.door_scan_events (party_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_door_scan_events_ticket   ON public.door_scan_events (ticket_id) WHERE ticket_id IS NOT NULL;

ALTER TABLE public.door_scan_events ENABLE ROW LEVEL SECURITY;

-- Read: the same audience that can already read attendances and profiles today.
CREATE POLICY door_scan_events_select_admin ON public.door_scan_events
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));

-- No INSERT/UPDATE/DELETE policy: writes come only from the service client in
-- the check-in route. Append-only by construction — there is no path that edits
-- or removes a row, deliberately.
```

Notes the planner must not lose:

- **`(SELECT public.is_admin_or_organizer())` — with the parentheses.** That is the existing convention in this repo (`20260224_rbac_migration.sql:151` and throughout) and it is the pattern CAP-06 exists to preserve. A bare `public.is_admin_or_organizer()` re-evaluates per row.
- The helper functions already exist: `get_user_role`, `get_user_status`, `is_master`, `is_admin_or_organizer` (`20260224_rbac_migration.sql:110-135`). Do not define new ones.
- `ON DELETE SET NULL` on `ticket_id`, not `CASCADE`. A scan event must survive its ticket — that is the entire lesson of the `ticket_refunds` cascade in Answer E.
- `src/types/database.ts` gets the matching interface **in the same commit** (`supabase-data.md`, gate *tipi allineati*). The file is 271 lines and hand-written, not generated.
- The policy is deliberately coarse (`is_admin_or_organizer`) because per-night scoping does not exist until Phase 35. Say so in the migration comment so Phase 35 knows to narrow it, rather than discovering a wide policy and assuming it was intended.

**FIX-12 does not need a second policy.** The requirement is that the technical
detail "uses **identifiers, never names or email addresses**, so it can be pasted
into an external tool for diagnosis without exporting a member's personal data."
An organizer can already read every profile (`profiles_select_admin`,
`20260224_rbac_migration.sql:151`). So restricting the technical view to a master
is **not** a security boundary and must not be presented as one — it is a UI
affordance. The requirement that *is* enforceable is a **serialisation rule**: the
table stores no name and no email (the schema above satisfies this by
construction), and the copyable technical view renders columns straight from it,
joining nothing. The prose view for the supervisor does the join at render time.
State this in the plan; a plan that adds a `door_scan_events_select_master` policy
has misread the requirement and bought nothing.

**FIX-13 is a negative requirement and needs a negative check.** "No automatic
label is attached to a member" is verified by a grep, not a feature: no code path
introduced by this phase may write to `public.profiles`, and the review list may
not carry a per-member aggregate that functions as a label. Put that grep in the
verification steps.

---

### Answer B — FIX-03 + FIX-04: how a conflict is encoded today, and the minimal correct contract

**Today.**

| Situation | Route response | HTTP | What the sync manager does | What the scanner shows |
|---|---|---|---|---|
| First scan | `{valid:true, status:"checked_in"}` | **200** | deletes from queue ✓ | green, name |
| Same operator, second read | `{valid:true, status:"checked_in", already_by_you:true}` (`route.ts:86-97`) | **200** | deletes from queue ✓ | **green, name** — indistinguishable from a first admission. `already_by_you` is read by **nothing** in `src/` |
| Different operator | `{valid:false, status:"already_checked_in", member_name, checked_in_at}` (`route.ts:101-108`) | **200** | `res.ok` is true → **`markSynced` deletes the conflict** (`sync-manager.ts:36-40`) | **red** "Already checked in" (`ScannerClient.tsx:449`) |
| Bad signature | `{valid:false, status:"invalid_signature"}` (`route.ts:41`) | **200** | deletes ✓ (evidence lost) | red |
| Unknown id | `{valid:false, status:"not_found"}` (`route.ts:59`) | **200** | deletes ✓ | red |
| Wrong party | `{valid:false, status:"wrong_event", …}` (`route.ts:66-74`) | **200** | deletes ✓ | red |

Five of the six outcomes are HTTP 200. The `409` branch in `sync-manager.ts:36`
was written against `/api/tickets/attendance`, which **does** return 409
(`attendance/route.ts:214-219`); the ticket route never has. Nothing failed loudly
because `res.ok` is true in every case.

**The minimal correct contract.** One discriminated union, produced by the server
and reproduced locally by the offline path, with a matching HTTP status so a
transport-level classifier (Answer F) can work without parsing.

```ts
// src/lib/door/outcome.ts — new, shared by the route, the sync manager and the scanner
export type DoorOutcome =
  | { outcome: "recorded";
      subject: DoorSubject;
      at: string;                                  // ISO
      flags?: Array<"refunded_before_night" | "not_in_cache">; }
  | { outcome: "already_recorded";
      subject: DoorSubject;
      at: string;                                  // when the FIRST record was made
      by: { operatorId: string; operatorLabel: string }; }   // FIX-04 "who and when"
  | { outcome: "not_valid";
      reason: "invalid_signature" | "unknown_code" | "wrong_night" | "no_party_selected"; };
```

| Outcome | HTTP | Door presentation | Sync manager |
|---|---|---|---|
| `recorded` | **200** | green | remove from queue |
| `already_recorded` | **409** | **amber — a third state, not red** | remove from queue **only after** the server confirms a `door_scan_events` row was written |
| `not_valid` | **422** | red | move to `failed`, never silently drop |

Reference for the codes: RFC 9110 §15.5.10 — 409 is "a conflict with the current
state of the target resource"; §15.5.21 — 422 is a well-formed request the server
cannot process. Both are the conventional readings and neither is load-bearing:
**the body's `outcome` field is authoritative**, the status exists so a classifier
can act without a body.

Three consequences the plan must carry:

1. **`already_by_you` is deleted.** FIX-04a says the door "states a fact, not a verdict" and "does not classify the cause at the scanner". Same-operator and different-operator both return `already_recorded`, both carry `by` and `at`, and the difference is classified later by the review list from `operator_id` + `device_id` + the interval. Today's `valid:true` shortcut for the same operator is exactly the "system decides for you" behaviour FIX-04a forbids.
2. **`already_recorded` is not a refusal.** FIX-04: "is never refused: the person in front of the scanner was already admitted." `ScanFlash` currently accepts `type: "success" | "error"` and hard-codes `bg-green-500/90` / `bg-red-500/90` (`src/components/scanner/ScanFlash.tsx:5, 28-30`). A **third** state is required. This is behaviour, not cosmetics, so it belongs to this phase even though DS-04/Phase 42 owns scanner colour. Per `nextjs-architecture.md` — *«il colore non e' mai l'unico canale»* — the third state needs its own icon and its own haptic, not just a different hue. `src/utils/haptics.ts` today exports only `vibrateSuccess` / `vibrateError`.
3. **The sync manager stops trusting `res.ok`.** It switches on the parsed `outcome`. For `already_recorded` it does **not** call `markSynced` until the response confirms persistence — otherwise FIX-03 is re-broken the first time the write fails.

**Reaching the same three outcomes offline, without a round trip.**

The HMAC secret is server-side only (`process.env.TICKET_SIGNING_SECRET`,
`src/utils/qr.ts:6`) and must stay there — shipping it to the device would make
every staff phone a ticket forge. So offline the signature **cannot** be checked,
and `not_valid` is only locally reachable for a string that is not even shaped
like one of our codes (`TICKET_TOKEN_PATTERN`, `ScannerClient.tsx:24`) or for a
scan with no party selected. Everything else resolves as:

| Local state | Offline outcome | Why |
|---|---|---|
| In cache, `checkedIn: false` | `recorded` | normal |
| In cache, `checkedIn: true` | `already_recorded` with `at` and `by` | **requires a new cache field** — see Answer D |
| In cache **under a different party** | `not_valid / wrong_night` | needs a `by-subject` index — see Answer D |
| Not in cache at all | `recorded` **with flag `not_in_cache`** | The asymmetry, plus FIX-09. Refusing here refuses a valid guest whose ticket was bought after the download |
| Not shaped like a code | `not_valid / unknown_code` | local, safe |

The last row is a decision the requirements have already taken, and it should be
stated out loud rather than discovered later: **offline, an unrecognised but
well-formed token is admitted and flagged.** FIX-11's final bullet closes the loop
— "an invalid signature … is the only outcome also surfaced to staff at the door
when the network returns." The forgery window is real and bounded: it needs a
`uuid.64-hex` string, it produces an amber flag at the door as soon as the signal
comes back, and it lands in the review list as `invalid_signature`.

---

### Answer C — FIX-10: how tokens are signed today, and what must travel with a queued scan

**Today.** `src/utils/qr.ts:4-31`:

- `generateTicketToken(ticketId)` → `` `${ticketId}.${HMAC_SHA256(TICKET_SIGNING_SECRET, ticketId)}` `` (hex).
- `verifyTicketToken(token)` splits on the **last** dot, recomputes, compares with `crypto.timingSafeEqual`, returns the id or `null`. The `try/catch` around `timingSafeEqual` correctly handles a malformed hex signature.

This is sound. It is a **static bearer token**: no nonce, no expiry, no binding to
a party or a scan. It proves possession of the code, not that the code was
presented by its holder at that moment.

**The hole.** `checkin/route.ts:30-36`:

```ts
const { token, partyId, ticketId: directTicketId, offlineSync } = body;
if (offlineSync && directTicketId) {
  ticketId = directTicketId;          // HMAC verification skipped entirely
}
```

`sync-manager.ts:26-34` uses it, sending a bare `ticketId`. So a queued scan
carries no evidence that a code was ever read. Two consequences, and they are
different in severity — do not conflate them:

- **Evidence (the requirement).** A synced check-in is indistinguishable from a hand-typed id. FIX-10 exists for this.
- **Authorisation (smaller than it looks).** The route already requires an authenticated `master`/`organizer` session (`route.ts:15-27`), so this is not an anonymous forgery path. What it is: any staff session can mark any ticket id it can obtain as checked in, over an endpoint that then uses the service client (`route.ts:47`), which bypasses RLS. `access-gating.md` requires that use to be justified in writing and unreachable from untrusted input; a body-supplied `ticketId` is untrusted input.

**The fix, and it costs nothing offline.** The scanner already holds the full
scanned string — `handleVerify(code)` receives it and immediately throws away
everything but the id (`ScannerClient.tsx:348`, `code.split(".")[0]`). Store the
whole thing.

```ts
// pendingCheckins record
{
  key: `${partyId}:ticket:${ticketId}`,   // Answer D
  type: "ticket",
  subjectId: ticketId,
  token,                 // the full signed string, exactly as scanned
  partyId,
  scannedAt,             // device clock at the read
  deviceId,
  attempts: 0,
}
```

and on sync `POST { token, partyId, scannedAt, deviceId, source: "offline_sync" }`,
with the `offlineSync && directTicketId` branch **deleted** from the route. The
route verifies the HMAC on the offline path exactly as it does online; `source`
only affects which timestamp is authoritative (`scanned_at` from the device,
`recorded_at` from the server) and never whether verification runs.

Guest-list entries and membership codes have no signature to carry — a membership
QR is a plain URL (`qr.ts:33-43`). For those, the queued entry carries the raw
scanned string plus `deviceId` and `scannedAt`; the proof is weaker and that
should be written down rather than papered over.

**On `Math.random()` (QR-01).** Re-verified today: `src/utils/qr.ts:45-52`
generates `RSN-` + 8 characters from a 32-character alphabet using
`Math.floor(Math.random() * …)`. It **does not affect FIX-10** — ticket tokens are
HMAC-signed and independent of it. It does interact with the offline membership
path: the whole member roster is cached on the device (`/api/membership/list` →
`cacheMembers`), so a guessed code resolves against a local list with no server in
the way. The keyspace is 32⁸ ≈ 1.1 × 10¹² and `Math.random()` is not a CSPRNG.
This stays deferred as QR-01; do not silently fix it inside this phase, and do not
pretend it is fixed.

---

### Answer D — FIX-05 / FIX-06 / FIX-07: the refresh, and what the record key must be

**What the code does now.** `cacheAttendees()`
(`src/lib/offline/checkin-store.ts:84-130`) opens one `readwrite` transaction,
walks the `by-party` index deleting every row for the party, then re-inserts from
the server payload — including `checkedIn: a.checkedIn` straight from the server.
`cacheMembers()` (`:227-241`) does the same with a full `tx.store.clear()`.
Both are called fire-and-forget with `.catch(() => {})` (`ScannerClient.tsx:170`).

**FIX-05 is exactly as described and is the most damaging of the three.** A member
checked in offline sits in `pendingCheckins` with `attendees.checkedIn = true`
written by `checkInLocally` (`:161-172`). The server does not know. The next
refresh writes `checkedIn: false` over it. The person standing inside now reads as
*Not arrived*, a re-scan looks like a first arrival, and the door count is wrong in
the direction that produces an argument at the entrance.

**FIX-06 needs a correction to the common reading.** The transaction *is* atomic —
the W3C IndexedDB spec is explicit on both halves: *"When a transaction is aborted
the implementation must undo (roll back) any changes that were made to the
database during that transaction"*, and *"If multiple read/write transactions are
attempting to access the same object store (i.e. if they have overlapping scopes),
the transaction that was created first is the transaction which gets access to the
object store first, and it is the only transaction which has access to the object
store until the transaction is finished."* A concurrent `findAttendee()` therefore
cannot observe a half-cleared store. The current code also only awaits IDB
promises inside the transaction, which is the condition the official `idb` README
states: *"Do not `await` other things between the start and end of your
transaction, otherwise the transaction will close before you're done."*

So "momentarily empty" in the literal microtask sense is **not** the live defect.
What *is* live, and worse:

- **The cache shrinks to whatever the server said.** If the payload is stale or partial, the local cache becomes stale or partial atomically. At the door "not in the list" is indistinguishable from "not on the list", and today that path shows red.
- **The payload can be a day old with `navigator.onLine === true`.** `defaultCache` from `@serwist/next` caches every same-origin `GET /api/*` as `NetworkFirst`, `cacheName: "apis"`, `maxEntries: 16`, `maxAgeSeconds: 86400`, `networkTimeoutSeconds: 10` — read from `node_modules/@serwist/next/dist/index.worker.js` at the installed 9.5.6. `src/app/sw.ts:23` adopts it wholesale. On a weak signal the fetch resolves from cache after the 10 s timeout, `res.ok` is true, and the stale list is written over the good one. **This is the mechanism FIX-06 is really about**, and `nextjs-architecture.md` already has the gate for it: *«la cache va scelta per rotta, non ereditata»*.
- **The invariant has no guard.** One future `await` on a non-IDB promise inside that loop turns the clear into a commit and the store really is empty. Nothing in the repo can catch that, because there is no test runner.

**Recommended refresh algorithm** — one transaction, no `clear`, no delete:

```
for each row in payload:
    local = store.get(key(partyId, type, subjectId))
    merged = { ...local, ...serverIdentityFields, lastSeenAt: now }
    // monotone: a local check-in never loses to a server "not arrived"
    if local?.checkedIn && pendingExists(key):
        merged.checkedIn   = true
        merged.checkedInAt = local.checkedInAt
        merged.checkedInBy = local.checkedInBy ?? "this device"
    put(merged)
// rows absent from the payload are LEFT ALONE in this phase.
// Prune only at party switch, and only rows whose lastSeenAt predates the night.
```

plus a **plausibility guard** before applying anything, which is the only real
defence against the stale service-worker response:

```
if (payload.length === 0 && cacheCount > 0) → refuse, keep the cache, show "list not refreshed"
if (pendingCount > 0 && payload.length < cacheCount) → refuse, keep the cache, show it
```

Refusing must be **visible to the staff member**, not logged. No error tracking
exists; the person holding the phone is the only observer there is.

**The record keys.**

| Store | Key today | Key required | Reason |
|---|---|---|---|
| `attendees` | `ticketId` — also used for `guestListEntryId` (`checkin-store.ts:14, 112`) | `` `${partyId}:${subjectType}:${subjectId}` `` | Ticket ids and guest-entry ids share one keyspace today, which is semantically wrong; and the key carries no night, so "wrong night" is not locally decidable |
| `pendingCheckins` | `id` — `ticketId`, `guestListEntryId`, **or `membership_code`** (`:39-47`, `checkInMemberLocally:252-263`) | `` `${partyId}:${type}:${subjectId}` `` | **This is FIX-07.** A membership code is party-independent: the same member at two parties on one device writes the same key twice and the second `put` destroys the first |
| `members` | `membershipCode` | unchanged | Genuinely global |

Add a **`by-subject` index** on `attendees.subjectId`. That is what lets the
offline path answer "in the cache, but for another night" as
`not_valid / wrong_night` locally instead of falling through to red.

**Two facts that make FIX-07 subtler than a key change.**

1. `attendances` is `unique(event_id, user_id)` (`supabase/schema.sql:231-238`), so a membership check-in is recorded **per event, not per party**. The composite key correctly queues two entries for a double bill inside one event — and the second will legitimately hit `23505` and come back `already_checked_in` (`membership/verify/route.ts:126-140`). The production calendar guarantees this case: SunSet 18→22 and the night 22→06 are the same night, communicated as one, and if they are modelled as two parties of one event the second scan is a **false conflict, every time**. The classifier must not label it `two_devices`. **[NEEDS CONFIRMATION]** whether a double bill is one event with two parties or two events — the answer changes whether this needs a data model fix here or only a classifier rule.
2. `DB_VERSION` is 2 and the `upgrade` callback only creates stores when absent (`checkin-store.ts:51, 59-77`). Changing a `keyPath` on an existing store is impossible in IndexedDB, so the upgrade must create new stores and copy. **The good news, and it removes the main risk flagged in milestone research (Pitfall 7):** both existing values already carry everything the new key needs — `pendingCheckins.value` has `partyId` and `type` (`:41-46`) and `attendees.value` has `partyId` (`:16`). So the rekey is mechanical and lossless, done inside the single `versionchange` transaction, which rolls back as a unit if it fails. The `idb` README confirms the upgrade transaction can read the old stores: *"transaction: An enhanced transaction for this upgrade. This is useful if you need to get data from other stores as part of a migration."* Write the upgrade as copy-then-`deleteObjectStore`, never as `deleteObjectStore`-then-create.

Also required by Answer B: the `attendees` value gains `checkedInBy` (an operator
label) and `refundedAt`, and the attendance payload must supply them — otherwise
the offline `already_recorded` cannot say who, and FIX-04 is unmet offline.
**`guest_list_entries` has no `checked_in_at` and no `checked_in_by` at all**
(`20260310000000_guest_list.sql:44-59` — status only), which is why
`attendance/route.ts:129` hard-codes `checkedInAt: null`. For a guest-list entry,
"who recorded it and when" is unanswerable without adding those two columns.
**[NEEDS CONFIRMATION]** — add them, or accept that the third outcome is weaker
for guest-list entries and say so at the door.

---

### Answer E — FIX-09: where the paths diverge, and before vs after the night

**The finding that changes the shape of the work: a refunded ticket does not exist.**

| Path | What it does |
|---|---|
| `src/app/(public)/tickets/refund-actions.ts:126-143` (free / guest-list) | update `ticket_refunds`, then `tickets.delete()` |
| `src/app/(public)/tickets/refund-actions.ts:166-180` (paid) | SumUp refund, update `ticket_refunds`, then `tickets.delete()` |
| `src/app/(admin)/admin/finance/actions.ts:100-110` | insert `ticket_refunds`, then `tickets.delete()` |
| `src/app/api/cron/reconcile-refunds/route.ts:109-121` | insert `ticket_refunds`, then `tickets.delete()` |

And `ticket_refunds.ticket_id` is `uuid NOT NULL REFERENCES public.tickets ON
DELETE CASCADE` (`20260227200000_ticket_refunds.sql:3`).

Two consequences, both live today:

1. **The refund audit row is destroyed by the delete that follows it.** Every path writes the `ticket_refunds` row and then deletes the ticket, which cascades the row away. `fetchEventRevenue` computes refunds by collecting the event's ticket ids and querying `ticket_refunds` by those ids (`src/lib/analytics/event-queries.ts:84-92`) — both sides of that join are gone, so `ticketRefundsTotal` is structurally 0 and gross revenue silently omits the refunded ticket too. The finance surface under-reports without any error. **[MEDIUM confidence — the cascade is unambiguous in the DDL, but I did not run SQL against a live database. Confirm with a single refund on a non-production project before planning around it.]**
2. **The door refuses a refunded ticket.** `checkin/route.ts:50-60` does `.single()` on a row that no longer exists → `status: "not_found"` → `ScannerClient.tsx:459-469` shows red **"Ticket not found"**. That is a false refusal in front of a queue, on data the person cannot argue with. FIX-09 exists because of the opposite failure ("admitted and flagged") and today the system does the worse one.

A third, smaller one worth catching: `guest_list_entries.ticket_id` is
`REFERENCES public.tickets(id)` with **no** `ON DELETE` clause
(`20260310000000_guest_list.sql:56`), so the default is `NO ACTION`. Deleting a
ticket that a guest-list entry points at raises a foreign-key violation — and
`refund-actions.ts:139` does not check the delete's error. For a guest-list ticket
the refund is therefore marked approved while the ticket survives, silently.
**[MEDIUM confidence — same caveat: DDL-derived, not executed.]**

**Two ways forward. They are not equivalent, and the choice belongs to the project owner.**

| | **Option A — soft-invalidate the ticket** | **Option B — persist the refund evidence** *(recommended for this phase)* |
|---|---|---|
| Change | `ALTER TABLE tickets ADD COLUMN refunded_at timestamptz, refunded_by uuid`; stop deleting; rebuild both partial unique indexes to add `AND refunded_at IS NULL` | Add `refunded_ticket_id uuid` (**not** an FK), `refunded_party_id uuid`, `refunded_at timestamptz` to `ticket_refunds`; change the FK to `ON DELETE SET NULL`; keep deleting the ticket |
| Door can admit-and-flag | yes, directly on the row | yes — on `not_found`, a second lookup by `refunded_ticket_id` |
| Before/after the night | `refunded_at` | `refunded_at` |
| Audit trail fixed | yes | yes |
| Blast radius | **63 `from("tickets")` call sites across 22 files** — every count, every tier availability check, `reserve_ticket()`'s tier counting (`party_architecture.sql:215-217`), three crons, the analytics queries. Each missed site is a silently wrong number | the check-in route and the four refund writers |
| Re-purchase after a refund | breaks unless the unique indexes are rebuilt (`tickets_party_user_unique`, `tickets_event_user_master_unique`, `multi_sub_events.sql:60-68`) | unaffected |
| Honest verdict | architecturally right — a ticket that existed should not vanish | surgical, and sufficient for every FIX-09 clause |

**Recommendation: Option B for Phase 31, Option A recorded as deferred.** The
phase's mandate is *"the defects that exist in production today are corrected"*,
not "the ticket lifecycle is restructured", and a 22-file sweep inside a
fourteen-requirement phase is how a plan deviates. `meta-gates.md` — *«Fermati se
il piano devia»*. Production data is nearly empty (2 events, 3 parties, 1 ticket,
4 profiles per `STATE.md`), so there is no backfill either way — but that is also
the reason Option A is cheap **later** and does not need to be forced now.

**Where the paths diverge.**

- **Online.** After the ticket lookup fails, look up `ticket_refunds` by `refunded_ticket_id`. If found: outcome is `recorded` (**admit**) with `flags: ["refunded_before_night"]`, plus a `door_scan_events` row. The scanner shows the amber third state, not red.
- **Offline.** The cached attendee record gains `refundedAt`, so a refund known **at download time** produces the same amber admit locally. A refund issued **after** the download cannot be known locally at all — the ticket is not even in the payload, so the scan lands on *not in cache* → **admit and flag** (Answer B) → classified on sync. That is the honest limit of an offline door and it should be written into the runbook, not engineered around.

**Before vs after the night.** Compare `refunded_at` against the night's start,
computed **only** through `src/utils/datetime.ts`:

```ts
import { partyStartInstant } from "@/utils/datetime";
const nightStart = partyStartInstant(party.date, party.time);   // Europe/Rome
const cause = refundedAt < nightStart
  ? "refunded_before_night"    // FIX-09: appears in the night's review list
  : "refunded_after_night";    // FIX-09: accounting — finance surface, never a door conflict
```

`time-and-scheduling.md` is unambiguous: *«un valore `date` + `time` letto dal
database non si passa mai a `new Date()`»*. A night runs 22:00 → 06:00, so if the
window's **end** is needed, add a `partyEndInstant()` to `src/utils/datetime.ts`
using the same crossing-midnight rule as `menuCloseInstant` (`datetime.ts:74-82`) —
add it there, do not inline a variant. That module was corrected in commit
`8f4e004` precisely to stop the six-variant drift.

The review list therefore filters `cause <> 'refunded_after_night'`, and the
finance surface queries the complement. One classification, two readers.

---

### Answer F — FIX-08: permanently-failing vs retryable membership sync

**Today.** `sync-manager.ts:41-55` marks a membership entry synced **only** on
`res.ok`. `/api/membership/verify` POST returns 400 for a missing `code`/`partyId`
(`:78-83`), 404 for an unknown party (`:105-110`), and — the nastiest one — **HTTP
200** with `{valid:false, status:"not_found"}` for an unknown member code
(`:94-96`). So:

- a permanent 400/404 stays in the queue forever, retried on every `online` event and every `visibilitychange` (`sync-manager.ts:87-99`);
- an unknown member code returns 200, `res.ok` is true, and the entry is **silently deleted** — the opposite failure, in the same handler.

The pending count is therefore both inflated by dead entries and deflated by lost
ones, which is exactly what FIX-08's *"so the pending count means something"*
refers to.

**Classification. Four buckets, not two.**

| Bucket | Trigger | Action | Visible as |
|---|---|---|---|
| **done** | body `outcome` is `recorded`, **or** `already_recorded` with confirmed server persistence | remove from queue | count drops |
| **retry** | `fetch` throws, `navigator.onLine === false`, 408, 429, 5xx | keep, `attempts++`, exponential backoff, cap the attempts | "pending (N)" |
| **dead** | 400, 404, 410, 422, and any 200-with-`outcome: not_valid` | move to a `failedCheckins` store with status, reason, timestamp, attempts | "**N could not be recorded**" — a separate, acknowledgeable list |
| **blocked** | 401, 403 | keep, **stop retrying**, prompt | "**sign in again to record N entries**" |

The fourth bucket is not decoration. A staff session expiring at 02:00 turns every
queued entry into a 401; classified as *dead* the whole night's queue is discarded,
classified as *retry* it spins silently forever. Neither is acceptable, and both
are reachable tonight.

**The observability defect nobody has recorded yet.** `pendingCount` is rendered
**only inside the offline branch** of the status pill
(`ScannerClient.tsx:858-868` — the `isOnline` ternary; the count appears at `:866`).
While the device is online — which is exactly when a stuck queue matters and
exactly when it can be drained — the count is **invisible**. Fixing the
classification without fixing the surface leaves FIX-08 half-done: the number
would mean something, and nobody would see it. With no error tracking in the
project, that pill is the only observer of a failed sync that exists.

Finally, `/api/membership/verify`'s unknown-code branch must move to the shared
contract too (`outcome: "not_valid", reason: "unknown_code"` at HTTP 422), or the
`res.ok`-shaped bug returns on the membership path the moment someone touches it.

---

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|---|---|---|---|
| Scan verdict at the door | **Browser / device (IndexedDB)** | — | Guiding constraint 1: the verdict never waits on the network. Milestone-locked |
| HMAC verification of a ticket token | **API / server** | — | `TICKET_SIGNING_SECRET` must never reach a device (`nextjs-architecture.md`, secrets in the bundle) |
| Durable queue of unsynced scans | **Browser (IndexedDB)** | API on drain | Must survive app close and phone restart (`checkin-offline.md`, gate *coda durevole*) |
| The three-outcome contract | **API / server**, mirrored in a shared module | Browser | One type, two producers — divergence is the defect being fixed |
| Conflict classification by cause | **API / server (write) + database (read)** | — | Needs cross-device facts one phone cannot have |
| The night's review list | **API / server + RLS** | Frontend server render | `is_admin_or_organizer()` is the boundary; the page is presentation |
| Refund state of a ticket | **Database** | API | Only the database knows; the cache holds a copy that is stale by construction |
| Before/after the night classification | **API / server** via `src/utils/datetime.ts` | — | A device clock is not trustworthy for a decision; `scanned_at` is evidence, not authority |
| Pending / failed / blocked counters | **Browser** | — | Derived from the local queue; must render **online and offline** |
| Serving a drink token | **Database (RPC)** | Server action | Already correct: `redeem_drink_token` is the single arbiter, and both callers now honour its `false` |

---

## Standard Stack

**No new runtime dependency is required by this phase, and none should be added.**
Everything needed is already installed and already used on these paths.

### Core (already present)

| Library | Installed | Purpose here | Why it stays |
|---|---|---|---|
| `idb` | ^8.0.3 | IndexedDB wrapper for the attendee cache and the queue | Already the store's foundation; its transaction-lifetime rule is the invariant the refresh must respect |
| `next` | 16.1.6 | Route handlers, server actions | — |
| `@supabase/supabase-js` | ^2.97.0 | Service client on the check-in path | Already there; the new table is read through the normal client under RLS |
| `@serwist/next` / `serwist` | ^9.5.6 | Service worker | **Needs configuration, not replacement** — see Pitfall N1 |
| `html5-qrcode` | ^2.3.8 | Camera scanning | Untouched |
| Node `crypto` | built-in | HMAC + `timingSafeEqual` (`src/utils/qr.ts`), and the `token_fingerprint` sha256 | No dependency needed |

### Deliberately not added

| Temptation | Why not |
|---|---|
| A background-sync library (Workbox `BackgroundSyncPlugin` et al.) | The queue must be inspectable and classifiable by the scanner UI (`pending` / `failed` / `blocked`). A background-sync plugin hides retries inside the service worker, which is the opposite of what FIX-08 asks for |
| A state-management library for the scanner | The scanner is one client component; the defect is contract drift, not state management |
| A test runner | Out of scope, and introducing one here would make this phase about tooling. If it is ever wanted, `## Validation Architecture` says what it would have to cover |

**Installation:** none.

---

## Package Legitimacy Audit

**No external packages are installed by this phase.**

The Package Legitimacy Gate was therefore not run against a package list, because
there is no package list. Every library named above is already in
`package.json` at the version shown, verified by reading the file on 2026-08-05.

If planning later introduces a dependency, the gate applies in full: `slopcheck`
first, then `npm view <pkg> version`, then `npm view <pkg> scripts.postinstall`,
and the package is `[ASSUMED]` until all three pass.

---

## Architecture Patterns

### The door path, after this phase

```
                         ┌──────────────── QR read (camera) ────────────────┐
                         │                                                   │
                         ▼                                                   │
              ┌──────────────────────┐                                       │
              │ shape check (regex)  │── not one of ours ──► not_valid       │
              └──────────┬───────────┘                        (red)          │
                         │                                                   │
                         ▼                                                   │
              ┌──────────────────────┐                                       │
              │ party selected?      │── no ──────────────► not_valid        │
              └──────────┬───────────┘                        (red)          │
                         │ yes                                               │
        ┌────────────────┴────────────────┐                                  │
        │  navigator.onLine ?             │                                  │
        └───────┬─────────────────┬───────┘                                  │
           yes  │                 │  no                                      │
                ▼                 ▼                                          │
   ┌────────────────────┐  ┌──────────────────────────┐                      │
   │ POST /api/tickets/ │  │ IndexedDB `attendees`    │                      │
   │      checkin       │  │ key partyId:type:id      │                      │
   │  (verifies HMAC)   │  │ + by-subject index       │                      │
   └─────────┬──────────┘  └───────────┬──────────────┘                      │
             │                          │                                     │
             │            ┌─────────────┴──────────────┐                      │
             │            │ not cached → RECORD+FLAG   │                      │
             │            │ other party → not_valid    │                      │
             │            │ checkedIn   → already_rec. │                      │
             │            │ otherwise   → recorded     │                      │
             │            └─────────────┬──────────────┘                      │
             │                          ▼                                     │
             │              ┌────────────────────────────┐                    │
             │              │ pendingCheckins            │                    │
             │              │ key partyId:type:id        │                    │
             │              │ + full signed token        │                    │
             │              │ + deviceId + scannedAt     │                    │
             │              └─────────────┬──────────────┘                    │
             │                            │  online / visibilitychange        │
             │                            ▼                                   │
             │              ┌────────────────────────────┐                    │
             │              │ sync-manager               │                    │
             │              │ done / retry / dead /      │                    │
             │              │ blocked  (never res.ok)    │                    │
             │              └─────────────┬──────────────┘                    │
             └──────────────┬─────────────┘                                   │
                            ▼                                                 │
              ┌──────────────────────────────┐                                │
              │ DoorOutcome (one union)      │────────────────────────────────┘
              │ recorded 200 / already 409 / │        green / amber / red
              │ not_valid 422                │        + haptic + icon
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐        ┌───────────────────────┐
              │ door_scan_events (append)    │───────►│ the night's review    │
              │ ticket id · operator ·       │        │ list, classified —    │
              │ device · scanned_at · cause  │        │ empty on a normal     │
              └──────────────────────────────┘        │ night                 │
                                                      └───────────────────────┘
```

### Pattern 1 — One outcome type, two producers

**What:** a single `DoorOutcome` union in `src/lib/door/outcome.ts`, imported by
the route handler, the offline branch of the scanner, and the sync manager.
**When:** every scan resolution, on both paths.
**Why here:** the phase's shared root cause is that the online and offline paths
each invented their own vocabulary. A shared *type* makes the divergence a build
error (G2: `next build` is the type gate), which is the only automatic check this
repository has.

### Pattern 2 — Local-true is monotone until it syncs

**What:** a locally recorded check-in is never reverted by server data while a
matching entry sits in `pendingCheckins`.
**Why here:** this is the same family as the three monotone guards in
`meta-gates.md`. A refresh may add knowledge, never subtract an admission that has
not yet been reported. Without it, FIX-05 returns the first time anyone writes a
new refresh path — and Phase 38 turns that path into the normal case.

### Pattern 3 — Classify after, never at the scanner

**What:** the route records `outcome` and leaves `cause` NULL; classification runs
over `door_scan_events` when the review list is read.
**Why here:** FIX-04a states it directly. It also means a classification rule can
be corrected after a night without re-deploying anything to the door, which
matters when the door is a phone with a cached bundle.

### Anti-patterns to avoid

- **`if (res.ok)` against any route in this phase.** Five returns in `checkin/route.ts` (lines 41, 44, 59, 66, 101) and one in `membership/verify/route.ts` (line 95) encode failure at HTTP 200. Switch on the body's `outcome`.
- **`clear()` or a cursor-delete sweep in `cacheAttendees`.** Merge. There is no version of clear-and-replace that is safe on a store holding authoritative local state.
- **`deleteObjectStore` in the IndexedDB upgrade before copying.** Those rows are attendance records for people who paid; some are on a device that is offline and cannot be audited.
- **A new `redirect()`-only or middleware-only guard.** `access-gating.md`: the middleware decides where a user may *go*; RLS decides what they may *read*.
- **Trusting the device clock.** `scanned_at` is evidence. `recorded_at` and every before/after decision come from the server, through `src/utils/datetime.ts`.
- **Extending `ScanFlash` by passing a colour.** It takes a semantic `type`; add a third value, not a style prop (DS-04/Phase 42 will retint it, and a colour prop would have to be unpicked).

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Turin wall-clock ↔ instant, night crossing midnight | a local `new Date(\`${date}T${time}\`)` | `partyStartInstant` / `menuCloseInstant` / `zonedDateString` in `src/utils/datetime.ts`; add `partyEndInstant` **there** | Six variants existed before commit `8f4e004`; a two-hour drift on a night that starts at 22:00 is a whole day on a daily boundary |
| Constant-time signature comparison | a `===` on hex strings | `crypto.timingSafeEqual`, already used at `src/utils/qr.ts:22` | Already correct, including the malformed-hex `catch` |
| "who is admin/organizer" inside a policy | a new SQL helper | `(SELECT public.is_admin_or_organizer())` — note the parentheses | The convention is established repo-wide and is what CAP-06 preserves |
| Idempotent state transition on money | a read-then-write in TypeScript | the `SECURITY DEFINER` RPCs with `FOR UPDATE` (`20260508000000_drink_token_active_state.sql`) | The row lock is the whole point; FIX-02's bug was discarding their return value, not the RPCs |
| IndexedDB transaction and cursor plumbing | raw `IDBRequest` event handling | `idb` (already installed), obeying its documented await rule | The rule is the invariant; hand-rolled request handling makes it harder to see |
| A retry/backoff queue | a bespoke setInterval loop | the existing `online` + `visibilitychange` listeners (`sync-manager.ts:87-99`), extended with per-entry `attempts` | Adding a parallel trigger set is how two schedulers end up fighting over one queue |

**Key insight:** almost nothing in this phase is new construction. Every fix is
*removing a shortcut* — a discarded boolean, a discarded token, a discarded
conflict, a `clear()`. Plans that add machinery are probably solving the wrong
problem.

---

## Runtime State Inventory

This is a correction phase touching a store that lives **on devices we do not
control**. A grep finds the files; it does not find these.

| Category | Items found | Action required |
|---|---|---|
| **Stored data (off-server)** | IndexedDB `resonate-checkin` v2 on every staff device that has opened the scanner: `attendees` (keyed `ticketId`), `members` (the **entire** member roster — id, full name, membership code, via `/api/membership/list` → `cacheMembers`), `pendingCheckins` (keyed by bare id) | **Data migration inside the `upgrade` callback**, not just a code edit. Copy-then-delete, never delete-then-create. Both stores already carry `partyId`, so the rekey is lossless |
| **Stored data (off-server)** | Cache Storage bucket `"apis"` — up to 16 same-origin `GET /api/*` responses, kept 24 h. On a door device this can include `/api/tickets/attendance` (names + tiers) and `/api/membership/list` (**the whole roster**) | Configuration change: override `defaultCache` so `/api/*` is `NetworkOnly` for the door routes. Existing cached entries are evicted by the new service worker's `cleanupOutdatedCaches` on activation — **verify, do not assume** |
| **Stored data (server)** | `tickets` rows for refunded tickets — **already deleted**, unrecoverable, along with their cascaded `ticket_refunds` rows. `STATE.md` reports 1 ticket in production, so the historical loss is negligible | No backfill. Record the loss in `VERIFICATION.md` rather than pretending history is intact |
| **Live service config** | Vercel env vars: `TICKET_SIGNING_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`. None is renamed by this phase | **None.** Confirmed by reading the paths — no new secret is introduced |
| **OS-registered state** | The installed PWA and its registered service worker on each staff device. `next.config.ts:6-8` sets `skipWaiting`-adjacent behaviour via `src/app/sw.ts:21-22` (`skipWaiting: true`, `clientsClaim: true`) and `reloadOnOnline: true` | A staff device may run the **old** bundle against the **new** API for the length of one open session. The contract change (Answer B) must therefore be additive on the wire for one release, or the door must be updated before the night. Decide explicitly |
| **Secrets / env vars** | `TICKET_SIGNING_SECRET` is read by `src/utils/qr.ts:6,18` only, server-side | **None.** FIX-10 makes the server verify *more*, never less |
| **Build artifacts** | `public/sw.js`, regenerated by `next build`. Stale only if the build is skipped | Rebuild. Note `disable: NODE_ENV === "development"` — the file is **not** produced in `npm run dev` |

**Nothing found in a category:** none — all six are populated.

---

## Common Pitfalls

Milestone-level pitfalls 1–7, 11 and 12 in `.planning/research/PITFALLS.md` (dated
2026-08-05) were re-verified against the current tree today and **all still hold**;
they are not repeated here. Pitfall 12's premise needs the correction in Answer E.
Below are the pitfalls **specific to this phase that are not in that document.**

### Pitfall N1: The service worker makes "online" a lie

**What goes wrong:** the attendee fetch resolves from a 24-hour-old service-worker
cache while `navigator.onLine` is `true`, and `cacheAttendees` writes the stale
list over the good one.
**Why it happens:** `src/app/sw.ts:23` adopts `defaultCache` wholesale.
`@serwist/next` 9.5.6 includes a `NetworkFirst` rule for **every** same-origin
`GET /api/*` — `cacheName: "apis"`, `maxEntries: 16`, `maxAgeSeconds: 86400`,
`networkTimeoutSeconds: 10` (source: `node_modules/@serwist/next/dist/index.worker.js`).
`maxEntries: 16` is shared across all API GETs, so the attendee list can also be
evicted at any moment.
**How to avoid:** put `/api/tickets/attendance`, `/api/membership/list` and
`/api/membership/verify` on `NetworkOnly` **before** any other work in this phase —
the offline design assumes the cache is IndexedDB, not Cache Storage, and two
caches with different lifetimes is the bug. `defaultCache` already treats
`/api/auth/*` this way, so the pattern is in the library.
**Warning signs:** an attendee who bought this afternoon is "not on the list" while
the pill says Online. A ten-second pause before a scan resolves.

### Pitfall N2: The defect cannot be reproduced in `npm run dev`

**What goes wrong:** the fix is verified locally, ships, and the door behaves
exactly as before.
**Why it happens:** `next.config.ts:9` — `disable: process.env.NODE_ENV === "development"`.
No service worker in dev means no `"apis"` cache, no stale response, no
`reloadOnOnline`, no offline navigation.
**How to avoid:** every manual step in `## Validation Architecture` runs against
`npm run build && npm run start`, or against a preview deployment. Write it into
the step, not into a footnote.
**Warning signs:** a verification note that says "tested locally with the network
off" and nothing about the build mode.

### Pitfall N3: `reloadOnOnline: true` reloads the scanner at the worst moment

**What goes wrong:** the signal returns, the page reloads, the camera stream is
torn down, the selected party and the in-memory `scanHistory` (the undo list,
`ScannerClient.tsx:94, 304`) are gone — with a queue in front of the operator.
**Why it happens:** `next.config.ts:7` — a sensible default for a marketing PWA,
never re-decided against a device that is deliberately offline.
**How to avoid:** the queue survives (IndexedDB) but the *undo affordance* does
not, and undo is the door's only correction mechanism. Gate the reload on
scanner-inactive **and** pending-count-zero, or drop it. This overlaps milestone
Pitfall 13, which assigns the setting to the design phase — but the door
consequence lands **here**, because this phase is the one that makes the queue
meaningful.
**Warning signs:** the scanner returning to the party-selection screen by itself.

### Pitfall N4: The event-level ticket that can never be scanned

**What goes wrong:** a holder of an event-level ticket (`tickets.party_id IS NULL`,
explicitly supported by `tickets_event_user_master_unique`,
`20260226300000_multi_sub_events.sql:66-68`) is refused at the door.
**Why it happens:** `attendance/route.ts:73` selects tickets with
`.eq("party_id", party.id)`, so an event-level ticket never reaches the cache and
never appears in the list; and online, `checkin/route.ts:63` compares
`ticket.party_id !== partyId` where `ticket.party_id` is `NULL`, producing
`wrong_event`.
**How to avoid:** decide whether event-level tickets exist in practice. If they
do, the attendee query becomes `party_id = X OR (party_id IS NULL AND event_id = Y)`
and the cross-party check must treat NULL as "valid for every party of this event".
If they do not, say so and consider a constraint. Either way this is a **false
refusal**, which the asymmetry forbids, and it is one line from the same route
FIX-04 rewrites. **[NEEDS CONFIRMATION]**
**Warning signs:** "Ticket for …" shown for a ticket whose party is blank.

### Pitfall N5: A guest-list conflict cannot say who or when

**What goes wrong:** the `already_recorded` outcome is required to carry who
recorded it and when. For a guest-list entry there is no such data:
`guest_list_entries` has `status` only — no `checked_in_at`, no `checked_in_by`
(`20260310000000_guest_list.sql:44-59`) — which is why `attendance/route.ts:129`
hard-codes `checkedInAt: null`.
**How to avoid:** either add the two columns in this phase's migration (small, and
it also makes the undo path recordable), or accept a weaker third outcome for
guest-list entries and say so **at the door**, in the flash, rather than showing an
empty time. Do not show a blank where a fact is promised.
**Warning signs:** "Already checked in ·" with nothing after the separator.

### Pitfall N6: Undo erases the evidence the review list needs

**What goes wrong:** `checkin/undo/route.ts:82-86` sets `checked_in = false`,
`checked_in_at = null`, `checked_in_by = null`. The record of *who admitted this
person* is destroyed, and nothing anywhere records who performed the undo.
**Why it happens:** undo was built as a state reversal, not as an event.
**How to avoid:** an undo is a `door_scan_events` row like any other, with its own
operator. `checkin-offline.md` already requires it — *«Ogni undo va registrato con
chi lo ha fatto e quando: e' il percorso piu' semplice per far rientrare
qualcuno»* — and FIX-13's "any consequence for a member is a human decision, taken
and recorded as such" needs the same record. Phase 35 (ASSIGN-05) will add *who
may* undo; **who did** belongs here, because the review list is unreadable without
it.
**Warning signs:** a review list whose entry count and door count disagree with no
explanation.

### Pitfall N7: The double read that must be counted but not shown

**What goes wrong:** FIX-11 asks for a count of something deliberately hidden, and
the obvious implementation — filter it out at write time — destroys the count.
**Why it happens:** "deduplicated" reads like "discarded".
**How to avoid:** always write the `door_scan_events` row; classify it
`double_read`; exclude that cause from the **list** and include it in the
**counter**. The requirement says why: "a rising count means the scanner's feedback
is not visible at the door and that is a defect to correct, not to filter away."
The counter is a signal about the *hardware and the light*, not about the guest.
**Warning signs:** a review list with a suspiciously round zero and no counter
beside it.

---

## Code Examples

### The three outcomes, produced once

```ts
// src/lib/door/outcome.ts  (new — imported by route, scanner and sync manager)
export const DOOR_HTTP = {
  recorded: 200,
  already_recorded: 409,   // RFC 9110 §15.5.10 — conflict with current state
  not_valid: 422,          // RFC 9110 §15.5.21 — understood, not processable
} as const;

export type DoorOutcome =
  | { outcome: "recorded"; subject: DoorSubject; at: string;
      flags?: Array<"refunded_before_night" | "not_in_cache"> }
  | { outcome: "already_recorded"; subject: DoorSubject; at: string;
      by: { operatorId: string; operatorLabel: string } }
  | { outcome: "not_valid";
      reason: "invalid_signature" | "unknown_code" | "wrong_night" | "no_party_selected" };
```

```ts
// src/app/api/tickets/checkin/route.ts — the conflict branch, replacing :101-108
const body: DoorOutcome = {
  outcome: "already_recorded",
  subject: { type: "ticket", id: ticket.id },
  at: ticket.checked_in_at!,
  by: { operatorId: ticket.checked_in_by!, operatorLabel },
};
// FIX-03: the conflict is persisted BEFORE the response, so the sync manager
// may safely drop the queue entry when it sees a 409.
await serviceClient.from("door_scan_events").insert({ /* … outcome: "already_recorded" … */ });
return NextResponse.json(body, { status: DOOR_HTTP.already_recorded });
```

### The sync manager, switching on the body

```ts
// src/lib/offline/sync-manager.ts — replacing the res.ok test at :36
const res  = await fetch("/api/tickets/checkin", { /* … token, partyId, scannedAt, deviceId … */ });
const data = (await res.json()) as DoorOutcome | { error: string };

if (res.status === 401 || res.status === 403) { await markBlocked(entry.key); continue; }
if (res.status === 429 || res.status >= 500)  { await bumpAttempts(entry.key); continue; }

if ("outcome" in data) {
  switch (data.outcome) {
    case "recorded":
    case "already_recorded":        // FIX-03: recorded server-side, safe to drop
      await markSynced(entry.key); synced++; break;
    case "not_valid":               // FIX-08: permanent — never retried, never lost
      await markFailed(entry.key, data.reason); break;
  }
} else {
  await markFailed(entry.key, "unexpected_response");
}
```

### The merge that replaces clear-and-replace

```ts
// src/lib/offline/checkin-store.ts — replacing cacheAttendees :84-130
export async function mergeAttendees(partyId: string, rows: AttendeeRow[]): Promise<MergeResult> {
  const db = await getDB();
  const cached  = await db.countFromIndex("attendees", "by-party", partyId);
  const pending = await db.count("pendingCheckins");

  // FIX-06: never let a stale or partial payload shrink the cache.
  if (rows.length === 0 && cached > 0)          return { applied: false, reason: "empty_payload" };
  if (pending > 0 && rows.length < cached)      return { applied: false, reason: "payload_smaller_than_cache" };

  const tx = db.transaction(["attendees", "pendingCheckins"], "readwrite");
  for (const r of rows) {
    const key   = attendeeKey(partyId, r.subjectType, r.subjectId);  // one helper, two call sites
    const local = await tx.objectStore("attendees").get(key);
    const isPending = !!(await tx.objectStore("pendingCheckins").get(key));
    await tx.objectStore("attendees").put({
      ...local, ...identityFieldsFrom(r), key, partyId, lastSeenAt: new Date().toISOString(),
      // FIX-05: local-true is monotone until it syncs.
      checkedIn:   local?.checkedIn && isPending ? true              : r.checkedIn,
      checkedInAt: local?.checkedIn && isPending ? local.checkedInAt : r.checkedInAt ?? undefined,
      checkedInBy: local?.checkedIn && isPending ? local.checkedInBy : r.checkedInBy ?? undefined,
      refundedAt:  r.refundedAt ?? undefined,   // FIX-09
    });
  }
  // Rows absent from the payload are LEFT ALONE. Pruning happens at party switch only.
  await tx.done;                                 // only IDB promises awaited — idb's transaction rule
  return { applied: true };
}
```

`{ applied: false }` must reach the operator's screen. `checkin-offline.md`:
*«ogni percorso di errore del check-in deve mostrarsi allo staff sul posto —
l'unico osservatore che esiste davvero.»*

### The lossless IndexedDB rekey

```ts
// src/lib/offline/checkin-store.ts — DB_VERSION 2 → 3
upgrade(db, oldVersion, _newVersion, tx) {
  if (oldVersion < 3) {
    // keyPath cannot be changed in place: create, copy, then delete.
    const a2 = db.createObjectStore("attendeesV3", { keyPath: "key" });
    a2.createIndex("by-party",   "partyId");
    a2.createIndex("by-subject", "subjectId");
    const p2 = db.createObjectStore("pendingV3", { keyPath: "key" });

    if (db.objectStoreNames.contains("attendees")) {
      // Both legacy values already carry partyId — the rekey loses nothing.
      tx.objectStore("attendees").getAll().then((old) => { for (const v of old) a2.put(rekeyAttendee(v)); });
    }
    if (db.objectStoreNames.contains("pendingCheckins")) {
      tx.objectStore("pendingCheckins").getAll().then((old) => { for (const v of old) p2.put(rekeyPending(v)); });
    }
    // Delete only after the copies are queued in the same versionchange transaction,
    // which rolls back as a unit if anything fails (W3C IndexedDB, transaction abort).
  }
}
```

### Before or after the night

```ts
import { partyStartInstant } from "@/utils/datetime";   // never new Date(`${d}T${t}`)

const nightStart = partyStartInstant(party.date, party.time);          // Europe/Rome
const cause = new Date(refund.refunded_at) < nightStart
  ? "refunded_before_night"     // FIX-09 → the night's review list
  : "refunded_after_night";     // FIX-09 → finance, never a door conflict
```

---

## State of the Art

| Old approach (in this repo today) | Current approach | Impact |
|---|---|---|
| Failure in the JSON body, success in the HTTP status | one discriminated union, matching status | The sync manager can classify without parsing; the type checker catches divergence at `next build` |
| Clear-and-replace cache refresh | merge with a monotone local-true rule | FIX-05 and FIX-06 collapse into one change, and Phase 38's push channel becomes safe to switch on |
| `offlineSync` bypasses HMAC verification | the queue carries the full signed token | FIX-10, at zero offline cost — the token is already in hand at scan time |
| Refund = delete the ticket row | the refund survives its ticket | Makes FIX-09 possible **and** repairs the finance figures that silently under-report |
| Pending count rendered only while offline | pending / failed / blocked, always visible | Without this FIX-08's classification is invisible; with no error tracking, that pill is the only observer |
| `defaultCache` adopted wholesale | `/api/*` chosen per route | `nextjs-architecture.md`: *«la cache va scelta per rotta, non ereditata»* |

**Deprecated / outdated by this phase:**

- `already_by_you` (`checkin/route.ts:96`) — produced, read by nothing, and contrary to FIX-04a. Remove it rather than wiring it up.
- The `offlineSync && directTicketId` branch (`checkin/route.ts:34-36`).
- `cacheAttendees` and `clearPartyCache` in their current form (`checkin-store.ts:84, 214`). Note `clearPartyCache` has **no caller** in `src/` — verify before deleting.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | The `ON DELETE CASCADE` on `ticket_refunds.ticket_id` really destroys the refund row when the ticket is deleted | Answer E | Read from the DDL, not executed. If Postgres behaves otherwise the audit trail exists and Option B shrinks further. **Confirm with one refund on a non-production project.** |
| A2 | Deleting a ticket referenced by `guest_list_entries.ticket_id` raises a FK violation that `refund-actions.ts:139` swallows | Answer E, N5 | Same caveat. If wrong, guest-list refunds behave like paid ones and one branch of the fix disappears |
| A3 | A double bill (a tramonto plus the night) is modelled as **one event with two parties** | Answer D | If it is two events, `attendances`' `unique(event_id, user_id)` never collides and the classifier rule is unnecessary. If it is one event, every double bill produces a false conflict tonight. **[NEEDS CONFIRMATION]** |
| A4 | Event-level tickets (`party_id IS NULL`) are actually issued in practice | Pitfall N4 | If never issued, N4 is theoretical. If issued, it is a live false refusal |
| A5 | Restricting the technical detail to a master is an affordance, not a boundary — organizers can already read profiles | Answer A | If the intent is a real boundary, `profiles_select_admin` must narrow first, which is Phase 32/35 work, not this phase |
| A6 | `409` for `already_recorded` and `422` for `not_valid` are the right codes | Answer B | Conventional readings of RFC 9110; the body is authoritative either way, so a different choice costs nothing but must be made once |
| A7 | Adding `checked_in_at` / `checked_in_by` to `guest_list_entries` is acceptable in this phase | Pitfall N5 | If deferred, the third outcome is weaker for guest-list entries and the door must say so |
| A8 | Option B (persist the refund evidence) is preferred over Option A (soft-invalidate) | Answer E | If the owner prefers A, the phase grows by a 22-file sweep and needs re-scoping — this is the single biggest branch point in the plan |

---

## Open Questions (RESOLVED 2026-08-05)

> All six were closed during the planning run, before the planner was spawned.
> Questions 1–3 were answered by the project owner; 2 and 3 were then **verified
> against the code** rather than taken on trust, and that verification found a
> defect no requirement had named (an Event Pass is refused at the door). Questions
> 4–6 were settled by adopting the recommendation below. Each resolution is recorded
> inline. Nothing in this section is still open.

1. **Option A or Option B for the refunded ticket?** *(blocking — it changes the phase's size)*
   - Known: all three refund paths delete the ticket; the cascade destroys the audit row; 63 `from("tickets")` call sites across 22 files.
   - Unclear: whether the owner wants the ticket lifecycle restructured now.
   - Recommendation: **Option B now, Option A deferred.** It is Critical (money **and** the door), so `CLAUDE.md`'s *misura due volte* applies.
   - **RESOLVED — the owner chose Option B.** Option A is recorded as deferred *by decision*, not by omission: the 22-file sweep is not attempted in this phase, and no plan may drift into it partially.

2. **Is a double bill one event or two?**
   - Known: `attendances` is unique per `(event_id, user_id)`.
   - Unclear: the modelling choice in practice.
   - Recommendation: answer before the composite-key work, because the classifier rule depends on it.
   - **RESOLVED — one event with two parties.** Verified against the schema: `supabase/schema.sql:232-238` defines `attendances` as `unique(event_id, user_id)` with **no `party_id` column at all**, and no migration ever added one. A member checking in at both parties therefore collides server-side, not merely in the offline queue. FIX-07 is unsatisfiable until `attendances` distinguishes the party. Planned in `31-04`.

3. **Do event-level tickets exist?** *(see A4)* — a one-line answer that decides whether N4 is a fix or a note.
   - **RESOLVED — they exist, and it is a fix, not a note.** A buyer takes a single party or the whole event. Verified: `20260226300000_multi_sub_events.sql:54` makes `tickets.party_id` nullable and `:65` adds `tickets_event_user_master_unique`; `src/app/(public)/events/[slug]/page.tsx:275-282` sells the event-level tiers; `src/app/api/tickets/[id]/wallet/route.ts:66` labels them "Event Pass". **The door refuses them today:** `src/app/api/tickets/checkin/route.ts:63` tests `ticket.party_id !== partyId`, which is always true for `NULL`, yielding `wrong_event`. The correct analog is already in this repo at `src/app/api/tickets/attendance/route.ts:120`. Both sides need it — `attendance/route.ts:73` filters `.eq("party_id", party.id)`, so an Event Pass never reaches the offline cache either. Planned in `31-06` and `31-07`.

4. **Where does the review list live?**
   - Known: the organizer tree already has `events/[id]/{sales,tickets,guest-list,analytics}`; Phase 34 collapses the duplicated trees.
   - Recommendation: put it under the **organizer** tree beside the other per-event surfaces and let Phase 34 move it with everything else. Do not create a new top-level address that Phase 34 will have to redirect.
   - **RESOLVED — organizer tree, recommendation adopted.** Planned in `31-12`.

5. **One release or two for the outcome contract?**
   - Known: `skipWaiting: true` + `clientsClaim: true` means a staff device can run the old bundle against the new API for one session.
   - Recommendation: make the response additive for one release (keep the legacy fields alongside `outcome`), or update the door device before the night and write it in the runbook. Decide explicitly — do not leave it to chance on a night.
   - **RESOLVED — additive for one release.** The legacy response fields stay alongside `outcome`. A hard cutover was rejected: `skipWaiting: true` + `clientsClaim: true` means a staff phone can run the old bundle against the new API for one session, and that session is a night at the door.

6. **Does the review list need a notification path?**
   - Known: FIX-11 says it "raises no notification and asks for no action". There is no error tracking (OBS-01, deferred).
   - Recommendation: none this phase. The requirement is explicit, and adding one would contradict it.
   - **RESOLVED — no notification path.** FIX-11 states the list raises no notification and asks for no action; adding one would contradict the requirement it is meant to satisfy.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node + npm | build, typecheck | ✓ | per `package.json` engines (unpinned) | — |
| `npm run build` | G2 — the only automatic gate | ✓ | Next 16.1.6 | none, and none needed |
| `npm run verify:persona` | only if `CLAUDE.md` / `.claude/**` change | ✓ | `scripts/verify-persona.mjs` | — |
| Supabase CLI (`supabase db push`) | applying the new migration | **✗ not verified** | — | Apply the SQL through the Supabase dashboard; the repo already carries 32 migrations applied by some means |
| A real phone with a camera | every door verification step | assumed available | — | **none.** Desktop DevTools offline mode does not exercise the camera, the haptics, or the installed service worker |
| A production build (`npm run build && npm run start`) or a preview deploy | any step touching the service worker or the offline path | ✓ | — | **none.** The SW is disabled in dev (`next.config.ts:9`) |
| A second device/session | the two-devices conflict case (FIX-11) | assumed available | — | A second browser profile signed in as a second staff account reproduces `operator_id` differing; it does **not** reproduce `device_id` differing unless the device id is per-install |
| Error tracking | observing a failed sync unattended | **✗ none exists** | — | Every failure must have an on-screen effect. This is a design constraint, not a gap to fill (OBS-01 deferred) |
| Test runner | — | **✗ none exists** | — | See `## Validation Architecture` |

**Missing with no fallback:** none that block the phase.
**Missing with a fallback:** the Supabase CLI (dashboard); a second device (second profile, partially).

---

## Validation Architecture

> **There is no test runner for the product.** `package.json` has no `test` script
> and the repository contains no `*.test.*` / `*.spec.*` file — verified 2026-08-05.
> Nothing below is a test command, and no requirement in this phase may be called
> verified because "tests pass." Each requirement is proved by exactly one of three
> kinds of evidence, named explicitly:
>
> - **`file:line`** — a static assertion someone can re-check by opening the file
> - **observable** — a behaviour visible on screen, in the data, or in the response
> - **manual** — a written procedure with the role, the device, the network state and what must be seen
>
> `npm run verify:persona` is **not** applicable unless `CLAUDE.md` or `.claude/**`
> is edited, and it verifies the persona's coherence, never the product's correctness.

### Test framework

| Property | Value |
|---|---|
| Framework | **none** |
| Config file | none |
| Quick run command | `npm run build` — the Next typecheck, and the only automatic gate |
| Full suite command | `npm run build` + the manual procedures below, executed and written into `31-VERIFICATION.md` |

### If a runner were introduced (not proposed for this phase)

It would need: a DOM-less IndexedDB (`fake-indexeddb`) to cover the merge and the
rekey; a fetch stub to cover the four sync buckets; and it would still not cover
the camera, the haptics, the service worker or the dark venue. Introducing it here
would make the phase about tooling. Recorded, not recommended.

### Requirement → evidence map

| Req | Behaviour | Evidence kind | Concrete step / assertion |
|---|---|---|---|
| FIX-01 | Inbound `x-user-*` never reaches server code | **file:line** | `src/lib/supabase/middleware.ts:131-133` deletes all three **before** `:136-138` sets them. Plus **observable**: `curl -H "x-user-role: master" <deployment>/` returns the anonymous page |
| FIX-02 | Second "serve" fails distinctly | **file:line** + **manual** | `organizer/events/actions.ts:1189-1199` and `menu/actions.ts:305-315` throw on `applied === false`. Manual: as an organizer, press Serve twice on one token — the second shows "This token has already been served" and the token count does not move |
| FIX-03 | A genuine duplicate survives sync | **manual** (two devices, network off) | Two staff sessions, both offline, scan the same ticket. Reconnect both. **Expected:** one `door_scan_events` row with `outcome = 'already_recorded'`, the queue entry removed only after that row exists, and the night's review list shows one `two_devices` entry |
| FIX-04 | Three outcomes, identical on and off | **manual** (production build, network on then off) | Six scans — valid / repeat / unknown — once online, once with the radio off. **Expected:** three screens, the same three, in the same order, and the repeat shows a time and an operator both times |
| FIX-04a | The third outcome states a fact | **observable** + **file:line** | The amber flash reads "Recorded at HH:MM by ⟨role label⟩" and contains no cause word. Assert `cause` is `NULL` on the row the scanner produced |
| FIX-05 | An unsynced check-in survives a refresh | **manual** (network off, then a refresh) | Offline check-in; force a refresh with the queue non-empty. **Expected:** still shown as arrived, still one pending entry, `checkedInAt` unchanged |
| FIX-06 | The cache is never empty during a refresh | **manual** + **observable** | Throttle to 3G, let the `"apis"` cache serve a stale payload, refresh. **Expected:** the guard refuses, the count does not drop, and the screen says the list was not refreshed. Second check: DevTools → Application → IndexedDB, row count never reaches 0 |
| FIX-07 | Same person, two parties, one device | **manual** (network off) | Offline, check the same membership code in at two parties. **Expected:** `pendingCheckins` holds **two** rows with distinct keys — read them in DevTools and record both keys in `VERIFICATION.md` |
| FIX-08 | A permanent failure is recorded as failed | **manual** + **observable** | Queue a scan for a deleted member, reconnect. **Expected:** it leaves `pending`, appears once under "could not be recorded" with its reason, and is never retried. Separately: expire the session and reconnect → `blocked`, with a sign-in prompt, queue intact |
| FIX-09 | Refunded ticket admitted and flagged | **manual** ×2 + **observable** | (a) Refund before the night, scan online → **admitted**, amber, review-list entry `refunded_before_night`. (b) Same with the radio off → admitted, flagged on sync. (c) Refund after the night's start → **no** review-list entry; the finance surface shows it |
| FIX-10 | The queued scan carries the signed token | **file:line** + **manual** | The `offlineSync && directTicketId` branch is **gone** from `checkin/route.ts` (assert by grep). Manual: offline scan, inspect `pendingCheckins` in DevTools — the record holds a `uuid.64-hex` token, not a bare id. Negative: `POST /api/tickets/checkin {"ticketId":"…","offlineSync":true}` as an organizer now returns `not_valid` |
| FIX-11 | The review list, classified | **manual** (four seeded cases) + **observable** | Produce all four on one night: double read (same operator, same device, seconds apart), a second unused ticket for the same holder, two devices minutes apart, an invalid signature. **Expected:** three rows, the double read absent from the list **and present in the counter**, and the invalid signature also surfaced at the door when the network returns |
| FIX-11 | Empty on a normal night | **observable** | A night with no conflicts: the list renders its designed empty state, no badge, no notification |
| FIX-12 | Prose for the supervisor, identifiers for a master | **observable** + **file:line** | The technical view's copied text contains no `@` and no full name — check by pasting into a plain editor. Assert `door_scan_events` has no name/email column (schema read) |
| FIX-13 | No automatic label on a member | **file:line (negative)** | `grep -rn 'from("profiles")' ` over the files this phase adds or changes returns **zero writes**. Assert the review list carries no per-member aggregate. Record the grep and its output in `VERIFICATION.md` |

### Sampling rate

- **Per task commit:** `npm run build` — the typecheck must pass before the commit.
- **Per plan merge:** `npm run build` + every **file:line** assertion for that plan's requirements, re-read and quoted.
- **Phase gate, before `/gsd:verify-work`:** every **manual** row above executed **against a production build or a preview deployment** (never `npm run dev` — Pitfall N2), on a phone, including at least one full pass with the radio physically off, and the results written into `31-VERIFICATION.md` with `file:line` citations. A `VERIFICATION.md` without a single `file:line` does not satisfy the gate.

### Wave 0 gaps

- [ ] `src/lib/door/outcome.ts` — the shared union. Nothing else can be written against a contract that does not exist yet.
- [ ] The migration for `door_scan_events` (+ RLS in the same file) and the refund-evidence columns — everything server-side depends on it.
- [ ] `src/types/database.ts` — the matching interfaces, same commit as the migration (`supabase-data.md`).
- [ ] The service-worker `/api/*` override in `src/app/sw.ts` — **first**, because until it lands every offline verification is measuring the wrong cache (Pitfall N1).
- [ ] A stable `deviceId` written once into IndexedDB — `door_scan_events.device_id` is NOT NULL and FIX-11's `two_devices` classification is impossible without it.
- [ ] A written door runbook for the verification night — devices, accounts, what to do if the scanner fails entirely, who decides (`checkin-offline.md`, gate *la serata ha un runbook*).

---

## Security Domain

`security_enforcement` is not set in `.planning/config.json`, so it is enabled.

### Applicable ASVS categories

| Category | Applies | Standard control here |
|---|---|---|
| **V2 Authentication** | yes | Session via `@supabase/ssr`. Unchanged by this phase, except that a 401 during sync becomes an explicit `blocked` state rather than a silent retry loop |
| **V3 Session Management** | yes | The queue must survive an expired session without losing entries (Answer F) |
| **V4 Access Control** | **yes — the central one** | RLS on `door_scan_events` in the same migration (G3). `(SELECT public.is_admin_or_organizer())`. The service client (`src/lib/supabase/service.ts`) bypasses RLS entirely and is already used on the check-in path — `access-gating.md` requires a written justification per new call site |
| **V5 Input Validation** | yes | `partyId`, `token`, `deviceId`, `scannedAt` arrive from a client. Today `checkin/route.ts:30` destructures an untyped body. No validation library exists in the repo; validate explicitly (UUID shape, token regex, ISO timestamp) rather than adding a dependency for this alone |
| **V6 Cryptography** | yes | HMAC-SHA256 + `timingSafeEqual` (`src/utils/qr.ts`) — correct, unchanged, and **never** hand-rolled. `token_fingerprint` uses `crypto.createHash("sha256")`. `Math.random()` at `:49` remains a known deferred defect (QR-01) — do not silently fix, do not silently ignore |
| **V7 Error Handling / Logging** | yes | Every new error path needs a distinct category **and an on-screen effect**. No error tracking exists |
| **V8 Data Protection** | yes | `door_scan_events` stores identifiers only (FIX-12). The `"apis"` Cache Storage bucket currently holds the full member roster for 24 h on staff devices — Pitfall N1 removes it |

### Known threat patterns for this stack

| Pattern | STRIDE | Standard mitigation | Status here |
|---|---|---|---|
| Forged identity header | Spoofing | resolve identity from the session, never a header | **Fixed** — `middleware.ts:131-133` (FIX-01) |
| Unsigned identifier accepted as proof | Spoofing | verify the signature on every path | **This phase** — FIX-10 removes the `offlineSync` bypass |
| Conflict evidence destroyed on sync | Repudiation | persist before acknowledging | **This phase** — FIX-03; write the row, then return 409 |
| Attendance record altered with no attribution | Repudiation | append-only event log, undo is an event | **This phase** — `door_scan_events`; Pitfall N6 |
| Service client reachable from untrusted input | Elevation of privilege | justify each call site; validate before reaching it | **Partly** — the body-supplied `ticketId` path is removed by FIX-10; the broader sweep is Phase 32/33 |
| Unauthenticated valid/not-valid oracle | Information disclosure | rate limiting | **Open** — `GET /api/membership/verify` is unauthenticated (`route.ts:6-31`) and, until Pitfall N1 is fixed, also cached by the service worker. RATE-01, deferred |
| PII at rest on a staff device | Information disclosure | do not cache what the app already stores | **This phase** — the `/api/*` cache override |
| Guessable access-granting code | Spoofing | CSPRNG | **Open, deferred** — QR-01, `src/utils/qr.ts:49` |
| Cross-night data leakage in the cache | Information disclosure | scope keys by party; prune at party switch | **This phase** — the composite key |

---

## Sources

### Primary (HIGH confidence)

**Read from the current tree, 2026-08-05** — every claim above cites `file:line`:
- `src/lib/offline/checkin-store.ts`, `src/lib/offline/sync-manager.ts`
- `src/app/api/tickets/checkin/route.ts`, `.../checkin/undo/route.ts`, `.../attendance/route.ts`
- `src/app/api/membership/verify/route.ts`, `.../membership/list/route.ts`
- `src/app/(admin)/admin/scanner/ScannerClient.tsx`, `src/components/scanner/ScanFlash.tsx`
- `src/utils/qr.ts`, `src/utils/datetime.ts`, `src/lib/supabase/middleware.ts`
- `src/app/(public)/tickets/refund-actions.ts`, `src/app/(admin)/admin/finance/actions.ts`, `src/app/api/cron/reconcile-refunds/route.ts`, `src/lib/analytics/event-queries.ts`
- `supabase/schema.sql`; migrations `20260224_rbac_migration.sql`, `20260225150000_party_architecture.sql`, `20260226300000_multi_sub_events.sql`, `20260227200000_ticket_refunds.sql`, `20260228200000_ticket_checkin.sql`, `20260310000000_guest_list.sql`, `20260508000000_drink_token_active_state.sql`
- `package.json`, `next.config.ts`, `src/app/sw.ts`, `.planning/config.json`
- `node_modules/@serwist/next/dist/index.worker.js` — the installed 9.5.6 `defaultCache` rules, read directly rather than from documentation

**External, official:**
- W3C IndexedDB — https://www.w3.org/TR/IndexedDB/ — transaction abort rolls back; read/write transactions with overlapping scopes are serialised (both quoted verbatim in Answer D)
- `idb` official README — https://github.com/jakearchibald/idb — the transaction-lifetime rule, and that the upgrade transaction can read other stores
- RFC 9110 §15.5.10 (409) and §15.5.21 (422) — conventional readings, not load-bearing (see A6)

### Secondary (MEDIUM confidence)

- `.planning/research/PITFALLS.md` (2026-08-05) — pitfalls 1–7, 11, 12 re-verified against the current tree today and still true; pitfall 12's premise corrected in Answer E
- `.planning/research/ARCHITECTURE.md` (2026-08-05) — repo-state facts, spot-checked
- The two DDL-derived behaviours marked **[MEDIUM]** in Answer E (A1, A2): unambiguous in the migration text, not executed against a database

### Not used

- `.planning/codebase/` — dated *2026-02-24*, three milestones stale (G4, and `ai-engineering.md`'s *Gate documentazione datata*)

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| Current defect state | **HIGH** | Every claim read from the tree today with a `file:line`; FIX-01 and FIX-02 re-verified as genuinely applied |
| The outcome contract (Answers B, C) | **HIGH** | Derived from the requirements plus the code, with no external dependency |
| IndexedDB keying and merge (Answer D) | **HIGH** | Spec and official README quoted; the rekey is lossless because both legacy values already carry `partyId` |
| Service-worker API caching (Pitfall N1) | **HIGH** | Read from the installed package source, not from documentation |
| The refunded-ticket finding (Answer E) | **MEDIUM-HIGH** | The code paths and the DDL are unambiguous; the cascade and the FK violation were not executed. Two items flagged **[MEDIUM]** |
| The review-list schema (Answer A) | **MEDIUM** | A design proposal, not a discovered fact. It satisfies FIX-11/12/13 as written; column names and the classification set are open to revision at plan time |
| Option A vs Option B | **MEDIUM** | A judgement, with the numbers behind it stated (63 call sites, 22 files) so it can be overruled on the evidence |

**Research date:** 2026-08-05
**Valid until:** 2026-09-04 (30 days) — but **invalid immediately** if `@serwist/next`, `idb` or `next` are upgraded, or if any refund is processed against production, since that changes the data this document reasons about.
