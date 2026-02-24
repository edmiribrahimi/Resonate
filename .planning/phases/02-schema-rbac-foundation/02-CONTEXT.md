# Phase 2: Schema & RBAC Foundation - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the profile schema from `is_admin` boolean to a role-based system with `role` enum (master, organizer, member) and `status` enum (pending, approved, rejected). Enforce access via middleware and Supabase RLS policies. Build admin member management page for master. No new features — this is the authorization foundation.

</domain>

<decisions>
## Implementation Decisions

### Master User Setup
- Master account identified by `MASTER_EMAIL` environment variable
- Master registers through normal signup flow — system detects the email and auto-promotes to role=master, status=approved
- Single master only — no ability to promote others to master
- No visual badge or label distinguishing the master from regular members

### Role Management UX
- Dedicated `/admin/members` page for the master user
- Member list shows detailed info: name, email, role, status, join date, referred by, event count
- Master can: promote member → organizer, demote organizer → member, deactivate (reject) members
- No email notification sent when roles change — member discovers it on next login
- Only the master can assign/revoke the organizer role

### Pending Member Experience
- Pending members see events-only navigation — all other nav items hidden
- Dashboard shows account status ("Your account is pending approval") but no persistent banner on other pages
- RSVP and ticket buttons do NOT render for pending/rejected members — section simply absent, not grayed out
- Rejected members get the same read-only experience as pending (can browse events, nothing else)

### Organizer Scope
- Organizers access their features via a separate `/organizer` section (not `/admin`)
- Organizers can see the full member list (same data as master minus role management controls)
- Organizers can see and edit ALL events (not limited to their own)
- Organizers cannot promote/demote anyone — that's master-only
- Organizers can approve/reject pending members (from Phase 3 — approval queue)

### Claude's Discretion
- Database migration approach (ALTER TABLE vs new table with migration script)
- RLS policy structure and naming conventions
- Middleware implementation pattern for role checking
- Admin page table styling and layout
- How to handle edge cases (e.g., master email changes, role conflicts)
- Whether to use Supabase database functions or application-level role checks

</decisions>

<specifics>
## Specific Ideas

- The current `is_admin` boolean field must be replaced — not extended with additional fields alongside it
- The existing QR scanner at `/admin/scanner` should remain accessible to both master and organizers
- Existing routes: `/admin/scanner` stays under `/admin` (master), organizers get `/organizer` as a new section
- Member list should be sortable/filterable — but implementation details are Claude's call
- The `MASTER_EMAIL` approach means deployment requires setting this env var before the master registers

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-schema-rbac-foundation*
*Context gathered: 2026-02-24*
