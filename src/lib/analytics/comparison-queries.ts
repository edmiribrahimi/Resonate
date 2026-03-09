import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchEventRevenue,
  fetchAttendanceRate,
  fetchDrinkSales,
  fetchTokenLifecycle,
} from "@/lib/analytics/event-queries";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventComparisonData {
  eventId: string;
  eventTitle: string;
  revenue: number;
  attendance: number;
  attendanceRate: number;
  ticketsSold: number;
  drinkTokens: number;
  avgSpendPerAttendee: number;
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Fetch comparison data for multiple events in parallel.
 * Returns an array of EventComparisonData with key metrics per event.
 */
export async function fetchEventComparison(
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<EventComparisonData[]> {
  const results = await Promise.all(
    eventIds.map(async (eventId) => {
      // Fetch event title and all metrics in parallel
      const [titleResult, revenue, attendance, drinkSales, tokenLifecycle] =
        await Promise.all([
          supabase
            .from("events")
            .select("title")
            .eq("id", eventId)
            .single(),
          fetchEventRevenue(supabase, eventId),
          fetchAttendanceRate(supabase, eventId),
          fetchDrinkSales(supabase, eventId),
          fetchTokenLifecycle(supabase, eventId),
        ]);

      const eventTitle = titleResult.data?.title ?? "Unknown Event";
      const drinkTokens = drinkSales.reduce((sum, d) => sum + d.quantity, 0);
      const avgSpendPerAttendee =
        attendance.checkedIn > 0
          ? Math.round((revenue.totalNet / attendance.checkedIn) * 100) / 100
          : 0;

      return {
        eventId,
        eventTitle,
        revenue: revenue.totalNet,
        attendance: attendance.checkedIn,
        attendanceRate: attendance.rate,
        ticketsSold: attendance.sold,
        drinkTokens,
        avgSpendPerAttendee,
      };
    })
  );

  return results;
}

/**
 * Fetch all events for the event selector dropdown.
 * Returns events ordered by date descending.
 */
export async function fetchAllEvents(
  supabase: SupabaseClient
): Promise<{ id: string; title: string; date: string }[]> {
  const { data } = await supabase
    .from("events")
    .select("id, title, date")
    .order("date", { ascending: false });

  return (data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
  }));
}
