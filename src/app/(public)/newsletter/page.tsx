import AppNav from "@/components/layout/AppNav";
import NewsletterForm from "@/components/newsletter/NewsletterForm";
import { PageShell } from "@/components/ui/PageShell";
import { getAccessContext } from "@/lib/capabilities/server";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The newsletter surface — converted by plan 41.2-03.
 *
 * ── Why this file gains no heading ───────────────────────────────────────────
 *
 * `41.2-RESEARCH.md` §7 item 12 lists this page among those carrying no
 * top-level heading and says adopting the page title *"gives each one"*. It is
 * counted here in words rather than in markup, because a gate counts headings
 * on this file by matching the tag and cannot tell a description from a use —
 * the same reason the clearance utility is not spelled below. Measured across the
 * **surface** rather than the page file, that is wrong and the correction is
 * `41.2-PATTERNS.md` §7.3: the form below carries a heading in **each of its
 * two branches**, so a title written here would give the surface a **second**
 * one in whichever branch is rendering. The substitution belongs in the form,
 * one per branch, and it was done there in the same plan.
 *
 * Everything else is the shape of the landing surface, for the same reasons:
 * the shell at `default` width owns the root, the maximum, the gutter and the
 * clearance; the centring stays inside it; the responsive navigation is
 * mounted **and** its column clearance declared, in the same commit, because
 * check E compares those two sets in both directions.
 *
 * **No capability check was touched** — `AppNav` receives the same four props,
 * in the same order, that the phone-locked wrapper received. Width may change
 * layout, never membership (`41-UI-SPEC.md` §0 rule 5).
 */
export default async function NewsletterPage() {
  // Role and status come from the session, not from a request header.
  // Nothing on this page gates on either: both are handed to the navigation, a
  // "use client" component that cannot import the resolver.
  const { role, status, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

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
        <PageShell width="default" className="flex flex-col items-center">
          <NewsletterForm />
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
