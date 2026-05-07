import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import MobileNav from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { formatTime } from "@/utils/formatTime";
import { generateTicketToken } from "@/utils/qr";
import { isAppleWalletConfigured } from "@/lib/apple-wallet";
import type { UserRole, UserStatus } from "@/types/database";

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

  // Read role and status from middleware-injected headers
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

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
    <div className="min-h-dvh pb-24">
      <div className="flex flex-col items-center px-6 pt-12">
        {/* Success header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 border border-green-500/30">
            <span className="text-3xl">&#10003;</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            You&apos;re in!
          </h1>
        </div>

        {/* Ticket card */}
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-card-border bg-card">
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

            {/* Venue -- ticket holder always sees it */}
            {displayVenue && (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted">
                <span>&#128205;</span>
                <span>{displayVenue}</span>
              </div>
            )}

            {/* Dashed divider */}
            <div className="mb-4 border-t border-dashed border-card-border" />

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
          <div className="mt-4 w-full max-w-sm">
            <a
              href={`/api/tickets/${ticketId}/wallet`}
              className="flex items-center justify-center gap-2 w-full rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 active:scale-95 active:opacity-80"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.5 6.5h-17A1.5 1.5 0 002 8v10a1.5 1.5 0 001.5 1.5h17A1.5 1.5 0 0022 18V8a1.5 1.5 0 00-1.5-1.5zM5 5a1 1 0 011-1h12a1 1 0 011 1v.5H5V5zm14.5 13h-15a.5.5 0 01-.5-.5V11h16v6.5a.5.5 0 01-.5.5z"/>
              </svg>
              Add to Apple Wallet
            </a>
          </div>
        )}

        {/* Back link */}
        <Link
          href="/events"
          className="mt-6 text-sm text-muted hover:text-foreground transition-colors"
        >
          &larr; Back to Events
        </Link>
      </div>

      <MobileNav role={role} status={status} />
    </div>
  );
}
