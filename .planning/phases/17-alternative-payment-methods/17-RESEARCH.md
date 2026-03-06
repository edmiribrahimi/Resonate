# Phase 17: Alternative Payment Methods - Research

**Ricerca effettuata:** 2026-03-06
**Dominio:** SumUp Online Payments - Alternative Payment Methods (APMs)
**Confidenza:** HIGH

## Summary

L'integrazione degli APM (Satispay, MyBank, Apple Pay, Google Pay) nel progetto Resonate richiede modifiche concentrate in pochi punti chiave. Il Card Widget (Payment Widget) di SumUp gestisce automaticamente la visualizzazione degli APM disponibili in base al paese del merchant -- i metodi appaiono senza bisogno di codice aggiuntivo nel widget, a condizione che due prerequisiti siano soddisfatti: (1) il checkout venga creato con il campo `redirect_url` e (2) gli APM siano abilitati sull'account merchant nella dashboard SumUp.

La modifica principale al codice consiste nell'aggiungere `redirect_url` alla creazione del checkout in `src/lib/sumup.ts`. Il campo `redirect_url` e' distinto da `return_url` (gia' presente): `return_url` serve per i webhook, `redirect_url` serve per reindirizzare l'utente dopo il completamento del pagamento APM. Per Apple Pay e Google Pay via Card Widget servono solo configurazioni nella dashboard SumUp e, per Google Pay, l'opzione `googlePay` nel mount del widget. Il webhook handler esistente funziona invariato per tutti gli APM (stesso evento `CHECKOUT_STATUS_CHANGED`).

**Raccomandazione principale:** Aggiungere `redirect_url` a `createCheckout()`, creare una pagina di callback `/payment/callback`, aggiungere l'opzione `googlePay` al mount del Card Widget, e documentare i passaggi manuali di attivazione nella dashboard SumUp.

<user_constraints>
## Vincoli Utente (da CONTEXT.md)

### Decisioni Bloccate
- **APM-01**: Satispay abilitato (disponibile in Italia, redirect-based)
- **APM-02**: MyBank abilitato (disponibile in Italia, redirect-based)
- **APM-03**: Apple Pay abilitato via Card Widget (richiede verifica dominio)
- **APM-04**: Google Pay abilitato via Card Widget (richiede onboarding dominio)
- **APM-05**: Checkout creation include `redirect_url` per i flussi di redirect APM

### Passaggi Manuali Richiesti
- L'admin deve abilitare gli APM nella Dashboard SumUp
- L'admin deve registrare i domini per Apple Pay e Google Pay nella Dashboard SumUp
- Questi sono passaggi una-tantum, non automatizzabili via API

### Dipendenze
- Phase 13 (SDK migration) completata -- `@sumup/sdk` v0.1.1 installato e in uso
</user_constraints>

<phase_requirements>
## Requisiti di Fase

| ID | Descrizione | Supporto dalla Ricerca |
|----|-------------|----------------------|
| APM-01 | Satispay abilitato | Il Card Widget lo mostra automaticamente se abilitato sul merchant e `redirect_url` presente nel checkout. Richiede attivazione manuale in dashboard. Italia supportata. |
| APM-02 | MyBank abilitato | Come Satispay: il Card Widget lo mostra automaticamente. Richiede attivazione manuale. Italia supportata. |
| APM-03 | Apple Pay via Card Widget | Richiede registrazione dominio in Dashboard > Settings > For developers > Payment wallets. Il widget gestisce l'UI nativamente. |
| APM-04 | Google Pay via Card Widget | Richiede onboarding dominio + config `googlePay: { merchantId, merchantName }` nel mount del widget. |
| APM-05 | `redirect_url` nel checkout | Campo gia' supportato nell'SDK (`CheckoutCreateRequest.redirect_url`). Va aggiunto a `createCheckout()` e a tutti i chiamanti. |
</phase_requirements>

## Standard Stack

### Core
| Libreria | Versione | Scopo | Perche' Standard |
|----------|----------|-------|-----------------|
| @sumup/sdk | 0.1.1 | Creazione checkout con `redirect_url` | Gia' installato, supporta `redirect_url` nel tipo `CheckoutCreateRequest` |
| SumUp Card Widget SDK | v2 (CDN) | Rendering metodi di pagamento inclusi APM | Gia' caricato in `src/app/layout.tsx`, mostra APM automaticamente |

### Supporto
| Libreria | Versione | Scopo | Quando Usare |
|----------|----------|-------|-------------|
| Next.js | 16 | Route per pagina callback, Server Actions | Pagina `/payment/callback` per gestire redirect post-APM |
| Supabase | Corrente | Lookup ordini/acquisti per status check | Nella pagina callback per verificare stato pagamento |

### Alternative Considerate
| Invece di | Si potrebbe usare | Compromesso |
|-----------|-------------------|-------------|
| Card Widget per Apple Pay | Integrazione diretta via `PUT /v0.1/checkouts/{id}/apple-pay-session` | Molto piu' complesso (session handling, token parsing). Card Widget gestisce tutto automaticamente. |
| Card Widget per Google Pay | Integrazione diretta via Google Pay API | Richiede gestione `PaymentsClient`, token, `loadPaymentData()`. Card Widget e' sufficiente con config minima. |

## Architecture Patterns

### Struttura Progetto Raccomandata
```
src/
├── lib/
│   └── sumup.ts                    # Aggiungere redirect_url param
├── components/
│   └── SumUpCardWidget.tsx          # Aggiungere googlePay config + onPaymentMethodsLoad
├── app/
│   ├── (public)/
│   │   ├── payment/
│   │   │   └── callback/
│   │   │       └── page.tsx         # NUOVA: pagina di ritorno post-redirect APM
│   │   └── events/[slug]/
│   │       ├── SumUpCheckoutModal.tsx  # Nessuna modifica necessaria
│   │       └── ...
│   └── (organizer)/
│       └── organizer/events/
│           └── actions.ts           # Passare redirect_url a createCheckout
```

### Pattern 1: Flusso redirect APM
**Cosa:** Dopo che l'utente sceglie un APM (Satispay/MyBank), il Card Widget lo reindirizza al provider di pagamento esterno. Dopo il pagamento, l'utente torna alla `redirect_url`.
**Quando usarlo:** Per tutti i pagamenti APM redirect-based.
**Flusso:**
```
1. Server Action crea checkout con redirect_url
2. Card Widget mostra APM disponibili
3. Utente seleziona Satispay/MyBank
4. Widget reindirizza al provider esterno
5. Utente completa pagamento
6. Provider reindirizza a redirect_url (pagina callback)
7. Pagina callback verifica stato via getCheckout()
8. In parallelo, webhook gestisce conferma server-side
```

### Pattern 2: Pagina di callback
**Cosa:** Pagina client-side che riceve il redirect post-APM e mostra lo stato del pagamento.
**Quando usarlo:** Come destinazione di `redirect_url`.
**Esempio:**
```typescript
// src/app/(public)/payment/callback/page.tsx
// Riceve query params: ?checkout_id=xxx&event_slug=yyy&context=ticket|drink
// 1. Mostra "Verifica pagamento in corso..."
// 2. Chiama server action per verificare stato checkout
// 3. Se PAID -> mostra successo + link a evento/ticket
// 4. Se PENDING -> polling breve (webhook potrebbe non aver ancora processato)
// 5. Se FAILED -> mostra errore + link per riprovare
```

### Pattern 3: `redirect_url` dinamico
**Cosa:** Costruire la `redirect_url` con parametri di contesto per sapere dove tornare.
**Quando usarlo:** Sempre, per tutti i checkout.
**Esempio:**
```typescript
// Nella server action
const redirectUrl = new URL(
  "/payment/callback",
  process.env.NEXT_PUBLIC_APP_URL
);
redirectUrl.searchParams.set("checkout_id", checkoutReference);
redirectUrl.searchParams.set("event_slug", event.slug);
redirectUrl.searchParams.set("context", "ticket"); // o "drink"

const response = await createCheckout({
  amount: tier.price,
  currency: "EUR",
  description: `${event.title} - ${tier.name}`,
  checkoutReference,
  returnUrl,         // per webhook
  redirectUrl: redirectUrl.toString(), // per redirect utente
});
```

### Pattern 4: Google Pay nel Card Widget
**Cosa:** Aggiungere l'opzione `googlePay` al mount del Card Widget.
**Quando usarlo:** Per abilitare il pulsante Google Pay nel widget.
**Esempio:**
```typescript
// In SumUpCardWidget.tsx
instanceRef.current = window.SumUpCard.mount({
  id: "sumup-card",
  checkoutId,
  locale,
  showFooter: false,
  googlePay: {
    merchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID,
    merchantName: "Resonate",
  },
  onLoad: () => { /* ... */ },
  onResponse: (type, body) => { /* ... */ },
});
```

### Anti-Pattern da Evitare
- **Integrare Apple Pay/Google Pay direttamente via API:** Il Card Widget gestisce tutto automaticamente (session, token, UI). L'integrazione diretta aggiunge complessita' senza benefici per questo use case.
- **Ignorare il redirect_url per pagamenti card:** Anche se non obbligatorio per le carte, il `redirect_url` e' raccomandato perche' evita il rendering 3DS in iframe (usa full-page redirect invece).
- **Costruire UI custom per APM:** Il Card Widget mostra automaticamente i campi rilevanti per ogni APM. Le proprieta' `show*` non si applicano agli APM -- il widget gestisce i campi necessari in autonomia.

## Don't Hand-Roll

| Problema | Non Costruire | Usa Invece | Perche' |
|----------|---------------|------------|---------|
| UI per selezione APM | Form custom per ogni metodo di pagamento | Card Widget | Il widget mostra automaticamente gli APM disponibili e raccoglie i dati necessari (nome, cognome, email, paese) |
| Gestione sessione Apple Pay | Chiamate dirette a Apple Pay JS API | Card Widget | La gestione della sessione richiede `onvalidatemerchant`, `completeMerchantValidation()`, token parsing |
| Google Pay PaymentsClient | Integrazione diretta Google Pay API | Card Widget + config `googlePay` | `loadPaymentData()`, tokenizzazione, gestione ambiente TEST/PRODUCTION |
| Redirect flow orchestration | Logica custom per redirect + polling | Card Widget + redirect_url + webhook | Il widget gestisce il redirect al provider, il webhook gestisce la conferma server-side |

**Insight chiave:** Il Card Widget di SumUp e' l'unico punto di integrazione necessario per TUTTI gli APM. L'unico codice aggiuntivo e' server-side (`redirect_url` nella creazione checkout) e una pagina di callback per il redirect post-pagamento.

## Common Pitfalls

### Pitfall 1: Confondere `return_url` e `redirect_url`
**Cosa va storto:** Il campo `return_url` e' gia' usato nel progetto per i webhook. Si potrebbe pensare che basti per gli APM.
**Perche' succede:** I due campi hanno nomi simili ma scopi diversi.
**Come evitare:** `return_url` = webhook endpoint (server-to-server). `redirect_url` = URL dove l'utente viene reindirizzato nel browser dopo il pagamento APM (browser redirect).
**Segnali di allarme:** APM non funzionano, utente non torna alla app dopo pagamento.

### Pitfall 2: APM non visibili nel Card Widget
**Cosa va storto:** Il widget mostra solo il form carta di credito, nessun APM.
**Perche' succede:** (1) APM non abilitati sull'account merchant, (2) `redirect_url` non presente nel checkout, (3) account merchant non registrato in Italia.
**Come evitare:** Verificare attivazione APM in Dashboard > Settings > For developers. Verificare che il checkout includa `redirect_url`. Contattare supporto SumUp se business non e' sole trader.
**Segnali di allarme:** Il widget carica ma mostra solo input carta.

### Pitfall 3: Google Pay merchantId non configurato
**Cosa va storto:** Il pulsante Google Pay non appare.
**Perche' succede:** `googlePay` config non passato al mount, o dominio non registrato nella console Google/SumUp Dashboard.
**Come evitare:** Usare la config `googlePay: { merchantId, merchantName }` nel mount. Completare l'onboarding in Dashboard > Settings > For developers > Payment wallets.
**Segnali di allarme:** Nessun pulsante Google Pay visibile, errore in console.

### Pitfall 4: Pagina callback senza gestione race condition
**Cosa va storto:** L'utente arriva alla pagina callback ma il webhook non ha ancora processato il pagamento.
**Perche' succede:** Il redirect dell'utente puo' arrivare prima del webhook.
**Come evitare:** Nella pagina callback, implementare un polling breve (es. 3 tentativi ogni 2 secondi) che controlla lo stato del checkout tramite `getCheckout()`. Se PAID, mostra successo. Se ancora PENDING, mostrare "Verifica in corso..." e continuare il polling.
**Segnali di allarme:** Utente vede "pagamento in attesa" anche dopo aver pagato.

### Pitfall 5: Apple Pay domain mismatch
**Cosa va storto:** Apple Pay non appare o fallisce.
**Perche' succede:** Il dominio di produzione non e' registrato in SumUp Dashboard, o manca la registrazione per i sottodomini.
**Come evitare:** Registrare TUTTI i domini e sottodomini che espongono il pulsante Apple Pay (TLD + subdomains). Registrare anche il dominio di test/staging.
**Segnali di allarme:** Errore Apple Pay session, pulsante non visibile.

### Pitfall 6: Proprietà `show*` applicate ad APM
**Cosa va storto:** Si tenta di personalizzare i campi APM con `showEmail`, `showSubmitButton`, ecc.
**Perche' succede:** Confusione tra configurazione card e APM.
**Come evitare:** Le proprieta' `show*` si applicano SOLO al form carta. Gli APM rendono autonomamente i campi necessari per il metodo di pagamento scelto.

## Code Examples

### Modifica a `createCheckout()` per supportare redirect_url
```typescript
// src/lib/sumup.ts - Aggiunta redirect_url
export async function createCheckout(params: {
  amount: number;
  currency: string;
  description: string;
  checkoutReference: string;
  returnUrl: string;
  redirectUrl?: string;  // NUOVO: richiesto per APM
}) {
  try {
    const checkout = await sumup.checkouts.create({
      amount: params.amount,
      currency: params.currency as "EUR",
      merchant_code: process.env.SUMUP_MERCHANT_CODE!,
      checkout_reference: params.checkoutReference,
      description: params.description,
      return_url: params.returnUrl,
      redirect_url: params.redirectUrl,  // NUOVO
    });

    return checkout as { id: string; status: string; checkout_reference: string };
  } catch (error) {
    if (error instanceof APIError) {
      throw new Error(
        `SumUp checkout creation failed: ${JSON.stringify(error.error)}`
      );
    }
    throw error;
  }
}
```

### SumUpCardWidget con supporto Google Pay e onPaymentMethodsLoad
```typescript
// src/components/SumUpCardWidget.tsx - Interfaccia aggiornata
interface SumUpCardConfig {
  id: string;
  checkoutId: string;
  locale?: string;
  showSubmitButton?: boolean;
  showFooter?: boolean;
  showEmail?: boolean;
  email?: string;
  donateSubmitButton?: boolean;
  amount?: number;
  currency?: string;
  country?: string;
  nonce?: string;
  googlePay?: {              // NUOVO
    merchantId: string;
    merchantName: string;
  };
  onResponse?: (type: SumUpResponseType, body: Record<string, unknown>) => void;
  onLoad?: () => void;
  onPaymentMethodsLoad?: (methods: { id: string }[]) => { id: string }[] | void;  // NUOVO
}
```

### Costruzione redirect_url nelle Server Actions
```typescript
// Pattern comune per tutte le server actions che creano checkout
function buildRedirectUrl(params: {
  checkoutReference: string;
  eventSlug: string;
  context: "ticket" | "drink";
  partyId?: string;
}): string {
  const url = new URL("/payment/callback", process.env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("ref", params.checkoutReference);
  url.searchParams.set("slug", params.eventSlug);
  url.searchParams.set("ctx", params.context);
  if (params.partyId) {
    url.searchParams.set("party", params.partyId);
  }
  return url.toString();
}
```

### Pagina Callback (schema)
```typescript
// src/app/(public)/payment/callback/page.tsx
// Riceve i query params dalla redirect_url dopo pagamento APM
//
// Query params:
//   ref   = checkout_reference (UUID)
//   slug  = event slug (per navigazione)
//   ctx   = "ticket" | "drink" (contesto acquisto)
//   party = party_id (opzionale)
//
// Logica:
// 1. Legge checkout_reference dal URL
// 2. Chiama server action che fa getCheckout() per verificare stato
// 3. Polling se stato PENDING (max 5 tentativi, 2s intervallo)
// 4. Se PAID -> mostra successo con link a /events/{slug} o /tickets
// 5. Se FAILED/EXPIRED -> mostra errore con link per riprovare
```

## State of the Art

| Approccio Vecchio | Approccio Attuale | Quando Cambiato | Impatto |
|-------------------|-------------------|-----------------|---------|
| Solo pagamento carta | Card Widget mostra APM automaticamente | Supporto APM in SumUp 2024-2025 | Aggiungere solo `redirect_url` per abilitare |
| `return_url` come unico URL | `return_url` (webhook) + `redirect_url` (browser redirect) | @sumup/sdk 0.1.x | Distinzione chiara tra webhook e redirect utente |
| Integrazione diretta Apple/Google Pay | Card Widget gestisce wallet payments nativamente | SumUp Card Widget v2 | Config minima, nessun codice wallet-specific |
| Rendering 3DS in iframe | Full-page redirect con `redirect_url` | Raccomandazione SumUp attuale | Migliore compatibilita' e UX su mobile |

**Deprecato/obsoleto:**
- L'URL `https://developer.sumup.com/docs/online-payments/card-widget/` reindirizza ora a `https://developer.sumup.com/online-payments/checkouts/card-widget` -- i vecchi path dei docs non funzionano piu'.

## Open Questions

1. **Attivazione APM sull'account merchant**
   - Cosa sappiamo: Per i sole trader, gli APM si attivano automaticamente dopo la registrazione e una transazione di test. Per altri tipi di business, serve contattare il supporto SumUp con il merchant ID.
   - Cosa non e' chiaro: Qual e' il tipo di business dell'account Resonate? E' gia' stato attivato?
   - Raccomandazione: Verificare nella Dashboard SumUp se gli APM sono gia' disponibili. Se no, contattare supporto SumUp fornendo il merchant ID (MXXXXX).

2. **Google Pay merchantId**
   - Cosa sappiamo: Il `merchantId` viene ottenuto da Google dopo la registrazione del dominio nella Google API Console.
   - Cosa non e' chiaro: Il dominio di produzione e' gia' registrato? Il `merchantId` e' gia' disponibile?
   - Raccomandazione: Completare onboarding in Dashboard SumUp > Settings > For developers > Payment wallets. Salvare `merchantId` come env var `NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID`.

3. **Comportamento Card Widget durante redirect**
   - Cosa sappiamo: Il widget reindirizza l'utente al provider APM. Dopo il pagamento, il provider reindirizza alla `redirect_url`.
   - Cosa non e' chiaro: Il Card Widget gestisce internamente il redirect o il browser naviga alla URL del provider? Questo impatta il SumUpCheckoutModal (se il browser fa full-page redirect, il modale scompare).
   - Raccomandazione: Il redirect e' full-page (il browser naviga via). Quindi il modale scomparira' e l'utente tornera' alla pagina callback. Questo e' il comportamento atteso.

4. **Test locale Apple Pay**
   - Cosa sappiamo: Apple Pay richiede registrazione dominio anche per ambienti di test.
   - Cosa non e' chiaro: Come testare su localhost senza dominio registrato?
   - Raccomandazione: Usare un ambiente di staging con dominio validato. Apple Pay non funzionera' su localhost.

5. **Demo mode Google Pay**
   - Cosa sappiamo: Aggiungere `#sumup-widget:google-pay-demo-mode` all'URL mostra il pulsante Google Pay per screenshots senza integrazione completa.
   - Raccomandazione: Usare per onboarding/test prima della registrazione dominio completa.

## Sources

### Primary (HIGH confidence)
- **@sumup/sdk v0.1.1 types** (`node_modules/@sumup/sdk/dist/types/checkout-create-request.d.ts`) - Tipo `CheckoutCreateRequest` include `redirect_url` con documentazione JSDoc
- **Codice sorgente progetto** - `src/lib/sumup.ts`, `src/components/SumUpCardWidget.tsx`, `src/app/api/webhooks/sumup/route.ts`
- [Payment Widget docs](https://developer.sumup.com/online-payments/checkouts/card-widget) - Configurazione completa mount, proprieta' `googlePay`, comportamento APM
- [APM Integration Guide](https://developer.sumup.com/online-payments/apm/integration-guide) - Flusso redirect, dati customer richiesti, process checkout
- [Google Pay docs](https://developer.sumup.com/online-payments/apm/google-pay) - Domain onboarding, merchantId/merchantName config, demo mode
- [Apple Pay docs](https://developer.sumup.com/online-payments/apm/apple-pay) - Domain verification, integrazione widget vs diretta

### Secondary (MEDIUM confidence)
- [APM Overview](https://developer.sumup.com/online-payments/apm) - Lista APM disponibili per paese (Italia: Apple Pay, Google Pay, MyBank, Satispay)
- [Webhooks docs](https://developer.sumup.com/online-payments/webhooks) - Stesso evento `CHECKOUT_STATUS_CHANGED` per tutti i metodi di pagamento

### Tertiary (LOW confidence)
- Nessuno

## Metadata

**Breakdown confidenza:**
- Standard stack: HIGH - Basato su codice sorgente e tipi SDK gia' installati
- Architecture: HIGH - Pattern basati su documentazione ufficiale SumUp verificata
- Pitfalls: HIGH - Derivati da documentazione ufficiale e analisi del codice esistente

**Data ricerca:** 2026-03-06
**Valido fino:** 2026-04-06 (dominio stabile, SumUp SDK non cambia frequentemente)
