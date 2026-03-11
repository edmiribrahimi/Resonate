import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

/** GET — returns all active members (id, full_name, membership_code) for offline pre-caching.
 *  Protected: requires authenticated user with master or organizer role. */
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
  const { data: members, error } = await serviceClient
    .from("profiles")
    .select("id, full_name, membership_code")
    .not("membership_code", "is", null);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }

  return NextResponse.json({ members: members ?? [] });
}
