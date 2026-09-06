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
 * IL TESTO E' IN ITALIANO
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * `comms-analytics.md`, gate *template in italiano*: i materiali verso chi compra
 * sono in italiano; **l'interfaccia resta in inglese**, e le due lingue convivono
 * per destinatario, non per caso. *(Gli altri dodici template di `src/emails/`
 * sono in inglese e precedono quel gate: sono debito dichiarato altrove, non un
 * precedente da imitare.)*
 */
export interface TicketOrderTicket {
  /** «1 di 6» — da `tickets.holder_label`. **Non e' un nome** (`D-49-03`). */
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
   */
  qrCid: string;
}

interface TicketOrderEmailProps {
  /** Come ci si rivolge a chi ha comprato. Nessun nome viene chiesto: e' la mail. */
  buyerLabel: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  partyTitle?: string;
  tierName: string;
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

export function TicketOrderEmail({
  buyerLabel,
  eventTitle,
  eventDate,
  eventTime,
  partyTitle,
  tierName,
  tickets,
  completeAccountUrl,
}: TicketOrderEmailProps) {
  const many = tickets.length > 1;

  return (
    <EmailLayout
      preview={
        many
          ? `I tuoi ${tickets.length} biglietti per ${eventTitle}`
          : `Il tuo biglietto per ${eventTitle}`
      }
    >
      <Heading
        style={{
          color: BRAND.accent,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        {many ? "I tuoi biglietti" : "Il tuo biglietto"}
      </Heading>

      <Text
        style={{
          color: BRAND.foreground,
          fontSize: "16px",
          lineHeight: "1.5",
          margin: "0 0 20px",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        Ciao {buyerLabel}, il pagamento e&apos; andato a buon fine.
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
        {partyTitle ? `${partyTitle} - ${tierName}` : tierName}
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
        {eventDate}
        {eventTime ? ` · ${eventTime}` : ""}
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
              fontFamily: "'Orbitron', 'Arial', sans-serif",
            }}
          >
            Biglietto {ticket.label}
          </Text>

          <Img
            src={`cid:${ticket.qrCid}`}
            alt={`Codice del biglietto ${ticket.label}`}
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
              fontFamily: "'Arial', sans-serif",
            }}
          >
            Mostra questo codice all&apos;ingresso.
          </Text>

          <Text
            style={{
              fontSize: "12px",
              lineHeight: "1.5",
              margin: "0 0 20px",
              textAlign: "center" as const,
              fontFamily: "'Arial', sans-serif",
            }}
          >
            <a href={ticket.url} style={{ color: BRAND.accent }}>
              Apri il biglietto {ticket.label}
            </a>
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
          fontFamily: "'Arial', sans-serif",
        }}
      >
        {many
          ? "Ogni biglietto vale per una persona: inoltra questo messaggio, o il singolo codice, a chi viene con te. I biglietti si aprono da qui e dai link qui sopra, senza bisogno di accedere."
          : "Il biglietto si apre da qui e dal link qui sopra, senza bisogno di accedere."}
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
              fontFamily: "'Orbitron', 'Arial', sans-serif",
            }}
          >
            Completa il tuo account
          </Text>

          {/*
            «Completa il tuo account», mai «diventa membro» — decisione 5 del
            proprietario, e la ragione e' il gate dei due assi di `CLAUDE.md`
            (principio 8): **il pagamento ha gia' ammesso**, la password non
            ammette nessuno. Aggiunge solo un modo per rientrare da un altro
            telefono. Una frase che promettesse un ingresso attribuirebbe alla
            password l'effetto che ha avuto il pagamento — il principio violato
            nel punto in cui il prodotto parla, da dove passa poi nel codice.
          */}
          <Text
            style={{
              color: BRAND.muted,
              fontSize: "13px",
              lineHeight: "1.6",
              margin: "0 0 16px",
              fontFamily: "'Arial', sans-serif",
            }}
          >
            Scegli una password e potrai ritrovare i tuoi biglietti da qualunque
            dispositivo, anche se perdi questo messaggio.
          </Text>

          <Button
            href={completeAccountUrl}
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
            Completa il tuo account
          </Button>
        </>
      )}
    </EmailLayout>
  );
}

export default TicketOrderEmail;
