---
phase: 41
slug: shared-primitives-three-tier-layout
status: reconciled
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-11
reconciled: 2026-08-11
derived_from: 41-RESEARCH.md § Validation Architecture, then 41-UI-SPEC.md §13 and §0
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Reconciled 2026-08-11, after `41-UI-SPEC.md` was approved 6/6.** The three
> decisions this document was blocked on now have numbers, and the gate count
> goes from five to seven — see *Unblocked* below. `nyquist_compliant: true`
> means the **strategy** is complete: every criterion has either a gate with a
> threshold or a written manual procedure, and every gate has an exemption list
> that exists before it does. `wave_0_complete` stays **false** until the scripts
> exist on disk — a plan is not an artifact.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **None.** No `test` script in `package.json`; zero `*.test.*` / `*.spec.*` under `src/` (re-verified 2026-08-11). **Wave 0 must not introduce one** — adding a test runner is a milestone-sized decision and appears in none of this phase's requirements. |
| **Config file** | none |
| **Quick run command** | `npm run build` — Next's build is also the typecheck. Measured 2026-08-11: **exit 0** |
| **Full suite command** | `npm run build` + every `scripts/verify-*` gate. Measured 2026-08-11: **all seven `verify:*` npm scripts exit 0** (`tokens`, `semantic-separation`, `sunset-gradient`, `routes`, `capabilities`, `media-strip`, `persona`) |
| **Estimated runtime** | build ~60–120 s; each structural gate < 5 s |

### The gate model this phase must copy

`scripts/verify-tokens.mjs` and `scripts/verify-media-strip.mjs` are the model
species. Three conventions, all load-bearing:

1. A **`WHAT A GREEN DOES NOT MEAN`** header enumerating what the check cannot see.
2. **`refuse()` → exit 2** for *could not run*, distinct from exit 1 for *failed*.
   *No verdict is implied by a 2.*
3. **Print what was counted, not just the verdict.**

---

## Sampling Rate

- **After every task commit:** `npm run build`
- **After every wave merge:** `npm run build` + every `scripts/verify-*` gate
- **Phase gate:** all gates green, **plus** H41-1 … H41-6 written and scheduled
- **Max feedback latency:** ~120 s (one build)

---

## Requirements → Verification Map

**Stated up front, because a table of five green boxes would be a lie:** two of
the five criteria are structurally checkable, two are checkable in part, and one
is not checkable at all.

| Criterion | Req | Checkable? | Gate | What a green does **not** mean |
|---|---|---|---|---|
| **1 — one implementation, no surface half-converted** | DS-07 | **Yes** | **G1 `verify-conversion.mjs`** — a manifest lists converted surfaces; for each, walk the page's transitive `.tsx` import closure (excluding a declared spine and Phase 42's three files) and assert **zero** raw-palette utilities and **zero** legacy-token utilities. Separately assert each declared primitive has **≥1 importer** | That the conversion is *right* — only that no unconverted file is reachable. Blind to an inline hex, a class built by concatenation, and to an ugly layout |
| **2 — sheet on a phone, window above, one implementation, Escape closes it** | DS-08 | **Partly** | **G2 `verify-dialogs.mjs`** — every file matching the dialog-shell signature imports the single primitive; the primitive uses `showModal()`; no file outside the primitive declares `fixed inset-0 z-[60]` | **That Escape actually closes it on a device.** `showModal()` implies it by specification; only a hand test observes it. And nothing static proves a sheet looks like a sheet |
| **3 — dense table reads as cards on a phone** | DS-09 | **Yes** | **G3 `verify-tables.mjs`** — every `<table` under `src/` either imports the table primitive or sits on an explicit, reasoned exemption list; **one** breakpoint token across all of them | That the cards are readable, or that the right columns survived |
| **4a — workable on phone, tablet and desktop** | RESP-01 | **No** | — → **H41-1** | — |
| **4b — content stops widening** | RESP-02 | **Yes** | **G4** — the page-shell primitive declares a max width, and every converted page's outermost element comes from it | That the chosen width is right |
| **4c — filters and nav visible from tablet up** | RESP-04 | **Partly** | No `overflow-x-auto` on a nav element above the chosen breakpoint | Whether it is *usable*. And note: **there is no menu today**, so the criterion's literal test already passes on failing code |
| **5 — finger-sized wherever the input is a finger** | RESP-03 | **Partly, and dangerously** | **G5 `verify-touch-targets.mjs`** — interactive elements in converted files carry `min-h-11`/`h-11`+ or match the primitive; `src/**/scanner/**`, `src/components/scanner/**` and `src/app/(admin)/door/**` exempt by path with the reason in the script | **That anything is 44 px.** A class-string parser cannot see a flex stretch, an icon-set height, or an ancestor's padding |

---

## Both Phase 40 Failure Modes, Assessed Per Gate

Phase 40 paid for both of these. Every gate this phase writes is assessed
against them **before** it is committed, not after it is switched off.

| Gate | Green having measured nothing? | Red on a **correct** file? |
|---|---|---|
| **G1 conversion** | **Yes** — an empty manifest yields *"0 surfaces, all clean"*. **Mitigation:** print the surface count and files walked; `refuse()` on an empty manifest | **Low.** The raw-palette regex must not match `bg-black/60` (11 modal scrims and nine two-stop accent fades are all correct) and must exempt `globals.css` and `ColorSwatchPicker.tsx` — the one file legitimately carrying brand hexes |
| **G2 dialogs** | **Yes** — an over-specific shell signature matches nothing. **Mitigation:** assert the match count equals a hard-coded expected count and fail if it drops | **Medium.** `Lightbox.tsx` differs (`bg-black/90`); a signature demanding `/80` misses it. `MyMediaSection.tsx:184` is the only `role="dialog"` and is not a `<dialog>` |
| **G3 tables** | **Low** — `<table` either exists or does not; print the count | **Medium.** `ReviewListClient` may be a legitimate exemption (a copy-out diagnostic grid). **The exemption list must exist before the gate**, or the gate gets switched off on its first run |
| **G4 container** | **Yes** — same empty-manifest hole as G1 | Low |
| **G5 touch targets** | **Yes** — the parser found a computable height for only 174 elements. A stricter parser measures fewer and reports greener | **HIGH — the highest of the five.** Run tree-wide it goes red on Phase 42's files, on decorative anchors, on icons inside stretched flex rows, and on elements padded by an ancestor. **Scope it to converted files, exempt Phase 42 by path, and prove it green on the hardest correct file in the tree before committing it — or do not write it** |

---

## Manual-Only Verifications

Two criteria no script will ever close. They need a written procedure in the
`40-RELEASE-PASS.md` mould, scheduled with the end-of-v1.5 sitting that already
owns Phase 40's H1/H3 and Phase 39's door pass.

| # | Test | Expected | Why manual |
|---|------|----------|------------|
| **H41-1** | Open each converted surface at 390 px, 768 px and 1280 px | Nothing clipped, nothing stretched, no horizontal scroll on the page body | *Workable* is a judgement |
| **H41-2** | Open a converted dialog on a phone and on a laptop | Sheet from the bottom edge on the phone; centred window on the laptop; **Escape closes it**; the background does not scroll behind it | Escape and scroll-lock are runtime behaviours. **Background scroll lock under `showModal()` is unverified in research** — this is where it gets settled |
| **H41-3** | Open the densest converted table on a phone | Cards, no sideways scroll, every column that mattered still present | Which columns matter is a judgement |
| **H41-4** | On a large touch screen, measure the smallest control on a converted work surface | ≥ 44×44 CSS px | The research figure is a class-string parse, not a measurement |
| **H41-5** | On a desktop with a mouse only, confirm targets are not gratuitously large | — | The other half of the `any-pointer` trade |
| **H41-6** | Reach every work-surface tab at 768 px without scrolling the strip | All eight reachable | The ~808 px figure is an estimate; this is the measurement |

---

## Wave 0 Requirements

- [ ] `scripts/verify-conversion.mjs` — G1 (DS-07, criterion 1)
- [ ] `scripts/verify-dialogs.mjs` — G2 (DS-08, criterion 2)
- [ ] `scripts/verify-tables.mjs` — G3 (DS-09, criterion 3), **exemption list decided first**
- [ ] `scripts/verify-touch-targets.mjs` — G5 (RESP-03, criterion 5), **scoped and path-exempted, and proven on `MemberTable.tsx` — or not written at all**
- [ ] `scripts/verify-breakpoints.mjs` — G6, no exception
- [ ] `scripts/verify-no-viewport-read.mjs` — G7, no exception
- [ ] **The conversion manifest** — the one artifact G1 and G4 both read, and the thing that makes criterion 1 mechanically meaningful rather than rhetorical
- [ ] **`npm run verify` — an aggregate script.** `40-REVIEW.md` WR-09 is still open: no CI exists, and every gate runs only when a human types its name. This phase would take the count from 10 to 14. **Four more gates nobody runs is not verification, it is four more files.** Cheapest high-value item in the phase, and it closes a Phase 40 warning at the same time
- [ ] A release-pass document carrying H41-1 … H41-6, written **before** the sitting
- Framework install: **none.** Deliberate.

---

## Unblocked — the three decisions, now with numbers

All three were settled and none was guessed. Recorded here so the gates are
written against a target that has stopped moving.

| Was blocked on | Settled by | The value |
|---|---|---|
| G1 and G4's manifest | **Owner delegate** — `41-CONTEXT.md` D-41-01 | **Spine-first.** A fourteen-file spine converts in Wave 0, breaking the 104-file indivisible unit into **34 units, 31 of them a single page**. This does not violate criterion 1: the criterion protects a *user* from meeting a half-converted surface, and the spine has no surface of its own |
| G5's threshold | **UI-SPEC** §6 | **`min-h-11` = 44 px**, unprefixed default, with one 36 px shrink site behind `@custom-variant pointer-fine-only` |
| G3's exemption list | **Owner delegate** — D-41-16 | `ReviewListClient.tsx` stays a table, exempt, **with the reason written into the script before the script runs**. The six tables that already render cards consolidate onto **one** breakpoint: `md` |

## Two gates added by the UI-SPEC — both cheap, both without a legitimate exception

The count goes from five to seven. Neither of these was in the research; both
exist because the contract fixed a value that made them checkable.

| Gate | Asserts | Exemptions |
|---|---|---|
| **G6 breakpoints** | no `sm:`, `xl:` or `2xl:` in a converted file — the contract names three tiers and `md`/`lg` express them (D-41-05) | **none.** Having no legitimate exception is what makes it worth writing |
| **G7 no viewport read** | `matchMedia`, `useSyncExternalStore` and `innerWidth` have **zero** occurrences under `src/` | **none.** Zero today; the gate keeps it zero. The sheet↔window switch is CSS-only precisely so this stays true |

## The other thresholds the UI-SPEC fixed

| Gate | Threshold | Exemptions, written now |
|---|---|---|
| **G1 conversion** | — | the raw-palette regex must not match `bg-black/60`, `/80`, `/90` (modal scrims) nor the nine two-stop accent fades; `globals.css` and `ColorSwatchPicker.tsx` exempt; `refuse()` → exit 2 on an empty manifest |
| **G2 dialogs** | the primitive's signature is `showModal()` + `items-end md:items-center`; no file outside it declares `fixed inset-0 z-[60]`; no file rendering `Dialog` imports `useToast` | `Lightbox.tsx` (full-bleed media viewer, `bg-black/90`); `MyMediaSection.tsx:184`, the tree's only `role="dialog"` and not a `<dialog>` |
| **G4 container** | the shell declares `max-w-5xl` / `max-w-7xl` / `max-w-sm`; every converted page's outermost element comes from it | the `wide` and `focus` lists in UI-SPEC §4 **are** the manifest G4 reads |

## G5's proof obligation, which is not optional

`41-UI-SPEC.md` §13 makes D-41-19 concrete for the gate the research flagged as
most dangerous. **Before G5 is committed** it must be:

- proven **red**, by mutating one `min-h-11` to `min-h-8` in a converted file —
  **with the mutation asserted to have landed before its result is read**; and
- proven **green** on the hardest correct file in the tree,
  `components/admin/MemberTable.tsx` — 1 395 lines, both branches, checkboxes,
  row actions and wrappers.

**If it cannot go green on that file, it is not written.** A gate that fires on
correct code gets switched off, and a switched-off gate guards nothing while
looking like it does.

Two further obligations the plan must not discover late:

- **`@custom-variant pointer-fine-only` must be proven to emit by `npm run build`
  before any consumer is written.** Zero pointer variants exist under `src/`
  today, so nothing in the tree proves the variant compiles.
- **`'control'` enters `KNOWN_TOKEN_NAMES` in the same commit that declares the
  token** (D-41-14), and `verify-tokens.mjs` check A must be confirmed green
  against the `@media` `:root` block before that commit lands — this is WR-02's
  failure mode, and Phase 40 already paid for it once.

---

## Validation Sign-Off

- [ ] All tasks carry an automated verify command or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Every gate assessed against **both** Phase 40 failure modes before it is committed
- [ ] Every new gate proven able to go **red**, with the mutation asserted to have landed before its result is read
- [ ] G5 proven green on `components/admin/MemberTable.tsx`, or not written
- [ ] `@custom-variant pointer-fine-only` proven to emit before any consumer exists
- [ ] `'control'` in `KNOWN_TOKEN_NAMES` in the commit that declares the token
- [ ] `npm run verify` aggregates all fourteen gates
- [ ] H41-1 … H41-6 written and scheduled before the phase closes
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** reconciled 2026-08-11 — the strategy is complete and cleared for
planning. **It is not evidence of anything yet:** every box above is unticked
because the scripts do not exist, and two criteria (RESP-01, and criterion 5's
real content) will end this phase as human observations no matter how many gates
go green.
