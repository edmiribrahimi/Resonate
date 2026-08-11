---
phase: 40-brand-tokens-typography
plan: 05
subsystem: infra
tags: [service-worker, serwist, cache-storage, offline-door, release-boundary, ds-10, human-procedure]

# Dependency graph
requires:
  - phase: 40-brand-tokens-typography
    plan: 03
    provides: "one CSS chunk where there were two — so the precache carries exactly one stylesheet, which is what the activate purge protects"
  - phase: 39-the-door-s-own-address
    provides: "39-DOOR-PASS.md — the shape 40-RELEASE-PASS.md follows, and the end-of-v1.5 sitting it joins"
provides:
  - "src/app/sw.ts — an additional activate listener purging pages / pages-rsc / pages-rsc-prefetch on a release, with the docblock that records the gate conflict, the accepted cost and two refused mechanisms"
  - "next.config.ts — cacheOnNavigation false, with the decision written above it, and the entry worker gone from the precache"
  - ".planning/phases/40-brand-tokens-typography/40-RELEASE-PASS.md — H1, H2, H3, H4, ten Result lines all pending"
  - "A precache of 128 entries: zero documents, one stylesheet, no swe-worker"
affects: [41-primitives, 42-scanner, every future release]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A service-worker lifecycle listener is added ALONGSIDE serwist.addEventListeners(), never as a replacement — the same shape as [...doorRuntimeCaching, ...defaultCache]"
    - "A refusal lives in the file it constrains, with its mechanism and the condition any future phase must meet — a refusal recorded only in a commit body re-proposes itself"
    - "A local structural type at one call site beats widening tsconfig's lib for the whole product"
    - "A boolean whose value is a decision carries the decision in a comment directly above it, and the comment names the concrete failure at the door"

key-files:
  created:
    - .planning/phases/40-brand-tokens-typography/40-RELEASE-PASS.md
  modified:
    - src/app/sw.ts
    - next.config.ts
    - .planning/phases/40-brand-tokens-typography/deferred-items.md

key-decisions:
  - "The docblock says 'a Cache Storage purge cannot reach it' rather than naming the API in prose, so that grep -o 'caches.delete' counts EXECUTABLE call sites and returns exactly 1 — the criterion measures something instead of matching a comment"
  - "A local ExtendableActivateEvent type instead of adding 'webworker' to tsconfig's lib: RESEARCH §14's snippet as written does not typecheck in this repository, and the alternative fix would move the global types of 181 .tsx files to repair one line"
  - "The stale untracked public/swe-worker-*.js was removed BY EXACT NAME, never by git clean — a worktree agent that runs git clean deletes the branch's own committed files"
  - "40-RELEASE-PASS.md uses '## H1' rather than '## §H1' so the plan's mechanical heading check matches, while keeping 39-DOOR-PASS.md's §0-preconditions / §9-results frame"

requirements-completed: []

# Metrics
duration: 25min
completed: 2026-08-11
---

# Phase 40 Plan 05: The Version Boundary at the Door — Summary

**A release now drops every cached document as the new worker activates, and the one writer that never refreshed what it wrote is off — so no document can outlive the stylesheet it names, a page renders whole or not at all, and nothing reloads itself; the proof that this behaves is a written procedure with every result still `pending`, because it needs a phone, a release and a radio that is off.**

## DS-10 is NOT verified by this plan — stated first, without hedging

**The code is in place. That is not the same thing as the behaviour being observed, and no line of this document should be read as if it were.**

`npm run build` exits 0, the purge survives the bundler verbatim, the precache carries zero documents — and **none of that says a door opened.** DS-10's only proof is `40-RELEASE-PASS.md` **H3**, which is `pending` and stays `pending` until a staff phone, a shipped release and a switched-off radio say otherwise. `DS-06`'s home-screen half is in the same position, at H1.

There is no test runner for this product (`CLAUDE.md` Environment Guardrail 1). Nothing below is claimed verified because tests pass; every row in the tables is a command that was run on this tree, and the three claims that cannot be run at all are marked as such.

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 2 source (+154 / −1) · 1 planning document created (266 lines) · 1 deferred-items entry
- **Builds run:** 4 — one **baseline before any change**, one per code task, one final

## The precache, before and after, with the command that produced each

The plan predicted **128 = 130 − 1 swe-worker − 1 collapsed CSS chunk**. The intermediate reading confirms both subtractions separately, which the endpoints alone could not.

| Reading | Command | Result |
|---|---|---|
| **Baseline** (base commit `33304a6`, before any change in this plan) | `grep -o "'url':'[^']*'" public/sw.js \| wc -l` | **129** |
| …its stylesheets | `grep -o "'url':'[^']*\.css'" public/sw.js \| wc -l` | **1** — plan 40-03's single chunk had already reached the worker, which is the first of the two subtractions, made before this plan started |
| …its documents | `grep -o "'url':'[^']*'" public/sw.js \| grep -vE "\.(js\|css\|woff2\|svg\|png\|json\|ico\|txt)'$" \| wc -l` | **0** |
| …its entry worker | `grep -c "swe-worker" public/sw.js` | **1** |
| **After task 1** (the activate listener) | same four commands | **129** · 1 css · **0** documents · 1 swe-worker — the listener is worker code, not a manifest entry, and the count correctly does not move |
| **After task 2** (`cacheOnNavigation: false`) | same four commands | **128** · 1 css · **0** documents · **0** swe-worker |

**The prediction holds exactly**, and the number that matters most is unchanged throughout: **zero documents precached**, before and after. No venue-bearing page was put at rest on a device by this change (T-40-27).

## Task Commits

1. **Task 1: the release boundary — an additional activate listener, and its cost** — `d403526` (feat)
2. **Task 2: `cacheOnNavigation` off, and the comment its neighbour already had** — `f1b3718` (feat)
3. **Task 3: `40-RELEASE-PASS.md` — H1, H2, H3, written before the release they test** — `b4df73a` (docs)

## Verification — every line was run on this tree

### The mechanism exists, is additional, and is placed correctly

| Claim | Command | Result |
|---|---|---|
| Exactly one activate listener was added | `grep -c 'addEventListener("activate"' src/app/sw.ts` | **1** |
| It was **added, not substituted** | `grep -c "serwist.addEventListeners()" src/app/sw.ts` | **1** |
| …and it sits **after** it | `awk '/serwist.addEventListeners/{a=NR} /addEventListener\("activate"/{b=NR} END{exit !(b>a)}'` | exit **0** |
| Exactly one deletion call site | `grep -o "caches.delete" src/app/sw.ts \| wc -l` | **1** |
| It names all three document buckets | `grep -n "pages-rsc-prefetch" src/app/sw.ts` | 2 lines — `:262` the purge, `:62` **pre-existing prose** (see Deviation 1) |
| The queue's storage API is named in the file | `grep -c "IndexedDB" src/app/sw.ts` | **3** |
| …and no other storage API is touched | `grep -c "indexedDB\." src/app/sw.ts` | **0** |
| No `catch` pretends a rejection was handled | `grep -n "catch" src/app/sw.ts` | 2 hits, **both prose** (`:73`, `:244`) |

### D-40-11 — nothing reloads, and the assertion is greppable

| Claim | Command | Result |
|---|---|---|
| No reload-shaped construct anywhere in the worker | `grep -cE "location\.reload\|window\.location\|controllerchange" src/app/sw.ts` | **0** |
| …and none in the config either | same, on `next.config.ts` | **0** |

The mechanism has **no reload path at all** — it deletes buckets and returns. That is what *satisfied by construction* means, and it is the reason this option was chosen over every alternative (T-40-28). The remaining half of T-40-28 is an observation, not a grep: `40-RELEASE-PASS.md` H3.4, whose failure wording is explicit.

### The two refusals live in the file, on comment lines only

| Claim | Command | Result |
|---|---|---|
| `deploymentId` appears once, in prose | `grep -n "deploymentId" src/app/sw.ts` | `:225`, a `*`-prefixed comment line |
| …and never as a property | `grep -cE "deploymentId *:" src/app/sw.ts` | **0** |
| …and is still absent from the config | `grep -c "deploymentId" next.config.ts` | **0** |
| `navigateFallback` appears once, in prose | `grep -n "navigateFallback" src/app/sw.ts` | `:236`, a `*`-prefixed comment line |

Each carries its **mechanism**, not just its verdict: `?dpl=` reaching CSS chunk URLs against a precache that strips only `utm_*`/`fbclid` (T-40-26), and the `zero HTML, zero routes, zero RSC payloads` gate for `navigateFallback` (T-40-27). `deploymentId`'s entry also carries the condition a future phase must meet — extend `precacheOptions.ignoreURLParametersMatching` with `/^dpl$/` **in the same commit**.

### The config

| Claim | Command | Result |
|---|---|---|
| The flag is off | `grep -c "cacheOnNavigation: false" next.config.ts` | **1** |
| …and not on | `grep -c "cacheOnNavigation: true" next.config.ts` | **0** |
| Its decision is written directly above it | `awk '/cacheOnNavigation: false/{print prev} {prev=$0}'` | a line beginning `//` |
| `reloadOnOnline` untouched | `grep -c "reloadOnOnline: false" next.config.ts` | **1** |
| The entry worker is gone from the worker | `grep -c "swe-worker" public/sw.js` | **0** |
| …and from disk | `ls public/swe-worker-*.js` | no matches |
| …and was never tracked | `git ls-files public/ \| grep -c swe-worker` | **0** (`git check-ignore` → `.gitignore:42`) |

### The built artefact — because a source assertion is not a shipped one

The listener could have been dropped, reordered or dead-code-eliminated by the bundler, and only the artefact can say. Read out of `public/sw.js`:

```
addEventListener("activate",e=>{e.waitUntil(Promise.all(["pages","pages-rsc","pages-rsc-prefetch"].map(e=>caches.delete(e))))})
```

Three names, one `waitUntil`, one `Promise.all`, one delete per bucket. **It survived intact.**

### The door's queue was not opened

| Claim | Command | Result |
|---|---|---|
| `src/lib/offline/` untouched | `git diff --stat 33304a6 HEAD -- src/lib/offline/` | empty |
| The whole change surface is three files | `git diff --stat 33304a6 HEAD` | `sw.ts`, `next.config.ts`, `40-RELEASE-PASS.md` |
| Nothing was deleted, in any commit | `git diff --diff-filter=D --name-only 33304a6 HEAD` | empty |
| `STATE.md` / `ROADMAP.md` untouched | same diff stat | absent — the orchestrator owns those writes |

**T-40-25's third mitigation cannot be a grep and is not claimed as one.** Two of its three arms are mechanical (`indexedDB.` → 0; the offline diff empty). The third is `40-RELEASE-PASS.md` **H3.5**, which observes a queued scan surviving a release with the radio still off — RESEARCH A4's instruction to *assert it after implementing, not reason about it*, honoured by writing the observation down rather than by writing a sentence claiming it.

### The gates

| Gate | Command | Result |
|---|---|---|
| Build (which is also the typecheck) | `npm run build` | exit **0**, four times — baseline, task 1, task 2, final |
| G1 | `npm run verify:tokens` | exit **0**, `TOKENS_OK`, six checks A–F |
| G2 | `npm run verify:semantic-separation` | exit **0**, `SEMANTIC_SEPARATION_OK`, five checks |
| G3 | `npm run verify:sunset-gradient` | exit **0**, `SUNSET_GRADIENT_OK`, three checks |

### `40-RELEASE-PASS.md`

| Claim | Command | Result |
|---|---|---|
| Every result is unrun | `grep -c "^Result: pending"` | **10** |
| …and none is pre-filled | `grep -c "^Result:"` | **10** — the same number |
| Four claim sections | `grep -cE "^## H1\|^## H2\|^## H3\|^## H4"` | **4** |
| Filed into the existing sitting | `grep -c "end-of-v1.5"` | **2** |
| H1's constraint is in the procedure | `grep -c "one attempt per device"` | **1** |
| H3's outcome sentence is verbatim | `grep -n "It renders fully styled, or it does not render at all"` | `:170` |
| The queue-survival step exists | `grep -c "IndexedDB"` | **2** |

**The publicity inspection was read, not counted.** `grep -niE "@[a-z]|venue|line-?up"` returns **two** hits, both on lines 22–23 — the preamble sentence that *forbids* naming a venue, a night's date or a line-up. **No venue name, no personal name, no handle, no unannounced date appears in the file.** `.planning/` is tracked and this repository is public; the file speaks of *a staff account holding `door.operate` for the night*.

## Deviations from Plan

### 1. [Finding — a criterion mismeasured against the file's existing prose] `pages-rsc-prefetch` appears on two lines, not one

- **Found during:** Task 1, immediately after writing the listener.
- **The criterion:** `grep -c "pages-rsc-prefetch" src/app/sw.ts` → **1**.
- **Actual:** **2**. The second is not new: `sw.ts:62` has named the three document buckets in prose since plan 37-06, inside the `/events/*` docblock. `grep -c` counts **lines**, and the plan's expectation counted only the line it was about to add.
- **The intent holds exactly:** there is **one** occurrence in executable code, in a single-line array beside the other two bucket names. Recorded rather than engineered around — deleting a true sentence from a Critical docblock to satisfy a count would be the wrong direction, and the same species of error as pinning a gate to a line number (`40-03-SUMMARY.md` deviation 2).

### 2. [Rule 3 — blocking: the researched snippet does not typecheck in this repository] A local `ExtendableActivateEvent`

- **Found during:** Task 1, before the first build.
- **Issue:** `tsconfig.json:4` declares `lib: ["dom", "dom.iterable", "esnext"]` — **no `webworker`**. `ExtendableEvent` therefore has no global type here, and `self.addEventListener("activate", …)` resolves through the generic string overload, typing the parameter as a plain `Event`. `event.waitUntil(…)` as written in `40-RESEARCH.md` §14 and §6.5 **does not compile**, and `next build` is this project's typecheck gate.
- **Fix:** a local `type ExtendableActivateEvent = Event & { waitUntil(promise: Promise<unknown>): void }`, narrowed at the single call site, with the reason written above it.
- **The alternative was rejected on blast radius:** adding `webworker` to `lib` would change the ambient global types of every one of the product's `.tsx` files to repair one line in the service worker — a whole-product change to fix a file-local problem.
- **Commit:** `d403526`.

### 3. [Judgement call — a wording choice so a criterion measures code instead of comments] `caches.delete` stays at exactly one occurrence

- The plan's action text asks the docblock to say *«`caches.delete` cannot reach it»*; its acceptance criterion asks `grep -o "caches.delete" src/app/sw.ts | wc -l` → **1**. Both cannot hold.
- **Chosen:** the criterion. The docblock says *«a Cache Storage purge cannot reach it»* — the same claim in the same place, and the count now asserts something real: **one deletion call site in the whole worker**. A grep that matches its own documentation is the failure mode `40-PATTERNS.md` §3.3 names.

### 4. [Judgement call] `## H1` rather than `## §H1` in `40-RELEASE-PASS.md`

The plan asks for `39-DOOR-PASS.md`'s **shape** and separately greps `^## H1`. The document keeps that shape where it carries meaning — the frontmatter, the *How to read a step* preamble, `## §0` preconditions, `## §9 — Results`, the closing block — and drops the `§` from the four claim headings so the mechanical check matches. Written down because a reader comparing the two files will see the difference.

### 5. [Housekeeping, and the destructive alternative is named] The stale entry worker removed by exact name

`public/swe-worker-ab00d3c7d2d59769.js` was left on disk by the baseline build and is no longer generated. It was removed with `rm -f` **on its exact filename**. `git clean` was **not** used and must never be used in a worktree: it treats files committed on the branch as untracked and deletes them, which is how this project lost prior-wave work once already. `git check-ignore` confirms the file was never tracked (`.gitignore:42`).

## The accepted cost, stated plainly rather than minimised

**After a release, the first open of any page on a device must be online.**

For `/door` that is the runbook line `checkin-offline.md:57` already requires — *open the door, online, on that phone, that evening, at the address that phone will actually be sent to*. **This adds no step. It makes an existing step load-bearing in one more situation.**

It is the trade the owner decided on 2026-08-11 (`checkin-offline.md:59`), applied in the direction it was decided: *a door served by yesterday's cache is a stale door*, and *the warm-up is not a migration step — it is a cost of every night*. A door served against a deleted stylesheet is the same hazard in a different coat. **T-40-24, disposition ACCEPT, settled by D-40-13 and not re-opened here.** The paragraph is in `sw.ts` beside the listener, in the form `sw.ts:76-97` already uses for a conflict between two gates — both gates named, the more restrictive declared the winner, the disposition recorded.

## Zero silent failures — what happens if a delete fails

There is no error tracking in this project, so a log is a place nobody looks. The listener therefore has **no `catch`**: a rejection is not swallowed and not made to look handled. Its consequence is written into the docblock instead — **a failed delete leaves that bucket exactly as it is today**, which is the behaviour this listener replaces, not a new hazard. And it becomes observable in the one place it matters: `40-RELEASE-PASS.md` H3.4, whose three outcomes are each given a reading **in advance**, so the result is recorded rather than negotiated afterwards.

## Authentication Gates

None. No credential, no login, no external service, no package install. Serwist 9.5.6 and `@serwist/next` 9.5.6 were already declared dependencies and every fact quoted from them was read out of `node_modules/` on this tree (T-40-31).

## Known Stubs

None. Both code changes are live on every request through the service worker. `40-RELEASE-PASS.md` is intentionally unfilled — that is not a stub, it is the correct state of a procedure that has not been run, and the document says so twice.

## Threat Flags

**None new.** No route, no query, no input, no capability, no RLS policy and no middleware branch was touched. Deleting a Cache Storage bucket is not an authorisation change (T-40-30, accept). The three monotone guards are unreachable from here: `venue_reveal_sent` is a database column, a payment reaching `completed` is a webhook path, and a series progressivo is production data — a service-worker cache purge touches none of them, and the purge only ever **removes** copies, which is the direction `venue-secrecy.md` wants.

Register dispositions as executed:

| Threat | Disposition | State at the end of this plan |
|---|---|---|
| T-40-24 | accept | Recorded in `sw.ts` as a named gate conflict, and in this summary |
| T-40-25 | mitigate | Two arms mechanical and green; the third is H3.5, **pending** |
| T-40-26 | mitigate | `deploymentId` refused in the file, with its mechanism and its future condition |
| T-40-27 | mitigate | `navigateFallback` refused; zero documents precached re-asserted after **both** code changes |
| T-40-28 | mitigate | Grep → 0 for every reload construct; the observation is H3.4, **pending** |
| T-40-29 | mitigate | `40-RELEASE-PASS.md` exists with ten `Result: pending`. DS-10 and DS-06's home-screen half are `human_needed` |
| T-40-30 | accept | No access surface touched |
| T-40-31 | mitigate | No install ran |

## Issues Encountered

One blocking, fixed inline: the researched snippet does not typecheck under this repository's `lib` (Deviation 2). Nothing else blocked. Two plan criteria were mismeasured against the file's own existing prose (Deviations 1 and 3); both hold on their intent and both are recorded so a verifier does not read a mismatch as a gap.

## Deferred

**DI-40-03** added to `deferred-items.md`: `40-03-SUMMARY.md` ends with two stray tool-closing tags. Cosmetic, another plan's committed artifact, and out of this plan's declared scope — recorded rather than tidied.

## Next Phase Readiness

- **A release is now a boundary, and everything downstream inherits it.** From this commit, every deploy drops the three document buckets. Phases 41 and 42 do not need to think about version skew in styles; they do need to know that **a device's first open after a release is online**, because that is now a property of the product and not of one plan.
- **`39-DOOR-PASS.md` §0.4 gains a second reason.** It already says a first measurement taken in an ordinary window reports on the old worker. From Phase 40 the old worker also has different **buckets**. Whoever runs the end-of-v1.5 sitting should read §0.4 before §0.5, and `40-RELEASE-PASS.md`'s preamble (d) says so.
- **Two requirements leave this phase open, by design.** DS-10 (H3) and DS-06's home-screen half (H1). `requirements-completed` above is **empty on purpose**: nothing this plan can run closes either, and a plan that ticked them would be the repudiation threat T-40-29 exists to prevent.
- **One open question for whoever ships next:** H3.2 requires a release that changes **at least one style**, or the boundary is not exercised. A release with no CSS change leaves the previous stylesheet's content hash intact and the test measures nothing. That is written into the step.
- **No blockers.**

## Self-Check

Files:
- `src/app/sw.ts` — FOUND
- `next.config.ts` — FOUND
- `.planning/phases/40-brand-tokens-typography/40-RELEASE-PASS.md` — FOUND
- `.planning/phases/40-brand-tokens-typography/deferred-items.md` — FOUND

Commits:
- `d403526` — FOUND
- `f1b3718` — FOUND
- `b4df73a` — FOUND

State:
- `git diff --diff-filter=D --name-only 33304a6 HEAD` — empty, no deletions in any commit
- `git diff --stat 33304a6 HEAD` — three files, none of them `STATE.md` or `ROADMAP.md`
- `src/lib/offline/` — untouched

**Self-Check: PASSED**

---
*Phase: 40-brand-tokens-typography · Plan 05 · Completed 2026-08-11*
*No venue, no unannounced date, no line-up, no person named: `.planning/` is tracked and this repository is PUBLIC. Roles only.*
