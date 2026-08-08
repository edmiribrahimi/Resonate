import type { MemberActFailure } from "./actions";

/**
 * What a refused member act looks like on screen — one notice per cause.
 *
 * ── Why this component exists, and why it is not optional ────────────────────
 *
 * Plan 43-09 changed the eight member acts from THROWING to RETURNING a tagged
 * result, and in doing so made every `catch` in `MemberTable.tsx` unreachable.
 * Without something drawing the returned tag, a refused act draws **nothing at
 * all** — which is not merely a missing message, it is the failure that reads as
 * a success. That plan wrote six provisional sentences to keep its own change
 * honest and handed the wording, the placement and the styling to this plan.
 * This file is that hand-over completed: the sentences are no longer
 * provisional, and they no longer live inside the table.
 *
 * The shape is `newsletter/FailureNotice.tsx` — the repository's only precedent
 * for "one component, one notice per cause" — followed rather than re-derived.
 *
 * ── There is no shared fallback string here, and there must never be one ─────
 *
 * `meta-gates.md`, *zero fallimenti silenziosi*, with a recorded precedent in
 * this repository: the newsletter form collapses a network fault, a missing key
 * and an already-subscribed address into *"Qualcosa è andato storto"*
 * (`.planning/codebase/CONCERNS.md`), which leaves both the operator and the
 * next developer without a next step. And this project has **no error
 * tracking** at all (`meta-gates.md`, verified 2026-08-05), so a log line
 * reaches nobody: this banner is the only place a refusal exists for a human.
 *
 * ── The tag is a VALUE, never a message ──────────────────────────────────────
 *
 * Next redacts the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`). Everything drawn
 * below is keyed on `failure` and on `detail` — both of which the action
 * chooses from a closed vocabulary — so this surface behaves the same in
 * `next dev` and in the deployment where it matters. `e.message` is not read
 * anywhere in this file or in its caller.
 */

/**
 * The seven causes this surface can draw.
 *
 * Six come from the server (`MemberActFailure`). The seventh is client-only:
 * the action never returned at all, so there is no tag to read and no way to
 * know from here whether the write landed.
 */
export type MemberNoticeKind = MemberActFailure | "transport_unavailable";

/**
 * Three tones, because the three demand different things of the reader.
 *
 * `fault` — something broke; retrying is reasonable.
 * `refusal` — the system said no on purpose; retrying changes nothing.
 * `noop` — nothing was wrong and nothing happened.
 *
 * The tone drives the colour, and the colour is never the only channel: every
 * notice states in words which of the three it is
 * (`nextjs-architecture.md`, gate *accessibilità al buio*).
 */
type Tone = "fault" | "refusal" | "noop";

type Notice = { tone: Tone; title: string; body: string };

const TONE_STYLES: Record<Tone, { box: string; title: string }> = {
  fault: {
    box: "border-red-500/40 bg-red-500/10",
    title: "text-red-300",
  },
  refusal: {
    box: "border-amber-500/40 bg-amber-500/10",
    title: "text-amber-200",
  },
  noop: {
    box: "border-card-border bg-card",
    title: "text-foreground",
  },
};

/** The six server causes, one sentence each. No two collapse. */
const NOTICES: Record<MemberNoticeKind, Notice> = {
  capabilities_unavailable: {
    tone: "fault",
    title: "Permission check failed — this is not a refusal",
    body:
      "The database could not answer which capabilities this session holds, so " +
      "nothing was attempted and nothing was changed. This is an " +
      "infrastructure fault, not a statement about what you are allowed to do. " +
      "Retrying is reasonable; if it persists, check that the capability model " +
      "migration is applied and that EXECUTE on public.my_access_context() is " +
      "still granted to authenticated.",
  },

  // Refined by `detail` in `FORBIDDEN_BY_DETAIL` below — this entry is the one
  // a refusal falls back to, and it still names the code rather than hiding it.
  forbidden: {
    tone: "refusal",
    title: "The server refused this act",
    body:
      "Nothing was attempted and nothing was changed. This is a refusal, not a " +
      "fault: retrying will produce the same answer. The reason the server " +
      "gave is shown below.",
  },

  /**
   * The sentence plan 43-09 wrote, kept **verbatim** rather than reworded.
   *
   * It is the one cause in this vocabulary that can arrive from a RULE instead
   * of from a bug: `profiles_role_implies_approved` (plan 43-06) says a staff
   * role implies an approved account, and it fires on the day it fires — on a
   * path nobody tested, by definition. The wording names WHERE the refusal came
   * from on purpose, so that the day the constraint fires is not the day
   * somebody learns the word "redacted".
   */
  constraint_refused: {
    tone: "refusal",
    title:
      "This account holds a staff role, and a staff role must be approved — " +
      "the write was refused by the database, not by this screen",
    body:
      "Nothing was changed: the profile write and its register row are one " +
      "transaction, so the register does not claim an act the database " +
      "refused. Approve the account first, then set the role — or set both at " +
      "once with a role change, which moves the two axes in a single " +
      "statement. The constraint's name is in the server log; the code below " +
      "is what identified it here.",
  },

  subject_not_found: {
    tone: "refusal",
    title: "This account no longer exists",
    body:
      "The row was gone by the time the write ran, so nothing was changed and " +
      "nothing was recorded. Reload the list — what you are looking at is out " +
      "of date. This is a different thing from a refused write: there is " +
      "nothing here to retry.",
  },

  write_failed: {
    tone: "fault",
    title: "The write failed — nothing was changed",
    body:
      "The database refused or could not complete the write for a reason this " +
      "screen cannot name more precisely. Nothing was written to the account " +
      "and nothing was recorded in the register. The code below is the " +
      "diagnosis; retrying is reasonable once, and a second identical failure " +
      "is worth reporting rather than repeating.",
  },

  // Refined by `detail` in `NOTHING_TO_DO_BY_DETAIL` below.
  nothing_to_do: {
    tone: "noop",
    title: "Nothing to do — the request asked for no change",
    body:
      "No act was recorded, and that is correct rather than a shortfall: the " +
      "register has seven values and none of them means \"nothing happened\", " +
      "so writing one anyway would put a change in the history that the " +
      "database never performed.",
  },

  transport_unavailable: {
    tone: "fault",
    title: "The server did not answer",
    body:
      "The request did not complete, so there is no result to read — and, " +
      "unlike every other notice here, this one cannot tell you whether the " +
      "write landed. Reload the list and look at the account before trying " +
      "again.",
  },
};

/**
 * `forbidden` is one tag covering twelve distinct refusals, and telling a person
 * only "you do not have permission" would collapse them exactly as the recorded
 * newsletter defect collapses its three causes.
 *
 * Five arrived with CR-01's repair (`43-REVIEW-FIX`): `self_approve`,
 * `self_reject`, `withdrawal_is_master_only`, `restoration_is_master_only`, and
 * a widened `subject_is_master` that now covers every act in the group rather
 * than the role change alone. Each is reachable per subject inside a batch, so
 * each has to arrive at this file as a VALUE — which is why
 * `BulkSubjectOutcome` gained a `detail`.
 *
 * Every key below is a `detail` literal chosen by `admin/members/actions.ts`
 * — a value, not a message, and therefore safe to branch on and safe to render.
 */
const FORBIDDEN_BY_DETAIL: Record<string, Notice> = {
  staff_manage_required: {
    tone: "refusal",
    title: "This session cannot approve, reject or change a role",
    body:
      "Nothing was attempted. Approving, rejecting and changing a role are " +
      "reserved to a master or an organizer. If you believe you are one of " +
      "those, sign out and back in: the answer came from the capability " +
      "model, not from this page.",
  },
  master_manage_required: {
    tone: "refusal",
    title: "Deactivating and reactivating an account is reserved to the master",
    body:
      "Nothing was attempted. An organizer may approve, reject and change a " +
      "role, and deliberately may not withdraw an access that was already " +
      "granted. This is a boundary of the access model, not a fault.",
  },
  subject_is_master: {
    tone: "refusal",
    title: "No act on this surface can be aimed at the master, by anybody",
    body:
      "Nothing was changed. The refusal comes from the server, not from this " +
      "screen: the table hides the control on a master's row, and hiding a " +
      "control is not the same as refusing a request — a Server Action is a " +
      "public endpoint with a convenient signature. It covers every act here — " +
      "role change, approve, reject, deactivate, reactivate — because a " +
      "restriction reachable through a sibling act is not a restriction. " +
      "Changing who holds the top role is done through the deployment " +
      "environment, which is the one place it is recorded.",
  },
  withdrawal_is_master_only: {
    tone: "refusal",
    title:
      "This account's access was already granted — withdrawing it is Deactivate, " +
      "and Deactivate is reserved to the master",
    body:
      "Nothing was changed. Reject refuses an application that is still open; " +
      "withdrawing an access that had already been granted is a different act " +
      "with a different name, and the register keeps the two apart on purpose. " +
      "Rejecting an approved account here would write \"rejected\" into the " +
      "history where \"deactivated\" is what happened.",
  },
  restoration_is_master_only: {
    tone: "refusal",
    title:
      "This account was already refused — restoring it is Reactivate, and " +
      "Reactivate is reserved to the master",
    body:
      "Nothing was changed. Approve decides an application that is still open; " +
      "restoring an access that had been withdrawn is a different act with a " +
      "different name. Approving a rejected account here would write " +
      "\"approved\" into the history where \"reactivated\" is what happened — " +
      "and it would reach, through a wider gate, the act the narrower one holds.",
  },
  self_approve: {
    tone: "refusal",
    title: "You cannot approve your own account",
    body:
      "Nothing was changed. Every act on somebody's role or status is recorded " +
      "with its author, and an act whose author and subject are the same person " +
      "is the one shape attribution cannot make safe. Ask another master or " +
      "organizer.",
  },
  self_reject: {
    tone: "refusal",
    title: "You cannot reject your own account",
    body:
      "Nothing was changed. It is the same refusal as approving yourself, held " +
      "in both directions so the pair cannot drift apart — which is exactly how " +
      "the gap this closes came about.",
  },
  self_role_change: {
    tone: "refusal",
    title: "You cannot change your own role",
    body:
      "Nothing was changed. Every act on somebody's role or status is recorded " +
      "with its author, and an act whose author and subject are the same " +
      "person is the one shape that attribution cannot make safe. Ask another " +
      "master or organizer.",
  },
  self_deactivate: {
    tone: "refusal",
    title: "You cannot deactivate your own account",
    body:
      "Nothing was changed. Ask another master — this refusal exists so that " +
      "one mistaken click cannot lock the only person who can undo it out of " +
      "the surface that undoes it.",
  },
  self_reactivate: {
    tone: "refusal",
    title: "You cannot reactivate your own account",
    body:
      "Nothing was changed. It is the same refusal as deactivating yourself, " +
      "held in both directions so the pair cannot drift apart.",
  },
  role_not_writable: {
    tone: "refusal",
    title: "That role cannot be granted from here",
    body:
      "Nothing was changed. Three roles can be written by this surface — " +
      "member, staff and organizer — and master is not one of them: a " +
      "self-replicating power must not reach the top. The ceiling is held in " +
      "the action and re-tested against the request body, so it is not the " +
      "menu that refused, and adding an option to the menu would not add a " +
      "capability.",
  },
};

/** `nothing_to_do` covers two situations that want two different next steps. */
const NOTHING_TO_DO_BY_DETAIL: Record<string, Notice> = {
  role_unchanged: {
    tone: "noop",
    title: "This account already holds that role",
    body:
      "No act was recorded, on purpose: a role change that changes no role is " +
      "not an event, and writing one would put a transition in the register " +
      "that never happened. Nothing is wrong here.",
  },
  no_subjects_selected: {
    tone: "noop",
    title: "Nothing was selected",
    body:
      "No account was touched and nothing was recorded. Select at least one " +
      "row and try again.",
  },
};

/**
 * The notice for a cause, refined by its detail where the detail carries a
 * distinct meaning.
 *
 * An unrecognised detail deliberately falls back to the CAUSE's own notice and
 * still shows the raw value underneath. That is not a shared "action failed":
 * the reader is told which category the refusal belongs to and is shown the
 * exact word the server used, which is the smallest honest answer this surface
 * can give for a value it does not yet have a sentence for.
 */
export function resolveMemberNotice(
  kind: MemberNoticeKind,
  detail?: string
): Notice {
  if (kind === "forbidden" && detail && FORBIDDEN_BY_DETAIL[detail]) {
    return FORBIDDEN_BY_DETAIL[detail];
  }
  if (kind === "nothing_to_do" && detail && NOTHING_TO_DO_BY_DETAIL[detail]) {
    return NOTHING_TO_DO_BY_DETAIL[detail];
  }
  return NOTICES[kind];
}

export default function MemberActionNotice({
  kind,
  detail,
  subject,
  compact = false,
}: {
  kind: MemberNoticeKind;
  /**
   * The action's `detail` — a code chosen from a closed set, never a message.
   *
   * It is rendered verbatim in a monospace line, following
   * `newsletter/FailureNotice.tsx`. Residual, named rather than left to be
   * discovered: two of the six causes (`capabilities_unavailable` and the
   * `write_failed` raised by an unexpected throw) carry an error *message*
   * rather than a code, because that is what `guarded` has to hand. On an
   * admin-only surface with no error tracking anywhere in the product, showing
   * it is the lesser cost — the alternative deletes the only diagnosis that
   * will ever exist.
   */
  detail?: string;
  /** Who the act was aimed at, when the notice is about one row of a batch. */
  subject?: string;
  /** Inside a table cell the body would break the row; the title carries it. */
  compact?: boolean;
}) {
  const notice = resolveMemberNotice(kind, detail);
  const styles = TONE_STYLES[notice.tone];

  if (compact) {
    return (
      <span role="alert" className={`text-xs ${styles.title}`}>
        {subject ? <span className="font-medium">{subject}: </span> : null}
        {notice.title}.{" "}
        <span className="text-muted">{notice.body}</span>
        {detail ? (
          <span className="ml-1 font-mono text-[11px] text-muted">
            ({detail})
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <div role="alert" className={`rounded-2xl border p-4 ${styles.box}`}>
      <p className={`text-sm font-medium ${styles.title}`}>
        {subject ? <span className="font-semibold">{subject} — </span> : null}
        {notice.title}
      </p>
      <p className="mt-1 text-xs text-muted">{notice.body}</p>
      {detail ? (
        <p className="mt-2 break-words font-mono text-[11px] text-muted">
          {detail}
        </p>
      ) : null}
    </div>
  );
}
