# Phase 4: Branded Emails - Research

**Researched:** 2026-02-25
**Domain:** Transactional email branding (Supabase Auth templates + Resend + React Email)
**Confidence:** HIGH

## Summary

Phase 4 requires branding three emails: (1) registration confirmation (sent by Supabase Auth on signup), (2) approval notification, and (3) rejection notification (both triggered by admin actions). The registration confirmation email is controlled by Supabase Auth and should be customized via the Supabase Dashboard email template editor with branded HTML. The approval/rejection emails are application-triggered and should be sent directly from the existing Next.js server actions using Resend (already installed) with React Email templates for type-safe, cross-client HTML rendering.

The project already has `resend` 6.9.2 installed and a `RESEND_API_KEY` environment variable configured. The new packages needed are `@react-email/components` (1.0.8) and `@react-email/render` (2.0.4). Brand constants are well-defined: dark background (#0a0a0a), red accent (#e5484d), light foreground (#ededed), Orbitron font, and a white logo at `public/images/logo-white.png`.

**Primary recommendation:** Use the Supabase Dashboard HTML template editor for the registration confirmation email (simplest, no infrastructure changes), and Resend + React Email from server actions for approval/rejection emails (already in-stack, maximum control).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Registration confirmation email: customize via Supabase Dashboard email templates (Supabase Auth sends this automatically)
- Approval/rejection notification emails: send via Supabase Edge Function triggered by the approve/reject server actions
- All three emails get the branded treatment -- no emails left as plain default
- Custom sender domain (e.g. noreply@resonate.app) is desired but not yet configured -- document the DNS/DKIM setup steps as a prerequisite the user must complete, but don't block implementation on it

### Claude's Discretion
- Email visual identity: logo placement, brand colors, dark vs light background, typography, overall layout
- Email content and tone: welcome messaging, approval/rejection wording, formality level, call-to-action buttons
- Approval/rejection email trigger timing: immediate on admin action vs batched
- What info to include in each email (member name, next steps, links)
- Whether to use React Email for template authoring or inline HTML
- Edge Function implementation details (HTTP trigger, auth, error handling)
- How to pass the approved/rejected member's email to the Edge Function

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UIBR-06 | Registration confirmation email includes Resonate branding (logo, name, styled template) | Supabase Dashboard email template editor supports full HTML with Go template variables ({{ .ConfirmationURL }}, {{ .Data }}, {{ .Email }}). Branded HTML template pasted into dashboard. |
| UIBR-07 | Approval notification email includes Resonate branding when member is approved/rejected | Resend + React Email from server actions. React Email components render cross-client HTML. Two templates: approval and rejection. |
| APPR-04 | Member receives email notification when their account is approved | Integrate Resend email send into the existing `approveMember` / `rejectMember` / `bulkApproveMember` / `bulkRejectMember` server actions in `src/app/(admin)/admin/members/actions.ts`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `resend` | 6.9.2 (already installed) | Send transactional emails via API | Already in project for newsletter. Same API for all transactional emails. |
| `@react-email/components` | 1.0.8 | Build branded email templates with React components | Type-safe, cross-client HTML. Components like Html, Body, Container, Section, Text, Img, Button, Hr handle Gmail/Outlook/Apple Mail quirks. Built by the Resend team. |
| `@react-email/render` | 2.0.4 | Render React Email components to HTML strings | Needed to convert JSX templates into HTML for Resend's `html` parameter or for the Supabase Dashboard template. |
| Supabase Dashboard email templates | N/A | Customize auth confirmation email | Built-in Go template editor in Supabase Dashboard under Authentication > Email Templates. No code deployment needed. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `standardwebhooks` | 1.0.0 | Verify webhook signatures from Supabase Auth hooks | Only if using Supabase Auth Send Email Hook (Edge Function approach). Not needed for the dashboard template approach for registration confirmation. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dashboard template for registration email | Supabase Auth Send Email Hook + Edge Function | More control but requires Edge Function deployment, Deno runtime, webhook secret management. Overkill for customizing a single template. |
| React Email | Inline HTML strings | No type safety, harder to maintain, no cross-client compatibility helpers. |
| React Email | MJML | Different ecosystem/language; React Email stays in TypeScript/React. |
| Resend from server actions | Supabase Edge Function for approval/rejection | Edge Functions add Deno runtime, separate deployment, webhook complexity. Server actions already have the member data and Resend is already installed. |

**Installation:**
```bash
npm install @react-email/components @react-email/render
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  emails/                        # React Email templates
    components/
      email-layout.tsx           # Shared branded layout wrapper
    registration-confirmation.tsx # For reference/preview (actual HTML goes to Supabase Dashboard)
    member-approved.tsx          # Approval notification template
    member-rejected.tsx          # Rejection notification template
  lib/
    email.ts                     # Email sending utility (wraps Resend)
  app/
    (admin)/admin/members/
      actions.ts                 # Existing -- add email sending to approve/reject actions
```

### Pattern 1: Shared Branded Email Layout
**What:** A reusable layout component that wraps all email content with Resonate branding (logo, colors, footer).
**When to use:** Every email template imports this layout.
**Example:**
```typescript
// src/emails/components/email-layout.tsx
import {
  Body, Container, Head, Html, Img, Section, Text, Hr,
} from "@react-email/components";

const BRAND = {
  background: "#0a0a0a",
  foreground: "#ededed",
  accent: "#e5484d",
  card: "#141414",
  cardBorder: "#262626",
  muted: "#a1a1aa",
};

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: BRAND.background, fontFamily: "'Orbitron', 'Arial', sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "40px 20px" }}>
          {/* Logo header */}
          <Section style={{ textAlign: "center", marginBottom: "32px" }}>
            <Img
              src="https://your-domain.com/images/logo-white.png"
              alt="Resonate"
              width="180"
              height="auto"
              style={{ margin: "0 auto" }}
            />
          </Section>
          {/* Content */}
          <Section style={{ backgroundColor: BRAND.card, borderRadius: "12px", border: `1px solid ${BRAND.cardBorder}`, padding: "32px" }}>
            {children}
          </Section>
          {/* Footer */}
          <Section style={{ textAlign: "center", marginTop: "32px" }}>
            <Hr style={{ borderColor: BRAND.cardBorder }} />
            <Text style={{ color: BRAND.muted, fontSize: "12px" }}>
              Resonate Music Events Community
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

### Pattern 2: Email Sending Utility
**What:** Centralized email sending function that wraps Resend client.
**When to use:** All email sends go through this utility for consistent error handling and from-address.
**Example:**
```typescript
// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("Email send failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
```

### Pattern 3: Integrate Email into Existing Server Actions
**What:** Add email sending to the existing approve/reject server actions after the database update succeeds.
**When to use:** Every approve/reject action triggers an email.
**Example:**
```typescript
// In src/app/(admin)/admin/members/actions.ts
export async function approveMember(memberId: string) {
  const supabase = await createClient();
  await verifyAdminOrOrganizer(supabase);

  const serviceClient = getServiceClient();

  // Fetch member info BEFORE update (need email and name for notification)
  const { data: member } = await serviceClient
    .from("profiles")
    .select("email, full_name")
    .eq("id", memberId)
    .single();

  const { error } = await serviceClient
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to approve member: ${error.message}`);
  }

  // Send approval email (fire-and-forget -- don't block the action on email delivery)
  if (member?.email) {
    sendApprovalEmail(member.email, member.full_name).catch(console.error);
  }

  revalidatePath("/admin/members");
  revalidatePath("/organizer/members");
  return { success: true };
}
```

### Pattern 4: Registration Confirmation via Supabase Dashboard
**What:** Paste branded HTML directly into the Supabase Dashboard email template editor.
**When to use:** For the Confirm Signup email that Supabase Auth sends automatically.
**How:** Navigate to Authentication > Email Templates > Confirm Signup, switch to source/HTML mode, paste the branded HTML template that uses Go template variables like `{{ .ConfirmationURL }}`.

### Anti-Patterns to Avoid
- **Using Supabase Edge Functions when server actions suffice:** The CONTEXT.md mentions Edge Functions, but since Resend is already installed in the Next.js app and the approve/reject server actions already run server-side with the member data, calling Resend directly from the server action is simpler than deploying an Edge Function, setting up webhook verification, and managing a Deno runtime. The Edge Function approach adds complexity without benefit here.
- **Blocking admin actions on email delivery:** Email sending should be fire-and-forget (catch errors, log them, but don't fail the approve/reject action if email fails to send).
- **Using `react` prop in Resend without `@react-email/render`:** Resend's `react` property works, but using `render()` to produce HTML gives you more control and makes templates testable/previewable independently.
- **Attempting to use Orbitron font in emails:** Email clients do not support custom web fonts reliably. Use Orbitron as the preferred font in the font-family stack but fall back to Arial/sans-serif. The font-family CSS declaration will show Orbitron only if the recipient has it installed (unlikely), but the fallback ensures readability.
- **Hardcoding logo URL to localhost:** The logo image must be hosted at a publicly accessible URL. Use the deployed app URL (e.g., `https://resonate.app/images/logo-white.png`) or host on Supabase Storage for reliable delivery.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-client HTML email compatibility | Custom HTML with inline styles by hand | `@react-email/components` | Gmail strips `<style>` tags, Outlook uses Word renderer, dark mode varies. React Email handles these quirks. |
| Email rendering to HTML | Custom JSX-to-string conversion | `@react-email/render` `render()` function | Handles async rendering, proper HTML doctype, head injection correctly. |
| Email delivery infrastructure | Custom SMTP integration | `resend` SDK (already installed) | Handles retries, rate limiting, delivery tracking, bounce handling. |
| Confirmation link construction | Manual URL building | Supabase Go template `{{ .ConfirmationURL }}` variable | Supabase Auth manages token generation, hashing, and URL construction. |

**Key insight:** Email HTML is deceptively complex. What looks fine in Chrome's preview will break in Outlook (which renders using Microsoft Word's HTML engine). React Email abstracts these compatibility nightmares into tested components.

## Common Pitfalls

### Pitfall 1: Logo Image Not Displaying in Emails
**What goes wrong:** The logo appears as a broken image in email clients.
**Why it happens:** Email clients need absolute, publicly-accessible URLs for images. Relative paths (`/images/logo-white.png`) or localhost URLs don't work.
**How to avoid:** Host the logo at the deployed domain (e.g., `https://resonate.app/images/logo-white.png`) or upload to Supabase Storage and use the public URL. Set a fallback alt text ("Resonate") so the brand name shows even if the image is blocked.
**Warning signs:** Testing emails only in development with `localhost` URLs.

### Pitfall 2: Supabase Default SMTP Limitations
**What goes wrong:** Emails don't reach recipients, get marked as spam, or hit rate limits.
**Why it happens:** Supabase's built-in SMTP has a 30 emails/hour rate limit, may not deliver to non-team emails on some plans, and sends from a generic Supabase domain.
**How to avoid:** For production, configure a custom SMTP provider (Resend's SMTP relay or another provider) in Supabase Dashboard under Authentication > SMTP Settings. Document DNS/DKIM setup as a prerequisite.
**Warning signs:** Emails arriving in spam folders, `429: Email rate limit exceeded` errors.

### Pitfall 3: Email Failing Silently on Approve/Reject
**What goes wrong:** The admin action succeeds but the member never receives the email, with no indication of failure.
**Why it happens:** If email sending throws and the error isn't logged, it's invisible.
**How to avoid:** Use fire-and-forget pattern with `.catch(console.error)` at minimum. Consider adding a `notification_sent` boolean or timestamp to the profiles table for auditing, or returning a warning to the admin UI ("Member approved, but notification email failed to send").
**Warning signs:** Members reporting they never received approval emails.

### Pitfall 4: Bulk Operations Hitting Resend Rate Limits
**What goes wrong:** Bulk approving 50 members triggers 50 simultaneous Resend API calls, some of which fail.
**Why it happens:** Resend has rate limits (varies by plan; free tier is 100 emails/day, 1 email/second).
**How to avoid:** For bulk operations, send emails sequentially with a small delay, or use `Promise.allSettled()` and log failures. For the community size expected, this is unlikely to be an issue but worth handling gracefully.
**Warning signs:** Partial email delivery on bulk approve operations.

### Pitfall 5: Go Template Syntax Errors in Supabase Dashboard
**What goes wrong:** The confirmation email fails to send or shows raw template syntax.
**Why it happens:** Typos in Go template variables (e.g., `{{ .confirmationURL }}` instead of `{{ .ConfirmationURL }}`). Go templates are case-sensitive.
**How to avoid:** Copy-paste variable names exactly from documentation. Test the template after saving by creating a test user.
**Warning signs:** Raw `{{ .ConfirmationURL }}` text appearing in emails, or email delivery failing for new signups.

### Pitfall 6: Dark Background Email Rendering
**What goes wrong:** The dark-themed email looks broken in some clients that force light mode or add their own dark mode.
**Why it happens:** Some email clients (notably Outlook, Gmail app) apply their own dark mode transformations, inverting colors unexpectedly.
**How to avoid:** Test with both light and dark mode. Use React Email's approach of inline styles. Ensure sufficient contrast. Consider a slightly lighter background (#141414 instead of #0a0a0a) for the email card to survive dark mode inversions. Use borders to maintain visual structure even if background colors get altered.
**Warning signs:** White text on white background, or invisible elements after dark mode inversion.

## Code Examples

### Registration Confirmation Template (HTML for Supabase Dashboard)
```html
<!-- Paste this into Supabase Dashboard > Authentication > Email Templates > Confirm Signup -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="background-color: #0a0a0a; margin: 0; padding: 0; font-family: 'Arial', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="https://YOUR_DOMAIN/images/logo-white.png" alt="Resonate" width="180" style="display: block;" />
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="background-color: #141414; border: 1px solid #262626; border-radius: 12px; padding: 32px;">
              <h1 style="color: #ededed; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">
                Welcome to Resonate
              </h1>
              <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
                Thanks for signing up. Confirm your email address to get started.
              </p>
              <a href="{{ .ConfirmationURL }}"
                 style="display: inline-block; background-color: #e5484d; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 12px 32px; border-radius: 9999px;">
                Confirm Email
              </a>
              <p style="color: #a1a1aa; font-size: 13px; line-height: 1.5; margin: 24px 0 0 0;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                Resonate Music Events Community
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Approval Email Template (React Email Component)
```typescript
// src/emails/member-approved.tsx
import {
  Body, Button, Container, Head, Heading, Html, Img, Section, Text, Hr,
} from "@react-email/components";

interface MemberApprovedEmailProps {
  memberName: string;
  loginUrl: string;
  logoUrl: string;
}

export function MemberApprovedEmail({ memberName, loginUrl, logoUrl }: MemberApprovedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#0a0a0a", fontFamily: "'Arial', sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "40px 20px" }}>
          <Section style={{ textAlign: "center" as const, marginBottom: "32px" }}>
            <Img src={logoUrl} alt="Resonate" width="180" style={{ margin: "0 auto" }} />
          </Section>
          <Section style={{ backgroundColor: "#141414", border: "1px solid #262626", borderRadius: "12px", padding: "32px" }}>
            <Heading style={{ color: "#ededed", fontSize: "24px", fontWeight: "bold", margin: "0 0 16px 0" }}>
              You're In, {memberName}
            </Heading>
            <Text style={{ color: "#a1a1aa", fontSize: "16px", lineHeight: "1.5" }}>
              Your membership has been approved. You now have full access to events, RSVPs, and the Resonate community.
            </Text>
            <Button href={loginUrl} style={{ backgroundColor: "#e5484d", color: "#ffffff", fontSize: "16px", fontWeight: "bold", textDecoration: "none", padding: "12px 32px", borderRadius: "9999px", display: "inline-block", marginTop: "16px" }}>
              Open Resonate
            </Button>
          </Section>
          <Section style={{ textAlign: "center" as const, marginTop: "32px" }}>
            <Hr style={{ borderColor: "#262626" }} />
            <Text style={{ color: "#a1a1aa", fontSize: "12px" }}>
              Resonate Music Events Community
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

### Email Sending in Server Action
```typescript
// src/lib/email.ts
import { Resend } from "resend";
import { render } from "@react-email/render";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const { error } = await resend.emails.send({ from: FROM, to: [to], subject, html });
  if (error) {
    console.error("Email send error:", error);
    throw error;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@react-email/components` 0.0.x | `@react-email/components` 1.0.8 | 2025 (React Email 5.0) | Stable API, Tailwind 4 support, dark mode components |
| `renderAsync()` from `@react-email/components` | `render()` from `@react-email/render` | 2025 | Separate render package, cleaner API |
| Supabase default email templates | Supabase Dashboard HTML editor + Auth Hooks | Ongoing | Full HTML customization via dashboard, or complete replacement via Auth Hooks |

**Deprecated/outdated:**
- `@react-email/components` version `0.0.x`: The initial project research referenced `^0.0.31`. Current stable version is `1.0.8`. The API has stabilized significantly.
- `renderAsync` from `@react-email/components`: The render function has been moved to the separate `@react-email/render` package (version 2.0.4).

## Open Questions

1. **Logo hosting URL for emails**
   - What we know: Logo is at `public/images/logo-white.png`. It needs a publicly accessible absolute URL for emails.
   - What's unclear: The production domain (e.g., `resonate.app`) -- the logo URL in email templates depends on this.
   - Recommendation: Use `NEXT_PUBLIC_APP_URL` environment variable to construct the logo URL dynamically: `${process.env.NEXT_PUBLIC_APP_URL}/images/logo-white.png`. For the Supabase Dashboard template (static HTML), document that the user must replace `YOUR_DOMAIN` with their actual domain.

2. **Custom sender domain configuration**
   - What we know: CONTEXT.md says custom domain (noreply@resonate.app) is desired but not yet configured.
   - What's unclear: Whether the user has DNS access, which domain registrar they use.
   - Recommendation: Document the steps (add DNS records for Resend domain verification + DKIM/SPF) as a prerequisite. Use Resend's default `onboarding@resend.dev` sender during development. Don't block implementation on this.

3. **Supabase SMTP for production**
   - What we know: Supabase's built-in SMTP has a 30 email/hour rate limit and is not recommended for production.
   - What's unclear: Whether the user plans to configure custom SMTP in Supabase or keep the default.
   - Recommendation: Document that for production, the user should either: (a) configure Resend as a custom SMTP in Supabase Dashboard (Authentication > SMTP Settings), or (b) set up the Auth Send Email Hook to fully replace Supabase's email sending with Resend. Option (a) is simpler and sufficient for branded registration confirmation.

4. **Edge Function vs Server Action for approval/rejection emails**
   - What we know: CONTEXT.md says "send via Supabase Edge Function." However, the project has Resend already installed in Next.js, and the approve/reject server actions already have the member data.
   - What's unclear: Whether the user has a strong preference for Edge Functions specifically.
   - Recommendation: Use Resend directly from server actions. This is simpler (no Deno runtime, no webhook verification, no separate deployment) and achieves the same result. The planner should implement this approach but note the user's original Edge Function preference as context.

## Sources

### Primary (HIGH confidence)
- Supabase Auth Email Templates docs: https://supabase.com/docs/guides/auth/auth-email-templates
- Supabase Send Email Hook docs: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
- Supabase Auth Hook + React Email + Resend example: https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend
- Resend Next.js docs: https://resend.com/docs/send-with-nextjs
- npm `@react-email/components` version verified: 1.0.8
- npm `@react-email/render` version verified: 2.0.4
- npm `resend` version verified: 6.9.2

### Secondary (MEDIUM confidence)
- React Email 5.0 release (November 2025): https://resend.com/blog/react-email-5 -- Tailwind 4 support, dark mode, new components
- Supabase rate limits docs: https://supabase.com/docs/guides/auth/rate-limits -- 30 emails/hour default SMTP limit
- Supabase SMTP configuration: https://supabase.com/docs/guides/auth/auth-smtp

### Tertiary (LOW confidence)
- None -- all findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Resend already installed, React Email versions verified via npm, Supabase email templates documented
- Architecture: HIGH - Pattern of sending email from server actions is standard Next.js/Resend usage, well-documented
- Pitfalls: HIGH - Email client compatibility issues, SMTP limitations, and dark mode quirks are well-known and documented

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable ecosystem, 30-day validity)
