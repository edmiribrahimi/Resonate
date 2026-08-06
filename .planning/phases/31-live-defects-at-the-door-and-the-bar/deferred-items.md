# Phase 31 — deferred items

> This repository is public. Roles, never people.

## From plan 31-12 (the door review list)

### The entry point link is not added, and the reason is not laziness

`src/app/(organizer)/organizer/events/[id]/review` exists and is reachable by
address, but nothing links to it yet.

The plan asked for the link to be added "the same way `sales` and `guest-list`
are linked from `organizer/events/page.tsx`". Reading the code, that is **not**
that page: both links live in `src/components/events/EventList.tsx:176-188`, and
that component is shared by **two** trees —
`(organizer)/organizer/events/page.tsx:72` renders it with the default
`basePath`, and `(admin)/admin/events/page.tsx:72` renders it with
`basePath="/admin/events"`.

Adding an unconditional link there would therefore produce
`/admin/events/{id}/review`, **which does not exist**, and a master reading the
admin tree would land on a 404. Making it conditional means teaching a shared
presentational component which routes exist per tree — a decision wider than
this plan, and one Phase 34 removes entirely by collapsing the two trees.

`EventList.tsx` is also outside this plan's declared `files_modified`.

**What to do, and when:** add the link in Phase 34, once the duplicated trees are
one. If it is wanted sooner, the smallest correct change is a single `Link` in
`EventList.tsx` guarded on `basePath` — not an unconditional one.

### `not_in_cache` has no writer

`not_in_cache` is a member of `DoorScanCause` (`src/lib/door/outcome.ts:132`) and
a member of `DoorFlag` (`:85`), and **no path writes it as a cause**: flags are
not a stored column, so the classification cannot recover it from a row. Its
counter therefore reads zero until a writer sets it. The prose sentence for it is
already written and will render the day one does.

This is a true statement about the product, not a gap in the classifier — it is
recorded here so nobody reads a zero as evidence that offline admissions never
happen.

### `invalid_signature` and `unknown_code` cannot be told apart after the fact

`door_scan_events` stores `outcome` but not the `DoorNotValidReason`. A
`not_valid` row that resolved no ticket is either a code carrying no valid
signature or a code whose signature verified against a ticket that no longer
exists. Both are bucketed as `invalid_signature`, and the sentence that renders
them says both possibilities rather than accusing anybody of a forgery.

Recovering the distinction needs a column, which needs a migration — deliberately
not taken in this plan, because 31-04's migration is applied and is a historical
fact.
