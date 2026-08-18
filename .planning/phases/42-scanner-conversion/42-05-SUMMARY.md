---
phase: 42-scanner-conversion
plan: 05
subsystem: infra
tags: [verify-conversion, verify-dialogs, gates, derogations, tailwind, mutation-proof]

requires:
  - phase: 42-scanner-conversion
    provides: "42-01 — la riparazione di DEF-45-01 che ha reso verify:conversion di nuovo misurante, e il secondo recinto PENDING_SURFACES"
  - phase: 42-scanner-conversion
    provides: "42-04 — la mappa delle deroghe per utility e per file, e la disposizione del mirino"
provides:
  - "PALETTE_DEROGATIONS — una deroga di check A per utility e per riga, vuota, che rifiuta in tre direzioni"
  - "FULL_BLEED_SURFACES — una dichiarazione di check D per superficie a schermo pieno per costruzione, vuota, che rifiuta in due direzioni"
  - "42-05-FINDINGS.md — le due modifiche di gate non applicabili oggi, scritte verbatim e provate per esecuzione"
  - "Il reperto che, a recinto giu', l'intera superficie della porta porta UNA sola dialog shell"
affects: [42-06, 42-07, 42-08, 42-09, 42-10, 42-11, 42-12]

tech-stack:
  added: []
  patterns:
    - "Deroga di gate contata per SITO e non per hit — un file raggiunto da piu' superfici viene scansionato una volta per superficie"
    - "Un limite che il meccanismo non verifica si dichiara nel docblock, invece di essere implicito nella prosa"

key-files:
  created:
    - .planning/phases/42-scanner-conversion/42-05-FINDINGS.md
  modified:
    - scripts/verify-conversion.mjs

key-decisions:
  - "L'ancora dell'esenzione EXEMPT_SHELLS per il flash e' il lookup di stato, non una utility di layout: la riga della shell porta entrambe le ancore gia' in uso, quindi funzionerebbero per coincidenza"
  - "La costante PHONE_LOCKED_NAV_WRAPPER va rinominata PHONE_LOCKED_NAV_MOUNT nel commit che cancella il wrapper: dopo, il nome attuale e' una descrizione falsa"
  - "Il discriminante di check E si indebolisce e la limitazione si eredita scritta nella ragione della voce, con l'alternativa piu' solida nominata e declinata"
  - "La regola 'il massimo resta uno dei tre della shell' e' dichiarata nel docblock e NON verificata meccanicamente, perche' check D legge la sola pagina e la chiusura condivisa porta larghezze che non sono tier"
  - "Le modifiche di gate che la cancellazione del wrapper trascina sono QUATTRO e non due: due liste in piu' dichiarano il file e rifiutano prima che check E venga raggiunto"

patterns-established:
  - "Meccanismo vuoto prima del run che lo userebbe (D-41-16): entrambi nascono a zero voci e stampano il proprio conteggio su una riga propria"
  - "Un hit perdonato si stampa e si conta a parte, mai si toglie dal report: un perdono invisibile e' un confine di scopo che diventa un'approvazione"
  - "Prova per mutazione in entrambe le direzioni — prima che il meccanismo trovi il difetto, poi che lo perdoni — con la mutazione asserita applicata prima di leggerne l'esito"

requirements-completed: [DS-04, RESP-05]

duration: 62min
completed: 2026-08-18
---

# Phase 42 Plan 05: Le quattro deroghe, costruite prima del run che le userebbe Summary

**Due meccanismi di deroga aggiunti a `verify-conversion.mjs` — uno per utility su
check A, uno per route su check D — entrambi vuoti, entrambi con i loro rifiuti
provati per mutazione; e le due modifiche di gate che non si possono applicare
oggi scritte verbatim dopo essere state eseguite.**

## Performance

- **Duration:** ~62 min
- **Tasks:** 3
- **Files modified:** 2 (1 script, 1 documento nuovo)
- **File sotto `src/` modificati alla fine:** **0**

## Accomplishments

- **`PALETTE_DEROGATIONS`** — check A puo' perdonare **una utility su una riga
  nominata, per una ragione scritta**, e non un file intero. Il confine e'
  esplicito nel docblock con la ragione misurata: un'esenzione di percorso
  toglierebbe 3449 righe dalla misura per sempre, in una riga di diff, e nessuno
  se ne accorgerebbe (T-42-10).
- **`FULL_BLEED_SURFACES`** — check D puo' essere informato che una superficie e'
  **a schermo pieno per costruzione**, e perdona **solo** l'import mancante della
  shell.
- **Entrambi nascono a zero voci** e **entrambi rifiutano a exit 2 quando una
  voce smette di corrispondere.** Provato per mutazione in cinque direzioni
  distinte, ognuna con la mutazione asserita applicata prima di leggerne l'esito.
- **`42-05-FINDINGS.md`** — le modifiche di check E e la voce `EXEMPT_SHELLS`
  scritte parola per parola, dopo essere state **eseguite**: tre stati per check E
  (exit 2, exit 2, verde) e tre per la voce di dialogo (rifiuto per recinto,
  risoluzione su una shell sola, rifiuto per ancora stantia).
- **La suite e' verde come prima**, e il conteggio e' identico a quello che 42-01
  ha registrato: 19 gate eseguiti, 17 passati, 0 falliti, 2 rifiutati per
  credenziali assenti, exit 2. `npm run build` → exit 0.

## Task Commits

1. **Task 1: check A impara una deroga per utility** — `31b48b6` (feat)
2. **Task 2: check D impara il pieno schermo per costruzione** — `347bc1a` (feat)
3. **Task 3: le due modifiche non applicabili, scritte e provate** — `c944069` (docs)

## Files Created/Modified

- `scripts/verify-conversion.mjs` — `PALETTE_DEROGATIONS` con i suoi tre rifiuti
  e la stampa dei perdoni; `FULL_BLEED_SURFACES` con i suoi due rifiuti; le
  verdette di check A e check D riscritte perche' **non affermino piu' di quanto
  hanno misurato** quando una voce e' attiva.
- `.planning/phases/42-scanner-conversion/42-05-FINDINGS.md` — le modifiche
  future, verbatim, con le loro prove e la lista a due colonne per i piani 42-11 e
  successivi.

## Le prove, per esteso

### Check A — cinque esiti misurati

| Mutazione | Esito |
|---|---|
| voce su un file che nessuna chiusura raggiunge | **exit 2** — *no converted surface's closure scans this file* |
| voce su un file scansionato, utility assente | **exit 2** — *matches NOTHING: stale* |
| utility grezza piantata su una riga viva, lista vuota | **exit 1** — `CONVERSION_FAIL — 1 check(s) failed: A` |
| stessa utility, con la deroga che la nomina | **exit 0**, hit stampato come perdonato, `forgiving 1 site(s)` |
| lista vuota (stato finale) | **exit 0**, `palette derogations declared : 0, forgiving 0 site(s)` |

Il quarto run ha anche **misurato la trappola che il docblock nomina**: lo stesso
sito e' stato stampato **sette volte**, una per superficie che lo raggiunge, e il
conteggio ha comunque detto **un sito**. Contare gli hit invece dei siti avrebbe
rifiutato una voce corretta come *ambigua*, su un albero giusto.

### Check D — quattro esiti misurati

| Mutazione | Esito |
|---|---|
| voce su una route non in `CONVERTED` | **exit 2** — *no CONVERTED surface declares this route* |
| voce su una route la cui pagina importa la shell | **exit 2** — *that page DOES import the shell: stale* |
| shell import rimosso da una pagina dichiarata, lista vuota | **exit 1** — `✗ D 1 converted page(s) do not import the shell` |
| stessa pagina, con la voce che la nomina | **exit 0**, blocco `! D` stampato, verdetto `33 of 34` |

Controlli: `verify:dialogs` e `verify:touch-targets` **exit 0**, gli stessi
verdetti di prima del task.

### Check E e la shell del dialogo

Riportate per esteso in `42-05-FINDINGS.md` §1.3 e §2.4, con l'output dei gate
citato invece che riassunto.

## Decisions Made

1. **L'ancora del flash e' il lookup di stato.** Le due ancore gia' in uso in
   `EXEMPT_SHELLS` sono **entrambe** presenti sulla riga della shell del flash:
   userne una funzionerebbe per coincidenza e non descriverebbe niente. Il lookup
   sopravvive al commit del colore e muore se il flash viene ricostruito — che e'
   esattamente quando quell'esenzione deve fermarsi.
2. **`PHONE_LOCKED_NAV_WRAPPER` → `PHONE_LOCKED_NAV_MOUNT`.** Registrata nei
   findings come parte obbligatoria del commit che cancella il wrapper.
3. **La regola sul massimo e' dichiarata, non verificata.** Vedi *Limiti
   dichiarati* sotto.
4. **Le modifiche di gate sono quattro, non due.** Vedi *Deviations*.

## Deviations from Plan

### 1. [Rule 1 — Bug nel documento di partenza] Le modifiche di gate della cancellazione del wrapper sono QUATTRO, non due

- **Trovata durante:** Task 3, eseguendo la prova invece di trascriverla.
- **Difetto:** il piano e `42-RESEARCH.md` §3.3 parlano di **due** modifiche
  (`PHONE_LOCKED_NAV_WRAPPER` e `NAV_MODULES`). Eseguendo, il gate non arriva mai
  a check E: rifiuta prima su `SPINE` in `scripts/conversion-manifest.mjs` (voce
  che nomina un file non su disco) e poi sulla voce morta di `NAV_MODULES`.
  §3.4 della ricerca le elencava entrambe come voci 4 e 5 — ma la frase *«la forma
  minima che funziona: due edit»* le nascondeva.
- **Riparazione:** `42-05-FINDINGS.md` §0 e §3 le nominano come **B′** e **B″**,
  con l'ordine interno obbligato e i tre exit 2 intermedi misurati.
- **Committato in:** `c944069`.

### 2. [Rule 2 — Funzionalita' critica mancante] La verdetta verde di check A e di check D affermava piu' di quanto misurava

- **Trovata durante:** Task 1 e Task 2, scrivendo il wiring.
- **Difetto:** `✓ A no raw palette utility in N file(s)` e `✓ D … all N converted
  page(s) import it` sarebbero diventate **false** nel momento in cui una voce di
  deroga fosse stata attiva. Un gate che stampa un tick su una frase falsa e'
  precisamente il difetto che questa fase sta riparando in due commenti di
  prodotto.
- **Riparazione:** entrambe le verdette ora si adattano: *no **undeclared** raw
  palette utility … — except the site(s) forgiven by a DECLARED derogation*, e
  *33 of 34 converted page(s) import it and 1 is/are DECLARED full-bleed above*.
  Misurato in entrambi gli stati.
- **Committato in:** `31b48b6`, `347bc1a`.

### 3. [Rule 3 — Sostituzione di una misura non applicabile] Il criterio `grep -c "EXEMPT_PATHS"` invariato non e' soddisfabile, e la misura sostituita e' piu' stretta

- **Criterio del piano:** *«`LC_ALL=C /usr/bin/grep -c "EXEMPT_PATHS"
  scripts/verify-conversion.mjs` e' invariato — l'esenzione di percorso non e'
  stata allargata».* Prima: **4**. Dopo: **5**.
- **Perche' non e' soddisfabile:** lo **stesso task** chiede che il docblock
  *«dichiari perche' il confine e' la utility e non il file»*, citando
  `EXEMPT_PATHS` per nome. I due criteri si contraddicono; il conteggio grezzo e'
  un proxy che la prosa richiesta rompe per costruzione.
- **Misura sostituita, piu' stretta del proxy:** `git diff -U0` mostra **una sola
  riga** toccata che contiene `EXEMPT_PATHS`, ed e' `+ * `EXEMPT_PATHS` above is
  the mechanism that must NOT be used for this…` — **una riga di commento**. La
  lista, `EXEMPT_SET` e le due voci sono **byte-identiche**, e il run stampa
  `exemptions declared: 2` come prima. L'esenzione di percorso **non e' stata
  allargata**, ed e' questo che il criterio voleva dire.
- **Registrata invece che aggirata**, perche' cancellare la menzione per far
  tornare un conteggio sarebbe stato l'inverso esatto di cio' che il gate chiede.

### 4. [Rule 3 — Meccanica del worktree] La prova di check E e' stata fatta sul working tree, non su un ramo usa-e-getta

- **Perche':** un ramo avrebbe aggiunto rischio senza aggiungere isolamento —
  niente e' stato committato in nessuno dei due casi, e la prova consiste
  esattamente in mutazioni non committate. Il protocollo del worktree pretende che
  HEAD resti sul ramo per-agente a ogni commit, e cambiare ramo per una prova
  usa-e-getta e' la manovra che quella regola esiste per prevenire. Precedente
  interno: **DEF-42-03** ha misurato i quattordici bersagli nello stesso modo,
  ripristinando per percorso esatto.
- **Conseguenza verificabile:** `git branch --list` non mostra nessun ramo
  usa-e-getta, e `git status --porcelain` e' vuoto dopo ogni prova.

---

**Totale deviazioni:** 4 — 1 difetto ereditato dal documento di partenza,
1 funzionalita' critica mancante, 2 sostituzioni di metodo dichiarate.
**Impatto sul piano:** nessuno scope creep. Le prime due rendono vero cio' che il
piano voleva; le altre due sostituiscono una misura non applicabile e una
meccanica, entrambe con la misura di ricambio scritta.

## Correzioni alle premesse ereditate

Il prompt d'esecuzione porta cinque reperti delle onde 0 e 1. Verificati contro i
documenti e contro il codice, ed ecco cosa hanno cambiato **in questo piano**:

1. **Le quattro deroghe del piano non sono le quattro deroghe di colore.**
   L'obiettivo del piano parla di *quattro deroghe* e intende **quattro
   meccanismi di gate**: check A, check D, `verify:dialogs`, check E. Le deroghe
   di **colore** di `42-MAPPING.md` §3 sono un'altra cosa e sono **due gruppi**,
   A e B. **Il gruppo C e' vuoto: la deroga di riserva non e' stata presa**,
   perche' la pillola *Offline* prende `--sem-warn` e il gate esce 0. Nessuna
   contraddizione fra i due conteggi, ma vanno tenuti separati — e **nessun piano
   successivo deve scrivere una voce di gruppo C**: non ha un caso dietro.
2. **La terna decisa passa a 14,0, non a 15,5**, e `red-600`→`--sem-done` e'
   sufficiente, non comoda. Questo piano non cita nessuna delle due cifre in
   codice, quindi non c'e' niente da correggere qui — ma il commit del colore
   citera' **14,0**.
3. **L'inchiostro e' `--ground` su tutti e quattro i siti di `ScanFlash.tsx`**,
   non solo sul glifo. Fuori dal perimetro di questo piano; registrato perche' il
   piano che scrive il colore non lo deduca.
4. **`purple-400`↔`--sem-done` misura 4,1.** Idem.

## Limiti dichiarati

- **La regola *«il massimo resta uno dei tre della shell»* non e' verificata
  meccanicamente**, ed e' scritto nel docblock invece di essere lasciato
  implicito. Ragione misurata il 2026-08-18 su tutto `src/`: la chiusura condivisa
  porta legittimamente larghezze che non sono tier — le due misure proprie di un
  dialogo, la colonna di un toast, un'immagine a cui si dice di non traboccare.
  Un'asserzione su tutta la chiusura arrosserebbe una route a schermo pieno per
  larghezze che non sono sue, che e' la forma di rosso che questa famiglia di fasi
  ha gia' imparato che nessuno rilegge. Il numero lo controlla **la persona che
  scrive il commit**, contro `DECLARED_MAXIMA`, e il docblock e' il posto dove lo
  incontra.
- **Entrambi i meccanismi perdonano zero cose oggi.** Un verde qui non dice che
  la conversione sia giusta: dice che nessuno ha ancora chiesto niente a queste
  liste.
- **Nessuno dei due gate rende osservabile un fallimento a nessun essere umano
  fuori da un run manuale.** Il repo non ha error tracking; questi meccanismi
  vivono dentro comandi che qualcuno lancia.

## Issues Encountered

- **Il file porta tre byte NUL** (`permitKey`), e `grep` su questa macchina e'
  ugrep, che salta in silenzio i file che li contengono. Tutte le letture e le
  ricerche sono passate da `LC_ALL=C /usr/bin/grep` o dal tool di lettura, e ogni
  modifica e' passata da uno script Node in utf8 con roundtrip verificato
  byte-identico.
- **Due bug nell'attrezzatura di prova, non nel prodotto.** Un'asserzione
  *«l'originale non c'e' piu' dopo la scrittura»* e' scattata su una sostituzione
  che **aggiunge** una riga accanto all'originale, e una sostituzione ha
  interpretato `$` come pattern di `String.replace`. In entrambi i casi la
  mutazione e' stata **riletta dal file** prima di leggerne l'esito, che e'
  esattamente la regola che rende visibili questi incidenti invece di lasciarli
  produrre un verde vuoto.

## Vincoli d'ordine — rispettati e riasseriti

- [x] **Zero file sotto `src/` modificati.** `git status --porcelain` vuoto dopo
      ogni prova, e alla fine.
- [x] **`verify-scan-legibility.mjs` resta NON registrato.** Zero occorrenze di
      `scan-legibility` in `package.json`, `verify-all.mjs` e
      `conversion-manifest.mjs`; lo script esiste su disco e nessun runner lo
      chiama.
- [x] **`PHASE_42_PATHS` resta chiuso.** Le tre voci sono intatte; il run stampa
      `excluded as Phase 42 : 0` sulle superfici dichiarate e le due pagine della
      porta restano nel bucket *fenced*.
- [x] **Nessun pacchetto installato.** `node_modules` e' un symlink al checkout
      principale, rimosso alla fine, e `package.json` non e' stato toccato.
- [x] **STATE.md e ROADMAP.md non toccati** — sono dell'orchestratore.

## Next Phase Readiness

- **Pronte per i piani di conversione:** entrambe le liste esistono, rifiutano
  quando serve e non perdonano niente. Il piano che scrive il colore aggiunge le
  voci di `42-MAPPING.md` §3 **gruppi A e B** a `PALETTE_DEROGATIONS`, nello
  stesso commit del colore.
- **Pronta per 42-11:** la voce `EXEMPT_SHELLS` e la lista a due colonne stanno in
  `42-05-FINDINGS.md` §2.2 e §3. E un reperto nuovo che quel piano vuole: **a
  recinto giu', l'intera superficie della porta porta UNA sola dialog shell**, e
  quella voce la chiude — `REMAINING` resta 0 e il conteggio delle shell perdonate
  passa da 4 a 5.
- **Nessun deferred chiuso da questo piano.** DEF-42-01, DEF-42-02 e DEF-42-03
  restano aperti, e nessuno dei tre e' di questo piano.
- **Il vincolo d'ordine resta in piedi:** nessuna onda di conversione parte prima
  della prima porta reale (D-42-04).

---
*Phase: 42-scanner-conversion*
*Completed: 2026-08-18*
