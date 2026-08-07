---
phase: 43
plan: 01
subsystem: access-gating
tags: [measurement, constraints, capability-model, uat]
requires: []
provides:
  - "the violating-row count that decides VALIDATED vs NOT VALID in plan 43-06"
  - "the two live role CHECK constraint names plan 43-04 drops and re-adds"
  - "the observed SQLSTATE that plans 43-06, 43-09 and 43-14 branch on"
  - "the generateLink redirectTo answer plan 43-11 aims the invitation with"
  - "M-12 closed with a verdict and a date, while the state was still representable"
affects:
  - ".planning/phases/32-capability-model-in-the-database/32-HUMAN-UAT.md"
tech-stack:
  added: []
  patterns:
    - "phase-32 container reused as a persona oracle, not only as an RLS baseline target"
    - "read-only Management API queries via the repository's own loadEnvironment + createManagementApiTarget"
key-files:
  created:
    - ".planning/phases/43-role-model-account-creation/43-MEASUREMENTS.md"
  modified:
    - ".planning/phases/32-capability-model-in-the-database/32-HUMAN-UAT.md"
decisions:
  - "M-12 measured on the phase-32 container instead of production (orchestrator deviation)"
  - "A1 probe aimed at a member/pending throwaway account, never organizer, created and deleted in one script run"
  - "plan 43-06 adds the role => approved constraint VALIDATED: production holds zero violating rows"
metrics:
  duration: ~50 min
  completed: 2026-08-08
---

# Phase 43 Plan 01: Measurements Before the DDL — Summary

Six facts the rest of phase 43 is written against, measured rather than assumed
— plus one finding nobody was looking for: a refused write on `public.profiles`
returns the entire failing row, membership code included.

## Deviation from Plan — decided by the orchestrator, NOT approved by the user

**This must not be read as user sign-off.** The owner cannot perform production
database operations and delegated the choice of approach. There is no human
"approved" on M-12 as the plan wrote it; there is this deviation, decided by the
orchestrator, and it is recorded here as one.

### What changed, and why

The plan's task 1 required creating an account in production, writing
`role = 'organizer', status = 'pending'` onto it, signing in as it, and opening
`/admin/scanner`. The reason M-12 asked for that is that **the persona does not
exist in production** — `scripts/rls-baseline-container.mjs:5-12` records that
production holds one `master/approved` and three `member/approved` row, no
organizer and no non-approved row at all. The check would have had to create the
very state it was testing.

Phase 32 already built the instrument for that gap: `postgres:17.6`, the base
schema plus all migrations, nine seeded personas including `organizer/pending`,
and — verified in the file's own header — **no environment variable read at all**,
so it cannot reach a real database.

The cost the deviation removes was verified, not assumed: the `handle_new_user`
trigger writes a `membership_code` onto **every** `public.profiles` row
regardless of role or status (`supabase/migrations/20260224_rbac_migration.sql:81`),
and `src/app/api/membership/list/route.ts:52-54` selects the door roster with
**no role filter and no status filter** — only `membership_code is not null`.
Every throwaway account is therefore a door credential for as long as it lives.

### What this buys, and what it costs

**Threats eliminated rather than mitigated:**

| Threat | Plan's disposition | Actual outcome |
|---|---|---|
| T-43-01-01 — a production `organizer` account exists between task 1 and task 3 | mitigate (delete it promptly) | **eliminated** — no `organizer` row was ever created in production |
| T-43-01-03 — the A1 probe writes `status = 'bogus'` onto a live profile row | mitigate (aim at the throwaway, re-read after) | **eliminated** — the probe targeted an account created and deleted inside one script run; it never touched a member's row |

The container also gives something production never could: **repeatability**.
The same probe can be re-run after plan 43-06 to demonstrate that
`organizer/pending` has become unrepresentable — which is precisely the evidence
D-06 will need the day someone proposes deleting `door.operate`'s
`requires_approved = false` as redundant.

**The residue, stated plainly.** A1 could not move to the container: the question
is what **PostgREST** does to a Postgres error, and the container is Postgres
alone. So one throwaway account did exist in production, at `member` / `pending`
— the default state of every sign-up, never a privileged role — for the seconds
between its creation and its deletion inside a single script run. While it lived
it held a `membership_code`. That window is reduced, not closed, and it is the
honest cost of answering A1 at all.

**The other limit — M-12's browser leg was not executed.** The container proves
capability resolution in SQL. It does not prove that `/admin/scanner` renders.
That second leg is decided by `src/lib/supabase/middleware.ts:170-186`, where
`/admin/scanner` is tested before the general `/admin` branch under a code
comment declaring the ordering load-bearing. **That leg is deduced from the code,
not observed**, and it is written as such in `32-HUMAN-UAT.md`. Closing it needs
a real sign-in as a never-approved organizer, which is not executable without
creating that row in production.

## Task-by-Task

### Task 1 — M-12, on the container (commit `b586d8a`)

Impersonating the seeded `organizer` / `pending` persona through
`public.my_access_context()` — the same SECURITY DEFINER function the middleware
calls at `src/lib/supabase/middleware.ts:88` — returned:

```
capabilities = [door.operate, organizer.access, staff.manage]
```

**Verdict: PASS on capability resolution.** `door.operate` resolves TRUE for an
organizer whose access was never approved.

The control that makes this measurement able to fail: `member/approved` resolved
`door.operate = false` in the same run. Had it resolved true, the impersonation
would not have been taking effect and the subject's TRUE would have meant
nothing.

**Incidental confirmation of a phase decision.** That same persona also resolves
`staff.manage` — exactly the hazard D-19 names when it forbids gating the
attribution register on `staff.manage`. D-19 was reasoning from the grant table;
this is the observable consequence.

### Tasks 2 and 3 — the six measurements (commit `d6e35f9`)

Both tasks write one artefact, so they share one commit — a small departure from
one-commit-per-task, recorded here rather than left to be noticed in the log.

| # | Measured | Result | What it decides |
|---|---|---|---|
| 1 | rows violating `role ⇒ approved` | **zero** (4 profiles, 4 approved, 1 staff-role) | 43-06 adds the constraint **VALIDATED**; no per-row decision owed |
| 2 | live CHECK constraints | 4, all `convalidated` | 43-04 drops/re-adds `profiles_role_check` and `role_capabilities_role_check` **by these names** |
| 3 | grant rows | 16, both `door.operate` rows `requires_approved = false` | D-06's two rows are on record; a later flip is now visible |
| 4 | owner of `public.profiles` | `postgres` | the trigger alternative is materially weaker — the **CHECK route stands** |
| 5 | CHECK violation at the JS client | `error.code = 23514` | 43-06/09/14 branch on the **code**, never a parsed message |
| 6 | `generateLink` + `options.redirectTo` | accepted for `type: 'recovery'` | 43-11 can aim the invitation at 43-04's surface |

## Findings the plan did not anticipate

**1. `error.details` publishes the whole row — the most consequential result here.**
A CHECK violation on `public.profiles` returns
`details: "Failing row contains (<uuid>, <address>, <full_name>, <membership_code>, …)"`
— every column, including the **membership code**, which the roster route shows
is the door's only credential. Any handler that logs `JSON.stringify(error)` or
returns `error.details` publishes a door credential and a member's address. This
is why *branch on the code* is not merely a robustness preference: `code` is the
only field of that object safe to propagate; `message` carries the constraint
name (safe); `details` carries member data (never). It binds the constraint
43-06 adds, not only `profiles_status_check` — same table, same failure shape.

**2. A third constraint the research never named.** `profiles_approved_via_check`
admits only `referral | guest_list | admin_manual`. D-08 calls account creation
*"the act of approval"* — and **none of those three labels names it**. Whichever
plan builds the creation path either reuses `admin_manual` or widens the
constraint; it cannot leave the column unset. Recorded so it is not met as a
failing insert.

**3. `recovery` links cannot carry metadata.** Read from the installed 2.97.0
package rather than the web reference:
`GenerateRecoveryLinkParams.options` is `Pick<GenerateLinkOptions, 'redirectTo'>`
— `data` is excluded, unlike `signup`/`invite`/`magiclink`. Anything plan 43-11
needs to pass must ride in the URL or come from the database.

**4. The allow-list question has an observable answer.** `generateLink` merges
`options` into the request **body** (not a query string, unlike the client
flows), and `_generateLinkResponse` returns **`redirect_to`** in `properties`.
So 43-11 can compare the returned value against the requested one and detect a
missing allow-list entry — turning a silent misconfiguration into an assertion.
**The allow-list requirement itself was not verified and is recorded as an
assumption, not a measurement.**

## Verification

- **No test runner exists for this product** (`CLAUDE.md` Guardrail 1). Nothing
  here is claimed verified because tests pass; every line is a query result, a
  package declaration, or a cited file.
- No source file was modified, so `npm run build` has nothing to gate — this
  plan produces two planning artefacts only.
- Automated checks from the plan, all passing: M-12 no longer `[pending]`;
  both constraint names present (3 occurrences); `23514` present; `redirectTo`
  present; **zero** address-shaped strings and **zero** uuid-shaped strings in
  either artefact; `git status --porcelain` clean of `.mjs`.
- Throwaway account deletion confirmed by `select count(*)` returning **0**,
  in the same run that created it.
- All three throwaway scripts lived in `/tmp`, never in the worktree, and were
  deleted. No script and no package was committed.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information-disclosure | `src/**` (any handler catching a Postgres error on `profiles`) | `error.details` returns the full row including `membership_code` and address; no existing handler was audited for this in this plan |

## Self-Check: PASSED

- `.planning/phases/43-role-model-account-creation/43-MEASUREMENTS.md` — FOUND
- `.planning/phases/32-capability-model-in-the-database/32-HUMAN-UAT.md` — FOUND
- commit `b586d8a` — FOUND
- commit `d6e35f9` — FOUND
