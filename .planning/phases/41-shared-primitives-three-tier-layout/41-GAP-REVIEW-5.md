---
phase: 41-shared-primitives-three-tier-layout
reviewed: 2026-08-13T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - scripts/verify-conversion.mjs
  - scripts/verify-dialogs.mjs
findings:
  critical: 2
  warning: 5
  info: 0
  total: 7
status: issues_found
---

# Phase 41: Code Review Report — round 5 (plans 41-29, 41-30)

**Reviewed:** 2026-08-13
**Depth:** standard
**Status:** issues_found
**Diff base:** `ae3a9103ab47c5d803b2768d261f364b5d01b0e8..HEAD`, restricted to `scripts/verify-conversion.mjs` and `scripts/verify-dialogs.mjs`

## Summary

Round 5 does two things: it replaces the whole-line comment blanker with
`stripLeadingComments()`, a span-consuming loop that pairs each opener with the
closer that belongs to it (41-29); and it adds a paragraph to
`verify-conversion.mjs`'s header declaring that check E covers the FILE and not
the ROUTE (41-30).

**The stripper fix is real but incomplete, and the header sentence that replaced
the withdrawn false claim is itself false.** 41-29 fixed the *single-line* case
and left the *multi-line* case untouched — the multi-line JSX branch in
`liveLines()` still blanks its closing line whole, including live code after
`*/}`. The withdrawal paragraph in both headers states the shipped bound "in
both directions" and enumerates two remaining over-blanks; the multi-line case
is in neither list, and it is not an over-blank — it is the **same
under-measurement CR-01 and CR-02 were about**, costing one extra line of
comment. This is the fourth false docblock sentence this file family has
carried, in the paragraph written to retire the third.

Every finding below was **produced by running a patched tree with a control**,
not by reading. Nothing was left modified: `git status --porcelain` carries only
the two untracked `.planning/phases/44-*` and `45-*` directories that predate
this review.

Question 2 is answered clean: on the live tree the round-5 output is identical
to the pre-round-5 output apart from the four new probe rows and the reworded
partition sentence — verified by running the `ae3a910` copies of both scripts
from `scripts/` and diffing. **No correct file is reddened by the fix.**

---

## Critical Issues

### CR-01: the CR-01/CR-02 hole survives — a two-line comment still hides an overlay, a raw palette utility and (by construction) the frozen digests

**Files:**
`scripts/verify-dialogs.mjs:368-387` (`liveLines`, the `insideJsxComment` branch)
`scripts/verify-conversion.mjs:576-595` (identical branch)

**Issue.** `stripLeadingComments()` fixed the one-line form. The multi-line form
never reaches it: once `insideJsxComment` is set, `liveLines()` pushes `''` for
every line **including the line carrying the closer**, so everything after `*/}`
on the terminating line is discarded exactly as it was before 41-29.

```js
if (insideJsxComment) {
  out.push('');                                   // ← whole line, closer and all
  jsxCommentLinesBlanked += 1;
  if (trimmed.includes(JSX_COMMENT_CLOSE)) insideJsxComment = false;
  continue;
}
```

**Measured, with controls, on the live gates.**

Dialogs gate — a new file `src/components/ui/ZProbe.tsx`, not on `REMAINING`,
not fenced:

| shape | result |
|---|---|
| `{/* a lid`<br>`    that wraps */} <div className="fixed inset-0 z-[60]" />` | `✓ B`, `REMAINING = 14`, `DIALOGS_OK`, **exit 0** |
| control — `{/* a lid */} <div className="fixed inset-0 z-[60]" />` | `✗ B  1 file(s) declare a dialog shell and are not on REMAINING: src/components/ui/ZProbe.tsx` |

Conversion gate — the same two shapes inserted into
`src/app/(auth)/login/page.tsx`, a declared converted surface:

| shape | result |
|---|---|
| two-line comment then `"bg-red-500"` | `✓ A  no raw palette utility in 53 file(s)`, `CONVERSION_OK` |
| control — one-line comment then `"bg-red-500"` | `✗ A  2 raw palette utilit(y/ies) reachable from a converted surface` |

The scanned-file count did not move in either direction. Check E's two frozen
digests are computed over `liveLines(SHELL_FILE)`, so the same shape reproduces
41-GAP-REVIEW-4 CR-01 on the shell's focus branch by the same mechanism.

**Consequence for the header.** Both files now state:

> *no longer blanked, and used to be: every character after a leading comment's
> closer — which is where the whole of CR-01 and CR-02 lived.*

That is true only for a comment that opens and closes on one line. For the
multi-line form it is false, and the "still blanked MORE than it should" list
directly above it does not name the case either. A sentence written to withdraw
a false bound must not state a false bound.

**Fix.** Route the terminating line of a multi-line JSX comment through the same
span logic instead of blanking it, and make the counter count what it says:

```js
if (insideJsxComment) {
  const at = text.indexOf(JSX_COMMENT_CLOSE);
  jsxCommentLinesBlanked += 1;
  if (at === -1) { out.push(''); continue; }
  insideJsxComment = false;
  const end = at + JSX_COMMENT_CLOSE.length;
  const stripped = stripLeadingComments(' '.repeat(end) + text.slice(end));
  if (stripped.unclosed === JSX_COMMENT_OPEN) insideJsxComment = true;
  out.push(stripped.text.trim() === '' ? '' : stripped.text);
  continue;
}
```

and add the two-line shape to `MATCHER_PROBES` — see WR-01, which is why the
existing ten probes cannot catch this.

---

### CR-02: a VALID JSX comment written `{/* … */ }` blinds a gate to end-of-file, and the debt counter falls while the report tells the reader to delete a live debt

**Files:**
`scripts/verify-dialogs.mjs:340-349` and `:379-382`
`scripts/verify-conversion.mjs:548-557` and `:587-590`

**Issue.** `stripLeadingComments()` looks for `*/}` as one token. In JSX,
`{/* lid */ }` — with whitespace between the block closer and the brace — is a
**valid, compiling comment expression**; React and Babel accept whitespace
inside the expression container. The stripper does not recognise it as closed,
returns `unclosed: JSX_COMMENT_OPEN`, and `liveLines()` sets `insideJsxComment`.
Since `*/}` never appears later in the file, **every remaining line of that file
is blanked**.

The header names this case but bounds it wrongly:

> *a JSX comment closed with a space between the star-slash and the brace is not
> recognised as closed, so it blanks onward to its real closer*

There is no real closer. It blanks onward to EOF.

**Measured on the live tree.** One line inserted above the existing shell at
`src/components/admin/RefundDialog.tsx:60` — a file that IS on `REMAINING`:

```
    {/* the scrim */ }
```

`node scripts/verify-dialogs.mjs` then printed:

```
      REMAINING = 13
  ✓ B  every one of the 13 file(s) still declaring a shell is on REMAINING,
  ! B  1 REMAINING entr(y/ies) are STALE — the file no longer carries a shell:
       src/components/admin/RefundDialog.tsx  → converted; remove this entry
  DIALOGS_OK — all three checks passed. REMAINING = 13 file(s) still declare
```

exit **0**. The shell at line 60 is untouched and still standing.

This is the precise defect the file's own header records three times and claims
to have closed by construction — *"A debt counter that falls because the gate
stopped looking"* (DEF-41-03, WR-02, CR-03). It has returned through a fourth
mechanism none of those three lists covers: not the never-measured Map, not the
fence, not `walked` — a file that IS walked, IS opened, and comes back empty
because the stripper went blind inside it. And the printed instruction is
actively harmful: a reader who follows it deletes the `RefundDialog.tsx` entry,
which is a hand-rolled overlay on a refund path — money leaving, per its own
`REMAINING` reason string.

`jsxCommentLinesBlanked` did not move (see WR-02), so nothing observable
contradicted the green.

**Fix.** Accept the whitespace-tolerant JSX closer, and make an unclosed JSX
comment that swallows the remainder of a file a **refusal** rather than a silent
blanking:

```js
const JSX_CLOSE_RE = /\*\/\s*\}/;      // assembled at run time, per DEF-41-01
```

and in `liveLines`, if `insideJsxComment` is still true at the end of the file,
`refuse()` naming the file and the opening line — a gate that read nothing after
line N must not report on that file at all.

---

## Warnings

### WR-01: the new self-check calls `stripLeadingComments`, not `liveLines` — it tests half the pipeline while its own comment says it tests the whole of it

**File:** `scripts/verify-dialogs.mjs:1235-1247`

```js
measured: isOverlayLine(stripLeadingComments(probe.line).text) ? 'match' : 'no match',
```

with the comment above it:

> *The probe goes through `stripLeadingComments` first, because that is the path
> a real line takes: check B reads `liveLines`, never the raw file. Measuring
> the matcher on a raw string tested half the pipeline and called it the whole
> of it (41-29).*

Check B reads `liveLines`, and `liveLines` is **not** `stripLeadingComments`: it
adds the multi-line state machine, which is where both criticals above live. The
probes are single strings and cannot enter that state at all, so the self-check
is structurally incapable of catching CR-01 or CR-02 — the same sentence 41-29
wrote to describe the defect it was fixing, now true of the fix.

**Fix.** Make the probe rows line *arrays* fed through the real `liveLines` path
(extract the per-line loop into a `liveLinesFrom(rawLines)` helper that
`liveLines` calls), and add: the two-line JSX comment with an overlay after the
closer (expected: match), and `{/* x */ }` followed by an overlay on a later
line (expected: match).

### WR-02: `jsxCommentLinesBlanked` in the dialogs gate is printed before check B reads a file, and now counts lines it did not blank

**File:** `scripts/verify-dialogs.mjs:285`, `:380`, `:1293`

Two independent problems in one counter the header calls the evidence that "the
extension is measurable rather than trusted":

1. **It is printed too early.** Line 1293 runs after `liveLines(PRIMITIVE_FILE)`
   and before check B walks `src/`. Measured: in CR-02's mutation roughly forty
   lines of `RefundDialog.tsx` were newly blanked and the printed number stayed
   at `5`. The number describes `Dialog.tsx`, not the run.
2. **Round 5 changed what it counts.** `if (stripped.jsx) jsxCommentLinesBlanked
   += 1` now fires on a line that was *not* blanked — the CR-02-fix case, where a
   closed JSX comment is stripped and live code survives. The declared meaning
   ("How many lines the JSX extension blanked, across every file read this run")
   no longer matches either half.

In a repo with no error tracking, a printed counter is one of the few
observables a gate has. This one cannot report the blindness in CR-02.

**Fix.** Move the print below check B's scan, and split the counter into
`jsxSpansStripped` and `jsxLinesBlanked` so a blindness spike is visible in the
second.

### WR-03: the new docblock claims a multi-line block comment "blanks onward to its closer" — it does not, and the shape reddens a correct file

**File:** `scripts/verify-dialogs.mjs:326-327`, `scripts/verify-conversion.mjs:534-535`

> *a multi-line prose block quoting class strings still blanks onward to its
> closer — the half DEF-41-02 exists for*

Only the JSX form has a multi-line state; the block form has none. Measured:

```
/* a lid
  the shell is fixed inset-0 z-[60]
 */
```

→ line 2 comes back **live** and `isOverlayLine` matches it. A correct file
carrying prose in a block comment whose continuation lines are not star-prefixed
is a **red**, which §0 rule 3 (quoted five times in this file family) says gets a
gate switched off.

The delta on today's tree is zero — both gates are green — but the sentence
states a property the code does not have, in the same paragraph that withdrew
the last sentence of that kind.

**Fix.** Either qualify the claim to the JSX form, or give the block opener the
same multi-line state (`unclosed === '/*'` → enter a block state exited by
`*/`). The second is the honest one and costs four lines.

### WR-04: `indexOf(close, open.length - 1)` reads `/*/` as a closed comment, revealing the comment body as live code

**File:** `scripts/verify-dialogs.mjs:344`, `scripts/verify-conversion.mjs:552`

For the block opener the search starts at index 1, so on `/*/` the closer is
found at index 1 and the span consumed is `/*/` — three characters. In
JavaScript `/*/ … */` is a **single comment**; the stripper hands its body back
as live text. Measured:

```
/*/ fixed inset-0 z-[60] */    →  live: "    fixed inset-0 z-[60] */"  →  overlay hit
```

A false red on a correct file, introduced by round 5 (the pre-round-5 heuristic
blanked the whole line). It also contradicts the table's own justification —
*"the degenerate form in which the opener's own star begins the closer, keep
blanking whole exactly as they did before this table existed"* — which holds for
`{/*/}` and for a bare `*/` line but not for `/*/`.

Real-world frequency in this tree is zero today, which is why this is a warning
and not a blocker; the false claim beside it is the part that matters.

**Fix.** Start the search past the opener for the block form, and keep the
`length - 1` start only where the degenerate closer genuinely overlaps
(`{/*/}`): give each entry its own `searchFrom` rather than deriving one rule
from `open.length`.

### WR-05: 41-30's boundary is declared where a reader of a green run never looks, is stated in neutral words, and is narrower than the region it describes

**File:** `scripts/verify-conversion.mjs:48-76` (the declaration), `:2790-2796` (what is printed), `:2930-2949` (the closing block, unchanged)

The declaration itself is **true of the code**: verified by reading
`ancestorLayoutFiles`/`layoutClosure` (`:2214-2254`) — a climbed wrapper's
closure is cached in `layoutClosureCache` and is never merged into `s.scanned`,
so `allScanned` (`:2257-2258`), which is what checks A, B and D read, cannot
contain it. The printed `files scanned by A, B and D` count is unaffected. Good.

Three problems with it as a *boundary declaration*, which is what 41-30 says it
is:

1. **It is not where the reader is.** The only thing added to the report is one
   sentence in the mid-report navigation partition: *"It says nothing about what
   clearance a route receives at render — a wrapper above the page is climbed for
   modules and never opened for class strings."* The `✓ E` verdict line carries
   no caveat, and the closing "Read the header before treating this as safety"
   block — the paragraph a reader of a green run actually reads — was **not
   updated** and still enumerates only the three older limits.
2. **The printed wording is neutral, not the not-approved wording.** This file
   family's own standard, set by the sibling gate for its Phase 42 fence, is that
   the report says **UNMEASURED, not approved** *"on every run in those words"*
   (`verify-dialogs.mjs:55-61`). The conversion gate's new sentence says "says
   nothing about", which is a description of coverage, not a refusal of credit.
   Question 4 answers itself here: a docblock says *boundary, not approval*, and
   the artefact a person sees says a tick and a soft caveat.
3. **The region is wider than declared.** The unmeasured area is not the wrapper
   file — it is the wrapper's whole import closure minus whatever a page happens
   to reach independently. On this tree the delta is zero only because `/gallery`
   pulls `AppNav.tsx` into its own closure (route table, `c.out:289`); a
   component imported *only* by a layout is invisible to A, B and D too, and that
   is an accident of one surface rather than a property. The sentence "asked
   exactly one question" is also imprecise: `layoutClosure()` raises a second one
   — an unresolved specifier in a wrapper's closure takes the whole gate to exit
   2.

**Fix.** Move the boundary into the closing block and into the `✓ E` line, in
the sibling gate's exact words — *the region above the page is UNMEASURED, not
approved* — and state the region as "the wrapper and everything only it
imports".

---

_Reviewed: 2026-08-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Working tree restored; `git status --porcelain` shows only the two untracked planning directories that predate this review._
