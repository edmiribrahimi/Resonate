import type { SupabaseClient } from "@supabase/supabase-js";

export interface GrowthDataPoint {
  period: string; // "2025-W03" or "2025-01" depending on granularity
  label: string; // "Jan 20" (weekly) or "Jan 2025" (monthly) for display
  referral: number; // cumulative referral members
  organic: number; // cumulative organic members
  total: number; // referral + organic
}

export interface GrowthSummary {
  totalMembers: number;
  referralMembers: number;
  organicMembers: number;
  referralRate: number; // percentage
  growthThisPeriod: number; // new members in latest period
}

/** Get ISO week string "YYYY-Wnn" for a date */
function getISOWeekString(date: Date): string {
  // Calculate ISO week number
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Get Monday of an ISO week for display label */
function getMondayOfISOWeek(weekString: string): Date {
  const [yearStr, weekStr] = weekString.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  // Monday of week 1
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1));
  // Add (week - 1) * 7 days
  const monday = new Date(mondayWeek1);
  monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  return monday;
}

/** Get month string "YYYY-MM" for a date */
function getMonthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function fetchMemberGrowth(
  supabase: SupabaseClient,
  granularity: "weekly" | "monthly"
): Promise<{ data: GrowthDataPoint[]; summary: GrowthSummary }> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("created_at, referred_by")
    .order("created_at", { ascending: true });

  if (error || !profiles) {
    return {
      data: [],
      summary: {
        totalMembers: 0,
        referralMembers: 0,
        organicMembers: 0,
        referralRate: 0,
        growthThisPeriod: 0,
      },
    };
  }

  // Group members by period
  const periodCounts = new Map<
    string,
    { referral: number; organic: number }
  >();

  for (const profile of profiles) {
    const date = new Date(profile.created_at);
    const period =
      granularity === "weekly" ? getISOWeekString(date) : getMonthString(date);

    const existing = periodCounts.get(period) || { referral: 0, organic: 0 };
    if (profile.referred_by) {
      existing.referral++;
    } else {
      existing.organic++;
    }
    periodCounts.set(period, existing);
  }

  // Sort periods chronologically and build cumulative data
  const sortedPeriods = Array.from(periodCounts.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  let cumulativeReferral = 0;
  let cumulativeOrganic = 0;

  const data: GrowthDataPoint[] = sortedPeriods.map(([period, counts]) => {
    cumulativeReferral += counts.referral;
    cumulativeOrganic += counts.organic;

    let label: string;
    if (granularity === "weekly") {
      const monday = getMondayOfISOWeek(period);
      label = monday.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } else {
      const [yearStr, monthStr] = period.split("-");
      const date = new Date(
        parseInt(yearStr, 10),
        parseInt(monthStr, 10) - 1,
        1
      );
      label = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    }

    return {
      period,
      label,
      referral: cumulativeReferral,
      organic: cumulativeOrganic,
      total: cumulativeReferral + cumulativeOrganic,
    };
  });

  // Calculate summary
  const totalMembers = profiles.length;
  const referralMembers = profiles.filter((p) => p.referred_by).length;
  const organicMembers = totalMembers - referralMembers;
  const referralRate =
    totalMembers > 0 ? Math.round((referralMembers / totalMembers) * 100) : 0;

  // Growth this period: members added in the latest period
  let growthThisPeriod = 0;
  if (sortedPeriods.length > 0) {
    const lastPeriod = sortedPeriods[sortedPeriods.length - 1][1];
    growthThisPeriod = lastPeriod.referral + lastPeriod.organic;
  }

  return {
    data,
    summary: {
      totalMembers,
      referralMembers,
      organicMembers,
      referralRate,
      growthThisPeriod,
    },
  };
}
