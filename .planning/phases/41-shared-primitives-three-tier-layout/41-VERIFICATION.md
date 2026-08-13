---
phase: 41-shared-primitives-three-tier-layout
verified: 2026-08-13T18:00:00Z
status: gaps_found
score: 5/10 must-haves fully verified (the reintroduction guard now open a FIFTH consecutive round; the debt-goes-quiet defect back through a FOURTH distinct mechanism; 4 truths still pending human observation, unchanged since round 1)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/10
  gaps_closed:
    - "The SINGLE-LINE closed JSX/block comment form of the liveLines() blind spot (41-GAP-REVIEW-4's CR-01/CR-02 as originally filed) — plan 41-29 replaced whole-line blanking with a span-consuming stripLeadingComments() that pairs each opener with its own closer and blanks only the comment span, applied identically in both scripts/verify-conversion.mjs and scripts/verify-dialogs.mjs. Independently re-derived by this verification: `stripLeadingComments()` at scripts/verify-conversion.mjs:537-558 correctly returns live trailing text for a comment that opens and closes on one line, confirmed by reading the code and by 41-29-SUMMARY.md's own byte-for-byte harness (BEFORE/AFTER hashes differ, M2/M3 mutations reproduce red on the pre-fix gate and stay red — this verification did not re-run that harness, accepting it on the file family's established proof-by-execution practice, per the task's scoped spot-check budget)."
    - "The two false 'byte-for-byte the literal, comment or no comment' style docblock claims already retired in round 4 stay retired — not re-checked this round, out of scope for round 5's diff."
    - "Check E's coverage boundary (Group C, non-structural half) — plan 41-30 added a WHAT A GREEN DOES NOT MEAN entry stating check E reads one file and asks the mount question of an import graph, that a climbed ancestor wrapper is never added to allScanned, and citing the CR-04 reproduction. Verified: `git diff --stat` for 41-30's commits shows only header prose and one printed sentence changed (33 insertions, 2 deletions in scripts/verify-conversion.mjs); neither frozen digest appears in the diff (grep for the three hashes returns 0); no executable identifier (allScanned, layoutClosure, NAV_MODULE_PATHS, navigationBySurface, refuse(, failures.push) appears in an added/removed line (grep returns 0)."
  gaps_remaining:
    - "THE SAME UNDERLYING TRUTH open since round 1 — 'check E prevents CR-01 from being silently reintroduced under any form the shell can legally take' — is open a FIFTH consecutive round. 41-29's stripLeadingComments() fix closed only the single-line closed-comment shape it was built to prove; the review that followed it (41-GAP-REVIEW-5.md) found the SAME liveLines() blind spot reopened through two forms neither plan touched. Independently reproduced by this verification on a disposable, throwaway pair of files under the session scratchpad — never inside the repository (`git status --porcelain` empty before and after) — by extracting stripLeadingComments()/liveLines() verbatim from scripts/verify-conversion.mjs:487-595 into a standalone script and running it against two constructed files: (1) a two-line JSX comment `{/* a lid\n    that wraps */} <div className=\"fixed inset-0 z-[60]\" />` — the terminating line came back blanked WHOLE (`\"\"`), the overlay div after `*/}` invisible, matching GAP-REVIEW-5's CR-01 exactly; (2) `{/* the scrim */ }` (a space before the closing brace — valid, compiling JSX) — `insideJsxComment` never clears because the code matches the exact token `*/}` with no whitespace tolerance (scripts/verify-conversion.mjs:488, :552, :583), so every line after it came back blanked to end-of-file, including a later `<div className=\"fixed inset-0 z-[60]\" />`, matching GAP-REVIEW-5's CR-02. Neither shape is new — GAP-REVIEW-5 additionally measured CR-02 live on the repository's own tree (one line inserted above the real shell at src/components/admin/RefundDialog.tsx:60, a REMAINING-listed file, restored after) and got exit 0 with a printed instruction to delete that entry as 'converted; remove this entry' — money-domain (ticketing-payments/RefundDialog) debt going invisible via the same lexer hole this verification independently confirmed."
    - "The debt-goes-quiet defect (a debt/REMAINING counter falling because the gate stopped looking) has now returned through a FOURTH distinct mechanism. GAP-REVIEW-5's CR-02 names the first three explicitly — DEF-41-03, WR-02 (round 3/4), CR-03 (round 4, the un-guarded existence check) — and this round's space-before-brace blind spot is the fourth: a REMAINING entry that IS walked, IS opened, and comes back empty because the stripper went blind inside the file, not because of a fence, a never-measured Map, or a walk-membership gap. Not independently re-executed against the real repository file by this verification (GAP-REVIEW-5 already did, with restore confirmed); this verification's own sandbox reproduction (above) confirms the underlying mechanism, not the specific repository file mutation."
    - "The new dialogs self-check (scripts/verify-dialogs.mjs:1247) feeds each probe through `stripLeadingComments(probe.line).text`, not through `liveLines`, and its own probes are single-line strings that cannot enter the multi-line state at all. Confirmed by direct reading: `measured: isOverlayLine(stripLeadingComments(probe.line).text) ? 'match' : 'no match'` at line 1247. The self-check is structurally incapable of catching either of the two forms above — it tests half the pipeline while the comment above it (per GAP-REVIEW-5, WR-01) describes it as testing the whole of it, the same sentence 41-29 used to describe the defect it was fixing, now true of the fix."
  regressions: []
gaps:
  # ── GROUP A — tractable and systemic, but the fix direction is an owner decision. ──
  - group: A
    group_label: "the comment-stripping heuristic has no last form — closing shape N reliably surfaces shape N+1"
    truth: "liveLines()'s comment-stripping heuristic blanks only what it should, so every check built on it (verify-conversion.mjs checks A and E, verify-dialogs.mjs check B) sees the shell's and the tree's actual live code, under every form a JSX/block comment can legally take"
    status: failed
    reason: >
      liveLines() (scripts/verify-conversion.mjs:568-595, a near-identical copy in
      scripts/verify-dialogs.mjs) still blanks two ordinary, non-adversarial JSX comment
      shapes whole: (1) the terminating line of a multi-line JSX comment — once
      insideJsxComment is set, out.push('') runs unconditionally for that line even
      though it may carry live code after the closer (verify-conversion.mjs:580-585); (2)
      a validly-closed JSX comment written with whitespace before the brace, `{/* ... */
      }` — JSX_COMMENT_CLOSE (:488) is the exact token '*/}' with no whitespace
      tolerance, so stripLeadingComments() (:537-558) never recognises the closer,
      returns unclosed: JSX_COMMENT_OPEN, and liveLines() blinds itself to end-of-file.
      Both independently reproduced by THIS verification (see re_verification.gaps_remaining
      above for the exact method and output) and by 41-GAP-REVIEW-5.md with additional
      controls on the live tree (a two-line comment inserted above a probe overlay:
      DIALOGS_OK, REMAINING unmoved; the same shape inserted into a converted surface:
      CONVERSION_OK, no raw-utility hit; the space-before-brace shape inserted live above
      src/components/admin/RefundDialog.tsx:60, restored after: exit 0, DIALOGS_OK, and a
      printed instruction telling a reader to delete that REMAINING entry as
      "converted; remove this entry" — RefundDialog.tsx is a hand-rolled overlay on a
      refund path). Round 5 (41-29) closed the single-line closed-comment form; each of
      the two rounds before it (round 4's frozen positional window then frozen file
      digest, rounds 1-3's per-element/per-branch assertions) closed the form that had
      just been demonstrated and the defect moved to the next form the same hand-rolled
      lexer did not cover. THE DIAGNOSIS: liveLines()/stripLeadingComments() is a
      hand-written lexer over a real grammar (JS/JSX comments), extended one shape per
      round for five rounds running. A hand-rolled lexer over a real grammar has no
      last form — the fifth round closing shape N reliably produces shape N+1, not
      because the executor is careless (41-29's own mutation harness, byte-for-byte
      restore-verified, is the most rigorous work this file family has produced) but
      because enumerating comment shapes is the wrong unit of closure.
    artifacts:
      - path: "scripts/verify-conversion.mjs"
        issue: "lines 580-585 (liveLines, insideJsxComment branch): blanks the multi-line JSX comment's terminating line whole, closer and all. Line 488 (JSX_COMMENT_CLOSE) and line 552 (indexOf lookup): exact-token match, no whitespace tolerance for `*/ }`. Lines 1923-1958 (NAV_PROPERTY_SITE_DIGESTS, SHELL_CODE_OUTSIDE_WINDOW_DIGEST) and check A both consume liveLines() output and inherit both holes."
      - path: "scripts/verify-dialogs.mjs"
        issue: "identical liveLines()/stripLeadingComments() copy carries the same two holes; check B (dialog-shell detection) is built on the same stripped source. Line 1247: the new matcher self-check calls stripLeadingComments() directly, not liveLines(), so it is structurally unable to exercise the multi-line state at all — it cannot catch either shape above even after they are fixed, unless rebuilt to feed real multi-line input through the real liveLines() path."
    missing:
      - "THIS IS A DIRECTION CHOICE, NOT A SIXTH LEXER PATCH. Two structurally different resolutions exist; record both, decide neither here. (a) Invert the stripper's failure direction, the way round 4 inverted the guard's: stop blanking comments preemptively and instead treat comment text as if it were code, scanning it for the same tokens. This produces FALSE REDS — a comment that merely NAMES a utility or an overlay's three parts gets flagged — which is the safe direction (a false red is investigated; a false green is invisible), and this file family already has a declared-exemption mechanism for exactly that case, plus GAP-REVIEW-5's own finding (41-29-SUMMARY.md, 'the self-chosen forms') that a comment naming three parts of an overlay is indistinguishable from a real one without one. Cost: every existing comment that happens to look like code must be declared once. (b) Stop hand-rolling the lexer; strip comments with a real parser/tokenizer instead of a line-oriented state machine. Cost: D-41-20 forbids adding new packages to this project, so (b) is only viable using whatever comment/tokenizer capability already ships with the toolchain already in package.json (e.g. Node's own tooling, or Babel/TypeScript's compiler surface if already a dependency) — not verified by this pass whether such a capability is already present and adequate; that check is itself the first step of option (b)."
      - "Whichever direction is chosen, extend scripts/verify-dialogs.mjs's matcher self-check to feed real multi-line arrays through the actual liveLines() path (not stripLeadingComments() alone), so the self-check can structurally see a fix to either shape above, per WR-01."
      - "Before calling this closed: re-run this verification's exact two sandbox mutations, GAP-REVIEW-5's live RefundDialog.tsx mutation, and 41-29-SUMMARY.md's M1-M5 mutation table, and confirm all refuse or fail."

  # ── DECIDED AND DEFERRED — not blocking gaps this round; recorded so a sixth round doesn't rediscover them. ──
  - group: B
    group_label: "Group B — tractable and local, deferred by decision (DEF-41-07), not attempted in round 5"
    truth: "verify-dialogs.mjs's existence guard against laundering a typo'd REMAINING entry into a suite-wide refusal covers every branch of neverOpenedReason(), not only the one round 4 touched — plus three related local warnings"
    status: failed
    reason: "Unchanged since 41-GAP-REVIEW-4.md. scripts/verify-dialogs.mjs:1017 guards only the walk-membership branch of neverOpenedReason() on existsSync; the NEVER_MEASURED_BY_B branch (:1025-1026) and the fence branch (:1027-1034) return a reason unconditionally. Plus: a refusal branch the exit-code header advertises as reachable that derivation shows cannot fire (WR-01, round 4 numbering); NAV_PROPERTY_SITE_DIGESTS keyed on line-text digest with no position, so a duplicate of an already-permitted line is permitted anywhere it is placed, including wrapping the focus form (WR-02); existsSync's case-insensitivity on the house macOS/APFS volume (CLAUDE.md Guardrail 6) giving a case-typo'd REMAINING entry a different verdict than on a case-sensitive filesystem (WR-03). Plan 41-30 explicitly declined to touch any of these four, registering them as DEF-41-07 with the stated reason: 'polishing refusals inside a mechanism whose limit is now known is work that looks like progress, and round 5 was deliberately held to two items.' This verification did not independently re-run any of the four this round; it accepts DEF-41-07's own per-item evidence trail (a mix of prior recorded runs and direct code reading) as sufficient given this pass's scoped spot-check budget."
    artifacts:
      - path: "scripts/verify-dialogs.mjs"
        issue: "lines 1009-1036 (neverOpenedReason): guard at :1017 covers one of three branches. Line 1017: existsSync case-insensitive on APFS. Lines 1923-1934 equivalent in verify-conversion.mjs: digest keyed on text only, no position."
    missing:
      - "DEF-41-07's four items, unchanged: hoist the existence check to guard all three neverOpenedReason() branches; correct or remove the unreachable refusal branch; key a permitted site on path:lineNo plus digest, not text alone; cross-check case against `walked`'s case-exact Set before trusting existsSync."
    deferred_by_decision: "DEF-41-07 (.planning/phases/41-shared-primitives-three-tier-layout/deferred-items.md), plan 41-30 Task 2"

deferred:
  - truth: "a navigation clearance reaching one of the four focus routes is caught by SOME check in verify-conversion.mjs, regardless of which file introduces it (Group C's structural half)"
    addressed_in: "Phase 41.1"
    evidence: "41-30-SUMMARY.md D-41-30-02 and §4 DEF-41-08: 'the structural resolution is NOT taken: it edits access-gating and ticketing-payments primary paths and requires the owner's validation; routed to 41.1 as DEF-41-08' — 41.1 is where those surfaces (the auth group, payment callback) convert onto the shared layer anyway, per .planning/REQUIREMENTS.md:251-257's own Phase 41 → 41.1 → 41.2 routing for DS-07/RESP-01/RESP-02/RESP-03. This verification independently confirmed the declaration itself is accurate and non-executable (git diff for 41-30's commits: header prose and one printed sentence only, no frozen digest or scanned-set identifier touched)."
---

# Phase 41: Shared Primitives & Three-Tier Layout Verification Report

**Phase Goal:** The shared layer exists — one implementation per recurring pattern, three tiers, finger-sized targets — and is proven on its first eight whole surfaces. The remaining surfaces convert in 41.1 and 41.2 onto this layer, unchanged.
**Verified:** 2026-08-13T18:00:00Z
**Status:** gaps_found
**Re-verification:** Yes — sixth pass, verifying round 5's gap-closure plans (41-29, 41-30) against 41-GAP-REVIEW-5.md. Rounds 1-4 history is preserved from the prior VERIFICATION.md and not re-derived here except where round 5 touches it directly.

## The load-bearing count

**The reintroduction guard for CR-01 — "check E prevents the navigation clearance from
coming back under any form the shell can legally take" — has now been declared closed
and found open in FIVE consecutive rounds.** Round 1 (41-17): asserted on a constant,
defect moved to the render site. Round 2 (41-20): asserted on the outer element, defect
moved to the inner element. Round 3 (41-23): asserted on the branch as a region, defect
moved to the branch's shape. Round 4 (41-26, then 41-27): asserted on the frozen shape,
then on a frozen file digest; defect moved into what the digest is computed FROM (the
comment stripper) and into a route the digest never covers (an ancestor layout). **Round
5 (41-29): fixed the single-line form of the comment stripper's blind spot; defect moved
to the multi-line form and to a validly-closed comment with whitespace before the
brace — both independently reproduced by this verification (see below).**

**Separately, the debt-goes-quiet defect — a REMAINING/debt counter falling because a
gate stopped looking rather than because the debt was paid — has now returned through a
FOURTH distinct mechanism.** DEF-41-03 (never-measured Map) → WR-02/round 3-4 (a fence
match) → CR-03/round 4 (an unguarded walk-membership check) → **this round's
space-before-brace comment blind spot, which GAP-REVIEW-5 measured live on
`src/components/admin/RefundDialog.tsx:60` (a REMAINING-listed hand-rolled overlay on a
refund path): exit 0, and a printed instruction telling a reader to delete that entry.**

Both counts are the phase's most load-bearing facts: the pattern is not "one more shape
to teach the matcher." It is that a hand-rolled lexer over a real grammar (JS/JSX
comments) has no last form, and the direction of the next patch needs to be an owner
decision, not a sixth round of the same hunt.

## Independent reproduction (this verification, not taken on GAP-REVIEW-5's word)

Extracted `stripLeadingComments()`/`liveLines()` verbatim from
`scripts/verify-conversion.mjs:487-595` into a standalone script under the session
scratchpad, run against two throwaway files (never inside the repository —
`git status --porcelain` empty before and after this entire verification pass, confirmed
at the end):

1. **Two-line JSX comment.** `{/* a lid` / `    that wraps */} <div className="fixed
   inset-0 z-[60]" />` — the terminating line is returned as `""`, the overlay div after
   `*/}` invisible to any downstream check. Matches GAP-REVIEW-5 CR-01.
2. **Space before the brace.** `{/* the scrim */ }` — `insideJsxComment` never clears
   (the exact-token match on `'*'+'/}'` fails against `*/ }`), so every subsequent line —
   including a later `<div className="fixed inset-0 z-[60]" />` — is blanked to
   end-of-file. Matches GAP-REVIEW-5 CR-02.

Both reproduced with a plain extraction of the shipped functions — no adversarial
construction, both shapes are ordinary, syntactically valid JSX.

## CR-01 (the original phase-blocking gap) — closed in code, unchanged since round 1

`grep -n "nav-inset" src/components/ui/PageShell.tsx` returns exactly two lines — 160
(`ps-[var(--nav-inset-inline-start)]`) and 164
(`pb-[calc(var(--nav-inset-block-end)+1rem)]`) — both inside the default/wide branch,
neither inside the focus branch. This has not moved since round 1 and is not
independently re-hashed this round (no code under `src/components/ui/PageShell.tsx` was
touched by 41-29 or 41-30 — confirmed by `git diff --stat` for both plans' commits,
which show only `scripts/*.mjs` and `.planning/` files).

**Guarded against a realistic reintroduction: NO — this round's finding is that the
guard's own comment-stripper, freshly repaired for one shape in this exact round, is
open on two more.** See "The load-bearing count," above.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One implementation per recurring pattern exists | ✓ VERIFIED (unchanged) | `src/components/ui/{Button,Chip,Input,Card,PageShell,Typography,Dialog,DataTable,Checkbox,Skeleton}.tsx` present, exported, wired |
| 2 | Roadmap criterion 1 — no surface shows the pattern until whole-converted, checked mechanically | ✓ VERIFIED on the live tree today, ⚠️ the checking mechanism has a proven, now-narrower-but-still-open hole | `node scripts/verify-conversion.mjs` exit 0 (not re-run this pass on the unmodified tree; no product file changed since round 4's last confirmed run). Mechanism hole: see truth 5 |
| 3 | Roadmap criterion 2 (DS-08) — dialog opens as sheet/window, closes with Escape | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `Dialog.tsx:251` `showModal()`. Check B carries the same liveLines()-derived blind spot as check A |
| 4 | Roadmap criterion 3 (DS-09) — dense table reads as cards on phone | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `DataTable.tsx:391` `md:hidden`. H41-3 unobserved |
| 5 | Roadmap criterion 4 (RESP-01, RESP-02, RESP-04) — every converted surface workable phone/tablet/desktop | ✗ FAILED — the CODE regression stays closed; the GATE meant to prevent its silent recurrence has now failed a FIFTH independent closure attempt | Independently reproduced this round: multi-line JSX comment and space-before-brace comment both hide live code from checks A, B and E's digests (see reproduction above). Human observation (H41-1/`41-CR01-PASS.md`) remains partly owed — see truth 7 |
| 6 | Roadmap criterion 5 (RESP-03) — touch targets finger-sized, large touch screens included | ? UNCERTAIN — class-string check only, no device ever used (unchanged) | H41-4 still `human_needed`, not ticked |
| 7 | The goal's own claim — "proven on its first eight whole surfaces" | ✗ NOT MET as a fully human-observed fact, PARTIALLY MET as of this round | `41-CR01-PASS.md` rows 1-6 (of 13) now carry `measured, headless — offset 0px`, dated 2026-08-13 — the phase's first observed evidence, real, and NOT upgraded by this verification: a headless browser is not a device (no touch, no real font fallback, no thumb). Rows 7-13 still `pending`. RESP-03 stays unticked. H41-4 stays `human_needed` |
| 8 | Exactly eight surfaces declared converted | ✓ VERIFIED (unchanged) | `CONVERTED.length === 8` |
| 9 | One command runs every gate and reports refusal distinctly from failure | ✓ VERIFIED (unchanged) | `npm run verify` — per 41-30-SUMMARY.md's own run on its worktree: exit 2, 14 passed, 0 FAILED, 1 REFUSED (`verify:capabilities`, no `.env.local` in that worktree — correct behaviour, not a defect); not independently re-run by this verification pass |
| 10 | The remaining ~26 conversion units are explicitly deferred to 41.1/41.2 | ✓ VERIFIED (unchanged) | `.planning/REQUIREMENTS.md:251-257` |

**Score:** 5/10 truths cleanly VERIFIED (1, 2, 8, 9, 10 — truth 2 carries a noted caveat).
1 truth (5) carries an independently-reproduced, still-open gap gap — now in its FIFTH
round. 4 truths (3, 4, 6, 7) remain UNCERTAIN or NOT FULLY MET pending human observation;
truth 7 improved partially this round (6 of 13 rows measured, headless) without closing.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/components/ui/PageShell.tsx` | focus form reserves no navigation clearance | ✓ VERIFIED in code (unchanged since round 1) | `grep nav-inset` → lines 160, 164 only, both default/wide |
| `scripts/verify-conversion.mjs` / `verify-dialogs.mjs` — `liveLines()`/`stripLeadingComments()` | blanks only a comment's own span, under every legal comment shape | ⚠️ PARTIALLY FIXED — single-line closed form fixed (41-29), multi-line and whitespace-before-brace forms open (independently reproduced this pass) | `verify-conversion.mjs:487-595`; identical copy in `verify-dialogs.mjs` |
| `scripts/verify-dialogs.mjs` matcher self-check | exercises the real `liveLines()` path, including its multi-line state | ✗ FAILED — calls `stripLeadingComments()` on single-line probe strings only | `:1247` |
| `scripts/verify-conversion.mjs` | check E's coverage boundary is declared where a reader of a green run sees it | ✓ VERIFIED — closed this round (41-30) | header WHAT A GREEN DOES NOT MEAN entry added; diff confirmed non-executable |
| `scripts/verify-dialogs.mjs` | `neverOpenedReason()` existence guard covers all three branches | ✗ FAILED, unchanged (DEF-41-07, deferred by decision) | `:1017` guards one of three |
| `.planning/phases/41-.../41-CR01-PASS.md` | pending procedure, 13 rows | ⚠️ PARTIAL — rows 1-6 measured (headless), rows 7-13 pending | re-read this round |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `PageShell.tsx` (multi-line JSX comment, terminating line) | check E's two digests / check A / check B | `liveLines()` | ✗ NOT WIRED — independently reproduced this round | terminating line blanked whole, closer and all |
| `PageShell.tsx` (comment closed as `*/ }`, whitespace before brace) | same | `liveLines()`'s exact-token `JSX_COMMENT_CLOSE` match | ✗ NOT WIRED — independently reproduced this round | blinds to end-of-file |
| a probe string | `verify-dialogs.mjs` matcher self-check | `stripLeadingComments()` only, not `liveLines()` | ✗ NOT WIRED — self-check cannot exercise the multi-line state | `:1247` |
| check E boundary declaration | the printed report a reader of a green run sees | header prose + one console.log string | ✓ WIRED — closed this round | 41-30, verified non-executable diff |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| CR-01 closed in code, unchanged | `grep -n nav-inset src/components/ui/PageShell.tsx` | 2 hits, lines 160/164, default/wide branch only | ✓ PASS |
| liveLines() blanks a multi-line JSX comment's terminating line whole | extracted `stripLeadingComments()`/`liveLines()` verbatim, ran against a throwaway 2-line-comment file under the session scratchpad | terminating line returned `""`; overlay after `*/}` invisible | ✗ FAIL — reproduces GAP-REVIEW-5 CR-01 |
| liveLines() blinds to EOF on `{/* ... */ }` | same extraction, throwaway file with a space before the brace | every line after the comment returned `""`, including a later overlay div | ✗ FAIL — reproduces GAP-REVIEW-5 CR-02 |
| dialogs matcher self-check exercises the real multi-line path | read `scripts/verify-dialogs.mjs:1247` directly | calls `stripLeadingComments(probe.line)`, not `liveLines`; probes are single-line strings | ✗ FAIL — reproduces GAP-REVIEW-5 WR-01 |
| repository untouched by this verification | `git status --porcelain` | only the two pre-existing untracked `.planning/phases/44-*`/`45-*` directories | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist or are declared for plans 41-29/41-30.
**Step 7c: SKIPPED (no probes declared or discovered)** — unchanged.

### Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| DS-07 | PARTIAL, unchanged | `.planning/REQUIREMENTS.md:125,251` unchecked |
| DS-08 | PARTIAL, unchanged | `:126,252` unchecked; A2 still open |
| DS-09 | PARTIAL, unchanged | `:127,253` unchecked |
| RESP-01 | PARTIAL — code regression stays closed; the guard against recurrence has failed a FIFTH closure attempt | `:132,254` unchecked, "closes only after 41.2" |
| RESP-02 | PARTIAL, same disposition | `:133,255` unchecked |
| RESP-03 | PARTIAL, human evidence still owed | `:134,256` unchecked; H41-4 `human_needed`, not ticked |
| RESP-04 | PARTIAL, unobserved | `:135,257` unchecked |

All seven requirement IDs remain PARTIAL. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `scripts/verify-conversion.mjs` | 580-585 | `liveLines()` blanks a multi-line JSX comment's terminating line whole, hiding live code after the closer | 🛑 Blocker | Group A. Independently reproduced by this verification |
| `scripts/verify-conversion.mjs` | 488, 552 | `JSX_COMMENT_CLOSE` exact-token match has no whitespace tolerance; `{/* ... */ }` blinds the stripper to EOF | 🛑 Blocker | Group A. Independently reproduced by this verification; GAP-REVIEW-5 additionally reproduced live on `RefundDialog.tsx` |
| `scripts/verify-dialogs.mjs` | (identical copy) | Same two defects, blinds check B | 🛑 Blocker | Group A, same root cause |
| `scripts/verify-dialogs.mjs` | 1247 | Matcher self-check tests `stripLeadingComments()` alone, not `liveLines()`; structurally cannot catch either shape above | ⚠️ Warning | Group A follow-on (WR-01) |
| `scripts/verify-dialogs.mjs` | 1017 vs 1025-1034 | `neverOpenedReason()` existence guard covers one of three branches | 🛑 Blocker, deferred by decision (DEF-41-07) | Group B, not attempted round 5 |
| `scripts/verify-conversion.mjs` | 1923-1934 | Permitted-site digest keyed on line text only, no position | ⚠️ Warning, deferred (DEF-41-07) | Group B |
| `scripts/verify-dialogs.mjs` | 1017 | `existsSync` case-insensitive on house macOS/APFS volume | ⚠️ Warning, deferred (DEF-41-07) | Group B |

No new `TBD`/`FIXME`/`XXX` debt markers found in `scripts/verify-conversion.mjs` or
`scripts/verify-dialogs.mjs` (grep re-run this round, both files).

### Human Verification Required

Unchanged in kind, improved in degree. `41-CR01-PASS.md` rows 1-6 (of 13) now carry
`measured, headless — offset 0px`, dated 2026-08-13 — real evidence, not upgraded to a
device pass by this report. H41-1 (eight surfaces at three widths — 6 of 12 CR-01 rows
now headless-measured, the other 4 surfaces and rows 7-13 fully owed), H41-2 (dialog
behaviour, A2 scroll lock still open), H41-3 (table-to-cards on phone), H41-4 (touch
targets on a real device — the only proof anything renders at 44px), H41-5 (desktop
mouse-only), H41-6 (eight tabs, door untouched). All remain `pending`/`human_needed`.

## Gaps Summary

**One systemic, direction-choice gap (Group A); four small deferred-by-decision items
(Group B, DEF-41-07); one structural item deferred to a named future phase (Group C,
DEF-41-08, Phase 41.1).**

**Group A.** `liveLines()`'s hand-rolled comment lexer has no last form. Round 5 closed
the single-line closed-comment shape with a rigorous, byte-for-byte-verified fix; the
review that followed it found the SAME helper open on two more ordinary JSX comment
shapes — a multi-line comment's terminating line, and a validly-closed comment with
whitespace before the brace, the second of which was reproduced live on a real
REMAINING-listed refund-path file (`RefundDialog.tsx`) with a printed instruction to
delete its debt entry. This verification independently reproduced both shapes on a
disposable sandbox, never touching the repository. Two structurally different fix
directions exist — invert the stripper to scan comments as code (false reds, safe
direction, this file family already has a declared-exemption path) or replace the
hand-rolled lexer with a real parser (blocked by D-41-20's no-new-packages rule unless
an adequate tokenizer already ships with the toolchain) — and the choice belongs to the
owner, not to a sixth patch of the same shape.

**Group B (deferred by decision, DEF-41-07).** `neverOpenedReason()`'s existence guard
covers one of three branches; a permitted-site digest keyed on text alone; a
case-insensitive existence check on the house filesystem. Plan 41-30 explicitly declined
these this round, and this verification did not re-run them.

**Group C, structural half (deferred to Phase 41.1, DEF-41-08).** Check E is a scan over
one file; a clearance reaching a focus route from an ordinary ancestor layout is
invisible to every check. The non-structural half — declaring this limit in the gate's
own header — was closed this round (41-30) and independently confirmed non-executable.
The structural half touches `access-gating`/`ticketing-payments` primary paths and
requires owner validation; it is routed to 41.1, where those surfaces convert anyway.

**Human verification remains owed, improved in degree only.** 6 of `41-CR01-PASS.md`'s
13 rows are now headless-measured — the phase's first observed evidence — and this
report does not upgrade that to a device observation. RESP-03 stays unticked; H41-4
stays `human_needed`.

---

_Verified: 2026-08-13T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
