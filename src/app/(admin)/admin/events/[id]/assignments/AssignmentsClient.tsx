"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatEventDate, formatTime } from "@/utils/formatTime";
import {
  assignToParty,
  revokeAssignment,
  type AssignableCapability,
  type AssignmentRefusal,
} from "./actions";
import type { UserRole } from "@/types/database";

/**
 * The night-by-night roster, and the two controls.
 *
 * ── Every refusal has its OWN sentence ───────────────────────────────────────
 *
 * There is no shared "something went wrong" here, and there must never be one:
 * the recorded precedent in this repository is the newsletter form collapsing a
 * network fault, a missing key and an already-subscribed address into one
 * message (`.planning/codebase/CONCERNS.md`). This product has **no error
 * tracking** (`meta-gates.md`), so the sentence below is the only place a
 * refusal exists for a human.
 *
 * Everything is keyed on the action's returned `reason` — a value from a closed
 * set — and never on an error message: Next redacts a Server Action's message in
 * a production build, so a surface that read one would work in `next dev` and
 * stop working in the deployment where it matters.
 */

type PartySummary = { id: string; title: string; date: string; time: string };

type RosterEntry = {
  id: string;
  full_name: string;
  membership_code: string;
  role: UserRole;
};

type LiveAssignment = {
  party_id: string;
  user_id: string;
  capability: AssignableCapability;
  granted_at: string;
};

/**
 * The four jobs, in the words the interface uses.
 *
 * A **total** `Record` over `AssignableCapability` on purpose: a fifth
 * assignable key cannot reach this surface without a label, and a key removed
 * from the action leaves an unreachable entry. `npm run build` holds it, which
 * in a repository with no test runner is worth stating rather than assuming.
 *
 * The option list is derived from these keys rather than written twice, so the
 * dropdown cannot fall out of step with the labels beside it.
 */
const CAPABILITY_LABELS: Record<AssignableCapability, string> = {
  "door.operate": "Door",
  "door.supervise": "Door supervisor",
  "media.upload": "Photo",
  "party.manage": "Night organiser",
};

const CAPABILITY_OPTIONS = Object.keys(CAPABILITY_LABELS) as AssignableCapability[];

/**
 * One sentence per refusal. A **total** `Record`, for the same reason as above:
 * a new refusal in the action is a build error here rather than a silent
 * fallthrough into a generic message.
 *
 * `assignee_not_staff` deliberately does not say "error". It says what to do,
 * and it says the thing about credits that somebody meets exactly here for the
 * first time: a photographer who is a `member` today has to be promoted to
 * staff before they can be assigned to photo, and their **public credit** is a
 * different thing that needs neither a role nor an account.
 */
const REFUSAL_MESSAGES: Record<AssignableRefusalKey, string> = {
  invalid_party: "That night is not a valid reference. Reload the page.",
  invalid_subject: "That account is not a valid reference. Reload the page.",
  invalid_capability:
    "That job cannot be assigned per night. Four can: door, door supervisor, photo and night organiser.",
  party_not_in_event:
    "That night does not belong to this event. Reload the page — what you are looking at is out of date.",
  self_assignment:
    "You cannot assign yourself. Every assignment is recorded with its author, and an assignment whose author and holder are the same person is the one shape attribution cannot make safe. Ask another organiser.",
  self_assignment_refused_by_database:
    "The database refused a self-assignment. Nothing was written. Report this: the check on this screen should have caught it first, so something above this line has stopped working.",
  assignee_not_staff:
    "This person must be promoted to staff before they can be assigned. Only master, organiser and staff accounts can hold a night's job — the database refuses the rest, and nothing was written. A public credit is a different thing: crediting somebody on a night needs neither a role nor an account.",
  already_assigned:
    "This person already holds that job on this night. Nothing was written, and nothing was lost.",
  no_live_assignment:
    "There is no live assignment to revoke. Somebody else may have revoked it a moment ago — reload the page before deciding anything from this screen.",
  write_failed:
    "The write failed and nothing was changed. Retrying once is reasonable; a second identical failure is worth reporting rather than repeating.",
};

/** Keeps the record above total against the action's union without re-listing it. */
type AssignableRefusalKey = AssignmentRefusal;

/** The one thing the surface says when the action never answered at all. */
const TRANSPORT_MESSAGE =
  "The server did not answer, so there is no result to read — and, unlike every other message here, this one cannot tell you whether the write landed. Reload the page and look at the night before trying again.";

type Feedback = { tone: "error" | "success"; text: string };

export default function AssignmentsClient({
  eventId,
  parties,
  assignments,
  roster,
}: {
  eventId: string;
  parties: PartySummary[];
  assignments: LiveAssignment[];
  roster: RosterEntry[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Draft state per night, so two nights on one screen cannot share a selection.
  const [drafts, setDrafts] = useState<
    Record<string, { subjectId: string; capability: AssignableCapability }>
  >({});

  const rosterById = new Map(roster.map((r) => [r.id, r]));

  const draftFor = (partyId: string) =>
    drafts[partyId] ?? { subjectId: "", capability: CAPABILITY_OPTIONS[0] };

  const setDraft = (
    partyId: string,
    patch: Partial<{ subjectId: string; capability: AssignableCapability }>
  ) =>
    setDrafts((current) => ({
      ...current,
      [partyId]: { ...draftFor(partyId), ...patch },
    }));

  async function run(
    call: () => Promise<{ ok: true } | { ok: false; reason: AssignmentRefusal }>,
    successText: string
  ) {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await call();
      if (result.ok) {
        setFeedback({ tone: "success", text: successText });
        startTransition(() => router.refresh());
      } else {
        setFeedback({ tone: "error", text: REFUSAL_MESSAGES[result.reason] });
      }
    } catch {
      // The caught value is deliberately not inspected: its message is redacted
      // in a production build, so reading it would produce a sentence that is
      // informative in `next dev` and useless where it matters.
      setFeedback({ tone: "error", text: TRANSPORT_MESSAGE });
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || isPending;

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="alert"
          className={`rounded-2xl border p-4 text-sm ${
            feedback.tone === "error"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
              : "border-green-500/40 bg-green-500/10 text-green-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {parties.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-muted text-sm">
            This event has no nights yet. Add one before assigning anybody.
          </p>
        </div>
      ) : (
        parties.map((party) => {
          const live = assignments.filter((a) => a.party_id === party.id);
          const draft = draftFor(party.id);

          return (
            <section
              key={party.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4"
            >
              <div>
                <h2 className="text-lg font-semibold">{party.title}</h2>
                <p className="text-xs text-muted">
                  {formatEventDate(party.date)} &middot; {formatTime(party.time)}
                </p>
              </div>

              {/* Who works this night. An empty roster and a failed read are
                  different screens — the failed one never gets here. */}
              {live.length === 0 ? (
                <p className="text-sm text-muted">
                  Nobody is assigned to this night yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {live.map((assignment) => {
                    const person = rosterById.get(assignment.user_id);
                    return (
                      <li
                        key={`${assignment.user_id}-${assignment.capability}`}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {person ? person.full_name : "Account not listed"}
                          </p>
                          <p className="text-xs text-muted">
                            {CAPABILITY_LABELS[assignment.capability]}
                            {person ? ` · ${person.membership_code}` : null}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            run(
                              () =>
                                revokeAssignment(eventId, {
                                  partyId: assignment.party_id,
                                  subjectId: assignment.user_id,
                                  capability: assignment.capability,
                                }),
                              "Assignment revoked. The revocation is recorded — it is not a deletion."
                            )
                          }
                          className="ml-3 shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Only staff roles are offered — D-A. See the page for why the
                  filter is the affordance and the foreign key is the boundary. */}
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <select
                  value={draft.subjectId}
                  disabled={disabled}
                  onChange={(e) =>
                    setDraft(party.id, { subjectId: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
                >
                  <option value="">Select an account&hellip;</option>
                  {roster.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name} ({person.role}) &middot;{" "}
                      {person.membership_code}
                    </option>
                  ))}
                </select>

                <select
                  value={draft.capability}
                  disabled={disabled}
                  onChange={(e) =>
                    setDraft(party.id, {
                      capability: e.target.value as AssignableCapability,
                    })
                  }
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
                >
                  {CAPABILITY_OPTIONS.map((key) => (
                    <option key={key} value={key}>
                      {CAPABILITY_LABELS[key]}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={disabled || !draft.subjectId}
                  onClick={() =>
                    run(
                      () =>
                        assignToParty(eventId, {
                          partyId: party.id,
                          subjectId: draft.subjectId,
                          capability: draft.capability,
                        }),
                      "Assigned. The act is recorded with your name and the time."
                    )
                  }
                  className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Assign
                </button>
              </div>

              {roster.length === 0 && (
                <p className="text-xs text-muted">
                  No account holds a staff role yet. Promote somebody to staff
                  before assigning a job — a public credit is a different thing
                  and needs neither a role nor an account.
                </p>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
