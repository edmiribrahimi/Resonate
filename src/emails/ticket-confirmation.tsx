import { Button, Heading, Img, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

interface TicketConfirmationEmailProps {
  memberName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  tierName: string;
  ticketUrl: string;
}

export function TicketConfirmationEmail({
  memberName,
  eventTitle,
  eventDate,
  eventTime,
  tierName,
  ticketUrl,
}: TicketConfirmationEmailProps) {
  return (
    <EmailLayout preview={`Your ticket for ${eventTitle}`}>
      <Heading
        style={{
          color: BRAND.accent,
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
          color: BRAND.foreground,
          fontSize: "18px",
          fontWeight: "bold",
          lineHeight: "1.4",
          margin: "0 0 4px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        {eventTitle}
      </Text>

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "14px",
          lineHeight: "1.5",
          margin: "0 0 4px",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        {tierName}
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
        {eventDate} &middot; {eventTime}
      </Text>

      <Img
        src="cid:ticket-qr"
        alt="Ticket QR Code"
        width="200"
        height="200"
        style={{
          margin: "0 auto",
          display: "block",
        }}
      />

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "12px",
          lineHeight: "1.5",
          margin: "16px 0 24px",
          textAlign: "center" as const,
          fontFamily: "'Arial', sans-serif",
        }}
      >
        Show this QR code at the door for entry
      </Text>

      <Button
        href={ticketUrl}
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
        View Your Ticket
      </Button>
    </EmailLayout>
  );
}

export default TicketConfirmationEmail;
