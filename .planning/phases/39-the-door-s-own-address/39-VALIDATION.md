---
phase: 39
slug: the-door-s-own-address
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-11
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `39-RESEARCH.md` §"Validation Architecture" (lines 1458–1509).

---

## Test Infrastructure

> **This repository has no test runner for the product.** `package.json` has no `test`
> script and there is no `*.test.*` / `*.spec.*` file on this tree. No task in this phase
> may install a framework or create a test file — doing so would be scope the owner did
> not ask for, and it would not make criteria 2 or 3 any more provable.

| Property | Value |
|----------|-------|
| **Framework** | **none for the product** |
| **Config file** | none — and Wave 0 must not create one |
| **Quick run command** | `npm run build` (carries the Next typecheck — a type error blocks the Vercel deploy) |
| **Full suite command** | `npm run build && npm run verify:routes && npm run verify:persona` |
| **Estimated runtime** | ~90–150 s for the build; the two verify scripts are sub-second |

`npm run verify:capabilities` is added to the full suite **only where a database is
reachable**; it is not a gate on a machine without credentials.

---

## Sampling Rate

- **After every task commit:** `npm run build`
- **After every plan wave:** `npm run build && npm run verify:routes && npm run verify:persona`
- **Before `/gsd:verify-work`:** all three green, **and** `39-DOOR-PASS.md` exists with
  every `Result` field empty and reading `pending`
- **Max feedback latency:** ~150 s (one build)

**The phase gate is not the build.** Criteria 2 and 3 close only when the door pass is
filled in from the sitting — one evening, at the end of milestone v1.5, per D-39-07.
Until then the phase is *executed*, not *complete*.

---

## Per-Task Verification Map

> Rows are added by the planner, one per task, and flipped during execution.
> `Test Type` here is one of: `build` · `source-assertion` · `script` · `devtools` ·
> `dark-room`. There is no `unit` row in this phase and there should not be one.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| *(filled by planner)* | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Success criterion → sampling point

| Criterion | Sampling point | Automated? | What actually closes it |
|---|---|---|---|
| **1** — one permanent address, no redirect, no round trip | `npm run build` green with the two-route map entry; `verify:routes` check 2 green with the new page censused; source assertion that neither page calls `redirect(` for the other | build + scripts: **yes**; the absence of a 3xx on the wire: **no** | build/scripts prove the wiring; **§1.3 of the door pass** proves no redirect |
| **1 (cont.)** — both addresses gated by one map entry | `resolveRoute` returns `door.operate` + `assignmentOpenable` for both; the module-load assertion in `middleware.ts` | **partly** — that assertion throws on the **first request**, not at build | the deploy rule (see Manual-Only, row 5), not a test |
| **2** — a device that installed the door still opens a working door after the move, home screen, radio off | DevTools → Application → Cache Storage (which bucket holds a document per address, and its age); DevTools → Application → Manifest (`start_url`, `display`, no `scope`); then the phone | **no.** Nothing in this repo can hold a phone | **§8 of the door pass.** Every reading before it is a precondition |
| **3** — the full door pass executed on a device and written down | the person: dark room, radio off, launch, scan, reconnect, sync — wall-clock times and verbatim observations | **no, by definition** | **§8, and nothing before it** |
| **D-39-06** — the inherited nav item | `npm run build` green after the `getVisibleNavItems` signature change across its call sites; source assertion that the server-side guard is unchanged | build: **yes**; the drawn entry: **no** | **§1.5 of the door pass** |
| **Non-regressions** | source assertions: `/events/**` still `NetworkOnly` in `sw.ts`; the four `NetworkOnly` API rules unchanged; `reloadOnOnline` still `false`; no new `layout.tsx` under `src/app/(admin)`; no door state moved into Cache Storage | **yes** | fully closed by the assertions |

---

## Wave 0 Requirements

- [ ] `39-DOOR-PASS.md` written **before** the code, every `Result` empty and reading `pending`
- [ ] a pointer block at the head of `38-PROCEDURES.md`, committed together with it, so one
      document is the thing a person reads in the dark room
- [ ] a `## Non-regression assertions` block in each plan, naming the exact `grep` / `find`
      commands for the six non-regressions above

*No test file. No framework install. No fixtures. Proposing any would contradict the
no-test-runner constraint rather than work around it.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A phone with the radio off, launched from the home screen, reaches a working door | STAFF-04, criterion 2 | No build, script or static reading can show that a device opened a door offline | `39-DOOR-PASS.md` §8.2–§8.4, §8.8 |
| The full door pass: launch, scan, reconnect, sync | criterion 3 | The behaviour only exists on a device in a dark room | `39-DOOR-PASS.md` §8, with wall-clock times |
| Which Cache Storage bucket holds the door's document, and its age | criterion 2 (precondition) | Needs a browser; five minutes of DevTools | `39-DOOR-PASS.md` §0 — online, open both addresses, read Application → Cache Storage, then go offline and reload |
| Neither address answers with a 3xx | criterion 1, D-39-02 | Requires reading the wire, not the source | `39-DOOR-PASS.md` §1.3 — DevTools → Network, both requests 200 |
| A `pending` organizer is drawn the Check-in entry | D-39-06 | A rendered navigation is not a source fact | `39-DOOR-PASS.md` §1.5 |
| The map assertion does not 500 the first request after deploy | availability at the door | The assertion fires at first request in the deployed runtime | Deploy on a day with **no night scheduled**, then make the first request yourself before anyone else does |
| The seven procedures Phase 38 deferred (P1–P5, P7, and UAT test 8) | LIVE-* / D-39-07 | Same room, same night — folded into this phase's pass | `39-DOOR-PASS.md`, per-item mapping to the requirement each observation closes |
| P6 — the procedure that writes to production | LIVE-* | Writes rows; needs its own fresh authorisation from the owner | Stays **separate**. `38-HUMAN-UAT.md` test 2. Capture primary keys at creation, delete by primary key, never by clicking a delete control |

---

## Validation Sign-Off

- [ ] Every task carries an automated verify (`build` / `script` / source assertion) or is
      explicitly marked `dark-room` and mapped to a door-pass section
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 delivers `39-DOOR-PASS.md` before any code task runs
- [ ] No watch-mode flags
- [ ] Feedback latency < 150 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

*Derived from `39-RESEARCH.md` (2026-08-11). Framework claims valid until ~2026-09-10;
`node_modules` measurements valid until the next `npm install` or Next upgrade; precache
figures valid until the next deploy.*
