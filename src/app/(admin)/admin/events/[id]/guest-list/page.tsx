import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import GuestListClient from "@/app/(organizer)/organizer/events/[id]/guest-list/GuestListClient";
import type { UserRole, UserStatus, GuestListEntry } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminGuestListPage({ params }: PageProps) {
  const { id: eventId } = await params;

  const {
    capabilities,
    role: rawRole,
    status: rawStatus,
  } = await getAccessContext();

  // Reachability, decided from the session rather than from a request header.
  //
  // This page reads `guest_list_entries` through `getServiceClient()` (below),
  // which bypasses every row-level policy. On that path THE CODE IS THE ONLY
  // BOUNDARY: there is no RLS behind a service-role read, so this line is not
  // defence in depth, it is the defence. It does NOT substitute for RLS
  // anywhere else; here there is no RLS to substitute for. A guest-list entry
  // is an unpaid admission, so the list of who holds one is exactly the sort of
  // thing that must not widen by accident.
  //
  // What changed: the branch leading to that read used to be selected by a
  // value the client puts in a header. It is now selected by an answer Postgres
  // computed from the caller's own verified JWT. The service client itself is
  // unchanged.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  // role/status still flow to <MobileNav> as props: the source changed, the
  // consumer did not. Nothing here branches on them. Phase 34 (STAFF-03) owns
  // converting the nav to capabilities.
  const role = rawRole as UserRole | null;
  const status = rawStatus as UserStatus | null;

  const supabase = await createClient();

  // Fetch event (no ownership check -- master sees all)
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/admin/events");
  }

  const serviceClient = getServiceClient();

  // Fetch guest list entries
  const { data: entries } = await serviceClient
    .from("guest_list_entries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

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
        <GuestListClient
          entries={guestEntries}
          parties={partyList}
          eventId={eventId}
        />
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
