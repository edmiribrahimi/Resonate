import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

/**
 * order-resume.tsx — la sola mail che riprende un ordine lasciato aperto
 * (CART-05, fase 52.2).
 *
 * Una mail sola, un'ora dopo, annullabile fino all'ultimo: la programma e la
 * annulla `src/lib/tickets/order-resume.ts`, e nessun cron la manda.
 *
 * **Cosa non ha, ed e' la sua proprieta' principale.** Nessun luogo — le props
 * non hanno un campo in cui metterlo, come `ticket-order.tsx` (`D-49-04`).
 * Nessuna offerta, nessun conto alla rovescia, nessun «ultimi posti»: e' una
 * cortesia verso chi si e' fermato, non una leva di vendita, e una mail che
 * spinge viene letta come la voce di chi l'ha scritta. **Un solo pulsante**:
 * il link permanente dell'ordine, lo stesso del ritorno dal pagamento.
 *
 * «Nothing has been charged» e' vero per costruzione: la mail si annulla quando
 * l'ordine si paga (anche quando si paga un ALTRO ordine della stessa serata con
 * lo stesso indirizzo di posta), e un ordine gratuito non la programma mai.
 *
 * Il testo e' in inglese, come il prodotto (`ticket-order.tsx`, 2026-09-21).
 */
interface OrderResumeEmailProps {
  eventTitle: string;
  /** Data civile della serata, gia' formattata (`formatEventDate` su `YYYY-MM-DD`). */
  dateLabel: string;
  tierName: string;
  /** `/tickets/order/<token>` — il link permanente dell'ordine. */
  resumeUrl: string;
}

const HEADING_FONT = "'Orbitron', 'Arial', sans-serif";
const BODY_FONT = "'Arial', sans-serif";

export function OrderResumeEmail({
  eventTitle,
  dateLabel,
  tierName,
  resumeUrl,
}: OrderResumeEmailProps) {
  return (
    <EmailLayout preview={`Your order for ${eventTitle} is still open`}>
      <Heading
        style={{
          color: BRAND.foreground,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: HEADING_FONT,
        }}
      >
        Your order is still open
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
        Your order for <strong>{eventTitle}</strong>, {dateLabel}, is still
        open. Nothing has been charged. Resume it here.
      </Text>

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "14px",
          lineHeight: "1.5",
          margin: "0 0 24px",
          fontFamily: BODY_FONT,
        }}
      >
        Ticket: {tierName}
      </Text>

      <Button
        href={resumeUrl}
        style={{
          backgroundColor: BRAND.accent,
          color: BRAND.onAccent,
          fontWeight: "bold",
          borderRadius: "9999px",
          padding: "12px 32px",
          fontSize: "14px",
          textDecoration: "none",
          display: "inline-block",
          fontFamily: HEADING_FONT,
        }}
      >
        Resume your order
      </Button>
    </EmailLayout>
  );
}

export default OrderResumeEmail;
