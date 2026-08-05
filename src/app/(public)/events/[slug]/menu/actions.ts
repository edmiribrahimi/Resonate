"use server";

import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { createCheckout } from "@/lib/sumup";
import { verifyTicketToken } from "@/utils/qr";
import { menuCloseInstant } from "@/utils/datetime";

/**
 * Update menu_closes_at for a party. Only master/organizer can do this.
 */
export async function updateMenuClosesAt(
  partyId: string,
  menuClosesAt: string | null
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "master" && profile.role !== "organizer")) {
    throw new Error("Not authorized");
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("event_parties")
    .update({ menu_closes_at: menuClosesAt || null })
    .eq("id", partyId);

  if (error) throw new Error("Failed to update menu closing time");
  return { success: true };
}

/**
 * Guest drink purchase — no authentication required.
 * Creates a SumUp checkout and drink_orders with user_id: null.
 * Returns orderId so the guest client can persist it in localStorage / URL.
 */
export async function purchaseDrinksGuest(
  eventId: string,
  partyId: string,
  items: { drinkItemId: string; quantity: number }[]
): Promise<{ success: boolean; checkoutId: string; orderId: string }> {
  if (!items || items.length === 0) {
    throw new Error("No items selected");
  }

  const serviceClient = getServiceClient();

  // Check if menu is still open for this party
  const { data: partyData } = await serviceClient
    .from("event_parties")
    .select("date, end_time, menu_closes_at")
    .eq("id", partyId)
    .single();

  if (partyData) {
    const closeTime = partyData.menu_closes_at ?? partyData.end_time;
    if (closeTime && partyData.date) {
      // Next-day closing (party at 23:00, closes at 03:00) is handled inside
      // menuCloseInstant, in Turin time.
      const closeDt = menuCloseInstant(partyData.date, closeTime);
      if (new Date() >= closeDt) {
        throw new Error("The drink menu is closed. No new orders can be placed.");
      }
    }
  }

  // Fetch drink items by IDs
  const drinkItemIds = items.map((i) => i.drinkItemId);
  const { data: drinkItems, error: fetchError } = await serviceClient
    .from("drink_items")
    .select("*")
    .in("id", drinkItemIds)
    .eq("event_id", eventId);

  if (fetchError) {
    throw new Error(`Failed to fetch drink items: ${fetchError.message}`);
  }

  if (!drinkItems || drinkItems.length !== drinkItemIds.length) {
    throw new Error(
      "One or more drink items not found or do not belong to this event"
    );
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

  // Validate minimum amount for SumUp (€1.00)
  if (totalAmount < 1) {
    throw new Error("Minimum order amount is €1.00");
  }

  // Fetch party name for checkout description
  const { data: party } = await serviceClient
    .from("event_parties")
    .select("title")
    .eq("id", partyId)
    .single();

  const itemsList = itemsSnapshot
    .map((i) => `${i.quantity}x ${i.drink_name}`)
    .join(", ");
  const description = party ? `${party.title} - ${itemsList}` : itemsList;

  // Use one UUID as both the drink_orders.id AND the SumUp checkout_reference,
  // so the post-3DS /payment/callback?order=<id> can find the order via DB lookup
  // without needing a SumUp API round-trip.
  const orderId = crypto.randomUUID();
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sumup`;

  // Fetch event slug for redirect URL
  const { data: eventForSlug } = await serviceClient
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

  const response = await createCheckout({
    amount: totalAmount,
    currency: "EUR",
    description,
    checkoutReference: orderId,
    returnUrl,
    redirectUrl: redirectUrl.toString(),
  });

  // Create drink order with user_id: null (guest purchase)
  const { error: insertError } = await serviceClient
    .from("drink_orders")
    .insert({
      id: orderId,
      event_id: eventId,
      party_id: partyId,
      user_id: null,
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

/**
 * Claim guest drink orders after login/register.
 * Links unclaimed orders (user_id IS NULL) to the authenticated user.
 */
export async function claimGuestOrders(
  orderIds: string[]
): Promise<{ claimed: number }> {
  if (!orderIds || orderIds.length === 0) return { claimed: 0 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { claimed: 0 };

  const serviceClient = getServiceClient();

  // Claim drink orders (only those with user_id IS NULL)
  const { data: claimed } = await serviceClient
    .from("drink_orders")
    .update({ user_id: user.id })
    .in("id", orderIds)
    .is("user_id", null)
    .select("id");

  if (claimed && claimed.length > 0) {
    const claimedIds = claimed.map((o) => o.id);
    await serviceClient
      .from("drink_tokens")
      .update({ user_id: user.id })
      .in("order_id", claimedIds)
      .is("user_id", null);
  }

  return { claimed: claimed?.length ?? 0 };
}

export type DrinkTokenAction = "activate" | "serve" | "cancel";

/**
 * Two-step drink token flow for guest (anonymous) tokens:
 *   - "activate": purchased -> active (customer confirms intent to redeem)
 *   - "serve":    active -> redeemed  (bartender finalizes on customer's phone)
 *   - "cancel":   active -> purchased (customer cancels mid-activation)
 *
 * Verifies HMAC signature and guards that only guest tokens (user_id IS NULL)
 * can use this action, then dispatches to the matching SECURITY DEFINER RPC.
 */
export async function redeemDrinkTokenGuest(
  signedToken: string,
  action: DrinkTokenAction
): Promise<{ success: true }> {
  const tokenId = verifyTicketToken(signedToken);
  if (!tokenId) {
    throw new Error("Invalid token signature");
  }

  const serviceClient = getServiceClient();
  const { data: token, error: tokenError } = await serviceClient
    .from("drink_tokens")
    .select("id, user_id, status, party_id")
    .eq("id", tokenId)
    .single();

  if (tokenError || !token) {
    throw new Error("Token not found");
  }

  if (token.user_id !== null) {
    throw new Error("Use authenticated redemption flow");
  }

  if (token.status === "refunded") {
    throw new Error("Token has been refunded");
  }

  if (token.status === "redeemed" && action !== "serve") {
    throw new Error("Already redeemed");
  }

  // Activation requires the menu/grace window to still be open
  if (action === "activate" && token.party_id) {
    const { data: party } = await serviceClient
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
