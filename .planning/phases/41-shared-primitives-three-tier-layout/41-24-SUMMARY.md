---
phase: 41-shared-primitives-three-tier-layout
plan: 24
subsystem: verification-gates
tags: [gap-closure, verify-dialogs, never-measured-by-b, rung-family, mutation-proof]
requires:
  - "scripts/verify-dialogs.mjs as shipped by 41-18 (the fence refusal and the widened rung family)"
  - "scripts/conversion-manifest.mjs PHASE_42_PATHS (the other half of the fence, untouched here)"
provides:
  - "NEVER_MEASURED_BY_B — one derived list of what check B never opens, read by the loop AND by the refusal"
  - "a refusal keyed on all three never-opened categories, with the reason printed per entry"
  - "a rung family that includes the negative form the printed sentence already promised"
affects:
  - "scripts/verify-dialogs.mjs"
tech-stack:
  added: []
  patterns:
    - "the set that decides what is skipped IS the set the refusal is keyed on"
    - "a scope boundary and a declared exemption kept apart in the refusal, not only in the report"
    - "mutation on the documented trigger, at the live regression site, asserted by grep BEFORE the result is read"
key-files:
  created: []
  modified:
    - "scripts/verify-dialogs.mjs"
decisions:
  - "D-41-24-A — the skip set is derived once and shared between check B's loop and the refusal; hard-coded comparisons in the loop were how the two drifted apart"
  - "D-41-24-B — the refusal prints the reason PER ENTRY, in three kept-apart terms (fenced / exempt / the primitive), because collapsing them re-loses the distinction this gate keeps deliberately"
  - "D-41-24-C — widen the rung matcher rather than narrow the sentence, decided on a re-measured zero on this tree, the same direction 41-18 chose one round ago"
metrics:
  duration: "~50 min"
  completed: 2026-08-13
  tasks: 2
  commits: 2
---

# Phase 41 Plan 24: verify-dialogs gap closure round 3 (WR-01, WR-05) Summary

The dialog gate no longer reports a file as converted when it is a file the gate
never opened, and the sentence it prints about its own rung matcher is true of the
regex that runs — including the negative form the sentence had already promised.

**This plan closes no requirement. DS-08 stays PARTIAL.** Its runtime half — a
dialog observed opening as a sheet below 768px, closing with Escape, with the page
behind it inert — is H41-2 and is still owed. Assumption A2 (scroll lock) remains
unobserved.

**And the plainest thing to say about this round: a gate that can finally fail is
not a surface anyone has seen.** Everything below is an exit code and a printed
line from a developer script that reads class strings and import clauses. Not one
of it is a person looking at a dialog. H41-2 is exactly as unobserved after this
commit as before it.

## What shipped

| Change | File | Commit |
|---|---|---|
| WR-01 — `NEVER_MEASURED_BY_B`, the loop driven from it, the refusal keyed on all of it, the count block made reconstructible | `scripts/verify-dialogs.mjs` | `575a937` |
| WR-05 — the rung family widened to the negative form, a sixth probe, the printed sentence rewritten | `scripts/verify-dialogs.mjs` | `dd1aa86` |

`scripts/conversion-manifest.mjs` was **not touched** — see the lockstep note below,
which explains why this round's fenced mutation did not need it and the last one did.

## The trigger each mutation used

Round 2's summary opened this column because round 1 shipped two plans whose
mutations went red for a reason unrelated to the gate under test. This phase has
now also shipped two gates declared closed and found open, both of which passed
their own probes. So each row names the trigger **in the words the check's own
docblock or report uses**, and the site is the place a real regression would appear.

| # | Trigger, in the check's own words | Site mutated | Exit before the fix | Exit after the fix | Exit restored |
|---|---|---|---|---|---|
| WR-01 exempt | The refusal's own closing argument, shipped by 41-18: *"This gate cannot tell a debt somebody PAID from one it simply never opened … A debt counter that falls because the gate stopped looking is worse than no counter."* The trigger is a `REMAINING` entry naming a file check B never opens. | `REMAINING` in `scripts/verify-dialogs.mjs` — the **declared exemption** (`src/components/media/Lightbox.tsx`) added as an entry. Not a fabricated path: the file exists, is walked, and **still carries a native shell at `:82`**. | **0** — `! B  1 REMAINING entr(y/ies) are STALE`, `src/components/media/Lightbox.tsx → converted; remove this entry`, `REMAINING entries declared : 15` and **`REMAINING = 14`**. The defect, reproduced on the shipped gate before anything was edited. | **2** — `FATAL: 1 REMAINING entr(y/ies) name a file check B NEVER OPENS`, reason line `exempt — measured and declared correct`. No `✓ B`, no `✗ B`, no `! B`, no `REMAINING =` count, no `DIALOGS_OK`. | **0** — `REMAINING = 14` |
| WR-01 primitive | Same refusal, other uncovered category. | `REMAINING` — `PRIMITIVE_FILE` (`src/components/ui/Dialog.tsx`) added as an entry. | not separately reproduced (same `stale` computation, same skip) | **2** — reason line `the primitive itself` / *"check B measures copies OF it — the one implementation cannot be one of its own copies"*. | **0** — `REMAINING = 14` |
| WR-01 fenced — **regression guard on the half 41-18 closed** | The fence report, printed on every run: *"If a hand-rolled dialog is written behind that fence, check B is silent about it."* | `REMAINING` — `src/components/scanner/ScanFlash.tsx`, a path already behind the shipped fence. | — (this half was closed last round) | **2** — reason line `fenced — behind that glob, never opened; a SCOPE BOUNDARY that says nothing whatever about this file's markup`, followed by `behind: src/components/scanner/**`. Still refuses, and still names the glob. | **0** — `REMAINING = 14` |
| WR-05 | The gap review, in its own words (the three class parts are described rather than spelled — DEF-41-01, `.planning/` is scanned by Tailwind): *"a nineteenth overlay written [positioning utility + inset + a NEGATIVE rung] is invisible to check B while the report asserts otherwise."* | A **live JSX line in a scanned file**, not a `MATCHER_PROBES` entry: a transient `src/components/Wr05NegativeRungProbe.tsx` carrying one element whose class string uses the negative rung form. Not the primitive, not the exemption, not behind the fence, not on `REMAINING` — so the correct verdict is an **undeclared** copy. | **0** — `✓ B`, `REMAINING = 14`, `DIALOGS_OK`, and the file **not named anywhere** although `files walked` rose 263 → 264. The gate walked it and did not see it. | **1** — `✗ B  1 file(s) declare a dialog shell and are not on REMAINING`, naming `src/components/Wr05NegativeRungProbe.tsx` with `:3  [hand-rolled overlay]` and the matched source line. `DIALOGS_FAIL — 1 check(s) failed: B`. | **0** — `✓ B`, `REMAINING = 14`, 263 files walked |

Every mutation was **asserted present by grep before its result was read** — the
ordering that caught a silently-quoted substitution earlier in this phase.
`grep -c "MUTATION-WR01"` returned **2** on each of the three task-1 mutations
(the marker comment and the entry line), and `ls` returned the transient file for
WR-05 before either gate was run.

### The WR-05 "before" half was measured on the live tree, not argued

The pre-widening gate was materialised from the task-1 commit as a transient
`scripts/verify-dialogs.prewiden.mjs` and run against the tree **with the probe
file present**. It resolves `ROOT` from its own location, so it measured the real
`src/`. Result: exit **0**, `5 fixed probes`, `files walked 264`, `✓ B`,
`REMAINING = 14`, `DIALOGS_OK` — the probe walked and never named. That is the
defect on the live tree, not a claim about a regex. Both transient files were then
deleted and their absence asserted by `ls` returning *No such file or directory*.

### The lockstep trap, and why it did not apply this time

`PHASE_42_EXEMPT_PATHS` is cross-checked, sorted, against the manifest's
`PHASE_42_PATHS` **before anything is measured**, and a drift refuses — so a glob
added to one copy alone exits 2 on *"this gate's Phase 42 fence and the manifest's
do not match"*, a red for the wrong reason. That is the trap recorded as mutation A
in `41-16-SUMMARY.md` and paid again in `41-18-SUMMARY.md`.

**This round's fenced mutation did not touch either fence list.** The trigger was
mutated at the *other* list: a `REMAINING` entry naming a path already behind the
shipped fence. The drift cross-check therefore ran on unmodified inputs and passed,
and the exit 2 that followed came from the code under test — its FATAL names the
overlap and the glob, not a fence mismatch. The cross-check is untouched by this
plan in either file.

### The negative control, asserted rather than assumed

- `grep -c "MUTATION-WR01" scripts/verify-dialogs.mjs` → **0** after each of the
  three task-1 mutations was reverted.
- `ls src/components/Wr05NegativeRungProbe.tsx` → *No such file or directory*.
- `ls scripts/verify-dialogs.prewiden.mjs` → *No such file or directory*.
- `git status --porcelain -- src/ | wc -l` → **0**, after task 1 and again after task 2.
- `git status --porcelain` → **empty** after both commits.
- The gate re-run after each restoration: exit **0**, `DIALOGS_OK`, `REMAINING = 14`
  — the **same 14** as the pre-change baseline, recorded as a number and not as
  "unchanged".

## WR-01 — one list, and three reasons kept apart

Check B's loop skipped three categories before `shellShapes()` read a line: the
primitive, the declared exemption, and the fenced paths. `stale` is computed as
*on disk and not in `measuredShells`*, so **all three** produced the wrong report;
41-18's refusal covered only the third. The measured consequence, reproduced above:
the gate printed *"converted; remove this entry"* about a file it never opened,
`REMAINING` read 14 against fifteen declared entries, and the file in question still
carries a native shell.

`NEVER_MEASURED_BY_B` is now a `Map` from path to `{ kind, reason }`, holding the
primitive and the declared exemption. Check B's two `continue`s read it, in order,
and `unmeasurableRemaining` — declared paths that are in the map **or** behind the
fence, tested in the same order — is what the refusal is keyed on. The set that
decides what is skipped is the set the refusal is keyed on, so an edit to either
cannot leave them disagreeing.

**The refusal's position is unchanged and deliberate**: above check B's loop, for
the reason 41-18 recorded — every number this gate prints derives from what that
loop collected, so a run whose two lists contradict each other must not reach a
tick, a STALE notice, or a count.

**The three reasons print per entry, and they stay apart**, because they are three
different facts about a file:

- **the primitive itself** — check B measures copies OF it; the one implementation
  cannot be one of its own copies.
- **exempt — measured and declared correct** — a statement about the file's markup,
  made by a person, before this gate existed.
- **fenced** — *"a SCOPE BOUNDARY that says nothing whatever about this file's
  markup"*, with the glob printed. Nobody measured it at all.

The shared closing argument is kept verbatim in substance: the gate cannot tell a
debt somebody paid from one it never opened; a debt counter that falls because the
gate stopped looking is worse than no counter; and either the entry leaves
`REMAINING` or the fence or the exemption does — both decisions for a person, and
the refusal ends *"Nothing was measured."*

One honest nuance, the same one 41-18 recorded: the string `STALE` appears **once**
in the refusal output, inside the refusal's own prose explaining the outcome it
prevents. `grep -cE "✓ B|✗ B|! B |DIALOGS_OK|REMAINING = |converted; remove this entry"`
over the whole refusal run returns **1**, and that one line is the prose. No tick,
no count and no STALE verdict is emitted about the overlapping file.

### The count block, made reconstructible

The exempt row and the fenced row still print as two different things, and the
totals now close:

```
      files walked under src/         : 263
      never opened by check B         : 7
         1  the primitive itself
         1  exempt — measured and declared correct
         5  fenced by path, NEVER MEASURED — a scope boundary, not an approval
      files check B opened            : 256
      of those, carrying a shell      : 14
      REMAINING entries declared      : 14

      REMAINING = 14
```

`walked = never opened + opened` (263 = 7 + 256) and `opened = carrying a shell +
clean`. The per-category rows are counted from the walk itself, not asserted — if
the primitive stopped being walked, its row would read 0.

## WR-05 — the matcher covers what the sentence promised

The report said a copy is seen at any rung **written out** in the class string and
named exactly two exclusions: a rung reached through a variable, and a class string
built by concatenation. A negative rung is written out and is neither — and the
left boundary, which refuses a preceding hyphen, blocked it on the minus sign.

**The delta was re-measured on this tree on this day**, because *"the delta is a
measured zero"* is a claim about a tree and not a property of the change. Grep over
every scanned extension under `src/` for a rung token in the negative form:

| Pattern | Hits |
|---|---|
| the strict form — sign, prefix, then digits / the keyword / a bracketed value, boundary-guarded on both sides | **0** files, **0** lines |
| the loose form — sign and prefix followed by any alphanumeric or an opening bracket | **0** lines |

So the widening's delta on this tree is a **measured zero**, and the gate confirms
it end-to-end: `REMAINING = 14` and 263 files walked, before the widening and after.

### Which correct file would the widened token now wrongly catch: **none**

That is the failure mode that matters more here (§0 rule 3, quoted three times in
this file family: a gate that reddens correct code gets switched off), so it was
run rather than reasoned. The left boundary is evaluated **before** the optional
sign, so a rung token preceded by a word character or by a hyphen still cannot
match at either entry point.

Measured out of band with the file's own fragments, comparing the shipped regex
against the widened one:

| Shape | before | after | expected |
|---|---|---|---|
| a written-out negative rung (the WR-05 shape) | no match | **match** | match |
| an ordinary hyphenated utility ending in the rung token | no match | no match | no match |
| a custom property with a doubled hyphen | no match | no match | no match |
| a hyphenated prefix immediately before the rung token | no match | no match | no match |
| the plain positive rung | match | match | match |
| a longer word ending in the prefix letter | no match | no match | no match |

**Exactly one row changes**, and it is the shape the printed sentence already
promised. Every blocked row stays blocked. Combined with the zero grep count, the
answer to *"which correct file does this redden"* is **none on this tree**, stated
with the numbers that measured it.

`RUNG_SIGN` is assembled by concatenation like every other fragment, so no complete
utility appears as a literal (DEF-41-01). A **sixth** fixed probe was added for the
negative form, following the existing record shape with `verdict` and `expected`
both present and agreeing; the self-check prints `6 fixed probes` and all six agree,
so the run does not refuse. The first probe — the positioning utility at the end of
a longer word, expected *no match* — was **kept**: it is the blocked direction, and
it is what the optional minus sign was checked against.

The printed sentence now says the family is one or more digits, the keyword, or an
arbitrary bracketed value, **each optionally negative**, states the same two shapes
it still cannot see, and adds that the boundary guard is evaluated before the
optional sign. The claim is no longer wider than the regex.

## Deviations from Plan

None on substance. Two additions the plan permitted but did not spell out:

1. **[Rule 2 — evidence]** The plan asked for the WR-05 delta to be measured. The
   *before* half was additionally measured **on the live tree** by materialising the
   pre-widening gate from the task-1 commit as a transient `scripts/verify-dialogs.prewiden.mjs`,
   running it with the probe present, then deleting it and asserting its absence.
   Without it, the "before" half of the WR-05 row would have been a statement about
   a regex rather than a run — and this round exists because two previous rounds
   accepted exactly that substitution.
2. **[Rule 2 — evidence]** The boundary table above was produced by an out-of-band
   script in the scratchpad, so the six-probe count the acceptance criteria fix was
   not disturbed. Nothing was added to `MATCHER_PROBES` beyond the sixth probe.

## Verification

| What | Result |
|---|---|
| `node scripts/verify-dialogs.mjs` on the LIVE repository | exit **0**, `DIALOGS_OK`, `REMAINING = 14`, 263 walked, 7 never opened, 256 opened |
| the matcher self-check | `6 fixed probes`, all six agree, no refusal |
| `npm run build` (the repository's only typecheck) — after the transient probe was deleted | exit **0** |
| `npm run build` — again after this SUMMARY was written (DEF-41-01) | exit **0** |
| `git status --porcelain` after both commits | empty |
| `git status --porcelain -- src/` | **0** lines |
| `npm run verify` (aggregate) | exit **2** — 14 gates passed, **1 REFUSED** (`verify:capabilities`), `verify:redirects` not run. `verify:dialogs` **0 passed**. |

**The aggregate exit 2 is a property of this environment, not a verdict on this
work.** This worktree has no `.env.local`, so `verify:capabilities` cannot measure
and refuses, and `verify:redirects` needs a running dev server. **Zero gates
FAILED.**

**No test runner exists for the product.** Nothing here is verified because tests
pass; the evidence is exit codes, printed report lines, grep counts and exact-string
source assertions, each recorded above with the number it produced.

## What was deliberately not touched

- No product file. The transient `src/components/Wr05NegativeRungProbe.tsx` was
  created and deleted inside task 2 and never committed.
- No Phase 42 file: nothing under `src/components/scanner/**`,
  `src/app/(admin)/door/**` or `src/app/**/scanner/**`. This plan put a fenced path
  on a list to prove a refusal; it did not open the door.
- `src/components/ui/PageShell.tsx` and `scripts/verify-conversion.mjs` — a sibling
  plan owns both in this wave.
- `scripts/conversion-manifest.mjs` — byte-identical to the base commit; the fence
  cross-check needed no lockstep this round.
- `STATE.md` and `ROADMAP.md` — the orchestrator owns those writes.
- CR-01, WR-02, WR-03, WR-04 and the three IN findings — other plans, other rounds.

## Known Stubs

None. Both changes are live code paths, each proven to fire by a mutation at its
documented trigger, with the negative control asserted afterwards.

## Threat Flags

None. This plan changed one developer-run script that reads source files and writes
stdout and an exit code — no request, no session, no database row, no rendered
surface, and no new security-relevant surface beyond the plan's `<threat_model>`.
T-41-24-04 (a transient file left under `src/`) was mitigated as written: deleted
before any build ran, and `git status --porcelain -- src/` asserted empty.

## Self-Check: PASSED

- `scripts/verify-dialogs.mjs` — FOUND
- `.planning/phases/41-shared-primitives-three-tier-layout/41-24-SUMMARY.md` — FOUND
- commit `575a937` — FOUND
- commit `dd1aa86` — FOUND
