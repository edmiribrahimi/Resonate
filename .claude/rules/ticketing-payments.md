---
paths:
  - "src/lib/sumup.ts"
  - "src/lib/apple-wallet.ts"
  - "src/lib/tickets/**"
  - "src/app/api/webhooks/**"
  - "src/app/api/cron/**"
  - "src/app/api/tickets/**"
  - "src/lib/guest-list/**"
  - "src/app/**/tickets/**"
  - "src/app/**/drinks/**"
  - "src/app/(public)/events/**"
  - "src/app/**/sales/**"
  - "src/app/**/payment/**"
  - "src/app/**/guest-list/**"
---

# Ticketing & Payments — Operational Gates

## Before Touching

checkout SumUp, webhook di pagamento, rimborsi, token drink, codici sconto,
tier dei biglietti, guest list, pass Apple Wallet, cron di riconciliazione
-> presentare l'analisi d'impatto su: cosa succede se il messaggio arriva due
volte, cosa succede se non arriva affatto, e chi se ne accorge.

## Il principio che il codice gia' applica

`src/app/api/webhooks/sumup/route.ts` porta scritto in chiaro:

> *"ALWAYS verify via GET checkout API (never trust webhook body for status)"*

Ed e' idempotente su entrambi i rami (*"Idempotency: skip if already
completed"*). **Questa non e' una scelta stilistica: e' l'invariante del
dominio.** Ogni nuovo percorso che muove denaro la eredita, e ogni modifica che
la indebolisce e' Critical.

## Quality Gates

- **Gate mai fidarsi dell'annuncio**: Lo stato di un pagamento si legge interrogando il provider, mai dal corpo del webhook. Un webhook e' una **notifica che qualcosa e' cambiato**, non una dichiarazione attendibile di cosa. Chiunque puo' inviare un POST.
- **Gate idempotenza**: Ogni handler di pagamento, rimborso o emissione deve poter essere eseguito due volte con lo stesso effetto di una. La consegna at-least-once e' la norma, non l'eccezione: SumUp ritenta.
- **Gate riconciliazione**: Un rimborso non e' completato quando viene richiesto, ma quando la riconciliazione lo conferma. `api/cron/reconcile-refunds` esiste per questo. Nessun percorso che marchi uno stato terminale sulla sola richiesta. **Dal 2026-09-30 (fase 52.2)** `reconcile-refunds` legge `events[]` della transazione SumUp (`src/lib/sumup.ts`, `getTransactionRefunds`) e confronta **per transazione** contro il registro `ticket_refunds` (`refunded_order_id`, `amount`): un rimborso **totale** cancella il biglietto e manda la mail; un **parziale non attribuibile** a un biglietto **non cancella nulla e avvisa l'organizer**; le guardie A-C (rimborso storico senza ordine, importi che non tornano, biglietto senza ordine) **bloccano ogni cancellazione** su quella transazione. Il ramo **drink** e' ancora cieco a `events[]`: debito dichiarato in `52.2-VERIFICATION.md`. E dal 2026-09-30 **nessun cliente chiede un rimborso**: `refunds_insert_own` e' stata tolta (D-52.2-05), restano `adminRefund` e il cron, entrambi dello staff, entrambi avvisano il titolare (RFD-01).
- **Gate soldi vs contenuto**: Se una scrittura di contenuto (email, analytics, pass) fallisce, l'incasso resta valido e il percorso non si aborta — si logga e si conta. Se una scrittura di **denaro** fallisce, si ferma tutto. I due confini non si scambiano.
- **Gate stato terminale monotono**: Uno stato di pagamento non torna indietro. La riconciliazione corregge in avanti; non esiste un percorso che riporti un `completed` a `pending`.
- **Gate cron non atomico**: I cron — **otto** al 2026-09-30: `event-reminders`, `venue-reveal`, `refund-expired-tokens`, `reconcile-refunds`, `reconcile-email-deliveries`, `production-mirror`, `retry-failed-orders`, `close-pending-orders` — possono essere interrotti a meta'. Ogni ciclo deve marcare il progresso **per elemento**, non alla fine del batch: un cron che segna "fatto" solo in coda, se cade a meta', o riprocessa tutto o salta il resto.
- **Gate un sospeso si chiude con la verita' del fornitore**: Un ordine `pending` da piu' di 30 minuti (`CHECKOUT_TTL_MS`, `src/lib/tickets/checkout-window.ts`) lo chiude solo `close-pending-orders` (`src/app/api/cron/close-pending-orders/route.ts`), e **mai su un'incognita**: chiede il checkout a SumUp; un **PAID** vince e si emette per la strada del webhook (`replayPaidOrderDelivery`), un checkout **senza scadenza** si disattiva **prima** di chiuderlo, un `GET` fallito lascia l'ordine aperto (`providerUnreachable`). La causa va in `closed_reason` (`never_attempted` / `declined`, con la parola del fornitore in `closed_detail`), **non** in `error_message`, che vuol dire «fallito dopo l'incasso». La pagina di ritorno (`src/app/(public)/payment/callback/actions.ts`) applica la stessa regola dall'altro lato: dice «declined» **solo** se il fornitore dice `FAILED`/`EXPIRED`, e non scrive. Un ordine chiuso **si riprende** dal link firmato (`expired → pending`, checkout nuovo) finche' il tier e' in vendita. Situazione che lo fa scattare: chiudere un ordine perche' «e' vecchio», senza aver chiesto al fornitore.
- **Gate codice sconto**: La validazione e' case-insensitive (scelta gia' presa). Ogni nuovo vincolo — scadenza, tetto d'uso, applicabilita' per tier — va applicato **al momento del checkout server-side**, mai solo nella UI: il prezzo che conta e' quello che il server calcola.
- **Gate pass Wallet — validita' e contenuto**: Un pass emesso e' sul telefono di qualcuno e **non si ritira**. **Validita'**: si verifica **allo scan**, mai presunta dall'esistenza del pass. **Contenuto**, dal 2026-08-24: codice, data, orario, serata, tier — e **mai il luogo**, ne' campo, ne' **coordinata** (`locations[]`, che accende il pass avvicinandosi), ne' **voce semantica** (`semantics.venueName`). **Su ogni serata, segreta o no**: un pass non si aggiorna a ritroso, quindi un termine di segretezza coprirebbe solo l'emissione. Controllo **F** di `verify:venue-surfaces`.
- **Gate guest list**: Un ingresso in guest list e' un ingresso non pagato. Ogni percorso che aggiunge nomi va tracciato con chi lo ha fatto — e' la superficie piu' semplice per far entrare gratis qualcuno. **«Add several»** (dal 2026-10-01, DBT-20) legge la lista incollata in anteprima e salva chiamando **la stessa `addGuest`** una riga alla volta: stessa guardia, stesso `added_by`, stessa mail d'invito. Un inserimento in blocco con una scrittura sua sarebbe una corsia grigia (`community-membership.md`). Situazione che lo fa scattare: un `insert` di massa «per velocita'».
- **Gate un solo ordine dei tier**: Dal 2026-10-02 (DBT-18, M-A) ogni lettore — Manage tickets, Sales, pagina pubblica ed Event Pass, preventivo, `purchaseTicket` — ordina i tier con la **stessa catena `sort_order, price, created_at`**. L'ordine si scrive solo con la RPC atomica `reorder_ticket_tiers` (`SECURITY INVOKER`, sotto `staff.manage`), che **scrive solo `sort_order`**: un riordino non tocca mai prezzo, quantita' o finestra di vendita. Un tier nuovo va in coda. Situazione che lo fa scattare: un lettore nuovo che ordina per prezzo, o un riordino scritto riga per riga che a meta' lascia due tier allo stesso posto.
- **Gate il rimborso vive in un posto**: Manage tickets **configura**, Sales **racconta**: dal 2026-10-01 (DBT-17) il Refund vive **una volta per biglietto, sulla card di Sales**, e le mail d'allarme e Retry issuing puntano a Sales. Un secondo pulsante di rimborso altrove e' un secondo percorso di denaro da tenere coerente.
- **Gate l'ordine dice da dove arriva e dove si ferma**: Dal 2026-10-02 (DBT-15, M-B, U5) ogni ordine nuovo porta `entry_source` (vocabolario chiuso: `instagram`, `newsletter`, `flyer`, `direct`, `other`, ridotto sul server da `src/lib/tickets/entry-source.ts`) e `checkout_form` (`not_opened` all'insert, `opened` solo dal segnale firmato `markCheckoutFormOpened`, condizionato a `pending`). **Nessuno dei due tocca lo stato di pagamento**, e un segnale perso fallisce da solo, loggato, senza toccare l'incasso. **I dati degli ordini mai pagati si conservano come sono**: decisione del proprietario, D-52.1-31 (2026-10-02, *«deve rimanere cosi' com'e' oggi»*) — non esistono `pii_cleared_at` ne' `ORDER_PII_CLEAR_ENABLED`, e la domanda al professionista e' ritirata. Situazione che lo fa scattare: aggiungere una cancellazione «per pulizia» senza una nuova decisione.

## Imperative Behaviors

- When handling a payment webhook: verify status via the provider API, never from the body
- When writing any money handler: make it idempotent and prove it by running it twice
- When a refund is requested: mark it terminal only after reconciliation confirms
- When an auxiliary write fails (email, analytics, pass): log, count, continue — never abort the payment path
- When writing a cron: mark progress per item, never only at the end of the batch
- When closing an open order: ask the provider first — a PAID issues, an unreachable provider leaves it open, and the cause goes in `closed_reason`
- When reconciling a refund: match per transaction against the register; a partial that fits no ticket cancels nothing and alerts
- When adding a discount rule: enforce it server-side at checkout
- When validating a ticket at the door: check current validity, not the existence of a pass
- When touching the wallet pass: it carries no place on any night — no field, no coordinate, no semantic tag
- When adding someone to the guest list: record who added them — and add in bulk only through the same `addGuest`
- When ordering tiers: `sort_order, price, created_at`, everywhere; a reorder writes only `sort_order`
- When adding a refund control: put it on Sales, where the refund already lives
- When tempted to erase the data of unpaid orders: don't — D-52.1-31 keeps them as they are until a new decision
