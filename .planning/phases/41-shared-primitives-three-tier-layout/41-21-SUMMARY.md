---
phase: 41-shared-primitives-three-tier-layout
plan: 21
subsystem: verification-gates
tags: [gap-closure, round-2, wr-05, wr-06, check-e, wrapper-enumeration, false-refusal, resp-02, resp-04]

# Dependency graph
requires:
  - phase: 41-shared-primitives-three-tier-layout
    plan: 17
    provides: "scripts/verify-conversion.mjs — check E, the layout enumeration, the ancestor climb and the untested-extension refusal"
  - phase: 41-shared-primitives-three-tier-layout
    plan: 20
    provides: "scripts/verify-conversion.mjs — E1's read hoisted above every tick, refuse() exiting 1 when a check already failed, FOCUS_BRANCH_RE"
provides:
  - "scripts/verify-conversion.mjs — WRAPPER_BASENAMES, read by BOTH the enumeration under the route root and the directory climb, so a navigation mounted from a template.tsx reddens check E"
  - "scripts/verify-conversion.mjs — NON_ROUTE_WRAPPER_EXTENSIONS: a wrapper-named file at an extension Next could never resolve a route file at is skipped and printed with its reason, not refused on"
  - "scripts/verify-conversion.mjs — FOCUS_ROOT_LITERAL_RE tolerant of a trailing line comment, with the same-line requirement intact"
affects:
  - "41.1 and 41.2 — a template.tsx introduced in either wave is now climbed; if it mounts a navigation over a focus surface the gate fails rather than printing a tick"
  - "verify-all.mjs — two shapes of correct file no longer take the whole suite to VERIFY_REFUSED"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A wrapper enumeration is only as wide as the basenames Next actually wraps with: layout. and template. are one list read by both the enumeration and the climb, so they cannot drift apart"
    - "An exclusion nobody wrote down is the same defect as an enumeration nobody widened — default. is excluded with its reason AND its revisit condition"
    - "Narrowing a refusal to 'not a stylesheet' must not become narrowing it to 'nothing': every narrowing ships with a mutation in the direction that must STILL fire"
    - "A green states what it passed over: skipped wrapper files are printed with the reason each was skipped"
    - "Relaxing a regex tail beats stripping the line: a stripper cannot tell a // inside the literal from one after it, and would hand the regex the fragment the refusal exists to prevent"

key-files:
  created: []
  modified:
    - scripts/verify-conversion.mjs

key-decisions:
  - "`default.` stays OUT of WRAPPER_BASENAMES. A default.tsx is a parallel-route slot fallback, not a wrapper: climbing it would count a sibling slot's imports as a navigation mounted over a surface that never renders it — a red on a correct file, the worse direction. Revisit condition written into the docblock: the first parallel route in this tree, i.e. the first @slot/ directory under src/app."
  - "LAYOUT_EXTENSIONS renamed WRAPPER_EXTENSIONS. The set now governs templates too, and a name that says `layout` over a list that admits `template.` is the lexical mismatch the next reader trips on."
  - "The function name ancestorLayoutFiles was NOT changed, although it now climbs templates. The plan's acceptance criteria name it verbatim; renaming it would have made the criterion unverifiable as written. Its docblock says what it climbs."
  - "`.mdx` is deliberately absent from NON_ROUTE_WRAPPER_EXTENSIONS: Next resolves route files at it whenever pageExtensions says so, so it plausibly is a module and still refuses."
  - "Half 2 relaxed the regex tail rather than stripping the trailing comment — one or the other, not both, as the plan required. Reason in the docblock: a stripper needs its own notion of where a comment begins and cannot distinguish a // inside the double-quoted literal, so it could truncate the literal and change the value read."

requirements-completed: []

# Metrics
duration: ~40min
completed: 2026-08-12
tasks: 2
---

# Phase 41 Plan 21: the enumeration learns the basename Next also wraps with, and two refusals stop firing on correct code

**WR-05 was a hole in the very enumeration check E depends on.** The gate was
careful about extensions and blind to `template.tsx`, which Next renders around
a page in the same position a layout occupies. A `src/app/(auth)/template.tsx`
mounting a navigation left all four focus surfaces reported navigation-free, E2
found agreement, and the tick printed — the green-producing direction the
surrounding code is built to refuse, reached through a filename the filter did
not know.

**WR-06 was the opposite failure, twice.** Two shapes of *correct* file took the
whole conversion gate to exit 2, and through `verify-all.mjs` that is
`VERIFY_REFUSED` for the entire suite.

**Nothing here is an observation of a screen.** RESP-02 and RESP-04 stay
PARTIAL and are not ticked. H41-6a — filters and navigation visible without
opening a menu from tablet width up — is unobserved, and the thirteen `pending`
rows of `41-CR01-PASS.md` remain owed in full.

## The trigger each mutation used

Round 1 of this gap closure shipped two plans whose mutation proofs passed
without touching what their gate existed to catch. The column that matters is
**site mutated**: a proof whose site does not match its claim proves nothing.

| # | Trigger, in the gate's own words | Site mutated | Direction it proves | Exit BEFORE | Exit AFTER | Restored |
|---|---|---|---|---|---|---|
| **1** | *"A layout is where three of the eight declared surfaces get their navigation, and a walk that skips one reports those surfaces as navigation-free — which is a narrowing in the direction that prints a tick"* — the refusal's own reason text, WR-05's subject | **a real `src/app/(auth)/template.tsx`**, in a real route group, at the position Next wraps from — importing `@/components/layout/AppNav` by the exact path `NAV_MODULES` declares, rendering it and `children`, and carrying **no class string at all** | must FIRE | **0** — `✓ E`, `CONVERSION_OK`, wrapper list still `2`, and `/login`, `/register`, `/set-password` all in the `none` column while a navigation wrapped them. The defect **observed**, not quoted | **1** — `✗ E  3 focus surface(s) mount a navigation the focus form reserves nothing for`, all three routes named `via src/app/(auth)/template.tsx`, and the template listed among the **3** wrappers found | **0**, five ticks, wrapper list back to **2** |
| **2** | *"a basename under the route root beginning with a wrapper prefix and carrying an extension the ancestor walk does not test"* — WR-06 half 1, a **correct** file | **a real `src/app/layout.module.css`** holding one CSS comment — the standard Next name for a layout's CSS module | must STOP firing | **2** — FATAL naming it, "Nothing was measured", the whole suite refused | **0** — five ticks, and the file printed under the wrapper list as `skipped as not a route module : 1` with its reason | **0** |
| **3** | the same refusal, opposite direction: an extension in **neither** list, which plausibly **is** a module | **a real `src/app/layout.mts`** holding one exported constant | must STILL FIRE | *(n/a — the skip list did not exist)* | **2** — FATAL naming `src/app/layout.mts` and printing both lists, so a reader sees which one it failed to be on. **Without this direction half 1 would be a hole dressed as a fix** | **0** |
| **4** | *"a trailing comment on the `FOCUS_ROOT` line … refuses with 'not as a double-quoted literal closing on that line'"* — WR-06 half 2 | **`src/components/ui/PageShell.tsx`'s `FOCUS_ROOT` line**, matched by **text, not by line number** (41-19 moved it), with a **prose-only** trailing `//` comment — no utility, no bracketed value, nothing Tailwind could compile (DEF-41-01) | must STOP firing | **2** — FATAL quoting the line verbatim | **0**, `✓ E`, and the printed `FOCUS_ROOT = "…"` **byte-identical** to the value printed without the comment (`cmp` of the two report lines: identical) | byte-for-byte; `shasum` unchanged, `git diff HEAD` **0 lines** |
| **5** | the same regex, negative direction: *"A focus root spread over several lines … is not a thing this gate can read"* | the same declaration, with the literal continued onto a following line | must STILL FIRE | *(n/a)* | **2** — the same-line requirement was **not** relaxed along with the comment tolerance | byte-for-byte, `git diff HEAD` empty |

**Every mutation was asserted present — by `ls`, by `grep -c`, or by printing
the mutated line — before its result was read, and asserted absent afterwards.**
That is not ceremony: wave 2 of this round caught a `perl` substitution that
silently did not apply, and had the result been read first the run would have
been attributed to a lever that was not there.

**The mutation file for trigger 1 lived under `(auth)`, which is
`access-gating` primary.** It was created and deleted inside task 1, never
committed, and its absence asserted rather than assumed:
`git status --porcelain` carries no path under `src/app/`, and
`find src/app -name "template.*" -o -name "layout.module.css" -o -name "layout.mts"`
returns nothing. `npm run build` was **not** run while any probe existed.

## What was built

### Task 1 — the enumeration climbs every basename Next wraps a page with (commit `50acd18`)

`LAYOUT_BASENAME_PREFIX` became **`WRAPPER_BASENAMES = ['layout.', 'template.']`**,
read at both sites the single prefix was read at:

| Site | Before | After |
|---|---|---|
| the enumeration under the route root | every basename starting `layout.` | every basename starting with any entry in `WRAPPER_BASENAMES` |
| `ancestorLayoutFiles`'s directory climb | `${dir}/layout${ext}` | every basename × every extension |

The untested-extension refusal was **kept over the whole widened set** and its
reason text now names it. The report says `wrapper files under src/app` and
prints the basenames it climbed, so a reader can see that a `template.tsx` was
searched for — and, when one exists, that it was found.

**`default.` is excluded by a written decision, not by omission.** A
`default.tsx` is a parallel-route slot fallback — what Next renders *into* a
named slot when that slot has no match for the current URL — not a wrapper
around the page. Climbing it would let a sibling slot's imports be counted as a
navigation mounted over a surface that never renders it: a red on a correct
file, which is the worse direction and the one that has bitten seven times in
this phase. **The revisit condition is named so it is checkable rather than
remembered: the first parallel route in this tree**, i.e. the first `@slot/`
directory under `src/app`. Measured 2026-08-12: none exists, and
`find src/app -name "default.*"` returns nothing, so the exclusion costs
nothing today.

### Task 2 — two refusals stop firing on correct files, without disarming either (commit `cf9b095`)

**Half 1.** `NON_ROUTE_WRAPPER_EXTENSIONS` declares, **with a reason each**, the
extensions at which Next could never resolve a route file: `.css`, `.scss`,
`.sass`, `.less`, `.md`, `.orig`, `.rej`, `.bak`. A wrapper-named file carrying
one is skipped and **printed under the wrapper list with its reason**, so a
green states what it passed over rather than going quiet about it. Anything in
neither list still refuses, and the refusal now prints **both** lists so a
reader sees which one the file failed to be on, plus what a legitimate change
does: join `WRAPPER_EXTENSIONS` and be climbed, or join
`NON_ROUTE_WRAPPER_EXTENSIONS` carrying the reason it is not a module.

**Half 2.** `FOCUS_ROOT_LITERAL_RE`'s tail became `\s*;?\s*(?:\/\/.*)?$`. The
anchor was relaxed **rather than** the comment stripped — the plan required one
or the other, not both — and the docblock says which and why: a stripper would
run before the regex with its own notion of where a comment begins, could not
tell a `//` inside the double-quoted literal from one after it, and truncating
there would hand the regex a **fragment**, which is the exact failure the
refusal beneath it exists to prevent. The capture group stays bounded by the
same two quotes, so the literal read is byte-for-byte the literal. **The
same-line requirement was not relaxed**, and trigger 5 proves it.

## Verification

**There is no test runner for the product** (`CLAUDE.md` Guardrail 1 — no
`test` script, no `*.test.*`, no `*.spec.*`). Nothing below is a claim that
tests pass.

| Check | Result |
|---|---|
| `node scripts/verify-conversion.mjs` on the LIVE repository, every probe reverted | **exit 0** — `✓ A`…`✓ E`, `CONVERSION_OK — all five checks passed over 8 declared surface(s), 53 file(s) scanned` |
| the wrapper list on the live tree | **2** — `src/app/(admin)/admin/(work)/layout.tsx`, `src/app/layout.tsx`; `skipped as not a route module : 0` |
| `npm run build` (Next's typecheck gate), every probe reverted | **exit 0** |
| `git diff HEAD -- src/components/ui/PageShell.tsx` | **empty** after both of its mutation cycles; `shasum` back to `c40cb35f5d9bad2c0a50f39faf2cd3c1953098b1` |
| `git status --porcelain` at the end of every cycle | only `scripts/verify-conversion.mjs`, never a product file |
| `find src/app -name "template.*" -o -name "layout.module.css" -o -name "layout.mts"` | **nothing** |
| `grep -v '^ \*' … \| grep -c 'LAYOUT_BASENAME_PREFIX'` | **0** — the old prefix is gone from code and from comments alike |
| `WRAPPER_BASENAMES` use sites outside comments | **5** — declaration, the enumeration filter, the refusal text, the climb, the report line. The two the criterion asks for are the enumeration (`:478` of the comment-stripped view) and the climb (`:684`) |
| the `WRAPPER_BASENAMES` docblock | contains `default.` and names the revisit condition — *"the first parallel route in this tree … the first `@slot/` directory under `src/app`"* |
| first `failures.push(` line | **1485** |
| `refuse(` call-site lines | 982…1345, **all below 1485**, plus **1600** — the `ORPHANS_DECLARED` duplicate, unmoved (see the deviation below) |

**`npm run verify` — aggregate exit 2, on a worktree holding no `.env.local`.**
14 passed, **0 FAILED**, 1 REFUSED (`verify:capabilities`, whose stderr names
the missing environment variables), 1 not run (`verify:redirects`, needs a
running dev server). `verify:conversion` reported `0 passed`. Verdict line,
verbatim:

```
VERIFY_REFUSED — 1 gate(s) could not measure: verify:capabilities
```

**Identical to the baseline recorded in `41-17-SUMMARY.md` and re-recorded in
`41-20-SUMMARY.md`.** A refusal is not a failure and is not a pass; this one is
the command working correctly on a machine without credentials, and it is a
property of the environment, not of this change.

## Deviations from Plan

### 1. [Rule 3 — blocking] Task 2's first acceptance criterion, re-stated in the form that is coherent

**Found during:** Task 2, final assertions.

**Issue:** The criterion demands *every* `refuse(` call-site line number be
lower than the first `failures.push(`. **That is the same contradiction 41-20
recorded as its deviation 2**, and it is still not satisfiable: the
`ORPHANS_DECLARED` duplicate refusal needs check C's data and is raised between
check B's verdict and check C's. If every refusal preceded every tick,
`failures` would be empty at every call site and 41-20's exit-1 rule would be a
gate nothing can reach — the decoration `ai-engineering.md`'s *«un gate deve
poter fallire»* forbids absolutely.

**Fix:** none needed, and none applied. **This plan moves no `refuse(` call site
and adds none**, so the invariant 41-20 established holds unchanged: every
check-E refusal precedes every tick (all such sites ≤ 1345 < 1485), and the one
that structurally cannot be hoisted stays at 1600. Re-stated here rather than
ticked silently, because a criterion that reads as satisfied and is not is how
the next reader "tidies" the one refusal that keeps the rule reachable.

### 2. [Rule 2 — missing critical] `LAYOUT_EXTENSIONS` renamed with the set it governs

**Found during:** Task 1.

**Issue:** The plan named only `LAYOUT_BASENAME_PREFIX` for replacement. But the
extension list is now applied to `template.*` as well, and it is quoted inside
the refusal text that tells a reader what to do next. A list named `LAYOUT_…`
sitting over a set that admits `template.` is the lexical mismatch `CLAUDE.md`
principle 8 names, on a line whose whole job is to be legible under a FATAL.

**Fix:** renamed to `WRAPPER_EXTENSIONS`, including in the refusal's instruction
text. `ancestorLayoutFiles` itself was **not** renamed — the plan's acceptance
criteria name that function verbatim, and renaming it would have made the
criterion unverifiable as written. Its docblock now says what it climbs.

**Files modified:** `scripts/verify-conversion.mjs`.

### 3. [Rule 3 — blocking] Half 1 was written into task 1 first, and split back out

**Found during:** Task 1, mid-edit.

**Issue:** `NON_ROUTE_WRAPPER_EXTENSIONS` was drafted in the same edit that
widened the enumeration. That would have made **trigger 2 unobservable**: with
the skip list already present, `src/app/layout.module.css` could never have been
seen taking the pre-task gate to exit 2, and the "recorded, not quoted" half of
the mutation contract would have been lost.

**Fix:** reverted out of task 1 and re-applied in task 2, after trigger 2's
pre-fix exit 2 had been observed and recorded. The two commits are separable,
each with its own before/after pair.

**No authentication gate was hit. No package was installed** (T-41-SC:
`package.json` unchanged). **No product file is modified by either commit** —
`git diff --name-only` for this plan is `scripts/verify-conversion.mjs` alone,
plus this document.

## What this does not close

**RESP-02 and RESP-04 stay PARTIAL and are not ticked here.** RESP-04's runtime
half — filters and navigation visible without opening a menu from tablet width
up — is **H41-6a and is unobserved**. `41-CR01-PASS.md` is still a pending
procedure with all thirteen rows `pending`, and H41-1 remains owed on all eight
converted surfaces. This plan opened no viewport and measured no pixel.

**The secondary hole 41-20 named is still open, and was not touched here.**
`MIN_HEIGHT_RE` and `CENTRING_RE` are satisfied by forms that do not produce
what assertion 2 exists to defend (GAP-REVIEW CR-02, closing paragraph).
Deliberately neither closed nor widened, and named again so it is not lost.

**GAP-CR-01 — `verify-all.mjs`'s reconciliation — is not this plan's subject**
and is unchanged by it.

**What the widened enumeration does NOT do.** It searches more wrapper
basenames; it does not change how a mount is detected once one is found. A
navigation reaching a surface through a mechanism that is not an import — a
dynamic specifier, a string built at runtime — is still invisible to this gate,
as it was before.

## Known Stubs

None. No hardcoded empty value, no placeholder text, no unwired component. The
change adds one list, one skip list, two report lines and a regex tail to a
verification script, and widens one climb.

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change at a
trust boundary was introduced. The script opens no connection, reads no
environment variable, writes no artefact, and prints only paths, line numbers
and source lines from files already committed to a public repository.

**T-41-W1 is recorded as mitigated by assertion rather than by intention.** A
`template.tsx` under `src/app/(auth)/` is a real route wrapper: left behind, it
would render around `/login`, `/register` and `/set-password` on every request.
It mounted an existing navigation module and nothing else — no auth decision, no
data read, no role branch — was created and deleted inside task 1, and its
absence is asserted by `git status --porcelain` carrying no path under
`src/app/` and by `find` returning nothing.

**T-41-W2 likewise.** `src/app/layout.module.css` (one CSS comment) and
`src/app/layout.mts` (one exported constant) are inert by construction and were
imported by nothing, so neither could reach a bundle even while it existed. Both
deleted, both absences asserted.

**T-41-W3 — a weakened gate shipping a regression unnoticed — is the one this
plan spent its budget on.** Both halves of task 2 narrow a refusal, which is the
dangerous direction, so each ships with a mutation in the direction that must
**still** fire: `layout.mts` for half 1, the multi-line literal for half 2.

**T-41-W5 stands as accepted.** The mutation window was a handful of gate runs
on a developer machine with no server running; the transient wrapper reached no
request.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 | `50acd18` | `fix(41-21)` — the enumeration climbs every basename Next wraps a page with |
| 2 | `cf9b095` | `fix(41-21)` — two refusals stop firing on correct files, without disarming either |

## Self-Check: PASSED

- `scripts/verify-conversion.mjs` — FOUND
- `.planning/phases/41-shared-primitives-three-tier-layout/41-21-SUMMARY.md` — FOUND
- commit `50acd18` — FOUND
- commit `cf9b095` — FOUND
- `node scripts/verify-conversion.mjs` and `npm run build` re-run **after** this
  document was written — DEF-41-01: Tailwind scans `.planning/`, and this
  document names class-string *properties* in prose but spells no utility, for
  the same reason `PageShell.tsx`'s own docblock does not
