---
phase: 46
slug: silent-failures-on-the-money-path
status: planned
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-14
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Read this before filling anything in: there is no test runner in this repository.**
> `package.json` declares no `test` script and there is no `*.test.*` or `*.spec.*` in the
> tree. Nothing in this phase may be called verified because tests pass, and **adding a
> test runner is not this phase's verification strategy** — that is a milestone-sized
> decision and it is not on this roadmap (`46-RESEARCH.md` §10).
>
> Perimeter is `46-CONTEXT.md` `<domain>`, which is **narrower** than the research's.
> Rows the research wrote for out-of-perimeter items are struck from this document.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **None** — measured, not assumed |
| **Config file** | none |
| **Quick run command** | `npm run build` — `next build` is also the typecheck gate; a type error blocks the Vercel deploy |
| **Full suite command** | `npm run build`, then the offline gate scripts **individually** |
| **Estimated runtime** | build ~60–120 s |
| **⚠ FORBIDDEN** | **`npm run verify`** — it runs `verify:capabilities`, which loads `.env.local` and reaches the Supabase Management API **against production** (`scripts/rls-baseline.mjs:205-215`). Never in this phase. |
| **⚠ grep hazard** | `scripts/verify-conversion.mjs` holds two NUL bytes; the shell's default `grep` is `ugrep -I`, which skips binary files **silently**. A zero-hit grep there is not evidence of absence — use `LC_ALL=C /usr/bin/grep` or Read. |

---

## Sampling Rate

- **After every task commit:** `npm run build`
- **After every plan wave:** `npm run build` + the offline gate scripts individually + the
  reveal-guard derivations below, if `(public)/events/[slug]/page.tsx` was opened
- **Before `/gsd:verify-work`:** build green, every derivation re-run, every manual
  procedure written out
- **Max feedback latency:** one build, ~120 s

---

## Requirement → Proof Map

Per-task rows are filled by the planner once plan and task IDs exist. The rows below are
the phase-level contract each task must ladder up to.

| Req | Behaviour | Type | Command / procedure | Mechanical? |
|---|---|---|---|---|
| OBS-04 | a refusal category added without a sentence fails the build | **asserted mutation** | add a member to the refusal union without its `Record` entry → `npm run build` **must fail**; then revert. The totality property *is* the requirement, and the mutation is the only proof of it | ✅ |
| OBS-04 | no refusal on a money path reaches the client as a thrown message | derivation | per converted action, `LC_ALL=C /usr/bin/grep -c "throw new Error"` in the refusal region → 0 | ✅ |
| OBS-04 | `updateMenuClosesAt` keeps *you may not* distinct from *it did not save* (D-46-10b) | derivation | two distinct categories present in the union and two distinct entries in the `Record`; neither reachable from the other's branch | ✅ |
| OBS-03 | the guest drink-receipt read stops rendering a failed read as an empty list | derivation | `GuestTokenDisplay.tsx` — the `return [];` at the read site is gone; the caller distinguishes *empty* from *unreadable* in the type, not by comparing lengths | ✅ |
| OBS-03 | a failed count does not render a purchasable control | **manual, needs a running app** | ❌ not mechanically testable — written procedure, `Result: pending` | ❌ |
| OBS-03 | the two folded permissive reads destructure and handle `error` | derivation | `(admin)/admin/events/actions.ts` at the tier-list, sold-count and discount-usage reads: each destructures `error`; `api/cron/refund-expired-tokens/route.ts` no longer coalesces the delete count to the intended length | ✅ |
| OBS-02 | the refund cron's failed run terminates as failed (D-46-06) | derivation + manual | the failure branch returns a non-2xx and a truthful body; that a failed run shows red in the cron dashboard is observed by a person — written procedure, `Result: pending` | partial |
| OBS-02 | each in-perimeter finding produces an effect a person can see | **manual per finding** | one written procedure each: role, steps, the fault to induce, what must appear | ❌ |
| — | the reveal guards still hold | **derivation, after every diff on `(public)/events/[slug]/page.tsx`** | three-branch ternary present; the reveal test still written **positively**; `export const dynamic = "force-dynamic"` present; `LC_ALL=C /usr/bin/grep -c generateMetadata` → 0 | ✅ |
| — | monotone: the payment webhook is untouched | derivation | `git diff --stat src/app/api/webhooks/` → empty | ✅ |
| — | monotone: no migration is modified | derivation | `git diff --stat supabase/migrations/` → empty. `reserve_ticket` is **read** by this phase, never edited | ✅ |
| — | the accidental mercy at `GuestDrinkMenu.tsx:119-121` survives | derivation | `localStorage.removeItem` still inside the `.then`, with a comment saying why (research L6) | ✅ |
| — | no `catch` logs a whole error object | derivation | every `catch` this phase writes or touches logs `error.code` / `error.message` only — never `error`, never `error.details` (folded constraint, `postgrest-details-leaks-the-row.md`) | ✅ |

**Struck from the research's map, out of perimeter (`46-CONTEXT.md` `<domain>`):** every
`OBS-05` row, and the `OBS-03` row for the four member-dashboard reads. `OBS-05` is not
created by this phase.

---

## Per-Task Proof Map

Filled by the planner on 2026-08-14, once plan and task ids existed. Seven plans in two
waves; every row below is an `<acceptance_criteria>` line in the plan it names, so this
table is an index and not a second source. Where a row is **manual**, the named plan owes
the written procedure with `Result: pending` in its SUMMARY.

| Plan · Task | Req | Proof | Type |
|---|---|---|---|
| 46-01 · T1 | OBS-02/03/04 | `LC_ALL=C /usr/bin/grep -cE '\*\*OBS-0[234]\*\*'` → 3; `grep -c 'OBS-05'` → 0; `grep -cE '^\| OBS-0[234] \| Phase 46 \|'` → 3; no OBS row cites an out-of-perimeter identifier; the coverage figure equals a mechanically counted row count | derivation |
| 46-01 · T2 | OBS-04 | `46-COPY.md` holds a row per category for 46-04/05/06/07, each with a constant name, an owning plan and a `file:` reference, plus the two open decisions | derivation |
| 46-01 · T3 | OBS-04 | the owner approved the list in **one pass** and answered both decisions; recorded verbatim in the SUMMARY | **checkpoint, blocking** |
| 46-02 · T1 | OBS-03/04 | `grep -c '^export '` on `src/lib/failure/money-path.ts` → 3; the `SafeError` type declares no `details`; `grep -c 'from "react"'` → 0 | derivation |
| 46-02 · T2 | — | every added line in `GuestDrinkMenu.tsx`'s diff is a comment; `git diff --numstat` shows 0 deletions; `.then(() => localStorage.removeItem(key))` present verbatim | derivation |
| 46-03 · T1 | OBS-03 | `grep -c 'const { data: allTiers } = await tierQuery;'` → 0; `grep -c 'const { data: soldCounts } = await supabase'` → 0; `grep -c 'This ticket tier is not available'` → 1; no added `console.error` in the purchase region | derivation |
| 46-03 · T1 | OBS-03 | fault-inject the sold-count read, attempt a purchase, observe one safe log line **and no refusal** — the permissive direction is the decided behaviour (D-46-05) | **manual** |
| 46-03 · T2 | OBS-03 | the usage-limit read destructures `error`; the five discount refusals and the minimum-price refusal are counted present; no `throw new Error` line is removed by the diff | derivation |
| 46-04 · T1 | OBS-04 | `grep -c 'throw new Error'` inside `updateMenuClosesAt` → 0; `Record<MenuCloseRefusal, string>` present with three entries; `CAP.STAFF_MANAGE` still above `getServiceClient()`; `menu_closes_at: menuClosesAt \|\| null` byte-identical | derivation |
| 46-04 · T2 | OBS-02/04 | `role="alert"` present; `useToast` absent; `onUpdate` and `setSaved` appear only inside the success branch; still two `updateMenuClosesAt(party.id` call sites; `npm run verify:dialogs` exits 0 | derivation |
| 46-04 · T3 | OBS-04 | **asserted mutation**: a fourth union member added without its `Record` entry; the mutation confirmed applied by grep **before** the build is read; `npm run build` fails naming `MENU_CLOSE_ERROR`; reverted; build green | **asserted mutation** |
| 46-04 · T3 | OBS-04 | two roles, induced write failure — two different sentences, neither confirming a save, the time field showing what is stored | **manual** |
| 46-05 · T1 | OBS-03 | the custody read's `catch` no longer returns `[]`; `STORAGE_KEY_PREFIX` and the key construction byte-identical; all three call sites branch on the returned result | derivation |
| 46-05 · T2 | OBS-02/03 | `grep -c 'orderStatus: "unknown"'` → 0; four union members and four `Record` entries; the bound sets state **before** `clearInterval`; the 3 s interval and the bound of ten unchanged; `hasOwnProperty.call` lookup present | derivation |
| 46-05 · T3 | OBS-02/03 | the early return no longer fires on a custody failure or a terminal fetch state; `useToast` absent; `npm run verify:dialogs` exits 0 | derivation |
| 46-05 · T3 | OBS-02/03 | guest, no account: induced storage fault and induced endpoint failure — *we could not read your drinks* distinguishable from *you have none*, and an effect at the poll's bound | **manual** |
| 46-06 · T1 | OBS-03 | `count ?? 0` → 0; `rsvpCount \|\| 0` → 0; `soldKnown` present on both tier shapes; the four reveal derivations recorded **before** and **after** | derivation |
| 46-06 · T2 | OBS-02/03 | `grep -c '<TierSelection'` → 2, with no prop removed by the diff; the approved sentence present verbatim; `role="status"` count increased; `grep -c generateMetadata` → 0; `grep -c 'dynamic = "force-dynamic"'` → 1 | derivation |
| 46-06 · T3 | — | owner reads the four derivations and the whole diff, and validates that the control stays live | **checkpoint, blocking** |
| 46-06 · T2 | OBS-03 | anonymous visitor, induced count failure: no remaining figure printed, the sentence appears, **the control is still there** — verify the refusal is reachable, not that the control disappears | **manual** |
| 46-07 · T1 | OBS-02/03 | `count ?? tokenIdsToDelete.length` → 0; `delete({ count: "exact" })` present and destructuring `error`; the whole-object refund log gone; `menuCloseInstant` count unchanged; `refundedCount += tokens.length` still inside the loop | derivation |
| 46-07 · T2 | OBS-02 | four union members, two total maps, one response function; `satisfies Record<` present; the four strings verbatim from `46-COPY.md` | derivation |
| 46-07 · T2 | OBS-02 | force the delete to fail, invoke the cron, observe a truthful body **and a run marked failed**; then a succeeding run returning 200 | **manual** |

**Sampling continuity check:** no three consecutive tasks are without a mechanical check —
every task above carries at least one derivation row, and the four manual rows each sit
beside a derivation on the same task.

**Phase-wide derivations, re-run after every wave:** `git diff --stat supabase/migrations/`
→ empty; `git diff --stat src/app/api/webhooks/` → empty;
`git diff --stat package.json package-lock.json` → empty; `npm run build` exits 0;
`npm run verify` **never run**.

---

## Wave 0 Requirements

**No test scaffolding is created.** There is no framework to scaffold into, and installing
one is out of scope by explicit research finding.

What replaces Wave 0 here:

- [ ] The **sentence list** (D-46-10a) drafted in full and approved by the owner in one
      pass, before any copy is merged. Every other copy-bearing task depends on it.
      → **plan 46-01**, tasks 2 and 3; the checkpoint at T3 blocks 46-04, 46-05, 46-06
      and 46-07.
- [ ] The **refusal union and its total `Record`** established once, modelled on
      `src/lib/door/outcome.ts:295` (`DOOR_NIGHT_ERROR`) and `/api/media/finalize`. Every
      later conversion reuses it rather than inventing a second shape.
      → **plan 46-02**, task 1: `src/lib/failure/money-path.ts`. Read *shape* as the
      **construction** — constants, a union from `typeof`, a total `Record` — plus one
      `SafeError` type and one safe log function. Each surface still declares its **own**
      union in its own file, because a category on a bar screen and a category in a cron
      report are not members of one vocabulary; the tree's own three precedents
      (`outcome.ts`, `finalize/route.ts`, the nights half of `admin/events/actions.ts`)
      are three unions and one construction. The module states that in its docblock so a
      later reader does not build a god-union.

---

## Manual-Only Verifications

Each carries `Result: pending` until a person runs it. Each names a **role**, never a
person — `.planning/` is public.

| Behaviour | Req | Why manual | Test instructions |
|---|---|---|---|
| A guest whose drink receipts cannot be read is told so, and does not see an empty list that looks legitimate | OBS-03 | needs a running app and an induced storage fault | role: guest, no account. Buy a drink token; block or clear browser storage; reload the token view; observe that the surface distinguishes *we could not read your drinks* from *you have none*, and does not imply the money is lost |
| A guest whose token status cannot be fetched is told, and the poll stops saying nothing | OBS-02 | needs a running app and an induced network fault | role: guest. Open the token view; fail the status endpoint; observe an effect at the poll's bound as well as in its `catch` — research L5 records that the bound (`>= 10`) fires silently today |
| An organizer denied the menu-closing command sees *you may not*, and one that fails to save sees *it did not save* | OBS-04 | needs two roles and an induced write failure | roles: an organizer with the capability and one without. Attempt to set the closing time in both cases; observe two distinguishable sentences, never one |
| A night whose remaining count could not be read does not present a purchasable control as if the count were zero | OBS-03 | needs a running app and an induced read failure | role: anonymous visitor on the public event page. Fail the count read; observe what the purchase control does. **The owner's standing decision is that the control stays live and the server refuses** — verify the refusal is reachable and legible, not that the control disappears |
| A failed refund-cron run is visible as a failed run | OBS-02 | the observation happens in the hosting dashboard, outside the repository | role: whoever watches deployments. Force the delete to fail; invoke the cron; observe both the truthful body and a run marked failed |
| The sentences are the right sentences | OBS-04 | only the owner can judge this | the approved list from D-46-10a, re-read against what shipped |

**Two gaps that nothing in this repository can close, stated rather than hidden:**

1. **Fault injection against a real database.** `D-41.2-04` forbids a worktree running
   against `.env.local`, and the recorded production-deletion incident forbids production.
   These procedures run only in the owner's own environment.
2. **Whether the bar can see a failing token endpoint.** No staff surface exists, and
   building one was deferred by D-46-10c. Nothing here measures it, and no procedure below
   pretends to.

---

## Validation Sign-Off

- [ ] Every task carries either a mechanical derivation or a named manual procedure — no
      task is discharged by a log line
- [ ] Sampling continuity: no three consecutive tasks without a mechanical check
- [ ] The asserted-mutation proof for OBS-04's totality was run **and reverted**, and the
      mutation was confirmed to have applied before its result was read
      (`ai-engineering.md`, gate *prova per mutazione*)
- [ ] The reveal-guard derivations re-run after every diff touching
      `(public)/events/[slug]/page.tsx`
- [ ] `npm run verify` was never run
- [ ] `46-VERIFICATION.md` carries a `file:line` citation per requirement
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
