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
