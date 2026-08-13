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
