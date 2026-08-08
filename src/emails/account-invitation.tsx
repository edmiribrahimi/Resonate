import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

/**
 * The invitation for an account created by hand — ACCT-03, D-10.
 *
 * ── It carries a LINK. It never carries a password ──────────────────────────
 *
 * There is no password prop, no temporary credential, no fragment of one, and
 * no place in this file where a secret could be interpolated: the only value
 * that reaches the recipient besides their own name is `setPasswordUrl`, which
 * `createAccount` obtains from `auth.admin.generateLink({ type: 'recovery' })`.
 * `recovery` and not `invite` for the reason plan 43-04 established: the account
 * already exists by the time this is sent, and a recovery link is the one that
 * permits setting a password on an existing account.
 *
 * That absence is asserted mechanically rather than promised — the plan's grep
 * for an interpolated password runs against this file, and the summary records
 * its result. A static check is worth stating because the failure it guards
 * against is not a crash: a password in an inbox is a credential that lives
 * there forever, readable by anyone who ever reaches that mailbox, and nothing
 * in this system would notice.
 *
 * ── The copy is ITALIAN, and that breaks the analogs deliberately ────────────
 *
 * Every other template in `src/emails/` is English. `comms-analytics.md`, gate
 * *template in italiano*: member-facing transactional copy is Italian and the
 * interface stays English. The two languages coexist by recipient, not by
 * accident — a transactional message in English inside an Italian product reads
 * like phishing, and this particular message asks somebody to click a link and
 * type a password, which is the exact shape a person is right to distrust.
 *
 * The one English string left is the shared footer inside `EmailLayout`, which
 * every template renders. Changing it would edit every message this product
 * sends and belongs to whichever plan owns the layout, not to this one.
 *
 * ── The brand is written `re:sonate`, with a normal `e` ──────────────────────
 *
 * The reversed-e glyph exists only inside the drawn logo, and it is deliberately
 * not reproduced anywhere in this file — not even in this comment, so that the
 * plan's `grep` for it can assert **zero** rather than "zero outside the
 * comments". Typing it into copy produces a word search engines, screen readers
 * and mail clients do not recognise (`brand-visual-system.md`, gate *grafia del
 * brand*).
 *
 * ── No venue, ever ──────────────────────────────────────────────────────────
 *
 * Nothing here names a place. `venue_reveal_sent` is a one-way switch and an
 * address in an unrelated message would flip it outside the cron that owns it.
 */
interface AccountInvitationEmailProps {
  /** The recipient's name, as the operator typed it. Never their address. */
  memberName: string;
  /** The recovery link, already aimed at the set-password surface by the caller. */
  setPasswordUrl: string;
}

export function AccountInvitationEmail({
  memberName,
  setPasswordUrl,
}: AccountInvitationEmailProps) {
  return (
    <EmailLayout preview="Il tuo account re:sonate è pronto">
      <Heading
        style={{
          color: BRAND.foreground,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        Ciao {memberName}, il tuo account è pronto
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
        Abbiamo creato un account per te nella community re:sonate. Da qui puoi
        vedere le serate, prenotare e portare chi vuoi con il tuo invito
        personale.
      </Text>

      {/*
        D-09, said out loud rather than left true-but-invisible.

        A created account is admissible at the door from the moment the profile
        row exists: neither the roster download nor the door lookup reads `role`
        or `status` (43-RESEARCH § C.2, traced end to end). So the person is on
        the list before they have ever signed in — and if nobody tells them
        that, the sentence they read instead is "set a password to get in",
        which is false and which turns a five-second welcome into a task.

        What it deliberately does NOT say: *show your QR code at the door*. The
        code is a real credential, but reaching it means opening the app, and
        opening the app means having set this password. Promising a screen they
        cannot open yet would be the same mistake in the other direction.
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
        Il tuo ingresso è già attivo: sei tra i membri in lista
        all&apos;entrata da subito, anche prima di impostare la password. Alla
        porta basta il tuo nome.
      </Text>

      <Button
        href={setPasswordUrl}
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
        Imposta la tua password
      </Button>

      <Text
        style={{
          color: BRAND.muted,
          fontSize: "12px",
          lineHeight: "1.5",
          margin: "24px 0 0",
          fontFamily: "'Arial', sans-serif",
        }}
      >
        Il link è personale e ha una durata limitata. Se è scaduto, puoi
        chiederne uno nuovo dalla pagina di accesso, con &laquo;Password
        dimenticata&raquo;: il tuo account resta quello, e il tuo ingresso
        continua a funzionare nel frattempo.
      </Text>
    </EmailLayout>
  );
}

export default AccountInvitationEmail;
