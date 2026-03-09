---
phase: 24-guest-list-management
plan: 02
subsystem: guest-list
tags: [email, processing-pipeline, server-actions, ui, guest-list, qr-code, auto-registration]
dependency_graph:
  requires: [guest-list-entries-table, approved-via-column, ticket-type-column, guest-list-trigger]
  provides: [guest-invitation-email, guest-processing-pipeline, guest-list-page, add-remove-guest-actions]
  affects: [profiles, tickets, auth-users, guest_list_entries]
tech_stack:
  added: []
  patterns: [server-actions, fire-and-forget-email, hmac-qr-signing, auto-registration-via-admin-api]
key_files:
  created:
    - src/emails/guest-invitation.tsx
    - src/lib/guest-list/process-entry.ts
    - src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts
    - src/app/(organizer)/organizer/events/[id]/guest-list/page.tsx
    - src/app/(organizer)/organizer/events/[id]/guest-list/GuestListClient.tsx
  modified: []
decisions:
  - "Recovery link type (not invite) for password-set URL to avoid duplicate user creation"
  - "Existing users get ticket URL instead of password-set link in invitation email"
  - "500ms delay after createUser to allow handle_new_user trigger to create profile row"
  - "ilike for case-insensitive email matching in profiles lookup"
  - "maybeSingle instead of single for profile lookup to avoid error on no match"
metrics:
  duration_seconds: 269
  completed: "2026-03-09T22:50:43Z"
  tasks: 2
  files_created: 5
  files_modified: 0
---

# Phase 24 Plan 02: Core Guest List Management Summary

**One-liner:** Full guest list management with processing pipeline (auto-register, auto-approve, free ticket, branded invitation email with QR code), server actions for add/remove, and interactive organizer UI with status badges and party assignment.

## What Was Built

### Guest Invitation Email (`guest-invitation.tsx`)
- Branded email template following existing `ticket-confirmation.tsx` pattern
- Heading with BRAND.accent color and Orbitron font: "You're Invited, {name}"
- Event title, optional party title, date/time display
- Inline QR code via `cid:ticket-qr` attachment pattern
- "Set Your Password & Claim Account" button linking to recovery URL
- Conditionally renders party title only when provided

### Processing Pipeline (`process-entry.ts`)
- `processGuestEntry()` handles 3 paths:
  1. **No email** -> returns `name_only` (door check-in only)
  2. **Existing user** -> auto-approves if pending, checks for duplicate ticket, creates free ticket, sends invitation email
  3. **New user** -> creates account via `auth.admin.createUser()`, generates recovery link for password setup, creates free ticket, sends branded email with QR
- `createFreeTicket()` helper: duplicate detection, direct INSERT with `ticket_type: 'guest_list'`, `amount_paid: 0`, `tier_id: null`
- `sendGuestInvitation()` helper: HMAC-signed QR code generation, react-email rendering, Resend email with inline QR attachment
- Error handling: updates guest entry `status='failed'` with error message on any failure
- Fire-and-forget email sending pattern (non-blocking, errors logged)

### Server Actions (`actions.ts`)
- `addGuest()`: validates name/email, normalizes email to lowercase, inserts entry, handles unique constraint violation, auto-processes if email provided
- `removeGuest()`: checks if ticket exists, deletes entry, returns `hadTicket` flag for UI messaging
- `fetchGuestList()`: queries entries ordered by created_at desc
- All actions verify organizer/master role + event ownership via headers

### Guest List Page (`page.tsx`)
- Server component following existing sales page pattern
- Organizer/master access verification with redirect guards
- Fetches entries via service client, parties for dropdown
- Renders header with back link, title "Guest List", event subtitle

### Guest List Client Component (`GuestListClient.tsx`)
- Add guest form: first name (required), last name (required), email (optional), party selector dropdown
- Summary stats bar: total count + per-status counts with color-coded badges
- Guest list display: name, email, party assignment, status badge, remove button
- 7 status badges with distinct colors: pending (gray), invited (blue), registered (yellow), ticket_issued (green), checked_in (teal), already_has_ticket (muted), failed (red)
- Remove confirmation: different messages for with-ticket vs without-ticket guests
- Failed entries show error message inline in red
- Toast notifications for success/error feedback
- Uses `useRouter().refresh()` for server data refresh after mutations

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npm run build` passes without errors
- Guest list page registered at `/organizer/events/[id]/guest-list` (dynamic route)
- Add guest form validates required fields (first_name, last_name)
- Email format validation with regex
- Unique constraint handling for duplicate emails
- Guest list displays entries with status badges
- Remove guest shows appropriate warning based on ticket existence
- processGuestEntry handles all 3 paths (existing user, new user, no-email)
- Email template follows existing brand conventions (EmailLayout, BRAND, Orbitron font)
- QR code uses HMAC-signed ticket token (same pattern as ticket-confirmation webhook)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | dbc9ea0 | Guest invitation email template and processing pipeline |
| 2 | 24d0794 | Server actions and guest list management UI |

## Self-Check: PASSED
