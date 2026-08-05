# Pitfalls Research

**Domain:** Design-system migration, permission refactor, per-resource RLS, and Realtime-over-offline on a live, shipped events PWA (door check-in + real payments)
**Project:** Resonate v1.5 — Platform Layout, Access Model & Door Fixes
**Researched:** 2026-08-05
**Confidence:** HIGH for repo-verified findings (every `file:line` claim below was read from the current tree, not from `CONCERNS.md`); HIGH for Supabase RLS/Realtime behaviour (official docs); MEDIUM for design-migration and touch-target guidance (WCAG is normative; incremental-adoption guidance is community practice).

> **Note on `CONCERNS.md`:** dated 2026-02-24 and substantially stale. The role check it says is missing now exists (`src/lib/supabase/middleware.ts:78-107`); the PWA wrapper it names has been replaced by `@serwist/next`. Every claim below was re-verified against the current code. Two of its entries **are** still worth carrying forward: `src/utils/qr.ts` code generation, and the open-redirect shape in the auth callback (see Pitfall 9).
>
> The previous milestone's research is preserved at `.planning/research/v1.3-PITFALLS.md`.

---

## Baseline measurements (taken 2026-08-05, for later comparison)

These are the numbers this milestone moves. Recorded now so "done" is measurable in a repo that has no test runner.

| Measure | Today |
|---|---|
| `md:` occurrences in `src` | 1 |
| `sm:` / `lg:` / `xl:` | 46 / 6 / 0 |
| Widest container in the app | `max-w-lg` (no `xl`+ container exists) |
| Hard-coded 6-digit hex literals in `src` | 68, across 26 files |
| `rgba(...)` literals in `src` | 8 |
| Occurrences of the current accent as a literal (`#e5484d` / `229, 72, 77`) | 9 |
| Files containing an inline `master`/`organizer` string comparison | 53 files, 78 occurrences |
| Duplicated admin/organizer route trees | 9,447 lines across both groups |
| RLS policies in migrations | 71 |
| Bare `auth.uid()` in policies (not wrapped in `SELECT`) | 40 |
| Policies carrying a `TO` role clause | 5 occurrences total |
| `SECURITY DEFINER` functions / of which pin `search_path` | 19 / 1 |
| Realtime subscriptions in `src` | 0 (this milestone introduces the first) |
| Nav components | 1 (`MobileNav.tsx`, fixed bottom bar at `z-50`) |
| Hard-coded bottom-nav clearance paddings (`pb-[calc(...)]`) | 6, across 4 files |

---

## Non-negotiables

Three properties are **not** available as trade-offs. If a proposed design weakens one, the design is wrong — do not "accept the risk", change the design.

1. **The door works with the network off.** Any change that makes a scan depend on a server round-trip — a Realtime subscription, a token refresh, a capability lookup — is unacceptable. Realtime is a *freshness accelerator layered on top of* the IndexedDB path, never a replacement for it and never a precondition for it.
2. **The door's default is admit-and-record.** A valid guest turned away in front of a queue is worse than a double admission. Every new failure branch — cache miss, expired session, refunded-ticket check, dead subscription — must resolve toward admit-with-a-flag, not toward refuse.
3. **The bar's default is record-nothing.** Opposite polarity. A drink is "served" only after a server confirmation that *distinguishes* "I changed the state" from "it was already in that state". Optimistic SERVED is unacceptable.

Every pitfall below is judged against these three.

---

## Critical Pitfalls

### Pitfall 1: The already-redeemed drink token still renders SERVED — the retry/duplicate distinction is lost on the money side

**What goes wrong:**
`redeem_drink_token` is idempotent by *return value*, not by error: `IF v_token.status = 'redeemed' THEN RETURN false;` (`supabase/migrations/20260307100000_drink_refund.sql:41-43`). Both callers discard that boolean and inspect only `rpcError` — `src/app/(public)/events/[slug]/menu/actions.ts:299-307` and its authenticated twin in `src/app/(organizer)/organizer/events/actions.ts:1108+`. Both also deliberately let `serve` through on an already-redeemed token: `if (token.status === "redeemed" && action !== "serve") throw` (`menu/actions.ts:268-270`). The modal therefore transitions to `served` and plays the SERVED animation (`RedeemConfirmationModal.tsx:65-73`). A bartender who presses Serve twice — or a customer who re-opens an already-redeemed token and hands the phone over — sees SERVED both times and pours twice. Paid count and poured count diverge, with no record that they diverged.

**Why it happens:**
"Idempotent" was implemented as *tolerant* rather than *informative*. A `false` return meaning "nothing changed" becomes indistinguishable from a `true` meaning "I just changed it" the moment the caller throws the value away. The pattern is correct for a background sync job and wrong for a human-facing confirmation.

**How to avoid:**
- Change both server actions to return the RPC boolean as a discriminated result — `{ outcome: "served" } | { outcome: "already_served", redeemed_at }` — and make `RedeemConfirmationModal` render a distinct, non-celebratory state for `already_served` (show the original redemption time; never the animation).
- Remove the `action !== "serve"` escape hatch in both `redeemDrinkToken` and `redeemDrinkTokenGuest`. An already-redeemed token should not reach the RPC from a UI path at all.
- Apply the same treatment to `activate_drink_token`, which has the identical `RETURN false` shape (`20260508000000_drink_token_active_state.sql:38-40`).
- Written manual procedure: open a token, serve it, press Serve again on the same screen. The second press must show "already served at HH:MM" and no animation.

**Warning signs:**
Any server action whose body is `const { error } = await client.rpc(...)` where the RPC's declared return type is `boolean`. Grep for it — the discarded return value *is* the signal.

**Phase to address:** Bar corrections (drink redemption). This is live in production today; it should be early in the milestone, not bundled with design work.

---

### Pitfall 2: The offline sync queue silently discards a genuine double check-in

**What goes wrong:**
`sync-manager.ts:31-40` treats `res.ok || res.status === 409` as "synced" and deletes the queue entry. But `/api/tickets/checkin` **never returns 409**. When a *different* operator already checked that ticket in, the route returns HTTP **200** with `{ valid: false, status: "already_checked_in" }` (`src/app/api/tickets/checkin/route.ts:106-113` — a bare `NextResponse.json` with no status argument). `res.ok` is therefore `true`, `markSynced()` runs, the conflict is deleted from the queue and never surfaces to anyone. The only genuine evidence that two people walked in on one ticket is destroyed at the moment it arrives.

The mirror-image branch is wrong in the other direction: when the *same* operator checked it in, the route returns `valid: true, already_by_you: true` (`route.ts:83-102`) — correct for a sync replay, but the scanner cannot tell that apart from a fresh admission either.

**Why it happens:**
The `409` in the sync manager was written against `/api/tickets/attendance`, which *does* return 409 (`attendance/route.ts:217`). The ticket route encodes failure as in-band status strings instead of HTTP codes, and the two conventions drifted. Nothing failed loudly because `res.ok` is true in both the success and the conflict case.

**How to avoid:**
- Make `/api/tickets/checkin` return HTTP 409 for `already_checked_in` so the two routes agree — then fix `sync-manager` to treat 409 as *report, do not delete silently*: move the entry to a `conflicts` store and raise a visible badge rather than calling `markSynced`.
- Distinguish three sync outcomes, not two: `synced`, `conflict` (different operator), `replay` (same operator, already-by-you).
- Surface conflicts in the scanner as a persistent count that must be acknowledged, not a toast. At 02:00 nobody reads a toast.
- Door polarity is preserved: the guest was already admitted, so nothing at the door changes. The conflict is a post-event reconciliation record, never a refusal.

**Warning signs:**
Any `res.ok` check against a route that encodes failure in the JSON body. `checkin/route.ts` has five such returns (lines 40, 44, 58, 65, 106).

**Phase to address:** Door corrections (duplicate scans). Must land before Realtime, because Realtime drains the queue more often and hides the loss faster.

---

### Pitfall 3: A genuine offline duplicate is reported as "Connection error"

**What goes wrong:**
In the offline fallback path, `ScannerClient.tsx:600-624` reads `if (attendee && !attendee.checkedIn)`. When the attendee **is** found and **is** already checked in locally, the branch is skipped and control falls through to `showFlash("error", "Connection error")`. The single most informative event at the door — the same ticket presented twice — is displayed as a network failure. Staff retry the scan, blame the signal, and eventually wave the person through.

**Why it happens:**
The `else` of a truthy-and-condition was never written, so the fall-through landed on the generic error. This is `meta-gates.md`'s zero-silent-failures rule in its most literal form: three distinct causes (not in cache / already checked in / IndexedDB unavailable) collapsing into one message.

**How to avoid:**
- Split into four explicit outcomes with four distinct flashes: `admitted (offline)`, `already scanned at HH:MM on this device`, `not in cache — admitted and flagged`, `cache unavailable`.
- The third is the door-polarity one: a ticket not in the local cache must be **admitted and recorded as unverified**, not rejected. Tickets bought after the last cache refresh are exactly this case, and the current code rejects them.
- Manual procedure: airplane mode, scan a known ticket twice, then scan a ticket id that was never cached. All three must produce different, readable screens.

**Warning signs:**
`showFlash("error", ...)` reached by fall-through rather than by an explicit branch. Any error string appearing in more than one causal path.

**Phase to address:** Door corrections (duplicate scans).

---

### Pitfall 4: Realtime cache refresh wipes unsynced local check-ins

**What goes wrong:**
`cacheAttendees()` (`src/lib/offline/checkin-store.ts:82-129`) **deletes every attendee row for the party, then re-inserts from the server payload**. Server data carries `checkedIn: false` for anyone checked in offline and not yet synced. A refresh running while the pending queue is non-empty therefore resets those people to *not arrived* in the local cache while their entries still sit in `pendingCheckins`. The next scan of the same ticket looks like a first arrival, the attendee list shows a guest who is standing inside as absent, and the door count is wrong.

Today this is rare — the cache refreshes only on party selection and manual fetch. **Adding Realtime turns a rare race into the normal case**, because refreshing often is the entire point of the feature. This is the most dangerous interaction in the milestone.

There is a second, sharper window: between the delete-cursor loop and the insert loop the store for that party is **empty**. A scan landing in that window finds no attendee and — per Pitfall 3 — currently rejects a valid guest.

**Why it happens:**
Clear-and-replace is the obvious way to write a cache sync, and it is correct only when the cache holds no authoritative local state. This one does: `checkedIn`/`checkedInAt` written by `checkInLocally` are the only record of an offline admission until sync completes.

**How to avoid:**
- Never clear-and-replace. Merge: for each incoming attendee, if a pending queue entry exists for that key, **keep the local `checkedIn`/`checkedInAt`** and take only the server's identity fields. Preserve local-true over server-false unconditionally — a local check-in is monotone until it syncs.
- Perform the merge inside a single IndexedDB `readwrite` transaction so no scan can observe an intermediate empty state.
- Prefer incremental application of Realtime payloads (patch the one changed row) over a full re-fetch. Reserve the full re-fetch for explicit party selection.
- Manual procedure: airplane mode, check in two guests, restore network, force a refresh. Both must still read as checked in and the counter must not drop.

**Warning signs:**
A local counter that decreases after a refresh. A guest appearing under "not arrived" who was scanned earlier. A pending count above zero while the list shows everyone absent.

**Phase to address:** Realtime attendee cache — but the merge must be **written in the door-corrections phase, before Realtime is switched on**. Shipping Realtime onto the current clear-and-replace is the fastest way to lose door records.

---

### Pitfall 5: The Realtime channel dies quietly and nobody notices until the night is over

**What goes wrong:**
Supabase Realtime channels stop delivering without throwing. The best-documented cause is token expiry across a background/offline gap: the access token is not refreshed while the device is offline or backgrounded, the channel reconnects with the stale token and errors, and **re-supplying a fresh token afterwards does not revive it — the channel must be removed and re-created** (supabase-js #1732, realtime-js #274, supabase discussions #37002 and #5312). A scanner phone that spends twenty minutes in a pocket with no signal is exactly this scenario. The UI keeps rendering the last-known list, staff trust it, and it is now silently frozen.

Two further silent-miss modes apply:
- **RLS is evaluated per subscriber for Postgres Changes.** If a subscriber has no `SELECT` policy covering a row, the event is simply not delivered — no error. A per-night staff assignment model (Pitfall 8) that narrows `SELECT` will therefore also narrow Realtime delivery, invisibly.
- **`DELETE` events carry no RLS and carry only primary keys** unless `replica identity full` is set, and delete events cannot be filtered. A removed ticket or guest-list row arrives as a bare id, or not usefully at all.

**Why it happens:**
`subscribe()` succeeds, `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` arrive on a callback most integrations ignore, and "no messages" is indistinguishable from "nothing happened" — which, at a door between arrivals, is the expected state.

**How to avoid:**
- Treat the subscription as **liveness that must be proven, not assumed**: a visible three-state indicator in the scanner header — `live` / `catching up` / `offline (cache only)`. Default pessimistic; show `live` only on an explicit `SUBSCRIBED` status plus a recent heartbeat.
- Handle the status callback: on `CHANNEL_ERROR`, `TIMED_OUT` or `CLOSED`, call `removeChannel()` and build a **new** channel. Do not rely on the client's internal retry — that is the documented failure.
- On every `visibilitychange → visible` and every `online` event, tear the channel down, rebuild it, then run one authoritative merge-refresh. Both listeners already exist in `sync-manager.ts:88-106`; extend them rather than adding a parallel set.
- Set `replica identity full` on subscribed tables if previous values are needed, and never depend on `DELETE` events for correctness.
- Add `alter publication supabase_realtime add table ...` as an explicit migration step — a table outside the publication produces a channel that subscribes successfully and never fires.
- **Bound the blast radius:** when the indicator is not `live`, the scanner behaves exactly as it does offline today. Nothing in the scan path may become conditional on the channel.

**Warning signs:**
A `live` badge that never turns off. An attendee list that stops changing while people are visibly arriving. Long-lived tabs (a bar tablet open all night) that were fine for the first hour.

**Phase to address:** Realtime attendee cache.

---

### Pitfall 6: The membership sync entry that can never succeed — a poison pill in the queue

**What goes wrong:**
`sync-manager.ts:56-64` marks a membership check-in synced **only** on `res.ok`. `/api/membership/verify` returns 404 for an unknown code (`membership/verify/route.ts:108`) and 400 for a bad request (lines 72, 81). Those are permanent failures. The entry stays in `pendingCheckins` forever, retried on every `online` event and every `visibilitychange`. The pending badge never reaches zero, so staff learn to ignore it — which is precisely the signal that was supposed to tell them a real check-in had not reached the server.

**A second, sharper defect in the same store:** `pendingCheckins` is keyed by `id` alone (`checkin-store.ts:37`; `checkInMemberLocally` at line 244 uses `id: membershipCode`). A multi-party night — which this platform explicitly supports — means one member checking in at two parties on the same device writes the same key twice. **The second `put` overwrites the first, and one of the two check-ins is destroyed before it is ever sent.**

**Why it happens:**
Retry loops written without a terminal state, and a natural key chosen before the multi-party model existed.

**How to avoid:**
- Change the pending key to a composite: `${partyId}:${type}:${id}`. This requires an IndexedDB version bump — see Pitfall 7.
- Classify sync responses into three buckets, not two: **retry** (network error, 5xx, 429), **done** (2xx), **dead** (4xx other than 429). Move `dead` entries to a `failed` store with the status and a timestamp, shown in a separate dismissible list.
- Cap retries per entry and record the attempt count.
- Never let the pending badge include entries that can never drain — it destroys the badge's meaning, and the badge is the door's only integrity signal.

**Warning signs:**
A pending count that never returns to zero. The same id appearing in network logs on every foreground.

**Phase to address:** Door corrections (offline queue).

---

### Pitfall 7: The IndexedDB version bump destroys unsynced records

**What goes wrong:**
`DB_VERSION = 2`, and the `upgrade` callback only creates stores when absent (`checkin-store.ts:44-77`). Pitfalls 4, 6 and 12 all require schema changes — a composite pending key, a conflicts store, a refunded flag on attendees. The reflexive fix is "bump the version and recreate the stores". A staff device still holding unsynced check-ins from a previous night will have them **deleted by the upgrade**, on a device that is offline and cannot be audited. These are attendance records; some correspond to paid tickets.

**Why it happens:**
`deleteObjectStore` + `createObjectStore` is the shortest upgrade to write, and the loss is invisible in development where the DB is always empty.

**How to avoid:**
- Make a drained queue a **precondition** of the upgrade: in `upgrade`, never delete a store that may hold pending data. Migrate records forward by reading and re-keying inside the version-change transaction.
- If a store genuinely must be rebuilt, first copy its contents to a `quarantine` store that survives, and surface an "N records recovered — review" screen.
- Deploy the schema change **before** a night, never during one, with a written pre-night step: open the scanner on each staff device while online and confirm the pending count is zero.
- Add the pending count to whatever staff handover checklist exists.

**Warning signs:**
A pending count dropping to zero with no corresponding sync request. Any `deleteObjectStore` in the upgrade path.

**Phase to address:** Door corrections (offline queue) — same phase as the key change, because it is the same migration.

---

### Pitfall 8: The capability refactor silently widens access — the fail-open default

**What goes wrong:**
Moving from `role === "master"` scattered across 53 files to `can(user, "capability")` centralises the decision, which is the point. The classic failure is that the new helper's **unknown-input behaviour is permissive**: an unrecognised capability name, a null profile, a failed per-night assignment lookup, or a capability that was never wired for a given route all resolve to "allowed" because the helper returns a truthy default or the call site was never added.

**The `/admin` prefix is doing more work than it looks.** Today those routes are master-only purely because of the URL: `pathname.startsWith("/admin")` (`middleware.ts:88-95`). Collapse the trees to a neutral path and **all 20 admin pages lose that guard the moment the URL stops containing `admin`**. That is not hypothetical — it is the mechanical consequence of the route move.

**Why it happens:**
Role-in-URL is an implicit, whole-subtree guard. Capability checks are explicit and per-surface. The migration converts an implicit universal rule into an explicit enumeration, and enumerations have gaps.

**How to avoid:**
- **Deny by default, at the type level.** Make the route→capability mapping a total function: a `Record<RouteId, Capability>` where `RouteId` is a union derived from the actual routes, so TypeScript exhaustiveness fails `npm run build` when a route has no capability. In a repo with no test runner, the type checker is the only mechanism that can enumerate for you — use it deliberately.
- Have `can()` return `false` for any capability it does not recognise, and log the unknown case **with a distinct category** rather than swallow it.
- Build the **inventory before the move, not after**: a table of all 33 pages across both groups × today's effective guard (middleware prefix / inline check / none) × the capability replacing it. Anything in "none" today is a pre-existing hole to close, not to preserve.
- Keep a middleware guard on the new unified prefix as belt-and-braces. The middleware is UX, but a UX guard that redirects is still the difference between a leak and a near-miss.
- **RLS must move in the same phase.** A capability the UI grants but RLS does not is a broken feature; a capability RLS grants but the UI hides is an open door. Every capability needs a named policy, and the two lists must be diffed by hand.

**Warning signs:**
A `can()` with `default: return true`. Any route reachable in the new tree with no entry in the capability map. A page that renders for a `member` account in manual testing.

**Phase to address:** Unified work surface / capability model. The inventory table is a phase deliverable, not a note.

---

### Pitfall 9: The forgotten surfaces — API routes, server actions, and the pending/unauthenticated paths

**What goes wrong:**
Permission refactors get applied to pages and miss everything else. The specific misses to expect here:

- **API routes duplicate the check by hand.** `verifyOrganizerRole()` is defined locally inside `src/app/api/tickets/attendance/route.ts:6-28`, and the identical logic is re-implemented inline in `src/app/api/tickets/checkin/route.ts:11-27`. If the capability model is applied only to pages, these keep the old `role !== "master" && role !== "organizer"` semantics and quietly become the widest door in the system — both use `getServiceClient()`, which bypasses RLS entirely.
- **Server actions are not routes.** `src/app/(organizer)/organizer/events/actions.ts` is 1,100+ lines of mutations. A server action is callable by anyone who can reach the app, regardless of which page linked to it. Moving the file during the route collapse does not move its guards.
- **The `pending` user.** `middleware.ts:109-118` gates only `/membership-card` and `/attendance` on `status === "approved"`. The new surface must decide explicitly what a `pending` account sees. `member` and `approved` are different axes, and a refactor is exactly when they get conflated — which is the gating mechanism PROJECT.md names as the core value.
- **The unauthenticated path.** `protectedPrefixes` (`middleware.ts:60-66`) is a hard-coded array containing `/admin` and `/organizer`. Adding a new prefix without adding it there means an unauthenticated visitor is never redirected to login and lands on whatever the page renders before its own `getUser()` runs.
- **The redirect parameter mismatch.** `middleware.ts:72` sets `?redirect=`; project memory records the login page reading `?next=`. Whichever is authoritative, this refactor touches both — and the auth callback's redirect handling is the `CONCERNS.md` item worth re-verifying rather than assuming fixed. An unvalidated `next`/`redirect` accepting an absolute URL is an open redirect.

**Why it happens:**
"Routes" is the mental model; API handlers, server actions and the middleware prefix array are three separate lists nobody diffs against it.

**How to avoid:**
- Extract the duplicated `verifyOrganizerRole` into the capability layer and **delete both copies in the same commit** — leaving one behind guarantees drift.
- Enumerate server actions explicitly (`grep -rn "^export async function" src/app/**/actions.ts`) and assign each a capability. Guard at the top of the action body, never at the call site.
- Add a written manual matrix to the phase's VERIFICATION.md: for each of `unauthenticated`, `pending member`, `approved member`, `night-scoped staff`, `organizer`, `master`, attempt every unified route and each sensitive API route directly by URL. Record the **observed** result per cell. With no tests, this table is the evidence.
- Validate the redirect parameter in one place and reuse it: must start with `/`, must not start with `//`, must not parse as an absolute URL.

**Warning signs:**
Two functions with the same body in different files. `protectedPrefixes` edited without the route list, or vice versa. Any server action whose first statement is not an auth check.

**Phase to address:** Unified work surface / capability model.

---

### Pitfall 10: Per-night grants make RLS policies slow and, worse, recursive

**What goes wrong:**
Per-night staff assignments mean policies shaped as "this user may read this ticket **if** a row exists in `staff_assignments` joining them to the ticket's party". Four traps, all present-tense risks given the current migrations:

1. **Unwrapped `auth.uid()`.** 40 bare occurrences across the migrations, **zero** wrapped in `(select auth.uid())`. Supabase's own benchmark puts this at ~95% (179ms → 9ms) because the unwrapped call is re-evaluated per row rather than once per statement. New join-based policies multiply that cost.
2. **Join-in-policy.** Supabase measures the naive join form at 9,000ms against 20ms for the `IN (select ... where user_id = (select auth.uid()))` form — a ~99.8% difference. Per-night grants are precisely the case that produces this.
3. **No `TO` clause.** Only 5 `TO` occurrences exist across 71 policies. Without it every policy is also evaluated for `anon`; Supabase measures 170ms → <0.1ms for anonymous requests once `TO authenticated` is added. The public event and menu pages are anonymous, so this is not theoretical here.
4. **Recursion.** A policy on `staff_assignments` that itself consults `staff_assignments` produces `infinite recursion detected in policy`. The codebase already avoids this for roles via `SECURITY DEFINER` helpers (`is_admin_or_organizer()`); the assignment lookup needs the same treatment.

**The correctness trap is worse than the performance one.** Production holds 2 events, 3 parties, 1 ticket, 4 profiles. **Every one of these policies will be instant and will look correct.** The performance regression is invisible until a real night; the correctness gaps are invisible until there is more than one of each row.

**How to avoid:**
- Wrap **every** `auth.uid()` in `(select auth.uid())`, including the 40 pre-existing ones. Mechanical, low-risk, and the cheapest win available.
- Add `TO authenticated` (or `TO anon, authenticated` where genuinely public) to every policy.
- Express grants as `party_id IN (SELECT party_id FROM staff_assignments WHERE user_id = (SELECT auth.uid()))`, never as a join in the `USING` clause.
- Index every column named in a policy: `staff_assignments(user_id, party_id)`, plus the `party_id` columns the subquery filters against. 24 indexes exist today; assume more are needed.
- Write the assignment lookup as one `SECURITY DEFINER STABLE` helper and **pin its `search_path`** — 19 such functions exist and only 1 sets it, which is a genuine privilege-escalation surface and a Supabase linter finding. Fix all 19; they are in the blast radius anyway.
- **Seed a realistic dataset** (a few hundred tickets across several parties and several staff) in a scratch project and run `EXPLAIN ANALYZE` on the attendee query as a night-scoped staff account. Record the plan in VERIFICATION.md. Without it the phase cannot claim to have verified anything — near-empty production proves nothing.

**Warning signs:**
`Seq Scan` in `EXPLAIN ANALYZE` on a policy-filtered table. Any policy whose `USING` clause contains a `JOIN`. Query time scaling with total rows rather than the user's rows.

**Phase to address:** Per-night assignments / RLS. The `(select auth.uid())` and `TO` sweep should be its own early, mechanical plan within that phase.

---

### Pitfall 11: The service client makes RLS decorative on the paths that matter most

**What goes wrong:**
`getServiceClient()` bypasses RLS. It is used in the check-in route, the attendance route, the drink actions and the guest redemption path. A per-night permission model built entirely in RLS therefore **does not constrain the door or the bar at all** — those paths authorise with a hand-written role check and then read and write with unrestricted privileges.

Concretely today: `checkin/route.ts:31-38` accepts any `master`/`organizer`, and when `offlineSync` is set it **skips HMAC verification entirely** and takes a raw `ticketId` from the request body (`route.ts:37-40`). Any organizer session can check in any ticket id it can guess or enumerate.

**Why it happens:**
The service client solved legitimate problems (reading across users for an attendee list). Once present it becomes the path of least resistance for every subsequent handler.

**How to avoid:**
- Enumerate every `getServiceClient()` call site and record in writing *why* RLS cannot serve it. Where the reason is convenience, switch to the user client.
- Where it must stay, the capability check **is** the security boundary and must be as explicit as a policy: check the capability *and* the per-night assignment against the resource's `party_id` before touching the service client. The check-in route already receives `partyId` — make it authoritative rather than advisory (it is currently compared only when the caller supplies it, `route.ts:63`).
- Constrain the `offlineSync` path: require the same signed token the online path requires. The queue can store the full signed token instead of the bare id — it lives in IndexedDB on a staff device either way. **This is a strict improvement with zero cost to offline behaviour**, since the token is already captured at scan time.
- Log every `offlineSync` submission with the operator id.

**Warning signs:**
A route that resolves `role` from `profiles` and then uses `getServiceClient()` for all subsequent work. Any handler accepting a bare resource id and trusting it.

**Phase to address:** Unified work surface / capability model, with the `offlineSync` token change owned by Door corrections.

---

### Pitfall 12: Refunded tickets — the stale cache admits, and nothing flags it

**What goes wrong:**
The string `refunded` appears nowhere in `src/app/api/tickets/` or `src/lib/offline/`. `ticket_refunds` exists as a separate table with an approval workflow (`20260227200000_ticket_refunds.sql`) and the check-in route never consults it. A refunded ticket checks in green online *and* offline, and the offline cache has no field in which to record that it was refunded even if the check existed.

**Why it happens:**
Refunds and check-in were built in different milestones and the join between them was never written.

**How to avoid:**
- Add the refund state to the attendee cache payload and to the IndexedDB record (subject to Pitfall 7's migration constraint).
- **Apply door polarity, not bar polarity.** A refunded ticket at the door is admitted and flagged, never refused — refusing at the door on possibly-stale cached data is the exact error the queue-facing rule forbids. The flag produces a visible amber state and a reconciliation record, not a red X.
- Online, the route can be stricter because the data is authoritative — but the outcome is still admit, flag, record. The decision to refuse belongs to a human at the door, never to a cache.
- Manual procedure: refund a ticket, scan it online and offline. Both admit, both show the flag, and the offline one produces a synced record of the flag.

**Warning signs:**
A refund workflow with no downstream consumer. A ticket state enum the check-in path does not switch on.

**Phase to address:** Door corrections.

---

### Pitfall 13: The service worker serves the old app all night

**What goes wrong:**
Current config: `skipWaiting: true`, `clientsClaim: true`, `cleanupOutdatedCaches: true` (`src/app/sw.ts:20-24`), with `cacheOnNavigation: true` and **`reloadOnOnline: true`** (`next.config.ts:5-10`). Three consequences for a token-and-font migration on a door device:

1. **`reloadOnOnline: true` reloads the page when the device comes back online.** At the door this is the worst possible moment: the camera stream is torn down, in-memory scan history and the selected party are lost (`handleChangeParty` shows how much state is in memory), and a scan in flight is interrupted. IndexedDB survives so no record is lost — but the operator's screen changes under their hands in the dark. This setting predates the offline door work and needs re-deciding with the door as the deciding case.
2. **`skipWaiting: true` activates a new service worker as soon as it is fetched**, while a page running the *old* JS bundle is still open. That page requests chunk and font URLs from the old build; on Vercel those can 404 after a rollout, producing a chunk-load error mid-night. A deploy during an event is a live-fire change to the door.
3. **Precached fonts and CSS are content-hashed, but the HTML referencing them is cached too.** A cached navigation response pinning the previous build's CSS hash renders the old tokens — or no font at all — until the shell updates.

**Why it happens:**
These are correct defaults for a marketing PWA and were never re-evaluated against a device that is deliberately offline, deliberately long-lived, and operated one-handed.

**How to avoid:**
- **Freeze deploys during events.** Write it down as an operational rule with the same weight as a code gate; it is cheaper and more reliable than any caching strategy.
- Make updates explicit: drop `skipWaiting` and surface an "Update available — reload" control the operator presses. Never auto-reload a screen with a camera open or a non-empty pending queue.
- Reconsider `reloadOnOnline`. If it stays, gate it on scanner-inactive **and** pending-count-zero.
- Use network-first (or fast-revalidating stale-while-revalidate) for navigation responses so the HTML shell cannot pin a dead asset hash, while keeping hashed static assets cache-first.
- Verify the font swap on a device that already has the **old** service worker installed — not a fresh profile. This is the single most common way a font migration passes review and fails in the field.

**Warning signs:**
`ChunkLoadError` in the field. The new typeface appearing in a fresh browser but not in the installed PWA. A door device showing last week's UI.

**Phase to address:** Design foundation (tokens + typography), first plan in the phase. The deploy-freeze rule belongs in the milestone's operational notes rather than a phase.

---

### Pitfall 14: The token swap misses what the tokens never covered

**What goes wrong:**
`globals.css` defines seven `:root` variables re-exported through `@theme inline`. Swapping them changes only what already reads them. The repo contains **68 hard-coded hex literals across 26 files** and **8 `rgba()` literals** that will not move. The clearest instance is in `globals.css` itself: `glow-accent` and `glow-accent-strong` hard-code `rgba(229, 72, 77, ...)` — the current accent, duplicated as a literal. Swap the accent token and every glow in the app still emits the old red. That literal appears 9 times in the tree.

`font-family` has a matching single point of failure: `--font-orbitron` is referenced in exactly four places (`globals.css:31`, `layout.tsx:8`, `:10`, `:50`). Rename it in three of the four and the body rule falls through to `system-ui` — which renders, looks *almost* deliberate on a dark background, and can survive review.

**Why it happens:**
Tokens get adopted for the values people remember to tokenise. Glows, shadows, gradients, chart colours and SVG `fill`/`stroke` attributes are where the literals hide.

**How to avoid:**
- Before writing a single new token, run and commit the inventory: `grep -roE '#[0-9a-fA-F]{6}\b' src` and `grep -roE 'rgba?\(' src`. 68 + 8 is a countable, finishable list.
- Make the count a **phase exit criterion**, verified by re-running the same grep. This is the only automatable check available for the design phase, so it should carry weight.
- Keep the CSS variable **name** stable across the font swap where possible; if it must change, change all four references in one commit and require the old name to return zero hits.
- Check the Recharts surfaces specifically — chart colour props are a classic literal reservoir, and this app has several analytics dashboards.
- Watch `color-scheme: dark` (`globals.css:26`) and the `@supports` safe-area block: both sit outside the token system and both affect how a new palette reads.

**Warning signs:**
A grep for the old accent returning hits after the swap is "done". A component that looks right in isolation and wrong on a page.

**Phase to address:** Design foundation (tokens + typography).

---

### Pitfall 15: Incremental primitive adoption leaves two design systems running forever

**What goes wrong:**
Adopting eight primitives page by page across ~48 pages means two visual systems coexist for the whole migration. Two failure shapes:

- **The migration stalls at 80%.** The remaining pages are the awkward ones — analytics dashboards, forms with native date inputs (`globals.css:36-41` already carries an override for them), the scanner. They stay on the old patterns permanently, so the primitive has to support both and grows props until it is a wrapper around the old markup.
- **The primitive is discovered to be wrong at page 30.** The counts driving the design (493 card instances, 246 chips, 147 buttons) measure *recurrence*, not *variation*. 493 cards is strong evidence that a Card exists; it says nothing about how many distinct card behaviours hide inside it. Changing the API at page 30 means revisiting 29 pages with no test suite to catch what broke.

**Why it happens:**
Recurrence counts are the easy measurement and get taken as sufficient evidence for an API.

**How to avoid:**
- **Sample before you build.** Pick 12 of the 493 card instances deliberately spread across public / member / work surfaces and write the primitive's API against those 12 by hand. If it needs more than a couple of variants to cover them, it is really two primitives — find that out at 12, not at 30.
- Migrate in **surface-complete slices**, never scattered pages: finish every page in one route group before starting the next. A half-migrated group is what stalls; a completed group is shippable.
- Hard rule: **no new prop may be added to a primitive to accommodate a single call site.** That call site keeps its bespoke markup and is recorded as a known exception. This is the mechanism that stops the primitive rotting.
- With no visual regression tooling, take before/after screenshots per page at the three breakpoints and keep them with the phase. Manual, but it is the only evidence that will exist and it is cheap against the alternative.
- Track adoption as a count in the phase file — pages migrated / pages total — so a stall is visible rather than inferred.

**Warning signs:**
A primitive with more than a handful of variants. A prop named after a page. An adoption count that has not moved in a week.

**Phase to address:** Shared primitives adoption.

---

### Pitfall 16: Retrofitting desktop breaks the mobile app that already works

**What goes wrong:**
The app is mobile-only in a specific structural sense: `MobileNav.tsx` is the **only** nav component, it is `fixed bottom-0` at `z-50`, and **six hard-coded `pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))]` paddings across four files exist solely to clear it**. The z-index stack is layered around it: `z-[60]` (11 uses) for modals, `z-[70]`, `z-[100]`. Introducing a desktop sidebar or top bar invalidates every one of those six paddings and every assumption in the stack — the compensations become dead space on desktop, and if the mobile bar is conditionally rendered they become dead space at whatever breakpoints the bar is gone.

Two more specific traps:

- **Touch targets get smaller on the bigger screen.** The instinct at `md:`/`xl:` is to reduce padding because there is more room. But tablets are touch devices: WCAG 2.2 SC 2.5.8 requires 24×24 CSS px minimum at Level AA, and platform guidance is 44–48px *not scaled down* for larger screens. The staff work surface is exactly what will be used on a tablet, one-handed, in low light — the context where a `md:h-8` button is a defect. `h-8`, `h-9` and `h-10` are already common in the tree.
- **Dense tables are the desktop-only feature that breaks mobile.** Nine files already use `<table>`/`overflow-x-auto`. Real desktop tables usually mean a table that horizontally scrolls on phone, hiding the action column — the one users need — off-screen with no affordance. And every existing container maxes out at `max-w-lg`; a naive `xl:` pass that widens containers will stretch line lengths past readability on content surfaces even where it helps work surfaces.

**Why it happens:**
Breakpoints get treated as "more room" rather than "different input device". Desktop is designed on a mouse-driven laptop, and tablet inherits the desktop layout with touch input.

**How to avoid:**
- Let **input modality**, not width, drive control sizing: keep touch-sized targets at every breakpoint by default, and treat `@media (pointer: fine)` — not `xl:` — as the licence to go denser. Enforce a minimum interactive height in the primitive layer, not per page.
- Extract the bottom-nav clearance into **one token or one layout wrapper** before adding any breakpoint. Six copies of a magic calc across four files is what makes the responsive pass expensive; fix it first, in the design-foundation phase.
- Audit the z-index stack into a named scale at the same time. Adding a sidebar to an implicit stack is how modals end up behind navigation.
- Choose the desktop table pattern per surface: card list on phone → table at `md:`+ is usually right for work surfaces. Horizontal scroll is acceptable only when the primary action stays pinned and visible.
- Set container widths per **content type**, not globally. Reading surfaces want a cap; work surfaces want the width.
- **Test on a real tablet, portrait and landscape, and on the actual door device.** A browser resized to 1024px is not a touch device and will not reveal the target-size problem.

**Warning signs:**
Any `md:`/`lg:` modifier that *decreases* a height or padding on an interactive element. A modal appearing under the nav at one breakpoint. A table whose action column requires horizontal scrolling.

**Phase to address:** Three-tier responsive layout, with the nav-clearance and z-index extraction pulled forward into Design foundation.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Global find-and-replace of tokens instead of page-by-page primitive adoption | Migration "done" in a day | Misses the 68 literals entirely and produces a diff too large to review in a repo with no tests | Never — the milestone already rejects it |
| Keeping `getServiceClient()` on the door and bar paths | Avoids writing RLS for cross-user reads | The per-night permission model does not constrain the two highest-risk surfaces | Only with a written justification per call site and an explicit capability + party check before the client is touched |
| Leaving the 40 unwrapped `auth.uid()` calls alone | Smaller migration diff | ~95% avoidable latency on every policy-filtered query, compounding with the new join-based grants | Never — mechanical change, and this is the milestone that touches RLS |
| Realtime as primary source, offline cache as fallback | Simpler mental model, less merge logic | Violates non-negotiable #1; the door stops working when the signal does | Never |
| Auto-reload on service-worker update | Users always on latest | A screen changing under a one-handed operator in the dark, mid-scan | Never on the scanner route; acceptable elsewhere |
| `DB_VERSION` bump with delete-and-recreate stores | Two-line upgrade | Destroys unsynced attendance records on offline devices | Only when the pending queue is provably empty on every device |
| Adding a prop to a primitive for one page | Unblocks the page today | The primitive becomes a wrapper for the old markup and the migration never converges | Never — keep the bespoke markup, record the exception |
| Shipping the capability refactor without the RLS policies | Half the work, visible progress | UI-only permissions on a system whose repo is public | Never — they are one change |
| Verifying permissions against near-empty production data | Fast | Proves nothing; correctness gaps only appear with multiple rows per user | Never for RLS — seed a realistic dataset |
| Bottom-nav clearance left as six literals during the responsive pass | Avoids a refactor commit | Every breakpoint change has to touch four files, and one will be missed | Never — extract before adding breakpoints |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| Supabase Realtime + Postgres Changes | Assuming a table emits events once RLS allows it | Add the table to the `supabase_realtime` publication in an explicit migration; a missing publication yields a channel that subscribes fine and never fires |
| Supabase Realtime + RLS | Assuming a subscriber sees what the page can query | Events are authorised per subscriber; narrowing `SELECT` for per-night staff silently narrows delivery. Test Realtime **as** a night-scoped account, never as master |
| Supabase Realtime + DELETE | Relying on deletes to remove attendees from the cache | Deletes carry no RLS, cannot be filtered, and carry only primary keys unless `replica identity full` is set. Model removals as status updates |
| Supabase Realtime + `@supabase/ssr` token refresh | Expecting the client to recover after the device was offline or backgrounded | Documented not to: the channel keeps the stale token and a later refresh does not revive it. Remove and re-create the channel on `online` and on `visibilitychange → visible` |
| Supabase Realtime + scale | Postgres Changes for everything | Single-threaded; throughput scales with subscriber count, and Supabase recommends Broadcast beyond ~3,000 concurrent subscribers. Not a limit this project reaches, but the per-subscriber RLS cost is real at any size — scope the subscription to one party |
| SumUp refunds ↔ ticket check-in | Treating a refund as a finance-only event | Refund state must flow into the attendee cache; today it does not reach the door at all |
| SumUp ↔ drink token state | Trusting an RPC's success to mean it acted | `redeem_drink_token` returns `false` when it did nothing. Propagate the boolean |
| `@serwist/next` + a live door device | Deploying during an event | Freeze deploys during events; make SW updates operator-initiated |
| `next/font` + a token rename | Renaming the CSS variable in most places | Four references exist; a missed one falls back to `system-ui` silently |
| IndexedDB (`idb`) + schema change | Delete-and-recreate in `upgrade` | Migrate records forward inside the version-change transaction; never delete a store that may hold pending writes |
| PostHog + the new work surface | Assuming existing event names survive the route collapse | Route-derived event properties change when 13 routes become one; re-map before the collapse or the analytics history breaks silently |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| Unwrapped `auth.uid()` in 40 policy expressions | Every query uniformly slow; latency scales with rows scanned | Wrap in `(select auth.uid())` | Invisible at 4 profiles; obvious at a few hundred tickets |
| Join inside a per-night grant policy | One surface (the attendee list) far slower than the rest | Rewrite as `party_id IN (SELECT ... WHERE user_id = (SELECT auth.uid()))` | Immediately at real event size — Supabase measures ~9,000ms for the naive form |
| Missing indexes on policy columns | `Seq Scan` in `EXPLAIN ANALYZE` | Index `staff_assignments(user_id, party_id)` and every `party_id` the subquery filters | As soon as a table exceeds a few hundred rows |
| No `TO` clause on 66 of 71 policies | Anonymous page loads slower than they should be | `TO authenticated` / `TO anon, authenticated` on every policy | Already, on the public event and menu pages |
| Full cache re-fetch on every Realtime event | Battery drain and network churn on the door device; UI stutter | Patch the single changed row; reserve full refresh for party selection | At a real arrival rate — dozens of events per minute during the door rush |
| Realtime per-subscriber RLS authorisation | Throughput scales with subscriber count, not write rate | Keep subscribed clients few; subscribe to one party, never a whole table | Not a near-term limit, but the reason to scope tightly from day one |
| Precaching two new font families | Slow first load on the venue's poor connection | Subset aggressively; `font-display: swap`; keep the precache manifest lean | First install on a phone at the door |
| Eight primitives shipped as one barrel import | Larger client bundles on the public pages | Keep primitives individually importable; watch the public event page bundle | At the first slow 3G load on a venue's connection |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| Route collapse removes the `/admin` prefix guard without replacing it per-surface | 20 previously master-only pages reachable by any organizer or any authenticated user | Total, type-checked route→capability map; deny by default; manual role×route matrix in VERIFICATION.md |
| `offlineSync` accepts a bare `ticketId` with no HMAC (`checkin/route.ts:37-40`) | Any staff session can check in an arbitrary ticket id | Store and submit the full signed token from the queue; it is captured at scan time, so nothing offline is weakened |
| Service-client routes keep hand-written role checks after the capability migration | RLS is bypassed on the door and bar paths; the permission model does not apply where it matters most | Route service-client handlers through the capability layer and check the resource's `party_id` against the assignment |
| 18 of 19 `SECURITY DEFINER` functions do not pin `search_path` | Search-path manipulation against elevated functions; a standing Supabase linter finding | `SET search_path = ''` (or an explicit schema) on every one; fully qualify identifiers inside |
| `?redirect=` / `?next=` accepted without validation | Open redirect from the login and auth-callback flow (the `CONCERNS.md` item worth re-verifying rather than assuming fixed) | One validator: must start with `/`, must not start with `//`, must not parse as an absolute URL |
| `pending` conflated with `member` in the new capability model | A user awaiting approval gains member capabilities — this is the gating mechanism PROJECT.md calls the core value | Keep role and status as two independent axes in the capability signature; test the `pending` row explicitly |
| Per-night assignment checked in the UI but not in RLS | An organizer reads another night's guest list — members' personal data | Every capability gets a named policy; diff the capability list against the policy list by hand |
| Membership codes still generated with `Math.random()` (`src/utils/qr.ts`) | Predictable codes; the one `CONCERNS.md` security entry verified as still true | Move to `crypto.getRandomValues`; the door work touches this file anyway |
| `.planning/` published to a public repo | Unannounced dates, venues under negotiation and line-ups leaking via research and roadmap files | Refer to roles and formats, never to individuals or specific venues. The persona's control **F** covers `docs/` and `.firecrawl/` but **not** `.planning/`, which is tracked |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---|---|---|
| Errors collapsed into one message at the door | Staff cannot distinguish "already scanned" from "no signal" and stop trusting the screen (`ScannerClient.tsx:623`) | Four distinct, high-contrast states with the reason named |
| A `live` indicator that only ever shows the good state | Staff trust a frozen list | Three-state indicator defaulting pessimistic; `live` requires a positive, recent signal |
| A pending badge containing entries that can never drain | The badge stops meaning anything, so a real unsynced check-in goes unnoticed | Separate `failed` from `pending`; the pending count must be able to reach zero |
| Auto-reload on reconnect while the camera is open | The screen changes under a one-handed operator in the dark, mid-scan | Gate the reload on scanner-inactive and pending-count-zero |
| SERVED animation on an already-redeemed token | A second drink is poured; paid and poured counts diverge silently | A distinct, non-celebratory "already served at HH:MM" state |
| Smaller controls at `md:`/`xl:` | The staff tablet — the densest, most-used work surface — becomes the hardest to hit | Size by pointer type, not width; enforce a minimum height in the primitive |
| Dense table scrolling the action column off a phone | The one control users need is invisible with no affordance | Cards on phone, table at `md:`+; if scrolling, pin the action column |
| Two visual systems visible on one screen mid-migration | The app looks broken rather than in progress | Migrate surface-complete slices; never leave a route group half-done between merges |
| A refused guest at the door because of a stale cache | A queue forms and the error is public and unrecoverable | Admit and flag; the refusal decision belongs to a human, never to a cache |

---

## "Looks Done But Isn't" Checklist

- [ ] **Token swap:** often missing the literals — verify `grep -roE '#[0-9a-fA-F]{6}\b' src | wc -l` and `grep -rn '229, 72, 77\|e5484d' src` return the agreed number (baseline 68 and 9)
- [ ] **Font swap:** often missing one of the four `--font-orbitron` references — verify the old variable name returns zero hits and the new face renders **on a device with the old service worker installed**
- [ ] **Responsive pass:** often missing the six `pb-[calc(...)]` bottom-nav clearances — verify each is a token or wrapper, and that no `md:`/`lg:`/`xl:` modifier shrinks an interactive element
- [ ] **Primitive adoption:** often missing the awkward surfaces — verify adoption count equals page count, and that no primitive prop is named after a single page
- [ ] **Capability refactor:** often missing API routes and server actions — verify zero `role !== "master"` / `=== "organizer"` comparisons remain outside the capability layer (baseline 78 across 53 files)
- [ ] **Capability refactor:** often missing the `pending` and unauthenticated rows — verify the full role×route matrix is filled with observed results, not expected ones
- [ ] **Route collapse:** often missing the middleware `protectedPrefixes` array — verify the new unified prefix is in it and an anonymous request to a work-surface URL redirects to login
- [ ] **RLS grants:** often missing the `TO` clause and the indexes — verify `EXPLAIN ANALYZE` on a seeded dataset shows an index scan, and record the plan
- [ ] **RLS grants:** often missing `search_path` on `SECURITY DEFINER` functions — verify all 19 (baseline: 1 of 19 correct)
- [ ] **Realtime:** often missing the publication migration — verify `supabase_realtime` contains the subscribed tables
- [ ] **Realtime:** often missing the death-and-recovery path — verify by backgrounding the device past the token lifetime, then confirming events still arrive
- [ ] **Realtime:** often missing the offline-cache merge — verify an offline check-in survives a subsequent refresh with the pending queue non-empty
- [ ] **Offline queue:** often missing the terminal-failure bucket — verify a permanently-4xx entry leaves `pendingCheckins` and appears in a `failed` list
- [ ] **Offline queue:** often missing the composite key — verify one member checking in at two parties on one device produces two queue entries
- [ ] **Duplicate scans:** often missing the online conflict path — verify a ticket checked in by operator A, then synced by operator B, produces a visible conflict rather than a deleted queue entry
- [ ] **Refunded tickets:** often missing the offline branch — verify the flag appears both online and offline, and that neither path refuses
- [ ] **Drink serve:** often missing the second press — verify it produces "already served", not the animation
- [ ] **All phases:** in a repo with no test runner, `npm run build` passing is a typecheck, not a verification. Every phase needs its written manual procedure in VERIFICATION.md with `file:line` evidence

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| Second drink poured on a redeemed token | MEDIUM | `redeemed_at` is recorded, so the divergence is reconstructable per token; reconcile stock against redeemed count after the night. Not recoverable **during** service — which is why it must be fixed before, not after |
| Conflicts silently deleted from the queue (Pitfall 2) | HIGH | Unrecoverable — the record was destroyed client-side and never reached the server. Prevention only |
| Unsynced check-ins wiped by a cache refresh (Pitfall 4) | HIGH | Partially recoverable while entries remain in `pendingCheckins`; unrecoverable once a sync deletes them. Prevention only |
| Unsynced check-ins destroyed by a DB version bump (Pitfall 7) | HIGH | Unrecoverable. Enforce a drained queue as a pre-deploy checklist item |
| Realtime channel died silently mid-night | LOW | The offline path already carried the night; reconcile from the server afterwards. This is exactly why non-negotiable #1 is non-negotiable — it *is* the recovery strategy |
| Capability gap discovered after ship | MEDIUM | Production data is nearly empty, so exposure is minimal today. Patch the capability map, add the missing policy, audit access for the window |
| Token swap left literals behind | LOW | The grep finds them; fix and re-run. Cheap because mechanical |
| Primitive API wrong at page 30 | HIGH | 29 pages revisited with no test suite. Prevented by sampling 12 instances before building |
| Service worker serving a dead build to a door device | MEDIUM | Uninstall and reinstall the PWA on the device. Painful at 02:00 — prevented by the deploy freeze |
| Refunded ticket admitted without a flag | LOW | Reconcile `ticket_refunds` against `checked_in` after the event; the flag is for operator awareness, not refusal |

---

## Pitfall-to-Phase Mapping

Phase labels are descriptive; map them onto the roadmap's actual phase names.

| # | Pitfall | Prevention Phase | Verification |
|---|---|---|---|
| 1 | Already-redeemed token shows SERVED | Bar corrections | Press Serve twice; second press shows "already served at HH:MM", no animation |
| 2 | Genuine conflict discarded by sync | Door corrections | Two operators, one ticket; conflict appears as a persistent, acknowledgeable count |
| 3 | Offline duplicate shown as "Connection error" | Door corrections | Airplane mode: same ticket twice, plus an uncached ticket → three distinct screens |
| 4 | Cache refresh wipes unsynced check-ins | Door corrections (merge logic) → Realtime (switch-on) | Offline check-in survives a refresh with a non-empty queue; no intermediate empty window |
| 5 | Realtime channel dies quietly | Realtime attendee cache | Background the device past the token lifetime; events still arrive, and the indicator went pessimistic while it was down |
| 6 | Poison-pill queue entry / colliding pending key | Door corrections | A permanent 4xx leaves `pendingCheckins`; one member at two parties yields two entries |
| 7 | DB version bump destroys unsynced records | Door corrections (same migration as 6) | Upgrade with a seeded non-empty pending store; all entries survive |
| 8 | Capability refactor fails open | Unified work surface / capabilities | Build fails when a route has no capability; a `member` account cannot reach any work-surface route |
| 9 | Forgotten surfaces (APIs, actions, pending, unauth) | Unified work surface / capabilities | Filled role×route matrix; zero duplicate `verifyOrganizerRole` bodies; unauth request to a work-surface URL redirects |
| 10 | RLS grants slow / recursive | Per-night assignments / RLS | `EXPLAIN ANALYZE` on a seeded dataset shows index scans; zero bare `auth.uid()`; every policy has `TO` |
| 11 | Service client makes RLS decorative | Unified work surface / capabilities (+ Door corrections for the token) | Written justification per `getServiceClient()` call site; `offlineSync` requires a signed token |
| 12 | Refunded ticket admitted with no flag | Door corrections | Refunded ticket admits **and** flags, online and offline |
| 13 | Service worker serves the old app | Design foundation (+ operational deploy freeze) | Fonts and tokens verified on a device with the previous SW installed; no auto-reload while scanning |
| 14 | Token swap misses literals | Design foundation | Literal grep hits the agreed number; old accent returns zero |
| 15 | Two design systems forever | Primitives adoption | Adoption count = page count; no page-named props; per-page screenshots at three breakpoints |
| 16 | Responsive retrofit breaks mobile | Responsive layout (nav clearance + z-scale pulled into Design foundation) | Real tablet, portrait and landscape; no breakpoint shrinks an interactive element; modals above nav at every width |

---

## Ordering consequences

Five sequencing constraints follow from the pitfalls above. These are the main contribution of this document to the roadmap.

1. **Door and bar corrections come before Realtime.** Pitfall 4 is the reason: Realtime on the current clear-and-replace `cacheAttendees` converts a rare race into the normal case. The merge logic must exist first.
2. **Bar correction (Pitfall 1) is the earliest item in the milestone.** It is live in production, it involves real money, the fix is small and self-contained, and it depends on nothing else.
3. **The capability model and the RLS grants are one phase, not two.** A capability without a policy is a UI-only permission on a system whose repo is public. Splitting them creates a window in which the two disagree.
4. **The nav-clearance and z-index extraction belongs to Design foundation, not to the responsive phase.** Six hard-coded magic paddings across four files is what makes the responsive pass expensive; extracting them is a prerequisite, not part of the work.
5. **Design work and door work must not interleave on the scanner.** The scanner is the one surface where a visual regression is a safety issue. Migrate it last within the design phases, and only after its behavioural fixes have shipped and been used at a real night.

One cross-cutting note on capacity: this milestone changes the visual system, the routing, the permission model, the data access layer and the door's concurrency model at once. Each of the five has a phase that can be verified independently, but only three of them can be verified *at a desk*. Realtime, the offline queue and the responsive touch targets all require a physical device in the intended conditions. Schedule that device time as work, not as a check at the end — it is the only place the door pitfalls will actually surface.

---

## Sources

**Repo-verified (HIGH — read from the current tree on 2026-08-05):**
- `src/lib/offline/checkin-store.ts`, `src/lib/offline/sync-manager.ts`
- `src/app/api/tickets/checkin/route.ts`, `src/app/api/tickets/attendance/route.ts`, `src/app/api/membership/verify/route.ts`
- `src/app/(admin)/admin/scanner/ScannerClient.tsx`
- `src/app/(public)/events/[slug]/menu/actions.ts`, `src/app/(public)/events/[slug]/RedeemConfirmationModal.tsx`, `src/app/(organizer)/organizer/events/actions.ts`
- `src/lib/supabase/middleware.ts`, `src/lib/rbac/roles.ts`
- `supabase/migrations/20260224_rbac_migration.sql`, `20260306100000_phase10_redemption.sql`, `20260307100000_drink_refund.sql`, `20260508000000_drink_token_active_state.sql`, `20260227200000_ticket_refunds.sql`
- `src/app/sw.ts`, `next.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `package.json`

**Official documentation (HIGH):**
- Supabase — RLS performance recommendations: the `(select auth.uid())` wrap, policy-column indexes, join minimisation, the `TO` clause, security-definer functions, with the measured improvements quoted above
- Supabase — Realtime Postgres Changes: per-subscriber RLS authorisation, DELETE/RLS/`replica identity full` caveats, single-threaded throughput, Broadcast recommendation beyond ~3,000 subscribers
- Supabase — Realtime troubleshooting index (heartbeats, `TIMED_OUT`, channel limits)
- W3C WAI — Understanding SC 2.5.8 Target Size (Minimum): 24×24 CSS px, Level AA, and its five exceptions
- Serwist — `@serwist/next` configuring reference (`reloadOnOnline`, `cacheOnNavigation`)

**Community / issue trackers (MEDIUM — multiple independent reports in agreement):**
- supabase-js #1732, realtime-js #274, supabase discussions #37002 and #5312, supabase-flutter #1012 — access token not refreshed for Realtime channels after offline or standby; channels do not recover without being removed and re-created
- Service-worker stale-precache-after-deploy reports (chunk 404s from a previous build; network-first HTML as the fix)
- OWASP Business Logic Abuse — Broken Access Control: missing server-side role checks on endpoints accepting any authenticated token
- Design-token migration and idempotency-key practice write-ups (incremental adoption; retry vs duplicate distinction)

**Explicitly not reused:** `.planning/codebase/CONCERNS.md` (2026-02-24). Its middleware role-check and PWA-wrapper entries were re-verified as false. Its `src/utils/qr.ts` entropy entry was re-verified as still true and is carried forward; the open-redirect entry is carried forward as an item to verify rather than as a finding.

---
*Pitfalls research for: design-system migration + permission refactor + per-resource RLS + Realtime-over-offline on a live events PWA*
*Researched: 2026-08-05*
