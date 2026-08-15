---
phase: 44-the-production-calendar-comes-inside
plan: 12
subsystem: production-calendar-writes
tags:
  [server-action, discriminated-union, venue-secrecy, monotone-guard, service-client, obs-03, dialog]

# Dependency graph
requires:
  - phase: 44-04
    provides: "`CAP.PRODUCTION_READ`, the six read policies, and `record_checklist_tick`'s return contract"
  - phase: 44-07
    provides: "the applied migrations and the six row interfaces in `src/types/database.ts`"
  - phase: 44-11
    provides: "`ChecklistSection` and its `onTick` prop, and the S2 page the two writes land on"
provides:
  - "`tickChecklistItem` — the checklist tick, entitlement-checked in the action and attributed to the caller"
  - "`announceNight` — the single bridge from a plan row to a night, and the only place a series number is spent"
  - "`AnnounceNightDialog` — the confirmation, cancel-first, outcome in its own panel"
  - "`CalendarNightChecklist` — `ChecklistSection` with the act supplied"
  - "three venue-secrecy narrowings, implemented and recorded with their reason"
affects: [44-13, 45]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A refusal that leaves a DIFFERENT state behind gets a sentence that says the opposite of the others — `link_failed` says the number IS spent, because it is"
    - "A refusal code may carry a narrow non-identifying field (the stage) so the surface can name WHICH refusal without naming WHAT was refused"
    - "The client half of a server action's contract lives in the client module, because the mapping between a rich reason union and a surface's two sentences is a function, and a function cannot cross the server/client prop boundary"
    - "A column default that fails OPEN is written explicitly rather than inherited — `venue_reveal_on_purchase` defaults to `true`"

key-files:
  created:
    - "src/app/(admin)/admin/calendar/actions.ts"
    - "src/app/(admin)/admin/calendar/AnnounceNightDialog.tsx"
  modified:
    - "src/app/(admin)/admin/(work)/calendar/[id]/page.tsx"

key-decisions:
  - "A night whose space is not `acquired` CANNOT be announced — refused as a returned code that names the stage. Decided by the assistant on 2026-08-15 under the owner's standing instruction; loosenable by the owner"
  - "The night is created with its address kept secret, no venue carried across, and `venue_reveal_on_purchase` written `false` against a column default of `true` — an announcement can never arm a reveal"
  - "The confirmation does not name the venue: a confirmation panel is photographed, and this act moves no address"
  - "The announcement creates an UNPUBLISHED container, because `event_parties.event_id` is `NOT NULL` — D-44-06's *generates the event from the plan row*, taken literally, with `is_published: false` as the load-bearing value"
  - "The night's stored title carries the format and the progressivo and NOT the venue word — a title is a stored public string and this act cannot know whether the space may be named"
  - "No line-up is written: `production_plan` has no such column, and a guessed line-up on a screen is a line-up on a screen"

patterns-established:
  - "Where two refusals leave different states of the world, they may not share a sentence — even when they share a cause"
  - "A control whose act has already happened is replaced by a sentence, never disabled in silence"

requirements-completed: [PROD-01]

# Metrics
duration: 55min
completed: 2026-08-15
---

# Phase 44 Plan 12: the surface's two writes — Summary

`src/app/(admin)/admin/calendar/actions.ts` holds the production calendar's two
writes and no third: the checklist tick, and the announcement that turns a plan
row into a night. Both are entitlement-checked in the action, both record who
acted, and every refusal travels back as a value with its own name. The
confirmation asked before an announcement states what it writes, what it spends
and what is still open — and refuses, before the button can be pressed, a night
whose space is not acquired.

---

## Task 1 — the two venue-secrecy calls, recorded with their date

**Decided 2026-08-15, by the assistant, under the owner's standing instruction
to proceed.** Both were the owner's to take; the owner was told. All three
narrowings below **restrict**, and the owner can widen any of them later as a
decision of their own. They are recorded here before the code that depends on
them, which is what task 1's acceptance criterion asks for.

### (1) `refuse-unacquired` — a night whose space is not `acquired` cannot be announced

**Reason.** `venue-acquisition.md`: *una classifica non è una disponibilità*,
and **acquired means in writing**, not *said yes on the phone*. Announcing a
night in a space still under negotiation is a negotiation made public, and that
closes it badly and closes it for us. The plan offered `force-secret` as the
narrowest option that does not block work; it was rejected because forcing a
flag still creates a product row committed to a date in a space nobody has
secured — the flag protects the address, not the commitment.

**How it is implemented.** `venue_stage_not_acquired`, a returned refusal with
its own code, carrying the stage as a field so the surface can name it. Four
declared words and a null name no space, so the field is safe to return. The
dialog draws the refusal **in its body and disables the confirming control**, so
the reason is readable before the button is pressed rather than applied silently
after it; the act refuses again on the server, which is where the guarantee
actually lives.

**The cost, stated rather than discovered.** `venue_stage` is null on every row
today, and a null is deliberately *not* read as acquired. So **no night can be
announced until somebody records a stage.** That is the intended direction: the
act is blocked by an absent fact rather than proceeding on an assumed one. The
refusal says exactly that, and 44-13's procedure will meet it first.

### (2) `venue_secret` is forced ON, and nothing that could reveal is carried across

**Reason.** Revealing is a separate act and a one-way switch: `venue_reveal_sent`
cannot be un-sent, the mail has left, the screenshot exists. An announcement must
never be able to reveal as a side effect.

**How it is implemented — and it went further than the flag**, because the flag
alone would not have held:

| what | written | why |
|---|---|---|
| `venue_secret` on the night | `true` | the decision, literally |
| `venue_secret` on the container | `true` | so a later publication cannot open an address nobody decided to open |
| the venue, in **either** form | **not carried** | the calendar's word is internal free text that may name a space under negotiation; the resolved reference would arm the scheduled reveal, whose window **falls back to a default when none is stored** (`venueRevealHours`, `src/utils/datetime.ts:293`) |
| `venue_reveal_on_purchase` | `false`, explicitly | its column default is **`true`** (`20260305200000_venue_reveal_on_purchase.sql:3`). Left alone, the first ticket sold on a night whose venue somebody later links would release the address with nobody deciding to |

That last row is the one the decision would have lost by omission. A flag set to
the safe value beside a column default set to the unsafe one is not a closed
path — it is a closed path with a second door.

**The consequence, said out loud:** a night created by this act has **no venue
at all**. Linking it is the operator's next step on the event form, which is the
surface that already carries every venue gate, and where the reveal window is
also chosen.

### (3) `do-not-name` — the confirmation does not name the venue

**Reason.** A confirmation panel is a thing somebody photographs. `RevealVenueDialog`
names the place because the place is exactly what is leaving; here **no address
moves at all**, so naming one would put the word on a screen for no gain. Part 1
of the body states the consequence in full without it: what is written, that it
is unpublished, and that the space is not carried across.

The same panel carries the sentence the plan asks for, verbatim:

> `Announcing spends this night's series number. A number that has been spent is never reused.`

which is the surfacing of `bump_series_watermark` — it raises the series' water
level with `GREATEST` and never lowers it, so deleting the night afterwards
leaves a permanent gap in the progressivo. The trigger is not re-implemented, not
touched and not read; there is no counter in this phase.

---

## Task 2 — `actions.ts`: one gate, two exports, every refusal a returned value

### The shape

| property | how |
|---|---|
| exactly two exports | `tickChecklistItem`, `announceNight` — `grep -c '^export async function'` = **2** |
| one gate, not exported | `assertProductionRead`, `grep -cE '^export .*assert\|^export .*Gate'` = **0** |
| the gate is asked first | it is the first statement of both exports, before any shape check and before the client |
| the service client is second | `getServiceClient()` is constructed **after** the gate in both — confirmed by reading the order |
| no upload path | `grep -cE 'FormData\|Blob\|arrayBuffer'` = **0**, `grep -cE '\bFile\b'` = **0** |
| no parser re-export | `grep -c 'production/ics'` = **0** |
| no rejected row in a log | `grep -c '\.details'` = **0** |
| no watermark re-implementation | `grep -ci 'highest_assigned'` = **0** |
| the one throw | `grep -c 'throw new Error("forbidden'` = **1**, inside the non-exported gate |

### The service client, justified in writing (`access-gating.md`)

The six production tables carry a `SELECT` policy and **no write arm of any
kind** (`20260815120100_*.sql` §3), so with row level security enabled every
session — anonymous, authenticated, a master's — is refused a write on them
through PostgREST. The service client is therefore not a preference: it is the
only client that can set `linked_party_id`. `record_checklist_tick` is granted to
`service_role` and to nothing else after `20260815120200_*_revoke.sql`, so the
same holds there.

**No untrusted input reaches it.** Both arguments are shape-checked against the
identifier pattern before any query, and both travel as parameters — nothing is
concatenated into anything.

### The entitlement gate is this file's, and there is nothing underneath it

`private.has_capability` answers about `auth.uid()`, which is **null** under the
service client, so a check inside the writer could only ever refuse a legitimate
tick. The migration says the gate is the caller's; this file says it back, and
adds the uncomfortable corollary in its own docblock: **remove the guard and
nothing underneath refuses.**

### No raw Postgres error crosses back — the threat this plan owns

Wave 1 and wave 2 measured that a constraint refusal prints the entire failing
row, and PostgREST exposes it as the error's third field. A row of
`production_plan` carries the venue word.

- Every log line is `code=` and `message=`, and nothing else. `.details` appears
  **zero** times across the two new files and the modified page.
- Every refusal is a **returned code chosen by us**. No `error` object, no
  `error.message` and no database sentence is ever returned to a client.
- `venue_word` is **not selected** by the announcement's read at all
  (`grep -c 'venue_word'` = 0 in `actions.ts`): a column that is never read
  cannot be logged, returned or interpolated by mistake.

### The refusals, and the one that says the opposite of the others

Eighteen codes, one per distinguishable cause, no shared bucket. Two deserve
naming here:

**`already_announced`.** Announcing twice is not idempotent — it would spend a
second number. Its own code, so the surface can say *this already exists* rather
than *something failed*.

**`link_failed`.** The night was created, the number **is** spent, and only the
tie back to the calendar failed. §13.2's copy for a failed announcement says
*nothing was written and the series number was not spent* — here **both halves
are false**, and using that sentence would send somebody to press the button
again, spending a second number. It gets a sentence that opens with a warning and
tells them not to.

---

## Task 3 — the confirmation, and the tick finally wired

| assertion | expected | got |
|---|---|---|
| the monotone sentence | 1 | **1** |
| open items named, not counted | `items open` = 0 | **0** |
| no collapsed message | 0 | **0** |
| the transient notification | 0 | **0** |
| compile-time subset assertions | present | **2** (`_TickIsSubset`, `_AnnounceIsSubset`), 6 mentions |
| `default` arms naming an unexpected code | present | **2** — the refusal switch and the stage switch |
| the reversed glyph | 0 | **0**, both new files |
| the audio misnomer | 0 | **0**, both new files |

### Cancel first, cancel focused — and NOT through `autoFocus`

The plan asks for `grep -c "autoFocus"` = 1 on the cancel control. **It is 0, and
that is the correct value.** `Dialog.tsx:117-148` records the measurement:
React's `autofocus` prop is **inert** — react-dom's attribute writer skips it, so
no attribute reaches the DOM and `showModal()`, running later in an effect, finds
nothing to honour. `RevealVenueDialog`'s docblock carries the whole correction and
the phase-41 decision it reverses. Writing `autoFocus` here would have
reintroduced a dead mechanism beside the live one.

The live mechanism is the primitive's declared marker:
`grep -c "data-initial-focus"` = **1**, and it sits on `Cancel`, which is also
first in the DOM and first in the tab order. No Enter-to-confirm, and no focus on
the confirming control.

### The four body parts, in order

1. **What becomes visible** — what is written, that it is **unpublished**, that
   the space is not carried across and no address is written. Where the stage
   blocks, the refusal leads this part and the confirming control is inert.
2. **The number** — §11.2's sentence, verbatim.
3. **The open items, NAMED** — the item sentences, never a figure. Where the
   checklist could not be read: `We could not count`, and never `0`.
4. **It still proceeds** — `Open items do not stop this. The checklist warns; it never blocks.`

### Where the checklist wiring lives, and why it is in this file

`ChecklistSection`'s handler is a **function**, and a function cannot travel from
a server component into a client component as a prop. So the mapping between the
act's eighteen codes and the section's two sentences has to sit on the client
side of the boundary. `CalendarNightChecklist` is exported from
`AnnounceNightDialog.tsx` rather than from a second client file whose entire
content would be four lines of translation — declared in the file's own docblock
so the next reader is not left wondering.

**The two sentences stay two.** A code for which *We could not save that tick.
The item is unchanged.* is a **complete** answer is declared as a four-member
subset; everything else — `actor_name_missing` most of all, which means *this
account's profile carries no full name* and has a next step — is **named beside
the sentence** rather than dressed in one written for something else.

---

## Deviations from Plan

### Auto-fixed and auto-added

**1. [Rule 3 — Blocking] The announcement creates the night's container**

- **Found during:** Task 2.
- **Issue:** `event_parties.event_id` is `NOT NULL` (`20260225150000_party_architecture.sql:11`). The plan's task 2 describes creating the night from the plan row and says nothing about a container, so as written it does not compile against the schema.
- **Fix:** an `events` row is created first, **unpublished**, and the night hangs off it. This is D-44-06's *«announcing is an explicit act that generates the event from the plan row»* taken literally rather than loosely. `is_published: false` is written explicitly and is the load-bearing value: an announcement that published would make its own confirmation untrue the moment it succeeded.
- **And the failure path:** if the night's insert is refused, the container is removed **by primary key**, on the id this call just captured — never by a selector over a list (`ai-engineering.md`, gate *una rimozione si fa per chiave*). The precedent is `createEvent`'s own orphan-draft cleanup, and a failure to clean up is logged with its own category rather than swallowed.
- **Committed in:** `a41ef04`

**2. [Rule 2 — Missing critical] `venue_reveal_on_purchase` is written `false`**

- **Found during:** Task 2, checking what the decision *force `venue_secret` on* actually buys.
- **Issue:** the column's default is `true`. `venue_secret = true` with `venue_reveal_on_purchase = true` is a closed door beside an open one: the first ticket sold on a night whose venue somebody later links releases the address with nobody deciding to.
- **Fix:** written `false` explicitly, with the reason beside it.
- **Committed in:** `a41ef04`

**3. [Rule 2 — Missing critical] The night's title does not carry the venue word**

- **Found during:** Task 2.
- **Issue:** the plan says to build the night *from the plan row's date, time, format, series, number, venue and lineup*. A title is a **stored public string**, and `production_plan.venue_word` is internal free text that may name a space nobody has announced. Carrying it would publish a place as a side effect of announcing a date — and would do so even under `venue_secret = true`, which hides an address and not a title.
- **Fix:** the title is the format name and the progressivo padded to three. It deliberately departs from `brand-visual-system.md`'s `RamaDub x <venue>`, and the file says why: that rule governs a night whose space **may be named in public**, and acquired-in-writing is not the same as announced. The operator names the night on the event form.
- **Committed in:** `a41ef04`

**4. [Rule 3 — Blocking] No line-up is written, because there is nothing to write it from**

- **Found during:** Task 2. The plan names a line-up among the fields to carry; `production_plan` has **no such column** (`20260815120000_production_calendar.sql` §1). The column is left at its default `[]`. Deriving one would be a guess, and a guessed line-up on a screen is a line-up on a screen.
- **Committed in:** `a41ef04`

**5. [Rule 3 — Blocking] `[id]/page.tsx` was modified, and the plan does not list it**

- **Found during:** Task 3. `44-11-SUMMARY.md` note 2 predicted exactly this: the page is the only file that renders `ChecklistSection`, and §11.1 puts the announcement's trigger on S2. The change is three things — `linked_party_id` selected as a scalar, the trigger rendered in the header, and `ChecklistSection` swapped for its wired wrapper.
- **Committed in:** `55f1256`

**6. [Rule 2 — Missing critical] An already-announced night gets a sentence, not a disabled button**

- **Found during:** Task 3. A disabled control in silence is indistinguishable from a refusal, which is one of the two things §13.2 exists to keep apart — and the act is not refused, it has already happened. The trigger is replaced by `This night is already announced.`
- **Committed in:** `55f1256`

### Declared, and deliberately not done

**7. `autoFocus` is not used.** See task 3 above: the plan's assertion names a
prop this project has measured to be inert. The declared marker is used instead
and the divergence is recorded rather than silently satisfied.

**8. The plan's grep counts that were met in substance and not in figure.** Each
is reported with the measured number and the reason, because a summary that
prints the expected figure instead of the measured one is worth nothing:

| assertion as written | expected | measured | why |
|---|---|---|---|
| `grep -c "getAccessContext"` | 1 | **2** | the import clause and the single call. `grep -c 'getAccessContext()'` = **1**, which is the fact the assertion is about: the gate is asked once, and no export re-asks |
| `grep -ciE "FormData\|File\|Blob\|arrayBuffer"` | 0 | **9** | every match is the substring `file` inside `profiles`/`profile` and inside prose. `grep -cE 'FormData\|Blob\|arrayBuffer'` = **0** and `grep -cE '\bFile\b'` = **0**, which is the fact: no path accepts a document |
| `grep -c "event_parties"` | 1–2 | **4** | one is the `.from(...)` call inside `announceNight`; two are in its docblock; the fourth names the database constraint that produces `number_taken`, in that refusal's own doc. Exactly **one** is a call, and it is the only place in the phase a night is written |
| `grep -c "_IsSubset"` | present | **0** for that exact string | the two assertions are `_TickIsSubset` and `_AnnounceIsSubset`; `grep -c "IsSubset"` = **6** |

---

## Verification

| gate | result |
|---|---|
| `npm run build` | **exit 0** |
| `npm run verify:routes` | **exit 0** |
| `npm run verify:dialogs` | exit 0 — `REMAINING = 0`, and the new dialog uses the primitive |
| `npm run verify:tables` | exit 0 |
| `npm run verify:breakpoints` | exit 0 |
| `npm run verify:tokens` | exit 0 |
| `npm run verify:touch-targets` | **exit 2 — a refusal, and it is D1's, not this plan's** |

**On `verify:touch-targets`.** It exits 2 and measures nothing. The four reasons
are the stale `CONVERTED` manifest entries logged as **D1** in
`deferred-items.md` — surfaces deleted by a commit that predates this phase — and
`verify:touch-targets 2>&1 | grep -ci calendar` returns **0**, so no file of this
plan is named by any of them. Identical to what 44-11 recorded. It was left alone
because fixing D1 is a manifest edit outside this plan's scope.

⚠ **The consequence is stated rather than glossed:** the confirming and
cancelling controls added by task 3 have **not** been measured by a gate. They
are `Button` at the `md` rung, which carries the 44 px floor — that is a reading
of the primitive, not a measurement of the panel.

### What a green does NOT mean

- **Neither act has been executed.** No query in this plan reached a database.
  The RLS was not exercised, `record_checklist_tick` was not called, no night was
  created and no series number was spent. **Nothing was run against production.**
- **`npm run build` proves the JSX and the mappers type-check against the row
  types declared in these files.** No Supabase client in this repository is
  parameterised with `Database`, so every `.select()` and every `.insert()`
  column name is an **assertion**, not a check. Every name was read by hand out
  of `20260225150000_party_architecture.sql`, `20260226300000_multi_sub_events.sql`,
  `20260305200000_venue_reveal_on_purchase.sql`, `20260810120000_formats_and_series.sql`
  and `20260815120000_production_calendar.sql`. That chain is the only check
  performed.
- **The three venue-secrecy decisions are written, not proved.** That an
  unacquired night is actually refused, that the created night actually carries
  no address, and that no reveal is actually armed are **observations a person
  has to make**, and they belong in 44-13's written procedure. They are not
  claimed here.
- **Nothing here says a door-assigned member of staff is refused these acts.**
  No session was opened.

### The written manual procedure this plan owes (`meta-gates.md`, no test runner)

Both write paths touch the venue and one spends a monotone guard, so a procedure
is required rather than optional. It is **specified here and executed in 44-13**,
with the role named and what must be observed at each step:

**A — the tick, as an approved organizer.**
1. Open `/admin/calendar`, then a night with at least one checklist item.
2. Observe that the read-only notice is **gone** and the boxes are operable.
3. Tick an item. Observe: the box stays ticked, the `Late` badge (if any) clears,
   and `Ticked by <name> · <date>` appears with **your own** name.
4. Untick the same item. Observe the author line disappears with the tick, and
   re-tick it: the author is re-recorded.
5. In the database, read the item's `ticked_by` and `ticked_by_name`. Observe
   they name the account that pressed, not null.

**B — the tick, as a member of staff assigned to the door.**
1. Reach `/admin/calendar/<id>` with that session. Observe the redirect: the page
   is not reached at all.
2. Invoke the action directly against the deployment with a forged body. Observe
   it is refused, and observe that the response carries **no database sentence**.

**C — the announcement, refused on the stage.**
1. On a night whose `venue_stage` is not `acquired` (today: every night), press
   `Announce this night`.
2. Observe: the dialog names **the stage** and never a space, and `Announce` is
   inert. Nothing was written; confirm no new row exists in `events` or in the
   night table.

**D — the announcement, performed.**
1. Record the series' current water level, and the ids of every row in `events`
   and the night table, **before** pressing.
2. Set the stage to `acquired` on one night by hand. Press, and confirm.
3. Observe the outcome panel: the night exists, **unpublished**, and its number
   is spent.
4. Read the created night: `venue_secret` is `true`, `venue_id` and `venue_text`
   are null, `venue_reveal_on_purchase` is `false`, and the title carries **no
   venue word**.
5. Read the container: `is_published` is `false`. Confirm the night is not on
   `/events` for a logged-out visitor.
6. Press again. Observe `already_announced` and confirm **no second number was
   spent** by re-reading the water level.
7. Remove only the rows created in step 2, **by the primary keys captured in step
   1**, never by a control on a page.

---

## Repository Safety

`.planning/` is tracked and this repository is public.

- **No production material** in either new file, in the page's diff, or in this
  document: no venue name, no date of any night, no line-up, no personal name.
  `docs/Music-*.ics` was **not opened**.
- **`venue_word` is never selected** by either act — `grep -c 'venue_word'` = 0
  in `actions.ts`. It is in no log, no thrown message, no returned value, no
  `aria-label` (`grep -c 'aria-label'` = 0 in the dialog) and no analytics call.
- **The stage travels back on a refusal, and that is safe:** four declared words
  and a null. They name how far a space is, never which space.
- **The actor's name is resolved server-side and never returned or logged.** It is
  authorised in the database and stops there; this document names roles.
- `re:sonate` is written with a normal `e`; the reversed glyph is typed nowhere
  and was checked by code point (0 in both files).
- **No sound allusion.** No string, class name, component name or comment in
  either file says what a format sounds like.
- **The audio misnomer appears nowhere** (0 in both files).

---

## Known Stubs

**None.** The stub 44-11 declared — the checklist's unwired tick — is removed by
this plan: the handler is supplied, the read-only notice and the `disabled`
attribute are gone.

Two absences are **decisions and not stubs**, and both are drawn rather than
hidden:

1. **A night created by this act has no venue.** Stated in the confirmation
   before the act and in the outcome after it. Linking it is the operator's next
   step on the event form.
2. **No night can be announced until somebody records a stage**, because a null
   stage is not read as `acquired`. The refusal says so in its own words.

---

## Threat Flags

None new. The plan's register was applied:

| id | how |
|---|---|
| T-44-02 | the non-exported gate is called first in each export, asks `CAP.PRODUCTION_READ`, returns the resolved context so no export re-asks, and the service client is constructed after it |
| T-44-05 | the three venue-secrecy decisions, implemented as above; the stage refusal is visible in the dialog **before** the button is pressed and never applied after it |
| T-44-03 | the announcement is the only place the water level can rise, it rises through the existing trigger, and a second press is refused with its own code so a second number cannot be spent |
| T-44-07 | no export accepts a document; `FormData`, `Blob` and `arrayBuffer` are absent, `File` is absent as a word, and the parser is not re-exported |
| T-44-01 | `code` and `message` only; the rejected-row field appears zero times; the venue word is never selected |
| T-44-33 | every refusal is a returned code with one sentence each, two compile-time subset assertions, and two `default` arms that name an unexpected value |
| T-44-SC | no package was installed |

---

## Self-Check: PASSED

| Claim | Method | Result |
|---|---|---|
| `src/app/(admin)/admin/calendar/actions.ts` exists | `test -f` | found |
| `src/app/(admin)/admin/calendar/AnnounceNightDialog.tsx` exists | `test -f` | found |
| `a41ef04` exists | `git log --oneline --all` | found |
| `55f1256` exists | `git log --oneline --all` | found |
| no file was deleted by either commit | `git diff --diff-filter=D HEAD~2 HEAD` | empty |
| `npm run build` exits 0 | run | exit 0 |
| `npm run verify:routes` exits 0 | run | exit 0 |
| nothing was executed against production | no client was constructed outside a build | confirmed — `.env.local` is absent in this worktree |
