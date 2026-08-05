---
phase: 31
plan: 01
subsystem: check-in & offline
tags: [service-worker, cache, door, runbook, serwist, pwa]
status: paused-at-checkpoint
requires: []
provides:
  - "Route-specific NetworkOnly runtime caching for the door's four API routes"
  - "reloadOnOnline explicitly false, with its reason recorded in config"
  - "31-DOOR-RUNBOOK.md — the written runbook for the verification night"
affects:
  - "Every offline verification in phase 31 — they now measure IndexedDB, not Cache Storage"
  - "31-13 verification pass — blocked on the Turbopack finding below"
tech-stack:
  added: []
  patterns:
    - "Explicit per-route runtime caching spread before the library's inherited rules"
key-files:
  created:
    - .planning/phases/31-live-defects-at-the-door-and-the-bar/31-DOOR-RUNBOOK.md
  modified:
    - src/app/sw.ts
    - next.config.ts
decisions:
  - "The door's four API routes are NetworkOnly, declared before the inherited rules — order is load-bearing, Serwist takes the first match"
  - "reloadOnOnline stays present and explicitly false, so the next reader sees a decision rather than a default"
  - "The Turbopack/Serwist incompatibility was NOT fixed here — it is a Rule 4 architectural decision, raised at the blocking checkpoint"
metrics:
  tasks_completed: 2
  tasks_total: 3
  duration: ~35 min
  completed: 2026-08-05
---

# Phase 31 Plan 01: The Door's Offline Ground Summary

Declared the door's four API routes `NetworkOnly` ahead of Serwist's inherited
`/api/*` `NetworkFirst` rule, turned `reloadOnOnline` off with its reason, and
wrote the night's runbook — then stopped at the blocking checkpoint, carrying a
finding that changes what that checkpoint can prove.

**Status: PAUSED at Task 3 (`checkpoint:human-verify`, `gate="blocking"`).**
Tasks 1 and 2 are complete and committed. Task 3 requires a production build on a
real device and was **not** executed, **not** simulated, and **not** marked done.

---

## What Was Built

### Task 1 — `203bfd5`

`src/app/sw.ts` no longer passes `defaultCache` straight through. It now builds a
`doorRuntimeCaching: RuntimeCaching[]` array of four `NetworkOnly` rules, spread
**before** `...defaultCache`:

| Route | `src/app/sw.ts` line |
|---|---|
| `/api/tickets/attendance` | 34 |
| `/api/tickets/checkin` | 38 |
| `/api/membership/list` | 42 |
| `/api/membership/verify` | 46 |

`NetworkOnly` is imported from `serwist` at `src/app/sw.ts:3`. The
`...defaultCache` spread is at `src/app/sw.ts:60`. **34 < 60** — the ordering the
acceptance criterion asks to be asserted by line number. Order is load-bearing:
Serwist takes the first matching route, so an inherited rule placed first would
keep winning.

`next.config.ts:12` now reads `reloadOnOnline: false`, with the reason written
beside it at `next.config.ts:8-11`: a reload on reconnection tears down the camera
stream, the party selection and the in-memory undo list while entries are still
queued, and that undo list is the door's only correction mechanism.

**Verified at the source, not from memory:**

- The inherited rule is real: `node_modules/@serwist/next/dist/index.worker.js:178-192`
  — `matcher: ({sameOrigin, url:{pathname}}) => sameOrigin && pathname.startsWith("/api/")`,
  `method: "GET"`, `NetworkFirst`, `cacheName: "apis"`, `maxEntries: 16`,
  `maxAgeSeconds: 24*60*60`, `networkTimeoutSeconds: 10`. The per-route override
  pattern was copied from the library's own `/api/auth/*` entry at `:172-177`.
- The roster claim is real: `src/app/api/membership/list/route.ts:29-32` selects
  `id, full_name, membership_code` from `profiles` for every row with a
  membership code. That is the whole member roster, and the `"apis"` bucket held
  it at rest for 24 h on any staff phone that opened the scanner.
- The undo list is real and in memory: `ScannerClient.tsx:94` —
  `useState<ScanRecord[]>([])`.

### Task 2 — `b223f19`

`.planning/phases/31-live-defects-at-the-door-and-the-bar/31-DOOR-RUNBOOK.md`,
202 lines, seven sections in the order the plan specifies: the five questions;
the asymmetry stated for the person holding the phone; the build rule; the
six-scan sequence; the two-device procedure; the four seeded conflict causes;
what cannot live in the file.

Each of the five questions from `checkin-offline.md` has an answer, not a
placeholder — answered as a standing rule at role level, with the per-night
fill-in pushed to an uncommitted note under `docs/` (section 7).

---

## Verification Performed

**There is no test runner for this product.** No `test` script, no `*.test.*` or
`*.spec.*` file. Nothing below is claimed as verified because tests pass.

| Check | Result |
|---|---|
| `npm run build` | **PASS** — compiled, Next TypeScript check clean, all routes emitted |
| `grep -n "NetworkOnly" src/app/sw.ts` | 5 lines: 3 (import), 35, 39, 43, 47 |
| `grep -n "reloadOnOnline" next.config.ts` | `12:  reloadOnOnline: false,` |
| `grep -c "defaultCache" src/app/sw.ts` | **2** — the import and the single spread, exactly as required |
| Ordering assertion | first `NetworkOnly` matcher at `:34`, `...defaultCache` at `:60` |
| `test -f 31-DOOR-RUNBOOK.md` | PASS |
| `grep -c "npm run dev" 31-DOOR-RUNBOOK.md` | **1** |
| `grep -nE "@[a-z0-9.-]+\.[a-z]{2,}" 31-DOOR-RUNBOOK.md` | **no match** — no email address |
| `public/sw.js` regenerated | **NOT MET — see Deviations** |

**The single `npm run dev` occurrence, quoted in full** (runbook line 93):

> The phrase to avoid is `npm run dev` — it is named here only so that it is
> recognised and refused, never as an instruction.

It is inside the sentence forbidding it, never as an instruction.

**Public-repository re-read.** The runbook was re-read before committing for
person names, venues and dates. It names roles only — *a staff member assigned to
the door*, *the person supervising the night*, `organizer`, `master`, `member`.
Mechanically confirmed: `grep -nEi "booze|muro|perlone|ramadub|sunset|motionlab|via |corso |piazza |torino|turin"` returns no match; the only dates in the file
(lines 5 and 96) are the document's own authoring date, not an event date.

---

## Deviations from Plan

### 1. [Rule 4 — Architectural, NOT fixed, raised for decision] `npm run build` does not produce a service worker at all

- **Found during:** Task 1, checking the acceptance criterion *"`public/sw.js` is regenerated"*.
- **Issue:** `public/sw.js` is absent after a successful `npm run build`. The
  project builds with **Turbopack** — the Next 16 default, and `turbopack: {}` is
  set at `next.config.ts:17` — while `@serwist/next` 9.5.6 is a **webpack**
  plugin. The plugin detects this and prints its own warning during the build:
  *"You are using '@serwist/next' with `next dev --turbopack`, but it doesn't
  support Turbopack"*, listing `--webpack`, `@serwist/turbopack` or configurator
  mode as the ways out. It then emits nothing.
- **Evidence, three independent observations:**
  - `public/sw.js` does not exist after the build — and does not exist in the
    main checkout's `public/` either.
  - `find .next -iname "*sw*"` and `-iname "*serwist*"` return nothing.
  - `grep -rl "serviceWorker" .next/static | wc -l` returns **0** — the client
    bundle contains no registration code at all.
  - `vercel.json` has no build override, so the deployed build takes the same
    path. `next build --help` confirms `--webpack` exists as an opt-out.
- **Why it was not fixed:** switching the production bundler, or adopting
  `@serwist/turbopack`, is an architectural change and a new package — Rule 4 and
  the package-install exclusion to Rule 3. Both are the user's decision, and the
  plan already has a blocking checkpoint at exactly this point.
- **Consequence for Task 3, which is the important part:** the checkpoint asks
  whether the `"apis"` Cache Storage bucket still holds `/api/tickets/attendance`
  and `/api/membership/list`. **An empty bucket would not prove the fix works** —
  it is equally consistent with there being no service worker at all, which is
  the likelier reading today. Recording "bucket clean, fix verified" would be a
  false green of exactly the kind this project's guardrails exist to prevent.
- **Recorded in:** the Task 1 commit message, and runbook section 3 as a blocking
  note telling whoever runs the verification pass to confirm a worker is
  registered *before* recording any offline observation.

### 2. [Rule 1 — Bug, fixed] Two wrong `file:line` citations

- **Found during:** Task 2, checking my own citations against the edited file.
- **Issue:** the runbook cited `next.config.ts:12` for `disable` and
  `next.config.ts:19` for `turbopack: {}`. Task 1's edit had shifted both — the
  real lines are **13** and **17**. The Task 1 commit message carried the same
  wrong `:19`.
- **Fix:** both citations corrected in the runbook; the Task 1 commit amended
  (`96a8b37` → `203bfd5`) rather than shipping a wrong citation. In a repo where
  `file:line` evidence is the only evidence that exists, a stale citation is not
  a typo.

### 3. [Observation, no change made] No network timeout added to the `NetworkOnly` rules

The library gives `/api/auth/*` a `networkTimeoutSeconds: 10`. The four door
rules were left without one, deliberately: the plan asks only for the cache
boundary, and a service-worker-level timeout would duplicate or mask whatever
timeout the app's own fetch layer applies. Recorded here rather than decided
silently — if the door should fail fast rather than hang, that belongs in a plan
that also looks at the client's fetch behaviour.

---

## Known Stubs

None. Both tasks produced complete work within their scope.

---

## Threat Flags

None. No new endpoint, auth path, file access pattern or schema change was
introduced. `T-31-01-01` and `T-31-01-02` are **mitigated in code but not yet
observable**, because of Deviation 1 — the mitigation cannot take effect until a
service worker is actually built. `T-31-01-03` (`reloadOnOnline`) and
`T-31-01-04` (the runbook as a publication) are mitigated and asserted above.
`T-31-01-SC` holds: this plan installed no package.

---

## Checkpoint Reached — Task 3 Not Executed

Task 3 is `checkpoint:human-verify` with `gate="blocking"`. It requires a
production build on a real device with a real radio, which cannot be done from
here. It is not marked done and its outcome is not fabricated. The instructions
for the human are in the executor's return message and in runbook sections 3–5.

**The first thing to settle is Deviation 1**, because until a service worker is
actually built, steps 3–5 of the checkpoint cannot distinguish a working cache
boundary from an absent service worker.

---

## Self-Check: PASSED

- `src/app/sw.ts` — FOUND, modified
- `next.config.ts` — FOUND, modified
- `.planning/phases/31-live-defects-at-the-door-and-the-bar/31-DOOR-RUNBOOK.md` — FOUND, 202 lines
- Commit `203bfd5` — FOUND in `git log`
- Commit `b223f19` — FOUND in `git log`
- `public/sw.js` — **correctly reported as absent**, not claimed as created

Per the parallel-execution contract, `STATE.md` and `ROADMAP.md` were not
touched; the orchestrator owns those writes.
