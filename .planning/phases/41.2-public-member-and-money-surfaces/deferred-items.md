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
