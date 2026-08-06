---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Platform Layout, Access Model & Door Fixes
status: executing
stopped_at: v1.5 roadmap created (phases 31–42), traceability filled
last_updated: "2026-08-05T19:42:52.744Z"
last_activity: 2026-08-05 -- Phase 31 execution started
progress:
  total_phases: 12
  completed_phases: 0
  total_plans: 13
  completed_plans: 0
  percent: 0
---

# State: Resonate

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-05)

**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

**Stack:** Next.js 16 + Supabase + Tailwind CSS v4 + PWA (Vercel hosting)

**Current Focus:** Phase 31 — Live Defects at the Door and the Bar

## Current Position

Phase: 31 (Live Defects at the Door and the Bar) — EXECUTED, NOT VERIFIED
Plan: 13 of 13
Status: All 13 plans executed on branch `gsd/phase-31-live-defects-at-the-door-and-the-bar`.
        Four blocking checkpoints remain open — all four need a human, a device or
        a real database. `31-VALIDATION.md` keeps `nyquist_compliant: false`
        deliberately: the file:line evidence is complete, the manual and
        observable evidence is not executed.
Last activity: 2026-08-06 -- Phase 31 executed, 61 commits, awaiting manual verification

Progress: [██████████] 13/13 plans executed · 0/4 manual checkpoints closed

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
1. Apply `supabase/migrations/20260805120000_door_scan_events.sql` from the
   Supabase dashboard (the CLI is not installed here), then confirm a logged-in
   member reads zero rows from `door_scan_events`
2. The `apis` cache check on a phone, production build
3. The dark-room amber-versus-yellow legibility check
4. The door pass — six scans, radio off, plus the IndexedDB v2→v3 upgrade on a
   device that already holds a v2 database

**Next step:** `/gsd-plan-phase 32` (Capability Model in the Database). Note the
command form: GSD is installed as user skills here, so it is `/gsd-…` with a
hyphen — the `gsd:` plugin namespace does not exist on this machine, though GSD's
own generated text uses it.

---
*State initialized: 2026-03-10 — v1.5 roadmap 2026-08-05*
