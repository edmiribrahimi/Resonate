---
status: testing
phase: 46-silent-failures-on-the-money-path
source: [46-03-SUMMARY.md, 46-04-SUMMARY.md, 46-05-SUMMARY.md, 46-06-SUMMARY.md, 46-07-SUMMARY.md]
started: 2026-08-14
updated: 2026-08-14
---

## Current Test

number: 1
name: The receipts that cannot be read, and the banner
expected: |
  Guest, no account, in the owner's own environment — never production, never a
  worktree pointed at `.env.local`. Buy one drink token so the device holds a real
  receipt, then corrupt `resonate_drink_tokens_<eventId>` in DevTools and reload.
  The Your Drinks section must still render, carrying the sentence about not being
  able to read them, announced inside a `role="alert"` region — not a blank screen
  and not the screen of somebody who bought nothing. Nothing may suggest the payment
  is gone. The keep-this-tab-open notice must appear only once a token is Active.
awaiting: user response

## Environment rule — applies to every test below

The owner's own environment. **Not production. Not a worktree pointed at
`.env.local`** (D-41.2-04). Several tests induce failures by revoking a grant or
breaking a key; on production that is a broken night, and this project already has
one recorded incident of an agent destroying production rows.

Ordered by setup cost, not by importance: tests 1–2 need only DevTools, tests 3–6
need environment or database access. All six are the only evidence that will ever
exist — this repository has no test runner, so no green anywhere substitutes for
them.

## Tests

### 1. The receipts that cannot be read, and the banner
source: 46-05-SUMMARY.md, part (a), steps 1–6
role: guest, no account
expected: with a token visible, the keep-this-tab-open notice appears only once the token reads Active. Corrupting `resonate_drink_tokens_<eventId>` and reloading still renders Your Drinks, carrying *We could not read the drinks saved on this device — that is not the same as having none…*, inside a `role="alert"` region, with nothing implying the payment is lost. Restoring the entry brings the tokens back and the sentence goes away.
result: [pending]

### 2. The poll that used to run forever
source: 46-05-SUMMARY.md, part (b), steps 7–12
role: guest, no account
expected: block `/api/drinks/tokens*` in DevTools and start a poll. Immediately, *Your drinks are still being confirmed…*. After ten ticks — about thirty seconds — the poll **stops** (confirm in the Network panel that requests genuinely cease) and the message becomes *We could not reach the server to check your drinks. Your payment is not affected…*. Repeat with the endpoint returning 500: at the bound the message is *The server could not answer for this order…*. Before this phase the bound never fired and the poll ran forever.
result: [pending]

### 3. The night whose remaining count cannot be read
source: 46-06-SUMMARY.md
role: anonymous visitor on the public event page
expected: on a night with a quantity-limited paid tier, make the sold-count read fail (invalid `SUPABASE_SERVICE_ROLE_KEY`, or cut network to the database host) and reload. All four must hold — **no** remaining figure printed anywhere; the approved sentence beside the purchase control; **the purchase control still there and still pressable**; and no venue address that was not there before. Restoring the environment brings the figure back and removes the sentence.
warning: a page that refuses the buyer here is **the defect to report, not the success**. The owner's decision is that the control stays live and the server refuses.
result: [pending]

### 4. The closing time, seen by two different accounts
source: 46-04-SUMMARY.md
role: two — one holding `staff.manage` for the event, one not
expected: the account that may not gets *This account may not set the closing time for a night…*; the account that may, against an induced write failure, gets *Saving the closing time failed…* followed by a database code in parentheses. **Two different sentences, never one shared wording.** Each beside the control that produced it, inside a `role="alert"` region, with `data-refusal` naming the category. The word *Saved* appears in none of the three cases. On Clear against a failed write, the time field still shows the value the database holds, not an empty field.
result: [pending]

### 5. The three permissive reads inside the purchase
source: 46-03-SUMMARY.md
role: organizer or master with a signed-in session
expected: induce a transient failure on the sold-count read only, then attempt a purchase. Exactly **one** server log line of the form `[purchaseTicket.sold_count_unreadable] code=… message=…` — with a `code=` and a `message=` and **no row contents**: no `details`, no `membership_code`. Then repeat for the tier-list read and the discount-usage read (on a code with `max_uses`), expecting their own prefixes.
warning: **the purchase must NOT be refused.** It proceeds to checkout. That is the decided behaviour (D-46-05), because the real guard is `reserve_ticket` in the database, which fails closed. A refusal here is the failure to report.
result: [pending]

### 6. The refund cron that used to declare success
source: 46-07-SUMMARY.md
role: whoever watches deployments
expected: arrange for the cleanup delete to be refused (revoke the service role's delete on `drink_tokens`) with at least one redeemed or refunded token older than 24h past its menu close, then invoke the cron with its authorization header. The body must name **how many rows were asked for and how many were deleted** — `deleteRequested` non-zero beside `deleted: 0` — with `outcome` and the approved sentence; and the status must be **non-2xx**, with the run marked **failed** in the hosting dashboard, not green. Restore the grant, invoke again: `200`, `outcome: "cron_refund_ok"`, and `deleted` equal to `deleteRequested`.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0

## Gaps

[none yet]
