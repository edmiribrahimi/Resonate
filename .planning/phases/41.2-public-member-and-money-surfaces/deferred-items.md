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
