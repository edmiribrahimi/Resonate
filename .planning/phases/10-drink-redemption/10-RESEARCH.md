# Phase 10: Drink Redemption - Research

**Researched:** 2026-03-06
**Domain:** Client-side drink token redemption with anti-fraud UX, HMAC signing, CSS animations
**Confidence:** HIGH

## Summary

Phase 10 implements drink token redemption -- the member-facing flow where purchased drink tokens are displayed, confirmed via a 3-second countdown, and burned with a full-screen "SERVED" animation. The entire interaction happens on the member's phone (no barista device).

The technical domain is straightforward: a server action to redeem tokens (with HMAC verification), client-side countdown/animation components, and integration into two existing pages (event detail + dashboard). The database schema already has `drink_tokens` with `status`, `redeemed_at`, and `token` columns. The key gap is that (1) the `token` column currently defaults to `gen_random_uuid()::text` and needs to be replaced with HMAC-signed values using the existing `generateTicketToken` pattern, (2) there is NO RLS UPDATE policy on `drink_tokens`, so redemption must use either a SECURITY DEFINER function or a service-role client, and (3) the token signing must happen at fulfillment time (in `fulfill_drink_order`), not at redemption time.

**Primary recommendation:** Create a `redeem_drink_token` SECURITY DEFINER PostgreSQL function (mirrors existing `fulfill_drink_order` and `reserve_ticket` patterns), add a server action that verifies the HMAC signature before calling it, and build the UI as two client components: `DrinkTokenCard` (reusable card with redeem/redeemed states) and `RedeemConfirmationModal` (countdown + SERVED animation overlay).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Each drink token displayed as an individual card (voucher style) -- one card per purchased drink
- Card shows drink name, price, and a prominent "Redeem" button
- Purchased tokens have active/vibrant styling; redeemed tokens show muted "Already redeemed" state
- Design goal: professional, premium feel -- each card should feel like a tangible voucher
- Tapping "Redeem" opens a confirmation dialog with a circular progress animation (Apple Watch confirmation style)
- Circle fills over 3 seconds, then the "Confirm" button becomes active
- During countdown, user sees the drink name and a clear "Hold to confirm" indication
- Cannot dismiss early by accident -- deliberate anti-fraud interaction
- After confirmation, full-screen overlay displays with animated success state
- Dismisses after ~3 seconds or on tap
- Should feel celebratory but on-brand for Resonate (not over the top)
- Token marked `redeemed` in database immediately on confirmation
- Event page: New "My Drinks" section appears below the drink menu (only if user has tokens for this event)
- Dashboard: Drink tokens also visible on member dashboard for quick access
- Both locations show the same card component with full redeem capability
- Drink tokens signed using same HMAC pattern as event tickets (`src/utils/qr.ts` -- `generateTicketToken`/`verifyTicketToken`)
- Token value = `{token_id}.{hmac_signature}` using `TICKET_SIGNING_SECRET`
- Signature verified server-side before any redemption is processed
- "Rendi l'esperienza il piu professionale possibile" -- the redemption flow should feel polished and premium
- Each token is a standalone voucher the member shows to the barista
- The barista does NOT have their own device -- the member's phone is the only UI
- Circular progress countdown similar to Apple Watch "confirm" interaction

### Claude's Discretion
- Exact animation style and colors for "SERVED" screen (check animato, particelle, or blend -- should match Resonate's brand: dark theme, accent color)
- Card layout details (exact spacing, typography, icon choices)
- How the "My Drinks" section integrates visually with the existing event page layout
- Dashboard widget design for drink tokens
- Loading and error states during redemption
- Whether to show a count badge for unredeemed drinks

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DRNK-07 | Member can view their purchased drink tickets on the event page and dashboard | Existing `drink_tokens` table with `drink_tokens_select_own` RLS policy enables server-side fetching. Event page integration at line 670, dashboard at `(members)/dashboard/page.tsx`. New `DrinkTokenCard` component renders each token. |
| DRNK-08 | Tapping "Redeem" on a drink ticket shows a confirmation dialog with 3-second countdown before the confirm button activates | Pure client-side component `RedeemConfirmationModal` with CSS `conic-gradient` animation for circular progress (no external library needed). Uses `useEffect` + `setTimeout` for 3-second gate. |
| DRNK-09 | After confirmation, the drink ticket shows a full-screen "SERVED" animation and the token is marked `redeemed` in DB | Server action `redeemDrinkToken` calls SECURITY DEFINER function `redeem_drink_token`. Full-screen overlay with CSS `@keyframes` for scale/fade entrance. Auto-dismiss after ~3s or on tap. |
| DRNK-10 | A redeemed drink ticket cannot be redeemed again -- shows "Already redeemed" state | Database-enforced via `redeem_drink_token` function (checks `status = 'purchased'` before updating). Client renders muted card with "Already redeemed" text and no Redeem button. |
| DRNK-11 | Drink ticket tokens are cryptographically signed to prevent forgery (same pattern as event ticket QR) | Reuse `generateTicketToken`/`verifyTicketToken` from `src/utils/qr.ts`. Token value set during `fulfill_drink_order`. Server action verifies HMAC before processing redemption. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16 | App Router, Server Actions, Server Components | Project standard |
| Supabase | latest | Database, RLS, RPC functions | Project standard |
| Tailwind CSS | v4 | Styling, animations via `@keyframes` in CSS | Project standard |
| Node.js crypto | built-in | HMAC-SHA256 signing via `createHmac` | Already used in `src/utils/qr.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React (useState, useEffect, useTransition, useCallback) | 19 | Client-side state for countdown, modal, optimistic UI | All interactive components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS `@keyframes` + `conic-gradient` | Framer Motion | Adds dependency for simple animations; CSS is sufficient and lighter |
| Service-role client in server action | SECURITY DEFINER PG function | PG function is more atomic and follows project pattern (`fulfill_drink_order`, `reserve_ticket`) |
| Canvas/SVG animation library | CSS-only animations | CSS `conic-gradient` with animation handles the circular progress perfectly; no library needed |

**Installation:**
No new packages required. All functionality uses existing dependencies.

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/(public)/events/[slug]/
    MyDrinks.tsx              # "My Drinks" section component (client)
    DrinkTokenCard.tsx        # Individual token card (client)
    RedeemConfirmationModal.tsx  # Countdown + SERVED overlay (client)
  app/(members)/dashboard/
    page.tsx                  # Modified: add drink tokens section
  app/(organizer)/organizer/events/
    actions.ts                # Modified: add redeemDrinkToken server action
  utils/
    qr.ts                    # Existing: generateTicketToken/verifyTicketToken (reused)
supabase/migrations/
  20260306100000_phase10_redemption.sql  # New migration
```

### Pattern 1: SECURITY DEFINER Redemption Function
**What:** A PostgreSQL function that atomically validates and marks a token as redeemed
**When to use:** Always -- prevents race conditions and enforces single-use at the DB level
**Example:**
```sql
-- Source: follows pattern of existing fulfill_drink_order and reserve_ticket functions
CREATE OR REPLACE FUNCTION public.redeem_drink_token(
  p_token_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token record;
BEGIN
  -- Lock the row to prevent concurrent redemption
  SELECT * INTO v_token
  FROM public.drink_tokens
  WHERE id = p_token_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token not found: %', p_token_id;
  END IF;

  -- Idempotent: already redeemed
  IF v_token.status = 'redeemed' THEN
    RETURN false;
  END IF;

  -- Mark as redeemed
  UPDATE public.drink_tokens
  SET status = 'redeemed',
      redeemed_at = now()
  WHERE id = p_token_id;

  RETURN true;
END;
$$;
```

### Pattern 2: Server Action with HMAC Verification
**What:** Server action that verifies the token's cryptographic signature before calling the DB function
**When to use:** Every redemption request
**Example:**
```typescript
// Source: mirrors existing purchaseTicket/purchaseDrinks pattern in actions.ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { verifyTicketToken } from "@/utils/qr";

export async function redeemDrinkToken(signedToken: string) {
  // 1. Verify HMAC signature
  const tokenId = verifyTicketToken(signedToken);
  if (!tokenId) {
    throw new Error("Invalid token signature");
  }

  // 2. Verify user owns this token
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: token } = await supabase
    .from("drink_tokens")
    .select("id, user_id, status")
    .eq("id", tokenId)
    .single();

  if (!token) throw new Error("Token not found");
  if (token.user_id !== user.id) throw new Error("Not your token");
  if (token.status === "redeemed") throw new Error("Already redeemed");

  // 3. Redeem via SECURITY DEFINER function
  const serviceClient = getServiceClient();
  const { data: redeemed, error } = await serviceClient.rpc("redeem_drink_token", {
    p_token_id: tokenId,
  });

  if (error) throw new Error("Redemption failed");
  return { success: true, redeemed };
}
```

### Pattern 3: Circular Countdown with CSS conic-gradient
**What:** Apple Watch-style circular progress using a single CSS custom property animated via `useEffect`
**When to use:** The 3-second confirmation countdown
**Example:**
```tsx
// CSS approach: animate --progress from 0 to 1 via JS, use conic-gradient
// No external library needed
function CountdownCircle({ duration = 3000, onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / duration);
      setProgress(p);
      if (p >= 1) {
        clearInterval(interval);
        setDone(true);
        onComplete();
      }
    }, 16); // ~60fps
    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div
      className="h-20 w-20 rounded-full"
      style={{
        background: `conic-gradient(var(--accent) ${progress * 360}deg, var(--card-border) ${progress * 360}deg)`,
      }}
    />
  );
}
```

### Pattern 4: Full-Screen "SERVED" Overlay
**What:** Celebratory success screen after redemption
**When to use:** Immediately after successful redemption confirmation
**Example:**
```tsx
// Full-screen overlay with scale-in animation
// Uses CSS @keyframes defined in globals.css or inline style
<div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md">
  <div className="animate-scale-in text-center">
    <div className="text-6xl font-bold text-accent mb-2">SERVED</div>
    <p className="text-lg text-muted">{drinkName}</p>
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Client-side-only redemption check:** Never rely solely on client state to prevent double redemption. The DB function + `FOR UPDATE` row lock is the single source of truth.
- **Storing the signed token in client state only:** The signed token must come from the server (fetched with the token list). Never generate HMAC signatures on the client.
- **Using `router.refresh()` after redemption:** Use optimistic UI updates via React state instead. The server action confirms success, update the local state immediately. `router.refresh()` or `window.location.reload()` causes a full page reload and breaks the premium feel.
- **Animating with JavaScript `requestAnimationFrame` for the circular progress:** The `setInterval` at 16ms is simpler and sufficient; alternatively CSS animations with `@property` could work but have incomplete browser support in some PWA webviews.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC token signing | Custom crypto logic | `generateTicketToken`/`verifyTicketToken` from `src/utils/qr.ts` | Already battle-tested, uses `timingSafeEqual` for constant-time comparison |
| Race condition prevention | Application-level locks | PostgreSQL `FOR UPDATE` row lock in SECURITY DEFINER function | Database handles concurrent requests atomically |
| Circular progress animation | Canvas/SVG library | CSS `conic-gradient` with JS-driven progress | Zero dependency, performant, works in PWA webviews |
| Service-role client | New client instantiation | Existing `getServiceClient()` pattern from `actions.ts` | Consistent with project patterns |

**Key insight:** This phase requires no new dependencies. Every piece of infrastructure (HMAC signing, service-role client, SECURITY DEFINER functions, modal patterns, card styling) already exists in the codebase. The work is composition, not creation.

## Common Pitfalls

### Pitfall 1: Token Signing at Wrong Time
**What goes wrong:** Generating HMAC signature at redemption time instead of at token creation time
**Why it happens:** Misunderstanding the flow -- the signed token must be stored when the token is created (in `fulfill_drink_order`) so it can be served to the client and verified at redemption time
**How to avoid:** Modify `fulfill_drink_order` to call `generateTicketToken(token_id)` and store the result in the `token` column. Currently `token` defaults to `gen_random_uuid()::text` which is NOT signed.
**Warning signs:** If the `token` column doesn't contain a dot (`.`) separator, it's not HMAC-signed

### Pitfall 2: Missing RLS UPDATE Policy
**What goes wrong:** Trying to update `drink_tokens.status` via the authenticated Supabase client fails silently
**Why it happens:** Phase 9 migration only created SELECT policies. There is no UPDATE policy on `drink_tokens`.
**How to avoid:** Use a SECURITY DEFINER function (`redeem_drink_token`) which bypasses RLS. Do NOT add a user-facing UPDATE policy -- the function provides the security boundary.
**Warning signs:** Redemption appears to succeed but token status doesn't change in DB

### Pitfall 3: Double Redemption Race Condition
**What goes wrong:** Two concurrent redemption requests for the same token both succeed
**Why it happens:** Check-then-update without row locking
**How to avoid:** Use `SELECT ... FOR UPDATE` in the PostgreSQL function to lock the row during the check-and-update transaction
**Warning signs:** Same token shows "SERVED" animation twice if tapped rapidly

### Pitfall 4: Token Signing in fulfill_drink_order Requires Code Change
**What goes wrong:** `fulfill_drink_order` is a PL/pgSQL function that runs in PostgreSQL -- it cannot call Node.js `crypto.createHmac`
**Why it happens:** HMAC signing uses Node.js crypto module which is unavailable in PostgreSQL
**How to avoid:** Two options: (A) sign tokens in the webhook handler after `fulfill_drink_order` returns, by updating each token's `token` column with the signed value, or (B) use `pgcrypto` extension in PostgreSQL. Option A is simpler and follows existing patterns.
**Warning signs:** Trying to import Node.js modules in SQL

### Pitfall 5: Countdown Can Be Bypassed via DevTools
**What goes wrong:** User opens browser DevTools and triggers the server action directly, bypassing the 3-second countdown
**Why it happens:** Client-side countdown is UX only, not security
**How to avoid:** This is acceptable by design. The countdown is anti-fraud for accidental taps by the member, not cryptographic security. The real security is the HMAC signature verification on the server. The barista watches the "SERVED" animation as visual confirmation.
**Warning signs:** N/A -- this is working as intended

### Pitfall 6: Optimistic UI Breaks on Error
**What goes wrong:** Token card shows "redeemed" state but server action failed; user is confused
**Why it happens:** Updating UI before server confirms
**How to avoid:** Only update the token status in local state AFTER the server action resolves successfully. Show a loading spinner on the "Confirm" button during the server call.
**Warning signs:** Token flickers between states

## Code Examples

Verified patterns from existing codebase:

### Fetching User's Drink Tokens (Server Component)
```typescript
// Source: follows existing pattern in event detail page for tickets
const { data: drinkTokens } = await supabase
  .from("drink_tokens")
  .select("id, drink_name, price, token, status, redeemed_at, event_id")
  .eq("event_id", event.id)
  .eq("user_id", user.id)
  .order("created_at", { ascending: true });
```

### Card Styling (Existing Project Pattern)
```tsx
// Source: DrinkMenu.tsx line 80, project card pattern
// Active token
<div className="rounded-xl border border-accent/30 bg-gradient-to-br from-card to-accent/5 p-4">
  <p className="text-sm font-medium text-foreground">{drink_name}</p>
  <p className="text-sm text-accent font-semibold">{formatPrice(price)}</p>
  <button className="mt-3 w-full rounded-full bg-accent py-2.5 font-medium text-white transition-all active:scale-95 active:opacity-80">
    Redeem
  </button>
</div>

// Redeemed token
<div className="rounded-xl border border-card-border bg-card p-4 opacity-60">
  <p className="text-sm font-medium text-foreground">{drink_name}</p>
  <p className="text-xs text-muted">Already redeemed</p>
</div>
```

### Modal Overlay Pattern (From SumUpCheckoutModal)
```tsx
// Source: SumUpCheckoutModal.tsx line 50
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
  <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-6">
    {/* Content */}
  </div>
</div>
```

### Success State Pattern (From Existing Codebase)
```tsx
// Source: event detail page, ticket confirmation
<div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
  <p className="text-sm font-medium text-green-400">Success message</p>
</div>
```

### Token Signing in Webhook (Post-Fulfillment)
```typescript
// Source: pattern from webhook route.ts, extended for drink tokens
// After fulfill_drink_order RPC call succeeds:
const { data: newTokens } = await supabase
  .from("drink_tokens")
  .select("id")
  .eq("order_id", drinkOrder.id);

if (newTokens) {
  for (const t of newTokens) {
    const signedToken = generateTicketToken(t.id);
    await supabase
      .from("drink_tokens")
      .update({ token: signedToken })
      .eq("id", t.id);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External animation libraries (Framer Motion) | CSS `@keyframes` + `conic-gradient` | CSS conic-gradient support is universal since 2023 | No dependency needed for circular progress |
| QR code scanning for redemption | Direct phone tap + HMAC verification | Project design decision | Simpler flow, no barista device |
| Separate redemption API route | Server Action (`"use server"`) | Next.js 14+ (App Router) | Co-located with related actions, type-safe |

**Deprecated/outdated:**
- None relevant to this phase

## Open Questions

1. **Token signing timing in fulfill_drink_order**
   - What we know: The PL/pgSQL function cannot call Node.js crypto. Token column defaults to `gen_random_uuid()::text`.
   - What's unclear: Whether to sign tokens in webhook handler (after RPC) or extend the PG function with `pgcrypto`.
   - Recommendation: Sign in the webhook handler after `fulfill_drink_order` returns. This is the path of least resistance -- add a loop in `route.ts` that updates each new token's `token` column with `generateTicketToken(token.id)`. This keeps all HMAC logic in Node.js where `TICKET_SIGNING_SECRET` is already available.

2. **Dashboard token fetching scope**
   - What we know: Dashboard currently shows tickets per event. Drink tokens also need event context.
   - What's unclear: Should dashboard show ALL drink tokens across all events, or only upcoming events?
   - Recommendation: Show tokens grouped by event, but only for events where the user has unredeemed tokens (active first), plus recently redeemed ones (last 24-48 hours). This keeps the dashboard clean.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual testing (no automated test suite detected in project) |
| Config file | none |
| Quick run command | `npx tsc --noEmit` (type check only) |
| Full suite command | `npx tsc --noEmit` |

### Phase Requirements - Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRNK-07 | View purchased tokens on event page and dashboard | manual | N/A - visual verification | N/A |
| DRNK-08 | 3-second countdown confirmation dialog | manual | N/A - interaction verification | N/A |
| DRNK-09 | SERVED animation + DB status update | manual + `npx tsc --noEmit` | Type check server action | N/A |
| DRNK-10 | Redeemed token shows "Already redeemed" | manual | N/A - visual + DB verification | N/A |
| DRNK-11 | Cryptographic signing prevents forgery | manual | N/A - verify HMAC in server logs | N/A |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npx tsc --noEmit` + manual verification
- **Phase gate:** Full type check + manual redemption flow test

### Wave 0 Gaps
None -- no automated test infrastructure exists in the project. Type checking via `tsc` is the only automated verification.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/utils/qr.ts` -- HMAC signing pattern (generateTicketToken/verifyTicketToken)
- Codebase analysis: `supabase/migrations/20260306000000_phase9_drinks.sql` -- drink_tokens schema, RLS policies, fulfill_drink_order function
- Codebase analysis: `src/app/api/webhooks/sumup/route.ts` -- webhook flow, drink order fulfillment
- Codebase analysis: `src/app/(organizer)/organizer/events/actions.ts` -- server action patterns, service client usage
- Codebase analysis: `src/app/(public)/events/[slug]/page.tsx` -- event page structure, drink section integration point (line 670)
- Codebase analysis: `src/app/(members)/dashboard/page.tsx` -- dashboard structure, tickets section pattern
- Codebase analysis: `src/app/(public)/events/[slug]/SumUpCheckoutModal.tsx` -- modal overlay pattern
- Codebase analysis: `src/app/globals.css` -- theme variables, dark mode, accent color `#e5484d`
- Codebase analysis: `src/types/database.ts` -- DrinkToken interface definition

### Secondary (MEDIUM confidence)
- CSS `conic-gradient` for circular progress -- widely supported, well-documented in MDN

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, no new dependencies
- Architecture: HIGH - all patterns (SECURITY DEFINER functions, server actions, modal overlays, card components) are proven in the existing codebase
- Pitfalls: HIGH - identified through direct code inspection of existing schema gaps (missing UPDATE policy, unsigned tokens)

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable -- no external dependencies or fast-moving APIs)
