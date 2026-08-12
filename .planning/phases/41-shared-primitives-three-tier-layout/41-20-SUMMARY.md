---
phase: 41-shared-primitives-three-tier-layout
plan: 20
subsystem: verification-gates
tags: [gap-closure, round-2, gap-cr-02, wr-01, check-e, page-shell, render-site, resp-01, resp-02]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 17
    provides: "scripts/verify-conversion.mjs — check E, FOCUS_ROOT_IDENTIFIER, and E1's read of the constant's declaration"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 19
    provides: "src/components/ui/PageShell.tsx — the corrected docblock; the render site moved from :136 to :153 as that docblock grew"
provides:
  - "scripts/verify-conversion.mjs — FOCUS_BRANCH_RE: the focus branch must render FOCUS_ROOT as the whole of exactly one className, or the run refuses"
  - "scripts/verify-conversion.mjs — every check-E refusal raised before any verdict prints, asserted by line number"
  - "scripts/verify-conversion.mjs — refuse() exits 1, not 2, when a check has already failed, so a failure cannot be laundered into a refusal"
affects:
  - "41.1 and 41.2 — the first legitimate second class on the focus branch (the nav prop D-41-04 did not write) now REFUSES rather than passing silently. That refusal is correct and its text carries the instruction: widen in the same commit, with the measurement"
  - "scripts/verify-all.mjs — a verify:conversion run that both failed and refused now reports FAILED to the aggregate instead of REFUSED"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A gate that reads a declaration must also assert the site that renders it — otherwise the defect can be reintroduced one line away from where the gate is looking"
    - "A reintroduced defect that SATISFIES an assertion is worse than one that evades it: assertion 3 counted the reintroduction as evidence of health"
    - "A refusal must not absorb a failure: exit 1 when something was measured and was wrong, whatever else could not be measured"
    - "The one refusal that structurally cannot be hoisted is what keeps the exit-1 rule reachable — hoisting every refusal would make the rule a gate that cannot fire"
    - "A mutation of the constant proves nothing about a check that already reads the constant: mutate the site where the regression appears"

key-files:
  created: []
  modified:
    - scripts/verify-conversion.mjs

key-decisions:
  - "The ORPHANS_DECLARED duplicate refusal was deliberately NOT hoisted. It needs check C's data, and it is the only reachable case for the exit-1 rule. Hoisting it would have satisfied the plan's acceptance criterion literally while making change 2 a decoration — the failure mode ai-engineering.md's 'un gate deve poter fallire' names absolutely."
  - "The plan's stated trigger-B lever (removing CATALOGUE_FILE from EXEMPT_PATHS) does not make check A fail. It was replaced with a script-only SCRIM_PREFIX lever, which does. Recorded rather than worked around silently: the plan's assumption about that lever was wrong."
  - "MIN_HEIGHT_RE and CENTRING_RE were not touched. Their secondary weakness (satisfied by forms that do not produce what assertion 2 defends) is real and named in GAP-REVIEW CR-02, and is out of scope for this round."
  - "The exit-code header was extended to state the mixed FAILED+REFUSED outcome. A header that contradicts the behaviour beneath it is the defect 41-19 had just finished correcting elsewhere in this same file family."

requirements-completed: []

# Metrics
duration: ~50min
completed: 2026-08-12
tasks: 2
---

# Phase 41 Plan 20: The assertion moves onto the site where the regression appears

**Round 1 proved check E by mutating the `FOCUS_ROOT` constant — the one thing
the check already read — saw red, and shipped. The verifier then mutated the
render site, left the constant untouched, and the shipped gate printed `✓ E`
over the full CR-01 defect.** Worse than a miss: the reintroduced line was
counted *toward* assertion 3, so the defect fed the check meant to catch it.

This plan closes that, and it closes it the only way that means anything: **the
mutation used here is the render site, never the constant, and this document
says which one so a reader can tell whether the proof matched the claim.**

**Nothing here is an observation of a screen.** RESP-01 and RESP-02 stay
PARTIAL. H41-1 and the thirteen `pending` rows of `41-CR01-PASS.md` are
untouched by this plan and remain owed in full. A gate that can now fail is
still not a surface anyone has looked at.

## The trigger each mutation used

The column that matters is **site mutated**. Round 1's failure was a proof
whose site did not match its claim.

| # | Trigger, in the check's own words | Site mutated | Exit BEFORE fix | Exit AFTER fix | Restored |
|---|---|---|---|---|---|
| **A** | *"check E's measurement, taken here so its refusals precede every tick"* — the file's own comment, WR-01's subject | **the constant's name**, `PageShell.tsx:125` + its one reference at `:153`, renamed so `FOCUS_ROOT_IDENTIFIER` no longer finds it | **2** — with `✓ A`, `✓ B`, `✓ C`, `✓ D` printed at output lines 150, 159, 239, 249 and the FATAL only at 253 | **2** — FATAL at output line **5**, and **zero** verdict lines anywhere before it | **0**, five ticks |
| **B** | the `ORPHANS_DECLARED` duplicate refusal, raised **after** checks A and B print — WR-01's mixed outcome | **script-only levers, no product file**: `SCRIM_PREFIX` altered so three tolerated scrims fail check A, plus a duplicated `path::export` pair in `ORPHANS_DECLARED` | **2** — `✗ A` at line 147, then the FATAL at 171: a FAILED run laundered into a REFUSED one, and the aggregate prints "Nothing failed" | **1** — `✗ A`, the FATAL, then `CONVERSION_FAIL — 1 check(s) had ALREADY failed…: A` | **0**, five ticks |
| **C** | the verifier's own words: *"mutated the render site only (left the FOCUS_ROOT constant untouched) … the full CR-01 defect … and ran the SHIPPED, UNMODIFIED gate. Result: exit 0, `✓ E`"* | **the RENDER SITE**, `PageShell.tsx:153` — `FOCUS_ROOT` at `:125` left byte-identical | **0**, `✓ E` present, and `read at line(s)` for **both** properties now listing **153** — the reintroduction feeding assertion 3, observed not quoted | **2**, `✓ E` absent, FATAL naming the shell file and the identifier | **0**, `read at line(s)` back to **160** and **164** only |
| **C′** | same assertion, opposite direction: a different-but-correct-looking form | **the RENDER SITE**, the identifier alone inside a template literal | *(n/a — the assertion did not exist)* | **2** — refuses, because the assertion is about the shape the gate can read, not the characters that follow | **0**, five ticks |

The className mutated for trigger C, verbatim as the verifier wrote it:

```
className={`${FOCUS_ROOT} ps-[calc(var(--nav-inset-inline-start)+1.5rem)] pb-[calc(var(--nav-inset-block-end)+1rem)]`}
```

*(The identical string is already committed in `41-GAP-REVIEW.md:150` and
`41-VERIFICATION.md`, so quoting it here adds no Tailwind candidate that the
tree does not already carry. `npm run build` was re-run **after** this document
was written for exactly that reason — DEF-41-01, and the same precaution
41-13 and 41-17 took.)*

**Every mutation was asserted present by grep before its result was read, and
asserted absent afterwards.** That is not ceremony: **one substitution in this
plan silently did not apply.** A `perl -0pi` using `\Q…\E` quoted the `\n`
inside the pattern literally, so the `EXEMPT_PATHS` lever never landed while
the `ORPHANS_DECLARED` one did. Had the result been read first, the run would
have been attributed to a lever that was not there.

**And the site the verifier cited is not the site on this tree.**
`41-VERIFICATION.md` names `PageShell.tsx:136`; after 41-19 corrected the
docblock in wave 1, the render site is **`:153`**. The mutation was applied by
matching the line's text, not its number.

## What was built

### Task 1 — every check-E refusal precedes every tick, and no refusal absorbs a failure (commit `e18cdfc`)

**Two changes, one sentence: a failure must not be able to hide behind a
refusal, in either direction.**

**1. E1's read hoisted.** The `FOCUS_ROOT` declaration scan, its three refusals
(no declaration, two declarations, not a single closed literal) and the
assignment of `focusRoot` / `focusRootLineNo` / `shellLines` moved up beside
E2's measurement, under the comment that had claimed since 41-17 that refusals
precede every tick — a claim that was true of E2 and false of E1. Only the
comparisons (`propertiesInFocusRoot`, `focusRootHasHeight`,
`focusRootHasCentring`, `propertyReadsElsewhere`, `propertiesDroppedEntirely`)
stayed beside their report, where a reader expects them.

**2. `refuse()` reports a failure it finds already recorded.** `const failures`
moved above `refuse()`, which now reads it — a `const` referenced before its
declaration throws a `ReferenceError`, and this file's own header says a broken
gate must never read as a finding. When `failures` is non-empty, `refuse()`
prints the FATAL exactly as before, then a distinct line naming the checks
already failed and stating that a measurement that happened outranks one that
did not, and exits **1**.

Both verdicts stay distinguishable: the FATAL is still printed and still first,
so a refusal is still legible as a refusal. What changed is that the run no
longer tells the aggregate "nothing was measured" about a run in which
something was measured and was wrong.

### Task 2 — check E1 asserts the branch that renders (commit `b123569`)

`FOCUS_BRANCH_RE`, built by **interpolating** `FOCUS_ROOT_IDENTIFIER`
(`verify-conversion.mjs:1189`) rather than re-typing the name, so the render
assertion and the declaration scan cannot drift apart: rename the constant and
**both** stop finding it, instead of one silently continuing to pass. Matches
are counted across `shellLines`, which is comment-stripped, so a documented
example of the correct form cannot satisfy it. Anything other than exactly one
is a refusal, raised inside the hoisted read so task 1's invariant survives the
addition.

**The refusal text carries three things**, because a refusal that fires on
correct code without saying what to do is how a gate gets switched off:

| It says | Why |
|---|---|
| what was measured and found — the identifier, the count, the line numbers | a reader must be able to see the gate's own view, not guess it |
| why this is a refusal and **not** a failure | E1 asserts against the constant, so a focus root assembled from it *plus anything else* is a form this gate did not read — and asserting a property's absence from a fragment is how a check goes green on a defect it never saw |
| what a legitimate change does | if the focus branch ever needs a second class, the named candidate is the `nav` prop D-41-04 deliberately did not write. The assertion then **widens in the same commit**, carrying the measurement that justified it. It does not get deleted, and the constant does not get inlined to make it quiet |

The E1 docblock now records, in one sentence, the fact this assertion exists to
close: *the reintroduction was counted toward assertion 3, so the defect fed
the check meant to catch it.* That sentence is the reason the next reader will
not trim this as redundant with the three assertions below it.

`MIN_HEIGHT_RE` and `CENTRING_RE` were not narrowed, widened or commented on.

## Verification

**There is no test runner for the product** (`CLAUDE.md` Guardrail 1 — no
`test` script, no `*.test.*`, no `*.spec.*`). Nothing below is a claim that
tests pass.

| Check | Result |
|---|---|
| `node scripts/verify-conversion.mjs` on the live tree | **exit 0** — `✓ A`…`✓ E`, `CONVERSION_OK — all five checks passed over 8 declared surface(s), 53 file(s) scanned` |
| `npm run build` (Next's typecheck gate), every mutation reverted | **exit 0** |
| `git diff HEAD -- src/components/ui/PageShell.tsx` | **empty** (0 lines) after every one of the four cycles |
| `git status --porcelain` at the end of each cycle | only `scripts/verify-conversion.mjs`, never a product file |
| first `failures.push(` line | **1365** |
| `refuse(` call-site lines | 913…1198, **all below 1365**, plus **1480** — the `ORPHANS_DECLARED` duplicate, deliberately not hoisted (see below) |
| `const failures` (**269**) vs `function refuse` (**288**) | declaration precedes the function that reads it |
| pattern built from the marker, not re-typed | `verify-conversion.mjs:1189` interpolates `FOCUS_ROOT_IDENTIFIER` |

**`npm run verify` — aggregate exit 2, on a worktree holding no `.env.local`.**
14 passed, **0 FAILED**, 1 REFUSED (`verify:capabilities`, whose stderr names
the missing environment variables), 1 not run (`verify:redirects`, needs a
running dev server), 16 declared and 16 accounted for.
`verify:conversion` reported `0 passed`. Verdict line, verbatim:

```
VERIFY_REFUSED — 1 gate(s) could not measure: verify:capabilities
```

**That is identical to the baseline recorded in `41-17-SUMMARY.md`** — exit 2,
14 passed, 1 REFUSED, 1 not run. A refusal is not a failure and is not a pass;
this one is the command working correctly on a machine without credentials, and
it is a property of the environment, not of this change.

## Deviations from Plan

### 1. [Rule 3 — blocking] The plan's trigger-B lever does not stage the condition it was chosen for

**Found during:** Task 1, staging trigger B.

**Issue:** The plan specified *"remove the `CATALOGUE_FILE` entry from
`EXEMPT_PATHS`, so the format swatch's brand hexes reach check A and it
fails"*. Applied and asserted present, the run printed **`✓ A` over 54 files**
(up from 53) and exited 2 on the `ORPHANS_DECLARED` refusal alone. Check A
matches **palette utilities**, not hex literals; the exemption's own docblock
calls the catalogue *"a brand hex that is data on a row"*. Removing the
exemption widens the scan without producing a hit.

**Fix:** replaced with a lever that does make check A fail, still touching no
product file — `SCRIM_PREFIX` altered so the three tolerated translucent-black
scrims stop being forgiven. Result `✗ A  3 raw palette utilit(y/ies)`, which is
the condition trigger B needs.

**Files modified:** `scripts/verify-conversion.mjs` (transient lever, reverted;
asserted absent by grep and by `git status --porcelain`).

**Recorded rather than quietly substituted**, because the plan's assumption
about that lever reads as verified and is not.

### 2. [Rule 3 — blocking] The plan's first acceptance criterion contradicts its own trigger B

**Found during:** Task 1, after change 2.

**Issue:** The criterion demands *every* `refuse(` call-site line number be
lower than the first `failures.push(`. But trigger B's premise, stated in the
same plan, is that *"the `ORPHANS_DECLARED` duplicate refusal sits after checks
A and B print … needs no relocation"*. Both cannot hold. And they must not:
**if every refusal preceded every tick, `failures` would be empty at every call
site and change 2 would be a rule nothing can reach** — a decoration that makes
something look presidiato, which `ai-engineering.md`'s *«un gate deve poter
fallire»* forbids absolutely.

**Fix:** the criterion is satisfied in the form that is coherent — **every
check-E refusal precedes every tick** (asserted: all such call sites ≤ 1198 <
1365) — and the one refusal that structurally cannot be hoisted, because it
needs check C's data, is left where it is. It is precisely the case change 2
covers, and it is what keeps change 2 reachable. Written into the `refuse()`
docblock and the file header so the next reader does not "tidy" it.

**Files modified:** `scripts/verify-conversion.mjs`.

### 3. [Rule 2 — missing critical] The exit-code header contradicted the new behaviour

**Found during:** Task 1, after change 2.

**Issue:** The header declared `2 nothing was measured … **No verdict is
implied by a 2**` with no mention of the mixed outcome, so a reader would have
been told the opposite of what the code now does.

**Fix:** extended with the FAILED-then-refused case, its measurement, and the
reason the `ORPHANS_DECLARED` refusal stays where it is. This is the same
defect class 41-19 had just corrected in `PageShell`'s docblock — a document
that states a measurement the code disproves.

**Files modified:** `scripts/verify-conversion.mjs`.

**No authentication gate was hit. No package was installed** (T-41-SC:
`package.json` unchanged). No product file is modified by either commit.

## What this does not close

**RESP-01 and RESP-02 stay PARTIAL and are not ticked here.** RESP-01 closes
only after phase 41.2.

**H41-1 remains owed in full on all eight converted surfaces, and
`41-CR01-PASS.md` is still a pending procedure with all thirteen rows
`pending`.** This plan observed no screen, opened no viewport and measured no
pixel. It made a gate able to fail on the defect it names — and *"a gate is not
an observation"* is 41-17's own sentence, still true, and now true of a gate
that at least sees what it claims to.

**The secondary hole in the same block is still open**: `MIN_HEIGHT_RE` and
`CENTRING_RE` are satisfied by forms that do not produce what assertion 2
exists to defend (GAP-REVIEW CR-02, closing paragraph). Deliberately untouched,
deliberately named here so it is not lost.

**GAP-CR-01 — `verify-all.mjs`'s reconciliation — is not this plan's subject**
and is unchanged by it.

## Known Stubs

None. No hardcoded empty value, no placeholder text, no unwired component. The
change adds one refusal, one pattern and one exit path to a verification
script, and moves a read and a declaration. `git diff --name-only` for this
plan: `scripts/verify-conversion.mjs` alone, plus this document.

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change at a
trust boundary was introduced. The script opens no connection, reads no
environment variable, writes no artefact, and prints only paths, line numbers
and source lines from files already committed to a public repository.

**T-41-C1 is recorded as mitigated by measurement rather than by intention.**
`PageShell.tsx` renders `(auth)`'s three surfaces and `/payment/callback` —
`access-gating` and `ticketing-payments` territory, the product's front door
and its payment-outcome screen. It was mutated transiently four times. Each
mutation was asserted present by grep before its result was read and asserted
absent afterwards; `git diff HEAD -- src/components/ui/PageShell.tsx` is empty
and `git status --porcelain` carries no line for it. **`npm run build` was not
run while any render-site mutation was present** (DEF-41-01: those are live
Tailwind candidates), and was run once at the end with everything reverted.

**T-41-C2 stands as accepted.** Nothing in either commit decides, submits or
reports anything on those routes. Reachability is `capability-routes.ts`, the
middleware and the RLS policies — none touched. The transient mutations changed
a `className` and an identifier's spelling, never a branch that renders
different content for a different role or status.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 | `e18cdfc` | `fix(41-20)` — every check-E refusal precedes every tick, and no refusal absorbs a failure |
| 2 | `b123569` | `feat(41-20)` — check E1 asserts the branch that renders, not only the constant it reads |

## Self-Check: PASSED

- `scripts/verify-conversion.mjs` — FOUND
- `.planning/phases/41-shared-primitives-three-tier-layout/41-20-SUMMARY.md` — FOUND
- commit `e18cdfc` — FOUND
- commit `b123569` — FOUND
- `node scripts/verify-conversion.mjs` re-run after this document was written — **exit 0**
- `npm run build` re-run **after** this document was written — **exit 0**. Same
  reason 41-13 and 41-17 re-ran it: Tailwind scans `.planning/`, and this
  document quotes a className verbatim because the plan's output contract
  requires the trigger to be recorded exactly (DEF-41-01)
- `git status --porcelain` carries no line for `src/components/ui/PageShell.tsx`
</content>
</invoke>
