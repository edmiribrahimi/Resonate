"use server";

import { getServiceClient } from "@/lib/supabase/service";
import { createCheckout } from "@/lib/sumup";
import { verifyTicketToken } from "@/utils/qr";

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

  // Create SumUp checkout
  const checkoutReference = crypto.randomUUID();
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sumup`;

  // Fetch event slug for redirect URL
  const { data: eventForSlug } = await serviceClient
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  // Build redirect URL for APM flows
  const redirectUrl = new URL("/payment/callback", process.env.NEXT_PUBLIC_APP_URL);
  redirectUrl.searchParams.set("ref", checkoutReference);
  redirectUrl.searchParams.set("slug", eventForSlug?.slug ?? "");
  redirectUrl.searchParams.set("ctx", "drink");
  redirectUrl.searchParams.set("party", partyId);

  const response = await createCheckout({
    amount: totalAmount,
    currency: "EUR",
    description,
    checkoutReference,
    returnUrl,
    redirectUrl: redirectUrl.toString(),
  });

  // Create drink order with user_id: null (guest purchase)
  const { data: order, error: insertError } = await serviceClient
    .from("drink_orders")
    .insert({
      event_id: eventId,
      party_id: partyId,
      user_id: null,
      sumup_checkout_id: response.id,
      total_amount: totalAmount,
      status: "pending",
      items: itemsSnapshot,
    })
    .select("id")
    .single();

  if (insertError || !order) {
    console.error("Failed to create drink order:", insertError);
    throw new Error("Failed to initiate drink purchase");
  }

  return { success: true, checkoutId: response.id, orderId: order.id };
}

/**
 * Guest drink token redemption — no authentication required.
 * Verifies HMAC signature and guards that only guest tokens (user_id IS NULL)
 * can be redeemed via this action.
 */
export async function redeemDrinkTokenGuest(
  signedToken: string
): Promise<{ success: true }> {
  // 1. Verify HMAC signature
  const tokenId = verifyTicketToken(signedToken);
  if (!tokenId) {
    throw new Error("Invalid token signature");
  }

  // 2. Fetch token and verify it's a guest token
  const serviceClient = getServiceClient();
  const { data: token, error: tokenError } = await serviceClient
    .from("drink_tokens")
    .select("id, user_id, status")
    .eq("id", tokenId)
    .single();

  if (tokenError || !token) {
    throw new Error("Token not found");
  }

  // 3. Guard: only guest tokens can use this action
  if (token.user_id !== null) {
    throw new Error("Use authenticated redemption flow");
  }

  // 4. Check status
  if (token.status === "redeemed") {
    throw new Error("Already redeemed");
  }

  // 5. Redeem via SECURITY DEFINER function
  const { error: rpcError } = await serviceClient.rpc("redeem_drink_token", {
    p_token_id: tokenId,
  });

  if (rpcError) {
    throw new Error("Redemption failed");
  }

  return { success: true };
}
