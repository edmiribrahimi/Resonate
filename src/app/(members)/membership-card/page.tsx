import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MembershipCardView from "@/components/membership/MembershipCardView";
import CopyReferralLink from "@/components/membership/CopyReferralLink";
import MobileNav from "@/components/layout/MobileNav";
import type { UserRole, UserStatus } from "@/types/database";

export default async function MembershipCardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  const fullName = user.user_metadata?.full_name || "Member";

  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_code, status")
    .eq("id", user.id)
    .single();

  const membershipCode = profile?.membership_code || "RSN-UNKNOWN";

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Membership Card</h1>
      </header>

      <div className="px-6">
        <MembershipCardView
          fullName={fullName}
          membershipCode={membershipCode}
          memberSince={user.created_at}
        />

        {profile?.status === "approved" && membershipCode !== "RSN-UNKNOWN" && (
          <div className="mt-6">
            <CopyReferralLink membershipCode={membershipCode} />
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-card-border bg-card p-5">
          <h2 className="mb-2 font-semibold">How to use your card</h2>
          <ol className="list-inside list-decimal text-sm text-muted leading-relaxed">
            <li>Show the QR code at the event entrance</li>
            <li>Staff will scan the code</li>
            <li>Your attendance will be recorded automatically</li>
          </ol>
        </div>

        <div className="mt-4">
          <button className="w-full rounded-full border border-card-border py-3 text-sm font-medium transition-all hover:bg-card active:scale-95 active:opacity-80">
            Add to Apple/Google Wallet
          </button>
        </div>
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
