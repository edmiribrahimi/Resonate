---
phase: 03-referral-approval-system
plan: 01
subsystem: database, auth
tags: [supabase, postgres, trigger, referral, signup, next.js, useSearchParams]

# Dependency graph
requires:
  - phase: 02-schema-rbac-foundation
    provides: profiles table with role/status columns, handle_new_user trigger, membership_code generation
provides:
  - referred_by column on profiles table (self-referencing FK)
  - referral-aware handle_new_user trigger (resolves referral_code -> approved/pending status)
  - registration page captures ?ref URL parameter and passes through signUp metadata
  - Profile TypeScript interface with referred_by field
affects: [03-referral-approval-system, 04-email-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Trigger-based referral resolution: auth metadata -> membership_code lookup -> status assignment"
    - "Suspense boundary pattern for useSearchParams in Next.js App Router client components"

key-files:
  created:
    - supabase/migrations/20260225_phase3_referral.sql
  modified:
    - supabase/schema.sql
    - src/types/database.ts
    - src/app/(auth)/register/page.tsx

key-decisions:
  - "Reuse membership_code as referral code -- no separate referral code or table needed"
  - "referral_code omitted from metadata when empty (undefined) to avoid unnecessary trigger lookup"
  - "Suspense inline in register page file rather than parent layout -- simplest approach"

patterns-established:
  - "Referral resolution via DB trigger: trigger reads raw_user_meta_data, looks up referrer by membership_code + approved status"
  - "Query param capture pattern: useSearchParams in inner component wrapped by Suspense in page export"

requirements-completed: [REFR-01, REFR-03, REFR-04, REFR-05, REFR-06]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 3 Plan 1: Referral Data Foundation Summary

**Referral-aware DB trigger resolving membership_code from auth metadata with auto-approve/pending logic, plus registration ?ref capture**

## Performance

- **Duration:** 2 min 8s
- **Started:** 2026-02-24T23:14:34Z
- **Completed:** 2026-02-24T23:16:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Database migration adds referred_by self-referencing FK column to profiles with ON DELETE SET NULL
- handle_new_user trigger now reads referral_code from signup metadata, resolves referrer by membership_code (must be approved), sets status=approved for valid referrals or status=pending otherwise
- Registration page transparently captures ?ref URL parameter and passes referral_code through Supabase signUp metadata
- Column default for status remains 'approved' in DDL as user decided -- trigger body explicitly overrides

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration -- add referred_by column and update handle_new_user trigger** - `2959255` (feat)
2. **Task 2: Registration page -- capture referral code from URL and pass to signUp metadata** - `c221cbe` (feat)

**Plan metadata:** `c04e547` (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/20260225_phase3_referral.sql` - Migration: adds referred_by column, replaces trigger with referral-aware version
- `supabase/schema.sql` - Canonical schema updated with referred_by column and referral-aware trigger
- `src/types/database.ts` - Profile interface gains referred_by: string | null
- `src/app/(auth)/register/page.tsx` - Reads ?ref param via useSearchParams, passes referral_code in signUp metadata, wrapped in Suspense

## Decisions Made
- Reuse existing membership_code (RSN-XXXXXXXX) as the referral code rather than generating a separate code -- simpler, no new table/column needed
- Pass referral_code as undefined (not empty string) when no ?ref param present, so the trigger avoids an unnecessary membership_code lookup
- Inline Suspense boundary in the register page file rather than a parent layout -- cleanest approach for a single page needing useSearchParams

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The migration must be run on the Supabase database (via SQL Editor or CLI) before the referral system is functional.

## Next Phase Readiness
- referred_by column and referral-aware trigger are in place for Plans 02 and 03 to build UI features
- Registration flow transparently handles referral codes -- referral links can be shared as /register?ref=RSN-XXXXXXXX
- Profile TypeScript types are up to date for admin/member UI development

## Self-Check: PASSED

All 4 created/modified files verified on disk. Both task commits (2959255, c221cbe) verified in git log.

---
*Phase: 03-referral-approval-system*
*Completed: 2026-02-24*
