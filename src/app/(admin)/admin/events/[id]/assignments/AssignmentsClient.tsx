"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatEventDate, formatTime } from "@/utils/formatTime";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
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
 * ── What the conversion was allowed to touch, and what it was not ────────────
 *
 * **This surface grants a capability for one night**, so the pass changed markup
 * and nothing else: **no query changed, no column added, no capability check
 * touched, no action payload altered.** `assignToParty` and `revokeAssignment`
 * are called with byte-identical arguments; the four assignable keys, the closed
 * refusal set and every sentence attached to it are untouched; and who may be
 * offered at all is still the roster the page filtered, with the composite
 * foreign key still the boundary behind it.
 *
 * The one thing the conversion *did* add is an accessible name on each of the
 * two selects. They had none — a control that grants a job at a door was
 * announced as "combo box" and nothing else — and §8.6 makes a name mandatory
 * rather than conventional.
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
      {/*
        `role="alert"` on BOTH tones, unchanged. It is assertive for a success
        as well as a refusal, which is not the house default — but changing it
        would make an accepted grant announce more quietly than it does today,
        and on a surface that hands somebody a job at a door that is a behaviour
        decision rather than a styling one.

        The tone-carrying fill and border are gone and the ink carries it: the
        refusal is the warn semantic at 10.63 : 1 on the card ground, the
        acceptance the done semantic at 5.69 : 1, both clearing 1.4.3's 4.5 : 1.
        Neither is the only channel — the sentence says which happened, and §12
        is explicit that colour may never be alone.
      */}
      {feedback && (
        <Card role="alert">
          <p
            className={`text-sm ${
              feedback.tone === "error" ? "text-sem-warn" : "text-sem-done"
            }`}
          >
            {feedback.text}
          </p>
        </Card>
      )}

      {parties.length === 0 ? (
        /* §8.11's empty-state contract — a class string, not a component. */
        <div className="px-6 py-12 text-center">
          <p className="text-base font-semibold text-ink">No nights yet</p>
          <p className="mt-1 text-sm text-muted">
            Add one before assigning anybody.
          </p>
        </div>
      ) : (
        parties.map((party) => {
          const live = assignments.filter((a) => a.party_id === party.id);
          const draft = draftFor(party.id);

          return (
            /*
              The card primitive replaces a hand-written panel. The element goes
              from `<section>` to the card's `<div>`, and that loses nothing:
              the section carried no accessible name, and an unnamed section is
              generic in the accessibility tree rather than a landmark.
            */
            <Card key={party.id} className="space-y-4">
              <div>
                {/*
                  The HEADING role (§7.1), one step down from where this
                  rendered — and `normal-case` is written rather than assumed:
                  `text-transform` INHERITS, a night's title can carry a format
                  name, and §11 says a format name is rendered literally with no
                  CSS transform. Upper-casing appears in dozens of files in this
                  tree, so "we did not ask for it" is not a guarantee.
                */}
                <h2 className="text-base font-semibold normal-case text-ink">
                  {party.title}
                </h2>
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
                      /*
                        A row sitting ON a card, so it takes the RAISED ground
                        rather than a second card: §5's four grounds exist for
                        exactly this stacking, and nesting the card primitive
                        inside itself would put 24px of padding twice around one
                        line of text. The edge is the line token — a container
                        edge is a hint, not an affordance (`Card.tsx`'s own
                        triage) — and the radius is §9's container rung.
                      */
                      <li
                        key={`${assignment.user_id}-${assignment.capability}`}
                        className="flex items-center justify-between rounded-xl border border-line bg-raised p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {person ? person.full_name : "Account not listed"}
                          </p>
                          <p className="text-xs text-muted">
                            {CAPABILITY_LABELS[assignment.capability]}
                            {person ? ` · ${person.membership_code}` : null}
                          </p>
                        </div>
                        {/*
                          The dense-row rung — 44px like every other button, at
                          the narrower padding a row full of actions wants. It
                          was a 28px pill, below §6.1's floor on a surface whose
                          primary device is a phone, and a mis-hit here is an
                          access decision made by accident.

                          `secondary` and not `destructive`: the destructive
                          fill belongs to a button that CONFIRMS (§11), and this
                          one acts on the press. It is also the narrowing
                          direction — revoking takes a capability away — which
                          is why acting without a confirmation is defensible
                          here and would not be on the grant beside it.
                        */}
                        <Button
                          size="sm"
                          variant="secondary"
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
                          className="ml-3 shrink-0"
                        >
                          Revoke
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Only staff roles are offered — D-A. See the page for why the
                  filter is the affordance and the foreign key is the boundary. */}
              {/*
                The small prefix, paid by READING THE CLASS rather than renaming
                the prefix (pitfall P6). This is a TRACK TEMPLATE for one control
                row, not a column count: the three-columns-gain-a-middle-step
                rule is about a count, and two of these three tracks are `auto` —
                a short job select and a button — so the row needs the width for
                one flexible track, not for three equal ones. §2.3 maps this
                exact class to the `md` tier, and at 768px the shell leaves 544px
                after the navigation column, which one 1fr track plus two `auto`
                ones fits. Below that tier the three stack, which is what a phone
                wants for a select whose options are long names.
              */}
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                {/*
                  `aria-label` and not a visible label: a visible one would put a
                  caption above two of the three tracks and leave the button
                  aligned against nothing. Neither select had ANY accessible name
                  before — a control that grants a job at a door announced as
                  "combo box" — and §8.6 makes the name mandatory, by either
                  route, rather than optional.
                */}
                <Select
                  id={`assign-subject-${party.id}`}
                  aria-label="Account to assign"
                  value={draft.subjectId}
                  disabled={disabled}
                  onChange={(e) =>
                    setDraft(party.id, { subjectId: e.target.value })
                  }
                >
                  <option value="">Select an account&hellip;</option>
                  {roster.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name} ({person.role}) &middot;{" "}
                      {person.membership_code}
                    </option>
                  ))}
                </Select>

                <Select
                  id={`assign-capability-${party.id}`}
                  aria-label="Job to assign"
                  value={draft.capability}
                  disabled={disabled}
                  onChange={(e) =>
                    setDraft(party.id, {
                      capability: e.target.value as AssignableCapability,
                    })
                  }
                >
                  {CAPABILITY_OPTIONS.map((key) => (
                    <option key={key} value={key}>
                      {CAPABILITY_LABELS[key]}
                    </option>
                  ))}
                </Select>

                <Button
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
                >
                  Assign
                </Button>
              </div>

              {roster.length === 0 && (
                <p className="text-xs text-muted">
                  No account holds a staff role yet. Promote somebody to staff
                  before assigning a job — a public credit is a different thing
                  and needs neither a role nor an account.
                </p>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
