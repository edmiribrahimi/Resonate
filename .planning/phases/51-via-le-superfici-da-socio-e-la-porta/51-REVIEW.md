---
phase: 51
date: 2026-09-22
depth: standard
files_reviewed: 54
diff_base: 78f4a81
findings:
  critical: 1
  warning: 10
  info: 7
  total: 18
status: issues_found
files_reviewed_list:
  - scripts/container/seed.mjs
  - scripts/conversion-manifest.mjs
  - scripts/probe-forged-identity.sh
  - scripts/purge-attendances.mjs
  - scripts/rls-baseline-container.mjs
  - scripts/rls-baseline.mjs
  - scripts/seed-lab-door.mjs
  - scripts/verify-capabilities.mjs
  - scripts/verify-refusal.mjs
  - scripts/verify-scan-legibility.mjs
  - src/app/(admin)/admin/(work)/events/[id]/assignments/page.tsx
  - src/app/(admin)/admin/(work)/members/page.tsx
  - src/app/(admin)/admin/(work)/members/register/page.tsx
  - src/app/(admin)/admin/events/[id]/assignments/AssignmentsClient.tsx
  - src/app/(admin)/admin/events/[id]/assignments/actions.ts
  - src/app/(admin)/admin/members/CreateAccountForm.tsx
  - src/app/(admin)/admin/members/MemberActionNotice.tsx
  - src/app/(admin)/admin/members/actions.ts
  - src/app/(admin)/admin/scanner/ScannerClient.tsx
  - src/app/(members)/account/loading.tsx
  - src/app/(members)/account/page.tsx
  - src/app/(public)/events/[slug]/page.tsx
  - src/app/(public)/tickets/refund-actions.ts
  - src/app/api/auth/callback/route.ts
  - src/app/api/cron/event-reminders/route.ts
  - src/app/api/tickets/attendance/route.ts
  - src/app/api/tickets/checkin/route.ts
  - src/app/api/tickets/checkin/undo/route.ts
  - src/app/api/webhooks/sumup/route.ts
  - src/app/sw.ts
  - src/components/admin/MemberTable.tsx
  - src/components/layout/AppNav.tsx
  - src/components/scanner/ScanFlash.tsx
  - src/emails/account-invitation.tsx
  - src/lib/account/acts.ts
  - src/lib/capabilities/keys.ts
  - src/lib/door/classify.ts
  - src/lib/door/judge-at-scan-time.ts
  - src/lib/door/outcome.ts
  - src/lib/email-delivery/categories.ts
  - src/lib/errors/redact.ts
  - src/lib/failure/money-path.ts
  - src/lib/offline/checkin-store.ts
  - src/lib/offline/sync-manager.ts
  - src/lib/rbac/roles.ts
  - src/lib/routes/capability-routes.ts
  - src/lib/routes/next-redirect.ts
  - src/lib/supabase/middleware.ts
  - src/lib/tickets/guest-identity.ts
  - src/lib/venue-reveal/reveal-party-venue.ts
  - src/types/database.ts
  - src/utils/qr.ts
  - supabase/migrations/20260922120000_role_attendee_and_capability_keys.sql
  - supabase/migrations/20260922180000_drop_membership_code_and_rename_acts.sql
---

# Fase 51 — Code Review

**Revisionato:** 2026-09-22
**Profondita':** standard (lettura per file, diff `78f4a81..HEAD` come oggetto primario)
**File revisionati:** 54
**Esito:** `issues_found` — 1 blocker, 10 warning, 7 info

## Sommario

La rimozione e' fatta bene dove conta di piu': le sette superfici da socio non
hanno importatori vivi, le due regole `RuntimeCaching` sono uscite con le rotte
che servivano (`src/app/sw.ts:45-53`), il passo v6 di IndexedDB tocca la coda
**solo** per cancellare per chiave le voci del tipo ritirato e lascia in pace
`ticket` e `guest`, e i percorsi del denaro (`refund-actions.ts`,
`webhooks/sumup/route.ts`, `event-reminders/route.ts`, `money-path.ts`) sono
**lessicali e basta** — `"Member"` → `"Attendee"` su una stringa di ripiego, zero
cambi di comportamento. La segretezza del venue e' intatta: nessuna condizione
nuova attorno all'indirizzo, `venue_reveal_sent` non e' stato toccato, e in
`reveal-party-venue.ts:567` c'e' un solo token cambiato.

Quello che il gate non ha visto sta altrove, e in un posto che la fase non ha
ricontrollato: **lo script che semina il container per la baseline RLS e' stato
rotto togliendo il codice socio** — l'array dei parametri e' sparito insieme alla
colonna. E' l'unico controllo RLS automatico del repository, e non puo' piu'
girare.

Sul resto, le due concentrazioni di rischio sono la **nuova diramazione offline
del pulsante *Check in*** (un percorso che prima non esisteva: `case "guest"`
del drain era irraggiungibile) e un gruppo di **affermazioni documentali
sbagliate** — un commento SQL che sbaglia l'aritmetica delle concessioni, una
procedura che dichiara di aver rimisurato numeri di riga che erano gia' falsi
nello stesso commit, e una legenda che promette a uno `staff` un ingresso che
questa fase ha cancellato.

---

## Critical

### CR-01: `scripts/container/seed.mjs` — i due `insert into public.profiles` hanno perso l'array dei parametri: il seed del container non parte piu'

**File:** `scripts/container/seed.mjs:494-498` e `scripts/container/seed.mjs:518-522`

**Problema.** Togliendo `membership_code` dall'`INSERT` e' stato cancellato anche
il **secondo argomento** di `admin.query()`, non solo la quinta colonna. Lo stato
attuale, in entrambi i punti:

```js
await admin.query(
  `insert into public.profiles (id, email, full_name, role)
   values ($1::uuid, $2, $3, $4)`,

);
```

La riga vuota e' il posto in cui stava `[p.id, p.email, p.fullName, p.membershipCode, p.role]`.
Il diff lo mostra a chiare lettere: la riga dei valori e' stata rimossa e non
sostituita.

**Scenario di fallimento concreto.** `node --check` passa (e' sintatticamente
valido), quindi nessun gate statico se ne accorge. A tempo di esecuzione `pg`
riceve un `text` con quattro segnaposto e nessun `values`: manda la query per
**simple query protocol**, e PostgreSQL risponde `42P02 — there is no parameter
$1`. Il `for` e' dentro il `try` che disabilita il trigger
`on_auth_user_created`, quindi l'eccezione esce, il `finally` lo riabilita, e il
seed muore alla **prima persona**. Conseguenza: `scripts/rls-baseline-container.mjs`
non ha piu' un database da misurare, cioe' **l'unico controllo RLS automatico del
repository smette di esistere** — e in un progetto senza test runner e senza
error tracking quella e' l'unica rete sotto le policy. Non e' stato notato
perche' la fase ha misurato la produzione (`verify:capabilities` 5/5) e il
container no.

**Correzione.**

```js
await admin.query(
  `insert into public.profiles (id, email, full_name, role)
   values ($1::uuid, $2, $3, $4)`,
  [p.id, p.email, p.fullName, p.role]
);
```

in entrambi i siti — quello delle quattro persone della griglia e quello di
`THIRD_AXIS_PERSONAS`. E poi **far girare davvero** `npm run baseline:rls -- --target=container`,
perche' e' il solo modo in cui questo difetto si sarebbe visto.

---

## Warnings

### WR-01: un rapporto di guest list da un account mai assegnato finisce in `blocked`, che non si svuota mai — ed e' il difetto che questa fase esisteva per chiudere

**File:** `src/app/api/tickets/attendance/route.ts:1336-1337`, letto contro
`src/lib/offline/sync-manager.ts:225` e `:474-481`

**Problema.** Sul ramo nuovo, `judgeAtScanTime` che risponde `never_assigned`
viene tradotto in `return refuse(auth)` — cioe' **403**. In `sync-manager.ts` il
403 e' `blocked`, e `blocked`:

- **non incrementa `attempts`** (`applyClassification`, `case "blocked"`), quindi
  `MAX_SYNC_ATTEMPTS = 8` non si applica;
- non viene mai ritentato dal drain — si sblocca solo con `retryBlockedAfterSignIn`,
  che rimanda lo stesso corpo e riceve lo stesso 403.

La voce resta in coda **per sempre**, e sullo schermo della porta lo staff
continua a leggere *«Sign in again to record 1 entry»*. E' esattamente la frase
che `51-ESITI.md` P-51-1 passo 7 ha registrato come difetto e che
`judge-at-scan-time.ts:16-19` cita come ragione d'essere della funzione — e
`sync-manager.ts:200-203` la rifiuta per iscritto: *«Not `blocked`. `blocked`
waits for a new login, and no login returns a revoked assignment. That is the
exact defect this plan corrects, and putting either new row there would reinstate
it under a different name.»*

**In piu', le due porte non rispondono uguale.** Per lo stesso verdetto la rotta
del biglietto risponde `{outcome: "not_valid", reason: "no_assignment_at_scan"}`
→ bucket `dead` → `failedCheckins`, che e' una lista che il telefono conta e una
persona legge. Questa risponde 403 → `blocked`. `judge-at-scan-time.ts:20-22`
dichiara *«Two door routes must answer it identically about the same person on
the same night»*: oggi non lo fanno.

**Correzione.** Sul solo ramo `queuedScannedAt !== null`:

```ts
case "never_assigned":
  return NextResponse.json(
    { outcome: "not_valid", reason: "no_assignment_at_scan" },
    { status: DOOR_HTTP.not_valid },
  );
```

Il drain lo classifica `dead` con il suo nome (`NOT_VALID_REASONS` e' totale), la
voce esce dalla coda **visibile** invece di restarci muta, e le due rotte tornano
a dire la stessa cosa. Il 403 resta dov'e' giusto: sul tap dal vivo.

---

### WR-02: l'ammissione guest drenata viene registrata all'ora del drenaggio, e su questo percorso la mitigazione dichiarata da `judgeAtScanTime` NON esiste

**File:** `src/app/api/tickets/attendance/route.ts:1451`; contro
`src/lib/door/judge-at-scan-time.ts:78-81`

**Problema.** La scrittura finale e' `checked_in_at: now` — l'orologio del server
**al momento del drenaggio**. `queuedScannedAt` viene usato solo per il giudizio
e poi buttato. Il docblock che questa fase ha spostato qui accetta l'errore
d'orologio del telefono con questa motivazione testuale:

> *«The mitigation is that the anomaly is **visible**: the row carries
> `scanned_at` and `recorded_at` separately, and the distance between them is
> readable by anyone reviewing the night.»*

Su questa rotta non c'e' nessuna delle due cose: `grep door_scan_events
src/app/api/tickets/attendance/route.ts` trova **solo commenti**, e la rotta lo
dichiara essa stessa (`undo/route.ts:465-471`, ramo guest list senza riga di
registro). `guest_list_entries` porta una sola colonna temporale.

**Scenario concreto.** Invitata senza email, trovata per nome e ammessa alle
01:40 a radio spenta. La coda si drena alle 03:10 quando il telefono riprende
campo. Il riepilogo della serata dice che e' entrata alle **03:10**, un'ora e
mezza dopo, e non esiste un secondo timestamp da cui accorgersene. L'argomento
che rende accettabile l'errore d'orologio e' stato importato da un percorso dove
l'evidenza esiste (il biglietto) a uno dove non esiste.

**Correzione.** Minimo: scrivere il momento vero, `checked_in_at: queuedScannedAt ?? now`,
e dichiarare accanto che su questo ramo l'orologio e' quello del dispositivo.
Meglio: dare anche al ramo guest la sua riga di `door_scan_events` con
`scanned_at` e `recorded_at` distinti — e' il debito che `undo/route.ts` nomina
da due fasi.

---

### WR-03: `revoked_after_scan` sul ramo guest produce solo un `console.warn`, che in questo progetto e' un fallimento silenzioso

**File:** `src/app/api/tickets/attendance/route.ts:1324-1333`

**Problema.** Il ramo registra l'ammissione (giusto: e' avvenuta) e segnala
l'anomalia con `console.warn`. Il progetto **non ha error tracking**
(`meta-gates.md`, verificato: nessuna dipendenza di monitoraggio), quindi quella
riga non raggiunge nessuno. Per di piu' la risposta non porta alcun marcatore,
quindi `classifyResponse` la vede come un `200` qualunque e `sync-manager.ts`
la registra come `sync:synced:guest:legacy_success` — **indistinguibile da
un'ammissione ordinaria** anche nel log del telefono, che e' l'unico osservatore
che esiste davvero.

La rotta del biglietto fa il contrario: mette `assignmentRevokedAfterScan: true`
nel corpo, e il drain ha una riga di tabella apposta per quel caso
(`sync-manager.ts:152`, `via: "recorded_after_revocation"`).

**Correzione.** Aggiungere il flag alla risposta di successo quando
`judgement.kind === "revoked_after_scan"`, cosi' la riga di tabella gia' scritta
in `sync-manager.ts` si accende anche qui:

```ts
return NextResponse.json({
  success: true,
  ...(revokedAfterScan ? { assignmentRevokedAfterScan: true } : {}),
  name: `${entry.first_name} ${entry.last_name}`,
  checkedInAt: now,
});
```

---

### WR-04: l'avviso della guest list si accende ogni volta che il canale realtime cade, e stampa una frase che contraddice se stessa

**File:** `src/app/(admin)/admin/scanner/ScannerClient.tsx:2678-2679` e `:3316-3323`

**Problema.**

```ts
const listIsStale =
  listAgeMs !== null && (!channelLive || listAgeMs > SAFETY_RELOAD_MS);
```

Il nuovo avviso rende su `(listAgeMs === null || listIsStale)`. Poiche'
`!channelLive` basta da solo, l'avviso si accende **nell'istante in cui la radio
si spegne**, sopra una lista scaricata tre secondi prima — e
`guestListWarningText` compone allora:

> *«The guest list on this device was NOT refreshed (updated 3s ago). A guest
> added to the list since then will not be found by name…»*

«NOT refreshed (updated 3s ago)» e' una contraddizione in sei parole, su una
superficie letta alle due di notte davanti a una fila. E un avviso che e' acceso
per tutta la durata del lavoro offline — cioe' esattamente quando serve leggerlo
— e' la stessa patologia del `cacheNotices` appiccicoso che D-51-10 esisteva per
togliere, rientrata dal lato derivato.

`51-VERIFICATION.md` lo registra come «domanda aperta / decisione di prodotto».
Va bene come registrazione, non come chiusura: la frase e' falsa nel merito, non
solo inopportuna.

**Correzione.** Legare questo elemento alla sola **eta'**, e lasciare
`!channelLive` alla banda di staleness che lo riporta gia' e ha un'azione
associata:

```ts
{(listAgeMs === null || listAgeMs > SAFETY_RELOAD_MS) && ( … )}
```

---

### WR-05: il `COMMENT ON TABLE private.role_capabilities` sbaglia l'aritmetica delle concessioni

**File:** `supabase/migrations/20260922120000_role_attendee_and_capability_keys.sql:639`

**Problema.** Il commento scritto dalla migration dice:

> *«28 righe: 16 a master, 14 a organizer, ZERO a staff e ZERO ad attendee.»*

16 + 14 + 0 + 0 = **30**, non 28. I numeri veri sono **15 a master, 13 a
organizer**, e sono misurati due volte in questo stesso commit:
`scripts/verify-capabilities.mjs` dichiara `EXPECTED_GRANT_COUNT = 28` e il
cammino su `ROLE_GRANTS` da' master 15 / organizer 13 / staff 0 / attendee 0; e
`51-VERIFICATION.md` riporta la rilettura dalla produzione alle 19:15:55Z come
*«`private.role_capabilities` 28 (`master` 15 + `organizer` 13)»*. 16 e 14 erano
i valori **prima** della cancellazione delle quattro concessioni di
`membership.card.view`.

Non e' pedanteria: questo commento e' la documentazione durevole del catalogo dei
permessi, quella che chi aggiungera' un ruolo leggera' per prima, ed e'
l'artefatto che sopravvive a tutti i SUMMARY.

**Correzione.** `'… 28 righe: 15 a master, 13 a organizer, ZERO a staff e ZERO ad attendee. …'`
(si applica con un `COMMENT ON TABLE` in una migration nuova; il testo va
corretto anche nel file storico perche' e' quello che si rilegge).

---

### WR-06: la sonda sull'identita' forgiata dichiara di aver rimisurato numeri di riga che erano gia' sbagliati nello stesso commit

**File:** `scripts/probe-forged-identity.sh:165-167` e `:436`

**Problema.** Il blocco dice, testualmente, **«RE-MEASURED 2026-09-22, phase 51»**
e indica `src/lib/supabase/middleware.ts:697-699` come le tre righe di strip da
commentare per il controllo positivo. Misurato:

- al commit che ha scritto quella riga (`42300eb`), le tre `requestHeaders.delete`
  stavano a **715-717**;
- oggi stanno a **726-728**.

Quindi la rimisurazione dichiarata non e' avvenuta, ed era falsa di 18 righe nel
momento in cui e' stata scritta. Lo stesso paragrafo, due righe sotto, avverte:
*«commenting out three lines that are not the strip produces a probe that stays
quiet for the wrong reason, which is a false negative wearing a green»*. La riga
di errore a `:436` stampa gli stessi numeri sbagliati a chi sta indagando un
leak di header.

**Correzione.** Togliere i numeri e lasciare **solo** l'istruzione che il file
gia' da':

```
     grep -n 'requestHeaders.delete' src/lib/supabase/middleware.ts
```

Un numero di riga in una procedura e' la parte che marcisce per prima — il file
lo dice, e va applicato a se stesso.

---

### WR-07: la legenda della tabella account promette allo `staff` un ingresso che questa fase ha cancellato

**File:** `src/components/admin/MemberTable.tsx:707-713`

**Problema.** La legenda letta da un organizer prima di promuovere qualcuno dice
ancora:

> *«What it holds is free entry to every night, permanently and without expiry — a
> permanent free seat at a venue that holds 150–300 people.»*

Il meccanismo che lo realizzava era la membership card, e **questa fase lo ha
cancellato**: `src/lib/rbac/roles.ts:100-107`, nello stesso commit, registra che
*«permanent entry to a night through the membership card — is gone with phase
51»*, e D-51-03 stabilisce che staff e organizer non vengono scansionati affatto.
Il catalogo lo conferma: `staff` passa a **zero concessioni**.

La frase non e' stata dimenticata per distrazione — il resto del file e' stato
riscritto — ma resta, sulla superficie dove si decide chi diventa staff, un
beneficio che il prodotto non eroga piu'. E' anche una decisione economica
presentata male: «un posto gratuito permanente in un locale da 150-300» e' il
costo che quella riga chiede di soppesare.

**Correzione.** Riscrivere la legenda su cio' che il ruolo fa oggi: `staff` non
concede nulla di suo, e il lavoro alla porta o in galleria viene
dall'assegnazione alla serata e scade con lei. Se l'ingresso gratuito resta una
promessa di prodotto, ha bisogno di un meccanismo — ed e' una decisione del
proprietario, non una frase da lasciare in piedi.

---

### WR-08: `interface Attendance` descrive una tabella che questa fase ha tolto dallo schema

**File:** `src/types/database.ts:404-443` (e la citazione a `:186`)

**Problema.** `public.attendances` e' stata tolta da
`20260922180000_drop_membership_code_and_rename_acts.sql:932`
(`DROP TABLE IF EXISTS public.attendances`), e la rilettura dalla produzione
riporta `to_regclass('public.attendances') → null`. L'interfaccia TypeScript che
la descrive e' rimasta, con **zero importatori**.

Tutto il resto che la nominava e' uscito nello stesso commit — la voce di
`BLOCKING_SETS`, la causa `delete_account_checked_in_attendances`, il suo avviso,
il terzo ramo dell'annullamento — e `Profile.membership_code` e' stato tolto con
la stessa disciplina. Questa e' l'unica sopravvissuta, e dato che **nessun client
Supabase di questo repository e' parametrizzato con `Database`**, un tipo che
descrive una tabella inesistente e' un invito a scrivere una query che compila e
risponde `42P01` in esecuzione.

**Correzione.** Cancellare l'interfaccia e la citazione `Attendance.entry_role` a
`:186`, con la stessa lapide-senza-nome usata per `Profile.membership_code`.

---

### WR-09: il ponte `const role: string` in `MemberTable` e' scaduto, e adesso e' l'unica cosa che toglie il compilatore da cinque confronti di ruolo

**File:** `src/components/admin/MemberTable.tsx:399`

**Problema.**

```ts
const role: string = member.role;
```

Il commento sopra dichiara che e' *«un ponte fra due piani»*, valido nella
finestra in cui `UserRole` non portava ancora `attendee`, e dice *«Quando
l'unione avra' il quarto valore questa riga potra' sparire»*. Quel piano e'
atterrato **nello stesso range di commit**: `src/types/database.ts:99` oggi dice
`"master" | "organizer" | "staff" | "attendee"`.

Finche' resta, i cinque confronti sotto (`role === "master"`, `=== "attendee"`,
`=== "staff"`, `=== "organizer"`) sono confronti fra stringhe libere: un refuso
— `"attendeee"`, `"Attendee"` — compila e produce una colonna di pulsanti che non
compaiono mai, senza un errore da nessuna parte. Il file stesso avverte che il
valore e' dato del database, non parola scelta.

**Correzione.** Togliere l'alias e confrontare `member.role` direttamente, cosi'
il compilatore torna a difendere i cinque rami.

---

### WR-10: il fallimento del negozio locale sul nuovo ramo guest da' un'istruzione circolare

**File:** `src/app/(admin)/admin/scanner/ScannerClient.tsx:2463` →
`reportStoreFault` a `:1990-2006`

**Problema.** Se `checkInLocally` fallisce nel ramo offline del pulsante *Check
in*, la schermata mostra:

> *«This device could not read its own list» — «Check the person in from the list
> on screen»*

Per questo chiamante l'istruzione e' circolare: l'operatore **ha appena** toccato
la riga della lista, ed e' quello che e' fallito. Alle due di notte produce un
ciclo — riprova, stesso errore, stessa frase — senza mai dire cosa fare davvero
(far entrare la persona e annotarla a mano: la porta ammette, il report si
corregge dopo). E' la forma tipica di fallimento non azionabile che
`meta-gates.md` vieta.

**Correzione.** Dare al ramo guest il suo sottotitolo, per esempio *«Let them in
and write the name down — this device could not queue the entry»*, lasciando
`reportStoreFault` ai chiamanti per cui la frase attuale ha senso.

---

## Info

### IN-01: `ROLES` non ha consumatori

**File:** `src/lib/rbac/roles.ts:97-119`

Il commento lo ammette (*«La costante non ha consumatori misurati»*) e la misura
lo conferma: `grep -rn "ROLES\." src/` trova solo due occorrenze in prosa dentro
`database.ts`. Un export morto che la rinomina `MEMBER → ATTENDEE` ha dovuto
comunque attraversare, e che il build non avrebbe difeso se fosse stato
dimenticato. O gli si da' un consumatore (i letterali di ruolo sparsi in
`actions.ts`, `MemberTable.tsx`, `CreateAccountForm.tsx`) o si toglie.

### IN-02: citazioni datate di rotte cancellate

- `src/lib/offline/sync-manager.ts:19` e `:249` — *«`api/membership/verify/route.ts` does the same before its 409»*, su una rotta che questa fase cancella; e' proprio la riga che regge la sicurezza di `already_recorded → done`.
- `src/lib/door/judge-at-scan-time.ts:68` — `src/app/api/membership/verify/route.ts:412*` con numero di riga (e un `*` al posto del backtick di chiusura).
- `src/app/api/tickets/attendance/route.ts:110` — stessa rotta, stesso numero di riga.
- `src/middleware.ts:38-40` — *«`/membership-card` and `/attendance` are still judged downstream and sit outside the collapsed tree»*, su due indirizzi che rispondono 404. Il file non e' nel perimetro della fase, e proprio per questo la riga non e' stata rimisurata.

Ognuna cade sotto il gate *documentazione datata* che il resto del diff applica
con cura altrove.

### IN-03: la prova per mutazione di `verify-capabilities` non e' piu' eseguibile come scritta

**File:** `scripts/verify-capabilities.mjs:1465` e `:1471`

Le mutazioni A e C inseriscono `('member','door.operate',false)`. `member` non e'
piu' un valore scrivibile (`role_capabilities_role_check` ammette quattro valori
e non quello), e la terza colonna `requires_approved` e' stata rimossa dalla fase
50. Chi ripercorresse la prova riceverebbe `23514`/`42703` invece della
mutazione, e leggerebbe un rosso che non e' il rosso cercato.

### IN-04: il suggerimento sul ruolo nella creazione account descrive una preoccupazione che la fase ha cancellato

**File:** `src/app/(admin)/admin/members/CreateAccountForm.tsx:374-378`

*«Create staff accounts before the night… A door phone that has already gone
offline works from the list it downloaded, and does not know an account created
after that.»* Con D-51-03 staff e organizer non sono piu' soggetti della porta e
non compaiono nella lista scaricata: non c'e' piu' un modo in cui un account di
lavoro creato tardi venga «non riconosciuto» dal telefono. Il consiglio resta
buono per altre ragioni, ma la ragione scritta non e' piu' quella vera.

### IN-05: `/dashboard` in `PROTECTED_PREFIXES` e' irraggiungibile, e la ragione scritta e' sbagliata

**File:** `src/lib/routes/next-redirect.ts:218-224`

La nota giustifica la voce con *«questa lista e' un test di PREFISSO, quindi
entrambi devono esserci o un chiamante anonimo raggiunge uno di loro senza essere
rimbalzato»*. Ma i `redirects()` di `next.config.ts` girano **prima** del
middleware — lo dice `next.config.ts` stesso — quindi un anonimo su `/dashboard`
riceve il 308 e incontra il middleware gia' su `/account`. La voce e' innocua (e
obbligatoria per il controllo [3/3] di `verify-routes.mjs`, che pretende un
pattern per ogni prefisso), ma il motivo scritto accanto non regge, e sara' quello
che qualcuno citera' la prossima volta.

### IN-06: il `catch` di `handleGuestCheckIn` ha ora un effetto collaterale e un perimetro troppo largo

**File:** `src/app/(admin)/admin/scanner/ScannerClient.tsx:2480-2544`

Il `try` racchiude la `fetch` **e** tutto cio' che segue sul ramo `res.ok` —
`showFlash`, `addScanRecord`, `fetchAttendance`. Il `catch`, che prima si
limitava a mostrare un messaggio, adesso **accoda un'ammissione locale**. Un
throw proveniente da una qualunque di quelle chiamate dopo una scrittura riuscita
sul server accoderebbe un duplicato (il drain lo risolverebbe con un 409 → `done`,
quindi il danno e' contenuto, ma il percorso esiste e non e' quello dichiarato:
*«The only cause this arm covers is still the same one: the request never reached
a server»*). Restringere il `try` alla sola `fetch` renderebbe vera quella frase.

### IN-07: chiave ricalcolata invece che usata

**File:** `src/app/(admin)/admin/scanner/ScannerClient.tsx:2394-2398`

`queueGuestLocally` ricostruisce `attendeeKey(partyId, "guest_list_entry", guestListEntryId)`
quando `checkInLocally` ha appena restituito `result.key`, che e' la stessa
stringa costruita dalla stessa funzione. Due modi di scrivere la chiave con cui
l'annullamento offline ritrova la voce: il ramo biglietto usa `result.key`, e
questo dovrebbe fare lo stesso.

---

## Non trovato

Controlli di dominio percorsi che **passano**, e su quali prove:

- **Porta / offline.** Il passo v6 di `checkin-store.ts:690-737` apre la coda **solo** per cancellare per chiave le voci del tipo ritirato (`pendingCheckins` e `failedCheckins`), lascia `ticket` e `guest` dove sono, distrugge `members` **dopo** il lavoro sulla coda, attende solo promesse `idb`, e emette **una** riga con categoria e conteggio (`checkin-store:v6_dropped_membership_entries`), senza alcun identificativo di persona. `QueuedSubjectType` ha due membri e lo `switch` di `targetFor` e' esaustivo: un ramo residuo sarebbe un errore di build.
- **`judgeAtScanTime` e' stato spostato byte per byte.** Diff verificato riga per riga contro la versione che stava in `checkin/route.ts`: nessuna differenza di comportamento, solo prosa aggiunta in testa. Il ramo `no_assignment_at_scan` della rotta biglietto e' invariato.
- **Nessun percorso rifiuta offline un portatore valido.** `ticketOffline` ammette e marca anche il biglietto non in cache; il nuovo ramo guest ammette e accoda; l'unico rifiuto locale nuovo e' `no_party_selected`, irraggiungibile dall'interfaccia e comunque corretto (gate *identita' del party*).
- **Il ramo `revoked_after_scan` registra invece di cancellare.** L'ammissione avvenuta non viene mai annullata da una revoca successiva (il difetto segnalato in WR-03 riguarda la sua **visibilita'**, non la decisione).
- **401 / 503 mappati bene.** `unauthenticated → 401 → blocked` (che un login risolve davvero) e `unresolved → 503 → retry` corrispondono alla tabella di `sync-manager.ts:147-157`. Il 409 della rotta guest porta `outcome: "already_recorded"` nel corpo, quindi il drain lo chiude come `done` e non lo perde.
- **Accesso: la rinomina non allarga niente.** I due `CHECK` passano per lo stato transitorio a cinque valori e tornano a quattro nella stessa transazione; il `DEFAULT` della colonna si muove; `handle_new_user` tiene il ruolo **cablato** e non lo legge dai metadati; `staff` e `attendee` restano a zero concessioni, e il `DO` che rilegge `pg_policies` **prima** dei due `DELETE` impedisce di cancellare una chiave che una policy legga ancora.
- **`reconcile_master` e' ridefinita due volte nell'ordine giusto:** prima il letterale del ruolo (`20260922120000`), poi il nome dello scrittore (`20260922180000`). Invertirle avrebbe resuscitato `'member'`, e la migration lo dichiara.
- **Il `REVOKE` su `account_acts` sopravvive.** `ALTER TABLE … RENAME TO` e `ALTER FUNCTION … RENAME TO` conservano l'ACL e `SECURITY DEFINER`; sette vincoli, due indici e la policy sono rinominati uno per uno (la PK porta con se' il suo indice). Nessuna policy e' stata riscritta, solo ribattezzata.
- **`DROP TABLE` senza `CASCADE`, con guardia a monte.** Il blocco `DO` conta le righe e **solleva** se ne trova: il `DROP` non puo' portarsi via dati che nessuno ha contato.
- **Denaro: solo lessico.** `refund-actions.ts:376,467`, `webhooks/sumup/route.ts:239`, `event-reminders/route.ts:175,188` — una sola stringa di ripiego per riga (`"Member"` → `"Attendee"`). Nessun cambio a idempotenza, a verifica GET, a riconciliazione.
- **Venue: un token.** `reveal-party-venue.ts:567` cambia il solo ripiego del nome del destinatario; `events/[slug]/page.tsx` cambia solo prosa di commento. `venue_reveal_sent` non compare nel diff.
- **Script di laboratorio:** `seed-lab-door.mjs:85` rifiuta il ref di produzione prima di qualunque lettura; `purge-attendances.mjs` cancella **per chiave primaria** su una lista catturata **dalla stessa query che l'ha contata**, scrive l'istantanea prima di ogni scrittura (file coperto da `.gitignore:34`), verifica la cascata dal catalogo in entrambe le direzioni, e prende il contatore di controllo da **PostgREST** (fonte diversa dal Management API) con una guardia che confronta l'URL col ref del bersaglio. L'autorizzazione e' datata, si verifica `spent: no`, e si marca esaurita dopo l'atto.
- **Sette file cancellati, nessun riferimento vivo.** `grep` su `src/` e `scripts/`: nessun import, nessuna stringa in una allow-list, nessuna regola di precache. Le occorrenze rimaste sono prosa di commento (IN-02).
- **Nessun segreto in chiaro, nessun `eval`, nessuna costruzione di filtro PostgREST con valori che portano `:` o `.`** — `judge-at-scan-time.ts:152-159` usa `.eq/.lte/.gt` e rifiuta esplicitamente `.or()` con un ISO dentro, e il confronto sulla revoca si fa con `Date.parse` su entrambi i lati, mai fra stringhe.

---

_Revisionato: 2026-09-22_
_Revisore: Claude (gsd-code-reviewer)_
_Profondita': standard_
