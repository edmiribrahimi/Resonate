---
phase: 31-live-defects-at-the-door-and-the-bar
plan: 02
subsystem: checkin-offline
tags: [door, contract, discriminated-union, time-zone, haptics, fix-04, fix-04a, fix-09]
dependency_graph:
  requires: []
  provides:
    - DoorOutcome
    - DOOR_HTTP
    - DoorSubject
    - DoorSubjectType
    - DoorNotValidReason
    - DoorFlag
    - DoorScanOutcomeKind
    - DoorScanCause
    - DoorScanSource
    - isDoorOutcome
    - partyEndInstant
    - vibrateAlreadyRecorded
  affects:
    - src/app/api/tickets/checkin/route.ts
    - src/lib/offline/sync-manager.ts
    - src/components/scanner
    - supabase/migrations (plan 31-04 CHECK constraints)
    - src/types/database.ts
tech_stack:
  added: []
  patterns:
    - discriminated-union-outcome-contract
    - as-const-satisfies-total-record
    - one-timezone-module-no-inlined-variants
key_files:
  created:
    - src/lib/door/outcome.ts
  modified:
    - src/utils/datetime.ts
    - src/utils/haptics.ts
  deleted: []
decisions:
  - "The discriminant field is named `outcome`, so a door_scan_events row and an HTTP response never need translating between each other"
  - "DOOR_HTTP is declared `as const satisfies Record<DoorScanOutcomeKind, number>` — adding, renaming or dropping a union member becomes a build error in the status map, not a silent divergence"
  - "isDoorOutcome uses Object.prototype.hasOwnProperty.call rather than the `in` operator, so a body carrying { outcome: \"toString\" } cannot resolve through the prototype chain"
  - "The crossing-midnight rule moved into one private nightBoundaryInstant helper shared by menuCloseInstant and partyEndInstant, rather than copying the body — the smaller change, and it makes the two closing times of a night one implementation"
  - "Object.hasOwn was rejected in favour of hasOwnProperty.call: it is ES2022 and iOS below 15.4 does not have it, and the door runs on staff phones"
metrics:
  duration: ~14m
  completed: "2026-08-05T21:48:43+02:00"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 31 Plan 02: The One Door Contract Summary

The door's three outcomes — `recorded`, `already_recorded`, `not_valid` — are now
named once, in `src/lib/door/outcome.ts`, as a discriminated union that the online
path, the offline path and the phase's migration all resolve against; plus
`partyEndInstant` and a third haptic pattern, the two utilities the third outcome
needs and nothing else owns.

## What Was Built

### Task 1 — `src/lib/door/outcome.ts` (new, 173 lines)

Ten exports, in the order the plan specified:

| Line | Export | What it is |
|---|---|---|
| `outcome.ts:44` | `export const DOOR_HTTP = {` | `recorded: 200`, `already_recorded: 409`, `not_valid: 422` |
| `outcome.ts:56` | `export type DoorSubjectType` | `"ticket" \| "guest_list_entry" \| "membership"` |
| `outcome.ts:65` | `export interface DoorSubject` | `{ type; id; label? }` |
| `outcome.ts:72` | `export type DoorNotValidReason` | four reasons |
| `outcome.ts:85` | `export type DoorFlag` | `"refunded_before_night" \| "not_in_cache"` |
| `outcome.ts:94` | `export type DoorOutcome` | the union, discriminant `outcome` |
| `outcome.ts:116` | `export type DoorScanOutcomeKind` | `DoorOutcome["outcome"]` |
| `outcome.ts:127` | `export type DoorScanCause` | the eight classification literals |
| `outcome.ts:138` | `export type DoorScanSource` | `"online" \| "offline_sync"` |
| `outcome.ts:165` | `export function isDoorOutcome` | narrow type guard |

The module imports nothing — not even `@/types/database`, which will import *from
here* in plan 31-04. That is what makes a divergence between the two paths a type
error rather than a disagreement nobody notices.

**FIX-04a, verified by line:** the `already_recorded` member is `outcome.ts:103-108`
— `outcome: "already_recorded"` (`:103`), `at: string` documented as *when the first
record was made, not the current read* (`:106`), and
`by: { operatorId: string; operatorLabel: string }` (`:108`). It carries no `cause`,
no `reason`, and no `already_by_you`. Grepped: the only non-comment `reason:` in the
file is `outcome.ts:112`, inside the `not_valid` member where it belongs; the string
`already_by_you` does not appear at all. The door states a fact; classification
happens afterwards, over `door_scan_events`.

**The two mandated comments are present:**
- `outcome.ts:17-21` — the SQL mirror. `DoorScanCause` and `DoorSubjectType` are
  duplicated as `CHECK` constraints in plan 31-04's migration; `next build` catches
  the TypeScript side, the `CHECK` catches the SQL side, and they agree only because
  they were written once here and copied.
- `outcome.ts:23-31` — FIX-04a, stated so the next editor reads it before removing
  the property it describes.

`already_by_you` and every same-operator shortcut were deliberately not carried over
from `checkin/route.ts:82-98`. Same-operator and different-operator both resolve to
`already_recorded`.

### Task 2 — the two utilities

**`src/utils/datetime.ts`** — `partyEndInstant(date, endTime)` at `datetime.ts:104`,
immediately after `partyStartInstant` (`datetime.ts:84`). Rather than copying
`menuCloseInstant`'s body, the shared crossing-midnight step became one private
helper, `nightBoundaryInstant` (`datetime.ts:73`), which both exported functions
delegate to. `menuCloseInstant`'s exported signature is byte-identical before and
after:

```
before: export function menuCloseInstant(date: string, closeTime: string): Date   (datetime.ts:74)
after:  export function menuCloseInstant(date: string, closeTime: string): Date   (datetime.ts:115)
```

Its behaviour is unchanged — the same arithmetic, relocated. The JSDoc on
`partyEndInstant` (`datetime.ts:89-103`) records why the function lives there:
commit `8f4e004` centralised these conversions to stop a six-variant drift, and a
variant inlined at a call site is the defect this module exists to prevent.

**`src/utils/haptics.ts`** — `vibrateAlreadyRecorded()` at `haptics.ts:36`, pattern
`[300, 80, 120]` (`haptics.ts:38`): long-then-short, distinguishable by feel from the
single `200` pulse of success (`haptics.ts:19`) and the `[100, 50, 100]` burst of
error (`haptics.ts:25`). The file's top comment (`haptics.ts:1-15`) now says why the
pattern matters and what it cannot do: the door is dark, and iOS degrades
`navigator.vibrate` to nothing, so the pattern is a second channel and never the only
one — each outcome needs its own colour *and* icon *and* pattern.

## How This Was Verified

**There is no test runner in this repository.** No `test` script in `package.json`,
no `*.test.*` or `*.spec.*` file anywhere. Nothing below is a test result, and no
claim here rests on one.

| Check | Command | Result |
|---|---|---|
| Typecheck (the only automatic gate) | `npm run build` | passes, after task 1 and again after task 2 |
| The contract string is real, not prose | `grep -vE '^\s*(//\|\*\|/\*)' src/lib/door/outcome.ts \| grep -c "already_recorded"` | `3` — the HTTP map (`:46`), the union member (`:103`), the guard's total record (`:149`). Threshold was ≥ 3 |
| No new template-literal date construction | `grep -c 'new Date(\`' src/utils/datetime.ts` | `0`, unchanged from before the edit |
| The two utilities exist | `grep -n "partyEndInstant" src/utils/datetime.ts` / `grep -n "vibrateAlreadyRecorded" src/utils/haptics.ts` | both found |
| The union carries no verdict | `grep -n "cause\|already_by_you" src/lib/door/outcome.ts` | only inside comments; no field |

**What is not verified, and cannot be here.** `partyEndInstant`'s crossing-midnight
behaviour across a DST boundary is *unchanged relocated code* — the same body that
has served `menuCloseInstant` since `8f4e004` — but it has not been executed against a
06:00 end time on the March or October changeover. Neither has the haptic pattern
been felt on a physical device. Both belong to the phase's manual verification, and
plan 31-13 owns the runbook step.

## Deviations from Plan

Three, all small, all inside Rule 2 (missing critical functionality) and Rule 3
(blocking issue). None changed a name in the contract.

**1. [Rule 2 — missing correctness guard] `DOOR_HTTP` is `as const satisfies Record<DoorScanOutcomeKind, number>`**
- **Found during:** Task 1
- **Issue:** the plan specified a plain `as const` map. Written that way, adding a
  fourth outcome to `DoorOutcome` — the exact edit FIX-04 exists to prevent — would
  leave `DOOR_HTTP` silently incomplete, and the omission would surface as an
  `undefined` status at runtime rather than a build error.
- **Fix:** `as const satisfies Record<DoorScanOutcomeKind, number>` (`outcome.ts:48`).
  `as const` still supplies the literal `200`/`409`/`422`; `satisfies` makes rename,
  addition and removal all build errors. This is the plan's own stated purpose —
  *"a divergence between the two paths becomes a type error at npm run build"* —
  applied to the map the plan happened not to cover.
- **Commit:** `40cb456`

**2. [Rule 2 — prototype-chain hole in the type guard] `isDoorOutcome` uses `hasOwnProperty.call`, and its literal set is a total `Record`**
- **Found during:** Task 1
- **Issue:** the plan's first-cut guard shape (`"outcome" in value`, then membership)
  had two problems. Deriving the set from `Object.keys(DOOR_HTTP)` would have left
  zero literal occurrences of `already_recorded` in the guard — the acceptance grep
  would have returned 2, not 3 — and a plain `in`-operator membership test resolves
  through the prototype chain, so a body of `{ outcome: "toString" }` would have been
  accepted as a valid door outcome by a guard whose entire job is telling a contract
  response from an `{ error }` body.
- **Fix:** `DOOR_OUTCOME_KINDS` is a `Record<DoorScanOutcomeKind, true>` with the
  three literals written out (`outcome.ts:147-151`), so the compiler rejects a rename,
  an addition and a removal; membership is tested with
  `Object.prototype.hasOwnProperty.call` (`outcome.ts:170`).
- **Note:** `Object.hasOwn` was the shorter spelling and was rejected — it is ES2022,
  absent below iOS 15.4, and this code runs on a staff phone at a door. That is the
  same reasoning `haptics.ts` applies to `navigator.vibrate`.
- **Commit:** `40cb456`

**3. [Rule 3 — the smaller change the plan asked for] the crossing-midnight rule was extracted, not duplicated**
- **Found during:** Task 2
- **Issue:** the plan left the choice open — *"extract the shared step into one
  private helper used by both ... if that is the smaller change"*. It is: the extracted
  helper is 9 lines and removes 8 from `menuCloseInstant`, against a copy that would
  have added 8 and created a second implementation of the rule this module was
  centralised to have only one of.
- **Fix:** `nightBoundaryInstant` (`datetime.ts:73`), private; both exported functions
  delegate. `menuCloseInstant`'s signature and behaviour untouched, as required.
- **Commit:** `914d29a`

## Cross-Domain Impact Checked

- **Check-in & Offline** (primary): the union's offline reachability was checked
  against RESEARCH § Answer B. `not_valid` is only locally reachable for a string that
  is not shaped like one of our codes or for a scan with no party selected — the HMAC
  secret stays server-side — which is exactly the four members of
  `DoorNotValidReason`. `not_in_cache` is a `DoorFlag`, not an outcome, which is what
  preserves the door's asymmetry: admit and flag, never refuse.
- **Time & Scheduling:** no `new Date(string)` was introduced. `partyEndInstant` goes
  through `zonedInstant`, i.e. `Europe/Rome` with the two-pass DST resolution, never a
  fixed `+1`/`+2`.
- **Supabase & Data:** nothing was written to `src/types/database.ts` in this plan —
  correct, because no schema changed here. Plan 31-04 owns the migration and the
  matching interface *in the same commit* (`supabase-data.md`, gate *tipi allineati*),
  and it must copy `DoorScanCause` (8 literals), `DoorSubjectType` (3) and
  `DoorScanOutcomeKind` (3) from this file rather than retyping them.
- **Zero silent failures:** this plan adds no error path and no `catch`. It adds the
  vocabulary that later plans need in order for a door failure to be distinguishable
  at all — today `res.ok` is true for all six outcomes, which is the silent failure
  the phase exists to end.

## What The Next Plans Must Not Do

Recorded here because the contract is imported by nine other plans and a wrong string
propagates silently:

1. Do not add a fourth outcome. An undo is a flagged record, not a state.
2. Do not add a `cause` to `DoorOutcome`. That breaks FIX-04a, and `outcome.ts:23-31`
   is the only place that will say so.
3. Do not reintroduce `already_by_you` or any same-operator shortcut.
4. Plan 31-04's `CHECK` constraints must be copied from `outcome.ts:127-136`
   (`cause`), `:56` (`subject_type`) and `:116` (`outcome`) — not retyped from memory
   and not from the RESEARCH document, which is where they were drafted, not where
   they now live.
5. Do not make `DoorSubject.label` required. The identifiers-only technical view
   (FIX-12) depends on being able to serialise a subject without a display name.

## Known Stubs

None. Both files are complete for what this plan owns; the consumers that will import
them belong to later plans in the phase, by design (`depends_on: []`, wave 1).

## Threat Flags

None. This plan introduces no network endpoint, no auth path, no file access and no
schema change. `T-31-02-SC` (npm installs) holds: nothing was installed.

Threat register dispositions, checked against what shipped:

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-31-02-01 | mitigate | `by` and `at` are required fields of the `already_recorded` member (`outcome.ts:106,108`) — a producer that omits either fails `next build` |
| T-31-02-02 | mitigate | no `cause` on the union; the requirement is stated at `outcome.ts:23-31` |
| T-31-02-03 | mitigate | `partyEndInstant` (`datetime.ts:104`) is a server-side utility over the declared Turin wall clock; nothing in this plan reads a device clock |
| T-31-02-04 | mitigate | `label` is optional (`outcome.ts:68`) |

## Self-Check: PASSED

- `src/lib/door/outcome.ts` — FOUND
- `src/utils/datetime.ts` — FOUND, contains `partyEndInstant`
- `src/utils/haptics.ts` — FOUND, contains `vibrateAlreadyRecorded`
- commit `40cb456` — FOUND in `git log`
- commit `914d29a` — FOUND in `git log`
- `npm run build` — passes
