---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
document: autorizzazione a scrivere in produzione — rimozione per chiave (D-52-30) e ri-spogliatura (D-52-31)
written: 2026-09-23
written_at: "2026-09-23T18:40Z"
granted: yes
granted_date: 2026-09-23
granted_by: il proprietario
granted_at: "2026-09-23T18:42:23Z — risposta scelta dal proprietario con lo strumento di domanda dell'orchestratore; registrata qui a quest'ora dell'orologio di questa macchina, prima di qualunque lancio"
answer: entrambe
scope: "(a) purge-media-orphans --dry-run poi --apply, R 0 · O 0; (b) restrip-event-media --dry-run poi --apply con --before 2026-09-23T18:29:09Z, P 0 · V 0 — in quest'ordine, oggi, una volta"
status: CONCESSA
counted_at: "2026-09-23T18:38:21Z → 18:38:28Z"
numbers: "R 0 · O 0 · in volo 0 · P 0 · V 0"
---

# Autorizzazione a scrivere in produzione — 2026-09-23, rimozione e ri-spogliatura dei media

> **Scritto PRIMA che la domanda venisse posta.** Il perimetro, i numeri e la
> soglia qui sotto sono stati fissati alle 18:40Z del 2026-09-23, quando il
> proprietario non aveva ancora risposto. La risposta si registra alla lettera
> nel §2; se restringe il perimetro, il passo escluso si dichiara **al suo
> posto** nel §3, senza riscrivere il §1.

`ai-engineering.md`, gate *l'autorizzazione a scrivere in produzione e' un atto,
non un permesso*. Questa e' la **seconda domanda della fase**, separata da
`52-AUTHORISATION.md` (M1 → deploy → M2, ESAURITA alle 18:29Z) perche' ha
un'irreversibilita' diversa: la' si chiudeva, qui si **cancellano oggetti** e si
**sovrascrivono foto**. Il progetto di produzione **non ha PITR**; il ref e' la
costante `PRODUCTION_REF` dei due strumenti, il laboratorio non compare qui.

Qui, a differenza degli atti precedenti, **non e' chi esegue a far rispettare il
documento: sono gli strumenti**. `scripts/purge-media-orphans.mjs` (piano 52-09)
e `scripts/restrip-event-media.mjs` (piano 52-10) leggono **ciascuno il proprio
blocco** di concessione, fra i propri marcatori; rifiutano (uscita 2, nessuna
lettura) se il blocco manca, se `granted` non e' `yes`, se `granted_on` non e'
la data di `--dated`, se `spent` non e' `no`; si fermano con `count_drift`
(uscita 1, nessuna scrittura) se i numeri di oggi non sono quelli del blocco; e
**marcano `spent: yes` da se'**, dentro il loro blocco, dopo l'atto.

---

## 0. I numeri di oggi, riletti in produzione dopo M2

Management API, `POST /v1/projects/<produzione>/database/query`, **`read_only:
true`**, solo conteggi; nessuna riga, nome d'oggetto, path, URL o identificativo
restituito o stampato. Stato del progetto letto prima: **`ACTIVE_HEALTHY`**
(18:38:21Z). `now()` del database **18:38:21.988Z**. Le stesse popolazioni che
gli strumenti contano, con le stesse definizioni (orfano = oggetto che nessuna
riga nomina ne' per `storage_path` ne' per coda dell'`url`; «in volo» = orfano
nato da meno di 60 minuti).

| Lettura | Censimento 52-01 (13:08:07Z) | Atto 52-15 (18:30:56Z) | **Oggi, 18:38:21Z** |
|---|---|---|---|
| righe di `event_media` — approvate / in attesa / rifiutate | 0 / 0 / 0 | 0 | **0 / 0 / 0** |
| oggetti nel bucket `event-media` | 0 | 0 | **0** |
| **R** — oggetti di righe `rejected` (oggetto + riga) | — | — | **0** |
| **O** — oggetti orfani piu' vecchi di 60 minuti (solo oggetto) | 0 | — | **0** |
| oggetti orfani «in volo» (meno di 60 minuti) — mai toccati | — | — | **0** |
| **P** — foto con `created_at` anteriore alla soglia | 0 | — | **0** |
| **V** — video con `created_at` anteriore alla soglia | 0 | — | **0** |
| righe pre-soglia senza `storage_path` | — | — | **0** |
| vincoli che pendono da `event_media` (`pg_constraint.confrelid`) | — | — | **0** |
| `20260809006000` nella history | **non registrata** | — | **non registrata** (0 righe) |
| ultime versioni in `schema_migrations` | — | `20260923182908` · `20260923182638` · `20260923110143` | **le stesse** |
| `event-media` pubblico? | `true` | `false` | **`false`** |
| oggetti in `event-media-quarantine` | — | — | **0** |
| serate fra ieri e domani · check-in nelle ultime 24 h | 0 · 0 | 0 · 0 | **0 · 0** |

**Riconteggio da una seconda fonte**, 18:38:22Z → 18:38:28Z: PostgREST con la
chiave di servizio — righe di `event_media` in tutto **0**, approvate **0**, in
attesa **0**, rifiutate **0**; API Storage, elenco della radice di `event-media`
**0** voci e di `event-media-quarantine` **0** voci. **Le due fonti concordano:
zero ovunque.**

### 0.1 La soglia della ri-spogliatura, e perche' e' questa

In produzione `20260809006000` **non e' nella history** (censimento 52-01, riletto
oggi): la soglia «prima dello stripper» **non si legge**, si sceglie e si
dichiara. Lo strumento lo sa: se la migration non e' registrata lo dice e usa la
soglia dell'atto, che deve coincidere con `--before`.

**Soglia scelta: `2026-09-23T18:29:09Z`** — il primo secondo intero dopo la fine
di M2 (18:29:08.464Z, `52-AUTHORISATION.md` §3).

Perche' questa e non `2026-08-09T00:00:00Z`, la data che la migration porta nel
nome:
- **la data del nome non e' la data in cui lo stripper ha cominciato a girare in
  produzione.** Lo stripper e la migration sono stati scritti il 2026-08-09 (commit
  delle 02:06Z e 04:20Z), ma quando il loro effetto sia arrivato in produzione
  **non e' registrato da nessuna parte** che si possa rileggere. Una riga nata fra
  il 9 agosto e quel momento sarebbe pre-stripper e **fuori** da una soglia al 9
  agosto;
- **il verso dell'errore decide.** Una soglia troppo presto lascia una foto con
  GPS nel bucket, e una coordinata di una secret venue uscita non rientra
  (`venue-secrecy.md`, guardia monotona). Una soglia troppo tardi ri-codifica una
  foto gia' spogliata: costa qualita' JPEG (`strip-metadata.ts`, «The price is
  declared»), non un segreto. Si sceglie il verso che costa meno;
- **M2 e' un confine con un'ora scritta**, e dopo M2 ogni oggetto nasce dal
  codice spedito oggi, che spoglia prima di scrivere (`verify:media-strip` 6/6).
  La soglia non si muove piu': un caricamento di stasera non cambia P ne' V.

**Con i numeri di oggi la scelta non cambia nulla**: la tabella non ha righe, e
qualunque soglia da' P = 0 e V = 0.

---

## 1. Il perimetro, e non un byte oltre

Nell'ordine: **prima la rimozione, poi la ri-spogliatura** — non si ripulisce un
oggetto che si sta per togliere.

| # | Passo | Che cosa tocca, alla lettera |
|---|---|---|
| **(a)** | `node scripts/purge-media-orphans.mjs --dry-run --project <PRODUCTION_REF> --authorised .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-AUTHORISATION-MEDIA.md --dated 2026-09-23`, poi lo stesso con `--apply`; soglia in volo 60 minuti (default, e in produzione non scende) | **R = 0** oggetti di righe `rejected`, ciascuno tolto **per nome esatto** con **la sua riga** (`DELETE … WHERE id = any(<catturati>) AND status = 'rejected'`), e **O = 0** oggetti orfani, tolti **per nome esatto**, **numeri separati** in ogni riga del referto. Istantanea di **soli metadati** in `.env.media-purge-snapshot.<stamp>.json` prima di ogni scrittura; riverifica per chiave subito prima dell'atto; riconteggio da fonte diversa (oggetti dal catalogo, righe da PostgREST) |
| **(b)** | `node scripts/restrip-event-media.mjs --dry-run --project <PRODUCTION_REF> --before 2026-09-23T18:29:09Z --authorised <questo file> --dated 2026-09-23`, poi lo stesso con `--apply` | **P = 0** foto ripassate dallo **stesso** `stripImageMetadata` del prodotto e riscritte sullo **stesso** `storage_path` (`upsert: true`, voluto), **riga intatta**; **V = 0** video **contati e non toccati** (lo stripper non tratta i video). Istantanea dei **byte originali** in `.env.restrip-snapshot.<stamp>/` prima; conferma da rilettura fresca, eTag del catalogo e URL firmato; righe rilette per intero; oggetti non catturati confrontati prima/dopo (`collateral_write`) |

**Con i numeri di oggi entrambi i passi non hanno soggetto.** Entrambi gli
strumenti sono scritti per questo caso: *«una decisione senza soggetti non si
esegue»*. Con R = O = 0 `purge-media-orphans` riconta lo zero da PostgREST ed
esce 0 **senza istantanea e senza consumare il blocco**; con P = 0
`restrip-event-media` esce 0 **senza consumare il blocco**. Nemmeno il
`--dry-run` in produzione si puo' lanciare prima della risposta: gli strumenti
rifiutano (uscita 2) un blocco con `granted: no` — **provato su questo file alle
18:39:55Z e 18:40:00Z**: `purge-media-orphans --dry-run` → *«granted = no, atteso
yes»*, `restrip-event-media --dry-run` → *«non concesso: granted = no»*, entrambi
uscita 2, nessuna lettura, nessuna istantanea nuova. I numeri del §0 sono quindi
quelli di una lettura propria, con le stesse definizioni degli strumenti; sono
gli strumenti a riconfermarli al passo, e a fermarsi se non coincidono.

**Una conseguenza da dire prima, non dopo:** se il proprietario concede e i
numeri restano zero, **gli strumenti non scriveranno `spent: yes`** nei loro
blocchi, per costruzione. L'atto si chiudera' comunque `ESAURITA` al §4 con l'ora,
dichiarando che i blocchi restano `granted: yes · spent: no` perche' nessuno
strumento ha avuto un soggetto — e che la data di `granted_on` (oggi) impedisce
di riusarli domani: uno strumento lanciato con `--dated` di un altro giorno
rifiuta.

**Fuori perimetro, esplicitamente:**
- ogni altra scrittura in produzione — tabelle, righe, ruoli, profili, bucket,
  policy, configurazione di Supabase o di Vercel;
- ogni oggetto **«in volo»** (nato da meno di 60 minuti): contato, mai toccato;
- ogni riga **non** `rejected`, e ogni riga `rejected` senza `storage_path` o il
  cui oggetto non c'e' gia' piu' (contate a parte dallo strumento, non toccate);
- ogni **video**: contato in V, mai trattato — nessuno strumento del repo spoglia
  un video;
- ogni oggetto di `event-media-quarantine` e di `event-images`;
- un'**invalidazione della CDN**: e' un atto diverso, non un'estensione di questo;
- una **seconda corsa** di uno strumento dopo un'uscita diversa da 0 successiva a
  una scrittura: ci si ferma, si riporta la categoria, e si richiede;
- la cancellazione delle istantanee locali — di oggi e dei piani 52-09/52-10: e'
  un passo datato del piano 52-17, dopo l'approvazione del VERIFICATION;
- il push verso `origin`.

**Irreversibilita'.**
- **(a) la rimozione non si annulla.** L'istantanea e' di **soli metadati, per
  scelta dichiarata**: tenere i byte di una foto rifiutata sul disco di chi
  esegue ne vanificherebbe la rimozione, e sposterebbe l'immagine di una persona
  dal bucket, dove una policy la governa, a un portatile dove non la governa
  niente (`legal-compliance.md`, gate *immagini delle persone*). L'istantanea
  dice **cosa** e' stato tolto, non lo rimette.
- **(b) la ri-spogliatura si annulla solo dall'istantanea dei byte originali**
  (provato sul laboratorio alle 13:46Z: ripristino verificato con sha256). Quella
  istantanea contiene foto di persone con le loro coordinate: **si cancella in una
  data scritta nel piano 52-17**, dopo la conferma del VERIFICATION, e da quel
  momento anche (b) non si annulla piu'. La ri-codifica JPEG non e' lossless: un
  secondo passaggio ri-codifica di nuovo, quindi (b) **si esegue una volta**.

**Cache.** Riscrivere o togliere un oggetto non richiama le copie gia' servite:
la CDN dello storage puo' servire la versione precedente — **con il GPS** — fino
al `max-age` dell'oggetto (3600 s), **anche a bucket privato**, e sul laboratorio
una foto rispondeva 200 **62 minuti dopo M2** (52-13). Il service worker e
l'ottimizzatore d'immagini sono copie ulteriori. **Con 0 oggetti oggi e 0 dal
censimento delle 13:08Z il residuo in produzione e' zero per costruzione**; se al
passo gli oggetti non sono piu' 0, il residuo si misura e si scrive nel
VERIFICATION con i tempi (sonda ripetuta nel piano 52-17).

**Provata sul laboratorio, oggi.**
- **(a)** piano 52-09: `--dry-run` poi `--apply` sul banco dei media — la foto
  rifiutata con il suo oggetto e l'orfano del banco rimossi per chiave, la foto
  pre-stripper intatta; istantanee di soli metadati alle **13:42:17Z, 13:42:33Z,
  13:42:49Z**; tutti i rifiuti del blocco provati (modo assente, `spent: yes`
  dentro il blocco, data diversa, blocco assente, soglia in volo sotto 60 in
  produzione: uscita 2 prima di ogni lettura).
- **(b)** piano 52-10: `--apply` finale alle **13:47:44Z** su una foto vera con
  GPS del banco — EXIF **354 → 0 byte**, stesso path, stessa riga (JSON
  identico), 0 oggetti collaterali riscritti, uscita 0; controllo indipendente
  alle 13:47:55Z. Il primo `--apply` (13:44:27Z) si era fermato con
  `still_has_exif` perche' la rilettura arrivava dalla cache: corretto (`bf9223d`)
  e la foto ripristinata dall'istantanea prima della corsa finale.

### I due blocchi di concessione

Letti e marcati **solo fra i loro marcatori**, ciascuno dal proprio strumento.
Fino alle 18:42:23Z `granted: no`; da quell'ora, per la risposta `entrambe`,
`granted: yes` e `granted_on: 2026-09-23` in **tutti e due** — nient'altro
toccato dentro i blocchi.

<!-- purge-media-orphans: grant -->
act: event_media.purge
target: production
granted: yes
granted_on: 2026-09-23
spent: no
rejected_objects: 0
orphan_objects: 0
<!-- /purge-media-orphans: grant -->

<!-- restrip-event-media: grant -->
act: event_media.restrip
target: production
granted: yes
granted_on: 2026-09-23
spent: no
before: 2026-09-23T18:29:09Z
photos: 0
videos: 0
<!-- /restrip-event-media: grant -->

---

## 2. La domanda, alla lettera — e la risposta

Da porre al proprietario, con le quattro opzioni e senza raccomandarne una:

> «Il secondo atto della fase 52 in produzione, oggi 2026-09-23, dopo M2:
> **(a)** togliere per chiave dal bucket dei media gli oggetti delle foto
> rifiutate, con la loro riga, e gli oggetti orfani — oggi **R = 0** rifiutate
> con oggetto e **O = 0** orfani (piu' **0** caricamenti in volo, che non si
> toccano mai); la rimozione non si annulla. **(b)** ripassare dallo stripper
> del prodotto ogni foto caricata prima della soglia **2026-09-23T18:29:09Z**,
> stesso indirizzo e stessa riga — oggi **P = 0** foto, e **V = 0** video che
> nessuno strumento spoglia e che si contano soltanto; si annulla solo dalla
> copia locale dei byte, che si cancella nel piano 52-17. Contati alle
> **18:38:21Z** da due fonti che concordano: **la produzione non ha media**, e
> con questi numeri entrambi gli strumenti diranno *"niente da fare"*, usciranno
> senza scrivere e senza spendere il permesso. Il progetto non ha PITR.
> Autorizzi `entrambe`, `solo-rimozione`, `solo-ristrip` o `niente`?»

**Le opzioni, e cosa autorizza ciascuna:**

| Risposta | Autorizza | Resta aperto |
|---|---|---|
| `entrambe` | (a) poi (b), oggi, una volta; `granted: yes` e `granted_on: 2026-09-23` in **tutti e due** i blocchi | nulla di questo atto. Con R = O = P = 0 gli strumenti non scrivono ne' spendono: D-52-30 e D-52-31 si chiudono **senza soggetti**, e il VERIFICATION lo dice con i numeri |
| `solo-rimozione` | (a); `granted: yes` **solo** nel blocco `purge-media-orphans` | (b): le P foto pre-soglia restano con i loro metadati, leggibili da chi tiene `gallery.view` — oggi **P = 0** |
| `solo-ristrip` | (b); `granted: yes` **solo** nel blocco `restrip-event-media` | (a): R oggetti rifiutati e O orfani restano nel bucket, irraggiungibili per firma ma non rimossi — oggi **R = O = 0** |
| `niente` | nessun passo; entrambi i blocchi restano `granted: no` | D-52-30 e D-52-31 restano aperti: il VERIFICATION li dichiara debito **con i numeri di oggi, R 0 · O 0 · P 0 · V 0** |

Risposta del proprietario, letterale: **`entrambe`** — posta alla lettera dallo
strumento di domanda dell'orchestratore il 2026-09-23 (l'etichetta mostrata era
«entrambe (Recommended)»: la raccomandazione era dello strumento, non di questo
documento, che non ne fa), registrata qui alle **18:42:23Z**, prima di
qualunque lancio. Concede (a) poi (b), oggi, una volta.

---

## 3. Registro d'uso

*(vuoto — nessuno strumento e' stato lanciato contro la produzione.)*

| # | Passo | Eseguito (UTC) | Referto dello strumento | Riconteggio da fonte diversa | Esito |
|---|---|---|---|---|---|
| (a) | `purge-media-orphans` `--dry-run` · `--apply` | — | — | — | — |
| (b) | `restrip-event-media` `--dry-run` · `--apply` | — | — | — | — |

Nel registro vanno **solo** numeri, categorie, ore UTC e i **nomi** dei file
d'istantanea — mai il loro contenuto, mai un nome d'oggetto, un path, un URL o
un id.

---

## 4. Chiusura

*(vuota — il documento non e' ancora stato concesso.)*
