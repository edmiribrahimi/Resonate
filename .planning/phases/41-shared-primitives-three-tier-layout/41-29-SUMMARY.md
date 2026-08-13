---
phase: 41-shared-primitives-three-tier-layout
plan: 29
subsystem: verification-gates
tags: [gap-closure, comment-stripper, mutation-testing, DEF-41-02, CR-01, CR-02]
requires:
  - "scripts/verify-conversion.mjs at ae3a910"
  - "scripts/verify-dialogs.mjs at ae3a910"
provides:
  - "liveLines() blanking only the leading comment SPAN, identically in both gates"
  - "MATCHER_PROBES routed through the shipped stripper, ten probes"
  - "both headers stating the bound the code has, with the withdrawn claim quoted"
affects:
  - "verify-conversion check A, check D, check E and both frozen digests"
  - "verify-dialogs check B"
tech-stack:
  added: []
  patterns:
    - "each comment opener paired with ITS closer, closer sought from the opener's last character"
    - "consumed span replaced by the same number of spaces, so no column moves"
    - "self-check probes measure the stripper, not only the matcher"
key-files:
  created: []
  modified:
    - scripts/verify-conversion.mjs
    - scripts/verify-dialogs.mjs
decisions:
  - "D-41-29-01 — the block-comment half of the defect is fixed here too, not only the JSX one"
  - "D-41-29-02 — isSiblingCommentLine is removed rather than left dead: its four shapes now live in CLOSING_COMMENT_OPENERS with their closers"
  - "D-41-29-03 — neither frozen digest re-frozen; the moved digest is reported as a finding, never copied in"
metrics:
  duration: one session
  completed: 2026-08-13
---

# Phase 41 Plan 29: The stripper blanks the comment, not the line — Summary

`liveLines()` now consumes only a leading comment's own span instead of the whole
line, identically in both gates, and the shape that hid a navigation clearance, a
raw palette colour and an undeclared dialog overlay on green runs is red on all
three checks.

## What changed

`liveLines()` blanked a **whole line** whenever its trimmed text merely *started*
with one of four comment openers. A blanked line trims to the empty string and is
skipped downstream, so the closed one-line form — a comment that opens and closes
on its own line, followed by live code after the closer — hid that code from every
consumer of the helper. Roughly eleven call sites in `verify-conversion.mjs` and
nine in `verify-dialogs.mjs`.

The helper now walks the line's leading comments, pairs each opener with **its**
closer, and replaces the consumed span with the same number of spaces:

| Opener | Closer | Behaviour |
|---|---|---|
| JSX opener | JSX closer | span consumed; unclosed → whole line blanked, multi-line state entered as before |
| block opener | block closer | span consumed; unclosed → whole line blanked, as before |
| docblock continuation star | block closer | span consumed; unclosed → whole line blanked, as before |
| double slash | — | whole line blanked, always — everything after it genuinely IS the comment |

The closer is sought from the opener's **last** character rather than from past
it, so a bare closing line and the degenerate form in which the opener's own star
begins the closer keep blanking whole exactly as they did before.

The span becomes spaces rather than being cut out because `findUtilityHits`
computes its tolerated-scrim test from a match's column: a shortened line would
move what it reads.

`isSiblingCommentLine()` is removed rather than left dead — its four shapes now
live in `CLOSING_COMMENT_OPENERS` with the closers that end them.

## The two copies of the helper are byte-identical

DEF-41-02 keeps these gates self-contained on purpose, so one fix had to be
applied twice. Proven, not asserted — the region from `const JSX_COMMENT_OPEN` to
the closing brace of `liveLines` was extracted from each file and diffed:

```
node -e '... cut both files from "const JSX_COMMENT_OPEN" to the end of liveLines ...'
  → conversion bytes 4352   dialogs bytes 4352
diff helper-conversion.txt helper-dialogs.txt
  → (no output)   helper_diff_exit=0
```

## Nothing moved on the real tree

Measured before planning: `src/` carries **zero** lines of the defective form
today, so a correct fix must move no verdict and no printed number. The proof is
stronger than a figure-by-figure comparison — `verify-conversion.mjs`'s **entire
stdout is byte-identical** to the pre-change run:

```
diff conv-before.txt conv-after.txt   → CONV_IDENTICAL
```

| Figure | Before | After |
|---|---|---|
| files scanned by A, B and D | 53 | 53 |
| conversion: lines blanked as JSX comments | 589 | 589 |
| the shell OUTSIDE that window | 25 line(s) | 25 line(s) |
| outside-window digest | `73adc18b…4acc754f` | `73adc18b…4acc754f` |
| sites permitted to read a navigation property | 2 (found outside the permitted set: 0) | 2 (found outside the permitted set: 0) |
| files walked under `src/` | 263 | 263 |
| dialogs: lines blanked as JSX comments | 5 | 5 |
| REMAINING entries declared | 14 | 14 |

`verify-dialogs.mjs`'s stdout differs in **exactly five lines**, all of them the
self-check's own count and its four new probe rows:

```
24c24
<   the matcher self-check — 6 fixed probes, on every run:
>   the matcher self-check — 10 fixed probes, on every run:
31a32,35
>       match     an overlay behind a leading CLOSED JSX comment (41-29, CR-02)
>       match     an overlay behind a leading CLOSED block comment (41-29)
>       no match  a FULL-LINE JSX comment quoting the three parts (DEF-41-02)
>       no match  a docblock CONTINUATION line quoting the three parts (DEF-41-02)
```

**Neither frozen digest was re-frozen.** The diff carries zero added or removed
lines touching any of the three frozen hashes:

```
git diff -- scripts/verify-conversion.mjs | grep -cE "^[-+].*(73adc18b|508027fb|8f9c39ad)"   → 0
```

## The self-check now measures the stripper, not only the matcher

`MATCHER_PROBES` goes from six to ten, and **every** probe is passed through
`stripLeadingComments` before it reaches `isOverlayLine` — because that is the
path a real line takes: check B reads `liveLines`, never the raw file. Measuring
the matcher on a raw string tested half the pipeline and called it the whole of
it. The original six begin with no comment opener, and their verdicts did not
move; all ten agree with their declared verdict on every run. Every probe string
is built from the same assembled parts the existing six use — no contiguous
utility token appears as a literal (DEF-41-01).

## The mutation table

Everything below was **run**, on a disposable sandbox under the session
scratchpad, composed as `41-GAP-REVIEW-4.md`'s Method describes: `scripts/`,
`src/` and `tsconfig.json` copied, `node_modules`, `public/`, `supabase/` and
`.claude/` symlinked. **No file under `src/` was edited in the repository, not
even transiently** — the shapes mutated sit in the shell that four gated surfaces
render through, on the auth screens and on the payment callback, which are
`access-gating` and `ticketing-payments` primary paths where this project
requires the owner's validation before a change.

Utilities below are written in assembled parts: `.planning/` is a Tailwind source
(DEF-41-01) and a contiguous token here would be a live candidate.

### BEFORE and AFTER are two different gates — asserted before any result was read

The BEFORE gates were recovered from this plan's base commit `ae3a910` with
`git show` into `sandbox/scripts-before/`, so `ROOT` still resolves to the
sandbox. Their sha256 was compared with the working-tree copies **before the
first mutation ran**, and the harness exits 9 if they match:

```
verify-conversion.mjs  BEFORE d9fe4798…8a8c959   AFTER 62deef84…3cd8cdbb5   differ: YES
verify-dialogs.mjs     BEFORE 5511488d…b7c2dbd7  AFTER 3eb2ca83…5f0ba0829   differ: YES
```

A harness that ran the same gate twice would report the fix as a no-op or as a
success with equal confidence.

### The harness contract

- Mutations applied by **line TEXT**, with the anchor asserted **unique** in the
  file (`anchor not unique` aborts).
- Every landing asserted **byte-for-byte** — the file re-read and
  `Buffer.equals` against the intended content — **before any result is read**.
  Every one reported `EQUAL (0)`. No substring presence test stands alone.
- Every restore asserted the same way; created files asserted **absent** after
  removal. Every one reported `EQUAL (0)`. The dangerous direction is a harness
  certifying a restore that never happened.
- No substitution tool that can silently quote a newline: the file is written
  whole, every time.

### The rows

| # | Check | File mutated | Mutation line (utilities in assembled parts) | Documented trigger, in the check's own words | BEFORE | AFTER | Control |
|---|---|---|---|---|---|---|---|
| M1 | E — both frozen digests | `src/components/ui/PageShell.tsx`, inserted immediately above `if (width === "focus") {` | `{/` + `*` rail clearance `*` + `/}` `const FOCUS_ROOT_RAILED = FOCUS_ROOT + " " + "p` + `s-` + `[224px]";` | *"`PageShell.tsx`'s code outside the frozen window is not what this gate was shown"* — the refusal prints expected digest, found digest, and every line of live code the digest covers | **green, exit 0** — tick on E, outside-window digest byte-identical to the frozen constant, 25 lines, permitted sites found outside the set **0** | **REFUSED, exit 2** — names the found digest `910af2a1…e1f60c78` and prints the 26 lines verbatim | M1c, the same line without the leading comment: **exit 2 on the BEFORE gate, with the identical found digest `910af2a1…`** |
| M2 | A — raw palette utilities | `src/app/(public)/payment/callback/page.tsx`, above `<Card className="text-center">` | `{/` + `*` outcome tint `*` + `/}` `<span className="text-` + `emer` + `ald-` + `500">ok</span>` | *"raw palette utilities in a converted surface's closure"* — check A reports the utility, the file:line and the route it is reached from | **green, exit 0** — *"✓ A no raw palette utility in 53 file(s) reachable from 8 converted surface(s)"* | **red, exit 1** — *"✗ A 1 raw palette utilit(y/ies) reachable from a converted surface"* | M2c, the same line without the leading comment: **exit 1 on the BEFORE gate** |
| M3 | B — undeclared dialog shells | new `src/components/ui/SandboxProbeSheet.tsx` (sandbox only) | `{/` + `*` the lid `*` + `/}` `<div className="fix` + `ed` `inset-` + `0` `z-` + `[60]" />` | *"file(s) declare a dialog shell and are not on REMAINING"* — check B reports the file, the line and the shape read as a hand-rolled overlay | **green, exit 0** — three ticks, *"✓ B every one of the 14 file(s) still declaring a shell is on REMAINING"* | **red, exit 1** — *"✗ B 1 file(s) declare a dialog shell and are not on REMAINING"*, naming `SandboxProbeSheet.tsx:3` | M3c, the same overlay without the leading comment: **exit 1 on the BEFORE gate** |
| M4 | B — undeclared dialog shells | new `src/components/ui/SandboxProbeStar.tsx` (sandbox only) | `{/` + `*` mind the `*` + `/` gap `*` + `/}` `<div className="fix` + `ed` `inset-` + `0` `z-` + `[60]" />` | same as M3 | **green, exit 0** — three ticks, the overlay invisible | **red, exit 1** — the overlay found and named | M4c, the same overlay without the leading comment: **exit 1 on the BEFORE gate** |
| M5 | B — opposite direction | new `src/components/ui/SandboxProbePairing.tsx` (sandbox only) | `{/` + `*` mind the `*` + `/` it says `fix` + `ed` `inset-` + `0` `z-` + `[60]` `*` + `/}` `<div className="p-4" />` | same as M3, in the direction where a hit would be **false** | **green, exit 0** | **green, exit 0** — REMAINING unmoved at 14, no hit | not applicable: this row asserts a red that must NOT appear |

**On `REMAINING`, precisely.** In every red row above, the **declared** debt list
stays at *"REMAINING entries declared : 14"* — untouched by this plan. What moves
is the gate's *measured* figure, printed as *"of those, carrying a shell : 15"* and
*"REMAINING = 15"*: the sandbox file is reported as a **failure**, not laundered
into the debt list. A shell found on an undeclared file is a failure and not a
debt entry, and that is what the gate did.

### The self-chosen forms, and why

The plan names three comment forms: the closed one-line JSX comment; the block
comment closing on a line that carries trailing code; the docblock-continuation
star reaching a closer with code after it. **M4 and M5 are outside that list**, and
they were chosen to attack the one thing the fix is actually made of — the pairing
of each opener with **its** closer.

M4 and M5 both put a **false block closer inside the prose of a JSX comment**: the
star-slash appears, but not the star-slash-brace that actually ends a JSX comment.
I expected M4 to hide code on the old gate for the ordinary reason (the line starts
with an opener), and I expected M5 to be the trap: an implementation that searched
for whichever closer it saw first — rather than the closer that belongs to the
opener it matched — would cut the line at the false closer, leak the rest of the
**prose** as live text, and report an overlay that exists only inside a sentence.
That is DEF-41-02's original failure re-created by a careless fix, and this phase
has paid for a false red seven times.

Measured: M4 was hidden before and is caught after; **M5 stayed green on both
gates**, so the pairing holds and the fix did not buy its sight by reddening a
correct file. Neither result was smoothed over — M5 is reported as a green
deliberately, because a harness that only ever produces red proves the harness and
not the fix.

### The opposite direction

| Case | Shape | Gate | Result |
|---|---|---|---|
| OD1 | a **full-line** JSX comment quoting the three overlay parts, on its own line | fixed dialogs | **exit 0**, no hit, REMAINING 14 — a genuine comment still costs nothing |
| OD2 | an **unclosed** JSX comment quoting the parts across three lines, closed on the third | fixed dialogs | **exit 0**, no hit, REMAINING 14 — a multi-line prose block still blanks onward to its closer |
| OD3 | the **real repository tree**, not the sandbox | fixed conversion + fixed dialogs | **exit 0** on both; conversion's stdout byte-identical to the pre-change run; both frozen digests unchanged; every figure unchanged |

OD1 and OD2 are the mechanical counterpart of the two "no match" probes now in
`MATCHER_PROBES`, which re-prove the same direction on every run rather than once
in this document.

### Negative control

Unmutated sandbox, **fixed** gates, both exit 0 with the repository's own figures:

```
verify-conversion.mjs  exit=0   the shell OUTSIDE that window : 25 line(s), digest 73adc18b…4acc754f
                                CONVERSION_OK — all five checks passed over 8 surface(s), 53 file(s)
verify-dialogs.mjs     exit=0   REMAINING = 14
                                DIALOGS_OK — all three checks passed
```

### The repository was never touched

```
git status --porcelain -- src/   → (empty), before the first mutation and after the last
git diff --numstat HEAD~1        → 111  21  scripts/verify-conversion.mjs
                                    209  29  scripts/verify-dialogs.mjs
```

No sandbox artefact is inside the repository: the sandbox lives under the session
scratchpad and is deleted with it.

## The docblock sentences withdrawn

Both headers claimed a bound the shipped code did not have, and the claim was
false in a way that mattered: **every mutation that proved this gap involves no
string at all.** Both are quoted in place and withdrawn, in the same commit as the
code beneath them, the way this file family already withdraws a false claim.

**`scripts/verify-conversion.mjs`** — withdrawn:

> *"Its error direction is stated rather than assumed: **it can blank more than it
> should** if a line's first characters are a JSX comment opener inside a string,
> which is why the opener must be at the start of the trimmed line."*

Disproved by a comment that opens and closes on its own line followed by live
code, with no string anywhere in it, measured on three separate checks each with
a control (M1, M2, M3 above).

**`scripts/verify-dialogs.mjs`** — withdrawn:

> *"Its error direction is stated rather than assumed: the opener must be at the
> start of the trimmed line, so the shape **can blank more than it should** only
> when a line begins with a JSX comment opener inside a string."*

Disproved by the same shape on check B: a nineteenth hand-rolled overlay for the
price of one comment, with the gate green (M3, M4 above).

Both files now state the bound in **both** directions — what is still blanked more
than it should be (a line beginning with those characters as part of a multi-line
string literal; a JSX comment closed with a space between the star-slash and the
brace, which blanks onward to its real closer) and what is no longer blanked and
used to be (every character after a leading comment's closer, which is where all
of CR-01 and CR-02 lived). No measured line number was written into either
paragraph: this edit adds lines above numbers two headers already carry, and round
3 recorded exactly that going stale twice.

**Where the phrase still occurs, per file.** A grep for the "inside a string"
wording returns, in `verify-conversion.mjs`, three occurrences: one inside the
quoted withdrawn claim, one in the sentence that records what disproved it, and
one unrelated occurrence in check E's own prose about a brace inside a string. In
`verify-dialogs.mjs` it returns one occurrence — the sentence recording the
withdrawal; the quoted claim itself wraps the phrase across two lines and is not
matched by a single-line grep. **In neither file does the sentence still stand as
a claim.**

## Group B is open and untouched

The diff carries **one** line matching `REMAINING|fenceMatch|neverOpenedReason|RUNG_FAMILY|FULL_BLEED_VIEWER`,
and it is prose inside the withdrawn-claim docblock (*"with `REMAINING` unmoved and
this gate green"*). No hunk touches the mechanism of any of them.

## Verification

- `node scripts/verify-conversion.mjs` → **exit 0**, five ticks, every figure and
  both frozen digests identical to the pre-plan run.
- `node scripts/verify-dialogs.mjs` → **exit 0**, three ticks, REMAINING declared
  14, ten self-check probes agreeing with their declared verdicts.
- `npm run verify` → **exit 2**, recorded verbatim: `verify:conversion 0 passed`,
  `verify:dialogs 0 passed`, thirteen other gates passed, and
  `verify:capabilities 2 REFUSED` with *"missing environment variable(s):
  SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL"*. The aggregate prints
  `VERIFY_REFUSED — 1 gate(s) could not measure`. **This worktree holds no
  `.env.local`, so that refusal is the correct behaviour of a machine without the
  credentials — it is neither a pass nor a failure of this work**, and it stands
  exactly as it stood before the change.
- `npm run build` → **exit 0**, run **after** this document was written, because
  `.planning/` is a Tailwind source (DEF-41-01) and the mutation table above spells
  utilities in assembled parts. The build re-run is the backstop, not the rule.
- **No test runner exists for this product** (Guardrail 1). Everything above is an
  exit code, an exact stdout string, or a byte-for-byte file comparison.

## What this does NOT close

**All seven requirement IDs stay PARTIAL.** DS-07, DS-08, DS-09, RESP-01, RESP-02,
RESP-03 and RESP-04 are untouched by this plan. Nothing here is a surface.

- **Group B, all four items, open and not attempted.** The `NOT IN THE WALK` guard
  covering one of `neverOpenedReason()`'s three branches; the refusal branch the
  exit-code header advertises that derivation shows nothing can reach (WR-01); the
  permitted site keyed on line **text** rather than position (WR-02); and the
  existence check whose verdict differs between a case-insensitive and a
  case-sensitive filesystem (WR-03).
- **Group C's structural half** — making a clearance structurally unable to reach
  the four focus routes from outside the shell — is the **owner's decision**, not
  this round's. It edits product files under the auth group and the payment
  callback, `access-gating` and `ticketing-payments` primary, and belongs to 41.1.
  Group C's honest half is plan 41-30, wave 2.
- **WR-04, WR-05, IN-01 and the `MIN_HEIGHT_RE` / `CENTRING_RE` hole** remain
  recorded as named-and-not-taken.
- **The four sibling gates carry the same shape and were not touched.**
  `verify-tokens.mjs`, `verify-semantic-separation.mjs`, `verify-tables.mjs`,
  `verify-breakpoints.mjs` and `verify-touch-targets.mjs` each declare their own
  stripper — self-contained is the house shape — and the **block-comment half of
  this defect exists in all of them**. DEF-41-06 already asked the phase to decide
  whether the strippers stop being copies of one heuristic. **This plan does not
  answer that question**, and the answer is still the phase's to give.

## The sentence this round says louder than the others

**A gate that can finally fail is not a screen anyone has looked at.**

After five rounds of gate work, the most valuable thing still undone is a person
on a real device, looking at four screens. `41-CR01-PASS.md`'s thirteen rows:
**rows 1–6 were measured on 2026-08-13 in a headless browser, at offset 0px** —
the first observed evidence this phase has produced, and it is real. But a
headless measurement is a measurement of the DOM, not of a screen: **H41-4 stays
`human_needed`**, H41-1…H41-6 are unobserved by a human eye, **rows 7–13 are still
pending**, and RESP-03 is unticked.

There is no error tracking in this project. A gate that goes quiet is not noticed
by anyone until a person opens the screen — and on `/login`, `/register`,
`/set-password` and `/payment/callback`, nobody has.

## Self-Check: PASSED

- `scripts/verify-conversion.mjs` — FOUND
- `scripts/verify-dialogs.mjs` — FOUND
- commit `d4dad2b` (task 1) — FOUND
