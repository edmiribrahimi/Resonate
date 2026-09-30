import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

/**
 * ticket-refunded.tsx — la mail di rimborso, **neutra** (RFD-01, fase 52.2).
 *
 * La stessa mail parte dalle tre strade del rimborso — la richiesta approvata,
 * l'organizer che rimborsa dall'app, il cron che trova il rimborso fatto su
 * SumUp — e la manda `src/lib/tickets/refund-notice.ts` al **titolare del
 * biglietto**. Per questo non dice «your refund request has been approved»
 * (`refund-approved.tsx`): per due strade su tre nessuno ha chiesto niente, e
 * una frase falsa sul denaro e' peggio di nessuna frase.
 *
 * Il titolo e' in `BRAND.foreground`: il verde del template d'origine non e' un
 * colore della palette.
 *
 * `refundedDateLabel` nullo significa che la data non si e' potuta leggere
 * (`turinWallClock` → `null`), e il testo lo dice invece di inventarne una.
 * `amount === 0` e' un biglietto gratuito o di guest list: nessuna riga su
 * carta e importo, perche' non c'e' niente che torni indietro.
 *
 * Nessun pulsante, nessun luogo: il biglietto non e' piu' valido, e una mail
 * che toglie un ingresso non ha nulla da far aprire.
 */
interface TicketRefundedEmailProps {
  eventTitle: string;
  /** «1 of 6» gia' tradotta, o `null`. Non e' un nome (`D-49-03`). */
  holderLabel: string | null;
  refundedDateLabel: string | null;
  amount: number;
}

const HEADING_FONT = "'Orbitron', 'Arial', sans-serif";
const BODY_FONT = "'Arial', sans-serif";

export function TicketRefundedEmail({
  eventTitle,
  holderLabel,
  refundedDateLabel,
  amount,
}: TicketRefundedEmailProps) {
  return (
    <EmailLayout preview={`Your ticket for ${eventTitle} was refunded`}>
      <Heading
        style={{
          color: BRAND.foreground,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: HEADING_FONT,
        }}
      >
        Ticket refunded
      </Heading>

      <Text
        style={{
          color: BRAND.foreground,
          fontSize: "16px",
          lineHeight: "1.5",
          margin: "0 0 16px",
          fontFamily: BODY_FONT,
        }}
      >
        Your ticket for <strong>{eventTitle}</strong>
        {holderLabel ? ` (${holderLabel})` : ""}{" "}
        {refundedDateLabel
          ? `was refunded on ${refundedDateLabel}.`
          : "was refunded (we could not read the refund date)."}{" "}
        It is no longer valid at the door.
      </Text>

      {amount > 0 && (
        <>
          <Text
            style={{
              color: BRAND.foreground,
              fontSize: "20px",
              fontWeight: "bold",
              lineHeight: "1.4",
              margin: "0 0 16px",
              fontFamily: HEADING_FONT,
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
              fontFamily: BODY_FONT,
            }}
          >
            The refund goes back to the card you paid with; your bank may take a
            few days to show it.
          </Text>
        </>
      )}
    </EmailLayout>
  );
}

export default TicketRefundedEmail;
