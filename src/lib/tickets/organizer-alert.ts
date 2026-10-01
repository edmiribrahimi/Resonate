import "server-only";

import type { getServiceClient } from "@/lib/supabase/service";
import { redactDbError } from "@/lib/errors/redact";
import { formatEventDate, formatTime } from "@/utils/formatTime";

/**
 * organizer-alert.ts — le mail che il prodotto manda A NOI, alla casella
 * dell'organizzazione (`ORGANIZER_ALERT_EMAIL`, su Vercel = info@).
 *
 * Sono quattro, e nascono dallo stesso bisogno: questo progetto non ha error
 * tracking (`meta-gates.md`), quindi cio' che deve raggiungere un essere umano
 * ci arriva per posta o non ci arriva.
 *
 *   1. {@link alertOrganizerPaidNotIssued} — un incasso senza biglietti
 *      (2026-09-08).
 *   2. {@link notifyOrganizerOfSale} — il riepilogo di ogni vendita pagata
 *      (2026-09-25).
 *   3. {@link alertOrganizerResumeEmailNotCancelled} — una mail «still open»
 *      che non si e' potuta annullare su un ordine pagato (2026-09-30).
 *   4. {@link alertOrganizerRefundUnattributed} — un rimborso parziale su
 *      SumUp che non corrisponde a un biglietto (2026-09-30).
 *
 * ── In inglese, come tutta la piattaforma ────────────────────────────────────
 *
 * Decisione del proprietario, 2026-09-25: *«anche le mail che arrivano a noi
 * devono essere in inglese»*. L'avviso dell'incasso senza biglietti era in
 * italiano ed e' stato tradotto con questa modifica. `comms-analytics.md`, gate
 * *una lingua sola per percorso*.
 *
 * ── Perche' non passano da `sendEmail` ───────────────────────────────────────
 *
 * `sendEmail` registra ogni invio in `email_deliveries` con una categoria
 * vincolata dal catalogo e da un `CHECK` in migration: sono tutti messaggi verso
 * un ospite, il cui recapito si verifica perche' il suo mancato arrivo costa
 * alla porta. Queste sono mail a noi stessi: non e' una consegna da verificare,
 * e aprire una categoria per ognuna sarebbe una migration per un log. Vanno
 * dirette al fornitore, con lo stesso mittente.
 *
 * ── I paletti comuni ─────────────────────────────────────────────────────────
 *
 * - **Ausiliarie, mai bloccanti.** Non sollevano mai: qualunque errore finisce
 *   nel log con la sua categoria, e il percorso del denaro prosegue
 *   (`ticketing-payments.md`, *soldi vs contenuto*).
 * - **Nessun indirizzo di sede, mai**, nemmeno sulle serate non segrete: e' una
 *   casella inoltrata a un servizio di posta esterno. Nessuna `select` qui
 *   dentro nomina una colonna di luogo.
 */

type ServiceClient = ReturnType<typeof getServiceClient>;

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const euro = (n: number) => `€${n.toFixed(2)}`;

/**
 * Un riferimento breve dell'ordine, messo nell'OGGETTO.
 *
 * Gmail raggruppa in una conversazione le mail con lo stesso oggetto: due
 * vendite identiche (stessa serata, stesso tier, stessa quantita') diventavano
 * una riga sola in casella — visto dal proprietario il 2026-09-25 sulle prove.
 * Un oggetto diverso per ordine tiene ogni vendita, e ogni avviso, una mail a se'.
 */
const shortRef = (id: string) => `#${id.replace(/^test2?-/, "").slice(0, 8).toUpperCase()}`;

const appBase = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");

/**
 * L'invio verso la casella dell'organizzazione. Non solleva mai.
 *
 * `idempotencyKey` va nell'header `Idempotency-Key` del fornitore: per 24 ore
 * una seconda richiesta con la stessa chiave non produce una seconda mail
 * (resend.com/docs/dashboard/emails/idempotency-keys, letto il 2026-09-25). E'
 * cio' che copre due consegne SIMULTANEE dello stesso webhook, che l'uscita su
 * `completed` non vede perche' nessuna delle due ha ancora chiuso l'ordine.
 */
async function sendToOrganizer(args: {
  tag: string;
  ref: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
  /**
   * Il nome del mittente in casella. L'indirizzo resta quello di
   * `RESEND_FROM_EMAIL` (dominio gia' allineato SPF/DKIM): cambia solo cio' che
   * si legge nella colonna «Da», che e' la prima cosa che l'occhio scorre.
   */
  senderName: string;
  /** Marca il messaggio come urgente per i client che leggono l'header. */
  urgent?: boolean;
}): Promise<void> {
  const to = (process.env.ORGANIZER_ALERT_EMAIL ?? "").trim();
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  if (!to || !apiKey) {
    console.error(
      `[tickets.${args.tag}_skipped] ${args.ref}: ` +
        (to ? "RESEND_API_KEY missing" : "ORGANIZER_ALERT_EMAIL not set — this mail reached nobody")
    );
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(args.idempotencyKey ? { "Idempotency-Key": args.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: `${args.senderName} <${senderAddress()}>`,
        to,
        subject: args.subject,
        html: args.html,
        ...(args.urgent
          ? { headers: { "X-Priority": "1", Importance: "high" } }
          : {}),
      }),
    });
    if (!res.ok) {
      console.error(
        `[tickets.${args.tag}_failed] ${args.ref} http=${res.status} ${(await res.text()).slice(0, 200)}`
      );
      return;
    }
    console.log(`[tickets.${args.tag}_sent] ${args.ref} to=organizer`);
  } catch (e) {
    console.error(`[tickets.${args.tag}_failed] ${args.ref}`, e);
  }
}

/** L'indirizzo nudo di `RESEND_FROM_EMAIL`, senza il nome davanti. */
function senderAddress(): string {
  const raw = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  const inAngles = raw.match(/<([^>]+)>/);
  return inAngles?.[1] ?? (raw || "onboarding@resend.dev");
}

const wrap = (body: string) => `
  <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
    ${body}
  </div>`;

/**
 * Un incasso senza biglietti raggiunge un essere umano da solo.
 *
 * Un ordine pagato i cui biglietti non sono nati lo vede solo chi apre la
 * pagina dei biglietti di quella serata. Se nessuno la apre, quella persona
 * arriva alla porta senza niente. Decisione del proprietario, 2026-09-08: una
 * mail alla casella dell'organizzazione, con il link alla scheda dove c'e'
 * «Retry issuing».
 *
 * 1. Solo quando c'e' un INCASSO senza biglietti: e' chiamata dal ramo del
 *    webhook che gira dopo aver riletto `PAID` dal fornitore.
 * 2. Una per ordine: chi chiama la manda solo alla PRIMA transizione a
 *    `failed`. Il rigioco (`replay-order-delivery.ts`) lascia una traccia in
 *    `error_message` proprio perche' un secondo fallimento non riavvisi.
 * 3. Contenuto minimo: serata, importo, causa, link.
 */
export async function alertOrganizerPaidNotIssued(args: {
  serviceClient: ServiceClient;
  orderId: string;
  eventId: string;
  quantity: number;
  totalAmount: number;
  cause: string;
}): Promise<void> {
  let night = "an event";
  let date = "";
  try {
    const { data: event } = await args.serviceClient
      .from("events")
      .select("title, date")
      .eq("id", args.eventId)
      .maybeSingle();
    night = event?.title ?? night;
    date = event?.date ? formatEventDate(String(event.date)) : "";
  } catch (e) {
    // Senza il titolo l'avviso parte lo stesso: cio' che conta e' il link.
    console.error(`[tickets.organizer_alert_event_unreadable] order=${args.orderId}`, e);
  }

  const link = `${appBase()}/admin/events/${args.eventId}/sales`;
  const amount = euro(args.totalAmount);

  // ── Non deve perdersi fra i riepiloghi ─────────────────────────────────────
  //
  // Richiesta del proprietario, 2026-09-25: *«non dobbiamo assolutamente
  // perdercela tra le varie mail che ci arrivano»*. Dalla stessa data info@
  // riceve un riepilogo per OGNI vendita, e questo avviso ha la stessa casella
  // e lo stesso dominio. Quindi si separa su tre piani, ognuno leggibile da
  // solo: il **mittente** («Resonate ALERT» contro «Resonate Sales»), l'**inizio
  // dell'oggetto** («ACTION NEEDED», su cui un filtro di posta puo' agganciarsi)
  // e il **corpo**, con una fascia rossa. Piu' l'header di priorita' per i
  // client che lo rispettano — Gmail no, per questo non e' l'unico segnale.
  await sendToOrganizer({
    tag: "organizer_alert",
    ref: `order=${args.orderId}`,
    senderName: "Resonate ALERT",
    urgent: true,
    subject: `⚠️ ACTION NEEDED — Paid, no tickets issued — ${night} — ${amount} — ${shortRef(args.orderId)}`,
    html: wrap(`
      <div style="background:#C62828;color:#fff;padding:14px 16px;border-radius:6px;margin-bottom:16px">
        <div style="font-size:12px;letter-spacing:.08em;font-weight:700">ACTION NEEDED</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px">Someone paid ${esc(amount)} and has no tickets.</div>
        <div style="font-size:14px;margin-top:4px">If nobody acts, they arrive at the door with nothing.</div>
      </div>
      <p>Event: <strong>${esc(night)}</strong>${date ? ` · ${esc(date)}` : ""}<br>
         Tickets: ${args.quantity} · Amount collected: <strong>${esc(amount)}</strong><br>
         Cause: <code>${esc(args.cause)}</code></p>
      <p>The buyer was told not to pay again and that we would be in touch. It is on us:
         open the order and press <strong>Retry issuing</strong>
         (if the cause is a missing email address, fix that first).</p>
      <p><a href="${link}" style="display:inline-block;background:#C62828;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open the order</a></p>
      <p style="color:#666;font-size:12px">${link}<br>Order ${esc(args.orderId)}. This alert is sent once per order.</p>`),
  });
}

/**
 * Il riepilogo di una vendita, alla casella dell'organizzazione.
 *
 * Decisione del proprietario, 2026-09-25: *«quando qualcuno compra un ticket,
 * deve arrivarci una mail con il riepilogo dell'ordine su info»* — con nome ed
 * email di chi compra, e **solo per le vendite pagate**: un ordine a totale zero
 * non passa di qui (la guardia e' dentro, non nei chiamanti).
 *
 * Chiamata dal webhook SumUp, dopo la rilettura di `PAID` dal fornitore e dopo
 * l'emissione dei biglietti, sui **due** rami che vendono: l'ordine
 * (`ticket_orders`) e la strada vecchia dell'Event Pass (`pending_purchases`).
 * Una seconda consegna dello stesso webhook esce prima, su `completed`; due
 * consegne simultanee le ferma `idempotencyKey` = `order-summary/<ref>`.
 *
 * **Contiene dati personali** (nome, email) per decisione esplicita: servono a
 * rispondere a chi scrive «non mi e' arrivato il biglietto» senza aprire
 * l'admin. Non contiene il luogo, ne' i codici dei biglietti.
 */
export async function notifyOrganizerOfSale(args: {
  serviceClient: ServiceClient;
  /** L'id dell'ordine o dell'acquisto: e' la chiave di idempotenza. */
  ref: string;
  eventId: string;
  partyId: string | null;
  tierId: string;
  quantity: number;
  amountPaid: number;
  discountCodeId: string | null;
  transactionCode: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  /** Per risolvere nome ed email dal profilo quando l'ordine non li porta. */
  buyerUserId: string | null;
}): Promise<void> {
  const ref = `ref=${args.ref}`;
  if (!(args.amountPaid > 0)) {
    // Solo vendite pagate, per decisione. Non e' un errore: nessun log rumoroso.
    return;
  }

  const db = args.serviceClient;
  const readErr = (what: string, e: unknown) =>
    console.error(`[tickets.order_summary_${what}_unreadable] ${ref} ${redactDbError(e)}`);

  // Ogni lettura e' facoltativa: un campo mancante nel riepilogo e' meglio di
  // un riepilogo che non parte.
  let eventTitle = "Unknown event";
  let dateLine = "";
  let partyTitle: string | null = null;
  let tierName = "—";
  let discountCode: string | null = null;
  let buyerName = (args.buyerName ?? "").trim() || null;
  let buyerEmail = (args.buyerEmail ?? "").trim() || null;

  try {
    const { data: event, error } = await db
      .from("events")
      .select("title, date")
      .eq("id", args.eventId)
      .maybeSingle();
    if (error) readErr("event", error);
    if (event?.title) eventTitle = event.title;
    if (event?.date) dateLine = formatEventDate(String(event.date));

    if (args.partyId) {
      // Tre colonne di tempo e un titolo. Nessuna colonna di luogo.
      const { data: party, error: partyError } = await db
        .from("event_parties")
        .select("title, date, time, end_time")
        .eq("id", args.partyId)
        .maybeSingle();
      if (partyError) readErr("party", partyError);
      if (party) {
        partyTitle = party.title ?? null;
        const day = party.date ? formatEventDate(String(party.date)) : dateLine;
        const hours = party.time
          ? ` · ${formatTime(party.time)}${party.end_time ? `–${formatTime(party.end_time)}` : ""}`
          : "";
        dateLine = `${day}${hours}`;
      }
    } else {
      partyTitle = "Event Pass";
    }

    const { data: tier, error: tierError } = await db
      .from("ticket_tiers")
      .select("name")
      .eq("id", args.tierId)
      .maybeSingle();
    if (tierError) readErr("tier", tierError);
    if (tier?.name) tierName = tier.name;

    if (args.discountCodeId) {
      const { data: code, error: codeError } = await db
        .from("discount_codes")
        .select("code")
        .eq("id", args.discountCodeId)
        .maybeSingle();
      if (codeError) readErr("discount", codeError);
      discountCode = code?.code ?? null;
    }

    if ((!buyerName || !buyerEmail) && args.buyerUserId) {
      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("full_name, email")
        .eq("id", args.buyerUserId)
        .maybeSingle();
      if (profileError) readErr("profile", profileError);
      buyerName = buyerName ?? ((profile?.full_name ?? "").trim() || null);
      buyerEmail = buyerEmail ?? ((profile?.email ?? "").trim() || null);
    }
  } catch (e) {
    readErr("unexpected", e);
  }

  const amount = euro(args.amountPaid);
  const title = partyTitle && partyTitle !== eventTitle ? `${eventTitle} — ${partyTitle}` : eventTitle;
  const link = `${appBase()}/admin/events/${args.eventId}/sales`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:2px 16px 2px 0;color:#666">${label}</td><td style="padding:2px 0">${value}</td></tr>`;

  await sendToOrganizer({
    tag: "order_summary",
    ref,
    senderName: "Resonate Sales",
    idempotencyKey: `order-summary/${args.ref}`,
    subject: `New order — ${eventTitle} — ${args.quantity} × ${tierName} — ${amount} — ${shortRef(args.ref)}`,
    html: wrap(`
      <p><strong>New order</strong></p>
      <table style="border-collapse:collapse;font-size:15px">
        ${row("Event", `<strong>${esc(title)}</strong>`)}
        ${dateLine ? row("Date", esc(dateLine)) : ""}
        ${row("Tier", esc(tierName))}
        ${row("Tickets", String(args.quantity))}
        ${row("Paid", `<strong>${esc(amount)}</strong>`)}
        ${discountCode ? row("Discount code", `<code>${esc(discountCode)}</code>`) : ""}
        ${row("Buyer", esc(buyerName ?? "—"))}
        ${row("Email", buyerEmail ? `<a href="mailto:${esc(buyerEmail)}">${esc(buyerEmail)}</a>` : "—")}
        ${args.transactionCode ? row("SumUp transaction", `<code>${esc(args.transactionCode)}</code>`) : ""}
      </table>
      <p><a href="${link}">${link}</a></p>
      <p style="color:#666;font-size:12px">Order ${esc(args.ref)}.</p>`),
  });
}

/**
 * Una mail di ripresa che non si e' potuta annullare, su un ordine pagato
 * (CART-05, fase 52.2).
 *
 * La mail dice «Nothing has been charged». Se l'annullamento persistente
 * (`order-resume.ts`, quattro tentativi in sei secondi) si esaurisce con la mail
 * ancora in coda, chi ha pagato puo' riceverla fra poco: e' una frase falsa sul
 * denaro, detta a una persona che ha appena pagato. Non la si puo' piu' fermare
 * dal prodotto; la si puo' **precedere**, scrivendo all'acquirente.
 *
 * Una per ordine: `idempotencyKey` = `resume-not-cancelled/<orderId>`. Il testo
 * non nomina alcun luogo.
 */
export async function alertOrganizerResumeEmailNotCancelled(args: {
  serviceClient: ServiceClient;
  orderId: string;
  eventId: string;
}): Promise<void> {
  let night = "an event";
  let date = "";
  try {
    const { data: event } = await args.serviceClient
      .from("events")
      .select("title, date")
      .eq("id", args.eventId)
      .maybeSingle();
    night = event?.title ?? night;
    date = event?.date ? formatEventDate(String(event.date)) : "";
  } catch (e) {
    console.error(
      `[tickets.organizer_alert_resume_not_cancelled_event_unreadable] order=${args.orderId}`,
      e
    );
  }

  const link = `${appBase()}/admin/events/${args.eventId}/sales`;

  await sendToOrganizer({
    tag: "organizer_alert_resume_not_cancelled",
    ref: `order=${args.orderId}`,
    senderName: "Resonate ALERT",
    urgent: true,
    idempotencyKey: `resume-not-cancelled/${args.orderId}`,
    subject: `⚠️ ACTION NEEDED — Paid order, reminder email may still go out — ${night} — ${shortRef(args.orderId)}`,
    html: wrap(`
      <div style="background:#C62828;color:#fff;padding:14px 16px;border-radius:6px;margin-bottom:16px">
        <div style="font-size:12px;letter-spacing:.08em;font-weight:700">ACTION NEEDED</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px">A paid order may still receive «your order is still open».</div>
        <div style="font-size:14px;margin-top:4px">That email says nothing has been charged — which is no longer true.</div>
      </div>
      <p>Event: <strong>${esc(night)}</strong>${date ? ` · ${esc(date)}` : ""}</p>
      <p>The order has been paid, but the scheduled reminder «your order is still open»
         could not be cancelled with the email provider. If the buyer receives it,
         write to them that their payment went through and their tickets are valid.</p>
      <p><a href="${link}" style="display:inline-block;background:#C62828;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open the order</a></p>
      <p style="color:#666;font-size:12px">${link}<br>Order ${esc(args.orderId)}. This alert is sent once per order.</p>`),
  });
}

/**
 * Un rimborso parziale su SumUp che non corrisponde a un biglietto (RFD-02,
 * fase 52.2).
 *
 * Il cron dei rimborsi raggruppa per transazione: quando l'importo rimborsato
 * sul fornitore non si spiega con biglietti interi, **non cancella niente** —
 * indovinare quale biglietto togliere significherebbe respingere alla porta una
 * persona valida, l'errore che costa di piu' (`checkin-offline.md`). Ma un
 * rimborso non attribuito che resta solo in un log e' un fallimento silenzioso:
 * questo avviso lo porta a un essere umano.
 *
 * `transactionRef` e' il codice della transazione: nell'oggetto ne va solo la
 * coda (ultimi sei caratteri), il codice intero sta nel corpo. Una per
 * transazione e importo: `idempotencyKey` = `refund-unattributed/<tx>/<importo>`,
 * cosi' un rimborso ulteriore sulla stessa transazione riavvisa. Nessun luogo.
 */
export async function alertOrganizerRefundUnattributed(args: {
  serviceClient: ServiceClient;
  eventId: string;
  transactionRef: string;
  refundedTotal: number;
  explained: number;
  liveAmount: number;
}): Promise<void> {
  let night = "an event";
  let date = "";
  try {
    const { data: event } = await args.serviceClient
      .from("events")
      .select("title, date")
      .eq("id", args.eventId)
      .maybeSingle();
    night = event?.title ?? night;
    date = event?.date ? formatEventDate(String(event.date)) : "";
  } catch (e) {
    console.error(
      `[tickets.organizer_alert_refund_unattributed_event_unreadable] tx=${args.transactionRef.slice(-6)}`,
      e
    );
  }

  const link = `${appBase()}/admin/events/${args.eventId}/sales`;
  const txShort = args.transactionRef.slice(-6).toUpperCase();

  await sendToOrganizer({
    tag: "organizer_alert_refund_unattributed",
    ref: `tx=…${txShort}`,
    senderName: "Resonate ALERT",
    urgent: true,
    idempotencyKey: `refund-unattributed/${args.transactionRef}/${args.refundedTotal}`,
    subject: `⚠️ ACTION NEEDED — Partial refund on SumUp not matched to a ticket — ${night} — …${txShort}`,
    html: wrap(`
      <div style="background:#C62828;color:#fff;padding:14px 16px;border-radius:6px;margin-bottom:16px">
        <div style="font-size:12px;letter-spacing:.08em;font-weight:700">ACTION NEEDED</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px">A refund on SumUp does not match whole tickets.</div>
        <div style="font-size:14px;margin-top:4px">No ticket was cancelled: refund the specific ticket from the app, or cancel it by hand.</div>
      </div>
      <p>Event: <strong>${esc(night)}</strong>${date ? ` · ${esc(date)}` : ""}</p>
      <p>Refunded on SumUp: <strong>${esc(euro(args.refundedTotal))}</strong><br>
         Explained by tickets already refunded: ${esc(euro(args.explained))}<br>
         Paid for tickets still valid: ${esc(euro(args.liveAmount))}</p>
      <p>The difference cannot be matched to one ticket, so nothing was removed from the door list.</p>
      <p><a href="${link}" style="display:inline-block;background:#C62828;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open the tickets</a></p>
      <p style="color:#666;font-size:12px">${link}<br>SumUp transaction <code>${esc(args.transactionRef)}</code>.</p>`),
  });
}
