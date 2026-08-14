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
 * ── 1. The venue line, and the divergence that is deliberate ─────────────────
 *
 * The select below asks for the night's stored secrecy flag **and never reads
 * it**; the venue line renders the night's free venue text **unconditionally**
 * to the holder of the ticket. The public event page gates the same information
 * behind its own reveal predicate. The two predicates therefore **diverge**, and
 * the divergence is deliberate and documented in place at the render site.
 *
 * **This plan preserved the divergence; it did not reconcile it.** Making this
 * page agree with the event page would be a behaviour change on the one act in
 * this product that cannot be undone, decided by a visual conversion. The
 * assignment, the render block and the render block's own comment are
 * byte-identical before and after, and the flag's occurrence count is unchanged
 * — so a later reader can still tell that this file **holds** the flag and does
 * not **consult** it. If it ever looks consulted, the file has grown a predicate
 * it does not have.
 *
 * The free text is content somebody typed, so a text that names a place was
 * published by whoever typed it. That is not a leak of the gated column. It is
 * still a **second, ungated door onto the same information**, and the full exit
 * enumeration for this surface — including the one that leaves the product — is
 * written in `41.2-08-FINDINGS.md`, rebuilt by reading the code as
 * `venue-secrecy.md` requires rather than carried forward.
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
 * ── 4. The render mode is derived, and that is an OWNER question ─────────────
 *
 * This route renders on demand today only because something in its tree reads a
 * session — it does not **declare** its render mode. A one-line declaration
 * would close the same gap D-37-09 closed on the public event page: a later edit
 * that moved the session read would make this page static again with no error
 * and no warning. **The line is not added here.** The precedent for that
 * declaration is a declared decision, not a plan's inference, and a visual
 * conversion that hardened a venue guard on its own authority would be doing the
 * right thing by the wrong route. It is recorded as a question owed to the
 * owner, with its measurement, in `41.2-08-FINDINGS.md`.
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

  // Role and status come from the session, not from a request header. Nothing
  // below reads either: the ticket is fetched by `.eq("user_id", user.id)` and
  // the venue line renders `event_parties.venue_text` for the holder of that
  // ticket, exactly as before. This conversion touches neither.
  const { role, status, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

  // Fetch ticket with joins including party data
  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "*, ticket_tiers(name), events(title, date, venue_secret, cover_image, slug), event_parties(title, date, time, end_time, venue_text)"
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
  const displayVenue = party?.venue_text ?? null;
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
                THE SIX LINES BELOW ARE PRESERVED BYTE FOR BYTE, INDENTATION
                INCLUDED, and their two-space under-indent relative to their
                siblings is the record of that, not a slip. This is the second,
                ungated door onto information the public event page gates behind
                its own reveal predicate; the divergence is deliberate and this
                conversion did not reconcile it. The block was asserted identical
                before and after the diff at the byte level, which is the only
                assertion worth making on a guard whose failure has no undo — and
                re-indenting it would have cost that assertion its qualifier-free
                form. Do not tidy the whitespace without re-taking the
                comparison.
              */}
            {/* Venue -- ticket holder always sees it */}
            {displayVenue && (
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
