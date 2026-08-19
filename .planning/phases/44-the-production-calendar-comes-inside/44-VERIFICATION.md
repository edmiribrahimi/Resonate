---
phase: 44-the-production-calendar-comes-inside
verified: 2026-08-15T00:00:00Z
status: human_needed
lab_sitting_4: >
  2026-08-19, `.planning/v1.5-LAB-SITTING-4.md` — P1 OSSERVATA a tre livelli con account veri (tabella-verdetto completa meno la gamba organizer/pending, impossibile per costruzione). P4.1 OSSERVATA per intero; P4.2 solo il passo 64.
score: 5/5 structural criteria verified — 4 of them still need a written procedure result before they are PROVEN, not merely built
overrides_applied: 0
human_verification:
  - test: "P1 — capability model refuses/admits at three levels (middleware, page guard, RLS), with real accounts"
    expected: "master and approved organizer admitted at all three levels; pending organizer admitted (D-44-27); staff-at-the-door and plain member refused at all three levels, including the PostgREST row-level check with the session's own token"
    why_human: "Nothing in this sandbox can authenticate as a role. The Management API used everywhere else in this repo connects with a role that bypasses RLS, so an automated read-back can prove the six policies EXIST but never that they REFUSE. `44-PROCEDURES.md` P1 (24 steps) is the only instrument that can close criterion 4, and every `Result:` line in it reads `pending`."
  - test: "P2 — an unbriefed reader is shown S1/S2 and asked which dates are decided and which are not, and whether a 'waiting for edition' row looks broken"
    expected: "The reader distinguishes a proposed date from a written one using the word, the ink register or the dashed rule, and does not call a correctly-waiting row missing or broken"
    why_human: "`44-UI-SPEC.md` §7 and §15 both state this explicitly: it is a judgement about human perception, not a measurement any script can make. `verify:calendar-surface` U4/U5/U6/U7 prove the mechanics (right badge, right tone, right renderer) exist; they cannot prove a person reads them correctly."
  - test: "P3 — the announcement act end to end: refusal below `acquired`, the four-body-part dialog, the write, the anonymous public read, the second-press refusal, and the by-primary-key removal"
    expected: "A night below `acquired` cannot be announced; the created night is unpublished with `venue_secret=true` and no venue word anywhere; an anonymous request reveals nothing; a second press is refused with no second number spent; `highest_assigned` rises and never falls"
    why_human: "This procedure WRITES TO PRODUCTION and needs its own dated authorisation per `44-PROCEDURES.md` P3.0 — it may not ride along with a read-only verification pass, and this session was not authorised to spend a real series number or create a real (even if temporary) public-facing event row."
  - test: "P4 — the checklist tick, saved with its author, and refused with a permission sentence distinct from a save-failure sentence"
    expected: "An approved organizer's tick records `ticked_by`/`ticked_by_name`; the door-assigned staff account is refused before reaching the page and again at the action, with no database sentence in the response and a message that says 'no permission', never 'it did not save'"
    why_human: "Same reason as P1: no session in this sandbox can authenticate as any of the five roles the procedure requires."
  - test: "The owner runs `npm run import:calendar --apply` for the first time"
    expected: "The archive becomes non-empty (currently `production_plan`/`production_piece`/`production_commitment`/`production_checklist_item`/`production_import_run` all measured at 0 rows), and S1/S2 then show real nights, pieces and checklists rather than an empty calendar"
    why_human: "D-44-26 makes the import a local script only, run from the owner's machine by design — this is the owner's act, not a step this verification (or any other automated process) may perform. Until it runs, criterion 1 ('a night is readable in the product') is a proven capability, not yet an observed fact."
---

# Phase 44: The Production Calendar Comes Inside — Verification Report

**Phase Goal:** The production calendar stops living outside the product. A night's format, series number, venue state and editorial anchors are readable in the app by the people entitled to them — imported from the local material into the database, and never through the repository.
**Verified:** 2026-08-15
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (the five roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A night is readable in the product carrying its format, series number, venue state and editorial anchors | ✓ VERIFIED (structurally) — ? capability not yet exercised with real data | `src/app/(admin)/admin/(work)/calendar/page.tsx` and `.../[id]/page.tsx` exist, build, and read through the cookie-bound client (`page.tsx:115`); `CalendarList.tsx`, `PieceDate.tsx` (five-variant union, `PieceDate.tsx:93-94`), `StageBadge.tsx`, `PiecesSection.tsx`, `ChecklistSection.tsx` all on disk and non-trivial (215–400 lines each). **But** `production_plan`/`production_piece`/`production_commitment`/`production_checklist_item`/`production_import_run` are all measured at **0 rows** in the live database (query below) — the surface has never yet rendered a real night, because the import is deliberately the owner's own act (D-44-26), not run in this phase |
| 2 | The material reaches the database without passing through the repository | ✓ VERIFIED | `docs/Music-2026-08-15.ics` is present locally and `git check-ignore -v` confirms it is ignored (`.gitignore:67`); `git ls-files docs/` returns 0 tracked files; `scripts/import-production-calendar.mjs` (1487 lines) is a local script only, no upload route exists under `src/app/api/`; `npm run verify:ics` ran against the real file and its check H (`0 live references to the announced-night table across 7 module files · 0 server-action directives across 7 files in the reader's own tree`) and check F (`23 residual tokens across 92 titles, 0 of them in the 169 tokens this run printed`) passed |
| 3 | Editorial pieces derived by weekday, not day-offset | ✓ VERIFIED | `src/lib/production/ics/anchors.ts` resolves anchors as `isoWeekday`/weekday relative to an anchor event (`grep -n "isoWeekday\|weekday" anchors.ts`); `npm run verify:ics` check D passed all measured conformances (timetable 7/7 on the night itself, LiveCut 6/6 in the next edition's ISO week, SunSet LiveCut 6/6 Mon+Tue, satellite Tonight/Recap/LiveCut all conforming) and check E proved idempotence: **second pass over the same file produced an EMPTY plan** — "no insert, no update, no absence, no divergence" |
| 4 | Middleware, page guard and RLS ask the same question of the same definition | ✓ VERIFIED (structurally) — ✗ OPEN (behaviourally) | `capability-routes.ts:594-596` binds `CAP.PRODUCTION_READ` to `["/admin/calendar", "/admin/calendar/[id]"]` with `alsoGatesTables: true`; `src/lib/supabase/middleware.ts` reads this same map via `resolveRoute` (`middleware.ts:4,566`); the page guard calls `getAccessContext()` and redirects on `!capabilities.has(CAP.PRODUCTION_READ)` (`(work)/calendar/page.tsx:109-113`); six SELECT policies confirmed live in production (`production_plan_select_production_read` and five siblings, queried directly via `pg_policies`). **This proves the three readers consult the same declaration. It does not prove they refuse the same people** — the Management API used for that query bypasses RLS. `44-PROCEDURES.md` P1 is the only instrument that can close this, and all of its `Result:` lines read `pending` |
| 5 | Moving a night recomputes downstream; a progressivo is appended, never renumbered | ✓ VERIFIED | `refuse_production_plan_renumber()` trigger confirmed live (`pg_trigger` query: `production_plan_refuse_renumber` on `production_plan`), `BEFORE UPDATE OF number`, refusing when `OLD.number IS NOT NULL AND NEW.number IS DISTINCT FROM OLD.number` (`20260815120100_production_calendar_access.sql:328-341`) — the `IS DISTINCT FROM` construction also refuses an erasure, not only a change, matching the briefed claim; `reconcile.ts` returns a plan of writes and never applies it (verified by `verify:ics` check H and by code inspection: no `event_parties` write, no `.update()`/`.insert()` call site in the module) |

**Score:** 5/5 structurally verified. 1 of them (#4) has no behavioural proof in this environment by construction, and #1's actual observable content is empty pending the owner's import run.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/production/ics/vocabulary.ts` | single literal source, `as const` | ✓ VERIFIED | 270 lines, no debt markers |
| `src/lib/production/ics/unfold.ts` | RFC 5545 unfolding | ✓ VERIFIED | 200 lines |
| `src/lib/production/ics/parse.ts` | component-nesting parser, no `Date` | ✓ VERIFIED | 865 lines |
| `src/lib/production/ics/classify.ts` | 4 classes, 3 grammars | ✓ VERIFIED | 825 lines |
| `src/lib/production/ics/anchors.ts` | weekday resolution, 3 refusal reasons | ✓ VERIFIED | 627 lines |
| `src/lib/production/ics/reconcile.ts` | plan of writes, returned not applied | ✓ VERIFIED | 1573 lines |
| `src/lib/production/ics/index.ts` | barrel | ✓ VERIFIED | 93 lines |
| `supabase/migrations/20260815120000_production_calendar.sql` | 6 tables, `ics_alias`, pipeline rules | ✓ VERIFIED, APPLIED | Applied to production as version `20260815014103` (`production_calendar`), read back live |
| `supabase/migrations/20260815120100_production_calendar_access.sql` | capability, 6 policies, trigger, tick fn | ✓ VERIFIED, APPLIED | Applied as version `20260815014107` (`production_calendar_access`) |
| `supabase/migrations/20260815120200_production_checklist_tick_revoke.sql` | closes the anon/authenticated EXECUTE leak | ✓ VERIFIED, APPLIED | Applied as version `20260815015048`; live `proacl` on `record_checklist_tick` now reads `{postgres=X/postgres,service_role=X/postgres}` — `anon`/`authenticated` confirmed absent |
| `src/app/(admin)/admin/(work)/calendar/page.tsx` | S1, chronological archive | ✓ VERIFIED, WIRED | 683 lines; builds; route appears in `npm run build` output as `ƒ /admin/calendar` |
| `src/app/(admin)/admin/(work)/calendar/[id]/page.tsx` | S2, one night | ✓ VERIFIED, WIRED | 760 lines; route appears as `ƒ /admin/calendar/[id]` |
| `src/app/(admin)/admin/calendar/actions.ts` | exactly two exported acts | ✓ VERIFIED | 841 lines; `grep -n "^export async function"` returns exactly `tickChecklistItem` (line 385) and `announceNight` (line 562), both call `assertProductionRead()` first |
| `src/app/(admin)/admin/calendar/AnnounceNightDialog.tsx` | confirm dialog, no venue word | ✓ VERIFIED | 508 lines |
| `scripts/verify-ics-import.mjs` | golden-file check | ✓ VERIFIED, RUNS GREEN | `npm run verify:ics` → `ICS_IMPORT_OK — all eight checks passed` against the real 92-entry file |
| `scripts/verify-calendar-surface.mjs` | 10 mechanical UI assertions | ✓ VERIFIED, RUNS GREEN | `npm run verify:calendar-surface` → `CALENDAR_SURFACE_OK — 10 check(s) passed` (U1–U10) |
| `scripts/import-production-calendar.mjs` | local runner | ✓ VERIFIED (present, not executed by this verification) | 1487 lines; `import:calendar` entry in `package.json:30`; not run here — it is the owner's act (D-44-26), and its `--apply` mode was not authorised for this pass |
| `.planning/phases/44-.../44-PROCEDURES.md` | P1–P4, named roles, `Result: pending` | ✓ VERIFIED, HONESTLY UNRUN | 67 numbered steps across P1–P4; every `Result:` line reads `pending` — confirmed by direct read, not by summary claim |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `capability-routes.ts` (`CAP.PRODUCTION_READ`) | `middleware.ts` | `resolveRoute` reading `CAPABILITY_ROUTES` | ✓ WIRED | `middleware.ts:4` imports `CAPABILITY_ROUTES, resolveRoute`; `middleware.ts:566` calls `resolveRoute(pathname)` |
| `capability-routes.ts` (`CAP.PRODUCTION_READ`) | `(work)/calendar/page.tsx` | `getAccessContext().capabilities.has(...)` + `redirect` | ✓ WIRED | `page.tsx:109-113` |
| `capability-routes.ts` (`CAP.PRODUCTION_READ`, `alsoGatesTables: true`) | six production tables | RLS `SELECT` policies keyed on `private.has_capability('production.read')` | ✓ WIRED (existence only — see criterion 4 note) | `pg_policies` query returned exactly six `*_select_production_read` policies, one per table |
| `staff-tabs.ts` | `capability-routes.ts` | module-load `resolveRoute` assertion | ✓ WIRED | `staff-tabs.ts:153` binds `{ href: "/admin/calendar", label: "Calendar", capability: CAP.PRODUCTION_READ }`, after the page exists on disk (44-09 landed first) |
| `src/lib/production/ics/reconcile.ts` | `public.event_parties` | deliberately absent | ✓ VERIFIED ABSENT (the guarantee) | No `.update()`/`.insert()` call against `event_parties` anywhere under `src/lib/production/ics/` |
| `actions.ts` (`announceNight`) | `public.event_parties` | the single write bridge, one direction only | ✓ WIRED | `actions.ts:562-` reads `production_plan`, then (below the excerpt shown) creates the `events` row and the night row, refusing first if `venue_stage !== "acquired"` or `linked_party_id !== null` |
| `PiecesSection.tsx` | `PieceDate.tsx` | sole date renderer | ✓ WIRED | Confirmed structurally by `verify:calendar-surface` U5, which asserts this mechanically across the whole surface's files |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `(work)/calendar/page.tsx` (S1) | nights/pieces/commitments queried from `production_plan` etc. | `createClient()` (cookie-bound) → PostgREST → the six live tables | **No** — tables measured at 0 rows | ⚠ EMPTY, BY DESIGN — not HOLLOW. The query path is real (cookie-bound client, real `SELECT`), and the golden-file check (`verify:ics`) proves the reconciler produces a correct, non-empty plan (14 plans · 65 pieces · 47 commitment rows · 106 checklist items on a dry pass against the real file) when the import is actually run. The emptiness is the intended state before the owner's first `--apply` run, not a disconnected data path |
| `ImportRunSummary.tsx` | last import's effect | `production_import_run` | **No** — 0 rows, no import has run yet | Same as above — the wiring reads a real table; the table is empty because the import has not been executed, by design |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Both calendar routes build and enter the route table | `npm run build` | `ƒ /admin/calendar`, `ƒ /admin/calendar/[id]` both listed; `Compiled successfully`, TypeScript pass completed | ✓ PASS |
| Golden-file parser check against the real 92-entry calendar | `npm run verify:ics` | `ICS_IMPORT_OK — all eight checks passed` (A–H, including idempotence: second pass = empty plan) | ✓ PASS |
| Ten mechanical UI-contract assertions | `npm run verify:calendar-surface` | `CALENDAR_SURFACE_OK — 10 check(s) passed` | ✓ PASS |
| Live row counts on the six production tables | direct PostgREST query with the service key | `production_plan=0, production_piece=0, production_commitment=0, production_checklist_item=0, production_import_run=0, production_pipeline_rule=16` | ✓ PASS (matches the intended empty-material state) |
| Live migration history carries all three phase-44 versions | Management API `/database/migrations` | `20260815014103 production_calendar`, `20260815014107 production_calendar_access`, `20260815015048 …_tick_revoke` all present | ✓ PASS |
| Tick function ACL closed to `anon`/`authenticated` | direct `pg_proc.proacl` query | `{postgres=X/postgres,service_role=X/postgres}` | ✓ PASS |
| Aggregate verification suite | `npm run verify` | exit 2; 15 passed, 0 FAILED, 2 REFUSED (pre-existing stale manifest, `verify:conversion`/`verify:touch-targets`, unrelated to phase 44 — logged in `deferred-items.md` D1); `verify:ics` and `verify:redirects` correctly listed as NOT RUN with reasons | ✓ PASS (refusals accounted for, not silently absorbed) |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` files, and none were declared in any PLAN/SUMMARY.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| PROD-01 | all 13 plans (44-01…44-13) | The production calendar lives in the product rather than outside it — an import, not a migration, and the material reaches the database without passing through the public repository | ✓ STRUCTURALLY SATISFIED, human procedures pending | All five roadmap success criteria have concrete code/DB evidence above. `REQUIREMENTS.md:269` still shows PROD-01 as "Pending" — that table has not been updated to reflect this phase's completion, which is a documentation gap outside this VERIFICATION.md's remit to fix, but worth flagging |

No orphaned requirements found for this phase — `PROD-02` is correctly assigned to Phase 45, not this one.

### Anti-Patterns Found

None blocking. Scanned all 22 files this phase created/modified (the `.ics` module, both migrations, the calendar surface components, `actions.ts`, both scripts) for `TODO|FIXME|XXX|HACK|PLACEHOLDER|not yet implemented|coming soon` — zero matches in any of them.

**Deferred debt, honestly logged in `deferred-items.md` (not hidden, not this phase's to close):**
- **D1** — `verify:touch-targets` and `verify:conversion` refuse on a stale manifest naming four surfaces (`/admin/analytics/*`, `/admin/finance`) deleted in an earlier commit, unrelated to phase 44. Confirmed still refusing in this verification pass (`npm run verify` output above).
- **D2** — Four of the five checklist item kinds (`venue_confirmed`, `dj_confirmed`, `photo_arrived`, `space_approval`) have no anchor date, so they can never read as "late" — only `piece` items can. Correctly framed as "the direction that hides work rather than inventing it," not a silent failure.
- **D3** — A checklist item can outlive the piece it was created for (no removal path exists by design; absence is a stamp, never a deletion).
- **D4** — `absent_since` is not drawn on S1 — a row that has left the file looks identical to one still in it. Framed as an open contract question (§8.3/§13.4), not an oversight.
- **D6** — A dry run of `import-production-calendar.mjs` writes no `production_import_run` row, contradicting the migration's own comment that a dry run is a real row. Resolved in favour of the more restrictive read (dry run writes nothing), with the cost stated rather than absorbed.

None of D1–D6 blocks any of the five roadmap success criteria. All are logged with "why it is not this plan's" and "the repair, when somebody takes it" — the discipline this project's `meta-gates.md` asks for.

**One thing worth naming explicitly:** `.planning/ROADMAP.md:98` already shows `[x]` for Phase 44 with "(completed 2026-08-15)", and this checkbox was set *before* this verification ran and *before* any of P1–P4 produced a result. `44-PROCEDURES.md`'s own preamble names this exact failure mode as a recorded precedent in this project ("a roadmap box went `[x]` on a phase whose only open point was that it was not yet proved"). This verification does not change that checkbox; it is flagged here because the phase's own procedures document asked for exactly this flag to be raised.

### Human Verification Required

See YAML frontmatter `human_verification` for the full list. In summary, four written procedures in `44-PROCEDURES.md` (P1–P4, 67 steps, all `Result: pending`) and one execution step (the owner's first `--apply` run of `import:calendar`) are the only things standing between "structurally verified" and "proven." None of them can be run from this environment:

1. **P1** — capability refusal at three levels, with real role sessions (criterion 4's behavioural half)
2. **P2** — an unbriefed human reader confirms a proposed date does not read as settled (criterion 3's perceptual half)
3. **P3** — the announcement act end to end, which writes to production and needs its own dated authorisation
4. **P4** — the checklist tick, saved and refused, with the two-sentence distinction intact
5. **The first real import run** — until it happens, criterion 1 ("a night is readable") is a capability, not yet an observed fact

### Gaps Summary

No structural gaps were found. Every artifact this phase's 13 plans committed to exists, is substantive (no stub, no debt marker), is wired to its declared neighbours, and — where independently checkable against the live database — matches what the summaries claim: three migrations applied, six SELECT policies live, one trigger live and correctly using `IS DISTINCT FROM` to refuse both a change and an erasure, the tick function's ACL closed to `service_role` alone, and all six production tables at the row counts the phase intended (16 pipeline rules, 0 material).

What remains is exactly what the phase's own `44-PROCEDURES.md` says remains: four things no command in this repository can settle, because nothing here can authenticate as a role or safely write to production without a dated, specific authorisation. That is not a gap in the work — it is the work correctly refusing to claim a proof it cannot produce. The phase is not `passed` only because `passed` requires an empty human-verification list, and this one is not empty by the phase's own design.

---

*Verified: 2026-08-15*
*Verifier: Claude (gsd-verifier)*
