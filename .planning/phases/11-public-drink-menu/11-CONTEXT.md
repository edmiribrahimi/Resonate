# Phase 11: Public Drink Menu - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a publicly accessible drink menu page per event (`/events/[slug]/menu`) that anyone can reach by scanning a QR code. Guests can browse the drink menu and purchase drinks via SumUp embedded checkout without logging in. After payment, drink tokens are displayed on the page and persisted in localStorage for session recovery. Organizers/admins see a downloadable QR code pointing to this page.

</domain>

<decisions>
## Implementation Decisions

### Guest Identity
- Guest purchases are **fully anonymous** — no email, phone, or name collected
- Before checkout, a **modal warns** the guest that tokens will be lost if browser data is cleared, and **suggests login** to protect their purchase
- A **persistent banner** on the menu page also suggests login for better token safety
- If the guest dismisses and proceeds without login, the purchase continues with `user_id: null`

### Token Persistence (Guest)
- After payment, tokens are stored in **localStorage** keyed by event + order ID
- The page URL is updated to include `?order=<order_id>` — guest can **bookmark** this URL as a fallback
- On page load, token retrieval order: URL `order` param -> localStorage -> (nothing)
- **If guest clears browser data AND loses the URL** -> tokens are lost, no further recovery. This is an accepted tradeoff for anonymous access

### QR Code for Organizers
- QR code pointing to `/events/[slug]/menu` is visible in **two places**:
  1. On the public `/events/[slug]/menu` page itself — **only visible to authenticated organizer/admin**
  2. On the organizer event management page (drink menu section)
- QR code is **downloadable** (PNG/SVG) for printing and posting at the event venue

### Menu Page Content
- Publicly accessible, no authentication required
- Shows: event name, date, and drink list with prices
- Reuses `DrinkMenu` component pattern (quantity selectors + order button)
- Reuses `SumUpCheckoutModal` for embedded payment
- After purchase: "Your Drinks" section appears with `DrinkTokenCard` components

### Redemption Flow (Guest)
- Same flow as authenticated members: **3-second countdown + SERVED animation**
- Guest redeems directly on the `/events/[slug]/menu` page
- Redemption calls server action with the cryptographic token (HMAC-verified, no user_id needed)

### Checkout Flow (Guest)
- New server action or API route for guest drink purchases (no auth required)
- Creates `drink_orders` with `user_id: null`
- Webhook fulfillment already supports null `user_id` — no webhook changes needed
- Token signing (HMAC) works independently of user identity

### Claude's Discretion
- Menu page layout and visual design (standalone branded page feel)
- Banner and modal copy/styling for login suggestion
- QR code component implementation (library choice, download format)
- How localStorage keys are structured
- Loading/error states on the public menu page
- Whether to show event cover image on menu page

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/(public)/events/[slug]/DrinkMenu.tsx`: Quantity selectors + order flow — reuse pattern for guest menu
- `src/app/(public)/events/[slug]/SumUpCheckoutModal.tsx`: Embedded payment modal — fully reusable, no auth dependency
- `src/app/(public)/events/[slug]/DrinkTokenCard.tsx`: Token card with redeem button — fully reusable
- `src/app/(public)/events/[slug]/RedeemConfirmationModal.tsx`: 3-second countdown + SERVED animation — fully reusable
- `src/app/(public)/events/[slug]/MyDrinks.tsx`: Token display section — reusable pattern
- `src/utils/qr.ts`: `generateTicketToken()` / `verifyTicketToken()` — HMAC signing, already used for drink tokens

### Database Ready
- `drink_orders.user_id` — already nullable (prepared in Phase 9)
- `drink_tokens.user_id` — already nullable
- `fulfill_drink_order` RPC — works with null user_id
- Webhook handler — already routes drink orders by `sumup_checkout_id`, no user dependency

### Changes Needed
- `purchaseDrinks` server action currently requires auth — need guest-accessible alternative
- RLS policies on `drink_tokens` require `auth.uid() = user_id` — guest tokens (null user_id) need alternative access path (service-role fetch by order_id, or new policy)
- `drink_items` RLS currently `TO authenticated` — need public read access for unauthenticated guests
- New route: `/events/[slug]/menu/page.tsx` (does not exist yet)

### Integration Points
- Event page drink section (line ~682 in page.tsx) — no changes needed, stays auth-gated
- Organizer event management — add QR code display in drink menu section

</code_context>

<specifics>
## Specific Ideas

- localStorage key pattern: `resonate_drink_tokens_{event_id}_{order_id}`
- After webhook fulfills order, guest page polls or uses optimistic UI to show tokens
- QR code encodes full URL: `https://{domain}/events/{slug}/menu`
- Guest redemption server action: verify HMAC token -> call `redeem_drink_token` RPC (same as member flow, no user_id check needed)
- Menu page should feel like a standalone experience — guest may never see the rest of the site

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-public-drink-menu*
*Context gathered: 2026-03-06*
