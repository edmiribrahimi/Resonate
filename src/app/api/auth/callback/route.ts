import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const serviceClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if user should be promoted to master
        const masterEmail = process.env.MASTER_EMAIL;
        if (masterEmail && user.email === masterEmail) {
          await serviceClient
            .from("profiles")
            .update({ role: "master", status: "approved" })
            .eq("id", user.id);
        } else {
          // Auto-approve all new members on email confirmation
          await serviceClient
            .from("profiles")
            .update({ status: "approved" })
            .eq("id", user.id)
            .eq("status", "pending");
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
