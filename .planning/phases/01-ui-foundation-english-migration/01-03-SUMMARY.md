---
phase: 01-ui-foundation-english-migration
plan: 03
subsystem: bug-fixes
tags: [auth, password-validation, ux, supabase, server-components]
dependency_graph:
  requires: [english-routes, english-ui-text]
  provides: [auth-aware-event-page, password-strength-validation]
  affects: [event-detail-page, registration-page]
tech_stack:
  added: []
  patterns: [server-side-auth-check, real-time-form-validation]
key_files:
  created: []
  modified:
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(auth)/register/page.tsx
decisions:
  - Used supabase.auth.getUser() for auth check (reads cookies, not DB -- fast and appropriate for public pages)
  - Password validation uses inline checkmarks in 2x2 grid (friendlier than strength bar or submit-time errors)
key_decisions:
  - Auth check via getUser() on public page for conditional rendering
  - Real-time inline password validation with per-rule feedback
metrics:
  duration: 106s
  completed: 2026-02-24T20:30:23Z
---

# Phase 1 Plan 03: Bug Fixes Summary

Auth-aware event detail page using Supabase getUser() to hide member prompt for logged-in users, plus real-time password strength validation enforcing 8+ chars, uppercase, number, and special character with inline per-rule feedback.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Auth-aware event detail page (UIBR-05) | de06474 | src/app/(public)/events/[slug]/page.tsx |
| 2 | Real-time password strength validation (UIBR-08) | 41e5daa | src/app/(auth)/register/page.tsx |

## What Was Built

### Task 1: Auth-aware Event Detail Page (UIBR-05)
- Imported `createClient` from `@/lib/supabase/server` for server-side auth
- Replaced hardcoded `const isMember = false` with real auth check:
  ```typescript
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isMember = !!user
  ```
- Logged-in users now see the "I'm going" button and secret location info
- Non-logged-in users still see the "Sign up to confirm attendance" prompt and "Become a member" link
- Page remains publicly accessible (no redirect for unauthenticated users)
- Page correctly changed from static to dynamic rendering (auth reads cookies)

### Task 2: Real-time Password Strength Validation (UIBR-08)
- Added `validatePassword()` function enforcing 4 rules:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one number
  - At least one special character
- Real-time inline feedback renders below password field when user starts typing
- 2x2 grid layout with per-rule indicators:
  - Green checkmark (unicode U+2713) for met rules
  - Muted bullet (unicode U+2022) for unmet rules
- Submit button disabled with `opacity-50 cursor-not-allowed` until all 4 rules pass
- Updated HTML `minLength` from 6 to 8 as fallback
- No "confirm password" field added (not requested, reduces friction)

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx next build` completes successfully (0 errors, 16 routes)
- Event detail page `/events/[slug]` now renders as dynamic (server-rendered on demand) due to auth check
- Registration page `/register` remains static-prerenderable (client component)
- No new Italian text introduced
- No regressions in route structure

## Decisions Made

1. **Auth check via getUser() on public page** -- Uses `supabase.auth.getUser()` which reads cookies (not a database call), keeping the page fast despite being dynamic. This is the recommended Supabase SSR pattern.
2. **Real-time inline password validation** -- Per-rule checkmark feedback in a 2x2 grid rather than a strength meter bar. More informative and friendlier for users.

## Notes for Next Plans

- The event detail page still uses mock data (hardcoded event object). Real Supabase event queries will come in a later phase.
- `hasRSVP` remains hardcoded to `false` -- RSVP functionality will be implemented in a later phase.
- Password validation is client-side only. Supabase Auth has its own server-side password requirements that should be aligned in Phase 4 (auth configuration).

## Self-Check: PASSED
