import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import StaffNav from "@/components/staff/StaffNav";
import KPIDashboard from "@/components/analytics/KPIDashboard";
import RecentActivityFeed from "@/components/analytics/RecentActivityFeed";
import { fetchKPIDashboard } from "@/lib/analytics/dashboard-queries";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminAnalyticsOverviewPage() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  // Defense in depth: verify master access
  if (role !== "master") {
    redirect("/dashboard");
  }

  const dashboard = await fetchKPIDashboard();

  return (
    <div className="min-h-dvh pb-24">
      <AnimatedSection>
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted">Overview</p>
        </header>
      </AnimatedSection>

      <StaffNav role={role} context="admin" />

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

      <MobileNav role={role} status={status} />
    </div>
  );
}
