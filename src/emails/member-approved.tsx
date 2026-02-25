import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

interface MemberApprovedEmailProps {
  memberName: string;
  loginUrl: string;
}

export function MemberApprovedEmail({
  memberName,
  loginUrl,
}: MemberApprovedEmailProps) {
  return (
    <EmailLayout preview="Your Resonate membership has been approved">
      <Heading
        style={{
          color: BRAND.foreground,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        You&apos;re In, {memberName}
      </Heading>

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "16px",
          lineHeight: "1.5",
          margin: "0 0 16px",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        Your membership has been approved. You now have full access to events,
        RSVPs, and the Resonate community.
      </Text>

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "14px",
          lineHeight: "1.5",
          margin: "0 0 24px",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        Browse upcoming events, RSVP to shows, and start inviting friends with
        your personal referral link.
      </Text>

      <Button
        href={loginUrl}
        style={{
          backgroundColor: BRAND.accent,
          color: "#ffffff",
          fontWeight: "bold",
          borderRadius: "9999px",
          padding: "12px 32px",
          fontSize: "14px",
          textDecoration: "none",
          display: "inline-block",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        Open Resonate
      </Button>
    </EmailLayout>
  );
}

export default MemberApprovedEmail;
