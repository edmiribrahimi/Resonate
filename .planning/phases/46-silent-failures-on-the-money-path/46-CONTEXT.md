# Phase 46: Silent Failures on the Money Path - Context

**Gathered:** 2026-08-14
**Status:** Ready for planning
**Scope note:** the perimeter written here is **narrower than `46-RESEARCH.md`'s**. The
research was correct on the day it was written; a product decision taken during this
sitting (D-46-11) removed the ground under four of the nine. Read `<domain>` before
`46-RESEARCH.md`, and treat the research's wave shape as superseded.

<domain>
## Phase Boundary

A failure on a path that carries money produces an effect somebody can see. There is
no error tracking in this repository, so *logging the error is not sufficient*
(`meta-gates.md`) — the effect must be visible to the person affected, to staff, or as
a measurable consequence in the data.

**What this phase does NOT do**, decided in this sitting:
- It does not add error tracking (`OBS-01` stays Future).
- It does not change **how tickets are sold** — no seat reservation, no hold-before-payment.
  That is a new capability and gets its own phase (see `<deferred>`).
- It does not touch anything whose existence depends on the members area, because that
  is under review (D-46-11).

### The perimeter, item by item

**IN — survives regardless of the members-area decision:**

| Item | Site | Shape |
|---|---|---|
| `DI-41.2-02` | `GuestTokenDisplay.tsx:20-31` | guest drink-receipt custody, **write** side, swallowed |
| `DI-41.2-03` | `GuestTokenDisplay.tsx:34-40` | same custody, **read** side, returns `[]` — a failed read rendered as a legitimate value |
| `DI-41.2-04` | `GuestTokenDisplay.tsx:403-410`, polled from `:485-488` | a failed token fetch reports `"unknown"`, and the poll keeps polling |
| `DI-41.2-06` | `(public)/events/[slug]/menu/actions.ts:48,51,60` | an organizer's menu-closing command throws and **nothing at all** is shown |
| `DI-41.2-06b` | `(public)/events/[slug]/menu/PartyDrinkMenu.tsx:146`, `:156` | **added after pattern mapping** — the only two callers of `updateMenuClosesAt`, both bare `await` with no `catch`. D-46-10b asks for two distinguishable outcomes, and **an outcome nobody renders is not an outcome**: without this file the decision is void. Scope clarification, not a new capability |
| `DI-41.2-08` | `(public)/events/[slug]/page.tsx` | a full night renders as open, with the control that takes money beside it |
| `F-46-01` | `(admin)/admin/events/actions.ts:1271`, `:1279` | two server reads discard their error and fail **permissive** |
| `DI-TODO-A` | `(admin)/admin/events/actions.ts:1412-1416` | a discount code's usage limit opens on a failed read (folded todo). **⚠ The todo's own coordinate is wrong** — it says `:1228-1233`, which is the *profile* read inside `purchaseTicket`. Re-measured 2026-08-14 against the current tree; a plan aimed at `:1228` would edit the wrong guard |
| `DI-TODO-B` | `api/cron/refund-expired-tokens/route.ts:163-168` | the cron reports as deleted the rows that **remain**, and declares success (folded todo) |

**OUT — depends on the members area, which is under review (D-46-11):**

| Item | Why it falls |
|---|---|
| `DI-41.2-09` `-10` `-11` `-12` | they are the trip through registration. No registration, no trip |
| `DI-41.2-01` | `claimGuestOrders` claims a guest's orders **after login**. No login, nowhere to claim |
| `DI-41.2-07` | the member dashboard |
| `DI-41.2-20` | RSVP requires `auth.getUser()` **and** `status = approved` (`rsvp-actions.ts:13-28`) |
| `DEF-41.2-A` | the guest-facing refund refusal — removed by D-46-09, not by the members-area decision |

**Consequence for the roadmap's success criteria:** criterion 3 (the one that charges
the wrong amount, `DI-41.2-09`) and criterion 2's *"five RSVP refusals"* are **not met by
this phase** and cannot be, because their code is under review for deletion. This is
stated here so it is not discovered at verification. If the members area survives
D-46-11, those items return as their own phase.

</domain>

<decisions>
## Implementation Decisions

### The price a returning guest pays *(recorded, then suspended)*

> These four were decided in full before D-46-11 removed their ground. They are kept
> verbatim because they are **correct and reusable** if the members area survives — and
> because re-deciding copy on a money path from scratch is exactly what
> `community-membership.md` forbids (*"il testo del rifiuto va scritto una volta"*).
> **They do not bind this phase's plans.**

- **D-46-01:** When a discount no longer applies on resume, the reason appears **and the
  guest can still buy at full price**, on the same page. No redirect. *(The no-redirect
  half is already true: `PendingIntentHandler` renders inside `(public)/events/[slug]/`.)*
- **D-46-02:** The resumed purchase **stops only when the price changed**. Code still
  valid → resumes automatically as today. Price different from the one shown → it halts,
  states the reason, and starts only on a deliberate press. *(Today the resume is a bare
  `useEffect` at `PendingIntentHandler.tsx:64-102` — no press at all.)*
- **D-46-03:** The "code does not apply to this tier" cause gets **the same fixed sentence**
  as the other two. No sentence composed at run time from a tier name.
- **D-46-04:** A stored intent that cannot be read is **said out loud**, not discarded in
  silence, and the guest is returned to the tier choice.

### When a count cannot be read

- **D-46-05:** The **advisory pre-check inside `purchaseTicket` stays permissive** — no
  change to its direction. Measured during this sitting and this is why: the real
  capacity guard is `reserve_ticket`
  (`supabase/migrations/20260310100000_discount_codes.sql:90`), which locks the tier row
  `FOR UPDATE`, counts, raises `Tier sold out`, and validates `max_uses` atomically. In
  plpgsql a failed read **raises** — it cannot coalesce to zero — so that guard **fails
  closed**. Closing the application-side pre-check on a transient read error would refuse
  a buyer the database would have accepted.
- **D-46-06:** `DI-TODO-B`, the refund cron: the response tells the truth (*"refunded N,
  not deleted M"*) **and the run terminates as failed**, so a failed execution shows red in
  the platform's cron dashboard. This is the only observable effect in the whole phase that
  costs nothing to build. Accepted cost: if it fails often the red becomes wallpaper.
- **D-46-07 — accepted risk, owner's call, taken with the cost in writing:** the window
  where **a guest pays and no ticket is issued** (last discount use, double submit) is
  **left silent by this phase**. Nothing is shown to the guest and no staff list is built.
  The owner's position is that a completed payment must always yield a ticket, which is an
  architecture change, not a message — see `<deferred>` seat-reservation phase. **Until that
  phase ships, money can be taken and nobody knows.** It is not one of the nine; it was
  found during this sitting, so no roadmap criterion is broken by leaving it.
- **D-46-08:** `DI-TODO-A` and `F-46-01` are repaired as **observability, not as a new
  refusal**: the reads stop discarding their error, and the distinction between *counted
  zero* and *could not count* becomes legible in the code. The guard's direction does not
  change (D-46-05).

### Refunds

- **D-46-09:** **A guest cannot request a refund on the platform.** Refunds are requested
  through the community's own channels and issued by a staff member. Consequence: the
  guest-facing refund refusal (`DEF-41.2-A`) leaves this phase's perimeter entirely; only
  the staff-facing surface remains. `refund-actions.ts:85-92`'s docblock keeps its claim
  intact and true (L8).

### The sentences

- **D-46-10:** The product speaks **English**, consistent with `brand-visual-system.md`'s
  British English for materials. New sentences are written in English.
- **D-46-10a:** **Claude drafts every sentence in one list; the owner approves the list in
  one pass.** Not sentence by sentence. The list ships as part of the first plan's output
  and is not merged until approved.
- **D-46-10b — Claude's call, taken under `checkpoint-delegation`:** `DI-41.2-06`
  (`updateMenuClosesAt`) gets **two distinguishable outcomes**, not one collapsed catch.
  *You may not do this* and *it did not save* are different facts to an organizer, and
  collapsing them is the newsletter defect (L9) reproduced on a staff money surface.
- **D-46-10c — Claude's call:** for the guest drink receipts, this phase ships **only the
  guest-facing half** — an empty list caused by a failure stops looking like an empty list
  caused by having bought nothing. The bar-side lookup surface is deferred. Grounds: the
  owner reports a past public edition ran with no observed loss, and unregistered guests'
  receipts survived a page refresh. Stated limit of that evidence, recorded once: a refresh
  preserves browser storage, so it exercises the working path, not the failing one (other
  device, private window, cleared storage). It lowers the frequency; it does not remove the
  case.

### The product decision that reshaped this phase

- **D-46-11 — DECLARED, NOT YET DECIDED. Blocks nothing here; scopes everything.** The owner
  has stated the intention to **remove the members area and user registration entirely**,
  leaving authentication for organizers and staff only. Rationale offered: comparable
  collectives run without one. This phase was **narrowed to what survives either way**
  rather than planned against a surface that may be deleted.

  Measured during this sitting, so the decision is taken with its cost visible: 3 member
  pages, 3 auth pages, **22 files** reading profiles, **40** using the user identity, and
  **24 migrations** whose RLS policies are built on `auth.uid()`. Removing the members area
  is not deleting three pages; it is removing the pivot the data-security boundary rests on.

  Three findings for that decision, recorded here so its own discussion does not restart
  from zero:
  1. **The comparables cited do not have a members area because they do not have a
     platform** — their nights are sold through Resident Advisor, which supplies both the
     ticketing and the accounts. The comparison is *our platform* vs *RA*, not *with members
     area* vs *without*.
  2. **Every platform checked binds a ticket to at least an email**, because a ticket must
     be deliverable and checkable at the door. DICE requires an account outright. So the
     real question is *how much account* — a gated members area with referral and approval
     is one thing; an order carrying a name and an email is another.
  3. **The legal knot is resolved and is no longer blocking** — see D-46-12.

- **D-46-12:** **The membership register does not live in our app.** Membership is handled
  by a dedicated external service, in the manner of an established Italian cultural-club
  platform. Therefore the platform is **not** the *libro soci*, and removing the members
  area does not touch the legal model that `legal-compliance.md` makes a precondition of
  the private-venue strategy. **Consequence to carry, not to solve here:** the door now
  verifies **two** things from **two** sources — the ticket from us, the membership from the
  external service — with the network unreliable. That belongs to `checkin-offline.md` and
  needs its own decision.

### Claude's Discretion

Mechanism per finding; the shape of the refusal union and its total `Record`; wave
decomposition; the wording of the manual verification procedures; whether `DI-TODO-A` and
`F-46-01` land in one plan or two.

### Folded Todos

- **`.planning/todos/pending/unchecked-count-reads-decide-money-paths.md`** (2026-08-10,
  severity high, `ticketing-payments`) — **folded whole**, both sites. It records two
  permissive reads on money paths: the discount usage limit at
  `(admin)/admin/events/actions.ts:1228-1233`, and the refund cron's deleted-count at
  `api/cron/refund-expired-tokens/route.ts:163-168`. The first sits in the same function as
  `F-46-01`'s two reads. The todo closes by naming this kind of phase as its natural home.
  Tracked here as `DI-TODO-A` and `DI-TODO-B`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### This phase
- `.planning/phases/46-silent-failures-on-the-money-path/46-RESEARCH.md` — the full
  measurement of the nine, the refusal-category pattern with three converted examples, the
  boundary, and twelve landmines (§8). **Its perimeter and wave shape are superseded by
  `<domain>` above; its measurements are not.**
- `.planning/phases/46-silent-failures-on-the-money-path/46-FINDING-01.md` — the permissive
  server reads. **Amended by D-46-05:** its open question *"whether any database-level
  constraint bounds tickets per tier"* was settled during this sitting — one does, and it
  fails closed. Read the amendment before acting on the finding's severity claim.
- `.planning/phases/41.2-public-member-and-money-surfaces/deferred-items.md` — Group M, the
  nine with `file:line` and consequence.
- `.planning/todos/pending/unchecked-count-reads-decide-money-paths.md` — folded, above.

### Constraints that bind every file this phase opens
- `.planning/todos/pending/postgrest-details-leaks-the-row.md` — **not scope, a
  constraint.** On a CHECK violation PostgREST returns the whole row in `error.details`,
  `membership_code` included, and a membership code is the door credential. Every `catch`
  this phase writes or touches logs `error.code` and `error.message` — **never the whole
  error object, never `error.details`**. Application branching stays on the code.
- `.claude/rules/meta-gates.md` — the three monotone guards, and the no-error-tracking
  rule that makes "logged" insufficient.
- `.claude/rules/ticketing-payments.md` — GET-verify at the webhook, idempotency,
  per-item cron progress, discount rules enforced server-side at checkout.
- `.claude/rules/venue-secrecy.md` — `DI-41.2-08` opens `(public)/events/[slug]/page.tsx`.
  Four reveal assertions bind every diff (`46-RESEARCH.md` §6). Critical, owner in the loop.
- `.claude/rules/community-membership.md` — a refusal is a communication; the wording is
  written once and used always.

### Schema truth
- `supabase/migrations/20260310100000_discount_codes.sql:90` — `reserve_ticket`, the real
  atomic guard. Read it before proposing anything about capacity or discount limits.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **The refusal-category pattern is already owned by this codebase**, in three converted
  places: a refusal travelling as a **returned constant** rather than a thrown sentence
  (`/api/media/finalize`, fourteen categories on a shared union), rendered from a **total
  `Record`** so a category added upstream turns the file red at `npm run build`
  (`src/lib/door/outcome.ts:295`, `DOOR_NIGHT_ERROR`). Nothing has to be invented.
- **`reserve_ticket`** already does atomically, in the database, what the application layer
  does badly in TypeScript. Where the two disagree, the database is right.

### Established Patterns
- A refusal **must** travel as a returned value, never as a thrown message: Next redacts
  the message of an error thrown out of a Server Action in a production build
  (`src/lib/capabilities/server.ts:59-63`).
- Payment precedes ticket creation. `purchaseTicket` creates a checkout and a
  `pending_purchases` row; the ticket row is created later by the SumUp webhook
  (`api/webhooks/sumup/route.ts:48`) calling `reserve_ticket`. Everything about D-46-07 and
  the deferred reservation phase follows from that ordering.

### Integration Points
- `(admin)/admin/events/actions.ts` — `purchaseTicket` holds `F-46-01`'s two reads and
  `DI-TODO-A`. One file, one plan, one decision.
- `GuestTokenDisplay.tsx` — three of the five survivors (`-02`, `-03`, `-04`) live here and
  are one question, not three: *what does a guest see when the browser cannot hold their
  receipt.* Splitting them yields half an answer.
- **Coordinates: trust `46-PATTERNS.md` §0 over the research and over the folded todo.** The
  pattern mapper re-measured every site against the current tree and found **six of eight
  stale**. The one that matters most is `DI-TODO-A` above. Nothing in this phase is edited
  at a line number taken from a document without re-measuring it first.
- **`GuestTokenDisplay.tsx` cannot use a toast.** It imports and renders `Dialog` (`:15`,
  `:337`), and `scripts/verify-dialogs.mjs` forbids `useToast` in any file that renders a
  `Dialog`. Three of the five in-perimeter findings live in that file, so their refusals are
  rendered **in place**, not thrown to a toast. Found by pattern mapping, verified at the
  source; the research does not mention it.
- `L6` from the research still binds: `GuestDrinkMenu.tsx:119-121` keeps a fallback alive
  only because `localStorage.removeItem` sits inside the `.then`. The research calls it
  *"the one mercy here, and it is accidental rather than designed."* A tidy-up of that
  promise chain deletes it. **Comment it in place.**

</code_context>

<specifics>
## Specific Ideas

- The owner reports a past public edition where unregistered guests bought drink tokens and
  the receipts survived a page refresh, with no loss reported at the bar. Used as frequency
  evidence in D-46-10c, with its stated limit.
- Every platform surveyed holds inventory **before** payment rather than validating after —
  the *reservation-then-commit* pattern. Eventbrite exposes it as a configurable
  "Registration time limit"; its help page states that tickets a buyer selected are
  unavailable to others until the limit expires. This is the model for the deferred
  reservation phase, and the owner's stated target behaviour.

</specifics>

<deferred>
## Deferred Ideas

- **Seat reservation before payment (*reservation-then-commit*)** — own phase, to run
  **immediately after 46**. Hold the tier's seat the instant checkout begins, commit on
  payment, release on expiry. Makes D-46-07's silent window **impossible** rather than
  visible, which is the better fix and the industry norm. Touches `purchaseTicket`, the
  SumUp webhook and `reserve_ticket` — the most delicate three points in the product. The
  research is in `<specifics>`; do not re-do it.
- **Buying more than one ticket** — own phase. Today it is impossible twice over: no
  quantity control anywhere, and `reserve_ticket` refuses a second ticket for the same
  person and the same night (`User already has a ticket for this`). The owner considers this
  a gap, not a rule. The work is a quantity control, pricing for several tickets, and
  separating the deliberate second purchase from the accidental double submit — **which must
  stay refused**.
- **Removing the members area (D-46-11)** — own decision, then its own phase or milestone.
  The three findings and the measured surface are in D-46-11; the legal knot is closed by
  D-46-12.
- **RSVP without an account** — falls out of D-46-11. Today `rsvpToParty` requires
  authentication *and* `approved` status. If accounts go, RSVP is rebuilt as a guest flow or
  removed. Not a repair — a redesign.
- **A bar-side way to find a paid order without the guest's phone** — deferred by D-46-10c.
  Revisit if accounts are removed, because that is when the browser becomes the only record
  a person has.
- **Two credentials at the door** — from D-46-12. Ticket from us, membership from an
  external service, on an unreliable network. Belongs to `checkin-offline.md`.
- **Make `purchaseTicket`'s third parameter required** — `46-RESEARCH.md` §Open Questions Q2
  and landmine L2. The parameter is optional, which is precisely why nothing failed when a
  caller stopped passing it: `purchaseTicket(a, b)` typechecks. Removing the `?` would
  surface that class of bug at build time, but it is a public signature with two callers, so
  it is a deliberate change and not a drive-by. **Moot until D-46-11 resolves** — the caller
  that dropped the argument is out of perimeter. Recorded here so whoever repairs
  `DI-41.2-09` inherits the reasoning rather than rediscovering it.
- **`REQUIREMENTS.md:252` stale traceability note** — one line, already corrected in prose by
  `41.2-VERIFICATION.md:554` but not in the table. Not this phase's requirement, but this
  phase is the next to open the file.

### Reviewed Todos (not folded)
- `module-load-throws-500-the-whole-middleware-surface.md` — keyword match only, middleware,
  off the money path.
- `form-untick-venue-secret-leaves-no-trace.md` — venue secrecy, off the money path.
- `profiles-email-not-unique.md` — access gating; also likely reshaped by D-46-11.
- `postgrest-details-leaks-the-row.md` — **not folded as scope, carried as a constraint**;
  see `<canonical_refs>`. It stays open for the existing sites no plan here owns.

</deferred>

<phase_requirements>
## Requirements

`ROADMAP.md:1052` says *"TBD at planning"*, and that is accurate. `46-RESEARCH.md`
§Phase Requirements proposes `OBS-02` … `OBS-05` in `.planning/REQUIREMENTS.md`'s own house
style, with `OBS-02`…`OBS-05` verified free.

**Amended by this sitting:** `OBS-05` (the discount surviving registration) covers
`DI-41.2-09`, which is out of perimeter — so **`OBS-05` is not created by this phase**. The
planner writes `OBS-02`, `OBS-03` and `OBS-04` only, and their traceability rows must not
cite the out-of-perimeter items. `OBS-04`'s row drops its references to `DEF-41.2-A` and
`DI-41.2-20`.

</phase_requirements>

---

*Phase: 46-silent-failures-on-the-money-path*
*Context gathered: 2026-08-14*
