# Phase 15: Refund Management - Research

**Researched:** 2026-03-06
**Domain:** SumUp Refund API + Admin UI (React, Next.js Server Actions)
**Confidence:** HIGH

## Summary

La Phase 15 aggiunge il rimborso (totale e parziale) dalla vista dettaglio transazione nella sezione admin Finance. L'infrastruttura e gia in gran parte pronta: `refundTransaction()` esiste in `src/lib/sumup.ts`, il componente `TransactionList.tsx` mostra gia i dettagli inline con `TransactionDetailInline`, e il progetto ha pattern consolidati per dialog modali e `useTransition`.

Il lavoro principale consiste nel: (1) aggiungere un bottone "Refund" nel componente dettaglio inline, (2) creare un dialog di conferma con toggle full/partial e input importo, (3) creare una server action dedicata in `admin/finance/actions.ts`, e (4) aggiornare ottimisticamente la lista transazioni dopo il rimborso.

**Raccomandazione principale:** Usare il pattern `useState` + overlay modale gia presente nel progetto (`RefundRequestButton.tsx`, `CreateArtistModal.tsx`) con `useTransition` per la chiamata server. NON usare `useOptimistic` di React (non presente nel codebase) -- aggiornare lo state locale e invalidare la cache dettagli.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Refund button on eligible transactions (SUCCESSFUL, non-fully-refunded)
- Confirmation dialog with full/partial choice
- Partial refund with custom amount validation
- Optimistic UI update after refund
- Non-refundable fee warning

### Claude's Discretion
Nessuna area esplicitamente delegata nel CONTEXT.md -- le decisioni sono tutte fissate.

### Deferred Ideas (OUT OF SCOPE)
Nessuna idea differita.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REF-01 | Bottone "Refund" su transazioni successful e non rimborsate | `TransactionDetailInline` mostra gia i dettagli inline; il bottone va aggiunto li. Lo status dalla lista e `TransactionItem.status` ("SUCCESSFUL"), il `refunded_amount` indica rimborsi precedenti. Il dettaglio `TransactionFull` ha `simple_status` e `fee_amount`. |
| REF-02 | Dialog di conferma con scelta full/partial | Pattern modale esistente (`RefundRequestButton.tsx`, `CreateArtistModal.tsx`). Toggle implementabile con due bottoni radio-style. |
| REF-03 | Rimborso parziale con importo custom validato (<= originale) | SDK accetta `{ amount: number }` opzionale. Validazione: `0 < amount <= (transaction.amount - transaction.refunded_amount)`. |
| REF-04 | Aggiornamento UI dopo rimborso senza reload | Pattern `useTransition` + aggiornamento state locale `detailCache` e `transactions` nel `TransactionList`. |
| REF-05 | Warning sulle fee SumUp non rimborsabili | `fee_amount` disponibile nel dettaglio (`TransactionFull.fee_amount`). Mostrare nel dialog prima della conferma. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sumup/sdk` | current | Chiamata `sumup.transactions.refund()` | Gia in uso nel progetto, singleton in `src/lib/sumup.ts` |
| Next.js 16 | 16.x | Server Actions per il refund | Gia in uso, pattern consolidato con `"use server"` |
| React | 19.x | `useTransition`, `useState` per UI | Gia in uso ovunque nel progetto |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS v4 | 4.x | Stili del dialog e del bottone | Gia in uso, tutte le classi consistenti col design system |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom modal div | `<dialog>` element nativo | `CreateArtistModal` usa `<dialog>`, ma `RefundRequestButton` e `RefundActions` usano div + fixed overlay. Per coerenza con il pattern admin piu vicino (`RefundActions.tsx`), usare div + fixed overlay. |
| `useOptimistic` | `useState` + update manuale | `useOptimistic` non e mai usato nel codebase. `useTransition` + state update e il pattern consolidato. |

## Architecture Patterns

### Struttura dei file da creare/modificare

```
src/
  app/(admin)/admin/finance/
    actions.ts                    # MODIFICARE: aggiungere refundTransactionAction()
  components/admin/
    TransactionList.tsx           # MODIFICARE: aggiungere bottone refund + dialog
    RefundDialog.tsx              # CREARE: dialog di conferma rimborso (nuovo componente)
```

### Pattern 1: Server Action per Refund

**Cosa:** Una server action `refundTransactionAction` in `admin/finance/actions.ts` che chiama `refundTransaction()` da `src/lib/sumup.ts`.
**Quando usare:** Sempre -- le operazioni SumUp devono essere server-side.
**Esempio:**

```typescript
// Source: pattern esistente da admin/finance/actions.ts + src/app/(public)/tickets/refund-actions.ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refundTransaction } from "@/lib/sumup";

async function requireMaster() {
  const headersList = await headers();
  const role = headersList.get("x-user-role");
  if (role !== "master") {
    redirect("/dashboard");
  }
}

export async function refundTransactionAction(
  transactionCode: string,
  amount?: number
) {
  await requireMaster();

  // refundTransaction gia gestisce gli errori SDK
  await refundTransaction(transactionCode, amount);

  return { success: true };
}
```

### Pattern 2: Dialog modale con overlay (progetto standard)

**Cosa:** Dialog come overlay fisso con backdrop, stile coerente col design system.
**Quando usare:** Per ogni azione distruttiva che richiede conferma.
**Esempio:**

```typescript
// Source: pattern da src/app/(organizer)/organizer/events/[id]/tickets/RefundActions.tsx
// e src/app/(public)/tickets/[id]/RefundRequestButton.tsx

{showConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
    <div className="w-full max-w-sm rounded-2xl border border-card-border bg-background p-6">
      <h3 className="mb-4 text-lg font-bold">Titolo</h3>
      {/* contenuto */}
      <div className="flex gap-3">
        <button className="flex-1 rounded-full border border-card-border py-2.5 text-sm font-medium text-muted">
          Cancel
        </button>
        <button className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          Confirm
        </button>
      </div>
    </div>
  </div>
)}
```

### Pattern 3: useTransition per async mutation

**Cosa:** `useTransition` per gestire lo stato pending durante la chiamata server action.
**Quando usare:** Ogni volta che si chiama una server action da un componente client.
**Esempio:**

```typescript
// Source: pattern usato in 15+ componenti del progetto
const [isPending, startTransition] = useTransition();

function handleRefund() {
  setError(null);
  startTransition(async () => {
    try {
      await refundTransactionAction(txnCode, amount);
      // Update locale dello state
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed");
    }
  });
}
```

### Pattern 4: Aggiornamento ottimistico locale

**Cosa:** Dopo il refund, aggiornare lo state `transactions` e `detailCache` nel `TransactionList` senza ricaricare.
**Quando usare:** REF-04 -- dopo refund riuscito.
**Meccanismo:** La `TransactionList` gestisce `transactions` e `detailCache` come state locale. Dopo un refund:
1. Aggiornare `transactions` cambiando lo status della transazione
2. Invalidare `detailCache` per forzare il re-fetch dei dettagli
3. Passare una callback `onRefundComplete` dal `TransactionList` al `RefundDialog`

```typescript
// In TransactionList, dopo il refund:
const handleRefundComplete = (txnCode: string, refundedAmount: number, isFullRefund: boolean) => {
  // Aggiorna la lista transazioni localmente
  setTransactions(prev =>
    prev.map(txn =>
      txn.transaction_code === txnCode
        ? {
            ...txn,
            status: isFullRefund ? "REFUNDED" : txn.status,
            refunded_amount: (txn.refunded_amount ?? 0) + refundedAmount,
          }
        : txn
    )
  );
  // Invalida il cache dettagli per re-fetch
  setDetailCache(prev => {
    const next = { ...prev };
    delete next[txnCode];
    return next;
  });
};
```

### Anti-Patterns da evitare

- **Chiamare `sumup.transactions.refund()` dal client:** L'API key non deve mai essere esposta. Usare SOLO server actions.
- **Ricaricare l'intera pagina dopo refund:** Usare aggiornamento di state locale. `revalidatePath` non serve perche la pagina e interamente client-side (il componente carica i dati con server actions lazy).
- **Usare `useOptimistic`:** Non e il pattern del progetto. Usare `useTransition` + `useState`.
- **Creare un endpoint API route per il refund:** Il progetto usa server actions, non API routes, per le operazioni admin.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chiamata refund SumUp | Custom fetch con Bearer token | `refundTransaction()` da `src/lib/sumup.ts` | Gia implementato, gestisce errori SDK |
| Validazione importo | Custom regex/parser | `parseFloat` + confronto numerico | L'input `type="number"` con `min`/`max`/`step` fa il grosso |
| Auth check admin | Custom middleware | `requireMaster()` gia in `actions.ts` | Pattern consolidato, identico a `listTransactions` |
| Dialog modale | Libreria UI esterna | Div + fixed overlay + Tailwind | Pattern usato in 5+ componenti del progetto |

**Insight chiave:** L'80% del codice necessario e gia presente come pattern nel progetto. Si tratta di assemblare pezzi esistenti.

## Common Pitfalls

### Pitfall 1: Auth SumUp per Refund (API Key vs OAuth)
**Cosa succede:** La documentazione ufficiale SumUp afferma che i rimborsi richiedono un access token ottenuto tramite Authorization Code flow, NON Client Credentials. L'attuale implementazione usa `SUMUP_API_KEY`.
**Perche succede:** SumUp distingue tra API key, Client Credentials flow, e Authorization Code flow. L'API key funziona come Bearer token ma potrebbe non avere lo scope `payments` necessario per i refund.
**Come evitare:** Il progetto ha gia `refundTransaction()` in uso (da `refund-actions.ts` per i ticket refund). Se funziona per quelli, funzionera anche qui. La ricerca precedente (v1.2-sumup-api.md) nota: "da testare in sandbox". Il REQUIREMENTS.md lista "OAuth 2.0 flow" come **out of scope**. Procedere con l'API key esistente.
**Segnali di allarme:** Errore 401/403 dalla chiamata refund.

### Pitfall 2: Calcolo importo rimborsabile
**Cosa succede:** L'admin prova a rimborsare piu dell'importo restante disponibile.
**Perche succede:** Non si tiene conto dei rimborsi parziali gia effettuati.
**Come evitare:** Importo massimo rimborsabile = `transaction.amount - (transaction.refunded_amount ?? 0)`. La `TransactionHistory` (lista) ha `refunded_amount`. Il `TransactionFull` (dettaglio) non ha `refunded_amount` direttamente, ma ce l'ha nella lista. Usare il valore dalla lista + il dettaglio.

### Pitfall 3: Stato transazione dopo partial refund
**Cosa succede:** Dopo un rimborso parziale, lo status della transazione resta "SUCCESSFUL" (non "REFUNDED"). L'admin potrebbe non capire che un rimborso parziale e stato effettuato.
**Perche succede:** SumUp marca come "REFUNDED" solo le transazioni completamente rimborsate.
**Come evitare:** Mostrare `refunded_amount` nel dettaglio transazione. Se `refunded_amount > 0` ma `status != "REFUNDED"`, mostrare un badge "Partially Refunded". Il bottone "Refund" deve restare visibile per rimborsi parziali successivi.

### Pitfall 4: fee_amount non disponibile prima del dettaglio
**Cosa succede:** Il dialog refund deve mostrare il warning sulle fee, ma `fee_amount` e nel `TransactionFull` (dettaglio), non nel `TransactionHistory` (lista).
**Perche succede:** Il dettaglio viene caricato lazy (solo quando si espande la riga).
**Come evitare:** Il bottone "Refund" appare DENTRO `TransactionDetailInline`, che ha gia il dettaglio caricato. Passare `fee_amount` al `RefundDialog`.

### Pitfall 5: Doppio click / doppio rimborso
**Cosa succede:** L'admin clicca due volte "Confirm Refund" e il rimborso viene processato due volte.
**Perche succede:** La chiamata server e asincrona e il bottone non viene disabilitato.
**Come evitare:** `useTransition` con `isPending` disabilita automaticamente il bottone. Aggiungere `disabled={isPending}` al bottone di conferma.

## Code Examples

### Firma del metodo refund (dall'SDK)

```typescript
// Source: node_modules/@sumup/sdk/dist/resources/transactions/index.d.ts
refund(
  txnId: string,
  body?: { amount?: number },
  params?: FetchParams
): APIPromise<void, ErrorBody>;

// Risposta: 204 No Content (void)
```

### refundTransaction() esistente

```typescript
// Source: src/lib/sumup.ts (gia implementato)
export async function refundTransaction(transactionCode: string, amount?: number) {
  try {
    await sumup.transactions.refund(
      transactionCode,
      amount !== undefined ? { amount } : undefined
    );
    return { success: true as const };
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(`SumUp refund failed: ${JSON.stringify(error.error)}`);
    }
    throw error;
  }
}
```

### Campi chiave per eligibilita rimborso

```typescript
// Dalla TransactionHistory (lista) -- campi disponibili nella riga
interface TransactionItem {
  transaction_code?: string;
  amount?: number;          // Importo originale
  status?: string;          // "SUCCESSFUL" | "REFUNDED" | ...
  refunded_amount?: number; // Importo gia rimborsato (0 se nessuno)
}

// Logica eligibilita:
const isEligible =
  txn.status === "SUCCESSFUL" &&
  (txn.refunded_amount ?? 0) < (txn.amount ?? 0);

// Importo massimo rimborsabile:
const maxRefundable = (txn.amount ?? 0) - (txn.refunded_amount ?? 0);
```

### Campi da TransactionFull (dettaglio) per il dialog

```typescript
// Source: node_modules/@sumup/sdk/dist/types/transaction-full.d.ts
interface TransactionFull {
  fee_amount?: number;       // Fee SumUp (non rimborsabile)
  simple_status?: string;    // Status dettagliato
  amount?: number;           // Importo transazione
  // ... altri campi
}
```

### Design del RefundDialog (struttura componente)

```typescript
// Struttura consigliata per RefundDialog.tsx
interface RefundDialogProps {
  transactionCode: string;
  transactionAmount: number;
  refundedAmount: number;     // gia rimborsato
  feeAmount: number;          // fee non rimborsabile
  currency: string;
  onClose: () => void;
  onRefundComplete: (amount: number, isFullRefund: boolean) => void;
}

// State interno:
// - refundType: "full" | "partial"
// - customAmount: string (input)
// - isPending: boolean (da useTransition)
// - error: string | null

// Validazione customAmount:
// - parseFloat(customAmount) > 0
// - parseFloat(customAmount) <= maxRefundable
// - maxRefundable = transactionAmount - refundedAmount
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API Route per refund | Server Action `"use server"` | Next.js 14+ | Tutto il progetto usa server actions |
| `useOptimistic` React 19 | `useTransition` + `useState` | Convenzione progetto | Coerenza con 15+ componenti esistenti |
| Modale con `<dialog>` element | Div + fixed overlay | Convenzione progetto (admin) | `RefundActions.tsx` e `RefundRequestButton.tsx` usano questo pattern |

**Nota su `<dialog>`:** `CreateArtistModal.tsx` usa `<dialog>` nativo, ma i componenti admin/refund usano div overlay. Per la sezione admin finance, seguire il pattern dei componenti refund/admin esistenti (div overlay).

## Open Questions

1. **API Key funziona per i refund?**
   - Cosa sappiamo: La documentazione SumUp dice che serve Authorization Code flow. Il progetto usa API key. `refundTransaction()` e gia usato da `refund-actions.ts` (approvazione ticket refund).
   - Cosa non e chiaro: Se i refund tramite API key funzionano effettivamente in produzione. La ricerca v1.2 dice "da testare in sandbox".
   - Raccomandazione: Procedere con l'implementazione attuale. Se `adminRefund()` in `refund-actions.ts` funziona gia (e sembra di si, dato che non ci sono issue aperti), lo stesso meccanismo funzionera qui. Usare lo stesso `refundTransaction()`.

2. **Limite temporale per i refund SumUp**
   - Cosa sappiamo: La documentazione non specifica un limite esplicito.
   - Cosa non e chiaro: Se esiste un window (es. 180 giorni) oltre il quale i refund vengono rifiutati.
   - Raccomandazione: Gestire l'errore gracefully. Se SumUp rifiuta il refund, mostrare il messaggio di errore all'admin.

3. **Transazioni con `refunded_amount > 0` ma `status = "SUCCESSFUL"`**
   - Cosa sappiamo: SumUp marca "REFUNDED" solo per refund totale. Partial refund mantiene "SUCCESSFUL".
   - Cosa non e chiaro: Come SumUp gestisce il campo `refunded_amount` della `TransactionHistory` dopo partial refund -- viene aggiornato immediatamente?
   - Raccomandazione: Dopo refund, fare un optimistic update locale. Se l'admin riapre la pagina, i dati verranno ricaricati da SumUp con valori aggiornati.

## Sources

### Primary (HIGH confidence)
- `node_modules/@sumup/sdk/dist/resources/transactions/index.d.ts` -- firma `refund()`, tipi parametri
- `node_modules/@sumup/sdk/dist/types/transaction-full.d.ts` -- campi TransactionFull (fee_amount, simple_status)
- `node_modules/@sumup/sdk/dist/types/transaction-history.d.ts` -- campi TransactionHistory (refunded_amount, type)
- `node_modules/@sumup/sdk/dist/types/link-refund.d.ts` -- LinkRefund con min_amount/max_amount
- `src/lib/sumup.ts` -- implementazione refundTransaction() esistente
- `src/components/admin/TransactionList.tsx` -- componente da modificare
- `src/app/(admin)/admin/finance/actions.ts` -- server actions esistenti
- `src/app/(organizer)/organizer/events/[id]/tickets/RefundActions.tsx` -- pattern refund + dialog admin
- `src/app/(public)/tickets/[id]/RefundRequestButton.tsx` -- pattern dialog refund
- `src/app/(public)/tickets/refund-actions.ts` -- server actions refund esistenti (usa refundTransaction)

### Secondary (MEDIUM confidence)
- [SumUp Refunds Guide](https://developer.sumup.com/online-payments/guides/refund) -- conferma 204 response, body per partial refund, warning fee non rimborsabili, nota su Authorization Code flow
- `.planning/research/v1.2-sumup-api.md` -- ricerca precedente su SumUp API, nota su auth refund

### Tertiary (LOW confidence)
- Limite temporale refund SumUp -- non documentato, basato su ipotesi

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- tutto gia presente nel progetto, nessuna libreria nuova
- Architecture: HIGH -- pattern identici a componenti esistenti (RefundActions, RefundRequestButton)
- Pitfalls: MEDIUM -- il dubbio su API key vs OAuth per refund resta, ma l'implementazione funzionante esiste gia
- UI patterns: HIGH -- 5+ componenti di riferimento con pattern identico

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 giorni -- stack stabile)
