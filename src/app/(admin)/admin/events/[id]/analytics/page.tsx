import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import RevenueCard from "@/components/analytics/RevenueCard";
import AttendanceCard from "@/components/analytics/AttendanceCard";
import TokenLifecycleCard from "@/components/analytics/TokenLifecycleCard";
import TicketVelocityChart from "@/components/analytics/TicketVelocityChart";
import DrinkSalesBreakdown from "@/components/analytics/DrinkSalesBreakdown";
import DrinkPopularityChart from "@/components/analytics/DrinkPopularityChart";
import MarketInsightsCard from "@/components/analytics/MarketInsightsCard";
import PurchaseFunnelChart from "@/components/analytics/PurchaseFunnelChart";
import {
  fetchEventRevenue,
  fetchDailyVelocity,
  fetchDrinkSales,
  fetchAttendanceRate,
  fetchTokenLifecycle,
  fetchMarketInsights,
  fetchPurchaseFunnel,
} from "@/lib/analytics/event-queries";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  const {
    capabilities,
    role: rawRole,
    status: rawStatus,
  } = await getAccessContext();

  // Reachability, decided from the session rather than from a request header.
  // Defence in depth behind the middleware's `/admin/*` rule — and neither is
  // a substitute for RLS, which is what actually bounds these reads.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
    redirect("/dashboard");
  }

  // role/status still flow to <MobileNav> as props: the source changed, the
  // consumer did not. Nothing here branches on them. Phase 34 (STAFF-03) owns
  // converting the nav to capabilities.
  const role = rawRole as UserRole | null;
  const status = rawStatus as UserStatus | null;

  const supabase = await createClient();

  // Fetch event (no ownership check -- master sees all)
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    redirect("/admin/events");
  }

  // Fetch all analytics data in parallel
  const [revenue, velocity, drinkSales, attendance, lifecycle, marketInsights, purchaseFunnel] =
    await Promise.all([
      fetchEventRevenue(supabase, eventId),
      fetchDailyVelocity(supabase, eventId),
      fetchDrinkSales(supabase, eventId),
      fetchAttendanceRate(supabase, eventId),
      fetchTokenLifecycle(supabase, eventId),
      fetchMarketInsights(supabase, eventId),
      fetchPurchaseFunnel(supabase, eventId),
    ]);

  return (
    <div className="min-h-dvh pb-24">
      <AnimatedSection>
        <header className="px-6 pt-12 pb-6">
          <Link
            href="/admin/events"
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

          {/* Drink popularity ranking */}
          <div className="rounded-2xl border border-card-border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
              Drink Popularity
            </h2>
            <DrinkPopularityChart drinks={drinkSales} />
          </div>

          {/* Market insights */}
          <MarketInsightsCard insights={marketInsights} />

          {/* Purchase funnel */}
          <div className="rounded-2xl border border-card-border bg-card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
              Purchase Funnel
            </h2>
            <PurchaseFunnelChart data={purchaseFunnel} />
          </div>
        </div>
      </AnimatedSection>

      <MobileNav role={role} status={status} />
    </div>
  );
}
