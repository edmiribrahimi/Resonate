import { redirect } from "next/navigation";
import Link from "next/link";
import AnimatedSection from "@/components/motion/AnimatedSection";
import MemberSpendTable from "@/components/analytics/MemberSpendTable";
import RepeatAttendeeCard from "@/components/analytics/RepeatAttendeeCard";
import ReferralChainTable from "@/components/analytics/ReferralChainTable";
import GuestConversionCard from "@/components/analytics/GuestConversionCard";
import { FOCUS_RING } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import {
  fetchMemberSpendProfiles,
  fetchRepeatAttendeeRate,
  fetchReferralChains,
  fetchGuestConversion,
} from "@/lib/analytics/cross-event-queries";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";

/**
 * The member-analytics work surface.
 *
 * ── `wide`, and it is named rather than chosen ───────────────────────────────
 *
 * `/admin/analytics/members` is on §4's **closed** wide list — *"the
 * member-analytics tables"* — so the width is read off a list a reviewer can
 * check, not argued at the call site. The shell owns the maximum, the gutter,
 * the vertical rhythm and the navigation clearance in both tiers; this page
 * writes none of them, which is why the outer full-height root, the top rhythm
 * and the three repeated gutters are gone rather than moved.
 *
 * ── The heading ladder ───────────────────────────────────────────────────────
 *
 * One page title, in the display face, through the primitive that is the only
 * place in `src/` naming that face. The two section labels take the heading
 * convention instead of the four different hand-written spellings this file and
 * its neighbours had between them, which also retires the weight-500 request
 * they carried — this system has two weights.
 *
 * The two KPI tiles' own labels stay ordinary text on purpose: they name a
 * figure inside a card, not a section of the document, and promoting them to
 * headings would put two more entries in the outline that describe nothing a
 * reader navigates by.
 *
 * ── The grid gains the step it skipped ───────────────────────────────────────
 *
 * The KPI pair used to go from one column to two at the small boundary. §2.3 is
 * a **map, not a rename**: the one boundary this system has is the phone/not-
 * phone one, and the pair now splits there.
 *
 * ── What did not change ──────────────────────────────────────────────────────
 *
 * No query changed, no column added, **no capability check touched** — the page
 * still asks the same single question of the same authority before it renders
 * anything — and no action payload altered. This surface reads money and moves
 * none: there is no status transition, no refund amount, no idempotency key and
 * no webhook path anywhere in what it reaches.
 */
export default async function AdminMemberInsightsPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask is free. The page keeps its own guard (D-34-09).
  const { capabilities } = await getAccessContext();

  // Defense in depth behind the middleware — and now the SAME question the
  // middleware asks for `/admin/*`, of the same authority. Never a role list.
  if (!capabilities.has(CAP.ADMIN_ACCESS)) {
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
    <PageShell width="wide">
      <AnimatedSection>
        <header className="mb-6">
          {/* Internal navigation goes through the router, and it is a link
              rather than a button wearing one: D-41.1-26 records that the
              button ladder's href renders a bare anchor typed as a plain
              string, which neither client-navigates nor participates in
              dead-link checking. It also gains the minimum hit area and the
              one focus expression, which it had neither of. */}
          <Link
            href="/admin/analytics"
            className={`inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
          >
            &larr; Back to Analytics
          </Link>
          <PageTitle className="mt-2">Member Insights</PageTitle>
        </header>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <div className="space-y-6">
          {/* KPI cards: repeat attendees + guest conversions */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <RepeatAttendeeCard data={repeatData} />
            <GuestConversionCard data={conversion} />
          </div>

          {/* Top Spenders section */}
          <Card>
            <SectionHeading>Top Spenders</SectionHeading>
            <MemberSpendTable members={members} />
          </Card>

          {/* Referral Effectiveness section */}
          <Card>
            <SectionHeading>Referral Effectiveness</SectionHeading>
            <ReferralChainTable chains={chains} />
          </Card>
        </div>
      </AnimatedSection>
    </PageShell>
  );
}
