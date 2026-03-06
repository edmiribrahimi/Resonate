"use server";

import { getCheckout } from "@/lib/sumup";

/**
 * Check payment status by checkout reference (our UUID).
 * SumUp GET /v0.1/checkouts/{id} accepts both checkout ID and checkout_reference.
 */
export async function checkPaymentStatus(checkoutReference: string): Promise<{
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "NOT_FOUND";
}> {
  try {
    const checkout = await getCheckout(checkoutReference);
    return { status: checkout.status };
  } catch {
    return { status: "NOT_FOUND" };
  }
}
