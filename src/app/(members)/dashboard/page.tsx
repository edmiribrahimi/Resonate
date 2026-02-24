import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import CopyReferralLink from "@/components/membership/CopyReferralLink";
import type { UserRole, UserStatus } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const fullName = user.user_metadata?.full_name || "Member";

  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_code")
    .eq("id", user.id)
    .single();

  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  const isPendingOrRejected = status === "pending" || status === "rejected";

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <p className="text-sm text-muted">Hey,</p>
        <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
      </header>

      <div className="flex flex-col gap-4 px-6">
        {isPendingOrRejected ? (
          <>
            {/* Pending / Rejected state */}
            <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-6">
              <p className="text-lg font-semibold">
                {status === "pending"
                  ? "Your account is pending approval"
                  : "Your account has been reviewed"}
              </p>
              <p className="mt-2 text-sm text-muted">
                You can browse events while you wait. Once approved, you&apos;ll
                have full access to membership features.
              </p>
            </div>

            {/* Discover events link */}
            <div className="rounded-2xl border border-card-border bg-card p-5">
              <p className="mb-3 text-sm text-muted">
                Explore what&apos;s coming up
              </p>
              <Link
                href="/events"
                className="inline-block text-sm font-medium text-accent hover:text-accent-hover"
              >
                Discover events →
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Membership Card */}
            <Link href="/membership-card">
              <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-5 transition-colors hover:border-accent/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted">Membership Card</p>
                    <p className="mt-1 text-lg font-semibold">View your card</p>
                  </div>
                  <span className="text-3xl">&#127915;</span>
                </div>
              </div>
            </Link>

            {/* Attendance */}
            <Link href="/attendance">
              <div className="rounded-2xl border border-card-border bg-card p-5 transition-colors hover:border-accent/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted">Your attendance</p>
                    <p className="mt-1 text-lg font-semibold">Event history</p>
                  </div>
                  <span className="text-3xl">&#128202;</span>
                </div>
              </div>
            </Link>

            {/* Referral Link */}
            {profile?.membership_code && (
              <CopyReferralLink membershipCode={profile.membership_code} />
            )}

            {/* Upcoming RSVP */}
            <div className="rounded-2xl border border-card-border bg-card p-5">
              <p className="mb-3 text-sm text-muted">
                Upcoming confirmed events
              </p>
              <p className="text-sm text-muted/60">No confirmed events</p>
              <Link
                href="/events"
                className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-hover"
              >
                Discover events →
              </Link>
            </div>
          </>
        )}
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
