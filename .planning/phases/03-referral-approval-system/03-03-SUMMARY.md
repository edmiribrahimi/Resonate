---
phase: 03-referral-approval-system
plan: 03
subsystem: admin-ui, server-actions
tags: [member-table, status-tabs, bulk-actions, expandable-rows, approve-reject, organizer, referral-data]

# Dependency graph
requires:
  - phase: 03-referral-approval-system
    plan: 01
    provides: referred_by column on profiles, referral-aware trigger
provides:
  - Server actions for single and bulk approve/reject (approveMember, rejectMember, bulkApproveMember, bulkRejectMember)
  - verifyAdminOrOrganizer auth function allowing both master and organizer roles
  - Enhanced MemberTable with status tabs, bulk selection, expandable detail rows
  - Organizer members page with approve/reject capabilities (showActions=true, callerRole="organizer")
  - Admin page fetches referral data via self-referencing join on profiles
affects: [04-email-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service-role client for organizer approve/reject: bypasses RLS since organizers lack profile write permission"
    - "callerRole prop pattern: single MemberTable component renders different action sets based on caller"
    - "Client-side referral count computation: referralCounts Map built from already-loaded member data, no extra query"
    - "Self-referencing join: profiles!referred_by(full_name) to resolve referrer names in one query"

key-files:
  created: []
  modified:
    - src/app/(admin)/admin/members/actions.ts
    - src/components/admin/MemberTable.tsx
    - src/app/(admin)/admin/members/page.tsx
    - src/app/(organizer)/organizer/members/page.tsx

key-decisions:
  - "Service-role client for approve/reject operations: organizers cannot update profiles via RLS, so all approve/reject uses service-role bypass"
  - "callerRole prop instead of separate organizer MemberTable: avoids component duplication, single source of truth"
  - "Referral counts computed client-side from loaded data: avoids additional DB query since all member data already loaded"
  - "extractReferrerName helper handles both array and object Supabase join results for robustness"
  - "Events attended hardcoded to 0: placeholder until Phase 5 populates attendance data"

patterns-established:
  - "verifyAdminOrOrganizer pattern for shared master+organizer authorization"
  - "Status tab UI pattern: tabs override dropdown filter, clear selection on tab change"
  - "Expandable detail row pattern: accordion-style with chevron indicator, single-row expansion"

requirements-completed: [APPR-01, APPR-02, APPR-03]

# Metrics
duration: 220s
completed: 2026-02-24
---

# Phase 3 Plan 3: Approval Queue & Admin UI Summary

**Enhanced MemberTable with status tabs, bulk approve/reject, expandable referral detail rows, and organizer approve/reject via service-role client**

## Performance

- **Duration:** 3 min 40s
- **Started:** 2026-02-24T23:20:01Z
- **Completed:** 2026-02-24T23:23:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Server actions extended with approveMember, rejectMember, bulkApproveMember, bulkRejectMember -- all using service-role client to bypass RLS
- New verifyAdminOrOrganizer auth function allows both master and organizer roles for approve/reject operations
- MemberTable enhanced with status tab bar (All/Pending/Approved/Rejected) with pending count badge
- Bulk selection checkboxes appear on Pending tab with "Approve selected" / "Reject selected" toolbar
- Expandable detail rows show referral info (referred by name or "Direct signup"), referral count (computed client-side), and events attended (placeholder 0)
- Placeholder "Referred By" and "Events" columns removed from main table -- data moved to expandable rows per CONTEXT.md decision
- Admin page queries profiles with self-referencing join (`profiles!referred_by(full_name)`) for referrer names
- Organizer page now passes showActions=true and callerRole="organizer" -- organizers can approve/reject but not promote/demote/deactivate
- APPR-01 (pending members cannot RSVP/buy/upload) already enforced by Phase 2 RLS and middleware -- no new work needed, verified intact

## Task Commits

Each task was committed atomically:

1. **Task 1: Server actions -- add approve/reject (single + bulk) with organizer support** - `e95a359` (feat)
2. **Task 2: Enhanced MemberTable with status tabs, bulk actions, expandable detail rows** - `27006f5` (feat)

## Files Created/Modified

- `src/app/(admin)/admin/members/actions.ts` - Added getServiceClient, verifyAdminOrOrganizer, approveMember, rejectMember, bulkApproveMember, bulkRejectMember
- `src/components/admin/MemberTable.tsx` - Status tabs, bulk selection, expandable rows, callerRole-based action filtering, chevron indicators, MemberDetail component
- `src/app/(admin)/admin/members/page.tsx` - Self-referencing join for referred_by, flattened referrer_name, callerRole="master"
- `src/app/(organizer)/organizer/members/page.tsx` - Same join query, showActions=true, callerRole="organizer"

## Decisions Made

- Service-role client for all approve/reject operations (organizers lack RLS write on profiles)
- callerRole prop on MemberTable to control which actions are visible per role, avoiding component duplication
- Client-side referral count computation from loaded data (Map of referred_by -> count) instead of extra DB query
- extractReferrerName helper handles both array and object shapes from Supabase self-referencing join
- Events attended shows 0 as placeholder (attendance data populated in Phase 5)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Supabase self-referencing join type assertion**
- **Found during:** Task 2 (build verification)
- **Issue:** The `referrer:profiles!referred_by(full_name)` join returns an array type, not a single object. TypeScript error: "Conversion of type '{ full_name: any; }[]' to type '{ full_name: string; }' may be a mistake"
- **Fix:** Created extractReferrerName helper that handles both array and single-object join results safely
- **Files modified:** src/app/(admin)/admin/members/page.tsx, src/app/(organizer)/organizer/members/page.tsx
- **Commit:** 27006f5

## Issues Encountered
None

## APPR-01 Verification Note

APPR-01 (pending members cannot RSVP, buy tickets, or upload media) is already enforced by Phase 2:
- RLS policy `rsvps_insert_approved` requires `status='approved'`
- Middleware blocks pending members from /membership-card and /attendance routes
- Event detail page hides RSVP button for non-approved members

No new work was needed for APPR-01. The existing enforcement remains intact.

## User Setup Required
None - all changes are application-level. No new environment variables or database migrations required.

## Next Phase Readiness
- Approval queue is fully functional for both admin and organizer roles
- Phase 3 referral-to-approval pipeline complete: referral DB (Plan 01), referral link UI (Plan 02), approval queue (Plan 03)
- Phase 4 (Email Notifications) can build approval notification emails on top of these approve/reject actions

## Self-Check: PASSED

All 4 modified files verified on disk. Both task commits (e95a359, 27006f5) verified in git log.

---
*Phase: 03-referral-approval-system*
*Completed: 2026-02-24*
