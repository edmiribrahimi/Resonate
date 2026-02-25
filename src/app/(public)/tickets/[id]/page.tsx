import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import MobileNav from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
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

  // Fetch ticket with joins -- user_id check ensures members can only view their own tickets
  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "*, ticket_tiers(name), events(title, date, time, location, location_secret, cover_image, slug)"
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
    time: string;
    location: string | null;
    location_secret: boolean;
    cover_image: string | null;
    slug: string;
  };
  const tier = ticket.ticket_tiers as { name: string };

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
  const formattedDate = new Date(
    event.date + "T00:00:00"
  ).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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

            {/* Tier */}
            <p className="mb-3 text-sm text-muted">{tier.name}</p>

            {/* Date & Time */}
            <div className="mb-2 flex items-center gap-2 text-sm text-muted">
              <span>&#128197;</span>
              <span>{formattedDate}</span>
            </div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted">
              <span>&#128336;</span>
              <span>{event.time}</span>
            </div>

            {/* Location -- ticket holder always sees it */}
            {event.location && (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted">
                <span>&#128205;</span>
                <span>{event.location}</span>
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
