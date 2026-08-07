---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Platform Layout, Access Model & Door Fixes
status: executing
stopped_at: Phase 31 planned and executed end to end — 13 plans, 6 waves, 61
last_updated: "2026-08-07T22:46:53.129Z"
last_activity: 2026-08-07 -- Phase 43 planning complete
progress:
  total_phases: 13
  completed_phases: 3
  total_plans: 53
  completed_plans: 38
  percent: 23
---

# State: Resonate

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-05)

**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

**Stack:** Next.js 16 + Supabase + Tailwind CSS v4 + PWA (Vercel hosting)

**Current Focus:** Phase 43 — role model & account creation

## Current Position

Phase: 43
Plan: Not started
Status: Ready to execute
        `gsd/phase-32-capability-model-in-the-database`, which forks the phase 31
        branch. Plan-checker: VERIFICATION PASSED, 0 blockers, 2 warnings — both
        closed before execution.
        Only waves 1 and 6 parallelise; the rest is genuinely sequential, because
        the baseline must be captured and committed **before the first migration
        file exists**. A baseline taken after the change is not a baseline.
Last activity: 2026-08-07 -- Phase 43 planning complete

**Phase 31: EXECUTED, NOT VERIFIED.** 13 of 13 plans, 61 commits on
`gsd/phase-31-live-defects-at-the-door-and-the-bar`. One of its four blocking
checkpoints is now closed (the migration is applied); three remain, plus the RLS
half of the fourth. `31-VALIDATION.md` keeps `nyquist_compliant: false`
deliberately.

Progress: phase 31 — 13/13 plans executed, 1/4 checkpoints closed ·
          phase 32 — 11 plans, 0 executed

## Decisions

Fixed by the project owner before planning — not re-opened at plan time:

- Live freshness uses a **push channel**, not polling — mandatory full reload on every reconnection, infrequent safety reload underneath (Phase 38)
- Undoing a check-in requires a **supervising capability** — door-only assignment cannot undo (Phase 35)
- Venue reveal stays scheduled **plus** a manual path for master and organizer, confirmed and recorded (Phase 37)
- The interface stays **English only** — no translation work this milestone

## Accumulated Context

### Key Files

- `src/lib/supabase/middleware.ts` -- session refresh + role/status resolution (header injection removed in Phase 33)
- `src/lib/offline/checkin-store.ts` -- IndexedDB offline store (clear-and-replace bug, Phase 31)
- `src/lib/offline/sync-manager.ts` -- offline sync queue (deletes conflict evidence, Phase 31)
- `src/app/api/tickets/checkin/route.ts` -- ticket QR check-in (conflict encoded as HTTP 200)
- `src/app/api/membership/verify/route.ts` -- membership QR verify + attendance
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` -- scanner client (converted last, Phase 42)
- `src/app/api/cron/venue-reveal/**` -- scheduled reveal (manual path added Phase 37)
- `supabase/migrations/**` -- the actual security boundary; capability model lands here (Phase 32)
- `src/app/sw.ts` -- service worker (release wholeness, Phase 40; door precache, Phase 39)

### Notes

- Production data is nearly empty (2 events, 3 parties, 1 ticket, 4 profiles) — the safest moment for a deep change
- No test runner: verification is `npm run build` plus written manual procedures, including a dark-venue network-off door pass
- FIX-01 and FIX-02 were applied on 2026-08-05, ahead of the roadmap; they remain mapped to Phase 31 and are marked complete

## Blockers

(None)

## Session Continuity

**Last session:** 2026-08-06
**Stopped at:** Phase 31 planned and executed end to end — 13 plans, 6 waves, 61
commits on `gsd/phase-31-live-defects-at-the-door-and-the-bar`. Branch not merged,
nothing pushed. `main` is 14 commits ahead of `origin/main`.

**Owner decision this session:** staff always get in — the door decides on role
alone, and `updateMemberRole` sets `status = 'approved'` when it grants the
organizer role. Demotion does not revoke approval.

**Found and fixed mid-phase:** the service worker was never built in production
(`@serwist/next` is a webpack plugin, Next 16 builds with Turbopack). `npm run
build` is now `next build --webpack`. v1.4's "IndexedDB + service worker" was only
ever the IndexedDB half.

**Found and recorded, not fixed:** none of the four Supabase clients is
parameterised with `Database`, so no column name in any query is checked by the
build. This narrows what a green build means everywhere, not only in phase 31.

**Working rule, set by the owner on 2026-08-06.** During construction, a
verification checkpoint is deferred unless its outcome changes *what we write*.
Applying the migration was necessary immediately — the refund probe's result
decided a clause of the migration itself, and phases 32+ write against that
schema. Checks that merely validate an already-made, easily reversible choice —
a colour read in the dark, a cache bucket on a phone, a door pass — are collected
and run at the end. **Deferred is not verified:** this file and
`31-VERIFICATION.md` must keep saying which of the two each one is.

*One exception to watch:* a check whose failure destroys **data** rather than code
stops being deferrable once that data exists. The IndexedDB v2→v3 upgrade must be
exercised **before the first real night**, not at some abstract end of
construction. Today no staff phone holds a v2 database with real check-ins,
because no event is published — which is precisely why the rule is safe now.

**Manual work owed, batched by the owner's choice** — see `31-VERIFICATION.md`:

1. ~~Apply the phase 31 migration~~ — **DONE 2026-08-06.** Applied through the
   Supabase Management API's migrations endpoint (`SUPABASE_ACCESS_TOKEN` is in
   `.env.local`; the CLI is still not installed), recorded as version
   `20260806111113`, eight structural observations verified. **Doing it revealed a
   third foreign key to `tickets` that no plan had seen — `pending_purchases`, the
   SumUp payment record — still `NO ACTION` and blocking the refund's delete. The
   migration was corrected before being applied.**
   **Still owed:** confirm a logged-in member reads **zero rows** from
   `door_scan_events`. The Management API bypasses RLS, so no query of mine can
   settle it — only a real member session can.

2. The `apis` cache check on a phone, production build
3. The dark-room amber-versus-yellow legibility check
4. The door pass — six scans, radio off, plus the IndexedDB v2→v3 upgrade on a
   device that already holds a v2 database

**Migrations can now be applied from here.** `POST /v1/projects/{ref}/database/migrations`
with the access token — the migrations endpoint, **not** `/database/query`, so the
project's migration history stays truthful. Note a pre-existing drift found while
doing it: `20260508000000_drink_token_active_state.sql` is applied in production
but absent from the history (its content was verified present). Repairing that is
the owner's call; `PUT` on the same endpoint upserts without applying.

**Next step:** `/gsd-execute-phase 32`. Note the command form: GSD is installed as
user skills here, so it is `/gsd-…` with a hyphen — the `gsd:` plugin namespace
does not exist on this machine, though GSD's own generated text uses it.

---
*State initialized: 2026-03-10 — v1.5 roadmap 2026-08-05*
