---
paths:
  - "src/lib/rbac/**"
  - "src/lib/supabase/**"
  - "src/middleware.ts"
  - "src/app/api/auth/**"
  - "src/app/(auth)/**"
  - "src/app/(admin)/**"
  - "src/app/api/drinks/**"
---

# Access & Gating — Operational Gates

## Before Touching

ruoli, stati, middleware, policy RLS, callback di autenticazione, referral,
approvazione
-> presentare l'analisi d'impatto su: chi guadagna o perde visibilita' su quali
dati, cosa vede un utente `pending`, e se il confine e' garantito dalla RLS o
solo dal redirect.

## Le due assi, che non vanno confuse

`src/lib/rbac/roles.ts` definisce due dimensioni **indipendenti**:

- **Ruolo** — `master` · `organizer` · `member`
- **Stato** — `pending` · `approved` · `rejected`

Un `member` `pending` non e' un `member`. Un controllo che verifica solo il
ruolo lascia entrare chi non e' ancora stato approvato — e l'approvazione e'
il meccanismo su cui poggia il valore della community.

## Quality Gates

- **Gate RLS-e'-il-confine**: Il middleware decide dove un utente puo' *andare*; la RLS decide cosa puo' *leggere*. Nessuna tabella con dati non pubblici senza policy RLS che regga anche se il middleware venisse bypassato. Una feature protetta dal solo redirect e' esposta a chiunque chiami l'API direttamente.
- **Gate due assi**: Ogni controllo d'accesso verifica ruolo **e** stato quando entrambi sono pertinenti. `role === 'member'` senza `status === 'approved'` e' un buco, non una scorciatoia.
- **Gate escalation privilegi**: Nessun percorso in cui un utente puo' modificare il proprio `role` o `status`. La promozione a `master` via `MASTER_EMAIL` nel callback e' un percorso privilegiato: qualunque modifica va trattata come Critical.
- **Gate service role**: `src/lib/supabase/service.ts` usa la chiave service-role e **bypassa ogni RLS**. Ogni suo uso nuovo va giustificato per iscritto nel commit e non deve mai essere raggiungibile da input non fidato. Una service-client in un percorso che accetta parametri dall'utente e' una escalation.
- **Gate redirect validato**: Il parametro `next` del callback finisce in `NextResponse.redirect`. Oggi la concatenazione con `origin` impedisce il salto a un altro host, ma resta input non validato in un header `Location`. Ogni nuovo redirect parametrico usa una allow-list di path relativi, mai la stringa grezza.
- **Gate entropia degli identificatori**: Un codice che concede accesso deve resistere a un tentativo di indovinarlo. Ogni nuovo identificatore d'accesso nasce da un CSPRNG — `crypto.getRandomValues` lato applicazione, `extensions.gen_random_bytes` lato database — mai da `Math.random()` ne' dal `random()` di plpgsql.

  **Questa riga diceva `src/utils/qr.ts:49`, e indicava il posto sbagliato.** Quella funzione era **codice morto, zero importatori**, ed e' stata rimossa il 2026-09-05. Il codice di membership nasce nel trigger `public.handle_new_user`, e **dal 2026-09-05 nasce da `extensions.gen_random_bytes`**: alfabeto di 32 caratteri per 10, **2^50**, dentro la regex che la porta gia' accetta (`ScannerClient.tsx:71`, massimo 10). Prima erano 8 caratteri dal `random()` **seminato** di plpgsql: 2^40 come tetto nominale, meno nei fatti.

  **Cosa NON e' cambiato, e va tenuto:** i **quattro codici emessi prima** non sono stati rigenerati — `D-49-01`, perche' sono credenziali in mano a persone reali — quindi la debolezza vecchia sopravvive su quei quattro. E il rate limiting **continua a non esistere** (gate sotto): `api/membership/verify` resta un oracolo interrogabile senza costo.

- **Gate la porta ha due credenziali, e la seconda non guarda chi sei**: Si entra col biglietto **oppure** col solo `membership_code`, e la seconda strada ammette **senza leggere ne' ruolo ne' stato** (`src/app/api/tickets/attendance/route.ts:145`). E' il gate *due assi* che non si applica sul percorso piu' corto. **E' debito NON scelto, non un difetto ignorato**: togliere l'ammissione sul solo codice era la terza strada di `D-49-01` ed e' stata scartata per non allargare la fase. Finche' resta cosi', nessuna modifica puo' **allargare** cio' che quel codice apre, e ogni fase che ne conia di piu' deve dichiararlo.
- **Gate nessun rate limiting, oggi**: Verificato il 2026-08-05: **il repo non ha alcun rate limiting** — nessuna dipendenza, nessuna implementazione. Ogni endpoint pubblico che risponde "valido / non valido" e' quindi un oracolo interrogabile senza costo: `api/membership/verify`, il lookup dei token drink, la validazione di un codice sconto. Finche' non esiste, **nessun nuovo endpoint di verifica va aggiunto senza dire, per iscritto, che e' esposto** — e ogni nuovo identificatore va reso abbastanza largo da non essere enumerabile.
- **Gate coerenza navigazione/permessi**: La lista `NAV_ITEMS` in `src/lib/rbac/roles.ts` nasconde le voci per ruolo. Nascondere un link **non e' proteggere una rotta**: ogni voce nascosta deve avere il suo controllo lato server. Se cambi l'una senza l'altra, hai spostato il problema, non risolto.

## Imperative Behaviors

- When adding a table with non-public data: write its RLS policy in the same migration
- When checking access: verify role AND status, never role alone
- When using the service-role client: justify it in the commit, and prove no untrusted input reaches it
- When adding a parametric redirect: validate against an allow-list of relative paths
- When generating an access-granting code: use a CSPRNG — `crypto.getRandomValues` in the app, `extensions.gen_random_bytes` in the database — never `Math.random` and never plpgsql `random()`
- When touching what a bare membership code opens: it admits without reading role or status — narrow it or leave it, never widen it
- When hiding a nav item by role: add the corresponding server-side check
