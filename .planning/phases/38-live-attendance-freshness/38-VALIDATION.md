---
phase: 38
slug: live-attendance-freshness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-11
---

# Phase 38 — Validation Strategy

> Per-phase validation contract. Distilled from `38-RESEARCH.md`
> § *Validation Architecture*, which carries the measurements and the source
> citations. This file is the contract; that file is the evidence.
>
> **`nyquist_compliant: false` is a choice, not unfinished work.** Six of the
> seven requirements have no possible automated proof in this repository —
> LIVE-01, LIVE-02, LIVE-03, LIVE-04 and LIVE-05 all end at a phone, a pocket
> or a queue, and LIVE-06 ends at a session this repository cannot mint. Calling
> them covered would be a lie somebody would later use to close the phase. The
> precedent is `31-VALIDATION.md` and `36-VALIDATION.md`, for the same reason.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **None.** `package.json` has no `test` script; the repository contains no `*.test.*` or `*.spec.*` file. Recorded project decision (CLAUDE.md, Environment Guardrail 1) — **not** a Wave 0 gap to fill |
| **Config file** | none — see above |
| **Quick run command** | `npm run build` (Next's typecheck; note it is `next build --webpack`, required for the `@serwist/next` plugin) |
| **Full suite command** | `npm run build` + every **G** check + every **S** probe + door procedures P1–P4 |
| **Estimated runtime** | build ~minutes; probes seconds; door procedures are human time and cannot be batched |

Because no automated suite exists, validation here means **four classes of
evidence**, each either a command with output or a written procedure with an
observation. A claim with neither does not count.

| Class | What it is | Repeatable by another person? |
|-------|-----------|-------------------------------|
| **B — Build** | `npm run build` exits 0 | Yes |
| **G — Grep / structural** | a `grep`/`awk` command that must print nothing, or a fixed thing | Yes |
| **S — SQL probe** | a `read_only: true` Management API query against the real database, with its expected result | Yes |
| **D — Door procedure** | a written manual procedure naming role, setup, and what must be observed | Yes — and it is the only evidence for anything involving a camera, a pocket or a queue |

**A green build proves less here than elsewhere.** None of the four Supabase
clients is parameterised with `Database`, so no column name in any query is
checked by the build. `npm run build` proves the code compiles; it proves
nothing about a column, a policy or a channel.

---

## Sampling Rate

- **After every task commit:** `npm run build`. (`npm run verify:persona` only if
  a persona file was touched — no plan in this phase should touch one.)
- **After every wave:** `npm run build` + every **G** check + every **S** probe.
- **Phase gate, before `/gsd-verify-work`:** all of the above, plus door
  procedures **P1–P4** and the two-device LIVE-01 procedure, each written down
  with its observation and the time it was performed.
- **Max feedback latency:** build-time for **B**/**G**; a night for **D**.

---

## Per-Requirement Verification Map

| Req | Behaviour | Class | Command / procedure | Status |
|-----|-----------|-------|---------------------|--------|
| LIVE-01 | The list updates by itself while the device has network | **D** | Two devices, same night, both holding `door.operate`. Check in a code on A; B's counter changes **without anyone touching B**, within ~2 s | ⬜ pending |
| LIVE-01 | Every write path emits | **S** | `select tgname, tgrelid::regclass::text from pg_trigger where not tgisinternal and tgrelid::regclass::text in ('door_scan_events','tickets','guest_list_entries','ticket_refunds')` → the new triggers, all of them | ⬜ pending |
| LIVE-01 | The event-level (`party_id IS NULL`) fan-out works | **D** | Add a guest-list entry with **no party** on an event with ≥2 nights; both doors reload. This is Pitfall 1 — `tickets.party_id` and `guest_list_entries.party_id` are nullable by construction, and a trigger that sends to `door:NULL` sends to nobody | ⬜ pending |
| LIVE-02 | The verdict never waits on the channel | **G** | `awk '/const handleVerify/,/^  };$/' ScannerClient.tsx \| grep -nE 'channel\|Channel\|realtime\|channelLive'` → prints nothing. Repeat for `ticketOffline`, `membershipOffline`, `ticketOnline`, `membershipOnline` | ⬜ pending |
| LIVE-02 | A verdict with the channel dropped / degraded / never established | **D** | Procedures **P1**, **P2**, **P4** | ⬜ pending |
| LIVE-02 | A reload defers behind a scan in progress | **G** | The in-flight guard appears inside the reload request and its drain in the flash-dismiss path | ⬜ pending |
| LIVE-02 | An emit cannot abort a check-in | **S** | Read `realtime.send`'s body: its INSERT is wrapped in `EXCEPTION WHEN OTHERS THEN RAISE WARNING`. Already measured 2026-08-11; re-assert after the migration | ⬜ pending |
| LIVE-03 | Every reconnection triggers a full reload | **D** | **P2** (c) network restored, reload happens untouched · **P3** (a) resume after >65 min | ⬜ pending |
| LIVE-04 | The safety reload runs and re-arms | **D** | **P1** (c) band appears at ~5 min with the channel blocked; with the channel healthy and no scans, the counter resets every 5 min | ⬜ pending |
| LIVE-04 | It does not run while hidden | **G** | `grep -n "visibilityState" ScannerClient.tsx` — the interval is cleared on hidden and re-armed on visible | ⬜ pending |
| LIVE-05 | Freshness is visible and a manual reload exists at any moment | **D** | Open the night: the counter row reads `updated Ns ago` and N climbs. Tap it: N returns to 0. One-handed, screen at minimum brightness | ⬜ pending |
| LIVE-05 | The band appears when stale or when the channel is down | **D** | **P1** (c) and **P2** (b) | ⬜ pending |
| LIVE-06 | A person not assigned to the night receives nothing | **D + S** | **S:** `select policyname, cmd, roles::text from pg_policies where schemaname='realtime'` → exactly one `SELECT` policy. **D:** as an approved `member` with no assignment, subscribe to that night's topic and observe `CHANNEL_ERROR`, never a message | ⬜ pending |
| LIVE-06 | No client can *send* on the topic | **S** | The same probe shows **no** `INSERT` policy. With RLS on, that is the proof | ⬜ pending |
| LIVE-06 | The predicate is the one the door already uses | **G** | The migration greps to `has_capability` with `'door.operate'` and introduces **no** new function that resolves assignment | ⬜ pending |
| LIVE-07 | Door and bar share no offline mechanism | **G** | `grep -rn "offline/checkin-store" src --include='*.ts' --include='*.tsx'` still lists `ScannerClient.tsx` and nothing else; no new file under `src/lib/` is imported by both a door surface and a bar surface | ⬜ pending |
| all | It compiles | **B** | `npm run build` | ✅ exists |

---

## Wave 0 Requirements

- [ ] **No framework to install.** The absence of a test runner is a project
      decision. Do not add one in this phase.
- [ ] **The written text of P1–P4 and the two-device LIVE-01 procedure must exist
      before any of them is executed.** A procedure written after the observation
      is a description, not a check.
- [ ] **Capture the `realtime` policy baseline BEFORE the migration exists:**
      `select policyname, cmd, roles::text from pg_policies where schemaname='realtime'`
      → expected `[]` (captured 2026-08-11). Without the before-figure, "one
      policy exists" is not evidence of what changed. Same ordering constraint as
      phase 36's `pre-36` baseline: a baseline taken after the change is not a
      baseline.
- [ ] Confirm `GET /v1/projects/{ref}/config/realtime` still returns
      `suspend: false` on the day of the first night.

---

## Manual-Only Verifications

Every **D** row above is manual by nature. The four named procedures:

| ID | Behaviour | Requirement | Why manual |
|----|-----------|-------------|------------|
| **P1** | Channel blocked from the start; scanning continues; band appears at ~5 min | LIVE-02, LIVE-04, LIVE-05 | There is no way to assert "a queue kept moving" from a build |
| **P2** | Channel dies mid-night; band appears; network restored; full reload without a touch | LIVE-02, LIVE-03, LIVE-05 | Requires a real socket dying on a real device |
| **P3** | **The pocket procedure.** Phone locked and pocketed >65 min (past JWT expiry), then resumed: `setAuth`, re-subscribe, full reload | LIVE-03 | Cannot be simulated from a desk. Safari and iOS Safari implement neither `freeze` nor `resume`, so the wake signal is composed by hand — and only the device says whether the composition works |
| **P4** | Never-established channel: airplane mode before opening the door, six scans, then reconnect and sync | LIVE-02 | The door's whole reason to exist |

Plus the **two-device LIVE-01 procedure**, which is the only proof that the
phase delivered its headline behaviour.

**Roles, never names.** These procedures are written into a public repository:
they name *a staff member holding `door.operate` for that night*, never a person.

---

## Known exposure, recorded rather than engineered around

Realtime caches a client's access policies **for the duration of the
connection**. An assignment revoked mid-night does not kick an already-joined
listener off the channel until the connection cycles. What it *does* do
immediately is refuse that account's read of `/api/tickets/attendance` — and the
reload is what carries the data. So the residual exposure is *"hears that
something changed on a night whose id they already knew"*, never *"sees who"*.
Recorded here because a silent gap is worse than a stated one; not closed in this
phase.

---

## Validation Sign-Off

- [ ] Every task carries either a **B**/**G**/**S** command or a named **D** procedure
- [ ] No wave merges without its **G** checks and **S** probes run and pasted
- [ ] The `realtime` policy baseline was captured **before** the migration file existed
- [ ] P1–P4 and the two-device procedure were written before being executed
- [ ] Each executed procedure has its observation and its timestamp written down
- [ ] `nyquist_compliant` stays `false` — and the reason above stays with it

**Approval:** pending
