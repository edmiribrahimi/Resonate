import { Button, Heading, Img, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

interface GuestInvitationEmailProps {
  guestName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  partyTitle?: string;
  claimUrl: string;
}

export function GuestInvitationEmail({
  guestName,
  eventTitle,
  eventDate,
  eventTime,
  partyTitle,
  claimUrl,
}: GuestInvitationEmailProps) {
  return (
    <EmailLayout preview={`You're invited to ${eventTitle}`}>
      <Heading
        style={{
          color: BRAND.accent,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        You&apos;re Invited, {guestName}
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

      {partyTitle && (
        <Text
          style={{
            color: BRAND.muted,
            fontSize: "14px",
            lineHeight: "1.5",
            margin: "0 0 4px",
            fontFamily: "'Arial', sans-serif",
          }}
        >
          {partyTitle}
        </Text>
      )}

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
        href={claimUrl}
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
        Set Your Password &amp; Claim Account
      </Button>
    </EmailLayout>
  );
}

export default GuestInvitationEmail;
