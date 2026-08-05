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
- **Gate template in italiano**: I materiali verso i membri sono in italiano, coerenti con la voce del progetto. Una mail transazionale in inglese dentro un prodotto italiano legge come phishing. **L'interfaccia invece e' in inglese** (scelta presa alla fase 01, con i redirect permanenti da `/eventi`, `/registrati`, `/presenze`, `/galleria` a testimoniarlo): le due lingue convivono per destinatario, non per caso, e i **materiali visivi seguono l'inglese britannico** (`brand-visual-system.md`).

- **Gate due mittenti, due funzioni**: `noreply@resonatemotion.com` porta le transazionali del prodotto; `info@resonatemotion.com` e' l'indirizzo di contatto — ricevuto via Cloudflare Email Routing e inoltrato, inviato via SMTP Resend. **Non si scambiano**: una transazionale da `info@` invita a rispondere a un indirizzo che nessun sistema legge; una risposta umana da `noreply@` dice all'interlocutore che non deve rispondere.

- **Gate la reputazione del dominio e' un asset**: SPF, DKIM e DMARC sono allineati su `resonatemotion.com`; DMARC e' oggi in **osservazione** (`p=none`), quindi **non protegge ancora** — irrigidirlo si fa dopo aver letto i report, non prima. Ogni nuovo mittente, sottodominio o servizio d'invio va allineato **prima** del primo invio: una mail che fallisce l'autenticazione non torna indietro con un errore, sparisce in una cartella.

- **Gate il tracking resta spento**: Il tracking di aperture e clic e' **disattivato di proposito** — con esso attivo le mail finiscono nella scheda Promozioni, e una mail che il membro non vede vale zero anche se il pannello dice "consegnata". E' una scelta gia' pagata con un problema reale: non si riattiva per curiosita' analitica. Se serve misurare, si misura **cosa succede nel prodotto** dopo la mail, non dentro la mail.

## Imperative Behaviors

- When sending: make the path idempotent and mark per recipient, not per batch
- When templating a value: verify this recipient is entitled to it
- When an send fails: log the distinct cause, never a generic message
- When reading an env var at runtime: check it, never assert non-null
- When emitting an analytics event: strip anything the question doesn't need
- When tracking client-side: respect consent
- When displaying a metric: show its unit and its sample size
- When writing member-facing copy: write it in Italian — the interface stays English
- When choosing the sender: transactional from noreply@, human replies from info@
- When adding a sending service or subdomain: align SPF and DKIM before the first send
- When asked to enable open/click tracking: don't — measure what happens in the product instead
