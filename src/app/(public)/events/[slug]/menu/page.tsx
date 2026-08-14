import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { getDrinkItems } from "@/app/(admin)/admin/events/actions";
import AppNav from "@/components/layout/AppNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import type { UserRole, UserStatus, DrinkItem } from "@/types/database";
import GuestTokenDisplay from "./GuestTokenDisplay";
// Login/signup invite for guests temporarily disabled — re-enable by
// restoring this import and the <GuestLoginBanner /> render below.
// import GuestLoginBanner from "./GuestLoginBanner";
import UserTokenDisplay from "./UserTokenDisplay";
import EventQRCode from "./EventQRCode";
import PartyDrinkMenu from "./PartyDrinkMenu";

/**
 * The bar's QR surface — the page a guest opens standing at a bar, converted by
 * plan 41.2-11.
 *
 * ── This surface reads NO location at all, and that is a measurement ─────────
 *
 * `ROADMAP.md` said the bar reveals a secret place *"on the same pages"* as
 * money. It does not. The two-word case-insensitive grep the secrecy module in
 * `.claude/rules/` prescribes — spelled in `41.2-11-SUMMARY.md`, deliberately
 * **not here** — returns **0** on every one of this directory's six files, and
 * none of this page's five `select` calls names such a column. **The two words are kept out
 * of this docblock on purpose: the zero IS the guard, and prose that spells
 * what it asserts the absence of turns the guard into a number nobody can read
 * again.** Same discipline as DEF-41-01, applied to a secret instead of to a
 * class string.
 *
 * So the guard this file carries is the **money** guard — and the second half
 * of it is *where* it fails: at a bar, at night, with a queue behind.
 * `checkin-offline.md`'s asymmetry has its analogue here — a guest who cannot
 * find or use a token they paid for is a worse failure than an ugly panel.
 *
 * **Nothing about the reads moved.** The service client still fetches the
 * public rows, the cookie-bound client still fetches the caller's own tokens
 * under RLS, and `canManage` is still decided from the session capability set
 * and never from an inbound header. A visual conversion has no business
 * touching any of the three, and this one did not.
 *
 * ── The maximum this file used to compose at run time is GONE ────────────────
 *
 * Until this commit the content column carried its own 32rem maximum, and it
 * was the one page file in the phase that built it **inside a template
 * literal** — invisible to an attribute swap and visible to check D, which
 * reads live lines. `41.2-WAVE0-FINDINGS.md` §7.2 row 5 took the disposition
 * before this plan ran: **DELETE**, because `mx-auto` beside it was the tell —
 * it was centring a content column, which is `PageShell`'s job verbatim, and
 * there is no prose here to hold at a reading measure. The shell owns the
 * maximum, the gutter, the vertical rhythm and the navigation clearance now,
 * and this file writes none of the four.
 *
 * `default` and not `wide` or `focus`: D-41.2-02 keeps both lists closed, and
 * `focus` is not merely deferred but mechanically unavailable — check E fails
 * any `focus` surface that mounts a navigation, and this one does.
 *
 * ── The bottom clearance passed to the shell, with its arithmetic ────────────
 *
 * The deleted line carried a conditional pair — 96px of bottom padding for a
 * signed-in visitor, 32px for a guest — hand-written because the phone-locked
 * navigation drew a bar at the bottom edge at every width. The shell's own
 * clearance is `--nav-inset-block-end` plus 16px, which is **96px on a phone
 * and 16px from 768px up** (`PageShell.tsx:51-67`), so the signed-in case is
 * value-preserving on the device the pair was written for and is now *correct*
 * above it, where the navigation leaves the bottom edge for the leading one and
 * the hand-written 96px would have been dead space.
 *
 * A guest gains ~64px of empty space below the last row on a phone (32 → 96),
 * because the shell reserves for a bar this page does not draw for them. That
 * is the safe direction — too much clearance never hides a row, too little
 * does — and it is recorded rather than corrected here, because correcting it
 * would mean a page overriding the one measurement the shell exists to own.
 *
 * ── The navigation pair, and why ITS declaring half is conditional ───────────
 *
 * D-41.2-01 moves all ten of this phase's surfaces off the phone-locked wrapper
 * onto the responsive form, and check E asserts in both directions that the
 * files DECLARING the leading-edge column clearance are exactly the files
 * MOUNTING that form. Both halves land in this commit.
 *
 * **This surface is the first of the ten whose mount is conditional**, and the
 * declaration is therefore conditional on the same boolean, in the same
 * expression shape. The nine sites that landed before this one mount the
 * navigation unconditionally and declare it unconditionally; copying their
 * static line here would state — for every logged-out guest at 768px and up —
 * that a 224px column is there to clear when this page draws none for them, and
 * content pushed 224px right against empty space is the same class of defect as
 * content sliding under a column, arrived at from the other side.
 *
 * `globals.css:295-311` is explicit about which direction is correct: the
 * ambient value is nothing everywhere precisely so that *"the clearance is
 * structurally unable to reach a route that does not mount the responsive
 * form"*. A route that mounts it for half its visitors is that sentence with a
 * predicate. The utility itself is copied **byte for byte** from
 * `src/app/(public)/gallery/page.tsx:110`; only its guard is new.
 *
 * The utility is written whole in the class list and is not spelled in this
 * comment: Tailwind scans comments, cannot tell a description from a use, and
 * an abbreviated one emits a malformed rule and a build warning (DEF-41-01).
 *
 * **No capability check was touched.** `AppNav` receives the same four props in
 * the same order the wrapper received them, and the cast stays at the page
 * boundary because the navigation is a `"use client"` component that cannot
 * import the resolver. `role` and `status` are PRESENTATION here — they choose
 * which entries are drawn, nothing more — and hiding an entry was never
 * protection: the refusal is the middleware's and the boundary on the data is
 * the RLS policy.
 *
 * **And the navigation stays hidden from guests.** That is a product decision
 * this file already carried in its own words — a guest who navigates away from
 * the menu loses track of the tokens they just paid for — and a conversion does
 * not get to reverse it.
 *
 * ── This surface has NO heading, and that is now a declared exception ────────
 *
 * `41.2-RESEARCH.md` assumption A6 says adopting the title primitive on the two
 * headless pages is a **copy decision**, not a defect, and that a deliberately
 * headless reading needs a declared exception. This is that exception, and it
 * rests on three things rather than on taste:
 *
 *  1. **The omission is already a written decision in this file** — the comment
 *     below the shell says the event title and date are *intentionally omitted*
 *     to keep the menu focused on drinks. A page heading naming the event
 *     reinstates exactly what that sentence removes.
 *  2. **There is no dominant line to promote.** `41-UI-SPEC.md` §11's copy
 *     contract is *none introduced*, and this surface's dominant object is a
 *     list of drinks. Its sections carry their own headings already —
 *     `UserTokenDisplay.tsx:42` is one — so a page title here would be new copy
 *     invented by a conversion, which is the one thing §11 forbids.
 *  3. **The document is not nameless.** `generateMetadata` above gives it the
 *     event's title and *Drink Menu*, which is what a browser tab shows and what
 *     a screen reader announces for the document.
 *
 * **Whether a guest standing at a bar should read a heading is the owner's, not
 * this plan's.** It is recorded as a question rather than answered by a diff.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getServiceClient();
  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("slug", slug)
    .single();
  return { title: event ? `${event.title} - Drink Menu` : "Drink Menu" };
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { slug } = await params;
  const { order: orderIdFromUrl } = await searchParams;

  // Service client for public data (no RLS restriction). RETAINED, and which
  // client reads what is unchanged by this conversion: the page must render for
  // a logged-out visitor, and `events` / `event_parties` / `drink_items` are
  // not readable by `anon` under RLS. `access-gating.md`, gate *service role*:
  // a service-role read bypasses every policy, so on this path THE CODE IS THE
  // ONLY BOUNDARY — there is no second one behind it. That is precisely why
  // `canManage` below must be decided from the session and never from an
  // inbound header, which any client can send.
  const serviceClient = getServiceClient();

  // Identity, role, status and capabilities from the SESSION. One round trip,
  // memoised by `cache()` for this render. `userId` is the caller's own
  // `auth.uid()`, derived inside Postgres from the JWT, and is `string | null`
  // — never `""`. It replaces the `supabase.auth.getUser()` call that used to
  // stand here purely to learn who the visitor was.
  //
  // An anonymous visitor is a NORMAL case, not a failure: `my_access_context()`
  // is granted to `authenticated` only, so `anon` is refused with 42501 and the
  // resolver answers the empty context (no capabilities, null identity).
  const { capabilities, userId, role, status, liveAssignmentCapabilities } =
    await getAccessContext();
  const isAuthenticated = userId !== null;

  // The cookie-bound client stays: the drink-token read below is per-user and
  // must remain under RLS.
  const supabase = await createClient();

  // Fetch event by slug (must be published)
  const { data: event } = await serviceClient
    .from("events")
    .select("id, title, date, slug, cover_image, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!event) {
    notFound();
  }

  // Determine if the user can manage drinks — from the session, never from a
  // header. `staff.manage` is byte-equal to the
  // `role === "master" || role === "organizer"` it replaces (role only, status
  // ignored), so no role's reach changes: a pending organizer who manages this
  // menu today still manages it. `admin.access` would have narrowed it to
  // master and `catalogue.manage` would have required an approved status —
  // both are verdict changes and neither is this plan's.
  const canManage = capabilities.has(CAP.STAFF_MANAGE);

  // Fetch parties for this event
  const { data: parties } = await serviceClient
    .from("event_parties")
    .select("id, title, date, end_time, menu_closes_at")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  const partyList = (parties ?? []) as { id: string; title: string; date: string; end_time: string | null; menu_closes_at: string | null }[];

  // Fetch drinks per party
  const drinksByParty = await Promise.all(
    partyList.map(async (party) => {
      if (canManage) {
        const allItems = await getDrinkItems(event.id, party.id);
        return {
          partyId: party.id,
          allItems,
          availableItems: allItems.filter((d: DrinkItem) => d.is_available),
        };
      } else {
        const { data: drinks } = await serviceClient
          .from("drink_items")
          .select("*")
          .eq("event_id", event.id)
          .eq("party_id", party.id)
          .eq("is_available", true)
          .order("sort_order");
        return {
          partyId: party.id,
          allItems: [] as DrinkItem[],
          availableItems: (drinks ?? []) as DrinkItem[],
        };
      }
    })
  );

  // Fetch authenticated user's drink tokens for this event
  let userTokens: { id: string; drink_name: string; price: number; token: string; status: "purchased" | "redeemed"; redeemed_at: string | null }[] = [];
  // `userId` narrows to `string` inside this guard, so the filter below can
  // never receive a null. There is no `user?.id === x` comparison anywhere on
  // this page — the only identity use is this query filter — so the
  // `null === null` admission that the nullable identity introduces elsewhere
  // has no site here.
  if (userId) {
    const { data: tokens } = await supabase
      .from("drink_tokens")
      .select("id, drink_name, price, token, status, redeemed_at")
      .eq("user_id", userId)
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });
    userTokens = (tokens ?? []) as typeof userTokens;
  }

  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${slug}/menu`;

  return (
    <>
      {/*
        The declaring half of check E's pairing. It wraps the SHELL and the
        navigation below is its SIBLING — the placement
        `src/app/(public)/gallery/page.tsx:110-132` settles, because putting the
        navigation inside would still satisfy the textual pairing and would pad
        the column by its own clearance.

        The guard is the docblock's subject: this page draws no navigation for a
        guest, so it declares no column for one either.
      */}
      <div className={isAuthenticated ? "md:[--nav-inset-inline-start:14rem]" : undefined}>
        <PageShell width="default">
          {/*
            The cover, inside the shell rather than bleeding past it.

            It used to run full width above a 32rem column that climbed back
            over it by a negative top margin — a construction that only makes
            sense while the page owns its own maximum. With the shell owning it,
            a strip bleeding past the gutter would also bleed under the 224px
            column from 768px up, since the shell applies the leading inset and
            anything outside it does not. `(public)/artists/[slug]/page.tsx:148`
            is this tree's converted precedent for a hero and it sits inside the
            shell too, and the container radius is the rung
            `(public)/tickets/[id]/page.tsx:197` already uses for a contained
            cover image.

            The scrim stays: it fades the image into the page ground, and only
            its token changed.
          */}
          {event.cover_image && (
            <div className="relative h-48 w-full overflow-hidden rounded-2xl">
              <img
                src={event.cover_image}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ground" />
            </div>
          )}

          {/* Event title and date intentionally omitted — keep the menu focused
              on drinks. QR code is still shown to organizers/admins. This is
              the sentence the headless exception in the docblock rests on. */}
          <AnimatedSection>
            {canManage && (
              <div className="mt-6">
                <EventQRCode url={menuUrl} eventTitle={event.title} />
              </div>
            )}

            {/* Login/signup banner temporarily disabled. `user` no longer exists
                on this page — the identity is `userId` / `isAuthenticated` — so
                the disabled block below is kept compilable-on-re-enable.
                Re-enabling it is a product decision and it is not this plan's;
                the component it names was converted in wave 0 so that the
                re-enable path lands already converted. */}
            {/* {!isAuthenticated && (
              <div className="mt-6">
                <GuestLoginBanner slug={slug} />
              </div>
            )} */}
          </AnimatedSection>

          {/* Party drink menu with selector */}
          <AnimatedSection delay={0.1}>
          {partyList.length > 0 ? (
            <PartyDrinkMenu
              eventId={event.id}
              eventTitle={event.title}
              parties={partyList}
              drinksByParty={drinksByParty}
              canManage={canManage}
              isAuthenticated={isAuthenticated}
            />
          ) : (
            <Card className="mt-6 text-center">
              <p className="text-sm text-muted">
                No drinks available for this event.
              </p>
            </Card>
          )}
          </AnimatedSection>

          {/* Drink tokens */}
          {isAuthenticated ? (
            userTokens.length > 0 && (
              <div className="mt-6">
                <UserTokenDisplay tokens={userTokens} />
              </div>
            )
          ) : (
            <div className="mt-6">
              <GuestTokenDisplay
                eventId={event.id}
                initialOrderId={orderIdFromUrl ?? null}
              />
            </div>
          )}
        </PageShell>
      </div>

      {/* The navigation is hidden for guests so they do not navigate away from
          the menu and lose track of their tokens. The predicate is the one this
          file already carried; only the component it guards changed, from the
          phone-locked wrapper to the responsive form. */}
      {isAuthenticated && (
        <AppNav
          role={role as UserRole | null}
          status={status as UserStatus | null}
          capabilities={[...capabilities]}
          liveAssignmentCapabilities={
            liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
          }
        />
      )}
    </>
  );
}
