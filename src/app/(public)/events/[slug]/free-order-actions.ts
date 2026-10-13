"use server";

import { getServiceClient } from "@/lib/supabase/service";
import { redactDbError } from "@/lib/errors/redact";
import {
  buildOrderQuote,
  type OrderQuoteRefusal,
} from "@/lib/tickets/order-quote";
import {
  EMAIL_MAX_LENGTH,
  EMAIL_SHAPE,
  FULL_NAME_MAX_LENGTH,
  normalizeBuyerEmail,
  normalizeBuyerName,
} from "@/lib/tickets/buyer-input";
import { resolveGuestIdentity } from "@/lib/tickets/guest-identity";
import { reduceEntrySource } from "@/lib/tickets/entry-source";
import { sendOrderConfirmation } from "@/lib/tickets/order-confirmation";
import { revealPartyVenueForOrder } from "@/lib/venue-reveal/reveal-party-venue";
import { SENZA_INDIRIZZO } from "@/lib/venue-reveal/order-reveal-outcome";
import {
  hasRevealFired,
  isNightSecret,
} from "@/lib/venue-reveal/venue-disclosure";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * free-order-actions.ts — la prenotazione di un tier a 0 € su una serata con
 * biglietti, che e' un ordine come gli altri con un totale di zero.
 *
 * Fase 52.4 (D-52.4-01, MIX-02): non esiste piu' la «serata gratuita su
 * prenotazione». Esiste la serata `paid`, che puo' avere tier a pagamento e
 * tier a 0 € insieme; questa e' la cassa a totale zero, **indirizzata per
 * tier**. La stessa persona puo' prenotare un gratuito e poi comprare un
 * pagante: e' il perimetro dichiarato di BUY-02, e il tetto per identita' qui
 * sotto non lo tocca, perche' conta solo i biglietti **dello stesso tier
 * gratuito** (`FREE_TIER_MAX_PER_IDENTITY`, revisione 52.4 CR-01).
 *
 * Parole del proprietario, `D-50-18`: *«dev'essere uguale a comprare un ticket
 * ma senza acquisto»*. Quindi **niente di nuovo** dove qualcosa esiste gia': lo
 * stesso preventivo del percorso pagato, la stessa funzione d'identita', la
 * stessa riga d'ordine, la stessa RPC che emette i biglietti, la stessa mail
 * con QR e link firmato, la stessa porta. Cio' che questo file aggiunge e' una
 * **sequenza sincrona** che chiama quei pezzi senza passare dal fornitore di
 * pagamento — perche' non c'e' niente da pagare.
 *
 * ── IL CLIENT DI SERVIZIO, GIUSTIFICATO — `access-gating.md`, gate *service role*
 *
 * `public.reserve_ticket_order` e' `SECURITY DEFINER` ed e' concessa **al solo
 * `service_role`** (`20260905120100:308-311`). Questa azione la chiama dal
 * client di servizio, ed e' l'unica strada ammessa: concederla ad `anon` o ad
 * `authenticated` per far funzionare un percorso pubblico sarebbe la primitiva
 * di escalation che `20260905150000_reserve_ticket_service_only.sql` **e'
 * esistita per togliere**. Un permesso tolto una volta non si rimette per
 * comodita' di un percorso nuovo.
 *
 * L'input non fidato e' lo stesso del modulo gemello — quattro valori digitati
 * o scelti dal browser — e riceve lo stesso trattamento: normalizzazione,
 * tetti, forma, nessuna query composta per concatenazione, e **ogni decisione
 * riletta dal database** invece che dedotta dalla superficie.
 *
 * ── QUESTA E' UNA SUPERFICIE ESPOSTA, E NON C'E' UN LIMITATORE ─────────────
 *
 * Una Server Action e' **un endpoint pubblico con una firma comoda**
 * (`nextjs-architecture.md`). Questa non chiede chi sta chiamando — e' il suo
 * scopo, `D-50-20`: un solo percorso per tutti, con o senza sessione.
 *
 * **Il repository non ha rate limiting**: nessuna dipendenza, nessuna
 * implementazione (`access-gating.md`, gate *nessun rate limiting, oggi*).
 * Detto qui perche' su questo percorso pesa piu' che sull'altro: sul percorso
 * pagato il freno e' la carta: chi vuole mille biglietti paga mille biglietti.
 * Qui quel freno non c'e', e le difese sono tre:
 *
 *   1. **il tetto per ordine** — `event_parties.max_tickets_per_order`, 6 per
 *      default (`D-50-26`) — applicato dentro la transazione della RPC;
 *   2. **la capienza del livello**, nella stessa transazione, che e' l'unico
 *      posto dove regge sotto concorrenza;
 *   3. **il tetto per identita' sul tier gratuito** — dal 2026-10-13 (revisione
 *      52.4, CR-01, fix approvato dal proprietario): la stessa identita' non
 *      tiene piu' di `FREE_TIER_MAX_PER_IDENTITY` biglietti dello stesso tier
 *      gratuito su questa serata. Prima di questa data **la chiamata successiva
 *      non aveva freno**: sei posti per chiamata, all'infinito, con la stessa
 *      mail.
 *
 * **Cosa resta aperto, dichiarato e non risolto qui:** il tetto e' per
 * *identita'*, cioe' per indirizzo. Indirizzi inventati restano ognuno una
 * identita' nuova — un account `attendee` coniato e una mail spedita a
 * chiamata — e nessun freno per IP o per mittente esiste in questo repository.
 * Il rate limiting di questa action e' una **decisione separata del
 * proprietario, non ancora presa**: e' una superficie dichiarata (T-50-17,
 * revisione 52.4 CR-01), non un fatto risolto. Un perimetro dichiarato e'
 * l'opposto di un buco scoperto dopo, ma resta un perimetro.
 *
 * ── LE QUINDICI CAUSE, E PERCHE' NESSUNA COLLASSA NELL'ALTRA ───────────────
 *
 * Questo progetto **non ha error tracking** (`meta-gates.md`, verificato): una
 * riga di log non raggiunge nessun essere umano da sola, quindi la sola
 * diagnosi che esistera' e' **la frase che la persona legge**. Il precedente
 * contrario e' registrato in questo progetto: il form della newsletter risponde
 * con **una frase generica sola** — la stessa per la rete assente, per la
 * chiave mancante e per l'indirizzo gia' iscritto — e rende quei tre casi
 * indistinguibili sia per chi legge sia per chi ripara.
 *
 *   - `free_email_missing`    — il campo dell'indirizzo e' vuoto
 *   - `free_email_malformed`  — c'e' scritto qualcosa che non e' un indirizzo
 *   - `free_name_missing`     — il campo del nome e' vuoto
 *   - `free_name_too_long`    — il nome supera il tetto dichiarato
 *   - `free_unreadable`       — una lettura non ha risposto: **non e' un no**
 *   - `free_night_not_ticketed` — la serata non esiste o non ha biglietti (non `paid`)
 *   - `free_night_sold_elsewhere` — la serata la vende un terzo: niente cassa nostra
 *   - `free_tier_not_found`   — il tier non esiste o non e' di quella serata
 *   - `free_tier_not_free`    — il tier non e' a 0 €, o il preventivo non e' a zero
 *   - `free_order_not_saved`  — la riga d'ordine non si e' scritta
 *   - `free_identity_failed`  — l'account non si e' potuto trovare ne' coniare
 *   - `free_buyer_not_attached` — l'ordine non si e' potuto legare al conto
 *   - `free_mint_failed`      — la RPC ha rifiutato: tetto, capienza, o altro
 *   - `free_already_reserved` — questa identita' tiene gia' il massimo dei
 *                               biglietti di questo tier gratuito (CR-01)
 *   - `free_holdings_unreadable` — il conteggio dei biglietti gia' tenuti non
 *                               ha risposto: **non e' un no**, e non e' nemmeno
 *                               `free_unreadable`, perche' arriva DOPO che la
 *                               riga d'ordine esiste e la marca `failed`
 *
 * `free_unreadable` e' il terzo membro obbligatorio (`money-path.ts`, §4): *la
 * domanda non ha avuto risposta* non si fonde mai con *no*.
 *
 * ── COSA QUESTO FILE NON FA ────────────────────────────────────────────────
 *
 *   - **non crea livelli di biglietto.** Prenota il tier che il chiamante
 *     nomina, se e' a 0 € e appartiene alla serata. Un percorso pubblico che
 *     conia un livello sarebbe una **seconda strada verso l'emissione**, dentro
 *     un percorso concorrente;
 *   - **non controlla la capienza della serata** (D-52.4-06): e' un conteggio
 *     in pagina, e i gratuiti ci contano perche' sono righe `tickets`. La cassa
 *     si ferma sul massimo del tier e su `sold_out`, come per i paganti;
 *   - **non tocca il fornitore di pagamento** e non apre nessun checkout;
 *   - **non scrive niente su `tickets`**: i biglietti li fa la RPC, in una
 *     transazione, e l'etichetta del portatore resta un progressivo — il nome
 *     raccolto qui **non arriva alla porta** (`D-49-03`, `D-50-18b`);
 *   - **non scrive su `public.rsvps`**: lo storico resta in sola lettura
 *     (`D-50-22`);
 *   - **non decide da solo se rivelare il luogo.** Dal 2026-10-13 (revisione
 *     52.4, WR-01; D-52.4-07, decisione del proprietario: «stessa funzione e
 *     stesso scope anche nel ramo gratuito») chi prenota DOPO che la
 *     rivelazione della serata e' scattata riceve l'indirizzo per mail come
 *     chi paga: la stessa `revealPartyVenueForOrder`, ristretta agli id di
 *     QUESTO ordine, con la stessa tabella `SENZA_INDIRIZZO` del webhook. La
 *     decisione resta in `venue-disclosure.ts`, la spedizione in
 *     `reveal-party-venue.ts`; qui non c'e' nessun confronto sul luogo, e la
 *     guardia per serata non compare in nessun ramo.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * Le cause
 * ──────────────────────────────────────────────────────────────────────────── */

const FREE_EMAIL_MISSING = "free_email_missing";
const FREE_EMAIL_MALFORMED = "free_email_malformed";
const FREE_NAME_MISSING = "free_name_missing";
const FREE_NAME_TOO_LONG = "free_name_too_long";
const FREE_UNREADABLE = "free_unreadable";
const FREE_NIGHT_NOT_TICKETED = "free_night_not_ticketed";
const FREE_NIGHT_SOLD_ELSEWHERE = "free_night_sold_elsewhere";
const FREE_TIER_NOT_FOUND = "free_tier_not_found";
const FREE_TIER_NOT_FREE = "free_tier_not_free";
const FREE_ORDER_NOT_SAVED = "free_order_not_saved";
const FREE_IDENTITY_FAILED = "free_identity_failed";
const FREE_BUYER_NOT_ATTACHED = "free_buyer_not_attached";
const FREE_MINT_FAILED = "free_mint_failed";
const FREE_ALREADY_RESERVED = "free_already_reserved";
const FREE_HOLDINGS_UNREADABLE = "free_holdings_unreadable";

/**
 * Quanti biglietti dello STESSO tier gratuito una stessa identita' puo' tenere
 * su una serata — revisione 52.4, CR-01, fix approvato dal proprietario il
 * 2026-10-13.
 *
 * **Sei, ed e' il tetto per ordine** (`event_parties.max_tickets_per_order`,
 * default `D-50-26`): la persona che prima poteva fare UNA prenotazione da sei
 * puo' ancora farla; quella che ne faceva cento da sei con la stessa mail no.
 *
 * **Perche' non cambia il perimetro di BUY-02.** BUY-02 dice che la stessa
 * persona puo' prenotare un gratuito e poi comprare un pagante. Il conteggio e'
 * filtrato per `tier_id`, e un pagante e' per costruzione un altro tier: i
 * biglietti comprati non entrano mai nel conto, e questo tetto non ferma mai
 * un acquisto. Non e' nemmeno `already_has_night_ticket` di `purchaseTicket`,
 * che e' per serata: qui due prenotazioni dello stesso gratuito restano
 * possibili finche' la somma sta sotto il tetto.
 *
 * **Cosa non copre**, scritto per non farlo credere: indirizzi diversi sono
 * identita' diverse. Il freno per IP o per mittente e' una decisione separata,
 * non presa — vedi il docblock in testa al file.
 */
const FREE_TIER_MAX_PER_IDENTITY = 6;

type FreeOrderOwnRefusal =
  | typeof FREE_EMAIL_MISSING
  | typeof FREE_EMAIL_MALFORMED
  | typeof FREE_NAME_MISSING
  | typeof FREE_NAME_TOO_LONG
  | typeof FREE_UNREADABLE
  | typeof FREE_NIGHT_NOT_TICKETED
  | typeof FREE_NIGHT_SOLD_ELSEWHERE
  | typeof FREE_TIER_NOT_FOUND
  | typeof FREE_TIER_NOT_FREE
  | typeof FREE_ORDER_NOT_SAVED
  | typeof FREE_IDENTITY_FAILED
  | typeof FREE_BUYER_NOT_ATTACHED
  | typeof FREE_MINT_FAILED
  | typeof FREE_ALREADY_RESERVED
  | typeof FREE_HOLDINGS_UNREADABLE;

/**
 * Le cause proprie di questa superficie, piu' quelle del preventivo, che
 * viaggiano **intatte**: chi prenota deve poter distinguere *scegli di meno* da
 * *riprova*, ed e' la distinzione che il preventivo esiste per produrre.
 */
type FreeOrderRefusal = FreeOrderOwnRefusal | OrderQuoteRefusal;

/**
 * Una frase per causa. `Record` **totale** sull'unione propria: una causa
 * aggiunta senza la sua frase e' un errore di `npm run build`, che in un
 * repository senza test runner e' l'unico cancello automatico che esiste.
 *
 * Le frasi non nominano una riga, un id o una persona, e **nessuna mette una
 * formula generica al posto della causa**: dicono quale passo non e' andato,
 * perche' e' l'unica cosa che permetterebbe di ritrovare la riga di log
 * corrispondente se qualcuno ci scrivesse.
 */
const FREE_ORDER_ERROR: Record<FreeOrderOwnRefusal, string> = {
  [FREE_EMAIL_MISSING]:
    "Enter the email where your tickets should go. Nothing was booked.",
  [FREE_EMAIL_MALFORMED]:
    "That email does not look like an email, so your tickets would have nowhere to go. Check it and try again.",
  [FREE_NAME_MISSING]:
    "Enter your name — it goes on the account these tickets belong to, never on the tickets themselves.",
  [FREE_NAME_TOO_LONG]: `Names here stop at ${FULL_NAME_MAX_LENGTH} characters. Shorten it and try again.`,
  [FREE_UNREADABLE]:
    "We could not check this night just now, so nothing was booked. This is not a refusal — please try again in a moment.",
  [FREE_NIGHT_NOT_TICKETED]: "This night has no tickets to reserve.",
  // La stessa voce del preventivo (`QUOTE_NIGHT_SOLD_ELSEWHERE`), su una
  // strada che non incassa: «booked» invece di «charged».
  [FREE_NIGHT_SOLD_ELSEWHERE]:
    "Tickets for this night are sold elsewhere, not here. Nothing was booked.",
  [FREE_TIER_NOT_FOUND]: "This ticket type does not belong to this night.",
  [FREE_TIER_NOT_FREE]:
    "This ticket type is not free: pick it and pay instead.",
  [FREE_ORDER_NOT_SAVED]:
    "Your booking could not be saved, so no ticket was issued. Please try again — and if it happens twice, tell us.",
  [FREE_IDENTITY_FAILED]:
    "We could not set up the account your tickets belong to, so no ticket was issued. Please try again — and if it happens twice, tell us.",
  [FREE_BUYER_NOT_ATTACHED]:
    "Your booking could not be linked to your account, so no ticket was issued. Please try again in a moment.",
  [FREE_MINT_FAILED]:
    "Your tickets could not be issued, so nothing is booked. This night may have just filled up, or you asked for more than one booking may hold.",
  [FREE_ALREADY_RESERVED]: `You already hold the free tickets for this night — up to ${FREE_TIER_MAX_PER_IDENTITY} per email. Nothing new was booked, and the tickets you have are still valid.`,
  [FREE_HOLDINGS_UNREADABLE]:
    "We could not check the tickets you already hold, so nothing was booked. This is not a refusal — please try again in a moment.",
};

type FreeOrderResult =
  | {
      success: true;
      orderId: string;
      /** Quanti biglietti la RPC ha emesso davvero, contati sui suoi id. */
      ticketCount: number;
      /**
       * Se la mail e' partita. `false` **non annulla niente**: i biglietti
       * esistono, e chi ha prenotato deve saperlo per non restare ad aspettare
       * un messaggio che non arrivera'.
       */
      emailSent: boolean;
    }
  | { success: false; refusal: FreeOrderRefusal; error: string };

/**
 * L'ordine e' emesso ma chi ha prenotato e' rimasto senza l'indirizzo che gli
 * era dovuto: lo si scrive sulla riga, **senza toccare `status`**, che resta
 * quello chiuso dalla RPC — i biglietti esistono e aprono la porta.
 *
 * E' la stessa forma di `segnaAssenza` nel webhook del pagato (stesso
 * `error_message`, stesso strappo semantico dichiarato li': la superficie dei
 * venduti disegna questi ordini in un insieme separato dai falliti), con una
 * **categoria di log propria** (`tickets.free_order_reveal_*`), perche' chi
 * legge i log deve poter dire da quale strada viene il buco.
 */
async function segnaAssenzaGratuita(
  supabase: SupabaseClient,
  orderId: string,
  cause: string,
  detail: string
): Promise<void> {
  console.error(`[tickets.free_order_${cause}] order=${orderId} ${detail}`);

  const { error } = await supabase
    .from("ticket_orders")
    .update({
      error_message: `${cause}: ${detail}`.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    // Il fallimento del fallimento: nessuna superficie lo mostra, e va detto.
    console.error(
      `[tickets.free_order_reveal_gap_unrecordable] order=${orderId} ${redactDbError(error)}`
    );
  }
}

/** La forma di un uuid, controllata prima di mandarlo a PostgREST. */
const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Prenota uno o piu' biglietti di un tier a 0 € su una serata `paid` — fase
 * 52.4, MIX-02 (prima `REG-06`, sulle serate su RSVP, che non esistono piu').
 *
 * La sequenza e' quella del webhook del percorso pagato, **in sincrono**:
 * preventivo → riga d'ordine → identita' → portatore → conio → mail. L'ordine
 * dei passi non e' estetico: ognuno dipende dal precedente, e il primo che
 * fallisce si ferma li' con la propria causa.
 *
 * **Chiamarla due volte con lo stesso indirizzo crea due prenotazioni finche'
 * la somma resta sotto `FREE_TIER_MAX_PER_IDENTITY`**: sono due ordini
 * distinti, e oltre il tetto per identita' la seconda si ferma con
 * `free_already_reserved` (revisione 52.4, CR-01, 2026-10-13). Cio' che non
 * deve accadere e' che **lo stesso ordine** emetta biglietti due volte — e
 * quello lo impedisce il ramo idempotente della RPC, che esce senza inserire su
 * un ordine gia' chiuso.
 *
 * Il conteggio e' una lettura prima della RPC, non un vincolo dentro la sua
 * transazione: due chiamate simultanee con la stessa mail possono passarlo
 * entrambe. Il danno massimo di quella corsa e' un ordine in piu' per
 * identita', e chiuderla richiederebbe una migration della RPC: non e' stato
 * fatto, ed e' scritto qui per non farlo credere.
 *
 * ── `entry_source` e `checkout_form`, scritti anche qui (revisione 52.4, WR-04)
 *
 * Fino al 2026-10-13 la riga d'ordine gratuita nasceva con entrambe le
 * colonne nulle, e per la loro migration (`20261001120300_order_entry_source.sql`)
 * `NULL` vuol dire **«ordine nato prima di questa colonna»**, mai
 * «sconosciuto»: un ordine scritto oggi mentiva al lettore dell'imbuto.
 * Ora porta la sorgente ridotta da `reduceEntrySource` — lo stesso grezzo del
 * link che il ramo pagante riceve — e `checkout_form = 'not_opened'`.
 *
 * **Perche' `not_opened` e' letteralmente vero su un totale zero, e non un
 * valore di comodo:** la colonna dice se il modulo di pagamento e' stato
 * mostrato. Su questa strada **nessun modulo di pagamento esiste**, quindi non
 * e' mai stato aperto e non lo sara' mai: `opened` lo scrive solo
 * `markCheckoutFormOpened`, firmato e condizionato a un checkout, che qui non
 * c'e'. Il valore e' gia' ammesso dal `CHECK` della migration: nessuna
 * migration nuova, e il `COMMENT` della colonna non e' stato toccato — la
 * precisazione vive qui, nel codice che la scrive.
 *
 * @returns l'id dell'ordine e quanti biglietti sono nati, oppure un rifiuto con
 * la sua causa.
 */
export async function reserveFreeTickets(input: {
  partyId: string;
  tierId: string;
  quantity: number;
  email: string;
  fullName: string;
  /**
   * Il `utm_source` grezzo del link d'ingresso, letto nel browser
   * (`entry-source-capture.ts`), come sul ramo pagante. Facoltativo: assente
   * → `direct`. Non si salva mai cosi' com'e' — vedi `reduceEntrySource`.
   */
  entrySource?: string | null;
}): Promise<FreeOrderResult> {
  const refuse = (
    refusal: FreeOrderOwnRefusal,
    detail: string
  ): FreeOrderResult => {
    console.error(`[tickets.${refusal}] ${detail}`);
    return { success: false, refusal, error: FREE_ORDER_ERROR[refusal] };
  };

  // ── 1. Indirizzo e nome, con le stesse regole del modulo a pagamento ───────
  //
  // Le costanti arrivano da `buyer-input`, che e' la loro unica casa: due copie
  // degli stessi numeri sarebbero due verita' che divergono al primo che ne
  // corregge una.
  const email = normalizeBuyerEmail(input.email);
  const fullName = normalizeBuyerName(input.fullName);

  if (!email) return refuse(FREE_EMAIL_MISSING, "indirizzo assente o vuoto");
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_SHAPE.test(email)) {
    return refuse(FREE_EMAIL_MALFORMED, "indirizzo fuori forma o fuori tetto");
  }
  if (!fullName) return refuse(FREE_NAME_MISSING, "nome assente o vuoto");
  if (fullName.length > FULL_NAME_MAX_LENGTH) {
    return refuse(
      FREE_NAME_TOO_LONG,
      `nome di ${fullName.length} caratteri, tetto ${FULL_NAME_MAX_LENGTH}`
    );
  }

  if (typeof input.partyId !== "string" || !UUID_SHAPE.test(input.partyId)) {
    // Un id fuori forma diventerebbe un `22P02` alla prima lettura, e quel
    // fallimento cadrebbe nel ramo *non si e' potuto rispondere* — che dice
    // «riprova fra un momento» per una cosa che non funzionera' mai.
    return refuse(FREE_NIGHT_NOT_TICKETED, "identificativo di serata fuori forma");
  }
  if (typeof input.tierId !== "string" || !UUID_SHAPE.test(input.tierId)) {
    // Stessa ragione: un `22P02` non e' un «riprova».
    return refuse(FREE_TIER_NOT_FOUND, "identificativo di tier fuori forma");
  }
  const partyId = input.partyId;
  const tierId = input.tierId;

  const serviceClient = getServiceClient();

  // ── 2. La serata, riletta dal database ────────────────────────────────────
  //
  // Solo una serata con biglietti (`paid`) prende prenotazioni a 0 €, e solo se
  // la vendiamo noi: una serata venduta da un terzo (`external_tickets_seller`)
  // non ha cassa nostra, nemmeno a totale zero (MIX-03, T-52.4-11). Il
  // controllo e' autoritativo qui, non dedotto dalla superficie.
  // Nessuna colonna del luogo in questa `select`: una colonna che non si legge
  // non si puo' stampare (`venue-secrecy.md`, gate *default chiuso*).
  const { data: party, error: partyError } = await serviceClient
    .from("event_parties")
    .select("id, access_type, external_tickets_seller")
    .eq("id", partyId)
    .maybeSingle();

  if (partyError) {
    return refuse(
      FREE_UNREADABLE,
      `lettura della serata non riuscita: ${redactDbError(partyError)}`
    );
  }
  if (!party) {
    return refuse(FREE_NIGHT_NOT_TICKETED, `serata ${partyId} inesistente`);
  }
  if (party.access_type !== "paid") {
    return refuse(
      FREE_NIGHT_NOT_TICKETED,
      `serata ${partyId} e' ${party.access_type}: non ha biglietti da prenotare`
    );
  }
  if (party.external_tickets_seller !== null) {
    return refuse(
      FREE_NIGHT_SOLD_ELSEWHERE,
      `serata ${partyId} venduta da un terzo: niente prenotazione a 0 €`
    );
  }

  // ── 3. Il tier, letto PER ID, che NON si crea da qui ──────────────────────
  //
  // Il chiamante nomina il tier; il database dice se e' di questa serata e se e'
  // a 0 €. Un id di un tier a pagamento scritto a mano qui darebbe un biglietto
  // gratis di un tier pagante (T-52.4-10): per questo il prezzo si rilegge, e il
  // totale del preventivo e' la terza guardia.
  const { data: tier, error: tierError } = await serviceClient
    .from("ticket_tiers")
    .select("id, price, party_id")
    .eq("id", tierId)
    .maybeSingle();

  if (tierError) {
    return refuse(
      FREE_UNREADABLE,
      `lettura del tier non riuscita: ${redactDbError(tierError)}`
    );
  }
  if (!tier || tier.party_id !== partyId) {
    return refuse(
      FREE_TIER_NOT_FOUND,
      `tier ${tierId} ${tier ? `di un'altra serata (${tier.party_id})` : "inesistente"}, chiesto su ${partyId}`
    );
  }
  if (Number(tier.price) !== 0) {
    return refuse(
      FREE_TIER_NOT_FREE,
      `tier ${tierId} a ${tier.price}: si compra, non si prenota`
    );
  }

  // ── 4. Il preventivo, lo STESSO del percorso pagato ───────────────────────
  //
  // Tetto per ordine, chiusura a fine serata − 2 h salvo `expires_at`, massimo
  // del tier, `sold_out`, catalogo, pubblicazione dell'evento: identici a zero
  // euro, e ogni loro rifiuto viaggia intatto. Nessuna capienza di serata
  // (D-52.4-06).
  // `goesToPaymentProvider: false` salta **una sola** riga, quella del minimo
  // di una carta — senza, un ordine gratuito verrebbe rifiutato per non aver
  // raggiunto il minimo di un pagamento che nessuno sta facendo.
  const quoted = await buildOrderQuote(serviceClient, {
    partyId,
    tierId: tier.id,
    quantity: input.quantity,
    discountCodeId: null,
    goesToPaymentProvider: false,
  });

  if (!quoted.ok) {
    console.error(`[tickets.free_quote_${quoted.refusal}] serata ${partyId}`);
    return { success: false, refusal: quoted.refusal, error: quoted.error };
  }

  const quote = quoted.quote;

  if (quote.totalAmount !== 0) {
    // Il terzo dei tre controlli indipendenti — serata con biglietti nostra,
    // tier a zero, totale a zero (T-52.4-10). Nessuno e' dedotto dagli altri.
    return refuse(
      FREE_TIER_NOT_FREE,
      `preventivo a ${quote.totalAmount} su un percorso che non incassa`
    );
  }

  // ── 5. La riga d'ordine ───────────────────────────────────────────────────
  const orderId = crypto.randomUUID();

  // La sorgente d'ingresso (DBT-15, D-52.1-20; WR-04): il grezzo arriva dal
  // browser, si riduce a cinque parole e si butta — non si salva e non si logga
  // (gate PII di `comms-analytics.md`).
  const entry_source = reduceEntrySource(input.entrySource);

  const { error: insertError } = await serviceClient
    .from("ticket_orders")
    .insert({
      id: orderId,
      event_id: quote.eventId,
      party_id: quote.partyId,
      tier_id: quote.tierId,
      user_id: null,
      buyer_email: email,
      // Il nome va all'account, e questa e' la sua casa di passaggio. **Non va
      // sul biglietto**: l'etichetta del portatore resta un progressivo.
      buyer_name: fullName,
      quantity: quote.quantity,
      // Nessun checkout, perche' nessuno paga. **Nullo e non un valore
      // sintetico**: un valore finto supererebbe il `continue` del cron di
      // riconciliazione, che ogni giorno interrogherebbe il fornitore per un
      // checkout che non esiste — una volta per ogni biglietto gratuito mai
      // emesso.
      sumup_checkout_id: null,
      total_amount: 0,
      discount_code_id: null,
      // **`pending`, e non lo stato chiuso.** Misurato in `50-RESEARCH.md`
      // §0/C7: un ordine che nascesse gia' chiuso cadrebbe nel ramo idempotente
      // della RPC (`20260905120100:77-84`), che esce restituendo l'insieme
      // vuoto **senza errore** — zero biglietti, nessun avviso, e una riga che
      // dice di essere a posto. E' precisamente cio' che `meta-gates.md` chiama
      // fallimento silenzioso. La lettera di `D-50-19` e' sbagliata, la sua
      // intenzione no: lo stato lo chiude la RPC, emettendo.
      status: "pending",
      entry_source,
      // Nessun modulo di pagamento esiste su un totale zero: `not_opened` e'
      // vero ora e per sempre (vedi il docblock della action, WR-04).
      checkout_form: "not_opened",
    });

  if (insertError) {
    // `redactDbError` e non l'oggetto: su una violazione di vincolo PostgREST
    // restituisce **la riga rifiutata** dentro `details`, e una riga di questo
    // prodotto puo' portare una credenziale della porta.
    return refuse(
      FREE_ORDER_NOT_SAVED,
      `ordine ${orderId}: ${redactDbError(insertError)}`
    );
  }

  /**
   * Da qui in poi la riga esiste, quindi un fallimento **si scrive sulla riga**
   * e non solo in un log: questo progetto non ha error tracking, e uno stato
   * lasciato `pending` per sempre e' indistinguibile da una prenotazione in
   * corso. La causa entra in `error_message`, dove la superficie dei venduti la
   * disegna — la stessa forma del `failOrder` del webhook.
   *
   * E un ordine gratuito portato a `failed` **non finisce nel rigioco del
   * pagato**: quel cron considera solo gli ordini che un checkout ce l'hanno, e
   * la funzione che rigioca ha una guardia propria.
   */
  const failOrder = async (cause: FreeOrderOwnRefusal, detail: string) => {
    const { error: markError } = await serviceClient
      .from("ticket_orders")
      .update({
        error_message: `${cause}: ${detail}`.slice(0, 500),
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (markError) {
      console.error(
        `[tickets.free_order_mark_failed] ordine ${orderId} non si e' potuto marcare: ${redactDbError(markError)}`
      );
    }
    return refuse(cause, `ordine ${orderId}: ${detail}`);
  };

  // ── 6. L'identita' ────────────────────────────────────────────────────────
  //
  // Cerca prima, conia dopo, e rilegge se la creazione fallisce. Il nome entra
  // **solo** se il conto nasce adesso: su un conto che esiste gia' non si
  // scrive niente, e la ragione sta in quel file.
  const identity = await resolveGuestIdentity(serviceClient, email, fullName);
  if (!identity.ok) {
    // La causa della funzione si conserva: e' la sola diagnosi che esistera'.
    return failOrder(
      FREE_IDENTITY_FAILED,
      `${identity.reason} — ${identity.detail}`
    );
  }

  // ── 6b. Il tetto per identita' sul tier gratuito (CR-01) ──────────────────
  //
  // Dopo l'identita', perche' e' l'identita' che si conta, e PRIMA di
  // allacciare l'ordine e coniare: un rifiuto qui non lascia biglietti. Conta i
  // biglietti di questa serata, di questa persona, di QUESTO tier — mai quelli
  // di un tier pagante, quindi BUY-02 resta intatto. Client di servizio: la
  // lettura non deve dipendere dalla RLS di chi chiama, che qui non ha sessione.
  const { count: alreadyHeld, error: heldError } = await serviceClient
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("party_id", partyId)
    .eq("user_id", identity.userId)
    .eq("tier_id", tier.id);

  if (heldError) {
    // Non e' un «no»: e' una domanda senza risposta, con la sua causa.
    return failOrder(
      FREE_HOLDINGS_UNREADABLE,
      `conteggio dei biglietti gia' tenuti non riuscito: ${redactDbError(heldError)}`
    );
  }
  const held = alreadyHeld ?? 0;
  if (held + quote.quantity > FREE_TIER_MAX_PER_IDENTITY) {
    return failOrder(
      FREE_ALREADY_RESERVED,
      `identita' ${identity.userId} tiene gia' ${held} biglietti del tier ${tier.id}, ` +
        `ne chiede ${quote.quantity}, tetto ${FREE_TIER_MAX_PER_IDENTITY}`
    );
  }

  // ── 7. Il portatore, allacciato all'ordine ────────────────────────────────
  //
  // Con il suo rifiuto proprio: senza, il fallimento arriverebbe comunque un
  // passo piu' in la', come «ordine senza portatore», cioe' con il nome di
  // un'altra causa addosso — e manderebbe chi indaga nel posto sbagliato.
  const { error: attachError } = await serviceClient
    .from("ticket_orders")
    .update({ user_id: identity.userId, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (attachError) {
    return failOrder(FREE_BUYER_NOT_ATTACHED, redactDbError(attachError));
  }

  // ── 8. I biglietti: N righe in UNA transazione ────────────────────────────
  //
  // `p_issued_via` vale `free_tier`: e' l'attribuzione, e sta sul **biglietto**
  // (fase 52.4; il valore storico di `issued_via` delle serate su RSVP resta sui biglietti gia' emessi). La
  // colonna e' testo nudo con default, senza `CHECK` da allargare, e la sua
  // migration dichiara che `NULL` significa «scritto prima che la colonna
  // esistesse», mai «acquisto ordinario»: un valore proprio e' il modo corretto
  // di distinguere un biglietto che nessuno ha pagato.
  const { data: mintedIds, error: mintError } = await serviceClient.rpc(
    "reserve_ticket_order",
    { p_order_id: orderId, p_issued_via: "free_tier" }
  );

  if (mintError) {
    // Il messaggio della RPC porta gia' la causa vera — tetto per ordine,
    // capienza del livello — e va conservato **com'e'**: riassumerlo qui
    // significherebbe buttare via la sola diagnosi che esistera'.
    return failOrder(FREE_MINT_FAILED, mintError.message);
  }

  const ticketCount = Array.isArray(mintedIds) ? mintedIds.length : 0;
  if (ticketCount === 0) {
    // Nessun errore e nessun biglietto e' **lo stato che §0/C7 descrive**, e su
    // un ordine nato `pending` un attimo fa non e' spiegabile. Si rifiuta invece
    // di restituire un successo vuoto: un successo senza biglietti e' la forma
    // peggiore del fallimento silenzioso, perche' ha la faccia di un sì.
    return failOrder(
      FREE_MINT_FAILED,
      "la riserva non ha restituito alcun biglietto e non ha sollevato: va guardato a mano"
    );
  }

  // ── 9. La mail, dentro un `try` ───────────────────────────────────────────
  //
  // **Se la mail fallisce i biglietti esistono gia'**, e non si annulla niente:
  // e' il gate *soldi vs contenuto* (`ticketing-payments.md`) su un percorso
  // dove il denaro e' zero ma il bene emesso e' lo stesso. Il fallimento si
  // registra con la sua categoria e **si restituisce comunque il successo**,
  // con `emailSent: false` — cosi' chi ha prenotato sa che deve tenersi il link
  // invece di aspettare un messaggio che non arrivera'. Un fallimento che conta
  // deve avere un effetto **osservabile**, e in questo repository l'unico
  // effetto osservabile e' cio' che la persona legge.
  let emailSent = false;
  try {
    const mail = await sendOrderConfirmation({ orderId, serviceClient });
    emailSent = mail.sent;
    if (!mail.sent) {
      console.error(
        `[tickets.free_order_email_${mail.reason}] ordine ${orderId}: ${mail.detail}`
      );
    }
  } catch (mailError) {
    console.error(
      `[tickets.free_order_email_threw] ordine ${orderId}: ${mailError instanceof Error ? mailError.message : "causa non leggibile"}`
    );
  }

  // ── 10. L'INDIRIZZO, SOLO SE LA RIVELAZIONE E' GIA' SCATTATA ──────────────
  //
  // Revisione 52.4, WR-01 — D-52.4-07: un biglietto gratuito rivela il luogo
  // **esattamente** come uno pagato. Questo blocco e' la copia del passo 6 del
  // webhook (`src/app/api/webhooks/sumup/route.ts`, «L'INDIRIZZO, SOLO SE LA
  // RIVELAZIONE E' GIA' SCATTATA»), con le stesse condizioni e la stessa
  // restrizione. Le ragioni stanno li' e valgono qui parola per parola:
  //
  //   - il caso ORDINARIO e' non fare niente: si prenota prima della finestra,
  //     e la rivelazione arrivera' dal cron per tutti insieme;
  //   - chi prenota DOPO la rivelazione non ha nessun'altra strada per
  //     l'indirizzo se non ha mai scelto una password (`D-49-04`);
  //   - **la guardia per serata non compare in nessun ramo**: e' del cron;
  //   - la spedizione e' ristretta agli id dei biglietti di QUESTO ordine, un
  //     campo obbligatorio di un argomento obbligatorio: nessun altro titolare
  //     della serata puo' essere raggiunto da qui.
  //
  // E come nel webhook **non annulla niente**: i biglietti sono gia' emessi, e
  // un fallimento lascia una traccia sulla riga (`segnaAssenzaGratuita`)
  // invece di trasformare una prenotazione riuscita in un errore.
  try {
    const ticketIdsOrdine = Array.isArray(mintedIds)
      ? (mintedIds as unknown[]).filter(
          (v): v is string => typeof v === "string"
        )
      : [];

    if (ticketIdsOrdine.length === 0) {
      // Senza la lista non si spedisce niente: una chiamata senza restrizione
      // raggiungerebbe tutta la serata.
      await segnaAssenzaGratuita(
        serviceClient,
        orderId,
        "reveal_ids_missing",
        "la riserva non ha restituito gli id dei biglietti"
      );
    } else {
      // La serata, con gli stessi campi che legge il webhook (e il cron). La
      // `select` del passo 2 resta senza colonne del luogo: questa e' una
      // lettura separata, che serve solo a comporre la mail del titolare.
      const { data: serata, error: serataError } = await serviceClient
        .from("event_parties")
        .select(
          "id, title, date, time, venue_secret, venue_reveal_hours, venue_revealed_at, venue_text, event_id, events(title, slug), venues(name, address)"
        )
        .eq("id", partyId)
        .single();

      if (serataError || !serata) {
        // Default chiuso: uno stato non determinabile non spedisce.
        await segnaAssenzaGratuita(
          serviceClient,
          orderId,
          "reveal_night_unreadable",
          serataError ? redactDbError(serataError) : "nessuna riga"
        );
      } else {
        const night = {
          venueSecret: serata.venue_secret,
          partyDate: serata.date,
          partyTime: serata.time,
          venueRevealHours: serata.venue_reveal_hours,
          venueRevealedAt: serata.venue_revealed_at,
        };

        // La decisione, importata e mai riscritta (`venue-disclosure.ts`).
        if (!isNightSecret(night.venueSecret)) {
          // Non dovuto: il luogo sta gia' sulla pagina pubblica.
        } else if (!hasRevealFired(night)) {
          // Non dovuto, e non e' un fallimento: arrivera' dal cron.
        } else {
          const evento = serata.events as unknown as {
            title: string;
            slug: string;
          };
          const luogo = serata.venues as unknown as {
            name: string;
            address: string | null;
          } | null;

          const esito = await revealPartyVenueForOrder(
            serviceClient,
            {
              id: serata.id,
              event_id: serata.event_id,
              title: serata.title,
              date: serata.date,
              time: serata.time,
              venue_text: serata.venue_text,
              event: evento,
              venue: luogo,
            },
            { night, onlyTicketIds: ticketIdsOrdine }
          );

          if (SENZA_INDIRIZZO[esito.failureKind]) {
            await segnaAssenzaGratuita(
              serviceClient,
              orderId,
              `reveal_${esito.failureKind}`,
              `serata ${serata.id}, destinatari ${esito.recipientsTotal}, ` +
                `spediti ${esito.recipientsSent}, ritentabile ${esito.retryOutlook}`
            );
          } else {
            // L'esito si dice anche quando va bene: e' l'unica traccia che una
            // mail d'indirizzo e' partita da questa strada.
            console.info(
              `[tickets.free_order_reveal_${esito.failureKind}] order=${orderId} ` +
                `serata ${serata.id}, spediti ${esito.recipientsSent}/${esito.recipientsTotal}`
            );
          }
        }
      }
    }
  } catch (revealError) {
    await segnaAssenzaGratuita(
      serviceClient,
      orderId,
      "reveal_threw",
      revealError instanceof Error ? revealError.message : String(revealError)
    );
  }

  return { success: true, orderId, ticketCount, emailSent };
}
