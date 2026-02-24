"use client";

import { useState, useTransition } from "react";
import type { UserRole, UserStatus } from "@/types/database";
import {
  updateMemberRole,
  deactivateMember,
  reactivateMember,
} from "@/app/(admin)/admin/members/actions";

interface MemberRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  membership_code: string;
  created_at: string;
}

interface MemberTableProps {
  members: MemberRow[];
  currentUserId: string;
  showActions: boolean;
}

// Badge components
function RoleBadge({ role }: { role: UserRole }) {
  const colors: Record<UserRole, string> = {
    master: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    organizer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    member: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[role]}`}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  const colors: Record<UserStatus, string> = {
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {status}
    </span>
  );
}

// Action button with loading state
function ActionButton({
  onClick,
  label,
  variant,
}: {
  onClick: () => void;
  label: string;
  variant: "promote" | "demote" | "deactivate" | "reactivate" | "approve" | "reject";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const variantStyles: Record<string, string> = {
    promote: "border-blue-500/40 text-blue-400 hover:bg-blue-500/10",
    demote: "border-zinc-500/40 text-zinc-400 hover:bg-zinc-500/10",
    deactivate: "border-red-500/40 text-red-400 hover:bg-red-500/10",
    reactivate: "border-green-500/40 text-green-400 hover:bg-green-500/10",
    approve: "border-green-500/40 text-green-400 hover:bg-green-500/10",
    reject: "border-red-500/40 text-red-400 hover:bg-red-500/10",
  };

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        onClick();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  };

  return (
    <div className="inline-flex flex-col">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${variantStyles[variant]}`}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-1">
            <svg
              className="h-3 w-3 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
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
      </button>
      {error && (
        <span className="mt-1 text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}

// Actions cell for a single member row
function MemberActions({
  member,
  currentUserId,
}: {
  member: MemberRow;
  currentUserId: string;
}) {
  const [error, setError] = useState<string | null>(null);

  // Don't show actions for the master's own row
  if (member.id === currentUserId) {
    return <span className="text-xs text-muted">--</span>;
  }

  // Don't show role actions for other masters (shouldn't exist, but defense)
  if (member.role === "master") {
    return <span className="text-xs text-muted">--</span>;
  }

  const handleAction = async (action: () => Promise<{ success: boolean }>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Promote: member + approved -> organizer */}
      {member.role === "member" && member.status === "approved" && (
        <ActionButton
          onClick={() => handleAction(() => updateMemberRole(member.id, "organizer"))}
          label="Promote"
          variant="promote"
        />
      )}

      {/* Demote: organizer -> member */}
      {member.role === "organizer" && (
        <ActionButton
          onClick={() => handleAction(() => updateMemberRole(member.id, "member"))}
          label="Demote"
          variant="demote"
        />
      )}

      {/* Deactivate: approved non-master -> rejected */}
      {member.status === "approved" && (
        <ActionButton
          onClick={() => handleAction(() => deactivateMember(member.id))}
          label="Deactivate"
          variant="deactivate"
        />
      )}

      {/* Reactivate: rejected -> approved */}
      {member.status === "rejected" && (
        <ActionButton
          onClick={() => handleAction(() => reactivateMember(member.id))}
          label="Reactivate"
          variant="reactivate"
        />
      )}

      {/* Pending: Approve + Reject */}
      {member.status === "pending" && (
        <>
          <ActionButton
            onClick={() => handleAction(() => reactivateMember(member.id))}
            label="Approve"
            variant="approve"
          />
          <ActionButton
            onClick={() => handleAction(() => deactivateMember(member.id))}
            label="Reject"
            variant="reject"
          />
        </>
      )}

      {error && (
        <span className="w-full text-xs text-red-400">{error}</span>
      )}
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

  // Client-side filtering
  const filtered = members.filter((m) => {
    const matchesSearch =
      search === "" ||
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Count summary
  const totalMembers = members.length;
  const organizerCount = members.filter((m) => m.role === "organizer").length;
  const pendingCount = members.filter((m) => m.status === "pending").length;

  return (
    <div>
      {/* Count summary */}
      <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted">
        <span>
          <span className="font-semibold text-foreground">{totalMembers}</span>{" "}
          members total
        </span>
        <span>
          <span className="font-semibold text-blue-400">{organizerCount}</span>{" "}
          organizers
        </span>
        <span>
          <span className="font-semibold text-yellow-400">{pendingCount}</span>{" "}
          pending
        </span>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-card-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/50 focus:outline-none sm:flex-1"
        />
        <div className="flex gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent/50 focus:outline-none"
          >
            <option value="all">All roles</option>
            <option value="master">Master</option>
            <option value="organizer">Organizer</option>
            <option value="member">Member</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent/50 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      {search || roleFilter !== "all" || statusFilter !== "all" ? (
        <p className="mb-4 text-xs text-muted">
          Showing {filtered.length} of {totalMembers} members
        </p>
      ) : null}

      {/* Desktop table - hidden on small screens */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-card-border bg-card/50">
                <th className="px-4 py-3 font-medium text-muted">Name</th>
                <th className="px-4 py-3 font-medium text-muted">Email</th>
                <th className="px-4 py-3 font-medium text-muted">Role</th>
                <th className="px-4 py-3 font-medium text-muted">Status</th>
                <th className="px-4 py-3 font-medium text-muted">Joined</th>
                {/* Referred By: placeholder until Phase 3 */}
                <th className="px-4 py-3 font-medium text-muted">Referred By</th>
                {/* TODO: Phase 5 will populate event count via attendances join */}
                <th className="px-4 py-3 font-medium text-muted">Events</th>
                {showActions && (
                  <th className="px-4 py-3 font-medium text-muted">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-card-border/50 transition-colors hover:bg-card/30"
                >
                  <td className="px-4 py-3 font-medium">
                    {member.full_name || "--"}
                  </td>
                  <td className="px-4 py-3 text-muted">{member.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(member.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-muted">--</td>
                  <td className="px-4 py-3 text-muted">--</td>
                  {showActions && (
                    <td className="px-4 py-3">
                      <MemberActions
                        member={member}
                        currentUserId={currentUserId}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={showActions ? 8 : 7}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card layout - visible on small screens */}
      <div className="flex flex-col gap-3 lg:hidden">
        {filtered.map((member) => (
          <div
            key={member.id}
            className="rounded-xl border border-card-border bg-card p-4"
          >
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="font-medium">{member.full_name || "--"}</p>
                <p className="text-sm text-muted">{member.email}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <RoleBadge role={member.role} />
                <StatusBadge status={member.status} />
              </div>
            </div>
            <p className="text-xs text-muted">
              Joined{" "}
              {new Date(member.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
            {showActions && (
              <div className="mt-3 border-t border-card-border/50 pt-3">
                <MemberActions
                  member={member}
                  currentUserId={currentUserId}
                />
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-card-border bg-card p-8 text-center text-muted">
            No members found
          </div>
        )}
      </div>
    </div>
  );
}
