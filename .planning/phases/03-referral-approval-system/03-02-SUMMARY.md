---
phase: 03-referral-approval-system
plan: 02
subsystem: frontend, membership
tags: [referral-link, clipboard, dashboard, membership-card, copy-to-clipboard]

# Dependency graph
requires:
  - phase: 03-referral-approval-system
    plan: 01
    provides: referred_by column, referral-aware trigger, registration ?ref capture
provides:
  - CopyReferralLink reusable client component with clipboard copy
  - Dashboard page with referral link card for approved members
  - Membership card page with real DB-fetched membership_code and referral link section
affects: [03-referral-approval-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reusable client component for clipboard copy with navigator.clipboard + execCommand fallback"
    - "Conditional rendering based on approval status for referral link visibility"

key-files:
  created:
    - src/components/membership/CopyReferralLink.tsx
  modified:
    - src/app/(members)/dashboard/page.tsx
    - src/app/(members)/membership-card/page.tsx

key-decisions:
  - "Extracted CopyReferralLink as shared component in src/components/membership/ rather than inline in one page"
  - "Used typeof window check for SSR-safe referral link construction in client component"
  - "Dual guard on membership card: profile.status === approved AND membershipCode !== RSN-UNKNOWN"

patterns-established:
  - "Copy-to-clipboard pattern: navigator.clipboard.writeText with execCommand fallback and 2s feedback timeout"

requirements-completed: [REFR-02]

# Metrics
duration: 95s
completed: 2026-02-24
---

# Phase 3 Plan 2: Referral Link Display Summary

**Referral link with copy-to-clipboard on dashboard and membership card for approved members, plus real DB-fetched membership_code replacing hardcoded placeholder**

## Performance

- **Duration:** 1 min 35s
- **Started:** 2026-02-24T23:19:51Z
- **Completed:** 2026-02-24T23:21:26Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Created reusable CopyReferralLink client component with clipboard API and document.execCommand fallback, showing "Copied!" feedback for 2 seconds
- Dashboard page now fetches membership_code from profiles table and renders referral link card for approved members (placed after membership and attendance cards, before upcoming events)
- Membership card page replaces hardcoded "RSN-DEMO1234" with real membership_code fetched from the database
- Membership card page shows referral link section only for approved members (defense in depth alongside middleware protection)
- Referral link format: `{origin}/register?ref={membership_code}` -- consistent with the registration page's ?ref parameter capture from Plan 01
- Pending and rejected members never see referral links (dashboard uses isPendingOrRejected branch separation, membership card checks profile.status)

## Task Commits

Each task was committed atomically:

1. **Task 1: Dashboard referral link and membership card page referral link + real membership_code** - `e417961` (feat)

**Plan metadata:** (commit below)

## Files Created/Modified
- `src/components/membership/CopyReferralLink.tsx` - New reusable client component: accepts membershipCode prop, constructs referral link, renders "Invite a friend" card with read-only input and copy button
- `src/app/(members)/dashboard/page.tsx` - Fetches membership_code from profiles table, renders CopyReferralLink in approved member branch
- `src/app/(members)/membership-card/page.tsx` - Replaces hardcoded RSN-DEMO1234 with DB fetch of membership_code + status, shows CopyReferralLink for approved members

## Decisions Made
- Extracted CopyReferralLink as a shared component in `src/components/membership/` rather than duplicating clipboard logic in both pages
- Used `typeof window !== "undefined"` check for SSR-safe referral link construction (component is "use client" but Next.js may pre-render)
- Applied dual guard on membership card page: `profile.status === "approved"` AND `membershipCode !== "RSN-UNKNOWN"` for defense in depth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - all changes are frontend display logic using existing database columns and Supabase queries.

## Next Phase Readiness
- Referral links are now visible and copyable on both dashboard and membership card pages for approved members
- Plan 03 (admin approval queue with referral tracking) can build on this foundation -- the referral link sharing mechanism is complete
- The registration flow from Plan 01 + the display from Plan 02 form a complete referral invitation loop

## Self-Check: PASSED

All 3 created/modified files verified on disk. Task commit (e417961) verified in git log.
