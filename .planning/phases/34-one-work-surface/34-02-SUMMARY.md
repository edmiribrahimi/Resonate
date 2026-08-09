---
phase: 34-one-work-surface
plan: 02
subsystem: testing
tags: [baseline, rls, capabilities, postgres, container, verification]

# Dependency graph
requires:
  - phase: 32-capability-model-in-the-database
    provides: "scripts/rls-baseline-container.mjs, rls-baseline-compare.mjs and the baseline/ artefact directory"
  - phase: 43-role-model-account-creation
    provides: "verify-capabilities side 5 (the grant rows), and the twelve-key catalogue this run measured"
provides:
  - "The pre-34 container baseline: B1 policies, B2 reads, B3 writes, captured before any line of Phase 34"
  - "The pre-phase output of `npm run verify:capabilities`, recorded verbatim with its date"
  - "The pre-phase page census: 21 under (admin), 15 under (organizer) — STAFF-01's before"
  - "A written record that M-9 (before) was NOT run, and what that costs plan 34-03"
affects: [34-03, 34-16, 34-17, 34-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A captured artefact is never overwritten: --overwrite was available and deliberately not used"
    - "A measurement that did not happen is recorded as not happening, never substituted with a green"

key-files:
  created:
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.pre-34.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.pre-34.json"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.pre-34.json"
  modified: []

key-decisions:
  - "The container target was used, never baseline:rls — it reads no environment variable and starts its own throwaway postgres"
  - "No --overwrite: no pre-34 artefact existed, and had one existed the task would have stopped rather than replace it"
  - "M-9 (before) deferred by owner decision of 2026-08-09 — recorded as human_needed, with its cost stated, not marked done"
  - "npm run build was run as an extra pre-phase datum, though the plan did not ask for it: the tree compiles green before the phase"

patterns-established:
  - "Pattern: the SUMMARY states what the instrument CANNOT see, in the same breath as its green"

requirements-completed: []

# Metrics
duration: 18min
completed: 2026-08-09
---

# Phase 34 Plan 02: The observations that expire — Summary

**The pre-34 row-level baseline is captured (72 policies, 322 read cells, 966 write probes on a throwaway postgres:17.6), `verify:capabilities` is recorded 5/5 green with zero warnings, and M-9 (before) is recorded as NOT run — a baseline observation deferred past its own window is destroyed, not postponed.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-08-09T20:28Z (approx.)
- **Completed:** 2026-08-09T20:46:35Z
- **Tasks:** 1 of 2 executed; 1 deferred by owner decision
- **Product files modified:** 0

## Task Commits

1. **Task 1: pre-34 container baseline + the CAP-02 chain's first link** — `2d717c3` (test)
2. **Task 2: M-9 (before), the door with the network off** — **no commit: not executed.** See *The measurement that was not taken*.

## Task 1 — what was captured, and where it lives

### The baseline artefacts

Command run, exactly as the plan specifies, with the **container** target and **without** `--overwrite`:

```
npm run baseline:container -- --phase-point=pre-34
```

No `pre-34` artefact existed beforehand, so no collision occurred and nothing was replaced.

**Artefact directory — this is what plan 34-17 needs as `--before-dir`:**

```
/Users/etiesse/Resonate/.planning/phases/32-capability-model-in-the-database/baseline/
```

Repository-relative: `.planning/phases/32-capability-model-in-the-database/baseline/`

| Capture | File | Content |
|---|---|---|
| B1 | `32-BASELINE-policies.container.pre-34.json` | 72 rows, postgres 17.6, 23 RLS-enabled tables |
| B2 | `32-BASELINE-reads.container.pre-34.json` | 322 rows, 14/14 personas resolved, 23 tables, **0 vacuous cells** |
| B3 | `32-BASELINE-writes.container.pre-34.json` | 966 rows, 966 probes, 249 refusals, 692 successes, 25 inconclusive, 1/1 constraint probes refused as declared |

The comparison in plan 34-17 is therefore:

```
npm run baseline:compare -- --only=B1,B2,B3 --before-point=pre-34 --after-point=post-34
```

(`--before-dir` defaults to that directory; `rls-baseline-compare.mjs:1031`.)

Seed report highlights, all from the container run, roles only: 23 tables seeded, 16 profiles, 12/12 role × status cells, 46 table/role grant pairs verified, 6/6 forbidden writes refused by `profiles_role_implies_approved`, and the third axis traversed — an account assigned to night 1 holds `door.operate` on night 1 and not on night 2; a revoked row withholds the grant on its own while its window is still open. The container was destroyed, including its ephemeral password, which was written nowhere.

### `npm run verify:capabilities` — full output, 2026-08-09

```
> resonate@0.1.0 verify:capabilities
> node scripts/verify-capabilities.mjs


verify-capabilities — one capability set, five sides

  measured against: production (Management API, read_only)
      TS 12 · DB 12 · POLICY 7 (50 call sites in 72 policies) · SRC 12 (249 files walked) · GRANT 26 rows

  ✓ 0 · both declarations hold the pre-registered 12 keys
      12 in src/lib/capabilities/keys.ts, 12 in private.capabilities
  ✓ 1 · TS and DB name the same keys
      12 keys, both directions
  ✓ 2 · every key a policy asks for exists in the catalogue
      7 keys used by policies: catalogue.manage, door.operate, master.manage, membership.active, party.manage, register.read, staff.manage
  ✓ 3 · every key application code asks for exists in the catalogue
      12 keys used in src/: admin.access, catalogue.manage, door.operate, door.supervise, master.manage, media.upload, membership.active, membership.card.view, organizer.access, party.manage, register.read, staff.manage
  ✓ 4 · every catalogue key is asked for by a policy or by src/
      12 keys, all reached: 7 by policy, 12 by src/
  ✓ 5 · every role holds exactly the declared set of capabilities
      26 grants and 22 refusals over 4 roles × 12 keys, both directions, 26 rows read

  measures:
    by policy : catalogue.manage, door.operate, master.manage, membership.active, party.manage, register.read, staff.manage
    by src/   : admin.access, catalogue.manage, door.operate, door.supervise, master.manage, media.upload, membership.active, membership.card.view, organizer.access, party.manage, register.read, staff.manage
    named only in comments (not counted as callers): door.operate, master.manage, media.upload, staff.manage

  Note: this asserts that the four declarations name the same keys, AND that every role
  holds exactly the capabilities declared for it in ROLE_GRANTS, with the declared
  requires_approved — private.role_capabilities IS read here, since plan 43-02. It does
  NOT assert that any policy is correct: which subjects a predicate admits is measured
  by npm run baseline:rls, and no profile row is read by this script.

5/5 green, 0 warnings.
```

### The side-4 warning does not exist today — a correction plan 34-16 must carry

The plan asked for "side 4's warning verbatim". **There is no warning to transcribe: side 4 is green with zero orphan keys.** All twelve catalogue keys are asked for by a caller — 7 by a policy, 12 by `src/` — so the `problems` array at `scripts/verify-capabilities.mjs:1034` is empty and the warning text at `:1042-1048` never runs.

The latent text, quoted from source and clearly **not** observed output (`scripts/verify-capabilities.mjs:1044-1047`):

> "Phase 34's CAP-02 will fail the production build for a capability mapped to no route. This is that failure, arriving early and cheaply. It is a warning and not a failure because Phase 34 owns the decision, and because five of the twelve keys gate TABLES rather than routes."

`34-CONTEXT.md` records this as *"CAP-02's gate already exists as a warning"*. Measured today that is true of the **mechanism** and false of the **output**: the warning is armed and silent. Plan 34-16, whose job is to re-point that message at the new map, is re-pointing a branch that currently emits nothing — so it cannot confirm its edit by watching the message change, and needs its own mutation proof (add a thirteenth catalogue key with no caller, confirm the mutation applied, read the result, revert). Recorded here because 34-16 will otherwise discover it late.

### The other pre-phase numbers, recorded while they are still true

| Datum | Value | How |
|---|---|---|
| Pages under `src/app/(admin)` | **21** | `find "src/app/(admin)" -name page.tsx \| wc -l` |
| Pages under `src/app/(organizer)` | **15** | same, on `(organizer)` |
| `rm -rf .next && npm run build` | **green**, all `/organizer/*` routes present in the route table | run 2026-08-09 |

The build was not required by the plan. It was run anyway because "the tree compiled before the phase" is itself a before-observation, and because `34-VALIDATION.md` sets the sampling rate at one build per task commit.

### Acceptance criteria, checked

- ✅ A baseline artefact directory carrying `pre-34` exists; its absolute path is written above
- ✅ The full stdout of `npm run verify:capabilities` is above — with the honest note that side 4 emitted **no** warning
- ✅ `git status --porcelain -- src supabase scripts` is **empty**
- ✅ No migration applied; `private.role_capabilities` was **read** (side 5, 26 rows) and never edited

## The measurement that was not taken — M-9 (before)

**Status: `human_needed`. Not done, not dropped, and not passed.**

Task 2 is a `checkpoint:human-verify` gate: procedure M-9 (before), on a real door device, with the radio off. It was **not executed**. The project owner decided on 2026-08-09, reaffirming the decision of 2026-08-06, that every manual verification procedure of this milestone runs together at the end of v1.5 rather than during construction.

**What that costs, stated plainly rather than filed as a scheduling note.**

M-9 is the one procedure in `34-VALIDATION.md` whose window is not the milestone — it is **this wave**. `34-VALIDATION.md:92` says it in one line: *"Run it before and after the middleware plan, not once."* Plan 34-03 rewrites `src/lib/supabase/middleware.ts`, and from the moment that commit lands:

- it remains possible to observe **that the door works** — a person can still open `/admin/scanner`, cut the network and scan;
- it becomes impossible to observe **that it works the same as before**, because the only state the "before" could have been read from no longer exists.

So deferring M-9 past Wave 2 does not postpone it. It **destroys** it. The "after" run scheduled at the end of v1.5 will have nothing to compare against, and Pitfall 8 — *assuming the door is untouched because nobody edited it* — is precisely the trap that a before/after pair exists to catch: `/admin/scanner` keeps its address, but the code that judges the request is being rewritten underneath it.

**Consequence that `34-VERIFICATION.md` is required to carry, and must not soften:** for M-9 there is a post-phase observation and **no** baseline. It must be written as *"the door was observed working after the change; it was not observed before it, so no comparison was made"* — never as a before/after that implies a comparison happened.

The observations that were therefore never taken, and are unrecoverable for this phase: whether `/admin/scanner` rendered and a night could be selected; the scan outcome with the radio off and whether the entry queued; which bottom-navigation entries were present; the final URL and whether anything redirected.

**No pass is reported for any of them.**

## Files Created/Modified

- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.pre-34.json` — B1, the `pg_policies` dump
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.pre-34.json` — B2, the persona read matrix
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.pre-34.json` — B3, the persona write matrix
- `.planning/phases/34-one-work-surface/34-02-SUMMARY.md` — this file

No file under `src/`, `supabase/` or `scripts/` was created, modified or deleted.

## What the green does NOT prove — the sentence this plan exists to write

**A green `baseline:compare` at the end of Phase 34 will prove that no row-level permission moved, and nothing more.**

B1 dumps `pg_policies`. B2 and B3 are persona read/write matrices. B5 is the Supabase advisor. **None of them can see a route.** This phase edits no migration, so that green is very nearly guaranteed *before it is run* — which is exactly why it must not be allowed to stand in for evidence it cannot produce.

What Phase 34 actually changes is **who reaches which address**, and the instruments for that are two, neither of them a baseline: the route map's type-level assertions under `npm run build`, and a person signing in as each role and walking the addresses (M-1 … M-9). A phase that shipped with a green comparison and no role walk would have measured the half that did not move.

This paragraph is owed by `34-VERIFICATION.md` (plan 34-17) and is reproduced here so that it cannot be lost between the two.

## Decisions Made

- **The container, never production.** `npm run baseline:rls` writes, and refuses on production without `--i-know-this-writes`; the container script reads no environment variable and starts its own throwaway postgres. T-34-08 mitigated by construction.
- **No `--overwrite`, and none was needed.** T-34-09 mitigated: the flag was neither passed nor required, and had a `pre-34` artefact existed the task would have stopped and reported the collision.
- **A missing measurement is recorded as missing.** T-34-11: side 4's absent warning and the unexecuted M-9 are both written as what they are. Neither was rounded up to a green.
- **Roles only.** T-34-10: every persona above is a role — `master`, `organizer`, `staff`, `member` — and no person is named.

## Deviations from Plan

**1. [Rule 1 — measurement contradicts the plan's expectation] Side 4 emits no warning**
- **Found during:** Task 1
- **Issue:** The plan requires the SUMMARY to contain "side 4's warning verbatim". Side 4 is green with 0 orphan keys, so no warning text is produced.
- **Fix:** Recorded the measured output verbatim (5/5 green, 0 warnings), quoted the latent warning from source with its `file:line`, labelled it as source and not output, and flagged the consequence for plan 34-16.
- **Files modified:** none — this is a recording decision, not a code change.

**2. [Owner decision, not a deviation rule] Task 2 not executed**
- Deferred by the owner's decision of 2026-08-09, recorded above as `human_needed` with its cost. It is neither done nor dropped.

**Total deviations:** 1 recording correction + 1 owner-directed deferral. No scope creep, no product code touched.

## Issues Encountered

- The worktree carried neither `node_modules` nor `.env.local`. Both were supplied locally for the run and both are gitignored (`.gitignore:4`, `:34`); neither is committed, and no credential appears in this document. The scripts' own `registerSecret` redaction was left intact.

## Next Phase Readiness

- **Plan 34-17 has its `--before`**: `--before-point=pre-34` in `.planning/phases/32-capability-model-in-the-database/baseline/`.
- **Plan 34-16 has a warning:** the side-4 branch it re-points is currently silent, so its edit needs a mutation proof rather than a changed message.
- **Plan 34-03 is unblocked but poorer:** it may rewrite the middleware, and it must record in `34-VERIFICATION.md` that M-9 has an after with no before.
- **Open, owed before v1.5 closes:** M-1 … M-9. M-9's before is gone; the other eight still have their window.

## Self-Check: PASSED

Verified 2026-08-09, against the committed tree rather than against this document:

- `git ls-tree HEAD` lists all three `…container.pre-34.json` artefacts and `34-02-SUMMARY.md`
- `2d717c3` and `34718cd` both exist in `git log`
- `git status --porcelain` is empty; `git diff --diff-filter=D HEAD~1 HEAD` shows no deletion
- `STATE.md` and `ROADMAP.md` are untouched, as required of a worktree executor

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-09*
