import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import MembershipCardView from "@/components/membership/MembershipCardView";
import CopyReferralLink from "@/components/membership/CopyReferralLink";
import AppNav from "@/components/layout/AppNav";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The membership card surface — converted by plan 41.2-07.
 *
 * ── What this surface IS, before anything about how it looks ─────────────────
 *
 * This is the page a person holds up at a door. The code it draws is read at two
 * in the morning, in a dark room, off a staff phone that may have no network,
 * with a queue behind the person holding it. `checkin-offline.md` records the
 * asymmetry that governs everything here: **refusing a valid guest is worse than
 * admitting a duplicate, because the first error happens in front of a queue.**
 *
 * So the boundary this conversion respected, stated as an assertion rather than
 * as an intention:
 *
 *  - **the identifier is the same identifier.** `profile.membership_code`, with
 *    the same fallback literal when the row carries none, derived on the same
 *    line, passed to the same component under the same prop name;
 *  - **it renders under the same conditions.** The card is drawn
 *    unconditionally, exactly as before — no branch was added, removed, merged
 *    or reordered around it, and the one conditional on this page (the referral
 *    control's, below) is byte-identical to the one that was here;
 *  - **the code is not smaller and not fainter.** Its box, its quiet zone and
 *    its two colours are fixed inside `MembershipCardView` and `src/utils/qr.ts`
 *    and neither was reduced. A code that fails to scan at the door is the
 *    expensive error, and a visual mandate does not reach it.
 *
 * ── The pair, both halves, in this commit ────────────────────────────────────
 *
 * Check E's route table already printed this surface as *mounting* a
 * navigation, because it reached one **through** the phone-locked wrapper; its
 * pairing uses `importsDirectly` and counted the same file as not mounting.
 * Mounting here means importing the responsive form DIRECTLY, and the clearance
 * declaration lands beside it — a mount without a declaration is content sliding
 * under the 224px column from 768px up.
 *
 * **No capability check touched.** `AppNav` receives the same four props, in the
 * same order, the phone-locked wrapper received. Width may change layout, never
 * membership (`41-UI-SPEC.md` §0 rule 5) — and on the member area that sentence
 * is load-bearing rather than ceremonial, because what a person can see here
 * *is* the product.
 *
 * The `profile?.status` read below that gates the referral control comes from
 * this page's own `profiles` select and not from a header. It is deliberately
 * left alone: a referral changes the **path** into the community, never the
 * standard (`community-membership.md`), and widening either is a product
 * decision rather than a conversion.
 */
export default async function MembershipCardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // A pure nav-prop read: `role` and `status` are PRESENTATION here — nothing
  // on this page branches on them, and no capability key belongs in this file.
  // Only their source changed. The `profile?.status` read below that gates the
  // referral link comes from this page's own `profiles` select, not from a
  // header, and is deliberately left alone.
  const { role, status, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

  const fullName = user.user_metadata?.full_name || "Member";

  const { data: profile } = await supabase
    .from("profiles")
    .select("membership_code, status")
    .eq("id", user.id)
    .single();

  const membershipCode = profile?.membership_code || "RSN-UNKNOWN";

  return (
    <>
      {/*
        The declaring half of check E's pairing. It wraps the SHELL; the
        navigation below is its SIBLING — the placement settled by
        `src/app/(public)/gallery/page.tsx:110-132`, where putting the
        navigation inside would satisfy the textual pairing and pad the column
        by its own clearance.

        The line is copied byte for byte from that file. Since D-41.1-01 the
        stylesheet's ambient value is zero at every width, so without it the
        content slides UNDER the 224px column from 768px up. The utility is
        written whole in the class list and is not spelled in this comment:
        Tailwind cannot tell a description from a use.
      */}
      <div className="md:[--nav-inset-inline-start:14rem]">
        {/*
          `default`: §4's wide list is closed and does not name this route, and
          `focus` is unavailable rather than deferred — check E fails any focus
          surface that mounts a navigation, and this one does. The placeholder
          beside this file declares the same width, so nothing moves sideways
          when the row lands.
        */}
        <PageShell width="default">
          <header className="mb-6">
            <PageTitle>Membership Card</PageTitle>
          </header>

          <MembershipCardView
            fullName={fullName}
            membershipCode={membershipCode}
            memberSince={user.created_at}
          />

          {profile?.status === "approved" && membershipCode !== "RSN-UNKNOWN" && (
            <div className="mt-6">
              <CopyReferralLink membershipCode={membershipCode} />
            </div>
          )}

          <Card className="mt-6">
            <h2 className="mb-2 font-semibold">How to use your card</h2>
            <ol className="list-inside list-decimal text-sm text-muted leading-relaxed">
              <li>Show the QR code at the event entrance</li>
              <li>Staff will scan the code</li>
              <li>Your attendance will be recorded automatically</li>
            </ol>
          </Card>

          <div className="mt-4">
            {/*
              The one interactive element on this surface, and the one element
              `verify-touch-targets` measured as declaring no height at all. The
              outlined rung carries the 44px floor, the control boundary token
              and the single focus expression, so none of the three is written
              here. Its behaviour is unchanged: it carried no handler before and
              carries none now.
            */}
            <Button variant="secondary" className="w-full">
              Add to Apple/Google Wallet
            </Button>
          </div>
        </PageShell>
      </div>

      <AppNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </>
  );
}
