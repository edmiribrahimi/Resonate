import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "master" && profile.role !== "organizer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

      return {
        partyId: party.id,
        partyTitle: party.title,
        eventTitle: event.title,
        time: party.time,
        totalTickets: totalTickets ?? 0,
        checkedIn: checkedIn ?? 0,
        recentCheckins: (recentCheckins ?? []).map((t) => ({
          name: (t.profiles as unknown as { full_name: string })?.full_name ?? "Unknown",
          time: t.checked_in_at,
        })),
      };
    })
  );

  return NextResponse.json({ events: results });
}
