---
phase: 41-shared-primitives-three-tier-layout
verified: 2026-08-12T19:40:00Z
status: gaps_found
score: 7/10 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/10
  gaps_closed:
    - "CR-01 — PageShell width=\"focus\" no longer reserves navigation clearance on the four navigation-free surfaces (/login, /register, /set-password, /payment/callback). Confirmed live: src/components/ui/PageShell.tsx:108,136 — FOCUS_ROOT carries neither --nav-inset-inline-start nor --nav-inset-block-end, and the default/wide branch is unchanged (2 reads of var(--nav-inset remain, confirmed by grep). The regression is closed IN CODE."
  gaps_remaining:
    - "GAP-CR-01 (new, found by this round's code review and independently reproduced) — scripts/verify-all.mjs's reconciliation, the whole stated purpose of plan 41-14, is STILL an identity and cannot fail on the scenario its own docblock names. Confirmed by direct mutation."
    - "GAP-CR-02 (new, found by this round's code review and independently reproduced) — scripts/verify-conversion.mjs check E1, the whole stated purpose of plan 41-17, never asserts that PageShell's focus branch renders the FOCUS_ROOT literal it reads. CR-01 can be reintroduced directly in the JSX and check E stays GREEN. Confirmed by direct mutation: node scripts/verify-conversion.mjs exits 0 with '✓ E' on a tree carrying CR-01 reintroduced at PageShell.tsx:136."
  regressions: []
gaps:
  - truth: "The reconciliation in scripts/verify-all.mjs — the thing plan 41-14 exists to fix, and the thing its own docblock calls 'the whole point of the file' — can actually fail on the scenario it documents as its trigger"
    status: failed
    reason: "The partition at scripts/verify-all.mjs:282-284 is exhaustive over state === \"runnable\" versus its complement, crossed with optional. ANY fourth state value — the exact scenario the file's own docblock (:104-113) and 41-14-SUMMARY.md name as the trigger — lands deterministically in absentRequired or absentOptional regardless of what the state string actually says. measuredOrExplained is therefore always a superset of declared and unaccounted can never be non-empty. Independently reproduced: injected state:\"deferred\" for verify:tokens (the exact scenario named in the docblock) into a temporary copy run from scripts/ (deleted after, git status clean) — the entry fell into the pre-existing absentRequired branch, printed 'verify:tokens — MISSING, and this is a failure, not an omission', and exited 1 through the MISSING path that predates this plan. The new refuse()-driven reconciliation at :402-410 never ran; no FATAL, no mention of 'unaccounted'. This matches GAP-REVIEW.md CR-01 exactly. 41-14-SUMMARY.md's own mutation proof used a DIFFERENT mechanism — an ad hoc name-based exclusion added to the runnable filter (`&& p.name !== \"verify:tokens\"`) that removes an entry from all three buckets without changing its state — which does trip the new refusal, but is not the scenario the header claims to guard against and does not appear reachable by any real code change to the partition."
    artifacts:
      - path: "scripts/verify-all.mjs"
        issue: "lines 282-284: partition is exhaustive over state==='runnable' vs not, so unaccounted (:402) can never be non-empty via the documented trigger. The exit-code half of WR-03 is closed (refuse() now exists); the reachability half is not."
    missing:
      - "Make the partition non-exhaustive, per GAP-REVIEW.md's suggested fix: key absentRequired/absentOptional on an explicit allow-list of known non-runnable states (e.g. ABSENT_STATES = new Set([\"absent\",\"unregistered\"])) rather than on the complement of \"runnable\", so a genuinely novel state falls through all three buckets and unaccounted actually catches it"
      - "Re-run the exact scenario the docblock names (a fourth plan state) as the mutation proof, not a substitute mechanism, and confirm exit code moves from 1 (MISSING path) to 2 (the new refusal) before calling this closed"
  - truth: "check E1 in scripts/verify-conversion.mjs — the whole stated purpose of plan 41-17 ('the check CR-01 did not have') — prevents CR-01 from being silently reintroduced"
    status: failed
    reason: "E1 (scripts/verify-conversion.mjs:1515-1588) reads the FOCUS_ROOT constant's declaration by name and asserts three things about that LITERAL: it contains neither nav-inset property, it contains a height+centring utility, and the shell reads both properties elsewhere. It never asserts that the JSX render site (PageShell.tsx:136, <div className={FOCUS_ROOT}>) actually assigns exactly that identifier as the whole of its className. Independently reproduced: mutated the render site only (left the FOCUS_ROOT constant untouched) to `<div className={\\`${FOCUS_ROOT} ps-[calc(var(--nav-inset-inline-start)+1.5rem)] pb-[calc(var(--nav-inset-block-end)+1rem)]\\`}>` — the full CR-01 defect (248px leading padding vs 24px trailing, card 112px right of centre at >=768px) — and ran the SHIPPED, UNMODIFIED scripts/verify-conversion.mjs. Result: exit 0, '✓ E  the focus root reserves neither navigation property while src/components/ui/PageShell.tsx still reads both elsewhere...', and the report's own 'read at line(s)' output for the two properties now includes line 136 — the reintroduced line — because assertion 3 ('reads both properties elsewhere') is satisfied BY the very reintroduction it should have caught, exactly as GAP-REVIEW.md CR-02 predicted. Mutation reverted; git status --porcelain confirmed clean; re-run on the restored tree also exits 0. This is the second time in this phase a gate's own report line has fed the assertion meant to catch the defect it names (parallel to WR-03's identity)."
    artifacts:
      - path: "scripts/verify-conversion.mjs"
        issue: "lines 1517-1588 (check E1): reads and asserts against the FOCUS_ROOT constant declaration only; nothing ties that assertion to the JSX className expression at PageShell.tsx:136 that actually renders. A second, unguarded className fragment appended at the render site restores CR-01 in full while E1 stays green."
      - path: "src/components/ui/PageShell.tsx"
        issue: "line 136 is the unguarded site — correct as shipped today, but its correctness is enforced by nothing mechanical"
    missing:
      - "Assert the render site, not only the declaration — per GAP-REVIEW.md's suggested fix: require that the focus branch's className expression is exactly `{FOCUS_ROOT}` (a regex anchored on `className={FOCUS_ROOT}` with nothing else interpolated), refusing if the branch's className is assembled from the constant plus anything else"
      - "Re-run the exact reintroduction mutation performed in this verification (append the two nav-inset expressions to the render-site className, leave FOCUS_ROOT itself untouched) and confirm it goes red before calling check E closed"
deferred: []
---

# Phase 41: Shared Primitives & Three-Tier Layout Verification Report

**Phase Goal:** The shared layer exists — one implementation per recurring pattern, three tiers, finger-sized targets — and is proven on its first eight whole surfaces. The remaining surfaces convert in 41.1 and 41.2 onto this layer, unchanged.
**Verified:** 2026-08-12T19:40:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (plans 41-13…41-17), following the previous round's single blocking gap (CR-01)

## What changed since the last round, in one paragraph

The previous round's one blocking gap — CR-01, `PageShell width="focus"` reserving navigation
clearance on four navigation-free surfaces — **is closed in code**, confirmed by direct source
read (`src/components/ui/PageShell.tsx:108,136`) and by re-running `verify-conversion.mjs`'s own
surface enumeration. That fix is real, presentational, and touches nothing under `src/app/`. But
the gap-closure wave also produced two of its own plans whose entire stated purpose was to make a
previously-decorative check able to fail — `verify-all.mjs`'s reconciliation (41-14) and
`verify-conversion.mjs` check E (41-17) — and this round's own code review found, and this
verification independently reproduced by running mutated code rather than reading source, that
**both of those closure plans failed at the one thing each was written to do.** The reconciliation
still cannot fail on its documented trigger; check E does not see CR-01 reintroduced at the render
site. Two more, unrelated warnings (WR-04 touch-target exemption, WR-05 dialog rung matcher) were
genuinely closed and proven by mutation in this same wave (plans 41-15, 41-16) — those are not in
question here.

## CR-01 — closed in code, and separately: is it guarded? (constraint 8)

**Closed in code: YES.** `src/components/ui/PageShell.tsx:108` — `const FOCUS_ROOT = "flex
min-h-dvh items-center justify-center p-6"` — contains neither `--nav-inset-inline-start` nor
`--nav-inset-block-end`. `grep -c 'var(--nav-inset' src/components/ui/PageShell.tsx` → 2 (both in
the default/wide branch, lines 143 and 147 — unchanged). `git diff --name-only` for plan 41-13's
commit (`207b541`) touches exactly one file under `src/`. The four consuming pages
(`/login`, `/register`, `/set-password`, `/payment/callback`) have zero changed lines. `npm run
build` exits 0.

**Guarded by a gate: NO — confirmed by this round's own mutation, not by trusting either SUMMARY.**
Check E1 in `scripts/verify-conversion.mjs` (added by plan 41-17, commit `4603834`) reads the
`FOCUS_ROOT` constant's declaration, never the JSX expression at line 136 that renders it. Adding
the exact CR-01 defect back at the render site (`className={\`${FOCUS_ROOT}
ps-[calc(var(--nav-inset-inline-start)+1.5rem)] pb-[calc(var(--nav-inset-block-end)+1rem)]\`}`,
`FOCUS_ROOT` itself untouched) and running the shipped, unmodified gate produces exit 0 and `✓ E`.
This was performed on a temporary in-place mutation of `src/components/ui/PageShell.tsx`, reverted
immediately; `git status --porcelain` was empty before and after. **These are two different
questions and this round answered them differently: the defect is gone from the tree today, but
nothing in the repository would notice it coming back through the one door the new check was
built to close.**

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One implementation per recurring pattern exists | ✓ VERIFIED (unchanged from previous round) | `src/components/ui/{Button,Chip,Input,Card,PageShell,Typography,Dialog,DataTable,Checkbox,Skeleton}.tsx` present, exported, wired — re-confirmed by re-running `npm run build` (exit 0) and `node scripts/verify-conversion.mjs` (exit 0, checks A–D pass with identical counts to the pre-closure round) |
| 2 | Roadmap criterion 1 — no surface shows the pattern until whole-converted, checked mechanically | ✓ VERIFIED | `node scripts/verify-conversion.mjs` exit 0 on this tree (re-run 2026-08-12, post-closure), now with a fifth check (E) in addition to A–D |
| 3 | Roadmap criterion 2 (DS-08) — dialog opens as sheet/window, closes with Escape | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `Dialog.tsx:251` `showModal()`; `verify-dialogs.mjs` exit 0, now with a widened rung matcher (plan 41-16) proven by mutation. A2 (scroll lock) still unverified — `41-RELEASE-PASS.md` H41-2 unchanged since the last round |
| 4 | Roadmap criterion 3 (DS-09) — dense table reads as cards on phone | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `DataTable.tsx:391` `md:hidden`; `verify-tables.mjs` exit 0. H41-3 unobserved, unchanged since last round |
| 5 | Roadmap criterion 4 (RESP-01, RESP-02, RESP-04) — every converted surface workable phone/tablet/desktop | ⚠️ PARTIALLY IMPROVED — the confirmed CODE regression (CR-01) is closed; the confirmed GATE regression (unguarded) is new | The four surfaces' code no longer reserves clearance they don't use — a genuine improvement over the previous round's ✗ FAILED. But the mechanism meant to prevent this class of defect from recurring silently does not do so (GAP-CR-02), and the human observation that would independently catch either state (H41-1 / `41-CR01-PASS.md`) remains fully unmade — 13 rows, all `pending`. RESP-01/RESP-02 remain PARTIAL exactly as REQUIREMENTS.md already declares; RESP-01 closes only after 41.2 |
| 6 | Roadmap criterion 5 (RESP-03) — touch targets finger-sized, large touch screens included | ? UNCERTAIN — class-string check only, no device ever used (unchanged, though the check itself narrowed and improved) | `verify-touch-targets.mjs` exit 0; exemption 2a narrowed from a file-wide blanket to 10 named elements (plan 41-15), proven by mutation to redden an undeclared raw element it previously would have forgiven. H41-4 still `human_needed`, still not ticked |
| 7 | The goal's own claim — "proven on its first eight whole surfaces" | ✗ NOT MET as a human-observed fact (owed, not falsified — unchanged) | Zero of H41-1…H41-6 carry an itemised observation; `41-RELEASE-PASS.md`'s single-word `approved` is unchanged by this wave. `41-CR01-PASS.md` adds 13 further pending rows, also unwalked |
| 8 | Exactly eight surfaces declared converted | ✓ VERIFIED (unchanged) | `conversion-manifest.mjs` `CONVERTED.length === 8`, re-confirmed |
| 9 | One command runs every gate and reports refusal distinctly from failure | ✓ VERIFIED, mechanism improved but its central claim ("cannot fail" reconciliation) is now KNOWN NOT TO HOLD | `npm run verify` exit 0 on this checkout (credentialed): 15 passed, 0 failed, 1 not-run, 16 accounted for. **But** the reconciliation `verify-all.mjs` added specifically to make an unreachable check reachable (plan 41-14) is itself unreachable on its documented trigger — see gap GAP-CR-01. The aggregate still correctly reports pass/fail/refuse today; the new safety net inside it does not do what its own docblock says |
| 10 | The remaining ~26 conversion units are explicitly deferred to 41.1/41.2 | ✓ VERIFIED (unchanged) | `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md:251-257` |

**Score:** 7/10 truths at least partially improved or held; 2 truths (5, 9) carry a newly-discovered, independently-reproduced defect in the very mechanism meant to guard them, and are scored as gaps below; 4 truths remain UNCERTAIN pending human observation exactly as before (3, 4, 6, 7).

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/components/ui/PageShell.tsx` | focus form reserves no navigation clearance | ✓ VERIFIED, gap closed in code | `:108` `FOCUS_ROOT` contains neither nav-inset property; `:136` is the unguarded render site (see gap) |
| `scripts/verify-conversion.mjs` | check E — width agrees with mounted navigation | ⚠️ PRESENT BUT DOES NOT GUARD THE STATED DEFECT | `:1515-1588` (E1) reads the constant declaration only, never the render site; `:1590-1592` (E2) correctly detects a surface/navigation mismatch (independently unverified in this round but not part of either critical finding) |
| `scripts/verify-all.mjs` | reconciliation that can fail | ⚠️ PRESENT BUT UNREACHABLE ON ITS DOCUMENTED TRIGGER | `:389-410`; exit-code half fixed (`refuse()` exists), reachability half not (see gap) |
| `.planning/phases/41-.../41-CR01-PASS.md` | pending procedure, 13 rows | ✓ VERIFIED | present, all 13 rows `pending`, none upgraded |
| `scripts/verify-touch-targets.mjs` | narrower, proven exemption | ✓ VERIFIED, genuinely improved | `PRIMITIVE_RAW_ELEMENTS`, 10 declared entries, proven by mutation (plan 41-15, cycle A) to redden an undeclared element |
| `scripts/verify-dialogs.mjs` | rung matched as a family, Phase 42 fence | ✓ VERIFIED, genuinely improved | `OVERLAY_PARTS`/`RUNG_FAMILY` widened, `PHASE_42_EXEMPT_PATHS` cross-checked against the manifest, proven by mutation (plan 41-16, cycles A–C) |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `PageShell.tsx` (focus, declaration) | `globals.css` | `--nav-inset-*` absent from `FOCUS_ROOT` | ✓ WIRED | confirmed by source read and by check E1's own report |
| `PageShell.tsx` (focus, RENDER SITE) | check E1 | assertion that the render site equals the declaration | ✗ NOT WIRED — this is the gap | independently reproduced: the render site can diverge from the declaration and E1 does not notice |
| `scripts/verify-all.mjs` reconciliation | a fourth `plan` state | `refuse()` on `unaccounted` | ✗ NOT WIRED — this is the gap | independently reproduced: a fourth state is caught by the pre-existing MISSING/absentRequired path, never reaches the new code |
| `scripts/verify-conversion.mjs` E2 | ancestor layouts | closure walk including `(work)/layout.tsx` | ✓ WIRED (per 41-17-SUMMARY.md's own table, not independently re-run in this round — lower priority than the two criticals; no evidence of a defect found or claimed here) | `/gallery` via own closure, three `/admin/*` via `(work)/layout.tsx` — table reproduced in 41-17-SUMMARY.md |

### Data-Flow Trace (Level 4)

Not applicable in the usual sense — this phase's artifacts are layout primitives and verification
scripts, not data-rendering components. The relevant trace for this round is the gate-to-defect
trace performed above (CR-01 → check E1 → render site), which is the substance of GAP-CR-02.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| `npm run build` typechecks and compiles | `npm run build` | exit 0 | ✓ PASS |
| `npm run verify` aggregate on this (credentialed) checkout | `npm run verify` | exit 0 — 15 passed, 0 failed, 1 not-run, 16 accounted for | ✓ PASS |
| CR-01 closed in code | direct source read `PageShell.tsx:108,136` + `grep -c 'var(--nav-inset'` = 2 | confirmed clean | ✓ PASS |
| `verify-all.mjs` reconciliation fails on its documented trigger (a fourth `plan` state) | injected `state:"deferred"` for `verify:tokens` into a temp copy in `scripts/`, ran it, reverted, confirmed `git status` clean | fell into pre-existing MISSING path, exit 1, no `FATAL`, no `unaccounted` — the new code never ran | ✗ FAIL — reproduces GAP-CR-01 |
| `verify-conversion.mjs` check E1 catches CR-01 reintroduced at the render site | mutated `PageShell.tsx:136` in place (left `FOCUS_ROOT` untouched), ran the shipped gate, reverted, confirmed `git status` clean | exit 0, `✓ E`, the mutated line even counted as one of the "reads elsewhere" that satisfies assertion 3 | ✗ FAIL — reproduces GAP-CR-02 |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist and none are declared in any PLAN/SUMMARY for the
closure plans. **Step 7c: SKIPPED (no probes declared or discovered)** — unchanged from the
previous round.

### Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| DS-07 | PARTIAL, as declared — unchanged | REQUIREMENTS.md:251 unchecked |
| DS-08 | PARTIAL — unchanged | REQUIREMENTS.md:252 unchecked; the check underneath it (`verify-dialogs.mjs`) genuinely improved this wave (widened rung matcher) but the requirement's runtime half is still unobserved |
| DS-09 | PARTIAL — unchanged | REQUIREMENTS.md:253 unchecked |
| RESP-01 | PARTIAL, and the confirmed 4-surface CODE regression from the last round is closed; the gate meant to keep it closed is not load-bearing | REQUIREMENTS.md:254 unchecked, "closes only after 41.2" |
| RESP-02 | PARTIAL, same disposition as RESP-01 | REQUIREMENTS.md:255 unchecked |
| RESP-03 | PARTIAL, human evidence still owed, gate genuinely narrowed this wave | REQUIREMENTS.md:256 unchecked; H41-4 not ticked |
| RESP-04 | PARTIAL, code sound, unobserved — unchanged | REQUIREMENTS.md:257 unchecked; H41-6a not ticked |

All seven requirement IDs remain PARTIAL, matching the task's stated expectation. No orphaned
requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `scripts/verify-all.mjs` | 282-284, 389-410 | Reconciliation added specifically to close a "check that cannot fail" finding is itself unreachable on the scenario its own docblock names as the trigger | 🛑 Blocker | GAP-CR-01. Independently reproduced by mutation in this verification, not merely cited from the code review |
| `scripts/verify-conversion.mjs` | 1517-1588 | Check E1, written specifically to guard against CR-01 recurring, asserts against a constant's declaration and never against the JSX expression that renders it — the exact class of defect (declared-but-not-rendered) the phase has already paid for once (Skeleton.tsx, unimported) reappears one level up, in a gate instead of a primitive | 🛑 Blocker | GAP-CR-02. Independently reproduced by mutation in this verification: CR-01 fully reintroduced at the render site, gate stays green |
| `PageShell.tsx:136` | 136 | The render site itself — correct today, unguarded | ℹ️ Info | Not a defect in shipped code; named because it is the exact location the missing assertion needs to cover |
| Twelve further warnings from `41-GAP-REVIEW.md` (WR-01, WR-02, WR-03, WR-06, WR-07, WR-08, WR-09) | — | gate-integrity and docblock-accuracy defects, none independently re-verified in this round because they are lower severity than the two criticals and were not the subject of this re-verification's task | ℹ️ Info | WR-04 and WR-05 were closed and proven by mutation this wave (plans 41-15, 41-16) — confirmed genuine by reading their SUMMARYs' mutation evidence, not independently re-run in this round |

No new `TBD`/`FIXME`/`XXX` debt markers found in the five files this gap-closure wave modified
(`PageShell.tsx`, `verify-all.mjs`, `verify-touch-targets.mjs`, `verify-dialogs.mjs`,
`verify-conversion.mjs`), checked by direct grep.

### Human Verification Required

Unchanged from the previous round — none of these six items were newly observed by this wave, and
none should be read as newly required by the two criticals found here (they were already owed).
Reproduced from `41-VERIFICATION.md`'s previous round for continuity; see that document's original
text for the full test/expected/why-human breakdown. In summary: H41-1 (eight surfaces at three
widths, now including the CR-01 re-observation via `41-CR01-PASS.md`'s 13 rows), H41-2 (dialog
behaviour including A2), H41-3 (table-to-cards on phone), H41-4 (touch targets on a real device —
the only proof anything renders at 44px), H41-5 (desktop mouse-only), H41-6 (eight tabs, door
untouched). All still `pending`/`human_needed`, none upgraded by this wave, none should be.

### Gaps Summary

**Two blocking gaps, both new to this round, both independently reproduced by running mutated code
rather than by trusting either the code review or the executors' SUMMARYs.**

**GAP-CR-01.** `scripts/verify-all.mjs`'s reconciliation — plan 41-14's entire purpose — cannot
fail on the scenario its own docblock names as the trigger (a fourth `plan` state). The partition
at `:282-284` is exhaustive over `state === "runnable"` versus its complement, so any state value
lands deterministically in one of the two `absent*` buckets regardless of what it actually says.
Reproduced: injecting the documented scenario (`state: "deferred"`) causes the entry to fall into
the pre-existing `absentRequired` → MISSING → exit 1 path, never reaching the new
`refuse()`-on-`unaccounted` code. 41-14-SUMMARY.md's own mutation proof used a different mechanism
(a name-based filter exclusion that does not correspond to any real partition-widening change) and
so did not catch this. The exit-code half of the original finding (WR-03) is closed; the
reachability half — the half that matters — is not.

**GAP-CR-02.** `scripts/verify-conversion.mjs` check E1 — plan 41-17's entire purpose, described in
its own objective as "the check CR-01 did not have" — asserts against the `FOCUS_ROOT` constant's
*declaration* and never against the JSX expression at `PageShell.tsx:136` that actually renders it.
Reproduced: appending the full CR-01 defect directly to the render site's className (leaving the
`FOCUS_ROOT` constant itself untouched) produces `✓ E` and exit 0 on the shipped, unmodified gate —
and the reintroduced line is even counted as satisfying assertion 3 ("still reads both properties
elsewhere"), which is fed by the very reintroduction it exists to catch. This is the second time in
this phase a gate's own report has been satisfied by the defect it names, the first being WR-03's
identity.

**Why this matters more than an ordinary finding, stated plainly per the task's own framing:**
`PageShell.tsx` is correct today. CR-01 really is fixed in the tree, confirmed independently in
this round. But the two plans whose whole stated purpose was to make sure it could not come back
silently — both of them — do not do that. A green gate that cannot fail is worse than no gate,
because it reads as guarded when it is not (constraint 4). The phase's own goal is "one
implementation per recurring pattern" and its own review's language for this shape is a check that
"makes something look watched." That is exactly what both of these plans now are.

**Everything else genuinely improved.** `verify-touch-targets.mjs`'s exemption narrowed from a
file-wide blanket to ten named elements, proven by mutation to catch what it previously would have
forgiven (plan 41-15). `verify-dialogs.mjs`'s overlay matcher widened from one literal z-rung to a
family, behind a cross-checked Phase 42 fence, also proven by mutation (plan 41-16). Neither of
those two plans' central claims were found to be false in this round.

**Human verification remains exactly as owed as before this wave — not more, not less.** `41-CR01-PASS.md`'s
13 rows and `41-RELEASE-PASS.md`'s six items are unchanged, all `pending`/owed. This report does not
upgrade any of them, and does not treat the two new mechanical gaps as if they closed the human
question — they are independent findings.

---

_Verified: 2026-08-12T19:40:00Z_
_Verifier: Claude (gsd-verifier)_
