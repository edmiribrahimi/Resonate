const SUMUP_API_BASE = "https://api.sumup.com/v0.1";

export async function createCheckout(params: {
  amount: number;
  currency: string;
  description: string;
  checkoutReference: string;
  redirectUrl: string;
  returnUrl: string;
}) {
  const response = await fetch(`${SUMUP_API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      merchant_code: process.env.SUMUP_MERCHANT_CODE,
      checkout_reference: params.checkoutReference,
      description: params.description,
      redirect_url: params.redirectUrl,
      return_url: params.returnUrl,
      hosted_checkout: { enabled: true },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `SumUp checkout creation failed: ${JSON.stringify(error)}`
    );
  }

  return response.json() as Promise<{
    id: string;
    hosted_checkout_url: string;
    status: string;
    checkout_reference: string;
  }>;
}

export async function refundTransaction(transactionCode: string, amount?: number) {
  const body: Record<string, unknown> = {};
  if (amount !== undefined) {
    body.amount = amount;
  }

  const response = await fetch(
    `${SUMUP_API_BASE}/me/refund/${transactionCode}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SumUp refund failed: ${error}`);
  }

  // 204 No Content = success
  return { success: true };
}

export async function getCheckout(checkoutId: string) {
  const response = await fetch(
    `${SUMUP_API_BASE}/checkouts/${checkoutId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`SumUp checkout retrieval failed: ${response.status}`);
  }

  return response.json() as Promise<{
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
  }>;
}
