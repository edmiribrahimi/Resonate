# Phase 18: Card Tokenization - Research

**Researched:** 2026-03-06
**Domain:** SumUp Customers API + Card Tokenization + Payment Widget
**Confidence:** HIGH

## Summary

La tokenizzazione delle carte in SumUp segue un flusso ben definito in tre fasi: (1) creare un Customer SumUp e collegarlo al profilo Resonate, (2) creare un checkout con `purpose: "SETUP_RECURRING_PAYMENT"` e `customer_id` per tokenizzare la carta tramite il Card Widget, (3) usare il token salvato per pagamenti futuri via SDK server-side (`checkouts.process()` con `token` + `customer_id`).

L'SDK `@sumup/sdk@0.1.1` gia installato nel progetto espone tutte le risorse necessarie: `sumup.customers.create()`, `sumup.customers.listPaymentInstruments()`, `sumup.customers.deactivatePaymentInstrument()`, e `sumup.checkouts.process()`. Il Card Widget gestisce automaticamente la UI di consenso e la verifica 3DS quando il checkout ha `purpose: "SETUP_RECURRING_PAYMENT"`.

Il progetto attuale non ha una pagina impostazioni/profilo dedicata -- la sezione "Settings" e direttamente nella dashboard (`/dashboard`). La gestione carte salvate dovra essere aggiunta come nuova sezione nella dashboard oppure come pagina dedicata `/saved-cards`. La tabella `profiles` necessita di una colonna `sumup_customer_id TEXT`.

**Raccomandazione principale:** Estendere `createCheckout` in `src/lib/sumup.ts` per accettare `customer_id` e `purpose`, aggiungere funzioni wrapper per le operazioni customers, e integrare il flusso tokenizzazione nel modale checkout esistente con una checkbox "Salva carta".

<user_constraints>
## User Constraints (da CONTEXT.md)

### Decisioni Bloccate
- TOK-01: Resonate profile collegato a SumUp customer (`sumup_customer_id` nella tabella `profiles`)
- TOK-02: Flusso "Save card" via `purpose: "SETUP_RECURRING_PAYMENT"` checkout
- TOK-03: Opzione "Pay with saved card" per membri di ritorno
- TOK-04: Visualizzazione e cancellazione carte salvate dal profilo/settings

### Key Files (da CONTEXT.md)
- `src/lib/sumup.ts` (SDK client) -- `sumup.customers.create()`, `sumup.customers.listPaymentInstruments()`
- `src/components/SumUpCardWidget.tsx` -- necessita supporto tokenizzazione
- Database: tabella `profiles` necessita colonna `sumup_customer_id`

### Flusso Card Save (da CONTEXT.md)
1. Creare SumUp customer con nome + email del membro
2. Salvare `customer_id` restituito in `profiles.sumup_customer_id`
3. Creare checkout con `purpose: "SETUP_RECURRING_PAYMENT"` e `customer_id`
4. Card Widget processa -- addebito autorizzazione rimborsato istantaneamente
5. Token dello strumento di pagamento salvato da SumUp sul customer

### Flusso Pay with Saved Card (da CONTEXT.md)
1. Recuperare strumenti salvati via `sumup.customers.listPaymentInstruments(customerId)`
2. Mostrare opzione "Pay with saved card (Visa **** 1234)" nella UI checkout
3. Creare checkout con `customer_id`
4. Processare checkout via SDK con token salvato (server-side, nessun Card Widget necessario)

### Card Management (da CONTEXT.md)
1. Listare carte salvate da `sumup.customers.listPaymentInstruments()`
2. Cancellare carta via `sumup.customers.deactivatePaymentInstrument(customerId, token)`
3. UI nella pagina profilo/settings del membro
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descrizione | Supporto dalla Ricerca |
|----|-------------|------------------------|
| TOK-01 | SumUp customer creato e collegato al profilo Resonate (stored `sumup_customer_id`) | SDK `Customers.create()` verificato, tipo `Customer { customer_id, personal_details }`, migrazione SQL per aggiungere colonna a `profiles` |
| TOK-02 | Checkbox "Save card for future payments" durante checkout crea tokenization checkout | `CheckoutCreateRequest.purpose: "SETUP_RECURRING_PAYMENT"` e `customer_id` verificati nei tipi SDK, Card Widget gestisce UI consenso automaticamente |
| TOK-03 | Membro di ritorno vede opzione "Pay with saved card" usando token salvato | `Checkouts.process()` accetta `ProcessCheckout { token, customer_id, payment_type: "card" }`, `Customers.listPaymentInstruments()` restituisce `PaymentInstrumentResponse[]` con `card.last_4_digits` e `token` |
| TOK-04 | Membro puo visualizzare e cancellare carte salvate dalle impostazioni profilo | `Customers.listPaymentInstruments()` e `Customers.deactivatePaymentInstrument()` verificati, tipo `PaymentInstrumentResponse` con `token`, `active`, `card.last_4_digits`, `card.type` |
</phase_requirements>

## Standard Stack

### Core
| Libreria | Versione | Scopo | Perche Standard |
|----------|----------|-------|-----------------|
| @sumup/sdk | 0.1.1 | Customers API + Checkouts API | Gia installato, SDK ufficiale TypeScript, tipizzazione completa |
| SumUp Card Widget | v2 (CDN) | UI pagamento + tokenizzazione con consenso | Gia integrato, gestisce PCI/3DS/consent automaticamente |

### Supporting
| Libreria | Versione | Scopo | Quando Usare |
|----------|----------|-------|--------------|
| Supabase (gia installato) | - | Storage `sumup_customer_id` nella tabella profiles | Migrazione schema + query profilo |
| Next.js Server Actions (gia in uso) | 16 | API layer per operazioni customer/checkout | Pattern gia stabilito nel progetto |

### Alternative Considerate
| Invece di | Si Potrebbe Usare | Tradeoff |
|-----------|-------------------|----------|
| SDK `checkouts.process()` per token | Card Widget con `customer_id` pre-compilato | Widget richiede interazione utente -- per pagamento con token salvato serve server-side |
| Colonna `sumup_customer_id` in profiles | Tabella separata `sumup_customers` | Over-engineering per relazione 1:1 -- colonna singola e sufficiente |

## Architecture Patterns

### Struttura Progetto Raccomandata
```
src/
  lib/
    sumup.ts               # Estendere: aggiungere createTokenizationCheckout, funzioni customers
  app/
    (members)/
      dashboard/
        SavedCardsSection.tsx    # Nuova sezione nella dashboard esistente
        actions.ts               # Server actions per CRUD carte
    (public)/
      events/[slug]/
        SumUpCheckoutModal.tsx   # Estendere: checkbox "save card", opzione "pay with saved card"
    api/
      webhooks/sumup/
        route.ts                 # Estendere: gestire checkout tokenizzazione (no ticket/drink)
supabase/
  migrations/
    YYYYMMDD_phase18_card_tokenization.sql  # Aggiungere sumup_customer_id a profiles
```

### Pattern 1: Checkout con Tokenizzazione (Card Save)
**Cosa:** Creare un checkout SumUp con `purpose: "SETUP_RECURRING_PAYMENT"` e `customer_id`
**Quando usare:** Quando il membro seleziona "Salva carta per pagamenti futuri"
**Esempio:**
```typescript
// Source: @sumup/sdk types CheckoutCreateRequest + documentazione SumUp
// In src/lib/sumup.ts

export async function createTokenizationCheckout(params: {
  amount: number;
  currency: string;
  description: string;
  checkoutReference: string;
  returnUrl: string;
  redirectUrl?: string;
  customerId: string;
}) {
  const checkout = await sumup.checkouts.create({
    amount: params.amount,
    currency: params.currency as "EUR",
    merchant_code: process.env.SUMUP_MERCHANT_CODE!,
    checkout_reference: params.checkoutReference,
    description: params.description,
    return_url: params.returnUrl,
    redirect_url: params.redirectUrl,
    customer_id: params.customerId,
    purpose: "SETUP_RECURRING_PAYMENT",
  });
  return checkout;
}
```

### Pattern 2: Pagamento con Token Salvato (Server-Side)
**Cosa:** Processare checkout con token salvato senza Card Widget
**Quando usare:** Quando il membro sceglie "Paga con carta salvata"
**Esempio:**
```typescript
// Source: @sumup/sdk types ProcessCheckout + Checkouts.process()
// In src/lib/sumup.ts

export async function processWithSavedCard(params: {
  checkoutId: string;
  token: string;
  customerId: string;
}) {
  const result = await sumup.checkouts.process(params.checkoutId, {
    payment_type: "card",
    token: params.token,
    customer_id: params.customerId,
  });
  return result;
}
```

### Pattern 3: Gestione Customer SumUp
**Cosa:** Creare customer SumUp e collegarlo al profilo Resonate
**Quando usare:** Al primo salvataggio carta (lazy creation)
**Esempio:**
```typescript
// Source: @sumup/sdk types Customer + Customers.create()
// In src/lib/sumup.ts

export async function getOrCreateCustomer(params: {
  uniqueId: string;  // Usare l'UUID Supabase del membro
  firstName: string;
  lastName: string;
  email: string;
}) {
  // customer_id e specificato dal client, non generato da SumUp
  const customer = await sumup.customers.create({
    customer_id: params.uniqueId,
    personal_details: {
      first_name: params.firstName,
      last_name: params.lastName,
      email: params.email,
    },
  });
  return customer;
}
```

### Pattern 4: Decisione Flusso Checkout
**Cosa:** Decidere se mostrare Card Widget, opzione saved card, o entrambi
**Quando usare:** Quando si apre il modale checkout per ticket o drink
**Esempio:**
```typescript
// In una server action:
// 1. Controllare se il membro ha un sumup_customer_id
// 2. Se si, recuperare payment instruments
// 3. Passare le info al client per mostrare le opzioni

const { data: profile } = await supabase
  .from("profiles")
  .select("sumup_customer_id")
  .eq("id", user.id)
  .single();

let savedCards: PaymentInstrumentResponse[] = [];
if (profile?.sumup_customer_id) {
  savedCards = await sumup.customers.listPaymentInstruments(profile.sumup_customer_id);
  // Filtrare solo carte attive
  savedCards = savedCards.filter(c => c.active);
}
```

### Anti-Pattern da Evitare
- **Creare customer SumUp alla registrazione:** Crea SumUp customer solo quando il membro vuole salvare una carta (lazy creation). Non tutti i membri useranno questa feature.
- **Salvare dati carta nel database Resonate:** Mai salvare numero, CVV, o scadenza. Solo `sumup_customer_id` va nel database. I token sono gestiti interamente da SumUp.
- **Usare Card Widget per pagamenti con token salvato:** Il pagamento con token salvato e server-side via `checkouts.process()`. Il Card Widget non serve in questo caso.
- **Customer ID custom vs UUID Supabase:** Usare il UUID del profilo Supabase come `customer_id` SumUp per mapping diretto 1:1 senza join aggiuntivi.

## Don't Hand-Roll

| Problema | Non Costruire | Usare Invece | Perche |
|----------|---------------|--------------|--------|
| Consenso salvataggio carta | Form custom per consenso GDPR/PSD2 | Card Widget con `purpose: "SETUP_RECURRING_PAYMENT"` | Widget gestisce UI consenso, compliance PSD2, e 3DS automaticamente |
| Validazione carta | Validatore numero carta | SumUp Card Widget | PCI compliance richiede che i dati carta non passino mai per il server |
| Mandate object | Gestione consenso custom | Card Widget automatico | Se si bypassa il widget, serve mandate con `user_agent` + `user_ip` + responsabilita legale |
| Crittografia token | Storage token criptato | SumUp Customers API | I token sono gestiti da SumUp, Resonate salva solo `customer_id` |

**Insight chiave:** Il Card Widget gestisce automaticamente tutto il flusso di consenso e tokenizzazione quando il checkout ha `purpose: "SETUP_RECURRING_PAYMENT"`. Non tentare di replicare questa logica.

## Common Pitfalls

### Pitfall 1: Addebito Temporaneo Visibile
**Cosa va storto:** L'utente vede un addebito temporaneo sulla carta durante la tokenizzazione
**Perche succede:** Il checkout di tokenizzazione crea un'autorizzazione reale (poi istantaneamente rimborsata) per verificare la carta
**Come evitare:** Informare chiaramente l'utente PRIMA di iniziare il flusso: "Verra effettuato un addebito temporaneo che sara rimborsato immediatamente"
**Segnali d'allarme:** Utenti che segnalano addebiti non autorizzati

### Pitfall 2: Customer ID Duplicato
**Cosa va storto:** Errore 409 Conflict se si tenta di creare un customer con ID gia esistente
**Perche succede:** Il `customer_id` e specificato dal client (non auto-generato) e deve essere univoco
**Come evitare:** Usare il UUID Supabase del profilo come `customer_id`, e usare `sumup.customers.get()` prima di `create()` per check idempotenza. Oppure gestire l'errore 409 come "gia esiste, prosegui".
**Segnali d'allarme:** Errori API durante il secondo tentativo di salvataggio carta

### Pitfall 3: Webhook Tokenizzazione vs Checkout Normale
**Cosa va storto:** Il webhook riceve un `CHECKOUT_STATUS_CHANGED` per un checkout di tokenizzazione e non trova ne `pending_purchases` ne `drink_orders`
**Perche succede:** I checkout di tokenizzazione non hanno un ordine associato
**Come evitare:** Il webhook deve gestire il caso "tokenizzazione completata" -- loggare e ignorare oppure aggiornare un record dedicato
**Segnali d'allarme:** Log di errore nel webhook: "no pending purchase or drink order found"

### Pitfall 4: Token Carta Scaduta/Disattivata
**Cosa va storto:** Pagamento con token salvato fallisce perche la carta e scaduta o disattivata dalla banca
**Perche succede:** I token possono diventare invalidi nel tempo
**Come evitare:** Gestire l'errore di `checkouts.process()` con fallback al Card Widget. Mostrare messaggio "Carta non piu valida, inserisci una nuova carta"
**Segnali d'allarme:** Errori ricorrenti su `checkouts.process()` per lo stesso token

### Pitfall 5: Amount per Checkout Tokenizzazione
**Cosa va storto:** Si imposta amount: 0 per il checkout di tokenizzazione
**Perche succede:** Si pensa che siccome e solo per salvare la carta, l'importo non serve
**Come evitare:** Usare un importo reale (minimo possibile, es. 1.00 EUR) -- SumUp richiede un importo valido per l'autorizzazione. L'importo viene rimborsato istantaneamente
**Segnali d'allarme:** Errore API "invalid amount"

### Pitfall 6: `customer_id` Mancante nel Checkout Tokenizzazione
**Cosa va storto:** Il checkout con `purpose: "SETUP_RECURRING_PAYMENT"` va a buon fine ma il token non viene salvato
**Perche succede:** `customer_id` non e stato passato nel `CheckoutCreateRequest`
**Come evitare:** Passare SEMPRE `customer_id` quando `purpose` e `"SETUP_RECURRING_PAYMENT"`
**Segnali d'allarme:** `listPaymentInstruments` restituisce array vuoto dopo tokenizzazione

## Code Examples

### Creazione Customer SumUp (verificato da SDK types)
```typescript
// Source: @sumup/sdk Customer type + Customers.create()
import { sumup } from "@/lib/sumup";

// customer_id e passato dal client, non generato
const customer = await sumup.customers.create({
  customer_id: "user-uuid-from-supabase",
  personal_details: {
    first_name: "Marco",
    last_name: "Rossi",
    email: "marco@example.com",
  },
});
// customer.customer_id === "user-uuid-from-supabase"
```

### Lista Payment Instruments (verificato da SDK types)
```typescript
// Source: @sumup/sdk PaymentInstrumentResponse type
const instruments = await sumup.customers.listPaymentInstruments("customer-id");
// instruments: PaymentInstrumentResponse[]
// Ogni elemento:
// {
//   token?: string,
//   active?: boolean,
//   type?: "card",
//   card?: { last_4_digits?: string, type?: CardType },
//   mandate?: { type?: string, status?: string, merchant_code?: string },
//   created_at?: string,
// }
```

### Disattivazione Payment Instrument (verificato da SDK types)
```typescript
// Source: @sumup/sdk Customers.deactivatePaymentInstrument()
await sumup.customers.deactivatePaymentInstrument("customer-id", "card-token");
// Restituisce void (HTTP 204)
```

### Process Checkout con Token (verificato da SDK types)
```typescript
// Source: @sumup/sdk ProcessCheckout type + Checkouts.process()
const result = await sumup.checkouts.process("checkout-id", {
  payment_type: "card",
  token: "saved-card-token",
  customer_id: "customer-id",
});
// result: CheckoutSuccess | CheckoutAccepted
// CheckoutAccepted = needs redirect for 3DS
```

### Migrazione Database (pattern dal progetto)
```sql
-- Pattern coerente con le migrazioni esistenti del progetto
ALTER TABLE public.profiles
  ADD COLUMN sumup_customer_id TEXT;

-- Indice per lookup rapido
CREATE INDEX idx_profiles_sumup_customer_id
  ON public.profiles (sumup_customer_id)
  WHERE sumup_customer_id IS NOT NULL;
```

### Tipo TypeScript aggiornato
```typescript
// Aggiornamento in src/types/database.ts
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  membership_code: string;
  role: UserRole;
  status: UserStatus;
  referred_by: string | null;
  sumup_customer_id: string | null;  // NUOVO
  created_at: string;
  updated_at: string;
}
```

## State of the Art

| Approccio Vecchio | Approccio Attuale | Quando Cambiato | Impatto |
|-------------------|-------------------|-----------------|---------|
| API diretta con mandate object | Card Widget con `purpose` field | SumUp Card Widget v2 | Widget gestisce consenso e 3DS automaticamente |
| Checkout reference come ID pagamento | Checkout ID per process/retrieve | SDK 0.1.x | Usare `checkout.id` restituito da `create()` |

**Deprecato/Obsoleto:**
- Nessuno rilevante per questa fase -- i tipi SDK sono attuali

## Open Questions

1. **Importo minimo per checkout tokenizzazione**
   - Quello che sappiamo: SumUp richiede un importo valido, l'autorizzazione viene rimborsata
   - Cosa non e chiaro: Qual e l'importo minimo accettato? (1.00 EUR dovrebbe funzionare)
   - Raccomandazione: Testare con 1.00 EUR, documentare nel codice

2. **3DS Challenge per pagamenti con token salvato**
   - Quello che sappiamo: `checkouts.process()` puo restituire `CheckoutAccepted` (redirect necessario per 3DS)
   - Cosa non e chiaro: I pagamenti con token salvato richiedono sempre 3DS? Il tipo `CheckoutAccepted` include redirect info?
   - Raccomandazione: Gestire entrambi i risultati (`CheckoutSuccess` immediato e `CheckoutAccepted` con redirect), testare in sandbox

3. **Flusso ibrido: checkout ticket/drink CON tokenizzazione**
   - Quello che sappiamo: Si puo fare un checkout con `purpose: "SETUP_RECURRING_PAYMENT"` E un importo reale
   - Cosa non e chiaro: L'importo viene effettivamente addebitato O solo autorizzato e rimborsato?
   - Raccomandazione: Separare i flussi -- checkout di acquisto (ticket/drink) e checkout di tokenizzazione come operazioni distinte. Il primo salvataggio carta puo essere standalone.

4. **UUID Supabase come customer_id SumUp**
   - Quello che sappiamo: `customer_id` e un campo stringa fornito dal client
   - Cosa non e chiaro: Ci sono vincoli di formato per il `customer_id`? (lunghezza, caratteri ammessi)
   - Raccomandazione: Usare l'UUID Supabase del profilo -- e univoco, formato standard, e permette mapping diretto senza colonna aggiuntiva. Se funziona, non serve nemmeno `sumup_customer_id` come colonna separata (l'UUID del profilo E il customer_id SumUp). Tuttavia, per chiarezza e possibilita di dissociazione, una colonna esplicita e piu sicura.

## Sources

### Primarie (HIGH confidence)
- `@sumup/sdk@0.1.1` tipi TypeScript -- `Customer`, `CheckoutCreateRequest`, `ProcessCheckout`, `PaymentInstrumentResponse`, `Customers`, `Checkouts` (letti direttamente da `node_modules`)
- `src/lib/sumup.ts` -- implementazione corrente `createCheckout`, `getCheckout`, `refundTransaction`
- `src/components/SumUpCardWidget.tsx` -- implementazione corrente Card Widget
- `src/app/(organizer)/organizer/events/actions.ts` -- flusso checkout ticket e drink
- `src/types/database.ts` -- schema corrente tabella `profiles`
- `supabase/migrations/` -- pattern migrazioni esistenti

### Secondarie (MEDIUM confidence)
- [SumUp Developer - Save Customer Cards](https://developer.sumup.com/online-payments/guides/tokenization-with-payment-sdk) -- flusso tokenizzazione, endpoint, mandate
- [SumUp Developer - Payment Widget](https://developer.sumup.com/online-payments/checkouts/card-widget) -- configurazione widget

### Terziarie (LOW confidence)
- Importo minimo per tokenizzazione checkout (1.00 EUR assunto, non verificato ufficialmente)
- Comportamento esatto 3DS per pagamenti con token (da testare in sandbox)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SDK gia installato, tipi verificati direttamente
- Architecture: HIGH - Pattern esistenti nel progetto chiari e coerenti
- Pitfalls: MEDIUM - Basati su documentazione ufficiale + inferenze dai tipi SDK
- Flusso tokenizzazione: HIGH - Verificato da tipi SDK + documentazione SumUp
- Pagamento con token: HIGH - `ProcessCheckout` type con `token` + `customer_id` verificato
- Gestione carte: HIGH - `Customers.listPaymentInstruments()` e `deactivatePaymentInstrument()` verificati

**Data ricerca:** 2026-03-06
**Validita stimata:** 60 giorni (SDK stabile, API SumUp matura)
