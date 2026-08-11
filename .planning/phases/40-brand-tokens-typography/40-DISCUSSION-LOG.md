# Phase 40 — Discussion Log

**Date:** 2026-08-11
**Mode:** discuss (default), with the gray areas delegated to the expert persona

> Human reference only. Downstream agents read `40-CONTEXT.md`, not this file.

---

## What was presented

Four gray areas, each grounded in a measurement rather than a category:

1. **The conversion perimeter** — 73 of 181 `.tsx` files use default Tailwind
   colours; `globals.css` declares a palette that is not the brand's.
2. **How a release lands, and the door** — `skipWaiting` + `clientsClaim` against
   `reloadOnOnline: false`.
3. **The third typeface** — DS-05 asks for three roles; `36-VISUAL-SOURCE.md`
   declares two families; the product loads one.
4. **The red accent and the fifth token** — `--accent: #e5484d` belongs to neither
   the brand palette nor the semantic set; `--soy` has no determined meaning.

## What the owner answered

> *"expert persona decides based on deep research. non so se riguardi questa fase
> ma i colori e i layout devono essere gli stessi dell'artifact produzione"*

Two distinct things, and they were separated rather than merged:

- **The gray areas** were delegated. Each was decided against a measurement and
  the reasoning is in `40-CONTEXT.md` under its decision id.
- **"the colours and the layouts must be the artifact's"** is a real owner
  decision and became **D-40-01**. The owner's own caveat — *"non so se riguardi
  questa fase"* — was correct and was answered rather than absorbed: the colours
  are this phase, the **layouts are Phase 41** (D-40-02), and the roadmap already
  routed them there before the question was asked.

## How each area was decided

| Area | Decision | What decided it |
|---|---|---|
| Conversion perimeter | Token layer only; the 73 files are Phase 41 | Phase 41's criterion 1 already says a surface converts *whole*; doing it here would half-convert 73 surfaces, which is the thing that criterion forbids |
| Release / DS-10 | **Nothing may reload a page by itself** (D-40-11) | `reloadOnOnline: false` is deliberate, and a platform-initiated reload during a scan is what Phases 38 and 39 exist to prevent |
| Typography | display Orbitron · interface Inter · data mono (D-40-08) | The product had already argued it: `menu/page.tsx:19-21` escaped Orbitron for Inter *"for low-light venues"* and called Orbitron *"its display font"* in the same comment |
| Red accent | Retired (D-40-04) | It is in neither the brand palette nor the semantic set, and it is already a token — one value change reaches 101 files |
| Fifth token | Left out (D-40-06) | `36-VISUAL-SOURCE.md` says its meaning must be **asked, not deduced**. Adopting it would be inventing a meaning |

## Raised, not decided

- **The primary accent and MotionLab share `#FF5C93`.** Kept as two tokens so the
  collision is reversible in one line, but which colour a primary action should be
  is a **brand** decision. `brand-visual-system.md` forbids inventing one.
- **`--soy` `#8C82A6`** — one line to add if it has a meaning.

## Scope creep redirected

- The artifact's **layouts** → Phase 41, recorded as D-40-02 so the decision is not
  lost between the two phases.
- The **scanner** → Phase 42, which additionally waits on Phase 39 being used at a
  real night.
- A **light theme** → refused, not deferred: `36-VISUAL-SOURCE.md` records the
  dark-only commitment as a declared choice.

## Constraint carried into the context

`36-VISUAL-SOURCE.md:160-163` — the artifact's mockups contain venue names,
line-ups and dates, and none of it may enter `.planning/`, which is published.
"The same layouts" was recorded as **structure, never content** (D-40-03).
