---
phase: 34-one-work-surface
plan: 08
subsystem: tooling
tags: [verification, routing, capabilities, revalidate-path, redirects, no-ci]

requires:
  - phase: 34-one-work-surface
    provides: "`src/lib/routes/capability-routes.ts` and `src/lib/routes/organizer-redirects.ts` — both parsed, never re-typed (plan 34-01)"
provides:
  - "`scripts/verify-organizer-redirects.sh` — the fifteen-row walk, status and Location per row, plus two door fences"
  - "`scripts/verify-routes.mjs` — link 3 of the CAP-02 chain: the only reader of a `revalidatePath` argument and of a `page.tsx` the type union never contained"
  - "Plan 34-16's worklist, measured: 29 `revalidatePath` calls naming an address no route serves"
affects: [34-03, 34-16, 34-17, 39-door-moves]

tech-stack:
  added: []
  patterns:
    - "A check parses the declaration it verifies, so the declaration cannot drift away from its check"
    - "A parse scoped to an object literal, with an end marker, because over-collection is a silent false green"
    - "A check deliberately left red, with its output recorded as the next plan's worklist"
    - "Proof by mutation against a frozen throwaway fixture, so a mutation moves one side only"

key-files:
  created:
    - scripts/verify-organizer-redirects.sh
    - scripts/verify-routes.mjs
  modified:
    - package.json

key-decisions:
  - "The door assertion accepts a `/login` destination and refuses any other redirect: an unauthenticated bounce is the access mechanism, a relocation is the defect, and the script says which of the two it cannot tell apart"
  - "`PUBLIC_ALLOW` lists only addresses a measured call actually names — an entry no call can reach is a decoration"
  - "`/artists` and `/venues` were NOT allow-listed: neither is served by a page, so both are true positives and belong on 34-16's worklist"
  - "A template-literal segment matches only a dynamic pattern segment, never a literal one — a variable can hold anything"
  - "The redirect walk's discrimination was proved against a frozen fixture, because nothing emits the table until plan 34-03 and a walk where every row already fails cannot discriminate"

requirements-completed: [STAFF-02, STAFF-03, CAP-02]

duration: 71min
completed: 2026-08-09
---

# Phase 34 Plan 08: The Two Mechanical Checks Summary

**The redirect table is now walkable in one command instead of reviewable once, and the two route categories no compiler in this repository can see — a `revalidatePath` argument and a `page.tsx` the type union never contained — have a committed check each, both proved by mutation with the mutation confirmed applied before its result was read.**

## Performance

- **Duration:** ~71 min
- **Tasks:** 2 of 2
- **Files created:** 2
- **Files modified:** 1 (`package.json`, two script entries, no dependency)

## Task Commits

1. **Task 1: The redirect walk** — `f4a1297` (feat)
2. **Task 2: The `revalidatePath` check and the route census** — `4dcb842` (feat)

## What each script holds

| Link of CAP-02 | Instrument | Where |
|---|---|---|
| database ↔ `CAP` | `npm run verify:capabilities` | needs a live database |
| `CAP` ↔ the map | `next build`, two type errors | plan 34-01 |
| **the map ↔ the disk** | **`npm run verify:routes`** | **this plan** |
| the table ↔ the server | **`npm run verify:redirects`** | **this plan** |

There is no CI in this repository (D-34-12). All four are written pre-deploy steps.

## The measurement, re-run rather than quoted

`grep -rEn 'revalidatePath\(\s*[`"]' src/` — **both** quoting styles — on the tree at the end of this plan:

| Measure | Value |
|---|---|
| `revalidatePath` calls with a literal first argument | **54** |
| of those, naming `/admin` or `/organizer` | **36**, across six files |
| of those 36, already naming a bound address | **11** (10 × `/admin/members`, 1 × `/admin/events`) |
| non-literal (variable) arguments — the declared blind spot | **0** |
| `page.tsx` under `src/app/(admin)` | **21** |
| patterns parsed from the `CAPABILITY_ROUTES` object literal | **25**, of which **23** under `/admin` |
| pages with no binding | **0** |

The two-pattern surplus (23 patterns against 21 pages) is `/admin/events/[id]/assignments` and `/admin/events/[id]/review`, which arrive from the organizer tree in plan 34-06. **A pattern with no page is not an error; a page with no pattern is.** The script prints that sentence beside the counts so a reader does not have to hold it.

A criterion pinned to the double quote would have returned 0 on ten of these calls — the ten backtick template literals under `events/[id]/{tickets,assignments,guest-list}/actions.ts`. That is the defect this plan exists to prevent, and it is why the parse reads both.

## Plan 34-16's worklist — verbatim, 29 entries

`node scripts/verify-routes.mjs`, exit 1, on the tree at the end of this plan. **This is the correct state.** Nothing was weakened to make it green.

```
FAIL — 29 call(s) name an address no route serves:
    src/app/(admin)/admin/members/actions.ts:1694  "/organizer/members"
    src/app/(admin)/admin/members/actions.ts:1739  "/organizer/members"
    src/app/(admin)/admin/members/actions.ts:1787  "/organizer/members"
    src/app/(admin)/admin/members/actions.ts:1845  "/organizer/members"
    src/app/(admin)/admin/members/actions.ts:2062  "/organizer/members"
    src/app/(admin)/admin/members/actions.ts:2581  "/organizer/members"
    src/app/(organizer)/organizer/artists/actions.ts:195  "/artists"
    src/app/(organizer)/organizer/artists/actions.ts:238  "/artists"
    src/app/(organizer)/organizer/events/[id]/assignments/actions.ts:331  `/organizer/events/${eventId}/assignments`
    src/app/(organizer)/organizer/events/[id]/assignments/actions.ts:377  `/organizer/events/${eventId}/assignments`
    src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:196  `/organizer/events/${eventId}/guest-list`
    src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:248  `/organizer/events/${eventId}/guest-list`
    src/app/(organizer)/organizer/events/[id]/tickets/actions.ts:109  `/organizer/events/${eventId}/tickets`
    src/app/(organizer)/organizer/events/[id]/tickets/actions.ts:169  `/organizer/events/${eventId}/tickets`
    src/app/(organizer)/organizer/events/[id]/tickets/actions.ts:209  `/organizer/events/${eventId}/tickets`
    src/app/(organizer)/organizer/events/[id]/tickets/actions.ts:310  `/organizer/events/${eventId}/tickets`
    src/app/(organizer)/organizer/events/[id]/tickets/actions.ts:418  `/organizer/events/${eventId}/tickets`
    src/app/(organizer)/organizer/events/[id]/tickets/actions.ts:461  `/organizer/events/${eventId}/tickets`
    src/app/(organizer)/organizer/events/actions.ts:212  "/organizer/events"
    src/app/(organizer)/organizer/events/actions.ts:872  "/organizer/events"
    src/app/(organizer)/organizer/events/actions.ts:900  "/organizer/events"
    src/app/(organizer)/organizer/events/actions.ts:919  "/organizer/events"
    src/app/(organizer)/organizer/events/actions.ts:955  "/organizer/events"
    src/app/(organizer)/organizer/venues/actions.ts:182  "/venues"
    src/app/(organizer)/organizer/venues/actions.ts:228  "/venues"
    src/app/(public)/tickets/refund-actions.ts:272  "/organizer/events"
    src/app/(public)/tickets/refund-actions.ts:393  "/organizer/events"
    src/app/(public)/tickets/refund-actions.ts:479  "/organizer/events"
    src/app/(public)/tickets/refund-actions.ts:592  "/organizer/events"
```

**25 of the 29 name `/organizer/...`** — the tree that no route serves once plan 34-03's redirect lands. The remaining **4** are Finding 1 below and are a different, pre-existing defect.

Note the six in `admin/members/actions.ts`: each sits **beside** a `/admin/members` call that passes. That is the D-34-16 failure shape exactly — the pair was written so both trees refreshed, and after the collapse one half of every pair addresses nothing, silently, in the surface an organizer uses most.

## Finding 1 — four calls revalidate a public address that has never existed

Not a consequence of the collapse, and not previously recorded anywhere:

- `revalidatePath("/artists")` ×2 in `organizer/artists/actions.ts`
- `revalidatePath("/venues")` ×2 in `organizer/venues/actions.ts`

Measured: `src/app/(public)/artists/` and `src/app/(public)/venues/` each contain **only** `[slug]`. There is no listing page at either bare address, so both calls are no-ops today and have always been. They were deliberately **not** allow-listed — allow-listing them would have hidden a true positive behind a comment, which is the shape of hole the plan warns about. They belong on plan 34-16's worklist even though they are not `/organizer` addresses.

The sibling calls that *do* work — `` revalidatePath(`/artists/${artistId}`) `` and `` revalidatePath(`/venues/${venueId}`) `` — pass, so the intent was reachable and only the listing half missed.

## The mutation proofs

This project has a recorded incident of a green read taken from a mutation that had not applied. Every proof below ran `git diff --stat` **and** a `grep` for the mutated text, and read both, **before** the check was run.

### Proof 1 — the pattern parse does not over-collect (two decoys, one run)

Two string literals added at once: `"/admin/decoy"` in the **file docblock** (outside the slice) and `"/admin/decoy-inner"` in a `//` comment **inside the object literal** (inside the slice, which is the harder case).

```
$ git diff --stat src/lib/routes/capability-routes.ts
 src/lib/routes/capability-routes.ts | 3 +++
 1 file changed, 3 insertions(+)
$ grep -n 'decoy' src/lib/routes/capability-routes.ts
111: * DECOY (temporary, plan 34-08 proof): "/admin/decoy"
203:  // DECOY (temporary, plan 34-08 proof): "/admin/decoy-inner"
```

```
$ node scripts/verify-routes.mjs --print-patterns | grep -c decoy
0
$ node scripts/verify-routes.mjs --print-patterns | head -1
25 pattern(s) collected from the CAPABILITY_ROUTES object literal:
```

Still 25, neither decoy collected. Reverted; `grep -c decoy` → 0, `git status --porcelain` empty.

The `--print-patterns` flag was added for this proof and kept, because the count alone cannot tell a reader whether the slice widened: 25 is 25 whether or not one of them came out of a docblock.

### Proof 2 — a `revalidatePath` argument pointing at nothing

`src/app/(admin)/admin/members/actions.ts:1693`, `"/admin/members"` → `"/admin/nonexistent"`.

```
$ git diff --stat "src/app/(admin)/admin/members/actions.ts"
 src/app/(admin)/admin/members/actions.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
$ grep -n 'nonexistent' "src/app/(admin)/admin/members/actions.ts"
1693:    revalidatePath("/admin/nonexistent");
```

```
$ node scripts/verify-routes.mjs   # exit 1
  FAIL — 30 call(s) name an address no route serves:
      src/app/(admin)/admin/members/actions.ts:1693  "/admin/nonexistent"
```

29 → 30, and the exact file:line named. Reverted.

### Proof 3 — the census, a page with no binding

`"/admin/finance"` deleted from `admin.access`'s routes.

```
$ git diff --stat src/lib/routes/capability-routes.ts
 src/lib/routes/capability-routes.ts | 1 -
 1 file changed, 1 deletion(-)
$ grep -c '"/admin/finance"' src/lib/routes/capability-routes.ts
0
```

```
$ node scripts/verify-routes.mjs   # exit 1
[2/2] route census — src/app/(admin)
  pages found:                   21
  patterns under /admin:         22  (a pattern with no page is not an error)
  FAIL — 1 page(s) reach no binding:
      /admin/finance   (src/app/(admin)/admin/finance/page.tsx)
```

This is T-34-39b: the census reads the **disk**, which is the only reader that can see a staff page the type union never contained. Reverted.

### Proof 4 — the redirect walk names the wrong row

**Why a frozen fixture, and why that is not a weakening.** Nothing emits the table until plan 34-03 (Finding 1 of `34-01-SUMMARY.md`), so against a real server today *every* row already fails — and a walk where every row fails cannot demonstrate that it discriminates. A throwaway Node server was given the fifteen destinations **frozen to a file before any mutation**, so that mutating the table moves the script's expectation and not the fixture's answer. Had the fixture re-read the table, the mutation would have moved both sides and proved nothing. The fixture lives in `/tmp`, is not in the repository, and was stopped afterwards.

Clean table, fixture on 3987 — **15/15 ok, exit 0**, each row printing its status and its `Location`, dynamic rows requested with the placeholder `00000000-0000-0000-0000-000000000000`.

Mutation: one row's destination re-pointed.

```
$ git diff --stat src/lib/routes/organizer-redirects.ts
 src/lib/routes/organizer-redirects.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
$ grep -n '"/organizer/venues"' src/lib/routes/organizer-redirects.ts
79:  ["/organizer/venues", "/admin/artists"],
```

```
$ bash scripts/verify-organizer-redirects.sh http://localhost:3987   # exit 1
FAIL /organizer/venues                              307    /admin/venues
...
FAIL — 1 check(s) failed:
  row 3  /organizer/venues -> /admin/artists
       location '/admin/venues' != '/admin/artists';
```

One row named, fourteen still green. Reverted.

### Proof 5 — the status is read from the module, not from the script

`REDIRECT_STATUS` 307 → 308.

```
$ git diff --stat src/lib/routes/organizer-redirects.ts
 src/lib/routes/organizer-redirects.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
$ grep -n '^export const REDIRECT_STATUS' src/lib/routes/organizer-redirects.ts
66:export const REDIRECT_STATUS = 308;
```

The header line changed to `expecting 308` and all fifteen rows went red on the status column. **Plan 34-17's flip therefore needs no edit to this script** — it re-reads the module. Reverted.

### Proof 6 — both door fences can fire

`ai-engineering.md`: *un gate deve poter fallire*. A second throwaway fixture, two modes:

| Mode | Fixture behaviour | Walk result |
|---|---|---|
| `move` | `/admin/scanner` answers 307 → `/admin/events` | `FAIL the door answered with a redirect to another address` + `THE DOOR MOVED /admin/scanner -> /admin/events` |
| `target` | one legacy row answers 307 → `/admin/scanner` | `location '/admin/scanner' != '/admin/venues'; DESTINATION NAMES THE SCANNER;` |

Both exit 1. Neither fence is a decoration.

## The walk against a real dev server — the pre-34-03 baseline

`npx next dev` in this worktree, `npm run verify:redirects` pointed at it. **Exit 1, and the reading is the point:**

```
FAIL /organizer                                     307    /login
FAIL /organizer/artists                             307    /login
...  (all fifteen)
the door
     /admin/scanner                                 307    /login
ok   the door was not relocated
```

Three things this records:

1. **Nothing emits the table yet.** Every legacy address answers the unauthenticated bounce, not its collapsed twin. Plan 34-03 owns that, and this is the "before" against which its landing can be read.
2. **The status column passed and only the `Location` failed** — today's middleware bounce is also a 307. The walk named the right reason rather than the coincidence.
3. **The door assertion correctly did NOT fire on a `/login` destination.** That distinction is declared in the docblock and is here observed live: an access bounce is not a relocation.

The dev server ran without database credentials, so page rendering answered `capabilities.resolve_failed` — which is D-34-08 state 3 behaving as designed: a resolution failure stays a **throw** and is not dressed as a refusal. That environment cannot support a walk about *who may see* a destination, and the walk does not claim to be one.

## Decisions Made

1. **The door assertion accepts `/login` and refuses everything else.** A blanket "the door is never redirected" would be red on every unauthenticated run and would be relaxed within a week; a blanket "any redirect is fine" would miss the defect. What the script cannot distinguish — a deliberate bounce from a rule that happens to point at `/login` — is written into the docblock rather than left to be assumed.
2. **`PUBLIC_ALLOW` holds only addresses a measured call names.** `/gallery` and `/dashboard`, both suggested by the plan, are not named by any call and were left out: an allow-list entry nothing can reach makes the list look thorough while covering nothing.
3. **`/artists` and `/venues` stay red.** See Finding 1.
4. **A dynamic argument segment never matches a literal pattern segment.** `` `/admin/${section}` `` could hold anything; accepting it against `/admin/members` would accept a wrong address on the strength of a coincidence in shape.
5. **The parse blanks comments with a character scanner rather than a regex.** A regex line-comment strip would truncate a string containing `//`; the scanner tracks quotes, templates and escapes, and blanks in place so a reported line number is the line in the real file (verified against `sed -n`).

## Deviations from Plan

**1. [Rule 2 — Missing critical affordance] `--print-patterns` added**

- **Found during:** Task 2, writing the decoy proof
- **Issue:** The acceptance criterion asks to confirm `/admin/decoy` is *not among the extracted patterns*. The script printed only a count, and a count is not evidence of membership: 25 is 25 whether or not one entry came from a docblock.
- **Fix:** A `--print-patterns` flag that lists the slice's output and exits 0, with the reason written into the usage block.
- **Committed in:** `4dcb842`

**2. [Rule 3 — Blocking] The redirect walk was proved against a frozen fixture**

- **Found during:** Task 1
- **Issue:** The plan's mutation proof assumes a server that emits the table. Plan 34-03 has not landed, so every row fails on any real server and the mutation could not be shown to discriminate.
- **Fix:** A throwaway `/tmp` fixture serving the fifteen destinations frozen **before** the mutation, so the mutation moves one side only. The walk was **also** run against a real `npx next dev`, and both observations are recorded above. No change to the script.
- **Committed in:** no code change; the artefact is the evidence above.

---

**Total deviations:** 2 auto-fixed (1 × Rule 2, 1 × Rule 3)
**Impact on plan:** No scope creep. No capability granted, revoked or re-scoped; no migration; no new key; no test framework; no dependency. `/admin/scanner` did not move and nothing matches it.

## Issues Encountered

- **The worktree had no `node_modules` and no `.env.local`.** `npm ci` restored the declared lockfile — no package was added, and `git diff package-lock.json` is empty. A placeholder `.env.local` (no real credential; the file is gitignored, verified with `git check-ignore`) was written to boot the dev server and **deleted afterwards**.
- **No test framework was installed and none is proposed.** Nothing here is verified because tests pass; there are none.

## Verification Run

| Command | Result |
|---|---|
| `bash -n scripts/verify-organizer-redirects.sh` | exit 0 |
| `grep -c "/organizer/artists" scripts/verify-organizer-redirects.sh` | **0** — the table is not re-typed |
| `node scripts/verify-routes.mjs` | **exit 1**, 29 offenders, census green — the expected pre-sweep state |
| `node scripts/verify-routes.mjs --print-patterns` | 25 patterns, all from the object literal |
| `npx eslint scripts/verify-routes.mjs` | clean |
| `rm -rf .next && npm run build` | **exit 0**, `Compiled successfully` |
| `npm run verify:persona` | exit 0 — 7/7 |
| `git diff --stat package.json` | 2 insertions, no dependency |
| `git status --porcelain` after both tasks | empty — no mutation residue |

`npm run verify:capabilities` was **not** run: it needs a live database, there is no CI, and this plan edits no migration and no key.

## Known Stubs

None. Both scripts are complete as specified. The `revalidatePath` check is **red by design** and that is not a stub: it is a measured worklist handed to plan 34-16, recorded above in full.

## Declared blind spots — carried from the docblocks so they are not only in the code

- **A literal outside the `CAPABILITY_ROUTES` object is not a pattern.** The slice runs from `export const CAPABILITY_ROUTES = {` to `} as const satisfies`, and comments inside it are blanked. Over-collection would **widen** the accepted set — a call that should be red would go green, which is how 34-16's worklist would empty itself with nobody fixing a call. Proved by two decoys.
- **A path built by concatenation is invisible.** `"/admin/" + section` is not a literal.
- **A variable argument is invisible.** Counted and printed as *skipped*, never as passing. Currently **0**, so the blind spot is a number and not an impression.
- **The census sees `src/app/(admin)` only.** `/membership-card` and `/attendance` are bound by the map and live elsewhere — which is why the map is the whole application's and not `/admin`'s.
- **Route Handlers are out of scope** (D-34-13).
- **The walk cannot see a row missing from the table.** It walks what the table declares.
- **The walk proves address translation and has no subject.** It sends no credential and says nothing about who may see a destination.
- **A green `verify:routes` does not mean every `revalidatePath` is correct.** It means every statically visible literal names a declared address.

## Threat Flags

None. Neither script introduces a network endpoint, an auth path, a schema change or a file write. Every threat in the plan's register has a mechanism above: T-34-38 (check left red, output recorded), T-34-39 (blind spots declared, all six proofs mutation-first), T-34-39b (census reads the disk, Proof 3), T-34-40 (base URL defaults to localhost, no cookie sent), T-34-41 (table parsed, `grep` returns 0), T-34-42 (both door fences proved able to fire, Proof 6), T-34-SC (zero dependencies, `package-lock.json` unchanged).

## User Setup Required

None. Both commands run from a checkout. `npm run verify:redirects` needs a server (`npm run dev`) and is the only one that does.

## Next Phase Readiness

- **Plan 34-16** inherits the 29-entry worklist above and must drive it to zero. The four `/artists` and `/venues` entries are Finding 1 and are a pre-existing no-op, not collapse debris.
- **Plan 34-17** flips `REDIRECT_STATUS` to 308 and re-runs `npm run verify:redirects`; Proof 5 shows the script follows the flip with no edit.
- **Plan 34-03** should re-run the walk after wiring the table into `src/middleware.ts`. The baseline recorded above is what its landing is read against.
- **Phase 39** moves exactly one map entry — the door's. Both door fences in the walk will need re-pointing then, deliberately and as a decision.

## Self-Check: PASSED

- `scripts/verify-organizer-redirects.sh` — present, executable
- `scripts/verify-routes.mjs` — present
- `package.json` — present, `verify:redirects` and `verify:routes` both resolve
- Commits `f4a1297`, `4dcb842` — both present in `git log`
- `git status --porcelain` — empty before this SUMMARY
- `STATE.md` and `ROADMAP.md` — **not touched**; the orchestrator owns those writes

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-09*
