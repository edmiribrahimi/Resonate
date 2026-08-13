---
phase: 41-shared-primitives-three-tier-layout
verified: 2026-08-13T12:00:00Z
status: gaps_found
score: 5/10 must-haves fully verified (the reintroduction guard now open a FOURTH consecutive round, split into three surviving problems of different tractability; 4 pending human observation, unchanged since round 1)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/10
  gaps_closed:
    - "Round-3 gap 1, AS FILED (branch-shape escapes: ternary, brace-less if, brace-in-string, comment-hidden concatenation) — plan 41-26 inverted check E from shape-recognition to a frozen positional-window comparison (FOCUS_BRANCH_SHAPE, scripts/verify-conversion.mjs) that counts zero braces, so no shape variant of the branch can move a line out of the compared window. Independently re-derived by this verification by reading the shipped code: the window is anchored solely on the single opener and its length is frozen at 7, which subsumes every one of round 3's escape shapes by construction rather than by enumeration."
    - "Round-3 gap 2, AS FILED (verify-dialogs.mjs could report a REMAINING entry outside listScannableFiles's walk as 'converted; remove this entry') — plan 41-28 added a `walked` Set derived from the loop's own `files` input and a `NOT IN THE WALK` branch, evaluated first and guarded on `existsSync`. Independently re-derived by reading scripts/verify-dialogs.mjs:1009-1024: the branch is present, first, and guarded — the exact fix GAP-REVIEW-3's CR-03 proposed."
    - "Round-3 gap 3, AS FILED (two false docblock claims: FOCUS_ROOT_LITERAL_RE's 'byte-for-byte, comment or no comment' and NEVER_MEASURED_BY_B's 'cannot drift apart by an edit to either') — both corrected in the same commits as the code beneath them (41-26, 41-28), and both false sentences are QUOTED and withdrawn in place rather than deleted silently, matching this file family's own house rule. Independently confirmed: `grep -c \"byte-for-byte the literal, comment or no comment\"` on scripts/verify-conversion.mjs returns 0 as a live claim (it survives only inside prose recording it as false); `grep -c \"cannot drift apart by an edit to either\"` on scripts/verify-dialogs.mjs returns 1, inside the paragraph that withdraws it."
  gaps_remaining:
    - "THE SAME UNDERLYING TRUTH round 3 left open — 'check E prevents CR-01 from being silently reintroduced under any form the shell can legally take' — is open a FOURTH consecutive round, via a mechanism round 4 itself introduced and a mechanism round 4 never touched. (1) Both new frozen assertions round 4 added (NAV_PROPERTY_SITE_DIGESTS, SHELL_CODE_OUTSIDE_WINDOW_DIGEST, scripts/verify-conversion.mjs:1923-1958) read the shell through `liveLines()`, which blanks any line whose TRIMMED text starts with a comment opener — including a CLOSED one-line JSX comment followed by live code on the same line. Independently reproduced by this verification on a disposable sandbox (see below): one line — `{/* keep the shell aligned */} className += \" ps-[var(--nav-inset-inline-start)]\";` — inserted immediately above the frozen opener reintroduces CR-01 on all four focus routes while the digest, the permitted-site count and the report stay byte-identical to the clean tree; exit 0, `CONVERSION_OK`, and `npx tsc --noEmit` clean. (2) A clearance can reach all four focus routes from OUTSIDE `PageShell.tsx` entirely — an `(auth)` route layout, never opened by checks A, B, D or the shell-digest E — which round 4 did not attempt and did not declare as unmeasured in the header. Independently reproduced by this verification on the same sandbox: a new `src/app/(auth)/layout.tsx` carrying `ps-[var(--nav-inset-inline-start)]`, `bg-red-500` and a `max-w-7xl` reaches `/login`, `/register` and `/set-password`; `files scanned by A, B and D` stays at 53 (unchanged from the clean tree), the route table still prints `navigation: none` for all three, and the run exits 0 with `CONVERSION_OK`. Both mutations were applied to a copy under the session scratchpad, never to the repository; `git status --porcelain -- src/ scripts/` in the actual repository was empty before and after."
    - "A NEW instance of the SAME docblock-false-claim class round 3's gap 3 closed. `scripts/verify-conversion.mjs:200-204` and `scripts/verify-dialogs.mjs:152-155` both state the JSX-comment stripper's over-blanking case is bounded to 'a line's first characters are a JSX comment opener inside a string' — read directly in the shipped file and confirmed false by the same CR-01 mutation above and by 41-GAP-REVIEW-4.md's CR-02 probes (a raw palette utility and an undeclared dialog overlay both hidden behind a closed one-line JSX comment, neither inside a string): the dominant over-blanking case is an ordinary closed JSX comment followed by live code, which is idiomatic React and not a string at all."
    - "verify-dialogs.mjs's 41-28 existence guard is applied to one of the three branches of `neverOpenedReason()`, not all three. `scripts/verify-dialogs.mjs:1017` guards only the walk-membership branch on `existsSync`; the `NEVER_MEASURED_BY_B` branch (:1025-1026) and the fence branch (:1027-1034) return a reason with no existence test. Read directly in the shipped file: a `REMAINING` entry naming a non-existent path that happens to match a Phase-42 fence glob (e.g. `src/components/scanner/DoesNotExist.tsx`) returns the fence's refusal reason rather than falling through to the `missing`/FAILURE path a real typo reaches today — the exact laundering `neverOpenedReason()`'s own docblock (scripts/verify-dialogs.mjs:1010-1016) says must not happen, now true of two of its three branches."
  regressions: []
gaps:
  # ── GROUP A — tractable and systemic. One fix, large blast radius. ──────────
  - group: A
    group_label: "tractable and systemic — fix regardless of what is decided about B or C"
    truth: "liveLines()'s comment-stripping heuristic blanks only what it should, so every check built on it (verify-conversion.mjs checks A and E, verify-dialogs.mjs check B) sees the shell's and the tree's actual live code"
    status: failed
    reason: "liveLines() (scripts/verify-conversion.mjs:447-476, a near-identical copy in scripts/verify-dialogs.mjs) blanks any line whose TRIMMED text STARTS WITH a comment opener, including the closed one-line JSX form `{/* ... */}`. A blanked line trims to the empty string and is skipped downstream. So a line that opens with `{/* prose */}` and continues with live code on the SAME line is invisible to every scan built on liveLines(): verify-conversion.mjs check A (raw palette utilities), check E's two new frozen digests (NAV_PROPERTY_SITE_DIGESTS, SHELL_CODE_OUTSIDE_WINDOW_DIGEST), unfrozenPropertySites and propertyReadsElsewhere; and verify-dialogs.mjs check B (undeclared dialog shells). 41-GAP-REVIEW-4.md proved this with controls in three places (CR-01: PageShell's focus form re-acquires a navigation inset with the digest byte-identical; CR-02 check A: a raw `text-red-500` on the payment/callback surface, CONVERSION_OK; CR-02 check B: an undeclared hand-rolled overlay in a probe file, DIALOGS_OK, REMAINING unmoved). This verification independently reproduced the CR-01 instance on a disposable sandbox, byte-for-byte per the review's Variant B: inserting `  {/* keep the shell aligned */} className += \" ps-[var(--nav-inset-inline-start)]\";` immediately above `if (width === \"focus\") {` reintroduces CR-01 on all four focus routes; the report's `the shell OUTSIDE that window` digest printed `73adc18b822ace6679b5d0f22b7b1e442dc2d7718619d08e46c87ee14acc754f` — byte-identical to the clean tree's digest — `sites permitted to read a navigation property : 2 (found outside the permitted set: 0)`, `✓ E`, `CONVERSION_OK`, exit 0; `npx tsc --noEmit` on the mutated file: clean, zero errors. Both scripts' headers (verify-conversion.mjs:200-204, verify-dialogs.mjs:152-155) state the over-blanking case is bounded to a comment opener 'inside a string' — read directly in the shipped files, and disproved by every one of the mutations above, none of which involves a string."
    artifacts:
      - path: "scripts/verify-conversion.mjs"
        issue: "lines 447-476 (liveLines): blanks the whole line on a match of trimmed-text-starts-with-comment-opener, not only the comment span. Lines 200-204: docblock claims the over-blank case is bounded to a comment opener inside a string — false. Lines 1923-1958 (NAV_PROPERTY_SITE_DIGESTS, SHELL_CODE_OUTSIDE_WINDOW_DIGEST): both built from liveLines() output and therefore inherit the blind spot."
      - path: "scripts/verify-dialogs.mjs"
        issue: "a near-identical liveLines()/comment-stripper carries the same defect; lines 152-155: docblock carries the identical false 'inside a string' claim. Check B (dialog-shell detection) is built on the same stripped source."
    missing:
      - "Blank only the comment SPAN for the closed single-line JSX form, not the whole trimmed line: on a match, splice out the text between the opener and the FIRST closer and keep everything after the closer as live text. Apply the identical change in both files — they are deliberately self-contained (DEF-41-02) and must not diverge."
      - "Correct both docblocks (verify-conversion.mjs:200-204, verify-dialogs.mjs:152-155) in the SAME commit: replace the false 'only inside a string' claim with the true bound, quoting the withdrawn sentence in place per this file family's own house rule (already applied to FOCUS_ROOT_LITERAL_RE and NEVER_MEASURED_BY_B)."
      - "Add a fixed probe to verify-dialogs.mjs's matcher self-check asserting that an overlay behind a leading CLOSED JSX comment still matches — the direction the docblock claims, re-proven on every run rather than asserted in prose."
      - "Before calling this closed: re-run this verification's exact CR-01 mutation and 41-GAP-REVIEW-4.md's CR-02 check-A and check-B probes and confirm all three now refuse or fail."

  # ── GROUP B — tractable and local. Four small, independent, well-scoped fixes. ──
  - group: B
    group_label: "tractable and local — each fix is a few lines, independently scoped"
    truth: "verify-dialogs.mjs's existence guard against laundering a typo'd REMAINING entry into a suite-wide refusal covers every branch of neverOpenedReason(), not only the one round 4 touched"
    status: failed
    reason: "41-28 added `if (!walked.has(path) && existsSync(...)) return 'NOT IN THE WALK ...'` at scripts/verify-dialogs.mjs:1017 — guarded, and correctly so (proven by probe P3 in 41-28-SUMMARY.md: a genuine typo still reaches the FAILURE path, not a refusal). But `neverOpenedReason()`'s own docblock (:1010-1016) states the defect it must not commit in general terms — 'an unguarded membership test would turn a REMAINING entry with a typo ... into a refusal' — and the guard was applied to only ONE of the function's three return branches. The `NEVER_MEASURED_BY_B` branch (:1025-1026) and the fence branch (:1027-1034), read directly in the shipped file, return a reason unconditionally, with no existence test. So a REMAINING entry naming a non-existent path that happens to match a Phase-42 fence glob is laundered into the fence's refusal reason (which propagates through verify-all.mjs as VERIFY_REFUSED for all sixteen gates) rather than the FAILURE a real typo reaches when it does not match a fence."
    artifacts:
      - path: "scripts/verify-dialogs.mjs"
        issue: "lines 1009-1036 (neverOpenedReason): the existence guard at :1017 covers only the walk-membership return; the NEVER_MEASURED_BY_B return (:1025-1026) and the fence return (:1027-1034) are unguarded."
    missing:
      - "Hoist the existence check to the top of neverOpenedReason(), covering all three branches at once: `if (!existsSync(...)) return null;` before any of the three lookups, so a non-existent path always falls through to the FAILURE path regardless of which branch its NAME would otherwise match."
      - "Re-run 41-GAP-REVIEW-4.md's CR-03 probe (a REMAINING entry naming a non-existent path behind the Phase-42 fence glob) on the fixed gate and confirm exit 1 / FAILURE, not exit 2 / VERIFY_REFUSED."
    group: B
  - group: B
    group_label: "tractable and local"
    truth: "the digest refusal's own printed instruction in scripts/verify-conversion.mjs is true — 'Re-freezing does NOT bless a navigation property'"
    status: failed
    reason: "the sentence is false as written. NAV_PROPERTY_SITE_DIGESTS keys a permitted site on the hash of a line's TRIMMED TEXT, with no notion of position. A second, byte-identical copy of an already-permitted line (e.g. the default/wide root's opening `<div>`) is permitted wherever it is placed in the file, including where it WRAPS the focus form. GAP-REVIEW-4's WR-02 measured this end to end: splitting PageShell into a wrapper plus an inner component, with the frozen seven lines and the focus root byte-identical, first refuses (new digest) and prints an instruction to copy the found digest in; following that instruction literally produces CONVERSION_OK on the second run, with all four focus routes wrapped in the leading inset the backstop was supposed to catch at zero. Not independently re-executed this round — the finding is a direct read of NAV_PROPERTY_SITE_DIGESTS's keying (hash of text only, scripts/verify-conversion.mjs:1923-1934) against the claim at :2043-2045, which is sufficient to confirm the claim is false by construction without re-running the mutation."
    artifacts:
      - path: "scripts/verify-conversion.mjs"
        issue: "lines 1923-1934 (NAV_PROPERTY_SITE_DIGESTS): keyed on line-text digest only, no position. Lines 2043-2045: the printed instruction claims re-freezing cannot bless a navigation property — true only for a NEW site, false for a duplicate of an already-permitted line placed anywhere else, including around the focus form."
    missing:
      - "Key a permitted site on `path:lineNo` AND digest, so a duplicate at a new position is not automatically permitted — OR, cheaper: correct the printed sentence at :2043-2045 to state what is true (re-freezing blesses a COPY of an already-permitted line wherever it is placed, and a reader must check what the changed line WRAPS, not only what it says)."
  - group: B
    group_label: "tractable and local"
    truth: "scripts/verify-dialogs.mjs's NOT-IN-THE-WALK verdict is filesystem-independent, so the same REMAINING entry gets the same verdict on every developer's machine"
    status: failed
    reason: "the new guard at scripts/verify-dialogs.mjs:1017 uses `existsSync`, which is case-INSENSITIVE on macOS's default APFS volume — the house filesystem per CLAUDE.md Guardrail 6 — and returns true for a path whose case does not match the file on disk. `walked` is built from the walk's own output and IS case-exact. So a case-typo'd REMAINING entry lands in the NOT-IN-THE-WALK branch (a refusal) on macOS and in the `missing` branch (a FAILURE) on a case-sensitive filesystem — the exact laundering the guard exists to prevent, now reintroduced on the platform this repository is developed on. Not independently re-executed this round; the finding follows directly from `existsSync`'s documented case-insensitivity on the default macOS volume plus `walked`'s case-exact construction (scripts/verify-dialogs.mjs:866), which is sufficient to confirm without re-running the mutation — CLAUDE.md Guardrail 6 already names macOS/APFS as the house filesystem this repository's tooling must account for."
    artifacts:
      - path: "scripts/verify-dialogs.mjs"
        issue: "line 1017: `existsSync(...)` alone decides on-disk existence for the NOT-IN-THE-WALK branch, without cross-checking case against `walked`'s case-exact Set."
    missing:
      - "Before trusting `existsSync` for the NOT-IN-THE-WALK branch, confirm the path's case matches what's on disk (e.g. via `realpathSync.native` compared against the declared path), and treat a case-only mismatch as `missing`, not as NOT-IN-THE-WALK — the two verdicts must not depend on which volume the gate happens to run on."

  # ── GROUP C — not tractable by this mechanism. Needs an owner decision. ──────
  - group: C
    group_label: "not tractable by this mechanism — needs a decision from the owner, not a fifth patch"
    truth: "a navigation clearance reaching one of the four focus routes is caught by SOME check in verify-conversion.mjs, regardless of which file introduces it"
    status: failed
    reason: "check E's entire mechanism is a text scan over ONE file, src/components/ui/PageShell.tsx. Every focus route is also reachable through an ancestor route layout — today none exists at src/app/(auth)/, but nothing prevents one from being added, and nothing in checks A, B, D or E would open it. This verification independently reproduced 41-GAP-REVIEW-4.md's CR-04 on a disposable sandbox: a new src/app/(auth)/layout.tsx carrying `ps-[var(--nav-inset-inline-start)]`, `bg-red-500` and `max-w-7xl` wraps /login, /register and /set-password; `files scanned by A, B and D` printed 53 — unchanged from the clean tree — because the layout was enumerated by check E's ancestor-climb (layoutClosure) to ask ONLY whether a navigation module is reachable from it, and was never added to `allScanned`, so checks A, B and D never open it either. The route table still printed `navigation: none` for all three focus routes and the run exited 0 with CONVERSION_OK. Per meta-gates.md's path-priority table, src/app/(auth)/** is nextjs-architecture territory and a layout there is an entirely ordinary Next.js file, not an adversarial construction — this is defect shape 4 named in the phase's own review history: a check keyed on a proxy (is a nav module reachable) that goes quiet exactly where the fact that matters (is clearance reserved) diverges from the proxy."
    artifacts:
      - path: "scripts/verify-conversion.mjs"
        issue: "lines 2116-2134 (navigationBySurface) and :2060-2078 (layoutClosure): a climbed ancestor wrapper is asked only whether a NAV_MODULE_PATHS entry is reachable from it; the wrapper's OWN class strings are never read by any check, and the wrapper is never added to allScanned."
      - path: "src/app/(auth)/layout.tsx"
        issue: "does not exist today (confirmed: `ls src/app/(auth)/` shows only login, register, set-password — no layout.tsx). The gap is that nothing would catch its addition with the property CR-04 demonstrates, not that anything wrong exists in the tree today."
    missing:
      - "THIS IS A DECISION, NOT A CHECKLIST ITEM. Do not write 'add a check for layouts' as if it were the fifth regex case in the same hunt-for-the-defect direction that has already failed four times over. Two structurally different resolutions exist and the owner must choose: (a) make the clearance structurally impossible to reach the focus routes from outside PageShell.tsx — e.g. assert no ancestor wrapper of a focus-width surface may read either navigation property, by feeding layoutClosure's climbed set into allScanned and extending the same NAV_PROPERTIES scan to it; or (b) accept that this gate covers the FILE PageShell.tsx and not the ROUTE, and say so explicitly in the 'WHAT A GREEN DOES NOT MEAN' header block (scripts/verify-conversion.mjs:29-61) rather than implying broader coverage than the mechanism provides. Per CLAUDE.md's own house rule, an unmeasured region must at least be DECLARED unmeasured — shipping (b) undeclared, as today's header does, is the one option that is not acceptable to leave as-is."
      - "If (a) is chosen: a wrapper of a focus surface that reads either NAV_PROPERTIES name must be a FAILURE (the wrapper is measured, and what it reserves is unambiguous), never a refusal."
deferred: []
---

# Phase 41: Shared Primitives & Three-Tier Layout Verification Report

**Phase Goal:** The shared layer exists — one implementation per recurring pattern, three tiers, finger-sized targets — and is proven on its first eight whole surfaces. The remaining surfaces convert in 41.1 and 41.2 onto this layer, unchanged.
**Verified:** 2026-08-13T12:00:00Z
**Status:** gaps_found
**Re-verification:** Yes — fifth pass, verifying the FOURTH round of gap-closure plans (41-26, 41-27, 41-28). Round 1 (41-13/41-17) closed CR-01 in code and attempted a gate; found open (defect moved to the render site). Round 2 (41-18–22) closed the render-site escape; found open (defect moved to the branch's inner element). Round 3 (41-23–25) closed the inner-element escape by bounding the whole branch as a region; found open (defect moved to the SHAPE of the branch). **Round 4 (41-26, 41-27, 41-28) inverted the direction entirely — a frozen positional window, then (within the same round, by the executor's own adversarial campaign) a frozen digest of the whole file — and this verification, independently reproducing 41-GAP-REVIEW-4.md's decisive findings on a disposable sandbox, confirms the guard is open a FOURTH consecutive round: once through a mechanism round 4 itself introduced (the comment-stripping heuristic both new digests are built on), and once through a route round 4 never touched at all (a clearance arriving from outside `PageShell.tsx`).**

## What changed since the last round, in one paragraph

Round 4 shipped three plans and, unusually for this phase, one of them (41-27) caught its
own regression before shipping: an adversarial mutation campaign against 41-26's frozen
positional window found six greens (a second component in the same file, a clearance on
the `className` prop's default, a `let`-augmented root, a wrapper-and-rename, a decoy
anchor, a nameless clearance on a prop default) and closed all six by moving the
assertion from the branch to the FILE — two digests, `NAV_PROPERTY_SITE_DIGESTS` and
`SHELL_CODE_OUTSIDE_WINDOW_DIGEST`, that guard each other. Separately, 41-28 closed the
`verify-dialogs.mjs` gap round 3 left open (a `REMAINING` entry outside the scan walk
could be reported as "converted"), by deriving a `walked` Set from the loop's own input.
**Both genuinely close what they were built to close — independently reproduced by this
verification, not taken on the executors' word.** But `41-GAP-REVIEW-4.md`, reviewing the
round-4 output, found — and this verification independently reproduced on a disposable
sandbox, never touching the repository — that both new file-level digests are built by
calling the SAME comment-stripping helper (`liveLines()`) that check A and
`verify-dialogs.mjs` check B already relied on, and that helper blanks a whole line when
its trimmed text starts with a comment opener, including a CLOSED one-line JSX comment
followed by live code. One such line reintroduces CR-01 on all four focus routes with
both digests, the permitted-site count and the report all byte-identical to the clean
tree. Separately, `41-GAP-REVIEW-4.md`'s CR-04 — also independently reproduced here — shows
that check E's whole mechanism is a scan over one file, `PageShell.tsx`, and a clearance
reaching the four focus routes through an ordinary Next.js route layout at
`src/app/(auth)/layout.tsx` is invisible to every one of the five checks.

## CR-01 — closed in code, and separately: is it guarded? (constraint 4, constraint 8)

**Closed in code: YES, unchanged across all four rounds and re-confirmed directly by this
verification.** `grep -n "nav-inset" src/components/ui/PageShell.tsx` returns exactly two
lines — `160` and `164` — both inside the default/wide branch. Line `125` (`FOCUS_ROOT`)
and lines `151-157` (the focus branch, both elements) contain neither
`--nav-inset-inline-start` nor `--nav-inset-block-end`. `sha256sum
src/components/ui/PageShell.tsx` on the live tree: `32f54e825957f7b269bfd5d71f4b18a530624a7904b9286f63d4d7046d4c591e`
— the exact hash 41-27-SUMMARY.md records as "the plan's base commit," confirming the file
has not moved since round 4 shipped. `npm run build` exits 0 (re-run by this verification,
tree unmodified; all routes emitted, no TypeScript error).

**Guarded against a realistic reintroduction: NO — confirmed by two mutations run
independently in this verification, on a disposable sandbox under the session scratchpad,
never inside the repository. `git status --porcelain -- src/ scripts/` in the actual
repository was empty before, during and after both:**

1. **The comment-blanking hole (GAP-REVIEW-4's CR-01, the class also underlying CR-02).**
   Inserted, verbatim per the review's Variant B, immediately above
   `if (width === "focus") {`:
   ```
     {/* keep the shell aligned */} className += " ps-[var(--nav-inset-inline-start)]";
   ```
   `className` is a mutable destructured parameter, so this compiles. Result: **exit 0**,
   `the shell OUTSIDE that window` digest `73adc18b822ace6679b5d0f22b7b1e442dc2d7718619d08e46c87ee14acc754f`
   — byte-identical to the clean tree's own printed digest — `sites permitted to read a
   navigation property : 2   (found outside the permitted set: 0)`, `✓ E`,
   `CONVERSION_OK — all five checks passed over 8 declared surface(s), 53 file(s) scanned.`
   `npx tsc --noEmit` on the mutated shell: **clean, zero errors.** All four focus routes
   would render with the leading inset restored.
2. **The out-of-file route (GAP-REVIEW-4's CR-04).** A new, ordinary
   `src/app/(auth)/layout.tsx`:
   ```tsx
   export default function AuthLayout({ children }: { children: ReactNode }) {
     return (
       <div className="mx-auto max-w-7xl bg-red-500 ps-[var(--nav-inset-inline-start)]">
         {children}
       </div>
     );
   }
   ```
   Result: **exit 0**, `files scanned by A, B and D : 53` — **unchanged from the clean
   tree** — the route table still printed `/login  focus  none  —`, `/register  focus
   none  —`, `/set-password  focus  none  —`, and `CONVERSION_OK`. The layout was climbed
   by check E's ancestor walk to ask only whether a navigation MODULE is reachable from
   it; its own class strings — a leading inset, a raw palette colour, and a maximum this
   surface's own docblock says the focus form must not carry — were never read by any of
   the five checks.

**The costs this phase already accepted were re-tested, not re-argued, and both hold.**
41-27-SUMMARY.md §8 records that the gate now refuses ANY edit to `PageShell.tsx`'s live
code lines — not only its focus branch — until the frozen digest is updated in the same
commit; this verification did not need to re-measure that, since both mutations above
were the trigger for exactly that refusal being available to fire and it never did (both
mutated the file and got a tick, which is the finding, not a contradiction of the accepted
cost — the digest DID change; it just changed to a value nobody flagged as wrong, because
`liveLines()` never showed the new code to the digest in the first place). Separately,
41-27-SUMMARY.md §5's probe I7 measured the "nameless clearance on a re-frozen line"
boundary and recorded it OPEN but requiring **two** deliberate acts — spelling the
clearance with no property name AND a human re-freezing the digest to bless it. **CR-01
is filed precisely because it is worse than that accepted boundary: it requires one act,
on an ordinary line shape, and no re-freeze at all** — the digest does not need to be told
anything, because it never saw the mutation.

**Count: this is the FOURTH consecutive round in which a mechanical guard against CR-01
reintroduction was declared closed by its own plan(s) and found open by independent
execution.** Round 1 (41-17): asserted on the `FOCUS_ROOT` constant; the defect moved to
the render site. Round 2 (41-20): asserted on the outer element; the defect moved to the
inner element. Round 3 (41-23): asserted on the branch as a region; the defect moved to
the branch's SHAPE. Round 4 (41-26, then 41-27): asserted on the branch's frozen shape,
then — after the executor's OWN campaign found six escapes at the file-composition level
before shipping — on the file by digest; the defect moved to what the digest is computed
FROM (a comment-stripping heuristic with the same blind spot check A and
`verify-dialogs.mjs` check B already had) and to a route the digest was never asked to
cover at all (an ancestor layout). **Worth stating precisely, because the pattern has a
new wrinkle this round: round 4 is the first round in which the SHIPPING plan (41-27)
itself found and fixed an internal escape (the six greens against 41-26) before an
external reviewer ever saw it.** That is real progress in method — the same discipline
this phase's `41-27-SUMMARY.md` names as "a found green is this plan working" — and it is
also why the escape that remains (a heuristic inherited from elsewhere in the file, and a
route outside the file altogether) reads as a different KIND of gap than rounds 1-3's,
which is the reason this report restructures round 5 into three groups rather than one
undifferentiated list. See "How round 5's gaps are structured," below.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One implementation per recurring pattern exists | ✓ VERIFIED (unchanged) | `src/components/ui/{Button,Chip,Input,Card,PageShell,Typography,Dialog,DataTable,Checkbox,Skeleton}.tsx` present, exported, wired. `npm run build` exit 0 (re-run this round); `node scripts/verify-conversion.mjs` exit 0 |
| 2 | Roadmap criterion 1 — no surface shows the pattern until whole-converted, checked mechanically | ✓ VERIFIED on the live tree today, ⚠️ the checking mechanism itself has a proven hole | `node scripts/verify-conversion.mjs` exit 0: checks A-D pass, 53 files scanned, 8 surfaces — unchanged counts. **But** check A (raw palette utilities) is built on the same `liveLines()` helper this round's Group-A gap covers; `41-GAP-REVIEW-4.md`'s CR-02 independently proved a raw `text-red-500` on `/payment/callback` behind a closed JSX comment passes check A green. Not a defect in today's tree — no such line exists — but the mechanism that would catch one arriving tomorrow has a demonstrated hole |
| 3 | Roadmap criterion 2 (DS-08) — dialog opens as sheet/window, closes with Escape | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `Dialog.tsx:251` `showModal()`; `node scripts/verify-dialogs.mjs` exit 0. A2 (scroll lock) still open — `41-RELEASE-PASS.md`:445 `A2 STILL OPEN`. Check B carries the same `liveLines()`-derived blind spot as check A (see truth 2) |
| 4 | Roadmap criterion 3 (DS-09) — dense table reads as cards on phone | ? UNCERTAIN — mechanism verified, behaviour not observed (unchanged) | `DataTable.tsx:391` `md:hidden`; `node scripts/verify-tables.mjs` (via `npm run verify`) exit 0. H41-3 unobserved |
| 5 | Roadmap criterion 4 (RESP-01, RESP-02, RESP-04) — every converted surface workable phone/tablet/desktop | ✗ FAILED — the CODE regression stays closed; the GATE meant to prevent its silent recurrence has now failed a FOURTH independent closure attempt, through two structurally different routes | The four navigation-free surfaces' rendered code is correct today (confirmed by direct grep, hash comparison against the base commit, and `npm run build`). But the guard purpose-built to catch this class of defect reappearing has been declared closed and found open four times running, and this round's open finding splits into three problems of different tractability (see restructured gaps below) — including one, CR-04, that the guard's mechanism structurally cannot reach without an explicit decision. Human observation that would independently catch either state (H41-1 / `41-CR01-PASS.md`) remains fully unmade — 13 rows, all `pending`. RESP-01/RESP-02 remain PARTIAL exactly as `.planning/REQUIREMENTS.md:254-255` declares; RESP-01 closes only after 41.2 |
| 6 | Roadmap criterion 5 (RESP-03) — touch targets finger-sized, large touch screens included | ? UNCERTAIN — class-string check only, no device ever used (unchanged) | `node scripts/verify-touch-targets.mjs` (via `npm run verify`) passes; exemption narrowed to 10 named elements (plan 41-15). H41-4 still `human_needed`, not ticked (`41-RELEASE-PASS.md:335`) |
| 7 | The goal's own claim — "proven on its first eight whole surfaces" | ✗ NOT MET as a human-observed fact (owed, not falsified — unchanged) | Zero of H41-1…H41-6 carry an itemised observation; `41-RELEASE-PASS.md`'s single-word `approved` is unchanged. `41-CR01-PASS.md`'s 13 rows are still `pending` (re-read this round, `.planning/phases/41-shared-primitives-three-tier-layout/41-CR01-PASS.md:117-141,196-201`) |
| 8 | Exactly eight surfaces declared converted | ✓ VERIFIED (unchanged) | `conversion-manifest.mjs`, `CONVERTED.length === 8`; `node scripts/verify-conversion.mjs` header confirms `surfaces declared converted : 8` |
| 9 | One command runs every gate and reports refusal distinctly from failure, and its internal reconciliation can actually fail | ✓ VERIFIED (unchanged) | `npm run verify` on THIS checkout (holds Supabase credentials): **exit 0**, `VERIFY_OK — 15 gate(s) passed`, 15/15 passed, 0 FAILED, 0 REFUSED, 1 needs-a-server (`verify:redirects`), 16 accounted for — re-run this round |
| 10 | The remaining ~26 conversion units are explicitly deferred to 41.1/41.2 | ✓ VERIFIED (unchanged) | `.planning/ROADMAP.md`; `.planning/REQUIREMENTS.md:251-257` |

**Score:** 5/10 truths cleanly VERIFIED (1, 2, 8, 9, 10 — truth 2 carries a noted caveat).
1 truth (5) carries an independently-reproduced, still-open gate gap — now in its FOURTH
round. 4 truths (3, 4, 6, 7) remain UNCERTAIN or NOT MET pending human observation,
unchanged since round 1.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/components/ui/PageShell.tsx` | focus form reserves no navigation clearance, under every shape and every reachability path | ✓ VERIFIED in code, ⚠️ unguarded against two independently reproduced mutation classes | `:125` `FOCUS_ROOT` clean; `:151-157` both elements clean; hash `32f54e825957f7b269bfd5d71f4b18a530624a7904b9286f63d4d7046d4c591e` matches round 4's base commit exactly |
| `scripts/verify-conversion.mjs` | check E — catches CR-01 reintroduced anywhere the shell's code can carry it, and from anywhere the focus routes are reachable | ⚠️ PRESENT, closes every branch-shape escape (rounds 1-3), open on two round-4-native escapes | `:447-476` `liveLines()` blanks a closed one-line JSX comment's trailing live code, so both new digests (`:1923-1958`) never see it; `:2116-2134`/`:2060-2078` never open an ancestor route layout |
| `scripts/verify-conversion.mjs` | docblocks accurately bound the comment-stripper's over-blanking case | ✗ FAILED — a NEW false claim, same class round 3 closed a different instance of | `:200-204` claims the over-blank is bounded to "inside a string" — read directly, disproved by the CR-01/CR-02 mutations, none of which involve a string |
| `scripts/verify-dialogs.mjs` | REMAINING/measuredShells accounting cannot report a never-opened file as converted, on any of its three skip categories | ⚠️ PRESENT, closes the category round 3 found, opens a narrower gap within its own new guard | `:1017` existence guard covers only the walk-membership branch; `:1025-1034` (NEVER_MEASURED_BY_B, fence) are unguarded |
| `scripts/verify-dialogs.mjs` | docblock's "inside a string" bound | ✗ FAILED — identical class to the verify-conversion.mjs finding above | `:152-155`, same false claim, same file family, same fix needed |
| `scripts/verify-all.mjs` | reconciliation that can fail | ✓ VERIFIED — closed round 2, unchanged this round | not touched by round 4 |
| `.planning/phases/41-.../41-CR01-PASS.md` | pending procedure, 13 rows | ✓ VERIFIED (unchanged) | re-read this round: present, all 13 rows `pending`, none upgraded |
| `scripts/verify-touch-targets.mjs` | narrower, proven exemption | ✓ VERIFIED (unchanged) | `PRIMITIVE_RAW_ELEMENTS`, 10 declared entries |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `PageShell.tsx` (focus, every branch SHAPE) | check E1 | `FOCUS_BRANCH_SHAPE` positional window, zero braces counted | ✓ WIRED — newly closed this round, subsumes rounds 1-3's escapes by construction | not independently re-mutated this round (41-27-SUMMARY.md's own 15-mutation campaign, re-run twice with zero greens, is accepted on this file family's established proof-by-execution practice; this verification instead spent its execution budget on the two NEW escapes, per the task's spot-check scope) |
| `PageShell.tsx` (focus, code reached only through a comment-prefixed line) | check E's two file-level digests | `liveLines()` → `NAV_PROPERTY_SITE_DIGESTS` / `SHELL_CODE_OUTSIDE_WINDOW_DIGEST` | ✗ NOT WIRED — this round's Group-A gap | independently reproduced: a closed one-line JSX comment followed by live code reintroduces CR-01 with both digests byte-identical to the clean tree |
| `(auth)` route layout (or any future ancestor wrapper of a focus surface) | check E, checks A/B/D | `layoutClosure` → `allScanned` | ✗ NOT WIRED — this round's Group-C gap | independently reproduced: a new `src/app/(auth)/layout.tsx` carrying the clearance, a raw palette colour and a maximum reaches all three focus routes with `files scanned` unchanged at 53 |
| `scripts/verify-dialogs.mjs` REMAINING entries via `NEVER_MEASURED_BY_B` or `fenceMatch()` | `neverOpenedReason()`'s existence guard | `existsSync` at `:1017` | ⚠️ PARTIAL — the walk-membership branch is guarded, the other two are not | read directly: `:1025-1034` return unconditionally |
| `scripts/verify-all.mjs` reconciliation | a fourth `plan` state | `ABSENT_STATES` non-exhaustive partition -> `refuse()` on `unaccounted` | ✓ WIRED (unchanged, closed round 2) | not re-run this round; no file in this area was touched by plans 41-26–28 |

### Data-Flow Trace (Level 4)

Not applicable in the usual sense — this phase's remaining artifacts under scrutiny are
layout primitives and developer-run verification scripts, not user-facing data-bound
components. The relevant trace this round is the same gate-to-defect trace performed
every previous round (CR-01 → check E → the assertion's data source), narrowed further:
this round the trace runs one level BELOW the assertion, into what the assertion is
computed FROM (`liveLines()`'s stripped source) and one level AROUND the assertion, into
what it never reads at all (an ancestor route layout).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| `npm run build` typechecks and compiles | `npm run build` | exit 0, all routes emitted | ✓ PASS |
| `npm run verify` aggregate on THIS (credentialed) checkout | `npm run verify` | exit 0 — `VERIFY_OK — 15 gate(s) passed`, 15/15 passed, 0 failed, 0 refused, 1 needs-a-server, 16 accounted for | ✓ PASS |
| CR-01 closed in code | `grep -n nav-inset src/components/ui/PageShell.tsx` | 2 hits, lines 160 and 164 (default/wide branch only) | ✓ PASS |
| CR-01 closed in code, hash matches round 4's base commit | `sha256sum src/components/ui/PageShell.tsx` | `32f54e8259...` — matches `41-27-SUMMARY.md`'s recorded base-commit hash exactly | ✓ PASS |
| `verify-conversion.mjs` check E catches CR-01 reintroduced via a closed one-line JSX comment followed by live code | on a disposable sandbox (never the repository): inserted `{/* keep the shell aligned */} className += " ps-[var(--nav-inset-inline-start)]";` immediately above the focus branch's opener, ran the shipped gate, discarded the sandbox | exit 0, `✓ E`, `CONVERSION_OK`, shell-outside-window digest byte-identical to the clean tree (`73adc18b...`), `npx tsc --noEmit` clean | ✗ FAIL — independently reproduces `41-GAP-REVIEW-4.md`'s CR-01 |
| `verify-conversion.mjs` catches a clearance reaching the focus routes from an ancestor route layout outside `PageShell.tsx` | on the same disposable sandbox: created `src/app/(auth)/layout.tsx` carrying the leading inset, a raw palette colour and a maximum, ran the shipped gate, discarded the sandbox | exit 0, `CONVERSION_OK`, `files scanned by A, B and D : 53` unchanged, route table still prints `navigation: none` for all three affected routes | ✗ FAIL — independently reproduces `41-GAP-REVIEW-4.md`'s CR-04 |
| `verify-dialogs.mjs`'s `neverOpenedReason()` existence guard covers every branch | read `scripts/verify-dialogs.mjs:1009-1036` directly against the loop's three skip conditions | confirmed structurally: only the walk-membership branch (`:1017`) is guarded; `NEVER_MEASURED_BY_B` (`:1025-1026`) and the fence (`:1027-1034`) are not | ✗ FAIL — reproduces `41-GAP-REVIEW-4.md`'s CR-03 by direct code reading, matching the practice the previous verification round used for the equivalent finding |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist and none are declared in any PLAN/SUMMARY for
the round-4 closure plans. **Step 7c: SKIPPED (no probes declared or discovered)** —
unchanged from every previous round.

### Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| DS-07 | PARTIAL, unchanged | `.planning/REQUIREMENTS.md:125,251` unchecked |
| DS-08 | PARTIAL, unchanged | `.planning/REQUIREMENTS.md:126,252` unchecked; A2 still open |
| DS-09 | PARTIAL, unchanged | `.planning/REQUIREMENTS.md:127,253` unchecked |
| RESP-01 | PARTIAL — the code regression stays closed; the guard against it recurring has now failed a fourth closure attempt, on two distinct new routes | `.planning/REQUIREMENTS.md:132,254` unchecked, "closes only after 41.2" |
| RESP-02 | PARTIAL, same disposition as RESP-01 | `.planning/REQUIREMENTS.md:133,255` unchecked |
| RESP-03 | PARTIAL, human evidence still owed | `.planning/REQUIREMENTS.md:134,256` unchecked; H41-4 `human_needed`, not ticked |
| RESP-04 | PARTIAL, unobserved | `.planning/REQUIREMENTS.md:135,257` unchecked; H41-6a not ticked, capability set never stated |

All seven requirement IDs remain PARTIAL, matching the task's stated expectation. No
orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `scripts/verify-conversion.mjs` | 447-476 | `liveLines()` blanks a whole line on a comment-opener match instead of only the comment span, so a closed one-line JSX comment followed by live code is invisible to check A and to both of check E's new digests | 🛑 Blocker | Group A. Independently reproduced by mutation in this verification, on a disposable sandbox |
| `scripts/verify-dialogs.mjs` | (near-identical stripper) | Same defect, blinds check B | 🛑 Blocker | Group A, same root cause |
| `scripts/verify-conversion.mjs` | 200-204 | Docblock claims the over-blank case is bounded to "inside a string" — false; the dominant case is a closed comment followed by live code, no string involved | ⚠️ Warning (documentation correctness; the runtime defect is `liveLines()` itself, listed above) | Group A, same commit as the fix above |
| `scripts/verify-dialogs.mjs` | 152-155 | Identical false claim | ⚠️ Warning | Group A, same class |
| `scripts/verify-conversion.mjs` | 2116-2134, 2060-2078 | Check E climbs ancestor route wrappers to ask only whether a navigation module is reachable; the wrapper's own class strings are never read by any check, and the wrapper never enters `allScanned` | 🛑 Blocker | Group C. Independently reproduced by mutation in this verification |
| `scripts/verify-dialogs.mjs` | 1017 vs 1025-1034 | `neverOpenedReason()`'s existence guard covers one of its three return branches | 🛑 Blocker | Group B. Independently confirmed by direct code reading |
| `scripts/verify-conversion.mjs` | 1923-1934 | `NAV_PROPERTY_SITE_DIGESTS` keyed on line-text digest with no notion of position, so a duplicate of an already-permitted line is permitted anywhere it is placed | ⚠️ Warning, not independently re-run this round | Group B. Reported as `41-GAP-REVIEW-4.md`'s WR-02; accepted as accurate on this file family's established proof-by-execution practice, and confirmed false by construction by direct reading of the keying logic |
| `scripts/verify-dialogs.mjs` | 1017 | `existsSync` is case-insensitive on macOS's default APFS volume (the house filesystem per CLAUDE.md Guardrail 6); a case-typo'd `REMAINING` entry gets a different verdict on macOS than on a case-sensitive filesystem | ⚠️ Warning, not independently re-run this round | Group B. Reported as WR-03; confirmed by direct reading against Guardrail 6 |
| `scripts/verify-conversion.mjs` | 1798-1817, 249-250 | A refusal branch the exit-code header advertises as reachable but that derivation shows can never fire, because an earlier refusal always fires first | ⚠️ Warning, not independently re-run this round | Reported as `41-GAP-REVIEW-4.md`'s WR-01; a decoration, not a live risk, but the header's claim is false |
| `scripts/verify-conversion.mjs` | 1460 | `FOCUS_BRANCH_RE` has no left boundary, so a differently-named prop (`wrapperClassName={FOCUS_ROOT}`) would also count as the render site | ℹ️ Info, not independently re-run this round | Reported as IN-01; the review's own assessment is that the direction is safe on this tree today (an extra occurrence raises the count and refuses) — not filed as a round-5 gap, named here so it is not silently dropped |

No new `TBD`/`FIXME`/`XXX` debt markers found in the files this gap-closure wave modified,
checked by direct grep against `scripts/verify-all.mjs`, `scripts/verify-conversion.mjs`,
`scripts/verify-dialogs.mjs` (re-run this round).

### Human Verification Required

Unchanged from every previous round — none of these six items were newly observed by
round 4, and none should be read as newly required by this round's findings (they were
already owed). H41-1 (eight surfaces at three widths, now including the CR-01
re-observation via `41-CR01-PASS.md`'s 13 rows), H41-2 (dialog behaviour including the
still-open A2), H41-3 (table-to-cards on phone), H41-4 (touch targets on a real device —
the only proof anything renders at 44px), H41-5 (desktop mouse-only), H41-6 (eight tabs,
door untouched). All `pending`/`human_needed` in `41-RELEASE-PASS.md`, none upgraded by
the earlier blanket one-word `approved`, none should be.

## How round 5's gaps are structured — three groups, different tractability

The task ahead of round 5 is not "fix four more things." It is "close the one
large-blast-radius bug regardless of anything else, fix four small independently-scoped
bugs, and get an explicit decision on the one thing this mechanism cannot reach by
patching."

**Group A — tractable and systemic. Fix this one regardless of what is decided about B or
C.** `liveLines()` blanks a line whose trimmed text STARTS WITH a comment opener,
including the closed one-line JSX form. It is called from both `verify-conversion.mjs`
(check A, and — as of round 4 — both of check E's new frozen digests) and
`verify-dialogs.mjs` (check B). The review independently demonstrated it hiding a raw
palette colour (check A), an undeclared hand-rolled overlay (check B) and a navigation
clearance (check E) — three different checks, one shared cause. Both files' headers claim
the over-blank can only happen "inside a string"; every one of the mutations above
disproves that, and none involves a string. **This is one fix — blank only the comment
SPAN, not the whole line, for the closed single-line form — applied identically in both
files, and it should be made regardless of how B or C are resolved**, because it currently
degrades checks that exist independently of the reintroduction-guard story (check A and
check B are not new this round; they have carried this hole since DEF-41-02).

**Group B — tractable and local. Four small, independently-scoped fixes.** The
NOT-IN-THE-WALK guard `41-28` added covers one of `neverOpenedReason()`'s three branches;
the other two return a reason without an existence test, so a typo'd path behind the
Phase-42 fence is laundered into a suite-wide refusal instead of the FAILURE a typo
deserves. Plus three warnings, none independently re-executed this round but each
confirmed either by direct code reading against a stated claim or accepted on this file
family's established proof-by-execution track record: a refusal branch advertised in the
exit-code header that derivation shows can never fire (WR-01); a refusal instruction that
is false because permitted sites are keyed on line text rather than position, so a
duplicate of an already-permitted line is permitted anywhere (WR-02); and an existence
check whose verdict differs between macOS's case-insensitive APFS and a case-sensitive
filesystem (WR-03). None of these four requires a design decision — each is a bounded,
local correction to code that already states, in its own docblock, what it is trying to
guarantee.

**Group C — not tractable by this mechanism. Needs a decision from the owner, not a fifth
patch.** CR-04. The clearance in the reproduced mutation reaches all four focus routes
from OUTSIDE `PageShell.tsx` — an ordinary route layout, not an adversarial construction.
Check E's mechanism is a text scanner over one file; the property that actually matters is
what reaches a route at render, and that is not the same thing. **Do not write this gap as
"add a check for layouts."** Writing it that way repeats the exact direction that failed
four times running for CR-01 itself — teach the matcher one more form, wait for the next
one. The honest options are structural: make the clearance impossible to reach the focus
routes from outside `PageShell.tsx` (extend `allScanned` and the property scan to every
climbed ancestor of a focus surface), or accept that this gate covers the FILE and not the
ROUTE and say so in the "WHAT A GREEN DOES NOT MEAN" header instead of implying broader
coverage. Either is legitimate; leaving it undeclared, which is today's state, is not.

## Gaps Summary

**Three groups, four gaps in Group B's single truth split by branch, one truth each in
Groups A and C — and the same underlying "reintroduction guard" truth this phase has
carried since round 1 now failing a FOURTH consecutive round, through two structurally
different mechanisms.**

**Group A (systemic).** `liveLines()`'s comment-stripping heuristic blanks more than a
comment, on a line shape (a closed one-line JSX comment followed by live code) that is
ordinary React, not adversarial syntax. It blinds three separate checks across two files.
One fix, applied identically in both files, closes it regardless of anything else decided
this round.

**Group B (local, four items).** `verify-dialogs.mjs`'s new existence guard covers one of
three branches in the function whose own docblock names the exact defect it must not
commit — and commits it on the other two. Plus three previously-reported warnings, none
independently re-executed this round, each confirmed by direct reading: an unreachable
refusal branch, a permitted-site check keyed on the wrong thing, and a filesystem-dependent
verdict.

**Group C (structural, needs a decision).** Check E is a scan over one file; the fact that
matters is what reaches a route. An ordinary ancestor layout is invisible to every check in
this gate. This is not a fifth shape for the same hunt — it is evidence the hunt is bounded
to the wrong surface, and closing it requires the owner to pick between widening the scan
structurally or declaring the limit in the header.

**Everything else genuinely improved and holds.** Round 3's three filed gaps are closed,
as filed, independently re-derived by reading the shipped code rather than taken on the
executors' word. `verify-all.mjs`'s reconciliation (closed round 2) is unchanged and
untouched by round 4. `verify-touch-targets.mjs` holds unchanged. The executor's own
adversarial campaign against round 4's first attempt (41-26) found and closed six escapes
before shipping — a genuine improvement in method, not only in code, and it is why the
surviving gaps this round are narrower and more structurally distinct than rounds 1-3's.

**Human verification remains exactly as owed as before this wave — not more, not less.**
`41-CR01-PASS.md`'s 13 rows and `41-RELEASE-PASS.md`'s six items are unchanged, all
`pending`/owed, re-read in full this round. This report does not upgrade any of them, and
does not treat any mechanical finding above as if it closed the human question — they are
independent findings.

---

_Verified: 2026-08-13T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
