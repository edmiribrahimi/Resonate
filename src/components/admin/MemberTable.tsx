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
  failures: { subjectId: string; subject: string; kind: MemberNoticeKind }[];
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

interface MemberTableProps {
  members: MemberRow[];
  currentUserId: string;
  showActions: boolean;
  callerRole: UserRole;
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
  const colors: Record<UserRole, string> = {
    master: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    organizer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    staff: "bg-zinc-500/10 text-zinc-300 border-zinc-400/60 border-dashed",
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
function ActionButton({
  onClick,
  label,
  variant,
}: {
  onClick: () => Promise<void>;
  label: string;
  variant: "promote" | "demote" | "deactivate" | "reactivate" | "approve" | "reject";
}) {
  const [isPending, startTransition] = useTransition();

  const variantStyles: Record<string, string> = {
    promote: "border-blue-500/40 text-blue-400 hover:bg-blue-500/10",
    demote: "border-zinc-500/40 text-zinc-400 hover:bg-zinc-500/10",
    deactivate: "border-red-500/40 text-red-400 hover:bg-red-500/10",
    reactivate: "border-green-500/40 text-green-400 hover:bg-green-500/10",
    approve: "border-green-500/40 text-green-400 hover:bg-green-500/10",
    reject: "border-red-500/40 text-red-400 hover:bg-red-500/10",
  };

  const handleClick = () => {
    // Awaited: see the note above. `handleAction` already reports every outcome
    // through the parent's notice and never rejects, so there is deliberately
    // no `catch` here to swallow one.
    startTransition(async () => {
      await onClick();
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
  const [notice, setNotice] = useState<ActionNotice | null>(null);

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

  // Who may do what, stated once. Both a master and an organizer hold
  // `staff.manage`, so both may approve, reject and change a role (D-21). Only
  // the master holds `master.manage`, so only the master may withdraw an access
  // already granted — plan 43-09 widened `updateMemberRole` alone and left
  // `deactivateMember` / `reactivateMember` where they were, deliberately.
  //
  // This renders what is actually possible instead of what the widened union
  // suggests: before this plan an organizer saw approve and reject and nothing
  // else, so ACCT-01 — *an organizer may promote a staff member to organizer* —
  // had no control anywhere on the surface.
  const canWithdrawAccess = callerRole === "master";

  // Role changes are offered on APPROVED rows only, and that is a decision
  // rather than an oversight. Granting `staff` or `organizer` writes the role
  // and `approved` in one statement (43-09), so offering it on a `pending` row
  // would approve somebody through a control labelled "promote" — the register
  // would then hold `promoted` where the history needs `approved`.
  // `community-membership.md`, gate *nessuna corsia grigia*: every way in that
  // skips the approval path is an exception, and an exception must not be the
  // convenient button.
  const canChangeRole = member.status === "approved";

  // An organizer looking at a deactivated account has nothing to offer: role
  // changes need an approved row and reactivation is the master's. Drawing an
  // empty cell there would be indistinguishable from a cell that failed to
  // render, so it draws the same "--" the other two suppressed cases draw.
  const hasAnyAction =
    canChangeRole ||
    (canWithdrawAccess &&
      (member.status === "approved" || member.status === "rejected")) ||
    member.status === "pending";

  if (!hasAnyAction && !notice) {
    return <span className="text-xs text-muted">--</span>;
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
          />
          <ActionButton
            onClick={changeRole("organizer")}
            label="Make organizer"
            variant="promote"
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
          />
          <ActionButton
            onClick={changeRole("member")}
            label="Remove staff"
            variant="demote"
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
          />
          <ActionButton
            onClick={changeRole("member")}
            label="Make member"
            variant="demote"
          />
        </>
      )}

      {/* Deactivate: approved non-master -> rejected. Master only. */}
      {canWithdrawAccess && member.status === "approved" && (
        <ActionButton
          onClick={() => handleAction(() => deactivateMember(member.id))}
          label="Deactivate"
          variant="deactivate"
        />
      )}

      {/* Reactivate: rejected -> approved. Master only. */}
      {canWithdrawAccess && member.status === "rejected" && (
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
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
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
  const handleBulk = (
    label: string,
    run: (ids: string[]) => Promise<MemberActResult<BulkActData>>
  ) => {
    const ids = Array.from(selectedIds);
    setBulkResult(null);
    startTransition(async () => {
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
            // A per-subject outcome carries the cause and no detail; the notice
            // falls back to the cause's own sentence, which is the honest
            // answer rather than a borrowed one.
            kind: (o.failure ?? "write_failed") as MemberNoticeKind,
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
    });
  };

  const handleBulkApprove = () => handleBulk("Approve", bulkApproveMember);
  const handleBulkReject = () => handleBulk("Reject", bulkRejectMember);

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
      <div className="mb-2 flex flex-wrap gap-4 text-sm text-muted">
        <span>
          <span className="font-semibold text-foreground">{totalMembers}</span>{" "}
          members total
        </span>
        <span>
          <span className="font-semibold text-blue-400">{organizerCount}</span>{" "}
          organizers
        </span>
        <button
          type="button"
          onClick={() => {
            setRoleFilter("staff");
            setStatusTab("all");
          }}
          className="underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground"
        >
          <span className="font-semibold text-zinc-300">{staffCount}</span> staff
        </button>
        <span>
          <span className="font-semibold text-yellow-400">{pendingCount}</span>{" "}
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
      <p className="mb-6 text-xs text-muted/80">
        A <span className="font-medium text-zinc-300">staff</span> account can do
        nothing a member cannot. What it holds is free entry to every night
        through the membership card, permanently and without expiry — so each one
        is a standing seat at a venue that holds 150–300 people. Working the door
        or a gallery comes from the night&apos;s own assignment and ends with the
        night.
      </p>

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
              <p
                className={`text-sm ${
                  bulkResult.failed > 0 ? "text-amber-200" : "text-foreground"
                }`}
              >
                {bulkResult.label}:{" "}
                <span className="font-semibold">{bulkResult.succeeded}</span> of{" "}
                {bulkResult.requested} recorded
                {bulkResult.failed > 0 ? (
                  <>
                    ,{" "}
                    <span className="font-semibold">{bulkResult.failed}</span>{" "}
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
                  subject={f.subject}
                />
              ))}
            </>
          )}
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
