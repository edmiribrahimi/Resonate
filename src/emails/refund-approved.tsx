import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

interface RefundApprovedEmailProps {
  memberName: string;
  eventTitle: string;
  amount: number;
}

export function RefundApprovedEmail({
  memberName,
  eventTitle,
  amount,
}: RefundApprovedEmailProps) {
  return (
    <EmailLayout preview={`Refund approved for ${eventTitle}`}>
      <Heading
        style={{
          color: "#22c55e",
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        Refund Approved
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
        Hey {memberName}, your refund request for{" "}
        <strong>{eventTitle}</strong> has been approved.
      </Text>

      <Text
        style={{
          color: BRAND.foreground,
          fontSize: "20px",
          fontWeight: "bold",
          lineHeight: "1.4",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        &euro;{amount.toFixed(2)}
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
        The refund will be processed to your original payment method within 5-10
        business days.
      </Text>
    </EmailLayout>
  );
}

export default RefundApprovedEmail;
