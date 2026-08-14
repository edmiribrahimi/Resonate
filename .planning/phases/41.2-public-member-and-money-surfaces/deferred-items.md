# Phase 41.2 — deferred items

Findings raised during execution and **carried forward rather than fixed**. Each one names
the file, the reason it is not this phase's, and what would have to be decided to close it.

`.planning/` is public: roles, never people; no venue under negotiation, no unannounced
date, no line-up, no contact.

---

## DEF-41.2-A — the refund request's refusal collapses every cause into one sentence

**Raised by:** plan 41.2-02, task 2
**File:** `src/app/(public)/tickets/[id]/RefundRequestButton.tsx` — the catch arm inside
`handleSubmit`

The catch reports whatever the action threw, or **one bare fallback sentence** when it
carried no message. The action it calls — `requestRefund` in
`src/app/(public)/tickets/refund-actions.ts:93-147` — can refuse for **three distinct
reasons**, and all three arrive on screen indistinguishable from one another and from a
network fault:

| Refusal in the action | What the holder is told |
|---|---|
| not authenticated | the action's own message, or the bare fallback |
| the ticket is not this person's, or does not exist | the same shape |
| a request is already pending on this ticket | the same shape |

The third is the one that matters most: it is the only one where the correct advice is
*wait*, and it reads exactly like the two where the correct advice is *try again*.

**Why it was not fixed here.** Rewording a money surface's refusal is a decision about what
a ticket holder is told when a refund does not go through, and this plan converts
presentation. It is the same disposition `RefundActions.tsx:75-80` already took on the staff
side of the same act, and it is the same class of finding as the four silent catches on the
money path that `41.2-CONTEXT.md`'s Phase Boundary records rather than repairs.

**What makes it more than tidiness.** This repository has **no error tracking**
(`meta-gates.md`): no production error reaches a person by itself. A refusal a holder cannot
read is a refusal nobody ever reads, and the only observable effect is a person pressing the
control again on a request that is already pending.

**To close it:** a plan that owns the copy of the refund path, naming each cause in the
holder's words, with the wording written once and used always
(`community-membership.md`, gate *un rifiuto e' una comunicazione, non uno stato*).

---

## DEF-41.2-B — `next-redirect.ts:73` names this file's call sites by line, and the lines moved

**Raised by:** plan 41.2-02, task 1
**File:** `src/lib/routes/next-redirect.ts:73` — a comment on the allow-list entry for the
drinks-menu path

That comment documents which call sites produce the entry, **by line number**, in
`GuestLoginBanner.tsx`. The conversion moved those lines. The **values** are byte-identical —
the destination string, its encoding and its parameter name are unchanged, so the allow-list
still admits exactly what it admitted — but the two line numbers in the comment no longer
point at them.

**Why it was not fixed here.** `next-redirect.ts` is not in this plan's declared file set,
and this plan's own rule is that a converted-but-still-referenced fact is reconciled on the
authority of the tree by a reconciliation plan, not on the authority of a conversion's claim.
Editing an access-control module's prose from a visual conversion is the wrong plan opening
the wrong file.

**To close it:** the phase's reconciliation wave re-measures the two call sites and updates
the comment — or replaces the line numbers with a description, which is what stops the drift
recurring at every conversion.
