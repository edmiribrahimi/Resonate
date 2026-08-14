# Phase 46: Silent Failures on the Money Path - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `46-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-08-14
**Phase:** 46-silent-failures-on-the-money-path
**Areas discussed:** perimeter (folded todo), the price a returning guest pays, when a count cannot be read, the sentences, the bar and RSVP

---

## Perimeter — folding a pending todo

| Option | Description | Selected |
|---|---|---|
| Both in | The discount usage limit and the refund cron both enter the phase | ✓ |
| Only the discount limit | Just the site in the file being opened anyway | |
| Neither, they stay todos | Phase stays on the nine plus F-46-01 | |

**User's choice:** Both in.
**Notes:** `unchecked-count-reads-decide-money-paths.md` (2026-08-10, severity high) records two
permissive reads; one is in the same function as `F-46-01`'s. The todo names this kind of phase as
its natural home. → `DI-TODO-A`, `DI-TODO-B`.

---

## The price a returning guest pays

> Recorded and then **suspended** by the members-area decision below. Kept because the
> reasoning survives if the members area does.

| Option | Description | Selected |
|---|---|---|
| Refuse and say which of the three | No payment starts; the guest reads the cause | |
| Confirm at full price | The guest is shown the new price and confirms | |
| Distinguish by cause | Refuse if dead, offer the right tier if only tier-mismatched | |
| *(free text)* | The reason appears, but the guest must still be able to buy at full price, without being sent to a different page | ✓ |

**User's choice:** free text → `D-46-01`.
**Notes:** Asked *"is my answer exhaustive?"* — it was not. Measurement of
`PendingIntentHandler.tsx:64-102` showed the resume is a bare `useEffect` with **no press at all**,
so "can still buy at full price" would otherwise mean *the payment modal opens at the higher price
by itself*. Surfaced, and it produced the follow-up below. The no-redirect half was already true.

| Option | Description | Selected |
|---|---|---|
| Halt only when the price changed | Still-valid code resumes as today; a changed price halts and waits for a press | ✓ |
| Always halt | Never resume automatically | |
| Never halt, just show the sentence | Resume as today with the reason above the modal | |

**User's choice:** Halt only when the price changed → `D-46-02`.

| Option | Description | Selected |
|---|---|---|
| Same as the other two | One fixed sentence for "does not apply to this tier" | ✓ |
| Say where it does apply | Name the tier in the sentence | |
| Move the guest to that tier | Apply the code automatically | |

**User's choice:** Same as the other two → `D-46-03`.

| Option | Description | Selected |
|---|---|---|
| Say it and return to the choice | A malformed stored intent is announced, not dropped | ✓ |
| Silence, as today | | |
| Say it only when a discount was involved | | |

**User's choice:** Say it → `D-46-04`.
**Notes:** The user first asked what "the note" meant; explained as the browser-side record
(`localStorage`, `resonate_intent`) written because there is no account yet to hold it server-side.

---

## When a count cannot be read

| Option | Description | Selected |
|---|---|---|
| Close, and say so | Refuse the purchase when a count cannot be read | |
| Close after one retry | | |
| Stay open, as today | No change to the direction | ✓ |

**User's choice:** Stay open → `D-46-05`.
**Notes:** The choice was presented with the heaviest stated cost, then **vindicated by
measurement**. `reserve_ticket`
(`supabase/migrations/20260310100000_discount_codes.sql:90`) is the real guard: it locks the tier
row `FOR UPDATE`, counts, raises `Tier sold out`, and validates `max_uses` atomically — and a failed
read in plpgsql **raises** rather than coalescing, so it fails closed. This settled the open question
`46-FINDING-01.md` left explicitly unanswered, and materially reduced that finding's severity claim.

| Option | Description | Selected |
|---|---|---|
| Fail for real, visible as a failed run | Truthful response **and** a failed exit, so the run shows red | ✓ |
| Correct response only | Stop lying, still report success | |
| The guest sees it on their tokens | | |

**User's choice:** Fail for real → `D-46-06`.

| Option | Description | Selected |
|---|---|---|
| Guest and staff both see it | The guest is told, and a staff list shows who to refund | |
| Automatic refund and email | | |
| Staff list only | | |
| Nothing — wait for the reservation phase | | ✓ |

**User's choice:** Nothing for now → `D-46-07`, recorded as an accepted risk with its cost written
beside it.
**Notes:** The user first asked *"why would the database ever refuse?"* — the explanation was
restarted from the ordering (payment first, ticket second) with the three concrete cases. The user's
position: **if a guest pays, the ticket must be issued** — and asked how xceed, Eventbrite, Shotgun,
DICE and Resident Advisor behave. Researched: the pattern is *reservation-then-commit*, hold the seat
when checkout begins, and Eventbrite exposes it as a configurable "Registration time limit". The
user's instinct is the industry norm; it is a new capability, so it became its own phase.

---

## The sentences

| Option | Description | Selected |
|---|---|---|
| What happened + what to do next | | |
| What happened only | | |
| What to do next only | | |
| *(free text)* | Guests cannot request refunds on the platform at all — staff issue them through the community's own channels | ✓ |

**User's choice:** free text → `D-46-09`. Removes the guest-facing refund refusal from the perimeter
rather than deciding its wording.

| Option | Description | Selected |
|---|---|---|
| Claude drafts, owner approves in one pass | | ✓ |
| Owner writes them | | |
| Split by sensitivity | | |

**User's choice:** Claude drafts → `D-46-10a`.

---

## The members area *(unplanned — raised by the owner mid-sitting)*

**Owner's statement:** no more members area, no user registration; authentication for
organizers and staff only. Comparable collectives run without one.

Measured in response: 3 member pages, 3 auth pages, 22 files reading profiles, 40 using the user
identity, 24 migrations with RLS policies built on `auth.uid()`. Verified about the comparables:
their nights are sold through Resident Advisor, which supplies both ticketing and accounts — so the
comparison is *our platform vs RA*, not *with vs without a members area*. Every platform checked
binds a ticket to at least an email; DICE requires an account outright.

| Option | Description | Selected |
|---|---|---|
| Narrow 46 to the survivors, decide separately | Keep building what holds either way | ✓ |
| Stop everything and decide first | | |
| Plan all nine anyway | | |

**User's choice:** Narrow → `D-46-11`, and the perimeter in `46-CONTEXT.md` `<domain>`.

| Option | Description | Selected |
|---|---|---|
| Open — take it to a professional | | |
| Membership is held elsewhere, not in our app | | ✓ |
| The venues in view don't need the club model | | |

**User's choice:** Held elsewhere, on a dedicated external service → `D-46-12`. Closes the legal
knot `legal-compliance.md` raises, and produces a new open question about verifying two credentials
at the door.

---

## The bar, and RSVP

| Option | Description | Selected |
|---|---|---|
| Guest is told **and** the bar can look it up | | |
| Guest is told only | | |
| Measure first | | |
| *(free text)* | A past public edition ran with no observed loss; unregistered guests' drink receipts survived a page refresh | ✓ |

**User's choice:** field evidence rather than an option → resolved by Claude as `D-46-10c`
(guest-facing half only; bar-side lookup deferred), with the limit of that evidence stated once: a
refresh preserves browser storage, so it exercises the working path, not the failing one.

**RSVP:** the user asked whether guests could still RSVP. Measured: `rsvp-actions.ts:13-28` requires
`auth.getUser()` **and** `status = approved` — two walls, both account-dependent. Deferred to the
members-area decision.

---

## Claude's Discretion

- Mechanism per finding; the refusal union's shape and its total `Record`; wave decomposition; the
  wording of the manual verification procedures.
- `D-46-10b` — `updateMenuClosesAt` gets two distinguishable outcomes, not one collapsed catch
  (taken by Claude, grounds recorded in CONTEXT.md).
- `D-46-10c` — guest-facing half only for the drink receipts (taken by Claude, grounds recorded).

## Deferred Ideas

Seat reservation before payment; buying more than one ticket; removing the members area; RSVP
without an account; a bar-side order lookup; two credentials at the door; the stale traceability
note at `REQUIREMENTS.md:252`. Full text in `46-CONTEXT.md` `<deferred>`.
