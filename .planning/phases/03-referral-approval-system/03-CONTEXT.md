# Phase 3: Referral & Approval System - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the trust-gated community access system. Approved members get a unique referral link. Users who register via referral are auto-approved. Users who register without referral land as pending. Master and organizers can approve/reject pending members. Referral relationships are tracked and visible in admin views. No new notification emails (that's Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Referral Link Experience
- Referral link visible in TWO places: member's dashboard page AND membership card page
- Only approved members get a referral link — pending/rejected members cannot invite anyone
- Referral link redirects straight to /register with referral code pre-filled — no intermediate welcome/landing page
- Link format is Claude's discretion (can reuse existing membership_code or generate a separate code)

### Registration with/without Referral
- Registration form looks identical whether referred or not — no visual indication of referral code being used
- Referred users get standard welcome messaging — no mention of who referred them
- Non-referred users redirect to /dashboard after signup which shows the existing "pending approval" message (built in Phase 2)
- Default new user status stays "approved" for now — do NOT change the handle_new_user trigger default yet. The referral detection logic sets status based on whether a valid referral code was provided, but the trigger default remains "approved" so existing manual signups aren't broken. This can be flipped to "pending" by the master later or in a future update.

### Approval Queue for Admins
- Approval queue lives as a tab/filter on the EXISTING /admin/members and /organizer/members pages — not a separate page
- Both master AND organizers can approve/reject pending members
- Bulk approve/reject supported: checkboxes on pending members with "Approve selected" / "Reject selected" buttons
- Pending member info shown: name, email, signup date — no Instagram or social media fields
- No Instagram/social field on registration form

### Referral Tracking Visibility
- Referral tracking is admin-only — members do NOT see who they've referred
- "Referred by" info shown in an expandable member detail row (not as a column in the main table)
- Referral count per member shown in the expandable detail: "Referred X members"
- Expandable detail also includes attendance context (events attended, attendance count) for a fuller admin picture

### Claude's Discretion
- Referral link format (reuse membership_code vs separate referral code)
- Referral code storage approach (new column, separate table, or reuse existing field)
- Expandable row implementation pattern (accordion, modal, slide-out)
- How to wire referral detection into the registration/auth callback flow
- Tab/filter implementation on the existing member management pages
- Bulk action UI pattern (toolbar, sticky footer, inline buttons)

</decisions>

<specifics>
## Specific Ideas

- The existing MemberTable component from Phase 2 should be extended (not replaced) to support the pending tab, bulk actions, and expandable detail rows
- The Phase 2 dashboard already shows "Your account is pending approval" — this is the post-registration destination for non-referred users
- Phase 2's handle_new_user trigger defaults to status='approved' — the referral system should set status at registration time based on referral code presence, not change the trigger default

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-referral-approval-system*
*Context gathered: 2026-02-24*
