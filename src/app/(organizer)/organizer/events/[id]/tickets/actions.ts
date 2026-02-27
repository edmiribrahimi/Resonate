"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for operations where RLS blocks legitimate access
// (e.g., master managing tiers for events they don't own)
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
    throw new Error("Forbidden: only organizers can manage ticket tiers");
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
    throw new Error("Forbidden: you can only manage tiers for your own events");
  }
}

// =============================================================
// Server Actions
// =============================================================

/**
 * Create a new ticket tier for an event.
 */
export async function createTier(eventId: string, partyId: string | null, formData: FormData) {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);

  await verifyEventOwnership(supabase, eventId, user.id, isMaster);

  // Validate inputs
  const name = (formData.get("name") as string)?.trim();
  if (!name || name.length < 1 || name.length > 100) {
    throw new Error("Tier name is required (1-100 characters)");
  }

  const priceRaw = formData.get("price") as string;
  const price = parseFloat(priceRaw);
  if (isNaN(price) || price < 0) {
    throw new Error("Price must be a number >= 0");
  }

  const quantityRaw = (formData.get("quantity") as string)?.trim() || null;
  const quantity = quantityRaw ? parseInt(quantityRaw, 10) : null;
  if (quantity !== null && (isNaN(quantity) || quantity < 1)) {
    throw new Error("Quantity must be a positive integer");
  }

  const showRemaining = formData.get("show_remaining") !== "false";

  const startsAtRaw = (formData.get("starts_at") as string)?.trim() || null;
  const starts_at = startsAtRaw ? new Date(startsAtRaw).toISOString() : null;

  const expiresAtRaw = (formData.get("expires_at") as string)?.trim() || null;
  const expires_at = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;

  // Use service-role client for master (bypasses RLS ownership check)
  const client = isMaster ? getServiceClient() : supabase;

  const { error } = await client.from("ticket_tiers").insert({
    event_id: eventId,
    party_id: partyId || null,
    name,
    price,
    quantity,
    show_remaining: showRemaining,
    starts_at,
    expires_at,
  });

  if (error) {
    throw new Error(`Failed to create tier: ${error.message}`);
  }

  revalidatePath(`/organizer/events/${eventId}/tickets`);
  return { success: true };
}

/**
 * Update an existing ticket tier.
 * Tiers are fully editable always -- organizer can change price, name,
 * and quantity at any time, even after sales. Existing tickets remain
 * valid at their original price.
 */
export async function updateTier(
  tierId: string,
  eventId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);

  await verifyEventOwnership(supabase, eventId, user.id, isMaster);

  // Validate inputs
  const name = (formData.get("name") as string)?.trim();
  if (!name || name.length < 1 || name.length > 100) {
    throw new Error("Tier name is required (1-100 characters)");
  }

  const priceRaw = formData.get("price") as string;
  const price = parseFloat(priceRaw);
  if (isNaN(price) || price < 0) {
    throw new Error("Price must be a number >= 0");
  }

  const quantityRaw = (formData.get("quantity") as string)?.trim() || null;
  const quantity = quantityRaw ? parseInt(quantityRaw, 10) : null;
  if (quantity !== null && (isNaN(quantity) || quantity < 1)) {
    throw new Error("Quantity must be a positive integer");
  }

  const showRemaining = formData.get("show_remaining") !== "false";

  const startsAtRaw = (formData.get("starts_at") as string)?.trim() || null;
  const starts_at = startsAtRaw ? new Date(startsAtRaw).toISOString() : null;

  const expiresAtRaw = (formData.get("expires_at") as string)?.trim() || null;
  const expires_at = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;

  // Use service-role client for master (bypasses RLS ownership check)
  const client = isMaster ? getServiceClient() : supabase;

  const { error } = await client
    .from("ticket_tiers")
    .update({ name, price, quantity, show_remaining: showRemaining, starts_at, expires_at })
    .eq("id", tierId);

  if (error) {
    throw new Error(`Failed to update tier: ${error.message}`);
  }

  revalidatePath(`/organizer/events/${eventId}/tickets`);
  return { success: true };
}

/**
 * Delete a ticket tier. Only allowed if the tier has zero sales.
 */
export async function deleteTier(tierId: string, eventId: string) {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);

  await verifyEventOwnership(supabase, eventId, user.id, isMaster);

  // Check ticket count -- tiers with existing sales cannot be deleted
  const client = isMaster ? getServiceClient() : supabase;

  const { count, error: countError } = await client
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("tier_id", tierId);

  if (countError) {
    throw new Error(`Failed to check ticket sales: ${countError.message}`);
  }

  if (count && count > 0) {
    throw new Error("Cannot delete a tier with existing sales");
  }

  const { error } = await client
    .from("ticket_tiers")
    .delete()
    .eq("id", tierId);

  if (error) {
    throw new Error(`Failed to delete tier: ${error.message}`);
  }

  revalidatePath(`/organizer/events/${eventId}/tickets`);
  return { success: true };
}
