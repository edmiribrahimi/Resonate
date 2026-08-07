import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import GuestListClient from "./GuestListClient";
import GuestListUnavailable from "@/components/guest-list/GuestListUnavailable";
import type { UserRole, UserStatus, GuestListEntry } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GuestListPage({ params }: PageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
  const ctx = await getAccessContext();

  // `MobileNav` is a `"use client"` component that still takes role and status as
  // props; phase 34 (STAFF-03) converts it. No decision on this page reads them.
  const navRole = ctx.role as UserRole | null;
  const navStatus = ctx.status as UserStatus | null;

  // Defense in depth: may this person reach the organizer area at all.
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch event
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
  // On this page the check carries more than an interface decision. The guest
  // entries below are read with the **service-role client**, which bypasses every
  // row-level policy (`access-gating.md`, gate *service role*). On that read there
  // is no second boundary: this `if` is the only thing scoping the query to an
  // event the caller may see. The client is retained unchanged by this conversion
  // — swapping it for the cookie client would be a behaviour change wearing a
  // refactor's clothes — and the statement is recorded here because `meta-gates.md`
  // requires it in writing rather than as a commit-message aside.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/organizer/events");
  }

  const serviceClient = getServiceClient();

  // Fetch guest list entries.
  //
  // ⚠️ `error` is read, and it is NOT collapsed into `entries ?? []` (CR-02).
  // `[]` is a valid answer on this read — "this event has no guests" — so a
  // transient failure that fell through to `?? []` rendered as an empty list,
  // and this repository has no error tracking to contradict it. At 01:40 at the
  // door that screen turns away a guest who IS on the list, and
  // `checkin-offline.md` names the false refusal as the worse of the two
  // failures. The outcome below is decided by POSITION — `error` truthy or not —
  // never by inspecting a message.
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
          href="/organizer/events"
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

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
