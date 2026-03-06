# Phase 16: Payout Reports - Research

**Researched:** 2026-03-06
**Domain:** SumUp Payouts API + Next.js Admin UI
**Confidence:** HIGH

## Summary

Questa fase aggiunge una sottopagina `/admin/finance/payouts` nell'area admin Finance esistente, permettendo al master di visualizzare lo storico dei payout SumUp (bonifici bancari) con filtro per intervallo date e breakdown per tipo di payout.

Il progetto usa gia `@sumup/sdk` v0.1.1 con un singleton in `src/lib/sumup.ts`. L'SDK espone `sumup.payouts.list(merchantCode, query)` che accetta `start_date` e `end_date` obbligatori (formato ISO8601), piu `format`, `limit` e `order` opzionali. La risposta e un array di `FinancialPayouts` con campi `amount`, `currency`, `date`, `fee`, `id`, `reference`, `status` (SUCCESSFUL/FAILED) e `type` (PAYOUT, CHARGE_BACK_DEDUCTION, REFUND_DEDUCTION, DD_RETURN_DEDUCTION, BALANCE_DEDUCTION). Non c'e paginazione cursor-based come per le transazioni: l'API ritorna un array flat filtrato per date range.

L'architettura della pagina finance esistente (Phase 14) fornisce il blueprint perfetto: Server Component con auth header check, Client Component con state per filtri, Server Actions per il data fetching. La principale differenza rispetto alle transazioni e che i payouts NON hanno paginazione cursor-based -- la date range e il meccanismo di filtro primario.

**Raccomandazione principale:** Creare una sotto-route `/admin/finance/payouts` con lo stesso pattern architetturale di `/admin/finance` (Phase 14). Aggiungere una sub-navigazione nella sezione Finance per distinguere "Transactions" e "Payouts". Usare Server Actions per chiamare `sumup.payouts.list()` con date range e presentare i risultati in una tabella/lista con badge colorati per tipo e status.

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAY-01 | Payout list page at `/admin/finance/payouts` | SDK `sumup.payouts.list(merchantCode, { start_date, end_date })` ritorna `FinancialPayouts[]`. Pattern identico a `admin/finance/page.tsx` con Server Component + Client Component |
| PAY-02 | Date range filter with start/end date pickers | SDK richiede `start_date` e `end_date` obbligatori. Input `<input type="date">` gia usato e stilizzato nel progetto (TransactionList.tsx). Formato YYYY-MM-DD da convertire a ISO8601 |
| PAY-03 | Payout details (amount, date, status, type) | `FinancialPayouts` include: `amount`, `currency`, `date`, `fee`, `status` (SUCCESSFUL/FAILED), `type` (5 valori enum), `reference`, `transaction_code` |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sumup/sdk` | 0.1.1 | Client API SumUp (payouts.list) | Gia installato e configurato con singleton in `src/lib/sumup.ts` |
| `next` | 16.1.6 | Framework React con Server Components/Actions | Stack del progetto |
| `tailwindcss` | 4.x | Styling utility-first | Stack del progetto |
| `react` | 19.2.3 | UI framework | Core dependency |

### Supporting
Nessuna libreria aggiuntiva necessaria.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<input type="date">` | react-datepicker / date-fns | Input nativo gia funzionante e stilizzato nel progetto, zero dipendenze extra |
| Sub-navigazione inline | Tab component di terze parti | Semplice implementazione con Link + `usePathname()`, coerente con AdminNav |

**Installation:**
```bash
# Nessuna nuova dipendenza necessaria
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/(admin)/admin/finance/
    page.tsx                    # (Esistente) Transazioni -- NESSUNA MODIFICA
    actions.ts                  # (Esistente) Server Actions transazioni -- AGGIUNGERE listPayouts
    payouts/
      page.tsx                  # NUOVO: Server Component per pagina payouts
  components/admin/
    AdminNav.tsx                # (Esistente) NESSUNA MODIFICA (Finance gia presente)
    FinanceSubNav.tsx           # NUOVO: Sub-navigazione Transactions | Payouts
    TransactionList.tsx         # (Esistente) NESSUNA MODIFICA
    PayoutList.tsx              # NUOVO: Client Component lista payouts + filtri date
```

### Pattern 1: Finance Sub-Navigation
**What:** Aggiungere una barra di sotto-navigazione nella sezione Finance per switch tra "Transactions" e "Payouts".
**When to use:** Quando una sezione admin ha multiple sotto-pagine.
**Example:**
```typescript
// Source: pattern da AdminNav.tsx adattato
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const subTabs = [
  { href: "/admin/finance", label: "Transactions", exact: true },
  { href: "/admin/finance/payouts", label: "Payouts" },
];

export default function FinanceSubNav() {
  const pathname = usePathname();

  return (
    <div className="mb-4 flex gap-2">
      {subTabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent/20 text-accent border border-accent/30"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
```

### Pattern 2: Server Action per Payouts
**What:** Server Action che chiama `sumup.payouts.list()` con auth check e formattazione date.
**When to use:** Per il fetch dei payouts dal Client Component.
**Example:**
```typescript
// Source: pattern da actions.ts esistente + @sumup/sdk payouts resource
"use server";

import { sumup } from "@/lib/sumup";

export async function listPayouts(params: {
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  limit?: number;
  order?: "desc" | "asc";
}) {
  await requireMaster();

  const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
  const result = await sumup.payouts.list(merchantCode, {
    start_date: params.start_date,
    end_date: params.end_date,
    format: "json",
    limit: params.limit,
    order: params.order ?? "desc",
  });

  // result e FinancialPayouts (array di payout objects)
  return Array.isArray(result) ? result : [];
}
```

### Pattern 3: Payouts Page (Server Component)
**What:** Server Component con auth check, AdminNav, FinanceSubNav e PayoutList.
**When to use:** Pagina `/admin/finance/payouts`.
**Example:**
```typescript
// Source: pattern da admin/finance/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import FinanceSubNav from "@/components/admin/FinanceSubNav";
import PayoutList from "@/components/admin/PayoutList";
import MobileNav from "@/components/layout/MobileNav";
import type { UserRole, UserStatus } from "@/types/database";

export default async function PayoutsPage() {
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
      <AdminNav role={role} />
      <div className="px-6">
        <FinanceSubNav />
        <PayoutList />
      </div>
      <MobileNav role={role} status={status} />
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Non usare API Routes per il fetch:** Il progetto usa Server Actions per tutto. Non creare `/api/finance/payouts`.
- **Non usare `listDeprecated()`:** Esiste un metodo deprecato che non richiede merchantCode. Usare SEMPRE `list(merchantCode, query)` (endpoint v1.0).
- **Non tentare paginazione cursor-based:** L'API payouts NON ha cursor pagination. Usa date range come meccanismo di filtraggio primario.
- **Non omettere start_date/end_date:** Sono parametri OBBLIGATORI nell'API payouts, a differenza delle transazioni dove sono opzionali.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API client payouts | Fetch manuale a `/v1.0/merchants/*/payouts` | `sumup.payouts.list(merchantCode, query)` | SDK gia configurato con auth, error handling, tipi |
| Date picker | Componente calendario custom | `<input type="date">` nativo | Gia stilizzato nel progetto, pattern identico a TransactionList |
| Badge status/tipo | Componente generico da libreria UI | `StatusBadge` inline (come in TransactionList.tsx) | Pattern gia consolidato nel progetto con colori Tailwind |
| Auth check | Middleware custom per actions | `requireMaster()` da `actions.ts` esistente | Gia implementato e funzionante |
| Formattazione valuta | `Intl.NumberFormat` complesso | Pattern `EUR ${amount.toFixed(2)}` | Identico a TransactionList.tsx |

**Key insight:** Tutto il codice necessario e gia presente nel progetto. La pagina payouts e essenzialmente una versione semplificata di TransactionList (nessuna paginazione cursor, nessun dettaglio espandibile, solo filtri date + tabella).

## Common Pitfalls

### Pitfall 1: start_date e end_date sono OBBLIGATORI
**What goes wrong:** Tentare di chiamare `payouts.list()` senza date range causa un errore API.
**Why it happens:** A differenza di `transactions.list()` dove i filtri data sono opzionali, l'API payouts RICHIEDE entrambe le date.
**How to avoid:** Inizializzare il componente con un date range di default (es. ultimo mese: `start_date = 30 giorni fa`, `end_date = oggi`). Disabilitare il bottone fetch se le date sono vuote.
**Warning signs:** Errore 400 Bad Request al caricamento iniziale della pagina.

### Pitfall 2: Formato date per l'API payouts
**What goes wrong:** L'input `<input type="date">` ritorna `YYYY-MM-DD`, ma il tipo SDK definisce `start_date: string` senza specificare il formato.
**Why it happens:** L'API SumUp richiede formato ISO8601 per le date dei payouts.
**How to avoid:** Passare le date in formato `YYYY-MM-DD` direttamente (l'API accetta anche questo formato per payouts, a differenza di transactions dove serve il timestamp completo). Testare con il formato raw prima di aggiungere conversioni.
**Warning signs:** Errore API con messaggio sulla validazione del formato data.

### Pitfall 3: Risposta payouts e un array flat, non un oggetto paginato
**What goes wrong:** Tentare di accedere a `result.items` o `result.links` come per le transazioni.
**Why it happens:** `FinancialPayouts` e definito come array diretto (`type FinancialPayouts = { ... }[]`), non come oggetto con `items` e `links`.
**How to avoid:** La risposta e direttamente l'array: `const payouts = await sumup.payouts.list(...)` ritorna `FinancialPayouts` che e gia un array. Nessun `.items` necessario.
**Warning signs:** `TypeError: result.map is not a function` oppure payouts vuoti.

### Pitfall 4: Tipi payout -- 5 valori, non solo 3
**What goes wrong:** Mostrare solo PAYOUT, CHARGE_BACK_DEDUCTION, REFUND_DEDUCTION e ignorare DD_RETURN_DEDUCTION e BALANCE_DEDUCTION.
**Why it happens:** Il CONTEXT.md menziona 3 tipi, ma l'SDK ne definisce 5.
**How to avoid:** Gestire tutti e 5 i tipi con badge colorati appropriati. I tipi mancanti apparirebbero come "UNKNOWN" senza label/colore.
**Warning signs:** Badge grigi/senza label per certi payouts.

### Pitfall 5: AdminNav gia include Finance -- pathname matching
**What goes wrong:** Il tab "Finance" non risulta attivo quando si naviga a `/admin/finance/payouts`.
**Why it happens:** AdminNav usa `pathname.startsWith(tab.href)` per il matching -- questo FUNZIONA correttamente perche `/admin/finance/payouts` inizia con `/admin/finance`.
**How to avoid:** Nessuna modifica necessaria ad AdminNav. Il tab Finance sara correttamente evidenziato sia su `/admin/finance` che su `/admin/finance/payouts`.
**Warning signs:** Nessuno -- funziona out of the box.

### Pitfall 6: Sub-navigazione -- matching esatto per la pagina Transactions
**What goes wrong:** Il sub-tab "Transactions" risulta attivo anche quando si e su `/admin/finance/payouts`.
**Why it happens:** Se si usa `pathname.startsWith("/admin/finance")` per il tab Transactions, matcha anche la sotto-route payouts.
**How to avoid:** Usare matching esatto (`pathname === "/admin/finance"`) per il tab Transactions, e `pathname.startsWith()` per Payouts.
**Warning signs:** Entrambi i sub-tab appaiono attivi contemporaneamente.

## Code Examples

### Chiamata SDK: List Payouts con date range
```typescript
// Source: @sumup/sdk/dist/resources/payouts/index.d.ts
import { sumup } from "@/lib/sumup";

const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
const payouts = await sumup.payouts.list(merchantCode, {
  start_date: "2026-02-01",
  end_date: "2026-03-06",
  format: "json",
  order: "desc",
  limit: 100,
});

// payouts: FinancialPayouts (array diretto)
// Ogni elemento: { amount, currency, date, fee, id, reference, status, transaction_code, type }
```

### Tipo FinancialPayouts (risposta API)
```typescript
// Source: @sumup/sdk/dist/types/financial-payouts.d.ts
type FinancialPayouts = {
  amount?: number;
  currency?: string;
  date?: string;            // Data del payout
  fee?: number;             // Commissione
  id?: number;              // ID numerico
  reference?: string;       // Riferimento bancario
  status?: "SUCCESSFUL" | "FAILED";
  transaction_code?: string; // Codice transazione collegata
  type?:
    | "PAYOUT"                  // Bonifico al merchant
    | "CHARGE_BACK_DEDUCTION"   // Deduzione per chargeback
    | "REFUND_DEDUCTION"        // Deduzione per rimborso
    | "DD_RETURN_DEDUCTION"     // Deduzione per ritorno addebito diretto
    | "BALANCE_DEDUCTION";      // Deduzione dal saldo
}[];
```

### Firma SDK Payouts.list()
```typescript
// Source: @sumup/sdk/dist/resources/payouts/index.d.ts
class Payouts extends APIResource {
  list(
    merchantCode: string,
    query: {
      start_date: string;  // Obbligatorio
      end_date: string;    // Obbligatorio
      format?: "json" | "csv";
      limit?: number;
      order?: "desc" | "asc";
    },
    params?: FetchParams
  ): APIPromise<FinancialPayouts, ErrorBody>;

  // DEPRECATO -- non usare
  listDeprecated(query: ListPayoutsQueryParams, params?: FetchParams): APIPromise<FinancialPayouts, ErrorBody>;
}
```

### Server Action completa per payouts
```typescript
// Pattern da actions.ts + SDK payouts
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

export async function listPayouts(params: {
  start_date: string;
  end_date: string;
  limit?: number;
  order?: "desc" | "asc";
}) {
  await requireMaster();

  const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
  const result = await sumup.payouts.list(merchantCode, {
    start_date: params.start_date,
    end_date: params.end_date,
    format: "json",
    limit: params.limit ?? 100,
    order: params.order ?? "desc",
  });

  // FinancialPayouts e gia un array
  return Array.isArray(result) ? result : [];
}
```

### Calcolo date di default (ultimo mese)
```typescript
// Per inizializzare il filtro date con l'ultimo mese
function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    start: start.toISOString().split("T")[0], // YYYY-MM-DD
    end: end.toISOString().split("T")[0],
  };
}
```

### Badge per tipo payout
```typescript
// Pattern da StatusBadge in TransactionList.tsx, adattato per payout types
const typeColors: Record<string, string> = {
  PAYOUT: "bg-green-500/20 text-green-400 border-green-500/30",
  CHARGE_BACK_DEDUCTION: "bg-red-500/20 text-red-400 border-red-500/30",
  REFUND_DEDUCTION: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  DD_RETURN_DEDUCTION: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BALANCE_DEDUCTION: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const typeLabels: Record<string, string> = {
  PAYOUT: "Payout",
  CHARGE_BACK_DEDUCTION: "Chargeback",
  REFUND_DEDUCTION: "Refund",
  DD_RETURN_DEDUCTION: "DD Return",
  BALANCE_DEDUCTION: "Balance Ded.",
};

const statusColors: Record<string, string> = {
  SUCCESSFUL: "bg-green-500/20 text-green-400 border-green-500/30",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
};
```

### Integrazione FinanceSubNav nella pagina Finance esistente
```typescript
// Aggiungere FinanceSubNav ANCHE nella pagina finance/page.tsx esistente
// per navigazione bidirezionale

// In admin/finance/page.tsx -- modificare:
import FinanceSubNav from "@/components/admin/FinanceSubNav";

// Nel JSX, prima di <TransactionList />:
<FinanceSubNav />
<TransactionList />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `payouts.listDeprecated()` (v0.1 API, `/v0.1/me/financials/payouts`) | `payouts.list(merchantCode, query)` (v1.0 API) | SDK 0.1.x | Usare SEMPRE la versione v1.0 con merchantCode come primo param |
| Nessuna sub-navigazione Finance | FinanceSubNav con Transactions + Payouts | Phase 16 | La sezione Finance cresce da singola pagina a sezione con sotto-pagine |

**Deprecated/outdated:**
- `listDeprecated()`: metodo v0.1, punta a `/v0.1/me/financials/payouts` senza merchantCode. Da NON usare.

## Open Questions

1. **Formato esatto delle date accettato dall'API payouts**
   - What we know: L'SDK definisce `start_date: string` e `end_date: string`. La documentazione dice "ISO8601". L'implementazione interna passa il valore direttamente come query param.
   - What's unclear: Se accetta `YYYY-MM-DD` direttamente o richiede `YYYY-MM-DDTHH:MM:SS`. Per le transazioni serve il timestamp completo, per i payouts potrebbe bastare la data.
   - Recommendation: Provare prima con `YYYY-MM-DD` (piu semplice). Se l'API lo rifiuta, appendere `T00:00:00Z` / `T23:59:59Z`.

2. **Limite massimo del parametro `limit`**
   - What we know: `limit` e opzionale. Nessun valore massimo documentato.
   - What's unclear: Quanto puo essere grande il range di date / quanti payouts possono essere ritornati.
   - Recommendation: Usare `limit: 100` come default. Se l'API lo rifiuta, ridurre. Per range molto ampi, considerare un messaggio "troppi risultati, restringi il range".

3. **Necessita di aggiungere FinanceSubNav alla pagina finance/page.tsx esistente**
   - What we know: Attualmente `/admin/finance` mostra direttamente TransactionList senza sub-navigazione.
   - What's unclear: Se aggiungere la sub-nav alla pagina esistente rompe il layout o l'esperienza utente.
   - Recommendation: Si, aggiungere FinanceSubNav anche nella pagina finance/page.tsx per permettere navigazione bidirezionale. E un'aggiunta minimale (una riga di link) sopra TransactionList.

## Sources

### Primary (HIGH confidence)
- `@sumup/sdk` v0.1.1 -- `node_modules/@sumup/sdk/dist/resources/payouts/index.d.ts` -- firma `list(merchantCode, query)`, parametri query
- `@sumup/sdk` v0.1.1 -- `node_modules/@sumup/sdk/dist/types/financial-payouts.d.ts` -- tipo `FinancialPayouts` con tutti i campi e enum values
- `node_modules/@sumup/sdk/dist/index.js` -- implementazione: `GET /v1.0/merchants/${merchantCode}/payouts`
- `node_modules/@sumup/sdk/dist/index.d.ts` -- classe `SumUp` con property `payouts: Payouts`
- `src/lib/sumup.ts` -- singleton SDK, pattern di utilizzo
- `src/app/(admin)/admin/finance/page.tsx` -- pagina Finance esistente, pattern layout
- `src/app/(admin)/admin/finance/actions.ts` -- Server Actions esistenti, pattern `requireMaster()`
- `src/components/admin/TransactionList.tsx` -- pattern Client Component con filtri date, StatusBadge, paginazione
- `src/components/admin/AdminNav.tsx` -- tab Finance gia presente, `pathname.startsWith()` matching

### Secondary (MEDIUM confidence)
- [SumUp API Reference - List Payouts](https://developer.sumup.com/api/payouts/list) -- endpoint `GET /v1.0/merchants/{merchant_code}/payouts`, query params, response schema
- [SumUp API Payouts docs](https://developer.sumup.com/docs/api/payouts/) -- conferma schema e parametri obbligatori

### Tertiary (LOW confidence)
- Nessuna fonte a bassa confidenza utilizzata.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- SDK gia installato, metodo `payouts.list()` verificato nei tipi e nell'implementazione JS
- Architecture: HIGH -- pattern identici gia presenti in Phase 14 (finance page, actions, TransactionList)
- Pitfalls: HIGH -- derivati da analisi diretta dei tipi SDK (FinancialPayouts come array flat, date obbligatorie, 5 tipi enum)
- API response format: MEDIUM -- tipo SDK verificato, ma il comportamento esatto con vari formati data non testabile senza chiamata live

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stack stabile, SDK pinned a 0.1.1)
