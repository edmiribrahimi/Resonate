# Phase 26: Discount Codes - Research

**Researched:** 2026-03-10
**Domain:** Ticket pricing / coupon system / Supabase + SumUp integration
**Confidence:** HIGH

## Summary

Phase 26 adds discount codes to the ticket purchase flow. The implementation is well-scoped: a new `discount_codes` table, a junction table for tier-specific codes, modifications to `purchaseTicket()` and `reserve_ticket()` RPC, a buyer-side input in `TierSelection.tsx`, organizer CRUD on the tickets page, and discount tracking on the sales dashboard.

The codebase already has established patterns for everything needed: CRUD server actions (createTier/updateTier/deleteTier), form components (AddTierForm), card display (TierCard), SumUp checkout creation, atomic ticket reservation via RPC, and sales reporting. The discount code feature follows the exact same patterns -- no new libraries or architectural changes are required.

**Primary recommendation:** Use the existing CRUD pattern from ticket tiers (server actions + AddTierForm + TierCard) for discount code management. Validate discount codes server-side in `purchaseTicket()` before creating SumUp checkout, pass discounted amount to SumUp, and store `discount_code_id` on the ticket record via `reserve_ticket()` RPC.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Entita separata: tabella `discount_codes` (NOT fields on ticket_tiers)
- Un codice puo applicarsi a tutti i tier del party OPPURE a tier specifici
- Un solo codice per acquisto (no stacking)
- Validazione case-insensitive (LOWER())
- Codice rifiutato se prezzo risultante = EUR 0 (SumUp minimum EUR 1.00)
- Organizer configura per codice: code string, discount type (percentage/fixed), discount amount, optional max uses, active toggle
- Scope: per-party con associazione opzionale a tier specifici
- Comunicazione codici: passaparola (no UI per il buyer per scoprirli)
- Campo "Hai un codice sconto?" collapsible sotto TierSelection
- Dopo inserimento codice valido: tutti i tier applicabili mostrano prezzo barrato + prezzo scontato
- Prezzo scontato visibile su OGNI tier nella lista (non solo dopo Buy)
- Un solo codice alla volta -- nessun stacking
- Gestione codici nella stessa pagina dei tier (/organizer/events/[id]/tickets/)
- Sezione dedicata sotto i tier per creare/editare/eliminare codici sconto
- Ticket record salva `discount_code_id` per tracciabilita
- Sales dashboard mostra uso codici sconto

### Claude's Discretion
- Layout esatto della sezione CRUD codici (cards, lista, form inline)
- Design del feedback quando codice e valido/invalido/esaurito
- Come mostrare i codici sconto nel sales dashboard (colonna extra o sezione dedicata)
- Schema relazione discount_codes <-> ticket_tiers (junction table o nullable tier_id)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SC-01 | Organizer can create/edit/delete discount codes per party with: code string, discount type (percentage/fixed), discount amount, optional max uses, active toggle | CRUD server actions pattern from ticket tiers; new `discount_codes` table; AddDiscountCodeForm + DiscountCodeCard components |
| SC-02 | Buyer sees "Hai un codice sconto?" input field during ticket checkout; entering a valid code shows discounted price before payment | TierSelection.tsx modification; new `validateDiscountCode` server action; strikethrough price display |
| SC-03 | Validation is case-insensitive, rejects codes that would bring price below EUR 1.00, enforces usage limits, and only accepts codes for the correct party | LOWER() in SQL/server action; SumUp EUR 1.00 minimum guard; usage count check; party_id matching |
| SC-04 | SumUp checkout uses discounted amount; ticket record stores discount_code_id; sales dashboard shows discount usage | purchaseTicket() passes discounted amount to createCheckout(); reserve_ticket() RPC updated with p_discount_code_id; SalesDashboard enhanced |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase | Existing | Database, RLS, RPC functions | Already used throughout project |
| @sumup/sdk | Existing | Payment processing | Already integrated, singleton pattern |
| Next.js 16 | Existing | Server actions, server components | Project framework |
| Tailwind CSS v4 | Existing | Styling | Project styling solution |

### Supporting
No new libraries needed. All functionality is achievable with the existing stack.

### Alternatives Considered
None -- the existing stack handles all requirements.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/migrations/
  YYYYMMDD_discount_codes.sql        # New table + junction + RPC update

src/app/(organizer)/organizer/events/[id]/tickets/
  actions.ts                          # Add discount code CRUD actions
  page.tsx                            # Add discount codes section

src/components/tickets/
  AddDiscountCodeForm.tsx             # New: form to create discount codes
  DiscountCodeCard.tsx                # New: card with edit/delete for codes

src/app/(organizer)/organizer/events/
  actions.ts                          # Modify purchaseTicket() for discount validation

src/app/(public)/events/[slug]/
  TierSelection.tsx                   # Add discount code input + discounted price display
  actions.ts                          # Add validateDiscountCode() server action (or in organizer/events/actions.ts)

src/components/events/
  SalesDashboard.tsx                  # Add discount code usage column/section

src/types/database.ts                 # Add DiscountCode interface
```

### Pattern 1: Database Schema (Discount Codes)
**What:** New `discount_codes` table with junction table for tier-specific targeting
**When to use:** This is the foundation -- must be created first
**Example:**
```sql
-- discount_codes: one code per party
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.event_parties ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_amount numeric(10,2) NOT NULL CHECK (discount_amount > 0),
  max_uses integer,  -- NULL = unlimited
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Case-insensitive unique constraint per party
CREATE UNIQUE INDEX discount_codes_party_code_unique
  ON public.discount_codes (party_id, LOWER(code));

-- Junction table for tier-specific codes (empty = applies to all tiers)
CREATE TABLE public.discount_code_tiers (
  discount_code_id uuid NOT NULL REFERENCES public.discount_codes ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.ticket_tiers ON DELETE CASCADE,
  PRIMARY KEY (discount_code_id, tier_id)
);

-- Add discount_code_id to tickets for traceability
ALTER TABLE public.tickets
  ADD COLUMN discount_code_id uuid REFERENCES public.discount_codes ON DELETE SET NULL;

-- Add discount_code_id to pending_purchases for passing through webhook
ALTER TABLE public.pending_purchases
  ADD COLUMN discount_code_id uuid REFERENCES public.discount_codes ON DELETE SET NULL;
```

**Design decision: Junction table vs nullable tier_id**
Junction table is the correct approach because:
1. A code can apply to MULTIPLE specific tiers (not just one)
2. Empty junction = applies to ALL tiers of the party (clean semantics)
3. Avoids nullable columns and ambiguous NULL meaning
4. Standard many-to-many pattern

### Pattern 2: Server-side Discount Validation
**What:** Validate and compute discounted price in `purchaseTicket()` before creating SumUp checkout
**When to use:** Every ticket purchase with a discount code
**Example:**
```typescript
// In purchaseTicket() -- after tier validation, before SumUp checkout creation
async function validateAndApplyDiscount(
  supabase: SupabaseClient,
  discountCodeId: string | null,
  tierId: string,
  tierPrice: number,
  partyId: string | null
): Promise<{ finalPrice: number; discountCodeId: string | null }> {
  if (!discountCodeId) return { finalPrice: tierPrice, discountCodeId: null };

  const { data: code, error } = await supabase
    .from("discount_codes")
    .select("id, party_id, discount_type, discount_amount, max_uses, is_active")
    .eq("id", discountCodeId)
    .single();

  if (error || !code) throw new Error("Invalid discount code");
  if (!code.is_active) throw new Error("Discount code is no longer active");
  if (partyId && code.party_id !== partyId) throw new Error("Code not valid for this event");

  // Check tier applicability (junction table)
  const { data: tierRestrictions } = await supabase
    .from("discount_code_tiers")
    .select("tier_id")
    .eq("discount_code_id", code.id);

  if (tierRestrictions && tierRestrictions.length > 0) {
    const applicableTierIds = tierRestrictions.map(t => t.tier_id);
    if (!applicableTierIds.includes(tierId)) {
      throw new Error("Code not valid for this ticket tier");
    }
  }

  // Check usage limits
  if (code.max_uses !== null) {
    const { count } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("discount_code_id", code.id);

    if ((count ?? 0) >= code.max_uses) throw new Error("Discount code usage limit reached");
  }

  // Compute discounted price
  let discountedPrice: number;
  if (code.discount_type === "percentage") {
    discountedPrice = tierPrice * (1 - code.discount_amount / 100);
  } else {
    discountedPrice = tierPrice - code.discount_amount;
  }

  // Round to 2 decimal places
  discountedPrice = Math.round(discountedPrice * 100) / 100;

  // SumUp minimum EUR 1.00
  if (discountedPrice < 1.00) {
    throw new Error("Discount would bring price below minimum (EUR 1.00)");
  }

  return { finalPrice: discountedPrice, discountCodeId: code.id };
}
```

### Pattern 3: Client-side Discount Code Input in TierSelection
**What:** Collapsible "Hai un codice sconto?" input that validates code and shows discounted prices
**When to use:** Buyer-side ticket selection
**Key aspects:**
- Code validation via a new `validateDiscountCode` server action (returns applicable tiers + discount info)
- Client state: `discountCode`, `validatedDiscount` (null or { id, type, amount, applicableTierIds })
- When valid: all applicable tiers show strikethrough original price + green discounted price
- Validation is debounced or on explicit "Apply" button press (recommended: explicit button to avoid excessive server calls)

### Pattern 4: CRUD Following Tier Pattern
**What:** Reuse the exact pattern from AddTierForm/TierCard for discount codes
**When to use:** Organizer management of discount codes
**Key aspects:**
- `AddDiscountCodeForm` follows `AddTierForm` structure: form with fields, `useTransition`, server action call
- `DiscountCodeCard` follows `TierCard` structure: display mode + edit mode, PressableCard wrapper
- Server actions `createDiscountCode`, `updateDiscountCode`, `deleteDiscountCode` follow `createTier`/`updateTier`/`deleteTier` pattern
- Place BELOW tier sections on the tickets page, with heading "Discount Codes"

### Anti-Patterns to Avoid
- **Client-side price calculation only:** The discounted price MUST be validated server-side in `purchaseTicket()`. Client-side is for display only.
- **Trusting the client-sent discount amount:** Always re-compute the discounted price server-side. The client sends only `discountCodeId`, never the computed price.
- **Modifying SumUpCheckoutModal:** The modal already receives a checkoutId and doesn't know about prices. No changes needed there.
- **Modifying the webhook handler:** The webhook uses `checkout.amount` from SumUp (which is already the discounted amount). No changes needed, but `discount_code_id` must be passed through `pending_purchases` to `reserve_ticket()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Case-insensitive string comparison | Custom JS normalization | `LOWER()` in SQL + `.toLowerCase()` in JS | DB index support, consistent behavior |
| Atomic usage counting | SELECT count + INSERT in separate queries | `FOR UPDATE` lock in `reserve_ticket()` RPC | Race condition prevention |
| Price formatting | Custom string formatting | `Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })` | Already used throughout codebase |

**Key insight:** The discount validation in `purchaseTicket()` and the usage count check in `reserve_ticket()` RPC must be atomic. The RPC already uses `FOR UPDATE` locking -- extend it to also lock+check the discount code usage count before inserting the ticket.

## Common Pitfalls

### Pitfall 1: Race Condition on Usage Limits
**What goes wrong:** Two concurrent purchases with the same discount code both pass the usage limit check, resulting in over-use.
**Why it happens:** The check and insert are not atomic.
**How to avoid:** Move the usage count check INTO the `reserve_ticket()` RPC function, using a `FOR UPDATE` lock on the `discount_codes` row. This is the same pattern already used for tier quantity checking.
**Warning signs:** Usage count exceeds max_uses in the database.

### Pitfall 2: SumUp EUR 1.00 Minimum
**What goes wrong:** A discount code reduces the price to EUR 0.00 or below EUR 1.00, and SumUp rejects the checkout.
**Why it happens:** Percentage discounts on cheap tiers (e.g., 90% off a EUR 5 tier = EUR 0.50).
**How to avoid:** Validate `discountedPrice >= 1.00` server-side in `purchaseTicket()`. Also validate client-side in TierSelection for immediate feedback. If a code would bring ANY applicable tier below EUR 1.00, reject it for that specific tier (but allow it for tiers where price stays >= EUR 1.00).
**Warning signs:** SumUp API error on checkout creation.

### Pitfall 3: Discount Code on Event-Level (Master) Tickets
**What goes wrong:** Discount codes are per-party, but event-level tiers have `party_id = NULL`.
**Why it happens:** The schema ties discount codes to `party_id`, but master tickets don't belong to a party.
**How to avoid:** For v1 (this phase), discount codes apply only to party-specific tiers. Event-level (master) tiers are excluded since they're an "all-access pass" that spans multiple parties. The client should not show the discount code input for event-level TierSelection (`partyId === null`). Document this limitation clearly.
**Warning signs:** Users trying to apply codes to Event Pass tiers.

### Pitfall 4: Stale Discount Display After Code Validation
**What goes wrong:** Buyer validates a code, sees discounted prices, but by the time they click "Buy", the code has been exhausted by another user.
**Why it happens:** Time gap between client-side validation and server-side purchase.
**How to avoid:** Server-side validation in `purchaseTicket()` is the authoritative check. The client-side is informational only. If the server rejects, show a clear error message ("Discount code usage limit reached").
**Warning signs:** Error message not explaining why code was rejected.

### Pitfall 5: Discount Code ID Not Passed Through Webhook Flow
**What goes wrong:** Ticket is created without `discount_code_id` because the field isn't passed from `pending_purchases` to `reserve_ticket()`.
**Why it happens:** The webhook handler reads from `pending_purchases` and calls `reserve_ticket()` RPC. Both must include the `discount_code_id` field.
**How to avoid:** Add `discount_code_id` column to `pending_purchases`, store it in `purchaseTicket()`, pass it to `reserve_ticket()` RPC in the webhook handler.
**Warning signs:** Tickets with discounted `amount_paid` but no `discount_code_id`.

## Code Examples

### Discounted Price Display in TierSelection
```tsx
// Inside the tier button in TierSelection.tsx
<div className="shrink-0 text-right">
  {discount && applicableTierIds.includes(tier.id) ? (
    <>
      <p className="text-xs text-muted line-through">
        {formatPrice(tier.price)}
      </p>
      <p className="text-sm font-bold text-green-400">
        {formatPrice(computeDiscountedPrice(tier.price, discount))}
      </p>
    </>
  ) : (
    <p className="shrink-0 text-sm font-bold text-accent">
      {formatPrice(tier.price)}
    </p>
  )}
</div>
```

### Collapsible Discount Code Input
```tsx
// Below the tier list, above the Buy button
const [showDiscountInput, setShowDiscountInput] = useState(false);
const [discountCode, setDiscountCode] = useState("");
const [discount, setDiscount] = useState<ValidatedDiscount | null>(null);
const [discountError, setDiscountError] = useState<string | null>(null);

{/* Discount code section */}
<div className="mb-4">
  <button
    type="button"
    onClick={() => setShowDiscountInput(!showDiscountInput)}
    className="text-xs text-accent hover:text-accent-hover transition-colors"
  >
    {showDiscountInput ? "Nascondi" : "Hai un codice sconto?"}
  </button>

  {showDiscountInput && (
    <div className="mt-2 flex gap-2">
      <input
        type="text"
        value={discountCode}
        onChange={(e) => setDiscountCode(e.target.value)}
        placeholder="Inserisci codice"
        className="flex-1 rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <button
        type="button"
        onClick={handleValidateCode}
        disabled={!discountCode.trim() || isValidating}
        className="rounded-lg bg-accent/20 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
      >
        {isValidating ? "..." : "Applica"}
      </button>
    </div>
  )}

  {discount && (
    <p className="mt-1 text-xs text-green-400">
      Sconto applicato: {discount.discount_type === "percentage"
        ? `${discount.discount_amount}%`
        : `EUR ${discount.discount_amount.toFixed(2)}`}
    </p>
  )}

  {discountError && (
    <p className="mt-1 text-xs text-red-400">{discountError}</p>
  )}
</div>
```

### validateDiscountCode Server Action
```typescript
"use server";

export async function validateDiscountCode(
  partyId: string,
  code: string
): Promise<{
  id: string;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
  applicable_tier_ids: string[] | null; // null = all tiers
}> {
  const supabase = await createClient();

  const { data: discountCode, error } = await supabase
    .from("discount_codes")
    .select("id, discount_type, discount_amount, max_uses, is_active")
    .eq("party_id", partyId)
    .ilike("code", code.trim()) // case-insensitive via ilike
    .single();

  if (error || !discountCode) throw new Error("Codice non valido");
  if (!discountCode.is_active) throw new Error("Codice non piu attivo");

  // Check usage limits
  if (discountCode.max_uses !== null) {
    const { count } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("discount_code_id", discountCode.id);

    if ((count ?? 0) >= discountCode.max_uses) throw new Error("Codice esaurito");
  }

  // Check tier restrictions
  const { data: tierRestrictions } = await supabase
    .from("discount_code_tiers")
    .select("tier_id")
    .eq("discount_code_id", discountCode.id);

  const applicableTierIds = tierRestrictions && tierRestrictions.length > 0
    ? tierRestrictions.map(t => t.tier_id)
    : null;

  return {
    id: discountCode.id,
    discount_type: discountCode.discount_type as "percentage" | "fixed",
    discount_amount: discountCode.discount_amount,
    applicable_tier_ids: applicableTierIds,
  };
}
```

### Updated purchaseTicket() Signature
```typescript
// Add optional discountCodeId parameter
export async function purchaseTicket(
  partyId: string | null,
  tierId: string,
  discountCodeId?: string | null
) {
  // ... existing validation ...

  // Discount validation (only for party-specific tiers)
  let finalPrice = tier.price;
  let validatedDiscountCodeId: string | null = null;

  if (discountCodeId && partyId) {
    const result = await validateAndApplyDiscount(
      supabase, discountCodeId, tierId, tier.price, partyId
    );
    finalPrice = result.finalPrice;
    validatedDiscountCodeId = result.discountCodeId;
  }

  // SumUp checkout with finalPrice (not tier.price)
  const response = await createCheckout({
    amount: finalPrice,  // <-- discounted
    // ...
  });

  // Store discount_code_id in pending_purchases
  await serviceClient.from("pending_purchases").insert({
    // ... existing fields ...
    discount_code_id: validatedDiscountCodeId,
  });
}
```

### Updated reserve_ticket() RPC
```sql
CREATE OR REPLACE FUNCTION public.reserve_ticket(
  p_tier_id uuid,
  p_user_id uuid,
  p_event_id uuid,
  p_party_id uuid,
  p_sumup_checkout_id text,
  p_sumup_transaction_code text,
  p_amount_paid numeric,
  p_discount_code_id uuid DEFAULT NULL  -- new parameter
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_id uuid;
  v_sold_count integer;
  v_quantity integer;
  v_existing_ticket uuid;
  v_max_uses integer;
  v_current_uses integer;
BEGIN
  -- ... existing duplicate check ...
  -- ... existing tier lock + availability check ...

  -- Validate discount code usage atomically (if provided)
  IF p_discount_code_id IS NOT NULL THEN
    SELECT max_uses INTO v_max_uses
    FROM public.discount_codes
    WHERE id = p_discount_code_id AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive discount code';
    END IF;

    IF v_max_uses IS NOT NULL THEN
      SELECT COUNT(*) INTO v_current_uses
      FROM public.tickets
      WHERE discount_code_id = p_discount_code_id;

      IF v_current_uses >= v_max_uses THEN
        RAISE EXCEPTION 'Discount code usage limit reached';
      END IF;
    END IF;
  END IF;

  -- Insert ticket with discount_code_id
  INSERT INTO public.tickets (
    event_id, party_id, tier_id, user_id,
    sumup_checkout_id, sumup_transaction_code, amount_paid,
    discount_code_id
  )
  VALUES (
    p_event_id, p_party_id, p_tier_id, p_user_id,
    p_sumup_checkout_id, p_sumup_transaction_code, p_amount_paid,
    p_discount_code_id
  )
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Discount as tier (e.g., "VIP -20%") | Separate discount_codes entity | Phase 26 design decision | Clean separation, reusable codes across tiers |
| No discount tracking | `discount_code_id` on ticket record | Phase 26 | Full traceability in sales |

## Open Questions

1. **Anonymous user intent with discount code**
   - What we know: Anonymous users save a `resonate_intent` in localStorage and redirect to register. Currently intent only saves `tierId`, `partyId`, `eventSlug`.
   - What's unclear: Should the discount code be preserved in the intent so it's applied after registration?
   - Recommendation: YES -- add `discountCodeId` to the intent object. Re-validate server-side after login since the code could have expired. This is a small addition to the existing intent flow.

2. **Refund handling for discounted tickets**
   - What we know: Refunds use `sumup.transactions.refund(transactionCode, amount)`. The `amount_paid` field already stores the actual (discounted) price paid.
   - What's unclear: Should refunds refund the discounted amount or the original price?
   - Recommendation: Refund the discounted amount (what was actually paid). This is the correct behavior and already works because `amount_paid` stores the discounted price. No changes to refund logic needed.

3. **Percentage discount rounding**
   - What we know: EUR prices have 2 decimal places.
   - What's unclear: How to handle cents (e.g., 15% off EUR 10 = EUR 8.50, but 15% off EUR 7 = EUR 5.95).
   - Recommendation: `Math.round(price * 100) / 100` (round to nearest cent). Document this in the code. SumUp accepts 2 decimal places.

## Validation Architecture

> workflow.nyquist_validation is not present in config.json -- treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual testing (no test framework detected in project) |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-01 | CRUD operations for discount codes | manual | N/A (verify via UI) | N/A |
| SC-02 | Discount code input + discounted price display | manual | N/A (verify via browser) | N/A |
| SC-03 | Case-insensitive validation, EUR 1.00 guard, usage limits | manual | N/A (test with various codes in browser) | N/A |
| SC-04 | SumUp discounted checkout + ticket traceability + dashboard | manual | N/A (end-to-end purchase flow) | N/A |

### Sampling Rate
- **Per task commit:** Manual browser test of changed functionality
- **Per wave merge:** Full manual flow test (create code -> apply code -> purchase -> verify ticket record -> check sales dashboard)
- **Phase gate:** Complete end-to-end test before verification

### Wave 0 Gaps
None -- no test framework to set up (project uses manual testing).

## Integration Points Summary

### Files to MODIFY
| File | Change |
|------|--------|
| `src/app/(organizer)/organizer/events/actions.ts` | Add `discountCodeId` param to `purchaseTicket()`, validate discount, pass discounted amount to SumUp |
| `src/app/(organizer)/organizer/events/[id]/tickets/actions.ts` | Add `createDiscountCode`, `updateDiscountCode`, `deleteDiscountCode` server actions |
| `src/app/(organizer)/organizer/events/[id]/tickets/page.tsx` | Fetch discount codes, render AddDiscountCodeForm + DiscountCodeCard section |
| `src/app/(public)/events/[slug]/TierSelection.tsx` | Add discount code input, validate via server action, show discounted prices, pass discountCodeId to purchaseTicket |
| `src/app/api/webhooks/sumup/route.ts` | Pass `purchase.discount_code_id` to `reserve_ticket()` RPC |
| `src/app/(organizer)/organizer/events/[id]/sales/page.tsx` | Fetch discount usage data, pass to SalesDashboard |
| `src/components/events/SalesDashboard.tsx` | Show discount code usage (column in buyer table or summary section) |
| `src/types/database.ts` | Add `DiscountCode` and `DiscountCodeTier` interfaces, update `Ticket` with `discount_code_id` |
| `supabase/schema.sql` | Add discount_codes table, discount_code_tiers table, update tickets, update reserve_ticket() |

### Files to CREATE
| File | Purpose |
|------|---------|
| `supabase/migrations/YYYYMMDD_discount_codes.sql` | New migration for discount_codes, discount_code_tiers, column additions, RPC update, RLS policies |
| `src/components/tickets/AddDiscountCodeForm.tsx` | Form component for creating discount codes (mirrors AddTierForm) |
| `src/components/tickets/DiscountCodeCard.tsx` | Display component for existing discount codes with edit/delete (mirrors TierCard) |

### RPC Changes
The `reserve_ticket()` RPC needs a new parameter `p_discount_code_id uuid DEFAULT NULL`. Using `DEFAULT NULL` preserves backward compatibility -- existing calls without the parameter will continue to work.

### RLS Policies Needed
```sql
-- discount_codes: admin/organizer read, insert, update, delete
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY discount_codes_select ON public.discount_codes
  FOR SELECT USING (true);  -- Buyers need to read for validation

CREATE POLICY discount_codes_insert ON public.discount_codes
  FOR INSERT WITH CHECK ((SELECT public.is_admin_or_organizer()));

CREATE POLICY discount_codes_update ON public.discount_codes
  FOR UPDATE USING ((SELECT public.is_admin_or_organizer()));

CREATE POLICY discount_codes_delete ON public.discount_codes
  FOR DELETE USING ((SELECT public.is_admin_or_organizer()));

-- discount_code_tiers: same as discount_codes
ALTER TABLE public.discount_code_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY discount_code_tiers_select ON public.discount_code_tiers
  FOR SELECT USING (true);

CREATE POLICY discount_code_tiers_insert ON public.discount_code_tiers
  FOR INSERT WITH CHECK ((SELECT public.is_admin_or_organizer()));

CREATE POLICY discount_code_tiers_update ON public.discount_code_tiers
  FOR UPDATE USING ((SELECT public.is_admin_or_organizer()));

CREATE POLICY discount_code_tiers_delete ON public.discount_code_tiers
  FOR DELETE USING ((SELECT public.is_admin_or_organizer()));
```

Note: `discount_codes` SELECT policy is open (`true`) because buyers need to validate codes. The `code` column value is only useful if you know it (passaparola), so no security concern. Alternatively, validation could go through a SECURITY DEFINER function, but that adds complexity without real security benefit given the passaparola distribution model.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `purchaseTicket()` in `/organizer/events/actions.ts` -- full purchase flow understood
- Codebase analysis: `reserve_ticket()` RPC in migration `20260226300000_multi_sub_events.sql` -- atomic reservation pattern
- Codebase analysis: `TierSelection.tsx` -- buyer UI, tier display, purchase initiation
- Codebase analysis: Webhook handler `sumup/route.ts` -- checkout completion flow
- Codebase analysis: CRUD pattern from `AddTierForm.tsx`, `TierCard.tsx`, tier actions

### Secondary (MEDIUM confidence)
- SumUp SDK integration via `lib/sumup.ts` -- confirmed EUR amount passthrough
- SumUp EUR 1.00 minimum -- from project MEMORY.md documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing patterns
- Architecture: HIGH -- follows established CRUD + RPC patterns exactly
- Pitfalls: HIGH -- race conditions and SumUp minimum well-documented in codebase

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- no external dependencies changing)
