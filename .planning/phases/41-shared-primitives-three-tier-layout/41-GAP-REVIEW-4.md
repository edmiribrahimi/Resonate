---
phase: 41-shared-primitives-three-tier-layout
reviewed: 2026-08-13T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - scripts/verify-conversion.mjs
  - scripts/verify-dialogs.mjs
findings:
  critical: 4
  warning: 3
  info: 1
  total: 8
status: issues_found
---

# Phase 41: Code Review Report — round 4 gap closure (41-26, 41-27, 41-28)

**Reviewed:** 2026-08-13
**Depth:** standard, scoped to `git diff 5fe7448..HEAD` over the two gates
**Files Reviewed:** 2
**Status:** issues_found

## Summary

**Round 4 does not close it. The defect has moved a sixth time, and it moved into
the mechanism round 4 added.**

Every finding below was produced by patching a disposable copy of the tree and
running the gate — never by reading. The sandbox was
`scripts/` + `src/` + `tsconfig.json` copied out of the repo, with `node_modules`,
`public/`, `supabase/` and `.claude/` symlinked in; it reproduces the shipped
green (`CONVERSION_OK`, `DIALOGS_OK`, and `verify-all.mjs` with only the
environmental `verify:persona` red) before any mutation. The repository itself
was never modified: `git status --porcelain` is byte-identical to the state at
the start of this review.

The headline: **`SHELL_CODE_OUTSIDE_WINDOW_DIGEST` is not a digest of the
shell's live code.** It is a digest of the shell's live code *as `liveLines()`
sees it*, and `liveLines()` blanks any line whose trimmed text *starts* with a
comment opener — including the closed one-line JSX form `{/* … */}`, which is
idiomatic JSX and can be followed by arbitrary live code on the same line. One
such line reintroduces CR-01 on all four focus routes with the frozen window
byte-identical, the focus root byte-identical, `found outside the permitted set:
0`, the digest **unchanged**, `✓ E`, `CONVERSION_OK`, exit 0 — and a clean
`tsc --noEmit`. That is the sixth escape, and it is one token wide.

The same blind spot defeats check A of `verify-conversion.mjs` and check B of
`verify-dialogs.mjs`, both proven with controls. Both files' headers state an
error-direction claim about this stripper that is false on the code it
describes — the third time this file family has carried a false docblock claim
(cf. `CR-03` in `verify-dialogs.mjs:375-380`, `FOCUS_ROOT_LITERAL_RE`'s recorded
false sentence at `verify-conversion.mjs:1332-1344`).

Two further criticals: a clearance can still reach the four focus routes from
**outside `PageShell.tsx` entirely**, through an `(auth)` route layout that no
check opens; and `41-28`'s existence guard was applied to one of the three
branches of its own named defect, so a typo'd `REMAINING` path that happens to
sit behind the Phase 42 fence is still laundered from a FAILURE into a
suite-wide `VERIFY_REFUSED`.

_No `<structural_findings>` pre-pass was supplied with this review, so there is
no fallow section below — all findings are narrative and each carries the
command that produced it._

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: the frozen digest does not cover the shell's live code — one line reintroduces CR-01 on all four focus routes, green

**Severity:** BLOCKER
**File:** `scripts/verify-conversion.mjs:1944-1958` (the digest), `:1947-1954`
(the line set it is taken over), `:447-476` (`liveLines`), `:1883-1888` (the
docblock stating what the digest does not see)

**Issue.**

`shellCodeOutsideWindow` is built from `shellLines`, which is
`liveLines(SHELL_FILE)` — comment-blanked. `liveLines` blanks any line whose
**trimmed text starts** with `//`, `*`, `/*` or `{/*`. A blanked line trims to
the empty string, and `:1952` skips empty lines. So **a line that begins with a
comment opener and continues with live code is outside the digest, outside
`unfrozenPropertySites` (`:1969`, same source), and outside `propertyReadsElsewhere`
(`:2578`, same source).** It is live code that the gate certifying "the shell's
live code by digest" does not cover at all.

The docblock at `:1885-1888` says the digest "is taken over the NON-EMPTY
TRIMMED lines of the comment-stripped source. So a docblock edit, a blank line
and a reindentation change nothing … Only code text moves it." **The last
sentence is false**: code text on a comment-prefixed line moves nothing.

Reproduced end to end, twice, on the disposable copy. Variant A — two lines
inserted immediately above the frozen opener in `src/components/ui/PageShell.tsx`:

```tsx
  /*
  */ className += " ps-[var(--nav-inset-inline-start)]";

  if (width === "focus") {
```

Variant B — one line, the idiomatic JSX form:

```tsx
  {/* keep the shell aligned */} className += " ps-[var(--nav-inset-inline-start)]";
```

`className` is a destructured **parameter** binding and is assignable, so both
compile. Measured, for each variant:

```
the shell OUTSIDE that window : 25 line(s) of live code, digest 73adc18b822ace6679b5d0f22b7b1e442dc2d7718619d08e46c87ee14acc754f
                                ^ byte-identical to SHELL_CODE_OUTSIDE_WINDOW_DIGEST
sites permitted to read a navigation property : 2   (found outside the permitted set: 0)
navigation propert(y/ies) found inside the window: 0
✓ E   …
CONVERSION_OK — all five checks passed over 8 declared surface(s), 53 file(s) scanned.
exit 0
```

`npx tsc --noEmit --jsx preserve …` on the mutated shell: **clean, zero errors.**
`node scripts/verify-all.mjs` over the mutated tree: no gate reaches a red except
the environmental `verify:persona`.

The rendered effect is CR-01: `--nav-inset-inline-start` is `14rem` at and above
768px (`src/app/globals.css:303`), so all four focus routes — `/login`,
`/register`, `/set-password`, `/payment/callback` — get 224px of leading padding
inside a 384px `max-w-sm` card that the shell's own docblock says "reserves
nothing".

**This is the class the round-4 header names and then misses.** `:1877-1881`
says (1) misses a nameless clearance and "only (2) sees that one". (2) does not
see this one either, named or nameless — the vehicle is the stripper, not the
name. And the plain-length variant of the same line (`ps-[14rem]`) is invisible
to (1) *and* (2) simultaneously.

The reachability is not only adversarial. `{/* … */}` followed by JSX on the
same line is ordinary React, and a merge or a reformat that leaves `*/` on a
line with trailing code is ordinary too. Any such line in `PageShell.tsx` is
uncovered by the digest from the moment it exists.

**Fix.**

Take the digest over the **raw** file, not over `liveLines`. The DEF-41-01
argument for reading `liveLines` elsewhere (a documented class string must not
be counted as a use) does not apply to a digest: a digest counts nothing, it
compares. A raw digest also removes the "prose and indentation are free"
accepted cost, which is a widening, not a narrowing — but if that cost must be
kept, normalise instead of blanking:

```js
/* The digest covers the FILE, not the gate's view of it. A line the comment
 * heuristic blanks is still live code, and a digest that cannot see it is not a
 * digest of the shell. Measured 2026-08-13: a closed one-line JSX comment followed by
 * `className += "…"` left
 * this digest byte-identical while all four focus routes gained 224px of
 * leading padding, ✓ E, exit 0.
 */
const shellRawLines = readFileSync(`${ROOT}/${SHELL_FILE}`, 'utf8')
  .split('\n')
  .map((l) => l.split('\r').join('').trim());

const shellCodeOutsideWindow = [];
shellRawLines.forEach((trimmed, i) => {
  const lineNo = i + 1;
  if (lineNo >= focusWindow.start && lineNo <= focusWindow.end) return;
  if (trimmed === '') return;
  shellCodeOutsideWindow.push({ lineNo, trimmed });
});
```

Independently of the digest, `unfrozenPropertySites` and `propertiesInFocusBranch`
must also read the raw lines, or a property name on a comment-prefixed line stays
invisible to the name-based half as well. Correct the `:1885-1888` docblock in
the same commit, and record the false sentence rather than deleting it — the
house rule this file family already applies at `:1332-1344`.

---

### CR-02: the same stripper blinds check A and `verify-dialogs` check B, and both headers state a false error direction

**Severity:** BLOCKER
**File:** `scripts/verify-conversion.mjs:198-204` and `:465-472`;
`scripts/verify-dialogs.mjs:152-155` and `:278-284`

**Issue.**

Both headers state the error direction of the JSX opener as bounded:

> `verify-conversion.mjs:200-204` — *"it can blank more than it should **if a
> line's first characters are a JSX comment opener inside a string**, which is
> why the opener must be at the start of the trimmed line."*
>
> `verify-dialogs.mjs:152-155` — *"the opener must be at the start of the
> trimmed line, so the shape **can blank more than it should only when** a line
> begins with a JSX comment opener inside a string."*

**Both sentences are false.** The dominant over-blanking case is not a string —
it is a *closed* JSX comment followed by live code, which is idiomatic. Proven
with controls on the disposable copy:

Check B, `verify-dialogs.mjs`. A new file `src/components/probe/HiddenDialog.tsx`
carrying an undeclared hand-rolled overlay:

```tsx
{/* the scrim */}<div className="fixed inset-0 z-[60] bg-black/60" />
```

→ `DIALOGS_OK`, `REMAINING = 14`, exit 0. **Control**, same line with the leading
`{/* the scrim */}` removed → `✗ B  1 file(s) declare a dialog shell and are not
on REMAINING`, `DIALOGS_FAIL`, exit 1. A nineteenth copy is invisible for the
price of one comment, and `REMAINING` — the number the header says to read
instead of the tick — is unmoved.

Check A, `verify-conversion.mjs`. In `src/app/(public)/payment/callback/page.tsx`:

```tsx
  const _probe = <span className="text-red-500" />;         → ✗ A, CONVERSION_FAIL
  {/* x */} const _probe = <span className="text-red-500" />; → CONVERSION_OK, exit 0
```

A raw palette utility on the first converted surface in the phase, on a gated
payment surface, with the gate green.

This is not a pre-existing limitation the round inherited unchanged: round 4's
whole premise is that the shell is certified *by digest of its live code*, and
that premise rests on this stripper. The stripper's stated bound is what a
reader trusts without re-deriving it.

**Fix.**

Do not extend the heuristic into a parser — `WR-07` (`32-REVIEW.md`) records that
a real comment parser written in this repository was unsound, and that argument
stands. Instead, blank only the **comment span**, not the line, for the closed
single-line form, and correct both headers:

```js
/* A CLOSED single-line JSX comment blanks ITSELF, not the code after it.
 * Measured 2026-08-13, with a control: a closed one-line JSX comment
 * followed by `<div className="fixed inset-0
 * z-[60] …" />` was invisible to check B while the same line without the
 * comment failed it. The previous shape blanked the whole line, and the header
 * claimed the over-blank could only happen inside a string. It could not.
 */
if (trimmed.startsWith(JSX_COMMENT_OPEN)) {
  const close = trimmed.indexOf(JSX_COMMENT_CLOSE);
  if (close !== -1) {
    jsxCommentLinesBlanked += 1;
    out.push(' '.repeat(close + JSX_COMMENT_CLOSE.length) + trimmed.slice(close + JSX_COMMENT_CLOSE.length));
    continue;
  }
  /* unclosed — existing multi-line behaviour, unchanged */
}
```

Apply the identical change in both files (they are deliberately self-contained),
and add a fixed probe to `MATCHER_PROBES` in `verify-dialogs.mjs` asserting that
an overlay behind a leading closed JSX comment **matches** — a probe in the
direction the docblock claims, so the claim is re-proven on every run rather
than asserted.

---

### CR-03: `41-28`'s existence guard covers one of three branches — a typo'd `REMAINING` path behind the fence is still laundered into a suite-wide refusal

**Severity:** BLOCKER
**File:** `scripts/verify-dialogs.mjs:1009-1036`, specifically `:1017` (guarded)
against `:1025` and `:1027-1034` (unguarded)

**Issue.**

`neverOpenedReason()` carries its own statement of the defect it must not
commit, at `:1010-1016`:

> *"an unguarded membership test would turn a `REMAINING` entry with a typo —
> today a FAILURE, *names a path that does not exist* — into a refusal. That is
> a failure laundered into 'nothing was measured': this defect wearing the fix's
> clothes."*

The guard `&& existsSync(...)` was added to the **walk** branch only. The
`NEVER_MEASURED_BY_B` branch (`:1025`) and the **fence** branch (`:1027`) return
a reason without testing existence. So a `REMAINING` entry whose path does not
exist but matches a Phase 42 glob refuses instead of failing.

Measured on the disposable copy, one entry added to `REMAINING`:

```
['src/components/scanner/DoesNotExist.tsx', 'typo', 'x']
→ exit 2
  FATAL: 1 REMAINING entr(y/ies) name a file check B NEVER OPENS:
           fenced — behind that glob, never opened; a SCOPE BOUNDARY …

control, same typo outside the fence:
['src/components/admin/RefundDialogg.tsx', 'typo', 'x']
→ exit 1
  ✗ B  1 REMAINING entr(y/ies) name a path that does not exist
  DIALOGS_FAIL — 1 check(s) failed: B
```

The cost is larger than the local verdict. Exit 2 propagates through
`verify-all.mjs` as `VERIFY_REFUSED` **for the whole sixteen-gate suite** — the
exact shape this file family already paid for twice (`WR-06` and `WR-04`,
recorded at `verify-conversion.mjs:917-944`), reintroduced by an incomplete
guard. A one-character typo behind a fence takes every gate in the repository
to "nothing was measured".

**Fix.**

Hoist the guard so it covers every branch, which is also what makes the ordering
argument at `:400-411` true rather than true-of-one-branch:

```js
function neverOpenedReason(path) {
  /* Guarded once, for ALL THREE mechanisms. A path that does not exist is a
   * typo, and a typo is a FAILURE (`missing`), never a refusal — the fence and
   * the exemption are statements about a file, and neither says anything about
   * a file that is not there. Round 4 guarded only the walk branch, and a typo
   * behind a Phase 42 glob still refused: exit 2, and VERIFY_REFUSED for all
   * sixteen gates. Measured 2026-08-13.
   */
  if (!existsSync(`${ROOT}/${path}`)) return null;

  if (!walked.has(path)) { … }
  const skip = NEVER_MEASURED_BY_B.get(path); …
  const behind = fenceMatch(path); …
  return null;
}
```

---

### CR-04: the clearance can reach all four focus routes from outside `PageShell.tsx` — an `(auth)` layout is climbed for navigation modules and opened by nothing

**Severity:** BLOCKER
**File:** `scripts/verify-conversion.mjs:2116-2134` (`navigationBySurface`),
`:2060-2078` (`layoutClosure`), `:2670-2676` (the printed partition)

**Issue.**

E2 climbs ancestor wrappers and asks one question of each: *is a
`NAV_MODULE_PATHS` entry reachable from its closure?* Nothing asks whether the
wrapper itself reserves the clearance, and the wrapper file is never added to
`allScanned`, so checks A, B and D never open it either.

Measured on the disposable copy, a new `src/app/(auth)/layout.tsx` — a perfectly
ordinary Next wrapper — carrying all three things the gate exists to forbid:

```tsx
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-7xl bg-red-500 ps-[var(--nav-inset-inline-start)]">{children}</div>;
}
```

Result:

```
/login          focus  none  —
/register       focus  none  —
/set-password   focus  none  —
CONVERSION_OK — all five checks passed over 8 declared surface(s), 53 file(s) scanned.
exit 0
```

`53 file(s) scanned` is **unchanged from the clean tree** — the layout was
enumerated, climbed, and never opened. Three of the four focus routes now sit
inside 224px of leading padding; check A's raw palette utility is on a gated auth
surface; check D's "every converted page … writes no maximum of its own" is
defeated by a maximum written one level above the page.

This is the phase's defect shape 4 — *a check keyed on a proxy that goes quiet*.
The proxy is "a navigation module is reachable"; the fact is "clearance is
reserved"; and the report prints an affirmative sentence over the gap
(`:2674` — *"That partition is the check: the ones that do not are exactly §4's
focus list"*). The header's `WHAT A GREEN DOES NOT MEAN` block (`:29-61`) does
not name this limit, so it is neither measured nor fenced — and per `CLAUDE.md`
an unmeasured region must at least be *declared* unmeasured.

**Fix.**

Two changes, both small, and the first is the one that matters:

1. Add every climbed wrapper to the scanned set, so checks A, B and D read it.
   `layoutClosure(rel)` already computes the closure; feed its `reached` into
   `allScanned` the way a surface's is.
2. Extend E1's property scan from "the shell" to "the shell **and every ancestor
   wrapper of a focus route**": a wrapper of a `focus` surface that reads either
   `NAV_PROPERTIES` name is CR-01 arriving one level out. It is a FAILURE, not a
   refusal — the wrapper is measured, and what it reserves is not ambiguous the
   way a line inside the shell is.

If (2) is judged out of this round's scope, then the limit must be written into
the `WHAT A GREEN DOES NOT MEAN` block in the same commit, in the fence
vocabulary this repository already uses: *unmeasured, not approved.* Shipping it
undeclared is the failure direction that prints a tick.

---

## Warnings

### WR-01: the "render site outside the frozen window" refusal cannot fire — a refusal branch nothing can reach

**Severity:** WARNING
**File:** `scripts/verify-conversion.mjs:1798-1817`; advertised in the exit-code
header at `:249-250`

**Issue.**

Derivation, and the empirical half is below it. By the time control reaches
`:1798`:

- `:1737` has already refused when `propertiesInFocusBranch.length === 0 && !focusShapeMatched`.
  So at `:1798`, either `propertiesInFocusBranch.length > 0` (the guard fails) or
  `focusShapeMatched === true`.
- `focusShapeMatched` requires window position 3 to equal
  `'<div className={FOCUS_ROOT}>'` (`FOCUS_BRANCH_SHAPE[2]`, `:1563`). That trimmed
  equality means the raw line contains `className={FOCUS_ROOT}`, which is exactly
  `FOCUS_BRANCH_RE` (`:1460`). So `focusBranchLines` always contains a line
  **inside** the window.
- `:1777` has already refused when the count is not exactly 1. So the single
  element is the in-window one, and `focusRootRenderLineNo < focusWindow.start ||
  > focusWindow.end` is false on every tree.

Empirically: a second `className={FOCUS_ROOT}` outside the window (a decoy
component beside the constant) hits the *count* refusal, never this one —

```
FATAL: GATE CANNOT READ — … renders FOCUS_ROOT as the whole of
       exactly one className 2 time(s) — found at line(s) 126, 154.
```

The exit-code header at `:249-250` lists *"the single `className={FOCUS_ROOT}`
sitting outside the window"* as a documented cause of exit 2. It is not a cause
of anything. This is the phase's defect shape 1 — *a refusal branch nothing can
reach* — and `:1890-1898` shows the author applying exactly this reasoning to
decline writing a stale-permission check, then writing this one.

**Fix.** Delete `:1798-1817` and its line in the exit-code header, with a comment
recording the derivation above so the next reader does not re-add it. If the
condition is wanted as a live check, it must be evaluated *before* the shape
comparison, not after — but the shape comparison already subsumes it, which is
why the honest resolution is removal.

---

### WR-02: the digest refusal's own instruction is false — a permitted site is keyed on line text, so a copy of the default root wrapping the focus form is "permitted"

**Severity:** WARNING
**File:** `scripts/verify-conversion.mjs:1923-1934` (`NAV_PROPERTY_SITE_DIGESTS`),
`:1968-1975` (the scan), `:2043-2045` (the claim)

**Issue.**

The digest refusal closes with:

> *"Re-freezing does NOT bless a navigation property: the permitted-site
> assertion above runs independently and cannot be satisfied by a digest."*

The permitted-site assertion hashes the **trimmed text of a line** and asks
whether that hash is in the permitted set. It has no notion of *position*. So a
second, byte-identical copy of the default root — the very line whose digest is
permitted — is permitted wherever it is put, including wrapping the focus form.

Measured on the disposable copy. `PageShell` split into a wrapper plus
`PageShellInner`, with the frozen seven lines and the focus root byte-identical:

```tsx
export function PageShell(props: PageShellProps) {
  return (
    <div className="min-h-dvh ps-[var(--nav-inset-inline-start)]">
      <PageShellInner {...props} />
    </div>
  );
}
```

First run: the digest refuses (`found digest de236e…`) and **the permitted-site
refusal does not fire**. Following the gate's own printed instruction — read the
line, copy the found digest in — the second run gives:

```
sites permitted to read a navigation property : 2   (found outside the permitted set: 0)
✓ E  the focus branch has the one frozen shape (7 line(s), at …:159-165), …
CONVERSION_OK — all five checks passed
exit 0        (tsc --noEmit: clean)
```

All four focus routes wrapped in 224px of leading padding, with the backstop the
message promises reporting zero. The wrapper rewrite is one of the six that
41-27 found; the digest catches it once, and the sentence telling the reader that
re-freezing is safe is what lets it through the second time.

**Fix.** Either (a) key a permitted site on `path:lineNo` **and** digest, so a
copy at a new position is not permitted, or (b) — cheaper and honest — correct
the sentence at `:2043-2045` to say what is true:

```
Re-freezing does not bless a NEW navigation-property site. It DOES bless a copy
of an already-permitted line: the permitted set is keyed on line text, not on
position, so a duplicate of the default root placed anywhere — including around
the focus form — reports zero. Measured 2026-08-13. Read the changed line for
what it WRAPS, not only for what it says.
```

A false sentence in a gate's header is what the next reader trusts without
re-deriving it — this file's own words at `verify-dialogs.mjs:375-380`.

---

### WR-03: `existsSync` on a case-insensitive filesystem makes a case-typo refuse on macOS and fail on Linux

**Severity:** WARNING
**File:** `scripts/verify-dialogs.mjs:1017`

**Issue.**

The guard added by 41-28 uses `existsSync`, which on macOS's default
case-insensitive volume returns `true` for a path whose case does not match the
file on disk. `walked` is built from the walk's own output and *is*
case-exact. So a case-typo in a `REMAINING` entry lands in the `NOT IN THE WALK`
branch rather than in `missing`.

Measured on the disposable copy:

```
['src/components/admin/refunddialog.tsx', 'case typo', 'x']
→ exit 2
  FATAL: 1 REMAINING entr(y/ies) name a file check B NEVER OPENS:
           NOT IN THE WALK — this path is on disk, and this gate's walk does not produce it
```

On a case-sensitive volume the same entry is `missing` → `✗ B` → exit 1. The
verdict for one typo therefore depends on the developer's filesystem, and on the
platform `CLAUDE.md` Guardrail 6 names as the house one it is the *refusal*
— the laundering the guard was written to prevent.

**Fix.** Test membership against the walk's case-exact output before trusting
`existsSync`, and treat a path that differs only in case as `missing`:

```js
/* `existsSync` is case-INSENSITIVE on the default macOS volume (Guardrail 6),
 * so a case-typo would answer "on disk" and take this branch — a typo laundered
 * into a refusal on one platform and a FAILURE on another. `walked` is case-exact.
 */
const onDiskExactly = walked.has(path) ||
  (existsSync(`${ROOT}/${path}`) && !walked.has(path) && realpathSync.native(`${ROOT}/${path}`).endsWith(path.split('/').pop()));
```

or, simpler and with no new dependency on `realpath` semantics, restrict the
branch to paths whose extension is genuinely outside `SCANNED_EXTENSIONS` or
whose prefix is outside `src/` — the two shapes the message actually describes.

---

## Info

### IN-01: `FOCUS_BRANCH_RE` has no left boundary, so a differently-named prop counts as the render site

**Severity:** INFO
**File:** `scripts/verify-conversion.mjs:1460`

**Issue.** `new RegExp('className=\\{FOCUS_ROOT\\}')` matches as a substring, so
`wrapperClassName={FOCUS_ROOT}` or `innerClassName={FOCUS_ROOT}` satisfies the
pattern the messages describe as *"renders `FOCUS_ROOT` as the whole of exactly
one `className`"*. The direction is safe on this tree — an extra occurrence
raises the count and refuses — but the description and the pattern disagree, and
this file family treats that disagreement as a defect in its own right.

**Fix.** Add the left boundary the sibling matchers already use:

```js
const FOCUS_BRANCH_RE = new RegExp(`(?<![a-zA-Z0-9_$])className=\\{${FOCUS_ROOT_IDENTIFIER}\\}`);
```

---

## Method, and what this review did not do

- **Everything above was run, not read.** The sandbox at
  `…/scratchpad/sb` was a copy of `scripts/` + `src/` + `tsconfig.json`, with
  `node_modules`, `public/`, `supabase/` and `.claude/` symlinked. Baseline
  before any mutation: `verify-conversion` exit 0, `verify-dialogs` exit 0,
  `verify-all` red only on the environmental `verify:persona`.
- **The repository was never modified.** `git status --porcelain` at the end is
  identical to the start: two untracked planning directories, no tracked change.
- **Accepted costs were re-tested and are as described**, so they are not filed:
  the gate does refuse on any edit to `PageShell.tsx`'s live code lines (prose,
  blank lines and indentation are free), and the nameless-clearance-on-a-re-frozen-line
  boundary does require two deliberate acts. CR-01 is *worse* than the described
  boundary, which is why it is filed: it requires **one** act and no re-freeze.
- **Out of scope and not re-derived:** `WR-02` (`RUNG_FAMILY`), `WR-04`
  (`FULL_BLEED_VIEWER`), `WR-05` (the header's measured line numbers), the
  `MIN_HEIGHT_RE` / `CENTRING_RE` hole, and every finding of
  `41-REVIEW.md`, `41-GAP-REVIEW.md`, `41-GAP-REVIEW-2.md`, `41-GAP-REVIEW-3.md`.
- **No test-coverage findings are filed** — there is no test runner for the
  product (`CLAUDE.md` Guardrail 1), and `npm run build` is the type gate.
- **No built stylesheet was read** as evidence of anything.

---

_Reviewed: 2026-08-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
