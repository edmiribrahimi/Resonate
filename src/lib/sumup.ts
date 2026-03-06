import SumUp, { APIError } from "@sumup/sdk";

// SDK singleton -- reused across all calls, do NOT instantiate per-request
const sumup = new SumUp({
  apiKey: process.env.SUMUP_API_KEY!,
});

// Export singleton for direct SDK access in future phases (14-18)
export { sumup };

export async function createCheckout(params: {
  amount: number;
  currency: string;
  description: string;
  checkoutReference: string;
  returnUrl: string;
  redirectUrl?: string;
}) {
  try {
    const checkout = await sumup.checkouts.create({
      amount: params.amount,
      currency: params.currency as "EUR",
      merchant_code: process.env.SUMUP_MERCHANT_CODE!,
      checkout_reference: params.checkoutReference,
      description: params.description,
      return_url: params.returnUrl,
      redirect_url: params.redirectUrl,
    });

    return checkout as { id: string; status: string; checkout_reference: string };
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(
        `SumUp checkout creation failed: ${JSON.stringify(error.error)}`
      );
    }
    throw error;
  }
}

export async function getCheckout(checkoutId: string) {
  try {
    const checkout = await sumup.checkouts.get(checkoutId);

    return checkout as {
      id: string;
      status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
      checkout_reference: string;
      amount: number;
      currency: string;
      transactions: Array<{
        id: string;
        transaction_code: string;
        status: string;
      }>;
    };
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(`SumUp checkout retrieval failed: ${error.status}`);
    }
    throw error;
  }
}

export async function refundTransaction(transactionCode: string, amount?: number) {
  try {
    await sumup.transactions.refund(
      transactionCode,
      amount !== undefined ? { amount } : undefined
    );

    // Server returns 204 No Content -- return same shape as before
    return { success: true as const };
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(`SumUp refund failed: ${JSON.stringify(error.error)}`);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Phase 18: Card Tokenization -- Customer & Saved Card helpers
// ---------------------------------------------------------------------------

/**
 * Get or create a SumUp customer linked to a Resonate profile.
 * Uses the Supabase profile UUID as the SumUp customer_id (1:1 mapping).
 */
export async function getOrCreateCustomer(params: {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}): Promise<{ customer_id: string }> {
  try {
    // Try to retrieve existing customer first
    const existing = await sumup.customers.get(params.userId);
    return { customer_id: existing.customer_id };
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      // Customer does not exist yet -- create it
      try {
        const created = await sumup.customers.create({
          customer_id: params.userId,
          personal_details: {
            first_name: params.firstName,
            last_name: params.lastName,
            email: params.email,
          },
        });
        return { customer_id: created.customer_id };
      } catch (createError) {
        if (createError instanceof APIError && createError.status === 409) {
          // 409 Conflict = already exists (race condition) -- retrieve again
          const existing = await sumup.customers.get(params.userId);
          return { customer_id: existing.customer_id };
        }
        if (createError instanceof APIError) {
          throw new Error(
            `SumUp customer creation failed: ${JSON.stringify(createError.error)}`
          );
        }
        throw createError;
      }
    }
    if (error instanceof APIError) {
      throw new Error(
        `SumUp customer retrieval failed: ${JSON.stringify(error.error)}`
      );
    }
    throw error;
  }
}

/**
 * Create a checkout configured for card tokenization (save card flow).
 * Sets `purpose: "SETUP_RECURRING_PAYMENT"` and `customer_id` so the
 * Card Widget captures consent and SumUp stores the payment instrument.
 */
export async function createTokenizationCheckout(params: {
  amount: number;
  currency: string;
  description: string;
  checkoutReference: string;
  returnUrl: string;
  redirectUrl?: string;
  customerId: string;
}): Promise<{ id: string; status: string; checkout_reference: string }> {
  try {
    const checkout = await sumup.checkouts.create({
      amount: params.amount,
      currency: params.currency as "EUR",
      merchant_code: process.env.SUMUP_MERCHANT_CODE!,
      checkout_reference: params.checkoutReference,
      description: params.description,
      return_url: params.returnUrl,
      redirect_url: params.redirectUrl,
      customer_id: params.customerId,
      purpose: "SETUP_RECURRING_PAYMENT",
    });

    return checkout as { id: string; status: string; checkout_reference: string };
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(
        `SumUp tokenization checkout failed: ${JSON.stringify(error.error)}`
      );
    }
    throw error;
  }
}

/**
 * Process a checkout server-side using a previously saved card token.
 * Returns the result which may be a direct success or a 3DS redirect.
 */
export async function processWithSavedCard(params: {
  checkoutId: string;
  token: string;
  customerId: string;
}): Promise<{ id?: string; status?: string; redirect_url?: string }> {
  try {
    const result = await sumup.checkouts.process(params.checkoutId, {
      payment_type: "card",
      token: params.token,
      customer_id: params.customerId,
    });

    // Result can be CheckoutSuccess (has id, status) or CheckoutAccepted (3DS redirect)
    if ("next_step" in result && result.next_step) {
      return { redirect_url: result.next_step.url };
    }
    // CheckoutSuccess path
    const success = result as { id?: string; status?: string; redirect_url?: string };
    return { id: success.id, status: success.status, redirect_url: success.redirect_url };
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(
        `SumUp saved card payment failed: ${JSON.stringify(error.error)}`
      );
    }
    throw error;
  }
}

/**
 * List active saved cards for a SumUp customer.
 * Filters to active instruments only and maps to a simple shape.
 */
export async function listSavedCards(
  customerId: string
): Promise<Array<{ token: string; last4: string; cardType: string }>> {
  try {
    const instruments = await sumup.customers.listPaymentInstruments(customerId);

    return instruments
      .filter((inst) => inst.active === true)
      .map((inst) => ({
        token: inst.token ?? "",
        last4: inst.card?.last_4_digits ?? "****",
        cardType: inst.card?.type ?? "UNKNOWN",
      }));
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(
        `SumUp list saved cards failed: ${JSON.stringify(error.error)}`
      );
    }
    throw error;
  }
}

/**
 * Deactivate (delete) a saved payment instrument for a customer.
 */
export async function deactivateCard(
  customerId: string,
  token: string
): Promise<{ success: true }> {
  try {
    await sumup.customers.deactivatePaymentInstrument(customerId, token);
    return { success: true as const };
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(
        `SumUp card deactivation failed: ${JSON.stringify(error.error)}`
      );
    }
    throw error;
  }
}
