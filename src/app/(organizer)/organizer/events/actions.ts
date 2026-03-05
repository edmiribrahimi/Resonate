"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/utils/slugify";
import { createCheckout } from "@/lib/sumup";
import type { AccessType } from "@/types/database";

// Service-role client for operations where RLS blocks legitimate access
// (e.g., master updating events they don't own)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Verify that the current user is an organizer or master.
 * Returns the authenticated user and whether they are the master.
 */
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
    throw new Error("Forbidden: only organizers can manage events");
  }

  return { user, isMaster: profile.role === "master" };
}

/**
 * Verify ownership of an event. Throws if the user is not the owner
 * and is not the master admin.
 */
async function verifyEventOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string,
  isMaster: boolean
) {
  if (isMaster) return; // Master can manage any event

  const { data: event, error } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    throw new Error("Event not found");
  }

  if (event.created_by !== userId) {
    throw new Error("Forbidden: you can only manage your own events");
  }
}

interface PartyInput {
  id?: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  end_time?: string;
  venue_text?: string;
  venue_id?: string;
  lineup?: string[];
  venue_secret?: boolean;
  venue_secret_hint?: string;
  venue_reveal_hours?: number | null;
  venue_reveal_on_purchase?: boolean;
  access_type: AccessType;
  capacity?: number | null;
  sort_order: number;
}

const VALID_ACCESS_TYPES: AccessType[] = ["free_public", "free_rsvp", "paid"];

/**
 * Validate event form data. Returns validated fields or throws on error.
 */
function validateEventData(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const venueSecret = formData.get("venue_secret") === "true";
  const lineupRaw = formData.get("lineup") as string;
  const coverImage = (formData.get("cover_image") as string)?.trim() || null;
  const partiesRaw = formData.get("parties") as string;

  // Title validation
  if (!title || title.length < 3 || title.length > 100) {
    throw new Error("Title must be between 3 and 100 characters");
  }

  // Description validation
  if (!description || description.length < 10 || description.length > 5000) {
    throw new Error("Description must be between 10 and 5000 characters");
  }

  // Parse lineup
  let lineup: string[] = [];
  if (lineupRaw) {
    try {
      lineup = JSON.parse(lineupRaw);
      if (!Array.isArray(lineup)) {
        lineup = [];
      }
    } catch {
      lineup = [];
    }
  }

  // Parse and validate parties (can be empty for simple events)
  let parties: PartyInput[] = [];
  if (partiesRaw) {
    try {
      parties = JSON.parse(partiesRaw);
      if (!Array.isArray(parties)) {
        parties = [];
      }
    } catch {
      parties = [];
    }
  }

  // Validate each party
  const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

  for (const party of parties) {
    if (!party.title || party.title.trim().length === 0) {
      throw new Error("Title is required for each sub-event");
    }
    if (!party.date || isNaN(Date.parse(party.date))) {
      throw new Error("A valid date is required for each sub-event");
    }
    if (!party.time || !timeRegex.test(party.time)) {
      throw new Error("A valid time is required for each sub-event");
    }
    if (party.end_time && !timeRegex.test(party.end_time)) {
      throw new Error("Invalid end time for a sub-event");
    }
    if (!VALID_ACCESS_TYPES.includes(party.access_type)) {
      throw new Error("Invalid access type for a sub-event");
    }
    if (party.capacity !== undefined && party.capacity !== null) {
      const cap = Number(party.capacity);
      if (isNaN(cap) || cap < 1) {
        throw new Error("Capacity must be a positive integer");
      }
      party.capacity = cap;
    }
    // Ensure lineup is an array
    if (party.lineup && !Array.isArray(party.lineup)) {
      party.lineup = [];
    }
    // Ensure venue_secret is boolean
    if (party.venue_secret !== undefined) {
      party.venue_secret = !!party.venue_secret;
    }
    // Validate venue_secret_hint
    if (party.venue_secret_hint && party.venue_secret_hint.length > 500) {
      throw new Error("Venue hint must be 500 characters or less");
    }
    // Validate venue_reveal_hours
    if (party.venue_reveal_hours !== undefined && party.venue_reveal_hours !== null) {
      const hours = Number(party.venue_reveal_hours);
      if (isNaN(hours) || hours < 1 || !Number.isInteger(hours)) {
        throw new Error("Reveal hours must be a positive integer");
      }
      party.venue_reveal_hours = hours;
    }
    // Ensure venue_reveal_on_purchase is boolean
    if (party.venue_reveal_on_purchase !== undefined) {
      party.venue_reveal_on_purchase = !!party.venue_reveal_on_purchase;
    }
  }

  // Date: derive from sub-events if any, otherwise require explicit date from form
  const eventDateRaw = formData.get("date") as string;
  const date = parties.length > 0
    ? parties.map((p) => p.date).sort()[0]
    : eventDateRaw;

  if (!date || isNaN(Date.parse(date))) {
    throw new Error("A valid date is required");
  }

  return {
    title,
    description,
    date,
    venue_secret: venueSecret,
    lineup,
    cover_image: coverImage,
    parties,
  };
}

/** Revalidate all paths that display events */
function revalidateEventPaths(slug?: string) {
  revalidatePath("/organizer/events");
  revalidatePath("/admin/events");
  revalidatePath("/events");
  if (slug) {
    revalidatePath(`/events/${slug}`);
  }
}

// =============================================================
// Server Actions
// =============================================================

/**
 * Create a new event as a draft.
 */
export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const { user } = await verifyOrganizer(supabase);

  const data = validateEventData(formData);

  // Generate slug from title, ensure uniqueness
  let slug = slugify(data.title);

  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const { data: inserted, error } = await supabase
    .from("events")
    .insert({
      title: data.title,
      slug,
      description: data.description,
      date: data.date,
      venue_secret: data.venue_secret,
      lineup: data.lineup,
      cover_image: data.cover_image,
      is_published: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`);
  }

  // Bulk-insert parties
  const partyRows = data.parties.map((p) => ({
    event_id: inserted.id,
    title: p.title.trim(),
    description: p.description?.trim() || null,
    date: p.date,
    time: p.time,
    end_time: p.end_time || null,
    venue_text: p.venue_text?.trim() || null,
    venue_id: p.venue_id || null,
    lineup: p.lineup ?? [],
    venue_secret: p.venue_secret ?? false,
    venue_secret_hint: p.venue_secret_hint?.trim() || null,
    venue_reveal_hours: p.venue_reveal_hours ?? null,
    venue_reveal_on_purchase: p.venue_reveal_on_purchase ?? true,
    access_type: p.access_type,
    capacity: p.capacity ?? null,
    sort_order: p.sort_order,
  }));

  const { error: partyError } = await supabase
    .from("event_parties")
    .insert(partyRows);

  if (partyError) {
    throw new Error(`Failed to create parties: ${partyError.message}`);
  }

  revalidateEventPaths();
  return { success: true, id: inserted.id };
}

/**
 * Update an existing event.
 */
export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);

  await verifyEventOwnership(supabase, eventId, user.id, isMaster);

  const data = validateEventData(formData);

  // Use service-role client for master (bypasses RLS ownership check)
  const client = isMaster ? getServiceClient() : supabase;

  const { error } = await client
    .from("events")
    .update({
      title: data.title,
      description: data.description,
      date: data.date,
      venue_secret: data.venue_secret,
      lineup: data.lineup,
      cover_image: data.cover_image,
    })
    .eq("id", eventId);

  if (error) {
    throw new Error(`Failed to update event: ${error.message}`);
  }

  // Fetch existing parties for this event
  const { data: existingParties } = await client
    .from("event_parties")
    .select("id")
    .eq("event_id", eventId);

  const existingIds = new Set(
    (existingParties ?? []).map((p: { id: string }) => p.id)
  );

  // Determine which parties to update, insert, or delete
  const incomingIds = new Set(
    data.parties.filter((p) => p.id).map((p) => p.id!)
  );
  const idsToDelete = [...existingIds].filter((id) => !incomingIds.has(id));

  // Check if parties to delete have sold tickets
  for (const partyId of idsToDelete) {
    const { count } = await client
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("party_id", partyId);
    if (count && count > 0) {
      throw new Error(
        "Cannot remove a sub-event that has sold tickets"
      );
    }
  }

  // Delete removed parties
  for (const partyId of idsToDelete) {
    await client.from("event_parties").delete().eq("id", partyId);
  }

  // Upsert parties
  for (const party of data.parties) {
    if (party.id && existingIds.has(party.id)) {
      await client
        .from("event_parties")
        .update({
          title: party.title.trim(),
          description: party.description?.trim() || null,
          date: party.date,
          time: party.time,
          end_time: party.end_time || null,
          venue_text: party.venue_text?.trim() || null,
          venue_id: party.venue_id || null,
          lineup: party.lineup ?? [],
          venue_secret: party.venue_secret ?? false,
          venue_secret_hint: party.venue_secret_hint?.trim() || null,
          venue_reveal_hours: party.venue_reveal_hours ?? null,
          venue_reveal_on_purchase: party.venue_reveal_on_purchase ?? true,
          access_type: party.access_type,
          capacity: party.capacity ?? null,
          sort_order: party.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", party.id);
    } else {
      await client.from("event_parties").insert({
        event_id: eventId,
        title: party.title.trim(),
        description: party.description?.trim() || null,
        date: party.date,
        time: party.time,
        end_time: party.end_time || null,
        venue_text: party.venue_text?.trim() || null,
        venue_id: party.venue_id || null,
        lineup: party.lineup ?? [],
        venue_secret: party.venue_secret ?? false,
        venue_secret_hint: party.venue_secret_hint?.trim() || null,
        venue_reveal_hours: party.venue_reveal_hours ?? null,
        venue_reveal_on_purchase: party.venue_reveal_on_purchase ?? true,
        access_type: party.access_type,
        capacity: party.capacity ?? null,
        sort_order: party.sort_order,
      });
    }
  }

  // Fetch slug for path revalidation
  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  revalidateEventPaths(event?.slug);
  return { success: true };
}

/**
 * Delete an event.
 */
export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);

  await verifyEventOwnership(supabase, eventId, user.id, isMaster);

  // Fetch slug before deletion for path revalidation
  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  // Use service-role client for master (bypasses RLS ownership check)
  const client = isMaster ? getServiceClient() : supabase;

  const { error } = await client.from("events").delete().eq("id", eventId);

  if (error) {
    throw new Error(`Failed to delete event: ${error.message}`);
  }

  revalidateEventPaths(event?.slug);
  return { success: true };
}

/**
 * Publish an event (make it visible to members).
 */
export async function publishEvent(eventId: string) {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);

  await verifyEventOwnership(supabase, eventId, user.id, isMaster);

  // Use service-role client for master (bypasses RLS ownership check)
  const client = isMaster ? getServiceClient() : supabase;

  const { error } = await client
    .from("events")
    .update({ is_published: true })
    .eq("id", eventId);

  if (error) {
    throw new Error(`Failed to publish event: ${error.message}`);
  }

  // Fetch slug for path revalidation
  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  revalidateEventPaths(event?.slug);
  return { success: true };
}

/**
 * Unpublish an event (revert to draft).
 */
export async function unpublishEvent(eventId: string) {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);

  await verifyEventOwnership(supabase, eventId, user.id, isMaster);

  // Use service-role client for master (bypasses RLS ownership check)
  const client = isMaster ? getServiceClient() : supabase;

  const { error } = await client
    .from("events")
    .update({ is_published: false })
    .eq("id", eventId);

  if (error) {
    throw new Error(`Failed to unpublish event: ${error.message}`);
  }

  // Fetch slug for path revalidation
  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  revalidateEventPaths(event?.slug);
  return { success: true };
}

/**
 * Initiate a ticket purchase via SumUp hosted checkout.
 * Only approved members can purchase tickets (TICK-07).
 * partyId can be null for event-level (master) tickets.
 */
export async function purchaseTicket(partyId: string | null, tierId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Verify user is approved (TICK-07 guard)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.status !== "approved") {
    throw new Error(
      "Your account must be approved before you can purchase tickets"
    );
  }

  // Fetch tier details to get event_id
  const { data: tier, error: tierError } = await supabase
    .from("ticket_tiers")
    .select("id, name, price, event_id, party_id, quantity, starts_at, expires_at")
    .eq("id", tierId)
    .single();

  if (tierError || !tier) {
    throw new Error("Ticket tier not found");
  }

  const eventId = tier.event_id;

  // Chain-based validation: fetch all tiers for same event/party, ordered by price
  const tierQuery = supabase
    .from("ticket_tiers")
    .select("id, price, quantity, starts_at, expires_at")
    .eq("event_id", eventId)
    .order("price", { ascending: true });

  if (tier.party_id) {
    tierQuery.eq("party_id", tier.party_id);
  } else {
    tierQuery.is("party_id", null);
  }

  const { data: allTiers } = await tierQuery;

  if (allTiers && allTiers.length > 0) {
    const now = new Date();

    // Compute sold count for each tier
    const tierIds = allTiers.map((t) => t.id);
    const { data: soldCounts } = await supabase
      .from("tickets")
      .select("tier_id")
      .in("tier_id", tierIds);

    const soldMap = new Map<string, number>();
    for (const s of soldCounts ?? []) {
      soldMap.set(s.tier_id, (soldMap.get(s.tier_id) ?? 0) + 1);
    }

    // Compute chain status
    type TierStatus = "coming_soon" | "available" | "sold_out" | "expired";
    const statusMap = new Map<string, TierStatus>();

    for (let i = 0; i < allTiers.length; i++) {
      const t = allTiers[i];
      const sold = soldMap.get(t.id) ?? 0;
      const available = t.quantity !== null ? t.quantity - sold : null;

      if (t.starts_at && now < new Date(t.starts_at)) {
        statusMap.set(t.id, "coming_soon");
        continue;
      }
      if (available !== null && available <= 0) {
        statusMap.set(t.id, "sold_out");
        continue;
      }
      if (t.expires_at && now >= new Date(t.expires_at)) {
        statusMap.set(t.id, "expired");
        continue;
      }
      const prev = i > 0 ? allTiers[i - 1] : null;
      if (prev) {
        const prevStatus = statusMap.get(prev.id)!;
        if (prevStatus !== "sold_out" && prevStatus !== "expired") {
          statusMap.set(t.id, "coming_soon");
          continue;
        }
      }
      statusMap.set(t.id, "available");
    }

    const requestedStatus = statusMap.get(tierId);
    if (requestedStatus !== "available") {
      throw new Error(
        `This ticket tier is not available (${requestedStatus ?? "unknown"})`
      );
    }
  }

  if (partyId) {
    // Verify party exists and belongs to same event
    const { data: party, error: partyError } = await supabase
      .from("event_parties")
      .select("id, event_id")
      .eq("id", partyId)
      .single();

    if (partyError || !party) {
      throw new Error("Sub-event not found");
    }

    if (party.event_id !== eventId) {
      throw new Error("Tier does not belong to this sub-event's event");
    }

    // Check user doesn't already have a ticket for this party
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("id")
      .eq("party_id", partyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingTicket) {
      throw new Error("You already have a ticket for this sub-event");
    }
  } else {
    // Event-level master ticket: check duplicate
    const { data: existingTicket } = await supabase
      .from("tickets")
      .select("id")
      .eq("event_id", eventId)
      .is("party_id", null)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingTicket) {
      throw new Error("You already have an Event Pass for this event");
    }
  }

  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("title, slug")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    throw new Error("Event not found");
  }

  // Generate unique checkout reference
  const checkoutReference = crypto.randomUUID();

  // Build URLs
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}?payment=success&ref=${checkoutReference}`;
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sumup`;

  // Create SumUp checkout
  const response = await createCheckout({
    amount: tier.price,
    currency: "EUR",
    description: `${event.title} - ${tier.name}`,
    checkoutReference,
    redirectUrl,
    returnUrl,
  });

  // Create pending purchase record using service-role client (bypass RLS)
  const serviceClient = getServiceClient();
  const { error: insertError } = await serviceClient
    .from("pending_purchases")
    .insert({
      event_id: eventId,
      party_id: partyId,
      tier_id: tierId,
      user_id: user.id,
      sumup_checkout_id: response.id,
      status: "pending",
    });

  if (insertError) {
    console.error("Failed to create pending purchase:", insertError);
    throw new Error("Failed to initiate purchase");
  }

  return { success: true, checkoutUrl: response.hosted_checkout_url };
}
