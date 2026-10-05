"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  assertMayManageEvent,
  assertStaffManage,
} from "@/lib/capabilities/guards";
import { CAP } from "@/lib/capabilities/keys";
import { replayPaidOrderDelivery } from "@/lib/tickets/replay-order-delivery";
import { redactDbError } from "@/lib/errors/redact";
import { CODE_SALES_CLOSED_MESSAGE, CODE_SOLD_OUT_MESSAGE, isCodeUsable } from "@/lib/tickets/sales-window";

// Service-role client for operations where RLS blocks legitimate access
// (e.g., master managing tiers for events they don't own)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * The local `verifyOrganizer` and `verifyEventOwnership` are GONE, not unused.
 * They were byte-identical to the pair in
 * `src/app/(admin)/admin/events/actions.ts` except for one error string
 * each, and both now live once in `@/lib/capabilities/guards`.
 *
 * **The shape every action below follows, and why the order matters.**
 *
 *   const supabase = await createClient();
 *   const ctx = await assertStaffManage();          // resolve ONCE
 *   await assertMayManageEvent(supabase, eventId, ctx);
 *
 * `assertStaffManage()` is called **exactly once per invocation** and its
 * context is threaded onward. `cache()` does not memoise inside a Server Action
 * body (measured — see `@/lib/capabilities/server`), so a second call is a
 * second full round trip that no build and no fast connection will reveal.
 *
 * The ownership read still uses `supabase`, the cookie client, exactly as
 * `verifyEventOwnership` did — RLS applies to it, and this conversion changes
 * who may call, never what a call can see.
 *
 * **`isMaster` is now `ctx.capabilities.has(CAP.MASTER_MANAGE)`, and that is a
 * measured equivalence, not a rename.** The grant table
 * (`20260807000000_capability_model.sql:395`) holds exactly one row for the key,
 * `('master', 'master.manage', false)` — role `master`, status ignored — which
 * is byte-equal to the `profile.role === "master"` it replaces. So the
 * service-client branch below is taken by exactly the same callers as before.
 */

// =============================================================
// Server Actions
// =============================================================

/**
 * La descrizione di un tier: cosa include. Vuota → `null`, mai stringa vuota,
 * perche' ogni superficie che la disegna la salta su `null` e stamperebbe un
 * paragrafo vuoto su `""`. Il tetto di 500 e' lo stesso del `CHECK` in
 * `20260924100000_tier_description.sql`: qui per rispondere con una frase,
 * li' per garantirlo.
 *
 * E' copy pubblica, letta prima dell'acquisto e stampata in mail: il form lo
 * dice sotto la casella, e nessun controllo qui puo' sapere se un testo
 * descrive un posto. Vedi `venue-secrecy.md`.
 */
const TIER_DESCRIPTION_MAX = 500;

function readTierDescription(formData: FormData): string | null {
  const raw = formData.get("description");
  // Una textarea inviata come form porta `\r\n` (e' il valore di submission
  // dello standard, non quello dell'API): normalizzato a `\n`, che e' l'unico
  // a capo che `white-space: pre-line` disegna. Misurato nel lab il 2026-09-24.
  const description =
    typeof raw === "string" ? raw.replace(/\r\n?/g, "\n").trim() : "";
  if (description.length === 0) return null;
  if (description.length > TIER_DESCRIPTION_MAX) {
    throw new Error(
      `Tier description must be at most ${TIER_DESCRIPTION_MAX} characters`
    );
  }
  return description;
}

/**
 * Create a new ticket tier for an event.
 */
export async function createTier(eventId: string, partyId: string | null, formData: FormData) {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  await assertMayManageEvent(supabase, eventId, ctx);

  // Validate inputs
  const name = (formData.get("name") as string)?.trim();
  if (!name || name.length < 1 || name.length > 100) {
    throw new Error("Tier name is required (1-100 characters)");
  }

  const priceRaw = formData.get("price") as string;
  const price = parseFloat(priceRaw);
  if (isNaN(price) || price < 0) {
    throw new Error("Price must be a number >= 0");
  }

  const quantityRaw = (formData.get("quantity") as string)?.trim() || null;
  const quantity = quantityRaw ? parseInt(quantityRaw, 10) : null;
  if (quantity !== null && (isNaN(quantity) || quantity < 1)) {
    throw new Error("Quantity must be a positive integer");
  }

  const showRemaining = formData.get("show_remaining") !== "false";

  const startsAtRaw = (formData.get("starts_at") as string)?.trim() || null;
  const starts_at = startsAtRaw ? new Date(startsAtRaw).toISOString() : null;

  const expiresAtRaw = (formData.get("expires_at") as string)?.trim() || null;
  const expires_at = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;

  const description = readTierDescription(formData);

  // Use service-role client for master (bypasses RLS ownership check)
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

  // 2026-10-01 — DBT-18, D-52.1-23. Un tier nuovo va IN CODA alla sua lista
  // (la serata, o gli Event Pass dell'evento quando `party_id` e' nullo, D5).
  // ASSUNZIONE da confermare al proprietario nella corsa P-521-D (piano
  // 52.1-12): il default della colonna e' 0 solo perche' e' NOT NULL, e un
  // tier a 0 salirebbe in testa alla vetrina pubblica senza che nessuno l'abbia
  // deciso. Letto con lo stesso client che inserisce, cosi' vede le stesse
  // righe. Il tier RSVP automatico (`admin/events/actions.ts`) resta a 0: e'
  // l'unico tier di una serata gratuita.
  const listPartyId = partyId || null;
  const lastQuery = client
    .from("ticket_tiers")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const { data: lastRows, error: lastError } = await (listPartyId
    ? lastQuery.eq("party_id", listPartyId)
    : lastQuery.is("party_id", null));

  if (lastError) {
    // Non si indovina una posizione: un tier creato a 0 per una lettura fallita
    // finirebbe davanti a tutti, in vetrina, in silenzio.
    console.error(
      `[tickets.create_tail_unreadable] event=${eventId} ${redactDbError(lastError)}`
    );
    throw new Error(`Failed to create tier: could not read the list order`);
  }

  const sortOrder = ((lastRows?.[0] as { sort_order?: number } | undefined)?.sort_order ?? 0) + 1;

  const { error } = await client.from("ticket_tiers").insert({
    event_id: eventId,
    party_id: listPartyId,
    name,
    description,
    price,
    quantity,
    show_remaining: showRemaining,
    starts_at,
    expires_at,
    sort_order: sortOrder,
  });

  if (error) {
    throw new Error(`Failed to create tier: ${error.message}`);
  }

  revalidatePath(`/admin/events/${eventId}/tickets`);
  return { success: true };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReorderTiersResult =
  | { ok: true; count: number }
  | { ok: false; reason: "stale_list" | "forbidden" | "failed" };

/**
 * Salva l'ordine INTERO di una lista di tier — una serata, oppure gli Event
 * Pass dell'evento quando `partyId` e' `null` (D-52.1-23, D3/D4/D5; DBT-18).
 *
 * **Una scrittura sola.** La lista va per intero a
 * `public.reorder_ticket_tiers` (migration `20261001120000_tier_sort_order.sql`),
 * che la confronta col perimetro e scrive SOLO `sort_order` in un'unica
 * `UPDATE`: mai a meta', mai prezzo o quantita'. L'anti-modello e'
 * `reorderDrinkItems` (N update in parallelo, errori ignorati): qui non
 * c'e' alcun ciclo di scritture, e ogni esito ha la sua categoria.
 *
 * **Tre esiti distinti**, restituiti e non lanciati — un errore lanciato da una
 * Server Action arriva redatto in produzione, e il client deve poter dire tre
 * cose diverse:
 *   - `forbidden`  — la guardia ha detto no (o non ha potuto rispondere);
 *   - `stale_list` — la lista non e' quella di adesso (un tier creato o
 *                    cancellato da un altro telefono, un doppione, un id di
 *                    un'altra serata): si ricarica e si rifa';
 *   - `failed`     — qualunque altro errore, compreso `reorder.partial` (la RLS
 *                    ha fermato una parte delle righe).
 *
 * Guardia identica a `createTier`: `assertStaffManage` una volta, poi
 * `assertMayManageEvent`; client di servizio solo per `master.manage`. Sotto,
 * la funzione e' `SECURITY INVOKER`: il confine resta `ticket_tiers_update`.
 */
export async function reorderTiers(
  eventId: string,
  partyId: string | null,
  tierIds: string[]
): Promise<ReorderTiersResult> {
  const supabase = await createClient();

  let ctx: Awaited<ReturnType<typeof assertStaffManage>>;
  try {
    ctx = await assertStaffManage();
    await assertMayManageEvent(supabase, eventId, ctx);
  } catch (err) {
    console.error(
      `[tickets.reorder_forbidden] event=${eventId} ${err instanceof Error ? err.message : redactDbError(err)}`
    );
    return { ok: false, reason: "forbidden" };
  }

  // La forma della lista si controlla prima di chiamare: un array vuoto, un
  // elemento non stringa o un id che non e' un uuid non possono essere il
  // perimetro di nessuna serata, quindi sono una lista sbagliata come una
  // vecchia — stesso esito, stessa azione per chi la riceve (ricaricare).
  const listPartyId = partyId || null;
  const shapeOk =
    Array.isArray(tierIds) &&
    tierIds.length > 0 &&
    tierIds.every((id) => typeof id === "string" && UUID_RE.test(id)) &&
    (listPartyId === null || UUID_RE.test(listPartyId));
  if (!shapeOk) {
    console.error(
      `[tickets.reorder_stale_list] event=${eventId} lista malformata (${Array.isArray(tierIds) ? tierIds.length : "non-array"} elementi)`
    );
    return { ok: false, reason: "stale_list" };
  }

  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

  const { data, error } = await client.rpc("reorder_ticket_tiers", {
    p_event_id: eventId,
    p_party_id: listPartyId,
    p_tier_ids: tierIds,
  });

  if (error) {
    if ((error.message ?? "").includes("reorder.stale_list")) {
      console.error(
        `[tickets.reorder_stale_list] event=${eventId} ${redactDbError(error)}`
      );
      return { ok: false, reason: "stale_list" };
    }
    console.error(
      `[tickets.reorder_failed] event=${eventId} ${redactDbError(error)}`
    );
    return { ok: false, reason: "failed" };
  }

  revalidatePath(`/admin/events/${eventId}/tickets`);
  revalidatePath(`/admin/events/${eventId}/sales`);
  // La vetrina pubblica legge lo stesso ordine (D4). Il pattern rinfresca ogni
  // pagina di serata: costa una rigenerazione, e non serve leggere lo slug.
  revalidatePath("/events/[slug]", "page");

  return { ok: true, count: typeof data === "number" ? data : tierIds.length };
}

/**
 * Update an existing ticket tier.
 * Tiers are fully editable always -- organizer can change price, name,
 * and quantity at any time, even after sales. Existing tickets remain
 * valid at their original price.
 */
export async function updateTier(
  tierId: string,
  eventId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  await assertMayManageEvent(supabase, eventId, ctx);

  // Validate inputs
  const name = (formData.get("name") as string)?.trim();
  if (!name || name.length < 1 || name.length > 100) {
    throw new Error("Tier name is required (1-100 characters)");
  }

  const priceRaw = formData.get("price") as string;
  const price = parseFloat(priceRaw);
  if (isNaN(price) || price < 0) {
    throw new Error("Price must be a number >= 0");
  }

  const quantityRaw = (formData.get("quantity") as string)?.trim() || null;
  const quantity = quantityRaw ? parseInt(quantityRaw, 10) : null;
  if (quantity !== null && (isNaN(quantity) || quantity < 1)) {
    throw new Error("Quantity must be a positive integer");
  }

  const showRemaining = formData.get("show_remaining") !== "false";

  const startsAtRaw = (formData.get("starts_at") as string)?.trim() || null;
  const starts_at = startsAtRaw ? new Date(startsAtRaw).toISOString() : null;

  const expiresAtRaw = (formData.get("expires_at") as string)?.trim() || null;
  const expires_at = expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null;

  const description = readTierDescription(formData);

  // Use service-role client for master (bypasses RLS ownership check)
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

  const { error } = await client
    .from("ticket_tiers")
    .update({ name, description, price, quantity, show_remaining: showRemaining, starts_at, expires_at })
    .eq("id", tierId);

  if (error) {
    throw new Error(`Failed to update tier: ${error.message}`);
  }

  revalidatePath(`/admin/events/${eventId}/tickets`);
  return { success: true };
}

/**
 * Delete a ticket tier. Only allowed if the tier has zero sales.
 */
export async function deleteTier(tierId: string, eventId: string) {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  await assertMayManageEvent(supabase, eventId, ctx);

  // Check ticket count -- tiers with existing sales cannot be deleted
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

  const { count, error: countError } = await client
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("tier_id", tierId);

  if (countError) {
    throw new Error(`Failed to check ticket sales: ${countError.message}`);
  }

  if (count && count > 0) {
    throw new Error("Cannot delete a tier with existing sales");
  }

  const { error } = await client
    .from("ticket_tiers")
    .delete()
    .eq("id", tierId);

  if (error) {
    throw new Error(`Failed to delete tier: ${error.message}`);
  }

  revalidatePath(`/admin/events/${eventId}/tickets`);
  return { success: true };
}

// =============================================================
// Discount Code Server Actions
// =============================================================

/**
 * Benefit di un codice: l'omaggio che la porta mostra (es. «1 chupito»).
 * Vuoto = nessun benefit; un codice a 0 € senza benefit non fa niente e il
 * compratore lo leggerebbe come applicato: si rifiuta qui e nel catalogo
 * (discount_codes_zero_needs_benefit_check, migration 20261005120000).
 */
function parseBenefit(formData: FormData, discountAmount: number): string | null {
  const benefit = ((formData.get("benefit") as string | null) ?? "").trim() || null;
  if (benefit !== null && benefit.length > 60) {
    throw new Error("Benefit must be at most 60 characters");
  }
  if (discountAmount === 0 && benefit === null) {
    throw new Error("A 0 code needs a benefit shown at the door");
  }
  return benefit;
}

/**
 * Create a new discount code for a party.
 */
export async function createDiscountCode(
  eventId: string,
  partyId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  await assertMayManageEvent(supabase, eventId, ctx);

  // Validate inputs
  const code = (formData.get("code") as string)?.trim();
  if (!code || code.length < 1) {
    throw new Error("Discount code is required");
  }

  const discountType = formData.get("discount_type") as string;
  if (discountType !== "percentage" && discountType !== "fixed") {
    throw new Error("Invalid discount type (percentage or fixed)");
  }

  const discountAmountRaw = formData.get("discount_amount") as string;
  const discountAmount = parseFloat(discountAmountRaw);
  if (isNaN(discountAmount) || discountAmount < 0) {
    throw new Error("Discount amount cannot be negative");
  }

  const benefit = parseBenefit(formData, discountAmount);

  if (discountType === "percentage" && discountAmount > 100) {
    throw new Error("Discount percentage cannot exceed 100%");
  }

  const maxUsesRaw = (formData.get("max_uses") as string)?.trim() || null;
  const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;
  if (maxUses !== null && (isNaN(maxUses) || maxUses < 1)) {
    throw new Error("Max uses must be a positive integer");
  }

  const isActive = formData.get("is_active") !== "false";

  const tierIdsRaw = (formData.get("tier_ids") as string)?.trim() || null;
  let tierIds: string[] = [];
  if (tierIdsRaw) {
    try {
      tierIds = JSON.parse(tierIdsRaw);
    } catch {
      throw new Error("Invalid tier_ids format");
    }
  }

  // Use service-role client for master (bypasses RLS ownership check)
  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

  const { data: discountCode, error } = await client
    .from("discount_codes")
    .insert({
      party_id: partyId,
      code,
      discount_type: discountType,
      discount_amount: discountAmount,
      max_uses: maxUses,
      is_active: isActive,
      benefit,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A code with this name already exists for this event");
    }
    throw new Error(`Failed to create discount code: ${error.message}`);
  }

  // Insert tier associations if specified
  if (tierIds.length > 0 && discountCode) {
    const junctionRows = tierIds.map((tierId) => ({
      discount_code_id: discountCode.id,
      tier_id: tierId,
    }));

    const { error: junctionError } = await client
      .from("discount_code_tiers")
      .insert(junctionRows);

    if (junctionError) {
      throw new Error(`Failed to associate tiers: ${junctionError.message}`);
    }
  }

  revalidatePath(`/admin/events/${eventId}/tickets`);
  return { success: true };
}

/**
 * Update an existing discount code.
 */
export async function updateDiscountCode(
  discountCodeId: string,
  eventId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  await assertMayManageEvent(supabase, eventId, ctx);

  // Validate inputs
  const code = (formData.get("code") as string)?.trim();
  if (!code || code.length < 1) {
    throw new Error("Discount code is required");
  }

  const discountType = formData.get("discount_type") as string;
  if (discountType !== "percentage" && discountType !== "fixed") {
    throw new Error("Invalid discount type (percentage or fixed)");
  }

  const discountAmountRaw = formData.get("discount_amount") as string;
  const discountAmount = parseFloat(discountAmountRaw);
  if (isNaN(discountAmount) || discountAmount < 0) {
    throw new Error("Discount amount cannot be negative");
  }

  const benefit = parseBenefit(formData, discountAmount);

  if (discountType === "percentage" && discountAmount > 100) {
    throw new Error("Discount percentage cannot exceed 100%");
  }

  const maxUsesRaw = (formData.get("max_uses") as string)?.trim() || null;
  const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;
  if (maxUses !== null && (isNaN(maxUses) || maxUses < 1)) {
    throw new Error("Max uses must be a positive integer");
  }

  const isActive = formData.get("is_active") !== "false";

  const tierIdsRaw = (formData.get("tier_ids") as string)?.trim() || null;
  let tierIds: string[] | null = null;
  if (tierIdsRaw) {
    try {
      tierIds = JSON.parse(tierIdsRaw);
    } catch {
      throw new Error("Invalid tier_ids format");
    }
  }

  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

  const { error } = await client
    .from("discount_codes")
    .update({
      code,
      discount_type: discountType,
      discount_amount: discountAmount,
      max_uses: maxUses,
      is_active: isActive,
      benefit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", discountCodeId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("A code with this name already exists for this event");
    }
    throw new Error(`Failed to update discount code: ${error.message}`);
  }

  // Update tier associations: delete existing, re-insert if provided
  if (tierIds !== null) {
    // Delete existing junction rows
    const { error: deleteError } = await client
      .from("discount_code_tiers")
      .delete()
      .eq("discount_code_id", discountCodeId);

    if (deleteError) {
      throw new Error(`Failed to remove tier associations: ${deleteError.message}`);
    }

    // Insert new junction rows (if any)
    if (tierIds.length > 0) {
      const junctionRows = tierIds.map((tierId) => ({
        discount_code_id: discountCodeId,
        tier_id: tierId,
      }));

      const { error: junctionError } = await client
        .from("discount_code_tiers")
        .insert(junctionRows);

      if (junctionError) {
        throw new Error(`Failed to associate tiers: ${junctionError.message}`);
      }
    }
  }

  revalidatePath(`/admin/events/${eventId}/tickets`);
  return { success: true };
}

/**
 * Delete a discount code. Only allowed if the code has not been used.
 */
export async function deleteDiscountCode(
  discountCodeId: string,
  eventId: string
) {
  const supabase = await createClient();
  const ctx = await assertStaffManage();

  await assertMayManageEvent(supabase, eventId, ctx);

  const client = ctx.capabilities.has(CAP.MASTER_MANAGE)
    ? getServiceClient()
    : supabase;

  // Check if discount code has been used on any tickets
  const { count, error: countError } = await client
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("discount_code_id", discountCodeId);

  if (countError) {
    throw new Error(`Failed to check usage: ${countError.message}`);
  }

  if (count && count > 0) {
    throw new Error("Cannot delete a discount code that has been used");
  }

  const { error } = await client
    .from("discount_codes")
    .delete()
    .eq("id", discountCodeId);

  if (error) {
    throw new Error(`Failed to delete discount code: ${error.message}`);
  }

  revalidatePath(`/admin/events/${eventId}/tickets`);
  return { success: true };
}

/**
 * Validate a discount code for buyer-side display.
 * This is a PUBLIC action -- any authenticated user can validate.
 */
export async function validateDiscountCode(
  partyId: string,
  code: string
): Promise<{
  id: string;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
  benefit: string | null;
  applicable_tier_ids: string[] | null;
}> {
  const supabase = await createClient();

  const { data: discountCode, error } = await supabase
    .from("discount_codes")
    .select("id, discount_type, discount_amount, max_uses, is_active, benefit")
    .eq("party_id", partyId)
    .ilike("code", code.trim())
    .single();

  if (error || !discountCode) {
    throw new Error("Invalid code");
  }

  if (!discountCode.is_active) {
    throw new Error("Code is no longer active");
  }

  // Check usage limits
  if (discountCode.max_uses !== null) {
    // 2026-10-05 — il conteggio passa dalla chiave di servizio. Con il client
    // di chi compra la RLS nasconde i biglietti altrui: per un ospite il conto
    // era SEMPRE 0, e un codice esaurito rispondeva «applicato» (misurato sul
    // laboratorio, `FULL-LAB`). E' un `count` in testa, nessuna riga torna
    // indietro; la stessa lettura che `order-quote.ts` fa gia' col servizio.
    const { count, error: usageError } = await getServiceClient()
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("discount_code_id", discountCode.id);
    if (usageError) {
      // Non si e' potuto contare: l'anteprima non dice «Sold out», e la
      // barriera resta il preventivo e la RPC. Lo si dice nel log.
      console.error(
        `[discount.usage_unreadable] code_id=${discountCode.id} err=${usageError.code ?? "?"}`
      );
    }

    if ((count ?? 0) >= discountCode.max_uses) {
      // «Sold out», parola del proprietario (2026-10-05): solo qui, dove un
      // tetto c'e' ed e' pieno.
      throw new Error(CODE_SOLD_OUT_MESSAGE);
    }
  }

  // 2026-10-05 — un codice non ha scadenza propria: vale fino a fine serata
  // − 2 h (`src/lib/tickets/sales-window.ts`, decisione del proprietario). Chi
  // lo prova dopo legge «Expired». Sta DOPO il controllo degli usi: esaurito e
  // chiuso dice «Sold out» (decisione del proprietario, stesso giorno). Se la serata non si legge il controllo non
  // si fa e lo si dice nel log: qui e' un'anteprima, e la barriera che regge e'
  // il preventivo (`order-quote.ts`, `quote_discount_sales_closed`) e
  // `purchaseTicket`, che rileggono la serata da soli.
  const { data: salesParty, error: salesPartyError } = await supabase
    .from("event_parties")
    .select("date, time, end_time")
    .eq("id", partyId)
    .maybeSingle();
  if (salesPartyError) {
    console.error(
      `[discount.sales_window_unreadable] party=${partyId} code=${salesPartyError.code ?? "?"}`
    );
  } else if (salesParty && !isCodeUsable(salesParty)) {
    throw new Error(CODE_SALES_CLOSED_MESSAGE);
  }

  // Check tier restrictions
  const { data: tierRestrictions } = await supabase
    .from("discount_code_tiers")
    .select("tier_id")
    .eq("discount_code_id", discountCode.id);

  const applicableTierIds =
    tierRestrictions && tierRestrictions.length > 0
      ? tierRestrictions.map((t) => t.tier_id)
      : null;

  return {
    id: discountCode.id,
    discount_type: discountCode.discount_type as "percentage" | "fixed",
    discount_amount: discountCode.discount_amount,
    benefit: (discountCode.benefit as string | null) ?? null,
    applicable_tier_ids: applicableTierIds,
  };
}

/**
 * «Retry issuing» — un ordine d'ospite `failed` il cui checkout e' PAID viene
 * rimesso in attesa e la consegna del webhook viene rigiocata. Niente viene
 * emesso qui: emette il webhook, idempotente (`replay-order-delivery.ts`).
 *
 * Nato il 2026-09-08 da `49-ESITI.md`, P-WH-4: la scheda diceva «reach out
 * before the night» e la riparazione era due `update` sul catalogo. La stessa
 * guardia delle altre azioni di questa pagina (`assertStaffManage` +
 * `assertMayManageEvent`), piu' il vincolo che l'ordine appartenga a questo
 * evento, perche' `orderId` arriva dal form e il client di servizio bypassa la
 * RLS (`access-gating.md`, *gate service role*).
 */
export async function retryFailedOrder(eventId: string, orderId: string) {
  const supabase = await createClient();
  const ctx = await assertStaffManage();
  await assertMayManageEvent(supabase, eventId, ctx);

  const serviceClient = getServiceClient();
  const { data: order } = await serviceClient
    .from("ticket_orders")
    .select("id")
    .eq("id", orderId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!order) {
    console.error(`[tickets.retry_refused_wrong_event] order=${orderId} event=${eventId}`);
    revalidatePath(`/admin/events/${eventId}/sales`);
    return;
  }

  const outcome = await replayPaidOrderDelivery({ orderId, serviceClient });
  console.log(`[tickets.retry_by_organizer] order=${orderId} by=${ctx.userId} → ${JSON.stringify(outcome)}`);
  // DBT-17 (2026-10-01): the «Orders without tickets» card — where this button
  // lives — moved to Sales, so Sales is the page to redraw. Manage tickets is
  // redrawn too: a retry that issues tickets changes the sold count `TierCard`
  // shows there.
  revalidatePath(`/admin/events/${eventId}/sales`);
  revalidatePath(`/admin/events/${eventId}/tickets`);
}
