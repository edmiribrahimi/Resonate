import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import AnimatedSection from "@/components/motion/AnimatedSection";
import EventSelector from "@/components/analytics/EventSelector";
import EventComparisonChart from "@/components/analytics/EventComparisonChart";
import {
  fetchEventComparison,
  fetchAllEvents,
} from "@/lib/analytics/comparison-queries";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { FOCUS_RING } from "@/components/ui/Button";

interface PageProps {
  searchParams: Promise<{ events?: string; mode?: string }>;
}

export default async function AdminEventComparisonPage({
  searchParams,
}: PageProps) {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask is free. The page keeps its own guard (D-34-09).
  const { capabilities } = await getAccessContext();

  // Defense in depth behind the middleware — and now the SAME question the
  // middleware asks for `/admin/*`, of the same authority. Never a role list.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
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

  // Build search params string preserving events for mode toggle.
  //
  // Both hrefs are stored in a variable, so they need a type: form 3 of plan
  // 34-01. `Route` (i.e. `Route<string>`) is enough here and checks something
  // real — the base is a STATIC route, so the value lands on `RouteImpl`'s
  // `${StaticRoutes}${SearchOrHash}` arm and a misspelt base fails to compile.
  // The ternary is what makes each branch a literal: the previous single
  // template widened the whole expression to `string`, which is what
  // `typedRoutes` refused. The strings produced are byte-for-byte the same.
  const eventsParam = selectedIds.length > 0 ? `events=${selectedIds.join(",")}` : "";
  const perAttendeeHref: Route = eventsParam
    ? `/admin/analytics/compare?${eventsParam}&mode=per-attendee`
    : "/admin/analytics/compare";
  const absoluteHref: Route = eventsParam
    ? `/admin/analytics/compare?${eventsParam}&mode=absolute`
    : "/admin/analytics/compare?mode=absolute";

  // `wide` — `/admin/analytics/compare` is named on §4's CLOSED wide list. Its
  // primary object is a chart of up to four series side by side, which is the
  // multi-column case that list exists for: the content stops widening at
  // 1280px instead of running edge to edge at 1920. The shell owns the maximum,
  // the gutter, the vertical rhythm and the navigation clearance; this page
  // writes none of them.
  return (
    <PageShell width="wide">
      <AnimatedSection>
        <header className="mb-6">
          {/* The way back up. It is a target as much as the chips below are, so
              it declares the floor and carries the imported focus expression —
              it had neither, and a 20px text link is the finding §6.4 ranks
              first. */}
          <Link
            href="/admin/analytics"
            className={`inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
          >
            &larr; Back to Analytics
          </Link>
          <PageTitle className="mt-2">Event Comparison</PageTitle>
        </header>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <div className="space-y-6">
          <EventSelector
            events={allEvents}
            selectedIds={selectedIds}
            maxSelection={4}
          />

          {/* The mode toggle: RESP-04's filters, and the interactive kind of
              pill, so they are chips and not badges — 44px targets, with the
              current one named by an aria attribute as well as by its fill,
              because colour is never the only channel. They were 30px and told
              a screen reader nothing about which of the two was current.

              They are chips rather than the button ladder's `href` branch:
              D-41.1-26, and `Chip` became generic in the same decision, so a
              route variable is passed without a cast.

              The selected fill closes finding A2 on this surface. Light ink on
              an accent fill measures 2.52 : 1 and white 2.91 : 1, both under
              1.4.3's 4.5; the primitive writes the ground as its ink at 6.85. */}
          <div className="flex flex-wrap gap-2">
            <Chip href={perAttendeeHref} selected={mode === "per-attendee"}>
              Per Attendee
            </Chip>
            <Chip href={absoluteHref} selected={mode === "absolute"}>
              Absolute
            </Chip>
          </div>

          {/* Comparison chart, or the state before one can exist.
              §8.11's contract — a heading and one body sentence naming the next
              step — rather than one muted line at 60% opacity, which is a
              contrast reduction applied to the only sentence on the surface
              that tells somebody what to do. */}
          {selectedIds.length >= 2 ? (
            <EventComparisonChart data={comparisonData} mode={mode} />
          ) : (
            <Card>
              <div className="px-6 py-12 text-center">
                <p className="text-base font-semibold text-ink">
                  Nothing to compare yet
                </p>
                <p className="mt-1 text-sm text-muted">
                  Tick at least two nights above and the chart draws itself.
                </p>
              </div>
            </Card>
          )}
        </div>
      </AnimatedSection>
    </PageShell>
  );
}
