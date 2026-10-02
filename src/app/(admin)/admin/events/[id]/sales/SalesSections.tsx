import RefundActions from "@/app/(admin)/admin/events/[id]/tickets/RefundActions";
import { retryFailedOrder } from "@/app/(admin)/admin/events/[id]/tickets/actions";
import { FOCUS_RING } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";

import type { SalesSectionsData } from "./sales-sections-data";

/**
 * What was sold and what did not go through — the three sections that moved
 * from Manage tickets to Sales on 2026-10-01 (DBT-17, D-52.1-22). The owner's
 * words: *Manage tickets configura, Sales racconta.*
 *
 * ── Moved, not rewritten ─────────────────────────────────────────────────────
 *
 * The markup is the old page's (`(work)/events/[id]/tickets/page.tsx:671-1040`)
 * — the same cards, the same words, the same delivery marks, the same Retry
 * issuing form — with one change of order: «Sold Tickets» comes first, because
 * on Sales it is the list a person opens the page for, and the two alarm
 * sections follow it. Each section still draws only when it has something in
 * it.
 *
 * ── ONE REFUND PER TICKET ────────────────────────────────────────────────────
 *
 * `RefundActions` is mounted here **once per sold ticket and nowhere else in
 * the product**: it left `SalesDashboard`'s buyer table in the same commit.
 * Two lists of the same tickets, each with its own Refund, were two controls
 * on one charge that could drift — and the delivery marks a refunder needs
 * (was the confirmation delivered? the reminder?) sit on these cards, beside
 * the button.
 *
 * A server component with no reads of its own: the reads are in
 * `sales-sections-data.ts`, behind the page's guard.
 */
function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price);
}

export default function SalesSections({
  eventId,
  data,
}: {
  eventId: string;
  data: SalesSectionsData;
}) {
  const {
    soldTickets,
    profiloDi,
    consegneDi,
    promemoriaDi,
    segnoPerOrdine,
    ordiniFalliti,
    ordiniSospesi,
    ordiniRifiutati,
    ordiniMaiTentati,
    ordiniSenzaBiglietti,
    ordiniIndirizzoNonPartito,
  } = data;

  // Nothing sold and nothing failed: draw nothing, not an empty wrapper — the
  // dashboard's spacing would otherwise leave a gap the size of a section.
  // The buyer table below says «No tickets sold yet» on its own.
  if (
    soldTickets.length === 0 &&
    ordiniSenzaBiglietti === 0 &&
    ordiniIndirizzoNonPartito.length === 0
  ) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Sold Tickets */}
      {(soldTickets ?? []).length > 0 && (
        <div className="space-y-4">
          <SectionHeading>
            Sold Tickets ({(soldTickets ?? []).length})
          </SectionHeading>
          <div className="space-y-2">
            {(soldTickets ?? []).map((ticket: { id: string; user_id: string | null; amount_paid: number; created_at: string; order_id: string | null; holder_label: string | null; ticket_tiers: unknown }) => {
              const profile = ticket.user_id ? profiloDi.get(ticket.user_id) ?? null : null;
              const rawTier = ticket.ticket_tiers as unknown;
              const tier = (Array.isArray(rawTier) ? rawTier[0] : rawTier) as { name: string } | null;
              return (
                <Card
                  key={ticket.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {profile?.full_name || profile?.email || "Unknown"}
                    </p>
                    <p className="text-xs text-muted">
                      {tier?.name}
                      {/*
                        «2 di 6». Il biglietto e' AL PORTATORE (D-49-03) e
                        nessun nome si chiede all'acquisto, quindi sei
                        biglietti di un ordine hanno lo stesso acquirente e lo
                        stesso prezzo: senza questa etichetta sono sei righe
                        identiche, ognuna con il proprio bottone di rimborso.
                        Non e' una rifinitura — e' cio' che permette di
                        rimborsare quello giusto.
                      */}
                      {ticket.order_id && ticket.holder_label
                        ? ` · ${ticket.holder_label}`
                        : ""}
                    </p>
                    {/*
                      ── IL SEGNO, E I QUATTRO STATI CHE NON SI COLLASSANO ───

                      `meta-gates.md`: questo progetto non ha error tracking,
                      quindi un log non e' un effetto osservabile. Questa riga
                      e' l'effetto osservabile — la sola cosa che, quando la
                      conferma di un biglietto non arriva, lo dice a un essere
                      umano prima che la persona si presenti all'ingresso.

                      Quattro stati e non due, e ognuno ha la sua frase:

                        consegnata      -> nulla. Un segno su ogni riga
                                           sarebbe rumore, e il rumore
                                           nasconde l'unica riga che conta.
                        NON consegnata  -> rosso, con la causa e con cosa
                                           fare.
                        non verificata  -> il fornitore non ha ancora deciso.
                                           Non e' un problema.
                        nessun invio    -> non lo sappiamo, e non e' la stessa
                           registrato      cosa di «non consegnata». Ci
                                           finisce un biglietto emesso prima
                                           che il registro esistesse, o uno la
                                           cui registrazione e' fallita.

                      Il colore non e' l'unico canale: ogni stato porta la sua
                      parola.
                    */}
                    {(() => {
                      // ── LA CATEGORIA GIUSTA PER QUESTO BIGLIETTO ────────
                      //
                      // Due percorsi d'acquisto, due mail, due categorie nel
                      // registro. Un biglietto nato da un ORDINE non ha mai
                      // avuto una `ticket_confirmation`: la sua conferma e' la
                      // mail dell'ordine. Leggere la categoria vecchia su di
                      // lui restituirebbe sempre l'assenza, cioe' «nessun
                      // invio registrato» su OGNI biglietto d'ospite — un
                      // allarme falso su ogni riga, che e' esattamente il
                      // rumore che il commento qui sopra dice di non fare.
                      //
                      // E si legge PER ORDINE, non per biglietto: la mail e'
                      // una per N, e il registro la attacca al primo. Cosi'
                      // tutti e sei portano l'esito vero invece di uno solo.
                      const consegna = ticket.order_id
                        ? segnoPerOrdine.get(ticket.order_id)
                        : consegneDi.get(ticket.id);
                      const etichetta = ticket.order_id
                        ? "Order email"
                        : "Email";

                      if (!consegna) {
                        return (
                          <p className="mt-1 text-xs text-muted">
                            {etichetta}: no send recorded — the outcome is
                            unknown, which is not the same as undelivered.
                            Assume they may not have it.
                          </p>
                        );
                      }

                      if (consegna.outcome === "delivered") return null;

                      if (consegna.outcome === "undelivered") {
                        return (
                          <p className="mt-1 text-xs font-medium text-sem-crit">
                            {etichetta} NOT delivered — {consegna.reason} Tell
                            them their ticket is on the tickets page; the QR
                            code there is what gets them in.
                          </p>
                        );
                      }

                      if (consegna.outcome === "unknown") {
                        return (
                          <p className="mt-1 text-xs text-sem-warn">
                            {etichetta} outcome unknown — {consegna.reason}{" "}
                            Treat it as possibly not delivered.
                          </p>
                        );
                      }

                      return (
                        <p className="mt-1 text-xs text-muted">
                          {etichetta} sent — outcome not settled yet.
                        </p>
                      );
                    })()}
                    {/*
                      ── IL PROMEMORIA, CHE PARLA SOLO QUANDO E' ANDATO STORTO

                      Stesso registro, stesso biglietto, categoria diversa —
                      e una regola di disegno diversa, per una ragione di
                      tempo e non di stile.

                      La conferma esiste per ogni biglietto venduto, quindi
                      l'assenza di una sua riga e' un fatto da dire. Il
                      promemoria parte **24 ore prima della serata**: fino a
                      quel momento non esiste per nessuno, ed e' normale.
                      Quattro stati qui sarebbero quattro righe su ogni
                      biglietto tutti i giorni tranne uno — cioe' rumore, e
                      il rumore nasconde l'unica riga che conta.

                      Restano quindi i due che chiedono qualcosa a un essere
                      umano. `delivered`, `unverified` e l'assenza non
                      disegnano niente.
                    */}
                    {(() => {
                      const promemoria = promemoriaDi.get(ticket.id);
                      if (!promemoria) return null;

                      if (promemoria.outcome === "undelivered") {
                        return (
                          <p className="mt-1 text-xs font-medium text-sem-crit">
                            Reminder NOT delivered — {promemoria.reason} They
                            may not know the night is tomorrow.
                          </p>
                        );
                      }

                      if (promemoria.outcome === "unknown") {
                        return (
                          <p className="mt-1 text-xs text-sem-warn">
                            Reminder outcome unknown — {promemoria.reason}{" "}
                            Treat it as possibly not delivered.
                          </p>
                        );
                      }

                      return null;
                    })()}
                  </div>
                  {/* The money mark — D-41.1-13. It used to sit in the meta
                      line beside the tier name, at the recessed ink. */}
                  <p className="text-sm font-semibold text-ink">
                    {formatPrice(ticket.amount_paid)}
                  </p>
                  <RefundActions ticketId={ticket.id} isDirectRefund />
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/*
        ── ORDINI SENZA BIGLIETTI ────────────────────────────────────────────

        La sezione si disegna solo quando ha qualcosa dentro, come quella dei
        rimborsi in attesa: una sezione vuota permanente e' un elemento che si
        impara a saltare, e il giorno che parla nessuno la guarda piu'.

        Il titolo e' il canale, non il colore (D-41.1-25): la parola dice cosa
        e' successo anche a chi non distingue le tinte.
      */}
      {ordiniSenzaBiglietti > 0 && (
        <div className="space-y-4">
          <SectionHeading>
            Orders without tickets ({ordiniSenzaBiglietti})
          </SectionHeading>

          <div className="space-y-3">
            {ordiniFalliti.map(
              (o) => (
                <Card key={o.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-ink">
                      {o.buyer_email}
                    </p>
                    {/* The money mark — D-41.1-13. */}
                    <p className="text-sm font-semibold text-ink">
                      {formatPrice(o.total_amount)}
                    </p>
                  </div>
                  <p className="text-xs font-medium text-sem-crit">
                    Paid, and {o.quantity === 1 ? "the ticket was" : `all ${o.quantity} tickets were`}{" "}
                    never issued. They have nothing at the door — reach out
                    before the night.
                  </p>
                  {/*
                    IL MESSAGGIO, NON UN'ICONA. La causa distinta e' l'unica
                    diagnosi che esistera' — questo progetto non ha error
                    tracking — e riassumerla in un simbolo la butterebbe via
                    proprio nel momento in cui serve.
                  */}
                  <p className="mt-1 break-words text-xs text-muted">
                    {o.error_message ?? "No cause recorded — that is itself the problem."}
                  </p>
                  {/*
                    RETRY, NON RIPARAZIONE A MANO. 2026-09-08, 49-ESITI.md
                    P-WH-4: la scheda diceva «reach out» e la riparazione era
                    due update sul catalogo. Il pulsante rimette l'ordine in
                    attesa e rigioca la consegna al webhook, dopo aver
                    riletto su SumUp che il checkout e' PAID. Se la causa e'
                    ancora li' (mail vuota), la scheda resta, con la causa.
                  */}
                  <form
                    action={retryFailedOrder.bind(null, eventId, o.id)}
                    className="mt-3"
                  >
                    <button
                      type="submit"
                      className={`inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold text-ink ${FOCUS_RING}`}
                    >
                      Retry issuing
                    </button>
                    <span className="ml-3 text-xs text-muted">
                      Re-checks the payment with SumUp, then replays the delivery. Nothing is charged.
                    </span>
                  </form>
                </Card>
              )
            )}

            {ordiniSospesi.map((o) => (
              <Card key={o.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-ink">
                    {o.buyer_email}
                  </p>
                  <p className="text-sm font-semibold text-ink">
                    {formatPrice(o.total_amount)}
                  </p>
                </div>
                {/*
                  Senza form: su un checkout aperto non c'e' denaro da
                  emettere. Decide il cron del mattino, chiedendo a SumUp —
                  mai lo stato locale. Un ordine gratuito non ha checkout e il
                  cron non lo tocca: promettergli una chiusura sarebbe falso.
                */}
                <p className="text-xs text-sem-warn">
                  {o.quantity} {o.quantity === 1 ? "ticket" : "tickets"} ·{" "}
                  {o.sumup_checkout_id
                    ? "Checkout open — the daily check closes it"
                    : "Free order not completed — no payment involved"}
                </p>
              </Card>
            ))}

            {ordiniRifiutati.map((o) => (
              <Card key={o.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-ink">
                    {o.buyer_email}
                  </p>
                  <p className="text-sm font-semibold text-ink">
                    {formatPrice(o.total_amount)}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  {o.quantity} {o.quantity === 1 ? "ticket" : "tickets"} ·{" "}
                  {`Card declined (${(o.closed_detail ?? "no detail").toLowerCase()}) — nothing charged`}
                </p>
              </Card>
            ))}

            {ordiniMaiTentati.map((o) => (
              <Card key={o.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-ink">
                    {o.buyer_email}
                  </p>
                  <p className="text-sm font-semibold text-ink">
                    {formatPrice(o.total_amount)}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  {o.quantity} {o.quantity === 1 ? "ticket" : "tickets"} ·{" "}
                  Never attempted — checkout expired
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/*
        ── PAGATI, INDIRIZZO NON PARTITO ────────────────────────────────────

        Sezione **propria**, non una voce in piu' dentro «Orders without
        tickets»: quel titolo sarebbe falso qui, perche' questi ordini i
        biglietti ce li hanno. Cio' che manca e' il luogo.

        Si disegna solo quando ha qualcosa dentro, come le altre due.
      */}
      {ordiniIndirizzoNonPartito.length > 0 && (
        <div className="space-y-4">
          <SectionHeading>
            Paid, address never sent ({ordiniIndirizzoNonPartito.length})
          </SectionHeading>

          <div className="space-y-3">
            {ordiniIndirizzoNonPartito.map(
              (o: {
                id: string;
                buyer_email: string;
                quantity: number;
                total_amount: number;
                error_message: string | null;
              }) => (
                <Card key={o.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-ink">
                      {o.buyer_email}
                    </p>
                    {/* The money mark — D-41.1-13. */}
                    <p className="text-sm font-semibold text-ink">
                      {formatPrice(o.total_amount)}
                    </p>
                  </div>
                  {/*
                    La frase dice ESATTAMENTE cosa c'e' e cosa manca, perche'
                    e' l'opposto della sezione qui sopra e confonderle e' il
                    danno: qui il biglietto esiste e apre la porta.

                    E dice anche **cosa fare**, senza scriverlo qui: il
                    rimedio e' il bottone della rivelazione sulla pagina della
                    serata, non un indirizzo copiato in una chat — e questa
                    pagina, che chiunque organizzi apre, non e' un posto dove
                    stampare il luogo di una serata segreta.
                  */}
                  <p className="text-xs font-medium text-sem-crit">
                    Paid, {o.quantity === 1 ? "1 ticket" : `${o.quantity} tickets`}{" "}
                    issued and valid — but the venue address never reached
                    them. They can get in and do not know where to go. Send it
                    from the night&apos;s reveal panel, before the night.
                  </p>
                  <p className="mt-1 break-words text-xs text-muted">
                    {o.error_message ??
                      "No cause recorded — that is itself the problem."}
                  </p>
                </Card>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
