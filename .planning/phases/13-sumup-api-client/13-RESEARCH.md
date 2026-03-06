# Phase 13: SumUp SDK Migration - Research

**Researched:** 2026-03-06
**Domain:** SumUp API client migration (custom fetch -> @sumup/sdk v0.1.1)
**Confidence:** HIGH

## Summary

La migrazione da `src/lib/sumup.ts` (client custom basato su `fetch`) al pacchetto ufficiale `@sumup/sdk` v0.1.1 e diretta. Il client attuale espone 3 funzioni (`createCheckout`, `getCheckout`, `refundTransaction`) usate da 4 file. L'SDK ufficiale fornisce metodi corrispondenti con mapping 1:1 sugli stessi endpoint REST (`POST /v0.1/checkouts`, `GET /v0.1/checkouts/{id}`, `POST /v0.1/me/refund/{txn_id}`).

I tipi SDK sono piu ricchi delle interfacce inline attuali, ma pienamente compatibili a livello strutturale. L'unica differenza sostanziale e che `transactions.refund()` ritorna `void` (il server risponde 204 No Content), mentre il client attuale ritorna `{ success: true }` -- i call site non usano il valore di ritorno, quindi l'impatto e nullo.

Le variabili d'ambiente `SUMUP_API_KEY` e `SUMUP_MERCHANT_CODE` sono gia usate nel codice ma **mancano da `.env.local.example`** -- vanno aggiunte.

**Primary recommendation:** Creare un singleton SDK in `src/lib/sumup.ts` con wrapper functions che mantengono le stesse signature attuali, poi aggiornare gradualmente i call site. Il merchant_code ora va passato alla `checkouts.create()` dal lato chiamante (era hardcoded nel body del fetch).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Replace custom client with `@sumup/sdk` v0.1.1
- All existing payment flows must continue working unchanged
- SDK-01: Replace custom client with `@sumup/sdk`
- SDK-02: Existing checkout and refund operations work unchanged
- SDK-03: Environment variables documented in `.env.local.example`

### Claude's Discretion
(nessuna area esplicitamente delegata)

### Deferred Ideas (OUT OF SCOPE)
(nessuna idea differita specificata)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SDK-01 | Replace custom client with `@sumup/sdk` | SDK init via `new SumUp({ apiKey })`, singleton pattern; SDK methods map 1:1 to current functions |
| SDK-02 | Existing checkout and refund operations work unchanged | Complete call site inventory below; type compatibility verified; return value differences documented |
| SDK-03 | Environment variables documented in `.env.local.example` | `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE` currently missing from `.env.local.example` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sumup/sdk` | 0.1.1 | Official SumUp API client | Official SDK, zero dependencies, full TypeScript, handles API versioning internally |

### Supporting
(nessuna libreria aggiuntiva necessaria -- il SDK ha zero dipendenze)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@sumup/sdk` | Custom fetch (attuale) | Custom fetch funziona ma non ha tipi, error handling standardizzato, o versioning automatico |

**Installation:**
```bash
npm install @sumup/sdk
```

## Architecture Patterns

### Current Architecture (da sostituire)
```
src/lib/sumup.ts           -- 3 exported functions, raw fetch, inline types
  createCheckout()         -- POST /v0.1/checkouts
  getCheckout()            -- GET /v0.1/checkouts/{id}
  refundTransaction()      -- POST /v0.1/me/refund/{txn_id}
```

### Target Architecture
```
src/lib/sumup.ts           -- SDK singleton + wrapper functions
  sumup (singleton)        -- new SumUp({ apiKey })
  createCheckout()         -- sumup.checkouts.create(...)
  getCheckout()            -- sumup.checkouts.get(id)
  refundTransaction()      -- sumup.transactions.refund(txnId, { amount })
```

### Pattern: SDK Singleton with Wrapper Functions
**What:** Esportare un client singleton e wrapper functions che mantengono le stesse firme attuali.
**When to use:** Quando si vuole migrare il transport layer senza modificare i call site.
**Example:**
```typescript
// src/lib/sumup.ts
import SumUp from "@sumup/sdk";

const sumup = new SumUp({
  apiKey: process.env.SUMUP_API_KEY!,
});

export async function createCheckout(params: {
  amount: number;
  currency: string;
  description: string;
  checkoutReference: string;
  returnUrl: string;
}) {
  const checkout = await sumup.checkouts.create({
    amount: params.amount,
    currency: params.currency as any,  // SDK usa union type Currency
    merchant_code: process.env.SUMUP_MERCHANT_CODE!,
    checkout_reference: params.checkoutReference,
    description: params.description,
    return_url: params.returnUrl,
  });

  return checkout as { id: string; status: string; checkout_reference: string };
}

export async function getCheckout(checkoutId: string) {
  const checkout = await sumup.checkouts.get(checkoutId);

  return checkout as {
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
  };
}

export async function refundTransaction(transactionCode: string, amount?: number) {
  await sumup.transactions.refund(transactionCode, amount !== undefined ? { amount } : undefined);
  return { success: true };
}
```

### Anti-Patterns to Avoid
- **Non istanziare il client ad ogni chiamata:** Il costruttore `SumUp` non e costoso ma il singleton evita allocazioni ripetute e facilita il testing.
- **Non rimuovere i wrapper:** Mantenerli preserva le firme per i call site e facilita eventuali rollback.
- **Non castare il Currency type a stringa:** Usare il tipo `Currency` dall'SDK o cast con `as Currency` per type safety.

## Current Client: Complete Inventory

### Function 1: `createCheckout()`
```typescript
// Signature
export async function createCheckout(params: {
  amount: number;
  currency: string;
  description: string;
  checkoutReference: string;
  returnUrl: string;
}): Promise<{ id: string; status: string; checkout_reference: string }>
```
- **Endpoint:** `POST /v0.1/checkouts`
- **Auth:** `Bearer ${process.env.SUMUP_API_KEY}`
- **Body mapping:** `amount`, `currency`, `merchant_code` (from env), `checkout_reference`, `description`, `return_url`
- **Error handling:** Throws with JSON error body on non-OK response
- **Return:** `{ id, status, checkout_reference }`

### Function 2: `getCheckout()`
```typescript
// Signature
export async function getCheckout(checkoutId: string): Promise<{
  id: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  checkout_reference: string;
  amount: number;
  currency: string;
  transactions: Array<{ id: string; transaction_code: string; status: string }>;
}>
```
- **Endpoint:** `GET /v0.1/checkouts/{checkoutId}`
- **Auth:** `Bearer ${process.env.SUMUP_API_KEY}`
- **Error handling:** Throws with status code on non-OK response
- **Return:** Full checkout object with transactions array

### Function 3: `refundTransaction()`
```typescript
// Signature
export async function refundTransaction(
  transactionCode: string,
  amount?: number
): Promise<{ success: true }>
```
- **Endpoint:** `POST /v0.1/me/refund/{transactionCode}`
- **Auth:** `Bearer ${process.env.SUMUP_API_KEY}`
- **Body:** `{ amount }` if partial, `{}` if full refund
- **Error handling:** Throws with text error body on non-OK response
- **Return:** `{ success: true }` (constructed locally, server returns 204)

## Call Site Inventory

### Site 1: `src/app/(organizer)/organizer/events/actions.ts`
- **Import:** `import { createCheckout } from "@/lib/sumup"`
- **Used in:** `purchaseTicket()` (line 699) and `purchaseDrinks()` (line 933)
- **Call pattern (purchaseTicket):**
  ```typescript
  const response = await createCheckout({
    amount: tier.price,
    currency: "EUR",
    description: `${event.title} - ${tier.name}`,
    checkoutReference,
    returnUrl,
  });
  // Uses: response.id (stored in pending_purchases.sumup_checkout_id)
  // Returns: { success: true, checkoutId: response.id }
  ```
- **Call pattern (purchaseDrinks):**
  ```typescript
  const response = await createCheckout({
    amount: totalAmount,
    currency: "EUR",
    description,
    checkoutReference,
    returnUrl,
  });
  // Uses: response.id (stored in drink_orders.sumup_checkout_id)
  // Returns: { success: true, checkoutId: response.id }
  ```

### Site 2: `src/app/(public)/events/[slug]/menu/actions.ts`
- **Import:** `import { createCheckout } from "@/lib/sumup"`
- **Used in:** `purchaseDrinksGuest()` (line 86)
- **Call pattern:**
  ```typescript
  const response = await createCheckout({
    amount: totalAmount,
    currency: "EUR",
    description,
    checkoutReference,
    returnUrl,
  });
  // Uses: response.id (stored in drink_orders.sumup_checkout_id)
  // Returns: { success: true, checkoutId: response.id, orderId: order.id }
  ```

### Site 3: `src/app/api/webhooks/sumup/route.ts`
- **Import:** `import { getCheckout } from "@/lib/sumup"`
- **Used in:** `POST()` handler (line 22)
- **Call pattern:**
  ```typescript
  const checkout = await getCheckout(body.id);
  // Uses:
  //   checkout.status        -- compared to "PAID"
  //   checkout.id            -- match against pending_purchases/drink_orders
  //   checkout.transactions?.[0]?.transaction_code  -- stored for refund capability
  //   checkout.amount        -- passed to reserve_ticket RPC
  ```

### Site 4: `src/app/(public)/tickets/refund-actions.ts`
- **Import:** `import { refundTransaction } from "@/lib/sumup"`
- **Used in:** `approveRefund()` (line 129) and `adminRefund()` (line 338)
- **Call pattern (approveRefund):**
  ```typescript
  await refundTransaction(ticket.sumup_transaction_code, refund.amount);
  // Return value NOT used (fire and forget, catches error for status update)
  ```
- **Call pattern (adminRefund):**
  ```typescript
  await refundTransaction(ticket.sumup_transaction_code, ticket.amount_paid);
  // Return value NOT used (fire and forget, catches error to throw)
  ```

## SDK Equivalent Mapping

### createCheckout -> sumup.checkouts.create()

| Current Param | SDK Param | Notes |
|---------------|-----------|-------|
| `params.amount` | `body.amount` | Same (number) |
| `params.currency` | `body.currency` | SDK uses `Currency` union type ("EUR" is valid) |
| `process.env.SUMUP_MERCHANT_CODE` | `body.merchant_code` | **Required in SDK body** -- same as before, just explicit |
| `params.checkoutReference` | `body.checkout_reference` | Same (camelCase -> snake_case already done in current code) |
| `params.description` | `body.description` | Same (string, optional in SDK) |
| `params.returnUrl` | `body.return_url` | Same (string, optional in SDK) |

**SDK return type:** `Checkout` (fields: `id?`, `status?`, `checkout_reference?`, `amount?`, `currency?`, `transactions?`)
**Current return type:** `{ id: string; status: string; checkout_reference: string }`

**Breaking change risk: LOW.** SDK fields are optional (`?`) because the type represents all checkout states. In practice, `create` always returns `id`, `status`, and `checkout_reference`. The wrapper can assert non-null or use `!` for the fields call sites depend on (only `id` is used).

### getCheckout -> sumup.checkouts.get()

| Current | SDK | Notes |
|---------|-----|-------|
| `getCheckout(id: string)` | `sumup.checkouts.get(id: string)` | Identical signature |

**SDK return type:** `CheckoutSuccess` extends `Checkout` with `transaction_code?`, `transaction_id?`, `merchant_name?`, etc.
**Current return type:** Custom inline type with `id`, `status`, `checkout_reference`, `amount`, `currency`, `transactions[]`

**Key fields used by webhook handler:**
- `checkout.status` -- SDK type: `"PENDING" | "FAILED" | "PAID" | "EXPIRED"` -- **MATCHES** current type
- `checkout.id` -- SDK type: `string | undefined` -- always present in practice
- `checkout.transactions?.[0]?.transaction_code` -- SDK: `TransactionBase.transaction_code?: string` -- **MATCHES**
- `checkout.amount` -- SDK type: `number | undefined` -- always present for retrieved checkouts

**Breaking change risk: LOW.** All accessed fields exist on the SDK type, just marked optional.

### refundTransaction -> sumup.transactions.refund()

| Current | SDK | Notes |
|---------|-----|-------|
| `refundTransaction(transactionCode: string, amount?: number)` | `sumup.transactions.refund(txnId: string, body?: { amount?: number })` | Body wrapping needed |

**SDK return type:** `void` (APIPromise<void, ErrorBody>)
**Current return type:** `{ success: true }` (constructed locally)

**Impact: NONE.** Both call sites use `await refundTransaction(...)` without consuming the return value. The wrapper function can continue returning `{ success: true }` after the SDK call resolves.

**SDK error behavior:** Throws `APIError<ErrorBody>` on non-2xx response. This is compatible with the current try/catch patterns in call sites.

## Type Mismatches and Breaking Changes

### Mismatch 1: Optional fields in SDK types
**Severity:** LOW
**Issue:** SDK types mark most fields as optional (`id?: string`), while the current inline types assert them as required (`id: string`).
**Resolution:** The wrapper functions can use type assertions or non-null assertions since the API always returns these fields for the specific operations we use. Alternatively, keep the existing return types on the wrapper functions.

### Mismatch 2: Currency type
**Severity:** LOW
**Issue:** Current code passes `currency: "EUR"` as `string`. SDK expects `Currency` union type.
**Resolution:** Cast as `params.currency as Currency` or use the literal `"EUR"` directly. The `Currency` type includes `"EUR"`.

### Mismatch 3: refundTransaction return type
**Severity:** NONE (no call site uses return value)
**Issue:** Current function returns `{ success: true }`, SDK returns `void`.
**Resolution:** Wrapper function awaits SDK call, then returns `{ success: true }` as before.

### Mismatch 4: Error format
**Severity:** LOW
**Issue:** Current code creates `new Error("SumUp checkout creation failed: ...")` with JSON-stringified error body. SDK throws `APIError` with `.status` and `.error` properties.
**Resolution:** The wrapper can catch `APIError` and rethrow with the same message format, or call sites can be updated to handle `APIError`. Since all call sites just catch and rethrow or log, the existing pattern works.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SumUp API client | Custom fetch with manual headers/error handling | `@sumup/sdk` | Handles auth, serialization, error types, API versioning, 204 responses |
| Type definitions for SumUp entities | Inline type annotations | Import from `@sumup/sdk` types | Full TypeScript coverage for all SumUp entities |
| API version routing | Manual URL construction | SDK internal routing | SDK maps to correct API version per resource (v0.1, v1.0, v2.1) |

## Common Pitfalls

### Pitfall 1: SDK Fields Are Optional
**What goes wrong:** TypeScript errors when accessing `checkout.id` because the SDK type marks it as `string | undefined`.
**Why it happens:** The SDK types are generated from OpenAPI spec which marks most response fields as optional.
**How to avoid:** Use non-null assertions (`checkout.id!`) or type guard in wrapper functions. Better: keep wrapper return types with required fields and assert inside the wrapper.
**Warning signs:** TypeScript `Object is possibly 'undefined'` errors after migration.

### Pitfall 2: refund() First Param Is Transaction ID, Not Code
**What goes wrong:** Confusing `transaction_code` with `transaction_id`. The SDK param is named `txnId`.
**Why it happens:** The current implementation uses `transactionCode` in the param name but the URL path is `/v0.1/me/refund/{txn_id}`.
**How to avoid:** The SumUp API actually accepts transaction_code in the path (verified from current working implementation). The wrapper should pass the same value as before.
**Warning signs:** 404 errors on refund attempts.

### Pitfall 3: ESM Module Import
**What goes wrong:** Import errors or "Cannot find module" at runtime.
**Why it happens:** `@sumup/sdk` is published as `"type": "module"` with dual CJS/ESM exports.
**How to avoid:** Next.js handles this automatically via its module resolution. Use `import SumUp from "@sumup/sdk"` (default export).
**Warning signs:** Module resolution errors in `next build`.

### Pitfall 4: Not Updating .env.local.example
**What goes wrong:** New developers or CI environments miss required SumUp env vars.
**Why it happens:** `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE` are referenced in code but not documented in `.env.local.example`.
**How to avoid:** Add both variables to `.env.local.example` as part of this phase.
**Warning signs:** Runtime errors about undefined env vars.

## Code Examples

### SDK Initialization (singleton)
```typescript
// Source: /tmp/package/README.md + /tmp/package/dist/client.d.ts
import SumUp from "@sumup/sdk";

const sumup = new SumUp({
  apiKey: process.env.SUMUP_API_KEY!,
});
```

### Create Checkout
```typescript
// Source: /tmp/package/dist/resources/checkouts/index.d.ts
// SDK method: sumup.checkouts.create(body: CheckoutCreateRequest)
// Returns: APIPromise<Checkout>

const checkout = await sumup.checkouts.create({
  amount: 25.00,
  currency: "EUR",
  merchant_code: process.env.SUMUP_MERCHANT_CODE!,
  checkout_reference: "uuid-here",
  description: "Event Name - Tier Name",
  return_url: "https://example.com/api/webhooks/sumup",
});
// checkout.id -> string | undefined (always present in practice)
```

### Get Checkout
```typescript
// Source: /tmp/package/dist/resources/checkouts/index.d.ts
// SDK method: sumup.checkouts.get(id: string)
// Returns: APIPromise<CheckoutSuccess>

const checkout = await sumup.checkouts.get("checkout-id");
// checkout.status -> "PENDING" | "FAILED" | "PAID" | "EXPIRED" | undefined
// checkout.transactions?.[0]?.transaction_code -> string | undefined
// checkout.amount -> number | undefined
```

### Refund Transaction
```typescript
// Source: /tmp/package/dist/resources/transactions/index.d.ts
// SDK method: sumup.transactions.refund(txnId: string, body?: { amount?: number })
// Returns: APIPromise<void> (204 No Content)

// Full refund
await sumup.transactions.refund("transaction-code");

// Partial refund
await sumup.transactions.refund("transaction-code", { amount: 10.00 });
```

### Error Handling
```typescript
// Source: /tmp/package/dist/core.d.ts
import { APIError, SumUpError } from "@sumup/sdk";

try {
  await sumup.checkouts.create({ ... });
} catch (error) {
  if (error instanceof APIError) {
    // error.status: number (HTTP status code)
    // error.error: ErrorExtended | ErrorBody | string
    // error.response: Response
    console.error(`SumUp API error ${error.status}:`, error.error);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom fetch client | `@sumup/sdk` official SDK | 2026-03-04 (v0.1.1 published) | Full TypeScript, auto API versioning, zero deps |
| Manual `Authorization: Bearer` header | SDK constructor `{ apiKey }` | v0.1.0 | Auth handled internally |
| Manual JSON parse/error handling | `APIPromise` with typed errors | v0.1.0 | `APIError<T>` with typed error bodies |

**Note:** SDK is pre-1.0 (`v0.1.1`). README states: "We might still introduce minor breaking changes before reaching v1." This is low risk for the 3 endpoints we use (checkouts and refunds are stable SumUp APIs).

## Environment Variables

### Current State of `.env.local.example`
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend (Newsletter & Email)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=Resonate <noreply@resonatemotion.com>
RESEND_AUDIENCE_ID=your-resend-audience-id

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Master Admin
MASTER_EMAIL=your-master-admin-email@example.com

# Cron Jobs
CRON_SECRET=your-cron-secret

# Ticket QR Signing
TICKET_SIGNING_SECRET=your-64-char-hex-secret
```

### Missing Variables (to add)
```
# SumUp
SUMUP_API_KEY=your-sumup-api-key
SUMUP_MERCHANT_CODE=your-sumup-merchant-code
```

Both are already used in code (`process.env.SUMUP_API_KEY` in `src/lib/sumup.ts`, `process.env.SUMUP_MERCHANT_CODE` in same file). They just need to be documented in the example file.

## Migration Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| SDK methods don't map to current endpoints | **NONE** | Verified: same URLs (`/v0.1/checkouts`, `/v0.1/me/refund/{id}`) |
| Type incompatibilities break compilation | **LOW** | Wrapper functions with same return types; SDK optional fields handled with assertions |
| Runtime behavior changes | **LOW** | SDK uses same `fetch` under the hood; same JSON serialization; handles 204 correctly |
| Error handling differences break catch blocks | **LOW** | Wrapper can normalize errors; or call sites already use generic catch |
| Package resolution issues (ESM/CJS) | **LOW** | SDK has dual exports; Next.js handles this |
| `.env.local.example` forgotten | **LOW** | Explicit requirement (SDK-03) |

**Overall migration risk: LOW.** This is a straightforward transport layer replacement with no behavioral changes.

## Open Questions

1. **SDK pre-1.0 stability**
   - What we know: v0.1.1 published 2026-03-04, README warns of possible minor breaking changes before v1
   - What's unclear: Timeline to v1.0, scope of potential breaking changes
   - Recommendation: Pin to `0.1.1` in package.json (exact version, no caret). The 3 methods we use are core SDK functionality unlikely to change.

2. **APIError vs custom Error in call sites**
   - What we know: Call sites catch generic `Error` type. SDK throws `APIError` which extends `SumUpError` extends `Error`.
   - What's unclear: Whether any call site relies on `error.message` format
   - Recommendation: Wrapper functions should catch `APIError` and throw standard `Error` with similar messages to current implementation, ensuring backward compatibility.

## Sources

### Primary (HIGH confidence)
- `/tmp/package/dist/index.d.ts` -- SDK class structure, exports
- `/tmp/package/dist/resources/checkouts/index.d.ts` -- Checkouts resource methods
- `/tmp/package/dist/resources/transactions/index.d.ts` -- Transactions resource methods (incl. refund)
- `/tmp/package/dist/types/checkout-create-request.d.ts` -- CheckoutCreateRequest type
- `/tmp/package/dist/types/checkout.d.ts` -- Checkout type
- `/tmp/package/dist/types/checkout-success.d.ts` -- CheckoutSuccess type
- `/tmp/package/dist/types/transaction-base.d.ts` -- TransactionBase type
- `/tmp/package/dist/client.d.ts` -- HTTPClient / APIConfig
- `/tmp/package/dist/core.d.ts` -- APIPromise, APIError, SumUpError
- `/tmp/package/dist/index.js` -- Implementation: endpoint paths, 204 handling
- `/tmp/package/package.json` -- Version 0.1.1, zero deps, dual CJS/ESM
- `/tmp/package/README.md` -- Usage examples, requirements
- `src/lib/sumup.ts` -- Current client implementation (3 functions)
- `src/app/(organizer)/organizer/events/actions.ts` -- purchaseTicket, purchaseDrinks call sites
- `src/app/(public)/events/[slug]/menu/actions.ts` -- purchaseDrinksGuest call site
- `src/app/api/webhooks/sumup/route.ts` -- getCheckout call site
- `src/app/(public)/tickets/refund-actions.ts` -- refundTransaction call sites
- `.env.local.example` -- Current env var documentation

### Secondary (MEDIUM confidence)
- `.planning/research/v1.2-sumup-api.md` -- Prior SumUp API research (endpoint catalog, auth notes)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SDK inspected locally, types verified, implementation read
- Architecture: HIGH - 1:1 mapping between current functions and SDK methods verified
- Pitfalls: HIGH - Type differences, error handling, and ESM issues all verified against actual code
- Call sites: HIGH - All 4 import sites read completely, all usage patterns documented

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (SDK is pre-1.0 but pinned to exact version)
