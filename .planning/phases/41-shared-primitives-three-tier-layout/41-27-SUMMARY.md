---
phase: 41-shared-primitives-three-tier-layout
plan: 27
subsystem: testing
tags: [verification-gate, node, esm, mutation-testing, page-shell, adversarial, digest]

requires:
  - phase: 41-shared-primitives-three-tier-layout
    provides: "41-26's inverted check E — FOCUS_BRANCH_SHAPE, the positional window, the verdict split, the frozen shape's self-check"
provides:
  - "a campaign record: fifteen rewrites of the focus form run against the SHIPPED gate and the LIVE product file, five of them the executor's own invention"
  - "the measured finding that round 4's inversion was OPEN — six rewrites printed a tick over a focus form reserving navigation clearance, with the frozen window and the focus root byte-identical"
  - "NAV_PROPERTY_SITE_DIGESTS — every navigation-property occurrence in the shell must sit at a frozen permitted site, so re-freezing cannot bless the defect"
  - "SHELL_CODE_OUTSIDE_WINDOW_DIGEST — the shell's live code outside the window asserted by digest, which is the only thing that sees a clearance carrying no property name"
  - "the measured boundary of the closure: what a person editing the gate can still do, stated as open"
affects: [41.1, 41.2, "any plan that edits PageShell.tsx at all — not only its focus branch"]

tech-stack:
  added: []
  patterns:
    - "The region is the file, not the branch: a frozen window certifies a region while the component composes its class strings from a file"
    - "Freeze by digest, not by copy — a hex digest is not a Tailwind candidate, which a frozen copy of product code is (DEF-41-01)"
    - "Two frozen assertions that guard each other: neither can be satisfied by the instruction the other prints"
    - "A refusal must never mask a failure: every new refusal is gated on nothing measurable having come back wrong"

key-files:
  created: []
  modified:
    - scripts/verify-conversion.mjs

key-decisions:
  - "The campaign found a green — six of them — and that is this plan succeeding, not failing"
  - "Closed at the level of the class (the file composes the form) rather than at the six observed shapes, which is rounds 1-3 in order"
  - "The unfrozen-site verdict is a REFUSAL and not a FAILURE: the gate follows no data flow and cannot tell a default-form refactor from CR-01 arriving from outside the branch"
  - "The stale-permission check was deliberately NOT written: no situation can reach it, and a branch nothing can trip is a decoration"
  - "The residual limit is recorded as OPEN rather than closed by a mechanism that would have to be invented"

requirements-completed: []

duration: 65min
completed: 2026-08-13
---

# Phase 41 Plan 27: Round-4 Gap Closure — the Hunt for a Green Summary

**Fifteen rewrites of the focus form were run against the shipped gate and the live
shell; six printed a tick over a form reserving navigation clearance, every one of
them leaving the frozen window and the focus root byte-identical — so the class was
named (the shell composes the focus form from the whole file, not from its branch),
the assertion was moved from the region to the file by two digests that guard each
other, and the entire campaign was re-run twice with zero greens.**

## The plain sentence

**Yes — six rewrites produced a green against the gate as round 4 first shipped it,
and five of the six were the executor's own invention.** After the strengthening,
zero defect-carrying rewrites produce a tick, across two independent runs of the
whole battery.

## Performance

- **Duration:** ~65 min
- **Completed:** 2026-08-13
- **Tasks:** 2
- **Files modified:** 1 (`scripts/verify-conversion.mjs`)

## Task commits

1. **Task 1 — build the harness, then hunt for a green:** no repository change, by
   design. The plan states the script is modified *only if the campaign finds a
   green*; task 1's deliverable is the record, and it lands with this SUMMARY.
2. **Task 2 — resolve the campaign:** `41ec8ef` (fix) — the class-level
   strengthening.

`src/components/ui/PageShell.tsx` was mutated **transiently fifteen times per
battery run, across three runs, plus twice more in the proofs**, and restored every
time. It is byte-identical to its state at the plan's base commit:
`32f54e825957f7b269bfd5d71f4b18a530624a7904b9286f63d4d7046d4c591e`. No product file
changed.

## 1. The counts

| | |
|---|---|
| distinct rewrites attempted | **15** |
| of those, invented by the executor and absent from the plan | **5** (I1–I5) |
| the plan's seven floor rewrites | all attempted (F1–F7) |
| controls carrying no defect | 2 (C1, C2) |
| greens on the gate as round 4 shipped it | **6** (P1, I1, I2, I3, I4, I5) |
| greens after the strengthening | **0** |
| independent runs of the whole battery after the strengthening | **2** (run 2, run 3 — row for row identical) |
| additional proofs mutating the gate itself | 3 (SC, I6, I7) |

## 2. The campaign table

Every mutation applied **by line TEXT**, never by number. Every one asserted landed
by whole-file byte equality re-read from disk **and** by `git diff --numstat` being
non-empty, **before any result was read**. Every one asserted restored by
`git diff --numstat` reporting nothing **and** by checksum equality against the
pre-mutation snapshot. All counts taken mechanically by splitting the captured
stdout, never by eye.

### Run 1 — against the gate as plan 41-26 shipped it

| id | rewrite | invented | exit | `✓ E` | `CONVERSION_OK` | `✗ E` | `SHAPE CHANGED` | `GATE CANNOT READ` | green? |
|---|---|---|---|---|---|---|---|---|---|
| F1 | the pair on the **inner** element, shape otherwise unchanged | no | **1** | 0 | 0 | 1 | 0 | 0 | no |
| F2 | the pair on a **newly inserted third element** | no | **1** | 0 | 0 | 1 | 0 | 0 | no |
| F3 | the pair on the **outer** element through a template literal | no | **1** | 0 | 0 | 1 | 0 | 0 | no |
| F4 | a **brace-less `if`**, defect on the inner element | no | **1** | 0 | 0 | 1 | 0 | 0 | no |
| F5 | the branch as a **ternary**, defect on the inner element | no | **1** | 0 | 0 | 1 | 0 | 0 | no |
| F6 | a lone `}` **inside a string** on the outer element's line, defect below it | no | **1** | 0 | 0 | 1 | 0 | 0 | no |
| F7 | the declaration carrying a **concatenation behind a block comment**, second operand a navigation-inset utility | no | **2** | 0 | 0 | 0 | 1 | 0 | no |
| C1 | the same brace-less rewrite with **no defect** (control) | no | **2** | 0 | 0 | 0 | 1 | 0 | no |
| C2 | the branch **reindented** by four spaces, no defect (control) | no | **0** | 1 | 1 | 0 | 0 | 0 | tick — *correct, no defect* |
| P1 | a **second component** in the same file rendering the focus root plus the clearance | no | **0** | 1 | 1 | 0 | 0 | 0 | **GREEN** |
| I1 | the clearance on the **`className` prop's default value** | **yes** | **0** | 1 | 1 | 0 | 0 | 0 | **GREEN** |
| I2 | the focus root declared with **`let` and augmented** by a separate statement | **yes** | **0** | 1 | 1 | 0 | 0 | 0 | **GREEN** |
| I3 | the shell **wrapped** — implementation renamed, exported wrapper injects the clearance | **yes** | **0** | 1 | 1 | 0 | 0 | 0 | **GREEN** |
| I4 | a **decoy anchor** — a dead witness carrying the frozen shape, live branch elsewhere with the pair | **yes** | **0** | 1 | 1 | 0 | 0 | 0 | **GREEN** |
| I5 | the clearance on the prop default **spelled with no property name** | **yes** | **0** | 1 | 1 | 0 | 0 | 0 | **GREEN** |

### Runs 2 and 3 — against the strengthened gate, identical row for row

| id | exit | `✓ E` | `CONVERSION_OK` | `✗ E` | `SHAPE CHANGED` | `GATE CANNOT READ` | verdict |
|---|---|---|---|---|---|---|---|
| F1 | **1** | 0 | 0 | 1 | 0 | 0 | ✓ round 3's closure holds |
| F2 | **1** | 0 | 0 | 1 | 0 | 0 | ✓ round 3's closure holds |
| F3 | **1** | 0 | 0 | 1 | 0 | 0 | ✓ WR-03 subsumption holds |
| F4 | **1** | 0 | 0 | 1 | 0 | 0 | ✓ case D stays closed |
| F5 | **1** | 0 | 0 | 1 | 0 | 0 | ✓ |
| F6 | **1** | 0 | 0 | 1 | 0 | 0 | ✓ |
| F7 | **2** | 0 | 0 | 0 | 1 | 0 | ✓ CR-02 stays closed |
| C1 | **2** | 0 | 0 | 0 | 1 | 0 | ✓ the accepted cost, visible |
| C2 | **0** | 1 | 1 | 0 | 0 | 0 | ✓ a correct rewrite stays green |
| P1 | **2** | 0 | 0 | 0 | 1 | 0 | ✓ **closed** — was exit 0 |
| I1 | **2** | 0 | 0 | 0 | 1 | 0 | ✓ **closed** — was exit 0 |
| I2 | **2** | 0 | 0 | 0 | 1 | 0 | ✓ **closed** — was exit 0 |
| I3 | **2** | 0 | 0 | 0 | 1 | 0 | ✓ **closed** — was exit 0 |
| I4 | **2** | 0 | 0 | 0 | 1 | 0 | ✓ **closed** — was exit 0 |
| I5 | **2** | 0 | 0 | 0 | 1 | 0 | ✓ **closed** — was exit 0 |

**Two runs, because a battery that stopped applying mutations halfway is a defect
this phase has already met.** Run 2 and run 3 were launched separately against the
committed gate and agree on every cell.

**C2 is the one tick in the strengthened columns and it is correct.** It carries no
defect at all: the branch is reindented and the trimmed comparison forgives
indentation deliberately. The bar the plan sets is that no rewrite carrying a
clearance may print a tick, and none does.

**Three regression guards, checked explicitly.** F1 (inner element), F2 (inserted
third element) and F3 (outer element through a template literal) all still exit 1
with `✗ E`. A refusal on any of those three would have been round 3's genuine
closures traded away for this round's; none refused.

## 3. Which documented trigger each floor rewrite exercised, and the site

Named in the check's own words, with the site a real regression would appear at.

| id | site mutated | trigger, in the check's own words |
|---|---|---|
| F1 | the focus branch's **inner element** | *"no line of the focus branch reads either navigation property"* — the defect scan over the frozen window |
| F2 | a **newly inserted third element** inside the branch | the same scan; the window's length is frozen, so an inserted element cannot push a line out of it |
| F3 | the **outer element**, clearance appended through a template literal | *"a focus root assembled from that constant PLUS anything else is a form this gate did not read"* — the render-site assertion, judged after the window scan |
| F4 | the **whole branch as a brace-less `if`**, defect on the inner element | *"an unrecognised shape produced a GREEN"* — the frozen comparison plus the shape-independent window scan |
| F5 | the **whole branch as a ternary**, defect on the inner element | the same pair; the opener is still the single anchor |
| F6 | the **outer element's line carrying a `}` inside a string**, defect below it | the same pair, on round 3's brace-balance escape — *"no brace is counted anywhere in the derivation"* |
| F7 | the **declaration line**, literal + block comment + concatenation whose second operand carries the leading inset | *"the form either matches, in which case the capture is the whole literal by construction, or it does not, in which case nothing is read and the run refuses"* |
| C1 | the same brace-less rewrite, **no defect** | *"the branch has exactly the one frozen expected shape"* — the shape comparison alone |
| C2 | the whole branch **reindented** | the comparison's own stated tolerance: *"internal whitespace is significant"* over the **trimmed** line |

## 4. The green, and the class it belonged to

### What escaped

Six rewrites printed `✓ E` and `CONVERSION_OK` over a focus form that reserves
navigation clearance. **In every one of the six the frozen window and the focus
root were byte-identical.** They put the clearance somewhere else in the same file:

- **I1** — on the `className` prop's default value. All four focus routes render
  `PageShell` without passing a className, so the default lands on the focus form's
  inner container on every one of them. The branch never changed.
- **I2** — the focus root declared with `let`, in the accepted form, and augmented
  by a separate statement below it. The declaration scan found one declaration, the
  anchored form matched, the literal read was clean, and the value that reached the
  browser was not.
- **I3** — the implementation renamed and an exported wrapper of the same name
  injecting the clearance as a className.
- **I4** — a **decoy anchor**. A dead helper carrying the frozen shape verbatim,
  while the live branch selected the focus form by a different condition and carried
  the pair on its outer element. The window matched perfectly; it was anchored on a
  witness that renders nothing.
- **P1** — a second component in the same file rendering the focus root plus the
  clearance.
- **I5** — the same prop default as I1, with the clearance spelled as a plain length
  utility carrying **neither property name**.

### The class

**The gate's premise was that the focus form's rendered class strings are determined
by the focus root's literal plus the seven frozen lines. That premise is false: the
shell composes them from a file.**

And it was worse than unmeasured. The evidence scan — `propertyReadsElsewhere`, the
half that asserts *the clearance survives in the primitive* — reads every occurrence
outside the window as proof in favour. So a clearance introduced on the prop default
was **counted toward the assertion meant to catch it**. That is GAP-CR-02's shape
one level out: the defect feeding its own guard.

Under the plan's own list of candidate classes this is two of them at once: *an
anchor that can be satisfied at more than one place* (I4) and *a window that can be
positioned so the frozen lines match while the live branch is elsewhere* (I4 again),
sitting on top of the larger one — *a region check standing in for a component*.

### What was strengthened

Not one of the six shapes. The region moved from the branch to the file, as two
frozen assertions that guard each other:

1. **`NAV_PROPERTY_SITE_DIGESTS`** — every occurrence of a navigation property
   anywhere in the shell must sit at a **frozen permitted site**. Two sites are
   frozen today: the default and wide form's root and its inner container. Both sit
   below the focus branch's `return`, so neither can be reached from the focus form —
   which is the confirmation a person makes before freezing a site, and this list is
   the record that somebody made it. Anything else refuses.
2. **`SHELL_CODE_OUTSIDE_WINDOW_DIGEST`** — the shell's live code outside the frozen
   window, asserted by digest. This is what closes I5, which carried no property name
   and therefore cannot be caught by any name-based scan.

**Why both.** (2) tells a reader to update the digest when the shell legitimately
changes. Updating it to bless a shell whose prop default reserves a clearance would
make the gate certify the exact defect it exists to catch — the fifth escape written
into the gate's own instruction. (1) refuses that, and cannot be satisfied by
re-hashing. It is the same relationship `FOCUS_BRANCH_SHAPE` has with its self-check,
and **it was proven rather than argued** — see proof I6 below.

**By digest and never verbatim**, because DEF-41-01 is sharper here than anywhere:
a frozen copy of the shell's code would carry a dozen whole utility tokens into the
gate, where Tailwind compiles them and keeps the rules alive after the shell has
dropped them. A hex digest is a candidate for nothing.

**The digests are taken over the NON-EMPTY TRIMMED lines of the comment-stripped
source.** A docblock edit, a blank line and a reindentation move nothing — which
matters in a file whose prose has been edited in nearly every plan of this phase.
Only code text moves it.

### Two things deliberately not done

- **The unfrozen-site verdict is a refusal, not a failure.** Whether a new site
  reaches the focus form or only the default and wide forms is not something this
  gate can read: it follows no data flow. Calling it CR-01 would redden a legitimate
  refactor of the default form, and a gate that reddens correct code gets switched
  off (§0 rule 3). Calling it clean is what three rounds did. It refuses, prints the
  line verbatim with its digest, and names the two ways out.
- **The stale-permission check was not written.** A permitted digest matching no
  line would be a permission floating free — but a permitted site lies outside the
  window, so its text cannot change without changing the file digest too, and
  assertion (2) reaches that state first on every tree. A branch no situation can
  reach is a decoration that makes something look guarded
  (`ai-engineering.md`, *gate un gate deve poter fallire*). The reason is written
  into the file rather than left as an omission.

### The masking hazard, caught by asking rather than by running into it

Both new refusals are gated on `propertiesInFocusBranch.length === 0 && !focusRootCarriesProperty`.
Without the second clause, a clearance appended to the focus root's **literal** would
also change the code outside the window, the new refusal would fire first, and a
genuine CR-01 **failure** would reach `verify-all.mjs` as *"nothing was measured"* for
all sixteen gates. That is WR-03 reintroduced by its own fix.

## 5. The three proofs that mutate the gate itself

Same assertions: landed by whole-file byte equality plus non-empty numstat before any
result was read; restored by empty numstat plus checksum.

| id | what was mutated | exit | marker | `✓ E` | `CONVERSION_OK` |
|---|---|---|---|---|---|
| **SC** | entry 5 of `FOCUS_BRANCH_SHAPE` carries a navigation property, **fragment-assembled** in 41-26's own style | **2** | `GATE CANNOT READ` | 0 | 0 |
| **I6** | `PageShell.tsx`'s prop default reserves the clearance **and** the file digest is re-frozen to match | **2** | `SHAPE CHANGED` | 0 | 0 |
| **I7** | the same, with the clearance spelled with **no property name**, digest re-frozen to its real found value | **0** | — | 1 | 1 |

**SC — 41-26's self-check, re-run against the strengthened read, as the plan
requires.** The property name was injected as `' --nav-' + 'inset-' + 'block-' + 'end'`,
so it never appears contiguously in the script's source and the self-check therefore
fired on the **assembled** value, not on the file's text. Exit **2** and not 1:
`refuse()` degrades to 1 when `failures` is non-empty, and this refusal is raised in
check E's hoisted read before any `failures.push`. Restored, and the restore asserted
twice — empty `git diff --numstat` and checksum equality; the shipped gate's checksum
is `d9fe4798d37fb3abedc4b78fc592f9bf83f5f6d4986b38cf17cb99f598a8c959`.

**I6 is the proof that the new digest's instruction is not the sixth escape.** The
refusal that fired was the **permitted-site** one, not the digest one — so following
the digest instruction to the letter, on a shell whose prop default reads a navigation
property, still refuses. That is the whole reason two assertions exist instead of one.

**I7 is the measured boundary of the closure, and it is recorded as OPEN.** With the
clearance spelled as a plain length utility — no property name anywhere — *and* the
digest deliberately re-frozen to bless it, the gate exits 0 with a tick. Both acts are
required: I5 shows that the same shell without the re-freeze refuses. This is not a
class the gate can close by construction: it follows no data flow, and it detects the
clearance by property name. **Re-freezing is a human act and a reviewable one; it is
not a mechanism, and this SUMMARY does not pretend it is.** Whoever takes round 5, if
anyone does, starts here.

## 6. The asserted negative control

On the restored tree, with `git status --porcelain -- src/ scripts/` empty:

```
node scripts/verify-conversion.mjs   → exit 0
  ✓ A  ✓ B  ✓ C  ✓ D  ✓ E            (each counted mechanically, each 1)
  CONVERSION_OK — all five checks passed over 8 declared surface(s), 53 file(s) scanned.
```

The report now prints the file-level half on every run, so the digest a reader would
have to copy is in the output rather than in a command they must reconstruct:

```
      the shell OUTSIDE that window             : N line(s) of live code, digest 73adc18b…
      sites permitted to read a navigation property : 2   (found outside the permitted set: 0)
          the default and wide root — the leading inline-start inset, at and above 768px…
          the default and wide inner container — the block-end inset plus 16px…
```

- `git diff --numstat -- src/components/ui/PageShell.tsx` → nothing.
- `git status --porcelain -- src/` → empty. `git status --porcelain -- scripts/` → empty.
- `npm run build` → **exit 0** (run again after this SUMMARY was written — DEF-41-01).
- `npm run verify` → **exit 2**: *16 declared, 15 run, 14 passed, **0 FAILED**, 1
  REFUSED (`verify:capabilities` — missing environment variables), 1 needs a server
  and was not run (`verify:redirects`)*. `verify:conversion` is listed **passed, exit
  0**. This worktree carries no `.env.local`, so the 2 is a property of the
  environment and not of this work — identical to the aggregate 41-26 recorded.

## 7. The bounded no-whole-utility grep

Tokens derived from `PageShell.tsx` by `grep`, never typed, then counted inside the
section this plan added (bounded between its own section header and check E2's):

Every one of the twenty-five derived tokens counted **0**, including the two the
frozen shape carries and the three the default and wide form carries. The only
non-zero hits were the prose fragments *block-end* (2) and *inline-start* (1), which
are pieces of the two custom-property **names** used in sentences — not utilities,
and neither full property name occurs at all. The section adds no Tailwind candidate.

**This SUMMARY obeys the same rule.** No utility token is written contiguously in its
prose: the mutations' inserted classes are described as *the leading inline-start
padding utility*, *the block-end padding utility* and *a plain length utility*.

## 8. The accepted cost, with the marker a reader in 41.1 will actually see

**This gate now refuses a legitimate change to any line of `PageShell.tsx`'s code, not
only to its focus branch, until the frozen values in `scripts/verify-conversion.mjs`
are updated in the same commit.** That is a wider cost than round 4 accepted, and it
is deliberate: this is the primitive four gated surfaces and forty-seven work surfaces
render through, and CR-01 has been put back into it three times by an edit nobody was
asked to look at twice.

**The marker is `SHAPE CHANGED`, on the FATAL's first line**, and there are now three
refusals that carry it. The one action that resolves each:

| what a reader sees after `SHAPE CHANGED` | the one action |
|---|---|
| *"…'s focus branch is not the shape this gate froze"* | update `FOCUS_BRANCH_SHAPE`, same commit, keeping it free of both property names |
| *"…reads a navigation property at N site(s) this gate has not been shown"* | establish which form that line reaches; if default or wide, add its digest to `NAV_PROPERTY_SITE_DIGESTS` with the reason; if it reaches the focus form, the line comes out |
| *"…'s code outside the frozen window is not what this gate was shown"* | read the changed line, satisfy yourself it puts no clearance on the focus form, then copy the **found** digest printed in the refusal into `SHELL_CODE_OUTSIDE_WINDOW_DIGEST` |

The other marker, `GATE CANNOT READ`, still means the gate is blindfolded and nothing
it would print about the focus form could be trusted.

**Prose is free.** Editing `PageShell.tsx`'s docblocks, blank lines or indentation
trips nothing — the digests cover non-empty trimmed **code** lines only. In a file
this phase has re-documented repeatedly, that is most of the edits.

## Files created/modified

- `scripts/verify-conversion.mjs` — check E's read gains a third part: the shell
  outside the frozen window. Two frozen assertions (`NAV_PROPERTY_SITE_DIGESTS`,
  `SHELL_CODE_OUTSIDE_WINDOW_DIGEST`), both gated on nothing measurable having come
  back wrong, both printed in the report on every run. One new import (`node:crypto`,
  a built-in — the zero-dependency rule holds).

No product file changed. `src/components/ui/PageShell.tsx` is byte-identical to its
state at the plan's base commit; `scripts/verify-dialogs.mjs` was never opened.

## Decisions made

1. **A found green is this plan working.** Three rounds shipped gates that passed
   their own proofs; the difference here is that the acceptance criterion was a hunt
   with invented rewrites, and five of the six greens came from the invented five.
2. **Close the class, never the shape.** No case was added for a prop default, for a
   `let` augmentation, for a wrapper, for a decoy anchor or for a second component.
   The region moved from the branch to the file.
3. **Freeze by digest.** A frozen copy of the shell's code would have carried a dozen
   live Tailwind candidates into the gate; a digest carries none, and the refusal
   prints the code verbatim so legibility is not lost.
4. **Refusal, not failure, for an unfrozen site** — the gate follows no data flow and
   must not redden a correct refactor of the default form.
5. **The residual limit stays open and named** rather than closed by an invented
   mechanism.

## Deviations from plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] The I4 mutation could not be expressed as a single
substitution**

- **Found during:** Task 1, the decoy-anchor rewrite.
- **Issue:** Inserting the witness first makes the branch text occur twice, so the
  harness's exactly-once assertion refused the second substitution — correctly. The
  harness threw **before writing**, so the file was never touched; asserted by
  `git status --porcelain -- src/` empty immediately afterwards.
- **Fix:** The live branch is rewritten first, while it is still the only occurrence,
  and the witness inserted second.
- **Files modified:** none in the repository — the harness lives in the session
  scratchpad, outside the worktree.

**2. [Rule 2 — Missing critical] The plan's I7 probe did not exist and had to**

- **Found during:** Task 2, after I6 proved the digest instruction is not an escape.
- **Issue:** I6 proves the *property-carrying* case cannot be blessed by re-freezing.
  Nothing measured the case where the clearance carries **no** property name — and
  that is exactly the case the digest is the sole guard for, so the boundary of the
  closure was unmeasured.
- **Fix:** Probe I7 added: the shell's prop default carrying a plain length utility,
  with the digest re-frozen to its real found value. Result: exit 0, tick. Recorded
  as the measured **open** boundary rather than smoothed over.
- **Verification:** run captured; both files restored, both restores asserted twice.

---

**Total deviations:** 2 auto-fixed. **Impact:** no scope creep — neither changed the
repository's product code, and the second is the difference between a closure whose
edge is known and one whose edge is assumed.

## Issues encountered

None beyond the two above.

## Verification

- `node scripts/verify-conversion.mjs` on the restored tree: **exit 0**, five ticks.
- `npm run build`: **exit 0**, run with everything restored and **again after this
  SUMMARY was written** (DEF-41-01: Tailwind scans `.planning/`).
- `git status --porcelain -- src/`: empty. `git diff --numstat -- src/components/ui/PageShell.tsx`:
  nothing. `git status --porcelain -- scripts/`: empty.
- The harness and every captured run live in the session scratchpad, **outside the
  repository**. No second copy of a gate was left in the tree.
- **There is no test runner for this product** (Guardrail 1). Nothing here is called
  verified because tests pass. Every proof above is an exit code, a mechanically
  counted stdout string, a checksum or a source assertion.

## What this does **not** close

**A gate that can finally fail is not a surface anyone has seen.** This plan rendered
nothing, opened no viewport and measured no pixel. It mutated a class string fifteen
times and read the exit code.

- **H41-1 … H41-6 remain unobserved.** No converted surface has been looked at by a
  person at three widths. **H41-4 stays `human_needed`.**
- **`41-CR01-PASS.md`'s thirteen rows stay `pending`**, on four screens nobody has
  opened — `/login`, `/register`, `/set-password` and `/payment/callback`.
- **`MIN_HEIGHT_RE` / `CENTRING_RE` stay open** (GAP-REVIEW CR-02): they assert a
  minimum-height and a centring utility are *present*, never what they produce.
- **The residual limit measured by I7 is open**: a clearance spelled with no property
  name, on a line whose digest a person has deliberately re-frozen, still passes.
- **RESP-01 and RESP-02 remain PARTIAL**, and so do DS-07, DS-08, DS-09, RESP-03 and
  RESP-04. **No requirement is ticked by this plan.** RESP-01 closes only after 41.2.

**Named as left out rather than left silent — a clean campaign is a clean bill for one
guard, not for the file it lives in:**

- **WR-02** — `verify-dialogs.mjs`'s rung family is narrower than the sentence its
  report prints; the delta on this tree is a measured **zero**, which is why it was
  deferred and not why it is closed. **Open, not attempted by this round.**
- **WR-04** — `FULL_BLEED_VIEWER`'s exemption premise is trusted rather than
  measured; the file is skipped before the shape check runs. **Open, not attempted by
  this round.** Both are detailed in 41-28's objective, which edits that file and
  deliberately does not take them.
- **WR-05** — `verify-conversion.mjs`'s own header carries three measured line
  numbers that nothing mechanical re-measures. **This plan adds 258 lines to that
  file**, all of them below the header's numbers rather than above — but it does not
  compute the claim, which is what closing WR-05 requires. No new measured line number
  was written into any comment this plan added. **Open, not attempted by this round**,
  detailed in 41-26.

## Next phase readiness

**What 41.1 and 41.2 must know before touching `PageShell.tsx`:** editing any line of
its **code** reddens `verify:conversion` until the frozen values in
`scripts/verify-conversion.mjs` are updated in the same commit. The refusal carries
`SHAPE CHANGED`, prints what changed and the one action that resolves it. Editing its
**prose** trips nothing. Adding a navigation property to a frozen expectation refuses
in turn, and that refusal cannot be satisfied by editing a digest — proven by I6, not
asserted.

**What remains owed and is not owed to a script:** a person opening `/login`,
`/register`, `/set-password` and `/payment/callback` at three widths.

## Self-Check: PASSED

- `.planning/phases/41-shared-primitives-three-tier-layout/41-27-SUMMARY.md` — **FOUND**
- commit `41ec8ef` — **FOUND** in `git log --oneline --all`
- `node scripts/verify-conversion.mjs` on the restored tree — **exit 0**
- `git status --porcelain -- src/` — **empty**
- `npm run build` after this SUMMARY was written — **exit 0**
- DEF-41-01 audit of this SUMMARY: every utility token derived from `PageShell.tsx`
  counted **0** inside it

---
*Phase: 41-shared-primitives-three-tier-layout*
*Completed: 2026-08-13*
