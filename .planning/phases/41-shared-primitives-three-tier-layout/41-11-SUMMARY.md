---
phase: 41-shared-primitives-three-tier-layout
plan: 11
subsystem: tooling
tags: [resp-03, g5, touch-targets, gate, conversion-manifest, mutation-proof, a11y]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 01
    provides: "@custom-variant pointer-fine-only in globals.css — the one shrink this gate is allowed to forgive, and DEF-41-01, which governs how this file is written"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 05
    provides: "scripts/conversion-manifest.mjs — CONVERTED, PHASE_42_PATHS and checkManifest(), which are this gate's entire scope and its refusal"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 07
    provides: "verify-conversion.mjs — the import-closure walk reproduced here, the JSX comment shape (DEF-41-02), and the recorded reason a gate is self-contained rather than importing verify-tokens"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 10
    provides: "MemberTable converted onto primitives — the file this gate had to go green on; the measured fact that the one permitted shrink is emitted last; and the warning that the checkbox in this tree is exemption 2 and not 5"
provides:
  - "scripts/verify-touch-targets.mjs — G5, scoped to the conversion manifest, with all six of §13's exemptions as named constants and a per-category count of what each forgave"
  - "The measured fact that this parser run tree-wide meets 328 raw interactive elements and would fail 312 — the evidence that scoping is survival, not convenience"
  - "Two real RESP-03 defects found and fixed on the front door: the only link from /login to registration and its twin on /register"
  - "DEF-41-06 — the shared comment stripper's fifth shape, a block comment inside a JSX opening tag whose body lines are prose"
  - "The reconciliation that MemberTable.tsx holds 1 written measurable element, not more than 20, and that the difference is plan 41-10's conversion"
affects: [41-12, 42-scanner, 44-calendar, 45-production-sections]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A gate that reads ACROSS lines is a different class from one that reads within a line: the same comment stripper that is merely imprecise for the second is fatal for the first, and this phase found that only by writing its first cross-line reader"
    - "An exemption asserts its own premise or it is a hole: exemption 2 forgives every primitive call site in the product because the size lives in the primitive, so the gate checks that the primitive still declares it"
    - "A boundary guard has a LEADING half too — a height behind a breakpoint or behind the shrink variant is not the unconditional minimum, and reading it as one forgives exactly the thing the allow-list closes at one item"
    - "When a measured count disagrees with a plan's expected count, the reconciliation is git archaeology, not a looser parser: the pre-conversion file is on disk at a commit and can be counted"
    - "A green backed by an observed red on the same line is stronger evidence than a green backed by a large count"

key-files:
  created:
    - scripts/verify-touch-targets.mjs
  modified:
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/register/page.tsx
    - .planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md

key-decisions:
  - "THE PHASE ENDS WITH A TOUCH-TARGET GATE, not with a decision not to have one. It goes green on MemberTable.tsx and it went red first, on its very first run, on two real elements nobody had noticed."
  - "The two reds on the first run were fixed at the ELEMENT, never at the gate. §6.3 says everything is 44px unconditionally and the tree had already answered the same shape twice this phase; the threshold did not move and no exemption was widened. Both files are outside this plan's declared list, which is why it is recorded as a deviation and not folded in."
  - "The plan's acceptance criterion of more than twenty measured elements on MemberTable.tsx is WRONG, and the reconciliation names which side was wrong. The file held 14 raw interactive elements at 19de5a7~1 and holds 1 today; plan 41-10 moved thirteen onto primitives. Twenty is a RENDERED count — six act buttons per row — and a class-string parser counts what is written. No parser was loosened to reach it."
  - "Exemption 2 was implemented in two halves and both are counted. The primitive's own file is forgiven because its size lives in an interpolated constant; the call site is forgiven because §13 says the gate does not parse it — but the call site is COUNTED, because a report saying a dense surface has one interactive element when it has eleven is a report that hides its own scope."
  - "Exemption 2 asserts its own premise, and that assertion is a failure rather than a refusal. If a primitive file stops declaring the minimum, the exemption would forgive every call site in the product in silence — the shape of a check that goes quiet while the thing it tracked is still in the tree."
  - "A seventh exemption was NOT invented. The one shape known to be a future red — an input that renders no box — is written into the file as a declared limit instead, because widening a closed list to clear a red is the tampering T-41-42 names."
  - "An unterminated opening tag is a REFUSAL, exit 2. A scanner that has lost sync has not measured what comes after it, and that narrowing is the one direction that produces a green."
  - "The gate is scoped to the manifest because the alternative was measured, not imagined: tree-wide it meets 328 raw elements and 312 would fail."

requirements-completed: []

# Metrics
duration: ~150min
completed: 2026-08-12
tasks: 3
commits: 3
files_changed: 4
---

# Phase 41 Plan 11: The Gate That Went Red On The Front Door Summary

**This phase ends with a touch-target gate, not with a written decision not to
have one — and it earned that on its first run, before any mutation, by
reddening on two real elements: the only link from `/login` to registration and
its twin on `/register`, both bare inline links with no height of their own on
surfaces already declared converted. They were fixed at the element; the 44px
threshold did not move and no exemption was widened. `scripts/verify-touch-targets.mjs`
is scoped to the eight surfaces in the conversion manifest and nothing else,
carries all six of §13's exemptions as named constants with a per-category count
of what each forgave, and refuses rather than passing when it cannot measure. It
was proven able to fail five ways with every mutation asserted present before
its result was read, and it goes green on `MemberTable.tsx` — where it finds
eleven interactive elements, measures one, and forgives ten. The plan expected
more than twenty measured there; one is what is written, the reconciliation is
against `19de5a7~1`, and the plan's number is the one that was wrong.**

## The one-sentence answer the plan asked for at the top

**This phase ends with a touch-target gate.** It exists, it is committed, and
`node scripts/verify-touch-targets.mjs` exits 0.

## Performance

- **Duration:** ~150 min
- **Tasks:** 3, one commit each
- **Files changed:** 4 — 1 created, 3 modified, **0 deleted**
- **Files under `scanner/` or `(admin)/door/` touched:** **0**, asserted by
  `git diff --name-only c43d5dd~1 HEAD`
- **Packages added, removed or changed:** **0** (D-41-20). `package.json`
  untouched — the gate is Node built-ins and ESM, and the two element fixes are
  class strings

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | G5, scoped, six exemptions written first — and the two elements its first run found | `c43d5dd` | `scripts/verify-touch-targets.mjs`, `login/page.tsx`, `register/page.tsx` |
| 2 | Five proven cycles, every mutation asserted before its result | `164c0c3` | `scripts/verify-touch-targets.mjs` |
| 3 | Green on `MemberTable.tsx`, the count reconciled, DEF-41-06 recorded | `3285aea` | `scripts/verify-touch-targets.mjs`, `deferred-items.md` |

---

## The first run, which is the part that matters most

**Before any mutation, on the tree exactly as wave 7 left it, the gate exited
1** and named two elements:

```
  FAILED — 2 element(s) do not declare the minimum:

    src/app/(auth)/login/page.tsx:210  <Link>
      no unprefixed height declaration — §6.3 says every target is 44px unconditionally
      <Link href={rawNext !== null && !nextRefused ? `/register?next=…` : "/register"}
            className={`text-accent hover:text-accent-hover ${FOCUS_RING}`}>

    src/app/(auth)/register/page.tsx:204  <Link>
      no unprefixed height declaration — §6.3 says every target is 44px unconditionally
      <Link href={nextUrl ? `/login?next=…` : "/login"}
            className={`text-accent hover:text-accent-hover ${FOCUS_RING}`}>
```

These are not decorative anchors. **The first is the only route from the front
door to registration** — the target a first-time visitor reaches for, on a
phone, before this product has any other way of keeping them. The second is the
way back for somebody who already has an account and landed on the wrong page.
Both were about twenty pixels tall.

**Neither was ambiguous under the contract.** §6.3 is unqualified: *"Everything
else is 44px unconditionally, at every tier, on every device"*, and its
allow-list of shrinks has exactly one item, which is not this. And the tree had
already answered the identical shape twice **in this same phase** —
`(work)/members/register/page.tsx:325` (plan 41-08) and
`(work)/members/page.tsx:204` (plan 41-10) both give a bare inline link the
minimum with the inline-flex form.

So Task 3's first legitimate move applied, one plan earlier than the plan
expected it: **fix the element, not the gate.** Deviation 1 below carries the
impact analysis, because these two files belong to `access-gating` and to
neither this plan's declared list.

---

## Proven able to fail — five cycles, every mutation asserted first

`ai-engineering.md`'s *gate prova per mutazione*, and the reason the clause
exists: a substitution that silently does not land produces a green that reads
exactly like a working check. **Every assertion below was taken BEFORE the
gate's result was read.**

### Cycle R0 — the empty manifest

| Step | Command | Result |
|---|---|---|
| mutate | `CONVERTED.length = 0` added to the manifest | — |
| **assert-mutation** | `grep -c 'MUTATIONR0' scripts/conversion-manifest.mjs` | **1** |
| **assert-mutation** | `node -e "…CONVERTED.length"` | **0** |
| read | `node scripts/verify-touch-targets.mjs` | **exit 2** — *"CONVERTED is empty… A vacuous green is not a green"* |
| revert | the two lines removed | — |
| **assert-revert** | `grep -c 'MUTATIONR0'` | **0** |
| **assert-revert** | `node -e "…CONVERTED.length"` | **8** |
| read | the gate | **exit 0** |

### Cycle R1 — a minimum shrunk to 32px, on `MemberTable.tsx:1109`

The element chosen deliberately: a raw control written at a call site, on the
file the green proof is about, covered by no exemption.

| Step | Command | Result |
|---|---|---|
| baseline | `grep -c 'min-h-11' src/components/admin/MemberTable.tsx` / `grep -c 'min-h-8'` | **1** / **0** |
| **assert-mutation** | `grep -c 'min-h-8'` / `grep -c 'min-h-11'` | **1** / **0** |
| read | the gate | **exit 1** |
| — | its message | `src/components/admin/MemberTable.tsx:1109  <button>` · `min-h-8 = 32px — below 44px`, with the class string quoted |
| **assert-revert** | `grep -c 'min-h-8'` / `grep -c 'min-h-11'` | **0** / **1** |
| read | the gate | **exit 0** |

### Cycle R2 — no height class at all, same element

The half that catches an over-lenient parser: a missing declaration must fail as
loudly as a small one.

| Step | Command | Result |
|---|---|---|
| **assert-mutation** | `grep -c 'min-h-11'` / `grep -c 'min-h-'` | **0** / **1** — the one remaining is `DENSE_ROW_ACTION` at `:311`, which is the shrink and not this element |
| read | the gate | **exit 1** |
| — | its message | `src/components/admin/MemberTable.tsx:1109  <button>` · *no unprefixed height declaration — §6.3 says every target is 44px unconditionally* |
| **assert-revert** | `grep -c 'min-h-11'` · `git diff --stat` on the file | **1** · **empty — byte-identical to HEAD** |
| read | the gate | **exit 0** |

### Cycle E3a / E3b — the one exemption that permits a sub-44px declaration

This one was not asked for and is the most important of the five, because
exemption 3 is the **only** rule in the gate that lets something smaller than
44px pass. An exemption nobody can reach is decoration; an exemption that fires
on one condition instead of two is a hole.

| # | Condition | Assert-mutation, taken first | Gate |
|---|---|---|---|
| **E3a** | the shrink on a raw element **with** the DataTable import in the file (`MemberTable.tsx`) | `pointer-fine-only` → **2**, `min-h-11` → **0**, `ui/DataTable` → **1** | **exit 0**, exemption 3 applied **1**, measured **9 → 8** |
| **E3b** | the same shrink **without** the import (`GalleryClient.tsx`) | `pointer-fine-only` → **1**, `min-h-11` → **0**, `ui/DataTable` → **0** | **exit 1**, exemption 3 applied **0** |

**Both halves of the condition are load-bearing**, and E3b proves a second thing
in the same run: the gate read the prefixed value as **no declaration at all**,
not as 36px. That is the leading boundary guard doing its job.

### Cycle E4 — a minimum behind a breakpoint

| Step | Result |
|---|---|
| **assert-mutation** — `grep -c 'md:min-h-11'` on `GalleryClient.tsx` | **1** |
| the gate | **exit 1**, verdict *no unprefixed height declaration* |
| **assert-revert** — `grep -c 'md:min-h-11'` / `grep -c 'min-h-11'` | **0** / **1** |
| `git status --short` | **empty — every mutation in this plan reverted byte-for-byte** |

**E3b and E4 are the two that matter**, because they are the two ways a looser
parser goes green on a target a finger cannot hit: a height that only exists on
a wide screen, and a height that only exists where there is no touch input. A
phone reaches neither.

---

## Proven green on `MemberTable.tsx` — and the count, reconciled

`node scripts/verify-touch-targets.mjs` → **exit 0**. Its line for that file,
verbatim from the report:

```
    file                                                       found  meas  e2a  e2b  e3  e4  e5  e6
    src/components/admin/MemberTable.tsx                          11     1    0    8   0   0   0   2
```

**Eleven interactive elements found. One measured. Ten forgiven** — eight
primitive call sites and two badges. Nothing in that file went unseen.

### The plan expected more than twenty measured, and the plan was wrong

Reconciled line by line rather than argued with, per the lesson this phase has
now paid for four times:

| Where | Written raw interactive elements | Source |
|---|---|---|
| `MemberTable.tsx` at `19de5a7~1`, **before** plan 41-10 | **14** — six act buttons, three filters, two checkboxes, a caret, a staff shortcut | `git show 19de5a7~1:…` then `grep -cE` |
| `MemberTable.tsx` today | **1** | this gate's report, and 41-10's own SUMMARY, which says *"the two raw interactive elements on the whole surface"* — one here, one on `page.tsx` |

**More than twenty is not reachable by any written-element count at any point in
this file's history.** It is reachable at *runtime* — six act buttons per row,
two boxes per row, four tabs over a list of members — and that is almost
certainly where the number came from. A class-string parser counts what is
**written**, never what is **rendered**, which is the same distinction the gate's
own header opens with.

**One measured element is not a thin measurement. It is a converted file**, and
the plan that converted it is the one immediately before this one. The
acceptance criterion describes a file that plan 41-10 had already dismantled.

### What actually rules out the vacuous green here

Not a count — a count can be inflated by a looser parser, which is precisely
T-41-40's attack. What rules it out is that **R1 and R2 were run on that exact
element in that exact file**: the one thing this gate measures in
`MemberTable.tsx` has been observed failing twice and passing three times. An
observed red on the line is stronger evidence than a large number.

Three further guards, all mechanical:

- the gate **refuses (exit 2) when the total measured count is zero**, which is
  T-41-40's mitigation written as code;
- every element found is classified, and the classification is printed, so a
  shrinking measured count shows up as a growing exemption count rather than as
  silence;
- an **unterminated opening tag is a refusal**, so a parser that loses sync
  cannot report a green over the part of a file it never reached.

---

## The scope decision, measured rather than argued

`41-VALIDATION.md` predicted this gate would be red on correct code if run
tree-wide. That prediction is now a measurement. The same parser, read-only,
over all of `src/` with the Phase 42 fence applied and the primitive files
skipped:

| | |
|---|---|
| files scanned | **180** |
| files fenced (Phase 42) | 5 |
| files exempt as primitives | 6 |
| raw interactive elements met | **328** |
| would pass | **16** |
| **would fail** | **312** |
| unterminated tags | **0** |

The five worst: 31 in the event form, 14 in the transaction list, 11 each in the
drink-menu manager, the discount-code card and the tier card.

**That is not a finding about the product. It is a description of a gate nobody
would keep.** Scoping to the eight declared surfaces is what makes G5
survivable, and the number it guards goes up only when a human converts a
surface and writes it into the manifest — which is a decision somebody signs.

The same run is the evidence for DEF-41-06: **zero unterminated tags across all
180 files** with the fifth comment shape in place.

---

## The six exemptions, and what each one actually forgave

Printed by the gate on every run. A green must state what it forgave.

| # | Exemption | Applied | Note |
|---|---|---|---|
| **1** | Phase 42, by path | **0 files fenced** | no scanner or door file is reachable from any converted surface today. The three paths are printed on every run anyway, with the reminder that they were **never measured** |
| **2a** | a raw element inside a primitive's own file | **10** | the size lives in an interpolated constant the parser cannot follow — `Button.tsx:157` is four identifiers |
| **2b** | a primitive rendered at a call site | **54** | §13 says the gate does not parse the call site; it counts it, because a report that says a dense surface has one interactive element when it has eleven hides its own scope |
| **3** | the one permitted shrink | **0** | reachable, proven in both directions (E3a/E3b), and unused in fact: the tree's one shrink is on a `<Button>` call site, which 2b forgives first |
| **4** | a wrapper marked as deferring to its child | **0** | no such wrapper exists in any converted closure — 41-10 measured the same and wrote that claiming one for nothing is an exemption claimed for nothing |
| **5** | a hidden input named by its label | **0** | this tree's checkbox is a **visible** box inside its label, so it is exemption 2. 41-10 wrote that warning for this file and it was correct |
| **6** | a non-interactive badge | **6** | a badge that is a link or a button is a Chip, and the raw tags are scanned whatever they are dressed as |

**Three of the six have zero sites today, and the report says so out loud** with
the reason each is zero. That is the honest form: an exemption nobody can reach
is decoration, so 3 was proven reachable by mutation and 4 and 5 are declared
unreachable-today rather than left looking active.

### Exemption 2 asserts its own premise

The gate checks that each exempted primitive file **still declares the minimum**.
If somebody deletes it from `Button.tsx`, exemption 2b would otherwise forgive
54 call sites in silence — the shape of a check that goes quiet while the thing
it tracked is still in the tree, which is 41-08's recorded lesson. That
assertion is a **failure (exit 1), not a refusal**: the premise being false is a
defect, not an inability to measure.

Six of the seven declared modules were verified present and declaring. The
seventh, `Switch`, carries a **null path**: it does not exist in this tree
(D-41-04 forbids publishing a primitive in a wave that does not render it, and
no converted surface has a switch). A null removes nothing from scope; a wrong
path would, which is why the gate refuses on a non-null path that is not on disk.

### And no seventh exemption was invented

Two shapes are known to be future reds and are **written into the file as
declared limits** rather than pre-empted by a quiet widening:

1. **an input that renders no box** — no height class is meaningful on it. Zero
   in scope today;
2. **a height expressed with a keyword rather than a number** — it declares a
   box the parser cannot resolve to pixels, so it is not an explicit minimum.
   Zero in scope today.

When the first one arrives the resolution is a contract edit a person reads.
Widening a closed list to clear a red is exactly T-41-42.

---

## Deviations from Plan

### 1. [Rule 1 — Bug, on files this plan does not declare] Two under-44px targets on the front door

- **Found during:** Task 1, the gate's first execution, before any mutation.
- **Issue:** `src/app/(auth)/login/page.tsx:210` and
  `src/app/(auth)/register/page.tsx:204` are `<Link>` elements with no height
  declaration of any kind. On a phone they are about twenty pixels tall. The
  first is the only path from the front door to registration.
- **Why it is a defect and not a false red:** §6.3 says *"Everything else is
  44px unconditionally, at every tier, on every device"*, and §6.4's ranked list
  is explicitly *"the unambiguous cases"*, not a closed one. Both files were
  declared converted by plan 41-06 and both links pre-date it.
- **Fix:** the minimum plus the inline-flex form and the vertical alignment that
  keeps the link inside its sentence instead of dropping the sentence around it.
  This is the same construction plans 41-08 and 41-10 shipped on the identical
  shape, with one addition — those two links are standalone and these two sit
  **mid-sentence**, so the alignment utility is what keeps the paragraph
  readable.
- **Cross-domain check, because `src/app/(auth)/**` is `access-gating`
  primary:** **the `href` expressions are byte-identical.** `/login`'s ternary is
  plan 37-12's open-redirect refusal — *a refused value does not travel* — and a
  class string does not get to reason about it. No role read, no status read, no
  redirect validation, no server action, no query. The diff on each file is one
  class string and one comment.
- **Why it is a deviation and not folded in:** neither file is in this plan's
  `files_modified`, and no other plan in this phase declares them. The
  alternative — leaving the gate red, or exempting the shape — is the outcome
  the plan forbids in both directions.
- **Commit:** `c43d5dd`.

### 2. [Reconciliation] The plan's expected measured count on `MemberTable.tsx` is unreachable

- **Found during:** Task 3.
- **Issue:** the criterion asks for *"a measured-element count greater than 20"*
  on `MemberTable.tsx`. Measured: **1**, out of 11 interactive elements found.
- **Reconciled line by line**, against the tree rather than against the plan:
  the file held **14** raw interactive elements at `19de5a7~1` and holds **1**
  today, because plan 41-10 moved thirteen of them onto primitives. Twenty is
  not reachable at any point in the file's history by a written-element count.
- **Which side was wrong:** the plan's. Its number describes either a rendered
  count — six act buttons per row over a list of members — or the file as it was
  before the plan immediately preceding this one converted it. **A class-string
  parser counts what is written.**
- **What was NOT done:** no parser was loosened, no threshold moved, no call
  site was reclassified as *measured* to inflate the number. §13 says in as many
  words that the gate does not parse the call site.
- **Commit:** `3285aea`.

### 3. [Rule 3 — blocking] The comment stripper needed a fifth shape before the gate could run at all

- **Found during:** Task 1, the first pass of the element scanner.
- **Issue:** `src/components/media/MediaGrid.tsx:67-72` carries a **block comment
  inside a JSX opening tag**, indented, whose body lines start with prose. The
  three sibling openers blank its first and last lines and leave four sentences
  live. One contains an apostrophe, which opened a string that never closed and
  ran the tag scanner to end of file.
- **Measured consequence before the fix:** `MediaGrid.tsx:65 UNTERMINATED
  <button` — and every element after that point in the file unscanned, silently.
  `/gallery` reaches that file, so this was inside a declared surface.
- **Fix:** a block-comment **state** in this gate's own stripper — an opener
  without its closer blanks lines until the closer arrives. Still a line shape,
  not a parse (WR-07 records that a real comment parser written here was
  unsound), and its error direction is stated in the file.
- **Second fix, and the more important one:** an unterminated opening tag is now
  a **refusal**, exit 2. A scanner that has lost sync has not measured what
  comes after it, and reporting a green over it is the narrowing that produces a
  green.
- **Recorded as DEF-41-06** for the four sibling gates, which are **not known to
  be wrong today** — they all match within a line, so a live prose line is
  simply not a hit. It is prevention, not a bug report, and it is priced as such
  in the entry.
- **Commit:** `c43d5dd` (the fix), `3285aea` (the deferred entry).

### 4. [Addition the plan did not ask for] A per-surface report beside the per-file one

- Task 1's criterion asks for the counts *"per converted surface"*. Closures
  overlap — the primitives are in eight of them — so a per-surface view alone
  would count one file up to eight times and a per-file view alone would not
  answer the criterion. **Both are printed**, with a sentence saying they do not
  sum to the same total and why.

---

## What the gate does NOT say, restated because it is the easiest thing to
misquote

**A green here does not mean anything is 44px.** It reads class strings. It
cannot see a flex stretch, an icon set's own height, a `line-height` override, a
transform, or a target padded by an ancestor.

**H41-4 is the only proof that anything is 44px**, it needs a large touch
screen, and `41-RESEARCH.md` records that one may not be available — in which
case **criterion 5 is `human_needed` and is not ticked.** This plan does not
tick it. That sentence is in the gate's own header, in a box, above everything
else in the file, and it is printed on every run.

Two more things a green does not say, both of which follow from the scope:

- **it says nothing about the door.** The three fenced paths are printed on
  every run with the reminder that they were never measured. If an under-44px
  target exists behind that fence — and `ScannerClient.tsx:2909,2918` are about
  eighteen pixels — this gate is silent about it by design. **That is the most
  important thing it could ever find and it will not find it.** At two in the
  morning, at an entrance, on a staff phone, a control too small to hit is not a
  cosmetic defect: it is a queue. Phase 42 owns those files;
- **it says nothing about 312 elements** in the unconverted product, which the
  measurement above enumerates.

---

## Verification

Per `CLAUDE.md` Guardrail 1 and `meta-gates.md`: **there is no test runner for
the product**, and nothing below is claimed on the basis of tests passing.

| Check | Result |
|---|---|
| `npm run build` after every task | **exit 0** — compiled, TypeScript clean |
| `node scripts/verify-touch-targets.mjs` | **exit 0** — 9 measured, 70 exempt, 0 failures |
| `node scripts/verify-conversion.mjs` | **exit 0** |
| `node scripts/verify-tokens.mjs` | **exit 0** |
| `node scripts/verify-tables.mjs` | **exit 0** |
| `node scripts/verify-dialogs.mjs` | **exit 0** |
| `node scripts/verify-breakpoints.mjs` | **exit 0** |
| `node scripts/verify-semantic-separation.mjs` | **exit 0** |
| `node scripts/verify-sunset-gradient.mjs` | **exit 0** |
| `node scripts/verify-media-strip.mjs` | **exit 0** |
| `node scripts/verify-no-viewport-read.mjs` | **exit 0** |
| `node scripts/verify-capabilities.mjs` | **exit 2 — a REFUSAL, nothing measured.** It needs Supabase credentials this worktree does not hold, and its state is identical before any change in this plan. Recorded rather than omitted, because an unrun gate reported as absent is how a green becomes a claim |
| `npm run verify:persona` | **exit 0** |
| `git diff --name-only c43d5dd~1 HEAD` | 3 files, **zero** under `scanner/` or `(admin)/door/` |
| `git diff --diff-filter=D --name-only c43d5dd~1 HEAD` | empty — **nothing deleted** |
| `git status --short` after the last commit | clean, no untracked files |

### The acceptance criteria, one by one

| Criterion | Result |
|---|---|
| the gate exits 0 and prints, per converted surface, elements measured and exemptions by category | **exit 0**, and both a per-surface and a per-file table are printed |
| `grep -c 'scanner' scripts/verify-touch-targets.mjs` ≥ 1 | **10** |
| `grep -c 'data-target="child"' scripts/verify-touch-targets.mjs` ≥ 1 | **1** — a named exported constant, read and never inferred |
| `grep -c 'pointer-fine-only'` ≥ 1, and both the variant and the import required | **1** (the `SHRINK_VARIANT` constant), and both conditions proven load-bearing by E3a/E3b |
| refusal proven: `CONVERTED` emptied, asserted 0, gate exits 2, restored and re-asserted | **cycle R0**, four assertions, exit 2 |
| the three greps and three exit codes of the shrink cycle, in order | **cycle R1** above, verbatim |
| the same for the no-height-class cycle | **cycle R2** above, verbatim |
| `npm run build` exits 0 after the reverts | **exit 0** |
| the gate exits 0 and names `MemberTable.tsx` with a measured count greater than 20 | **exit 0**; the count is **1 of 11 found**, and deviation 2 records which side of the disagreement was wrong |
| the 44px threshold unchanged | **unchanged.** `REQUIRED_PX = 44` |
| `MemberTable.tsx` on no exemption list | **on none.** `grep -c 'MemberTable' scripts/verify-touch-targets.mjs` → **0** |
| `git diff --name-only` contains no `scanner/` and no `(admin)/door/` | **confirmed** |

---

## Manual verification still owed — H41-4, and now H41-5 too

**Not performed, and this is the part of the plan's output that cannot be
delivered from here.** No green above stands in for it.

The reason is the one 41-05, 41-07, 41-08, 41-09 and 41-10 each recorded: the
application cannot be run from this worktree, because the middleware reads
Supabase credentials on **every** request
(`src/lib/supabase/middleware.ts:267-268`; only the example env file exists
here). Pointing a running application at production is an act requiring an
authorisation this agent does not hold.

### H41-4 — the only thing that proves 44px, and criterion 5 rests on it alone

**On a large touch screen** — a tablet, not a narrow phone, because criterion 5
says *large touch screens included* and a 1024px iPad is touched:

1. Open `/login`. **Put a thumb on the *Sign Up* link** at the end of the closing
   sentence. It must be comfortably reachable without aiming. Measure it if the
   device allows: at least 44px tall. Do the same for *Sign In* on `/register`.
   **These two are new in this plan and are the only elements whose rendered box
   nobody has seen.**
2. `/admin/members` — the staff-count shortcut inside the sentence of counts, the
   status tabs, the two filters, the search field, the row actions, the
   disclosure caret in both branches, and both checkboxes. Every one at least
   44px.
3. `/gallery` — the event heading link above each group, and every thumbnail.
4. `/admin/formats` — every colour swatch in the picker, which is a radio group
   used one-thumbed.
5. `/payment/callback`, `/set-password`, `/admin/members/register` — every
   button and every link.

**If no large touch screen is available, criterion 5 is recorded `human_needed`
and is NOT ticked.** The gate's green does not substitute for it, and this
SUMMARY does not claim it does.

### H41-5 — the other half of the trade, which the shrink makes observable

**On a desktop with a mouse only**: the row-action pills in the member table's
table branch are about 36px, and **only those**. If they are 44px the custom
variant did not match; if anything else on any converted surface is under 44px,
that is a defect the gate could not see.

### And the one observation this plan created work for

**The two auth links now open their paragraph's line box to 44px.** Read
`/login` and `/register` at 390px and confirm the closing sentence still reads as
a sentence — *Don't have an account? Sign Up* on one line, with the link
vertically centred against the text rather than sitting below it. This is the
only visual consequence of this plan, it was made without being able to look at
it, and it is the thing to look at first.

---

## Known Stubs

**None.** No TODO, no FIXME, no placeholder, no list seeded with a symbol that
does not exist, no component wired to empty data.

Three numbers in this SUMMARY and in the gate's header could have been stubs and
are not: the tree-wide 328/312 figure was measured by running the parser
read-only over `src/`; the pre-conversion count of 14 was taken from
`git show 19de5a7~1`; and every exemption count is printed by the gate itself on
the run that produced this document.

Three exemptions apply zero times. **That is a measurement, not a stub** — each
is implemented, each is reachable or declared unreachable-today with its reason,
and exemption 3 was proven to fire by mutation in both directions.

---

## Threat model — the five dispositions this plan carries

- **T-41-40 (Spoofing — a green that measured nothing): mitigated, three ways.**
  The gate refuses (exit 2) when the total measured count is zero; it refuses on
  an unterminated opening tag, so it cannot report over a file it lost sync in;
  and it prints found/measured/exempt per file and per surface, so a stricter
  parser shows up as a shrinking measured count rather than as silence. The
  green on `MemberTable.tsx` is additionally backed by two observed reds on the
  one element it measures there.
- **T-41-41 (Denial of Service — a red on correct code): mitigated, and the
  mitigation is now measured.** Scoped to eight declared surfaces; tree-wide it
  would fail 312 of 328 elements. All six exemptions existed before the first
  run. The plan's exit route was deleting the gate rather than loosening it, and
  that route was live until Task 3 — it was not taken because the only two reds
  were genuine defects.
- **T-41-42 (Tampering — the exemption list widened to make a file pass): not
  attempted.** No seventh exemption. `MemberTable.tsx` is on no list
  (`grep -c 'MemberTable'` → 0). No path moved into the Phase 42 fence — which
  is additionally cross-checked at runtime against the manifest's own copy, so
  the two fences cannot drift. `REQUIRED_PX` is 44 and was never edited.
- **T-41-43 (Repudiation — RESP-03's real evidence): accepted and recorded**, in
  the gate's own header in a box, in its startup lines, in its passing message,
  and above. **H41-4 is the only proof that anything is 44px**; without a large
  touch screen, criterion 5 is `human_needed` and not ticked.
- **T-41-SC (Tampering — package installs): no package installed, removed or
  changed.** `package.json` untouched.

**Monotone guards:** all three untouched. `venue_reveal_sent` is not reachable
from any file in this plan; no payment state is read or written; no format's
series numbering is read, written or renumbered. The two element fixes are class
strings on links whose destinations are byte-identical.

**Access and gating:** the two changed files are `access-gating` primary. No
role or status is read in either diff, no capability is checked or skipped, no
redirect is validated differently, and no server action is touched. `/login`'s
open-redirect refusal from plan 37-12 is byte-identical, which was the first
thing checked before either edit was made.

---

## Threat Flags

**None.** No route added, no query, no input, no schema, no network path. The
gate opens no network connection, reads no environment variable, writes no
artefact, and reads only committed files under `src/`. Two links changed their
height and nothing else about them.

---

## What the next plans inherit

- **G5 exists, is green, and is NOT registered in `package.json`.** Plan 41-12
  owns that file and registers every new gate at once. **When it aggregates
  them, G5's exit 2 must be handled as a refusal and not folded into a pass** —
  it has four distinct refusal conditions and none of them means the tree is
  fine.
- **The gate's scope grows only when the manifest does**, and the measurement
  says what that costs: **312 of 328 raw interactive elements in the unconverted
  product would fail today.** A plan that adds a surface to `CONVERTED` is also
  taking on that surface's touch targets, and the numbers above say roughly how
  many per file — 31 in the event form, 14 in the transaction list, 11 each in
  three more. That is a planning input, not a warning.
- **Phase 42 inherits the two smallest interactive elements in the tree**
  (`ScannerClient.tsx:2909,2918`, about 18px) and G5 is silent about them by
  design. When Phase 42 converts the door, the honest move is to **remove those
  paths from the fence in the same commit**, in both the manifest and this
  gate — which cross-check each other, so removing one and not the other refuses
  rather than drifts.
- **DEF-41-06 needs an owner**: the fifth comment shape. The four sibling gates
  are not known to be wrong today, so it is prevention. The larger question in
  that entry is whether five shapes is where *"each gate declares its own
  stripper"* stops paying.
- **A gate that reads across lines is a different class from one that reads
  within a line.** G5 is this phase's first cross-line reader and the only one
  for which DEF-41-06 was fatal rather than cosmetic. Any future gate that walks
  from one token to another — a JSX tree, a call expression, a template — starts
  from this file's stripper, not from the three-shape one.
- **An exemption should assert its own premise.** Exemption 2 forgives 54 call
  sites on the strength of one sentence — *the size lives in the primitive* —
  and the gate checks that sentence is still true. The general form is worth
  copying: an exemption is a claim, and a claim nobody checks is how a check
  goes quiet while the thing it tracked is still in the tree.
- **The front door's two links are the only visual change this plan made**, they
  were made without being able to look at them, and they are the first thing to
  check in H41-4.

---

## Self-Check

- `scripts/verify-touch-targets.mjs` — **FOUND** (46 273 byte), exits 0,
  `REQUIRED_PX` present, `MemberTable` absent from every list
- `src/app/(auth)/login/page.tsx` — **FOUND**, carries the minimum, `href`
  expression unchanged
- `src/app/(auth)/register/page.tsx` — **FOUND**, carries the minimum, `href`
  expression unchanged
- `.planning/…/deferred-items.md` — **FOUND**, DEF-41-06 present
- commit `c43d5dd` — **FOUND**
- commit `164c0c3` — **FOUND**
- commit `3285aea` — **FOUND**

## Self-Check: PASSED
