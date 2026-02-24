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
      // Check if user should be promoted to master
      const masterEmail = process.env.MASTER_EMAIL;
      if (masterEmail) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && user.email === masterEmail) {
          // Use service role client for master promotion to bypass RLS
          // (user's own session cannot modify their role via profiles_update_own policy)
          const serviceClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          await serviceClient
            .from("profiles")
            .update({ role: "master", status: "approved" })
            .eq("id", user.id);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
