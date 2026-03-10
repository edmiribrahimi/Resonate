"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPostHogServer } from "@/lib/posthog/server";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyOrganizer(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.role !== "organizer" && profile.role !== "master") {
    throw new Error("Forbidden: only organizers can manage guest lists");
  }

  return { user, isMaster: profile.role === "master" };
}

async function verifyEventOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string,
  isMaster: boolean
) {
  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, created_by")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    throw new Error("Event not found");
  }

  if (!isMaster && event.created_by !== userId) {
    throw new Error("Forbidden: you do not own this event");
  }

  return event;
}

/**
 * Bulk add guests from CSV import.
 * Inserts entries into guest_list_entries with ON CONFLICT deduplication.
 * For guests with email, processes them sequentially with rate limiting.
 */
export async function bulkAddGuests(
  eventId: string,
  guests: {
    first_name: string;
    last_name: string;
    email?: string;
    party_id?: string;
  }[]
): Promise<{
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}> {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);
  await verifyEventOwnership(supabase, eventId, user.id, isMaster);

  const serviceClient = getServiceClient();
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const guest of guests) {
    const firstName = guest.first_name?.trim();
    const lastName = guest.last_name?.trim();

    if (!firstName || !lastName) {
      failed++;
      errors.push(
        `Missing name for guest: ${firstName || ""} ${lastName || ""}`
      );
      continue;
    }

    const email = guest.email?.trim().toLowerCase() || null;

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      failed++;
      errors.push(`Invalid email format: ${email}`);
      continue;
    }

    // Insert with ON CONFLICT handling via upsert for email-based dedup
    try {
      if (email) {
        // Check for existing entry with this email at this event
        const { data: existing } = await serviceClient
          .from("guest_list_entries")
          .select("id")
          .eq("event_id", eventId)
          .ilike("email", email)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }
      }

      const { error: insertError } = await serviceClient
        .from("guest_list_entries")
        .insert({
          event_id: eventId,
          party_id: guest.party_id || null,
          first_name: firstName,
          last_name: lastName,
          email,
          added_by: user.id,
          status: email ? "pending" : "pending",
        });

      if (insertError) {
        // Handle unique constraint violation
        if (insertError.code === "23505") {
          skipped++;
          continue;
        }
        failed++;
        errors.push(
          `Failed to add ${firstName} ${lastName}: ${insertError.message}`
        );
        continue;
      }

      imported++;

      // For guests with email, process them via processGuestEntry
      // with rate limiting (500ms delay between each)
      if (email) {
        try {
          // Dynamically import to handle case where process-entry.ts
          // may not exist yet (Plan 02 dependency)
          const { processGuestEntry } = await import(
            "@/lib/guest-list/process-entry"
          );

          // Fetch the inserted entry to get its ID
          const { data: entry } = await serviceClient
            .from("guest_list_entries")
            .select("id, event_id, party_id, first_name, last_name, email")
            .eq("event_id", eventId)
            .ilike("email", email)
            .single();

          if (entry) {
            // Get event details for email
            const { data: eventData } = await serviceClient
              .from("events")
              .select("title, date")
              .eq("id", eventId)
              .single();

            const { data: partyData } = entry.party_id
              ? await serviceClient
                  .from("event_parties")
                  .select("title, time")
                  .eq("id", entry.party_id)
                  .single()
              : { data: null };

            await processGuestEntry(entry, {
              title: eventData?.title ?? "Event",
              date: eventData?.date ?? "",
              time: partyData?.time ?? "",
              partyTitle: partyData?.title,
            });
          }

          // Rate limiting: 500ms delay between processing
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch {
          // processGuestEntry not available or failed - entry stays as pending
          // Will be processed when Plan 02 is executed and organizer triggers processing
        }
      }
    } catch (err) {
      failed++;
      errors.push(
        `Failed to add ${firstName} ${lastName}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  revalidatePath(`/organizer/events/${eventId}/guest-list`);

  const posthog = getPostHogServer();
  posthog.capture({
    distinctId: user.id,
    event: "guest_list_csv_import",
    properties: {
      event_id: eventId,
      imported,
      skipped,
      failed,
    },
  });

  return { imported, skipped, failed, errors };
}

/**
 * Clone guest list from a previous event to a target event.
 * Copies name + email only; status reset to pending, no auto-processing.
 */
export async function cloneGuestList(
  sourceEventId: string,
  targetEventId: string,
  targetPartyId?: string
): Promise<{ cloned: number; skipped: number; error?: string }> {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);

  // Verify access to both events
  await verifyEventOwnership(supabase, sourceEventId, user.id, isMaster);
  await verifyEventOwnership(supabase, targetEventId, user.id, isMaster);

  const serviceClient = getServiceClient();

  // Fetch all guest_list_entries from source event (name + email only)
  const { data: sourceEntries, error: fetchError } = await serviceClient
    .from("guest_list_entries")
    .select("first_name, last_name, email")
    .eq("event_id", sourceEventId);

  if (fetchError) {
    return { cloned: 0, skipped: 0, error: fetchError.message };
  }

  if (!sourceEntries || sourceEntries.length === 0) {
    return { cloned: 0, skipped: 0, error: "No entries found in source event" };
  }

  let cloned = 0;
  let skipped = 0;

  for (const entry of sourceEntries) {
    // Check for existing entry at target event (by email if available)
    if (entry.email) {
      const { data: existing } = await serviceClient
        .from("guest_list_entries")
        .select("id")
        .eq("event_id", targetEventId)
        .ilike("email", entry.email)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }
    }

    const { error: insertError } = await serviceClient
      .from("guest_list_entries")
      .insert({
        event_id: targetEventId,
        party_id: targetPartyId || null,
        first_name: entry.first_name,
        last_name: entry.last_name,
        email: entry.email,
        added_by: user.id,
        status: "pending",
      });

    if (insertError) {
      // Unique constraint violation = skip
      if (insertError.code === "23505") {
        skipped++;
        continue;
      }
      // Other error - continue with remaining entries
      skipped++;
      continue;
    }

    cloned++;
  }

  revalidatePath(`/organizer/events/${targetEventId}/guest-list`);

  const posthog = getPostHogServer();
  posthog.capture({
    distinctId: user.id,
    event: "guest_list_clone",
    properties: {
      source_event_id: sourceEventId,
      target_event_id: targetEventId,
      cloned,
      skipped,
    },
  });

  return { cloned, skipped };
}

/**
 * Fetch organizer's events for the clone source picker.
 */
export async function fetchOrganizerEvents(excludeEventId: string) {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);
  const serviceClient = getServiceClient();

  let query = serviceClient
    .from("events")
    .select("id, title, date")
    .neq("id", excludeEventId)
    .order("date", { ascending: false })
    .limit(20);

  if (!isMaster) {
    query = query.eq("created_by", user.id);
  }

  const { data: events } = await query;

  // Only return events that have guest list entries
  const eventsWithGuests = [];
  for (const event of events ?? []) {
    const { count } = await serviceClient
      .from("guest_list_entries")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);

    if (count && count > 0) {
      eventsWithGuests.push({ ...event, guestCount: count });
    }
  }

  return eventsWithGuests;
}
