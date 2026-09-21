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

ruoli, capability, middleware, policy RLS, callback di autenticazione,
creazione di account
-> presentare l'analisi d'impatto su: chi guadagna o perde visibilita' su quali
dati, **cosa vede un account leggero senza ruolo di lavoro**, e se il confine e'
garantito dalla RLS o solo dal redirect.

## Un asse solo: il ruolo

`src/types/database.ts:99` definisce **una** dimensione:

- **Ruolo** — `master` · `organizer` · `staff` · `member`

Il predicato autoritativo dell'accesso e' `private.has_capability`: ruolo →
capability, piu' l'assegnazione per serata
(`20260921120000_drop_status_and_referral.sql:397-420`). Non c'e' un secondo
asse da guardare.

**`member` non significa «socio».** L'account di chi compra un biglietto o
riceve un invito da guest list nasce **leggero**, con ruolo `member` (D-50-05):
e' un account, non un'appartenenza. Il ruolo dedicato a chi compra e' differito
alla **fase 51** — fino ad allora `member` e' il ruolo **senza capability di
lavoro**, ed e' cosi' che va letto in ogni gate qui sotto.

> **Lo stato e' stato rimosso il 2026-09-21, fase 50.** `profiles.status`,
> `public.get_user_status()` e `role_capabilities.requires_approved` non
> esistono piu' (`20260921120000_drop_status_and_referral.sql:996-1010`), e
> `pending` **non e' piu' rappresentabile**: non e' un valore che nessuno usa
> piu', e' un valore che il database non sa scrivere.
>
> **Perche' i due assi erano distinti, e vale come storia.** Fino a quella data
> ci si iscriveva: un `member` `pending` era una persona che aveva chiesto di
> entrare senza aver ancora ricevuto risposta, e un controllo sul solo ruolo la
> faceva entrare. **Oggi nessuno si iscrive** — gli account di lavoro li crea un
> admin o un organizer dentro l'app, quelli leggeri nascono da un acquisto o da
> un invito, e il signup pubblico e' spento anche in Supabase Auth. La domanda a
> cui il secondo asse rispondeva **non esiste piu'**. Se un giorno tornasse,
> tornerebbe come **politica scritta** (`community-membership.md`), non come una
> colonna riesumata.

## Quality Gates

- **Gate RLS-e'-il-confine**: Il middleware decide dove un utente puo' *andare*; la RLS decide cosa puo' *leggere*. Nessuna tabella con dati non pubblici senza policy RLS che regga anche se il middleware venisse bypassato. Una feature protetta dal solo redirect e' esposta a chiunque chiami l'API direttamente.
- **Gate ruolo e capability**: Ogni controllo d'accesso verifica **il ruolo e la capability**, e il predicato autoritativo e' `private.has_capability` — mai una lettura a mano di una colonna di `profiles`. **Un secondo asse non esiste**: dal 2026-09-21 `status` e `requires_approved` sono stati rimossi, e un gate che ne ordinasse il controllo farebbe scrivere un predicato su una colonna che non c'e' — che nessun compilatore ferma e che il database accetta fino al `42703` in esecuzione.
- **Gate escalation privilegi**: Nessun percorso in cui un utente puo' modificare il proprio `role`. La guardia sta nella RLS: `profiles_update_own` consente l'`UPDATE` della propria riga **solo se il ruolo resta quello che era** (`20260921120000_drop_status_and_referral.sql:146-155`) — la policy e' stata **ricreata** in quella migration, e il termine sul ruolo e' stato mantenuto apposta. La promozione a `master` via `MASTER_EMAIL` nel callback e' un percorso privilegiato: qualunque modifica va trattata come Critical.
- **Gate service role**: `src/lib/supabase/service.ts` usa la chiave service-role e **bypassa ogni RLS**. Ogni suo uso nuovo va giustificato per iscritto nel commit e non deve mai essere raggiungibile da input non fidato. Una service-client in un percorso che accetta parametri dall'utente e' una escalation.
- **Gate redirect validato**: Il parametro `next` del callback finisce in `NextResponse.redirect`. Oggi la concatenazione con `origin` impedisce il salto a un altro host, ma resta input non validato in un header `Location`. Ogni nuovo redirect parametrico usa una allow-list di path relativi, mai la stringa grezza.
- **Gate entropia degli identificatori**: Un codice che concede accesso deve resistere a un tentativo di indovinarlo. Ogni nuovo identificatore d'accesso nasce da un CSPRNG — `crypto.getRandomValues` lato applicazione, `extensions.gen_random_bytes` lato database — mai da `Math.random()` ne' dal `random()` di plpgsql.

  **Questa riga diceva `src/utils/qr.ts:49`, e indicava il posto sbagliato.** Quella funzione era **codice morto, zero importatori**, ed e' stata rimossa il 2026-09-05. Il codice di membership nasce nel trigger `public.handle_new_user`, e **dal 2026-09-05 nasce da `extensions.gen_random_bytes`**: alfabeto di 32 caratteri per 10, **2^50**, dentro la regex che la porta gia' accetta (`ScannerClient.tsx:71`, massimo 10). Prima erano 8 caratteri dal `random()` **seminato** di plpgsql: 2^40 come tetto nominale, meno nei fatti.

  **Cosa NON e' cambiato, e va tenuto:** i **quattro codici emessi prima** non sono stati rigenerati — `D-49-01`, perche' sono credenziali in mano a persone reali — quindi la debolezza vecchia sopravvive su quei quattro. E il rate limiting **continua a non esistere** (gate sotto): `api/membership/verify` resta un oracolo interrogabile senza costo.

- **Gate la porta ha due credenziali, e la seconda non guarda chi sei**: Si entra col biglietto **oppure** col solo `membership_code`, e la seconda strada ammette **senza leggere il ruolo** (`src/app/api/tickets/attendance/route.ts:145`). E' il gate *ruolo e capability* che non si applica sul percorso piu' corto. **E' debito NON scelto, non un difetto ignorato**: togliere l'ammissione sul solo codice era la terza strada di `D-49-01` ed e' stata scartata per non allargare la fase. Finche' resta cosi', nessuna modifica puo' **allargare** cio' che quel codice apre, e ogni fase che ne conia di piu' deve dichiararlo.
- **Gate nessun rate limiting, oggi**: Verificato il 2026-08-05: **il repo non ha alcun rate limiting** — nessuna dipendenza, nessuna implementazione. Ogni endpoint pubblico che risponde "valido / non valido" e' quindi un oracolo interrogabile senza costo: `api/membership/verify`, il lookup dei token drink, la validazione di un codice sconto. Finche' non esiste, **nessun nuovo endpoint di verifica va aggiunto senza dire, per iscritto, che e' esposto** — e ogni nuovo identificatore va reso abbastanza largo da non essere enumerabile.
- **Gate coerenza navigazione/permessi**: La lista `NAV_ITEMS` in `src/lib/rbac/roles.ts` nasconde le voci per ruolo. Nascondere un link **non e' proteggere una rotta**: ogni voce nascosta deve avere il suo controllo lato server. Se cambi l'una senza l'altra, hai spostato il problema, non risolto.

## Imperative Behaviors

- When adding a table with non-public data: write its RLS policy in the same migration
- When checking access: ask `private.has_capability` — role and capability, never a hand-read column, and never a second axis
- When using the service-role client: justify it in the commit, and prove no untrusted input reaches it
- When adding a parametric redirect: validate against an allow-list of relative paths
- When generating an access-granting code: use a CSPRNG — `crypto.getRandomValues` in the app, `extensions.gen_random_bytes` in the database — never `Math.random` and never plpgsql `random()`
- When touching what a bare membership code opens: it admits without reading the role — narrow it or leave it, never widen it
- When hiding a nav item by role: add the corresponding server-side check
