# Phase 41 — deferred items

Discoveries made during execution that are **out of the discovering plan's
scope**. Each carries its evidence, so the phase can decide once instead of each
plan rediscovering it.

---

## DEF-41-01 — Tailwind compiles class strings out of `.planning/`

**Found during:** plan 41-01, Task 3 (the `pointer-fine-only` emission proof).
**Status:** open — deliberately not fixed inside 41-01.

### The finding

Tailwind v4's automatic source detection scans the repository, and
`.planning/**/*.md` is **not excluded**. Every class string written in a PLAN,
a UI-SPEC, a RESEARCH or a PATTERNS document is a live candidate, and any
candidate that resolves against the theme is **emitted into the production
stylesheet**.

### The evidence — measured, not argued

Attribution was taken with a class that only the documents mention, so that the
measurement is not made with the instrument that caused the effect:

| Step | Command | Result |
|---|---|---|
| the class exists nowhere in the product | `grep -rn 'max-w-7xl' src` | no match |
| the class exists only in the documents | `grep -rl 'max-w-7xl' .planning` | 5 files, all under `phases/41-…` |
| the class is nonetheless shipped | `grep -c 'max-w-7xl' .next/static/css/*.css` | **1** |

`max-w-7xl` is §4's `wide` container form. **Nothing in the tree uses it yet**
— 41-UI-SPEC §4 states outright that nothing wider than `max-w-lg` exists today
— and it is already in the built CSS.

### Why it surfaced in 41-01, and what it broke there

41-01 declares `@custom-variant pointer-fine-only`. **Before that declaration**
the phase documents' mentions of the shrink class were invalid candidates and
Tailwind dropped them. **After it**, the same mentions compile. So the built
stylesheet now contains the one shrink rule of §6.3 while the allow-list is
still, correctly, empty in the product — the exact state §6.3 says should not
be reachable until a consumer is written.

Concretely, it cost 41-01 a proof: the task's design was *remove the probe,
rebuild, and read the absence*. The absence never came, and the emitted CSS was
byte-identical (same content hash) before and after the removal. The probe's
removal is therefore asserted **by the diff**, and 41-01 says so in the file
rather than claiming a proof it does not have.

### Why it was NOT fixed in 41-01

The obvious fix is one line in `src/app/globals.css`:

```css
@source not ".planning";
```

It was not taken, and the reason is the direction of the failure, not the size
of the diff:

- **The cost of leaving it:** dead rules in the stylesheet. Inert bytes.
- **The cost of getting the exclusion wrong:** a rule silently stops being
  emitted. `globals.css:180-200` already records what that looks like in this
  repository — *Tailwind emits no rule, no warning and no error for a utility
  whose token is gone, the element renders with whatever it inherits, and
  `npm run build` stays green.* There is no error tracking here, so nobody
  would be told. A class reaching the DOM by string concatenation while its
  literal lives only in a document is the case that would break, and it is a
  case no grep finds.

One is loud and cheap; the other is silent and visual. That asymmetry is
`checkin-offline.md`'s, applied to a build.

And the scope is wrong for plan 01: the change is to what the **whole phase**
compiles from, and eleven other plans read this stylesheet.

### What the phase should decide

1. Whether to exclude `.planning/` from source detection at all.
2. If yes — whether it lands in its own plan, with a **before/after inventory
   of the emitted class list** rather than a build-is-green check. A diff of the
   emitted CSS is the only thing that distinguishes *removed dead rules* from
   *removed live ones*.
3. Whether any gate in this phase intends to read the built stylesheet as
   evidence. If one does, it inherits this defect and must be written to
   tolerate it — otherwise it will read a document as if it were the product.

### Note on this file

This document names the two class strings above, so it is itself a source of
the candidates it describes. That adds nothing new — both already appear in the
phase's own documents — but it is worth knowing before anyone measures again
and wonders where the count came from.
