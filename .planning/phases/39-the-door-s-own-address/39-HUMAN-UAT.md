---
status: partial
phase: 39-the-door-s-own-address
source: [39-VERIFICATION.md, 39-DOOR-PASS.md]
started: 2026-08-11T15:10:00Z
updated: 2026-08-11T15:10:00Z
deferred_to: end of milestone v1.5 (owner decision D-39-07, recorded in 39-CONTEXT.md and STATE.md ## Blockers)
batch_with: 38-HUMAN-UAT tests 1, 3, 4, 5, 7 and 8 — absorbed into the same sitting by D-39-07
procedure: 39-DOOR-PASS.md
---

# Phase 39 — Human verification

> **This file is an index, not a procedure.**
>
> D-39-07 says **one door pass, not two**: one document is the thing a person
> reads in a dark room, and a second one competing with it is how two records
> drift apart. That document is
> [`39-DOOR-PASS.md`](./39-DOOR-PASS.md) — 525 lines, ten sections, every
> `Result` field still reading `pending`.
>
> This file exists so the open items surface in `/gsd:progress` and
> `/gsd:audit-uat`. **Do not execute from here.** Execute from the door pass,
> and write the observations into the door pass, where the per-item requirement
> mapping lives.

## Current Test

[awaiting the end-of-v1.5 sitting — dark room, two phones, one night]

## Tests

### 1. The move, network ON, both devices — STAFF-04 criterion 1
expected: `/door` and `/admin/scanner` both render the door; **neither request
produces a 3xx**; the bottom nav's Check-in entry points at the canonical
address.
procedure: `39-DOOR-PASS.md` §1.1 – §1.4
result: [pending]

### 2. A `pending` organizer is drawn the Check-in entry — D-39-06
expected: the entry is drawn, because the server would admit them.
procedure: `39-DOOR-PASS.md` §1.5
result: [pending]
note: **not executable against production.** The CHECK at
`supabase/migrations/20260808001000_role_implies_approved.sql:117` forbids a
non-approved organizer row, so that account cannot exist there. Closes in the
container, on the `organizer/pending` persona seeded by
`scripts/container/seed.mjs`. Loosening a database constraint to make a check
pass would be a bad trade and is not proposed.

### 3. The pocket — P3 · LIVE-03
expected: per `39-DOOR-PASS.md` §2.
procedure: `39-DOOR-PASS.md` §2
result: [pending]

### 4. Channel never established — P1 · LIVE-02, LIVE-04, LIVE-05
expected: per `39-DOOR-PASS.md` §3.
procedure: `39-DOOR-PASS.md` §3
result: [pending]

### 5. Channel dropped mid-night — P2 · LIVE-02, LIVE-03, LIVE-05
expected: per `39-DOOR-PASS.md` §4.
procedure: `39-DOOR-PASS.md` §4
result: [pending]

### 6. Degraded, not dropped: Slow 3G with the channel up — P4 · LIVE-02
expected: per `39-DOOR-PASS.md` §5.
procedure: `39-DOOR-PASS.md` §5
result: [pending]

### 7. Two devices, the headline behaviour — P5 · LIVE-01
expected: per `39-DOOR-PASS.md` §6.
procedure: `39-DOOR-PASS.md` §6
result: [pending]

### 8. A person not assigned to the night hears nothing — P7 · LIVE-06
expected: per `39-DOOR-PASS.md` §7.
procedure: `39-DOOR-PASS.md` §7
result: [pending]

### 9. THE DARK ROOM — STAFF-04 criteria 2 and 3, plus 38-HUMAN-UAT test 8
expected: radio off, launched from the home screen, the person working the door
reaches a **working** door, scans, then reconnects and syncs. Includes the
counter row tapped one-handed at minimum brightness (§8.6), and a repeat of
§8.2–§8.4 against the **other address, cold** (§8.8).
procedure: `39-DOOR-PASS.md` §8.1 – §8.8
result: [pending]
note: this is the only item that can close criteria 2 and 3. No build, no
script and no static reading substitutes for it.

## Preconditions that must be read ON THE DAY

`39-DOOR-PASS.md` §0 is not optional and is not part of the sitting's
storytelling:

- **§0.5 — the warm-up.** `self.__SW_MANIFEST` precaches **no documents at all**;
  every offline document comes from a `NetworkFirst` runtime cache at 24 h / 32
  entries, warm only from a prior online visit, and **cache keys are URLs** — so
  warming `/admin/scanner` does not warm `/door`. Both addresses must be opened
  online, separately, before the radio goes off. Skip this and §8 measures
  nothing except that nobody has ever been to the new address.
- **§0.6 — the deploy rule.** The map assertion in
  `src/lib/supabase/middleware.ts` is a `throw` at module load inside a
  middleware bundle: it fires on the **first request after deploy**, not at
  build. A wrong map is a 500 on every route the middleware covers. **Deploy on
  a day with no night scheduled, and make the first request yourself.**

## Excluded on purpose

**P6 — `38-HUMAN-UAT.md` test 2.** It **writes to production** and needs its own
fresh authorisation from the owner. It is not folded into this sitting. If it is
ever run: capture the primary keys of every row at creation, delete **by primary
key**, and snapshot every table reachable by `ON DELETE CASCADE` first. Never by
clicking a delete control.

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
