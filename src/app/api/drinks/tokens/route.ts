import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/drinks/tokens?order_id=<uuid>
 *
 * Public API route for guest token retrieval. Uses service-role client
 * to bypass RLS. Secured by UUID unpredictability + user_id null guard
 * (only guest orders are accessible via this route).
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  if (!UUID_REGEX.test(orderId)) {
    return NextResponse.json(
      { error: "Invalid order_id format" },
      { status: 400 }
    );
  }

  const serviceClient = getServiceClient();

  // Fetch order to verify existence and guest ownership
  const { data: order, error: orderError } = await serviceClient
    .from("drink_orders")
    .select("id, status, user_id")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Security guard: only expose guest (anonymous) orders
  if (order.user_id !== null) {
    return NextResponse.json(
      { error: "Use authenticated flow" },
      { status: 403 }
    );
  }

  // Fetch drink tokens for this order
  const { data: tokens, error: tokensError } = await serviceClient
    .from("drink_tokens")
    .select("id, drink_name, price, token, status, redeemed_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (tokensError) {
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    tokens: tokens ?? [],
    orderStatus: order.status,
  });
}
