---
paths:
  - "src/components/media/**"
  - "src/app/**/media/**"
  - "src/app/(public)/gallery/**"
---

# Media & Storage — Operational Gates

## Before Touching

upload di foto e video, galleria, moderazione, bucket, immagini di venue e
artisti
-> presentare l'analisi d'impatto su: **cosa diventa raggiungibile da chi**, e
cosa c'e' dentro il file oltre a quello che si vede.

## I due confini, e da quando coincidono

Nel prodotto convivono due confini, e vanno tenuti distinti:

- **La riga** in `event_media` ha uno stato (`pending` · `approved` ·
  `rejected`) ed e' protetta da RLS. **Dal 2026-09-23** le righe approvate si
  leggono solo con `gallery.view` — master, organizer e staff per ruolo,
  `attendee` no (`20260923180100_gallery_close_data.sql:133-141`); restano, in
  OR, chi ha caricato (`select_own`) e chi modera (`select_admin`,
  `staff.manage`).
- **L'oggetto** nel bucket `event-media` (tetto 100 MB,
  `20260225120000_phase7_media.sql:65`) e' **privato dal 2026-09-23**
  (`20260923180100_gallery_close_data.sql:165-167`). Si legge solo con URL
  **firmati dal client della sessione** di chi guarda
  (`src/lib/media/sign-event-media.ts:121-128`, 3600 s la gallery, 300 s la
  moderazione), e la policy sull'oggetto `event_media_objects_select_by_row`
  (`20260923180000_gallery_view_and_media_paths.sql:223`) chiede la riga:
  **chi non vede la riga non firma l'oggetto**. `event-images`, `venue-photos`
  e `artist-photos` **restano pubblici**.

*(Fino al 2026-09-23 questa sezione diceva «bucket pubblico,
letto con `getPublicUrl`», e ne traeva che un rifiutato restava scaricabile da
chi ne indovinava il path. Era vero dal 2026-08-05 alla fase 52, NAV-07.)*

**Cosa resta vero.** Il path e' ancora
`${eventId}/${userId}/${timestamp}-${i}.${ext}`, **derivabile** — ma oggi un
path non apre nulla senza una firma, e una firma non nasce senza la riga. E
**cio' che era stato scaricato o messo in cache quando il bucket era pubblico
non rientra**: la CDN dello storage ha servito sul laboratorio una copia gia'
in cache **62 minuti dopo** la chiusura, oltre il suo `max-age` (`52-13`). In
produzione il residuo e' zero per costruzione: **0 oggetti** prima della
chiusura.

## Una foto porta piu' di quello che mostra

Uno scatto da telefono porta con se' **coordinate GPS, data, ora e modello**.
**Una foto scattata dentro una secret venue contiene l'indirizzo del venue**:
non nella didascalia, nel file. E' un percorso di rivelazione che non passa da
nessuna delle superfici di `venue-secrecy.md`, perche' non e' codice nostro a
scriverlo.

**La sanitizzazione esiste** — riletto il 2026-09-23. Ogni foto passa dalla
quarantena privata e poi da `src/lib/media/finalize.ts:294`
(`stripImageMetadata`, `src/lib/media/strip-metadata.ts`, fase 35) prima di
arrivare al bucket; il browser non scrive piu' su `event-media`. **Il video no**:
`sharp` non tratta i contenitori, e un video su una serata **segreta** e'
rifiutato, su una serata non segreta passa **non spogliato**
(`src/app/api/media/finalize/route.ts:117-123`). Le foto anteriori allo
stripper si ripassano con `scripts/restrip-event-media.mjs` (D-52-31): in
produzione, il 2026-09-23, **0 foto e 0 video** da ripassare. *(Questa sezione
diceva «nessuna sanitizzazione dei metadati esiste nel codice»: era vero il
2026-08-05, non dalla fase 35.)*

## Quality Gates

- **Gate moderazione = rimozione**: Rifiutare un contenuto deve renderlo **irraggiungibile**, non solo invisibile nell'interfaccia. **Dal 2026-09-23 un rifiutato non si raggiunge per indirizzo ne' per firma da chi tiene solo `gallery.view`** — lo firmano ancora chi l'ha caricato e chi modera — e gli oggetti rifiutati e orfani si tolgono per chiave con `scripts/purge-media-orphans.mjs` (D-52-30; in produzione **0 e 0**, 2026-09-23). **Il rifiuto dall'interfaccia continua a cambiare solo la riga**: `deleteMedia` non ha chiamanti. Finche' non ne ha, togliere l'oggetto e' uno strumento, non un gesto del moderatore.
- **Gate EXIF prima della pubblicazione**: Ogni immagine caricata da un utente va **spogliata dei metadati** prima di diventare raggiungibile. Vale in modo assoluto per gli eventi con venue segreto — dove il gate e' `venue-secrecy.md`, gate irreversibilita': una volta che il file e' online, le coordinate sono uscite.
- **Gate il path non e' una password**: Un URL non elencato non e' un URL protetto. Se un contenuto deve essere riservato, lo protegge una policy o una firma con scadenza — mai l'improbabilita' di indovinare un nome.
- **Gate chi carica ha titolo**: Carica sulla gallery di una serata **solo chi tiene `staff.manage` o l'assegnazione `media.upload` su QUELLA serata** — due bracci, nessun terzo (`src/lib/media/may-upload.ts:236` e `:272`, riletto il 2026-09-23; D-50-03). Un biglietto o una presenza non bastano: il braccio della presenza non ha mai ammesso nessuno ed e' stato tolto, non riparato. L'archivio del visual ha una chiave sua, `production.visual.manage`, e nessuna serata. Ogni allargamento e' una modifica al gating, quindi passa da `access-gating.md` — non e' una comodita' di prodotto. *(Diceva «utente approvato con un biglietto»: lo stato e' stato rimosso il 2026-09-21.)*
- **Gate il volume e' un costo e un limite**: Il tetto e' 100 MB per file. Un video di una serata moltiplicato per i partecipanti diventa banda e spazio reali: ogni innalzamento del limite si accompagna a una stima di quanto costa a serata piena, non a un "vediamo".
- **Gate la persona nel fotogramma**: Foto e video ritraggono persone riconoscibili. Base giuridica, informativa e via di revoca stanno in `legal-compliance.md`, e la revoca deve funzionare **anche su cio' che e' gia' pubblicato** — cioe' richiede di poter rimuovere davvero l'oggetto, non solo la riga.
- **Gate l'archivio ha un padrone**: Il materiale che alimenta i pezzi editoriali — recap, after movie, archivio del giovedi' — non e' lo stesso di quello caricato dai membri, e non eredita gli stessi permessi. Chi scatta, dove finiscono i file e chi puo' usarli va deciso **prima** che serva. Vedi `brand-visual-system.md`, gate l'archivio precede il listing.
- **Gate cache e contenuto rimosso**: Un'immagine servita da CDN o dal service worker sopravvive alla sua rimozione. Quando si toglie un contenuto per una ragione seria, va verificato **anche** che smetta di essere servito da una cache. Vedi `nextjs-architecture.md`, gate service worker.

## Imperative Behaviors

- When rejecting a media item: remove the object, don't only flip the row
- When accepting an upload: strip its metadata before it becomes reachable
- When something must stay private: protect it with a policy or a signed URL, never with an unguessable path
- When widening who may upload: treat it as an access change and go through access-gating
- When raising a size limit: estimate what it costs at a full night
- When people are recognisable: check the legal basis and keep removal actually possible
- When building the editorial archive: decide ownership and permissions before the first shoot
- When removing content: verify the CDN and the service worker stop serving it too
