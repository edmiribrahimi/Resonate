---
phase: 41-shared-primitives-three-tier-layout
verified: 2026-08-12T13:24:42Z
status: gaps_found
score: 5/10 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Every converted surface is workable on phone, tablet and desktop (roadmap criterion 4 / RESP-01, RESP-02)"
    status: failed
    reason: "PageShell width=\"focus\" reserves navigation clearance (--nav-inset-inline-start, --nav-inset-block-end) unconditionally, but the four surfaces declared converted at width=\"focus\" — /login, /register, /set-password, /payment/callback — mount no navigation at all (no (auth) layout.tsx, no (public)/payment layout.tsx, no AppNav/MobileNav import in any of the four). Confirmed live in the current tree, not a stale finding: src/components/ui/PageShell.tsx:77-83 still writes both insets unconditionally in the focus branch, and grep confirms only two layout.tsx files exist under src/app (src/app/layout.tsx and the (work) one). At >=768px this pushes the centred card 112px right of true viewport centre; at <768px it adds ~96px of dead bottom padding. This is a regression from pre-phase behaviour (/login was previously centred with no such offset) on the two most exposed unauthenticated surfaces in the product, and the phase's own review (41-REVIEW.md CR-01) already names it Critical. No plan's SUMMARY discloses it, and no gate can see it (verify-conversion.mjs check D only checks that a page declares no width of its own, not that the declared clearance matches a mounted nav)."
    artifacts:
      - path: "src/components/ui/PageShell.tsx"
        issue: "focus branch (lines 77-83) writes ps-[...--nav-inset-inline-start...] and pb-[...--nav-inset-block-end...] unconditionally, with no nav-aware opt-out"
      - path: "src/app/(auth)/login/page.tsx"
        issue: "renders PageShell width=\"focus\" with no navigation mounted anywhere in its closure; card sits off-centre >=768px, has superfluous ~96px bottom padding <768px"
      - path: "src/app/(auth)/register/page.tsx"
        issue: "same defect"
      - path: "src/app/(auth)/set-password/page.tsx"
        issue: "same defect"
      - path: "src/app/(public)/payment/callback/page.tsx"
        issue: "same defect, on the surface that reports a payment's outcome"
    missing:
      - "PageShell needs a nav-aware opt-out for the focus branch (or the four focus routes need the insets dropped outright), plus a G4 assertion that a converted page whose closure contains no AppNav/MobileNav import does not read --nav-inset-*"
      - "Re-observe /login, /register, /set-password and /payment/callback at 390/768/1440 after the fix — H41-1 already asks for exactly this and would have caught the original regression had it been executed"
---

# Phase 41: Shared Primitives & Three-Tier Layout Verification Report

**Phase Goal:** The shared layer exists — one implementation per recurring pattern, three tiers, finger-sized targets — and is proven on its first eight whole surfaces. The remaining surfaces convert in 41.1 and 41.2 onto this layer, unchanged.
**Verified:** 2026-08-12T13:24:42Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One implementation per recurring pattern exists (Button/IconButton, Chip/Badge, Input/Textarea/Select, Card, PageShell, Typography, Dialog, DataTable, Checkbox, Skeleton, Toast) | ✓ VERIFIED | `src/components/ui/{Button,Chip,Input,Card,PageShell,Typography,Dialog,DataTable,Checkbox,Skeleton}.tsx` and `src/components/toast/*` all present, exported and importer-checked below |
| 2 | Roadmap criterion 1 — no surface shows the pattern until it is whole-converted; a wrong entry is checked mechanically | ✓ VERIFIED | `node scripts/verify-conversion.mjs` → exit 0 on this tree (re-run 2026-08-12); `scripts/conversion-manifest.mjs` `checkManifest()` → `{ ok: true, refusals: [] }` (re-run 2026-08-12) |
| 3 | Roadmap criterion 2 (DS-08) — a dialog opens as sheet/window from one implementation and closes with Escape | ? UNCERTAIN — mechanism verified, behaviour not observed | `src/components/ui/Dialog.tsx:251` calls native `dialog.showModal()`; `node scripts/verify-dialogs.mjs` exit 0. **But** research assumption A2 (background scroll lock under `showModal()`) is explicitly still open — `41-RELEASE-PASS.md` H41-2 step 4/§9 row H41-2d: "A2 STILL OPEN — nothing reported." No human ever pressed Escape or scrolled behind the panel |
| 4 | Roadmap criterion 3 (DS-09) — a dense table reads as cards on a phone | ? UNCERTAIN — mechanism verified, behaviour not observed | `src/components/ui/DataTable.tsx:391` `md:hidden` card branch, imported by `src/components/admin/MemberTable.tsx`; `node scripts/verify-tables.mjs` exit 0. **But** `41-RELEASE-PASS.md` H41-3/§9: "No card, no column and no drag was reported back... Criterion 3's judgement half (DS-09) is not ticked" |
| 5 | Roadmap criterion 4 (RESP-01, RESP-02, RESP-04) — every converted surface is workable on phone/tablet/desktop; content stops widening; work-surface nav visible without a menu from tablet width up | ✗ FAILED (partial) | RESP-02's cap works for `default`/`wide` widths (`PageShell.tsx:86-92`, `max-w-5xl`/`max-w-7xl`, confirmed). RESP-04's eight-tab column is structurally sound (`src/components/staff/StaffNav.tsx:107-135`, `md:flex md:flex-col`, no horizontal scroll) but never human-observed (H41-6a: "not ticked"). **RESP-01/workable fails outright on 4 of the 8 declared surfaces — see gap above (CR-01).** |
| 6 | Roadmap criterion 5 (RESP-03) — touch targets stay finger-sized wherever the input is a finger, large touch screens included, on every converted surface | ? UNCERTAIN — class-string check only, no device ever used | `node scripts/verify-touch-targets.mjs` exit 0; its own printed verdict: "This is NOT a statement that anything renders at 44px. H41-4 is." `41-RELEASE-PASS.md` H41-4/§9: "`human_needed`. NOT ticked... The owner's approval never stated that a large touch screen was available... criterion 5 (RESP-03) has no evidence at all behind it." Additionally `41-REVIEW.md` WR-04 records that the gate's own file-wide exemption is satisfied by a single occurrence anywhere in a primitive file, so `AppNav.tsx` and `StaffNav.tsx` navigation entries are structurally exempted rather than measured — a gap in the gate's own rigour, independent of the device question |
| 7 | The goal's own claim — "proven on its first eight whole surfaces" | ✗ NOT MET as a human-observed fact (owed, not falsified) | `41-RELEASE-PASS.md` closing section, verbatim: "Approved is not verified... The owner's approval closed the phase gate. It did not fill any of them in." Zero of H41-1…H41-6 carry an itemised observation; the single word `approved` is recorded explicitly as an authorisation, not a measurement. This is reported honestly by the project's own document, not concealed |
| 8 | Exactly eight surfaces are declared converted, matching the goal's own count | ✓ VERIFIED | `node -e "import('./scripts/conversion-manifest.mjs').then(m=>console.log(m.CONVERTED.length))"` → `8` (re-run 2026-08-12): `/payment/callback`, `/login`, `/register`, `/set-password`, `/gallery`, `/admin/formats`, `/admin/members/register`, `/admin/members` |
| 9 | One command runs every gate that can run without a server and reports a refusal distinctly from a failure | ✓ VERIFIED | `npm run verify` re-run on this checkout 2026-08-12, exit 0: "15 gate(s) passed... needs a server, not run 1... MISSING 0... accounted for 16." On a checkout **without** `.env.local` this same command exits 2 (per `41-RELEASE-PASS.md` §0.1, `verify:capabilities` REFUSES) — both are the command working as designed, and the machine dependence is disclosed rather than reported as a bare pass/fail number |
| 10 | The remaining ~26 conversion units are explicitly deferred to 41.1/41.2, not silently dropped | ✓ VERIFIED | `.planning/ROADMAP.md:660-668` ("Scope note, 2026-08-12 — split decided"), `:672-705` (Phase 41.1/41.2 goals and requirement carry-forward), `.planning/REQUIREMENTS.md:251-257` (phase-map for all seven requirement IDs) |

**Score:** 5/10 truths VERIFIED (1 FAILED, 4 UNCERTAIN/owed-to-human-verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/app/globals.css` | `--control`, two layout vars, `@custom-variant pointer-fine-only` | ✓ VERIFIED | `:102` `--control: #A493C0`; `:284-285,302-303` `--nav-inset-block-end`/`--nav-inset-inline-start`; `:538` `@custom-variant pointer-fine-only` |
| `scripts/verify-tokens.mjs` | `'control'` and the two layout names in `KNOWN_TOKEN_NAMES` | ✓ VERIFIED | `:328` `'control'` present |
| `src/app/layout.tsx` | viewport block without `maximumScale`/`userScalable` | ✓ VERIFIED | `:81-87`, comment records the deliberate omission; no such keys present |
| `src/components/ui/Button.tsx` | `IconButton`, `Button`, `FOCUS_RING` exported | ✓ VERIFIED, WIRED | `:71,150,215`; 21 files under `src/` import `ui/Button` |
| `src/components/ui/Chip.tsx` | `Chip`, `Badge` exported | ✓ VERIFIED, WIRED | `:119,227`; importers: `FormatsCatalogue.tsx`, `members/register/page.tsx`, `MemberTable.tsx`, `StaffNav.tsx` |
| `src/components/layout/AppNav.tsx` | product nav in both tiers | ✓ VERIFIED | `:148` `md:fixed md:inset-y-0 md:start-0 md:end-auto md:z-50 md:w-56` (224px column) |
| `src/components/layout/MobileNav.tsx` | thin wrapper, `form="phone"` | ✓ VERIFIED | `:60` `return <AppNav {...props} form="phone" />;` |
| `src/components/staff/StaffNav.tsx` | eight tabs, strip + column forms | ✓ VERIFIED | `staff-tabs.ts:101-131` — 8 labelled entries (Events, Members, Artists, Venues, Formats, Newsletter, Finance, Analytics); `StaffNav.tsx:107-135` column form, `md:flex md:flex-col md:gap-1 md:overflow-visible` |
| `src/components/ui/PageShell.tsx` | three widths, gutter, rhythm, nav clearance | ⚠️ VERIFIED but carries CR-01 (see gap) | `:86-92` correct default/wide caps; `:77-83` focus branch is the defect |
| `src/components/ui/Card.tsx`, `Typography.tsx`, `Input.tsx`, `Skeleton.tsx`, `Dialog.tsx`, `DataTable.tsx`, `Checkbox.tsx` | shells/primitives per plan | ✓ VERIFIED, WIRED | `Card.tsx:51`; `Typography.tsx:53,116`; `Input.tsx:216,247,279` + `:103` `border-control`; `Skeleton.tsx:93,123,160,191` + `:101` `bg-raised`; `Dialog.tsx:251` `showModal()`; `DataTable.tsx:391` `md:hidden`; `Checkbox.tsx` docblock `:6-23` 16px-in-44px contract. All have confirmed importers (see key links) |
| `scripts/conversion-manifest.mjs` | `SPINE`, `PHASE_42_PATHS`, `PRIMITIVES`, `CONVERTED` | ✓ VERIFIED | `CONVERTED.length === 8`, `PRIMITIVES.length === 15`, `SPINE.length === 15`, `checkManifest().ok === true` (re-run 2026-08-12) |
| `scripts/verify-conversion.mjs`, `verify-dialogs.mjs`, `verify-tables.mjs`, `verify-breakpoints.mjs`, `verify-no-viewport-read.mjs`, `verify-touch-targets.mjs` | six new gates | ✓ VERIFIED, all exit 0 re-run 2026-08-12 | Each script's own printed header discloses what it does NOT prove (class strings vs. rendered boxes/behaviour) — confirmed by direct read, not assumed |
| `scripts/verify-all.mjs`, `package.json` | aggregate runner, 16 `verify:*` entries + `verify` | ✓ VERIFIED, WIRED | `package.json:26` `"verify": "node scripts/verify-all.mjs"`; 17 total `"verify` matches; `npm run verify` re-run 2026-08-12: 15 ran, 15 passed, 0 failed, 1 not-run, 16 accounted for |
| `.planning/phases/41-.../41-RELEASE-PASS.md` | H41-1…H41-6, written before the sitting | ✓ VERIFIED | present, dated 2026-08-12, all six sections exist with the pre-written procedure intact |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `globals.css :root` | `@theme inline` | `--color-control: var(--control)` | ✓ WIRED | `verify-tokens.mjs` check A/D passed on re-run |
| `globals.css` | `verify-tokens.mjs KNOWN_TOKEN_NAMES` | `'control'` | ✓ WIRED | confirmed both sides |
| `(admin)/admin/(work)/layout.tsx` | `AppNav.tsx` | `workNav` prop, `StaffNav` column | ✓ WIRED | `(work)/layout.tsx:130-147` mounts `StaffNav` and re-zeroes `--nav-inset-inline-start` for its own subtree only |
| `MobileNav.tsx` | `AppNav.tsx` | `form="phone"` | ✓ WIRED | confirmed |
| `ToastContainer.tsx` | `globals.css` | `--nav-inset-*` read as arbitrary values | ⚠️ WIRED but premise-fragile | `ToastContainer.tsx:62-65`; correct today (single non-provider `useToast` consumer, a work surface) but the premise is unenforced — `41-REVIEW.md` WR-07. Not a phase-41 blocker since it does not misfire today, flagged for awareness |
| `PageShell.tsx` (focus) | `globals.css` | `--nav-inset-*` | ✗ WIRED TO THE WRONG VALUE on 4 surfaces | see CR-01 gap above |
| `scripts/verify-conversion.mjs` | `scripts/conversion-manifest.mjs` | ESM import of `SPINE`/`PHASE_42_PATHS`/`PRIMITIVES`/`CONVERTED` | ✓ WIRED | confirmed by successful re-run |
| Every `PRIMITIVES` entry | at least one importer under `src/` | grep | ✓ WIRED | `Chip`/`Skeleton`/`DataTable`/`Checkbox`/`Dialog`/`Button` all have ≥1 confirmed importer (see artifacts table) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| `npm run build` typechecks and compiles | `npm run build` | exit 0, 40 static pages, 58 routes, compiled in ~7s | ✓ PASS |
| `npm run verify` aggregate runs and reports correctly on this checkout | `npm run verify` | exit 0 — 15 passed, 0 failed, 1 not-run (`verify:redirects`, needs dev server), 16 accounted for | ✓ PASS |
| Exactly 8 surfaces declared converted | `node -e` against `conversion-manifest.mjs` | `CONVERTED.length === 8` | ✓ PASS |
| Individual gates (`verify-conversion`, `verify-dialogs`, `verify-tables`, `verify-breakpoints`, `verify-no-viewport-read`, `verify-touch-targets`) each run and exit 0 | `node scripts/verify-*.mjs` | all exit 0 | ✓ PASS |
| PageShell focus branch still reserves nav clearance unconditionally | direct source read `PageShell.tsx:77-83`, layout enumeration `find src/app -name layout.tsx` | 2 layouts total, neither covers `(auth)` or `(public)/payment` | ✗ FAIL — confirms CR-01 is live, not stale |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist and none are declared in any of the twelve PLAN/SUMMARY files for this phase. **Step 7c: SKIPPED (no probes declared or discovered)** — this phase's mechanical verification is the `verify:*` gate family checked above, not a probe harness.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| DS-07 | 41-01, 03, 04, 05, 06, 07, 08, 09, 10, 12 | A recurring pattern is a shared component, adopted per converted surface | PARTIAL, as declared | ROADMAP explicitly: "all seven partially delivered here." 11 primitives shipped and wired (see artifacts). REQUIREMENTS.md:251 unchecked, phase-mapped `41 → 41.1 → 41.2` |
| DS-08 | 41-04, 09, 12 | Dialog: sheet on phone, window on desktop, one implementation | PARTIAL | Primitive shipped and wired to 3 dialogs (`/admin/formats`). REQUIREMENTS.md:252 unchecked, mapped `41 → 41.2` (`RevealVenueDialog` adopts last). Behavioural half (Escape, scroll-lock/A2) unobserved — see truth 3 |
| DS-09 | 41-10, 12 | Dense table becomes cards on phone | PARTIAL | `DataTable` shipped, wired to `MemberTable`. REQUIREMENTS.md:253 unchecked, mapped `41 → 41.1`. Behavioural half unobserved — see truth 4 |
| RESP-01 | 41-01, 03, 05, 06, 08, 09, 10, 12 | Every surface usable on phone/tablet/desktop | PARTIAL, and one confirmed regression | REQUIREMENTS.md:254 unchecked, explicitly "closes only after 41.2." Within the 8 surfaces this phase claims, **CR-01 is a confirmed FAILURE on 4 of them** — see gap |
| RESP-02 | 41-05, 06, 07, 08, 09, 10 | Content stops widening on large screens | PARTIAL, mostly sound | `default`/`wide` caps correct (`max-w-5xl`/`max-w-7xl`). `focus` width itself does not widen, but is mis-positioned by CR-01, a related but distinct defect |
| RESP-03 | 41-01, 03, 06, 08, 09, 10, 11, 12 | Touch targets finger-sized, large touch screens included | PARTIAL, human evidence owed | `verify:touch-targets` passes structurally; H41-4 explicitly `human_needed`, NOT ticked, no device confirmed. REQUIREMENTS.md:256 unchecked |
| RESP-04 | 41-03, 12 | Work-surface nav visible without a menu from tablet width up | PARTIAL, code sound, unobserved | REQUIREMENTS.md:257 says "lands whole in 41" for the mechanism; code confirms 8-tab stacked column, no scroll, single mount point for all 24 work pages. H41-6a explicitly "not ticked" — no human ever counted the tabs at 768px |

No orphaned requirements found: all seven IDs declared in `.planning/REQUIREMENTS.md` for Phase 41 also appear in at least one plan's `requirements:` frontmatter, and vice versa.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/components/ui/PageShell.tsx` | 77-83 | Unconditional nav-clearance insets on a width form four converted, navigation-free surfaces use | 🛑 Blocker | CR-01 — see gap. Confirmed live by direct source read, not carried over from a stale review |
| `scripts/verify-all.mjs` | 352, 367-372 | Reconciliation check that is provably unreachable and, if reached, would not change the exit code | ⚠️ Warning | `41-REVIEW.md` WR-03. Does not affect today's green (nothing has yet drifted), but the safety net it claims to be does not function |
| `scripts/verify-touch-targets.mjs` | 1028-1052, 1092-1097 | File-wide primitive exemption satisfied by a single occurrence anywhere in the file | ⚠️ Warning | `41-REVIEW.md` WR-04. `AppNav.tsx`/`StaffNav.tsx` navigation entries pass without being individually measured |
| `src/components/ui/Dialog.tsx` | 246-266 | `onClose` fires twice on every programmatic close | ⚠️ Warning | `41-REVIEW.md` WR-02. Harmless for today's 3 idempotent consumers; not harmless for the 14 `REMAINING` dialogs still to convert in 41.1/41.2, one of which is `RevealVenueDialog` (a monotone guard's UI) |
| Twelve further warnings (WR-05…WR-14) and four info items (IN-01…IN-04) | — | gate-integrity and quality defects, none goal-blocking | ℹ️ Info | Documented exhaustively in `.planning/phases/41-shared-primitives-three-tier-layout/41-REVIEW.md`; not re-derived here per task instruction, all confirmed present in the review's own file citations |

No `TBD`/`FIXME`/`XXX` debt markers found in any of the 48 files this phase modified (checked by direct grep, not evoked).

### Human Verification Required

These are owed regardless of the gaps_found status above — they are separate from CR-01 and would remain outstanding even after CR-01 is fixed.

#### 1. §0.2 — the account's capability set

**Test:** Sign in with an account holding `organizer.access`, `catalogue.manage` and `admin.access`, and record which three capabilities it holds.
**Expected:** All three present, so H41-6a's tab count is observable.
**Why human:** Requires a live session against a real (or staging) Supabase project; no worktree in this phase held `.env.local`.

#### 2. H41-1 — eight converted surfaces at 390/768/1280px

**Test:** Open each of the 8 manifest surfaces at all three widths; check for clipping, stretching, and horizontal scroll.
**Expected:** None of the three defects at any width; content capped correctly at `wide`/`default`; the two auth-screen sentence links still read as one line.
**Why human:** Visual layout at real viewport widths; RELEASE-PASS.md records zero itemised observations.

#### 3. H41-2 — dialog on phone and laptop, including assumption A2

**Test:** Open `/admin/formats`, trigger a dialog at 390px and 1280px; press Escape; scroll the page behind the open panel with wheel and touch drag; tab through the panel; confirm Cancel holds focus on `Retire`.
**Expected:** Sheet at 390px, centred window at 1280px, Escape closes, background does not scroll, focus trapped, Cancel focused by default on the destructive dialog.
**Why human:** Real browser behaviour under `showModal()`; A2 (background scroll lock) is explicitly unverified anywhere in this codebase or its history.

#### 4. H41-3 — densest table on a phone

**Test:** Open `/admin/members` at 390px; confirm cards render with all five columns, no sideways scroll, disclosure caret and multi-select toolbar work.
**Expected:** Cards, not a squeezed table; nothing dropped.
**Why human:** Visual card layout and touch-drag behaviour.

#### 5. H41-4 — smallest control on a large touch screen

**Test:** On an actual tablet (not a narrow phone), measure the smallest interactive element on each converted surface with a thumb or the device's own tooling.
**Expected:** ≥44×44 CSS px everywhere except the one declared row-action exception.
**Why human:** This is the only instrument in the repository that measures a rendered box rather than a class string; the RELEASE-PASS.md itself states no green from `verify:touch-targets` substitutes for it. A large touch screen's availability is unconfirmed.

#### 6. H41-5 — desktop mouse-only check

**Test:** At `/admin/members`, 1280px, confirm only the row-action pills are ~36px and nothing else on any converted surface is under 44px.
**Expected:** Exactly one declared exception, nothing else shrunk.
**Why human:** Same reason as H41-4 — no rendered measurement exists in this codebase.

#### 7. H41-6 — eight tabs and the untouched door

**Test:** Count visible work tabs at 768px (no sideways scroll); open `/door` and `/admin/scanner` at every reachable width and confirm the bottom bar, never a 224px column.
**Expected:** Eight tabs, no scroll; door/scanner unchanged.
**Why human:** Visual navigation layout at a real viewport, and a tamper check on a phase-42-owned surface that this phase's diff (mechanically) shows was not touched but whose rendered result nobody has looked at.

### Gaps Summary

One blocking gap: **CR-01**, a confirmed, currently-live layout regression in `PageShell.tsx`'s `focus` width form, affecting 4 of the 8 surfaces this phase declares whole-converted (`/login`, `/register`, `/set-password`, `/payment/callback`). The defect reserves navigation clearance on pages that mount no navigation, miscentring content at ≥768px by 112px and adding ~96px of dead bottom padding on a phone. It is a regression from pre-phase behaviour, was flagged Critical by the phase's own code review, is not mentioned in any plan's SUMMARY, and cannot be seen by any of the six new gates. It reaches the product's front door and its payment-outcome screen.

Independent of that gap, six items of human verification remain fully owed — not degraded, not falsified, exactly as `41-RELEASE-PASS.md` itself already discloses: the owner's single-word "approved" closed the phase gate as an authorisation, and the document's own closing section states plainly that this is not the same as a measurement. RESP-03 (touch targets) and the runtime halves of DS-08 and DS-09 have zero itemised observation behind them. This report does not upgrade that approval into evidence, and does not treat the absence of a report as if nothing were owed.

Everything mechanical — the 11 primitives, the 8-surface manifest, the 15 SPINE entries, the 6 new gates plus the aggregate runner, the scope-split documentation — is genuinely present, wired, and passing on this checkout, confirmed by direct re-execution rather than by trusting any SUMMARY.

---

_Verified: 2026-08-12T13:24:42Z_
_Verifier: Claude (gsd-verifier)_
