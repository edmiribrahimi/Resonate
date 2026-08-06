---
phase: 32-capability-model-in-the-database
plan: 02
subsystem: evidence
tags: [baseline, access-control, rls, capability-model, cap-03]
requires: []
provides:
  - "B4 — the pre-phase register of every server-side permission surface in application code"
affects:
  - "32-VERIFICATION.md — the phase gate rebuilds this register and compares predicate columns"
tech-stack:
  added: []
  patterns:
    - "31-REFUND-PROBE.md's *Where it was run* header block, applied to a surface register"
key-files:
  created:
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-surfaces.md
  modified: []
decisions:
  - "B4 records the three known inconsistencies verbatim and resolves none (D-16)"
  - "Coverage is stated as a measured boundary (21 of 178 comparisons read line by line), not as an unproven claim of completeness"
  - "Census count 2 is recorded twice — the plan's literal command (17) and the pre-registered form (21) — and 2b is designated the gate command"
metrics:
  duration: ~35 min
  tasks: 2
  files: 1
  completed: 2026-08-06
---

# Phase 32 Plan 02: B4 — the surface register Summary

A 495-line hand-written register of every server-side permission decision in
application code at commit `3f2ce4d`, with `file:line` and character-exact predicates,
written so the phase gate can prove the predicate column did not move.

## What was built

One committed markdown file, no code changes:
`.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-surfaces.md`

| Section | Content |
|---|---|
| Header | commit, date, the comparison rule, the public-repo constraint |
| 1 | four middleware prefix rules — `:82` / `:90` / `:99` / `:108`, predicates, redirect bodies, capability keys; the `if`/`else if` ordering and what inverting it costs; the `?? "member"` / `?? "pending"` defaults and the discarded error at `:49` |
| 2 | header injection `:120-139`, marked out of scope (CAP-05, phase 33, 46 files) |
| 3 | four door routes, all role-only, with the comment at `checkin/route.ts:110-130` |
| 4 | `NAV_ITEMS` — five entries, four flags each, filter order at `:101-128` |
| 5 | five guard-helper families, plus two sites belonging to none |
| 6 | the census, the coverage boundary, and one flagged divergence |
| 7 | the three inconsistencies, recorded and unresolved |
| Closing | how the artefact is used at the gate |

## Census results

| # | Command | Pre-registered | Observed |
|---|---|---|---|
| 1 | `grep -rl 'x-user-' src \| wc -l` | 46 | **46** |
| 2a | `grep -rn 'select("role"' src \| wc -l` | 21 | **17** — diverges |
| 2b | `grep -rn 'select("role' src \| wc -l` | 21 | **21** |
| 3 | `grep -rl 'getServiceClient' src \| wc -l` | 29 | **29** |
| 4 | `grep -rn 'redirect("/dashboard")' src \| wc -l` | 32 | **32** |

**Flagged, as the acceptance criteria require.** The plan's command 2 carries a closing
quote and returns **17**, not the pre-registered 21. The un-terminated form returns 21.
The gap is exactly the four `select("role, status")` sites, which are enumerated by
name in the register. **The code did not change; the plan mis-transcribed the command.**
B4 records both, and designates 2b as the gate command because it is the form the
pre-registration was made against.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical coverage] A seventh permission surface, in no upstream document**

- **Found during:** Task 2, while resolving the fourth `select("role, status")` site
  for the census.
- **Issue:** `validateMediaUpload` (`src/app/(public)/events/[slug]/actions.ts:14`) is a
  server-side guard that refuses an operation on role, status **and** an `attendance`
  row. It appears in neither `32-PATTERNS.md` § *B4* nor `32-02-PLAN.md`. B4's objective
  is "every server-side permission decision in application code"; omitting a live
  refusal would leave a surface the phase gate cannot compare.
- **Fix:** added to Section 5 with its three predicate lines (`:36`, `:40`, `:52`),
  both failure messages, and a note that staff bypass both the status and the
  attendance check.
- **Commit:** `ba58b54`

**2. [Rule 2 — Unproven completeness claim] The coverage boundary is now measured**

- **Found during:** Task 2, after finding surface 7 by accident rather than by method.
- **Issue:** the register's header claims to record "every" decision. Finding one by
  accident proved the enumeration method could not support that word. An artefact that
  overstates its own coverage is worse than one that states a limit, because the gate
  trusts it.
- **Fix:** added *The coverage boundary of this register, measured rather than
  asserted* to Section 6 — `178` role/status comparisons across `78` files, of which
  **21** are read line by line here; the rest are presentational and are named as such
  without claiming a seventy-ninth file holds no refusal. Both commands are recorded
  so the gate can re-run them: if 178 moves, something outside the register changed.
- **Commit:** `ba58b54`

### Corrections to upstream documents, recorded in B4 rather than applied

Neither was fixed in the upstream file — this is a constant-behaviour phase and both
are documentation, not behaviour. Both are recorded in B4 § 5 so the next reader does
not re-derive them:

1. **`32-PATTERNS.md:926` describes `verifyOrganizerAccess` as session-based.** It is
   not. It reads `x-user-role` / `x-user-id` from the headers
   (`guest-list/actions.ts:15-17`) and its ownership check uses `getServiceClient()`
   (`:24`), which bypasses RLS entirely. This matters for phase 33: it is a
   `requireMaster`-shaped guard, not a `verifyOrganizer`-shaped one.
2. **`32-02-PLAN.md` cites `verifyAdminOrOrganizer` at `members/actions.ts:71`.** The
   source says `:73`. `32-PATTERNS.md:929` had it right.

### Observation recorded, not acted on

`src/app/api/tickets/checkin/undo/route.ts:26` opens with *"Role **and** status, the
same guard the check-in route applies."* while `:53-56`, immediately below the
predicate, says *"Role decides the door; status does not."* — and the code checks role
only. The first line is stale prose. **Not corrected**: a diff on a door file inside a
constant-behaviour phase is exactly what B4 exists to detect, and correcting a comment
would put one there for no behavioural gain. Recorded in B4 § 3.

## The one finding the phase must not lose

The four door routes check **role alone**, deliberately, by owner decision recorded at
`src/app/api/tickets/checkin/route.ts:110-130`, and the hole that would have closed is
closed instead in `updateMemberRole`
(`src/app/(admin)/admin/members/actions.ts:129-134`), which sets `status = 'approved'`
in the same write that grants the organizer role.

**Consequence for the capability catalogue:** any capability that gates the door must
be `requires_approved = false`. Setting it `true` locks a pending organizer out of the
scanner — the failure mode `checkin-offline.md` names as the worse of the two errors,
because it happens in front of a queue at two in the morning.

## Verification

**No test runner exists for this product** (`CLAUDE.md` Guardrail 1), and this plan
changed no code, so `npm run build` has nothing to say about it. Verification is by
re-opening citations and re-running greps:

| Check | Result |
|---|---|
| `middleware.ts:82` / `:90` / `:99` / `:108` cited, each with the source predicate | pass — all four re-opened and quoted character-for-character |
| `middleware.ts:120` header block cited and marked out of scope | pass |
| `checkin/route.ts` cited (3 occurrences) | pass |
| `roles.ts:36` and `roles.ts:64-72` cited | pass |
| `is_admin_or_organizer` and `requireApproved` present | pass |
| `file:line` / `.ts:` citations in file | 36 lines carry one |
| `grep -rnE '@[A-Za-z0-9._-]+\.[a-z]{2,}\|[0-9a-f]{8}-[0-9a-f]{4}'` | **returns nothing** — no email, no uuid, no project reference |
| `min_lines: 120` | 495 |
| Section 7 holds exactly three entries, two citations each | pass |

**Citations corrected during verification:** `artist_profiles.sql:28-53` was overshooting
the policy block by two lines and is now `:28-51`, confirmed by reading `:50-56`.

## Threat Flags

None. This plan wrote one markdown file, installed nothing and changed no code path.
T-32-02-01 (information disclosure into a public repository) is mitigated and asserted:
the secrecy grep returns nothing, and the register names roles, files and line numbers
only.

## Self-Check: PASSED

- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-surfaces.md` — FOUND (495 lines)
- `9a5d7cf` — FOUND
- `ba58b54` — FOUND
