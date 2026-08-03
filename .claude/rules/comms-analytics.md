---
paths:
  - "src/emails/**"
  - "src/lib/email.ts"
  - "src/lib/analytics/**"
  - "src/lib/posthog/**"
  - "src/app/api/newsletter/**"
---

# Comms & Analytics — Operational Gates

## Before Touching

template email, invio Resend, newsletter, eventi PostHog, dashboard
-> valutare l'impatto su: cosa esce dal sistema, verso chi, e cosa contiene.
Una mail e un evento analytics sono entrambi **dati che lasciano il perimetro**.

## Quality Gates

- **Gate una mail non si richiama**: Un invio e' definitivo. Ogni percorso che invia va reso idempotente e va marcato per destinatario, non per lotto. Una doppia mail e' rumore; una mail sbagliata al pubblico sbagliato e' un incidente.
- **Gate contenuto verso destinatario**: Prima di inserire un dato in un template, verifica che quel destinatario abbia titolo a riceverlo. Vale in modo assoluto per l'indirizzo di un venue: vedi `venue-secrecy.md`.
- **Gate errori distinguibili**: Un fallimento d'invio si logga con la sua causa. Il precedente registrato in `.planning/codebase/CONCERNS.md` — *"Qualcosa e' andato storto"* per qualunque errore del form newsletter — rende indistinguibili rete assente, chiave mancante e indirizzo gia' iscritto. Non replicarlo.
- **Gate variabili d'ambiente verificate**: Nessuna asserzione non-null (`!`) su una variabile d'ambiente in un percorso di runtime. Se manca, il codice deve dirlo con un errore chiaro invece di fallire in modo obliquo tre chiamate piu' in la'. Questo vale anche per `NEXT_PUBLIC_APP_URL`, da cui dipendono gli URL dentro i QR.
- **Gate PII negli eventi**: Un evento analytics non porta dati che non servono alla domanda che deve rispondere. Nome, indirizzo email, codice di membership e indirizzo del venue non stanno in un payload di prodotto. PostHog e' configurato su istanza EU: quella e' una scelta di conformita', e mandarci PII inutile la spreca.
- **Gate consenso**: Il tracciamento client-side segue il consenso dell'utente. Un evento raccolto senza base giuridica non e' un dato: e' un debito.
- **Gate metrica onesta**: Un numero mostrato in dashboard porta la sua unita' e, se e' una stima o un parziale, la sua dimensione campionaria. Una percentuale su nove ingressi non e' una percentuale, e' un aneddoto con la virgola.
- **Gate template in italiano**: I materiali verso i membri sono in italiano, coerenti con la voce del progetto. Una mail transazionale in inglese dentro un prodotto italiano legge come phishing.

## Imperative Behaviors

- When sending: make the path idempotent and mark per recipient, not per batch
- When templating a value: verify this recipient is entitled to it
- When an send fails: log the distinct cause, never a generic message
- When reading an env var at runtime: check it, never assert non-null
- When emitting an analytics event: strip anything the question doesn't need
- When tracking client-side: respect consent
- When displaying a metric: show its unit and its sample size
- When writing member-facing copy: write it in Italian
