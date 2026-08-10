"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/utils/slugify";
import { createCheckout } from "@/lib/sumup";
import { verifyTicketToken } from "@/utils/qr";
import type { AccessType, DrinkItem } from "@/types/database";
import { menuCloseInstant } from "@/utils/datetime";
import {
  assertEventOwnership,
  assertStaffManage,
} from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";

// Service-role client for operations where RLS blocks legitimate access
// (e.g., master updating events they don't own)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * The local `verifyOrganizer` and `verifyEventOwnership` are GONE, not unused,
 * and so is the fifth, INLINE copy of the ownership check that used to live in
 * `reorderDrinkItems`. All of them are now one definition in
 * `@/lib/capabilities/guards`.
 *
 * **The shape every gated action below follows:**
 *
 *   const supabase = await createClient();
 *   const ctx = await assertStaffManage();          // resolve ONCE
 *   await assertEventOwnership(supabase, eventId, ctx);
 *
 * `assertStaffManage()` is called **exactly once per invocation**. `cache()`
 * does not memoise inside a Server Action body (measured — see
 * `@/lib/capabilities/server`), so asking twice is two full round trips that
 * neither `npm run build` nor a fast connection will show you.
 *
 * The ownership read still uses `supabase`, the cookie client, exactly as
 * `verifyEventOwnership` did: RLS applies to it. This conversion changes who
 * may call, never what a call can see. The `getServiceClient()` uses further
 * down (the master write branch, `pending_purchases`, `drink_orders`,
 * `drink_items` reordering, the token RPCs) are untouched for the same reason.
 *
 * **`isMaster` became `ctx.capabilities.has(CAP.MASTER_MANAGE)`, and that is a
 * measured equivalence, not a rename.** The grant table
 * (`20260807000000_capability_model.sql:395`) holds exactly one row for the key,
 * `('master', 'master.manage', false)` — role `master`, status ignored — byte-
 * equal to the `profile.role === "master"` it replaces. The service-client
 * branch is therefore taken by exactly the same callers as before.
 *
 * **What is NOT gated here, stated rather than left to be discovered.**
 * `getDrinkItems` below has no gate, and it must not acquire one: it is reached
 * from `src/app/(public)/events/[slug]/menu/page.tsx`, the customer-facing
 * drinks menu. The phase-32 container read matrix measures `drink_items` as
 * **2 of 2 rows readable by `anon`** — the menu works *because* RLS permits an
 * anonymous read, and `assertStaffManage()` on it would refuse every guest
 * standing at the bar. Its boundary is that RLS policy, deliberately.
 */

interface PartyInput {
  id?: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  end_time?: string;
  menu_closes_at?: string;
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
    if (party.menu_closes_at && !timeRegex.test(party.menu_closes_at)) {
      throw new Error("Invalid menu closing time for a sub-event");
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
  const ctx = await assertStaffManage();

  // Narrowed ONCE, here, rather than with a `!` at the `created_by` write below.
  // `assertStaffManage()` throws unless the caller holds `staff.manage`, which
  // implies an authenticated subject — but TypeScript does not know that, and
  // `ACCESS-MODEL-DECISIONS.md` §5 makes attribution a requirement. A `!` that
  // turned out to be wrong would write a null into an ownership column and
  // nothing in this project would report it: there is no error tracking.
  if (!ctx.userId) {
    throw new Error("capabilities.resolve_failed: no_subject");
  }

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
      created_by: ctx.userId,
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
    menu_closes_at: p.menu_closes_at || null,
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
  const ctx = await assertStaffManage();

  await assertEventOwnership(supabase, eventId, ctx);

  const data = validateEventData(formData);

  // Use service-role client for master (bypasses RLS ownership check)
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

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
          menu_closes_at: party.menu_closes_at || null,
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
        menu_closes_at: party.menu_closes_at || null,
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
  const ctx = await assertStaffManage();

  await assertEventOwnership(supabase, eventId, ctx);

  // Fetch slug before deletion for path revalidation
  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  // Use service-role client for master (bypasses RLS ownership check)
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

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
  const ctx = await assertStaffManage();

  await assertEventOwnership(supabase, eventId, ctx);

  // Use service-role client for master (bypasses RLS ownership check)
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

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
  const ctx = await assertStaffManage();

  await assertEventOwnership(supabase, eventId, ctx);

  // Use service-role client for master (bypasses RLS ownership check)
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

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
export async function purchaseTicket(partyId: string | null, tierId: string, discountCodeId?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Verify user has a profile (pending users CAN purchase — approval happens on successful payment)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.status === "rejected") {
    throw new Error(
      "Your account has been rejected and cannot purchase tickets"
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

  // Discount validation (only for party-specific tiers with a discount code)
  let finalPrice = tier.price;
  let validatedDiscountCodeId: string | null = null;

  if (discountCodeId && partyId) {
    // Fetch and validate discount code
    const { data: code, error: codeError } = await supabase
      .from("discount_codes")
      .select("id, party_id, discount_type, discount_amount, max_uses, is_active")
      .eq("id", discountCodeId)
      .single();

    if (codeError || !code) throw new Error("Invalid discount code");
    if (!code.is_active) throw new Error("Discount code is no longer active");
    if (code.party_id !== partyId) throw new Error("Code not valid for this event");

    // Check tier applicability
    const { data: tierRestrictions } = await supabase
      .from("discount_code_tiers")
      .select("tier_id")
      .eq("discount_code_id", code.id);

    if (tierRestrictions && tierRestrictions.length > 0) {
      const applicableTierIds = tierRestrictions.map(t => t.tier_id);
      if (!applicableTierIds.includes(tierId)) {
        throw new Error("Code not valid for this tier");
      }
    }

    // Check usage limits
    if (code.max_uses !== null) {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("discount_code_id", code.id);
      if ((count ?? 0) >= code.max_uses) throw new Error("Code usage limit reached");
    }

    // Compute discounted price
    if (code.discount_type === "percentage") {
      finalPrice = Math.round(tier.price * (1 - code.discount_amount / 100) * 100) / 100;
    } else {
      finalPrice = Math.round((tier.price - code.discount_amount) * 100) / 100;
    }

    // SumUp minimum EUR 1.00
    if (finalPrice < 1.00) {
      throw new Error("Discount would bring price below minimum (€1.00)");
    }

    validatedDiscountCodeId = code.id;
  }

  // Use one UUID as both the pending_purchases.id AND the SumUp checkout_reference,
  // so the post-3DS /payment/callback?purchase=<id> can find the record via DB lookup.
  const purchaseId = crypto.randomUUID();

  // Build webhook URL (return_url triggers SumUp webhook after payment)
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sumup`;

  // Build redirect URL for APM and 3DS flows
  const redirectUrl = new URL("/payment/callback", process.env.NEXT_PUBLIC_APP_URL);
  redirectUrl.searchParams.set("purchase", purchaseId);
  redirectUrl.searchParams.set("slug", event.slug);
  redirectUrl.searchParams.set("ctx", "ticket");

  // Create SumUp checkout
  const response = await createCheckout({
    amount: finalPrice,
    currency: "EUR",
    description: `${event.title} - ${tier.name}`,
    checkoutReference: purchaseId,
    returnUrl,
    redirectUrl: redirectUrl.toString(),
  });

  // Create pending purchase record using service-role client (bypass RLS)
  const serviceClient = getServiceClient();
  const { error: insertError } = await serviceClient
    .from("pending_purchases")
    .insert({
      id: purchaseId,
      event_id: eventId,
      party_id: partyId,
      tier_id: tierId,
      user_id: user.id,
      sumup_checkout_id: response.id,
      status: "pending",
      discount_code_id: validatedDiscountCodeId,
    });

  if (insertError) {
    console.error("Failed to create pending purchase:", insertError);
    throw new Error("Failed to initiate purchase");
  }

  return { success: true, checkoutId: response.id, purchaseId };
}

// =============================================================
// Drink Menu CRUD & Purchase
// =============================================================

/**
 * Fetch drink items for a party (or event if no partyId), ordered by sort_order.
 */
export async function getDrinkItems(eventId: string, partyId?: string): Promise<DrinkItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("drink_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (partyId) {
    query = query.eq("party_id", partyId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch drink items: ${error.message}`);
  }

  return data as DrinkItem[];
}

/**
 * Add a drink item to a party's menu.
 */
export async function addDrinkItem(
  eventId: string,
  name: string,
  price: number,
  partyId?: string
): Promise<DrinkItem> {
  const supabase = await createClient();
  await assertStaffManage();

  // Get next sort_order scoped to party
  let sortQuery = supabase
    .from("drink_items")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (partyId) {
    sortQuery = sortQuery.eq("party_id", partyId);
  }

  const { data: existing } = await sortQuery;
  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("drink_items")
    .insert({
      event_id: eventId,
      party_id: partyId ?? null,
      name: name.trim(),
      price,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add drink item: ${error.message}`);
  }

  revalidatePath("/admin/events");
  return data as DrinkItem;
}

/**
 * Update a drink item.
 */
export async function updateDrinkItem(
  itemId: string,
  data: { name?: string; price?: number; is_available?: boolean }
): Promise<void> {
  const supabase = await createClient();
  await assertStaffManage();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.price !== undefined) updates.price = data.price;
  if (data.is_available !== undefined) updates.is_available = data.is_available;

  const { error } = await supabase
    .from("drink_items")
    .update(updates)
    .eq("id", itemId);

  if (error) {
    throw new Error(`Failed to update drink item: ${error.message}`);
  }

  revalidatePath("/admin/events");
}

/**
 * Remove a drink item.
 */
export async function removeDrinkItem(itemId: string): Promise<void> {
  const supabase = await createClient();
  await assertStaffManage();

  const { error } = await supabase
    .from("drink_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw new Error(`Failed to remove drink item: ${error.message}`);
  }

  revalidatePath("/admin/events");
}

/**
 * Reorder drink items by overwriting their sort_order with the array index.
 * Caller is expected to pass the full ordered list of ids for the same scope
 * (event_id + party_id) so the UI and DB stay in sync.
 */
export async function reorderDrinkItems(
  eventId: string,
  ids: string[]
): Promise<{ success: true }> {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  // This was the FIFTH copy of the ownership check — inline rather than named,
  // with the master case as an `if (!isMaster)` wrapper instead of a
  // short-circuit. Same truth table, a third shape. It is now the one shared
  // definition, which also gains the null-`created_by` refusal the inline form
  // never had: `event.created_by !== user.id` with a null owner and a real user
  // refused by luck, and would have ADMITTED had both been null.
  await assertEventOwnership(supabase, eventId, ctx);

  if (ids.length === 0) return { success: true };

  const serviceClient = getServiceClient();
  await Promise.all(
    ids.map((id, index) =>
      serviceClient
        .from("drink_items")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("event_id", eventId)
    )
  );

  revalidatePath("/admin/events");
  return { success: true };
}

/**
 * Initiate a drink purchase via SumUp checkout.
 * Creates a drink_orders row and returns the checkout ID for card widget.
 */
export async function purchaseDrinks(
  eventId: string,
  partyId: string,
  items: { drinkItemId: string; quantity: number }[]
): Promise<{ success: boolean; checkoutId: string; orderId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  if (!items || items.length === 0) {
    throw new Error("No items selected");
  }

  // Fetch drink items by IDs
  const drinkItemIds = items.map((i) => i.drinkItemId);
  const { data: drinkItems, error: fetchError } = await supabase
    .from("drink_items")
    .select("*")
    .in("id", drinkItemIds)
    .eq("event_id", eventId);

  if (fetchError) {
    throw new Error(`Failed to fetch drink items: ${fetchError.message}`);
  }

  if (!drinkItems || drinkItems.length !== drinkItemIds.length) {
    throw new Error("One or more drink items not found or do not belong to this event");
  }

  // Validate availability
  const drinkMap = new Map(drinkItems.map((d) => [d.id, d]));
  for (const item of items) {
    const drink = drinkMap.get(item.drinkItemId);
    if (!drink) {
      throw new Error(`Drink item not found: ${item.drinkItemId}`);
    }
    if (!drink.is_available) {
      throw new Error(`Drink "${drink.name}" is not currently available`);
    }
    if (item.quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }
  }

  // Calculate total and build items snapshot
  let totalAmount = 0;
  const itemsSnapshot = items.map((item) => {
    const drink = drinkMap.get(item.drinkItemId)!;
    const lineTotal = drink.price * item.quantity;
    totalAmount += lineTotal;
    return {
      drink_item_id: drink.id,
      drink_name: drink.name,
      price: drink.price,
      quantity: item.quantity,
    };
  });

  // Fetch party name for checkout description
  const { data: party } = await supabase
    .from("event_parties")
    .select("title")
    .eq("id", partyId)
    .single();

  const itemsList = itemsSnapshot
    .map((i) => `${i.quantity}x ${i.drink_name}`)
    .join(", ");
  const description = party ? `${party.title} - ${itemsList}` : itemsList;

  // Use one UUID as both the drink_orders.id AND the SumUp checkout_reference,
  // so the post-3DS /payment/callback?order=<id> can find the order via DB lookup.
  const orderId = crypto.randomUUID();
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sumup`;

  // Fetch event slug for redirect URL
  const { data: eventForSlug } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  // Build redirect URL for APM and 3DS flows
  const redirectUrl = new URL("/payment/callback", process.env.NEXT_PUBLIC_APP_URL);
  redirectUrl.searchParams.set("order", orderId);
  redirectUrl.searchParams.set("slug", eventForSlug?.slug ?? "");
  redirectUrl.searchParams.set("ctx", "drink");
  redirectUrl.searchParams.set("party", partyId);

  // Create SumUp checkout
  const response = await createCheckout({
    amount: totalAmount,
    currency: "EUR",
    description,
    checkoutReference: orderId,
    returnUrl,
    redirectUrl: redirectUrl.toString(),
  });

  // Create drink order using service client (bypass RLS)
  const serviceClient = getServiceClient();
  const { error: insertError } = await serviceClient
    .from("drink_orders")
    .insert({
      id: orderId,
      event_id: eventId,
      party_id: partyId,
      user_id: user.id,
      sumup_checkout_id: response.id,
      total_amount: totalAmount,
      status: "pending",
      items: itemsSnapshot,
    });

  if (insertError) {
    console.error("Failed to create drink order:", insertError);
    throw new Error("Failed to initiate drink purchase");
  }

  return { success: true, checkoutId: response.id, orderId };
}

// =============================================================
// Drink Token Redemption
// =============================================================

export type DrinkTokenAction = "activate" | "serve" | "cancel";

/**
 * Two-step drink token flow for authenticated users:
 *   - "activate": purchased -> active (customer confirms intent to redeem)
 *   - "serve":    active -> redeemed  (bartender finalizes on customer's phone)
 *   - "cancel":   active -> purchased (customer cancels mid-activation)
 *
 * Verifies HMAC signature, ownership, refund/expiry, then dispatches to the
 * matching SECURITY DEFINER RPC.
 */
export async function redeemDrinkToken(
  signedToken: string,
  action: DrinkTokenAction
): Promise<{ success: true }> {
  // 1. Verify HMAC signature
  const tokenId = verifyTicketToken(signedToken);
  if (!tokenId) {
    throw new Error("Invalid token signature");
  }

  // 2. Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // 3. Verify ownership and current status
  const { data: token, error: tokenError } = await supabase
    .from("drink_tokens")
    .select("id, user_id, status, party_id")
    .eq("id", tokenId)
    .single();

  if (tokenError || !token) {
    throw new Error("Token not found");
  }

  if (token.user_id !== user.id) {
    throw new Error("Not your token");
  }

  if (token.status === "refunded") {
    throw new Error("Token has been refunded");
  }

  if (token.status === "redeemed" && action !== "serve") {
    throw new Error("Already redeemed");
  }

  // 3b. Activation requires the menu/grace window to still be open
  if (action === "activate" && token.party_id) {
    const { data: party } = await supabase
      .from("event_parties")
      .select("date, end_time, menu_closes_at")
      .eq("id", token.party_id)
      .single();

    if (party) {
      const closeTime = party.menu_closes_at ?? party.end_time;
      if (closeTime && party.date) {
        const closeDt = menuCloseInstant(party.date, closeTime);
        const graceEnd = new Date(closeDt.getTime() + 60 * 60 * 1000);
        if (new Date() > graceEnd) {
          throw new Error("Token expired — grace period has ended");
        }
      }
    }
  }

  const rpcName =
    action === "activate"
      ? "activate_drink_token"
      : action === "serve"
        ? "redeem_drink_token"
        : "deactivate_drink_token";

  const serviceClient = getServiceClient();
  const { data: applied, error: rpcError } = await serviceClient.rpc(rpcName, {
    p_token_id: tokenId,
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  // All three RPCs return false when they did nothing because the token was
  // already in the target state. Discarding that boolean is how a second press
  // pours a second drink: no error is raised, so the caller reports success and
  // the screen says SERVED again.
  if (applied === false) {
    throw new Error(
      action === "serve"
        ? "This token has already been served"
        : action === "activate"
          ? "This token is already active"
          : "This token is not active"
    );
  }

  return { success: true };
}
