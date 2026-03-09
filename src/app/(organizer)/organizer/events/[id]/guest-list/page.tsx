import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import MobileNav from "@/components/layout/MobileNav";
import GuestListClient from "./GuestListClient";
import type { UserRole, UserStatus, GuestListEntry } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GuestListPage({ params }: PageProps) {
  const { id: eventId } = await params;

  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;
  const userId = headersList.get("x-user-id") || "";

  // Defense in depth: verify organizer or master access
  if (role !== "organizer" && role !== "master") {
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

  // Verify ownership (organizer owns event OR user is master)
  if (role === "organizer" && event.created_by !== userId) {
    redirect("/organizer/events");
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
          href="/organizer/events"
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
