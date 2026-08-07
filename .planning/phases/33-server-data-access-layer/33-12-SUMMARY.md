---
phase: 33-server-data-access-layer
plan: 12
subsystem: access-gating
tags: [cap-05, capabilities, forged-header-probe, venue-secrecy, drinks, wave-2]
requires:
  - "33-01 — getAccessContext().userId and the CAP catalogue"
  - "33-02 — I4, scripts/probe-forged-identity.sh"
provides:
  - "CAP-05 criterion 2, MEASURED: with the middleware strip removed, the converted page answers a forged identity header exactly as an anonymous one"
  - "the positive control, EXECUTED and FIRING on the real application (exit 1, 1/0, +10 046 B)"
  - "six converted surfaces: −12 header lines, −6 files on the I3 meter"
  - "a phase-level methodological finding: assert the mutation on the artefact the check measures"
  - "five owed UAT items in phase 32's shape, result: [pending]"
affects:
  - "plan 33-14 (the I3 meter must reach 0; this plan takes 102 -> 90)"
  - "phase 34 STAFF-03 (owns MobileNav, ManagementSection and the isStaff family)"
tech-stack:
  added: []
  patterns:
    - "assert the mutation reached the ARTEFACT UNDER TEST, not merely the source file"
    - "BUILD_ID echoed in the served HTML as the server-identity assertion"
    - "comment-filtered greps, because the naive form scores 3 on three commented-out lines"
key-files:
  created: []
  modified:
    - src/app/(public)/events/[slug]/menu/page.tsx
    - src/app/(public)/events/page.tsx
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(members)/dashboard/page.tsx
    - src/app/(members)/attendance/page.tsx
    - src/app/(members)/membership-card/page.tsx
decisions:
  - "D-33-12-A: isApproved / isMasterRole on the event detail page are NOT purely presentational — they feed isVenueVisible (:529, :531 -> :77, :85, :87). Their form was kept, which is the strictly non-widening direction on a monotone reveal path. Phase 34 must not tidy them without an impact analysis."
  - "D-33-12-E: the mutation gate is amended — assert the mutation on the ARTEFACT THE CHECK MEASURES, through a reader that observes that artefact. A source-file assertion cannot certify a running server."
  - "D-33-12-B: supabase.auth.getUser() removed from the menu page only, after auditing every use of `user`."
  - "D-33-12-C: the positive control was re-established against PRE-CONVERSION code, because it did not fire against converted code — as the plan anticipated."
  - "D-33-12-D: git stash is prohibited in a worktree; the pre-conversion file was materialised with `git show <base>:<path>` instead."
metrics:
  duration: ~95 min
  tasks: 4
  commits: 3
  files_changed: 6
  completed: 2026-08-07
requirements: [CAP-05]
---

# Phase 33 Plan 12: The Six Remaining Public and Member Pages Summary

The public drink menu now decides `canManage` from the session, and the probe
that measures whether that matters was **run with its positive control** — which
fired, but only after a false negative was caught and diagnosed rather than
reported as a green.

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | the drink menu — the probe surface | `42355c7` | `(public)/events/[slug]/menu/page.tsx` |
| 2 | the two draft-visibility surfaces | `1839c0b` | `(public)/events/page.tsx`, `(public)/events/[slug]/page.tsx` |
| 3 | the three member surfaces | `8e73991` | `(members)/dashboard`, `attendance`, `membership-card` |
| 4 | the probe with its positive control | — (verification, no code) | see below |

## The meter delta

Measured on this worktree, at base commit `0521203`:

```
BEFORE  npm run verify:no-header-identity  ->  102 line(s) across 47 file(s)
        grep -rni 'x-user-' src/ | grep -v middleware.ts | wc -l   ->  102

AFTER   npm run verify:no-header-identity  ->   90 line(s) across 41 file(s)
        grep -rni 'x-user-' src/ | grep -v middleware.ts | wc -l   ->   90
```

**−12 lines / −6 files**, exactly the 2 lines × 6 files these pages carried.
Instrument and independent census agree on both readings.

The base is **102 / 47**, not the 98 / 45 recorded in `33-02-SUMMARY.md` — the
fourth plan to reconcile to the same corrected pair. The meter is expected to
exit 1 until 33-14 lands.

Two of my own explanatory comments initially **re-introduced the literal string**
and pushed the count back up. I3 counts comment-shaped lines toward its verdict
by design, so the meter caught both immediately and both were rephrased. Worth
recording: a conversion plan can raise its own meter by explaining itself.

---

## Task 4 — the probe, and the false negative that came first

### The 2x2 that was actually measured

The plan asks for three states. Four were needed, because state 3 did not fire
and the plan's own instruction for that case is to re-establish the control
against pre-conversion code. Every row below had the **running server's identity
asserted** before its result was read (see the next section for why that matters).

| # | middleware strip | menu page | `Add Item` forged / anon | bytes | exit |
|---|---|---|---|---|---|
| A | **armed** | converted | 0 / 0 | 28 363 / 28 363 | 0 |
| B | **REMOVED** | converted | 0 / 0 | 28 363 / 28 363 | 0 |
| C | **REMOVED** | **pre-conversion** | **1 / 0** | 38 406 / 28 360 | **1** |
| D | **armed** (restored) | converted | 0 / 0 | 28 363 / 28 363 | 0 |

**Read all four rows. A later reader who takes only the green ones has taken the
weakest part of the evidence.** The two rows that carry the argument are C and B,
and neither of them is a green.

**Row C is the positive control, and it FIRED — exit 1, `Add Item` forged 1 /
anon 0, `+10 046 B`.** The management affordance was served to an anonymous
request that supplied its own master role header. This is the row that proves
**the probe fires on the real application**, not on a fixture: wave 1 could only
demonstrate the instrument against a throwaway HTTP server. It reproduces the
research measurement (`+10 522 B` on this event) to within build-to-build noise.
Without row C, every other row in this table is a number from an instrument
never shown to be alive.

**Row B is the actual answer to CAP-05 criterion 2, and it is measured, not
argued: a request that forges an identity header is answered exactly as an
anonymous one.** The middleware strip — the single protection covering every
remaining header reader in the repository — was **removed** for that row, and
the converted page still answered the forged master identity exactly as it
answered the anonymous one. So the guarantee does not rest on the middleware
running first; it rests on the page asking the session. That is stronger than
the plan asked for, and it is the row to quote when criterion 2 is assessed.

Rows A and D are the ordinary operating state and they say the least: they are
consistent with a correct conversion **and** with a dead instrument, which is
exactly why they cannot stand alone.

Byte columns are reported as context only, per the instrument's own warning.
The verdict is the affordance count.

### FINDING FOR THE PHASE — the mutation gate has a blind spot: the assertion and the measurement must name the SAME ARTEFACT

> **A mutation asserted applied is not sufficient if the assertion reads a
> different artefact than the check measures.**
>
> Both assertions here read the **source file**. The artefact under test was the
> **running server**. `EADDRINUSE` meant every run was answered by the first
> server, so the source was mutated and the measurement was not. The gate was
> followed correctly and still returned a false negative.
>
> **The fix is to make the assertion and the measurement refer to the same
> thing:** read `.next/BUILD_ID` and require that string to appear in the served
> HTML before reading any probe result.

This is a **fifth shape** of "green for the wrong reason", after the four this
phase and the last already caught — and it is the subtlest of them, because
**the discipline was followed**. The other four were failures to run the gate;
this one is the gate running faithfully against the wrong object. Any check whose
measurement crosses a process, a build, a cache or a network boundary inherits
it: a source-file assertion cannot certify a running server, a compiled bundle,
a warm cache or a deployed environment.

The earlier form of the rule — *assert the mutation was applied before reading
any result* — is **not wrong and should not be dropped**. It is incomplete. The
amended form, for whichever plan carries the phase's methodology forward:

> Assert the mutation on **the artefact the check will actually measure**, and
> assert it **through a reader that observes that artefact**.

`33-02-SUMMARY.md` already applied the stronger form once without naming it: it
asserted its probe file mutation *through the instrument's own exported reader*
rather than through a second `grep`. That is the same principle, one level lower
down.

### How the false negative was caught rather than reported

The first attempt at row C returned **0 / 0 — the probe did not fire**, which
would have been indistinguishable from a dead instrument.

The mutation had been asserted applied, twice, exactly as the plan requires:

```
git diff --stat src/lib/supabase/middleware.ts   ->  4 insertions(+), 3 deletions(-)
grep -c 'requestHeaders.delete("x-user-'          ->  3     <- the naive form LIES
grep -v '^\s*//' … | grep -c 'requestHeaders…'    ->  0     <- comment-filtered, true
```

The sibling plans' warning is confirmed on this tree: **the naive assertion
returns 3 with all three lines commented out.** Only the comment-filtered form
tells the truth.

But both assertions read the **source file**, and the source file was not the
artefact under test. Diagnosis, from the evidence rather than from a guess:

1. Every response across four different builds was byte-identical at 28 363 B —
   impossible if four builds were really being served.
2. `canManage\":false` was present in the RSC payload of the *pre-conversion*
   page with the strip removed, which cannot happen if that build were running.
3. `lsof -nP -iTCP:3011` plus the server log gave the cause:
   `Error: listen EADDRINUSE: address already in use :::3011`.

`pkill -f "next start"` had not matched the running process, the new servers
never bound, and **rows B and C were being answered by the row-A server**.

**The fix is a new assertion, and it belongs to the phase, not just to this run:**
after starting the server, `cat .next/BUILD_ID` and require that string to appear
in the served HTML. It proves the process answering the port is the build that
carries the mutation. Rows B, C and D each passed it before their probe ran:

```
row C  BUILD_ID ZEmWhgdKSB6a7r4mxJVil   present in served HTML: 1
row B  BUILD_ID rWz7P5yEH7LZcM6JsY9qw   present in served HTML: 1
row D  BUILD_ID ealQnljqvZopRT_YtlEZp   present in served HTML: 1
```

The generalisation is written up above, under *FINDING FOR THE PHASE*.

### `git stash` was NOT used to obtain the pre-conversion code

The stash list is shared across every linked worktree, so a stash here can
silently apply a sibling's WIP. The pre-conversion file was materialised with
`git show <base-commit>:<path>` into `/tmp` and copied in, then restored with
`git show HEAD:<path>`. Both directions were asserted by
`git diff --stat` and by the header count (2 before, 0 after).

### The restore, verified three ways and not by eye

```
diff /tmp/…-middleware-pristine.ts src/lib/supabase/middleware.ts   -> silent (IDENTICAL)
shasum -a 256 src/lib/supabase/middleware.ts
      f9f3458847489e731e8e0fc3db134133dec5cf5f401760fcbb46250220ecb182
      (byte-equal to the hash taken BEFORE the mutation)
git status --porcelain                                              -> empty
grep -v '^\s*//' … | grep -c 'requestHeaders.delete("x-user-'       -> 3  (ARMED)
```

The last line is the one that matters: it proves the strip is **armed**, not
merely **present**. The naive count would have read 3 either way.

### A logged-out visitor renders exactly what they rendered before

Not asserted — diffed. The anonymous response was captured pre-conversion and
post-conversion, build ids and webpack chunk hashes normalised, and compared:

- **The server-rendered DOM is identical.** Same party selector, same
  "The drink menu is closed." panel, same guest token block.
- The only semantic difference in the RSC payload is the final element:
  `null` (pre) versus `false` (post). That is precisely the
  `{user && <MobileNav …>}` -> `{isAuthenticated && <MobileNav …>}` change.
  **React renders both as nothing.** It is the whole of the 3-byte delta
  (28 360 -> 28 363).

### Checkpoint steps 3–6: OWED, not performed — five UAT items, `result: [pending]`

Steps 3, 4, 5 and 6 require live signed-in sessions as an `organizer`, an
approved `member`, and a `pending` member. This executor has no such accounts,
and the owner has deferred manual verification to the end of the build.
**Deferred is not verified** (`32-VERIFICATION.md` precedent), so they are
recorded as owed rather than substituted — written in phase 32's UAT shape, so
they merge into `32-HUMAN-UAT.md`'s successor unchanged, each carrying
`result: [pending]`.

**Slugs are deliberately left as placeholders.** `.planning/` is tracked and
this repository is public (`ai-engineering.md`, gate *la pianificazione e'
pubblica*). Roles are named; no person is.

#### 1. M-33-12-A — an organizer still manages the drink menu
role: `organizer` (any status — `staff.manage` ignores status, and that is the
predicate this plan preserved)
steps: sign in, open `/events/<published-event-slug>/menu`
expected: the drink-management UI appears, exactly as before this phase. An
`Add Item` control is present.
evidence if it fails: `src/app/(public)/events/[slug]/menu/page.tsx:93` —
`canManage = capabilities.has(CAP.STAFF_MANAGE)`. A refusal means the grant for
`staff.manage` is not reaching this role, not that the page is wrong.
result: [pending]

#### 2. M-33-12-B — an approved member still does not
role: `member`, status `approved`
steps: sign in, open the same `/events/<published-event-slug>/menu`
expected: **no** management UI, exactly as before. No `Add Item` control.
result: [pending]

#### 3. M-33-12-C — drafts, signed in and signed out
role: `organizer`, then anonymous
steps: sign in as `organizer` and open `/events`; note the list. Sign out,
reload `/events`.
expected: signed in — the same list as before this phase, **drafts included**.
Signed out — the published list only.
result: [pending]
note: **This is a criterion-4 regression check, not a criterion-2 probe.**
Measured: forging a master identity header on `/events` returns the same slugs
as an anonymous request **and still does with the middleware strip removed**,
because RLS on `public.events` refuses unpublished rows to `anon` regardless of
what `canSeeDrafts` decides. The page therefore **cannot see** the difference
criterion 2 asks about, and a green here says nothing about it. Criterion 2's
evidence is the four-row probe table above, on the drink menu. Do not let this
check stand in for that one.

#### 4. M-33-12-D — the pending dashboard
role: `member`, status `pending`
steps: sign in, open `/dashboard`
expected: the pending notice renders, exactly as before. The staff shortcut
block does not.
result: [pending]

#### 5. M-33-12-E — the membership card
role: `member`, status `approved`
steps: sign in, open `/membership-card`
expected: the card renders, exactly as before, with the referral link.
result: [pending]

Nothing was substituted for these five. The positive control was **not** excused
by them: it needs no account, and it was run.

---

## Findings recorded rather than acted on

### 1. ⚠️ PHASE 34, READ THIS BEFORE TIDYING: `isApproved` / `isMasterRole` sit on a venue-reveal path

**These two look exactly like the presentational leftovers phase 34 is meant to
sweep up. They are not. Do not convert them without reading what they feed.**

All line numbers below are **post-conversion**, read from the committed file at
`8e73991`, not copied from the plan (whose `:490` / `:511` / `:513` / `:637`
are pre-conversion and have shifted).

| Expression | Declared at | Passed in at | Consumed at | What it does there |
|---|---|---|---|---|
| `isMasterRole` | `src/app/(public)/events/[slug]/page.tsx:144` | `:531` | `:77` | **short-circuits the venue to visible** |
| `isApproved` | `src/app/(public)/events/[slug]/page.tsx:143` | `:529` | `:85`, `:87` | opens the two time-and-ticket reveal branches |

`isVenueVisible` is declared at `src/app/(public)/events/[slug]/page.tsx:63-93`
and called at `:523`. **Its diff in this plan is empty.**


The plan describes both as presentational, citing only the two render sites.
Read against the code, that is **incomplete** — they are also reveal inputs, as
the table shows.

**Why preserving their shape mattered, and why it was not merely the lazy
option.** `venue_reveal_sent` is a monotone one-way switch (`meta-gates.md`): a
location can be revealed and never re-hidden, because the mail has gone and the
screenshot exists. So on this path the only admissible change is *no easier to
trip*. Keeping the exact predicates and moving only the source — from a
forgeable inbound header to the session — is strictly **non-widening**: nobody
who could not see an address before can see one now, and a forged approved
status can no longer produce `isApproved` at all. Converting either to a
capability key would have been a **verdict change on a reveal path**:
`membership.active` matches `isApproved`'s predicate today but is a different
question, and any future regrant of it would silently move who sees a secret
venue.

`canSeeDrafts` governs `is_published` and is **not** an input to
`isVenueVisible`, so nothing about draft visibility can move an address.
`venue_reveal_sent` is not on this path at all.

**The instruction for phase 34:** if these two are converted, the change is
Critical under `CLAUDE.md`'s classification and needs an impact analysis and
owner validation *before* the edit — not a nav-vocabulary sweep. The reveal
matrix (`role` × `status` × ticket × time × `venue_reveal_on_purchase`) must
come out the same, and that has to be shown, not assumed.

### 2. The plan's description of which client the manage branch reads with

The plan and the probe's own header say the branch `canManage` selects "reads
through `getServiceClient()`". Measured: the **non-manage** branch reads
`drink_items` with the service client; the **manage** branch calls
`getDrinkItems()`, which uses the cookie-bound client. The service client is
still the page's reader for `events` and `event_parties`, so the sentence
"the code is the only boundary on this path" holds — but the attribution to the
manage branch specifically is wrong, and row C shows the consequence is a
rendered management UI rather than a service-role data leak. Correcting the
script's comment is 33-14's file, not this plan's.

### 3. `(public)/events/page.tsx` swallows every query failure

The pre-existing `catch { upcoming = []; past = [] }` renders "no events"
identically for a network fault, a bad query and a genuinely empty calendar —
the newsletter anti-pattern this codebase already records. **Not fixed:** it is
out of this plan's scope and changing a public page's failure behaviour is not a
side effect a conversion plan should ship. What *was* done: the resolve is
placed **outside** that try, so a `capabilities.resolve_failed` throw reaches
Next's error boundary instead of being rendered as an empty event list.

### 4. `pkill -f "next start"` does not match the running Next server

Recorded because the next person will reach for it and get a false negative.
Use `lsof -t -nP -iTCP:<port> -sTCP:LISTEN | xargs -r kill -9`, then confirm the
port is free before starting.

---

## Deviations from Plan

**1. [Rule 3 — blocking] The plan's `PORT=3007` was unavailable.**
A pre-existing `node` process holds 3007 and answers 500; 3000 and 3002 are held
by Docker. Port **3011** was used. That stale process was not touched.

**2. [Rule 3 — blocking] This worktree has no `.env.local`.**
Without it the menu page cannot reach Supabase and cannot render 200, so the
probe would refuse (exit 2), as it correctly did for wave 1. The gitignored
`.env.local` was copied in from the main checkout for the duration of the runs
and **deleted afterwards**; `.env*` is in `.gitignore`, every commit staged files
by name, and `git status --porcelain` is empty. No secret entered the repository.

**3. A fourth probe state was added.** The plan specifies three. State C
(pre-conversion + strip removed) was required by the plan's own contingency,
because state B did not fire. State B — converted code with the strip removed —
is extra, and it is the most informative row of the four.

**4. The inline `UserStatus` type import on the menu page.** Removed as
instructed; `UserStatus` now comes from the existing named type import instead,
because `MobileNav`'s props are `UserRole | null` / `UserStatus | null` and a
cast at the page boundary is unavoidable. The inline `import("…")` form was the
thing to remove, not the type.

**5. A commented-out JSX block on the menu page referenced `user`.** The
disabled `GuestLoginBanner` block carries an explicit re-enable instruction, and
`user` no longer exists on that page. Updated to `isAuthenticated` so the
documented re-enable path still compiles.

---

## Verification

**There is no test runner for this product. Nothing here is verified because
tests pass.** What was actually run:

| Claim | Evidence |
|---|---|
| six files, zero header reads | `grep -rci 'x-user-'` -> 0 on all six |
| the meter fell by exactly the census delta | 102/47 -> **90/41**, instrument and `grep \| wc -l` agree on both |
| build green after each task commit | `rm -rf .next && npm run build` -> passes, three times |
| `canManage` is the capability question | `menu/page.tsx:93` `capabilities.has(CAP.STAFF_MANAGE)` |
| the service client was not swapped | `grep -c 'getServiceClient'` -> **3**, before and after |
| no capability key in the three member files | `grep -c 'CAP\.'` -> 0, 0, 0 |
| the probe FIRES when the protection is removed | row C: exit **1**, `Add Item` forged **1** / anon **0**, `+10 046 B` |
| **CAP-05 criterion 2 — a forged identity header is answered exactly as an anonymous one** | **row B: strip REMOVED, converted page, exit 0, 0 / 0.** Measured, not argued |
| the running server was the mutated build | `BUILD_ID` present in served HTML, rows B, C, D |
| the strip is restored byte-identical | `diff` silent, sha256 `f9f34588…` equal to pre-mutation |
| the strip is ARMED, not merely present | comment-filtered count -> **3** |
| the tree is clean | `git status --porcelain` empty |
| an anonymous visitor renders as before | server-rendered DOM identical; only `null` -> `false` in the payload, both render nothing |

### What these verdicts do NOT say

- **`npm run build` cannot see an inverted gate.** A wrong key fails it; flipping
  `if (!has)` to `if (has)` does not. It proves the key spelling, never who is
  refused.
- **Row A's server identity was not asserted** — the assertion was introduced
  after the false negative was found. Row A's configuration is byte-identical to
  row D, whose identity *was* asserted and which returned the same 0 / 0, so the
  claim rests on row D.
- **The probe reads one surface and one affordance.** It says nothing about the
  other 41 files still on the meter.
- **Rows B and C ran against a middleware this plan deliberately broke.** That
  state existed only on a local dev server, in this session, and was reverted and
  verified reverted.

## Known Stubs

None. No placeholder value, no hardcoded empty collection and no "coming soon"
was introduced. `attendance/page.tsx` carries a pre-existing
`// TODO: fetch attendance records` with an empty array — untouched, pre-dating
this plan, and outside its scope.

## Threat Flags

None. No endpoint, auth path, file-access pattern or schema change was added.
Every conversion narrows the trust placed in client-supplied input; none widens
it. T-33-62 through T-33-66 are mitigated as the register specifies, with
T-33-66 (a dead probe reporting a green) mitigated **by having actually caught
one** — see the false-negative section. T-33-67 holds: no dependency was added.

Two secrecy notes: the event slug and the local base URL are **not written into
this document**, following `33-02-SUMMARY.md`'s precedent — `.planning/` is
tracked and published, and a probe transcript is a publication. No person is
named anywhere in this plan; only roles.

## Self-Check: PASSED

- `.planning/phases/33-server-data-access-layer/33-12-SUMMARY.md` — this file
- six modified source files — FOUND, all six at 0 header reads
- commits `42355c7`, `1839c0b`, `8e73991` — FOUND in `git log`
- `src/lib/supabase/middleware.ts` — restored, sha256 equal to pre-mutation
- no modification to `STATE.md`, `ROADMAP.md`, `deferred-items.md`, the nav
  components, or any file owned by another plan
