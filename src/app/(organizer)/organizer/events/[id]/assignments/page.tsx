import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import AssignmentsClient from "./AssignmentsClient";
import type { AssignableCapability } from "./actions";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * Who works this night — the surface for ASSIGN-01 and ASSIGN-03.
 *
 * ── Why this address, and not a "already new" one ────────────────────────────
 *
 * It lives in the ORGANIZER tree, beside the other per-event management
 * surfaces, and accepts that phase 34 will later move it behind a permanent
 * redirect — which is what that phase promises for every prior address.
 * Building the moved address today would pre-empt a phase-34 decision and take
 * the choice away from it.
 *
 * ── The error state is not the empty state, and that is the part not to
 *    simplify ──────────────────────────────────────────────────────────────────
 *
 * `[]` is a VALID answer on every read below — "nobody is assigned to this
 * night" — so a transient failure collapsed into `?? []` would render as a night
 * with no staff. This repository has **no error tracking** (`meta-gates.md`), so
 * the `console.error` reaches nobody: the screen is the only observer. And the
 * error it would hide is the one that matters, because an organizer looking at
 * an apparently empty roster the afternoon of the night assigns somebody who is
 * already assigned, or worse concludes nobody is covering the door.
 *
 * The outcome is decided by POSITION — `error` truthy or not — never by
 * inspecting a message.
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

/** What the surface shows about a person: a name and the door's credential. Never an address. */
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

export default async function AssignmentsPage({ params }: PageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
  const ctx = await getAccessContext();

  // `MobileNav` is a `"use client"` component that still takes role and status
  // as props; phase 34 (STAFF-03) converts it. No decision on this page reads
  // them.
  const navRole = ctx.role as UserRole | null;
  const navStatus = ctx.status as UserStatus | null;

  // Defense in depth: may this person reach the organizer area at all.
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/organizer/events");
  }

  // Ownership — one call, never a re-inlined comparison.
  //
  // On this page the check carries more than an interface decision. Everything
  // below is read with the **service-role client**, which bypasses every
  // row-level policy (`access-gating.md`, gate *service role*). On those reads
  // there is no second boundary: this `if` is the only thing scoping them to an
  // event the caller may see.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/organizer/events");
  }

  const serviceClient = getServiceClient();

  const { data: parties, error: partiesError } = await serviceClient
    .from("event_parties")
    .select("id, title, date, time")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  const partyList = (parties ?? []) as {
    id: string;
    title: string;
    date: string;
    time: string;
  }[];

  // The LIVE assignments of this event's nights.
  //
  // `.in()` on an empty array is a query with no possible answer, so it is not
  // asked: an event with no parties has no assignments, and that is an EMPTY
  // state and not a failed one. Keeping the two apart here is the same rule the
  // rest of this page follows.
  const assignmentsQuery = partyList.length
    ? await serviceClient
        .from("party_assignments")
        .select("party_id, user_id, capability, granted_at")
        .in(
          "party_id",
          partyList.map((p) => p.id)
        )
        .is("revoked_at", null)
        .order("granted_at", { ascending: false })
    : { data: [], error: null };

  const assignmentsError = assignmentsQuery.error;

  // Who may be assigned at all — D-A, held by the interface as well as by the
  // database.
  //
  // The composite foreign key refuses a live assignment to a `member`
  // (`23503`), so offering one here would produce a refusal the interface could
  // have avoided. The filter is the affordance; the foreign key is the boundary,
  // and the two are not the same thing: a Server Action is a public endpoint,
  // and `assignToParty` returns `assignee_not_staff` for a request that goes
  // round this list.
  const { data: roster, error: rosterError } = await serviceClient
    .from("profiles")
    .select("id, full_name, membership_code, role")
    .in("role", ["master", "organizer", "staff"])
    .order("full_name", { ascending: true });

  // ── One outcome for the whole load, decided by position ────────────────────
  //
  // Three reads, one verdict: if ANY of them failed, the page cannot honestly
  // draw a roster, because a partial answer here reads exactly like a complete
  // one. The category is logged with the code alone — never the field that
  // carries the failing row.
  const lookupFailed = partiesError ?? assignmentsError ?? rosterError ?? null;

  if (lookupFailed) {
    console.error(
      `[assignments.lookup_failed] could not read the assignments of ` +
        `${eventId}: ${lookupFailed.code ?? "unknown"}. This is NOT an empty ` +
        `list — nobody may be treated as unassigned on the strength of it.`
    );
  }

  const liveAssignments = (assignmentsQuery.data ?? []) as LiveAssignment[];
  const rosterList = (roster ?? []) as RosterEntry[];

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/organizer/events"
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Events
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">Who works</h1>
        <p className="text-sm text-muted mt-1">{event.title}</p>
      </header>

      <div className="px-6">
        {lookupFailed ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
            <p className="text-sm font-semibold text-red-400">
              The assignments could not be loaded.
            </p>
            <p className="mt-2 text-sm text-foreground">
              This is <strong>not</strong> an empty roster — the read failed. Do
              not assume a night is uncovered, and do not assign over somebody
              on the strength of this screen.
            </p>
            <p className="mt-3 text-xs text-muted">
              Reload the page. If it fails again, report this code:{" "}
              <code>{lookupFailed.code ?? "unknown"}</code>
            </p>
          </div>
        ) : (
          <AssignmentsClient
            eventId={eventId}
            parties={partyList}
            assignments={liveAssignments}
            roster={rosterList}
          />
        )}
      </div>

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
