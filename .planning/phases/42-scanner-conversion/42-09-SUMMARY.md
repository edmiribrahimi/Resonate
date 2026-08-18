---
phase: 42-scanner-conversion
plan: 09
subsystem: ui
tags: [tailwind, design-tokens, scanner, door, rename, accessibility]

requires:
  - phase: 42-scanner-conversion (42-02)
    provides: il reperto meccanico dello scanner, contro cui si misura l'invarianza
  - phase: 42-scanner-conversion (42-04)
    provides: la mappa delle sostituzioni — §9, le 42 righe dei token legacy con il loro target
  - phase: 42-scanner-conversion (42-08)
    provides: la palette grezza del file gia' chiusa a 6 deroghe, e i 42 token legacy lasciati intatti perche' sono il perimetro di questo piano
provides:
  - la porta senza alcun alias del vocabolario precedente — 42 utility rinominate agli stessi valori
  - i due conteggi del file detti come numeri col matcher del gate — legacy 0, palette grezza 6
  - la prova che questo piano non ha mosso nulla di comportamentale, presa fra due catture invece che con una normalizzazione
  - DEF-42-06 — tre confini di controllo che la rinomina ha reso leggibili e che non ripara
affects: [42-11, 42-12]

tech-stack:
  added: []
  patterns:
    - "nome lungo per primo E confine di parola: due difese indipendenti sulla stessa trappola, e il grep per la forma corrotta e' la prova che la trappola non e' scattata"
    - "l'invarianza di una rinomina si prova fra la cattura PRIMA del piano e quella DOPO, non contro un reperto di due onde fa: la seconda ha bisogno di normalizzare, la prima e' identica byte per byte"
    - "quando un gate e' recintato fuori da un file, si riusa il suo matcher e non il suo verde"

key-files:
  created:
    - .planning/phases/42-scanner-conversion/42-09-SUMMARY.md
  modified:
    - src/app/(admin)/admin/scanner/ScannerClient.tsx
    - .planning/phases/42-scanner-conversion/deferred-items.md

key-decisions:
  - "I tre confini di controllo sulla porta NON sono stati spostati su --control: cambiare quel bordo cambia il colore, e un piano di rinomina che cambia un colore ha smesso di essere una rinomina. Registrato come DEF-42-06 con i numeri, non lasciato al prossimo verde"
  - "La riconciliazione usa il MATCHER del gate e non la sua esecuzione, perche' la porta e' ancora dietro PHASE_42_PATHS: un verde di verify-conversion.mjs oggi non dice nulla su questo file"
  - "Le alpha non sono state toccate: /20 /30 /40 /50 sono passate intatte, perche' un modificatore d'opacita' mosso e' una cosa che una persona vede"

patterns-established:
  - "La prova a due catture: si riscrive temporaneamente il file alla sua versione pre-piano, si ricattura, si ripristina da HEAD e si diffano le due regioni. Il diff vuoto e' piu' forte di un diff normalizzato, perche' non chiede di fidarsi del normalizzatore"

requirements-completed: [DS-04]

duration: 26min
completed: 2026-08-18
---

# Fase 42 Piano 09: la porta parla una lingua sola — Summary

**Quarantadue utility rinominate sui nomi correnti agli stessi identici valori, i due conteggi del file detti come numeri prodotti dal matcher del gate — legacy 0, palette grezza 6 — e una prova d'invarianza a diff vuoto; piu' una voce differita, perche' la rinomina ha reso leggibile un difetto di contrasto su tre controlli della porta che questo piano non ha il mandato di riparare.**

## Performance

- **Durata:** 26 min
- **Task:** 2 su 2
- **File di prodotto modificati:** 1
- **Commit:** 4 (2 di task, 1 di voce differita, 1 di questo documento)

## La deroga sotto cui questo piano ha girato

Il piano si apre con un blocco: non parte finche' la riga **3m** di `42-PROCEDURES.md` — il door pass sullo scanner **non convertito** — non porta un risultato.

**Quella riga dice `pending`, e non e' piu' riempibile.** Il piano ha girato lo stesso sotto la **deroga del proprietario datata 2026-08-18**, scritta dentro la riga 3m stessa, che autorizza esplicitamente le onde 3-8 a procedere e ne enuncia il costo: il criterio 3 — *ogni comportamento dello scanner e' invariato rispetto a prima della conversione* — **non e' piu' chiudibile**, perche' il codice su cui andava presa la prima misura non esiste piu'.

**Questo piano non lo chiude e non pretende di chiuderlo.** Cio' che dimostra e' l'invarianza rispetto al **reperto meccanico**, che e' una cosa piu' piccola e diversa da un'osservazione umana a un ingresso. E' la stessa distinzione che 42-08 ha gia' messo per iscritto, ripetuta qui perche' un lettore che apra solo questo documento non la deduca al contrario.

## Cosa e' stato fatto

### Task 1 — le superfici e le linee, nome lungo per primo

**Trenta occorrenze su tre alias**, esattamente la distribuzione che `42-MAPPING.md` §9 assegna a questi tre:

| alias di partenza | nome d'arrivo | occorrenze |
|---|---|---|
| sfondo pagina | il nome del suolo | **3** |
| riempimento card | il nome della superficie | **9** |
| bordo card, come bordo | il nome della linea | **9** |
| bordo card, come riempimento | il nome della linea | **9** |
| | **totale task 1** | **30** |

**La trappola del prefisso, e le due difese.** Uno dei quattro alias e' prefisso di un altro: sostituire il corto per primo riscrive parte del lungo e lascia un nome che non risolve a nulla. Sono state applicate **entrambe** le difese che il piano offriva in alternativa — l'ordine (il nome lungo per primo) **e** il confine di parola, con la stessa forma di lookaround che usa il matcher del gate:

```
perl -i -pe 's/(?<![a-zA-Z0-9-])bg-card-border(?![a-z0-9-])/bg-line/g; …'
```

**La prova che non e' scattata**, comando e uscita:

```
$ LC_ALL=C /usr/bin/grep -cE '(surface|ground)-border|bg-surface-border|border-surface-border' \
    "src/app/(admin)/admin/scanner/ScannerClient.tsx"
0
```

Zero. La forma corrotta che una sostituzione prefisso-per-primo avrebbe prodotto non esiste nel file.

**Le alpha sono passate intatte.** `/50` sui tre segnaposto di caricamento e sul divisorio di riga, `/20` e `/40` sui due stati di una riga toccabile, `/30` su una pastiglia non selezionata e su un'altra riga toccabile. Nessuna e' stata arrotondata, nessuna e' stata omessa.

**Il diff, letto riga per riga:** ventuno righe, tutte e sole stringhe di classe. Nessun elemento aggiunto o tolto, nessuna card fusa con la vicina, nessun divisorio caduto perche' sembrava ridondante.

### Task 2 — l'inchiostro, e i due conti

**Dodici occorrenze** dell'alias d'inchiostro sul nome primario della rampa. Undici delle dodici stanno accanto a un `text-muted` — otto come `text-muted hover:text-ink` — quindi il file adesso scrive **due gradini della stessa rampa nominata** dove prima scriveva un token e un alias. E' l'unico punto in cui questa rinomina rende il file piu' leggibile invece che soltanto piu' corrente.

## I due numeri, prodotti da un comando e messi uno accanto all'altro

Riconciliazione con **il matcher del gate** — `COLOUR_UTILITY_PREFIXES`, `PALETTE_NAMES` e `LEGACY_TOKEN_NAMES` letti **dal testo** di `scripts/verify-conversion.mjs`, `utilityPattern`, `isToleratedScrim` e `findUtilityHits` ricostruiti nella loro forma esatta, righe lette attraverso lo stesso stripper di commenti. E' la tecnica di `42-MAPPING.md` §1, riusata perche' una regex a mano che deriva dal gate produce un conteggio su cui il gate non e' mai d'accordo.

```
prefixes=12  paletteNames=24  legacyNames=card-border,card,background,foreground
file: src/app/(admin)/admin/scanner/ScannerClient.tsx
LEGACY TOKEN UTILITIES : 0
RAW PALETTE UTILITIES  : 6
    437  bg-green-500      438  bg-green-500      437  text-green-500
    3323 text-green-500    3351 text-red-600      3440 text-green-500
```

| | prima di questo piano | dopo |
|---|---|---|
| **token legacy** | 42 | **0** |
| **palette grezza** | 6 | **6** — il totale delle deroghe che la mappa assegna a questo file |

Le sei sono le sei che 42-08 ha lasciato dichiarate: **non sono un residuo, sono una deroga**, e questo piano non ne ha ne' aggiunta ne' tolta una.

**Il perimetro intero, misurato con lo stesso matcher** — i file a zero elencati **come file a zero**, perche' un lettore deve poter distinguere *controllato e vuoto* da *non controllato*:

| file | token legacy | palette grezza |
|---|---|---|
| `ScannerClient.tsx` | **0** | 6 (deroghe) |
| `ScanFlash.tsx` | **0** | 2 (deroghe) |
| `DoorSurface.tsx` | **0** | 0 |
| `admin/scanner/page.tsx` | **0** | 0 |
| `door/page.tsx` | **0** | 0 |

### Perche' il matcher e non il verde

`node scripts/verify-conversion.mjs` esce **0**, con:

```
✓ A  no undeclared raw palette utility in 188 file(s) under 34 converted surface(s)
✓ B  no legacy token utility in 188 file(s) across 34 converted surface(s)
```

**Quel verde non parla di questo file.** La porta e le sue componenti sono ancora dietro il recinto `PHASE_42_PATHS` (`scripts/conversion-manifest.mjs:228-241`), che apre il piano **42-11** e non questo. Un gate recintato fuori da un file e' silenzioso su quel file, e un silenzio non e' un conteggio: e' la ragione per cui il piano chiedeva il **matcher**, e la ragione per cui i due numeri qui sopra sono stati prodotti e non citati.

## L'invarianza — due misure, e la seconda non chiede di fidarsi di nulla

### Misura 1 — contro il reperto, coi riferimenti di riga normalizzati

Cattura fresca con `node scripts/capture-scanner-baseline.mjs`, regione fra i due marcatori, riferimenti di riga normalizzati in tre posizioni sole (il `file:riga`, la prima cella di tabella quando e' cifre nude, l'ultima quando lo e' e la prima non lo era). Il diff superstite:

```
8,9c8,9
< | already_recorded | … | `bg-amber-500/90` | **2500** | L |
< | error            | … | `bg-red-500/90`   | **2000** | L |
---
> | already_recorded | … | `bg-sem-done/90`  | **2500** | L |
> | error            | … | `bg-red-600/90`   | **2000** | L |
203c203
<   files scanned:                 306
---
>   files scanned:                 305
```

Tre differenze, e sono le tre gia' accettate: **i due riempimenti d'esito** (piano 42-06) e **il conto dei file** (piano 42-07, che ha cancellato un componente di navigazione). **Nessuna riga superstite nomina `ScannerClient.tsx`.**

### Misura 2 — fra la cattura prima di questo piano e quella dopo

La misura 1 ha un punto debole che vale dirlo: chiede di credere al normalizzatore. La seconda non chiede nulla.

Il file e' stato riscritto temporaneamente alla sua versione **pre-piano** (`git show <base>:…`), ricatturato, e ripristinato da HEAD; poi le due regioni sono state diffate **senza alcuna normalizzazione**:

```
$ diff pre09.region.md after.region.md
$ echo $?
0
```

**Vuoto.** Non una tinta, non un dwell, non una costante di coda, non un letterale di fotocamera, **e nemmeno un numero di riga** — perche' le sostituzioni sono avvenute in posto, sulle stesse righe, e il file ha lo stesso numero di righe di prima. E' la prova che **questo piano** non ha mosso nulla che il reperto misuri, distinta dalla prova che l'ha mossa **l'onda** prima.

### Le altre due verifiche

- `npm run build` → exit **0**, dopo ogni task. Typecheck incluso, che qui e' il gate dei tipi.
- `node scripts/verify-scan-legibility.mjs` → **`SCAN_LEGIBILITY_OK`**, exit 0. Le cinque coppie e i tre glifi invariati, come devono essere: questo piano non ha toccato ne' un riempimento d'esito ne' la pillola.

**E va detto cosa nessuna di queste prova.** Non esiste un test runner per il prodotto: nessuna riga qui sopra dice che la porta funziona. Dicono che il file non e' cambiato in nulla che una macchina sappia misurare. Che la porta funzioni resta al door pass, che per la riga 3m **non e' piu' misurabile contro un prima**.

## La distinzione persa a un nome condiviso — detta, non lasciata implicita

**Il vecchio nome del bordo diceva un ruolo; il nuovo dice una posizione in una scala.** L'alias si chiamava *bordo della card* e risolveva a *linea*; adesso il file scrive *linea*, che e' il gradino di mezzo di tre — ce n'e' uno piu' tenue e uno piu' marcato. **La rinomina non poteva scegliere fra i tre**, perche' un alias risolve a uno solo. Chi legge domani non trovera' scritto se il gradino di mezzo sia stato **deciso** o **ereditato**: e' ereditato, su tutti e diciotto i siti.

Lo stesso vale per l'inchiostro, dove pero' non si perde nulla: il file usava gia' due gradini distinti — il primario e il terziario — e continua a usarli, adesso con i nomi della stessa rampa.

**E c'e' un caso in cui il nome condiviso non ha nascosto una distinzione ma ne ha esposta una:** vedi la sezione seguente.

## Deviazioni dal piano

### 1. [Regola 4 → registrata, non applicata] Tre confini di controllo sulla porta

`globals.css:44-57` vieta al gruppo delle linee di portare *«the boundary of a text input, a select, a secondary or ghost button, a checkbox or the scanner target»*, e `:82-88` dice che le **due** destinazioni per quell'alias erano state costruite apposta — `border-line` per il bordo di una card, `border-control` per il confine di un controllo, *«instead of one destination and a memory»*.

**La mappa ne assegna una sola su ogni riga, e un alias non offre la scelta.** Cosi' tre bordi che non sono di card hanno preso il nome della linea:

| riga | elemento | cosa fa alla porta |
|---|---|---|
| 2706 | `<button>` | sceglie **su quale serata** la porta sta lavorando |
| 2867 | `<button>` | accende e spegne **la fotocamera** |
| 3106 | `<input type="text">` | cerca un ospite **per nome**, quando la scansione non riesce |

Il gruppo delle linee arriva al massimo a **2,05 : 1** sui quattro fondi; WCAG 1.4.11 chiede **3 : 1** a un confine non testuale; il nome del confine di controllo misura **6,29 – 7,14**. Non e' un mancato di poco.

**Non riparata, e la ragione e' il piano.** Passare a `border-control` **cambia il colore**, e il criterio d'accettazione di questo piano dice in lettere che i valori sono identici per costruzione e che qualunque cosa una persona possa vedere dopo e' un difetto. Un piano di rinomina che cambia un colore ha smesso di essere una rinomina — che e' precisamente la ragione per cui questo lavoro ha un piano separato.

**Il difetto non nasce qui:** era gia' sulla porta sotto il nome precedente, ed e' il reperto A1 di `41-UI-SPEC.md` §5.2. La rinomina lo ha reso **leggibile**, perche' adesso il file scrive il nome che il documento dei token vieta invece di un alias che suonava come un bordo di card.

**E nessun gate lo trovera' da solo:** `--control` e' un nome noto a `scripts/verify-tokens.mjs:375`, ma nessun controllo pretende che un confine di controllo lo porti. Registrata come **DEF-42-06** in `deferred-items.md`, con i tre siti, i numeri e il proprietario.

### 2. [Documentale] Una nota sui numeri di riga della mappa

`42-MAPPING.md` §9 elenca le 42 righe con i numeri che avevano prima delle onde 3 e 4. Dopo 42-06 e 42-08 quei numeri sono scorsi (2638→2668 e cosi' via). **Le occorrenze e la loro distribuzione coincidono esattamente** — 3 / 9 / 9 / 9 / 12 — quindi la mappa e' corretta in cio' che decide e invecchiata solo nei riferimenti. Non e' stata riscritta: la riconciliazione qui e' per **conteggio e distribuzione**, che e' cio' che la mappa esiste per fissare.

**Totale deviazioni:** 1 registrata come voce differita (Regola 4, decisione non presa qui), 1 imprecisione documentale riportata, 1 deroga ereditata dall'onda.

## Cosa eredita chi viene dopo

- **42-11** apre il recinto `PHASE_42_PATHS` e trova un file che il gate puo' finalmente contare: check A e check B su questa porta devono uscire **verdi al primo colpo**, con le sei deroghe di questo file e le due di `ScanFlash.tsx` gia' dichiarate — e se non escono verdi, il difetto e' nel recinto o nella dichiarazione, non nel vocabolario.
- **DEF-42-06** aspetta chi decide sul contrasto dei controlli. La porta merita di essere trattata per prima fra i siti del reperto A1, perche' e' l'unica superficie letta al buio davanti a una fila.
- **DEF-42-04** resta aperta e permanente: il criterio 3 non ha piu' un termine di paragone.

## Self-Check: PASSED

- `.planning/phases/42-scanner-conversion/42-09-SUMMARY.md` — creato
- `.planning/phases/42-scanner-conversion/deferred-items.md` — modificato, DEF-42-06 aggiunta
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — modificato, 42 occorrenze
- commit `5f05e3e` — task 1, 21 righe
- commit `8e71897` — task 2, 12 righe
- commit `9d14856` — DEF-42-06, 92 righe

Nessun file cancellato in nessuno dei tre commit (`git diff --diff-filter=D` vuoto su ognuno).

---

*Completato: 2026-08-18, sotto la deroga del proprietario alla riga 3m di `42-PROCEDURES.md`*
