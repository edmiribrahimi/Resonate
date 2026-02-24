---
phase: 02-schema-rbac-foundation
plan: 03
subsystem: admin-member-management
tags: [rbac, admin, member-management, server-actions, role-assignment]
dependency_graph:
  requires: [role-column, status-column, middleware-role-resolution, header-injection, route-protection]
  provides: [admin-members-page, organizer-members-page, role-mutation-actions, shared-member-table]
  affects: [future-approval-queue, future-referral-system]
tech_stack:
  added: []
  patterns: [server-actions-with-auth-verification, shared-client-component, responsive-table-card-layout, client-side-filtering]
key_files:
  created:
    - src/app/(admin)/admin/members/actions.ts
    - src/app/(admin)/admin/members/page.tsx
    - src/components/admin/MemberTable.tsx
    - src/app/(organizer)/organizer/members/page.tsx
  modified: []
decisions:
  - Shared MemberTable client component with showActions prop for admin/organizer code reuse
  - Placeholder columns for "Referred By" and "Events" (Phase 3 and Phase 5 will populate)
  - Combined demote + deactivate in single update for deactivateMember action
metrics:
  duration: 161s
  completed: 2026-02-24
---

# Phase 2 Plan 3: Admin Members Page Summary

Master admin member management page with role mutation Server Actions, shared MemberTable client component with responsive table/card layout and client-side filtering, and organizer read-only member list reusing the same component.

## What Was Built

### Task 1: Server Actions for Role Management and Admin Members Page
**Commit:** 6c4b992

**Created `src/app/(admin)/admin/members/actions.ts`:**
- `verifyMaster()` helper: authenticates caller via `supabase.auth.getUser()`, queries profiles table for role, throws if not master
- `updateMemberRole(memberId, newRole)`: promotes member to organizer or demotes organizer to member, prevents self-modification
- `deactivateMember(memberId)`: sets status to "rejected" and resets role to "member" (combined demote + deactivate), prevents self-deactivation
- `reactivateMember(memberId)`: sets status to "approved", used for both reactivation and pending approval
- All three mutations call `revalidatePath("/admin/members")` after success

**Created `src/components/admin/MemberTable.tsx`:**
- Shared client component accepting `members`, `currentUserId`, and `showActions` props
- Count summary: total members, organizers count, pending count
- Client-side filtering: text search by name/email, role dropdown, status dropdown
- Desktop: HTML table with columns for Name, Email, Role, Status, Joined, Referred By (placeholder), Events (placeholder), Actions
- Mobile: card layout with same data in compact form
- RoleBadge component: purple (master), blue (organizer), gray (member)
- StatusBadge component: green (approved), yellow (pending), red (rejected)
- ActionButton component with `useTransition` for loading spinners and inline error display
- MemberActions component per row: conditionally renders Promote, Demote, Deactivate, Reactivate, Approve, Reject buttons based on member's current role and status
- Actions hidden for the master's own row and other master users

**Created `src/app/(admin)/admin/members/page.tsx`:**
- Server Component reading `x-user-role`, `x-user-status`, `x-user-id` from middleware headers
- Defense in depth redirect to /dashboard if not master
- Fetches all profiles ordered by created_at descending
- Renders MemberTable with `showActions={true}`
- Error state with styled error message
- Includes MobileNav with role/status props

### Task 2: Organizer Read-Only Member List Page
**Commit:** 66ce936

**Created `src/app/(organizer)/organizer/members/page.tsx`:**
- Server Component with same header reading and defense-in-depth pattern
- Accepts organizer OR master role (master can view organizer pages)
- Same profile query as admin page
- Renders MemberTable with `showActions={false}` -- no role management controls visible
- Page title "Members" (distinct from admin's "Member Management")
- Error state and MobileNav included

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Shared MemberTable client component with showActions prop | Avoids code duplication between admin and organizer pages; single source of truth for member display |
| Placeholder "--" for Referred By and Events columns | referred_by field added in Phase 3 (referral system), event count requires attendances join from Phase 5 |
| Combined role reset in deactivateMember | When deactivating an organizer, their role is reset to "member" in the same update to prevent a rejected-but-still-organizer state |
| verifyMaster as shared helper within actions.ts | All three Server Actions need identical auth + role verification; DRY within the module |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx next build` completes with 0 errors
- `/admin/members` page exists in build output and renders member table with action buttons
- `/organizer/members` page exists in build output and renders member table without action buttons
- Server Actions in `actions.ts` verify caller is master via `verifyMaster()` before any mutation
- `revalidatePath("/admin/members")` called after every role/status change (3 calls)
- Shared MemberTable component used by both admin and organizer pages
- No role management controls visible on organizer page (`showActions={false}`)

## Self-Check: PASSED
