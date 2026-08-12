---
phase: 41-shared-primitives-three-tier-layout
plan: 17
subsystem: verification-gates
tags: [gap-closure, cr-01, g4, page-shell, nav-clearance, import-closure, ancestor-layouts, resp-01, resp-02]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 07
    provides: "scripts/verify-conversion.mjs — the gate, its import-closure walk, its comment hygiene, its refusal convention and check D"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 13
    provides: "src/components/ui/PageShell.tsx — FOCUS_ROOT, the focus root hoisted to a single named literal so a gate could read it by name"
provides:
  - "scripts/verify-conversion.mjs — check E: the shell's focus root reserves neither navigation property while the primitive still reads both, and every converted surface's declared width agrees with the navigation it actually mounts"
  - "NAV_MODULES, FOCUS_ROOT_IDENTIFIER, LAYOUT_EXTENSIONS — declared constants carrying their reasons, each with a refusal behind it"
affects:
  - "41.1 and 41.2 — the first navigation-free surface declared at default or wide width turns check E red. That red is correct: it is when PageShell gets the nav prop 41-13 deliberately did not write, with its first consumer in the same commit (D-41-04)"
  - "CR-01 — closed in code by 41-13, guarded mechanically from this commit"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A surface's navigation is looked for in its own closure AND in every ancestor layout: a layout is not imported by the pages it wraps, so a closure-only check reddens three correct files"
    - "The union is built from each surface's `reached`, never its `scanned` — the manifest's spine exclusion removes AppNav.tsx from `scanned`, so reading `scanned` would report the one page that mounts its own navigation as navigation-free"
    - "A two-way assertion (focus if and only if no mount) states an invariant; a prohibition would only state half of it and would go green on the other half"
    - "A gate reads a declared marker by name rather than recognising a branch by its shape — greppable, and it forces the author to say so"

key-files:
  created: []
  modified:
    - scripts/verify-conversion.mjs

key-decisions:
  - "Check E's measurement is taken in the walk section, before any tick is printed, and only its verdict is printed after check D. That keeps the file's own convention — refusals come before ticks — while leaving E's report where a reader expects it."
  - "The layout enumeration reads EVERY file under src/app rather than only the ones the scanner's extension list admits. Filtering that walk by the list it is checking against would make it agree with itself; as written it refuses on a layout.* the walk could not have tested."
  - "No nav prop was added to PageShell, and no exemption or fence was added for the navigation-free case. The case is a red gate instead of a silent one — a primitive capability with zero consumers is the defect this phase exists to prevent."
  - "Task 2 changed no file by design, so it carries no commit of its own: its acceptance criterion is that `git status --porcelain` ends clean of all three mutations. Its evidence is this document."

requirements-completed: []

# Metrics
duration: ~55min
completed: 2026-08-12
tasks: 2
---

# Phase 41 Plan 17: Check E — the clearance against the mount

**CR-01 is now guarded mechanically: the insets cannot return to the focus form
without a gate going red.** Plan 41-13 closed the defect in code and said so
plainly — *"a later edit could put the insets back into the focus form and every
one of the sixteen gates would stay green"*. That sentence stops being true at
commit `4603834`.

**And it is worth saying what has not changed: nobody has yet looked at the four
screens.** Check E compares a declared width against a mounted navigation. It
reads a class string and an import graph, renders nothing, opens no viewport and
measures no pixel. **H41-1 and `41-CR01-PASS.md` remain the only things that would
say any of the four focus surfaces looks right, and both are still owed and
unmade.**

## What was built

### Task 1 — check E (commit `4603834`)

Two parts, one tick, in the same file as check D because it is the same gate (G4).

**E1 — the focus root.** It finds the single line in `PageShell.tsx` declaring
`FOCUS_ROOT` as a double-quoted literal closing on that line, then asserts three
things:

| Assertion | Why it is there |
|---|---|
| the literal contains neither `--nav-inset-inline-start` nor `--nav-inset-block-end` | this is CR-01 itself |
| it still carries a minimum-height utility and a centring utility | so **emptying** the string cannot satisfy the first assertion — a focus root that declares nothing reserves no clearance either |
| the shell **still reads both properties elsewhere** | the clearance left one form, not the primitive. Without this, the check is green on a shell that dropped it for the twelve `wide` routes and the work surfaces too |

Measured on the live tree: both properties are read outside the literal, each
exactly once — `PageShell.tsx:143` and `PageShell.tsx:147`. The docblock's prose
mentions of the same names are blanked by `liveLines()` before counting.

**E2 — the width against the mount.** For each surface it unions the page's own
import closure with the closure of **every ancestor layout**, climbing directory
segments from the page's own directory to `src/app` inclusive, then asserts
`width === "focus"` **if and only if** no member of `NAV_MODULES` is in that
union. Layout closures reuse `importClosure()`, so an unresolved specifier in a
layout refuses exactly as it does for a page.

**Four new refusals, every one in the direction that would otherwise print a tick:**

1. a `NAV_MODULES` path not on disk
2. a `layout.*` basename under `src/app` carrying an extension the walk does not test
3. a declared page file not under `src/app` (the climb would find nothing and report navigation-free)
4. a focus root that is absent, declared twice, or not a single literal closing on its line

### Task 2 — three mutation cycles

No file changed. That is the task: its acceptance criterion is that the tree ends
exactly as it was found.

## Check E's per-surface table, verbatim from the live run

```
  check E — the declared width against the navigation actually mounted (G4):

      navigation modules declared : 2
          src/components/layout/AppNav.tsx
             both tiers — the bar below 768px, the leading column at and above it
          src/components/layout/MobileNav.tsx
             the wrapper that renders AppNav locked to its phone form (D-41-21)
      layout files under src/app : 2
          src/app/(admin)/admin/(work)/layout.tsx
          src/app/layout.tsx
      the shell's focus root, src/components/ui/PageShell.tsx:108
          FOCUS_ROOT = "flex min-h-dvh items-center justify-center p-6"
          --nav-inset-inline-start   — outside the focus root: read at line(s) 143
          --nav-inset-block-end      — outside the focus root: read at line(s) 147

      route                         width    navigation   reached through
      /payment/callback             focus    none         —
      /login                        focus    none         —
      /register                     focus    none         —
      /set-password                 focus    none         —
      /gallery                      wide     mounted      AppNav.tsx  via  the page's own closure
      /admin/formats                default  mounted      AppNav.tsx  via  src/app/(admin)/admin/(work)/layout.tsx
      /admin/members/register       default  mounted      AppNav.tsx  via  src/app/(admin)/admin/(work)/layout.tsx
      /admin/members                wide     mounted      AppNav.tsx  via  src/app/(admin)/admin/(work)/layout.tsx

      4 of 8 surface(s) mount a navigation; 4 do not.
      That partition is the check: the ones that do not are exactly §4's focus list, or
      one of the two halves below fails.

  ✓ E  the focus root reserves neither navigation property while src/components/ui/PageShell.tsx
       still reads both elsewhere, and all 8 converted surface(s) declare the width
       their mounted navigation calls for — focus if and only if none is mounted
```

**The partition is 4/4, exactly as the plan predicted, with the mount route named
per surface: `/gallery` through its own closure, the three work surfaces through
`src/app/(admin)/admin/(work)/layout.tsx`.** No reconciliation was needed — the
plan's expectation and the tree agreed on every row. The four with no navigation
are exactly §4's closed focus list.

**The layout enumeration reports exactly 2 files under `src/app`**, both `.tsx`,
which is what `find src/app -name 'layout.*'` returns independently. There are no
`template.*` or `default.*` files in the tree — measured, and named here because a
`template.tsx` also wraps pages and is **outside this walk by construction**; if
one ever appears it will not be seen, and that is a stated limit rather than a
covered case.

## The false red this check nearly shipped, and how it was caught

**The invariant asked which correct file the check could wrongly call
navigation-free. The answer was `/gallery`, and the reason is not the ancestor
walk — it is which set the union is built from.**

`AppNav.tsx` is on the manifest's **spine** list, so the surface loop strips it
out of `scanned` before checks A, B and D ever read it. `/gallery`'s printed
`scanned` list contains 16 files and **`AppNav.tsx` is not among them**, though
`/gallery` is the one converted page that imports and renders it directly. A
check E built on `scanned` would have reported `/gallery` — declared `wide`,
correctly mounting its own navigation — as reserving a column it does not mount,
and would have reddened a correct file on its first run.

Check E reads each surface's **`reached`**, which is the full closure before any
exclusion. Written into the code, into the commit message and here, because the
next person extending this gate will reach for `scanned`: it is the set every
other check uses.

This was the eighth near-miss of its kind in this phase, and unlike the seventh it
was caught by asking the question before running rather than by the run.

## The three mutation cycles, in the order assert → exit → assert → exit

Every mutation was **asserted present before its result was read**. The phase has
one recorded false negative that read identically to *"the substitution did not
apply"* (a NUL byte that made a script binary to `grep`), which is why the
assertion is not optional.

### Mutation A — E1 reddens when the clearance comes back to the focus form

| Step | Command | Result |
|---|---|---|
| assert | `grep -n 'const FOCUS_ROOT' src/components/ui/PageShell.tsx` | line 108 printed with the leading-edge clearance appended — the inline-start property read through the padding utility. **The mutated class string is deliberately not spelled here: `.planning/` is scanned by Tailwind and cannot tell a description from a use (DEF-41-01).** The assertion is that the printed line contained `nav-inset`, and it did |
| exit | `node scripts/verify-conversion.mjs` | **1** — `✗ E  the focus root declares 1 navigation propert(y/ies) — this is CR-01`, naming `--nav-inset-inline-start` and printing `PageShell.tsx:108` with the literal |
| assert | same grep | `108:const FOCUS_ROOT = "flex min-h-dvh items-center justify-center p-6";` — no `nav-inset` |
| exit | `node scripts/verify-conversion.mjs` | **0** |

`npm run build` was **deliberately not run while this mutation was in place**:
Tailwind would have compiled the reinstated utility, and the point of the cycle is
to leave no trace (DEF-41-01).

### Mutation B — E2 reddens when a surface loses its navigation

The `AppNav` import and element were removed from `src/app/(public)/gallery/page.tsx`,
leaving the route declared `wide` in the manifest.

| Step | Command | Result |
|---|---|---|
| assert | `grep -c 'AppNav' src/app/(public)/gallery/page.tsx` | **0** |
| exit | `node scripts/verify-conversion.mjs` | **1** — `✗ E  1 surface(s) reserve navigation clearance they do not mount:` / `/gallery — declared "wide", whose shell form reserves the clearance`, with `no navigation module in its own closure (16 file(s))` and `nor in any of its 1 ancestor layout(s): src/app/layout.tsx`. The table row flipped to `/gallery  wide  none  —` and the partition to 3/8 |
| assert | `grep -n 'AppNav' src/app/(public)/gallery/page.tsx` | `2:import AppNav from "@/components/layout/AppNav";` and `95:      <AppNav` — and `git status --porcelain` empty, so the restoration is byte-identical rather than merely equivalent |
| exit | `node scripts/verify-conversion.mjs` → **0** · `npm run build` → **0** | |

### Mutation C — a stale declaration refuses rather than forgives

| Step | Command | Result |
|---|---|---|
| assert | `grep -n 'AppNavigation' scripts/verify-conversion.mjs` | `721:  ['src/components/layout/AppNavigation.tsx', 'both tiers — …'],` |
| exit | `node scripts/verify-conversion.mjs` | **2** — `FATAL: NAV_MODULES names src/components/layout/AppNavigation.tsx … which is not on disk … Nothing was measured.` **No check-E verdict, and no A, B, C or D tick either**: the refusal precedes every tick, which is this file's convention |
| assert | `grep -n 'components/layout/AppNav' scripts/verify-conversion.mjs` | `721:  ['src/components/layout/AppNav.tsx', …]` |
| exit | `node scripts/verify-conversion.mjs` | **0** |

**Why this one matters most.** A stale module path does not report "no navigation
anywhere" as a red. It reports it as *agreement*: the four focus surfaces would
match a check that had stopped looking, and only the other four would fail — for a
reason that is not theirs. A green there would have been the worst of the three
outcomes.

`git status --porcelain` is **empty** at the end of the plan. No change under
`src/` survives any of the three cycles. That cleanliness was checked, not assumed:
mutations A and B touch `access-gating`- and `media-and-storage`-adjacent product
files, and a mutation left behind on `/gallery` would be a layout change shipped by
a gate plan.

## Verification

**There is no test runner for the product.** No `test` script, no `*.test.*`, no
`*.spec.*` (`CLAUDE.md` Guardrail 1). Nothing below is a claim that tests pass.

| Check | Result |
|---|---|
| `node scripts/verify-conversion.mjs` on the live tree | **exit 0**, prints `✓ A`, `✓ B`, `✓ C`, `✓ D`, `✓ E` and `CONVERSION_OK — all five checks passed over 8 declared surface(s), 53 file(s) scanned.` |
| `npm run build` (Next's typecheck gate) | **exit 0** — compiled in 6.6s, TypeScript ran, 40 static pages, 58 routes |
| `grep -c 'NAV_MODULES' scripts/verify-conversion.mjs` | **7** (criterion: ≥ 3) |
| `grep -c 'FOCUS_ROOT' scripts/verify-conversion.mjs` | **12** (criterion: ≥ 1) |
| checks A, B, C, D untouched | `git diff` adds no line inside their bodies; all four still print their ticks with the same counts as before — 24 palette families, 12 prefixes, 3 tolerated scrims, 4 legacy names, 15 of 15 exports adopted, three maxima |

**`npm run verify` — aggregate exit code 2, on a worktree holding no `.env.local`.**
15 gates ran, **14 passed, 0 FAILED, 1 REFUSED**; 1 not run (`verify:redirects`,
which needs a running dev server); 16 declared, 16 accounted for, 0 MISSING.
`verify:conversion` is reported `0  passed`. Verdict line, verbatim:

```
VERIFY_REFUSED — 1 gate(s) could not measure: verify:capabilities
```

**A refusal is not a failure and is not a pass.** The refusing gate is
`verify:capabilities`, whose own stderr reads *"FATAL: missing environment
variable(s): SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL … Nothing was
measured."* That is the command working correctly on a machine without
credentials. **The number to compare against is the pre-change baseline recorded
in `41-13-SUMMARY.md` — exit 2, 14 passed, 1 REFUSED, 1 not run — and it is
identical.** On a credentialed checkout the same command exits 0 with 15 passed;
this worktree is not one, and that difference is a property of the environment,
not of this change.

## What this does not close

**RESP-01 and RESP-02 stay PARTIAL, and neither is ticked here.** RESP-01 closes
only after phase 41.2. A green from check E says the declared width matches the
mounted navigation and that the focus root reserves nothing. It does **not** say a
card is centred.

**H41-1 remains owed in full on all eight converted surfaces, and
`41-CR01-PASS.md` is still a pending procedure with all thirteen rows `pending`.**
This plan observed neither. It produced a gate; a gate is not an observation, and
the distinction is the whole reason `41-VERIFICATION.md` lists both items in its
`missing` list rather than one.

The first item of that list is now closed in its second half — *"a G4 assertion
that a converted page whose closure contains no AppNav/MobileNav import does not
read `--nav-inset-*`"*. Its first half (*"a nav-aware opt-out for the focus
branch"*) was answered differently and deliberately: **the opt-out was not
written, because it would have had zero consumers.** The case is a red gate
instead, and the prop arrives with its first consumer.

## Deviations from Plan

None — the plan executed exactly as written. No auto-fix was needed, no
authentication gate was hit, and **no package was installed** (T-41-SC: zero
`package.json` changes).

One thing the plan asked for was found to be already true rather than needing
correction: the plan warned that a wrong partition must be reconciled line by line
before changing anything. The partition came out 4/4 on the first run, with every
mount route as predicted, so no reconciliation was required and **nothing in the
manifest or on any page was adjusted to make a number come out**.

## Known Stubs

None. No hardcoded empty value, no placeholder text, no unwired component. The
change adds one check, four constants and four refusals to a verification script;
it touches no product file (`git diff --name-only` for this plan: `scripts/verify-conversion.mjs`
alone, plus this document).

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change at a
trust boundary was introduced. The script opens no connection, reads no
environment variable, writes no artefact, and prints only paths, line numbers and
source lines from files already committed to a public repository.

T-41-66 is recorded as **mitigated by measurement rather than by intention**:
mutation B touched `/gallery`, which renders event media and is
`media-and-storage` territory with a `venue-secrecy` supplement. The mutation
removed only a navigation mount, it was restored, and `git status --porcelain`
being empty is an observed fact above, not an assumption.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 | `4603834` | `feat(41-17)` — check E: the clearance a surface reserves must match the navigation it mounts |
| 2 | — | no file changed by design; the three mutation cycles are recorded above and the tree ends clean |

## Self-Check: PASSED

- `scripts/verify-conversion.mjs` — FOUND
- `.planning/phases/41-shared-primitives-three-tier-layout/41-17-SUMMARY.md` — FOUND
- commit `4603834` — FOUND
- `node scripts/verify-conversion.mjs` re-run after this document was written — **exit 0**
- `npm run build` re-run **after** this document was written — **exit 0**. Same reason
  41-13 re-ran it: Tailwind scans `.planning/`, so a planning document can emit a
  malformed rule. This document names the two navigation properties and never spells
  the utilities that read them (DEF-41-01)

