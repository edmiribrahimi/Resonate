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

## I due confini che non coincidono

Nel prodotto convivono due confini diversi, e vanno tenuti distinti:

- **La riga** in `event_media` ha uno stato (`pending` · `approved` ·
  `rejected`) ed e' protetta da RLS: chi non ha titolo non la vede.
- **L'oggetto** nello storage sta in un bucket **pubblico**
  (`event-media`, `public: true`, tetto 100 MB — verificato in
  `supabase/migrations/20260225120000_phase7_media.sql:65`), e si legge con
  `getPublicUrl`. Anche `event-images`, `venue-photos` e `artist-photos` sono
  pubblici.

**Conseguenza, verificata il 2026-08-05:** approvare o rifiutare un media
cambia la **riga**, non l'**oggetto**. Un contenuto rifiutato — o non ancora
moderato — resta scaricabile da chi conosce o indovina il suo URL. Il path e'
`${eventId}/${userId}/${timestamp}-${i}.${ext}`: non e' segreto, e' **derivabile**
da due identificatori che circolano.

Moderare senza rimuovere l'oggetto e' **nascondere, non togliere**. Se la
differenza conta — e per un contenuto rifiutato conta — serve rimuovere
l'oggetto o usare un bucket privato con URL firmati.

## Una foto porta piu' di quello che mostra

Nessuna sanitizzazione dei metadati esiste nel codice (verificato: zero
occorrenze di EXIF o equivalenti). Uno scatto da telefono porta con se'
**coordinate GPS, data, ora e modello**.

**Una foto scattata dentro una secret venue e caricata dalla galleria
contiene l'indirizzo del venue.** Non nella didascalia: nel file. E' un
percorso di rivelazione che non passa da nessuna delle superfici enumerate in
`venue-secrecy.md`, perche' non e' codice nostro a scriverlo — ed e' per questo
che va enumerato qui.

## Quality Gates

- **Gate moderazione = rimozione**: Rifiutare un contenuto deve renderlo **irraggiungibile**, non solo invisibile nell'interfaccia. Finche' l'oggetto resta in un bucket pubblico con path derivabile, il rifiuto e' una tenda, non una porta.
- **Gate EXIF prima della pubblicazione**: Ogni immagine caricata da un utente va **spogliata dei metadati** prima di diventare raggiungibile. Vale in modo assoluto per gli eventi con venue segreto — dove il gate e' `venue-secrecy.md`, gate irreversibilita': una volta che il file e' online, le coordinate sono uscite.
- **Gate il path non e' una password**: Un URL non elencato non e' un URL protetto. Se un contenuto deve essere riservato, lo protegge una policy o una firma con scadenza — mai l'improbabilita' di indovinare un nome.
- **Gate chi carica ha titolo**: L'upload richiede oggi utente **approvato** con un biglietto per quell'evento (organizer e master esclusi dal vincolo). Ogni allargamento di quel perimetro e' una modifica al gating, quindi passa da `access-gating.md` — non e' una comodita' di prodotto.
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
