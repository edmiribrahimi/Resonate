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

interface MemberTableProps {
  members: MemberRow[];
  currentUserId: string;
  showActions: boolean;
  callerRole: UserRole;
}

type StatusTab = "all" | "pending" | "approved" | "rejected";

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

// Chevron icon for expandable rows
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-muted transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
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
  callerRole,
}: {
  member: MemberRow;
  currentUserId: string;
  callerRole: UserRole;
}) {
  const [error, setError] = useState<string | null>(null);

  // Don't show actions for the user's own row
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

  // Organizer can only approve/reject pending members
  if (callerRole === "organizer") {
    if (member.status !== "pending") {
      return <span className="text-xs text-muted">--</span>;
    }
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <ActionButton
          onClick={() => handleAction(() => approveMember(member.id))}
          label="Approve"
          variant="approve"
        />
        <ActionButton
          onClick={() => handleAction(() => rejectMember(member.id))}
          label="Reject"
          variant="reject"
        />
        {error && (
          <span className="w-full text-xs text-red-400">{error}</span>
        )}
      </div>
    );
  }

  // Master sees all actions
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
            onClick={() => handleAction(() => approveMember(member.id))}
            label="Approve"
            variant="approve"
          />
          <ActionButton
            onClick={() => handleAction(() => rejectMember(member.id))}
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

// Expandable detail section showing referral and attendance data
function MemberDetail({
  member,
  referralCount,
}: {
  member: MemberRow;
  referralCount: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 px-2 py-3 sm:grid-cols-3">
      <div>
        <p className="text-xs font-medium text-muted">Referred by</p>
        <p className="mt-0.5 text-sm">
          {member.referrer_name || (member.referred_by ? "Unknown" : "Direct signup")}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted">Referred members</p>
        <p className="mt-0.5 text-sm">{referralCount}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted">Events attended</p>
        <p className="mt-0.5 text-sm">0</p>
      </div>
    </div>
  );
}

export default function MemberTable({
  members,
  currentUserId,
  showActions,
  callerRole,
}: MemberTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  const isPendingTab = statusTab === "pending";

  // Bulk selection helpers
  const pendingFiltered = filtered.filter((m) => m.status === "pending");
  const allPendingSelected = pendingFiltered.length > 0 && pendingFiltered.every((m) => selectedIds.has(m.id));

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingFiltered.map((m) => m.id)));
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

  const handleBulkApprove = () => {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      try {
        await bulkApproveMember(ids);
        setSelectedIds(new Set());
      } catch {
        // Individual row errors are more actionable; silently clear here
      }
    });
  };

  const handleBulkReject = () => {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      try {
        await bulkRejectMember(ids);
        setSelectedIds(new Set());
      } catch {
        // Individual row errors are more actionable; silently clear here
      }
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Number of main table columns (for colSpan calculations)
  const colCount = (isPendingTab ? 1 : 0) + 5 + (showActions ? 1 : 0) + 1; // +1 for chevron col

  // Status tab active check
  const isActiveTab = (tab: StatusTab) => statusTab === tab;

  const hasActiveFilters = search || roleFilter !== "all" || (statusTab === "all" && statusFilter !== "all");

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

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "pending", "approved", "rejected"] as StatusTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusTab(tab);
              setSelectedIds(new Set());
              setExpandedId(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActiveTab(tab)
                ? "bg-accent text-white"
                : "bg-card text-muted hover:text-foreground"
            }`}
          >
            {tab === "all" && "All"}
            {tab === "pending" && `Pending (${pendingCount})`}
            {tab === "approved" && "Approved"}
            {tab === "rejected" && "Rejected"}
          </button>
        ))}
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
          {/* Hide status dropdown when a specific status tab is active */}
          {statusTab === "all" && (
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
          )}
        </div>
      </div>

      {/* Results count */}
      {hasActiveFilters ? (
        <p className="mb-4 text-xs text-muted">
          Showing {filtered.length} of {totalMembers} members
        </p>
      ) : null}

      {/* Bulk action toolbar */}
      {isPendingTab && selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <button
            onClick={handleBulkApprove}
            className="rounded-md border border-green-500/40 px-3 py-1 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/10"
          >
            Approve selected
          </button>
          <button
            onClick={handleBulkReject}
            className="rounded-md border border-red-500/40 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Reject selected
          </button>
        </div>
      )}

      {/* Desktop table - hidden on small screens */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-card-border bg-card/50">
                {/* Checkbox column: only on Pending tab */}
                {isPendingTab && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-card-border accent-accent"
                    />
                  </th>
                )}
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 font-medium text-muted">Name</th>
                <th className="px-4 py-3 font-medium text-muted">Email</th>
                <th className="px-4 py-3 font-medium text-muted">Role</th>
                <th className="px-4 py-3 font-medium text-muted">Status</th>
                <th className="px-4 py-3 font-medium text-muted">Joined</th>
                {showActions && (
                  <th className="px-4 py-3 font-medium text-muted">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => {
                const isExpanded = expandedId === member.id;
                return (
                  <MemberRowDesktop
                    key={member.id}
                    member={member}
                    isExpanded={isExpanded}
                    isPendingTab={isPendingTab}
                    isSelected={selectedIds.has(member.id)}
                    showActions={showActions}
                    callerRole={callerRole}
                    currentUserId={currentUserId}
                    referralCount={referralCounts.get(member.id) || 0}
                    colCount={colCount}
                    onToggleSelect={() => toggleSelect(member.id)}
                    onToggleExpand={() => toggleExpanded(member.id)}
                  />
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={colCount}
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
        {filtered.map((member) => {
          const isExpanded = expandedId === member.id;
          return (
            <div
              key={member.id}
              className="rounded-xl border border-card-border bg-card"
            >
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox on Pending tab */}
                  {isPendingTab && member.status === "pending" && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(member.id)}
                      onChange={() => toggleSelect(member.id)}
                      className="mt-1 h-4 w-4 rounded border-card-border accent-accent"
                    />
                  )}
                  <button
                    onClick={() => toggleExpanded(member.id)}
                    className="flex flex-1 items-start justify-between text-left"
                  >
                    <div>
                      <p className="font-medium">{member.full_name || "--"}</p>
                      <p className="text-sm text-muted">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <RoleBadge role={member.role} />
                        <StatusBadge status={member.status} />
                      </div>
                      <ChevronIcon expanded={isExpanded} />
                    </div>
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Joined{" "}
                  {(() => { const d = new Date(member.created_at); const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`; })()}
                </p>
              </div>

              {/* Expandable detail */}
              {isExpanded && (
                <div className="border-t border-card-border/30 bg-card/20 px-4 py-3">
                  <MemberDetail
                    member={member}
                    referralCount={referralCounts.get(member.id) || 0}
                  />
                </div>
              )}

              {/* Actions */}
              {showActions && (
                <div className="border-t border-card-border/50 px-4 py-3">
                  <MemberActions
                    member={member}
                    currentUserId={currentUserId}
                    callerRole={callerRole}
                  />
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-card-border bg-card p-8 text-center text-muted">
            No members found
          </div>
        )}
      </div>
    </div>
  );
}

// Desktop table row (extracted for readability with expand/collapse)
function MemberRowDesktop({
  member,
  isExpanded,
  isPendingTab,
  isSelected,
  showActions,
  callerRole,
  currentUserId,
  referralCount,
  colCount,
  onToggleSelect,
  onToggleExpand,
}: {
  member: MemberRow;
  isExpanded: boolean;
  isPendingTab: boolean;
  isSelected: boolean;
  showActions: boolean;
  callerRole: UserRole;
  currentUserId: string;
  referralCount: number;
  colCount: number;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-card-border/50 transition-colors hover:bg-card/30 ${isExpanded ? "bg-card/20" : ""}`}
      >
        {/* Checkbox */}
        {isPendingTab && (
          <td className="w-10 px-4 py-3">
            {member.status === "pending" ? (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleSelect}
                className="h-4 w-4 rounded border-card-border accent-accent"
              />
            ) : null}
          </td>
        )}
        {/* Chevron */}
        <td className="w-8 px-2 py-3">
          <button onClick={onToggleExpand} className="p-0.5">
            <ChevronIcon expanded={isExpanded} />
          </button>
        </td>
        <td
          className="cursor-pointer px-4 py-3 font-medium"
          onClick={onToggleExpand}
        >
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
          {(() => { const d = new Date(member.created_at); const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`; })()}
        </td>
        {showActions && (
          <td className="px-4 py-3">
            <MemberActions
              member={member}
              currentUserId={currentUserId}
              callerRole={callerRole}
            />
          </td>
        )}
      </tr>
      {/* Expanded detail row */}
      {isExpanded && (
        <tr className="border-b border-card-border/50">
          <td colSpan={colCount} className="bg-card/20 px-8 py-2">
            <MemberDetail member={member} referralCount={referralCount} />
          </td>
        </tr>
      )}
    </>
  );
}
