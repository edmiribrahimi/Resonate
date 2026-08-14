---
phase: 46-silent-failures-on-the-money-path
plan: 05
subsystem: payments
tags: [typescript, react, error-handling, refusal-categories, localstorage, polling, observability, a11y]

# Dependency graph
requires:
  - phase: 46-silent-failures-on-the-money-path
    provides: "`src/lib/failure/money-path.ts` (46-02) — `ReadResult`, `SafeError`, `logMoneyPathFailure`"
  - phase: 46-silent-failures-on-the-money-path
    provides: "`46-COPY.md` (46-01) — the approved sentence list; §2's six refusals and §2b's one non-refusal"
  - phase: 41-door-and-scanner
    provides: "`src/lib/door/outcome.ts:278-302` — the construction; `ScannerClient.tsx:83-99` and `:271-273` — the only client-side total `Record` and the `hasOwnProperty` lookup"
provides:
  - "A guest whose browser could not be read is told so, instead of being handed the screen of somebody who bought nothing"
  - "Two custody categories with a total `Record`, and helpers returning tagged results instead of `void`/`[]`"
  - "Four token-fetch states with a total `Record`, replacing the single ambiguous `\"unknown\"`"
  - "A terminal state at the poll's bound, which previously produced nothing at all"
  - "`RECEIPT_KEEP_TAB_OPEN` — the phase's one preventive notice, drawn on the healthy state and deliberately outside every refusal union"
affects: [46-06, 46-07, bar-side-lookup-deferred]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two independent unions in one file, each with its own total `Record` — the surface owns its vocabulary, and *custody* is not merged with *fetch*"
    - "`ReadResult<T, R>` consumed at a real call site: empty and unreadable differ in the type, not by comparing lengths"
    - "A preventive notice held outside the refusal union, so the `Record` stays total over one thing"
    - "`Object.prototype.hasOwnProperty.call` before indexing any key that arrived in a JSON body this file does not own"

key-files:
  created: []
  modified:
    - src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx

key-decisions:
  - "Constant identifiers carry the plan's `GUEST_CUSTODY_` prefix while their VALUES are the category names the owner approved (`RECEIPT_STORE_FAILED`, `RECEIPT_STORE_UNREADABLE`) — the plan and `46-COPY.md` named the same two causes differently, and this satisfies both without amending an approved list over an identifier"
  - "`RECEIPT_KEEP_TAB_OPEN` is a module-scope constant and NOT a union member: a category means *something went wrong*, and folding a *nothing has* notice in would make a `Record` total over a set that no longer describes one thing"
  - "The banner is suppressed while a failure sentence is showing — `RECEIPT_STORE_FAILED` already ends with *keep this page open until they are served*, and two versions of one instruction frays the register"
  - "Where a custody failure and a fetch state are both held, the custody one is drawn: it is the only one whose consequence outlives the page"
  - "`GuestDrinkMenu.tsx`'s byte-identical `storeGuestOrder` copy was NOT changed — its write path has no component to render into, and the divergence was already predicted in writing above it by 46-02"

patterns-established:
  - "Re-measure by predicate before editing: all six coordinates for this file were re-anchored on `function` / literal text rather than on line numbers"
  - "An acceptance grep whose expected value was mis-measured upstream is recorded with both counts rather than made to pass"

requirements-completed: [OBS-03, OBS-02]

# Metrics
duration: 38min
completed: 2026-08-14
---

# Phase 46 Plan 05: The Guest's Drink Receipts Summary

**Three silent failures in one file answered as one question — the custody write and read now return tagged results so *empty* and *unreadable* differ in the type, four named states replace the single `"unknown"`, the poll's bound produces a terminal sentence instead of `clearInterval` and nothing, and the early return that drew nothing for both cases now draws the third state in place, announced, with no toast.**

## Performance

| Metric | Value |
|---|---|
| Tasks | 3 / 3 |
| Commits | 3 |
| Files modified | 1 |
| Duration | ~38 min |
| Sentences merged | 7, all verbatim from `46-COPY.md` |

## What was built

### Task 1 — the custody contract (`c4a76ef`)

`storeGuestOrder` went from `void` to `GuestCustodyWriteResult`; `getGuestOrderIds`
went from `string[]` to `ReadResult<string[], typeof GUEST_CUSTODY_READ_FAILED>`,
the shared shape from 46-02. Both `catch` bodies stopped being empty and stopped
returning the empty list.

The distinction that matters, stated at the source and repeated here because the
phase prompt calls `|| "[]"` the core defect: **the `|| "[]"` inside the `try` is
not the defect and stays.** It fires when the key is absent, and a browser with no
key genuinely bought nothing. The defect was `catch { return []; }` — a *thrown*
read reported as that same truthful answer. After this plan the two arms are
different shapes and no caller can render one as the other.

All three call sites branch. In the initial-load effect the read failure is the one
that mattered: a failed read used to contribute nothing to the id set, so the
component proceeded as if the browser were empty.

### Task 2 — four states, and a bound that is no longer mute (`168aa11`)

`orderStatus: "unknown"` was returned both by a fetch that could not answer and by
an order merely on its way. Four constants, a union from `typeof`, a total `Record`
of the four approved sentences.

The three discard sites and the bound:

| Site | Before | After |
|---|---|---|
| `!res.ok` in `fetchTokensForOrders` | empty token list + `"unknown"` | `TOKENS_REFUSED` |
| that function's `catch` | empty token list + `"unknown"` | `TOKENS_UNREACHABLE` |
| the interval's `if (!res.ok) return;` | tick ended, nothing left behind | records the cause, falls through to the bound |
| the bound `pollCountRef.current >= 10` | `clearInterval` and **nothing else** | sets the terminal state **before** clearing the timer |

`orderStatus` crosses a boundary this file does not own, so the terminal-status
lookup uses `Object.prototype.hasOwnProperty.call` — the `ScannerClient.tsx:271-273`
form (T-46-16). The comparison is unchanged (`completed` is still the only terminal
value); its lookup is not.

### Task 3 — the render (`2e89b6c`)

**The exact new early-return predicate**, as the plan's output spec requires it be
recorded:

```ts
if (
  !loading &&
  tokens.length === 0 &&
  custodyFailure === null &&
  fetchState === null
) {
  return null;
}
```

Drawn in place in an announced `role="alert"` region — the same shape already inside
this file's active-token screen. No toast: `scripts/verify-dialogs.mjs` check C
refuses any file that renders `Dialog` and reaches for the toast hook, and this file
renders `Dialog`. `npm run verify:dialogs` exits 0.

`RECEIPT_KEEP_TAB_OPEN` ships as a module-scope constant drawn on the **healthy**
state — at least one `token.status === "active"`, the predicate the card itself uses
— and is not a member of any union.

## Before / after grep counts

Every count the plan asserts, measured on the base commit `bd8eb8d` and again on
`2e89b6c` with `LC_ALL=C /usr/bin/grep -c -F`.

| Pattern | Before | After | Required | Verdict |
|---|---|---|---|---|
| `return [];` inside `getGuestOrderIds` (`grep -A6`) | 1 | **0** | `0` | pass |
| `STORAGE_KEY_PREFIX}_${eventId}` | 2 | **2** | unchanged | pass |
| `const STORAGE_KEY_PREFIX = "resonate_drink_tokens"` | 1 | **1** | `1` | pass |
| `GUEST_CUSTODY` | 0 | **14** | ≥ 4 | pass |
| `orderStatus: "unknown"` | 2 | **0** | `0` | pass |
| `pollCountRef.current >= 10` | 1 | **1** | `1` | pass |
| `, 3000)` | 2 | **2** | plan said `1` — see Deviation 2 | pass on the invariant |
| `hasOwnProperty.call` | 0 | **2** | ≥ 1 | pass |
| `/api/drinks/tokens?order_id=` | 2 | **2** | unchanged | pass |
| `useToast` | 0 | **0** | `0` | pass |
| `role="alert"` | 1 | **2** | > before | pass |
| `Loading your drinks...` | 1 | **1** | `1` | pass |

Plan-level assertions:

```
git diff --stat bd8eb8d..HEAD -- supabase/migrations/                     → empty
git diff --stat bd8eb8d..HEAD -- src/app/api/webhooks/                    → empty
git diff --stat bd8eb8d..HEAD -- '…/menu/GuestDrinkMenu.tsx'              → empty
git diff --stat bd8eb8d..HEAD -- package.json package-lock.json           → empty
git diff --name-only bd8eb8d..HEAD  → one file: …/menu/GuestTokenDisplay.tsx
wc -l  → 1078   (must_haves min_lines: 700)
npm run build          → ✓ Compiled successfully
npm run verify:dialogs → DIALOGS_OK — all three checks passed
```

All seven merged sentences were checked with `grep -c -F` against `46-COPY.md`:
each returns ≥ 1. **No sentence was reworded, shortened or composed at run time**,
and nothing from a response body is interpolated into any of them (T-46-15).

## The duplicated custody helper — what was done, and why

`GuestDrinkMenu.tsx:95` holds a byte-identical copy of the pre-46-05
`storeGuestOrder`, with a comment plan 46-02 put above it that predicts precisely
this divergence.

**It was not changed, and the file was not opened for editing** — the plan forbids
it and the verification asserts an empty diff, which it is.

The reason, rather than the instruction: that copy's write happens where there is no
component holding a custody category and nothing downstream reads a returned value,
so changing its contract would add a result nobody consults. The risk is real and is
recorded rather than closed: for a guest with no account the
`resonate_drink_tokens_<event>` entry **is the receipt**, and two authors of one
measurement on the only proof a person holds that they paid is the failure mode to
watch. The divergence is now named in both places — in 46-02's comment above the copy,
and in this plan's docblock above the changed one.

## Deviations from Plan

### 1. [Rule 1 — Bug] The bound was unreachable on a failing tick, so the poll ran forever

**Found during:** Task 2.
**Issue:** the bound sat inside the `try` *after* both early exits. On `!res.ok` the
tick `return`ed and on a throw the `catch` swallowed — so with an endpoint that
failed persistently, `pollCountRef.current >= 10` was **never evaluated** and the
three-second poll ran until unmount.
**Why it is in scope, not an unrelated fix:** the plan requires the bound to produce
a terminal state that says whether the poll ran out *having never reached the server
or having been refused*. That state is unreachable unless the bound is evaluated
after a failed tick. The repair is the plan's own requirement, not an extra.
**Fix:** the bound moved out of the `try`/`else` and is evaluated on every tick. The
bound of ten, the three-second period, the endpoint and its query parameter, the
de-duplication by id and the unmount cleanup are all unchanged.
**Commit:** `168aa11`.

### 2. [Documentation] The plan's `, 3000)` acceptance value was mis-measured upstream

**Found during:** Task 2 verification.
**Issue:** the plan's acceptance criteria state that `grep -c ', 3000)'` returns `1`.
It returns **2**, both before and after the diff: the second is the SERVED screen's
auto-close `setTimeout(…, 3000)` in `GuestRedeemConfirmationModal`, which this plan
does not touch. The invariant the criterion protects — *the poll's three-second
period is unchanged* — holds, and both counts are recorded above rather than the
criterion made to pass.
**Fix:** none in code. Recorded here.

### 3. [Documentation] The plan and `46-COPY.md` name the same two causes differently

**Found during:** Task 1.
**Issue:** the plan writes `GUEST_CUSTODY_READ_FAILED` in its action text, its
`ReadResult` type and its `contains:` assertion; the approved list names the same two
categories `RECEIPT_STORE_FAILED` and `RECEIPT_STORE_UNREADABLE`.
**Fix:** the identifiers take the plan's prefix, the **values** take the approved
names. The category a reader finds in the code is therefore the category the owner
approved a sentence for, and no approved document was amended over an identifier.
`46-COPY.md`'s rule binds sentences, and no sentence changed.

### 4. [Rule 3 — Blocking] The word `useToast` in a comment tripped the plan's own grep

**Found during:** Task 3.
**Issue:** the comment explaining *why there is no toast here* contained the literal
token, so `grep -c 'useToast'` returned `1` against a required `0`.
**Fix:** reworded to *"reaches for the toast hook"*. The gate itself
(`verify-dialogs.mjs` check C) was green either way — it counts occurrences on live
lines — but a criterion that reads the raw file is the criterion, and the explanation
loses nothing.

## What this plan deliberately did NOT build

**The guest-facing half only (D-46-10c).** No staff surface shows a guest's orders or
tokens — `DrinkMenuManager.tsx` manages the price list, not the orders — so **no
sentence here says *ask at the bar***. The bar has nothing to look at, and a promise
the product does not keep would be this phase's own defect reintroduced as copy. The
bar-side lookup is on the deferred list.

**T-46-18 stands as accepted.** A guest whose device lost the receipt still cannot
prove the purchase to anybody. What changed is that they are now told which of the
two things happened, and told that the payment itself is not affected.

**There is still no error tracking.** Every `logMoneyPathFailure` line added here
reaches nobody on its own. The effect that counts on this surface is the sentence on
the screen, and that is what was built.

## Manual verification procedure — `Result: pending`

No test runner exists for the product (`meta-gates.md`), so this is written out step
by step because it is the only evidence that will ever exist. **Role: guest, no
account.** In the owner's own environment — **not** a worktree pointed at
`.env.local` (D-41.2-04), **not** production.

Setup: reach the drink menu by scanning the bar QR for a live party, or open
`/events/<slug>/menu` in a browser with no session. Buy one drink token so the
device holds a real receipt.

**(a) The browser cannot be read.**

1. With the token visible under *Your Drinks*, note that the notice **Keep this tab
   open until your drinks are served…** appears once the token shows as *Active —
   tap to serve*. Before activation it should not appear.
2. In DevTools → Application → Local Storage, corrupt the entry
   `resonate_drink_tokens_<eventId>` — replace its value with `{` — then reload.
3. **Expected:** the *Your Drinks* section still renders, with
   *We could not read the drinks saved on this device — that is not the same as
   having none. Reload the page, or open it in the browser you bought them with.*
   **Not** a blank page, and **not** the screen of somebody who bought nothing.
4. **Expected:** the sentence is announced — with VoiceOver or the accessibility
   inspector, confirm it is inside a `role="alert"` region.
5. **Expected:** nothing in the sentence suggests the payment is gone.
6. Restore the entry and reload; the tokens come back and the sentence disappears.

**(b) The status endpoint fails while an order is polling.**

7. In DevTools → Network, add a block rule for `/api/drinks/tokens*`.
8. Buy a drink (or dispatch `guestOrderComplete`) so the poll starts.
9. **Expected immediately:** *Your drinks are still being confirmed — this usually
   takes a few seconds.*
10. **Expected after ten ticks — about thirty seconds:** the poll **stops**, and the
    message becomes *We could not reach the server to check your drinks. Your payment
    is not affected — check your connection and reload.* Confirm in the Network panel
    that requests genuinely stop; the bound firing silently and the poll running
    forever were both true before this plan.
11. Repeat with the endpoint returning **500** instead of being blocked.
    **Expected at the bound:** *The server could not answer for this order. Your
    payment is not affected — reload in a moment.*
12. To see *Your drinks have not been confirmed yet and we have stopped checking…*,
    let the endpoint answer normally with an order that never completes: the bound is
    reached with every tick having succeeded.

**Result: pending** — steps 1–12 have not been run. `npm run build` and
`npm run verify:dialogs` are green; neither is evidence of any of the above.

## Threat Flags

None. The diff opens no new endpoint, no new auth path, no file access and no schema.
The two boundaries it touches were already in the plan's `<threat_model>`:
`hasOwnProperty.call` closes T-46-16, and the key construction was asserted
byte-identical for T-46-17 (2 occurrences before, 2 after).

## Self-Check: PASSED

- `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx` — FOUND, 1078 lines
- `c4a76ef` — FOUND in `git log`
- `168aa11` — FOUND in `git log`
- `2e89b6c` — FOUND in `git log`
- `npm run build` — exit 0
- `npm run verify:dialogs` — exit 0
- STATE.md and ROADMAP.md — untouched, confirmed by `git diff --name-only bd8eb8d..HEAD`
