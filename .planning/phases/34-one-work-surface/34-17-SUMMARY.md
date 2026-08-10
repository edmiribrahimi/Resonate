---
phase: 34-one-work-surface
plan: 17
subsystem: routing
tags: [redirects, monotone-guard, verification, baseline, no-ci, human-needed]

requires:
  - phase: 34-one-work-surface
    plan: 01
    provides: "`REDIRECT_STATUS`, the fifteen rows and the three module-load fences"
  - phase: 34-one-work-surface
    plan: 02
    provides: "the pre-34 container baseline, and the written record that M-9 (before) was NOT run"
  - phase: 34-one-work-surface
    plan: 08
    provides: "`verify-organizer-redirects.sh`, which reads `REDIRECT_STATUS` from the module rather than hardcoding it"
  - phase: 34-one-work-surface
    plan: 16
    provides: "`verify-routes.mjs` at exit 0, and the CAP-02 chain paragraph handed over verbatim"
provides:
  - "The fifteen legacy addresses answering **308**, flipped only after a green walk at 307 and **re-walked afterwards**"
  - "`.planning/phases/34-one-work-surface/34-VERIFICATION.md` — evidence per requirement, and the boundary of every instrument"
  - "The post-34 container baseline, and a clean B1/B2/B3 comparison recorded with what it cannot prove"
  - "F5 filed as a new todo; F4 recorded beside it; F6 closed with nothing to do"
  - "`nyquist_compliant` left `false` with the single unmet item named"
affects: [39-door-moves, 40, 41, the milestone's verification debt]

tech-stack:
  added: []
  patterns:
    - "A monotone flip sequenced as walk → flip → walk, with the two walks recorded as two measurements and never merged into one row"
    - "A verification record that states, in its own words, what its instruments cannot prove — before it states what they did"

key-files:
  created:
    - .planning/phases/34-one-work-surface/34-VERIFICATION.md
    - .planning/todos/pending/login-client-redirect-not-allow-listed.md
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.post-34.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.post-34.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.post-34.json
  modified:
    - src/lib/routes/organizer-redirects.ts
    - .planning/phases/34-one-work-surface/34-VALIDATION.md

key-decisions:
  - "The flip happened only after a green fifteen-row walk, and the walk was re-run after it — the order is the safeguard, not a formality"
  - "The stale paragraph claiming nothing imports the redirect module was corrected, not carried: it names the measured truth from plan 34-03 instead"
  - "`baseline:compare` needed `--target=container`; the default filename is the production one and the run aborted rather than comparing the wrong pair"
  - "`nyquist_compliant` stays false on ONE unmet item — M-9's before/after — rather than being granted on a six-of-seven reading"
  - "All nine M-procedures recorded `human_needed` with the date and with what each is the only evidence for; none marked done"

requirements-completed: [CAP-02, STAFF-01, STAFF-02, STAFF-03]

duration: ~80min
completed: 2026-08-10
---

# Phase 34 Plan 17: 308, walked twice, and the record that says what it cannot prove — Summary

**The fifteen legacy addresses ship permanent, and the only reason that is safe
is the order: fifteen rows green at 307, then the flip, then the same fifteen
rows green at 308 — two measurements, recorded as two. `/admin/scanner` answered
307 to `/login` on both walks, because it is not in the table and the flip could
not reach it. And `34-VERIFICATION.md` opens by saying what its instruments
cannot see, rather than closing with it.**

## Performance

- **Duration:** ~80 min
- **Tasks:** 2 executed, 1 recorded as deferred by owner decision
- **Product files modified:** 1
- **Planning artefacts created:** 5

## Task Commits

1. **Task 1: the full suite, the walk at 307, the flip, the walk again, the baseline** — `d7ff382` (feat)
2. **Task 2: the nine written procedures** — **no commit: not executed.** Deferred by the owner's decision of 2026-08-09. Recorded, not passed. See *The nine measurements that were not taken*.
3. **Task 3: `34-VERIFICATION.md`** — see the docs commit below.

---

## The flip, and the two walks that bracket it

`src/lib/routes/organizer-redirects.ts:85` — `REDIRECT_STATUS` 307 → **308**.

### Walk 1 — before the flip, expecting 307

```
verify-organizer-redirects — 15 rows, expecting 307
ok   /organizer                          307    /admin/events
ok   /organizer/artists                  307    /admin/artists
ok   /organizer/venues                   307    /admin/venues
ok   /organizer/members                  307    /admin/members
ok   /organizer/events                   307    /admin/events
ok   /organizer/events/new               307    /admin/events/new
ok   /organizer/events/[id]/analytics    307    /admin/events/000…000/analytics
ok   /organizer/events/[id]/assignments  307    /admin/events/000…000/assignments
ok   /organizer/events/[id]/drinks       307    /admin/events/000…000/drinks
ok   /organizer/events/[id]/edit         307    /admin/events/000…000/edit
ok   /organizer/events/[id]/guest-list   307    /admin/events/000…000/guest-list
ok   /organizer/events/[id]/media        307    /admin/events/000…000/media
ok   /organizer/events/[id]/review       307    /admin/events/000…000/review
ok   /organizer/events/[id]/sales        307    /admin/events/000…000/sales
ok   /organizer/events/[id]/tickets      307    /admin/events/000…000/tickets

the door
     /admin/scanner                      307    /login
ok   the door was not relocated

PASS — 15 rows walked, all answered 307 at the declared destination.
```

### Walk 2 — after the flip, expecting 308

Identical table, **`308` in every status cell and the same fifteen destinations**;
the door row **unchanged at 307 → `/login`**.

```
PASS — 15 rows walked, all answered 308 at the declared destination.
```

**This is why the two walks are two rows and never one.** A walk before a flip
and a walk after it measure different things, and only the second describes what
ships. The plan's sequencing exists because a 308 is a fourth monotone guard in
the sense of `meta-gates.md`: a client caches it and does not come back, and
there is no error tracking to notice that a wrong one shipped.

**And the door row is the observation the flip earned.** Fifteen rows moved from
307 to 308; `/admin/scanner` did not, because it is not in the table. Its 307 is
the unauthenticated bounce, which the walk deliberately accepts as an access
mechanism and refuses to confuse with a relocation — proved able to fire in both
directions by plan 34-08's proof 6.

The script needed **no edit** for the flip: it reads `REDIRECT_STATUS` from the
module (34-08, proof 5), and the header line moved from `expecting 307` to
`expecting 308` on its own.

### The `/admin/scanner` fence, confirmed still holding after the flip

```
$ grep -n scanner src/lib/routes/organizer-redirects.ts
10, 42, 49, 73   docblock prose
136              the fence's own comment
147, 149         the fence itself
```

**Seven hits, none in a row.** The fifteen `[from, to]` pairs at `:96-110` name
the scanner on neither side, and no `Location` in either walk contained
`/scanner`. `src/app/(admin)/admin/scanner/page.tsx` appears in **no commit of
this phase**.

---

## The full suite, with its exit status

| Command | Result |
|---|---|
| `rm -rf .next && npm run build` (pre-flip) | **exit 0** — 23 `/admin` routes in the manifest, **zero** `/organizer` |
| `npm run verify:persona` | **exit 0 — 7/7**, worst case `scanner/ScannerClient.tsx`, 10 622 / 12 000 tokens |
| `npm run verify:capabilities` | **exit 0 — 5/5 green, 0 warnings** |
| `npm run verify:no-header-identity` | **exit 0** — 3 live deletes, 0 live sets |
| `node scripts/verify-routes.mjs` | **exit 0** — 47 literals, 0 offenders, **0** non-literal skipped; census 23/23 |
| `npm run verify:redirects` ×2 | **PASS 15/15**, at 307 and then at 308 |
| `rm -rf .next && npm run build` (post-flip) | **exit 0** |
| `npm run baseline:container -- --phase-point=post-34` | B1 72 · B2 322, 0 vacuous · B3 966 probes, 249 refusals, 692 successes, 25 inconclusive |
| `npm run baseline:compare -- --only=B1,B2,B3 --target=container --before-point=pre-34 --after-point=post-34` | **clean** — 72 policies unchanged, 322 read cells, 966 write cells |
| `git status --porcelain` before this SUMMARY | clean of anything unintended |

**`verify:capabilities` ran here, and that is not the same as it being
automated.** It needs a live database; the repository's gitignored `.env.local`
was copied into the worktree for the run and **deleted afterwards**
(`git check-ignore -v` confirmed `.gitignore:34` covers it). There is no CI, so
that link is a **written pre-deploy step**.

### The green baseline, and why it is not celebrated

Expected, and it arrived: **B1, B2 and B3 all clean**. It proves *no row-level
permission moved* — true, worth recording, and **a small part of what this phase
changed**. `git diff --name-only` against `supabase/` across the whole phase is
**empty**, so the green was close to guaranteed before it was run.

**None of those three sides can see a route.** That sentence is in
`34-VERIFICATION.md` in those words, as the plan requires, and it corrects
`34-CONTEXT.md`'s claim that a green comparison is *"the whole claim"*.

---

## The nine measurements that were not taken

**Status: `human_needed` for all nine. Not done, not dropped, not passed.**

Task 2 is a `checkpoint:human-verify`. It was **not executed**, by the project
owner's decision of **2026-08-09** — reaffirming 2026-08-06 — that every manual
procedure of this milestone runs together at the end of v1.5. This plan did not
block on it and did not wait.

Each is recorded in `34-VERIFICATION.md` with its date, its reason and **what it
is the only evidence for**. In short:

| # | The only evidence it can produce |
|---|---|
| M-1 | STAFF-01 + STAFF-03 for the role that reaches everything |
| M-2 | That `/admin/members/register` **renders** for an organizer — the folded todo's closure is a **construction argument** until it runs |
| M-3 | That `register.read`'s `requires_approved` survived, and that a `pending` organizer still reaches the door (defends D-06) |
| M-4 | That a `staff` account reaches **none** of the 23 addresses — checked against the grant table **and** owed as an observation; also the only check of plan 34-14's new media gate |
| M-5 | That a member and a staff account see the same staff surface, which is none |
| M-6 | That an unassigned night refuses **on the page, not in the middleware** |
| M-7 | That a 308 destination **renders** for the person who followed the link — the walk has no subject |
| M-8a/b/c | That the surviving half of each collapsed `revalidatePath` pair was the right half, on three surfaces |
| M-9 | Nothing comparative — **see below** |

### M-9, and the sentence this plan is required not to soften

M-9 (before) was **never observed**: plan 34-02 recorded it `human_needed` and
its window closed when `f59776b` landed. So the after run has **nothing to
compare against**.

Written as: *the door will be observed after the change; it was **not** observed
before it, so **no comparison was made**.* Never as a before/after pair.

### The gap M-8 does not cover

The **two `revalidatePath` calls in
`admin/events/[id]/assignments/actions.ts` stay unobserved**, because a live
per-night assignment cannot be produced on demand. Recorded as its own
`human_needed` row, **not** folded into M-8b — three surfaces observed out of
four is a measurement, and calling it four is the failure this project treats as
worse than the gap.

---

## `34-VERIFICATION.md` — what it carries

Written to the repository's own gate (`CLAUDE.md` § *Gate VERIFICATION.md*):
requirements covered, **`file:line` evidence per requirement**, anti-patterns
found, deferred debt.

- **CAP-02** — the map at `capability-routes.ts:172`, the totality at `:344`, the
  **type-level** inverse assertion at `:394` (named as the mechanism achieved,
  not the module-load fallback), all three mutation proofs with the `git diff
  --stat` that confirmed each mutation applied **before** its result was read,
  and the chain ending in *there is no CI, so `verify:capabilities` is a written
  pre-deploy step*.
- **STAFF-01** — the census (23 pages, `(organizer)` gone, `(work)` non-route
  census empty), and the **twelve pair classifications with a grant row named for
  each guard**, gathered from plans 34-09 … 34-14.
- **STAFF-02** — both walks, the module-load fence at
  `organizer-redirects.ts:147`, and M-7 with the note that it runs signed in and
  why.
- **STAFF-03** — the single tab declaration and its load-time agreement check
  (`staff-tabs.ts:104,125,138`), both menus calling **one** filter
  (`StaffNav.tsx:57`, `ManagementSection.tsx:42`), the middleware reading the same
  entry (`middleware.ts:495`), `verify-routes.mjs` at exit 0 — and the explicit
  statement that STAFF-03 holds in **one direction only**.

Then four sections that are the difference between a record and a press release:
**what the instruments cannot see**, **anti-patterns found** (searched, then
reported as zero), **findings recorded not fixed** (nine, each with an owner),
and **what is not verified**.

**Anti-patterns: zero.** `grep` for `TODO|FIXME|XXX:|@ts-ignore|@ts-expect-error`
across the collapsed tree, the route modules, the middleware, both menus and both
new checks returned no output. Reported only after searching.

**Findings with owners:** F4 (the `?redirect=` / `?next=` mismatch, measured at
`middleware.ts:466` and `login/page.tsx:11` — the plan quoted `:339`, which has
moved), F5 (the unvalidated client-side redirect, **filed as a new todo**), F6
(the callback allow-list needs no change — its docblock at
`callback/route.ts:68-70` already names `/admin` as refused), D-34-13's `/api/*`
fork, the `middleware.ts` → `proxy.ts` rename (**observed live** in every
`next dev` start of this plan), the `pending`-organizer / Check-in divergence
(Phase 39), the `(work)` route group (Phase 39), two stale `StaffNav` prop
comments, and the **upstream verification debt**.

**The upstream debt was counted, not quoted:** `grep -c "^  - test:"` returns
**9** on `35-VERIFICATION.md` and **14** on `43-VERIFICATION.md`. Their
frontmatter records a different pair of numbers — 35: *13 written, 0 executed*;
43: *16 written, 2 executed* — and **both readings are written down** rather than
one being picked. This phase neither consumes nor worsens them and does not close
them.

**Also gathered, without softening:** the two unobservable `assignments` calls;
the residual `pending`-organizer / Check-in divergence, in the safe direction and
owned by Phase 39; and the **context-budget margin narrowed to 1 378 tokens**,
with the worst case having moved to the door's client component because this
phase brought every work surface under `(admin)`.

---

## Nyquist: `false`, on one item

`34-VALIDATION.md`'s sign-off is now measured. Six of seven items are met. The
seventh — **M-9 run before and after the middleware plan** — is not, and it is
the one that cannot be caught up: the before half is unrecoverable.

`nyquist_compliant` therefore stays **`false`**, with `nyquist_unmet` naming the
reason in the frontmatter. Granting it on a six-of-seven reading would have been
the cheapest possible over-claim in this whole record.

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 1 — stale comment] The paragraph claiming nothing imports the redirect module**

- **Found during:** Task 1, reading the file before flipping the constant.
- **Issue:** `organizer-redirects.ts` still carried *"**Nothing imports this
  module yet.** Plan 34-03 wires it into `src/middleware.ts`"* — a present-tense
  claim about a state that ended three waves ago. Worse, it framed the
  build-enforcement question as **open**, when plan 34-03 **closed it with a
  measurement in the less convenient direction**: with the import in place, a row
  naming the scanner still exits `npm run build` 0.
- **Fix:** rewritten to the measured truth — importing a module gets it bundled,
  not evaluated; the throws fire on the **first request after deploy**; the one
  half the build carries is the one-directionality, and it is a **type**, not a
  throw. Carrying the old paragraph would have left a reader trusting a check
  that does not run, in the one file where that matters most.
- **Committed in:** `d7ff382`

**2. [Rule 3 — blocking] `baseline:compare` needs `--target=container`**

- **Found during:** Task 1, step 6.
- **Issue:** the plan's invocation omits the target. The script defaults to the
  **production** filename and aborted: *"the before B1 artefact does not exist at
  …`32-BASELINE-policies.pre-34.json`"*. It refused rather than comparing
  something else, which is the right behaviour and is why this is a one-line
  correction and not an incident.
- **Fix:** `--target=container` added, matching `34-VALIDATION.md`'s own
  instruction to use the container and never `baseline:rls`. No `--overwrite` was
  passed and none was needed: no `post-34` artefact existed.
- **Committed in:** no code change.

**3. [Rule 3 — blocking] The worktree had no `node_modules` and no `.env.local`**

- **Fix:** `npm ci` restored the declared lockfile — `git status` on
  `package.json` / `package-lock.json` is **empty**, no package added, no version
  moved, so the package-legitimacy checkpoint does not apply. The gitignored
  `.env.local` was copied in for `verify:capabilities` and the dev server, and
  **deleted afterwards**; no credential appears in any committed file.
- **Committed in:** no code change.

**No Rule 4 case arose.** No migration, no capability granted, revoked or
re-scoped, no new key, no package installed, no test framework, no visual
redesign. `/admin/scanner` did not move, nothing matches it, and its page file is
absent from every commit of this phase.

---

## Not claimed, and it must not be inferred

- **That any role reaches any address.** Nine written procedures observe that and
  **all nine are unrun**.
- **That the container baseline says anything about routing.** It cannot.
- **That M-9 has a before/after.** It has neither, and the before is gone.
- **That `verify:capabilities` is automated.** It is a written pre-deploy step in
  a repository with no CI.
- **That anything is deployed.** Nothing in this phase has been observed in
  production.
- **That anything here is verified because tests pass.** There is no test runner
  for this product; none was added.

---

## Known Stubs

None. This plan wrote no logic: it changed one constant, corrected one stale
paragraph, and wrote three planning artefacts.

## Threat Flags

None. No network endpoint, no auth path, no file-access pattern and no schema
change was introduced.

| Threat | Disposition | Evidence |
|---|---|---|
| T-34-83 — a wrong 308 cached on a staff phone | mitigated | 307 throughout the phase; flip only after a green fifteen-row walk; **walk re-run after the flip**; both recorded separately |
| T-34-84 — a role reaching an unintended address | **open, and stated as open** | M-1 … M-5 are unrun. Nothing here is claimed from source alone; the record says so per requirement |
| T-34-85 — the per-night arm admitting an unassigned night | **open** | M-6 unrun. The gate's checksum proves it was not edited, not that it still refuses |
| T-34-86 — a green baseline standing in for evidence it cannot produce | mitigated | `34-VERIFICATION.md` carries the correction verbatim, as its **first** honesty item |
| T-34-87 — a procedure reported as passed without being run | mitigated | All nine marked `human_needed` with their reason; none marked done |
| T-34-88 — the pre-existing open redirect at `login/page.tsx:52` | transferred | Filed as `.planning/todos/pending/login-client-redirect-not-allow-listed.md`, with F4 recorded beside it |
| T-34-89 — a person or a venue published in `.planning/` | mitigated | Roles only, asserted across all three new artefacts |
| T-34-SC — package installs | mitigated | None attempted; `npm ci` only, lockfile unchanged |

## User Setup Required

None for this plan. **Owed before v1.5 closes:** M-1 … M-9, plus the upstream
debt in `35-VERIFICATION.md` and `43-VERIFICATION.md`.

## Next Phase Readiness

- **Phase 39** inherits four things, all named with their `file:line` in
  `34-VERIFICATION.md`: the `pending`-organizer / Check-in divergence, the
  `(work)` group it must read before moving the door, two stale `StaffNav` prop
  comments, and the two door fences in the walk that will need re-pointing
  deliberately when the scanner's address moves.
- **The `middleware.ts` → `proxy.ts` rename** is its own small plan, **after**
  Phase 39. It was observed live on every `next dev` start of this plan.
- **`/api/*` under CAP-02** stays a later phase's question (D-34-13).
- **The milestone** owes nine procedures here and 23 upstream.

## Self-Check: PASSED

Verified against the committed tree, not against this document:

- `src/lib/routes/organizer-redirects.ts` — present, `REDIRECT_STATUS = 308` at `:85`
- `.planning/phases/34-one-work-surface/34-VERIFICATION.md` — present
- `.planning/phases/34-one-work-surface/34-VALIDATION.md` — present, `nyquist_compliant: false` with `nyquist_unmet` naming the item
- `.planning/todos/pending/login-client-redirect-not-allow-listed.md` — present
- three `…container.post-34.json` artefacts — present
- commit `d7ff382` — present in `git log`
- `STATE.md` and `ROADMAP.md` — **not touched**; the orchestrator owns those writes

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-10*
