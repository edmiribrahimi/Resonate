---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 03
subsystem: database
tags: [postgres, foreign-keys, on-delete-cascade, refunds, supabase, audit-trail]

# Dependency graph
requires:
  - phase: 31-live-defects-at-the-door-and-the-bar
    provides: "31-RESEARCH.md § Answer E and Assumptions Log rows A1, A2 — the two MEDIUM-confidence claims this plan exists to settle"
provides:
  - "31-REFUND-PROBE.md — the executable protocol for both claims, with confirm/refute criteria written before the run"
  - "Probe C settled: all four refund writers discard the delete's error (file:line evidence)"
  - "A blocking gate on plan 31-04's migration: the guest_list_entries decision stays UNDECIDED until a human runs Probe B"
affects: [31-04 (the migration), 31-09 (the refund writers), finance/analytics surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A DDL reading is a hypothesis; the confirm/refute criteria are written before the run, not after"
    - "An open verdict is a first-class state — OPEN blocks downstream work rather than degrading into an assumption"

key-files:
  created:
    - .planning/phases/31-live-defects-at-the-door-and-the-bar/31-REFUND-PROBE.md
  modified: []

key-decisions:
  - "Both database claims (A1 cascade, A2 guest-list FK) remain OPEN — no probe was executed, and nothing was marked confirmed"
  - "Probe C is settled without a database: it is a file:line reading, and all four refund writers discard the delete's error"
  - "Consequence 1 (ticket_refunds.ticket_id becomes nullable + ON DELETE SET NULL) is REQUIRED regardless of the probe outcome — it follows from Option B, not from A1"
  - "Consequences 2 and 3 (guest_list_entries FK; detachment vs error check) are UNDECIDED and explicitly block plan 31-04"

patterns-established:
  - "Confirm/refute criteria stated per claim before execution, so the result cannot be read charitably afterwards"
  - "Public-repo hygiene enforced by an automated grep gate (email, project hostname, JWT prefix) before commit"

requirements-completed: []  # FIX-09 is NOT complete — the probe is open

# Metrics
duration: 12min
completed: 2026-08-05
---

# Phase 31 Plan 03: Refund Probe Summary

**The two DDL-derived refund claims are written up as an executable probe with confirm/refute criteria per claim, and both remain OPEN — plan 31-04's migration is blocked until a human runs them against a non-production database.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-05
- **Completed:** 2026-08-05 (paused at the blocking checkpoint)
- **Tasks:** 1 of 2 (Task 1 is a blocking human-action checkpoint and was NOT simulated; Task 2 executed as far as it can go without Task 1's output)
- **Files modified:** 1 created

## Accomplishments

- **The probe protocol exists and is executable.** `31-REFUND-PROBE.md` carries the exact statements for both probes, the identifiers to note, and — written *before* any run — the table of which observation confirms the claim and which refutes it. Step 5 returning `0` confirms A1, `1` disproves it. Step 8 raising SQLSTATE `23503` confirms A2, a successful `DELETE 1` disproves it.
- **Probe C is closed with `file:line` evidence, no database needed.** All four refund writers issue the ticket delete without destructuring its result:
  - `src/app/(public)/tickets/refund-actions.ts:138-141` (free / guest-list branch)
  - `src/app/(public)/tickets/refund-actions.ts:180-183` (paid branch)
  - `src/app/(public)/tickets/refund-actions.ts:389-392` (`adminRefund`)
  - `src/app/(admin)/admin/finance/actions.ts:110`
  - `src/app/api/cron/reconcile-refunds/route.ts:121`, inside a `try` whose `catch {}` at `:124-126` only does `errors++`

  The contrast is in the same file: `refund-actions.ts:63-65` *does* destructure `insertError` and throws with its message. The delete is the one write in the refund path that is not checked. Combined with the absence of any error tracking in the repo (`meta-gates.md`), a failing delete reaches nobody.
- **The FK claim is reachable, not theoretical.** `src/lib/guest-list/process-entry.ts` writes `ticket_id` at lines 178, 186, 196, 214, 266 and 283 — guest-list entries really do point at tickets, so the A2 scenario is a state the product produces.
- **No later migration alters either foreign key.** Grep across `supabase/migrations/` shows `ticket_refunds` and `guest_list_entries` are each touched by exactly one file — their creating migration. The DDL as read is the current *declared* state. That is still a reading, not an execution, and the document says so.

## Task Commits

1. **Task 2 (partial): Record the two observations and the decision they force** — `4323114` (docs)

**Task 1** produced no commit: it is a `checkpoint:human-action` with `gate="blocking"` and was returned to the operator, not simulated.

## Files Created/Modified

- `.planning/phases/31-live-defects-at-the-door-and-the-bar/31-REFUND-PROBE.md` — the probe protocol, the confirm/refute criteria per claim, the settled Probe C evidence, and the Consequences table that plan 31-04 reads

## Decisions Made

- **Nothing was marked confirmed.** The entire purpose of this plan is that A1 and A2 were read from DDL and never executed. Writing "confirmed" without a run would reproduce the exact error the plan exists to correct. Both verdicts read **OPEN — not observed**.
- **Task 2 was executed partially rather than skipped.** Its output is the artefact the checkpoint instructions live in, and Probe C — a `file:line` reading — is genuinely completable without a database. The two database verdicts are left as explicit OPEN slots with the criteria filled in, so the operator transcribes an observation into a prepared frame rather than deciding what it means after the fact.
- **Consequence 1 was separated from the probe outcome.** Making `ticket_refunds.ticket_id` nullable with `ON DELETE SET NULL` follows from Option B keeping the ticket delete — a `NOT NULL` column cannot be set to `NULL` by a foreign-key action. It is REQUIRED whether or not A1 holds, and saying so keeps the probe honest: a confirmed A1 is not needed to justify the change that was going to happen anyway.
- **Consequences 2 and 3 block plan 31-04 explicitly.** The document states that while row 2 reads UNDECIDED, the migration must not be written. `supabase-data.md`, gate *migration in avanti*: an applied migration is a historical fact and is never edited, so discovering the answer afterwards costs a second migration.

## Deviations from Plan

None — the plan was executed as written, up to its own blocking checkpoint.

The plan's `<verify><automated>` gate was run against the document:

```
grep -nE "@[a-z0-9.-]+\.[a-z]{2,}|supabase\.co|eyJ" .../31-REFUND-PROBE.md
→ exit 1 (no match)
```

No email address, project hostname or JWT prefix is present. `wc -l` reports 230 lines against the `min_lines: 40` requirement. The document names roles, never people, and carries no connection string or key — `.planning/` is tracked in a public repository.

## Issues Encountered

**The worktree started behind its declared base.** `git merge-base HEAD 976f011` returned `31e9217` rather than `976f011`, so the worktree was reset to the expected base per the startup check before any work began. No commits were lost — HEAD was an ancestor, not a divergence.

## Open Items — this plan is NOT complete

| Claim | State | What settles it |
|---|---|---|
| **A1** — `ON DELETE CASCADE` on `ticket_refunds.ticket_id` destroys the audit row | **OPEN** | Probe A step 5: a count of `0` confirms, `1` disproves |
| **A2** — deleting a ticket referenced by `guest_list_entries` raises a FK violation the refund path swallows | **OPEN** | Probe B step 8: SQLSTATE `23503` confirms, `DELETE 1` disproves |
| **Probe C** — the delete's error is never checked | **SETTLED** | `file:line` reading, five call sites, listed above |

`requirements-completed` is deliberately empty. **FIX-09 is not satisfied by this plan** — this plan only makes it safe to design the fix.

## User Setup Required

**Yes — a blocking human action.** See the checkpoint returned alongside this summary and the "How to close this document" section of `31-REFUND-PROBE.md`. In short: a non-production Supabase project or a local Postgres carrying the repository's migrations, two short SQL sessions, and the literal output of steps 5 and 8 pasted back.

**Production must not be used.** `STATE.md` records 2 events, 3 parties, 1 ticket, 4 profiles. A `DELETE FROM tickets` there is unrecoverable and would destroy the row the rest of this phase's research describes.

## Next Phase Readiness

- **Plan 31-04 is BLOCKED.** Its migration must not be written while row 2 of the Consequences table reads UNDECIDED.
- **Plan 31-09 is partially blocked.** Whether the refund writers need a guest-list detachment step or only an error check depends on Probe B. The error check itself is justified regardless — Probe C is settled.
- Everything else in the phase is unaffected by this plan.

## Self-Check: PASSED

- `.planning/phases/31-live-defects-at-the-door-and-the-bar/31-REFUND-PROBE.md` — FOUND
- Commit `4323114` — FOUND
- Automated grep gate — exit 1, no match
- No modification to `STATE.md` or `ROADMAP.md` — confirmed (worktree mode)

---
*Phase: 31-live-defects-at-the-door-and-the-bar*
*Completed: 2026-08-05 (paused at blocking checkpoint)*
