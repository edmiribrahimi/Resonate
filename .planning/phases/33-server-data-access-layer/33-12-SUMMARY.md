---
phase: 33-server-data-access-layer
plan: 12
subsystem: access-gating
tags: [cap-05, capabilities, forged-header-probe, venue-secrecy, drinks, wave-2]
requires:
  - "33-01 — getAccessContext().userId and the CAP catalogue"
  - "33-02 — I4, scripts/probe-forged-identity.sh"
provides:
  - "the CAP-05 criterion-2 AFTER measurement, with its positive control executed"
  - "six converted surfaces: −12 header lines, −6 files on the I3 meter"
  - "a measured 2x2 showing the conversion holds with the middleware strip REMOVED"
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
  - "D-33-12-A: isApproved / isMasterRole on the event detail page are NOT purely presentational — they feed isVenueVisible. Their form was kept, which is the non-widening direction."
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

**Row C is the positive control and it FIRED.** `+10 046 B` and the management
affordance served to an anonymous request that supplied its own master role
header. That is the row which excludes the "the probe forgot to send the header,
therefore always green" class, on the real application rather than on the
throwaway server wave 1 used. It reproduces the research measurement
(`+10 522 B` on this event) to within build-to-build noise.

**Row B is the row the phase is for.** With the middleware strip — the single
protection covering every remaining header reader — **removed**, the converted
page still answers a forged master identity exactly as anonymous. The conversion
does not depend on the middleware. That is defence in depth demonstrated, not
asserted, and it is a stronger statement than the plan asked for.

Byte columns are reported as context only, per the instrument's own warning.
The verdict is the affordance count.

### The false negative, caught rather than reported

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

This is the phase's recorded defect class arriving one level deeper: *assert the
mutation was applied before reading the result* is not sufficient if the
assertion reads a different artefact than the check does. **The mutation must be
asserted on the thing under test.** A source-file assertion cannot certify a
running server.

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

### Steps 3–6 of the checkpoint: OWED, not performed

Steps 3, 4, 5 and 6 require live signed-in sessions as an `organizer`, an
approved `member`, and a `pending` member. This executor has no such accounts,
and the owner has deferred manual verification to the end of the build.
**Deferred is not verified** (`32-VERIFICATION.md` precedent), so they are
recorded as owed rather than substituted:

| Step | Owed check | Expected |
|---|---|---|
| 3 | signed-in `organizer` opens `/events/<slug>/menu` | management UI appears, as before |
| 4 | approved `member`, same URL | no management UI, as before |
| 5 | `organizer` on `/events`, then signed out | drafts included, then published only |
| 6 | `pending` member on `/dashboard`; approved on `/membership-card` | pending notice; the card |

Step 5 is explicitly a **criterion-4 regression check, not a criterion-2 probe** —
RLS makes `/events` insensitive to a forged role.

Nothing was substituted for these. The positive control was **not** excused by
them: it needs no account, and it was run.

---

## Findings recorded rather than acted on

### 1. `isApproved` and `isMasterRole` sit on a venue-reveal path

The plan describes them as presentational, citing `:490` and `:637`. Read
against the code, that is **incomplete**: both are also passed into
`isVenueVisible` (`:511`, `:513`), where `isMasterRole` short-circuits the venue
to visible (`:76`) and `isApproved` opens the two time-and-ticket branches
(`:84`, `:86`).

That makes **keeping their form — the plan's instruction — the correct and
conservative action**, not merely the minimal one. The predicates are unchanged
and only the source moved, from a forgeable header to the session, so the
direction is strictly **non-widening**: nobody who could not see an address
before can see one now, and a forged approved status can no longer produce
`isApproved` at all. `venue_reveal_sent` is a one-way switch and may only ever
get harder to trip.

The one expression governing the venue is `isVenueVisible` (`:63-92`) and **its
diff is empty**. `canSeeDrafts` governs `is_published` and is not an input to
it. `venue_reveal_sent` is not on this path.

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
| the probe FIRES when the protection is removed | row C: exit **1**, `Add Item` forged **1** / anon **0** |
| the conversion holds without the middleware | row B: exit **0**, 0 / 0, strip removed, build id asserted |
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
