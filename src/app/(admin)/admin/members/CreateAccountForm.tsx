"use client";

import { useState, useTransition } from "react";
import { createAccount, type CreateAccountFailure } from "./actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";

/**
 * The creation surface — ACCT-01 through ACCT-04, seen from the operator's side.
 *
 * Shaped after `admin/newsletter/ComposeForm.tsx` and its `FailureNotice.tsx`,
 * which are the only place in this repository where a tagged failure is drawn
 * distinctly from a validation complaint. Both habits are kept, and for the same
 * two reasons:
 *
 *   1. Next **redacts** the message of an error thrown out of a Server Action in
 *      a production build, so a client that branches on `err.message` works in
 *      development and stops working where it matters. The cause therefore
 *      arrives as a VALUE and is drawn from a table.
 *   2. This product has **no error tracking** (`meta-gates.md`, verified
 *      2026-08-05). A log line reaches nobody. The notice below is not a
 *      courtesy — it is the only place a failure exists at all.
 *
 * **Never add a shared fallback string here.** Collapsing distinct causes into
 * one message is the recorded newsletter anti-pattern — *"Qualcosa è andato
 * storto"* for a network fault, a missing key and an already-subscribed address
 * alike (`.planning/codebase/CONCERNS.md`). Every cause below has its own
 * sentence, and two of them have copy that had to be got right rather than
 * merely written.
 *
 * The interface is English; the message the member receives is Italian. Two
 * languages by recipient, not by accident (`comms-analytics.md`).
 */

/** The client-only twelfth case: the action never returned, so there is no tag. */
type NoticeKind = CreateAccountFailure | "transport_unavailable";

/**
 * One notice per cause, and each says what state the world is in.
 *
 * `showsCode` marks the three causes where **the account exists and already
 * works at the door** and only the message failed. Those show the membership
 * code, because an operator whose invitation failed still has to be able to
 * admit this person tonight.
 */
const NOTICES: Record<
  NoticeKind,
  { title: string; body: string; showsCode?: boolean }
> = {
  capabilities_unavailable: {
    title: "Permission lookup failed — this is not a refusal",
    body:
      "The database could not answer which capabilities this session holds, so " +
      "nothing was attempted. No account was created and no message was sent. " +
      "This is an infrastructure fault, not a statement about your permissions.",
  },
  forbidden: {
    title: "You do not hold the capability to create accounts",
    body:
      "Creating an account is an approval, so it is gated by the same capability " +
      "as approving one. Nothing was created and nothing was sent.",
  },
  invalid_input: {
    title: "The server refused the details",
    body:
      "The address, the name or the role did not pass the server's own check — " +
      "which runs again on the server because this form is not the boundary. " +
      "Nothing was created.",
  },
  app_url_missing: {
    title: "The site address is not configured — nothing was created",
    body:
      "NEXT_PUBLIC_APP_URL is unset or blank on this deployment, so no " +
      "set-password link could be built. This is checked before anything is " +
      "written, deliberately: no account was created, so nothing has to be " +
      "cleaned up. Set the variable and try again.",
  },
  already_exists: {
    title: "That address already has an account",
    body:
      "Nothing was created and — this is the point — no second invitation was " +
      "sent. A message cannot be recalled, so creating the same address twice " +
      "must not mail them twice. If the person exists but cannot sign in, send " +
      "them a password reset instead of creating them again.",
  },
  profile_missing: {
    title: "The account was created in Auth, but its profile was not written",
    body:
      "The sign-in record exists and the member profile does not, which means " +
      "the database trigger that mints the membership code did not run. This " +
      "person is NOT approved, has no membership code, and will not be admitted " +
      "at the door. No message was sent. Do not retry with the same address — " +
      "it will be refused as already existing. Report this: it is a database " +
      "fault, not a form error.",
  },
  constraint_refused: {
    title: "The database refused the approval — not this screen",
    body:
      "A staff role must belong to an approved account, and the database " +
      "enforces that rather than trusting any screen. The write was refused, so " +
      "the person is not approved and no message was sent. The sign-in record " +
      "may still exist, so retrying the same address will be refused as already " +
      "existing.",
  },
  write_failed: {
    title: "The write failed",
    body:
      "The database or the auth service refused or did not answer. Nothing was " +
      "sent. Depending on how far it got, a sign-in record may exist for that " +
      "address — if a retry says the address already exists, that is why.",
  },
  invitation_link_failed: {
    title: "The account exists and works at the door — the invitation does not",
    body:
      "This person is created, approved, and already admissible at the entrance " +
      "with the code below; they simply have no message yet, because the " +
      "set-password link could not be generated. Do NOT create them again — a " +
      "second attempt will be refused as an existing address, which is the right " +
      "refusal but the wrong conversation. Send them a password reset from the " +
      "sign-in page instead, or try the invitation again later.",
    showsCode: true,
  },
  invitation_link_misaimed: {
    title:
      "The account exists and works at the door — the link pointed somewhere else",
    body:
      "A link was generated, but the authentication service did not honour the " +
      "target it was asked for and would have landed this person on a page with " +
      "no password field. It was therefore NOT sent — a message that cannot do " +
      "what it says is worse than no message. The account is created, approved " +
      "and admissible with the code below. This is a configuration fault: the " +
      "site's callback address is missing from the auth redirect allow-list.",
    showsCode: true,
  },
  invitation_send_failed: {
    title: "The account exists and works at the door — the message did not leave",
    body:
      "The link was built correctly; the mail provider refused or did not answer, " +
      "so nothing arrived. The account is created, approved and admissible with " +
      "the code below. Do NOT create them again. The link can be re-sent — a " +
      "password reset from the sign-in page reaches the same surface.",
    showsCode: true,
  },
  transport_unavailable: {
    title: "The server did not answer",
    body:
      "The request did not complete, so there is no tag to read and no way to " +
      "know from here how far it got. Before retrying, check the members list " +
      "below: if the account is there, it was created.",
  },
};

/**
 * The three roles this form offers. It does NOT offer `master`.
 *
 * **And that list is not what stops anyone reaching it.** The ceiling lives in
 * the action: `WritableRole` has no `master` member, and `isWritableRole`
 * re-tests the value on the server because a Server Action is a public endpoint
 * and this `<select>` is a convenience, not a boundary. So nobody should
 * "complete" this list to match the members table — adding `master` here would
 * add an option the server refuses, not a capability.
 */
const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "staff", label: "Staff" },
  { value: "organizer", label: "Organizer" },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];

type Success = {
  membershipCode: string | null;
  role: RoleValue;
  name: string;
};

export default function CreateAccountForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<RoleValue>("member");
  const [isPending, startTransition] = useTransition();

  // An input complaint and a tagged failure are two different kinds of thing and
  // are rendered differently. Dressing "you left the name blank" as a system
  // fault teaches an operator to ignore system faults.
  const [inputError, setInputError] = useState<string | null>(null);
  const [failure, setFailure] = useState<{
    kind: NoticeKind;
    detail?: string;
    membershipCode?: string | null;
  } | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);

  const reset = () => {
    setEmail("");
    setFullName("");
    setRole("member");
    setInputError(null);
  };

  const handleCreate = () => {
    setFailure(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setInputError("An email address is required.");
      return;
    }
    if (!trimmedName) {
      setInputError("A full name is required — the door shows it.");
      return;
    }
    setInputError(null);

    startTransition(async () => {
      try {
        const result = await createAccount({
          email: trimmedEmail,
          fullName: trimmedName,
          role,
        });

        if (!result.ok) {
          setFailure({
            kind: result.failure,
            detail: result.detail,
            membershipCode: result.membershipCode,
          });
          return;
        }

        setSuccess({
          membershipCode: result.data.membershipCode,
          role: result.data.role as RoleValue,
          name: trimmedName,
        });
        reset();
      } catch (err) {
        setFailure({
          kind: "transport_unavailable",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  if (!open) {
    // The SECONDARY rung, and that is a decision rather than a downgrade.
    //
    // Creating an account here **is an approval**: the sentence below says so,
    // and the person skips the pending queue entirely.
    // `community-membership.md`'s gate *nessuna corsia grigia* is that every
    // way into this community which bypasses the ordinary approval path is an
    // exception to be counted and attributed — never the most attractive
    // button on the page. The accent fill belongs to the primary action of a
    // surface, and the primary object of this surface is the member list.
    return (
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        className="mb-6 w-full"
      >
        Create an account
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      {/* The heading role, not the display face: §7.1 forbids the display face
          on a card heading, and 700 is not a weight this type system has. */}
      <h2 className="mb-1 text-base font-semibold text-ink">
        Create an account
      </h2>
      <p className="mb-4 text-xs text-muted">
        Creating an account approves it. The person is admitted to the community
        without going through the pending queue, and the act is recorded with
        your name against it.
      </p>

      {/* An input complaint is `role="alert"` and takes the critical ink —
          NOT the accent, which §5.1 names a state signal among the things it is
          never for. It stays visibly different from a tagged failure below,
          because dressing "you left the name blank" as a system fault teaches
          an operator to ignore system faults. */}
      {inputError && (
        <p role="alert" className="mb-4 text-sm text-sem-crit">
          {inputError}
        </p>
      )}

      {failure && (
        <Notice
          kind={failure.kind}
          detail={failure.detail}
          membershipCode={failure.membershipCode}
        />
      )}

      {success && (
        <div role="status" className="mb-4">
          <p className="text-sm font-semibold text-sem-done">
            {success.name} was created as {success.role}, approved, and invited.
          </p>
          <p className="mt-1 text-xs text-muted">
            The invitation carries a link to set a password — never a password.
            They are already admissible at the door, before they open it.
          </p>
          {success.membershipCode ? (
            <p className="mt-2 font-mono text-xs text-ink">
              Membership code: {success.membershipCode}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">
              The membership code could not be read back after creation. The
              account is fine — find the code on their row in the table below.
            </p>
          )}
        </div>
      )}

      <div className="mb-4">
        <Input
          id="create-account-email"
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
        />
      </div>

      <div className="mb-4">
        <Input
          id="create-account-name"
          label="Full name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="As it should read at the door"
        />
      </div>

      <div className="mb-4">
        {/*
          A standing note, not an error — it is true every time, so it is drawn
          every time. It is passed as the field's HINT rather than as a
          paragraph beside it, which is the slot plan 41-09 added for exactly
          this: the sentence stays visible AND becomes programmatically
          associated with the control, which it never was.

          The reason is measured rather than cautious. A door phone with no
          signal refuses a membership code its downloaded roster does not know
          (`ScannerClient.tsx`, `membershipOffline`), because a membership QR
          carries no signature at all and admitting an unknown one offline would
          be an unbounded hole rather than a bounded one. So an account created
          after that phone downloaded its list WILL be refused at that door with
          the radio off. This is not engineered around: the runbook answer is to
          check the person in from the list rather than to re-scan, and the
          honest way to avoid the situation is to create the account earlier.
        */}
        <Select
          id="create-account-role"
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as RoleValue)}
          hint={
            "Create staff accounts before the night, not during it. A door " +
            "phone that has already gone offline does not know an account " +
            "created after it downloaded its list, and will refuse the code. " +
            "If it happens, check the person in from the list instead of " +
            "scanning again."
          }
        >
          {/*
            Three options, and `master` is deliberately not among them. See
            ROLE_OPTIONS above: the ceiling is enforced in the action's closed
            union and re-tested on the server, not by this list.
          */}
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleCreate} disabled={isPending}>
          {isPending ? "Creating..." : "Create and invite"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(false);
            reset();
            setFailure(null);
            setSuccess(null);
          }}
        >
          Close
        </Button>
      </div>
    </Card>
  );
}

function Notice({
  kind,
  detail,
  membershipCode,
}: {
  kind: NoticeKind;
  detail?: string;
  membershipCode?: string | null;
}) {
  const notice = NOTICES[kind];

  // The critical semantic as INK, never as a tinted box — the rule `Dialog.tsx`
  // fixed for this product, at **6.99 : 1** on the card ground. A box around a
  // paragraph is a container that states nothing its content does not, and
  // every sentence below already names what state the world is in.
  //
  // 11px is not a declared size (§6.4): the diagnostic line takes the label
  // size, at 6.78 : 1.
  return (
    <div role="alert" className="mb-4">
      <p className="text-sm font-semibold text-sem-crit">{notice.title}</p>
      <p className="mt-1 text-xs text-muted">{notice.body}</p>
      {notice.showsCode ? (
        membershipCode ? (
          <p className="mt-2 font-mono text-xs text-ink">
            Membership code: {membershipCode}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            The membership code could not be read back either — find it on their
            row in the table below.
          </p>
        )
      ) : null}
      {detail ? (
        <p className="mt-2 break-words font-mono text-xs text-muted">{detail}</p>
      ) : null}
    </div>
  );
}
