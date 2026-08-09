---
phase: 35-per-night-assignments
plan: 20
subsystem: media-and-storage
tags: [exif, venue-secrecy, route-handler, fail-closed, service-role, wave-7]

# Dependency graph
requires:
  - plan: 35-16
    provides: "`mayUploadToParty(eventId, partyId)` — importato e mai riscritto — e le tre categorie che questa rotta ha l'obbligo esplicito di NON collassare in un unico 403"
  - plan: 35-19
    provides: "`stripImageMetadata`, le tre costanti di rifiuto, `STRIPPABLE_MIME_TYPES` (senza video) e il bucket privato `event-media-quarantine`"
  - plan: 35-18
    provides: "`event_media.party_id` e il trigger che rifiuta una riga senza serata — cioe' la ragione per cui questa rotta NON scrive la riga e la lascia a `registerMedia`"
provides:
  - "`POST /api/media/finalize` — l'unico percorso di persistenza verso il bucket pubblico, e passa dalla spoglia"
  - "17 categorie di rifiuto distinte, valori decisi per posizione, di cui **cinque importate** invece che ri-coniate"
  - "`FINALIZE_HTTP` e `FINALIZE_QUARANTINE` — due `Record` totali sull'unione: stato HTTP e destino dell'oggetto di transito"
  - "il ramo video: rifiuto quando `venue_secret` e' vero, **non leggibile** o la notte non esiste"
  - "un sniff del contenitore sul ramo video — l'unico ramo che scrive byte non spogliati"
affects: [35-21, 35-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "un criterio che confronta numeri di riga prova l'ORDINE, non la PROPRIETA': misurato, resta verde sul difetto esatto che esiste per impedire"
    - "una rotta che risponde «riprova» e cancella la sorgente non ha offerto un riprova: ha perso il caricamento"
    - "il destino di una risorsa dopo un rifiuto si dichiara per categoria in un Record totale, non si deriva dallo stato HTTP: sono due domande diverse"
    - "il mime dichiarato e' una pretesa anche dove non esiste un decoder — sul ramo che non spoglia, il contenitore si controlla dall'intestazione del box"
    - "un percorso che cancella una risorsa nominata dal chiamante deve cancellare solo cio' che ha gia' verificato essere suo, o il cleanup e' una primitiva di denial-of-service"

key-files:
  created:
    - src/app/api/media/finalize/route.ts
  modified: []

key-decisions:
  - "I byte NON attraversano la rotta, e il numero e' stato letto alla fonte il 2026-08-09: `https://vercel.com/docs/functions/limitations`, sezione *Request body size* — **4,5 MB** su corpo di richiesta o risposta, oltre il quale la funzione risponde `413 FUNCTION_PAYLOAD_TOO_LARGE`. Il prodotto accetta foto fino a 50 MB (`MediaUpload.tsx:11`). Il corpo e' quindi JSON e i byte arrivano dal bucket privato"
  - "**Cinque delle 17 categorie sono importate**, non ri-coniate: `MEDIA_PARTY_NOT_OF_EVENT` e `MEDIA_UPLOAD_FORBIDDEN` dal predicato, le tre `MEDIA_STRIP_*` dalla spoglia. Ri-scriverne una qui sarebbe una seconda definizione di una categoria che ha gia' un lettore"
  - "Il predicato per-notte distingue tre cose e questa rotta le tiene distinte, come il piano 35-16 le ha indirizzate per nome: `false` ⇒ 403, `media.party_not_of_event` ⇒ 400, qualunque altro lancio ⇒ **503 con categoria propria** — «la domanda non ha risposta» non e' «non puoi»"
  - "**L'oggetto di quarantena NON viene cancellato in ogni ramo.** I quattro esiti che dicono *richiedi di nuovo* lo conservano, perche' una rotta che risponde «riprova» dopo aver cancellato i byte ha perso il caricamento del membro invece di offrirgli un secondo tentativo. Dichiarato come `Record` totale, non derivato dallo stato HTTP"
  - "Il ramo video controlla il **contenitore** prima di scrivere. E' l'unico ramo che pubblica byte non spogliati, e senza quel controllo una foto etichettata `video/mp4` uscirebbe con le sue coordinate: il mime viene dal browser ed e' una pretesa anche dove non esiste un decoder"
  - "`contentType` esplicito sull'upload: senza, un `Buffer` viene archiviato come `text/plain` e il bucket pubblico servirebbe una foto come testo — la spoglia avrebbe funzionato e l'immagine sarebbe comunque rotta"
  - "Una chiave gia' occupata nel bucket pubblico e' una categoria **terminale propria** (409), mai un successo. Rispondere «fatto» per byte che questa chiamata non ha spogliato sarebbe l'unica forma che questo file esiste per impedire, e nessun criterio automatico la vedrebbe"
  - "Il nome del bucket pubblico e' scritto **inline** e non in una costante in testa: il criterio del piano confronta numeri di riga, e una costante in testa metterebbe il nome sopra la spoglia facendo fallire un file corretto. Stessa scelta, e stessa ragione, di `35-19-SUMMARY.md` deviazione 3"
  - "`venue_secret` letto con il **service role**: `event_parties_select_published` mostra a un member solo le serate di eventi pubblicati, quindi i privilegi del chiamante risponderebbero «nessuna riga» per una notte che esiste — una domanda sulla NOTTE trasformata in una domanda su CHI CHIEDE, che e' il difetto che il piano 35-18 ha misurato dentro una policy e sostituito con un accessor `SECURITY DEFINER`"

# Metrics
metrics:
  duration: "~45 min"
  completed: 2026-08-09
  tasks_completed: 1
  tasks_total: 1
  checkpoint_open: false
---

# Fase 35 Piano 20: il punto in cui i byte diventano pubblici — Summary

La spoglia esisteva dal piano 35-19 e **non la chiamava nessuno**; il posto dove
i byte possono aspettare senza essere raggiungibili esisteva e nessuno ci
passava. Questo piano scrive il pezzo che li mette in fila e lo rende **l'unico
percorso** verso il bucket pubblico: autorizza sulla notte, preleva dalla
quarantena, spoglia, scrive, pulisce — e in ogni altro caso rifiuta.

Un solo file, nuovo, interamente applicativo: nessuna migration, nessuna policy,
nessun pacchetto.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | `POST /api/media/finalize` — autorizza, spoglia, scrive, e in ogni altro caso rifiuta | `89d3fe5` | `src/app/api/media/finalize/route.ts` (nuovo, 727 righe) |

**Lingua.** I commenti del file sono in inglese, come l'intera famiglia che
tocca — `strip-metadata.ts`, `may-upload.ts`, `api/tickets/checkin/route.ts`. La
prosa di questo documento e del messaggio di commit e' italiana.

---

## Il vincolo che decide la forma, letto alla fonte e non ricordato

Il piano chiede di **verificare il tetto alla fonte prima di scriverlo** e di
riportare dove e' stato letto. Fatto il **2026-08-09**, con Firecrawl su
`https://vercel.com/docs/functions/limitations`, sezione **Request body size**:

> *«The maximum payload size for the request body or the response body of a
> Vercel Function is 4.5 MB. If a Vercel Function receives a payload in excess of
> the limit it will return an error 413: `FUNCTION_PAYLOAD_TOO_LARGE`»*

Contro i **50 MB** che il prodotto accetta per una foto
(`src/components/media/MediaUpload.tsx:11`) e i 500 MB per un video (`:12`).
**Far transitare il file dentro la richiesta non e' una scelta di stile: e'
impossibile.** Il numero, la pagina e la data stanno nell'intestazione del file,
perche' il primo che passa a «semplificare» la rotta accettando il file la
troverebbe funzionante su ogni foto di prova e rotta in produzione, su una foto
grande, a serata finita.

---

## Le 17 categorie, e le cinque che non sono state coniate qui

`meta-gates.md`, *zero fallimenti silenziosi*: il piano ne chiedeva almeno sei.
Ce ne sono **17**, e la parte che conta e' che **cinque sono importate**.

| Categoria | Stato | Sorgente | Quarantena |
|---|---|---|---|
| `media_finalize.unauthenticated` | 401 | questa rotta | rimossa |
| `media_finalize.malformed_request` | 400 | questa rotta | rimossa |
| `media_finalize.path_not_yours` | 403 | questa rotta | rimossa |
| `media.party_not_of_event` | 400 | **35-16** | rimossa |
| `forbidden.media_upload_required` | 403 | **35-16** | rimossa |
| `media_finalize.permission_unresolved` | 503 | questa rotta | **conservata** |
| `media_finalize.source_missing` | 404 | questa rotta | rimossa |
| `media_finalize.source_unreadable` | 503 | questa rotta | **conservata** |
| `media_finalize.type_not_accepted` | 415 | questa rotta | rimossa |
| `media_finalize.container_mismatch` | 415 | questa rotta | rimossa |
| `media_finalize.video_on_secret_night` | 422 | questa rotta | rimossa |
| `media_finalize.already_published` | 409 | questa rotta | rimossa |
| `media_finalize.publish_failed` | 503 | questa rotta | **conservata** |
| `media_finalize.unexpected` | 500 | questa rotta | **conservata** |
| `media_strip.unsupported_type` | 415 | **35-19** | rimossa |
| `media_strip.tool_unavailable` | 503 | **35-19** | **conservata** |
| `media_strip.failed` | 422 | **35-19** | rimossa |

**I due obblighi che il piano 35-16 aveva indirizzato a questo piano per nome,
entrambi soddisfatti:**

1. **`mayUploadToParty` e' importato, non riscritto.** Un solo predicato letto
   da tre chiamanti — le due Server Action e questa rotta. Misurato: zero
   occorrenze di `CAP.MEDIA_UPLOAD`, `revoked_at`, `ends_at` e
   `from("attendance")` in questo file.
2. **Le tre cose che il predicato distingue restano distinte.** Il verdetto di
   permesso e' 403; la coppia incoerente e' 400 con la sua categoria; **qualunque
   altro lancio del predicato e' 503 con la sua**, perche' *«la domanda non ha
   ricevuto risposta»* non e' *«non puoi»*. Collassarle in un 403 avrebbe detto a
   un master, in un minuto storto del database, che non puo' caricare.

Le categorie escono come **valore** nel campo `reason` della risposta, mai come
frase. Il motivo scritto accanto e' duplice: Next redige i messaggi in un build
di produzione, e **questo prodotto non ha error tracking** — quindi un
`console.error` qui raggiunge un log che nessuno guarda. L'effetto osservabile e'
la categoria sullo schermo di chi carica, ed e' **materia del piano 35-21**
(T-35-113): finche' non atterra, un rifiuto qui e' un caricamento fallito con una
riga di log e nient'altro. Detto invece che lasciato scoprire.

---

## Deviazioni dal piano

### 1. [Rule 1 — un «riprova» che cancella cio' che si dovrebbe ritentare] la pulizia non e' in ogni ramo

- **Il piano chiede:** *«L'oggetto di quarantena viene cancellato sia dopo un
  successo sia dopo un rifiuto, in un `finally`»*.
- **Il fatto:** quattro dei diciassette esiti — permesso non risolto, sorgente
  non leggibile, scrittura fallita, causa imprevista — rispondono **503 o 500**,
  cioe' *«richiedi di nuovo»*. Cancellare la sorgente in quei rami rende il
  secondo tentativo **impossibile**: il membro dovrebbe ricaricare da capo fino a
  50 MB da un telefono. Una rotta che dice riprova e distrugge cio' con cui si
  ritenta non ha offerto un riprova.
- **Cosa e' stato fatto:** un **secondo `Record` totale** sull'unione,
  `FINALIZE_QUARANTINE`, che dichiara per ogni categoria se l'oggetto va
  `remove` o `keep`. Ogni esito terminale rimuove; i quattro che chiedono di
  riprovare conservano.
- **Perche' un secondo `Record` e non `FINALIZE_HTTP[r] >= 500`:** la
  derivazione ri-deciderebbe in silenzio questa domanda ogni volta che qualcuno
  cambia uno stato HTTP, e le due domande non sono la stessa. Il `Record` totale
  obbliga una categoria nuova a **dichiarare** che ne e' dei byte, a tempo di
  build. Che oggi le due risposte coincidano e' un'osservazione — asserita nei
  controlli sotto — non il meccanismo.
- **Il costo, nominato:** un oggetto lasciato in un bucket **privato e senza
  policy di lettura per nessuno** e' spazio, non divulgazione (T-35-114). E' la
  stessa disposizione che il piano gia' accettava, applicata a quattro rami in
  piu'.

### 2. [Rule 2 — validazione mancante sull'unico ramo che non spoglia] il contenitore del video

- **Trovata durante:** scrivendo il bivio del tipo.
- **Il fatto:** il piano sceglie il ramo sul **mime dichiarato**, che viene da
  `file.type` del browser. Sul ramo immagine la spoglia confronta gia' il
  contenitore decodificato con la pretesa (35-19, deviazione 1). Sul ramo
  **video** non lo fa niente — ed e' il ramo che scrive i byte **non spogliati**.
  Conseguenza misurabile: etichettare `video/mp4` una fotografia la pubblica con
  le sue coordinate intatte, saltando l'intero gate.
- **Cosa e' stato fatto:** prima di scrivere, i byte devono cominciare con un
  box di livello superiore ISO-BMFF / QuickTime (`ftyp`, `moov`, `mdat`, `free`,
  `skip`, `wide`, `pnot`). Altrimenti `media_finalize.container_mismatch`.
- **Il falso rifiuto possibile, dichiarato invece che incontrato:** un vecchio
  file QuickTime il cui primo box non e' fra questi viene rifiutato. La
  direzione dell'errore e' quella sicura su questo percorso, e il rifiuto porta
  la sua categoria invece di leggersi come un guasto.

### 3. [Rule 1 — una spoglia riuscita e un'immagine rotta] `contentType` esplicito

- **Il fatto:** `supabase-js` archivia un `Buffer` senza `contentType` come
  `text/plain`. Il bucket pubblico servirebbe quindi la foto **come testo**: la
  spoglia avrebbe funzionato, il gate sarebbe soddisfatto, e l'immagine non si
  vedrebbe. Un fallimento silenzioso con la faccia di un successo.
- **Cosa e' stato fatto:** `contentType: mimeType` sull'upload, dove `mimeType`
  a quella riga e' gia' stato confrontato con il contenitore reale su **entrambi**
  i rami.

### 4. [Rule 2 — una chiave gia' occupata] `already_published` e' terminale, mai un successo

- **Il fatto:** con `upsert: false`, una chiave gia' presente fa fallire la
  scrittura. Trattarla come «gia' fatto, rispondi ok» sarebbe comodo e sarebbe
  **l'unica forma che questo file esiste per impedire**: un successo dichiarato
  su byte che questa chiamata non ha spogliato. Nessun criterio automatico lo
  vedrebbe.
- **Cosa e' stato fatto:** categoria propria, **409**, terminale, e l'oggetto di
  quarantena viene rimosso perche' i byte a quella chiave sono gia' pubblici e
  tenerne una copia in transito non serve a niente.

### 5. [Rule 3 — un controllo che si autoannulla] il bucket pubblico e' scritto inline

- **Il fatto:** il criterio del piano confronta il numero di riga dell'ultima
  chiamata alla spoglia con quello della **prima** occorrenza del nome del bucket
  pubblico. Una costante `const PUBLIC_BUCKET = …` in testa al file — la forma
  ovvia — metterebbe quel nome sopra la spoglia e **farebbe fallire un file
  corretto**.
- **Cosa e' stato fatto:** il bucket di quarantena e' una costante (le sue righe
  contengono `quarantine`, che il criterio esclude); il bucket pubblico e'
  scritto **inline, una volta sola**, nell'unico punto che scrive, con il
  paragrafo che dice perche' l'asimmetria non e' sciatteria. Stessa scelta, e
  stesso precedente, di `35-02`, `35-05` e `35-19` deviazione 3.
- **Provato per mutazione:** aggiungendo quella costante in testa, il criterio
  passa da `FINALIZE_ORDER_OK` a `FINALIZE_ORDER_FAIL` (`S=576`, `U=149`).

### 6. [scelta dichiarata] `fileSize` e' accettato e non letto

Il piano lo elenca nel corpo. Resta nell'`interface` — il contratto con il piano
35-21 e' visibile — e **non decide niente**: l'unica dimensione che conta e' la
lunghezza dei byte effettivamente scaricati, e una dimensione annunciata dal
chiamante e' una pretesa. Asserito: zero occorrenze di `body.fileSize` fuori dal
commento che ne spiega l'assenza.

### 7. [Rule 3 — ambiente] il worktree non aveva `node_modules`

Un symlink al `node_modules` del repository principale. `/node_modules` e' in
`.gitignore:4`: **nessuna modifica al repository**, `git status` resta pulito.

---

## Verifiche eseguite

### I criteri del piano

| Verifica | Comando / misura | Esito |
|---|---|---|
| Build e typecheck | `npm run build` | **PASS** — `✓ Compiled successfully`, e la rotta compare come `ƒ /api/media/finalize` |
| Lint | `npx eslint src/app/api/media/finalize/route.ts` | **PASS** — nessun output, exit 0 |
| Runtime dichiarato | `grep 'runtime = "nodejs"'` | **PASS** |
| La spoglia e' importata | `grep 'stripImageMetadata'` | **PASS** |
| Il predicato e' importato | `grep 'mayUploadToParty'` | **PASS** |
| La segretezza e' letta | `grep 'venue_secret'` | **PASS** |
| Nessuna stringa d'errore generica | il grep del piano | **PASS** — nessuna occorrenza |
| Il numero e la sua ragione | `grep -E '4[.,]5'` | **PASS** |
| Nessuna riga scritta | `grep 'from("event_media")'` | **PASS** — **0** |
| La spoglia precede la scrittura | confronto di numeri di riga | **PASS** — `S=575 < U=662`, `FINALIZE_ORDER_OK` |
| Almeno sei categorie distinte | conteggio delle costanti | **PASS** — **17** (12 proprie + 5 importate) |

### I criteri strutturali — 23 asserzioni, e perche' esistono

Il piano non prevede nessun checkpoint umano su questo file, quindi i criteri
sono **l'unica guardia automatica** che avra'. Il criterio del piano confronta
numeri di riga: prova un **ordine**, non una **proprieta'**. Le asserzioni sotto
sono state eseguite sul file finale, tutte verdi:

| Gruppo | Asserzione | Esito |
|---|---|---|
| La scrittura | esiste **una sola** `.upload(` in tutto il file | PASS |
| | esiste **una sola** `.from(<bucket pubblico>)` | PASS |
| | l'upload scrive `bytesToPublish` | PASS |
| | l'upload **non nomina** `sourceBytes` | PASS |
| I byte | `bytesToPublish` e' assegnato **esattamente due volte** | PASS |
| | una assegnazione e' l'uscita della spoglia (riga 575) | PASS |
| | l'altra e' il ramo video (riga 641) | PASS |
| Il ramo video | il sniff del contenitore precede quell'assegnazione (596 < 641) | PASS |
| | il rifiuto per segretezza la precede (631 < 641) | PASS |
| | il guardiano ammette **solo** un `venue_secret` esattamente `false` | PASS |
| | rifiuta anche una lettura fallita | PASS |
| | rifiuta anche una notte inesistente | PASS |
| Le uscite | esistono **due sole** `NextResponse.json(` | PASS |
| | una e' il successo, l'altra e' dentro `refuse()` | PASS |
| La pulizia | `ownedQuarantinePath` e' assegnato **una volta sola** | PASS |
| | il rifiuto di proprieta' del path **precede** quell'assegnazione | PASS |
| | esiste **una sola** `.remove(`, e prende solo la chiave verificata | PASS |
| I due Record | coprono **lo stesso insieme** di 17 chiavi | PASS |
| | ogni braccio dell'unione ha entrambe le voci | PASS |
| | ogni `keep` corrisponde a un esito ≥ 500, e viceversa | PASS |
| Il corpo | `body.fileSize` non e' letto in nessuna riga di codice | PASS |

> **Due di queste asserzioni erano sbagliate alla prima esecuzione, e non nel
> file.** Il filtro che cercava «l'assegnazione grezza» matchava anche la riga
> della spoglia (che nomina `sourceBytes` come argomento), e quello sul corpo
> contava l'occorrenza dentro il commento che ne spiega l'assenza. Corretti i
> controlli, non il file. E' lo stesso genere di difetto che il piano 35-17 ha
> registrato, nella direzione opposta: un criterio che fallisce su un file
> corretto viene disattivato, e da quel momento non guarda piu' niente.

### Le tre prove per mutazione — un controllo che non puo' fallire e' decorazione

`ai-engineering.md`, gate *prova per mutazione*. Ogni mutazione e' stata
**asserita come applicata** prima di leggerne l'esito, e il file e' stato
ripristinato e verificato per hash (`sha256[:16] = 0bce7f8d47e4dd73`, identico
prima e dopo).

| # | Mutazione | Cosa deve scattare | Esito |
|---|---|---|---|
| **M1** | una costante col nome del bucket pubblico aggiunta in testa | il criterio d'ordine del piano | **scattato** — `FINALIZE_ORDER_FAIL` (`S=576`, `U=149`) |
| **M2** | `.upload(quarantinePath, sourceBytes, …)` — **pubblica i byte non spogliati** | qualcosa | **il criterio del piano resta VERDE** (`FINALIZE_ORDER_OK`); scattano **due** asserzioni strutturali |
| **M3** | una voce tolta da `FINALIZE_QUARANTINE` | `npm run build` | **scattato** — `Type error … does not satisfy the expected type 'Record<FinalizeRefusal, "remove" \| "keep">'`, riga 293 |

**M2 e' il risultato che conta, e va letto per intero.** Il criterio che il piano
scrive per garantire *«la spoglia precede ogni scrittura»* **resta verde mentre
il file pubblica i byte originali**: la chiamata alla spoglia e' ancora sopra la
scrittura, semplicemente il suo risultato non viene usato. E' esattamente la
forma di difetto che il piano 35-17 ha trovato — un criterio che la cosa che
sorveglia puo' soddisfare — e le asserzioni strutturali sono la ragione per cui
qui non passa.

### Cosa queste verifiche NON provano

- **La rotta non e' stata eseguita.** Nessuna richiesta e' stata fatta a
  `/api/media/finalize`: il bucket `event-media-quarantine` e' la **riga 13**
  della coda manuale di `35-HUMAN-UAT.md` e **non e' applicata**, quindi oggi il
  download risponderebbe con un bucket inesistente. Tutte le prove qui sopra sono
  **statiche** — build, lint, lettura del file, conteggi e mutazioni.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.** Non
  si dica mai che questa rotta e' verificata «perche' i test passano».
- **Un `npm run build` verde non dice niente sulle due query.** Nessun client
  Supabase di questo repository e' parametrizzato con `Database`, quindi il
  compilatore non ha mai visto ne' `venue_secret` ne' i due bucket. Che la
  lettura funzioni lo dira' il database.
- **Nessuno chiama ancora questa rotta.** `MediaUpload.tsx` scrive tuttora
  **dritto nel bucket pubblico** e non conosce ne' la quarantena ne' questo
  endpoint: e' il piano 35-21, wave 8. Fino ad allora la rotta esiste, e' corretta
  per quanto si puo' misurare staticamente, e non e' sul percorso di nessuno.
- **La finestra dichiarata dal piano 35-19 resta aperta e questa rotta non la
  chiude.** Finche' `20260809006000_event_media_server_upload_only.sql` — la
  **riga 15**, l'unica che si applica **dopo** il deploy — non e' applicata, la
  spoglia e' **aggirabile** scrivendo dal browser nel bucket pubblico, e la porta
  e' `20260225120000_phase7_media.sql:70-75`. Sta scritto nell'intestazione del
  file oltre che qui. `35-HUMAN-UAT.md` la registra come prova 10, falsa-positiva
  finche' quella riga non e' applicata.
- **Il sniff del contenitore video non e' stato esercitato su un file reale.** E'
  raggiungibile per costruzione e la sua logica e' otto byte di intestazione, ma
  nessun MP4 e nessun MOV sono passati di li'. Dichiarato invece che lasciato
  credere.
- **`media_finalize.unexpected` e `media_strip.tool_unavailable` non sono state
  provocate.** Raggiungibili per costruzione, non esercitate.

### Procedura manuale, per quando la coda sara' applicata

Serve perche' questo tocca il segreto di una sede e il repository non ha test.
Con le righe 7, 13 e 15 della coda applicate e i piani 35-20/35-21 in deploy:

1. Con un account `staff` **assegnato come «photo» alla notte A**: caricare una
   **foto** su A → la foto compare, e il file scaricato dal bucket pubblico **non
   contiene EXIF** (verificabile con `exiftool` sul file scaricato).
2. La stessa foto verso la **notte B** dello stesso evento → rifiuto
   `forbidden.media_upload_required`.
3. Un **video** verso una notte con `venue_secret = true` → rifiuto
   `media_finalize.video_on_secret_night`.
4. Lo stesso video verso una notte con `venue_secret = false` → passa, **non
   spogliato**. E' il limite dichiarato (35-14, voce 6): il file caricato porta
   ancora le sue coordinate.
5. Una foto rinominata `.mp4` e dichiarata `video/mp4` verso una notte non
   segreta → rifiuto `media_finalize.container_mismatch`.
6. Chiamare la rotta con il `quarantinePath` **di un altro account** → rifiuto
   `media_finalize.path_not_yours`, **e l'oggetto dell'altro account e' ancora
   li'**: questa e' la parte da guardare, non il codice di stato.
7. Dopo ogni rifiuto terminale: l'oggetto di quarantena **non c'e' piu'**. Dopo
   un 503: **c'e' ancora**.

---

## Threat Flags

Le voci del threat register del piano, con come sono coperte. **Tutte le prove
sono statiche**, per la ragione detta sopra.

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-108 | mitigato | La spoglia precede la scrittura (`S=575 < U=662`) **e** i byte scritti sono la sua uscita: `bytesToPublish` assegnato due volte, l'upload non nomina mai `sourceBytes`. La seconda meta' e' quella che M2 dimostra necessaria |
| T-35-109 | mitigato | Tre segmenti, i primi due l'evento del corpo e **l'id di chi chiama**; il terzo senza `/`, senza caratteri di controllo, mai `.` ne' `..`. Categoria propria (403) |
| T-35-110 | mitigato | `mayUploadToParty` importato; zero riscritture (nessuna occorrenza di `CAP.MEDIA_UPLOAD`, `revoked_at`, `ends_at`, `from("attendance")`) |
| T-35-111 | mitigato | Rifiuto se `venue_secret` e' vero, **se la lettura fallisce** o se la notte non esiste — asserito come `partyError \|\| !party \|\| venue_secret !== false`, cioe' ammette solo un `false` esplicito. Il caso `false` e' un limite dichiarato e datato accanto alla riga |
| T-35-112 | mitigato | Nessun ramo scrive i byte ricevuti su un'immagine; le tre categorie della spoglia arrivano al client separate; una `already_published` non diventa un successo |
| T-35-113 | **parzialmente coperto, e la parte scoperta ha un nome** | La categoria torna al client nel campo `reason`. **Che diventi una frase su uno schermo e' il piano 35-21**; finche' non atterra, un rifiuto e' un log che nessuno legge |
| T-35-114 | accettato, e con quattro rami in piu' | Il bucket e' privato e senza policy di lettura. L'oggetto e' rimosso in ogni esito terminale e **conservato** nei quattro che chiedono di riprovare — deviazione 1. Lo spazzino degli oggetti abbandonati e' il piano 35-14, voce 11 |
| T-35-SC | mitigato | **Nessun pacchetto installato**: `package.json` non e' fra i file modificati. `@supabase/storage-js` e' transitiva e non viene importata — i suoi errori sono letti **per forma** e mai per classe, per non ricreare la dipendenza fantasma che il piano 35-19 task 1 ha rimosso per `sharp` |

### Superfici non previste dal piano

| Flag | File | Descrizione |
|---|---|---|
| threat_flag: unsanitised-bypass | `src/app/api/media/finalize/route.ts` | Il ramo video scrive byte **non spogliati** e sceglieva il ramo sul **mime dichiarato dal browser**. Senza un controllo del contenitore, etichettare `video/mp4` una fotografia la pubblicherebbe con le sue coordinate, saltando il gate su **qualunque** notte — segreta o no. **Chiuso in questo piano** dal sniff ISO-BMFF (deviazione 2); registrato qui perche' e' una superficie che il threat register del piano non elencava |
| threat_flag: dos-primitive | `src/app/api/media/finalize/route.ts` | La pulizia cancella un oggetto **nominato dal chiamante**. Se la cancellazione avvenisse su un path non verificato, ogni account approvato potrebbe distruggere il caricamento in corso di chiunque altro conoscendone la chiave — che e' **derivabile**. **Chiuso in questo piano**: `ownedQuarantinePath` resta `null` finche' il controllo di proprieta' non e' passato, asserito meccanicamente (una sola assegnazione, preceduta dal rifiuto) |

---

## Constatazioni fra piani

Nessun file fuori dai miei `files_modified` e' stato toccato. `STATE.md`,
`ROADMAP.md` e `deferred-items.md` non compaiono nel diff.

1. **Il piano 35-21 eredita l'effetto osservabile.** Questa rotta restituisce
   `{ ok: false, reason }` con **17** categorie possibili e uno stato HTTP per
   ognuna. Se il client le collassasse in un unico messaggio, il lavoro fatto qui
   sarebbe annullato dal chiamante — ed e' esattamente il precedente registrato in
   `.planning/codebase/CONCERNS.md`. Le tre che un membro incontrera' davvero
   sono `forbidden.media_upload_required`, `media_finalize.video_on_secret_night`
   e le tre `media_strip.*`; le altre dicono *riprova* o *e' un bug*.
2. **Il piano 35-21 deve anche mandare i campi giusti.** Il corpo e'
   `{ eventId, partyId, quarantinePath, mimeType, fileSize }`, il `quarantinePath`
   **deve** essere `${eventId}/${userId}/<nome>` con l'`userId` di chi chiama, e
   il `mimeType` deve essere quello dichiarato al momento del caricamento in
   quarantena. La risposta di successo porta il `path` da passare a
   `registerMedia`.
3. **La rotta non chiude l'orfano del piano 35-16, lo sposta — e la nuova forma
   non ha ancora un piano.** Con la riga 15 applicata il browser smette di
   scrivere nel bucket pubblico, quindi l'orfano **non spogliato** sparisce. Resta
   la finestra fra questa rotta e `registerMedia`: se la registrazione fallisce,
   un oggetto **gia' spogliato** resta nel bucket pubblico, con path derivabile e
   nessuna riga che lo governi — quindi nessuna moderazione. Non e' una
   divulgazione di coordinate, ma e' un file di una serata raggiungibile per URL e
   fuori revisione. **E' la stessa classe che `media-and-storage.md` gia' nomina**
   (gate *moderazione = rimozione*: rifiutare cambia la riga, non l'oggetto),
   quindi e' preesistente e piu' larga di questa fase. **Non e' fra le dodici voci
   del piano 35-14**, e questa riga esiste perche' quel piano — che legge questo
   SUMMARY per costruzione — possa aggiungerla come tredicesima invece di
   scoprirla a valle.
4. **`UUID_PATTERN` e' ora scritto in tre file.** `api/tickets/checkin/route.ts:75`,
   `api/tickets/checkin/undo/route.ts:23` e questo. Il piano 35-16 ha
   deliberatamente evitato una terza copia delegando al resolver; qui serve anche
   per l'`eventId`, che nessun resolver valida. Sollevarlo in un modulo condiviso
   toccherebbe due file di altri piani di questa stessa wave: **non fatto**, e
   segnalato.
5. **L'elenco dei mime video e' ora scritto in due posti.** `MediaUpload.tsx:9` e
   questo file. Il primo non e' importabile — e' un componente `"use client"` — e
   i due devono muoversi insieme. L'elenco delle immagini **non** e' duplicato:
   `STRIPPABLE_MIME_TYPES` e' esportato dal modulo che lo possiede.
6. **Il piano 35-22 non tocca nessuno di questi file.** Nessun conflitto
   osservato: il suo file e' `api/tickets/checkin/route.ts`, che qui e' stato solo
   **letto**.

---

## Known Stubs

Nessuno stub di codice: nessun valore vuoto codificato a mano, nessun
segnaposto, nessun `TODO`, nessun `FIXME`.

Tre dipendenze in avanti, dichiarate e non lasciate a valle:

1. **Nessuno chiama questa rotta.** `MediaUpload.tsx` scrive ancora dritto nel
   bucket pubblico: e' il piano 35-21.
2. **La categoria non raggiunge ancora uno schermo.** Senza error tracking, un
   rifiuto oggi e' una riga di log e nient'altro — piano 35-21.
3. **Il bucket di quarantena non esiste in produzione.** Riga 13 della coda
   manuale. Applicarla **prima** del deploy non rompe niente (nessuno scrive
   ancora li'); applicare la **riga 15** prima del deploy romperebbe i
   caricamenti dei membri, ed e' scritto in testa a quella migration.

---

## Self-Check: PASSED

- `src/app/api/media/finalize/route.ts` — FOUND, 727 righe, `npm run build`
  verde, `eslint` pulito
- commit `89d3fe5` — FOUND, un solo file, **nessuna cancellazione**
  (`git diff --diff-filter=D HEAD~1 HEAD` vuoto)
- `git status --short` — pulito, nessun file non tracciato
- Nessuna migration modificata, nessun pacchetto installato (`package.json` non
  e' nel diff)
- `.planning/STATE.md`, `.planning/ROADMAP.md` e `deferred-items.md` — **NON
  MODIFICATI**, come da contratto worktree
- Il file e' identico al suo stato pre-mutazioni: `sha256[:16] =
  0bce7f8d47e4dd73`, verificato dopo il ripristino
- Nessuna coordinata reale, nessun nome di sede, nessun nome di file reale,
  nessuna didascalia, nessuna data non annunciata in questo documento ne' nel
  file di questo piano: solo ruoli
