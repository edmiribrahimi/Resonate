import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { EventReminderEmail } from "@/emails/event-reminder";
import { render } from "@react-email/render";
import { formatTime } from "@/utils/formatTime";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromAddress =
    process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>";

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find parties happening in the next 24 hours
  const { data: parties } = await supabase
    .from("event_parties")
    .select("id, title, date, time, event_id, events(title, slug)")
    .gte("date", now.toISOString().split("T")[0])
    .lte("date", in24h.toISOString().split("T")[0]);

  if (!parties || parties.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Filter to parties whose date+time is within the next 24h
  const upcomingParties = parties.filter((p) => {
    const partyDateTime = new Date(`${p.date}T${p.time}`);
    return partyDateTime > now && partyDateTime <= in24h;
  });

  let totalSent = 0;

  for (const party of upcomingParties) {
    const event = party.events as unknown as { title: string; slug: string };

    // Fetch tickets with reminder_sent = false for this party
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, user_id, profiles(email, full_name)")
      .eq("party_id", party.id)
      .eq("reminder_sent", false);

    // Fetch RSVPs with reminder_sent = false for this party
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("id, user_id, profiles(email, full_name)")
      .eq("party_id", party.id)
      .eq("reminder_sent", false);

    // Deduplicate by email
    const emailMap = new Map<
      string,
      { name: string; ticketIds: string[]; rsvpIds: string[] }
    >();

    for (const ticket of tickets || []) {
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

    if (emailMap.size === 0) continue;

    const formattedDate = new Date(
      party.date + "T00:00:00"
    ).toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`;

    // Build batch emails (max 100 per request)
    const entries = Array.from(emailMap.entries());
    for (let i = 0; i < entries.length; i += 100) {
      const batch = entries.slice(i, i + 100);
      const emailPromises = batch.map(async ([email, data]) => {
        const html = await render(
          EventReminderEmail({
            memberName: data.name,
            eventTitle: event.title,
            partyTitle: party.title,
            eventDate: formattedDate,
            eventTime: formatTime(party.time),
            eventUrl,
          })
        );
        return {
          from: fromAddress,
          to: [email],
          subject: `Reminder: ${event.title} is tomorrow!`,
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

    // Mark all processed tickets and rsvps as reminder_sent
    const allTicketIds = entries.flatMap(([, d]) => d.ticketIds);
    const allRsvpIds = entries.flatMap(([, d]) => d.rsvpIds);

    if (allTicketIds.length > 0) {
      await supabase
        .from("tickets")
        .update({ reminder_sent: true })
        .in("id", allTicketIds);
    }

    if (allRsvpIds.length > 0) {
      await supabase
        .from("rsvps")
        .update({ reminder_sent: true })
        .in("id", allRsvpIds);
    }
  }

  return NextResponse.json({ sent: totalSent });
}
