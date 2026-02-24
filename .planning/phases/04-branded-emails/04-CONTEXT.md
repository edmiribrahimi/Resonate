# Phase 4: Branded Emails - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Brand all transactional emails with the Resonate identity. Three emails in scope: registration confirmation, approval notification, and rejection notification. No new email types — just branding existing flows and adding the approval/rejection emails triggered by admin actions.

</domain>

<decisions>
## Implementation Decisions

### Delivery Infrastructure
- Registration confirmation email: customize via Supabase Dashboard email templates (Supabase Auth sends this automatically)
- Approval/rejection notification emails: send directly from the existing approve/reject server actions using Resend (already installed). No Edge Function needed — simpler approach confirmed after research.
- All three emails get the branded treatment — no emails left as plain default
- Custom sender domain (e.g. noreply@resonate.app) is desired but not yet configured — document the DNS/DKIM setup steps as a prerequisite the user must complete, but don't block implementation on it

### Claude's Discretion
- Email visual identity: logo placement, brand colors, dark vs light background, typography, overall layout
- Email content and tone: welcome messaging, approval/rejection wording, formality level, call-to-action buttons
- Approval/rejection email trigger timing: immediate on admin action vs batched
- What info to include in each email (member name, next steps, links)
- Whether to use React Email for template authoring or inline HTML
- Email sending implementation details (fire-and-forget vs awaited, error handling)

</decisions>

<specifics>
## Specific Ideas

- The Resonate logo (white on transparent) is at `public/images/logo-white.png` — can be hosted/referenced in emails
- The site uses Orbitron font and a dark theme — email design should feel consistent with the site aesthetic
- The existing Resend integration (`src/app/api/newsletter/route.ts`) is for the newsletter only — this phase reuses Resend for approval/rejection emails too

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-branded-emails*
*Context gathered: 2026-02-25*
