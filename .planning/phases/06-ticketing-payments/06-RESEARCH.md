# Phase 6: Ticketing & Payments - Research

**Researched:** 2026-02-25
**Domain:** SumUp Checkout API integration, QR code generation, PostgreSQL concurrency control, React Email templates
**Confidence:** HIGH

## Summary

Phase 6 integrates SumUp hosted checkout for ticket purchases, adds ticket tier management for organizers, generates QR code tickets after payment, and builds a sales dashboard. The integration uses SumUp's Checkout API v0.1 with hosted checkout pages -- no card widget embedding is needed. The project already has `qrcode` (v1.5.4) and `@types/qrcode` installed, the React Email + Resend infrastructure from Phase 4, and a well-established pattern for server actions, RLS policies, and service-role client usage.

The critical technical challenge is **oversell prevention under concurrent purchases**. A PostgreSQL function called via Supabase RPC provides atomic check-and-decrement in a single transaction, eliminating race conditions without application-layer locking. SumUp's hosted checkout simplifies PCI compliance -- the app never touches card data, only creates checkouts server-side and redirects users to SumUp's hosted payment page.

**Primary recommendation:** Use a PostgreSQL function for atomic ticket reservation (check availability + insert ticket + decrement count in one transaction), SumUp hosted checkout with webhook-based payment confirmation, and the already-installed `qrcode` library for QR generation as base64 data URLs.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Purchase starts on the event detail page directly -- tier selection and "Buy" button appear below event info, no separate ticket page
- After successful SumUp payment, redirect to a dedicated ticket confirmation page showing the QR code, event details, and success message
- One ticket per member per event -- no multi-ticket purchases. Friends register and buy their own.
- Payment failure or cancellation redirects back to the event detail page with an error/cancelled message. Member can retry.
- Tier management lives in a separate section, accessible after the event is created -- not inline in the event creation form
- Tiers are fully editable always -- organizer can change price, name, and quantity at any time, even after sales. Existing tickets remain valid at their original price.
- No limit on how many tiers an organizer can create per event
- Tiers with existing sales cannot be deleted. Only unsold tiers can be removed.
- Tickets appear as a section on the existing member dashboard -- no separate "My Tickets" page
- QR code encodes ticket ID only (UUID). Door staff scan it and the app looks up details server-side. Minimal, secure.
- Ticket confirmation email includes the QR code image inline so the member can show the email at the door without opening the app
- Tickets are visually styled as branded ticket cards -- event cover image, Resonate branding, event details, and QR code. Looks like a real ticket.
- Sales dashboard is a tab on the event management page alongside event details. Context stays with the event.
- Buyer list shows: member name, tier purchased, purchase date, and member email
- Revenue display shows per-tier breakdown (revenue and sold/available count per tier) plus a total across all tiers
- Master admin sees the same per-event sales view as organizers (just for all events). No cross-event overview.

### Claude's Discretion
- SumUp API integration approach (Checkout API endpoints, webhook handling)
- QR code generation library choice
- QR code image format and size for email embedding
- Ticket confirmation page layout
- Sales dashboard table/card layout and responsive behavior
- Database schema for tickets and ticket_tiers tables
- Oversell prevention mechanism (database constraints, row-level locking, etc.)
- How the "Tickets" tab appears on the organizer event management page
- Secret location reveal logic (check ticket ownership before showing real address)
- Ticket confirmation email template design (using existing React Email + Resend infrastructure)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TICK-01 | Organizer can define multiple ticket tiers per event (name, price, quantity) | Database schema with `ticket_tiers` table; tier management UI as separate section on event management page |
| TICK-02 | Approved members can purchase tickets via SumUp hosted checkout | SumUp Checkout API v0.1 with `hosted_checkout.enabled: true`; redirect flow documented |
| TICK-03 | Payment confirmation creates a ticket record with unique QR code | Webhook endpoint + GET checkout verification; `qrcode` library for QR generation |
| TICK-04 | Member receives ticket confirmation with QR code (for door entry) | React Email template with inline QR via Resend CID attachments; fire-and-forget pattern |
| TICK-05 | Organizer can view ticket sales dashboard (tier breakdown, revenue, buyer list) | Sales tab on event management page; aggregation queries on tickets + ticket_tiers |
| TICK-06 | Ticket purchase decrements available quantity; prevents overselling via database constraints | PostgreSQL function with SELECT FOR UPDATE for atomic reservation |
| TICK-07 | Pending members cannot purchase tickets (browse-only) | Middleware already injects status header; server action checks `status === 'approved'` before creating checkout |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SumUp Checkout API | v0.1 | Payment processing | No first-party Node.js SDK; raw `fetch()` to REST API is the documented approach |
| `qrcode` | 1.5.4 | QR code generation | Already installed in project; mature, supports `toDataURL()` and `toBuffer()` for PNG output |
| `@types/qrcode` | 1.5.6 | TypeScript types for qrcode | Already installed |
| `@react-email/components` | 1.0.8 | Email template components | Already installed; used in Phase 4 for approval/rejection emails |
| `resend` | 6.9.2 | Email delivery | Already installed; supports CID inline image attachments for QR code embedding |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | 2.97.0 | Service-role client for webhook handler | Already installed; used for operations bypassing RLS |
| `crypto` (Node.js built-in) | N/A | Generate unique checkout references | Built-in `crypto.randomUUID()` for SumUp checkout_reference |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw `fetch()` for SumUp | SumUp Node SDK | No official SDK exists -- raw fetch is the only option |
| `qrcode` (server-side) | `react-qr-code` (client-side) | Server-side generation needed for email embedding; `qrcode` already installed |
| PostgreSQL function for oversell | Application-layer mutex | DB-level atomicity is more reliable; no distributed lock needed for single-instance app |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    api/
      webhooks/
        sumup/
          route.ts              # POST webhook handler for SumUp payment notifications
    (public)/
      events/
        [slug]/
          page.tsx              # Modified: add tier selection + buy button for approved members
      tickets/
        [id]/
          page.tsx              # NEW: ticket confirmation page with QR code display
    (members)/
      dashboard/
        page.tsx                # Modified: add "My Tickets" section
    (organizer)/
      organizer/
        events/
          [id]/
            tickets/
              page.tsx          # NEW: tier management UI
            sales/
              page.tsx          # NEW: sales dashboard tab
          actions.ts            # Modified: add ticket tier CRUD actions
    (admin)/
      admin/
        events/
          [id]/
            sales/
              page.tsx          # NEW: admin sales view (same component)
  lib/
    sumup.ts                    # SumUp API client wrapper
  emails/
    ticket-confirmation.tsx     # NEW: ticket confirmation email template
  types/
    database.ts                 # Modified: add TicketTier, Ticket interfaces
supabase/
  migrations/
    20260225_phase6_ticketing.sql  # NEW: ticket_tiers, tickets tables, RLS, RPC function
```

### Pattern 1: SumUp Hosted Checkout Flow
**What:** Server-side checkout creation -> redirect to SumUp -> webhook confirmation -> ticket creation
**When to use:** Every ticket purchase

The flow has 5 steps:

1. **Member clicks "Buy"** on event detail page (client component submits server action)
2. **Server action creates SumUp checkout** via POST to `https://api.sumup.com/v0.1/checkouts` with `hosted_checkout.enabled: true`
3. **Redirect member** to `hosted_checkout_url` returned by SumUp
4. **SumUp sends webhook** to `/api/webhooks/sumup` with `{ event_type: "CHECKOUT_STATUS_CHANGED", id: "checkout-id" }`
5. **Webhook handler verifies payment** via GET `https://api.sumup.com/v0.1/checkouts/{id}`, then creates ticket record and sends confirmation email

```typescript
// Source: https://developer.sumup.com/online-payments/guides/single-payment
// src/lib/sumup.ts

const SUMUP_API_BASE = "https://api.sumup.com/v0.1";

export async function createCheckout(params: {
  amount: number;
  currency: string;
  description: string;
  checkoutReference: string;
  redirectUrl: string;
  returnUrl: string;
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
      redirect_url: params.redirectUrl,
      return_url: params.returnUrl,
      hosted_checkout: { enabled: true },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`SumUp checkout creation failed: ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<{
    id: string;
    hosted_checkout_url: string;
    status: string;
    checkout_reference: string;
  }>;
}

export async function getCheckout(checkoutId: string) {
  const response = await fetch(`${SUMUP_API_BASE}/checkouts/${checkoutId}`, {
    headers: {
      Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`SumUp checkout retrieval failed: ${response.status}`);
  }

  return response.json() as Promise<{
    id: string;
    status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
    checkout_reference: string;
    amount: number;
    currency: string;
    transactions: Array<{
      id: string;
      transaction_code: string;
      status: string;
    }>;
  }>;
}
```

### Pattern 2: Atomic Ticket Reservation via PostgreSQL Function
**What:** A PostgreSQL function that atomically checks tier availability, inserts the ticket, and prevents overselling
**When to use:** Called from webhook handler after payment confirmation

```sql
-- Source: PostgreSQL SELECT FOR UPDATE + Supabase RPC pattern
-- supabase/migrations/20260225_phase6_ticketing.sql

CREATE OR REPLACE FUNCTION public.reserve_ticket(
  p_tier_id uuid,
  p_user_id uuid,
  p_event_id uuid,
  p_sumup_checkout_id text,
  p_sumup_transaction_code text,
  p_amount_paid numeric
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
BEGIN
  -- Check if user already has a ticket for this event
  SELECT id INTO v_existing_ticket
  FROM public.tickets
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF v_existing_ticket IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a ticket for this event';
  END IF;

  -- Lock the tier row to prevent concurrent modifications
  SELECT quantity INTO v_quantity
  FROM public.ticket_tiers
  WHERE id = p_tier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket tier not found';
  END IF;

  -- Count existing tickets for this tier
  SELECT COUNT(*) INTO v_sold_count
  FROM public.tickets
  WHERE tier_id = p_tier_id;

  -- Check availability
  IF v_sold_count >= v_quantity THEN
    RAISE EXCEPTION 'Tier sold out';
  END IF;

  -- Insert ticket
  INSERT INTO public.tickets (
    event_id, tier_id, user_id,
    sumup_checkout_id, sumup_transaction_code, amount_paid
  )
  VALUES (
    p_event_id, p_tier_id, p_user_id,
    p_sumup_checkout_id, p_sumup_transaction_code, p_amount_paid
  )
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$;
```

### Pattern 3: Webhook Handler with Payment Verification
**What:** API route that receives SumUp webhooks, verifies payment via GET checkout, then creates ticket
**When to use:** Webhook endpoint at `/api/webhooks/sumup`

```typescript
// Source: https://developer.sumup.com/online-payments/webhooks
// src/app/api/webhooks/sumup/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCheckout } from "@/lib/sumup";

// Service-role client for webhook (no user session)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.json();

  // SumUp webhook payload: { event_type, id }
  if (body.event_type !== "CHECKOUT_STATUS_CHANGED") {
    return NextResponse.json({ received: true });
  }

  // ALWAYS verify payment status via API call (per SumUp docs)
  const checkout = await getCheckout(body.id);

  if (checkout.status !== "PAID") {
    return NextResponse.json({ received: true });
  }

  // Look up pending purchase by checkout reference
  const supabase = getServiceClient();
  const { data: pendingPurchase } = await supabase
    .from("pending_purchases")
    .select("*")
    .eq("sumup_checkout_id", checkout.id)
    .single();

  if (!pendingPurchase) {
    console.error("No pending purchase found for checkout:", checkout.id);
    return NextResponse.json({ received: true });
  }

  // Reserve ticket atomically via RPC
  const { data: ticketId, error } = await supabase.rpc("reserve_ticket", {
    p_tier_id: pendingPurchase.tier_id,
    p_user_id: pendingPurchase.user_id,
    p_event_id: pendingPurchase.event_id,
    p_sumup_checkout_id: checkout.id,
    p_sumup_transaction_code: checkout.transactions?.[0]?.transaction_code ?? null,
    p_amount_paid: checkout.amount,
  });

  if (error) {
    console.error("Ticket reservation failed:", error);
    // Mark pending purchase as failed
    await supabase
      .from("pending_purchases")
      .update({ status: "failed", error_message: error.message })
      .eq("id", pendingPurchase.id);
    return NextResponse.json({ received: true });
  }

  // Mark pending purchase as completed
  await supabase
    .from("pending_purchases")
    .update({ status: "completed", ticket_id: ticketId })
    .eq("id", pendingPurchase.id);

  // Send ticket confirmation email (fire-and-forget)
  // ... generate QR, render email, send via Resend

  return NextResponse.json({ received: true });
}
```

### Pattern 4: QR Code Generation for Email and Display
**What:** Generate QR code as base64 data URL for page display and as buffer for email embedding via CID
**When to use:** After successful ticket creation

```typescript
// Source: https://github.com/soldair/node-qrcode
import QRCode from "qrcode";

// For page display (data URL)
const qrDataUrl = await QRCode.toDataURL(ticketId, {
  width: 280,
  margin: 2,
  color: {
    dark: "#000000",
    light: "#ffffff",
  },
  errorCorrectionLevel: "H", // High for reliable scanning
});

// For email embedding (buffer)
const qrBuffer = await QRCode.toBuffer(ticketId, {
  width: 280,
  margin: 2,
  errorCorrectionLevel: "H",
});
```

### Pattern 5: Resend Email with Inline QR Code Image
**What:** Embed QR code in email body using CID (Content-ID) attachments
**When to use:** Ticket confirmation email

```typescript
// Source: https://resend.com/changelog/embed-images-using-cid
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: FROM_ADDRESS,
  to: [memberEmail],
  subject: `Your ticket for ${eventTitle}`,
  html: renderedHtml, // contains <img src="cid:ticket-qr" />
  attachments: [
    {
      content: qrBuffer.toString("base64"),
      filename: "ticket-qr.png",
      content_type: "image/png",
      // Resend uses camelCase for content_id
    },
  ],
});
```

**Note:** The `sendEmail` helper in `src/lib/email.ts` currently only accepts `html`. It needs to be extended with an optional `attachments` parameter for this use case, or the ticket email can call `resend.emails.send()` directly.

### Anti-Patterns to Avoid
- **Application-level oversell check:** Never check availability in JavaScript then insert -- race condition between check and insert. Always use atomic DB function.
- **Trusting webhook data directly:** SumUp docs mandate verifying every webhook by calling GET checkout. The webhook payload only contains `event_type` and `id`, not payment status.
- **Storing card data:** Never handle card numbers. SumUp hosted checkout handles all PCI-sensitive data.
- **Polling for payment status:** Use webhooks + redirect. Don't poll SumUp API from the client.
- **Client-side checkout creation:** SumUp requires server-to-server communication for checkout creation. Never call SumUp API from the browser.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment processing | Custom payment form | SumUp Hosted Checkout | PCI compliance, card security, already handles 3DS |
| QR code generation | Canvas-based QR renderer | `qrcode` npm package | Edge cases in QR encoding, error correction levels |
| Email delivery | SMTP client | Resend | Rate limiting, deliverability, CID image support |
| Oversell prevention | JS mutex/semaphore | PostgreSQL function with FOR UPDATE | Only DB-level locking is truly atomic across instances |
| UUID generation | Custom random strings | `crypto.randomUUID()` | Collision-resistant, built into Node.js |

**Key insight:** The payment and concurrency domains have edge cases that are nearly impossible to get right with hand-rolled solutions. SumUp handles payment security; PostgreSQL handles concurrency.

## Common Pitfalls

### Pitfall 1: Webhook Handler Not Idempotent
**What goes wrong:** SumUp retries webhooks at 1min, 5min, 20min, 2hr intervals if your endpoint doesn't return 2xx. Without idempotency, the same payment creates duplicate tickets.
**Why it happens:** Developer handles webhook but doesn't check if ticket already exists for this checkout.
**How to avoid:** Add a UNIQUE constraint on `sumup_checkout_id` in the tickets table. The `reserve_ticket` function should handle the duplicate gracefully (return existing ticket ID or skip).
**Warning signs:** Multiple tickets for the same user/event, duplicate confirmation emails.

### Pitfall 2: Race Condition Between "Check Availability" and "Create Ticket"
**What goes wrong:** Two members see "1 ticket left," both click buy, both succeed, and you oversell.
**Why it happens:** Checking availability and creating the ticket are separate operations without locking.
**How to avoid:** The PostgreSQL function uses `SELECT ... FOR UPDATE` to lock the tier row during the transaction, serializing concurrent reservation attempts.
**Warning signs:** Ticket count exceeds tier quantity.

### Pitfall 3: SumUp Checkout Session Expiration
**What goes wrong:** Member starts checkout but doesn't complete payment within 30 minutes. Session expires, pending_purchase record lingers.
**Why it happens:** SumUp hosted checkout sessions expire after 30 minutes.
**How to avoid:** Set `valid_until` on checkout creation (30 min from now). Handle EXPIRED status in webhook. Allow member to re-initiate purchase.
**Warning signs:** Pending purchases that never resolve.

### Pitfall 4: Webhook Endpoint Unprotected from Spoofing
**What goes wrong:** Attacker sends fake webhook POST to create tickets without paying.
**Why it happens:** Webhook endpoint is publicly accessible.
**How to avoid:** SumUp documentation mandates: "After receiving a webhook call, your application must ALWAYS verify if the event really took place, by calling a relevant SumUp API." The GET checkout verification step is the protection. Additionally, store `sumup_checkout_id` in pending_purchases and only process known checkouts.
**Warning signs:** Tickets created without corresponding SumUp payments.

### Pitfall 5: Missing `return_url` for Webhook
**What goes wrong:** SumUp never sends webhook notifications after payment.
**Why it happens:** Developer uses `redirect_url` (for user redirect) but forgets `return_url` (for webhook notification).
**How to avoid:** Always provide both: `redirect_url` for user-facing redirect, `return_url` for server webhook notification.
**Warning signs:** Payment succeeds on SumUp but ticket never gets created.

### Pitfall 6: Email sendEmail Helper Doesn't Support Attachments
**What goes wrong:** Ticket confirmation email cannot embed QR code inline.
**Why it happens:** Current `sendEmail()` in `src/lib/email.ts` only accepts `{ to, subject, html }`.
**How to avoid:** Either extend `sendEmail()` to accept optional `attachments` array, or call `resend.emails.send()` directly for the ticket email. Extending is cleaner.
**Warning signs:** QR code missing from ticket confirmation emails.

## Code Examples

### Database Schema

```sql
-- Ticket tiers: defined per event by organizers
CREATE TABLE public.ticket_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,
  name text NOT NULL,           -- e.g. "Early Bird", "Regular", "VIP"
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tickets: one per member per event
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.ticket_tiers ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sumup_checkout_id text UNIQUE,       -- SumUp checkout ID for verification
  sumup_transaction_code text,          -- SumUp transaction code
  amount_paid numeric(10,2) NOT NULL,   -- Price at time of purchase (immutable)
  created_at timestamptz DEFAULT now(),

  -- One ticket per member per event
  UNIQUE (event_id, user_id)
);

-- Pending purchases: tracks checkout initiation before SumUp confirmation
CREATE TABLE public.pending_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.ticket_tiers ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sumup_checkout_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  ticket_id uuid REFERENCES public.tickets,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_tickets_event_id ON public.tickets (event_id);
CREATE INDEX idx_tickets_user_id ON public.tickets (user_id);
CREATE INDEX idx_tickets_tier_id ON public.tickets (tier_id);
CREATE INDEX idx_ticket_tiers_event_id ON public.ticket_tiers (event_id);
CREATE INDEX idx_pending_purchases_checkout ON public.pending_purchases (sumup_checkout_id);
```

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_purchases ENABLE ROW LEVEL SECURITY;

-- Ticket tiers: anyone authenticated can read (for purchase UI)
CREATE POLICY ticket_tiers_select ON public.ticket_tiers
  FOR SELECT TO authenticated USING (true);

-- Ticket tiers: organizers/master can manage their event's tiers
CREATE POLICY ticket_tiers_insert ON public.ticket_tiers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_or_organizer()));

CREATE POLICY ticket_tiers_update ON public.ticket_tiers
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

CREATE POLICY ticket_tiers_delete ON public.ticket_tiers
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

-- Tickets: members can read their own tickets
CREATE POLICY tickets_select_own ON public.tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Tickets: organizers/master can read all tickets (for sales dashboard)
CREATE POLICY tickets_select_admin ON public.tickets
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_or_organizer()));

-- Tickets: insert only via the reserve_ticket function (SECURITY DEFINER)
-- No direct insert policy needed for regular users

-- Pending purchases: users can see their own
CREATE POLICY pending_select_own ON public.pending_purchases
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

### Ticket Confirmation Email Template

```tsx
// Source: existing Phase 4 email pattern
// src/emails/ticket-confirmation.tsx
import { Button, Heading, Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./components/email-layout";

interface TicketConfirmationEmailProps {
  memberName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  tierName: string;
  ticketUrl: string;
  // QR code embedded via CID attachment -- reference as <img src="cid:ticket-qr" />
}

export function TicketConfirmationEmail({
  memberName,
  eventTitle,
  eventDate,
  eventTime,
  tierName,
  ticketUrl,
}: TicketConfirmationEmailProps) {
  return (
    <EmailLayout preview={`Your ticket for ${eventTitle}`}>
      <Heading style={{ color: BRAND.foreground, fontSize: "24px", fontWeight: "bold" }}>
        You're In, {memberName}
      </Heading>
      <Text style={{ color: BRAND.muted, fontSize: "16px" }}>
        {eventTitle} -- {tierName}
      </Text>
      <Text style={{ color: BRAND.muted, fontSize: "14px" }}>
        {eventDate} at {eventTime}
      </Text>

      {/* QR Code via CID inline attachment */}
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Img
          src="cid:ticket-qr"
          alt="Ticket QR Code"
          width="200"
          height="200"
          style={{ margin: "0 auto", display: "block" }}
        />
      </Section>

      <Text style={{ color: BRAND.muted, fontSize: "12px", textAlign: "center" }}>
        Show this QR code at the door for entry
      </Text>

      <Button href={ticketUrl} style={{
        backgroundColor: BRAND.accent,
        color: "#ffffff",
        borderRadius: "9999px",
        padding: "12px 32px",
        fontSize: "14px",
      }}>
        View Your Ticket
      </Button>
    </EmailLayout>
  );
}
```

### Secret Location Reveal Logic

```typescript
// On event detail page, check ticket ownership to reveal secret location
// Modifies existing src/app/(public)/events/[slug]/page.tsx

// After fetching event data:
let hasTicket = false;
if (user && event.location_secret) {
  const { count } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("user_id", user.id);
  hasTicket = (count ?? 0) > 0;
}

// In JSX:
// If hasTicket -> show event.location
// If !hasTicket -> show "Buy a ticket to reveal" CTA
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SumUp merchant_code + pay_to_email | API keys (sk_live_, sk_test_) | 2024 | Simpler auth, no merchant email needed in code |
| SumUp embeddable card widget | Hosted Checkout (preferred) | 2024 | Full page hosted by SumUp; zero PCI scope |
| Polling for payment status | Webhooks via return_url | Current | More reliable, less API calls |

**Deprecated/outdated:**
- `pay_to_email` field in SumUp checkout creation is deprecated -- use `merchant_code` only
- SumUp Card Widget approach still works but Hosted Checkout is simpler and recommended for server-rendered apps

## Open Questions

1. **SumUp redirect_url query parameters**
   - What we know: SumUp redirects the user to `redirect_url` after payment with a "Back to merchant" button. The documentation does not explicitly state what query parameters are appended.
   - What's unclear: Whether SumUp appends `checkout_id`, `status`, or `checkout_reference` to the redirect URL.
   - Recommendation: Do NOT rely on redirect URL parameters for payment verification. Instead, encode the checkout reference in the redirect URL yourself (e.g., `/tickets/confirm?ref=CHECKOUT_REF`) and use the webhook + GET checkout API call for authoritative payment status. The redirect page polls or checks the `pending_purchases` table for completion status.

2. **SumUp webhook signature verification**
   - What we know: SumUp documentation mentions webhook signatures exist but the detailed docs for hosted checkout webhooks don't cover HMAC verification for checkout-based webhooks specifically.
   - What's unclear: Whether `return_url` webhooks include a signature header.
   - Recommendation: Rely on the mandatory GET checkout verification step as the primary security measure (as SumUp docs require). The combination of: (a) only processing known checkout IDs from `pending_purchases`, and (b) verifying via GET API call, provides sufficient protection.

3. **SumUp merchant_code environment variable**
   - What we know: The checkout creation requires `merchant_code`.
   - What's unclear: Whether the organizer already has SumUp set up.
   - Recommendation: Store `SUMUP_MERCHANT_CODE` and `SUMUP_API_KEY` as environment variables. Document setup in deployment instructions.

## Sources

### Primary (HIGH confidence)
- [SumUp Checkout API - Create Checkout](https://developer.sumup.com/docs/api/create-a-checkout/) - Request/response schema, required fields, auth
- [SumUp Hosted Checkout](https://developer.sumup.com/online-payments/checkouts/hosted-checkout) - Hosted checkout flow, URL format, redirect behavior
- [SumUp Webhooks](https://developer.sumup.com/online-payments/webhooks) - Webhook payload format, retry behavior, verification requirement
- [SumUp Single Payment Guide](https://developer.sumup.com/online-payments/guides/single-payment) - End-to-end checkout creation and processing guide
- [node-qrcode GitHub](https://github.com/soldair/node-qrcode) - API: toDataURL(), toBuffer(), options
- [Resend CID Inline Images](https://resend.com/changelog/embed-images-using-cid) - Embedding images via Content-ID attachments
- Existing codebase: `src/lib/email.ts`, `src/emails/`, `src/app/(organizer)/organizer/events/actions.ts` - established patterns

### Secondary (MEDIUM confidence)
- [PostgreSQL SELECT FOR UPDATE](https://stormatics.tech/blogs/select-for-update-in-postgresql) - Row-level locking for concurrency
- [Supabase RPC Functions](https://supabase.com/docs/reference/javascript/v1/rpc) - Atomic function calls

### Tertiary (LOW confidence)
- SumUp redirect_url parameter behavior (exact query params appended) - not fully documented; verified approach uses GET checkout API instead

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed, SumUp API docs verified
- Architecture: HIGH - follows established project patterns (server actions, RLS, service client, React Email)
- Pitfalls: HIGH - concurrency and webhook idempotency are well-documented concerns with known solutions
- SumUp redirect behavior: MEDIUM - redirect URL parameter forwarding not fully documented

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (SumUp API v0.1 is stable; no breaking changes expected)
