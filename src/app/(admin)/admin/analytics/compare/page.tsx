import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import StaffNav from "@/components/staff/StaffNav";
import EventSelector from "@/components/analytics/EventSelector";
import EventComparisonChart from "@/components/analytics/EventComparisonChart";
import {
  fetchEventComparison,
  fetchAllEvents,
} from "@/lib/analytics/comparison-queries";
import type { UserRole, UserStatus } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ events?: string; mode?: string }>;
}

export default async function AdminEventComparisonPage({
  searchParams,
}: PageProps) {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  // Defense in depth: verify master access
  if (role !== "master") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const selectedIds =
    params.events?.split(",").filter(Boolean) ?? [];
  const mode: "absolute" | "per-attendee" =
    params.mode === "absolute" ? "absolute" : "per-attendee";

  const supabase = await createClient();

  // Fetch all events for the selector
  const allEvents = await fetchAllEvents(supabase);

  // Fetch comparison data if 2+ events selected
  const comparisonData =
    selectedIds.length >= 2
      ? await fetchEventComparison(supabase, selectedIds)
      : [];

  // Build search params string preserving events for mode toggle
  const eventsParam = selectedIds.length > 0 ? `events=${selectedIds.join(",")}` : "";
  const perAttendeeHref = `/admin/analytics/compare${eventsParam ? `?${eventsParam}&mode=per-attendee` : ""}`;
  const absoluteHref = `/admin/analytics/compare${eventsParam ? `?${eventsParam}&mode=absolute` : "?mode=absolute"}`;

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
            Event Comparison
          </h1>
        </header>
      </AnimatedSection>

      <StaffNav role={role} context="admin" />

      <AnimatedSection delay={0.1}>
        <div className="px-6 space-y-6">
          {/* Event selector */}
          <EventSelector
            events={allEvents}
            selectedIds={selectedIds}
            maxSelection={4}
          />

          {/* Mode toggle */}
          <div className="flex gap-2">
            <Link
              href={perAttendeeHref}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "per-attendee"
                  ? "bg-accent text-white"
                  : "bg-card-border/30 text-muted hover:text-foreground"
              }`}
            >
              Per Attendee
            </Link>
            <Link
              href={absoluteHref}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "absolute"
                  ? "bg-accent text-white"
                  : "bg-card-border/30 text-muted hover:text-foreground"
              }`}
            >
              Absolute
            </Link>
          </div>

          {/* Comparison chart or empty state */}
          {selectedIds.length >= 2 ? (
            <EventComparisonChart data={comparisonData} mode={mode} />
          ) : (
            <div className="rounded-2xl border border-card-border bg-card p-8">
              <p className="text-center text-sm text-muted/60">
                Select at least 2 events to compare
              </p>
            </div>
          )}
        </div>
      </AnimatedSection>

      <MobileNav role={role} status={status} />
    </div>
  );
}
