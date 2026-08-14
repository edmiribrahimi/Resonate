import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/components/layout/AppNav";
import { FOCUS_RING } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { getAccessContext } from "@/lib/capabilities/server";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The landing surface — converted by plan 41.2-03.
 *
 * ── The four things that changed, and the one that deliberately did not ──────
 *
 * 1. **The shell owns the outer root.** The hand-written viewport-height flex
 *    column and its gutter are gone; `PageShell` at `default` width carries the
 *    maximum, the gutter, the vertical rhythm and the navigation clearance.
 *    `default` is an answer and not a fallback (D-41.2-02): §4's `wide` list
 *    does not name this route, and `focus` — which is the shape this page used
 *    to hand-write — is **unavailable** to it, because check E forbids `focus`
 *    on any surface that mounts a navigation and D-41.2-01 mounts one here.
 *
 * 2. **The navigation takes its responsive form**, and the clearance is
 *    declared in the same commit. Those are two halves of one change: check E
 *    compares the set of files importing the responsive form directly against
 *    the set declaring the leading-edge column clearance, in **both**
 *    directions. Declaring without mounting reserves a column on a route that
 *    has none, silently; mounting without declaring slides this page's content
 *    **under** a 224px column from 768px up, loudly. The specimen for both
 *    halves is `src/app/(public)/gallery/page.tsx:88-133`.
 *
 * 3. **The page's own 320px container maximum is gone**, per the wave-0
 *    disposition (`41.2-WAVE0-FINDINGS.md` §7.2 row 1: *DELETE* — "a container
 *    maximum, and a narrow one … Deleting it hands the width to the shell").
 *    The same row names the consequence, so it is answered rather than
 *    absorbed: the shell's measure is 1024px, so the action column would run
 *    the full width unless something re-established it. What re-establishes it
 *    is a grid that sizes to its widest child — **not** a second maximum, and
 *    not a fixed width either, which would overflow the gutter on a 360px
 *    phone. The three actions stay the same width as each other, which is the
 *    property the deleted maximum was really buying.
 *
 * 4. **The two pill actions keep their hierarchy on the ladder's geometry.**
 *    `41.2-PATTERNS.md` §3 row 11 assigns them to `Chip`, and the chip's only
 *    fill is its `selected` state, which also writes `aria-current` — a claim
 *    that this is the current item among siblings, which is false of a landing
 *    call to action. The precedent taken instead is
 *    `src/app/(admin)/admin/(work)/events/page.tsx:191-196`, a converted
 *    surface's primary internal-navigation action: it stays a `<Link>`, so
 *    client-side navigation and prefetching survive the conversion, and it
 *    carries the ladder's geometry with the focus expression **imported**
 *    rather than re-spelled. The deviation is recorded in
 *    `41.2-03-SUMMARY.md`.
 *
 * **What did not change: what the navigation shows.** `41-UI-SPEC.md` §0 rule 5
 * — width may change layout, never membership. `AppNav` receives the same four
 * props, in the same order, that the phone-locked wrapper received; the server
 * decides which entries exist and CSS decides only how they sit. **No
 * capability check was touched.**
 */
export default async function Home() {
  // Identity, role and status come from the session, not from a request header.
  const { userId, role, status, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

  // Logged-in users go straight to dashboard.
  //
  // This keys on `userId` where the header version keyed on `role`, and that
  // is what KEEPS the verdict rather than changing it. Under the header
  // transport `role` was a proxy for "authenticated":
  // `src/lib/supabase/middleware.ts:219-223` sets the role header if and only
  // if `user` exists, and its `?? "member"` fallback makes it truthy for
  // every signed-in caller — including one with no `profiles` row, a case that
  // file names explicitly (`middleware.ts:105-110`).
  //
  // `getAccessContext()` carries no such fallback. `my_access_context()` reads
  // `role` straight out of `public.profiles`
  // (`supabase/migrations/20260808000000_access_context_user_id.sql:130-132`),
  // so it is `null` for an authenticated caller with no profile row while
  // `user_id` — `auth.uid()` — is still theirs. Transcribing `if (role)`
  // literally would stop redirecting that caller and drop them on the public
  // landing page: a verdict change on a public surface, which CAP-05
  // criterion 4 forbids. `userId` is non-null exactly when the middleware's
  // `if (user)` was true, and it is `string | null`, never `""` (D-33-01-A),
  // so the test is exact rather than accidental.
  if (userId) redirect("/dashboard");

  return (
    <>
      {/*
        The declaring half of check E's pairing. It wraps the SHELL and the
        navigation below is its SIBLING, which is the placement
        `src/app/(public)/gallery/page.tsx:110-132` settles: putting the
        navigation inside would still satisfy the textual pairing and would pad
        the column by its own clearance.

        The line carries one arbitrary-property utility at the md tier, setting
        the inline-start navigation inset, and it is copied byte for byte from
        that file. Since D-41.1-01 the stylesheet's ambient value is zero at
        every width, so without this line the content slides UNDER the 224px
        column from 768px up.

        The utility is written whole in the class list and is not spelled in
        this comment: Tailwind scans comments, cannot tell a description from a
        use, and an abbreviated one emits a malformed rule and a build warning.
      */}
      <div className="md:[--nav-inset-inline-start:14rem]">
        <PageShell
          width="default"
          className="flex flex-col items-center gap-16 text-center"
        >
          {/*
            The surface's one heading, and it introduces **no copy**
            (`41-UI-SPEC.md` §11: none introduced). The page's dominant line has
            always been the wordmark, and the wordmark's accessible string —
            `re:sonate` — is the image's own `alt`, unchanged.

            The string is not written as TEXT inside the title, and that is a
            decision rather than an omission: `Typography.tsx:34-42` puts the
            display face on this element and states that it may never land on a
            format name, `re:sonate` among them, because a phase that decorated
            the brand would be making a brand decision inside a file every
            surface imports.
          */}
          <PageTitle>
            <Image
              src="/images/logo-white.png"
              alt="re:sonate"
              width={320}
              height={90}
              priority
            />
          </PageTitle>

          {/*
            The action column. It sizes to its widest child and stretches the
            other two to match, so the three stay equal without a maximum and
            without a fixed width — see point 3 of the docblock above.
          */}
          <div className="inline-grid grid-cols-1 gap-4">
            <Link
              href="/events"
              className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-semibold text-ground transition-all hover:bg-accent-hover active:scale-95 active:opacity-80 ${FOCUS_RING}`}
            >
              Discover Events
            </Link>
            <Link
              href="/register"
              className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-control px-6 text-sm font-semibold text-ink transition-all hover:bg-surface active:scale-95 active:opacity-80 ${FOCUS_RING}`}
            >
              Join
            </Link>
            {/*
              A link in prose, which is one of the four things §5.1 reserves the
              accent for. It gains the 44px floor it did not have — it is the
              one element on this surface G5 measured and failed — and the floor
              is a minimum rather than a height, so the sentence may still wrap
              on a narrow phone.
            */}
            <Link
              href="/login"
              className={`inline-flex min-h-11 flex-wrap items-center justify-center gap-x-1 text-center text-sm text-muted transition-all hover:text-ink active:scale-95 active:opacity-80 ${FOCUS_RING}`}
            >
              Already a member? <span className="text-accent">Sign In</span>
            </Link>
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
