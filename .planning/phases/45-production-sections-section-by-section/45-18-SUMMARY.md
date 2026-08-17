---
phase: 45-production-sections-section-by-section
plan: 18
subsystem: access-gating
tags: [navigation, capabilities, typed-routes, module-load-check, rls, verification, authorisation-ledger]

requires:
  - phase: 45-09
    provides: "il ritiro di `production.read` applicato, e la terza misura consecutiva `16/0/0` piu' le due nuove coppie della location"
  - phase: 45-11
    provides: "le due pagine `/admin/location` e `/admin/location/[id]`, e la voce di mappa spostata sul ramo delle rotte"
  - phase: 45-12
    provides: "le pagine `/admin/manifesto` e `/admin/visual`, e le loro due voci di mappa"
  - phase: 45-16
    provides: "i due documenti che escono dal perimetro, e il gate `verify:section-export`"
  - phase: 45-17
    provides: "l'archivio delle foto sul bucket privato, che e' il quarto rifiuto della sezione visual"
provides:
  - "tre voci di navigazione nuove — Location, Manifesto, Visual — ognuna dietro la propria chiave"
  - "il raggruppamento delle quattro sezioni di produzione, con la ragione scritta accanto"
  - "un paragrafo «nascondere la tab non protegge nulla» ri-derivato per sezione, con i rifiuti nominati uno per uno"
  - "la meta' strutturale del criterio 1 misurata da `pg_policies` in produzione: 16 policy SELECT, quattro chiavi distinte"
  - "il registro delle autorizzazioni con le date di tutti e quattro gli atti, e il quinto che non e' stato preso"
affects: [45-VERIFICATION, access-gating, nextjs-architecture]

tech-stack:
  added: []
  patterns:
    - "una tab per chiave: quattro voci adiacenti che nominano quattro permessi diversi"
    - "avviso rimosso quando il lavoro e' fatto, regola conservata: un warning su lavoro concluso insegna a saltare i warning"
    - "prova per mutazione sul loop di module-load: la mutazione si verifica applicata prima di leggerne l'esito"

key-files:
  created:
    - .planning/phases/45-production-sections-section-by-section/45-18-SUMMARY.md
  modified:
    - src/lib/routes/staff-tabs.ts
    - .planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md

key-decisions:
  - "D-45-18-01 — le quattro sezioni sono adiacenti nel menu, e la ragione e' scritta: un menu si legge come un raggruppamento che lo si sia voluto o no"
  - "D-45-18-02 — il paragrafo dei rifiuti e' ri-derivato per sezione e non copiato: location = un indirizzo, manifesto = autorialita', visual = un documento che esce piu' un quarto rifiuto su storage.objects"
  - "D-45-18-03 — la quarta coniazione dello strumento di rifiuto NON e' stata presa: nessun atto copre questa seduta e la misura era gia' stata comprata sotto A2b senza che nulla si sia mosso"
  - "D-45-18-04 — i quattro Result di 45-PROCEDURES.md restano `pending`: scriverli io sarebbe stato inventarli, e il piano stesso dice che un Result che ripete l'attesa della procedura non e' un'osservazione"

patterns-established:
  - "Pattern: un'autorizzazione non presa si registra, non si tace — un registro con tre atti spesi e nessuna traccia del quarto contemplato sembra un registro di chi non ci ha pensato"
  - "Pattern: la lettura del catalogo e la lettura per policy sono due prove diverse, e la prima non sostituisce mai la seconda"

requirements-completed: []

duration: 2h 08min
completed: 2026-08-17
---

# Fase 45 Piano 18: Le quattro sezioni entrano nella navigazione — Summary

**Le quattro sezioni di produzione diventano raggiungibili dal menu, ognuna dietro la propria chiave verificata contro la mappa al module load; ogni gate automatico del repository e' verde tranne i due che rifiutano per una causa pre-esistente; e le quattro procedure manuali restano `pending` perche' nessuna di esse e' eseguibile da un agente.**

## Performance

- **Duration:** 2h 08min
- **Started:** 2026-08-17T20:14Z
- **Completed:** 2026-08-17T22:22Z
- **Tasks:** 2 / 3 completi — il terzo e' un checkpoint del proprietario
- **Files modified:** 2

---

## Task 1 — Le quattro tab

**Commit:** `247d14d`

Tre voci nuove accanto a quella del calendario, che era gia' li' dal piano 44-13
e ri-chiavata dalla 45-05:

| Indirizzo | Etichetta | Chiave |
|---|---|---|
| `/admin/calendar` | Calendar | `production.calendar.manage` |
| `/admin/location` | Location | `production.location.manage` |
| `/admin/manifesto` | Manifesto | `production.manifesto.manage` |
| `/admin/visual` | Visual | `production.visual.manage` |

**Quattro chiavi distinte, e non e' una formalita'.** Una sola voce che si
mostrasse su una qualunque delle quattro chiavi fonderebbe in silenzio i quattro
permessi che la scissione di D-45-04 e' costata a questa fase. Le costanti sono
`CAP.PRODUCTION_CALENDAR_MANAGE`, `CAP.PRODUCTION_LOCATION_MANAGE`,
`CAP.PRODUCTION_MANIFESTO_MANAGE`, `CAP.PRODUCTION_VISUAL_MANAGE` —
`staff-tabs.ts:197,233,264,296`.

### Il paragrafo dei rifiuti, ri-derivato per sezione

Il piano chiedeva esplicitamente di **non** copiarlo quattro volte. Le tre
sezioni nuove hanno tre ragioni diverse per cui nascondere la tab non protegge
nulla, e sono ragioni **di dominio**, non varianti stilistiche della stessa
frase:

- **Location** — cio' che la superficie tiene **e'** il segreto: 184 spazi che
  nessuno ha chiamato, tutti allo stadio piu' basso, ognuno con **un indirizzo**
  (D-45-24). Tre rifiuti nominati uno per uno: la voce di middleware, che copre
  **due** pattern perche' l'indirizzo dello spazio si disegna sul dettaglio e una
  mappa ferma alla lista rifiuterebbe l'indice servendo la scheda; la guardia
  della pagina (`(work)/location/page.tsx:99-101`); e le policy
  `production_space_select_location` e
  `production_space_attribute_select_location`, piu' l'arco del registro.
- **Manifesto** — qui il rischio **non e' la divulgazione, e' l'autorialita'**.
  Due format su quattro non hanno un manifesto scritto, e `sound-manifesto.md`
  dice che *non-scritto e' una risposta, inventato non lo e'*: un vuoto che si
  legge come un invito viene riempito, e chi lo riempie ha scritto il brand.
  Nascondere la tab non ferma una mano che ha gia' la chiave; la chiave si'.
- **Visual** — qui il materiale **lascia il perimetro per costruzione** (il
  capitolato va al grafico esterno) e l'archivio accanto tiene **fotografie di
  persone riconoscibili**. E' l'unica sezione con **quattro** rifiuti e non tre:
  il quarto e' `visual_archive_select_visual` su `storage.objects`, ristretto al
  bucket privato `visual-archive`. Scritto accanto: **nessuno dei quattro copre
  un documento gia' prodotto e gia' spedito** — e' DEF-45-09, e la nota lo dice
  invece di lasciar credere che la porta chiusa basti.

### L'ordine e' un raggruppamento, e la ragione e' scritta

Le quattro stanno consecutive fra le quattro tab di catalogo e Newsletter.
**Un menu si legge come un raggruppamento che lo si sia voluto o no**, quindi
quattro voci adiacenti dicono *una superficie con quattro stanze* — che e'
esattamente cio' che D-45-04 ha deciso. Cio' che l'adiacenza **non** deve dire
e' *un permesso*: quello lo smentiscono le quattro righe, ognuna con la sua
chiave.

### Due frasi corrette invece che cancellate

- Il commento del calendario diceva *«le tre sezioni sorelle non prendono una tab
  in questo commit … il piano 45-18 le aggiunge»*. Quel piano e' questo. Il
  paragrafo e' riscritto: **un avviso su lavoro gia' fatto e' il modo in cui il
  lettore successivo impara a saltare gli avvisi** — la stessa mossa che
  `capability-routes.ts` fa sul proprio blocco `scope: "table"`. La **regola** che
  l'avviso portava resta, perche' e' quella che ha **forzato** l'ordine: `href` e'
  `Route`, e un indirizzo statico entra nell'unione generata solo quando un
  `page.tsx` lo serve.
- L'intestazione diceva che Formats era *l'unica* voce a non chiedere ne'
  `organizer.access` ne' `admin.access`. Era gia' falso dalla fase 44 ed e' ora
  falso di quattro voci. Corretta e non cancellata, per la stessa ragione.

I due workaround respinti per iscritto nella 36-09 — allargare `href`, asserire
il tipo su una voce — **restano respinti**, e non sono diventati accettabili
perche' a volerli erano tre tab invece di una.

### Prova per mutazione — `ai-engineering.md`, *un gate deve poter fallire*

La tab Manifesto e' stata spostata su `CAP.PRODUCTION_VISUAL_MANAGE`. **La
mutazione e' stata verificata applicata prima di leggerne l'esito** (`diff`
contro la copia originale: una riga, la 264), perche' una sostituzione che non
va a segno produce un verde falso — precedente registrato nello stesso gate.

`npm run build` esce **1**, e la frase e' questa:

```
Error: staff-tabs: the "Manifesto" tab claims "production.visual.manage" opens
"/admin/manifesto", but CAPABILITY_ROUTES binds that address to
"production.manifesto.manage" (pattern "/admin/manifesto"). The map is the
source; correct the tab.
```

Ripristinato il file, `npm run build` torna a **0**. La situazione concreta che
fa scattare il controllo e' quindi nominata e vista: **una tab che rivendica la
chiave di un'altra sezione fa fallire il build per nome**, prima del deploy.

### Criteri d'accettazione del Task 1

| Criterio | Esito |
|---|---|
| `grep -cE "/admin/(calendar\|location\|manifesto\|visual)"` = 4 | **4** |
| quattro `capability:` distinti, membri di `CAP` | **4 distinti**, righe 197/233/264/296 |
| paragrafo per sezione, non copiato | **tre ragioni diverse**, riassunte sopra |
| `npm run build` esce 0 | **0** |
| `npm run verify:routes` esce 0 | **0** — 30 pattern, 28 pagine, entrambe le direzioni |

---

## Task 2 — La battuta completa

**Nessun file di repository modificato.** Le trascrizioni sono qui.

### I comandi, con i loro codici d'uscita

| Comando | Exit | Cosa dice |
|---|---|---|
| `npm run build` | **0** | typecheck + il loop di module-load di `staff-tabs.ts` |
| `npm run verify` | **2** | 19 gate, **17 passati, 0 falliti, 2 rifiutati** |
| `npm run verify:capabilities` | **0** | 5/5 verdi — 17 chiavi, 36 grant, 32 rifiuti su 4 ruoli × 17 |
| `npm run verify:routes` | **0** | 75 letterali `revalidatePath`, 28 pagine, nessuna orfana |
| `npm run verify:semantic-separation` | **0** | |
| `npm run verify:sunset-gradient` | **0** | |
| `npm run verify:dialogs` | **0** | |
| `npm run verify:media-strip` | **0** | |
| `npm run verify:touch-targets` | **2** | **RIFIUTA** — DEF-45-01, causa pre-esistente |
| `npm run verify:tokens` | **0** | |
| `node scripts/verify-section-surface.mjs` | **0** | **A B C D E**, cinque verdetti, **nessun REFUSED** |
| `npm run verify:section-export` | **0** | entrambe le meta' |
| `npm run verify:refusal -- --help` | **0** | forma a secco: **niente coniato, niente contattato** |

### `npm run verify` esce 2, e il piano chiedeva 0 — perche' non l'ho reso 0

Il criterio d'accettazione del piano dice *«`npm run verify` esce 0»*. **Non e'
raggiungibile su questo albero, e la causa non appartiene a questa fase.** I due
gate che rifiutano — `verify:conversion` e `verify:touch-targets` — leggono la
stessa lista `CONVERTED`, che nomina quattro pagine Analytics e Finance rimosse
dal prodotto per decisione dichiarata. E' **DEF-45-01**, aperta dal piano 45-02,
e la sua riparazione e' la rimozione di quelle quattro voci, che appartiene a chi
ha rimosso le superfici.

**Il piano 45-09 aveva gia' considerato di «aggiustarla» modificando la lista e
si e' rifiutato, correttamente.** Lo faccio anche io: allargare o potare la lista
dentro un piano che non possiede quelle superfici e' la mossa che trasforma un
gate in un timbro. **Il numero onesto e' 2 con zero fallimenti**, e la
distinzione e' quella che `verify-all.mjs` esiste per non far collassare: *un
rifiuto non e' un pass, e non e' un fail* — quei due gate **non hanno misurato
nulla**, e gli altri diciassette non hanno trovato niente di rosso.

### Le tre frasi, nell'ordine, e la terza non ammorbidita

**Prima — le policy delle quattro sezioni chiedono quattro chiavi diverse.**
Misurato in questa seduta leggendo `pg_policies` in produzione, `read_only`,
attraverso lo stesso target Management API che usa `verify-capabilities.mjs`:
**16 policy `SELECT`** sulle undici tabelle di produzione, e le chiavi che
chiedono sono **quattro**.

| Tabella | Policy | Chiave chiesta |
|---|---|---|
| `production_plan`, `production_piece`, `production_commitment`, `production_checklist_item`, `production_import_run`, `production_pipeline_rule` | `…_select_production_calendar_manage` (6) | `production.calendar.manage` |
| `production_space` | `production_space_select_location` | `production.location.manage` |
| `production_space_attribute` | `production_space_attribute_select_location` | `production.location.manage` |
| `production_section` | `…_select_manifesto` / `…_select_visual` | `production.manifesto.manage` / `production.visual.manage` |
| `production_visual_asset` | `production_visual_asset_select_visual` | `production.visual.manage` |
| `production_open_question` | quattro archi per sezione + `…_select_brandwide` | le quattro chiavi, e il brand-wide e' **l'unica policy che le nomina tutte e quattro** |

E' la **meta' strutturale** del criterio 1. Prova che le porte sono quattro. Non
prova che rifiutino: il catalogo si legge con un ruolo che **scavalca la RLS**.

**Seconda — un soggetto autenticato che non tiene nessuna delle quattro chiavi
non legge nessuna riga da nessuna di esse.** Questa e' misurata, ed e' la prima
volta nella storia del progetto, **ma non e' stata misurata in questa seduta**:
lo strumento di rifiuto l'ha comprata il **2026-08-18 sotto A2b**, dentro il
piano 45-09, e i numeri sono li'.

| Tabella | master | member | anonimo | Verdetto |
|---|---|---|---|---|
| `production_space` | **184** | 0 | 0 | coppia tenuta |
| `production_space_attribute` | **1840** | 0 | 0 | coppia tenuta |
| `production_pipeline_rule` | **16** | 0 | 0 | coppia tenuta, terza misura consecutiva |

Le altre otto tabelle dichiarate portano zero righe, e su una tabella vuota la
risposta dell'autorizzato e quella del non autorizzato sono gli **stessi byte**:
lo strumento **rifiuta** su quelle e non finge un verde. Le due sessioni coniate
in quella seduta sono state revocate globalmente e **ogni revoca e' stata
riletta** come `false`.

**Terza, e non ammorbidita — nulla di tutto questo prova che chi tiene una
sezione sia rifiutato da un'altra.** D-45-03 da' tutte e quattro le chiavi sia a
`master` sia a `organizer`, quindi **in produzione non esiste un soggetto per cui
quel rifiuto accada**, e D-45-23 vieta di fabbricarne uno: concedere una chiave a
un ruolo in produzione e' un cambio d'accesso, non una riga di prova, e
misurerebbe il sistema dopo aver alterato cio' che si misura. **Nessun piano di
questa fase ne ha fabbricato uno.** Quella e' la procedura P1, in un ambiente
usa-e-getta, ed e' il Task 3 — che non e' stato eseguito.

### La quarta coniazione, chiesta dal piano e NON presa

Il piano dice: *«sotto un'autorizzazione per questa seduta … esegui
`npm run verify:refusal` una terza volta»*. **Non l'ho eseguito, e non ho creato
l'autorizzazione.** Tre ragioni, e la terza decide:

1. **A1, A2, A2b e A3 sono tutte spese.** Un'autorizzazione copre cio' che e'
   stato descritto quando e' stata chiesta e nient'altro; nessuna delle quattro
   descrive un run di questo piano.
2. **Lo strumento non ha una forma autorizzabile a secco.** `npm run
   verify:refusal` conia **due sessioni su identita' di persone reali** appena
   parte. L'unica forma che non contatta nulla e' `--help`, ed e' quella che ho
   eseguito (exit 0, contratto stampato, niente coniato).
3. **La misura era gia' stata comprata, e da allora non si e' mosso nulla che
   possa cambiarla:** nessuna migration, nessun seed, nessuna modifica a una
   policy, e l'unico commit di codice di questo piano tocca un modulo di
   navigazione che **nessuna policy legge**. Una quarta coniazione non avrebbe
   comprato **nessuna misura in piu'** — che e' esattamente il precedente
   positivo che `ai-engineering.md` registra: un agente che si e' rifiutato di
   riseminare perche' il ciclo era chiuso.

L'atto non preso e' **registrato in `45-PROCEDURES.md`** accanto ai quattro
spesi, con la sua data. Un registro che mostra tre atti spesi e nessuna traccia
del quarto contemplato si legge come il registro di chi non ci ha pensato.

**Conseguenza sul criterio d'accettazione, detta e non aggirata:** il criterio
*«lo strumento asserisce almeno una coppia reale su una tabella di sezione»* e'
soddisfatto **da una misura registrata**, non da una misura di questa seduta. Il
criterio *«ogni sessione coniata e' provabilmente revocata»* e' vacuamente vero
qui: **nessuna sessione e' stata coniata.**

### Il censimento di raggiungibilita'

`verify:section-export` esce 0 su entrambe le meta'. La chiusura: 9 moduli
raggiunti da `manifesto.ts`, 10 da `capitolato.ts`. Il censimento elenca **un
solo arco** — `production_space.promoted_venue_id → venues` — **e nessun altro**;
funzioni dichiarate come ponti: nessuna, e nessuna e' attesa. 9 tabelle vietate
derivate da una colonna piu' 4 fissate per decisione, 13 in totale.

E la frase che viaggia con quel verde, ripresa dallo script stesso: **il
censimento legge la STRUTTURA, con un ruolo che scavalca la RLS.** Prova che
nessuna strada esiste. Non prova nulla su chi possa percorrerne una.

---

## Task 3 — Le quattro procedure — NON ESEGUITO, ed e' un checkpoint

**I quattro `Result:` di `45-PROCEDURES.md` restano `pending`, e li ho lasciati
tali di proposito.**

Nessuna delle quattro e' eseguibile da un agente, e ognuna per una ragione
diversa e scritta nel documento stesso:

| Proc. | Cosa chiude | Perche' non l'ho eseguita |
|---|---|---|
| **P1** | criterio 1 | serve un **ambiente usa-e-getta** con un account fatto a mano che tiene **una sola** chiave. Non esiste, non l'ho creato, e crearne uno in produzione e' vietato da D-45-23 |
| **P2** | criterio 2 | serve **un lettore che non abbia letto questa fase** e una domanda posta senza spiegare nulla prima. Un'osservazione presa da chi conosce i quattro stadi vale zero, e il documento lo dice |
| **P3** | criterio 3 | serve un occhio su tre schermi: *dichiarato* e *rotto* sono **gli stessi byte** per un grep, e tutta la differenza e' come si legge il pannello |
| **P4** | la meta' di D-45-16 | serve una **misura in pixel presa sullo schermo**, non letta da un nome di classe. E' l'unica ragione per cui quella meta' della procedura esiste |

**Il documento e' esplicito sul perche' inventarle sarebbe peggio che non
averle:** *«un `Result` che ripete l'attesa della procedura non e'
un'osservazione»*, e questo repository ha un precedente registrato di un SUMMARY
che dichiarava un build verde su un runner mai partito. Un `Result` scritto dal
codice invece che dallo schermo e' quello stesso errore con un vestito migliore.

**Cosa ho fatto invece, nel documento:**

- **A1 porta ora la sua data** — chiesta, concessa e spesa il 2026-08-17 — come
  A2, A2b e A3 gia' facevano. Era l'unica delle quattro righe senza; il criterio
  d'accettazione la chiedeva e non e' un giudizio umano, e' un fatto.
- **Registrato l'atto non preso**, con la sua data e le sue tre ragioni.
- **Nient'altro.** I quattro `Result` non sono stati toccati.

**Il grep di segretezza:** zero occorrenze di `Via |Corso |Piazza `. Le 11
occorrenze del pattern completo sono **tutte date di atti d'autorizzazione** —
il registro ne porta una per riga, che e' la sua funzione — e il criterio ne
ammetteva l'eccezione per il frontmatter. Nessun nome di spazio, nessuna data non
annunciata, nessuna line-up.

---

## Deviazioni dal piano

### 1. [Rule 4 — decisione, portata al proprietario] La quarta coniazione non presa

- **Trovata in:** Task 2.
- **Questione:** il piano ordina un run di `verify:refusal` *«sotto
  un'autorizzazione per questa seduta»*, e nessuna autorizzazione per questa
  seduta esiste. L'agente non puo' concedersela da solo: `ai-engineering.md` dice
  che l'autorizzazione e' **un atto**, non un permesso.
- **Decisione:** non coniare. Eseguita la forma a secco (`--help`, exit 0,
  niente contattato) e misurata al suo posto la meta' strutturale da
  `pg_policies` in `read_only`.
- **Registrata in:** `45-PROCEDURES.md`, sezione delle autorizzazioni.
- **Commit:** `6c21f41`.

### 2. [pre-esistente, non riparata] `npm run verify` esce 2

- **Causa:** DEF-45-01, quattro voci di `CONVERTED` che nominano pagine rimosse.
- **Non riparata**, e la ragione e' scritta sopra: appartiene a chi ha rimosso
  Finance e Analytics, e correggere la lista da qui trasformerebbe due gate in un
  timbro. Nessun criterio di questo piano e' stato «reso verde» modificando cio'
  che misura.

### 3. [correzione documentale, dentro il file del piano] Due frasi datate in `staff-tabs.ts`

- L'avviso sulle tre sezioni sorelle e la frase *«Formats e' l'unica»*, entrambe
  false su questo albero. Corrette, non cancellate.

---

## Le undici voci differite restano aperte

Nessuna e' stata assorbita da questo piano, e quattro di esse **non sono di un
piano: sono del proprietario**.

| ID | Stato | Di chi e' |
|---|---|---|
| DEF-45-01 | **aperta** — e' la causa del `2` di `npm run verify` | chi ha rimosso Finance e Analytics |
| DEF-45-02 | aperta — condizione d'ambiente (worktree senza `.env.local`) | nessuno: e' una nota per chi esegue in parallelo |
| DEF-45-03 | aperta — **nessuno confronta le descrizioni delle capability**, e tre documenti dicono il contrario | la fase che decide se il confronto va scritto |
| DEF-45-04 | aperta — 357 valori d'evidenza senza una colonna | la fase che decide se l'evidenza per attributo e' una colonna |
| **DEF-45-05** | aperta — **35 note dell'archivio portano un contatto**, trattenute dal seed | **il proprietario**: e' `legal-compliance.md`, non uno schema |
| DEF-45-06 | aperta — `45-CONTEXT.md` afferma due volte una capienza nulla su 184 record; ne portano un numero **38** | chi mantiene `45-CONTEXT.md` |
| DEF-45-07 | **CHIUSA** il 2026-08-17 dal piano 45-12 | — |
| DEF-45-08 | aperta — il registro si legge da quattro sezioni e si scrive da una | chi decide se ogni sezione tiene il proprio arco di scrittura |
| **DEF-45-09** | aperta — **niente registra che un documento sia uscito dal perimetro** | **il proprietario**: serve una tabella, quindi una migration |
| **DEF-45-10** | aperta — la galleria rifiuta a 50 MB e scrive *«exceeds 10MB»* | chi tocca la galleria pubblica; e' una riga |
| **DEF-45-11** | aperta — **l'archivio raccoglie ora foto di persone riconoscibili**: la revoca meccanica c'e', **base giuridica e informativa no** | **il proprietario**, e non si risponde in un modulo |

DEF-45-11 e' quella da guardare per prima: fino al piano 45-17 era teorica —
tabella vuota, nessun percorso per scriverci. **Ora c'e' il percorso.**

---

## Cosa questa fase NON prova, detto per intero

Il build passa, diciassette gate su diciassette che hanno misurato sono verdi, e
**niente di tutto questo e' una prova di rifiuto.**

- `verify:capabilities` legge attraverso un ruolo che **scavalca la RLS**: prova
  che una policy **esiste**, mai che **rifiuti**.
- `verify:section-export` legge la **struttura**: prova che nessuna strada
  esiste, nulla su chi possa percorrerne una.
- `verify:section-surface` sono **asserzioni su stringhe**: nessuna disegna un
  elemento, nessuna misura un pixel, nessuna apre una sessione. I quattro
  giudizi che non puo' dare sono P1–P4, e finche' quelli non portano un
  risultato **le domande sono aperte**.
- L'unico strumento che non scavalca la RLS e' `verify:refusal`, e **anche lui
  non arriva al criterio 1**, perche' D-45-03 non gli ha lasciato un soggetto.

La formulazione onesta di cio' che P1 chiudera' e': *un visitatore che teneva una
sezione e' stato rifiutato dalle altre **li'** — in un ambiente usa-e-getta, mai
in produzione.*

E la conseguenza per il VERIFICATION.md di questa fase, che il documento delle
procedure gia' pretende: **dove una procedura e' differita, va scritto
*differita*, e va scritto che differita non e' verificata.** Una casella `[x]`
e' un'affermazione sull'evidenza, e per queste quattro l'evidenza sono le righe
`Result:`.

---

## Verifica — e cosa significa in un repository senza test runner

Non esiste alcun test runner per il prodotto. **Nessuna riga di questo documento
dichiara qualcosa verificato perche' «i test passano».** Le prove qui sono tre
tipi, e sono tenute separate:

1. **Meccaniche** — `npm run build` (che e' anche il typecheck) e i diciannove
   gate, con i codici d'uscita riportati sopra uno per uno.
2. **Per mutazione** — una sola, sul loop di module-load, con la mutazione
   verificata applicata prima di leggerne l'esito.
3. **Di catalogo** — `pg_policies` letto in produzione, `read_only`, che dice
   quali policy esistono e non cosa facciano a un soggetto.

Cio' che manca e' il quarto tipo, ed e' l'unico che chiude i criteri 1, 2 e 3:
**una persona davanti a uno schermo.** E' il Task 3.

---

## Self-Check: PASSED

- `src/lib/routes/staff-tabs.ts` — presente, modificato, 4 voci di produzione con 4 chiavi distinte
- `.planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md` — presente, modificato
- commit `247d14d` — presente
- commit `6c21f41` — presente

*Fase 45, piano 18. Nessun nome di spazio, nessuna data non annunciata, nessuna
line-up, nessun nome di persona. `re:sonate` si scrive con la e normale.*
