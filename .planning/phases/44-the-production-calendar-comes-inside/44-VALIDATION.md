---
phase: 44
slug: the-production-calendar-comes-inside
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-15
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Pre-filled from `44-RESEARCH.md` §Validation Architecture. The per-task map is
> completed by the planner, one row per task.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **None exists, and none is added.** `package.json` has no `test` script and no `*.test.*` / `*.spec.*` file. The repository's mechanism is `scripts/verify-*.mjs` + `npm run verify` |
| **Config file** | none — see Wave 0 |
| **Quick run command** | `npm run build` (also the typecheck: `next build --webpack`) |
| **Full suite command** | `npm run verify` **plus** `node scripts/verify-ics-import.mjs` (new, deliberately outside `verify:all`) |
| **Estimated runtime** | build ~60–120 s · verify scripts seconds |

**Why the new check stays out of `npm run verify`:** it reads `docs/*.ics`, which is
gitignored and absent on any other machine. A green run that silently skipped a check is
worse than no check, so it gets its own `verify:ics` entry and **skips loudly** with a
sentence saying why.

---

## Sampling Rate

- **After every task commit:** `npm run build`
- **After every plan wave:** `npm run verify` + `npm run verify:ics` (locally) + `npm run verify:persona` if any file under `.claude/` was touched
- **Before `/gsd:verify-work`:** all of the above green, plus the written manual procedures
- **Max feedback latency:** ~120 s (the build dominates)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _(planner fills one row per task)_ | | | PROD-01 | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-ics-import.mjs` — the golden-file check; nothing else can be trusted before it exists
- [ ] `src/lib/production/ics/` — the pure module that check exercises
- [ ] a `verify:ics` entry in `package.json` scripts (**not** in `verify-all.mjs`)
- [ ] no framework install — deliberately

**Mutation obligation.** `ai-engineering.md`'s *gate prova per mutazione* applies to every
assertion added to a verify script: break the invariant, confirm the check fires, restore —
**and assert the mutation actually landed** before reading the result.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The five tables exist with their constraints | PROD-01 / crit. 1 | applied through the Management API migrations endpoint; no CLI here | read-back query after apply, recorded with its output |
| A door-assigned staff session is refused the calendar | crit. 4 | needs a real role and a real session, not a service key | written procedure: sign in as staff, request the route, observe the refusal at middleware, page guard and row level |
| A `number` change is refused | crit. 5 | asserts a database trigger raises | one `UPDATE` against the trigger, expecting the exception |
| The announcement act | D-44-06 | it is the one write path that can create something the public may see | written procedure with venue-secrecy observations at each step |
| A proposed date does not read as settled | crit. 3 / D-44-09b | only a person can judge how a screen reads | show the surface to someone who has not read the spec, ask which dates are decided |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
