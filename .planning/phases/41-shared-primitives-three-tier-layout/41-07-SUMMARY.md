---
phase: 41-shared-primitives-three-tier-layout
plan: 07
subsystem: infra
tags: [verification-script, node-esm, import-closure, conversion-manifest, ds-07, resp-02, g1, g4]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 05
    provides: "scripts/conversion-manifest.mjs — SPINE, PHASE_42_PATHS, PRIMITIVES, CONVERTED and checkManifest(); and /payment/callback, the one surface this gate has to walk"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 02
    provides: "the house shape for a phase-41 gate — five-part header, refuse()/exit 2 before any tick, mutation-asserted-before-read, and the declared-debt list that lets a gate ship green while its debt is visible"
  - phase: 40-brand-tokens-typography
    plan: 01
    provides: "verify-tokens.mjs — the boundary-guard technique, the print-what-was-counted discipline, and the twelve colour utility prefixes"
provides:
  - "scripts/verify-conversion.mjs — G1 (checks A, B, C) and G4 (check D) over one manifest with one import closure"
  - "An import-closure walk that REFUSES on an unresolved local specifier, so a narrowed walk cannot print a tick"
  - "ORPHANS_DECLARED — the declared orphan debt, in verify-breakpoints.mjs's REMAINING shape, one entry today"
  - "WIDE_ROUTES and FOCUS_ROUTES — §4's two closed lists encoded with a reason per entry"
  - "The measured fact that verify-tokens.mjs's trailing boundary guard is BACKWARDS for palette hunting, because it exists to reject the numeric scale"
  - "The measured fact that a NUL byte in a source file makes it binary to grep, turning a mutation assertion into a false negative"
  - "Eleven observed reds and refusals, plus three observed not-over-eager greens"
affects: [41-08, 41-09, 41-10, 41-11, 41-12, 42-scanner]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A gate that borrows a regex from a sibling must ask what that regex was defending against: verify-tokens.mjs's trailing guard rejects the numeric scale ON PURPOSE, which is correct for token hunting and blind for palette hunting"
    - "An import-closure walk passes THROUGH an excluded file rather than stopping at it — a spine member is out of scope, not a wall, and stopping there hides whatever a surface reaches only by way of the spine"
    - "An unresolved local specifier is a REFUSAL, not a skip: a walk that quietly narrowed is the failure direction that prints a tick"
    - "A scrim tolerance is a SHAPE (translucent black through one prefix, any opacity), not a list of the three opacities a document happened to name — enumerating opens the gate red on the ones it forgot"
    - "The three-state declared-debt list generalises from a count (G6) to a membership (G1 check C): undeclared FAILS, declared is a loud notice, paid is a STALE line to delete"
    - "Printable separators only in a cache key — a NUL makes the whole file binary to grep, in a repository whose verification method IS grep"

key-files:
  created:
    - scripts/verify-conversion.mjs
  modified:
    - .planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md

key-decisions:
  - "Tasks 1, 2 and 3 land in ONE commit. They are three sections of one file sharing a walk, a header and a verdict block; each intermediate state would have been a gate printing four ticks while measuring one or two — the exact shape this gate exists to catch. 41-05 set the precedent for merging commits with the reason stated."
  - "The walk resolves .ts as well as .tsx, which the plan did not ask for. Measured: with .tsx alone the first declared surface leaves its own server action UNRESOLVED, so the walk stops there and the green covers a closure it silently narrowed. With .ts, that closure resolves completely — zero dangling specifiers."
  - "An unresolved local specifier is a refuse() at exit 2 rather than a skip. A specifier this walk cannot follow is a part of the surface nobody opened, and reporting cleanly on the part it did open is not the same as reporting on the surface."
  - "The scrim tolerance is translucent black through the background prefix at ANY opacity, not §13's three named values. The tree carries FIVE opacities; enumerating three opens the gate red on the two in the media upload the day a media surface converts, which is §0 rule 3 — and §0 'outranks everything below', §13 included. Every scrim forgiven is printed with its file and line."
  - "Check C ships with ORPHANS_DECLARED, one entry, rather than shipping red. IconButton measures zero importers on this tree (DEF-41-03). A gate that arrives red is switched off before it guards anything, and 41-12 aggregates these six into one command — a red one makes the aggregate red on arrival. An UNDECLARED orphan still fails, which is the check."
  - "Toast.tsx was NOT edited to close the orphan, though that is the structurally right fix. It is not among this plan's declared files, no parallel agent in this wave owns it either, and the swap is not byte-identical — the shared rung carries a hover boundary, press feedback and a different ink token. A visible change to a component every surface can raise, made from a gate-authoring plan with no H41-1 behind it, is scope creep."
  - "Check C counts an `import`, never a re-export. A barrel that forwards a symbol answers a different question, and counting it would let one unused barrel adopt every orphan in the tree at once."
  - "§4's wide and focus lists are encoded in THIS script rather than read from the manifest, because §13 says those lists ARE what G4 reads. The manifest's width is the claim; these constants are what tests it, and putting both in one file would make the claim its own oracle."

requirements-completed: [DS-07, RESP-02]

# Metrics
duration: ~70min
completed: 2026-08-12
tasks: 3
commits: 2
files_changed: 2
---

# Phase 41 Plan 07: The Gate That Walks What a Surface Reaches Summary

**`verify-conversion.mjs` carries G1's three checks and G4's one over one
manifest with one import closure — green on this tree, proven red eleven times
by asserted mutation, and proven *not* to fire on the five scrim opacities and
the seven new token names. Two of those mutations found real defects in the gate
before it was committed: a boundary guard borrowed from a sibling that is
backwards for this purpose and left check A blind to nearly every palette
utility, and a NUL byte that made the script binary to `grep`. And check C's
first measurement found a published primitive with zero importers — D-41-04's
own failure mode, produced by a parallel-wave merge, which is now DEF-41-03.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 3 (one commit — see Deviations)
- **Files created:** 1 — `scripts/verify-conversion.mjs`, 59 434 byte
- **Files modified:** 1 — `deferred-items.md` (DEF-41-03)
- **Files under `src/` changed:** **0.** Every mutation was reverted; the final
  `git status` before the first commit listed one untracked file and nothing else
- **Files under `scanner/`, `door/` touched:** **0**
- **`scripts/conversion-manifest.mjs` touched:** **0** — a parallel agent owns
  it this wave; every proof needing a manifest mutation ran on a fixture

## What was built

| # | Task | Commit | Files |
|---|---|---|---|
| 1+2+3 | The walk, the refusals, the two exemptions, and checks A, B, C and D | `a7f2624` | `scripts/verify-conversion.mjs` |
| — | DEF-41-03, the orphan check C found | `2b819b1` | `deferred-items.md` |

## Accomplishments

- **Criterion 1 has a mechanism.** *"No surface is left half-converted"* was a
  sentence; it is now an import-closure walk that starts at a declared page
  file, follows every relative and `@/`-aliased specifier transitively, and
  refuses if even one of them cannot be resolved.

- **The walk passes THROUGH an excluded file rather than stopping at it.** A
  spine member is out of the *checks* because its conversion is another plan's —
  it is not a wall. Stopping there would hide any non-spine file a surface
  reaches only by way of the spine, which is a narrowing in the direction that
  produces a green.

- **Four refusal conditions, all before any tick**, for the reason
  `verify-tokens.mjs:586-590` gives — a refusal printed after a ✓ has already
  been believed. Two of them are the manifest's own, reported verbatim rather
  than re-derived, so one rule keeps one author.

- **Both exemptions are named constants with their reasons, and the report
  prints them on every run** — a green states what it forgave. Today it also
  states, honestly, that neither is reached by any closure yet.

- **Check C found a real orphan on its first measurement.** `IconButton`, zero
  importers across 259 files. Not a hypothetical: it is D-41-04's own failure
  mode, reproduced by the wave parallelism inside the phase written to prevent
  it. See DEF-41-03 and the Deviations below.

- **Eleven reds and refusals observed, three not-over-eager greens observed.**
  Two of the reds were the gate failing to fire, which is how two defects in it
  were found before it shipped.

## The green report, in full — this is the phase's evidence for criterion 1

```
  verify-conversion — a declared surface is checked by walking what it reaches

  surfaces declared converted : 1
  files reached by the walk   : 7
  files scanned by A, B and D : 7
  excluded as converted spine : 0
  excluded as Phase 42        : 0
  files walked under src/     : 259   (check C's scope)
  lines blanked as JSX comments: 4   (DEF-41-02)

  exemptions declared: 2
      src/app/globals.css  — not reached by any closure
         the token layer — where the palette legitimately is a literal
      src/app/(admin)/admin/formats/ColorSwatchPicker.tsx  — not reached by any closure
         the format catalogue swatch — a brand hex that is data on a row, not a token

  the surfaces, and what each reaches:

      /payment/callback  [focus]  — 7 file(s) scanned
          src/app/(public)/payment/callback/actions.ts
          src/app/(public)/payment/callback/page.tsx
          src/components/ui/Button.tsx
          src/components/ui/Card.tsx
          src/components/ui/PageShell.tsx
          src/components/ui/Typography.tsx
          src/lib/supabase/service.ts

  check A — raw palette utilities in a converted surface's closure:

      palette families matched : 24
      utility prefixes matched : 12
      translucent-black scrims tolerated : 0

  ✓ A  no raw palette utility in 7 file(s) reachable from 1 converted surface(s)

  check B — legacy token utilities, ON CONVERTED SURFACES ONLY:

      legacy names matched : 4
      scope: this check reports on the declared surfaces and NOTHING ELSE. D-41-13
      empties these names of consumers one whole surface at a time, and removing the
      aliases from the token layer is a BONUS that must never become the schedule.

  ✓ B  no legacy token utility in 7 file(s) across 1 converted surface(s)

  check C — importers per published primitive, counted PER NAMED EXPORT:

    ✗    0  IconButton   (src/components/ui/Button.tsx)
    ·    1  Chip   (src/components/ui/Chip.tsx)
              src/components/staff/StaffNav.tsx
    ·    1  Button   (src/components/ui/Button.tsx)
              src/app/(public)/payment/callback/page.tsx
    ·    1  PageShell   (src/components/ui/PageShell.tsx)
              src/app/(public)/payment/callback/page.tsx
    ·    1  Card   (src/components/ui/Card.tsx)
              src/app/(public)/payment/callback/page.tsx
    ·    1  PageTitle   (src/components/ui/Typography.tsx)
              src/app/(public)/payment/callback/page.tsx
    ·    1  SectionHeading   (src/components/ui/Typography.tsx)
              src/components/layout/AppNav.tsx

  ✓ C  6 of 7 published export(s) have at least one importer, and every
       orphan is declared

  ! C  1 published primitive(s) are ORPHANED, declared, and still owed:

       IconButton   (src/components/ui/Button.tsx)
         measured 2026-08-12, zero importers. Its consumer was to be the toast dismiss control (plan
         41-03), but plan 41-04 converted that file on a parallel branch where the primitive did
         not yet exist, so it wrote the contract by hand and said so at the call site. Both landed;
         the adoption did not. NO REMAINING PLAN IN THIS PHASE DECLARES src/components/toast/, so
         this is owed and unscheduled — see deferred-items.md DEF-41-03. The fix is one import and
         a five-line deletion, and it is a visible change to the control (the shared rung carries
         a hover boundary, press feedback and a different ink token), which is why it belongs to
         a plan that declares that file rather than to the gate that found it

       Not a failure, and not an exemption either: it is a DEBT WITH A NUMBER ON IT,
       printed on every run, which can only go down. The alternative was a gate that
       ships red — and a gate that ships red is switched off before it has guarded
       anything (§0 rule 3). Read this number, not the tick.

  check D — the container (G4):

      maxima the shell declares : max-w-5xl · max-w-7xl · max-w-sm
      §4 wide list  : 12 route(s), closed
      §4 focus list : 4 route(s), closed
      surfaces whose width was compared against §4 : 1

  ✓ D  the shell declares §4's three maxima and only those; all 1 converted
       page(s) import it, write no maximum of their own, and carry the width §4 assigns


  CONVERSION_OK — all four checks passed over 1 declared surface(s), 7 file(s) scanned.

  Read the header before treating this as safety. It proves that NO UNCONVERTED FILE
  IS REACHABLE from a declared surface. It does NOT prove the conversion is right: it
  is blind to an inline hex, to a class built by concatenation, and to an ugly layout.
  Check D says a maximum is declared and that the page did not override it — NOT that
  the chosen width is right, which is UI-SPEC Open Question 2. H41-1, every converted
  surface observed at three widths by a person, is the only thing that says a surface
  is workable, and it is a human’s.
```

## Proven able to fail — every mutation asserted BEFORE its result was read

`ai-engineering.md`'s *gate prova per mutazione*: **assert the mutation landed,
then read the outcome, then assert the revert landed.** A substitution that
silently fails to match would otherwise certify a dead check as working — and on
this plan it did exactly that once, in the direction the rule warns about (see
Deviation 3).

Every manifest mutation ran on a **fixture outside the repository** — a copy of
the script and of the manifest beside a symlink to the real `src/` — because
`scripts/conversion-manifest.mjs` is being appended to by a parallel agent this
wave. The fixture reproduced the green baseline before any mutation, and was
deleted afterwards.

### The reds

| # | Check | Mutation | Assertion taken BEFORE reading | Gate exit | After revert |
|---|---|---|---|---|---|
| R1 | refusal | `CONVERTED.length = 0` (fixture) | `CONVERTED.length` → **0** | **2**, printed before any ✓, naming the vacuous-green condition | length **1**, exit 0 |
| R2 | refusal | `pageFile` → a path not on disk (fixture) | the path printed, `existsSync` → **false** | **2** | restored, exit 0 |
| R3 | C | a throwaway `PRIMITIVES` entry: a real file, a real export, no importer (fixture) | `PRIMITIVES.length` **8**, last = `SkeletonCard` | **1**, naming the **export** | length **7**, exit 0 |
| R4 | C | an export with no importer in a file whose OTHER export has one (fixture) | `PRIMITIVES.length` **8**, last = `ChipProps` | **1** — and the report shows `Chip` at **1** and `ChipProps` at **0** in the same file | length **7**, exit 0 |
| R5 | A | a default-scale palette utility appended to the converted page | `grep -c` → **1** | **1**, naming the file, the line and the utility | `grep -c` → **0**, exit 0 |
| R7 | A | opaque black through the background prefix, and translucent black through a **different** prefix | `grep -c` → **1** | **1**, **both** flagged, scrims tolerated **0** | `grep -c` → **0**, exit 0 |
| R8 | B | all four legacy alias names on one line | `grep -c` → **1** | **1**, all four named — and the compound one matched as the compound, not as its shorter prefix. **Check A stayed green**, so the checks are independent | `grep -c` → **0**, exit 0 |
| R10 | D | a maximum written on the converted page itself | `grep -c` → **1** | **1**, naming the maximum and the route | `grep -c` → **0**, exit 0 |
| R11 | D | a fourth maximum added to the shell | `grep -c` → **1** | **1**, listing the fourth and only the fourth | `grep -c` → **0**, exit 0 |
| R12 | D | the manifest's width changed away from §4's list (fixture) | width → `default` | **1**, naming the disagreement **and which list decides it** | restored, exit 0 |
| R13 | C | the declared forgiveness withdrawn — `ORPHANS_DECLARED` emptied (fixture) | `grep -c 'MUTATION R13'` → **1** | **1**, on the real orphan `IconButton` | restored, exit 0 |
| R18 | D | a declared surface whose page file does not import the shell (fixture) | `pageFile` printed | **1**, naming the page | restored, exit 0 |
| R19 | C | an `ORPHANS_DECLARED` entry for a symbol `PRIMITIVES` does not publish (fixture) | `grep -c 'MUTATION R19'` → **1** | **1** — a forgiveness for something nobody declared forgives an unknown amount | restored, exit 0 |

### The greens that had to stay green

| # | Check | Mutation | Assertion taken BEFORE reading | Gate exit |
|---|---|---|---|---|
| R6 | A | **all five** translucent-black opacities measured in this tree, on the converted page | `grep -c` → **1** | **0** — *"translucent-black scrims tolerated : 5"*, each printed with its file and line |
| R9 | B | the **seven** new token names the migration moves *to* | `grep -c` → **1** | **0** — A and B both ✓. The check does not fire on the destination |
| R14 | C | a declared orphan that in fact **has** an importer (fixture) | `grep -c 'MUTATION R14'` → **1** | **0**, with `! C … STALE … → adopted; remove this entry` |

### R15 and R16 — the pair that proves the gate is READING, not ignoring

A gate that skipped the payment callback entirely would also be green there. The
pair settles it, and it is DEF-41-02's fix measured in both directions:

- **R15** — a palette utility inserted **inside the page's own one-line JSX
  comment** (`grep -c` → **1**, at `page.tsx:125`). Gate **exit 0**, *"lines
  blanked as JSX comments: 4"*. The comment is read and correctly not counted.
- **R16** — the same tree, with the DEF-41-02 opener **disabled** in a fixture
  copy (`grep -c 'MUTATION R16'` → **1**). Gate **exit 1**, naming
  `page.tsx:125` and quoting the comment line.

So the extension is **load-bearing on the first surface this gate scans**, not a
precaution. **R17** extended it to the multi-line form: the same comment
rewritten across four lines with the palette utility on an interior line
(`grep -c` → **1**) — *"lines blanked as JSX comments: 7"*, exit **0**.

## Deviations from Plan

### 1. [Plan's task structure vs. one-commit-per-task] Tasks 1, 2 and 3 landed in one commit

- **Found during:** commit planning.
- **Issue:** the executor's rule is one commit per task; the plan splits one file
  into three tasks that share a walk, a header and a verdict block.
- **Resolution:** one commit, with the reason in the message. The two
  intermediate states are not neutral — each would have been a gate **printing
  four ticks while measuring one or two**, which is precisely the shape this gate
  exists to catch. Committing a partially-measuring gate twice, in a plan whose
  objective is *"a vacuous green here is the most expensive vacuous green in the
  phase"*, would have been the thing it guards against. 41-05 set the precedent
  for merging commits with the reason stated.

### 2. [Rule 1 — Bug] The boundary guard borrowed from `verify-tokens.mjs` is BACKWARDS for this gate, and left check A blind to nearly every palette utility

- **Found during:** Task 2, mutation R5 — **the gate failed to fire.**
- **Issue:** the plan says to use `consumerPattern`'s boundary-guard technique.
  Its trailing guard is `(?![a-z0-9-])`, and `verify-tokens.mjs:535-554` states
  what it is for: *"so `bg-amber-500` is Tailwind's default scale and not the
  token `amber`"*. **That guard exists to reject the numeric scale.** Copied
  unchanged into a matcher hunting *palette* names, it rejects the very thing it
  should catch: `text-red-500` offers `text-red`, the guard sees the following
  hyphen and refuses the match.
- **What the gate measured with the defect in place:** only the scale-less
  names — the two achromatic ones. A deliberately planted default-scale utility
  on the converted page produced **exit 0**. Check A would have shipped green
  over the whole of finding A2 except `text-white`.
- **Fix:** an optional numeric scale between the name and the trailing guard,
  for the palette matcher only. The legacy-name matcher keeps the bare guard —
  those four names have no scale, and admitting one there would loosen a check
  for nothing. `utilityPattern` now takes the difference as a parameter, with the
  whole reasoning in its docblock so nobody re-borrows the sibling's version.
- **How the fix is known to be right rather than merely plausible:** with it,
  R5 goes **red** naming the utility; R7 catches opaque black *and* translucent
  black through a non-background prefix; R6 leaves all five scrim opacities
  green; R9 leaves all seven new token names green. Four measurements, two in
  each direction.
- **Why inspection did not find it:** the pattern reads correctly, cites a real
  precedent, and its author's reason for the guard is written down three files
  away. **Only the mutation found it** — which is the argument for the rule, made
  by the rule.
- **Files modified:** none beyond the created script. **Commit:** `a7f2624`.

### 3. [Rule 1 — Bug] A NUL byte made the gate binary to `grep`, and turned a mutation assertion into a false negative

- **Found during:** Task 2, while setting up mutation R13.
- **Issue:** the resolver cache keyed on `` `${fromDir}\0${spec}` `` — a
  separator chosen because no path contains one. True, and beside the point:
  **a NUL anywhere in a file makes it binary to `grep` and to `file`.** Every
  `grep` over the gate then returns *nothing at all* rather than *zero*.
- **How it announced itself, which is the part worth keeping:** a `perl`
  substitution on a copy of the script was followed, per protocol, by
  `grep -c 'MUTATION R13'` **before** the result was read. It printed nothing.
  Read naively that says *the substitution did not land*. It had — the file's
  line count had gone up by one. **The assertion instrument was lying, in the
  direction `ai-engineering.md` names**: had the mutation genuinely failed to
  apply, the same silence would have accompanied a green and certified a dead
  check as working.
- **Why it is a defect and not cosmetic:** this repository's verification method
  **is** `grep` and written evidence (`CLAUDE.md` Guardrail 1). A gate no `grep`
  can read is a silent failure with a green face, and it would have propagated
  to every future reader of this file.
- **Fix:** `JSON.stringify([fromDir, spec])` — printable, unambiguous, and it
  cannot collide the way a space-joined key could. Asserted: `file` now reports
  UTF-8 text, `grep -c "orphanDeclared"` returns **5**, the gate still exits 0.
  The paragraph explaining it is in the script beside the cache.
- **Files modified:** none beyond the created script. **Commit:** `a7f2624`.

### 4. [Rule 2 — Missing critical functionality] The walk resolves `.ts`, and refuses on a specifier it cannot resolve

- **Found during:** Task 1, before writing a check.
- **Issue:** the plan asks for a `.tsx` closure. Measured on the one declared
  surface, a `.tsx`-only resolver leaves **one specifier unresolved** — the
  page's own server action — and the plan's design says nothing about what to do
  with one. Silence there is not neutral: an unfollowed specifier is a part of
  the surface nobody opened, and the gate would have printed a tick over a
  closure it had narrowed by itself.
- **Fix, two parts:**
  - `.ts` joins the resolvable extensions. That surface's closure then resolves
    **completely** — 7 files, zero dangling. A `.ts` module holds a class string
    as easily as a component does; excluding it is a hole in the direction that
    produces a green.
  - **An unresolved local specifier is a `refuse()` at exit 2**, listing each
    one with the file that reaches it. Non-code specifiers (stylesheets, images,
    JSON) are skipped by suffix and none exists in the tree today.
- **Commit:** `a7f2624`.

### 5. [Contract conflict, resolved by the contract's own precedence rule] The scrim tolerance is a shape, not §13's three values

- **Found during:** Task 2.
- **Issue:** §13's G1 row names three translucent-black opacities that must not
  be flagged. **Measured, the tree carries five** — the two §13 does not name
  live in the media upload preview and are equally correct.
- **Consequence had the three been enumerated:** the gate opens **red on a
  correct file** the day a media surface converts. §0 rule 3 identifies that as
  the failure that gets a gate switched off, and §0 *"outranks everything
  below"*, §13 included.
- **Fix:** the tolerated shape is translucent black through the background
  prefix at **any** opacity. Opaque black is not a scrim and is not tolerated;
  nor is translucent black through any other prefix — **both proven by R7**.
  Every scrim forgiven is printed with its file and line, so a green states its
  own tolerance rather than hiding it.
- **The nine two-stop accent fades needed no exemption at all:** measured, they
  are built from **token** names, which the palette matcher does not contain.

### 6. [Plan's acceptance criterion vs. the tree] Check C cannot exit 0 on this tree as specified, and the tree is what is wrong

- **Found during:** Task 2, check C's first measurement.
- **The two halves of the plan that collide:** *"Zero is a failure"* and
  *"exits 0 on the tree as plan 41-05 left it"*. `IconButton` has **zero
  importers**, so both cannot hold.
- **Reconciled line by line, per 41-02's inherited lesson.** The check's design
  is right and the acceptance criterion's *expectation* is wrong: it assumed
  41-03's `IconButton` had the toast consumer 41-03 named. It does not, because
  41-04 converted that file on a parallel branch where the primitive did not yet
  exist, hand-wrote the contract, and said so at the call site. **Both plans were
  correct; the joint obligation belonged to neither afterwards.** 41-05 met it
  and recorded it as out of its scope. So did this plan.
- **Resolution:** `ORPHANS_DECLARED`, in the shape `verify-breakpoints.mjs` gave
  `REMAINING` one plan earlier — a debt with a number on it that can only go
  down, printed loudly on every green. **An undeclared orphan still fails**
  (R3, R4), the forgiveness is exactly one entry wide (R13), an entry naming an
  unpublished symbol fails (R19), and an entry that gains an importer becomes a
  `STALE` line to delete (R14).
- **The alternative and why it was refused:** editing `src/components/toast/`.
  Not among this plan's declared files; not a byte-identical swap (the shared
  rung carries a hover boundary, press feedback and a different ink token); a
  visible change to a component every surface can raise, with no H41-1 behind it.
- **Recorded as DEF-41-03**, which asks the phase which plan adopts it — and
  asks the more general question: after a parallel wave merges, **a joint
  obligation between two plans belongs to neither**, and nothing in the workflow
  looks for one.
- **Commit:** `2b819b1`.

## What this gate does NOT do, stated rather than left to be found

The script carries a `WHAT A GREEN DOES NOT MEAN` section; the load-bearing
lines, repeated because a SUMMARY is read by people who will not open it:

- **It proves no unconverted file is REACHABLE. It does not prove the conversion
  is right.** Blind to an inline hex in a style attribute, to a class built by
  concatenation or held in a lookup table, and to an ugly layout. **H41-1 is the
  only thing that says a surface is workable at three widths.**
- **Check D says a maximum is declared and that the page did not override it. It
  does not say the chosen width is right** — UI-SPEC Open Question 2.
- **The scope is the manifest.** A surface nobody declared is not scanned and is
  not a failure. The printed surface count is the honest reading; the tick only
  says the declared ones came back clean. **Today that count is 1.**
- **The built stylesheet is never read, deliberately.** DEF-41-01 measured that
  Tailwind compiles class strings out of `.planning/` and out of comments; a gate
  reading `.next/static/css` as evidence of product behaviour would be reading a
  phase document and calling it code.
- **Check C counts an import, never a re-export**, and never a runtime lookup.
- **Check B reports on converted surfaces only, and says so on every run.** It is
  not a tree-wide count of the legacy aliases and must never be read as one.

## Threat model — the four dispositions this plan carries

- **T-41-22 (Spoofing — an empty or broken manifest):** four refusal conditions,
  all → exit 2, all before any tick, plus two the plan did not specify (an
  unimportable manifest, an unresolved specifier). The empty-manifest refusal is
  proven by an asserted mutation (**R1**), the missing-page-file one by **R2**.
- **T-41-23 (DoS — the raw-palette regex):** proven **not** to fire on all five
  scrim opacities in the tree (**R6**) nor on the seven destination token names
  (**R9**), and proven to fire on opaque black and on translucent black through
  another prefix (**R7**). The accent fades need no exemption — measured, they
  carry token names.
- **T-41-24 (Repudiation — a surface declared converted but half-done):** the
  scope is the **import closure**, never the path, and the walk passes through
  excluded files rather than stopping at them. It refuses rather than narrowing.
- **T-41-25 (Information Disclosure — the `ColorSwatchPicker` exemption):**
  accepted, as a named constant with its reason, printed by the report.
- **T-41-SC:** **no package installed, added or removed.** `package.json` is
  untouched by this plan. Node built-ins only, ESM, zero dependencies.

`venue_reveal_sent` and every other monotone guard are untouched. This plan adds
no route, no query, no input, no user data, and no branch on `role` or `status`.
Nothing under `scanner/` or `(admin)/door/` was opened.

## Verification

Per `CLAUDE.md` Guardrail 1 and `meta-gates.md`: **there is no test runner for
the product**, so nothing here is claimed on the basis of tests passing.

| Check | Result |
|---|---|
| `node scripts/verify-conversion.mjs` | **exit 0**, four checks, 1 surface, 7 files scanned, 259 files walked for check C |
| Eleven mutations, each asserted before its result was read | **exit 1** or **2** each; each reverted and re-asserted |
| Three not-over-eager mutations | **exit 0** each, with the tolerance printed |
| R15 / R16, the reading-not-ignoring pair | **0** with the JSX opener, **1** without it, same file, same line |
| `npm run build` | **exit 0** — compiled in 6.6s, TypeScript clean, 40 static pages. **This is what proves the eleven reverts landed** |
| `node scripts/verify-tokens.mjs` | **exit 0** |
| `node scripts/verify-breakpoints.mjs` | **exit 0** |
| `node scripts/verify-no-viewport-read.mjs` | **exit 0** |
| `node scripts/verify-semantic-separation.mjs` | **exit 0** |
| `git status --short` before the first commit | one untracked file, `scripts/verify-conversion.mjs`, and nothing else |
| `git diff --diff-filter=D HEAD~1 HEAD` | empty — nothing deleted |
| `file scripts/verify-conversion.mjs` | UTF-8 text — the NUL defect closed and asserted |

**The script is not registered in `package.json`** — plan 41-12 owns that file
and registers all six new gates at once. Until then: `node scripts/verify-conversion.mjs`.
The header says so.

### Manual verification still owed

**H41-1 for `/payment/callback` is still not observed.** 41-05 recorded why it
could not be made from a worktree — the middleware needs Supabase credentials on
every request, including a public one, and pointing a running application at
production is an act requiring an authorisation this agent does not hold. **This
plan changes nothing about that**, and no green here stands in for it. The
procedure is written out in 41-05's SUMMARY, step by step.

## Known Stubs

None. Every constant in this script is a measurement taken on this tree or a
list read out of `41-UI-SPEC.md` §4 with its reason. No TODO, no placeholder, no
list seeded with a symbol that does not exist.

## Threat Flags

None. No network path, no route, no query, no user input, no schema.

## What the next plans in this phase inherit

- **A conversion plan's definition of done gained a mechanical check.** When a
  surface converts, its manifest entry is walked: the whole closure must be free
  of raw palette and legacy token utilities, the page must import the shell and
  write no maximum, and the recorded width must match §4.
- **Adding a primitive to `PRIMITIVES` without a consumer now fails a gate**, in
  the same run that publishes it. D-41-04 stops depending on a person
  remembering.
- **The debt has a number that can be watched: one orphan.** It only goes down,
  and the gate prints it on every run.
- **41-12 gets a fifth green gate**, exit-code compatible with the others: 0
  passed, 1 failed, 2 nothing measured.
- **Two lessons for whoever writes the sixth gate:** a regex borrowed from a
  sibling carries the sibling's *purpose*, not just its shape — ask what it was
  defending against before reusing it; and keep every byte of a gate printable,
  because a file `grep` cannot read is a file nobody can verify.
- **DEF-41-03 needs an owner.** No remaining plan declares
  `src/components/toast/`.

## Self-Check

- `scripts/verify-conversion.mjs` — **FOUND** (59 434 byte)
- `.planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md` — **FOUND** (DEF-41-03 present)
- commit `a7f2624` — **FOUND**
- commit `2b819b1` — **FOUND**

## Self-Check: PASSED
