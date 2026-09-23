---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
document: gli esiti della fase 52 — censimento, corse sul laboratorio, atti
written: 2026-09-23
written_by: piano 52-01, task 1
requirements: [NAV-07]
environment: il censimento e' una LETTURA (`read_only: true`) su laboratorio e produzione; ogni scrittura della fase avviene sul laboratorio, la produzione solo sotto atto datato
lab_status: ACTIVE_HEALTHY
lab_status_read: "2026-09-23, prima delle 13:08:04Z"
---

# Fase 52 — Gli esiti

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Qui si nominano **ruoli** — *il proprietario*, *l'account master del
> banco* — **mai persone**. **Il riferimento del progetto di laboratorio non si
> scrive qui**: sta in `.env.lab.local`, che e' ignorato da git. Nessuna chiave,
> nessun indirizzo di un media, nessun path di un oggetto, nessun identificativo
> di riga: il censimento porta **solo numeri aggregati su tutte le serate
> insieme**, mai per singola serata (`venue-secrecy.md`).
>
> Ogni riga porta l'ora **UTC**, lo strumento, e cio' che si e' **osservato** —
> non cio' che ci si aspettava. Dove l'osservato differisce dall'atteso, la
> differenza si riporta **per prima**.

---

## Censimento di NAV-07

**Letto il 2026-09-23, prima che esista una riga di M1** (ricerca §I.7, D-52-25,
D-52-30, D-52-31). Strumento: Management API,
`POST /v1/projects/<ref>/database/query` con **`read_only: true` su ogni
chiamata**, solo `SELECT` con `count(*)`. Nessuna riga, nessun URL e nessun path
e' stato restituito o stampato. Lo stato del laboratorio e' stato letto prima
(`GET /v1/projects/<ref del laboratorio>` → `ACTIVE_HEALTHY`).

### La differenza dall'atteso, per prima

1. **In produzione `public.event_media` e il bucket `event-media` sono VUOTI:
   zero righe, zero oggetti.** La ricerca §I.7 immaginava una popolazione da
   convertire; non c'e'. Nessuna foto — di serata segreta o no, prima o dopo lo
   stripper, approvata o rifiutata — e' oggi raggiungibile per URL pubblico in
   produzione, perche' nessuna esiste.
2. **In produzione `20260809006000` NON e' registrata nella history** di
   `supabase_migrations.schema_migrations`: nessuna riga con `name` che contiene
   `event_media_server_upload_only`, e nessuna versione fra il 2026-08-08 e il
   2026-08-11 che la porti sotto un altro nome. **Il suo effetto invece c'e'**,
   letto dal catalogo (`pg_policies` su `storage.objects`): sul bucket
   `event-media` non esiste alcuna policy `INSERT` per il browser, e l'unica
   policy `INSERT` legata ai media e' quella della quarantena
   (`event_media_quarantine_insert_staff`) — identico al laboratorio. La soglia
   «prima dello stripper» della produzione **non e' quindi rileggibile dalla
   history**; con zero righe la domanda non cambia alcun numero, ma il piano che
   scrive M1 non deve presumere che la history della produzione registri le
   migration di agosto per nome: nella history della produzione, riletta nello
   stesso momento, i nomi compaiono in due forme — con e senza il prefisso di
   versione del file — e una migration applicata puo' mancare del tutto.
3. **Il laboratorio e' vuoto anch'esso** — zero righe, zero oggetti: e' la
   ragione dei task 2 e 3 di questo piano (su un laboratorio senza media le
   sonde di NAV-07 misurano il vuoto, ricerca §I.6).

### Laboratorio — letto alle 2026-09-23T13:08:04Z

| Lettura | Valore |
|---|---|
| righe di `event_media` | **0** |
| `url` nella forma pubblica `…/storage/v1/object/public/event-media/…` | 0 |
| `url` di **altra forma** | **0** |
| approvate / in attesa / rifiutate | 0 / 0 / 0 |
| righe senza serata (`party_id` nullo) | 0 |
| righe di serate con `venue_secret` vero | 0 |
| foto / video / altro tipo | 0 / 0 / 0 |
| soglia dello stripper — versione con cui `20260809006000` e' registrata | **`20260907094330`** → istante 2026-09-07T09:43:30Z (la data della ricostruzione del laboratorio, non quella della migration) |
| righe con `created_at` anteriore alla soglia — foto / video / foto di serate segrete | 0 / 0 / 0 |
| oggetti nel bucket `event-media` | **0** |
| oggetti **orfani** (nessuna riga il cui `url` finisca con il loro nome) | 0 |
| oggetti che appartengono a righe `rejected` | 0 |
| righe `rejected` senza oggetto / righe di qualunque stato senza oggetto | 0 / 0 |
| `storage.buckets.public` per `event-media` | **`true`** |

### Produzione — letto alle 2026-09-23T13:08:07Z

| Lettura | Valore |
|---|---|
| righe di `event_media` | **0** |
| `url` nella forma pubblica `…/storage/v1/object/public/event-media/…` | 0 |
| `url` di **altra forma** | **0** |
| approvate / in attesa / rifiutate | 0 / 0 / 0 |
| righe senza serata (`party_id` nullo) | 0 |
| righe di serate con `venue_secret` vero | 0 |
| foto / video / altro tipo | 0 / 0 / 0 |
| soglia dello stripper — versione con cui `20260809006000` e' registrata | **non registrata** (vedi sopra; l'effetto e' presente nel catalogo, riletto alle 2026-09-23T13:09Z) |
| righe con `created_at` anteriore alla soglia | non calcolabile dalla history; **0 comunque**, perche' le righe sono 0 |
| oggetti nel bucket `event-media` | **0** |
| oggetti **orfani** | 0 |
| oggetti che appartengono a righe `rejected` | 0 |
| righe `rejected` senza oggetto / righe di qualunque stato senza oggetto | 0 / 0 |
| `storage.buckets.public` per `event-media` | **`true`** |

### Come si leggono questi numeri

- **`url` di altra forma = 0 su entrambi i progetti.** Il backfill di
  `storage_path` in M1 (piano 52-06) copre tutte le righe per costruzione, e il
  `DO` di M1 che solleva su una forma diversa non ha soggetti. **M1 non e'
  bloccata dal censimento.** Resta giusto che il `DO` sollevi: il laboratorio
  sara' seminato (task 3) e la produzione puo' ricevere righe fra oggi e l'atto.
- **Rifiutate con oggetto e orfani (soggetto di D-52-30): 0 in produzione.** La
  rimozione per chiave che D-52-30 chiede, **oggi**, in produzione non ha nulla
  da rimuovere. L'atto di produzione (piani 52-15/52-16) **rilegge** questo
  numero il giorno in cui si fa: se nel frattempo e' cresciuto, la lista si
  cattura quel giorno, non da qui.
- **Foto pre-soglia (soggetto di D-52-31): 0 in produzione.** Il ripasso dallo
  stripper di ogni foto vecchia, oggi, in produzione non ha soggetti. Anche qui
  il numero va riletto il giorno dell'atto — e la soglia della produzione, non
  essendo nella history, va stabilita dal proprietario o dal catalogo quel
  giorno, non supposta da questo file.
- **Righe di serate segrete (il numero che interessa `venue-secrecy.md`): 0 in
  produzione.** Oggi nessuna foto di una sede segreta e' raggiungibile da un URL
  non firmato, per il semplice fatto che non ne esistono. **Il bucket pero' e'
  pubblico su entrambi i progetti**: la prima foto caricata dopo oggi e prima di
  M2 nasce raggiungibile per URL. La finestra e' aperta finche' M2 non chiude.

---

## Il banco dei media sul laboratorio — seminato il 2026-09-23 (piano 52-01, task 3)

**Solo laboratorio; zero scritture in produzione.** Quattro foto JPEG generate
(colore pieno, nessuna persona, nessuna sede) caricate dall'**account master del
banco** dal **percorso vero** — `MediaUpload` → quarantena →
`POST /api/media/finalize` (quattro risposte 200 nel log del server) →
`registerMedia` — due sulla serata non segreta e due sulla serata segreta del
banco. Poi `scripts/seed-lab-media.mjs --dry-run` e `--apply`: un oggetto orfano e
una foto pre-stripper con GPS in mare aperto, `approved`, sulla serata segreta,
`created_at` anteriore alla soglia.

### La differenza dall'atteso, per prima — la coda di moderazione e' vuota per costruzione

La moderazione **non si e' potuta fare dalla superficie del prodotto**. La
pagina `admin/events/[id]/media` mostrava **«2 Pending»** nel censimento in alto
e, sotto, **«No pending media to review — Nothing has been uploaded for this
event yet»**. Causa, misurata: la lettura della coda
(`src/app/(admin)/admin/(work)/events/[id]/media/page.tsx:181-186`) incorpora
`profiles!event_media_uploaded_by_fkey(full_name)`, ma quel vincolo punta a
`auth.users`, non a `public.profiles` — letto da `pg_constraint`, **identico su
laboratorio e produzione**. PostgREST risponde **400 `PGRST200`** («Could not
find a relationship between 'event_media' and 'profiles'»), riprodotto con la
chiave di servizio del laboratorio; la pagina non controlla `error` e disegna la
coda vuota. **E' un fallimento silenzioso preesistente, anche in produzione**:
nessun media caricato puo' essere approvato o rifiutato dall'interfaccia. Oggi
non ha effetti osservabili solo perche' la produzione ha zero media. Non e'
corretto da questo piano (fuori dai suoi file; la pagina e' del piano 52-12):
**va corretto prima che la moderazione serva a qualcuno.**

Le tre decisioni di moderazione sono state quindi applicate sul laboratorio
**per chiave primaria**, con lo stesso effetto di `updateMediaStatus`
(`src/app/(public)/events/[slug]/actions.ts:227-259`, un solo
`update ... set status`): una approvata e una rifiutata sulla serata non
segreta, una approvata sulla serata segreta, una lasciata in attesa.

### Laboratorio, prima e dopo

| Lettura | Prima (13:08:04Z) | Dopo (13:18:40Z) |
|---|---|---|
| righe di `event_media` | 0 | **5** |
| `url` di altra forma | 0 | 0 |
| approvate / in attesa / rifiutate | 0 / 0 / 0 | **3 / 1 / 1** |
| righe di serate con `venue_secret` vero | 0 | **3** (2 approvate, 1 in attesa) |
| foto / video | 0 / 0 | 5 / 0 |
| foto anteriori alla soglia (di cui di serata segreta) | 0 (0) | **1 (1)** |
| oggetti nel bucket | 0 | **6** |
| oggetti orfani | 0 | **1** |
| oggetti di righe `rejected` | 0 | **1** |
| righe senza oggetto | 0 | 0 |
| `public` del bucket | `true` | `true` |

La foto pre-stripper **riletta dal bucket** porta un EXIF di 354 byte con la
sottodirectory GPS (tag `0x8825`): `sharp(buffer).metadata()`, dentro lo script.
Una seconda corsa di `--apply` non ha creato nulla (idempotenza osservata).

---

## Corsa sul laboratorio (piano 52-14)

### `PRE-LAB` — accertata il 2026-09-23, fra le 15:34:53Z e le 15:36:01Z

**Letta prima che il proprietario apra il telefono.** Tutte le letture sono **in
sola lettura** (`read_only: true` su ogni chiamata al catalogo) e sono andate
**solo al laboratorio**: lo script, fuori dal repo, rifiuta il ref di produzione
prima di qualunque rete. **Nessuna scrittura, ne' sul laboratorio ne' in
produzione.** Il ref del laboratorio viene da `.env.lab.local` e non si scrive
qui.

#### La differenza dall'atteso, per prima

1. **Manca lo `staff` non assegnato.** Sul laboratorio c'e' **un solo** profilo
   `staff`, ed e' quello assegnato alla serata di prova. La riga «`staff` non
   assegnato» di `P-52-A` non ha oggi chi la guardi. `PRE-LAB` dice come si
   rimedia: **si crea dall'app, come in produzione** — e l'esito della creazione
   si scrive qui, nella corsa, con l'ora. Questo piano non l'ha creato da
   script: un account creato a mano da uno script non misurerebbe il percorso
   del prodotto.
2. **Il banco non ha un video** (gia' dichiarato da 52-13). Il passo video di
   `P-52-G` ha un soggetto solo se il proprietario ne carica uno nella corsa —
   lo stesso caricamento nuovo che fa da soggetto alla sonda 7
   (`--check-new-upload`).
3. **Il file del banco `.env.lab.seed.json` porta etichette di ruolo vecchie.**
   Due voci dicono ancora `member`; il catalogo dice **`attendee`** per una e
   **nessun profilo** per l'altra (l'account di scorta non esiste piu'). Vale il
   catalogo: i ruoli sotto sono letti da `public.profiles`, non dal file.
4. **L'`organizer` non e' nel file del banco.** Esiste sul laboratorio (uno), sul
   dominio di posta del banco e con almeno un accesso gia' fatto: e' lo stesso
   che le sonde di 52-13 hanno risolto per ruolo.

#### Il laboratorio

| Cosa | Letto | Quando (UTC) | Come |
|---|---|---|---|
| Stato del progetto di laboratorio | **`ACTIVE_HEALTHY`** | 15:34:53Z → 15:34:54Z | Management API, `GET /v1/projects/<ref del laboratorio>` |
| Regione | `eu-west-1` | 15:34:54Z | stessa lettura |
| `lab.resonatemotion.com/events` da anonimo | **HTTP 200** | 15:36:01Z | `curl`, host pubblico |
| `lab.resonatemotion.com/gallery` da anonimo | **HTTP 307** → `/login?next=%2Fgallery` | 15:36:01Z | `curl -I` |

Il laboratorio non era in pausa: nessun restore.

#### Il codice contro cui si misura

**`lab.resonatemotion.com` serve `7a79353`** (commit del 2026-09-23T16:03:13+02:00),
ramo `lab`, dal dispiegamento `READY` creato alle **14:25:54Z** e pronto alle
**14:27:35Z** — letto alle 15:35:53Z dall'alias stesso (API Vercel, senza
`teamId`), non dalla punta del ramo in locale. `origin/lab` punta allo stesso
commit. **Nessun dispiegamento del ramo `lab` dopo le 14:25:54Z**: l'elenco dei
dispiegamenti letto alle 15:35:55Z ha quello come piu' recente.

**Il `main` locale e' piu' avanti, per costruzione.** Fra `7a79353` e il `main`
locale, fuori da `.planning/`, cambiano cinque file: la migration M2, tre
script di verifica e `src/types/database.ts` (solo tipi). **Nessun file che il
browser esegue.** Il laboratorio serve quindi il codice che la corsa deve
misurare. `origin/main` e' ancora al commit precedente la fase: nulla e' andato
in produzione.

#### M2, riletta dal catalogo (`read_only`, 15:34:54Z → 15:34:59Z)

| Lettura | Valore |
|---|---|
| history, ultime due | `20260923142818` `gallery_close_data` (M2), dopo `20260923133108` `gallery_view_and_media_paths` (M1) |
| bucket `event-media` / `event-images` / `event-media-quarantine` | **`public = false`** / `true` / `false` |
| SELECT su `event_media` | `event_media_select_gallery` (lega `gallery.view`), `select_own`, `select_admin`; **`event_media_select_approved` assente** |
| policy su `storage.objects` per `'event-media'` | `event_media_objects_select_by_row` (SELECT, `{authenticated}`) e le due DELETE; **«Anyone can view event media» assente** |
| `storage_path` / `url` | `NOT NULL` / nullable |

#### I soggetti di prova, per ruolo (catalogo, 15:35:21Z → 15:35:46Z)

| Soggetto | C'e'? | Da dove |
|---|---|---|
| anonimo | si' — finestra privata, nessuna sessione | — |
| `attendee` | **si'** (6 profili `attendee` sul laboratorio; quello del banco e' uno di loro) | file del banco |
| `staff` **non assegnato** | **NO** — 0 profili `staff` senza assegnazione viva | da creare dall'app nella corsa (sopra, punto 1) |
| `staff` **assegnato** alla serata di prova | **si'** — assegnazione `door.operate`, ruolo alla porta `staff`, viva, non revocata, scade il 2026-10-21 | file del banco |
| `organizer` | **si'** (1) | risolto per ruolo dal catalogo, non dal file |
| `master` | **si'** (1) | file del banco |

**La serata di prova** e' il 2026-09-28, 22:00 → 06:00, fra cinque giorni, con
la sua assegnazione viva: la voce Check-in dipende dall'assegnazione viva, non
dalla data della serata.

#### Il banco dei media dopo 52-09 e M2 (catalogo, 15:35:22Z)

| Lettura | Valore |
|---|---|
| righe di `event_media` | **4** |
| approvate / in attesa / rifiutate | **3 / 1 / 0** |
| righe di serate con sede segreta | **3** (2 approvate, 1 in attesa) |
| foto / video | 4 / **0** |
| righe senza `storage_path` | 0 |
| oggetti nel bucket `event-media` | **4** |

#### Un fatto che la corsa non misura, portato a 52-15

La cache della CDN **non** e' scaduta a `max-age=3600`: una foto della serata
segreta, gia' spogliata, rispondeva ancora 200 dal suo indirizzo pubblico **62
minuti dopo M2**, mentre l'origine era chiusa 28 s dopo M2 (52-13). Sul
laboratorio la gallery e' chiusa per ogni sessione, **non ancora per chi ha
gia' in mano un indirizzo pubblico**. Non e' un passo per il telefono: e' un
vincolo per l'atto in produzione.

#### Da scrivere all'inizio della corsa

- **La versione di iOS** del telefono (*Impostazioni → Generali → Info*): senza
  il numero, «atteso assente» in `P-52-F` non e' confrontabile.
- **La larghezza** del telefono e il tablet usati per `P-52-A`.

### La corsa — 2026-09-23, fra le 16:13Z e le 17:15Z (18:13 → 19:15 a Torino)

**Tutta sul laboratorio** (`lab.resonatemotion.com`, codice `7a79353`, M2
applicata — `PRE-LAB` sopra). **Nessuna riga in produzione.** L'unica scrittura
sul laboratorio e' quella che `PRE-LAB` aveva chiesto: lo `staff` non assegnato,
creato **dall'app**.

#### Le quattro fonti, in ordine di autorita'

Ogni esito sotto porta la sua fonte fra parentesi quadre. Dove due fonti
dicono cose diverse **vince la piu' alta**; dove un passo e' passato **solo in
[4]**, e' scritto: **non e' un esito da iPhone**.

| Sigla | Fonte | Quando (UTC, locale) | Cosa prova e cosa no |
|---|---|---|---|
| **[1]** | **il proprietario, a mano**, sul suo **iPhone 17 Pro, iOS 26.7**, Safari. Schermate e una registrazione dello schermo di 2,5 minuti, viste da chi coordinava la corsa | 16:14Z → 16:28Z (18:14 → 18:28) | l'unica prova con il dito vero sul telefono vero. **Nessun tablet usato** |
| **[2]** | **lo stesso iPhone del proprietario**, pilotato dall'assistente (Appium, Safari vero); la modalita' aereo l'ha accesa il proprietario | 17:10Z → 17:15Z (19:10 → 19:15) | telefono e radio veri; il fuoco dato dal driver **non** provoca lo zoom che provoca il dito (vedi difetto 1). Viewport a riposo **402×714** CSS px, scale 1 |
| **[3]** | **iPhone 17e SIMULATO, iOS 27.0**, Safari vero, Xcode, pilotato con Appium | 16:52Z → 17:06Z (18:52 → 19:06) | Safari e tastiera veri con tocco nativo; **non** il telefono del proprietario: niente radio spenta, niente tablet, niente `Escape`. Viewport 390×699 |
| **[4]** | **Chrome 153 headless** (Blink), 360×780 con tocco emulato e 1024×768 senza | 16:13Z → 16:37Z (18:13 → 18:37) | **non e' un iPhone**: ne' tastiera ne' touch veri. Vale per struttura, ordine, rete spenta emulata, tablet |

**La versione di iOS e la larghezza** (richieste da `PRE-LAB`): **iOS 26.7** sul
telefono del proprietario, **iOS 27.0** sul simulatore. Larghezza utile del
telefono **402 px** — la piu' stretta disponibile; i **360 px** della procedura
sono stati misurati **solo in [4]**. **Il tablet non c'era**: i passi da tablet
sono di [4] a 1024 px, e restano tali.

#### Lo `staff` non assegnato — creato dall'app, come in produzione

**16:21Z (18:21) [1]**: l'**account master** ha creato dall'app, da telefono,
uno `staff` senza assegnazione. La **mail d'invito e' arrivata** su una casella
reale, la password e' stata impostata **dal link**, e l'accesso e' riuscito.
E' il percorso del prodotto per intero, non una riga scritta da script. Un
tentativo precedente, con un **punto finale** nell'indirizzo, ha mostrato un errore
sbagliato: difetto 3, sotto.

#### `P-52-A` — la barra e il pannello, per soggetto

| # | Ruolo | Esito | Fonte e osservazione |
|---|---|---|---|
| 1 | anonimo | **passa** | [3] 17:01Z: `Events · Account`, Account → `/login`, nessuna «Home». [4] 16:13Z: idem a 360 px |
| 1 | `attendee` | **passa** | [3] 17:04Z: `Events · Account`, Account → `/account`. [4] idem |
| 1 | `staff` **non assegnato** | **passa** | **[1] 16:21Z → 16:28Z**: barra `Events · TASK · Management`; foglio `Account · Gallery`. Solo [1]: [3] e [4] non avevano questo soggetto |
| 1 | `staff` assegnato | **passa** | [3] 16:56Z: `Events · Check-in · TASK · Management`, Check-in → `/door`. [4] idem |
| 1 | `organizer` | **passa** | **[1]**: `Events · Check-in · TASK · Management` (la password del banco funziona). [3] 17:01Z e [4] idem |
| 1 | `master` | **passa** | [3] 17:05Z, [4] 16:14Z: `Events · Check-in · TASK · Management` |
| 2 | staff, organizer, master | **passa** | [3]: TASK e' un pulsante `aria-disabled`, grigio, pozzetto a bordo tratteggiato; anonimo e `attendee` non l'hanno. [4] idem |
| 3 | staff assegnato, organizer, master | **passa** | [3] 16:56Z: tocco nativo su TASK — indirizzo invariato, nessun foglio, nessuna scala. [4] idem |
| 4 | organizer, staff assegnato, master | **passa** | [3] 17:01Z: il foglio sale sopra la barra, la barra resta visibile sotto, lo scrim copre la pagina, l'icona diventa **x**. [4] idem |
| 5 | organizer | **passa** | **[1]**: foglio `Account · Artists · Calendar · Formats · Gallery · Location · Manage events · Manifesto · Members · Venues · Visual`. [3]: una riga per voce, nessuna intestazione, nessun Close, nessuna maniglia; master = le stesse piu' `Newsletter` (12, alfabetiche). [4] idem |
| 6 | staff assegnato, organizer, master | **passa**, tre modi su quattro da iPhone | [3]: scrim, di nuovo Management, una riga (anche la pagina corrente) chiudono il foglio. **`Escape` solo [4]** (16:14Z): non e' un esito da iPhone |
| 7 | `attendee`, anonimo | **passa** | [3]: `/account` e `/login`. [4] idem |
| 8 | organizer | **passa**, con un difetto accanto | [3] 17:01Z: `/account` senza «Management Tools». **Ma [1]**, sulla pagina Account dello `staff`, l'etichetta dice **«Attendee»**: difetto 2 |
| 9 | organizer, tablet | **passa solo in [4]** | 1024 px: voce Management nella colonna, lista chiusa. **Non su un tablet vero** |
| 10 | organizer, tablet | **passa solo in [4]** | in Members la lista e' aperta, «Members» evidenziata, nessuna «Work», stesso ordine del foglio. **Non su un tablet vero** |
| 11 | organizer, tablet | **passa solo in [4]** | chiusa e riaperta, poi Artists dalla lista: si riapre. **Non su un tablet vero** |

#### `P-52-B` — il cancello della gallery

| # | Ruolo | Esito | Fonte e osservazione |
|---|---|---|---|
| 1 | anonimo | **passa** | [3] 17:01Z: `/gallery` → `/login?next=%2Fgallery`. [4] idem |
| 2 | organizer | **passa** | [3] 17:01Z: dopo il login si torna su `/gallery`, tre immagini firmate e caricate. [4] idem, anche con master |
| 3 | `attendee` | **passa** | [3] 17:04Z: `/gallery` → `/account`, nessun 404, nessun messaggio. [4] idem, e `/admin` rimbalza allo stesso modo |
| 4 | `staff` **non assegnato** | **passa** | **[1]**: la gallery si apre e **mostra le tre foto**. [3] e [4] l'hanno visto con lo staff *assegnato*, che non e' il soggetto del passo |
| 5 | organizer | **passa** | [3], [4]: tre immagini firmate (`/object/sign/`), nessuna «could not be loaded» |
| 6 | `attendee` | **passa** | [3] 17:04Z: sulla serata con una foto approvata **nessun titolo, nessuna immagine, nessuna parola** gallery/photo; idem sulla serata segreta. [4] idem |
| 7 | staff assegnato | **passa** | [3] 16:57Z: «Gallery» presente, immagini firmate e caricate (1 sulla serata non segreta, 2 sulla segreta). [4] idem |

#### `P-52-C` — la striscia degli strumenti appesa

| # | Ruolo | Esito | Fonte e osservazione |
|---|---|---|---|
| 1 | organizer | **passa** | **[1]**: la striscia c'e' negli strumenti. [3] 17:02Z: ordine `Artists · Calendar · … · Visual`, il primo e' Artists |
| 2 | organizer | **passa** | [3] 17:02Z: in fondo a Members la striscia resta in cima, fondo opaco, nulla traspare. [4] idem con master |
| 3 | organizer | **passa** | [3] 17:03Z: dal fondo, tocco su Artists → `/admin/artists` senza risalire |
| 4 | tablet | **passa solo in [4]** | a 1024 px la striscia e' `display:none`. **Non su un tablet vero** |

#### `P-52-D` — i chip dei format e la cifra staff

| # | Ruolo | Esito | Fonte e osservazione |
|---|---|---|---|
| 1 | anonimo | **passa** | [3] 17:00Z: chip `All · re:sonate`, nessun chip per i format senza serate. [4] idem |
| 2 | organizer | **NON PERCORSO** — il banco non lo permette | il laboratorio non ha un format con sola bozza; visto invece: gli stessi due chip [3][4]. **Non passato: non percorso** |
| 3 | anonimo | **passa** | [3] 17:00Z: `re:sonate` filtra, i chip restano due |
| 4 | anonimo | **passa** | [3] 17:01Z: `?format=` di due format senza serate → nessun filtro, lista intera. [4] idem |
| 5 | anonimo | **NON PERCORSO** — il banco non lo permette | il banco ha tre serate pubblicate; zero serate visibili non si produce senza scrivere, e non si fabbrica |
| 6 | organizer | **passa** | [3] 17:03Z: «3 staff» e' testo, il tocco non cambia indirizzo ne' righe. **[1]**: la pagina Members mostra **le tre cifre**. [4] idem con master |
| 7 | organizer | **passa** | **[1]**: la legenda c'e'. [3] 17:03Z: dice che uno staff **apre la gallery** e nient'altro di suo, e non contiene piu' la frase vecchia |

#### `P-52-E` — la porta in cinque linguette, radio accesa e spenta

| # | Ruolo | Esito | Fonte e osservazione |
|---|---|---|---|
| 1 | staff assegnato | **passa** | **[2] 17:10Z**: una riga, `All 2 · Out 1 · In 1 · Recent 0 · Alerts`, numeri senza parentesi, Alerts senza numero. [3] 16:55Z e [4] idem |
| 2 | staff assegnato | **passa** | [2] 17:10Z: Recent vuota dice «No scans yet». [3][4] idem |
| 3 | staff assegnato | **passa** | [2] 17:10Z: Alerts vuota dice «Nothing to report». [3][4] idem |
| 4 | staff assegnato | **passa** | **[2] 17:15Z, modalita' aereo vera**: **dopo circa 2 minuti** la pastiglia «Offline», il pallino su Alerts con «Alerts 1»; la linguetta aperta resta Out, la ricerca resta. [4] 16:27Z: stesso comportamento dopo **~40 s**. Vedi i fatti sotto |
| 5 | staff assegnato | **passa** | [2] 17:15Z: con Recent e con Alerts aperte «Offline» e l'avviso della guest list restano in testata; Alerts dice che la lista ha 3 minuti e chiede di ricaricare. [4] idem su tutte e cinque. «Pending» non osservato: nessun check-in fatto offline, coda vuota |
| 6 | staff assegnato | **NON PERCORSO** | scansione di un QR e annullamento da Recent: nessuna delle quattro fonti l'ha fatto. [1] non l'ha percorso; [2][3][4] non hanno una fotocamera, e la riga del banco e' un **biglietto**, senza «Check in» di riga. Visto invece [4]: nessuna scorciatoia «Undo last» in testata. **La conferma dell'annullamento resta da provare con un QR vero** |
| 7 | staff assegnato | **passa** | [2] 17:15Z: titolo, «Offline» e «QR Scan» in vista con ogni linguetta — **ma la lista corta non scorre**. La prova che scorre e' solo [4] a 360×300 (16:31Z): la testata resta con ogni linguetta |
| 8 | staff assegnato | **passa** | [2]: sempre cinque, stesse posizioni, rete accesa e spenta. [4]: 14 rilevazioni, posizioni identiche |

**Osservazione, non difetto [3]:** con «GuestList» nel campo di ricerca i
contatori in testata e i numeri delle linguette **seguono il filtro** (da
`1 / 2` a `0 / 1`). Da confermare che sia voluto.

#### `P-52-F` — la tastiera

> Detto al proprietario **prima** della corsa, in parole di dominio: *la pagina
> non si stringera' sopra la tastiera, Safari non lo fa ancora; quello che
> abbiamo sistemato e' che il nome cercato alla porta stia subito sotto il
> campo, e che l'avviso della guest list stia sopra la ricerca.*

| # | Misura | Esito | Fonte e osservazione |
|---|---|---|---|
| 1a | la barra alla porta | **passa** | **[2] 17:11Z**: al fuoco sulla ricerca la barra e' `display:none`, al blur torna; la pagina non salta (scrollY 0). [3] 16:54Z: sparisce 19 ms dopo il tocco. [4] idem |
| 1b | la barra su un form pubblico | **passa, solo simulatore** | [3] 17:05Z, `attendee`, **campo del codice sconto** su una serata: la barra sparisce al fuoco e torna al blur; Safari porta il campo in vista (scroll-into-view, non un salto). Non misurato su [1] ne' [2]. [4] non percorso |
| 2 | l'avviso della guest list sopra la ricerca | **passa** | **[2] 17:15Z, radio spenta**: l'avviso «do not refuse them… let them in» e' sopra il campo. [4] 16:27Z idem. A rete accesa l'avviso non esiste, per costruzione |
| 3 | la ricerca in cima, la riga trovata sopra la tastiera | **passa**, con una riserva | **[2] 17:12Z**: tastiera aperta, altezza visibile 354 px; ricerca a 125, la riga trovata 239→317, **intera sopra la tastiera**. [3] 16:55Z idem (257→301 su 346). **Riserva:** la porta del banco ha due righe e **non scorre**, quindi «sale in cima» non e' osservabile su iPhone; lo e' solo in [4] a 360×300 (16:31Z: da 126 a 80). **La riga del banco non ha «Check in»**: e' un biglietto, si scansiona. [4] a 360×780 aveva dato **non passa** per la stessa ragione (pagina che non scorre), superato dalla misura a 360×300 |
| 4 | il ridimensionamento sotto la tastiera | **atteso assente — osservato assente** | **[2] 17:12Z, iOS 26.7**: `innerHeight` 714 prima e dopo, scende solo l'altezza visibile (354). [3] 16:54Z, **iOS 27.0**: idem. Non e' un fallimento della fase |
| — | **lo zoom di Safari al tocco su un campo** | **DIFETTO** | **[1]**: schermate delle 16:14Z e 16:23Z, pagina al 114 %. [3]: su **ogni** campo toccato scale 1 → **1,1436**, che **resta dopo il blur**. [2]: il fuoco dato dal driver non lo provoca, il dito si'. [4]: nessun overflow in Blink. **Difetto 1**, sotto |
| 5 | **il login com'e'** | **misurato** — decide D-52-28 | [3] 16:58Z: **fuoco su email → password e «Sign In» COPERTI** dalla tastiera (email 284→328, password 344→388, «Sign In» 404→452, visibile fino a 322). **Fuoco su password → Safari scorre di 200 px e tutti e tre stanno sopra la tastiera** (92→136, 152→196, 212→260). **[1]**: la schermata delle 16:23Z, con il fuoco sulla password, mostra email, password e «Sign In» in vista — conforme. In nessuno dei due stati «Sign In» e' irraggiungibile scorrendo; in entrambi la pagina e' zoomata |

#### `P-52-G` — i media chiusi (la parte manuale, sonda 5)

| Sonda | Esito | Fonte e osservazione |
|---|---|---|
| 5 — immagini in `/gallery` | **passa** | **[1]**: con lo `staff` non assegnato la gallery mostra le tre foto. [3] 17:01Z con organizer: tre immagini firmate, caricate, zero «could not be loaded». [4] idem con master, zero riquadri vuoti muti |
| 5 — la moderazione | **passa, con master** | [3] 17:06Z: «Media review» della serata segreta, un'immagine pending firmata e caricata; **Approve / Reject non toccati**. [4] 16:31Z idem. **Con l'organizer non percorribile**: vedi i fatti sotto |
| 5 — un video in pausa e ripreso | **NON PERCORSO** | **il banco non ha un video** (`PRE-LAB`, punto 2), e nella corsa nessuno ne ha caricato uno. Visto invece: zero `<video>` in gallery e in moderazione [3][4] |
| 7 — un caricamento nuovo | **NON PERCORSO** | nessun caricamento nella corsa: `--check-new-upload` non ha soggetto. Resta aperto |
| 1-4, 6, 8 | **del piano 52-13** | misurate li' (sonda 1 in due letture, la cache del bordo oltre i 62 minuti); non sono passi da telefono |

#### Fatti misurati, non difetti

- **Manage events mostra «No events yet» all'`organizer`** ([1], [3] 17:03Z): la
  lista di un `organizer` e' filtrata per `created_by`
  (`src/app/(admin)/admin/(work)/events/page.tsx:119`, la ragione e' scritta a
  `:30-37`), e le serate del banco le ha create il `master`. E' il
  comportamento dichiarato (D-34-06), non un buco del banco. Per questo la
  moderazione della sonda 5 e' stata vista con il `master`.
- **A radio spenta l'avviso della guest list e il pallino di Alerts arrivano
  dopo un po'**, non all'istante: **~40 s** in [4], **~2 minuti** sul telefono
  [2]. Nascono quando cade il canale realtime (timeout dell'heartbeat): e' il
  segnale, non la radio, che li accende. **Per chi sta alla porta vuol dire che
  per i primi momenti senza rete la porta non lo dice ancora.**

---

## Difetti trovati dalla corsa

> **La fase non va in produzione con questi tre difetti aperti.** Il piano 52-15
> (l'atto in produzione) **non parte** prima di un piano di chiusura che corregga
> almeno il difetto 1 e lo ri-misuri sul simulatore. Gli altri due sono piccoli,
> ma sono sulla stessa strada: conviene chiuderli nello stesso piano.

### Difetto 1 — Safari zooma la pagina al tocco su un campo (Critical per la porta)

- **Cosa si vede.** Toccando un campo di testo su iPhone la pagina si ingrandisce
  e **resta ingrandita dopo aver chiuso la tastiera**: una pagina «piu' larga
  dello schermo», con la barra in basso tagliata a destra. Alla porta il bordo
  destro perde **«QR Scan»** e la linguetta **«Alerts»** ([3], schermate con
  tastiera aperta) — cioe' il pulsante con cui si fa entrare la gente e la
  linguetta che dice che la lista e' vecchia.
- **Dove l'ha visto il proprietario** [1]: Members, login, pagina di
  impostazione della password.
- **La misura** [3]: ogni campo toccato ha **font-size 14 px**, e ogni tocco
  porta `visualViewport.scale` da **1 a 1,1436** (larghezza visibile 390 → 341
  px): ricerca della porta, email e password del login, codice sconto. A riposo
  **nessuna** pagina ha overflow orizzontale (`scrollWidth` = `innerWidth`
  ovunque); [4] conferma **zero overflow in Blink** su 53 rilevazioni. E' **lo
  zoom di WebKit**, non il layout.
- **La causa nel codice.** `src/components/ui/Input.tsx:103` — la classe
  `text-sm` (14 px) del controllo comune a tutti i campi. Safari iOS zooma ogni
  campo sotto i 16 px.
- **La correzione provata.** Con `input,select,textarea{font-size:16px}`
  iniettato, lo scale **resta 1** al tocco (contro-prova sul simulatore).
- **Il requisito del proprietario, testuale (2026-09-23):** *«se sono sulla
  pagina di login, e clicco sul campo mail o password, non deve avvenire lo
  zoom»*.
- **Il vincolo:** **D-41-08 vieta di bloccare lo zoom**, quindi niente
  `maximum-scale` ne' `user-scalable=no`. La correzione e' **16 px sui campi a
  larghezza di telefono**, non un viewport che toglie lo zoom a chi ne ha
  bisogno.
- **La chiusura comprende la ri-misura** sul simulatore: scale 1 al tocco su
  ricerca della porta, login e codice sconto, e il login di D-52-28 rimisurato.

### Difetto 2 — la pagina Account di uno `staff` dice «Attendee»

- **Cosa si vede** [1], nella registrazione dello schermo: lo `staff` appena
  creato apre Account e legge **«Attendee»**.
- **La causa.** `src/app/(members)/account/page.tsx:254-259`: l'etichetta
  conosce solo `master` («Admin») e `organizer`; **ogni altro ruolo** ricade su
  «Attendee».
- **Perche' conta.** E' il gate lessicale del progetto: `attendee` e' l'account
  leggero di chi ha comprato un biglietto. Dire a uno staff che e' un attendee
  e' dirgli il ruolo sbagliato — e a chi guarda lo schermo di un altro, dargli
  un'informazione falsa su chi sta lavorando alla porta.

### Difetto 3 — un indirizzo con il punto finale produce «The write failed»

- **Cosa si vede** [1], durante la creazione dello `staff`, prima di quella riuscita delle 16:21Z: creando un account con un indirizzo
  che finisce con un punto, il modulo risponde **«The write failed»** — la frase
  di un guasto del database.
- **La causa.** Il servizio di autenticazione rifiuta l'indirizzo con il codice
  `validation_failed`, che **non ha una voce propria** nella mappa dei messaggi
  di `src/app/(admin)/admin/members/CreateAccountForm.tsx` e ricade su
  `write_failed` (`:115-121`), che parla di database e di record forse creati a
  meta'.
- **Perche' conta.** **Non e' silenzioso** — qualcosa si vede e nulla e' stato
  creato — ma **e' fuorviante**: chi legge pensa a un guasto e non all'indirizzo
  da correggere. E' il pattern del newsletter (`meta-gates.md`): cause diverse
  sotto un messaggio che ne racconta un'altra.

---

## La decisione sul login (D-52-28) — 2026-09-23

**La misura** (`P-52-F` passo 5): con il fuoco su **email**, password e «Sign
In» sono **coperti** dalla tastiera; con il fuoco su **password**, Safari scorre
da solo e **tutti e tre** stanno sopra la tastiera ([3], e la schermata del
proprietario [1] conforme). In entrambi gli stati la pagina e' zoomata (difetto
1).

**La domanda al proprietario:** `resta` (il modulo di accesso resta centrato)
oppure `allinea` (si allinea in alto sul telefono, toccando `FOCUS_ROOT` di
`PageShell`, il cui digest e' custodito da `verify:conversion`, e con esso
**tutte** le superfici `focus`).

**La risposta, letterale (2026-09-23):**

> *«se sono sulla pagina di login, e clicco sul campo mail o password, non deve
> avvenire lo zoom (come accade ora). non so quale delle due scelte sia»*

**La scelta registrata: `resta`.** L'ha registrata **chi coordinava la corsa, a
nome del proprietario**, perche' la risposta non sceglie fra le due opzioni ma
enuncia un **requisito** — niente zoom al tocco — che **nessuna delle due
soddisfa**: e' il difetto 1, e si chiude con i 16 px sui campi, non spostando
il modulo. `resta` e' la scelta che non tocca le superfici `focus` ne' il loro
digest, e il resto della misura (con il fuoco sulla password tutto e' in vista)
non chiede di piu'.

**`allinea` resta disponibile.** Chi coordinava si e' impegnato a **ri-misurare il
login sul simulatore dopo la correzione del difetto 1**: se con i campi a 16 px,
e il fuoco sulla password, «Sign In» risultasse coperto, la decisione si riapre
e `allinea` si prende in un piano di chiusura, **prima** di 52-15.

---

## Chiusura delle lacune (piani 52-18 e 52-19) — 2026-09-23

### Linea di base, prima della correzione

- **Fonte.** Simulatore iPhone 17e, iOS 27.0, Safari, pilotato da Appium
  (XCUITest, protocollo W3C). Il `click` su un elemento web e' un **tocco
  nativo**: apre la tastiera e fa scattare lo zoom di Safari. L'app gira in
  locale con `npm run dev:lab`, cioe' contro il **database del laboratorio**
  (lo script rifiuta la produzione come prima riga). Account del banco:
  anonimo per login e codice sconto, lo `staff` assegnato per la porta, il
  `master` per il modulo Create account.
- **Commit misurato:** `5eb41168` (il tree dopo 52-18, **senza** la correzione).
- **Procedura, uguale per ogni campo:** si carica la pagina (lo zoom riparte da
  1: «riposo»), tocco nativo sul campo, 1,5 s, misura; poi `blur()` del campo,
  1,5 s, misura di nuovo («dopo il blur»). `scale` e' `visualViewport.scale`;
  `fs` e' il `font-size` calcolato del campo.

| Campo | Ora (UTC) | Riposo | Al tocco | Dopo il blur | `fs` |
|---|---|---|---|---|---|
| (a) `/login`, email | 17:54:11Z | 1 | **1,1436** (larghezza visibile 390 → 341) | **1,1436** | 14px |
| (b) `/login`, password | 17:54:18Z | 1 | **1,1436** | **1,1436** | 14px |
| (c) `/door`, «Search by name...» (serata «Lab Night») | 17:55:17Z | 1 | **1,1436** | **1,1436** | 14px |
| (d) `/admin/members`, `select` del ruolo in Create account | 17:56:52Z (ripetuta alle 17:57:37Z con `nativeWebTap`) | 1 | 1 | 1 | 14px |
| (e) pagina pubblica di una serata in vendita, codice sconto (anonimo) | 17:54:58Z | 1 | **1,1436** | **1,1436** | 14px |
| (f) `/login`, email, **in orizzontale** | 17:54:34Z | 1 (larghezza 750) | **1,1427** (750 → 656) | **1,1427** | 14px |

**Il difetto e' riprodotto** su (a), (b), (c) ed (e) con i numeri di 52-14 —
1,1436, e lo zoom resta dopo il blur — quindi la sonda lo vede, e la misura dopo
la correzione prova qualcosa. `scrollWidth` resta 390 in ogni stato: e' lo zoom
di WebKit, non il layout.

**Due differenze dall'atteso, per prima cosa:**

- **(d) il `select` nativo non zooma, gia' a 14 px**, due volte, anche con
  `nativeWebTap`: su iOS 27 il tocco su un `select` apre il menu a comparsa del
  sistema e la pagina resta a scala 1. Il `select` e' comunque coperto dalla
  correzione (stesso controllo del primitivo, e la rete CSS), ma per lui la
  misura non puo' mostrare un prima/dopo: dice solo che **non peggiora**.
- **(f) in orizzontale la larghezza e' 750 px, non sopra 768**: l'iPhone 17e
  simulato resta **sotto il bordo `md`** anche ruotato. Il caso che giustifica la
  rete CSS senza limite di larghezza (un telefono piu' largo di `md`) qui non si
  presenta; la ragione resta valida per i telefoni piu' larghi.

**La porta, a tastiera aperta (c):** Safari sposta l'area visibile di 24,5 px a
destra; «QR Scan» e la linguetta Alerts finiscono a 342 px su una larghezza di
layout riportata di 341, mentre i primi 24,5 px a sinistra della pagina escono
di vista. E' lo stato che 52-14 aveva fotografato come «bordo destro tagliato».

**P-52-F passo 5, prima della correzione (17:54:24Z, pagina zoomata a 1,1436):**
con il fuoco sull'email, l'email e' in vista e password e «Sign In» sono coperti
dalla tastiera; con il fuoco sulla password, Safari scorre e il rettangolo
visibile (altezza 323 px, a partire da 200 px) contiene solo «Sign In» — email
(92–136) e password (152–196) restano sopra, fuori vista. **Diverge da [3]**, che
con il fuoco sulla password aveva visto tutti e tre in vista: la sonda legge i
rettangoli 1,5 s dopo il tocco, a pagina zoomata, e sotto zoom l'area visibile e'
piu' stretta e piu' bassa. Il dato che decide D-52-28 e' quello **dopo** la
correzione, a scala 1.
