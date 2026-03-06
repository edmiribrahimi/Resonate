# Phase 14: Admin Finance Dashboard - Research

**Researched:** 2026-03-06
**Domain:** SumUp Transaction API + Next.js Admin UI
**Confidence:** HIGH

## Summary

Questa fase aggiunge una sezione Finance nell'area admin, accessibile solo al master, che mostra le transazioni SumUp con paginazione cursor-based, filtri per data/stato e vista dettaglio con informazioni su fee e carta.

Il progetto usa gia il `@sumup/sdk` (v0.1.1) con un singleton in `src/lib/sumup.ts`. L'SDK espone `sumup.transactions.list(merchantCode, query)` che accetta parametri di paginazione cursor-based (`newest_ref`/`oldest_ref`) e filtri (`payment_types`, `statuses`, `oldest_time`, `newest_time`). La risposta include un array `links` con `rel`/`href` per navigazione next/prev. L'architettura admin del progetto segue un pattern consolidato: Server Component per fetch + header auth check, Client Component per interattivita, Server Actions per mutazioni.

**Raccomandazione principale:** Usare Server Actions per il data fetching delle transazioni (come fa `BroadcastList` con `listBroadcasts`), con un Client Component per gestire stato filtri/paginazione e chiamare le actions al cambio pagina/filtro.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Finance tab visibile solo al master admin
- Solo transazioni ECOM mostrate (no POS/terminal)
- Paginazione cursor-based (non offset-based)
- Click-to-expand per vista dettaglio transazione

### Claude's Discretion
- Nessuna area esplicitamente lasciata alla discrezione

### Deferred Ideas (OUT OF SCOPE)
- Nessuna idea posticipata esplicitamente indicata
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIN-01 | "Finance" tab in admin navigation (master only) | AdminNav.tsx usa un array `tabs` statico -- aggiungere entry condizionale. Middleware gia protegge /admin/* per master-only |
| FIN-02 | Transaction list page at `/admin/finance` | Seguire pattern di `admin/members/page.tsx`: Server Component con header auth check, AdminNav, e Client Component per la lista |
| FIN-03 | Cursor-based pagination (prev/next) | SDK `transactions.list()` supporta `newest_ref`/`oldest_ref`/`limit`. Response `links[]` contiene href con cursori per next page |
| FIN-04 | Date range and status filters | SDK supporta `oldest_time`/`newest_time` (ISO8601) e `statuses[]`. Input `type="date"` gia stilizzato in globals.css |
| FIN-05 | Transaction detail view with fees, card info | `transactions.get(merchantCode, { transaction_code })` ritorna `TransactionFull` con `fee_amount`, `card` (last_4_digits, type), `simple_status`, `vat_rates`, etc. |
| FIN-06 | ECOM filter applied by default | SDK `payment_types: ["ECOM"]` nel parametro query di `transactions.list()` |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sumup/sdk` | 0.1.1 | Client API SumUp (transazioni, checkout) | Gia installato e configurato con singleton |
| `next` | 16.1.6 | Framework React con Server Components/Actions | Stack del progetto |
| `tailwindcss` | 4.x | Styling utility-first | Stack del progetto |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react` | 19.2.3 | UI framework | Core dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<input type="date">` | react-datepicker / date-fns | Gia funzionante nel progetto, no dipendenze extra necessarie |
| Server Actions per fetch | API Route `/api/finance/transactions` | Server Actions sono il pattern consolidato nel progetto (vedi newsletter actions) |

**Installation:**
```bash
# Nessuna nuova dipendenza necessaria
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/(admin)/admin/finance/
    page.tsx              # Server Component: auth check + layout shell
    actions.ts            # Server Actions: listTransactions, getTransaction
  components/admin/
    AdminNav.tsx          # Modificare: aggiungere tab Finance (condizionale master)
    TransactionList.tsx   # Client Component: lista + filtri + paginazione
    TransactionDetail.tsx # Client Component: dettaglio espandibile in-row
```

### Pattern 1: Admin Page con Server Component + Auth Header
**What:** Ogni pagina admin legge il ruolo dall'header `x-user-role` iniettato dal middleware e verifica `role === "master"`.
**When to use:** Tutte le pagine admin (gia usato ovunque nel progetto).
**Example:**
```typescript
// Source: src/app/(admin)/admin/members/page.tsx (pattern esistente)
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole, UserStatus } from "@/types/database";

export default async function AdminFinancePage() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  const status = (headersList.get("x-user-status") as UserStatus) || null;

  if (role !== "master") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
      </header>
      <AdminNav />
      <div className="px-6">
        <TransactionList />
      </div>
      <MobileNav role={role} status={status} />
    </div>
  );
}
```

### Pattern 2: Server Actions per Data Fetching (Client -> Server)
**What:** Client Components chiamano Server Actions che eseguono fetch lato server (con credenziali API protette).
**When to use:** Quando il Client Component deve ri-fetchare dati (paginazione, filtri).
**Example:**
```typescript
// Source: pattern da src/app/(admin)/admin/newsletter/actions.ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sumup } from "@/lib/sumup";
import type { UserRole } from "@/types/database";

async function requireMaster() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  if (role !== "master") {
    redirect("/dashboard");
  }
}

export async function listTransactions(params: {
  limit?: number;
  oldest_time?: string;
  newest_time?: string;
  statuses?: string[];
  newest_ref?: string;
  oldest_ref?: string;
  order?: "ascending" | "descending";
}) {
  await requireMaster();

  const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
  const result = await sumup.transactions.list(merchantCode, {
    payment_types: ["ECOM"],  // FIN-06: solo ECOM
    limit: params.limit ?? 20,
    order: params.order ?? "descending",
    statuses: params.statuses as any,
    oldest_time: params.oldest_time,
    newest_time: params.newest_time,
    newest_ref: params.newest_ref,
    oldest_ref: params.oldest_ref,
  });

  return result;
}
```

### Pattern 3: Click-to-Expand Detail Row
**What:** Riga tabella con chevron, click espande una riga di dettaglio sotto.
**When to use:** TransactionDetail -- identico a MemberTable.
**Example:**
```typescript
// Source: src/components/admin/MemberTable.tsx (pattern esistente)
const [expandedId, setExpandedId] = useState<string | null>(null);

const toggleExpanded = (id: string) => {
  setExpandedId((prev) => (prev === id ? null : id));
};

// In tabella:
{isExpanded && (
  <tr className="border-b border-card-border/50">
    <td colSpan={colCount} className="bg-card/20 px-8 py-2">
      <TransactionDetail transactionCode={txn.transaction_code} />
    </td>
  </tr>
)}
```

### Anti-Patterns to Avoid
- **Non usare API Routes per il fetch:** Il progetto usa Server Actions per tutto il data fetching server-side chiamato da client. Non creare `/api/finance/*` routes.
- **Non caricare tutte le transazioni in un Server Component:** I dati sono paginati e filtrabili, serve un Client Component con state per gestire interattivita.
- **Non hardcodare il merchant_code:** Usare sempre `process.env.SUMUP_MERCHANT_CODE`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Paginazione cursor | Parsing manuale URL links | Estrarre `newest_ref`/`oldest_ref` dai `links[]` della response | L'SDK ritorna links con rel/href, basta parsare i query params |
| Filtro date | Date picker custom | `<input type="date">` nativo | Gia stilizzato in globals.css, nessuna libreria esterna |
| Auth check in actions | Middleware custom per actions | `requireMaster()` helper con `headers()` | Pattern gia usato in newsletter/actions.ts |
| Formattazione valuta | `toLocaleString()` | Helper `formatEUR()` gia presente in SalesDashboard | Pattern consolidato del progetto |

**Key insight:** Il progetto ha gia tutti i building blocks necessari: SDK configurato, pattern auth, pattern UI tabellare con expand, date input stilizzato. Non servono nuove dipendenze.

## Common Pitfalls

### Pitfall 1: Cursor pagination -- confusione tra newest_ref e oldest_ref
**What goes wrong:** Invertire i parametri di paginazione causa loop infiniti o pagine vuote.
**Why it happens:** `newest_ref` filtra transazioni CREATE PRIMA di quel ref (pagina successiva con order descending), `oldest_ref` filtra quelle CREATE DOPO (pagina precedente).
**How to avoid:** Con `order: "descending"`: per andare AVANTI (pagina successiva) usare `newest_ref` dal link con `rel: "next"`. Per INDIETRO usare il ref salvato in uno stack.
**Warning signs:** Pagina che ritorna gli stessi risultati, o lista vuota dopo il primo click.

### Pitfall 2: Links array della response potrebbe essere undefined
**What goes wrong:** `result.links` puo essere `undefined` o un array vuoto se non ci sono altre pagine.
**Why it happens:** L'SDK marca `links?` come opzionale nel tipo `ListTransactionsV2_1Response`.
**How to avoid:** Sempre check `result.links?.find(l => l.rel === "next")` prima di mostrare il bottone "Next". Se undefined, siamo all'ultima pagina.
**Warning signs:** Errore runtime "Cannot read property 'find' of undefined".

### Pitfall 3: TransactionFull richiede chiamata separata per i dettagli
**What goes wrong:** Tentare di mostrare `fee_amount` e `card` dalla lista transazioni -- questi campi NON sono in `TransactionHistory`.
**Why it happens:** `transactions.list()` ritorna `TransactionHistory[]` (tipo base), non `TransactionFull`. I dettagli completi (fee, card, events) richiedono `transactions.get()`.
**How to avoid:** Chiamare `sumup.transactions.get(merchantCode, { transaction_code })` SOLO quando l'utente espande una riga (lazy loading).
**Warning signs:** Campi fee/card sempre undefined nella lista.

### Pitfall 4: L'input date nativo ritorna formato YYYY-MM-DD, l'API vuole ISO8601
**What goes wrong:** Passare `"2026-03-06"` come `oldest_time` -- l'API potrebbe rifiutarlo o interpretarlo male.
**Why it happens:** `<input type="date">` ritorna `YYYY-MM-DD`, l'API si aspetta ISO8601 completo.
**How to avoid:** Convertire: `oldest_time = new Date(dateValue + "T00:00:00").toISOString()` e `newest_time = new Date(dateValue + "T23:59:59").toISOString()`.
**Warning signs:** Filtro date che non filtra nulla o errore API.

### Pitfall 5: AdminNav condizionale per Finance tab
**What goes wrong:** Aggiungere il tab Finance all'array statico `tabs` lo rende visibile a tutti i ruoli admin.
**Why it happens:** AdminNav.tsx e un "use client" component che non ha accesso al ruolo utente.
**How to avoid:** Passare il ruolo come prop ad AdminNav, oppure definire il tab Finance solo condizionalmente. In alternativa, dato che middleware gia blocca non-master da /admin/finance, il tab puo restare visibile (ma sarebbe un link morto per non-master). Approccio raccomandato: passare `role` come prop.
**Warning signs:** Tab Finance visibile ad organizers (che non hanno accesso alla pagina).

## Code Examples

### Chiamata SDK: List Transactions con filtri ECOM
```typescript
// Source: @sumup/sdk/dist/resources/transactions/index.d.ts
import { sumup } from "@/lib/sumup";

const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
const result = await sumup.transactions.list(merchantCode, {
  payment_types: ["ECOM"],
  statuses: ["SUCCESSFUL", "FAILED", "REFUNDED"],
  order: "descending",
  limit: 20,
  oldest_time: "2026-01-01T00:00:00.000Z",
  newest_time: "2026-03-06T23:59:59.999Z",
});

// result: { items?: TransactionHistory[], links?: TransactionsHistoryLink[] }
```

### Tipo TransactionHistory (dalla lista)
```typescript
// Source: @sumup/sdk/dist/types/transaction-history.d.ts
// Campi disponibili nella lista:
interface TransactionHistorySummary {
  id?: string;
  transaction_code?: string;
  amount?: number;
  currency?: Currency;           // "EUR" etc.
  timestamp?: string;            // ISO8601
  status?: "SUCCESSFUL" | "CANCELLED" | "FAILED" | "PENDING";
  payment_type?: PaymentType;    // "ECOM" | "POS" | ...
  type?: "PAYMENT" | "REFUND" | "CHARGE_BACK";
  card_type?: CardType;          // "VISA" | "MASTERCARD" | ...
  product_summary?: string;      // description dal checkout
  payout_date?: string;
  refunded_amount?: number;
  installments_count?: number;
}
```

### Tipo TransactionFull (dal dettaglio)
```typescript
// Source: @sumup/sdk/dist/types/transaction-full.d.ts
// Campi EXTRA disponibili nel dettaglio (transactions.get):
interface TransactionFullExtra {
  fee_amount?: number;           // Commissione SumUp
  card?: {
    last_4_digits?: string;
    type?: CardType;
  };
  simple_status?: "SUCCESSFUL" | "PAID_OUT" | "CANCELLED" | "REFUNDED" | ...;
  simple_payment_type?: string;
  verification_method?: string;
  vat_rates?: Array<{ rate?: number; net?: number; vat?: number; gross?: number }>;
  transaction_events?: TransactionEvent[];
  payout_type?: "BANK_ACCOUNT" | "PREPAID_CARD";
  tip_amount?: number;
  entry_mode?: EntryMode;
}
```

### Chiamata SDK: Get Transaction Detail
```typescript
// Source: @sumup/sdk/dist/resources/transactions/index.d.ts
const detail = await sumup.transactions.get(merchantCode, {
  transaction_code: "TXCODE123"
});

// detail: TransactionFull -- include fee_amount, card, simple_status, etc.
```

### Estrazione cursori dai links per paginazione
```typescript
// Response links example:
// links: [{ rel: "next", href: "...?oldest_ref=abc123&limit=20" }]

function extractCursorFromLink(links?: Array<{ rel: string; href: string }>, rel: string): string | undefined {
  const link = links?.find(l => l.rel === rel);
  if (!link?.href) return undefined;

  try {
    const url = new URL(link.href, "https://api.sumup.com");
    // Per "next" con order descending, il cursore rilevante e in oldest_ref o newest_ref
    return url.searchParams.get("oldest_ref") ?? url.searchParams.get("newest_ref") ?? undefined;
  } catch {
    return undefined;
  }
}
```

### Server Action con auth check
```typescript
// Source: pattern da src/app/(admin)/admin/newsletter/actions.ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types/database";

async function requireMaster() {
  const headersList = await headers();
  const role = (headersList.get("x-user-role") as UserRole) || null;
  if (role !== "master") {
    redirect("/dashboard");
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `transactions.listDeprecated()` (v0.1 API) | `transactions.list(merchantCode, query)` (v2.1 API) | SDK 0.1.x | Usare SEMPRE la versione v2.1 con merchantCode come primo param |
| `transactions.getDeprecated()` | `transactions.get(merchantCode, query)` | SDK 0.1.x | Idem -- v2.1 richiede merchantCode |
| Offset pagination | Cursor-based via `newest_ref`/`oldest_ref` | SumUp API v2.1 | Non esiste offset-based nella API SumUp |

**Deprecated/outdated:**
- `listDeprecated()` / `getDeprecated()`: metodi v0.1, da NON usare. Usare `list()` e `get()` che puntano a v2.1.

## Open Questions

1. **Struttura esatta dei `links[]` nella response per navigazione prev**
   - What we know: `links` contiene oggetti `{ rel: string, href: string }`. "next" e documentato.
   - What's unclear: Se esiste un link con `rel: "prev"` per tornare indietro, o se bisogna gestire uno stack di cursori client-side.
   - Recommendation: Implementare uno stack di cursori nel client state. Salvare il cursore corrente prima di navigare avanti, e usarlo per tornare indietro. Questo funziona indipendentemente dalla presenza di un link "prev".

2. **Limite massimo di `limit` nel parametro query**
   - What we know: Default e 10 se non specificato.
   - What's unclear: Il massimo permesso dall'API (probabilmente 100 o 250).
   - Recommendation: Usare `limit: 20` come default ragionevole. Se l'API lo rifiuta, ridurre.

## Sources

### Primary (HIGH confidence)
- `@sumup/sdk` v0.1.1 type definitions -- `node_modules/@sumup/sdk/dist/resources/transactions/index.d.ts` -- firme metodi, tipi query params
- `node_modules/@sumup/sdk/dist/types/transaction-*.d.ts` -- TransactionBase, TransactionHistory, TransactionFull, TransactionMixinHistory
- `node_modules/@sumup/sdk/dist/types/payment-type.d.ts` -- PaymentType union ("ECOM" | "POS" | ...)
- `node_modules/@sumup/sdk/dist/types/card-response.d.ts` -- CardResponse type
- `src/lib/sumup.ts` -- singleton SDK, merchant_code usage
- `src/components/admin/AdminNav.tsx` -- struttura tabs admin
- `src/components/admin/MemberTable.tsx` -- pattern expand/collapse, filtri, badge
- `src/app/(admin)/admin/members/page.tsx` -- pattern Server Component admin con auth header
- `src/app/(admin)/admin/newsletter/actions.ts` -- pattern Server Actions con requireMaster()
- `src/lib/supabase/middleware.ts` -- auth middleware, header injection, role-based route protection

### Secondary (MEDIUM confidence)
- [SumUp API List Transactions docs](https://developer.sumup.com/docs/api/list-transactions/) -- parametri query, cursor pagination
- [SumUp API Reference](https://developer.sumup.com/api) -- endpoint overview

### Tertiary (LOW confidence)
- Nessuna fonte a bassa confidenza utilizzata.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- SDK gia installato e utilizzato, tutti i tipi verificati nei node_modules
- Architecture: HIGH -- patterns identici gia presenti in 4+ pagine admin del progetto
- Pitfalls: HIGH -- derivati da analisi diretta dei tipi SDK e dei pattern esistenti
- Cursor pagination: MEDIUM -- meccanismo verificato nei tipi SDK, ma struttura esatta dei `links[]` di risposta non verificabile senza chiamata API live

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stack stabile, SDK pinned a 0.1.1)
