"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sumup, refundTransaction } from "@/lib/sumup";
import type { UserRole } from "@/types/database";

async function requireMaster() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  if (role !== "master") {
    redirect("/dashboard");
  }
}

export async function listTransactions(params: {
  limit?: number;
  oldest_time?: string;
  newest_time?: string;
  statuses?: string[];
  newest_ref?: string;
  oldest_ref?: string;
}) {
  await requireMaster();

  const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
  const result = await sumup.transactions.list(merchantCode, {
    payment_types: ["ECOM"],
    limit: params.limit ?? 20,
    order: "descending",
    statuses: params.statuses as
      | ("SUCCESSFUL" | "CANCELLED" | "FAILED" | "REFUNDED" | "CHARGE_BACK")[]
      | undefined,
    oldest_time: params.oldest_time,
    newest_time: params.newest_time,
    newest_ref: params.newest_ref,
    oldest_ref: params.oldest_ref,
  });

  // Extract next cursor from links array for pagination
  let nextCursor: string | undefined;
  let nextCursorParam: "oldest_ref" | "newest_ref" | undefined;
  const nextLink = result.links?.find(
    (l: { rel: string; href: string }) => l.rel === "next"
  );
  if (nextLink?.href) {
    try {
      const url = new URL(nextLink.href, "https://api.sumup.com");
      const oldestRef = url.searchParams.get("oldest_ref");
      const newestRef = url.searchParams.get("newest_ref");
      if (oldestRef) {
        nextCursor = oldestRef;
        nextCursorParam = "oldest_ref";
      } else if (newestRef) {
        nextCursor = newestRef;
        nextCursorParam = "newest_ref";
      }
    } catch {
      // Invalid URL -- no next page
    }
  }

  return {
    items: result.items ?? [],
    nextCursor,
    nextCursorParam,
    hasMore: !!nextLink,
  };
}

export async function getTransactionDetail(transactionCode: string) {
  await requireMaster();

  const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
  const detail = await sumup.transactions.get(merchantCode, {
    transaction_code: transactionCode,
  });

  return detail;
}

export async function refundTransactionAction(
  transactionCode: string,
  amount?: number
): Promise<{ success: true }> {
  await requireMaster();
  await refundTransaction(transactionCode, amount);
  return { success: true };
}

export async function listPayouts(params: {
  start_date: string;
  end_date: string;
  limit?: number;
  order?: "desc" | "asc";
}) {
  await requireMaster();

  const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
  const result = await sumup.payouts.list(merchantCode, {
    start_date: params.start_date,
    end_date: params.end_date,
    format: "json",
    limit: params.limit ?? 100,
    order: params.order ?? "desc",
  });

  return Array.isArray(result) ? result : [];
}
