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

  **Il codice socio non esiste piu'.** Fino al 2026-09-22 questo capoverso descriveva il suo conio — `public.handle_new_user` con `extensions.gen_random_bytes` dal 2026-09-05, 2^50, e i quattro codici deboli emessi prima e mai rigenerati (`D-49-01`). La fase 51 ha cancellato la colonna `profiles.membership_code`, il conio e la rotta che lo verificava (D-51-02, MEM-03): **i quattro codici deboli sono usciti con la colonna**, e la storia resta in `51-VERIFICATION.md`. Oggi gli identificatori d'accesso vivi sono il **QR del biglietto** (firma HMAC, `TICKET_SIGNING_SECRET`) e i **token d'ordine** nell'URL della pagina d'ordine; ogni nuovo identificatore nasce sotto la stessa regola. E il rate limiting **continua a non esistere** (gate sotto): la rotta che questo capoverso citava come oracolo e' uscita con la fase 51, il difetto no.

- **Gate la porta ha due credenziali, e nessuna delle due e' un'identita'**: Si entra col **biglietto** (QR firmato HMAC) **oppure per nome dalla guest list** scaricata sul telefono, e nessuna delle due strade legge il ruolo di chi entra — legge quello di chi **tiene la porta** (`door.operate`, per ruolo o per assegnazione sulla serata). *(Fino al 2026-09-22 la seconda credenziale era il codice socio, che ammetteva da solo e senza firma: la fase 51 lo ha cancellato con la sua colonna e la sua rotta — D-51-02, MEM-03. Questo gate lo descriveva ancora come vivo il 2026-09-23.)* Cio' che resta vero, e vincola: un ingresso in guest list e' un ingresso **senza firma e senza pagamento**, quindi ogni percorso che aggiunge un nome va attribuito (`ticketing-payments.md`, gate guest list), e nessuna modifica alla porta puo' **allargare** cio' che un nome in lista apre.
- **Gate nessun rate limiting, oggi**: Verificato il 2026-08-05: **il repo non ha alcun rate limiting** — nessuna dipendenza, nessuna implementazione. Ogni endpoint pubblico che risponde "valido / non valido" e' quindi un oracolo interrogabile senza costo: il lookup dei token drink (`src/app/api/drinks/tokens/route.ts`) e la validazione di un codice sconto. **La lista si e' accorciata con la fase 51 perche' una rotta e' uscita, non perche' il difetto sia stato riparato.** Finche' non esiste, **nessun nuovo endpoint di verifica va aggiunto senza dire, per iscritto, che e' esposto** — e ogni nuovo identificatore va reso abbastanza largo da non essere enumerabile.
- **Gate coerenza navigazione/permessi**: `getNavigation` in `src/lib/rbac/roles.ts:615` decide barra e pannello Management da sessione, ruolo e capability. Nascondere un link **non e' proteggere una rotta**: ogni voce nascosta deve avere il suo controllo lato server. Se cambi l'una senza l'altra, hai spostato il problema, non risolto. *(Fino al 2026-09-23 qui si citava `NAV_ITEMS`, che la fase 52 ha tolto.)*

  **`/gallery` sta sotto `gallery.view` dal 2026-09-23** (fase 52, NAV-02/NAV-07): voce di mappa con `alsoGatesTables` (`src/lib/routes/capability-routes.ts:952-955`), prefisso protetto con ritorno al login (`src/lib/routes/next-redirect.ts:250`), guardia in pagina (`src/app/(public)/gallery/page.tsx:93`) — e la chiave governa anche le **righe** (`event_media_select_gallery`) e, attraverso la riga, gli **oggetti**. **Riaprirla al pubblico e' anche una migration** (D-52-14, i cinque passi accanto alla voce): togliere le righe di codice e non la policy produce una pagina pubblica vuota, senza errore; togliere la policy riapre foto di serate a sede segreta (`venue-secrecy.md`). E' una decisione, non una pulizia.

## Imperative Behaviors

- When adding a table with non-public data: write its RLS policy in the same migration
- When checking access: ask `private.has_capability` — role and capability, never a hand-read column, and never a second axis
- When using the service-role client: justify it in the commit, and prove no untrusted input reaches it
- When adding a parametric redirect: validate against an allow-list of relative paths
- When generating an access-granting code: use a CSPRNG — `crypto.getRandomValues` in the app, `extensions.gen_random_bytes` in the database — never `Math.random` and never plpgsql `random()`
- When touching what a guest-list name opens: it admits without a signature — narrow it or leave it, never widen it
- When hiding a nav item by role: add the corresponding server-side check
