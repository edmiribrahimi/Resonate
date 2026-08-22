import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import AppNav from "@/components/layout/AppNav";
import { Card } from "@/components/ui/Card";
import { FOCUS_RING } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import { getAccessContext } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole, UserStatus } from "@/types/database";

/**
 * `/tickets` — dove stanno i biglietti, e la ragione per cui questa pagina
 * esiste.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * IL DIFETTO DI PRODOTTO CHE QUESTA PAGINA CHIUDE
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Fino al 2026-08-22 il biglietto stava **sul percorso critico della posta**.
 * Dopo un pagamento riuscito la finestra del pagamento si chiudeva da sola dopo
 * due secondi e mezzo e la pagina si ricaricava: se il webhook non aveva ancora
 * creato il biglietto — cosa normale, perche' arriva quando arriva — la persona
 * tornava su una pagina che non le diceva niente, e **l'unico artefatto rimasto
 * era una mail**.
 *
 * E quella mail poteva non arrivare mai senza che nessuno lo sapesse: la lista di
 * soppressione del fornitore accetta la chiamata e non consegna. Il percorso per
 * intero e' scritto in `src/lib/email.ts`.
 *
 * Le due meta' della riparazione sono indipendenti e servono entrambe: **questa
 * pagina toglie il biglietto dal percorso della posta**, e il registro degli
 * invii rende visibile il caso in cui la posta non arriva. Se ne funzionasse
 * solo una, la prima e' quella che vale.
 *
 * ── Come lo fanno gli altri, verificato ─────────────────────────────────────
 *
 * DICE tiene il biglietto nell'app, con il QR legato al numero di telefono, e ha
 * una pagina di aiuto dedicata al perche'. Ticketmaster scrive *«No need to print
 * or search through your emails — find them in your Ticketmaster App»*.
 * Eventbrite, rimasta email-first, ha una pagina di assistenza dedicata proprio
 * a questo guasto, e la sua risposta e' *«contatta l'organizzatore»*.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * IL VINCOLO CHE HA SCRITTO LA COPY, E CHE VA LETTO PRIMA DI RITOCCARLA
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * **Nessuna frase qui dice «nel tuo account».** Il proprietario ha posto il
 * 2026-08-22 il vincolo che l'acquisto da ospite — senza account — dovra' essere
 * possibile; come e per quali serate non e' ancora deciso. Una frase che
 * promettesse un account diventerebbe **falsa per una parte dei compratori**, e
 * una frase falsa su una superficie di biglietteria e' peggio di nessuna frase.
 *
 * Quindi la copy dice **dove sta il biglietto** e **che la mail non serve**, e
 * non dice **come** questa pagina riconosce chi arriva. Regge in entrambi i
 * mondi, e nel mondo dell'ospite cambiera' il modo di riconoscere, non la frase.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * COSA QUESTA PAGINA NON FA
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * **Non allarga niente.** La lettura e' `.eq("user_id", user.id)`, la stessa che
 * `/tickets/[id]` fa gia', sotto la stessa policy `tickets_select_own`. Nessuna
 * colonna nuova, nessun vincolo toccato, nessuna policy scritta.
 *
 * **Non introduce un cancello su `status`.** Anzi ne toglie l'effetto: sulla
 * dashboard la lista dei biglietti sta dentro il ramo che un `pending` non
 * raggiunge, quindi un membro non ancora approvato che avesse comprato un
 * biglietto non aveva **nessuna** superficie di lista. Qui non c'e' nessun
 * confronto su `status`: chi ha un biglietto lo vede. La roadmap della v1.6 lo
 * chiede esplicitamente — *niente cancelli nuovi su `status`* — perche' e' un
 * valore che sta per smettere di variare.
 *
 * **Non tocca il denaro.** Nessuna transizione di stato, nessun importo, nessuna
 * chiave di idempotenza, nessun percorso di webhook: questa pagina legge righe
 * gia' scritte da altri.
 *
 * ── La finestra fra il pagamento e il biglietto, che e' reale ────────────────
 *
 * Il biglietto lo crea il webhook del fornitore di pagamento, che arriva dopo la
 * conferma della carta. Chi arriva qui subito dopo aver pagato puo' trovare la
 * lista ancora vuota, e «No tickets yet» sarebbe la frase sbagliata nel momento
 * peggiore. Per questo la pagina legge anche `pending_purchases` — righe
 * proprie, sotto la policy `pending_select_own` che gia' esiste — e quando ce
 * n'e' una ancora in corso lo **dice**, invece di lasciar credere che il
 * pagamento sia svanito.
 *
 * ── Il venue NON compare qui ────────────────────────────────────────────────
 *
 * Deliberato. `/tickets/[id]` mostra la sede al titolare del biglietto sotto un
 * predicato che **diverge** da quello della pagina pubblica della serata, e
 * quella divergenza e' documentata li' e non e' stata riconciliata. Questa
 * pagina non aggiunge una **terza** porta su quell'informazione: elenca titolo,
 * data e tier, e la sede resta dove sta gia'. `venue-secrecy.md`: una sede si
 * puo' solo rivelare, mai ri-nascondere.
 */
/**
 * DICHIARATO, non derivato.
 *
 * `nextjs-architecture.md`, gate *cache esplicita*: ogni superficie che mostra
 * dati per-utente dichiara esplicitamente di non essere cacheabile. Questa
 * pagina elenca i biglietti di **una persona**, e una copia servita a un'altra
 * sarebbe un allargamento fatto da una cache.
 *
 * `/tickets/[id]` accanto e' dinamica solo **per derivazione** — perche' qualcosa
 * nel suo albero legge una sessione — e la riga che chiuderebbe quel divario e'
 * registrata li' come domanda dovuta al proprietario. Qui non c'e' nessuna
 * decisione da rovesciare: la pagina nasce oggi, quindi nasce dichiarata.
 */
export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // `?next=` e non `?redirect=`: la pagina di login legge `next`
    // (`src/app/(auth)/login/page.tsx`). Il difetto D7 — il middleware scrive
    // `redirect` e il login legge `next`, quindi la destinazione si perde su
    // ogni indirizzo protetto — e' preesistente, e' registrato, e non si ripara
    // qui; questa riga semplicemente non lo aggrava.
    redirect("/login?next=/tickets");
  }

  const { role, status, capabilities, liveAssignmentCapabilities } =
    await getAccessContext();

  // La stessa proiezione che la dashboard legge, sulla stessa policy. Copiata
  // nella forma invece che estratta in un helper condiviso: la dashboard e'
  // dentro il perimetro che la v1.6 smonta (fase 51, «via le superfici da
  // socio»), e legare le due letture ora significherebbe che chi cancella
  // quella pagina deve prima disfare un helper che non stava cercando.
  const { data: tickets, error: ticketsError } = await supabase
    .from("tickets")
    .select(
      "id, created_at, events(title, date, slug, cover_image), ticket_tiers(name), event_parties(title, date)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Gli acquisti ancora in corso: righe proprie, policy `pending_select_own`.
  // Servono a una cosa sola — non dire «nessun biglietto» a chi ha appena pagato.
  const { data: inFlight, error: inFlightError } = await supabase
    .from("pending_purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending");

  const pendingCount = (inFlight ?? []).length;

  // ── Lo stato d'errore, che NON e' lo stato vuoto ───────────────────────────
  //
  // `nextjs-architecture.md`, gate *stato vuoto e d'errore*: una lista vuota
  // identica a una lista non caricata e' un guasto silenzioso con una faccia
  // neutra. Su questa superficie sarebbe il peggiore possibile — dire «nessun
  // biglietto» a chi ne ha uno e' l'errore che questa pagina esiste per
  // impedire, commesso da noi invece che dalla posta.
  //
  // Due errori, due righe: una lettura fallita dei biglietti e una degli
  // acquisti in corso sono due cause diverse e non si collassano.
  const ticketsUnreadable = Boolean(ticketsError);
  const inFlightUnreadable = Boolean(inFlightError);

  const today = new Date().toISOString().split("T")[0];
  const rows = tickets ?? [];

  const dateOf = (ticket: (typeof rows)[number]): string | null => {
    const party = Array.isArray(ticket.event_parties)
      ? ticket.event_parties[0]
      : ticket.event_parties;
    const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
    return (
      (party as { date?: string } | null)?.date ??
      (event as { date?: string } | null)?.date ??
      null
    );
  };

  const upcoming = rows.filter((t) => {
    const d = dateOf(t);
    return d !== null && d >= today;
  });
  const past = rows.filter((t) => {
    const d = dateOf(t);
    return d !== null && d < today;
  });
  // Una riga la cui serata non si e' potuta leggere non sparisce: finisce in
  // fondo. Farla sparire vorrebbe dire che una join fallita cancella un
  // biglietto dalla vista del suo titolare, che e' lo stesso errore della mail
  // che non arriva, commesso da noi.
  const undated = rows.filter((t) => dateOf(t) === null);
  const ordered = [...upcoming, ...past, ...undated];

  const formatDay = (value: string): string => {
    const d = new Date(value + "T00:00:00");
    const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${WD[d.getDay()]}, ${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <>
      {/*
        La dichiarazione della luce a sinistra, l'altra meta' dell'accoppiata che
        il check E di `scripts/verify-conversion.mjs` verifica nelle due
        direzioni: i file che dichiarano lo spazio della colonna sono esattamente
        i file che montano la navigazione responsiva. Un mount senza
        dichiarazione fa scivolare il contenuto SOTTO la colonna dal tier tablet
        in su.

        L'utility e' scritta per intero e non descritta a parole: Tailwind
        scandisce anche i commenti e non distingue una descrizione da un uso.
        Copiata alla lettera da src/app/(public)/tickets/[id]/page.tsx:169.
      */}
      <div className="md:[--nav-inset-inline-start:14rem]">
        <PageShell width="default">
          <div className="mb-6">
            <PageTitle>Your tickets</PageTitle>
            {/*
              ── LA FRASE, E OGNI PAROLA E' STATA SCELTA ─────────────────────

              Dice DOVE sta il biglietto e che la mail non serve. Non dice «nel
              tuo account», perche' l'acquisto da ospite e' un vincolo dichiarato
              dal proprietario e una frase che promettesse un account diventerebbe
              falsa per una parte dei compratori.

              Non dice nemmeno «controlla la tua email»: e' esattamente
              l'abitudine che questa pagina esiste per togliere.
            */}
            <p className="mt-2 text-sm text-muted">
              This page is where your tickets are. You never need to open the
              email to get in — showing the QR code from here is enough.
            </p>
          </div>

          {/*
            ── L'acquisto ancora in corso ───────────────────────────────────

            Disegnato SOPRA la lista e prima del vuoto, perche' la persona che
            lo legge ha appena pagato e la domanda che ha in testa e' una sola.
            Frase propria, mai collassata con lo stato vuoto: «non hai
            biglietti» e «il tuo pagamento sta finendo» sono due fatti diversi,
            e confonderli e' il difetto del newsletter registrato in
            `.planning/codebase/CONCERNS.md`.
          */}
          {/*
            La lettura fallita, detta prima di tutto il resto: chi la legge non
            deve continuare a scendere credendo che la lista sotto sia completa.
          */}
          {ticketsUnreadable && (
            <Card className="mb-4 border-sem-crit/30 bg-sem-crit/10">
              <p role="alert" className="text-sm font-medium text-sem-crit">
                Your tickets could not be loaded
              </p>
              <p className="mt-1 text-sm text-muted">
                This is a fault on our side, not a sign that you have no ticket.
                Reload the page. If it keeps failing, tell whoever is running the
                night — your ticket exists whether or not this page can show it.
              </p>
            </Card>
          )}

          {inFlightUnreadable && (
            <Card className="mb-4 border-sem-warn/30 bg-sem-warn/10">
              <p className="text-sm font-medium text-sem-warn">
                Payments in progress could not be checked
              </p>
              <p className="mt-1 text-sm text-muted">
                If you have just paid and see nothing below, that is what this
                notice is about: reload in a minute.
              </p>
            </Card>
          )}

          {pendingCount > 0 && (
            <Card className="mb-4 border-sem-warn/30 bg-sem-warn/10">
              <p className="text-sm font-medium text-sem-warn">
                {pendingCount === 1
                  ? "A payment is still being confirmed"
                  : `${pendingCount} payments are still being confirmed`}
              </p>
              <p className="mt-1 text-sm text-muted">
                The ticket appears here as soon as the payment provider confirms
                it — usually within a minute. Reload this page to check. If it is
                still missing after a few minutes, tell whoever is running the
                night: the payment is recorded on our side either way.
              </p>
            </Card>
          )}

          {ordered.length === 0 ? (
            <Card>
              {/*
                Il vuoto non parla mai a nome di una lettura fallita: se la
                query non ha risposto, la frase dice quello, e non «non hai
                biglietti».
              */}
              <p className="text-sm text-muted/60">
                {ticketsUnreadable
                  ? "Nothing to show — see the notice above."
                  : pendingCount > 0
                    ? "Nothing confirmed yet."
                    : "No tickets yet."}
              </p>
              <Link
                href="/events"
                className={`mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent hover:text-accent-hover ${FOCUS_RING}`}
              >
                Discover events &rarr;
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              <SectionHeading>
                {ordered.length === 1 ? "1 ticket" : `${ordered.length} tickets`}
              </SectionHeading>
              <div className="space-y-2">
                {ordered.map((ticket) => {
                  const event = (
                    Array.isArray(ticket.events) ? ticket.events[0] : ticket.events
                  ) as {
                    title: string;
                    date: string;
                    slug: string;
                    cover_image: string | null;
                  } | null;
                  const party = (
                    Array.isArray(ticket.event_parties)
                      ? ticket.event_parties[0]
                      : ticket.event_parties
                  ) as { title: string; date: string } | null;
                  const tier = (
                    Array.isArray(ticket.ticket_tiers)
                      ? ticket.ticket_tiers[0]
                      : ticket.ticket_tiers
                  ) as { name: string } | null;

                  const day = dateOf(ticket);
                  const isPast = day !== null && day < today;

                  return (
                    <Link
                      key={ticket.id}
                      href={`/tickets/${ticket.id}`}
                      className="block min-h-11"
                    >
                      <Card
                        className={`px-4 py-4 transition-all hover:border-accent/50 active:scale-[0.98] active:opacity-80 ${
                          isPast ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                            {event?.cover_image ? (
                              <Image
                                src={event.cover_image}
                                alt={event.title ?? ""}
                                width={48}
                                height={48}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-accent/30 to-accent/10" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">
                              {party && event && party.title !== event.title
                                ? `${event.title} — ${party.title}`
                                : (event?.title ?? "Ticket")}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {/*
                                Una data illeggibile si dichiara illeggibile.
                                Stampare una stringa vuota farebbe sembrare la
                                riga incompleta invece che il dato assente.
                              */}
                              {day !== null ? formatDay(day) : "Date unavailable"}
                              {tier?.name ? ` · ${tier.name}` : ""}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm text-accent">
                            Open &rarr;
                          </span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </PageShell>
      </div>

      <AppNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </>
  );
}
