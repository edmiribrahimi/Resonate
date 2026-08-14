---
phase: 46-silent-failures-on-the-money-path
plan: 04
subsystem: ticketing-payments
tags: [observability, server-action, refusal-union, staff-surface, money-adjacent]
requires:
  - "src/lib/failure/money-path.ts (plan 46-02) — logMoneyPathFailure, SafeError"
  - ".planning/phases/46-silent-failures-on-the-money-path/46-COPY.md §1 — the approved sentences"
provides:
  - "MenuCloseRefusal — the menu-closing surface's own refusal union, exported as a type"
  - "MenuCloseResult — success, plus an optional category and an optional resolved sentence"
  - "MenuCloseControl renders four distinguishable outcomes in an announced region"
affects:
  - "src/app/(public)/events/[slug]/menu/actions.ts — updateMenuClosesAt only; the other four exports untouched"
  - "src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx — MenuCloseControl only"
tech-stack:
  added: []
  patterns:
    - "S1 — refusal as a returned constant, rendered from a total Record (src/lib/door/outcome.ts:278-302)"
    - "the caller half — category into state, sentence second, announced region (EventForm.tsx:414, 619-630, 1316-1323)"
key-files:
  created: []
  modified:
    - "src/app/(public)/events/[slug]/menu/actions.ts"
    - "src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx"
decisions:
  - "The sentence map stays module-private, against the plan's exports manifest — probed, not assumed"
  - "setTime(\"\") moved into the success branch rather than compensated on the failure branch"
  - "A transport rejection is caught and given the approved no-category sentence, not a new one"
metrics:
  duration: "~25 min"
  tasks: 3
  files: 2
  completed: 2026-08-14
---

# Phase 46 Plan 04: The Organizer's Menu-Closing Command Summary

`updateMenuClosesAt` stopped throwing three messages that production redacts into one, and
`MenuCloseControl` — which caught nothing at all and therefore showed nothing at all — now
draws four distinguishable outcomes in an announced region, with the parent update and the
confirmation conditional on a save that actually happened.

## What was built

**Task 1 — the action returns its cause.** `7299908`

Three module-private constants, a union built from `typeof`, and a total
`Record<MenuCloseRefusal, string>` carrying the three approved sentences from `46-COPY.md`
§1 verbatim. The return type widened additively to `MenuCloseResult` — `success`, optional
`error`, optional `refusal` — the shape of `EventWriteResult`
(`admin/events/actions.ts:276-282`). The three `throw new Error(...)` became three returns.

The write failure calls `logMoneyPathFailure` with `{ code, message }` built by hand rather
than the PostgREST error object, so `details` cannot travel even structurally. The PostgREST
`code` is appended to the write-failure sentence in parentheses and nowhere else, the
precedent being `admin/events/actions.ts:368` — appended where the result is built, so the
strings inside the `Record` stay byte-identical to the approved list.

**Task 2 — the caller draws it.** `2ec500c`

`MenuCloseControl` gained `refusal` (`MenuCloseRefusal | null`) and `refusalSentence`
(`string | null`). Both handlers now read the returned result. The failure region sits
beside the existing `role="status"` confirmation, carries `role="alert"`, and exposes the
category as `data-refusal` so the manual procedure below can tell which cause rendered
without reading the words.

**Task 3 — the trip-wire was proved to exist.** (evidence below, no commit — the mutation
was reverted)

## The asserted-mutation proof

Recorded in full, because the plan's own contract is that the totality property *is* the
requirement and the mutation is its only proof — and because a mutation that silently did
not apply produces a false green, which is a mistake already on this project's record
(`ai-engineering.md`, gate *prova per mutazione*).

**1 · Mutated constant:** `MENU_CLOSE_MUTATION_PROBE = "menu_close_mutation_probe"`, added
to the constant list and to the union, with **no** entry added to `MENU_CLOSE_ERROR`.

**2 · Confirmed applied BEFORE the build was read:**

```
=== constant declaration:
71:const MENU_CLOSE_MUTATION_PROBE = "menu_close_mutation_probe";
=== union member:
78:  | typeof MENU_CLOSE_MUTATION_PROBE;
=== Record entry (must be absent):
0
```

**3 · `npm run build` failed, naming `MENU_CLOSE_ERROR`, verbatim:**

```
./src/app/(public)/events/[slug]/menu/actions.ts:89:7
Type error: Property 'menu_close_mutation_probe' is missing in type '{ menu_close_not_signed_in: string; menu_close_not_permitted: string; menu_close_write_failed: string; }' but required in type 'Record<MenuCloseRefusal, string>'.

  89 | const MENU_CLOSE_ERROR: Record<MenuCloseRefusal, string> = {
     |       ^
```

**4 · Reverted, and the revert proved by the strongest available check:**
`LC_ALL=C /usr/bin/grep -c 'MUTATION_PROBE\|mutation_probe'` → `0`, and
`git status --porcelain` on the file → **empty**, i.e. byte-identical to the committed
version. `npm run build` then exited `0`.

## Verification

| Check | Result |
|---|---|
| `grep 'export async function updateMenuClosesAt' -A 40 \| grep -c 'throw new Error'` | `0` |
| `grep -c 'Record<MenuCloseRefusal, string>'` in `actions.ts` | `1` |
| `grep -c 'CAP.STAFF_MANAGE'` in `actions.ts` | `2` — **one is prose** (`:137`, the new docblock line saying the predicate is unchanged); the code occurrence is exactly `1`, at `:159` |
| Gate above the write | `CAP.STAFF_MANAGE` at `:159`, `getServiceClient()` at `:167` — the gate is above, unchanged |
| `grep -c 'menu_closes_at: menuClosesAt \|\| null'` | `1` — the written payload is byte-identical |
| `MENU_CLOSE_ERROR` entries / union members | 3 / 3 |
| Each sentence verbatim in `46-COPY.md` | 3 of 3, `grep -c` → `1` each |
| `git diff -U0` hunk range in `actions.ts` | every hunk at or above old `:60`; the function ended at old `:62`, so the other four exports are untouched |
| `grep -c 'role="alert"'` in `PartyDrinkMenu.tsx` | `2` (one in the explaining comment, one in JSX) |
| `grep -c 'role="status"'` in `PartyDrinkMenu.tsx` | `4` — **unchanged from before the diff**, measured before editing |
| `grep -c 'useToast'` in `PartyDrinkMenu.tsx` | `0` |
| `grep -c 'updateMenuClosesAt(party.id'` | `2` — still two call sites, same two arguments |
| `onUpdate` / `setSaved` placement | `handleSave` `:212-213` and `handleClear` `:243-244`, both after the `if (!result.success) { … return; }` guard at `:205` / `:234` — success branch only |
| `setTime("")` in code | once, at `:242`, inside the success branch (the other two matches are comments) |
| Head docblock still claiming no failure is reported | `0` |
| `npm run build` | exits `0` |
| `npm run verify:dialogs` | exits `0` |
| `git diff --stat supabase/migrations/` | empty |
| `git diff --stat src/app/api/webhooks/` | empty |
| `git diff --stat package.json package-lock.json` | empty (T-46-SC: no package installed) |
| Files changed by this plan | exactly the two in `files_modified` |

`npm run verify` was **not** run — `scripts/rls-baseline.mjs` reaches the Supabase Management
API against production.

**No test claim is made.** This repository has no test runner for the product. What is
asserted above is: greps, one type error observed under an asserted mutation, a green build,
and the manual procedure below, which is **pending**.

## Manual procedure — `Result: pending`

The only evidence that would show these four outcomes reaching a person. Not run here: it
needs two accounts and an environment that is neither a worktree against `.env.local`
(D-41.2-04) nor production.

**Roles: two.** An account holding `staff.manage` for the event, and one that does not.
No person is named — `.planning/` is published.

**Environment.** The owner's own. Not this worktree, and not production.

**Steps.**

1. As the account that **may not**, open the party drink menu for a party and attempt to set
   a closing time.
2. As the account that **may**, attempt the same against an induced write failure (for
   example a value the row's constraints refuse, or the row absent).
3. As the account that **may**, with a stored closing time already set, press **Clear**
   against the same induced write failure.

**What must appear.**

- Two **different** sentences across steps 1 and 2 — not one shared wording. Step 1 must read
  *This account may not set the closing time for a night…*; step 2 must read *Saving the
  closing time failed…* followed by a database code in parentheses.
- Each sentence **beside the control that produced it**, inside the region carrying
  `role="alert"`, and therefore announced. `data-refusal` on that region names the category:
  `menu_close_not_permitted` in step 1, `menu_close_write_failed` in steps 2 and 3.
- In **none** of the three cases the word *Saved*.
- In step 3, the time field still showing **the value the database holds**, not an empty
  field.

**Result: pending.**

## Deviations from Plan

### 1. [Rule 3 — blocking issue, resolved by measurement] The sentence map is not exported

- **Found during:** Task 1.
- **Issue:** the plan's `must_haves.artifacts.exports` lists `MENU_CLOSE_ERROR`. This is a
  `"use server"` file, and Next's documented contract for one is async-function exports only,
  so the manifest and the platform appeared to be in conflict.
- **What was done:** the conflict was **probed rather than assumed**. `MENU_CLOSE_ERROR` was
  temporarily exported and `npm run build` run: it was **green**. So the build tolerates the
  export, and the assumption was wrong. The map was nonetheless left module-private, because
  nothing imports it — the caller receives the sentence already resolved in `result.error` —
  and an export nothing needs invites the next reader to pull it into the client component,
  which is the case the documented contract covers and the probe did not. This is also the
  shape of the analog the plan told me to copy: `admin/events/actions.ts` exports
  `NightRefusal` and `EventWriteResult` as types and keeps `nightRefusalSentence` private.
- **Effect on the acceptance criteria:** none. No criterion checks for the `export` keyword;
  `grep -c 'Record<MenuCloseRefusal, string>'` → `1` and the three-entry / three-member counts
  all hold.
- **A first draft of the docblock stated the export was forbidden.** The probe falsified it
  and the paragraph was rewritten to report the measurement instead. An unverified claim in a
  docblock is the `Gate hallucination` with an extra step, since the next reader inherits it
  without inheriting the responsibility for it.
- **Files modified:** `src/app/(public)/events/[slug]/menu/actions.ts`. **Commit:** `7299908`.

### 2. [Plan-sanctioned choice] `setTime("")` moved rather than compensated

- **Found during:** Task 2. The plan allowed either *stop calling `setTime("")` before the
  await* or *restore the stored value on the failure branch*, and asked which and why.
- **Chosen:** moved into the **success branch**. It satisfies both alternatives at once and
  is strictly the stronger: with a compensating restore there is still a window in which the
  field reads empty while the database is unchanged, and on a value that decides when a bar
  stops selling that window is exactly the divergence being removed. Removing the optimistic
  write means no lie is told at any instant, only a short delay before the field empties on
  the happy path — and the button is disabled while pending anyway.
- **Files modified:** `src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx`. **Commit:**
  `2ec500c`.

### 3. [Rule 2 — missing critical functionality] A transport rejection is caught

- **Found during:** Task 2.
- **Issue:** with the three named causes now returned, the only way the promise still rejects
  is a call that never completed. With no `catch`, an unhandled rejection inside
  `startTransition` renders nothing — the original silent failure, surviving in the one case
  the conversion did not cover.
- **Fix:** both handlers wrap the call and, on a rejection, set **no category** and the
  approved **no-category sentence**. No new copy was written: *the save was refused and no
  reason travelled back* is literally what a transport failure is, and its next step — check
  what the field says rather than retry — is the right one when the write's outcome is
  genuinely unknown. The three nameable causes stay apart, so D-46-10b is not weakened.
- **Files modified:** `src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx`. **Commit:**
  `2ec500c`.

## Threat mitigations, as built

| Threat ID | How it stands |
|---|---|
| T-46-11 (elevation) | `CAP.STAFF_MANAGE` is still the predicate, still exactly once in code (`:159`), still above `getServiceClient()` (`:167`). The action changed what it returns, not what it decides |
| T-46-12 (disclosure in copy) | the capability sentence names no other account, no capability key and no row content. The `code` in parentheses appears on the write-failure sentence only |
| T-46-13 (disclosure in the log) | `logMoneyPathFailure` is called with a hand-built `{ code, message }`, so `details` cannot travel even structurally |
| T-46-14 (integrity of a money-adjacent value) | `onUpdate` and `setSaved` are inside the success branch only; the clear path shows the stored value on every failure |
| T-46-SC (supply chain) | no package installed; `git diff --stat package.json package-lock.json` empty |

## Threat Flags

None. No new endpoint, no new auth path, no schema change, no new file access. The one new
surface is a returned field on an existing Server Action whose gate is unchanged.

## Known Stubs

None. Both artifacts are wired: the action returns categories that the caller reads and
renders, and every branch that can refuse produces a sentence.

## What is NOT closed by this plan

- **The manual procedure is `pending`**, and no green above substitutes for it. The build
  proves the categories cannot go missing; only a person at two accounts proves they reach a
  screen.
- **There is still no error tracking.** The write-failure log line reaches nobody by itself
  (`meta-gates.md`); the observable effect this plan adds is the sentence on the organizer's
  screen, and that is deliberately the whole of it.
- **`refusal` is held but not branched on.** The control draws the same region for all four
  categories and distinguishes them by their words and by `data-refusal`. That is sufficient
  today and is recorded so the next reader does not read the unused state as an oversight.

## Self-Check: PASSED

- `src/app/(public)/events/[slug]/menu/actions.ts` — FOUND
- `src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx` — FOUND
- commit `7299908` — FOUND
- commit `2ec500c` — FOUND
</content>
</invoke>
