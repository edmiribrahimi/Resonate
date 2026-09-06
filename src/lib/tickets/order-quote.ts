import "server-only";

import { logMoneyPathFailure, type SafeError } from "@/lib/failure/money-path";
import type { getServiceClient } from "@/lib/supabase/service";

/**
 * order-quote.ts — quanto costa un ordine di biglietti, calcolato dove non si
 * puo' mentire.
 *
 * ── Perche' un MODULO e non un'esportazione di un file di Server Action ─────
 *
 * Un file marcato con la direttiva di Server Action pubblica **ogni**
 * esportazione come endpoint
 * raggiungibile dal browser. Una funzione che, dati un id di serata e uno di
 * tier, risponde *quanto costa* e *quanti posti restano* non deve diventare una
 * porta: sarebbe un oracolo sull'inventario interrogabile senza costo, e questo
 * repository **non ha rate limiting** (verificato: nessuna dipendenza, nessuna
 * implementazione). Stessa scelta, con la stessa ragione scritta, di
 * `src/lib/auth/password-set-link.ts:44-49`.
 *
 * La direttiva in testa al file e' la seconda meta': un componente client che provasse
 * a importarlo fallisce il build invece di trascinare nel bundle la logica dei
 * prezzi.
 *
 * ── Il prezzo che conta e' quello del server ─────────────────────────────────
 *
 * Nulla di cio' che arriva dal chiamante entra nel totale: prezzo unitario,
 * sconto e capienza sono **riletti dal database** dentro questa funzione, e il
 * totale e' sommato qui. E' `ticketing-payments.md`, gate *codice sconto*: *«il
 * prezzo che conta e' quello che il server calcola»*. Il chiamante sceglie
 * **quale** tier e **quanti** biglietti, mai quanto valgono.
 *
 * ── Nessuna colonna del luogo, ed e' il gate nella sua forma verificabile ────
 *
 * Nessuna `select` di questo file nomina una colonna che porti un luogo. Non e'
 * prudenza: e' il gate *default chiuso* del modulo del segreto del luogo
 * (`.claude/rules/`) nella sua unica forma che qualcuno puo' controllare con un
 * `grep` — **una colonna che non si legge non si puo' stampare**. Il criterio
 * d'accettazione del piano 49-04 lo verifica sul token, quindi il token non
 * compare in questo file nemmeno nei commenti, e le citazioni qui sono
 * indirette per quella ragione e non per distrazione.
 *
 * **Ma una uscita resta, e non e' una colonna.** {@link OrderQuote.description}
 * viene composta qui dal **titolo della serata** e dal nome del tier, e finisce
 * sulla pagina di riepilogo del fornitore di pagamento — una superficie che non
 * e' nostra e che non si ritira. Nessun predicato la vede. E' lo stesso vincolo
 * che il pass Wallet porta gia' («*un posto scritto in un titolo finisce su un
 * file che non si ritira*»): **e' un vincolo su come si da' un nome a una
 * serata**, non un difetto da riparare qui. Composta in **un solo posto** cosi'
 * che quel vincolo abbia un solo indirizzo.
 *
 * ── Perimetro: un ordine sta su UNA serata ──────────────────────────────────
 *
 * `partyId` e' obbligatorio. Il tetto per ordine vive su `event_parties`
 * (`max_tickets_per_order`), quindi un ordine senza serata sarebbe un ordine
 * senza tetto — e la RPC `reserve_ticket_order` lo tratta gia' cosi', cadendo su
 * un default di 6. Il biglietto di evento (`party_id` nullo) resta al percorso
 * con sessione, che le fasi 50/51 decideranno.
 *
 * ── Consultivo, e va detto quale meta' lo e' ─────────────────────────────────
 *
 * **Niente qui e' la barriera.** Capienza, tetto e usi dello sconto sono
 * riletti in modo **autoritativo** dentro `public.reserve_ticket_order`, che
 * blocca le righe `FOR UPDATE` dentro la transazione che emette i biglietti
 * (piano 49-01). Questo modulo esiste per dirlo **presto** a chi compra, non per
 * reggere: due richieste in volo passano entrambe di qui e solo una passa la
 * RPC. Dove applicazione e database dissentono, ha ragione il database.
 *
 * La conseguenza operativa e' scritta perche' non si legge dal codice: quando un
 * conteggio **non torna**, il limite **si apre**. E' la direzione gia' scelta e
 * argomentata sul percorso con sessione (D-46-05, D-46-07,
 * `src/app/(admin)/admin/events/actions.ts:1306-1338`), e la ragione per cui non
 * la si rovescia qui e' che rifiutare su una lettura fallita significa rifiutare
 * un acquirente che il database avrebbe accettato. Ogni conteggio illeggibile
 * lascia una riga di log con la sua categoria — e una riga di log non e'
 * osservabilita' (`meta-gates.md`: **non esiste error tracking**), quindi la
 * cosa che si vede davvero e' il rifiuto della RPC dopo l'incasso, che e' il
 * residuo D-46-07 ereditato e non peggiorato.
 */

type ServiceClient = ReturnType<typeof getServiceClient>;

/** Il minimo che il fornitore di pagamento accetta, in euro. */
const SUMUP_MINIMUM_EUR = 1.0;

// ─────────────────────────────────────────────────────────────────────────────
// I rifiuti
//
// Costanti -> unione da `typeof` -> `Record` **totale** sull'unione: la
// costruzione di `src/lib/failure/money-path.ts:12-45`, gia' in albero tre
// volte. Il `Record` e' il punto: una causa aggiunta senza la sua frase e' un
// errore di `npm run build`, non una categoria che si disegna come niente. In un
// repository senza test runner quel build e' l'unico cancello automatico che
// esiste.
//
// Sono **quattordici** e non uno perche' il precedente contrario e' registrato
// in questo progetto: il form della newsletter cattura ogni causa con «Qualcosa
// e' andato storto», rendendo indistinguibili una rete caduta, una chiave
// mancante e un capiente esaurito (`.planning/codebase/CONCERNS.md`,
// `meta-gates.md`). Su un percorso che muove denaro la distinzione e' il
// rimedio: *scegli di meno*, *scegli un altro tier* e *riprova* sono tre azioni
// diverse per chi le legge.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Una lettura che decide **non ha risposto**.
 *
 * Il terzo membro di ogni unione costruita su una lettura e' sempre *non si e'
 * potuto rispondere*, e non si fonde mai con il *no*
 * (`money-path.ts:71-80`): dire a una persona che non puo' comprare quando in
 * realta' nessuno ha guardato e' un'altra cosa, e su un percorso di denaro e'
 * la piu' facile da confondere. La categoria e' **una sola** per tutte le
 * letture bloccanti perche' il rimedio di chi legge e' uno solo — riprovare — e
 * la distinzione che serve a chi ripara vive nello **scope** del log, che e'
 * diverso per ogni lettura.
 */
const QUOTE_UNREADABLE = "quote_unreadable";
const QUOTE_NIGHT_NOT_FOUND = "quote_night_not_found";
const QUOTE_NIGHT_NOT_ON_SALE = "quote_night_not_on_sale";
const QUOTE_TIER_NOT_FOUND = "quote_tier_not_found";
const QUOTE_TIER_OTHER_NIGHT = "quote_tier_other_night";
const QUOTE_QUANTITY_INVALID = "quote_quantity_invalid";
const QUOTE_QUANTITY_OVER_CAP = "quote_quantity_over_cap";
const QUOTE_TIER_NOT_ON_SALE = "quote_tier_not_on_sale";
const QUOTE_TIER_SOLD_OUT = "quote_tier_sold_out";
const QUOTE_TIER_NOT_ENOUGH_SEATS = "quote_tier_not_enough_seats";
const QUOTE_DISCOUNT_UNKNOWN = "quote_discount_unknown";
const QUOTE_DISCOUNT_INACTIVE = "quote_discount_inactive";
const QUOTE_DISCOUNT_OTHER_NIGHT = "quote_discount_other_night";
const QUOTE_DISCOUNT_OTHER_TIER = "quote_discount_other_tier";
const QUOTE_DISCOUNT_EXHAUSTED = "quote_discount_exhausted";
const QUOTE_BELOW_MINIMUM = "quote_below_minimum";

export type OrderQuoteRefusal =
  | typeof QUOTE_UNREADABLE
  | typeof QUOTE_NIGHT_NOT_FOUND
  | typeof QUOTE_NIGHT_NOT_ON_SALE
  | typeof QUOTE_TIER_NOT_FOUND
  | typeof QUOTE_TIER_OTHER_NIGHT
  | typeof QUOTE_QUANTITY_INVALID
  | typeof QUOTE_QUANTITY_OVER_CAP
  | typeof QUOTE_TIER_NOT_ON_SALE
  | typeof QUOTE_TIER_SOLD_OUT
  | typeof QUOTE_TIER_NOT_ENOUGH_SEATS
  | typeof QUOTE_DISCOUNT_UNKNOWN
  | typeof QUOTE_DISCOUNT_INACTIVE
  | typeof QUOTE_DISCOUNT_OTHER_NIGHT
  | typeof QUOTE_DISCOUNT_OTHER_TIER
  | typeof QUOTE_DISCOUNT_EXHAUSTED
  | typeof QUOTE_BELOW_MINIMUM;

/**
 * Una frase per causa, e nessuna frase nomina una riga, una persona o un id.
 *
 * Due di loro portano un numero calcolato al momento — il tetto della serata e
 * i posti rimasti — quindi si compongono dove il rifiuto viene costruito, come
 * `menu/actions.ts:82-86` gia' fa con il codice del database: la frase qui resta
 * quella base, e chi la usa la specializza. Un tetto scritto a mano in questa
 * mappa sarebbe una seconda verita' accanto alla colonna.
 */
const ORDER_QUOTE_ERROR: Record<OrderQuoteRefusal, string> = {
  [QUOTE_UNREADABLE]:
    "We could not check this night's tickets just now, so nothing was charged and no order was placed. This is not a refusal — please try again in a moment.",
  [QUOTE_NIGHT_NOT_FOUND]: "This night could not be found. Nothing was charged.",
  [QUOTE_NIGHT_NOT_ON_SALE]:
    "Tickets for this night are not on sale. Nothing was charged.",
  [QUOTE_TIER_NOT_FOUND]:
    "This ticket type could not be found. Nothing was charged.",
  [QUOTE_TIER_OTHER_NIGHT]:
    "This ticket type does not belong to this night. Nothing was charged.",
  [QUOTE_QUANTITY_INVALID]:
    "Choose how many tickets you want — at least one, in whole tickets.",
  [QUOTE_QUANTITY_OVER_CAP]:
    "That is more tickets than one order may hold for this night.",
  [QUOTE_TIER_NOT_ON_SALE]:
    "This ticket type is not on sale right now. Nothing was charged.",
  [QUOTE_TIER_SOLD_OUT]: "This ticket type is sold out. Nothing was charged.",
  [QUOTE_TIER_NOT_ENOUGH_SEATS]:
    "There are fewer tickets left than you asked for. Try a smaller number.",
  [QUOTE_DISCOUNT_UNKNOWN]: "That discount code was not recognised.",
  [QUOTE_DISCOUNT_INACTIVE]: "That discount code is no longer active.",
  [QUOTE_DISCOUNT_OTHER_NIGHT]: "That discount code is not valid for this night.",
  [QUOTE_DISCOUNT_OTHER_TIER]:
    "That discount code is not valid for this ticket type.",
  [QUOTE_DISCOUNT_EXHAUSTED]: "That discount code has been used up.",
  [QUOTE_BELOW_MINIMUM]:
    "This order is below the minimum a card payment can take (€1.00). Nothing was charged.",
};

/** Cio' che il preventivo dice, e nient'altro di cio' che ha letto per dirlo. */
export interface OrderQuote {
  eventId: string;
  /** Serve al ritorno dal pagamento, per rimandare la persona alla serata. */
  eventSlug: string;
  partyId: string;
  tierId: string;
  quantity: number;
  /** Il prezzo di UN biglietto, sconto gia' applicato, arrotondato al centesimo. */
  unitPrice: number;
  /** `unitPrice x quantity`, arrotondato al centesimo: e' cio' che si incassa. */
  totalAmount: number;
  /**
   * La descrizione che va al fornitore di pagamento. Composta **solo qui** —
   * vedi il docblock del modulo per il vincolo che si porta dietro.
   */
  description: string;
  /** Il tetto per **ordine** della serata, non per persona. */
  cap: number;
  /** L'id dello sconto **validato**, o `null`. Mai quello che e' arrivato. */
  discountCodeId: string | null;
}

export type OrderQuoteResult =
  | { ok: true; quote: OrderQuote }
  | { ok: false; refusal: OrderQuoteRefusal; error: string };

function refuse(
  refusal: OrderQuoteRefusal,
  detail?: string
): { ok: false; refusal: OrderQuoteRefusal; error: string } {
  const base = ORDER_QUOTE_ERROR[refusal];
  return { ok: false, refusal, error: detail ? `${base} ${detail}` : base };
}

/** Solo `code` e `message`: mai `details`, che su una violazione porta la riga. */
function safe(error: unknown): SafeError | null {
  if (error && typeof error === "object") {
    const e = error as { code?: unknown; message?: unknown };
    return {
      code: typeof e.code === "string" ? e.code : null,
      message: typeof e.message === "string" ? e.message : null,
    };
  }
  return null;
}

/** Euro -> centesimi interi, per non sommare decimali binari. */
function toCents(euro: number): number {
  return Math.round(euro * 100);
}

export interface OrderQuoteInput {
  partyId: string;
  tierId: string;
  quantity: number;
  discountCodeId?: string | null;
}

/**
 * Il preventivo di un ordine, calcolato interamente dal database.
 *
 * Il client di servizio arriva **dal chiamante** e non viene creato qui: chi
 * chiama e' gia' un percorso che ha dichiarato per iscritto perche' bypassa la
 * RLS (`access-gating.md`, gate *service role*), e crearne un secondo dentro un
 * modulo di calcolo nasconderebbe quella dichiarazione un livello piu' in
 * basso.
 *
 * Ogni ritorno negativo porta la sua causa **come valore**. Nessuno di loro e'
 * un `throw`: Next **redige** il messaggio di un errore sollevato da una Server
 * Action in un build di produzione (`src/lib/capabilities/server.ts:58-63`),
 * quindi quattordici frasi diverse arriverebbero identiche proprio dove
 * contano.
 */
export async function buildOrderQuote(
  client: ServiceClient,
  input: OrderQuoteInput
): Promise<OrderQuoteResult> {
  const { partyId, tierId } = input;
  const quantity = input.quantity;

  // 1. La quantita', per quel che si puo' dire senza aver letto niente.
  //    Il confronto col tetto arriva dopo la serata, perche' il tetto e' suo.
  if (!Number.isInteger(quantity) || quantity < 1) {
    return refuse(QUOTE_QUANTITY_INVALID);
  }

  // 2. La serata. Nessuna colonna del luogo, e non c'e' bisogno di fidarsi del
  //    commento: la lista delle colonne e' qui sotto per intero.
  const { data: party, error: partyError } = await client
    .from("event_parties")
    .select("id, event_id, title, max_tickets_per_order")
    .eq("id", partyId)
    .maybeSingle();

  if (partyError) {
    logMoneyPathFailure("buildOrderQuote.party_unreadable", safe(partyError));
    return refuse(QUOTE_UNREADABLE);
  }
  if (!party) return refuse(QUOTE_NIGHT_NOT_FOUND);

  // 3. L'evento: la sua pubblicazione e' il cancello di vendita, e il suo slug
  //    e' cio' che serve al ritorno dal pagamento.
  //
  //    **Il controllo di pubblicazione non era nel piano, ed e' Rule 2.** Senza,
  //    chiunque indovini l'uuid di una serata in bozza potrebbe aprire un
  //    checkout su una serata che non e' in vendita — e da oggi un biglietto e'
  //    anche cio' che apre l'indirizzo di quella serata (piano 49-03), quindi la
  //    porta si aprirebbe da sola nel momento in cui la serata viene
  //    pubblicata. Il percorso con sessione non ha questo controllo esplicito
  //    perche' non ne aveva bisogno: chi compra li' passa da una pagina che
  //    esiste solo per un evento pubblicato. Una server action pubblica non ha
  //    quella pagina davanti.
  const { data: event, error: eventError } = await client
    .from("events")
    .select("id, slug, is_published")
    .eq("id", party.event_id)
    .maybeSingle();

  if (eventError) {
    logMoneyPathFailure("buildOrderQuote.event_unreadable", safe(eventError));
    return refuse(QUOTE_UNREADABLE);
  }
  if (!event) return refuse(QUOTE_NIGHT_NOT_FOUND);
  if (!event.is_published) return refuse(QUOTE_NIGHT_NOT_ON_SALE);

  // 4. Il tetto della serata. **Per ORDINE e non per persona**, ed e' scritto
  //    nella frase: sei ordini da sei sono trentasei biglietti e niente qui lo
  //    impedisce. E' il perimetro dichiarato di BUY-02 — e un perimetro non
  //    dichiarato e' indistinguibile da un buco.
  const cap = party.max_tickets_per_order;
  if (quantity > cap) {
    return refuse(
      QUOTE_QUANTITY_OVER_CAP,
      `One order may hold up to ${cap} ticket${cap === 1 ? "" : "s"} for this night — that is a limit per order, not per person.`
    );
  }

  // 5. Il tier, e il suo prezzo riletto dal database.
  const { data: tier, error: tierError } = await client
    .from("ticket_tiers")
    .select("id, name, price, event_id, party_id, quantity, starts_at, expires_at")
    .eq("id", tierId)
    .maybeSingle();

  if (tierError) {
    logMoneyPathFailure("buildOrderQuote.tier_unreadable", safe(tierError));
    return refuse(QUOTE_UNREADABLE);
  }
  if (!tier) return refuse(QUOTE_TIER_NOT_FOUND);
  if (tier.party_id !== party.id || tier.event_id !== party.event_id) {
    return refuse(QUOTE_TIER_OTHER_NIGHT);
  }

  // 6. La catena dei tier e la capienza.
  //
  //    **La catena non era nel piano, ed e' Rule 2.** Il percorso con sessione
  //    la applica lato server (`admin/events/actions.ts:1339-1427`) e
  //    `reserve_ticket_order` **non** la applica: guarda la capienza, non la
  //    finestra temporale ne' l'ordine dei tier. Un percorso ospite senza questo
  //    blocco sarebbe **piu' permissivo** di quello con sessione sullo stesso
  //    tier — cioe' chiunque potrebbe comprare l'early bird chiamando l'azione
  //    direttamente mentre la pagina lo mostra esaurito. Su un prodotto dove i
  //    tier sono il meccanismo del prezzo, quello non e' un dettaglio di UI.
  //
  //    La **direzione** su una lettura fallita e' quella del percorso con
  //    sessione, non una nuova: permissiva, per non rifiutare un acquirente che
  //    il database avrebbe accettato (D-46-05). Cambiata qui, avrebbe reso i due
  //    percorsi incoerenti proprio sul caso raro.
  const tierChainQuery = client
    .from("ticket_tiers")
    .select("id, price, quantity, starts_at, expires_at")
    .eq("event_id", party.event_id)
    .eq("party_id", party.id)
    .order("price", { ascending: true });

  const { data: allTiers, error: allTiersError } = await tierChainQuery;

  if (allTiersError) {
    // NON SI E' POTUTO CONTARE. La catena non si valuta e l'acquisto prosegue:
    // il tetto che regge davvero resta quello della RPC, che fallisce chiuso.
    logMoneyPathFailure("buildOrderQuote.tier_list_unreadable", safe(allTiersError));
  } else if (allTiers && allTiers.length > 0) {
    const tierIds = allTiers.map((t) => t.id);
    const { data: soldRows, error: soldError } = await client
      .from("tickets")
      .select("tier_id")
      .in("tier_id", tierIds);

    const soldMap = new Map<string, number>();
    if (soldError) {
      // NON SI E' POTUTO CONTARE. `soldMap` resta vuota, quindi ogni tier
      // risulta con zero venduti — **compreso uno esaurito**. E' un conteggio
      // non letto, non un conteggio a zero, e i due sono indistinguibili
      // guardando la mappa: per questo la riga sta qui.
      logMoneyPathFailure("buildOrderQuote.sold_count_unreadable", safe(soldError));
    } else {
      for (const row of soldRows ?? []) {
        const id = (row as { tier_id: string | null }).tier_id;
        if (id) soldMap.set(id, (soldMap.get(id) ?? 0) + 1);
      }
    }

    const now = new Date();
    type TierStatus = "coming_soon" | "available" | "sold_out" | "expired";
    const statusMap = new Map<string, TierStatus>();

    for (let i = 0; i < allTiers.length; i++) {
      const t = allTiers[i];
      const sold = soldMap.get(t.id) ?? 0;
      const left = t.quantity !== null ? t.quantity - sold : null;

      if (t.starts_at && now < new Date(t.starts_at)) {
        statusMap.set(t.id, "coming_soon");
        continue;
      }
      if (left !== null && left <= 0) {
        statusMap.set(t.id, "sold_out");
        continue;
      }
      if (t.expires_at && now >= new Date(t.expires_at)) {
        statusMap.set(t.id, "expired");
        continue;
      }
      const prev = i > 0 ? allTiers[i - 1] : null;
      if (prev) {
        const prevStatus = statusMap.get(prev.id)!;
        if (prevStatus !== "sold_out" && prevStatus !== "expired") {
          statusMap.set(t.id, "coming_soon");
          continue;
        }
      }
      statusMap.set(t.id, "available");
    }

    const status = statusMap.get(tierId);
    if (status === "sold_out") return refuse(QUOTE_TIER_SOLD_OUT);
    if (status === "coming_soon" || status === "expired") {
      return refuse(QUOTE_TIER_NOT_ON_SALE);
    }

    // La capienza per la quantita' CHIESTA, che la catena non guarda: quella
    // dice se ne resta almeno uno, questa se ne restano abbastanza.
    const chainTier = allTiers.find((t) => t.id === tierId);
    const capacity = chainTier ? chainTier.quantity : tier.quantity;
    if (capacity !== null) {
      const sold = soldMap.get(tierId) ?? 0;
      const left = capacity - sold;
      if (sold + quantity > capacity) {
        return refuse(
          QUOTE_TIER_NOT_ENOUGH_SEATS,
          `${left} left, ${quantity} asked for.`
        );
      }
    }
  }

  // 7. Lo sconto, validato con gli stessi quattro controlli del percorso con
  //    sessione (`admin/events/actions.ts:1486-1546`) e applicato **all'unita'**
  //    prima di moltiplicare — perche' uno sconto fisso per biglietto e uno
  //    sull'ordine sono due prodotti diversi, e questo e' il primo.
  let unitPrice = tier.price;
  let validatedDiscountCodeId: string | null = null;

  if (input.discountCodeId) {
    const { data: code, error: codeError } = await client
      .from("discount_codes")
      .select("id, party_id, discount_type, discount_amount, max_uses, is_active")
      .eq("id", input.discountCodeId)
      .maybeSingle();

    if (codeError) {
      logMoneyPathFailure("buildOrderQuote.discount_unreadable", safe(codeError));
      return refuse(QUOTE_UNREADABLE);
    }
    if (!code) return refuse(QUOTE_DISCOUNT_UNKNOWN);
    if (!code.is_active) return refuse(QUOTE_DISCOUNT_INACTIVE);
    if (code.party_id !== party.id) return refuse(QUOTE_DISCOUNT_OTHER_NIGHT);

    const { data: restrictions, error: restrictionsError } = await client
      .from("discount_code_tiers")
      .select("tier_id")
      .eq("discount_code_id", code.id);

    if (restrictionsError) {
      // NON SI E' POTUTO LEGGERE l'elenco dei tier a cui il codice si applica.
      // Qui la direzione permissiva NON e' innocua come sulle altre due — la
      // RPC ricontrolla `max_uses`, **non** l'applicabilita' per tier — quindi
      // si rifiuta. E' l'unica lettura consultiva di questo file che fallisce
      // chiusa, e la ragione e' che dietro non c'e' nessun altro a guardare.
      logMoneyPathFailure(
        "buildOrderQuote.discount_tiers_unreadable",
        safe(restrictionsError)
      );
      return refuse(QUOTE_UNREADABLE);
    }
    if (restrictions && restrictions.length > 0) {
      const applicable = restrictions.map((r) => (r as { tier_id: string }).tier_id);
      if (!applicable.includes(tierId)) return refuse(QUOTE_DISCOUNT_OTHER_TIER);
    }

    if (code.max_uses !== null) {
      const { count, error: usageError } = await client
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("discount_code_id", code.id);

      if (usageError) {
        // NON SI E' POTUTO CONTARE: `count` e' null, `(count ?? 0) + quantity`
        // parte da zero e il limite **si apre**. Detto qui perche' il codice non
        // puo' dirlo da solo. La barriera che regge e' `reserve_ticket_order`,
        // che conta `quantity` usi bloccando il codice `FOR UPDATE`.
        logMoneyPathFailure(
          "buildOrderQuote.discount_usage_unreadable",
          safe(usageError)
        );
      }
      // `+ quantity` e non `+ 1`: un ordine da sei consuma **sei** usi, ed e'
      // cosi' che la RPC li conta. Contare un uso solo qui direbbe di si' a un
      // ordine che il database poi rifiuta, dopo l'incasso.
      if ((count ?? 0) + quantity > code.max_uses) {
        return refuse(QUOTE_DISCOUNT_EXHAUSTED);
      }
    }

    unitPrice =
      code.discount_type === "percentage"
        ? Math.round(tier.price * (1 - code.discount_amount / 100) * 100) / 100
        : Math.round((tier.price - code.discount_amount) * 100) / 100;

    if (unitPrice < 0) unitPrice = 0;
    validatedDiscountCodeId = code.id;
  }

  // 8. Il totale, sommato in centesimi interi, e il minimo del fornitore.
  //
  //    Il minimo si applica al **totale** e non all'unita', perche' e' il totale
  //    che va al checkout: sei biglietti da 0,90 fanno 5,40 e passano. Il
  //    percorso con sessione controlla l'unita' perche' li' un ordine e' sempre
  //    un biglietto solo — non e' una regola diversa, e' la stessa su una
  //    quantita' fissa a uno.
  const totalAmount = (toCents(unitPrice) * quantity) / 100;
  if (totalAmount < SUMUP_MINIMUM_EUR) {
    return refuse(QUOTE_BELOW_MINIMUM);
  }

  return {
    ok: true,
    quote: {
      eventId: party.event_id,
      eventSlug: event.slug,
      partyId: party.id,
      tierId: tier.id,
      quantity,
      unitPrice: toCents(unitPrice) / 100,
      totalAmount,
      // Composta qui e in nessun altro posto. Il titolo della serata e' cio'
      // che chi organizza riconosce nella dashboard del fornitore — dove la
      // contabilita' di questo prodotto vive davvero — ed e' anche l'unica
      // stringa nostra che finisce su una superficie di terzi.
      description:
        quantity > 1
          ? `${party.title} - ${tier.name} x${quantity}`
          : `${party.title} - ${tier.name}`,
      cap,
      discountCodeId: validatedDiscountCodeId,
    },
  };
}
