import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import RevenueCard from "@/components/analytics/RevenueCard";
import AttendanceCard from "@/components/analytics/AttendanceCard";
import TokenLifecycleCard from "@/components/analytics/TokenLifecycleCard";
import TicketVelocityChart from "@/components/analytics/TicketVelocityChart";
import DrinkSalesBreakdown from "@/components/analytics/DrinkSalesBreakdown";
import MarketInsightsCard from "@/components/analytics/MarketInsightsCard";
import {
  fetchEventRevenue,
  fetchDailyVelocity,
  fetchDrinkSales,
  fetchAttendanceRate,
  fetchTokenLifecycle,
  fetchMarketInsights,
} from "@/lib/analytics/event-queries";
import type { UserRole, UserStatus } from "@/types/database";

export default async function OrganizerAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header. `my_access_context()`
  // answers about `auth.uid()` inside the JWT, so nothing a client can send
  // reaches the ownership decision below.
  const ctx = await getAccessContext();

  // `MobileNav` is a `"use client"` component that still takes role and status
  // as props; phase 34 (STAFF-03) converts it to capabilities and owns removing
  // these two fields. The cast is at this boundary on purpose — the context types
  // them honestly as `string | null` and no decision on this page reads them.
  const navRole = ctx.role as UserRole | null;
  const navStatus = ctx.status as UserStatus | null;

  // Defense in depth: may this person reach the organizer area at all.
  // Role only, status ignored — the same question `middleware.ts` asks.
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
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

  // Verify ownership — one call, never a re-inlined comparison. `ownsOrIsMaster`
  // answers master first (without reading the row), then refuses a null identity
  // and a row owned by nobody, and only then compares. Writing the inequality out
  // here would compare `null` against `null` on an unowned row and ADMIT — which
  // is why the expression is not spelled out even in this comment, the same
  // discipline `review/page.tsx` applies to the service client's name.
  if (!ownsOrIsMaster(ctx, event.created_by)) {
    redirect("/organizer/events");
  }

  // Fetch all analytics data in parallel
  const [revenue, velocity, drinkSales, attendance, lifecycle, marketInsights] =
    await Promise.all([
      fetchEventRevenue(supabase, eventId),
      fetchDailyVelocity(supabase, eventId),
      fetchDrinkSales(supabase, eventId),
      fetchAttendanceRate(supabase, eventId),
      fetchTokenLifecycle(supabase, eventId),
      fetchMarketInsights(supabase, eventId),
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

          {/* Market insights */}
          <MarketInsightsCard insights={marketInsights} />
        </div>
      </AnimatedSection>

      <MobileNav role={navRole} status={navStatus} />
    </div>
  );
}
