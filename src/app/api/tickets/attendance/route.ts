import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

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

  // Fetch today's parties with their events
  const { data: parties } = await serviceClient
    .from("event_parties")
    .select("id, title, date, time, event_id, events(title)")
    .eq("date", today);

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

      // Fetch recent check-ins (last 10)
      const { data: recentCheckins } = await serviceClient
        .from("tickets")
        .select("id, checked_in_at, profiles(full_name)")
        .eq("party_id", party.id)
        .eq("checked_in", true)
        .order("checked_in_at", { ascending: false })
        .limit(10);

      // Fetch all ticket-based attendees for this party
      const { data: attendeesData } = await serviceClient
        .from("tickets")
        .select("id, checked_in, checked_in_at, user_id, profiles(full_name)")
        .eq("party_id", party.id)
        .order("checked_in", { ascending: true })
        .order("created_at", { ascending: true });

      const ticketAttendees = (attendeesData ?? []).map((t) => ({
        ticketId: t.id as string,
        guestListEntryId: null as string | null,
        name:
          (t.profiles as unknown as { full_name: string })?.full_name ??
          "Unknown",
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
        time: party.time,
        totalTickets: totalTickets ?? 0,
        guestListCount: guestListAttendees.length,
        checkedIn: checkedIn ?? 0,
        recentCheckins: (recentCheckins ?? []).map((t) => ({
          name:
            (t.profiles as unknown as { full_name: string })?.full_name ??
            "Unknown",
          time: t.checked_in_at,
        })),
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

  return NextResponse.json({ success: true });
}
