---
phase: 38-live-attendance-freshness
plan: 05
subsystem: check-in & offline (the door) — the live channel
tags: [live-attendance, realtime, LIVE-01, LIVE-02, LIVE-03, LIVE-06, LIVE-07, resume, heartbeat]
requires:
  - "38-03's `requestReload` / `requestReloadRef` — the one entry point every reload trigger uses"
  - "38-03's `armSafetyTimer` and its foreground-only visibility effect"
  - "38-02's migration contract: topic `door:<uuid>` lowercase, `private = true`, event `attendance_changed`"
  - "`private.has_capability('door.operate', <party>)` from phase 32 — consulted by the policy, never re-derived here"
provides:
  - "the per-night subscription effect — one channel, `private: true`, lowercase topic, torn down on change and on unmount"
  - "`channelLive` — a transport flag, written by `SUBSCRIBED` and by the heartbeat, read by nothing yet"
  - "`hadDroppedRef` — the reconnection detector behind `requestReload(\"resubscribed\")`"
  - "`resubscribe` / `channelEpoch` — the rebuild, driven by React's own cleanup so the channel has one construction site"
  - "the three resume signals joined to the listener blocks that already existed"
affects:
  - "38-06 (the band and the counter row): reads `channelLive`, which nothing renders yet"
  - "38-07 (the door procedures): P5 is the only evidence that the two topics match; P3 the only evidence for the pocket"
tech-stack:
  added: []
  patterns:
    - "the first Supabase Realtime use in this product — no in-repo analog for the API itself"
    - "a discriminated-union `switch` with a `never` guard, so the build proves exhaustiveness"
    - "a rebuild counter in the dependency array, instead of a second channel-construction site"
    - "three browser events treated as one signal, because the correct behaviour is identical"
key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/scanner/ScannerClient.tsx"
decisions:
  - "D-38-14 taken: `worker: true` not adopted; `onHeartbeat` instead, and `src/lib/supabase/client.ts` is byte-identical"
  - "D-38-15 taken: `private_only` not applied to the project — recorded as hardening with its own precondition and its own behavioural proof"
  - "D-38-16 taken: one browser client, the `@supabase/ssr` singleton, and no per-call `realtime` options"
  - "The heartbeat only ever LOWERS `channelLive`; `SUBSCRIBED` is the sole writer that raises it (deviation, Rule 2)"
  - "`resubscribe` is a rebuild counter in the effect's deps, not a second construction site (deviation, Rule 2)"
  - "One `visibilitychange` listener in the whole file, not two on the same event (deviation, Rule 2)"
metrics:
  duration: ~55 min
  tasks: 3
  files: 1
  completed: 2026-08-11
---

# Phase 38 Plan 05: The Door Listens to Its Own Night — Summary

`ScannerClient.tsx` gains one channel per selected night — `private: true`, topic
lowercased, torn down in the cleanup that opened it — a broadcast handler that
calls the reload entry point and nothing else, a status callback that writes one
flag and one categorised line, and three browser events treated as a single
"the app came back" signal.

**Nothing is rendered.** `channelLive` is written and read by nobody: plan 38-06
owns the band and the counter row. And nothing is applied to production: the
migration that makes any of this deliver a message is still written-only, behind
plan 38-04's owner checkpoint.

---

## What Was Built

### Task 1 — one channel per night, and a status callback that decides nothing (`7c1ea0d`)

| Anchor | Line | What it is |
|---|---|---|
| `createClient` import | `:53` | the house factory, imported at module top, called inside the effect |
| `REALTIME_SUBSCRIBE_STATES`, `type RealtimeChannel` | `:54-57` | from `@supabase/supabase-js`, a direct dependency of this project |
| `channelLive` | `:482` | a **transport** fact — this device holds a joined channel for this night |
| `hadDroppedRef` | `:490` | has the channel been out of `SUBSCRIBED` since it last joined |
| the subscription effect | `:805-915` | placed immediately after the per-night `doorAuth` effect, so the two per-night disciplines sit together |
| `setChannelLive(false)` first | `:810` | cleared on every change of night, before anything else |
| the topic and `private: true` | `:848-849` | both carry the paragraph that says how each fails silently |
| the broadcast handler | `:851-857` | `requestReloadRef.current?.("channel")` at `:856`, and nothing else |
| the status `switch` | `:869-901` | four members, one `never` guard at `:895`, no collapsing default |
| `removeChannel` | `:910` | in the cleanup that armed it |

Three properties, in the order they matter:

1. **It is fire-and-forget.** Nothing awaits `SUBSCRIBED` before a scan is
   allowed, the camera effect does not depend on this one, and the status
   callback writes exactly one piece of state. That is what makes LIVE-02
   structural rather than careful — and the five extractions below say so
   mechanically.
2. **The two silent details carry their own paragraph.** `private: true` must
   match the fourth argument of `realtime.send`, and the topic must be lowercase
   because Postgres renders `uuid::text` lowercase and topic matching is a
   byte-exact string comparison. Get either wrong and the channel joins, reports
   `SUBSCRIBED`, the band never appears — because the channel *is* live — and the
   list only ever changes every five minutes. No automated check catches it.
3. **D-38-04 is enforced by structure.** The callback may write `setChannelLive`
   and log one categorised line. It may not touch `doorAuth`, may not call
   `cacheDoorAuth`, and produces no sentence about the operator. The reason is
   written above the callback rather than inside it: `CHANNEL_ERROR` carries
   `Unauthorized` for a refused join **and** for an expired JWT, a rate limit and
   a Realtime restart — indistinguishable from the client, so the door does not
   guess.

### Task 2 — every way the app can come back is the same signal (`fcfca55`)

| Anchor | Line | What it is |
|---|---|---|
| `channelEpoch` / `resubscribe` | `:513-516` | the rebuild, driven by React's own cleanup |
| `goOnline` | `:648-652` | the handler that already existed, extended — not a second `online` listener |
| `onPageShow` | `:655-658` | the bfcache restore, where `visibilitychange` may not fire |
| `window.addEventListener("pageshow", …)` | `:661` | paired at `:725` |
| `onHeartbeat` registration | `:681-687` | lowers the flag, calls `connect()` |
| `onHeartbeat(() => {})` teardown | `:732` | the library returns no disposer — see below |
| `resubscribe()` on visible | `:1341` | inside 38-03's visibility effect, which already owned that event |
| the effect's deps | `:915` | `[selectedPartyId, channelEpoch]` — no `searchQuery` |

**Why the rebuild is a counter and not a hand-rolled teardown.** `resubscribe`
bumps `channelEpoch`; the effect lists it; React's cleanup then performs exactly
`removeChannel` → `setAuth()` → `channel(...).subscribe(...)`, in that order. The
channel therefore has **one construction site**, not two that can drift — and a
drift there (a `private` flag or a case that stopped matching in only one of the
two copies) is precisely the silent failure this phase exists to refuse.

**Why rebuild at all, rather than trust the library.** It does auto-rejoin, with
a 1 s / 2 s / 5 s / 10 s backoff. But on resume the access token may still be the
expired one — auth-js stops its refresh ticker while the document is hidden and
the JWT lives 3600 s — so a rejoin fails, backs off and retries. It converges,
through a sequence of failures, during the thirty seconds when a queue is
forming. Rebuilding after an explicit `setAuth()` converges in one step. **No
second backoff of our own** was added: two competing retry loops are a join
storm, and this project's `max_joins_per_second` is 100.

**Step three is the one that matters, and it is written beside the handlers.**
The reload is unconditional and never chained to the subscription's outcome: the
list is correct after `requestReload` whether or not the resubscribe succeeded.

---

## Verification Evidence

`npm run build` → **exit 0**, run after every task (`next build --webpack`; there
is no separate `typecheck` script — the build is the type gate).

### What the green build proves, and the four things it does not

**Proves — and this much is real,** because the Realtime API is typed
independently of the `Database` generic:

1. The client methods exist with the signatures used — `realtime.setAuth()`,
   `channel(topic, { config: { private } })`, `.on("broadcast", …)`,
   `.subscribe(cb)`, `removeChannel`, `realtime.onHeartbeat`, `realtime.connect`.
2. The four-member status union is handled **exhaustively** — the `never` guard
   at `:894` is what makes that claim true; a `switch` on its own would not.
3. The file compiles and typechecks as a whole.

**Does not prove — named so the next reader does not over-read it:**

| Not proved | What settles it |
|---|---|
| that the topic this client subscribes to matches the topic the trigger sends to | procedure **P5** — two devices, one night |
| that `door.operate` is spelled correctly in the policy | plan 38-04's probes |
| that any column named in the migration exists | plan 38-04's probes |
| that the policy admits the intended set and refuses the rest | procedure **P7** |

And the standing caveat: **this repository has no test runner for the product** —
no `test` script, no `*.test.*`, no `*.spec.*`. Nothing here may be called
"verified" on the strength of a green build.

**Assumption `A1` remains open.** Whether the composed wake signal actually fires
on a suspended home-screen PWA — and in which order — is not measured. The
per-event browser support is verified; the *ordering on resume* is not. Procedure
**P3**, the pocket, is the only thing that settles it, and it runs in plan 38-07.

### The five LIVE-02 structural checks — after, beside plan 38-03's before-figure

```bash
awk '/(const|async function|function) <fn>/,/^  \};?$/' "$f" \
  | grep -nE 'channel|Channel|realtime|Realtime|channelLive'
```

| # | Function | Body (38-03) | Body (now) | Output | Verdict |
|---|---|---|---|---|---|
| 1 | `handleVerify` | 55 | **55** | *(nothing)* | clean |
| 2 | `ticketOffline` | 98 | **98** | *(nothing)* | clean |
| 3 | `membershipOffline` | 54 | **54** | *(nothing)* | clean |
| 4 | `ticketOnline` | 130 | **130** | *(nothing)* | clean |
| 5 | `membershipOnline` | 87 | **87** | *(nothing)* | clean |

The five bodies are byte-for-byte the same size as before this plan: the channel
did not enter a single verdict path, and it did not displace one either.

**Assertion that the check can fail, taken before reading its result** — an empty
grep over an empty extraction is a false negative, and this project has a
recorded precedent for that failure mode. The control run alongside each
extraction greps the same body for a token that **is** present (`partyId`) and
returns 7 / 6 / 2 / 4 / 2. The pipeline fires; the five empty results are a real
green.

### Task-1 structural checks

| Check | Result |
|---|---|
| `grep -cE 'config: \{ private: true \}'` | **1** |
| `grep -cE 'door:\$\{selectedPartyId\.toLowerCase\(\)\}'` | **1** |
| `grep -cE 'attendance_changed'` | **1** |
| `grep -cE 'removeChannel'` | **2** (the call at `:911`, plus the docblock that says there was none in this repo before) |
| the broadcast handler's body | `requestReloadRef.current?.("channel")`, and **no `fetch(`** |
| the effect's dep array | `[selectedPartyId, channelEpoch]`; `searchQuery` in it: **0** |
| `doorAuth` / `cacheDoorAuth` / permission wording inside the `subscribe` callback | **0** (see deviation 5 for how the range was measured) |
| `switch` inside the `subscribe` callback | **1**, with a `never` guard |

### Task-2 structural checks — counted, not eyeballed

| Listener | added | removed |
|---|---|---|
| `window` `online` | 1 | 1 |
| `window` `offline` | 1 | 1 |
| `window` `pageshow` | 1 | 1 |
| `document` `visibilitychange` | 1 | 1 |
| `window` `visibilitychange` | **0** | — |

| Check | Result |
|---|---|
| `onHeartbeat` wired | `:681` register, `:732` teardown |
| hand-rolled retry — `grep -cE 'setTimeout\(.*(retry\|backoff\|rejoin)'` | **0** |
| the three resume reasons | `:651` `"online"` · `:657` `"pageshow"` · `:1342` `"foreground"` |
| `git diff --quiet -- src/lib/supabase/client.ts` | exit 0 — `worker: true` not adopted (D-38-14) |

### LIVE-07 — the door's mechanism is still only the door's

| Command | Output | Reading |
|---|---|---|
| `grep -rl "offline/checkin-store" src --include='*.ts' --include='*.tsx'` | 2 files: `ScannerClient.tsx`, `api/tickets/checkin/route.ts` | **the naive form, and it counted 2 before this plan too.** The route hit is prose — two docblock citations at `:34` and `:220`, not an import |
| `grep -rln 'from "@/lib/offline/checkin-store"' src` | `ScannerClient.tsx` | **1 importer. LIVE-07 holds** |
| untracked files under `src/lib` | **0** | nothing was generalised out |
| `git diff --name-only 37c4c76 HEAD -- src/lib` | *(empty)* | nothing under `src/lib` changed at all |
| `git diff --name-only 37c4c76 HEAD` | `src/app/(admin)/admin/scanner/ScannerClient.tsx` | **one file, whole repo** |

Both figures are recorded rather than the convenient one being substituted
silently — the same discipline plan 38-03 applied to the same grep.

**And the reason, because a green grep here reads like a formality and is not
one.** The door and the bar run on **opposite defaults**: the door admits and
records when in doubt, because a false refusal happens in front of a queue; the
bar records nothing when in doubt. A shared mechanism makes one of those two
defaults accidental — it would be inherited from whichever surface was written
first, by a reader who never saw the choice being made. That is D-38-12, and it
is why the honest split, if this file's size ever forces one, is a door-scoped
module beside its only caller and **never** a `src/lib/realtime/useLiveList.ts`.

### The one-fetch-site figure, unchanged

| Command | 38-03 | Now |
|---|---|---|
| `grep -cE 'fetch\(\`/api/tickets/attendance\?'` | 1 | **1** |
| the plan-38-03 naive form (matches `fetchParties` and a POST too) | 3 | **3** |

No second fetch site was created. The channel reaches the list through
`requestReload` or not at all.

---

## The three decisions this plan records

**D-38-14 — `worker: true` is not adopted.** It can only be set at client
construction, and `createBrowserClient` is a module-level singleton, so the
change would land in `src/lib/supabase/client.ts` — a file governed by
`access-gating.md` and shared by every browser client in the product. On the
device that matters it also buys little: an iOS home-screen PWA is *suspended*,
not throttled, so its workers do not run either. `onHeartbeat` was taken instead;
it needs no construction change. **Evidence it was not taken:**
`git diff --quiet -- src/lib/supabase/client.ts` exits 0. The worker stays a
recorded option.

**D-38-15 — `private_only` is not applied to the project.** It is defence in
depth rather than the boundary: the database sends `private = true`, so a public
subscriber to the same topic receives nothing anyway. It disconnects every
connected client when changed — so it must never be applied during a night — and
the `GET` does not echo it back, so applying it and believing it is not the same
as proving it. Recorded as a hardening item with its own precondition and its own
behavioural proof: a public join must answer `PrivateOnly`.

**D-38-16 — no second Supabase browser client, and no per-call `realtime`
options.** `@supabase/ssr` caches a module-level singleton in the browser, so
`createClient()` returns the same client every time and a second caller's options
are silently ignored. With refresh-token rotation on and a 10-second reuse
window, two clients racing a refresh can put one into a failed refresh and, at
worst, a sign-out — at the door. The reason is written at the call site, not only
here.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 2 — missing critical functionality] The heartbeat only lowers `channelLive`; `"ok"` does not raise it**

- **Found during:** Task 2.
- **Issue:** the pattern the plan carries from research raises the flag on
  `status === "ok"`. But a live **socket** is not the same claim as "this device
  is joined to this night's channel". After a join the policy refused, the socket
  stays connected and answers `ok` every 25 seconds — so the flag would flip back
  to true within half a minute, the band (plan 38-06) would never appear, and the
  door would look green while hearing nothing. That is the exact deception this
  phase is built to refuse, arriving through the mechanism meant to detect it.
- **Fix:** the heartbeat writes `setChannelLive(false)` on `disconnected` /
  `timeout` and calls `connect()`. It never raises. `SUBSCRIBED` is the only
  signal that proves the claim, so the subscribe callback is the only writer that
  raises the flag — and recovery still works, because a reconnected socket
  rejoins and `SUBSCRIBED` fires (also triggering `requestReload("resubscribed")`
  through `hadDroppedRef`).
- **Files modified:** `src/app/(admin)/admin/scanner/ScannerClient.tsx`.
- **Commit:** `fcfca55`.

**2. [Rule 2] `resubscribe` is a rebuild counter, so the channel keeps one construction site**

- **Found during:** Task 2.
- **Issue:** the plan describes `resubscribe` as tearing the channel down and
  building it again itself. Written literally that is a **second** place where
  the topic, the `private` flag, the event name and the status `switch` are
  spelled out — and the two copies can drift. A drift there is silent in exactly
  the direction that hurts.
- **Fix:** `resubscribe` bumps `channelEpoch` (`:513-516`), the effect lists it
  in its dependency array, and React's own cleanup performs `removeChannel` →
  `setAuth()` → `subscribe()` in that order. **Consequence, stated rather than
  hidden:** the dependency array is `[selectedPartyId, channelEpoch]` and not the
  `[selectedPartyId]` the plan's criterion names. The criterion's purpose is
  intact and measured — `searchQuery` in that array: **0** — and `channelEpoch`
  changes only on a resume signal, which is exactly when a rebuild is wanted.
- **Files modified:** `src/app/(admin)/admin/scanner/ScannerClient.tsx`.
- **Commit:** `fcfca55`.

**3. [Rule 2] One `visibilitychange` listener in the file, not two on the same event**

- **Found during:** Task 2.
- **Issue:** the plan asks for all three resume listeners inside the block at
  `:529-577`. But plan 38-03 already registered a `visibilitychange` listener on
  `document` in its own effect, and that listener already calls
  `requestReload("foreground")` and re-arms the parachute. Adding a second
  listener for the same event, calling the same reload, would mean two handlers
  racing on one signal and two reload requests for one foreground — legible to
  nobody six months from now.
- **Fix:** `online` and `pageshow` joined the listener block as specified;
  `resubscribe()` was added **inside** 38-03's existing visibility handler
  (`:1341`), which now does all three things in order — rebuild, reload, re-arm.
  Counted: `document.addEventListener("visibilitychange"` appears **once**.
- **Files modified:** `src/app/(admin)/admin/scanner/ScannerClient.tsx`.
- **Commit:** `fcfca55`.

**4. [Rule 3 — a plan check that cannot be satisfied without reintroducing a fixed defect] `requestReload("foreground")` verbatim**

- **Found during:** Task 2 verification.
- **Issue:** the plan's `(G)` check greps for the literal
  `requestReload("foreground")`. Satisfying it literally requires a handler that
  closes over `requestReload` directly — which carries `searchQuery` into that
  effect's dependency array, rebuilding the listener on **every keystroke** and
  clearing the safety timeout with it. That is exactly the defect plan 38-03
  recorded and fixed as its Deviation 2, and `requestReloadRef` exists to prevent
  it. A check written before that indirection existed cannot be satisfied without
  undoing it.
- **Fix:** no code was bent to a grep. The invariant was re-measured on the form
  the code actually uses. **Both figures:**
  - `grep -cE 'requestReload\("foreground"\)'` → **0** (the plan's literal form)
  - `grep -nE 'requestReloadRef\.current\?\.\("(foreground|pageshow|online)"\)'` →
    **3**, at `:651`, `:657`, `:1342` — one per resume signal
- **Files modified:** none.
- **Commit:** n/a (verification only).

**5. [Rule 1 — a check that stops before the thing it is checking] The `awk` range over the `subscribe` callback under-extracts**

- **Found during:** Task 1 verification.
- **Issue:** the plan extracts the status callback with
  `awk '/\.subscribe\(\(status/,/\}\);/'`. The range ends at the **first** line
  matching `});` — and the categorised log line,
  `console.warn("scanner:channel_not_listening", { status });`, matches it. The
  extraction therefore stopped 14 lines early and the `default` branch was never
  examined. A grep that returns 0 over a range that ends before the code is a
  false negative, and the house convention for a structured log guarantees the
  collision for any callback that logs an object.
- **Fix:** the terminator was anchored to the callback's own indentation,
  `awk '/\.subscribe\(\(status/,/^        \}\);/'`. **Both figures:** the plan's
  range extracts **20** lines, the anchored range **34** — the whole callback,
  ending on its real closing line. On the anchored range the D-38-04 grep
  (`doorAuth|cacheDoorAuth|not authorised|not authorized|permission`) returns
  **0**, and the controls fire: `setChannelLive` **2**, `switch` **1**, `never`
  **1**. No code was changed for it — the D-38-04 comment sits **above** the
  `.subscribe(` line by design, so the words it must contain ("permission") do
  not land inside the range that forbids them.
- **Files modified:** none.
- **Commit:** n/a (verification only).

**6. [Rule 3 — blocking, environment] The worktree had no `node_modules`, so `npm run build` could not run**

- **Found during:** Task 1 verification.
- **Issue:** this executor runs in a git worktree, which carries no installed
  dependencies. Without them there is no build, and the build is this repository's
  only automatic gate on product code.
- **Fix:** `node_modules` was **symlinked** to the main checkout's, after
  verifying `package.json` and `package-lock.json` are byte-identical between the
  two. **No package was installed, added, removed or upgraded** — every API used
  ships in dependencies already resolved at 2.97.0 / 0.8.0. The symlink is
  ignored by git (`.gitignore:4`) and appears in no commit.
- **Files modified:** none.
- **Commit:** n/a.

### Accepted costs, said out loud

**A deliberate teardown produces one extra reload.** Verified in
`realtime-js` 2.97.0 (`RealtimeChannel.js:140`): `removeChannel` → `unsubscribe`
→ `close` reaches the status callback as `CLOSED`, which sets `hadDroppedRef`. So
after a party change or a resume, the new `SUBSCRIBED` fires
`requestReload("resubscribed")` on top of the reload the change already asked
for. Cost: **one extra GET**, absorbed by the 500 ms coalescing where the timing
allows. This is the direction D-38-21 chose on purpose — one too many costs a
request, one too few leaves a stale list at a door — and distinguishing an
intentional close from a real drop would mean a flag whose only job is to make a
correct reload not happen.

**A single statement can produce two messages on one topic**, per 38-02's
measured fan-out case. The subscription tolerates it by construction: the handler
only asks for a reload, and 38-03's 500 ms coalescing collapses the pair.

**The build's workspace-root warning is environmental.** `next build` warns that
it inferred the workspace root because a second lockfile is visible above the
worktree. It is a property of running inside `…/Resonate/.claude/worktrees/…`,
not of this change, and it does not appear in the main checkout.

---

## Cross-domain Impact

- **Check-in & offline (primary).** Nothing was added between a scan and its
  verdict. The five resolution paths are byte-identical in size and contain no
  reference to the channel — measured, above. The subscription is fire-and-forget:
  no scan waits for it, and the camera effect does not depend on it. With the
  radio off, the door behaves exactly as it did before this plan.
- **Access & gating.** The client contributes exactly one thing to the boundary:
  `private: true`, which is how the policy gets consulted at all. It re-derives
  no capability, reads and writes no `doorAuth`, and derives no sentence about
  the operator from a transport state. `src/lib/supabase/client.ts` is
  byte-identical to its state before this phase.
- **Next.js architecture.** No new surface, no new route, no new module. One
  client component modified; nothing moved into or out of `(work)`. Nothing new
  is rendered, so the dark-venue gate has nothing new to answer for yet — plan
  38-06 does.
- **Supabase & data.** No migration, no schema change, no type change. **No
  production write of any kind**: the migration this channel depends on is still
  written-only, and nothing here probes for it.
- **Monotone guards** (`meta-gates.md`): none of the three is touched — no venue
  reveal, no payment state, no series numbering.
- **Zero silent failures.** One new logged path,
  `console.warn("scanner:channel_not_listening", { status })`, in the file's own
  `scanner:<snake_case>` convention, distinguishable from every other category in
  the file. The honest caveat is the project's standing one: **there is no error
  tracking**, so a log is a place nobody looks. The observable effect this phase
  relies on — the band that appears when the door is not listening — is built in
  plan 38-06. Until then the channel is real and, from outside the console,
  unobservable.

---

## Threat Flags

None. No new network endpoint, no new auth path, no new file access pattern, no
schema change at a trust boundary. The one outbound connection is a WebSocket to
Supabase Realtime authenticated by the session JWT the product already holds.

The register's dispositions were honoured:

| Threat | Disposition | How |
|---|---|---|
| T-38-05-01 | mitigate | the boundary is the policy in plan 38-04; this code contributes `private: true`, without which the join is public and the policy is never asked |
| T-38-05-02 | mitigate | D-38-04 enforced structurally — the callback writes one flag and one categorised line; verified by an indentation-anchored scoped grep returning 0 |
| T-38-05-03 | mitigate | no hand-rolled retry (**0**); the library's own backoff is the only one; `resubscribe` is driven by user-visible events, never a loop |
| T-38-05-04 | mitigate | one browser client, the `@supabase/ssr` singleton; no per-call `realtime` options |
| T-38-05-05 | accept | unchanged and deliberately not closed: a revoked assignment does not disconnect an already-joined listener until the connection cycles. What it *does* refuse immediately is that account's read of the attendance route — and the reload is what carries the data. Residual exposure: "hears that something changed on a night whose id they already knew", never "sees who" |
| T-38-05-06 | mitigate | LIVE-07 — one importer of `checkin-store`, zero new files under `src/lib`, zero changes under `src/lib` at all |
| T-38-05-SC | mitigate | **no package was installed, added, removed or upgraded.** Every API used ships in dependencies already resolved at 2.97.0 / 0.8.0 |

---

## Known Stubs

**`channelLive` is written and rendered nowhere.** `grep -n 'channelLive'` finds
its declaration at `:482` and one docblock mention; the setter is called from
four places and the value is read by no expression. That is this plan's scope
boundary, not an oversight: plan 38-06 builds the band and the counter row that
read it. Until then, "the door is not listening" is a fact the code knows and the
person holding the phone does not — which is why 38-06 exists and why the
5-minute parachute from 38-03 is doing the visible work in the meantime.

---

## Publication Check

`.planning/` is tracked and this repository is public. This file names roles —
"the operator", "the person holding the phone" — and never people. No venue, no
date of a night, no line-up, no project ref, no key, no URL.

---

## Self-Check: PASSED

| Claim | Command | Result |
|---|---|---|
| `ScannerClient.tsx` is the only file changed | `git diff --name-only 37c4c76 HEAD` | one path ✓ |
| commit `7c1ea0d` exists | `git log --oneline 37c4c76..HEAD` | present ✓ |
| commit `fcfca55` exists | `git log --oneline 37c4c76..HEAD` | present ✓ |
| build green | `npm run build; echo $?` | `0` ✓ |
| no file deleted by either commit | `git diff --diff-filter=D --name-only HEAD~1 HEAD`, per commit | empty ✓ |
| `STATE.md` / `ROADMAP.md` untouched | `git diff --name-only 37c4c76 HEAD` | absent ✓ — the orchestrator owns those writes |
| no production write | no migration applied, no probe run, no `supabase` CLI invoked | ✓ |
