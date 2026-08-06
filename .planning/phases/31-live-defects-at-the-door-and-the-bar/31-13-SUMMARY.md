---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 13
subsystem: verification
tags: [verification, evidence, file-line, no-test-runner, deferred-debt, service-worker]
status: complete-with-open-checkpoint
requires:
  - "31-01 … 31-12 — every summary, deviation and deferred item this document collects"
  - "31-VALIDATION.md — the per-requirement evidence contract this document answers"
  - "31-REFUND-PROBE.md — closed, both claims CONFIRMED"
provides:
  - "31-VERIFICATION.md — 903 lines, 72 path:line citations, one section per requirement"
  - "The untyped-Supabase-client limit on what npm run build can prove, written down"
  - "The service-worker discovery and its consequence for v1.4, written down"
  - "Every deferred item from twelve plans collected with the phase that owns it"
  - "31-VALIDATION.md statuses set honestly, nyquist_compliant left false"
affects:
  - "Phase 34 — owns the review list's navigation link"
  - "Phase 35 — owns the membership status question and the per-night policy scope"
  - "Phase 38 — owns LIVE-01 and LIVE-05"
  - "The milestone — owns the fetchEventRevenue under-reporting decision"
tech-stack:
  added: []
  patterns:
    - "Every line number re-read against the tree rather than carried from a summary"
    - "A negative requirement proved by a recorded grep output, not by a claim"
    - "A split status per requirement, so half-evidence cannot read as whole"
key-files:
  created:
    - .planning/phases/31-live-defects-at-the-door-and-the-bar/31-VERIFICATION.md
  modified:
    - .planning/phases/31-live-defects-at-the-door-and-the-bar/31-VALIDATION.md
decisions:
  - "nyquist_compliant stays false. Thirteen of fourteen requirements have half their evidence; closing the gate would be the tampering the plan's own threat register names T-31-13-03"
  - "Task 2's door pass was NOT run and NOT simulated. It is recorded as a fourth open blocking checkpoint rather than smoothed over"
  - "Task 3's closing sections were written in the same pass as Task 1's static half, because the checkpoint between them cannot be executed from here and waiting for it would have produced no document at all"
  - "Sixteen ⬜ markers were left standing in 31-VALIDATION.md rather than converted, and are enumerated here"
metrics:
  duration: ~55 min
  completed: 2026-08-06
  tasks_completed: 2
  tasks_total: 3
  commits: 2
  files_created: 1
  files_modified: 1
---

# Phase 31 Plan 13: The Phase's Evidence Record — Summary

The phase now has a document a stranger could audit: what was checked, by opening
which file at which line; what was executed and against what; and — requirement by
requirement — what was **not** executed, said plainly rather than covered by a
green build.

**Commits:** `d70dbbc` (31-VERIFICATION.md), `c5f699a` (31-VALIDATION.md statuses)

---

## What was built

### `31-VERIFICATION.md` — 903 lines, 72 `path:line` citations

One section per requirement, FIX-01 through FIX-13 (fourteen rows; FIX-11 carries
two). **Every line number in it was re-read against the tree at `3b8f5e7`**, never
copied from a plan or a summary — line numbers moved as the phase progressed, and
a citation pointing at the wrong line is worse than none because it looks checked
(`ai-engineering.md`, gate *hallucination*).

Automated gates on the document itself, run:

```
$ grep -cE "\.(ts|tsx|sql):[0-9]+" 31-VERIFICATION.md    → 72     (threshold ≥ 14)
$ grep -nE "@[a-z0-9.-]+\.[a-z]{2,}" 31-VERIFICATION.md  → exit 1 (no email address)
$ wc -l 31-VERIFICATION.md                               → 903    (min_lines 120)
$ npm run build                                          → ✓ Compiled successfully
```

The document names roles only, carries identifiers only, and holds no venue, no
date and no person.

### Five greps reproduced with command and output

Not summarised — reproduced, so a reader can re-run them:

```
$ grep -c "\.clear()"       src/lib/offline/checkin-store.ts      → 0
$ grep -c "cursor.delete()" src/lib/offline/checkin-store.ts      → 0
$ grep -c "offlineSync"     src/app/api/tickets/checkin/route.ts  → 0
$ grep -c "directTicketId"  src/app/api/tickets/checkin/route.ts  → 0
$ grep -c "res.ok"          src/lib/offline/sync-manager.ts       → 0
```

### FIX-13 proved by a negative, with its full output

The `from("profiles")` grep over every directory this phase added or changed
returns **ten hits**, all recorded verbatim, and **every one is followed
immediately by `.select(`** — checked by opening each of the ten. The
complementary write grep is recorded too: the writes in those directories target
`door_scan_events`, `tickets`, `guest_list_entries` and `attendances`, and the one
apparent `.update(` at `checkin/route.ts:269` is `crypto.createHash(…).update(…)`,
a hash rather than a database write. **`src/lib/door/` and the review route write
nothing at all.**

---

## Two findings this document records that no plan summary carried alone

### 1. The build gate proves less than it appears to

**None of the four Supabase clients is parameterised with `Database`** —
`client.ts:4`, `server.ts:7`, `middleware.ts:15`, `service.ts:4`, all opened and
checked. `src/types/database.ts` exists and is imported for local annotations, but
it is never wired to a client.

**Consequence: no column name in any Supabase query in this repository is checked
by the build.** On a phase that adds a sixteen-column table and rewrites five
refund writers, "npm run build passes" means the TypeScript is well-formed. It
does not mean a single column exists. Three plan summaries noticed this in
passing; it belongs in the phase's record, because it changes what the only
automatic gate this project has is able to prove.

### 2. The service worker was never built in production — and v1.4 shipped anyway

`@serwist/next` 9.5.6 is a webpack plugin; Next 16 builds with Turbopack by default
(`next.config.ts:17`), so `public/sw.js` was never emitted. Fixed in this phase:
`package.json:7` is now `next build --webpack`, and the worker is produced —
**53,166 bytes, containing all four of the door's route patterns**, verified by
running the build in this worktree on 2026-08-06.

**The consequence for what shipped before is stated in the record:** v1.4 shipped
"offline support via IndexedDB + service worker". The IndexedDB half worked. **The
service-worker half never existed in production.** Every offline claim about
releases before this phase rested on a worker that was not there.

---

## What was NOT executed — the honest half

**Task 2, the door pass, was not run and was not simulated.** It requires a
production build on a phone, in a dark room, with the radio physically off, and
two separate installs on two devices. None of it happened. It is recorded as a
**fourth open blocking checkpoint**, alongside the three the phase already carried:

| Plan | Task | What it still needs |
|---|---|---|
| 31-01 | Task 3 | The `"apis"` Cache Storage check on a device — which finally means something now that a worker exists |
| 31-04 | Task 3 | Applying the migration to the real database |
| 31-11 | Task 4 | The dark-room pass, amber against the Offline yellow |
| **31-13** | **Task 2** | **The door pass itself** — twelve steps, two devices, radio off |

**The migration is applied to a throwaway PostgreSQL 16.14 container and nowhere
else.** Seven structural observations are recorded (it applies cleanly; exactly one
policy, `door_scan_events_select_admin`, and no `_select_master`; RLS enabled; no
name or contact column; all three foreign keys `SET NULL`; `ticket_refunds.ticket_id`
nullable; `attendances` gained `party_id` plus two partial unique indexes), and both
refund probes were re-run on the migrated schema, where the fix behaves. **One
observation is recorded as still owed:** the member-session RLS check returning zero
rows, which the container cannot produce because it carries no auth layer — and that
is the observation that matters most, since the policy is the boundary and the
redirect is not.

Every code path in this phase that writes to `door_scan_events` —
`checkin/route.ts:310`, `undo/route.ts:215`, `membership/verify/route.ts:169` — **has
never run.**

### The sixteen ⬜ markers left standing in `31-VALIDATION.md`

Left standing deliberately, and named here as the acceptance criterion requires:

| Requirement | The half still missing |
|---|---|
| FIX-01 | observable — the forged-header curl against a deployment |
| FIX-02 | manual — pressing Serve twice on one token |
| FIX-03 | manual — two devices, offline, the same ticket |
| FIX-04 | manual — the six scans, online then radio off |
| FIX-04a | observable — reading the amber flash, and the row's NULL `cause` |
| FIX-05 | manual — the offline check-in surviving a forced refresh |
| FIX-06 | manual **and** observable — the Slow 3G pass and the IndexedDB row count |
| FIX-07 | manual — the two pending keys read out of DevTools |
| FIX-08 | manual **and** observable — the dead entry, and the expired session |
| FIX-09 | manual ×3 — the three refund passes |
| FIX-10 | manual — the token in `pendingCheckins`, and the negative probe |
| FIX-11 (a) | manual — the four seeded causes |
| FIX-11 (b) | observable — the empty state against real rows |
| FIX-12 | observable — the pasted technical view |

**FIX-13 is the only requirement that is complete**, being the only one whose
contract a static check can satisfy on its own.

---

## Deviations from Plan

### 1. [Rule 3 — blocking] Task 3 was executed in the same pass as Task 1

- **Found during:** Task 1, on reaching Task 2.
- **Issue:** the plan sequences Task 1 (static half) → Task 2 (blocking
  checkpoint, the door pass) → Task 3 (fold in the observations, write the closing
  sections). Task 2 cannot be executed from here, and its outcome was already
  known before this plan started: **not run**. Stopping at the checkpoint would
  have left the phase with a half-document and no record of what was lost or what
  stays open — the thing the plan exists to prevent.
- **Resolution:** the static half and the three closing sections were written in
  one pass, with Task 2's twelve observations recorded as **absent, per
  requirement**, rather than folded in. Nothing was fabricated and no observation
  was assumed. Task 2 remains open and is named as the fourth blocking checkpoint.
- **Commit:** `d70dbbc`.

### 2. [Rule 2 — missing critical content] Two findings the plan did not ask for

- **Found during:** Task 1, checking claims against current code.
- **Issue:** the plan's assertion list does not mention the untyped Supabase
  clients or the service-worker build defect. Both change what the phase's evidence
  means — the first narrows every green build in it, the second retroactively
  corrects a claim made about v1.4 — and leaving them in plan summaries nobody
  re-reads would repeat the failure the "stays open" section exists to prevent.
- **Resolution:** both have their own section in the record, with the greps and
  the byte count.
- **Commit:** `d70dbbc`.

### 3. [Rule 2] `31-VALIDATION.md`'s wave-0 checklist and sign-off were rewritten, not only ticked

- **Found during:** Task 3.
- **Issue:** the plan asks for the status column and the sign-off block. Ticking
  "wave 0 complete" on the strength of the artefacts existing would assert exactly
  the false positive the phase was shaped around — a migration in the repository
  and not in the database.
- **Resolution:** each wave-0 row carries what it actually is; `wave_0_complete`
  stays `false`; the build tick carries its new limit; and each unticked sign-off
  row carries its reason.
- **Commit:** `c5f699a`.

### No auto-fixes were needed

Every `file:line` claim carried forward from a summary was checked against current
code and **every one held** at its stated location or at the location this document
records. No stale citation reached the record. Two summaries had cited lines that
had since moved (`31-01` Deviation 2 recorded the same class of error mid-phase);
this document re-derived all of them from the tree rather than trusting any.

---

## Verification of this plan's own output

**There is no test runner for the product**, so nothing here is claimed on the
strength of a passing test.

| Check | Result |
|---|---|
| `npm run build` | **✓ Compiled successfully**, `next build --webpack`, every route emitted |
| `public/sw.js` produced | **YES** — 53,166 bytes, four door route patterns present |
| `grep -cE "\.(ts\|tsx\|sql):[0-9]+" 31-VERIFICATION.md` | **72** (threshold ≥ 14) |
| `grep -nE "@[a-z0-9.-]+\.[a-z]{2,}"` on both documents | **no match** in either |
| `wc -l 31-VERIFICATION.md` | **903** (min 120) |
| `grep -cE "FIX-0[1-9]\|FIX-1[0-3]" 31-VERIFICATION.md` | **19** — every requirement has its own section |
| `grep -c "⬜" 31-VALIDATION.md` | **16** — enumerated above, by design |
| `grep -n "nyquist_compliant" 31-VALIDATION.md` | `:5 false`, and two places saying why |
| Files touched outside `files_modified` | **none** — `git status --short` clean after each commit |
| `STATE.md` / `ROADMAP.md` | **not touched** — the orchestrator owns those writes |

**Public-repository re-read.** Both documents were re-read before committing. They
name roles — *a member of staff at the door*, *the person supervising the night*,
`organizer`, `master`, `member` — and never a person. No venue, no unannounced
date, no line-up, no key, no connection string, no project hostname. Every
identifier that appears is a column name or a code identifier, never a member's.

---

## Known Stubs

None. The document contains no placeholder, no "TBD" and no section written as a
frame to be filled in later. Where evidence does not exist, the document says it
does not exist and says which pass would produce it.

---

## Threat Register

| Threat | Disposition met by |
|---|---|
| T-31-13-01 information disclosure into a published document | No email address in either file (grep, exit 1). No name, no venue, no date. The FIX-12 evidence is the **column list**, not a pasted export — there is nothing to redact because nothing was exported |
| T-31-13-02 a citation carried from a summary pointing at a moved line | Every line number re-read against the tree at `3b8f5e7`; the method is stated in the document's own "How to read" section |
| T-31-13-03 closing the gate while a requirement has no evidence | `nyquist_compliant` stays `false`; the missing requirements are listed by name in the frontmatter note and again in this summary |
| T-31-13-04 seeding conflicts and refunds against production | **No database of any kind was written to by this plan.** The only executions on record are against a throwaway container, destroyed |
| T-31-13-05 deferred defects vanishing between a summary and the milestone | QR-01, RATE-01, OBS-01, Option A and the coarse policy each have a row with their reason; sixteen further deferred items are collected with the phase that owns each |
| T-31-13-SC npm installs | Nothing was installed |

---

## Threat Flags

None. This plan created no endpoint, no auth path, no file-access pattern and no
schema change. It wrote two documents.

---

## Self-Check: PASSED

- `.planning/phases/31-live-defects-at-the-door-and-the-bar/31-VERIFICATION.md` — FOUND, 903 lines
- `.planning/phases/31-live-defects-at-the-door-and-the-bar/31-VALIDATION.md` — FOUND, modified
- commit `d70dbbc` — FOUND in `git log`
- commit `c5f699a` — FOUND in `git log`
- `npm run build` — passes
- Post-commit deletion check — no tracked file was deleted
- `STATE.md`, `ROADMAP.md` — not modified, per the parallel-execution contract
