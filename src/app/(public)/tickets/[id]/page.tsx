import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import AppNav from "@/components/layout/AppNav";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import QRCode from "qrcode";
import { formatTime } from "@/utils/formatTime";
import { generateTicketToken } from "@/utils/qr";
import { isAppleWalletConfigured } from "@/lib/apple-wallet";
import { mayShowVenueToTicketHolder } from "@/lib/venue-reveal/venue-disclosure";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle } from "@/components/ui/Typography";
import { Button, FOCUS_RING } from "@/components/ui/Button";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * The ticket surface — converted onto the shared primitives by plan 41.2-08.
 *
 * ── One page, three domains, and only one of them is this plan's ─────────────
 *
 * This surface holds money, a venue and the door in one file. **The conversion
 * is a shell swap around all three.** What follows is what was deliberately not
 * touched, written here rather than only in a summary, because the next reader
 * of this file is the person a later plan will tempt into "tidying" it.
 *
 * ── 1. The venue line, and the divergence that USED TO BE HERE ───────────────
 *
 * **Reconciled 2026-08-22, by the owner's decision and not by a plan.**
 *
 * Until that day this page selected the night's stored secrecy flag and **never
 * read it**: the venue line rendered the night's free venue text
 * **unconditionally** to the holder, while the public event page gated the same
 * information behind its own reveal verdict. Two predicates on one secret. Plan
 * 41.2-08 preserved that divergence on purpose and wrote down why — *making
 * this page agree with the event page would be a behaviour change on the one act
 * in this product that cannot be undone, decided by a visual conversion* — and
 * left it as a question owed to the owner.
 *
 * The answer arrived on 2026-08-22 and it went the other way from "make them
 * agree": **the two surfaces swapped jobs.** The public event page shows a
 * secret night's venue to nobody, ever, the night itself included; this page —
 * open to the holder of this ticket and to nobody else — shows it as soon as the
 * night's reveal has fired. The reveal stopped making the address public and
 * started making it known to whoever bought.
 *
 * **The predicate is not written here.** It is read from
 * `@/lib/venue-reveal/venue-disclosure`, which both surfaces call, because two
 * expressions deciding one thing in two files is how the divergence above came
 * to exist in the first place. If this file ever grows a venue test of its own,
 * that is the defect returning, not a tidy-up.
 *
 * The free text is content somebody typed, so a text that names a place was
 * published by whoever typed it. The gate above decides WHEN it leaves, never
 * whether it should have been stored there. The full exit enumeration for this
 * surface — including the one that leaves the product and is **still open**:
 * the wallet pass at `src/app/api/tickets/[id]/wallet/route.ts:70`, which writes
 * the same free text onto a file that syncs to a phone and cannot be recalled —
 * is in `41.2-08-FINDINGS.md`, rebuilt by reading the code as `venue-secrecy.md`
 * requires rather than carried forward. **That exit is NOT covered by the
 * owner's three-surface rule and was deliberately not closed here.**
 *
 * ── 2. The money path: read, never reshaped ──────────────────────────────────
 *
 * No status transition, no amount, no idempotency key and no webhook path is
 * written, read or reshaped here. The wallet address handed to the control below
 * is the same address, and it is still a plain anchor: the primitive renders an
 * `<a>` for an `href`, so no router prefetch was introduced onto an endpoint
 * that mints a pass.
 *
 * ── 3. Why this surface is NOT narrow, and why that word is "unavailable" ────
 *
 * It wrote the narrow measure by hand, twice, which is the file asking to be
 * narrow. It cannot be. `scripts/verify-conversion.mjs` check E reds any surface
 * that declares the narrow form while mounting a navigation, and its route list
 * for that form is closed and contains none that mount one; D-41.2-01 mounts one
 * here. So the narrow form is **unavailable**, not deferred — deferring implies
 * it could be picked up later, and it cannot be picked up at all while this
 * surface mounts a navigation. Both hand-written measures were deleted per wave
 * 0's disposition and the width belongs to the shell.
 *
 * ── 4. The render mode is DECLARED now, and it stopped being a question ──────
 *
 * `41.2-08-FINDINGS.md` §2 recorded this as a question owed to the owner: the
 * route rendered on demand only because something in its tree read a session,
 * and nothing said so, so an unrelated refactor that moved the session read
 * would have made it static with no error and no warning.
 *
 * **The question closed itself the moment the venue line above grew a predicate
 * with a temporal term.** Before, this surface's venue rendering could not go
 * stale, because it did not depend on the clock. Now it opens at an instant
 * nobody writes — and `venue-secrecy.md`, gate *cache e pre-render*, is
 * unconditional about what follows: *ogni superficie che mostra il venue va
 * marcata come dinamica e non cacheabile*. The declaration below is that gate
 * being met, not a plan's preference, which is precisely the authority the
 * findings said the line was missing.
 */
export const dynamic = "force-dynamic";

/**
 * @see the docblock above — this is one page, and the annotation splits it only
 * because the render-mode declaration has to sit at module scope.
 */
export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ticketId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Role and status come from the session, not from a request header. NEITHER
  // IS A TERM IN THE VENUE GATE below, and that is deliberate: the entitlement
  // on this surface is *holding this ticket*, which `.eq("user_id", user.id)`
  // has already established, and adding a role term would make the same night
  // answer two different ways to two holders of the same ticket type.
  const { role, status, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

  // Fetch ticket with joins including party data.
  //
  // ── The four reveal columns on the NIGHT, and why exactly these four ───────
  //
  // `venue_secret`, `date`, `time`, `venue_reveal_hours` and `venue_revealed_at`
  // are the inputs `mayShowVenueToTicketHolder` takes, and they are the same
  // columns the public event page already selects as an ordinary reader — so
  // this select asks the database for nothing it has not already been shown a
  // member may have.
  //
  // NOTE the flag that governs the venue line is `event_parties.venue_secret`,
  // the NIGHT's, and not `events.venue_secret`, the container's. The line renders
  // `event_parties.venue_text`, so the night's flag is the one that owns it; the
  // container's flag is selected for the header and decides nothing here.
  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "*, ticket_tiers(name), events(title, date, venue_secret, cover_image, slug), event_parties(title, date, time, end_time, venue_text, venue_secret, venue_reveal_hours, venue_revealed_at)"
    )
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .single();

  if (!ticket) {
    notFound();
  }

  // Extract joined data
  const event = ticket.events as {
    title: string;
    date: string;
    venue_secret: boolean;
    cover_image: string | null;
    slug: string;
  };
  const tier = ticket.ticket_tiers as { name: string };
  const party = ticket.event_parties as {
    title: string;
    date: string;
    time: string;
    end_time: string | null;
    venue_text: string | null;
    venue_secret: boolean | null;
    venue_reveal_hours: number | null;
    venue_revealed_at: string | null;
  } | null;

  const isMasterTicket = !ticket.party_id;

  // Generate QR code data URL server-side
  const qrDataUrl = await QRCode.toDataURL(generateTicketToken(ticket.id), {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#ededed",
      light: "#00000000",
    },
  });

  // Format date
  const displayDate = party?.date ?? event.date;
  const formattedDate = (() => {
    const d = new Date(displayDate + "T00:00:00");
    const WD = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return `${WD[d.getDay()]}, ${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
  })();

  const displayTime = party?.time ?? "";
  const displayEndTime = party?.end_time ?? null;
  // ⚠️ VENUE SECRECY — the gate that this file did not have until 2026-08-22.
  //
  // A MASTER TICKET carries no night (`party_id` is null), so `party` is null,
  // so there is no free venue text to weigh and the answer is `false` by the
  // shape of the data rather than by a branch. Written as an explicit `false`
  // and not left to a `?.` chain because *default chiuso* wants the refusing
  // case to be the one a reader can see.
  const venueVisibleToHolder = party
    ? mayShowVenueToTicketHolder({
        venueSecret: party.venue_secret,
        partyDate: party.date,
        partyTime: party.time,
        venueRevealHours: party.venue_reveal_hours,
        venueRevealedAt: party.venue_revealed_at,
      })
    : false;

  // The text is bound to `null` when the gate refuses, so the address does not
  // exist as a value on this render at all — it is not merely unrendered. The
  // render site below ALSO tests the gate, and the redundancy is on purpose:
  // one of the two guards is what a person reads and the other is what a
  // mechanical check can point at, and a guard nothing can point at is a guard
  // that gets quietly refactored away.
  const displayVenue = venueVisibleToHolder ? (party?.venue_text ?? null) : null;
  const walletEnabled = isAppleWalletConfigured();

  return (
    <>
      {/*
        The other half of the pairing check E asserts in both directions: the
        files declaring the leading-edge column clearance are exactly the files
        mounting the responsive navigation form. This surface joins both sets in
        the same commit — a mount without a declaration slides content UNDER the
        side column from the tablet tier up, which is the loud failure direction.

        The utility is written whole in the class list and is not spelled in
        prose: Tailwind scans comments, cannot tell a description from a use, and
        an abbreviated one emits a malformed rule and a build warning. It is
        copied verbatim from src/app/(public)/gallery/page.tsx:110.
      */}
      <div className="md:[--nav-inset-inline-start:14rem]">
        <PageShell width="default" className="flex flex-col items-center">
          {/* Success header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-sem-done/10 border border-sem-done/30">
              <span className="text-3xl">&#10003;</span>
            </div>
            <PageTitle>You&apos;re in!</PageTitle>
          </div>

          {/*
            The ticket card. It is a plain container and not the card
            primitive on purpose: the cover image bleeds to its edge, so the
            card carries no padding of its own, and passing a padding override
            to a primitive that already declares one would make the result
            depend on Tailwind's emission order — the trap WR-05 recorded. The
            tree already has this shape written out at
            src/components/media/MediaReviewGrid.tsx:164 and
            src/app/(admin)/admin/newsletter/BroadcastList.tsx:164, both
            converted, both for the same reason.
          */}
          <div className="w-full overflow-hidden rounded-2xl border border-line bg-surface">
            {/* Cover image or gradient */}
            {event.cover_image ? (
              <Image
                src={event.cover_image}
                alt={event.title}
                width={400}
                height={200}
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-accent/30 to-accent/5">
                <span className="text-4xl">&#127925;</span>
              </div>
            )}

            <div className="p-5">
              {/* Brand text */}
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
                Resonate
              </p>

              {/* Event / party title (merged when different) */}
              <h2 className="mb-1 text-xl font-bold tracking-tight">
                {party && party.title !== event.title
                  ? `${event.title} — ${party.title}`
                  : event.title}
              </h2>

              {/* Master ticket badge */}
              {isMasterTicket && (
                <p className="mb-1 text-sm font-medium text-accent">
                  Event Pass
                </p>
              )}

              {/* Tier */}
              <p className="mb-3 text-sm text-muted">{tier.name}</p>

              {/* Date & Time */}
              <div className="mb-2 flex items-center gap-2 text-sm text-muted">
                <span>&#128197;</span>
                <span>{formattedDate}</span>
              </div>
              {displayTime && (
                <div className="mb-2 flex items-center gap-2 text-sm text-muted">
                  <span>&#128336;</span>
                  <span>
                    {formatTime(displayTime)}
                    {displayEndTime && ` - ${formatTime(displayEndTime)}`}
                  </span>
                </div>
              )}

              {/*
                ── The venue line, and the door that is no longer ungated ──────
                ───────────────────────────────────────────────────────────────
                THE COMMENT THAT STOOD HERE DESCRIBED A CONTRACT THAT NO LONGER
                EXISTS, so it was rewritten rather than left. It said these lines
                were byte-for-byte preserved, that their two-space under-indent
                was the record of that preservation, and that this was *"the
                second, ungated door onto information the public event page gates
                behind its own reveal predicate"*. All three sentences were true
                on 2026-08-14 and none is true now: the door is gated, the guard
                is `venueVisibleToHolder`, and the indentation was brought back
                in line with its siblings because the assertion it was protecting
                has been superseded by the owner's decision it was waiting for.

                ── What the guard is, and where it is NOT ─────────────────────

                `venueVisibleToHolder` comes from
                `@/lib/venue-reveal/venue-disclosure`, the one file that decides
                what a surface may show. It is read here, never restated: the
                public event page reads the same module, and the reason it does
                is that this block and that one held the same secret under two
                different expressions for months, which is how the divergence
                happened at all.

                Both guards are tested — the value is `null` unless the gate
                opened, AND the gate is named again on this line. Belt and
                braces on the one act in this product that has no undo.
              */}
              {/* Venue -- the holder sees it once the night's reveal has fired */}
              {venueVisibleToHolder && displayVenue && (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted">
                  <span>&#128205;</span>
                  <span>{displayVenue}</span>
                </div>
              )}

              {/* Dashed divider */}
              <div className="mb-4 border-t border-dashed border-line" />

              {/* QR Code */}
              <div className="flex flex-col items-center">
                <img
                  src={qrDataUrl}
                  alt="Ticket QR Code"
                  width={200}
                  height={200}
                  className="mb-2"
                />
                <p className="text-xs text-muted">
                  Show this QR code at the door
                </p>
              </div>
            </div>
          </div>

          {/* Add to Wallet */}
          {walletEnabled && (
            <div className="mt-4 w-full">
              <Button
                href={`/api/tickets/${ticketId}/wallet`}
                className="w-full"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.5 6.5h-17A1.5 1.5 0 002 8v10a1.5 1.5 0 001.5 1.5h17A1.5 1.5 0 0022 18V8a1.5 1.5 0 00-1.5-1.5zM5 5a1 1 0 011-1h12a1 1 0 011 1v.5H5V5zm14.5 13h-15a.5.5 0 01-.5-.5V11h16v6.5a.5.5 0 01-.5.5z"/>
                </svg>
                Add to Apple Wallet
              </Button>
            </div>
          )}

          {/* Back link */}
          <Link
            href="/events"
            className={`mt-6 inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
          >
            &larr; Back to Events
          </Link>
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
