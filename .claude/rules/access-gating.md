---
paths:
  - "src/lib/rbac/**"
  - "src/lib/supabase/**"
  - "src/lib/routes/**"
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

- **Ruolo** — `master` · `organizer` · `staff` · `attendee`

Il predicato autoritativo dell'accesso e' `private.has_capability`: ruolo →
capability, piu' l'assegnazione per serata
(`20260921120000_drop_status_and_referral.sql:397-420`). Non c'e' un secondo
asse da guardare.

**`attendee` non significa «socio».** L'account di chi compra un biglietto o
riceve un invito da guest list nasce **leggero**, con ruolo `attendee`: e' un
account, non un'appartenenza, e **non tiene alcuna capability** — zero
concessioni a quel ruolo in `private.role_capabilities`, rilette dalla
produzione il 2026-09-22. Fino a quel giorno si chiamava `member` (D-50-05);
la fase 51 lo ha rinominato (D-51-06) e il `CHECK` di `profiles.role` **non
accetta piu' il nome vecchio**: un predicato che lo scrivesse fallirebbe con
`23514`, un confronto in TypeScript non compilerebbe.

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

  Gli identificatori d'accesso vivi sono il **QR del biglietto** (firma HMAC, `TICKET_SIGNING_SECRET`) e i **token d'ordine** nell'URL della pagina d'ordine; il codice socio e' uscito con la fase 51 (D-51-02). Il rate limiting **continua a non esistere** (gate sotto).

- **Gate la porta ha due credenziali, e nessuna delle due e' un'identita'**: Si entra col **biglietto** (QR firmato HMAC) **oppure per nome dalla guest list** scaricata sul telefono, e nessuna delle due strade legge il ruolo di chi entra — legge quello di chi **tiene la porta** (`door.operate`, per ruolo o per assegnazione sulla serata). Cio' che resta vero, e vincola: un ingresso in guest list e' un ingresso **senza firma e senza pagamento**, quindi ogni percorso che aggiunge un nome va attribuito (`ticketing-payments.md`, gate guest list), e nessuna modifica alla porta puo' **allargare** cio' che un nome in lista apre.
- **Gate nessun rate limiting, oggi**: Verificato il 2026-08-05: **il repo non ha alcun rate limiting** — nessuna dipendenza, nessuna implementazione. Ogni endpoint pubblico che risponde "valido / non valido" e' quindi un oracolo interrogabile senza costo: il lookup dei token drink (`src/app/api/drinks/tokens/route.ts`) e la validazione di un codice sconto. **La lista si e' accorciata con la fase 51 perche' una rotta e' uscita, non perche' il difetto sia stato riparato.** Finche' non esiste, **nessun nuovo endpoint di verifica va aggiunto senza dire, per iscritto, che e' esposto** — e ogni nuovo identificatore va reso abbastanza largo da non essere enumerabile.
- **Gate coerenza navigazione/permessi**: `getNavigation` in `src/lib/rbac/roles.ts:615` decide barra e pannello Management da sessione, ruolo e capability. Nascondere un link **non e' proteggere una rotta**: ogni voce nascosta deve avere il suo controllo lato server. Se cambi l'una senza l'altra, hai spostato il problema, non risolto. *(Fino al 2026-09-23 qui si citava `NAV_ITEMS`, che la fase 52 ha tolto.)*

  **Le chiavi della gallery non esistono piu'** (2026-10-02, M-D in produzione: `gallery.view` e `media.upload` tolte, catalogo a **14 chiavi e 26 concessioni**, la pagina `/gallery` e' cancellata). **Lo staff non tiene concessioni per ruolo**: lavora solo per assegnazione sulla serata.

- **Gate una destinazione di redirect sta nella mappa**: Ogni `to` di `ORGANIZER_REDIRECTS` (`src/lib/routes/organizer-redirects.ts`) deve risolversi in `CAPABILITY_ROUTES`. Se esce dalla mappa, **il middleware lancia alla prima richiesta e ogni indirizzo risponde 500** — mentre `npm run build` e `npm run verify` restano verdi, perche' il controllo nel modulo e' un `throw` che gira solo a runtime. **E' successo il 2026-10-02 sul laboratorio** (U4, piano 52.1-20): la gallery era uscita dalla mappa, la riga `/organizer/events/[id]/media` no. Il controllo statico ora esiste, `verify:routes [5/5]`: togliere una voce dalla mappa senza togliere i redirect che ci puntano lo fa rosso.

## Imperative Behaviors

- When adding a table with non-public data: write its RLS policy in the same migration
- When checking access: ask `private.has_capability` — role and capability, never a hand-read column, and never a second axis
- When using the service-role client: justify it in the commit, and prove no untrusted input reaches it
- When adding a parametric redirect: validate against an allow-list of relative paths
- When generating an access-granting code: use a CSPRNG — `crypto.getRandomValues` in the app, `extensions.gen_random_bytes` in the database — never `Math.random` and never plpgsql `random()`
- When touching what a guest-list name opens: it admits without a signature — narrow it or leave it, never widen it
- When removing a route from `CAPABILITY_ROUTES`: remove every redirect that points to it, and run `verify:routes`
- When hiding a nav item by role: add the corresponding server-side check
