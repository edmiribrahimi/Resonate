---
paths:
  - "src/lib/rbac/**"
  - "src/lib/supabase/**"
  - "src/middleware.ts"
  - "src/app/api/auth/**"
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
- **Gate entropia degli identificatori**: Un codice che concede accesso deve resistere a un tentativo di indovinarlo. `src/utils/qr.ts:49` genera il codice di membership con `Math.random()` — **difetto attualmente presente e confermato**. Ogni nuovo identificatore d'accesso usa `crypto.getRandomValues`, e la verifica ha rate limiting.
- **Gate coerenza navigazione/permessi**: La lista `NAV_ITEMS` in `src/lib/rbac/roles.ts` nasconde le voci per ruolo. Nascondere un link **non e' proteggere una rotta**: ogni voce nascosta deve avere il suo controllo lato server. Se cambi l'una senza l'altra, hai spostato il problema, non risolto.

## Imperative Behaviors

- When adding a table with non-public data: write its RLS policy in the same migration
- When checking access: verify role AND status, never role alone
- When using the service-role client: justify it in the commit, and prove no untrusted input reaches it
- When adding a parametric redirect: validate against an allow-list of relative paths
- When generating an access-granting code: use crypto.getRandomValues, never Math.random
- When hiding a nav item by role: add the corresponding server-side check
