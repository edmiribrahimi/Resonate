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

---

## DEF-41-03 — `IconButton` is a published primitive with zero importers, and no plan owns the file that would adopt it

**Found during:** plan 41-07, Task 2 (check C's first measurement).
**Status:** **half closed by plan 41-08, and the open half is now invisible to
the gate.** Read the next section before reading the rest of this entry, which
is preserved as it was written.

### Update — plan 41-08, 2026-08-12

**The orphan is closed, and not from the direction anybody expected.** Plan
41-08 declared `/gallery` converted; its import closure reaches
`src/components/media/Lightbox.tsx`, whose close control was a 40 px circle
below §6.1's floor and drawn with a raw achromatic fill. Converting it meant
reaching for the icon rung. `IconButton` therefore has **one importer**, check C
counts it, and the `ORPHANS_DECLARED` entry — which the gate itself flagged
`STALE` on the next run — was deleted as instructed.

**What is NOT closed:** `src/components/toast/Toast.tsx` still carries a
hand-written copy of that contract, eight lines that the shared rung would
replace. Nothing above changed about why: it is not a byte-identical swap, it is
a visible change to a component every surface can raise, and **no plan in this
phase declares that file** — 41-08 did not either.

**And the mechanism that was watching it is gone.** Check C counts importers;
the count is now one, so it is green and silent. The duplication is a *second
author for one contract*, which is a different defect from an orphan and one no
gate in this phase measures. That is the honest limit of a mechanical check, and
it is why this entry stays open rather than being ticked: the number that made
the debt visible has been paid by somebody else's work, and the work it stood
for has not.

Item 1 below still needs an answer, and item 3 — *should the workflow look for a
joint obligation after a parallel wave merges* — is now supported by a second
observation: **a debt tracked by a proxy metric is closed by anything that moves
the metric.**

### The finding

`src/components/ui/Button.tsx` exports `IconButton`. Measured across all 259
files under `src/`, in live lines, counting a named import that resolves to that
exact file: **zero importers.** The name appears nowhere outside its own
definition.

That is D-41-04's failure mode — *no plan ships a primitive without converting a
surface onto it in the same plan* — reproduced inside the phase written to
prevent it.

### How it happened, which is the part worth keeping

Neither plan did anything wrong, and that is why it needs recording rather than
blaming:

- **41-03** published `IconButton` and named its consumer: the toast's dismiss
  control, being converted by **41-04, in the same wave**.
- **41-04** converted `src/components/toast/Toast.tsx` **on a parallel branch
  where `IconButton` did not yet exist**. Importing it would not have compiled.
  So it wrote the contract by hand and said so at the call site, in a comment
  that ends *"this is the call site that adopts it when it lands"*.
- Both branches merged. The primitive landed. **The adoption did not**, because
  it belonged to neither plan's post-merge scope.
- **41-05** met it and recorded it under *Carried forward, not fixed*, correctly
  observing that `src/components/toast/` was not among its declared files.

**This is a cost of wave parallelism, not of either plan.** Two plans in one
wave can each satisfy their own contract and still leave a joint obligation that
neither owns afterwards — and nothing in the workflow looks for one. The gate
that found it did not exist until wave 4.

### Why 41-07 did not fix it

The fix is small and already specified: import the rung, delete the five-line
hand-written control. But it is **not a byte-identical swap** — the shared rung
carries a hover boundary, press feedback, and a different ink token than the
hand-written string. It is a **visible change to a spine component that every
surface can raise**, and `src/components/toast/` is not among plan 41-07's
declared files (which are `scripts/verify-conversion.mjs`, and nothing else).
Making it from a gate-authoring plan, in a wave running in parallel, would be
scope creep with a visual effect and no H41-1 observation behind it.

### What the gate does instead, and why that is not a loosened check

Shipping check C red was the other option and is worse: a gate that arrives red
is switched off before it has guarded anything (§0 rule 3,
`verify-media-strip.mjs:51-62`), and plan 41-12 aggregates these six gates into
one command — a red one would make the aggregate red on arrival.

So `verify-conversion.mjs` carries **`ORPHANS_DECLARED`**, in the same shape
`verify-breakpoints.mjs` gave `REMAINING` one plan earlier: a **debt with a
number on it that can only go down**, printed loudly on every green, with the
reason and the owed work on the entry. The three states are the same three:

- an orphan **not** declared → **failure**. That is the check.
- an orphan **declared** → a loud `! C` notice, exit still 0.
- a declared orphan that **gains an importer** → a `STALE` line to delete.

All three were proven by asserted mutation before the gate was committed.

### What the phase should decide

1. **Which plan adopts it.** No remaining plan in phase 41 declares
   `src/components/toast/`. Either one gains the file, or a small plan is added,
   or it is handed to a later phase — but *"someone will notice"* is exactly
   what did not happen the first time.
2. Whether the adoption needs an **H41-1 glance**: the dismiss control changes
   appearance on a component every surface can raise.
3. Whether the workflow should look for this class of gap after a parallel wave
   merges — **a joint obligation between two plans in one wave belongs to
   neither of them afterwards**, and this is the second time this phase has paid
   for a merge artefact (the first is 41-05's note about the same file).

---

## DEF-41-04 — G4 cannot tell a typographic MEASURE from a container MAXIMUM, and a converted page lost a measure to it

**Found during:** plan 41-09, Task 3 — `/admin/formats`.
**Status:** open. The page was changed; the contract was not.

### The finding

`41-UI-SPEC.md` §4 and D-41-06 give the **content maximum** to `PageShell` and
say a converted page writes none of its own. `verify-conversion.mjs` check D
implements that with `MAX_WIDTH_RE` (`:1166`), which matches **any** width
utility on a declared page file.

The catalogue's retired section carries an explanatory paragraph that had a
**reading measure** on it — a typographic property of a `<p>`, not a container
width on a page root. The two are the same string to a grep, so check D opened
red on it.

### The evidence

| Step | Result |
|---|---|
| `node scripts/verify-conversion.mjs` with the measure present | **exit 1**, `✗ D  1 maximum(s) written on a converted page itself`, naming the `<p>` and its line |
| the same run with the measure removed | **exit 0**, all four checks |

The gate is not wrong about what it can see. §4 is unqualified, and a page
carrying a width utility is what it forbids.

### Why the page changed rather than the gate

Three reasons, in order:

1. **This plan does not own `verify-conversion.mjs`.** Loosening a sibling
   plan's gate from a conversion plan is how a check acquires an exemption
   nobody debated.
2. **An inline style would have dodged the grep**, which is evasion with a
   different spelling and worse than the red.
3. **§4 has no clause for a measure.** Adding one is a contract decision, and a
   contract decision made inside a conversion commit is a contract decision
   nobody reviewed.

### The cost, stated rather than glossed

The paragraph now runs the full width the shell allows — **1024px** at
`default` — at the small type size. That is a poor measure for prose, and the
loss is real: it is the one place on this surface where the asymmetry between
retiring and restoring is explained, so it is a paragraph somebody actually
reads.

### What the phase should decide

1. Whether §4 gains a sentence separating a **container maximum** (the shell's,
   never a page's) from a **typographic measure** (a property of a text block,
   which no tier owns).
2. If it does, whether check D's matcher narrows to the page's **outermost**
   element, or to the three declared maxima by name, or to a `max-w-*` that is
   not one of the measure keywords.
3. Whether the measure comes back to this paragraph when it does. **Nothing
   will remind anyone** — the gate is green now, and a green says nothing about
   a sentence that got wider.

---

## DEF-41-05 — `SkeletonLine` fixes its own radius, so a caller cannot shape a placeholder

**Found:** plan 41-10, task 3, converting `/admin/members`' loading state.
**Owner:** the plan that next needs a placeholder shaped like anything but a
line — or `41-12`, if the phase would rather close it as a contract question.
**Status:** open. Nothing is broken today; one placeholder is the wrong shape.

### The measurement

`SkeletonLine` already carries two opt-outs, and they exist because this exact
collision was measured inside that file: a caller's width or height is detected
and the component's own default stands down, *"because appending the caller's
classes after the component's own works only when the two collide on a utility
Tailwind emits in ascending numeric order."*

**There is no third opt-out for the radius**, and the radius has the same
problem. Measured in the emitted stylesheet on 2026-08-12:

```
byte 21718   .rounded-full{…}      ← the pill radius, written FIRST
byte 21846   .rounded-xl{…}        ← the component's own, written AFTER
```

Same property, same specificity, later rule wins. **A caller that appends a pill
radius to a line placeholder gets the container radius anyway**, and gets no
warning of any kind: it compiles, it renders, and the class is simply inert.

### Where it bit

The members loading state stands in for four status tabs that are 44px pills.
The honest placeholder for a pill is a pill. It is drawn at the container radius
instead, and the class that would have made it a pill was **removed rather than
written**, because a line of code that provably does nothing is worse than the
shape it fails to produce — it reads as a decision to whoever finds it next.

### Why it was not fixed here

`src/components/ui/Skeleton.tsx` belongs to plan 41-08 and is declared by no
plan in this wave. The fix is small and is the same shape the file already
carries twice — detect a radius in the caller's classes, stand the default down
— but adding a third opt-out to a shared primitive from a conversion commit is
the scope creep 41-07 refused for the same reason on `Toast.tsx`.

### What the phase should decide

1. Whether `SkeletonLine` gains a radius opt-out, or whether a placeholder for a
   pill becomes a **fourth export** the way `SkeletonTile` did for a square —
   which is that file's own precedent, and its stated reason was precisely that
   reaching a different shape through the caller's classes *"would depend on
   which of two same-property utilities Tailwind happens to emit last."*
2. Whether the general form is worth a gate: **a primitive that fixes a property
   and lets a caller append the same property silently discards it.** Three
   instances are now recorded — a width, a padding and a radius — and the only
   reason the first was ever found is that somebody finally rendered the
   component.

---

## DEF-41-06 — the shared comment stripper has a fifth shape, and it is a block comment inside a JSX tag

**Found:** plan 41-11, Task 1 — the first run of G5's element scanner.
**Owner:** whichever plan next edits a gate's stripper. `41-12` aggregates the
gates and is the natural place to decide it once.
**Status:** open for the siblings. **G5 already carries the fix**, in its own
copy, because it could not run without it.

### The finding

Every gate in this phase blanks comments with the same line-shape heuristic: a
line counts as a comment when it starts with two slashes, a star, or a block
opener. DEF-41-02 added a fourth shape for the JSX form. **There is a fifth**,
and it is not the JSX form:

A **block comment written inside a JSX opening tag**, indented, whose body lines
start with ordinary prose rather than with a star. The heuristic blanks its
first line and its last line — both start with a recognised opener — and leaves
every sentence between them **live**.

### The evidence — measured on a file in a converted closure

`src/components/media/MediaGrid.tsx:67-72` is exactly that shape: six lines of
prose explaining why a thumbnail's accessible name must not describe the item.
One of those sentences contains an apostrophe.

For a per-line matcher that is harmless — a sentence is not a colour utility.
For **any gate that reads across lines** it is not: G5's scanner walks from an
opening tag to its closing bracket, honouring quotes, and the apostrophe opened
a string that never closed. Measured before the fix:

```
src/components/media/MediaGrid.tsx:65 UNTERMINATED <button
```

The scanner ran to end of file. Every element after that point in that file was
**unscanned, silently** — a narrowing in the one direction that produces a
green. `/gallery` reaches that file, so this was inside a declared surface.

### What G5 does about it, and what it does not

Its stripper carries a **block-comment state**: an opener without its closer on
the same line blanks lines until the closer arrives. That is still a line shape
and not a parse — WR-07 records that a real comment parser written in this
repository was unsound. Its error direction is stated in the file: it can blank
*more* than it should if a line's first characters are a block opener inside a
string, which is why the opener must be at the start of the trimmed line.

**And an unterminated opening tag is now a refusal**, exit 2, not a shrug: a
scanner that has lost sync has not measured what comes after it.

Verified across the whole tree, not only the file that motivated it: with the
fifth shape in place, **180 files under `src/` parse with zero unterminated
tags.**

### What the phase should decide

1. Whether the four sibling gates take the same fifth shape. **None of them is
   known to be wrong today** — they all match per line, so a live prose line is
   simply not a hit — so this is prevention, not a bug report, and it should be
   priced as such.
2. Whether the strippers stop being four copies of one heuristic. Five shapes is
   the point at which *"each gate declares its own"* starts costing more than it
   buys — and this phase has now discovered two of the five shapes the hard way,
   in two different plans.
3. Whether a gate that reads **across lines** is a different class from one that
   reads **within a line**, and should say so at the top of its file. G5 is the
   phase's first cross-line reader, and it is the only one for which this
   finding was fatal rather than cosmetic.

---

## DEF-41-07 — four local defects in the refusal machinery, deferred by decision

**Found during:** round 4's external review (`41-GAP-REVIEW-4.md` CR-03, WR-01,
WR-02, WR-03), grouped by `41-VERIFICATION.md` as **Group B**.
**Status:** open — deliberately not fixed in round 5, which was held to two
items.

### The finding

Four independently-scoped defects, none of which needs a design decision. Each
is a bounded correction to code that already states, in its own docblock or its
own printed refusal, what it is trying to guarantee — and each currently fails
that stated guarantee.

### The four, with how each was established

**1. The existence guard covers one of three branches.**
`neverOpenedReason()` in `scripts/verify-dialogs.mjs` carries its own written
statement of the defect it must not commit: an unguarded membership test turns a
`REMAINING` entry naming a path that does not exist — today a FAILURE — into a
refusal, *"a failure laundered into 'nothing was measured'"*. The guard was added
to the **walk** branch only; the never-measured branch and the **fence** branch
return a reason without testing existence. So a `REMAINING` entry whose path does
not exist but matches a Phase 42 fence glob refuses instead of failing, and the
refusal propagates as *nothing was measured* across the whole sixteen-gate
aggregate.
**Established by a run**, recorded in CR-03: one entry naming a non-existent
scanner component added to `REMAINING` on a disposable copy produced exit 2
rather than a failure. Not re-executed in round 5.

**2. A refusal branch nothing can reach.**
`scripts/verify-conversion.mjs` advertises, in its exit-code header, a refusal
for a render site found outside the frozen window. Derivation over the shipped
code shows an earlier refusal always fires first: by the time control reaches
that branch, either the property count is above zero (so its guard fails) or the
shape matched — and matching the shape requires the window to contain the render
site line, so the site is always inside the window.
**Established by derivation against the shipped code**, recorded as WR-01, with
the review noting an empirical half beside it. Not re-executed in round 5, and
the derivation is the load-bearing half.
The cost is a header that promises a guard the code cannot deliver — the same
class of false header sentence this phase has already corrected twice.

**3. A permitted site is keyed on a line's text, not its position.**
The permitted-site assertion hashes the **trimmed text** of a line and asks
whether that hash is in the frozen set. It has no notion of position. So a
byte-identical copy of an already-permitted line is permitted **wherever it is
put**, including wrapping the focus form — which makes the digest refusal's own
printed instruction false as written: it tells the reader that re-freezing does
not bless a navigation property because the permitted-site assertion runs
independently, and that assertion can in fact be satisfied by placing a
duplicate.
**Established by a run**, recorded in WR-02: on a disposable copy the shell was
split into a wrapper plus an inner component, with the frozen lines and the
focus root byte-identical, and the duplicate was permitted. Not re-executed in
round 5; confirmed this round by direct reading of the shipped assertion.

**4. One typo, two verdicts, depending on the filesystem.**
The guard uses an existence check that, on the case-insensitive volume
`CLAUDE.md` Guardrail 6 names as the house platform, returns true for a path
whose case does not match the file on disk — while the walk's own output is
case-exact. A case-typo therefore lands in the not-in-the-walk branch and
**refuses**; on a case-sensitive volume the same entry is missing and **fails**.
The verdict for one typo depends on which machine ran it, and on the house
machine it is the refusal — the laundering the guard exists to prevent.
**Established by a run on the house platform** (recorded in WR-03) **plus
derivation for the case-sensitive half**, which was not run on a case-sensitive
volume. Not re-executed in round 5.

### Why these were NOT fixed in round 5

Round 5 was held to two items — the shared stripper (Group A, shipped in 41-29)
and the coverage declaration (Group C's declarable half, shipped in 41-30) — and
the reason is not capacity.

**Polishing refusals inside a mechanism whose limit is now known is work that
looks like progress.** Items 1, 3 and 4 all sharpen the *refusal* behaviour of
gates whose reach has just been shown to stop at a file boundary (DEF-41-08).
Sharpening them is worth doing and none of it is hard; doing it in the same
round that discovered the boundary would have produced a longer changelog and
the same unanswered question.

Item 2 is a different case again: it costs nothing at runtime and everything in
trust, because a header that advertises an unreachable guard is a false header
sentence, and this phase has now found three.

### What the phase should decide

1. Whether the four go into one plan or land beside the code they touch when
   `verify-dialogs.mjs` and `verify-conversion.mjs` are next opened.
2. For item 2 specifically — whether the fix is to make the branch reachable or
   to **retire the advertisement**. Those are different answers, and only one of
   them adds code.
3. For item 4 — whether every existence check in this gate family should compare
   against the walk's own case-exact output rather than the filesystem, since
   the defect is a class and not one line.

---

## DEF-41-08 — the clearance reaches the four focus routes from outside the shell; the structural resolution is the owner's, and is routed to 41.1

**Found during:** round 4's external review (`41-GAP-REVIEW-4.md` CR-04),
reproduced independently by `41-VERIFICATION.md` as **Group C**.
**Status:** open — the structural half is **not** this round's to take.

### The fact

Check E reads **one file** for the clearance. A clearance that reaches a focus
route from anywhere else is outside the gate by construction: a route wrapper
above the surface, a constant imported from elsewhere, a stylesheet rule.

The wrappers are not unknown to the walk. The check climbs each ancestor wrapper
and asks it exactly one question — is a declared navigation module reachable from
it. Its own class strings are opened by nothing, and it never enters the set
checks A, B and D read.

**Measured 2026-08-13, reproduced twice on disposable copies.** An ordinary Next
route wrapper above the auth group, carrying the three things the gate exists to
forbid — a leading inline-start clearance drawn from the navigation inset
variable, a raw palette colour, and a container maximum wider than anything the
UI-SPEC declares — reached three of the four focus routes with:

- the printed scanned-file count **unchanged from the clean tree**;
- the route table still printing **no navigation** for all three;
- the run **exiting 0**.

### Why this is not a fifth pattern for the matcher

Four consecutive rounds taught the matcher one more shape and the same defect
moved: round 1 asserted on the constant and it moved to the render site; round 2
asserted on the outer element and it moved to the inner one; round 3 asserted on
the branch as a region and it moved to the branch's shape; round 4 asserted on
the file by digest and it moved to what the digest is computed from — and to a
route the digest was never asked to cover.

The mechanism is a text scanner over one file. The property that matters is what
reaches a route **at render**. No textual mechanism over one file spans that, so
a fifth pattern buys one more round and no more.

### The two resolutions, and which one is the owner's

1. **Declare the limit** — say in the gate's own header that it covers the FILE
   and not the ROUTE, in the fence vocabulary this repository already uses:
   *unmeasured, not approved.*
2. **Make the clearance structurally unable to reach those routes** — for
   instance by moving the navigation clearance to the layout that actually mounts
   the navigation, or by extending the scanned set and the property scan to every
   climbed ancestor of a focus surface.

**Round 5 took (1), in plan 41-30 Task 1**, as the fifth entry in the header's
`WHAT A GREEN DOES NOT MEAN` block. It states the one-file reach, states that a
climbed wrapper is enumerated and opened by nothing, and states that the
difference is a boundary rather than a blessing.

**(2) is the owner's decision, and it is not this round's.** It edits product
files under the auth group and the payment callback. Those paths are
`access-gating` and `ticketing-payments` primary in `meta-gates.md`'s routing
table, and this project requires the owner's validation before a Critical path is
touched — the impact analysis comes first, not the diff.

### Why 41.1

Those surfaces convert in **41.1** anyway. That is where the question is cheapest
to answer — the wrappers are already open on the desk — and where it is most
dangerous to skip, because a conversion that adds or moves a wrapper is exactly
the change this gate cannot see.

### A declaration is not a closure

The header now says the gate does not measure this. It does not say the routes
are correct, and it does not close the gap: it makes the gap visible to a reader
who would otherwise have read a tick as coverage.

**No requirement moved.** All seven of the phase's requirements stayed PARTIAL
across round 5.

### What the phase should decide

1. Which of the two structural forms of (2) — move the clearance to the layout
   that mounts the navigation, or widen the scan to climbed ancestors. The first
   removes the reachability; the second only measures it.
2. Whether the widening, if chosen, is worth its own failure direction: a scan
   over every climbed ancestor reddens correct files the moment a wrapper
   legitimately reserves a column, and a gate that reddens a correct file gets
   switched off.
3. Whether the four focus screens get looked at by a person **before** either
   answer is chosen. `41-CR01-PASS.md` has rows 1-6 measured in a headless
   browser and rows 7-13 `pending`; a headless render is not a device render,
   H41-4 stays `human_needed`, and no amount of gate work substitutes for it.
