import SumUp, { APIError } from "@sumup/sdk";

// SDK singleton -- reused across all calls, do NOT instantiate per-request
const sumup = new SumUp({
  apiKey: process.env.SUMUP_API_KEY!,
});

// Export singleton for direct SDK access
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
