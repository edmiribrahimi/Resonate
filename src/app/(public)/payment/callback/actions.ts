"use server";

import type { Route } from "next";
import { getServiceClient } from "@/lib/supabase/service";
import { generateTicketToken } from "@/utils/qr";

export type PaymentCallbackStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "NOT_FOUND";

export interface PaymentCallbackResult {
  status: PaymentCallbackStatus;
  /**
   * Where the user should land once the order/ticket is confirmed.
   *
   * Typed rather than `string` by plan 34-01 — form 3, the annotated dynamic
   * href, applied at the SOURCE instead of at the `router.replace()` call
   * site. This is a money path: the destination after a paid checkout is the
   * one place a wrong address costs a person the thing they just bought, and
   * `string` said nothing about it. The two shapes are the only two this
   * function returns, and they are checked against the generated route union.
   */
  redirectTo?: Route<
    | `/events/${string}/menu?${string}`
    | `/tickets/${string}`
    | `/tickets/order/${string}`
  >;
}

/**
 * Look up payment status from our own DB instead of round-tripping to SumUp.
 *
 * Each checkout we create uses one UUID as both `checkout_reference` and
 * the local row id, so the redirect URL ?order=<id> / ?purchase=<id> maps
 * 1:1 to drink_orders.id / pending_purchases.id.
 */
export async function checkPaymentStatus(params: {
  ctx: "drink" | "ticket" | "ticket_order";
  id: string;
  slug?: string;
  party?: string;
}): Promise<PaymentCallbackResult> {
  const supabase = getServiceClient();

  if (params.ctx === "ticket_order") {
    return checkTicketOrderStatus(supabase, params.id);
  }

  if (params.ctx === "drink") {
    const { data: order, error } = await supabase
      .from("drink_orders")
      .select("status")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !order) {
      return { status: "NOT_FOUND" };
    }

    const status = mapOrderStatus(order.status);
    if (status === "PAID" && params.slug) {
      // Built with `URLSearchParams` instead of `new URL(...).pathname +
      // .search`, so the value keeps a literal type. Same encoding, same two
      // parameters, same order — `URL.searchParams.set` and
      // `URLSearchParams.set` share one implementation. What changes is only
      // that the result is now a checked route rather than a `string`.
      const query = new URLSearchParams({ order: params.id });
      if (params.party) query.set("party", params.party);
      return {
        status,
        redirectTo: `/events/${params.slug}/menu?${query.toString()}`,
      };
    }
    return { status };
  }

  // ticket
  const { data: purchase, error } = await supabase
    .from("pending_purchases")
    .select("status, ticket_id")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !purchase) {
    return { status: "NOT_FOUND" };
  }

  const status = mapOrderStatus(purchase.status);
  if (status === "PAID" && purchase.ticket_id) {
    return {
      status,
      redirectTo: `/tickets/${purchase.ticket_id}`,
    };
  }
  return { status };
}

/**
 * Il ritorno dal pagamento di un ordine comprato **senza account**.
 *
 * ── Perche' e' un ramo nuovo e non il ramo `ticket` allargato ────────────────
 *
 * Il ramo `ticket` sopra legge `pending_purchases`, che e' la tabella del
 * percorso **con sessione**: un ordine d'ospite non vi compare, e mandarcelo
 * significherebbe cercarlo nel posto sbagliato e concludere `NOT_FOUND` su un
 * pagamento riuscito. `purchaseTicketsGuest` marca infatti il ritorno con
 * `ctx=ticket_order` (`guest-purchase-actions.ts:257`) proprio per non produrre
 * quell'errore silenzioso — e questo e' il lettore che quel valore attendeva.
 *
 * ── Perche' la destinazione conta ────────────────────────────────────────────
 *
 * Chi ha comprato senza account **non ha una sessione**, quindi `/tickets/{id}`
 * lo rimbalzerebbe a `/login`. Va invece all'indirizzo aperto dalla **firma**,
 * cosi' vede i propri codici **senza attendere la mail**. E' cio' che rende un
 * mancato recapito rumore invece che una persona alla porta senza biglietto.
 *
 * ── Nessuna colonna di luogo, e nessun indirizzo di posta ───────────────────
 *
 * Si leggono `id` e `status`, e nient'altro. `D-49-04`: la credenziale di un
 * biglietto non diventa una chiave verso il posto dove si suona, e questo e' il
 * cammino che porta a quella credenziale.
 */
async function checkTicketOrderStatus(
  supabase: ReturnType<typeof getServiceClient>,
  orderId: string
): Promise<PaymentCallbackResult> {
  const { data: order, error } = await supabase
    .from("ticket_orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return { status: "NOT_FOUND" };
  }

  const status = mapOrderStatus(order.status);
  if (status === "PAID") {
    // La firma si conia qui e non si porta nell'URL di ritorno del fornitore:
    // quell'indirizzo passa per una superficie di terzi, e una credenziale che
    // apre dei biglietti non ha ragione di attraversarla.
    return {
      status,
      redirectTo: `/tickets/order/${generateTicketToken(order.id)}`,
    };
  }
  return { status };
}

function mapOrderStatus(s: string | null): PaymentCallbackStatus {
  switch (s) {
    case "completed":
      return "PAID";
    case "failed":
      return "FAILED";
    case "expired":
      return "EXPIRED";
    case "pending":
    default:
      return "PENDING";
  }
}
