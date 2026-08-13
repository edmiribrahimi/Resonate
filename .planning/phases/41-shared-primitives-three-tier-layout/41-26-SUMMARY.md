---
phase: 41-shared-primitives-three-tier-layout
plan: 26
subsystem: testing
tags: [verification-gate, node, esm, tailwind, page-shell, regex, mutation-testing]

requires:
  - phase: 41-shared-primitives-three-tier-layout
    provides: "check E of scripts/verify-conversion.mjs — three previous rounds of the CR-01 reintroduction guard, each closed at the point the defect was last seen"
provides:
  - "FOCUS_BRANCH_SHAPE — the frozen line-by-line expected shape of the focus branch, and a positional window comparison that counts zero braces"
  - "the verdict split: a deviation carrying a navigation property FAILS check E; a deviation alone REFUSES"
  - "two distinct refusal markers — SHAPE CHANGED and GATE CANNOT READ — so a red suite is legible in one line"
  - "the frozen shape's own self-check, proven by mutating the script rather than asserted in prose"
  - "FOCUS_ROOT_LITERAL_RE rebuilt as one fully anchored accepted form, built from FOCUS_ROOT_IDENTIFIER"
affects: [41.1, 41.2, "any plan that refactors PageShell.tsx's focus branch"]

tech-stack:
  added: []
  patterns:
    - "Frozen-shape comparison instead of shape recognition: everything that is not the one expected shape refuses or fails, so the gate needs no anticipation of future syntaxes"
    - "Split verdict: a measurement that happened and was wrong outranks one that did not happen"
    - "A gate's own expectation self-checks, and the self-check is exercised by mutating the gate"

key-files:
  created: []
  modified:
    - scripts/verify-conversion.mjs

key-decisions:
  - "Round 4 inverts the assertion's direction rather than adding a fourth syntax case: three rounds of enumeration each taught the matcher one more form and the next form always existed"
  - "The frozen shape's entries assemble their utility tokens from fragments, because a frozen copy of product code outlives the product code it copies (DEF-41-01)"
  - "A deviation carrying a navigation property is a FAILURE, not a refusal — this subsumes WR-03 rather than taking it as extra scope"
  - "The accepted cost is written down: this gate refuses a legitimate refactor of the focus branch until FOCUS_BRANCH_SHAPE is updated"

patterns-established:
  - "Positional window: length frozen, anchor = the single opener, no character counted from the source"
  - "Two refusal markers with two meanings, so a red suite says whether a person changed the code or the gate went blind"

requirements-completed: []

duration: 55min
completed: 2026-08-13
---

# Phase 41 Plan 26: Round-4 Gap Closure — the Focus Branch Compared Against a Frozen Shape Summary

**Check E stops recognising shapes: the `width === "focus"` branch is now compared position by position against one frozen expected shape over a window whose length is that shape's length and whose anchor is the single opener, counting zero braces — and the frozen shape self-checks, proven by injecting a navigation property into it and measuring exit 2.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-08-12T23:50Z (approx.)
- **Completed:** 2026-08-13T00:44Z
- **Tasks:** 2
- **Files modified:** 1 (`scripts/verify-conversion.mjs`)

## Task Commits

1. **Task 1: freeze the focus branch's shape, and split the verdict** — `5a7c2a0` (feat)
2. **Task 2: one accepted form for the FOCUS_ROOT declaration, and the false docblock claim corrected with it** — `5722b4b` (fix)

No product file was modified by either commit. `src/components/ui/PageShell.tsx` was mutated **transiently** nine times and restored each time; `scripts/verify-conversion.mjs` was mutated transiently once, for the self-check proof, after task 1's edit was committed and again after task 2's.

## What changed, in the direction it changed

| | round 3 (shipped before this plan) | round 4 (this plan) |
|---|---|---|
| how the branch is bounded | brace balance from the opener until it returns to zero | a positional window: `start` = the single opener, `length` = `FOCUS_BRANCH_SHAPE.length` |
| braces counted | every `{` and `}` from the opener to the close | **zero** |
| an unrecognised shape | passes green | refuses (`SHAPE CHANGED`) or fails (`✗ E`) |
| a deviation carrying the defect | could be a refusal, i.e. "nothing was measured" | **always a failure**, exit 1, `✗ E`, named as CR-01 |
| the expectation itself | none existed | asserted free of both navigation properties on **every run**, and the assertion is exercised |
| what a reader meets on a red | one refusal voice | two markers: `SHAPE CHANGED` vs `GATE CANNOT READ` |

Removed with the balance derivation, and said rather than deleted quietly: the
opener-that-opens-no-block refusal (measured firing only on a shape its own
message does not name, while a ternary — the shape it does name — passed green)
and the balance-never-returns-to-zero refusal (a condition the frozen comparison
now reaches first, and reaches without needing to be right about braces). Both
removals carry their reason in the file's docblock, in prose, without the
identifiers and without a line number.

## 1. Which documented trigger each mutation exercised, and the site

Each mutation is named by the check's own docblock words, and the SITE is where a
real regression would appear — not a convenience lever, not a constant.

| id | site mutated | trigger, in the check's own words | round-3 reference |
|---|---|---|---|
| M1 | `PageShell.tsx` **inner element** of the focus branch | *"no line of the focus branch reads either navigation property"* — the defect scan over the frozen window | GAP-REVIEW-3 case B, round 3's genuine closure; must not regress |
| M2 | `PageShell.tsx` a **newly inserted third element** inside the branch | same scan; the window's length is frozen, so an inserted element cannot push a line out of it | GAP-REVIEW-3 case C, round 3's other genuine closure |
| M3 | `PageShell.tsx` **outer element**, clearance appended through a template literal | *"a focus root assembled from that constant PLUS anything else is a form this gate did not read"* — the render-site assertion, now judged AFTER the window scan | GAP-REVIEW-3 case A / **WR-03** |
| M4 | `PageShell.tsx` **whole branch rewritten as a brace-less `if`**, defect on the inner element, otherwise byte-identical | *"an unrecognised shape produced a GREEN"* — the frozen-shape comparison, plus the shape-independent window scan | GAP-REVIEW-3 **case D**, the escape that reopened CR-01 a third time |
| M5 (control) | same brace-less rewrite, **no defect** | *"the branch has exactly the one frozen expected shape"* — the shape comparison alone | GAP-REVIEW-3 case G, which exited 0 silently |
| D1 | `PageShell.tsx` declaration line, trailing `//` comment | the accepted form's *"at most ONE well-formed trailing comment"* | GAP-REVIEW WR-06 half 2 — a real defect when it reddened |
| D2 | declaration line, trailing block comment closing on the line | same clause | GAP-REVIEW-2 WR-03 — a real defect when it reddened |
| D3 | declaration line, literal + block comment + **concatenation** whose second operand carries the leading-inset utility | *"the form either matches, in which case the capture is the whole literal by construction, or it does not, in which case nothing is read and the run refuses"* | GAP-REVIEW-3 **CR-02** |
| D4 | declaration line, a **second `const` declaration on the same line** whose literal carries the leading-inset utility | the head anchored to this identifier, *"so the `=` it matches is provably the identifier's own"* | GAP-REVIEW-3 **WR-06** |
| SC | **`scripts/verify-conversion.mjs` itself** — entry 5 of `FOCUS_BRANCH_SHAPE` | *"the frozen shape cannot itself carry a navigation property"* | new in this round; without it the refusals' own instruction is the fifth escape |

## 2. Exit code, `✓ E` and `CONVERSION_OK` for every mutation, counted mechanically

Counts taken with `grep -c` over each run's captured stdout, never by eye. Every
mutation was applied **by line TEXT**, asserted landed by whole-file byte
equality against the intended content **and** by `git diff --numstat` being
non-empty **before** any result was read, and asserted restored by
`git diff --numstat` reporting nothing.

| id | exit | `✓ E` | `CONVERSION_OK` | `✗ E` | `SHAPE CHANGED` | `GATE CANNOT READ` | verdict |
|---|---|---|---|---|---|---|---|
| M1 | **1** | 0 | 0 | 1 | 0 | 0 | ✓ round 3's closure holds |
| M2 | **1** | 0 | 0 | 1 | 0 | 0 | ✓ round 3's closure holds |
| M3 | **1** | 0 | 0 | 1 | 0 | 0 | ✓ **WR-03 subsumed** — was exit 2 |
| M4 | **1** | 0 | 0 | 1 | 0 | 0 | ✓ **case D closed** — was exit 0 `✓ E` `CONVERSION_OK` |
| M5 | **2** | 0 | 0 | 0 | 1 | 0 | ✓ the accepted cost, visible — was exit 0, silent |
| D1 | **0** | 1 | 1 | 0 | 0 | 0 | ✓ legitimate form stays green |
| D2 | **0** | 1 | 1 | 0 | 0 | 0 | ✓ legitimate form stays green |
| D3 | **2** | 0 | 0 | 0 | 1 | 0 | ✓ **CR-02 closed** — was exit 0 `✓ E` `CONVERSION_OK` |
| D4 | **2** | 0 | 0 | 0 | 1 | 0 | ✓ **WR-06 closed** |
| SC | **2** | 0 | 0 | 0 | 0 | 1 | ✓ the self-check fires |

**M3 is the WR-03 subsumption, stated as such.** Under the shipped gate,
appending the clearance to the outer element through a template literal made
`className={FOCUS_ROOT}` match zero times and the gate exited 2 — so through
`verify-all.mjs` a genuine CR-01 regression was delivered to the aggregate as
*"nothing was measured"* for all sixteen gates. The render-site refusal is now
raised only when the frozen window came back carrying **no** navigation
property; when the window carries one, a measurement happened and was wrong, and
that is reported as a failure. WR-03 is closed by the verdict split rather than
by a separate item.

**D3, additionally asserted:** stdout contains no line printing a truncated
literal as if it were the whole one. Checked mechanically — `grep -c` for the
report's `FOCUS_ROOT = "…"` line carrying only the first fragment returned **0**.
The refusal prints the found line under an explicit `FOUND, verbatim:` heading,
which is the whole line including the concatenation, not a value.

**D4, additionally asserted:** `grep -c` for the report printing the second
declaration's literal as `FOCUS_ROOT`'s value returned **0**. The run refuses
before the report's value line exists.

## 3. The asserted negative control

On the restored tree, with `git status --porcelain` empty:

```
node scripts/verify-conversion.mjs   → exit 0
  ✓ A  ✓ B  ✓ C  ✓ D  ✓ E            (each counted with grep -c, each 1)
  CONVERSION_OK — all five checks passed over 8 declared surface(s), 53 file(s) scanned.
```

The report states the shape matched, and prints the window before any verdict:

```
      the focus branch, src/components/ui/PageShell.tsx:151-157   (7 line(s), anchored on the single opener; no brace counted)
      the frozen expected shape                 : 7 line(s)
      the window matches the frozen shape       : yes
          151 : if (width === "focus") {
          152 : return (
          153 : <div className={FOCUS_ROOT}>
          154 : <div className={`‹a width utility› ‹a narrow maximum-width utility› ${className}`.trimEnd()}>{children}</div>
          155 : </div>
          156 : );
          157 : }
          FOCUS_ROOT rendered at line 153
          navigation propert(y/ies) found inside the window: 0
```

`git diff --numstat -- src/components/ui/PageShell.tsx` reports nothing.
`git status --porcelain -- src/` is empty. `git status --porcelain -- scripts/`
is empty. `npm run build` exits **0**.

*(The block above is the gate's own stdout, reproduced because that is the
evidence. One position — the inner element's class string — carries two whole
utility tokens, and those two are **elided into `‹…›` descriptions here**:
DEF-41-01 measured that Tailwind compiles class strings out of `.planning/`, and
a verbatim transcript is not an exemption from that. Nothing else in the block is
altered; the elided position is position 4 of the frozen shape, and the real text
is in `PageShell.tsx`.)*

## 4. The bounded no-whole-utility grep

**Exact command run** (the plan's instantiation, unchanged):

```bash
sed -n '/width === "focus"/,/^  }$/p' src/components/ui/PageShell.tsx \
  | grep -oE '\b[a-z]+(-[a-z0-9]+)*-(\[[^]]*\]|[a-z0-9]+)\b' \
  | sort -u \
  | while read -r t; do
      printf '%s=' "$t"
      awk '/FOCUS_BRANCH_SHAPE = \[/,/^\];/' scripts/verify-conversion.mjs | grep -c -- "$t"
    done
```

**The bound:** between the line that opens the `FOCUS_BRANCH_SHAPE` array
literal and the line that closes it. The token list is derived from
`PageShell.tsx`'s focus branch rather than typed out.

**Result, on the final tree** — two tokens were derived from the branch, and the
command printed `TOKEN=0` for each:

| token, written with a `‹›` break so this file is not itself a Tailwind candidate | count inside the bound |
|---|---|
| `w‹›-full` — the width utility on the inner element | **0** |
| `max‹›-w-sm` — the narrow maximum-width utility on the inner element | **0** |

Both tokens **0**. Both are assembled from fragments in the frozen entries, so
neither appears contiguously anywhere inside that declaration. The `‹›` break is
inserted **here, in this SUMMARY only** — the command above receives the real
tokens, derived from `PageShell.tsx` by `sed` and `grep` and never typed.

**Why `DECLARED_MAXIMA` is excluded from the count — its own sentence, and it is
excluded because named, never because unnoticed.** `DECLARED_MAXIMA` writes three
whole utilities contiguously in this same script, and one of the three is the
same narrow maximum-width token the frozen entries carry, so a whole-file grep
returns at least 1 however carefully the frozen copy is fragmented — the
criterion would be unsatisfiable as an absolute. It is excluded because it is a
**different risk**: it predates DEF-41-01's fragment rule, and it is a
*declaration the gate compares the shell against*, not a frozen copy of product
code that outlives the product it copies. That distinction is the whole reason
the frozen entries must be fragmented and `DECLARED_MAXIMA` need not be, and it
is written into the frozen shape's docblock so the next reader does not read the
overlap as a contradiction. This plan does not take that risk; it names it.

**This SUMMARY itself obeys DEF-41-01.** No utility token is written
contiguously in its prose: the mutations' inserted classes are described as *the
leading inline-start padding utility* and *the block-end padding utility*, the
frozen entries' tokens as *a width utility* and *a narrow maximum-width utility*.
The two custom-property NAMES — `--nav-inset-inline-start` and
`--nav-inset-block-end` — are names, not utilities, and are not Tailwind
candidates; the file family's own rule already writes them.

## 5. The self-check proof

**Entry mutated:** entry 5 of `FOCUS_BRANCH_SHAPE`, the closing tag of the outer
element.

**The fragment form the property name was injected in:**

```
  '</div>' + ' --nav-' + 'inset-' + 'block-' + 'end',
```

The property name therefore does **not** appear contiguously in the script's
source. Verified mechanically: `grep -n -- "--nav-inset-block-end"` over the
mutated file returned exactly **one** line, and that line is `NAV_PROPERTIES`'s
own declaration — never the injected entry. **That is what makes the proof mean
something: the self-check fired on the ASSEMBLED value, not on the file's text.
A self-check reading the source would not have fired here, and it would have been
discovered by this run rather than in round 5.**

**When it was run:** after task 1's edit was committed, so a clean `git diff` on
the script is a true restore assertion; and again after task 2's commit, on the
final shipped tree, which is the run recorded below.

**Assertion that it landed, before any result was read:** whole-file byte
equality against the intended content (re-read from disk), **and**
`git diff --numstat -- scripts/verify-conversion.mjs` returning
`1	1	scripts/verify-conversion.mjs` — non-empty.

**Observed:** exit **2**; `GATE CANNOT READ` marker on the FATAL's first line;
`✓ E` counted at **0** and `CONVERSION_OK` counted at **0**, both with `grep -c`.

> Exit **2 and not 1** matters: `refuse()` degrades to 1 when `failures` is
> already non-empty. On the restored tree it is empty, and this refusal is raised
> in check E's hoisted read, before any `failures.push`. An exit 1 here would have
> meant an earlier check had failed and the proof would have had to be re-run on
> a clean tree. It was 2 on both runs.

The refusal, verbatim in part:

```
FATAL: GATE CANNOT READ — the frozen expected shape of the focus branch, declared in
       this file, itself carries a navigation property:

         entry 5  --nav-inset-block-end
           </div> --nav-inset-block-end
```

**Both restore assertions:**
- `git diff --numstat -- scripts/verify-conversion.mjs` → reports nothing.
- checksum equality: `58969237af15e209f12cffb82dc447d67e90b6a5097c5f2bfda71a3287005cea` for both the restored file and the snapshot.

**The snapshot was outside the repository** — under the session scratchpad, never
under the worktree — and is **deleted**. `git status --porcelain -- scripts/`
shows nothing left over. A second copy of a gate lying around is itself an
artefact.

## 6. Which docblock sentences were checked, and with what

| sentence | checked with | outcome |
|---|---|---|
| *"the literal read is byte-for-byte the literal, comment or no comment"* | mutation D3, end to end on the shell | **FALSE on the code it described** — removed, with its record. `grep -c "byte-for-byte the literal, comment or no comment"` now returns **0** |
| the replacement: *"the form either matches, in which case the capture is the whole literal by construction … or it does not, in which case nothing is read and the run refuses"* | mutations D1, D2 (match, value read whole, exit 0) and D3, D4 (no match, nothing read, exit 2) | true on all four |
| *"an unrecognised shape produced a GREEN"* (the round-3 diagnosis this file now states) | mutations M4 and M5 against the shipped gate's recorded behaviour (exit 0 `✓ E` `CONVERSION_OK`) and against this one (exit 1 / exit 2) | true, and closed |
| the removal note for the opener-that-opens-no-block refusal — *"measured firing only on a shape it does not name, while the shape it does name passed green"* | GAP-REVIEW-3 WR-01's recorded probes, re-read against the code that was removed | accurate; the refusal is gone, its reason is not |
| the frozen shape's fragment rule and the `DECLARED_MAXIMA` overlap | the bounded grep in section 4 | both counts **0** inside the bound; the overlap outside it is real and named |
| *"the `=` it matches is provably the identifier's own"* | mutation D4 | true — the second declaration's literal is never read |
| the exit-code header's new paragraph naming the two markers | `grep -c "SHAPE CHANGED"` = 2 and `grep -c "GATE CANNOT READ"` = 2 in the source; both markers observed on real runs (M5/D3/D4 and SC) | true |

No measured line number was written into any comment added by either commit.
WR-05 is open, this plan adds lines above the header's three numbers again, and
the least it could do was not add a fourth stale number — it did not.

## 7. The accepted cost, stated plainly

**This gate now refuses a legitimate refactor of the focus branch until
`FOCUS_BRANCH_SHAPE` is updated, and that is intended.** Control M5 measures it:
a brace-less rewrite carrying no defect at all — legal JS, Prettier-stable —
exits 2 with `SHAPE CHANGED`. Under round 3 that same rewrite exited 0 silently
while the gate had stopped reading four sevenths of the branch.

Whoever meets that red in 41.1 gets, in the refusal itself: the frozen shape
verbatim, the found window verbatim with line numbers, the first differing
position with expected and found side by side, and one instruction — update
`FOCUS_BRANCH_SHAPE` in the same commit, keeping it free of both navigation
property names, which the gate asserts separately and will refuse if broken.

That last clause is why the self-check is not optional. Without it, the
refusal's own instruction is the fifth escape and round 5 is pre-written into
the error message.

## 8. What this does **not** close

**A gate that can finally fail is not a surface anyone has seen.** This plan
rendered nothing, opened no viewport and measured no pixel. It reads a class
string and an import graph.

- **H41-1 … H41-6 remain unobserved.** No converted surface has been looked at
  by a person at three widths. **H41-4 stays `human_needed`.**
- **`41-CR01-PASS.md`'s thirteen rows stay `pending`**, on four screens nobody
  has opened — `/login`, `/register`, `/set-password` and `/payment/callback`.
- **`MIN_HEIGHT_RE` / `CENTRING_RE` stay open**, named and not taken: they assert
  that a minimum-height and a centring utility are *present* in the focus root,
  never what those utilities produce. That is GAP-REVIEW CR-02 and it is
  untouched here.
- **RESP-01 and RESP-02 remain PARTIAL**, and so do DS-07, DS-08, DS-09, RESP-03
  and RESP-04. **No requirement is ticked by this plan.** RESP-01 closes only
  after 41.2.

**Named as left out rather than left silent** — a statement not made is
indistinguishable from an omission, and three rounds of this guard are what that
costs:

- **WR-02** — `verify-dialogs.mjs`'s rung family is narrower than the sentence it
  prints: Tailwind v4's CSS-variable shorthand is a rung *written out* in the
  class string, is neither of the two exclusions the report names, and the
  matcher misses it. The delta on this tree is a measured **zero**, so nothing is
  hidden today — which is why it was deferred, and not why it is closed. **Open,
  not attempted by this round.**
- **WR-04** — `FULL_BLEED_VIEWER`'s exemption premise, that the exempt file
  *still carries a native shell*, is trusted rather than measured: the file is
  skipped before the shape check runs, so if the viewer converts or is deleted
  the exemption goes quiet with no notice. **Open, not attempted by this round.**
- **WR-05** — `verify-conversion.mjs`'s own header carries three measured line
  numbers that went stale twice inside round 3 as lines were added above them,
  and nothing mechanical re-measures them; the mitigation is a paragraph asking
  the next reader. This plan **adds lines above them again** and was bound not to
  make it worse — no new measured line number was written into any comment — but
  it does not compute the claim, which is what closing WR-05 requires. **Open,
  not attempted by this round.**

## Files Created/Modified

- `scripts/verify-conversion.mjs` — check E's read rewritten: `FOCUS_BRANCH_SHAPE`
  and the positional window replace the brace-balance region; the verdict splits
  into failure / `SHAPE CHANGED` / `GATE CANNOT READ`; the frozen shape
  self-checks; the evidence exclusion is rebased onto the window;
  `FOCUS_ROOT_LITERAL_RE` rebuilt as one anchored accepted form; one false
  docblock claim removed with its record.

No product file changed. `src/components/ui/PageShell.tsx` and
`scripts/verify-dialogs.mjs` are byte-identical to their state at the plan's base
commit; the second was never opened for writing — it belongs to a sibling plan in
this wave.

## Decisions Made

1. **Invert the direction rather than add a fourth case.** Three rounds each
   taught the matcher one more syntactic form and the next form always existed.
   The frozen shape needs no anticipation: everything that is not the expected
   shape refuses or fails.
2. **Split the verdict rather than file WR-03 separately.** A deviation carrying
   a navigation property is a measurement that happened and was wrong, so it is a
   failure; the refusals that would otherwise have swallowed it are gated on the
   window being clean.
3. **Two markers, not one refusal voice.** `SHAPE CHANGED` and
   `GATE CANNOT READ` are constants, not a phrasing convention, so a red suite in
   41.1 is legible from one line.
4. **The markers are declared above the first refusal that uses one**, for the
   reason `failures` is declared above `refuse()`: a `const` referenced before its
   declaration throws, and a gate that throws is indistinguishable from a finding.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The mutation harness reported a landed insertion as not landed**

- **Found during:** Task 1, mutation M2 (the inserted third element).
- **Issue:** The harness asserted that the *old* block was absent after writing.
  On an INSERTION whose new block legitimately contains the old line, that is
  false while the mutation has landed perfectly — the harness aborted with
  `MUTATION DID NOT LAND` after having already written the file. This is the same
  direction round 3 recorded (a helper reporting `STILL PRESENT` after a correct
  restore).
- **Fix:** The assertion is now whole-file byte equality against the intended
  content, re-read from disk, plus the new block occurring exactly once. That is
  strictly stronger and cannot fail in that direction. `PageShell.tsx` was
  restored and the numstat asserted empty before anything else ran; **M1 was then
  re-run under the corrected harness** so that no result in this SUMMARY was
  produced by the faulty one.
- **Files modified:** none in the repository — the harness lives in the session
  scratchpad, outside the worktree, and never entered the tree.
- **Verification:** M1 re-run → identical result; M2, M3, M4, M5 all landed and
  restored with the numstat asserted both ways.

**2. [Rule 2 — Missing critical] A control the plan did not require: the
brace-less refactor with NO defect**

- **Found during:** Task 1, after M4.
- **Issue:** M1–M4 all carry a defect, so all four would be red under a gate that
  simply reddened on everything. Nothing in the required set measures the
  *accepted cost* the plan spends a paragraph on, nor demonstrates truth 1 — that
  a rewrite without the frozen shape can never produce a tick *whether or not
  anyone anticipated it*.
- **Fix:** Added control M5 — round 3's case G, the identical brace-less rewrite
  with no defect, which exited 0 silently under the shipped gate. It now exits 2
  with `SHAPE CHANGED`.
- **Verification:** run captured; result in the table above.

---

**Total deviations:** 2 auto-fixed (1 blocking harness defect, 1 missing critical
control). **Impact:** no scope creep — neither touched the repository's code, and
the first prevented a harness from certifying a result it had not measured, which
is the failure direction this phase has recorded twice.

## Issues Encountered

None beyond the harness defect above.

## Verification

- `node scripts/verify-conversion.mjs` on the restored tree: **exit 0**, five
  ticks, shape matched.
- `npm run build`: **exit 0** (run with everything restored; run **again after
  this SUMMARY was written**, since Tailwind scans `.planning/` — DEF-41-01).
- `git status --porcelain -- src/`: empty.
  `git diff --numstat -- src/components/ui/PageShell.tsx`: nothing.
- `git status --porcelain -- scripts/`: empty; the self-check snapshot lived
  outside the repository and is deleted.
- `npm run verify`: **exit 2**, verbatim aggregate —
  *16 declared, 15 run, 14 passed, **0 FAILED**, 1 REFUSED
  (`verify:capabilities` — `FATAL: missing environment variable(s):
  SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL`), 1 needs a server and was not
  run (`verify:redirects`)*. `verify:conversion` is listed **passed, exit 0**.
  This worktree carries no `.env.local`, so the 2 is a property of the
  environment and not of this work — it is neither a pass nor a failure of it,
  and it is reported as the aggregate itself insists.
- **There is no test runner for this product** (Guardrail 1). Nothing here is
  called verified because tests pass. Every proof above is an exit code, a
  mechanically counted stdout string, or a source assertion.

## Next Phase Readiness

The reintroduction guard is closed against every shape rather than against every
element, and the closure is measured on the two escapes round 3 left open (case D
and CR-02) plus the two it genuinely closed (cases B and C), which do not
regress.

**What 41.1 and 41.2 must know before touching `PageShell.tsx`:** editing the
focus branch reddens `verify:conversion` until `FOCUS_BRANCH_SHAPE` in
`scripts/verify-conversion.mjs` is updated in the same commit. The refusal says
so, prints both shapes and points at the first difference. Adding a navigation
property to that frozen shape refuses in turn, and that refusal cannot be
satisfied by editing the gate.

**What remains owed and is not owed to a script:** a person opening `/login`,
`/register`, `/set-password` and `/payment/callback` at three widths.

---
*Phase: 41-shared-primitives-three-tier-layout*
*Completed: 2026-08-13*
