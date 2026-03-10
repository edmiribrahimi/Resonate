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

// =============================================================
// Discount Code Server Actions
// =============================================================

/**
 * Create a new discount code for a party.
 */
export async function createDiscountCode(
  eventId: string,
  partyId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);

  await verifyEventOwnership(supabase, eventId, user.id, isMaster);

  // Validate inputs
  const code = (formData.get("code") as string)?.trim();
  if (!code || code.length < 1) {
    throw new Error("Discount code is required");
  }

  const discountType = formData.get("discount_type") as string;
  if (discountType !== "percentage" && discountType !== "fixed") {
    throw new Error("Invalid discount type (percentage or fixed)");
  }

  const discountAmountRaw = formData.get("discount_amount") as string;
  const discountAmount = parseFloat(discountAmountRaw);
  if (isNaN(discountAmount) || discountAmount <= 0) {
    throw new Error("Discount amount must be greater than 0");
  }

  if (discountType === "percentage" && discountAmount > 100) {
    throw new Error("Discount percentage cannot exceed 100%");
  }

  const maxUsesRaw = (formData.get("max_uses") as string)?.trim() || null;
  const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;
  if (maxUses !== null && (isNaN(maxUses) || maxUses < 1)) {
    throw new Error("Max uses must be a positive integer");
  }

  const isActive = formData.get("is_active") !== "false";

  const tierIdsRaw = (formData.get("tier_ids") as string)?.trim() || null;
  let tierIds: string[] = [];
  if (tierIdsRaw) {
    try {
      tierIds = JSON.parse(tierIdsRaw);
    } catch {
      throw new Error("Invalid tier_ids format");
    }
  }

  // Use service-role client for master (bypasses RLS ownership check)
  const client = isMaster ? getServiceClient() : supabase;

  const { data: discountCode, error } = await client
    .from("discount_codes")
    .insert({
      party_id: partyId,
      code,
      discount_type: discountType,
      discount_amount: discountAmount,
      max_uses: maxUses,
      is_active: isActive,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A code with this name already exists for this event");
    }
    throw new Error(`Failed to create discount code: ${error.message}`);
  }

  // Insert tier associations if specified
  if (tierIds.length > 0 && discountCode) {
    const junctionRows = tierIds.map((tierId) => ({
      discount_code_id: discountCode.id,
      tier_id: tierId,
    }));

    const { error: junctionError } = await client
      .from("discount_code_tiers")
      .insert(junctionRows);

    if (junctionError) {
      throw new Error(`Failed to associate tiers: ${junctionError.message}`);
    }
  }

  revalidatePath(`/organizer/events/${eventId}/tickets`);
  return { success: true };
}

/**
 * Update an existing discount code.
 */
export async function updateDiscountCode(
  discountCodeId: string,
  eventId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);

  await verifyEventOwnership(supabase, eventId, user.id, isMaster);

  // Validate inputs
  const code = (formData.get("code") as string)?.trim();
  if (!code || code.length < 1) {
    throw new Error("Discount code is required");
  }

  const discountType = formData.get("discount_type") as string;
  if (discountType !== "percentage" && discountType !== "fixed") {
    throw new Error("Invalid discount type (percentage or fixed)");
  }

  const discountAmountRaw = formData.get("discount_amount") as string;
  const discountAmount = parseFloat(discountAmountRaw);
  if (isNaN(discountAmount) || discountAmount <= 0) {
    throw new Error("Discount amount must be greater than 0");
  }

  if (discountType === "percentage" && discountAmount > 100) {
    throw new Error("Discount percentage cannot exceed 100%");
  }

  const maxUsesRaw = (formData.get("max_uses") as string)?.trim() || null;
  const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;
  if (maxUses !== null && (isNaN(maxUses) || maxUses < 1)) {
    throw new Error("Max uses must be a positive integer");
  }

  const isActive = formData.get("is_active") !== "false";

  const tierIdsRaw = (formData.get("tier_ids") as string)?.trim() || null;
  let tierIds: string[] | null = null;
  if (tierIdsRaw) {
    try {
      tierIds = JSON.parse(tierIdsRaw);
    } catch {
      throw new Error("Invalid tier_ids format");
    }
  }

  const client = isMaster ? getServiceClient() : supabase;

  const { error } = await client
    .from("discount_codes")
    .update({
      code,
      discount_type: discountType,
      discount_amount: discountAmount,
      max_uses: maxUses,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", discountCodeId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("A code with this name already exists for this event");
    }
    throw new Error(`Failed to update discount code: ${error.message}`);
  }

  // Update tier associations: delete existing, re-insert if provided
  if (tierIds !== null) {
    // Delete existing junction rows
    const { error: deleteError } = await client
      .from("discount_code_tiers")
      .delete()
      .eq("discount_code_id", discountCodeId);

    if (deleteError) {
      throw new Error(`Failed to remove tier associations: ${deleteError.message}`);
    }

    // Insert new junction rows (if any)
    if (tierIds.length > 0) {
      const junctionRows = tierIds.map((tierId) => ({
        discount_code_id: discountCodeId,
        tier_id: tierId,
      }));

      const { error: junctionError } = await client
        .from("discount_code_tiers")
        .insert(junctionRows);

      if (junctionError) {
        throw new Error(`Failed to associate tiers: ${junctionError.message}`);
      }
    }
  }

  revalidatePath(`/organizer/events/${eventId}/tickets`);
  return { success: true };
}

/**
 * Delete a discount code. Only allowed if the code has not been used.
 */
export async function deleteDiscountCode(
  discountCodeId: string,
  eventId: string
) {
  const supabase = await createClient();
  const { user, isMaster } = await verifyOrganizer(supabase);

  await verifyEventOwnership(supabase, eventId, user.id, isMaster);

  const client = isMaster ? getServiceClient() : supabase;

  // Check if discount code has been used on any tickets
  const { count, error: countError } = await client
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("discount_code_id", discountCodeId);

  if (countError) {
    throw new Error(`Failed to check usage: ${countError.message}`);
  }

  if (count && count > 0) {
    throw new Error("Cannot delete a discount code that has been used");
  }

  const { error } = await client
    .from("discount_codes")
    .delete()
    .eq("id", discountCodeId);

  if (error) {
    throw new Error(`Failed to delete discount code: ${error.message}`);
  }

  revalidatePath(`/organizer/events/${eventId}/tickets`);
  return { success: true };
}

/**
 * Validate a discount code for buyer-side display.
 * This is a PUBLIC action -- any authenticated user can validate.
 */
export async function validateDiscountCode(
  partyId: string,
  code: string
): Promise<{
  id: string;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
  applicable_tier_ids: string[] | null;
}> {
  const supabase = await createClient();

  const { data: discountCode, error } = await supabase
    .from("discount_codes")
    .select("id, discount_type, discount_amount, max_uses, is_active")
    .eq("party_id", partyId)
    .ilike("code", code.trim())
    .single();

  if (error || !discountCode) {
    throw new Error("Invalid code");
  }

  if (!discountCode.is_active) {
    throw new Error("Code is no longer active");
  }

  // Check usage limits
  if (discountCode.max_uses !== null) {
    const { count } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("discount_code_id", discountCode.id);

    if ((count ?? 0) >= discountCode.max_uses) {
      throw new Error("Code usage limit reached");
    }
  }

  // Check tier restrictions
  const { data: tierRestrictions } = await supabase
    .from("discount_code_tiers")
    .select("tier_id")
    .eq("discount_code_id", discountCode.id);

  const applicableTierIds =
    tierRestrictions && tierRestrictions.length > 0
      ? tierRestrictions.map((t) => t.tier_id)
      : null;

  return {
    id: discountCode.id,
    discount_type: discountCode.discount_type as "percentage" | "fixed",
    discount_amount: discountCode.discount_amount,
    applicable_tier_ids: applicableTierIds,
  };
}
