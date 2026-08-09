---
phase: 35-per-night-assignments
plan: 19
subsystem: media-and-storage
tags: [exif, venue-secrecy, storage-bucket, fail-closed, dependency-audit, wave-5]

# Dependency graph
requires:
  - plan: 35-01
    provides: "la coda di applicazione manuale di `35-HUMAN-UAT.md`: questa migration e' la **riga 13**, e la riga 15 e' quella che chiude la finestra che questo piano lascia aperta"
  - plan: 35-02
    provides: "la disciplina di idempotenza di questa fase, e la cattura contro cui l'additivita' di questa migration si misura"
provides:
  - "`sharp` come dipendenza **dichiarata** di questo progetto, alla stessa riga di versione che `next@16.1.6` gia' risolve"
  - "`stripImageMetadata(input, mime)` — la funzione che spoglia, e che in ogni altro caso **lancia**"
  - "`MEDIA_STRIP_UNSUPPORTED_TYPE` · `MEDIA_STRIP_TOOL_UNAVAILABLE` · `MEDIA_STRIP_FAILED` — le tre categorie di rifiuto, **valori decisi per posizione**"
  - "`MediaStripRefusal` e `isMediaStripRefusal` — il rifiuto e il suo riconoscimento senza `instanceof`"
  - "`STRIPPABLE_MIME_TYPES` — i tipi che il modulo sa trattare, e l'elenco NON contiene i video"
  - "il bucket `event-media-quarantine`, `public = false`, e la sua unica policy di inserimento"
  - "la cattura `35-19`: 72 policy, 23 tabelle con RLS, 322 celle di lettura, 966 sonde di scrittura — identiche a `35-05`"
affects: [35-14, 35-16, 35-20, 35-21]

# Tech tracking
tech-stack:
  added:
    - "sharp@^0.34.4 — **promozione, non installazione**: gia' nell'albero come `optionalDependencies` di `next@16.1.6`"
  patterns:
    - "la direzione dell'errore si sceglie dall'irreversibilita' del danno, non dall'abitudine: qui il default e' rifiutare, ed e' il CONTRARIO della porta, dove il default e' ammettere"
    - "una categoria di rifiuto che nessuna situazione raggiungibile produce e' decorazione: `sharp` si carica con un `import()` dinamico proprio perche' `tool_unavailable` sia raggiungibile"
    - "il mime che arriva dal browser e' una pretesa: il container decodificato si confronta con il tipo dichiarato, e una divergenza e' un rifiuto e non una transcodifica"
    - "in un bucket privato la protezione E' l'assenza di una policy di lettura: aggiungerne una per comodita' del server sarebbe concedere a tutti per servire uno"
    - "una prova per mutazione va asserita come applicata PRIMA di leggerne l'esito — qui il primo fixture EXIF non ha mutato, e il verde che ne sarebbe seguito era un falso negativo"

key-files:
  created:
    - src/lib/media/strip-metadata.ts
    - supabase/migrations/20260809004600_event_media_quarantine_bucket.sql
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-19.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-19.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-19.json
  modified:
    - package.json

key-decisions:
  - "`sharp` promosso a dipendenza dichiarata alla riga `^0.34.4` — la STESSA di `next@16.1.6`, letta da `node_modules/next/package.json`. Nessun secondo scaricamento, nessun nodo nuovo nell'albero: la riga aggiunge un contratto, non un pacchetto"
  - "`sharp` caricato con `import()` dinamico e non con un import statico. Un import statico farebbe morire il modulo al caricamento invece di produrre un rifiuto categorizzato — e renderebbe `MEDIA_STRIP_TOOL_UNAVAILABLE` una costante che nessuna situazione puo' produrre"
  - "Il container decodificato viene confrontato con il mime dichiarato (Rule 2). Senza, un file etichettato `image/jpeg` i cui byte sono altro verrebbe **transcodificato** in JPEG: un successo su un file che nessuno ha validato"
  - "Nessuna policy di lettura e nessuna di cancellazione sul bucket di quarantena. Con una lettura per `authenticated`, la quarantena diventa un secondo bucket pubblico con un nome piu' lungo. Il service role non passa dalla RLS, quindi la rotta del piano 35-20 non ha bisogno di nessuna policy"
  - "Il bucket eredita il tetto di 100 MB di `event-media` invece di sceglierne uno proprio: un'area di transito piu' stretta della destinazione rifiuterebbe file che la destinazione accetta, e il rifiuto arriverebbe al membro come un errore di storage senza causa"
  - "I VIDEO non sono coperti, e la frase sta **dentro** il file. `sharp` non li tratta e un MP4/MOV porta le coordinate in un atomo `udta`. Un gate coperto a meta' che si legge come coperto e' peggio di un gate assente"

# Metrics
metrics:
  duration: "~50 min"
  completed: 2026-08-09
  tasks_completed: 3
  tasks_total: 3
  checkpoint_open: false
---

# Fase 35 Piano 19: la spoglia dei metadati e il posto dove aspettare — Summary

I due pezzi che la sanitizzazione dei metadati richiede prima di poter esistere:
**una funzione che spoglia** e **un posto dove i byte possono aspettare senza
essere raggiungibili**. Piu' la riga di `dependencies` che li rende possibili
senza aggiungere un nodo all'albero.

`media-and-storage.md` dice che il gate EXIF *«vale in modo assoluto»* per gli
eventi con sede segreta, e la fase 35 allarga esattamente quella classe: il
viaggiatore piu' probabile del percorso nuovo e' qualcuno assegnato a lavorare
**dentro** la sede segreta quella notte, e una foto porta le coordinate nel file.
`venue-secrecy.md` e' monotono — una sede si puo' solo rivelare.

**La migration non e' applicata in produzione.** E' la **riga 13** della coda di
`35-HUMAN-UAT.md` e si applica a mano. Ogni prova qui sotto viene da un container
`postgres:17.6` costruito con lo shim, lo schema base e tutte e 49 le migration
in ordine.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | `sharp` smette di essere una dipendenza di qualcun altro | `7573aa2` | `package.json` |
| 2 | `stripImageMetadata` — e ogni altro esito e' un rifiuto | `b15592d` | `src/lib/media/strip-metadata.ts` |
| 3 | Il bucket di quarantena | `ad3949e` | la migration, le tre catture `35-19` |

**Lingua.** I commenti del modulo TypeScript e della migration sono in inglese,
come i loro template dichiarati; i due paragrafi sull'idempotenza e sulla
finestra aperta restano in italiano, come nel loro precedente
(`35-05-SUMMARY.md`). La prosa dei documenti di pianificazione e dei messaggi di
commit e' italiana.

---

## Task 1 — l'audit di legittimita', eseguito e non ricordato

**`npm ls sharp`, output testuale, eseguito dalla radice reale del progetto:**

```
resonate@0.1.0 /Users/etiesse/Resonate
└─┬ next@16.1.6
  └── sharp@0.34.5
```

**La riga di versione, letta da `node_modules/next/package.json` e non da
memoria:**

```
next version = 16.1.6
optionalDependencies.sharp = ^0.34.4
dependencies.sharp = undefined
sharp installed version = 0.34.5
```

### La riga di audit

| Pacchetto | Riga aggiunta | Versione risolta | Provenienza | Verdetto | Ragione |
|---|---|---|---|---|---|
| `sharp` | `^0.34.4` | `0.34.5` | `optionalDependencies` di `next@16.1.6` | **`[VERIFIED]`** | Gia' scaricato, gia' installato e gia' **eseguito** da `next` per l'ottimizzazione delle immagini. La riga non introduce codice nuovo: introduce una **dichiarazione** |

`35-RESEARCH.md` § *Package Legitimacy Audit* dichiarava *«questa fase installa
zero pacchetti»* e chiedeva che un piano che ne proponesse uno passasse **prima**
dal gate. Questo e' quel passaggio, e l'esito e' che **nessun pacchetto viene
installato**: la riga scelta e' identica a quella che `next` gia' risolve, quindi
l'albero non guadagna un nodo.

### La promozione e' misurabile, non cosmetica

| Momento | `npm ls sharp` nel worktree |
|---|---|
| prima dell'edit | `sharp@0.34.5 **extraneous**` |
| dopo l'edit | `sharp@0.34.5` — nessun `extraneous`, exit 0 |

**Perche' serve** (T-35-104): importare `sharp` senza dichiararlo e' una
dipendenza fantasma. *«Optional»* e' la parola che conta — un
`npm install --no-optional`, una piattaforma non supportata, o il giorno in cui
`next` cambia riga di versione lasciano `sharp` fuori, e l'import si rompe **nel
percorso che spoglia i metadati**, cioe' nel posto peggiore. Con la
dichiarazione, quel giorno diventa un errore di **installazione** invece che un
guasto in **produzione**.

**Nessun'altra modifica a `package.json`:** nessuno script nuovo, perche' il file
che eseguirebbe arriva col piano 35-21 e una voce di `scripts` che punta a un
file inesistente e' un comando morto.

---

## Task 2 — la funzione, e il fatto che ogni altro esito e' un rifiuto

### La prova che i metadati escono davvero dal file

Nessuno strumento di questo repository apre un file e ne legge l'EXIF, quindi la
spoglia e' una proprieta' **a tempo d'esecuzione** e va misurata eseguendola. La
misura e' stata fatta su un JPEG **sintetico** costruito per l'occasione: la
coppia GPS e' 1N / 1E — oceano aperto nel Golfo di Guinea — proprio perche'
nessun luogo reale, e nessuna sede, finisca come fixture in un repository
pubblico. Nessun file di prova e' stato committato: lo script vive in `/tmp`.

| | formato | dimensioni | byte di EXIF | `Make`/`Copyright` nel file |
|---|---|---|---|---|
| **fixture** | jpeg | 40×80, `orientation=6` | **318** | presenti |
| **dopo la pipeline** | jpeg | **80×40** | **0** | assenti |

Il marcatore `Exif\0\0` non compare piu' nei byte grezzi in uscita.

### `.rotate()` provato per mutazione, nelle due direzioni

La pipeline e' stata eseguita **con** e **senza** `.rotate()` sullo stesso
fixture:

| Pipeline | Uscita | EXIF |
|---|---|---|
| `sharp(input).rotate().jpeg()` | **80×40** — l'orientamento e' stato applicato | 0 |
| `sharp(input).jpeg()` — il bug | **40×80** — la foto rendera' ruotata di 90° | 0 |

**I metadati spariscono in ENTRAMBI i casi, ed e' esattamente per questo che il
bug e' invisibile.** Un controllo che chiedesse solo *«l'EXIF e' sparito?»*
passerebbe sulla pipeline rotta, e ogni foto verticale — cioe' quasi tutte quelle
scattate a una serata — uscirebbe coricata. La riga porta la sua ragione accanto,
nel file.

> **Il primo fixture non aveva mutato, e non ne ho letto l'esito.** Il primo
> tentativo scriveva `Orientation: "6"` come stringa in `IFD0` e `sharp`
> rileggeva `orientation=1`: la mutazione **non era stata applicata**, e
> `NO-ROTATE` e `WITH-ROTATE` davano entrambi 40×80 — cioe' un risultato che
> avrebbe fatto sembrare `.rotate()` inutile. L'asserzione sul fixture
> (`orientation` riletta prima di leggere l'esito) e' precisamente il gate *prova
> per mutazione* di `ai-engineering.md`, ed e' l'unica ragione per cui questa
> tabella dice qualcosa.

### Le tre categorie, e il fatto che ognuna e' raggiungibile

`ai-engineering.md`, gate *un gate deve poter fallire*: una categoria che nessuna
situazione produce e' decorazione.

| Costante | Situazione che la produce | Misurata |
|---|---|---|
| `MEDIA_STRIP_UNSUPPORTED_TYPE` | un mime fuori dai tre trattabili — **ogni video passa di qui**; oppure byte che non sono il container dichiarato | si': byte PNG dichiarati `image/jpeg` → `decoded=png` → rifiuto |
| `MEDIA_STRIP_FAILED` | `sharp` si carica e rifiuta questi byte — file corrotto, buffer vuoto | si': `Buffer.alloc(0)` → `Error: Input Buffer is empty` |
| `MEDIA_STRIP_TOOL_UNAVAILABLE` | `sharp` non si carica affatto | **no** — raggiungibile per costruzione (`import()` dinamico dentro un `try`), non esercitata. Dichiarato invece che lasciato credere |

Sono **valori decisi per posizione**, mai frasi da interpretare: Next redige il
messaggio di un errore in un build di produzione, quindi un chiamante che
leggesse `error.message` leggerebbe una stringa vuota. Il `Record` totale
sull'unione fa di una quarta categoria senza la sua riga un errore di
`npm run build` — l'unico gate automatico che questo repository abbia.

### Il fallimento chiuso, che e' il contrario della porta

Ogni esito che non sia «spogliata con successo» **lancia**. Nessun ramo consegna
al chiamante i byte che ha ricevuto — asserito meccanicamente:
`grep -c "return input"` restituisce **0**.

La ragione e' scritta nel file, non solo qui: in `checkin-offline.md` il default
e' **ammettere**, perche' rifiutare un ospite valido avviene davanti a una fila e
l'errore e' recuperabile. Qui non c'e' fila, nessuno aspetta, e l'errore **non e'
recuperabile**: una volta che il file e' online le coordinate sono uscite. Le due
asimmetrie puntano in direzioni opposte **di proposito**.

### Cosa il file dichiara di NON coprire

**I video non passano di qui.** `video/mp4` e `video/quicktime` sono accettati
dalla superficie di caricamento del prodotto (`MediaUpload.tsx:9`), `sharp` non
li tratta, e un contenitore MP4 o MOV porta le coordinate in un atomo `udta`
esattamente come un JPEG le porta nell'EXIF. Un video caricato da dentro una sede
segreta **non e' sanificato da niente in questo repository**.

Il modulo esporta l'elenco dei tipi che sa trattare e restituisce un rifiuto —
mai un passaggio — su tutto il resto. **Cosa fare** di un video e' la decisione
del piano 35-20; il debito e' nominato e datato nel piano 35-14.

---

## Task 3 — il bucket, letto indietro invece che dedotto

Il vincolo che decide l'architettura, verificato alla fonte prima di scrivere:
il bucket `event-media` e' **pubblico**
(`20260225120000_phase7_media.sql:64-66`), il caricamento avviene **dal browser
direttamente allo storage** (`MediaUpload.tsx:160-162`), e il prodotto accetta
foto fino a 50 MB (`MediaUpload.tsx:11`) contro un tetto documentato di 4,5 MB
sul corpo di una richiesta serverless. **Far transitare i byte dentro una
richiesta HTTP verso il server non e' una scelta di stile: e' impossibile.**

### Cosa dice il database dopo aver applicato le 49 migration

```
== the bucket row, read back ==
           id           |          name          | public | file_size_limit
------------------------+------------------------+--------+-----------------
 artist-photos          | artist-photos          | t      |         5242880
 event-images           | event-images           | t      |
 event-media            | event-media            | t      |       104857600
 event-media-quarantine | event-media-quarantine | f      |       104857600
 venue-photos           | venue-photos           | t      |         5242880
```

**E' l'unico dei cinque bucket con `public = f`.** La riga sopra non e' dedotta
dal sorgente della migration: e' riletta da `storage.buckets`.

```
== every policy on storage.objects that names the quarantine bucket ==
               policyname               |  cmd   |      roles      | with_check_expr
----------------------------------------+--------+-----------------+---------------------------------
 event_media_quarantine_insert_approved | INSERT | {authenticated} | ((bucket_id = 'event-media-quarantine')
                                                                     AND ((SELECT get_user_status()) = 'approved'))

== count of read/delete policies mentioning the quarantine bucket (must be 0) ==
 0

== the four phase-7 policies on event-media, unchanged ==
 Admins can delete event media      | DELETE
 Anyone can view event media        | SELECT
 Members can delete own event media | DELETE
 Members can upload event media     | INSERT
```

Tre cose, e la terza e' quella che rende vere le prime due:

1. **Una sola policy** nomina la quarantena, ed e' un inserimento con lo
   **stesso** predicato che oggi vale sul bucket pubblico. Questo passo non
   allarga ne' restringe chi puo' caricare: sposta dove i byte atterrano per
   primi. *(`media-and-storage.md`, imperativo «when widening who may upload:
   treat it as an access change» — qui non si allarga niente.)*
2. **Zero** policy di lettura o cancellazione la nominano.
3. **Quello zero non e' vacuo**: la stessa query, sulla stessa tabella, trova le
   tre policy `SELECT`/`DELETE` di `event-media`. Il metro sa trovarle quando ci
   sono — e le quattro policy della fase 7 risultano **invariate**, che e' la
   verifica dell'additivita' sul lato che la cattura di baseline non guarda.

### L'idempotenza, provata

Seconda applicazione dello stesso file nello stesso container: **exit 0**, riga
del bucket invariata. La coda si applica a mano, una riga alla volta, e senza
`ON CONFLICT DO NOTHING` + `DROP POLICY IF EXISTS` una seconda esecuzione
solleverebbe `42710` e lascerebbe non applicato tutto cio' che segue (WR-04).

### La finestra dichiarata

Questo file **non toglie a nessuno** il permesso di scrivere in `event-media`.
Quella e' la **riga 15** della coda — `20260809006000_event_media_server_upload_only.sql`,
piano 35-21 — l'unica che si applica **dopo il deploy** del codice, perche'
applicarla prima romperebbe i caricamenti dei membri fino al deploy.

**Finche' la riga 15 non e' applicata, la spoglia e' aggirabile** scrivendo
direttamente nel bucket pubblico dal browser, esattamente come si fa oggi. E' una
finestra nota, la sua durata e' quella di un deploy, e sta scritta in testa alla
migration oltre che qui. `35-HUMAN-UAT.md` la registra gia' come prova 10,
falsa-positiva finche' quella riga non e' applicata.

---

## Deviazioni dal piano

### 1. [Rule 2 — validazione mancante] Il mime arriva dal browser, quindi e' una pretesa

- **Trovata durante:** task 2, scrivendo il ramo che sceglie l'encoder.
- **Il fatto:** il piano chiede di ri-codificare *«nello stesso formato del
  sorgente»*, e l'unico indizio sul formato che il chiamante possiede e' il
  `mime` — che su questo percorso viene da `file.type` del browser
  (`MediaUpload.tsx`), cioe' da un valore che l'utente controlla. Un file
  etichettato `image/jpeg` i cui byte sono altro sarebbe stato **transcodificato**
  in JPEG: un successo su un file che nessuno ha validato.
- **Cosa e' stato fatto:** `sharp` legge il formato che ha effettivamente
  decodificato e lo confronta con il tipo dichiarato; una divergenza e' un
  `MEDIA_STRIP_UNSUPPORTED_TYPE`, non una transcodifica. Un buffer vuoto muore
  nello stesso punto, perche' non ha formato.
- **Misurato:** byte PNG dichiarati `image/jpeg` → `decoded=png` → rifiuto.
- **Commit:** `b15592d`

### 2. [Rule 2 — un gate deve poter fallire] `sharp` con `import()` dinamico

- **Trovata durante:** task 2, elencando le situazioni che producono ogni
  categoria.
- **Il fatto:** con un `import` statico, un `sharp` non caricabile fa fallire il
  **caricamento del modulo**, non la funzione. `MEDIA_STRIP_TOOL_UNAVAILABLE`
  sarebbe stata una costante esportata che nessuna situazione raggiungibile
  produce — cioe' decorazione (`ai-engineering.md`).
- **Cosa e' stato fatto:** `import type { Sharp } from "sharp"` (cancellato al
  build) piu' un `await import("sharp")` dentro un `try`. La situazione e'
  reale: `sharp` distribuisce binari per piattaforma e un'installazione con
  l'architettura sbagliata fallisce al **caricamento**, non alla chiamata.
- **In piu':** un controllo a tempo d'esecuzione che cio' che e' stato caricato
  sia una funzione. Senza, un cambio di interop CommonJS→ESM del bundler
  arriverebbe come *«sharp is not a function»*, cioe' un crash **non
  categorizzato** sull'unico percorso dove un crash non deve diventare una via
  di passaggio.
- **Commit:** `b15592d`

### 3. [Rule 3 — un controllo che si autoannulla] Il docblock sta SOTTO gli import

- **Trovata durante:** task 2, rileggendo il criterio di accettazione.
- **Il fatto:** il criterio greppa `head -3` del file per `server-only`. Con
  l'ordine consueto — docblock del file, poi import — il controllo avrebbe letto
  tre righe di prosa e **fallito su un file che lo soddisfa**.
- **Cosa e' stato fatto:** i due import in testa, il docblock subito sotto, e la
  ragione scritta nella prima riga del docblock. Stessa scelta, e stesso
  precedente, di `35-02-SUMMARY.md` e `35-05-SUMMARY.md` deviazione 3: un
  controllo che va letto aggirandolo smette di essere letto.
- **Lo stesso vale nella migration** per le due clausole di policy che il
  criterio pretende assenti, e per l'alias sotto cui vivono i client di database
  in `strip-metadata.ts`: **descritti, mai scritti**, con la nota che dice
  perche'.
- **Commit:** `b15592d`, `ad3949e`

### 4. [Rule 3 — bloccante] Le tre catture di baseline non erano fra i `files_modified`

- **Trovata durante:** task 3, eseguendo il criterio di accettazione.
- **Il fatto:** `npm run baseline:container -- --phase-point=35-19` e' un
  criterio del piano e **scrive tre artefatti** in
  `.planning/phases/32-capability-model-in-the-database/baseline/`. Il piano
  elenca tre `files_modified` e non li comprende. Lasciarli non tracciati
  sarebbe stato lasciare output generato fuori dal repository.
- **Cosa e' stato fatto:** committati insieme alla migration, come ha fatto il
  piano 35-05 con le proprie.
- **Commit:** `ad3949e`

### 5. [Rule 3 — ambiente] Il worktree non aveva `node_modules`

- **Trovata durante:** task 1, al primo `npm ls sharp`, che rispondeva `(empty)`.
- **Cosa e' stato fatto:** un symlink dal worktree a `node_modules` del
  repository principale. `/node_modules` e' in `.gitignore` (riga 4): **nessuna
  modifica al repository**, e `git status` resta pulito.
- **Perche' va scritto:** attraverso il symlink, `npm ls` nel worktree stampa una
  freccia (`-> ./../../../node_modules/sharp`) che non comparirebbe in
  un'installazione normale. **L'output di audit riportato sopra e' quindi quello
  della radice reale del progetto**, non quello del worktree. Un audit letto
  attraverso un artefatto dell'ambiente di esecuzione non e' un audit.

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck | `npm run build` | **PASS** — `✓ Compiled successfully` |
| Lint del modulo nuovo | `npx eslint src/lib/media/strip-metadata.ts` | **PASS** — nessun output |
| `sharp` dichiarato alla riga di `next` | il `node -e` del piano | **PASS** — `SHARP_DECLARED_OK` |
| Una sola copia di `sharp` | `npm ls sharp` (radice reale) | **PASS** — `next@16.1.6 └── sharp@0.34.5` |
| `server-only` in testa | `head -3 <modulo>` | **PASS** — riga 1 |
| `sharp` importato | `grep -c 'from "sharp"'` | **PASS** — 1 |
| `.rotate()` presente | `grep -c "rotate()"` | **PASS** — 3 |
| Nessun ramo restituisce l'input | `grep -c "return input"` | **PASS** — **0** |
| Nessun client di database | `grep -c` sull'alias | **PASS** — **0** |
| I video sono dichiarati | `grep -ci "video"` | **PASS** — 7 |
| Le categorie esistono | `grep -c "MEDIA_STRIP"` | **PASS** — 19 |
| **La spoglia funziona davvero** | pipeline eseguita su un JPEG sintetico con EXIF | **PASS** — 318 byte di EXIF → **0**, marcatore `Exif` assente |
| **`.rotate()` conta** | la stessa pipeline senza `.rotate()` | **PASS** — 40×80 contro 80×40: il bug e' riprodotto, e non tocca l'EXIF |
| Il fixture era davvero mutato | `orientation` riletta prima di leggere l'esito | **PASS al secondo tentativo** — il primo fixture non aveva mutato |
| Il container decodificato si controlla | PNG dichiarato `image/jpeg` | **PASS** — `decoded=png`, rifiuto |
| Il buffer vuoto muore | `Buffer.alloc(0)` | **PASS** — `Error: Input Buffer is empty` |
| Il bucket e' privato | riletto da `storage.buckets` in container | **PASS** — `public = f`, l'unico dei cinque |
| Una sola policy sulla quarantena | `pg_policies`, schema `storage` | **PASS** — 1, `INSERT`, `{authenticated}` |
| Nessuna lettura, nessuna cancellazione | stessa query, `cmd in ('SELECT','DELETE')` | **PASS** — **0**, e la query trova le 3 di `event-media`, quindi non e' vacua |
| Le policy della fase 7 sono invariate | `pg_policies` | **PASS** — le quattro ci sono tutte |
| Idempotenza della migration | seconda applicazione dello stesso file | **PASS** — exit 0, bucket invariato |
| La cattura di baseline | `npm run baseline:container -- --phase-point=35-19` | **PASS** — exit 0, 72 policy, 23 tabelle, 322 letture, 966 scritture |
| L'additivita' su `public` | `baseline:compare` 35-05 → 35-19 | **PASS** — **ZERO differenze**, `CAP-03: clean` |
| Nessun file cancellato | `git diff --diff-filter=D HEAD~3 HEAD` | **PASS** — nessuna |

### Cosa queste verifiche NON provano

- **Nessuna migration di questa fase e' applicata in produzione.** Questa e' la
  riga 13 della coda manuale. Che gli oggetti si costruiscano in un container non
  dice che il prodotto funzioni con essi.
- **`npm run build` verde non dice niente sulla migration.** I tipi vengono da
  `src/types/database.ts`, non dal database vivo — e questa migration non tocca
  nessuna tabella di `public`, quindi non tocca quel file. Il verde e' esatto
  esattamente come lo era prima.
- **La cattura di baseline non misura la policy nuova.** B1, B2 e B3 sono limitati
  a `nspname = 'public'` (`scripts/rls-baseline.mjs:512, 526, 529`), e questa
  policy vive su `storage.objects`. Le **zero differenze** provano che la
  migration non muove niente in `public` — cioe' l'additivita' — non che la
  policy nuova sia giusta. Quella e' la lettura diretta di `pg_policies` riportata
  sopra, ed e' un'altra prova.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.**
- **Nessuna superficie chiama ancora `stripImageMetadata`.** Che la funzione
  spogli e' misurato; che venga invocata prima che un file diventi raggiungibile
  e' materia del piano 35-20, e che il bucket pubblico smetta di accettare
  scritture dal browser e' materia della riga 15.
- **`MEDIA_STRIP_TOOL_UNAVAILABLE` non e' stata esercitata.** E' raggiungibile
  per costruzione; non e' stata provocata.
- **La spoglia e' stata misurata su JPEG.** PNG e WebP passano per lo stesso
  `Record` totale e la stessa `.rotate()`, ma non sono stati eseguiti con un
  fixture proprio. E' una lacuna della misura, non una deduzione da colmare a
  parole: la chiude la UAT manuale (prova 10).

---

## Threat Flags

Le voci del threat register del piano, con come sono coperte:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-100 | mitigato | Pipeline eseguita: 318 byte di EXIF → 0, `Make`/`Copyright`/GPS assenti, marcatore `Exif` assente dai byte grezzi. `.rotate()` prima della ri-codifica, provata per mutazione nelle due direzioni |
| T-35-101 | mitigato | Bucket riletto da `storage.buckets`: `public = f`, l'unico dei cinque. Zero policy di lettura lo nominano, e la misura non e' vacua |
| T-35-102 | mitigato | Ogni esito diverso dal successo lancia; `grep -c "return input"` = 0; il `Record` totale rende una quarta categoria un errore di build |
| T-35-103 | mitigato | I video sono dichiarati non coperti **dentro** il file; l'elenco dei tipi trattabili e' esportato e un video ci sbatte come rifiuto. Debito nominato nel piano 35-14 |
| T-35-104 | mitigato | `sharp` dichiarato a `^0.34.4`, la stessa riga di `next@16.1.6`; `extraneous` sparito dall'output di `npm ls` dopo la modifica |
| T-35-105 | mitigato | La copertura e' scritta nel modulo, nella migration (finestra della riga 15) e in questo documento |
| T-35-SC | mitigato | **Nessun pacchetto installato.** Audit `[VERIFIED]` con l'output di `npm ls sharp` sopra; la riga aggiunta e' identica a quella gia' risolta e non produce un secondo scaricamento |

### Una superficie non prevista dal piano

| Flag | File | Descrizione |
|---|---|---|
| threat_flag: resource-exhaustion | `supabase/migrations/20260809004600_event_media_quarantine_bucket.sql` | Il bucket di quarantena e' **scrivibile** da ogni utente approvato e non ha nessuna policy di cancellazione: **solo il service role puo' svuotarlo**. Se lo spazzino del piano 35-20 non arriva, la quarantena cresce senza limite e ogni oggetto li' dentro e' un file **non spogliato** — irraggiungibile, ma presente, e quindi un costo di spazio e un dato che non doveva accumularsi. `media-and-storage.md`, gate *il volume e' un costo e un limite*: un video di una serata moltiplicato per i partecipanti e' banda e spazio reali. La migration dichiara che l'area e' di transito; **niente la ripulisce ancora**, e questa riga esiste perche' il piano 35-20 non lo scopra a valle |

---

## Known Stubs

Nessuno stub di codice: nessun valore vuoto codificato a mano, nessun
segnaposto, nessun `TODO`.

Tre dipendenze in avanti, dichiarate e non scoperte a valle:

1. **Nessuno chiama ancora `stripImageMetadata`.** La funzione e le sue categorie
   esistono; la rotta che le usa, e che trasforma una categoria in un **effetto
   osservabile** sullo schermo di chi carica, e' il piano 35-20. Senza error
   tracking in questo prodotto, una categoria che non arriva a uno schermo non
   arriva a nessuno — e il precedente del form newsletter
   (`.planning/codebase/CONCERNS.md`) e' quello da non ripetere.
2. **Il bucket pubblico accetta ancora scritture dal browser.** Finche' la riga 15
   non e' applicata, la spoglia e' aggirabile. Dichiarato in testa alla
   migration.
3. **I video non sono coperti**, e nessun piano di questa fase li copre. E' un
   debito nominato e datato, non una svista: la decisione su cosa farne e' del
   piano 35-20, e finche' non e' presa **nessun documento puo' dire che la
   sanitizzazione EXIF e' spedita**.

---

## Self-Check: PASSED

- `src/lib/media/strip-metadata.ts` — FOUND, 361 righe, `npm run build` verde, eslint pulito
- `supabase/migrations/20260809004600_event_media_quarantine_bucket.sql` — FOUND, applicata due volte in container con exit 0
- `package.json` — FOUND, contiene `"sharp": "^0.34.4"` in `dependencies`, **una sola riga aggiunta**
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-19.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-19.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-19.json` — FOUND
- commit `7573aa2` — FOUND
- commit `b15592d` — FOUND
- commit `ad3949e` — FOUND
- `.planning/STATE.md` e `.planning/ROADMAP.md` — **NON MODIFICATI**, come da contratto worktree
- Nessun file di prova nel repository: gli script di misura vivono in `/tmp` e non sono committati — verificato, `git status` pulito
- Nessuna coordinata reale, nessun nome di sede, nessuna data non annunciata in questo documento ne' nei file di questo piano
