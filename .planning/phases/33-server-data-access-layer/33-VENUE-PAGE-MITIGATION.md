# Public venue page — venue-secrecy MITIGATION

**Date:** 2026-08-07
**Type:** mitigation, not a fix
**File:** `src/app/(public)/venues/[slug]/page.tsx`
**Real fix:** RLS narrowing on `event_parties`, scheduled for **phase 37**

## What this is, and what it is not

The public venue page lists the published events tied to that venue. The listing
now withholds an event whose party **at this venue** is still secret and whose
reveal has not fired.

This is a **page-level mitigation**. `meta-gates.md` states the security
boundary is RLS, never a page: the underlying rows stay readable outside this
page, so this change makes nothing private. It narrows one product surface.
The boundary itself moves only when the RLS policy moves — phase 37's work,
which needs the phase-32 comparator to prove nothing else shifted with it.

Describing this as a fix is how the real fix stops happening. It is a
mitigation.

Pre-existing condition. Not introduced by phase 33.

## The predicate

A party at this venue withholds its event iff:

```
venue_secret === true && venue_reveal_email_sent !== true
```

Both columns verified in the migrations, not assumed:

| Column | Definition | Source |
|---|---|---|
| `event_parties.venue_secret` | `boolean NOT NULL DEFAULT false` | `supabase/migrations/20260226400000_party_lineup_venue_secret.sql:6` |
| `event_parties.venue_reveal_email_sent` | `boolean DEFAULT false` — **nullable** | `supabase/migrations/20260305200000_venue_reveal_on_purchase.sql:10` |

The flag is set to `true` only after the reveal mail has gone out
(`src/app/api/cron/venue-reveal/route.ts:112,176`). Because it is nullable,
anything other than an explicit `true` is read as "the reveal has not fired" —
`venue-secrecy.md`, gate *default chiuso*. The page only **reads** the flag;
the monotone switch is untouched, and nothing here makes it easier to trip.

## Edge cases — decided, all towards withholding

Withholding costs visibility, which is recoverable. The other direction is not.

1. **The event has further parties at other venues.** Irrelevant. Only the
   party that links THIS venue is considered.
2. **Two parties at this same venue, one still secret and one revealed.** The
   event is withheld, even though the revealed party may already name this
   venue elsewhere. *Cost:* an event already public by another route
   disappears from this page until the reveal fires.
3. **A past event whose party was never marked revealed** (the cron may never
   have run for old rows). Withheld. *Cost:* the history on this page can be
   shorter than reality. No date-based exemption was added: a second predicate
   keyed on the date would fail open every time a date is wrong, and a date is
   exactly the kind of field that is wrong.

## Verification

**There is no test runner for the product.** Nothing below is verified because
tests pass — there are none.

**1. `npm run build` — green.** The build is also the typecheck. Its route
table reports `/venues/[slug]` as `ƒ (Dynamic)`, server-rendered on demand and
not prerendered, which is the observable form of `venue-secrecy.md`, gate
*cache e pre-render*.

**2. Proved by mutation.** A throwaway probe (kept in `/tmp`, not committed)
read the filter callback **verbatim out of the shipped `page.tsx`** and ran that
same extracted text over fixture rows — so the artefact asserted against and the
artefact executed are the same text, rather than a retyped copy that could drift
from what ships.

| Fixture (one venue) | Expected | Observed |
|---|---|---|
| secret, flag `false` | withheld | withheld |
| secret, flag `NULL` | withheld | withheld |
| secret, flag `true` | listed | listed |
| never secret | listed | listed |
| two parties, one secret + one revealed | withheld | withheld |

Two mutations, each asserted to have actually landed **before** its outcome was
read (`ai-engineering.md`, gate *prova per mutazione* — an unapplied
substitution turns a green into a false negative):

- `!== true` → `=== false`: the `NULL` row escaped and got listed. The
  null-safe branch is load-bearing.
- `venue_secret === true` → `false`: every fixture got listed. The condition is
  what excludes them, not something else in the pipeline.

**What this does NOT prove.** The probe executed the predicate text, not a
running Next.js server, and not against a real database. It shows the predicate
sorts rows correctly; it does not show Supabase returns those columns to an
anonymous client as expected. That gap is what the manual procedure below is
for.

## Manual procedure

Preconditions: a published event with a party at venue V, that party with
`venue_secret = true` and `venue_reveal_email_sent` not `true`.

1. Open a **private browsing window** — no session, no account. Confirm the
   session is genuinely absent (the app offers a login entry point rather than
   a member view).
2. Visit `/venues/<slug-of-V>`.
3. **Must be observed:** the venue's own details render as before — name,
   photo, bio, address, maps link, socials. The Events section does **not**
   list that event. If the secret party is the only link between the event and
   this venue, the Events section is absent entirely.
4. Set that party's `venue_reveal_email_sent` to `true` (or let the reveal cron
   run its course), reload the same page as the same anonymous visitor.
   **Must be observed:** the event now appears in the Events section.
5. Regression check: an event whose party at V was never secret is listed in
   both states — the filter withholds only what it is meant to.

**No error tracking exists in this project.** The failure mode of this filter is
silent by construction: too strict and an event quietly stops appearing. The
observable effect is step 5 — an event that should be listed and is not. Whoever
runs step 4 should run step 5 in the same sitting.

## Residual, deliberately not closed here

- The rows themselves remain readable outside this page. **Phase 37.**
- No migration, no RLS policy and nothing under `supabase/` was touched, by
  instruction: phase 37 needs the phase-32 comparator to show nothing else
  moved.
- Other exit points for an address were **not** re-enumerated in this pass.
  `venue-secrecy.md`, gate *percorsi enumerati*, requires that enumeration to be
  redone by reading the code, and its list is dated by construction. Phase 37
  should redo it rather than inherit this one.
