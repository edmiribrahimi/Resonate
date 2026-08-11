---
phase: 39-the-door-s-own-address
written: 2026-08-11
status: all pending
closes: STAFF-04 criterion 2, STAFF-04 criterion 3, D-39-06
absorbs: 38-PROCEDURES.md P1 P2 P3 P4 P5 P7 + 38-HUMAN-UAT test 8
excluded: P6 — writes to production, needs its own fresh authorisation (38-HUMAN-UAT test 2)
devices: two — one of them the actual staff phone with the app installed to the home screen
accounts: two, each holding door.operate for the same night, plus one organizer account in status pending; roles, never names
phase_closes: not before this document is filled in
---

# Phase 39 — The Door Pass

> **(a) Every `Result` below is empty and reads `pending`, and an empty Result is an
> unrun procedure** — never a verified-by-inspection in disguise, because a table of
> ticks nobody earned is worse than an empty table, since it closes a phase.
> **(b) Roles, never names:** this repository is public and `.planning/` is tracked, so a
> person here is *an account holding `door.operate` for the night* or *an organizer
> account in status `pending`* — never a name, never a shift, never who was actually
> there, and no venue, no night's date and no line-up appears anywhere in this file.
> **(c) The sections are ordered so that one evening, two phones and one account pair
> produce every observation without re-staging, and §2 runs first** because it is the only
> step with a 65-minute floor and everything in §3–§7 happens on the second device while
> §2's phone is in a pocket.
> **(d) `38-PROCEDURES.md` stays the record of record for LIVE-01 … LIVE-06 and this
> document produces the observations — both files receive the outcome, and neither may say
> "passed" while the other says "pending".**
> **(e) OQ4 is resolved visibly, not quietly:** `38-HUMAN-UAT` test 8 is folded in below as
> §8.6 even though D-39-07's prose enumerates six items and not seven, because it is the
> same room, the same phone and the same minute as criterion 3 and excluding it would force
> the second trip D-39-07 exists to avoid — it is one line to strike if the owner disagrees.

---

## How to read a step

- Steps are numbered and are executed **in the order written**.
- Each step ends with a `Result: pending` line. Fill it with what was **observed**, and
  with the wall-clock time asked for beside it.
- An observation is a fact a second person standing beside the device could confirm or
  deny. *"It felt fast"* is not an observation; *"1.4 s, measured against a 1.3 s
  unthrottled baseline"* is.
- Where a step says **if it did not, that is the finding**, write what happened instead,
  verbatim. Do not retry until it passes.
- Nothing in this pass creates a row in production. See the closing block.

---

## §0 — Preconditions, read ON THE DAY

Each reading carries its own wall-clock time. A precondition read yesterday is not a
precondition: it is a memory.

### §0.1 Realtime is not suspended

1. Read `GET /v1/projects/{ref}/config/realtime`.
2. Record the value of `suspend`. It must be `false`.
3. Record the wall-clock time of the reading.

> Why: `suspend: true` at 22:00 makes the whole live path a no-op with no error anywhere.

Result: pending

### §0.2 The triggers and the policy are present

1. Confirm the four triggers on the four tables are present.
2. Confirm there is exactly one `SELECT` policy on `realtime.messages` and zero write
   policies.
3. Record the wall-clock time.

Result: pending

### §0.3 The deployed build under test is the one intended

1. Read the build id **off the page**, in the browser. Do not assume it from a commit.
2. Record the build id and the wall-clock time.

Result: pending

### §0.4 The active service worker is the new one

1. DevTools → Application → Service Workers.
2. Record the **script URL** of the active worker, verbatim.
3. Take the first measurement of this pass **in a private window**, or unregister the
   worker and reload before measuring.

> Why: `skipWaiting` and `clientsClaim` replace the **worker**, not the **buckets** it
> already filled. A first measurement taken in an ordinary window reports a result about
> code that is no longer running.

Result: pending

### §0.5 THE WARM-UP — and it is not optional

On the staff phone, **online**:

1. Open the door at `/door`. Record the wall-clock time.
2. Open the door at `/admin/scanner`. Record the wall-clock time.
3. DevTools → Application → Cache Storage. For **each** of the two addresses record:
   - which bucket holds a document keyed on that URL — `pages`, `pages-rsc`,
     `pages-rsc-prefetch` or `others`;
   - what the response body is.
4. Go offline. Reload each address. Record what happens, verbatim, per address.

> Why: nothing in this product precaches a document. `self.__SW_MANIFEST` carries 127
> entries — JS chunks, CSS, fonts, build manifests and files from `public/` — and **zero
> HTML, zero routes, zero RSC payloads**. Every offline document therefore comes from a
> runtime `NetworkFirst` cache with a **24-hour** expiry and a **32-entry** cap, warm only
> from a previous online visit. On the night of the move, the honest statement about
> `/door` is *nobody has ever been there*. This step closes Open Question 2 as a reading
> rather than as an assumption, and it is a precondition of interpreting §8.
>
> **The 24 hours are chosen, not inherited (owner, 2026-08-11).** Asked whether the door
> deserved a longer runtime cache: **no** — a door served from yesterday's cache is a stale
> door, and this domain treats a stale surface as a hazard. **So this step does not expire
> with the move: it is a cost of every night.** Read step 3 knowing that the duration is
> settled and the *eviction* is not — the 32-entry cap can drop a door document inside the
> window, and which bucket it competes in is exactly what you are recording here.

Result: pending

### §0.6 The deploy rule — a scheduling rule, not a code one

1. Confirm this phase was deployed on a day with **no night**.
2. Make the **first request after the deploy yourself**, before anybody else does.
3. Record the deploy time and the time of that first request.

> Why: the map assertion in `src/lib/supabase/middleware.ts` is a **module-load** throw in
> a middleware bundle. It fires on the **first request after deploy**, not at
> `npm run build`, and a wrong map is a 500 on **every covered route**. If the deploy
> happens on the day of a night, "the first request after deploy" and "the door opening"
> can be the same request.

Result: pending

---

## §1 — The move, network ON, both devices [STAFF-04 criterion 1]

### §1.1 `/door` renders the door

1. Open `/door`.
2. Record that the door rendered.
3. **Observed, not asserted:** record that the address bar still reads `/door` after the
   render. No URL change is what *"not a redirect"* looks like from the outside.

Result: pending

### §1.2 `/admin/scanner` renders the door

1. Open `/admin/scanner`.
2. Record that the door rendered.
3. Record that the address bar still reads `/admin/scanner` after the render.

Result: pending

### §1.3 Neither request produced a 3xx

1. DevTools → Network.
2. Record the status code of the `/door` document request, **verbatim**.
3. Record the status code of the `/admin/scanner` document request, **verbatim**.

> Why: this is the observation that closes D-39-02 on the wire, and a source assertion
> cannot — a redirect is a **response**, not a line of code.

Result: pending

### §1.4 The bottom nav's Check-in entry points at the canonical address

1. Read the `href` **off the rendered link** — inspect the element, do not read the source.
2. Record it verbatim.

Result: pending

### §1.5 A `pending` organizer account is drawn the Check-in entry [D-39-06]

1. Sign in with **an organizer account in status `pending`**.
2. Record whether the Check-in entry appears in the bottom nav.
3. Record the `href` it carries, if it appears.

> Why: this is the observation that closes D-39-06 and a build cannot. A rendered
> navigation is not a source fact, and the divergence being closed is precisely one role
> and one status — an entry the server **would** admit that the nav was not drawing.

Result: pending

---

## §2 — The pocket [P3 · LIVE-03 · assumption A1]

**Start this section first.** It is the only step with a 65-minute floor, and §3–§7 run on
the second device while this phone is in a pocket.

**Role** — an account holding `door.operate` for the night, on the **actual staff phone**
that would be used at an entrance. Not a simulator, not a desktop.

**Setup** — the door installed to the **home screen** (standalone, not a browser tab),
night selected, network on. Perform one scan so the list is known-fresh.

1. Lock the phone and put it in a pocket for **at least 65 minutes**. The floor is not
   arbitrary: the access token lives 3600 s, so anything under 60 minutes tests suspension
   without testing expiry, and the two together are the case.
2. On unlocking, observe: **(a)** a full reload fires on resume; **(b)** the counter reads
   `updated 0s ago` within a few seconds — **not** after the 5-minute parachute, which
   would mean the resume signal never arrived and A1 is false; **(c)** any band that had
   appeared disappears; **(d)** a scan performed immediately afterwards behaves normally.
3. Record: the wall-clock time the phone was **locked**, the wall-clock time it was
   **woken**, the elapsed seconds to observation (b), and **which path the reload arrived
   by** — the resume path or the parachute.

> If it arrived by the parachute, **A1 is false and that is the finding.** It is not a
> failed run to repeat until it passes.

Result: pending

---

## §3 — Channel never established [P1 · LIVE-02, LIVE-04, LIVE-05]

**Role** — an account holding `door.operate` for the night being opened.

**Setup** — desktop Chrome. DevTools → Network → *Request blocking* → block the project's
Realtime WebSocket endpoint. The concrete project ref stays in `.env.local` and is not
written here. **With the block already active**, open the door and select the night. The
rest of the network stays up: this is the *never established* case, not the offline case.

1. The counter row reads `updated Ns ago`, and N climbs.
2. A scan of a valid code returns its verdict at a latency **indistinguishable** from a
   scan with the channel healthy.
3. At about 5 minutes the staleness band appears — record the wall-clock time and the
   value of N.
4. Tapping the counter row reloads the list and N returns to `0s`.
5. **No sentence about permission, authorisation or the operator appears anywhere on the
   screen** (D-38-04 — a refused channel is not a verdict about who you are).

Record: the wall-clock time of observation 3, the value of N when the band appeared, and
the verdict latency of observation 2 beside a healthy-channel scan.

Result: pending

---

## §4 — Channel dropped mid-night [P2 · LIVE-02, LIVE-03, LIVE-05]

**Setup** — door open and healthy first: band absent, counter resetting normally. Only
then cut the network. **The page is never reloaded by hand during this procedure.**

1. A scan still returns its verdict, from cache, with the network down.
2. The staleness band appears.
3. On restoring the network, a full reload happens **with nobody touching the screen**, and
   the counter returns to `updated 0s ago`.
4. The band disappears once the reload lands.

Record: the wall-clock time of observations 2 and 3, and the elapsed time between restoring
the network and the counter resetting.

> **"Nobody touching the screen" is the load-bearing half of this section**, and it is a
> claim about the *absence* of a human action. Only a person watching can attest to it.
> LIVE-03 stands on it.

Result: pending

---

## §5 — Degraded, not dropped: Slow 3G with the channel UP [P4 · LIVE-02]

**Setup** — DevTools → Network → throttling *Slow 3G*. The channel is **up**; it is merely
slow.

1. Measure the verdict latency of an **offline-path** scan under throttling.
2. Measure the same on an **unthrottled** baseline.
3. The two must be **unchanged** against each other: the verdict never touches the network,
   so it must not move.
4. The list reload is merely late — the counter climbs higher than usual before resetting.

Record: both latencies, side by side, both measured on the offline path, plus the
wall-clock time.

> If latency moves, `mergeAttendees` is holding a `readwrite` transaction across the
> verdict's read path and the deferral in `requestReload` has failed.

> **A divergence Phase 38 recorded rather than resolved, and this pass resolves it by
> running both sides.** `38-VALIDATION.md` describes P4 as *airplane mode*; PLAN and
> RESEARCH describe it as *Slow 3G*. Neither had been run, so neither was chosen — and the
> consequence Phase 38 stated is that **the fully-offline door is not covered by P1–P7 as
> written**. This pass runs **both**: §5 is Slow 3G with the channel up, which measures
> IndexedDB contention at scan time, and §8 is radio off, which measures the door existing
> at all. **They are different measurements and one does not substitute for the other.**
> Do not record §8 as having covered §5, or a later reader will retire a check that was
> never run.

Result: pending

---

## §6 — Two devices, the headline behaviour [P5 · LIVE-01]

**Role** — **two accounts**, each holding `door.operate` for the **same night**, signed in
on **two separate devices**. Never one account in two tabs: a single session in two tabs
shares one browser client and would not prove what two doors prove.

**Setup** — both devices on the same night, both with the door open and healthy (band
absent). Device B is then **put down and not touched again** for the rest of the section.

1. Check in a valid code on device A.
2. Device B's counter changes **without anyone touching device B**.
3. It happens within about **2 seconds** of the check-in on A.
4. **Repeat three times**, recording each elapsed time as a number measured with a clock.

Record: all three elapsed times and the wall-clock time of each repetition.

> **A change that only arrives at about five minutes is not a pass.** It is the safety
> reload doing its job while LIVE-01 does not — the parachute masking the failure. This is
> the only check that can see a channel which joins, reports `SUBSCRIBED`, raises no policy
> error, and delivers nothing.

Result: pending

---

## §7 — A person not assigned to the night hears nothing [P7 · LIVE-06]

**Role** — an **approved `member`** account with **no** `door.operate` assignment for that
night. Note the two axes: `member` is the role, `approved` is the status, and neither is an
assignment to a night.

**Setup** — the door address redirects such an account, so the subscription is **not**
driven from the door. Drive it from a scratch page or the Realtime Inspector **using that
account's own session** — never a service key, never another account's token, or the
procedure proves nothing about the boundary it exists to test. The night's id is treated as
known to the subscriber: the claim under test is not that the id is secret.

1. Subscribe to that night's `door:<uuid>` topic. The status must be `CHANNEL_ERROR`.
2. **No message ever arrives** — including while a **check-in is performed on that night**
   from a properly assigned door during the observation window.

Record: the status string **verbatim**, the wall-clock time, and the fact that a check-in
was performed on that night during the window. Observation 1 without observation 2 is only
half the proof.

Result: pending

---

## §8 — THE DARK ROOM [STAFF-04 criterion 2 + criterion 3 + 38-HUMAN-UAT test 8]

Radio off, both phones. Every step carries its wall-clock time and a verbatim observation.

### §8.1 The room and the hand

1. Set the screen to **minimum brightness**. Record the brightness setting.
2. One hand only, for everything that follows.
3. The camera is **not moved** once the door is open.

Result: pending

### §8.2 Radio off, launched from the home screen

1. Airplane mode ON. Confirm the radio is off, not merely the Wi-Fi.
2. Launch the app **FROM THE HOME SCREEN** — the installed icon, not a browser tab, not a
   typed address.
3. Record the wall-clock time of the launch.

Result: pending

### §8.3 What appears at the launch

1. Record what appears, **verbatim**.
2. Record **which document it came from**.

> Why: the launch is a **two-document hop**, not one. `start_url` is `/` (D-39-04) and
> `src/app/page.tsx` sends a signed-in caller onward to `/dashboard` — so offline this
> needs either a usable cached `/`, which for a signed-in account is a *redirected*
> response and the least cacheable kind, or a usable cached `/dashboard`. A procedure that
> expects one document and meets two produces an observation nobody can interpret.

Result: pending

### §8.4 Reach the door

1. Record **which address** the door was reached at.
2. Record **by which route** — tapped from the nav, or typed.
3. Record **whether it rendered**.
4. **If it did not, that is the finding.** Write what appeared instead, verbatim.

Result: pending

### §8.5 Scan

1. Scan a valid code.
2. Record the **verdict**.
3. Record the **latency**.
4. Record the **haptics** — fired or not.
5. Record the **flash** — fired or not.

Result: pending

### §8.6 The counter row, tapped one-handed at minimum brightness [38-HUMAN-UAT test 8 · LIVE-05]

> **This subsection is the OQ4 fold-in, and it is marked so on purpose.** It is
> `38-HUMAN-UAT` test 8, which carries no P number and is not in D-39-07's enumeration of
> six. It is here because it is a dark-room, one-handed, minimum-brightness observation —
> the same room and the same minute as criterion 3. **One line removes it if the owner
> disagrees.**

1. The counter row — a labelled `<button>` — reads `updated Ns ago`, and N climbs.
2. Tap it **one-handed, at minimum brightness, without moving the camera**.
3. N must return to **0**.
4. Record whether the tap was **reliably hittable**, across several attempts.

> **If it cannot be hit reliably in the dark, that is a finding, not a preference.**

Result: pending

### §8.7 Radio on — reconnect and sync

1. Airplane mode OFF. Record the wall-clock time.
2. Observe the reconnection.
3. Observe the queue draining.
4. Record the **elapsed time to a settled queue**.

Result: pending

### §8.8 Repeat §8.2 – §8.4 for the OTHER address, COLD

**"Cold" means never opened on that device since the deploy.**

1. Confirm the other address has not been opened on this device since the deploy. If it
   has, this step measures nothing — use the second phone.
2. Airplane mode ON.
3. Launch and reach the door at the **other** address.
4. Record which address, by which route, and whether it rendered. **If it did not, that is
   the finding** — write what appeared instead, verbatim.

> Why: **cache keys are request URLs.** `/door` and `/admin/scanner` are two different URLs
> and therefore two **independent** entries in every bucket, under every mechanism.
> Visiting one address does not make the other reachable offline. The pitfall this step
> guards against is concluding *"offline works"* from the address that was just opened
> online in §0.5.

Result: pending

---

## §9 — Results

One row per observation. Every `Result` cell reads `pending` until the sitting fills it in.

| § | Observation | Requirement it closes | Result | Wall-clock time |
|---|---|---|---|---|
| §0.1 | Realtime `suspend` is `false` | precondition — all of LIVE-01 … LIVE-06 | pending | |
| §0.2 | four triggers + one SELECT policy present | precondition — LIVE-01, LIVE-06 | pending | |
| §0.3 | the deployed build id, read off the page | precondition — all | pending | |
| §0.4 | the active service worker's script URL | precondition — STAFF-04 criterion 2 | pending | |
| §0.5 | both addresses opened online; bucket + body per address; offline reload | STAFF-04 criterion 2 (precondition), Open Question 2 | pending | |
| §0.6 | deploy time and first-request time, on a day with no night | precondition — STAFF-04 criterion 1 | pending | |
| §1.1 | `/door` renders the door, address bar unchanged | STAFF-04 criterion 1 | pending | |
| §1.2 | `/admin/scanner` renders the door, address bar unchanged | STAFF-04 criterion 1, D-39-02 | pending | |
| §1.3 | neither document request produced a 3xx — both codes verbatim | STAFF-04 criterion 1, D-39-02 | pending | |
| §1.4 | the Check-in entry's rendered `href` | STAFF-04 criterion 1 | pending | |
| §1.5 | a `pending` organizer account is drawn the Check-in entry | D-39-06 | pending | |
| §2 | the pocket: ≥65 min, reload on resume, `updated 0s ago`, which path | LIVE-03, assumption A1 | pending | |
| §3 | channel never established: N climbs, latency unchanged, band at ~5 min, tap resets, no permission language | LIVE-02, LIVE-04, LIVE-05 | pending | |
| §4 | channel dropped mid-night: verdict from cache, band appears, reload with nobody touching the screen | LIVE-02, LIVE-03, LIVE-05 | pending | |
| §5 | Slow 3G, channel up: offline-path verdict latency unchanged against baseline | LIVE-02 | pending | |
| §6 | two devices, two accounts: B's counter changes untouched within ~2 s, three times | LIVE-01 | pending | |
| §7 | an unassigned approved `member`: `CHANNEL_ERROR`, no message, check-in performed in the window | LIVE-06 | pending | |
| §8.1 | minimum brightness setting recorded, one hand, camera not moved | STAFF-04 criterion 3 | pending | |
| §8.2 | radio off, launched from the home screen | STAFF-04 criterion 2 | pending | |
| §8.3 | what appeared at the launch, verbatim, and from which document | STAFF-04 criterion 2 | pending | |
| §8.4 | the door reached: which address, by which route, whether it rendered | STAFF-04 criterion 2 | pending | |
| §8.5 | scan: verdict, latency, haptics, flash | STAFF-04 criterion 3 | pending | |
| §8.6 | counter row tapped one-handed at minimum brightness; N returns to 0; reliably hittable | LIVE-05 (38-HUMAN-UAT test 8) | pending | |
| §8.7 | radio on: reconnect, sync, elapsed time to a settled queue | STAFF-04 criterion 3 | pending | |
| §8.8 | the OTHER address, cold, radio off: whether it rendered | STAFF-04 criterion 2 | pending | |
| §8 as a whole | the full door pass — launch, scan, reconnect, sync, in a dark room | STAFF-04 criterion 3 | pending | |

---

## Closing block

### P6 is excluded from this sitting, and this is where that is said

**P6 is not a step of this pass and must not become one.** It writes to production. The
only authorisation this project held was spent on a schema-only apply at
`2026-08-11T11:15:24Z` and is recorded exhausted, and this project lost **63 production
rows across seven tables** to a verification script, with **no PITR**. It needs its own
**fresh, explicitly scoped** authorisation and stays where it is, in `38-HUMAN-UAT.md`
test 2.

**Its deadline is an act rather than a date: before the next night is published with
tickets on sale.** From that moment the first real purchase becomes the first exercise of
four triggers sitting on the money and door write paths — and with no error tracking in
this project, a wrapper that raised outside the `realtime.send` call would fail that
purchase with nobody knowing why.

**And if any step of this pass ever finds itself needing to *create* a guest-list entry or
a night, it has drifted into P6 and must stop.** Should a fresh authorisation ever be
granted, the four rules are part of the procedure and not a reminder kept elsewhere:

1. **Capture the primary key at creation** — not a name, not a position in a list.
2. **Delete by that primary key**, never by clicking a delete control and never by a name
   match or by walking up a DOM tree. The direction of the failure is the point: a
   selector that is too wide deletes *more* than it should; a delete by primary key, when
   it is wrong, finds nothing.
3. **Enumerate the cascade set by reading `pg_constraint`**, not by remembering it. A
   cascade is a write path nobody declared.
4. **Confirm the deletion from a source different from the one used to delete.** A count
   taken with the instrument that caused the effect is not a measurement — it is an echo.

### OQ3 is deferred, and here is where it comes back

Whether the door should get a runtime cache rule with a life **longer than 24 hours** is
**not decided by any plan of this phase**. The phase ships with the existing runtime rules
plus the warm-up in §0.5. Observe §8, then take the question to **`/gsd:discuss-phase`
with the §8 reading attached**.

It is a product decision about **how stale a door may be** — and the door's own gate says a
stale surface is a hazard. It is not a planner's call, and it is not something to settle by
loosening a matcher. In particular, no answer to it may re-admit `/events/**` to Cache
Storage: that rule is `NetworkOnly` as a deliberate venue-secrecy resolution, and there is
no rollback for a revealed address.

### Phase closure

**This phase does not close when the build goes green.** Exactly like Phase 38, it closes
when this document is **filled in**, at the end-of-v1.5 sitting (D-39-07). Until then the
phase is *executed*, not *complete*.

And when it is filled in, **both** records receive the outcome: this document and
`38-PROCEDURES.md`. Neither may say "passed" while the other says "pending".
