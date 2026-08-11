# Phase 38: Live Attendance Freshness - Context

**Gathered:** 2026-08-11
**Status:** Ready for planning

<domain>
## Phase Boundary

The attendee list on the door's device updates by itself while the device has
network, and never stands between a scan and its verdict.

**In scope:** a push channel that tells the door "this night's list changed",
the reload discipline underneath it (reconnection + safety), the visible state
of freshness at the door, and the authorisation that keeps a night's updates to
the people assigned to that night.

**Out of scope:** any new surface, any new list, and any change to how a scan is
decided. The scan path is untouched by this phase — it already decides from the
local cache (`ScannerClient.tsx:1100`) and must keep doing so with the channel
dropped, degraded, or never established.

</domain>

<decisions>
## Implementation Decisions

### What travels on the channel

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

### Authorisation of the channel

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

### Reloads underneath the channel

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

### What the door sees

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

### Separation of door and bar

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 38: Live Attendance Freshness" (lines 506-519) —
  goal, dependencies (Phases 31, 32, 35), and the five success criteria
- `.planning/REQUIREMENTS.md` lines 104-110 — LIVE-01 … LIVE-07, verbatim
- `.planning/STATE.md` line 137 — the owner's pre-planning decision: **push
  channel, not polling**; mandatory full reload on every reconnection;
  infrequent safety reload underneath. Not re-opened at plan time.

### Domain gates (persona modules — read the gates, not just the code)
- `.claude/rules/checkin-offline.md` — the door's reference scenario, the
  asymmetry that sets the defaults, the durable-queue and immediate-feedback
  gates, and "a failure must be seen, not only handled"
- `.claude/rules/access-gating.md` — RLS is the boundary, the middleware is UX;
  the two axes (role, status)
- `.claude/rules/nextjs-architecture.md` — client-bundle secrets, uncacheable
  per-user surfaces, dark-venue accessibility, and why the door sits outside
  `(work)`
- `.claude/rules/meta-gates.md` — cross-domain impact, monotone guards, and the
  zero-silent-failure control in a repo with **no error tracking**

### Code that constrains this phase
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — the only consumer of the
  offline store. Relevant anchors: `:531-535` online/offline listeners,
  `:641-663` the attendance fetch, `:752` `cacheDoorAuth`, `:791-807` merge
  refusal surfacing, `:820-861` member-roster refresh, `:895` reload after a
  scan, `:1100` the offline scan decision, `:2317` the counter row
- `src/app/api/tickets/attendance/route.ts` — the composed, redacted payload;
  `:259` no email by construction, `:355` when a refunded ticket names nobody,
  `:704-751` the separate-fetch-then-Map rule instead of a join
- `src/lib/offline/checkin-store.ts` — `mergeAttendees` (`:696`) and its
  typed refusals (`:649-658`); the merge is the only writer of the cached list
- `src/lib/offline/sync-manager.ts` — the queue drain piggybacked on a
  successful fetch

### Prior phases this one stands on
- `.planning/phases/32-capability-model-in-the-database/32-VERIFICATION.md` —
  the single definition of a capability, in the database
- `supabase/migrations/20260809000000_party_assignments.sql`,
  `20260809001000_assignment_resolver.sql`,
  `20260809004000_door_scan_events_by_assignment.sql`,
  `20260809005000_live_assignment_flag.sql` — how "assigned to this night" is
  expressed and resolved; the channel's authorisation must ask the **same**
  question these ask
- `.planning/phases/31-live-defects-at-the-door-and-the-bar/31-RESEARCH.md`
  §"Project Constraints" — the constraint table this phase inherits (no test
  runner, build is the type gate, migrations are the schema truth)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`fetchAttendance` in `ScannerClient.tsx`** — the single fetch site, already
  handling merge refusals, diagnostics notices, roster refresh and queue drain.
  The channel message reuses it; it does not get a sibling.
- **`mergeAttendees` (`checkin-store.ts:696`)** — already merges rather than
  clears (the Phase 31 fix), and already refuses an empty or shrinking payload
  as a **typed value**. A live reload inherits that protection for free.
- **`cacheDoorAuth` / `readDoorAuth` (`checkin-store.ts:1361`, `:1393`)** — the
  door's cached verdict on who the operator is; the channel reads it, never
  re-decides it.
- **Cache-notice mechanism (`setCacheNotices`)** — the existing tone-tagged
  notice channel at the door. The staleness band belongs to the same family and
  should not invent a parallel one.

### Established Patterns
- **A refusal travels as a return value, never as a thrown message** —
  `mergeAttendees` returns `MergeResult`; phase 36 and 37 both locked this for
  Server Actions because Next redacts thrown messages in production. Anything
  the channel layer refuses must follow it.
- **`.single()` throws on 0 and on >1** — "not found" and "duplicate" are
  different errors and are logged differently.
- **Evidence, never authority** — the device clock is displayed, never branched
  on (`ScannerClient.tsx:740-745`). "Updated Ns ago" is a *display* of drift-
  prone local time; nothing may refuse or admit because of it.

### Integration Points
- Channel subscribe/unsubscribe hangs off `selectedPartyId`, the same state that
  already gates every fetch (`ScannerClient.tsx:884-890`).
- Reconnection triggers must join the existing `online` listener block
  (`:531-535`) rather than register a second, competing set.
- Authorisation must resolve through the Phase 35 assignment model, not through
  a new predicate — a second definition of "assigned to this night" is the
  failure Phase 32 was built to prevent.

</code_context>

<specifics>
## Specific Ideas

- The owner wants the door's screen to stay **quiet when everything is fine** —
  it is already the busiest screen in the product. Every element proposed for it
  must justify itself against that, and the accepted answer (D-38-10) adds
  information to a row that already exists rather than a new element.
- The counter row `12 / 40` with its progress bar is the place staff already
  look; that is why it carries the freshness and the manual reload.

</specifics>

<deferred>
## Deferred Ideas

- **Attendee-list view on a tablet, for whoever watches the door from inside.**
  A new surface, not a freshness change — its own phase. Note that the visual
  system phases (40-42) will touch the scanner anyway; this is not part of them
  either.
- **Freshness of the member roster.** `/api/membership/list` is refreshed only
  as a side effect of an attendance fetch (`ScannerClient.tsx:820-861`), and its
  staleness is the *other* cause of a false refusal offline — a member who
  joined recently is refused with the radio off. Real, but it is a different
  list and outside LIVE-01, which names the attendee list.

</deferred>

---

*Phase: 38-live-attendance-freshness*
*Context gathered: 2026-08-11*
