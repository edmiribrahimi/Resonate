---
phase: 45
slug: production-sections-section-by-section
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-17
---

# Phase 45 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `45-RESEARCH.md` § Validation Architecture (measured 2026-08-17).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **None.** No `test` script in `package.json`; no `*.test.*` / `*.spec.*` anywhere in the tree. This is a `CLAUDE.md` Guardrail 1 repository |
| **Config file** | none |
| **Quick run command** | `npm run build` — which **is** the Next typecheck; there is no separate `typecheck` script |
| **Full suite command** | `npm run verify` (`scripts/verify-all.mjs`, 16 offline gates) + `npm run build` |
| **Estimated runtime** | ~90–180 seconds for the pair, dominated by the build |

**No plan step may claim "the tests will catch it."** The word *test* does not
describe anything that exists here. What exists is a build that typechecks, a
family of source-assertion scripts, and written procedures a person executes.

---

## Sampling Rate

- **After every task commit:** `npm run build`
- **After every plan wave:** `npm run build` + `npm run verify`
- **When the key sequence is settled and a database is reachable:**
  `npm run verify:capabilities`
- **Before `/gsd:verify-work`:** all of the above green, plus `npm run verify:refusal`
  run **once** under its owner authorisation, plus every written procedure carrying a
  `Result:` other than `pending`
- **If any `.claude/rules/**` file is touched:** `npm run verify:persona`, with the
  changelog entry and version bump **in the same commit**
- **Max feedback latency:** ~180 seconds

---

## Per-Task Verification Map

Task IDs are assigned by the planner; this map binds **behaviours** to evidence so
each plan's tasks can cite a row. `⬜ pending` throughout — nothing has run.

| # | Behaviour | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---|-----------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1a | Four policies ask four different section keys | PROD-02 · SC-1 | T-45-04 | A key with no grant resolves `false` for everyone — deny by default | catalogue read | `npm run verify:capabilities` (extend side 2) | ✅ extend | ⬜ pending |
| 1b | Grants are the same two roles on all four keys | PROD-02 · SC-1 | T-45-04 | No key silently widens the audience | catalogue read | `npm run verify:capabilities` (side 5) | ✅ extend | ⬜ pending |
| 1c | A holder of one section is refused the others | PROD-02 · SC-1 | T-45-04 | — | **manual, hand-made account** | none — written procedure | ❌ W0 | ⬜ pending |
| 2a | `stage` cannot be absent or invalid | PROD-02 · SC-2 | — | An unstaged space cannot exist | constraint probe | container probe, `scripts/rls-baseline-container.mjs` pattern | ❌ W0 | ⬜ pending |
| 2b | `acquired` is impossible without an evidence line | PROD-02 · SC-2 | T-45-01 | A space cannot claim an agreement that is not cited | constraint probe | same | ❌ W0 | ⬜ pending |
| 2c | The stage is **visible** wherever the space is named | PROD-02 · SC-2 | T-45-01 | A ranking never reads as an availability | source assertion + person | `npm run verify:section-surface` (new) + procedure | ❌ W0 | ⬜ pending |
| 3a | `not_decided` cannot exist without `missing` + `decision_owner` | PROD-02 · SC-3 | — | A void is declared, never blank | constraint probe | container probe | ❌ W0 | ⬜ pending |
| 3b | The void reads as declared, not as broken | PROD-02 · SC-3 | — | — | **manual** | none — written procedure | ❌ W0 | ⬜ pending |
| 3c | An unanswered attribute reads as *to ask*, not as empty | PROD-02 · SC-2/3 | — | Five attributes carry `verifica`; blank ≠ unasked | source assertion + person | `verify:section-surface` + procedure | ❌ W0 | ⬜ pending |
| 4 | Every section's read path is refused by a session lacking its key | PROD-02 · SC-4 | T-45-04 | Refusal proven with a **real role**, not a service key | **the instrument** | `npm run verify:refusal` (new) | ❌ W0 | ⬜ pending |
| 5 | The export cannot reach the forbidden tables | D-45-17 · D-45-21 | T-45-02 | No address, no unannounced date, by construction | source assertion | `npm run verify:section-export` (new) | ❌ W0 | ⬜ pending |
| 6 | New write paths log `code`/`message` only | D-45-18 · D-45-21 | T-45-03 | An address never reaches a server log | source assertion | check inside `verify:section-surface` | ❌ W0 | ⬜ pending |
| 7 | No scouting row is reachable through `venue_for_parties` | D-45-21 | T-45-02 | No FK, no view, no function joins scouting to a night | source + catalogue assertion | `verify:section-export` or a sibling check | ❌ W0 | ⬜ pending |
| 8 | No hex literal outside the two exemptions | D-45-09 | — | One home for a brand hex | source assertion | `npm run verify:semantic-separation` (check B) | ✅ exists | ⬜ pending |
| 9 | No semantic utility on a line carrying a format identifier | D-45-16 | — | A format colour never becomes a token | source assertion | `verify:semantic-separation` (check C) | ✅ exists | ⬜ pending |
| 10 | The route map, the tabs and the disk agree | D-45-04 | T-45-05 | A tab cannot point at an address nobody serves | build + script | `npm run build` + `npm run verify:routes` | ✅ exists | ⬜ pending |
| 11 | The seed is re-runnable without duplicating | D-45-07 | — | A second run changes nothing | script self-check | the import runner's own second-run assertion | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-refusal.mjs` — criterion 4, and the phase's headline artefact.
      **Read-only against production, credentials from the environment only, global
      sign-out with a *verified* revocation.** Must assert a **pair** — a positive
      control alongside each refusal — and exit non-zero when the positive control
      returns zero rows, because on empty tables a refusal and an empty table are
      the same bytes
- [ ] `scripts/verify-section-export.mjs` — D-45-17's and D-45-21's structural proof:
      what the export path reads, and what it demonstrably cannot reach
- [ ] `scripts/verify-section-surface.mjs` — the mechanical half of criteria 2 and 3,
      plus D-45-18's log-shape assertion
- [ ] `45-PROCEDURES.md` — the written procedures for 1c, 2c, 3b, 3c, on
      `44-PROCEDURES.md`'s model, **every `Result:` starting at `pending`**
- [ ] A fourth list in `scripts/verify-all.mjs` — `NEEDS_AUTHORISATION`: declared,
      listed, and **never spawned** by the aggregate run
- [ ] The scouting seed input — **already satisfied**: `docs/scouting-2026-08-17.json`,
      184 records, gitignored and verified invisible to git on 2026-08-17

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A holder of one section is refused the others | SC-1 | **No such subject exists in production.** D-45-03 grants all three keys to both roles, so nobody is ever refused one section while holding another. Making one would mean granting a key to a role in production — an access change, not a test row, and explicitly forbidden by D-45-23 | Hand-made account with a single section key, in a throwaway environment; open each of the four section addresses; record which render and which refuse, and **where the refusal came from** |
| The stage is visible wherever a space is named | SC-2 | A source assertion proves the badge is rendered; only a person can say it is *legible as a stage* rather than decoration | Open the location section with rows at each of the four stages; confirm a non-`acquired` stage is unmistakable at a glance, in the list and in the detail |
| The void reads as declared, not as broken | SC-3 | The difference between "not yet decided" and "failed to load" is a judgement about how a screen reads, and no assertion can hold it | Open a section in each of the three states; confirm the not-decided one names what is missing and whose call it is |
| An unanswered attribute reads as *to ask* | SC-2/3 | Same shape: a blank cell and an unasked question are the same pixel unless a person confirms they are not | Open a space with several attributes at `verifica`; confirm each reads as a question nobody has asked, not as missing data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] ~~`nyquist_compliant: true` set in frontmatter~~ — **deliberately false, see below**

### Why `nyquist_compliant: false` is the correct value here, not a gap

Four of this phase's behaviours close on a person's observation, and the most
important of them — criterion 1 — closes that way **because of an owner decision
recorded in `45-CONTEXT.md` (D-45-03)**, not because the tooling fell short.
Setting the flag true would assert an automated coverage that does not exist, in a
repository whose first guardrail is that no such coverage exists. Phases 31, 36
and 44 carry the same false for the same reason.

**What this phase does add** is the first instrument in this project's history that
can prove a refusal with a real role rather than a service key. That is a genuine
advance in what "verified" can mean here — and it is worth stating plainly that it
narrows the manual set without eliminating it.

**Approval:** pending
