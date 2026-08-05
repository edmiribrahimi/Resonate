import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getResend } from "@/lib/email";
import { VenueRevealEmail } from "@/emails/venue-reveal";
import { render } from "@react-email/render";
import { formatTime, formatEventDate } from "@/utils/formatTime";
import { partyStartInstant } from "@/utils/datetime";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const resend = getResend();
  const fromAddress =
    process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>";

  const now = new Date();

  // Find secret-venue parties where venue_reveal_email_sent = false
  // and the reveal window has opened (now >= party_datetime - venue_reveal_hours)
  const { data: parties } = await supabase
    .from("event_parties")
    .select("id, title, date, time, venue_secret, venue_reveal_hours, venue_reveal_email_sent, venue_id, venue_text, event_id, events(title, slug), venues(name, address)")
    .eq("venue_secret", true)
    .eq("venue_reveal_email_sent", false);

  if (!parties || parties.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Filter to parties where the reveal window has opened
  const revealParties = parties.filter((p) => {
    // Turin wall-clock time, not the runtime's zone: a two-hour drift here can
    // push the reveal past this daily run and into the next one — i.e. after
    // the doors have opened.
    const partyDateTime = partyStartInstant(p.date, p.time);
    // Only process future or very recent events (not old ones)
    if (partyDateTime < new Date(now.getTime() - 24 * 60 * 60 * 1000)) return false;
    const hours = p.venue_reveal_hours ?? 24;
    const revealAt = new Date(partyDateTime.getTime() - hours * 60 * 60 * 1000);
    return now >= revealAt;
  });

  let totalSent = 0;

  for (const party of revealParties) {
    const event = party.events as unknown as { title: string; slug: string };
    const venue = party.venues as unknown as { name: string; address: string | null } | null;
    const venueName = venue?.name || (party.venue_text as string) || "See event page";
    const venueAddress = venue?.address || undefined;

    // Fetch ticket holders with venue_reveal_sent = false
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, user_id, profiles(email, full_name)")
      .eq("party_id", party.id)
      .eq("venue_reveal_sent", false);

    // Fetch RSVP holders with venue_reveal_sent = false
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("id, user_id, profiles(email, full_name)")
      .eq("party_id", party.id)
      .eq("venue_reveal_sent", false);

    // Also fetch master ticket holders (event-level tickets, party_id IS NULL)
    const { data: masterTickets } = await supabase
      .from("tickets")
      .select("id, user_id, profiles(email, full_name)")
      .eq("event_id", party.event_id)
      .is("party_id", null)
      .eq("venue_reveal_sent", false);

    // Deduplicate by email
    const emailMap = new Map<
      string,
      { name: string; ticketIds: string[]; rsvpIds: string[] }
    >();

    for (const ticket of [...(tickets || []), ...(masterTickets || [])]) {
      const profile = ticket.profiles as unknown as { email: string; full_name: string } | null;
      if (!profile) continue;
      const existing = emailMap.get(profile.email) || {
        name: profile.full_name || "Member",
        ticketIds: [],
        rsvpIds: [],
      };
      existing.ticketIds.push(ticket.id);
      emailMap.set(profile.email, existing);
    }

    for (const rsvp of rsvps || []) {
      const profile = rsvp.profiles as unknown as { email: string; full_name: string } | null;
      if (!profile) continue;
      const existing = emailMap.get(profile.email) || {
        name: profile.full_name || "Member",
        ticketIds: [],
        rsvpIds: [],
      };
      existing.rsvpIds.push(rsvp.id);
      emailMap.set(profile.email, existing);
    }

    if (emailMap.size === 0) {
      // No recipients but still mark as sent to avoid re-processing
      await supabase
        .from("event_parties")
        .update({ venue_reveal_email_sent: true })
        .eq("id", party.id);
      continue;
    }

    const formattedDate = formatEventDate(party.date);
    const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`;

    // Build batch emails (max 100 per request)
    const entries = Array.from(emailMap.entries());
    for (let i = 0; i < entries.length; i += 100) {
      const batch = entries.slice(i, i + 100);
      const emailPromises = batch.map(async ([email, data]) => {
        const html = await render(
          VenueRevealEmail({
            memberName: data.name,
            eventTitle: event.title,
            partyTitle: party.title,
            eventDate: formattedDate,
            eventTime: formatTime(party.time),
            venueName,
            venueAddress,
            eventUrl,
          })
        );
        return {
          from: fromAddress,
          to: [email],
          subject: `Venue Revealed: ${event.title}`,
          html,
        };
      });

      const emails = await Promise.all(emailPromises);

      try {
        await resend.batch.send(emails);
        totalSent += emails.length;
      } catch (err) {
        console.error("Batch send failed for party", party.id, err);
      }
    }

    // Mark all processed tickets and rsvps as venue_reveal_sent
    const allTicketIds = entries.flatMap(([, d]) => d.ticketIds);
    const allRsvpIds = entries.flatMap(([, d]) => d.rsvpIds);

    if (allTicketIds.length > 0) {
      await supabase
        .from("tickets")
        .update({ venue_reveal_sent: true })
        .in("id", allTicketIds);
    }

    if (allRsvpIds.length > 0) {
      await supabase
        .from("rsvps")
        .update({ venue_reveal_sent: true })
        .in("id", allRsvpIds);
    }

    // Mark party as venue_reveal_email_sent
    await supabase
      .from("event_parties")
      .update({ venue_reveal_email_sent: true })
      .eq("id", party.id);
  }

  return NextResponse.json({ sent: totalSent });
}
