---
status: partial
phase: 33-server-data-access-layer
source: [33-VERIFICATION.md]
started: 2026-08-07
updated: 2026-08-07
---

## Current Test

[awaiting human testing — start with U-01, the door]

> **This file is an index, not a second copy.** Every item's role, URL, steps,
> expected result and evidence live in `33-VERIFICATION.md` § 7, under the same
> identifier. Duplicating them here would create two sources that can diverge —
> the defect this phase spent fourteen plans hunting. Read the detail there;
> record the result here.
>
> Deferred by owner decision 12 (`.planning/ACCESS-MODEL-DECISIONS.md`): manual
> verification happens at the end of the build, not per phase. **Deferred is not
> verified.**

## Tests

### 1. U-01 — THE DOOR. A `pending` organizer admits a ticket 🚪
expected: the scanner is reachable and the ticket is admitted. **If this fails, a status check has crept in and the phase stops** — a refusal here happens in front of a queue.
result: [pending]

### 2. U-02 — THE DOOR, offline 🚪
expected: with the network off, the scan queues and drains when it returns
result: [pending]

### 3. U-03 — THE MONEY. A master still reaches `/admin/finance` 💶
expected: the transaction list loads with real rows — not empty, not a redirect
stop condition: if U-03 or U-04 diverges, STOP — a money surface has moved, and this phase does not have permission to move one
result: [pending]

### 4. U-04 — THE MONEY. An organizer is still refused 💶
expected: redirected to `/dashboard`, exactly as before
result: [pending]

### 5. U-05 — The eleven-persona sweep (criterion 4's observable half)
expected: every role reaches exactly the surfaces it reached before the phase
result: [pending]

### 6. U-06 — The session check, which is not about permissions
result: [pending]

### 7. U-07 — The degraded path (WR-04)
expected: the bounce, the diagnostic header on the **redirect entry**, and one categorised log line — all three
result: [pending]

### 8. U-08 — The forged header, last
result: [pending]

### 9. U-09 — Ownership refusal through the new path
expected: an organizer is refused another organizer's event; a master is admitted
result: [pending]

### 10. U-10 — Ownership, MUTATION PROOF (must not be skipped)
note: without the revoke-and-roll-back step, the master check passes on what could be dead code
result: [pending]

### 11. U-11 — The eight admin surfaces
result: [pending]

### 12. U-12 — The viewer's own row (the falsifiable one)
expected: the viewer's own row shows `--` instead of action buttons — if the identity resolved to nothing, buttons would appear
result: [pending]

### 13. U-13 — The eight event-admin surfaces
result: [pending]

### 14. U-14 — Admin-events MUTATION PROOF (must not be skipped)
result: [pending]

### 15. U-15 — Guest list, attribution and refusal
result: [pending]

### 16. U-16 — Guest list, MUTATION PROOF (must not be skipped)
result: [pending]

### 17. U-17 — The `organizer/pending` asymmetry, observed in the app
expected: ticket tiers can be created, venues cannot
result: [pending]

### 18. U-18 — The public surfaces and the anonymous visitor
expected: a logged-out visitor sees exactly what they saw before
result: [pending]

### 19. U-19 — Member moderation, the coupling, and the asymmetry
result: [pending]

### 20. U-20 — Member moderation, MUTATION PROOF (must not be skipped)
result: [pending]

### 21. U-21 — 33-12's step 5 is a criterion-4 REGRESSION CHECK, not a criterion-2 probe
note: do not let this stand in for the strong check — criterion 2's evidence is 33-12's four-row table
result: [pending]

## Summary

total: 21
passed: 0
issues: 0
pending: 21
skipped: 0
blocked: 0

## Gaps

The four items marked **MUTATION PROOF** are the ones a tired reader skips, and
they are the only ones that distinguish a gate that refuses from a gate that is
inert while something else does the refusing. Three of the phase's fourteen plans
measured that an inverted gate — one that refuses every master and admits
everyone else — **compiles clean and ships**. No automated check in this
repository can see it.
