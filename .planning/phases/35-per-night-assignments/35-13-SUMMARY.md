---
phase: 35-per-night-assignments
plan: 13
subsystem: checkin-offline
tags: [door, offline, indexeddb, undo, supervision, assign-08, assign-05, assign-02, wave-6]

# Dependency graph
requires:
  - plan: 35-10
    provides: "`doorAuth` sulla risposta di `/api/tickets/attendance` — codice in repo, migration NON applicate"
  - plan: 35-11
    provides: "il gate `maySupervise` sulla route di undo, e `DOOR_SUPERVISION_REQUIRED` che ne esce nel corpo"
  - plan: 35-12
    provides: "`LocallyUndoneMarker` / `isLocallyUndone` — il contratto della voce annullata, scritto dal lato del consumatore"
  - plan: 35-07
    provides: "`DOOR_UNRESOLVED_STATUS` e la disciplina del quarto esito — in produzione"
provides:
  - "`DB_VERSION` 5, con uno step che non tocca la coda"
  - "il verdetto della porta PER NOTTE nello store `meta`, con `cacheDoorAuth` / `readDoorAuth`"
  - "`markUndoneLocally` — la voce di coda si marca invece di sparire, e il risultato distingue «trattenuta qui» da «il server ce l'ha gia'»"
  - "lo stato di coda `undone`, escluso dal drain PER COSTRUZIONE e contato sullo schermo"
  - "il gate di supervisione sul dispositivo, con tre esiti e nessuno silenzioso"
  - "`DOOR_SUPERVISION_REQUIRED` / `_ERROR` leggibili da un client component"
affects: [35-14, 35-19, 35-20]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "un verdetto risolto una volta vive in `meta` con una chiave PER NOTTE: una chiave sola farebbe decidere alla notte di ieri la notte di oggi"
    - "`null` non e' `false`: il tipo di ritorno della lettura obbliga il chiamante a decidere cosa significa una domanda senza risposta"
    - "l'asimmetria della porta si INVERTE sull'annullamento, e l'inversione si scrive accanto al ramo o qualcuno la corregge"
    - "uno stato di coda nuovo e' escluso dal drain per costruzione — entrambi i lettori filtrano per valore esatto — e va quindi CONTATO, o «escluso» diventa «invisibile»"
    - "una costante che deve raggiungere un telefono non puo' vivere in un modulo che importa `next/headers`: sta nel modulo che non importa niente"

key-files:
  created: []
  modified:
    - src/lib/offline/checkin-store.ts
    - src/app/(admin)/admin/scanner/ScannerClient.tsx
    - src/lib/door/outcome.ts
    - src/lib/door/require-operator.ts

key-decisions:
  - "Una voce annullata offline NON viene drenata. `getPendingCheckins` filtra `state === \"pending\"` e `getBlockedCheckins` filtra `\"blocked\"`, quindi un terzo stato e' escluso da entrambi senza toccare `sync-manager.ts` — e senza il rischio che il drain riporti l'AMMISSIONE che la reversione annulla"
  - "Il terzo esito dell'undo offline RIFIUTA. L'asimmetria della porta si inverte: rifiutare un annullamento non manda indietro nessuno, ammetterne uno non autorizzato toglie una presenza dal record senza che nessuno lo veda"
  - "`validUntil` nasconde gli strumenti e porta una via di ritorno in un tap. Senza quella via sarebbe l'orologio del telefono a rifiutare un ingresso, che e' l'errore peggiore dei due"
  - "`DOOR_SUPERVISION_REQUIRED` e la sua frase si spostano in `outcome.ts` e `require-operator.ts` le ri-esporta: un client component non puo' importare la guardia, e ritrascrivere le stringhe sarebbe due vocabolari che concordano finche' non concordano"

# Metrics
metrics:
  duration: "~95 min"
  completed: 2026-08-09
  tasks_completed: 3
  tasks_total: 3
  checkpoint_open: false
---

# Fase 35 Piano 13: il dispositivo smette di essere la via d'uscita — Summary

Due cose, e la seconda era un buco aperto.

**ASSIGN-08.** Il verdetto della porta si risolve **una volta**, sulla richiesta
che lo scanner gia' fa quando si apre una notte, e da li' in poi si rilegge dalla
cache. Chiederlo a ogni scan sarebbe un round trip per persona, su un telefono,
su una rete debole, davanti a una fila.

**T-3.** `ScannerClient.tsx:869-892` eseguiva un annullamento **puramente locale**
con la radio spenta: cancellava la riga dalla coda, non scriveva nessun record,
**non chiedeva il permesso a nessuno**. Il gate che il piano 35-11 ha messo nella
route si aggirava spegnendo la radio. Il commento che spiegava perche' quel ramo
esiste aveva ragione — *«un undo che silenziosamente non fa niente e' peggio di
uno che rifiuta ad alta voce»* — quindi il ramo resta e adesso **decide dalla
cache**, con tre esiti.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | `DB_VERSION` 5 — il verdetto per notte, e la coda che non si tocca | `46fb577` | `checkin-store.ts` |
| 2 | ASSIGN-08 — risolto una volta all'apertura, riletto dopo | `ba9fcf6` | `ScannerClient.tsx`, `outcome.ts`, `require-operator.ts` |
| 3 | T-3 — l'annullamento offline smette di aggirare la supervisione | `5f65663` | `ScannerClient.tsx` |

**Lingua:** commenti e identificatori in inglese, come i quattro file estesi.

---

## Dove sta ogni cosa

### `src/lib/offline/checkin-store.ts`

| Cosa | Riga |
|---|---|
| `DB_VERSION = 5` | `:57` |
| `DOOR_AUTH_KEY_PREFIX`, **una chiave per notte** | `:85` |
| `CachedDoorAuth` — i quattro campi, portati com'erano | `:131` |
| `state: "pending" \| "blocked" \| "undone"` | `:207` |
| `undoneLocally` / `undoneAt` / `undoneBy` — la forma di `LocallyUndoneMarker` | `:227` |
| **lo step `oldVersion < 5`** | `:545` |
| `LocalUndoResult`, due fatti e non un booleano | `:992` |
| `markUndoneLocally` — marca, non cancella | `:1034` |
| `getUndoneLocallyCount` | `:1076` |
| `cacheDoorAuth` — una sola transazione `readwrite` | `:1361` |
| `readDoorAuth` — `CachedDoorAuth \| null` | `:1393` |

Lo step v5 **non crea, non distrugge e non riscrive nulla**: tutto cio' che la
versione 5 aggiunge e' o una chiave nuova in uno store che esiste gia', o campi
**opzionali** su record in uno store che esiste gia'. Il commento accanto dichiara
anche un vincolo su se stesso: nomina la coda a parole e mai con il suo
identificatore, perche' l'asserzione dello step e' un grep sul corpo del blocco.
E' il terzo caso registrato in questo repository di un controllo rotto dalla prosa
che lo spiega (35-07 su un `catch`, 35-11 su un call site) — e la regola uscita
da entrambi vale qui: **si riscrive la prosa, non si indebolisce il controllo.**

### `src/app/(admin)/admin/scanner/ScannerClient.tsx`

| Cosa | Riga |
|---|---|
| `serverFaultMessage(status, body)` — il corpo e' un parametro adesso | `:121` |
| `readDoorAuthPayload` — campo per campo, mai un cast | `:323` |
| lo stato `doorAuth`, con scritto sopra l'anti-pattern vietato | `:454` |
| `clockDriftMs` — misurato per essere mostrato | `:460` |
| il verdetto **azzerato a ogni cambio di notte**, poi riletto dalla cache | `:607` |
| **l'unico momento in cui il verdetto viene chiesto** | `:724` |
| la scrittura in cache, per la prossima apertura con la radio spenta | `:752` |
| esito 3 — verdetto non risolto | `:1107` |
| esito 2 — rifiuto di supervisione, ad alta voce | `:1122` |
| esito 1 — permesso, e la voce si **marca** | `:1148` |
| `nightIsOver` | `:2076` |
| il contatore delle reversioni trattenute | `:2261` |

### `src/lib/door/outcome.ts` e `require-operator.ts`

`DOOR_SUPERVISION_REQUIRED` (`outcome.ts:223`) e
`DOOR_SUPERVISION_REQUIRED_ERROR` (`:233`) vivono adesso nel modulo che **non
importa niente**, e `require-operator.ts:216` li ri-esporta: nessuno dei cinque
chiamanti esistenti ha cambiato una riga di import.

---

## Le tre decisioni che vanno lette, non scorse

### 1. Perche' una voce annullata NON viene drenata

Il contratto del piano 35-12 dice che il drain, su una voce marcata, «riporta la
**reversione** invece dell'ammissione» a `/api/tickets/checkin/undo`. **Applicato
alla lettera produce un difetto**, e l'ho misurato leggendo la route invece di
dedurlo:

- Una voce sta in coda **perche' l'ammissione non e' ancora stata riportata.**
- `undo/route.ts:347-352` risponde **400 «Ticket is not checked in»** quando il
  soggetto non risulta entrato. Quindi mandare solo la reversione di
  un'ammissione che il server non ha mai visto finisce `dead` /
  `unexpected_response` — un contatore rosso che dice una cosa falsa.
- Il ramo `membership` non e' nemmeno esprimibile: l'undo vuole un
  `attendanceId`, cioe' un id **server-side** che un dispositivo offline non ha
  e non puo' avere (`undo/route.ts:532-537`); la coda tiene il codice di
  membership.
- E lasciare la voce nella coda **senza** deviarla e' la peggiore delle tre:
  `targetFor` la manderebbe a `/api/tickets/checkin` come **ammissione**, cioe'
  il drain rimetterebbe dentro la persona appena tolta, e `markSynced`
  cancellerebbe la voce. Strettamente peggio di oggi.

La sola forma fedele e' **due richieste per una voce** — prima l'ammissione, poi
la reversione — con la sua scala di fallimenti parziali, dentro
`sync-manager.ts`, che non e' nel perimetro di questo piano. **Non l'ho scritta**:
e' una modifica al modello di richiesta del drain su un percorso di presenze, in
un repository senza test runner, e sarebbe stata una decisione architetturale
presa di straforo.

Quello che questo piano fa invece, per intero e dentro il proprio perimetro:

- la voce si **marca** e resta, con `undoneAt` e `undoneBy` — chi e quando
  sopravvivono sul dispositivo;
- lo stato `undone` e' **escluso dal drain per costruzione**: entrambi i lettori
  filtrano per valore esatto (`checkin-store.ts:getPendingCheckins` prende
  `"pending"`, `getBlockedCheckins` prende `"blocked"`), quindi non c'e' nessun
  controllo che qualcuno possa dimenticare di scrivere, e **nessuna possibilita'
  che il drain riporti l'ammissione**;
- il numero e' **contato e disegnato** (`:2261`): *«Undone at the door, held on
  this device (N)»*. Escluso non significa invisibile.

**Cosa resta aperto, senza attenuazioni:** una reversione presa con la radio
spenta **non raggiunge il server**. Il record della serata non la contiene. La
mitigazione di T-35-63 e' quindi **parziale** — vedi § *Threat Flags* e § *Cross-plan*.

### 2. Perche' il terzo esito rifiuta

L'asimmetria della porta dice che rifiutare un ospite valido e' peggio che
ammetterne uno doppio, perche' il primo errore avviene davanti a una fila.
**Sull'annullamento si inverte**, ed e' scritto accanto al ramo (`:1090-1105`)
perche' contraddice la regola generale e qualcuno la correggerebbe:

- rifiutare un annullamento **non manda indietro nessuno**. Lascia una persona
  registrata come entrata, che e' la direzione **recuperabile** — la corregge
  chiunque abbia segnale;
- ammetterne uno non autorizzato **toglie una presenza dal record senza che
  nessuno lo veda**, ed e' *«il percorso piu' semplice per far rientrare
  qualcuno»*.

Il terzo esito non e' collassato nel secondo, sul precedente di
`DOOR_UNRESOLVED_STATUS`: la frase **non dice niente sui permessi**, dice che la
domanda non ha avuto risposta e cosa fare. `readDoorAuth` restituisce
`CachedDoorAuth | null` proprio perche' un chiamante non possa leggere
`maySupervise` da un `null` per distrazione.

### 3. Perche' «la notte e' finita» ha un bottone

`validUntil` decide **cosa si disegna** e nient'altro. Nasconde il bottone di
scansione e mostra una riga. Ma nasconderlo e basta sarebbe **l'orologio del
telefono che rifiuta un ingresso**: un dispositivo avanti di venti minuti
costerebbe un'ammissione davanti a una fila. Quindi la riga porta *«Scan anyway»*,
che riapre gli strumenti per la sessione in un tap. E' una cortesia
dell'interfaccia, il confine e' `now() < pa.ends_at` sull'orologio del server
dentro il resolver SQL.

**Non cancella niente**, mai — e la riga lo dice sullo schermo: *«Nothing has
been removed»*. Quando `validUntil` e' `null` non si inventa nessuna scadenza e
**non parte nemmeno l'intervallo** che guarda l'ora.

`resolvedAt` serve a **misurare la deriva** dell'orologio e la deriva si
**mostra** (`:2140`, oltre i 5 minuti). Nessun ramo la usa per decidere.

---

## Deviazioni dal piano

### 1. [Rule 3 — bloccante] Un client component non puo' importare la guardia

- **Trovata durante:** task 2, scrivendo l'import delle due costanti.
- **Il fatto:** `require-operator.ts:1-8` importa `@/lib/supabase/server`, che
  legge `next/headers`. `ScannerClient.tsx` e' `"use client"`. L'import non e'
  possibile, e il piano ne aveva bisogno su entrambe le meta' del task 3: il
  **valore** per distinguere un `403` di supervisione da uno generico, la
  **frase** perche' con la radio spenta non c'e' nessun server che la mandi.
- **Cosa e' stato fatto:** le due costanti sono state spostate in
  `src/lib/door/outcome.ts` — il modulo che *«e' la sorgente. Non importa
  niente»* — e `require-operator.ts` le **ri-esporta**, quindi nessuno dei cinque
  chiamanti cambia una riga. L'alternativa, ritrascriverle nel client, e'
  esattamente il difetto che `outcome.ts` esiste per prevenire e che il suo
  docblock descrive: due vocabolari, ognuno coerente al proprio interno, che
  concordano finche' non concordano.
- **File fuori da `files_modified`:** `outcome.ts` e `require-operator.ts`.
  Nessuno dei due e' nei `files_modified` di 35-16, 35-17 o 35-22, gli altri
  piani di quest'onda — verificato leggendoli.
- **Commit:** `ba9fcf6`

### 2. [Rule 2 — funzionalita' critica mancante] `reversalHeld`, perche' «annullato» e «annullato qui» non sono la stessa frase

- **Trovata durante:** task 3, scrivendo il ramo permesso.
- **Il fatto:** una voce di coda esiste **solo** se l'ammissione non e' stata
  riportata. Quando non c'e' — l'ammissione e' gia' sul server — il codice
  precedente cancellava nulla e diceva comunque *«Undone on this device»*. Il
  server continua a dire che la persona e' entrata e **niente su questo
  dispositivo dira' mai il contrario**. E' il fallimento silenzioso che
  `meta-gates.md` vieta, con una faccia verde.
- **Cosa e' stato fatto:** `markUndoneLocally` restituisce `LocalUndoResult`
  (`checkin-store.ts:992`) con due fatti distinti, e il flash dice quello vero:
  *«held here, not yet reported»* oppure *«the server already has the entry, undo
  it again with signal»*.
- **Commit:** `46fb577` (lo store), `5f65663` (la frase)

### 3. [Rule 1 — difetto trovato nel codice appena scritto] Il verdetto della notte precedente

- **Trovata durante:** task 2, rileggendo l'effetto di lettura dalla cache.
- **Il fatto:** la prima stesura faceva `setDoorAuth((current) => current ?? cached)`
  senza azzerare prima. Al cambio di notte lo stato conserva il verdetto della
  notte precedente, quindi `current` non e' mai `null` e **il verdetto di ieri
  decide la notte di oggi**. E' la stessa classe di difetto che
  `bindNightToSubject` chiude sul server (`undo/route.ts:148`) — un'autorizzazione
  per una notte che agisce su un'altra — con l'aggravante che qui lo schermo e'
  identico nei due casi.
- **Cosa e' stato fatto:** `setDoorAuth(null)` come **prima** riga dell'effetto,
  su ogni cambio di `selectedPartyId`, con il commento che dice perche' e' li'.
  Il `??` resta e serve all'altro caso: una lettura IndexedDB lenta non deve
  sovrascrivere un verdetto fresco gia' arrivato dalla rete.
- **Commit:** `ba9fcf6`

### 4. [Rule 3 — bloccante, di forma] Il commento dello step v5 rompeva il grep dello step v5

- **Trovata durante:** task 1, eseguendo la verifica automatica del piano.
- **Il fatto:** il criterio pretende che il corpo del blocco `oldVersion < 5`
  **non nomini** `pendingCheckins`. Il paragrafo che spiega la proprieta' lo
  nominava alla lettera, e il controllo dava `1`.
- **Cosa e' stato fatto:** riscritta la **prosa** — «the queue store» — e
  aggiunto un paragrafo che **dichiara il vincolo sul commento** e nomina i due
  precedenti, cosi' che il prossimo che vuole «sistemare» il wording incontri
  prima la ragione. Il controllo resta quello vero.
- **Commit:** `46fb577`

Nessun'altra deviazione. **Nessun gate di autenticazione incontrato.**

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck e build, dopo ogni task | `npm run build` | **PASS** — `✓ Compiled successfully`, exit 0, tre volte |
| Typecheck isolato, dopo ogni edit | `npx tsc --noEmit -p tsconfig.json` | **PASS** — nessun output |
| `DB_VERSION` 5 e lo step | `grep -q "DB_VERSION = 5"`, `grep -q "oldVersion < 5"` | **PASS** |
| Lo step non nomina la coda | `sed -n '/oldVersion < 5/,/^      }/p' \| grep -q pendingCheckins` | **PASS** — nessuna occorrenza (era `1`, § deviazione 4) |
| Il blocco `oldVersion < 4` invariato | `git diff -U0 \| grep "oldVersion < 4"` | **PASS** — nessuna riga nel diff |
| ASSIGN-08 presente | `grep -q doorAuth && grep -q validUntil` | **PASS** |
| **Nessuna fetch nuova** | `grep -n "fetch(" ScannerClient.tsx` | **PASS** — **7 call site, gli stessi 7 di prima del piano**. Nessuna chiamata d'autorizzazione in nessun percorso di scansione |
| Il ramo offline non cancella piu' | `grep -n "undoCheckInLocally\|markUndoneLocally"` | **PASS** — `undoCheckInLocally` compare **solo in un commento**; l'unica chiamata e' `markUndoneLocally` (`:1148`) |
| Tre esiti, nessuno silenzioso | `sed -n '/const handleUndoCheckIn/,/^  );$/p' \| grep -c showFlash` | **PASS** — `9` (≥ 3), e ognuno dei tre rami ne ha uno |
| Il gate legge il verdetto | `grep -n maySupervise` | **PASS** — `:1122`, dalla cache |
| Il `403` di supervisione e' distinto | lettura, `:121-136` | **PASS** — il ramo `403` confronta `body.status` con `DOOR_SUPERVISION_REQUIRED`; un `403` **senza** quel valore tiene la frase di sempre |
| Lint sui file toccati | `npx eslint` sui quattro file | **PASS** — 0 errori. **Due warning pre-esistenti** in `ScannerClient.tsx` (`UUID_PATTERN` non usato, deps di un `useEffect`), gli stessi due che `35-12-SUMMARY.md` ha registrato sul commit di base, **non toccati** |
| Nessuna cancellazione di file | `git diff --diff-filter=D` su ogni commit | **PASS** — vuoto su tutti e tre |
| Nessun file non tracciato | `git status --short` | **PASS** — vuoto |

### Cosa queste verifiche NON provano

- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.** Questo
  repository non ha test runner: `npm run build` e' il typecheck, non una prova
  di comportamento. Nessuna riga sopra significa «i test passano».
- **Niente di tutto questo e' stato eseguito su un telefono.** Non esiste in
  questo repository uno strumento che apra IndexedDB su un dispositivo. Le
  quattro proprieta' che contano — l'upgrade con una coda **non vuota**, il
  conteggio delle chiamate durante N scansioni, il rifiuto offline con una
  sessione assegnata alla sola porta, e la scadenza della notte — sono
  **procedura scritta**, qui sotto, e la procedura **e'** il deliverable.
- **`doorAuth` non e' mai arrivato davvero.** Il payload esiste nel codice del
  piano 35-10, ma nessuna delle migration di fase 35 e' applicata: senza
  `party_assignments` e `my_access_context(uuid)` la risoluzione per-notte
  risponde `unresolved`, quindi **oggi il campo arriva solo per chi tiene
  `door.operate` da RUOLO**. Per tutti gli altri il verdetto e' `null`, e
  `null` significa che l'undo offline **rifiuta con il terzo esito**. E' il
  comportamento corretto e va messo in conto nell'ordine di applicazione.
- **La deriva dell'orologio non e' stata osservata**, solo calcolata.

---

## La procedura manuale — l'unica prova che esistera'

Da eseguire **dopo** l'applicazione delle righe 7+ della coda di
`35-HUMAN-UAT.md` e **dopo un deploy in produzione**: in `next dev` il passo 5
non prova niente, perche' il messaggio non e' redatto e quindi il test del canale
non e' il test reale. **Ruoli, mai persone.**

### Preparazione

1. Un evento con **due** serate, `notte A` e `notte B`, entrambe con `end_time`.
2. Un account **staff** assegnato alla sola `notte A` con `door.operate` e
   **senza** `door.supervise`. Chiamalo *l'operatore*.
3. Un account **organizer**.
4. Almeno tre biglietti validi per `notte A`, non ancora usati.
5. Un telefono vero. Non il simulatore del browser: `navigator.onLine` e il
   ciclo di vita di IndexedDB si comportano diversamente.

### Prova A — l'upgrade di schema non svuota una coda

> **Va rifatta, non ereditata.** Il precedente esiste ed e' stato eseguito su un
> dispositivo reale con una scansione gia' in coda (piano 43-13). Un upgrade che
> non aveva strandato niente l'altra volta non e' un upgrade che non stranda
> niente questa volta, e nessun controllo di questo repository sa la differenza.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | organizer | Sul telefono, **con il bundle PRECEDENTE ancora installato** (`DB_VERSION` 4), aprire `/admin/scanner`, selezionare `notte A`, attendere il download della lista | La lista si popola |
| 2 | organizer | **Modalita' aereo.** Scansionare **due** biglietti | Due flash verdi. Il chip *Pending (2)* compare |
| 3 | organizer | **Ancora in aereo**, chiudere l'app del tutto (non solo in background) | — |
| 4 | organizer | Tornare online **solo il tempo di aggiornare il service worker** al bundle nuovo, poi rimettere in aereo **prima** di riaprire lo scanner | Serve che l'upgrade v4→v5 avvenga con la coda **piena e non drenata**: e' l'unico scenario che questa prova prova |
| 5 | organizer | Riaprire `/admin/scanner` | **Il chip dice ancora `Pending (2)`.** In DevTools → Application → IndexedDB → `resonate-checkin`: la versione e' **5** e `pendingCheckins` contiene **due** righe con i loro `scannedAt` originali |
| 6 | organizer | Tornare online, attendere il drain | I due ingressi compaiono in `door_scan_events` con `source = 'offline_sync'` |

**Fallimento da riconoscere:** al passo 5 il chip sparisce o dice `Pending (0)`.
Sono due presenze perse, di persone che hanno pagato, su un telefono che nessuno
puo' verificare. Se succede, **lo step v5 ha toccato la coda** — e non deve.

### Prova B — N scansioni, ZERO chiamate d'autorizzazione

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 7 | organizer | Telefono collegato a DevTools (`chrome://inspect`), tab **Network**, filtro `Fetch/XHR`. Aprire `notte A`, attendere il caricamento, poi **svuotare il pannello Network** | Il pannello e' vuoto |
| 8 | organizer | Scansionare **tre** biglietti di fila, online | Nel pannello: **esattamente tre** `POST /api/tickets/checkin` (piu' le `GET /api/tickets/attendance` di rinfresco della lista, che sono la fetch di sempre). **Zero** richieste nuove d'autorizzazione, e in particolare **nessuna** `GET /api/tickets/attendance?partyId=…` innescata *dallo scan invece che dal rinfresco* |

**Fallimento da riconoscere:** una richiesta in piu' per ogni scansione. E' un
round trip per persona davanti a una fila, ed e' esattamente l'anti-pattern che
ASSIGN-08 vieta.

### Prova C — con la radio spenta, l'annullamento non aggira la supervisione

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 9 | **operatore** (staff assegnato alla sola porta) | Aprire `notte A` **online**, attendere il caricamento | La lista si popola. Il verdetto e' stato risolto e messo in cache in questo momento — e' l'unico |
| 10 | operatore | **Modalita' aereo.** Scansionare un biglietto | Flash verde, `Pending` sale di uno |
| 11 | operatore | Premere **Undo** su quello scan, confermare | **RIFIUTATO ad alta voce.** Titolo *«This check-in was NOT undone»*, dettaglio *«Undoing a check-in needs a supervisor. Ask an organizer for this night.»* Il chip `Pending` **non cambia**, la persona resta entrata, e in IndexedDB la voce e' ancora `state: "pending"` |
| 12 | **organizer** | Ripetere i passi 9–11 con l'account organizer | **L'annullamento riesce.** Titolo *«Undone on this device»*, dettaglio *«… — held here, not yet reported»*. Il chip `Pending` **scende di uno** e compare **`Undone at the door, held on this device (1)`**. In IndexedDB la voce **esiste ancora**, con `state: "undone"`, `undoneAt` e `undoneBy` valorizzati |
| 13 | organizer | Tornare online, attendere il drain | La voce annullata **non viene inviata**, non compare fra i `failed`, e il chip viola resta. **Nessuna riga di ammissione per quella persona compare in `door_scan_events`** |
| 14 | operatore | Con **la radio spenta e senza aver mai aperto la notte online** (svuotare i dati del sito, poi mettere in aereo, poi aprire lo scanner) — tentare un annullamento | **Terzo esito.** Titolo *«This device has not been told who may undo tonight»*, e il dettaglio dice che **non e' un rifiuto dell'account** e che la domanda non ha avuto risposta. Se invece appare la frase del passo 11, i due esiti sono stati collassati e il piano ha fallito il proprio requisito |
| 15 | operatore | **Online**, ripetere l'annullamento del passo 11 | Rifiutato dal server. Nel Network: `403` con `"status":"door_supervision_required"` nel corpo. Sullo schermo la frase **di supervisione**, non *«This account is not allowed to check people in»* — e' la meta' che il piano 35-11 aveva lasciato aperta e questo piano chiude |

**Fallimento da riconoscere al passo 13:** una riga di ammissione in
`door_scan_events` per la persona annullata al passo 12. Significherebbe che il
drain ha riportato l'ammissione che la reversione annulla, cioe' ha rimesso
dentro qualcuno tolto alla porta.

### Prova D — la notte finita nasconde gli strumenti e non cancella niente

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 16 | organizer | Aprire una serata il cui `end_time` e' **gia' passato** | Il bottone **QR Scan sparisce**. Compare la riga gialla *«This night is over — it ended at HH:MM. Nothing has been removed…»* con il bottone **Scan anyway** |
| 17 | organizer | Verificare che la coda sia intatta | Il chip `Pending` mostra lo stesso numero di prima. In IndexedDB **nessuna riga e' stata rimossa** |
| 18 | organizer | Premere **Scan anyway** | Il bottone QR Scan **torna**, e si puo' scansionare |
| 19 | organizer | Aprire una serata **senza** `end_time` | **Non compare nessuna riga** e non si nasconde niente: `validUntil` `null` non inventa nessuna scadenza |
| 20 | organizer | Spostare l'orologio del telefono **avanti di due ore** e riaprire una notte in corso | Compare la riga della deriva: *«This device's clock is 120 min ahead of the server…»*. La riga «notte finita» puo' comparire — **ed e' per questo che «Scan anyway» esiste**. Nessuna scansione viene rifiutata dal dispositivo, e la coda non perde nulla |

**Fallimento da riconoscere al passo 20:** una scansione **rifiutata** perche'
l'orologio e' avanti. Un orologio di dispositivo e' evidenza, mai autorita', e un
falso rifiuto avviene davanti a una fila.

---

## Cross-plan — cose trovate fuori perimetro

`deferred-items.md` **non e' stato toccato** (contratto di quest'onda: 35-16 e
35-17 girano in parallelo). Vanno riportate a mano.

1. **Il percorso d'invio di una reversione non esiste, e non e' quello che il
   contratto di 35-12 descrive.** `sync-manager.ts:299-307` promette che il drain
   riporti la reversione a `/api/tickets/checkin/undo`. Misurato leggendo la
   route: quella richiesta risponde **400 «Ticket is not checked in»**
   (`undo/route.ts:347-352`) quando l'ammissione non e' mai stata riportata — che
   e' **sempre** il caso di una voce in coda. La forma fedele e' **due richieste
   per una voce**: prima l'ammissione (che porta `scannedAt`, `deviceId`,
   `source: "offline_sync"`), poi la reversione, che il server registra con
   `is_undo = true` e l'operatore che l'ha eseguita. Converge anche in caso di
   fallimento parziale, perche' una seconda ammissione risponde
   `already_recorded` → `done`. **Serve un piano che la scriva**, e il suo
   perimetro e' `sync-manager.ts`. Fino ad allora la reversione presa offline
   resta **sul dispositivo**, contata sullo schermo e assente dal record.
2. **Il ramo `membership` della route di undo non e' raggiungibile da un
   dispositivo offline**, per una ragione strutturale e non per una svista:
   vuole un `attendanceId` (`undo/route.ts:532-537`), cioe' un id generato dal
   server, e la coda tiene un **codice di membership**. Anche il piano del punto
   1 dovra' dichiarare come lo chiude — probabilmente facendo restituire l'id
   dalla risposta di `/api/membership/verify`, che oggi non lo espone.
3. **Il contatore dei bloccati continua a non distinguere le cause.** Segnalato
   da 35-12; questo piano non lo cambia, ma gli mette accanto un quarto chip che
   **si** distingue, e la forma e' quella da copiare.
4. **`ScannerClient.tsx` porta ancora i due warning di lint pre-esistenti** —
   `UUID_PATTERN` non usato e le deps di un `useEffect`. 35-12 supponeva che il
   primo fosse «un avanzo in attesa del piano 35-13»: **non lo era**, questo
   piano non ne ha avuto bisogno. Resta fuori perimetro.

---

## Threat Flags

Il threat register del piano, con come e' coperto:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-62 | **mitigato** | Il ramo offline dell'undo legge `maySupervise` dal verdetto in cache (`:1122`) e ha tre esiti (`:1107`, `:1122`, `:1148`), ognuno con il suo `showFlash`. Spegnere la radio non aggira piu' la regola: nel caso peggiore — verdetto non risolto — **rifiuta** |
| T-35-63 | **mitigato in parte, e la parte scoperta e' dichiarata** | La voce e' **marcata** e non cancellata (`checkin-store.ts:1034`): `undoneAt` e `undoneBy` sopravvivono, il numero e' contato e disegnato (`:2261`), e il drain **non** puo' riportare l'ammissione. **Ma la reversione non raggiunge il server**, perche' il percorso d'invio che 35-12 descrive risponde 400 sulla coda reale: § *Cross-plan* punto 1 |
| T-35-64 | **accettato** | L'inversione dell'asimmetria e' scritta accanto al ramo (`:1090-1105`) con la sua ragione. Un supervisore vero che perde l'annullamento per una risoluzione fallita ha una via d'uscita — segnale, riaprire la notte — e la direzione sbagliata dell'errore sarebbe irrecuperabile |
| T-35-65 | **mitigato quanto puo' esserlo qui** | Lo step `oldVersion < 5` (`:545`) non crea, non distrugge e non riscrive; il grep sul corpo del blocco lo asserisce; il commento dichiara il vincolo su se stesso perche' il controllo non venga rotto dalla prosa. **La prova vera e' la Prova A**, su un dispositivo reale con una coda non vuota |
| T-35-66 | **mitigato** | Il verdetto e' chiesto in un solo punto (`:724`), sulla risposta che lo scanner gia' riceve. I call site di `fetch` sono **7, gli stessi 7 di prima del piano**, e nessuno sta in un percorso di scansione. Il criterio osservabile e' la Prova B |
| T-35-67 | **mitigato** | `validUntil` decide solo cosa si disegna, non cancella niente, e ha una via di ritorno in un tap; `resolvedAt` produce una deriva che si **mostra** (`:2140`). Nessun `Date.now()` in un ramo che rifiuta uno scan — i tre `Date.now()` aggiunti stanno nella misura della deriva, nel tick del disegno e nella marcatura della reversione |
| T-35-SC | non applicabile | Nessun pacchetto installato o modificato |

### Superficie nuova oltre a quella pianificata

Nessun endpoint nuovo, nessuna chiamata di rete nuova, nessun dato personale in
piu' nel payload. Due categorie di log nuove — `scanner:undo_verdict_unresolved`
e `scanner:undo_refused_supervision` — e in un prodotto senza error tracking un
log non raggiunge nessuno: **entrambe hanno pero' un effetto osservabile**, il
flash rosso davanti alla persona che ha premuto il bottone, che e' quello che
`meta-gates.md` chiede. Detto, invece di lasciar credere che qualcuno se ne
accorgera'.

Una nota di dominio, sollevata perche' non chiederla sarebbe un'omissione: il
verdetto che finisce in IndexedDB dice **cosa puo' fare un account su una notte**.
E' su un telefono di staff, in chiaro, e ci resta finche' i dati del sito non
vengono svuotati. Non e' una credenziale — non concede niente al server, che
ridecide ogni volta — ma e' materiale che il runbook della porta dovrebbe
nominare fra le cose che stanno su quel dispositivo.

---

## Known Stubs

Nessuno stub di codice: ogni ramo scritto e' raggiungibile e fa quello che dice.

Due dipendenze in avanti, entrambe scritte anche nei file che le contengono:

1. **La coda delle migration non e' applicata.** Finche' non lo e', `doorAuth`
   arriva solo per chi tiene `door.operate` da ruolo; per tutti gli altri il
   verdetto e' `null` e l'undo offline rifiuta con il terzo esito. Comportamento
   corretto, e da mettere in conto nell'ordine di applicazione.
2. **La reversione presa offline non raggiunge il server**, § *Cross-plan* punto
   1. Il chip viola e' la sua unica superficie, e dice esattamente questo:
   *«held on this device»*.

### Perche' `STATE.md`, `ROADMAP.md` e `deferred-items.md` non sono stati toccati

Contratto di quest'onda: l'orchestratore li possiede dopo il merge.
`src/app/(admin)/admin/scanner/page.tsx` — che il piano 35-17 sta modificando —
**non e' stato aperto**, e `src/lib/offline/sync-manager.ts` e' stato **solo
letto**, mai modificato.

---

## Self-Check: PASSED

- `src/lib/offline/checkin-store.ts` — FOUND, contiene `DB_VERSION = 5` (`:57`),
  `DOOR_AUTH_KEY_PREFIX` (`:85`), `CachedDoorAuth` (`:131`), il terzo stato
  (`:207`), i tre campi del marcatore (`:227`), `if (oldVersion < 5)` (`:545`),
  `LocalUndoResult` (`:992`), `markUndoneLocally` (`:1034`),
  `getUndoneLocallyCount` (`:1076`), `cacheDoorAuth` (`:1361`), `readDoorAuth`
  (`:1393`)
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — FOUND, contiene
  `serverFaultMessage(status, body)` (`:121`), `readDoorAuthPayload` (`:323`),
  lo stato `doorAuth` (`:454`), l'azzeramento per notte e la rilettura (`:607`),
  l'unica richiesta del verdetto (`:724`), la scrittura in cache (`:752`), i tre
  esiti (`:1107`, `:1122`, `:1148`), `nightIsOver` (`:2076`), il chip delle
  reversioni (`:2261`)
- `src/lib/door/outcome.ts` — FOUND, `DOOR_SUPERVISION_REQUIRED` (`:223`) e
  `DOOR_SUPERVISION_REQUIRED_ERROR` (`:233`)
- `src/lib/door/require-operator.ts` — FOUND, la ri-esportazione (`:216`)
- commit `46fb577` — FOUND
- commit `ba9fcf6` — FOUND
- commit `5f65663` — FOUND
- `.planning/STATE.md`, `.planning/ROADMAP.md`,
  `.planning/phases/35-per-night-assignments/deferred-items.md`,
  `src/app/(admin)/admin/scanner/page.tsx`, `src/lib/offline/sync-manager.ts` —
  **NON MODIFICATI**
- nessuna cancellazione di file in nessuno dei tre commit
  (`git diff --diff-filter=D` vuoto su tutti)
