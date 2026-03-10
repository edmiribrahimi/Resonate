"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastContext";
import { addGuest, removeGuest } from "./actions";
import CSVImport from "./CSVImport";
import type { GuestListEntry, GuestListStatus } from "@/types/database";

interface GuestListClientProps {
  entries: GuestListEntry[];
  parties: { id: string; title: string }[];
  eventId: string;
}

const STATUS_CONFIG: Record<
  GuestListStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-white/10 text-white/60",
  },
  invited: {
    label: "Invited",
    className: "bg-blue-500/20 text-blue-400",
  },
  registered: {
    label: "Registered",
    className: "bg-yellow-500/20 text-yellow-400",
  },
  ticket_issued: {
    label: "Ticket Issued",
    className: "bg-green-500/20 text-green-400",
  },
  checked_in: {
    label: "Checked In",
    className: "bg-teal-500/20 text-teal-400",
  },
  already_has_ticket: {
    label: "Has Ticket",
    className: "bg-white/10 text-white/40",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/20 text-red-400",
  },
};

function StatusBadge({
  status,
  errorMessage,
}: {
  status: GuestListStatus;
  errorMessage: string | null;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
      title={status === "failed" && errorMessage ? errorMessage : undefined}
    >
      {config.label}
    </span>
  );
}

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
      <form
        onSubmit={handleAddGuest}
        className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4"
      >
        <h2 className="text-lg font-semibold">Add Guest</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              placeholder="First name"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-white/30 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              placeholder="Last name"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-white/30 focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">
            Email (optional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="guest@example.com"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-white/30 focus:border-accent focus:outline-none"
          />
          <p className="text-xs text-muted mt-1">
            If provided, the guest will be auto-registered and receive an
            invitation email with their ticket.
          </p>
        </div>

        {parties.length > 0 && (
          <div>
            <label className="block text-xs text-muted mb-1">Party</label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="">All Parties</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isPending}
          className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Guest"}
        </button>
      </form>

      {/* CSV Import & Clone */}
      <CSVImport eventId={eventId} parties={parties} />

      {/* Summary Stats */}
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/60">
            Total: {entries.length}
          </span>
          {Object.entries(statusCounts).map(([status, count]) => {
            const config =
              STATUS_CONFIG[status as GuestListStatus];
            if (!config) return null;
            return (
              <span
                key={status}
                className={`rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
              >
                {config.label}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Guest List */}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-muted text-sm">
            No guests added yet. Use the form above to add guests.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.first_name} {entry.last_name}
                  </p>
                  <StatusBadge
                    status={entry.status}
                    errorMessage={entry.error_message}
                  />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {entry.email && (
                    <p className="text-xs text-muted truncate">{entry.email}</p>
                  )}
                  <p className="text-xs text-white/30">
                    {entry.party_id
                      ? partyMap.get(entry.party_id) || "Unknown Party"
                      : "All Parties"}
                  </p>
                </div>
                {entry.status === "failed" && entry.error_message && (
                  <p className="text-xs text-red-400 mt-1">
                    {entry.error_message}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleRemoveGuest(entry)}
                className="ml-2 shrink-0 rounded-lg p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Remove guest"
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
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
