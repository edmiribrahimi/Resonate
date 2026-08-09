import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import StaffNav from "@/components/staff/StaffNav";
import KPIDashboard from "@/components/analytics/KPIDashboard";
import RecentActivityFeed from "@/components/analytics/RecentActivityFeed";
import { fetchKPIDashboard } from "@/lib/analytics/dashboard-queries";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminAnalyticsOverviewPage() {
  const { capabilities, role, status } = await getAccessContext();

  // Defense in depth behind the middleware — and now the SAME question the
  // middleware asks for `/admin/*`, of the same authority, instead of a role
  // read out of a request header. Never a role list: a fourth role arrives in
  // phase 34 and a capability question is fourth-role-safe by construction.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  // The nav components are typed to the `UserRole` / `UserStatus` unions; the
  // resolver answers `string | null`. Narrowing here is the same cast the
  // header read already made, from a better source — `profiles`, whose columns
  // carry those unions, not an attacker-controllable header. Phase 34
  // (STAFF-03) owns these props and removes this.
  const navRole = role as UserRole | null;
  const navStatus = status as UserStatus | null;

  const dashboard = await fetchKPIDashboard();

  return (
    <div className="min-h-dvh pb-24">
      <AnimatedSection>
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted">Overview</p>
        </header>
      </AnimatedSection>

      <StaffNav capabilities={[...capabilities]} />

      <AnimatedSection delay={0.1}>
        <div className="px-6 space-y-6">
          {/* KPI cards */}
          <KPIDashboard
            totalRevenue={dashboard.totalRevenue}
            totalMembers={dashboard.totalMembers}
            upcomingEvents={dashboard.upcomingEvents}
          />

          {/* Navigation to sub-pages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/analytics/members"
              className="group flex items-center justify-between rounded-2xl border border-card-border bg-card p-4 transition-colors hover:border-accent/30"
            >
              <div>
                <p className="text-sm font-medium group-hover:text-foreground">
                  Member Insights
                </p>
                <p className="text-xs text-muted">
                  Growth trends and demographics
                </p>
              </div>
              <span className="text-muted group-hover:text-foreground transition-colors">
                &rarr;
              </span>
            </Link>
            <Link
              href="/admin/analytics/compare"
              className="group flex items-center justify-between rounded-2xl border border-card-border bg-card p-4 transition-colors hover:border-accent/30"
            >
              <div>
                <p className="text-sm font-medium group-hover:text-foreground">
                  Event Comparison
                </p>
                <p className="text-xs text-muted">
                  Compare metrics across events
                </p>
              </div>
              <span className="text-muted group-hover:text-foreground transition-colors">
                &rarr;
              </span>
            </Link>
          </div>

          {/* Recent activity feed */}
          <RecentActivityFeed activities={dashboard.recentActivity} />
        </div>
      </AnimatedSection>

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
