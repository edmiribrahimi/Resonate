import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

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
        }

        // Auto-subscribe to newsletter (fire-and-forget)
        if (user.email && process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          resend.contacts.create({
            email: user.email,
            audienceId: process.env.RESEND_AUDIENCE_ID,
          }).catch(() => {});
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
