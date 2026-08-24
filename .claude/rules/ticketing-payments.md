---
paths:
  - "src/lib/sumup.ts"
  - "src/lib/apple-wallet.ts"
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
- **Gate riconciliazione**: Un rimborso non e' completato quando viene richiesto, ma quando la riconciliazione lo conferma. `api/cron/reconcile-refunds` esiste per questo. Nessun percorso che marchi uno stato terminale sulla sola richiesta.
- **Gate soldi vs contenuto**: Se una scrittura di contenuto (email, analytics, pass) fallisce, l'incasso resta valido e il percorso non si aborta — si logga e si conta. Se una scrittura di **denaro** fallisce, si ferma tutto. I due confini non si scambiano.
- **Gate stato terminale monotono**: Uno stato di pagamento non torna indietro. La riconciliazione corregge in avanti; non esiste un percorso che riporti un `completed` a `pending`.
- **Gate cron non atomico**: I cron (`event-reminders`, `reconcile-refunds`, `refund-expired-tokens`, `venue-reveal`) possono essere interrotti a meta'. Ogni ciclo deve marcare il progresso **per elemento**, non alla fine del batch: un cron che segna "fatto" solo in coda, se cade a meta', o riprocessa tutto o salta il resto.
- **Gate codice sconto**: La validazione e' case-insensitive (scelta gia' presa). Ogni nuovo vincolo — scadenza, tetto d'uso, applicabilita' per tier — va applicato **al momento del checkout server-side**, mai solo nella UI: il prezzo che conta e' quello che il server calcola.
- **Gate pass Wallet — validita' e contenuto**: Un pass emesso e' sul telefono di qualcuno e **non si ritira**. **Validita'**: si verifica **allo scan**, mai presunta dall'esistenza del pass. **Contenuto**, dal 2026-08-24: codice, data, orario, serata, tier — e **mai il luogo**, ne' campo, ne' **coordinata** (`locations[]`, che accende il pass avvicinandosi), ne' **voce semantica** (`semantics.venueName`). **Su ogni serata, segreta o no**: un pass non si aggiorna a ritroso, quindi un termine di segretezza coprirebbe solo l'emissione. Controllo **F** di `verify:venue-surfaces`.
- **Gate guest list**: Un ingresso in guest list e' un ingresso non pagato. Ogni percorso che aggiunge nomi va tracciato con chi lo ha fatto — e' la superficie piu' semplice per far entrare gratis qualcuno.

## Imperative Behaviors

- When handling a payment webhook: verify status via the provider API, never from the body
- When writing any money handler: make it idempotent and prove it by running it twice
- When a refund is requested: mark it terminal only after reconciliation confirms
- When an auxiliary write fails (email, analytics, pass): log, count, continue — never abort the payment path
- When writing a cron: mark progress per item, never only at the end of the batch
- When adding a discount rule: enforce it server-side at checkout
- When validating a ticket at the door: check current validity, not the existence of a pass
- When touching the wallet pass: it carries no place on any night — no field, no coordinate, no semantic tag
- When adding someone to the guest list: record who added them
