---
phase: 02-schema-rbac-foundation
plan: 01
subsystem: database-schema
tags: [rbac, rls, migration, postgresql, typescript]
dependency_graph:
  requires: []
  provides: [role-column, status-column, rls-helpers, master-detection]
  affects: [middleware-rbac, admin-members, auth-callback]
tech_stack:
  added: []
  patterns: [security-definer-helpers, check-constraints, service-role-client]
key_files:
  created:
    - supabase/migrations/20260224_rbac_migration.sql
  modified:
    - supabase/schema.sql
    - src/types/database.ts
    - src/app/api/auth/callback/route.ts
    - .env.local.example
decisions:
  - CHECK constraints over native PostgreSQL ENUMs for role/status columns
  - Service role client for master promotion to bypass RLS
  - Application-layer master detection (auth callback) over trigger-based approach
metrics:
  duration: 203s
  completed: 2026-02-24
---

# Phase 2 Plan 1: Schema Migration & RLS Rewrite Summary

RBAC schema migration replacing is_admin boolean with role/status CHECK columns, 15 new RLS policies using security definer helpers, and master email auto-promotion via service role client in auth callback.

## What Was Built

### Task 1: Database Schema Migration and RLS Policy Rewrite
**Commit:** e4b7a61

Created a complete migration SQL file (`supabase/migrations/20260224_rbac_migration.sql`) wrapped in a single BEGIN/COMMIT transaction that:

- Adds `role` (master/organizer/member) and `status` (pending/approved/rejected) columns with CHECK constraints
- Migrates existing `is_admin=true` users to `role='organizer'`
- Drops the `is_admin` column entirely
- Updates the `handle_new_user` trigger to include role='member' and status='approved' for new signups
- Creates 4 security definer helper functions: `get_user_role()`, `get_user_status()`, `is_master()`, `is_admin_or_organizer()`
- Drops all 13 old RLS policies by exact name
- Creates 15 new role-based RLS policies using the helper functions

Updated `supabase/schema.sql` to reflect the new schema state for fresh database setup, with helper functions defined before the tables that reference them.

### Task 2: TypeScript Types Update and Master Email Detection
**Commit:** 2552dbe

- Added `UserRole` and `UserStatus` type aliases to `src/types/database.ts`
- Added `role: UserRole` and `status: UserStatus` fields to the Profile interface
- Updated auth callback (`src/app/api/auth/callback/route.ts`) to detect `MASTER_EMAIL` env var and auto-promote matching users to master role using a service role client (bypasses RLS)
- Documented `MASTER_EMAIL` env var in `.env.local.example`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| CHECK constraints over PostgreSQL ENUMs | Easier to extend in production (no ACCESS EXCLUSIVE lock), simpler ALTER operations |
| Service role client for master promotion | User's own session cannot modify their role via `profiles_update_own` RLS policy; service role bypasses RLS entirely |
| Application-layer master detection | PostgreSQL triggers cannot read Next.js env vars; auth callback approach is simpler and runs at the right time |
| is_admin=true maps to organizer (not master) | Master is assigned via MASTER_EMAIL env var; existing admins become organizers as a safe default |
| Default status='approved' for new users | Phase 3 will change this to 'pending' when the referral system is added |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx next build` completes with 0 errors
- `supabase/schema.sql` contains no reference to `is_admin` column (only `is_admin_or_organizer()` function name)
- `supabase/schema.sql` contains `role text not null default 'member'` and `status text not null default 'approved'`
- `supabase/migrations/20260224_rbac_migration.sql` is a valid SQL transaction (BEGIN/COMMIT)
- `src/types/database.ts` exports `UserRole`, `UserStatus` types and `Profile` includes both fields
- `src/app/api/auth/callback/route.ts` references `MASTER_EMAIL` and uses service role client for promotion
- `.env.local.example` includes `MASTER_EMAIL`

## Self-Check: PASSED

All 5 files verified present on disk. Both commit hashes (e4b7a61, 2552dbe) verified in git history.
