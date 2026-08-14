---
phase: 41-shared-primitives-three-tier-layout
verified: 2026-08-14T03:10:00Z
status: human_needed
score: 5/10 must-haves fully verified — the same five as round 5, and the number is deliberately not inflated. What moved is the composition: FAILED truths 1 → 0. The reintroduction guard, open five consecutive rounds, is closed and proved by asserted mutation on the real files; the four Group B items are closed; what remains is entirely human observation, unchanged since round 1
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/10
  gaps_closed:
    - "GROUP A, the truth open since round 1 — 'liveLines()'s comment-stripping heuristic blanks only what it should, so every check built on it sees the shell's and the tree's actual live code'. CLOSED BY: plan 41.1-01 (D-41.1-07/08/09), which replaced the ten private strippers with one module, scripts/lib/comments.mjs, imported by eleven gates (verify-conversion.mjs:421, verify-dialogs.mjs:283, plus nine more — measured with LC_ALL=C /usr/bin/grep, see the grep-trap section). RE-DERIVED HERE, not accepted: (1) both round-5 shapes handed verbatim to the shipped module return the live code — the terminating line of a two-line JSX comment comes back carrying everything after the closer, and a closer written with whitespace before the brace closes, because JSX_COMMENT_CLOSE_RE (comments.mjs:147) is a run-time-assembled regular expression with an optional-whitespace segment rather than the exact three-character token; (2) THE LOAD-BEARING TEST — CR-01's own reintroduction, the navigation clearance put back into PageShell's focus form, was hidden behind each of the two shapes in turn and check E saw it every time: exit 1, '✗ E the focus branch reads 1 navigation propert(y/ies) — this is CR-01', identical to the no-comment control; (3) check A likewise reddened on a palette utility hidden behind both shapes on a scanned file, while the DEF-41-02 control — the same utility QUOTED INSIDE a comment body — stayed green, so the fix did not buy visibility with a false red. Every mutation was asserted applied (sha256 differs, marker present) before its result was read, and asserted restored (sha256 equals the original, git diff empty). git status --porcelain identical before and after: two untracked planning directories, nothing else."
    - "GROUP A / the debt-goes-quiet defect, which had returned through a FOURTH mechanism. CLOSED, and proved with a negative control rather than by reading a zero. Round 5's live site (src/components/admin/RefundDialog.tsx) no longer exists as a REMAINING entry — plan 41.1-17 converted it in wave 7 — so the equivalent money-domain entry was used: src/app/(public)/tickets/[id]/RefundRequestButton.tsx, a hand-rolled overlay on a refund request. With the round-5 shapes inserted above its shell, verify-dialogs measured 8 shells and REMAINING = 8, unmoved, no STALE entry, no 'converted; remove this entry' notice. THE COUNTER WAS THEN PROVED ABLE TO MOVE: with the shell genuinely removed from the same file, the same run measured 7, printed '! B 1 REMAINING entr(y/ies) are STALE — the file no longer carries a shell' and the conversion notice. An unmoved number beside a proven-movable counter is evidence; either alone is not."
    - "GROUP A follow-on WR-01, the dialogs self-check. CLOSED BY plan 41.1-02. verify-dialogs.mjs:1687-1694 now maps every probe through liveLinesFrom(probe.line) — a LINE ARRAY through the real multi-line path — and a row matches when any of its live lines matches, which is how shellShapes decides a real file. Four of the fourteen probes are multi-line (:1023-1075): CR-01, its body-quoting control, CR-02, its body-quoting control. RE-DERIVED BY REGRESSING THE MODULE ITSELF, which is the only proof that matters here: undoing the CR-01 fix in scripts/lib/comments.mjs made verify-dialogs refuse with 'the overlay matcher disagrees with its own description on 2 of 14 fixed probe(s)', naming both multi-line rows by label, expected match / got no match; undoing the CR-02 fix made it refuse through the sibling branch, '2 of 14 matcher probe(s) open a comment that never closes'. verify-comment-stripper.mjs caught both, exit 1, with the merged column flipping to BLIND on exactly the regressed shape and on no other. Both regressions asserted applied (the original text asserted absent) and asserted restored."
    - "GROUP B / DEF-41-07, all four items. Items 1 and 4 CLOSED BY plan 41.1-02: the existence question is hoisted to the top of neverOpenedReason() (verify-dialogs.mjs:1619) so all three branches are guarded by one test, and it is asked case-exactly through existsCaseExact() (:1455-1459), which takes the walk's case-exact Set as the authority and existsSync only as a second opinion confirmed by spelledExactly(). PROVED BY MUTATION on the house APFS volume: a REMAINING entry naming a path that does not exist → exit 1, '✗ B 1 REMAINING entr(y/ies) name a path that does not exist'; a REMAINING entry with a CASE typo on a real file (src/components/ui/dialog.tsx for Dialog.tsx), the exact case where existsSync answers yes on this filesystem → also exit 1, the same failure. Neither laundered into a refusal. Item 3 CLOSED BY plan 41.1-04: permitKey() (verify-conversion.mjs:2416) joins path, line number and digest, so a permitted site is a place and not only a string. Item 2 CLOSED BY plan 41.1-04: the unreachable GATE_CANNOT_READ_MARKER refusal and the exit-code sentence that advertised it are both gone, with the withdrawn sentence quoted in place beside the measurement that retired it (verify-conversion.mjs:327-340), the house shape for a claim withdrawn."
    - "Truth 2's caveat. Round 5 counted truth 2 as verified 'with a noted caveat — the checking mechanism has a proven, still-open hole'. The caveat is gone: the mechanism was compared character-by-character against TypeScript 5.9.3's own parser over all 287 files the gates read, with zero divergence in either direction (see the shape hunt below)."
  gaps_remaining: []
  regressions: []
gaps: []
deferred:
  - truth: "RESP-01 — every surface usable on phone, tablet and desktop"
    addressed_in: "Phase 41.2"
    evidence: ".planning/REQUIREMENTS.md:254 — 'says *every* surface, so it closes only in 41.2, and by a written human pass; no script can close it'. Must NOT be closed here."
  - truth: "DS-07 — adoption of the shared pattern completes across every surface"
    addressed_in: "Phase 41.2"
    evidence: ".planning/REQUIREMENTS.md:251 — 'layer in 41, adoption completes in 41.2'"
  - truth: "DS-08 — RevealVenueDialog adopts the primitive last"
    addressed_in: "Phase 41.2"
    evidence: ".planning/REQUIREMENTS.md:252"
  - truth: "DS-09 — the five analytics tables and finance read as cards"
    addressed_in: "Phase 41.1 (executed) → 41.2"
    evidence: ".planning/REQUIREMENTS.md:253"
  - truth: "RESP-02 / RESP-03 — inherited by every surface as it converts; the touch size measured on a device"
    addressed_in: "Phase 41.2"
    evidence: ".planning/REQUIREMENTS.md:255-256"
  - truth: "a navigation clearance reaching one of the four focus routes from an ordinary ancestor layout is caught by SOME check (Group C's structural half, DEF-41-08)"
    addressed_in: "Phase 41.1 (executed) — the boundary is declared in the gate's own header and check E now reports the mount question over 28 surfaces, not 8"
    evidence: "verify-conversion.mjs check E printed this run: 'the 2 file(s) declaring the column clearance at the md tier are EXACTLY the 2 file(s) mounting the responsive navigation form'. The declared limit — check E reads one file and asks the mount question of an import graph — remains in the header, unmoved."
  - truth: "DEF-41-01 — Tailwind's source detection scans .planning/, compiling a dead rule out of prose into the shipped stylesheet"
    addressed_in: "its own plan, deferred with a written reason"
    evidence: ".planning/phases/41.1-work-surface-conversion/deferred-items.md DI-41.1-01"
human_verification:
  - test: "H41-1 — the eight surfaces this phase declares, at 390px / 768px / 1280px, on a device"
    expected: "nothing clipped, nothing stretched, no horizontal scroll; the navigation column clears the content at 768px and up"
    why_human: "every gate in this repository reads class strings and import clauses; none renders a pixel. 41-RELEASE-PASS.md §9 records H41-1 as approved by a blanket authorisation with NO itemised evidence and NOT ticked"
  - test: "41-CR01-PASS.md rows 7–13 — /set-password and /payment/callback at three widths, and /register at 390px scrolled to its last field"
    expected: "card centre within 4px of the viewport centre at 768 and 1440; symmetric space at 390; no navigation bar; no horizontal scroll; at 390 the form ends with a visible gap below its last element"
    why_human: "rows 1–6 were measured headless on 2026-08-13 and that document says so in its own §1a; a headless browser is not a device. Rows 7–13 read `pending` and are unchanged by this round"
  - test: "H41-2 — a converted dialog on a phone and on a laptop, including whether the page behind the open panel scrolls (assumption A2)"
    expected: "sheet at 390px, window at 1280px, Escape closes, the background does not scroll"
    why_human: "check B reads class strings and import clauses, never behaviour. 41-RELEASE-PASS.md §9 records H41-2d — A2 — as STILL OPEN, nothing reported"
  - test: "H41-3 — the densest converted table on a phone"
    expected: "cards at 390px, no sideways scroll, the columns that mattered still present"
    why_human: "whether a seven-column table is comprehensible as a card is a judgement, not a class string"
  - test: "H41-4 — the smallest interactive control on a LARGE TOUCH SCREEN, measured"
    expected: "at least 44×44 CSS px in both axes as rendered, with the one declared exception"
    why_human: "the gate estimates from a class string and cannot see a flex stretch, an icon height, an ancestor's padding, or a class built by concatenation — it says so in its own header. 41-RELEASE-PASS.md records this as `human_needed`: no large touch screen was ever stated available. It is the only thing in this repository that would prove anything is 44px"
  - test: "H41-5 — a desktop with a mouse only: the row-action pills at their reduced height, and only those"
    expected: "the pointer variant applies where D-41-07 says it does and nowhere else"
    why_human: "no height was ever reported; the trade was accepted on paper"
  - test: "H41-6a — eight tabs at 768px without scrolling the strip, and H41-6b — the door unchanged at both of its addresses"
    expected: "eight tabs visible without scrolling; the door is the bottom bar at every width"
    why_human: "RESP-04's observable half. No count was ever reported and neither door address was reported opened; §0.2's precondition — an account holding all three capabilities — was never stated met"
---

# Phase 41: Shared Primitives & Three-Tier Layout — Verification Report

**Phase Goal:** The shared layer exists — one implementation per recurring pattern, three tiers, finger-sized targets — and is proven on its first eight whole surfaces. The remaining surfaces convert in 41.1 and 41.2 onto this layer, unchanged.
**Verified:** 2026-08-14T03:10:00Z
**Status:** `human_needed`
**Re-verification:** Yes — seventh pass, round 6. The first six rounds all closed as `gaps_found`; this is the first that does not.

---

## The headline, and why the number did not move

**Five rounds in a row this phase was `gaps_found` at 5/10, on the same truth.** The
count of *fully verified* must-haves is **still 5/10**, and inflating it would be the
same error as holding it down. What changed is the composition:

| | round 5 | round 6 |
|---|---|---|
| fully VERIFIED | 5 (1, 2, 8, 9, 10 — truth 2 with a caveat) | 5 (1, 2, 8, 9, 10 — **no caveat**) |
| **FAILED** | **1** (truth 5) | **0** |
| pending human observation | 4 | 5 |
| open gaps in the frontmatter | 2 groups | **none** |

Truth 5 did not become verified. It moved out of FAILED and into the same class as
truths 3, 4, 6 and 7: **its mechanical half is closed and proved; its behavioural half
is an observation nobody has made.** That is the whole of the difference between
`gaps_found` and `human_needed`, and it is a real difference: nothing mechanical is
broken, and what remains is a person looking.

**Nothing in this round was fixed by this verification.** Every closure below was done
by phase 41.1 and is re-derived here against the tree as it stands.

---

## The truth that was open five rounds, and how it was re-derived

The truth: *"`liveLines()`'s comment-stripping heuristic blanks only what it should, so
every check built on it sees the shell's and the tree's actual live code, under every
form a JSX/block comment can legally take."*

**What closed it:** plan `41.1-01` (D-41.1-07, D-41.1-08, D-41.1-09) — the ten private
strippers became one module, `scripts/lib/comments.mjs`, landed in wave 0 *before* the
first conversion plan of 41.1, because every `REMAINING` deletion in that phase is a
claim these gates measure. Plan `41.1-02` rebuilt the dialogs self-check on it; plan
`41.1-04` closed the two `verify-conversion.mjs` items.

**Round 5's diagnosis was that enumerating comment shapes is the wrong unit of closure.**
That diagnosis is accepted here, so this round did not re-derive the truth by enumerating
shapes. It did three things instead.

### 1. The differential against a real parser — 287 files, zero divergence

`D-41-20` forbids new packages; TypeScript 5.9.3 is **already** in `node_modules`. Its
parser was used as ground truth: for every file the gates read, every comment range was
collected through `ts.getLeadingCommentRanges` / `getTrailingCommentRanges` over the full
token tree of a JSX-aware `SourceFile`, giving a per-character mask of *comment* against
*code*. That mask was compared, character by character, with what the shipped module
returns.

```
files compared against TypeScript 5.9.3 as ground truth : 287
   (264 under src/, 23 under scripts/ — the walk the gates themselves use)
BLIND     — files where CODE was blanked (unsafe direction)    : 0
FALSE-RED — files where a LEADING COMMENT was kept as code     : 0
unterminated comments reported anywhere in the tree            : 0
parse diagnostics on any file                                  : 0
```

Two harness artefacts were identified and excluded, and both are worth naming because
excluding them is a judgement, not a convenience:

- **the braces of a JSX comment container.** TypeScript's comment range for a JSX comment
  covers the block comment only; the enclosing `{` and `}` are code. The module blanks
  them with the comment. They carry nothing, and blanking them is correct.
- **trailing comments.** `comments.mjs:63-65` declares that it consumes *leading* comments
  only and returns a comment opened after live code as it stands. Verified present in the
  tree (`src/app/(admin)/admin/formats/ColorSwatchPicker.tsx:118-119` and others) and
  excluded as declared behaviour, in the safe direction.

**This is a stronger statement than any shape list.** It says the module and a real
grammar agree exactly on this tree, rather than that N shapes were thought of.

### 2. The load-bearing mutation — CR-01 put back, behind each round-5 shape

The clearance was reinserted into `PageShell.tsx`'s focus form — the original
phase-blocking regression — hidden behind each of the two shapes that were open in round 5.
`src/components/ui/PageShell.tsx` restored after each, `sha256` equal, `git diff` empty.

| mutation | `verify-conversion.mjs` | verdict |
|---|---|---|
| plain control — clearance in the focus form, no comment | exit **1**, `✗ E the focus branch reads 1 navigation propert(y/ies) — this is CR-01` | SEEN |
| **CR-02 shape** — clearance behind a closer written with whitespace before the brace | exit **1**, same `✗ E` | **SEEN** |
| **CR-01 shape** — clearance live on the terminating line of a two-line JSX comment | exit **1**, same `✗ E` | **SEEN** |

Check A was tested the same way on a scanned file (`src/components/ui/Button.tsx`) with a
palette utility as the needle:

| mutation | result |
|---|---|
| plain control — the utility, no comment | exit **1**, `✗ A 28 raw palette utilit(y/ies) reachable from a converted surface` |
| CR-02 shape hiding the utility | exit **1**, same failure, hit reported at the right line |
| CR-01 shape hiding the utility | exit **1**, same failure |
| **DEF-41-02 control** — the same utility QUOTED INSIDE a comment body | exit **0**, green | 

The last row matters as much as the first three: the fix did not buy visibility by
handing comments back as code.

### 3. The debt counter — unmoved, beside a proof it can move

Round 5 measured the defect live on `src/components/admin/RefundDialog.tsx`, a
`REMAINING`-listed money-domain file, and got exit 0 with a printed instruction to delete
the entry as *"converted; remove this entry"*. **That file is no longer on `REMAINING`** —
plan `41.1-17` converted it in wave 7, and `41.1-24` deleted the entry after re-deriving
the shell count with a needle count that does not use the shared stripper. So the
equivalent entry was used: `src/app/(public)/tickets/[id]/RefundRequestButton.tsx`, a
hand-rolled overlay on a refund request — money leaving.

| mutation on that file | measured shells | `REMAINING` | STALE | conversion notice | exit |
|---|---|---|---|---|---|
| control, unmutated | 8 | 8 | none | no | 0 |
| CR-02 shape above the shell | 8 | 8 | none | no | 0 |
| CR-01 shape wrapping the shell line | 8 | 8 | none | no | 0 |
| **negative control — the shell genuinely removed** | **7** | **7** | **`! B 1 REMAINING entr(y/ies) are STALE`** | **yes** | 0 |

An unmoved number is a claim. An unmoved number beside a counter proved able to move on
the same file in the same session is evidence. **CLAUDE.md constraint 4 is satisfied by
the fourth row, not the second and third.**

---

## The shape hunt — pressing on the difference between the two wordings

Phase 41's truth says *"under every form a JSX/block comment can legally take"*. Phase
41.1's criteria are weaker. The difference was pressed with seventeen shapes handed
verbatim to the shipped module — the two round-5 shapes plus fifteen constructed against
its own declared limits. **Legality was not assumed: each candidate was parsed with
TypeScript 5.9.3 as TSX and confirmed to produce zero diagnostics.**

| # | shape | result |
|---|---|---|
| S4 | two-line JSX comment, live code after the closer on the terminating line | **live code returned** |
| S5 | closer written with whitespace before the closing brace | **live code returned** |
| N1 | closer alone on its own line, code on the next | live code returned |
| N2 | CRLF endings around a multi-line comment | live code returned |
| N3 | a string literal containing the block terminator | live code returned |
| N4 | a string literal containing an opener, not at line start | live code returned |
| N6 | a nested opener inside a comment body (JS comments do not nest) | live code returned |
| N8 | a regex literal whose first characters form an opener | live code returned |
| N9 | a `//` comment quoting an opener | live code returned |
| N10 | terminating line indented with a tab, code after the closer | live code returned |
| N11 | several spaces and a tab before the closing brace | live code returned |
| N13 | a block comment inside a JSX opening tag, live code after | live code returned |
| N14 | two closed comments on one line, then live code | live code returned |
| N7 | the terminator split across a newline — genuinely NOT a closer in JS | correctly **reported unterminated** |
| U1 | an opener that never closes | correctly **reported unterminated** |
| **N5** | **a template literal whose content begins a line with an opener** | **blanks to EOF — but REPORTS unterminated** |
| **N12** | **`{`, comment, then the closing brace on the LINE AFTER the terminator** | **blanks to EOF — but REPORTS unterminated** |

### Shape N+1 exists, and its direction is inverted

**N12 is a new finding, and it is legal JSX** — TypeScript parses it with zero
diagnostics. `JSX_COMMENT_CLOSE_RE` (`comments.mjs:147`) matches the block terminator,
optional whitespace and the closing brace *within one line*; when the brace is on the next
line the state never clears. N5 is the module's own declared limit — an opener at line
start inside a string — reached through a template literal.

**But neither hides anything.** Both are *reported*, and every consumer refuses on the
report. Measured on the real gate path, N12 inserted above a real shell:

```
FATAL: src/app/(public)/tickets/[id]/RefundRequestButton.tsx:51 opens a jsx comment that never closes.
       The shared stripper (scripts/lib/comments.mjs) cannot say where that comment ends,
       … NOTHING WAS MEASURED.
exit 2
```

and on `verify-conversion.mjs` with the needle behind it: `FATAL:
src/components/ui/Button.tsx:1 …`, exit **2**. Not exit 0 with a conversion notice.

**Is the module's declared limit an honest boundary or the same hole with a sign on it?
It is an honest boundary, on three measured grounds**, and the distinction is the finding:

1. **The error direction is inverted from rounds 1–5.** Every previous shape produced a
   silent green over hidden debt. These produce a refusal that says *nothing was
   measured*. Round 5's own `missing` item (a) asked for exactly this inversion —
   *"a false red is investigated; a false green is invisible"* — and named it the safe
   direction. The phase got what its gap write-up asked for.
2. **The residual is not ordinary code, and the closed shapes were.** A two-line comment
   and a space before a brace are things anybody writes without noticing. An opener at
   line start inside a template literal is not. N12 sits between the two and is the one
   worth recording.
3. **Measured on the tree: zero.** No file under `src/` or `scripts/` trips the
   unterminated report, and the parser differential found zero divergence of any kind on
   287 files. The module's own header claims *"zero of the 263 files under `src/`"*; the
   walk is now 264 and the answer is still zero, re-measured here rather than read.

**Recorded as a follow-up, not as a gap.** `comments.mjs`'s shape list (`:70-99`) names
S1–S5, W3, W4 and U1 and does not name N12; the honest correction is one line in that
list plus one row in `verify-comment-stripper.mjs`'s matrix, deciding whether N12 becomes
a supported shape or a documented refusal. Left to a plan, because `DEF-41.1-24-01` and
`meta-gates.md` both record what this repository does to a gate that reddens on correct
code: somebody switches it off.

---

## The grep trap — assessed, and it is clean

**The finding first: no round of this phase was affected.**

The default `grep` in this environment is `ugrep` invoked with `-I`, and
`scripts/verify-conversion.mjs` contains **three NUL bytes across lines 2412 and 2416**
(counted with `node`, not with a shell, because NUL cannot be passed in `argv`). The
consequence is real and silent:

```
scripts/verify-conversion.mjs   grep -c "import" → (nothing), exit 1
                                LC_ALL=C /usr/bin/grep -c "import" → 89, exit 0
scripts/verify-dialogs.mjs      both → 38
```

The bytes are deliberate and correct: `permitKey` (`verify-conversion.mjs:2416`) joins
path, line number and digest with NUL precisely because none of the three can contain it —
which is `DEF-41-07` item 3, the fix that made a permitted site a place rather than a
string.

**They cannot have contributed to the churn, and the timestamps settle it:**

| | when |
|---|---|
| `41-GAP-REVIEW-5.md` committed (`359ff1f`) | 2026-08-13 **13:40:51** |
| round-5 `41-VERIFICATION.md` committed (`b07de72`) | 2026-08-13 **13:46:11** |
| the NUL bytes enter `verify-conversion.mjs` (`e1941ab`, plan 41.1-04) | 2026-08-13 **16:45:42** |

Every byte-by-byte check of the git history of that file — 60 revisions walked — finds the
NUL bytes in exactly one commit, three hours *after* the last phase-41 document was
written. All five rounds read a file with no NUL bytes in it.

The one round-5 claim of the shape a silent grep could explain —
*"grep for the three hashes returns 0"*, in the round-5 frontmatter — was a grep over
`git diff` **output**, not over the file, and was made three hours before the bytes
existed. It stands.

**One forward-looking note, because the hazard is now live.** Plan `41.1-04`'s own SUMMARY
records its assertions as run *"all with `command grep`"* — the executor knew. That
knowledge is in a summary, not in the file. **The gate that is invisible to the default
search tool carries no notice saying so**, and the next reader who greps it for a class
name, a token or a debt marker will get a clean-looking nothing. A one-line note beside
`permitKey` would close it; it is not a phase-41 gap and is recorded here so the next
round does not rediscover it.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | One implementation per recurring pattern exists | ✓ VERIFIED (unchanged) | `src/components/ui/{Button,Chip,Input,Card,PageShell,Typography,Dialog,DataTable,Checkbox,Skeleton}.tsx` present, exported, wired |
| 2 | Roadmap criterion 1 — no surface shows the pattern until whole-converted, checked mechanically | ✓ VERIFIED — **the caveat is gone** | `node scripts/verify-conversion.mjs` exit **0**, `CONVERSION_OK — all five checks passed over 28 declared surface(s), 157 file(s) scanned`, re-run this pass. The mechanism hole that carried the caveat for five rounds is closed and proved by mutation (above) |
| 3 | Roadmap criterion 2 (DS-08) — dialog opens as sheet/window, closes with Escape | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `Dialog.tsx:251` `showModal()`; check A measures the primitive's signature at its expected counts in 337 live lines. H41-2, A2 still open |
| 4 | Roadmap criterion 3 (DS-09) — dense table reads as cards on phone | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `DataTable.tsx:391` `md:hidden`. H41-3 unobserved |
| 5 | Roadmap criterion 4 (RESP-01, RESP-02, RESP-04) — every converted surface workable, and the guard against silent recurrence holds | **↑ was ✗ FAILED, now ? UNCERTAIN** — the guard is closed and proved; the observation is owed | CR-01 stays closed in code (`PageShell.tsx`: the two clearance sites are at `:160` and `:164`, both in the default/wide branch; the focus branch at `:151-157` has neither). **Its reintroduction is now SEEN under both round-5 comment shapes** — three mutations, `✗ E … this is CR-01`, exit 1 each. RESP-04's mechanical half: check E reports the two files declaring the column clearance are exactly the two mounting the responsive navigation form. RESP-01/02's behavioural half: H41-1, unobserved |
| 6 | Roadmap criterion 5 (RESP-03) — touch targets finger-sized, large touch screens included | ? UNCERTAIN — class-string check only, no device ever used (unchanged) | `npm run verify:touch-targets` exit 0 this run (the nine reds `DEF-41.1-24-01` recorded were repaired by plan 41.1-25). H41-4 still `human_needed`, not ticked |
| 7 | The goal's own claim — "proven on its first eight whole surfaces" | ✗ NOT MET as a human-observed fact, PARTIAL (unchanged) | `41-CR01-PASS.md` rows 1–6 of 13 carry `measured, headless — offset 0px`, dated 2026-08-13; rows 7–13 read `pending`. Not upgraded here: a headless browser is not a device, and that document says so in its own §1a |
| 8 | The eight declared surfaces are declared converted | ✓ VERIFIED — and grown | `CONVERTED.length === 28`; the phase-41 eight — `/payment/callback`, `/login`, `/register`, `/set-password`, `/gallery`, `/admin/formats`, `/admin/members/register`, `/admin/members` — are all still present, with 20 added by phase 41.1. Growth is not a regression of this truth |
| 9 | One command runs every gate and reports refusal distinctly from failure | ✓ VERIFIED — independently re-run this pass | `npm run verify` → exit **0**, `VERIFY_OK — 16 gate(s) passed`, 0 FAILED, 0 REFUSED, 1 not run (`verify:redirects`, needs a server), 17 accounted for |
| 10 | The remaining conversion units are explicitly deferred to 41.1/41.2 | ✓ VERIFIED (unchanged) | `.planning/REQUIREMENTS.md:251-257` |

**Score: 5/10 fully verified (1, 2, 8, 9, 10). 0 FAILED. 5 pending human observation
(3, 4, 5, 6, 7).**

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/components/ui/PageShell.tsx` | focus form reserves no navigation clearance | ✓ VERIFIED, unchanged since round 1 | clearance sites at `:160`, `:164`, both default/wide; focus branch `:151-157` carries neither |
| `scripts/lib/comments.mjs` | **one** stripper, blanking only a comment's own span | ✓ VERIFIED — exists, substantive (311 lines), wired into eleven gates, and **agrees with TypeScript's parser on 287/287 files** | `:147` the run-time-assembled closer regex (CR-02); `:262-298` `liveLinesFrom`, the resume branch at `:276-284` (CR-01); `:189-193` the per-opener `searchFrom` (WR-04) |
| `scripts/verify-conversion.mjs` | imports the shared stripper, carries no private copy | ✓ VERIFIED | `:421` the import; `:584-598` a cache-and-refuse wrapper only; `:532-559` the superseded paragraph kept in place with the measurement that retired it |
| `scripts/verify-dialogs.mjs` | same, plus a self-check on the real multi-line path | ✓ VERIFIED | `:283` the import; `:399` the wrapper; `:1687-1694` the self-check through `liveLinesFrom` on line arrays; `:1023-1075` the four multi-line rows |
| `scripts/verify-comment-stripper.mjs` | proves the module by asserted mutation, outside the repository | ✓ VERIFIED — run this pass, exit **0** | `:402` `mkdtempSync(tmpdir())`; `:413-424` each probe read back and asserted byte-equal **before** any result is read, refusing otherwise. Prints the merged column beside the four incumbent families so defect and repair read on one page |
| `scripts/verify-dialogs.mjs` `neverOpenedReason()` | existence guard covers all three branches, asked case-exactly | ✓ VERIFIED — DEF-41-07 items 1 and 4 closed | `:1619` the single hoisted guard; `:1455-1459` `existsCaseExact`; both proved by mutation on the house APFS volume |
| `scripts/verify-conversion.mjs` `permitKey` | a permitted site is a place, not only a string | ✓ VERIFIED — DEF-41-07 item 3 closed | `:2416`, joined on NUL |
| `scripts/verify-conversion.mjs` exit-code header | no refusal advertised that cannot fire | ✓ VERIFIED — DEF-41-07 item 2 closed | `:327-340`, sentence and branch both deleted, the withdrawn clause quoted beside the measurement |
| `.planning/phases/41-…/41-CR01-PASS.md` | 13 rows | ⚠️ PARTIAL, unchanged — rows 1–6 headless-measured, 7–13 `pending` | re-read this round |
| `.planning/phases/41-…/41-RELEASE-PASS.md` | H41-1…H41-6 | ⚠️ PARTIAL, unchanged — blanket authorisation, no itemised evidence, H41-4 `human_needed` | `§9`, re-read this round |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| a multi-line JSX comment's terminating line on `PageShell.tsx` | check E's frozen digests | `liveLinesFrom` | ✓ **WIRED** — was NOT WIRED for five rounds | clearance behind the shape → exit 1, `✗ E … this is CR-01` |
| a comment closed as terminator-space-brace | checks A and E | `liveLinesFrom` | ✓ **WIRED** | same, and check A reddened on a palette needle behind the same shape |
| a hand-rolled shell behind either shape | `verify-dialogs` check B and the `REMAINING` counter | `liveLinesFrom` | ✓ **WIRED** | counter held at 8 under both shapes; fell to 7 with the shell genuinely removed |
| a probe row | the dialogs matcher self-check | `liveLinesFrom(probe.line)` on a **line array** | ✓ **WIRED** — was NOT WIRED | regressing the module made the self-check refuse, naming both multi-line rows |
| a `REMAINING` entry with a bad or mis-cased path | a FAILURE, not a refusal | `existsCaseExact` before all three branches | ✓ **WIRED** | both mutations → exit 1 |
| eleven gates | one stripper | `import { liveLinesFrom } from './lib/comments.mjs'` | ✓ WIRED | `verify-{conversion,dialogs,tables,tokens,touch-targets,breakpoints,media-strip,no-viewport-read,semantic-separation,sunset-gradient,comment-stripper}.mjs` |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data flows | Status |
|---|---|---|---|---|
| `verify-conversion.mjs` check A/E | live lines of 157 scanned files | `liveLinesFrom` over the real file bytes | yes — 27 072 comment lines blanked, 0 characters of code blanked (parser differential) | ✓ FLOWING |
| `verify-dialogs.mjs` check B | live lines of 257 opened files of 264 walked | same | yes — measured shells 8, moves to 7 when a shell is removed | ✓ FLOWING |
| `verify-dialogs.mjs` self-check | 14 probe rows, 4 multi-line | `liveLinesFrom` on line arrays | yes — regressing the module flips the rows | ✓ FLOWING |
| `verify-comment-stripper.mjs` matrix | 8 probe files | written to a temp dir outside the repo, read back, asserted byte-equal | yes — regressing the module flips exactly the regressed shape's cell to BLIND | ✓ FLOWING |

### Behavioral Spot-Checks

| Behaviour | Command | Result | Status |
|---|---|---|---|
| the whole suite | `npm run verify` | exit 0 · `VERIFY_OK — 16 gate(s) passed` · 0 FAILED · 0 REFUSED · 1 needs a server | ✓ PASS |
| the typecheck (the only product-wide gate that exists) | `npm run build` | exit 0 | ✓ PASS |
| the stripper's own gate | `node scripts/verify-comment-stripper.mjs` | exit 0 · `COMMENT_STRIPPER_OK` · all eight shapes ok in the merged column · four incumbent families printed beside it, each still BLIND or FALSE-RED where it was | ✓ PASS |
| CR-01 closed in code | read `src/components/ui/PageShell.tsx:151-164` | two clearance sites, both default/wide; focus branch has neither | ✓ PASS |
| CR-01 SEEN if reintroduced, plain | mutate the focus form, run `verify-conversion.mjs` | exit 1 · `✗ E … this is CR-01` | ✓ PASS |
| CR-01 SEEN behind the CR-02 shape | same, comment inserted | exit 1 · same `✗ E` | ✓ PASS |
| CR-01 SEEN behind the CR-01 shape | same | exit 1 · same `✗ E` | ✓ PASS |
| check A reddens behind both shapes | palette needle on `Button.tsx` | exit 1 each · `✗ A` | ✓ PASS |
| check A does NOT redden on a comment body | the same needle quoted inside a comment | exit 0 | ✓ PASS (no false red) |
| the `REMAINING` counter can move | remove a real shell | 8 → 7, STALE printed, conversion notice printed | ✓ PASS (negative control) |
| the `REMAINING` counter does NOT move behind either shape | shapes inserted above a real shell | 8 → 8 both times | ✓ PASS |
| the dialogs self-check sees a stripper regression | undo the CR-01 fix in `comments.mjs` | exit 2 · *"the overlay matcher disagrees with its own description on 2 of 14 fixed probe(s)"*, both multi-line rows named | ✓ PASS |
| … and the other one | undo the CR-02 fix | exit 2 · *"2 of 14 matcher probe(s) open a comment that never closes"* | ✓ PASS |
| a typo'd `REMAINING` path FAILS, not refuses | add a non-existent path | exit 1 · `✗ B … name a path that does not exist` | ✓ PASS |
| a CASE-typo'd `REMAINING` path FAILS on APFS | add `ui/dialog.tsx` for `ui/Dialog.tsx` | exit 1 · same failure | ✓ PASS |
| the stripper agrees with a real parser | 287-file character differential against TypeScript 5.9.3 | 0 BLIND, 0 FALSE-RED, 0 unterminated | ✓ PASS |
| **`verify-conversion.mjs` notices a stripper regression on its own** | undo either fix, run it alone | **exit 0 both times** | ⚠️ **see Anti-Patterns** |
| repository untouched | `git status --porcelain`, `git diff --stat`, per-file `git diff` | only the two pre-existing untracked `.planning/phases/44-*`/`45-*` directories; every mutated file `sha256`-identical to its pre-mutation copy | ✓ PASS |

**Six repository files were mutated and restored** — `PageShell.tsx`, `Button.tsx`,
`RefundRequestButton.tsx`, `(work)/layout.tsx`, `scripts/lib/comments.mjs`,
`scripts/verify-dialogs.mjs`. Every mutation was asserted applied (`sha256` differs **and**
the inserted marker present, or the replaced text asserted absent) before its result was
read, and asserted restored (`sha256` equal to the pre-mutation copy, `git diff` empty).
No Supabase read or write, no migration, no seeding, nothing sent anywhere.

### Probe Execution

`find scripts -path '*/tests/probe-*.sh'` → none. `scripts/probe-forged-identity.sh` exists
but belongs to the identity work, is not declared by any phase-41 or 41.1 plan, and needs
credentials. **SKIPPED — no probe declared or discovered for this phase.**

### Requirements Coverage

| Requirement | Source | Status | Evidence |
|---|---|---|---|
| DS-07 | Phase 41 → 41.1 → 41.2 | PARTIAL — layer complete, adoption continues | `.planning/REQUIREMENTS.md:125,251` unchecked. `CONVERTED.length === 28` of ~34 |
| DS-08 | Phase 41 → 41.2 | PARTIAL — primitive verified, behaviour unobserved | `:126,252` unchecked; H41-2 and A2 open |
| DS-09 | Phase 41 → 41.1 | PARTIAL — primitive verified, judgement unobserved | `:127,253` unchecked; H41-3 open |
| RESP-01 | Phase 41 → 41.1 → **41.2** | PARTIAL — **must not close here.** The guard against silent recurrence is now closed and proved; *every surface* is 41.2's, by a written human pass | `:132,254` unchecked — *"says every surface, so it closes only in 41.2 … no script can close it"* |
| RESP-02 | Phase 41 → 41.1 → 41.2 | PARTIAL — the shell owns the maximum; inheritance continues | `:133,255` unchecked |
| RESP-03 | Phase 41 → 41.1 → 41.2 | PARTIAL — **human evidence still owed and never once produced** | `:134,256` unchecked; H41-4 `human_needed`, not ticked |
| RESP-04 | Phase 41 — *"lands whole in 41"* | PARTIAL — mechanical half verified, observable half unobserved | `:135,257` unchecked. Check E: the two files declaring the column clearance are exactly the two mounting the responsive navigation form. H41-6a's count was never reported |

All seven remain PARTIAL. **No orphaned requirements** — every ID `.planning/REQUIREMENTS.md`
maps to Phase 41 appears in this phase's plans, and no plan claims one that is not mapped.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `scripts/lib/comments.mjs` | 147 | `JSX_COMMENT_CLOSE_RE` matches the terminator, optional whitespace and the brace **within one line**; a legal JSX comment with the brace on the next line is reported unterminated and every consumer refuses | ⚠️ Warning — **new this round (N12)** | A false refusal, not a false green. Zero occurrences in the tree. The risk is the one `DEF-41.1-24-01` names: a gate that reddens on correct code is a gate somebody switches off |
| `scripts/lib/comments.mjs` | 58-62 | declared limit — a line whose first characters are a block opener **inside a string** blanks more than it should | ⚠️ Warning, declared and honest | Reached only through a template literal starting a line with an opener; zero occurrences; and it now surfaces as a refusal rather than a silent blank. Assessed above as an honest boundary |
| `scripts/verify-conversion.mjs` | 2412, 2416 | three NUL bytes make the file **invisible to `grep -I`**, silently, with no notice in the file | ⚠️ Warning — **new this round** | The bytes are correct (`permitKey`); the missing notice is the defect. Did NOT affect any of the five rounds — see the grep-trap section |
| `scripts/verify-conversion.mjs` | — | has **no self-check of its own**: regressing the shared stripper left it at exit 0 both times, while `verify-dialogs` and `verify-comment-stripper` both caught it | ℹ️ Info | Not a hole in the suite — `npm run verify` runs all sixteen and would go red — but the largest gate is the one that would not notice alone |
| `scripts/lib/comments.mjs` | 70-99 | the shape list names S1–S5, W3, W4, U1 and does not name N12 | ℹ️ Info | One line of prose plus one matrix row would close it |

**No `TBD`, `FIXME` or `XXX` in any file this phase or its repairs touched** —
`scripts/lib/comments.mjs`, `scripts/verify-comment-stripper.mjs`,
`scripts/verify-conversion.mjs`, `scripts/verify-dialogs.mjs`,
`src/components/ui/PageShell.tsx` all return 0 (`LC_ALL=C /usr/bin/grep -c -E`, the only
form that reads the first of those files at all).

### Human Verification Required

**Unchanged since round 1 in kind, and this is now the whole of what is left.** Seven
items, listed in the frontmatter. The two that decide requirements nothing else can:

- **H41-4 — the smallest control on a large touch screen, measured.** `41-RELEASE-PASS.md`
  records that no large touch screen was ever stated available. It is `human_needed`, not
  ticked, and it is the **only** thing in this repository that would prove anything is
  44px. RESP-03 cannot close without it.
- **H41-2d / assumption A2 — whether the page behind an open dialog scrolls.** Open since
  research, nothing reported.

Plus `41-CR01-PASS.md` rows 7–13, and H41-1's itemised evidence — approved by a blanket
authorisation with nothing itemised, and not upgraded by this report.

---

## What a green does NOT mean

Written here in the same discipline the gates use in their own headers, because a report
that ends on sixteen ticks invites the reading it should prevent.

1. **`npm run verify` exit 0 proves no behaviour whatsoever.** It runs no product code and
   executes no test — **there is no test runner in this repository** (`CLAUDE.md`
   Guardrail 1). It reads class strings and import clauses, renders nothing and measures
   no pixel. The gates say this themselves; it is repeated because this report is the
   document somebody will cite.
2. **`status: human_needed` is not `passed`.** Five of ten truths rest on an observation
   nobody has made. Nothing here says a surface is workable, that a dialog behaves as a
   sheet, that a table is comprehensible as a card, or that any target is finger-sized.
3. **The parser differential is about this tree, on this date.** 287 files, zero
   divergence. It is not a proof that the module is correct on every input — N12 and N5
   are two inputs on which it is not. It is a proof that on the code the gates actually
   read, the module and a real grammar agree exactly.
4. **The comment stripper's remaining divergence is loud, not silent — and "loud" is a
   claim about the exit code, not about anybody hearing it.** This project has **no error
   tracking** (`meta-gates.md`, measured 2026-08-05). An exit 2 in CI is observable; an
   exit 2 nobody runs is not.
5. **A closed guard is not a closed regression.** CR-01 stays closed in code and its
   reintroduction is now seen. That says the gate would catch a *future* reintroduction of
   *that* shape on *that* file. Check E still reads one file and asks the mount question
   of an import graph; a clearance reaching a focus route from an ordinary ancestor layout
   remains outside what it can see, as its own header says.
6. **Phase 41.1's SUMMARYs were not taken on trust, and neither should this report be.**
   Every closure above was re-derived by running a command or reading a line. Where a
   claim was accepted on a scoped budget it is named: `41-29-SUMMARY.md`'s M1–M5 mutation
   table was **not** re-run — it describes code that no longer exists, having been replaced
   wholesale by the shared module, and the module's own gate supersedes it.
7. **`REMAINING = 8` is not progress and is not safety.** It is eight hand-rolled overlays
   still standing, every one of them on the public purchase, drinks or ticket path,
   including the one that shows a venue.

---

## Gaps Summary

**None.** For the first time in seven passes this phase carries no open mechanical gap.

- **Group A** — the comment-stripping heuristic, open five consecutive rounds — is closed
  by plan `41.1-01`, re-derived here three independent ways: a character-level differential
  against TypeScript's parser over 287 files with zero divergence; CR-01's own
  reintroduction seen by check E behind both round-5 shapes; and a debt counter that held
  at 8 under both shapes while a negative control proved it can fall to 7.
- **The debt-goes-quiet defect**, four mechanisms deep, has no fifth: the shape it would
  need is reported, not swallowed.
- **Group A follow-on WR-01** — the dialogs self-check — is closed by plan `41.1-02` and
  proved by regressing the module and watching the self-check name both rows.
- **Group B / DEF-41-07**, all four items, closed by plans `41.1-02` and `41.1-04`, two of
  them proved by mutation on the house filesystem.
- **Group C's structural half (DEF-41-08)** was routed to 41.1 and is recorded as deferred,
  with its limit still declared in the gate's own header.

**One new finding, recorded and not blocking:** shape N12 — a legal JSX comment whose
closing brace sits on the line after the terminator — makes the shared stripper report an
unterminated comment and every consumer refuse. **Its direction is inverted from all five
previous rounds: a refusal that says nothing was measured, never a green over hidden debt.
That inversion is what round 5's own gap write-up asked for.** Zero occurrences in the
tree; the honest correction is one line in `comments.mjs`'s shape list and one row in the
stripper gate's matrix.

**What is actually left is a person.** Seven observations, unchanged since round 1, and
`RESP-03` cannot close until somebody holds a large touch screen.

---

_Verified: 2026-08-14T03:10:00Z_
_Verifier: Claude (gsd-verifier), round 6_
