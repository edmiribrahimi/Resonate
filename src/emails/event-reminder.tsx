import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

interface EventReminderEmailProps {
  memberName: string;
  eventTitle: string;
  partyTitle: string;
  eventDate: string;
  eventTime: string;
  eventUrl: string;
}

export function EventReminderEmail({
  memberName,
  eventTitle,
  partyTitle,
  eventDate,
  eventTime,
  eventUrl,
}: EventReminderEmailProps) {
  return (
    <EmailLayout preview={`Reminder: ${eventTitle} is tomorrow!`}>
      <Heading
        style={{
          color: BRAND.accent,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        See You Tomorrow!
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
        Hey {memberName}, just a reminder that you have an upcoming event!
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
          margin: "0 0 24px",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        {eventDate} &middot; {eventTime}
      </Text>

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

export default EventReminderEmail;
