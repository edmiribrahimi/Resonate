import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import RevenueCard from "@/components/analytics/RevenueCard";
import AttendanceCard from "@/components/analytics/AttendanceCard";
import TokenLifecycleCard from "@/components/analytics/TokenLifecycleCard";
import TicketVelocityChart from "@/components/analytics/TicketVelocityChart";
import DrinkSalesBreakdown from "@/components/analytics/DrinkSalesBreakdown";
import {
  fetchEventRevenue,
  fetchDailyVelocity,
  fetchDrinkSales,
  fetchAttendanceRate,
  fetchTokenLifecycle,
} from "@/lib/analytics/event-queries";
import type { UserRole, UserStatus } from "@/types/database";

export default async function OrganizerAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;
  const userId = headersList.get("x-user-id") || "";

  // Defense in depth: verify organizer or master access
  if (role !== "organizer" && role !== "master") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch event (includes created_by for ownership check)
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/organizer/events");
  }

  // Verify ownership (organizer owns event OR user is master)
  if (role === "organizer" && event.created_by !== userId) {
    redirect("/organizer/events");
  }

  // Fetch all analytics data in parallel
  const [revenue, velocity, drinkSales, attendance, lifecycle] =
    await Promise.all([
      fetchEventRevenue(supabase, eventId),
      fetchDailyVelocity(supabase, eventId),
      fetchDrinkSales(supabase, eventId),
      fetchAttendanceRate(supabase, eventId),
      fetchTokenLifecycle(supabase, eventId),
    ]);

  return (
    <div className="min-h-dvh pb-24">
      <AnimatedSection>
        <header className="px-6 pt-12 pb-6">
          <Link
            href="/organizer/events"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            &larr; Back to Events
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted">{event.title}</p>
        </header>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <div className="px-6 space-y-6">
          {/* Revenue summary -- full width */}
          <RevenueCard revenue={revenue} />

          {/* Attendance + Token lifecycle -- two columns on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AttendanceCard attendance={attendance} />
            <TokenLifecycleCard lifecycle={lifecycle} />
          </div>

          {/* Ticket velocity chart */}
          <div className="rounded-2xl border border-card-border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
              Ticket Sales
            </h2>
            <TicketVelocityChart data={velocity} />
          </div>

          {/* Drink sales breakdown */}
          <div className="rounded-2xl border border-card-border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
              Drink Sales
            </h2>
            <DrinkSalesBreakdown drinks={drinkSales} />
          </div>
        </div>
      </AnimatedSection>

      <MobileNav role={role} status={status} />
    </div>
  );
}
