# Phase 41.1 — deferred items

Out-of-scope findings measured while executing this phase. Recorded so they are
not re-derived, and **not fixed here**: each is either another phase's or is an
open item with a written reason.

---

## DI-41.1-01 — `DEF-41-01` has a live instance in the shipped stylesheet, and it is not this plan's

**Found:** 2026-08-13, plan 41.1-05, while checking whether that plan's own
SUMMARY had made things worse.

**Measured.** `npm run build`, then a grep of `.next/static/css/`:

```
.\[file\:line\]{file:line}
```

A dead rule — a CSS declaration whose property does not exist — compiled out of
prose somewhere under `.planning/`, where the phrase is used to mean *cite the
file and the line*. It ships to every user. It is **not** produced by any product
file, and it is **not** produced by plan 41.1-05's own artifacts: the stylesheet
built with that plan's SUMMARY in place is byte-identical to the one built
without it (both `5a057cbb659e1b33.css`), while this rule is present in both.

**Why it is recorded and not fixed.** It is one instance of `DEF-41-01`
— Tailwind's source detection scanning `.planning/` — which `41.1-CONTEXT.md`
defers explicitly: *"the change is to what the whole product compiles from, and
its failure direction is silent."* Chasing individual harvested strings closes
none of that; excluding the directory closes all of it, and is a change to the
build with a silent failure direction, which is why it is not taken casually.

**What plan 41.1-05 did instead**, and it is the pattern for any document that
has to quote a class string: it measured its own contribution, found the SUMMARY
had added a second, **un-tiered** rule for the navigation clearance, broke the
token in the prose, rebuilt, and confirmed the stylesheet returned to exactly one
tier-scoped occurrence. The measurement is written into that SUMMARY's opening
note rather than into a commit message, because the next person to quote a
utility in `.planning/` needs it before they do it, not after.

**What would close this properly:** `DEF-41-01`, whole. Nothing here substitutes
for it.

---

## DEF-41.1-24-01 — `verify:touch-targets` reddens on nine correct elements, and it is red at phase exit

**Found by:** plan 41.1-24, the phase's final reconciliation, running the
acceptance criterion `npm run verify`.

**State: `npm run verify` does NOT exit 0.** Recorded as unmet rather than
worked around. Two separate things make it non-green, and only one is a finding:

1. `verify:capabilities` **REFUSES** (exit 2) for want of Supabase credentials.
   That is its honest state in a worktree and it is **not a pass and not a
   failure** — nothing about the capability model was measured. It is closed on
   the main checkout, not here, and credentials were deliberately not copied in.
2. `verify:touch-targets` **FAILS** on nine elements in five files.

**The nine are pre-existing, and not this plan's.** Every one of the five files
was last written in waves 7 and 8 (`AutocompleteTagInput.tsx` by plan 41.1-19,
the four ticket components by 41.1-22, `ui/AutocompleteInput.tsx` by 41.1-19).
This plan's diff on the one file it did open adds a prop, a destructured field
and an attribute, and **touches no class string** — asserted with a diff filtered
to class-bearing lines, which printed nothing.

**They are a gate defect, not a product defect**, by two distinct mechanisms:

- **At least four are `<input type="hidden">`** — `AddTierForm.tsx:137`,
  `TierCard.tsx:178`, and the same shape at `AddDiscountCodeForm.tsx:202` and
  `DiscountCodeCard.tsx:249`. A hidden input renders nothing and can never be a
  touch target. Requiring 44 px of it is a category error, not a threshold that
  is set too tight.
- **The three in `ui/AutocompleteInput.tsx`** (`:162`, `:190`, `:206`) take their
  height from the file's own `OPTION` constant, which carries the unconditional
  44 px minimum at `src/components/ui/AutocompleteInput.tsx:95-96`. The elements
  interpolate it — the gate reads lines and cannot see through a class built by
  concatenation, a blindness its sibling gates print in their own headers. The
  same shape accounts for the two in `AutocompleteTagInput.tsx`.

**Why it is recorded and not fixed here.** The gate's own failure text says *"Fix
the ELEMENT, not this gate. Widening an exemption to clear a red is the tampering
T-41-42 names."* The elements are already correct, so there is nothing to fix on
that side, and editing the gate at the close of a phase — under a single-writer
discipline, on a red this plan did not cause — is the move that discipline
exists to prevent. The fix is a category correction in what the gate counts as a
target, plus the concatenation blindness, and it needs its own plan and its own
proof by mutation.

**Why it matters more than a normal deferral.** This is the shape §0 rule 3 and
D-41-19 name explicitly and that `verify-media-strip.mjs:51-62` records this
repository actually doing: **a gate that reddens on correct code is a gate
somebody switches off.** It is red today, at the moment the phase would be
declared closed, and a person who reads the red as noise will stop reading this
gate at all.

**What would close it:** a plan owning `scripts/verify-touch-targets.mjs` that
(a) excludes non-rendering inputs from the target set, (b) states in the header
what it cannot see through, and (c) proves both by mutation with the mutation
asserted applied before its result is read.
