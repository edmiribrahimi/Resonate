import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import GuestListClient from "@/app/(admin)/admin/events/[id]/guest-list/GuestListClient";
import GuestListUnavailable from "@/components/guest-list/GuestListUnavailable";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { FOCUS_RING } from "@/components/ui/Button";
import type { GuestListEntry } from "@/types/database";

/**
 * Who is on the list for one event — the collapsed surface.
 *
 * ── The door question, asked before the merge and answered here ──────────────
 *
 * **Neither version could do anything to a check-in that the other could not.**
 * Both mounted the same `GuestListClient` with the same three props —
 * `entries`, `parties`, `eventId` — and that component takes no role and no
 * capability, so its affordances cannot differ by page. What may be done to an
 * entry is decided inside `guest-list/actions.ts`, which this plan neither moves
 * nor edits (R-WORK-ROUTES): `addGuest` still writes `added_by: userId` from an
 * identity `assertStaffManage` + `assertEventOwnership` resolved, so the
 * attribution `community-membership.md` requires of every lane around the gate
 * is untouched.
 *
 * The only difference was **reachability**, and it is resolved towards the more
 * restrictive: see the two guards below.
 *
 * `GuestListClient.tsx` and `actions.ts` stay at
 * `src/app/(admin)/admin/events/[id]/guest-list/`, outside `(work)`, which is
 * why the import above is absolute.
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GuestListPage({ params }: PageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
  const ctx = await getAccessContext();

  // Defense in depth, and it stays (D-34-09): `/admin/events/[id]/guest-list` is
  // bound to `organizer.access` in `src/lib/routes/capability-routes.ts`, and
  // the middleware reads that same entry. The `/admin` twin asked `admin.access`
  // here; the organizer twin asked this. The map decides, not either page.
  //
  // The nav mount and the two role/status narrowings are gone —
  // `admin/(work)/layout.tsx` resolves once and draws both navs (D-34-07).
  // Neither is named in prose, so the sweep grep stays runnable (plan 34-03).
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // `created_by` is selected because the ownership check below needs it.
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/admin/events");
  }

  // Ownership — one call, never a re-inlined comparison.
  //
  // **Kept from the organizer twin because it is the more restrictive of the
  // two behaviours** (D-34-06). The `/admin` twin had no ownership check at all
  // ("master sees all"), and a master still passes here: `ownsOrIsMaster`
  // answers through its `master.manage` branch before the row is considered. An
  // organizer, who reached this content at the twin under exactly this
  // condition, keeps it. Nobody's verdict moved.
  //
  // The entries below are read with the **service-role client**, which bypasses
  // every row-level policy (`access-gating.md`, gate *service role*). On that
  // read there is no second boundary: this `if` is the only thing scoping the
  // query to an event the caller may see, and a guest-list entry is an unpaid
  // admission — exactly the sort of thing that must not widen by accident.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/admin/events");
  }

  const serviceClient = getServiceClient();

  // Fetch guest list entries.
  //
  // ⚠️ `error` is read, and it is NOT collapsed into `entries ?? []` (CR-02).
  // `[]` is a valid answer on this read — "this event has no guests" — so a
  // transient failure that fell through to `?? []` rendered as an empty list,
  // and this repository has no error tracking to contradict it. At the door that
  // screen turns away a guest who IS on the list, and `checkin-offline.md` names
  // the false refusal as the worse of the two failures. The outcome below is
  // decided by POSITION — `error` truthy or not — never by inspecting a message.
  const { data: entries, error: entriesError } = await serviceClient
    .from("guest_list_entries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (entriesError) {
    console.error(
      `[guest_list.lookup_failed] could not read guest_list_entries for ` +
        `${eventId}: ${entriesError.code ?? "unknown"}. This is NOT an empty list.`
    );
  }

  // Fetch event parties for the party selector dropdown
  const { data: parties } = await supabase
    .from("event_parties")
    .select("id, title")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  const guestEntries = (entries ?? []) as GuestListEntry[];
  const partyList = (parties ?? []) as { id: string; title: string }[];

  // `wide` — `/admin/events/[id]/guest-list` is NAMED on §4's closed wide list,
  // so the width is checkable rather than chosen: a reader verifies it against
  // that list instead of agreeing with a judgement made here. It is on the list
  // for the reason the list exists — the surface's primary object is a dense
  // roster of rows, and at 1440px it should stop widening at 1280 rather than
  // running edge to edge.
  //
  // The shell owns the maximum, the gutter, the vertical rhythm and the
  // navigation clearance in both tiers, so this page writes none of them.
  return (
    <PageShell width="wide">
      <header className="mb-6">
        {/*
          Still a `Link` and not the button ladder's anchor branch: this is
          navigation inside the app, and `next/link` is what keeps the client
          transition and the prefetch. What it gains is the 44px floor of §6.1
          and the one focus expression — imported from the button ladder, never
          re-spelled (§5.4).
        */}
        <Link
          href="/admin/events"
          className={`inline-flex min-h-11 items-center text-xs text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
        >
          &larr; Back to Events
        </Link>
        <PageTitle>Guest List</PageTitle>
        <p className="mt-1 text-sm text-muted">{event.title}</p>
      </header>

      {entriesError ? (
        <GuestListUnavailable code={entriesError.code ?? "unknown"} />
      ) : (
        <GuestListClient
          entries={guestEntries}
          parties={partyList}
          eventId={eventId}
        />
      )}
    </PageShell>
  );
}
