---
phase: 41-shared-primitives-three-tier-layout
plan: 12
subsystem: tooling
tags: [d-41-18, wr-09, aggregate, gates, release-pass, h41, refusal-vs-failure]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 02
    provides: "verify-breakpoints.mjs (G6) and verify-no-viewport-read.mjs (G7) — two of the six gates registered here"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 07
    provides: "verify-conversion.mjs (G1, G4) and the conversion manifest whose refusal is this plan's second propagation proof"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 09
    provides: "verify-dialogs.mjs (G2), and the H41-2 procedure carried into the release pass with A2 still open"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 10
    provides: "verify-tables.mjs (G3), and the H41-3 column judgement carried into the release pass"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 11
    provides: "verify-touch-targets.mjs (G5) — the gate that exists, plus the instruction that its exit 2 must never be folded into a pass"
provides:
  - "scripts/verify-all.mjs — one command for the fifteen gates that run without a server, closing 40-REVIEW.md WR-09 (D-41-18)"
  - "package.json with sixteen verify:* entries and one verify; dependencies and devDependencies byte-identical"
  - "41-RELEASE-PASS.md — H41-1 … H41-6, written before the sitting, with the tablet risk stated in the body, and now closed on the owner's blanket approval with every Result stating what it does NOT contain"
  - "The measured fact that npm run verify exits 2 on any machine without Supabase credentials, because verify:capabilities refuses — and that this is the command working, not failing"
  - "The phase gate closed 2026-08-12 on a one-word owner approval — an authorisation, recorded as one, with H41-4 left human_needed and criterion 5 (RESP-03) NOT ticked"
affects: [42-scanner, 44-calendar, 45-production-sections]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An aggregate's exit code stands for many measurements, so its precedence must be declared: FAILED dominates REFUSED, REFUSED dominates passed, and a refusal never becomes a pass"
    - "A runner reads each gate's command out of package.json rather than holding a copy — a copy drifts silently while the copy keeps passing"
    - "The registry is checked in BOTH directions: a verify:* entry the runner does not know about is a refusal, because that gate was not measured while a tick was being printed"
    - "Node exits 1 for an uncaught exception exactly as for a red check, so an aggregate cannot tell a broken gate from a broken tree by exit code — the discriminator is a stack trace on stderr, and it is printed"
    - "A note that fires on every refusal trains a reader to skip the one case where it matters: the stack-trace warning is gated on what a stack trace actually looks like"

key-files:
  created:
    - scripts/verify-all.mjs
    - .planning/phases/41-shared-primitives-three-tier-layout/41-RELEASE-PASS.md
  modified:
    - package.json

key-decisions:
  - "npm run verify EXITS 2 ON THIS MACHINE AND THAT IS CORRECT. verify:capabilities refuses without Supabase credentials, and a refusal is not a pass. The plan's acceptance criterion asked for exit 0; meeting it would have required either credentials this worktree does not hold or an aggregate that folds a refusal into a green — which is the exact defect T-41-44 names. The criterion was written before the environment was known; the exit code is the honest one."
  - "NO ESCAPE HATCH WAS ADDED. No flag, no environment variable, no allow-list that turns a refusal into a pass. A switch that makes the aggregate green on a machine that measured nothing is the only change to this file that could ever destroy its value."
  - "verify:capabilities was NOT moved into a not-run list beside verify:redirects, and the two cases are different. The redirects walk needs a server and its own header says it cannot be part of the build; running it without one produces a red about the environment. verify:capabilities already handles its own missing-credential case honestly, by refusing. Moving it would have made the aggregate exit 0 on a laptop while the capability model — the gating mechanism, which is the product — went unmeasured."
  - "The command each gate runs is read from package.json at run time, never copied into the runner. Only the NAMES are declared here, and every name must appear in exactly one of the two lists, checked in both directions."
  - "Failure dominates refusal in the exit code, but never in the report: the failure run printed VERIFY_FAIL and then, on its own line, that one gate refused and is part of neither the failure nor any pass."
  - "verify:persona is included as a gate and its note says what it covers — the persona, not the product, and coherence, not correctness. An aggregate that let a persona green stand next to product greens without saying so would be publishing a category error fifteen lines wide."
  - "THE APPROVAL WAS RECORDED AS AN AUTHORISATION, NEVER AS SIX OBSERVATIONS. The owner replied with one word — 'approved' — and no itemised findings. That closes the phase gate, because the plan's resume signal asked for exactly that word. It does not observe a surface, a dialog, a card, a box, a pill, a tab or a door, and no Result in the release pass says observed, passed or confirmed. Turning a blanket approval into six per-item ticks would have manufactured the precise defect the phase's ten gates exist to prevent — a green that measured nothing — inside the release pass itself."
  - "H41-4 STAYS human_needed AND CRITERION 5 (RESP-03) IS NOT TICKED. The owner never said a large touch screen was available. A silence about the instrument is not a statement that the instrument was there, and H41-4 said in advance, in its body, what happens when it is absent. verify:touch-targets asserts a class string; nothing in this repository has yet asserted a box."

requirements-completed: []

# Metrics
duration: ~95min
completed: 2026-08-12
tasks: 3 of 3 — the third is the phase's human checkpoint, closed on the owner's approval
commits: 3
files_changed: 3
---

# Phase 41 Plan 12: One Command, Sixteen Gates, And Six Things No Command Can Say Summary

**`npm run verify` now runs the fifteen gates that need no server, prints one line
per gate with its exit code and verdict, names `verify:redirects` as not run with
its reason, and reconciles its own count against `package.json` in both directions.
It distinguishes `passed` from `FAILED` from `REFUSED` and both propagations were
proven by an asserted mutation. On this machine it exits **2**, not 0, because
`verify:capabilities` refuses without Supabase credentials — and that is the command
working. `41-RELEASE-PASS.md` carries H41-1 … H41-6 written before the sitting, names
the eight converted surfaces by route from the manifest rather than from memory, and
states in its body that criterion 5 is `human_needed` and not ticked if no large
touch screen exists.**

**The phase gate is closed. The owner replied `approved` — one word, no itemised
findings — and that is recorded as what it is: an authorisation to close the phase,
not a report of six observations. Every `Result` in the release pass now says which
of the two it holds, and `H41-4` stays `human_needed` because nobody said a large
touch screen existed.**

## Performance

- **Duration:** ~95 min
- **Tasks:** 3 — two executed with one commit each, and **Task 3, the phase's human
  checkpoint, closed by the owner and recorded, never ticked by an agent.**
- **Files changed:** 3 — 2 created, 1 modified, **0 deleted**
- **Files under `scanner/` or `(admin)/door/` touched:** **0**, asserted by
  `git diff --name-only 26462dc~1 HEAD` → three paths, listed below
- **Packages added, removed or changed:** **0** (D-41-20, T-41-SC)

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | The aggregate runner, and seven `package.json` entries | `26462dc` | `scripts/verify-all.mjs`, `package.json` |
| 2 | `41-RELEASE-PASS.md` — six observations, before the sitting | `b04343d` | `41-RELEASE-PASS.md` |
| 3 | **The phase gate** — the owner's answer, recorded | `22444fa` | `41-RELEASE-PASS.md` |

---

## Task 3 — the checkpoint's answer, verbatim

The five steps were put to the owner. **The reply, in full:**

```
approved
```

**That is the entire response.** Nothing else arrived: no per-item observation, no
defect, no number, and **no statement about which devices were available.**

### What that is, and what it is not

The plan's resume signal read *"Type 'approved', or list what you saw that should not
be there."* The owner typed the first. **It is a real and sufficient authorisation to
close the phase gate, and it is recorded as one.**

**It is not a report of six observations, and it has not been turned into one.** For
H41-1 … H41-6 the release pass now reads *covered by the owner's blanket approval,
without itemised evidence recorded*. **Not one `Result` says `observed`, `passed` or
`confirmed`** — there is no evidence behind those words, and a tick nobody earned
closes a phase on nothing. That is the exact defect the phase's gates were built to
prevent; manufacturing it inside the release pass would have been the phase failing at
its own thesis on the last line.

### H41-4, which is the one that had to be got right

**The owner never said a large touch screen was available.** So:

- **Criterion 5 (RESP-03) is `human_needed` and is NOT ticked.**
- A silence about the instrument is **not** a statement that the instrument was there.
- `verify:touch-targets` is green and does not substitute: it asserts a **class
  string**. **Nothing in this repository has yet asserted a box**, and the release pass
  said so in a table before the sitting and still says so after it.

### The other four that decide something, as they stand today

| Item | State after the close |
|---|---|
| **A2** — background scroll under `showModal()` | **still open.** Nobody reported whether the background moved |
| **criterion 4a (RESP-01)** — eight surfaces × three widths | approved, **no itemised evidence, not ticked** |
| **criterion 2's runtime half (DS-08)** | approved, **no itemised evidence, not ticked** |
| **criterion 3's judgement half (DS-09)** | approved, **no itemised evidence, not ticked** |
| **H41-6b** — the door at `/door` and `/admin/scanner` | **no complaint reported, and neither address reported opened.** An absence of a complaint is not an observation of a bottom bar |

### The two measurements that ARE mine

These are the only things in Task 3 that were measured rather than authorised, and
they were run **in this worktree**, which holds **no `.env.local`**:

| Command | Result here |
|---|---|
| `npm run verify` | **exit 2** — 15 gates ran, **14 passed, 0 FAILED, 1 REFUSED** (`verify:capabilities`, missing `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL`), **1 NOT RUN** (`verify:redirects`, needs a dev server). Verdict line: `VERIFY_REFUSED — 1 gate(s) could not measure: verify:capabilities`. Count block reconciled 16 = 15 + 1, **0 MISSING** |
| `npm run build` | **exit 0** — compiled in 6.9s, TypeScript ran, 40 static pages, 58 routes |
| `node scripts/verify-persona.mjs` | **exit 0 — 7/7** |

**The credential difference is written beside the number, not applied to it.** A
checkout holding the Supabase credentials is expected to run the same fifteen gates
with `verify:capabilities` measuring instead of refusing, and to exit 0. **That run was
not taken here**, so this SUMMARY does not report it as a measurement — an exit code
retold without its machine is how a refusal becomes a pass.

---

## The full table, verbatim from the final run

```
verify-all — every gate that runs without a server, and what was not run

  A refusal is not a failure: it means the measurement did not happen.
  0 = passed  ·  1 = FAILED  ·  anything else = REFUSED, and nothing was measured.

  Running 15 gate(s). Every one runs to completion.

    gate                             exit  verdict
    verify:persona                      0  passed
    verify:capabilities                 2  REFUSED
    verify:no-header-identity           0  passed
    verify:no-credit-account            0  passed
    verify:media-strip                  0  passed
    verify:routes                       0  passed
    verify:tokens                       0  passed
    verify:semantic-separation          0  passed
    verify:sunset-gradient              0  passed
    verify:conversion                   0  passed
    verify:dialogs                      0  passed
    verify:tables                       0  passed
    verify:breakpoints                  0  passed
    verify:no-viewport-read             0  passed
    verify:touch-targets                0  passed

  ── NOT RUN, and why ───────────────────────────────────────────────────

    verify:redirects — not run: needs a running dev server; its own header says
    it cannot be part of the build

  ── the count ──────────────────────────────────────────────────────────

    package.json declares           16  verify:* entr(y/ies)
    run here                        15
      of which passed               14
      of which FAILED                0
      of which REFUSED               1  — nothing was measured by these
    needs a server, not run          1
    declared absent                  0
    MISSING                          0
                                   ───
    accounted for                   16

  VERIFY_REFUSED — 1 gate(s) could not measure: verify:capabilities
```

**Exit 2.** `echo "exit=$?"` → `2`.

### The plan asked for exit 0, and exit 0 was not available honestly

The acceptance criterion reads *"`npm run verify` exits 0"*. It does not, here, and
the disagreement is worth more than a quiet edit in either direction.

`verify:capabilities` needs `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL`.
**This worktree holds no `.env.local`** — the same fact every plan in this phase
recorded — so the gate refuses with exit 2 and its own words: *"Nothing was
measured."* **That was its state before this plan changed anything**, measured
directly before the runner existed.

There were exactly three ways to reach exit 0:

1. **Hold the credentials.** Not available, and obtaining them would have meant
   pointing a running process at production.
2. **Move `verify:capabilities` into the not-run list** beside `verify:redirects`.
   Rejected, and the two cases are genuinely different: the redirects walk needs a
   *server* and its own header says it cannot be part of the build, whereas
   `verify:capabilities` already handles a missing credential honestly by refusing.
   Demoting it would make the aggregate print a green on a laptop while **the
   capability model — the gating mechanism, which `PROJECT.md` calls the product —
   went unmeasured.**
3. **Collapse exit 2 into exit 0.** This is T-41-44 written as a feature.

**The criterion was written before the environment was known.** The exit code is the
honest one, and the plan's own `must_haves` say so in the sentence above the
criterion: *"a refusal is reported as a refusal, not as a failure — no verdict is
implied by an exit 2."* On a machine holding the credentials the same command is
expected to exit 0, and `§0.1` of the release pass asks the person to record **which
machine they were on**, so the number is never read without its condition.

**No escape hatch was added.** No flag, no environment variable, no allow-list that
turns a refusal into a pass.

---

## Proven able to propagate — two cycles, every mutation asserted first

`ai-engineering.md`'s *gate prova per mutazione*: **every assertion below was taken
BEFORE the aggregate's result was read.**

### Cycle F1 — failure propagation

| Step | Command | Result |
|---|---|---|
| mutate | a forced `process.exit(1)` at the head of `scripts/verify-sunset-gradient.mjs` | — |
| **assert-mutation** | `grep -c 'MUTATIONF1' scripts/verify-sunset-gradient.mjs` | **1** |
| **assert-mutation** | `node scripts/verify-sunset-gradient.mjs` | **exit 1** |
| read | `npm run verify` | **exit 1** |
| — | its table | `verify:sunset-gradient  1  FAILED`, and **the other fourteen still reported their own verdicts** — 13 passed, 1 REFUSED |
| — | its verdict block | `VERIFY_FAIL — 1: verify:sunset-gradient` followed by `AND 1 refused — verify:capabilities. Those measured NOTHING; they are not part of the failure and they are not part of any pass either.` |
| revert | `git checkout -- scripts/verify-sunset-gradient.mjs` | — |
| **assert-revert** | `grep -c 'MUTATIONF1'` | **0** |
| **assert-revert** | `git status --short` on the file | **empty — byte-identical** |
| read | the gate | **exit 0** |

**The load-bearing observation is not the exit 1.** It is that the run did not stop
at the failure — a runner that halted would have told you about one gate and hidden
fourteen — and that **the refusal survived the failure as a refusal**, named
separately in the verdict rather than swept into the failing set.

### Cycle R1 — refusal propagation

| Step | Command | Result |
|---|---|---|
| mutate | `CONVERTED.length = 0;` in `scripts/conversion-manifest.mjs` | — |
| **assert-mutation** | `grep -c 'MUTATIONR1' scripts/conversion-manifest.mjs` | **1** |
| **assert-mutation** | `node -e "…CONVERTED.length"` | **0** |
| read | `npm run verify` | **exit 2** |
| — | its table | `verify:conversion  2  REFUSED` and `verify:touch-targets  2  REFUSED` — **REFUSED, not FAILED** |
| — | the count | refused **1 → 3**, passed **14 → 12**, FAILED **0** |
| — | each one's output | the manifest's own words, printed: *"CONVERTED is empty… A vacuous green is not a green"* |
| revert | `git checkout -- scripts/conversion-manifest.mjs` | — |
| **assert-revert** | `grep -c 'MUTATIONR1'` | **0** |
| **assert-revert** | `node -e "…CONVERTED.length"` | **8** |
| **assert-revert** | `git status --short` | only the two files this plan intends to change |

**Stated rather than glossed:** the aggregate exit was **already 2** before this
mutation, because of `verify:capabilities`. So the discriminating evidence here is
**not** the exit code — it is the per-gate verdicts, which moved from `passed` to
`REFUSED` for exactly the two manifest-scoped gates while the aggregate refused to
call any of them a failure. Reporting the exit code alone as the proof would have
been reading an echo.

**Three gates did not move**: `verify:dialogs`, `verify:tables` and
`verify:breakpoints` stayed green with an empty manifest. That is a fact about their
scope, not a defect found here, and it is recorded so nobody later reads the R1 table
as evidence that all six new gates are manifest-scoped. They are not.

---

## `git diff package.json` — the scope assertion

```
+    "verify:conversion": "node scripts/verify-conversion.mjs",
+    "verify:dialogs": "node scripts/verify-dialogs.mjs",
+    "verify:tables": "node scripts/verify-tables.mjs",
+    "verify:breakpoints": "node scripts/verify-breakpoints.mjs",
+    "verify:no-viewport-read": "node scripts/verify-no-viewport-read.mjs",
+    "verify:touch-targets": "node scripts/verify-touch-targets.mjs",
+    "verify": "node scripts/verify-all.mjs",
```

**Seven added lines, zero removed, all inside `scripts`.** Asserted mechanically
rather than by reading the diff:

| Assertion | Result |
|---|---|
| `dependencies` identical to `HEAD:package.json` | **true** |
| `devDependencies` identical to `HEAD:package.json` | **true** |
| `verify:*` entry count | **16** |
| gates the runner ran | **15** = 16 − 1 in `NEEDS_SERVER` |

**G5 exists**, so the count is sixteen and not fifteen. The runner's optional-gate
branch is written and unexercised in this tree: if `verify-touch-targets.mjs` were
ever absent it reports *not present* with plan 41-11's decision named, and does not
fail. That branch was **not** proven by mutation — deleting a committed gate to watch
a message print was not worth the risk of leaving the tree short of one, and saying
so is better than implying it was tested.

---

## What the runner does that the plan did not ask for

Two additions, both in the same direction — closing a way for a green to be wrong:

**1. The registry is reconciled in BOTH directions, before anything runs.** Every
`verify:*` entry in `package.json` must be in `OFFLINE` or `NEEDS_SERVER`, and every
declared name must be in `package.json`. A gate somebody registers and forgets to
declare here would otherwise **never run while a tick was printed** — precisely
T-41-44. A mismatch is a **refusal**, not a failure: the honest sentence is *"this
run did not measure everything the repository declares"*, which is not the same
statement as *"something is wrong with the tree"*.

**2. The command is read from `package.json`, never copied.** Only names are declared
in the runner. A second copy of a command drifts silently — the copy keeps passing
while the real entry moves. The precedent is `verify-organizer-redirects.sh`, which
parses the redirect table out of its source module for the same reason. A command
whose shape the runner cannot resolve to a file is a refusal, not a guess.

### One limit, written into the file rather than discovered later

**This runner cannot always tell a gate that FAILED from a gate that CRASHED**: Node
exits 1 for an uncaught exception exactly as a red check does. The mitigation is
printed — **stderr is shown for every gate that did not pass** — and a stack trace
means the gate is broken, not the tree.

That warning is **gated on what a stack trace actually looks like**, and the first
draft was wrong here. It printed on every non-pass, which meant it fired on
`verify:capabilities`' plain `FATAL:` line — a gate working exactly as designed. **A
note that misfires on the common case trains a reader to skip it on the rare one**,
which would have made the one discriminator this runner has worthless. Fixed before
the commit, not after.

---

## Deviations from Plan

### 1. [Reconciliation] `npm run verify` exits 2, not 0, and the plan's criterion assumed an environment

Covered in full above. **Which side was wrong: the criterion.** It was written from a
tree where `verify:capabilities` was observed at exit 0 (the plan's `<interfaces>`
section says so) — a machine holding credentials. This worktree holds none, and
`verify:capabilities` refused **before** this plan changed anything, measured
directly. Nothing was loosened to reach a green.

### 2. [Rule 1 — Bug, caught in the same task] The stack-trace note fired on every refusal

- **Found during:** Task 1, reading the first aggregate run's own output.
- **Issue:** the paragraph explaining that a stack trace means a broken gate printed
  under `verify:capabilities`' stderr, which is a one-line `FATAL:` and not a stack
  trace at all.
- **Why it is a defect and not cosmetics:** this note is the **only** discriminator
  the runner has for the crash-versus-red ambiguity it declares in its own header. A
  discriminator that fires on the common, correct case is a discriminator a reader
  learns to ignore.
- **Fix:** the note is now conditional on a line matching the shape of a Node stack
  frame. The stderr itself is still always printed.
- **Commit:** `26462dc` (fixed before the task's commit).

### 3. [Addition] The release pass records what this pass must NOT do

The plan asked for six observations. The document also carries a closing block
naming the three steps that stop short of a production write:
`/payment/callback` opened on its **refusal branch** rather than by making a payment;
the withdraw-access confirmation ending on **Cancel**; `Retire` confirming that
**Enter retires nothing**. This is not decoration — a release pass that sent somebody
to a money surface to look at a layout is how a verification script creates a row,
and this project has already lost 63 rows across seven tables that way, with no PITR.

---

## Verification

Per `CLAUDE.md` Guardrail 1 and `meta-gates.md`: **there is no test runner for the
product**, and nothing below is claimed on the basis of tests passing.

| Check | Result |
|---|---|
| `npm run build` after each task | **exit 0** — compiled, TypeScript clean |
| `npm run verify` | **exit 2** — 14 passed, 0 failed, **1 REFUSED** (`verify:capabilities`), 1 not run (`verify:redirects`) |
| `node scripts/verify-persona.mjs` | **exit 0** |
| every individual gate | in the table above; the only non-zero is `verify:capabilities` at 2 |
| `git diff --name-only 26462dc~1 HEAD` | **3 files**: `41-RELEASE-PASS.md`, `package.json`, `scripts/verify-all.mjs`. **Zero** under `scanner/` or `(admin)/door/` |
| `git diff --diff-filter=D --name-only 26462dc~1 HEAD` | **empty — nothing deleted** |
| `git status --short` after the last commit | clean, no untracked files |
| `dependencies` / `devDependencies` byte-identical to `HEAD~2` | **true / true** |

### The acceptance criteria, one by one

| Criterion | Result |
|---|---|
| `npm run verify` prints one line per gate with its exit code and verdict | **yes**, twice — a live line as each finishes and a table at the end |
| exits 0 | **no — exit 2**, and deviation 1 records which side was wrong and why a 0 was not available honestly |
| printed gate count equals `verify:*` entries minus `NEEDS_SERVER` | **15 = 16 − 1**, asserted against `Object.keys(p.scripts).filter(k=>k.startsWith('verify:')).length` → **16**, and printed by the runner's own count block |
| the report names `verify:redirects` as not run, with its reason | **yes**, on every run, pass or fail |
| failure propagation proven by an asserted mutation | **cycle F1** — mutation asserted, exit 1, that gate FAILED, fourteen others still reported, reverted and re-asserted byte-identical |
| refusal propagation proven, REFUSED not FAILED | **cycle R1** — mutation asserted, two gates flipped to REFUSED, zero FAILED, reverted and re-asserted |
| `verify:touch-targets` absent → reported and unregistered | **not applicable — G5 exists.** The branch is written; it was not proven by mutation, and that is stated rather than implied |
| `41-RELEASE-PASS.md` contains `H41-1` … `H41-6` with steps, expected result and a place to record | **yes** — 28 `H41-` occurrences; each of the six has steps, an expected result and a `Result: pending` line |
| it names the eight converted surfaces by route from the manifest | **yes**, all eight with their manifest `width` value |
| H41-4 states in the body that criterion 5 is `human_needed` without a large touch screen | **yes**, in a block quote above the steps, not in a footnote |
| `node scripts/verify-persona.mjs` exits 0 | **exit 0** |

---

## Manual verification still owed — all six, and the approval did not change that

**Not one of H41-1 … H41-6 has a recorded observation, and no green above stands in
for any of them.** Two reasons, and they are different reasons:

1. **During execution:** the one 41-05, 41-06, 41-07, 41-08, 41-09, 41-10 and 41-11
   each recorded — **no worktree in this phase held `.env.local`**, the middleware
   reads Supabase credentials on every request, and pointing a running application at
   production is an act requiring an authorisation no agent here held.
2. **At the gate:** the owner authorised the close **without reporting any per-item
   finding**. An authorisation to close is not an observation, and this SUMMARY does
   not promote one into the other.

They are written down, with steps, in
`.planning/phases/41-shared-primitives-three-tier-layout/41-RELEASE-PASS.md`, whose
`Result` lines now each state, in full, what they do **not** contain. They remain
scheduled with the end-of-v1.5 sitting that already owns Phase 40's H1–H3 and Phase
39's door pass.

**The four that decide something:**

- **H41-4** is the only proof in this repository that anything is 44px. It needs a
  large touch screen, one may not exist, and if it does not, **criterion 5 is
  `human_needed` and is not ticked.** The two auth links plan 41-11 fixed are the
  first thing to look at: they are the newest elements in the phase and nobody has
  ever seen their rendered box.
- **H41-2 step 4** is assumption **A2**, open since research, which plan 41-09 could
  not close.
- **H41-2 step 6** — Cancel holds focus on `Retire`, and Enter retires nothing. A
  format's progressivo is already on a poster.
- **H41-6b** — if a 224px column appears at `/door`, the D-41-21 fence failed. That
  is the most important negative result this pass can produce, and it is about an
  entrance rather than about a layout.

---

## Known Stubs

**None.** No TODO, no FIXME, no placeholder, no list seeded with a symbol that does
not exist.

Two things that could be mistaken for stubs and are not:

- **`NEEDS_SERVER` has one entry.** That is the measured count of gates in this
  repository that need a running server, not a list waiting to be filled.
- **The optional-gate branch has zero sites today.** G5 exists. The branch is
  implemented and declared, and the SUMMARY says above that it was not proven by
  mutation — a claim recorded as untested rather than presented as covered.

**Every `Result` in `41-RELEASE-PASS.md` now names its own emptiness rather than
reading `pending`, and that is the document still working.** Six of them say *covered
by the owner's blanket approval, without itemised evidence recorded*; `H41-4` and
`§0.2` say `human_needed`; `§0.1` alone carries a measurement. **A phase whose last
plan could not open a browser, closed by an owner who did not report opening one
either, is exactly what those lines say.**

---

## Threat model — the five dispositions this plan carries

- **T-41-44 (Spoofing — `verify-all.mjs`): mitigated, four ways.** A missing gate
  file is reported, never skipped — as a failure unless it is the one gate declared
  optional. `NEEDS_SERVER` is printed on every run, pass or fail. Exit 2 is preserved
  as *refused* and is never collapsed into *failed* or into *passed*, proven by cycle
  R1. And the registry is reconciled in both directions, so a registered gate the
  runner does not know about **refuses** rather than being silently absent from a
  green.
- **T-41-45 (Repudiation — a green that hides a failure): mitigated.** All gates run
  to completion; the run does not stop at the first failure, proven by cycle F1,
  where fourteen gates still reported after one went red. Every verdict is printed
  twice and the count block reconciles against `package.json`.
- **T-41-46 (Information Disclosure — `41-RELEASE-PASS.md`): mitigated.** The
  document names routes, files, widths and **capabilities**. No venue under
  negotiation, no unannounced date, no line-up, **no person** — the accounts are
  described as *an account holding `organizer.access`*, never as who would hold it.
  `verify-persona.mjs` exits 0, which is the control that keeps production material
  out of this repository.
- **T-41-47 (Tampering — the door at the phase gate): mitigated.**
  `git diff --name-only 26462dc~1 HEAD` returns three paths, **none** under
  `scanner/` or `(admin)/door/`. The checkpoint's step 5 and the release pass's
  H41-6b each put a person in front of `/door` and `/admin/scanner`.
- **T-41-SC (Tampering — package installs): no package installed, removed or
  changed.** `dependencies` and `devDependencies` are byte-identical to `HEAD~2`,
  asserted by a JSON comparison rather than by reading the diff.

**Monotone guards:** all three untouched. `venue_reveal_sent` is not reachable from
any file in this plan; no payment state is read or written; no format's series
numbering is read, written or renumbered. This plan added one script, seven npm
entries and one planning document.

**Access and gating:** nothing in this plan reads a role, a status or a capability at
runtime. `verify:capabilities` is *invoked* by the runner and refuses on its own; the
runner passes it no argument, sets no environment variable and reads none.

**DEF-41-01, applied deliberately:** Tailwind's automatic content detection scans this
repository, `.planning/` included, and compiles class strings out of prose and out of
comments. **Neither file this plan created contains a single utility-class literal** —
not in code, not in a comment, not in the release pass, which describes widths as
numbers of pixels. Nothing here can add a rule to the emitted stylesheet.

---

## Threat Flags

**None.** No route added, no query, no input, no schema, no network path. The runner
opens no network connection, reads no environment variable, writes no artefact, and
executes only commands already declared in `package.json`. It does spawn child
processes — of paths read from `package.json`, in a repository where `package.json`
is already the file that decides what `npm run` executes.

---

## What the next plans inherit

- **`npm run verify` is the phase's registration, and it is only as honest as its two
  lists.** Any plan adding a `verify:*` entry must add its name to `OFFLINE` or
  `NEEDS_SERVER` in the same commit — otherwise the runner **refuses**, loudly, which
  is the intended failure direction and not an inconvenience to route around.
- **Phase 42 converts the door**, and when it does, the honest move recorded by plan
  41-11 still stands: remove those paths from the fence in the same commit, in both
  the manifest and `verify-touch-targets.mjs`, which cross-check each other.
- **`verify:capabilities` refusing is the normal state of this repository on a
  developer machine**, so the normal exit code of `npm run verify` is **2**, not 0.
  Anybody wiring this into a hook or a script must handle that, and must not "fix" it
  by treating 2 as success. If it is ever wanted as a hard gate, the answer is
  credentials, not a threshold.
- **Six observations are owed and none was taken — the approval closed the gate, not
  the observations.** `41-RELEASE-PASS.md` is the list, and each `Result` now states
  what it does not contain. **A phase-closing document, a VERIFICATION or a milestone
  audit that reads `approved` as six ticks is claiming measurements that do not
  exist** — in particular criterion 5 (RESP-03), which is `human_needed` for want of a
  large touch screen nobody said was there.
- **DEF-41-03 is still open and is now the phase's quietest debt.**
  `src/components/toast/Toast.tsx` carries a hand-written copy of the `IconButton`
  contract, and **the orphan counter that revealed it is green and silent**, because
  a different plan gave `IconButton` an importer elsewhere. No plan in this phase
  declares `src/components/toast/`. It leaves Phase 41 as debt, named here so it is
  named somewhere at the end.

---

## Self-Check

- `scripts/verify-all.mjs` — **FOUND**, contains `NEEDS_SERVER`, runs 15 gates
- `package.json` — **FOUND**, contains `"verify":`, 16 `verify:*` entries,
  dependencies byte-identical
- `.planning/…/41-RELEASE-PASS.md` — **FOUND**, 28 `H41-` occurrences, all six
  identifiers present with steps and a `Result: pending` line
- `.planning/…/41-RELEASE-PASS.md` after the close — **FOUND**, **zero** `Result:
  pending` lines remain; six read *covered by the owner's blanket approval, without
  itemised evidence recorded*; `H41-4` and `§0.2` read `human_needed`
- commit `26462dc` — **FOUND**
- commit `b04343d` — **FOUND**
- commit `22444fa` — **FOUND** (Task 3)
- `npm run verify` re-run at the gate — **exit 2**, as recorded above
- `npm run build` re-run at the gate — **exit 0**
- `node scripts/verify-persona.mjs` re-run at the gate — **exit 0, 7/7**
- `git diff --diff-filter=D --name-only` across all three commits — **empty**
- **No `.planning/STATE.md` or `.planning/ROADMAP.md` change in any commit of this
  plan** — those writes belong to the orchestrator

## Self-Check: PASSED
