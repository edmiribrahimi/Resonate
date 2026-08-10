import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import GuestListClient from "@/app/(admin)/admin/events/[id]/guest-list/GuestListClient";
import GuestListUnavailable from "@/components/guest-list/GuestListUnavailable";
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

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/admin/events"
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Events
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">Guest List</h1>
        <p className="text-sm text-muted mt-1">{event.title}</p>
      </header>

      <div className="px-6">
        {entriesError ? (
          <GuestListUnavailable code={entriesError.code ?? "unknown"} />
        ) : (
          <GuestListClient
            entries={guestEntries}
            parties={partyList}
            eventId={eventId}
          />
        )}
      </div>
    </div>
  );
}
