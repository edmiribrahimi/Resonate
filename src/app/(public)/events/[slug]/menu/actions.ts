"use server";

import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { createCheckout } from "@/lib/sumup";
import { verifyTicketToken } from "@/utils/qr";
import { menuCloseInstant } from "@/utils/datetime";
import { logMoneyPathFailure } from "@/lib/failure/money-path";

import { redactDbError } from "@/lib/errors/redact";
/**
 * Why the three causes below travel as a VALUE, and why they stay three.
 *
 * ── The value, not the message ───────────────────────────────────────────────
 *
 * Until plan 46-04 this action threw on all three, and **all three arrived
 * identical in production**: Next redacts the message of an error thrown out of
 * a Server Action in a production build, stated at the source in
 * `src/lib/capabilities/server.ts:58-63`. Rewording a `throw` would therefore
 * not have been a fix — a caller that branches on message text works in
 * `next dev` and stops working where it counts. The category has to be a
 * returned value or it does not survive the build that matters.
 *
 * ── Three, and not one ───────────────────────────────────────────────────────
 *
 * D-46-10b: *you may not do this* and *it did not save* are different facts to
 * an organizer. The first sends them to find someone who may; the second is
 * theirs to retry. Collapsing them into one catch would replace a silent failure
 * with a collapsed one — the newsletter form is this repository's own recorded
 * precedent for that shape, one message for a network fault, a missing key and
 * an already-subscribed address alike (`.planning/codebase/CONCERNS.md`,
 * `meta-gates.md`). *Nobody is signed in* is kept apart from both for the reason
 * the original code already gave below: an anonymous caller would be refused by
 * the capability test anyway, but "nobody is here" is not "this person may not".
 *
 * ── The `Record` is the trip-wire ────────────────────────────────────────────
 *
 * `MENU_CLOSE_ERROR` is total over `MenuCloseRefusal` (the construction of
 * `src/lib/door/outcome.ts:278-302`, shared by `src/lib/failure/money-path.ts`).
 * A fourth cause added without its sentence is an `npm run build` error, not a
 * category that renders as nothing. In a repository with no test runner that
 * build is the only automatic gate there is — proved by mutation in plan 46-04,
 * task 3, and the proof is recorded in `46-04-SUMMARY.md`.
 *
 * The sentences are the approved ones and are not composed here: they come from
 * `.planning/phases/46-silent-failures-on-the-money-path/46-COPY.md` §1, signed
 * off in one pass on 2026-08-14. A plan that wants different words amends that
 * list and re-presents it whole.
 *
 * ── Module-private, and the reason is measured rather than assumed ───────────
 *
 * The constants and the map are **not exported**, and the type is. The caller
 * needs the category to branch on and the words to draw; it gets the words
 * already resolved in `error`, so it never reads the map. That is the shape of
 * the analog this conversion copies: `src/app/(admin)/admin/events/actions.ts`
 * exports `NightRefusal` and `EventWriteResult` as types and keeps
 * `nightRefusalSentence` private.
 *
 * Exporting the map was **probed, not assumed**, because this is a `"use server"`
 * file and Next's documented contract for one is async-function exports only:
 * with `export const MENU_CLOSE_ERROR`, `npm run build` on 2026-08-14 was green.
 * So the build tolerates it here — and it stays private anyway, because an
 * export nothing imports is an invitation for the next reader to pull it into
 * the client component, which is the case the documented contract covers and
 * this probe did not.
 */
const MENU_CLOSE_NOT_SIGNED_IN = "menu_close_not_signed_in";
const MENU_CLOSE_NOT_PERMITTED = "menu_close_not_permitted";
const MENU_CLOSE_WRITE_FAILED = "menu_close_write_failed";

/** The three literals as a union, so the `Record` below can be total over them. */
export type MenuCloseRefusal =
  | typeof MENU_CLOSE_NOT_SIGNED_IN
  | typeof MENU_CLOSE_NOT_PERMITTED
  | typeof MENU_CLOSE_WRITE_FAILED;

/**
 * One sentence per cause, written once (46-COPY.md §1).
 *
 * The database `code` is appended to the third and to nothing else, in
 * parentheses, exactly as `src/app/(admin)/admin/events/actions.ts:368` already
 * does on the same kind of surface: a PostgREST code is a class of failure, not
 * a row and not a person. It is appended where the result is built, so the
 * sentences here stay byte-identical to the approved list.
 */
const MENU_CLOSE_ERROR: Record<MenuCloseRefusal, string> = {
  [MENU_CLOSE_NOT_SIGNED_IN]:
    "This session is no longer signed in, so the closing time was not changed. Sign in again and set it.",
  [MENU_CLOSE_NOT_PERMITTED]:
    "This account may not set the closing time for a night — an organizer has to do it. Nothing was changed.",
  [MENU_CLOSE_WRITE_FAILED]:
    "Saving the closing time failed. It is unchanged — the bar menu still closes when it did before. Try again.",
};

/**
 * What the menu-closing command returns. `refusal` and `error` are present only
 * when `success` is false — the shape of `EventWriteResult`
 * (`src/app/(admin)/admin/events/actions.ts:276-282`), widened additively so the
 * caller reads the category and the words without a second lookup.
 */
export type MenuCloseResult = {
  success: boolean;
  error?: string;
  refusal?: MenuCloseRefusal;
};

/**
 * Update menu_closes_at for a party. Only master/organizer can do this.
 *
 * **`staff.manage`, and the equivalence was measured.** The deleted predicate
 * read `role in (master, organizer)` off a `select("role")` — `status` was never
 * fetched, so it could not be part of the test. `private.role_capabilities`
 * grants `staff.manage` to `master` and to `organizer` with
 * `requires_approved = false` on both rows
 * (`20260807000000_capability_model.sql:392-393`): the same predicate, row for
 * row. `CAP_DESCRIPTIONS["staff.manage"]` names *parties* and *drinks* by hand.
 * `catalogue.manage` was rejected — it carries `requires_approved = true`
 * (`:399-400`) and would refuse a pending organizer who can set this today.
 *
 * **The gate runs BEFORE the service-client write, and that order is the whole
 * point.** `partyId` is untrusted client input and the write below uses the
 * service-role client, which bypasses every row-level policy
 * (`access-gating.md`, gate *service role*). On this path the code IS the
 * security boundary — there is no RLS behind it to catch a caller the gate let
 * through. The service client is retained deliberately: an organizer has no RLS
 * write permission on `event_parties`, so the write cannot be done as the
 * caller.
 *
 * `menu_closes_at` is money-adjacent: it decides when drink tokens stop being
 * purchasable and when the one-hour redeem grace period starts
 * (`purchaseDrinksGuest` and `redeemDrinkTokenGuest` below). This change touches
 * *who may set it*, never the value written nor the `end_time` fallback nor the
 * grace window.
 *
 * **Plan 46-04 changed what this action RETURNS, never what it decides.** The
 * predicate is still `CAP.STAFF_MANAGE`, it still runs before the service-client
 * write for the reason two paragraphs up, and the value written is the same
 * value. Only the three refusals stopped being thrown and started being carried
 * — see the docblock above the union for why that distinction is load-bearing.
 */
export async function updateMenuClosesAt(
  partyId: string,
  menuClosesAt: string | null
): Promise<MenuCloseResult> {
  const ctx = await getAccessContext();

  // Two causes, kept distinguishable (`meta-gates.md`, zero silent failures).
  // An anonymous caller resolves to the empty capability set and would be
  // refused below anyway, but "nobody is here" is not "this person may not".
  if (!ctx.userId) {
    return {
      success: false,
      refusal: MENU_CLOSE_NOT_SIGNED_IN,
      error: MENU_CLOSE_ERROR[MENU_CLOSE_NOT_SIGNED_IN],
    };
  }

  if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    return {
      success: false,
      refusal: MENU_CLOSE_NOT_PERMITTED,
      error: MENU_CLOSE_ERROR[MENU_CLOSE_NOT_PERMITTED],
    };
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("event_parties")
    .update({ menu_closes_at: menuClosesAt || null })
    .eq("id", partyId);

  if (error) {
    // Code and message only. `error.details` is never read here: on a
    // constraint violation PostgREST returns the whole rejected row, and a log
    // on this project reaches a screenshot (`money-path.ts`, `SafeError`).
    logMoneyPathFailure(`event_parties.${MENU_CLOSE_WRITE_FAILED}`, {
      code: error.code,
      message: error.message,
    });
    return {
      success: false,
      refusal: MENU_CLOSE_WRITE_FAILED,
      error: `${MENU_CLOSE_ERROR[MENU_CLOSE_WRITE_FAILED]} (${error.code ?? "no code"})`,
    };
  }

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
    console.error(`[drinks.order_insert_failed] ${redactDbError(insertError)}`);
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
