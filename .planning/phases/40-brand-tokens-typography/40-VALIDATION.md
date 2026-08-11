---
phase: 40
slug: brand-tokens-typography
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-11
---

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

| Gate | Plan/Wave | Requirement | Threat Ref | Asserts | Test Type | Automated Command | File Exists | Status |
|------|-----------|-------------|------------|---------|-----------|-------------------|-------------|--------|
| G1 | TBD / Wave 0 | DS-01, DS-10 c.3 | — | Every token a utility reads is declared; no token renamed out from under a consumer. Fail on any consumer with no declaration | structural | `node scripts/verify-tokens.mjs` | ❌ W0 | ⬜ pending |
| G2 | TBD / Wave 0 | DS-02 | — | Both directions: no `--sem-*` where a format is identified; no brand/format token expressing a state | structural | `node scripts/verify-semantic-separation.mjs` | ❌ W0 | ⬜ pending |
| G3 | TBD / Wave 0 | DS-03 | — | The four-stop `94deg` gradient string appears exactly once (its declaration); files applying it: zero. Excludes its own declaration site | structural | `node scripts/verify-sunset-gradient.mjs` | ❌ W0 | ⬜ pending |
| G4 | TBD | DS-10 c.2 | — | No `var(--token, #hex)` fallback anywhere in `src` — 0 today | structural | `grep -rnE "var\(--[a-z0-9-]+, *#" src` → empty | ✅ (grep) | ⬜ pending |
| G5 | TBD | DS-10 c.1 | — | Exactly one CSS chunk emitted, and exactly one file in it declares `:root{` | structural | `ls .next/static/css` → 1 file; `grep -c ":root{" .next/static/css/*.css` → 1 | ✅ (shell) | ⬜ pending |
| G6 | TBD | DS-06 | — | `public/manifest.json` reads `re:sonate` in `name` and `short_name`, `#0A0712` in both colours; `src/app/layout.tsx` likewise | structural | `grep` | ✅ (grep) | ⬜ pending |
| G7 | TBD | DS-06 | — | `ɘ` appears nowhere outside a comment and outside `public/images/` | structural | `grep -rn "ɘ" src public *.json *.ts` → 1 hit at `layout.tsx:16` | ✅ (grep) | ⬜ pending |
| G8 | all | all | — | The build is green | build | `npm run build` → exit 0 | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **G1 is the one that must not be skipped.** Without it this phase's central
> guarantee has **no enforcement at all** — not a weak one, none.

---

## Wave 0 Requirements

- [ ] `scripts/verify-tokens.mjs` — G1, covers DS-01 and DS-10 clause 3. **The
      highest-value item in the phase:** the only thing standing between a token
      rename and a silent colour loss.
- [ ] `scripts/verify-semantic-separation.mjs` — G2, covers DS-02
- [ ] `scripts/verify-sunset-gradient.mjs` — G3, covers DS-03
- [ ] `package.json` — `verify:tokens`, `verify:semantic-separation`,
      `verify:sunset-gradient` entries, matching the form of the seven existing ones
- [ ] Written H1/H2/H3 procedures, in `39-DOOR-PASS.md`'s shape, filed into the
      end-of-v1.5 human batch
- Framework install: **none.** Deliberate.

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

- [ ] All tasks carry an automated verify command or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 covers all MISSING references (G1, G2, G3 scripts + package.json entries)
- [ ] No watch-mode flags
- [ ] Feedback latency < 120 s
- [ ] H1–H3 procedures written and filed before the phase closes
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
