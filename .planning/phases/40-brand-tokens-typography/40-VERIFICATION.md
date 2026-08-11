---
phase: 40-brand-tokens-typography
verified: 2026-08-11T22:30:00Z
status: human_needed
score: 6/6 code-level truths verified; 2 observations (H1, H3) pending human sitting
overrides_applied: 0
human_verification:
  - test: "H1 — Fresh install on a device not currently carrying the app; read the label under the home-screen icon"
    expected: "Label reads `re:sonate` — normal e, lower case, with the colon. One attempt per device (iOS: no manifest field updates after install; Android: name/short_name are not in the update list)."
    why_human: "A manifest label cannot be re-tested without uninstalling; no script can read a home-screen icon."
  - test: "H2 — Launch installed app from home screen, observe first frame colour"
    expected: "First frame is #0A0712 (the product's ground), not the previous #0a0a0a"
    why_human: "Splash-screen rendering is a runtime/platform observation, not inspectable from the repository."
  - test: "H3 — The version boundary at the door: warm /door online, ship a release that changes a style, return within 24h with radio off, open /door"
    expected: "Renders fully styled, or does not render at all — never unstyled, never half, never a self-reload. Cache Storage bucket list (others/pages/pages-rsc/pages-rsc-prefetch) inspected after activation. A queued scan (IndexedDB) survives with the radio still off."
    why_human: "Requires a physical device, a shipped release and a radio switched off — the only proof DS-10 (and by extension ROADMAP criterion 5) will ever have. Code is in place; behaviour is not yet observed."
  - test: "H4 (optional) — Inter's tabular-nums feature on a figure column in the interface face"
    expected: "Moot for DS-05 (the data role is mono and aligns by construction) — skip unless free"
    why_human: "Font-feature rendering is a DevTools runtime observation"
---

# Phase 40: Brand Tokens & Typography Verification Report

**Phase Goal:** Colour, surface, line and type resolve to one token set, and a release lands whole on every device rather than half-applied.
**Verified:** 2026-08-11T22:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria, cross-checked against code)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Colour, surface and line resolve to tokens; no page defines its own brand colour | ✓ VERIFIED (with declared, on-record exemptions) | `src/app/globals.css` declares 28 tokens in `:root`, 22 exposed as utilities (`node scripts/verify-tokens.mjs` → `TOKENS_OK`, checks A–G all ✓). `#e5484d` gone from the token layer (`grep -ci e5484d src/app/globals.css` → 0). Bundle carries the values: `.next/static/css/*.css` contains `--ground:#0a0712`. Two literal-hex exemptions are on record and gated by exact path: `ColorSwatchPicker.tsx` (format colours are data on a `formats` row, per UI-SPEC rule 4) and `layout.tsx`'s `viewport.themeColor` (painted before any stylesheet loads). A third occurrence — `src/emails/**` still carrying `#e5484d` (`src/emails/components/email-layout.tsx:17`, `src/emails/templates/registration-confirmation.html:46,55`) — is recorded as **DI-40-01** in `deferred-items.md`, unowned and out of this phase's declared scope (`comms-analytics`, not touched by any of the five plans) |
| 2 | Format colours only where a format is identified; semantics separate from brand; sunset gradient exclusive to SunSet, applied nowhere yet | ✓ VERIFIED | `node scripts/verify-semantic-separation.mjs` → `SEMANTIC_SEPARATION_OK` (5/5 checks). `node scripts/verify-sunset-gradient.mjs` → `SUNSET_GRADIENT_OK` (3/3 checks, `ALLOW_LIST` length 0). Both gates were proven able to fail by mutation (16 mutations across plans 40-01/40-04, all producing the expected non-zero exit) and proven blind to the 15 legitimate `bg-gradient*` files and 2 `from-accent` fades. Gradient signature declared once (`globals.css:177`), applied by zero `.tsx` files (`grep -rn "94deg" src --include="*.tsx"` → no hit) |
| 3 | Display, data, interface each render in exactly one typeface; figures align on a common width | ✓ VERIFIED | Three roles declared in `@theme inline`: `--font-display` (Orbitron), `--font-sans` (Inter), `--font-mono`. `body { font-family: var(--font-sans) }` confirmed in `globals.css:340` and in the emitted bundle. `font-mono` already has 12 consumers under `src/`; the unlayered `.font-mono { font-variant-numeric: tabular-nums }` rule (`globals.css`) applies figure alignment at the role. Orbitron is declared, its variable reaches `<html>` (check G, mutation-proven — removing `inter.variable` fails), but is applied by **zero** surfaces today — stated as the intended shape by D-40-09/40-UI-SPEC §5.1: the display role activates the day Phase 41 builds a surface that needs it, not before |
| 4 | Brand written with normal "e" in titles, social previews, installed app name; reversed glyph only in logo artwork | ✓ VERIFIED for this phase's declared scope | `layout.tsx` carries `re:sonate` in all 4 metadata sites (title/openGraph/twitter/appleWebApp). `manifest.json` `name`/`short_name` → `re:sonate` (`grep -c Resonate public/manifest.json` → 0). `grep -rn "ɘ" src public *.json *.ts` → exactly 1 hit, `layout.tsx:56`, on a comment line explaining the rule (check F/G7, mutation-proven). DS-06's own word is *everywhere*; 25 further literals (Wallet pass, SumUp merchant name, email `From` — the last a Vercel env var no commit reaches) are explicitly out of v1.5 scope per `40-UI-SPEC.md` §6.4 and were never claimed closed by any plan SUMMARY |
| 5 | After a release, no device serves a mixture of old and new styles | **? PENDING — code in place, behaviour not yet observed** | `src/app/sw.ts` purges `["others","pages","pages-rsc","pages-rsc-prefetch"]` on `activate` (confirmed in `public/sw.js`: `addEventListener("activate",e=>{e.waitUntil(Promise.all([...4 names...].map(e=>caches.delete(e))))})`). `cacheOnNavigation: false` in `next.config.ts`, entry worker no longer generated. Precache carries zero documents, one CSS chunk. **This is code, not behaviour** — the only proof is `40-RELEASE-PASS.md` H3, and every `Result:` line in that file reads `pending`. Per `40-VALIDATION.md` and the phase's own SUMMARY (40-05): *"scheduled is not verified"* |

**Score:** 4/5 criteria fully code-verified and observable today; criterion 5 (and DS-06's home-screen half within criterion 4) is code-complete but requires the human sitting in `40-RELEASE-PASS.md` (H1, H2, H3) before it can be marked `passed`. This is not a gap in the plans — it is a class of proof no repository inspection can produce, and the phase's own artifacts say so explicitly and repeatedly.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/verify-tokens.mjs` | G1/G4/G6/G7 — DS-01, DS-10 c.2/3 | ✓ VERIFIED | 7 checks (A–G), green, all mutation-proven including the post-review WR-02/WR-07 fixes (check D no longer red on a legitimate `bg-grad-sunset` use; check G added and wired to catch a missing `inter.variable`) |
| `scripts/verify-semantic-separation.mjs` | G2 — DS-02 | ✓ VERIFIED | 5 checks, green, 9 mutations observed (7 red, 2 refuse) |
| `scripts/verify-sunset-gradient.mjs` | G3 — DS-03 | ✓ VERIFIED | 3 checks, green. Post-review fix WR-03 (check C previously could not fail) and WR-04 (case-sensitivity on retired black) confirmed present and mutation-proven in commit `8600eed` |
| `src/app/globals.css` | 28 tokens, 22 utilities, gradient, type roles | ✓ VERIFIED | All acceptance criteria from plans 40-01/40-02/40-03 confirmed directly: `--font-sans` on `body`, `glow-accent` utilities removed, `--soy` absent, `color-scheme: dark` retained |
| `src/app/layout.tsx` | Inter + Orbitron as `next/font` variables on `<html>`, brand metadata, chrome colour | ✓ VERIFIED | `variable: "--font-inter"` present, both `.variable`s on `<html>` class, `themeColor: "#0A0712"`, single `ɘ` at the documented line |
| `public/manifest.json` | `re:sonate`, `#0A0712` × 2 | ✓ VERIFIED | `node -e` read confirms all 4 values, `icons`/`start_url`/`display`/`orientation` unchanged |
| `src/app/sw.ts` | Additional `activate` listener purging document buckets | ✓ VERIFIED, and CR-01-corrected | Post-review fix confirmed: `DOCUMENT_CACHES = ["others", "pages", "pages-rsc", "pages-rsc-prefetch"]` — `others` is the bucket Serwist's own `pages` rule actually never matches for a GET navigation (the request has no `Content-Type` header), verified against `node_modules/@serwist/next/dist/index.worker.js`. Before this fix the purge deleted three buckets that held no documents; the fix is present in commit `131c831` and in the built worker (`public/sw.js` inspected directly) |
| `next.config.ts` | `cacheOnNavigation: false` | ✓ VERIFIED | Confirmed, with comment; `reloadOnOnline: false` untouched; `deploymentId` absent |
| `.planning/phases/40-brand-tokens-typography/40-RELEASE-PASS.md` | H1–H4, all `Result: pending` | ✓ VERIFIED (as an artifact — its content is by design unfilled) | 10 `Result: pending` lines, H3.4 updated post-review to read the Cache Storage bucket list rather than a log (confirmed in commit `131c831`) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `package.json` | `scripts/verify-tokens.mjs` | `verify:tokens` npm script | ✓ WIRED | Confirmed, exit 0 |
| `package.json` | `scripts/verify-semantic-separation.mjs` | `verify:semantic-separation` | ✓ WIRED | Confirmed, exit 0 |
| `package.json` | `scripts/verify-sunset-gradient.mjs` | `verify:sunset-gradient` | ✓ WIRED | Confirmed, exit 0 |
| `src/app/layout.tsx` | `globals.css @theme inline --font-sans` | `next/font` variable on `<html>` | ✓ WIRED | `--font-inter` present in emitted bundle, not only source |
| `src/app/globals.css body` | `--font-sans` | `font-family` | ✓ WIRED | Confirmed in bundle: `body{...font-family:var(--font-sans)...}` |
| `public/manifest.json` | `scripts/verify-tokens.mjs` check F | permanent reader for a rule JSON cannot carry as a comment | ✓ WIRED | Check F present, mutation-proven (`Resonate` reintroduced → red; file moved → refuse/exit 2) |
| `src/app/sw.ts activate listener` | Cache Storage document buckets | `caches.delete` inside `event.waitUntil` | ✓ WIRED, corrected | Now targets the bucket documents are actually written into (`others`), confirmed in the built worker |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| DS-01 | 40-01, 40-02 | Colour/surface/line from tokens; no page defines its own brand colour | ✓ SATISFIED (token layer); Phase 41 converts remaining 74 surfaces | `verify-tokens.mjs` green, 28 tokens declared, legacy aliases keep 100+ files rendering |
| DS-02 | 40-02, 40-04 | Format colours only where identified; semantics separate | ✓ SATISFIED | `verify-semantic-separation.mjs` green, both directions mutation-proven |
| DS-03 | 40-02, 40-04 | Sunset gradient exclusive to SunSet | ✓ SATISFIED | `verify-sunset-gradient.mjs` green, `ALLOW_LIST` empty, applied by zero files |
| DS-05 | 40-03 | Display/data/interface each one typeface; figures align | ✓ SATISFIED | Three roles declared and wired (check G); mono role has 12 pre-existing consumers |
| DS-06 | 40-03, 40-05 | Brand spelled correctly incl. installed app name | ✓ SATISFIED for product-titles/manifest half; **? PENDING (human)** for the actual home-screen label (H1) | `manifest.json`/`layout.tsx` correct; H1 in `40-RELEASE-PASS.md` is `pending` |
| DS-10 | 40-01, 40-03, 40-05 | No device serves a mixture of old/new styles after a release | Code ✓ SATISFIED; **? PENDING (human)** — the actual behaviour | Purge mechanism corrected post-review (CR-01); H3 in `40-RELEASE-PASS.md` is `pending`, and is explicitly "the only proof DS-10 will ever have" per the plan and SUMMARY |

**No orphaned requirements.** The union of `requirements:` fields across all five plans (`DS-01, DS-02, DS-03, DS-05, DS-06, DS-10`) matches exactly the phase's declared requirement list in `ROADMAP.md` and `REQUIREMENTS.md`. Note: `REQUIREMENTS.md`'s own tracking table (lines 245–250) still shows all six as "Pending" with unchecked boxes — this is a bookkeeping artifact (the table was not updated alongside `ROADMAP.md`, which does show Phase 40 as `[x]` completed) and not a code gap; flagged here so the orchestrator can reconcile it.

### Post-Review Fixes — verified against the code, not the SUMMARY claims

The four defects named in the task brief were checked directly against the current tree rather than trusted from any commit message:

| Finding | Claimed fix | Verified in code |
|---------|-------------|-------------------|
| CR-01 (blocker) | `others` added to the purge list; H3.4 reads the Cache Storage bucket list | ✓ Confirmed: `src/app/sw.ts` declares `DOCUMENT_CACHES = ["others", "pages", "pages-rsc", "pages-rsc-prefetch"]`; the built `public/sw.js` carries the four-name array verbatim in the `activate` listener; `40-RELEASE-PASS.md` H3.4 step 4 now reads "Read the bucket list, not a log" |
| WR-02 | Check D taught that `@utility` (not only `--color-*`) exposes a name | ✓ Confirmed: `scripts/verify-tokens.mjs` contains `utilityExposed`/`@utility` matching (lines ~664–685), and `node scripts/verify-tokens.mjs` reports 22 exposed / 6 unexposed (was 21/7 before the fix — `grad-sunset` moved out of the unexposed set) |
| WR-07 (check G) | New check asserting `.variable` is applied on `<html>` | ✓ Confirmed: check G present and reported in the live run (`✓ G the <html> element in src/app/layout.tsx carries all 2 next/font variable(s)`) |
| WR-03 / WR-04 | Check C given a real subject; retired-black comparison made case-insensitive | ✓ Confirmed: `scripts/verify-sunset-gradient.mjs` check C now asserts the exempt path is the actual declaration site (verified against `git show 8600eed`); `verify-tokens.mjs`'s retired-black check now lower-cases both sides |

All three gates re-run on the current tree: `verify:tokens` (7/7), `verify:semantic-separation` (5/5), `verify:sunset-gradient` (3/3) — all exit 0. `npm run build` exits 0.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` in any file this phase touched (`sw.ts`, `globals.css`, `layout.tsx`, `manifest.json`, the three verify scripts, `next.config.ts`, menu page) | — | none found |
| `src/app/sw.ts:110-113`, `:295` | — | **CR-02, unresolved, pre-existing.** `/tickets/[id]` renders `venue_text` (`src/app/(public)/tickets/[id]/page.tsx:91`) but is not in `doorRuntimeCaching`; its pathname falls to the `others` bucket alongside every other unrouted document. `others` is now purged on every `activate` (a release), which incidentally shortens this window versus before CR-01's fix — but the base venue-secrecy problem (a venue-bearing document sitting in a 24h `NetworkFirst` cache **between** releases) is unchanged and predates Phase 40. The code review (`40-REVIEW.md` CR-02) proposed two mutually exclusive fixes and explicitly declined to choose one — it is a decision, not a patch. **Not fixed in this phase, not claimed fixed by any plan, and correctly out of the five plans' declared scope.** Flagged here per `venue-secrecy.md` so it is not silently carried forward | 🛑 open finding, needs owner | Predates phase 40; DS-10's literal scope (style-version mixing) is unaffected, but the phase's own `sw.ts` docblock now more prominently claims to define "the document boundary," which makes this gap more visible than before |
| `scripts/verify-tokens.mjs` etc. | — | WR-01 (cache names hardcoded rather than imported from `@serwist/next/worker`'s `PAGES_CACHE_NAME`), WR-05 (themeColor substring match brittle to formatting), WR-06 (glyph scan walks gitignored `public/sw.js`), WR-08 (helper duplication across 3 scripts), WR-09 (no aggregate `verify` script or CI workflow — all three gates only run when a human types the command), WR-10 (`.font-mono` unlayered rule unoverridable on the same element, latent), WR-11 (Orbitron `preload` not disabled despite zero consumers), WR-12 (`--faint` exposed as a utility despite failing AA on every ground, zero consumers today), WR-13 (no `src/emails/**` exemption in check B — latent until an email adopts a token colour), WR-14 (`menuUrl` built from an unguarded env var), WR-15 (commented-out `GuestLoginBanner` import/render left in place), WR-16 (viewport blocks pinch-zoom) | ⚠️ warning, none fixed | Confirmed still present by direct inspection. None of these block a ROADMAP success criterion or a phase requirement; each was reviewed and left as a recorded warning rather than silently dropped |

### Human Verification Required

### 1. H1 — The installed app name

**Test:** Fresh install (device not currently carrying the app) to the home screen from the release under test; read the label under the icon.
**Expected:** `re:sonate` — normal e, lower case, with the colon. **One attempt per device** — iOS never updates a manifest field post-install; Android does not include `name`/`short_name` in its update-trigger list.
**Why human:** A home-screen label cannot be read from the repository; the manifest file being correct (`verify-tokens.mjs` check F, confirmed green) proves the file, not the phone.

### 2. H2 — The splash screen

**Test:** Launch the installed app from the home screen, observe the first rendered frame.
**Expected:** `#0A0712`, not the previous `#0a0a0a`.
**Why human:** Runtime/platform rendering, not inspectable statically.

### 3. H3 — The version boundary at the door (the only proof DS-10 will ever have)

**Test:** Warm `/door` online on the staff phone; ship a release that changes at least one style; return within 24h with the radio off (aeroplane mode); open `/door`; inspect the Cache Storage bucket list from a desktop debugger; confirm a queued IndexedDB scan survived.
**Expected:** `/door` renders fully styled or does not render at all — never unstyled, never half, never a self-reload. The bucket list shows what the purge actually did (a `false` from `caches.delete` on an absent bucket is indistinguishable from success by return value alone, which is why the release-pass procedure was corrected post-review to read Cache Storage directly instead of trusting a log).
**Why human:** Requires a physical device, an actual shipped release, and a radio switched off. No script can simulate this; the code (`sw.ts`'s corrected purge) is in place but its behaviour has never been observed.

### 4. H4 (optional) — Inter resolves `tnum`

**Test:** DevTools inspection of `font-feature-settings` on a figure column rendered in the interface face.
**Expected:** Moot for DS-05 (the data role is mono and aligns by construction) — explicitly optional, skip unless free.
**Why human:** Runtime font-feature inspection.

### Gaps Summary

No code-level gap blocks any of the six requirements (DS-01, DS-02, DS-03, DS-05, DS-06, DS-10). All three structural gates (`verify:tokens`, `verify:semantic-separation`, `verify:sunset-gradient`) are green, mutation-proven in both directions, and were re-verified against the current tree rather than trusted from SUMMARY claims. The four post-review defects (CR-01, WR-02, WR-03/04, WR-07) named in the task brief were checked directly against the code and confirmed present and correct — including the built service-worker artifact (`public/sw.js`), not only the source.

The phase cannot close as `passed` because two observations that only a human, a device and a shipped release can produce are still `pending` in `40-RELEASE-PASS.md`: **H1** (DS-06's actual home-screen label) and **H3** (DS-10's actual release-boundary behaviour, ROADMAP criterion 5). This is not a defect in the phase's plans — every plan and SUMMARY says so explicitly and in advance ("scheduled is not verified"), and the phase's own validation strategy (`40-VALIDATION.md`) predicted this exact outcome. The correct status is `human_needed`, not `passed`.

One pre-existing, unresolved finding is recorded rather than silently carried forward per `venue-secrecy.md`: **CR-02** — `/tickets/[id]` renders a venue address and is not covered by any `NetworkOnly` runtime-caching rule, so it can sit in the `others` Cache Storage bucket for up to 24h between releases. This predates Phase 40, was correctly left unfixed by all five plans (it needs an owner decision between two mutually exclusive remedies, not a patch), and does not block any of Phase 40's own six requirements — but it should not disappear from view now that `sw.ts`'s docblock more prominently claims to define the document-caching boundary.

Twelve further code-review warnings (WR-01, WR-05, WR-06, WR-08 through WR-16) were checked and confirmed still present, unfixed, and correctly non-blocking — none touches a requirement's success criterion.

---

*Verified: 2026-08-11T22:30:00Z*
*Verifier: Claude (gsd-verifier)*
