---
phase: 45-production-sections-section-by-section
plan: 17
subsystem: media-and-storage
tags: [supabase-storage, signed-urls, exif, sharp, rls, capabilities, next-server-actions]

requires:
  - phase: 45-04
    provides: "il bucket privato `visual-archive`, terzo bucket, con un solo braccio di lettura dietro la chiave della sezione visual"
  - phase: 45-08
    provides: "l'applicazione in produzione di quella migration, con read-back di `storage.buckets` e `pg_policies`"
  - phase: 45-12
    provides: "la superficie `/admin/visual` e il segnaposto che questo piano sostituisce"
  - phase: 45-15
    provides: "`visual/actions.ts`, il gate `assertVisualSection` e la forma dei rifiuti che questo piano estende"
  - phase: 45-16
    provides: "il pannello di export, che questo piano non tocca — l'archivio non fa parte di cio' che esce"
provides:
  - "un secondo predicato, `mayUploadToVisualSection()`, senza serata — e la prova meccanica che il primo non e' stato allargato"
  - "`src/lib/media/finalize.ts`: una sola implementazione di raccogli-spoglia-scrivi, con la destinazione obbligatoria e senza default"
  - "`POST /api/media/finalize-archive`: l'arm che archivia invece di pubblicare"
  - "`ArchiveUpload.tsx`: il deposito in quarantena e il post della chiave, senza byte in una Server Action"
  - "`recordVisualAsset` e `signVisualAssets`: la riga e le miniature, entrambe dietro la chiave della sezione"
  - "`src/lib/media/upload-limits.ts`: tetto e tipi in un posto solo, importati da tutti e due gli uploader"
affects: [45-18, media-and-storage, venue-secrecy, legal-compliance]

tech-stack:
  added: []
  patterns:
    - "sequenza condivisa con destinazione come argomento obbligatorio senza default"
    - "gate `unstrippable` esplicito: l'unica uscita dallo spoglio va chiesta per nome"
    - "miniature su bucket privato via `createSignedUrls` con il client legato al cookie"
    - "risposta della firma indicizzata per id di riga, mai per chiave di storage"

key-files:
  created:
    - src/lib/media/finalize.ts
    - src/lib/media/upload-limits.ts
    - src/lib/production/sections/visual-archive.ts
    - src/app/api/media/finalize-archive/route.ts
    - src/app/(admin)/admin/visual/ArchiveUpload.tsx
  modified:
    - src/lib/media/may-upload.ts
    - src/app/api/media/finalize/route.ts
    - src/app/(admin)/admin/visual/actions.ts
    - src/app/(admin)/admin/(work)/visual/page.tsx
    - src/components/media/MediaUpload.tsx
    - scripts/verify-media-strip.mjs

key-decisions:
  - "D-45-17-01 — un secondo predicato e non una serata nullable: `mayUploadToParty` resta con la firma invariata, asserita meccanicamente"
  - "D-45-17-02 — la sequenza raccogli-spoglia-scrivi estratta in un modulo, con la destinazione argomento obbligatorio e nessun default"
  - "D-45-17-03 — `verify-media-strip` segue la sequenza dove si e' spostata: B misura il modulo, A vede chi passa il nome del bucket, F nuovo"
  - "D-45-17-04 — `signVisualAssets` in batch invece di una firma per riga: l'archivio si riempie ogni giovedi', un atto per riga sarebbe N round trip per render"
  - "D-45-17-05 — il client legato al cookie firma le miniature, non il service role: cosi' il braccio della policy e' il confine e non solo il messaggio"

patterns-established:
  - "Pattern: destinazione obbligatoria senza default — un default di destinazione e' il bug che pubblica una foto d'archivio"
  - "Pattern: una firma che scade invece di una URL, con la durata scritta accanto alla sua ragione"
  - "Pattern: assenza dichiarata invece di frame rotto — i due sono indistinguibili per chi guarda"

requirements-completed: [PROD-02]

duration: 24min
completed: 2026-08-17
---

# Fase 45 Piano 17: L'archivio delle foto dj — Summary

**Una foto dj si archivia dalla sezione visual, atterra spogliata dei metadati in un bucket privato, e si vede solo attraverso una firma che il server conia per cinque minuti dietro la chiave della sezione.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-08-17T21:09Z
- **Completed:** 2026-08-17T21:33Z
- **Tasks:** 2 / 2
- **Files modified:** 11 (5 creati, 6 modificati)

---

## Cosa succede ai metadati dell'immagine su questo percorso — con l'evidenza

Questa e' la domanda che il piano chiede di chiudere per prima, e la risposta e'
**spoglia, sempre, prima che il file sia raggiungibile**.

**Il meccanismo, riga per riga:**

- `src/lib/media/finalize.ts:246-360` e' l'unica implementazione della sequenza.
  L'ordine e' il contratto: scarica dalla quarantena (`:266-268`), spoglia
  (`:294`), scrive (`:348-353`). La scrittura e' l'ultima istruzione.
- Il ramo immagine **non puo' restituire i byte che ha ricevuto**:
  `stripImageMetadata` o torna con un buffer nuovo o solleva un rifiuto
  categorizzato, e ognuno dei tre rifiuti dello stripper esce con il proprio
  nome (`finalize.ts:290-311`).
- L'unica uscita dallo spoglio e' il gate `unstrippable`, che va **chiesto per
  nome** nell'argomento. L'archivio passa `null`
  (`finalize-archive/route.ts:361`), quindi ogni tipo che lo stripper non tratta
  — il video su tutti — viene rifiutato con `media_finalize.type_not_accepted` e
  **non viene scritto niente**. La galleria passa una funzione, e solo perche'
  quel percorso accetta video, che nessuno in questo repo sanifica: limite
  dichiarato e datato (piano 35-14, voce 6), riportato integralmente in
  `finalize/route.ts`.

**La prova meccanica:** `npm run verify:media-strip` esce 0 su sei controlli, e
il controllo B misura ora l'ordine **dentro il modulo** — `last
stripImageMetadata( at :294, first write at :350`.

**Cosa questo verde NON dice**, e va scritto perche' il gate stesso lo scrive:
non dice che `sharp` rimuova davvero i metadati, non dice niente sui video, e
non dice che la riga 15 della coda a mano sia stata applicata. Dice che **non
c'e' un'altra strada** verso una destinazione.

**Perche' sull'archivio la posta e' piu' alta, non piu' bassa.** Una foto
d'archivio e' tenuta **per mesi** e viene ripescata per un listing: un file non
spogliato li' e' un percorso di rivelazione che resta aperto molto dopo che
l'upload e' stato dimenticato. E' la ragione per cui la lista di tipi del bucket
e' piu' stretta di quella del prodotto, e per cui l'archivio non accetta video.

**Il secondo posto in cui un metadato puo' nascondersi: la chiave.** Una chiave
viaggia in una URL firmata, in un log e in un messaggio d'errore, e sopravvive
alla riga. L'uploader la costruisce come `<id del chiamante>/<uuid casuale>.<estensione>`
(`ArchiveUpload.tsx:279`) — **non** il nome del file scelto dall'utente, che
spessissimo e' il nome dell'artista, e **non** un timestamp, perche' un timestamp
e' una data e la data che nessuno voleva pubblicare e' quella che nessuno ha
notato dentro un nome.

---

## Ogni rifiuto su questo percorso e' distinguibile e visibile

Il piano lo chiede come criterio di successo, e non c'e' un solo *«qualcosa e'
andato storto»*.

| Dove | Quante cause distinte | Dove diventa osservabile |
|---|---|---|
| `/api/media/finalize-archive` | **12**, ognuna con status e sorte della copia in transito in due `Record` **totali** (`route.ts:150-200`) | valore `reason` nella risposta |
| `recordVisualAsset` | **6**, unione tipizzata (`visual-archive.ts:82-140`) | valore `reason` restituito |
| `signVisualAssets` | **2**, e sono diverse di proposito | frase propria sulla pagina |
| `ArchiveUpload.tsx` | mappa da categoria a frase, piu' un fallback **che stampa la categoria grezza** | la frase nel pannello |

Tre cose che rendono questo non decorativo:

1. **I due `Record` sono totali sull'unione.** Una categoria aggiunta senza
   status, o senza una sorte per i byte in quarantena, e' un errore di
   `npm run build` e non un 500 silenzioso.
2. **`RECORD_REASON_TEXT` e' totale** sull'unione dei rifiuti dell'atto
   (`ArchiveUpload.tsx:154`): una causa nuova senza frase non compila. E' l'unica
   parte di questo contratto che un compilatore puo' tenere, in un repo senza
   test runner.
3. **Le quattro cause che significano *richiedi ancora* tengono la copia in
   transito**, le altre la rimuovono. Una route che dice «riprova» e distrugge
   la cosa con cui riproveresti non ha offerto un riprova: ha perso un upload
   fatto una volta sola — spesso l'unica copia della press photo che un artista
   ha mandato il lunedi'.

E la distinzione **per posizione** e' preservata: se il passo 3 fallisce, la foto
**e' nell'archivio** e manca solo la sua riga. Dire «l'upload e' fallito» li'
sarebbe falso, e la differenza conta — l'oggetto esiste e nessuno lo trova.

---

## Il percorso pubblicato non si e' mosso

Il piano lo chiede esplicitamente, e va detto con i numeri.

- **Le diciassette categorie sono byte per byte le stesse.** Sei sono ora
  *importate* dal modulo che le possiede invece che dichiarate nella route; le
  stringhe non sono cambiate. `MediaUpload.tsx` le mappa a diciassette frasi e
  **non e' stato toccato in quella parte**.
- **Gli stessi status, le stesse sorti della quarantena.** I due `Record`
  restano nella route, invariati.
- **I due numeri sono al loro posto:** `grep -cE "4\.5|50 MB"` sulla route
  restituisce 3. Sono la ragione per cui i byte non viaggiano nella richiesta —
  una Vercel Function rifiuta un corpo oltre **4,5 MB** e il prodotto accetta
  foto fino a **50 MB** — e chiunque venga a «semplificare» deve leggerli prima.
- **Il ramo video e' intatto**, container check compreso, ed e' diventato il gate
  `unstrippable` della route: stessa lettura di `venue_secret` con il service
  role, stessa categoria, stesso default chiuso.

---

## Accomplishments

### Task 1 — un predicato per domanda, una sola sequenza (commit `8a2a191`)

- **`mayUploadToVisualSection()`**, senza serata, che chiede
  `CAP.PRODUCTION_VISUAL_MANAGE`. `mayUploadToParty` **non allargato**:
  `grep -c "partyId: string"` restituisce 1 e nessun suo parametro e' diventato
  opzionale. Il docblock scrive perche': una serata nullable rende rispondibile
  *«puo' caricare»* **senza dire dove**, e i due consumatori sarebbero una
  galleria per-serata e un archivio per-brand che condividono un verdetto.
- **`src/lib/media/finalize.ts`** con `destinationBucket` obbligatorio.
  `grep -cE "bucket = |bucket \?\?"` restituisce **0**. L'unico bucket nominato
  li' e' la quarantena, da cui legge.
- **`/api/media/finalize-archive`**, che chiede la chiave **prima** di toccare un
  byte, poi scrive nel bucket privato.

### Task 2 — l'uploader, la riga, e la miniatura che ha bisogno di una firma (commit `293515c`)

- **`ArchiveUpload.tsx`**: `grep -cE "FormData|File|Blob"` su `actions.ts`
  restituisce **0** — i byte non passano da una Server Action.
- **`signVisualAssets`** con il client legato al cookie, quindi il braccio
  `visual_archive_select_visual` della policy e' il confine e non solo il
  messaggio. La chiave di storage **non esce dalla funzione**: la risposta e'
  indicizzata per id di riga, e la pagina continua a non selezionare
  `object_key`.
- **`ARCHIVE_SIGNATURE_SECONDS = 300`**, con la ragione scritta accanto in
  entrambe le direzioni: piu' corto scade mentre la pagina carica le immagini su
  una connessione da locale, piu' lungo e' tempo in cui un indirizzo incollato in
  una chat apre ancora per chi non ha la chiave.
- **La pagina** disegna un'**assenza dichiarata** dove la firma manca, mai un
  frame rotto: i due sono la stessa cosa per chi guarda, e uno dei due dice
  «archivio vuoto» quando non lo e'.
- Le due frasi del dominio stanno **sulla superficie** e non solo in un docblock,
  perche' chi riempie l'archivio il giovedi' e' chi deve agirci.

---

## Deviations from Plan

### 1. [Rule 3 - Blocking] `verify-media-strip` andava aggiornato o sarebbe diventato rosso su un albero corretto

- **Trovata durante:** Task 1, progettando l'estrazione.
- **Il problema:** il controllo B confrontava i numeri di riga **dentro la
  route** — ultima `stripImageMetadata(` sopra la prima scrittura a
  `"event-media"`. Spostando la sequenza nel modulo, la route non chiama piu' lo
  stripper: B avrebbe stampato *«contains no live call»* su un albero corretto.
  Il piano chiede sia l'estrazione sia `verify:media-strip` a 0, e le due cose
  sono incompatibili senza toccare lo script.
- **La riparazione:** B misura ora `src/lib/media/finalize.ts`, dove le due
  istruzioni stanno davvero, e la scrittura e' cercata **per chiamata** invece
  che per nome di bucket — la destinazione del modulo e' un argomento, che e'
  esattamente cio' che permette una seconda destinazione senza una seconda copia
  della sequenza. Aggiunto il controllo **F**: il modulo non nomina il bucket
  pubblico da nessuna parte, che e' la meta' meccanica di *nessun default*.
- **Perche' non lasciarlo rosso:** un gate che fallisce sul lavoro giusto e' un
  gate che qualcuno spegne, e da quel momento non guarda piu' niente. E' il
  fallimento che questo repo ha gia' registrato due volte dentro la fase 35.
- **File:** `scripts/verify-media-strip.mjs`. **Commit:** `8a2a191`.

### 2. [Rule 1 - Bug] Il probe di mutazione ha trovato **due buchi reali** nel controllo A, e li ha trovati perche' l'ho cercato

- **Trovata durante:** Task 1, provando per mutazione (`ai-engineering.md`, gate
  *prova per mutazione*).
- **Buco 1 — la finestra guardava solo in avanti.** Un file che passa il nome del
  bucket pubblico al modulo condiviso scrive **prima** la chiamata e **sotto** la
  destinazione:

  ```
  return finalizeStrippedUpload<never>({
    quarantinePath: key,
    mimeType: "image/jpeg",
    destinationBucket: "event-media",
  ```

  La finestra partiva dalla riga del bucket e correva in avanti, quindi vedeva
  tre proprieta' e **nessuna chiamata**. Il probe **passava** il controllo A
  mentre pubblicava sul bucket pubblico da un secondo file.
- **Buco 2 — il token con la parentesi non matchava una chiamata generica.**
  `FINALIZE_CALL` era `'finalizeStrippedUpload('`, ma entrambi i chiamanti
  scrivono `finalizeStrippedUpload<never>({`. **Non matchava nessuno dei due.**
  Le quattro chiamate di storage sono scritte `.upload(` e simili perche' un
  metodo non puo' portare un argomento di tipo fra nome e parentesi; questa si'.
- **La riparazione:** finestra anche all'indietro, fermata al `;` che e' il
  confine di istruzione; e token come identificatore nudo, che qui non costa
  niente perche' i commenti sono azzerati prima di leggere una riga.
- **Perche' e' il punto della mutazione e non un dettaglio:** senza il probe
  avrei consegnato un controllo verde su nulla, con l'aggravante che *sembra
  presidiato*. `ai-engineering.md` lo dice: **la mutazione va verificata di per
  se'** — e l'ho asserita (`grep -c` sul probe = 1) prima di leggerne l'esito.
- **Commit:** `8a2a191`.

**Le tre mutazioni, e cosa hanno prodotto:**

| Mutazione | Applicata? | Esito atteso | Esito |
|---|---|---|---|
| `.from(destinationBucket)` → `.from("event-media")` nel modulo | si', riga 349 | A e F rossi | ✗ A, ✗ F |
| lo spoglio sostituito da `bytesToWrite = sourceBytes` | si', 0 occorrenze | B rosso | ✗ B |
| file probe che passa `"event-media"` al modulo | si', 1 occorrenza | A rosso | ✗ A (dopo le due riparazioni; **✓ falso** prima) |

Tutte e tre ripristinate; il verde finale e' stato riletto dopo il ripristino.

### 3. [Rule 2 - Missing critical] Tetto e tipi in un modulo condiviso, e `MediaUpload.tsx` li importa

- **Trovata durante:** Task 2. Il piano dice *«il tetto e i tipi accettati
  vengono dal componente esistente, non da numeri nuovi»* — ma
  `strip-metadata.ts` e' `server-only` e **non si puo' importare in un bundle di
  browser**, quindi una seconda grafia lato client esiste per forza.
- **La riparazione:** `src/lib/media/upload-limits.ts`, semplice e sicuro su
  entrambi i lati, con i tre tipi, il tetto di 50 MB e il formattatore. Entrambi
  gli uploader lo importano, quindi le grafie sono **due** (server e client), che
  e' il minimo raggiungibile, invece di tre.
- **Cosa NON e' stato toccato in `MediaUpload.tsx`:** il ramo video, la sequenza,
  le diciassette frasi, e i due messaggi con i numeri sbagliati — vedi DEF-45-10.
- **Commit:** `293515c`.

### 4. [Rule 3] `signVisualAssets` in batch invece di una firma per riga

- Il piano chiede *«una URL firmata per un asset»*. E' un atto sola su una lista.
- **La ragione e' del dominio:** l'archivio si riempie **ogni giovedi'**, quindi
  cresce senza limite; un atto per riga sarebbe un round trip del gate **piu'**
  una query **piu'** una richiesta di firma **per ogni fotografia, a ogni render
  della pagina**. Ogni riga ha comunque il **suo** indirizzo con la **sua**
  scadenza: cio' che e' condiviso e' la domanda *questa sessione puo' vedere
  l'archivio*, che e' una domanda sola per quante righe ci siano.
- **Commit:** `293515c`.

### 5. [Rule 1] Diagnostica senza `code=`/`message=` nel nuovo uploader

- `verify:section-surface` e' andato **rosso sul controllo E** al primo giro,
  su `ArchiveUpload.tsx:351`: un `console.error` che portava la categoria fra
  parentesi quadre ma non nella forma `code=… message=…` che D-45-18 chiede.
- Riparato nello stesso task. Il gate e' tornato a 0 con cinque controlli verdi —
  ed e' **la prima volta che gira con un verdetto per ogni controllo e nessuna
  directory mancante**, che era un criterio di successo del piano.

---

## Verifica — cosa e' stato misurato, e cosa il verde non dice

| Comando | Baseline (prima di toccare l'albero) | Dopo |
|---|---|---|
| `npm run build` | 0 | **0** |
| `npm run verify:media-strip` | 0 (5 controlli) | **0 (6 controlli)** |
| `node scripts/verify-section-surface.mjs` | 0 (5 controlli) | **0 (5 controlli)** |
| `npm run verify` | **1** — 1 FAILED (`verify:capabilities`), 2 REFUSED | **1** — la stessa identica riga |
| `npm run verify:touch-targets` | **2 REFUSED** | **2 REFUSED** — invariato |

**Zero FAILED di produzione mia.** `verify:capabilities` fallisce su tre lati di
cinque con credenziali reali: e' la finestra rossa dichiarata dall'orchestratore,
il deploy non e' vivo. `verify:conversion` e `verify:touch-targets` rifiutano da
DEF-45-01, per quattro superfici che non esistono piu'. Due criteri
d'accettazione del piano chiedevano `npm run verify` e
`npm run verify:touch-targets` a 0: **non sono stati raggiunti, e non erano
raggiungibili** in questa finestra — la misura sopra e' il confronto onesto.

**Cosa un verde qui NON significa** (e il piano lo scrive per primo): niente qui
prova che una richiesta anonima non possa scaricare un oggetto dell'archivio.
Quella e' una proprieta' delle policy del bucket, riletta in 45-08, e
dell'assenza di una URL pubblica — `grep -rcE "storage/v1/object/public" src`
resta al suo valore pre-modifica, 3 occorrenze in un solo file, che e' il
percorso della galleria pubblica. Il posto onesto per esercitarla e' **una
richiesta senza sessione**, che appartiene all'ambiente della procedura P1 e non
a un build.

**E non esiste test runner per il prodotto.** La verifica qui e' `npm run build`
(che e' anche il typecheck) piu' i gate strutturali. Nessuna riga e' stata
scritta in produzione: D12 rispettato, nessun oggetto caricato, nessuna riga
inserita. Le tabelle restano vuote.

---

## Procedura manuale, da eseguire dove c'e' una sessione vera

Il percorso tocca accesso e materiale, quindi serve una procedura scritta
(`meta-gates.md`), e queste sono le cose che nessun grep puo' dire:

1. Con una sessione **che tiene `production.visual.manage`**, aprire
   `/admin/visual`, scegliere una foto JPEG con GPS noto, kind *Artist photo*,
   nome artista, e archiviarla. Attesa: il pannello dice *Filed*, la riga appare
   con la miniatura.
2. **Scaricare l'oggetto dal bucket e leggerne l'EXIF.** Attesa: nessuna
   coordinata. E' l'unico modo di sapere che `sharp` ha davvero fatto il lavoro
   — il gate strutturale prova l'ordine, non la proprieta'.
3. Copiare l'indirizzo della miniatura, **aspettare piu' di cinque minuti** e
   riaprirlo in una finestra senza sessione. Attesa: rifiutato.
4. Con una sessione **senza** quella chiave, chiamare l'arm dell'archivio
   direttamente con un corpo JSON valido. Attesa: `403` con
   `forbidden.production_visual_manage_required`.
5. Provare a caricare un `.mp4`. Attesa: rifiutato dal picker; e se forzato via
   chiamata diretta, `415 media_finalize.type_not_accepted`.
6. **Il percorso pubblicato, non toccato:** caricare una foto su una serata dalla
   galleria pubblica e verificare che si pubblichi come prima.

---

## Threat Flags

Nessuna nuova superficie di sicurezza fuori dal `<threat_model>` del piano. Le
sei voci del registro sono tutte `mitigate` e tutte applicate:

| Threat | Come e' mitigata, in una riga |
|---|---|
| T-45-11 | bucket privato senza braccio anonimo; miniature via firme brevi coniate dietro la chiave; destinazione argomento obbligatorio, controllo **F** |
| T-45-19 | il modulo spoglia prima di scrivere, su entrambi i percorsi; controllo **B**, provato per mutazione |
| T-45-04 | secondo predicato, non uno allargato; firma del primo asserita invariata; nessuno dei due esportato da un file `"use server"` |
| T-45-20 | i byte non viaggiano nella richiesta; i due numeri asseriti ancora presenti |
| T-45-01 | nome d'artista disegnato solo dietro la guardia, in nessun titolo, nessun `aria-label`, nessun log |
| T-45-SC | nessun pacchetto installato |

---

## Known Stubs

Nessuno. Non ci sono valori vuoti hardcodati, nessun testo segnaposto, nessun
`TODO`. L'unica cosa che questa superficie ancora **non** fa e' rimuovere una
foto dall'archivio: non e' uno stub, e' fuori dal perimetro del piano — la
rimozione e' **possibile** (service role, dietro la chiave), e cio' che manca e'
un controllo che la offra. Diventa importante quando DEF-45-11 si chiude, perche'
e' la meta' meccanica di una revoca.

---

## Self-Check: PASSED

File dichiarati come creati, verificati su disco:

- `src/lib/media/finalize.ts` — FOUND
- `src/lib/media/upload-limits.ts` — FOUND
- `src/lib/production/sections/visual-archive.ts` — FOUND
- `src/app/api/media/finalize-archive/route.ts` — FOUND
- `src/app/(admin)/admin/visual/ArchiveUpload.tsx` — FOUND

Commit dichiarati, verificati in `git log`:

- `8a2a191` — FOUND
- `293515c` — FOUND

Nessuna cancellazione di file tracciati nei due commit
(`git diff --diff-filter=D HEAD~2 HEAD` vuoto). Nessun file non tracciato
lasciato indietro: il symlink `node_modules` e il `.env.local` copiati per poter
misurare sono entrambi in `.gitignore` e sono stati rimossi alla chiusura.
