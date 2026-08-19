"use server";

import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getAccessContext } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { createCheckout, getCheckout, refundTransaction } from "@/lib/sumup";
import { verifyTicketToken } from "@/utils/qr";
import { menuCloseInstant } from "@/utils/datetime";
import { logMoneyPathFailure } from "@/lib/failure/money-path";

import { redactDbError } from "@/lib/errors/redact";
/**
 * Why the three causes below travel as a VALUE, and why they stay three.
 *
 * ── The value, not the message ───────────────────────────────────────────────
 *
 * Until plan 46-04 this action threw on all three, and **all three arrived
 * identical in production**: Next redacts the message of an error thrown out of
 * a Server Action in a production build, stated at the source in
 * `src/lib/capabilities/server.ts:58-63`. Rewording a `throw` would therefore
 * not have been a fix — a caller that branches on message text works in
 * `next dev` and stops working where it counts. The category has to be a
 * returned value or it does not survive the build that matters.
 *
 * ── Three, and not one ───────────────────────────────────────────────────────
 *
 * D-46-10b: *you may not do this* and *it did not save* are different facts to
 * an organizer. The first sends them to find someone who may; the second is
 * theirs to retry. Collapsing them into one catch would replace a silent failure
 * with a collapsed one — the newsletter form is this repository's own recorded
 * precedent for that shape, one message for a network fault, a missing key and
 * an already-subscribed address alike (`.planning/codebase/CONCERNS.md`,
 * `meta-gates.md`). *Nobody is signed in* is kept apart from both for the reason
 * the original code already gave below: an anonymous caller would be refused by
 * the capability test anyway, but "nobody is here" is not "this person may not".
 *
 * ── The `Record` is the trip-wire ────────────────────────────────────────────
 *
 * `MENU_CLOSE_ERROR` is total over `MenuCloseRefusal` (the construction of
 * `src/lib/door/outcome.ts:278-302`, shared by `src/lib/failure/money-path.ts`).
 * A fourth cause added without its sentence is an `npm run build` error, not a
 * category that renders as nothing. In a repository with no test runner that
 * build is the only automatic gate there is — proved by mutation in plan 46-04,
 * task 3, and the proof is recorded in `46-04-SUMMARY.md`.
 *
 * The sentences are the approved ones and are not composed here: they come from
 * `.planning/phases/46-silent-failures-on-the-money-path/46-COPY.md` §1, signed
 * off in one pass on 2026-08-14. A plan that wants different words amends that
 * list and re-presents it whole.
 *
 * ── Module-private, and the reason is measured rather than assumed ───────────
 *
 * The constants and the map are **not exported**, and the type is. The caller
 * needs the category to branch on and the words to draw; it gets the words
 * already resolved in `error`, so it never reads the map. That is the shape of
 * the analog this conversion copies: `src/app/(admin)/admin/events/actions.ts`
 * exports `NightRefusal` and `EventWriteResult` as types and keeps
 * `nightRefusalSentence` private.
 *
 * Exporting the map was **probed, not assumed**, because this is a `"use server"`
 * file and Next's documented contract for one is async-function exports only:
 * with `export const MENU_CLOSE_ERROR`, `npm run build` on 2026-08-14 was green.
 * So the build tolerates it here — and it stays private anyway, because an
 * export nothing imports is an invitation for the next reader to pull it into
 * the client component, which is the case the documented contract covers and
 * this probe did not.
 */
const MENU_CLOSE_NOT_SIGNED_IN = "menu_close_not_signed_in";
const MENU_CLOSE_NOT_PERMITTED = "menu_close_not_permitted";
const MENU_CLOSE_WRITE_FAILED = "menu_close_write_failed";

/** The three literals as a union, so the `Record` below can be total over them. */
export type MenuCloseRefusal =
  | typeof MENU_CLOSE_NOT_SIGNED_IN
  | typeof MENU_CLOSE_NOT_PERMITTED
  | typeof MENU_CLOSE_WRITE_FAILED;

/**
 * One sentence per cause, written once (46-COPY.md §1).
 *
 * The database `code` is appended to the third and to nothing else, in
 * parentheses, exactly as `src/app/(admin)/admin/events/actions.ts:368` already
 * does on the same kind of surface: a PostgREST code is a class of failure, not
 * a row and not a person. It is appended where the result is built, so the
 * sentences here stay byte-identical to the approved list.
 */
const MENU_CLOSE_ERROR: Record<MenuCloseRefusal, string> = {
  [MENU_CLOSE_NOT_SIGNED_IN]:
    "This session is no longer signed in, so the closing time was not changed. Sign in again and set it.",
  [MENU_CLOSE_NOT_PERMITTED]:
    "This account may not set the closing time for a night — an organizer has to do it. Nothing was changed.",
  [MENU_CLOSE_WRITE_FAILED]:
    "Saving the closing time failed. It is unchanged — the bar menu still closes when it did before. Try again.",
};

/**
 * What the menu-closing command returns. `refusal` and `error` are present only
 * when `success` is false — the shape of `EventWriteResult`
 * (`src/app/(admin)/admin/events/actions.ts:276-282`), widened additively so the
 * caller reads the category and the words without a second lookup.
 */
export type MenuCloseResult = {
  success: boolean;
  error?: string;
  refusal?: MenuCloseRefusal;
};

/**
 * Update menu_closes_at for a party. Only master/organizer can do this.
 *
 * **`staff.manage`, and the equivalence was measured.** The deleted predicate
 * read `role in (master, organizer)` off a `select("role")` — `status` was never
 * fetched, so it could not be part of the test. `private.role_capabilities`
 * grants `staff.manage` to `master` and to `organizer` with
 * `requires_approved = false` on both rows
 * (`20260807000000_capability_model.sql:392-393`): the same predicate, row for
 * row. `CAP_DESCRIPTIONS["staff.manage"]` names *parties* and *drinks* by hand.
 * `catalogue.manage` was rejected — it carries `requires_approved = true`
 * (`:399-400`) and would refuse a pending organizer who can set this today.
 *
 * **The gate runs BEFORE the service-client write, and that order is the whole
 * point.** `partyId` is untrusted client input and the write below uses the
 * service-role client, which bypasses every row-level policy
 * (`access-gating.md`, gate *service role*). On this path the code IS the
 * security boundary — there is no RLS behind it to catch a caller the gate let
 * through. The service client is retained deliberately: an organizer has no RLS
 * write permission on `event_parties`, so the write cannot be done as the
 * caller.
 *
 * `menu_closes_at` is money-adjacent: it decides when drink tokens stop being
 * purchasable and when the one-hour redeem grace period starts
 * (`purchaseDrinksGuest` and `redeemDrinkTokenGuest` below). This change touches
 * *who may set it*, never the value written nor the `end_time` fallback nor the
 * grace window.
 *
 * **Plan 46-04 changed what this action RETURNS, never what it decides.** The
 * predicate is still `CAP.STAFF_MANAGE`, it still runs before the service-client
 * write for the reason two paragraphs up, and the value written is the same
 * value. Only the three refusals stopped being thrown and started being carried
 * — see the docblock above the union for why that distinction is load-bearing.
 */
export async function updateMenuClosesAt(
  partyId: string,
  menuClosesAt: string | null
): Promise<MenuCloseResult> {
  const ctx = await getAccessContext();

  // Two causes, kept distinguishable (`meta-gates.md`, zero silent failures).
  // An anonymous caller resolves to the empty capability set and would be
  // refused below anyway, but "nobody is here" is not "this person may not".
  if (!ctx.userId) {
    return {
      success: false,
      refusal: MENU_CLOSE_NOT_SIGNED_IN,
      error: MENU_CLOSE_ERROR[MENU_CLOSE_NOT_SIGNED_IN],
    };
  }

  if (!ctx.capabilities.has(CAP.STAFF_MANAGE)) {
    return {
      success: false,
      refusal: MENU_CLOSE_NOT_PERMITTED,
      error: MENU_CLOSE_ERROR[MENU_CLOSE_NOT_PERMITTED],
    };
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from("event_parties")
    .update({ menu_closes_at: menuClosesAt || null })
    .eq("id", partyId);

  if (error) {
    // Code and message only. `error.details` is never read here: on a
    // constraint violation PostgREST returns the whole rejected row, and a log
    // on this project reaches a screenshot (`money-path.ts`, `SafeError`).
    logMoneyPathFailure(`event_parties.${MENU_CLOSE_WRITE_FAILED}`, {
      code: error.code,
      message: error.message,
    });
    return {
      success: false,
      refusal: MENU_CLOSE_WRITE_FAILED,
      error: `${MENU_CLOSE_ERROR[MENU_CLOSE_WRITE_FAILED]} (${error.code ?? "no code"})`,
    };
  }

  return { success: true };
}

/**
 * Guest drink purchase — no authentication required.
 * Creates a SumUp checkout and drink_orders with user_id: null.
 * Returns orderId so the guest client can persist it in localStorage / URL.
 */
export async function purchaseDrinksGuest(
  eventId: string,
  partyId: string,
  items: { drinkItemId: string; quantity: number }[]
): Promise<{ success: boolean; checkoutId: string; orderId: string }> {
  if (!items || items.length === 0) {
    throw new Error("No items selected");
  }

  const serviceClient = getServiceClient();

  // Check if menu is still open for this party
  const { data: partyData } = await serviceClient
    .from("event_parties")
    .select("date, end_time, menu_closes_at")
    .eq("id", partyId)
    .single();

  if (partyData) {
    const closeTime = partyData.menu_closes_at ?? partyData.end_time;
    if (closeTime && partyData.date) {
      // Next-day closing (party at 23:00, closes at 03:00) is handled inside
      // menuCloseInstant, in Turin time.
      const closeDt = menuCloseInstant(partyData.date, closeTime);
      if (new Date() >= closeDt) {
        throw new Error("The drink menu is closed. No new orders can be placed.");
      }
    }
  }

  // Fetch drink items by IDs
  const drinkItemIds = items.map((i) => i.drinkItemId);
  const { data: drinkItems, error: fetchError } = await serviceClient
    .from("drink_items")
    .select("*")
    .in("id", drinkItemIds)
    .eq("event_id", eventId);

  if (fetchError) {
    throw new Error(`Failed to fetch drink items: ${fetchError.message}`);
  }

  if (!drinkItems || drinkItems.length !== drinkItemIds.length) {
    throw new Error(
      "One or more drink items not found or do not belong to this event"
    );
  }

  // Validate availability
  const drinkMap = new Map(drinkItems.map((d) => [d.id, d]));
  for (const item of items) {
    const drink = drinkMap.get(item.drinkItemId);
    if (!drink) {
      throw new Error(`Drink item not found: ${item.drinkItemId}`);
    }
    if (!drink.is_available) {
      throw new Error(`Drink "${drink.name}" is not currently available`);
    }
    if (item.quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }
  }

  // Calculate total and build items snapshot
  let totalAmount = 0;
  const itemsSnapshot = items.map((item) => {
    const drink = drinkMap.get(item.drinkItemId)!;
    const lineTotal = drink.price * item.quantity;
    totalAmount += lineTotal;
    return {
      drink_item_id: drink.id,
      drink_name: drink.name,
      price: drink.price,
      quantity: item.quantity,
    };
  });

  // Validate minimum amount for SumUp (€1.00)
  if (totalAmount < 1) {
    throw new Error("Minimum order amount is €1.00");
  }

  // Fetch party name for checkout description
  const { data: party } = await serviceClient
    .from("event_parties")
    .select("title")
    .eq("id", partyId)
    .single();

  const itemsList = itemsSnapshot
    .map((i) => `${i.quantity}x ${i.drink_name}`)
    .join(", ");
  const description = party ? `${party.title} - ${itemsList}` : itemsList;

  // Use one UUID as both the drink_orders.id AND the SumUp checkout_reference,
  // so the post-3DS /payment/callback?order=<id> can find the order via DB lookup
  // without needing a SumUp API round-trip.
  const orderId = crypto.randomUUID();
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sumup`;

  // Fetch event slug for redirect URL
  const { data: eventForSlug } = await serviceClient
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  // Build redirect URL for APM and 3DS flows
  const redirectUrl = new URL("/payment/callback", process.env.NEXT_PUBLIC_APP_URL);
  redirectUrl.searchParams.set("order", orderId);
  redirectUrl.searchParams.set("slug", eventForSlug?.slug ?? "");
  redirectUrl.searchParams.set("ctx", "drink");
  redirectUrl.searchParams.set("party", partyId);

  const response = await createCheckout({
    amount: totalAmount,
    currency: "EUR",
    description,
    checkoutReference: orderId,
    returnUrl,
    redirectUrl: redirectUrl.toString(),
  });

  // Create drink order with user_id: null (guest purchase)
  const { error: insertError } = await serviceClient
    .from("drink_orders")
    .insert({
      id: orderId,
      event_id: eventId,
      party_id: partyId,
      user_id: null,
      sumup_checkout_id: response.id,
      total_amount: totalAmount,
      status: "pending",
      items: itemsSnapshot,
    });

  if (insertError) {
    console.error(`[drinks.order_insert_failed] ${redactDbError(insertError)}`);
    throw new Error("Failed to initiate drink purchase");
  }

  return { success: true, checkoutId: response.id, orderId };
}

/**
 * Claim guest drink orders after login/register.
 * Links unclaimed orders (user_id IS NULL) to the authenticated user.
 */
export async function claimGuestOrders(
  orderIds: string[]
): Promise<{ claimed: number }> {
  if (!orderIds || orderIds.length === 0) return { claimed: 0 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { claimed: 0 };

  const serviceClient = getServiceClient();

  // Claim drink orders (only those with user_id IS NULL)
  const { data: claimed } = await serviceClient
    .from("drink_orders")
    .update({ user_id: user.id })
    .in("id", orderIds)
    .is("user_id", null)
    .select("id");

  if (claimed && claimed.length > 0) {
    const claimedIds = claimed.map((o) => o.id);
    await serviceClient
      .from("drink_tokens")
      .update({ user_id: user.id })
      .in("order_id", claimedIds)
      .is("user_id", null);
  }

  return { claimed: claimed?.length ?? 0 };
}

export type DrinkTokenAction = "activate" | "serve" | "cancel";

/**
 * Two-step drink token flow for guest (anonymous) tokens:
 *   - "activate": purchased -> active (customer confirms intent to redeem)
 *   - "serve":    active -> redeemed  (bartender finalizes on customer's phone)
 *   - "cancel":   active -> purchased (customer cancels mid-activation)
 *
 * Verifies HMAC signature and guards that only guest tokens (user_id IS NULL)
 * can use this action, then dispatches to the matching SECURITY DEFINER RPC.
 */
export async function redeemDrinkTokenGuest(
  signedToken: string,
  action: DrinkTokenAction
): Promise<{ success: true }> {
  const tokenId = verifyTicketToken(signedToken);
  if (!tokenId) {
    throw new Error("Invalid token signature");
  }

  const serviceClient = getServiceClient();
  const { data: token, error: tokenError } = await serviceClient
    .from("drink_tokens")
    .select("id, user_id, status, party_id")
    .eq("id", tokenId)
    .single();

  if (tokenError || !token) {
    throw new Error("Token not found");
  }

  if (token.user_id !== null) {
    throw new Error("Use authenticated redemption flow");
  }

  if (token.status === "refunded") {
    throw new Error("Token has been refunded");
  }

  if (token.status === "redeemed" && action !== "serve") {
    throw new Error("Already redeemed");
  }

  // Activation requires the menu/grace window to still be open
  if (action === "activate" && token.party_id) {
    const { data: party } = await serviceClient
      .from("event_parties")
      .select("date, end_time, menu_closes_at")
      .eq("id", token.party_id)
      .single();

    if (party) {
      const closeTime = party.menu_closes_at ?? party.end_time;
      if (closeTime && party.date) {
        const closeDt = menuCloseInstant(party.date, closeTime);
        const graceEnd = new Date(closeDt.getTime() + 60 * 60 * 1000);
        if (new Date() > graceEnd) {
          throw new Error("Token expired — grace period has ended");
        }
      }
    }
  }

  const rpcName =
    action === "activate"
      ? "activate_drink_token"
      : action === "serve"
        ? "redeem_drink_token"
        : "deactivate_drink_token";

  const { data: applied, error: rpcError } = await serviceClient.rpc(rpcName, {
    p_token_id: tokenId,
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  // All three RPCs return false when they did nothing because the token was
  // already in the target state. Discarding that boolean is how a second press
  // pours a second drink: no error is raised, so the caller reports success and
  // the screen says SERVED again.
  if (applied === false) {
    throw new Error(
      action === "serve"
        ? "This token has already been served"
        : action === "activate"
          ? "This token is already active"
          : "This token is not active"
    );
  }

  return { success: true };
}

/**
 * L'esito di una richiesta di rimborso, come valore restituito e non come
 * eccezione.
 *
 * ── Perche' un valore e non un `throw` ──────────────────────────────────────
 *
 * Next **oscura il messaggio** di un errore lanciato fuori da una server action
 * in build di produzione: chi lo riceve legge una stringa opaca. Su un percorso
 * che riguarda denaro, un rifiuto che arriva vuoto e' un rifiuto che nessuno puo'
 * capire — e la persona che lo riceve non ha modo di sapere se deve riprovare,
 * aspettare, o scrivere a qualcuno.
 *
 * ── Perche' sei cause e non una ─────────────────────────────────────────────
 *
 * `meta-gates.md`, controllo zero fallimenti silenziosi: nessun `catch` che
 * collassi cause diverse in un unico messaggio. Il progetto ha gia' un precedente
 * registrato — il form della newsletter che rispondeva *«Qualcosa e' andato
 * storto»* a un problema di rete, a una chiave mancante e a un indirizzo gia'
 * iscritto — e la conseguenza fu che divenne indebuggabile sia per chi lo subiva
 * sia per chi sviluppava.
 *
 * Qui le sei cause portano a sei azioni diverse da parte di chi legge: due sono
 * definitive (bevuto, gia' rimborsato), una e' un'attesa (richiesta gia'
 * aperta), una e' una scadenza (finestra chiusa), due sono un guasto.
 */
export type DrinkRefundRequestOutcome =
  | { ok: true }
  | {
      ok: false;
      cause:
        | "invalid_signature"
        | "not_found"
        | "already_redeemed"
        | "already_refunded"
        | "window_closed"
        | "already_requested"
        | "transport";
      message: string;
      /** Presente solo su `window_closed`: fino a quando si poteva chiedere. */
      deadline?: string;
    };

/**
 * Chiedere il rimborso di un token non riscattato — **anche senza account**.
 *
 * ── Cosa questa azione NON fa, ed e' la sua proprieta' principale ────────────
 *
 * **Non muove denaro.** Non chiama `refundTransaction`, non cambia lo stato del
 * token, non tocca l'ordine. Crea una richiesta. La decisione — automatica per un
 * token mai attivato, manuale per uno attivato e poi annullato — e' del piano
 * 47-04, e vive altrove di proposito: un'azione che chiedesse *e* decidesse
 * renderebbe impossibile cambiare la regola senza toccare il percorso pubblico.
 *
 * ── Perche' regge un ospite ─────────────────────────────────────────────────
 *
 * La credenziale e' **la firma del token**, come in `redeemDrinkTokenGuest`. Un
 * ospite non ha una sessione, e dopo il perno della v1.6 nessun cliente avra' un
 * account affatto. La verifica avviene sul server, e il client di servizio
 * esegue solo dopo che la firma ha retto.
 */
export async function requestDrinkRefundGuest(
  signedToken: string
): Promise<DrinkRefundRequestOutcome> {
  const tokenId = verifyTicketToken(signedToken);
  if (!tokenId) {
    return {
      ok: false,
      cause: "invalid_signature",
      message: "Questo codice non è valido. Riapri il link che hai ricevuto.",
    };
  }

  const serviceClient = getServiceClient();

  const { data: token, error: tokenError } = await serviceClient
    .from("drink_tokens")
    .select("id, status, price, order_id, activation_count, party_id, event_parties(date, end_time, menu_closes_at, refund_request_window_hours)")
    .eq("id", tokenId)
    .single();

  if (tokenError || !token) {
    // La causa di trasporto e quella di assenza sono due cose diverse: la prima
    // si riprova, la seconda no. Un solo messaggio per entrambe manderebbe una
    // persona a riprovare all'infinito su un token che non esiste.
    if (tokenError && tokenError.code !== "PGRST116") {
      logMoneyPathFailure("drink refund request token read", tokenError);
      return {
        ok: false,
        cause: "transport",
        message: "Non siamo riusciti a leggere il tuo drink. Riprova fra poco.",
      };
    }
    return {
      ok: false,
      cause: "not_found",
      message: "Questo drink non risulta più fra i nostri.",
    };
  }

  if (token.status === "redeemed") {
    // La causa che qualcuno contestera', quindi la piu' precisa delle sei.
    return {
      ok: false,
      cause: "already_redeemed",
      message: "Questo drink risulta servito, quindi non è rimborsabile.",
    };
  }

  if (token.status === "refunded") {
    return {
      ok: false,
      cause: "already_refunded",
      message: "Questo drink è già stato rimborsato.",
    };
  }

  // ── La finestra ────────────────────────────────────────────────────────────
  //
  // Si misura dalla CHIUSURA DEL MENU, come la grazia dell'attivazione, non
  // dall'acquisto: sono due istanti diversi e sceglierne uno per distrazione
  // sposta la scadenza di ore.
  const party = token.event_parties as unknown as {
    date: string;
    end_time: string | null;
    menu_closes_at: string | null;
    refund_request_window_hours: number;
  } | null;

  if (party) {
    const closeTimeStr = party.menu_closes_at ?? party.end_time;
    if (closeTimeStr && party.date) {
      const closeDt = menuCloseInstant(party.date, closeTimeStr);
      const deadline = new Date(
        closeDt.getTime() + party.refund_request_window_hours * 60 * 60 * 1000
      );
      if (new Date() > deadline) {
        // Il messaggio dice FINO A QUANDO si poteva chiedere, non solo che e'
        // tardi: un rifiuto che non dice quale scadenza si e' persa e' un
        // rifiuto che la persona leggera' come arbitrario.
        return {
          ok: false,
          cause: "window_closed",
          message: "Il tempo per chiedere il rimborso di questo drink è scaduto.",
          deadline: deadline.toISOString(),
        };
      }
    }
  }

  const { error: insertError } = await serviceClient
    .from("drink_refund_request")
    .insert({ token_id: tokenId });

  if (insertError) {
    // `23505` e' la violazione del vincolo di unicita' sul token: c'e' gia' una
    // richiesta. Non e' un guasto, ed e' l'unico codice che questo ramo
    // interpreta — ogni altro resta un guasto e viene detto come tale.
    if (insertError.code === "23505") {
      return {
        ok: false,
        cause: "already_requested",
        message: "Abbiamo già la tua richiesta per questo drink.",
      };
    }
    logMoneyPathFailure("drink refund request insert", insertError);
    return {
      ok: false,
      cause: "transport",
      message: "Non siamo riusciti a registrare la richiesta. Riprova fra poco.",
    };
  }

  /*
    ── LA BIFORCAZIONE (`DRK-05` / `DRK-05b`) ────────────────────────────────

    `activation_count = 0` → il token non e' MAI stato attivato, e lo sappiamo.
    Il rimborso parte subito.

    Qualunque altro valore, `null` compreso → una persona guarda.

    IL `null` NON E' UNO ZERO, ED E' LA RIGA PIU' IMPORTANTE DI QUESTO BLOCCO.
    Significa «riga creata prima che si contasse»: non sappiamo se sia stata
    attivata. Trattarlo come «mai attivato» rimborserebbe automaticamente proprio
    i token su cui non abbiamo dati — cioe' l'errore che la fase 47 esiste per
    togliere, applicato all'indietro. Il confronto stretto con `0` lo esclude da
    solo, e la migration 20260820100000 ha reso la colonna nullable proprio per
    questo.

    E NON SI LEGGE `activated_at`. Dal 2026-08-19 quel campo sopravvive
    all'annullamento: `activated_at IS NULL` non significa piu' «mai attivato».
  */
  if (token.activation_count !== 0) {
    // Resta in attesa. Nessun denaro si muove, e la richiesta e' gia' registrata:
    // chi decide la vede, con il conteggio accanto.
    return { ok: true };
  }

  const esitoRimborso = await emettiRimborsoAutomatico({
    tokenId,
    orderId: token.order_id as string,
    importo: Number(token.price),
  });

  if (!esitoRimborso.ok) {
    /*
      L'EMISSIONE E' FALLITA, E LA RICHIESTA RESTA VISIBILE E IN ATTESA.

      Non «riprova piu' tardi» silenzioso, non un log e basta: questo progetto non
      ha alcun tracciamento degli errori, quindi un fallimento che non produce un
      effetto osservabile e' un fallimento che nessuno sapra' mai
      (`meta-gates.md`). La riga rimasta `pending` E' l'effetto osservabile:
      compare a chi decide, che la chiudera' a mano.

      A chi ha chiesto diciamo che la richiesta c'e' — perche' e' vero, ed e'
      esattamente la situazione in cui si trova. Non gli diciamo «rimborsato»,
      che sarebbe falso, ne' «errore», che gli farebbe credere di dover rifare
      qualcosa che e' gia' fatto.
    */
    return { ok: true };
  }

  return { ok: true };
}

/**
 * Emette il rimborso di un singolo token e chiude la sua richiesta.
 *
 * ── La regola del denaro, applicata qui senza sconti ────────────────────────
 *
 * *«ALWAYS verify via GET checkout API»* — `src/app/api/webhooks/sumup/route.ts`
 * la enuncia sul webhook, e ogni nuovo percorso che muove denaro la eredita. Il
 * codice di transazione **si rilegge dal checkout**, non si prende per buono
 * quello memorizzato: quel campo lo ha scritto un webhook, ed e' esattamente il
 * genere di valore che la regola dice di non credere sulla parola.
 *
 * ── Idempotenza ────────────────────────────────────────────────────────────
 *
 * Il vincolo di unicita' su `token_id` garantisce **una richiesta per token**, e
 * lo stato del token passa a `refunded` prima che questa funzione ritorni. Una
 * seconda invocazione trova `already_requested` a monte e non arriva qui.
 */
async function emettiRimborsoAutomatico({
  tokenId,
  orderId,
  importo,
}: {
  tokenId: string;
  orderId: string;
  importo: number;
}): Promise<{ ok: boolean }> {
  const serviceClient = getServiceClient();

  try {
    const { data: order } = await serviceClient
      .from("drink_orders")
      .select("sumup_checkout_id, sumup_transaction_code, refunded_amount")
      .eq("id", orderId)
      .single();

    if (!order?.sumup_checkout_id) {
      logMoneyPathFailure("drink auto-refund: nessun checkout sull'ordine", {
        code: "no_checkout",
        message: `order=${orderId}`,
      });
      return { ok: false };
    }

    // Interrogato SEMPRE, non solo come ripiego: e' la regola del dominio.
    const checkout = await getCheckout(order.sumup_checkout_id);
    const txCode =
      checkout.transactions?.[0]?.transaction_code ??
      order.sumup_transaction_code ??
      null;

    if (!txCode) {
      logMoneyPathFailure("drink auto-refund: nessun codice di transazione", {
        code: "no_tx_code",
        message: `order=${orderId}`,
      });
      return { ok: false };
    }

    const arrotondato = Math.round(importo * 100) / 100;
    await refundTransaction(txCode, arrotondato);

    await serviceClient
      .from("drink_tokens")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("id", tokenId);

    // Sopravvive alla cancellazione del token, come faceva il cron.
    await serviceClient
      .from("drink_orders")
      .update({
        refunded_amount: Number(order.refunded_amount ?? 0) + arrotondato,
      })
      .eq("id", orderId);

    // `decided_automatically` invece di un `decided_by` inventato: una decisione
    // ha sempre un autore, e qui l'autore e' la regola. Il vincolo del database
    // rifiuta entrambi insieme e rifiuta nessuno dei due.
    await serviceClient
      .from("drink_refund_request")
      .update({
        status: "approved",
        decided_at: new Date().toISOString(),
        decided_automatically: true,
      })
      .eq("token_id", tokenId);

    return { ok: true };
  } catch (err) {
    logMoneyPathFailure("drink auto-refund", {
      code: null,
      message: err instanceof Error ? err.message : null,
    });
    return { ok: false };
  }
}
