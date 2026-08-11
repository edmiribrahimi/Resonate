---
phase: 39-the-door-s-own-address
plan: 01
subsystem: testing
tags: [door-pass, human-verification, service-worker-cache, offline, procedure]

# Dependency graph
requires:
  - phase: 38-live-attendance-freshness
    provides: P1 … P7 and the eight UAT items, seven of them pending and deferred to the end-of-v1.5 sitting
  - phase: 34-one-work-surface
    provides: the carry-forward D-39-06 — a `pending` organizer sees no Check-in entry the server would admit
provides:
  - 39-DOOR-PASS.md — one document a person executes end to end in a dark room, ten sections, 25 observations, every Result reading `pending`
  - the warm-up step (§0.5) and the cold-address step (§8.8), both of which exist because the research measured the cache and found zero precached documents
  - a §9 results table mapping every observation to the requirement it closes
  - a written binding between 38-PROCEDURES.md and 39-DOOR-PASS.md that forbids the two records drifting apart
  - P6 named once, as an exclusion, with its reason and its act-shaped deadline
affects: [39-02, 39-03, 39-04, 40-brand-tokens, phase-39-verification, end-of-v1.5 sitting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The procedure is written before the code, and its value is that it predates its own results"
    - "Every Result line is exactly `Result: pending` at the start of its own line, so the state of the document is greppable"

key-files:
  created:
    - .planning/phases/39-the-door-s-own-address/39-DOOR-PASS.md
  modified:
    - .planning/phases/38-live-attendance-freshness/38-PROCEDURES.md

key-decisions:
  - "OQ4 resolved as fold-in, visibly: 38-HUMAN-UAT test 8 is §8.6, marked as the fold-in so one line removes it if the owner disagrees"
  - "OQ3 recorded as a deferral with its return route — a cache lifetime for the door goes back to /gsd:discuss-phase with the §8 reading attached, because how stale a door may be is a product decision"
  - "The P4 divergence Phase 38 recorded is closed by running both measurements: §5 is Slow 3G with the channel up, §8 is radio off, and the document says they do not substitute for each other"
  - "The drift rule is written as 'neither may declare an outcome the other does not' rather than quoting the word passed, so the plan's own mechanical check on 38-PROCEDURES.md stays honest"

patterns-established:
  - "One document for the dark room, one record of record for the requirements, and an explicit written rule binding the two"
  - "A production-write exclusion is named once with its reason, never silently omitted"

requirements-completed: [STAFF-04]

# Metrics
duration: 21min
completed: 2026-08-11
---

# Phase 39 Plan 01: The Door Pass Summary

**One 525-line procedure a person carries into a dark room — ten sections, 25 observations, every Result reading `pending` — that closes STAFF-04 criteria 2 and 3, D-39-06 and Phase 38's six deferred procedures plus UAT test 8, with `38-PROCEDURES.md` bound to it by a written anti-drift rule.**

## Performance

- **Duration:** ~21 min
- **Tasks:** 2 of 2
- **Files modified:** 2 (both under `.planning/`; nothing under `src/`, `supabase/` or `public/`)

## Accomplishments

- **`39-DOOR-PASS.md` exists and is honest about what has not happened.** 525 lines, ten `## §` sections (§0 … §9), 25 `Result: pending` lines and **zero** Result lines reading anything else. Nothing is ticked.
- **The two steps the research paid for are in it and are marked as not optional.** §0.5 is the online warm-up at **both** addresses with the Cache Storage bucket and body recorded per address; §8.8 repeats the offline launch at the **other** address, cold. Both carry the reason: `self.__SW_MANIFEST` holds 127 entries and **zero** documents, so every offline document comes from a `NetworkFirst` runtime cache at 24 h / 32 entries, warm only from a prior online visit — and cache keys are request URLs, so warming one address does not warm the other.
- **§9 maps every observation to the requirement it closes**, per item: §1.3 → criterion 1 / D-39-02; §1.5 → D-39-06; §2 → LIVE-03 + A1; §3 → LIVE-02/04/05; §4 → LIVE-02/03/05; §5 → LIVE-02; §6 → LIVE-01; §7 → LIVE-06; §8.2–§8.4 and §8.8 → criterion 2; §8 as a whole → criterion 3; §8.6 → LIVE-05.
- **P6 appears exactly as an exclusion and never as a step**, with its reason (a production write, an authorisation recorded spent, 63 rows lost with no PITR), its act-shaped deadline, and the four primary-key rules restated in case a fresh authorisation is ever granted.
- **`38-PROCEDURES.md` now points at it from above its own head block**, with one line per procedure naming the section that executes it, and P6 marked as outside the sitting. Additions only — `git diff` shows **0** deleted lines, the seven `Result` fields untouched.

## Task Commits

1. **Task 1: Write 39-DOOR-PASS.md — one document, ten sections, every Result pending** — `95ae5c9` (docs)
2. **Task 2: Point 38-PROCEDURES.md at it, so the two records cannot drift** — `5be0527` (docs)

## Files Created/Modified

- `.planning/phases/39-the-door-s-own-address/39-DOOR-PASS.md` — created. The single procedure for the end-of-v1.5 sitting: preconditions read on the day (§0), the move on the wire (§1), the pocket (§2), the four channel cases (§3–§6), the RLS refusal (§7), the dark room (§8), the results table (§9), and a closing block carrying the P6 exclusion, the OQ3 deferral and the phase-closure condition.
- `.planning/phases/38-live-attendance-freshness/38-PROCEDURES.md` — modified, additions only. A pointer block above the original head block, plus one italic line under each of the seven `## P…` headings.

## Verification performed

| Check | Command | Expected | Got |
|---|---|---|---|
| Door pass length | `wc -l` | ≥ 200 | **525** |
| Nothing ticked | `grep -cE '^Result: pending$'` | ≥ 20 | **25** |
| Nothing ticked | `grep -E '^Result:' \| grep -cv '^Result: pending$'` | 0 | **0** |
| Ten sections | `grep -cE '^## §[0-9]'` | ≥ 10 | **10** |
| The seven research-driven subsections | `grep -cE '^### §(0\.4\|0\.5\|0\.6\|1\.3\|1\.5\|8\.6\|8\.8)'` | 7 | **7** |
| Requirement mapping | `grep -c 'LIVE-01'` / `grep -cE 'LIVE-0[1-6]'` | ≥1 / ≥6 | **6 / 19** |
| Requirement mapping | `grep -c 'STAFF-04'` / `grep -c 'D-39-06'` | ≥2 / ≥1 | **18 / 4** |
| P6 excluded, never a step | `grep -c 'P6'` / `grep -cE '^## §[0-9.]+ *[—-] *P6'` | ≥1 / 0 | **9 / 0** |
| OQ3 routing | `grep -c 'gsd:discuss-phase'` | ≥1 | **1** |
| OQ4 visible | `grep -ci 'test 8'` | ≥2 | **6** |
| Public-repo discipline | `grep -nE '[0-9]{4}-[0-9]{2}-[0-9]{2}'` | 2 lines, the `written:` field and the permitted P6 timestamp | **line 3 `written:`, line 480 the P6 timestamp — and no others** |
| Phase closure stated | `grep -ci 'does not close'` | ≥1 | **1** |
| Pointer count | `grep -c '39-DOOR-PASS' 38-PROCEDURES.md` | ≥7 | **9** |
| Pointer above the head block | first `39-DOOR-PASS` line vs first `A procedure written after the observation` | lower | **18 < 38** |
| Drift rule stated | `grep -ci 'record of record'` | ≥1 | **1** |
| P6 marked outside the sitting | `grep -n -A3 '^## P6'` | a line with `not` and `production` | **line 328, both present** |
| Nothing ticked in `38-PROCEDURES.md` | `grep -cE '^\*\*Result'` before → after | 7 → 7 | **7 → 7** |
| Nothing ticked in `38-PROCEDURES.md` | `grep -ci 'passed'` before → after | 0 → 0 | **0 → 0** |
| Additions only | `git diff -- 38-PROCEDURES.md \| grep -c '^-[^-]'` | 0 | **0** |

### The six non-regression assertions

Run against the worktree source even though this plan touches no file under `src/` — a phase that moves an address is exactly the kind that loosens a cache rule by accident.

| # | Assertion | Expected | Got |
|---|---|---|---|
| 1 | `/events/**` is still `NetworkOnly` (T-37-27, monotone) | 1 | **1** |
| 2 | Four `NetworkOnly` API pathname rules, five handlers, no sixth | 4 then 5 | **4 then 5** |
| 3 | `reloadOnOnline` still `false` | one line | **`next.config.ts:12  reloadOnOnline: false,`** |
| 4 | No new layout under `(admin)` | exactly `admin/(work)/layout.tsx` | **exactly that one** |
| 5 | No door state moved into Cache Storage | 0 | **0** |
| 6 | No rewrite mechanism | 0 | **0** |

### What could NOT be verified, stated rather than implied

`npm run build`, `npm run verify:routes` and `npm run verify:persona` **were not run**: this worktree has **no `node_modules`**, and installing packages is not an auto-fixable action. They are not evidence about this plan either way — the plan's own text calls them the wave gate rather than evidence about itself, and `git diff --name-only` against the plan's base commit returns **exactly two files, both under `.planning/`**. Nothing this plan did can have moved any of those three gates. **They must be run in the same worktree as plan 39-02, which is the plan that actually touches `src/`.**

And the standing project rule applies to the document itself: there is **no test runner for the product**, so nothing here is verified because tests pass. What exists is a written procedure with its observations named, which in this repository *is* the evidence for criteria 2 and 3 — and it is `pending`, which means the observation has not been made.

## Decisions Made

- **OQ4 folded in, and marked as folded in.** `38-HUMAN-UAT` test 8 is §8.6. D-39-07's prose enumerates six items and `STATE.md` says seven; test 8 carries no P number and falls between them. It is a dark-room, one-handed, minimum-brightness observation — the same room and the same minute as criterion 3 — so excluding it would force the second trip D-39-07 exists to avoid. The section carries a visible note saying so, and one line removes it.
- **OQ3 deferred with a named return route.** Whether the door gets a runtime cache rule longer than 24 h is not decided by any plan of this phase; the closing block routes it back to `/gsd:discuss-phase` with the §8 reading attached, and adds the guard that no answer to it may re-admit `/events/**` to Cache Storage.
- **The P4 divergence is resolved by running both sides, not by choosing one.** §5 is Slow 3G with the channel up (IndexedDB contention); §8 is radio off (the door existing at all). The document says explicitly that one does not substitute for the other, so a later reader cannot retire a check that was never run.
- **§2 is ordered first** because it is the only step with a 65-minute floor, and the pointer line under P3 in `38-PROCEDURES.md` repeats that so the ordering survives being read from either file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The plan's own two acceptance clauses for task 2 contradicted each other; took the mechanically checkable one**

- **Found during:** Task 2 (the pointer block)
- **Issue:** The plan's `<action>` dictates the sentence *«neither may say "passed" while the other says "pending"»*, while its `<acceptance_criteria>` requires `grep -ci 'passed'` on `38-PROCEDURES.md` to be **unchanged** — and the before-count was **0**. Writing the dictated sentence would have failed the plan's own check.
- **Fix:** Wrote the rule as **«neither may declare an outcome the other does not — a `pending` in one and a tick in the other is a drift in either direction»**. This is the phrasing the plan's own `<done>` clause for task 2 uses, it is strictly more general (it also covers *issue* and *blocked*), and it keeps the count at 0.
- **Files modified:** `.planning/phases/38-live-attendance-freshness/38-PROCEDURES.md`
- **Verification:** `grep -ci 'passed'` → **0**, unchanged; `grep -ci 'record of record'` → **1**
- **Committed in:** `5be0527`

**2. [Rule 1 — Bug] A line count the edit would have falsified on the same commit**

- **Found during:** Task 2
- **Issue:** The plan's pointer text says *"This file is 521 lines"*. `38-PROCEDURES.md` was 521 lines **before** this edit and is 561 after it — the claim would have been false in the same commit that wrote it, in a published document.
- **Fix:** Wrote *"over five hundred lines"*. The point of the sentence — an auditor's document, not a door's — is unchanged.
- **Files modified:** `.planning/phases/38-live-attendance-freshness/38-PROCEDURES.md`
- **Verification:** manual read; the sentence carries no number that a later edit can falsify
- **Committed in:** `5be0527`

**3. [Rule 3 — Blocking] Pointer block placed after the H1 title rather than between the frontmatter and the title**

- **Found during:** Task 2
- **Issue:** The plan says *"immediately after the frontmatter and before the existing head block"*. Those two are not the same place: the H1 title sits between them. Putting a blockquote above a document's own title produces a malformed document.
- **Fix:** Placed it after the H1 and before the head block, which satisfies the binding half of the instruction and the plan's mechanical check.
- **Files modified:** `.planning/phases/38-live-attendance-freshness/38-PROCEDURES.md`
- **Verification:** first `39-DOOR-PASS` occurrence at **line 18**, the head block at **line 38** — the required ordering holds, and the pointer is still within the first screen
- **Committed in:** `5be0527`

---

**Total deviations:** 3 auto-fixed (2 bugs in the plan's own text, 1 blocking placement ambiguity)
**Impact on plan:** None on scope. All three are corrections to instructions that were internally inconsistent; every acceptance criterion of both tasks passes as written.

## Issues Encountered

- **`npm run build` / `verify:routes` / `verify:persona` could not be run in this worktree** — no `node_modules`, and a package install is not an auto-fixable action. Recorded above as *not run* rather than assumed green. This plan changed only two files under `.planning/`, so none of the three can have moved.

## Known Stubs

None. Every `Result` in `39-DOOR-PASS.md` reading `pending` is **not** a stub: it is the deliverable. The document's whole value is that it was written before the observation and is honest that the observation has not been made.

## Threat Flags

None. This plan created no network endpoint, no auth path, no file-access pattern and no schema change. The one trust boundary it touches — *this repository → the public internet* — is mitigated as the plan's threat register requires: roles never names, no night's date, no venue, no line-up, and exactly two date-shaped strings in the file, both accounted for.

## Next Phase Readiness

- **Wave 1 is complete and Wave 2 is unblocked.** `39-VALIDATION.md`'s `wave_0_complete` gate flips on this file existing, and it exists and is committed.
- **For plan 39-02:** §0.6 of the door pass is a **scheduling** obligation on that plan's deploy — the map assertion is a module-load throw that fires on the first request after deploy, so the deploy goes out on a day with no night and the first request is made deliberately. And landmine 5 stands: if 39-02 finds itself editing the `/events/**` rule to make the door work offline, it has taken a wrong turn.
- **For plan 39-04:** the persona-routing repair does **not** touch these two files; nothing here changed `CLAUDE.md` or `.claude/**`.
- **Open, and open is the honest word:** every observation in this document. The phase is *executed*, not *complete*, and does not close before the end-of-v1.5 sitting (D-39-07).
- **One item does not follow that sitting:** P6, whose deadline is an act — *before the next night is published with tickets on sale* — and which needs a fresh, explicitly scoped authorisation from the owner.

---
*Phase: 39-the-door-s-own-address*
*Completed: 2026-08-11*
