---
phase: 40
slug: brand-tokens-typography
status: reconciled
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-11
reconciled: 2026-08-11
---

> **Reconciled against the five plans, 2026-08-11.** `nyquist_compliant: true`
> means the *strategy* is satisfied by the plans as written: every gate has a
> named home, every requirement has an automated command or a declared manual
> procedure, and G1 lands strictly before the first token moves.
> `wave_0_complete` stays **false** until the scripts exist on disk — a plan is
> not an artifact.

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `40-RESEARCH.md` §7 and §11.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **none** — no `test` script, no `*.test.*` / `*.spec.*` outside `node_modules` `[VERIFIED]`. **No framework is to be added by this phase** — installing a test runner is a project-wide decision that is not this phase's to take. |
| **Config file** | none |
| **Quick run command** | `npm run build` (runs the Next typecheck; exit 0 today) |
| **Structural gate form** | `node scripts/verify-<name>.mjs` — the repository's established form, seven precedents in `scripts/` |
| **Full suite command** | `npm run build` **and** every `verify-*.mjs` this phase adds |
| **Estimated runtime** | build ~60–120 s; each structural gate < 5 s |

> **What a green means, and what it does not.** `npm run build` is blind to the
> failure DS-01 is about: `@tailwindcss/postcss` 4.2.1 emits **no rule, no
> warning, no error** for a utility whose token no longer exists (RESEARCH §5 P1,
> proven on a fixture). The structural gates are the only enforcement that will
> exist. A green never means "the colour is right" — contrast is arithmetic
> (`40-UI-SPEC.md` §4) and legibility at a dark door is an observation.

---

## Sampling Rate

- **After every task commit:** `npm run build`
- **After every plan wave:** `npm run build` + every `verify-*.mjs` added so far.
  **G1 must run from the wave that first renames a token, not at the end** — a
  rename is silent, so late detection means an unknown number of commits already
  carry it.
- **Before `/gsd:verify-work`:** G1–G8 green, and H1–H3 **scheduled** into the
  end-of-v1.5 human batch with their procedures written. *Scheduled is not
  verified.*
- **Max feedback latency:** ~120 s (one build)

---

## Per-Task Verification Map

Task IDs are assigned by the planner; this table binds each requirement to its
gate so the planner can attach the command as `acceptance_criteria`.

| Gate | Plan / Wave | Requirement | Threat Ref | Asserts | Test Type | Automated Command | File Exists | Status |
|------|-------------|-------------|------------|---------|-----------|-------------------|-------------|--------|
| G1 | **40-01 / Wave 1** | DS-01, DS-10 c.3 | T-40-01…04 | Every token a utility reads is declared; no token renamed out from under a consumer. Fail on any consumer with no declaration | structural | `node scripts/verify-tokens.mjs` (checks A–D) | ❌ → created by 40-01 | ⬜ pending |
| G2 | **40-04 / Wave 3** | DS-02 | T-40-19…21 | Both directions: no `--sem-*` where a format is identified; no brand/format token expressing a state; plus the palette's single-source assertion | structural | `node scripts/verify-semantic-separation.mjs` | ❌ → created by 40-04 | ⬜ pending |
| G3 | **40-04 / Wave 3** | DS-03 | T-40-22…23 | The four-stop `94deg` gradient string appears exactly once (its declaration); files applying it: zero. Excludes its own declaration site | structural | `node scripts/verify-sunset-gradient.mjs` | ❌ → created by 40-04 | ⬜ pending |
| G4 | **40-01 / Wave 1** (as check E) | DS-10 c.2 | T-40-03 | No `var(--token, #hex)` fallback anywhere in `src` — 0 today. **Folded into `verify-tokens.mjs` rather than given its own script**, so it has a permanent reader instead of a one-off grep | structural | `node scripts/verify-tokens.mjs` (check E) | ❌ → created by 40-01 | ⬜ pending |
| G5 | **40-03 / Wave 3** | DS-10 c.1 | T-40-14 | Exactly one CSS chunk emitted, and exactly one file in it declares `:root{` | structural | `ls .next/static/css \| wc -l` → 1; `grep -c ":root{" .next/static/css/*.css` → 1 | ✅ (shell) | ⬜ pending |
| G6 | **40-03 / Wave 3** (as check F) | DS-06 | T-40-13 | `public/manifest.json` reads `re:sonate` in `name` and `short_name`, `#0A0712` in both colours; `src/app/layout.tsx` likewise. **A rule JSON cannot carry as a comment needs a permanent reader** — hence check F, appended in the same commit as the manifest change so no wave is left red | structural | `node scripts/verify-tokens.mjs` (check F) + `grep -c "Resonate" public/manifest.json` → 0 | ❌ → extended by 40-03 | ⬜ pending |
| G7 | **40-03 / Wave 3** (as check F) | DS-06 | T-40-13 | `ɘ` appears nowhere outside a comment and outside `public/images/`. **Must not go red on `src/app/layout.tsx:16`** — that hit is the comment explaining the rule | structural | `grep -rn "ɘ" src public *.json *.ts` → 1 hit at `layout.tsx:16` | ❌ → extended by 40-03 | ⬜ pending |
| G8 | **all plans, every task** | all | — | The build is green | build | `npm run build` → exit 0 | ✅ | ⬜ pending |

**Ordering invariant, and it is the one that matters:** G1 is created in **Wave 1**
(`40-01`, `depends_on: []`) and the first plan that retargets a token is **Wave 2**
(`40-02`, `depends_on: ["40-01"]`). The gate therefore exists before the first
rename, which is the whole point — a rename is silent, so a gate that arrives
afterwards cannot say how many commits already carried the loss.

**Every new script must be proven able to go red.** `40-01` and `40-04` both
carry mutation tasks that break the invariant deliberately, observe the failure,
and restore. A script that has never failed is indistinguishable from one that
measures nothing — and `refuse()` → **exit 2** is the convention that keeps
"measured nothing" from reading as green.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **G1 is the one that must not be skipped.** Without it this phase's central
> guarantee has **no enforcement at all** — not a weak one, none.

---

## Wave 0 Requirements

- [ ] `scripts/verify-tokens.mjs` — G1 + G4 + G6/G7, covers DS-01 and DS-10
      clause 3. **The highest-value item in the phase:** the only thing standing
      between a token rename and a silent colour loss. → **`40-01`, Wave 1**
      (checks A–E); check F appended by **`40-03`, Wave 3**
- [ ] `scripts/verify-semantic-separation.mjs` — G2, covers DS-02 → **`40-04`, Wave 3**
- [ ] `scripts/verify-sunset-gradient.mjs` — G3, covers DS-03 → **`40-04`, Wave 3**
- [ ] `package.json` — `verify:tokens`, `verify:semantic-separation`,
      `verify:sunset-gradient` entries, matching the form of the existing ones.
      **House style is `.mjs`, six to one** — the single `.sh` (`verify-organizer-redirects.sh`)
      is the exception, not a precedent
- [ ] `40-RELEASE-PASS.md` — the written H1/H2/H3 procedures, in
      `39-DOOR-PASS.md`'s shape, every `Result: pending`, filed into the
      end-of-v1.5 human batch → **`40-05`, Wave 4**
- Framework install: **none.** Deliberate.

> **"Wave 0" is a label from the template, not a wave in this phase.** These
> items are distributed across Waves 1, 3 and 4; what the template means by
> Wave 0 — *the verification must exist before the thing it verifies* — is held
> by the ordering invariant above, not by a separate wave.

Each new script carries its own **"WHAT A GREEN DOES NOT MEAN"** header section,
following `scripts/verify-media-strip.mjs:1-45`.

---

## Manual-Only Verifications

| # | Behavior | Requirement | Why Manual | Test Instructions |
|---|----------|-------------|------------|-------------------|
| **H1** | The installed app name reads `re:sonate` | DS-06 | A manifest change cannot be re-tested without uninstalling; an existing install keeps the old label | **Fresh** install on a device; read the label under the icon. **One attempt per device** |
| **H2** | The splash screen no longer flashes the old black | DS-06 | Platform-owned; `background_color` is in Android's update list, on iOS it needs H1's reinstall | Launch the installed app from the home screen, watch the first frame |
| **H3** | **The version boundary at the door** | DS-10 | No automatable check exists — it is a device, a release, and a radio that is off | Warm `/door` online on the device. Ship a release. Return within 24 h with the radio off. Open `/door`. **It renders fully styled, or it does not render at all. It never renders unstyled, never renders half, and never reloads itself.** |
| **H4** *(optional)* | Inter resolves `tnum` | DS-05 | Font feature support is a runtime observation | DevTools: inspect `font-feature-settings` on a figure column in the interface face. Moot for DS-05 (RESEARCH §3.3) — skip unless free |

**H3 is the only proof DS-10 will ever have**, and it must be **written as a
procedure before the release it tests**, not reconstructed after. H1–H3 join the
end-of-v1.5 human sitting that already absorbs the Phase 38 and 39 procedures —
they do not invent a second sitting.

---

## Validation Sign-Off

Checked against the five plans on 2026-08-11, after the plan-checker returned
0 blockers.

- [x] All tasks carry an automated verify command — every `<verify><automated>`
      across the five plans is `npm run build`, `npm run verify:*`, or
      `node scripts/verify-*.mjs`. **No task claims verification by tests**, and
      none could: there is no test runner for the product
- [x] Sampling continuity: no 3 consecutive tasks without an automated verify
- [x] Every MISSING reference has a named home (G1 → `40-01`; G2, G3 → `40-04`;
      check F → `40-03`; `package.json` entries alongside each script)
- [x] The gate precedes the change it guards — G1 in Wave 1, first token move in Wave 2
- [x] No watch-mode flags
- [x] Feedback latency < 120 s
- [ ] H1–H3 procedures written and filed before the phase closes → **`40-05` Task 3**
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** reconciled 2026-08-11 — cleared for execution.

**What this sign-off does not mean.** Two of the six requirements end the phase
`human_needed` and no green anywhere can change that: **H1** (the installed app
name — one attempt per phone, since a manifest label cannot be re-tested without
uninstalling) and **H3** (the version boundary at the door — a device, a release,
a switched-off radio). They are **scheduled**, and scheduled is not verified.
