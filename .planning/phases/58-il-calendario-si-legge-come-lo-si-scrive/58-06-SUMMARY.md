---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
plan: 06
subsystem: production-calendar
tags: [ics, vocabolario, migration, check-constraint, orfano, aggancio, gate, catalogo-vivo]

# Dependency graph
requires:
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-01 — verify-ics-grammar.mjs, i tre casi T1/T2/F1 scritti prima del codice che li soddisfa"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-02 — M4, i dodici nomi di vincolo CHECK letti da pg_constraint"
  - phase: 58-il-calendario-si-legge-come-lo-si-scrive
    provides: "58-03 — la quarta lettura, la seconda passata, e il gate dentro l'aggregato"
  - phase: 44-il-calendario-di-produzione
    provides: "PIECE_KINDS, INCLUSION_RULE, conformsToRule, i due CHECK che specchiano il vocabolario"
provides:
  - "flyering — il settimo tipo di pezzo, in cinque posti e in un commit, applicato in produzione"
  - "readBareKind — un titolo che e' SOLO una parola di pezzo entra come pezzo, non come giorno occupato"
  - "ClassifiedPiece.seriesCode nullable: cio' che il titolo non porta, il pezzo non porta"
  - "La seconda passata cerca fra le notti di TUTTE le serie che possiedono una regola del tipo, quando il pezzo non ne nomina una"
  - "seriesOfPlanKey — l'inverso di joinKey, l'unico lettore della forma di una chiave, per il solo verdetto conforms_to_rule"
  - "Due righe nuove di INCLUSION_RULE, una per decisione, dove il controllo B le legge"
  - "MIGRATIONS di verify-ics-import.mjs documentata e append-only"
affects: [58-07, 58-09, 58-11, 58-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Un vocabolario si allarga in cinque posti e in un commit, o smette di essere uno specchio"
    - "Nessuna regola non e' un rifiuto: e' un orfano, e l'orfano si dichiara invece di essere lasciato a false"
    - "Un valore derivato si calcola dove serve e non si scrive accanto a quello letto: due copie divergono alla prima correzione"
    - "La rimisura si fa sul materiale vero anche quando il risultato e' che non cambia niente — e' quello il referto"

key-files:
  created:
    - supabase/migrations/20260820120000_production_piece_flyering.sql
    - .planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/deferred-items.md
  modified:
    - src/lib/production/ics/vocabulary.ts
    - src/lib/production/ics/classify.ts
    - src/lib/production/ics/reconcile.ts
    - src/types/database.ts
    - scripts/verify-ics-import.mjs

key-decisions:
  - "flyering entra senza regola di ancora, e conforms_to_rule per quel tipo e' null, mai false — dichiarato in cinque posti"
  - "Nessuna riga di production_pipeline_rule nasce per il volantinaggio: l'assenza e' la decisione, non un'omissione"
  - "Il claim (b) di vocabulary.ts si riscrive a sette e la chiusura resta su UN'ALTRA parola, che non si scrive"
  - "SEVENTH_KIND_WORD resta immutato: il numero nel nome e' ora sfasato di uno, e rinominarlo e' un posto in piu' dove un refactor puo' spegnere il controllo"
  - "seriesCode non si riempie MAI dall'aggancio: la serie derivata si calcola dove serve e non si affianca a quella letta"
  - "La verifica dell'applicazione e' la lettura del catalogo vivo, non npm run build — e la vista information_schema non serve, perche' per quel ruolo e' vuota"

requirements-completed: [ICS-08, ICS-08b]

# Metrics
duration: 25min
completed: 2026-08-20
---

# Fase 58 Piano 06: Le due parole — Summary

**Il gate sintetico passa da `MISSED 3 · GUESSED 0` a `MISSED 0 · GUESSED 0` su
diciotto casi; il settimo tipo di pezzo esiste nei due `CHECK` di produzione,
letti dal catalogo dopo l'applicazione; e la rimisura del controllo B sul file
vero — che il piano precedente aveva dichiarato dovuta e impossibile da qui — e'
stata fatta, con il risultato che i numeri d'oro non si muovono di uno.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-20T15:33:00Z
- **Completed:** 2026-08-20T15:47:00Z
- **Tasks:** 3 / 3
- **Files:** 2 creati, 5 modificati

## Task Commits

1. **Task 1: Il settimo valore — cinque posti, un commit** — `a0bc14c` (feat)
2. **Task 2: Le due letture — Timetable nudo e Flyering** — `ab94890` (feat)
3. **Task 3: Applicare la migration e leggerla dal catalogo** — nessun file
   cambiato: il file era gia' nel commit del task 1, e cio' che questo task
   produce e' **uno stato del database piu' un referto**, che sta qui sotto

## Il referto del gate sintetico, prima e dopo

`node scripts/verify-ics-grammar.mjs`, stessa esecuzione, stessi 18 casi.

| id | req | atteso | prima (58-03) | dopo |
|---|---|---|---|---|
| C1–C5 | controprova | — | **ok** ×5 | **ok** ×5 |
| G1–G5 | ICS-04 | — | **ok** ×5 | **ok** ×5 |
| A1–A5 | ICS-05 | — | **ok** ×5 | **ok** ×5 |
| T1 | ICS-08 | `attach:RSNT#4` | MISSED | **ok** |
| T2 | ICS-08 | `unclassified:no_candidate_edition` | MISSED | **ok** |
| F1 | ICS-08b | `piece:flyering` (RSNT) | MISSED | **ok** |

**`MISSED 3 · GUESSED 0` → `MISSED 0 · GUESSED 0`.** I tredici casi che erano
gia' verdi lo sono nella stessa esecuzione: la riparazione non ha rotto niente di
cio' che funzionava. E **i GUESSED restano zero**, che e' il numero che conta —
il lettore continua a sbagliare solo per difetto e non ha imparato ad attribuire
una serie, un progressivo o una serata che un titolo non porta.

---

## ⚠ Il fatto che corregge il ritrovamento della ricerca

**`58-RESEARCH.md` § ICS-08 scrive: *«Sette timetable della notte e sette voci di
volantinaggio nostre risultano oggi giorni occupati da qualcun altro»*. Rimisurato
il 2026-08-20 sul materiale vero, non e' cosi'.**

Lo stesso paragrafo dichiara il proprio metodo — *«Eseguito in sessione contro
`classifyEntry`»* — e quel metodo misura **cosa il lettore restituisce per due
titoli costruiti**, non **cosa il file contiene**. La frase sui quattordici pezzi
e' l'estrapolazione che ne e' seguita, ed e' l'unica parte che il materiale
smentisce.

Misurato su **entrambe** le istantanee `.ics` presenti sulla macchina del
proprietario, con il lettore del prodotto e la stessa mappa alias del controllo B:

| forma | occorrenze |
|---|---|
| titolo esattamente `Timetable`, nudo | **0** su entrambe |
| titolo che porta la parola del volantinaggio | **0** su entrambe |
| pezzi `timetable` letti dalla grammatica canonica, con sigla e progressivo | 7 |
| pezzi canonici con serie e **senza** numero | **0** |

Tutte e sei le righe `SUMMARY:` che cominciano con quella parola proseguono con
` - R…`, cioe' con una sigla: sono pezzi canonici, e il controllo **D** li conta
gia' come tali — *«timetable 7/7 on the night itself»*.

**Conseguenze, e nessuna di esse annulla il piano:**

1. **Le due decisioni restano valide e sono state prese.** `ICS-08` chiedeva *«una
   decisione dichiarata»*, non *«una riparazione di quattordici righe»*, e la
   decisione e' ora scritta dove il controllo B la legge.
2. **Cambia cosa il codice compra.** Non «sette timetable smettono di essere
   giorni occupati»: **la prima che verra' scritta nuda sara' letta invece di
   sparire.** La lettura e' difensiva, ed e' descritta cosi' nel codice
   (`classify.ts`, docblock di `readBareKind`, sezione *"a shape the reader
   admits, not a shape the file carries"*).
3. **Spiega perche' i numeri d'oro del controllo B non si muovono** — vedi la
   sezione seguente. Se il file avesse contenuto quelle quattordici voci, `class
   D` sarebbe calata di quattordici e `class A` cresciuta di altrettanto.

Il ritrovamento **non e' stato cancellato dalla ricerca**: `58-RESEARCH.md` e' un
documento della fase e si corregge in avanti, come una migration. Questa sezione
e' la correzione, con la data e il metodo.

---

## ⚠ `npm run verify:ics` — atteso rosso, misurato verde, e la rimisura fatta

Le note d'onda ereditate dicevano: *«`verify:ics`, il controllo B, e' ATTESO
ROSSO da qui in avanti, e chiuderlo e' compito tuo … i numeri d'oro non
descrivono piu' il lettore»*. Il piano 58-03 lo aveva dichiarato in buona fede e
**senza poterlo verificare**, perche' nel suo worktree il materiale non c'era e
il gate rifiutava (uscita 2).

**Il materiale e' su questa macchina.** E' stato reso leggibile dal worktree
creando `docs/` — che `.gitignore:67` ignora come directory — e collegandovi
l'istantanea con un symlink. **Nessun file di produzione e' entrato nel repo**:
`git status` non mostra nulla in nessun momento, e la directory e' stata rimossa
alla fine. E' la stessa disciplina con cui 58-03 ha collegato `node_modules`.

Misurato sul **commit di base** `d70d5de`, prima di toccare una riga:

```
ICS_IMPORT_OK — all eight checks passed.
✓ B  class A 56 · class B 3 · class C 14 · class D 19 (16 commitments + 3 recorded, never guessed) · total 92
```

**Il controllo B era gia' verde, e i numeri d'oro descrivevano ancora il
lettore.** La ragione e' quella della sezione precedente: `ICS-04` ha aggiunto
una lettura che sul file misurato **non trova nulla** — zero pezzi canonici con
serie e senza numero — quindi non ha spostato nessuna voce da `unclassified` a
`canonicalPieces`, e i numeri non avevano motivo di muoversi.

Rimisurato **dopo** i due commit di questo piano, stesso file, stessa mappa
alias:

| | base `d70d5de` | dopo `ab94890` |
|---|---|---|
| A — contenitore | ✓ | ✓ |
| **B — classificazione** | ✓ 56 · 3 · 14 · 19 | ✓ **56 · 3 · 14 · 19** |
| C — controprove | ✓ | ✓ |
| D — ancore | ✓ | ✓ |
| E — piano di scrittura | ✓ 14 piani · 65 pezzi · 106 voci | ✓ **identico** |
| F — nessuna fuga nel referto | ✓ | ✓ |
| G — specchio TS ↔ SQL | ✓ 21 membri | ✓ **22 membri, 11 `CHECK` da 3 migration** |
| H — nessun riferimento vietato | ✓ | ✓ |

**Nessun numero d'oro e' stato toccato**, e questo e' il referto: la rimisura era
dovuta, e' stata fatta sul file vero, e ha detto che i numeri stavano gia' bene.
Un numero cambiato per far passare un gate sarebbe il difetto che il gate esiste
per trovare; un numero **non** cambiato dopo averlo rimisurato e' l'unica prova
che nessuno l'ha ritoccato.

## `npm run verify` — prima e dopo, per confronto e non per pretesa di verde

| | prima (58-03, `c85da1f`) | dopo (`ab94890`) |
|---|---|---|
| uscita | **1** | **1** |
| falliti | `verify:touch-targets`, **`verify:ics-grammar`** | `verify:touch-targets` |
| rifiutati | `verify:capabilities`, `verify:section-export` | idem |

**Il debito che il piano 58-03 aveva dichiarato e' chiuso:** `verify:ics-grammar`
era entrato nell'aggregato **rosso**, con scritto accanto quali tre casi e quale
piano li avrebbe chiusi. Sono chiusi, e la voce e' verde.

`verify:touch-targets` e' rosso su
`src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx` dal commit di base
della fase 58. **Fuori perimetro:** non e' stato riparato, e il gate stesso vieta
di ripararlo allargando un'esenzione.

I due rifiuti sono la condizione onesta di un worktree: `.env.local` e'
gitignorato e vive nel checkout principale. **Nessuna credenziale e' stata
copiata qui** — il task 3 ha letto quel file dal suo percorso originale senza
duplicarlo.

---

## Il referto del catalogo vivo (task 3)

**Versione assegnata dall'endpoint migrations: `20260820154547`**, nome
`20260820120000_production_piece_flyering`. Applicata alle 2026-08-20T15:45:46Z
via `POST /v1/projects/{ref}/database/migrations` — **l'endpoint migrations, non
`/database/query`**, cosi' la history del progetto resta veritiera. E' la
cinquantesima voce della history. Precedente d'uso in repo:
`scripts/lab-bootstrap.mjs:110`.

### I due vincoli, letti da `pg_get_constraintdef`

**Prima**, 15:44:51Z:

```
production_piece_kind_check
  CHECK ((kind = ANY (ARRAY['listing','tonight','recap','livecut','timetable','after_movie'])))
production_pipeline_rule_kind_check
  CHECK ((piece_kind = ANY (ARRAY['listing','tonight','recap','livecut','timetable','after_movie'])))
```

**Dopo**, 15:45:51Z:

```
production_piece_kind_check
  CHECK ((kind = ANY (ARRAY['listing','tonight','recap','livecut','timetable','after_movie','flyering'])))
production_pipeline_rule_kind_check
  CHECK ((piece_kind = ANY (ARRAY['listing','tonight','recap','livecut','timetable','after_movie','flyering'])))
```

Sette valori su entrambi, e **i nomi sono quelli letti da `pg_constraint` in
M4** — non dedotti. La verifica che fossero giusti e' arrivata dal fatto che il
`DROP CONSTRAINT IF EXISTS` ha davvero rimosso qualcosa: se il nome fosse stato
sbagliato, il drop sarebbe stato un no-op silenzioso e l'`ADD` avrebbe fallito
per duplicato dentro la transazione, lasciando il database intatto.

### Nessun vincolo scomparso nel passaggio

| tabella | `CHECK` prima | `CHECK` dopo |
|---|---|---|
| `production_piece` | 6 | **6** |
| `production_pipeline_rule` | 6 | **6** |

I dodici nomi sono gli stessi dodici di M4, uno per uno, prima e dopo.

> ⚠ **La sorgente e' `pg_constraint`, non `information_schema.table_constraints`
> come il piano prescriveva.** Quella vista, interrogata con lo stesso ruolo,
> restituisce **zero righe**: filtra per privilegio, e il ruolo dell'endpoint non
> li ha. Un controllo scritto su di essa passerebbe **sempre**, misurando il
> vuoto — un falso verde per costruzione. La sostituzione e' dichiarata qui
> invece di essere fatta in silenzio, ed e' registrata in `deferred-items.md`.

### Nessuna riga mossa

| tabella | righe prima | righe dopo |
|---|---|---|
| `production_plan` | 2 | **2** |
| `production_piece` | 63 | **63** |
| `production_commitment` | 85 | **85** |
| `production_checklist_item` | 14 | **14** |
| `production_pipeline_rule` | 14 | **14** |

E la distribuzione di `production_piece.kind` e' identica prima e dopo, valore per
valore: **zero righe portano il settimo valore**, che e' lo stato atteso — la
migration allarga cio' che si **puo'** memorizzare e non memorizza niente.

Tutte le letture con `read_only: true`. **Nessuna riga di produzione e' stata
cancellata o modificata da questo task.**

### Il controllo G, rosso prima e verde dopo

| ora | stato | cosa diceva |
|---|---|---|
| **15:37:32Z** | ✗ **FAILED** | *«PIECE_KINDS declares a member no CHECK constraint accepts»* — `flyering` era nel TypeScript e in nessun `CHECK` |
| **15:38:24Z** | ✓ **passed** | 22 membri, 11 vocabolari `CHECK` letti da **3** migration |
| **15:46:14Z** | ✓ **passed** | identico, dopo l'applicazione |

> ⚠ **E qui va detta una cosa che il piano dava per scontata, e non lo e'.** Il
> controllo **G legge i file di migration su disco, non il database.** Non puo'
> distinguere una migration scritta da una applicata, quindi il suo verde delle
> 15:38 non prova che il valore esista in produzione — prova soltanto che il
> TypeScript e l'SQL **scritto** concordano.
>
> Il rosso→verde del task 1 e' quindi il rosso→verde che conta per G, e il suo
> verde delle 15:46 e' una conferma di stabilita', non una seconda prova. **La
> prova dell'applicazione e' la lettura del catalogo qui sopra**, ed e' esattamente
> per questo che il piano prescriveva la lettura invece del build. La stessa
> ragione vale una volta di piu': `npm run build` passerebbe anche con la
> migration mai applicata, perche' i tipi vengono da `src/types/database.ts`, che
> in questo progetto si edita a mano.

---

## Accomplishments

### 1. Il settimo tipo, in cinque posti e in un commit

`vocabulary.ts` claim (a) dice che modificare uno dei due insiemi di letterali
significa modificarli **entrambi, nello stesso commit**. Il commit `a0bc14c` lo
esegue alla lettera: la migration con i due `CHECK`, `PIECE_KINDS`,
`PIECE_KIND_LABELS`, i due tipi in `database.ts` e la registrazione nella lista
`MIGRATIONS` del gate stanno tutti li'.

**La migration.** Una transazione, due coppie `DROP CONSTRAINT IF EXISTS` /
`ADD CONSTRAINT`, sui due nomi di M4. L'intestazione porta i tre argomenti che il
prossimo lettore cerchera':

- **perche' le due istruzioni sono una cosa sola** — un database in cui il pezzo
  si puo' memorizzare e la regola non si puo' scrivere e' un vocabolario che ha
  gia' cominciato a divergere dallo specchio che lo sorveglia;
- **perche' `NOT VALID` non serve** — allargare un `IN` e' un rilassamento
  stretto: ogni valore ammesso prima e' ammesso dopo, quindi la scansione di
  validazione non puo' fallire, e il vincolo entra VALIDATO. Scriverlo per
  prudenza sarebbe copiare una decisione che appartiene a un vincolo diverso
  (`staff_role.sql:52-64`);
- **perche' i nomi si leggono e non si deducono** — un nome dedotto sbagliato
  produce un no-op silenzioso seguito da un errore di duplicato.

⚠ **`production_piece_naming_check` non e' stato toccato**, come il piano
prescrive: la lettura nuda del task 2 registra `canonical`, e nessun terzo
`naming_convention` si apre.

### 2. Il claim (b) riscritto, e la parola che resta non scritta

Il claim diceva *«`PIECE_KINDS` has six members and it is closed»*. Ora dice
**sette**, e dice che **la chiusura non era mai stata sul numero: era su una
parola**. Quella parola non e' `flyering`, non e' scritta da nessuna parte in
quella directory, e continua a non esserlo:

```
/usr/bin/grep -c "podcast" src/lib/production/ics/{vocabulary,classify,reconcile}.ts
  → 0 · 0 · 0
```

`SEVENTH_KIND_WORD` in `scripts/verify-ics-import.mjs:308` e' **immutato** — il
diff del task 1 su quel file non contiene la stringa. Il numero dentro quel nome
e' ora sfasato di uno, e il claim (b) lo dice per esteso invece di rinumerarlo: e'
una costante il cui solo mestiere e' essere cercata in un calendario fuori dal
repo, il numero nel nome non e' cio' che rende corretta quella ricerca, e una
rinomina e' un posto in piu' dove un refactor puo' spegnere il controllo in
silenzio.

⚠ **Due numeri diversi su due cose diverse**, ed e' scritto accanto alla riga che
li tiene separati (`verify-ics-import.mjs`, controllo B): uno conta **i tipi che
il vocabolario dichiara** — sette da oggi — l'altro conta **le voci che portano la
parola del tipo che ancora non esiste** — zero, e deve restare zero. Muovere uno
non e' una ragione per muovere l'altro.

### 3. Il `Timetable` nudo — `readBareKind`

Un titolo che e' **soltanto** una parola di pezzo entra come pezzo di quel tipo,
**senza serie e senza numero**, e la seconda passata lo aggancia per data.

`ClassifiedPiece.seriesCode` diventa `string | null`, e il null e' un deliverable
esattamente come quello di `number`: cio' che il titolo non porta, il pezzo non
porta. **E non si riempie mai dall'aggancio** — la notte trovata porta la serie a
un join di distanza, e una copia scritta accanto a quella letta e' la coppia che
diverge alla prima correzione di una serata.

`piece()` resta l'**unico** posto che compone una chiave, e ora non puo'
raggiungerla senza **entrambi** i pezzi: `"<SERIE>-undefined"` continua a non
essere un valore che questo modulo sappia produrre.

L'ordine e' sicuro: `readBareKind` e' provato **quarto**, dopo le tre grammatiche.
Non puo' rubare una voce a nessuna di esse — un pezzo canonico o legacy porta il
separatore, una notte porta un numero in coda, e un titolo che e' esattamente
un'etichetta non ha ne' l'uno ne' l'altro.

### 4. La seconda passata, per un pezzo che non nomina una serie

Dove il pezzo non nomina una serie, le candidate sono le notti di **ogni** serie
la cui pipeline dichiara una regola per quel tipo. **I tre esiti non cambiano**:
una aggancia, zero danno `no_candidate_edition`, piu' di una danno
`several_candidate_editions` — anche quando le due candidate stanno in serie
diverse. Scegliere una serie con un criterio di rottura sarebbe lo stesso danno
che scegliere la notte piu' vicina, e va da una persona.

**`nessuna regola` e `nessuna notte` restano due risposte diverse**
(`reconcile.ts:1123`): il rifiuto si raggiunge solo dove una regola esiste e non
ha trovato nulla. Dove non esiste, il pezzo resta orfano e non entra fra le non
classificate.

### 5. Le due righe di `INCLUSION_RULE`

Sono prosa **citata dal controllo B**, ed e' li' che `ICS-08` chiede che la
decisione arrivi. Una riga per il tipo nudo agganciato per data
(`classify.ts:149`), una per il tipo senza regola che resta orfano
(`classify.ts:150`). L'elenco continua a coprire ogni voce del file in esattamente
una classe.

I rimandi a `INCLUSION_RULE` nel gate sintetico sono per **testo** e non per
numero di riga (correzione del piano 58-03): l'inserimento di due righe in mezzo
all'elenco non ha scaduto nessun riferimento.

---

## Le tre conseguenze di `flyering` senza regola — verificate, non assunte

Il piano dichiara tre conseguenze e chiede che siano verificate. Lo sono, con
`file:riga`.

### 1. `conforms_to_rule` e' `null`, mai `false`

`src/lib/production/ics/reconcile.ts:1374-1377`:

```ts
conformsToRule:
  rule === null || context === undefined
    ? null
    : conformsToRule(piece.date, rule, context),
```

Per un pezzo `flyering`, `ruleFor(pipelines, series, "flyering")` restituisce
`null` — nessuna riga di `production_pipeline_rule` porta quel tipo, verificato
sul catalogo vivo — quindi il ramo preso e' il primo. `null`, non `false`.

**E ci arriva due volte**, il che e' la forma giusta: anche `context` e'
`undefined`, perche' il pezzo non e' agganciato a nessuna notte. Le due condizioni
sono in `||` e non in `&&`, quindi nessuna delle due dipende dall'altra.

### 2. Nessuna voce di checklist nasce per un pezzo `flyering`

La checklist si costruisce da `owedByPlan` (`reconcile.ts:1860`), e in
`owedByPlan` si entra da **due** posti soltanto:

- `reconcile.ts:1362` — dentro `if (planKey !== null)`. Un `flyering` non e' mai
  agganciato, quindi `planKey` e' `null` e questa riga non si raggiunge;
- `reconcile.ts:1602`, dentro `emitProposal`, che e' chiamato solo dal ciclo
  `for (const entry of pipeline.rules)` di `reconcile.ts:1463`. Nessuna regola
  porta quel tipo, quindi il ciclo non lo produce mai.

**Nessuno dei due percorsi puo' produrre una voce**, e la ragione e' strutturale e
non una guardia aggiunta: la checklist elenca cio' che una notte **deve**, e senza
regola non e' dovuto niente.

### 3. Un `flyering` resta un pezzo orfano

`reconcile.ts:1123` — `if (!anyRule) continue;`. Non aggancia e **non rifiuta**:
non entra ne' in `attached` ne' in `unclassified`. Lo schema prevede lo stato
esplicitamente (`database.ts`, `ProductionPiece.plan_id`, *«AN ORPHAN PIECE
EXISTS»*), e il caso `F1` del gate lo asserisce: `piece:flyering` con serie
`RSNT` e numero `null`, **mai** un `commitment`.

---

## Deviations from Plan

### 1. [Rule 3 — blocco] La riga del controllo B e' entrata nel commit del task 1

- **Trovato durante:** Task 1
- **Problema:** il piano assegna al **task 2** la riga di B che asserisce
  `kindVocabulary.size !== 6`. Ma quella riga misura **il vocabolario**, che il
  task 1 porta da sei a sette — e il materiale, contro le attese del piano, e'
  raggiungibile da questo worktree. Lasciandola al task 2, il commit del task 1
  avrebbe consegnato `npm run verify:ics` **rosso** su un difetto che il task 1
  stesso aveva introdotto.
- **Cosa e' stato fatto:** il `6` diventa `7` e il messaggio dice *«the seven»*,
  nello stesso commit del vocabolario. Nessuna logica nuova, nessun numero d'oro
  toccato.
- **Perche' non e' scope creep:** e' il claim (a) di `vocabulary.ts` applicato al
  gate che sorveglia quel claim, ed e' lo stesso motivo per cui il piano tiene
  insieme migration e letterali. Il criterio di accettazione del task 2 resta
  verificabile: la riga dice sette.
- **Verifica:** `npm run verify:ics` → otto verdi al commit `a0bc14c`.
- **Committed in:** `a0bc14c`

### 2. [Rule 3 — blocco] `seriesOfPlanKey`, e il verdetto di conformita' di un pezzo senza serie

- **Trovato durante:** Task 2
- **Problema:** con `seriesCode` nullabile, `ruleFor(pipelines, piece.seriesCode,
  …)` non compila. La via piu' corta — far accettare `null` a `ruleFor` e
  restituire `null` — avrebbe consegnato `conforms_to_rule = null` **anche a un
  `Timetable` nudo regolarmente agganciato**, cioe' avrebbe perso un diagnostico
  vero travestendolo da *«non lo sappiamo»*.
- **Cosa e' stato fatto:** `seriesOfPlanKey` — l'inverso di `joinKey`, che
  **legge** la forma di una chiave e non ne compone una — e il verdetto si calcola
  sulla regola della **notte agganciata** dove il titolo non nomina una serie.
- **Perche' e' corretto e non un aggiramento:** `conforms_to_rule` e' per
  dichiarazione *«computed at import, stored, and never drawn»*, cioe' un valore
  **derivato per costruzione**. Derivarlo dal join e' coerente; scriverlo su
  `seriesCode` non lo sarebbe, e infatti non si fa. Dove il pezzo non e'
  agganciato, `context` e' comunque `undefined` e il verdetto resta `null`.
- **Verifica:** `npx tsc --noEmit` → 0 errori; gate sintetico 18/18; controllo B
  ed E invariati sul file vero.
- **Committed in:** `ab94890`

### 3. [Rule 1 — fatto] La lettura nuda e' generale, non ristretta a una parola

- **Trovato durante:** Task 2
- **Cosa e' stato fatto:** `readBareKind` riconosce **qualunque** etichetta di
  pezzo che compaia da sola, non solo quella del gate.
- **Perche':** restringerla a una parola avrebbe richiesto di scrivere quella
  parola come letterale in un ramo — un secondo posto dove il vocabolario si
  ripete — e avrebbe lasciato le altre sei etichette a cadere sul ramo dei giorni
  occupati, cioe' avrebbe riparato un caso del fallimento silenzioso e lasciato
  in piedi gli altri sei. Il rischio inverso e' nullo: le etichette sono le
  parole di produzione, non parole comuni, e comunque il tipo governa cosa succede
  dopo — senza regola l'esito e' un orfano, non un aggancio inventato.
- **Verifica:** i cinque casi di controprova restano verdi, `C4` compreso — quello
  che pretende che un titolo estraneo resti un `commitment`.
- **Committed in:** `ab94890`

### 4. [Rule 3 — sostituzione di fonte] `pg_constraint` al posto di `information_schema`

Motivata per esteso sopra, *Il referto del catalogo vivo*. La vista prescritta dal
piano restituisce zero righe per il ruolo dell'endpoint; usarla avrebbe prodotto
un verde che misura il vuoto. Registrata in `deferred-items.md`.

**Total deviations:** 4 — due di sblocco, una di fatto, una di fonte.
**Impact on plan:** nessuno scope creep. Nessun file fuori dai cinque che il piano
elenca, piu' `deferred-items.md` e questo SUMMARY. Nessun pacchetto installato
(`T-58-06-SC` rispettato).

## Issues Encountered

### Il worktree non ha ne' `node_modules` ne' `docs/`

Entrambi collegati con un symlink al checkout principale, entrambi ignorati da
`.gitignore` (`/node_modules` alla riga 4, `docs/` alla 67), entrambi **rimossi
alla fine**. `git status` e' rimasto vuoto in ogni momento fra i due commit.

⚠ **Un tentativo intermedio e' stato annullato subito e vale la pena scriverlo:**
un symlink chiamato `docs` — cioe' il collegamento all'**intera** directory — **non
e' ignorato**, perche' `docs/` con la barra finale corrisponde solo a una
directory vera e un symlink non lo e'. `git status` lo mostrava come `?? docs`,
cioe' come un candidato al commit di 417 file di scouting e del calendario di
produzione, su un repo **pubblico**. E' stato rimosso e sostituito con una
directory vera contenente un symlink al solo file `.ics`, che l'ignore copre.

### `production_pipeline_rule`: sedici nel file, quattordici nella tabella

Fuori perimetro, non riparata, registrata in `deferred-items.md` con il metodo per
chiuderla. Il controllo **D** conta le regole leggendo il **file** della
migration; nessun controllo confronta quel numero con le righe.

## Threat Flags

Nessuna nuova superficie di sicurezza. La migration non tocca policy, `GRANT`,
funzioni o colonne, e non muove righe: il registro `<threat_model>` del piano e'
coperto per intero, con `T-58-06-01` e `T-58-06-02` verificati dalle letture del
catalogo prima e dopo, `T-58-06-03` dal `grep` sulla parola vietata e dal diff che
non tocca `SEVENTH_KIND_WORD`, e `T-58-06-04` da questo documento, che non porta
un solo `ics_alias`, `source_uid`, titolo o data di serata.

## Self-Check: PASSED

File dichiarati creati, verificati presenti:

- `supabase/migrations/20260820120000_production_piece_flyering.sql` — FOUND
- `.planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/deferred-items.md` — FOUND

Commit dichiarati, verificati in `git log`:

- `a0bc14c` — FOUND
- `ab94890` — FOUND

Gate rieseguiti al commit finale: `node scripts/verify-ics-grammar.mjs` → **0**,
18/18; `npm run build` → **0**; `npm run verify:ics-reachable` → **0**;
`npm run verify:ics` → **0**, otto controlli su otto.
