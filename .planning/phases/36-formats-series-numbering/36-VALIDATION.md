---
phase: 36
slug: formats-series-numbering
status: complete
nyquist_compliant: false
wave_0_complete: true
created: 2026-08-10
closed: 2026-08-10
---

# Phase 36 — Validation Strategy e registro di chiusura

> Contratto di validazione della fase. Distillato da `36-RESEARCH.md`
> § *Validation Architecture*, che porta le misure.
>
> **`nyquist_compliant: false` e' deliberato, non un lavoro da finire.** Cinque
> requisiti su sei non hanno alcuna prova automatica possibile in questo
> repository, e chiamarli coperti sarebbe una bugia che poi qualcuno userebbe
> per chiudere la fase. Il precedente esiste: `31-VALIDATION.md` fa lo stesso,
> per la stessa ragione.

---

## Cio' che questo registro deve dire prima di tutto

### 1 · Un incidente di perdita dati, causato dalla verifica stessa

**Il 2026-08-10, alle ~16:56 UTC, l'esecuzione di V1/V2 ha cancellato per
errore i due eventi di produzione e, in cascata, 63 righe in sette tabelle.**

Gli eventi e le tre serate **sono stati ripristinati** riga per riga da una
istantanea presa prima di toccare qualsiasi cosa, e sono **byte-identici**. Le
63 righe delle altre sette tabelle **non lo sono state**: nessuna istantanea le
copriva e il progetto non ha PITR.

Il dettaglio completo — cosa e' successo, cosa e' tornato, cosa non e' tornato,
e la decisione che resta al proprietario — sta in `36-14-SUMMARY.md`, sezione
*L'incidente*, e in `deferred-items.md` **D12**. E' nominato qui perche' chi
legge un registro di validazione non deve scoprirlo altrove.

**Nessuna delle osservazioni qui sotto e' stata alterata dall'incidente:** V1,
V2 e V5 sono state misurate **prima** della cancellazione, contro righe create
apposta, e V4 dopo il ripristino. Ma un registro che le presentasse senza dire
questo sarebbe il tipo di documento che T-36-14-03 esiste per impedire.

### 2 · Cio' che la fase non puo' provare, detto prima di cio' che prova

- **Che il cancello rifiuti un *ruolo*.** Nessuno strumento di questo repository
  puo' autenticarsi come `organizer` o `staff`: `scripts/rls-baseline.mjs:796`
  li *simula* con `set_config('request.jwt.claims', …)`. E' il debito delle
  **32 voci `human_needed`** fra `43-VERIFICATION.md` (14),
  `35-VERIFICATION.md` (9) e `34-VERIFICATION.md` (9). **Questa fase non lo
  consuma e non lo peggiora — e ha costruito superfici pubbliche sopra un
  modello dei permessi che nessuno ha ancora visto rifiutare qualcuno.**
- **Che un nome di colonna nuovo sia scritto giusto ovunque.** Nessun client
  Supabase e' parametrizzato con `Database`. Un `select` sbagliato e' un errore
  a runtime, non di build.
- **Che nessuna superficie pubblica porti un conteggio.** Non esiste un
  meccanismo che lo asserisca. La cosa piu' vicina a una prova e' la lettura del
  **sorgente reso** al punto 3 di V3 — **fatta** da 36-13, non evocata.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **NESSUNO** — `package.json` non ha script `test`; non esiste alcun `*.test.*` o `*.spec.*`. **E non se ne e' introdotto uno in questa fase.** |
| **Config file** | nessuno |
| **Quick run command** | `npm run build` — che **e'** il typecheck (`next build` esegue il controllo dei tipi) |
| **Full suite command** | non esiste |
| **Estimated runtime** | build ~60–120s · `baseline:container` alcuni minuti (avvia `postgres:17.6`) |

**Nessun criterio di accettazione di questa fase e' «i test passano».**
(`CLAUDE.md`, Environment Guardrail 1.)

### Cosa gli strumenti asseriscono davvero

| Comando | Asserisce | **Non** asserisce |
|---|---|---|
| `npm run build` | I tipi compilano; l'unione `Record<CapabilityKey, Binding>` e' totale; ogni rotta staff statica ha un binding | **Nessun nome di colonna.** Nessun client Supabase e' parametrizzato con `Database`: `format_id` scritto `fomat_id` compila |
| `npm run verify:capabilities` | Chiavi `CAP`, righe di `private.capabilities`, stringhe nei corpi delle policy e siti di chiamata sono lo stesso insieme | Che una chiave sia legata alla rotta **giusta**; che una policy sia **corretta** |
| `npm run verify:routes` | Ogni `revalidatePath` statico nomina un indirizzo dichiarato; ogni `page.tsx` sotto `(admin)` ha un pattern nella mappa | Le rotte non visibili staticamente |
| `npm run baseline:container` + `baseline:compare` | La matrice lettura/scrittura per persona, prima e dopo, contro lo schema costruito da tutte le migration | Che un movimento sia **voluto**. Il comparatore non distingue una policy da un vincolo |
| `npm run verify:persona` | Coerenza della persona | Nulla sul prodotto |

---

## Sampling Rate

- **A ogni commit di task:** `npm run build`
- **Al commit che tocca la mappa o una rotta:** `npm run build && npm run verify:routes`
- **Al commit che applica la migration:** `npm run verify:capabilities` + un punto
  `baseline:container` nuovo
- **Prima della chiusura di fase:** `baseline:compare` fra `pre-36` e `post-36`,
  **con una frase per ogni cella che si muove**, poi le cinque procedure manuali
- **Latenza massima di feedback:** un commit

**Rispettato.** Ogni piano che ha toccato TypeScript riporta un `npm run build`
verde nel proprio SUMMARY; 36-05 ha catturato `post-36` al commit della
migration; `baseline:compare` e' stato eseguito da 36-05 e **rieseguito il
2026-08-10 alle 17:02 UTC da questo piano**, con lo stesso esito (38 difetti,
tutti spiegati — vedi sotto).

---

## Per-Task Verification Map

Compilata a fase conclusa. **Due righe hanno un comando; quattro hanno una
procedura, una data e un'osservazione. Nessuna riga e' verde perche' il build
passa.**

| Requirement | Test Type | Automated Command | File Exists | Status |
|---|---|---|---|---|
| FMT-03 (terna duplicata) | constraint probe | `npm run baseline:container` (36-04) | ✓ `scripts/container/*` | ✅ **provato da un comando** |
| FMT-03 bis (format ≠ format della serie) | constraint probe | `npm run baseline:container` (36-04) | ✓ | ✅ **provato da un comando** |
| FMT-01 (la serata doppia) | **manual only** | — | — | ✅ **osservato — V1, 2026-08-10** |
| FMT-02 (il numero memorizzato) | **manual only** | — | — | ✅ **osservato — V2, 2026-08-10** |
| FMT-04 (il filtro nell'indirizzo) | **manual only** | — | — | ✅ **osservato — V4, 2026-08-10** (+ 36-13, + il proprietario su un secondo dispositivo) |
| FMT-05 (dati e non codice) | **manual only** | — | — | ✅ **osservato — V5, 2026-08-10** |
| FMT-06 (nessun canale) | **manual only** | — | — | ✅ **osservato — V3, 2026-08-10** (36-13) |
| — (nessuna policy preesistente si e' mossa) | baseline diff | `npm run baseline:compare` | ✓ | ✅ **0 celle mosse su 322 condivise** |
| — (mappa rotta↔capability intatta) | build gate | `npm run build && npm run verify:routes` | ✓ | ✅ 24 pagine / 24 pattern (36-09) |

---

## Wave 0 Requirements

Nessuna installazione di framework: gli strumenti esistenti sono stati
**estesi**, perche' altrimenti smettono di misurare senza dirlo.

- [x] `scripts/rls-baseline.mjs` — il payload della sonda di scrittura su
      `event_parties` **e' stato esteso** con le due colonne `NOT NULL` nuove
      (36-04). Era **il fallimento silenzioso piu' probabile dell'intera fase**:
      senza, ogni persona sarebbe fallita `23502` e `baseline:compare` avrebbe
      etichettato come *movimento* una riga che aveva semplicemente smesso di
      misurare.
- [x] `PROBE_REFERENCE_TABLES` — `formats` e `party_series` aggiunte (36-04); la
      cattura `post-36` e' passata **3/3 al primo tentativo**, che e' la conferma
      indipendente che le due tabelle esistono in produzione (36-05).
- [x] `scripts/container/seed.mjs` — le due tabelle **prima** di `event_parties`
      in `SEED_ORDER` e in `REFERENCEABLE` (36-04).
- [x] Due celle nuove nella matrice di lettura — misurate: **28 `b2_cell_added`**,
      14 persona × 2 tabelle.
- [x] Le due sonde di vincolo (FMT-03 e la chiave composta) — 36-04.
- [x] **Punto `pre-36` catturato PRIMA della migration** — 36-01. `[BLOCKING]`,
      e rispettato: un baseline preso dopo il cambiamento non e' un baseline.

---

## Manual-Only Verifications — eseguite, con cio' che si e' visto

| Behavior | Requirement | Procedura | Eseguita |
|---|---|---|---|
| Un evento tiene due serate di format diversi | FMT-01 | **V1** | 2026-08-10 |
| Il numero e' memorizzato e non si ricalcola | FMT-02 | **V2** | 2026-08-10 |
| Nessun conteggio, etichetta o codice rivela una serata non annunciata | FMT-06 | **V3** | 2026-08-10 (36-13) |
| Il filtro sopravvive alla navigazione e si condivide | FMT-04 | **V4** | 2026-08-10 |
| Colore ed etichetta cambiano senza deploy; un ritiro non riscrive l'archivio | FMT-05 | **V5** | 2026-08-10 |

Tutte e cinque sono state eseguite **contro il codice di questa fase in
esecuzione sul database di produzione** (dev server), perche' il sito
distribuito non porta ancora queste superfici. E' un limite, ed e' scritto in
fondo.

### V1 — la serata doppia · **eseguita 2026-08-10**

Un evento creato da `/admin/events/new` con **due serate di format diversi**
(la prima sotto un format e una serie creati apposta per la verifica; la seconda
sotto un format reale, **con il numero lasciato vuoto** perche' la sua filigrana
e' reale e vale 0).

| Cosa il piano chiede | Cosa si e' visto |
|---|---|
| **una sola card** | **1** card per l'evento, non due |
| **due marker** | **2**, uno per serata |
| nell'ordine di `sort_order` | l'ordine reso e' `sort_order` 0 poi 1 — verificato contro le righe |
| uniti da `×` | il testo reso della card e': *nome · `×` · nome* |
| ogni serata mostra il proprio, sul dettaglio | sul dettaglio ogni serata porta il **suo** marker, con il **suo** colore: `#8C82A6` e `#FFB25E` |
| nessun numero, nessun codice | **nessuno dei due codici compare nel documento intero, payload RSC compreso**; l'unica occorrenza della parola `number` e' nello script di runtime di React (`typeof $RT !== "number"`) |

**E una cosa in piu', misurata perche' c'era la sessione:** la riga di chip e'
rimasta **identica** fra il lettore anonimo (2 card) e quello che vede le bozze
(3 card) — 5 chip, stesso ordine, `All` corrente in entrambi. Il format creato
per la verifica **non aveva chip**, perche' nasce `listed = false` (D-36-17):
la sua card era visibile a chi vede le bozze mentre il suo chip non esisteva per
nessuno. E' D-36-16 osservato una seconda volta, su un caso piu' netto di quello
di 36-13.

**Limite dichiarato:** la card e' stata osservata su una superficie che vede le
bozze, perche' osservarla pubblicamente avrebbe richiesto di **pubblicare** un
evento inventato. Vale come prova che l'aggregazione rende due marker su una
card; non come prova di cosa vedrebbe un visitatore di un evento pubblicato.

### V2 — il numero non si ricalcola · **eseguita 2026-08-10**

Eseguita **su un format e una serie creati apposta e rimossi dopo**, e non su
una serie reale. La ragione e' il cuore della procedura:
`bump_series_watermark` (`20260810120000_formats_and_series.sql:590-604`) alza
`party_series.highest_assigned` con `GREATEST` e **non lo abbassa mai, nemmeno
cancellando la serata**. Girare V2 su una serie vera l'avrebbe lasciata alzata
per sempre, e la sua prima serata reale si sarebbe vista proporre un numero due
piu' alto del dovuto: **un salto in un progressivo vero, prodotto da un test**,
su una delle tre guardie monotone. 36-13 aveva rifiutato la stessa trappola.

| Passo | Numero |
|---|---|
| Proposta del form sulla serie nuova (filigrana 0) | **1** |
| Assegnati alle due serate della stessa serie | **2** e **3** |
| Cancellata | quella che portava **2** |
| La serata superstite, riletta dal database | porta ancora **3** — **non e' diventata 2** |
| La riga cancellata, chiesta per nome | `[]` |
| Filigrana della serie dopo la cancellazione | **3** — non abbassata |
| **Proposta del form per una serata nuova, dopo la cancellazione** | **4** |

**4 e' la cifra che decide la procedura.** E' `n+2` con `n = 2`, ed e' maggiore
del piu' alto numero mai assegnato in quella serie. Se la proposta venisse da un
conteggio delle serate esistenti, dopo la cancellazione ne sarebbe rimasta una
sola e il form avrebbe offerto **2** — cioe' un numero gia' stato su una
locandina, offerto una seconda volta.

La frase che il form mostra sotto il campo e' quella che il comportamento
conferma: *«Suggested from the last number in this series. What you save is
stored as written and never recalculated — moving or deleting a night does not
renumber the others.»*

**Filigrane reali:** ferme. `RSNT=2`, tutte le altre `0`, prima e dopo — la
serie reale toccata da V1 (numero lasciato vuoto di proposito) non si e' mossa
di un'unita'.

### V3 — FMT-06 · **eseguita 2026-08-10** (36-13)

Non ripetuta qui. Una serata non annunciata e' stata creata apposta dalla
superficie vera, la chiave anonima e il sorgente reso sono stati interrogati con
quella serata in piedi, e nessuno dei due l'ha nominata: `party_series` resta a
1 riga su 6, **le tre righe chieste per chiave primaria hanno risposto `[]`**,
gli otto aghi sono assenti da tutti e sei i documenti payload compreso, e la
riga di chip e' identica byte per byte fra un lettore anonimo e uno che la bozza
la vede. Poi tutto e' stato rimosso e le quattro tabelle sono tornate
byte-identiche. Vedi `36-13-SUMMARY.md`.

**E' l'unico rifiuto che questa fase ha visto rifiutare qualcosa che esisteva
davvero.**

### V4 — il filtro nell'indirizzo · **eseguita 2026-08-10**

| Passo della procedura | Cosa si e' visto |
|---|---|
| Scelto un format, entrato in un evento, tornato indietro | `/events?format=<slug>` → dettaglio → **indietro** → `/events?format=<slug>`, chip corrente ancora quello |
| L'indirizzo aperto in una finestra nuova | aperto in una **scheda nuova con `history.length === 1`** — cioe' un'apertura a freddo, come un link ricevuto: filtro applicato, chip corrente giusto, `border-color` **preso dal catalogo** (`#FF7A2F` al 45%), stato vuoto condiviso |
| `Past` **e poi** un format | premuto `Past` su una pagina filtrata → `/events?format=…&tab=past`, **il format e' sopravvissuto**; poi premuto un altro chip → `/events?format=<altro>&tab=past`, **il tab e' sopravvissuto**. Ogni href di chip porta `&tab=past` finche' il tab e' `Past` |
| `?format=` con un valore inesistente | **lista completa (2 card), `All` corrente, `200`, nessun redirect, nessun errore** |

E tre varianti che la procedura non chiede ma che sono lo stesso input non
fidato, misurate perche' costavano una richiesta:

| Indirizzo | Esito |
|---|---|
| `?format=` (vuoto) | come l'indirizzo nudo — `All`, 2 card, 200 |
| `?format=a&format=b` (ripetuto → `string[]`) | come l'indirizzo nudo |
| `?format=RESONATE` (maiuscolo, slug reale sbagliato di caso) | come l'indirizzo nudo |

**Uno slug reale scritto male e uno inventato sono indistinguibili**, che e' la
proprieta' che tiene la pagina lontana dall'essere un oracolo di enumerazione.

**Non rieseguito, e citato:** lo **swipe fra i pannelli con un dito** e il
**casing dei nomi di format accanto a due tab in maiuscolo**, osservati dal
**proprietario su un secondo dispositivo, in navigazione privata, il
2026-08-10** (`36-13-SUMMARY.md`, osservazione 4). Nessuno strumento qui ha un
pollice.

**Un fatto osservato di passaggio, registrato e non riparato:** i due tab sono
**`<button>` che chiamano `router.replace`**, non `<Link>`. La scelta del tab
quindi **non aggiunge una voce alla cronologia**: premere `Past` e poi il tasto
indietro riporta alla pagina precedente a `/events`, non al tab `Upcoming`. Il
filtro per format, che e' un `<a>`, si comporta al contrario. Nessuna delle due
contraddice FMT-04 — l'indirizzo porta entrambi gli assi e si condivide — ma
sono due grammatiche diverse sulla stessa schermata, ed e' una decisione da
prendere consapevolmente invece che scoprire.

### V5 — dati e non codice · **eseguita 2026-08-10**

Eseguita **sul format creato per la verifica**, cosi' che nessuna riga reale sia
stata ritirata nemmeno per un minuto.

**Il colore, cambiato senza deploy:**

| | |
|---|---|
| Colore prima, sul chip pubblico | `#8C82A6` |
| Atto | `Edit format` → un'altra tinta del selettore → `Save format` |
| Colore dopo, sul chip pubblico riletto anonimo | **`#F6B6D2`** |
| Processo del server | **PID 65002, avviato 18:12:27 — lo stesso, prima e dopo** |
| `.next/BUILD_ID` | **non toccato** (mtime 17:46, invariato) |
| Deploy fra i due momenti | **nessuno** |

*«Senza deploy» si prova solo non facendo il deploy*, e qui e' provato dal fatto
che il processo che ha servito la seconda pagina e' lo stesso che ha servito la
prima.

**Il ritiro:**

| Cosa il piano chiede | Cosa si e' visto |
|---|---|
| il chip sparisce da `/events` | da **6 chip a 5**, letti con la chiave anonima |
| la voce sparisce dal selettore per un'assegnazione nuova | il `<select>` del format su `/admin/events/new` passa da **5 voci a 4** |
| **una serata d'archivio che lo portava continua a mostrarlo** | la serata sotto quel format **continua a rendere il suo marker**, con il colore del format |
| l'indirizzo filtrato sullo slug ritirato | risponde **come l'indirizzo nudo**: `All`, lista completa, `200`, nessun redirect |

La conferma di ritiro dice, verbatim: *«New nights can no longer be assigned to
it. Nights already recorded under it keep their name and stay where they are»* —
ed e' esattamente cio' che le due righe qui sopra hanno misurato. Il fuoco
all'apertura era su **`Cancel`**, misurato su `document.activeElement`.

**Il ripristino, e una divergenza fra la procedura scritta e il comportamento
misurato — registrata, non riparata:**

La procedura chiede di *«ripristinarlo e confermare che il chip torna solo dopo
averlo elencato»*. **Non e' cio' che accade.** `retireFormat`
(`src/app/(admin)/admin/formats/actions.ts:645-683`) scrive **solo**
`retired_at`; non tocca `listed`. Quindi un format elencato che viene ritirato
conserva `listed = true`, e il solo ripristino **rimette il chip su `/events`
per ogni visitatore**, senza che nessuno abbia deciso di ripubblicarlo. Misurato:
da 5 chip a 6, subito dopo `Restore format`.

L'asimmetria *«solo dopo averlo elencato»* **esiste**, ma sta sulla
**creazione** (D-36-17), ed e' stata misurata all'inizio di questa sessione: un
format creato nasce `listed = false` e **non ha chip** finche' qualcuno non
preme `Show on /events`.

Le due letture possibili sono in `deferred-items.md` **D11**. Nessuna delle due
e' stata applicata qui: un difetto riparato in silenzio durante la propria
verifica non e' stato verificato.

---

## `baseline:compare pre-36 → post-36` — una frase per ogni cella mossa

Rieseguito il **2026-08-10 alle 17:02 UTC**, stesso comando di 36-05:
`--target=production --before-point=pre-36 --after-point=post-36
--expect-initplan=unchanged --only=B1,B2,B5`. **Stesso esito: 38 difetti, e
ognuno ha la sua frase.**

`--expect-initplan=unchanged` perche' questa fase non aggiunge una chiamata non
avvolta a una funzione auth; `--only=B1,B2,B5` perche' in produzione non esiste
un artefatto B3 `pre-36` (36-01) e il comparatore muore `FATAL` invece di
fingere.

### B1 — l'insieme delle policy (6 difetti)

| Difetto | Frase |
|---|---|
| `policy_added` × 4 — `formats_select_listed`, `formats_select_catalogue_manage`, `party_series_select_published`, `party_series_select_catalogue_manage` | Le quattro della sezione 4 della migration. Allargano su **due tabelle che prima non esistevano**: non c'e' nulla che fosse chiuso e sia stato aperto |
| `supporting_count_changed` — `policy_count` 72 → 76 | Le stesse quattro, contate come somma |
| `supporting_count_changed` — `rls_enabled_tables` 23 → 25 | Le due tabelle nuove hanno `ENABLE ROW LEVEL SECURITY` nella stessa migration che le crea |

**`72 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained`. Nessuna policy
preesistente si e' mossa di un bit** — e `event_parties_select_published`, il
cancello pubblico, e' **byte-identica** fra le due catture
(md5 `43e7f547dad32f060f433ca7014e7427` da entrambi i lati, 36-05).

### B2 — la matrice di lettura (28 difetti)

**28 `b2_cell_added` = 14 persona × 2 tabelle nuove.** Sono esattamente le celle
che questo documento chiedeva in Wave 0: senza, le policy delle due tabelle non
sarebbero misurate da niente.

**322 celle condivise, `0` mosse.** Nessun `b2_cell_changed`.

Frazione vacua sulle condivise: **274/322 (85,1 %)**, invariata. E' la verita'
della produzione — quattro profili, nessun `organizer`, nessuno `staff` — ed e'
la misura onesta di quanto vale il resto.

### B5 — l'advisor (4 difetti + una nota non ancorata)

| Verdetto | Cifra | Frase |
|---|---|---|
| ✓ `auth_rls_initplan` | 0 → 0 | Nessuna chiamata auth non avvolta e' entrata |
| ✗ `multiple_permissive_policies` | 58 → 70 | Le dodici entita' sono `formats` e `party_series` × i sei ruoli che l'advisor enumera × `SELECT`. **Due policy `SELECT` per tabella sono il disegno** — un cancello e la scorciatoia di chi gestisce il catalogo — ed e' la stessa forma che `events` ed `event_parties` gia' portano |
| ✗ `unindexed_foreign_keys` | 41 → 44 | `event_parties_series_format_fk` (composta, lasciata deliberatamente senza indice proprio perche' `series_id` e' gia' coperto) e le due colonne di autore. Nessuna e' una colonna di ricerca alla porta |
| ✗ `anon_security_definer_function_executable` | 16 → 17 | Una sola entita': `public.bump_series_watermark`, `SECURITY DEFINER` con `search_path=""` e tipo di ritorno `trigger`. **Misurato:** invocarla direttamente risponde `ERROR: 0A000: trigger functions can only be called as triggers` |
| ✗ `authenticated_security_definer_…` | 18 → 19 | La stessa unica entita', lo stesso rifiuto |
| — `unused_index` (non ancorato) | 17 → 19 | `idx_event_parties_series` e `idx_party_series_format`, mai scanditi perche' appena creati. Il lint deriva da `idx_scan` e si muove con l'**uso**, non con lo schema |
| ✓ `hook_custom_access_token_enabled` | ancora `false` | CAP-04 legge dal vivo |
| ✓ `db_schema` | ancora `public,graphql_public` | Lo schema `private` resta irraggiungibile |

**Nessun avviso e' scomparso, in nessuna delle cinque famiglie.** Ogni movimento
e' un'aggiunta, e ogni aggiunta porta sopra il proprio nome di entita'.

---

## Cosa questa fase NON puo' validare

Scritto invece che aggirato.

1. **Che il gate rifiuti qualcuno.** Le 32 voci `human_needed` a monte. Vedi in
   testa a questo documento.
2. **Che un nome di colonna nuovo sia scritto giusto ovunque.**
3. **Che nessuna superficie pubblica porti un conteggio** — solo che otto aghi
   dichiarati non compaiono in sei documenti letti in un momento preciso.
4. **Nulla sul sito distribuito.** Tutte e cinque le procedure girano contro il
   dev server, che esegue il codice di questa fase sul database di produzione.
   **Il sito in produzione non ha ancora queste superfici.**
5. **Nulla su un dispositivo reale, tranne cio' che il proprietario ha guardato
   di persona** (36-13, osservazione 4).

---

## Il debito che questa fase lascia, e quello che non ha toccato

| | Dove appartiene |
|---|---|
| **D12 — le 63 righe perse in sette tabelle**, e la decisione se e come recuperarle | **Il proprietario**, subito. `deferred-items.md` D12 e `36-14-SUMMARY.md` |
| **D11 — ritirare non toglie `listed`**, quindi un ripristino ripubblica un chip senza che nessuno lo decida | Una fase successiva, o una decisione dichiarata. `deferred-items.md` D11 |
| **D7 — il middleware scrive `?redirect=`, il login legge `?next=`**; ogni indirizzo protetto perde la destinazione. **E i due difetti si mascherano a vicenda:** correggere il nome del parametro senza aggiungere l'allow-list attiverebbe un open redirect su un percorso che usano tutti. **L'ordine conta** | `access-gating`, una fase successiva. Preesistente a questa fase |
| **D9 — il cron della rivelazione raggiunge le bozze** e alza la guardia monotona senza destinatari | **Fase 37** |
| **D10 — la e rovesciata sta nel `<title>`**, nell'anteprima social e nel nome dell'app installata (`src/app/layout.tsx:15,19,25,32`). Ogni piano ha misurato *«e rovesciata → 0»* sui propri file; l'unico posto che la spedisce davvero non era fra i file di nessuno | Il proprietario del brand |
| **D5 — `npm run lint` rosso su `EventTabs.tsx`**, preesistente e non toccato | Una fase successiva, o accettato |
| **D6 — sei componenti scritti prima che qualcuno li rendesse.** Cinque sono stati guardati (36-09 le quattro del catalogo, 36-12 le due pubbliche). **Resta non prodotto** il rifiuto `color_taken` sul ripristino (**D8**), strutturalmente irraggiungibile oggi | Chiunque crei un secondo format ritirato |
| **D-36-18 — l'indirizzo di un venue segreto e' leggibile con la chiave anonima** (`venues_select_public` e' `using (true)`) | **Fase 37**, `.planning/todos/pending/secret-venue-address-readable-by-anon.md`. **La sua esistenza non ammorbidisce nulla qui**: una porta gia' aperta non e' un argomento per aprirne una seconda (D-36-18) |
| **Le 32 voci `human_needed`** a monte | Dovute prima della chiusura della milestone |
| **`production-calendar.md` — due emendamenti decisi e NON applicati** | Il proprietario, come lavoro `ai-engineering` |
| **I diciotto scarti della migration history** | Il proprietario; invariati da questa fase |

### I due emendamenti a `.claude/rules/` che questa fase ha deciso e non ha applicato

Entrambi in `production-calendar.md`, entrambi richiedono **versione +
changelog + `npm run verify:persona`**, ed entrambi sono del proprietario:

1. **Il gate *progressivo per sede o per format* e' chiuso da D-36-07** (per
   MotionLab il progressivo riparte a ogni sede), ma il modulo lo tiene ancora
   aperto. Finche' resta cosi', ogni materiale MotionLab e' provvisorio per un
   gate che non lo e' piu'.
2. **La serie di Nizza e' scritta con la R maiuscola** (`Resonate x Perlone`)
   mentre il nome pubblico deciso usa la e normale — `brand-visual-system.md`,
   gate *grafia del brand*, dice `re:sonate` ovunque tranne dentro il logo. Due
   moduli della stessa persona dicono cose diverse e nessuno dei due sa
   dell'altro.

---

## Validation Sign-Off

- [x] **Wave 0 completa** — sei caselle su sei, incluse le due che contavano: il
      payload della sonda di scrittura esteso (36-04) e il punto `pre-36`
      catturato **prima** che la migration partisse (36-01).
- [x] **`baseline:compare`** — non verde, e non doveva esserlo: **38 difetti,
      ognuno con la propria frase**, riesaminati il 2026-08-10 alle 17:02 UTC.
      La riga che conta: **0 celle mosse su 322 condivise, 0 policy preesistenti
      cambiate, il cancello pubblico byte-identico.**
- [x] **V1 … V5 eseguite e datate** — tutte e cinque il 2026-08-10, ognuna con
      i valori osservati scritti sopra: 1 card e 2 marker; 2 → cancellata,
      3 → sopravvissuta, **4 → proposta**; il filtro sopravvissuto a una
      navigazione, a una scheda nuova e a entrambi gli ordini di scelta;
      `#8C82A6 → #F6B6D2` senza deploy, con il PID del server invariato;
      `[]` alle tre righe chieste per chiave primaria (V3, 36-13).
- [x] **Nessuna modalita' watch** — non esiste un runner.
- [x] **`nyquist_compliant` resta `false`** — cinque requisiti su sei si provano
      solo a mano, e l'unico strumento automatico della fase (`baseline:compare`)
      dice cosa si e' mosso, non se e' giusto. Metterlo a `true` sarebbe una
      bugia che qualcuno userebbe per chiudere qualcos'altro.
- [x] **Un incidente di perdita dati e' avvenuto durante questa validazione**, e'
      dichiarato in testa a questo documento, e **63 righe non sono tornate**.

**Approval:** i requisiti sono spuntati in `REQUIREMENTS.md` con l'evidenza
accanto (D-36-19). La chiusura della fase resta **subordinata alla decisione del
proprietario su D12**.
