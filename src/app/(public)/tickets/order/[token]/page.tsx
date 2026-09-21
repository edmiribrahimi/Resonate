import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase/service";
import { generateTicketToken, verifyTicketToken } from "@/utils/qr";
import { formatEventDate, formatTime } from "@/utils/formatTime";
import { redactDbError } from "@/lib/errors/redact";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/Typography";
import { formatHolderLabel } from "@/lib/tickets/holder-label";
import { Button } from "@/components/ui/Button";

/**
 * I biglietti di un ordine comprato senza account, aperti da una firma.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * PERCHE' QUESTA PAGINA ESISTE
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * `src/app/(public)/tickets/[id]/page.tsx` risolve una sessione e rimbalza a
 * `/login`. Chi ha comprato senza account **non ha ancora scelto una password**,
 * quindi per lui quella pagina non esiste: i link della mail d'ordine finiscono
 * contro un muro. Il codice viaggia anche come allegato, ma **non se chi riceve
 * ha il caricamento delle immagini disattivato**, che e' comune.
 *
 * Quindi questa non e' una comodita': e' la strada che percorre una persona che
 * ha gia' pagato per raggiungere cio' che ha comprato.
 *
 * ── LA CREDENZIALE E' LA FIRMA, NON UN COOKIE ───────────────────────────────
 *
 * Il segmento e' `{uuid}.{HMAC-SHA256}` — la stessa forma che la porta verifica,
 * prodotta da `generateTicketToken` e verificata da `verifyTicketToken` con un
 * confronto **a tempo costante**. L'uuid viene da `gen_random_uuid()`: 122 bit
 * da un CSPRNG, piu' una firma che non si produce senza il segreto.
 *
 * **Non e' enumerabile, e va scritto invece che sperato**, perche' il repository
 * **non ha rate limiting** (`access-gating.md`, gate *nessun rate limiting,
 * oggi*): l'unica difesa e' che indovinare non funziona, non che qualcuno stia
 * contando i tentativi.
 *
 * Il rifiuto e' `notFound()` **senza distinguere** «ordine inesistente» da
 * «firma non valida». Distinguerli trasformerebbe la pagina in un oracolo sugli
 * identificativi d'ordine, e le due cause hanno lo stesso rimedio per chi legge:
 * riaprire il link dalla mail.
 *
 * **Un token firmato su un biglietto non apre un ordine, e viceversa**, benche'
 * il segreto sia lo stesso: la separazione la fa la TABELLA su cui si cerca
 * l'identificativo restituito, e due uuid casuali non collidono. Detto perche'
 * chi legge `verifyTicketToken` in due posti deve sapere perche' non e' un buco.
 *
 * ── NESSUN LUOGO, E LA REGOLA E' PIU' STRETTA DI UN PREDICATO ───────────────
 *
 * `D-49-04`, decisione del proprietario: il posto dove si suona raggiunge **solo
 * chi ha comprato, per mail**, e la credenziale di un biglietto **non diventa
 * una chiave verso di esso**. Un uuid firmato si inoltra come si inoltra un
 * biglietto — che al portatore (`D-49-03`) e' il caso progettato, non un abuso —
 * e con esso viaggerebbe il posto.
 *
 * Quindi qui non si consulta il predicato di `src/lib/venue-reveal/`: **non c'e'
 * niente da decidere.** La regola e' piu' semplice e, soprattutto, verificabile
 * con un grep invece che con una lettura: **questa pagina non seleziona nessuna
 * colonna che descriva un posto.** Una colonna che non si legge non si puo'
 * stampare. Il controllo **G** di `scripts/verify-venue-surfaces.mjs` lo misura
 * con un'allow-list positiva delle colonne selezionate, cosi' che una colonna
 * nuova — qualunque essa sia — faccia arrossire il gate finche' qualcuno non la
 * autorizza deliberatamente.
 *
 * *(La ricerca di fase raccomandava l'opposto — leggere il predicato del
 * titolare, perche' per chi compra dopo la rivelazione questa sarebbe l'unica
 * via. `D-49-04` e' piu' recente e piu' stretta, e vince. Quel caso lo chiude
 * il piano 49-09, per mail.)*
 *
 * ── E NESSUN INDIRIZZO DI POSTA ─────────────────────────────────────────────
 *
 * `ticket_orders.buyer_email` **non viene selezionato**, ed e' una decisione
 * presa qui invece che ereditata: il link e' al portatore, quindi mostrarlo
 * consegnerebbe l'indirizzo di chi ha pagato a chiunque abbia ricevuto il
 * biglietto inoltrato. Stessa disciplina della colonna del luogo, applicata a un
 * dato personale.
 *
 * ── PERCHE' `force-dynamic` E' DICHIARATO E NON DEDOTTO ─────────────────────
 *
 * Questa superficie mostra **lo stato di un pagamento**. `nextjs-architecture.md`,
 * gate *cache esplicita* e gate *service worker*: Serwist serve contenuto anche
 * vecchio, e una pagina che dicesse «in corso» a pagamento concluso — o il
 * contrario — sarebbe un guasto con una faccia neutra. La dichiarazione non e'
 * una preferenza: e' il gate soddisfatto.
 */
export const dynamic = "force-dynamic";

/** Quante colonne del QR: alto, perche' il codice si legge da uno schermo altrui. */
const QR_ERROR_CORRECTION = "H" as const;

/**
 * Uno stato d'errore progettato, non ereditato.
 *
 * `nextjs-architecture.md`, gate *stato vuoto e d'errore*. E il progetto **non ha
 * error tracking** (`meta-gates.md`): una riga di log non raggiunge nessuno da
 * sola, quindi ogni causa deve avere un **effetto osservabile** — qui, una frase
 * diversa per causa diversa, che e' l'unica osservabilita' disponibile.
 */
function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <PageShell width="focus">
      <Card className="text-center">
        <PageTitle>{title}</PageTitle>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <Button href="/events" size="lg" variant="secondary" className="mt-4 w-full">
          Back to events
        </Button>
      </Card>
    </PageShell>
  );
}

export default async function GuestOrderTicketsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // ── Il segreto della firma, letto con un controllo ─────────────────────────
  //
  // `verifyTicketToken` asserisce la variabile con `!`, quindi la sua assenza
  // solleverebbe dentro `createHmac`. Un 500 direbbe a chi ha pagato «qualcosa e'
  // andato storto» — e, peggio, un `notFound()` gli direbbe **«il tuo ordine non
  // esiste»**, che e' falso e indistinguibile da una firma sbagliata. Le due
  // cause si riparano in posti diversi: una e' una configurazione mancante, e va
  // detta con un nome suo.
  if (!(process.env.TICKET_SIGNING_SECRET ?? "").trim()) {
    console.error(
      "[tickets.order_page_signing_secret_missing] TICKET_SIGNING_SECRET assente: " +
        "nessun link d'ordine puo' essere verificato"
    );
    return (
      <Unavailable
        title="We can't open this page right now"
        body="Your order and your tickets are untouched: this is on our side, not your link. Try again in a few minutes, and write to us if it stays like this."
      />
    );
  }

  // ── Prima la firma. Solo dopo il client di servizio ────────────────────────
  //
  // E' la forma di `redeemDrinkTokenGuest` (`menu/actions.ts:389-400`), che in
  // questo prodotto funziona gia' da ospite: nessuna lettura avviene prima che la
  // credenziale sia stata provata.
  const orderId = verifyTicketToken(token);
  if (!orderId) {
    notFound();
  }

  const service = getServiceClient();

  // Colonne nominate una per una, mai `*`.
  //
  // **Nessun client Supabase di questo repository e' parametrizzato con
  // `Database`** (`src/lib/supabase/service.ts:4`): un nome sbagliato compila,
  // gira e restituisce `undefined` in silenzio. Le colonne qui sotto sono state
  // confrontate con `information_schema.columns` in produzione, in sola lettura,
  // il 2026-09-06.
  const { data: order, error: orderError } = await service
    .from("ticket_orders")
    .select("id, status, quantity, event_id, party_id, tier_id, user_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    // `redactDbError` e non l'oggetto: PostgREST restituisce **la riga rifiutata**
    // dentro `details` su una violazione di vincolo, e una riga di questo prodotto
    // puo' portare una credenziale della porta.
    console.error(
      `[tickets.order_page_unreadable] order=${orderId} ${redactDbError(orderError)}`
    );
    return (
      <Unavailable
        title="We couldn't read your order"
        body="That doesn't mean it's lost: the lookup didn't answer. Reload in a moment — the link stays valid."
      />
    );
  }

  if (!order) {
    // Una firma valida su un ordine che non c'e'. Stessa risposta della firma
    // invalida, di proposito: vedi il docblock.
    notFound();
  }

  const { data: ticketRows, error: ticketsError } = await service
    .from("tickets")
    .select("id, holder_label")
    .eq("order_id", orderId);

  if (ticketsError) {
    console.error(
      `[tickets.order_page_tickets_unreadable] order=${orderId} ${redactDbError(ticketsError)}`
    );
    return (
      <Unavailable
        title="We couldn't read your tickets"
        body="The order is there. It's the tickets that didn't answer: reload in a moment."
      />
    );
  }

  // ── Il pagamento non e' concluso ───────────────────────────────────────────
  //
  // Quattro stati nello schema (`20260905120000_ticket_orders.sql`), e **tre
  // frasi diverse**: collassarle in una sola rifarebbe il difetto registrato del
  // form newsletter, che dice *"Qualcosa e' andato storto"* per qualunque causa.
  //
  // `error_message` esiste sulla riga e **non viene selezionato**: e' un testo
  // scritto per chi ripara, e questa pagina si apre con un link che si inoltra.
  if (order.status !== "completed") {
    if (order.status === "pending") {
      return (
        <Unavailable
          title="Your payment is still in progress"
          body="Nothing to redo: as soon as the payment is confirmed your tickets appear here. Reload in a minute, and keep this link — it's the permanent link to your order."
        />
      );
    }
    if (order.status === "expired") {
      return (
        <Unavailable
          title="The payment session has expired"
          body="Nothing was charged and no ticket was issued. You can start again from the event page."
        />
      );
    }
    return (
      <Unavailable
        title="The payment didn't go through"
        body="No ticket was issued. If you see a charge for this order on your statement, write to us: it shouldn't stay there."
      />
    );
  }

  // ── Pagato, ma senza biglietti ─────────────────────────────────────────────
  //
  // Non e' un caso teorico: e' il ritorno dal pagamento che arriva prima che il
  // webhook abbia emesso le righe, ed e' anche la forma che avrebbe un'emissione
  // fallita. Una pagina vuota li renderebbe indistinguibili e sembrerebbe un
  // guasto neutro; qui e' uno stato **progettato**, con la sua riga di log.
  const tickets = [...(ticketRows ?? [])].sort(
    (a, b) => ordinalOf(a.holder_label) - ordinalOf(b.holder_label)
  );

  if (tickets.length === 0) {
    console.error(
      `[tickets.order_page_paid_without_tickets] order=${orderId} quantity=${order.quantity}`
    );
    return (
      <Unavailable
        title="Payment confirmed, your tickets are on their way"
        body="The payment is recorded and won't be lost. The codes appear here as soon as they're issued: reload in a minute. If they're still missing after a few minutes, write to us and keep this link."
      />
    );
  }

  // ── La serata, l'evento e il tier ──────────────────────────────────────────
  //
  // **Nessuna colonna che descriva un posto, in nessuna delle tre letture.** Vedi
  // il docblock in testa e il controllo G del gate delle superfici.
  const [{ data: event }, { data: tier }] = await Promise.all([
    service.from("events").select("title, slug, date").eq("id", order.event_id).maybeSingle(),
    service.from("ticket_tiers").select("name").eq("id", order.tier_id).maybeSingle(),
  ]);

  let party: { title: string; date: string; time: string; end_time: string | null } | null =
    null;
  if (order.party_id) {
    const { data: partyRow, error: partyError } = await service
      .from("event_parties")
      .select("title, date, time, end_time")
      .eq("id", order.party_id)
      .maybeSingle();
    if (partyError) {
      // Non ferma la pagina: il codice e' cio' che apre la porta, il titolo della
      // serata e' contorno. Ma la causa resta scritta con un nome suo.
      console.error(
        `[tickets.order_page_night_unreadable] order=${orderId} ${redactDbError(partyError)}`
      );
    }
    party = partyRow ?? null;
  }

  const heading = party
    ? party.title && event?.title && party.title !== event.title
      ? `${event.title} — ${party.title}`
      : (party.title ?? event?.title ?? "Your order")
    : (event?.title ?? "Your order");

  const displayDate = party?.date ?? event?.date ?? null;
  const displayTime = party?.time ?? null;
  const displayEndTime = party?.end_time ?? null;

  // ── Un codice per biglietto ────────────────────────────────────────────────
  //
  // `generateTicketToken(ticket.id)` — **la stessa firma che la porta verifica**,
  // non una seconda forma. Se il disegno fallisce si dice, invece di mostrare
  // riquadri vuoti che sembrerebbero biglietti senza codice.
  let codes: Array<{ id: string; label: string; dataUrl: string }>;
  try {
    codes = await Promise.all(
      tickets.map(async (ticket, index) => ({
        id: ticket.id,
        label: formatHolderLabel(ticket.holder_label, index, tickets.length),
        dataUrl: await QRCode.toDataURL(generateTicketToken(ticket.id), {
          width: 280,
          margin: 2,
          errorCorrectionLevel: QR_ERROR_CORRECTION,
        }),
      }))
    );
  } catch (qrError) {
    console.error(
      `[tickets.order_page_qr_failed] order=${orderId} ` +
        `${qrError instanceof Error ? qrError.message : "errore non-Error"}`
    );
    return (
      <Unavailable
        title="The codes couldn't be drawn"
        body="Your tickets exist and are valid: it's the drawing of the code that failed. Reload the page, and if that's not enough use the codes in your order email."
      />
    );
  }

  // Il blocco della password compare solo quando l'identita' esiste gia' — cioe'
  // dopo che il webhook ha risolto l'account. Prima non c'e' niente da
  // completare, e offrirlo manderebbe qualcuno verso una pagina che non puo'
  // servirlo.
  const completeAccountOffered = order.user_id !== null;

  return (
    <PageShell width="focus" className="flex flex-col items-center">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-sem-done/30 bg-sem-done/10">
          <span className="text-3xl">&#10003;</span>
        </div>
        <PageTitle>
          {codes.length > 1 ? `Your ${codes.length} tickets` : "Your ticket"}
        </PageTitle>
        <p className="mt-2 text-sm text-muted">
          This link is the permanent way back to your order: save it, and you can
          reopen it without signing in.
        </p>
      </div>

      <Card className="w-full">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          re:sonate
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight">{heading}</h2>
        {tier?.name ? <p className="mt-1 text-sm text-muted">{tier.name}</p> : null}
        {displayDate ? (
          <p className="mt-2 text-sm text-muted">{formatEventDate(displayDate)}</p>
        ) : null}
        {displayTime ? (
          <p className="mt-1 text-sm text-muted">
            {formatTime(displayTime)}
            {displayEndTime ? ` – ${formatTime(displayEndTime)}` : ""}
          </p>
        ) : null}
      </Card>

      {/*
        Un riquadro per biglietto, con la sua etichetta.

        `D-49-03`: il biglietto e' **al portatore**. Chi compra puo' regalarne o
        rivenderne alcuni, quindi deve poterli **distinguere per inoltrarli** —
        sei riquadri identici non si distinguono. L'etichetta viene da
        `holder_label` e **non e' un nome**: nessun nome viene chiesto
        all'acquisto, e nessuno viene mostrato come se fosse un controllo
        d'identita'.
      */}
      <div className="mt-4 grid w-full gap-4">
        {codes.map((code) => (
          <div
            key={code.id}
            className="flex flex-col items-center rounded-2xl border border-line bg-surface p-5"
          >
            <p className="mb-3 text-sm font-semibold">Ticket {code.label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={code.dataUrl}
              alt={`QR code for ticket ${code.label}`}
              width={200}
              height={200}
              className="mb-2"
            />
            <p className="text-xs text-muted">Show this code at the door</p>
          </div>
        ))}
      </div>

      {completeAccountOffered ? (
        <Card className="mt-4 w-full">
          {/*
            «Completa il tuo account», mai «diventa membro» — decisione del
            proprietario, punto 5 di `49-CONTEXT.md`. Il pagamento ha **gia'**
            ammesso; la password non ammette nessuno, da' solo un modo per
            rientrare. Chiamarla altrimenti attribuirebbe alla password l'effetto
            che ha il pagamento, che e' il principio 8 — ruolo e stato sono due
            assi — violato nel punto in cui il prodotto parla.

            **Non c'e' un bottone verso `/set-password`, e non e' una svista.**
            Quella pagina consuma un `token_hash` che solo la mail porta; aperta
            senza, dichiara *«This link has expired, or it has already been
            used»* — una frase falsa detta a chi un link non l'ha mai avuto.
            Mandarcelo sarebbe un vicolo cieco travestito da invito.
          */}
          <p className="text-sm font-semibold">Complete your account</p>
          <p className="mt-1 text-sm text-muted">
            Your order email has the link to choose a password: it lets you come
            back from any device. It changes nothing about these tickets, which
            stay valid as they are.
          </p>
          <Button href="/login" size="lg" variant="secondary" className="mt-4 w-full">
            I already have a password
          </Button>
        </Card>
      ) : null}

      {event?.slug ? (
        <Button
          href={`/events/${event.slug}`}
          size="lg"
          variant="secondary"
          className="mt-4 w-full"
        >
          Go to the event
        </Button>
      ) : null}
    </PageShell>
  );
}

/**
 * L'ordinale dentro l'ordine, letto da `holder_label` («2 di 6»).
 *
 * Stessa funzione, stessa ragione, di `src/lib/tickets/order-confirmation.ts`:
 * `holder_label` e' testo, e un ordinamento lessicale metterebbe «10 di 12» prima
 * di «2 di 12». Un'etichetta illeggibile finisce in coda invece di far fallire la
 * pagina — un biglietto in disordine e' un fastidio, un biglietto non mostrato e'
 * una persona alla porta.
 */
function ordinalOf(label: string | null): number {
  const n = Number.parseInt((label ?? "").trim().split(" ")[0] ?? "", 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}
