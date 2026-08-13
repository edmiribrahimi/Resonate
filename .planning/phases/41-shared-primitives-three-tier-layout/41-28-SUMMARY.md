---
phase: 41-shared-primitives-three-tier-layout
plan: 28
subsystem: verification-gates
tags: [gap-closure, verify-dialogs, not-in-the-walk, existence-guard, mutation-proof]
requires:
  - "scripts/verify-dialogs.mjs as shipped by 41-24 (NEVER_MEASURED_BY_B and the per-entry refusal)"
  - "scripts/conversion-manifest.mjs PHASE_42_PATHS — the other half of the fence, untouched here"
provides:
  - "walked — a Set derived from the same files array check B's loop iterates"
  - "the NOT IN THE WALK refusal reason, evaluated first and guarded on the path existing on disk"
  - "a docblock whose claim is true by derivation, with the false claim it replaces quoted and recorded as false"
affects:
  - "scripts/verify-dialogs.mjs"
tech-stack:
  added: []
  patterns:
    - "derive the third skip category from the loop's own input rather than declaring a fourth list"
    - "guard a new refusal on existence, so a failure is not laundered into 'nothing was measured'"
    - "reverse a false docblock claim in place — quote it, name what made it false, state what is true now"
key-files:
  created: []
  modified:
    - "scripts/verify-dialogs.mjs"
decisions:
  - "D-41-28-A — the third skip category is DERIVED from `files`, not declared: a fourth hand-maintained list would be a fourth occurrence of this defect waiting"
  - "D-41-28-B — the NOT IN THE WALK branch is evaluated FIRST, because a path outside `files` never reaches the loop, so neither the Map nor the fence ever acted on it"
  - "D-41-28-C — the branch is guarded on `existsSync`, so a typo'd REMAINING entry stays a FAILURE rather than becoming a refusal"
  - "D-41-28-D — the false claim is QUOTED and recorded as false rather than deleted; the grep for it returns 1, inside the prose that withdraws it"
metrics:
  duration: "~40 min"
  completed: 2026-08-13
  tasks: 2
  commits: 2
---

# Phase 41 Plan 28: verify-dialogs gap closure round 4 (CR-03) Summary

The dialog gate can no longer report a `REMAINING` entry as *converted* on a file it
never opened, for **any** of the three ways a file goes unopened — and the third of
them is now true by derivation rather than by somebody remembering to edit a second
list.

**This plan closes no requirement. DS-08 stays PARTIAL**, along with DS-07, DS-09,
RESP-01, RESP-02, RESP-03 and RESP-04.

**A gate that can finally fail is not a surface anyone has seen.** Everything below
is an exit code and a printed line from a developer script that reads class strings
and import clauses. Not one of it is a person opening a dialog on a phone. **H41-2
remains unobserved** — whether Escape closes the panel, whether the sheet rises from
the bottom edge below 768 px — and **assumption A2, the scroll lock, remains open**.
This round corrected a debt counter; it did not observe a sheet, a window or an
Escape key.

## What shipped

| Change | File | Commit |
|---|---|---|
| CR-03 — `walked` derived from `files`; the `NOT IN THE WALK` branch, first and existence-guarded; the false docblock claim quoted and withdrawn; the refusal's closing options widened to name the walk | `scripts/verify-dialogs.mjs` | `91ebe24` |
| The probe suite — ten probes, five of them reproduced on the pre-fix gate first; no code change, the evidence is this document | — | this SUMMARY's commit |

`scripts/conversion-manifest.mjs` was **not touched**: this round's probes mutated the
`REMAINING` list, never either fence list, so the lockstep drift refusal ran on
unmodified inputs and could not redden for the wrong reason (the trap recorded in
`41-16-SUMMARY.md` and paid again in `41-18-SUMMARY.md`).

## The trigger that was mutated, in the gate's own words

**Trigger, verbatim from the refusal this gate already prints:** *"This gate cannot
tell a debt somebody PAID from one it simply never opened — and left alone it reports
the second as the first, marking the entry STALE (`converted; remove this entry`) and
dropping REMAINING by one. A debt counter that falls because the gate stopped looking
is worse than no counter."*

**Site mutated:** `REMAINING` inside the **shipped** `scripts/verify-dialogs.mjs` — the
live regression site, and the same data a real defect would arrive in. No disposable
copy was used: round 3's review proved this gap on a copy while the gap lived in the
shipped file, and a copy is a different artifact.

**The docblock sentence that was false**, quoted verbatim in the file where it stood:
*"the set that decides what is skipped IS the set the refusal is keyed on, and the two
cannot drift apart by an edit to either."*

## The probe table

Baseline before any probe: `node scripts/verify-dialogs.mjs` exit **0**, `REMAINING =
14`, `REMAINING entries declared : 14`, 263 walked, 7 never opened, 256 opened.

Every probe added **one** entry to `REMAINING`, so the declared count reads 15 on every
row that reaches a count.

### On the pre-fix gate (base commit) — the defect, reproduced rather than argued

| # | Entry | Exit | `converted; remove this entry` | `REMAINING` | What the gate said |
|---|---|---|---|---|---|
| B1 | `src/app/globals.css` | **0** | **yes** | **14** vs 15 declared | `! B 1 REMAINING entr(y/ies) are STALE`, `→ converted; remove this entry`, `DIALOGS_OK` |
| B2 | `package.json` | **0** | **yes** | **14** vs 15 declared | identical |
| B3 | `src/components/ui` (directory) | **0** | **yes** | **14** vs 15 declared | identical |
| B4 | `src/components/UI/Dialog.tsx` (wrong case) | **0** | **yes** | **14** vs 15 declared | identical |
| B5 | `src/components/admin/RefundDialogg.tsx` (typo) | **1** | no | 14 vs 15 declared | `✗ B … names a path that does not exist`, `DIALOGS_FAIL` — **the direction that had to survive** |

### On the shipped gate after the fix

| # | Entry | Exit | `converted; …` as a **verdict** | `REMAINING` | Reason line the gate gave |
|---|---|---|---|---|---|
| P1 | `src/app/globals.css` — the CR-03 probe itself | **2** | **no** | **not printed** | `NOT IN THE WALK — this path is on disk, and this gate's walk does not produce it. The walk covers files under src/ carrying one of these extensions: .ts, .tsx, .js, .jsx, .mjs, .cjs.` |
| P2 | `package.json` — outside `src/` entirely | **2** | **no** | not printed | same `NOT IN THE WALK` reason |
| P3 | `src/components/admin/RefundDialogg.tsx` — does not exist | **1** | no | **14** vs 15 declared | `✗ B 1 REMAINING entr(y/ies) name a path that does not exist`, `DIALOGS_FAIL — 1 check(s) failed: B`. **Still a failure, not a refusal** |
| P4 | `src/components/ui/Dialog.tsx` — the primitive | **2** | **no** | not printed | `the primitive itself` / *"check B measures copies OF it — the one implementation cannot be one of its own copies"* |
| P5 | `src/components/media/Lightbox.tsx` — the declared exemption | **2** | **no** | not printed | `exempt — measured and declared correct` / *"a full-bleed media viewer, right to be a native shell and wrong to be a sheet…"* |
| P6 | `src/components/scanner/ScanFlash.tsx` — behind the Phase 42 fence | **2** | **no** | not printed | `fenced — behind that glob, never opened; a SCOPE BOUNDARY that says nothing whatever about this file's markup`, `behind: src/components/scanner/**` |
| P7 | `src/utils/formatTime.ts` — real, **walked**, carries no shell | **0** | **yes, as the verdict** | **14** vs 15 declared | `! B 1 REMAINING entr(y/ies) are STALE`, `src/utils/formatTime.ts → converted; remove this entry`, `✓ B`, `DIALOGS_OK`. **The case the new branch must not swallow** |
| P8 | **INVENTED** — `src/components/ui` , a **directory** | **2** | **no** | not printed | `NOT IN THE WALK …` |
| P9 | **INVENTED** — `src/components/UI/Dialog.tsx`, **wrong case** on a case-insensitive filesystem | **2** | **no** | not printed | `NOT IN THE WALK …` |
| P10 | **INVENTED** — `src/components/ui/DialogSymlinkProbe.tsx`, a **symlink** with a scanned extension | **2** | **no** | not printed | `NOT IN THE WALK …` |

**On the `converted; remove this entry` column, honestly.** On every refusing row the
string *does* appear once in the raw output — inside the refusal's own prose explaining
the outcome it prevents. Measured the way round 3 measured the same nuance: a count of
lines matching `✓ B|✗ B|! B |DIALOGS_OK|DIALOGS_FAIL|REMAINING = |converted; remove this
entry` over each refusing run returns **1**, and that one line is the prose. **No tick,
no count, no STALE verdict** is emitted about the offending entry. On P7 the same count
returns **5**, and they are the real verdict lines.

### Why these three were the invented ones

The plan asked for forms it does not name, chosen adversarially: *what else can be a
real path that the walk does not produce?* The walk has four ways to not produce one —
outside `src/`, an unscanned extension, a symlink, and a path that is not a file at all
— and the plan's own examples cover only the first two.

- **P8, a directory.** `existsSync` is **true** for a directory, so the existence guard
  does not save it and it lands squarely in the new branch. It is the probe that proves
  the guard is not doing the branch's job by accident: had the guard been an
  `isFile()` test, this row would have become a `missing` failure and the reason a
  reader is given would have been the wrong one.
- **P9, a wrong-case path.** On this macOS/APFS checkout `existsSync('src/components/UI/Dialog.tsx')`
  is **true** while `files` holds only the canonical casing. It also **names the
  primitive** and still slips past `NEVER_MEASURED_BY_B`, whose `Map` is keyed on exact
  strings — so before the fix a `REMAINING` entry pointing at the one implementation
  read *"converted"* (row B4). It is the shape a real path typo takes on a developer's
  machine and does not take in CI.
- **P10, a symlink.** `listScannableFiles` skips symlinks by `lstatSync(...).isSymbolicLink()`
  while `existsSync` follows them, so the two disagree by construction. Confirmed
  transiently: with the symlink present the walk still reported **263** files. The
  symlink was created and deleted inside this task, never committed, and its absence
  asserted (`ls` → *No such file or directory*, `git status --porcelain -- src/` empty).

  Its pre-fix half was **not separately reproduced** — it shares the identical generic
  `stale` computation with B1–B4, and reproducing it would have meant materialising the
  pre-fix gate alongside a transient symlink under `src/`. Stated rather than implied.

## The mutation contract, honoured

1. **The trigger is named in the check's own docblock words** — quoted above, from the
   refusal this gate already prints.
2. **The mutation is at the live regression site** — `REMAINING` in the shipped file, by
   line text, anchored on `export const REMAINING = [`.
3. **Which trigger was mutated is recorded** — the entry, the exit code, the
   `converted; remove this entry` presence, the `REMAINING` figure and the reason line,
   per row, above.
4. **The negative control ran and is asserted** — below.
5. **Every mutation was asserted landed BEFORE its result was read.** The harness reads
   the file back and requires the exact inserted line to be present **and**
   `git diff --numstat -- scripts/verify-dialogs.mjs` to be non-empty; if either fails
   it restores and exits 9 without running the gate. It also refuses to start if the
   file already differs from `HEAD`. Both harness defects this phase has recorded — a
   `perl` substitution that silently quoted a `\n`, and an `includes` check that
   reported a landed mutation as not landed — are covered by requiring **both** signals,
   and the dangerous direction (certifying a restore that never happened) is covered by
   asserting the restore three ways: `numstat` empty, the file byte-identical to the
   captured original, and the inserted line absent.

### The negative control, asserted rather than assumed

| Assertion | Result |
|---|---|
| `git diff --numstat -- scripts/verify-dialogs.mjs` after every probe | **empty** on all ten |
| the restored file byte-identical to the pre-probe capture | **true** on all ten |
| `ls src/components/ui/DialogSymlinkProbe.tsx` | *No such file or directory* |
| `git status --porcelain -- src/` | **empty** |
| `git status --porcelain` | **empty** |
| `node scripts/verify-dialogs.mjs` restored | exit **0**, `✓ A` `✓ B` `✓ C`, `REMAINING = 14`, 263 walked |
| the post-probe `REMAINING` figure vs the pre-probe figure | **14 = 14** |

No probe entry survives in `REMAINING`: the restored declared count is **14**, the
figure recorded before the probes began.

## What changed in the file

**`walked`** is `new Set(files)` — the same array check B's loop iterates. Not a re-walk
and not a second list: the whole defect was that two lists said what is skipped while
the refusal was keyed on one of them, so a *third list* would have been a fourth
occurrence waiting.

**`neverOpenedReason()`** gained a branch, placed **first** and guarded on
`existsSync`. First, because a path outside `files` never reaches the loop at all — the
fence and the Map never got the chance to act on it, so a path that is both fenced and
unwalked is not fenced in any operative sense. Guarded, because `unmeasurableRemaining`
refuses **before** `missing` is computed: an unguarded membership test would have turned
a typo'd entry from today's `✗ B` into a refusal, which is a failure laundered into
*"nothing was measured"* — this defect wearing the fix's clothes. P3 is the row that
proves the guard holds.

The reason names the walk's whole scope and prints `SCANNED_EXTENSIONS` rather than
repeating them in prose, so a reader can tell in one line whether they typed a path
wrong or named a file that will never be scanned.

**The refusal's closing options** were widened by one clause: previously it offered only
*"the fence or the exemption"* as the thing that could give way, which is false for a
not-walked entry. It now names the path itself, corrected to one the walk reaches.

**No line number was written into any prose added**, following round 3's record of a
header's three numbers going stale twice as lines were added above them — and this edit
added lines above them again. The claims are stated as invariants, not as addresses.

## Which docblock sentences were checked, and with what

| Sentence written into the docblock | Checked with |
|---|---|
| *"`files` is `listScannableFiles(SRC_DIR)`, a walk restricted to `src/` and to `SCANNED_EXTENSIONS`"* | read from the source; probes P1 (unscanned extension under `src/`) and P2 (outside `src/`) confirm both exclusions on a live run |
| *"Measured on this tree before the fix, with one entry naming a real stylesheet under `src/`: exit 0, one entry marked STALE with `→ converted; remove this entry`, and `REMAINING` one below the declared count"* | run B1 on the **pre-fix shipped gate**: exit **0**, `! B 1 … STALE`, the arrow line printed, `REMAINING = 14` against `REMAINING entries declared : 15` |
| *"The third is `walked`, a Set built from the very `files` array check B's loop iterates"* | `grep -n "new Set(files)"` → **one** occurrence; no second path list was introduced |
| *"It is tested FIRST"* | P8/P9/P10 refuse with the walk reason; P4/P5/P6 — all three **walked** — still refuse with their own distinct reasons, so ordering did not swallow them |
| *"It is guarded on the path existing on disk … a non-existent path returns null here and reaches the failure it reaches today"* | P3: exit **1**, `✗ B … names a path that does not exist`, `DIALOGS_FAIL` — identical to B5 on the pre-fix gate |
| *"not in the walk — a path that exists, and that this gate's own walk does not produce"* | P8 (a directory: `existsSync` true), P10 (a symlink: `existsSync` follows, the walk skips) |
| the withdrawn claim, quoted verbatim | `grep -c "cannot drift apart by an edit to either"` → **1** |

**On that grep, explicitly, because the acceptance criteria offer two outcomes and ask
which one this is.** It returns **1**, not 0: the sentence survives **only inside the
prose that quotes it as a claim that was made and records it as false**, under the
heading *"AND THE SENTENCE THAT USED TO CLOSE THAT PARAGRAPH WAS FALSE (CR-03)"*, with
what made it false and what is true now beneath it. It no longer stands as a claim. The
file family reverses in place rather than deleting, and a claim withdrawn silently reads
as a slip.

## What this does NOT close

**DS-08 is a dialog nobody has opened on a phone.** This plan corrected a debt counter.
It did not observe a sheet, a window or an Escape key. **H41-2 remains unobserved** and
**assumption A2 — the scroll lock — remains open.** No requirement is ticked by this
plan; DS-08 stays PARTIAL along with DS-07, DS-09, RESP-01, RESP-02, RESP-03 and
RESP-04.

**Two other findings live in this same file and neither was attempted.** Naming them is
not throat-clearing: a commit that edits a file carrying three findings and mentions one
reads as if it closed all three.

- **WR-02 — OPEN, untouched.** `RUNG_FAMILY` is narrower than the sentence the report
  prints: the report promises every rung *written out* in a class string is seen and
  names only two exclusions, while Tailwind v4's CSS-variable shorthand is written out,
  is neither exclusion, and the matcher misses it. The delta was **measured at zero
  occurrences on this tree**, which is why it is deferred — and is **not** why it would
  be closed. No probe of this round aimed at the rung matcher's coverage.
- **WR-04 — OPEN, untouched.** `FULL_BLEED_VIEWER`'s exemption asserts in prose that the
  file *still carries a native shell*, and the gate never checks it: the exempt path is
  skipped **before** the shape measurement runs, so if that viewer converts or is deleted
  the exemption goes quiet with no notice and no on-disk check. It is the same
  proxy-goes-quiet family as CR-03, which this plan **does** take — neighbours, and
  closing one is not closing the other. Probe P5 exercised the exemption **as a
  `REMAINING` entry**, which is the refusal's own trigger; it did **not** measure the
  exemption's premise, and would not have half-measured it either way.

  Asserted, not claimed: `git diff -U0` for this plan's commit produces hunks at three
  regions only — the `NEVER_MEASURED_BY_B` docblock, `neverOpenedReason` and its new
  `walked` Set, and the refusal's closing prose. `git diff | grep -iE
  "RUNG_FAMILY|FULL_BLEED_VIEWER|Lightbox"` over the whole diff returns **nothing**.
  `RUNG_FAMILY` and the code path by which `FULL_BLEED_VIEWER` is skipped — the loop's
  `NEVER_MEASURED_BY_B.get(file)` `continue` — are **byte-unchanged**.

**WR-05, in `scripts/verify-conversion.mjs`, is open too** and belongs to 41-26's
record; this plan does not touch that file. Three findings named as left open, because
in this phase a statement not made has already proved indistinguishable from an
omission.

## Deviations from Plan

None on substance. Two additions the plan permitted but did not spell out:

1. **[Rule 2 — evidence]** The plan named seven probes plus two invented. A **third**
   invented probe (P10, the symlink) was added because the walk has a fourth way to not
   produce a path and the other probes did not reach it. Its transient symlink was
   deleted inside the task and its absence asserted.
2. **[Rule 2 — correctness]** The refusal's closing sentence offered *"the fence or the
   exemption"* as the only things that could give way, which is a false set of options
   for a not-walked entry. One clause was added naming the path itself. Without it the
   new reason would have been followed by advice that cannot apply to it — a silent
   failure of the kind `meta-gates.md` forbids, in the one place a reader is looking for
   what to do next.

## Verification

| What | Result |
|---|---|
| `node scripts/verify-dialogs.mjs` on the **LIVE** repository | exit **0**, `✓ A` `✓ B` `✓ C`, `DIALOGS_OK`, `REMAINING = 14`, 263 walked, 7 never opened, 256 opened |
| the arithmetic the count block prints | `263 = 7 + 256`, unchanged from the pre-change baseline |
| the matcher self-check | `6 fixed probes`, all six agree, no refusal — untouched by this plan |
| `grep -c "NOT IN THE WALK"` | **1** |
| `grep -n "new Set(files)"` | **1** occurrence |
| `grep -c "cannot drift apart by an edit to either"` | **1** — inside the prose that withdraws it (see above) |
| `git diff -- scripts/verify-dialogs.mjs` hunks touching `RUNG_FAMILY` or the exemption's skip path | **none** |
| `git status --porcelain -- src/` | **empty** |
| `git status --porcelain` | **empty** |
| `npm run verify` (aggregate) | exit **2** — 16 declared, 15 run, **14 passed, 0 FAILED, 1 REFUSED** (`verify:capabilities`), `verify:redirects` not run. `verify:dialogs` → **0, passed** |
| `npm run build` — the repository's only typecheck, run **after** this SUMMARY was written (DEF-41-01: Tailwind compiles class strings out of `.planning/`) | exit **0** |

**The aggregate exit 2 is a property of this environment, not a verdict on this work.**
This worktree holds no `.env.local`, so `verify:capabilities` cannot reach Supabase and
refuses — *"FATAL: missing environment variable(s): SUPABASE_ACCESS_TOKEN,
NEXT_PUBLIC_SUPABASE_URL … Nothing was measured."* — and `verify:redirects` needs a
running dev server. **Zero gates FAILED**, and the dialogs row is unchanged from before
this plan.

**No test runner exists for the product** (`CLAUDE.md` Guardrail 1). Nothing here is
verified because tests pass. The evidence is exit codes, printed report lines, grep
counts and exact-string source assertions, each recorded above with the number it
produced.

## What was deliberately not touched

- **No product file.** This plan changed one developer-run script. The only thing that
  ever appeared under `src/` was a transient symlink, created and deleted inside task 2
  and never committed.
- **No Phase 42 file** — nothing under `src/components/scanner/**`,
  `src/app/(admin)/door/**` or `src/app/**/scanner/**`. P6 put a fenced path on a list to
  prove the fence reason still fires; it did not open the door.
- `src/components/ui/PageShell.tsx` and `scripts/verify-conversion.mjs` — a sibling plan
  owns both in this wave.
- `scripts/conversion-manifest.mjs` — byte-identical to the base commit.
- `STATE.md` and `ROADMAP.md` — the orchestrator owns those writes.
- `RUNG_FAMILY` (WR-02) and the exemption's skip path (WR-04) — open findings in this
  same file, asserted byte-unchanged above.

## Known Stubs

None. The new branch is a live code path, proven to fire by a mutation at the trigger
the gate's own refusal names, in **both** directions: it refuses for a real path outside
the walk, and it leaves a non-existent path on the failure it already reached.

## Threat Flags

None. This plan changed one developer-run script that reads source files and writes
stdout and an exit code — no request, no session, no database row, no rendered surface.
The plan's register is satisfied as written: T-41-28-01 by deriving the refusal's set
from the loop's own input, T-41-28-02 by the existence guard and probe P3, T-41-28-03 by
the harness asserting each mutation landed before any result was read and each restore
afterwards, T-41-28-04 by correcting the false claim in the same commit as the code
beneath it, T-41-28-05 by naming WR-02 and WR-04 as open and asserting the diff touches
neither. The repository is PUBLIC: this document carries repository paths and exit codes
only — roles, never people.

## Self-Check: PASSED

- `scripts/verify-dialogs.mjs` — FOUND
- `.planning/phases/41-shared-primitives-three-tier-layout/41-28-SUMMARY.md` — FOUND
- commit `91ebe24` — FOUND
- `git status --porcelain` before this file was staged — only this SUMMARY, untracked
