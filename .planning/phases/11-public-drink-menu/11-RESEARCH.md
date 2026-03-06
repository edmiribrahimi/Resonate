# Phase 11: Public Drink Menu - Research

**Researched:** 2026-03-06
**Domain:** Guest purchase flow, QR code generation, Supabase RLS for anonymous access, localStorage persistence
**Confidence:** HIGH

## Summary

This phase adds a publicly accessible drink menu page at `/events/[slug]/menu` where unauthenticated guests can browse drinks, purchase via SumUp, view their tokens, and redeem them. The codebase already has all the building blocks: `DrinkMenu`, `SumUpCheckoutModal`, `DrinkTokenCard`, `RedeemConfirmationModal`, and `MyDrinks` components. The database schema supports `null` user_id on both `drink_orders` and `drink_tokens`. The webhook fulfillment (`fulfill_drink_order` RPC) works without user identity. The main gaps are: (1) a guest-accessible server action or API route for purchasing, (2) RLS policy changes for public read on `drink_items` and token retrieval by `order_id`, (3) QR code component for organizers, and (4) localStorage-based token persistence for guests.

**Primary recommendation:** Create a dedicated `purchaseDrinksGuest` server action (no auth required) in a new file under the menu route, modify `redeemDrinkToken` to skip user_id ownership check when token has `user_id = null`, add `TO anon` RLS policies for `drink_items` SELECT, use a service-role API route for guest token retrieval by order_id, and use `qrcode.react` (already pattern-compatible with the project) for QR code generation.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Guest purchases are **fully anonymous** -- no email, phone, or name collected
- Before checkout, a **modal warns** the guest that tokens will be lost if browser data is cleared, and **suggests login** to protect their purchase
- A **persistent banner** on the menu page also suggests login for better token safety
- If the guest dismisses and proceeds without login, the purchase continues with `user_id: null`
- After payment, tokens are stored in **localStorage** keyed by event + order ID
- The page URL is updated to include `?order=<order_id>` -- guest can **bookmark** this URL as a fallback
- On page load, token retrieval order: URL `order` param -> localStorage -> (nothing)
- If guest clears browser data AND loses the URL -> tokens are lost. Accepted tradeoff
- QR code pointing to `/events/[slug]/menu` is visible in two places: (1) on the public menu page only for authenticated organizer/admin, (2) on the organizer event management page
- QR code is downloadable (PNG/SVG) for printing
- Publicly accessible, no authentication required
- Shows: event name, date, and drink list with prices
- Reuses DrinkMenu component pattern (quantity selectors + order button)
- Reuses SumUpCheckoutModal for embedded payment
- After purchase: "Your Drinks" section appears with DrinkTokenCard components
- Same redemption flow as authenticated members: 3-second countdown + SERVED animation
- Guest redeems directly on the `/events/[slug]/menu` page
- New server action or API route for guest drink purchases (no auth required)
- Creates `drink_orders` with `user_id: null`
- Webhook fulfillment already supports null `user_id` -- no webhook changes needed
- Token signing (HMAC) works independently of user identity

### Claude's Discretion
- Menu page layout and visual design (standalone branded page feel)
- Banner and modal copy/styling for login suggestion
- QR code component implementation (library choice, download format)
- How localStorage keys are structured
- Loading/error states on the public menu page
- Whether to show event cover image on menu page

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qrcode.react | ^4.2.0 | QR code rendering in React components | Most popular React QR library (8M+ weekly downloads), supports SVG and Canvas, lightweight, maintained |
| Next.js 16.1.6 | (already installed) | App Router, Server Actions, API Routes | Project framework |
| @supabase/supabase-js | ^2.97.0 | (already installed) Database access, RLS, RPC calls | Project database layer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| qrcode | ^1.5.4 | (already installed) Server-side QR generation | Already used in webhook for ticket QR codes; NOT needed for this phase's client-side QR |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| qrcode.react | react-qr-code | Slightly simpler API but fewer features; qrcode.react has better Canvas support for PNG download |
| qrcode.react | @devmehq/react-qr-code | More features but less popular and less maintained |

**Installation:**
```bash
npm install qrcode.react
```

Note: the project already has `qrcode` (server-side, Node.js) installed. `qrcode.react` is a separate package for client-side React rendering.

## Architecture Patterns

### Recommended Project Structure
```
src/app/(public)/events/[slug]/menu/
  page.tsx                    # Server component: fetches event + drinks, renders page
  GuestDrinkMenu.tsx          # Client component: quantity selectors + order (fork of DrinkMenu)
  GuestDrinkActions.ts        # "use server" - purchaseDrinksGuest, redeemDrinkTokenGuest
  GuestTokenDisplay.tsx       # Client component: shows tokens from localStorage/API
  GuestLoginBanner.tsx        # Persistent banner suggesting login
  GuestWarningModal.tsx       # Pre-checkout warning modal
  EventQRCode.tsx             # QR code display + download (organizer-only visibility)

src/app/api/drinks/tokens/route.ts  # GET handler: fetch tokens by order_id (service-role)
```

### Pattern 1: Guest Server Action (No Auth)

**What:** A server action that creates a drink order without requiring authentication. Mirrors `purchaseDrinks` but skips the auth check and sets `user_id: null`.

**When to use:** Guest (unauthenticated) checkout flow.

**Example:**
```typescript
// src/app/(public)/events/[slug]/menu/GuestDrinkActions.ts
"use server";

import { getServiceClient } from "@/lib/supabase/service";
import { createCheckout } from "@/lib/sumup";

export async function purchaseDrinksGuest(
  eventId: string,
  items: { drinkItemId: string; quantity: number }[]
): Promise<{ success: boolean; checkoutId: string; orderId: string }> {
  const serviceClient = getServiceClient();

  // Fetch drink items (service-role bypasses RLS)
  const { data: drinkItems, error: fetchError } = await serviceClient
    .from("drink_items")
    .select("*")
    .in("id", items.map((i) => i.drinkItemId))
    .eq("event_id", eventId)
    .eq("is_available", true);

  if (fetchError || !drinkItems || drinkItems.length !== items.length) {
    throw new Error("One or more drink items not found");
  }

  // Validate and calculate total (same logic as purchaseDrinks)
  const drinkMap = new Map(drinkItems.map((d) => [d.id, d]));
  let totalAmount = 0;
  const itemsSnapshot = items.map((item) => {
    const drink = drinkMap.get(item.drinkItemId)!;
    totalAmount += drink.price * item.quantity;
    return {
      drink_item_id: drink.id,
      drink_name: drink.name,
      price: drink.price,
      quantity: item.quantity,
    };
  });

  // Fetch event title
  const { data: event } = await serviceClient
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();

  if (!event) throw new Error("Event not found");

  // Create SumUp checkout
  const checkoutReference = crypto.randomUUID();
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/sumup`;
  const response = await createCheckout({
    amount: totalAmount,
    currency: "EUR",
    description: `${event.title} - Drinks`,
    checkoutReference,
    returnUrl,
  });

  // Create drink order with user_id: null
  const { data: order, error: insertError } = await serviceClient
    .from("drink_orders")
    .insert({
      event_id: eventId,
      user_id: null,
      sumup_checkout_id: response.id,
      total_amount: totalAmount,
      status: "pending",
      items: itemsSnapshot,
    })
    .select("id")
    .single();

  if (insertError || !order) {
    throw new Error("Failed to initiate drink purchase");
  }

  return { success: true, checkoutId: response.id, orderId: order.id };
}
```

**Key difference from `purchaseDrinks`:** Returns `orderId` in addition to `checkoutId`. The guest client needs the `orderId` to store in localStorage and update the URL for token recovery.

### Pattern 2: Guest Token Retrieval via API Route

**What:** An API route that fetches drink tokens by `order_id` using the service-role client (bypasses RLS entirely). This is safer and simpler than modifying RLS policies on `drink_tokens`.

**When to use:** After guest payment completes, the client calls this API with the order_id to retrieve tokens.

**Example:**
```typescript
// src/app/api/drinks/tokens/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order_id");
  if (!orderId) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  // Validate UUID format to prevent injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    return NextResponse.json({ error: "Invalid order_id" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Verify order exists and is completed
  const { data: order } = await supabase
    .from("drink_orders")
    .select("id, status, user_id")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Only allow guest token retrieval (user_id is null)
  // Authenticated users should use the normal RLS-gated flow
  if (order.user_id !== null) {
    return NextResponse.json({ error: "Use authenticated flow" }, { status: 403 });
  }

  const { data: tokens } = await supabase
    .from("drink_tokens")
    .select("id, drink_name, price, token, status, redeemed_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ tokens: tokens ?? [], orderStatus: order.status });
}
```

**Why API route instead of RLS changes:** The `order_id` is a UUID that acts as a capability token -- knowing it proves you placed the order. However, modifying RLS to allow `anon` users to SELECT tokens by `order_id` would expose ALL tokens (including authenticated users' tokens) to anyone who guesses/knows an order_id. Using a service-role API route with the explicit `user_id IS NULL` guard is more secure and more targeted.

### Pattern 3: Guest Token Redemption

**What:** Guest redemption works almost identically to authenticated redemption. The HMAC-signed token is the authorization -- no user_id needed. The `redeem_drink_token` RPC function is `SECURITY DEFINER` and does not check user_id at all.

**When to use:** Guest taps "Redeem" on their token card.

**Current problem:** `redeemDrinkToken` in `actions.ts` requires auth and checks `token.user_id !== user.id`. For guest tokens (`user_id = null`), this fails.

**Solution:** Create a separate `redeemDrinkTokenGuest` action that:
1. Verifies HMAC signature (same as authenticated flow)
2. Fetches token via service-role (bypasses RLS)
3. Confirms `user_id IS NULL` (only works for guest tokens)
4. Confirms status is `purchased`
5. Calls `redeem_drink_token` RPC

```typescript
// In GuestDrinkActions.ts
export async function redeemDrinkTokenGuest(
  signedToken: string
): Promise<{ success: true }> {
  const tokenId = verifyTicketToken(signedToken);
  if (!tokenId) throw new Error("Invalid token signature");

  const serviceClient = getServiceClient();

  const { data: token, error } = await serviceClient
    .from("drink_tokens")
    .select("id, user_id, status")
    .eq("id", tokenId)
    .single();

  if (error || !token) throw new Error("Token not found");

  // Guard: only guest tokens (user_id is null)
  if (token.user_id !== null) {
    throw new Error("Use authenticated redemption flow");
  }

  if (token.status === "redeemed") throw new Error("Already redeemed");

  const { error: rpcError } = await serviceClient.rpc("redeem_drink_token", {
    p_token_id: tokenId,
  });

  if (rpcError) throw new Error("Redemption failed");

  return { success: true };
}
```

### Pattern 4: QR Code Component with Download

**What:** A React component using `qrcode.react` that renders a QR code and provides download buttons for PNG and SVG.

**When to use:** Organizer/admin views (menu page + organizer management page).

**Example:**
```typescript
// src/app/(public)/events/[slug]/menu/EventQRCode.tsx
"use client";

import { useRef, useCallback } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";

interface EventQRCodeProps {
  url: string;
  eventTitle: string;
}

export default function EventQRCode({ url, eventTitle }: EventQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const downloadPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${eventTitle}-menu-qr.png`;
    link.href = dataUrl;
    link.click();
  }, [eventTitle]);

  const downloadSVG = useCallback(() => {
    // Render an off-screen SVG and serialize it
    const svgElement = document.querySelector("[data-qr-svg]");
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${eventTitle}-menu-qr.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [eventTitle]);

  return (
    <div>
      {/* Visible SVG for display */}
      <QRCodeSVG
        value={url}
        size={200}
        level="H"
        data-qr-svg=""
        marginSize={2}
      />

      {/* Hidden canvas for PNG download */}
      <div className="hidden">
        <QRCodeCanvas
          ref={canvasRef}
          value={url}
          size={400}
          level="H"
          marginSize={2}
        />
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={downloadPNG}>Download PNG</button>
        <button onClick={downloadSVG}>Download SVG</button>
      </div>
    </div>
  );
}
```

**Why dual rendering:** SVG for sharp on-screen display + Canvas for high-resolution PNG export (400px for print quality).

### Pattern 5: localStorage Persistence for Guest Tokens

**What:** Store drink order/token references in localStorage keyed by event and order ID, with URL param fallback.

**Example:**
```typescript
// Key pattern (from CONTEXT.md)
const STORAGE_KEY_PREFIX = "resonate_drink_tokens";

// Store after successful payment
function storeGuestOrder(eventId: string, orderId: string) {
  const key = `${STORAGE_KEY_PREFIX}_${eventId}`;
  const existing = JSON.parse(localStorage.getItem(key) || "[]") as string[];
  if (!existing.includes(orderId)) {
    existing.push(orderId);
    localStorage.setItem(key, JSON.stringify(existing));
  }
}

// Retrieve on page load
function getGuestOrderIds(eventId: string): string[] {
  const key = `${STORAGE_KEY_PREFIX}_${eventId}`;
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as string[];
  } catch {
    return [];
  }
}

// URL param extraction
function getOrderIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("order");
}
```

**Key design decisions:**
- Store an **array** of order IDs per event (guest may purchase multiple times)
- URL param `?order=<id>` contains only the **most recent** order ID (for bookmark recovery)
- On page load: merge order IDs from URL + localStorage, deduplicate, fetch tokens for all

### Anti-Patterns to Avoid
- **Don't store actual tokens in localStorage:** Store only order IDs. Actual token data (with HMAC signatures) is fetched from the API each time. This prevents stale data (e.g., token already redeemed on another device).
- **Don't modify RLS on `drink_tokens` for `anon` role:** This would expose all guest tokens to anyone. Use service-role API route instead.
- **Don't create a separate guest checkout page:** The menu page IS the guest page. Authenticated users seeing the menu page should be directed to the main event page for a better experience.
- **Don't poll for token readiness:** The SumUp widget fires `onSuccess` synchronously. After payment success, wait a brief moment (2-3 seconds) then fetch tokens. If order is still `pending`, show a retry button.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code rendering | Custom SVG/Canvas QR encoder | `qrcode.react` QRCodeSVG/QRCodeCanvas | QR encoding is complex (error correction levels, masking, version selection) |
| QR download | Custom image export | Canvas `toDataURL()` + SVG serialization | Browser-native APIs, no library needed |
| HMAC token signing | Custom crypto | Existing `generateTicketToken`/`verifyTicketToken` in `src/utils/qr.ts` | Already proven, used for tickets and drink tokens |
| Checkout flow | Custom payment form | Existing `SumUpCheckoutModal` + `SumUpCardWidget` | Already handles load, success, error states |
| Token redemption UI | Custom countdown/animation | Existing `RedeemConfirmationModal` | 3-second countdown + SERVED animation already built |

**Key insight:** Almost all UI components already exist. This phase is primarily about wiring them up for unauthenticated access and adding the QR/localStorage layer.

## Common Pitfalls

### Pitfall 1: Race Condition Between Payment Success and Token Availability
**What goes wrong:** Guest pays, SumUp widget fires `onSuccess`, client immediately fetches tokens -- but the webhook hasn't fired yet, so `drink_orders.status` is still `pending` and no tokens exist.
**Why it happens:** SumUp widget success callback fires when the card is charged client-side. The webhook that triggers `fulfill_drink_order` is asynchronous and may arrive seconds later.
**How to avoid:** After `onSuccess`, poll the `/api/drinks/tokens?order_id=X` endpoint with a short interval (e.g., every 2 seconds, max 30 seconds). Show a "Processing your order..." spinner. If order status becomes `completed`, show tokens. If timeout, show "Your order is being processed. Check back shortly."
**Warning signs:** Tokens not appearing after payment; empty token list despite successful charge.

### Pitfall 2: localStorage Not Available
**What goes wrong:** In private/incognito browsing or with strict browser settings, `localStorage.setItem()` can throw.
**Why it happens:** Some browsers restrict storage in incognito mode.
**How to avoid:** Wrap all localStorage calls in try/catch. If storage fails, the URL `?order=X` param is the only recovery mechanism -- make sure it's always set.
**Warning signs:** Console errors about `SecurityError` or `QuotaExceededError`.

### Pitfall 3: Server Action Without Auth Becomes Attack Vector
**What goes wrong:** A malicious actor could call `purchaseDrinksGuest` in a loop to create thousands of pending SumUp checkouts.
**Why it happens:** No auth = no rate limiting by user identity.
**How to avoid:** Apply rate limiting at the API/infrastructure level. SumUp checkouts that aren't paid expire naturally (30 minutes default). The server action validates drink item existence and availability, so phantom orders don't create tokens. Consider adding a simple CAPTCHA or request throttle if abuse is detected.
**Warning signs:** Large numbers of `pending` drink_orders with `user_id = null`.

### Pitfall 4: Organizer QR Code Rendering on Server
**What goes wrong:** `qrcode.react` is a client component -- attempting to render it in a server component fails.
**Why it happens:** QRCodeSVG/QRCodeCanvas use browser DOM APIs.
**How to avoid:** Always render QR code inside a `"use client"` component. The organizer visibility check can be done in the parent server component and the QR component conditionally rendered.
**Warning signs:** Hydration errors, `window is not defined` errors.

### Pitfall 5: Guest Token Security -- Order ID Enumeration
**What goes wrong:** An attacker could try random UUIDs on `/api/drinks/tokens?order_id=X` to steal guest tokens.
**Why it happens:** UUIDs are the only authorization for guest token access.
**How to avoid:** UUIDs v4 have 122 bits of randomness (2^122 possibilities) -- brute force is infeasible. Additionally, the API route only returns tokens for `user_id = null` orders, so authenticated users' tokens are never exposed. Rate limit the API route to further mitigate.
**Warning signs:** High request volume to `/api/drinks/tokens` from unknown IPs.

## Code Examples

### Existing Component Reuse Map

The following components are already built and can be reused directly or with minimal adaptation:

```
DrinkMenu.tsx          -> Fork as GuestDrinkMenu.tsx (change action import, add orderId return handling)
SumUpCheckoutModal.tsx -> Reuse as-is (no auth dependency)
DrinkTokenCard.tsx     -> Reuse as-is (props-driven, no auth dependency)
RedeemConfirmationModal.tsx -> Fork: change redeemDrinkToken import to redeemDrinkTokenGuest
MyDrinks.tsx           -> Reuse as-is (props-driven)
```

### Menu Page Server Component Pattern
```typescript
// src/app/(public)/events/[slug]/menu/page.tsx
import { notFound } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import GuestDrinkMenu from "./GuestDrinkMenu";
import GuestTokenDisplay from "./GuestTokenDisplay";
import EventQRCode from "./EventQRCode";

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { slug } = await params;
  const { order: orderIdFromUrl } = await searchParams;

  // Service client for public data (no RLS restriction)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch event
  const { data: event } = await serviceClient
    .from("events")
    .select("id, title, date, slug, cover_image, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!event) notFound();

  // Fetch available drinks
  const { data: drinks } = await serviceClient
    .from("drink_items")
    .select("*")
    .eq("event_id", event.id)
    .eq("is_available", true)
    .order("sort_order");

  // Check if current user is organizer/admin (for QR code visibility)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const headersList = await headers();
  const role = headersList.get("x-user-role");
  const isOrganizerOrAdmin = role === "master" || role === "organizer";

  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${slug}/menu`;

  return (
    <div className="min-h-dvh pb-24">
      {/* Event header */}
      {/* ... event title, date, cover image ... */}

      {/* QR Code (organizer/admin only) */}
      {isOrganizerOrAdmin && (
        <EventQRCode url={menuUrl} eventTitle={event.title} />
      )}

      {/* Login suggestion banner */}
      {!user && <GuestLoginBanner />}

      {/* Drink menu */}
      {drinks && drinks.length > 0 && (
        <GuestDrinkMenu eventId={event.id} drinks={drinks} />
      )}

      {/* Guest tokens (client-side, loaded from localStorage + URL) */}
      {!user && (
        <GuestTokenDisplay
          eventId={event.id}
          initialOrderId={orderIdFromUrl ?? null}
        />
      )}
    </div>
  );
}
```

### localStorage + URL Sync Pattern
```typescript
// In GuestTokenDisplay.tsx (client component)
"use client";

import { useEffect, useState } from "react";

export default function GuestTokenDisplay({
  eventId,
  initialOrderId,
}: {
  eventId: string;
  initialOrderId: string | null;
}) {
  const [tokens, setTokens] = useState<DrinkToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderIds = new Set<string>();

    // 1. From URL param
    if (initialOrderId) {
      orderIds.add(initialOrderId);
      // Also store in localStorage for future visits
      storeGuestOrder(eventId, initialOrderId);
    }

    // 2. From localStorage
    for (const id of getGuestOrderIds(eventId)) {
      orderIds.add(id);
    }

    if (orderIds.size === 0) {
      setLoading(false);
      return;
    }

    // Fetch tokens for all order IDs
    Promise.all(
      [...orderIds].map((orderId) =>
        fetch(`/api/drinks/tokens?order_id=${orderId}`)
          .then((r) => r.json())
          .then((data) => data.tokens ?? [])
      )
    ).then((results) => {
      setTokens(results.flat());
      setLoading(false);
    });
  }, [eventId, initialOrderId]);

  // ... render MyDrinks-style token display
}
```

## RLS Policy Changes Required

### Migration: `drink_items` Public Read Access

```sql
-- Drop existing authenticated-only SELECT policy
DROP POLICY IF EXISTS drink_items_select ON public.drink_items;

-- Create new policy allowing both anon and authenticated reads
CREATE POLICY drink_items_select ON public.drink_items
  FOR SELECT TO anon, authenticated USING (true);
```

**Confidence: HIGH** -- This is the standard Supabase pattern for public-readable data. The `TO anon, authenticated` syntax ensures both unauthenticated and authenticated users can read drink items. Write policies (INSERT/UPDATE/DELETE) remain restricted to organizer/admin.

### No RLS Changes for `drink_tokens` or `drink_orders`

Guest tokens are accessed via the service-role API route (`/api/drinks/tokens`), which bypasses RLS entirely. This is intentional:
- Avoids exposing authenticated users' tokens to the `anon` role
- The `order_id` UUID serves as a capability token -- knowing it proves access rights
- Service-role queries are server-side only, never exposed to the client directly

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API routes for mutations | Server Actions | Next.js 14+ (2024) | Guest purchase can use server action directly, no API route needed for mutations |
| `includeMargin` prop | `marginSize` prop | qrcode.react v4.0 | Use `marginSize={2}` instead of deprecated `includeMargin` |
| Manual QR code library | qrcode.react with ref support | qrcode.react v4.1+ | Canvas ref enables direct `toDataURL()` for PNG download |

## Open Questions

1. **Token Polling Strategy**
   - What we know: After SumUp `onSuccess`, tokens may not be immediately available (webhook delay)
   - What's unclear: Typical webhook delay (sub-second? 2-5 seconds?)
   - Recommendation: Poll every 2 seconds with 30-second timeout. Show spinner during poll. Show "order being processed" message if timeout reached.

2. **Authenticated User on Menu Page**
   - What we know: An authenticated user could also visit `/events/[slug]/menu`
   - What's unclear: Should they see the guest flow or be redirected to the main event page?
   - Recommendation: If authenticated, show their existing tokens via normal RLS flow (not localStorage). Optionally show a link "View full event page" that takes them back to `/events/[slug]`. The purchase flow should use the existing `purchaseDrinks` (authenticated) instead of `purchaseDrinksGuest`.

3. **Multiple Guest Orders on Same Page**
   - What we know: A guest could purchase drinks multiple times in one session
   - What's unclear: How to handle multiple order IDs in the URL
   - Recommendation: URL `?order=X` contains only the LATEST order ID. localStorage stores ALL order IDs for the event. Token display merges all orders.

## Sources

### Primary (HIGH confidence)
- Project codebase: `purchaseDrinks` action, `fulfill_drink_order` RPC, `redeem_drink_token` RPC, webhook handler, RLS migration
- [qrcode.react GitHub README](https://github.com/zpao/qrcode.react) - API documentation, v4.2.0 features
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) - anon role policies, TO operator

### Secondary (MEDIUM confidence)
- [qrcode.react npm](https://www.npmjs.com/package/qrcode.react) - version, download stats
- [Supabase Postgres Roles](https://supabase.com/docs/guides/database/postgres/roles) - anon vs authenticated role behavior
- [Next.js App Router Docs](https://nextjs.org/docs/app) - Server Actions, API Routes patterns

### Tertiary (LOW confidence)
- None -- all findings verified through primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - qrcode.react is well-established, project already uses related qrcode package
- Architecture: HIGH - patterns directly derived from existing codebase (forking proven components)
- RLS changes: HIGH - standard Supabase pattern, minimal change (one policy replacement)
- Guest flow: HIGH - all building blocks exist, just wiring for unauthenticated access
- Pitfalls: MEDIUM - webhook timing needs empirical validation

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable domain, no fast-moving dependencies)
