---
phase: 58-il-calendario-e-uno-specchio
plan: 01
subsystem: testing
tags: [ics, calendario, gate, contratto, classificazione, guardie]

requires:
  - phase: 44-il-calendario-di-produzione
    provides: "i sette moduli di src/lib/production/ics/, l'importatore, e INCLUSION_RULE come prosa citata da un gate"
  - phase: 48-i-ritrovamenti-del-calendario
    provides: "le 31 voci non classificate e le due parole che diventano commitment"
provides:
  - "scripts/verify-ics-grammar.mjs — 18 casi sintetici sulla grammatica dei titoli e sulla seconda passata, rosso a 13 MISSED / 0 GUESSED"
  - "scripts/verify-mirror-guards.mjs — il contratto del predicato di guardia del feed e dei rifiuti dell'importatore, rosso su V0/R1/R2/R3"
  - "Il contratto dei nomi e delle firme per i piani 58-03, 58-06, 58-09 e 58-10"
  - "Il verdetto a due versi MISSED / GUESSED, che distingue il leggere meno dall'attribuire di piu'"
affects: [58-03, 58-06, 58-09, 58-10, P-58-B]

tech-stack:
  added: []
  patterns:
    - "Gate a contratto: il gate arriva prima del codice e ne fissa nomi e firme"
    - "Verdetto a due versi invece di un generico «diverso»"
    - "Caso non esercitabile DICHIARATO rimandato, mai simulato"
    - "Ambiente del processo figlio costruito per inclusione, mai per esclusione"

key-files:
  created:
    - scripts/verify-ics-grammar.mjs
    - scripts/verify-mirror-guards.mjs
  modified: []

key-decisions:
  - "attachNumberlessPieces e' una funzione PURA esportata dal barrel, non un ramo interno di reconcile(): il gate la esercita senza costruire un'istantanea del database"
  - "mirrorGuard riceve due CONTEGGI e non due liste di voci: una guardia che tenesse i titoli sarebbe a un catch di distanza da un log, e i log di runtime della piattaforma sono conservati"
  - "La soglia MIRROR_SHRINK_FLOOR e' esportata dal modulo e letta dal gate: un gate che fissasse la soglia deciderebbe una politica che non e' sua"
  - "R4 (ICS-01b) e' dichiarato rimandato a P-58-B invece che simulato: legge l'istantanea, quindi il database"
  - "Nessuno dei due gate entra in package.json o in verify-all.mjs in questo piano"

patterns-established:
  - "MISSED / GUESSED: due versi con riparazioni opposte, e GUESSED e' il piu' grave perche' un progressivo assegnato e' gia' su una locandina"
  - "Le controprove sono meta' del gate: un controllo che misura solo cio' che manca non si accorge di cio' che si perde per strada"
  - "Un gate senza precondizioni non esce mai 2, e lo scrive nel proprio header"

requirements-completed: [ICS-04, ICS-05, ICS-08, ICS-08b, ICS-01b, ICS-02, ICS-09, ICS-10]

duration: 47min
completed: 2026-08-20
---

# Fase 58 Piano 01: I due gate sintetici Summary

**Due gate che girano su qualunque macchina, entrambi rossi alla creazione e per
la ragione giusta: 13 MISSED su 18 casi di grammatica e quattro rifiuti che oggi
rispondono con la categoria sbagliata — il rosso e' l'evidenza, non un difetto.**

## Performance

- **Duration:** ~47 min
- **Started:** 2026-08-20T14:15:00Z
- **Completed:** 2026-08-20T15:02:49Z
- **Tasks:** 2 / 2
- **Files created:** 2

## Accomplishments

- **Il gate piu' prezioso della fase esiste e non chiede materiale.**
  `verify:ics` misura il file vero e per questo sta in `NEEDS_MATERIAL`: legge
  una directory ignorata da git, quindi rifiuterebbe su ogni macchina tranne
  una. `scripts/verify-ics-grammar.mjs` fa la stessa domanda costruendo i propri
  titoli, i propri alias, le proprie notti e le proprie regole di pipeline.
  Nessuna lettura di materiale, nessun database, **nessun `Date` costruito**.

- **Il rosso e' misurato e per verso.** 13 `MISSED`, 0 `GUESSED` su 18 casi. Le
  cinque controprove sono verdi nella stessa esecuzione — cioe' il gate sa gia'
  dire se una riparazione rompesse cio' che oggi funziona.

- **Il contratto delle guardie e' scritto prima delle guardie.** D-58-05 ha
  deciso che lo specchio gira da solo, e questo progetto non ha error tracking:
  un cron che cancella e riscrive senza nessuno che guardi e' la forma peggiore
  in cui quel difetto possa presentarsi. `scripts/verify-mirror-guards.mjs`
  fissa i tre esiti del predicato, i quattro rifiuti, e **l'ordine** che li rende
  ermetici.

- **L'aggregato e' immutato.** `npm run verify` produce un output bit-identico
  prima e dopo i due commit, a meno delle durate: nessun rosso cronico si e'
  formato.

## Task Commits

1. **Task 1: Il gate sintetico della grammatica dei titoli** — `6f9c6f4` (test)
2. **Task 2: Il gate sintetico delle guardie dello specchio** — `5464ca4` (test)

## Files Created/Modified

- `scripts/verify-ics-grammar.mjs` — 18 casi in due famiglie. Famiglia A: una
  sola lettura, `classifyEntry`. Famiglia B: `classifyEntry` piu' la seconda
  passata di `ICS-05`.
- `scripts/verify-mirror-guards.mjs` — famiglia 1: il predicato puro
  `mirrorGuard`, sette casi. Famiglia 2: tre rifiuti dell'importatore misurati
  con `spawnSync`, piu' un quarto dichiarato rimandato.

## Il referto del rosso — `verify-ics-grammar`, 2026-08-20

`node scripts/verify-ics-grammar.mjs` → **uscita 1**.

| id | req | atteso | misurato | verdetto |
|---|---|---|---|---|
| C1 | controprova | `piece:listing` (RSNT 2) | `piece:listing` (RSNT 2) | **ok** |
| C2 | controprova | `piece:livecut` (RSNT 7) | `piece:livecut` (RSNT 7) | **ok** |
| C3 | controprova | `night` (RMDB-BZ 1) | `night` (RMDB-BZ 1) | **ok** |
| C4 | controprova | `commitment` | `commitment` | **ok** |
| C5 | controprova | `unclassified:alias_unresolved` | `unclassified:alias_unresolved` | **ok** |
| G1 | ICS-04 | `piece:listing` (RSNT) | `unclassified:kind_without_series_and_number` | MISSED |
| G2 | ICS-04 | `piece:listing` (RMDB-BZ) | `unclassified:kind_without_series_and_number` | MISSED |
| G3 | ICS-04 | `piece:tonight` (RMDB-BZ) | `unclassified:kind_without_series_and_number` | MISSED |
| G4 | ICS-04 | `piece:listing` (RSNT-PRLN) | `unclassified:kind_without_series_and_number` | MISSED |
| G5 | ICS-04 | `unclassified:alias_unresolved` | `unclassified:kind_without_series_and_number` | MISSED |
| A1 | ICS-05 | `attach:RMDB-BZ#1` | `unclassified:kind_without_series_and_number` | MISSED |
| A2 | ICS-05 | `unclassified:no_candidate_edition` | `unclassified:kind_without_series_and_number` | MISSED |
| A3 | ICS-05 | `unclassified:several_candidate_editions` | `unclassified:kind_without_series_and_number` | MISSED |
| A4 | ICS-05 | `attach:RSNT#2` | `unclassified:kind_without_series_and_number` | MISSED |
| A5 | ICS-05 | `unclassified:no_candidate_edition` | `unclassified:kind_without_series_and_number` | MISSED |
| T1 | ICS-08 | `attach:RSNT#4` | `commitment` | MISSED |
| T2 | ICS-08 | `unclassified:no_candidate_edition` | `commitment` | MISSED |
| F1 | ICS-08b | `piece:flyering` (RSNT) | `commitment` | MISSED |

**`MISSED 13 · GUESSED 0`** — il conteggio e' per verso, come chiede il piano.

**Zero `GUESSED` e' un dato, non un caso.** Il lettore di oggi non attribuisce
niente che non gli sia stato dato: sbaglia **per difetto**. E' esattamente il
verso in cui `INCLUSION_RULE` vuole che sbagli, ed e' la ragione per cui le 31
voci non classificate sono un problema di lettura e non un problema di
integrita' dei progressivi. La riparazione dei piani 58-03 e 58-06 deve portare
i 13 a zero **senza** far comparire un solo `GUESSED`.

**Le tre citazioni che spiegano il rosso, con `file:riga`:**

- `src/lib/production/ics/classify.ts:527-531` — `readSeriesAndNumber(segments[1])`
  restituisce `null` quando il secondo segmento non ha un trattino, e il ramo che
  segue manda tutto su `kind_without_series_and_number`. **Un ramo solo produce
  G1–G5 e A1–A5.**
- `src/lib/production/ics/classify.ts:434-443` — il ramo finale che produce un
  `commitment`. `Timetable` nudo e `Flyering - re:sonate` finiscono li' (T1, T2,
  F1): non fra le non classificate, che hanno un canale proprio sulla superficie,
  ma fra i **giorni occupati da qualcun altro**, che non ne hanno nessuno.
- `src/lib/production/ics/anchors.ts:601-604` — `conformsToRule` comincia con
  `if (!rule.derivable) return null`. E' la ragione per cui il caso **A4** esiste:
  `derivable` risponde a *«posso proporre una data?»*, non a *«posso riconoscerne
  una?»*, e senza quella distinzione 9 delle 31 voci sembrano irrisolvibili.

## Il referto del rosso — `verify-mirror-guards`, 2026-08-20

`node scripts/verify-mirror-guards.mjs` → **uscita 1**, `V0, R1, R2, R3`.

| id | req | atteso | misurato |
|---|---|---|---|
| V0 | ICS-10 | `mirrorGuard` esportato da `src/lib/production/ics/guard.ts` | `Cannot find module … guard.ts` |
| R1 | ICS-02 | uscita 2, `missing_calendar_key` | uscita 2, **`missing_credential`** |
| R2 | ICS-02 / D-58-06 | uscita 2, `unknown_calendar_key` | uscita 2, **`unknown_argument`** |
| R3 | ICS-09 | uscita 2, `missing_feed_source` | uscita 2, **`unknown_argument`** |
| R4 | ICS-01b / D-58-01 | uscita 2, `renumber_refused`, zero scritture | **RIMANDATO a `P-58-B`** |

**Il rosso di R1 e' la misura dell'ordine, non delle credenziali.** Oggi
`loadEnvironment()` gira subito dopo il controllo degli argomenti
(`scripts/import-production-calendar.mjs:409`, chiamata a livello di modulo), e
`--calendar` non esiste ancora fra gli argomenti accettati
(`parseArguments`, `:276-300`), quindi cade in `unknown`. I sette casi di
famiglia 1 non sono stati misurati e **nessuno di essi puo' dirsi verde**: il
gate lo dichiara invece di lasciarlo dedurre.

## Decisions Made

**1. `attachNumberlessPieces` e' pura ed esportata dal barrel.**
Il piano 58-03 colloca la seconda passata dentro `reconcile.ts`, che riceve
`ReconcileInput` piu' un'intera `ExistingSnapshot`. Un gate che dovesse
costruirli entrambi misurerebbe la propria impalcatura. La forma scelta —
una funzione che riceve pezzi, notti, pipeline e conteggi di line-up, e
restituisce agganci e non classificate — e' cio' che `reconcile()` chiama e cio'
che il gate chiama, **lo stesso codice da due posti**.

**2. `mirrorGuard` riceve conteggi, non voci.**
Il predicato che decide se cancellare mezzo calendario ha bisogno di sapere
*quanto*, mai *cosa*. Una guardia che tenesse le voci terrebbe i titoli, e da li'
a un `catch` che ne interpola uno il passo e' corto — difesa 1 di D-58-07, e i
log di runtime della piattaforma sono conservati.

**3. La soglia si legge dal modulo.**
`MIRROR_SHRINK_FLOOR` e' esportata accanto a `mirrorGuard`, e il gate costruisce
il caso al margine **da quella costante**. Un numero copiato nel gate sarebbe una
politica decisa in un posto dove nessuno la cerca — e il caso al margine e'
precisamente quello che una soglia scritta con il verso sbagliato rompe per
primo.

**4. R4 e' dichiarato rimandato, non simulato.**
Il confronto dei progressivi legge l'istantanea, quindi il database. Il piano
autorizza esplicitamente la dichiarazione, e la ragione vale piu' della
comodita': *un caso finto che passa e' peggio di un caso assente*, perche' fa
credere presidiata l'unica guardia che protegge un numero gia' stampato su una
locandina.

**5. Il caso della finestra massima (A5) e' stato aggiunto oltre a quanto chiesto
dal piano 58-01.** Lo pretende un criterio di accettazione del piano 58-03
(*«un pezzo che dista piu' della finestra della sua coppia esce
`no_candidate_edition`: il caso e' presente nel gate»*). Asserisce il **rifiuto**
a oltre trecento giorni di distanza — cioe' fuori da qualunque finestra che quel
calendario possa produrre, dato che le notti di quella serie distano fra uno e
tre mesi — e **non asserisce un valore di soglia**, che il piano 58-02 deve
ancora misurare.

## Deviations from Plan

Nessuna deviazione di sostanza. Due aggiunte, entrambe dentro il perimetro del
piano e dichiarate:

**1. [Rule 2 — funzionalita' critica mancante] Il caso G5, il rifiuto che va conservato**
- **Found during:** Task 1
- **Issue:** Il piano elencava le quattro forme di `ICS-04` da riparare, ma non
  un caso che asserisse che la **riparazione non allarga il rifiuto**. Senza,
  un'implementazione che risolvesse i quattro casi trasformando *«non so»* in
  *«la serie piu' vicina»* passerebbe il gate.
- **Fix:** aggiunto `G5` — `Listing - RamaDub x Segnaposto`, forma
  inequivocabilmente nostra e alias non dichiarato, attesa
  `unclassified:alias_unresolved`. E' la riga 4 di `INCLUSION_RULE` resa
  misurabile.
- **Committed in:** `6f9c6f4`

**2. [Rule 2] Il caso A5, la finestra massima**
- **Found during:** Task 1
- **Issue:** un criterio di accettazione del piano 58-03 pretende quel caso nel
  gate; il piano 58-01 non lo elencava.
- **Fix:** aggiunto, con la distanza scelta fuori da qualunque finestra
  plausibile e **senza** fissare un valore di soglia.
- **Committed in:** `6f9c6f4`

**Total deviations:** 2, entrambe additive.
**Impact on plan:** nessuno scope creep — due casi in piu' nello stesso file,
zero righe sotto `src/`.

## Issues Encountered

**`npm run verify` esce 1, e usciva 1 anche prima di questo piano.**

Il piano chiedeva `npm run verify` → `0`. Sul commit di base
(`273c4f7`) l'aggregato esce **1**, per un gate estraneo a questa fase:

```
✗ verify:touch-targets   1  FAILED
  src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:689  <button>
  src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:702  <button>
  no unprefixed height declaration — §6.3 says every target is 44px unconditionally
```

**Due pulsanti del menu bar di un ospite, in un file che questo piano non tocca.**
Fuori perimetro: non e' stato riparato, e il gate stesso vieta di ripararlo
allargando l'esenzione (*«Fix the ELEMENT, not this gate»*).

**Cio' che il criterio voleva davvero misurare e' stato misurato, e passa.** Il
criterio dice *«nessun gate nuovo e' entrato nell'aggregato»*. Verificato per
confronto: l'output completo di `npm run verify` prima e dopo i due commit e'
**identico riga per riga, a meno delle durate** — un solo `diff` di una riga di
tempo. `verify-all.mjs` non scansiona il disco: la sua riconciliazione confronta
i nomi registrati in `package.json` con quelli dichiarati dal runner
(`:650-665`), e nessuno dei due file nuovi compare in nessuno dei due elenchi.

> **Voce differita, registrata qui invece che in `deferred-items.md`** perche'
> questo piano gira in un worktree parallelo e un file condiviso di fase sarebbe
> un conflitto di merge: **`verify:touch-targets` e' rosso su
> `GuestTokenDisplay.tsx:689` e `:702`**, dal commit di base della fase 58.

## Il contratto che i piani a valle devono rispettare

Scritto negli header dei due gate, e ripetuto qui perche' e' cio' che rende
questo piano utile agli altri.

**Per 58-03 e 58-06 (`scripts/verify-ics-grammar.mjs`):**

1. `classifyEntry(event, aliases)` — firma invariata.
2. `ClassifiedPiece.number` e `ClassifiedPiece.seriesCode` diventano
   **nullabili**; dove il numero manca, **manca anche la chiave**.
3. `attachNumberlessPieces({ pieces, nights, pipelines, creditedArtistCounts })`
   → `{ attached: { uid, key }[], unclassified: { uid, reason }[] }`, pura,
   esportata dal barrel. Un pezzo **senza serie** (`Timetable` nudo, D-58-03) ha
   come candidate le notti delle serie che possiedono una regola del suo tipo; un
   pezzo il cui tipo non ha regola (`Flyering`, D-58-04) resta orfano e **non e'
   un errore**.
4. Tre esiti, mai due: una candidata aggancia, zero danno
   `no_candidate_edition`, piu' di una danno `several_candidate_editions`.

**Per 58-09 e 58-10 (`scripts/verify-mirror-guards.mjs`):**

1. `mirrorGuard({ previousEntries, currentEntries })` → `ok` | `feed_empty` |
   `feed_shrank`, con `previousEntries` **numero o `null`** (`null` = prima
   corsa, che non e' «zero»), e `MIRROR_SHRINK_FLOOR` esportata accanto.
2. **L'ordine dei rifiuti:** argomenti → chiave di calendario → sorgente
   registrata → **credenziali**.
3. **E la seconda meta' dell'ordine:** il file d'ambiente su disco si legge
   **dentro** il passo delle credenziali, mai in cima. Altrimenti l'esito di `R3`
   dipende da cosa c'e' sul disco di chi lancia il gate — e un gate il cui esito
   dipende dal disco non e' un gate, e' un sondaggio.

## Riservatezza — cosa e' entrato nei due file

Il repository e' pubblico e un commit e' una pubblicazione irreversibile.
Verificato voce per voce:

- **Parole usate:** `RSNT`, `RMDB`, `MTNLB`, `re:sonate` (e normale), `RamaDub`,
  `MotionLab`, `Booze`, `Muro`, `Perlone` — tutte gia' in
  `.claude/rules/production-calendar.md`, che e' committato.
- **Nessuna data reale:** i giorni sono nel 2031 e nel 2032, scelti per il
  **giorno della settimana** e per nient'altro.
- **Nessuno spazio in trattativa:** dove serviva una parola che l'alias non
  risolve, e' stato usato `Segnaposto`, che non e' un luogo. La sede di
  MotionLab non compare.
- **Nessun nome di persona, nessuna line-up.**
- `/usr/bin/grep -c "docs/"` → `0` su entrambi i file.
- `/usr/bin/grep -c "createClient"` → `0` su `verify-ics-grammar.mjs`.
- `/usr/bin/grep -c "SUPABASE_SERVICE_ROLE_KEY"` → `0` su
  `verify-mirror-guards.mjs`; l'ambiente del figlio e' costruito **per
  inclusione** (solo `PATH` e `HOME`), non per esclusione.
- Il gate non stampa mai il referto del processo figlio: ne estrae il token fra
  parentesi quadre e butta il resto.

## Verifica eseguita

| Comando | Atteso | Misurato |
|---|---|---|
| `node scripts/verify-ics-grammar.mjs` | uscita 1 | **1**, 13 MISSED / 0 GUESSED, 5 controprove `ok` |
| `node scripts/verify-mirror-guards.mjs` | uscita 1 | **1**, `V0, R1, R2, R3`, R4 rimandato |
| `npm run build` | uscita 0 | **0** |
| `npm run verify` | aggregato immutato | **immutato** — output identico a meno delle durate; esce 1 per un rosso preesistente estraneo |
| `/usr/bin/grep -c "verify:ics-grammar" package.json scripts/verify-all.mjs` | 0 e 0 | **0 e 0** |
| `/usr/bin/grep -c "verify:mirror-guards" package.json scripts/verify-all.mjs` | 0 e 0 | **0 e 0** |

> **Non esiste un test runner per il prodotto.** Nessuna riga qui dichiara
> «verificato perche' i test passano»: cio' che e' stato eseguito e'
> `npm run build` (che porta il typecheck) piu' i due gate nuovi, e quello che
> misurano e' scritto sopra per esteso.

## Next Phase Readiness

- **Onda 0 puo' proseguire.** I due gate esistono, girano ovunque, e i piani
  58-03, 58-06, 58-09 e 58-10 hanno i nomi e le firme da rispettare.
- **Il piano 58-02 resta il prerequisito di 58-03 task 2:** la finestra massima
  per coppia (serie, tipo) va **misurata**, e finche' non lo e' il rifiuto e' la
  risposta corretta. Il caso `A5` asserisce il rifiuto, non un valore.
- **`P-58-B` eredita un caso nominato:** `renumber_refused`, uscita 2, zero
  scritture — con la conferma letta **dal catalogo**, non dal referto dello
  script che ha causato l'effetto.
- **Nessun blocco.** Nessuna riga sotto `src/` e' stata toccata, e l'aggregato e'
  immutato.

---
*Phase: 58-il-calendario-si-legge-come-lo-si-scrive*
*Completed: 2026-08-20*
