"use server";

import { createCheckout } from "@/lib/sumup";
import { getServiceClient } from "@/lib/supabase/service";
import { logMoneyPathFailure } from "@/lib/failure/money-path";
import { redactDbError } from "@/lib/errors/redact";
import {
  buildOrderQuote,
  type OrderQuoteRefusal,
} from "@/lib/tickets/order-quote";
import {
  sendOrderConfirmation,
  ORDER_CONFIRMATION_CATEGORY,
} from "@/lib/tickets/order-confirmation";

/**
 * guest-purchase-actions.ts — la strada d'acquisto che non chiede un account.
 *
 * Una mail, una quantita', un checkout. E' la sorella di `purchaseDrinksGuest`
 * (`src/app/(public)/events/[slug]/menu/actions.ts:197-340`), che in questo
 * codice funziona gia' da ospite: se ne riusa **la forma**, non se ne inventa
 * una nuova.
 *
 * ── QUESTA E' UNA SUPERFICIE ESPOSTA, e va detto invece che scoperto ────────
 *
 * Una Server Action e' **un endpoint pubblico con una firma comoda**
 * (`nextjs-architecture.md`, gate *server action autorizzata*). Questa non ha
 * nessun controllo di identita' — e' il suo scopo — quindi chiunque puo'
 * chiamarla con un id di serata e uno di tier e leggere dalla risposta se
 * esistono, se sono in vendita e quanto costano.
 *
 * **Il repository non ha rate limiting**: nessuna dipendenza, nessuna
 * implementazione (`access-gating.md`, gate *nessun rate limiting, oggi*). Quel
 * gate chiede che un endpoint del genere sia **dichiarato per iscritto**, non
 * risolto qui: risolverlo significherebbe introdurre un meccanismo di limitazione
 * in tutto il prodotto, che e' una decisione di architettura e non un dettaglio
 * di questo file. Registrato come `T-49-15`, disposizione *accept*.
 *
 * Cosa l'esposizione **non** concede, misurato invece che sperato:
 * - nessuna colonna di venue viene letta da questo cammino — vedi il preventivo,
 *   che non ne nomina nessuna;
 * - la riga d'ordine che nasce qui e' leggibile via RLS solo dal proprio
 *   titolare (`ticket_orders_select_own`, `auth.uid() = user_id`), e finche' il
 *   webhook non risolve l'identita' `user_id` e' nullo, quindi **nessuno** la
 *   legge dalla chiave anonima;
 * - il prezzo non arriva mai dal chiamante.
 *
 * ── Il client di servizio, con la giustificazione che il gate pretende ──────
 *
 * `access-gating.md`, gate *service role*: ogni uso nuovo del client di servizio
 * **va giustificato per iscritto nel commit** e non deve essere raggiungibile da
 * input non fidato. Qui l'input non fidato **c'e'** — cinque valori digitati o
 * scelti dal browser — quindi la giustificazione deve dire cosa gli si fa prima
 * che tocchino il client, e la dice:
 *
 * 1. **Perche' serve.** Un ospite non ha sessione: non esiste `auth.uid()`,
 *    quindi non esiste policy che gli permetta di scrivere una riga d'ordine.
 *    La scrittura non e' eseguibile *come il chiamante*, e la tabella non ha —
 *    per decisione del piano 49-01 — **nessuna policy per `anon`**. Il client di
 *    servizio e' l'unico modo, ed e' lo stesso che il percorso drink usa gia' in
 *    produzione per lo stesso motivo.
 * 2. **Cosa si fa all'indirizzo mail prima di toccare il client.** `trim()`,
 *    minuscolo, tetto di lunghezza e un controllo di forma esplicito. **Nessuna
 *    libreria di validazione**: non ce n'e' una in questo repository e non se ne
 *    aggiunge una per una route sola — la decisione contraria e' gia' registrata
 *    in `src/app/api/tickets/checkin/route.ts:110-116`.
 * 3. **Nessuna query costruita per concatenazione.** Ogni valore che arriva dal
 *    browser viaggia come **parametro** di un filtro PostgREST (`.eq(...)`) o
 *    come valore di una `insert`, mai dentro una stringa di query. Non c'e' SQL
 *    composto in questo cammino.
 * 4. **Cosa fa il codice al posto della RLS.** Bypassando ogni policy, su questo
 *    cammino **il codice E' il confine**: il preventivo verifica che l'evento sia
 *    pubblicato, che il tier appartenga a quella serata e che quantita' e prezzo
 *    reggano — e la RPC del webhook li riverifica tutti dentro la transazione.
 *
 * ── Nessun account nasce qui, ed e' il punto della fase ─────────────────────
 *
 * L'identita' leggera nasce **al webhook**, dopo un incasso verificato via GET
 * checkout, mai all'avvio del checkout. E' il gate *soldi vs contenuto* nella
 * sua forma corretta — prima l'incasso, poi tutto il resto — e chiude il difetto
 * degli account fantasma, uno per ogni carrello abbandonato. `ticket_orders.
 * user_id` e' nullabile esattamente per questo.
 *
 * ── Nessun nome viene chiesto ───────────────────────────────────────────────
 *
 * `D-49-03`: il biglietto e' **al portatore**. Chi compra puo' regalarlo o
 * rivenderlo, e chi entra e' chi lo tiene — «sei e' un gruppo di amici con un
 * solo pagante» significa che cinque biglietti su sei stanno in mano a qualcun
 * altro. `BUY-03` resta *una mail basta*. Un nome chiesto qui produce uno di due
 * danni: lo staff vede un nome, ha davanti un'altra persona e **rifiuta un
 * ospite valido** davanti a una fila, oppure impara a ignorare il campo e allora
 * il campo e' teatro. **Non aggiungerlo per gentilezza.**
 *
 * ── Perche' i rifiuti sono VALORI e non eccezioni ───────────────────────────
 *
 * Next **redige** il messaggio di un errore sollevato da una Server Action in un
 * build di produzione (`src/lib/capabilities/server.ts:58-63`,
 * `money-path.ts:62-69`): riformulare un `throw` non e' una riparazione, perche'
 * tre frasi diverse arrivano identiche proprio dove contano. Il piano 49-04
 * chiedeva di *sollevare* un errore visibile sull'ultimo ramo; qui viaggia come
 * valore, che e' l'unico modo in cui quel ramo resta visibile dopo il build. Il
 * precedente in albero e' `updateMenuClosesAt` (`menu/actions.ts:143-190`).
 *
 * **E l'osservabilita' disponibile e' questa, detta perche' non ce n'e' altra.**
 * Il progetto **non ha error tracking** (`meta-gates.md`): una riga di log non
 * raggiunge nessun essere umano da sola. L'effetto che qualcuno vede davvero e'
 * che la persona **non arriva alla pagina di pagamento** e legge una frase che
 * dice quale passo non e' andato. Se scrivesse a noi, quella frase e' cio' che
 * permetterebbe di trovare la riga di log corrispondente.
 */

/** Il tetto di RFC 5321 su un indirizzo di posta, applicato prima dell'insert. */
const EMAIL_MAX_LENGTH = 254;

/**
 * Forma minima e non negoziabile: qualcosa, una chiocciola, qualcosa, un punto,
 * qualcosa — senza spazi. **Non e' una validazione RFC** e non pretende di
 * esserlo: nessuna espressione regolare lo e', e l'unica prova che un indirizzo
 * esiste e' una mail che arriva. Serve a fermare i due casi che si vedono
 * davvero — il campo vuoto e il dominio dimenticato — prima che diventino un
 * biglietto pagato che non raggiunge nessuno.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GUEST_EMAIL_MISSING = "guest_email_missing";
const GUEST_EMAIL_MALFORMED = "guest_email_malformed";
const GUEST_CHECKOUT_FAILED = "guest_checkout_failed";
const GUEST_ORDER_NOT_SAVED = "guest_order_not_saved";

/**
 * I quattro rifiuti che appartengono a **questa** superficie, piu' quelli del
 * preventivo, che viaggiano cosi' come sono.
 *
 * Ogni superficie dichiara la propria unione nel proprio file
 * (`money-path.ts:46-60`): una categoria di una cassa e una di un cron non sono
 * membri di un vocabolario solo. Quelle del preventivo si **uniscono** invece di
 * essere riavvolte in una categoria generica, perche' riavvolgerle
 * cancellerebbe la distinzione che il preventivo esiste per produrre — e chi
 * chiama deve poter distinguere *scegli di meno* da *riprova*.
 */
type GuestPurchaseRefusal =
  | typeof GUEST_EMAIL_MISSING
  | typeof GUEST_EMAIL_MALFORMED
  | typeof GUEST_CHECKOUT_FAILED
  | typeof GUEST_ORDER_NOT_SAVED
  | OrderQuoteRefusal;

/**
 * Una frase per causa. `Record` **totale** sull'unione locale: una causa
 * aggiunta senza la sua frase e' un errore di `npm run build`. Le frasi del
 * preventivo non si ricopiano qui — arrivano gia' risolte dentro il suo
 * risultato, e una seconda copia sarebbe una seconda verita' che nessuno
 * confronta.
 */
const GUEST_PURCHASE_ERROR: Record<
  | typeof GUEST_EMAIL_MISSING
  | typeof GUEST_EMAIL_MALFORMED
  | typeof GUEST_CHECKOUT_FAILED
  | typeof GUEST_ORDER_NOT_SAVED,
  string
> = {
  [GUEST_EMAIL_MISSING]:
    "Enter the email where your tickets should go. Nothing was charged.",
  [GUEST_EMAIL_MALFORMED]:
    "That email does not look like an email, so your tickets would have nowhere to go. Check it and try again — nothing was charged.",
  [GUEST_CHECKOUT_FAILED]:
    "The payment page could not be opened, so nothing was charged and no order was placed. Please try again in a moment.",
  [GUEST_ORDER_NOT_SAVED]:
    "Your order could not be saved, so we stopped before taking any payment. Nothing was charged. Please try again — and if it happens twice, tell us.",
};

type GuestPurchaseResult =
  | { success: true; checkoutId: string; orderId: string }
  | { success: false; refusal: GuestPurchaseRefusal; error: string };

/**
 * Apre un checkout per uno o piu' biglietti su una serata, senza sessione e
 * senza account.
 *
 * **Non risolve nessuna sessione — non chiede chi sta chiamando, in nessun
 * punto — e l'assenza e' la ragione per cui questa funzione esiste.**
 * `purchaseTicket` (`src/app/(admin)/admin/events/actions.ts:1265`)
 * resta invariato per chi ha una sessione: le due strade convivono, ognuna con
 * la propria idempotenza, e le fasi 50/51 decideranno se la vecchia sopravvive.
 * Mescolarle qui produrrebbe la superficie mezza convertita che questa fase
 * esiste per evitare.
 *
 * @returns l'id del checkout e l'id dell'ordine — che sono lo **stesso** uuid
 * del `checkout_reference` — oppure un rifiuto con la sua causa.
 */
export async function purchaseTicketsGuest(input: {
  partyId: string;
  tierId: string;
  quantity: number;
  email: string;
  discountCodeId?: string | null;
}): Promise<GuestPurchaseResult> {
  // 1. L'indirizzo, normalizzato PRIMA di toccare qualunque cosa.
  //
  //    Minuscolo come fa gia' `src/lib/guest-list/process-entry.ts:160`: la
  //    parte locale di un indirizzo e' formalmente sensibile alle maiuscole, ma
  //    nessun percorso di questo prodotto la tratta cosi' — il registro dei
  //    profili si cerca con `ilike` — e due convenzioni diverse sullo stesso
  //    indirizzo sono due persone diverse per il webhook che deve riconoscerlo.
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";

  if (!email) {
    return {
      success: false,
      refusal: GUEST_EMAIL_MISSING,
      error: GUEST_PURCHASE_ERROR[GUEST_EMAIL_MISSING],
    };
  }
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_SHAPE.test(email)) {
    // Le due cause hanno lo stesso rimedio per chi legge — correggere il campo —
    // e restano una categoria sola per quello, non per comodita'.
    return {
      success: false,
      refusal: GUEST_EMAIL_MALFORMED,
      error: GUEST_PURCHASE_ERROR[GUEST_EMAIL_MALFORMED],
    };
  }

  // 2. Il client di servizio. La giustificazione sta nel docblock del modulo e
  //    nel messaggio di commit, come il gate *service role* pretende.
  const serviceClient = getServiceClient();

  // 3. Il preventivo: prezzo, tetto, capienza, sconto, minimo. Tutto dal
  //    database, e ogni rifiuto con la sua causa propria.
  const quoted = await buildOrderQuote(serviceClient, {
    partyId: input.partyId,
    tierId: input.tierId,
    quantity: input.quantity,
    discountCodeId: input.discountCodeId ?? null,
  });

  if (!quoted.ok) {
    // La causa viaggia intatta: collassarla in «Impossibile procedere» rifarebbe
    // il difetto del form newsletter registrato in questo progetto.
    return { success: false, refusal: quoted.refusal, error: quoted.error };
  }

  const quote = quoted.quote;

  // 4. Un solo uuid come `ticket_orders.id` E come `checkout_reference`: cosi' il
  //    ritorno dal 3DS trova l'ordine con una lettura del database invece di un
  //    giro all'API del fornitore. E' la scelta gia' presa sui drink
  //    (`menu/actions.ts:291-294`).
  const orderId = crypto.randomUUID();

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sumup`;

  // `ctx=ticket_order` e NON `ticket`: il ramo `ticket` che esiste oggi legge
  // `pending_purchases` (`payment/callback/actions.ts:36-43`), e mandarci un
  // ordine significherebbe cercarlo nella tabella sbagliata. Il ramo che
  // riconosce questo valore lo aggiunge il piano 49-06; finche' non c'e', il
  // ritorno dal pagamento mostra il proprio stato d'errore — visibile, non
  // silenzioso — e il webhook emette comunque i biglietti.
  const redirectUrl = new URL("/payment/callback", process.env.NEXT_PUBLIC_APP_URL);
  redirectUrl.searchParams.set("order", orderId);
  redirectUrl.searchParams.set("ctx", "ticket_order");
  redirectUrl.searchParams.set("slug", quote.eventSlug);

  // 5. Il checkout. **Prima della riga d'ordine, e non per scelta**:
  //    `ticket_orders.sumup_checkout_id` e' `NOT NULL` — e' li' che vive
  //    l'idempotenza del pagamento (piano 49-01) — quindi la riga non e'
  //    scrivibile prima di avere l'id. Stessa sequenza del percorso drink.
  //
  //    Il residuo, dichiarato: se il passo 6 fallisce resta un checkout aperto
  //    presso il fornitore che non corrisponde a nessuna riga. **Nessuno puo'
  //    pagarlo**, perche' l'indirizzo di pagamento si costruisce dall'id che
  //    questa funzione non restituira'. E' rumore nel cruscotto del fornitore,
  //    non denaro sospeso.
  let checkoutId: string;
  try {
    const response = await createCheckout({
      amount: quote.totalAmount,
      currency: "EUR",
      // Composta dentro il preventivo, in un posto solo. Va a una superficie di
      // terzi che non si ritira: il vincolo su cosa puo' contenere il TITOLO di
      // una serata e' scritto li' e in `venue-secrecy.md`.
      description: quote.description,
      checkoutReference: orderId,
      returnUrl,
      redirectUrl: redirectUrl.toString(),
    });
    checkoutId = response.id;
  } catch (error) {
    // Il fornitore ha rifiutato o non ha risposto. Categoria propria: senza,
    // questo caso sarebbe indistinguibile da un insert fallito, e i due si
    // riparano in posti diversi.
    logMoneyPathFailure("tickets.guest_checkout_create_failed", {
      code: null,
      message: error instanceof Error ? error.message : null,
    });
    return {
      success: false,
      refusal: GUEST_CHECKOUT_FAILED,
      error: GUEST_PURCHASE_ERROR[GUEST_CHECKOUT_FAILED],
    };
  }

  // 6. La riga d'ordine. `user_id: null` — **nessun account nasce qui**.
  const { error: insertError } = await serviceClient.from("ticket_orders").insert({
    id: orderId,
    event_id: quote.eventId,
    party_id: quote.partyId,
    tier_id: quote.tierId,
    user_id: null,
    buyer_email: email,
    quantity: quote.quantity,
    sumup_checkout_id: checkoutId,
    total_amount: quote.totalAmount,
    discount_code_id: quote.discountCodeId,
    status: "pending",
  });

  if (insertError) {
    // `redactDbError` e non l'oggetto: su una violazione di vincolo PostgREST
    // restituisce **la riga rifiutata** dentro `details`, e una riga di questo
    // prodotto puo' portare una credenziale della porta.
    console.error(
      `[tickets.guest_order_insert_failed] ${redactDbError(insertError)}`
    );
    return {
      success: false,
      refusal: GUEST_ORDER_NOT_SAVED,
      error: GUEST_PURCHASE_ERROR[GUEST_ORDER_NOT_SAVED],
    };
  }

  return { success: true, checkoutId, orderId };
}

/* ────────────────────────────────────────────────────────────────────────────
 * «Rimandami i biglietti» — BUY-04, la seconda strada
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * La finestra oltre la quale un ordine non si rimanda: sessanta giorni.
 *
 * Dichiarata invece che infinita. Rispedire il biglietto di una serata finita da
 * mesi non serve a nessuno e allarga inutilmente cio' che un indirizzo digitato
 * da chiunque puo' mettere in moto.
 */
const RESEND_WINDOW_DAYS = 60;

/**
 * Quanti ordini al massimo una richiesta puo' far spedire.
 *
 * Un tetto e' necessario perche' il numero di mail generate da **una** richiesta
 * non deve dipendere da quanti ordini ha una persona. Se qualcuno ne avesse di
 * piu', i piu' recenti sono quelli che sta cercando — e la troncatura si logga,
 * invece di sparire.
 */
const RESEND_MAX_ORDERS = 10;

/** La finestra del freno, in minuti, e quanti invii vi stanno dentro. */
const RESEND_THROTTLE_MINUTES = 60;
const RESEND_THROTTLE_MAX = 3;

const RESEND_EMAIL_MISSING = "resend_email_missing";
const RESEND_EMAIL_MALFORMED = "resend_email_malformed";
const RESEND_UNAVAILABLE = "resend_unavailable";

type ResendRefusal =
  | typeof RESEND_EMAIL_MISSING
  | typeof RESEND_EMAIL_MALFORMED
  | typeof RESEND_UNAVAILABLE;

const RESEND_ERROR: Record<ResendRefusal, string> = {
  [RESEND_EMAIL_MISSING]:
    "Enter the email you used when you bought. Nothing was sent.",
  [RESEND_EMAIL_MALFORMED]:
    "That does not look like an email address, so there is nowhere to send anything. Check it and try again.",
  [RESEND_UNAVAILABLE]:
    "We could not look this up just now, so nothing was sent. This says nothing about your order — try again in a moment.",
};

/**
 * La **sola** risposta positiva, e l'unica frase che questa funzione restituisce
 * quando l'indirizzo era ben formato.
 *
 * Identica che esistano o meno ordini per quell'indirizzo, e identica anche
 * quando il freno ha impedito l'invio: vedi il docblock qui sotto.
 */
const RESEND_ACKNOWLEDGEMENT =
  "If that address has tickets with us, we have just sent them again. Check your spam folder too.";

type ResendResult =
  | { success: true; message: string }
  | { success: false; refusal: ResendRefusal; error: string };

/**
 * Rimanda i biglietti degli ordini comprati con un certo indirizzo.
 *
 * `BUY-04` — *i biglietti si ritrovano senza login*. Il precedente in albero e'
 * il ritrovamento dei token drink da ospite: credenziale piu' indirizzo, nessuna
 * sessione. Qui la credenziale e' l'indirizzo stesso, perche' chi ha perso il
 * link non ha piu' nient'altro.
 *
 * ── PERCHE' LA RISPOSTA E' SEMPRE LA STESSA ─────────────────────────────────
 *
 * **Questo e' un endpoint di verifica in senso stretto**: dato un identificativo
 * — un indirizzo di posta — puo' dire se esiste fra i nostri clienti. Una
 * risposta che distinguesse *«rimandati»* da *«non ho trovato niente»* sarebbe un
 * **oracolo sugli acquirenti**, interrogabile senza costo.
 *
 * E senza costo e' letterale: **il repository non ha rate limiting** — nessuna
 * dipendenza, nessuna implementazione (`access-gating.md`, gate *nessun rate
 * limiting, oggi*). Quel gate chiede che l'assenza sia **dichiarata per
 * iscritto** invece che risolta qui, perche' introdurre un meccanismo di
 * limitazione e' una decisione di architettura per tutto il prodotto. Questa e'
 * la dichiarazione, e la risposta indistinguibile e' cio' che toglie all'endpoint
 * il valore di oracolo **in assenza** di quel meccanismo.
 *
 * Le tre cause che invece si distinguono — indirizzo assente, indirizzo
 * malformato, lettura non riuscita — **non dicono nulla su chi ha comprato**: le
 * prime due parlano di cio' che il chiamante ha appena digitato, la terza di noi.
 * Nessuna delle tre cambia risposta a seconda che l'indirizzo esista.
 *
 * ── IL FRENO SUGLI INVII RIPETUTI NON E' UN CONTROLLO DI SICUREZZA ─────────
 *
 * E' un **freno all'abuso di posta**, e va chiamato cosi'. Non protegge nessun
 * dato: impedisce che qualcuno usi questa funzione per riempire di messaggi la
 * casella di un altro. Si conta dal registro delle consegne, che porta gia' la
 * data di ogni invio, quindi non introduce stato nuovo.
 *
 * **Quando il freno scatta, la risposta e' identica a quella di un invio
 * riuscito.** Se dicesse *«hai gia' chiesto troppe volte»* ricostruirebbe da solo
 * l'oracolo che la frase unica esiste per togliere: quella risposta si
 * otterrebbe **solo** da un indirizzo che ha ordini. Il freno e' osservabile da
 * noi, in una riga di log con la sua categoria, e da nessun altro.
 *
 * ── E OGNI INVIO PASSA DAL REGISTRO ────────────────────────────────────────
 *
 * Non e' una mail nuova: e' **la stessa** mail dell'ordine, spedita dallo stesso
 * modulo, con la stessa categoria. Una mail nuova che non si registra sarebbe il
 * buco vecchio riaperto in un posto nuovo — e questa fase esiste anche per non
 * riaprirlo.
 *
 * L'invio e' marcato `trigger: "requested"`, che salta la guardia contro il
 * secondo invio di `sendOrderConfirmation`. Quella guardia protegge da una
 * duplicazione accidentale fra percorsi automatici; rispondere *«ti e' gia'
 * arrivata»* a chi sta dicendo di non averla ricevuta trasformerebbe questa
 * funzione in un pulsante che non fa niente.
 *
 * @returns una frase sola quando l'indirizzo era leggibile — qualunque cosa sia
 * successa dietro — oppure un rifiuto che parla dell'input o di noi.
 */
export async function resendOrderTickets(input: {
  email: string;
}): Promise<ResendResult> {
  // Stessa normalizzazione dell'acquisto, e per la stessa ragione: due
  // convenzioni diverse sullo stesso indirizzo sono due persone diverse, e qui
  // sarebbero una ricerca che non trova gli ordini di chi li ha comprati.
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";

  if (!email) {
    return {
      success: false,
      refusal: RESEND_EMAIL_MISSING,
      error: RESEND_ERROR[RESEND_EMAIL_MISSING],
    };
  }
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_SHAPE.test(email)) {
    return {
      success: false,
      refusal: RESEND_EMAIL_MALFORMED,
      error: RESEND_ERROR[RESEND_EMAIL_MALFORMED],
    };
  }

  const serviceClient = getServiceClient();

  const since = new Date(
    Date.now() - RESEND_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  // Solo `id`. Non serve altro, e cio' che non si legge non si puo' stampare
  // ne' registrare per sbaglio.
  const { data: orders, error: ordersError } = await serviceClient
    .from("ticket_orders")
    .select("id")
    .eq("buyer_email", email)
    .eq("status", "completed")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(RESEND_MAX_ORDERS + 1);

  if (ordersError) {
    // Distinguibile, e sicura da distinguere: una lettura fallita e' uno stato
    // NOSTRO e si verifica identica su un indirizzo che non esiste.
    console.error(
      `[tickets.order_resend_unreadable] ${redactDbError(ordersError)}`
    );
    return {
      success: false,
      refusal: RESEND_UNAVAILABLE,
      error: RESEND_ERROR[RESEND_UNAVAILABLE],
    };
  }

  const found = orders ?? [];
  if (found.length > RESEND_MAX_ORDERS) {
    // La troncatura si dice. Un tetto silenzioso e' un pezzo di comportamento
    // che nessuno ritrova quando qualcuno segnala «me ne mancano due».
    console.warn(
      `[tickets.order_resend_truncated] oltre ${RESEND_MAX_ORDERS} ordini nella finestra; rimandati i piu' recenti`
    );
  }
  const selected = found.slice(0, RESEND_MAX_ORDERS);

  if (selected.length > 0) {
    const orderIds = selected.map((order) => order.id);

    // ── Il freno, contato dal registro ────────────────────────────────────────
    //
    // Il registro attacca la riga al PRIMO biglietto di un ordine (49-05), quindi
    // si contano le righe di questa categoria su qualunque biglietto di questi
    // ordini dentro la finestra breve.
    let throttled = false;
    const { data: ticketRows, error: ticketsError } = await serviceClient
      .from("tickets")
      .select("id")
      .in("order_id", orderIds);

    if (ticketsError) {
      console.error(
        `[tickets.order_resend_tickets_unreadable] ${redactDbError(ticketsError)}`
      );
    } else if ((ticketRows?.length ?? 0) > 0) {
      const throttleSince = new Date(
        Date.now() - RESEND_THROTTLE_MINUTES * 60 * 1000
      ).toISOString();
      const { count, error: ledgerError } = await serviceClient
        .from("email_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("category", ORDER_CONFIRMATION_CATEGORY)
        .in(
          "ticket_id",
          (ticketRows ?? []).map((row) => row.id)
        )
        .gte("created_at", throttleSince);

      if (ledgerError) {
        // **Si prosegue.** Stessa direzione, e stessa ragione, della guardia
        // dentro `sendOrderConfirmation`: fra un duplicato e un silenzio, su un
        // messaggio che porta l'unica copia di un biglietto, il duplicato e' il
        // modo giusto di sbagliare. Il freno e' contro il fastidio, il silenzio
        // e' contro una persona alla porta.
        console.error(
          `[tickets.order_resend_ledger_unreadable] ${redactDbError(ledgerError)}`
        );
      } else if ((count ?? 0) >= RESEND_THROTTLE_MAX) {
        throttled = true;
        console.warn(
          `[tickets.order_resend_throttled] ${count} invii negli ultimi ` +
            `${RESEND_THROTTLE_MINUTES} minuti: nessun invio nuovo`
        );
      }
    }

    if (!throttled) {
      // In sequenza e non in parallelo: una richiesta sola non deve diventare una
      // raffica verso il fornitore di posta.
      for (const orderId of orderIds) {
        const outcome = await sendOrderConfirmation({
          orderId,
          serviceClient,
          trigger: "requested",
        });
        if (!outcome.sent) {
          // `sendOrderConfirmation` non solleva mai e porta gia' la sua causa
          // distinta. Qui si registra solo che era un invio CHIESTO, che e'
          // l'unica informazione che quel modulo non ha.
          console.error(
            `[tickets.order_resend_not_sent] order=${orderId} reason=${outcome.reason}`
          );
        }
      }
    }
  }

  // ── L'unica uscita positiva ───────────────────────────────────────────────
  //
  // Un solo `return`, raggiunto identico dai tre cammini — nessun ordine, ordini
  // rimandati, freno scattato. Non e' una scelta di stile: e' la proprieta'.
  return { success: true, message: RESEND_ACKNOWLEDGEMENT };
}
