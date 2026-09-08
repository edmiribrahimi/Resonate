import "server-only";

import type { getServiceClient } from "@/lib/supabase/service";

/**
 * Un incasso senza biglietti raggiunge un essere umano da solo.
 *
 * ── Perche' esiste ───────────────────────────────────────────────────────────
 *
 * Questo progetto non ha error tracking (`meta-gates.md`): un ordine pagato i
 * cui biglietti non sono nati oggi lo vede solo chi apre la pagina dei
 * biglietti di quella serata. Se nessuno la apre, quella persona arriva alla
 * porta senza niente. Decisione del proprietario, 2026-09-08: una mail alla
 * casella dell'organizzazione, con il link alla scheda dove c'e' «Retry
 * issuing».
 *
 * ── I quattro paletti ────────────────────────────────────────────────────────
 *
 * 1. Solo quando c'e' un INCASSO senza biglietti: e' chiamata dal ramo del
 *    webhook che gira dopo aver riletto `PAID` dal fornitore, mai per un
 *    carrello abbandonato o una carta rifiutata.
 * 2. Una per ordine: chi chiama la manda solo alla PRIMA transizione a
 *    `failed`. Il rigioco (`replay-order-delivery.ts`) lascia una traccia in
 *    `error_message` proprio perche' un secondo fallimento non riavvisi.
 * 3. Ausiliaria, mai bloccante: qualunque errore qui finisce nel log e
 *    l'ordine resta com'e' (`ticketing-payments.md`, *soldi vs contenuto*).
 * 4. Contenuto minimo: serata, importo, causa, link. **Nessun indirizzo di
 *    sede**, mai: e' una casella di posta come le altre.
 *
 * ── Perche' non passa da `sendEmail` ─────────────────────────────────────────
 *
 * `sendEmail` registra ogni invio in `email_deliveries` con una categoria
 * vincolata dal catalogo (dodici messaggi, tutti verso un ospite o un socio).
 * Questo e' un avviso interno: non e' una consegna da verificare, e aprire una
 * tredicesima categoria per un messaggio a noi stessi sarebbe una migration
 * per un log. Va direttamente al fornitore di posta, con lo stesso mittente.
 */
export async function alertOrganizerPaidNotIssued(args: {
  serviceClient: ReturnType<typeof getServiceClient>;
  orderId: string;
  eventId: string;
  quantity: number;
  totalAmount: number;
  cause: string;
}): Promise<void> {
  const to = (process.env.ORGANIZER_ALERT_EMAIL ?? "").trim();
  const apiKey = process.env.RESEND_API_KEY;
  if (!to || !apiKey) {
    console.error(
      `[tickets.organizer_alert_skipped] order=${args.orderId}: ` +
        (to ? "RESEND_API_KEY missing" : "ORGANIZER_ALERT_EMAIL not set — a paid order without tickets reached nobody")
    );
    return;
  }

  try {
    const { data: event } = await args.serviceClient
      .from("events")
      .select("title, date")
      .eq("id", args.eventId)
      .maybeSingle();

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
    const link = `${base}/admin/events/${args.eventId}/tickets`;
    const night = event?.title ?? "una serata";
    const amount = `${args.totalAmount.toFixed(2).replace(".", ",")} €`;
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const subject = `Pagato senza biglietti — ${night} — ${amount}`;
    const html = `
      <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
        <p><strong>Un ordine e' stato pagato e i biglietti non sono nati.</strong></p>
        <p>Serata: <strong>${esc(night)}</strong>${event?.date ? ` · ${esc(String(event.date))}` : ""}<br>
           Biglietti: ${args.quantity} · Importo incassato: <strong>${esc(amount)}</strong><br>
           Causa: <code>${esc(args.cause)}</code></p>
        <p>Chi ha pagato ha visto «non ripagare, vi scriviamo». Tocca a noi:
           apri la scheda dell'ordine e premi <strong>Retry issuing</strong>
           (se la causa e' una mail assente, correggila prima).</p>
        <p><a href="${link}">${link}</a></p>
        <p style="color:#666;font-size:12px">Ordine ${esc(args.orderId)}. Questo avviso parte una volta per ordine.</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error(
        `[tickets.organizer_alert_failed] order=${args.orderId} http=${res.status} ${(await res.text()).slice(0, 200)}`
      );
      return;
    }
    console.log(`[tickets.organizer_alert_sent] order=${args.orderId} to=organizer`);
  } catch (e) {
    console.error(`[tickets.organizer_alert_failed] order=${args.orderId}`, e);
  }
}
