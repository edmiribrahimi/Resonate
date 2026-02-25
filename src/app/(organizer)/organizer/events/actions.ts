"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/utils/slugify";

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

/**
 * Validate event form data. Returns validated fields or throws on error.
 */
function validateEventData(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const location = (formData.get("location") as string)?.trim() || null;
  const locationSecret = formData.get("location_secret") === "true";
  const lineupRaw = formData.get("lineup") as string;
  const coverImage = (formData.get("cover_image") as string)?.trim() || null;
  const capacityRaw = formData.get("capacity") as string;

  // Title validation
  if (!title || title.length < 3 || title.length > 100) {
    throw new Error("Title must be between 3 and 100 characters");
  }

  // Description validation
  if (!description || description.length < 10 || description.length > 5000) {
    throw new Error("Description must be between 10 and 5000 characters");
  }

  // Date validation
  if (!date || isNaN(Date.parse(date))) {
    throw new Error("A valid date is required");
  }

  // Time validation
  if (!time || !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    throw new Error("A valid time is required (HH:MM)");
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

  // Capacity validation
  let capacity: number | null = null;
  if (capacityRaw && capacityRaw.trim() !== "") {
    const parsed = parseInt(capacityRaw, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new Error("Capacity must be a positive integer");
    }
    capacity = parsed;
  }

  return {
    title,
    description,
    date,
    time,
    location,
    location_secret: locationSecret,
    lineup,
    cover_image: coverImage,
    capacity,
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
      time: data.time,
      location: data.location,
      location_secret: data.location_secret,
      lineup: data.lineup,
      cover_image: data.cover_image,
      capacity: data.capacity,
      is_published: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`);
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
      time: data.time,
      location: data.location,
      location_secret: data.location_secret,
      lineup: data.lineup,
      cover_image: data.cover_image,
      capacity: data.capacity,
    })
    .eq("id", eventId);

  if (error) {
    throw new Error(`Failed to update event: ${error.message}`);
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
