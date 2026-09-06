import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { ownsOrIsMaster } from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import TierCard from "@/components/tickets/TierCard";
import AddTierForm from "@/components/tickets/AddTierForm";
import AddDiscountCodeForm from "@/components/tickets/AddDiscountCodeForm";
import DiscountCodeCard from "@/components/tickets/DiscountCodeCard";
import RefundActions from "@/app/(admin)/admin/events/[id]/tickets/RefundActions";
import { FOCUS_RING } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";

import { redactDbError } from "@/lib/errors/redact";
import {
  readTicketDeliveryMarks,
  reconcileDeliveries,
} from "@/lib/email-delivery/ledger";
/**
 * Ticket tiers, discount codes, sold tickets and pending refunds — the two
 * former pages, collapsed into one (D-34-05).
 *
 * ── This is a route collapse, and nothing on the money path moved ────────────
 *
 * `actions.ts` (tiers and discount codes) and `RefundActions.tsx` stayed at
 * `src/app/(admin)/admin/events/[id]/tickets/`, outside `(work)` —
 * R-WORK-ROUTES, declared in plan 34-07. A route group governs routing and
 * nothing else, so a non-route module gains nothing by entering it while moving
 * it would change the specifier in six files this plan does not own, one of them
 * `components/events/SalesDashboard.tsx` — the second mount of `RefundActions`,
 * and a sibling plan's file in this same wave. That is why the import above is
 * absolute. **Neither of those two files was renamed and neither has a hunk in
 * this plan's diff**, which is the claim being made here: not that the refund
 * path still works — there is no test runner for this product — but that not one
 * of its lines changed.
 *
 * ── Which of the two versions decided each difference ────────────────────────
 *
 * 138 lines differed across 13 hunks, and the fuller file did NOT win by being
 * fuller. The verdicts, in short:
 *
 *  - **The guard is `organizer.access`**, because that is the key
 *    `/admin/events/[id]/tickets` is bound to in
 *    `src/lib/routes/capability-routes.ts` — the same entry the middleware reads
 *    (D-34-09). Granted to `master` and `organizer`
 *    (`20260807000000_capability_model.sql:411-412`). The `/admin` twin guarded
 *    on `admin.access`, granted to `master` alone (`:408`); the `/organizer` twin
 *    guarded on `organizer.access`. **No audience gains anything**: an organizer
 *    holding `organizer.access` already opened this exact surface at
 *    `/organizer/events/[id]/tickets`, which now answers with a redirect here.
 *    The address collapsed; the entitlement did not move.
 *
 *  - **The ownership branch below came from the `/organizer` twin and is kept**,
 *    because it is the more restrictive of the two behaviours and D-34-06 forbids
 *    resolving a divergence towards *more* without a grant that already says so.
 *    The `/admin` twin had **no ownership check at all** — it did not need one
 *    while `admin.access` made `master` its only visitor. On `organizer.access`
 *    it is load-bearing, and it is the reason this collapse does not widen a
 *    service-role read.
 *
 *  - **There is no master-only control on this surface**, and none was invented.
 *    `master.manage` appears exactly once, as the short-circuit that lets a
 *    master skip the ownership read — the reserved-operation question
 *    (`keys.ts`), asked as `capabilities.has(CAP.MASTER_MANAGE)` and never as a
 *    role string. Both twins already agreed on that; there is no `role ===`
 *    comparison in this file.
 *
 * ── The service-role read, and what is actually holding it ───────────────────
 *
 * Buyer names, buyer emails and pending refunds are read below through
 * `getServiceClient()`, which bypasses every row-level policy
 * (`access-gating.md`, gate *service role*). On that path THE CODE IS THE ONLY
 * BOUNDARY — there is no RLS behind a service-role read to catch a mistake. So
 * the ownership branch is not defence in depth here: together with the
 * capability check it is the whole of the defence, and it must stay **above**
 * the service client, where it is.
 *
 * The `/organizer` twin built that client inline from the two environment
 * variables; this file uses the shared `getServiceClient()` helper the `/admin`
 * twin used. Byte-equivalent (`src/lib/supabase/service.ts:3-8`) — the same two
 * variables, in the same order — so this is not a privilege change but a
 * question of how many places construct a service client.
 *
 * ── Both navs are gone from this file ────────────────────────────────────────
 *
 * `admin/(work)/layout.tsx` resolves the access context once for the whole tree
 * and mounts `StaffNav` and `AppNav` (D-34-07), so the `AppNav` mount and
 * the `as UserRole` / `as UserStatus` casts both twins carried are deleted here.
 * `getAccessContext` is `cache()`-scoped per request, so the guard below costs
 * no second round trip. It **throws** `capabilities.resolve_failed` and is
 * deliberately not wrapped: an infrastructure fault dressed as a permission
 * denial is a silent failure with an alibi (D-34-08, state 3).
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketTiersPage({ params }: PageProps) {
  const { id: eventId } = await params;

  // Identity from the session, not from an inbound header.
  const ctx = await getAccessContext();

  // Reachability. The middleware and this page give the same verdict because
  // they read the same entry — `/admin/events/[id]/tickets` is bound to
  // `organizer.access` in `src/lib/routes/capability-routes.ts` (D-34-09). A
  // page that stops asking is a page protected by a redirect alone, and
  // `access-gating.md` is explicit that a redirect is not a boundary.
  if (!ctx.capabilities.has(CAP.ORGANIZER_ACCESS)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Verify event ownership. Carried across from the `/organizer` twin unchanged
  // in structure, with only its two redirect destinations moved to the collapsed
  // address — the destination is the same page, one hop shorter.
  //
  // This page differs from its six siblings: the ownership row is fetched
  // **only** when it is needed, so a master pays no round trip. That is
  // preserved deliberately — asking `ownsOrIsMaster` unconditionally would be
  // correct and would add a Supabase read for every master on every visit,
  // changing no verdict. The whole reason the guard's first line is the master
  // branch is so a caller can skip the read.
  //
  // `MASTER_MANAGE` and not `ADMIN_ACCESS`: the question is "may this person
  // manage an event they do not own" — the reserved-operation question
  // (`keys.ts:55`).
  if (!ctx.capabilities.has(CAP.MASTER_MANAGE)) {
    const { data: ownerRow, error } = await supabase
      .from("events")
      .select("created_by")
      .eq("id", eventId)
      .single();

    // "I could not find out" — kept as its own arm, on its own line. It shares a
    // destination with the refusal below today, and that is the point: separate
    // conditions can be given different destinations later, a collapsed one
    // cannot. The two causes are indistinguishable to the person redirected, and
    // this project has no error tracking, so the log line below is a diagnosis
    // aid and NOT an observable effect — saying otherwise would be the recorded
    // newsletter defect with a category attached (`meta-gates.md`).
    if (error) {
      console.error("tickets:ownership_lookup_failed", {
        eventId,
        code: error.code,
      });
      redirect("/admin/events");
    }

    // "There is no such row" — distinct from both of the others.
    if (!ownerRow) {
      redirect("/admin/events");
    }

    // "You may not" — the one call, never a re-inlined comparison. Inside this
    // branch the master line can only be false, so what it decides here is the
    // identity refusal, the unowned-row refusal, and then the comparison.
    if (!ownsOrIsMaster(ctx, ownerRow.created_by)) {
      redirect("/admin/events");
    }
  }

  // Fetch event for title display
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  if (!event) {
    redirect("/admin/events");
  }

  // Count ALL parties for this event (to decide if event pass section is relevant)
  const { count: totalPartyCount } = await supabase
    .from("event_parties")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const showEventPass = (totalPartyCount ?? 0) > 1;

  // Fetch paid parties for this event
  const { data: parties } = await supabase
    .from("event_parties")
    .select("id, title, date, access_type")
    .eq("event_id", eventId)
    .eq("access_type", "paid")
    .order("sort_order", { ascending: true });

  // Fetch all tiers and group by party
  const { data: tiers } = await supabase
    .from("ticket_tiers")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const tiersWithSold = await Promise.all(
    (tiers ?? []).map(async (tier) => {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("tier_id", tier.id);
      return { ...tier, sold: count ?? 0 };
    })
  );

  // Separate event-level tiers and party-specific tiers
  const eventLevelTiers = tiersWithSold.filter((t) => !t.party_id);
  const tiersByParty = new Map<string, typeof tiersWithSold>();
  for (const tier of tiersWithSold) {
    if (tier.party_id) {
      const partyId = tier.party_id as string;
      if (!tiersByParty.has(partyId)) {
        tiersByParty.set(partyId, []);
      }
      tiersByParty.get(partyId)!.push(tier);
    }
  }

  // Fetch discount codes for this event's paid parties
  const { data: discountCodes } = await supabase
    .from("discount_codes")
    .select("*, discount_code_tiers(tier_id)")
    .in("party_id", (parties ?? []).map((p) => p.id))
    .order("created_at", { ascending: true });

  const discountCodesWithUsage = await Promise.all(
    (discountCodes ?? []).map(async (dc) => {
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("discount_code_id", dc.id);

      const restrictedTierIds = (
        dc.discount_code_tiers ?? []
      ).map((t: { tier_id: string }) => t.tier_id);
      const tierNames = restrictedTierIds
        .map(
          (tid: string) => tiersWithSold.find((t) => t.id === tid)?.name
        )
        .filter(Boolean) as string[];

      return {
        id: dc.id,
        party_id: dc.party_id,
        code: dc.code,
        discount_type: dc.discount_type as "percentage" | "fixed",
        discount_amount: dc.discount_amount,
        max_uses: dc.max_uses,
        is_active: dc.is_active,
        used: count ?? 0,
        tier_names: tierNames,
      };
    })
  );

  const discountsByParty = new Map<string, typeof discountCodesWithUsage>();
  for (const dc of discountCodesWithUsage) {
    if (!discountsByParty.has(dc.party_id)) {
      discountsByParty.set(dc.party_id, []);
    }
    discountsByParty.get(dc.party_id)!.push(dc);
  }

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

  // Fetch pending refund requests. The row set is identical to the twin's — same
  // `.in(ticketIds)`, same `.eq("status","pending")`, same order — so this is a
  // narrower projection of the same rows, not a different set of refunds.
  const ticketIds = (soldTickets ?? []).map((t: { id: string }) => t.id);
  let pendingRefunds: { id: string; ticket_id: string; reason: string | null; amount: number; created_at: string }[] = [];
  if (ticketIds.length > 0) {
    const { data } = await serviceClient
      .from("ticket_refunds")
      .select("id, ticket_id, reason, amount, created_at")
      .in("ticket_id", ticketIds)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    pendingRefunds = data ?? [];
  }

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

  const ticketBuyerMap = new Map<string, string>();
  for (const t of soldTickets ?? []) {
    const profile = t.user_id ? profiloDi.get(t.user_id) : undefined;
    ticketBuyerMap.set(t.id, profile?.full_name || profile?.email || "Unknown");
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
      "id, status, buyer_email, quantity, total_amount, error_message, created_at"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (ordiniError) {
    // Distinta dalle altre cause, come ogni lettura di questa pagina. Una
    // sezione vuota per un errore di lettura si legge «va tutto bene», che e'
    // la bugia peggiore che questa sezione possa dire.
    console.error(`[tickets.orders_unreadable] ${redactDbError(ordiniError)}`);
  }

  /**
   * Quanto puo' restare `pending` un ordine prima di meritare una riga.
   *
   * Trenta minuti, e la finestra e' **dichiarata** invece che scelta di volta in
   * volta: un checkout si paga in pochi minuti, quindi mezz'ora e' abbastanza
   * lunga da non mostrare chi sta ancora digitando la carta e abbastanza corta
   * da far comparire prima della serata un ordine comprato lo stesso pomeriggio.
   */
  const FINESTRA_PENDING_MS = 30 * 60 * 1000;
  const adesso = Date.now();

  // I due insiemi NON si fondono, e la distinzione e' la sostanza.
  //
  //   `falliti`  — il fornitore ha confermato l'incasso e i biglietti non sono
  //                nati. **Denaro preso, niente biglietto.** Ha una causa
  //                scritta, ed e' la riga che deve gridare.
  //   `sospesi`  — nessuno sa se siano stati pagati. Un carrello abbandonato ha
  //                esattamente questo aspetto, e anche un pagamento il cui
  //                messaggio non e' mai arrivato. **Il database non puo'
  //                distinguerli: solo il fornitore lo sa.** Disegnarli con la
  //                stessa voce dei falliti sarebbe rumore su ogni carrello
  //                abbandonato — e il rumore nasconde l'unica riga che conta.
  //
  // Gli ordini `expired` non compaiono: sono checkout scaduti senza pagamento,
  // cioe' il funzionamento normale, non un guasto.
  const ordiniFalliti = (ordini ?? []).filter(
    (o: { status: string }) => o.status === "failed"
  );
  const ordiniSospesi = (ordini ?? []).filter(
    (o: { status: string; created_at: string }) =>
      o.status === "pending" &&
      adesso - new Date(o.created_at).getTime() > FINESTRA_PENDING_MS
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

  function formatPartyDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${WD[d.getDay()]} ${d.getDate()} ${M[d.getMonth()]}`;
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price);
  }

  return (
    <PageShell width="wide">
      <header className="mb-6">
        <Link
          href="/admin/events"
          className={`inline-flex min-h-11 items-center gap-1 text-xs text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
        >
          &larr; Back to Events
        </Link>
        <PageTitle className="mt-2">Ticket Tiers</PageTitle>
        <p className="text-sm text-muted mt-1">{event.title}</p>
      </header>

      <div className="space-y-8">
        {/* Event Pass Tiers -- only show when multiple parties exist */}
        {showEventPass && (
          <div className="space-y-4">
            <SectionHeading>Event Pass Tiers</SectionHeading>

            <AddTierForm eventId={eventId} partyId={null} />

            {eventLevelTiers.length === 0 ? (
              <Card className="text-center">
                <p className="text-muted text-sm">No event-level tiers yet. Add one to offer an all-access pass.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {eventLevelTiers.map((tier) => (
                  <TierCard key={tier.id} tier={tier} eventId={eventId} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Party-specific tiers */}
        {(parties ?? []).length === 0 ? (
          <Card className="text-center">
            <p className="text-muted">No paid sub-events for this event. Change a sub-event&apos;s access type to &quot;Paid&quot; to add ticket tiers.</p>
          </Card>
        ) : (
          (parties ?? []).map((party: { id: string; title: string; date: string }) => {
            const partyTiers = tiersByParty.get(party.id) ?? [];

            return (
              <div key={party.id} className="space-y-4">
                <SectionHeading>
                  {party.title} &middot; {formatPartyDate(party.date)}
                </SectionHeading>

                <AddTierForm eventId={eventId} partyId={party.id} />

                {partyTiers.length === 0 ? (
                  <Card className="text-center">
                    <p className="text-muted text-sm">No tiers yet for this sub-event.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {partyTiers.map((tier) => (
                      <TierCard key={tier.id} tier={tier} eventId={eventId} />
                    ))}
                  </div>
                )}

                {/* Discount Codes for this party */}
                <div className="mt-6 space-y-4">
                  <SectionHeading as="h3">Discount Codes</SectionHeading>
                  <AddDiscountCodeForm
                    eventId={eventId}
                    partyId={party.id}
                    tiers={(tiersByParty.get(party.id) ?? []).map((t) => ({
                      id: t.id,
                      name: t.name,
                    }))}
                  />
                  {(discountsByParty.get(party.id) ?? []).length === 0 ? (
                    <Card className="text-center">
                      <p className="text-muted text-sm">No discount codes for this sub-event.</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {(discountsByParty.get(party.id) ?? []).map((dc) => (
                        <DiscountCodeCard
                          key={dc.id}
                          discountCode={dc}
                          eventId={eventId}
                          tiers={(tiersByParty.get(party.id) ?? []).map((t) => ({
                            id: t.id,
                            name: t.name,
                          }))}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Pending Refund Requests */}
        {pendingRefunds.length > 0 && (
          <div className="space-y-4">
            {/*
              The heading is the channel. This block used to be drawn in a raw
              warning hue, which D-41.1-25 retires — the word is what says a
              refund is waiting, and D-41.1-29 measured that the semantic fills
              are 1.23 : 1 apart and could not carry it as colour anyway. The
              block still renders only when there is something in it.
            */}
            <SectionHeading>Pending Refund Requests</SectionHeading>
            <div className="space-y-3">
              {pendingRefunds.map((refund) => (
                <Card key={refund.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-ink">
                      {ticketBuyerMap.get(refund.ticket_id) || "Unknown"}
                    </p>
                    {/* The money mark — D-41.1-13. */}
                    <p className="text-sm font-semibold text-ink">
                      {formatPrice(refund.amount)}
                    </p>
                  </div>
                  {refund.reason && (
                    <p className="text-xs text-muted mb-3">&ldquo;{refund.reason}&rdquo;</p>
                  )}
                  <RefundActions refundId={refund.id} />
                </Card>
              ))}
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
        {(ordiniFalliti.length > 0 || ordiniSospesi.length > 0) && (
          <div className="space-y-4">
            <SectionHeading>
              Orders without tickets ({ordiniFalliti.length + ordiniSospesi.length})
            </SectionHeading>

            <div className="space-y-3">
              {ordiniFalliti.map(
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
                  </Card>
                )
              )}

              {ordiniSospesi.map(
                (o: {
                  id: string;
                  buyer_email: string;
                  quantity: number;
                  total_amount: number;
                  created_at: string;
                }) => (
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
                      La voce piu' bassa, di proposito. Un carrello abbandonato
                      ha questo stesso aspetto, e cosi' un pagamento il cui
                      messaggio non e' mai arrivato: **il database non li
                      distingue, solo SumUp lo sa**. Dire «non pagato» sarebbe
                      inventare un fatto; dire «non consegnato» sarebbe
                      inventarne un altro. Si dice cosa non si sa, e dove si va
                      a saperlo.
                    */}
                    <p className="text-xs text-sem-warn">
                      Checkout never confirmed, {o.quantity}{" "}
                      {o.quantity === 1 ? "ticket" : "tickets"}. We do not know
                      whether it was paid — an abandoned cart looks exactly like
                      this. Check the checkout on SumUp before treating it as a
                      problem.
                    </p>
                  </Card>
                )
              )}
            </div>
          </div>
        )}

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
      </div>
    </PageShell>
  );
}
