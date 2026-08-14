# Phase 46 — The Sentence List

**Drafted:** 2026-08-14
**Plan:** 46-01, task 2
**Status:** **APPROVED** by the project owner on 2026-08-14, in **one pass** over
the whole list (D-46-10a). See `## Sign-off` at the foot for what was approved
and what was added in the same pass.

> `.planning/` is public. Roles below, never people. No venue, no unannounced
> date, no line-up, no contact, and no order id — in the document or in any
> sentence it carries.

---

## What this document is, and why it exists before any code

`community-membership.md` states it as a rule and not a preference: *un rifiuto
è una comunicazione*, and *il testo del rifiuto va scritto una volta, con cura,
e usato sempre lo stesso*. Sentences decided plan by plan produce four registers
on one product, and the reader who meets two of them cannot tell whether the
difference means anything.

So every sentence this phase will ship is here, in one list, before any of it is
merged. **No copy-bearing plan in this phase merges a sentence that is not on
this list** (D-46-10a). A plan that wants a different sentence amends the list
and the list is re-presented whole — never a sequence of per-sentence
agreements.

**The approval is one pass over a complete list.** That is the only pass.

### The rules every sentence below was written against

1. **English** (D-46-10), consistent with the visual materials' British English.
2. **Cause and next step**, wherever the next step differs. Where no action
   exists, the sentence says nothing rather than inventing one.
3. **Never a promise the product does not keep.** If a sentence says someone
   will be written to, something must actually write.
4. **No manufactured alarm about money that is safe.** A browser that cannot
   store a receipt has not lost a payment, and the sentence must say which.
5. **One sentence per cause, written once, reused everywhere.**
6. **No sentence composed at run time** from a tier name, a drink name or a
   party title. The one exception is stated in place, at 46-04's write failure,
   and it is a database error code — not anybody's data (T-46-01).
7. **The standard to reach** is the one `src/lib/door/outcome.ts:288-294` sets
   in its own docblock: does the sentence tell the person something they can act
   on, or does it send them to find somebody else? The second kind earns its
   own lookup only when the first is impossible.

### Where the sentences come from, and where they land

The construction is not invented here. `src/lib/door/outcome.ts:278-302` holds
three constants, a union built from `typeof`, and a **total `Record`** — so a
category added without a sentence is a build error, not a silent fall-through.
`src/app/(admin)/admin/events/actions.ts:327-370` holds ten sentences on a staff
money surface, written once and used always. Both are read as the register.

Every coordinate below was re-measured on **2026-08-14** with
`LC_ALL=C /usr/bin/grep -n`. Anchor on the predicate text, never on the number.

---

## 1 · Plan 46-04 — the organizer's menu-closing command

**Action:** `src/app/(public)/events/[slug]/menu/actions.ts` — `updateMenuClosesAt`
**Caller:** `src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx` — `MenuCloseControl`

Today all three causes are `throw new Error(...)`, and **all three arrive
identical in production**: Next redacts the message of an error thrown out of a
Server Action in a production build (`src/lib/capabilities/server.ts:59-63`).
Rewording a throw is not a fix — the category has to travel as a returned value.

D-46-10b requires the three to stay apart. *You may not do this* and *it did not
save* are different facts to an organizer, and collapsing them reproduces the
newsletter defect on a staff money surface.

| Constant | Plan | Renders at | Cause | Sentence |
|---|---|---|---|---|
| `MENU_CLOSE_NOT_SIGNED_IN` | 46-04 | `menu/actions.ts:48` → `PartyDrinkMenu.tsx` beside `:212` | no session — `ctx.userId` is absent | **This session is no longer signed in, so the closing time was not changed. Sign in again and set it.** |
| `MENU_CLOSE_NOT_PERMITTED` | 46-04 | `menu/actions.ts:51` → `PartyDrinkMenu.tsx` beside `:212` | the account does not hold `CAP.STAFF_MANAGE` | **This account may not set the closing time for a night — an organizer has to do it. Nothing was changed.** |
| `MENU_CLOSE_WRITE_FAILED` | 46-04 | `menu/actions.ts:60` → `PartyDrinkMenu.tsx` beside `:212` | the update itself was refused by the database | **Saving the closing time failed. It is unchanged — the bar menu still closes when it did before. Try again.** |
| *(caller fallback, not a union member)* | 46-04 | `PartyDrinkMenu.tsx:144-161` | a refusal arrived carrying **no category at all** | **The save was refused and no reason travelled back. Reload the page and check what the closing time says before trying again.** |

**Three notes that belong with these four, and not in a plan nobody re-reads:**

- **The database code is appended to the third sentence, in parentheses, and
  nowhere else.** `src/app/(admin)/admin/events/actions.ts:368` already does
  exactly this on the same kind of surface. T-46-01 permits a PostgREST `code`
  here and only here: it is a class of failure, not a row and not a person. The
  whole error object and its `details` field never appear — on a violation
  PostgREST returns the entire rejected row, and a rejected row can carry a
  membership code, which is the door credential.
- **The caller fallback is modelled on `src/components/events/EventForm.tsx:619-630`**,
  which says exactly that instead of collapsing into a shared *something went
  wrong*. Its wording here differs on one point deliberately: this is a money
  surface, so the next step is *check what the field says*, not *try again* —
  the save may or may not have landed.
- **The fourth sentence's next step is not decoration.** `handleClear` at
  `PartyDrinkMenu.tsx:154-160` calls `setTime("")` **before** the await, so a
  failed clear leaves the field showing empty while the stored value is
  unchanged. Whichever plan renders these sentences must make the field show
  what is stored on every failure branch, or the sentence tells the truth beside
  a control that does not.

---

## 2 · Plan 46-05 — the guest's drink receipts

**File:** `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx`

Six causes. Three of this phase's findings live in this one file, and they are
**one question, not three**: *what does a guest see when the browser cannot hold
their receipt.*

**The register constraint, stated before the table because it governs every row
in it (O3):** none of these sentences may manufacture alarm about money that is
safe. A storage failure does not mean the purchase failed — it means this
browser cannot prove it — and each sentence says which.

**The stated limit, and it belongs in this document rather than in a plan:**
D-46-10c ships the **guest-facing half only**. There is no bar-side lookup, and
none is built by this phase. So *show this screen at the bar* is advice that can
only be given where the screen still renders the order — and where it does not,
**no sentence below sends a guest to a counter that cannot find them.**

| Constant | Plan | Renders at | Cause | Sentence |
|---|---|---|---|---|
| `RECEIPT_STORE_FAILED` | 46-05 | `GuestTokenDisplay.tsx:107-120` (catch at `:117-119`), called at `:528` and `:553` | the browser refused to store the order — the entry it failed to write **is the receipt** | **Your order was placed. This browser could not keep a copy of it, so this device may not be able to show your drinks again — keep this page open until they are served.** |
| `RECEIPT_STORE_UNREADABLE` | 46-05 | `GuestTokenDisplay.tsx:122-129` (`return []` at `:127`), read at `:532` | the stored receipts could not be read back; `[]` is also the legitimate answer | **We could not read the drinks saved on this device — that is not the same as having none. Reload the page, or open it in the browser you bought them with.** |
| `TOKENS_ARRIVING` | 46-05 | the poll, `GuestTokenDisplay.tsx:559-590` | the order is real and the drinks have not come back yet | **Your drinks are still being confirmed — this usually takes a few seconds.** |
| `TOKENS_UNREACHABLE` | 46-05 | `GuestTokenDisplay.tsx:512` (catch), and the poll's own catch at `:587-588` | the request never reached the server | **We could not reach the server to check your drinks. Your payment is not affected — check your connection and reload.** |
| `TOKENS_REFUSED` | 46-05 | `GuestTokenDisplay.tsx:506` (`!res.ok`), and the poll's `!res.ok` at `:564` | the server answered and would not give the order | **The server could not answer for this order. Your payment is not affected — reload in a moment.** |
| `TOKENS_GAVE_UP` | 46-05 | `GuestTokenDisplay.tsx:581` — the bound, `pollCountRef.current >= 10` | the poll reached its bound with no answer. **Today this is the commonest terminal state and it produces nothing at all** — `clearInterval` and no state change | **Your drinks have not been confirmed yet and we have stopped checking. Your payment is not affected — reload this page to check again.** |

### 2b · One added sentence, and it is **not a refusal**

Approved in the same pass as the list (2026-08-14). It belongs to 46-05 and it
is drawn when the state is **healthy** — the guest has active tokens and nothing
has gone wrong. It is a warning that arrives *before* the failure it prevents,
which is the opposite of every other row in this document.

**It is not a member of any refusal union, and it must not be made one.** A
category means *something went wrong*; this sentence means *nothing has, and
here is how to keep it that way*. Folding it into the union would make a
`Record` total over a set that no longer describes one thing.

| Constant | Plan | Renders at | Condition | Sentence |
|---|---|---|---|---|
| `RECEIPT_KEEP_TAB_OPEN` | 46-05 | `GuestTokenDisplay.tsx:637-663`, above the grid at `:652` | the guest holds at least one **active** token — the predicate the card already uses, `token.status === "active"` at `:441` | **Keep this tab open until your drinks are served — if you are browsing privately, closing it will lose them.** |

**Why it was added rather than assumed.** The owner believed a warning of this
kind was already on the surface. It is not:
`LC_ALL=C /usr/bin/grep` over the `menu/` directory returns **zero** occurrences
of any *don't close this tab* notice. The one real way to lose the receipts is
to browse privately and close the tab, and until this sentence ships nothing
tells a guest that.

### The domain facts that make the six sentences say what they say

Given by the owner during the approval, and recorded here because they are the
**reason** no sentence sends a guest anywhere else. Without the reason written
down, the next reader will add the missing route back in as an obvious
improvement.

1. **The drink menu is reachable only by scanning a QR code at the bar**, and it
   is not reachable before the night. Nobody buys who is not inside the venue
   with the code in front of them.
2. **The cross-browser loss scenario is therefore unreachable.** *Buy inside a
   social app's in-app browser, reopen in the system browser* cannot happen: the
   camera opens the system browser, so the purchase and the re-read live in the
   same storage.
3. **No staff surface shows orders or tokens.** `DrinkMenuManager.tsx` manages
   the price list, not the orders. Writing *ask at the bar* would be a promise
   the product does not keep, and rule 3 of this document forbids it.
4. **The counter-side screen stays deferred.** It is not in this phase, and no
   sentence here anticipates it.

Together these narrow the case to one: **a private window, closed.** That is the
case `RECEIPT_KEEP_TAB_OPEN` addresses before it happens, and the case the two
`RECEIPT_*` refusals describe honestly once it has.

**Two notes:**

- **The sentences are inert unless the early return learns the third state.**
  `GuestTokenDisplay.tsx:633` returns `null` when `!loading && tokens.length === 0`,
  so a failed custody read reaches it as *no tokens* and the component renders
  nothing whatsoever. Whichever plan adds the union must teach that line the
  difference between *none* and *unreadable*.
- **No toast here, and it is a build gate rather than a preference.** This file
  renders `Dialog` at `:337`, and `scripts/verify-dialogs.mjs` refuses any file
  that renders a `Dialog` and imports `useToast`. The refusals are drawn in
  place: the announced region already at `:310-314`, or the primitive's own
  `status` prop at `:341`.

---

## 3 · Plan 46-06 — the public event page

**File:** `src/app/(public)/events/[slug]/page.tsx`

One cause and **one sentence**, used at both control sites — the event-level one
at `:972` and the per-party one at `:1241`. Today the three counts at `:493`,
`:536` and `:641` never destructure their error and coalesce to zero, so a full
night renders as open with the control that takes money beside it.

| Constant | Plan | Renders at | Cause | Sentence |
|---|---|---|---|---|
| `PLACES_UNKNOWN` | 46-06 | `page.tsx:972` and `page.tsx:1241`, from the counts at `:493`, `:536`, `:641` | how many places remain for this night could not be checked | **How many places are left could not be checked just now, so no number is shown here. Buying is still open.** |

**Why it is worded that flatly, and what it deliberately does not say:**

- **It must not read as a refusal of the buyer.** The owner's standing decision
  is that the control stays live and the server decides. The sentence's whole
  job is to stop a number the page could not read from being presented as a
  fact — not to close the sale.
- **It does not promise that the purchase will succeed**, and that omission is
  deliberate. The real guard is in the database
  (`supabase/migrations/20260310100000_discount_codes.sql:90`), and it runs
  **after** payment. A sentence saying *the check happens when you pay* would be
  reassuring about precisely the window D-46-07 leaves silent by the owner's
  recorded decision. It says less, and what it says is true.
- **One sentence, both sites.** Two wordings for one fact is how a register
  fragments.

---

## 4 · Plan 46-07 — the refund cron's report

**File:** `src/app/api/cron/refund-expired-tokens/route.ts`

These are read in the hosting dashboard by whoever watches deployments, not by a
guest, so the register is **operator-facing**. They are written once here for the
same reason as all the others.

Today `:167` reads `deletedCount = count ?? tokenIdsToDelete.length` — two
separate wrongs. The delete's `error` is never destructured, so a refused delete
reports as a full success; and because `.delete()` without `{ count: "exact" }`
returns `null` on the success path too, the coalesce reports the **intended**
length essentially always. Rows that remain are counted as deleted, and `:170`
returns 200 regardless.

| Constant | Plan | Renders at | Cause | Sentence |
|---|---|---|---|---|
| `CRON_REFUND_OK` | 46-07 | `route.ts:170-174` | the run did everything it set out to do | **The run completed: every expired order was refunded and every spent token row was deleted.** |
| `CRON_REFUND_DELETE_REFUSED` | 46-07 | `route.ts:161-168` | the cleanup delete was refused outright | **The cleanup delete was refused, so spent token rows are still in the table. The refunds themselves are unaffected.** |
| `CRON_REFUND_DELETE_SHORT` | 46-07 | `route.ts:161-168` | fewer rows were deleted than were asked for | **Fewer token rows were deleted than were asked for. The rows that remain are still in the table and are not counted as deleted.** |
| `CRON_REFUND_REFUNDS_FAILED` | 46-07 | `route.ts:92` and `:128` accumulate it; reported at `:170-174` | one or more refunds could not be issued | **One or more refunds could not be issued. That is money that should have gone back and has not — each failure is logged on its own line and needs a refund by hand.** |

> **`CRON_REFUND_REFUNDS_FAILED` accompanies a FAILED run, not a 200.** Settled
> by the owner in this approval (Decision 1, answer **A**): when
> `refundErrors > 0` the route returns a non-2xx and the run terminates as
> failed, exactly as D-46-06 already decided for a refused cleanup delete. 46-07
> implements it. The other three strings keep their existing dispositions —
> `CRON_REFUND_OK` is a 200, and the two delete strings were already failed runs
> under D-46-06.

**Three notes:**

- **The counts stay out of the sentences and travel as fields.** The route
  already returns `refunded`, `refundErrors` and `deleted`; a static sentence
  beside truthful numbers keeps the wording written-once and keeps the rule
  against run-time composition intact.
- **D-46-06 already decided the second and third: a failed cleanup terminates
  the run as failed**, so it shows red in the cron dashboard. It is the only
  observable effect in this phase that costs nothing to build, and its accepted
  cost — that frequent red becomes wallpaper — is on the record.
- **`route.ts:127` currently logs the whole error object.** This phase opens
  this file, so it inherits the rule: `code` and `message`, never the object,
  never `details`.

---

## 5 · Plan 46-03 contributes no sentence, and this document says so out loud

D-46-08 repairs the two permissive server reads in `purchaseTicket` and the
discount usage-limit read as **observability, not as a new refusal**, and
D-46-05 keeps their direction permissive: the real capacity guard locks the tier
row and raises in plpgsql, where a failed read cannot coalesce to zero, so it
already fails closed. Closing the application-side pre-check on a transient read
error would refuse a buyer the database would have accepted.

So 46-03 produces a category and a safe log line, and **no new words to anybody.**

Recording the absence is the point. A later reader counting sentences against
plans would otherwise find a gap where 46-03 sits and conclude one was
forgotten — which is this phase's own defect, reproduced in its own paperwork.

---

## Two decisions inside this approval

**Both answered by the owner on 2026-08-14, in the same pass as the list.** The
questions and their options are kept below exactly as they were put, so the
answers can be read against what was actually asked rather than against a later
summary of it.

> ### ANSWERED — Decision 1: **A. Yes, red.**
>
> With `refundErrors > 0` the cron run terminates as **failed** (non-2xx),
> exactly as already decided for a failed cleanup delete (D-46-06). The owner's
> recorded reason: it is the only path in this phase where money has to go back
> and does not, and without error tracking a counter inside a 200 is a log line
> — a place nobody looks. The phase that declares OBS-02 cannot break it there
> of all places.

> ### ANSWERED — Decision 2: **A. The sentences stand as written. No channel named.**
>
> Grounded on the four domain facts recorded in §2, above: QR-only access at the
> bar, the cross-browser scenario unreachable, no staff surface showing orders,
> and the counter-side screen deferred. The remaining case is a private window
> that gets closed — addressed **before** it happens by the added
> `RECEIPT_KEEP_TAB_OPEN`, and described honestly by the two `RECEIPT_*`
> refusals once it has.

The one-pass approval was the only pass, so these two could not be left to
execution. Neither is recorded as *to be decided later*.

### Decision 1 — does a failed refund make the cron run go red?

D-46-06 decided that the **cleanup delete** failing makes the run terminate as
failed. It did not say what happens when `refundErrors > 0` — money that should
have gone back and did not. The route already counts them per item
(`route.ts:92`, `:128`), so both options cost the same to build.

| Option | What happens | Cost |
|---|---|---|
| **A — red** | `refundErrors > 0` returns a non-2xx; the run shows failed in the cron dashboard, beside the truthful body | Adds a second trigger to the red-as-wallpaper cost D-46-06 already accepted. A refund can fail for a reason nobody can fix that night, and the run will be red until the next one |
| **B — green, with the count in the body** | the run returns 200; `refundErrors` is a number in a truthful JSON body | There is no error tracking (**OBS-01** is deferred), so a non-zero counter inside a 200 body is a log line — a place nobody looks. That is what **OBS-02**, declared by this same plan, exists to forbid |

**Stated plainly rather than decided here:** the two options are not symmetric.
Option B leaves the phase declaring OBS-02 and, on the one path in it that
carries money **backwards**, not meeting it. That is an argument, not a verdict
— if the frequency of unfixable refund failures is high enough that red would
become meaningless, the owner may reasonably take B and record the reason.

**Please answer: A or B.**

### Decision 2 — what a guest is told when the browser cannot hold their receipt

The sentence proposed is `RECEIPT_STORE_FAILED`, above:

> **Your order was placed. This browser could not keep a copy of it, so this
> device may not be able to show your drinks again — keep this page open until
> they are served.**

and its read-side companion `RECEIPT_STORE_UNREADABLE`:

> **We could not read the drinks saved on this device — that is not the same as
> having none. Reload the page, or open it in the browser you bought them with.**

**What this phase gives the guest, and what it does not.** D-46-10c ships the
guest-facing half only. **There is no bar-side lookup**, and none is built here:
if the browser copy is gone — another device, a private window, cleared storage
— the platform offers the guest no second route to the drinks they paid for.
Neither sentence therefore says *show it at the bar*, because the bar cannot
find them.

The frequency evidence is recorded with its limit: a past public edition ran with
unregistered guests' receipts surviving a page refresh and no loss reported. A
refresh preserves browser storage, so it exercises the working path, not the
failing one. It lowers the frequency; it does not remove the case.

| Option | The sentence says | Cost |
|---|---|---|
| **A — as drafted** | what is true, what is at risk, and the one action that exists (keep the page open) | A guest who loses the copy anyway is told nothing about what to do next, because there is nothing |
| **B — as drafted, plus a route out** | the same, and then names the community's own channel as the way to reach a human | Consistent with D-46-09, which already routes refunds through that channel and not through the platform. But a named channel is a promise **a person has to answer**: if nobody watches it during a night, the sentence is worse than silence |

**Please answer: A or B — and if B, say which channel is named, so the wording is
approved with the promise it makes rather than after it.**

---

## Sign-off

**APPROVED — 2026-08-14, by the project owner, in one pass over the whole list.**

- [x] The whole list read in one sitting (D-46-10a)
- [x] Decision 1 answered — **A, red**
- [x] Decision 2 answered — **A, no channel named**
- [x] Approval recorded verbatim, and dated, in `46-01-SUMMARY.md`

**Rounds of amendment:** 1 — the list was approved as presented, with **no
correction to any sentence**, plus **one sentence added in the same pass**
(`RECEIPT_KEEP_TAB_OPEN`, §2b). The addition was approved together with the
list, not as a second round: no sentence already on the list was renegotiated,
so the one-pass property holds.

**Nothing on this list had been merged into any source file at the moment of
approval** — `git diff --stat src/` was empty.

**Plans 46-04, 46-05, 46-06 and 46-07 are released.**

From here the list is the single source. A plan that wants a different sentence
**amends this document and re-presents it whole** — it does not merge a variant
and record the difference afterwards (T-46-03).
