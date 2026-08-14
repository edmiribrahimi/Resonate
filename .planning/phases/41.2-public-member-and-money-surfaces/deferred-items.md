# Phase 41.2 — deferred items

Out-of-scope findings measured while executing this phase. Recorded so they are
not re-derived, and **not fixed here**: each is either another plan's or is an
open item with a written reason.

> **The sentence the next reader should not have to re-derive.** A plan that
> "improves" one of the four silent catches below while converting a class string
> has **changed behaviour on the money path under a visual mandate**, which is
> `41.2-CONTEXT.md`'s stop condition 2 wearing a different costume. A visual
> conversion is not where the product decides what a buyer is told when a purchase
> fails. **These are recorded, not fixed, and none is marked fixed.**

> **And the constraint that makes them worse than they look.** This repository has
> **no error tracking** — `package.json` declares no monitoring dependency, so **no
> production error reaches a human by itself**. A logged error is a place nobody
> looks. That is why "add a `console.error`" is not a fix for any of the four: a
> failure that matters needs an **observable effect** — something the guest at the
> bar, or the person on the door, actually sees. See `meta-gates.md`, *zero silent
> failures*.

**Line numbers verified against the tree on 2026-08-14** by plan 41.2-01.
`41.2-RESEARCH.md` §3.5 cites four of them and three have drifted since it was
written; the numbers below are the re-read ones. Anchor on the **predicate text**,
not on the line number — a number that moved does not fail loudly, it matches
nothing, which reads like a green.

---

## DI-41.2-01 — the claim of a guest's paid drink orders is swallowed whole

**Site:** `src/app/(public)/events/[slug]/menu/GuestDrinkMenu.tsx:66-68`

```js
claimGuestOrders(orderIds)
  .then(() => localStorage.removeItem(key))
  .catch(() => {});
```

**What is swallowed.** Every failure of `claimGuestOrders` — a server action that
attaches drink orders a **guest already paid for** to the account they have just
signed into. Network failure, server error, an order that no longer resolves: all
three produce the same empty `.catch`, and the surrounding `try` at `:69` swallows
a second class of failure on top of it.

**The consequence, on the other side of it.** A guest buys drinks without an
account, then signs in — which the product actively invites them to do. If the
claim fails, the orders stay attached to nobody. **The tokens they paid for are
not on their account**, nothing tells them, and nothing tells us. They find out at
the bar, in front of a queue, holding a phone that shows an empty list. The
`localStorage.removeItem(key)` in the `.then` is the only thing that would have
kept the fallback path alive, and it does not run on the failing branch — which is
the one mercy here, and it is accidental rather than designed.

**Route:** a separate, **non-visual** plan, owned by whoever owns what a buyer is
told when a purchase fails. Not this phase.

**Status: recorded. NOT fixed.**

---

## DI-41.2-02 — the record of which orders this browser paid for, on the write side

**Site:** `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:20-31`
(`storeGuestOrder`, the `catch` at `:29-31`)

```js
} catch {
  /* localStorage unavailable */
}
```

**What is swallowed.** The write of an order id into
`resonate_drink_tokens_${eventId}`. The comment names one cause — storage
unavailable — and the `catch` absorbs **every** cause: private browsing, a
locked-down device, a storage quota, a `JSON.parse` failure on an existing value
that got corrupted.

**The consequence.** For a guest with no account, that `localStorage` entry **is
the receipt**. Nothing else in the browser knows the purchase happened. With the
write silently dropped, a **paid** drink token becomes invisible to the person who
bought it, immediately, with no message and no alternative route to it. The money
moved; the entitlement did not become visible.

**Route:** the same separate, non-visual plan as DI-41.2-01. The two are one
decision — *what does a guest see when the browser cannot hold their receipt* —
and splitting them would produce half an answer.

**Status: recorded. NOT fixed.**

---

## DI-41.2-03 — the same record, on the read side, returning an empty list

**Site:** `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:34-40`
(`getGuestOrderIds`, the `catch` at `:38-39`)

```js
} catch {
  return [];
}
```

**What is swallowed.** Every failure of the read, collapsed into the value that
means *this browser bought nothing*.

**The consequence, and it is the sharpest of the four.** `[]` is not an error
value here — it is a **legitimate answer**. So a storage failure and a genuine
"you have not bought anything" are **indistinguishable to every caller
downstream**, and therefore to the guest. This is the newsletter defect exactly
(`CONCERNS.md`: one *"Qualcosa è andato storto"* for a network problem, a missing
key and an already-subscribed address), except that here the collapsed cases sit
on the money path and the indistinguishable outcome is *"you have no drinks"*.

**Route:** the same plan. **A fix here is not a wider `catch` — it is a third
state**: the caller must be able to tell *empty* from *unknown*, which is a change
to a return type and therefore to the component's contract, which is why it is not
a ride-along on a class-string conversion.

**Status: recorded. NOT fixed.**

---

## DI-41.2-04 — a failed token fetch reports `"unknown"`, and the poll keeps polling

**Site:** `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:403-410`,
polled from `:485-488`

```js
const res = await fetch(`/api/drinks/tokens?order_id=${oid}`);
if (!res.ok) return { tokens: [], orderStatus: "unknown" };
…
} catch {
  return { tokens: [] as TokenData[], orderStatus: "unknown" };
}
```

and the loop that consumes it, every 3 000 ms:

```js
} catch {
  // keep polling
}
}, 3000);
```

**What is swallowed.** The network answer, twice: an HTTP failure at `:404` and a
thrown fetch at `:409-410` both become `orderStatus: "unknown"` with an empty
token array, and the polling loop's own `catch` at `:485-486` discards whatever
the surrounding logic threw.

**The consequence.** `"unknown"` is the status of a token that is **on its way**
(the payment webhook has not landed yet) and also the status of one that will
**never** arrive. The guest sees the same spinner for both, forever, refreshed
every three seconds. There is no elapsed-time bound, no distinct message, and — as
above — no error tracking, so a systematically failing `/api/drinks/tokens` is
visible to nobody: not to the guest, who thinks it is still coming, and not to us.

**Route:** the same plan. It is the one of the four that also has an **operator**
side — a token endpoint failing at a party is a bar problem before it is a
software problem — so whoever owns it should decide the observable effect for both
the guest and the person behind the bar.

**Status: recorded. NOT fixed.**

---

## DI-41.2-05 — the wallet pass writes a venue field, and no visual plan will ever open that file

**This is an enumeration entry, not a defect.** Nothing here is wrong. It is
recorded because `venue-secrecy.md` requires the exit list to be **rebuilt by
reading the code** every time somebody works on a surface that can reveal an
address — *"questa lista è datata per costruzione, e un percorso dimenticato è una
fuga"* — and this phase is the moment somebody is looking at `/tickets/[id]`.

**Site:** `src/lib/apple-wallet.ts:141-147`

```js
if (data.venue) {
  pass.auxiliaryFields.push({
    key: "venue",
    label: "VENUE",
    value: data.venue,
  });
}
```

**Why it belongs on the enumeration for `/tickets/[id]`.** A wallet pass is a file
that **leaves the product**: it is downloaded, it syncs to a device, it sits on a
lock screen, and **nothing recalls it**. It is a venue exit with the same
irreversibility as the reveal mail and none of the mail's per-recipient marking.
`venue-secrecy.md`'s enumeration names `(public)/tickets/[id]/page.tsx` and
explicitly flags it as *outside this module's `paths:`, declared instead of
silenced* — the gate does not auto-load there. The wallet route hangs off that same
surface, one link away, at `/api/tickets/[id]/wallet`.

**Why it is easy to leave off, and that is the whole point.** Measured:

```
$ LC_ALL=C /usr/bin/grep -c "className" src/lib/apple-wallet.ts
0
```

**Zero class strings.** No conversion plan in this phase has any reason to open
this file, no gate in `npm run verify` reads it for anything visual, and it will
therefore never appear in a diff, a SUMMARY or a verification. A venue exit that no
plan opens is exactly the kind that falls off a list.

**What this entry does NOT claim.** It does not claim the pass leaks anything. The
field is written only when `data.venue` is populated, and whether that value is
entitled is decided upstream, on the route that builds the pass — which this plan
did **not** open and did not audit. The claim here is narrower and it is the useful
one: **the venue-exit enumeration for `/tickets/[id]` is now complete, and it has
five members, not four.** Whether the upstream entitlement is right is a question
for a plan that opens `src/app/api/tickets/[id]/wallet/`, and this is not it.

**Route:** carried into the `/tickets/[id]` plan's venue enumeration as a listed
exit. If an audit of the upstream entitlement is wanted, it is its own plan — a
`venue-secrecy.md` audit, Critical, with the owner in the loop.

**Status: recorded as enumeration. Nothing changed.**

---

*Written 2026-08-14 by plan 41.2-01, wave 0. Every `file:line` was re-read against
the tree in the same session; three of the four cited in `41.2-RESEARCH.md` §3.5
had drifted. None of the five was modified.*

---

## Entries from plan 41.2-02, appended after an add/add merge conflict

> **Both plans of wave 0 wrote this file, and only one of them declared it.** Plan
> 41.2-01 listed `deferred-items.md` in its `files_modified`; plan 41.2-02 wrote to it
> without declaring it, so the intra-wave overlap check could not see the collision and
> both worktrees created the file independently. Git reported an add/add conflict at merge
> and **nothing was lost** — both sides are kept below, in full, in the order they were
> written.
>
> **This is the hazard, arriving one wave before the fix for it.** Plans 41.2-03 through
> 41.2-18 now write to their own `41.2-NN-FINDINGS.md`, which each owns exclusively, and
> plan 41.2-20 consolidates them here in wave 8 where nothing runs beside it. Wave 0 was
> already dispatched when that change landed, so it kept the old shape and demonstrated
> exactly why the change was needed.
>
> The merge was resolved by keeping **both** sides — an append-only findings document has
> no losing side. Nothing was summarised, merged or re-worded.

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


---
---

# The consolidation — every plan's findings, in one place

*Appended 2026-08-14 by plan 41.2-20, wave 8.*

> **Nothing above this line was touched.** Everything from the top of this file
> down to the end of `DEF-41.2-B` is wave 0's — plan 41.2-01's five entries and
> plan 41.2-02's two — and it is **byte-identical** to what those two plans wrote:
> 14 446 bytes, `sha256 4595265efa0e71e304b5ad516a19409650996c472b064fcef39eb627847ef4d8`,
> measured before this append and asserted again after it. **This section is
> appended beside those entries, never over them.** An editorial fix to somebody
> else's entry is the move that produced this phase's one recorded near-miss —
> F-41.2-05-04, a whole-file substitution that rewrote two entries its plan did
> not own, caught only by reading the diff before staging.

## Why this section exists, and it is not bookkeeping

During waves 1 through 7 the plans that recorded a finding wrote it to **their
own** `41.2-NN-FINDINGS.md` rather than to this shared document. That was a
parallelism decision with a correctness reason: those plans ran in separate git
worktrees, and **two worktrees appending to one append-only document is a merge
conflict** — the exact hazard the intra-wave overlap rule exists to prevent.

**It is not a hypothetical. It happened here, in wave 0, one wave before the fix
for it**, and the record of it is immediately above this line: plan 41.2-01
declared this file in its `files_modified` and plan 41.2-02 did not, so the
overlap check could not see the collision, both worktrees created the file
independently, and git reported an add/add conflict at merge. Nothing was lost,
because an append-only findings document has no losing side.

**The cost of that decision is that the findings end the phase scattered, and a
finding nobody consolidates is a finding nobody reads.** This section pays it
back. Wave 8 is where it is safe: only plan 41.2-19 runs beside this one, and it
does not touch this file.

**What was done, and what was refused.**

- Every entry is carried **verbatim** in the four things that matter — what was
  measured, its `file:line`, why it is recorded rather than fixed, and **which
  plan found it.** The attribution is the point: *a finding without a finder
  cannot be questioned.*
- **Nothing was summarised, merged or re-worded.** Where two plans recorded the
  same underlying defect, **both are carried, with both `file:line`s and both
  finders**, and the entry says they are the same. Compressing two independent
  observations into one sentence destroys the fact that two readers saw it.
  Three entries below are of that shape — DI-41.2-22, DI-41.2-24 and DI-41.2-32.
- **Nothing was fixed.** Every entry here is deferred by construction, and this
  was the last place in the phase where a repair would have been a scope breach.
  `git status --porcelain -- src/ scripts/` was empty at every commit of this
  plan.

## The sweep — every findings file on disk, by filename, with its count

**Seventeen files. One hundred and twenty-nine entries.** Enumerated
mechanically rather than from memory, and each file's count is the number of
top-level entries it carries:

| File | Entries | Wave |
|---|---|---|
| `41.2-WAVE0-FINDINGS.md` | 10 | 0 |
| `41.2-03-FINDINGS.md` | 6 | 1 |
| `41.2-04-FINDINGS.md` | 5 | 1 |
| `41.2-05-FINDINGS.md` | 7 | 2 |
| `41.2-06-FINDINGS.md` | 7 | 3 |
| `41.2-07-FINDINGS.md` | 4 | 3 |
| `41.2-08-FINDINGS.md` | 5 | 3 |
| `41.2-09-FINDINGS.md` | 8 | 4 |
| `41.2-10-FINDINGS.md` | 6 | 5 |
| `41.2-11-FINDINGS.md` | 10 | 5 |
| `41.2-12-FINDINGS.md` | 9 | 6 |
| `41.2-13-FINDINGS.md` | 10 | 6 |
| `41.2-14-FINDINGS.md` | 4 | 6 |
| `41.2-15-FINDINGS.md` | 6 | 7 |
| `41.2-16-FINDINGS.md` | 18 | 7 |
| `41.2-17-FINDINGS.md` | 6 | 7 |
| `41.2-18-FINDINGS.md` | 8 | 7 |
| **total** | **129** | — |

**Of the 129, thirty-five headings become the thirty-two `DI-41.2-06 … DI-41.2-37`
entries below** — thirty-five and not thirty-two because three entries carry two
finders each. **The remaining ninety-four are in the ROLL-CALL at the end of this section**, each with
its heading verbatim, its file, and its disposition. **None was dropped**, and the
roll-call exists precisely so that *dropped* and *not a deferral* stay two
different words.

> **Why a roll-call rather than a `DI-` number for all 129.** This document's own
> header says what it holds: *"Out-of-scope findings measured while executing this
> phase … not fixed here."* Most of the 129 are not that. They are measurements of
> record, decisions taken with their arguments written down, repairs that landed
> inside their own plan, human rows routed to the two pass documents, and
> corrections to figures in planning documents. Giving a measurement a debt number
> would make this file's list unreadable and would put things on a debt list that
> are **not debt** — which is the same error, in the opposite direction, as letting
> a debt go quiet. **So every entry appears, and each appears as what it is.**

---

# Group M — the money path

**Read these eight together. Separately they read as small things; together they
read as one.**

Every one of them is a failure on a path that carries money, and every one of them
is **silent**: the money moves, or does not move, and **nothing tells the person it
happened to, and nothing tells us.** This repository has **no error tracking** —
`package.json` declares no monitoring dependency — so no production error reaches a
human by itself. That is why "add a log" is not a repair for any of them: **a log
is a place nobody looks.** A failure that matters needs an **observable effect** —
something the guest at the bar, the member on their phone, or the person behind the
counter actually sees.

**Wave 0 recorded four, from research.** They are `DI-41.2-01` … `DI-41.2-04`
above, and they are the guest's path through the bar.

**Four more were found during EXECUTION, and the research never saw them.** They
are the four that follow, and they are worth naming together in one sentence,
because the sentence is the finding:

> **a member's paid drink tokens rendering as if they had bought nothing; an
> organizer's menu-closing command that throws with nothing at all shown; a full
> night rendering as open with the purchase control beside it; and a discount
> that is written into a saved purchase intent and never read back, so a
> returning guest pays full price with no refusal and no trace.**

**None of the four is a catch that says the wrong thing.** Two of them have **no
handler at all**; one **coalesces a failed count to a legitimate value**; one
**writes a value and never reads it**. They are not the newsletter defect repeated
— they are four different ways for a money path to produce a **confident,
well-formatted, wrong statement**, which is worse than a blank screen because a
blank screen is distrusted.

**A note on the ordinals, carried rather than reconciled.** Four separate plans
each numbered this family from its own vantage, and the ordinals collide: plan
41.2-11 called its finding *a FIFTH silent failure*, plan 41.2-13 called a
different one *A fifth catch*, plan 41.2-15 called a third *a seventh*, and plan
41.2-17 called a fourth *the seventh*. **Each was right from where it stood and
none is corrected here.** The count that is authoritative is this group's own:
**with wave 0's four, and with `DEF-41.2-A`, this phase has recorded nine.**

---

## DI-41.2-06 — an organizer's menu-closing command throws, and nothing at all is shown

**Found by:** plan 41.2-11, wave 5, recorded as **F-11-05** in
`41.2-11-FINDINGS.md`.

**Site:** `src/app/(public)/events/[slug]/menu/PartyDrinkMenu.tsx` — `handleSave`
at `:144-146` and `handleClear` at `:153-156`, re-measured against the tree by this
plan on 2026-08-14. *(The finding cites `:145-146` and `:155-156`; the predicate
text is the assertion, not the number.)*

**What was measured, in the finder's own words.** *"Neither catches.
`updateMenuClosesAt` throws on a refused capability (`actions.ts:48,51`) and on a
failed write (`actions.ts:60`). When it does, the transition rejects,
`setSaved(true)` is never reached, the confirmation never appears — and **nothing
at all is shown**. It is not a catch that collapses causes into one message; it is
the absence of any path from a failed write to a person."*

**Why it is not the same shape as the four already recorded, and why that
matters.** *"Those four swallow an error; this one never had a handler to swallow
it with. The consequence is worse in one specific way: an organizer who believes
they set the menu to close at midnight, and did not, has a bar still selling tokens
at two — and this repository has no error tracking, so nobody learns of it until
somebody notices the effect."*

**Why it is recorded rather than fixed.** Fixing it means designing what a person
is told when a money-adjacent write fails, which is **new copy on a money path**,
and a visual conversion is not where that gets decided.

**Route:** the plan that owns what an organizer is told when a menu-closing write
fails — the same plan as `DI-41.2-01` … `DI-41.2-04`, or one beside it.

**Status: recorded. NOT fixed.**

---

## DI-41.2-07 — a member's paid drink tokens render as if they had bought nothing

**Found by:** plan 41.2-13, wave 6, recorded as **F-41.2-13-05** in
`41.2-13-FINDINGS.md`.

**Site:** `src/app/(members)/dashboard/page.tsx` — four reads whose error object is
discarded, at `:173` (the profile), `:200` (the member's tickets), `:214` (**the
member's drink tokens**) and `:256` (the member's uploads). Re-measured against the
tree by this plan on 2026-08-14: **all four line numbers still hold.**

**What was measured, in the finder's own words.** *"If that query fails,
`allTokens` is `null`, the grouping below coalesces it to `[]`,
`drinkTokenGroups.length > 0` is false, and the *My Drinks* section **is not drawn
at all**. A member who paid for drinks and whose read failed sees a dashboard that
looks exactly like the dashboard of a member who bought nothing. The same shape
holds for the ticket read: a failed read renders *No tickets yet* beside a link
inviting the person to discover events."*

**Why it is worse than the ordinary version of this defect**, again in the finder's
words: *"There is no error tracking in this repository, so the failure reaches
nobody by itself; and the wrong answer here is not a blank screen a person
distrusts — it is a **confident, well-formatted, wrong statement about what they
own**."*

**Why it is recorded rather than fixed.** *"Distinguishing *you have no tokens*
from *we could not read your tokens* is new copy on a money surface, it needs a
sentence that does not manufacture alarm, and it needs the same treatment on all
four reads or it is an inconsistency instead of a fix."*

**Route:** *"the plan that owns the dashboard's error copy."*

**Status: recorded. NOT fixed.** The four reads are unchanged context lines in that
plan's diff.

---

## DI-41.2-08 — a full night renders as open, with the control that takes money beside it

**Found by:** plan 41.2-15, wave 7, recorded as **F-41.2-15-02** in
`41.2-15-FINDINGS.md`.

**Site:** `src/app/(public)/events/[slug]/page.tsx` — three count reads, at
`:489-493` (the per-tier sold count, via the service client), `:532-536` (the RSVP
count for a capacity-bearing night) and `:637-641` (the same per-tier sold count,
for the event-level tiers).

**What was measured, in the finder's own words.** *"In all three the error object
is not destructured at all, and the value is coalesced (`count ?? 0`,
`rsvpCount || 0`). **A refused or failed count is therefore indistinguishable from
a genuine zero**, and the visible consequence is the wrong direction: a night that
is full renders as open, and the control that takes money renders beside it."*

**Why the direction is the finding.** A count that fails **low** turns *sold out*
into *available*. Nothing refuses; nothing warns; the purchase control is drawn.
The failure mode is not a page that will not sell — it is a page that sells what is
not there.

**Why it is recorded rather than fixed.** *"Deciding what a buyer is told when a
count cannot be read is a copy and product decision on a money surface, delivered
here under a visual mandate — the same reason the phase's other six are recorded.
And there is no error tracking in this repository, so a log is a place nobody
looks: a repair that only logs would not be a repair."*

**Route:** the plan that owns the public event page's purchase copy.

**Status: recorded. NOT fixed.** That plan changed none of the three.

---

## DI-41.2-09 — a discount applied before signing up is dropped when the purchase resumes

**Found by:** plan 41.2-17, wave 7, recorded as **F-17-01** in
`41.2-17-FINDINGS.md`. Its own header: *"the first that changes what somebody is
charged."*

**Sites, all three quoted from the finding:**

- `src/app/(public)/events/[slug]/TierSelection.tsx:287-290` — the discount
  identifier **is written into** the stored intent.
- `src/app/(public)/events/[slug]/PendingIntentHandler.tsx:42-47` — the intent's
  own type declares **no discount identifier**.
- `src/app/(public)/events/[slug]/PendingIntentHandler.tsx:84` —
  `purchaseTicket(intent.partyId, intent.tierId)`, **two arguments, not three**.

**Why nothing catches it.** *"The purchase action's signature takes three
(`src/app/(admin)/admin/events/actions.ts:1217`), the third being the discount
identifier, and it is **optional** — so nothing about this fails to compile, and
nothing about it fails at run time either. The value is written into the stored
intent and is never read out of it."*

**The sequence, in a person's terms, verbatim.** *"Somebody without an account
chooses a tier, types a valid discount code, sees the struck-through price beside
the reduced one, and presses buy. They are sent to register. They come back to the
same night's page. The handler resumes the purchase **at the undiscounted price**,
and nothing on the screen says the code was dropped — there is no refusal, because
nothing refused."*

**And the defect is on exactly the path a first-time guest takes.** *"The
signed-in path does not have it: `TierSelection` calls the action directly with all
three arguments … The defect exists only on the path through registration — which
is the path a first-time guest takes, and a discount code is most often given to
somebody who is not yet a member."*

**Why it is recorded rather than fixed, and the finder is explicit that it is not
caution.** *"Passing the third argument changes what the purchase action is called
with, which is a payload change on the money path — the one thing this plan's own
stop condition 2 forbids."* And it needs a decision that plan did not own: *whether
a code that has since been deactivated, exhausted or restricted to another tier
should refuse the resumed purchase or silently proceed without it.* The action
already refuses all three by throwing (`actions.ts:1393-1395`), so the answer is
probably *let it refuse* — *"but 'probably' is not a thing to settle inside a
visual conversion."*

**Route:** *"a plan that owns the guest purchase path, with the refusal copy
written for the case where a code no longer applies."*

**Status: recorded. NOT fixed.**

---

## DI-41.2-10 — a malformed stored intent is discarded in silence

**Found by:** plan 41.2-17, wave 7, recorded as **F-17-02**.

**Site:** `src/app/(public)/events/[slug]/PendingIntentHandler.tsx:69-74` — a
`catch` with no binding that removes the stored intent and returns.

**What was measured, in the finder's own words.** *"The catch has no binding, no
log and no visible effect. A stored intent that cannot be parsed is deleted, the
component renders nothing, and **the purchase somebody began simply is not there
when they come back**. To the guest it is indistinguishable from never having
pressed buy."*

**Why it is recorded rather than fixed.** *"Telling a guest that a purchase they
started could not be resumed is new copy on a money surface, and it needs a
sentence that does not manufacture alarm about an act that was never charged."*

**Route:** the same plan as `DI-41.2-09`. **Status: recorded. NOT fixed.**

---

## DI-41.2-11 — the intent is removed on the wrong side of the test

**Found by:** plan 41.2-17, wave 7, recorded as **F-17-03**. Its plan's threat
register names it **T-41.2-113**.

**Site:** `src/app/(public)/events/[slug]/PendingIntentHandler.tsx:84-90` — the
stored intent is removed **before** the test on the action's result.

**What was measured, and the finder states its reachability honestly rather than
dramatising it.** *"When that test is false the intent has **already** been
removed … The guest sees the ordinary page, the stored intent is gone, and the
purchase silently did not resume."* And: *"Read out of the action, its only return
is a success carrying a checkout identifier (`actions.ts:1477`); every other exit
throws, and a throw lands in the catch and does produce a visible refusal. So the
branch is **not reachable today** through this action."*

**Why it is recorded anyway, and this is the part worth keeping.** *"It is recorded
because the removal sits on the wrong side of the test, and a future change to what
that action returns would make a silent drop live without anybody editing this
file."*

**Route:** the same plan as `DI-41.2-09`. **Status: recorded. NOT fixed.**

---

## DI-41.2-12 — the generic fallback, at its narrower form

**Found by:** plan 41.2-17, wave 7, recorded as **F-17-04**.

**Site:** `src/app/(public)/events/[slug]/PendingIntentHandler.tsx:96` —
`setError(err instanceof Error ? err.message : "Something went wrong");`

**What was measured, in the finder's own words.** *"The banned shape `CLAUDE.md`
names from the newsletter precedent — one sentence covering every cause — is the
second arm here, and it fires only for a throw that is not an `Error`. The first
arm relays the action's own sentence, and the action's sentences are distinct per
cause. So this is the defect at its narrow end rather than at its wide one, and it
is recorded at that width rather than reported as the newsletter's twin."*

**Route:** the same plan as `DI-41.2-09`. **Status: recorded. NOT fixed.**

---

## DI-41.2-13 — the four wave-0 coordinates re-measured, appended BESIDE the entries rather than written over them

**Found by:** plan 41.2-12, wave 6, recorded as **F-41.2-12-04**, which routed the
re-measurement here in as many words: *"Plan 41.2-20 re-measures and updates, in
wave 8, where nothing runs beside it."*

**What it recorded.** All four of wave 0's silent-catch entries were still
**present and none was missing** — what had changed is that wave 6's diff moved
every line those entries cite. Plan 41.2-12 declined to backfill them, for two
reasons it stated: it might have been running beside three other plans in separate
worktrees, and *"a plan that silently repairs another plan's numbers hides whether
they were ever right."*

**How it is discharged here, and the shape is deliberate.** The numbers in
`DI-41.2-01` … `DI-41.2-04` above are **not edited**. They are wave 0's entries and
wave 0 owns their text; editing them would be exactly the near-miss F-41.2-05-04
records, and it would also erase the evidence that the drift happened. **The
re-measured coordinates are recorded here instead**, so a reader who follows a stale
number finds the current one one entry away.

| Entry | Declared by wave 0 | Measured by plan 41.2-12 (wave 6) | **Re-measured by this plan, 2026-08-14** |
|---|---|---|---|
| `DI-41.2-01` — the claim, swallowed whole | `GuestDrinkMenu.tsx:66-68` | `:119-121` | **`claimGuestOrders(orderIds)` at `:119`** |
| `DI-41.2-02` — the custody **write** | `GuestTokenDisplay.tsx:20-31` | `:107-120`, catch at `:117-119` | **`storeGuestOrder` at `:107`, its catch comment at `:118`** |
| `DI-41.2-03` — the custody **read** | `GuestTokenDisplay.tsx:34-40` | `:122-129`, `return [];` at `:127` | **`getGuestOrderIds` at `:122`, `return [];` at `:127`** |
| `DI-41.2-04` — the unknown status, and the poll | `GuestTokenDisplay.tsx:403-410`, polled from `:485-488` | returns at `:506` and `:512`, poll catch at `:588` | **returns at `:506` and `:512`, poll comment at `:588`** |

**Wave 6's coordinates and this plan's agree on all four** — nothing moved between
wave 6 and wave 8, which is itself worth recording, because it is the first time in
this phase that a re-measurement of these four came back unmoved.

**And plan 41.2-12 recorded a second thing that should not be lost:** *"Two of the
four were already off by one against the tree before this plan ran … `storeGuestOrder`
began at `:19` rather than `:20`, and `getGuestOrderIds` ran to `:41` rather than
`:40`."* A citation that was never exactly right is a different fact from a citation
that drifted, and both are now written down.

**The instruction that made all of this checkable is wave 0's own**, at the head of
this file: *"Anchor on the **predicate text**, not on the line number — a number
that moved does not fail loudly, it matches nothing, which reads like a green."*

**Status: coordinates recorded. None of the four was repaired, and none of wave 0's
text was edited.**

---

# Group C — refusals and copy, off the money path

Each of these is the same class of defect as Group M — a failure the person in
front of it cannot tell from a different failure, on a repository with no error
tracking — on a path that does not carry money. **All are recorded, none is fixed**,
for the same stated reason every time: **rewording what a person reads is a copy
decision, and a visual conversion is not where copy gets decided.**

## DI-41.2-14 — the subscribe form collapses every failure into one sentence

**Found by:** plan 41.2-03, wave 1, as **F-41.2-03-01**.
**Site:** `src/components/newsletter/NewsletterForm.tsx:64-65`, with `:62` —
`if (!res.ok) throw new Error();` — throwing with **no message**, so the response's
own status never reaches the catch either.
**Consequence, verbatim:** *"A network fault, a missing API key and an address
already on the list are **indistinguishable** — to the person reading the sentence,
and to whoever has to debug it."*
**Standing, verbatim:** *"This is the project's **named precedent** for the
pattern."* `CONCERNS.md` records it, `CLAUDE.md` operating principle 6 cites it by
name, and `src/components/ui/Input.tsx:129-136` quotes it in its own contract as
the shape a field error may never take.
**Route:** *"a `comms-analytics.md` change before it is a `nextjs-architecture.md`
one: the question is what `src/app/api/newsletter/**` is allowed to tell an
anonymous caller about an address it already holds."*
**Status: recorded. NOT fixed** — asserted by the finder as an empty diff on the
handler, the fetch, the throw and the catch.

## DI-41.2-15 — the artist dialog's catch collapses three causes into one bucket

**Found by:** plan 41.2-04, wave 1, as **F-41.2-04-03**.
**Site:** `src/components/artists/EditArtistButton.tsx:158`.
**What is collapsed, verbatim:** *"One `catch` stands behind three different
things: the action's capability assertion refusing, the database update failing
(`actions.ts:235` throws `Failed to update artist: …`), and the request never
arriving at all. In a **production build Next redacts a thrown Server Action
message**, so the first branch degrades to a digest sentence and the second bucket
is what a person actually reads."*
**Why not fixed:** it needs *"a **result union** returned by `updateArtist` instead
of a thrown `Error`"*, and building it *"would mean **opening a server action**,
which is this phase's stop condition 2 and an explicit halt."*
**The remedy is written out for whoever takes it:** give `updateArtist` a
`{ ok: true } | { ok: false, reason: … }` return, then copy
`EditVenueButton.tsx:76-101` and `:176-193` — a total `Record` over the refusal
union, so a new refusal becomes a compile error rather than a blank panel.
**Status: recorded. NOT fixed.**

## DI-41.2-16 — the listing's catch collapses every query failure into an empty page

**Found by:** plan 41.2-06, wave 3, as **F-41.2-06-04**.
**Site:** `src/app/(public)/events/page.tsx:512-516`, byte-identical before and
after that plan.
**What it costs, verbatim:** *"Its observable effect is a page that says 'No
upcoming events' on the product's shop window."* The two *named* failure categories
around it are already correct and were left as they were — a database-level refusal
carries a code and is thrown past this catch (`:520-522`), and a refused set of
venue names is thrown after it in its own category (`:527-529`). **This catch is
the residue**: a transport failure with no code.
**Why not fixed:** *"Distinguishing it would mean giving the empty state a second
sentence, which is a copy decision on a public surface."*
**Status: recorded. NOT fixed.**

## DI-41.2-17 — the referral control reports success it did not have

**Found by:** plan 41.2-07, wave 3, as **F-41.2-07-01**.
**Site:** `src/components/membership/CopyReferralLink.tsx:76-83` (post-conversion;
the same statements sat at `:25-32` before that plan).
**What was measured, verbatim:** *"the clipboard call can reject … inside the
`catch`, `inputRef.current` can be `null`, in which case **no copy is attempted at
all** … `document.execCommand("copy")` returns a boolean saying whether it worked,
and **the return value is discarded**. Past all three of those, `setCopied(true)`
runs on the next line regardless, so the control says *Copied!* for two seconds
whether or not anything reached the clipboard."*
**Why it is worth an entry, verbatim:** *"The value on the clipboard is the
community's entry path. A person who believes they have copied a referral link and
pastes nothing sends an empty message to somebody they meant to invite, and finds
out — if ever — from the person who did not arrive."*
**Why not fixed:** it is pre-existing and byte-identical across the conversion, and
telling the two failures apart *"is a rewrite of this surface's words"*. Collapsing
both into one new sentence *"would reproduce the newsletter precedent"*.
**Route:** a plan that owns the referral surface's copy.
**Status: recorded. NOT fixed.**

## DI-41.2-18 — a refusal that names one cause for two

**Found by:** plan 41.2-14, wave 6, as **F-41.2-14-01**.
**Site:** `src/components/auth/ResetPasswordButton.tsx:44` and `:66`, rendered at
`:86`.
**What was measured, verbatim:** *"`:44` — `if (!user?.email)`: the session
resolved, but the account carries no address to send to. `:66` —
`setStatus(error ? "error" : "sent")`: the provider refused the send. Both draw the
same four words at `:86`. A person who meets it cannot tell an account without an
address from a provider that would not send, and the two have different next steps
— the first is not retryable and the second is, while the sentence says *try
again* to both."*
**Why not fixed:** *"Rewording a refusal changes what a person reads, which is
outside a visual conversion's remit. The wording was carried across the conversion
**byte-identical**, deliberately."*
**What closing it would take:** *"two sentences, one per cause, in the shape
`venues/EditVenueButton.tsx:76-85` uses — a total `Record` over the causes, so a
third cause becomes a compile error rather than a blank state."*
**Status: recorded. NOT fixed.**

## DI-41.2-19 — a share that fails tells nobody, and looks like a press that did not land

**Found by:** plan 41.2-18, wave 7, as **F-41.2-18-03**.
**Site:** `src/app/(public)/events/[slug]/ShareButton.tsx` — the clipboard branch's
catch, an empty block carried across **byte-identical**.
**What was measured, verbatim:** *"If that write is refused — permission, an
insecure context, focus lost — the catch absorbs it and **nothing at all
happens**: no glyph change, no message, no sound. It is indistinguishable from a
press the page never received, so the person presses again, and again."*
**And the finder distinguishes the neighbouring catch rather than sweeping it in:**
*"The catch beside it is a different case and is correctly silent: a person who
dismisses the system share sheet has cancelled, and telling them so would be
telling them what they just did."*
**Why not fixed:** *"A message here is **new copy on a public surface**."*
**Status: recorded. NOT fixed.**

## DI-41.2-20 — five distinguishable RSVP refusals arrive as one opaque sentence

**Found by:** plan 41.2-18, wave 7, as **F-41.2-18-04**.
**Site:** `src/app/(public)/events/[slug]/RsvpButton.tsx` renders `err.message`;
the causes are in `src/app/(public)/events/[slug]/rsvp-actions.ts`, which that plan
**read and did not open**.
**The five causes and their correct advice, carried from the finding:** not signed
in → *sign in*; the account is not approved yet → *wait, and this one is not the
person's to fix*; this night does not take RSVPs → *nothing; the control should not
have been drawn*; an RSVP already exists → *you are already in*; the insert failed
→ *try again*.
**Why they cannot arrive distinguishable, verbatim:** *"Next **redacts** the
message of an error thrown out of a Server Action in a production build …
`MediaUpload.tsx`'s own header states this and works around it by separating its
failures **by position** — which call in the sequence threw — because position
survives the redaction and a message does not. This control has no such
separation."*
**And the sharpest sentence in the finding, which is a community-membership point
rather than a UI one:** *"the branch where the right advice is *you are already in*
reads exactly like the one where the right advice is *your account is not approved
yet* — and the second is a statement about someone's standing in the community,
delivered as a generic failure."*
**Why not fixed:** it needs either member-facing copy rewritten or a change to what
the action returns, and the action carries the server directive — **stop condition
2**.
**Status: recorded. NOT fixed.**

---

# Group B — the product's own words, and a surface that shows a member nothing

## DI-41.2-21 — a member-facing label writes the brand with the wrong grafia

**Found by:** plan 41.2-07, wave 3, as **F-41.2-07-02**.
**Site:** `src/components/membership/MembershipCardView.tsx:80` — the label above
the member's name, **inside the card a person presents at a door**.
**What was measured:** the string reads the brand with a capital and no colon.
`brand-visual-system.md`'s grafia gate applies **everywhere**, not only to artwork:
*"Si scrive `re:sonate` con la e normale — nelle grafiche, nell'app, nelle mail, in
prosa, ovunque."*
**Why it is recorded rather than corrected, verbatim:** *"It is **copy** … It is
also not a one-line fix in isolation — the same label almost certainly recurs on
other member-facing surfaces and in the e-mail templates, and a brand correction
applied to one of them makes the product inconsistent in a way that is harder to see
than the original error."*
**What closing it requires, and this is the operative part:**
`production-calendar.md`'s rule for a sigla change applies by the same logic —
**the change is accompanied by a census of where the old form has already gone out,
and the census is closed by declaring it closed.**
**Route:** a copy pass over the member-facing surfaces and the e-mail templates,
with the census.
**Status: recorded. NOT fixed.**

## DI-41.2-22 — `/attendance` is a declared surface whose only reachable branch is a stub

> **TWO plans recorded this, independently, from two different vantages. Both are
> carried, with both `file:line`s and both finders, and they are the same
> underlying defect.** Compressing them into one sentence would destroy the fact
> that two readers saw it — and in this case the second reader saw something the
> first could not.

**Finder 1 — plan 41.2-07, wave 3, as F-41.2-07-03.**
**Site:** `src/app/(members)/attendance/page.tsx:66-67` — a `TODO` comment and a
hardcoded empty array literal, both inherited unchanged.
**What was measured, verbatim:** *"`attendances` is declared as an empty literal
and nothing writes to it, so **the empty branch is the only branch a member can
ever reach**: the page says *0 events attended* and *No attendance recorded yet* to
every member, including one who has been to every night. The list branch is real
markup that has never rendered."*
**Why it matters, verbatim:** `nextjs-architecture.md`'s empty-state gate names
exactly this shape — *"una lista vuota identica a una lista non ancora caricata e'
un guasto silenzioso con una faccia neutra"* — *"and this is the harder version of
it: a list that is empty because nobody wrote the query, wearing the face of a
member with no history. The surface is reachable in production today."*
**Why not fixed:** *"Fetching attendance rows is a **query**, and this plan changes
no query and opens no server action (stop condition 2). It is also not a
conversion-shaped task: it needs a decision about what an attendance record *is* —
a scanned membership code at a door, a redeemed ticket, or an RSVP — and that
decision belongs with the door, not with a stylesheet."*
**A note that saves the next person work, verbatim:** *"the list branch **was**
converted by this plan even though it does not render … So the work waiting is the
query and the decision behind it, not the markup."*

**Finder 2 — plan 41.2-09, wave 4, as F-41.2-09-06**, the reconciliation that
declared the surface.
**Same site.** What the second reader added, verbatim: *"What changes at this plan
is not the stub but its status: the surface is now **declared converted**, and a
declared surface is one the gates walk and one the phase counts among its ten. **A
surface can be converted and still show a member nothing**, and those are two
different claims that the word *converted* does not distinguish."* The
qualification was written into the `CONVERTED` entry itself *"— not only into a
SUMMARY — so the next reader of that list meets the qualification where the claim
is made."*

**Route:** a member-surface feature plan that owns the query and the definition
behind it.
**Status: recorded twice. NOT fixed.**

---

# Group S — structural, each needing a decision this phase was not allowed to take

**Four of the seven below close only by editing a spine file, and 41.2 does not
edit the spine** — the four files that bridge to Phase 42 are the one thing this
phase may not touch, and needing to is a **halt**, not a judgement call. They are
recorded here so the next reader does not re-derive the argument, and so that
whoever does own the spine meets the case already made.

## DI-41.2-23 — there is no top-level heading rung without the display face

**Found by:** plan 41.2-03, wave 1, as **F-41.2-03-03**.
**Site:** `src/components/ui/Typography.tsx:34-42` — the display role's exclusion
list, which ends: *"And not on **any format name**: `SunSet`, `RamaDub`,
`MotionLab` and `re:sonate` are read, not decorated, and a phase that let the
display face onto a format name would be making a brand decision in a file every
surface imports."*
**The gap, verbatim:** *"there is no body-or-plain heading rung. `Typography.tsx`
exports `PageTitle` and `SectionHeading` and nothing that renders a top-level
heading **without** the display face. A surface whose title must be a format name in
the reading face has no primitive today. It did not block this plan; it will block
the first surface whose heading is a format name."*
**Status: recorded. Not built — a new rung is a spine edit.**

## DI-41.2-24 — a filled internal-navigation action is hand-written, twice, for the same reason

> **TWO plans recorded this. Both are carried with both finders, and the second
> re-derived it from the tree rather than citing the first.**

**Finder 1 — plan 41.2-03, wave 1, as F-41.2-03-04.**
**Why the primitive was declined, verbatim:** `src/components/ui/Chip.tsx:68-69` —
*"the only filled form is `CHIP_SELECTED`, and `:178` binds it to `selected`, which
is also what emits `aria-current`. A landing call to action is not *the current item
among its siblings*, so taking the fill means making that claim falsely to every
assistive technology that reads it."* Overriding the unselected form from the call
site is the **WR-05 trap** named at `src/components/ui/PageShell.tsx:109-114` — same
property, same specificity, so emission order decides rather than the class list.
And `Chip.tsx:289-293` closes `Button` with an `href` for the rest of this phase:
it renders a bare anchor, which in the App Router is a full document load.
**The consequence it recorded:** *"two converted surfaces now hand-write the same
geometry for the same reason. **A third occurrence is the case for a rung**, not a
third copy."*

**Finder 2 — plan 41.2-05, wave 2, as F-41.2-05-05**, which re-derived the count
from the tree rather than taking the sentence:
```
$ LC_ALL=C /usr/bin/grep -rn 'inline-flex min-h-11' src   ← then filtered to accent-filled anchors
src/app/page.tsx:144
src/app/(admin)/admin/(work)/events/page.tsx:193
```
*"Two, and the tree agrees with the finding."* And its reason for not acting: the
trigger the first finding set is a **third**, *"and building a rung on a count of
two is deciding on an argument rather than on a measurement"* — and, binding,
*"a new rung is an edit to `src/components/ui/Button.tsx` or `Chip.tsx`, and **41.2
does not edit the spine.** Needing to is a halt, not a deviation."*
**Route:** *"whichever plan next needs a filled internal-navigation action … if one
of them writes the shape a third time, the rung is owed before the fourth."*
**Status: recorded twice. Not built.**

## DI-41.2-25 — the 44px floor is declared in two places, and closing it needs a spine edit

**Found by:** plan 41.2-06, wave 3, as **F-41.2-06-03**.
**Site:** `src/app/(public)/events/FormatFilterRow.tsx` (two declarations) and
`src/components/ui/Chip.tsx` (two more).
**Why the primitive was declined, verbatim:** the chip's only filled form is its
selected state and that fill is *the interaction accent* — *"Handing the current
format chip to it puts the interaction hue on the format channel, which this file's
own docblock refuses in as many words: 'That accent is barred from the format
channel: the moment one channel borrows the other, a format stops being
identifiable.'"* And *"the selected state is also what emits `aria-current`"*, so
declining the fill would silently drop the only non-colour channel the current chip
has.
**The honest state, verbatim:** *"That is the honest state and it is a cost: two
declarations of one number … **It is not a duplication that a later plan should
close by adopting the primitive** — the two reasons above do not expire. If it is
ever closed, what is needed is a chip form whose *selected* state is ground and ink
rather than an accent fill, and that is a new rung on a spine file, which 41.2 may
not edit."*
**Status: recorded. Not closed.**

## DI-41.2-26 — the lineup pills lose the accent, and closing it needs the same spine rung

**Found by:** plan 41.2-15, wave 7, as **F-41.2-15-03**.
**Site:** the lineup pills on `src/app/(public)/events/[slug]/page.tsx` —
`41-UI-SPEC.md` §6.4 names the file **by line** as the tree's canonical 20px target.
**The cost, stated by the finder rather than smoothed over, verbatim:** *"§5.1
lists *the lineup pills on an event card* among the four things the accent is for,
and the chip's unselected form is a neutral outline. So the accent tint is **lost**,
and this is a loss and not a correction."*
**The road refused, and why:** taking the chip's `selected` fill *"would have
bought a hue with a false assistive-technology statement"*, and re-applying the
tint from the call site is the WR-05 trap again.
**What would close it, verbatim:** *"a chip form whose selected state is not an
accent fill — a new rung on a **spine** file, and **41.2 does not edit the
spine**."*
**Status: recorded. Not closed.** *(It is the same missing rung as `DI-41.2-25`,
met from a third surface. The two are recorded separately because two plans measured
two different files and neither was told about the other.)*

## DI-41.2-27 — a 44px floor and a deliberately-small target, on the same screen

**Found by:** plan 41.2-10, wave 5, as **F-10-05**.
**Site:** `src/app/(public)/events/[slug]/RedeemConfirmationModal.tsx:156` — the
bartender's revert control, *"about **28 px** tall on purpose — 'kept narrow so the
bartender's tap can't hit it by mistake'"*, against §6.1's 44px floor.
**The contradiction, verbatim:** *"Raising it to the floor would make the
money-reversing control **easier** to hit in exactly the conditions §6.1 exists for.
Leaving it below the floor leaves an undersized target on a public surface."*
**Why it is recorded rather than resolved:** `verify-touch-targets` *"does **not**
name this file today, before or after, so nothing is currently red — which is why
this is recorded rather than resolved: it is a live contradiction between two house
rules, and the resolution is a decision about the bar, not a class string."*
**Status: recorded. Unresolved, and it is the open half of D-41.2-06.**

## DI-41.2-28 — a near-miss of the section-heading string, in a file no plan opened

**Found by:** plan 41.2-11, wave 5, as **F-11-08**.
**Site:** `src/app/(public)/events/[slug]/menu/UserTokenDisplay.tsx:42` — a section
heading written by hand that differs from `SectionHeading`'s own string
(`src/components/ui/Typography.tsx:127`) on **two axes: the margin step and the
face-and-size pair.**
**Why the file was not opened, verbatim:** *"the plan's criterion for this file is
explicit and no ratchet measures the divergence, so opening it would be a change no
gate asked for"*, and *"D-41-11 says 'a surface that writes the string is equally
converted' — and this is not that string, so the question is whether the near-miss
should become the string, which is one decision for a family of sites and not one
file's to take alone."*
**Status: recorded. File not opened; both ratchet greps read 0 and the diff is
empty.**

## DI-41.2-29 — an HTML entity inside a string literal renders as its own characters, and the class survives the fix

**Found by:** plan 41.2-14, wave 6, as **F-41.2-14-02**.
**Site:** `src/components/media/MyMediaSection.tsx:170`, as the file stood before
that plan (commit `c5d60d2^`).
**What was measured, verbatim:** *"JSX decodes HTML entities in **text nodes**, not
in **string literals**. Two lines in the same file proved both halves of that:
`:152` and `:192` wrote the same kind of entity as JSX text and decoded correctly,
while `:170` wrote it inside a string and did not. So the delete control did not
show a cross — it showed the eight characters of the entity itself."*
**Why it is here even though the instance is gone, verbatim:** *"fixed as a side
effect, not as a repair … Recorded because the *class* of defect survives the fix:
an entity inside a string literal renders, compiles and looks wrong only to somebody
who opens the page. **A grep for entity sequences inside string literals across the
tree has not been run** and is not this plan's scope."*
**Status: the instance is gone. The class is unmeasured, and the sweep is owed.**

## DI-41.2-30 — a colour name that was never declared, used twice, silently

**Found by:** plan 41.2-18, wave 7, as **F-41.2-18-01**.
**Site:** `src/components/media/MediaUpload.tsx`, two text-colour utilities — before
that plan at `:516` and `:528`.
**What was measured, verbatim:** the colour name *"is not declared anywhere"* —
`src/app/globals.css` maps twenty-two colour names and it is not among them — so
*"Tailwind emits no rule for a colour it has never heard of, so both elements
rendered at whatever colour they inherited. Concretely: the name of the night a file
was about to be filed under was drawn no stronger than the sentence around it, on the
one control where the whole point is that nobody uploads without seeing where the
file is going."*
**Why no gate saw it, verbatim:** *"`verify-tokens` check D tests the names that ARE
declared but not yet exposed as utilities — a name that was **never declared** falls
outside every list it holds. The build is silent too: an unknown colour is not a type
error. The only observable is an absence on screen."*
**The instance was repaired** — *"because the repair IS the conversion"* — and both
now take the declared ink token, measured at two occurrences tree-wide and both in
that file.
**What is owed, verbatim:** *"To close the class: a check that the colour name in
every colour utility under `src/` resolves to a declared token. **That is a gate
edit, and this plan edits no gate.**"*
**Status: the two instances are gone. The class is open, and it is a gate item.**

---

# Group V — the venue, and a render mode nobody declared

## DI-41.2-31 — eight of this phase's ten surfaces are dynamic by DERIVATION and do not say so

**Found by:** plan 41.2-08, wave 3, §2 of `41.2-08-FINDINGS.md`. **It is a question
owed to the owner, and that plan explicitly did not answer it** — `grep -c
'force-dynamic'` on the page file returns **0** after its diff, *"asserted
mechanically, so the question cannot have been answered by accident."*

**The measurement, from the build's own route table:** `/tickets/[id]` is
`ƒ (Dynamic) server-rendered on demand`. *"So the route **is** dynamic today. **It
does not say so.** It is dynamic only because something in its tree reads a session
— `getAccessContext()` at `:102` and `supabase.auth.getUser()` at `:88`. Two of this
phase's ten surfaces declare their render mode; this is one of the eight that derive
it."*

**What the one-line declaration would close, verbatim:** *"a later edit that moved
the session read would make this page static again with no error and no warning. A
statically rendered ticket surface is a shared artefact carrying a venue line"*, and
`venue-secrecy.md` is explicit — *«ogni superficie che mostra il venue va marcata
come dinamica e non cacheabile»*. *"Today this surface satisfies that gate **by
derivation**, which is to say it satisfies it until somebody refactors something
unrelated."*

**Why the plan refused to take it, and the reasoning is the part to keep, verbatim:**
*"A conversion that hardened a venue guard on its own authority would be doing the
right thing by the wrong route, and the next conversion would do the wrong thing by
the same route. The direction of the change is not what makes it safe — the
authority for it is."*

**The question, in the form it should reach the owner** — carried verbatim rather
than re-composed:

> Eight of this phase's ten surfaces render on demand only because something in
> their tree reads a session. Should `/tickets/[id]` — which renders a venue line
> and a ticket — **declare** its render mode, as the public event page does?
>
> - **Cost if taken:** one line, in a plan that owns the decision.
> - **Cost if not taken:** the surface keeps satisfying the no-stale-venue gate by
>   accident, and the accident is one unrelated refactor deep.
> - **What it is not:** it does not change who sees the venue line. The predicate is
>   untouched either way.
> - **Scope note:** if it is taken, the same question applies to the other seven
>   derived surfaces, and answering it once for all eight is cheaper and more
>   consistent than eight separate answers.

**Plan 41.2-09 re-stated it after declaring the surface, verbatim:** *"declaring the
surface in `CONVERTED` does not answer it, and no gate in this repository would go
red if the derivation stopped holding."*

**Status: open. An owner's question, unanswered, and no gate watches it.**

## DI-41.2-32 — the wallet pass carries a venue field, and no visual plan will ever open that file

> **TWO plans recorded this, from opposite directions. Both are carried.** Wave 0
> recorded it as an **enumeration entry** on the exit list; wave 3 rebuilt the exit
> list by reading the code and found the same exit as its **third** member, with the
> route that feeds it. They are the same underlying item.

**Finder 1 — plan 41.2-01, wave 0**, already above as **`DI-41.2-05`**, at
`src/lib/apple-wallet.ts:141-147`. Its narrow claim: *"the venue-exit enumeration
for `/tickets/[id]` is now complete, and it has five members, not four."* It
explicitly declined the wider claim — it does **not** say the pass leaks anything.

**Finder 2 — plan 41.2-08, wave 3**, §1 of `41.2-08-FINDINGS.md`, exit 3 of three:
`src/lib/apple-wallet.ts:141-145`, **reached from
`src/app/api/tickets/[id]/wallet/route.ts:35,70`**. What the second reader added and
the first did not have: *"The route re-selects the night's free venue text on its own
(`:35`) and hands it over as `venue` (`:70`). Its select does **not** carry the
secrecy flag at all, so this exit is **ungated by construction rather than by
omission**."*

**The irreversibility class, verbatim:** *"A wallet pass **leaves the product**. It
is signed, downloaded, added to a device, and it syncs from there to that person's
other devices. **Nothing in this product can recall it** … That is **the same
irreversibility class as a sent reveal e-mail** … A wallet pass is that with a longer
tail, because it persists on the device rather than in an inbox."*

**Why it falls off enumerations, measured:** `src/lib/apple-wallet.ts` carries
**zero** class strings, *"so no visual plan has any reason to open this file, and a
perimeter built from class strings cannot see it."* Neither plan edited it.

**And a second divergence the same finding recorded, at `/tickets/[id]`:** that
surface and the public event page hold the same secret under **two different
predicates** — on the event page a ticket holder reaches the address through that
page's reveal predicate; here *"a ticket holder sees the night's free venue text
always — the predicate is exit 1's, and it consults nothing."* The divergence is
**deliberate and documented in the file itself**, and this phase did not change it,
proved by four assertions including the select's column list as a multiset (15 tokens
before, 15 after) and the render block byte-identical including leading whitespace.
*"What would have been wrong to do: reconciling the two predicates. That is a
behaviour change on the one act in this product that has no undo."*

**Route:** *"If an audit of the upstream entitlement is wanted, it is its own plan —
a `venue-secrecy.md` audit, **Critical**, with the owner in the loop."*

**Status: recorded twice as enumeration. Nothing changed, and no claim of a leak is
made.**

## DI-41.2-33 — four things on the public event page, recorded and never repaired

**Found by:** plan 41.2-15, wave 7, §5 of `41.2-15-FINDINGS.md`. All four are on
`src/app/(public)/events/[slug]/page.tsx` and all four are carried verbatim:

| # | `file:line` | What | Why not there |
|---|---|---|---|
| 1 | `:852-859` | *"the back control's only content is an arrow glyph; it carries no accessible name, so a screen reader announces the character"* | *"Adding one is a copy decision on a public surface, and `41-UI-SPEC.md` §11's contract is *no copy introduced*. The control did gain the 44 px floor and the focus expression"* |
| 2 | `:773-786` | *"the media-upload capability resolution catches per night and logs; an unresolved night is withheld and is **indistinguishable from an unassigned one**"* | *"The file already records this, in its own words, including that the log reaches nobody. It is an access-path decision, and it belongs to no requirement of this phase"* |
| 3 | `:796-805` | *"the per-night attendance arm reads a table name that is not the table's name, frozen deliberately by an earlier plan because repairing it **widens who may upload**"* | *"An access decision. Frozen twice now, and this is the second file to say so"* |
| 4 | `:594-598` | *"the per-night venue function **does not exist in the live database**; the migration was deliberately not applied"* | *"Declared in the file already. This file and that migration ship as one act, and shipping is not this plan's"* |

**Rows 2 and 3 are access-path items and row 4 is a deployment item, not a visual
one.** Row 3 in particular is a repair whose direction **widens** who may upload —
which is why it was frozen rather than fixed, twice, by two different plans.
**Status: recorded. None repaired.**

---

# Group R — regressions accepted with their direction stated

## DI-41.2-34 — a guest gains ~64px of empty space on a phone, and the direction is why it was accepted

**Found by:** plan 41.2-11, wave 5, as **F-11-02**.
**Site:** `src/app/(public)/events/[slug]/menu/page.tsx` — the two conditional
bottom paddings wave 0 §7.2 row 5 said must survive the maximum's deletion.
**What happened, verbatim:** *"They did not survive, and the thing the caution
protects is nevertheless protected — by the mechanism built for it."* The
arithmetic, from `src/components/ui/PageShell.tsx:51-67` and
`src/app/globals.css:319-348`: signed-in on a phone, 96px before and 96px+ after —
value-preserving; signed-in at 768px and above, 96px before and 16px after —
**corrected**, because *"the hand-written 96px becomes dead space the moment the bar
leaves the bottom edge"*; guest at 768px and above, 32px → 16px — closer to the
phase's rhythm.
**The regression, named by its finder rather than smoothed over, verbatim:** *"The
guest's +64px is a real regression and it is recorded rather than corrected. A guest
sees ~64px more empty space below the last row on a phone, because the shell reserves
for a bar this page does not draw for them. **It is the safe direction — too much
clearance never hides a row, too little does** — and correcting it would mean a page
overriding the one measurement `PageShell` exists to own, which is how 47 pages came
to each answer the same question separately."*
**And the option that was not available:** *"Keeping the pair was not an option that
leaves the page correct: the shell's padding and a retained `pb-24` are additive, so
a signed-in visitor on a phone would have got 192px."*
**Status: recorded. Not corrected, and the direction is the argument.**

---

# Group G — figures, censuses and criteria that will be read again

**These are not product defects. They are numbers and criteria that other documents
carry and that a later reader will otherwise re-derive or, worse, quote as they
stand.**

## DI-41.2-35 — the pulse census counts two different things, and four documents carry the arithmetic that assumed one

**Found by:** plan 41.2-18, wave 7, as **F-41.2-18-06**. Its own header: *"Not a
defect. A correction to a number four documents carry, recorded because wave 8 is
about to read it."*
**What was measured:** a census by bare string returns **twelve** occurrences —
1 in `RedeemConfirmationModal.tsx`, 1 in `DrinkTokenCard.tsx`, 2 in
`menu/GuestTokenDisplay.tsx`, 4 in `admin/scanner/ScannerClient.tsx`, 4 in
`ui/Skeleton.tsx`.
**The honest arithmetic, carried verbatim:**

| Kind | Count |
|---|---|
| the placeholder primitive's own, one per export | 4 |
| an attention animation, on a control or a badge | 7 |
| **a hand-rolled loading placeholder** | **1** — and it is inside the Phase 42 fence |

*"Hand-rolled loading placeholders remaining outside the primitive and outside the
fence: **zero**. That is the sentence the plan was reaching for, and it is true. The
sentence about *twelve* would not have been."*
**Why it matters beyond bookkeeping, verbatim:** *"A census that cannot tell a
placeholder from an attention animation will report a number that never reaches zero,
and a list that can never reach zero is a number that lies — which is the argument
this tree already used to keep a permanently-exempt file off a debt list. **If wave 8
wants this counted, it needs a signature that distinguishes the two, not a smaller
number.**"*
**Read by this plan, and acted on by not acting:** no census of this kind appears in
either pass document, precisely because the signature that would make it honest does
not exist yet. **Status: recorded. The signature is owed to whoever wants the count.**

## DI-41.2-36 — a criterion that can only be met by deleting the sentence it was written to protect

**Found by:** plan 41.2-18, wave 7, as **F-41.2-18-07**. Also *"Not a defect."*
**What was measured.** That plan's acceptance criteria assert that a
case-insensitive search for a small set of place words returns **0** on the upload
component and on the share control. **It does not — before or after the diff — and
in both cases what it matches is correct and must not be removed.**

- **The share control: one hit, before and after** — and it is the **browser API**
  the control reads to know which page it is on. *"It is the URL the control exists
  to share. Deleting the word deletes the feature."* With that API's own name out of
  the alternation the criterion returns **0** on all three of the task's files.
- **The upload component: three hits, before and after.** Two are **user-facing
  refusal sentences** — the one explaining why a video cannot be accepted on a night
  whose whereabouts are secret, and the one explaining why a failed metadata strip
  loses the upload rather than publishing it. *"Those two sentences are the entire
  reason the seventeen server-side categories exist."* The third is a comment
  explaining why the night picker has no preselection, *"which is the argument that
  keeps a photograph from being filed under the wrong night."*

*"**None of the five names a place.** They name the *category* — which is what the
gate protecting this file actually watches, and that gate is green."*
**And the sentence this consolidation exists to carry, verbatim:** *"All five were
left byte-identical, deliberately. **Rewording a refusal to move a number is
silencing the number without changing the thing** — the mechanism this phase has
recorded and refused before. A criterion that can only be met by deleting the
sentence it was written to protect is a criterion to correct, not a sentence to
delete."*

> **The alternation itself is NOT spelled here, and that is deliberate.** This
> phase has three recorded instances of prose destroying the measurement it was
> describing — twice in a docblock and once in a census — the sharpest being
> F-11-09, where a docblock explaining that a count was zero **made the count
> five**. `.planning/` is scanned by the same greps. So this entry describes the
> needle rather than writing it, and a reader who needs the exact alternation reads
> it in `41.2-18-FINDINGS.md`, where it belongs to the plan that measured it.

**Status: recorded. The criterion is owed a correction, not the files an edit.**

## DI-41.2-37 — wave 0's spine-exclusion baseline cell is wrong, and the Δ of 0 was the tell

**Found by:** plan 41.2-05, wave 2, as **F-41.2-05-02**; **confirmed by** plan
41.2-09, wave 4, as **F-41.2-09-03**, which recorded that the figure *"moved for the
first time in this phase, which is what F-41.2-05-02 predicted."*
**What was measured.** `41.2-WAVE0-FINDINGS.md` §2.1 tabulates *excluded as converted
spine* as **13 / 13 / Δ 0**. Measured on the tree from the gate's own header, it was
**9** at 28 surfaces and **9** at 31 — *"The gate did not change … Therefore the
baseline cell cannot be 13 on the same gate over the same closure, and the most likely
mechanism is the dry-run figure copied across into the baseline column."*
**The generalisable part, verbatim:** *"The Δ column is where it should have been
caught … **A Δ of 0 on a row that ought to move is the same signal as a count that
falls for the wrong reason**, and it deserves the same treatment: re-measure before
quoting."*
**Why nothing was changed:** *"No plan in this phase reads the spine-exclusion figure,
and editing another plan's findings document to correct a cell is exactly the move the
manifest's own wave blocks refuse."*
**Not corrected here either, for the same reason.** `41.2-WAVE0-FINDINGS.md` is plan
41.2-01's document; this entry is the correction, recorded beside it rather than
written into it.
**Status: recorded. Wave 0's cell stands, with its correction one document away.**

---

# The roll-call — the other ninety-four entries, none dropped


### `41.2-03-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-41.2-03-02 — Task 1's `<h1>` criterion cannot be satisfied by the action that produces it | closed in its own plan | a plan-internal contradiction, resolved toward the intent the `must_haves` state: assert the primitive's call site, not the tag |
| F-41.2-03-05 — Wave 0 assigns `/` to plan 41.2-02; the tree assigns it to 41.2-03 | closed in its own plan | a documentation drift — the disposition was applied exactly as written; only the plan number attached to it was wrong |
| F-41.2-03-06 — The visual changes these two surfaces owe a human, listed for the release pass | human rows | seven visual consequences, routed by their finder to the release pass. They are carried by `41.2-RELEASE-PASS.md` §1, §2 and §5 |

### `41.2-04-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-41.2-04-01 — Two documents assign the phase's first `TYPOGRAPHIC_MEASURES` entry to two different plans, and this plan did not write it | closed after the fact | the entry now exists — `verify-conversion.mjs:1072`, `TYPOGRAPHIC_MEASURES`, written by plan 41.2-05 in the same commit as the declaration, as D-41-16 requires |
| F-41.2-04-02 — The measure line's leading whitespace moved by two spaces; its class string did not | record of measurement | the measure line is two spaces deeper and its class string is byte-identical; the matcher at `verify-conversion.mjs:3170-3172` sees neither |
| F-41.2-04-04 — Refused: rendering the artist form's Save control on the destructive rung | decision taken, with its reason written | the destructive rung was REFUSED for the artist form's Save control — saving a bio destroys nothing, and the named analog renders its Save on the primary rung |
| F-41.2-04-05 — G5 cannot confirm this plan's largest contribution yet, and the number is stated as unmeasured | closed after the fact | the gate could not walk the closure until plan 41.2-05 declared the surface; it then did, and the nine source claims landed as measured |

### `41.2-05-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-41.2-05-01 — Check E's pairing was ALREADY equal before this plan declared anything | record of measurement, and a correction three later plans inherited | check E's pairing is computed from two tree-wide reads and NEVER consults `CONVERTED` — a reconciliation that reads its own pairing figure as evidence that its declaration landed is crediting a counter to the wrong cause |
| F-41.2-05-03 — `verify-breakpoints`' MEASURED numbers moved before this wave, and no wave-1 SUMMARY says so | routed to plan 41.2-19 | the `GuestLoginBanner.tsx` entry is STALE on BOTH the dialogs and the breakpoints gate, and both halves belong in the same commit as the closure decision. **41.2-19 owns those gates; this plan does not touch them** |
| F-41.2-05-04 — A whole-file substitution edited two entries this plan does not own | record of a near-miss, caught before the commit | a whole-file substitution rewrote two entries the plan did not own; caught by reading the diff before staging, reverted, and the committed diff was pure insertion. **This is the near-miss that governs how this consolidation was written** |
| F-41.2-05-06 — Two documents in this phase name two different desktop widths | **CLOSED BY THIS PLAN** | the 1280-against-1440 divergence is settled at **390 / 768 / 1440** for both output documents, with the reason written into `41.2-RELEASE-PASS.md` §0.3 — and the thirteen owed rows keep their own 1280, because a reworded row is a new row |
| F-41.2-05-07 — What this plan did NOT measure, said plainly | record — what was not measured | nothing rendered; `verify:capabilities` measured nothing; H41-4 has still never been produced |

### `41.2-06-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-41.2-06-01 — The placeholder's assigned analog is a grid; the surface it stands in front of is a single column | decision taken, and it produced a row | the assigned grid analog was declined for the card form, because a tile grid in front of a single column would have guaranteed a sideways jump. **`41.2-RELEASE-PASS.md` row S1 asks that decision to prove itself** |
| F-41.2-06-02 — The draft mark was NOT substituted to the amber semantic, and the plan's "first substitution beside format identity" therefore did not occur | decision taken, with a tail that is still owed | the amber semantic IS SunSet's identification colour, so the substitution the plan asked for was declined and the converted precedent copied instead. **The tail:** the project's first semantic substitution in a file that also renders format identity has still not happened, and check C would stay green on it either way — so a green there would not be evidence |
| F-41.2-06-05 — The gates have never opened these four files, and every claim in this plan's SUMMARY is a source claim | closed after the fact | the gates had not walked these four closures; plan 41.2-09's declaration is where the source claims became gate claims, and they came back clean |
| F-41.2-06-06 — What this plan changed on screen, and owes a person | human rows | eight visual consequences with their numbers, routed by their finder to the ledger and thence to the passes |
| F-41.2-06-07 — What this plan did NOT measure, said plainly | record — what was not measured | nothing rendered; `verify:capabilities` measured nothing |

### `41.2-07-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| What was looked for and NOT found, said as a measured absence | record of a measured ABSENCE | zero venue reads and zero money references across the five files, and `src/utils/qr.ts` read but never modified. **A sweep that ran and found nothing is not the same as a sweep that never ran**, which is why the absence is written down |

### `41.2-08-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| 3. Consequences of the conversion that a person has to look at | human rows | H-41.2-08-1 and H-41.2-08-2 — the ticket card and the wallet control widening together, and the wallet control's new fill. Carried by `41.2-RELEASE-PASS.md` rows P19–P21 |
| 4. `focus` is unavailable on this surface, not deferred — and the words are not interchangeable | decision recorded, and the wording matters | `focus` is **unavailable** on this surface, not deferred — check E forbids the narrow form on any surface mounting a navigation, and D-41.2-01 mounts one. *"Deferring implies it could be picked up later. It cannot be picked up at all"* |
| 5. Two things this plan did not measure, said plainly | record — what was not measured | nothing rendered; the gate did not yet walk the closure; `verify:capabilities` refused |

### `41.2-09-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-41.2-09-01 — The plan's "seven pairs" is wrong against the tree; check E carries NINE | record/correction | the plan inherited "seven pairs"; check E carries NINE. Re-measured against the tree rather than against the plan |
| F-41.2-09-02 — The second instrument returned a VACUOUS ZERO on its first run, and it would have authorised twelve deletions | record of a near-miss — **the fifth mechanism** | the corroborating instrument returned `0/0/0` on all eight files at its first run, including four the gates report with overlays, because a character class was defined with brackets and used inside brackets. **Had it been believed it would have authorised twelve deletions, each carrying a second instrument's agreement.** The rule it yields — *a zero counts only if the run that produced it printed its own self-check* — binds every zero in this plan |
| F-41.2-09-04 — The own-maximum picture is now ONE standing occurrence, not three, and the two that closed did so before they became visible | record of measurement | the own-maximum picture is ONE standing occurrence, not three, and the two that closed did so before they became visible |
| F-41.2-09-05 — What the tree said that no wave-3 SUMMARY did | record of measurement | what the tree said that no wave-3 SUMMARY did — and where the honest outcome of diffing against the tree was agreement |
| F-41.2-09-07 — Wave 2's ledger sentence is now stale, and it was left standing on purpose | routed to plan 41.2-19, half closed here | the ledger's §3 sentence *"Twelve rows, twelve unrun procedures"* is wave 2's and was left standing on purpose. **`41.2-HUMAN-ROWS.md` is 41.2-19's file in this wave and this plan does not touch it.** The half this plan was asked to settle — the width divergence — is settled: see F-41.2-05-06 above |
| F-41.2-09-08 — What this plan did NOT measure, said plainly | record — what was not measured | nothing rendered; nothing was proved RIGHT, only UNMOVED; the render-mode question stays open — see `DI-41.2-31` |

### `41.2-10-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-10-01 — `RedeemConfirmationModal.tsx` carries THREE overlays, not one | **decision: D-41.2-06**, a declared permanent exemption | the file carries THREE overlays, not one. The guest's confirmation converted; **the two bartender screens will never convert**, because inside the primitive the control that reverts a token — money going back — becomes full-width under the thumb. *A file that will never convert is not a debt*, and the reason ships with the entry in the gate |
| F-10-02 — `animate-pulse` in this perimeter is an attention mark, not a placeholder | decision taken; superseded in arithmetic by `DI-41.2-35` | the pulses in this perimeter are attention marks, not placeholders — a prompt to tap to serve, and a card that pulses while it is the active token. **No gate reads that utility at all**, so the plan's count of 0 was a plan artefact and not a tree requirement |
| F-10-03 — the redemption confirmation has no Cancel control, and one was not invented | decision taken, on the more restrictive gate | the confirmation has no Cancel and one was NOT invented: the copy rule forbids an act and the marker rule requires one, so the copy rule won. The primitive's fallback focuses the close control, so **Enter never confirms** |
| F-10-04 — activating a token is REVERSIBLE, so the confirming control kept the accent fill | decision taken, on a re-read of the action | activating a token is REVERSIBLE — `activate` has an explicit path back — so the confirming control kept the accent fill. *The destructive rung is for acts that destroy* |
| What is NOT here | record — what is NOT here | the four silent catches on the guest money path are untouched and deliberately so; **no fifth was found in that plan's four files** — the fifth was found one wave later, in another plan's, and is `DI-41.2-06` |

### `41.2-11-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-11-01 — the declaration line does NOT match the nine-sibling checksum, and that is deliberate | decision recorded | the declaration line deliberately does not match the nine-sibling checksum |
| F-11-03 — the cover image moved INSIDE the shell, and that is a visual change | human row | the cover image moved INSIDE the shell — a visual change, not a defect |
| F-11-04 — the placeholder reserved a heading the page has never drawn | repaired inside its own plan | the placeholder reserved a heading the page has never drawn — the defect a placeholder exists to prevent, achieved by a placeholder. Both boxes are gone |
| F-11-06 — Clear's red hover hint was dropped, and what that costs | decision recorded, with a consequence stated rather than carried in a hue | Clear's red hover hint was dropped because the ladder has no hover-tint rung and inventing one would make the file a second author of the button contract. **The consequence is real:** clearing the closing time falls the party back to its end time, and where there is none the menu never closes automatically — which widens the window in which tokens can be bought and redeemed. What the control SENDS is unchanged |
| F-11-07 — two announcements added, and they are the only behaviour this plan changed | behaviour added, named rather than smuggled | two announcements — the saved confirmation and the grace-period banner now carry a status role. `meta-gates.md` asks a deadline to have an observable effect rather than only a colour, and the grace sentence tells a guest how long they have to redeem something already paid for |
| F-11-09 — the instrument proved it can see, and it did so by catching me | record of a near-miss — **and the rule that governs this document** | a docblock explaining that a count was zero MADE THE COUNT FIVE. *"My own prose destroyed the measured zero by writing about the measured zero."* This is why `DI-41.2-36` above describes its needle instead of spelling it |
| What this plan did NOT measure, said plainly | record — what was not measured | nothing rendered; no box measured |

### `41.2-12-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-41.2-12-01 — `GuestTokenDisplay.tsx` carries THREE overlays, not one, and two of them were refused | **decision: D-41.2-07**, a second declared permanent exemption, granted on the file's OWN argument | three shells where the plan modelled one. The guest's confirmation converted; the two bartender screens did not. **The plan explicitly REFUSED to inherit D-41.2-06 and re-derived the argument from this file's own comments** — two executors, in separate worktrees, with no contact, hit the same shape and refused it the same way, and the second refused with a decision granting the first already in its context. *A refusal that declines an available precedent and re-derives the argument is worth more than one that cites it* |
| F-41.2-12-02 — both `animate-pulse` sites are attention marks, not placeholders | decision taken, consistent with F-10-02 by measurement rather than by deference | both sites are attention marks, not placeholders |
| F-41.2-12-03 — the file's only real placeholder is a sentence, and it stays one | decision taken | the file's only real placeholder is a sentence, and it stays one |
| F-41.2-12-05 — one user-visible word changed, and it is the word the accessible name already carried | decision taken, named rather than buried | one user-visible word changed in 381 changed lines, and it is the word the accessible name already carried. Proved byte-identical elsewhere by an extractor that **refuses unless it first reproduces a known difference on a reworded fixture and a known silence on an identical one** |
| F-41.2-12-06 — the plan's `<read_first>` line numbers, re-measured | record of measurement | the plan's targets were all correct; some of its coordinates were not |
| F-41.2-12-07 — the type-size step was MIGRATED, matching the twin deliberately | decision taken | the type-size step was migrated to the contract's own boundary tier, matching the twin deliberately — *the drink name is what a bartender reads at a glance in a dark room* |
| F-41.2-12-08 — acceptance criteria NOT met, named as such | record — acceptance criteria NOT met, named as such | five criteria unmet, every one of them because the plan was written against a file shape that does not exist. The underlying reasons are D-41.2-07 and F-41.2-12-02, both above |
| F-41.2-12-09 — what this plan did NOT measure, said plainly | record — what was not measured | nothing rendered; `verify:capabilities` measured nothing and was not made green; **nothing there says the silent catches are acceptable — it says they are unchanged** |

### `41.2-13-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-41.2-13-01 — Wave 0's per-file counts for this surface are still exact, all four of them | record of measurement | wave 0's per-file counts for this surface are still exact, all four |
| F-41.2-13-02 — The pairing baseline is **9 / 9**, not the figure this plan inherited | record/correction | the pairing baseline is 9 / 9, not the figure the plan inherited |
| F-41.2-13-03 — The clearance grep returns **2**, and so does the specimen it is checked against | record of measurement | the clearance grep returns 2, and so does the specimen it is checked against |
| F-41.2-13-04 — The fourth silent catch is **not on this plan's file set** | record — an attribution corrected | the brief attributed wave 0's fourth silent catch to this surface; read at its recorded site it belongs to another plan's file. **The entry exists so the next reader does not go looking for it on the dashboard** |
| F-41.2-13-06 — The disclosure control refused the button ladder, and the reason is the rung | decision recorded | the disclosure control refused the button ladder, and the reason is the rung |
| F-41.2-13-07 — The two quick-action tiles took the **line** primitive, on a box measurement | decision recorded, on a box measurement | the two quick-action tiles took the line primitive |
| F-41.2-13-08 — One behaviour was added, and it is named rather than smuggled | behaviour added, named rather than smuggled | one behaviour, stated in the open |
| F-41.2-13-09 — Two accent marks lost their hue, and the loss is the decision | decision recorded, and the loss IS the decision | two accent marks lost their hue |
| What this plan did not measure, said plainly | record — what was not measured | nothing rendered |

### `41.2-14-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-41.2-14-03 — the delete control could not be reached on a phone | repaired here, and stated rather than buried | the delete control was drawn transparent and revealed on hover — **a phone has no hover, and this is a member surface read on a phone**, so the only control that removes a member's own upload was in practice unreachable there. It is now always visible at the icon rung. **The guard is untouched:** a confirmation still stands between the tap and the deletion, and the action was not opened. This is the OPPOSITE direction from D-41.2-06's bartender revert — there, adopting the primitive would have loosened a guard |
| Not a finding — measured and clean | record of a measured absence | two files read and not edited, including the declared permanent exemption `Lightbox.tsx`, whose exemption is a decision about that specific file; and no file under `scripts/` |

### `41.2-15-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| §1 The venue exit enumeration for this surface, rebuilt by READING the code | enumeration, rebuilt by READING the code | `venue-secrecy.md` requires the exit list to be rebuilt rather than carried forward, because such a list is dated by construction. It feeds `DI-41.2-32` and `DI-41.2-33` |
| §2 F-41.2-15-01 — "seventeen columns" is a drifted figure, and the multiset is the assertion | record/correction | "seventeen columns" is a drifted figure; the multiset over comment-stripped source is the assertion |
| §6 Human rows owed — `pending`, batched to the RESP-01 sitting | human rows | H-41.2-15-1 and H-41.2-15-2, `pending`, batched to the RESP-01 sitting. Carried by `41.2-RELEASE-PASS.md` rows P28–P30 and by `41.2-RESP-01-PASS.md` rows Q28–Q30 |

### `41.2-16-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| 0. The two timestamps, in the order the knot rule requires | record — the knot rule's two timestamps | the analysis precedes the diff, and the history is the evidence rather than the claim |
| 1. Classification, and why it is not the phase's default | record — classification | Critical, and why that is not the phase's default |
| 2. Cross-domain impact, written before the diff | record — cross-domain impact, written BEFORE the diff | the knot rule's requirement, met in the order it requires |
| 3. The three stop conditions, verbatim from the plan | record — the three stop conditions, verbatim from the plan | none was hit |
| 4. The before-image — read out of the file, not inferred | record — the before-image, read out of the file | §4.5 carries the one correction this analysis produced, and it is **a figure in a planning document, not a defect in the product**: `41.2-PATTERNS.md` §5.3's declared minimums for four controls, against the computed values |
| 5. What may change, and the one direction that is safe | record — what may change, and the one direction that is safe | stated before the diff |
| 6. Recorded, not repaired | record — **recorded, not repaired: and here it is empty** | the money grep is zero before and after, so this plan met **no** silent catch of the kind this phase has recorded nine of. An empty deferral list, stated rather than left implied |
| 7. The diff, and what it must still prove | record — the diff, and what it must still prove | the six knot questions, put before the answers |
| 8. The six answers, each separately, each with quoted text | record — the six answers, each with quoted text | weaker predicate, fewer presses, default-open, removed confirmation, Enter-to-confirm re-derived from the primitive's source rather than cited, and focus |
| 9. Every string this dialog can render, branch by branch | enumeration — every string this dialog can render, branch by branch | the venue-secrecy discipline applied to copy |
| 10. Every attribute added, and each names an action rather than a place | record — every attribute added | each names an action rather than a place |
| 11. The props — no new source of place information | record — the props | no new source of place information |
| 12. The touch-floor delta — the one measurable strengthening | record — the one measurable strengthening | the touch-floor delta |
| 13. The negative-space check, pasted whole | record — the negative-space check, pasted whole | the strongest assertion available in a repo with no test runner |
| 14. No role-session observation was attempted, and the reason | **human row — and it is `41.2-RESP-01-PASS.md` row V1's provenance** | no role-session observation was attempted and **none may be inferred**: *"No tool in this repository can authenticate as a role, and the management path bypasses row-level security — so an observation taken that way would prove the opposite of what it claims."* Nor was the application run, rendered headless, or pointed at Supabase |
| 15. The gate line, pasted, and the entry NOT deleted | record — the gate line pasted, and the entry NOT deleted | a `REMAINING` entry left standing at its honest value |
| 16. The full run, and the bar it was measured against | record — the full run, and the bar it was measured against | 15 gates reaching a verdict, 0 failed, one refused |
| 17. The monotone sentence, earned rather than asserted | record — the monotone sentence, earned rather than asserted | the venue guard, proved unmoved rather than declared unmoved |

### `41.2-17-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-17-05 — the drinks list has no card shell, and the plan's model of it said it did | record/correction to `41.2-PATTERNS.md` §1c row 44 | the drinks list has no card shell — the card is a component converted one wave earlier as spine. Both ratchet greps read 0 before and after, and wave 0's census agrees by omission |
| What is NOT here | record — what is NOT here | the six catches already recorded were untouched, and **neither bartender exemption was touched, widened or narrowed** — and neither file was rewritten into a form the matcher cannot see |

### `41.2-18-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| F-41.2-18-02 — the share control had no accessible name at all | repaired here, by construction | the share control had **no accessible name at all** — a screen reader announced "button" and nothing further — and it was a 40px circle, below the floor. The icon rung types the name as REQUIRED, *"so the defect could not survive the conversion even if nobody had noticed it"*, and the name now carries the state, because the only feedback the control gives is a glyph swap and a glyph is not announced |
| F-41.2-18-05 — the upload drop zone could not be reached from a keyboard | repaired here | the upload drop zone was a clickable division holding an undisplayed input, so **the number of keyboard paths to the file picker was zero — measured, not estimated**. It is now a button. Same shape as F-41.2-14-03 on a different control: a target that did not exist on the device the surface is actually used on — there a phone and a hover, here a keyboard |
| An enumeration entry, not a finding — where the shared text comes from | enumeration, not a finding | three strings the share control can hand out, one of which is free text somebody typed. **No claim is made that it leaks anything** — the claim is narrower: *this string is human-authored, it reaches a share sheet, and a share sheet is a publication*. Whether the editorial rule that keeps a place out of a public caption is kept in that column is a question for whoever writes them |

### `41.2-WAVE0-FINDINGS.md`

| Entry — heading verbatim | Disposition | Why |
|---|---|---|
| 0. The environment, stated before the numbers | record — the environment, stated before the numbers | the wave that produced the phase's baseline numbers |
| 1. The dry run — method, and the proof it left nothing behind | record — the dry run, with the proof it left nothing behind | the ten entries appended on a throwaway branch and reverted |
| 2. G1 / G4 — `verify-conversion` with the ten declared | record of measurement — G1 / G4 | the baseline the phase's conversions were diffed against. **One cell of it is wrong — see `DI-41.2-37`** |
| 3. Check D — the gate's own own-maximum list | record of measurement — check D | the gate's own own-maximum list |
| 4. Check E — the baseline the ten navigation conversions will be diffed against | record of measurement — check E | the baseline the ten navigation conversions were diffed against |
| 5. G5 — `verify-touch-targets`, the number this wave exists to produce | record of measurement — G5 | the touch-target number this wave existed to produce, which settled an approximation the research labelled LOW-MEDIUM confidence |
| 6. G2 and G6 — the control, and it held | record of measurement — the control, and it held | G2 and G6 |
| 7. The own-maximum reading — the measured set, with a disposition each | dispositions, applied by later plans | the own-maximum set with a disposition each. Row 1's owner was corrected by F-41.2-03-05; row 2 became the `TYPOGRAPHIC_MEASURES` entry; rows 3–4 were deleted together; **row 5's caution about the conditional clearances is `DI-41.2-34`** |
| 8. Check F — DECIDED: **IN SCOPE** | decision taken in writing — check F **IN SCOPE** | the reading the phase was required to write down either way |
| 9. What this wave did not measure, said plainly | record — what was not measured | nothing rendered; H41-4 has never been produced; `verify:capabilities` measured nothing; **the four silent catches were read, not exercised** |

---

## The sweep's own closing statement

**The sweep ran on 2026-08-14, by plan 41.2-20, in wave 8.** It found **seventeen**
`41.2-*-FINDINGS.md` files carrying **one hundred and twenty-nine** entries.
**Thirty-five of those headings are consolidated above as `DI-41.2-06` …
`DI-41.2-37`; the other ninety-four are in the roll-call, each with its heading
verbatim, its file and its disposition. None was dropped.**

**A sweep that ran and found nothing must be distinguishable from a sweep that
never ran**, so it is said here with its date even though this one found plenty:
*the sweep ran on 2026-08-14 and it was not empty.* The sentence is written in the
shape it would have taken had the answer been zero, because a document that only
speaks when there is something to say cannot be trusted when it is silent.

**What this plan did NOT do, said plainly.**

- **It fixed nothing.** `git status --porcelain -- src/ scripts/` was empty at every
  commit of this plan. Every entry above is deferred by construction, and wave 8 is
  the last place in the phase where a repair would have been a scope breach.
- **It edited nothing wave 0 wrote.** The first 14 446 bytes of this file are
  byte-identical to what plans 41.2-01 and 41.2-02 wrote, asserted by hash before
  and after this append.
- **It edited no other plan's findings document.** Three entries above —
  `DI-41.2-37`, and the roll-call rows for F-41.2-05-03 and F-41.2-09-07 — are
  corrections to documents this plan does not own, and each is recorded **beside**
  the document rather than **into** it. *An editorial fix to somebody else's
  sentence is the move that produced this phase's one recorded near-miss.*
- **It touched none of plan 41.2-19's files.** The gates, the manifest and
  `41.2-HUMAN-ROWS.md` are that plan's in this wave, and it ran beside this one.
- **It measured nothing that renders.** No dev server, no headless render, no box
  measured, no database read and no database write — **D-41.2-04**. Every
  coordinate re-measured above is a `grep` with its count against the tree.
- **It spelled no needle.** Where an entry above quotes a finding that asserts an
  absence, the needle is **described rather than written**, because this phase has
  three recorded instances of prose destroying the measurement it was describing —
  the sharpest being a docblock that explained a count was zero and thereby made it
  five. `.planning/` is read by the same greps that produce those counts.

*Consolidated 2026-08-14 by plan 41.2-20, wave 8. Seventeen files, 129 entries, 32
new deferred entries, 94 roll-call rows, nothing fixed and nothing dropped.*
