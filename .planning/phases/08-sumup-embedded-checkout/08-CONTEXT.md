# Phase 8: SumUp Embedded Checkout - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace SumUp hosted checkout redirect with an embedded card widget so all payments happen inline without leaving the app. The existing webhook-based payment confirmation flow must continue working unchanged. This phase prepares a reusable embedded checkout component that Phase 9 (drink purchases) and Phase 10 (drink redemption) will also use.

</domain>

<decisions>
## Implementation Decisions

### Checkout Flow
- Payment form appears in a modal overlay on the event detail page -- member never navigates away
- Modal opens after the server action creates a checkout and returns the checkout ID
- Widget callback (`onResponse("success")`) shows optimistic success UI; actual ticket creation still happens via webhook
- After payment success, modal shows "Payment received! Your ticket is being confirmed..." then closes

### Widget Integration
- SumUp Card Widget SDK loaded via `next/script` with `strategy="afterInteractive"` in root layout (available site-wide for future drink purchases too)
- A reusable `SumUpCardWidget` component wraps the SDK mount/unmount lifecycle for React
- A `SumUpCheckoutModal` component provides the modal UI around the widget

### Backward Compatibility
- The webhook handler (`/api/webhooks/sumup/route.ts`) requires NO changes -- same `CHECKOUT_STATUS_CHANGED` event, same `getCheckout()` verification
- The `pending_purchases` table and `reserve_ticket` RPC function work identically
- The anonymous user intent flow (localStorage → register → auto-execute) still works, but opens modal instead of redirecting

### Claude's Discretion
- Exact modal animation and close behavior
- Whether to use `showSubmitButton: true` (default SumUp button) or `showSubmitButton: false` + custom submit button
- How to handle the loading state while SDK initializes
- Success UI timing (how long to show success before auto-closing modal)
- Whether PendingIntentHandler renders its own modal or communicates checkoutId to parent

</decisions>

<specifics>
## Specific Ideas

- `src/lib/sumup.ts` createCheckout() currently sends `hosted_checkout: { enabled: true }` and `redirect_url` -- both must be removed; `return_url` stays for webhooks
- `purchaseTicket()` in actions.ts currently returns `{ checkoutUrl: response.hosted_checkout_url }` -- change to `{ checkoutId: response.id }`
- `TierSelection.tsx` currently does `window.location.href = result.checkoutUrl` -- change to open SumUpCheckoutModal with checkoutId
- `PendingIntentHandler.tsx` currently does `window.location.href = result.checkoutUrl` -- change to open SumUpCheckoutModal with checkoutId
- SumUp Card Widget SDK URL: `https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js`
- SDK exposes `window.SumUpCard.mount()` globally -- TypeScript declarations needed
- React Strict Mode double-mounts in dev -- widget must unmount cleanly via useRef

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 08-sumup-embedded-checkout*
*Context gathered: 2026-03-05*
