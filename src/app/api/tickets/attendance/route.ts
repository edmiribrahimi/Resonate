import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getPostHogServer } from "@/lib/posthog/server";

async function verifyOrganizerRole() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "master" && profile.role !== "organizer")) {
    return { error: "Forbidden", status: 403 };
  }

  return { user, profile };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().toLowerCase() || "";

  const auth = await verifyOrganizerRole();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const serviceClient = getServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch current and upcoming parties (today + future) with their events
  const { data: parties } = await serviceClient
    .from("event_parties")
    .select("id, title, date, time, event_id, events(title)")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (!parties || parties.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const results = await Promise.all(
    parties.map(async (party) => {
      const event = party.events as unknown as { title: string };

      // Count total tickets for this party
      const { count: totalTickets } = await serviceClient
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("party_id", party.id);

      // Count checked-in tickets
      const { count: checkedIn } = await serviceClient
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("party_id", party.id)
        .eq("checked_in", true);

      // Fetch all ticket-based attendees for this party (no profiles join - ambiguous FK)
      const { data: attendeesData } = await serviceClient
        .from("tickets")
        .select("id, checked_in, checked_in_at, user_id")
        .eq("party_id", party.id)
        .order("checked_in", { ascending: true })
        .order("created_at", { ascending: true });

      // Fetch profiles separately for ticket holders
      const userIds = [...new Set((attendeesData ?? []).map((t) => t.user_id).filter(Boolean))] as string[];
      const profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await serviceClient
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        for (const p of profiles ?? []) {
          profileMap.set(p.id, p.full_name ?? "Unknown");
        }
      }

      const ticketAttendees = (attendeesData ?? []).map((t) => ({
        ticketId: t.id as string,
        guestListEntryId: null as string | null,
        name: profileMap.get(t.user_id as string) ?? "Unknown",
        checkedIn: t.checked_in as boolean,
        checkedInAt: t.checked_in_at as string | null,
        isGuestList: false,
        hasEmail: true,
      }));

      // Fetch guest list entries without tickets (name-only check-in)
      const { data: guestListEntries } = await serviceClient
        .from("guest_list_entries")
        .select("id, first_name, last_name, status, email")
        .eq("event_id", party.event_id)
        .or(`party_id.eq.${party.id},party_id.is.null`)
        .is("ticket_id", null)
        .not("status", "eq", "failed");

      const guestListAttendees = (guestListEntries ?? []).map((g) => ({
        ticketId: null as string | null,
        guestListEntryId: g.id as string,
        name: `${g.first_name} ${g.last_name}`,
        checkedIn: g.status === "checked_in",
        checkedInAt: null as string | null,
        isGuestList: true,
        hasEmail: !!g.email,
      }));

      // Combine all attendees
      const allAttendees = [...ticketAttendees, ...guestListAttendees];

      // Apply search filter to both types
      const filteredAttendees = search
        ? allAttendees.filter((a) => a.name.toLowerCase().includes(search))
        : allAttendees;

      // Sort: unchecked first, then alphabetical
      filteredAttendees.sort((a, b) => {
        if (a.checkedIn !== b.checkedIn) return a.checkedIn ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

      return {
        partyId: party.id,
        partyTitle: party.title,
        eventTitle: event.title,
        date: party.date,
        time: party.time,
        totalTickets: totalTickets ?? 0,
        guestListCount: guestListAttendees.length,
        checkedIn: checkedIn ?? 0,
        recentCheckins: ticketAttendees
          .filter((a) => a.checkedIn && a.checkedInAt)
          .sort((a, b) => new Date(b.checkedInAt!).getTime() - new Date(a.checkedInAt!).getTime())
          .slice(0, 10)
          .map((a) => ({ name: a.name, time: a.checkedInAt })),
        attendees: filteredAttendees,
      };
    })
  );

  return NextResponse.json({ events: results });
}

/**
 * POST handler for guest-list name-based check-in.
 * Updates guest_list_entries status to 'checked_in'.
 */
export async function POST(request: Request) {
  const auth = await verifyOrganizerRole();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  let body: { guestListEntryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { guestListEntryId } = body;
  if (!guestListEntryId) {
    return NextResponse.json(
      { error: "guestListEntryId is required" },
      { status: 400 }
    );
  }

  const serviceClient = getServiceClient();

  // Verify the entry exists and is not already checked in
  const { data: entry, error: fetchError } = await serviceClient
    .from("guest_list_entries")
    .select("id, status")
    .eq("id", guestListEntryId)
    .single();

  if (fetchError || !entry) {
    return NextResponse.json(
      { error: "Guest list entry not found" },
      { status: 404 }
    );
  }

  if (entry.status === "checked_in") {
    return NextResponse.json(
      { error: "Guest already checked in", alreadyCheckedIn: true },
      { status: 409 }
    );
  }

  // Update status to checked_in
  const { error: updateError } = await serviceClient
    .from("guest_list_entries")
    .update({
      status: "checked_in",
      updated_at: new Date().toISOString(),
    })
    .eq("id", guestListEntryId);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to check in guest" },
      { status: 500 }
    );
  }

  const posthog = getPostHogServer();
  posthog.capture({
    distinctId: auth.user.id,
    event: "guest_list_checkin",
    properties: {
      guest_list_entry_id: guestListEntryId,
    },
  });

  return NextResponse.json({ success: true });
}
