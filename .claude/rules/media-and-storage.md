---
paths:
  - "src/lib/media/**"
  - "src/app/api/media/**"
---

# Media & Storage — Operational Gates

> **Riletto dal prodotto spedito il 2026-10-03** (persona 1.31.0, fase 52.1).
> In produzione dal 2026-10-02 (U4 alle 21:38Z, M-C/M-D e bucket alle 21:45Z,
> `52.1-AUTHORISATION-GALLERY.md`). **La gallery non esiste piu'**: pagina,
> moderazione, tabella `event_media`, bucket `event-media`, chiavi
> `gallery.view` e `media.upload` sono usciti da codice, schema e storage
> (DBT-13, D-52.1-17). Il catalogo porta **14 chiavi e 26 concessioni**.

## Before Touching

upload di foto, cover di una serata, archivio del visual, bucket, immagini di
venue e artisti
-> presentare l'analisi d'impatto su: **cosa diventa raggiungibile da chi**, e
cosa c'e' dentro il file oltre a quello che si vede.

## Cosa c'e', oggi

Due percorsi, e nessuno scrive dal browser nella destinazione:

| Percorso | Strada | Destinazione | Chi |
|---|---|---|---|
| **Cover della serata** (DBT-14) | quarantena privata `event-media-quarantine` → `POST /api/media/finalize-cover` → stripper `cover-jpeg` (ruota, 1920 px di lato lungo, JPEG q82, zero EXIF) | bucket **pubblico** `event-images`, chiave `covers/<uuid>.jpg` scelta dal server | `staff.manage` + la serata (`mayManageEvent`) |
| **Archivio del visual** | quarantena → `POST /api/media/finalize-archive` → stripper `same-format` | bucket **privato** `visual-archive` | `production.visual.manage` |

**Da M-C (2026-10-02, 21:45Z) `event-images` si scrive solo col servizio e non
si elenca piu'**: la lista anonima e' passata da 5 elementi a 0, le cover
rispondono ancora 200. `venue-photos` e `artist-photos` restano pubblici.

**Il bucket della quarantena porta un nome storico** — `event-media-quarantine`
— da quando serviva la gallery: oggi riceve cover e archivio. Il nome non dice
piu' a chi serve; il bucket e' privato e l'unica cosa che conta e' che resti
tale.

**La cover non 16:9 si ritaglia al centro** sulla pagina della serata
(`object-fit: cover`): decisione del proprietario, D-52.1-30 (2026-10-02, *«le
cover lasciale cosi' come sono per ora»*). La locandina esportata in 16:9 resta
intera (D-52.1-19).

## Una foto porta piu' di quello che mostra

Uno scatto da telefono porta **coordinate GPS, data, ora e modello**. **Una
foto scattata dentro una secret venue contiene l'indirizzo del venue**: non
nella didascalia, nel file.

**Misurato il 2026-10-02 (P-521-E, simulatore iOS 27):** Safari converte l'HEIC
in JPEG quando `accept` non nomina l'HEIC — ma **il JPEG consegnato porta ancora
il GPS** (tag 0x8825 nei byte; il selettore mostra «Location Included» di
default). La strada B (decodifica HEIC sul server, piano 52.1-17) non e' servita;
lo stripper si.

## Quality Gates

- **Gate una cover passa dal server**: L'unico scrittore di `event-images` e' `finalize-cover`, e lo stripper sul server e' **l'unica difesa** fra una foto scattata in una sede segreta e un URL pubblico: il browser non toglie nulla. Situazione che lo fa scattare: un form che torni a scrivere la cover dal client, o un `destinationBucket`/`encoding` con un default (controllo F di `verify:media-strip`). Vedi `venue-secrecy.md`.
- **Gate la chiave non dice nulla**: La chiave pubblica e' `covers/<uuid>.jpg`, generata dal server. **Mai il nome originale del file, mai un timestamp, mai una parte scelta da chi carica**: un `IMG_0412.HEIC` o un nome che porta la sede finiscono in un URL che chiunque copia. Situazione che lo fa scattare: riusare il nome del file «per leggibilita'». *(Le cinque cover caricate prima del 2026-10-02 restano a `covers/<timestamp>-<nome originale>` finche' non si ricaricano: censite, zero GPS.)*
- **Gate una cover sostituita resta al vecchio URL**: Caricarne una nuova non cancella la vecchia (`upsert: false`, nessuna rimozione): l'oggetto resta raggiungibile da chi ha l'indirizzo. Vale anche per una cover caricata in Edit il cui salvataggio fallisce. **Debito dichiarato**: finche' resta, togliere una cover per una ragione seria e' un gesto per chiave sul bucket, non un salvataggio del form. E `events.cover_image` accetta ancora qualunque stringa (`trim()` soltanto).
- **Gate il path non e' una password**: Un URL non elencato non e' un URL protetto. Se un contenuto deve essere riservato, lo protegge una policy o una firma con scadenza — mai l'improbabilita' di indovinare un nome.
- **Gate chi carica ha titolo**: Cover = `staff.manage` sulla serata; archivio = `production.visual.manage`, nessuna serata. Ogni allargamento e' una modifica al gating e passa da `access-gating.md`. **Una gallery dei membri non si reintroduce come funzione di comodo**: e' uscita per decisione, e tornerebbe con base giuridica, moderazione che toglie l'oggetto e via di revoca (`legal-compliance.md`) decise **prima** del codice.
- **Gate il volume e' un costo e un limite**: Ogni innalzamento del limite di dimensione si accompagna a una stima di quanto costa a serata piena, non a un "vediamo".
- **Gate l'archivio ha un padrone**: Il materiale che alimenta i pezzi editoriali non eredita i permessi di nient'altro. Chi scatta, dove finiscono i file e chi puo' usarli va deciso **prima** che serva. Vedi `brand-visual-system.md`, gate l'archivio precede il listing.
- **Gate cache e contenuto rimosso**: Un'immagine servita da CDN o dal service worker sopravvive alla sua rimozione: sul laboratorio, nel 2026-09, la CDN dello storage ha servito una copia **62 minuti dopo** la chiusura, oltre il suo `max-age`. Quando si toglie un contenuto per una ragione seria, va verificato **anche** che smetta di essere servito. Vedi `nextjs-architecture.md`, gate service worker.

## Imperative Behaviors

- When writing a cover: go through quarantine and `finalize-cover` — never write `event-images` from the browser
- When accepting an upload: strip its metadata on the server — an iOS JPEG still carries GPS
- When naming a public object: let the server generate an opaque key — never the original file name
- When replacing a cover: remember the old object stays reachable, and remove it by key if it must go
- When something must stay private: protect it with a policy or a signed URL, never with an unguessable path
- When widening who may upload: treat it as an access change and go through access-gating
- When tempted to bring back a members' gallery: decide legal basis, moderation and revocation first
- When raising a size limit: estimate what it costs at a full night
- When building the editorial archive: decide ownership and permissions before the first shoot
- When removing content: verify the CDN and the service worker stop serving it too
