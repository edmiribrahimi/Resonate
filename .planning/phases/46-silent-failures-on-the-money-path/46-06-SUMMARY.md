---
phase: 46-silent-failures-on-the-money-path
plan: 06
subsystem: ticketing-payments
tags: [nextjs, react-server-components, supabase, postgrest, venue-secrecy, observability]

# Dependency graph
requires:
  - phase: 46-silent-failures-on-the-money-path (plan 46-01)
    provides: "46-COPY.md — the approved sentence list. §3 holds this plan's one sentence, verbatim."
  - phase: 46-silent-failures-on-the-money-path (plan 46-02)
    provides: "src/lib/failure/money-path.ts — the construction, SafeError, logMoneyPathFailure"
provides:
  - "Three count reads on the public event page that destructure their error"
  - "`soldKnown` — a third state on both tier shapes, distinguishing a measured count from an unreadable one"
  - "`spotsUnknown` — a party-level flag distinguishing *could not count* from *no capacity set*"
  - "This surface's own one-member refusal union and its total Record, per money-path.ts §2"
  - "The PLACES_UNKNOWN sentence, rendered as an announced region beside both purchase controls"
affects: [46-verification, deferred-seat-reservation-phase, venue-secrecy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A failed read travels as a named boolean on the type, never as a coalesced number"
    - "A surface declares its own refusal union and its own total Record; only the construction is shared"
    - "On a reveal-critical file, untouched code keeps its original indentation so the diff shows what actually changed"

key-files:
  created: []
  modified:
    - "src/app/(public)/events/[slug]/page.tsx"

key-decisions:
  - "The purchase control stays live and every prop of it is unchanged — the owner's standing decision (O5), not an oversight. The authoritative guard is reserve_ticket, which fails closed in plpgsql."
  - "`count === null` on an exact head read is treated as unreadable, not as none sold — so no coalesce to zero survives anywhere on this page."
  - "The sentence is drawn at the PAID control only. On a free_rsvp night the figure still disappears but no sentence appears: the approved wording ends 'Buying is still open', which is not true beside an RSVP button. Owner decided to leave the gap open."
  - "The refused and absent causes get separate log scopes rather than one collapsed line."
  - "46-PATTERNS.md §3.4 recommends the opposite (not rendering the control). It predates O5. The owner's answer governs; the divergence is flagged rather than resolved in silence."

patterns-established:
  - "Third state on the type: `sold` and `available` keep their types so an out-of-perimeter consumer needs no prop change; the honest state lives in a sibling boolean, and a rendered sentence is what makes it a state somebody has"
  - "Two nulls, two meanings: a render guard may collapse them, but only the one that is a failure owes the reader a sentence"
  - "Comment discipline on files with mechanical absence checks: never spell the identifier whose absence is measured"

requirements-completed: [OBS-03, OBS-02]

# Metrics
duration: 19min
completed: 2026-08-14
---

# Phase 46 Plan 06: The Public Event Page Summary

**The three counts on the most public money surface now read their error and carry `soldKnown`, so a night whose remaining places could not be checked prints no number and says so — beside a purchase control that stays live by the owner's decision.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-08-14T20:14:00Z (approx — first edit)
- **Completed:** 2026-08-14T20:33:00Z
- **Tasks:** 3 (2 auto + 1 blocking checkpoint, resolved)
- **Files modified:** 1

## Accomplishments

- **No count on this page is coalesced to zero any more.** Both tier counts and the RSVP
  count destructure their error, and `count === null` — which an exact `head: true` read
  never returns on success — is treated as unreadable rather than as none sold. A sold-out
  night can no longer render as wide open with a remaining figure that was not a measurement.
- **The failure travels as a named third state,** `soldKnown` on both tier shapes and
  `spotsUnknown` on the party. `sold: number` and `available: number | null` keep their
  types byte-for-byte, so `TierSelection` — out of perimeter under D-46-11 — compiles with
  no prop change.
- **The approved sentence is drawn at both purchase-control sites,** verbatim from
  `46-COPY.md` §3, as a `role="status"` region in a Server Component.
- **The four reveal properties hold,** derived before the first edit and again after the
  last diff, and independently re-derived by the orchestrator.

## Task Commits

1. **Task 1: The three counts destructure their error and carry a third state** — `d907a38` (fix)
2. **Task 2: Say it, beside the control that stays live** — `eb26334` (feat)
3. **Task 3: Owner validates the diff on the reveal-critical file** — checkpoint, approved; no code commit

## Files Created/Modified

- `src/app/(public)/events/[slug]/page.tsx` — three destructured count reads with safe
  logging; `soldKnown` on `PartyWithTiers["tiers"]` and on the duplicate event-level inline
  annotation; `spotsUnknown` on the party; a one-member refusal union with its total
  `Record`; `logUnreadableCount`, the single call site enforcing *code and message only*;
  two announced regions carrying the approved sentence.

---

## The four reveal derivations, both runs

`.claude/rules/venue-secrecy.md` gate *irreversibilità*: an address published has no remedy,
so the evidence is recorded rather than the claim.

| # | Derivation | Before first edit | After last diff |
| --- | --- | --- | --- |
| 1 | the venue ternary | **3 arms + `null` tail** | **3 arms + `null` tail** |
| 2 | `LC_ALL=C /usr/bin/grep -c 'typeof opts.revealedAt === "string" && !Number.isNaN'` | `1` | `1` |
| 3 | `LC_ALL=C /usr/bin/grep -c 'dynamic = "force-dynamic"'` | `1` | `1` |
| 4 | `LC_ALL=C /usr/bin/grep -c generateMetadata` | `0` | `0` |

**The arm count is three, with a null tail.** Read after the diff, by predicate:

- `:1366` — `{venueVisible && venueRow ? (`
- `:1385` — `) : venueVisible && party.venue_text ? (`
- `:1389` — `) : party.venue_secret ? (`
- `:1408` — `) : null}`

Derivation 2 matters most and is the reason it is written positively: `undefined !== null`
is TRUE, so a negated null test plus a column that stopped being selected would open the
address on **every** secret night, silently.

Derivation 4 is why no comment added by this plan spells that identifier. The same
correction was applied a second time during execution: a comment first drafted for the RSVP
branch quoted the removed coalesce expression verbatim, which made
`grep -c 'rsvpCount || 0'` return `1` and defeated the check asserting its absence. The
comment was reworded to describe the expression instead of quoting it. Recorded because it
is the same failure mode as `generateMetadata`, found by running the check rather than by
trusting the intent.

## Independent counter-verification by the orchestrator

The derivations above were **not accepted on my word**. Re-run by the orchestrator against
this worktree:

- lines **added or removed** touching `isVenueVisible|venueVisible|venueRow|SecretVenueDialog|revealedAt` → **0**
- `LC_ALL=C /usr/bin/grep -c generateMetadata` on the final file → **0**
- `LC_ALL=C /usr/bin/grep -c 'dynamic = "force-dynamic"'` on the final file → **1**

A first, wider pass counted **1** match — the `import` line shown as diff **context**, not
as a modified line. The executor's assertion was correct and the orchestrator's filter was
broader than the executor's. **Recorded as a successful independent counter-verification,
not as a discrepancy.**

## Diff evidence

`git diff bd8eb8d HEAD` — **one file, 309 insertions, 11 deletions.** The Task 2 commit has
**0 deletions**. Empty: `git diff --stat` over `supabase/migrations/`, over
`src/app/api/webhooks/`, over `TierSelection.tsx`, over `package.json` and
`package-lock.json`.

**Every line removed from the file, in full:**

```
-            const { count } = await serviceClient
-            const sold = count ?? 0;
-            return { ...tier, sold, available: tier.quantity !== null ? tier.quantity - sold : null };
-          const totalSold = tiers.reduce((sum, t) => sum + t.sold, 0);
-          spotsLeft = party.capacity - totalSold;
-          const { count: rsvpCount } = await serviceClient
-          spotsLeft = party.capacity - (rsvpCount || 0);
-  let eventTiers: { …the same shape without soldKnown… }[] = [];
-        const { count } = await serviceClient
-        const sold = count ?? 0;
-        return { ...tier, sold, available: tier.quantity !== null ? tier.quantity - sold : null };
```

**The control is untouched.** `grep -c '<TierSelection'` → `2`, unchanged, and
`git diff -U0 | grep '^-' | grep -c 'partyId=\|tiers=\|isAuthenticated=\|eventSlug=\|label='`
→ `0`. The control's own lines **keep their original indentation** inside the new fragment,
deliberately: re-indenting untouched code would have shown every prop of the money control
as removed and re-added, burying the one property the owner most needed to confirm under
whitespace. The reasoning is written at both sites in the file.

`grep -c 'role="status"'` → **0 before, 2 after.**

## The approved sentence, verbatim

From `46-COPY.md` §3, `PLACES_UNKNOWN`, used at both sites, no interpolation:

> **How many places are left could not be checked just now, so no number is shown here. Buying is still open.**

No tier name, no party title, no capacity figure, no database code enters it (T-46-20). A
count nobody could read must not become a number on a public page by way of the message
saying it could not be read.

## Owner approval, verbatim

**Approved — 2026-08-14, by the project owner.**

> **approvato**

Recorded by the coordinator: *"Il proprietario ha letto il diff prima di rispondere (gli è
stato consegnato per intero: le 11 righe rimosse isolate in cima, poi il diff completo) e ha
approvato."*

## Known gap, accepted — the free RSVP night

**On a `free_rsvp` night whose count could not be read, the figure disappears but no sentence
appears.** The dangerous half is fixed — no invented number is printed — and only the
explanation is missing.

**Decided by the owner, not overlooked.** Three reasons, recorded so the phase verifier finds
this as a decision rather than discovering it as a hole:

1. **No money moves on that path**, and this phase is about the money path.
2. **The dangerous thing — the invented number — is gone anyway.** The
   `spotsLeft !== null` guard suppresses the figure for both roads to `null`.
3. **RSVP is under review together with the members area (D-46-11).** Writing copy for a
   surface that may be deleted is work thrown away.

The mechanical reason a sentence could not simply be reused: the approved wording ends
*"Buying is still open"*, which is not true beside an RSVP button, and the approved list
holds no second wording. A plan wanting one **amends `46-COPY.md` and re-presents it whole**
(D-46-10a, T-46-03) — it does not merge a variant here.

## Decisions Made

- **The purchase control stays live, and this is load-bearing rather than incidental.** No
  condition removes it, nothing disables it, no prop changed. The owner's standing decision
  (`46-FINDING-01.md`, `46-VALIDATION.md`): the control stays live and the **server**
  refuses. The authoritative guard is `reserve_ticket`, which locks the tier row `FOR UPDATE`,
  counts and raises `Tier sold out`; in plpgsql a failed read **raises** rather than
  coalescing, so it already fails closed. Refusing on this page for a transient read error
  would refuse a buyer the database would have accepted.
- **`46-PATTERNS.md` §3.4 recommends the opposite** — not rendering the control. It was
  written from the research's recommendation, before O5 was answered. The owner's answer
  governs. Flagged here rather than resolved in silence.
- **`count === null` is unreadable, not zero.** An exact count answers with a number, so a
  `null` alongside no error is a transport failure, not an empty tier.
- **Two log scopes, not one.** `…_refused` carries a code and will not fix itself; `…_absent`
  carries none and is the transient case. `meta-gates.md` forbids a `catch` that collapses
  distinct causes into one line.
- **The union lives in this file, one member long.** `money-path.ts` §2: each surface owns
  its vocabulary. §4 asks every failed-read union for a *could-not-answer* member; here there
  is no *no* to keep it apart from, because this page does not refuse the buyer.
- **A local `logUnreadableCount` rather than three inline calls.** `logMoneyPathFailure`
  takes a `SafeError`, and a whole PostgREST error satisfies that shape structurally — so
  *never log the object* is enforced at one call site instead of remembered at three. On a
  constraint violation PostgREST returns the entire rejected row in `details`, and a
  `tickets` row carries `membership_code`, which is the door credential.

## Deviations from Plan

None — the plan was executed as written. Two in-plan judgement calls worth naming, both
covered by the plan's `<action>` text rather than departures from it:

1. **The `PLACES_UNKNOWN` constant and its `Record` are module-level but not exported.** A
   Next page module validates its known exports; an arbitrary named export is unnecessary
   risk for no gain, since the union is used only in this file. The construction —
   constants, union from `typeof`, total `Record` — is unchanged.
2. **A comment was reworded after a check caught it.** See the derivations section above.

## What this plan did NOT do, and must not be read as having done

**D-46-07 is untouched.** A guest can still pay for a seat that is not there — the last
discount use, a double submit — and nobody is told, because `reserve_ticket` runs at webhook
time, **after** the money moved. That is the owner's accepted risk, taken with its cost in
writing. The sentence deliberately stops at *"Buying is still open"* and promises nothing
about the purchase succeeding: reassuring there would be reassuring about precisely the
window D-46-07 leaves silent. The deferred seat-reservation phase makes the window
impossible rather than visible, and it is the fix.

**No migration and no webhook was opened.** `git diff --stat` on both is empty.

## Issues Encountered

- **`node_modules` is absent in a fresh worktree,** so `npm run build` cannot run. Resolved
  the same way plan 46-02 did: a symlink to the main checkout, **removed before finishing**.
  `git status` is clean and `package.json` / `package-lock.json` are byte-identical to the
  base. No package was installed (T-46-SC).
- **A comment defeated its own mechanical check** — see the derivations section. Found by
  running the check, not by inspection.

## Verification

- `npm run build` — **exits 0.** `/events/[slug]` still renders as `ƒ` (dynamic).
- **No test claim is made.** This repository has no test runner for the product
  (`CLAUDE.md`, Environment Guardrail 1). The build is the typecheck gate; everything else
  below is a written manual procedure.
- **`npm run verify` was NOT run** — `scripts/rls-baseline.mjs:205-215` reaches the Supabase
  Management API against production.

### Manual procedure — `Result: pending`

**Role:** anonymous visitor, on the public event page.

**Environment:** the owner's own environment. **Not** a worktree pointed at `.env.local`
(D-41.2-04), and **not** production.

**Preparation.** Choose a night that already has a **quantity-limited** paid tier, so that a
remaining figure is normally printed. Note what the page shows today: the *N spots left*
line, and the *N available* figure inside the purchase control.

**Induce the failure.** Make the tier sold-count read fail — the read is
`serviceClient.from("tickets").select("*", { count: "exact", head: true }).eq("tier_id", …)`.
Any of these reaches it: point `SUPABASE_SERVICE_ROLE_KEY` at an invalid value, so the
service client is refused; or cut network access to the database host while the page is
requested. Reload the page.

**Observe, and all four must hold:**

1. **No remaining figure is printed anywhere.** No *N spots left* line, and no
   *N available* beside the tier. A number here is the defect.
2. **The sentence appears beside the purchase control**, reading exactly:
   *"How many places are left could not be checked just now, so no number is shown here.
   Buying is still open."*
3. **The purchase control is still there and still pressable.** This is the point of the
   check, and it is easy to invert: a page that refuses the buyer here is **the defect to
   report, not the success**. The owner's standing decision is that the control stays live
   and the server refuses — so what is being verified is that **the refusal is reachable and
   legible**, not that the control disappeared.
4. **No venue address appears that was not there before the failure.** The count failing must
   not move the venue verdict by one inch.

**Then restore the environment and reload**, confirming the figure comes back and the
sentence goes away — the sentence must be a consequence of the failure, not a permanent
fixture.

**Also worth one look, on a night with a capacity but no tiers:** nothing changed there, and
nothing should have. No sentence, no figure — the `null` there means *no capacity computed*,
not *could not count*, and only the second one talks.

**Result: pending**

## Threat Flags

None. No new network endpoint, no new auth path, no new file access, and no schema change.
The one surface this plan adds — a fixed string in an announced region — carries no
interpolation, which is T-46-20's mitigation applied rather than deferred.

## Next Phase Readiness

- `DI-41.2-08` is closed on this page. `OBS-03` and `OBS-02` are met here.
- **The deferred seat-reservation phase inherits D-46-07 unchanged.** This plan made the
  unreadable count visible; it did not narrow the window where a payment completes for a
  seat that is not there.
- **For the phase verifier:** the accepted free-RSVP gap above is a decision with its reason
  recorded, not an omission. It should be confirmed as such rather than raised as a hole.

## Self-Check: PASSED

- `src/app/(public)/events/[slug]/page.tsx` — FOUND
- `.planning/phases/46-silent-failures-on-the-money-path/46-06-SUMMARY.md` — FOUND
- commit `d907a38` — FOUND
- commit `eb26334` — FOUND
- `STATE.md`, `ROADMAP.md` — untouched, as required (the orchestrator owns those writes)

---
*Phase: 46-silent-failures-on-the-money-path*
*Completed: 2026-08-14*
