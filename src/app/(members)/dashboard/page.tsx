import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const fullName = user.user_metadata?.full_name || "Member";

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <p className="text-sm text-muted">Hey,</p>
        <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
      </header>

      <div className="flex flex-col gap-4 px-6">
        {/* Membership Card */}
        <Link href="/membership-card">
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-5 transition-colors hover:border-accent/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Membership Card</p>
                <p className="mt-1 text-lg font-semibold">View your card</p>
              </div>
              <span className="text-3xl">🎫</span>
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
              <span className="text-3xl">📊</span>
            </div>
          </div>
        </Link>

        {/* Upcoming RSVP */}
        <div className="rounded-2xl border border-card-border bg-card p-5">
          <p className="mb-3 text-sm text-muted">Upcoming confirmed events</p>
          <p className="text-sm text-muted/60">No confirmed events</p>
          <Link
            href="/events"
            className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-hover"
          >
            Discover events →
          </Link>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
