---
phase: 35-per-night-assignments
plan: 10
subsystem: checkin-offline
tags: [door, assign-08, assign-01, attendance, per-night, wave-5]

# Dependency graph
requires:
  - plan: 35-07
    provides: "`requireDoorOperator({ partyId })` con `mayScan`, `maySupervise`, `validUntil`, `resolvedAt` sul ramo `ok: true` — questo piano e' il PRIMO consumatore di `validUntil` / `resolvedAt`"
  - plan: 35-03
    provides: "`public.my_access_context(uuid)` e il secondo braccio di `private.has_capability` — migration NON applicata in produzione"
  - plan: 35-02
    provides: "`public.party_end_instant(date, time)` e la colonna `ends_at` — migration NON applicata in produzione"
provides:
  - "`doorAuth` sulla risposta di `/api/tickets/attendance`: il verdetto della porta all'apertura dello scanner, in ZERO chiamate in piu'"
  - "l'insieme d'ammissione additivo della lista serate: chi ha solo un'assegnazione viva vede le sue notti, chi aveva il ruolo non perde nulla"
  - "`reachedByAssignment` per riga — `false` per ruolo, `true` per assegnazione, `null` dove il verdetto e' un'unione"
  - "la MISURA della voce 5 di `deferred-items.md`, che era dedotta"
affects: [35-11, 35-13, 35-15, 35-17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "il verdetto viaggia sulla risposta che il chiamante gia' chiede: nessun endpoint di autorizzazione esiste, quindi nessuna chiamata di autorizzazione puo' essere contata"
    - "un insieme d'ammissione si allarga, non si restringe: un campo in piu' per riga, mai una riga in meno"
    - "`null` non e' `false`: un campo che non ha una risposta la dichiara assente invece di inventarne una"
    - "assente non e' distinguibile da falso per un dispositivo, quindi il campo c'e' sempre e porta `null` — la regola che `refundedAt` fissa gia' in questo file"

key-files:
  created: []
  modified:
    - src/app/api/tickets/attendance/route.ts

key-decisions:
  - "`doorAuth` sta accanto a `events`, non dentro ogni serata: e' il verdetto della RISOLUZIONE, che e' una per richiesta, e duplicarlo per riga sarebbe lo stesso fatto scritto N volte"
  - "`doorAuth` e' ASSENTE, mai `mayScan: false`, sul solo ramo dove non esiste un verdetto unico (lista raggiunta per sola assegnazione): un falso `false` alla porta e' un rifiuto travestito da risposta"
  - "`reachedByAssignment` e' `boolean | null` e non `boolean`: sul ramo per-notte la guardia risolve ruolo e assegnazione come UNA unione e non li distingue, e scoprirlo costerebbe il round trip che questo piano esiste per evitare"
  - "la lettura di `party_assignments` usa il client legato ai cookie e non quello service: `party_assignments_select_own` risponde solo per il chiamante, il service client risponderebbe per tutti"
  - "la liveness `now() < ends_at` e' applicata in TypeScript e dichiarata come tale: non e' un confine — il confine e' dentro `private.has_capability`, sull'orologio del database"

# Metrics
metrics:
  duration: "~75 min"
  completed: 2026-08-09
  tasks_completed: 2
  tasks_total: 2
  checkpoint_open: false
---

# Fase 35 Piano 10: il verdetto arriva con il roster — Summary

ASSIGN-08. Lo scanner apre una notte e, sulla **stessa** risposta che gia'
chiedeva, riceve cosa puo' farci. Non c'e' un quarto endpoint da chiamare,
quindi non c'e' una chiamata di autorizzazione da contare: e' il senso letterale
della prova che questo piano deve.

E la seconda meta', che sembra minore e non lo e': la lista delle serate. E' la
**prima** cosa che lo scanner carica, e **una lista vuota alla porta e' un
rifiuto**. Il criterio ora e' scritto nella route: *un campo in piu' per riga,
mai una riga in meno*.

**Nessuna delle migration su cui questo codice poggia e' applicata in
produzione.** `public.my_access_context(uuid)` e `public.party_assignments`
stanno nelle righe 7+ della coda di `35-HUMAN-UAT.md`. `npm run build` e' verde
**senza** di esse, perche' nessun client di questo repository e' parametrizzato
con `Database` e la tabella e la funzione sono stringhe che nessun compilatore
controlla. Il verde non dice che esistano.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | `doorAuth`, un campo additivo sulla risposta | `ee0599b` | `src/app/api/tickets/attendance/route.ts` |
| 2 | La lista serate: un campo in piu' per riga | `8602bc0` | `src/app/api/tickets/attendance/route.ts` |
| — | una riga bianca (leggibilita') | `19e0411` | idem |

**Lingua:** commenti e identificatori in inglese, come il file che estendono.

---

## La misura che questo piano doveva, e che chiude la voce 5

`deferred-items.md` voce 5 era marcata **DA VERIFICARE — dedotta, non
osservata**: *«su un evento non pubblicato `validUntil` uscira' `null`»*. Il
piano 35-07 l'aveva letta nella policy; nessuno l'aveva misurata, e questa fase
aveva gia' visto **tre** deduzioni plausibili smentite dal container.

**Misurata**, in un `postgres:17.6` costruito con lo shim, lo schema iniziale e
tutte e 49 le migration, con una fixture propria (nessun seed): un account
`staff`/`approved` con **assegnazione viva `door.operate`** su due notti — una
di evento non pubblicato, una di evento pubblicato — e un `master` come
concedente.

| Domanda, come `authenticated` con il `sub` dell'assegnatario | Evento NON pubblicato | Evento pubblicato |
|---|---|---|
| `my_access_context(partyId) -> capabilities` | `["door.operate","membership.active","membership.card.view"]` | identico |
| `door.operate` conferita | **true** | **true** |
| righe visibili in `event_parties` | **0** | **1** |
| quindi `validUntil` sarebbe | **`null`** | `2026-08-11 06:00 +02` |

Controlli, perche' un numero senza controllo non e' una misura:

| Controllo | Esito |
|---|---|
| `master`/`approved` legge la party dell'evento **non pubblicato** | **1 riga** — e' `staff.manage` per ruolo, cioe' la policy si comporta come dichiarato |
| l'assegnatario legge `party_assignments` sotto RLS | **2 righe** — le proprie e solo le proprie (`party_assignments_select_own`) |

**Esito: la deduzione regge, e adesso e' un fatto.** Il verdetto e' `ok` su
entrambe le notti — l'assegnazione attraversa la pubblicazione — mentre la
*cortesia* `validUntil` si perde sull'evento non pubblicato, perche'
`event_parties_select_admin` chiede `staff.manage` e un assegnatario di una sola
notte non ce l'ha. La direzione e' quella sicura: nessuna scadenza dichiarata
significa che il dispositivo torna a chiedere al server.

Due cose che la misura ha aggiunto e che non erano nella deduzione:

1. **La capability list dell'assegnatario ha tre chiavi e nessuna e'
   `door.supervise`.** E' ASSIGN-05 **osservato**, non piu' solo scritto: chi e'
   assegnato alla porta non puo' annullare.
2. **`validUntil` sull'evento pubblicato cade il giorno DOPO la data della
   serata** (`06:00` del `2026-08-11` per una notte archiviata sotto il
   `2026-08-10`). La regola della mezzanotte di `party_end_instant` funziona
   attraverso `partyEndInstant`, e non e' stata riderivata da nessuna parte.

Il probe e' uno script usa-e-getta in `/tmp`, **non committato**: non e'
un controllo che il repo debba mantenere, ed e' il numero che conta, non il
file. I passi per rifarlo sono elencati sotto, in *Come rieseguire la misura*.

---

## Task 1 — `doorAuth`, e perche' non c'e' una quarta chiamata

| Cosa | Dove |
|---|---|
| `UUID_PATTERN` sul `partyId` in ingresso (T-35-47) | `:53` |
| `interface DoorAuthorisation`, i quattro campi | `:80` |
| `doorAuthorisation(auth)`, dal verdetto gia' risolto | `:118` |
| la **sola** risoluzione del `GET`, con la notte nominata | `:444` |
| `doorAuth` costruito, e la ragione per cui puo' essere assente | `:499-501` |

Il `partyId` **gia' validato** entra nella risoluzione che il file faceva
comunque. Il conteggio di `await requireDoorOperator(` resta **2**, uno per
handler.

**Il costo, dichiarato invece che nascosto.** La forma con `partyId` costa due
round trip lato server (la risoluzione, poi la fine notte per `validUntil`), la
forma senza ne costa uno — e la lettura della notte avviene **solo** se il
verdetto e' `ok`. Un rifiuto costa quanto prima, ed e' il ramo che una scansione
in coda ritenta.

**`validUntil` e' una cortesia, e il commento lo dice a lettere piene:** decide
**cosa si disegna**, mai **cosa e' permesso**, e non e' mai un motivo per
cancellare qualcosa dalla coda. Il confine e' `now() < pa.ends_at`, dentro il
resolver, sull'orologio del database. `resolvedAt` porta l'orologio del server
perche' il dispositivo possa **misurare la propria deriva invece di fidarsene** —
`membership/verify/route.ts:412`, *«a device clock is evidence, never
authority»*.

**Nessun dato personale nuovo.** Il payload non guadagna nessun campo di
persona; il confine del roster resta quello gia' attraversato e accettato.

---

## Task 2 — l'insieme d'ammissione, e la sola cosa che non puo' fare

| Cosa | Dove |
|---|---|
| il paragrafo che dichiara il criterio, e cosa **non** e' stato fatto | `:130-169` |
| `liveDoorAssignments()`, client legato ai cookie | `:206` |
| `[attendance.assignments_lookup_failed]`, solo `error.code` | `:221` |
| `reachedByAssignment` sul tipo di riga | `:398` |
| il ramo che chiede la seconda domanda solo dove ha senso | `:455-488` |
| il 503 che **non** e' una lista vuota | `:472-479` |
| l'unico punto in cui la lista si restringe | `:560-562` |
| il campo, su ogni riga | `:837` |

La regola, come sta scritta nel file:

- chi tiene `door.operate` **per ruolo** vede **tutte** le serate della
  finestra, **esattamente come prima** — zero righe in meno per chiunque le
  avesse;
- chi **non** lo tiene per ruolo ma ha almeno un'assegnazione viva vede le
  serate a cui e' assegnato — un insieme oggi **vuoto**, perche' senza ruolo la
  403 arrivava prima di questa riga. Il cambiamento **aggiunge righe a chi non
  ne aveva**.

**La seconda domanda si fa solo dove ha senso farla.** Su una richiesta che
**nomina** una notte, la guardia ha gia' unito ruolo e assegnazione: un rifiuto
li' e' un rifiuto vero, e si risponde come sempre. Solo la lista — che non nomina
nessuna notte, e per cui la guardia ha quindi risposto sul solo ruolo — ha
qualcosa da chiedere ancora. E lo chiede **solo** sul ramo che oggi risponde 403
senza niente: chi ha il ruolo non paga un round trip in piu'.

**Il caso enumerato per nome.** Se la lettura delle assegnazioni fallisce, la
risposta **non** e' una lista vuota e **non** e' un 403: e'
`[attendance.assignments_lookup_failed]` con il solo `error.code`, e un **503**
che porta `DOOR_UNRESOLVED_STATUS` — il bucket **retry** di
`sync-manager.ts:141`, non il bucket *blocked* che un nuovo login non
sbloccherebbe. Uno stato d'errore travestito da stato vuoto e' il precedente
CR-02, e il form newsletter di `CONCERNS.md` e' lo stesso difetto una superficie
piu' in la'.

**Perche' il client legato ai cookie e non quello service.**
`party_assignments_select_own` e' `USING (user_id = (select auth.uid()))`: la
query risponde per il chiamante e non ha modo di nominare nessun altro. Il
service client bypasserebbe la policy e restituirebbe le assegnazioni di tutti.
Misurato nel container: **2 righe su 2**, le proprie.

**`reachedByAssignment` e' `boolean | null`, e il `null` e' una decisione.** Sul
ramo per-notte la guardia risolve ruolo e assegnazione come **una** unione e non
li distingue; chiederlo di nuovo sarebbe il round trip che tutto questo piano
esiste per evitare, e un `false` inventato sarebbe un'affermazione che nessuno ha
misurato. Il campo e' **presente su ogni riga** invece di essere omesso dove non
si sa, seguendo la regola che `refundedAt` fissa gia' in questo file: *«il
dispositivo non deve mai distinguere assente da falso»*.

---

## Deviazioni dal piano

### 1. [Rule 1 — bug preesistente sullo stesso percorso] L'errore di `event_parties` era scartato, e la risposta era una lista vuota a 200

- **Trovata durante:** task 2, scrivendo il criterio *«nessun ramo restituisce
  una lista vuota come conseguenza di un errore di lettura»* — che e' un
  criterio di accettazione del piano, non un'aggiunta.
- **Il fatto:** la destrutturazione era `const { data: parties } = await
  partiesQuery;`. Un errore di PostgREST — inclusa la `22P02` che un `partyId`
  non-uuid produceva prima della validazione di questo piano — lasciava
  `parties` a `null`, e l'handler cadeva su `{ events: [] }` con **200**. Un
  fallimento di lettura vestito da *«nessuna serata stanotte»*.
- **Cosa e' stato fatto:** l'errore e' letto, ha la sua categoria
  (`[attendance.parties_lookup_failed]`, solo `error.code`) e un **500** con
  `source: "event_parties"`. Nessuna riga del payload cambia.
- **Commit:** `8602bc0`

### 2. [Rule 1 — bug preesistente, e la sua direzione e' quella insicura] La finestra apriva a `today` in UTC, cioe' alle 02:00 di Torino

- **Trovata durante:** task 2, verificando che la verita' *«la lista non e' mai
  vuota per chi ha un'assegnazione viva»* reggesse a ogni ora della notte.
- **Il fatto:** `today = new Date().toISOString().split("T")[0]` e' la data
  **UTC**. Una notte e' archiviata sotto la data in cui **inizia** e finisce
  alle 06:00 del mattino dopo. Dalle **00:00 UTC** — le **02:00 a Torino**
  d'estate — la serata **in corso** ha `date` strettamente minore di `today`, e
  `gte("date", today)` la buttava fuori. Un dispositivo che ricarica alle 02:30
  (un crash, una batteria, un secondo telefono che arriva tardi) trovava la
  lista **vuota** nelle quattro ore in cui la porta lavora di piu'.
- **Perche' e' stato corretto qui e non differito:** e' esattamente il rifiuto
  che il piano mi chiede di rendere impossibile, sullo stesso ramo che stavo
  scrivendo, e la correzione e' **additiva** — la mitigazione dichiarata di
  T-35-49 (*«l'insieme d'ammissione e' solo additivo»*). Lasciarlo avrebbe reso
  falsa una delle tre verita' del piano a partire dalle due di notte.
- **Cosa e' stato fatto:** la finestra apre **un giorno prima**
  (`windowStart`). Aggiunge righe, non ne toglie a nessuno.
- **Commit:** `8602bc0`

### 3. [Rule 3 — un controllo del piano che si sarebbe letto aggirandolo] il conteggio di `await requireDoorOperator(`

- **Trovata durante:** task 1, eseguendo il controllo del piano.
- **Il fatto:** avevo scritto nel commento la frase *«una seconda
  `await requireDoorOperator(` sarebbe un secondo round trip»*. Il `grep -c`
  conta **righe**, non chiamate: il conteggio andava a **3** con due sole
  chiamate. E' la stessa forma del difetto che 35-07 ha registrato sul `catch`.
- **Cosa e' stato fatto:** il commento e' stato **riscritto senza il literal**,
  invece di abbassare il controllo — e dice perche', cosi' il prossimo lettore
  non lo reintroduce. Il conteggio e' **2**, uno per handler, prima e dopo.
- **Commit:** `ee0599b`

Nessun'altra deviazione. **Nessun gate di autenticazione incontrato.**

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck | `npm run build` | **PASS** — `✓ Compiled successfully`, `Running TypeScript` senza errori |
| Lint | `npx eslint src/app/api/tickets/attendance/route.ts` | **PASS** — nessun output |
| Una sola risoluzione per handler | `grep -c 'await requireDoorOperator(' …/attendance/route.ts` | **PASS** — **2** |
| Il campo c'e' | `grep -q "doorAuth"`, `grep -q "resolvedAt"` | **PASS** |
| La categoria di log c'e' | `grep -n "attendance.assignments_lookup_failed"` | **PASS** — `:221` |
| Nessun `error.details` | `grep -c "error.details"` | **PASS** — **0** |
| Nessun campo del payload rimosso | `git diff \| grep '^-'` su entrambi i commit | **PASS** — le sole righe rimosse sono righe di controllo di flusso, nessuna definizione di campo |
| Nessuna cancellazione di file | `git diff --diff-filter=D` su ogni commit | **PASS** — vuoto |
| La voce 5, misurata | container `postgres:17.6`, 49 migration, fixture propria | **PASS** — tabella sopra |

### Cosa queste verifiche NON provano

- **`npm run build` verde non dice niente su `party_assignments`.** Il client
  non e' parametrizzato con `Database`: il nome della tabella, quello delle
  colonne e quello della capability sono stringhe non controllate. L'unica meta'
  verificata e' che il modulo compili.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.**
  `package.json` non ha uno script `test` e non c'e' nessun `*.test.*`.
- **Il conteggio delle chiamate di rete non e' stato misurato.** Nulla in questo
  repository puo' misurarlo: serve un browser, un pannello di rete e una
  persona. La procedura e' scritta sotto, ed e' l'unica prova che esistera'.
- **Il percorso dell'assegnatario non e' esercitabile end-to-end oggi**, e non
  per un difetto di questo piano: vedi *Il limite che sta fuori da questo file*.
- **La misura in container non e' la produzione.** E' la stessa versione di
  Postgres e le stesse migration, ma le migration di questa fase in produzione
  **non sono applicate**.

---

## La procedura manuale — il conteggio, che e' l'unica prova di ASSIGN-08

Da eseguire **dopo** l'applicazione delle righe 7+ di `35-HUMAN-UAT.md` e dopo
un deploy. Serve un browser desktop con il pannello di rete; il telefono non
mostra i conteggi.

**A. Il verdetto arriva all'apertura, senza chiamate in piu'**

1. Accedere con un account **organizer**. Aprire il pannello di rete
   (`Cmd+Option+I` → *Network*), filtrare su **Fetch/XHR**, spuntare *Preserve
   log*, poi **svuotare** il pannello.
2. Andare su `/admin/scanner`. Attese **due** richieste, non tre:
   `GET /api/tickets/attendance` e `GET /api/membership/list`.
3. Selezionare una serata. Attesa **una sola** richiesta:
   `GET /api/tickets/attendance?partyId=…`.
4. Aprire la sua risposta. Deve contenere una chiave `doorAuth` con
   **esattamente** quattro campi: `mayScan: true`, `maySupervise`, `validUntil`,
   `resolvedAt`. Con un organizer, `maySupervise` deve essere **`true`**.
5. Confrontare `resolvedAt` con l'ora reale: devono coincidere entro pochi
   secondi. Se divergono di un'ora esatta, il problema e' un fuso, non un
   orologio.
6. **Svuotare di nuovo il pannello** e scansionare **cinque** biglietti.
   Contare, alla fine:
   - `POST /api/tickets/checkin` → **esattamente 5**;
   - richieste il cui unico scopo sia autorizzare → **zero**. Non ce ne possono
     essere: **non esiste un endpoint di autorizzazione**, e il verdetto viaggia
     dentro una risposta che lo scanner chiede comunque.
   - `GET /api/tickets/attendance?partyId=…` ne comparira' fino a cinque: e' il
     **refresh del roster dopo uno scan riuscito**, che esiste da prima di
     questo piano (`ScannerClient.tsx:685`). Va contato e **dichiarato**, non
     nascosto: e' una chiamata di *roster*, che da oggi porta anche il verdetto.
     Ridurla e' materia del dispositivo, piano 35-13.

**B. `validUntil` e la sua assenza — la voce 5, ricontrollata in produzione**

7. Con lo stesso organizer, su una serata di un evento **pubblicato** che
   dichiara un `end_time`: `validUntil` valorizzato, e deve cadere al **mattino
   dopo** se la notte chiude alle 06:00.
8. Su una serata **senza** `end_time`: `validUntil` **`null`**. Non deve
   comparire nessuna scadenza inventata.
9. Con un account **staff assegnato a quella notte** e senza `staff.manage`, su
   una serata di un evento **non pubblicato**: `mayScan: true`, `maySupervise:
   false`, e `validUntil` **`null`**. E' la voce 5, gia' misurata in container;
   questo passo la conferma sulla produzione.

**C. La lista non si restringe per nessuno**

10. Con l'organizer, contare le serate nel selettore **prima** e **dopo** il
    deploy. Il numero **non deve calare**. Puo' salire di una: la serata di ieri
    rientra nella finestra (deviazione 2).
11. Con un account **staff assegnato a una sola notte**, chiamare
    `GET /api/tickets/attendance` direttamente: la risposta deve essere **200**
    con **almeno una** serata, ognuna con `reachedByAssignment: true`, e
    **senza** `doorAuth` (non c'e' un verdetto unico da dare). Se torna **403**,
    l'account non ha un'assegnazione viva — verificarlo prima di dare la colpa
    alla route.
12. Con un account **senza ruolo e senza assegnazione**: **403**, con lo stesso
    corpo di sempre. Nessuno che era rifiutato ieri e' rifiutato in modo diverso
    oggi.
13. Revocare l'assegnazione e ripetere il passo 11: **403**.

**D. L'errore non si traveste da lista vuota**

14. Con un account **staff assegnato**, rendere temporaneamente illeggibile
    `party_assignments` (in un ambiente di prova, revocando il `SELECT` al ruolo
    `authenticated`): la risposta deve essere **503** con
    `status: "capability_unresolved"` e `source: "party_assignments"`, **mai**
    `{ "events": [] }` a 200.

**E. Se qualcosa non torna**

15. Un `503` con `capability_unresolved` su **ogni** chiamata significa quasi
    sempre che una migration della coda non e' applicata: la funzione o la
    tabella non esistono. Non e' un rifiuto, e non si corregge cambiando
    account.

### Come rieseguire la misura della voce 5

Serve Docker in esecuzione. Il probe non e' nel repo — si ricostruisce in venti
righe importando `withContainer` da `scripts/rls-baseline-container.mjs` con
`{ seed: false }`, e seminando: un `master`/`approved` e uno `staff`/`approved`
(con il trigger `on_auth_user_created` disabilitato durante l'inserimento), un
evento `is_published = false` e uno `true`, una `event_parties` per ciascuno con
`end_time = '06:00'`, e una riga di `party_assignments` per notte con
`capability = 'door.operate'`, `assignee_role = 'staff'` e
`ends_at = public.party_end_instant(ep.date, coalesce(ep.end_time,'06:00'))`.
Poi, dentro una transazione, `set_config('request.jwt.claims', …, true)` seguito
da `set local role authenticated`, e si chiedono le due domande della tabella.
Due trappole gia' pagate: `public.events` **non** ha piu' la colonna `time` e
`public.event_parties` **non** ha piu' `type` — entrambe cadute con
`20260225150000` e `20260226300000`.

---

## Il limite che sta fuori da questo file, e che va detto

**Chi ha solo un'assegnazione oggi non arriva a questa route.**
`src/lib/supabase/middleware.ts:178-182` protegge `/admin/scanner` con
`door.operate` **per ruolo**: `supabase.rpc("my_access_context")` viene chiamata
senza notte, il braccio per-notte del resolver e' muto per costruzione (ASSIGN-01,
`p_party_id is not null` e' la prima condizione), e l'assegnatario viene
reindirizzato prima di poter caricare la lista che questo piano gli costruisce.

Non e' un difetto introdotto qui e non e' un difetto del middleware: **al momento
del routing la notte non e' ancora stata scelta**, quindi la domanda per-notte
non e' nemmeno formulabile. La domanda grossolana che il middleware *puo'* fare —
*«questa persona ha una qualche assegnazione viva?»* — e' il piano **35-15**, che
gira nella stessa onda su un worktree separato, e il cablaggio e' **35-17**.

**Conseguenza operativa, dichiarata invece che lasciata scoprire:** fino a quei
due piani, il ramo additivo della lista e' **corretto e non raggiungibile
dall'interfaccia**. E' verificabile chiamando la route direttamente (passo 11
della procedura), che e' esattamente cio' che il passo chiede di fare.

Un secondo limite, **rinnovato da 35-07 e ancora aperto**: lo scanner mappa lo
status HTTP a un titolo prima di leggere il body
(`ScannerClient.tsx:81-87`), quindi il 503 di questo piano mostrera' il titolo
*«The scan was not written to the record»*, che non e' cio' che e' successo. La
riga di dettaglio dice il vero. Chiuderlo e' il piano **35-13**.

---

## Threat Flags

Il threat register del piano, con come e' coperto:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-47 | mitigato | `UUID_PATTERN` (`:53`) sul `partyId` **prima** della risoluzione e prima di PostgREST, con un 400 proprio. Stesso literal di `checkin/undo/route.ts:23-24`, copiato e non reinventato |
| T-35-48 | accettato | Il payload non guadagna **nessun** campo di dato personale. I tre campi nuovi sono un verdetto (`doorAuth`), un booleano di provenienza (`reachedByAssignment`) e nient'altro. Il confine del roster non e' stato allargato |
| T-35-49 | mitigato | L'insieme d'ammissione e' **solo additivo** — e lo e' due volte, contando la finestra riparata nella deviazione 2. Un errore di lettura ha il suo esito (503, `capability_unresolved`, `source`) e la sua categoria, distinti dallo stato vuoto |
| T-35-50 | mitigato | `grep -c 'await requireDoorOperator('` = **2**, uno per handler, asserito meccanicamente e con il commento che spiega perche' il literal non e' ripetuto in prosa |
| T-35-51 | mitigato | Nessun campo rinominato, rimosso o cambiato di tipo — asserito sul diff di entrambi i commit. Un dispositivo con il bundle precedente riceve una risposta che contiene tutto cio' che leggeva, piu' chiavi che ignora |
| T-35-SC | non applicabile | Nessun pacchetto installato o modificato. `npm ci` e' stato eseguito nel worktree perche' non aveva `node_modules`; `package.json` e `package-lock.json` non sono stati toccati |

**Una superficie nuova, dichiarata.** Questa route ora legge
`public.party_assignments`. E' una lettura **sotto RLS** con il client legato ai
cookie, su una policy che risponde solo per il chiamante, e la sua unica uscita
verso il dispositivo e' un insieme di `party_id` gia' presenti nella lista
serate: **non esce nessun identificativo di persona, nessuna data di concessione
e nessun concedente**.

**Osservabilita', come segnalazione e non come difetto introdotto qui.** Questo
piano aggiunge **due** categorie di log — `[attendance.assignments_lookup_failed]`
e `[attendance.parties_lookup_failed]` — in un prodotto **senza error tracking**,
dove un log non raggiunge nessuno. Entrambe pero' hanno un **effetto
osservabile**: la prima produce un 503 che lo staff vede sul telefono e che la
coda ritenta, la seconda un 500 al posto di una lista vuota silenziosa. E' il
requisito di `meta-gates.md` — *un fallimento che conta ha bisogno di un effetto
osservabile, non di una riga di log* — e qui e' soddisfatto, invece di essere
evocato.

---

## Known Stubs

Nessuno stub di codice. Nessun valore vuoto cablato, nessun `TODO`, nessun
segnaposto.

Tre dipendenze in avanti, dichiarate qui e nel file:

1. **`doorAuth` non ha ancora un consumatore sul dispositivo.** Lo scanner non
   lo legge: cachearlo per la notte e usarlo per disegnare (compreso il tasto di
   annullamento, ASSIGN-05) e' il piano **35-13**.
2. **`reachedByAssignment` non e' ancora disegnato.** Serve all'interfaccia per
   non offrire una serata che poi rifiuta; chi lo mostra e' **35-13**.
3. **Il ramo additivo della lista non e' raggiungibile dall'interfaccia** finche'
   il middleware non impara la domanda grossolana — **35-15** e **35-17**. Vedi
   la sezione sopra.

### Perche' `deferred-items.md` non e' stato toccato

La voce 5 e' **misurata e chiusa**, e la sua chiusura e' scritta qui invece che
li'. Due ragioni: `35-09`, `35-11`, `35-12`, `35-15` e `35-18` girano in
parallelo su worktree separati e `ai-engineering.md`, gate *multi-agent*, dice di
**sequenziare** due agenti sullo stesso file; e il contratto di questo worktree
vieta esplicitamente di modificare `deferred-items.md`.

**Cosa deve fare l'orchestratore:** marcare la voce 5 come **CHIUSA il
2026-08-09 dal piano 35-10**, con la tabella della misura, e — se vale la pena
imparare la lezione che la voce 1 ha gia' registrato — ricordare che una voce
affidata a un documento presuppone che qualcuno lo apra: qui il veicolo e' stato
di nuovo il **prompt**, non il file.

`.planning/STATE.md` e `.planning/ROADMAP.md` non sono stati modificati, come da
contratto worktree.

---

## Self-Check: PASSED

- `src/app/api/tickets/attendance/route.ts` — FOUND, e contiene
  `UUID_PATTERN` (`:53`), `interface DoorAuthorisation` (`:80`),
  `doorAuthorisation` (`:118`), `liveDoorAssignments` (`:206`),
  `[attendance.assignments_lookup_failed]` (`:221`), `reachedByAssignment`
  (`:398`, `:570`, `:837`), `windowStart` (`:520`),
  `[attendance.parties_lookup_failed]` (`:546`)
- commit `ee0599b` — FOUND
- commit `8602bc0` — FOUND
- commit `19e0411` — FOUND
- `grep -c 'await requireDoorOperator('` = **2**
- `grep -c 'error.details'` = **0**
- `.planning/STATE.md`, `.planning/ROADMAP.md`,
  `.planning/phases/35-per-night-assignments/deferred-items.md` — **NON
  MODIFICATI**
- nessuna cancellazione di file in nessuno dei tre commit
  (`git diff --diff-filter=D` vuoto su tutti)
