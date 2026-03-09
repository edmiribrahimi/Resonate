import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import StaffNav from "@/components/staff/StaffNav";
import MemberSpendTable from "@/components/analytics/MemberSpendTable";
import RepeatAttendeeCard from "@/components/analytics/RepeatAttendeeCard";
import ReferralChainTable from "@/components/analytics/ReferralChainTable";
import GuestConversionCard from "@/components/analytics/GuestConversionCard";
import {
  fetchMemberSpendProfiles,
  fetchRepeatAttendeeRate,
  fetchReferralChains,
  fetchGuestConversion,
} from "@/lib/analytics/cross-event-queries";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminMemberInsightsPage() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  // Defense in depth: verify master access
  if (role !== "master") {
    redirect("/dashboard");
  }

  // Fetch all cross-event member data in parallel
  const [members, repeatData, chains, conversion] = await Promise.all([
    fetchMemberSpendProfiles(),
    fetchRepeatAttendeeRate(),
    fetchReferralChains(),
    fetchGuestConversion(),
  ]);

  return (
    <div className="min-h-dvh pb-24">
      <AnimatedSection>
        <header className="px-6 pt-12 pb-6">
          <Link
            href="/admin/analytics"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            &larr; Back to Analytics
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Member Insights
          </h1>
        </header>
      </AnimatedSection>

      <StaffNav role={role} context="admin" />

      <AnimatedSection delay={0.1}>
        <div className="px-6 space-y-6">
          {/* KPI cards: repeat attendees + guest conversions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <RepeatAttendeeCard data={repeatData} />
            <GuestConversionCard data={conversion} />
          </div>

          {/* Top Spenders section */}
          <div className="rounded-2xl border border-card-border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
              Top Spenders
            </h2>
            <MemberSpendTable members={members} />
          </div>

          {/* Referral Effectiveness section */}
          <div className="rounded-2xl border border-card-border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
              Referral Effectiveness
            </h2>
            <ReferralChainTable chains={chains} />
          </div>
        </div>
      </AnimatedSection>

      <MobileNav role={role} status={status} />
    </div>
  );
}
