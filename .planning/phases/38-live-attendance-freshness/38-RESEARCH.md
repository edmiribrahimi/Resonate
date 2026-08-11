# Phase 38: Live Attendance Freshness - Research

**Researched:** 2026-08-11
**Domain:** Supabase Realtime (Broadcast + Realtime Authorization), Next.js 16 / React 19 client lifecycle, iOS home-screen PWA resume behaviour
**Confidence:** HIGH on the mechanism and its authorisation (verified against current Supabase docs *and* against this project's own production database); MEDIUM on iOS PWA resume ordering (verified per-event from MDN BCD, not measured on the target device)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**What travels on the channel**

- **D-38-01: the channel carries the fact, not the row.** A message says "this
  night's attendee list changed"; the device then reloads from
  `/api/tickets/attendance`, the endpoint it already uses. No name, no email, no
  refund detail ever travels on the channel.

  **Why this and not `postgres_changes` on the underlying tables:** that endpoint
  is not a `select`. It composes the payload from tickets, guest-list entries,
  profiles and refunds through the **service client**, and it *redacts* — the
  email never leaves (`attendance/route.ts:259`, `hasEmail` is a boolean and
  stays one), and a refunded ticket sometimes deliberately names nobody
  (`attendance/route.ts:355`). A raw row subscription would deliver
  `guest_list_entries.first_name`, `last_name` and `email` to the client and
  would require that redaction to be written a **second time, in a second
  place**. Two copies of a redaction diverge; PII that has left a channel does
  not come back. Same shape of reasoning as `venue-secrecy.md`: monotone, so the
  rule sits before the send.

- **D-38-02: the reload after a message is the same call the scanner already
  makes.** One fetch site, not a second one — the existing
  `fetchAttendance` path, with its existing refusal handling
  (`mergeAttendees` refusals surfaced as notices, `ScannerClient.tsx:791-807`).
  A second fetch site would be a second place where a merge refusal can be
  silently dropped, which is exactly the defect FIX-06 closed.

**Authorisation of the channel**

- **D-38-03: the server decides who may listen, not the device.** Subscription
  to a night's channel is refused server-side for anyone not assigned to that
  night (LIVE-06). A client-side filter over a channel everyone can join is the
  middleware pretending to be RLS — the error this project has already
  catalogued (`CLAUDE.md`, Operating Principle 2).

- **D-38-04: a refused channel produces no second verdict on the role.** The
  door already resolves who you are when it opens and caches that verdict
  (`cacheDoorAuth`, `ScannerClient.tsx:752`). A channel that will not open
  behaves as **"not listening"** — never as "you are not authorised for this
  night". One place decides the role, and it is not this one. Consistent with
  the phase-37 decision that `re_hide_requires_master` is decided by the SQL
  function alone.

- **D-38-05: one night at a time.** The channel follows the selected party and
  closes when the party changes or the surface unmounts. A channel left open on
  a finished night listens for nothing.

**Reloads underneath the channel**

- **D-38-06: reconnection means the network came back *or* the app came back to
  the foreground.** The door's phone goes in a pocket and the screen sleeps: the
  channel dies there, and the browser's `online` event never fires because the
  network never went away. Listening only to `online`
  (`ScannerClient.tsx:531-535`) would leave the commonest death undetected.
  Every such reconnection triggers a **full reload** (LIVE-03) — the channel
  does not replay what happened while it was down.

- **D-38-07: safety reload every 5 minutes** (LIVE-04). This is not polling by
  another name: the list already reloads after every scan
  (`ScannerClient.tsx:895`) and on every reconnection. This is the parachute for
  a channel that died without saying so.

- **D-38-08: the channel never stands between a scan and its verdict**
  (LIVE-02). If a message lands while the camera is reading a code, the reload
  waits for the verdict. The verdict comes from the local cache always, channel
  or no channel.

**What the door sees**

- **D-38-09: quiet when healthy, a band when stale.** No banner in the normal
  case. When the channel is down *or* the list is older than **5 minutes** — the
  point at which the safety reload has itself already failed — a band appears:
  "this list is N minutes old — tap to reload". The manual reload lives **inside
  that band**, one large target, in the place the eye is already reading.

- **D-38-10: freshness and manual reload also live on the counter row, always.**
  The `12 / 40` row with the progress bar (`ScannerClient.tsx:2317`) gains
  "updated 12s ago", and that row **is** the reload control. This is what
  satisfies the half of LIVE-05 that a silent screen cannot: *see whether the
  list is live and how fresh it is*, and *force a reload by hand **at any
  moment***.

  **Recorded because it was a live disagreement:** the owner first chose silence
  plus a band-only button. That combination restricts LIVE-05 — a clean screen is
  indistinguishable from a screen that has not yet noticed, which is the
  newsletter-form silent failure moved to the door. The conflict was raised
  before writing, and the resolution keeps the quiet screen (no new element) while
  restoring both halves of the requirement.

- **D-38-11: no error tracking exists, so this indicator is the observability.**
  `package.json` has no monitoring dependency. A dead channel reaches a human
  only through the door's own screen. This is why LIVE-05 is not cosmetic and why
  the band must be reachable one-handed, in the dark, without moving the camera
  (`nextjs-architecture.md`, gate accessibilità al buio).

**Separation of door and bar**

- **D-38-12: the door's offline mechanism stays the door's** (LIVE-07). Verified
  today: `src/lib/offline/checkin-store.ts` is imported by
  `ScannerClient.tsx` and by nothing else; the bar has no offline mechanism at
  all. The requirement here is therefore **not to generalise** — no shared
  abstraction is to be extracted from the door's store while adding the channel.
  The two surfaces run on opposite defaults (door: when in doubt admit and
  record; bar: when in doubt record nothing), and a shared mechanism would make
  one of the two defaults accidental.

### Claude's Discretion

- The concrete Supabase Realtime mechanism that satisfies D-38-01 + D-38-03 —
  a private per-night channel with server-side authorisation, carrying a
  payload-free signal — is the researcher's to determine against current
  Supabase documentation. **What is locked is the property, not the API:** the
  message carries no personal data, and a person not assigned to the night
  cannot subscribe.
- Placement, wording and exact styling of the band and of the counter-row
  timestamp, within D-38-09/D-38-10 and the dark-venue constraint.
- Whether the "updated Ns ago" ticks live or is recomputed on render.

### Deferred Ideas (OUT OF SCOPE)

- **Attendee-list view on a tablet, for whoever watches the door from inside.**
  A new surface, not a freshness change — its own phase. Note that the visual
  system phases (40-42) will touch the scanner anyway; this is not part of them
  either.
- **Freshness of the member roster.** `/api/membership/list` is refreshed only
  as a side effect of an attendance fetch (`ScannerClient.tsx:820-861`), and its
  staleness is the *other* cause of a false refusal offline — a member who
  joined recently is refused with the radio off. Real, but it is a different
  list and outside LIVE-01, which names the attendee list.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIVE-01 | While the device has network, the attendee list updates at the moment the data changes, without staff action | § Mechanism (Broadcast from the Database, private per-night topic) + § Where the Signal Is Emitted (the four triggers and the one fan-out helper) |
| LIVE-02 | The scan decision is taken from the local cache and never waits on, or is disabled by, the live connection | § The LIVE-02 Proof — the structural rules, the `isProcessingRef` deferral gate, the mechanical grep check, and the three written door procedures |
| LIVE-03 | Every reconnection triggers a full reload, because the channel does not recover what happened while it was down | § Reconnection Detection (`SUBSCRIBED` re-entry, `onHeartbeat`, `visibilitychange`, `pageshow`, `online`) |
| LIVE-04 | An infrequent safety reload runs underneath the live channel, so a channel that dies silently cannot leave a stale list | § The 5-Minute Safety Reload (re-armed from the last successful fetch, foreground only) |
| LIVE-05 | Staff can see whether the list is live and how fresh it is, and can force a refresh by hand | § Freshness Display (`performance.now()` elapsed, the counter row as the control, the band at 5 min) |
| LIVE-06 | Only a person assigned to that night can listen to that night's updates | § Authorisation — one `SELECT` policy on `realtime.messages` calling `private.has_capability('door.operate', <party>)`, the same predicate `door_scan_events_select_admin` asks |
| LIVE-07 | The door and the bar do not share an offline mechanism | § Don't Hand-Roll and § Anti-Patterns — nothing is extracted from `checkin-store.ts`; the channel code lives beside the door and imports nothing the bar could import |
</phase_requirements>

---

## Summary

The mechanism that satisfies D-38-01 and D-38-03 together is **Supabase Realtime
Broadcast on a private channel, emitted from the database with
`realtime.send()`, authorised by a single `SELECT` policy on
`realtime.messages`**. It is the only one of the candidates that gives both
properties at once: the payload is whatever the sender chooses (so it can be
empty), and the subscription is gated server-side by an RLS policy that can call
an existing SQL function. `postgres_changes` gives neither — it delivers row
data by construction, and its authorisation is the *table's* RLS, which for
`guest_list_entries` would have to be widened to the door in order to work at
all. CONTEXT.md's D-38-01 rules it out on PII grounds; this research **confirms**
that reading and adds a second, independent reason (see § Alternatives).

Two facts verified against this project's live database make the design land
cleanly rather than approximately. First, `realtime.send` wraps its insert in
`EXCEPTION WHEN OTHERS THEN RAISE WARNING` — read from `pg_proc.prosrc` in
production, not from documentation — so a trigger that emits **cannot abort the
check-in transaction it hangs off**. That removes the only serious objection to
emitting from the database rather than from six route handlers, and it is
load-bearing for LIVE-02. Second, `realtime.messages` already has RLS enabled and
**zero policies** on this project, so the surface starts closed: adding one
`SELECT` policy opens exactly one door and nothing else. The policy calls
`private.has_capability('door.operate', <party>)` — the same two-arm resolver
that `door_scan_events_select_admin` already calls, verified present in
production with its Phase 35 second arm — so "assigned to this night" is asked
once, in the place Phase 32 put it.

The hard part is not the mechanism. It is the eight-hour night on a phone in a
pocket. The project's access tokens expire after 3600 s (verified via the
Management API), auth-js stops its refresh ticker while the document is hidden,
and Realtime **disconnects a client whose JWT expires without a new one
arriving**. Safari and iOS Safari implement neither `freeze`, `resume` nor
`document.wasDiscarded` (verified from MDN browser-compat-data), so the Page
Lifecycle API is unavailable on the target device and the resume signal has to be
assembled from `visibilitychange` on `document`, `pageshow`, and `online`. The
correct posture is therefore not to trust the channel's own recovery: **every
resume forces `setAuth()`, a fresh subscription, and a full reload**, and the
5-minute parachute re-arms from the last successful fetch so a busy door never
runs it at all.

**Primary recommendation:** one migration adding a `SELECT`-only policy on
`realtime.messages` gated by `private.has_capability('door.operate', …)`, one
`SECURITY DEFINER` fan-out helper `public.notify_attendance_changed(uuid, uuid)`,
and four `AFTER` triggers (`door_scan_events`, `tickets`, `guest_list_entries`,
`ticket_refunds`); client-side, one `useEffect` keyed on `selectedPartyId` that
subscribes to `door:<party_id>` with `{ config: { private: true } }`, coalesces
messages behind a short debounce, defers behind `isProcessingRef`, and calls the
existing `fetchAttendance` — never a second fetch site.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Deciding **who may listen** to a night's updates | Database (RLS on `realtime.messages`) | — | `access-gating.md`, gate *RLS-è-il-confine*. A client-side filter is the middleware pretending to be RLS. D-38-03 |
| Deciding **what "assigned to this night" means** | Database (`private.has_capability`) | — | Phase 32's single definition. A second predicate is the exact failure Phase 32 was built to prevent |
| **Emitting** the change signal | Database (triggers → `realtime.send`) | — | One place that cannot be forgotten; and `realtime.send` cannot abort the writer's transaction (verified) |
| **Composing and redacting** the attendee payload | API / Backend (`/api/tickets/attendance`, service client) | — | Unchanged by this phase. D-38-01/D-38-02: the channel carries the fact, this endpoint carries the (redacted) list |
| **Transporting** the signal | Supabase Realtime (managed) | — | Not ours to build |
| **Deciding a scan verdict** | Browser (IndexedDB via `checkin-store.ts`) | — | Unchanged by this phase, and structurally isolated from the channel. LIVE-02 |
| **Reload discipline** (debounce, defer, safety timer, resume) | Browser (`ScannerClient.tsx`) | — | It is about *this device's* lifecycle; no server knows the phone is in a pocket |
| **Showing freshness** | Browser (counter row + band) | — | D-38-10/D-38-11. In a repo with no error tracking this screen is the only observer |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | **2.97.0 installed** (`^2.97.0` in `package.json`) | Realtime client: `supabase.channel()`, `.on('broadcast', …)`, `.subscribe()`, `supabase.removeChannel()`, `supabase.realtime.setAuth()`, `supabase.realtime.onHeartbeat()` | Already a dependency. **Nothing new is installed by this phase.** [VERIFIED: `node -e "require('@supabase/supabase-js/package.json').version"` → `2.97.0`, 2026-08-11] |
| `@supabase/realtime-js` | **2.97.0 installed** (transitive) | The channel/socket implementation behind the above | [VERIFIED: `node -e "require('@supabase/realtime-js/package.json').version"` → `2.97.0`, 2026-08-11] |
| `@supabase/ssr` | `^0.8.0` | `createBrowserClient` — the singleton this phase must use, not a second client | [VERIFIED: `package.json`, and `src/lib/supabase/client.ts` is the only browser factory] |
| PostgreSQL `realtime` schema | Supabase-managed | `realtime.send(payload jsonb, event text, topic text, private boolean)`, `realtime.topic()`, `realtime.messages` | [VERIFIED: `pg_proc` probe against this project's database, 2026-08-11 — signatures reproduced below] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `private.has_capability(text, uuid)` | in production | The canonical "may this subject do X on this night" resolver | **Always.** The channel policy calls it; it never re-derives the answer |
| `public.event_parties` | in production | Fan-out target when a ticket or guest-list row carries `party_id IS NULL` | In the trigger helper only — see § Pitfall 1 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Broadcast from the database (`realtime.send` in a trigger) | Broadcast from the route handler after the write | Explicit and visible in TypeScript, but there are **at least six** write sites today and a forgotten one produces a silently stale list. See § Where the Signal Is Emitted for the full comparison and the recommendation |
| Broadcast from the database | `realtime.broadcast_changes()` in a trigger | **Rejected.** `broadcast_changes` exists precisely to ship `NEW`/`OLD` records to the client — it is a PII delivery mechanism by design. It would violate D-38-01 in the same way `postgres_changes` does [VERIFIED: signature `(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text)` read from `pg_proc` on this project, 2026-08-11] |
| Broadcast | `postgres_changes` | **Rejected — confirmed, see § Alternatives in detail below** |
| Broadcast | Presence | Wrong tool. Presence answers "who is here", not "what changed", and it is **disabled on this project** (`presence_enabled: false`) [VERIFIED: `GET /v1/projects/{ref}/config/realtime`, 2026-08-11] |
| `channel.httpSend()` from a server route | — | **Not available.** `httpSend` requires supabase-js **2.107.0 or later**; this project is on 2.97.0 [CITED: supabase.com/docs/guides/realtime/broadcast, "available from the Supabase JavaScript client version 2.107.0 and later", checked 2026-08-11] |

**Installation:**

```bash
# Nothing. No package is added, removed or upgraded by this phase.
```

---

## Package Legitimacy Audit

**This phase installs no external packages.** Every API it uses ships inside
dependencies already present in `package.json` and already resolved in
`node_modules` at the versions stated above.

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| — | — | — | No new package. Audit not applicable |

**Packages removed due to slopcheck `[SLOP]` verdict:** none — none proposed.
**Packages flagged as suspicious `[SUS]`:** none — none proposed.

The one version claim this phase does depend on is a **negative** one — that
`channel.httpSend()` does *not* exist in 2.97.0 — and it is verified two ways:
the documentation states the 2.107.0 floor, and `grep -rn "httpSend"
node_modules/@supabase/realtime-js/src` returns nothing. The recommendation does
not use it.

---

## Architecture Patterns

### System Architecture Diagram

```
  ┌──────────────────── WRITE PATHS (all existing, none changed) ─────────────────────┐
  │                                                                                    │
  │  POST /api/tickets/checkin ───────┐                                                │
  │  POST /api/membership/verify ─────┤──► INSERT public.door_scan_events (party_id    │
  │  POST /api/tickets/checkin/undo ──┘        NOT NULL — one row per door action)     │
  │        ▲                                                                           │
  │        └── offline queue drain (sync-manager.ts) replays through the SAME route    │
  │                                                                                    │
  │  guest-list actions.ts / process-entry.ts ──► INSERT/UPDATE/DELETE                 │
  │                                                 public.guest_list_entries          │
  │  purchase / webhook ────────────────────────► INSERT public.tickets                │
  │  refund-actions.ts ─────────────────────────► INSERT public.ticket_refunds         │
  └────────────────────────────────────┬───────────────────────────────────────────────┘
                                       │  AFTER ROW triggers (4)
                                       ▼
                    public.notify_attendance_changed(p_party_id, p_event_id)
                                SECURITY DEFINER, one definition
                                       │
                     party_id NOT NULL ─┴─ party_id IS NULL
                             │                     │
                             │                     └─► fan out over every
                             │                         event_parties row of p_event_id
                             ▼                                   │
                    realtime.send('{}'::jsonb,                   │
                                  'attendance_changed',  ◄───────┘
                                  'door:'||party_id,
                                  true /* private */)
                                       │
                                       │  (failure raises WARNING only —
                                       │   the caller's transaction survives)
                                       ▼
                             realtime.messages  ──── RLS SELECT policy ────┐
                                       │             calls                 │
                                       │      private.has_capability(      │
                                       │        'door.operate',            │
                                       │        <party from topic>)        │
                                       ▼                                   │
                          Supabase Realtime service ◄─── join refused ─────┘
                                       │                 (Unauthorized)
                                       │  WebSocket, private channel
                                       ▼
  ┌──────────────────────── THE DOOR'S DEVICE ────────────────────────────────────────┐
  │                                                                                    │
  │   channel 'door:<party>' ──► message ──► coalesce (debounce)                       │
  │           ▲                                     │                                  │
  │           │                        isProcessingRef.current ?                       │
  │      re-subscribe                   yes │             │ no                         │
  │           │                             ▼             ▼                            │
  │   resume / online /            pendingReloadRef   fetchAttendance()                │
  │   SUBSCRIBED re-entry               │  (drained        │  ── THE ONE FETCH SITE     │
  │           ▲                          │   in            │                            │
  │           │                          │   dismissFlash) │                            │
  │   visibilitychange · pageshow ───────┘                 ▼                            │
  │   online · onHeartbeat('disconnected')          mergeAttendees (IndexedDB)          │
  │           │                                            │                            │
  │   5-min safety timer (re-armed on every                ▼                            │
  │    successful fetch, foreground only) ──────► lastFetchAt = performance.now()       │
  │                                                        │                            │
  │                                                        ▼                            │
  │                                       counter row "12 / 40 · updated 12s ago"       │
  │                                       (tap = manual reload)  +  band when > 5 min   │
  │                                                                                    │
  │   ═══════════════ SCAN PATH — untouched, and structurally isolated ═══════════════ │
  │   camera ──► handleVerify ──► ticketOffline / membershipOffline ──► IndexedDB       │
  │              (never reads channel state, never awaits it)         ──► verdict       │
  └────────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

Nothing new is created outside the door. The phase touches four places.

```
supabase/migrations/
└── 202608XXXXXXXX_live_attendance_channel.sql   # policy + helper + 4 triggers, ONE transaction

src/lib/supabase/
└── client.ts                                     # ONLY if `worker: true` is adopted — see Pattern 4

src/lib/offline/
└── (unchanged — LIVE-07: nothing is extracted, nothing is generalised)

src/app/(admin)/admin/scanner/
└── ScannerClient.tsx                             # subscription effect, resume effect,
                                                  # safety timer, freshness state, band + counter row
```

The channel code belongs **inside `ScannerClient.tsx`** rather than in a new
`src/lib/realtime/` module. That is not laziness: LIVE-07 asks that the door and
the bar not share an offline mechanism, and a `src/lib/realtime/useLiveList.ts`
is exactly the shape that gets imported by the bar in six months and quietly
makes one of the two surfaces' defaults accidental. If the file's size becomes
the objection, the honest split is a door-scoped file
(`src/app/(admin)/admin/scanner/useDoorChannel.ts`) that lives beside its only
caller and is not on an import path anything else would reach for.

### Pattern 1: The private per-night channel (client side)

**What:** one channel per selected night, opened when the night is selected,
closed when it changes or the surface unmounts (D-38-05).
**When to use:** in the effect that already keys on `selectedPartyId`
(`ScannerClient.tsx:884-890` is the sibling that fetches).

```typescript
// Source: supabase.com/docs/guides/realtime/authorization (checked 2026-08-11)
//         supabase.com/docs/guides/realtime/subscribing-to-database-changes (checked 2026-08-11)
// Verified against @supabase/supabase-js 2.97.0 in node_modules.
useEffect(() => {
  if (!selectedPartyId) return;

  const supabase = createClient();          // the ssr singleton — never a second client
  let cancelled = false;
  let channel: RealtimeChannel | null = null;

  (async () => {
    // Documented as required before joining a private channel. 2.97.0 also calls
    // setAuth() itself on socket open (RealtimeClient.ts:694), but calling it
    // here makes the dependency legible and covers the resume path, where the
    // socket is already open and would NOT re-run that line.
    await supabase.realtime.setAuth();
    if (cancelled) return;

    channel = supabase
      .channel(`door:${selectedPartyId.toLowerCase()}`, {
        config: { private: true },          // ← without this, RLS is not consulted
      })
      .on("broadcast", { event: "attendance_changed" }, () => {
        requestReload("channel");           // never fetches directly — see Pattern 2
      })
      .subscribe((status) => {
        // `status` is one of SUBSCRIBED | CLOSED | CHANNEL_ERROR | TIMED_OUT
        // (REALTIME_SUBSCRIBE_STATES, realtime-js 2.97.0 RealtimeChannel.ts:143-192)
        setChannelLive(status === "SUBSCRIBED");

        // LIVE-03. Re-entering SUBSCRIBED after having left it IS a reconnection,
        // and the channel does not replay what happened while it was down.
        if (status === "SUBSCRIBED" && hadDroppedRef.current) {
          hadDroppedRef.current = false;
          requestReload("resubscribed");
        }
        if (status !== "SUBSCRIBED") {
          hadDroppedRef.current = true;
          // D-38-04: this is "not listening". It says NOTHING about the role,
          // and it must not reach `doorAuth` or any refusal path.
          console.warn("scanner:channel_not_listening", { status });
        }
      });
  })();

  return () => {
    cancelled = true;
    if (channel) supabase.removeChannel(channel);
  };
}, [selectedPartyId]);
```

Three things in that block are load-bearing and easy to lose:

- **`{ config: { private: true } }`.** Without it the client joins a *public*
  channel. The private message the database sends would then never arrive —
  *"a public broadcast only reaches public channels and a private broadcast only
  reaches private channels"* [CITED: supabase.com/docs/guides/realtime/broadcast,
  checked 2026-08-11]. The failure is silent in exactly the direction that hurts:
  the channel joins, nothing ever arrives, and only the 5-minute parachute keeps
  the list alive.
- **`.toLowerCase()` on the id.** Topic matching is byte-exact. The database
  sends to `'door:' || party_id::text`, and Postgres renders a uuid lowercase.
  See § Pitfall 3.
- **The status callback writes to `setChannelLive`, never to `doorAuth`.** D-38-04
  in one line.

### Pattern 2: The single reload request point

**What:** every trigger to reload — channel message, reconnection, safety timer,
manual tap — goes through one function that coalesces, defers behind the scan
lock, and then calls the *existing* `fetchAttendance` (D-38-02).
**When to use:** always. There is no second path.

```typescript
// Anchors: isProcessingRef is set at ScannerClient.tsx:917-918 and released in
// dismissFlash (:998) and the reset path (:1896).
const pendingReloadRef = useRef(false);
const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const requestReload = useCallback((reason: string) => {
  // D-38-08. A verdict is being produced right now: the reload waits.
  // This is not only about React rendering. `mergeAttendees` writes the SAME
  // IndexedDB object store the offline verdict reads, and IDB serialises
  // readwrite transactions on a store — so an unguarded merge can put itself
  // between a scan and its answer.
  if (isProcessingRef.current) {
    pendingReloadRef.current = true;
    return;
  }
  // Coalesce a burst. A rush at the door produces one door_scan_events row per
  // scan, and the ticket UPDATE fires its own trigger: several messages, one list.
  if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
  reloadTimerRef.current = setTimeout(() => {
    reloadTimerRef.current = null;
    console.info("scanner:reload", { reason });
    fetchAttendance(searchQuery || undefined);
  }, 500);
}, [fetchAttendance, searchQuery]);
```

and, at the release point inside `dismissFlash`:

```typescript
isProcessingRef.current = false;
if (pendingReloadRef.current) {
  pendingReloadRef.current = false;
  requestReload("deferred");
}
```

Draining unconditionally may cost one extra GET when the scan's own reload
(`:895`) was going to fire anyway. That is the correct side to err on: a
duplicated fetch costs one request; a dropped one leaves a stale list, which is
the entire subject of this phase.

### Pattern 3: The resume signal, assembled by hand

**What:** the set of browser events that together mean "this app came back".
**When to use:** in the existing listener block at `ScannerClient.tsx:531-535`,
extended — not duplicated by a second competing set.

```typescript
// Support verified from MDN browser-compat-data (raw BCD JSON, 2026-08-11):
//   document.freeze / document.resume / document.wasDiscarded → Safari: FALSE,
//     safari_ios: mirror. The Page Lifecycle API does not exist on the target device.
//   visibilitychange → Safari 14.1+ full. Before Safari 14 it did not BUBBLE, so it
//     must be attached to `document`, never to `window`.
//   pageshow → Safari 5+ / iOS 4+ (PageTransitionEvent).
//   online / offline → Safari 4 / iOS 3.
const onVisible = () => {
  if (document.visibilityState !== "visible") return;
  resubscribe();                 // do not trust the socket's own recovery
  requestReload("foreground");   // LIVE-03: a full reload, always
};
const onPageShow = () => {       // bfcache restore — visibilitychange may not fire
  resubscribe();
  requestReload("pageshow");
};
const onOnline = () => {
  resubscribe();
  requestReload("online");
};

document.addEventListener("visibilitychange", onVisible);
window.addEventListener("pageshow", onPageShow);
window.addEventListener("online", onOnline);
```

`window.focus` is deliberately absent. In a standalone PWA it fires alongside
`visibilitychange` and buys nothing but a second reload; the coalescing debounce
in Pattern 2 would swallow it, but a listener that exists only to be swallowed is
a listener the next reader has to reason about.

`resubscribe()` should tear the channel down and build it again
(`removeChannel` → `setAuth()` → `channel(...).subscribe()`) rather than trusting
`rejoinTimer`. The library *does* auto-rejoin with a 1 s → 2 s → 5 s → 10 s
backoff (realtime-js 2.97.0, `RealtimeChannel.ts:217`), but on resume the access
token may still be the expired one — see § Token Expiry — and a rejoin with an
expired token fails, backs off, and retries. Rebuilding after an explicit
`setAuth()` converges in one step instead of several.

### Pattern 4: Heartbeat as the "died without saying so" detector

**What:** `RealtimeClient.onHeartbeat(cb)` reports `'sent' | 'ok' | 'error' |
'timeout' | 'disconnected'`.
**When to use:** to drive the *display* (LIVE-05) and, optionally, an explicit
`connect()`.

```typescript
// Source: supabase.com/docs/guides/troubleshooting/
//   realtime-handling-silent-disconnections-in-backgrounded-applications-592794
//   (checked 2026-08-11). API verified in realtime-js 2.97.0: RealtimeClient.ts:511
//   `onHeartbeat(callback: (status: HeartbeatStatus, latency?: number) => void)`.
supabase.realtime.onHeartbeat((status) => {
  if (status === "disconnected" || status === "timeout") {
    setChannelLive(false);
    supabase.realtime.connect();   // documented remedy for a silent drop
  }
  if (status === "ok") setChannelLive(true);
});
```

The heartbeat interval is **25 000 ms** and a missed reply forces a socket close
and reconnect (realtime-js 2.97.0, `RealtimeClient.ts:49-53` and `:466-480`). So
a silently dead socket is noticed within ~50 s without any code of ours — which
is why the 5-minute parachute is a *parachute* and not the primary mechanism.

The same troubleshooting guide also recommends `worker: true`, which moves the
heartbeat onto a Web Worker so a throttled background tab keeps the socket alive.
Two cautions before adopting it:

1. It can only be set **at client construction**, and `createBrowserClient` is a
   module-level singleton (`@supabase/ssr` 0.8.0, `createBrowserClient.ts:101-107`),
   so it would have to go in `src/lib/supabase/client.ts` — a file owned by
   `access-gating.md`, affecting every browser client in the product. That is a
   cross-domain change and should be declared as one.
2. On the target device it buys little. An iOS home-screen PWA is *suspended*,
   not throttled; its workers do not run either. The resume path in Pattern 3 is
   what actually covers the pocket.

**Recommendation:** do **not** adopt `worker: true` in this phase. Take
`onHeartbeat` (no construction change, no cross-domain edit) and leave the worker
as a recorded option.

### Pattern 5: The authorisation policy

**What:** one `SELECT` policy on `realtime.messages`, and deliberately no
`INSERT` policy.

```sql
-- Source: supabase.com/docs/guides/realtime/authorization (checked 2026-08-11)
-- `realtime.topic()` verified present on this project: pg_proc, schema `realtime`,
-- language sql, zero arguments (probe 2026-08-11).
CREATE POLICY door_attendance_broadcast_read ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    CASE
      -- Broadcast only. Presence is disabled on this project and nothing here
      -- should start admitting it by omission.
      WHEN realtime.messages.extension <> 'broadcast' THEN false

      -- The topic is UNTRUSTED TEXT: it is whatever the client typed into
      -- `supabase.channel(...)`. Casting it to uuid unguarded raises 22P02, and an
      -- error inside a policy is a refused connection (`RlsPolicyError`), not a
      -- `false`. CASE is used because Postgres does NOT short-circuit AND:
      -- "The order of evaluation of subexpressions is not defined... When it is
      -- essential to force evaluation order, a CASE construct can be used."
      -- [postgresql.org/docs/current/sql-expressions.html, checked 2026-08-11]
      WHEN (SELECT realtime.topic()) ~
           '^door:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (SELECT private.has_capability(
                'door.operate',
                substring((SELECT realtime.topic()) FROM 6)::uuid))

      ELSE false
    END
  );
```

Why this predicate and not another:

- `private.has_capability('door.operate', <party>)` is **the same call**
  `door_scan_events_select_admin` makes
  (`20260809004000_door_scan_events_by_assignment.sql:172-180`). Verified in
  production, the function is `SECURITY DEFINER`, `STABLE`, `search_path = ''`,
  and carries both arms — the role grant and the live per-night assignment with
  `revoked_at is null and now() < pa.ends_at`. **Nothing about "assigned to this
  night" is re-derived here.**
- The admitted set is therefore: every `master`, every `organizer` (they hold
  `door.operate` from the role — `20260807000000_capability_model.sql:416-417`),
  and any `staff` account holding a live `door.operate` assignment for **that**
  night. That is precisely the set that may operate that door. LIVE-06.
- `EXECUTE` on the function is already granted to `authenticated` and `anon`
  (`20260809001000_assignment_resolver.sql:368`), so **no new grant is needed**.
  For `anon`, `auth.uid()` is null, both arms find nothing, and the answer is a
  correct `false`.
- `party_assignments` already carries `idx_party_assignments_lookup` on
  `(user_id, party_id) WHERE revoked_at IS NULL`, which is exactly the lookup
  arm 2 performs.

**And no `INSERT` policy, on purpose.** `authenticated` and `anon` already hold
table-level `INSERT` on `realtime.messages` (verified by `aclexplode` on this
project, 2026-08-11) — RLS is the only thing standing between a signed-in member
and the ability to broadcast on the door's topic. With RLS on and no `INSERT`
policy, no client session can send anything. The database is the only sender.
This is the third table in this repository to omit its write policy deliberately
(`door_scan_events` and `membership_register` are the other two), and the
omission must be written into the migration header or the next reader will
"repair" it.

### Anti-Patterns to Avoid

- **Filtering on the client instead of in the policy.** "Subscribe to a public
  `door:*` channel and ignore messages for other nights" is the middleware
  pretending to be RLS. D-38-03, and `access-gating.md` gate *RLS-è-il-confine*.
- **A second `fetchAttendance`.** A private helper that fetches and merges "just
  for the live path" reintroduces the exact defect FIX-06 closed: a place where a
  `MergeResult` refusal is dropped without reaching the person holding the phone.
  D-38-02.
- **Letting a refused channel become a verdict on the operator.** `CHANNEL_ERROR`
  with `Unauthorized` looks like "you are not allowed" and is *not* an answer
  about the role: it may equally be an expired JWT, a rate limit, or a
  Realtime restart. D-38-04.
- **Extracting a shared `useLiveList` hook.** LIVE-07. The bar's default is
  "when in doubt record nothing"; the door's is "when in doubt admit and record".
  A shared mechanism makes one of them accidental.
- **`await`ing anything channel-shaped inside `handleVerify`.** See § The LIVE-02
  Proof for the mechanical check that this has not happened.
- **A `WHEN` clause on the triggers that tries to emit only for "real" changes.**
  Tempting, and wrong at this door: a filter that is slightly too narrow drops a
  real change and leaves a stale list; a filter that is too wide costs one GET.
  The asymmetry is the same one `checkin-offline.md` states for admissions, and
  it points the same way. Emit on every row; coalesce on the client.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Who may listen to this night" | A new SQL predicate, a new `is_assigned_to_party()`, or a check in the route | `private.has_capability('door.operate', <party>)` | A second definition of "assigned to this night" is the exact failure Phase 32 exists to prevent. It also drifts silently — no error, no failed build |
| Detecting a dead socket | A custom ping/pong over the channel | `supabase.realtime.onHeartbeat()` + the library's own 25 s heartbeat and forced reconnect | Already implemented, already tested by the vendor, and already forces a reconnect on timeout (`RealtimeClient.ts:466-480`) |
| Reconnect backoff | A hand-rolled retry loop | The library's `rejoinTimer` / `reconnectTimer` (1 s, 2 s, 5 s, 10 s, then 10 s) | Two competing backoffs produce a join storm, and `max_joins_per_second` on this project is 100 |
| Refreshing the JWT on the socket | Reading the cookie and pushing `access_token` yourself | `supabase.realtime.setAuth()` + supabase-js's own `onAuthStateChange` wiring | 2.97.0 already pushes a new token to joined channels on `TOKEN_REFRESHED`/`SIGNED_IN` (`SupabaseClient.ts:398-418`, `RealtimeClient.ts:860-875`) |
| Elapsed-time display | `Date.now() - lastFetchAtWallClock` | `performance.now()` deltas | `Date.now()` can step backwards on an NTP correction or a manual clock change and print "updated -40s ago". `performance.now()` is monotonic |
| Guaranteeing the emit cannot break a check-in | A `try/catch` wrapper, a queue, a retry | `realtime.send`'s own `EXCEPTION WHEN OTHERS THEN RAISE WARNING` | Verified from the function body in this project's database. It already cannot abort the caller |

**Key insight:** almost everything this phase needs already exists — in the
library, in the database, or in `ScannerClient.tsx`. The work is wiring and
discipline, not construction. The one thing that genuinely must be written is the
**policy**, and it must be written to call something that already exists rather
than to restate it.

---

## Where the Signal Is Emitted

### The write paths, enumerated from the code (2026-08-11)

| # | Path | What it writes | Reaches the attendee list? |
|---|------|----------------|----------------------------|
| 1 | `src/app/api/tickets/checkin/route.ts:821, :1141` | `door_scan_events` INSERT; `tickets` UPDATE (`checked_in`) | Yes |
| 2 | `src/app/api/membership/verify/route.ts:233, :477, :511` | `door_scan_events` INSERT; `attendances` INSERT/UPDATE | Yes (door_scan_events); `attendances` is **not** read by `/api/tickets/attendance` |
| 3 | `src/app/api/tickets/checkin/undo/route.ts:416, :321/:446, :478/:514, :534/:560` | `door_scan_events` INSERT (`is_undo`); `tickets`, `guest_list_entries`, `attendances` | Yes |
| 4 | `src/lib/offline/sync-manager.ts` (queue drain) | nothing directly — it **POSTs to path 1** | Yes, via path 1 |
| 5 | `src/app/(admin)/admin/events/[id]/guest-list/actions.ts` + `src/lib/guest-list/process-entry.ts` | `guest_list_entries` INSERT/UPDATE/DELETE | Yes |
| 6 | purchase / SumUp webhook | `tickets` INSERT | Yes |
| 7 | `src/app/(public)/tickets/refund-actions.ts` | `ticket_refunds` INSERT; ticket row deleted | Yes |

Seven paths. Path 4 is free (it replays through path 1). Paths 1–3 all converge
on **one** table — `door_scan_events`, whose `party_id` is `NOT NULL` — which is
why a single trigger there covers the entire door, including the offline drain,
without touching `sync-manager.ts` at all.

### Database trigger versus route-handler emit

| | Trigger in the database | Emit from each route handler |
|---|---|---|
| Places to forget one | **1 per source table (4)** | **6** — and a new one appears every time a write path is added |
| Visible from TypeScript | No — this is its real cost | Yes |
| Covers the offline drain | Yes, free (it replays through the checkin route) | Yes, same |
| Can break the write it hangs off | **No** — `realtime.send` catches everything and raises a WARNING [VERIFIED: `pg_proc.prosrc` on this project, 2026-08-11] | Yes, unless every call site is individually wrapped — six chances to get it wrong |
| Failure visibility | Postgres log only (`WarnSendingBroadcastMessage`) | Same — this repo has no error tracking either way |
| Consistent with the project's own model | Yes — Phase 32's thesis is one definition, in the database | No |

**Recommendation: the database trigger.** The decisive argument is not
tidiness — it is the direction of the failure. A forgotten route-handler emit
produces **a stale attendee list at a door with no error anywhere**, which is
this project's canonical silent failure. A trigger that fires more often than
strictly necessary produces **one extra GET**, absorbed by the coalescing
debounce. The second argument is the verified one: because `realtime.send` cannot
raise, adding a trigger to the check-in write path introduces **zero** new ways
for a check-in to fail — which is what LIVE-02 is actually asking for on the
server side.

The trigger's one real cost — invisibility from the TypeScript — is paid for in
the migration header, which must name every table it covers and say why, in the
style this repository already uses.

### The recommended shape

```sql
-- ONE definition of "which topic does this row belong to".
CREATE OR REPLACE FUNCTION public.notify_attendance_changed(
  p_party_id uuid,
  p_event_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_party_id IS NOT NULL THEN
    -- The payload is EMPTY. `realtime.send` adds a random `id` key and nothing
    -- else (verified from its body). D-38-01: the fact, never the row.
    PERFORM realtime.send('{}'::jsonb, 'attendance_changed',
                          'door:' || p_party_id::text, true);
    RETURN;
  END IF;

  -- Pitfall 1. An event-level ticket or guest-list entry carries party_id NULL
  -- and is valid for EVERY party of its event
  -- (`attendance/route.ts:585-614`, the NULL-tolerant `or(...)` predicate).
  -- Sending to 'door:' || NULL would send nowhere and tell nobody.
  IF p_event_id IS NOT NULL THEN
    PERFORM realtime.send('{}'::jsonb, 'attendance_changed',
                          'door:' || ep.id::text, true)
    FROM public.event_parties ep
    WHERE ep.event_id = p_event_id;
  END IF;
END;
$$;
```

and four triggers, all `AFTER … FOR EACH ROW`, all calling one small wrapper each:

| Trigger on | Events | Party source |
|------------|--------|--------------|
| `public.door_scan_events` | INSERT | `NEW.party_id` (NOT NULL) — covers ticket check-in, membership admission, undo, offline drain |
| `public.tickets` | INSERT, UPDATE, DELETE | `COALESCE(NEW,OLD).party_id`, `…event_id` — NULL party fans out |
| `public.guest_list_entries` | INSERT, UPDATE, DELETE | `COALESCE(NEW,OLD).party_id`, `…event_id` — NULL party fans out |
| `public.ticket_refunds` | INSERT, UPDATE | `refunded_party_id`, `refunded_event_id` — NULL party fans out |

All of it in **one** `BEGIN; … COMMIT;`, following
`20260809000000_party_assignments.sql`'s reasoning: the helper without the
triggers is a function with no caller, the triggers without the helper do not
compile, and the policy without either is an open door onto a channel nobody
sends to.

**Cross-domain note for the planner:** the triggers on `tickets` and
`ticket_refunds` sit on the money tables. They are `AFTER` triggers returning
`NULL`, they perform no write of their own, and `realtime.send` cannot raise —
so they cannot alter, delay or fail a payment path. That sentence belongs in the
migration header, because `ticketing-payments.md` is the module that loads on
those tables and its reader will ask.

---

## Reconnection Detection

### What the library exposes

| Signal | Where | Meaning |
|--------|-------|---------|
| `subscribe((status) => …)` → `SUBSCRIBED` | `REALTIME_SUBSCRIBE_STATES`, realtime-js 2.97.0 `RealtimeChannel.ts:156, :182` | Joined. **Re-entry after any other state is a reconnection** |
| → `CHANNEL_ERROR` | `RealtimeChannel.ts:143, :188` | Join refused, socket errored, or a server-side error. Carries an `Error` as the 2nd arg |
| → `CLOSED` | `RealtimeChannel.ts:144` | Channel closed (socket close, or our own `removeChannel`) |
| → `TIMED_OUT` | `RealtimeChannel.ts:192` | Join did not complete inside `DEFAULT_TIMEOUT` (10 000 ms) |
| `realtime.onHeartbeat(cb)` | `RealtimeClient.ts:511` | `'sent' \| 'ok' \| 'error' \| 'timeout' \| 'disconnected'`, every 25 s |
| Automatic rejoin | `RealtimeChannel.ts:217` (`rejoinTimer`), `RealtimeClient.ts:920-932` (`reconnectTimer`) | Backoff 1 s → 2 s → 5 s → 10 s → 10 s… |

A refused join surfaces as `CHANNEL_ERROR`; the server-side code is
`Unauthorized`, and `RlsPolicyError` appears when the policy itself errors
[CITED: supabase.com/docs/guides/realtime/error_codes, checked 2026-08-11]. The
two are indistinguishable from the client, which is a second reason for D-38-04.

### What the browser exposes, on the device that matters

| Event | Safari / iOS Safari | Notes |
|-------|--------------------|-------|
| `document` `visibilitychange` | **Safari 14.1+ full** | Before Safari 14 it did **not bubble** — attach to `document`, not `window`. `setupSyncListeners` already does this correctly (`sync-manager.ts:665`) |
| `window` `pageshow` | **iOS Safari 4+** | Fires on bfcache restore, where `visibilitychange` may not |
| `window` `online` / `offline` | **iOS Safari 3+** | Fires only when the *radio* changes — not when the app is suspended. This is exactly D-38-06's point |
| `document` `freeze` / `resume` | **NOT SUPPORTED** | Chromium-only (Chrome 68+). Unusable here |
| `document.wasDiscarded` | **NOT SUPPORTED** | Chromium-only |

[VERIFIED: MDN browser-compat-data, `api/Document.json`, `api/Window.json`,
`api/PageTransitionEvent.json`, raw JSON from
`raw.githubusercontent.com/mdn/browser-compat-data/main/`, read 2026-08-11]

**What an iOS home-screen PWA actually does when resumed:** it is *suspended*,
not throttled — timers, the heartbeat, and any Web Worker all stop. On resume the
page usually survives in memory and fires `visibilitychange` → `visible`; if iOS
reclaimed it, the app relaunches and the whole component mounts fresh (which
takes the mount path, not the resume path). `pageshow` covers the middle case, a
bfcache restore. `online` covers none of these on its own, because the radio
never went away. [ASSUMED — the per-event support is verified from BCD, but the
*ordering* on a suspended standalone PWA is not measured. It is settled by the
pocket procedure in § Validation Architecture, on the actual device.]

**Recommendation:** treat all three as the same signal — `resubscribe()` then
`requestReload()` — and let the 500 ms coalescing debounce collapse whichever
combination the platform chooses to fire. Do not try to distinguish them; the
correct behaviour is identical for all three, and a device-specific branch is a
branch nobody can test.

---

## Token Expiry — the eight-hour night

**The facts, verified on this project (2026-08-11):**

| Fact | Value | Source |
|------|-------|--------|
| Access-token lifetime | **3600 s** | `GET /v1/projects/{ref}/config/auth` → `jwt_exp: 3600` |
| Refresh-token rotation | enabled, 10 s reuse interval | same |
| Session timebox / inactivity timeout | `0` / `0` — the *session* never expires | same |
| Auto-refresh threshold | 3 ticks × 30 s = **90 s before expiry** | auth-js 2.97.0, `constants.ts` (`AUTO_REFRESH_TICK_DURATION_MS = 30000`, `AUTO_REFRESH_TICK_THRESHOLD = 3`) |
| Auto-refresh runs **only while the document is visible** | yes | auth-js 2.97.0, `GoTrueClient.ts:3063-3072` — `_onVisibilityChanged` calls `_startAutoRefresh` on visible and `_stopAutoRefresh` on hidden |
| Realtime disconnects on token expiry | yes | *"If a new JWT is never received on the Channel, the client will be disconnected when the JWT expires."* [CITED: supabase.com/docs/guides/realtime/authorization, checked 2026-08-11] |
| Policies are cached for the connection's lifetime | yes | *"Client access policies are cached for the duration of the connection. Your database is not queried for every Channel message."* [same source] |
| supabase-js pushes new tokens to joined channels | yes, on `TOKEN_REFRESHED` and `SIGNED_IN` | supabase-js 2.97.0, `SupabaseClient.ts:398-418`; realtime-js 2.97.0, `RealtimeClient.ts:860-875` (`channel._push(CHANNEL_EVENTS.access_token, …)`) |
| `setAuth()` is also called automatically on socket open | yes, when no token has been set yet | realtime-js 2.97.0, `RealtimeClient.ts:694` |

**So what actually happens on a 22:00 → 06:00 night:**

- **Screen on, app in the foreground.** The token is refreshed every ~58 minutes,
  supabase-js pushes it to the joined channel, and nothing is interrupted. **No
  action needed.**
- **Phone in a pocket for more than ~1 hour.** Auto-refresh is stopped (hidden),
  the token expires, and Realtime **drops the connection**. `online` never fires,
  because the radio never went away. This is the commonest death, and it is
  exactly what D-38-06 names.
- **On resume.** auth-js restarts the ticker and recovers the session
  (`_onVisibilityChanged`), producing `TOKEN_REFRESHED` → `realtime.setAuth(new)`.
  In parallel the socket's own `reconnectTimer` may already have fired and
  attempted a rejoin **with the expired token**, which fails (`InvalidJWTToken`)
  and backs off. It converges — but through a sequence of failures, on the
  30 seconds when a queue is forming.

**Recommendation:** do not race it. On every resume signal, in order:

1. `await supabase.realtime.setAuth()` — reads the current session and pushes it.
2. `supabase.removeChannel(old)` and build the channel again.
3. `requestReload("foreground")` — unconditionally, before and regardless of
   whether the channel comes back (LIVE-03).

Step 3 is the one that matters. The list is correct after step 3 whether or not
steps 1 and 2 succeed, which is the property the door needs.

**One more consequence, for the planner:** do not add a second Supabase browser
client. `createBrowserClient` is a module-level singleton, so today there is
exactly one; with `refresh_token_rotation_enabled: true` and a 10 s reuse window,
two independent clients racing a refresh can put one of them into a failed
refresh and, in the worst case, a sign-out — at the door.

---

## The LIVE-02 Proof

LIVE-02 is not satisfied by "we were careful". It is satisfied by a structure in
which the channel *cannot* reach the verdict, plus a demonstration.

### The structural rules

1. **The channel handler never fetches.** It calls `requestReload`, which is the
   only entry point (Pattern 2).
2. **`requestReload` defers behind `isProcessingRef.current`.** This is not only
   about React rendering: `mergeAttendees` writes the **same IndexedDB object
   store** that the offline verdict reads (`findAttendee` / `findBySubject`), and
   IndexedDB serialises `readwrite` transactions on a store. An unguarded merge
   really can put itself between a scan and its answer. Anchors: the lock is
   taken at `ScannerClient.tsx:917-918` and released in `dismissFlash` (`:998`)
   and the reset path (`:1896`).
3. **Nothing in the scan path reads channel state.** `handleVerify` (`:1760`),
   `ticketOffline`, `ticketOnline`, `membershipOffline`, `membershipOnline` and
   the undo branch (`:1100`) must contain no reference to the channel, its
   status, or `channelLive`.
4. **Subscription is fire-and-forget.** No code awaits `SUBSCRIBED` before
   allowing a scan, and the camera-init effect (`:905`) is independent of the
   subscription effect.
5. **A refused channel is not a verdict.** The status callback writes only
   `setChannelLive` and a `console.warn`; it never touches `doorAuth`,
   `cacheDoorAuth`, or any refusal sentence (D-38-04).

### The mechanical check (runnable, in a repo with no test runner)

```bash
# macOS/BSD. Must print nothing.
awk '/const handleVerify/,/^  };$/' \
  'src/app/(admin)/admin/scanner/ScannerClient.tsx' \
  | grep -nE 'channel|Channel|realtime|Realtime|channelLive'
```

Extend the same shape to `ticketOffline`, `membershipOffline`, `ticketOnline`,
`membershipOnline`. This is a real, repeatable gate and it belongs in the plan as
a verification step, not as a claim.

### The three written door procedures

Because there are no tests, these are the evidence. Each names the role, the
setup, and **what must be observed** — with the network state made explicit.

**P1 — the channel never established.**
Setup: Chrome DevTools → Network → *Request blocking* → block
`wss://<project-ref>.supabase.co/realtime/*`. Open the door as an account holding
`door.operate` for the night. Select the night.
Observe: (a) the counter row reads `updated Ns ago` and the number climbs;
(b) a scan of a valid code returns its verdict with the same latency as before;
(c) after 5 minutes the staleness band appears; (d) tapping it reloads and the
counter returns to `updated 0s ago`. Record the wall-clock time of (c).

**P2 — the channel dropped mid-night.**
Setup: door open and healthy (band absent, counter climbing normally). Toggle
DevTools → Network → *Offline*, or put the phone in airplane mode with the page
open.
Observe: (a) a scan still returns its verdict, from the cache; (b) the band
appears; (c) on restoring the network, a full reload happens **without anyone
touching the screen**, and the counter resets. The reload on (c) is LIVE-03.

**P3 — the pocket, which is the real one.**
Setup: on the actual staff phone, door installed to the home screen, night
selected, network on. Perform one scan. Lock the phone. Wait **at least 65
minutes** (past the 3600 s token lifetime). Unlock and return to the app.
Observe: (a) a full reload fires on resume; (b) the counter reads `updated 0s
ago` within a few seconds; (c) the band, if it appeared, disappears; (d) a scan
immediately afterwards returns its verdict normally. This is the one procedure
that cannot be replaced by a desktop simulation, because it is the token expiry
and the PWA suspension together.

**P4 — degraded, not dropped.**
Setup: DevTools → Network → throttling *Slow 3G*.
Observe: the verdict latency for an **offline-path** scan is unchanged (it never
touches the network), and the list reload is merely late. If verdict latency
moves, rule 2 has been violated.

---

## The 5-Minute Safety Reload

**Re-armed, not periodic.** Clear and restart the timer on **every** successful
fetch — the scan-triggered one at `:895`, the channel-triggered one, the resume
one, the manual tap. A busy door then never runs the safety reload at all, which
is the honest meaning of "parachute" and the strongest answer to "is this polling
in disguise?": on a night with a queue, it fires zero times.

**Foreground only.** Do not run it while `document.visibilityState === 'hidden'`.
Three reasons, in order of weight:

1. On the target device the timer *cannot* run — an iOS home-screen PWA is
   suspended. Writing code for that case is writing code for a case that does not
   occur on the device this is built for.
2. The resume path already forces a full reload (D-38-06). A reload at the moment
   the eye arrives is strictly better than one that happened four minutes before
   it did.
3. On Android/Chrome, background timers are throttled to roughly one per minute
   and the reload would burn battery and data refreshing a screen nobody is
   reading — on a phone that has to survive 22:00 → 06:00.

So: clear the interval on `hidden`, and on `visible` do an immediate reload plus
re-arm. That also means the freshness age after a resume is ~0, so the band
correctly does not appear.

**Interaction with the scan reload at `:895`.** That effect is keyed on
`status ∈ {success, already_recorded}` and already calls `fetchAttendance`. It
should re-arm the safety timer through the same "on successful fetch" hook rather
than being special-cased — one place records `lastFetchAt` and one place re-arms.

**Interaction with an active search.** `fetchAttendance(search)` does **not**
merge into IndexedDB when `search` is set (`ScannerClient.tsx`, the
`if (eventData && !search)` guard). So a live reload while an operator is typing
in the search box refreshes what is on screen but **not** the offline cache. Two
honest options for the planner: (a) accept it and note that the cache catches up
on the next unfiltered fetch — the search box is used for seconds, and the safety
timer re-arms anyway; or (b) have `requestReload` call `fetchAttendance(undefined)`
when the trigger is *not* a keystroke, keeping the search results on screen from
the client-side filter. **(a) is recommended**: (b) changes what the operator
sees mid-typing, and the phase's boundary says no change to how a scan is decided
and no new surfaces.

---

## Freshness Display

**The measurement.** Record `lastFetchAtRef.current = performance.now()` on the
successful branch of `fetchAttendance` — after `setCacheNotices(notices)`, so a
fetch that failed and surfaced a notice does **not** count as fresh. The displayed
age is `performance.now() - lastFetchAtRef.current`.

**Why `performance.now()` and not `Date.now()`.** `checkin-store.ts` and
`ScannerClient.tsx:740-745` already state the rule: the device clock is
**evidence, never authority** — the drift is measured only to be shown, and
nothing branches on it. `Date.now()` can step (NTP correction on reconnect, a
manual clock change), which would print "updated -40s ago" at the worst possible
moment; `performance.now()` is monotonic and measures exactly what is being
claimed — *elapsed time on this device since the last successful fetch*.

**And it still never decides an admission.** The only branch this number drives
is *show the band / do not show the band*, which is a display decision. No scan
verdict, no refusal, no admission reads it. That is the line `checkin-store.ts`
draws, and this stays on the right side of it.

**The tick.** D-38-09's threshold is 5 minutes, so second-level precision is
decorative. Recommend a **5 s** interval, cleared when the document is hidden and
recomputed on `visible` — 6× cheaper than a 1 s tick over an eight-hour night,
and "updated 10s ago" reads the same as "updated 12s ago" to a person holding a
phone at a door. There is already a 30 s ticker of exactly this shape at
`ScannerClient.tsx:630-635`; follow its structure.

**The two surfaces.**

- The counter row (`:2317`) gains the age and becomes the tap target
  (D-38-10). It is a `<div>` today; making it the reload control means a real
  `<button>` wrapping the row, with an accessible name that says what tapping
  does — not a click handler on a div. `nextjs-architecture.md`'s dark-venue
  gate applies: one large target, one-handed, no precision required.
- The band appears when `!channelLive || age > 5 min` and belongs to the
  **existing** `setCacheNotices` family (a tone-tagged notice), not to a new
  parallel mechanism. CONTEXT.md's § Reusable Assets says this explicitly.

**The `channelLive` half.** LIVE-05 says staff can see *whether the list is live*.
`channelLive` comes from the `subscribe` status callback plus `onHeartbeat`. It
is a display flag, and it is the reason the band can appear before 5 minutes have
passed: a channel that is known to be down is worth saying so about immediately,
even if the list is 20 seconds old.

---

## Common Pitfalls

### Pitfall 1: `party_id IS NULL` — the event-level ticket

**What goes wrong:** the trigger emits to `'door:' || NULL` (which is `NULL`, so
`realtime.send` sends to a null topic and nobody hears it), and every door
watching that event misses the change.
**Why it happens:** `tickets.party_id` and `guest_list_entries.party_id` are
**nullable by design**. `attendance/route.ts:585-614` is explicit: *"An
event-level ticket carries `party_id IS NULL` and is valid for every party of its
event… filtering this list by party alone drops a paying holder out of the offline
cache, and a false refusal happens in front of a queue."* `ticket_refunds` has the
same shape (`refunded_party_id` nullable, `refunded_event_id` as the fallback) and
the route's `or(...)` predicate proves it.
**How to avoid:** the fan-out in `notify_attendance_changed` — when the party is
null, send to every `event_parties` row of the event.
**Warning signs:** a purchase or a guest-list addition made at the office does not
appear at the door until the 5-minute parachute fires. Because the parachute
*does* fire, this defect hides: it degrades LIVE-01 to LIVE-04 without any error.

### Pitfall 2: forgetting `private: true` on one of the two sides

**What goes wrong:** the channel joins successfully, no policy error appears, and
no message ever arrives.
**Why it happens:** the flag exists in two places — `realtime.send(..., true)` in
SQL and `{ config: { private: true } }` on the client — and they must match.
*"A public broadcast only reaches public channels and a private broadcast only
reaches private channels."* [CITED:
supabase.com/docs/guides/realtime/broadcast, checked 2026-08-11]
**How to avoid:** both, in the same plan step, verified by the door procedure
"check in on device A, watch device B" rather than by reading the code.
**Warning signs:** `subscribe` reports `SUBSCRIBED`, the band never appears
(because the channel *is* live), and the list only ever changes every 5 minutes.
The most deceptive failure in this phase.

### Pitfall 3: topic case and the byte-exact match

**What goes wrong:** the client subscribes to `door:A1B2…` while the database
sends to `door:a1b2…`; the join succeeds (if the policy regex is
case-insensitive) and nothing arrives.
**Why it happens:** Postgres renders `uuid::text` **lowercase**; a uuid arriving
from an API response or a URL may not be. Topic matching in Realtime is a string
comparison, not a uuid comparison.
**How to avoid:** `.toLowerCase()` on the client, and a **case-sensitive**
`[0-9a-f]` regex in the policy so a mismatched case is refused loudly at join
time rather than silently at delivery time. Refusing the join is the better
failure: it sets `channelLive = false`, which the band shows.
**Warning signs:** identical to Pitfall 2, which is why the policy regex should be
the strict one.

### Pitfall 4: casting the topic to `uuid` without a guard

**What goes wrong:** a client subscribes to `door:banana`; the policy raises
`22P02 invalid input syntax for type uuid`; the connection is refused with
`RlsPolicyError` — and, because policy evaluation happens once per connection,
this can affect the *connection*, not just that channel.
**Why it happens:** the topic is untrusted input, and `AND` does **not**
short-circuit in Postgres: *"The order of evaluation of subexpressions is not
defined… When it is essential to force evaluation order, a `CASE` construct can be
used."* [CITED: postgresql.org/docs/current/sql-expressions.html, checked
2026-08-11]
**How to avoid:** the `CASE` form in Pattern 5. Regex first, cast only inside the
`THEN`.
**Warning signs:** `RlsPolicyError` in the project's Realtime logs; a door that
joins nothing at all.

### Pitfall 5: treating `CHANNEL_ERROR` as an answer about the operator

**What goes wrong:** the door shows "you are not authorised for this night" when
in fact the JWT expired, the join rate limit was hit, or Realtime restarted.
**Why it happens:** the server's `Unauthorized` code is genuinely one of the
causes, so the wrong inference is a *reasonable* one.
**How to avoid:** D-38-04, enforced structurally — the status callback writes only
to `setChannelLive`.
**Warning signs:** any sentence about permission that originates in the channel
code. Grep for it.

### Pitfall 6: the merge that runs during a scan

**What goes wrong:** the offline verdict is late, occasionally by enough to
matter, because `mergeAttendees` holds a `readwrite` transaction on the same
IndexedDB object store the verdict reads.
**Why it happens:** it is invisible in code review — both sides look like plain
`await`s.
**How to avoid:** the `isProcessingRef` deferral gate (Pattern 2), which is the
mechanism, not a convention.
**Warning signs:** procedure P4 shows verdict latency moving under throttling.

### Pitfall 7: a second Supabase browser client

**What goes wrong:** two WebSockets, two policy evaluations, and — because
`refresh_token_rotation_enabled` is true with a 10 s reuse window — a possible
failed refresh and sign-out at the door.
**Why it happens:** `createClient()` in `src/lib/supabase/client.ts` *looks* like
it constructs one each call.
**How to avoid:** it does not — `@supabase/ssr` 0.8.0 caches a module-level
singleton in the browser (`createBrowserClient.ts:101-107`). Do not add a second
factory, and do not pass per-call `realtime` options expecting them to apply (the
first caller's options win, silently).

### Pitfall 8: `private_only` cannot be read back

**What goes wrong:** the hardening step "restrict this project to private
channels" is applied and believed, but never verified.
**Why it happens:** `PATCH /v1/projects/{ref}/config/realtime` accepts
`private_only: boolean`, but the corresponding **`GET` does not return it**
[VERIFIED: `GET` on this project returned `max_concurrent_users`,
`max_events_per_second`, `max_joins_per_second`, `max_channels_per_client`,
`max_bytes_per_second`, `max_presence_events_per_second`,
`max_payload_size_in_kb`, `suspend`, `presence_enabled` — and no `private_only`,
2026-08-11].
**How to avoid:** if it is applied, prove it behaviourally — attempt a **public**
channel join and observe the `PrivateOnly` error code. And note that changing
Realtime settings *"will disconnect all your connected clients"* [CITED:
supabase.com/docs/guides/realtime/settings, checked 2026-08-11], so it must never
be done during a night.
**Note:** this hardening is **optional for LIVE-06**. Because the database sends
`private = true`, a public subscriber to the same topic receives nothing anyway.
It is defence in depth, not the boundary.

---

## Code Examples

### Reading `realtime.send`'s contract from the live database

```bash
# The verification that settles "can an emit break a check-in?" — run against the
# real database, read-only. This exact command produced the finding below.
set -a && . ./.env.local && set +a
curl -s -X POST \
  "https://api.supabase.com/v1/projects/<project-ref>/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"select prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='"'"'realtime'"'"' and proname='"'"'send'"'"';","read_only":true}'
```

Result, 2026-08-11 (abridged):

```sql
BEGIN
  BEGIN
    generated_id := gen_random_uuid();
    IF payload ? 'id' THEN final_payload := payload;
    ELSE final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id)); END IF;
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
```

Two conclusions, both load-bearing: **(1)** the emit cannot abort the transaction
it hangs off — the whole insert is inside `EXCEPTION WHEN OTHERS`; **(2)** an
empty `'{}'::jsonb` payload becomes exactly `{"id": "<random uuid>"}` and nothing
else, which is what "carries the fact, not the row" means concretely (D-38-01).

The `read_only: true` form runs as `supabase_read_only_user` (verified: `select
current_user` returned it), which makes it a safe probe to repeat during
verification.

### Checking the policy admits exactly the right set

```bash
# Read-only. Must return exactly the one policy this phase adds, after the migration.
-d '{"query":"select policyname, cmd, roles::text, qual from pg_policies where schemaname='"'"'realtime'"'"' and tablename='"'"'messages'"'"';","read_only":true}'
```

Baseline captured **before** this phase: `[]` — zero policies in the `realtime`
schema, with `relrowsecurity = true` on `realtime.messages`. So the surface starts
closed, and this probe going from `[]` to exactly one `SELECT` row is a complete
statement of what the migration changed.

### The subscribe status vocabulary, verified in the installed version

```
REALTIME_SUBSCRIBE_STATES = { SUBSCRIBED, TIMED_OUT, CLOSED, CHANNEL_ERROR }
```

[VERIFIED: `node_modules/@supabase/realtime-js/dist/main/RealtimeChannel.js:27-30`,
version 2.97.0, read 2026-08-11]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `postgres_changes` as the default way to get live data | **Broadcast is the recommended method** — *"This is the recommended method for scalability and security"* vs. Postgres Changes *"simpler… but does not scale as well"* | Current Supabase docs | Confirms D-38-01's direction independently of the PII argument |
| `realtime.messages` policies as an opt-in nicety | **Realtime Authorization is required and enabled by default** for database broadcasts | Current | The starting state on this project (RLS on, zero policies) is closed, not open |
| Send from a server with `channel.send()` over a WebSocket | `channel.httpSend()` for a stateless server-side send | **supabase-js 2.107.0** | **Not available at 2.97.0.** Recorded so nobody plans around it |
| Broadcast payloads JSON only | Binary payloads (`ArrayBuffer`) | supabase-js 2.91.0 | Available but irrelevant — the payload is empty by design |
| No message history | Broadcast Replay (`config.broadcast.replay`) | supabase-js 2.74.0 | Available, and **deliberately not used**: D-38-06 says the channel does not replay what happened while it was down; a full reload does. Replay would be a second, weaker source of truth |

**Deprecated/outdated:**

- `anon` / `service_role` legacy keys: Supabase now issues publishable
  (`sb_publishable_…`) and secret (`sb_secret_…`) keys and states the legacy keys
  *"will be deprecated by the end of 2026"* [CITED:
  supabase.com/docs/guides/realtime/broadcast, checked 2026-08-11]. This project
  uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. **Out of
  scope for this phase** — but it is a dated deadline against a working system,
  and it belongs in the backlog rather than being discovered in December.

---

## Project Constraints (from CLAUDE.md and `.claude/rules/`)

| Constraint | Consequence for this phase |
|-----------|----------------------------|
| **No test runner exists for the product.** No `test` script, no `*.test.*`/`*.spec.*` | Nothing here may be called verified because tests pass. Verification = `npm run build` + the written procedures in § Validation Architecture |
| **`npm run build` is `next build --webpack`** | The webpack flag is required for `@serwist/next` to build the service worker. Do not "modernise" it to Turbopack while in this file |
| **No Supabase CLI on this machine** | The migration is applied via `POST /v1/projects/{ref}/database/migrations` with `SUPABASE_ACCESS_TOKEN` from `.env.local` — **not** `supabase db push`, and **not** `/database/query`, which would leave the migration history untruthful. `/database/query` with `read_only: true` is fine for probes |
| **Migrations are the schema source of truth**; `supabase/schema.sql` has zero `CREATE POLICY` | The policy, the helper and the four triggers all live in one new migration file, in one transaction |
| **No error tracking** (`package.json` has no monitoring dependency) | A failed emit raises a Postgres `WARNING` no human will read. The door's own screen is the only observer — which is why D-38-11's indicator is the observability, and why the 5-minute parachute is not optional |
| **The repository is PUBLIC**; `.planning/` is tracked | This document names roles ("a staff member assigned to the door"), never people; no venue in negotiation, no unannounced date, no line-up. The project ref in the probe commands above is written as `<project-ref>`, and the concrete value stays in `.env.local` |
| **None of the four Supabase clients is parameterised with `Database`** | See § What a Green Build Proves, below |
| **macOS/BSD** | `grep -E`, `sed -i ''` |
| `access-gating.md`, gate *RLS-è-il-confine* | The policy **is** the boundary. The client's `private: true` is how the boundary gets consulted, not the boundary itself |
| `access-gating.md`, gate *service role* | This phase adds **no** new service-client use. The emit runs as the trigger owner inside the database, not as the service key from a route |
| `checkin-offline.md`, gate *offline-first* | The channel is additive. Every existing behaviour with the radio off must be unchanged, and P2/P3 are the proof |
| `checkin-offline.md`, gate *il fallimento va visto* | `channelLive` and the age are the visible form of a failure that would otherwise be silent |
| `meta-gates.md`, monotone guards | None of the three one-way switches is touched. The triggers on `tickets`/`ticket_refunds` do not read or write payment state; state this in the migration header |
| `nextjs-architecture.md`, dark-venue accessibility | The counter row becomes a real `<button>`, one large one-handed target, reachable without moving the camera |

### What a Green Build Proves

`next build` runs the TypeScript check, and the Realtime API *is* typed
independently of the `Database` generic — `channel`, `on('broadcast', …)`,
`subscribe`, `removeChannel`, `realtime.setAuth`, `realtime.onHeartbeat` and the
`REALTIME_SUBSCRIBE_STATES` union all come from `@supabase/realtime-js`'s own
declarations. So a green build **does** prove the client methods exist with the
signatures used, and that the status union is handled exhaustively if written as
such.

A green build proves **none** of the following, and each needs its own evidence:

- that the topic string the client subscribes to matches the topic the trigger
  sends to (both are plain strings on both sides — Pitfalls 2 and 3);
- that `'door.operate'` is spelled correctly in the policy (it is a SQL string
  literal, and a typo yields a permanently-false predicate and a permanently
  refused channel);
- that any column named in the migration exists — because no client is
  parameterised with `Database`, no query in this codebase is column-checked at
  build time, and a migration is not type-checked at all;
- that the policy admits the intended set and refuses the rest.

The last two are what the SQL probes and the door procedures are for. Saying this
out loud is the point: in this repository a green build is a narrow claim, and
this phase is one where the gap between "compiles" and "works" is exactly where
the requirement lives.

---

## Runtime State Inventory

Not a rename or migration phase, but the same question — *what carries state
outside the repository?* — has real answers here, so it is answered rather than
omitted.

| Category | Items found | Action required |
|----------|-------------|-----------------|
| Stored data | `realtime.messages` — Supabase-managed, daily partitions, dropped after 72 h–4 days. **2 partitions exist today** on this project (probe, 2026-08-11), so the janitor has run and a client has connected at some point | None. Nothing of ours is stored: the payload is `{"id": <uuid>}` |
| Live service config | Realtime project config, **not in git**: `max_concurrent_users: 200`, `max_events_per_second: 100`, `max_joins_per_second: 100`, `max_channels_per_client: 100`, `max_bytes_per_second: 100000`, `max_payload_size_in_kb: 256`, `presence_enabled: false`, `suspend: false` (probe, 2026-08-11). `private_only` is patchable but **not returned by GET** | Confirm `suspend: false` before the first night. Treat `private_only` as optional hardening with a behavioural proof (Pitfall 8) |
| OS-registered state | None | — |
| Secrets / env vars | `SUPABASE_ACCESS_TOKEN` (Management API, already present), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already used by the browser client). **No new secret** | None |
| Build artifacts | Service worker built by `@serwist/next` during `next build --webpack`. A WebSocket is not intercepted by a service worker, so the SW needs no change | None — but do not switch the build to Turbopack |
| Auth config | `jwt_exp: 3600`, `refresh_token_rotation_enabled: true`, `security_refresh_token_reuse_interval: 10`, `sessions_timebox: 0`, `sessions_inactivity_timeout: 0` (probe, 2026-08-11) | None changed. Recorded because § Token Expiry depends on all five |

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@supabase/supabase-js` | the channel client | ✓ | 2.97.0 | — |
| `@supabase/realtime-js` | ditto (transitive) | ✓ | 2.97.0 | — |
| `@supabase/ssr` | `createBrowserClient` singleton | ✓ | 0.8.0 (`^0.8.0`) | — |
| Supabase Realtime service (project) | everything | ✓ | `suspend: false` | none — this is a hard prerequisite |
| `realtime.send`, `realtime.topic`, `realtime.messages` | emit + policy | ✓ | present, signatures verified | none |
| `private.has_capability(text, uuid)` | the policy | ✓ | present, both arms | none — and no substitute is acceptable |
| Supabase Management API (`api.supabase.com`) | applying the migration; read-only probes | ✓ | reachable, `SUPABASE_ACCESS_TOKEN` valid | none |
| **Supabase CLI** | — | **✗** | — | Management API migrations endpoint (already the project's method) |
| Test runner | — | **✗ by decision** | — | `npm run build` + written manual procedures (CLAUDE.md Guardrail 1) |
| Error tracking / monitoring | — | **✗** | — | The door's own screen (D-38-11) |
| Firecrawl (research only) | this document | ✓ | CLI 1.9.8, cloud API | — |

**Missing dependencies with no fallback:** none that block. Realtime is enabled;
every SQL object the design calls already exists.

**Missing dependencies with fallback:** Supabase CLI (Management API), test
runner (build + written procedures), monitoring (the door's screen).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None.** `package.json` has no `test` script and the repository contains no `*.test.*` or `*.spec.*` file. This is a recorded project decision (CLAUDE.md, Environment Guardrail 1), not a gap to fill in Wave 0 |
| Config file | none — see above |
| Quick run command | `npm run build` (Next's typecheck; note `--webpack`, required for the Serwist plugin) |
| Full suite command | `npm run build` + the SQL probes below + the door procedures P1–P4 |

Because no automated suite exists, "validation" here means **four classes of
evidence**, each of which is either a command with output or a written procedure
with an observation. A claim with neither does not count.

| Class | What it is | Repeatable by another person? |
|-------|-----------|-------------------------------|
| **B — Build** | `npm run build` exits 0 | Yes |
| **G — Grep / structural** | a `grep`/`awk` command that must print nothing (or a fixed thing) | Yes |
| **S — SQL probe** | a `read_only: true` Management API query against the real database, with its expected result | Yes |
| **D — Door procedure** | a written manual procedure naming role, setup, and what must be observed | Yes, and it is the only evidence for anything involving a camera, a pocket or a queue |

### Phase Requirements → Evidence Map

| Req ID | Behaviour | Class | Command / procedure | Exists? |
|--------|-----------|-------|---------------------|---------|
| LIVE-01 | The list updates by itself while the device has network | **D** | Two devices, same night, both with `door.operate`. Check in a code on A. B's counter must change **without anyone touching B**, within ~2 s | ❌ to write |
| LIVE-01 | Every write path emits | **S** | After the migration: `select tgname, tgrelid::regclass::text from pg_trigger where not tgisinternal and tgrelid::regclass::text in ('door_scan_events','tickets','guest_list_entries','ticket_refunds')` — must return the four new triggers | ❌ to write |
| LIVE-01 | The event-level (`party_id IS NULL`) fan-out works | **D** | Add a guest-list entry with no party on an event with ≥2 nights; both doors must reload. This is Pitfall 1, and it is the one nobody thinks to try | ❌ to write |
| LIVE-02 | Verdict never waits on the channel | **G** | `awk '/const handleVerify/,/^  };$/' ScannerClient.tsx \| grep -nE 'channel\|Channel\|realtime\|channelLive'` → must print nothing. Repeat for `ticketOffline`, `membershipOffline`, `ticketOnline`, `membershipOnline` | ❌ to write |
| LIVE-02 | Verdict with the channel dropped / degraded / never established | **D** | Procedures **P1, P2, P4** in § The LIVE-02 Proof | ❌ to write |
| LIVE-02 | A reload defers behind a scan in progress | **G** | `grep -n "isProcessingRef.current" ScannerClient.tsx` must show the guard inside `requestReload` and the drain inside `dismissFlash` | ❌ to write |
| LIVE-03 | Every reconnection triggers a full reload | **D** | Procedure **P2** (c) — network restored, reload happens untouched. Procedure **P3** (a) — resume after >65 min | ❌ to write |
| LIVE-04 | The safety reload runs, and re-arms | **D** | Procedure **P1** (c) — band appears at ~5 min with the channel blocked. Plus: with the channel healthy and no scans, the counter must reset every 5 min | ❌ to write |
| LIVE-04 | It does not run while hidden | **G** | `grep -n "visibilityState" ScannerClient.tsx` — the interval must be cleared on hidden and re-armed on visible | ❌ to write |
| LIVE-05 | Freshness is visible and a manual reload exists | **D** | Open the night. The counter row reads `updated Ns ago` and N climbs. Tap it: N returns to 0. Do it one-handed, screen at minimum brightness | ❌ to write |
| LIVE-05 | The band appears when stale or when the channel is down | **D** | Procedure **P1** (c) and **P2** (b) | ❌ to write |
| LIVE-06 | A person not assigned to the night receives nothing | **D + S** | **S:** `select policyname, cmd, roles::text from pg_policies where schemaname='realtime'` → exactly one `SELECT` policy. **D:** sign in as an approved `member` with no assignment, open the door URL for that night (the middleware will redirect — so drive the subscription from a scratch page or the Realtime Inspector with that user's JWT) and observe `CHANNEL_ERROR`, never a message | ❌ to write |
| LIVE-06 | No client can *send* on the topic | **S** | `select policyname, cmd from pg_policies where schemaname='realtime'` must show **no** `INSERT` policy. With RLS on, that is the proof | ❌ to write |
| LIVE-06 | The predicate is the same one the door already uses | **G** | `grep -n "has_capability" <new-migration>.sql` must show `'door.operate'` and must **not** introduce any new function that resolves assignment | ❌ to write |
| LIVE-07 | Door and bar share no offline mechanism | **G** | `grep -rn "offline/checkin-store" src --include='*.ts' --include='*.tsx'` must still list `ScannerClient.tsx` and nothing else; and no new file under `src/lib/` may be imported by both the door and any bar surface | ❌ to write |
| all | It compiles | **B** | `npm run build` | ✅ exists |

### Sampling Rate

- **Per task commit:** `npm run build` (and `npm run verify:persona` only if a
  persona file was touched — it will not be).
- **Per wave merge:** `npm run build` + every **G** check + every **S** probe.
- **Phase gate:** all of the above, plus **D** procedures P1, P2, P3, P4 and the
  two-device LIVE-01 procedure, each written down with its observation and the
  time it was performed — before `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] **No framework to install.** The absence of a test runner is a project
      decision, not a gap. Do not add one in this phase.
- [ ] `docs/` or the plan must carry the written text of procedures P1–P4 and the
      two-device LIVE-01 procedure **before** any of them is executed — a
      procedure written after the observation is a description, not a check.
- [ ] Capture the `realtime` policy baseline **before** the migration:
      `select policyname, cmd, roles::text from pg_policies where
      schemaname='realtime'` → expected `[]` (captured 2026-08-11). Without the
      before-figure, "one policy exists" is not evidence of what changed.
- [ ] Confirm `GET /v1/projects/{ref}/config/realtime` still returns
      `suspend: false` on the day of the first night.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control in this phase |
|---------------|---------|-------------------------------|
| V2 Authentication | yes | The socket authenticates with the session JWT via `realtime.setAuth()`. No new credential, no new login path. Token lifetime 3600 s, rotation on |
| V3 Session Management | yes | § Token Expiry. The session is not extended, shortened or re-implemented; the one behaviour added is *re-authenticate the socket on resume* |
| V4 Access Control | **yes — the centre of the phase** | One RLS `SELECT` policy on `realtime.messages` calling `private.has_capability('door.operate', <party>)`. No new predicate, no client-side filter, no `INSERT` policy |
| V5 Input Validation | yes | The channel topic is **untrusted client input**. It is regex-validated before any cast, inside a `CASE` so the order is guaranteed (Pitfall 4) |
| V6 Cryptography | no | Nothing is signed, encrypted or hashed by this phase |
| V7 Error Handling & Logging | yes | Every channel state gets its own `console` category (`scanner:channel_not_listening`, `scanner:reload`), never a collapsed generic message. In a repo with no error tracking, the visible band is the real control |
| V8 Data Protection | **yes** | The payload is empty by construction. `realtime.send` adds only a random `id`. No name, no email, no refund detail crosses the channel — D-38-01, and it is enforced by *what is sent*, not by what the client chooses to ignore |
| V13 API & Web Service | partial | No new HTTP endpoint. The reload reuses `/api/tickets/attendance`, whose redaction is unchanged |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Mitigation here |
|---------|--------|-----------------|
| Subscribing to another night's topic | Information disclosure | RLS on `realtime.messages` keyed to the topic via `realtime.topic()`, resolved by `private.has_capability` |
| Injecting a forged "list changed" message to force reloads | Denial of service / Tampering | **No `INSERT` policy** on `realtime.messages`. `authenticated` holds the table grant but RLS refuses every row, so only the database can send |
| Reading PII off the wire | Information disclosure | The payload is empty. Even a subscriber who somehow joined learns only *that* something changed on a night whose id they already knew |
| Error-based enumeration via the topic | Information disclosure | The regex refuses malformed topics before any cast; a well-formed but unauthorised topic yields the same `Unauthorized` as any other. The client cannot distinguish "no such night" from "not your night" |
| Join storms exhausting the project's quota | DoS | `max_joins_per_second: 100`, `max_concurrent_users: 200` on this project; the library's own backoff is the only retry loop (do not add a second) |
| A poisoned emit aborting a check-in | Denial of service on the door | Structurally impossible: `realtime.send` catches everything and raises a WARNING (verified from the function body) |
| Token replay after revocation | Elevation of privilege | Realtime disconnects a client whose JWT expires without a replacement; policies are re-evaluated on each new connection and on each `access_token` push |
| A stale policy cache admitting a revoked assignment | Elevation of privilege | **Real and worth stating:** *"Client access policies are cached for the duration of the connection."* An assignment revoked mid-night does **not** kick an already-joined listener off the channel until the connection cycles (heartbeat drop, token push, or reconnect). What it *does* do, immediately, is stop that account from reading `/api/tickets/attendance` — the reload is the thing that carries the data, and the reload is refused. So the exposure is "hears that something changed", not "sees who". Record it; do not engineer around it in this phase |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong | What would settle it |
|---|-------|---------|---------------|----------------------|
| A1 | An iOS home-screen PWA fires `visibilitychange` → `visible` on resume from suspension, and `pageshow` on a bfcache restore | Reconnection Detection | The resume reload never fires; the door falls back to the 5-minute parachute (degraded LIVE-01, LIVE-03 unmet) | Procedure **P3** on the actual staff phone. Per-event support is already verified from MDN BCD; the *ordering* on a suspended standalone PWA is not |
| A2 | A device with a queue in front of it produces enough scans that the 5-minute safety reload effectively never fires | The 5-Minute Safety Reload | None — it would fire, which is its job. Only the "this is not polling" argument weakens | Count `scanner:reload` entries with `reason: "safety"` over one night |
| A3 | Coalescing at 500 ms is enough for a rush at the door and short enough not to feel stale | Pattern 2 | Too short: several reloads per scan. Too long: a visible lag | Observe during P-two-device; adjust once, with the number written down |
| A4 | `event_parties` stays small enough that the NULL-party fan-out is cheap | Where the Signal Is Emitted | A slow trigger on a money table | It holds 3 rows today (probe, 2026-08-11). Re-check if an event ever carries many nights |
| A5 | The Realtime policy cache means a mid-night revocation does not disconnect an existing listener | Security Domain | The exposure window is longer than stated | Documented behaviour, not measured here. Settled by revoking an assignment on a test night with a listener attached and watching whether messages stop |
| A6 | `channelLive` derived from `subscribe` status + `onHeartbeat` is accurate enough to drive the band | Freshness Display | The band appears when the channel is fine, or stays hidden when it is not — the second is the dangerous one | P1 and P2 both check the band directly |

Everything else in this document is tagged `[VERIFIED]` against either current
Supabase/PostgreSQL/MDN documentation, this project's installed `node_modules`,
or a read-only probe of this project's database, with the date beside it.

---

## Open Questions (RESOLVED 2026-08-11)

> All four were decided at plan time and are traceable to a numbered decision.
> The heading carries the marker this repository already uses at
> `31-RESEARCH.md:1071`, so a later reader cannot mistake a closed question for
> an open one.

1. **Should `private_only: true` be applied to the project?** — **RESOLVED, D-38-15: no, not this phase.**
   - What we know: it is patchable via `PATCH /v1/projects/{ref}/config/realtime`
     with the token already in `.env.local`; it disconnects every connected client
     when changed; and `GET` does not echo it back.
   - What's unclear: whether the owner wants a project-wide setting changed for a
     door feature, given it is defence in depth rather than the boundary (the
     boundary is the policy, and a public subscriber receives nothing from a
     private send).
   - Recommendation: **do not apply it in this phase.** Record it as a hardening
     item with its own precondition ("never during a night") and its own
     behavioural proof (`PrivateOnly` on a public join).

2. **Should `worker: true` be adopted in `src/lib/supabase/client.ts`?** — **RESOLVED, D-38-14: no; `onHeartbeat` is taken instead and `client.ts` stays untouched.**
   - What we know: it is the vendor's recommendation for background heartbeat
     survival; it must be set at construction; `createBrowserClient` is a
     singleton, so the change is product-wide and lands in a file governed by
     `access-gating.md`.
   - What's unclear: whether it helps at all on the device that matters, since an
     iOS PWA is suspended rather than throttled.
   - Recommendation: **no, this phase.** Take `onHeartbeat` (no construction
     change) and leave the worker recorded.

3. **Does a search-filtered live reload leaving the offline cache un-merged
   matter?** — **RESOLVED, D-38-22: accepted as written, with the sentence placed beside the call.**
   - What we know: `fetchAttendance(search)` deliberately skips `mergeAttendees`.
     The search box is used for seconds; the cache catches up on the next
     unfiltered fetch, and the safety timer re-arms regardless.
   - Recommendation: accept it, and write the sentence into the code beside the
     call so the next reader does not "fix" it into a cache-clobbering merge of a
     filtered list — which is precisely the shrinking-payload case
     `mergeAttendees` refuses.

4. **Does anything need to emit for `attendances` (the membership register)?** — **RESOLVED, D-38-20: no trigger on `attendances`; `door_scan_events` covers the door action.**
   - What we know: `/api/tickets/attendance` reads `tickets`,
     `guest_list_entries`, `ticket_refunds`, `profiles`, `ticket_tiers` — **not**
     `attendances`. A membership admission does, however, always write a
     `door_scan_events` row, which the trigger covers.
   - What's unclear: whether the attendee list is *supposed* to show membership
     admissions. That is a question about the list, not about freshness.
   - Recommendation: **out of scope.** Emit from `door_scan_events` (which covers
     the door action) and do not add a trigger on `attendances`. If the list
     should show membership admissions, that is a different requirement in a
     different phase.

---

## Sources

### Primary (HIGH confidence)

- **This project's live database**, read-only via
  `POST /v1/projects/{ref}/database/query` with `read_only: true` (runs as
  `supabase_read_only_user`), 2026-08-11 —
  `realtime.send` / `realtime.broadcast_changes` / `realtime.topic` signatures and
  `realtime.send`'s body; `realtime.messages` RLS state, ACL and partition count;
  zero policies in schema `realtime`; `private.has_capability` definition
  (`SECURITY DEFINER`, `STABLE`, `search_path=''`, both arms);
  `party_assignments` constraint set; `event_parties` row count; column presence
  on `tickets`, `guest_list_entries`, `ticket_refunds`, `attendances`,
  `door_scan_events`.
- **This project's Management API config**, 2026-08-11 —
  `GET /v1/projects/{ref}/config/realtime` and `/config/auth`; the
  `UpdateRealtimeConfigBody` schema from `https://api.supabase.com/api/v1-json`.
- **Installed `node_modules`**, 2026-08-11 — `@supabase/supabase-js` 2.97.0
  (`SupabaseClient.ts:160-172, 339-341, 398-418`), `@supabase/realtime-js` 2.97.0
  (`RealtimeClient.ts:49-56, 435-442, 511-513, 686-716, 760-790, 831-875, 920-932`;
  `RealtimeChannel.ts:143-192, 217`; `dist/main/RealtimeChannel.js:27-30`),
  `@supabase/auth-js` 2.97.0 (`GoTrueClient.ts:3029-3095`, `lib/constants.ts`),
  `@supabase/ssr` 0.8.0 (`createBrowserClient.ts:101-160`).
- supabase.com/docs/guides/realtime/broadcast — checked 2026-08-11
- supabase.com/docs/guides/realtime/authorization — checked 2026-08-11
- supabase.com/docs/guides/realtime/subscribing-to-database-changes — checked 2026-08-11
- supabase.com/docs/guides/realtime/error_codes — checked 2026-08-11
- supabase.com/docs/guides/realtime/settings — checked 2026-08-11
- supabase.com/docs/guides/troubleshooting/realtime-warn-sending-broadcast-message — checked 2026-08-11
- supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794 — checked 2026-08-11
- postgresql.org/docs/current/sql-expressions.html — evaluation order and `CASE`; checked 2026-08-11
- MDN browser-compat-data, raw JSON (`api/Document.json`, `api/Window.json`,
  `api/PageTransitionEvent.json`) — checked 2026-08-11
- **This repository**, read 2026-08-11 —
  `src/app/(admin)/admin/scanner/ScannerClient.tsx`,
  `src/app/api/tickets/attendance/route.ts`,
  `src/app/api/tickets/checkin/route.ts`,
  `src/app/api/tickets/checkin/undo/route.ts`,
  `src/app/api/membership/verify/route.ts`,
  `src/lib/offline/sync-manager.ts`, `src/lib/supabase/client.ts`,
  `supabase/migrations/20260807000000_capability_model.sql`,
  `supabase/migrations/20260809000000_party_assignments.sql`,
  `supabase/migrations/20260809001000_assignment_resolver.sql`,
  `supabase/migrations/20260809004000_door_scan_events_by_assignment.sql`,
  `package.json`, `.planning/config.json`.

### Secondary (MEDIUM confidence)

- Ordering of resume events on a suspended iOS home-screen PWA — reasoned from
  per-event MDN support plus the absence of the Page Lifecycle API in WebKit.
  Marked **A1**; settled by procedure P3.

### Tertiary (LOW confidence)

- None. Nothing in this document rests on an unverified search result.

---

## Metadata

**Confidence breakdown:**

- **Mechanism and authorisation:** HIGH — every API name, function signature,
  policy helper and client method was read from either current official
  documentation or this project's own database and `node_modules`, with the date
  recorded. Two of the load-bearing facts (`realtime.send` cannot raise; zero
  policies exist today) came from the live database rather than from docs.
- **Emission design:** HIGH on the mechanics, HIGH on the write-path census
  (enumerated from the code, seven paths), MEDIUM on the trigger-versus-handler
  recommendation — it is a judgement, argued from the direction of failure rather
  than measured.
- **Reconnection and token expiry:** HIGH on every individual fact (all verified
  from library source and project config); MEDIUM on the composite behaviour of a
  suspended iOS PWA, which is A1.
- **Pitfalls:** HIGH. Each one is anchored to a line of this repository, a line of
  the installed library, or a sentence of official documentation. Pitfall 1 in
  particular is derived from `attendance/route.ts`'s own comment and is the one
  most likely to be missed.
- **Freshness display and the 5-minute reload:** MEDIUM — the mechanics are
  certain, the numbers (5 s tick, 500 ms coalescing) are proposals with A2/A3
  attached.

**Research date:** 2026-08-11
**Valid until:** 2026-09-10 for the Supabase Realtime API surface (stable, but
`httpSend` landing at 2.107.0 shows the client moves); **re-check on any
`@supabase/supabase-js` upgrade**, since three findings here are version-pinned
to 2.97.0.
</content>
</invoke>
