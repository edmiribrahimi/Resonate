import { Button, Heading, Hr, Img, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

/**
 * ticket-order.tsx — la mail di un ordine comprato **senza account**.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * COSA QUESTO TEMPLATE NON HA, E PERCHE' L'ASSENZA E' LA SUA PROPRIETA'
 *   PRINCIPALE
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * **Non ha nessuna prop di luogo, e non deve acquisirne una.** Decisione del
 * proprietario `D-49-04`, 2026-09-05: il posto dove si suona raggiunge **solo**
 * chi ha comprato, per la sua strada — il countdown della rivelazione, per mail,
 * dal cron — e chi ha comprato lo inoltra a chi tiene i biglietti come gli ha
 * inoltrato i biglietti. **Questa mail non e' quella strada.**
 *
 * La guardia e' scritta nella forma delle props invece che in una regola da
 * ricordare: non esiste un campo in cui un valore del genere possa entrare, e
 * aggiungerne uno «per rendere la mail piu' utile» significherebbe far uscire un
 * segreto da un percorso che nessun controllo automatico sorveglia — la mail
 * dell'ordine non e' fra le superfici che `verify-venue-surfaces.mjs` conosce.
 * `venue-secrecy.md` piu' `comms-analytics.md`, gate *contenuto verso
 * destinatario*.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * PERCHE' UN BLOCCO PER BIGLIETTO E NON UN CODICE SOLO
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * `D-49-03`: il biglietto e' **al portatore**, ed e' il caso progettato — sei e'
 * un gruppo di amici con un solo pagante, quindi cinque biglietti su sei
 * finiranno in mano a qualcun altro. Chi ha comprato deve poterli **distinguere
 * per inoltrarli**, e sei riquadri identici non si distinguono. E' la ragione per
 * cui `tickets.holder_label` esiste e porta «2 di 6» invece di un nome: un nome
 * su un biglietto trasferibile fa rifiutare un ospite valido davanti a una fila.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * IL TESTO E' IN INGLESE, COME IL PRODOTTO
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Fino al 2026-09-21 questo template era in italiano, e `comms-analytics.md`
 * lo chiedeva. Il proprietario, guardando la mail accanto all'app, ha deciso
 * il contrario: **l'app e' in inglese, e la mail dell'ordine e' la ricevuta di
 * un acquisto fatto in inglese** — due lingue nello stesso percorso leggono
 * come due mittenti. Il gate e' stato riscritto (`CHANGELOG.md` 1.23.0), e gli
 * altri dodici template — gia' in inglese — smettono di essere debito.
 *
 * L'etichetta del portatore in tabella resta «2 di 6» (coniata in SQL,
 * `20260905120100:242`): la traduce `formatHolderLabel` nel punto in cui si
 * mostra, perche' le righe emesse non si riscrivono.
 */
export interface TicketOrderTicket {
  /** «1 of 6» — da `tickets.holder_label`, tradotta. **Non e' un nome** (`D-49-03`). */
  label: string;
  /**
   * Il link permanente di quel biglietto dentro il prodotto.
   *
   * *(Questa riga diceva «il recapito permanente» con una parola che in italiano
   * significa **anche** un posto fisico. In un template la cui unica proprieta'
   * critica e' di non portarne nessuno, una parola ambigua e' un invito a
   * riempirla: la seconda persona che legge scrive dentro `url` la cosa
   * sbagliata in buona fede.)*
   */
  url: string;
  /**
   * L'identificativo dell'immagine allegata che porta il suo QR.
   *
   * Passato invece che derivato dalla posizione: le immagini in linea vivono in
   * **due file** — il nome dell'allegato lo sceglie
   * `src/lib/tickets/order-confirmation.ts`, il riferimento lo scrive questo — e
   * due conteggi indipendenti che devono coincidere divergono al primo che
   * qualcuno tocca. Con sei biglietti la divergenza non e' un'immagine rotta: e'
   * **il QR sbagliato accanto all'etichetta giusta**, cioe' due persone respinte
   * alla porta invece di una.
   *
   * Dal 2026-09-21 e' anche il `contentId` dell'allegato: senza quello il
   * `cid:` qui sotto non trova niente e il riquadro resta vuoto.
   */
  qrCid: string;
}

interface TicketOrderEmailProps {
  /**
   * Il nome di chi ha comprato, **oppure `null`**: allora si saluta senza nome.
   * Viene da `ticket_orders.buyer_name` o da `profiles.full_name` (D-50-18b);
   * mai dalla parte locale dell'indirizzo, che non e' un nome.
   */
  buyerName: string | null;
  /**
   * `true` per un ordine a totale zero (REG-06). Cambia **una frase**: una
   * prenotazione gratuita non ha un pagamento andato a buon fine, e dirlo
   * sarebbe falso sulla prima riga.
   */
  isFree: boolean;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  /** L'orario di fine, quando c'e'. Vuoto altrimenti: si stampa solo l'inizio. */
  eventEndTime: string;
  partyTitle?: string;
  tierName: string;
  /**
   * Cosa include il livello, sotto il nome del tier. `null` → la riga non
   * compare. E' la stessa frase della pagina del biglietto: alla porta si
   * mostra l'una o l'altra, e devono dire la stessa cosa.
   */
  tierDescription: string | null;
  tickets: TicketOrderTicket[];
  /**
   * Il link che porta alla scelta della password, **oppure `null`**.
   *
   * `null` non e' un caso limite da ignorare: se il link non si e' potuto
   * costruire il blocco **non compare affatto**, perche' mandare qualcuno davanti
   * a una password che non ha mai scelto e' peggio che non offrirgliela. La mail
   * parte comunque, con i biglietti, che sono la cosa per cui ha pagato.
   */
  completeAccountUrl: string | null;
}

const HEADING_FONT = "'Orbitron', 'Arial', sans-serif";
const BODY_FONT = "'Arial', sans-serif";

export function TicketOrderEmail({
  buyerName,
  isFree,
  eventTitle,
  eventDate,
  eventTime,
  eventEndTime,
  partyTitle,
  tierName,
  tierDescription,
  tickets,
  completeAccountUrl,
}: TicketOrderEmailProps) {
  const many = tickets.length > 1;
  const preview = many
    ? `Your ${tickets.length} tickets for ${eventTitle}`
    : `Your ticket for ${eventTitle}`;

  // «Lab Free Night - RSVP» ripeteva il nome della serata: quando il titolo
  // della serata coincide con quello dell'evento si stampa solo il tier.
  const subtitle =
    partyTitle && partyTitle !== eventTitle ? `${partyTitle} · ${tierName}` : tierName;

  const when = [eventDate, eventTime ? (eventEndTime ? `${eventTime} – ${eventEndTime}` : eventTime) : ""]
    .filter(Boolean)
    .join(" · ");

  const greeting = buyerName ? `Hi ${buyerName},` : "Hi,";
  const opening = isFree
    ? many
      ? "your booking is confirmed. Your tickets are below."
      : "your booking is confirmed. Your ticket is below."
    : many
      ? "your payment went through. Your tickets are below."
      : "your payment went through. Your ticket is below.";

  return (
    <EmailLayout preview={preview}>
      <Heading
        style={{
          color: BRAND.accent,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: HEADING_FONT,
        }}
      >
        {many ? "Your tickets" : "Your ticket"}
      </Heading>

      <Text
        style={{
          color: BRAND.foreground,
          fontSize: "16px",
          lineHeight: "1.5",
          margin: "0 0 20px",
          fontFamily: BODY_FONT,
        }}
      >
        {greeting} {opening}
      </Text>

      <Text
        style={{
          color: BRAND.foreground,
          fontSize: "18px",
          fontWeight: "bold",
          lineHeight: "1.4",
          margin: "0 0 4px",
          fontFamily: HEADING_FONT,
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
          fontFamily: BODY_FONT,
        }}
      >
        {subtitle}
      </Text>

      {tierDescription ? (
        <Text
          style={{
            color: BRAND.foreground,
            fontSize: "14px",
            lineHeight: "1.5",
            margin: "0 0 4px",
            fontFamily: BODY_FONT,
            whiteSpace: "pre-line",
          }}
        >
          {tierDescription}
        </Text>
      ) : null}

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "14px",
          lineHeight: "1.5",
          margin: "0 0 24px",
          fontFamily: BODY_FONT,
        }}
      >
        {when}
      </Text>

      {/*
        Un riquadro per biglietto. L'etichetta sta SOPRA il codice e non sotto:
        chi inoltra il terzo biglietto a qualcuno taglia lo schermo, e cio' che
        resta fuori dal taglio deve essere l'etichetta di un altro, mai il codice
        di questo.
      */}
      {tickets.map((ticket) => (
        <React.Fragment key={ticket.qrCid}>
          <Hr style={{ borderColor: BRAND.cardBorder, margin: "0 0 16px" }} />

          <Text
            style={{
              color: BRAND.accent,
              fontSize: "14px",
              fontWeight: "bold",
              lineHeight: "1.4",
              margin: "0 0 12px",
              textAlign: "center" as const,
              fontFamily: HEADING_FONT,
            }}
          >
            Ticket {ticket.label}
          </Text>

          <Img
            src={`cid:${ticket.qrCid}`}
            alt={`QR code for ticket ${ticket.label}`}
            width="200"
            height="200"
            style={{ margin: "0 auto", display: "block" }}
          />

          <Text
            style={{
              color: BRAND.muted,
              fontSize: "12px",
              lineHeight: "1.5",
              margin: "12px 0 8px",
              textAlign: "center" as const,
              fontFamily: BODY_FONT,
            }}
          >
            Show this code at the door.
          </Text>

          <Text
            style={{
              fontSize: "12px",
              lineHeight: "1.5",
              margin: "0 0 20px",
              textAlign: "center" as const,
              fontFamily: BODY_FONT,
            }}
          >
            {/* The house `Button` from @react-email/components, not a bare
                `<a>`: the link is tapped on a phone, and a 12px line of text is
                not a 44px target (`verify:touch-targets`, red since phase 50).
                Same primitive as «Complete your account» below, drawn lighter
                because it is one of N per order, not the one call to action. */}
            <Button
              href={ticket.url}
              style={{
                color: BRAND.accent,
                fontWeight: "bold",
                fontSize: "13px",
                textDecoration: "underline",
                display: "inline-block",
                padding: "12px 16px",
                fontFamily: BODY_FONT,
              }}
            >
              Open ticket {ticket.label}
            </Button>
          </Text>
        </React.Fragment>
      ))}

      <Hr style={{ borderColor: BRAND.cardBorder, margin: "0 0 16px" }} />

      {/*
        La riga che toglie una domanda invece di aggiungere un passaggio: chi ha
        comprato senza account non ha una password, e un prodotto che parlasse di
        «accedi per vedere il biglietto» lo manderebbe contro un muro. E' la
        stessa scelta gia' presa sulla pagina della serata.
      */}
      <Text
        style={{
          color: BRAND.muted,
          fontSize: "13px",
          lineHeight: "1.6",
          margin: "0 0 24px",
          fontFamily: BODY_FONT,
        }}
      >
        {many
          ? "Each ticket admits one person: forward this email, or a single code, to whoever is coming with you. Tickets open from here and from the links above — no sign-in needed."
          : "Your ticket opens from here and from the link above — no sign-in needed."}
      </Text>

      {completeAccountUrl && (
        <>
          <Text
            style={{
              color: BRAND.foreground,
              fontSize: "16px",
              fontWeight: "bold",
              lineHeight: "1.4",
              margin: "0 0 8px",
              fontFamily: HEADING_FONT,
            }}
          >
            Complete your account
          </Text>

          {/*
            «Complete your account», mai «diventa membro» — decisione 5 del
            proprietario, e la ragione e' il principio 8 di `CLAUDE.md`: **il
            pagamento ha gia' ammesso**, la password non ammette nessuno.
            Aggiunge solo un modo per rientrare da un altro telefono. Una frase
            che promettesse un ingresso attribuirebbe alla password l'effetto
            che ha avuto il pagamento — il principio violato nel punto in cui il
            prodotto parla, da dove passa poi nel codice.
          */}
          <Text
            style={{
              color: BRAND.muted,
              fontSize: "13px",
              lineHeight: "1.6",
              margin: "0 0 16px",
              fontFamily: BODY_FONT,
            }}
          >
            Choose a password and you will be able to find your tickets from any
            device, even if you lose this email.
          </Text>

          <Button
            href={completeAccountUrl}
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
            Complete your account
          </Button>
        </>
      )}
    </EmailLayout>
  );
}

export default TicketOrderEmail;
