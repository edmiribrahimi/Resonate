# Phase 9: Drink Menu & Purchase - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Add per-event drink menu management and drink purchase flow using the SumUp embedded checkout from Phase 8. Organizers configure drink items (name + price) per event. Authenticated members see the drink menu on the event page, select drinks, pay via embedded checkout, and receive individual redeemable tokens. The webhook handler is extended to process drink payments alongside existing ticket payments.

</domain>

<decisions>
## Implementation Decisions

### Database Schema
- `drink_items` table per event: id, event_id, name, price, sort_order, is_available, created_at, updated_at
- `drink_orders` table: id, event_id, user_id (nullable for Phase 11 guest purchases), sumup_checkout_id, total_amount, status (pending|completed|failed|expired), created_at, updated_at
- `drink_tokens` table: id, order_id, event_id, user_id (nullable), drink_item_id, drink_name, price, token (crypto UUID), status (purchased|redeemed), redeemed_at, created_at
- user_id nullable now to avoid schema migration in Phase 11 (guest purchases)

### Purchase Flow
- Server action `purchaseDrinks(eventId, items: {drinkItemId, quantity}[])` creates SumUp checkout + drink_orders record
- Webhook handler extended: tries pending_purchases first (tickets), then drink_orders (drinks)
- On successful drink payment: webhook creates individual drink_tokens (DRNK-06: 2 beers = 2 tokens)
- Reuses SumUpCheckoutModal from Phase 8

### Organizer UI
- Drink menu management on event edit page (new tab/section)
- CRUD for drink items: name, price, availability toggle
- Follows existing EventForm patterns

### Event Page Integration
- New "Drinks" section on event detail page, below parties section
- DrinkMenu client component with quantity selectors and "Order Drinks" button
- Opens SumUpCheckoutModal on purchase

### Claude's Discretion
- Exact placement of Drinks section on event page
- Drink item card design
- Whether to use a dedicated drinks tab or inline section in organizer UI
- Quantity selector UX (stepper vs dropdown)
- Order summary display before checkout

</decisions>

<specifics>
## Specific Ideas

- Webhook differentiation: check `drink_orders` table by `sumup_checkout_id` if not found in `pending_purchases`
- drink_tokens.token uses `crypto.randomUUID()` (same as ticket checkout references)
- drink_tokens.drink_name stores the name at purchase time (denormalized, in case menu item name changes later)
- RLS: drink_items readable by all authenticated; writable by organizer/admin only
- RLS: drink_orders and drink_tokens readable by owner (user_id match); writable by service role only
- Migration should create `create_drink_tokens` PL/pgSQL function (similar to `reserve_ticket`)

</specifics>

<deferred>
## Deferred Ideas

- Drink categories/photos — out of scope per REQUIREMENTS.md
- Inventory tracking — out of scope
- Refunds — manual via SumUp dashboard

</deferred>

---

*Phase: 09-drink-menu-purchase*
*Context gathered: 2026-03-06*
