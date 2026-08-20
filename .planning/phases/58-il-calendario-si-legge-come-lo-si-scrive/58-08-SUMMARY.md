---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
plan: 08
subsystem: production-calendar
tags: [ics, specchio, reconcile, cancellazione, cascata, idempotenza, gate, prova-per-mutazione]

# Dependency graph
requires:
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-07 — calendar_key sulle quattro tabelle, CALENDAR_KEYS come settimo vocabolario chiuso, e i nomi di vincolo letti da pg_constraint"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-06 — il vocabolario e la disciplina dell'applicazione via endpoint migrations"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-03 — la grammatica e le ancore, e attachNumberlessPieces come superficie pura gia' esercitata da un gate"
  - phase: 44-il-calendario-di-produzione
    provides: "reconcile.ts, il contratto dell'importatore, la cascata dichiarata e i tre esiti di un gate"
provides:
  - "ReconcilePlan e' il piano di uno SPECCHIO: scope di cancellazione, inserimenti, sopravvivenze, riagganci — e nessuna lista di correzione di alcun nome"
  - "MIRROR_DELETION_ORDER — l'ordine obbligato dalle chiavi esterne, con le tre ragioni scritte NEL MODULO"
  - "MIRRORED_TABLES — le tre tabelle specchiate, e la dichiarazione che production_pipeline_rule e production_import_run non lo sono"
  - "Le tre eccezioni nominate e separate: una di sopravvivenza (ICS-03b), due di stato (ICS-03)"
  - "calendarKey come argomento obbligatorio senza default, e su ogni riga inserita"
  - "Il controllo E confronta insiemi di righe, con cinque regole di riduzione dichiarate"
  - "Il controllo I — nessun percorso scrive il timbro di assenza, provato per mutazione su entrambe le grafie"
  - "verify-ics-reachable allineato: sette moduli, venti simboli, tre consumatori"
affects: [58-09, 58-10, 58-11, 58-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Un identificativo non entra in un confronto di idempotenza quando il meccanismo lo rigenera per costruzione: si confronta il contenuto, e l'esclusione si rende strutturale invece che ricordata"
    - "Un confronto fra insiemi dichiara le proprie regole — quali campi, in quale ordine, come i nulli, con quale comparatore — o fallisce a caso"
    - "Il letterale che un gate cerca si assembla: un grep il cui unico match e' la frase che vieta la cosa e' un grep che viene ignorato"
    - "Un messaggio di fallimento dice conteggi e nomi di struttura, mai le righe: le righe portano titoli e parole per uno spazio"
    - "Un nome di tabella si stampa senza il prefisso condiviso quando quella parola compare in un titolo del materiale"
    - "Un elenco di simboli difesi si legge da TUTTI i consumatori a runtime, non dal primo — e non contiene nomi che nessuno chiama ancora"
    - "Una prosa cancellata insieme al codice porta via la ragione: la nota storica resta, l'identificatore no"

key-files:
  created: []
  modified:
    - src/lib/production/ics/reconcile.ts
    - scripts/verify-ics-import.mjs
    - scripts/verify-ics-reachable.mjs

key-decisions:
  - "isEmptyPlan CAMBIA significato invece di sparire: risponde a «questa corsa tocca una riga?», non a «il secondo piano e' vuoto» — che sotto uno specchio e' la domanda sbagliata. Lo scope NON e' contato, perche' e' una condizione e non un elenco"
  - "Lo scope di cancellazione della checklist copre OGNI piano che la chiave seleziona, sopravvissuti inclusi: la sottrazione di ICS-03b si applica al passo 3, non al passo 1 — altrimenti la checklist resterebbe meta' di una corsa e meta' di un'altra"
  - "Le due liste di riaggancio raccolgono TUTTO lo stato umano, anche quello che non rischia niente oggi: sono l'unica copia che esiste attraverso una cancellazione senza transazione, e un percorso di ripristino che esiste solo per i casi ricordati e' il buco che ICS-03 vieta"
  - "ExistingSnapshot passa da quattro liste a due: uno specchio non confronta, quindi le righe memorizzate di pezzi e impegni non hanno lettore"
  - "ExistingChecklistItemRow porta planSourceUid invece della chiave di join composta dalla sigla: la sigla e' contenuto, source_uid e' identita'"
  - "Conseguenza dichiarata di ICS-03b: un piano dietro una serata pubblicata non e' nemmeno reinserito (source_uid e' UNIQUE), quindi SMETTE DI SPECCHIARE IL FILE. Restringe D-44-07, ed e' segnalato al proprietario"

requirements-completed: [ICS-01, ICS-03, ICS-03b]

# Metrics
duration: 78min
completed: 2026-08-20
---

# Fase 58 Piano 08: Lo specchio, scritto in sottrazione — Summary

**Il riconciliatore e' uno specchio: dice cosa cancellare, in che ordine, cosa
non cancellare mai e cosa riagganciare — e dice perche' accanto a ogni riga, nel
modulo e non in un documento di fase. Le tre eccezioni sono tre e sono nominate:
due si riagganciano, una non se ne va. E il controllo che difendeva l'idempotenza
ha cambiato domanda invece di cambiare risposta.**

## Performance

- **Duration:** ~78 min
- **Started:** 2026-08-20T18:05:00Z
- **Completed:** 2026-08-20T19:23:00Z
- **Tasks:** 3 / 3
- **Files:** 0 creati, 3 modificati
- **`reconcile.ts`:** 1.925 → 1.880 righe, ma **673 cancellate e 267 aggiunte**
  nel solo primo commit: la sottrazione e' reale e la prosa ne ha ripreso parte

## Task Commits

1. **Task 1: la sottrazione, e la nota storica che resta** — `9d4caf1` (refactor)
2. **Task 2: lo scope, l'ordine e le tre eccezioni** — `711796d` (feat)
3. **Task 3: il controllo E cambia domanda, il gate dei moduli si allinea** — `283f45e` (test)

---

## La cascata, enumerata leggendo i vincoli

Il piano lo chiede esplicitamente, e la regola del progetto e' che **una cascata
e' un percorso di scrittura che nessuno ha dichiarato**: va letta dai vincoli,
non ricordata.

Lettura: `grep -rn "REFERENCES public.production_" supabase/migrations/`. **Un
solo file** contiene riferimenti verso le tabelle specchiate, e sono **tre**:

| Da | A | `ON DELETE` | Riga | Conseguenza per lo specchio |
|---|---|---|---|---|
| `production_piece.plan_id` | `production_plan(id)` | **NO ACTION** (default) | `:345` | I pezzi vanno cancellati **prima** dei piani, o la FK blocca |
| `production_commitment.expanded_from` | `production_commitment(id)` | **NO ACTION** | `:523` | Auto-riferimento, verificato a fine istruzione: **un solo `DELETE`** |
| `production_checklist_item.plan_id` | `production_plan(id)` | **CASCADE** | `:661` | **L'unica cascata.** Cancellare un piano porta via le sue voci **e le loro spunte** |

**Nient'altro raggiunge le tabelle specchiate.** L'unico altro `ON DELETE
CASCADE` del file — `production_pipeline_rule.format_id` / `series_id` verso il
catalogo (`:948`, `:951`) — punta **verso l'esterno** e non e' raggiungibile da
una riga che questo codice puo' cancellare. E' registrato qui perche' in fase 48
la cancellazione di un formato ne ha portate via due in silenzio: e' lo stesso
tipo di percorso, su un'altra direzione.

`supabase/migrations/20260817120100_production_location.sql:544` porta un
`ON DELETE RESTRICT` verso `production_space`, che **non e' una tabella dello
specchio**.

**Nessuna cancellazione e' stata eseguita da questo piano.** Il modulo produce un
piano; la prima corsa vera e' il piano 58-11, sorvegliata.

---

## Accomplishments

### 1. Il centro tolto — e la ragione per cui c'era, rimasta scritta

Spariscono: i due vocabolari senza produttore, i tre tipi di correzione senza
istanze, il campo che ripuliva i timbri con i suoi sette siti d'uso, l'adozione a
mano delle proposte, i due timbri di assenza, e i due tipi di referto che li
portavano.

Ma il docblock che spiegava **perche' i due codici di assenza erano due** non e'
stato cancellato: e' stato **riscritto come nota storica nel modulo**. Dice cosa
distinguevano — *era in un export precedente* contro *era una proposta che le
regole non chiedono piu'* — perche' erano due, e perche' con uno specchio la
distinzione non ha piu' oggetto:

> **una voce che il file non porta non e' *assente*: non c'e'.**

C'e' un pezzo in piu' che il piano non chiedeva e che vale la pena avere: la nota
registra anche **cosa e' successo al membro che nominava un pericolo vero** —
un `source_uid` noto che arriva con un progressivo diverso. Non e' sparito con
gli altri: e' diventato `ICS-01b`, un **rifiuto dell'intera corsa** nello
scrittore (D-58-01), che e' una risposta piu' forte di una riga in un referto che
nessuno e' obbligato a leggere.

⚠ **Nessun identificatore rimosso compare piu' nel file, nemmeno nella prosa.**
I nomi dei due vocabolari e dei tre tipi sono descritti, non scritti: e' la stessa
disciplina che `vocabulary.ts` applica alla settima parola e
`actions.ts` al proprio letterale vietato — *un grep il cui unico match e' la
frase che vieta la cosa e' un grep che viene ignorato la terza volta che va
rosso*. Verificato:

```
/usr/bin/grep -cE "(DIVERGENCE_REASONS|ABSENCE_REASONS|PlanUpdate|PieceUpdate|CommitmentUpdate|claimNextProposal)"  →  0
/usr/bin/grep -c "clearsAbsence"                                                                                     →  0
/usr/bin/grep -c "absent_since"                                                                                      →  0
/usr/bin/grep -c "emitProposal"                                                                                      →  5
```

### 2. Le tre tabelle specchiate, nominate — e le due che non lo sono

`MIRRORED_TABLES` porta **tre** nomi, e il suo docblock dichiara per iscritto
perche' le altre due non ci sono:

- **`production_pipeline_rule` e' configurazione.** L'import la legge e non l'ha
  mai scritta. Ed e' la tabella le cui righe una cascata ha gia' portato via una
  volta, in fase 48.
- **`production_import_run` e' il registro**, l'unico strumento diagnostico che
  questo dominio possiede: confrontare le sue righe con l'ora dei 17 timbri falsi
  e' cio' che li ha datati. La sua `calendar_key` resta nullabile **per sempre**,
  perche' un registro che riempie la propria storia per sembrare completo ha
  cominciato a mentire sul passato che esiste per conservare.

`production_checklist_item` non e' in elenco per una **terza** ragione, anch'essa
scritta: non porta `calendar_key` propria, ed e' dentro lo scope **attraverso il
suo piano**.

Il `Pitfall 6` — la conta a sei — e' chiuso nel modulo **senza riscrivere la
frase sbagliata**: il numero non e' ripetuto, cosi' un grep per esso atterra sui
posti che restano da correggere (`import-production-calendar.mjs`, sei
occorrenze, perimetro del piano 58-09) e non sulla frase che li corregge.

### 3. L'ordine di cancellazione, con le tre ragioni, nel modulo

`MIRROR_DELETION_ORDER` non e' un elenco: e' un docblock lungo con quattro passi
e il vincolo che obbliga ciascuno.

1. **`production_checklist_item` per primo** — la sua FK e' l'**unica cascata**
   dello schema. Cancellarla esplicitamente rende il numero di spunte che si
   perdono **un numero che qualcuno ha contato**, invece di un effetto collaterale
   che nessuno ha visto. Al passo 3 la cascata non trova piu' niente da prendere.
   Scopato **attraverso i piani che lo stesso scope seleziona**, mai con una
   seconda condizione scritta a parte: due selettori sulle stesse righe e' il modo
   in cui uno dei due finisce piu' largo dell'altro.
2. **`production_piece` prima di `production_plan`** — `NO ACTION`, quindi
   cancellare un piano che ha ancora pezzi solleva una violazione.
3. **`production_plan`.**
4. **`production_commitment`, e in UN SOLO `DELETE`** — l'auto-riferimento
   `NO ACTION` si verifica **a fine istruzione**: un comando solo che porta via
   genitore e figli insieme passa, due comandi separati in ordine sbagliato no.

⚠ **Il passo 1 copre OGNI piano che la chiave seleziona, sopravvissuti inclusi.**
E' una decisione, ed e' scritta: la sottrazione di `ICS-03b` si applica al passo
3. Lasciare indietro le voci di una serata produrrebbe una checklist meta' di
questa corsa e meta' della precedente — uno stato che nessuno puo' leggere e che
nessun referto puo' spiegare. **Ed e' la ragione per cui le spunte si raccolgono
tutte**, non solo quelle dei piani in cancellazione.

### 4. La chiave di calendario e' l'unica condizione che seleziona

`calendarKey` entra in `ReconcileInput` come argomento **obbligatorio, senza
default** — perche' un default e' esattamente il passo che qualcuno prima o poi
salta, sull'argomento che decide cosa viene cancellato.

`DeletionScope` la porta come **la sola condizione dichiarata**, e il docblock
scrive il verso dell'errore: una condizione troppo larga cancella **di piu'**, e
questo progetto ha gia' pagato quella direzione — un selettore che risaliva una
pagina fino a corrispondere a ogni pulsante di cancellazione ha portato via due
eventi reali e, in cascata, 63 righe in sette tabelle, nessuna recuperabile. Una
condizione stretta che sbaglia **non trova nulla**.

Ogni riga inserita porta la chiave, **letta dallo scope** e non passata a parte:
la chiave con cui una riga e' scritta e quella con cui il prossimo specchio la
cancellera' sono **un valore**, non due che oggi concordano.

### 5. Le tre eccezioni, e perche' non sono la stessa cosa

| | Cosa fa la riga | Lista |
|---|---|---|
| **Sopravvivenza** (`ICS-03b`, D-58-02) | **non se ne va** | `plansThatSurviveDeletion` |
| **Stato 1** (`ICS-03`) | va via e **torna** | `ticksToRestore` |
| **Stato 2** (`ICS-03`) | va via e **torna** | `linksToRestore` |

Tutte e tre hanno un tipo proprio, un nome che le distingue, e un commento che
dichiara la differenza — perche' non dichiararla renderebbe la prima *la terza
eccezione non dichiarata che `ICS-03` esiste per vietare*.

Le due di stato sono chiavi su `source_uid` e non sul `uuid`, che e' **generato**
e non sopravvive alla cancellazione. Le spunte portano `ticked_at`, `ticked_by` e
`ticked_by_name` **originali**, con il divieto scritto di passare da
`record_checklist_tick`, che ri-registra l'autore a ogni chiamata:

> **Un ripristino non e' una spunta.**

Il campo che porta il nome della persona e' marcato dove sta: viaggia in memoria
e nella sua colonna, **mai in un referto, mai in un terminale, mai in un
artefatto tracciato**.

**Il confine di `ICS-03` e' scritto accanto alle due liste**, come il piano
chiede, e nella forma che lo rende un requisito e non una nota:

> Ogni stato umano che nascera' dopo — una nota, un'assegnazione, un allegato —
> **o entra in quella lista con una decisione scritta, oppure il primo import lo
> cancella e nessuno se ne accorge.** Il fallimento e' silenzioso per costruzione:
> uno specchio non puo' riferire cio' che non gli e' stato detto di conservare.
> Una colonna aggiunta a una delle tre tabelle ha esattamente due risposte
> accettabili — *il file la possiede*, o *entra in una lista di ripristino*. Non
> ce n'e' una terza, e *«decidiamo dopo»* si risolve nella prima, in silenzio,
> alla prossima corsa.

### 6. Il controllo E: meta' conservata, meta' cambiata

**Conservata**, e resta portante: *un primo passaggio che non pianifica niente
rende il secondo privo di significato*. E' un `eProblem` distinto, come il piano
pretende.

**Cambiata**: chiedeva *«il secondo piano e' vuoto»*, che sotto uno specchio non
e' solo falso — e' la domanda sbagliata, perche' lo specchio pianifica una
riscrittura completa ogni volta. Adesso confronta **insiemi di righe**, e le
cinque regole della riduzione sono scritte accanto al codice, sul modello di
`rls-baseline.mjs:84-107`:

1. **L'identificativo e' ESCLUSO.** Uno specchio da' a ogni riga un `uuid` nuovo
   per costruzione: confrontarli segnalerebbe una differenza su una corsa
   perfettamente idempotente — il verso che fa spegnere un controllo. E'
   **strutturale**, non ricordato: `id` non compare in nessuna delle quattro
   forme, quindi non c'e' modo di includerlo per sbaglio.
2. Gli altri campi entrano in un ordine dichiarato **per tabella**.
3. Ogni riga e' un **array JSON** — auto-delimitante, e `null` resta
   distinguibile dalla stringa `"null"`, che qui conta.
4. Ogni riga porta il **prefisso della sua tabella**.
5. Ordinamento per **codepoint**, mai `localeCompare`.

⚠ **Un messaggio di fallimento dice conteggi e nomi di tabella, mai le righe**:
una riga di impegno porta il titolo, una di piano la parola per uno spazio, e
questo output finisce in un terminale e in un documento.

Misura, sul file vero:

```
✓ E  first mirror 14 plans · 65 pieces · 47 commitment rows · 106 checklist items;
     a second mirror of the same file: the SAME set of rows
     232 rows compared field by field, identifiers excluded because a mirror gives
     every row a new one — and 0 plan row(s) survived the deletion, 0 tick(s) and
     0 link(s) put back
     deletion scope: one declared condition, in the order
     checklist_item → piece → plan → commitment
```

### 7. Il controllo I, e la sua prova per mutazione

`ICS-01` dice **nessun timbro di assenza**, e questa e' l'asserzione che lo tiene
vero dopo che il codice che li scriveva e' stato tolto. E' un controllo di
**sorgente** perche' non puo' essere altro: la colonna esiste ancora — cancellarla
sarebbe una porta a senso unico presa per ordine, e il primo specchio la lascia
vuota comunque — quindi **nessuna query distingue *nessuno la scrive* da *nessuno
l'ha ancora scritta***.

Le due grafie cercate sono **assemblate**, non scritte: nessuna delle due compare
intera nel gate (`/usr/bin/grep -c "absent_since" scripts/verify-ics-import.mjs`
→ `0`). I commenti sono strippati prima, con l'unico stripper del repo, per la
ragione del controllo H: un modulo puo' spiegare in prosa cio' che non deve fare.

**La prova per mutazione, con la mutazione verificata prima di leggerne l'esito:**

| # | Mutazione | `grep` di conferma | Esito del gate |
|---|---|---|---|
| 1 | `absent_since: null` reintrodotto in `reconcilePlans` | 1 occorrenza, riga 1170 | **✗ I**, `ICS_IMPORT_FAIL`, uscita **1** |
| 2 | `absentSince: null` al suo posto (grafia camelCase) | 1 occorrenza | **✗ I**, `ICS_IMPORT_FAIL`, uscita **1** |
| 3 | mutazione rimossa | 0 e 0 | **✓ I**, `ICS_IMPORT_OK`, uscita **0** |

Il messaggio rosso e' quello scritto: *«a mirror does not stamp: a row the file no
longer carries is not absent, it is not there»*.

⚠ **La riga del verdetto non dice piu' «all eight».** Contava a mano, e questo
piano aggiunge un controllo: adesso legge `passedChecks.length`. E' il difetto che
questa fase ha gia' riparato una volta, nel gate dei vocabolari (58-07, deviazione 1).

### 8. Il gate dei moduli, allineato nello stesso commit

Il piano chiede l'allineamento perche' i moduli **non entrano nel bundle**: un
`import()` costruito a runtime e' invisibile a `npm run build`, a
`verify:conversion` e a qualunque grep, quindi un simbolo sparito resta verde
fino alla prossima esecuzione dell'import.

Due cose erano indietro, e nessuna delle due l'ha scoperta questo piano
cancellando un export — le ha scoperte guardando il gate:

- **`anchors` mancava da `MODULI`.** Sul disco e importato dal barrel, ma il
  controllo **A** non lo difendeva: la sua assenza sarebbe uscita come *«il barrel
  non si importa»*, che e' la diagnosi sbagliata per un file cancellato. **Sei →
  sette**, e il conteggio si legge da `MODULI.length`.
- **L'elenco dei simboli leggeva UN consumatore su tre.** `verify-ics-import.mjs`
  e `verify-ics-grammar.mjs` caricano lo stesso barrel con lo stesso `import()`
  costruito a runtime: **undici nomi erano scoperti**, ed e' il reperto B-2
  dell'audit v1.5 per intero. **Otto → venti**, presi con lo stesso `grep` che il
  docblock registra, esteso ai tre file.

⚠ **Nessun nome che nessuno chiama.** `MIRROR_DELETION_ORDER` e `MIRRORED_TABLES`
sono nati qui e **non** sono in elenco: li consumera' lo scrittore del piano
58-09, e aggiungerli prima sarebbe rifare l'errore che il docblock di quel file
gia' registra (tre nomi inventati, due inesistenti).

**Provato per mutazione:** rinominando `attachNumberlessPieces` →
`attachNumberlessPiecesXX`, `npm run build` resta **verde** e il gate va **rosso**
(`✗ C`, uscita 1). E' precisamente la proprieta' per cui il gate esiste. Mutazione
rimossa e riverificata.

---

## Deviations from Plan

### 1. [Rule 2 — funzionalita' critica mancante] `ExistingSnapshot` da quattro liste a due

- **Trovato durante:** Task 1
- **Problema:** rimossi gli aggiornamenti, l'adozione delle proposte e i timbri,
  `existing.pieces` e `existing.commitments` non hanno piu' **nessun lettore**.
  Il piano non le elencava fra le rimozioni, ma lasciarle significa chiedere al
  chiamante di leggere due tabelle che il modulo non consulta — un costo pagato
  per niente, e peggio: **una forma che lascia credere che questo modulo confronti
  ancora**.
- **Cosa e' stato fatto:** `ExistingSnapshot` porta `plans` e `checklistItems`, con
  scritto accanto perche' ciascuna resta (la sopravvivenza, il riaggancio del
  legame e `ICS-01b` per la prima; le spunte per la seconda). `ExistingPieceRow` e
  `ExistingCommitmentRow` rimossi.
- **Committed in:** `9d4caf1`

### 2. [Rule 2] `SubjectTable` rimosso

- **Trovato durante:** Task 1
- **Problema:** i suoi unici lettori erano i due tipi di referto rimossi, e
  `MIRRORED_TABLES` nomina lo stesso insieme di tre tabelle. Due grafie dello
  stesso insieme sono la coppia che diverge.
- **Committed in:** `9d4caf1`

### 3. [Rule 2] Il controllo I e' un controllo nuovo, non un'asserzione dentro uno esistente

- **Trovato durante:** Task 3
- **Problema:** il piano dice *«aggiungerlo come asserzione dentro
  `verify-ics-import.mjs`»*. Infilarlo nel controllo **H** — che asserisce che il
  lettore non raggiunge la tabella delle serate annunciate — avrebbe fatto
  rispondere a una lettera **due domande scollegate**: un rosso non avrebbe piu'
  detto quale delle due.
- **Cosa e' stato fatto:** lettera propria, **I**, e la riga del verdetto conta
  dalla struttura invece di portare il numero a mano.
- **Committed in:** `283f45e`

### 4. [Rule 1 — difetto] Il gate dei moduli difendeva sei file su sette e otto simboli su venti

- **Trovato durante:** Task 3
- **Perche' non e' scope creep:** il piano chiede espressamente di allineare
  quel gate *nello stesso commit*, e la ragione che da' — un simbolo sparito
  resta invisibile al build — vale identica per gli undici nomi che i due gate
  chiamano e nessuno difendeva.
- **Committed in:** `283f45e`

### 5. [Rule 1 — difetto introdotto e riparato] Il controllo F e' andato rosso sull'output nuovo di E

- **Trovato durante:** Task 3
- **Problema:** la riga nuova stampava i quattro nomi di tabella per esteso, e la
  parola che i quattro condividono **compare dentro un titolo del calendario
  vero**. Il controllo F ha segnalato **1 token di un titolo** nell'output della
  corsa — correttamente, e senza stamparlo.
- **Cosa e' stato fatto:** i nomi si stampano senza il prefisso condiviso
  (`checklist_item → piece → plan → commitment`), anche nel ramo di fallimento.
  E' la stessa disciplina che il controllo H gia' dichiara sulla directory che si
  rifiuta di nominare. Il perche' e' scritto nel codice, **misurato e non temuto**.
- **Committed in:** `283f45e`

### 6. [Rule 3 — condizione d'ambiente] `node_modules` e `docs/` collegati e rimossi

Il worktree non ha ne' l'uno ne' l'altro. `node_modules` collegato con un symlink
al checkout principale; per `docs/` e' stata creata una **directory vera**
contenente due symlink ai soli file `.ics` — perche' un symlink **chiamato**
`docs` non sarebbe ignorato, dato che `docs/` con la barra finale corrisponde solo
a una directory vera (trappola registrata dal piano 58-06 ed evitata alla fonte).
`git status` verificato subito dopo la creazione e alla fine: **pulito in ogni
momento**, ed entrambi rimossi prima della chiusura.

**Total deviations:** 6 — due rimozioni di superficie morta, una scelta di forma
sul gate, un difetto preesistente riparato, un difetto introdotto e riparato, una
condizione d'ambiente.
**Impact on plan:** nessuno scope creep. Nessun file fuori dai tre che il piano
elenca, piu' questo SUMMARY. **Nessun pacchetto installato** (`T-58-08-SC`
rispettato: `package.json` immutato).

---

## ⚠ Una conseguenza dichiarata che il proprietario deve vedere

`ICS-03b` dice che una riga di piano con un legame **non entra mai nella lista di
cancellazione, qualunque cosa dica il file**. Il piano lo scrive alla lettera, e
il codice lo esegue alla lettera.

**Ne segue una cosa che il piano non nomina, e che e' meglio leggere qui che
scoprire dopo:** `production_plan_source_uid_unique` e' un vincolo `UNIQUE` sulla
colonna (`20260815120000_production_calendar.sql:279`). Una riga che **resta** e
viene **riscritta** e' una violazione di vincolo che fa fallire l'intera corsa.
Quindi una riga sopravvissuta viene anche **saltata dagli inserimenti** — e la
conseguenza e':

> **un piano dietro una serata pubblicata smette di specchiare il file.** Una data
> spostata nel calendario sotto una serata annunciata non raggiunge piu' quella
> riga.

Restringe **D-44-07**, che segnalava lo spostamento e specchiava comunque. La
ragione della restrizione e' scritta nel modulo: specchiarlo adesso vorrebbe dire
cancellare e riscrivere **l'unica riga la cui sparizione orfana una serata che
puo' avere biglietti in vendita**, attraverso un intervallo che non ha una
transazione dentro.

**Misurato oggi il caso e' vuoto** — 2 piani, **0 legati** (58-07, catalogo alle
16:00:49Z), e il gate lo conferma: `0 plan row(s) survived the deletion`. Quindi
oggi non cambia niente per nessuno. Ma cambiera' il giorno della prima serata
annunciata, e la decisione va **vista** prima di allora, non trovata dopo.

Le due liste di riaggancio raccolgono lo stato **di tutte** le righe, comprese le
sopravvissute, proprio perche' quel giorno la scelta possa essere ristretta senza
lasciare cadere un legame in silenzio.

---

## Il registro delle minacce, verificato

| Threat ID | Come e' stato verificato |
|---|---|
| **T-58-08-01** — manomissione / DoS sui dati via scope | La chiave e' **l'unica condizione dichiarata** di `DeletionScope`, non un filtro applicativo su identificativi calcolati qui; arriva come argomento obbligatorio senza default; il verso dell'errore e' scritto accanto al tipo. **Nessuna cancellazione eseguita da questo piano.** |
| **T-58-08-02** — manomissione via cascata | La cascata e' **enumerata leggendo i vincoli** (tabella sopra, tre FK, un solo file) e scritta nel modulo; la checklist e' il primo passo, esplicito, cosi' che il conteggio di cio' che si perde sia prendibile |
| **T-58-08-03** — ripudio del ripristino delle spunte | `ChecklistTickRestore` porta `tickedAt`, `tickedBy`, `tickedByName` **originali**, con il divieto scritto di passare da `record_checklist_tick`. Nessun percorso di questo modulo chiama alcuna funzione: non ha client |
| **T-58-08-04** — serata pubblicata orfanata | `plansThatSurviveDeletion` esiste come campo proprio, il commento distingue sopravvivere da riagganciarsi, e il gate lo **conta** nella riga verde |
| **T-58-08-05** — ripudio del registro degli import | `MIRRORED_TABLES` nomina **tre** tabelle e dichiara per iscritto che `production_import_run` e `production_pipeline_rule` non lo sono, con la ragione di ciascuna |
| **T-58-08-SC** — catena di fornitura | **Nessun pacchetto installato**, `package.json` immutato |

## Threat Flags

Nessuna nuova superficie di sicurezza. Il modulo non apre connessioni, non prende
client, non fa chiamate di rete e non ha orologio; i due gate leggono sorgenti e
un file gitignorato. Nessun endpoint, nessun percorso di autenticazione, nessuna
policy, nessun `GRANT`.

Questo documento non porta un solo `ics_alias`, `source_uid`, titolo, nome
proprio, data di serata o nome di spazio: solo conteggi, nomi di tabella, nomi di
vincolo e i nomi dei tipi introdotti.

## Known Stubs

**Uno, dichiarato, e non e' un difetto di questo piano.**

`scripts/import-production-calendar.mjs` consuma ancora la forma vecchia del
piano — `plansToUpdate`, `absences`, `divergences`, `seen` — e con questi tre
commit non gira piu'. **E' lo stato intermedio previsto dall'ordine delle onde:**
il piano **58-09** (onda 5) dichiara `depends_on: ["58-05", "58-07", "58-08"]` e
riscrive quello script per intero, con `files_modified` che lo elenca per primo.

Il rischio e' limitato e misurabile: quello script **non e' mai stato eseguito in
produzione** (dichiarato in `verify-ics-reachable.mjs`), non ha alcun percorso
d'esecuzione dal prodotto — non c'e' superficie di upload, per decisione D-44-26 —
e nessun `--apply` e' stato lanciato da questo piano.

Nessun valore vuoto cablato, nessun testo segnaposto, nessun componente senza
sorgente dati: questo piano non tocca alcuna superficie.

## Il gate della verifica, in un repo senza test

**Non esiste un test runner per il prodotto**, quindi niente qui e' «verificato
perche' i test passano». Cio' che e' stato eseguito:

| Comando | Esito | Nota |
|---|---|---|
| `npm run build` | **0** | include il typecheck di Next |
| `npm run verify:ics` | **0** | **nove** controlli su nove, sul file vero |
| `npm run verify:ics-reachable` | **0** | 7 moduli, 42 simboli esposti, 20 su 20 attesi |
| `npm run verify:ics-grammar` | — | non toccato da questo piano |
| `npm run verify` | **1** | **identico alla linea di base** — vedi sotto |

**`npm run verify`, prima e dopo, per confronto e non per pretesa di verde:**

| | prima (base `a6eef50`) | dopo (`283f45e`) |
|---|---|---|
| uscita | **1** | **1** |
| falliti | `verify:touch-targets` | `verify:touch-targets` |
| rifiutati | `verify:capabilities`, `verify:section-export` | idem |

`verify:touch-targets` e' rosso su
`src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx` **dal commit di base
della fase 58** — due `<button>` senza altezza incondizionata. **Fuori
perimetro**, non riparato, e il gate stesso vieta di ripararlo allargando
un'esenzione.

I due rifiuti sono la condizione onesta di un worktree: `.env.local` e'
gitignorato e vive nel checkout principale. **Nessuna credenziale e' stata copiata
qui**, e nessuna lettura del database e' stata fatta da questo piano — non ce n'era
bisogno: il codice si prova sui gate sintetici, e la prima corsa vera e' il piano
58-11.

## Self-Check: PASSED

File dichiarati modificati, verificati nel diff dei tre commit:

- `src/lib/production/ics/reconcile.ts` — FOUND
- `scripts/verify-ics-import.mjs` — FOUND
- `scripts/verify-ics-reachable.mjs` — FOUND

Nessun file dichiarato creato, oltre a questo SUMMARY.

Commit dichiarati, verificati in `git log`:

- `9d4caf1` — FOUND
- `711796d` — FOUND
- `283f45e` — FOUND

Nessuna cancellazione di file in alcuno dei tre commit
(`git diff --diff-filter=D` vuoto su tutti). `git status` pulito alla chiusura,
con i due symlink d'ambiente rimossi.

Asserzioni dichiarate, rieseguite:

```
/usr/bin/grep -c  "clearsAbsence"        src/lib/production/ics/reconcile.ts   →  0
/usr/bin/grep -cE "(DIVERGENCE_REASONS|ABSENCE_REASONS|PlanUpdate|PieceUpdate|CommitmentUpdate|claimNextProposal)"
                                          src/lib/production/ics/reconcile.ts   →  0
/usr/bin/grep -c  "absent_since"         src/lib/production/ics/reconcile.ts   →  0
/usr/bin/grep -c  "emitProposal"         src/lib/production/ics/reconcile.ts   →  5
/usr/bin/grep -c  "isEmptyPlan(secondPass)"  scripts/verify-ics-import.mjs      →  0
/usr/bin/grep -c  "absent_since"             scripts/verify-ics-import.mjs      →  0
```

⚠ **Nota per chi rieseguira' questi comandi:** `reconcile.ts` contiene **byte
NUL**, e sono **preesistenti** — non introdotti qui. Sono i separatori di chiave
nei letterali di `checklistKey` e `groupKey`: un NUL non puo' comparire in
un'etichetta, quindi e' un separatore che nessun valore puo' falsificare.

Conteggio misurato, non ricordato: **quattro** in `a6eef50`, **tre** adesso. Il
quarto e' uscito con `occurrenceKey`, la funzione che componeva la chiave
`(source_uid, giorno)` con cui il vecchio riconciliatore cercava un impegno gia'
memorizzato — e che uno specchio non cerca piu'.

Sono la ragione per cui i comandi sopra usano `/usr/bin/grep` e non `grep` nudo:
un grep che tratta il file come binario salta il conteggio **in silenzio**. Il
piano lo prescrive gia'; questa nota dice **perche'**.
