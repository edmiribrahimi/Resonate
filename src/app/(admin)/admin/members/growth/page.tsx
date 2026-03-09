import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import StaffNav from "@/components/staff/StaffNav";
import MemberGrowthChart from "@/components/analytics/MemberGrowthChart";
import GrowthSummaryCard from "@/components/analytics/GrowthSummaryCard";
import { fetchMemberGrowth } from "@/lib/analytics/member-queries";
import type { UserRole, UserStatus } from "@/types/database";

export default async function MemberGrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ granularity?: string }>;
}) {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  if (role !== "master") {
    redirect("/dashboard");
  }

  const { granularity: granularityParam } = await searchParams;
  const granularity: "weekly" | "monthly" =
    granularityParam === "weekly" ? "weekly" : "monthly";

  const supabase = await createClient();
  const { data, summary } = await fetchMemberGrowth(supabase, granularity);

  return (
    <div className="min-h-dvh pb-24">
      <AnimatedSection>
        <header className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        </header>
      </AnimatedSection>

      <StaffNav role={role} context="admin" />

      <AnimatedSection delay={0.1} className="px-6 space-y-4">
        {/* Granularity toggle */}
        <div className="flex gap-2">
          <Link
            href="/admin/members/growth?granularity=weekly"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              granularity === "weekly"
                ? "bg-accent text-white"
                : "bg-card border border-card-border text-muted hover:text-foreground"
            }`}
          >
            Weekly
          </Link>
          <Link
            href="/admin/members/growth?granularity=monthly"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              granularity === "monthly"
                ? "bg-accent text-white"
                : "bg-card border border-card-border text-muted hover:text-foreground"
            }`}
          >
            Monthly
          </Link>
        </div>

        <GrowthSummaryCard summary={summary} />

        {/* Chart container */}
        <div className="rounded-2xl border border-card-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Member Growth</h2>
          <MemberGrowthChart data={data} />
        </div>
      </AnimatedSection>

      <MobileNav role={role} status={status} />
    </div>
  );
}
