import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

/**
 * La riammissione — il messaggio che prima non esisteva.
 *
 * ── Perche' questo file nasce, e perche' non e' `member-approved` riusato ─────
 *
 * Dal 2026-08-08 (decisione del proprietario) un organizer puo' riammettere un
 * account rifiutato, e il registro chiama quell'atto `reactivated` invece di
 * `approved` — perche' sono due cose diverse: una domanda aperta decisa, e una
 * decisione chiusa ribaltata (`src/lib/membership/acts.ts`). Da atti rari e
 * riservati al master, riammissione e ritiro diventano atti ordinari.
 *
 * `MemberApprovedEmail` **non e' stata riusata**, e la ragione e' nelle sue
 * parole: *«You're In»*, *«Your membership has been approved»*, *«start inviting
 * friends with your personal referral link»*. E' il benvenuto di chi entra per
 * la prima volta. Mandarlo a qualcuno che era gia' dentro, e' stato escluso e
 * ora rientra, e' una mail le cui parole sono sbagliate — e una mail non si
 * richiama (`comms-analytics.md`, gate *una mail non si richiama*).
 *
 * ── Cosa dice, e soprattutto cosa NON dice ───────────────────────────────────
 *
 * Dice **il fatto operativo**: puoi rientrare, e alla porta funzioni di nuovo.
 * Non dice **perche'** l'accesso era stato tolto ne' perche' torna: quello e' un
 * giudizio su una persona, e `community-membership.md` (gate *un rifiuto e' una
 * comunicazione, non uno stato*) vuole che quel testo lo scriva chi possiede la
 * voce della community — *«non deve spiegare piu' di quanto si e' disposti a
 * difendere»*.
 *
 * Non promette nemmeno un **ruolo**: riammettere scrive `status = 'approved'` e
 * lascia il ruolo dov'e' (`member`), quindi chi era organizer o staff **non lo
 * ridiventa** con questo atto. Prometterlo qui sarebbe una promessa che il
 * prodotto non mantiene.
 *
 * ── Italiano, come `account-invitation.tsx` ──────────────────────────────────
 *
 * `comms-analytics.md`, gate *template in italiano*: le transazionali verso i
 * membri sono in italiano, l'interfaccia resta in inglese. Le due piu' vecchie
 * di questa famiglia — `member-approved`, `member-rejected` — sono in inglese e
 * restano un'incoerenza nota: riscriverle tocca due percorsi che questo lavoro
 * non ha motivo di muovere, e va fatto una volta, con cura, da chi possiede quei
 * testi.
 *
 * ── Nessun venue, mai ────────────────────────────────────────────────────────
 *
 * Niente qui nomina un luogo. `venue_reveal_sent` e' un interruttore a senso
 * unico e un indirizzo in un messaggio che non c'entra lo farebbe scattare fuori
 * dal cron che lo possiede.
 */
interface MemberReactivatedEmailProps {
  /** Il nome del destinatario. Mai il suo indirizzo, mai il codice di membership. */
  memberName: string;
  /** La home del prodotto, gia' risolta dal chiamante da `NEXT_PUBLIC_APP_URL`. */
  loginUrl: string;
}

export function MemberReactivatedEmail({
  memberName,
  loginUrl,
}: MemberReactivatedEmailProps) {
  return (
    <EmailLayout preview="Il tuo accesso a re:sonate è di nuovo attivo">
      <Heading
        style={{
          color: BRAND.foreground,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        Ciao {memberName}, il tuo accesso è di nuovo attivo
      </Heading>

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "16px",
          lineHeight: "1.5",
          margin: "0 0 16px",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        Il tuo account nella community re:sonate è stato riattivato. Puoi
        accedere di nuovo, vedere le serate e prenotare.
      </Text>

      {/*
        Il fatto che conta di piu' per chi legge, e che nessun'altra superficie
        gli dira': la tessera torna a funzionare all'ingresso. Chi si e' visto
        rifiutare alla porta ha bisogno di sapere che quella sera non si ripete.
      */}
      <Text
        style={{
          color: BRAND.muted,
          fontSize: "14px",
          lineHeight: "1.5",
          margin: "0 0 24px",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        Il tuo ingresso è di nuovo valido: alla porta la tua tessera torna a
        funzionare da subito. La password è sempre la tua, non serve
        reimpostarla.
      </Text>

      <Button
        href={loginUrl}
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
        Apri re:sonate
      </Button>
    </EmailLayout>
  );
}

export default MemberReactivatedEmail;
