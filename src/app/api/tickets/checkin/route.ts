import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { verifyTicketToken } from "@/utils/qr";

export async function POST(request: Request) {
  try {
    // Verify authenticated user with admin role
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ valid: false, status: "unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "master" && profile.role !== "organizer")) {
      return NextResponse.json({ valid: false, status: "forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { token, partyId, ticketId: directTicketId, offlineSync } = body;

    let ticketId: string | null = null;

    if (offlineSync && directTicketId) {
      // Offline sync: accept ticketId directly (no HMAC token available offline)
      ticketId = directTicketId;
    } else if (token && typeof token === "string") {
      // Normal flow: verify HMAC signature
      ticketId = verifyTicketToken(token);
      if (!ticketId) {
        return NextResponse.json({ valid: false, status: "invalid_signature" });
      }
    } else {
      return NextResponse.json({ valid: false, status: "invalid_token" });
    }

    const serviceClient = getServiceClient();

    // Fetch ticket with joins
    const { data: ticket } = await serviceClient
      .from("tickets")
      .select(
        "id, checked_in, checked_in_at, checked_in_by, event_id, party_id, user_id, ticket_type, profiles(full_name), events(title), event_parties(title), ticket_tiers(name)"
      )
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ valid: false, status: "not_found" });
    }

    // Cross-event validation: if partyId provided, check ticket belongs to that party
    if (partyId && ticket.party_id !== partyId) {
      const party = ticket.event_parties as unknown as { title: string } | null;
      const event = ticket.events as unknown as { title: string } | null;
      return NextResponse.json({
        valid: false,
        status: "wrong_event",
        member_name: (ticket.profiles as unknown as { full_name: string } | null)?.full_name || "Unknown",
        event_title: event?.title || "",
        party_title: party?.title || "",
        ticket_party_id: ticket.party_id,
        ticket_event_id: ticket.event_id,
      });
    }

    if (ticket.checked_in) {
      const memberProfile = ticket.profiles as unknown as { full_name: string } | null;
      const checkedInBy = (ticket as unknown as { checked_in_by: string | null }).checked_in_by;

      // Idempotent: if same user checked it in, return success (safe for offline sync replay)
      if (checkedInBy === user.id) {
        const event = ticket.events as unknown as { title: string } | null;
        const party = ticket.event_parties as unknown as { title: string } | null;
        const tier = ticket.ticket_tiers as unknown as { name: string } | null;
        return NextResponse.json({
          valid: true,
          status: "checked_in",
          member_name: memberProfile?.full_name || "Unknown",
          event_title: event?.title || "",
          party_title: party?.title || "",
          ticket_type: ticket.ticket_type || "purchased",
          tier_name: tier?.name || null,
          party_id: ticket.party_id,
          event_id: ticket.event_id,
          already_by_you: true,
        });
      }

      // Different user checked it in — return conflict
      return NextResponse.json({
        valid: false,
        status: "already_checked_in",
        member_name: memberProfile?.full_name || "Unknown",
        checked_in_at: ticket.checked_in_at,
        party_id: ticket.party_id,
        event_id: ticket.event_id,
      });
    }

    // Perform check-in
    await serviceClient
      .from("tickets")
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
      .eq("id", ticketId);

    const memberProfile = ticket.profiles as unknown as { full_name: string } | null;
    const event = ticket.events as unknown as { title: string } | null;
    const party = ticket.event_parties as unknown as { title: string } | null;
    const tier = ticket.ticket_tiers as unknown as { name: string } | null;

    return NextResponse.json({
      valid: true,
      status: "checked_in",
      member_name: memberProfile?.full_name || "Unknown",
      event_title: event?.title || "",
      party_title: party?.title || "",
      ticket_type: ticket.ticket_type || "purchased",
      tier_name: tier?.name || null,
      party_id: ticket.party_id,
      event_id: ticket.event_id,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { valid: false, status: "error" },
      { status: 500 }
    );
  }
}
