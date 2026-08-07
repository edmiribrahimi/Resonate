---
phase: 33-server-data-access-layer
plan: 11
subsystem: nextjs-architecture
tags: [capabilities, dal, public-pages, nav-props, catalogue]
requires:
  - "33-01 (getAccessContext().userId)"
provides:
  - "six public pages sourcing role/status from the session"
affects:
  - "phase 34 STAFF-03 (owns MobileNav's props and both edit affordances)"
  - "33-14 (phase gate: the census meter drops by 12 lines / 6 files)"
tech-stack:
  added: []
  patterns:
    - "cast at the page boundary, never widen a shared nav component"
    - "an identity test keys on userId, not on a role that used to imply one"
key-files:
  created: []
  modified:
    - src/app/page.tsx
    - src/app/(public)/gallery/page.tsx
    - src/app/(public)/newsletter/page.tsx
    - src/app/(public)/tickets/[id]/page.tsx
    - src/app/(public)/artists/[slug]/page.tsx
    - src/app/(public)/venues/[slug]/page.tsx
decisions:
  - "D-33-11-A: `if (role)` on the home page became `if (userId)` — the header's `?? \"member\"` fallback made `role` a proxy for authenticated, and `getAccessContext()` does not carry it"
  - "D-33-11-B: the UserRole/UserStatus cast moves to the page boundary; MobileNav is NOT widened, because it is shared and phase 34 rewrites it"
  - "D-33-11-C: both edit predicates left verbatim — but the plan's REASON was wrong, and the corrected reason is recorded"
metrics:
  duration: "~35 min"
  completed: 2026-08-07
  tasks: 2
  commits: 2
requirements: [CAP-05]
---

# Phase 33 Plan 11: Six Ungated Public Pages Summary

Six public pages take `role` and `status` from the session instead of from a
request header — **which closes a coupling, not an open hole**: none of the six
gated anything with the header, so nothing an attacker could do stops working.
What ends is 44 surfaces depending on one middleware line to be safe.

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | the four pure nav-prop pages | `f1553a4` | `src/app/page.tsx`, `(public)/gallery/page.tsx`, `(public)/newsletter/page.tsx`, `(public)/tickets/[id]/page.tsx` |
| 2 | the two catalogue detail pages | `973b12a` | `(public)/artists/[slug]/page.tsx`, `(public)/venues/[slug]/page.tsx` |

## Say the size of this plainly

These six pages **gate nothing with the header**. Four hand both values straight
to `<MobileNav>`; two additionally decide whether an edit button is drawn. So
the value delivered is not that an attack stops working — the inbound header was
already deleted unconditionally before the middleware set it
(`src/lib/supabase/middleware.ts:210-212`). The value is that six of the
forty-four readers stop **depending** on that one line, and that the source of
identity is now the session.

A reviewer who sees `(public)` and "capability" in the same diff should not go
looking for a security fix here. There isn't one.

## The census delta

The meter's base at commit `0521203` is **102 lines / 47 files** — the raw
`grep -rn "x-user-"` over `src` returns 112/48, and the ten lines in
`src/lib/supabase/middleware.ts` are the *producer*, not a reader. Reconciled
against the same base three sibling plans used.

| | lines | files |
|---|---|---|
| base (`0521203`) | 102 | 47 |
| after this plan | **90** | **41** |
| delta | **−12** | **−6** |

Six files × two lines each. The total fell by exactly what was removed, and by
nothing else. (Raw meter including the middleware: 112/48 → 100/42.)

Three of the surviving entries — `src/lib/capabilities/server.ts` (2),
`guards.ts` (1), `src/types/database.ts` (2) — are prose mentions in comments,
not reads. They are counted here because the base counted them; whoever closes
the meter at zero will need to strip them or exclude them deliberately.

## Decisions

### D-33-11-A — the home page redirect keys on `userId`, and that is what KEPT the verdict

**The plan asserts the four pure pages contain "no `redirect`, no `notFound`, no
query change". `src/app/page.tsx:15` contains a redirect**: `if (role)
redirect("/dashboard")`. The plan's premise is wrong on one of its six files,
and a literal transcription would have moved a verdict.

Under the header transport, `role` was a **proxy for "authenticated"**.
`middleware.ts:219-223` sets the role header **iff** `user` exists, and
`middleware.ts:105-110` applies `?? "member"` — so the value is truthy for every
signed-in caller, *including one with no `profiles` row*, a case that file names
out loud. `getAccessContext()` carries no such fallback:
`my_access_context()` reads `role` straight out of `public.profiles`
(`supabase/migrations/20260808000000_access_context_user_id.sql:130-132`), so it
is `null` for that caller while `user_id` — `auth.uid()`, line 129 — is still
theirs.

| Visitor | before (header) | naive `if (role)` | shipped `if (userId)` |
|---|---|---|---|
| anonymous | no header → renders landing | renders landing ✓ | renders landing ✓ |
| authenticated, has profile row | header truthy → `/dashboard` | `/dashboard` ✓ | `/dashboard` ✓ |
| **authenticated, no profile row** | `?? "member"` → **`/dashboard`** | **renders landing ✗** | **`/dashboard` ✓** |

`userId` is non-null exactly when the middleware's `if (user)` was true, and it
is `string | null`, **never `""`** (D-33-01-A) — so the test is exact rather
than accidental. This is the wave-1 carry-forward applied: the consumer was read
before the value was chosen.

Is the third row reachable? A trigger creates the profile on signup
(`20260225000000_phase3_referral.sql:29`, `handle_new_user`), so it is unusual —
but the middleware itself treats it as real, and "unusual" is not "impossible"
(trigger failure, a row deleted while a session lives, a user created directly
in the auth dashboard).

### D-33-11-B — cast at the page boundary; the nav is not touched

`MobileNav` is typed `role: UserRole | null, status: UserStatus | null`
(`src/components/layout/MobileNav.tsx:9-10`) and `getAccessContext()` answers
`string | null`. The plan says to widen the prop rather than re-add a cast. **The
prop was not widened**: `MobileNav` is shared with the other wave-2 plans, and
phase 34 (STAFF-03) rewrites it against four roles. Widening it here would be
editing another plan's surface and paying for the same redesign twice.

The cast is **better founded than the one it replaces**: the old
`headersList.get("x-user-role") as UserRole` asserted a union a request header
could not guarantee; the value now comes from the `profiles` enum.

### D-33-11-C — both edit predicates verbatim, and the plan's reason corrected

`(role === "master" || role === "organizer")` survives on both catalogue pages,
now sourced from the session. No capability key was introduced on either page.

**Neither affordance is a link to a route.** Both are modals that call a **server
action** — `updateArtist` / `updateVenue` — which `nextjs-architecture.md` (gate
*server action autorizzata*) treats as a public endpoint regardless of which page
imports it. So the gate that matters is inside the action, and then again in RLS.
Read, not asserted:

| Affordance | server-side check | RLS on the write |
|---|---|---|
| `artists/[slug]/page.tsx:80` | `src/app/(organizer)/organizer/artists/actions.ts:125-137` — auth + `role !== "organizer" && role !== "master"` → throw | `artists_update_organizer`, `20260807010000_policies_to_capabilities.sql:82-85` |
| `venues/[slug]/page.tsx:89` | `src/app/(organizer)/organizer/venues/actions.ts:125-137` — same shape | `venues_update_organizer`, `20260807010000_policies_to_capabilities.sql:414-417` |

`access-gating.md`, gate *coerenza navigazione/permessi*, is therefore satisfied
**concretely**, which is what the plan asked for.

**But the plan's reason for leaving the predicate alone does not survive
measurement.** The plan says substituting `catalogue.manage` "would hide the link
from a `pending` organizer who sees it today", implying the substitution would be
wrong. Both policies ask `catalogue.manage`, and that grant carries
`requires_approved = true` (`20260807000000_capability_model.sql:399-400`, under
the comment *"P3: the four artists/venues organizer policies — role AND
status"*). So today's button is **wider than the write it leads to**: a pending
organizer sees the control, the action lets them through, and RLS refuses the
UPDATE.

Narrowing the button to the capability would be an **improvement**. Improving a
verdict is still changing one, and CAP-05 criterion 4 forbids that in this phase
— so the instruction stands and the predicate is untouched. **The instruction
did not change; its justification did**, and the corrected justification is in
both files' comments so the next reader is not misled.

## Venue secrecy

`venues/[slug]/page.tsx` is a venue surface, and was treated as Critical.

- `venue.address` and `venue.google_maps_url` render on **exactly** the condition
  they always did — the field being non-empty — for every visitor including an
  anonymous one. `git diff -U0` filtered on `.select(` / `.eq(` / `.in(` /
  `address` / `google_maps` returns only the removed `headers` import and one
  comment line.
- `venue_reveal_sent` is a **monotone one-way switch**. It lives on `tickets` /
  `rsvps`, is not read on any of these six pages, and nothing here can trip it.
  Nothing was made easier to trip, in either direction.
- `(public)/tickets/[id]/page.tsx` shows `event_parties.venue_text` to the holder
  of that ticket. The fetch is still `.eq("user_id", user.id)` and the render
  condition is still `displayVenue &&`. Untouched.
- **A logged-out visitor renders exactly what they rendered before**, on all six
  — see the anonymous row below.

### Already-enumerated exposure, NOT introduced here

`venue-secrecy.md` already lists `venues/[slug]/page.tsx` among the exit points,
and re-reading it confirms why: the page renders `venue.address` and the Google
Maps link **unconditionally to anyone**, and lists the published events with a
party at that venue (`event_parties_select_published`,
`20260225150000_party_architecture.sql:31-37`, is readable by `anon`). So for any
venue that has both a catalogue row and a `venue_id` on a party, the address and
the "which events happen here" linkage are public regardless of reveal state.

**This is pre-existing, is not caused by this diff, and was not touched.** It is
recorded here rather than in the shared `deferred-items.md` (which this plan may
not write) because `venue-secrecy.md` obliges saying it, and because the verifier
should decide whether it is intended catalogue behaviour or a gap.

## The anonymous case is normal flow, not an error path

`public.my_access_context()` is granted to `authenticated` and **revoked from
`anon`** (`20260808000000_access_context_user_id.sql:140-141`), so an anonymous
caller gets `42501`, not an empty result. `getAccessContext()` treats exactly
that as the answer *"there is nobody to answer about"* and returns
`ANONYMOUS_CONTEXT` (`src/lib/capabilities/server.ts:211-218`) — `role: null`,
`status: null`, which are **the same values the absent header produced**. No
`try`/`catch` was added anywhere; the resolver's throw stays the observable
effect for a real failure.

**Cost, measured rather than assumed.** The 42501 branch calls
`supabase.auth.getUser()` to tell "anonymous" from "the GRANT is gone". For a
visitor with no session that costs **no second network call**: `auth-js` returns
`{ user: null }` with `AuthSessionMissingError` as soon as there is no
`access_token` — `node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:1287-1288`,
before the `/user` request on line 1290. So an anonymous hit on these pages pays
**one** round trip (the refused `rpc`), not two. That is the D-13 cost the
conversion contract accepts, and it is now paid on `/` — the most-hit public
route — where the header previously cost nothing.

`/` is still `ƒ` (dynamic) in the route table, as it was under `headers()`. No
caching regression: `nextjs-architecture.md`, gate *cache esplicita*, holds.

## Verification

**There is no test runner for this product, and none was added. Nothing here is
verified because tests pass.** What was actually run:

| Check | Result |
|---|---|
| `npm run build` after each task commit | passes |
| `grep -rn "x-user-" ` across the six files | **0** |
| `grep -rn "CATALOGUE_MANAGE\|STAFF_MANAGE"` across the six | **0** |
| `grep -c 'role === "master"'` on both catalogue pages | `1` each — predicate survives |
| `git diff -U0` filtered on `redirect\|notFound\|.eq(\|.select(\|.from(` | one line: `if (role)` → `if (userId)` |
| census `grep -rn "x-user-"` over `src` | 112 → 100 lines, 48 → 42 files |
| `git status --short` after restoring both mutations | clean |

### What the green build does NOT say

**`npm run build` cannot see an inverted gate, and that was measured on this
plan's own file rather than cited from a sibling.**

### Mutation proofs — each mutation asserted applied before its result was read

`ai-engineering.md`, gate *prova per mutazione*.

| Mutation | Asserted applied | Result |
|---|---|---|
| `src/app/page.tsx`: `if (userId)` → `if (!userId)` — the redirect fully inverted | `grep -c 'if (!userId) redirect'` → `1` | `npm run build` → **exit 0, "Compiled successfully"**. The build is **blind** to the inversion ✓ limit confirmed |
| `(public)/newsletter/page.tsx`: cast dropped, `role={role as UserRole \| null}` → `role={role}` | `grep -c 'role={role}'` → `1` | `npm run build` → **exit 1**, *"Type error: Type 'string \| null' is not assignable to type 'UserRole \| null'"* at `newsletter/page.tsx:17` ✓ flips |

Both restores were asserted, not assumed (`grep -c` → `1` on the original line in
each file), and `git status --short` is clean.

Read together: the build **does** compile these files and **does** hold the nav
prop boundary — so a green build is evidence that the conversion type-checks. It
is **not** evidence that any verdict was preserved. That claim rests on the truth
table in D-33-11-A and on the manual procedures below, which are owed.

## Manual verification still owed

Deferred to the end of the build by the owner, so **not run**. Nothing was
substituted for it.

**A. The anonymous visitor — the one that matters most (unauthenticated)**
1. In a private window, with no session, open `/`. **Observe:** the landing page
   with the logo and the three links — *not* a redirect to `/dashboard`, and no
   error boundary.
2. Open `/gallery`, `/newsletter`, `/venues/<slug>`, `/artists/<slug>`.
   **Observe:** each renders as before; the bottom nav shows the logged-out set;
   **no edit button on either catalogue page**.
3. On `/venues/<slug>`: **observe** the address block and the Google Maps link are
   exactly what they were before this phase — same venue, same fields, nothing
   newly shown and nothing newly hidden.

**B. The signed-in member (role `member`, status `approved`)**
1. Sign in, open `/`. **Observe:** immediate redirect to `/dashboard`.
2. Open `/venues/<slug>` and `/artists/<slug>`. **Observe:** no edit button.
3. Open `/tickets/<own ticket id>`. **Observe:** the ticket, the QR, and the venue
   line exactly as before.

**C. The organizer, on both status values — this is the pair that proves D-33-11-C**
1. As `organizer`/`approved`, open `/artists/<slug>` and `/venues/<slug>`.
   **Observe:** the edit button appears; opening it and saving succeeds.
2. As `organizer`/`pending`, open the same two pages. **Observe:** the edit
   button **still appears** (today's verdict, deliberately preserved), and
   saving **fails** — refused by RLS, surfaced by the modal's error state. If the
   button has disappeared, a capability key was introduced somewhere and criterion
   4 is broken.

**D. The mutation proof for the home page redirect — must not be skipped**
Inside a transaction, delete the `public.profiles` row of a signed-in test
subject, reload `/` with that session, **observe the redirect to `/dashboard`
still happens**, roll back and re-read the rollback. That is the third row of the
truth table in D-33-11-A, and it is the only step that distinguishes the shipped
`if (userId)` from the naive `if (role)`.

**E. `master`** — repeat C.1; the button appears and the save succeeds.

## Deviations from Plan

**1. [Rule 1 — bug avoided] The home page redirect keys on `userId`, not `role`.**
The plan states these four pages contain no redirect; `src/app/page.tsx:15` does.
Transcribing `if (role)` literally would have stopped redirecting an
authenticated caller with no `profiles` row. Full analysis and truth table in
D-33-11-A. Commit `f1553a4`.

**2. [Rule 3 — plan letter vs. parallel-execution constraint] The cast moved to
the page boundary instead of widening `MobileNav`.** The plan's conversion
contract item 5 says to widen the prop. `MobileNav` is shared with the other
wave-2 plans and is rewritten by phase 34, so it was not edited. D-33-11-B.

**3. [Rule 2 — a stated reason that measurement contradicts] The justification
for leaving the edit predicates alone was rewritten.** The instruction was
followed exactly; only the reason changed, because the substitution the plan
calls harmful is measurably an improvement. D-33-11-C. Commit `973b12a`.

**4. Two explanatory comments were reworded** to avoid containing the literal
strings `x-user-` and `CATALOGUE_MANAGE`. Both of the plan's grep-based checks
count *any* occurrence, including one inside a comment — a comment mention would
have failed the gate, inflated the census meter, and left a future reader
thinking the page still reads the header.

## Deferred / noted, not fixed here

- The pre-existing `venues/[slug]` exposure described above. Out of scope; not
  caused by this diff; not written to the shared `deferred-items.md` per the
  parallel-execution constraint.
- `updateArtist` / `updateVenue` (`actions.ts:129-133` in each) still do their
  own `profiles.select("role")` read. They do **not** read `x-user-*`, so they
  are not in the census and are not this plan's files — but they are two more
  copies of the profiles-to-role join that CAP-01 exists to collapse.
- Pre-existing `npm run lint` state (~21 errors / ~108 warnings) untouched and
  unrelated. `npm run lint` was not run: the six files carry no new lint surface
  beyond comments and a type assertion.
- `npm run verify:persona` was **not** run: no file under `CLAUDE.md` or
  `.claude/` was modified by this plan.
- The phase gate (baseline capture and comparator) belongs to 33-14 and was not
  run here.

## Known Stubs

None. No placeholder value, empty literal or "coming soon" string was
introduced; every one of the six pages renders from the same data it always did.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information-disclosure (pre-existing) | `src/app/(public)/venues/[slug]/page.tsx` | The page renders `address` + `google_maps_url` unconditionally to anonymous visitors, and lists the published events with a party at that venue. Already enumerated by `venue-secrecy.md`; **not introduced or widened by this diff**. Flagged so the verifier decides whether it is intended catalogue behaviour. |
| threat_flag: nav/permission drift (pre-existing) | `(public)/artists/[slug]/page.tsx:80`, `(public)/venues/[slug]/page.tsx:89` | The edit button's predicate is wider than the RLS policy behind the write: a `pending` organizer sees a control whose UPDATE is refused. Preserved deliberately (criterion 4); phase 34 STAFF-03 owns the alignment. |

T-33-57 through T-33-61 hold as the plan's register specifies. T-33-59 (a venue
address or reveal state altered) is mitigated by the filtered diff shown above;
T-33-61 holds because no dependency was added.

## Self-Check: PASSED

- `src/app/page.tsx` — FOUND (modified)
- `src/app/(public)/gallery/page.tsx` — FOUND (modified)
- `src/app/(public)/newsletter/page.tsx` — FOUND (modified)
- `src/app/(public)/tickets/[id]/page.tsx` — FOUND (modified)
- `src/app/(public)/artists/[slug]/page.tsx` — FOUND (modified)
- `src/app/(public)/venues/[slug]/page.tsx` — FOUND (modified)
- commits `f1553a4`, `973b12a` — FOUND in `git log`
- `git status --short` — clean before this SUMMARY was written
