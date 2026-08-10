import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AnimatedSection from "@/components/motion/AnimatedSection";
import MemberGrowthChart from "@/components/analytics/MemberGrowthChart";
import GrowthSummaryCard from "@/components/analytics/GrowthSummaryCard";
import { fetchMemberGrowth } from "@/lib/analytics/member-queries";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";

/**
 * Master-only, and it stays master-only across the collapse.
 *
 * `capability-routes.ts` binds `/admin/members/growth` to `admin.access` while
 * binding its parent `/admin/members` to `organizer.access`. **The mechanism
 * that keeps them apart is stronger than a precedence rule, and worth naming
 * precisely rather than by the shorthand:** patterns in that map are EXACT, not
 * prefixes. `matchesPattern` refuses any candidate whose segment count differs
 * (`capability-routes.ts:523`), so `/admin/members` — two segments — cannot
 * match this three-segment address at all. The parent binding is not beaten
 * here; it never competes. The dynamic-count tiebreak below it settles a
 * different kind of case (`/admin/events/new` against an `[id]` sibling).
 *
 * So opening the members surface to organizers does not open this one, and the
 * guard below is unchanged in key and in meaning.
 */
export default async function MemberGrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ granularity?: string }>;
}) {
  // Resolved once by `(work)/layout.tsx`, which also mounts both navs and now
  // holds the two `UserRole` / `UserStatus` casts that used to sit here.
  // `getAccessContext` is `cache()`-scoped per request, so asking again for
  // this page's own guard costs no second round trip.
  const { capabilities } = await getAccessContext();

  // The SAME question the middleware asks of this route, of the same authority
  // — both read the same entry in `src/lib/routes/capability-routes.ts`
  // (D-34-09). `admin.access` is granted to `master` alone, so no role's reach
  // moves. Never a role list.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
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
    </div>
  );
}
