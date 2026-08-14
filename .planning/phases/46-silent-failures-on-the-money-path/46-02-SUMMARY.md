---
phase: 46-silent-failures-on-the-money-path
plan: 02
subsystem: payments
tags: [typescript, error-handling, refusal-categories, postgrest, localstorage, observability]

# Dependency graph
requires:
  - phase: 41-door-and-scanner
    provides: "`src/lib/door/outcome.ts` — the constants → union-from-`typeof` → total `Record` construction this module generalises"
  - phase: 35-media
    provides: "`src/app/api/media/finalize/route.ts` — the `as const satisfies Record<…, number>` form and the *could-not-answer* status"
  - phase: 43-nights-and-series
    provides: "`admin/events/actions.ts:284-285, 372-387` — `WriteError` and `logNightRefusal`, the safe log line this module generalises"
provides:
  - "`src/lib/failure/money-path.ts` — the construction contract every refusal in this phase is built from"
  - "`SafeError` — a database error narrowed to `code` and `message`, with `details` unrepresentable by type"
  - "`logMoneyPathFailure(scope, error)` — one safe log line, usable from more than one file"
  - "`ReadResult<T, R>` — the discriminated result that separates *you have none* from *we could not read*"
  - "A written statement that each surface keeps its OWN union, so no later plan builds a god-union"
  - "The accidental fallback in `GuestDrinkMenu.tsx` recorded as deliberate at its own site"
affects: [46-03, 46-04, 46-05, 46-06, 46-07, seat-reservation-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Refusal categories: constants → union from `typeof` → total `Record` over the union"
    - "`SafeError` as a structural guard: a whole PostgREST error cannot be logged because it cannot be passed"
    - "`ReadResult<T, R>` for reads whose empty answer is also a legitimate answer"

key-files:
  created:
    - src/lib/failure/money-path.ts
  modified:
    - src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx

key-decisions:
  - "The module carries the CONSTRUCTION, not a vocabulary — each surface declares its own union and its own total `Record`, stated in the docblock so a later reader does not merge a bar-screen category and a cron-report category"
  - "`SafeError` has no `details` field: the log hazard is removed by type, not by convention"
  - "The totality property was proven by asserted mutation on a throwaway probe implementing the documented construction, rather than by mutating an existing in-tree instance outside this plan's perimeter"
  - "`GuestDrinkMenu.tsx`'s empty `.catch` is left untouched with its out-of-perimeter reason written beside it (D-46-11), rather than repaired or silently ignored"

patterns-established:
  - "Prova per mutazione on a construction claim: implement the documented construction in a probe, confirm the mutation applied by grep BEFORE reading the build, then delete the probe"
  - "A comment-only change is proven comment-only mechanically: `git diff --numstat` shows 0 deletions and every added line matches a comment predicate"

requirements-completed: [OBS-03, OBS-04]

# Metrics
duration: 12min
completed: 2026-08-14
---

# Phase 46 Plan 02: The One Refusal Shape Summary

**`src/lib/failure/money-path.ts` states the construction — constants, a union from `typeof`, a total `Record` — plus a `SafeError` whose missing `details` field makes leaking a `membership_code` into a log unrepresentable, and a `ReadResult` that stops a failed read rendering as an empty list; `GuestDrinkMenu.tsx` gains two comments and no behaviour change.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-14T21:32:00+02:00
- **Completed:** 2026-08-14T21:40:21+02:00
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 commented)

## Accomplishments

- **One construction, written once.** Four plans in this phase are about to declare refusal categories at the same time. The module states the shape they all build from and points at the two in-tree instances — `outcome.ts:278-302` and `finalize/route.ts:236-254` — so a fourth author generalises rather than reinvents.
- **The log hazard is now a type error, not a rule to remember.** `logMoneyPathFailure`'s parameter is `SafeError | null`, and `SafeError` declares only `code` and `message`. On a CHECK violation PostgREST returns the whole rejected row in `error.details`, `membership_code` included, and a membership code is the door credential. This phase opens several files that would otherwise have become the twenty-first `console.error(…, error)` site.
- **The god-union is pre-empted in prose.** The docblock says each surface keeps its own union, and says why: a bar screen and a cron report have different readers, different remedies and different lifetimes, and merging them produces a `Record` two thirds of which is unreachable padding — which is how a totality check stops meaning anything.
- **The accidental mercy is now deliberate.** `localStorage.removeItem(key)` sits inside the `.then`, so a failed claim leaves a paid guest a route back to their drinks. That was luck; it is now recorded at its own site, with the wording from `deferred-items.md` quoted rather than paraphrased.

## Task Commits

1. **Task 1: The one refusal shape, stated once** — `f2f0c82` (feat)
2. **Task 2: Comment the accidental mercy, and the duplicate that will hide a divergence** — `2b4612f` (docs)

## Files Created/Modified

- `src/lib/failure/money-path.ts` — **created.** Exactly three exports: `SafeError`, `logMoneyPathFailure`, `ReadResult`. Imports nothing at all, so it stays usable from a Server Action, a Server Component, a route handler and a client component.
- `src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx` — **comments only.** 42 lines added, 0 removed.

### The exact export list

```
export type SafeError = {
export function logMoneyPathFailure(scope: string, error: SafeError | null): void {
export type ReadResult<T, R extends string> =
```

`LC_ALL=C /usr/bin/grep -c '^export ' src/lib/failure/money-path.ts` → **3**.

## Verification Evidence

There is no test runner for the product (`meta-gates.md`). Nothing below is a test claim.

| Claim | Command | Result |
|---|---|---|
| Exactly three exports | `grep -c '^export ' src/lib/failure/money-path.ts` | `3` |
| `SafeError` declares no `details` | `grep -A4 'type SafeError' …` | shows `code`, `message`, `};` only |
| The four sources are cited | `grep -c 'outcome.ts\|finalize/route.ts\|capabilities/server.ts\|postgrest-details-leaks-the-row'` | `7` (≥ 4 required) |
| No React, no Next, no imports at all | `grep -c 'from "react"\|from "next'` / `grep -c '^import '` | `0` / `0` |
| The mercy is present verbatim | `grep -c '\.then(() => localStorage\.removeItem(key))' GuestDrinkMenu.tsx` | `1` |
| The empty catch is left, deliberately | `grep -c '\.catch(() => {})' GuestDrinkMenu.tsx` | `1` |
| Zero deletions in `GuestDrinkMenu.tsx` | `git diff --numstat -- GuestDrinkMenu.tsx` | `42  0` |
| Every added line is a comment | `git diff -U0 \| grep '^\+' \| grep -v '^\+\+\+' \| grep -cvE '^\+\s*(//\|/\*\|\*\|\*/)'` | `0` |
| No migration touched | `git diff --stat 9b6549b -- supabase/migrations/` | empty |
| No webhook touched | `git diff --stat 9b6549b -- src/app/api/webhooks/` | empty |
| No package installed | `git diff --stat 9b6549b -- package.json package-lock.json` | empty |
| Typecheck / build | `npm run build` | exit `0` |
| Dialog gate | `node scripts/verify-dialogs.mjs` | unchanged from pre-edit baseline |
| Conversion gate | `node scripts/verify-conversion.mjs` | unchanged from pre-edit baseline |
| Comment-stripper gate | `node scripts/verify-comment-stripper.mjs` | unchanged from pre-edit baseline |

`npm run verify` was **never run** — `scripts/rls-baseline.mjs:205-215` reaches the Supabase Management API against production. The three gates above were invoked individually, and a baseline was captured **before** the edit so "green" means *unchanged*, not merely *green*.

### The asserted mutation, and how it was kept honest

The claim the module makes is that the documented construction turns a missing sentence into a build error. The claim was proven, not asserted:

1. **Control.** A probe implementing the construction exactly — two constants, a union from `typeof`, a total `Record<ProbeRefusal, string>` — was created at `src/lib/failure/totality-probe.ts`. `npm run build` → **green**.
2. **Mutation.** A third constant `PROBE_MUTATION` was added to the union, **without** its `Record` entry.
3. **The mutation was confirmed applied before its result was read** (`ai-engineering.md`, gate *prova per mutazione*): `grep -c 'typeof PROBE_MUTATION'` → `1`, `grep -c 'PROBE_MUTATION\]'` → `0`. A substitution that silently fails to apply produces a false green in one direction and a false red in the other; this repository has already been bitten by that once.
4. **Result.** `npm run build` → **failed**, at `totality-probe.ts:15:14`:

   ```
   Type error: Property 'probe_mutation' is missing in type
   '{ probe_refused: string; probe_unresolved: string; }'
   but required in type 'Record<ProbeRefusal, string>'.
   ```

5. **Revert.** The probe was deleted. `ls src/lib/failure/` → `money-path.ts` only. `npm run build` → **green**. The probe is in no commit.

The probe was used instead of mutating `outcome.ts`'s `DOOR_NIGHT_ERROR` on purpose: mutating a live door file is outside this plan's `files_modified`, and a mutation of a file another wave may hold is a conflict waiting to happen. The probe implements the same construction, so it proves the same property.

## Decisions Made

- **The proof runs on a probe, not on a live instance.** Stated above. Same construction, same property, no file outside the plan's perimeter opened.
- **`ReadResult` takes the refusal union as a type parameter.** The alternative — a fixed `reason: string` — would have re-admitted exactly the untyped vocabulary this module exists to prevent, and a fixed enum here would have been the god-union under another name.
- **The docblock spends its length on *where the union lives*, not on the syntax.** The syntax is copyable from two files; the boundary is the thing nobody can recover from reading code, and it is the thing four parallel authors will get wrong.

## Deviations from Plan

None — plan executed exactly as written. Both tasks landed with their acceptance criteria met on the first pass, and no bug, missing critical functionality or blocking issue was encountered in the perimeter.

**One environment step, recorded because it is not in the plan and the next worktree agent will hit it:** this worktree had no `node_modules`, so `npm run build` could not run. It was resolved by symlinking the main checkout's `node_modules` (`/node_modules` is in `.gitignore`, so nothing entered any commit) rather than by running a package-manager install. No package was installed, added, or resolved from the registry — `package.json` and `package-lock.json` are byte-identical to the plan's base commit, asserted above.

## Issues Encountered

None. The baseline build was run **before** any edit, so the two greens that follow are attributable.

## Known Stubs

None. Both artifacts are complete against their acceptance criteria. `money-path.ts` intentionally exports no categories — that is the contract, not a stub, and the docblock says so.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change at a trust boundary. The two threats this plan owns were mitigated as planned:

| Threat | Disposition | Evidence |
|---|---|---|
| T-46-04 — a whole PostgREST error reaching a log | mitigated | `logMoneyPathFailure`'s parameter is `SafeError`, which declares `code` and `message` and nothing else; `details` is absent from the type by construction |
| T-46-05 — the paid guest's fallback deleted by a tidy-up | mitigated | comment-only diff, `0` deletions, `0` non-comment added lines, mercy present verbatim |
| T-46-06 — the two `storeGuestOrder` copies diverging | mitigated | the duplicate is commented with a pointer to plan 46-05, which inherits the obligation to state what it did to the twin |
| T-46-SC — package installs | accepted, not exercised | `git diff --stat` on `package.json` and `package-lock.json` empty |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for wave 2.** Plans 46-03 … 46-07 import from `src/lib/failure/money-path.ts` and each declares **its own** union and **its own** total `Record` in its own file. Three things they inherit:

1. **The construction is proven, not assumed.** Section above. A plan that writes a bare string union with a `switch` has left the pattern, and no build will tell it so — that is precisely what the `Record` buys, and only if it is used.
2. **`logMoneyPathFailure` is the only log line on this path.** A `console.error(…, error)` added anywhere in this phase is a regression against T-46-04, and the type will not stop it if the author reaches for `console.error` directly.
3. **Plan 46-05 owes a statement about the twin.** It changes `GuestTokenDisplay.tsx`'s `storeGuestOrder` to return a tagged result. The copy in `GuestDrinkMenu.tsx` stays `void`, and the comment committed here says so — 46-05's summary must record what it did about the divergence rather than leave the comment describing a state that no longer holds.

**One thing this plan does not deliver, said out loud:** a construction and a log line are not an observable effect. The project has no error tracking, so every later plan still owes the person affected something they can see. This module makes the *shape* right; it does not make any failure visible on its own.

## Self-Check: PASSED

- `src/lib/failure/money-path.ts` — FOUND
- `.planning/phases/46-silent-failures-on-the-money-path/46-02-SUMMARY.md` — FOUND
- `src/lib/failure/totality-probe.ts` — ABSENT, as required; `git log -S 'totality-probe'` returns nothing, so it entered no commit
- Commit `f2f0c82` — FOUND
- Commit `2b4612f` — FOUND
- `STATE.md` and `ROADMAP.md` — not modified by this agent (orchestrator owns those writes)

---
*Phase: 46-silent-failures-on-the-money-path*
*Completed: 2026-08-14*
