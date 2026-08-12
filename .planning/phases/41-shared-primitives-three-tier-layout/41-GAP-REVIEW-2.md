---
phase: 41-shared-primitives-three-tier-layout
reviewed: 2026-08-12T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - scripts/verify-all.mjs
  - scripts/verify-conversion.mjs
  - scripts/verify-dialogs.mjs
  - scripts/conversion-manifest.mjs
  - src/components/ui/PageShell.tsx
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 41 — Round-2 Gap Closure: Code Review Report

**Reviewed:** 2026-08-12
**Depth:** standard (with executed mutation probes)
**Files Reviewed:** 5
**Diff base:** `0d1413f9..HEAD`
**Status:** issues_found

## Summary

Round 2 was written to answer one question — *do these gates catch the defect as a
real regression would appear, or only as their own probe presents it?* — so the
review answered it the same way, by mutating a disposable tree and running the
gates. **Every mutation was reverted; `git status --porcelain` and `git diff` are
clean.**

**What round 2 genuinely closed, proven by execution:**

| Change | Probe | Result |
|---|---|---|
| 41-22 — non-exhaustive partition | fourth `state` (`"deferred"`) injected into the plan loop of a copy | **exit 2**, FATAL names `verify:tokens` as having got no verdict. The identity `41-GAP-REVIEW.md` CR-01 measured is gone. |
| 41-22 — refusal must not mask a failure | same fourth state **plus** a genuinely failing gate | **exit 1**, FATAL printed, then `VERIFY_FAIL — 1: verify:conversion` *and* `AND the reconciliation above refused on 1 entr(y/ies)`. Both halves reported. |
| 41-20 — refusals precede ticks | `FOCUS_ROOT` clearance reintroduced on the **constant** | **exit 1**, `✗ E … this is CR-01`. Reintroduced by wrapping the render site in a template literal → **exit 2**, FATAL, no tick printed first. |
| 41-20 — a refusal after a failure exits 1 | duplicate `ORPHANS_DECLARED` pair + a red check A | **exit 1**, `CONVERSION_FAIL — 1 check(s) had ALREADY failed`. Mechanism correct (but see WR-02: unreachable today). |
| 41-21 — `template.*` climbed | `src/app/(auth)/template.tsx` mounting `AppNav` | **exit 1**, `✗ E  3 focus surface(s) mount a navigation`. WR-05 closed. |
| 41-21 — non-route wrapper extensions | `src/app/layout.module.css`, `layout.tsx.orig` | **exit 0**, both printed under `skipped as not a route module`. WR-06 half 1 closed. |
| 41-18 — fenced debt entry | `src/components/scanner/ScanFlash.tsx` added to `REMAINING` | **exit 2**, FATAL naming the overlap. Closed. |
| 41-19 — the census | read against the tree | The docblock's new claims are **true**: `src/app/layout.tsx` mounts only `MotionProvider` + `ToastProvider`; `(work)`'s mounts `AppNav`; the gate itself enumerates exactly those two wrappers. Comment-only, no behaviour moved. |

**What it did not close.** One defect of the same family survived, and it is the
one this round existed to catch: **CR-01 reintroduced one DOM element down from
where the new assertion looks passes with a full green, and — exactly as in
GAP-CR-02 — the reintroduced line is counted as *evidence* by the assertion meant
to catch it.** Four further findings are the same three failure shapes this phase
has already paid for, one syntax or one list-membership away from where they were
just fixed.

---

## Critical Issues

### CR-01: check E1 guards the outer element only — CR-01 reintroduced on the focus branch's inner container passes green, and feeds assertion 3

**File:** `scripts/verify-conversion.mjs:1301-1327` (`FOCUS_BRANCH_RE` and its refusal), `scripts/verify-conversion.mjs:1819-1830` (`propertiesInFocusRoot` / `propertyReadsElsewhere`), `src/components/ui/PageShell.tsx:151-157`

**Issue:**
41-20's fix asserts that `FOCUS_ROOT` is rendered as **the whole of exactly one
`className`** (`FOCUS_BRANCH_RE = /className=\{FOCUS_ROOT\}/`). That closes the
mutation the round-1 verifier used — appending to the *outer* element — and
nothing else. The focus branch has **two** elements:

```tsx
if (width === "focus") {
  return (
    <div className={FOCUS_ROOT}>                                   // line 153 — guarded
      <div className={`w-full max-w-sm ${className}`.trimEnd()}>   // line 154 — UNGUARDED
```

Measured on a disposable copy — line 154 changed to
`` `w-full max-w-sm ps-[var(--nav-inset-inline-start)] pb-[calc(var(--nav-inset-block-end)+1rem)] ${className}` ``,
`FOCUS_ROOT` byte-identical:

```
exit=0
  ✓ E  the focus root reserves neither navigation property while src/components/ui/PageShell.tsx
       still reads both elsewhere, and all 8 converted surface(s) declare the width…
  CONVERSION_OK — all five checks passed over 8 declared surface(s)
```

and the report block printed:

```
      --nav-inset-inline-start   — outside the focus root: read at line(s) 154, 160
      --nav-inset-block-end      — outside the focus root: read at line(s) 154, 164
```

Line 154 is **inside the focus branch**, and it is counted toward
`propertyReadsElsewhere` — the assertion whose job is *"the shell still reads both
properties elsewhere"*. **The defect satisfies the check written to catch it.**
That is GAP-CR-02's shape verbatim, reproduced one element down, four days after
it was written up.

This is not a hypothetical regression shape. `PageShell.tsx:69-79` — the docblock
in the very file — names the inner element as the place the 112px error came
from: *"Put the inline-start padding on the inner element and a centred card sits
112px too far to the right at every width above 768px."* The measured consequence
of the passing mutation is the identical 248px-against-24px asymmetry CR-01 was
raised for, plus ~96px of bottom padding under a card with no bar beneath it.

A second, weaker hole in the same assertion: `FOCUS_BRANCH_RE` requires exactly
one `className={FOCUS_ROOT}` **anywhere in the file** — it never asserts that
occurrence sits inside the `width === "focus"` branch. `FOCUS_ROOT` rendered on
the default branch, with the focus branch carrying an arbitrary class string,
satisfies it too.

**Fix:** assert over the **focus branch as a region**, not over one `className`,
and stop the region feeding assertion 3. Two workable shapes; the second matches
this file family's own "a marker beats a heuristic" rule (`:786`):

```js
// (a) region-based: bound the branch, forbid the properties inside it, and
//     exclude it from the "read elsewhere" evidence.
const focusBranchStart = focusBranchLines[0];                 // the line carrying className={FOCUS_ROOT}
const focusBranchEnd = shellLines.findIndex((l, i) => i >= focusBranchStart && /^\s*\}\s*$/.test(l));
if (focusBranchEnd === -1) refuse('the focus branch has no readable end — nothing was measured.');
const focusBranchRegion = shellLines.slice(focusBranchStart - 1, focusBranchEnd);

const propertiesInFocusBranch = NAV_PROPERTIES.filter(
  (prop) => focusBranchRegion.some((l) => l.includes(prop))
);
// → ✗ E when non-empty; and skip lines in [focusBranchStart, focusBranchEnd]
//   when building propertyReadsElsewhere, so a clearance added here can never
//   count as the clearance surviving "elsewhere".
```

```js
// (b) marker-based: PageShell declares the inner container as a second named
//     constant (FOCUS_INNER), read by the same literal reader, asserted by the
//     same three rules, and rendered as the whole of exactly one className.
//     Then every element of the focus form is read, and neither can be widened
//     silently.
```

Whichever is taken, the mutation contract for the next round is explicit: **the
probe must append the clearance to the INNER element with `FOCUS_ROOT`
untouched, and the run must not exit 0.**

---

## Warnings

### WR-01: 41-18 closed the fence half of the STALE defect and left the exemption half open — the debt counter still shrinks because the gate stopped looking

**File:** `scripts/verify-dialogs.mjs:842-858` (the new refusal), `:969-979` (check B's skip loop), `:985-991` (`stale`)

**Issue:** check B's loop skips three categories of file before `shellShapes()`
ever reads them:

```js
if (file === PRIMITIVE_FILE) continue;
if (file === FULL_BLEED_VIEWER) continue;
const behind = fenceMatch(file); if (behind) { fenced.set(...); continue; }
```

The new refusal covers **only the third**. `stale` is computed as *on disk and
not in `measuredShells`*, so the other two produce the identical wrong report the
refusal was written to prevent. Measured, with `FULL_BLEED_VIEWER` added to
`REMAINING` on a copy:

```
exit=0
      REMAINING = 14
  ! B  1 REMAINING entr(y/ies) are STALE — the file no longer carries a shell:
       src/components/media/Lightbox.tsx  → converted; remove this entry
  DIALOGS_OK — all three checks passed. REMAINING = 14 file(s)…
```

`Lightbox.tsx:82` still carries `<dialog`. The gate says "converted; remove this
entry" about a file it never opened, and the debt number reads 14 where the two
lists imply 15 — *"a debt counter that falls because the gate stopped looking"*,
which is the sentence the new refusal itself uses (`:852-853`).

**Fix:** derive the skip set once, and key the refusal on it rather than on the
fence alone:

```js
const NEVER_MEASURED_BY_B = new Map([
  [PRIMITIVE_FILE, 'the primitive itself — check B measures copies OF it'],
  [FULL_BLEED_VIEWER, 'declared exempt from check B; a file that will never convert is not a debt'],
]);

const unmeasurableRemaining = [...declaredPaths.keys()].filter(
  (path) => fenceMatch(path) !== null || NEVER_MEASURED_BY_B.has(path)
);
// same refusal text; the reason line distinguishes "fenced (unmeasured)" from
// "exempt (measured and declared correct)", which the report already keeps apart.
```

### WR-02: verify-conversion's failure-absorbing refusal is unreachable on this tree, while the header states the opposite

**File:** `scripts/verify-conversion.mjs:249-258` (the claim), `:298-315` (the branch), `:970` (`ORPHANS_DECLARED = []`), `:1599-1604` (the only post-failure `refuse()` site)

**Issue:** the header says the WR-01 rule is kept *"reachable rather than
decorative"* by one refusal: the `ORPHANS_DECLARED` duplicate check. That check is

```js
if (orphanDeclared.size !== ORPHANS_DECLARED.length) { refuse(...); }
```

and `ORPHANS_DECLARED` is `[]`, so the condition is `0 !== 0` — **false on every
run, for any tree, until somebody re-populates the list.** Every other `refuse()`
call site in the file sits at line ≤ 1345; the first `failures.push` is at 1485.
So today **no refusal in this file can fire after a failure**, and the branch at
`:301-312` is dead code carrying a claim that it is not.

The mechanism itself is correct — proven by making it reachable (duplicate orphan
pair + a red check A → `exit 1`, `CONVERSION_FAIL — 1 check(s) had ALREADY
failed`). What is wrong is the sentence a reader believes, in a file whose whole
method is written evidence.

**Fix:** either narrow the header to the truth — *"no refusal in this file is
currently reachable after a failure; the rule is written for the shape that will
be, and the SUMMARY records the mutation that exercised it"* — or restore
reachability by making one late refusal genuinely conditional on tree state.

### WR-03: the `FOCUS_ROOT` literal reader still refuses on a correct line — same shape as the WR-06 half it just fixed, one comment syntax away

**File:** `scripts/verify-conversion.mjs:1237` (`FOCUS_ROOT_LITERAL_RE`)

**Issue:** 41-20 relaxed the end anchor for a trailing `//` comment. A trailing
**block** comment is equally ordinary and equally correct, and still takes the
whole gate — and through `verify-all.mjs` the whole suite — to exit 2. Measured:

```
$ (PageShell line 125 → const FOCUS_ROOT = "…"; /* one padding utility only */)
exit=2
FATAL: src/components/ui/PageShell.tsx:125 declares FOCUS_ROOT, but not as a double-quoted
       literal closing on that line…
```

§0 rule 3 is quoted three times in this file: a gate that goes red on correct
code gets switched off. Fixing the `//` form and not the `/* */` form leaves the
rule half-applied, at a cost of one alternation.

**Fix:**

```js
const FOCUS_ROOT_LITERAL_RE =
  /=\s*"((?:[^"\\]|\\.)*)"\s*;?\s*(?:\/\/.*|\/\*(?:(?!\*\/)[\s\S])*\*\/\s*)?$/;
```

The capture group stays bounded by the same two quotes, so the argument at
`:1226-1235` — the literal read is byte-for-byte the literal — is unchanged.

### WR-04: the wrapper enumeration refuses on an editor backup file — `src/app/layout.tsx~` takes the entire suite to REFUSED

**File:** `scripts/verify-conversion.mjs:870-879` (`NON_ROUTE_WRAPPER_EXTENSIONS`), `:1076-1110` (the refusal)

**Issue:** the allow-list covers `.orig`, `.rej`, `.bak` — the artefacts of merge
conflicts and manual copies — but not the tilde backup that several editors
(emacs, gedit, some JetBrains configurations) write beside the file being edited,
and which is untracked, gitignored in most setups, and invisible to Next.
Measured:

```
$ cp src/app/layout.tsx 'src/app/layout.tsx~' && node scripts/verify-conversion.mjs
exit=2
FATAL: 1 file(s) under src/app are named as a wrapper …
```

`verify-all.mjs` reports that as `VERIFY_REFUSED` for all sixteen gates. This is
WR-06's exact shape — a correct/irrelevant file taking the suite to exit 2 —
reintroduced by an incomplete allow-list. `layout.json` refuses for the same
reason (verified, exit 2), though that name is far less likely.

**Fix:** the existing `rel.endsWith(ext)` mechanism already handles a suffix that
is not a dotted extension, so the entry is one line and does not weaken the
closed-list discipline the docblock insists on (`:857-864`):

```js
['~',     'an editor backup — the trailing-tilde form of .bak; Next resolves no route file at it'],
['.json', 'data — Next resolves no route file at .json'],
```

### WR-05: the dialog matcher's printed sentence still over-promises, in the WR-03 shape it was just widened to close

**File:** `scripts/verify-dialogs.mjs:525-536` (`LEFT_BOUNDARY` + `RUNG_FAMILY`), `:1001-1009` (the printed sentence)

**Issue:** the report now says *"a copy is seen at any rung **WRITTEN OUT** in the
class string — and only there"*, and names exactly two exclusions: a rung reached
through a variable, and a class string built by concatenation. A **negative**
rung is written out in the class string and is neither: `LEFT_BOUNDARY` is
`(?<![\w-])`, so the `-` of `-z-10` blocks the match. Tailwind supports negative
z-index utilities, so a nineteenth overlay written `fixed inset-0 -z-10` is
invisible to check B while the report asserts otherwise.

The delta is small in consequence — a modal at a negative rung would be behind
its own page — but it is the identical *class* of defect WR-03 was raised for
(the sentence promising a family the regex does not match), and both remedies
cost one token.

**Fix:** widen, matching the direction 41-18 chose (the tree contains no negative
rung, so the delta is a measured zero):

```js
new RegExp(LEFT_BOUNDARY + '-?' + RUNG_PREFIX + RUNG_FAMILY + RIGHT_BOUNDARY),
```

and add a sixth probe for the negative form — or, if the widening is judged
wrong, add "a negative rung" to the printed exclusions in the same commit.

---

## Info

### IN-01: `conversion-manifest.mjs` is in the review scope but carries no round-2 change

**File:** `scripts/conversion-manifest.mjs` (whole file)

**Issue:** the round-2 scope attributes 41-18 to *"`verify-dialogs.mjs` +
`conversion-manifest.mjs`"*; `git diff 0d1413f9..HEAD -- scripts/conversion-manifest.mjs`
is empty. The fence lists in the two files are byte-identical and the drift
refusal (`verify-dialogs.mjs:814-821`) holds, so nothing is wrong with the tree —
but a summary that names a file it did not touch is the kind of record this phase
elsewhere insists on getting right.

**Fix:** correct the attribution in `41-18-SUMMARY.md`; no code change.

### IN-02: a reconciliation gap on a run with refusals suppresses the "what they said" block the refusal text points readers at

**File:** `scripts/verify-all.mjs:513-533` (the `refuse(gap)` branch), `:537-567` ("what they said"), `:600-610` (the refused-branch text)

**Issue:** when `unaccounted` is non-empty and nothing failed, `refuse(gap)`
prints the FATAL and exits 2 immediately — before the block that reproduces the
stdout of every gate that did not pass. If any gate also REFUSED on that run, its
output is never printed, while the new refused-branch wording tells the reader
*"Its own output is reproduced above under 'what they said'"*. The position is
inherited rather than introduced by 41-22, but the new sentence makes the
omission actively misleading.

**Fix:** treat the pure-refusal gap the way the mixed case is already treated —
record it, let the report finish, and exit 2 from the verdict block instead of
from inside `refuse()`.

### IN-03: the printed "the count" block is arithmetic over the partition that produced it, next to the reconciliation that is not

**File:** `scripts/verify-all.mjs:458-473`

**Issue:** `accounted` is `results.length + NEEDS_SERVER.length +
absentOptional.length + absentRequired.length` — the identity 41-GAP-REVIEW.md
CR-01 measured, now demoted to display. The comment at `:477-480` says so, but
the block prints `package.json declares N` directly above `accounted for M` under
a rule line, which reads like a reconciliation to anyone who has not read the
comment. On a correct tree with an unregistered optional gate the two numbers
legitimately differ, so a reader may chase a non-difference.

**Fix:** label it — `the count (a display, not the check — the reconciliation is
below and compares verdicts)` — or move the two totals apart.

---

_Reviewed: 2026-08-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard, with executed mutation probes; tree restored, `git status --porcelain` and `git diff` clean_
