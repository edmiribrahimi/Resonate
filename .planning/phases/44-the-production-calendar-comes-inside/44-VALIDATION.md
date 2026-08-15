---
phase: 44
slug: the-production-calendar-comes-inside
status: planned
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-15
planned: 2026-08-15
tasks: 37
plans: 13
waves: 7
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
| 44-01-T1 | 44-01 | 1 | PROD-01 | T-44-01 | One literal source, importless; `Podcast` is not a member and cannot become one | static | `npm run build` | new | ⬜ pending |
| 44-01-T2 | 44-01 | 1 | PROD-01 | T-44-06 | Unfolding is O(n) and CRLF-tolerant; no `Date` | static | `npm run build` | new | ⬜ pending |
| 44-01-T3 | 44-01 | 1 | PROD-01 | T-44-06, T-44-13, T-44-14 | Bounded input; nesting tracked; civil dates verbatim; three finding lists; no `eval` | static | `npm run build` | new | ⬜ pending |
| 44-02-T1 | 44-02 | 1 | PROD-01 | T-44-01, T-44-09 | Zero rows of production material; `venue_word` internal; commitment has no format columns | scripted | `test $(grep -cE "^CREATE TABLE IF NOT EXISTS public\.(production_plan\|production_piece\|production_commitment\|production_import_run)" supabase/migrations/20260815120000_production_calendar.sql) -eq 4` | new | ⬜ pending |
| 44-02-T2 | 44-02 | 1 | PROD-01 | T-44-01 | The alias lives in data, never in tracked source; lateness computed, never stored | scripted | `test $(grep -c "ADD COLUMN IF NOT EXISTS ics_alias" supabase/migrations/20260815120000_production_calendar.sql) -eq 1` | new | ⬜ pending |
| 44-02-T3 | 44-02 | 1 | PROD-01 | T-44-16 | Anchors stored as (kind, weekday, direction); no offset column exists | scripted | `test $(grep -ciE "offset_days\|day_offset" supabase/migrations/20260815120000_production_calendar.sql) -eq 0` | new | ⬜ pending |
| 44-03-T1 | 44-03 | 2 | PROD-01 | T-44-01 | Three grammars; alias map is an argument; findings carry UID + reason | static | `npm run build` | new | ⬜ pending |
| 44-03-T2 | 44-03 | 2 | PROD-01 | T-44-14, T-44-16, T-44-17 | Weekday relative to an anchor event; three refusals stay three; no `Date` | static | `npm run build` | new | ⬜ pending |
| 44-04-T1 | 44-04 | 2 | PROD-01 | T-44-02 | `requires_approved` is the owner's call, recorded with its date | manual | MISSING — a decision has no automated check; evidence is the dated answer in `44-04-SUMMARY.md` | n/a | ⬜ pending |
| 44-04-T2 | 44-04 | 2 | PROD-01 | T-44-02 | The fourteenth key with a total-record description; four candidates argued | static | `npm run build` | modified | ⬜ pending |
| 44-04-T3 | 44-04 | 2 | PROD-01 | T-44-02, T-44-03, T-44-15 | Six SELECT policies, no write policy, no public arm; number-refusing trigger; author-recording tick | scripted | `test $(grep -ciE "FOR (INSERT\|UPDATE\|DELETE)" supabase/migrations/20260815120100_production_calendar_access.sql) -eq 0` | new | ⬜ pending |
| 44-05-T1 | 44-05 | 2 | PROD-01 | T-44-14 | Dates formatted from parts; no `Date`, no `Intl` | static | `npm run build` | new | ⬜ pending |
| 44-05-T2 | 44-05 | 2 | PROD-01 | T-44-20 | Five-variant union; a bare date is unrepresentable; `stage unknown` never disappears | static | `npm run build` | new | ⬜ pending |
| 44-05-T3 | 44-05 | 2 | PROD-01 | T-44-19, T-44-20 | Commitment row cannot draw a format; `emphasis` spent on two marks; no format hue | static | `npm run build` | new | ⬜ pending |
| 44-06-T1 | 44-06 | 3 | PROD-01 | T-44-03, T-44-04, T-44-21 | Returns a plan, writes nothing; number never generated; absence is not deletion; `event_parties` unreachable | static | `npm run build` | new | ⬜ pending |
| 44-06-T2 | 44-06 | 3 | PROD-01 | T-44-07 | No `"use server"` anywhere under `src/lib/production/`; purity contract stated | static | `npm run build` | new | ⬜ pending |
| 44-07-T1 | 44-07 | 3 | PROD-01 | T-44-22 | A production write is authorised per act and dated | manual | MISSING — a permission has no automated check; evidence is the dated authorisation in `44-07-SUMMARY.md` | n/a | ⬜ pending |
| 44-07-T2 | 44-07 | 3 | PROD-01 | T-44-22, T-44-23, T-44-02 | Applied through the migrations endpoint; catalogue read-back; pre- and post-snapshot identical; six tables empty | manual | MISSING — no command in this repository can assert against production; evidence is the recorded catalogue read-back | n/a | ⬜ pending |
| 44-07-T3 | 44-07 | 3 | PROD-01 | T-44-02 | Row types import their vocabularies from the literal source | static | `npm run verify:capabilities` | modified | ⬜ pending |
| 44-08-T1 | 44-08 | 4 | PROD-01 / crit. 2, 3, 5 | T-44-01 | Eight lettered checks against the real file; counts only; check F guards the script's own output | scripted | `node scripts/verify-ics-import.mjs` | new | ⬜ pending |
| 44-08-T2 | 44-08 | 4 | PROD-01 | T-44-26 | Every assertion broken, the mutation confirmed landed, the check observed to fire, restored | scripted | `node scripts/verify-ics-import.mjs` | new | ⬜ pending |
| 44-08-T3 | 44-08 | 4 | PROD-01 / crit. 2 | T-44-24 | `verify:ics` is its own entry and is named-but-not-run by `verify-all.mjs` | scripted | `npm run verify` | modified | ⬜ pending |
| 44-09-T1 | 44-09 | 4 | PROD-01 / crit. 4 | T-44-02, T-44-27 | Two patterns, one entry, `routes` branch, `alsoGatesTables`; ambiguity check re-read | scripted | `npm run verify:routes` | modified | ⬜ pending |
| 44-09-T2 | 44-09 | 4 | PROD-01 / crit. 1 | T-44-01, T-44-28 | Guard asks the bound key; cookie-bound read so the policy is exercised; failed read ≠ empty | static | `npm run build` | new | ⬜ pending |
| 44-09-T3 | 44-09 | 4 | PROD-01 | T-44-01 | Three tallies never one; a count or a sentence, never `0`; UIDs never titles | static | `npm run build` | new | ⬜ pending |
| 44-10-T1 | 44-10 | 5 | PROD-01 / crit. 2 | T-44-07, T-44-29 | Local script only; dry by default; refuses without a credential; deletes nothing | scripted | `node scripts/import-production-calendar.mjs --dry-run` | new | ⬜ pending |
| 44-10-T2 | 44-10 | 5 | PROD-01 | T-44-01 | Unclassified entries shown as UIDs; aliases set in the database, never in a file | manual | `node scripts/import-production-calendar.mjs --dry-run` (result read by the owner) | new | ⬜ pending |
| 44-10-T3 | 44-10 | 5 | PROD-01 / crit. 5 | T-44-03, T-44-04, T-44-22 | Second run returns an empty plan; unrelated tables unchanged; renumber refused by the trigger | scripted + manual | `node scripts/import-production-calendar.mjs --dry-run` | new | ⬜ pending |
| 44-11-T1 | 44-11 | 5 | PROD-01 / crit. 1, 4 | T-44-02, T-44-30, T-44-28 | Same key on the dynamic pattern; id shape-checked before any query; failed read ≠ missing night | scripted | `npm run verify:routes` | new | ⬜ pending |
| 44-11-T2 | 44-11 | 5 | PROD-01 / crit. 3 | T-44-31, T-44-20 | Every date through `PieceDate`; marker never a name; a waiting piece is never called missing | static | `npm run build` | new | ⬜ pending |
| 44-11-T3 | 44-11 | 5 | PROD-01 | T-44-32 | Real checkbox in a 44×44 target; lateness computed; tick reversible; two sentences stay two | scripted | `npm run verify:touch-targets` | new | ⬜ pending |
| 44-12-T1 | 44-12 | 6 | PROD-01 | T-44-05 | The venue-secrecy shape of the announcement is the owner's, recorded with its date | manual | MISSING — a decision has no automated check; evidence is the two dated answers in `44-12-SUMMARY.md` | n/a | ⬜ pending |
| 44-12-T2 | 44-12 | 6 | PROD-01 | T-44-02, T-44-03, T-44-07 | One non-exported gate asked once; service client second; two exports; no file-accepting path | static | `npm run build` | new | ⬜ pending |
| 44-12-T3 | 44-12 | 6 | PROD-01 | T-44-33 | Cancel autofocused and first; the monotone-number sentence; one sentence per refusal | scripted | `npm run verify:dialogs` | new | ⬜ pending |
| 44-13-T1 | 44-13 | 7 | PROD-01 / crit. 4 | T-44-02 | The tab resolves through the map at module load; hiding it protects nothing | scripted | `npm run verify:routes` | modified | ⬜ pending |
| 44-13-T2 | 44-13 | 7 | PROD-01 | T-44-01, T-44-20 | Ten surface assertions run as a command and are registered in `verify-all` | scripted | `npm run verify` | new | ⬜ pending |
| 44-13-T3 | 44-13 | 7 | PROD-01 / crit. 3, 4, 5 | T-44-18, T-44-05, T-44-34 | The four things no command can settle are written as procedures with named roles and a `Result:` per step | manual | `npm run verify:persona` (the document's confidentiality half only) | new | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Why `nyquist_compliant` stays **false**, deliberately

Four of thirty-seven tasks carry `MISSING` instead of a command, and each for a reason that
does not go away by writing more script:

- **44-04-T1 and 44-12-T1 are decisions**, not behaviours. `requires_approved`, and whether
  an unacquired space may be announced, are the owner's under the standing constraint that
  returns access and venue secrecy to him. A decision has no automated check; its evidence
  is a dated answer.
- **44-07-T1 is a permission** to change production, granted per act and spent once.
- **44-07-T2 asserts against production**, and no command in this repository can. Its
  evidence is a recorded catalogue read-back — and even that read-back runs as a role that
  **bypasses RLS**, so it says the policies exist and nothing about whether they refuse.

And the deeper reason, which is the phase's own: **criterion 4's real question has no
automated answer here.** Nothing in this repository can authenticate as a role. `verify:routes`
reads declarations; `verify:capabilities` reads a key row; the Management API bypasses the
policies. The refusal of a door-assigned staff session is settled by 44-13-T3's P1 and by
nothing else — which is why it is written as a procedure with named steps rather than
promised as a check.

There is no run of three consecutive tasks without an automated command: 44-07's two manual
tasks are followed immediately by `verify:capabilities`.

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

- [x] All tasks have `<automated>` verify, a Wave 0 dependency, or a named `MISSING` with its owner — four of thirty-seven, each argued above
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — plan 44-08 creates `scripts/verify-ics-import.mjs`, and every earlier task that defers a behavioural claim names it as the owner of that claim
- [x] No watch-mode flags
- [x] Feedback latency < 120 s (the build dominates)
- [ ] `nyquist_compliant: true` set in frontmatter — **deliberately not set.** See the section above; setting it would be a claim about coverage that four tasks contradict

**Approval:** planner-filled 2026-08-15 — 37 tasks across 13 plans in 7 waves. `nyquist_compliant` deliberately false, with the four exceptions named above.
