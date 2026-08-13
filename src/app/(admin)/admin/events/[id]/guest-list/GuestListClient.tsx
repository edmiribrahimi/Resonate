"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastContext";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { Input, Select } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/Typography";
import { addGuest, removeGuest } from "./actions";
import type { GuestListEntry, GuestListStatus } from "@/types/database";

/**
 * Who is on the list, and the one lane that adds a name to it.
 *
 * ── What the conversion was allowed to touch, and what it was not ────────────
 *
 * A guest-list entry is **an entry into a night that never passed approval**.
 * `community-membership.md` is explicit that such a lane is an exception to the
 * gating mechanism rather than a convenience feature, and that it has to be
 * counted and attributed. So this pass changed markup and nothing else: **no
 * query changed, no column added, no capability check touched, no action
 * payload altered.** `addGuest` and `removeGuest` are called with byte-identical
 * arguments, and the author of an entry is still recorded where it always was —
 * inside `actions.ts`, from an identity the server resolved, which this file
 * neither reads nor could forge.
 *
 * ── The toast, which is this file's other reason to exist ────────────────────
 *
 * The toast hook is imported and called here and **nowhere else in the tree**:
 * this is the product's only toast consumer. *(The hook is named by description
 * and not spelled in this sentence, so that a count of its occurrences in this
 * file counts call sites and not prose — the discipline `ToastContainer.tsx`
 * already applies to the property it stopped spelling.)* Plan 41.1-05 pinned
 * the container's
 * inline offset with a measured 32px overlap of the navigation column at exactly
 * 768px, recorded as a loss rather than a substitution. **Not one call site, not
 * one string and not one tone below was touched by this conversion** — the copy
 * is a message a person reads at a door with no error tracking behind it, and
 * §11 introduces none.
 */

interface GuestListClientProps {
  entries: GuestListEntry[];
  parties: { id: string; title: string }[];
  eventId: string;
}

/**
 * The seven states, in the words the interface uses — **labels only now**.
 *
 * Each label used to travel with a raw palette pair (a blue, a yellow, a green,
 * a teal, a red and two whites), so the state was told by hue first and by the
 * word second. §8.5's badge has two tones and neither of them grades an
 * outcome: `emphasis` means *look here first* and is a `--sem-done` fill, which
 * on a failed row would say the opposite of what happened. So every mark is the
 * neutral rung and **the word is the channel** — which is also §12's rule, that
 * colour is never the only one.
 *
 * The one state that carries more than a word still does: a failed entry prints
 * its own reason under the row, in the crit ink, and that sentence is the thing
 * an operator acts on.
 */
const STATUS_LABELS: Record<GuestListStatus, string> = {
  pending: "Pending",
  invited: "Invited",
  registered: "Registered",
  ticket_issued: "Ticket Issued",
  checked_in: "Checked In",
  already_has_ticket: "Has Ticket",
  failed: "Failed",
};

export default function GuestListClient({
  entries,
  parties,
  eventId,
}: GuestListClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [partyId, setPartyId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status counts
  const statusCounts = entries.reduce(
    (acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Party map for display
  const partyMap = new Map(parties.map((p) => [p.id, p.title]));

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await addGuest(eventId, {
        first_name: firstName,
        last_name: lastName,
        email: email || undefined,
        party_id: partyId || undefined,
      });

      if (result.error) {
        toast(result.error, "error");
      } else {
        toast("Guest added successfully", "success");
        setFirstName("");
        setLastName("");
        setEmail("");
        setPartyId("");
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      toast("Failed to add guest", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveGuest(entry: GuestListEntry) {
    const name = `${entry.first_name} ${entry.last_name}`;

    const message = entry.ticket_id
      ? `This guest already has a ticket. The ticket will remain valid but the guest will be removed from the list. Remove ${name}?`
      : `Remove ${name} from guest list?`;

    if (!confirm(message)) return;

    try {
      const result = await removeGuest(entry.id, eventId);

      if (result.error) {
        toast(result.error, "error");
      } else {
        toast(
          result.hadTicket
            ? `${name} removed (ticket still valid)`
            : `${name} removed`,
          "success"
        );
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      toast("Failed to remove guest", "error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Guest Form */}
      <Card>
        <form onSubmit={handleAddGuest} className="space-y-4">
          <SectionHeading>Add Guest</SectionHeading>

          {/*
            One column on a phone, two from the tablet tier up. The pair used to
            be two columns at every width, which puts two 44px fields into a
            390px screen minus the gutter — §2.2's middle step is exactly the
            width where a two-up row starts being readable.
          */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              id="guest-first-name"
              label="First Name *"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              placeholder="First name"
            />
            <Input
              id="guest-last-name"
              label="Last Name *"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              placeholder="Last name"
            />
          </div>

          {/*
            The sentence under this field is a `hint`, not a loose paragraph: it
            says the address triggers a registration and an email, which is the
            one thing on this form a person needs to know BEFORE typing. As a
            sibling it was visible and unassociated; as a hint it is named in
            `aria-describedby` and reaches somebody who never sees it.
          */}
          <Input
            id="guest-email"
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="guest@example.com"
            hint="If provided, the guest will be auto-registered and receive an invitation email with their ticket."
          />

          {parties.length > 0 && (
            <Select
              id="guest-party"
              label="Party"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
            >
              <option value="">All Parties</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.title}
                </option>
              ))}
            </Select>
          )}

          {/*
            Width is the caller's, per the button ladder's own docblock — the
            pill is inline by construction and a full-width action says so here.
            The label is unchanged: §11 introduces no button copy.
          */}
          <Button
            type="submit"
            disabled={isSubmitting || isPending}
            className="w-full"
          >
            {isSubmitting ? "Adding..." : "Add Guest"}
          </Button>
        </form>
      </Card>

      {/* Summary Stats */}
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge>Total: {entries.length}</Badge>
          {Object.entries(statusCounts).map(([status, count]) => {
            const label = STATUS_LABELS[status as GuestListStatus];
            if (!label) return null;
            return (
              <Badge key={status}>
                {label}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Guest List */}
      {entries.length === 0 ? (
        /* §8.11's empty-state contract — a class string, not a component. */
        <div className="px-6 py-12 text-center">
          <p className="text-base font-semibold text-ink">No guests yet</p>
          <p className="mt-1 text-sm text-muted">
            Add the first one with the form above.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">
                        {entry.first_name} {entry.last_name}
                      </p>
                      {/*
                        A mark that STATES and cannot be operated, so it is a
                        badge and not a chip — the sentence at the top of
                        `Chip.tsx` is what decides that.
                      */}
                      <Badge>{STATUS_LABELS[entry.status]}</Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      {entry.email && (
                        <p className="truncate text-xs text-muted">
                          {entry.email}
                        </p>
                      )}
                      {/*
                        This line used to be dimmer than the muted ink, which is
                        below the readable floor rather than a quieter rung of
                        it — §5's ladder stops at muted, and muted is what
                        clears 4.5 : 1 on the card ground.
                      */}
                      <p className="text-xs text-muted">
                        {entry.party_id
                          ? partyMap.get(entry.party_id) || "Unknown Party"
                          : "All Parties"}
                      </p>
                    </div>
                    {entry.status === "failed" && entry.error_message && (
                      <p className="mt-1 text-xs text-sem-crit">
                        {entry.error_message}
                      </p>
                    )}
                  </div>

                  {/*
                    An icon-only control has no name of its own, and the
                    primitive makes the name a required prop rather than a
                    convention. It names the ROW and not the column — a list of
                    forty identical `Remove` buttons is what that avoids.

                    `ghost` and not `destructive`: this control OPENS a
                    confirmation, and §11 gives the destructive fill to the
                    button that confirms, never to the one that asks.
                  */}
                  <IconButton
                    aria-label={`Remove ${entry.first_name} ${entry.last_name} from the guest list`}
                    onClick={() => handleRemoveGuest(entry)}
                    className="ml-2 shrink-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </IconButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
