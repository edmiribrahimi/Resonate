"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { RsvpConfirmationEmail } from "@/emails/rsvp-confirmation";
import { render } from "@react-email/render";
import { formatTime } from "@/utils/formatTime";

/**
 * RSVP to a free_rsvp party.
 */
export async function rsvpToParty(partyId: string, eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Verify user is approved
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "approved") {
    throw new Error("Your account must be approved to RSVP");
  }

  // Verify party is free_rsvp
  const { data: party } = await supabase
    .from("event_parties")
    .select("access_type")
    .eq("id", partyId)
    .single();

  if (!party || party.access_type !== "free_rsvp") {
    throw new Error("This party does not accept RSVPs");
  }

  // Check no existing RSVP
  const { data: existing } = await supabase
    .from("rsvps")
    .select("id")
    .eq("party_id", partyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    throw new Error("You have already RSVPd to this party");
  }

  const { error } = await supabase.from("rsvps").insert({
    event_id: eventId,
    party_id: partyId,
    user_id: user.id,
  });

  if (error) {
    throw new Error(`Failed to RSVP: ${error.message}`);
  }

  // Fire-and-forget: send RSVP confirmation email
  (async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .single();

      const { data: event } = await supabase
        .from("events")
        .select("title, slug")
        .eq("id", eventId)
        .single();

      const { data: partyData } = await supabase
        .from("event_parties")
        .select("title, date, time")
        .eq("id", partyId)
        .single();

      if (profile && event && partyData) {
        const formattedDate = new Date(
          partyData.date + "T00:00:00"
        ).toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        const html = await render(
          RsvpConfirmationEmail({
            memberName: profile.full_name || "Member",
            eventTitle: event.title,
            partyTitle: partyData.title,
            eventDate: formattedDate,
            eventTime: formatTime(partyData.time),
            eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`,
          })
        );

        await sendEmail({
          to: profile.email,
          subject: `You're in for ${event.title}`,
          html,
        });
      }
    } catch (emailError) {
      console.error("RSVP confirmation email failed (non-blocking)", emailError);
    }
  })();

  revalidatePath("/events");
  return { success: true };
}

/**
 * Cancel RSVP for a party.
 */
export async function cancelRsvp(partyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("rsvps")
    .delete()
    .eq("party_id", partyId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to cancel RSVP: ${error.message}`);
  }

  revalidatePath("/events");
  return { success: true };
}
