import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import MobileNav from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { formatTime } from "@/utils/formatTime";
import RefundRequestButton from "./RefundRequestButton";
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

  // Fetch refund status for this ticket
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: refund } = await serviceClient
    .from("ticket_refunds")
    .select("id, status, reason, admin_note, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Generate QR code data URL server-side
  const qrDataUrl = await QRCode.toDataURL(ticket.id, {
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
  const formattedDate = new Date(
    displayDate + "T00:00:00"
  ).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const displayTime = party?.time ?? "";
  const displayEndTime = party?.end_time ?? null;
  const displayVenue = party?.venue_text ?? null;

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

            {/* Event title */}
            <h2 className="mb-1 text-xl font-bold tracking-tight">
              {event.title}
            </h2>

            {/* Master ticket or party title */}
            {isMasterTicket ? (
              <p className="mb-1 text-sm font-medium text-accent">
                Event Pass
              </p>
            ) : party ? (
              <p className="mb-1 text-sm font-medium text-accent">
                {party.title}
              </p>
            ) : null}

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

        {/* Refund section */}
        <div className="mt-6 w-full max-w-sm">
          {refund?.status === "pending" && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
              <p className="text-sm font-medium text-yellow-400">
                Refund request pending
              </p>
              {refund.reason && (
                <p className="mt-1 text-xs text-muted">Reason: {refund.reason}</p>
              )}
            </div>
          )}
          {refund?.status === "approved" && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
              <p className="text-sm font-medium text-green-400">
                Refund approved
              </p>
            </div>
          )}
          {refund?.status === "rejected" && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
              <p className="text-sm font-medium text-red-400">
                Refund rejected
              </p>
              {refund.admin_note && (
                <p className="mt-1 text-xs text-muted">{refund.admin_note}</p>
              )}
            </div>
          )}
          {!refund && (
            <RefundRequestButton ticketId={ticketId} />
          )}
        </div>

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
