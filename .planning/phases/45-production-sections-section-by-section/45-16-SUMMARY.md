---
phase: 45-production-sections-section-by-section
plan: 16
subsystem: api
tags: [export, markdown, venue-secrecy, sound-manifesto, brand-visual-system, closure-walk, allow-list, no-new-dependency]

# Dependency graph
requires:
  - phase: 45-06
    provides: "scripts/verify-section-export.mjs — i cinque check e le due voci d'entry, scritti dieci piani prima delle superfici che misurano"
  - phase: 45-12
    provides: "src/lib/production/sections/tokens.ts, il lettore a run time del :root; le due superfici di lettura su cui il pannello si monta"
  - phase: 45-15
    provides: "le convenzioni: gate non esportato chiesto per primo, rifiuti restituiti uno per causa, il modulo PIANO per cio' che due file \"use server\" condividono"
provides:
  - "src/lib/production/export/manifesto.ts — il manifesto, tre tabelle dichiarate in testa e nessuna quarta"
  - "src/lib/production/export/capitolato.ts — il capitolato, le stesse tre piu' la palette letta a run time"
  - "src/lib/production/sections/export-contract.ts — modulo piano: tre rifiuti, la forma del documento, e PERIMETER_NOTICE scritto una volta sola"
  - "src/app/(admin)/admin/manifesto/export-actions.ts — un braccio, una chiave, nessuna query"
  - "src/app/(admin)/admin/visual/export-actions.ts — il gemello, l'altra chiave"
  - "src/app/(admin)/admin/manifesto/ExportPanel.tsx — una definizione, due importatori, il file costruito nel browser"
  - "verify:section-export — da REFUSED a VERDE, per la prima volta da quando esiste"
affects: [45-17, 45-18, 45-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "l'allow-list si scrive nel modulo, la deny-list la deriva il gate: la seconda copre solo le tabelle che gia' conosce, la prima costringe chi aggiunge una lettura a modificare una lista"
    - "una lettura fatta nel braccio sarebbe un buco nella chiusura che il gate cammina, con il verde ancora sopra: il modulo possiede TUTTE le letture"
    - "il catalogo si legge con .from() e non come embed — il check C legge le chiamate e non vede una tabella nominata dentro una stringa di select, quindi un embed lo lascerebbe passare a vuoto"
    - "un rifiuto parziale e' peggio di nessun documento: chi lo riceve non puo' sapere cosa manca"
    - "il file si costruisce nel browser da una stringa — nessuna rotta, quindi nessun indirizzo che sopravviva alla chiave che lo ha prodotto"

key-files:
  created:
    - "src/lib/production/export/manifesto.ts"
    - "src/lib/production/export/capitolato.ts"
    - "src/lib/production/sections/export-contract.ts"
    - "src/app/(admin)/admin/manifesto/export-actions.ts"
    - "src/app/(admin)/admin/visual/export-actions.ts"
    - "src/app/(admin)/admin/manifesto/ExportPanel.tsx"
  modified:
    - "src/app/(admin)/admin/(work)/manifesto/page.tsx"
    - "src/app/(admin)/admin/(work)/visual/page.tsx"
    - ".planning/phases/45-production-sections-section-by-section/deferred-items.md"

key-decisions:
  - "D-45-16-A: il catalogo dei formati si legge con `.from(\"formats\")` e NON come embed. Il check C del gate legge le chiamate `.from()` ed e' cieco a una tabella nominata dentro una stringa di select: con un embed la meta' positiva sarebbe passata a vuoto — verde su una dimostrazione che non c'era. In piu' un embed ambiguo fallisce in SILENZIO attraverso questo client, e su un documento che sta per uscire avrebbe prodotto un brief con tutte le regole mancanti"
  - "D-45-16-B: entrambi i moduli leggono anche `production_open_question`, oltre alle due tabelle che il gate pre-registra. Il check C e' un PAVIMENTO, non un soffitto: il soffitto e' la lista vietata, derivata piu' pinnata, e il registro non e' su nessuna delle due. La ragione e' di dominio — finche' una domanda e' aperta nessun materiale puo' dare per implicita una delle sue risposte, e un brief senza le sue domande aperte si legge come definito"
  - "D-45-16-C: una lettura fallita RIFIUTA il documento intero invece di produrne uno piu' corto. Un documento parziale e' peggio di nessun documento perche' chi lo riceve non ha modo di sapere che manca qualcosa"
  - "D-45-16-D: la palette e' l'unica eccezione a D-45-16-C — un fallimento di lettura viene RESO DENTRO il documento, con codice e frase. Un grafico a cui si dice *la palette non e' leggibile, non indovinare* si comporta correttamente; uno a cui si consegna un documento senza sezione colore prende i colori piu' vicini, che e' il gate *il colore non si eredita* che fallisce dall'altra parte del perimetro"
  - "D-45-16-E: il contratto piano sta in `src/lib/production/sections/export-contract.ts` e NON nella directory dell'export. La forma piu' chiara di *ci sono due documenti e non ce n'e' un terzo* e' una directory che contiene esattamente due file, entrambi documenti"
  - "D-45-16-F: nessun identity check nei due bracci. Questi atti non scrivono e non attribuiscono niente, quindi un controllo sull'id del chiamante non proteggerebbe nessuna colonna — e un controllo che non protegge niente lascia credere che qualcosa venga registrato. Registrato invece come DEF-45-09: niente traccia che un documento sia uscito"
  - "D-45-16-G: nessuna data, da nessuna parte — ne' nel nome del file ne' nel corpo. Il costo e' dichiarato dentro il documento stesso: non esiste copia archiviata, quindi una copia in mano a qualcuno e' vecchia quanto la pressione che l'ha prodotta e nulla nel file glielo dice"

requirements-completed: [PROD-02]

# Metrics
duration: ~2h15min
completed: 2026-08-17
---

# Fase 45 Piano 16: i due documenti che escono dal perimetro — Summary

**Due serializzatori la cui strettezza non e' una precauzione ma una proprieta'
misurabile: la camminata di chiusura raggiunge nove e dieci moduli, di questi
**uno solo interroga qualcosa** — il modulo stesso — e interroga esattamente le
tre tabelle che dichiara in testa al file. `verify:section-export` e' verde per la
prima volta da quando esiste, e i check che lo dicono sono stati visti fallire.**

## Performance

- **Duration:** ~2h15min
- **Completed:** 2026-08-17
- **Tasks:** 2, piu' un commit di registrazione dichiarato
- **Files:** 9 (6 creati, 3 modificati)

## Task Commits

1. **Task 1 — i due serializzatori e il contratto piano** — `d2058b6` (feat)
2. **Task 2 — i due bracci, il pannello, le due pagine** — `c22c4fc` (feat)
3. **DEF-45-09 registrata** — `f3d1e52` (docs)

---

## Il verdetto che il gate aspettava dal piano 45-06

`verify:section-export` rifiutava da dieci piani, perche' le sue due voci d'entry
non esistevano. La meta' catalogo aveva gia' misurato in 45-08; la meta' sorgente
non aveva niente da cui partire. Oggi ha misurato.

| | prima di questo piano | dopo |
|---|---|---|
| `verify:section-export` | **REFUSED (2)** — *«2 of 2 export modules are not on disk»* | **SECTION_EXPORT_OK (0)** |
| `npm run verify` | exit **1** · FAIL **1** · REFUSED **3** | exit **1** · FAIL **1** · REFUSED **2** |
| gate che falliscono | `capabilities` | `capabilities` — **lo stesso, e non e' di questo piano** |
| gate che rifiutano | `conversion`, `section-export`, `touch-targets` | `conversion`, `touch-targets` |

**Il baseline e' stato misurato prima di toccare l'albero** e l'unica differenza e'
che un rifiuto e' diventato un passaggio. `verify:capabilities` fallisce su tre
lati su cinque perche' `production.read` sta in produzione e non in TypeScript: e'
la finestra rossa dichiarata dall'orchestratore (deploy non live, 45-09 spostato
in fondo), gia' registrata da 45-15, **e non e' una regressione di qui.**

⚠ **Il worktree ha misurato con le credenziali vere.** `.env.local` e' stato
copiato dal checkout principale — mai committato, mai stampato, `git check-ignore`
conferma `.gitignore:34` — e rimosso alla fine. Senza, la meta' catalogo del gate
avrebbe rifiutato e il verde sarebbe stato mezzo verde. Stessa strada di 45-15.

---

## La dimostrazione, che e' una misura e non un'affermazione

Il piano chiede che la strettezza sia **strutturale** e che il summary la
**dimostri** invece di asserirla. La dimostrazione e' la chiusura degli import,
camminata con la stessa logica del gate:

**`src/lib/production/export/manifesto.ts` raggiunge 9 moduli:**

```
src/lib/capabilities/keys.ts
src/lib/door/outcome.ts
src/lib/membership/acts.ts
src/lib/production/export/manifesto.ts        ← l'unico che interroga qualcosa
src/lib/production/ics/vocabulary.ts
src/lib/production/sections/export-contract.ts
src/lib/production/sections/vocabulary.ts
src/lib/supabase/server.ts
src/types/database.ts
```

**`src/lib/production/export/capitolato.ts` raggiunge 10** — gli stessi piu'
`src/lib/production/sections/tokens.ts`, il lettore della palette.

| Asserzione | manifesto | capitolato |
|---|---|---|
| moduli raggiunti | **9** | **10** |
| specificatori non risolti (un buco nella chiusura) | **0** | **0** |
| moduli raggiunti che interrogano una tabella | **1** — se stesso | **1** — se stesso |
| tabelle interrogate | `production_section`, `production_open_question`, `formats` | le stesse tre |
| tabelle interrogate che sono nella lista vietata | **0 su 13** | **0 su 13** |
| moduli raggiunti che nominano la strada pubblica a un indirizzo | **0** | **0** |
| moduli raggiunti che importano il client di servizio | **0** | **0** |

**Questo e' il senso di *non puo' portare un indirizzo*.** Non che nessuno lo
scriva: che **nessuna riga del codice raggiungibile da questi due file interroga
una tabella che ne contiene uno**. Le nove tabelle derivate portano `address`,
`date`, `start_time`, `venue_id` e le colonne di rivelazione; le quattro pinnate
portano i piani interni, il ledger d'import, gli attributi di scouting e gli asset
visivi. Nessuna e' raggiungibile.

⚠ **`src/types/database.ts` nomina la strada pubblica una volta**, riga 1684 — e
sta **dentro un commento**. Verificato eseguendo lo stripper del repo
(`scripts/lib/comments.mjs`) sul file e chiedendo se la sorgente viva la
contenesse: **`false`**. Misurato invece di dedotto, perche' e' l'unica riga in
tutta la chiusura che avrebbe potuto far rossare il check A.

### E la seconda misura, sulle righe vive dei cinque file nuovi

Commenti cancellati con lo stripper del repo, poi cinque sonde:

| File | esadecimale | parola *venue* | parola *address* | costruzione di data | client di servizio |
|---|---|---|---|---|---|
| `export/manifesto.ts` | — | — | — | — | — |
| `export/capitolato.ts` | — | — | — | — | — |
| `sections/export-contract.ts` | — | **presente** | **presente** | — | — |
| `manifesto/export-actions.ts` | — | — | — | — | — |
| `visual/export-actions.ts` | — | — | — | — | — |

**L'unica occorrenza viva di *venue* e *address* in tutto il percorso d'export sta
dentro la frase che li vieta** — `PERIMETER_NOTICE`, che scrive `@ Secret Venue` e
*«non porta nessun indirizzo»*. Sono le parole come regola, non come dato: la
costante e' letterale e non legge nessuna colonna.

---

## Provato per mutazione, con la mutazione verificata applicata prima di leggerne l'esito

`ai-engineering.md` pretende esattamente questo, e il piano pretende in piu' che il
check C **sia stato visto scattare** invece di passare a vuoto.

| # | Mutazione | Verificata applicata | Esito |
|---|---|---|---|
| 1 | `.from("formats")` → `.from("formats_MUTATED")` in `manifesto.ts` | `grep -c '\.from("formats")'` → **0**, nome mutato → **1** | **check C rosso**, exit 1: *«does not query formats, which it is declared to read»* |
| 2 | ripristino da copia byte-per-byte | `diff -q` → **identico**; `.from("formats")` → **1** | exit **0** |
| 3 | `.from("production_open_question")` → `.from("venues")` in `capitolato.ts` | `grep -c '\.from("venues")'` → **1** | **check A e B rossi**, exit 1: *«venues is on the derived list because it carries address»* |
| 4 | ripristino | `venues` → **0**, `production_open_question` → **1** | exit **0** |

**La mutazione 1 e' quella che conta**, ed e' la ragione per cui il check C esiste:
A e B sono negativi e andrebbero verdi su un file svuotato o vuoto. Averlo visto
rossare dice che la meta' positiva **misura**, e che il verde di oggi non e' un
verde su un'assenza.

---

## D-45-16-A: perche' il catalogo si legge, e non si incorpora

Le due superfici di lettura di 45-12 e 45-15 prendono il nome del format con un
**embed** (`formats ( name )`). I due serializzatori **no**, e la deviazione dalla
convenzione di casa e' deliberata, per due ragioni:

1. **Il check C legge `.from(…)` e non vede una tabella nominata dentro una
   stringa di select.** Con l'embed, `formats` non sarebbe mai comparso fra le
   tabelle interrogate e la meta' positiva del gate sarebbe passata **a vuoto** —
   un verde su una dimostrazione che non e' avvenuta, che e' esattamente cio' che
   quel check e' stato scritto per impedire.
2. **Un embed ambiguo fallisce in silenzio attraverso questo client** —
   `HTTP 300 PGRST201`, `data` a null, nessuna eccezione. Sulle pagine il costo e'
   una schermata vuota che qualcuno vede; **qui il costo e' un brief con tutte le
   regole mancanti, consegnato a un terzo che non ha modo di accorgersene.**

`color` non e' selezionato in nessuno dei due. Ogni format porta un colore
identificativo — la colonna e' `NOT NULL`, **compreso il format che non ha una
palette** — e uno stampato dentro il documento il cui soggetto *e'* la palette
sarebbe una palette che nessuno ha deciso.

`code` si', ed e' la sigla del format (`RSNT`, `SNST`, `RMDB`, `MTNLB`). **La forma
per-sede di una sigla non viene costruita qui e non deve esserlo: porta una
sede.** La regola e' scritta accanto al tipo, dove qualcuno la comporrebbe.

---

## D-45-16-B: il check C e' un pavimento, non un soffitto

Il gate pre-registra due tabelle per il manifesto e una per il capitolato. I due
moduli ne leggono **tre ciascuno**. Non e' una violazione ed e' bene dirlo per
esteso, perche' un lettore che confronta `DECLARED_READS` con i blocchi in testa ai
due file vede numeri diversi:

- **il check C dice cosa il modulo DEVE interrogare** — la meta' positiva, che
  fallisce su un file svuotato;
- **i check A e B dicono cosa NON PUO'** — la lista vietata, 13 nomi, 9 derivati
  dallo schema e 4 pinnati per decisione.

`production_open_question` non e' su nessuna delle due liste, ed e' letta di
proposito. La ragione e' di dominio e sta in `sound-manifesto.md`, gate *un solo
manifesto o uno per sede*: **finche' una domanda e' aperta, nessun materiale puo'
dare per implicita una delle sue risposte.** Un brief consegnato senza le sue
domande aperte si legge come **definito** da chi lo tiene in mano, e quella persona
non ha modo di sapere che manca qualcosa. E' la stessa frase che la pagina del
manifesto gia' scrive per se': *«a manifesto shown without its outstanding
questions is a manifesto that looks settled»*.

Sul capitolato la ragione e' anche piu' concreta: la grafia del brand, il quadrato
grid-safe e l'ordine di pubblicazione appartengono a nessun format singolo — sono
esattamente le domande che un grafico, non vedendole, chiude scegliendone una.

---

## D-45-16-C e D: cosa rifiuta, e l'unica cosa che invece degrada

**Tre rifiuti, uno per causa distinguibile**, e tutti e tre fermano il documento
intero:

| Rifiuto | Perche' non produce un documento piu' corto |
|---|---|
| `sections_read_failed` | un capitolato senza le sue clausole non e' un capitolato piu' breve |
| `questions_read_failed` | vedi sopra: un brief senza le domande aperte si legge come definito |
| `formats_read_failed` | **una regola scritta per un format verrebbe stampata come regola del brand** — non e' un'etichetta mancante, e' il documento sbagliato con una faccia sicura |

**La palette e' l'unica che degrada** (D-45-16-D), e la differenza e' quello che il
lettore fa dopo. Un fallimento di `readBrandPalette` viene reso **dentro** il
documento, con il suo codice fra apici e una frase che dice cosa non fare:

> **The palette could not be read, and this document was produced without it.**
> (`token_file_unreadable`)
> … do not sample them from an existing piece, and do not approximate them.

Un grafico a cui si dice *non e' leggibile, chiedi* si comporta correttamente; uno
a cui si consegna un documento **senza** sezione colore prende i colori piu' vicini
— che e' `brand-visual-system.md`, gate *il colore non si eredita*, che fallisce
dall'altra parte del perimetro, dove nessuno qui lo vedrebbe. **Contato e visibile,
mai un drop silenzioso**: e' la chiamata che 45-10 ha fatto sulle 35 note
dell'archivio, applicata a un documento.

---

## Cio' che i documenti NON scrivono, e che sarebbe stato facile scrivere

**Le tre tabelle sono vuote.** Il documento prodotto oggi dice, per ogni format,
che nulla e' stato scritto. E' la tentazione centrale di questo piano, e la
risposta e' no:

- **nessuna regola inventata.** Niente strati, niente BPM, niente artisti di
  riferimento, nessuna curva. *Non ancora definito* e' la risposta corretta, e una
  volta che una prosa plausibile arriva in un brief **e'** il brand per chi la
  legge;
- **nessuna clausola di capitolato hard-coded.** Il grid-safe, la tipografia e il
  suo degrado dichiarato, l'ordine di pubblicazione e la sua inversione nel grid
  sono **contenuto d'autore**, righe di `production_section`. Un serializzatore che
  li stampasse starebbe scrivendo il capitolato al posto di chi possiede il brand —
  la stessa cosa che il docblock di `tokens.ts` vieta a se stesso;
- **nessun nome di format accanto a *questo non ha palette*.** Quale sia e'
  contenuto d'autore: una clausola in stato `not_decided` che nomina la lacuna e il
  ruolo. Una costante qui che lo affermasse sarebbe questo piano a chiudere una
  domanda che il registro esiste per tenere aperta (D-45-12-D);
- **nessuna line-up, nessuna sede, nessuna data.**

**Le due proibizioni SI', e non sono contenuto d'autore.** `@ Secret Venue`, il
niente-indirizzo, il niente-data e lo spazio-non-acquisito-non-si-nomina sono
condizioni della **consegna**, non regole di brand, e stanno su ogni copia
qualunque cosa qualcuno abbia scritto. Vivono in **una** costante,
`PERIMETER_NOTICE`, letta dai due documenti: scritte due volte deriverebbero, e la
deriva sarebbe invisibile perche' niente confronta due paragrafi di prosa.

---

## D-45-16-G: nessuna data, e il costo dichiarato dentro il documento

Il nome del file e' `sound-manifesto.md` e `visual-capitolato.md`. Nessuna data,
nessuna sede, nessun codice di format: **un nome di file e' una stringa che
qualcuno incolla in un messaggio, inoltra e legge ad alta voce**, e arriva dove
l'intestazione del documento non arriva.

Nel corpo non c'e' nessuna data e nessuna costruzione di data — misurato sulle
righe vive: `new Date(`, `toISOString`, `toLocaleDate` → **0 in tutti e cinque i
file**. Dove una regola ha un tempo, si esprime **come regola** — *il listing esce
il martedi'* — e mai come giorno.

⚠ **Il costo e' reale ed e' scritto dentro il documento invece che qui.** Non
esiste copia archiviata: il documento si assembla al momento della pressione, e
**una copia in mano a qualcuno e' vecchia esattamente quanto quella pressione,
senza che nulla nel file glielo dica**. La frase e' l'ultima riga di
`PERIMETER_NOTICE`, cosi' che a leggerla sia chi il documento ce l'ha, non chi
legge questo summary.

---

## Le due chiavi restano due, e i bracci non interrogano

| Asserzione | `manifesto/export-actions.ts` | `visual/export-actions.ts` |
|---|---|---|
| `CAP.PRODUCTION_MANIFESTO_MANAGE` | **1** | **0** |
| `CAP.PRODUCTION_VISUAL_MANAGE` | **0** | **1** |
| `.from(` | **0** | **0** |
| `export … function assert` | **0** | **0** |

**Il braccio non interroga, ed e' la condizione perche' la dimostrazione valga
qualcosa.** Il modulo possiede *tutte* le letture, cosi' che la chiusura camminata
dal gate sia la storia intera. Una query aggiunta nel braccio sarebbe **un buco
nella chiusura con il gate ancora verde sopra**.

⚠ **Un criterio d'accettazione del piano e' falso alla lettera, e lo dico perche'
credergli sarebbe peggio che non averlo.** Il Task 2 afferma: *«`npm run
verify:section-export` still exits 0 — the arms are inside the closure now, and a
query added to one of them would redden it.»* **I bracci non sono nella chiusura.**
La camminata parte dai serializzatori e segue gli import **in uscita**; i bracci
importano i serializzatori, quindi la freccia punta dalla parte sbagliata e la
camminata non arriva mai qui. Misurato: le due chiusure contano 9 e 10 moduli e
**nessuno dei due bracci compare**.

Cosa e' vero al posto suo: la strettezza dei bracci e' tenuta da un `grep`
(`.from(` → 0 in entrambi), non dalla chiusura. E' una garanzia piu' debole, e i
due docblock lo scrivono nel file invece di lasciarlo dedurre. Non ho allargato il
gate per farcelo entrare: un gate corretto a posteriori per combaciare con
l'albero e' a un passo dal diventare un timbro — la difesa che 45-12 ha dovuto
scrivere per DEF-45-07, e qui non c'era nemmeno un indirizzo sbagliato da
correggere.

---

## Il pannello, e la frase che nessun verde compra

`/usr/bin/grep -rln "ExportPanel" src` → **tre file**: la definizione e i due
importatori. L'atto arriva come **prop**; il pannello non importa nessuno dei due
bracci e non potrebbe sceglierne uno nemmeno volendo.

| Asserzione | Esito |
|---|---|
| `grep -ci "leaves the perimeter"` | **1** |
| `grep -cE "toast\|Toast"` | **0** — l'esito sta nel pannello, dove si puo' rileggere |
| `git diff src/lib/routes/capability-routes.ts` | **vuoto** — nessuna rotta nuova |
| `npm run verify:routes` | **0** |
| `EXPORT_REFUSAL_SENTENCE` | `Record` **totale** su `ExportRefusal`: 3 cause, 3 frasi |

**Il file si costruisce nel browser** da una `Blob`, con `revokeObjectURL` subito
dopo. Non e' pulizia: una object URL mai revocata e' una copia del documento tenuta
nella scheda finche' resta aperta, e questo e' l'unico contenuto del prodotto la
cui natura e' uscire. Nessuna rotta significa **nessun indirizzo che sopravviva
alla chiave che lo ha prodotto** — niente da mettere fra i preferiti, niente da
riaprire dopo che il permesso e' stato tolto.

**E la frase.** Un verde di `verify:section-export` dimostra cosa il codice puo'
**raggiungere**. Non sa leggere la prosa. Un indirizzo o una data non possono
arrivare in questi documenti perche' nessuna query li tocca — ma **una line-up che
un autore ha digitato nel corpo di una regola viaggia con quella regola**, e
nessuna camminata di chiusura la vedra' mai. Il pannello lo dice accanto al
controllo, come passo per una persona e **dichiarato come limite**, non travestito
da prova: rivendicare una copertura li' sarebbe peggio che tacere, perche'
impedirebbe alla verifica di avvenire.

---

## Deviations from Plan

### Auto-fixed / declared

**1. [Deviazione dichiarata] `src/lib/production/sections/export-contract.ts` — un file oltre `files_modified`**

- **Trovata durante:** Task 1.
- **Issue:** i due bracci e i due serializzatori condividono la forma del
  documento e l'unione dei rifiuti; la frase sul perimetro deve essere **una
  sola** o i due documenti la direbbero diversamente. Nessun predicato puo'
  restare in un file `"use server"` (`may-upload.ts:27-34`: pubblica un oracolo).
- **Fix:** un modulo **piano**, gemello esatto di `write-contract.ts` e nella
  stessa directory. **Non** nella directory dell'export (D-45-16-E): la forma piu'
  chiara di *ci sono due documenti e non ce n'e' un terzo* e' una directory con
  esattamente due file, entrambi documenti.
- **Commit:** `d2058b6`

---

**2. [Rule 2 — funzionalita' mancante per la correttezza] Un terzo rifiuto, `formats_read_failed`, e la lettura che lo produce**

- **Trovata durante:** Task 1.
- **Issue:** il piano non nomina una lettura del catalogo. Ma il check C pretende
  `.from("formats")` dal manifesto, e senza i nomi dei format **ogni regola
  finirebbe sotto un'unica intestazione indifferenziata** — una regola scritta per
  un format letta come regola del brand da chi la riceve.
- **Fix:** una lettura vera (non un embed, D-45-16-A), senza `color`, e un rifiuto
  con la sua causa e la sua frase.
- **Files:** i due serializzatori, `export-contract.ts`, `ExportPanel.tsx`
- **Commit:** `d2058b6`, `c22c4fc`

---

**3. [Rule 2 — funzionalita' mancante per la correttezza] Le domande aperte viaggiano anche con il capitolato**

- **Trovata durante:** Task 1.
- **Issue:** il piano mette *«open questions travel with it»* nel paragrafo del
  manifesto. Sul capitolato la stessa omissione e' peggiore: un grafico che non
  vede la domanda *un format senza palette eredita o resta neutro* **la chiude
  scegliendo**, e il pezzo diventa la decisione.
- **Fix:** entrambi i moduli leggono il registro, con gli stessi due archi delle
  pagine — la propria sezione e le voci brand-wide, solo aperte.
- **Commit:** `d2058b6`

---

**4. [Rule 2 — funzionalita' mancante] `EXPORT_REFUSAL_SENTENCE` dentro `ExportPanel.tsx` invece che in `refusals.tsx`**

- **Trovata durante:** Task 2.
- **Issue:** i tre rifiuti dell'export hanno bisogno di tre frasi. `refusals.tsx`
  e' la casa delle frasi di scrittura, ma il pannello e' **l'unico consumatore** di
  queste tre.
- **Fix:** la mappa vive nel suo unico consumatore, totale sull'unione (una causa
  aggiunta senza frase e' un errore di build). `refusals.tsx` non e' stato
  modificato — solo importato, per `NOT_PERMITTED`, `UNREACHABLE`, `OutcomeLine` e
  `SENTENCE`, che coprono cio' che si distingue solo per **forma** del fallimento.
- **Commit:** `c22c4fc`

---

**5. [Fuori scope, registrata] DEF-45-09 — niente registra che un documento sia uscito**

- **Trovata durante:** Task 2, scrivendo il gate del braccio.
- **Issue:** i moduli di scrittura di 45-15 mettono `updated_by` su ogni riga;
  questi due atti producono i **soli** documenti che lasciano l'edificio e non
  scrivono niente da nessuna parte. E' l'atto privilegiato **meno** tracciato della
  fase e dovrebbe essere il piu'.
- **Perche' non riparata:** serve una tabella (migration = Rule 4), non c'e'
  autorizzazione a scrivere in produzione (D12), e un log da solo non basterebbe —
  non esiste error tracking, quindi sarebbe una tracciabilita' dichiarata e
  inesistente, peggio dell'assenza che almeno e' onesta.
- **Commit:** `f3d1e52`

---

**Total deviations:** 5 — 3 correttezza (Rule 2), 1 dichiarata (perimetro), 1
registrata come differita.
**Impatto sul perimetro:** un file oltre `files_modified` (`export-contract.ts`),
imposto da un contratto gia' committato — il divieto di lasciare un predicato in un
file `"use server"`. **Nessun allargamento funzionale, nessuna rotta nuova, nessun
pacchetto installato.**

---

## Issues Encountered

**1. Un criterio d'accettazione e' falso alla lettera.** I bracci non entrano nella
chiusura camminata dal gate; la freccia degli import punta dalla parte opposta. Vedi
sopra — misurato, non dedotto, e non riparato allargando il gate.

**2. Il worktree parte senza `node_modules` e senza `.env.local`.** Risolto come i
piani 45-12 e 45-15: **symlink** al checkout principale (nessun `npm install`,
nessun pacchetto scaricato) e copia di `.env.local`, entrambi rimossi alla fine e
mai committati. `git status` e' pulito a fine piano. Vale la pena continuare a
scriverlo nei prompt invece di riscoprirlo a ogni onda.

**3. Due criteri d'accettazione del piano sono irraggiungibili alla lettera, e non
per questo piano.**

| Criterio | Restituisce | Perche' |
|---|---|---|
| `npm run verify` esce 0 | **1** | `verify:capabilities` misura il modello di produzione, che porta una chiave che TypeScript non ha. **Identico prima e dopo** — DEF-45-02, finestra rossa dichiarata |
| `npm run verify:touch-targets` esce 0 | **2 (REFUSED)** | DEF-45-01: il manifesto `CONVERTED` nomina quattro superfici rimosse col taglio di Finance e Analytics. Nessun file di questo piano e' coinvolto |

**4. `npm run lint` — 121 problemi, tutti pre-esistenti.** Nessuno dei sei file
nuovi compare nell'output (`grep` sui cinque nomi → nessuna riga).

---

## Verification

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **0** | eseguito dopo ogni task e una terza volta dopo il ripristino delle mutazioni. `/admin/manifesto` e `/admin/visual` entrambe nella route table |
| `npm run verify:section-export` | **0** | **il primo verde da quando il gate esiste.** Check C provato a rossare, check A e B provati a rossare |
| `npm run verify:semantic-separation` | **0** | `EXEMPT_PATHS` invariato — `git diff` vuoto. **Nessuna terza esenzione** |
| `npm run verify:section-surface` | **0** | A B C D E verdi, 33 file su 7 directory (erano 28 dopo 45-15) |
| `npm run verify:routes` | **0** | `capability-routes.ts` non toccato — `git diff` vuoto |
| `npm run verify:dialogs` · `breakpoints` · `sunset-gradient` · `tokens` · `tables` · `no-viewport-read` | **0** | |
| `npm run verify:touch-targets` | **2 (REFUSED)** | DEF-45-01, pre-esistente |
| `npm run verify:capabilities` | **1 (FAIL)** | DEF-45-02 + finestra rossa del deploy; identico al baseline |
| `npm run verify` | **1** | FAIL **1**, REFUSED **2** — era FAIL 1, REFUSED 3 |
| `npm run lint` | pre-esistente | nessuno dei sei file nuovi nell'output |
| `git diff package.json` · `package-lock.json` | **vuoto** | **nessuna dipendenza PDF, nessun pacchetto installato** (T-45-SC) |

### Cosa un verde NON significa qui

- **Nessuna riga e' mai passata da queste query, e non c'era autorizzazione per
  scriverne** (D12). Le tre tabelle sono **vuote**: il documento prodotto oggi dice
  che nulla e' stato scritto, che e' la risposta vera. Il build fa il typecheck
  **contro le dichiarazioni** di `src/types/database.ts`, e nessun client Supabase
  di questo repo e' parametrizzato con `Database` — i nomi di colonna sono
  asserzioni doppie (`as unknown as`), che lo dicono ad alta voce.
- **Nessun documento e' mai stato prodotto.** Il percorso di render non e' mai
  stato eseguito su righe vere, perche' righe vere non esistono. Cio' che e'
  dimostrato e' **cosa il codice puo' raggiungere**, non come si legge il risultato.
- **La meta' catalogo del gate legge con un ruolo che BYPASSA la RLS.** Dimostra
  che **nessuna strada esiste** fra scouting e la strada pubblica a un indirizzo.
  Non dimostra **nulla** su chi possa percorrerne una: quella e' la procedura P1 e
  `verify:refusal`, e nessuna delle due e' questo gate.
- **Nessuna sessione e' stata aperta.** Che i due bracci siano rifiutati a chi il
  modello dei permessi non ammette non e' stato esercitato — e' **P1**, ancora
  aperta, e i passi sono scritti sotto.
- **Il check C dimostra che il modulo interroga cio' che dichiara. Non dimostra che
  la *lista in testa al file* sia completa** — quella e' letta da un essere umano
  contro le chiamate sotto. Oggi coincidono, ed e' stato verificato riga per riga.
- **Non esiste alcun test runner per il prodotto.** Dirlo e' obbligatorio.

### Procedura manuale scritta, da eseguire dopo il deploy

Non eseguibile oggi: il deploy non e' live (decisione dell'orchestratore) e le
tabelle sono vuote.

1. Con un ruolo che tiene `production.manifesto.manage`, aprire `/admin/manifesto`.
   **Attesa:** in fondo, la carta *HANDING IT OVER*, con la frase che dice che il
   documento lascia il perimetro e a chi va.
2. Premere **con le tabelle ancora vuote**. **Attesa:** un file
   `sound-manifesto.md` scaricato; dentro, per ogni format, *nothing has been
   recorded yet* — e **nessuna regola d'esempio, nessun BPM, nessun genere,
   nessun artista.** Se il file contiene una sola affermazione su come suona un
   format, questo piano ha fallito il suo unico gate.
3. Aprire il file e verificare a mano: **nessuna data, nessun indirizzo, nessun
   nome di sede, nessun nome di artista.** Il blocco *Before this is handed over*
   deve esserci ed essere **sopra** il contenuto.
4. Registrare una regola in stato `written`, una in `coordinates_declared` e una in
   `not_decided`. Riprodurre. **Attesa:** tre rese **diverse** — il corpo; il corpo
   preceduto dalla riga che dice che il manifesto non e' scritto **e che quel che
   segue vincola comunque, esclusioni comprese**; e la lacuna con il ruolo, **senza
   corpo**. Se le tre si leggono uguali, il format indeciso si legge come libero.
5. Aprire una domanda nel registro. Riprodurre. **Attesa:** la domanda in fondo,
   sotto *Still open*, con il suo ruolo. **Questo e' il passo che conta:** una
   domanda che arriva nel brief viene chiesta, una che non arriva viene chiusa in
   un set.
6. Su `/admin/visual` con `production.visual.manage`: premere. **Attesa:**
   `visual-capitolato.md`, con la tabella *The palette* a **sei righe**, ognuna col
   nome del token e il valore. Confrontarli con `src/app/globals.css`: devono
   coincidere **perche' sono gli stessi byte**.
7. Rinominare temporaneamente `globals.css` e riprodurre il capitolato. **Attesa:**
   la sezione *The palette* c'e' comunque e porta `token_file_unreadable` con la
   frase *do not guess*. **Il documento non deve uscire senza sezione colore.**
   Ripristinare il nome.
8. Con un ruolo che tiene **solo** `production.visual.manage`, invocare
   `exportSoundManifesto` direttamente (fetch verso l'endpoint della Server Action,
   body forgiato). **Attesa:** un throw, e **nessun documento**. E' l'unica prova
   che i due bracci siano davvero due.
9. Con la console e i log del server aperti, provocare un fallimento di lettura
   (revocando temporaneamente una policy). **Attesa:** **nessun documento**, la
   frase giusta delle tre nel pannello, e nelle righe di log solo `code=` e
   `message=` — **nessuna prosa d'autore, nessun nome d'artista.**
10. A 390px: la carta su una colonna, il pulsante alto almeno 44px, nessuno
    scorrimento orizzontale.
11. **Il passo che nessun gate sostituisce.** Con una regola il cui corpo contiene
    di proposito il nome di un dj, riprodurre il documento. **Attesa: il nome c'e'.**
    E' il comportamento corretto e va visto una volta, perche' e' esattamente cio'
    che la frase accanto al controllo chiede di cercare prima di consegnare.

---

## Known Stubs

Nessuno. I sei file sono completi per il loro perimetro: ogni ramo che i loro tipi
ammettono e' disegnato, nessun valore finto raggiunge uno schermo o un documento,
nessun `TODO`, nessun dato hardcoded.

Quattro assenze sono **decisioni dichiarate e non stub**:

- **Nessun terzo modulo d'export**, e non ce ne sara' uno. La sezione location non
  esce dal perimetro: il gate fallisce **per nome** se un file che comincia per
  `location` compare in quella directory, e quel check gira **anche quando le due
  voci d'entry non esistono**.
- **Nessuna dipendenza PDF.** Pesata e rifiutata in `45-RESEARCH.md`: superficie di
  supply chain comprata per un documento che il proprietario puo' stampare. Markdown.
- **Nessuna regola scritta dal codice.** Le clausole sono contenuto d'autore; dove
  non ce ne sono, il documento lo dice.
- **Nessuna registrazione dell'uscita.** DEF-45-09, aperta, con la ragione scritta
  nei due bracci.

---

## Threat Flags

Nessuna superficie di sicurezza nuova oltre quella che il piano dichiara: **due
endpoint di Server Action nuovi**, uno per chiave. Nessuno schema cambiato,
**nessun pacchetto installato**, nessuna rotta nuova, nessuna nuova esenzione a
nessun gate.

Le mitigazioni del registro del piano, in codice:

- **T-45-09** (divulgazione, il percorso d'export) — lista delle tabelle dichiarata
  in testa a ciascun modulo; camminata di chiusura da ciascuna voce, **0
  specificatori non risolti**; lista vietata derivata (9) piu' pinnata (4); la
  meta' positiva **vista scattare**; **nessun client di servizio** in nessuno dei 9
  e 10 moduli raggiunti; **nessuna terza voce** e il gate che fallisce per nome.
- **T-45-01** (un indirizzo in un documento che esce) — **strutturale**: nessuno
  dei due moduli legge una tabella che ne contiene uno, e nessuno dei due bracci
  interroga (`grep .from(` → 0). `@ Secret Venue` e' cio' che il capitolato dice al
  suo posto, da `PERIMETER_NOTICE`.
- **T-45-18** (una line-up digitata in un corpo) — **accettata, con un passo umano
  nominato**. Nessun percorso di codice puo' vederla; il pannello porta la frase di
  `sound-manifesto.md` che pretende la verifica prima della consegna. **Dichiarata
  come limite, non rivendicata come prova** — e ripetuta nel documento stesso, che
  e' il posto dove la legge chi lo consegna.
- **T-45-14** (una seconda casa per un esadecimale) — valori letti a run time dal
  file dei token; **zero esadecimali** sulle righe vive dei cinque file nuovi;
  `EXEMPT_PATHS` asserito invariato da un `git diff` vuoto.
- **T-45-04** (privilegi, i due bracci) — una chiave ciascuno (1/0 e 0/1), gate non
  esportati, chiesti per primi, nessun modulo condiviso fra i due.
- **T-45-SC** (supply chain) — **nessun pacchetto installato**, `git diff
  package.json` e `package-lock.json` vuoti. La tentazione e' nominata nel codice:
  una libreria PDF e' stata pesata e rifiutata.

---

## User Setup Required

Nessuna. Tre avvertimenti operativi:

1. **Il capitolato dipende da `outputFileTracingIncludes`.** La palette si legge
   dal disco a run time, e `next.config.ts` nomina `globals.css` per
   **`/admin/visual`** (D-45-12-F). Il serializzatore gira **dentro una Server
   Action montata su quella stessa pagina**, quindi la traccia esistente lo copre —
   ma **la prima prova vera e' il primo deploy**. Se non lo coprisse, il documento
   esce lo stesso, con la sezione palette che porta `token_file_unreadable`: un
   fallimento dichiarato e visibile a chi legge il file, non un documento
   silenziosamente senza colori.
2. **Il primo documento prodotto e' anche la prima volta che queste query girano.**
   Nessuna riga e' mai passata da `production_section` ne' da
   `production_open_question`. I nomi di colonna scritti a mano combaciano con
   quelli applicati **per asserzione**, non per controllo.
3. **Niente registra che un documento sia uscito** — DEF-45-09. Se serve saperlo,
   va deciso e serve una tabella.

---

## Next Phase Readiness

- **45-17 (l'upload)** non e' toccato. Nota per chi lo esegue:
  `production_visual_asset` e' **pinnata** nella lista vietata del gate, quindi un
  export che leggesse l'archivio farebbe rossare `verify:section-export`. E' voluto:
  la foto di un artista e' materiale, non capitolato.
- **45-18 (le tab)** non e' toccato; nessun indirizzo nuovo, nessuna riga nuova in
  `capability-routes.ts`.
- **45-VERIFICATION** eredita: la procedura sopra, di cui i passi **8** (le due
  chiavi sono davvero due) e **11** (il nome del dj compare, ed e' corretto che
  compaia) sono quelli che nessun grep sostituisce; e **DEF-45-09**, che appartiene
  a chi decide se la produzione di un documento che esce e' un atto da registrare.
- **Il gate ora misura.** Un piano futuro che aggiunga una lettura a uno dei due
  serializzatori la vedra' rossare se tocca una delle 13 tabelle vietate — e la
  lista si allarga da sola il giorno in cui una tabella nuova dichiara una colonna
  pericolosa.

---

## Self-Check: PASSED

**File dichiarati creati — esistenza verificata:**

- `src/lib/production/export/manifesto.ts` — FOUND
- `src/lib/production/export/capitolato.ts` — FOUND
- `src/lib/production/sections/export-contract.ts` — FOUND
- `src/app/(admin)/admin/manifesto/export-actions.ts` — FOUND
- `src/app/(admin)/admin/visual/export-actions.ts` — FOUND
- `src/app/(admin)/admin/manifesto/ExportPanel.tsx` — FOUND
- `src/app/(admin)/admin/(work)/manifesto/page.tsx` — FOUND (modificato)
- `src/app/(admin)/admin/(work)/visual/page.tsx` — FOUND (modificato)
- `.planning/phases/45-production-sections-section-by-section/deferred-items.md` — FOUND (modificato)

**Commit dichiarati — esistenza verificata:** `d2058b6`, `c22c4fc`, `f3d1e52`.

---
*Phase: 45-production-sections-section-by-section*
*Completed: 2026-08-17*
