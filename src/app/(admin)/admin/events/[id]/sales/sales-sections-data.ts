import "server-only";

import { getServiceClient } from "@/lib/supabase/service";
import { CHECKOUT_TTL_MS } from "@/lib/tickets/checkout-window";
import { redactDbError } from "@/lib/errors/redact";
import {
  readTicketDeliveryMarks,
  reconcileDeliveries,
} from "@/lib/email-delivery/ledger";

/**
 * The readers behind Sales' three sections — «Sold Tickets», «Orders without
 * tickets» and «Paid, address never sent» — moved here from Manage tickets on
 * 2026-10-01 (DBT-17, D-52.1-22: *Manage tickets configura, Sales racconta*).
 *
 * ── Moved, not rewritten ─────────────────────────────────────────────────────
 *
 * Every query below is the one that stood at
 * `(work)/events/[id]/tickets/page.tsx:276-558` before the move: the same
 * client (the **service role** where it was the service role), the same
 * columns, the same order, the same reconciliation call, the same log
 * categories. The body is the old page's, indented into a function; the only
 * new lines are the function's signature and its `return`.
 *
 * ── THE CALLER OWNS THE BOUNDARY ─────────────────────────────────────────────
 *
 * These reads go through `getServiceClient()`, which bypasses every row-level
 * policy (`access-gating.md`, gate *service role*). This function asks no
 * question of its own: **it must be called only after the caller has cleared
 * `organizer.access` and `mayManageEvent` for this `eventId`** —
 * `(work)/events/[id]/sales/page.tsx` does, and calls it below its ownership
 * `if`. It lives outside `(work)` because a route group governs routing and
 * nothing else (R-WORK-ROUTES), and `server-only` keeps it off any client
 * bundle.
 */
export async function readSalesSections(eventId: string) {
    // Fetch sold tickets with buyer info.
    //
    // The narrower of the two column lists, kept deliberately. The `/organizer`
    // twin also selected `tickets.party_id` and, on the refund read below,
    // `ticket_refunds.status` and `ticket_refunds.requested_by` — none of the three
    // is rendered by either twin. They are dead payload on a **service-role** read
    // of buyer identities, and `requested_by` is a person's id. D-34-06 resolves a
    // divergence towards the more restrictive side; here the more restrictive side
    // is also the smaller one.
    const serviceClient = getServiceClient();
    const { data: soldTickets } = await serviceClient
      .from("tickets")
      // Niente `profiles(...)`: `tickets.user_id` referenzia `auth.users`, non
      // `public.profiles`, quindi PostgREST rifiuta l'incorporamento con
      // `PGRST200` — e qui l'errore era scartato nella destrutturazione, quindi la
      // lista dei venduti sarebbe stata VUOTA senza dirlo. I nomi si risolvono
      // sotto, con una seconda lettura.
      //
      // ── Due colonne aggiunte dalla fase 49, con la loro ragione ──────────────
      //
      // La lista qui sopra e' la piu' stretta delle due gemelle, e resta il
      // criterio: si aggiunge solo cio' che qualcosa disegna.
      //
      //   `order_id`     — dice se questo biglietto viene da un ordine comprato
      //                    senza account. Senza, il segno della posta qui sotto
      //                    cercherebbe la conferma sbagliata e disegnerebbe
      //                    «nessun invio registrato» su OGNI biglietto d'ospite:
      //                    un allarme falso su ogni riga, che e' il modo in cui
      //                    si nasconde l'unica riga vera.
      //   `holder_label` — «2 di 6». Sei biglietti di uno stesso ordine hanno lo
      //                    stesso acquirente e lo stesso prezzo: senza
      //                    l'etichetta sono sei righe IDENTICHE, ognuna con il
      //                    proprio bottone di rimborso, e chi ne rimborsa uno non
      //                    sa quale. Nessuna delle due porta un dato di nessuno.
      .select(
        "id, user_id, amount_paid, tier_id, created_at, order_id, holder_label, ticket_tiers(name)"
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    // I nomi dei compratori, con una seconda lettura e a blocchi di 100: una
    // serata in target sta fra 150 e 300 persone, e 300 uuid in un `in()` sono
    // ~11 KB di URL.
    const idsCompratori = [
      ...new Set(
        (soldTickets ?? [])
          .map((t: { user_id: string | null }) => t.user_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const profiloDi = new Map<string, { full_name: string | null; email: string | null }>();
    for (let i = 0; i < idsCompratori.length; i += 100) {
      const { data: profili, error: profiliError } = await serviceClient
        .from("profiles")
        .select("id, full_name, email")
        .in("id", idsCompratori.slice(i, i + 100));
      if (profiliError) {
        console.error(`[tickets.buyer_names_unreadable] ${redactDbError(profiliError)}`);
        break;
      }
      for (const pr of profili ?? []) profiloDi.set(pr.id, { full_name: pr.full_name, email: pr.email });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // L'ESITO DELLA CONFERMA — SI CHIEDE, NON SI ASSUME
    // ═══════════════════════════════════════════════════════════════════════════
    //
    // Aggiunto il 2026-08-22. `sendEmail` poteva tornare «riuscito» per un
    // messaggio che il fornitore non avrebbe mai consegnato: la sua lista di
    // soppressione accetta la chiamata, restituisce `error` nullo e un
    // identificativo regolare, e salta la consegna. Un indirizzo ci finisce dopo
    // un rimbalzo duro — che puo' nascere da un refuso scritto una volta sola — e
    // da li' in poi ogni biglietto sparisce in silenzio.
    //
    // ── PERCHE' LA RICONCILIAZIONE GIRA QUI E NON SOLO NEL CRON ────────────────
    //
    // Il cron gira alle 11:00 di Torino. Un biglietto comprato alle 19:00 per una
    // serata che apre alle 22:00 non ha una notte davanti: un verdetto che arriva
    // domani mattina arriva dopo la fila. Qui il verdetto si chiede **quando
    // qualcuno lo sta guardando**, che e' il solo momento in cui serve.
    //
    // ── COSA QUESTA CHIAMATA E' E COSA NON E' ──────────────────────────────────
    //
    // E' una GET verso il fornitore della posta e un `UPDATE` per riga sul
    // registro. **Non spedisce niente**, non rispedisce niente, non tocca ne'
    // biglietti ne' denaro, ed e' idempotente: rieseguirla riscrive lo stesso
    // verdetto. E' ristretta ai biglietti di questa serata e alle sole righe
    // ancora senza esito, quindi una superficie gia' riconciliata non paga niente.
    //
    // Non lancia: `reconcileDeliveries` cattura le proprie cause e le conta. Un
    // fornitore irraggiungibile lascia le righe a «not verified», che e' la verita'
    // ed e' uno stato disegnato qui sotto.
    const ticketIdsPerConsegna = (soldTickets ?? []).map((t: { id: string }) => t.id);
    await reconcileDeliveries({ kind: "tickets", ticketIds: ticketIdsPerConsegna });
    // La categoria e' esplicita da quando il registro ne contiene undici: il
    // promemoria della serata vive nella stessa tabella e sullo stesso biglietto,
    // e un lettore senza categoria disegnerebbe un esito giusto sotto la domanda
    // sbagliata.
    const consegneDi = await readTicketDeliveryMarks(
      ticketIdsPerConsegna,
      "ticket_confirmation"
    );

    // Il promemoria del giorno prima, dallo stesso registro e sugli stessi
    // biglietti. La riconciliazione qui sopra li ha gia' coperti: e' ristretta per
    // `ticket_id` e non per categoria, quindi le righe del promemoria hanno gia'
    // il loro verdetto.
    //
    // ── Perche' il promemoria si disegna SOLO quando e' andato storto ──────────
    //
    // La conferma parte all'acquisto: ogni biglietto venduto ne ha una, e
    // l'assenza di una riga e' un'informazione («non lo sappiamo»). Il promemoria
    // parte **24 ore prima della serata**: la stragrande maggioranza dei
    // biglietti, quasi sempre, non ne ha ancora uno — e non e' un problema, e'
    // presto. Disegnare «nessun promemoria registrato» su ogni riga sarebbe
    // rumore su ogni riga, e il rumore nasconde l'unica riga che conta.
    const promemoriaDi = await readTicketDeliveryMarks(
      ticketIdsPerConsegna,
      "event_reminder"
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // GLI ORDINI — E QUELLI CHE NON HANNO PRODOTTO BIGLIETTI
    // ═══════════════════════════════════════════════════════════════════════════
    //
    // ── Perche' e' un requisito e non un abbellimento ──────────────────────────
    //
    // Dalla fase 49 si compra **senza account**, e il pagamento diventa biglietti
    // dentro il webhook. Quando quel percorso si ferma a meta' — l'identita' non
    // si e' potuta risolvere, la RPC ha rifiutato per capienza o per tetto —
    // l'ordine resta con la sua causa scritta addosso e **nessun biglietto**.
    //
    // Questo prodotto **non ha error tracking** (`meta-gates.md`, verificato
    // 2026-08-05): quella riga oggi non raggiungerebbe nessun essere umano da
    // sola. La persona si presenterebbe alla porta senza sapere di non avere
    // niente — e rifiutare qualcuno che ha pagato e' l'errore che
    // `checkin-offline.md` dichiara il piu' costoso, perche' avviene davanti a una
    // fila. **L'effetto osservabile e' questa sezione**, e chi lavora la serata la
    // vede prima che qualcuno si presenti.
    const { data: ordini, error: ordiniError } = await serviceClient
      .from("ticket_orders")
      .select(
        "id, status, buyer_email, quantity, total_amount, error_message, created_at, updated_at, closed_reason, closed_detail, sumup_checkout_id"
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (ordiniError) {
      // Distinta dalle altre cause, come ogni lettura di questa pagina. Una
      // sezione vuota per un errore di lettura si legge «va tutto bene», che e'
      // la bugia peggiore che questa sezione possa dire.
      console.error(`[tickets.orders_unreadable] ${redactDbError(ordiniError)}`);
    }

    // Quanto puo' restare `pending` un ordine prima di meritare una riga:
    // `CHECKOUT_TTL_MS` (`src/lib/tickets/checkout-window.ts`, dove sta il
    // perche' dei trenta minuti). E' la stessa finestra del checkout SumUp e del
    // cron `close-pending-orders`: una costante sola, non quattro numeri uguali.
    const adesso = Date.now();
    /** Gli ordini chiusi dal cron restano visibili una settimana, non per sempre. */
    const FINESTRA_CHIUSI_MS = 7 * 24 * 60 * 60 * 1000;

    type OrdineSenzaBiglietti = {
      id: string;
      status: string;
      buyer_email: string;
      quantity: number;
      total_amount: number;
      error_message: string | null;
      created_at: string;
      updated_at: string | null;
      closed_reason: "never_attempted" | "declined" | null;
      closed_detail: string | null;
      sumup_checkout_id: string | null;
    };
    const tuttiGliOrdini = (ordini ?? []) as OrdineSenzaBiglietti[];
    const toccatoIl = (o: OrdineSenzaBiglietti) =>
      new Date(o.updated_at ?? o.created_at).getTime();

    // Quattro insiemi, e NON si fondono: la distinzione e' la sostanza.
    //
    //   `falliti`    — il fornitore ha confermato l'incasso e i biglietti non
    //                  sono nati. **Denaro preso, niente biglietto.** Ha una
    //                  causa scritta, ed e' l'unico insieme con un'azione:
    //                  Retry issuing.
    //   `sospesi`    — checkout aperto da piu' di trenta minuti (per
    //                  `updated_at`: una ripresa rinnova). Dalla fase 52.2 non e'
    //                  piu' «non sappiamo»: il cron del mattino
    //                  `close-pending-orders` lo chiede a SumUp e lo chiude, o
    //                  consegna il PAID al webhook. Un ordine **gratuito** pending
    //                  (senza checkout) il cron non lo tocca mai: ha la sua voce.
    //   `rifiutati`  — chiusi dal cron: tentativo fatto, carta rifiutata, niente
    //                  addebitato. La parola del fornitore sta in `closed_detail`.
    //   `maiTentati` — chiusi dal cron: checkout scaduto senza un tentativo.
    //
    // Gli ultimi due solo per sette giorni: la card non diventa un elenco di
    // carrelli. Gli `expired` senza `closed_reason` (storici, prima della fase
    // 52.2) restano nascosti come prima.
    const ordiniFalliti = tuttiGliOrdini.filter((o) => o.status === "failed");
    const ordiniSospesi = tuttiGliOrdini.filter(
      (o) => o.status === "pending" && adesso - toccatoIl(o) > CHECKOUT_TTL_MS
    );
    const chiusoDiRecente = (o: OrdineSenzaBiglietti) =>
      o.status === "expired" && adesso - toccatoIl(o) <= FINESTRA_CHIUSI_MS;
    const ordiniRifiutati = tuttiGliOrdini.filter(
      (o) => chiusoDiRecente(o) && o.closed_reason === "declined"
    );
    const ordiniMaiTentati = tuttiGliOrdini.filter(
      (o) => chiusoDiRecente(o) && o.closed_reason === "never_attempted"
    );
    const ordiniSenzaBiglietti =
      ordiniFalliti.length +
      ordiniSospesi.length +
      ordiniRifiutati.length +
      ordiniMaiTentati.length;

    // ── IL TERZO INSIEME: PAGATI, INDIRIZZO NON PARTITO (fase 49, piano 09) ────
    //
    // ── Lo strappo semantico, dichiarato qui come nel codice che scrive ────────
    //
    // `error_message` ha sempre voluto dire **«perche' l'ordine e' fallito»**, e
    // queste righe **non sono fallite**: `status` e' `completed`, i biglietti
    // esistono, il denaro e' buono, il codice QR apre la porta. Cio' che manca e'
    // l'indirizzo di una serata segreta, per chi ha comprato **dopo** che la
    // rivelazione era gia' scattata — l'unico ramo in cui quella mail e' l'unica
    // strada, perche' la pagina del biglietto rimanda al login e un ospite non ha
    // una password.
    //
    // Il commento sulla colonna direbbe questo, ma cambiarlo e' una migration.
    // Sta quindi scritto **in entrambi i posti che la toccano**: qui, che la
    // legge, e in `src/app/api/webhooks/sumup/route.ts` (`segnaAssenza`), che la
    // scrive.
    //
    // ── PERCHE' SEPARATO E NON FUSO CON I FALLITI ─────────────────────────────
    //
    // Fusi, chi legge non saprebbe piu' se «errore» voglia dire *nessun
    // biglietto* o *nessun indirizzo* — e sono **due telefonate diverse a due
    // persone diverse**: alla prima si dice che non ha niente, alla seconda dove
    // andare. Un insieme solo trasformerebbe la riga che grida in una riga da
    // interpretare.
    //
    // ── E PERCHE' NESSUNA ALTRA SUPERFICIE LO MOSTREREBBE ─────────────────────
    //
    // Il pannello della rivelazione conta *«N non ancora raggiunti»* con lo stesso
    // limite temporale che il cron usa: su una serata rivelata **a mano**, chi ha
    // comprato dopo e' escluso da quel conteggio. Il pannello direbbe *zero
    // rimasti* mentre una persona che ha pagato non sa dove andare. Questa
    // sezione e' la sola che lo dice.
    const ordiniIndirizzoNonPartito = (ordini ?? []).filter(
      (o: { status: string; error_message: string | null }) =>
        o.status === "completed" && Boolean(o.error_message)
    );

    // ── L'esito della mail d'ordine, e perche' si legge PER ORDINE ─────────────
    //
    // La conferma d'ordine e' **una** mail per N biglietti, e il registro la
    // attacca al PRIMO biglietto dell'ordine — `email_deliveries` ha `ticket_id`,
    // non `order_id` (debito `D-49-05-DEF-06`). Letto per biglietto, gli altri N-1
    // risulterebbero «nessun invio registrato»: vero alla lettera, e falso per chi
    // legge, perche' si legge come *nessuno ha guardato*.
    //
    // Qui il segno si risolve **per ordine** e vale per tutti i suoi biglietti,
    // che e' la lettura giusta: l'invio e' uno, non sei.
    //
    // La riconciliazione qui sopra li ha gia' coperti — e' ristretta per
    // `ticket_id` e **non per categoria**, quindi le righe della conferma
    // d'ordine hanno gia' il loro verdetto senza una seconda chiamata al
    // fornitore.
    const consegneOrdineDi = await readTicketDeliveryMarks(
      ticketIdsPerConsegna,
      "ticket_order_confirmation"
    );

    const segnoPerOrdine = new Map<
      string,
      ReturnType<typeof consegneOrdineDi.get>
    >();
    for (const t of soldTickets ?? []) {
      const oid = (t as { order_id: string | null }).order_id;
      if (!oid || segnoPerOrdine.has(oid)) continue;
      const segno = consegneOrdineDi.get(t.id);
      if (segno) segnoPerOrdine.set(oid, segno);
    }

  return {
    soldTickets: (soldTickets ?? []) as SoldTicket[],
    profiloDi,
    consegneDi,
    promemoriaDi,
    segnoPerOrdine,
    ordiniFalliti,
    ordiniSospesi,
    ordiniRifiutati,
    ordiniMaiTentati,
    ordiniSenzaBiglietti,
    ordiniIndirizzoNonPartito: ordiniIndirizzoNonPartito as OrdineIndirizzoNonPartito[],
  };
}

export type SoldTicket = {
  id: string;
  user_id: string | null;
  amount_paid: number;
  created_at: string;
  order_id: string | null;
  holder_label: string | null;
  ticket_tiers: unknown;
};

export type OrdineIndirizzoNonPartito = {
  id: string;
  buyer_email: string;
  quantity: number;
  total_amount: number;
  error_message: string | null;
};

export type SalesSectionsData = Awaited<ReturnType<typeof readSalesSections>>;
