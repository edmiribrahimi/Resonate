import "server-only";

import { render } from "@react-email/render";
import { getResend } from "@/lib/email-delivery/provider";
import { recordSend } from "@/lib/email-delivery/ledger";
import type { EmailCategory } from "@/lib/email-delivery/categories";
import { OrderResumeEmail } from "@/emails/order-resume";
import { generateTicketToken } from "@/utils/qr";
import { formatEventDate } from "@/utils/formatTime";
import { normalizeBuyerEmail } from "@/lib/tickets/buyer-input";
import { redactDbError } from "@/lib/errors/redact";
import { alertOrganizerResumeEmailNotCancelled } from "@/lib/tickets/organizer-alert";
import type { getServiceClient } from "@/lib/supabase/service";

/**
 * order-resume.ts — il solo possessore della mail di ripresa di un ordine
 * lasciato aperto (CART-05, fase 52.2).
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * PIU' PUNTI ANNULLANO, NESSUNO MANDA
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * La mail non la manda un cron: si **programma** presso il fornitore
 * (`scheduledAt`, un'ora dopo l'apertura del checkout) nel momento in cui
 * l'ordine nasce, e si **annulla** da ogni punto che vede l'ordine pagato — il
 * webhook, il ritorno dal pagamento, la pagina ordine, il cron dei sospesi
 * (D-52.2-01). Nessuno di quei punti puo' farla partire: il solo invio e'
 * quello che il fornitore esegue alla scadenza, e solo se nessuno l'ha fermato.
 *
 * ── Perche' il webhook annulla PRIMA di ogni altra cosa (P-5) ───────────────
 *
 * La mail dice «Nothing has been charged». Dal momento in cui il fornitore ha
 * incassato, quella frase e' falsa **a prescindere** dall'esito dell'emissione
 * dei biglietti. E il webhook risponde 200 anche quando qualcosa dentro
 * fallisce, e un 200 non si ritenta: un annullamento messo dopo l'emissione
 * andrebbe perso proprio nei casi in cui l'emissione solleva. Il collegamento
 * lo scrive il piano 52.2-08.
 *
 * ── Perche' annulla anche le mail «sorelle» (decisione 5 del piano 52.2-05) ──
 *
 * Chi apre l'ordine A, lo abbandona e paga l'ordine B per la stessa serata non
 * deve ricevere «A is still open». L'informativa (piano 52.2-04) dice in forma
 * assoluta «it is not sent if you pay in the meantime»: deve essere vero **per
 * costruzione**. Il freno per indirizzo (una ogni 24 h) rende il caso raro, non
 * impossibile — A programmata ieri alle 23:30, B oggi alle 00:10 — quindi
 * {@link cancelSiblingResumeEmails} esiste.
 *
 * ── I freni vanno nel verso OPPOSTO a quello di `resendOrderTickets` ─────────
 *
 * Il freno di `resendOrderTickets` prosegue quando non riesce a leggere il
 * registro, perche' li' la mail e' l'unica copia di un biglietto. Qui e' una
 * cortesia, su una quota giornaliera condivisa con i biglietti di tutti: una
 * lettura fallita del freno o del tetto **non programma**. Fra una cortesia
 * persa e un biglietto che non parte perche' la quota e' finita, si perde la
 * cortesia.
 *
 * ── Cosa non contiene ────────────────────────────────────────────────────────
 *
 * Nessuna `select` qui dentro nomina una colonna di luogo, e il template non ha
 * una prop in cui possa entrare (`D-49-04`). Il file e' fra le superfici del
 * controllo G di `verify:venue-surfaces`.
 *
 * **Mai nel callback differito di Next (P-3):** con Apple Pay il webhook puo' arrivare prima
 * che l'id sia salvato, e un webhook che non trova l'id non annulla.
 */

type ServiceClient = ReturnType<typeof getServiceClient>;

/** La categoria del registro, scritta una volta sola. */
export const ORDER_RESUME_CATEGORY = "order_resume" satisfies EmailCategory;

/**
 * Il tetto giornaliero: righe di `email_deliveries` create oggi (giorno UTC,
 * come la quota del fornitore) oltre le quali la ripresa non si programma.
 *
 * 60 su 100 della quota gratuita: le conferme d'ordine — cioe' i biglietti —
 * vengono prima. **Il conteggio sottostima**: gli avvisi all'organizer
 * (`organizer-alert.ts`) vanno diretti al fornitore fuori dal registro, e anche
 * le mail di ripresa annullate potrebbero contare contro la quota (non e'
 * documentato). 60 lascia quel margine.
 */
export const RESUME_DAILY_QUOTA_CEILING = 60;

/** Il freno per indirizzo di posta: una mail di ripresa in questa finestra. */
const RESUME_THROTTLE_WINDOW_MS = 24 * 60 * 60 * 1000;

const DELAY_DEFAULT_MINUTES = 60;
const DELAY_MIN_MINUTES = 2;
const DELAY_MAX_MINUTES = 1440;

/**
 * I tentativi di annullamento, in millisecondi dall'inizio: 0 · 1,5 · 3 · 6 s.
 *
 * Il fornitore risponde 422 «Email is not scheduled» per circa 2 secondi dopo
 * la programmazione (stato `queued` → `scheduled`, misurato il 2026-09-30).
 * Sei secondi di arco sono tre volte quella finestra.
 */
const CANCEL_ATTEMPT_OFFSETS_MS = [0, 1500, 3000, 6000] as const;

/** Gli stati da cui un annullamento puo' partire: un `cancel_failed` si riprova. */
const CANCELLABLE_STATES = ["scheduled", "cancel_failed"] as const;

/** Gli eventi del fornitore che dicono «la mail e' gia' partita». Non e' un guasto (P-4). */
const ALREADY_SENT_EVENTS = new Set([
  "sent",
  "delivered",
  "delivery_delayed",
  "opened",
  "clicked",
  "bounced",
  "complained",
]);

/** Gli eventi che dicono «ancora in coda»: si aspetta il prossimo tentativo. */
const STILL_QUEUED_EVENTS = new Set(["queued", "scheduled"]);

/**
 * Le cause per cui una mail di ripresa non e' stata programmata, una per riga
 * di log. Nessuna e' un errore del chiamante: l'acquisto prosegue comunque.
 */
export type OrderResumeSkip =
  /** `ORDER_RESUME_EMAIL_ENABLED` non e' `"true"`: spento per default. */
  | "disabled"
  /** `sumup_checkout_id` nullo: un ordine gratuito non ha nulla da riprendere. */
  | "free_order"
  /** Una mail di ripresa e' gia' stata programmata per questo indirizzo nelle ultime 24 h. */
  | "throttled_recipient"
  /** Il tetto giornaliero del registro e' raggiunto. */
  | "skipped_quota"
  /** Il freno o il tetto non si sono potuti leggere: non si programma. */
  | "throttle_unreadable"
  /** `ORDER_RESUME_DELAY_MINUTES` non e' un intero fra 2 e 1440. */
  | "delay_invalid"
  /** L'ordine, la serata o il tier non si sono potuti leggere. */
  | "order_unreadable"
  /** L'ordine non e' piu' `pending`: non c'e' niente da riprendere. */
  | "order_not_open"
  /**
   * L'indirizzo e' stato tolto dalla cancellazione tracciata (`pii_cleared_at`,
   * piano 52.1-21): non c'e' a chi scrivere, e non e' un ordine illeggibile.
   */
  | "buyer_email_cleared"
  /** L'ordine ha gia' una mail di ripresa: una per ordine, per costruzione. */
  | "already_scheduled"
  /** Il fornitore ha rifiutato la programmazione, o qualcosa ha sollevato. */
  | "schedule_failed"
  /** La mail e' stata programmata ma il suo id non si e' potuto scrivere sull'ordine: annullata subito. */
  | "id_unrecorded";

export type ResumeCancelTrigger =
  | "webhook"
  | "webhook_sibling"
  | "callback"
  | "order_page"
  | "cron"
  | "schedule_rollback";

export type ResumeCancelOutcome =
  | "canceled"
  | "sent"
  | "cancel_failed"
  | "still_scheduled"
  | "not_ours";

function readDelayMinutes(): number | null {
  const raw = (process.env.ORDER_RESUME_DELAY_MINUTES ?? "").trim();
  if (!raw) return DELAY_DEFAULT_MINUTES;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number.parseInt(raw, 10);
  if (n < DELAY_MIN_MINUTES || n > DELAY_MAX_MINUTES) return null;
  return n;
}

function startOfUtcDayIso(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Programma la mail di ripresa di un ordine. **Non solleva mai.**
 *
 * Da chiamare **dopo** l'insert dell'ordine e **prima** di restituire il
 * checkout — mai nel callback differito di Next (P-3).
 */
export async function scheduleOrderResumeEmail({
  serviceClient,
  orderId,
}: {
  serviceClient: ServiceClient;
  orderId: string;
}): Promise<
  | { scheduled: true; emailId: string }
  | { scheduled: false; reason: OrderResumeSkip }
> {
  const skip = (
    reason: OrderResumeSkip,
    detail: string
  ): { scheduled: false; reason: OrderResumeSkip } => {
    const line = `[tickets.order_resume_${reason}] order=${orderId} ${detail}`;
    if (reason === "disabled" || reason === "free_order") console.log(line);
    else console.error(line);
    return { scheduled: false, reason };
  };

  try {
    // ── 1. L'interruttore, spento per default ─────────────────────────────────
    //
    // CART-05 non parte finche' l'informativa (CART-06) non e' in produzione:
    // l'interruttore separa il deploy del codice dalla pubblicazione del testo.
    if (process.env.ORDER_RESUME_EMAIL_ENABLED !== "true") {
      return skip("disabled", "ORDER_RESUME_EMAIL_ENABLED non e' \"true\"");
    }

    // ── 2. Il ritardo, validato ───────────────────────────────────────────────
    const delayMinutes = readDelayMinutes();
    if (delayMinutes === null) {
      return skip(
        "delay_invalid",
        `ORDER_RESUME_DELAY_MINUTES non e' un intero fra ${DELAY_MIN_MINUTES} e ${DELAY_MAX_MINUTES}`
      );
    }

    // ── 3. L'ordine. Colonne nominate, nessuna di luogo ───────────────────────
    const { data: order, error: orderError } = await serviceClient
      .from("ticket_orders")
      .select("id, buyer_email, user_id, event_id, party_id, tier_id, status, resume_email_id, sumup_checkout_id, pii_cleared_at")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return skip(
        "order_unreadable",
        orderError ? redactDbError(orderError) : "nessuna riga"
      );
    }

    // Decisione 6: il gratuito esce PRIMA di ogni freno e di ogni chiamata al
    // fornitore. «Nothing has been charged» su un ordine che non aveva niente da
    // pagare non ha senso, e il controllo sta qui, non in ogni chiamante.
    if (!order.sumup_checkout_id) {
      return skip("free_order", "sumup_checkout_id nullo");
    }

    if (order.resume_email_id) {
      return skip("already_scheduled", "resume_email_id gia' valorizzato");
    }

    if (order.status !== "pending") {
      return skip("order_not_open", `status=${order.status}`);
    }

    const buyerEmail = normalizeBuyerEmail(order.buyer_email);
    if (!buyerEmail) {
      // Un indirizzo nullo non e' un indirizzo, e le due cause restano distinte.
      if (order.pii_cleared_at) {
        return skip("buyer_email_cleared", "indirizzo tolto dalla cancellazione tracciata");
      }
      return skip("order_unreadable", "buyer_email vuoto");
    }

    // ── 4. Il freno per indirizzo: una mail di ripresa ogni 24 h ──────────────
    //
    // `buyer_email` e' normalizzato all'ingresso (`normalizeBuyerEmail`), quindi
    // l'uguaglianza vede anche le varianti di maiuscole. Lettura fallita →
    // NON programmare: verso opposto a `resendOrderTickets`, vedi il docblock.
    const since = new Date(Date.now() - RESUME_THROTTLE_WINDOW_MS).toISOString();
    const { count: recentCount, error: throttleError } = await serviceClient
      .from("ticket_orders")
      .select("id", { count: "exact", head: true })
      .eq("buyer_email", buyerEmail)
      .not("resume_email_id", "is", null)
      .gte("created_at", since);

    if (throttleError || recentCount === null) {
      return skip(
        "throttle_unreadable",
        `freno per destinatario: ${throttleError ? redactDbError(throttleError) : "conteggio assente"}`
      );
    }

    if (recentCount >= 1) {
      await markSkipped(serviceClient, orderId);
      return skip("throttled_recipient", `${recentCount} gia' programmate nelle ultime 24 h`);
    }

    // ── 5. Il tetto giornaliero del registro ──────────────────────────────────
    const { count: todayCount, error: quotaError } = await serviceClient
      .from("email_deliveries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfUtcDayIso(new Date()));

    if (quotaError || todayCount === null) {
      return skip(
        "throttle_unreadable",
        `tetto giornaliero: ${quotaError ? redactDbError(quotaError) : "conteggio assente"}`
      );
    }

    if (todayCount >= RESUME_DAILY_QUOTA_CEILING) {
      await markSkipped(serviceClient, orderId);
      return skip(
        "skipped_quota",
        `${todayCount} righe di registro oggi (tetto ${RESUME_DAILY_QUOTA_CEILING})`
      );
    }

    // ── 6. Le letture per il testo: titolo, data civile, tier ─────────────────
    const { data: event, error: eventError } = await serviceClient
      .from("events")
      .select("title, date")
      .eq("id", order.event_id)
      .maybeSingle();

    const { data: tier, error: tierError } = await serviceClient
      .from("ticket_tiers")
      .select("name")
      .eq("id", order.tier_id)
      .maybeSingle();

    if (eventError || !event || tierError || !tier) {
      return skip(
        "order_unreadable",
        `event=${eventError ? redactDbError(eventError) : event ? "ok" : "nessuna riga"} ` +
          `tier=${tierError ? redactDbError(tierError) : tier ? "ok" : "nessuna riga"}`
      );
    }

    let partyTitle: string | null = null;
    let civilDate: string | null = event.date ? String(event.date) : null;
    if (order.party_id) {
      const { data: party, error: partyError } = await serviceClient
        .from("event_parties")
        .select("title, date")
        .eq("id", order.party_id)
        .maybeSingle();
      if (partyError || !party) {
        return skip(
          "order_unreadable",
          `serata: ${partyError ? redactDbError(partyError) : "nessuna riga"}`
        );
      }
      partyTitle = party.title ?? null;
      if (party.date) civilDate = String(party.date);
    }

    // `formatEventDate` accetta solo una data civile `YYYY-MM-DD`
    // (`src/utils/formatTime.ts:12-15`): su un timestamp stamperebbe «NaN».
    if (!civilDate || !/^\d{4}-\d{2}-\d{2}$/.test(civilDate)) {
      return skip("order_unreadable", `data civile illeggibile: ${civilDate ?? "assente"}`);
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
    if (!appUrl) {
      return skip("schedule_failed", "NEXT_PUBLIC_APP_URL assente o vuota");
    }

    const eventTitle =
      partyTitle && partyTitle !== event.title
        ? `${event.title} — ${partyTitle}`
        : event.title;
    const resumeUrl = `${appUrl}/tickets/order/${generateTicketToken(orderId)}`;

    // ── 7. La programmazione presso il fornitore ──────────────────────────────
    const html = await render(
      OrderResumeEmail({
        eventTitle,
        dateLabel: formatEventDate(civilDate),
        tierName: tier.name,
        resumeUrl,
      })
    );

    const { data: sent, error: sendError } = await getResend().emails.send(
      {
        from: process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>",
        to: [buyerEmail],
        subject: `Your order for ${event.title} is still open`,
        html,
        scheduledAt: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(),
      },
      { idempotencyKey: `order-resume/${orderId}` }
    );

    if (sendError || !sent?.id) {
      return skip(
        "schedule_failed",
        sendError ? `${sendError.name}: ${sendError.message}` : "id assente nella risposta"
      );
    }
    const emailId = sent.id;

    // ── 8. L'id sull'ordine, o l'annullamento immediato ───────────────────────
    //
    // Una mail che nessuno puo' annullare non resta in coda: se l'id non si
    // scrive, i punti di annullamento non lo troveranno mai.
    const { data: updated, error: updateError } = await serviceClient
      .from("ticket_orders")
      .update({ resume_email_id: emailId, resume_email_state: "scheduled" })
      .eq("id", orderId)
      .is("resume_email_id", null)
      .select("id");

    if (updateError || (updated?.length ?? 0) === 0) {
      console.error(
        `[tickets.order_resume_id_unrecorded] order=${orderId} ` +
          (updateError ? redactDbError(updateError) : "zero righe aggiornate")
      );
      await cancelOrderResumeEmail({
        serviceClient,
        orderId,
        eventId: order.event_id,
        emailId,
        trigger: "schedule_rollback",
        mode: "persistent",
      });
      return { scheduled: false, reason: "id_unrecorded" };
    }

    // ── 9. Il registro. Un registro fallito si logga, non annulla la mail ─────
    //
    // `ticketId` nullo: l'ordine non ha biglietti. `partyId` per attribuire la
    // riga alla sua serata.
    const recorded = await recordSend(emailId, {
      category: ORDER_RESUME_CATEGORY,
      userId: order.user_id ?? null,
      partyId: order.party_id ?? null,
    });
    if (!recorded) {
      console.error(`[tickets.order_resume_unrecorded_in_ledger] order=${orderId}`);
    }

    return { scheduled: true, emailId };
  } catch (unexpected) {
    return skip(
      "schedule_failed",
      unexpected instanceof Error ? unexpected.message : "errore non-Error"
    );
  }
}

/** `resume_email_state = 'skipped'` su un ordine che non ha ancora una mail. Non solleva. */
async function markSkipped(serviceClient: ServiceClient, orderId: string): Promise<void> {
  const { error } = await serviceClient
    .from("ticket_orders")
    .update({ resume_email_state: "skipped" })
    .eq("id", orderId)
    .is("resume_email_id", null);
  if (error) {
    console.error(
      `[tickets.order_resume_skip_unrecorded] order=${orderId} ${redactDbError(error)}`
    );
  }
}

/**
 * Scrive l'esito di un annullamento sull'ordine, solo da uno stato
 * annullabile (`scheduled` o `cancel_failed`). Non solleva.
 */
async function writeCancelState(
  serviceClient: ServiceClient,
  orderId: string,
  emailId: string,
  state: "canceled" | "sent" | "cancel_failed"
): Promise<void> {
  const { error } = await serviceClient
    .from("ticket_orders")
    .update({ resume_email_state: state })
    .eq("id", orderId)
    .eq("resume_email_id", emailId)
    .in("resume_email_state", [...CANCELLABLE_STATES]);
  if (error) {
    console.error(
      `[tickets.order_resume_state_unrecorded] order=${orderId} state=${state} ${redactDbError(error)}`
    );
  }
}

type AttemptResult = "canceled" | "sent" | "queued";

/**
 * Un tentativo: `cancel`, e se fallisce la lettura dello stato vero con `get`.
 * Lo stato si legge, non si deduce dall'errore (P-4).
 */
async function attemptCancel(orderId: string, emailId: string): Promise<AttemptResult> {
  const resend = getResend();
  try {
    const { error: cancelError } = await resend.emails.cancel(emailId);
    if (!cancelError) return "canceled";
  } catch (e) {
    console.error(
      `[tickets.order_resume_cancel_threw] order=${orderId} ${e instanceof Error ? e.message : "errore non-Error"}`
    );
  }

  try {
    const { data, error } = await resend.emails.get(emailId);
    if (error || !data) {
      console.error(
        `[tickets.order_resume_status_unreadable] order=${orderId} ${error ? `${error.name}: ${error.message}` : "risposta vuota"}`
      );
      return "queued";
    }
    const lastEvent = data.last_event;
    if (lastEvent === "canceled") return "canceled";
    if (lastEvent === "failed") {
      // Il fornitore non l'ha consegnata e non la consegnera': la persona non
      // ricevera' «still open», ed e' l'effetto che l'annullamento cercava.
      console.error(`[tickets.order_resume_provider_failed] order=${orderId}`);
      return "canceled";
    }
    if (ALREADY_SENT_EVENTS.has(lastEvent)) return "sent";
    if (!STILL_QUEUED_EVENTS.has(lastEvent)) {
      console.error(
        `[tickets.order_resume_status_unknown] order=${orderId} last_event=${String(lastEvent)}`
      );
    }
    return "queued";
  } catch (e) {
    console.error(
      `[tickets.order_resume_status_threw] order=${orderId} ${e instanceof Error ? e.message : "errore non-Error"}`
    );
    return "queued";
  }
}

/**
 * Annulla la mail di ripresa di un ordine. **Non solleva mai.**
 *
 * - `persistent` (webhook, cron, rollback della programmazione): tentativi a
 *   0 · 1,5 · 3 · 6 s. Esauriti con la mail ancora in coda → `cancel_failed`,
 *   log e avviso all'organizer. Una mail gia' partita (`sent`) **non** e' un
 *   fallimento: e' chi ha pagato dal link della mail stessa (P-4), e non avvisa.
 * - `single` (pagina ordine, ritorno dal pagamento): un tentativo, reti di
 *   riserva. Non scrive mai `cancel_failed` e non avvisa: il webhook e il cron
 *   sono i soli che dichiarano un fallimento.
 *
 * `not_ours`: l'ordine porta un id diverso da quello passato — non si tocca una
 * mail che la riga non possiede.
 */
export async function cancelOrderResumeEmail({
  serviceClient,
  orderId,
  eventId,
  emailId,
  trigger,
  mode,
}: {
  serviceClient: ServiceClient;
  orderId: string;
  eventId: string;
  emailId: string;
  trigger: ResumeCancelTrigger;
  mode: "persistent" | "single";
}): Promise<ResumeCancelOutcome> {
  try {
    // Nel rollback l'id non e' sulla riga per definizione: si annulla e basta.
    if (trigger !== "schedule_rollback") {
      const { data: row, error: rowError } = await serviceClient
        .from("ticket_orders")
        .select("resume_email_id, resume_email_state")
        .eq("id", orderId)
        .maybeSingle();

      if (rowError) {
        // Lettura fallita: si annulla lo stesso. Fra un annullamento in piu' e
        // una mail falsa a chi ha pagato, si sbaglia verso l'annullamento.
        console.error(
          `[tickets.order_resume_row_unreadable] order=${orderId} trigger=${trigger} ${redactDbError(rowError)}`
        );
      } else if (!row || row.resume_email_id !== emailId) {
        console.error(
          `[tickets.order_resume_not_ours] order=${orderId} trigger=${trigger}`
        );
        return "not_ours";
      } else if (row.resume_email_state === "canceled") {
        return "canceled";
      } else if (row.resume_email_state === "sent") {
        return "sent";
      }
    }

    const offsets = mode === "persistent" ? CANCEL_ATTEMPT_OFFSETS_MS : [0];
    let elapsed = 0;
    for (const offset of offsets) {
      if (offset > elapsed) {
        await sleep(offset - elapsed);
        elapsed = offset;
      }
      const result = await attemptCancel(orderId, emailId);
      if (result === "canceled") {
        await writeCancelState(serviceClient, orderId, emailId, "canceled");
        return "canceled";
      }
      if (result === "sent") {
        console.log(
          `[tickets.order_resume_already_sent] order=${orderId} trigger=${trigger}`
        );
        await writeCancelState(serviceClient, orderId, emailId, "sent");
        return "sent";
      }
    }

    if (mode === "single") {
      console.log(
        `[tickets.order_resume_still_scheduled] order=${orderId} trigger=${trigger}`
      );
      return "still_scheduled";
    }

    console.error(
      `[tickets.order_resume_cancel_failed] order=${orderId} trigger=${trigger}`
    );
    await writeCancelState(serviceClient, orderId, emailId, "cancel_failed");
    await alertOrganizerResumeEmailNotCancelled({ serviceClient, orderId, eventId });
    return "cancel_failed";
  } catch (unexpected) {
    console.error(
      `[tickets.order_resume_cancel_threw] order=${orderId} trigger=${trigger} ` +
        (unexpected instanceof Error ? unexpected.message : "errore non-Error")
    );
    return mode === "persistent" ? "cancel_failed" : "still_scheduled";
  }
}

/**
 * Annulla le mail di ripresa degli ALTRI ordini aperti dello stesso acquirente
 * per la stessa serata (decisione 5). **Non solleva mai.**
 *
 * Chiamata dal webhook quando porta un ordine a `completed`. Per serata si
 * intende lo stesso `party_id`; per un ordine a livello di evento (`party_id`
 * nullo), lo stesso `event_id` con `party_id` nullo.
 *
 * Il confronto sull'acquirente e' un'uguaglianza sul valore normalizzato
 * (`normalizeBuyerEmail`, minuscolo): ogni ordine che puo' avere una mail di
 * ripresa e' nato dopo la normalizzazione. Un'uguaglianza invece di un
 * `ilike` perche' in un confronto con caratteri jolly `_`, `%` e `*` di un
 * indirizzo reale diventerebbero pattern.
 */
export async function cancelSiblingResumeEmails({
  serviceClient,
  paidOrderId,
  buyerEmail,
  eventId,
  partyId,
}: {
  serviceClient: ServiceClient;
  paidOrderId: string;
  buyerEmail: string;
  eventId: string;
  partyId: string | null;
}): Promise<{
  considered: number;
  canceled: number;
  sent: number;
  cancelFailed: number;
  unreadable: boolean;
}> {
  const report = { considered: 0, canceled: 0, sent: 0, cancelFailed: 0, unreadable: false };

  try {
    const normalized = normalizeBuyerEmail(buyerEmail);
    if (!normalized) return report;

    let query = serviceClient
      .from("ticket_orders")
      .select("id, event_id, resume_email_id, resume_email_state")
      .eq("buyer_email", normalized)
      .neq("id", paidOrderId)
      .in("resume_email_state", [...CANCELLABLE_STATES])
      .not("resume_email_id", "is", null);

    query = partyId
      ? query.eq("party_id", partyId)
      : query.eq("event_id", eventId).is("party_id", null);

    const { data: siblings, error } = await query;

    if (error) {
      console.error(
        `[tickets.order_resume_sibling_unreadable] order=${paidOrderId} ${redactDbError(error)}`
      );
      return { ...report, unreadable: true };
    }

    // In sequenza: ogni annullamento puo' durare sei secondi, e una raffica in
    // parallelo verso il fornitore non annulla prima.
    for (const sibling of siblings ?? []) {
      if (!sibling.resume_email_id) continue;
      report.considered += 1;
      const outcome = await cancelOrderResumeEmail({
        serviceClient,
        orderId: sibling.id,
        eventId: sibling.event_id,
        emailId: sibling.resume_email_id,
        trigger: "webhook_sibling",
        mode: "persistent",
      });
      if (outcome === "canceled") report.canceled += 1;
      else if (outcome === "sent") report.sent += 1;
      else if (outcome === "cancel_failed") report.cancelFailed += 1;
    }

    return report;
  } catch (unexpected) {
    console.error(
      `[tickets.order_resume_sibling_threw] order=${paidOrderId} ` +
        (unexpected instanceof Error ? unexpected.message : "errore non-Error")
    );
    return { ...report, unreadable: true };
  }
}
