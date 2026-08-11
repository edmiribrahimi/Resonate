---
phase: 38-live-attendance-freshness
verified: 2026-08-11T14:30:00Z
status: human_needed
score: 1/7 requirements closed (LIVE-07); 6/7 structurally built and applied to production, behaviourally unconfirmed
overrides_applied: 0
human_verification:
  - test: "P5 — two devices, the headline behaviour (closes LIVE-01; the only witness to Pitfall 2)"
    expected: "Two accounts, each holding door.operate for the same night, on two separate devices (never one account in two tabs). Device B put down and not touched again. Check in a valid code on device A. Device B's counter must change without anyone touching device B, within about 2 seconds. Repeat three times and record each elapsed time. If B's counter never changes AND B's staleness band never appears either, that is Pitfall 2: the channel joined, reported SUBSCRIBED, and delivered nothing because `private: true` or the topic's case failed to match between client and trigger (ScannerClient.tsx:904, :906 vs supabase/migrations/20260811120000_live_attendance_channel.sql:198-203). A change that only arrives ~5 minutes later is the safety parachute masking the failure, not a pass."
    why_human: "Requires two real devices, two real door.operate sessions, and a code to check in. Nothing in this repository can mint a second authenticated session or observe a second physical screen. This is the only proof the phase delivers its named behaviour at all."
  - test: "P6 — the null-party fan-out and the reassignment (closes LIVE-01 further; the only witness to Pitfall 1 and D-38-24) — REQUIRES A FRESH PRODUCTION AUTHORISATION"
    expected: "On an event with at least two nights: (1) snapshot every table reachable by cascade from guest_list_entries, enumerated by reading pg_constraint, not remembered; (2) create one guest-list entry carrying no party and capture its primary key at creation; both doors of that event must reload without anyone touching either screen — one door reloading and not the other is Pitfall 1 present; (3) assign that entry to one night, then to the other: both the gaining and the losing door must reload live (not ~5 minutes later) each time — a losing door that only catches up on the parachute is D-38-24 missing; (4) delete the entry by the captured primary key only, never via a UI control or a name match; (5) confirm the deletion from a source different from the one used to delete, and confirm the cascade snapshot is unchanged elsewhere."
    why_human: "Writes to production. The only authorisation this phase ever held was spent on plan 38-04's schema-only apply at 2026-08-11T11:15:24Z and is recorded as exhausted (38-04-SUMMARY.md). This project lost 63 production rows to a verification script on 2026-08-10 (STATE.md D12, no PITR) — a fresh, explicit, scoped authorisation from the owner is required before this procedure may run at all."
  - test: "P7 — a person not assigned to the night hears nothing (closes LIVE-06; the only witness that RLS refuses a real session)"
    expected: "Sign in as an approved `member` account with no door.operate assignment for that night. Since the door URL redirects such an account, drive the channel subscription from a scratch page or the Realtime Inspector using that account's own session (never a service key, never another account's token). Subscribe to that night's `door:<uuid>` topic. Expected: CHANNEL_ERROR, and no message ever arrives — including while a check-in is performed on that night from a properly assigned door during the observation window. Record the status string verbatim and that a check-in was attempted during the window."
    why_human: "Every automated probe this phase can run goes through the Supabase Management API as `supabase_read_only_user`, which bypasses RLS entirely (confirmed at 38-01-SUMMARY.md probe_role, re-confirmed 38-07-SUMMARY.md S0). No query available to this repository can show that a real authenticated browser is refused. This is the sole exercise of the actual security boundary (supabase/migrations/20260811120000_live_attendance_channel.sql:567 CREATE POLICY realtime_messages_select_door_assigned)."
  - test: "P1 — the channel never established (closes LIVE-02, LIVE-04, LIVE-05)"
    expected: "Block the project's Realtime WebSocket in DevTools request blocking before opening the door and selecting the night (the rest of the network stays up). Observe: (a) the counter row reads `updated Ns ago` and N climbs; (b) a valid code scan returns its verdict at latency indistinguishable from a healthy-channel scan; (c) at about 5 minutes the staleness band appears — record the wall-clock time and the value of N; (d) tapping the counter row reloads and N returns to 0s; (e) no sentence about permission or authorisation appears anywhere on screen."
    why_human: "Requires a desktop browser with active WebSocket blocking, a door opened behind that block, a code scanned, and roughly five minutes of watching a screen for the band to appear. No automated check in this repository can observe a human-scale timing event on a rendered screen."
  - test: "P2 — the channel dropped mid-night (closes LIVE-02, LIVE-03, LIVE-05)"
    expected: "With the door open and healthy (band absent), cut the network (DevTools Offline or airplane mode) without reloading the page. Observe: (a) a scan still returns its verdict from cache; (b) the staleness band appears; (c) on restoring the network, a full reload happens with nobody touching the screen, and the counter returns to `updated 0s ago` — record the elapsed time between restoring the network and the reset; (d) the band disappears once the reload lands."
    why_human: "The load-bearing observation — a reload firing with nobody touching the screen — is a claim about the absence of a human action, which only a person watching can attest to. This is the primary evidence for LIVE-03."
  - test: "P3 — the pocket (closes LIVE-03; the only witness to assumption A1)"
    expected: "On the actual staff phone (not a simulator, not a desktop), door installed to the home screen, night selected, one scan performed. Lock the phone and leave it in a pocket for at least 65 minutes (past the 3600s access-token lifetime). On unlocking: (a) a full reload must fire on resume; (b) the counter must read `updated 0s ago` within a few seconds — not after the 5-minute parachute, which would mean the resume signal never arrived; (c) any band that had appeared disappears; (d) a scan immediately afterward behaves normally. Record the lock and wake times and whether the reload arrived via the resume path or the parachute."
    why_human: "Safari and iOS Safari implement neither `freeze` nor `resume`; the wake signal is composed by hand from `visibilitychange`/`pageshow`/`online` (ScannerClient.tsx listener block extended at plan 38-05) and only a real suspended home-screen PWA can show whether that composition actually fires."
  - test: "P4 — degraded, not dropped (closes LIVE-02; the only witness to Pitfall 6)"
    expected: "Throttle to Slow 3G with the channel up (merely slow, not down). Compare the verdict latency of an offline-path scan against an unthrottled baseline — it must be unchanged, because the verdict never touches the network. If latency moves, `mergeAttendees` is holding a readwrite IndexedDB transaction across the verdict's read path and the deferral in `requestReload` (ScannerClient.tsx:1364) has failed."
    why_human: "This is a timing measurement on a real device with a real camera decode; no structural grep can show that a scan-time IndexedDB contention did not occur."
  - test: "The LIVE-05 one-handed, dark-room tap check"
    expected: "Open the night. The counter row (ScannerClient.tsx counter-row block, now a labelled <button>) reads `updated Ns ago` and N climbs. Tap it one-handed with the screen at minimum brightness, without moving the camera: N must return to 0 and the tap must be reliably hittable. If it cannot be hit reliably in the dark, that is a finding, not a preference."
    why_human: "Legibility at minimum brightness and hittability with a thumb in the dark are accessibility properties of a physical screen; `nextjs-architecture.md`'s dark-venue gate names this explicitly as untestable by a build."
---

# Phase 38: Live Attendance Freshness — Verification Report

**Phase Goal:** The attendee list updates by itself while the device has network, and never stands between a scan and its verdict.
**Verified:** 2026-08-11
**Status:** human_needed
**Re-verification:** No — initial verification

## State of the phase, read correctly

Six of seven plans are executed and committed (38-01 through 38-06). Plan 38-07
executed its one automated task (the full B/G/S mechanical set) and then stopped
at its first blocking human-verify checkpoint, having completed 1 of its 3 tasks —
tasks 2 and 3 require a person with two phones, a real night, and (for procedure
P6) a fresh production authorisation the owner has not given. `38-07-SUMMARY.md`
records this explicitly under "Checkpoint state" and states outright: *"The phase
must not be marked complete on the strength of this file."*

All seven door procedures (P1 … P7) in `38-PROCEDURES.md` read `pending`, each
with the reason it is pending, dated 2026-08-11. `38-VALIDATION.md` keeps
`nyquist_compliant: false` by design — this is documented as a deliberate
recognition that six of the phase's seven requirements have no automated proof
possible in this repository, not as unfinished validation tooling.

The owner's decision recorded in `STATE.md` under `## Blockers` (line 247, dated
2026-08-11) defers all seven procedures, together with 32 pre-existing
`human_needed` items from phases 34, 35 and 43, to a single batched session at the
end of milestone v1.5. That entry states plainly: *"Differito non e' verificato"*
("deferred is not verified") and names the two specific defects that stay unseen
in the meantime: the channel that joins, reports `SUBSCRIBED`, and delivers
nothing (Pitfall 2, seen only by P5), and the null-party fan-out that silently
degrades LIVE-01 into LIVE-04 (Pitfall 1, seen only by P6).

This verification treats that state as it is: real engineering work, applied to
production, structurally sound by every check a machine can run — and not yet
proven to work at a door.

## Goal Achievement

### Observable Truths (per requirement)

| # | Truth (requirement) | Status | Evidence |
|---|---|---|---|
| 1 | LIVE-01 — the list updates by itself while the device has network | ? UNCERTAIN — structurally built, behaviourally unwitnessed | Migration applied to production as version `20260811111530` (`38-04-SUMMARY.md`): 4 `AFTER` triggers exist on `door_scan_events`, `tickets`, `guest_list_entries`, `ticket_refunds` (`supabase/migrations/20260811120000_live_attendance_channel.sql:298,384,439,489`), fan-out over `event_parties` for null-party rows (`:145-236`), old-pair emit for reassignment guarded by `IS DISTINCT FROM` (D-38-24, `:346-489`, re-measured post-apply in `38-04-SUMMARY.md` "wrapper_bodies"). Client subscribes with `config: { private: true }` and lowercase topic (`ScannerClient.tsx:904,848-849`). **Not witnessed:** whether the two sides' `private`/case actually match on a real socket (only **P5**, pending) and whether the null-party fan-out reaches real doors (only **P6**, pending — no authorisation) |
| 2 | LIVE-02 — the scan decision is never delayed by, or dependent on, the live connection | ? UNCERTAIN — structural evidence strong, behavioural evidence pending | `requestReload` (`ScannerClient.tsx:1364`) is the single reload entry point and defers behind `isProcessingRef` before touching IndexedDB; drained in `dismissFlash` (structural checks re-run and pasted in 38-03, 38-05, 38-06 and 38-07-SUMMARY.md § G1-G3, all clean, byte-identical function-body sizes across all four measurements). The broadcast handler calls only `requestReload("channel")`, no fetch of its own (`ScannerClient.tsx:906-...`, verified `T-38-05` disposition). **Not witnessed:** whether verdict latency actually holds under a blocked (P1), dropped (P2) or throttled (P4) channel on a real device — all three pending |
| 3 | LIVE-03 — every reconnection triggers a full reload | ? UNCERTAIN | `online`, `pageshow`, and `visibilitychange`-on-`document` are all wired to `resubscribe()` + `requestReload(reason)` (ScannerClient.tsx listener block, plan 38-05 task 2; `requestReloadRef.current?.("foreground"\|"pageshow"\|"online")` per 38-05-SUMMARY.md deviation 4). **Not witnessed:** the network-restored case (P2 (c)) and the >65-minute pocket/suspend case (P3 (a)), both pending — P3 is also the only test of assumption A1 (whether a suspended iOS home-screen PWA fires the composed wake signal at all) |
| 4 | LIVE-04 — an infrequent safety reload runs underneath the channel | ✓ VERIFIED (structural) / ? UNCERTAIN (behavioural corner) | `SAFETY_RELOAD_MS = 5 * 60_000` (`ScannerClient.tsx:400`), re-armed only from a successful fetch and from becoming visible — never a `setInterval` (`grep -c setInterval` shows only the two pre-existing, unrelated timers per 38-03-SUMMARY.md), gated by `document.visibilityState` (`ScannerClient.tsx:1437`, confirmed `grep -n visibilityState` in 38-07-SUMMARY.md § G4). The re-arming logic is real and reviewable. **Not witnessed:** that the band actually appears at ~5 minutes when the channel is blocked from the start (P1 (c), pending) |
| 5 | LIVE-05 — staff can see whether the list is live and how fresh it is, and can force a reload by hand at any moment | ? UNCERTAIN | The counter row is a real `<button type="button">` with an `aria-label` calling `requestReload("manual")` (`ScannerClient.tsx`, plan 38-06 task 1, `grep -cE 'requestReload\("manual"\)'` = 1). The staleness band is derived state — `listIsStale = listAgeMs !== null && (!channelLive || listAgeMs > SAFETY_RELOAD_MS)` (`ScannerClient.tsx:2627`) — rendered outside the `cacheNotices` array so a failed refresh cannot erase it (F2, resolved in 38-06). **Not witnessed:** legibility and one-handed hittability at minimum brightness in the dark (the LIVE-05 tap check, pending), and whether the band actually appears in the two failure scenarios that matter (P1 (c), P2 (b), both pending — assumption A6, the dangerous direction, stays open) |
| 6 | LIVE-06 — only a person assigned to that night can listen to that night's updates | ? UNCERTAIN — catalogue-level proof only | Production carries exactly one policy in schema `realtime`: `realtime_messages_select_door_assigned`, `FOR SELECT`, predicate `private.has_capability('door.operate', <party from topic>)` (`supabase/migrations/20260811120000_live_attendance_channel.sql:567-...`; re-measured against the catalogue post-apply in `38-04-SUMMARY.md` Task 3 and again in `38-07-SUMMARY.md` § S1, both showing the rendered `qual`, not the file). Zero write policies exist on `realtime.messages` (`38-07-SUMMARY.md` § S2). **Not witnessed, and cannot be witnessed by any probe run so far:** every one of these reads ran through the Supabase Management API as `supabase_read_only_user`, which bypasses RLS entirely (`38-01-SUMMARY.md` `probe_role`, re-confirmed `38-07-SUMMARY.md` § S0). No query available to this repository can show a real authenticated `member` session refused. Only **P7** (pending, needs a real session) closes this |
| 7 | LIVE-07 — the door and the bar do not share an offline mechanism | ✓ VERIFIED | `grep -rln 'from "@/lib/offline/checkin-store"' src` returns exactly one file, `ScannerClient.tsx` (re-run at every wave: 38-03, 38-05, 38-06, 38-07-SUMMARY.md § G5, all consistent). Zero new files under `src/lib/` (`38-07-SUMMARY.md` § G6). `src/lib/supabase/client.ts` is byte-identical to the project's initial scaffolding commit — `git log --oneline -1 -- src/lib/supabase/client.ts` returns `dd2a2c2 Initial scaffolding…` (`38-07-SUMMARY.md` § G9) |

**Score:** 1/7 truths fully verified (LIVE-07). LIVE-04's structural half is solid; its one remaining behavioural corner (the band appearing at 5 minutes with a blocked channel) is pending along with the rest. The other five requirements are structurally built and applied to production but have no behavioural witness yet — none of them are contradicted by any evidence gathered, and none can be marked verified on a green build or a catalogue read alone, per this project's own evidence-class rules (`38-VALIDATION.md`).

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `supabase/migrations/20260811120000_live_attendance_channel.sql` | Fan-out helper, 4 triggers, 1 SELECT policy, one `BEGIN;`/`COMMIT;`, applied to production | ✓ VERIFIED | 620 lines. `CREATE OR REPLACE FUNCTION private.notify_attendance_changed` at `:145`; `REVOKE ALL … FROM public, anon, authenticated` at `:237` (F1 closed — re-confirmed by direct-call refusal `42501` in `38-04-SUMMARY.md` and re-run in `38-07-SUMMARY.md` § S5); 4 `CREATE TRIGGER` at `:298,384,439,489`; `CREATE POLICY realtime_messages_select_door_assigned` at `:567`. Applied through `/database/migrations` as version `20260811111530` (`38-04-SUMMARY.md`), row counts identical before/after across 27 gated tables plus 13 observed `auth` tables (81 rows both sides) |
| `.planning/phases/38-live-attendance-freshness/baseline/38-BASELINE-realtime.pre-38.json` | The zero before-figure, captured before the migration file existed | ✓ VERIFIED | Exists, 16 027 bytes. `realtime_policies: []`, `source_table_triggers: []`, `precondition` field states no `live_attendance_channel` file existed at capture (`captured_at: 2026-08-11T10:46:52.013Z`) |
| `.planning/phases/38-live-attendance-freshness/baseline/38-BASELINE-realtime.post-38.json` | The after-figure, measured against the pre-38 baseline | ✓ VERIFIED | Exists, 26 473 bytes. Matches the figures cited in `38-04-SUMMARY.md` |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` | `requestReload`, `channelLive`, the subscription effect, the counter-row button, the derived band | ✓ VERIFIED (exists, substantive, wired) | 3449 lines. `requestReload` at `:1364`; `channelLive` state at `:537`; `.on("broadcast", { event: "attendance_changed" }...)` at `:906`; `config: { private: true }` at `:904`; `listIsStale` derived boolean at `:2627`. `npm run build` exits 0 per every plan's self-check and re-confirmed in `38-07-SUMMARY.md` § B |
| `.planning/phases/38-live-attendance-freshness/38-PROCEDURES.md` | P1–P7, written before execution, Results filled in or explicitly `pending` with reason | ⚠️ PARTIAL BY DESIGN | All 7 procedures present with Role/Setup/Observe/Record/Result sections. All 7 Results read `pending`, each with a dated reason (`38-07-SUMMARY.md` confirms `grep -cE '^\*\*Result\*\* — \*pending\*$'` = 0, i.e. no bare unreasoned pending; `grep -n '^\*\*Result\*\*'` = 7 lines present). This is the correct, honest state of an artifact whose whole purpose is to not claim more than was observed — not a stub |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Check-in write paths (`door_scan_events`, `tickets`, `guest_list_entries`, `ticket_refunds`) | `realtime.messages` | 4 `AFTER` triggers → `private.notify_attendance_changed` → `realtime.send` | ✓ WIRED (catalogue-level) | Triggers confirmed present in production via `pg_trigger` (`38-07-SUMMARY.md` § S3: 0 before, 4 after, one per table). `realtime.send` confirmed still wraps its insert in `EXCEPTION WHEN OTHERS THEN RAISE WARNING` (§ S6), so the money-table triggers cannot abort a payment path |
| `ScannerClient.tsx` subscription | `realtime.messages` (topic `door:<uuid>`) | `supabase.channel(..., { config: { private: true } })` | ? NOT WITNESSED ON A WIRE | Client and server sides individually inspected and internally consistent (topic lowercased at `ScannerClient.tsx:848-849`, `private: true` matches the trigger's 4th argument to `realtime.send`), but no message has been observed actually arriving at a subscribed client. `38-04-SUMMARY.md` states this outright: "a trigger in `pg_trigger` is not an emit on a wire." Only **P5** closes this |
| the broadcast handler | `requestReload("channel")` | direct call, no intermediate fetch | ✓ WIRED | `ScannerClient.tsx:906` region calls `requestReloadRef.current?.("channel")` and nothing else — confirmed by the LIVE-02 structural extractions across every plan from 38-03 onward |
| `realtime.messages` SELECT policy | `private.has_capability('door.operate', <party>)` | `CASE` guard, `(SELECT …)` wrapper | ✓ WIRED (catalogue-level) / ? NOT WITNESSED AGAINST A REAL SESSION | Rendered `qual` read from `pg_policies` (not the file) confirms the predicate (`38-07-SUMMARY.md` § S1). But every read ran as `supabase_read_only_user`, which bypasses RLS. Only **P7** proves a real session is actually refused |

### Data-Flow Trace (Level 4)

Not applicable in the conventional sense — there is no server-rendered dashboard
component pulling from an API in this phase. The relevant "data flow" is the
channel's payload contract, and it was traced explicitly by the plans themselves:
the emit is `'{}'::jsonb` on both branches of `private.notify_attendance_changed`
(`supabase/migrations/20260811120000_live_attendance_channel.sql:187-236`,
`grep -c "'{}'::jsonb"` ≥ 2 per plan 38-02's own acceptance criteria) — the
channel deliberately carries no row data, only a signal that triggers a re-fetch
of `/api/tickets/attendance`, the endpoint that already redacts. This is D-38-01
and it was verified structurally, not merely asserted.

### Behavioural Spot-Checks

Not run by this verifier. Every behaviour this phase depends on — a message
arriving at a second device, a reload firing with nobody touching the screen, a
band appearing at a five-minute mark, a session being refused by RLS — requires a
running server session, a second physical device, or a phone locked in a pocket
for over an hour. None of it is checkable with a 10-second local command, per this
project's own `38-VALIDATION.md`, which classifies all of it as class **D**
(door procedure) evidence. Fabricating a pass here would be exactly the failure
mode this phase's own documentation repeatedly warns against.

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention exists in this repository
(`find scripts -path '*/tests/probe-*.sh'` returns nothing), and this phase does
not declare any. Its equivalent is the **S**-class SQL probes documented and
pasted with output in `38-01-SUMMARY.md`, `38-04-SUMMARY.md` and
`38-07-SUMMARY.md` — all cited by requirement in the Observable Truths table
above. All ran with `read_only: true` against production; zero writes.

### Requirements Coverage

| Requirement | Source Plan(s) | Description (REQUIREMENTS.md) | Status | Evidence |
|---|---|---|---|---|
| LIVE-01 | 38-01, 38-02, 38-05, 38-07 | While the device has network, the attendee list updates at the moment the data changes, without staff action | ? NEEDS HUMAN | See Observable Truth 1. `REQUIREMENTS.md:104` still shows `[ ]` (unchecked), and the traceability table `REQUIREMENTS.md:228` reads `Pending` — this matches the evidence exactly |
| LIVE-02 | 38-01, 38-03, 38-05, 38-07 | The scan decision is taken from the local cache and never waits on, or is disabled by, the live connection | ? NEEDS HUMAN | See Observable Truth 2. `REQUIREMENTS.md:105` `[ ]`, table `:229` `Pending` |
| LIVE-03 | 38-01, 38-03, 38-05, 38-07 | Every reconnection triggers a full reload | ? NEEDS HUMAN | See Observable Truth 3. `REQUIREMENTS.md:106` `[ ]`, table `:230` `Pending` |
| LIVE-04 | 38-01, 38-03, 38-07 | An infrequent safety reload runs underneath the live channel | ? NEEDS HUMAN (structural half verified) | See Observable Truth 4. `REQUIREMENTS.md:107` `[ ]`, table `:231` `Pending` |
| LIVE-05 | 38-01, 38-06, 38-07 | Staff can see whether the list is live and how fresh it is, and can force a refresh by hand | ? NEEDS HUMAN | See Observable Truth 5. `REQUIREMENTS.md:108` `[ ]`, table `:232` `Pending` |
| LIVE-06 | 38-01, 38-02, 38-04, 38-07 | Only a person assigned to that night can listen to that night's updates | ? NEEDS HUMAN | See Observable Truth 6. `REQUIREMENTS.md:109` `[ ]`, table `:233` `Pending` |
| LIVE-07 | 38-01, 38-05 | The door and the bar do not share an offline mechanism | ✓ SATISFIED | See Observable Truth 7. Note: `REQUIREMENTS.md:110` and the traceability table `:234` still read `[ ]` / `Pending` — this line is stale relative to the code and should be updated once this VERIFICATION.md is reviewed, since the structural evidence for LIVE-07 is complete and does not depend on any pending door procedure |

No orphaned requirements: all seven LIVE-* IDs appear in at least one plan's
`requirements:` frontmatter (`38-01` through `38-07`), and every ID in
`REQUIREMENTS.md` mapped to "Phase 38" is accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | none found | — | `grep -nE "TODO|FIXME|HACK|XXX|TBD|PLACEHOLDER"` on `ScannerClient.tsx` returns only an unrelated string literal (`RSN-XXXXXX`, a bare membership code format example, `ScannerClient.tsx:70`) — not a debt marker. The same grep on the migration file returns nothing. No unresolved debt markers, no stub returns, no collapsed `catch` blocks were found in the files this phase modified |

No blocker-class anti-pattern was found. The seven `pending` Result lines in
`38-PROCEDURES.md` are not an anti-pattern under this project's own rules — they
are the artifact functioning as designed (`38-01-PLAN.md`: *"An empty Result is an
unrun procedure and must read as one — a table of ticks nobody earned is worse
than an empty table, because it closes a phase"*).

### Human Verification Required

Seven procedures (P1–P7) plus one dedicated accessibility check remain to close
this phase's six open requirements (LIVE-01 through LIVE-06). They are listed in
full, in execution order, in the YAML frontmatter of this report under
`human_verification`, each naming the requirement it closes, the defect it is the
sole witness to, and why it cannot be replaced by an automated check. Two
constraints apply across all of them:

- **P6 requires a fresh, explicit production authorisation from the owner.** The
  only authorisation this phase has held was scoped to plan 38-04's schema-only
  migration and is recorded as spent at `2026-08-11T11:15:24Z`
  (`38-04-SUMMARY.md`). It does not cover creating, reassigning or deleting a
  guest-list entry.
- **P3 requires the actual staff phone**, installed to the home screen, locked in
  a pocket for at least 65 minutes — it cannot be simulated from a desk or a
  simulator, because Safari and iOS Safari implement neither `freeze` nor
  `resume`.

Per the owner's decision recorded in `STATE.md` (`## Blockers`, dated
2026-08-11), these seven items are intentionally batched with 32 other open
`human_needed` items from phases 34, 35 and 43, for a single end-of-v1.5
verification session. This report does not treat that batching as resolving the
items — they remain open until each is executed and its Result is filled in
`38-PROCEDURES.md` with an observation and a wall-clock time.

### Gaps Summary

No code-level gap was found. Every artifact this phase claims to have built
exists, is substantive, and is wired — the migration is live in production, the
client-side reload discipline is structurally verified clean across five
independent re-runs (plans 38-03, 38-05, 38-06, 38-07), and the one requirement
with a purely structural proof (LIVE-07) is fully closed. Nothing was found
stubbed, orphaned, or hollow.

What is missing is behavioural evidence for a system whose behaviours can only be
observed at a door, on a real phone, across a real socket, and (for LIVE-06)
inside a real authenticated session — precisely the four things this repository's
automated tooling cannot produce, and precisely why `38-VALIDATION.md` keeps
`nyquist_compliant: false` as a documented design choice rather than a gap to
close with more tooling. The phase's own SUMMARYs already say this as plainly as
this report does; this verification's job was to confirm that plainness is
accurate rather than assumed, and it is: `probe_role` really is
`supabase_read_only_user` in the actual JSON, the migration really is applied at
version `20260811111530`, and the four triggers really do exist in
`pg_trigger` today — all re-checked directly against the repository and the
baseline JSON files rather than taken from the SUMMARY's word.

The one item worth a developer's attention outside the batched human-verify
session: `REQUIREMENTS.md:110` and its traceability row `:234` still mark LIVE-07
as `Pending`, but the evidence above shows it fully and independently satisfied —
this line can be checked off now, without waiting for the other six.

---

_Verified: 2026-08-11_
_Verifier: Claude (gsd-verifier)_
