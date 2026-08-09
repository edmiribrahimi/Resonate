---
phase: 35-per-night-assignments
plan: 12
subsystem: checkin-offline
tags: [door, offline-queue, drain, assignments, assign-03, assign-02, wave-5]

# Dependency graph
requires:
  - plan: 35-02
    provides: "`public.party_assignments` con `granted_at`, `ends_at`, `revoked_at` — la revoca e' un UPDATE, mai una DELETE. Migration NON applicata (riga 7 della coda)"
  - plan: 35-07
    provides: "`requireDoorOperator()` a quattro rami e la disciplina della risoluzione unica per handler — in produzione"
  - plan: 31-xx
    provides: "`DoorOutcome`, `door_scan_events`, la tabella di classificazione del drain — in produzione"
provides:
  - "`judgeAtScanTime()` — la domanda «l'assegnazione era viva a `scannedAt`?», posta dopo la revoca"
  - "`no_assignment_at_scan` — quinto `DoorNotValidReason`, e quindi anche una `FailureReason` nuova senza toccare la coda"
  - "`assignmentRevokedAfterScan` — campo additivo della risposta, letto dal drain"
  - "`recorded_after_revocation` — il `via` che distingue una risoluzione da un'ammissione ordinaria"
  - "`LocallyUndoneMarker` / `isLocallyUndone()` — il contratto del drain per una voce annullata offline, che il piano 35-13 produrra'"
affects: [35-13, 35-14, 35-15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "una domanda sul passato si pone al tempo del passato: il drain giudica a `scannedAt`, non all'istante in cui arriva"
    - "un esito nuovo viaggia nel body come membro di una union esistente, mai come quarto status code: lo status decide il bucket, e il bucket sbagliato e' una scansione persa"
    - "niente stringhe di filtro PostgREST costruite a mano con valori che contengono caratteri riservati — la rottura non e' rumorosa, e' un risultato vuoto"
    - "un contratto fra due piani si scrive dal lato del consumatore, perche' e' il consumatore a doverne fare qualcosa"

key-files:
  created: []
  modified:
    - src/app/api/tickets/checkin/route.ts
    - src/lib/offline/sync-manager.ts
    - src/lib/door/outcome.ts
    - src/app/(admin)/admin/scanner/ScannerClient.tsx

key-decisions:
  - "Il giudizio storico si innesta sul ramo `forbidden`, NON passando `{ partyId }` a `requireDoorOperator()`: la forma per-notte chiama `public.my_access_context(uuid)`, che in produzione NON esiste ancora — cablarla sulla route di check-in significherebbe un 503 su ogni scansione alla porta al primo deploy"
  - "Il caso «mai assegnato» e' `not_valid` con un quinto `DoorNotValidReason`, non un quarto `DoorOutcome`: la union e' rispecchiata da un CHECK su una migration gia' applicata, e `outcome.ts` scrive che gli esiti sono tre"
  - "Il marcatore del caso 2 e' un campo additivo della risposta, non un `DoorScanCause` (CHECK chiuso, migration applicata) e non un `DoorFlag` (i flag si renderizzano alla porta, e durante un drain la porta non c'e' piu')"
  - "La revoca si confronta in TypeScript con `Date.parse`, non in una stringa `or` di PostgREST ne' fra stringhe: `...+00:00` contro `...Z`"

# Metrics
metrics:
  duration: "~85 min"
  completed: 2026-08-09
  tasks_completed: 3
  tasks_total: 3
  checkpoint_open: false
---

# Fase 35 Piano 12: il giudizio si sposta nel tempo — Summary

`sync-manager.ts:225` manda un `403` nel bucket `blocked`, che *«aspetta un nuovo
login»*. **Un nuovo login non restituisce un'assegnazione revocata**, quindi una
scansione presa alle 01:40 mentre l'assegnazione valeva, e drenata alle 03:00
dopo una revoca delle 02:30, restava appesa per sempre — e la persona entrata
quella notte non compariva nel record. E' letteralmente cio' che ASSIGN-03
vieta.

Il rimedio non e' uno status code piu' furbo: e' **cambiare quando si giudica**.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | Il giudizio al tempo dello scan | `3f680a7` | `checkin/route.ts`, `outcome.ts`, `ScannerClient.tsx`, `sync-manager.ts` |
| 2 | La tabella di classificazione estesa | `18d4082` | `sync-manager.ts` |
| 3 | Il contratto per l'annullamento locale | `795d92e` | `sync-manager.ts` |
| — | Correzione della forma della query (deviazione 3) | `f236489` | `checkin/route.ts` |

**Lingua:** commenti e identificatori in inglese, come i quattro file estesi.

---

## I tre esiti, e dove vivono

| Esito | Condizione | Risposta | Bucket del drain |
|---|---|---|---|
| **1 · live** | la guardia ha detto si' (ruolo), **oppure** l'assegnazione era ed e' viva | invariata | `done` via `recorded` |
| **2 · revoked_after_scan** | viva a `scannedAt`, revocata dopo | `recorded` + `assignmentRevokedAfterScan: true` | `done` via `recorded_after_revocation` |
| **3 · never_assigned** | nessuna assegnazione ha coperto quel momento | `not_valid` / `no_assignment_at_scan`, **422** | `dead` con la sua `FailureReason` |

**Nessuno dei tre restituisce 401 o 403**, ed e' il punto: uno status di rifiuto
qui rimanderebbe la voce in `blocked`, che e' il difetto corretto.

| Cosa | Dove |
|---|---|
| `ScanTimeJudgement`, l'unione taggata a cinque rami | `checkin/route.ts:161` |
| `judgeAtScanTime()` | `checkin/route.ts:228` |
| `isQueuedReport` — `source: "offline_sync"` **e** uno `scannedAt` | `checkin/route.ts:414` |
| il 403, invariato, per tutto cio' che non e' un report in coda | `checkin/route.ts:419` |
| la scelta del ramo, totale e senza asserzioni | `checkin/route.ts:507-519` |
| `assignmentRevokedAfterScan` nella risposta | `checkin/route.ts:591`, `:676` |
| il caso 3, che scrive la riga e poi risponde | `checkin/route.ts:701-712` |
| `no_assignment_at_scan` nella union | `outcome.ts:98`, con la ragione a `:83` |
| la frase per la porta, perche' il `Record` e' totale | `ScannerClient.tsx:73` |
| `NOT_VALID_REASONS`, quinto membro | `sync-manager.ts:87` |
| `saysAssignmentRevokedAfterScan` | `sync-manager.ts:105` |
| la tabella con le due righe nuove | `sync-manager.ts:145-208` |
| il ramo `recorded_after_revocation` | `sync-manager.ts:242-243` |
| `LocallyUndoneMarker` / `isLocallyUndone` | `sync-manager.ts:318`, `:339` |
| **`401 || 403 → blocked`, invariata** | `sync-manager.ts:225` |

---

## La decisione piu' importante, e perche' e' un *non fare*

Il piano dava per scontato, nel caso 1, che la route ammettesse gia' un
assegnatario vivo — cioe' che la guardia fosse per-notte. **Passare
`{ partyId }` a `requireDoorOperator()` sarebbe stato il modo ovvio, ed e' stato
rifiutato.**

`requireDoorOperator({ partyId })` chiama `getPartyAccessContext`, che chiama
`public.my_access_context(uuid)` — **una funzione che in produzione non esiste**:
e' la riga 8 della coda applicata a mano di `35-HUMAN-UAT.md`, e questa fase ne
mette altre in coda dietro. La guardia risponde `unresolved` **503** quando la
risoluzione fallisce, che e' il comportamento corretto e sarebbe stato un
disastro qui: **ogni scansione alla porta, alle due di notte, con una fila,
avrebbe risposto 503 dal primo deploy fino all'applicazione manuale della
migration.**

Quindi il giudizio storico si innesta sul ramo `forbidden` invece che dentro la
guardia. Conseguenze, dichiarate:

- **Il percorso online non cambia di un byte.** Una scansione dal vivo non porta
  `scannedAt`, non raggiunge nessuna riga nuova, e la guardia resta chiamata una
  volta sola, senza notte, con lo stesso costo di prima
  (`grep -c "await requireDoorOperator(" = 1`, invariato).
- **La sola dipendenza nuova e' la tabella `party_assignments`** (riga 7), non
  l'RPC. E finche' la tabella non esiste, la lettura risponde `42P01` → `unresolved`
  → **503 → retry**, non `blocked`: la coda si muove appena la migration arriva.
- **Un assegnatario che scansiona ONLINE riceve ancora 403.** E' ASSIGN-01 alla
  porta, e **nessun piano di questa fase lo chiude** (vedi § *Cross-plan*).

---

## Deviazioni dal piano

### 1. [Rule 3 — bloccante] Il caso 3 e' un quinto `DoorNotValidReason`, non un quarto `outcome`

- **Il criterio diceva:** *«Il caso 3 produce un valore di `outcome` distinto dai
  tre esistenti»*.
- **Il fatto:** `DoorScanOutcomeKind` e' rispecchiato da un `CHECK` sulla colonna
  `outcome` di `door_scan_events`, in `20260805120000_door_scan_events.sql` —
  **una migration gia' applicata in produzione**. Un quarto membro richiederebbe
  una migration nuova, piu' `DOOR_HTTP`, `isDoorOutcome` e ogni consumatore; e
  `outcome.ts:88-90` scrive che gli esiti sono tre e che un annullamento non e'
  il quarto.
- **Cosa e' stato fatto:** il valore distinto e' il **`reason`**, non il `kind`:
  `not_valid` / `no_assignment_at_scan`, distinto dai quattro reason esistenti.
  **E' il meccanismo che il piano stesso indica**, perche' `FailureReason` e'
  esattamente `DoorNotValidReason | "unexpected_response"`
  (`checkin-store.ts:82`): la `FailureReason` nuova che il task 2 pretende nasce
  da qui, **senza toccare `checkin-store.ts`** — che e' il file del piano 35-13.
  `DoorNotValidReason` non e' rispecchiato in SQL (`classify.ts:176`), quindi
  costa zero migration.
- **Commit:** `3f680a7`

### 2. [Rule 3 — bloccante] Due file fuori da `files_modified`

- **`src/lib/door/outcome.ts`** — la union vive li' ed e' *"the source"*: non c'e'
  un altro posto in cui coniare un reason.
- **`src/app/(admin)/admin/scanner/ScannerClient.tsx`** — una riga.
  `NOT_VALID_MESSAGE` e' un `Record` **totale**, quindi il quinto membro e' un
  errore di `npm run build` finche' non ha la sua frase. Quella totalita' e' il
  meccanismo, non un ostacolo.
- **Nessuna delle due e' in conflitto con l'onda in corso.** I `files_modified`
  di 35-09, 35-10, 35-11, 35-15 e 35-18 sono stati letti: nessuno nomina questi
  due file. `ScannerClient.tsx` appartiene a **35-13**, che gira in un'onda
  successiva — sequenziato, non parallelo (`ai-engineering.md`, gate *multi-agent*).
- **`src/lib/offline/checkin-store.ts` NON e' stato toccato**, benche' il task 2
  chiedesse una `FailureReason` nuova: la deviazione 1 la produce per costruzione.
- **Commit:** `3f680a7`

### 3. [Rule 1 — difetto trovato nel codice appena scritto] La stringa `or` di PostgREST

- **Trovata durante:** la verifica della sintassi alla fonte, prima di
  dichiararla funzionante (`ai-engineering.md`, gate *hallucination*).
- **Il fatto:** la prima stesura filtrava la revoca con
  `.or("revoked_at.is.null,revoked_at.gt.<iso>")`. PostgREST spezza una stringa
  `or` su punti e virgole, e un istante ISO porta sia `:` sia `.`. L'unico
  precedente di `.or()` nel repo (`attendance/route.ts:247`) passa un **uuid**,
  che non ha ne' l'uno ne' l'altro: non e' un precedente. **E sbagliare non
  fallirebbe ad alta voce** — non troverebbe niente, e «non ho trovato niente»
  qui si legge come «non e' mai stato assegnato», cioe' la risposta sbagliata
  con la faccia sicura. `ctx7` non e' installato su questa macchina, quindi la
  documentazione PostgREST non e' stata potuta consultare alla fonte: **una
  sintassi che non posso verificare non entra su un percorso della porta.**
- **Cosa e' stato fatto:** la query usa solo `.eq` / `.lte` / `.gt`, e la revoca
  si confronta in TypeScript con `Date.parse` su entrambi i lati — mai fra
  stringhe, perche' PostgREST rende un `timestamptz` come `...+00:00` mentre
  `scannedAt` e' `...Z`, e `>` fra le due confronterebbe `+` con `Z`. Niente
  `limit`, perche' un `limit(1)` puo' restituire una riga revocata nascondendone
  una viva accanto.
- **Commit:** `f236489`

### 4. [dichiarata, non deviata] Il flag del caso 2 non e' una colonna

- **Il piano diceva:** *«un flag che la marca come tale nella riga di
  `door_scan_events`»*.
- **Il fatto:** l'unico campo di classificazione della riga e' `cause`, un
  `CHECK` chiuso in una migration **applicata**. Allargarlo richiede una
  migration che questo piano non possiede. E il punto 4 del docblock della route
  e' la ragione piu' forte per non farlo comunque: *alla porta la riga afferma un
  fatto, la classificazione avviene dopo, sopra `door_scan_events`*.
- **Cosa e' stato fatto:** la riga porta il **fatto** (`operator_id`, `party_id`,
  `scanned_at`, `recorded_at`, `source`) e la classificazione e' **derivabile** da
  evidenza gia' completa e incancellabile: `party_assignments` conserva la revoca
  come `UPDATE`, mai come `DELETE`. Il marcatore viaggia nella **risposta**, dove
  ha un lettore che esiste oggi — il drain, che lo classifica `done` sotto un
  `via` proprio. Non e' un `DoorFlag`: i flag si renderizzano alla porta con
  `FLAG_MESSAGE`, e quando gira un drain la porta e' chiusa e non c'e' nessuno
  davanti.

Nessun gate di autenticazione incontrato.

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck + build | `npm run build` | **PASS** — `✓ Compiled successfully`, dopo ogni task |
| Guardia chiamata una volta sola | `grep -c "await requireDoorOperator(" checkin/route.ts` | **PASS** — `1`, come prima del task |
| Il paragrafo su `scannedAt` e la riga | `grep -q "scannedAt" && grep -q "recorded_at"` | **PASS** — 23 e 3 occorrenze |
| La riga `401 \|\| 403 → blocked` invariata | `git diff HEAD -- sync-manager.ts \| grep '401 \|\| status === 403'` | **PASS** — nessuna riga nel diff |
| Il piano 35-13 nominato nel contratto | `grep -c "35-13" sync-manager.ts` | **PASS** — 5 |
| Nessuna cancellazione di coda dal task 3 | `grep -n "store.delete\|db.delete\|markSynced" sync-manager.ts` | **PASS** — solo `markSynced` (`:463`), sul bucket `done` |
| Nessun file cancellato | `git diff --diff-filter=D` su ogni commit | **PASS** — vuoto |
| Lint sui quattro file | `npx eslint <i quattro file>` | **PASS** — 0 errori. Due **warning pre-esistenti** in `ScannerClient.tsx` (`UUID_PATTERN` non usato a `:44`, deps di un `useEffect` a `:766`), verificati presenti sul commit di base `41f2c63` e **non toccati** (fuori perimetro) |

### La prova della finestra temporale, eseguita in Postgres

E' la meta' che *si puo'* provare qui, e prova la parte piu' facile da sbagliare:
il predicato. Eseguita in una transazione **annullata**, con sole `VALUES` e
nessuna DDL, dentro il container `postgres:17.6` gia' presente — **che non e'
stato modificato** (le migration di fase 35 non ci sono, e non ce le ho messe:
lo condividono altri agenti dell'onda).

Una persona, una notte. Ogni riga e' la sua **intera** storia di assegnazione,
quindi il verdetto e' tutta la risposta:

```
         judged_at          |       history       |      verdict
----------------------------+---------------------+--------------------
 A_judged_at_scannedAt_0140 | ended_before_scan   | never_assigned
 A_judged_at_scannedAt_0140 | granted_after_scan  | never_assigned
 A_judged_at_scannedAt_0140 | live                | live
 A_judged_at_scannedAt_0140 | revoked_after_scan  | revoked_after_scan
 A_judged_at_scannedAt_0140 | revoked_before_scan | never_assigned
 B_judged_at_drain_0300     | ended_before_scan   | never_assigned
 B_judged_at_drain_0300     | granted_after_scan  | live
 B_judged_at_drain_0300     | live                | live
 B_judged_at_drain_0300     | revoked_after_scan  | never_assigned
 B_judged_at_drain_0300     | revoked_before_scan | never_assigned
```

Le due righe che contano stanno una sopra l'altra:

- `revoked_after_scan` giudicata **a `scannedAt`** → `revoked_after_scan`, cioe'
  **registrata**. Giudicata **al drain** → `never_assigned`, cioe' il 403 e il
  `blocked` di oggi. **Quella singola differenza e' il difetto e la sua
  correzione.**
- `granted_after_scan` mostra l'errore **opposto** che il giudizio al drain
  commette: ammetterebbe sulla forza di un'assegnazione concessa *dopo* la
  scansione.
- `ended_before_scan` e' ASSIGN-02, chiesto al momento giusto: l'accesso non
  sopravvive alla notte, e la domanda su quel fatto si pone allo scan.

### Cosa queste verifiche NON provano

- **Nessuna delle migration di fase 35 e' applicata**, `party_assignments`
  inclusa. Il verde di `npm run build` non dice che la tabella esista: nessun
  client di questo repository e' parametrizzato con un generico `Database`,
  quindi i nomi di tabella e colonna in quella query **non sono controllati da
  niente**. Finche' la riga 7 della coda non e' applicata, `judgeAtScanTime`
  risponde `unresolved` — rumorosamente, con la sua categoria, e in direzione
  sicura.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.** Non
  esiste un test runner: nessuna riga di questo summary significa «i test
  passano».
- **La traduzione dei filtri `.lte` / `.gt` da parte di PostgREST non e' stata
  esercitata.** E' la ragione per cui la deviazione 3 ha tolto l'unica parte
  della query che non potevo verificare.
- **Nessun percorso HTTP e' stato esercitato.** La prova per chiamata diretta che
  la verifica del piano chiede richiede la coda applicata, un'assegnazione seminata
  e una sessione: e' la procedura qui sotto, ed e' **scritta, non eseguita**.
- **La meta' che vive in IndexedDB su un telefono non e' raggiungibile da questo
  repository.** Nessuno strumento qui puo' aprire quella coda.

---

## La procedura manuale — l'unica prova che esistera'

In un repo senza test runner questa **e'** il deliverable per la meta' che non si
puo' provare qui. Va eseguita **dopo** l'applicazione delle righe 7 e seguenti di
`35-HUMAN-UAT.md` e dopo un deploy. Ruoli, mai persone.

### Preparazione

1. Un evento con una serata (`event_parties`) con `date` e `end_time`.
2. Un account con ruolo **staff** e **nessun** `door.operate` da ruolo — chiamalo
   *l'operatore*. Verifica che sia cosi': con l'operatore, un `POST` a
   `/api/tickets/checkin` senza `source` deve rispondere **403**.
3. Un account **organizer** che gli assegna `door.operate` su quella serata
   (superficie del piano 35-05). Nota `granted_at`.
4. Un biglietto valido per quella serata, non ancora usato.
5. Sul telefono dell'operatore: apri lo scanner, seleziona la serata, **attendi
   che il roster sia scaricato**.

### Prova A — la scansione presa mentre l'assegnazione valeva si risolve

6. **Metti il telefono in modalita' aereo.** Non basta chiudere il wi-fi: serve
   che `navigator.onLine` sia falso.
7. Scansiona il biglietto. Atteso: **verde**, e il contatore delle scansioni in
   attesa sale di uno. Annota l'ora del telefono — e' `scannedAt`.
8. **Con la radio ancora spenta**, dal pannello organizer **revoca** l'assegnazione
   dell'operatore su quella serata. Verifica in `party_assignments` che la riga
   **esista ancora** con `revoked_at` valorizzato: se e' sparita, il resto non ha
   senso e la migration e' sbagliata.
9. Riporta il telefono online. Attendi il drain (arriva su `online`; in caso,
   porta l'app in background e riaprila per il `visibilitychange`).
10. **Atteso — e' la prova:**
    - il contatore delle scansioni in attesa **torna a zero**;
    - il contatore dei falliti **non sale**;
    - nella console del dispositivo compare `sync:synced:ticket:recorded_after_revocation`;
    - in `door_scan_events` esiste una riga con `outcome = 'recorded'`,
      `source = 'offline_sync'`, `operator_id` = l'operatore, `scanned_at` = l'ora
      del passo 7 e `recorded_at` = l'ora del passo 9.
11. **Fallimento da riconoscere:** se il contatore resta fermo e la voce e'
    contata fra i `blocked` con un invito a rientrare, il difetto NON e' chiuso.
    Rientrare non la sbloccherebbe: e' esattamente il ciclo che questo piano
    corregge.

### Prova B — la scansione mai coperta esce dalla coda invece di restarci

12. Ripeti i passi 5–7 con un **secondo** account staff che **non ha e non ha mai
    avuto** un'assegnazione su quella serata. (Lo scanner ammette in locale: la
    decisione offline e' del dispositivo, ed e' corretta cosi'.)
13. Riporta il telefono online e attendi il drain.
14. **Atteso:**
    - la voce **esce** dalle scansioni in attesa;
    - il **contatore dei falliti sale di uno**, e la voce e' visibile con reason
      `no_assignment_at_scan` — non `unexpected_response`;
    - in `door_scan_events` esiste una riga con `outcome = 'not_valid'`: la
      presenza e' **nel record**, e non e' stata ammessa;
    - il biglietto **non** e' `checked_in`.
15. **Fallimento da riconoscere:** una voce che resta in attesa e viene ritentata
    a ogni `online`, o una che sparisce senza comparire fra i falliti. La prima e'
    un ciclo senza soffitto, la seconda e' una scansione persa in silenzio.

### Prova C — la deriva dell'orologio, il modo di fallire accettato

16. Sul telefono, sposta l'orologio **indietro** di due ore e ripeti la prova A.
17. **Atteso:** il comportamento resta *ammetti e registra*. La scansione si
    risolve, e nella riga di `door_scan_events` la **distanza fra `scanned_at` e
    `recorded_at`** e' visibilmente anomala.
18. Questo passo **non deve** produrre un rifiuto. Se lo produce, la direzione
    dell'errore e' stata invertita, ed e' il difetto peggiore fra i due:
    rifiutare avviene davanti a una fila.

---

## Cross-plan — cose trovate fuori perimetro

`deferred-items.md` **non e' stato toccato** (contratto worktree, e 35-09/35-10/
35-11/35-15/35-18 girano in parallelo). Vanno riportate a mano.

1. **Un assegnatario che scansiona ONLINE riceve ancora 403.** La route di
   check-in chiama `requireDoorOperator()` **senza notte**, e il braccio
   per-notte e' muto senza notte per costruzione (`require-operator.ts:143-151`).
   Ho letto i `files_modified` di tutti i 21 piani della fase: **nessuno passa un
   `partyId` a `src/app/api/tickets/checkin/route.ts`**. Cosi' com'e', ASSIGN-01
   arriva alla superficie di lista (35-10), al registro (35-09) e all'undo
   (35-11), ma **non alla scansione**: una persona assegnata alla porta non puo'
   far entrare nessuno online. Questo piano ha deliberatamente **non** chiuso il
   buco, perche' cablarlo prima dell'applicazione manuale di
   `my_access_context(uuid)` significherebbe 503 su ogni scansione dal primo
   deploy. **Serve un piano che lo faccia dopo l'applicazione della coda**, e la
   sua verifica e' un passo di `35-HUMAN-UAT.md`, non un build verde.
2. **`ScannerClient.tsx` porta due warning di lint pre-esistenti** —
   `UUID_PATTERN` non usato (`:44`) e le deps di un `useEffect` (`:766`), entrambi
   presenti sul commit di base. Il primo sembra un avanzo in attesa del piano
   35-13, che possiede quel file.
3. **Il contatore dei bloccati non distingue le cause.** `getBlockedCount()` e'
   un numero solo, e dopo questo piano `blocked` significa una cosa sola —
   sessione scaduta — il che rende il contatore piu' onesto di prima. Vale la
   pena che la superficie del piano 35-13 lo dica a parole invece che con un
   numero.
4. **`ctx7` non e' installato** su questa macchina, quindi la catena di
   documentazione si ferma al secondo anello. Ha avuto un costo reale qui (§
   deviazione 3): la sintassi PostgREST e' stata evitata invece che verificata.

---

## Threat Flags

Il threat register del piano, con come e' coperto:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-57 | mitigato | I due casi nuovi non passano da uno status e non finiscono in `blocked`: il caso 2 e' `recorded` (200), il caso 3 e' `not_valid` (422). La riga `401 \|\| 403 → blocked` e' invariata nel diff |
| T-35-58 | **accettato, e scritto** | Il paragrafo *«the accepted failure mode of `scannedAt`»* (`checkin/route.ts:196-216`) dice per esteso cosa un orologio sbagliato puo' comprare e perche' si accetta: la direzione dell'errore e' *ammetti e segnala*, mai *rifiuta*. Il mitigante e' la distanza leggibile fra `scanned_at` e `recorded_at`, ed e' la prova C della procedura manuale |
| T-35-59 | mitigato **con un limite dichiarato** | L'effetto osservabile del caso 2 e' server-side: la riga piu' `party_assignments.revoked_at`, che la revoca non cancella. Sul dispositivo e' il `via` distinto nel log del drain — e un log e' un posto dove nessuno guarda, quindi **non lo conto come l'osservatore**. Durante un drain la porta e' chiusa e non c'e' nessuno davanti a cui mostrarlo: l'osservatore reale e' la lista di revisione della serata |
| T-35-60 | mitigato | Il caso «mai assegnato» va a `dead` con la sua `FailureReason`, non a `retry`. Le tre alternative rifiutate — un quarto status in `retry`, `blocked`, «non revocare finche' c'e' una coda» — sono scritte nel docblock con la loro ragione (`sync-manager.ts:186-207`) |
| T-35-61 | mitigato **come contratto, non come codice attivo** | `LocallyUndoneMarker` (`:318`) e `isLocallyUndone` (`:339`) definiscono cosa fara' il drain; il produttore e' il piano 35-13 ed e' nominato cinque volte nel file. Il ramo e' **inerte oggi** — nessun codice scrive quel campo — e il percorso d'invio arriva con il produttore, perche' una voce marcata senza mittente sarebbe la stessa scansione appesa un file piu' in la' |
| T-35-SC | non applicabile | Nessun pacchetto installato o modificato |

### Superficie di sicurezza nuova, dichiarata

- **Un uso nuovo del client service** (`access-gating.md`, gate *service role*).
  Tre valori raggiungono la query e ognuno e' motivato nel file: `operatorId`
  viene dalla sessione risolta e **mai** dal body; `partyId` e' passato per
  `UUID_PATTERN`; `scannedAt` e' passato per `Date.parse` ed e' riemesso da
  `toISOString()`. Tutti e tre arrivano come **parametri** di `.eq` / `.lte` /
  `.gt`, mai dentro una stringa di filtro. E' il client service e non quello
  legato ai cookie perche' la domanda riguarda un'assegnazione **revocata**, e un
  soggetto la cui assegnazione e' stata revocata e' precisamente quello a cui una
  policy sulle assegnazioni vive impedirebbe di leggere la riga che prova che
  l'aveva.
- **Un round trip in piu', su un solo percorso.** `getAccessContext()` viene
  chiamata solo quando la guardia ha risposto `forbidden` **e** la richiesta si
  dichiara un report in coda. Una scansione dal vivo non raggiunge mai quella
  riga, e un drain non ha nessuno in fila davanti.
- **Tre categorie di log nuove** — `[door.assignment_subject_unresolved]`,
  `[door.assignment_history_unreadable]`, `[door.assignment_revocation_unreadable]`
  — in un prodotto **senza error tracking**. Tutte e tre hanno pero' un effetto
  osservabile e non solo una riga di log: portano a un **503**, che il drain mette
  in `retry`, e una voce che resta in coda e' un numero che il telefono mostra
  allo staff. Detto invece che lasciato credere che qualcuno se ne accorgera'.

---

## Known Stubs

Nessuno stub di codice. Due dipendenze in avanti, dichiarate qui e nei file:

1. **`LocallyUndoneMarker` e `isLocallyUndone` non hanno ancora un produttore.**
   `isLocallyUndone` e' `false` per ogni voce che esiste, e il comportamento del
   drain e' byte per byte quello di prima. Il produttore e' il piano **35-13**.
2. **`no_assignment_at_scan` non e' producibile da una scansione dal vivo.** La
   frase in `NOT_VALID_MESSAGE` esiste perche' il `Record` e' totale, non perche'
   ci sia una superficie che la mostra.

---

## Self-Check: PASSED

- `src/app/api/tickets/checkin/route.ts` — FOUND: `ScanTimeJudgement` (`:161`),
  `judgeAtScanTime` (`:228`), `isQueuedReport` (`:414`), il 403 invariato
  (`:419`), `operatorId` senza asserzione (`:568`),
  `assignmentRevokedAfterScan` (`:591`, `:676`), il caso 3 (`:709`)
- `src/lib/offline/sync-manager.ts` — FOUND: `no_assignment_at_scan` (`:87`),
  `saysAssignmentRevokedAfterScan` (`:105`), la tabella estesa (`:145-208`),
  `recorded_after_revocation` (`:243`), `LocallyUndoneMarker` (`:318`),
  `isLocallyUndone` (`:339`), `401 || 403 → blocked` **invariata** (`:225`)
- `src/lib/door/outcome.ts` — FOUND: `no_assignment_at_scan` (`:98`)
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — FOUND: la frase (`:73`)
- commit `3f680a7` — FOUND
- commit `18d4082` — FOUND
- commit `795d92e` — FOUND
- commit `f236489` — FOUND
- `.planning/STATE.md`, `.planning/ROADMAP.md`,
  `.planning/phases/35-per-night-assignments/deferred-items.md`,
  `src/app/api/tickets/checkin/undo/route.ts` — **NON MODIFICATI**
- nessuna cancellazione di file in nessuno dei quattro commit
  (`git diff --diff-filter=D` vuoto su tutti)
</content>
