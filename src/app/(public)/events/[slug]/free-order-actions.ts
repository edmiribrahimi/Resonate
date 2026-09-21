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
import { sendOrderConfirmation } from "@/lib/tickets/order-confirmation";

/**
 * free-order-actions.ts — la prenotazione di una serata gratuita, che e' un
 * ordine come gli altri con un totale di zero.
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
 * Qui quel freno non c'e', e **l'unica difesa e' il tetto per ordine** —
 * `event_parties.max_tickets_per_order`, 6 per default (`D-50-26`) — piu' la
 * capienza del livello, **entrambi applicati dentro la transazione della RPC**,
 * che e' l'unico posto dove reggono sotto concorrenza. Sei posti per chiamata,
 * niente che impedisca la chiamata successiva: e' un perimetro dichiarato,
 * registrato come T-50-17, e un perimetro dichiarato e' l'opposto di un buco
 * scoperto dopo.
 *
 * ── LE UNDICI CAUSE, E PERCHE' NESSUNA COLLASSA NELL'ALTRA ─────────────────
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
 *   - `free_not_free_rsvp`    — quella serata non prende prenotazioni gratuite
 *   - `free_tier_missing`     — manca il livello a prezzo zero, o non e' a zero
 *   - `free_order_not_saved`  — la riga d'ordine non si e' scritta
 *   - `free_identity_failed`  — l'account non si e' potuto trovare ne' coniare
 *   - `free_buyer_not_attached` — l'ordine non si e' potuto legare al conto
 *   - `free_mint_failed`      — la RPC ha rifiutato: tetto, capienza, o altro
 *
 * `free_unreadable` e' il terzo membro obbligatorio (`money-path.ts`, §4): *la
 * domanda non ha avuto risposta* non si fonde mai con *no*.
 *
 * ── COSA QUESTO FILE NON FA ────────────────────────────────────────────────
 *
 *   - **non crea livelli di biglietto.** Se il livello a prezzo zero manca,
 *     rifiuta e dice all'organizer cosa fare. Un percorso pubblico che conia un
 *     livello sarebbe una **seconda strada verso l'emissione**, dentro un
 *     percorso concorrente;
 *   - **non tocca il fornitore di pagamento** e non apre nessun checkout;
 *   - **non scrive niente su `tickets`**: i biglietti li fa la RPC, in una
 *     transazione, e l'etichetta del portatore resta un progressivo — il nome
 *     raccolto qui **non arriva alla porta** (`D-49-03`, `D-50-18b`);
 *   - **non scrive su `public.rsvps`**: lo storico resta in sola lettura
 *     (`D-50-22`).
 */

/* ────────────────────────────────────────────────────────────────────────────
 * Le cause
 * ──────────────────────────────────────────────────────────────────────────── */

const FREE_EMAIL_MISSING = "free_email_missing";
const FREE_EMAIL_MALFORMED = "free_email_malformed";
const FREE_NAME_MISSING = "free_name_missing";
const FREE_NAME_TOO_LONG = "free_name_too_long";
const FREE_UNREADABLE = "free_unreadable";
const FREE_NOT_FREE_RSVP = "free_not_free_rsvp";
const FREE_TIER_MISSING = "free_tier_missing";
const FREE_ORDER_NOT_SAVED = "free_order_not_saved";
const FREE_IDENTITY_FAILED = "free_identity_failed";
const FREE_BUYER_NOT_ATTACHED = "free_buyer_not_attached";
const FREE_MINT_FAILED = "free_mint_failed";

type FreeOrderOwnRefusal =
  | typeof FREE_EMAIL_MISSING
  | typeof FREE_EMAIL_MALFORMED
  | typeof FREE_NAME_MISSING
  | typeof FREE_NAME_TOO_LONG
  | typeof FREE_UNREADABLE
  | typeof FREE_NOT_FREE_RSVP
  | typeof FREE_TIER_MISSING
  | typeof FREE_ORDER_NOT_SAVED
  | typeof FREE_IDENTITY_FAILED
  | typeof FREE_BUYER_NOT_ATTACHED
  | typeof FREE_MINT_FAILED;

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
  [FREE_NOT_FREE_RSVP]:
    "This night does not take free bookings. If it sells tickets, buy one from the night's page instead.",
  [FREE_TIER_MISSING]:
    "Bookings are not open on this night yet: it has no free ticket type. Whoever runs the night has to open it — tell them, and nothing was booked.",
  [FREE_ORDER_NOT_SAVED]:
    "Your booking could not be saved, so no ticket was issued. Please try again — and if it happens twice, tell us.",
  [FREE_IDENTITY_FAILED]:
    "We could not set up the account your tickets belong to, so no ticket was issued. Please try again — and if it happens twice, tell us.",
  [FREE_BUYER_NOT_ATTACHED]:
    "Your booking could not be linked to your account, so no ticket was issued. Please try again in a moment.",
  [FREE_MINT_FAILED]:
    "Your tickets could not be issued, so nothing is booked. This night may have just filled up, or you asked for more than one booking may hold.",
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

/** La forma di un uuid, controllata prima di mandarlo a PostgREST. */
const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Prenota uno o piu' biglietti su una serata gratuita — `REG-06`.
 *
 * La sequenza e' quella del webhook del percorso pagato, **in sincrono**:
 * preventivo → riga d'ordine → identita' → portatore → conio → mail. L'ordine
 * dei passi non e' estetico: ognuno dipende dal precedente, e il primo che
 * fallisce si ferma li' con la propria causa.
 *
 * **Chiamarla due volte con lo stesso indirizzo crea due prenotazioni**, ed e'
 * corretto: sono due ordini distinti, e il tetto per ordine li limita come
 * limita due acquisti. Cio' che non deve accadere e' che **lo stesso ordine**
 * emetta biglietti due volte — e quello lo impedisce il ramo idempotente della
 * RPC, che esce senza inserire su un ordine gia' chiuso.
 *
 * @returns l'id dell'ordine e quanti biglietti sono nati, oppure un rifiuto con
 * la sua causa.
 */
export async function reserveFreeTickets(input: {
  partyId: string;
  quantity: number;
  email: string;
  fullName: string;
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
    return refuse(FREE_NOT_FREE_RSVP, "identificativo di serata fuori forma");
  }
  const partyId = input.partyId;

  const serviceClient = getServiceClient();

  // ── 2. La serata, riletta dal database ────────────────────────────────────
  //
  // **E' il controllo che impedisce a questo percorso di emettere biglietti su
  // una serata A PAGAMENTO** (T-50-16), ed e' autoritativo qui: non si deduce
  // da cosa la superficie ha mostrato, perche' la superficie non e' il confine.
  // Nessuna colonna del luogo in questa `select`: una colonna che non si legge
  // non si puo' stampare (`venue-secrecy.md`, gate *default chiuso*).
  const { data: party, error: partyError } = await serviceClient
    .from("event_parties")
    .select("id, access_type")
    .eq("id", partyId)
    .maybeSingle();

  if (partyError) {
    return refuse(
      FREE_UNREADABLE,
      `lettura della serata non riuscita: ${redactDbError(partyError)}`
    );
  }
  if (!party) {
    return refuse(FREE_NOT_FREE_RSVP, `serata ${partyId} inesistente`);
  }
  if (party.access_type !== "free_rsvp") {
    return refuse(
      FREE_NOT_FREE_RSVP,
      `serata ${partyId} e' ${party.access_type}: il percorso a totale zero non la tocca`
    );
  }

  // ── 3. Il livello a prezzo zero, che NON si crea da qui ───────────────────
  //
  // Lo crea la serata: la migration per quelle che esistevano gia', la scrittura
  // della serata da qui in avanti. Se manca, questa azione **rifiuta dicendo a
  // chi legge cosa deve succedere**; coniarlo sarebbe una seconda strada verso
  // l'emissione dentro un percorso concorrente (T-50-14).
  //
  // Due righe e non una: se ce ne fosse piu' d'una, la scelta deve essere
  // **deterministica** — la piu' vecchia — e l'ambiguita' va scritta, perche'
  // significa che qualcosa ne ha creato un secondo.
  const { data: tiers, error: tierError } = await serviceClient
    .from("ticket_tiers")
    .select("id, price")
    .eq("party_id", partyId)
    .eq("price", 0)
    .order("created_at", { ascending: true })
    .limit(2);

  if (tierError) {
    return refuse(
      FREE_UNREADABLE,
      `lettura del livello non riuscita: ${redactDbError(tierError)}`
    );
  }

  const tier = (tiers ?? [])[0];
  if (!tier) {
    return refuse(
      FREE_TIER_MISSING,
      `serata ${partyId} senza livello a prezzo zero: l'organizer deve aprirla`
    );
  }
  if (Number(tier.price) !== 0) {
    // Controllo di sanita' su un dato che decide se qualcuno paga: il filtro
    // sopra dovrebbe averlo gia' garantito, e proprio per questo un valore
    // diverso qui significa che il filtro non ha fatto quello che crediamo.
    return refuse(
      FREE_TIER_MISSING,
      `livello ${tier.id} letto con prezzo ${tier.price} da un filtro a zero`
    );
  }
  if ((tiers ?? []).length > 1) {
    console.error(
      `[tickets.free_tier_ambiguous] serata ${partyId} ha piu' di un livello a prezzo zero: preso il piu' vecchio`
    );
  }

  // ── 4. Il preventivo, lo STESSO del percorso pagato ───────────────────────
  //
  // Tetto per ordine, catena dei livelli, capienza, catalogo, pubblicazione
  // dell'evento: identici a zero euro, e ogni loro rifiuto viaggia intatto.
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
    // Il terzo dei tre controlli indipendenti su T-50-16 — serata gratuita,
    // livello a zero, totale a zero. Nessuno dei tre e' dedotto dagli altri.
    return refuse(
      FREE_TIER_MISSING,
      `preventivo a ${quote.totalAmount} su un percorso che non incassa`
    );
  }

  // ── 5. La riga d'ordine ───────────────────────────────────────────────────
  const orderId = crypto.randomUUID();

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
  // `p_issued_via: "free_rsvp"` e' l'attribuzione, e sta sul **biglietto**. La
  // colonna e' testo nudo con default, senza `CHECK` da allargare, e la sua
  // migration dichiara che `NULL` significa «scritto prima che la colonna
  // esistesse», mai «acquisto ordinario»: un valore proprio e' il modo corretto
  // di distinguere un biglietto che nessuno ha pagato.
  const { data: mintedIds, error: mintError } = await serviceClient.rpc(
    "reserve_ticket_order",
    { p_order_id: orderId, p_issued_via: "free_rsvp" }
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

  return { success: true, orderId, ticketCount, emailSent };
}
