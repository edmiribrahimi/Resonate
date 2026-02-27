import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

interface RefundRejectedEmailProps {
  memberName: string;
  eventTitle: string;
  adminNote?: string;
}

export function RefundRejectedEmail({
  memberName,
  eventTitle,
  adminNote,
}: RefundRejectedEmailProps) {
  return (
    <EmailLayout preview={`Refund update for ${eventTitle}`}>
      <Heading
        style={{
          color: BRAND.foreground,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        Refund Update
      </Heading>

      <Text
        style={{
          color: BRAND.foreground,
          fontSize: "16px",
          lineHeight: "1.5",
          margin: "0 0 16px",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        Hey {memberName}, unfortunately your refund request for{" "}
        <strong>{eventTitle}</strong> was not approved.
      </Text>

      {adminNote && (
        <Text
          style={{
            color: BRAND.muted,
            fontSize: "14px",
            lineHeight: "1.5",
            margin: "0 0 16px",
            padding: "12px 16px",
            backgroundColor: BRAND.card,
            border: `1px solid ${BRAND.cardBorder}`,
            borderRadius: "8px",
            fontFamily: "'Arial', sans-serif",
          }}
        >
          &ldquo;{adminNote}&rdquo;
        </Text>
      )}

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "14px",
          lineHeight: "1.5",
          margin: "0",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        If you have questions, please reach out to us directly.
      </Text>
    </EmailLayout>
  );
}

export default RefundRejectedEmail;
