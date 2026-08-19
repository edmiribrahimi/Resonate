import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getResend } from "@/lib/email";
import { EventReminderEmail } from "@/emails/event-reminder";
import { render } from "@react-email/render";
import { formatTime, formatEventDate } from "@/utils/formatTime";
import { partyStartInstant, zonedDateString } from "@/utils/datetime";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const resend = getResend();
  const fromAddress =
    process.env.RESEND_FROM_EMAIL || "Resonate <onboarding@resend.dev>";

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find parties happening in the next 24 hours.
  // The SQL filter is deliberately wider than the window and expressed in Turin
  // days: `date` is a wall-clock date, so a UTC day boundary would drop a party
  // for the two hours around midnight. The exact cut is the instant filter below.
  const { data: parties, error: partiesError } = await supabase
    .from("event_parties")
    .select("id, title, date, time, event_id, events(title, slug)")
    .gte("date", zonedDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000)))
    .lte("date", zonedDateString(new Date(now.getTime() + 48 * 60 * 60 * 1000)));

  // Qui l'errore veniva scartato nella destrutturazione, e una lettura fallita
  // usciva come `{ sent: 0 }` con HTTP 200 — cioe' indistinguibile da «stanotte
  // non c'era niente da mandare». In un repository senza error tracking
  // (`meta-gates.md`) quella e' la forma esatta di un fallimento che non
  // raggiunge nessuno: il codice di risposta e' l'unico effetto osservabile che
  // questo cron ha, e va speso.
  if (partiesError) {
    console.error(
      `[event_reminders.parties_query_failed] ${partiesError.code ?? "unknown"} — ${partiesError.message}`
    );
    return NextResponse.json(
      { ok: false, reason: "parties_unreadable", sent: 0 },
      { status: 500 }
    );
  }

  if (!parties || parties.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no_parties_in_window" });
  }

  // Filter to parties whose date+time is within the next 24h
  const upcomingParties = parties.filter((p) => {
    const partyDateTime = partyStartInstant(p.date, p.time);
    return partyDateTime > now && partyDateTime <= in24h;
  });

  let totalSent = 0;
  /** Serate che questa corsa NON ha potuto leggere. Decide il codice di risposta. */
  let failedParties = 0;
  /** Lotti che il provider ha rifiutato. Decide il codice di risposta quanto sopra. */
  let failedBatches = 0;

  for (const party of upcomingParties) {
    const event = party.events as unknown as { title: string; slug: string };

    // ── Niente incorporamento di `profiles`, e per la stessa ragione misurata
    // in `src/lib/venue-reveal/reveal-party-venue.ts` ─────────────────────────
    //
    // `profiles(email, full_name)` qui dentro NON ha mai funzionato: PostgREST
    // risponde `PGRST200`, perche' `tickets.user_id` e `rsvps.user_id`
    // referenziano `auth.users(id)` e non `public.profiles`. E l'errore veniva
    // scartato nella destrutturazione, quindi il ciclo girava a vuoto e il cron
    // riportava «0 inviati» come SUCCESSO, tutte le notti alle 08:00 UTC.
    //
    // Oggi non si vede perche' la produzione ha zero biglietti. Morde alla prima
    // serata con biglietti veri, cioe' il giorno in cui conta.
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("id, user_id")
      .eq("party_id", party.id)
      .eq("reminder_sent", false);

    const { data: rsvps, error: rsvpsError } = await supabase
      .from("rsvps")
      .select("id, user_id")
      .eq("party_id", party.id)
      .eq("reminder_sent", false);

    if (ticketsError || rsvpsError) {
      // Categoria propria, e MAI `details`: su queste tabelle la riga che
      // l'errore porta con se' identifica un membro.
      const e = ticketsError ?? rsvpsError;
      console.error(
        `[event_reminders.recipients_query_failed] night ${party.id}: ` +
          `${e?.code ?? "unknown"} — ${e?.message}`
      );
      // Questa serata si salta, le altre no: una notte illeggibile non deve
      // togliere il promemoria a chi e' su un'altra. Il verdetto viene dato alla
      // fine, sul codice di risposta.
      failedParties += 1;
      continue;
    }

    // I profili, con una seconda query e a blocchi di 100: le sedi in target
    // stanno fra 150 e 300 persone, e 300 uuid in un `in()` sono ~11 KB di URL.
    const idsUtente = [
      ...new Set(
        [...(tickets || []), ...(rsvps || [])]
          .map((r) => r.user_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const profiloDi = new Map<string, { email: string; full_name: string | null }>();
    let profiliIllegibili = false;

    for (let i = 0; i < idsUtente.length; i += 100) {
      const { data: profili, error: profiliError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", idsUtente.slice(i, i + 100));

      if (profiliError) {
        console.error(
          `[event_reminders.profiles_query_failed] night ${party.id}: ` +
            `${profiliError.code ?? "unknown"} — ${profiliError.message}`
        );
        profiliIllegibili = true;
        break;
      }
      for (const pr of profili || []) {
        if (pr.email) profiloDi.set(pr.id, { email: pr.email, full_name: pr.full_name });
      }
    }

    if (profiliIllegibili) {
      failedParties += 1;
      continue;
    }

    // Deduplicate by email
    const emailMap = new Map<
      string,
      { name: string; ticketIds: string[]; rsvpIds: string[] }
    >();

    // Una riga il cui `user_id` non ha profilo viene saltata, non contata: meno
    // mail, non piu'.
    for (const ticket of tickets || []) {
      const profile = ticket.user_id ? profiloDi.get(ticket.user_id) : undefined;
      if (!profile) continue;
      const existing = emailMap.get(profile.email) || {
        name: profile.full_name || "Member",
        ticketIds: [],
        rsvpIds: [],
      };
      existing.ticketIds.push(ticket.id);
      emailMap.set(profile.email, existing);
    }

    for (const rsvp of rsvps || []) {
      const profile = rsvp.user_id ? profiloDi.get(rsvp.user_id) : undefined;
      if (!profile) continue;
      const existing = emailMap.get(profile.email) || {
        name: profile.full_name || "Member",
        ticketIds: [],
        rsvpIds: [],
      };
      existing.rsvpIds.push(rsvp.id);
      emailMap.set(profile.email, existing);
    }

    if (emailMap.size === 0) continue;

    const formattedDate = formatEventDate(party.date);

    const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`;

    // Build batch emails (max 100 per request)
    const entries = Array.from(emailMap.entries());
    /** Solo le righe i cui lotti sono usciti davvero. */
    const inviatiTicketIds: string[] = [];
    const inviatiRsvpIds: string[] = [];
    for (let i = 0; i < entries.length; i += 100) {
      const batch = entries.slice(i, i + 100);
      const emailPromises = batch.map(async ([email, data]) => {
        const html = await render(
          EventReminderEmail({
            memberName: data.name,
            eventTitle: event.title,
            partyTitle: party.title,
            eventDate: formattedDate,
            eventTime: formatTime(party.time),
            eventUrl,
          })
        );
        return {
          from: fromAddress,
          to: [email],
          subject: `Reminder: ${event.title} is tomorrow!`,
          html,
        };
      });

      const emails = await Promise.all(emailPromises);

      // ── `resend.batch.send` NON LANCIA su un rifiuto ────────────────────────
      //
      // Misurato il 2026-08-19 con una chiave non valida: l'SDK **risolve** con
      // `{ data: null, error: { statusCode: 401, … } }` invece di lanciare. Il
      // `try/catch` che stava qui non scattava mai, `totalSent` contava il
      // fallimento come un invio, e piu' sotto `reminder_sent` veniva messo a
      // `true` — cioe' quelle persone restavano segnate come avvisate **per
      // sempre**, senza aver ricevuto niente. Un marcatore a senso unico speso
      // per una mail che non e' partita.
      //
      // Ora si guarda il risultato, e si marca SOLO cio' che e' davvero uscito.
      // Stessa disciplina di `classifyProviderRefusal` in
      // `src/lib/venue-reveal/reveal-party-venue.ts`, che il rifiuto del
      // provider lo legge da sempre.
      try {
        const { error: sendError } = await resend.batch.send(emails);
        if (sendError) {
          console.error(
            `[event_reminders.batch_rejected] night ${party.id}, ${emails.length} destinatari: ` +
              `${sendError.name ?? "unknown"} — ${sendError.message}`
          );
          failedBatches += 1;
        } else {
          totalSent += emails.length;
          for (const [, d] of batch) {
            inviatiTicketIds.push(...d.ticketIds);
            inviatiRsvpIds.push(...d.rsvpIds);
          }
        }
      } catch (err) {
        console.error(
          `[event_reminders.batch_threw] night ${party.id}: ` +
            (err instanceof Error ? err.message : "unknown")
        );
        failedBatches += 1;
      }
    }

    // Si marca SOLO chi e' stato raggiunto davvero: un lotto rifiutato lascia i
    // suoi destinatari a `reminder_sent = false`, cosi' la corsa di domani
    // riprova invece di dare per avvisato qualcuno che non lo e'.
    const allTicketIds = inviatiTicketIds;
    const allRsvpIds = inviatiRsvpIds;

    // La mail E' PARTITA per queste righe, quindi un fallimento qui non si puo'
    // trasformare in «non inviata»: la sua conseguenza osservabile e' un
    // promemoria doppio domani. Si nomina con la sua categoria invece di
    // sparire — stessa disciplina di `markBatchReached` in
    // `reveal-party-venue.ts`.
    if (allTicketIds.length > 0) {
      const { error } = await supabase
        .from("tickets")
        .update({ reminder_sent: true })
        .in("id", allTicketIds);
      if (error) {
        console.error(
          `[event_reminders.mark_sent_failed] tickets, night ${party.id}: ` +
            `${error.code ?? "unknown"} — ${error.message}. ` +
            `${allTicketIds.length} promemoria gia' partiti verranno rimandati domani.`
        );
      }
    }

    if (allRsvpIds.length > 0) {
      const { error } = await supabase
        .from("rsvps")
        .update({ reminder_sent: true })
        .in("id", allRsvpIds);
      if (error) {
        console.error(
          `[event_reminders.mark_sent_failed] rsvps, night ${party.id}: ` +
            `${error.code ?? "unknown"} — ${error.message}. ` +
            `${allRsvpIds.length} promemoria gia' partiti verranno rimandati domani.`
        );
      }
    }
  }

  // Il verdetto sta nel CODICE, non solo nel corpo: e' l'unica cosa che la
  // piattaforma dei cron registra da sola, e in questo repository non c'e'
  // nient'altro che raggiunga una persona.
  if (failedParties > 0 || failedBatches > 0) {
    return NextResponse.json(
      {
        ok: false,
        reason: failedParties > 0 ? "recipients_unreadable" : "batches_rejected",
        sent: totalSent,
        failedParties,
        failedBatches,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, sent: totalSent });
}
