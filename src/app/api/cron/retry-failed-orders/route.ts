import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { replayPaidOrderDelivery } from "@/lib/tickets/replay-order-delivery";

/**
 * Cron — ritenta gli ordini d'ospite `failed` il cui checkout e' PAID.
 *
 * ── Perche' esiste ───────────────────────────────────────────────────────────
 *
 * `49-ESITI.md`, P-WH-4: un ordine pagato i cui biglietti non sono nati resta
 * `failed`, l'ospite ha un incasso e niente in mano, e la riparazione era a
 * mano. Il pulsante «Retry issuing» sulla pagina della serata la fa fare a chi
 * organizza; questo cron la fa **di notte per nessuno**, cioe' al mattino,
 * quando le cause transitorie — lettura del profilo fallita, fornitore
 * d'identita' momentaneamente giu' — sono passate da sole.
 *
 * ── Cosa NON ritenta ─────────────────────────────────────────────────────────
 *
 * `identity_email_missing`: senza un indirizzo non c'e' nulla da risolvere, e
 * ritentare ogni giorno produrrebbe lo stesso fallimento con la stessa causa,
 * spostando l'`updated_at` e nascondendo da quanto l'ordine e' fermo. Quello
 * lo corregge una persona, dal pulsante.
 *
 * Gli ordini toccati negli ultimi dieci minuti non si ritentano: sono ancora
 * in mano al webhook o a un organizer.
 *
 * ── Progresso per elemento ───────────────────────────────────────────────────
 *
 * Ogni ordine e' un tentativo a se', contato nel proprio ramo: un cron
 * interrotto a meta' ha rigiocato quelli prima dell'interruzione e nient'altro
 * (`ticketing-payments.md`, *cron non atomico*). Il rigioco e' idempotente per
 * costruzione del webhook.
 *
 * Gira al mattino come gli altri sei: mai fra le 22:00 e le 06:00 locali, che
 * e' una notte re:sonate (`meta-gates.md`).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = getServiceClient();
  const quietSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: candidates, error } = await serviceClient
    .from("ticket_orders")
    .select("id, error_message")
    .eq("status", "failed")
    .lt("updated_at", quietSince)
    .order("updated_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[cron.retry_failed_orders.read_failed]", error.message);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  const counts = {
    considered: 0,
    skippedEmailMissing: 0,
    completed: 0,
    stillFailed: 0,
    checkoutNotPaid: 0,
    providerUnreachable: 0,
    other: 0,
  };
  const completedOrders: string[] = [];

  for (const o of candidates ?? []) {
    counts.considered += 1;
    if ((o.error_message ?? "").startsWith("identity_email_missing")) {
      counts.skippedEmailMissing += 1;
      continue;
    }
    try {
      const outcome = await replayPaidOrderDelivery({ orderId: o.id, serviceClient });
      if (outcome.ok) {
        counts.completed += 1;
        completedOrders.push(o.id);
      } else if (outcome.reason === "still_failed") counts.stillFailed += 1;
      else if (outcome.reason === "checkout_not_paid") counts.checkoutNotPaid += 1;
      else if (outcome.reason === "provider_unreachable") counts.providerUnreachable += 1;
      else counts.other += 1;
    } catch (e) {
      counts.other += 1;
      console.error(`[cron.retry_failed_orders.unexpected] order=${o.id}`, e);
    }
  }

  console.log(`[cron.retry_failed_orders] ${JSON.stringify(counts)}`);
  return NextResponse.json({ ...counts, completedOrders });
}
