---
phase: 41
slug: shared-primitives-three-tier-layout
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-11
derived_from: 41-RESEARCH.md § Validation Architecture
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **Draft.** Three of the five gates below cannot be finalised until the owner
> and the UI-SPEC settle what they measure against — see *Blocked on decisions*.

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
- [ ] `scripts/verify-touch-targets.mjs` — G5 (RESP-03, criterion 5), **scoped and path-exempted, or not written at all**
- [ ] **The conversion manifest** — the one artifact G1 and G4 both read, and the thing that makes criterion 1 mechanically meaningful rather than rhetorical
- [ ] **`npm run verify` — an aggregate script.** `40-REVIEW.md` WR-09 is still open: no CI exists, and every gate runs only when a human types its name. This phase would take the count from 10 to 14. **Four more gates nobody runs is not verification, it is four more files.** Cheapest high-value item in the phase, and it closes a Phase 40 warning at the same time
- [ ] A release-pass document carrying H41-1 … H41-6, written **before** the sitting
- Framework install: **none.** Deliberate.

---

## Blocked on Decisions

This document cannot reach `nyquist_compliant: true` until three things are
settled elsewhere. Recording them here rather than guessing keeps the gates from
being written against a target that then moves.

| Blocked | Needs | Why it blocks |
|---|---|---|
| G1 and G4's manifest | **Owner** — what counts as one converted surface, and whether a spine-first wave is allowed | Criterion 1 read literally fuses 24 of 41 pages into one indivisible unit of 104 files. Converting a 14-file spine first breaks it into 34 units. The gate measures whichever answer is chosen |
| G5's threshold | **UI-SPEC** — the target size, and the tier boundaries | A gate cannot assert `min-h-11` before the contract says 44 px |
| G3's exemption list | **Owner** — whether the copy-out diagnostic grid should become cards at all | An exemption discovered on the gate's first red run is an exemption nobody trusts |

---

## Validation Sign-Off

- [ ] All tasks carry an automated verify command or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Every gate assessed against **both** Phase 40 failure modes before it is committed
- [ ] Every new gate proven able to go **red**, with the mutation asserted to have landed before its result is read
- [ ] G5 proven green on the hardest correct file in the tree, or not written
- [ ] `npm run verify` aggregates every gate
- [ ] H41-1 … H41-6 written and scheduled before the phase closes
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — blocked on the three decisions above.
