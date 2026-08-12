---
phase: 41-shared-primitives-three-tier-layout
plan: 15
subsystem: tooling
tags: [resp-03, g5, touch-targets, gate, exemption, mutation-proof, gap-closure, a11y]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 11
    provides: "scripts/verify-touch-targets.mjs — G5 as shipped, with its six exemptions, its four refusal conditions and the tree-wide 328/312 measurement that set its scope"
provides:
  - "PRIMITIVE_RAW_ELEMENTS — exemption 2a keyed per ELEMENT on a declared list of ten, each entry carrying the reason its size is not readable at its own tag"
  - "Three new refusal conditions (non-primitive path, stale entry, ambiguous entry), each proven reachable by mutation — G5 now has SEVEN distinct exits at code 2"
  - "The measured refutation of 41-REVIEW.md WR-04's proposed patch: it would have left both navigation entries exempt and reddened four correct elements"
  - "The recorded consequence that a future conversion reaching StaffNav.tsx will go RED until somebody declares its entry — by design, and written down so nobody closes it by widening"
affects: [41-16, 42-scanner]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An exemption's boundary should be the thing it forgives, not the file that thing lives in: keyed per file, 2a forgave 10 elements while the gate measured 9 in total"
    - "A narrowed exemption needs a matching REFUSAL for the entry that stops matching, or narrowing just moves the silence one level down"
    - "A correct diagnosis and a correct patch are different artifacts, and a review can carry the first without the second — WR-04 did"
    - "When a plan and a review disagree about a line number, read the file: here BOTH were describing real lines, of two different things (the opening tag and the className attribute), and neither had drifted"

key-files:
  created: []
  modified:
    - scripts/verify-touch-targets.mjs

key-decisions:
  - "WR-04's proposed patch was REJECTED on measurement, not on taste. Its regex keys on a template-literal class attribute; AppNav.tsx:215 and StaffNav.tsx:125 both write one, so both navigation entries — the entire point of the finding — would have stayed exempt, while Button.tsx:228, Button.tsx:236, Chip.tsx:144 and Chip.tsx:157 write a plain identifier and would all have gone red on correct code. The diagnosis was taken; the cure was replaced by ten declared elements."
  - "The Checkbox entry states that its size lives NOWHERE on the element, because that is the truth and the contract: the drawn box is 16px on purpose and the 44x44 target is the enclosing label. A false reason attached to a true exemption is the one way this list could have been worse than the blanket."
  - "The file-wide premise check was KEPT and demoted, not deleted. Mutation A shows why it could no longer be the premise: on that run it still printed 'declares the minimum' for the very file whose new element was failing."
  - "Three refusals were added and all three were proven reachable. An exemption nobody can reach is decoration, and this file already applies that standard to exemption 3; a refusal nobody can reach is the same defect wearing a different exit code."
  - "The plan's expected counts — e2a 10, measured 9 — were MET exactly, so no reconciliation was owed on the numbers. The disagreement this plan did surface was about line numbers, and it is recorded below rather than silently corrected."

requirements-completed: []

# Metrics
duration: ~55min
completed: 2026-08-12
tasks: 2
commits: 2
files_changed: 1
---

# Phase 41 Plan 15: The Blanket Becomes Ten Named Elements Summary

**Exemption 2a used to forgive every raw `<button>`, `<a>`, `<Link>` and
`<input>` in any primitive file, unconditionally, on a premise checked per file
and satisfied by one unprefixed minimum anywhere in it — so the gate that this
phase's research called its most dangerous was, on the two files carrying the
navigation every surface mounts, measuring nothing. It now forgives ten declared
elements and nothing else, each entry carrying the reason its size is not
readable at its own tag, and an entry that stops matching, matches twice, or
names a file that is not a primitive REFUSES at exit 2 instead of forgiving in
silence. The verdict on the tree is unchanged — exit 0, exemption 2a 10, measured
9, per-file table byte-identical — and the change was proven by inserting an
undeclared raw element into `AppNav.tsx`, which the old blanket would have
forgiven and which the new list measures and reddens. `41-REVIEW.md` WR-04's
proposed patch was rejected on measurement: it would have left both navigation
entries exempt and turned four correct elements red.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2, one commit each
- **Files changed:** 1 — 0 created, 1 modified, **0 deleted**
  (`git diff --diff-filter=D --name-only e5bc216 HEAD` empty)
- **Files under `src/` in the final diff:** **0**. `git diff --name-only
  e5bc216 HEAD` returns exactly one path, `scripts/verify-touch-targets.mjs`
- **Files under `scanner/` or `(admin)/door/` touched:** **0**
- **Packages added, removed or changed:** **0** (D-41-20). `package.json`
  untouched

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1 | Exemption 2a becomes a declared list of ten elements, each with its reason, plus three refusals | `a7ab070` | `scripts/verify-touch-targets.mjs` |
| 2 | Four mutation cycles, each asserted present before its result was read | `f2da6be` | `scripts/verify-touch-targets.mjs` |

---

## The pre-change and post-change reports, and every difference between them

Captured before the first edit and after it, and diffed rather than eyeballed.

**Both runs exit 0. `diff` reports additions only — no line was removed and no
number changed.**

| | pre-change | post-change |
|---|---|---|
| exit code | **0** | **0** |
| exemption 2a applied | **10** | **10** |
| exemption 2b applied | 54 | 54 |
| exemption 6 applied | 6 | 6 |
| measured total | **9** | **9** |
| files with a row | 27 | 27 |
| per-file table | — | **identical, line for line** |
| per-surface table | — | **identical, line for line** |

The only differences are three blocks of text this plan introduced:

1. a sentence appended to the exemption 2 premise block, saying what that check
   now is — a second, independent guard rather than the premise of the exemption;
2. a new block listing the ten declared elements with the line each resolved to;
3. a new block after the exemption counts printing each forgiveness **with its
   reason** and how many times it was reached, followed by the residual this
   leaves honest.

**The plan's expected counts were met exactly** — 2a at 10, measured at 9 — so
none of the reconciliation machinery the plan prepared for a disagreement was
needed on the numbers. The disagreement that did appear was about line numbers,
and it is in the deviations below.

---

## The ten declared elements, with the line each resolved to

Printed by the gate on every run. Every fragment was **derived by reading the
file**, never taken from a citation, and each resolved to exactly one element of
its tag in its file — which the gate asserts before it forgives anything.

| # | File : line | Tag | Fragment | Where the size actually lives |
|---|---|---|---|---|
| 1 | `src/components/layout/AppNav.tsx:211` | `Link` | `isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE` | the phone constant, `:167` — see the correction below |
| 2 | `src/components/ui/Button.tsx:157` | `button` | `SIZE.icon` | the icon entry of the size map, `:90`, on both axes |
| 3 | `src/components/ui/Button.tsx:228` | `a` | `{...anchorProps}` | the size map, `:86-91`, every rung declaring it |
| 4 | `src/components/ui/Button.tsx:236` | `button` | `{...buttonProps}` | same size map, same four rungs |
| 5 | `src/components/ui/Chip.tsx:140` | `Link` | `href={props.href}` | the chip's own base string |
| 6 | `src/components/ui/Chip.tsx:152` | `button` | `onClick={props.onClick}` | same |
| 7 | `src/components/ui/Input.tsx:221` | `input` | `${CONTROL}` | the shared control string, `:102-104` |
| 8 | `src/components/ui/Input.tsx:252` | `textarea` | `${CONTROL}` | same, plus its own vertical padding |
| 9 | `src/components/ui/Input.tsx:284` | `select` | `${CONTROL}` | same |
| 10 | `src/components/ui/Checkbox.tsx:105` | `input` | `type="checkbox"` | **nowhere on this element, and that is the contract** |

**Entry 10 is the one that had to be written most carefully**, and its reason
says so in the file, in as many words: the drawn box is **16px on purpose** — its
class attribute interpolates a string that declares 16px deliberately — and the
44x44 target is the enclosing `<label>`, which carries the hit-area string.
`Checkbox.tsx`'s own docblock states it, §8.6 chose it over enlarging the glyph,
and the sentence that settles it is *"the thing that has to be 44px is what a
finger can land on, not what an eye reads"*. An entry claiming this element
declares a minimum would have been a **false reason attached to a true
exemption** — the one way this list could have ended up worse than the blanket
it replaced.

### Three fragments share a string, and the tag is what separates them

Entries 7, 8 and 9 all carry `${CONTROL}`: the three controls in `Input.tsx`
write byte-identical class attributes apart from their tag name. The match is
therefore keyed on **path AND tag AND fragment**, and each of the three resolves
to exactly one element. This is not a weakness of the fragment — it is the
uniqueness assertion doing real work: if somebody adds a second `<input>` to that
file interpolating the same string, the entry matches twice and the gate
**refuses**, which is the safe direction. If they add one that does not, it falls
through and is **measured**.

---

## The four mutation cycles, in the order assert → exit → assert → exit

`ai-engineering.md`, *gate prova per mutazione*, and the reason the clause exists
in this phase specifically: a substitution that silently does not land produces a
green that reads exactly like a working check. **Every assertion below was taken
BEFORE the gate's result was read**, and each mutated file was additionally
checked to be still **text** to `grep` — this phase has already paid for one
false negative caused by a NUL byte that made a script binary, whose output was
indistinguishable from a substitution that never applied.

### Cycle A — an undeclared raw element must be measured, and must redden

Inserted into the rendered tree of `src/components/layout/AppNav.tsx`: a raw
`<button>` with a literal class attribute carrying **no height utility**, and a
distinctive text child.

| Step | Command | Result |
|---|---|---|
| **assert-mutation** | `grep -c 'MUTATIONA1541' src/components/layout/AppNav.tsx` | **1** |
| **assert-mutation** | `file src/components/layout/AppNav.tsx` | **UTF-8 text** — not binary to `grep` |
| read | `node scripts/verify-touch-targets.mjs` | **exit 1** |
| — | its message | `src/components/layout/AppNav.tsx:246  <button>` · *no unprefixed height declaration — §6.3 says every target is 44px unconditionally*, with the class string quoted |
| — | its per-file row | `AppNav.tsx  found 2 · meas 1 · e2a 1` |
| — | its counts | measured **9 → 10**, exemption 2a **still 10** |
| revert | the element removed | — |
| **assert-revert** | `grep -c 'MUTATIONA1541'` | **0** |
| **assert-revert** | `git status --porcelain src/` | **empty** |
| read | the gate | **exit 0**, and its report **byte-identical** to the post-change baseline (`diff` exit 0) |

**What this cycle bought, in one sentence:** under the file-wide blanket that
same element would have been counted as exemption 2a — the row would have read
`found 2 · meas 0 · e2a 2`, the total would have read **11**, the gate would have
exited **0**, and a control with no height at all would have been forgiven in
silence on a navigation primitive that every converted surface mounts.

**And one observation worth more than the exit code.** On that same red run the
file-wide premise check still printed `src/components/layout/AppNav.tsx —
declares the minimum`. The second guard passed while the element failed. That is
precisely why it can no longer be the premise of the exemption, and it is why it
was demoted rather than deleted.

### Cycle B — a stale declared entry must refuse, not forgive

One entry's `fragment` pointed at a string nothing in its file matches.

| Step | Command | Result |
|---|---|---|
| **assert-mutation** | `grep -n 'MUTATIONB1541' scripts/verify-touch-targets.mjs` | **`671:    'href={props.hrefMUTATIONB1541}',`** — the mutated line printed |
| **assert-mutation** | `file scripts/verify-touch-targets.mjs` | **UTF-8 text** |
| read | the gate | **exit 2** — `FATAL: exemption 2a declares <Link> in src/components/ui/Chip.tsx by the fragment … and NOTHING in that file matches it. The entry is stale: it forgives nothing while looking like a guarded case` |
| — | `grep -c 'PASSED'` on that output | **0** — **no tick printed** |
| restore | the fragment restored | — |
| **assert-revert** | `grep -n "href={props.href}"` | **`671:    'href={props.href}',`** |
| **assert-revert** | `git status --porcelain` | **empty** |
| read | the gate | **exit 0** |

**A refusal here is the correct behaviour and is neither a pass nor a failure.**
It was not folded into either.

### Cycle C — an ambiguous entry must refuse too

Not asked for by the plan, and run because a refusal nobody can reach is the same
defect as an exemption nobody can reach, wearing a different exit code. One
entry's fragment was widened until two elements of its tag matched.

| Step | Command | Result |
|---|---|---|
| **assert-mutation** | `grep -n "^    'type=\"button\"'," scripts/…` | **`653:    'type="button"',`** |
| read | the gate | **exit 2** — `and 2 elements match it (lines 157, 236). An ambiguous entry forgives an element nobody named. Narrow the fragment.` |
| **assert-revert** | `git status --porcelain` | **empty** |

### Cycle D — an entry naming a file that is not a primitive must refuse

| Step | Command | Result |
|---|---|---|
| **assert-mutation** | `grep -n "'src/components/admin/MemberTable.tsx',"` | **`699:    'src/components/admin/MemberTable.tsx',`** |
| read | the gate | **exit 2** — `which is not one of the primitive files exemption 2 is about. It would be forgiving an element in a file this exemption was never about.` |
| **assert-revert** | `git status --porcelain` | **empty** |

**All three new refusals are reachable and were observed firing.** G5 now has
**seven** distinct conditions that exit 2, and none of them means the tree is
fine. Plan 41-14, which aggregates the gates, must keep treating exit 2 as a
refusal — that inheritance note from 41-11 is now larger, not smaller.

---

## Deviations from Plan

### 1. [Reconciliation] `41-REVIEW.md` WR-04 does not cite Chip line numbers at all — the plan's premise about the review was wrong

The plan instructs the SUMMARY to record, in one line, that WR-04's citations for
the two `Chip.tsx` elements had **drifted** from the tree: *"the review says
`:140` and `:152`, the tree says `:144` and `:157`"*. Read rather than assumed,
that is not what happened. **Both pairs of numbers are recorded here, as
required, together with what each one actually is:**

| Claim | Measured |
|---|---|
| the review cites the two Chip elements at **`:140`** and **`:152`** | **False. `41-REVIEW.md` contains exactly ONE occurrence of the string `Chip.tsx`** — line 51, inside a file list, **with no line number.** WR-04's prose cites `AppNav.tsx:211-228` and `StaffNav.tsx:121-137` and no Chip line at all. `grep -n 'Chip.tsx' 41-REVIEW.md` → one hit |
| the tree has them at **`:144`** and **`:157`** | **Real lines, but not the elements.** `Chip.tsx:144` and `:157` are the two `className={classes}` **attribute lines**. The two **opening tags** are at `Chip.tsx:140` and `Chip.tsx:152`, which is what this gate reports and what it resolved the entries to on every run above |
| **which side was wrong** | **the plan's.** Nothing had drifted. `:140`/`:152` — the numbers the plan attributes to a stale review — are the **currently correct** opening-tag lines; `:144`/`:157` are the correct className lines. The two documents were describing two different things, one line apart in each case, and neither was out of date |

**Why this is recorded and not quietly corrected.** The plan's own reason for
asking is exactly right and applies to itself: *"a line number that has drifted
is one a later reader trusts wrongly"*. A **drift warning that is itself wrong**
is worse, because it teaches a reader to distrust a correct citation. Nothing
turned on it operationally — every fragment was derived by reading the file, per
the plan's own instruction, and no line number is stored in the gate.

### 2. [Rule 1 — a false reason would have been a defect] The AppNav entry's stated reason corrects the plan's table

The plan's interfaces table says the AppNav entry's size lives in *"both
constants at `:167` and `:171`, **each declaring the minimum**"*. Measured
against this gate's own parser, that is not true of the second one:

- `ENTRY_PHONE` (`:166-168`) declares the unprefixed minimum at `:167`. **This
  parser reads it.**
- `ENTRY_RESPONSIVE` (`:170-172`) interpolates `ENTRY_PHONE` and adds a
  **breakpoint-prefixed** restatement at `:171`. The HEIGHT_RE leading guard
  excludes a colon on purpose (§6.2), so **this gate reads a prefixed height as
  no declaration at all** — that is cycle E4 from plan 41-11, and it is the
  behaviour that keeps a height existing only above a width from passing as an
  unconditional minimum.

Writing *"each declaring the minimum"* into the entry's reason would have put a
sentence in the gate that the gate itself contradicts. The reason as shipped says
what is true: the unprefixed minimum is in the phone constant, and the responsive
one inherits it by interpolation while adding only a prefixed restatement *"which
this parser reads as no declaration at all, by design"*.

### 3. [Addition the plan did not ask for] Two extra refusal proofs, and the mutation cycles written into the file

Cycles C and D above. The plan asked for one refusal proof (the stale entry); the
list added **three** refusal conditions, and two of them would otherwise have
shipped unproven. All four cycles are now recorded in the gate's own header
beside plan 41-11's five, which is where a reader of this file will look for
them — that is what task 2 has to commit, since a correctly-executed mutation
cycle leaves no diff of its own.

---

## What this does NOT close

**RESP-03 remains PARTIAL and is NOT ticked by this plan.**

**H41-4 — the smallest control measured on a large touch screen — remains the
only proof that anything in this product renders at 44px. It is still
`human_needed`, it is still owed, and nothing in this plan touched it.** This
gate reads class strings; it cannot see a flex stretch, an icon set's own height,
a `line-height` override, a transform, or a target padded by an ancestor. A
narrower exemption measures the same kind of evidence, not a better kind.

Three further things a green here still does not say, all now printed by the gate
itself on every run:

- **the first declared entry is still forgiven for the same reason it always
  was** — a navigation entry whose minimum lives in a module constant this parser
  cannot follow. Narrowing 2a to the element did not teach it to read an
  interpolation. What changed is that the forgiveness is now **named, counted and
  reasoned**, and an eleventh element in that file would be measured;
- **it says nothing about the door.** `src/app/(admin)/**/scanner/**`,
  `src/components/scanner/**` and `src/app/(admin)/door/**` are fenced for Phase
  42 and were **never measured**, which the gate prints on every run. Nothing in
  this plan changed that fence or read behind it, and `ScannerClient.tsx:2909,2918`
  — recorded by plan 41-11 at about eighteen pixels — remain the smallest
  interactive elements in the tree and remain outside this gate by design. **At
  two in the morning, at an entrance, on a staff phone, a control too small to
  hit is a queue, not a cosmetic defect**, and this gate is silent about exactly
  those controls;
- **it says nothing about the 312 elements** in the unconverted product that plan
  41-11 measured would fail if the scope were widened.

### And one consequence a later plan will meet

`src/components/staff/StaffNav.tsx` is a declared primitive but is **in no
converted surface's closure** — the three work pages get that nav from
`src/app/(admin)/admin/(work)/layout.tsx`, and a page's import closure does not
include a layout. It is absent from the per-file table on every run above, so it
has no entry on the list and forgives nothing today.

**When a later plan converts a surface that reaches it, its `<Link>` at
`StaffNav.tsx:121` will be MEASURED and will go RED**, because its minimum lives
in a module constant this parser cannot follow. That is the change working as
intended. **The resolution then is a declared entry here with its reason, written
by a person — never a widening back toward the file.** It is written down now so
that it is met as an expected cost rather than discovered as a surprise, which is
the shape in which gates get switched off.

---

## Verification

Per `CLAUDE.md` Guardrail 1 and `meta-gates.md`: **there is no test runner for
the product**, and nothing below is claimed on the basis of tests passing.

| Check | Result |
|---|---|
| `node scripts/verify-touch-targets.mjs` after each task | **exit 0** — 2a 10, measured 9, 0 failures |
| final report vs. post-change baseline | **`diff` exit 0 — byte-identical** |
| `npm run build` after task 1 | **exit 0** — compiled, TypeScript clean |
| `npm run build` after the mutation cycles | **exit 0** |
| `git status --porcelain` | **empty** — no change under `src/`, no untracked file |
| `git diff --name-only e5bc216 HEAD` | **one path**, `scripts/verify-touch-targets.mjs` |
| `git diff --diff-filter=D --name-only e5bc216 HEAD` | **empty — nothing deleted** |
| `node scripts/verify-conversion.mjs` | **exit 0** |
| `node scripts/verify-tokens.mjs` | **exit 0** |
| `node scripts/verify-tables.mjs` | **exit 0** |
| `node scripts/verify-dialogs.mjs` | **exit 0** |

### The acceptance criteria, one by one

| Criterion | Result |
|---|---|
| pre-change report captured and kept, post-change diffed, every difference recorded | **done** — both kept, diffed, and the three added blocks enumerated above |
| the gate exits **0** | **exit 0** |
| exemption 2a count exactly **10**, measured exactly **9** | **10 and 9** — the plan's expectation and the tree agreed, so no reconciliation was owed |
| the per-file table unchanged except for text this plan introduced | **unchanged, line for line** — `diff` shows additions only |
| `grep -c 'PRIMITIVE_RAW_ELEMENTS'` ≥ 3 | **3** |
| each of the ten entries printed with its reason; `AppNav.tsx` and `Checkbox.tsx` named among them | **all ten printed with reason and applied count**; both files named |
| `grep -n 'isPrimitiveFile'` shows it only inside the declared-entry lookup — no unconditional `continue` | **2 hits**: the binding, and the guard whose body now performs the lookup and only continues when an entry matched. **The unconditional `continue` is gone** |
| `readHeights` and `scanElements` unchanged | **untouched.** The diff's hunks are at old lines 85, 558, 1055, 1092 and 1228; `scanElements` (old 700-739) and `readHeights` (old 812-856) are in none of them |
| the SUMMARY carries the WR-04 Chip line-drift note with both pairs of numbers | **deviation 1**, with both pairs and the measurement of which side was wrong |
| `npm run build` exits 0 | **exit 0** |
| mutation A: grep **1** before the run, exit **1** naming `AppNav.tsx`, then grep **0**, exit **0**, 2a **10**, measured **9** | **all six observed**, in that order |
| mutation B: mutated line printed before the run, exit **2** with a refusal naming the stale entry and **no tick**, then exit **0** after restoration | **all four observed**; `grep -c 'PASSED'` on the refusing run returned **0** |
| `git status --porcelain` shows no change under `src/` | **confirmed, and the whole tree is clean** |

---

## Known Stubs

**None.** No TODO, no FIXME, no placeholder, no entry seeded with a fragment that
does not resolve — the gate refuses on exactly that, and refuses before it
forgives anything.

Every number in this document was printed by the gate, returned by `grep`, or
returned by `git` on the run that produced it. The one number this plan was
tempted to assert without measuring — that `41-REVIEW.md` cites two Chip lines —
was checked and turned out to be false, which is deviation 1.

---

## Threat model — the dispositions this plan carries

- **T-41-53 (Spoofing — a green covering more elements than it measured):
  mitigated.** 2a is keyed per element on a declared list of ten reasons;
  anything not named is measured; the report prints each forgiveness with its
  reason and its applied count. Cycle A is the observed proof that an
  undeclared element in a primitive file is now measured and reddens.
- **T-41-54 (Denial of Service — a red on correct code, after which the gate is
  switched off): mitigated, and the mitigation is measured.** WR-04's regex is
  rejected in the gate's own header with the four correct elements it would have
  falsely reddened named. The list was derived from the ten elements the gate
  forgave on this tree, and the verdict is unchanged at exit 0 with a
  byte-identical per-file table.
- **T-41-55 (Tampering — a stale entry that forgives nothing while looking
  guarded): mitigated and proven.** Zero-match, multi-match and wrong-path
  entries all `refuse()` at exit 2, mirroring the file's existing stale-path
  refusal. Cycles B, C and D observed all three.
- **T-41-56 (Repudiation — RESP-03's real evidence): accepted and recorded**, in
  the gate's header, in its printed report, and in this document. **H41-4 is the
  only proof that anything is 44px**, it needs a large touch screen, and no green
  here substitutes for it.
- **T-41-57 (Information Disclosure): accepted.** The gate reads committed files
  under `src/`, prints paths, line numbers and source lines, opens no network
  connection, reads no environment variable and writes no artefact. Mutation A
  touched product code temporarily and its removal is proven by
  `git status --porcelain`.
- **T-41-SC (Tampering — package installs): no package installed, removed or
  changed.** `package.json` untouched (D-41-20).

**Monotone guards:** all three untouched. `venue_reveal_sent` is not reachable
from anything in this plan; no payment state is read or written; no format's
series numbering is read, written or renumbered. The only product file touched
was touched temporarily, by a `<button>` with a text child, and removed.

**Access and gating:** nothing in this plan reads a role, a status or a
capability, and no server action, middleware, policy or route was touched.

**DEF-41-01:** no utility-class literal was written into any comment added by
this plan; where a comment had to name one it describes it. The one class literal
written into product code lived inside mutation A, was composed of utilities the
tree already emits, and was removed.

---

## Threat Flags

**None.** No route added, no query, no input, no schema, no network path, no
trust boundary moved. The one boundary this plan did move is internal to the
gate: exemption 2a's unit went from the file to the element.

---

## Self-Check

- `scripts/verify-touch-targets.mjs` — **FOUND** (`wc -c` → **71 711** bytes),
  exits **0**, `PRIMITIVE_RAW_ELEMENTS` present with **10** entries,
  `grep -c 'PRIMITIVE_RAW_ELEMENTS'` → **3**, `REQUIRED_PX` still **44** and
  never edited
- `.planning/phases/41-shared-primitives-three-tier-layout/41-15-SUMMARY.md` —
  **this file**
- commit `a7ab070` — **FOUND** (`git log --oneline e5bc216..HEAD`)
- commit `f2da6be` — **FOUND**
- `git status --porcelain` — **empty**, before this SUMMARY was written
- no file under `src/`, `scanner/` or `(admin)/door/` in `git diff --name-only
  e5bc216 HEAD` — **confirmed, one path total**

## Self-Check: PASSED
