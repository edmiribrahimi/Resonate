"use server";

import type { Route } from "next";
import { getServiceClient } from "@/lib/supabase/service";
import { getCheckout } from "@/lib/sumup";
import { generateTicketToken } from "@/utils/qr";
import { cancelOrderResumeEmail } from "@/lib/tickets/order-resume";

/**
 * Gli stati in cui la mail di ripresa e' ancora annullabile — lo stesso insieme
 * del webhook (`src/app/api/webhooks/sumup/route.ts`, `RESUME_CANCELLABLE`, I2).
 */
const RESUME_CANCELLABLE: ReadonlySet<string> = new Set([
  "scheduled",
  "cancel_failed",
]);

export type PaymentCallbackStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "NOT_FOUND"
  /**
   * Il fornitore ha incassato e i biglietti NON sono nati. Non e' un pagamento
   * fallito, e dirlo come tale invita a pagare due volte. Solo `ticket_order`.
   */
  | "PAID_NOT_ISSUED"
  /**
   * L'ordine e' `failed` e il fornitore non ha risposto: non sappiamo se ha
   * incassato. La sola cosa sicura da dire e' «non ripagare prima di guardare».
   */
  | "UNCONFIRMED"
  /**
   * L'ordine e' ancora `pending` da noi, ma il fornitore dice `FAILED`: la
   * carta e' stata rifiutata e **nulla e' stato addebitato**. Misurato in
   * laboratorio il 2026-09-30 (`52.2-ESITI.md`, D passo 1): senza questo
   * stato la pagina restava su «Payment processing…» per sempre, perche'
   * leggeva solo il catalogo, dove un rifiuto non lascia traccia finche' il
   * cron `close-pending-orders` non chiude l'ordine (30 minuti dopo).
   */
  | "DECLINED";

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
  /**
   * Se l'ordine e' ancora `pending`, chiedere al fornitore se ha **rifiutato**.
   * La pagina lo alza solo quando le sue letture del catalogo sono esaurite:
   * una domanda al fornitore ogni 2 s non serve a nessuno, una alla fine dice
   * a chi ha la carta rifiutata che nulla e' stato addebitato.
   */
  verifyIfPending?: boolean;
}): Promise<PaymentCallbackResult> {
  const supabase = getServiceClient();
  const verify = params.verifyIfPending === true;

  if (params.ctx === "ticket_order") {
    return checkTicketOrderStatus(supabase, params.id, verify);
  }

  if (params.ctx === "drink") {
    const { data: order, error } = await supabase
      .from("drink_orders")
      .select("status, sumup_checkout_id")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !order) {
      return { status: "NOT_FOUND" };
    }

    const status = mapOrderStatus(order.status);
    if (status === "PENDING" && verify) {
      return { status: await declinedAtProvider("drink", params.id, order.sumup_checkout_id) };
    }
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
    .select("status, ticket_id, sumup_checkout_id")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !purchase) {
    return { status: "NOT_FOUND" };
  }

  const status = mapOrderStatus(purchase.status);
  if (status === "PENDING" && verify) {
    return { status: await declinedAtProvider("ticket", params.id, purchase.sumup_checkout_id) };
  }
  if (status === "PAID" && purchase.ticket_id) {
    return {
      status,
      redirectTo: `/tickets/${purchase.ticket_id}`,
    };
  }
  return { status };
}

/**
 * Un ordine ancora `pending` da noi: il fornitore l'ha rifiutato?
 *
 * ── Perche' si chiede solo alla fine, e solo questo ──────────────────────────
 *
 * Misurato in laboratorio il 2026-09-30 (`52.2-ESITI.md`, D passo 1): una
 * carta bloccata torna dal modulo di SumUp **senza una parola**, il checkout e'
 * `FAILED` dal fornitore dopo 34 secondi, e da noi l'ordine resta `pending`
 * fino al cron `close-pending-orders`, trenta minuti dopo. Questa pagina
 * leggeva solo il catalogo, e a chi era stato rifiutato diceva «Payment
 * processing… This may take a moment» — per sempre. Un «ho pagato?» senza
 * risposta, alle 23, davanti a una porta.
 *
 * La stessa regola del webhook — *ask the provider, never believe the
 * announcement* — vale anche al contrario: **solo il fornitore puo' dire
 * «rifiutato»**. Qui si chiede una volta, quando la pagina ha esaurito le
 * letture, e si risponde `DECLINED` **soltanto** su `FAILED` o `EXPIRED` del
 * fornitore: nessun addebito, e la persona puo' riprovare. Ogni altra risposta
 * — `PENDING`, `PAID` con il webhook in ritardo, un errore di rete — resta
 * `PENDING`: la pagina non promette nulla che il fornitore non abbia
 * confermato, e l'ordine lo chiude il cron, che e' l'unico a scrivere.
 *
 * Non scrive niente: `closed_reason='declined'` e' del cron, con la parola del
 * fornitore (CART-03). Due scrittori sullo stesso ordine sarebbero una gara.
 */
async function declinedAtProvider(
  ctx: "drink" | "ticket" | "ticket_order",
  id: string,
  checkoutId: string | null
): Promise<"PENDING" | "DECLINED"> {
  // Senza checkout non c'e' un fornitore a cui chiedere (ordine a totale zero).
  if (!checkoutId) return "PENDING";
  try {
    const checkout = await getCheckout(checkoutId);
    if (checkout.status === "FAILED" || checkout.status === "EXPIRED") {
      console.warn(
        `[tickets.callback_declined] ctx=${ctx} order=${id} provider=${checkout.status}: ` +
          "the provider refused the payment; the buyer was told nothing was charged"
      );
      return "DECLINED";
    }
    return "PENDING";
  } catch (verifyError) {
    console.error(
      `[tickets.callback_verify_pending_failed] ctx=${ctx} order=${id}: could not read the checkout from the provider`,
      verifyError
    );
    return "PENDING";
  }
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
 * Si leggono `id`, `status` e `sumup_checkout_id`, e nient'altro. Il terzo e'
 * il riferimento opaco del fornitore, serve a chiedergli se ha incassato (sotto)
 * e non finisce su nessuna superficie; e' nell'allow-list positiva di
 * `verify:venue-surfaces` (G2) dal 2026-09-23, pesato come non-luogo. `D-49-04`:
 * la credenziale di un biglietto non diventa una chiave verso il posto dove si
 * suona, e questo e' il cammino che porta a quella credenziale.
 */
async function checkTicketOrderStatus(
  supabase: ReturnType<typeof getServiceClient>,
  orderId: string,
  verifyIfPending: boolean
): Promise<PaymentCallbackResult> {
  const { data: order, error } = await supabase
    .from("ticket_orders")
    // `event_id`, `resume_email_id`, `resume_email_state` dalla fase 52.2
    // (CART-05): servono solo all'annullamento qui sotto. Identificativi opachi
    // — di Resend e dell'evento — e nessun luogo; nell'allow-list G2.
    .select("id, status, sumup_checkout_id, event_id, resume_email_id, resume_email_state")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return { status: "NOT_FOUND" };
  }

  const status = mapOrderStatus(order.status);
  if (status === "PENDING" && verifyIfPending) {
    return {
      status: await declinedAtProvider("ticket_order", order.id, order.sumup_checkout_id),
    };
  }
  if (status === "PAID") {
    // ── Una seconda rete per la mail di ripresa (fase 52.2, CART-05) ────────
    //
    // Il webhook annulla per primo, con i suoi tentativi. Qui un tentativo
    // solo (`single`): la pagina interroga fino a 8 volte ogni 2 s, quindi la
    // chiamata si ripete da se', e `single` non scrive `cancel_failed` e non
    // avvisa — dichiarare un fallimento e' del webhook e del cron. Da qui non
    // si manda nulla. Non solleva, e il suo esito non cambia la risposta:
    // l'ordine e' pagato comunque.
    if (
      order.resume_email_id &&
      RESUME_CANCELLABLE.has(order.resume_email_state ?? "")
    ) {
      await cancelOrderResumeEmail({
        serviceClient: supabase,
        orderId: order.id,
        eventId: order.event_id,
        emailId: order.resume_email_id,
        trigger: "callback",
        mode: "single",
      });
    }

    // La firma si conia qui e non si porta nell'URL di ritorno del fornitore:
    // quell'indirizzo passa per una superficie di terzi, e una credenziale che
    // apre dei biglietti non ha ragione di attraversarla.
    return {
      status,
      redirectTo: `/tickets/order/${generateTicketToken(order.id)}`,
    };
  }

  // ── `failed` non vuol dire «pagamento fallito» ─────────────────────────────
  //
  // Misurato in laboratorio il 2026-09-08 (`49-ESITI.md`, P-WH-4): un ordine
  // pagato i cui biglietti non sono nati — identita' non risolvibile — e'
  // `failed` in tabella, e questa pagina diceva «Payment failed — Try again».
  // SumUp aveva incassato 6,00 €. Un ospite in quello stato paga una seconda
  // volta.
  //
  // Lo stato locale dice cosa e' successo DOPO l'incasso, non se l'incasso c'e'
  // stato. Quello si chiede al fornitore — la stessa regola del webhook:
  // «ALWAYS verify via GET checkout API». Se il fornitore dice PAID, la
  // schermata deve dire «non ripagare»; se non risponde, non sappiamo, e
  // l'unica frase onesta e' «guarda la tua banca prima di ripagare». Il ramo
  // «Payment failed» resta solo quando il fornitore conferma che non ha
  // incassato.
  //
  // Verso dell'errore: dire «fallito» a chi ha pagato costa un secondo
  // pagamento; dire «forse pagato» a chi non ha pagato costa un'occhiata
  // all'app della banca. Il default, nell'incertezza, e' il secondo.
  if (status === "FAILED") {
    // Un ordine SENZA checkout non e' passato da nessun fornitore: e' a totale
    // zero (REG-06). Non c'e' un incasso da verificare, quindi lo stato locale
    // e' tutta la verita' che esiste e la domanda qui sotto sarebbe `null`.
    // Questa pagina non e' sulla strada di un ordine gratuito — ci si arriva
    // solo costruendo l'indirizzo a mano — ma il tipo non lo impedisce e
    // `getCheckout(null)` non e' una domanda.
    if (!order.sumup_checkout_id) {
      return { status };
    }
    try {
      const checkout = await getCheckout(order.sumup_checkout_id);
      if (checkout.status === "PAID") {
        console.error(
          `[tickets.paid_not_issued] order=${order.id} checkout=${order.sumup_checkout_id}: ` +
            "the provider took the money and no ticket was issued; the buyer was told not to pay again"
        );
        return { status: "PAID_NOT_ISSUED" };
      }
    } catch (verifyError) {
      console.error(
        `[tickets.callback_verify_failed] order=${order.id}: could not read the checkout from the provider`,
        verifyError
      );
      return { status: "UNCONFIRMED" };
    }
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
