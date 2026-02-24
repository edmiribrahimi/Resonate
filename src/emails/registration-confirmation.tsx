import {
  Button,
  Heading,
  Text,
} from "@react-email/components";
import * as React from "react";

import { BRAND, EmailLayout } from "./components/email-layout";

interface RegistrationConfirmationEmailProps {
  confirmationUrl: string;
  email?: string;
}

export function RegistrationConfirmationEmail({
  confirmationUrl,
  email,
}: RegistrationConfirmationEmailProps) {
  return (
    <EmailLayout preview="Confirm your email to join Resonate">
      <Heading
        style={{
          color: BRAND.foreground,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px 0",
        }}
      >
        Welcome to Resonate
      </Heading>

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "16px",
          lineHeight: "1.5",
          margin: "0 0 24px 0",
        }}
      >
        Thanks for signing up{email ? ` with ${email}` : ""}. Confirm your
        email address to get started.
      </Text>

      <Button
        href={confirmationUrl}
        style={{
          backgroundColor: BRAND.accent,
          color: "#ffffff",
          fontSize: "16px",
          fontWeight: "bold",
          textDecoration: "none",
          padding: "12px 32px",
          borderRadius: "9999px",
          display: "inline-block",
        }}
      >
        Confirm Email
      </Button>

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "13px",
          lineHeight: "1.5",
          margin: "24px 0 0 0",
        }}
      >
        If you didn&apos;t create an account, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

export default RegistrationConfirmationEmail;

// ---------------------------------------------------------------------------
// Supabase Dashboard HTML Generation
// ---------------------------------------------------------------------------
//
// To generate the HTML for Supabase Dashboard:
// 1. Import { render } from "@react-email/render"
// 2. Call: const html = await render(<RegistrationConfirmationEmail confirmationUrl="{{ .ConfirmationURL }}" />)
// 3. Paste the output into Supabase Dashboard > Authentication > Email Templates > Confirm Signup
//
// Or use the pre-rendered HTML in src/emails/templates/registration-confirmation.html
