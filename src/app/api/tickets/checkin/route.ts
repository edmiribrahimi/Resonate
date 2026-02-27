import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { verifyTicketToken } from "@/utils/qr";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ valid: false, status: "invalid_token" });
    }

    // Verify HMAC signature
    const ticketId = verifyTicketToken(token);
    if (!ticketId) {
      return NextResponse.json({ valid: false, status: "invalid_signature" });
    }

    const serviceClient = getServiceClient();

    // Fetch ticket with joins
    const { data: ticket } = await serviceClient
      .from("tickets")
      .select(
        "id, checked_in, event_id, party_id, user_id, profiles(full_name), events(title), event_parties(title)"
      )
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ valid: false, status: "not_found" });
    }

    if (ticket.checked_in) {
      const memberProfile = ticket.profiles as unknown as { full_name: string } | null;
      return NextResponse.json({
        valid: false,
        status: "already_checked_in",
        member_name: memberProfile?.full_name || "Unknown",
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

    return NextResponse.json({
      valid: true,
      status: "checked_in",
      member_name: memberProfile?.full_name || "Unknown",
      event_title: event?.title || "",
      party_title: party?.title || "",
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { valid: false, status: "error" },
      { status: 500 }
    );
  }
}
