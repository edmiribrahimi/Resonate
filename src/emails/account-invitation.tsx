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
 * ── The copy is ENGLISH, and it was rewritten rather than translated ─────────
 *
 * This was the last Italian template in `src/emails/`, kept in the old language
 * on purpose by `comms-analytics.md` 1.23.0 — which replaced the gate *template
 * in italiano* with *una lingua sola per percorso* — because its **content** was
 * stale beyond its language and translating a sentence about to be deleted is
 * work done twice. Phase 51 is that rewrite, and three claims went with it:
 *
 *   * the *personal invitation* — the referral, removed by phase 50;
 *   * *at the door your name is enough* — entry by name off a member list. The
 *     door does not read a roster of members any more, so promising it would
 *     send somebody to a queue with nothing in their hand;
 *   * *ask for a new link from the sign-in page with «forgot password»* — there
 *     is no such control. `/login` offers no reset, and `ResetPasswordButton`
 *     lives on `/account`, behind the very password this message exists to set.
 *     A message that names a way out that does not exist is worse than one that
 *     names none: the person looks for it.
 *
 * The subject line lives in `admin/members/actions.ts` and moved with this file,
 * in the same commit — two halves of one message cannot be in two languages for
 * even one deploy.
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
    <EmailLayout preview="Your re:sonate account is ready">
      <Heading
        style={{
          color: BRAND.foreground,
          fontSize: "24px",
          fontWeight: "bold",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        {memberName}, your re:sonate account is ready
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
        An account has been created for you at re:sonate. Set a password below
        and you can sign in.
      </Text>

      {/*
        What replaced D-09's sentence, and why it is not simply deleted.

        The paragraph that stood here said *your entry is already active — at
        the door your name is enough*, and it was TRUE when it was written: the
        door's roster admitted a profile row regardless of role. It is not true
        now. Saying nothing at all in its place would be the other half of the
        same mistake, because the question it answered is still the one the
        recipient has — *what does this get me?* — and an unanswered question
        turns a welcome into a task.

        So it answers, with what is true: the account is where tickets live, and
        a night is worked by whoever was assigned to it. Neither sentence
        promises admission, and neither names a night, a date or a place.
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
        The account does not admit anyone on its own. Whoever attends a night
        carries a ticket, and your tickets live on your account; whoever works a
        night is there because they were assigned to it.
      </Text>

      <Button
        href={setPasswordUrl}
        style={{
          backgroundColor: BRAND.accent,
          color: BRAND.onAccent,
          fontWeight: "bold",
          borderRadius: "9999px",
          padding: "12px 32px",
          fontSize: "14px",
          textDecoration: "none",
          display: "inline-block",
          fontFamily: "'Orbitron', 'Arial', sans-serif",
        }}
      >
        Set your password
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
        The link is personal and does not last forever. If it has expired, ask
        whoever created the account to send you a new one — the account itself
        stays exactly as it is.
      </Text>
    </EmailLayout>
  );
}

export default AccountInvitationEmail;
