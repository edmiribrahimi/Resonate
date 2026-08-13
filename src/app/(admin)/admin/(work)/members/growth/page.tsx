import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AnimatedSection from "@/components/motion/AnimatedSection";
import MemberGrowthChart from "@/components/analytics/MemberGrowthChart";
import GrowthSummaryCard from "@/components/analytics/GrowthSummaryCard";
import { fetchMemberGrowth } from "@/lib/analytics/member-queries";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

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
 *
 * ── One thing this surface deliberately does NOT say ─────────────────────────
 *
 * It draws a number going up. `community-membership.md`'s own gate says growth
 * is only meaningful **next to how many seats a night actually has** — the
 * venues in target hold 150–300 people, and a member who never gets in is a
 * former member. **That is a product question and not a conversion**, so no
 * capacity figure, no ratio and no caption implying one was added here. The
 * finding is raised where findings belong, in the plan's SUMMARY. Markup moved;
 * the meaning is exactly the meaning it had.
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

  // `wide` — `/admin/members/growth` is named on §4's CLOSED wide list. The
  // shell owns the maximum, the gutter, the vertical rhythm and the navigation
  // clearance in both tiers; this page writes none of them.
  return (
    <PageShell width="wide">
      <AnimatedSection>
        <header className="mb-6">
          {/*
            The surface's own name, not the tree's. The heading here read
            `Admin`, which is the prefix speaking: after D-34-02 the word
            `admin` in a URL no longer describes who is on it, and it never
            described what this page shows. `(work)/members/page.tsx` made the
            identical correction with the identical reason, and this is the
            second instance of one move rather than a second decision.

            One word, because the card below already carries the fuller name of
            what is drawn, and repeating it in two roles would be the page
            telling you the same thing twice.
          */}
          <PageTitle>Growth</PageTitle>
        </header>
      </AnimatedSection>

      <AnimatedSection delay={0.1} className="space-y-4">
        {/* The granularity toggle: RESP-04's filters, and the interactive kind
            of pill, so they are chips and not badges — 44px targets, with the
            current one named by an aria attribute as well as by its fill,
            because colour is never the only channel. They were 30px and told a
            screen reader nothing about which of the two was current.

            Chips rather than the button ladder's `href` branch, which renders a
            bare anchor typed as a plain string — D-41.1-26. */}
        <div className="flex flex-wrap gap-2">
          <Chip
            href="/admin/members/growth?granularity=weekly"
            selected={granularity === "weekly"}
          >
            Weekly
          </Chip>
          <Chip
            href="/admin/members/growth?granularity=monthly"
            selected={granularity === "monthly"}
          >
            Monthly
          </Chip>
        </div>

        <GrowthSummaryCard summary={summary} />

        <Card>
          {/* This was an `<h1>`-sized heading inside a card — a component
              heading, at a size §7's ladder gives to nothing. It is a section
              heading now: the label/data role, in the data face, at the one
              weight above 400 this system has. */}
          <SectionHeading>Member Growth</SectionHeading>
          <MemberGrowthChart data={data} />
        </Card>
      </AnimatedSection>
    </PageShell>
  );
}
