"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getServiceClient } from "@/lib/supabase/service";
import { processGuestEntry } from "@/lib/guest-list/process-entry";
import { getPostHogServer } from "@/lib/posthog/server";
import type { UserRole } from "@/types/database";

/**
 * Verify the caller is an organizer or master who owns the event.
 * Returns the authenticated user's ID.
 */
async function verifyOrganizerAccess(eventId: string): Promise<string> {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const userId = headersList.get("x-user-id") || "";

  if (role !== "organizer" && role !== "master") {
    throw new Error("Forbidden: organizer or master access required");
  }

  if (role === "organizer") {
    const serviceClient = getServiceClient();
    const { data: event } = await serviceClient
      .from("events")
      .select("created_by")
      .eq("id", eventId)
      .single();

    if (!event || event.created_by !== userId) {
      throw new Error("Forbidden: you do not own this event");
    }
  }

  return userId;
}

/**
 * Add a guest to the event guest list.
 * If email is provided, the guest is auto-processed (registered/approved/ticketed/emailed).
 */
export async function addGuest(
  eventId: string,
  data: {
    first_name: string;
    last_name: string;
    email?: string;
    party_id?: string;
  }
) {
  try {
    const userId = await verifyOrganizerAccess(eventId);
    const serviceClient = getServiceClient();

    // Validate required fields
    const firstName = data.first_name?.trim();
    const lastName = data.last_name?.trim();
    if (!firstName || !lastName) {
      return { error: "First name and last name are required" };
    }

    // Normalize email
    let email: string | null = null;
    if (data.email) {
      email = data.email.trim().toLowerCase();
      // Basic email format validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: "Invalid email format" };
      }
    }

    const partyId = data.party_id || null;

    // Insert into guest_list_entries
    const { data: entry, error: insertError } = await serviceClient
      .from("guest_list_entries")
      .insert({
        event_id: eventId,
        party_id: partyId,
        first_name: firstName,
        last_name: lastName,
        email,
        added_by: userId,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation on (event_id, LOWER(email))
      if (
        insertError.code === "23505" ||
        insertError.message?.includes("duplicate") ||
        insertError.message?.includes("unique")
      ) {
        return { error: "This email is already on the guest list" };
      }
      return { error: `Failed to add guest: ${insertError.message}` };
    }

    // If email provided, auto-process the entry
    if (email) {
      // Fetch event details for the email template
      const { data: event } = await serviceClient
        .from("events")
        .select("title, date")
        .eq("id", eventId)
        .single();

      let partyTitle: string | undefined;
      let partyTime = "";
      if (partyId) {
        const { data: party } = await serviceClient
          .from("event_parties")
          .select("title, time")
          .eq("id", partyId)
          .single();
        partyTitle = party?.title;
        partyTime = party?.time || "";
      }

      // Process the entry (register user, create ticket, send email)
      await processGuestEntry(
        {
          id: entry.id,
          event_id: eventId,
          party_id: partyId,
          first_name: firstName,
          last_name: lastName,
          email,
        },
        {
          title: event?.title || "Event",
          date: event?.date || "",
          time: partyTime,
          partyTitle,
        }
      );
    }

    revalidatePath(`/organizer/events/${eventId}/guest-list`);

    const posthog = getPostHogServer();
    posthog.capture({
      distinctId: userId,
      event: "guest_list_add",
      properties: {
        event_id: eventId,
        has_email: !!email,
        party_id: partyId,
      },
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: message };
  }
}

/**
 * Remove a guest from the guest list.
 * The ticket (if issued) remains valid -- only the guest list entry is removed.
 */
export async function removeGuest(entryId: string, eventId: string) {
  try {
    const userId = await verifyOrganizerAccess(eventId);
    const serviceClient = getServiceClient();

    // Fetch the entry to check if a ticket was issued
    const { data: entry } = await serviceClient
      .from("guest_list_entries")
      .select("ticket_id, event_id")
      .eq("id", entryId)
      .single();

    if (!entry) {
      return { error: "Guest list entry not found" };
    }

    const hadTicket = !!entry.ticket_id;

    // Delete the guest list entry
    const { error: deleteError } = await serviceClient
      .from("guest_list_entries")
      .delete()
      .eq("id", entryId);

    if (deleteError) {
      return { error: `Failed to remove guest: ${deleteError.message}` };
    }

    revalidatePath(`/organizer/events/${eventId}/guest-list`);

    const posthog = getPostHogServer();
    posthog.capture({
      distinctId: userId,
      event: "guest_list_remove",
      properties: {
        event_id: eventId,
        had_ticket: hadTicket,
      },
    });

    return { success: true, hadTicket };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: message };
  }
}

/**
 * Fetch guest list entries for an event (used by the page server component).
 */
export async function fetchGuestList(eventId: string) {
  const serviceClient = getServiceClient();

  const { data: entries, error } = await serviceClient
    .from("guest_list_entries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch guest list:", error);
    return [];
  }

  return entries ?? [];
}
