---
phase: 41-shared-primitives-three-tier-layout
reviewed: 2026-08-12T18:30:19Z
depth: standard
scope: gap closure only (plans 41-13 … 41-17), diff base e5bc216
files_reviewed: 5
files_reviewed_list:
  - src/components/ui/PageShell.tsx
  - scripts/verify-all.mjs
  - scripts/verify-touch-targets.mjs
  - scripts/verify-dialogs.mjs
  - scripts/verify-conversion.mjs
findings:
  critical: 2
  warning: 9
  info: 0
  total: 11
status: issues_found
---

# Phase 41 gap closure: Code Review Report

**Reviewed:** 2026-08-12T18:30:19Z
**Depth:** standard
**Files Reviewed:** 5
**Diff base:** `e5bc2161051ef62708057c906da426ba0d3a1a20..HEAD`
**Status:** issues_found

## Summary

Five files, four of them gates. Every gate was **run**, not only read; three
hypotheses were tested by asserted mutation on a temporary copy of the gate
(never on product source), and the tree was left byte-identical — `git status
--porcelain` on `scripts/` is empty and no file under `src/` was touched.

The product change (`PageShell.tsx`) is genuinely presentational: the diff is one
`className` string on the `focus` branch, hoisted to a constant. Nothing it
touches decides, submits or reports anything on `(auth)` or `/payment/callback`.
The one substantive claim in its docblock is false, but the conclusion it
supports happens to hold for a different reason (WR-07). The `env(safe-area-inset-bottom)`
that left with `--nav-inset-block-end` was checked and is **not** a regression:
`globals.css:452-455` already pads `body` by it.

The two Critical findings are both in the "a check that cannot fail" family, and
both are failures of the *gap closure itself* rather than of the phase:

- **CR-01** — `41-REVIEW.md` WR-03 said the aggregate's reconciliation was an
  identity. The fix was adopted verbatim from that review's suggested patch and
  **is still an identity**. Worse, the new docblock names a concrete triggering
  situation; I injected exactly that situation and the reconciliation did not
  fire. Half of WR-03 (the exit code) is closed; the half that matters is not.
- **CR-02** — check E was written to be "the check CR-01 did not have". It reads
  the `FOCUS_ROOT` constant and never asserts that the focus branch renders it.
  I reintroduced CR-01 in the branch's JSX, in memory, and ran E1's own
  predicates over the result: **GREEN**, on all four assertions.

Seven of the nine Warnings are in the gates; the remaining two are a false
statement in `PageShell`'s docblock and two wrong cross-file line citations.

## Structural Findings (fallow)

None supplied for this review.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `verify-all`'s reconciliation is still an identity, and its docblock names a trigger the code disproves

**File:** `scripts/verify-all.mjs:389-410` (the check), `:282-284` (the partition), `:85-113` (the claim)
**Severity:** BLOCKER

**Issue:** `41-REVIEW.md` WR-03 named two defects — the reconciliation could not
fail, and it would not change the exit code if it did. The gap closure adopted
WR-03's suggested patch verbatim. It closes the second defect (`refuse()` → exit
2) and **leaves the first open**.

`unaccounted` can never be non-empty on any input the earlier refusals permit:

```js
const absentRequired = plan.filter((p) => p.state !== "runnable" && !p.optional);   // :282
const absentOptional = plan.filter((p) => p.state !== "runnable" &&  p.optional);   // :283
const runnable       = plan.filter((p) => p.state === "runnable");                  // :284
```

The loop at `:268-280` pushes **exactly one** `plan` entry per `OFFLINE` row on
every path, and those three predicates are exhaustive over any value of `state`
(`=== "runnable"` versus `!== "runnable"`, crossed with `optional`). `results`
has one entry per `runnable` item. The refusal at `:230` already guarantees
`declared ⊆ knownNames`. Therefore
`measuredOrExplained ⊇ declared` always, and `unaccounted` is always `[]`.

The docblock at `:104-113` states the situation that would trip it: *"somebody
adds a fourth `state` to the `plan` partition below … and the three filters that
follow it (`runnable`, `absentOptional`, `absentRequired`) do not catch it,
because each of them tests for something specific."* Two of the three test for
`state !== "runnable"`, which catches every fourth state by construction.

**Tested, mutation asserted present before the result was read** (temporary copy
in `scripts/`, deleted; `git status` clean afterwards). I injected the exact
documented scenario — `state: "deferred"` for `verify:tokens`:

```
  verify:tokens — MISSING, and this is a failure, not an omission.
  VERIFY_FAIL — 1: verify:tokens (missing)        exit 1
```

The entry fell into `absentRequired`, exited **1** via the pre-existing MISSING
path, and the reconciliation never ran. Per `ai-engineering.md`, *gate un gate
deve poter fallire*: the written trigger is not reachable, so this is a
decoration that makes the aggregate look supervised.

**Fix:** make the partition non-exhaustive so a fourth state genuinely escapes,
which is the only change that turns the documented scenario into a real one:

```js
const ABSENT_STATES = new Set(["absent", "unregistered"]);
const absentRequired = plan.filter((p) => ABSENT_STATES.has(p.state) && !p.optional);
const absentOptional = plan.filter((p) => ABSENT_STATES.has(p.state) &&  p.optional);
const runnable       = plan.filter((p) => p.state === "runnable");
```

With that, a `state: "deferred"` row appears in none of the three, is dropped
between planning and reporting, and `unaccounted` fires with exit 2 — which is
what the docblock already claims happens. Re-run the same mutation and assert
the exit code moves from 1 to 2 before believing the fix.

---

### CR-02: check E asserts on the `FOCUS_ROOT` constant, never on the branch that renders — CR-01 can be reintroduced in the JSX and E stays green

**File:** `scripts/verify-conversion.mjs:1517-1588`; the unguarded site is `src/components/ui/PageShell.tsx:136`
**Severity:** BLOCKER

**Issue:** Check E1 is the whole justification for this plan (`:93-99`, *"the
check CR-01 did not have"*). It reads `FOCUS_ROOT`'s literal and asserts:

1. neither `--nav-inset-*` property appears **in the literal** (`:1577`);
2. the literal still declares a height and a centring (`:1578-1579`);
3. each property is still read **somewhere else in the shell** (`:1581-1588`).

Nothing asserts that the focus branch's `className` **is** `FOCUS_ROOT`. Add the
clearance back in the JSX and all three assertions are satisfied — assertion 3 is
not merely evaded, it is *fed* by the reintroduction, because the reintroduced
property counts as a read elsewhere.

**Tested.** I lifted E1's four predicates verbatim into a standalone script, ran
them over `PageShell.tsx` as shipped and over an in-memory mutation that leaves
`FOCUS_ROOT` untouched and rewrites line 136 to
`` className={`${FOCUS_ROOT} ps-[calc(var(--nav-inset-inline-start)+1.5rem)] pb-[calc(var(--nav-inset-block-end)+1rem)]`} ``
(mutation asserted present before the result was read; no file on disk was
modified):

```
as shipped                        -> GREEN  [inRoot=0 height=true centring=true dropped=0]
mutation asserted present at line 136
CR-01 reintroduced in the branch  -> GREEN  [inRoot=0 height=true centring=true dropped=0]
```

That is CR-01 restored in full — 248px of leading padding against 24px trailing
on `/login`, `/register`, `/set-password` and `/payment/callback` — under a green
E. The gate's own report would print `FOCUS_ROOT = "flex min-h-dvh items-center
justify-center p-6"` and a tick beside it.

Secondary, same block: `MIN_HEIGHT_RE`/`CENTRING_RE` (`:1531-1532`) are satisfied
by `min-h-0` and by `self-center`, neither of which produces the form assertion 2
exists to defend. That is a smaller hole in the same check, and it only matters
once the primary one is closed.

**Fix:** assert the branch, not only the constant. The cheapest version that
cannot be satisfied by a second class:

```js
// The focus branch must render the declared constant and nothing beside it.
const FOCUS_BRANCH_RE = new RegExp(`className=\\{${FOCUS_ROOT_IDENTIFIER}\\}`);
const branchUses = shellLines.filter((l) => FOCUS_BRANCH_RE.test(l));
if (branchUses.length !== 1) {
  refuse(
    `${SHELL_FILE} does not render ${FOCUS_ROOT_IDENTIFIER} as the whole of exactly one\n` +
      '       className. Check E asserts against that constant, so a focus root assembled\n' +
      '       from it plus anything else is a form this gate did not read. Nothing was measured.'
  );
}
```

Then prove it by mutation in both directions: the interpolation above must exit
non-zero, and the shipped tree must stay green.

---

## Warnings

### WR-01: check E's refusals fire after checks A–D have already failed, turning a FAILED run into a REFUSED one — and `verify-all` then prints "Nothing failed"

**File:** `scripts/verify-conversion.mjs:1540-1573` versus its own comment at `:1046`; the consequence is `scripts/verify-all.mjs:462-473`

**Issue:** The comment at `:1046` says check E's measurement is taken early *"so
its refusals precede every tick"*, and E2's refusals (`NAV_MODULES`, the layout
extension guard, `layoutClosure`) honour that — they all sit between `:928` and
`:1122`. **E1's three refusals do not.** They are at `:1540`, `:1551` and
`:1563`, after checks A, B, C and D have printed their verdicts and pushed into
`failures`.

So a run in which check A genuinely fails *and* `FOCUS_ROOT` cannot be read exits
**2**, not 1. In the aggregate that is `REFUSED`, and `verify-all.mjs:469` then
prints, in the file's own words:

> `Nothing failed. But a refusal is not a pass: those gates measured NOTHING`

Both halves of that sentence are false for such a run. The failing detail is
still echoed under "what they said", so it is recoverable by a careful reader —
but the summary line asserts the opposite of the truth, which is the shape
`meta-gates.md` calls a silent failure with a neutral face.

**Tested.** A temporary copy with `FOCUS_ROOT_IDENTIFIER` renamed (mutation
asserted present; copy deleted) produced:

```
  ✓ A  no raw palette utility in 53 file(s) …
  ✓ B  no legacy token utility in 53 file(s) …
  ✓ C  15 of 15 published export(s) …
  ✓ D  the shell declares §4's three maxima …
FATAL: src/components/ui/PageShell.tsx declares no FOCUS_ROOT_RENAMED …     exit 2
```

Four verdicts emitted, then exit 2. Had any of them been `✗`, it would have been
laundered into a refusal.

**Fix:** hoist E1's read to sit beside E2's measurement, before check A prints:

```js
/* ── check E1's read, taken with E2's so every refusal precedes every tick ── */
const { focusRoot, focusRootLineNo } = readFocusRoot();   // all three refusals inside
```

and leave only the *comparisons* down at `:1590`. Alternatively — and this is
worth doing regardless — make the verdict block honour a mixed outcome: if
`failures.length > 0` at the moment a refusal is raised, exit 1 and say both
things. A failure must not be able to hide behind a refusal in either direction.

---

### WR-02: a `REMAINING` entry that falls behind the Phase 42 fence is reported STALE — "converted; remove this entry" — and silently shrinks the debt count

**File:** `scripts/verify-dialogs.mjs:879-901`, report at `:930-934` and `:970-981`

**Issue:** Check B skips fenced files before measuring:

```js
const behind = fenceMatch(file);
if (behind) { fenced.set(file, behind.glob); continue; }   // :882-885
```

`stale` is then computed as *exists on disk but not in `measuredShells`*
(`:895-901`). A `REMAINING` path that matched the fence satisfies both, so the
gate prints

> `! B  1 REMAINING entr(y/ies) are STALE — the file no longer carries a shell:`
> `     … → converted; remove this entry`

for a file it never opened, and `REMAINING = measuredShells.size` at `:934` drops
by one. That is a debt counter going down because the gate stopped looking —
precisely the "counter that reaches zero while the thing it tracks is still
present" shape this phase has already paid for once.

Zero overlap today (verified: the only file behind the fence carrying an overlay
line is `src/components/scanner/ScanFlash.tsx:135`, correctly not on the list),
so this is latent, not live. It becomes live the moment Phase 42 moves or adds a
dialog under `src/components/scanner/**` or `src/app/(admin)/door/**`.

**Fix:** make the overlap a refusal, since the two lists cannot both be right
about the same file:

```js
const fencedRemaining = [...declaredPaths.keys()].filter((p) => fenceMatch(p) !== null);
if (fencedRemaining.length > 0) {
  refuse(
    `${fencedRemaining.length} REMAINING entr(y/ies) fall behind the Phase 42 fence:\n       ` +
      fencedRemaining.join('\n       ') +
      '\n\n       A fenced path is UNMEASURED, so this gate cannot tell a paid debt from one it\n' +
      '       simply did not open — and it would report the second as the first. Either the\n' +
      '       entry leaves REMAINING as a declared decision, or the fence does. Nothing was\n' +
      '       measured.'
  );
}
```

---

### WR-03: the widened rung family still misses single-digit and keyword rungs, while the report asserts "a copy at any rung is seen"

**File:** `scripts/verify-dialogs.mjs:486` (the family), `:911-915` (the claim)

**Issue:**

```js
const RUNG_FAMILY = '(?:' + '\\d{2,}' + '|' + '\\[\\d+\\]' + ')';
```

`z-0` … `z-9` and `z-auto` are real Tailwind utilities and none of them matches.
A nineteenth hand-rolled overlay written `fixed inset-0 z-0` — or `z-auto`, which
is what a stacking-context-relative overlay would plausibly carry — is invisible
to check B exactly as `z-50` was before this change. The report prints, on every
run:

> `The rung is matched as a FAMILY, so a copy at any rung is seen`

which is stronger than the matcher. The docblock at `:485` is accurate
(*"Two-or-more digits, or an arbitrary bracketed integer"*); the sentence a
reader actually meets is not. This repository's own standard is that the printed
line is what gets believed.

**Fix:** either widen to the whole family and re-reconcile the count against 14 —

```js
const RUNG_FAMILY = '(?:' + '\\d+' + '|' + 'auto' + '|' + '\\[[^\\]\\s]+\\]' + ')';
```

— re-running and confirming `REMAINING = 14` holds (any delta is a copy the
matcher was missing and belongs on the list with its reason), or leave the family
as it is and change the printed sentence to name the two shapes it does **not**
see. Do not leave the claim wider than the regex.

---

### WR-04: `MATCHER_PROBES.expected` is dead, and duplicates the assertion it looks like it carries

**File:** `scripts/verify-dialogs.mjs:515-535` (declaration), `:775-780` (use)

**Issue:** Each probe declares both `verdict: 'match' | 'no match'` and
`expected: true | false`. Only `verdict` is read:

```js
const probeDisagreements = probeRows.filter((row) => row.measured !== row.verdict);   // :780
```

`expected` is never referenced anywhere in the file. A reader — and the next
person editing a probe — will reasonably take the boolean for the assertion,
flip it, see the run stay green, and conclude the probe passed. Two fields for
one truth with no link between them is the same drift this file's own header
argues against when it refuses to re-type a command it can read from
`package.json`.

**Fix:** delete `expected` and keep `verdict` as the single source, or derive one
from the other at construction:

```js
const probe = (verdict, label, line) => ({ verdict, label, line });
```

---

### WR-05: the layout enumeration is careful about extensions and blind to `template.tsx`, which wraps a page in the same position

**File:** `scripts/verify-conversion.mjs:947-971` (the extension refusal), `:1086-1102` (the climb)

**Issue:** The gate refuses when it meets a `layout.*` basename carrying an
untested extension, and the reason it gives is exactly right: *"a walk that skips
one reports those surfaces as navigation-free — which is a narrowing in the
direction that prints a tick"* (`:965-967`).

Next renders `template.tsx` — and, for parallel routes, `default.tsx` — around a
page in the same position a layout occupies. Neither basename is enumerated,
neither is refused on. A `src/app/(auth)/template.tsx` that mounted a navigation
module would leave all four focus surfaces reported navigation-free, E2 would
find agreement, and the tick would be printed. That is the green-producing
direction the surrounding code is built to refuse, reached through a filename the
filter does not know.

Zero such files today (`find src/app -name "template.*" -o -name "default.*"`
returns nothing), so this is latent.

**Fix:** enumerate the wrappers rather than one of them —

```js
const WRAPPER_BASENAMES = ['layout.', 'template.'];   // default.* too, if parallel routes arrive
```

— and climb them together in `ancestorLayoutFiles`, keeping the same
untested-extension refusal over the whole set. Searching more wrappers can only
make the gate *more* likely to find a navigation, which is the safe direction and
the one `:1082-1084` already argues for.

---

### WR-06: two false-refusal surfaces on correct code

**File:** `scripts/verify-conversion.mjs:952-971` and `:1527` / `:1563-1573`

**Issue:** §0 rule 3 is quoted three times in these files: a gate that goes red
on correct code gets switched off. Two shapes of *correct* file now take the
whole conversion gate to exit 2 — and through `verify-all` that becomes
`VERIFY_REFUSED` for the entire suite:

1. **Any basename under `src/app` beginning `layout.` with an extension outside
   the four.** `src/app/layout.module.css` is the standard Next name for a
   layout's CSS module; `layout.tsx.orig` is what a merge conflict leaves behind.
   Neither is a route file, both refuse.
2. **A trailing comment on the `FOCUS_ROOT` line.** `FOCUS_ROOT_LITERAL_RE`
   (`:1527`) anchors the closing quote to end-of-line, and the line-shape comment
   stripper does not remove a trailing `//`. So
   `const FOCUS_ROOT = "…"; // §4's focus form` refuses with *"not as a
   double-quoted literal closing on that line"*.

Neither is a defect in the tree; both stop the measurement.

**Fix:** for (1), filter the enumeration to basenames that could be route files
before refusing — a known non-code extension (`.css`, `.scss`, `.md`, `.orig`,
`.bak`) is not a layout Next would resolve, and the refusal should be reserved
for an extension that plausibly is one. For (2), strip a trailing `//` comment
from the line before matching, or relax the anchor to `\s*;?\s*(?:\/\/.*)?$`.

---

### WR-07: `PageShell`'s docblock says the root layout does not cover `(auth)` or `(public)/payment` — it does

**File:** `src/components/ui/PageShell.tsx:26-29`

**Issue:** The census that justifies the whole reversal reads:

> *"only two route layouts exist in the tree, the root one and `(work)`'s, and
> neither covers `(auth)` or `(public)/payment`."*

`src/app/layout.tsx` is the **root layout**. In the App Router it wraps every
route in the application, route groups included — `(auth)/login`,
`(auth)/register`, `(auth)/set-password` and `(public)/payment/callback` are all
inside it. The gate's own report agrees with me and not with the docblock: it
lists `src/app/layout.tsx` as an ancestor layout of all eight surfaces and then
finds no navigation module in its closure.

The **conclusion** — the four focus routes mount no navigation — is correct, for
a different reason: the root layout mounts `MotionProvider` and `ToastProvider`
and no navigation (`src/app/layout.tsx:1-6`). The stated reason is not. A
docblock written expressly so *"a decision undone without its measurement reads
as a slip to the next person"* should not carry a false fact as its measurement,
and the next person adding a nav to the root layout will read this paragraph and
believe it does not apply to them.

**Fix:**

```
 *     …§4's focus list is closed at four routes — `/login`, `/register`,
 *     `/set-password`, `/payment/callback` — and **not one of them mounts a
 *     navigation**: two route layouts wrap them, `src/app/layout.tsx` (which
 *     wraps every route and mounts only the motion and toast providers) and
 *     `(work)`'s (which mounts `AppNav` and covers none of the four). So the
 *     focus form reserves nothing.
```

---

### WR-08: two cross-file line citations added by this diff point at the wrong lines

**File:** `scripts/verify-dialogs.mjs:367` and `:417`

**Issue:**

| citation | points at | actually at |
|---|---|---|
| `verify-touch-targets.mjs:499` for `PHASE_42_EXEMPT_PATHS` | `const cached = importMapCache.get(relPath);` | `:557` |
| `verify-touch-targets.mjs:863-880` for `globToRegExp` | the middle of `endOfOpeningTag` | `:1046-1063` |

Both were introduced by this diff. In a repository whose verification gate
requires `file:riga` evidence and whose `ai-engineering.md` treats an unverified
derived citation as a hallucination with an extra step, a wrong line number in a
gate's own docblock is the cheapest possible defect to avoid and the most likely
to be copied forward.

**Fix:** cite the symbol rather than the line —
``(`verify-touch-targets.mjs`, `PHASE_42_EXEMPT_PATHS`)`` — which is what the
2a list already does for its own entries, and for the same reason it gives there:
*"a line number drifts on the first edit above it and a stale one reads exactly
like a current one."*

---

### WR-09: `verify-touch-targets` reports `found ≠ measured + exempt` with no column for the difference

**File:** `scripts/verify-touch-targets.mjs:1325`, `:1340`, table at `:1422-1449`, surface roll-up at `:1458-1476`

**Issue:** `row.skipped` is incremented for a component whose import does not
agree with the declared primitive (`:1337-1341`) and is **printed nowhere**. The
per-file table prints `found · meas · e2a · e2b · e3 · e4 · e5 · e6`; the surface
roll-up sums only the six exemptions. On the live run:

```
src/emails/account-invitation.tsx    1     0    0    0   0   0   0   0
src/emails/member-approved.tsx       1     0    0    0   0   0   0   0
src/emails/member-reactivated.tsx    1     0    0    0   0   0   0   0
…
/admin/members    26 file(s) reached,  34 element(s) found,   3 measured,  28 exempt
```

`3 + 28 = 31`, not 34. Three elements are counted as found and then vanish, and a
reader has no column that explains where. This predates the gap diff, but the
diff rewrites the 2a report section around the sentence *"a green must state what
it forgave"* — and three elements silently dropped is the same claim failing in
the adjacent table.

**Fix:** print the column, and label it for what it is:

```js
'skip'.padStart(6)   // a same-named component from another module — an email's
                     // Button is not this product's Button; out of §13's set
```

---

_Reviewed: 2026-08-12T18:30:19Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard — every gate executed; CR-01, CR-02 and WR-01 proven by asserted mutation on temporary copies, never on product source; tree left byte-identical_
