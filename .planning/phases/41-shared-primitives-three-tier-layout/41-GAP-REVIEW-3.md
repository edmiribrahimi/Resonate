---
phase: 41-shared-primitives-three-tier-layout
reviewed: 2026-08-13T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - scripts/verify-conversion.mjs
  - scripts/verify-dialogs.mjs
findings:
  critical: 3
  warning: 6
  info: 0
  total: 9
status: issues_found
---

# Phase 41 — Round-3 Gap Closure: Code Review Report

**Reviewed:** 2026-08-13
**Depth:** standard (every finding below was produced by executing a mutation, not by reading)
**Files Reviewed:** 2
**Diff base:** `8cc8cc0a..HEAD`
**Status:** issues_found

## Summary

The round-3 scope asked one question: **the CR-01 guard has been declared closed and
found open twice — does round 3 close it?**

**No. It is open a third time, by two independent paths, and both of them reproduce
the exact signature of the first two rounds: the reintroduced line is counted as
*evidence for* the assertion meant to catch it.**

Round 1 asserted on the `FOCUS_ROOT` constant, and the defect moved to the render
site. Round 2 asserted on the outer element, and it moved to the inner element.
Round 3 asserts on the *branch as a region* — so the defect moved to **the shape of
the branch**, which the region derivation cannot bound, and to **the shape of the
declaration**, which the newly relaxed literal anchor now truncates.

Everything below was measured by patching `src/components/ui/PageShell.tsx` (and, for
the dialogs half, a disposable `scripts/verify-dialogs.probe.mjs`), running the gate,
and reverting. **`git status --porcelain` shows only the two pre-existing untracked
planning directories; `git diff` is empty; both gates exit 0 on the restored tree.**

### The mutation matrix, verbatim results

| # | Mutation on `PageShell.tsx` | Expected | Measured |
|---|---|---|---|
| A | nav property appended to the **outer** element's class | ✗ E | **exit 2** — refusal, not a red (see WR-03) |
| B | nav property on the **inner** element (round 2's defect) | ✗ E | **exit 1**, `✗ E`, region 151–157 — **correct** |
| C | nav property on a **newly inserted third element** in the branch | ✗ E | **exit 1**, `✗ E`, region 151–159 — **correct** |
| D | same branch, brace-less `if` + multi-line `return`, defect on the inner element | ✗ E | **exit 0, `✓ E`, `CONVERSION_OK`** ← CR-01 |
| G | same brace-less refactor, **no defect** (control) | ✓ E | exit 0 — so nothing warns on the refactor itself |
| H | branch written as a **ternary**, defect on the inner element | refusal or ✗ E | **exit 0, `✓ E`, `CONVERSION_OK`** ← CR-01 |
| J | lone `}` inside a string on the outer element line, defect below it | ✗ E | **exit 0, `✓ E`, `CONVERSION_OK`** ← CR-01 |
| K | defect moved into a `style={{}}` attribute over 12 lines | ✗ E | exit 1, `✗ E`, region 151–162 — **correct** |
| — | `FOCUS_ROOT` = literal `/* c */ + " ps-[var(--nav-inset-inline-start)]"` | refusal | **exit 0, `✓ E`, `CONVERSION_OK`** ← CR-01 |

**What round 3 did close, proven the same way:** the inner-element and
inserted-element reintroductions (B, C, K) are now red, `NEVER_MEASURED_BY_B` really
does refuse when the primitive or the exemption is put on `REMAINING` (both probed,
both `FATAL`), the negative-rung widening matches, and the header's three measured
numbers (`1724`, `24` / `1839`, `1042`) re-measure correctly today.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: the focus-branch region is bounded by brace balance, so a brace-less `if` or a ternary truncates it to the outer element's opening tag — and CR-01 goes green

**File:** `scripts/verify-conversion.mjs:1498-1524` (the balance loop and the
`focusBranchOpened` flag), report at `:2076-2082`

**Issue:** The region runs from the opener until `focusBranchBalance <= 0` **after
`focusBranchOpened` has been set**, and `focusBranchOpened` is set by *any* brace that
takes the balance above zero — including a JSX expression brace, not only a block
brace. On the current source the opener line carries the block `{`, so the balance
does not return to zero until line 157 and the region is the whole branch. Remove the
block braces — which is legal JS, ESLint-default clean, and stable under Prettier —
and the first `className={…}` on the outer element opens and closes the balance on its
own line:

```
151  if (width === "focus")
152    return (
153      <div className={FOCUS_ROOT}>          ← balance 0→1→0 : region ENDS here
154        <div className={`w-full max-w-sm pb-[calc(var(--nav-inset-block-end)+1rem)] …
```

Measured (case D), verbatim from the run:

```
      the focus branch, src/components/ui/PageShell.tsx:151-153   (3 line(s), bounded by brace balance)
          close   153 : <div className={FOCUS_ROOT}>
          navigation propert(y/ies) found inside the region: 0
          --nav-inset-block-end      — outside the focus branch: read at line(s) 154, 163
  ✓ E  no line of the focus branch (3, at src/components/ui/PageShell.tsx:151-153)
  CONVERSION_OK — all five checks passed
```

Read line 3 of that block: **`154` — the reintroduced defect line — is listed as
evidence that "the shell still reads both properties elsewhere".** This is byte-for-byte
the GAP-CR-02 signature the round-3 docblock at `:2084-2097` says the region exclusion
closed. The exclusion is keyed on the region, and the region no longer contains the
defect.

Case H (ternary) is the same outcome with a 2-line region. Case J shows a third
trigger with the block braces intact: any `}` inside a **string** on the outer element
line (`aria-label={"}"}`) decrements the naive character count and ends the region
early, again green.

Case G proves this is silent: the identical brace-less refactor **without** a defect
also exits 0, so nothing tells the author the gate just stopped reading nine tenths of
the branch. The only visible signal is the `(3 line(s))` in the report — a number no
reader has a baseline for.

**Fix:** bound the region by the *statement*, not by raw character balance. Two
options, either sufficient:

1. Anchor the end on the **render site** rather than on balance, and take the region
   as the JSX element containing it: derive `end` by balancing `<`/`</` tag depth from
   `focusRootRenderLineNo`, and refuse if `end` is the same line as `start` while the
   branch has more lines.
2. Keep the balance, but (a) require the opener line itself to open a block —
   `focusBranchOpened` must be set by a brace **on the opener line**, not by any brace
   downstream — and (b) refuse when the derived region's last line is not a line whose
   trimmed text closes a block/JSX element. Both cases D and H would then refuse
   rather than pass, which is the documented intent.

Whichever is chosen, add a **third guard that does not depend on the region at all**:
the property may not appear anywhere between the opener and the *next* branch — e.g.
assert that every line from `focusBranchStart` to the line before the default
`return (` carries neither property. On the current file that is lines 151–158 and it
is invariant under all four shapes probed above.

Additionally, ignore braces inside string and template literals when counting (case J).

---

### CR-02: `FOCUS_ROOT_LITERAL_RE`'s relaxed tail accepts a **concatenation** whose second operand is hidden behind a block comment, reads the fragment, and prints it as the whole literal

**File:** `scripts/verify-conversion.mjs:1332`

**Issue:** The round-3 relaxation appended `(?:\/\/.*|\/\*[\s\S]*)?$` to the tail. The
docblock at `:1309-1330` asserts two things about it:

> *"a concatenation, a literal continuing onto the next line, a single-quoted literal
> and a backtick literal all still refuse"* … *"the literal read is byte-for-byte the
> literal, comment or no comment"*

**Both are false.** `\/\*[\s\S]*` consumes *everything* after a `/*`, including a `+`
and a second string literal. Probed directly against the regex:

| declaration | result |
|---|---|
| `= "flex p-6" + " ps-[var(--nav…)]";` | REFUSE (as documented) |
| `= "flex p-6" /* x */ + " ps-[var(--nav…)]";` | **READ = `"flex p-6"`** |
| `= "flex p-6"; const OTHER = "ps-[var(--nav…)]";` | **READ = `"ps-[var(--nav-inset-inline-start)]"`** (the wrong declaration) |

End-to-end on the real shell, with the concatenation form substituted at
`PageShell.tsx:125`:

```
          FOCUS_ROOT = "flex min-h-dvh items-center justify-center p-6"
  ✓ E  no line of the focus branch (7, at src/components/ui/PageShell.tsx:151-157)
  CONVERSION_OK — all five checks passed
```

The gate exits 0 **and prints a value that is not the value**, so a reader auditing the
report sees a clean literal that the browser never receives. This is precisely the
failure the refusal at `:1363-1373` exists to prevent — *"Asserting that a navigation
property is absent from a FRAGMENT of the focus root is how a check goes green on a
defect it never saw"* — reached through the tail that was widened to stop reddening
correct code.

**Fix:** the tail must be a *comment*, not a wildcard. Replace

```js
/=\s*"((?:[^"\\]|\\.)*)"\s*;?\s*(?:\/\/.*|\/\*[\s\S]*)?$/
```

with a tail that requires the comment to be the only remaining content and forbids an
operator before it:

```js
/=\s*"((?:[^"\\]|\\.)*)"\s*;?\s*(?:\/\/[^\n]*|\/\*(?:(?!\*\/)[\s\S])*(?:\*\/\s*;?\s*)?)?$/
```

and, separately, assert that the matched declaration is the **only** `=` on the line
(or that `focusRootDeclarations[0].text` contains exactly one double-quoted literal) so
the two-declarations-on-one-line case refuses instead of reading the second. The
docblock's "one or the other, not both" reasoning against a stripper stands — the fix
is in the tail, not a second transformation.

---

### CR-03: `verify-dialogs` — a `REMAINING` entry that is on disk but **outside the walk** is reported "converted", `REMAINING` falls by one, and the run exits 0

**File:** `scripts/verify-dialogs.mjs:957-989` (the refusal), `:1109-1135` (the loop and
`stale`)

**Issue:** Round 3's docblock at `:366-375` asserts:

> *"So there is now ONE list. Check B's loop reads it, and the refusal is keyed on it:
> the set that decides what is skipped IS the set the refusal is keyed on, and the two
> cannot drift apart by an edit to either."*

The set that decides what check B measures is `files ∖ (NEVER_MEASURED_BY_B ∪ fence)`,
and `files` is `listScannableFiles(SRC_DIR)` — a walk restricted to `src/` and to six
extensions. **A third skip mechanism exists — not being in `files` at all — and
`neverOpenedReason()` is not keyed on it.** `stale` is still computed as *on disk and
not in `measuredShells`*, so the identical wrong report returns.

Measured, with one probe entry `'src/app/globals.css'` (on disk, real, never walked)
added to `REMAINING` on a disposable copy:

```
      REMAINING entries declared      : 15
      REMAINING = 14
  ✓ B  every one of the 14 file(s) still declaring a shell is on REMAINING,
  ! B  1 REMAINING entr(y/ies) are STALE — the file no longer carries a shell:
       src/app/globals.css  → converted; remove this entry
  DIALOGS_OK — all three checks passed. REMAINING = 14
```

Exit 0, a debt counter that fell because the gate stopped looking, and a printed claim
that a file was *converted* which the gate never opened. That is WR-01 and WR-02 of the
previous two rounds, third occurrence, in the one category this round did not add to
the set. Any `REMAINING` path outside `src/`, or carrying an extension the walk does not
scan (`.mdx`, `.astro`, a path typo landing on a real non-`.tsx` file), reaches it.

**Fix:** key the refusal on the walk, not on the two exclusion lists. After `files` is
built and before check B's loop:

```js
const walked = new Set(files);
function neverOpenedReason(path) {
  const skip = NEVER_MEASURED_BY_B.get(path);
  if (skip) return `${skip.kind}\n         ${skip.reason}`;
  const behind = fenceMatch(path);
  if (behind) return `fenced — behind ${behind.glob}; a SCOPE BOUNDARY …`;
  if (!walked.has(path)) {
    return 'NOT IN THE WALK — under src/ with a scanned extension is what the walk\n' +
           `         covers (${SCANNED_EXTENSIONS.join(', ')}); this path is not, so check B\n` +
           '         never opened it and cannot tell a paid debt from an unread one';
  }
  return null;
}
```

This requires moving the block below `const files = listScannableFiles(SRC_DIR)` (it
already is) and keeps the per-entry reason the docblock insists on. It also makes the
docblock's "ONE list" claim true rather than aspirational.

---

## Warnings

### WR-01: the "opener that does not open a block" refusal does not fire on the ternary its own message names

**File:** `scripts/verify-conversion.mjs:1513-1524`, claim at `:1450-1453` and `:1518-1520`

**Issue:** The refusal's message says it exists because *"Deriving a one-line region
here and asserting over it would assert almost nothing while printing a tick — the
shape a ternary would take"*. Measured (case H): a ternary derives a **two-line region
and prints a tick**; the refusal does not fire, because `focusBranchOpened` is set by
the JSX expression brace on the render line. The refusal *is* reachable — probed
positively, with the branch rendering a pre-built variable so that no `{` exists from
the opener to EOF, giving `FATAL: …:152 compares the width against the focus form, but
that line opens no block` — but only in a shape where the branch renders nothing
inline, which is not the shape it names. It is therefore a live branch guarding a case
that cannot occur alongside the other refusals, while the case it advertises passes
green.

**Fix:** fold into CR-01's fix 2(a): require the block to be opened **on the opener
line**. The refusal then fires on exactly the shapes it claims to.

### WR-02: the rung family is narrower than the sentence it prints — Tailwind v4's `z-(--var)` shorthand is a rung *written out* and is invisible

**File:** `scripts/verify-dialogs.mjs:622` (`RUNG_FAMILY`), printed claim at `:1146-1155`

**Issue:** The report promises *"a copy is seen at any rung WRITTEN OUT in the class
string — and only there. TWO SHAPES IT STILL DOES NOT SEE: a rung reached through a
VARIABLE, and a class string assembled by CONCATENATION; this script reads lines, it
does not build them."* `tailwindcss` is `^4` in `package.json`, and v4 accepts the
CSS-variable shorthand `z-(--nav-z)` as a first-class utility. It is written out in the
class string, it is neither of the two named exclusions ("it does not build them" glosses
both as JS-side), and the matcher misses it. Probed:

```
MATCH   z-[60]      MATCH  z-50      MATCH  -z-10      MATCH  z-auto
MISS    z-(--nav-z)                  MISS   md:z-(--nav-z)
```

This is the third occurrence of the WR-03/WR-05 shape — a matcher narrower than its own
printed sentence. **The delta on this tree is a measured zero:** `grep -rhoE
'[a-z-]+-\(--[a-z-]+\)' src` returns 0 occurrences, so nothing is hidden today.

**Fix:** add the shorthand to the family and a seventh probe, keeping the same
assembled-from-parts construction:

```js
const RUNG_FAMILY = '(?:' + '\\d+' + '|' + 'auto' + '|' + '\\[[^\\]\\s]+\\]' +
                    '|' + '\\((?:--)[^)\\s]+\\)' + ')';
```

Or narrow the printed sentence to name a third exclusion. Widening is the cheaper of
the two here, since the measured cost is zero.

### WR-03: the most obvious CR-01 reintroduction — the property on the **outer** element — yields exit 2, which takes the whole sixteen-gate suite to `VERIFY_REFUSED`, not a red on E

**File:** `scripts/verify-conversion.mjs:1396-1422`

**Issue:** Case A appended the property by turning `className={FOCUS_ROOT}` into
`` className={`${FOCUS_ROOT} ps-[var(--nav-inset-inline-start)]`} `` — the single most
likely shape a reintroduction takes, since it is what a developer writes to "add one
class". `FOCUS_BRANCH_RE` then matches zero times and the gate exits 2. The FATAL is
legible and the behaviour is deliberate (`:1408-1419`), so this is not a silent pass —
but through `verify-all.mjs` a genuine CR-01 regression is delivered as *"nothing was
measured"* for all sixteen gates, which is the same reader-facing outcome round 3 spent
an entire item (the trailing-tilde allow-list, `:915-932`) removing for a stray editor
backup file. A real defect deserves the stronger signal, not the weaker one.

**Fix:** when the count is 0 **and** the branch region does contain a navigation
property, fail check E instead of refusing — the measurement did happen, and the
refusal's own rule ("a measurement that happened outranks one that did not",
`:337-341`) already says which verdict wins. Keep the refusal for the count > 1 case
and for count 0 with a clean branch.

### WR-04: the `FULL_BLEED_VIEWER` exemption's premise is never asserted, while the identical premise for a `REMAINING` entry is

**File:** `scripts/verify-dialogs.mjs:394-411`, report at `:1171-1174`

**Issue:** A `REMAINING` entry whose file stops carrying a shell gets a loud `! B …
STALE` notice, on the stated reasoning that *"an entry left behind is a gate quietly
loosened"*. The exemption gets nothing: `NEVER_MEASURED_BY_B` skips
`src/components/media/Lightbox.tsx` before `shellShapes()` runs, so the gate never
verifies the docblock's own claim that it *"still carries a native shell"*
(`Lightbox.tsx:82` — I confirmed it does, by grep, which is exactly the point: the gate
did not). If the viewer converts, or is deleted, the exemption goes quiet with no
notice and no on-disk check — the same proxy-goes-quiet family as CR-03.

**Fix:** open the exempt file, do not skip it: measure `shellShapes()` for it, exclude
it from `undeclared`, and print a STALE-equivalent notice when a permanently exempt
file no longer carries the shape the exemption was written about. Add an `existsSync`
refusal for exempt paths, matching what `NAV_MODULES` already does in
`verify-conversion.mjs:1119-1132`.

### WR-05: the header's three measured line numbers are correct today but nothing re-measures them — still a trap, not self-correcting

**File:** `scripts/verify-conversion.mjs:259-289`

**Issue:** I re-ran the header's own commands: first `failures.push(` at **1724**, 24
`refuse(` call sites, exactly one below 1724 at **1839**, `ORPHANS_DECLARED` at **1042**
and empty. All four match. But 41-25 records these going stale twice as lines were added
above them, and nothing mechanical checks them — the mitigation is a paragraph asking
the next reader to re-measure. The claim they support ("no refusal in this file can fire
after a failure on this tree today") is *derived* from the numbers, so a stale number
silently turns a measured statement into an unmeasured one, in a header the whole file
family treats as evidence. **Judgement: still a trap.**

**Fix:** compute the claim instead of documenting it. `refuse()` already knows
`failures.length`; add a one-line run-time assertion at the top of the verdict block —
`if (ORPHANS_DECLARED.length === 0 && …)` is not needed at all if the header simply
states the *invariant* (`refuse()` exits 1 when `failures` is non-empty) and drops the
line-number arithmetic, which is what the invariant makes unnecessary.

### WR-06: `FOCUS_ROOT_LITERAL_RE` reads the *second* declaration when two sit on one line

**File:** `scripts/verify-conversion.mjs:1332`

**Issue:** Probed: `const FOCUS_ROOT = "flex p-6"; const OTHER = "ps-[var(--nav-inset-inline-start)]";`
is read as `"ps-[var(--nav-inset-inline-start)]"`. The regex is unanchored at its head,
so on failure at the first `=` the engine retries at the next one. Here the direction is
a *false red* rather than a green (the gate would report CR-01 present when it is not),
which is the milder failure — but it is the same unanchored head that CR-02 exploits in
the other direction, and it makes the printed `FOCUS_ROOT = "…"` line untrustworthy as
evidence either way.

**Fix:** covered by CR-02's fix — anchor the head to the declaration keyword already
matched by `FOCUS_ROOT_DECL_RE`, e.g. build the literal regex from
`FOCUS_ROOT_IDENTIFIER` so the `=` it matches is provably the identifier's own.

---

## Verification of this review

- Every finding above was produced by patching a disposable copy and **running** the
  gate; none was derived by reading alone.
- `src/components/ui/PageShell.tsx` was restored with `git checkout --` after each
  mutation; the two probe copies of `verify-dialogs.mjs` were deleted.
- Final state: `git diff` empty; `git status --porcelain` shows only the two untracked
  planning directories that pre-dated this review; `node scripts/verify-conversion.mjs`
  exits 0 and `node scripts/verify-dialogs.mjs` exits 0.
- Standing traps respected: check E reads `s.reached` (`:1637`), not `scanned`; both
  dialogs probes kept `PHASE_42_EXEMPT_PATHS` in sync with the manifest so the drift
  refusal could not fire for the wrong reason.
- Known-and-left-open items (`MIN_HEIGHT_RE` / `CENTRING_RE`, the `.json` allow-list
  form) were re-checked and are **not worse than described**; they are not re-filed.
- No product behaviour was changed by either file; both are dev tooling and neither
  touches `src/`.

---

_Reviewed: 2026-08-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard, with executed mutation probes_
