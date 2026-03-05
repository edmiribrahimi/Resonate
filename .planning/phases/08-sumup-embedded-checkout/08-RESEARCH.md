# Phase 8: SumUp Embedded Checkout - Research

**Researched:** 2026-03-05
**Domain:** SumUp Payment Widget (Card Widget) integration in Next.js 16
**Confidence:** HIGH

## Summary

SumUp offers two checkout products: **Hosted Checkout** (current implementation -- redirects user to SumUp-hosted page) and **Payment Widget / Card Widget** (embeds a payment form directly on your page). The project currently uses Hosted Checkout via `hosted_checkout: { enabled: true }` in the checkout creation payload. Migrating to the Card Widget requires three changes:

1. **Backend:** Remove `hosted_checkout` and `redirect_url` from the checkout creation payload (keep `return_url` for webhooks).
2. **Frontend:** Load the SumUp SDK script (`sdk.js`) and call `SumUpCard.mount()` with the checkout ID, rendering the payment form inline on the event page.
3. **Webhook:** The existing webhook handler (`/api/webhooks/sumup`) works unchanged -- the same `CHECKOUT_STATUS_CHANGED` event is fired regardless of checkout type.

The Card Widget is a vanilla JavaScript library loaded via `<script>` tag (not an npm package). It handles PCI compliance, 3DS/SCA authentication, and card data collection entirely within a secure iframe. No sensitive card data ever touches the merchant's server.

**Primary recommendation:** Modify `createCheckout()` to omit `hosted_checkout` and `redirect_url`, create a React component that loads the SumUp SDK and mounts the card widget in a modal/sheet overlay, and handle the `onResponse` callback to show success/failure UI inline.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUMP-01 | All payments (event tickets + drinks) use SumUp embedded widget instead of hosted checkout redirect | Card Widget SDK loaded via script tag; `SumUpCard.mount()` renders inline payment form; same checkout API used minus `hosted_checkout` param |
| SUMP-02 | Payment completes without leaving the app -- member stays on the same page throughout checkout | Card Widget renders in-page; `onResponse` callback handles success/failure without navigation; 3DS handled by widget internally |
| SUMP-03 | Existing ticket purchase webhook flow continues to work with embedded checkout | Same `return_url` parameter triggers same `CHECKOUT_STATUS_CHANGED` webhook; existing handler verifies via `getCheckout()` -- no changes needed |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SumUp Card Widget SDK | v2 | Client-side payment form | Official SumUp solution; loaded via `https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js` |
| SumUp Checkout API | v0.1 | Server-side checkout creation | Already in use; same endpoint, just omit `hosted_checkout` param |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/script` | (bundled with Next.js 16) | Load external SumUp SDK script | Use `strategy="afterInteractive"` for SDK loading |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Script tag SDK | `@sumup/sdk` npm package | The npm package is server-side only (Node.js SDK for API calls). The Card Widget is client-side only and must be loaded via script tag. They serve different purposes. |
| Custom submit button | Default widget button | Custom button gives more control over UX; use `showSubmitButton: false` + `widget.submit()` for a branded experience |

**Installation:**
No npm packages to install. The SDK is loaded at runtime via script tag. The existing `src/lib/sumup.ts` server-side module continues to work with modifications.

## Architecture Patterns

### Recommended Changes to Existing Files

```
src/
├── lib/
│   └── sumup.ts                          # MODIFY: remove hosted_checkout, redirect_url
├── app/
│   ├── api/webhooks/sumup/route.ts       # NO CHANGE: webhook handler works as-is
│   └── (public)/events/[slug]/
│       ├── TierSelection.tsx             # MODIFY: open checkout modal instead of redirect
│       ├── SumUpCheckoutModal.tsx         # NEW: modal with card widget
│       └── PendingIntentHandler.tsx       # MODIFY: open checkout modal instead of redirect
├── components/
│   └── SumUpCardWidget.tsx               # NEW: reusable widget wrapper (React)
```

### Pattern 1: SumUp SDK Loading in React (via next/script)

**What:** Load the SumUp SDK script globally using Next.js `<Script>` component.
**When to use:** In the layout or page that contains the checkout flow.

```typescript
// Source: https://developer.sumup.com/online-payments/checkouts/card-widget
// + https://nextjs.org/docs/app/api-reference/components/script

import Script from "next/script";

// In layout.tsx or the page component:
<Script
  src="https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"
  strategy="afterInteractive"
/>
```

### Pattern 2: Card Widget React Component

**What:** A reusable React component that mounts/unmounts the SumUp card widget.
**When to use:** Whenever a payment form needs to be rendered inline.

```typescript
// Source: https://github.com/sumup/sumup-checkout-examples/blob/main/frontend/react/src/App.jsx
// Adapted for TypeScript + Next.js

"use client";

import { useEffect, useRef } from "react";

// Declare global SumUpCard type
declare global {
  interface Window {
    SumUpCard?: {
      mount: (config: SumUpCardConfig) => SumUpCardInstance;
      unmount: (id: string) => void;
    };
  }
}

interface SumUpCardConfig {
  id: string;
  checkoutId: string;
  locale?: string;
  showSubmitButton?: boolean;
  showFooter?: boolean;
  showEmail?: boolean;
  email?: string;
  donateSubmitButton?: boolean;
  amount?: string;
  currency?: string;
  country?: string;
  nonce?: string;
  onResponse: (type: SumUpResponseType, body: Record<string, unknown>) => void;
  onLoad?: () => void;
}

type SumUpResponseType = "sent" | "invalid" | "auth-screen" | "error" | "success" | "fail";

interface SumUpCardInstance {
  submit: () => void;
  unmount: () => void;
  update: (config: Partial<SumUpCardConfig>) => void;
}

interface SumUpCardWidgetProps {
  checkoutId: string;
  onSuccess: (body: Record<string, unknown>) => void;
  onError: (body: Record<string, unknown>) => void;
  onLoad?: () => void;
  locale?: string;
}

export default function SumUpCardWidget({
  checkoutId,
  onSuccess,
  onError,
  onLoad,
  locale = "en-GB",
}: SumUpCardWidgetProps) {
  const instanceRef = useRef<SumUpCardInstance | null>(null);

  useEffect(() => {
    if (!checkoutId || !window.SumUpCard) return;

    // Clean up previous instance
    if (instanceRef.current) {
      instanceRef.current.unmount();
    }

    instanceRef.current = window.SumUpCard.mount({
      id: "sumup-card",
      checkoutId,
      locale,
      showFooter: false,
      onLoad,
      onResponse: (type, body) => {
        if (type === "success") {
          onSuccess(body);
        } else if (type === "error" || type === "fail") {
          onError(body);
        }
        // "sent", "invalid", "auth-screen" are intermediate states -- no action needed
      },
    });

    return () => {
      if (instanceRef.current) {
        instanceRef.current.unmount();
        instanceRef.current = null;
      }
    };
  }, [checkoutId, locale, onSuccess, onError, onLoad]);

  return <div id="sumup-card" />;
}
```

### Pattern 3: Modified Checkout Creation (Server-Side)

**What:** Remove `hosted_checkout` and `redirect_url` from checkout creation; keep `return_url` for webhooks.
**When to use:** In `src/lib/sumup.ts`.

```typescript
// BEFORE (hosted checkout):
body: JSON.stringify({
  amount: params.amount,
  currency: params.currency,
  merchant_code: process.env.SUMUP_MERCHANT_CODE,
  checkout_reference: params.checkoutReference,
  description: params.description,
  redirect_url: params.redirectUrl,       // <-- REMOVE
  return_url: params.returnUrl,           // <-- KEEP (for webhooks)
  hosted_checkout: { enabled: true },     // <-- REMOVE
}),

// AFTER (card widget):
body: JSON.stringify({
  amount: params.amount,
  currency: params.currency,
  merchant_code: process.env.SUMUP_MERCHANT_CODE,
  checkout_reference: params.checkoutReference,
  description: params.description,
  return_url: params.returnUrl,           // KEEP: triggers CHECKOUT_STATUS_CHANGED webhook
}),
```

The response no longer contains `hosted_checkout_url`. Instead, it returns a checkout `id` that is passed to `SumUpCard.mount()`.

### Pattern 4: Purchase Flow with Embedded Checkout

**What:** Server action creates checkout, returns checkout ID; client opens modal with card widget.
**When to use:** Replaces the current `window.location.href = result.checkoutUrl` redirect pattern.

```typescript
// In server action (purchaseTicket):
// BEFORE: return { success: true, checkoutUrl: response.hosted_checkout_url };
// AFTER:
return { success: true, checkoutId: response.id };

// In TierSelection.tsx client component:
// BEFORE: window.location.href = result.checkoutUrl;
// AFTER:
const result = await purchaseTicket(partyId, selectedTierId);
if (result.success && result.checkoutId) {
  setCheckoutId(result.checkoutId);  // triggers modal open
}
```

### Pattern 5: Dual Confirmation (Widget callback + Webhook)

**What:** Use `onResponse("success")` for immediate UI feedback, but rely on webhook for actual ticket creation.
**When to use:** Always. The widget callback is for UX; the webhook is the source of truth.

```typescript
// In the checkout modal's onSuccess handler:
function handlePaymentSuccess(body: Record<string, unknown>) {
  // Show success UI immediately (optimistic)
  setPaymentStatus("success");

  // Optionally poll or wait for webhook to confirm ticket creation
  // The webhook handler in /api/webhooks/sumup creates the actual ticket
  // The user can be shown "Payment received! Your ticket is being confirmed..."
}
```

### Anti-Patterns to Avoid

- **Creating tickets on widget callback:** Never create tickets/orders based on the `onResponse("success")` callback alone. The widget callback can be spoofed. Always use the server-side webhook + `getCheckout()` API verification (already implemented).
- **Storing card data:** The widget handles all card data in a secure iframe. Never attempt to access or intercept card details.
- **Omitting return_url:** If you remove `return_url` from checkout creation, webhooks stop working. Always include it.
- **Loading SDK in SSR:** The SumUp SDK is client-side only. Never import or reference `SumUpCard` in server components or server actions.
- **Double-mounting:** In React Strict Mode (dev), `useEffect` runs twice. Always unmount previous widget instance before mounting a new one.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card input form | Custom card number/CVV/expiry fields | SumUp Card Widget | PCI compliance requires SAQ-A; custom fields require SAQ-D (much stricter) |
| 3DS authentication | Custom 3DS redirect flow | SumUp Card Widget (built-in) | Widget handles 3DS1/3DS2 automatically with bank fallback |
| Payment form styling | Custom CSS from scratch | Widget's `data-sumup-id` CSS selectors | Widget provides standard selectors for customization |
| Checkout status polling | Custom polling loop | Webhook + `getCheckout()` | Already implemented in webhook handler; reliable and SumUp-recommended |

**Key insight:** The entire value of the Card Widget is that it's a PCI-compliant black box. Any attempt to "customize" by intercepting card data or building custom forms defeats the purpose and creates compliance liability.

## Common Pitfalls

### Pitfall 1: SDK Not Loaded When Component Mounts
**What goes wrong:** `window.SumUpCard` is undefined when the React component tries to mount the widget.
**Why it happens:** The `<Script>` tag hasn't finished loading when the component's `useEffect` fires.
**How to avoid:** Use `next/script` with `onLoad` callback, or add a check/retry loop. Alternatively, use `strategy="beforeInteractive"` if the SDK must be available immediately (slight performance cost).
**Warning signs:** "Cannot read properties of undefined (reading 'mount')" error in console.

### Pitfall 2: Widget Not Unmounting on Component Cleanup
**What goes wrong:** Multiple widget instances render, causing visual glitches or duplicate payment submissions.
**Why it happens:** React Strict Mode double-mounts in development; navigation between pages doesn't clean up properly.
**How to avoid:** Always call `widget.unmount()` in the `useEffect` cleanup function. Store the widget instance in a `useRef`.
**Warning signs:** Two payment forms visible, or "SumUp card already mounted" type errors.

### Pitfall 3: Trusting Widget Callback for Business Logic
**What goes wrong:** Ticket/order created based on client-side `onResponse("success")`, which can be spoofed.
**Why it happens:** Developer treats the callback as authoritative instead of the webhook.
**How to avoid:** Use `onResponse("success")` for UI only. The webhook handler already verifies via `getCheckout()` API -- this is correct.
**Warning signs:** Tickets created without corresponding SumUp transaction records.

### Pitfall 4: Missing return_url in Checkout Creation
**What goes wrong:** Webhook is never fired; tickets are never created despite successful payment.
**Why it happens:** When removing `hosted_checkout` and `redirect_url`, developer accidentally removes `return_url` too.
**How to avoid:** Keep `return_url` pointing to `/api/webhooks/sumup`. This is the webhook registration mechanism.
**Warning signs:** Payments succeed in SumUp dashboard but no ticket created in app.

### Pitfall 5: CSP Blocking the Widget
**What goes wrong:** Widget iframe doesn't load or card form is blank.
**Why it happens:** Content Security Policy headers block `*.sumup.com` domains.
**How to avoid:** Whitelist `https://*.sumup.com` in connect-src, `https://gateway.sumup.com` in script-src and frame-src, and `https://static.sumup.com` + `data:` in img-src.
**Warning signs:** CSP violation errors in browser console; blank widget container.

### Pitfall 6: Checkout Expiration
**What goes wrong:** User opens the payment modal, waits too long, then payment fails.
**Why it happens:** SumUp checkouts expire (typically after 10 minutes for card widget, 30 minutes for hosted).
**How to avoid:** Create the checkout only when the user clicks "Buy", not when the page loads. Show a "session expired" message and offer to retry.
**Warning signs:** "Checkout expired" or "EXPIRED" status errors.

## Code Examples

### Complete Checkout Modal Component (Verified Pattern)

```typescript
// Source: Official SumUp React example + project conventions
// https://github.com/sumup/sumup-checkout-examples/blob/main/frontend/react/src/App.jsx

"use client";

import { useState, useCallback } from "react";
import SumUpCardWidget from "@/components/SumUpCardWidget";

interface CheckoutModalProps {
  checkoutId: string;
  onClose: () => void;
  onPaymentComplete: () => void;
}

export default function SumUpCheckoutModal({
  checkoutId,
  onClose,
  onPaymentComplete,
}: CheckoutModalProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "processing" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSuccess = useCallback(() => {
    setStatus("success");
    // Wait briefly then notify parent
    setTimeout(() => onPaymentComplete(), 2000);
  }, [onPaymentComplete]);

  const handleError = useCallback((body: Record<string, unknown>) => {
    setStatus("error");
    setErrorMessage((body.message as string) || "Payment failed. Please try again.");
  }, []);

  const handleLoad = useCallback(() => {
    setStatus("ready");
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {status === "success" ? "Payment Successful" : "Complete Payment"}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            Close
          </button>
        </div>

        {status === "success" ? (
          <div className="text-center py-8">
            <p className="text-green-400 font-medium">Payment received!</p>
            <p className="text-sm text-muted mt-2">Your ticket is being confirmed...</p>
          </div>
        ) : (
          <>
            {status === "loading" && (
              <p className="text-sm text-muted mb-4">Loading payment form...</p>
            )}
            {errorMessage && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-4">
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
            )}
            <SumUpCardWidget
              checkoutId={checkoutId}
              onSuccess={handleSuccess}
              onError={handleError}
              onLoad={handleLoad}
            />
          </>
        )}
      </div>
    </div>
  );
}
```

### Modified createCheckout Function

```typescript
// Source: Current src/lib/sumup.ts + SumUp API docs

export async function createCheckout(params: {
  amount: number;
  currency: string;
  description: string;
  checkoutReference: string;
  returnUrl: string;  // Webhook URL -- keep this
  // redirectUrl removed -- no longer needed
  // hosted_checkout removed -- not used with card widget
}) {
  const response = await fetch(`${SUMUP_API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      merchant_code: process.env.SUMUP_MERCHANT_CODE,
      checkout_reference: params.checkoutReference,
      description: params.description,
      return_url: params.returnUrl,
      // No hosted_checkout -- this makes it a card widget checkout
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`SumUp checkout creation failed: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<{
    id: string;
    // hosted_checkout_url no longer returned
    status: string;
    checkout_reference: string;
  }>;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hosted Checkout (redirect) | Card Widget (embedded) | Available since SDK v2 | No page redirect; better UX; same backend |
| REST API v0.2 (process checkout) | Card Widget handles payment | SDK v2 | Client never touches card data; simpler PCI compliance |
| Custom 3DS redirect | Widget-managed 3DS | SDK v2 | Automatic 3DS1/3DS2 with bank fallback |

**Deprecated/outdated:**
- **REST API v0.2 process checkout:** Directly submitting card data via API requires more PCI compliance. Card Widget is the recommended approach for web merchants.
- **Hosted Checkout:** Not deprecated, but the Card Widget provides a better embedded experience without redirects.

## Open Questions

1. **Checkout Expiration Time for Card Widget**
   - What we know: Hosted checkout sessions expire after 30 minutes. Card widget checkouts likely have a shorter window.
   - What's unclear: Exact timeout for card widget checkouts (not documented explicitly).
   - Recommendation: Create checkout on-demand (when user clicks Buy), not on page load. Handle expired checkout gracefully with retry.

2. **Google Pay Support**
   - What we know: Card Widget supports Google Pay via `googlePay: { merchantId, merchantName }` config.
   - What's unclear: Whether the project wants to enable Google Pay (requires Google merchant registration).
   - Recommendation: Defer to a future phase. The card widget works without it.

3. **Drink Orders and Webhook Handling**
   - What we know: The existing webhook handles ticket purchases. DRNK-04 requires drink purchases via the same embedded checkout.
   - What's unclear: Whether drink orders should use the same webhook endpoint or a separate one.
   - Recommendation: Use the same webhook endpoint. Differentiate by `checkout_reference` prefix or a `purchase_type` field in `pending_purchases` table. This is a Phase 9+ concern but relevant for architecture.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected -- no test framework configured |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUMP-01 | createCheckout omits hosted_checkout param | unit | N/A | No -- Wave 0 |
| SUMP-01 | SumUpCardWidget mounts with checkoutId | manual-only | Visual: open event page, click Buy | N/A |
| SUMP-02 | Payment completes without page navigation | manual-only | Visual: complete payment in widget | N/A |
| SUMP-03 | Webhook creates ticket after card widget payment | integration | N/A | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** Manual visual verification (embedded widget renders, payment completes)
- **Per wave merge:** End-to-end test with SumUp test card
- **Phase gate:** Full manual test with test card payment through widget

### Wave 0 Gaps
- No test framework is configured in this project
- SUMP-01 and SUMP-03 could be unit/integration tested if a test framework were added
- Given the project has no existing tests, manual verification is the practical approach for this phase
- Justification for manual-only: SumUp card widget is an external iframe -- cannot be unit tested; webhook flow requires real SumUp API calls

## Sources

### Primary (HIGH confidence)
- [SumUp Payment Widget official docs](https://developer.sumup.com/online-payments/checkouts/card-widget) -- SDK loading, mount configuration, callbacks, CSP, full API
- [SumUp Checkout Examples (React)](https://github.com/sumup/sumup-checkout-examples/blob/main/frontend/react/src/App.jsx) -- Official React implementation pattern with mount/unmount lifecycle
- [SumUp Checkout Examples (Node.js)](https://github.com/sumup/sumup-checkout-examples/blob/main/backend/node/index.js) -- Checkout creation without hosted_checkout param
- [SumUp Hosted Checkout docs](https://developer.sumup.com/online-payments/checkouts/hosted-checkout) -- Confirms `hosted_checkout: { enabled: true }` is the toggle for hosted mode
- [SumUp Webhooks docs](https://developer.sumup.com/online-payments/webhooks) -- `return_url` triggers `CHECKOUT_STATUS_CHANGED`; same for both checkout types

### Secondary (MEDIUM confidence)
- [SumUp Accept a Payment guide](https://developer.sumup.com/online-payments/guides/single-payment) -- Checkout creation API payload structure
- [Next.js Script component docs](https://nextjs.org/docs/app/api-reference/components/script) -- `strategy="afterInteractive"` for external SDK loading

### Tertiary (LOW confidence)
- [SitePoint forum: Card widget transaction failures](https://www.sitepoint.com/community/t/most-transactions-fails-when-using-sumup-card-payment-widget-sdk-or-rest-api-v0-2-in-sumup/412917) -- Reports of v0.2 API failures; unresolved. The project uses v0.1 API which is stable.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Verified via official docs, GitHub examples, and existing codebase analysis
- Architecture: HIGH -- React pattern verified from official SumUp React example; checkout creation difference confirmed from Node.js example
- Pitfalls: HIGH -- CSP, webhook, and lifecycle issues documented in official docs; double-mount issue is well-known React pattern

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (30 days -- stable API, SDK v2 is mature)
