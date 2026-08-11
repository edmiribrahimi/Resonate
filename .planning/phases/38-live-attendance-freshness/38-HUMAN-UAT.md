---
status: partial
phase: 38-live-attendance-freshness
source: [38-VERIFICATION.md, 38-PROCEDURES.md]
started: 2026-08-11T14:45:00Z
updated: 2026-08-11T14:45:00Z
deferred_to: end of milestone v1.5 (owner decision 2026-08-11, recorded in STATE.md ## Blockers)
batch_with: the 32 open human_needed items from phases 43, 35 and 34 — they need the same five real accounts
---

## Current Test

[awaiting human testing — deferred by the owner to the batched end-of-v1.5 session]

**One item does not follow the batch.** Test 2 (P6) is also the only exercise the
trigger path ever gets. Its deadline is not a date but an act: **before the next
night is published with tickets on sale.** From that moment the first real
purchase becomes the first exercise of four triggers sitting on the money and
door write paths, and with no error tracking in this project, a wrapper that
raised outside the `realtime.send` call would fail that purchase with nobody
knowing why. Measured 2026-08-11: 0 rows in all four tables, 0 future published
parties, 0 tiers on sale — which is exactly why deferring is safe *today*.

## Tests

### 1. P5 — two devices, the headline behaviour
closes: LIVE-01 · sole witness to: Pitfall 2 (the channel that joins, says `SUBSCRIBED`, and delivers nothing)
expected: Two accounts, each holding `door.operate` for the same night, on two separate devices — never one account in two tabs. Put device B down and do not touch it again. Check in a valid code on device A. B's counter must change **without anyone touching B**, within about 2 seconds. Repeat three times, recording each elapsed time. If B never changes AND B's staleness band never appears either, that is Pitfall 2: `private: true` or the topic's case failed to match between client and trigger (`ScannerClient.tsx:904`, `:906` vs the migration's emit). **A change that only arrives ~5 minutes later is the parachute masking the failure, not a pass.**
why human: nothing here can mint a second authenticated session or watch a second physical screen.
result: [pending]

### 2. P6 — the null-party fan-out and the reassignment — REQUIRES A FRESH PRODUCTION AUTHORISATION
closes: LIVE-01 further · sole witness to: Pitfall 1 (LIVE-01 degrading into LIVE-04 with no error anywhere) and D-38-24
expected: On an event with at least two nights — (1) snapshot every table reachable by cascade from `guest_list_entries`, enumerated by **reading `pg_constraint`**, not remembered; (2) create one guest-list entry carrying **no party** and capture its primary key at creation; both doors of that event must reload with nobody touching either screen — one door reloading and not the other is Pitfall 1 present; (3) assign that entry to one night, then to the other: both the gaining **and the losing** door must reload live, not ~5 minutes later — a losing door that only catches up on the parachute is D-38-24 missing; (4) delete the entry **by the captured primary key only**, never via a UI control and never by a name match; (5) confirm the deletion from a source **different** from the one used to delete, and confirm the cascade snapshot is unchanged elsewhere.
why human: writes to production. The only authorisation this phase held was spent on 38-04's schema-only apply at 2026-08-11T11:15:24Z and is recorded exhausted. This project lost 63 production rows to a verification script on 2026-08-10 and has no PITR.
result: [blocked — awaiting a fresh, explicitly scoped authorisation from the owner]

### 3. P7 — a person not assigned to the night hears nothing
closes: LIVE-06 · sole witness to: RLS actually refusing a real session
expected: Sign in as an **approved `member`** with no `door.operate` assignment for that night. The door URL redirects such an account, so drive the subscription from a scratch page or the Realtime Inspector **using that account's own session** — never a service key, never another account's token. Subscribe to that night's `door:<uuid>` topic. Expected: `CHANNEL_ERROR`, and no message ever arrives — including while a check-in is performed on that night from a properly assigned door during the observation window. Record the status string verbatim, and record that a check-in was attempted during the window.
why human: every probe this phase can run goes through the Management API as `supabase_read_only_user`, which **bypasses RLS entirely**. No query available here can show a real browser refused. This is the sole exercise of the actual security boundary.
result: [pending]

### 4. P1 — the channel never established
closes: LIVE-02, LIVE-04, LIVE-05
expected: Block the project's Realtime WebSocket in DevTools request blocking **before** opening the door and selecting the night; the rest of the network stays up. Observe: (a) the counter row reads `updated Ns ago` and N climbs; (b) a valid scan returns its verdict at latency indistinguishable from a healthy-channel scan; (c) at about 5 minutes the staleness band appears — record the wall-clock time and the value of N; (d) tapping the counter row reloads and N returns to `0s`; (e) **no sentence about permission or authorisation appears anywhere on screen** (D-38-04).
why human: needs a browser with active WebSocket blocking and roughly five minutes of watching a screen for a human-scale timing event.
result: [pending]

### 5. P2 — the channel dropped mid-night
closes: LIVE-02, LIVE-03, LIVE-05
expected: With the door open and healthy (band absent), cut the network without reloading the page. Observe: (a) a scan still returns its verdict from cache; (b) the staleness band appears; (c) on restoring the network a full reload happens **with nobody touching the screen**, and the counter returns to `updated 0s ago` — record the elapsed time between restoring the network and the reset; (d) the band disappears once the reload lands.
why human: the load-bearing observation is a claim about the *absence* of a human action. Only a person watching can attest to it. Primary evidence for LIVE-03.
result: [pending]

### 6. P3 — the pocket
closes: LIVE-03 · sole witness to: assumption A1 (whether a suspended iOS home-screen PWA fires the composed wake signal at all)
expected: On the **actual staff phone** — not a simulator, not a desktop — door installed to the home screen, night selected, one scan performed. Lock the phone and leave it in a pocket for **at least 65 minutes**, past the 3600 s access-token lifetime. On unlocking: (a) a full reload fires on resume; (b) the counter reads `updated 0s ago` within a few seconds — **not** after the 5-minute parachute, which would mean the resume signal never arrived; (c) any band that had appeared disappears; (d) a scan immediately afterwards behaves normally. Record the lock and wake times, and which path the reload arrived by.
why human: Safari and iOS Safari implement neither `freeze` nor `resume`; the wake signal is composed by hand, and only a real suspended PWA shows whether that composition fires.
result: [pending]

### 7. P4 — degraded, not dropped
closes: LIVE-02 · sole witness to: IndexedDB contention at scan time
expected: Throttle to Slow 3G with the channel **up** — merely slow, not down. Compare the verdict latency of an offline-path scan against an unthrottled baseline: it must be **unchanged**, because the verdict never touches the network. If latency moves, `mergeAttendees` is holding a readwrite transaction across the verdict's read path and the deferral in `requestReload` has failed. *(Note a recorded divergence: `38-VALIDATION.md` describes P4 as airplane mode, PLAN and RESEARCH as Slow 3G. Neither has been run, so neither was chosen — the fully-offline door is not covered by P1–P7 as written.)*
why human: a timing measurement on a real device with a real camera decode.
result: [pending]

### 8. The LIVE-05 one-handed, dark-room tap check
closes: LIVE-05
expected: Open the night. The counter row — now a labelled `<button>` — reads `updated Ns ago` and N climbs. Tap it **one-handed, at minimum brightness, without moving the camera**: N must return to 0 and the tap must be reliably hittable. If it cannot be hit reliably in the dark, **that is a finding, not a preference**.
why human: legibility at minimum brightness and thumb hittability are properties of a physical screen; the dark-venue gate names this explicitly as untestable by a build.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 1

## Gaps

- **LIVE-01** open until tests 1 and 2 · **LIVE-02** open until 4, 5, 7 · **LIVE-03** open until 5 and 6 · **LIVE-04**'s behavioural corner open until 4 · **LIVE-05** open until 4, 5, 8 · **LIVE-06** open until 3. **LIVE-07 is closed** by structural evidence and needs no human test.
- Assumption **A1** (iOS PWA wake ordering) open until test 6. Assumption **A6** open in its dangerous direction — the band staying hidden while the channel is down — until tests 4 and 5.
- Assumption **A5** accepted and deliberately not closed: Realtime caches a connection's access policies, so an assignment revoked mid-night does not disconnect an already-joined listener. The reload is refused immediately, so the residual exposure is *"hears that something changed"*, never *"sees who"*.
