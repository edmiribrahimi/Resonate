import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

interface VenueRevealEmailProps {
  memberName: string;
  eventTitle: string;
  partyTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueAddress?: string;
  eventUrl: string;
}

export function VenueRevealEmail({
  memberName,
  eventTitle,
  partyTitle,
  eventDate,
  eventTime,
  venueName,
  venueAddress,
  eventUrl,
}: VenueRevealEmailProps) {
  return (
    <EmailLayout preview={`Venue revealed for ${eventTitle}!`}>
      <Heading
        style={{
          color: BRAND.accent,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        Venue Revealed!
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
        Hey {memberName}, the secret venue for your upcoming event has been revealed!
      </Text>

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
        {partyTitle}
      </Text>

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "14px",
          lineHeight: "1.5",
          margin: "0 0 16px",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        {eventDate} &middot; {eventTime}
      </Text>

      <Text
        style={{
          color: BRAND.accent,
          fontSize: "20px",
          fontWeight: "bold",
          lineHeight: "1.4",
          margin: "0 0 4px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        {venueName}
      </Text>

      {venueAddress && (
        <Text
          style={{
            color: BRAND.muted,
            fontSize: "14px",
            lineHeight: "1.5",
            margin: "0 0 24px",
            fontFamily: "'Arial', sans-serif",
          }}
        >
          {venueAddress}
        </Text>
      )}

      {!venueAddress && <div style={{ marginBottom: "24px" }} />}

      <Button
        href={eventUrl}
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
        View Event
      </Button>
    </EmailLayout>
  );
}

export default VenueRevealEmail;
