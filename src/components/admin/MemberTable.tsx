"use client";

import { useState, useTransition } from "react";
import type { UserRole, UserStatus } from "@/types/database";
import {
  updateMemberRole,
  deactivateMember,
  reactivateMember,
  approveMember,
  rejectMember,
  bulkApproveMember,
  bulkRejectMember,
} from "@/app/(admin)/admin/members/actions";
import type {
  BulkActData,
  MemberActResult,
} from "@/app/(admin)/admin/members/actions";
import MemberActionNotice, {
  type MemberNoticeKind,
} from "@/app/(admin)/admin/members/MemberActionNotice";
import {
  Button,
  FOCUS_RING,
  type ButtonVariant,
} from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge, Chip } from "@/components/ui/Chip";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Input, Select } from "@/components/ui/Input";

/**
 * The notice copy plan 43-09 left here, marked provisional and assigned to this
 * plan, now lives in `admin/members/MemberActionNotice.tsx` — one component,
 * one notice per cause, refined by the action's `detail` where the detail means
 * something different.
 *
 * Nothing in this file reads a caught error's message property. Next redacts a
 * thrown Server Action error in a production build, so a surface that branched
 * on a message would work in `next dev` and stop working in the deployment
 * where it matters; the category therefore travels as a VALUE. The one case
 * where no value exists — the action never returned at all — has its own tag,
 * `transport_unavailable`, and its own sentence.
 *
 * That absence is asserted by a grep, which is why the property is described
 * here rather than written out: a check that counts its own explanation asserts
 * nothing. Same trade, and the same reason, as `admin/members/actions.ts`.
 */
type ActionNotice = { kind: MemberNoticeKind; detail?: string };

/**
 * What a batch actually did, as opposed to what it was asked to do.
 *
 * `requested` is kept apart from `succeeded` on purpose and is only ever a
 * denominator. The shape this replaces reported `count: memberIds.length` — a
 * receipt written from the input, which would have said "12 approved" whatever
 * the database did with the twelve.
 */
type BulkResult = {
  label: string;
  requested: number;
  succeeded: number;
  failed: number;
  failures: {
    subjectId: string;
    subject: string;
    kind: MemberNoticeKind;
    /**
     * The refusal's `detail`, when the action supplied one.
     *
     * It did not, until CR-01: a per-subject outcome carried the cause alone,
     * and the notice fell back to the cause's own sentence. That was honest
     * while the only per-subject causes were database failures. It stopped being
     * honest the moment the act group started refusing individual subjects for
     * five different reasons — "one of them was refused" is the collapse this
     * component exists to prevent.
     */
    detail?: string;
  }[];
  /** Set when the batch was refused as a whole, before any subject was touched. */
  batchNotice?: ActionNotice;
};

interface MemberRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  membership_code: string;
  created_at: string;
  referred_by: string | null;
  referrer_name: string | null;
}

/**
 * ── `callerRole` was REMOVED on 2026-08-08, and that is the point ────────────
 *
 * It existed to draw Deactivate and Reactivate for the master alone, mirroring
 * a `verifyMaster` gate that no longer exists: the owner decided that an
 * organizer may reverse a decision already taken about a person, and both acts
 * moved onto the same gate as the other four (`admin/members/actions.ts`, which
 * records that this supersedes T-43-09-02).
 *
 * With nothing left for it to decide, keeping the prop would have left a value
 * named after a ROLE sitting in a component that no longer branches on one —
 * the exact shape a later reader reads as a permission. Both call sites passed
 * a LITERAL for it anyway (`"master"` on the admin page, `"organizer"` on the
 * organizer page), so it never carried a fact about the session in the first
 * place; the real question is asked by `getAccessContext()` on each page and
 * again inside every action.
 */
interface MemberTableProps {
  members: MemberRow[];
  currentUserId: string;
  showActions: boolean;
}

type StatusTab = "all" | "pending" | "approved" | "rejected";

// Badge components
function RoleBadge({ role }: { role: UserRole }) {
  // `Record<UserRole, string>` is the ONE site in `src/` that widening
  // `UserRole` breaks, and finding it corrects a prediction: `43-PATTERNS.md`
  // § 21 expected the fourth role to produce **no** new build errors, on the
  // reasoning that seventeen call sites cast `role as UserRole` and a cast
  // stops the compiler checking. That is true of the seventeen — it is not
  // true of a mapped type, which TypeScript checks for exhaustiveness. So the
  // count is one, not zero, and it was measured rather than predicted.
  //
  // ── The `staff` appearance, decided here rather than left provisional ──────
  //
  // Plan 43-05 added the entry to keep the build green and left the COLOUR
  // provisional — zinc, byte-identical to `member` — declaring the interface
  // decision this plan's. Both halves of its reasoning are kept, and they pull
  // in opposite directions:
  //
  //   * `staff` must NOT borrow the colour vocabulary of power. Measured cell
  //     by cell in plan 43-08 across 21 tables × 3 verbs: `staff` grants
  //     **nothing** a `member` does not already have, and it holds no
  //     `door.operate` row. Purple and blue say "this account can do more";
  //     for `staff` that would be a lie the interface tells before anybody
  //     reads a word.
  //   * `staff` must still be FINDABLE at a glance. D-13's seat cost is only
  //     visible if a staff row can be picked out of a list, and a badge that
  //     is pixel-for-pixel a `member` badge makes the eye do work the surface
  //     should be doing.
  //
  // So: the same neutral family, and a **dashed** border instead of a solid
  // one. Dashed reads as conditional rather than as elevated, which is exactly
  // what the role is — the permanent half is free entry through the membership
  // card, and the work permissions come from the per-night assignment and
  // expire with the night (`ACCESS-MODEL-DECISIONS.md` §§2-3). The legend
  // beside the counts says this in words, because a border style is not an
  // explanation.
  //
  // ── PHASE 41: the four hues left, the dash stayed, and that is a decision ──
  //
  // The badge was four palette colours — two of them a vocabulary of power for
  // `master` and `organizer`, one neutral for `member`, one neutral-and-dashed
  // for `staff`. There is **no role hue in the token layer** and there is no
  // place for one: the four semantics name STATES (critical, caution,
  // information, completion), `--accent` is reserved by §5.1 for four things a
  // role badge is not among, and inventing a fifth family would be deciding in
  // CSS what a role means.
  //
  // So all four take the shared badge on the same neutral tone, and **the word
  // is the channel** — which is what it always was, since the badge's content
  // is the role's own name. `staff` keeps the dashed border, because that is
  // the one differentiator the argument above reached for and it carries no
  // hue at all.
  //
  // **The cost, stated rather than glossed:** `master` and `organizer` no
  // longer differ from `member` by anything but their word. Scanning a list for
  // an organizer is now reading rather than glancing. The alternative was to
  // keep two hues that no token declares, on the surface that decides who is in
  // this community — and a colour nobody decided is a colour that means
  // whatever the next reader assumes.
  return (
    <Badge className={role === "staff" ? "border-dashed" : ""}>{role}</Badge>
  );
}

/**
 * The subject's status. **A different axis from the role, and it stays one.**
 *
 * ── Why `pending` is the only one that is emphasised ─────────────────────────
 *
 * The three statuses used to be green, yellow and red — a grading of a person,
 * drawn in the colours of success, caution and failure, on the surface where
 * somebody is admitted to or refused from this community.
 * `community-membership.md` is explicit that **a refusal is a communication,
 * not a hue**, and 41-08 already resolved the same question the same way on the
 * format catalogue: which of two states is the better one is not a thing a
 * colour may decide.
 *
 * So `approved` and `rejected` take the **same** tone. Deliberately: with one
 * tone between them, no hue ranks one person above another, and the words —
 * which are the badge's whole content — say which is which.
 *
 * `pending` takes the emphasis tone, and that is **not a third grade**. The
 * emphasis tone means *look here first* and nothing else (`Chip.tsx` fixes that
 * meaning and refuses to give it an outcome). A pending request is the one row
 * on this surface that is **work outstanding for the operator**; marking it is
 * marking a task, not judging a person. The Pending tab already counts them for
 * the same reason.
 */
function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge tone={status === "pending" ? "emphasis" : "neutral"}>{status}</Badge>
  );
}

/**
 * The joined date, in one place instead of two.
 *
 * It used to be an inline expression written out twice — once in the table
 * branch and once in the card branch — which is the drift D-41-17 names: two
 * copies of one rendering, in two trees that must agree. The primitive drives
 * both branches from one column declaration now, so this has one home.
 */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatJoined(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Action button with loading state.
 *
 * ── Two defects fixed here, both of them silent ───────────────────────────────
 *
 * `onClick` used to be typed `() => void` while every call site passed
 * `() => handleAction(...)`, which is `async`. So the returned promise was
 * dropped: the `startTransition` finished before the act had begun, the spinner
 * flashed for a frame and the button re-enabled itself while a write was still
 * in flight — which invites a second click on an act that is already running.
 * The type is now `() => Promise<void>` and the call is **awaited** inside the
 * transition, so the pending state is the real one.
 *
 * The same dropped promise also made this component's own `try/catch` dead
 * code — a rejection could never reach it — and with it the local error line
 * that used to render the caught error's message. Both are gone: the parent
 * owns the notice, because a refusal needs more room than a cell and because
 * that message is redacted in a production build.
 */
type ActionVariant =
  | "promote"
  | "demote"
  | "deactivate"
  | "reactivate"
  | "approve"
  | "reject";

/**
 * The six act names, onto the button ladder's four rungs.
 *
 * ── Why five of the six are the same rung, and one is not ────────────────────
 *
 * The six used to be six palette colours: blue to promote, zinc to demote,
 * green to approve and to readmit, red to reject and to withdraw. Five of those
 * six hues were **grading an act on a person** — approving somebody drawn in
 * the colour of success and refusing them in the colour of failure — which is
 * the same thing `StatusBadge` above stopped doing, applied to the verb instead
 * of the noun.
 *
 * The file's own reasoning is what decides this. It says, at length, that
 * approving and rejecting a pending request are **the two ORDINARY daily acts**
 * and that friction on them is pure cost — which is why neither gets a
 * confirmation. Two acts that are deliberately symmetric in ceremony must not
 * be asymmetric in colour: a red Reject beside a green Approve tells the
 * operator that one of the two is the dangerous one, and the file spent thirty
 * lines establishing that neither is.
 *
 * **`deactivate` is the exception, and it is the one the file itself singles
 * out.** Withdrawing an approved member's access removes a person from the
 * community, and — in this product's own words, on the confirmation — *nobody
 * is told*, so a withdrawn member finds out at the door. That is what the
 * destructive rung is for, and it is `--ground` on `--sem-crit` at **7.36 : 1**
 * rather than a tint somebody chose.
 *
 * `reactivate` is NOT its mirror in colour. Readmitting somebody is an ordinary
 * affirmative act; it asks first because it reverses a decision, not because it
 * is dangerous.
 */
const ACTION_VARIANT: Record<ActionVariant, ButtonVariant> = {
  promote: "secondary",
  demote: "secondary",
  approve: "secondary",
  reject: "secondary",
  reactivate: "secondary",
  deactivate: "destructive",
};

/**
 * §6.3's shrink allow-list, closed at one item, and this is the item.
 *
 * It is applied **only** when the `DataTable` primitive says the button is in
 * its table branch — a branch that is hidden below 768px and therefore never
 * renders on a phone — and the variant shrinks it further only on a machine
 * with **no coarse pointer at all**. 36px is the floor and nothing goes lower.
 *
 * The flag comes from the primitive rather than from a viewport read, which is
 * D-41-07's construction: the default is the large target, and the query is
 * only ever used to shrink, so a wrong answer costs a slightly-too-large button
 * and never a too-small one.
 */
const DENSE_ROW_ACTION = "pointer-fine-only:min-h-9";

function ActionButton({
  onClick,
  label,
  variant,
  dense = false,
}: {
  onClick: () => Promise<void>;
  label: string;
  variant: ActionVariant;
  /** True only inside the table branch. See `DENSE_ROW_ACTION`. */
  dense?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    // Awaited: see the note above. `handleAction` already reports every outcome
    // through the parent's notice and never rejects, so there is deliberately
    // no `catch` here to swallow one.
    startTransition(async () => {
      await onClick();
    });
  };

  return (
    <Button
      size="sm"
      variant={ACTION_VARIANT[variant]}
      onClick={handleClick}
      disabled={isPending}
      className={dense ? DENSE_ROW_ACTION : ""}
    >
      {isPending ? (
        <span className="inline-flex items-center gap-1">
          <svg
            className="h-3 w-3 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          ...
        </span>
      ) : (
        label
      )}
    </Button>
  );
}

// =============================================================================
// THE CONFIRMATION, and the exactly two acts that get one
// =============================================================================
//
// Withdrawing an approved member's access, and readmitting a rejected one.
// Those two, single and bulk alike. **Approving or rejecting a `pending`
// request deliberately gets NO confirmation**: those are the ordinary daily
// acts, and friction on them is pure cost.
//
// The reason is specific rather than general caution, and it was named by the
// previous executor of this phase: *«un pulsante "Reject" su una riga di un
// membro approvato ritira un accesso, e in questa tabella non esiste alcuna
// conferma»*. Three facts compound:
//
//   * the table acts on several rows at once;
//   * the two reversing controls now sit one cell away from the two ordinary
//     ones, in the same column, in the same visual vocabulary;
//   * the consequence of a misclick is that somebody silently loses access to a
//     community whose whole value is the gate — and nobody tells them, so they
//     find out at the door.
//
// ── It NAMES the act and the count. It never says "are you sure" ────────────
//
// One misread confirmation is worse than none, because it trains the reflex to
// dismiss the next one. So every sentence below is specific: what happens, to
// how many people, what the register will say, and whether anybody is told.
// `nextjs-architecture.md`, gate *accessibilità al buio*: colour is never the
// only channel — the words carry it.
//
// ── And it is NOT a permission ───────────────────────────────────────────────
//
// A Server Action is a public endpoint. This dialog stops a hand from slipping;
// it stops nothing else, and the gate in `admin/members/actions.ts` remains the
// only boundary.

type ReversalKind = "withdraw" | "readmit";

function reversalCopy(kind: ReversalKind, count: number, subject?: string) {
  const people = count === 1 ? "1 person" : `${count} people`;
  const accounts = count === 1 ? "1 account" : `${count} accounts`;

  if (kind === "withdraw") {
    return {
      title: subject
        ? `Withdraw access from ${subject}?`
        : `Withdraw access from ${accounts}?`,
      lines: [
        `This removes ${people} from the community.`,
        "They stop being able to sign in, their membership card stops working " +
          "at the door, and any staff or organizer role they hold is removed.",
        "It is recorded as a withdrawal — “deactivated” — " +
          "with your name and the time. The register is append-only: the row " +
          "cannot be edited or deleted afterwards.",
        // The one sentence in this component that exists because of a decision
        // taken elsewhere: this product has no message for a withdrawal, on
        // purpose (see THE MAIL FOLLOWS THE ACT in `admin/members/actions.ts`).
        // The operator pressing this button is the only person who can warn
        // them, so the surface says so instead of leaving it to be discovered.
        "Nobody is told. This product has no message written for a withdrawal, " +
          "so a withdrawn member finds out at the door.",
      ],
      confirmLabel:
        count === 1 ? "Withdraw access" : `Withdraw access from ${accounts}`,
      variant: "deactivate" as const,
      // The critical semantic as INK, never as a tinted box. `Dialog.tsx` fixed
      // the rule for this product: `--sem-crit` on `--surface` is **6.99 : 1**,
      // and a box around a question is a container that states nothing its
      // content does not. The words below are what carry this, and there are
      // four of them for that reason.
      ink: "text-sem-crit",
    };
  }

  return {
    title: subject ? `Readmit ${subject}?` : `Readmit ${accounts}?`,
    lines: [
      `This lets ${people} back into the community.`,
      "They can sign in again and their membership card works at the door again.",
      "It is recorded as a readmission — “reactivated” — " +
        "with your name and the time.",
      count === 1
        ? "They receive a message saying their access is active again."
        : "Each of them receives a message saying their access is active again.",
      "A staff or organizer role is not restored by this: set it separately " +
        "afterwards if they need one.",
    ],
    confirmLabel: count === 1 ? "Readmit" : `Readmit ${accounts}`,
    variant: "reactivate" as const,
    // The plain heading ink, and NOT a mirror of the withdrawal's semantic.
    // Readmitting somebody is not a critical act and it is not a completed one;
    // it is an ordinary affirmative that asks first because it reverses a
    // decision. Giving it a semantic of its own would put the two reversals on
    // a scale, and the scale would be a judgement about the person.
    ink: "text-ink",
  };
}

function ReversalConfirm({
  kind,
  count,
  subject,
  onConfirm,
  onCancel,
}: {
  kind: ReversalKind;
  /** How many people this reaches. Always rendered — never "these accounts". */
  count: number;
  /** The single subject's name, when the confirmation is about one row. */
  subject?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const copy = reversalCopy(kind, count, subject);

  return (
    <Card role="alertdialog" aria-label={copy.title} className="w-full">
      <p className={`text-sm font-semibold ${copy.ink}`}>{copy.title}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {copy.lines.map((line) => (
          <li key={line} className="text-xs leading-relaxed text-muted">
            {line}
          </li>
        ))}
      </ul>
      {/* Cancel is FIRST in the DOM — §11's order for a destructive question,
          and the property this confirmation has always had. Nothing about the
          order moved when the two controls became rungs of the shared ladder. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {/* The spinner lives on the confirm button, and it is real:
            `ActionButton` awaits the promise inside its transition. */}
        <ActionButton
          onClick={onConfirm}
          label={copy.confirmLabel}
          variant={copy.variant}
        />
      </div>
    </Card>
  );
}

// Actions cell for a single member row
function MemberActions({
  member,
  currentUserId,
  dense = false,
}: {
  member: MemberRow;
  currentUserId: string;
  /**
   * True only inside the table branch, and passed down to every button here.
   * It is a fact about which of the primitive's two trees this is, never a
   * viewport read — see `DENSE_ROW_ACTION`.
   */
  dense?: boolean;
}) {
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  const [confirming, setConfirming] = useState<ReversalKind | null>(null);

  // Don't show actions for the user's own row
  if (member.id === currentUserId) {
    return <span className="text-xs text-muted">--</span>;
  }

  // Don't show role actions for other masters (shouldn't exist, but defense).
  //
  // Hiding is NOT refusing, and the server knows it: `updateMemberRole` reads
  // the subject's current role and returns `forbidden` / `subject_is_master`
  // for one, added by plan 43-09 when the gate widened to organizers. This
  // branch is the affordance; that check is the boundary.
  if (member.role === "master") {
    return <span className="text-xs text-muted">--</span>;
  }

  const handleAction = async (
    action: () => Promise<MemberActResult<unknown>>
  ) => {
    setNotice(null);
    try {
      const result = await action();
      if (!result.ok) setNotice({ kind: result.failure, detail: result.detail });
    } catch {
      // Still reachable, and the only case with no tag to read: a Server Action
      // can fail before its body runs — a lost connection, a framework error
      // Next has already redacted. The caught value is deliberately not
      // inspected: its message is redacted in a production build, so reading it
      // would produce a sentence that is informative in `next dev` and useless
      // where it matters.
      setNotice({ kind: "transport_unavailable" });
    }
  };

  const changeRole = (to: "organizer" | "staff" | "member") => () =>
    handleAction(() => updateMemberRole(member.id, to));

  // ── Who may reach WHICH CONTROL: everybody who reaches this table ───────────
  //
  // There used to be a `callerRole` prop here and a `canWithdrawAccess =
  // callerRole === "master"` derived from it, drawing Deactivate and Reactivate
  // for the master alone. **Both are gone, by owner decision of 2026-08-08**,
  // together with the `verifyMaster` gate they mirrored (see
  // `admin/members/actions.ts`, which records that this supersedes T-43-09-02).
  //
  // The prop is REMOVED rather than left unused on purpose. A prop named after
  // a role that no longer decides anything is the exact thing a later reader
  // mistakes for a permission — and `access-gating.md` (gate *coerenza
  // navigazione/permessi*) is emphatic that hiding a control is not protecting
  // an endpoint. The six member acts share one gate now; whoever reaches this
  // table with `showActions` has already been asked the only question that
  // counts, and every act re-asks it on its own.
  //
  // What is still drawn per ROW is the SUBJECT's state, not the caller's:
  // nothing at all on the viewer's own row (rule 2) or on a master's row
  // (rule 1), which is the affordance matching two refusals the server holds
  // whatever this file draws.

  // Role changes are offered on APPROVED rows only, and that is a decision
  // rather than an oversight. Granting `staff` or `organizer` writes the role
  // and `approved` in one statement (43-09), so offering it on a `pending` row
  // would approve somebody through a control labelled "promote" — the register
  // would then hold `promoted` where the history needs `approved`.
  // `community-membership.md`, gate *nessuna corsia grigia*: every way in that
  // skips the approval path is an exception, and an exception must not be the
  // convenient button.
  const canChangeRole = member.status === "approved";

  // There used to be a `hasAnyAction` guard drawing "--" for the case with no
  // control to offer — an organizer looking at a rejected account, whose only
  // act would have been the master's Reactivate. That case no longer exists:
  // every one of the three statuses now has at least one control for everybody
  // who reaches this table (pending -> Approve/Reject, approved -> role changes
  // + Withdraw, rejected -> Readmit). The guard is deleted rather than left
  // permanently true, for the same reason `master_manage_required` was deleted
  // from the notice map: a branch that can no longer be taken is where the next
  // reader stops looking.

  // The confirmation REPLACES the buttons while it is open, so a second click
  // aimed at the row cannot land on a different act than the one being
  // confirmed.
  if (confirming) {
    return (
      <div className="flex w-full flex-col gap-2">
        <ReversalConfirm
          kind={confirming}
          count={1}
          subject={member.full_name || member.email}
          onCancel={() => setConfirming(null)}
          onConfirm={async () => {
            await handleAction(() =>
              confirming === "withdraw"
                ? deactivateMember(member.id)
                : reactivateMember(member.id)
            );
            // Closed only after the act has answered, so the notice for a
            // refusal is drawn by the branch below rather than by a component
            // that has already unmounted.
            setConfirming(null);
          }}
        />
        {notice && (
          <MemberActionNotice
            kind={notice.kind}
            detail={notice.detail}
            compact
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* member -> staff, or member -> organizer */}
      {canChangeRole && member.role === "member" && (
        <>
          <ActionButton
            onClick={changeRole("staff")}
            label="Make staff"
            variant="promote"
            dense={dense}
          />
          <ActionButton
            onClick={changeRole("organizer")}
            label="Make organizer"
            variant="promote"
            dense={dense}
          />
        </>
      )}

      {/* staff -> organizer, or staff -> member. Taking `staff` away is what
          releases the permanent free seat D-13 counts. */}
      {canChangeRole && member.role === "staff" && (
        <>
          <ActionButton
            onClick={changeRole("organizer")}
            label="Make organizer"
            variant="promote"
            dense={dense}
          />
          <ActionButton
            onClick={changeRole("member")}
            label="Remove staff"
            variant="demote"
            dense={dense}
          />
        </>
      )}

      {/* organizer -> staff, or organizer -> member. Two steps down and not
          one, because they are different outcomes: the first keeps the free
          entry, the second does not. */}
      {canChangeRole && member.role === "organizer" && (
        <>
          <ActionButton
            onClick={changeRole("staff")}
            label="Make staff"
            variant="demote"
            dense={dense}
          />
          <ActionButton
            onClick={changeRole("member")}
            label="Make member"
            variant="demote"
            dense={dense}
          />
        </>
      )}

      {/* Withdraw: approved non-master -> rejected. Master AND organizer since
          2026-08-08. Labelled after the OUTCOME and not after the function —
          "Deactivate" named an API, "Withdraw access" names what the person
          loses, and the register will call the act `deactivated` either way.
          It asks first: this is one of the two reversing acts. */}
      {member.status === "approved" && (
        <ActionButton
          onClick={async () => setConfirming("withdraw")}
          label="Withdraw access"
          variant="deactivate"
          dense={dense}
        />
      )}

      {/* Readmit: rejected -> approved. Master AND organizer. Recorded as
          `reactivated`. It asks first, and it is the act the owner decision of
          2026-08-08 was actually about. */}
      {member.status === "rejected" && (
        <ActionButton
          onClick={async () => setConfirming("readmit")}
          label="Readmit"
          variant="reactivate"
          dense={dense}
        />
      )}

      {/* Pending: Approve + Reject — the two ORDINARY acts, and deliberately
          the two without a confirmation. */}
      {member.status === "pending" && (
        <>
          <ActionButton
            onClick={() => handleAction(() => approveMember(member.id))}
            label="Approve"
            variant="approve"
            dense={dense}
          />
          <ActionButton
            onClick={() => handleAction(() => rejectMember(member.id))}
            label="Reject"
            variant="reject"
            dense={dense}
          />
        </>
      )}

      {notice && (
        <span className="w-full">
          <MemberActionNotice
            kind={notice.kind}
            detail={notice.detail}
            compact
          />
        </span>
      )}
    </div>
  );
}

// Expandable detail section showing referral and attendance data
function MemberDetail({
  member,
  referralCount,
}: {
  member: MemberRow;
  referralCount: number;
}) {
  // One column, then three at 768px — and no middle step, because there is no
  // width at which this region is between the two. It renders inside the card
  // branch, which exists only BELOW 768px, and inside the table branch, which
  // exists only above it. Weight 500 does not exist in this type system; the
  // labels take the label role at 600.
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div>
        <p className="text-xs font-semibold text-muted">Referred by</p>
        <p className="mt-0.5 text-sm text-ink-2">
          {member.referrer_name || (member.referred_by ? "Unknown" : "Direct signup")}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted">Referred members</p>
        <p className="mt-0.5 font-mono text-sm text-ink-2">{referralCount}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted">Events attended</p>
        <p className="mt-0.5 font-mono text-sm text-ink-2">0</p>
      </div>
    </div>
  );
}

export default function MemberTable({
  members,
  currentUserId,
  showActions,
}: MemberTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<ReversalKind | null>(null);

  // Compute referral counts from loaded data (no extra query needed)
  const referralCounts = new Map<string, number>();
  for (const m of members) {
    if (m.referred_by) {
      referralCounts.set(m.referred_by, (referralCounts.get(m.referred_by) || 0) + 1);
    }
  }

  // Client-side filtering
  const filtered = members.filter((m) => {
    const matchesSearch =
      search === "" ||
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || m.role === roleFilter;

    // statusTab overrides statusFilter when not "all"
    const effectiveStatus = statusTab !== "all" ? statusTab : statusFilter;
    const matchesStatus = effectiveStatus === "all" || m.status === effectiveStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Count summary
  const totalMembers = members.length;
  const organizerCount = members.filter((m) => m.role === "organizer").length;
  const pendingCount = members.filter((m) => m.status === "pending").length;

  // ── The count D-13 exists to make readable ──────────────────────────────────
  //
  // A filter alone does not satisfy it. `ACCESS-MODEL-DECISIONS.md` §8: staff
  // accounts do not expire, so each one is a **permanent free entry** against a
  // venue that holds 150–300 people — *"after two seasons that is a standing
  // block of seats given away months in advance rather than that night"*. A
  // number that has to be assembled by hand is a number nobody assembles, and
  // this is the surface where the accounts are created.
  //
  // Counted over `members`, never over `filtered`: a total that moved with the
  // search box would answer a different question from the one it appears to
  // answer, and would read as a fall in the seat cost every time somebody typed
  // a name.
  //
  // Organizers are counted separately and are NOT added in. They also enter
  // free, but they are a different decision with a different reason, and one
  // combined "free entries" figure would hide which of the two is growing.
  const staffCount = members.filter((m) => m.role === "staff").length;

  // ── The batch, and the three tabs it now reaches ────────────────────────────
  //
  // It used to be the Pending tab alone. Approved and Rejected joined it with
  // the owner decision of 2026-08-08, because the two reversing acts became
  // ordinary and doing them one at a time is friction, not a boundary — the
  // boundary is the gate on the action, which an authenticated organizer could
  // already reach with a crafted request whatever this toolbar drew.
  //
  // The "All" tab deliberately has NO batch: a selection spanning three
  // statuses would produce a mix of acts, and the confirmation could then only
  // say something vague about "the selected rows". A confirmation that cannot
  // name what it is about is the "are you sure" this component exists to avoid.
  const BULK_TAB_STATUS: Partial<Record<StatusTab, UserStatus>> = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
  };
  const bulkStatus = BULK_TAB_STATUS[statusTab];
  const isBulkTab = bulkStatus !== undefined;

  /**
   * A row this batch may be aimed at.
   *
   * The two exclusions match refusals the SERVER holds anyway (rule 1: no act
   * reaches a master; rule 2: no act reaches its own author). They are here so
   * that "select all" on the Approved tab does not silently include the master
   * and the viewer and then report two refusals every single time — an
   * affordance that always fails is noise, and noise is where a real refusal
   * stops being read. It is not a permission: remove these two tests and the
   * server still refuses both.
   */
  const isSelectable = (m: MemberRow) =>
    m.status === bulkStatus && m.role !== "master" && m.id !== currentUserId;

  const selectableFiltered = filtered.filter(isSelectable);
  const allSelectableSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((m) => selectedIds.has(m.id));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableFiltered.map((m) => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // How a refused subject is named on screen.
  //
  // The name, or the address the table already shows beside it. **Never the
  // membership code**: it is the door's only credential
  // (`api/membership/list/route.ts`), it is not otherwise rendered here, and a
  // batch report is exactly the kind of thing that ends up in a screenshot.
  // Nothing in this report shows a value the row above it does not already.
  const subjectLabel = (subjectId: string) => {
    const row = members.find((m) => m.id === subjectId);
    if (!row) return "an account no longer in this list";
    return row.full_name || row.email;
  };

  // A batch used to clear the selection and say nothing, whatever happened.
  // Plan 43-09 made the action report per subject; this renders it that way —
  // a batch where one subject failed says WHICH one, and the count shown is the
  // measured one and never `ids.length`.
  //
  // It is `async` and RETURNS its promise, rather than firing a discarded
  // `startTransition`. The transition it used to open was destructured as
  // `const [, startTransition]` — the pending flag thrown away — so a batch over
  // a dozen rows showed nothing at all while it ran, and the buttons stayed live
  // for a second click on an act already in flight. That is the same dropped
  // promise `ActionButton` was fixed for, one level up; the bulk buttons are
  // `ActionButton`s now and await this.
  const handleBulk = async (
    label: string,
    run: (ids: string[]) => Promise<MemberActResult<BulkActData>>
  ) => {
    const ids = Array.from(selectedIds);
    setBulkResult(null);
    const base = { label, requested: ids.length };

    try {
      const result = await run(ids);

      // The whole batch was refused before any subject was touched — a
      // capability fault, a refusal, or an empty selection. It is a different
      // event from "some subjects failed" and it gets the cause's own notice
      // rather than a line in a per-subject list.
      if (!result.ok) {
        setBulkResult({
          ...base,
          succeeded: 0,
          failed: 0,
          failures: [],
          batchNotice: { kind: result.failure, detail: result.detail },
        });
        return;
      }

      const { succeeded, failed, outcomes } = result.data;

      const failures = outcomes
        .filter((o) => !o.ok)
        .map((o) => ({
          subjectId: o.subjectId,
          subject: subjectLabel(o.subjectId),
          // The cause AND its detail. A per-subject outcome used to carry the
          // cause alone; since CR-01 the act group can refuse one subject of a
          // batch for several distinct reasons that all tag as `forbidden`,
          // and the detail is what tells "it is the master" from "it is you".
          // Since 2026-08-08 a subject can also come back `nothing_to_do` /
          // `status_unchanged` — it already held the status — or
          // `act_underivable`, each with its own sentence: a batch derives its
          // act per subject, so it can refuse one row of five without
          // shrinking the count. An absent detail still falls back to the
          // cause's own sentence, which remains the honest answer rather than
          // a borrowed one.
          kind: (o.failure ?? "write_failed") as MemberNoticeKind,
          detail: o.detail,
        }));

      setBulkResult({ ...base, succeeded, failed, failures });

      // The refused subjects stay selected, so the retry is one click and not
      // a re-hunt through the list. On a clean batch the selection clears.
      setSelectedIds(
        failed === 0 ? new Set() : new Set(failures.map((f) => f.subjectId))
      );
    } catch {
      // No tag to read: the action never returned. Whether anything was
      // written is unknown from here, and the notice says exactly that
      // instead of guessing in either direction.
      setBulkResult({
        ...base,
        succeeded: 0,
        failed: 0,
        failures: [],
        batchNotice: { kind: "transport_unavailable" },
      });
    }
  };

  // The two ORDINARY batches — pending requests decided. No confirmation.
  const handleBulkApprove = () => handleBulk("Approve", bulkApproveMember);
  const handleBulkReject = () => handleBulk("Reject", bulkRejectMember);

  // The two REVERSING batches. They run the same two actions — the act name is
  // derived per subject on the server, so a batch over approved rows records
  // `deactivated` and a batch over rejected rows records `reactivated` — but
  // they are labelled after what happens and they ask first.
  const runBulkReversal = async (kind: ReversalKind) => {
    if (kind === "withdraw") await handleBulk("Withdraw access", bulkRejectMember);
    else await handleBulk("Readmit", bulkApproveMember);
  };

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // The column count is the primitive's now: it knows how many of its three
  // optional apparatus it was handed, and a caller counting them a second time
  // is a second author for one number.

  /**
   * The five columns, declared once and rendered twice.
   *
   * This is the whole of D-41-17's argument in one constant. The two branches
   * used to be two hundred lines of markup written twice, and the date was an
   * inline expression duplicated byte for byte between them — which is what
   * "the two lists drift" looks like before it has drifted. Adding a column
   * here adds it to the table and to the card, and there is nowhere for the two
   * to disagree.
   *
   * **`role` and `status` are two columns and stay two.** They are orthogonal
   * axes — `member` is not `approved` — and the surest way to make an interface
   * lie about access is to render one of them as though it were the other. On
   * the card they sit as two marks in one stack, adjacent and separately
   * legible, which is what they were in the table.
   *
   * `Joined` takes the data face so a column of dates aligns. Nothing here
   * re-declares the numeric-variant shorthand; the face already carries it.
   */
  const columns: DataColumn<MemberRow>[] = [
    {
      key: "name",
      header: "Name",
      card: "title",
      cell: (member) => member.full_name || "--",
    },
    {
      key: "email",
      header: "Email",
      card: "subtitle",
      cell: (member) => member.email,
    },
    {
      key: "role",
      header: "Role",
      card: "mark",
      cell: (member) => <RoleBadge role={member.role} />,
    },
    {
      key: "status",
      header: "Status",
      card: "mark",
      cell: (member) => <StatusBadge status={member.status} />,
    },
    {
      key: "joined",
      header: "Joined",
      card: "meta",
      figure: true,
      cell: (member) => formatJoined(member.created_at),
    },
  ];

  // Status tab active check
  const isActiveTab = (tab: StatusTab) => statusTab === tab;

  const hasActiveFilters = search || roleFilter !== "all" || (statusTab === "all" && statusFilter !== "all");

  return (
    <div>
      {/* Count summary.

          The four figures used to be four palette colours matching four badge
          hues that no longer exist. They take the data face and one ink now:
          the word beside each figure is what tells them apart, and it always
          was — a number reading "3" in blue does not say "organizers" to
          anybody who has not already learnt the key. */}
      <div className="mb-2 flex flex-wrap items-center gap-4 text-sm text-muted">
        <span>
          <span className="font-mono font-semibold text-ink">{totalMembers}</span>{" "}
          members total
        </span>
        <span>
          <span className="font-mono font-semibold text-ink">{organizerCount}</span>{" "}
          organizers
        </span>
        <button
          type="button"
          onClick={() => {
            setRoleFilter("staff");
            setStatusTab("all");
          }}
          className={`inline-flex min-h-11 items-center gap-1 underline decoration-dotted underline-offset-4 transition-colors hover:text-ink ${FOCUS_RING}`}
        >
          <span className="font-mono font-semibold text-ink">{staffCount}</span> staff
        </button>
        <span>
          <span className="font-mono font-semibold text-ink">{pendingCount}</span>{" "}
          pending
        </span>
      </div>

      {/*
        The legend, and it is not decoration.

        A staff badge is drawn in the same neutral as a member badge with a
        dashed border — near enough to say "this grants nothing extra", distinct
        enough to be found in a list. A border style cannot say WHY, so this
        sentence does, on the surface where staff accounts are created and where
        the seat cost is decided.

        `staff` grants exactly one thing (`ACCESS-MODEL-DECISIONS.md` §2), and
        it is not a work permission: it was measured cell by cell in this phase
        and it holds nothing a member does not. Whoever runs the door tonight
        holds that from the night's own assignment, which expires with the
        night — never from this column.
      */}
      <p className="mb-6 text-xs text-muted">
        A <span className="font-semibold text-ink">staff</span> account can do
        nothing a member cannot. What it holds is free entry to every night
        through the membership card, permanently and without expiry — so each one
        is a standing seat at a venue that holds 150–300 people. Working the door
        or a gallery comes from the night&apos;s own assignment and ends with the
        night.
      </p>

      {/* Status tabs.

          These are RESP-04's filters and they are the interactive kind of pill,
          so they are chips and not badges — 44px targets, with the current one
          named by an aria attribute as well as by its fill, because colour is
          never the only channel. They were 30px and told a screen reader
          nothing about which of the four was current. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "pending", "approved", "rejected"] as StatusTab[]).map((tab) => (
          <Chip
            key={tab}
            selected={isActiveTab(tab)}
            onClick={() => {
              setStatusTab(tab);
              setSelectedIds(new Set());
              setExpandedId(null);
              // A confirmation left open across a tab change would be asking
              // about a selection that no longer exists.
              setBulkConfirm(null);
            }}
          >
            {tab === "all" && "All"}
            {tab === "pending" && `Pending (${pendingCount})`}
            {tab === "approved" && "Approved"}
            {tab === "rejected" && "Rejected"}
          </Chip>
        ))}
      </div>

      {/* Filters.

          RESP-04 asks that filters be visible from 768px up without opening
          anything, and they are — nothing here is behind a disclosure at any
          width. The three controls stack on a phone and sit on one row above
          768px, which is the same arrangement they had at 640px before, on the
          one boundary §2.1 keeps.

          Each carries a name it did not have: all three were unlabelled
          controls whose only description was a placeholder, and a placeholder
          disappears the moment somebody types into it. */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="md:flex-1">
          <Input
            id="member-search"
            aria-label="Search members by name or email"
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Select
            id="member-role-filter"
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            {/*
              Four options, in rank order.

              The missing `staff` option was a real defect rather than an
              omission of tidiness: a staff account could not be filtered for,
              so the count D-13 exists to make visible had to be assembled by
              eye. It was also invisible to `npm run build` — of twenty-one
              role-enumeration sites in this repository exactly ONE produces a
              compile error, because seventeen cast `role as UserRole` and a
              cast stops the compiler looking (`43-RESEARCH.md` § G.1).

              And this list is a convenience, not a ceiling. What a role change
              may write is `WritableRole` in `admin/members/actions.ts`, held
              again at runtime against the request body; adding `master` here
              would add an option the server refuses, never a capability.
            */}
            <option value="all">All roles</option>
            <option value="master">Master</option>
            <option value="organizer">Organizer</option>
            <option value="staff">Staff</option>
            <option value="member">Member</option>
          </Select>
          {/* Hide status dropdown when a specific status tab is active */}
          {statusTab === "all" && (
            <Select
              id="member-status-filter"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Select>
          )}
        </div>
      </div>

      {/* Results count */}
      {hasActiveFilters ? (
        <p className="mb-4 text-xs text-muted">
          Showing {filtered.length} of {totalMembers} members
        </p>
      ) : null}

      {/* Bulk action toolbar — one set of controls per tab, because the act a
          batch performs is decided by the status the selected rows hold. */}
      {/* The toolbar's ground is the RAISED one §5.1 assigns to a selected row,
          not an accent tint. §5.1's accent list is closed at four things and a
          container's background is not among them — and an accent used as a
          state signal is named there as something it is never for. */}
      {isBulkTab && selectedIds.size > 0 && !bulkConfirm && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-raised px-4 py-3">
          <span className="text-sm font-semibold text-ink">
            <span className="font-mono">{selectedIds.size}</span> selected
          </span>

          {/* Pending: the two ordinary acts, no confirmation. */}
          {statusTab === "pending" && (
            <>
              <ActionButton
                onClick={handleBulkApprove}
                label="Approve selected"
                variant="approve"
              />
              <ActionButton
                onClick={handleBulkReject}
                label="Reject selected"
                variant="reject"
              />
            </>
          )}

          {/* Approved: the withdrawal. It asks first. */}
          {statusTab === "approved" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBulkConfirm("withdraw")}
            >
              Withdraw access from selected
            </Button>
          )}

          {/* Rejected: the readmission. It asks first. */}
          {statusTab === "rejected" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setBulkConfirm("readmit")}
            >
              Readmit selected
            </Button>
          )}
        </div>
      )}

      {/* The batch confirmation REPLACES the toolbar while it is open, for the
          same reason the row one replaces its buttons: a second click must not
          be able to land on a different act than the one being confirmed. The
          count it names is the live selection size. */}
      {bulkConfirm && (
        <div className="mb-4">
          <ReversalConfirm
            kind={bulkConfirm}
            count={selectedIds.size}
            onCancel={() => setBulkConfirm(null)}
            onConfirm={async () => {
              await runBulkReversal(bulkConfirm);
              setBulkConfirm(null);
            }}
          />
        </div>
      )}

      {/* The batch's own outcome. Rendered OUTSIDE the toolbar above, which
          disappears with the selection it clears — a notice inside it would be
          unmounted by the very success it was reporting. */}
      {bulkResult && (
        <div className="mb-4 flex flex-col gap-2">
          {bulkResult.batchNotice ? (
            // Refused as a whole: nobody was touched. Its own notice, because
            // "the batch was refused" and "two of nine subjects were refused"
            // are different events with different next steps.
            <MemberActionNotice
              kind={bulkResult.batchNotice.kind}
              detail={bulkResult.batchNotice.detail}
              subject={bulkResult.label}
            />
          ) : (
            <>
              {/* Both numbers, always — and the first one is MEASURED from the
                  outcomes, never taken from how many rows were selected. */}
              {/* The caution semantic when some subjects were refused, the
                  plain heading ink otherwise. Not a grade of the act: the
                  sentence names both numbers whatever the colour, and says in
                  words that the refused rows are still selected. */}
              <p
                className={`text-sm ${
                  bulkResult.failed > 0 ? "text-sem-warn" : "text-ink"
                }`}
              >
                {bulkResult.label}:{" "}
                <span className="font-mono font-semibold">
                  {bulkResult.succeeded}
                </span>{" "}
                of <span className="font-mono">{bulkResult.requested}</span>{" "}
                recorded
                {bulkResult.failed > 0 ? (
                  <>
                    ,{" "}
                    <span className="font-mono font-semibold">
                      {bulkResult.failed}
                    </span>{" "}
                    refused. The refused rows are still selected.
                  </>
                ) : (
                  "."
                )}
              </p>

              {/* One line per refused subject, naming WHO. A caller told which
                  one failed can act on it; a caller told "the batch failed" can
                  only start again and hope. */}
              {bulkResult.failures.map((f) => (
                <MemberActionNotice
                  key={f.subjectId}
                  kind={f.kind}
                  detail={f.detail}
                  subject={f.subject}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* One array, one column declaration, two trees. The switch was at
          1024px here and at 640px on four other tables; it is 768px in one
          place now, and this file no longer names a breakpoint for it at all.

          Which columns survive on a phone is the judgement H41-3 asks about,
          and it is made here rather than by the layout: the NAME is the card's
          title, the ADDRESS its subtitle, ROLE and STATUS the two marks
          opposite them — the two axes stay two, side by side and never merged
          — and JOINED a labelled detail underneath. Nothing is dropped. */}
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(member) => member.id}
        caption="Members, with the role and the status each account holds"
        empty="No members found"
        selection={
          isBulkTab
            ? {
                isSelectable,
                isSelected: (member) => selectedIds.has(member.id),
                onToggleRow: (member) => toggleSelect(member.id),
                allSelected: allSelectableSelected,
                onToggleAll: toggleSelectAll,
                // Each box names its own row. A column of boxes all called
                // "select" names nothing, and the row here is a person.
                rowLabel: (member) =>
                  `Select ${member.full_name || member.email}`,
                allLabel: "Select every selectable row",
                idPrefix: "member",
              }
            : undefined
        }
        expansion={{
          isExpanded: (member) => expandedId === member.id,
          onToggle: (member) => toggleExpanded(member.id),
          render: (member) => (
            <MemberDetail
              member={member}
              referralCount={referralCounts.get(member.id) || 0}
            />
          ),
          label: (member) => `Details for ${member.full_name || member.email}`,
        }}
        actions={
          showActions
            ? {
                header: "Actions",
                render: (member, dense) => (
                  <MemberActions
                    member={member}
                    currentUserId={currentUserId}
                    dense={dense}
                  />
                ),
              }
            : undefined
        }
      />
    </div>
  );
}
