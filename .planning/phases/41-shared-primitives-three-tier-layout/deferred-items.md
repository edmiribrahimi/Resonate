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

---

## DEF-41-02 — a JSX comment is live to `verify-semantic-separation` check C

**Found during:** plan 41-04, Task 3 (`FormatMarker.tsx`).
**Status:** open — deliberately not fixed inside 41-04.

### The finding

`verify-semantic-separation.mjs` blanks comment lines before counting, and its
stripper is a line-shape heuristic: a line counts as a comment when it starts
with `//`, `*`, `/*` or `*/`. **A JSX comment matches none of them.** The
opening line starts with `{`, and the lines inside it start with ordinary
prose. So every line of a `{/* … */}` block is scanned as if it were code.

Consequence for check C, which fails when **one line** carries both a `sem-`
colour utility and a format identifier (`color_hex`, `SunSet`, `RamaDub`,
`MotionLab`): a JSX comment that explains *why a semantic must not identify a
format* — naming both halves in one sentence, which is the natural way to write
it — **turns the gate red on a correct file**.

### The evidence — by mutation, with the mutation asserted first

Inside `FormatMarker.tsx`'s JSX comment, `--sem-warn` was changed to
`text-sem-warn` on the line that already named `SunSet`. The substitution was
confirmed applied (`grep -c 'text-sem-warn'` returned `1`) **before** the result
was read — ai-engineering.md's *prova per mutazione*, whose whole point is that
a substitution which did not land produces a green that means nothing.

```
✗ C  1 line(s) use a semantic to identify a format:
       src/components/formats/FormatMarker.tsx:125: [text-sem-warn + SunSet] …
SEMANTIC_SEPARATION_FAIL — 1 check(s) failed: C
```

Restored, the file is green. So the comment as committed is correct **and is
one word away from a false red**: it says `--sem-warn`, which carries no
utility prefix and therefore does not match, purely by luck of phrasing.

### Why this is worth a phase decision

The script's header reasons about its stripper's error direction and concludes
it is safe: keeping a comment makes the script *report more, never less*, and
every check fails on presence. **That reasoning covers soundness, not
usability.** Reporting more is exactly a false red, and the same header names
the consequence three paragraphs earlier — *a gate that goes red on a correct
file gets switched off*, written into `verify-media-strip.mjs:51-62` because
this repository has already paid for it once.

Phases 44 and 45 are named in that header as the ones that will legitimately
show a format and a stage badge in the same file. They will also *document* why
they may not do it on one line, and the documentation is what will trip.

### What the phase should decide

1. Whether the stripper learns the JSX comment form. It is not a tokeniser and
   must not become one — WR-07 records that a real comment parser written in
   this repository was unsound — but `{/*` as a fourth opener is a line shape,
   not a parse.
2. Or whether the convention stands instead: **inside a JSX comment, name a
   semantic by its custom property (`--sem-warn`), never by its utility.** That
   costs nothing, is already what the correct file does, and needs writing down
   somewhere a person will read before the gate teaches them.

Either way it is a change to a gate shared by the whole phase, which is why
41-04 measured it and left it.

### Note on this entry

Per DEF-41-01, the mutation string quoted above is now a live Tailwind
candidate out of `.planning/`, so the built stylesheet will carry a
`.text-sem-warn` rule with **no consumer under `src/`**. Recorded here rather
than left for whoever next greps the emitted CSS and concludes a surface paints
a warning. This entry is not scanned by the gate it describes — that script
walks `src/` and reads only `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs`/`.cjs`.
