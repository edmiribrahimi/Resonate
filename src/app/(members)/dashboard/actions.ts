"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  listSavedCards,
  deactivateCard,
  processWithSavedCard,
  createCheckout,
} from "@/lib/sumup";

/**
 * Fetch saved cards for the authenticated member.
 * Returns empty array if no sumup_customer_id or no saved cards.
 */
export async function getSavedCards(): Promise<
  { token: string; last4: string; cardType: string }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("sumup_customer_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (!profile.sumup_customer_id) {
    return [];
  }

  return listSavedCards(profile.sumup_customer_id);
}

/**
 * Delete (deactivate) a saved card for the authenticated member.
 */
export async function deleteSavedCard(
  token: string
): Promise<{ success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("sumup_customer_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (!profile.sumup_customer_id) {
    throw new Error("No saved cards");
  }

  await deactivateCard(profile.sumup_customer_id, token);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Pay using a saved card token. Creates a checkout and processes it
 * server-side with the saved card -- no Card Widget needed.
 * Returns redirect info for 3DS if required.
 */
export async function payWithSavedCard(params: {
  token: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  redirectUrl?: string;
}): Promise<{
  status: "paid" | "redirect" | "pending";
  checkoutId: string;
  redirectUrl?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("sumup_customer_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (!profile.sumup_customer_id) {
    throw new Error("No saved card on file");
  }

  // Create a standard checkout to get a checkout ID
  const checkoutReference = crypto.randomUUID();
  const checkout = await createCheckout({
    amount: params.amount,
    currency: params.currency,
    description: params.description,
    checkoutReference,
    returnUrl: params.returnUrl,
    redirectUrl: params.redirectUrl,
  });

  // Process with saved card token (server-side, no Card Widget)
  const result = await processWithSavedCard({
    checkoutId: checkout.id,
    token: params.token,
    customerId: profile.sumup_customer_id,
  });

  if (result.redirect_url) {
    return { status: "redirect", redirectUrl: result.redirect_url, checkoutId: checkout.id };
  }

  if (result.status === "PAID") {
    return { status: "paid", checkoutId: checkout.id };
  }

  // Let webhook handle the rest
  return { status: "pending", checkoutId: checkout.id };
}
