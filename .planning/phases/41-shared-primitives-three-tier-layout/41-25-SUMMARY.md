---
phase: 41-shared-primitives-three-tier-layout
plan: 25
subsystem: verification-gates
tags: [gap-closure, round-3, wr-02, wr-03, wr-04, verify-conversion, reachability, allow-list, resp-01, resp-02]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 20
    provides: "scripts/verify-conversion.mjs — refuse() exiting 1 over a failure, the hoisted check-E refusals, FOCUS_ROOT_LITERAL_RE tolerant of a trailing LINE comment"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 21
    provides: "scripts/verify-conversion.mjs — NON_ROUTE_WRAPPER_EXTENSIONS, the closed allow-list widened for .orig, .rej and .bak"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 23
    provides: "scripts/verify-conversion.mjs — FOCUS_BRANCH_OPEN_RE and the focus branch as a region; the tree this plan re-derived every line number against"
provides:
  - "scripts/verify-conversion.mjs — an exit-code header stating the MEASURED reachability of the post-failure refusal rule, with the three numbers and the anchored commands that take them"
  - "scripts/verify-conversion.mjs — the same false claim removed from refuse()'s own docblock, where it also lived"
  - "scripts/verify-conversion.mjs — FOCUS_ROOT_LITERAL_RE tolerant of a trailing BLOCK comment, closed or unclosed, with or without a semicolon; still refusing a concatenation, a literal continuing onto the next line, a single-quoted literal and a backtick literal"
  - "scripts/verify-conversion.mjs — NON_ROUTE_WRAPPER_EXTENSIONS covering the trailing-tilde editor backup, with its false-positive analysis written beside the entry"
affects:
  - "41.1 and 41.2 — the conversion gate no longer refuses on a correct FOCUS_ROOT declaration carrying a trailing block comment, nor on a stray editor backup beside a wrapper"
  - "the next author of this file — the header now says the exit-1 rule is NOT reachable on this tree, and says what to do about it (re-measure, do not manufacture)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A claim of reachability is a measurement, not a sentence: state the numbers and the command that takes them, or the claim outlives the arithmetic that made it true"
    - "A grep that cites itself is not a measurement — anchor the command to the line start when the number lives in a comment that contains the searched text"
    - "Building a gate so that a claim becomes true is the same defect family as the claim; narrowing the claim is the honest move"
    - "Hoisting every refusal above every failure would leave the exit-1 branch with no site at all — trading an unreachable branch for a rule nothing can trip"
    - "Relax the anchor, never add the stripper: a stripper must decide where a comment begins inside a string, which is exactly what it cannot do"
    - "Every allow-list entry makes a gate skip something, so the false-positive analysis belongs beside the entry, not in a review document"
    - "A helper assertion that uses `includes` where it means 'this whole line' reports a mutation that landed as not landed — and in the opposite direction certifies a restore that never happened"

key-files:
  created:
    - .planning/phases/41-shared-primitives-three-tier-layout/41-25-SUMMARY.md
  modified:
    - scripts/verify-conversion.mjs

key-decisions:
  - "WR-02 closed by NARROWING the header, not by manufacturing a reachable refusal. The review offered both; the plan chose the first and the reason is written into the header so it is not re-litigated: engineering a gate to support a claim is the same defect family as the claim. The mechanism stays, unhoisted, and was re-proven by a run."
  - "The same false claim was found a second time, in refuse()'s own docblock, and was corrected in the same commit. Closing WR-02 in the header alone would have been the shape this whole round is about — a fix one location away from where the defect also lives."
  - "The header's three numbers move whenever a line is added above them, and tasks 2 and 3 both added lines. They were re-derived and corrected inside each of those commits rather than at the end: a stale number in this header is exactly the defect WR-02 named, and a commit that carries one is a commit that reintroduces it."
  - "The two greps cited in the header are anchored to the line start. The unanchored forms match the header paragraph itself — a number measured by a command that reads the sentence claiming it is not a measurement. Found while writing it, not after."
  - "WR-03 closed by relaxing the tail, NOT by adding a comment stripper. DEF-41-02 and DEF-41-06 already record two incomplete strippers in this file family; a fourth would be the pattern rather than the exception. The tail also accepts an UNCLOSED block opener, which the review's proposed regex did not."
  - "WR-04's `.json` half was NOT taken. It is outside the six items the owner fixed for this round; it is recorded here and in the script's docblock as named and deliberately not taken, and it was measured as still refusing — which is the safe direction."
  - "Check E's region logic (41-23) was not touched and does not interact with any of these three changes: the region is derived from the branch opener, and nothing here moves the opener, the balance or the exclusion."

requirements-completed: []

# Metrics
duration: ~55min
completed: 2026-08-13
tasks: 3
---

# Phase 41 Plan 25: a claim narrowed to its arithmetic, and two refusals that fired on correct code

Three findings, one file, and all three are shapes this phase has already paid
for. Two are the defect that has bitten seven times — **an acceptance oracle
that reddens correct code** — now inside the gates themselves. The third is its
mirror: **a claim of enforcement that nothing can reach.**

Every line number below was re-derived on the tree 41-23 left. None was taken
from a document.

---

## WR-02 — the header claimed a reachability the file's own arithmetic denies

The exit-code header kept the rule *"a refusal must not absorb a failure"* alive
by pointing at one refusal — the `ORPHANS_DECLARED` duplicate check — and
calling it *"what keeps the rule reachable rather than decorative."* That check
compares `orphanDeclared.size` with `ORPHANS_DECLARED.length`, and the list is
`[]`. The comparison is `0 !== 0`. It is false on every run, for any tree.

### The decision, and why it is written into the file

**The header was narrowed to the measurement. No reachable refusal was
manufactured.** The review offered that as the alternative; it was rejected, and
the reason now sits in the header so a later reader does not re-open it:
*building a gate in order to make a sentence true is the same defect family as
the sentence.* The mechanism itself is correct, is unhoisted, and becomes
reachable on its own the first time 41.1 or 41.2 populates that list.

The header also names the trap on the other side, because a sibling plan in this
same file already hit it: an acceptance criterion demanding *"every refusal above
every failure"* would leave `refuse()`'s exit-1 branch **with no call site at
all** — a rule nothing can trip. One unreachable branch traded for another.

### The three measured facts, and the commands that take them

| Fact | Command | Value |
|---|---|---|
| first failure recorded | `grep -nE '^[[:space:]]*failures\.push\(' … \| head -1` | line **1724** |
| refusal call sites | `grep -cE '^[[:space:]]*refuse\(' …` | **24**, of which **23** above 1724 |
| the one below | `grep -nE '^[[:space:]]*refuse\(' … \| awk -F: '$1 > 1724'` | line **1839** — the `ORPHANS_DECLARED` duplicate |
| the list | `grep -n 'export const ORPHANS_DECLARED' …` | line **1042**, `= []` |

**Both greps are anchored to the line start on purpose, and that is not
cosmetic.** The unanchored `grep -n 'failures.push('` matches the header
paragraph that cites it. A number measured by a command that reads the sentence
claiming the number is not a measurement — it is an echo, which is the shape
`ai-engineering.md` names under *"il contatore di controllo non legge la
superficie che sta muovendo."* Caught while writing the paragraph, and the
reason is written beside the commands.

### The same false claim, found a second time

`refuse()`'s own docblock said the `ORPHANS_DECLARED` refusal *"is the reachable
case."* Correcting the header and leaving that would have been this round's own
shape — a fix one location away from where the defect also lives. Corrected in
the same commit: it is the one call site the rule **has**, not a case the rule
**reaches**, and the docblock now points at the header for the measurement.

---

## WR-03 — the literal reader refused a correct line, one comment syntax from where it was just fixed

41-20 relaxed the end anchor for a trailing `//`. A trailing block comment is
equally ordinary and equally correct, and still took the gate to exit 2 — and
through `verify-all.mjs`, all sixteen gates to `VERIFY_REFUSED`.

**Reproduced on the shipped gate before anything changed**, FATAL verbatim:

```
exit=2
FATAL: src/components/ui/PageShell.tsx:125 declares FOCUS_ROOT, but not as a double-quoted
       literal closing on that line, so check E cannot read the whole of it.
       …
       const FOCUS_ROOT = "flex min-h-dvh items-center justify-center p-6"; /* one padding utility only */
```

### The tail was relaxed. No stripper was added.

A stripper is a second transformation running before the regex, and it would
have to decide where a comment begins **inside a string** — which is precisely
what it cannot do, and precisely the failure the refusal exists to prevent. This
file family already records two incomplete strippers, **DEF-41-02** and
**DEF-41-06**. A fourth would be the pattern rather than the exception.

The relaxation also goes one step past the regex the review proposed: it accepts
a block opener that does **not** close on the line, which the review's
`\/\*(?:(?!\*\/)[\s\S])*\*\/` form would still have refused.

### The shape matrix — 14 rows

Protocol, without exception: the variant written, then the file **re-read from
disk** and asserted **line-exact** present with the pristine declaration
line-exact absent, and only then the run's result read; then restored, and the
restore asserted by comparing **whole-file bytes**, not a line.

| # | Shape | Expected | Exit | Ticks | Printed value |
|---|---|---|---|---|---|
| CLEAN | the declaration as shipped | 0 | **0** | 5 | `"flex min-h-dvh items-center justify-center p-6"` |
| L1 | trailing line comment, semicolon | 0 | **0** | 5 | identical to CLEAN |
| L2 | trailing line comment, no semicolon | 0 | **0** | 5 | identical to CLEAN |
| B1 | trailing block comment **closed**, semicolon | 0 | **0** | 5 | identical to CLEAN |
| B2 | trailing block comment **closed**, no semicolon | 0 | **0** | 5 | identical to CLEAN |
| B3 | block comment **unclosed**, semicolon | 0 | **0** | 5 | identical to CLEAN |
| B4 | block comment **unclosed**, no semicolon | 0 | **0** | 5 | identical to CLEAN |
| N1 | no comment, no semicolon | 0 | **0** | 5 | identical to CLEAN |
| R1 | built by **concatenation** | 2 | **2** | 0 | FATAL: `not a double-quoted literal closing on that line` |
| R2 | literal **continues onto the next line** | 2 | **2** | 0 | same FATAL |
| R3 | **backtick** literal | 2 | **2** | 0 | same FATAL |
| R4 | **single-quoted** literal | 2 | **2** | 0 | same FATAL |
| P1 | literal whose CONTENTS open a block comment, no trailing comment | 0 | **0** | 5 | `"flex … p-6 /*x"` |
| P2 | **same literal plus** a trailing block comment | 0 | **0** | 5 | `"flex … p-6 /*x"` |

**Asserted equalities, printed by the harness rather than eyeballed:**

```
every row matched its expected exit : true
value(B1) === value(CLEAN)          : true
value(B2) === value(CLEAN)          : true
value(B3) === value(CLEAN)          : true
value(B4) === value(CLEAN)          : true
value(L1) === value(CLEAN)          : true
value(N1) === value(CLEAN)          : true
value(P2) === value(P1)             : true
P1 value carries the block opener   : true
```

`value(P2) === value(P1)` is the evidence the plan asked for and the regex is
not. It says two things at once: the trailing block comment does not truncate
the read, **and** a `/*` living *inside* the literal is not mistaken for a
comment opener. A stripper would have failed the second half — it would have cut
at the inner `/*` and changed the value. That comparison, not the pattern, is
why relaxing was safe.

### What the widened tail hits, and which correct file it would wrongly catch

It hits **only what follows the literal's closing quote**, past an optional
semicolon and whitespace: a `//` to end of line, or a `/*` to end of line.
Nothing before that quote. **The answer to "which correct file would it wrongly
catch" is: none** — the widening only stops the gate catching correct ones, and
the four refused shapes above are the evidence that it did not become "anything
goes."

---

## WR-04 — one editor backup took all sixteen gates to REFUSED

The wrapper allow-list covered `.orig`, `.rej` and `.bak` — merge-conflict and
manual-copy artefacts — but not the tilde form that emacs, gedit and some
JetBrains configurations write beside the file being edited.

| Row | Tree state | Exit | What the gate said |
|---|---|---|---|
| before the edit | `src/app/layout.tsx~` present | **2** | `FATAL: 1 file(s) under src/app are named as a wrapper … (.css, .scss, .sass, .less, .md, .orig, .rej, .bak): src/app/layout.tsx~` |
| after the edit | the same file present | **0**, five ticks | printed under `of those, skipped as not a route module : 1` with its reason line, verbatim below |
| closedness | `src/app/layout.mts` present | **2** | the same FATAL, now listing `~` among the known suffixes and still refusing `.mts` |
| named-not-taken | `src/app/layout.json` present | **2** | the same FATAL — still refuses, which is the safe direction |

```
      wrapper files under src/app : 3   (basenames climbed: layout., template.)
          src/app/(admin)/admin/(work)/layout.tsx
          src/app/layout.tsx
          src/app/layout.tsx~
      of those, skipped as not a route module : 1
          src/app/layout.tsx~
             an editor backup — the trailing-tilde form of .bak; Next resolves no route file at it
```

No new mechanism was needed: the enumeration already matches with
`rel.endsWith(ext)`, which handles a bare suffix as well as a dotted extension.

### The false-positive analysis, written beside the entry

Every entry on that list makes the gate **skip** something, and every skip is a
place a real wrapper could hide. So the justification lives in the script's
docblock, not only here:

> the entry matches any path under the route root whose basename starts with a
> climbed wrapper prefix **and** ends with a tilde. **Next resolves no route file
> at a name ending in `~` under any `pageExtensions`, so no legitimate wrapper
> can be skipped by it.**

### Named and deliberately NOT taken: the `.json` form

`41-GAP-REVIEW-2.md` WR-04 also names `layout.json`, which refuses for the same
reason. **It is outside the six items the owner fixed for this round, so it was
not added.** It is recorded here and in the script's docblock so it is not lost
— the same treatment 41-20 gave the `MIN_HEIGHT_RE` weakness it left open — and
it was measured in this round as **still refusing (exit 2)**, which is the safe
direction while it stays open.

---

## What was mutated, per finding

The standard this phase now holds is that the **documented trigger** is mutated,
at the site where a real regression would appear, and that the negative control
is asserted rather than assumed. Recorded per finding:

| Finding | Documented trigger mutated | Site | Result | Negative control, asserted |
|---|---|---|---|---|
| **WR-02** | *"a run that BOTH failed a check and then hit a refusal exits 1"* — the header's own rule, at the only call site below the first failure | **script only, no product file**: a duplicated `path::export` pair on `ORPHANS_DECLARED`, plus `SCRIM_PREFIX` altered so the three tolerated scrims redden check A | **exit 1** — `✗ A` at output line 147, FATAL at 171, then `CONVERSION_FAIL — 1 check(s) had ALREADY failed … : A` at 174 | levers asserted present by grep **before** the result was read; after restore, `grep -c MUTANT_LEVER` → `0` **and** `cmp` against the pre-mutation copy → byte-identical; re-run **exit 0, five ticks** |
| **WR-03** | *"a gate that goes red on correct code gets switched off"* — the rule quoted three times in this file, at the declaration line the reader parses | **`src/components/ui/PageShell.tsx`, the `FOCUS_ROOT` declaration**, matched by its text and never by its line number | 14 rows: 8 correct shapes to **exit 0** with an identical printed value, 4 fragment shapes to **exit 2** | every row asserted **line-exact** present before its result was read and the pristine line asserted line-exact absent; every restore asserted by whole-file byte comparison; `git diff -- src/components/ui/PageShell.tsx` → **0 lines** |
| **WR-04** | *"an extension in neither list still refuses, because an unknown extension is exactly the case the refusal was written for"* — the docblock's own closedness rule, at the route root the walk reads | **`src/app/`**, a real copy of the root layout at three names: `layout.tsx~`, `layout.mts`, `layout.json` | tilde **2 → 0**; `.mts` **2**; `.json` **2** | each copy deleted and `git status --porcelain` asserted to show **no untracked file under `src/app`** |

### One helper defect, recorded rather than smoothed over

The task-2 harness first asserted "the pristine declaration is absent" with
`includes(DECL)`. Several variants carry the pristine declaration as a **prefix**
— `…p-6"; // one padding utility only` contains `…p-6";` — so the harness threw
`pristine declaration STILL on disk` on a mutation that had landed perfectly. It
was corrected to compare **whole lines**, and the restore assertion compares
**whole-file bytes**.

Written down for the same reason 41-23 wrote down its own: this failure is loud
and costs a rerun. **The opposite one — a helper certifying a restore that never
happened — is how a mutated product file ships.**

---

## Verification

| Proof | Result |
|---|---|
| `node scripts/verify-conversion.mjs` — live repository, clean tree, after all three tasks | exit **0**, five ticks, `CONVERSION_OK` |
| the three header numbers vs. the file | 1724 / 24 sites (23 above, 1 at 1839) / 1042 — **all three match the anchored greps** |
| `npm run build` | exit **0** — run with the tree restored after task 2, again after task 3, and **again after this SUMMARY was written** (DEF-41-01: Tailwind compiles class strings out of `.planning/` and out of comments) |
| `git status --porcelain` | **1 line** during work (the script), **0** at the end; no untracked file under `src/app` |
| `git diff -- src/components/ui/PageShell.tsx` | **0 lines** |
| mutation cycles | **20** — 1 for WR-02, 14 for WR-03, 4 for WR-04, plus the WR-03 reproduction on the shipped gate |
| `npm run verify` | exit **2** — `VERIFY_REFUSED — 1 gate(s) could not measure: verify:capabilities`; `verify:conversion 0 passed`; `verify:redirects — not run: needs a running dev server` |

**On that aggregate 2.** This worktree holds no `.env.local`, so
`verify:capabilities` refuses for the missing Supabase variables and measures
nothing about the capability model. It is **identical to the run recorded in
41-23-SUMMARY.md before this change**, it is a property of the environment, and
it is neither a pass nor a failure of this work. Compared against the
pre-change run, not against zero — as the aggregate itself insists.

**There is no test runner for this product** (Guardrail 1). Nothing here is
verified because tests pass. Every proof above is an exit code, an exact stdout
string, or a source assertion.

### Check E's region logic — untouched, and it does not interact

41-23's region derivation is the third attempt at a guard that failed twice, so
it is stated rather than assumed: **none of the three changes touches it.** The
region is derived from the branch opener at `PageShell.tsx:151` and bounded by
brace balance; WR-02 changes prose, WR-03 changes what may follow a closing
quote on the declaration line at `:125` — which is **outside** the region — and
WR-04 changes a list of file suffixes. The clean-tree report still prints the
region as `151-157 (7 line(s), bounded by brace balance)`, with `navigation
propert(y/ies) found inside the region: 0`.

---

## What this does NOT close

**A gate that can finally fail is not a surface anyone has seen.** All three
changes are to a development-only script. It rendered nothing and measured no
pixel; the two product-file touches were transient and every restore was
asserted, not assumed.

- **RESP-01 and RESP-02 stay PARTIAL.** No requirement is ticked by this plan.
  DS-07, DS-08, DS-09, RESP-03 and RESP-04 also remain PARTIAL.
- **H41-1 … H41-6 remain unobserved.** H41-4 stays `human_needed`.
- **`41-CR01-PASS.md`'s thirteen rows stay `pending`**, on four screens nobody
  has opened. Those four focus routes are the product's front door and its
  payment-outcome screen; the only thing that will say they are workable is a
  person looking at them.
- **`MIN_HEIGHT_RE` / `CENTRING_RE` stay open** (41-GAP-REVIEW.md CR-02). Not
  subsumed, not silently widened, not silently closed.
- **The `.json` wrapper form stays open**, named above and in the script.

---

## Deviations from Plan

### 1. [Rule 2 — missing critical correction] The WR-02 claim lived in a second place

**Found during:** Task 1.
**Issue:** `refuse()`'s docblock also stated the `ORPHANS_DECLARED` refusal *"is
the reachable case."* The plan's acceptance criterion names only the header.
**Fix:** corrected in the same commit; it is the one call site the rule has, not
a case the rule reaches, and it now points at the header for the measurement.
**Why it is not optional:** fixing the claim in one location and leaving it one
docblock away is the exact shape all three findings of this round have.
**Commit:** `94c3122`

### 2. [Rule 1 — bug in the work itself] The header's own numbers went stale twice

**Found during:** Tasks 2 and 3.
**Issue:** both tasks add lines above the first `failures.push`, so the three
numbers the header prints shifted — 1674 → 1697 → 1724, and 1789 → 1812 → 1839,
and 1015 → 1042.
**Fix:** re-derived and corrected **inside each of those commits**, not at the
end. A commit carrying a stale number in that header reintroduces WR-02 in the
same breath as closing it.
**Commits:** `27c7a66`, `f23214b`

### 3. [Rule 1 — bug] The mutation harness's own presence assertion was too crude

**Found during:** Task 2, on the first run. `includes(DECL)` reported the
pristine declaration still present on a mutation that had landed, because
several variants carry it as a prefix.
**Fix:** compare whole lines for presence/absence, whole-file bytes for restore.
Recorded in full above, because the opposite failure is the dangerous one.

### 4. [Rule 3 — blocking, environment] The worktree base was behind

**Found during:** startup. `git merge-base HEAD 7c983d5` returned an older
commit, so the worktree was not on the wave's base.
**Fix:** `git reset --hard 7c983d5` inside the sanctioned startup check, HEAD
asserted afterwards. No self-recovery of any protected ref.

### 5. Extension of scope, deliberate and small

`layout.json` was **measured** (exit 2) although it was not fixed, so that the
"named and not taken" record is backed by a run rather than by a citation.

---

## Threat Flags

None. All three changes are to a development-only script; no network endpoint,
no auth path, no file-access pattern and no schema at a trust boundary was
introduced or moved. The reachability of the four focus routes remains decided
in `src/lib/routes/capability-routes.ts`, the middleware and the RLS policies —
none of which this plan touches.

## Self-Check: PASSED

- `scripts/verify-conversion.mjs` — FOUND; contains `NON_ROUTE_WRAPPER_EXTENSIONS`
- `.planning/phases/41-shared-primitives-three-tier-layout/41-25-SUMMARY.md` — FOUND
- `94c3122` (task 1, the header) — FOUND in `git log`
- `27c7a66` (task 2, the literal tail) — FOUND in `git log`
- `f23214b` (task 3, the tilde entry) — FOUND in `git log`
- `src/components/ui/PageShell.tsx` — unmodified, `git diff` 0 lines
- No stub, TODO, FIXME, mock or placeholder introduced by this plan
