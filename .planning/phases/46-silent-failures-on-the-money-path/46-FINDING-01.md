# F-46-01 — the server's sold-out refusal is not a guarantee, and it fails PERMISSIVE

**Found:** 2026-08-14, by the orchestrator, while checking whether the owner's
answer to O5 was safe.
**Severity:** the most serious item in this phase's inventory, and it was not in it.
**Status:** recorded, not repaired.

---

## Why it was looked for

The owner chose, for `DI-41.2-08`, that the purchase control **stays live** on a
night whose remaining-seat count could not be read, and that **the server
refuses** if the seat is not there. That answer is correct *if and only if the
server's refusal is reliable. It is not.*

`purchaseTicket` does re-validate — `src/app/(admin)/admin/events/actions.ts:1321`
throws `This ticket tier is not available (sold_out)`. But the two reads that
feed that verdict **discard their errors**, and both fail in the permissive
direction.

## The two reads, at `file:line`

**1. `actions.ts:1271` — the tier list.**

```
const { data: allTiers } = await tierQuery;
if (allTiers && allTiers.length > 0) {
```

The error is not destructured. If the read fails, `allTiers` is `null` and the
guard is false, so **the entire capacity block is skipped** — status is never
computed, `:1321` is never reached, and the purchase proceeds with **no capacity
check of any kind**.

**2. `actions.ts:1279` — the sold count.**

```
const { data: soldCounts } = await supabase.from("tickets").select("tier_id").in("tier_id", tierIds);
const soldMap = new Map<string, number>();
for (const s of soldCounts ?? []) { … }
```

Same shape. If this read fails, `soldCounts` is `null`, the loop body never runs,
`soldMap` stays empty, and `:1294`'s `soldMap.get(t.id) ?? 0` yields **0 sold for
every tier**. Every tier computes `available > 0`, every tier is `available`, and
`:1321` lets the purchase through **on a sold-out night**.

## Why this is worse than the nine

The nine recorded failures produce a **confident, well-formatted, wrong
statement**. This one produces a **completed payment**.

It is the same coalesce-a-failed-read-to-a-legitimate-value shape as
`DI-41.2-07` and `DI-41.2-08` — but on the **server**, on the **purchase path**,
and its failure direction is **permissive**: the guard opens rather than closes.
`DI-41.2-08` makes a full night *look* open; **this one makes the server agree.**

The two compound: a buyer who is shown an open night by the client's zeroed count
presses through, and the server's own zeroed count confirms it.

## What it changes about the owner's decision

**Nothing about the decision — everything about what makes it safe.** "Stays
live, the server refuses" is the right shape *once the server's refusal holds*.
So this finding does not reverse O5; **it becomes a precondition of it**, and the
plan must land it in the same wave as `DI-41.2-08` or earlier. Shipping
`DI-41.2-08`'s client-side fix alone would leave the permissive server hole open
while removing the only visible symptom of it.

## What must NOT be done to it

- **Do not make a failed read refuse the purchase outright** without deciding
  that deliberately: a transient read error would then refuse a buyer who had a
  seat, and `checkin-offline.md`'s recorded asymmetry — *refusing a valid holder
  is worse than admitting a duplicate, because the first happens in front of
  people* — is the argument that has to be weighed, not assumed. **It is an owner
  decision and it is not taken here.**
- **A payment reaching completion corrects forward.** Whatever is chosen, nothing
  may make an amount that was taken look like it was not.
- The webhook's rule is untouched: status is verified via a GET to the checkout
  API, never trusted from the body, and idempotent on both branches.

## Not verified here

Whether any **database-level** constraint bounds tickets per tier independently
of this code path. If one exists, the exposure is smaller than it reads; if none
does, this is the only guard. **Reading `supabase/migrations/` settles it and was
not done** — the plan should settle it before choosing a fix.

---

*Recorded 2026-08-14. No code was changed. No database was read.*
