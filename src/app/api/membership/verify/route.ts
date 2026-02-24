import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ valid: false, error: "No code provided" }, { status: 400 });
  }

  const supabase = await createClient();

  // TODO: query profiles table for membership_code
  // For now, return a mock response
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, membership_code")
    .eq("membership_code", code)
    .single();

  if (!profile) {
    return NextResponse.json({ valid: false });
  }

  // Register attendance for current event
  // TODO: determine current event automatically or pass event_id

  return NextResponse.json({
    valid: true,
    member_name: profile.full_name,
    membership_code: profile.membership_code,
  });
}
