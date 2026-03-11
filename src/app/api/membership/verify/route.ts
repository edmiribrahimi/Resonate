import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

// GET — backward compatible: membership card view uses this
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ valid: false, error: "No code provided" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, membership_code")
    .eq("membership_code", code)
    .single();

  if (!profile) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    member_name: profile.full_name,
    membership_code: profile.membership_code,
  });
}

// POST — door check-in: verify member + record attendance for selected party
export async function POST(request: Request) {
  try {
    // Verify authenticated user with admin/organizer role
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { valid: false, status: "unauthorized" },
        { status: 401 }
      );
    }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !userProfile ||
      (userProfile.role !== "master" && userProfile.role !== "organizer")
    ) {
      return NextResponse.json(
        { valid: false, status: "forbidden" },
        { status: 403 }
      );
    }

    let body: { code?: string; partyId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { valid: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { code, partyId } = body;

    if (!code || !partyId) {
      return NextResponse.json(
        { valid: false, error: "code and partyId are required" },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    // Look up member by membership_code
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("id, full_name, membership_code")
      .eq("membership_code", code)
      .single();

    if (!profile) {
      return NextResponse.json({ valid: false, status: "not_found" });
    }

    // Resolve event_id from event_parties
    const { data: party } = await serviceClient
      .from("event_parties")
      .select("event_id")
      .eq("id", partyId)
      .single();

    if (!party) {
      return NextResponse.json(
        { valid: false, error: "Party not found" },
        { status: 404 }
      );
    }

    // INSERT attendance with ON CONFLICT DO NOTHING
    const { data: attendance, error: insertError } = await serviceClient
      .from("attendances")
      .insert({
        event_id: party.event_id,
        user_id: profile.id,
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      // Unique constraint violation (already checked in)
      if (insertError.code === "23505") {
        // Fetch existing attendance to get checked_in_at
        const { data: existing } = await serviceClient
          .from("attendances")
          .select("id, checked_in_at")
          .eq("event_id", party.event_id)
          .eq("user_id", profile.id)
          .single();

        return NextResponse.json({
          valid: true,
          status: "already_checked_in",
          member_name: profile.full_name,
          checked_in_at: existing?.checked_in_at || null,
        });
      }

      console.error("Attendance insert error:", insertError);
      return NextResponse.json(
        { valid: false, error: "Failed to record attendance" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      valid: true,
      status: "checked_in",
      member_name: profile.full_name,
      membership_code: profile.membership_code,
      attendance_id: attendance.id,
    });
  } catch (error) {
    console.error("Membership verify error:", error);
    return NextResponse.json(
      { valid: false, status: "error" },
      { status: 500 }
    );
  }
}
