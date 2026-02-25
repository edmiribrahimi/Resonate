import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

interface MemberRejectedEmailProps {
  memberName: string;
}

export function MemberRejectedEmail({
  memberName,
}: MemberRejectedEmailProps) {
  return (
    <EmailLayout preview="Update on your Resonate membership application">
      <Heading
        style={{
          color: BRAND.foreground,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        Membership Update
      </Heading>

      <Text
        style={{
          color: BRAND.foreground,
          fontSize: "16px",
          lineHeight: "1.5",
          margin: "0 0 12px",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        Hi {memberName},
      </Text>

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "16px",
          lineHeight: "1.5",
          margin: "0 0 16px",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        Thanks for your interest in Resonate. After reviewing your application,
        we&apos;re unable to approve your membership at this time.
      </Text>

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "14px",
          lineHeight: "1.5",
          margin: "0",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        If you were referred by an existing member, please reach out to them for
        assistance. We appreciate your understanding.
      </Text>
    </EmailLayout>
  );
}

export default MemberRejectedEmail;
