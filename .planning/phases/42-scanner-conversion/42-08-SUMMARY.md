---
phase: 42-scanner-conversion
plan: 08
subsystem: ui
tags: [tailwind, design-tokens, accessibility, colour-vision, scanner, door]

requires:
  - phase: 42-scanner-conversion (42-02)
    provides: il reperto meccanico dello scanner, contro cui si misura l'invarianza
  - phase: 42-scanner-conversion (42-04)
    provides: la mappa delle sostituzioni, riga per riga e deroga per deroga
  - phase: 42-scanner-conversion (42-06)
    provides: CONNECTIVITY_PILL gia' in piedi, i tre esiti convertiti, e DEF-42-05 aperta
provides:
  - la porta sul vocabolario del prodotto — 50 utility convertite, 6 deroghe residue
  - la pillola di connettivita' sul semantico d'attenzione, con il ramo identificabile dai numeri del gate
  - DEF-42-05 chiusa leggendo il termine di paragone dal codice invece di inventarlo
affects: [42-09, 42-11, 42-12]

tech-stack:
  added: []
  patterns:
    - "un ternario si converte come unita': un ramo convertito e l'altro grezzo cambia vocabolario a runtime"
    - "un commento nomina lo stato e il ramo che lo produce, mai la tinta"
    - "l'invarianza si prova azzerando i colori nei due file e diffando cio' che resta"

key-files:
  created:
    - .planning/phases/42-scanner-conversion/42-08-SUMMARY.md
  modified:
    - src/app/(admin)/admin/scanner/ScannerClient.tsx
    - .planning/phases/42-scanner-conversion/deferred-items.md

key-decisions:
  - "La pillola prende --sem-warn: il ramo che 42-06 aveva lasciato aperto, chiuso qui e riconoscibile dalle cifre del gate (29,0 e 23,7), non dalla parola"
  - "DEF-42-05 e' chiusa perche' il termine di paragone mancante sta in due rami di ticketOffline, non perche' la frase sia stata accorciata"
  - "Nessun bersaglio tattile e' stato ingrandito: il debito DEF-42-03 resta a quattordici"

patterns-established:
  - "Prova di invarianza per azzeramento: due file con OGNI utility di colore sostituita da un segnaposto, diffati — cio' che resta e' tutto cio' che non e' colore"
  - "Un contatore si prova nella direzione opposta prima di fidarsi del suo zero"

requirements-completed: [DS-04]

duration: ~50min
completed: 2026-08-18
---

# Fase 42 Piano 08: la porta parla il vocabolario del prodotto — Summary

**Cinquanta utility grezze convertite in `ScannerClient.tsx`, sei deroghe residue — esattamente le sei righe che la mappa assegna a questo file — la pillola di connettivita' sul semantico d'attenzione, e un diff a colori azzerati che dimostra che nel resto del file non si e' mosso un carattere di codice.**

## Performance

- **Durata:** ~50 min
- **Task:** 2 su 2, piu' la chiusura di DEF-42-05
- **File di prodotto modificati:** 1
- **Commit:** 3 (piu' questo di chiusura)

## La deroga sotto cui questo piano ha girato

Il piano porta un blocco `⛔ BLOCKED` in testa: non partire finche' la riga **3m** di `42-PROCEDURES.md` — *il door pass sullo scanner NON convertito* — non porta un'osservazione.

**Quella riga dice `pending`, e non e' piu' riempibile.** Il piano ha girato lo stesso sotto la **deroga del proprietario datata 2026-08-18**, registrata nella riga 3m stessa, in `DEF-42-04` e in `STATE.md`, che autorizza esplicitamente le onde 3-8 a procedere.

**Cosa costa, ripetuto invece che dedotto:**

1. **Il criterio 3 — *ogni comportamento dello scanner e' invariato rispetto a prima della conversione* — non e' chiudibile.** Non e' aperto: e' privo di un termine di paragone, in modo permanente. Questo piano **non lo chiude e non pretende di chiuderlo**: cio' che dimostra e' l'invarianza rispetto al **reperto meccanico** (`42-BASELINE.md`), che e' una cosa diversa e piu' piccola di un'osservazione umana alla porta.
2. **Il secondo motivo del vincolo d'ordine resta intatto:** alla prima porta reale, correzioni di comportamento mai esercitate e una superficie ridipinta girano insieme, e questo repository non ha error tracking. Rischio accettato, non rimosso.

**Nessuna osservazione e' stata inventata per la riga 3m.**

## Realizzazioni

- **La palette grezza di questo file scende da 56 a 6.** Le sei che restano sono le sei deroghe della mappa, non un residuo.
- **La pillola di connettivita' ha preso il suo ramo**, quello che 42-06 aveva deliberatamente lasciato aperto.
- **I cinque siti scelti da un'espressione hanno entrambi i rami sulla stessa lingua.** Un ternario convertito a meta' e' una superficie che cambia vocabolario a seconda di una condizione a runtime.
- **DEF-42-05 e' chiusa con evidenza**, non con una frase piu' corta.
- **Nessun comportamento si e' mosso**, e la prova e' piu' forte del diff del reperto: vedi sotto.

## Task Commits

1. **Task 1 — la pillola, la coda e la fine della serata** · `dc811ec` (feat)
2. **Task 2 — il corpo della scansione e i cinque ternari** · `e6a52a2` (feat)
3. **DEF-42-05 — il termine di paragone letto dal codice** · `0353854` (fix)

## Le misure

### Il conteggio della palette grezza — e il contatore provato prima di fidarsene

Misurato con il **matcher del gate**, ricostruito da `COLOUR_UTILITY_PREFIXES`, `PALETTE_NAMES` e `utilityPattern` di `scripts/verify-conversion.mjs`, e letto attraverso lo **stripper dei commenti del gate** (`scripts/lib/comments.mjs`, `liveLines`). Una regex a mano avrebbe prodotto un numero su cui il gate non e' mai d'accordo.

| momento | occorrenze su righe vive |
|---|---|
| prima di questo piano (commit di base) | **56** |
| dopo questo piano | **6** |

**Il contatore e' stato provato nella direzione opposta prima di leggerne lo zero** (`ai-engineering.md`, gate *prova per mutazione*): fatto girare sul file com'era al commit di base ha risposto **56**, che e' il **57** della mappa meno la sola riga che 42-06 aveva gia' convertito. Un contatore che risponde 6 senza aver mai risposto 56 e' un contatore di cui non si sa niente.

### Le sei deroghe residue, riga per riga

| Riga | Utility | Cosa dipinge | Gruppo |
|---|---|---|---|
| 437 | `bg-green-500/15`, `text-green-500` | la pillola *Online*, nella costante | **A** |
| 438 | `bg-green-500` | il punto della pillola *Online* | **A** |
| 3323 | `text-green-500` | il glifo di successo nella cronologia | **A** |
| 3351 | `text-red-600` | il glifo d'errore nella cronologia | **B** |
| 3440 | `text-green-500` | il segno di arrivato nella lista presenze | **A** |

**Sei occorrenze contro le sei righe che `42-MAPPING.md` §6 assegna a questo file** — cinque del gruppo A, una del gruppo B. I due numeri coincidono.

> **Una precisazione sull'altro conteggio della mappa.** Il §3 parla di *«sette utility»* per l'intero perimetro: sono **righe di tabella**, e una di esse (la pillola *Online*) ne porta due sulla stessa riga. Per occorrenza il perimetro ne ha otto: sei qui e due in `ScanFlash.tsx`. Le due unita' di misura sono entrambe corrette e vanno solo nominate, o il piano 42-11 scrivera' la deroga contando la cosa sbagliata.

### Il gate della leggibilita' — `SCAN_LEGIBILITY_OK`, exit 0

| coppia | normale | protan | deuter | tritan | **min** | *fine 42-06* |
|---|---|---|---|---|---|---|
| accetta ↔ rifiuta | 78,1 | 38,7 | **14,0** | 64,9 | **14,0** | 14,0 |
| accetta ↔ terzo stato | 53,4 | 56,6 | 48,2 | **19,8** | 19,8 | 19,8 |
| rifiuta ↔ terzo stato | 42,3 | 51,1 | 52,1 | **31,9** | 31,9 | 31,9 |
| terzo stato ↔ pillola | 52,8 | 55,8 | 54,5 | **29,0** | **29,0** | 28,3 |
| rifiuta ↔ pillola | 36,5 | 40,2 | **23,7** | 29,4 | **23,7** | 22,4 |

**Minimo stampato: 14,0 — identico a quello di fine 42-06.** La pillola non entra nella coppia che porta il minimo, quindi il suo spostamento non poteva abbassarlo; le due coppie che la contengono sono **salite** (28,3 → 29,0 e 22,4 → 23,7). Il semantico e' di un soffio piu' distante del giallo su entrambe.

**Il ramo preso e' identificabile dai numeri, non dalla parola:** 29,0 e 23,7 sono esattamente le cifre che `42-MAPPING.md` §5.2 attribuisce al ramo `--sem-warn`, e 28,3 / 22,4 quelle che attribuisce al giallo grezzo. La simulazione di wave 1 e l'applicazione di wave 4 concordano cella per cella.

Contrasto dell'inchiostro del glifo, invariato: accettazione **8,18:1**, terzo stato **5,49:1**, rifiuto **3,87:1**, tutti sopra il pavimento grafico di 3.

### Il costo dichiarato che questa scelta porta con se'

La coppia **accetta ↔ pillola** e' esclusa dal gate, e l'esclusione e' vera **per costruzione**: il lampo e' ancorato a tutti e quattro i bordi e copre l'intestazione in cui la pillola vive. Wave 0 ha gia' provato che il gate **fallisce chiuso** il giorno in cui quella premessa cade.

**Il prezzo, scritto adesso invece che scoperto dopo:** con il giallo grezzo quella coppia misurava **5,5** in protanopia; con il semantico misura **2,6**. Se un giorno viene presa l'idea differita *«il lampo come card invece che a schermo pieno»* — viva in `42-CONTEXT.md` §Deferred come modo di ridurre l'abbagliamento a un ingresso al buio — **la pillola deve muoversi nello stesso commit.** Non e' una ragione per non prendere il semantico oggi: e' una ragione per avere il numero prima.

### L'invarianza del comportamento — due prove, e la seconda e' piu' forte

**Prova 1 — il reperto meccanico.** Cattura fresca con `node scripts/capture-scanner-baseline.mjs`, confrontata con `42-BASELINE.md` sulla regione fra i due marcatori, con i riferimenti di riga normalizzati. Il diff riporta **zero righe che nominino `ScannerClient.tsx`**: gli scarti residui sono tutti e soli quelli di `ScanFlash.tsx`, cioe' il lavoro del piano 42-06 (i due riempimenti e lo scorrimento di riga del suo docblock). Identici: i tre dwell, le tre aptiche, la mappatura esito → aptica, i 26 siti di `showFlash` con esiti e titoli, i sei path dei glifi, le costanti della coda, la finestra di doppia lettura, la configurazione della fotocamera e le **quattro tabelle di messaggi**.

**Prova 2 — il diff a colori azzerati, che copre cio' che il reperto non guarda.** Il reperto tabella quello che qualcuno ha deciso di tabellare; su un file di 3480 righe resta molto che nessun blocco osserva. Quindi: il file **prima** e il file **dopo**, entrambi passati per una sostituzione che rimpiazza **ogni** utility di colore — palette grezza *e* token — con un segnaposto unico, e diffati.

**Risultato: 32 righe di scarto, e tutte e 32 sono righe di commento.** Zero JSX, zero logica, zero utility di dimensione, zero classi riordinate, zero elementi annidati diversamente. E' l'asserzione che il reperto da solo non poteva dare: non *«i valori che guardiamo non sono cambiati»* ma *«fuori dai colori e da tre commenti, non e' cambiato niente»*.

I tre commenti sono elencati sotto, e ognuno e' una frase che **questo piano stesso** avrebbe reso falsa.

### I cinque siti scelti da un'espressione, entrambi i rami

| Sito | Ramo | Come sta ora |
|---|---|---|
| `:2865` interruttore scanner | acceso | `bg-accent text-ground` |
| | spento | `bg-card border border-card-border text-muted hover:text-foreground` — **solo legacy**, e' del piano 42-09 |
| `:3212` banda di freschezza | `channelLive` | `border-sem-warn/40 bg-sem-warn/10 text-sem-warn active:bg-sem-warn/20` |
| | non-live | `border-sem-crit/40 bg-sem-crit/10 text-sem-crit active:bg-sem-crit/20` |
| `:3228` avviso di cache | `tone === "error"` | `border-sem-crit/40 bg-sem-crit/10 text-sem-crit` |
| | altrimenti | `border-sem-warn/40 bg-sem-warn/10 text-sem-warn` |
| `:3250` torcia | accesa | `bg-sem-warn/20 text-sem-warn` |
| | spenta | `bg-card-border/30 text-muted hover:text-foreground` — **solo legacy**, e' del piano 42-09 |
| `:3309-3351` cronologia | `isUndone` | `text-muted` — nessuna palette grezza |
| | `isSuccess` | `text-green-500` — **deroga A**, invariata |
| | `isFlagged` | `text-sem-done` — convertito da 42-06 |
| | `isError` | `text-red-600` — **deroga B**, convertito da 42-06 |

**Nessuno dei cinque ha un ramo su una lingua e l'altro sull'altra.** Dove un ramo resta grezzo — l'interruttore spento e la torcia spenta — non porta palette grezza affatto: porta **solo token legacy**, che sono il perimetro dichiarato del piano 42-09.

### Le cinque frasi della coda, invariate

```
2944: Pending ({queue.pending})
2953: Could not be recorded ({queue.failed})
2962: Sign in again to record {queue.blocked}
2975: Undone at the door, held on this device ({queue.undone})
2981: This device cannot read its own queue
```

Cinque pillole, cinque frasi distinte. L'elenco dei fallimenti sotto di esse distingue ancora le proprie cause (`failureSentence`), e le quattro tabelle di messaggi sono byte per byte quelle del reperto. **Un commit di colore che avesse riordinato cinque frasi in due avrebbe ricreato il difetto registrato di questo progetto** — il form che collassa ogni errore in *«Qualcosa e' andato storto»* — mentre sembrava innocuo.

### I bersagli tattili — nessuno e' cresciuto

`node scripts/verify-touch-targets.mjs` → **PASSED**, `measured 60 element(s) across 105 file(s)`, identico a prima del piano. La porta e' dietro l'**esenzione 1** e non e' misurata da quel gate, quindi il verde non e' la prova: **la prova e' il diff a colori azzerati**, che non contiene una sola utility di dimensione o di area tattile. I quattordici bersagli sotto il minimo di `DEF-42-03` restano quattordici, com'e' scritto che debbano restare.

### Il build

`npm run build` — exit **0**, tre volte (dopo il Task 1, dopo il Task 2, dopo la chiusura di DEF-42-05). Include il typecheck di Next.

## DEF-42-05 — chiusa, e come

La frase accanto a `markCheckedInLocally` diceva *«A failure here costs a later amber flag instead of a later amber flag»*: **non affermava nulla**, e nominava una tinta che il terzo stato non porta piu' da 42-06.

**Il termine di paragone mancante non e' stato ricostruito a intuito: sta nel codice, in due rami dello stesso `if`.**

- `markCheckedInLocally` (`src/lib/offline/checkin-store.ts:975-989`) e' **l'unico scrittore** di `checkedIn` su questo percorso; se fallisce, la riga in cache resta a *non arrivato*.
- `ticketOffline`, in questo file, si dirama **esattamente su quel campo**: `cached.checkedIn` vero → `showFlash("already_recorded", …)` con l'ora e l'operatore; falso → `checkInLocally(…)` e `showFlash(flagged ? "already_recorded" : "success", …)`.

Quindi il fallimento **costa una lettura di *gia' registrato***: lo stesso biglietto, riletto su quel telefono con la radio spenta, dice *ammesso*. E il resto della frase regge alla verifica — **nessun ingresso e nessun rifiuto ci gira sopra**, perche' il registro del server non e' toccato e il primo aggiornamento riuscito riscrive la riga (`checkin-store.ts:740-753`: `localWins` e' falso quando la riga locale non dice *arrivato*).

La frase riscritta nomina lo **stato** e il ramo che lo produce, **mai la tinta** — la regola che la voce chiedeva di applicare.

**Cosa questa chiusura NON prova, detto invece che sottinteso.** Che l'autore intendesse *questo* paragone resta indimostrabile: nessuno e' stato interrogato. Cio' che e' dimostrato e' piu' utile a chi leggera' il codice domani — la frase descrive ora il meccanismo che il codice esegue, con i due `file:riga` che lo reggono. La voce in `deferred-items.md` porta la chiusura per intero, compresa questa riserva.

## Deviazioni dal piano

### 1. [Regola 1 — Bug] Tre commenti resi falsi da questo stesso piano

- **Trovati durante:** Task 1, leggendo i siti prima di sostituirli.
- **Difetto:** tre frasi sarebbero diventate false **per effetto di questo commit**. Il docblock di `CONNECTIVITY_PILL` diceva *«The colours themselves are unchanged — this is a lift, and plan 42-08 decides what they become»* (questo piano *e'* quella decisione) e contava le occorrenze di una utility che dopo la conversione non esiste piu' nel file; il commento accanto ai due rami della pillola diceva *«The colour here is unchanged»*.
- **Correzione:** riscritte **per stato invece che per tinta**, la regola che 42-06 ha stabilito e che questa voce eredita. Il docblock dichiara ora *quale semantico* prende il ramo offline e *perche' e' legale* — la mitigazione permanente dell'ambra, che e' anche il colore d'identificazione di un format: qualunque cosa ambra porta del testo, e questa pillola porta la parola *Offline*. Dichiara inoltre che il ramo online resta grezzo **come deroga dichiarata, non come omissione**.
- **Perche' non e' scope creep:** correggere due frasi false e crearne altre tre nello stesso passaggio e' il difetto **T-42-18** spostato di venti righe, non chiuso.
- **Costo dichiarato:** la fase vieta di annotare (*«Substitute; do not annotate»*) perche' questo file e' il caso peggiore del progetto per budget di contesto. Le tre correzioni aggiungono **+9 righe nette di prosa**. Sono la ragione per cui il diff a colori azzerati riporta 32 righe invece di zero, ed e' l'unica prosa aggiunta dal piano.
- **Commit:** `dc811ec`

### 2. Una imprecisione della mappa, riportata e non risolta al buio

`42-MAPPING.md` §6 etichetta le pillole di coda in un ordine che non e' quello del codice: la riga *«2940 · sign in again»* corrisponde a *could not be recorded*, e la pillola *«This device cannot read its own queue»* non ha una riga con un'etichetta propria.

**Non e' un'ambiguita' operativa e non ha richiesto una decisione:** ogni rosso della regione va a `sem-crit` e ogni ambra a `sem-warn` senza eccezioni, quindi le etichette scambiate non producono target diversi, e i totali coincidono (56 = 57 − 1). E' registrata qui perche' chi rileggera' la mappa cercando *«quale riga e' la pillola che non sa leggere la propria coda»* non la trovera' per nome.

### 3. Il gate della fase e' rimasto sotto deroga

Vedi la sezione in testa. Non e' una deviazione presa qui: e' la deroga del proprietario sotto cui gira tutta l'onda.

**Totale deviazioni:** 1 auto-corretta (Regola 1), 1 imprecisione documentale riportata, 1 deroga ereditata.
**Impatto:** nessuno scope creep. Un solo file di prodotto toccato, come il piano prescrive.

## Cosa questo piano NON prova

**Non esiste un test runner per il prodotto**, e questa sezione lo dice invece di lasciarlo dedurre.

- **Il gate misura la distanza fra due tinte, non la leggibilita' di uno schermo.** Lo stampa da solo: *«A pass says the tints are separable. It never says the door works.»*
- **Che il lampo si legga a distanza di braccio in una stanza buia** e' la riga **1h** di `42-PROCEDURES.md`, e dice `pending`.
- **Che il terzo stato si legga come *gia' registrato* e mai come un rifiuto** e' la riga **1i**, e dice `pending`.
- **Che i semantici si distinguano fra loro alla porta**, e non solo nell'aritmetica del gate, non e' misurato da niente di automatico: le pillole di coda, l'avviso di fine serata e la banda di freschezza ora condividono **una sola tinta d'attenzione** dove prima ne portavano tre (giallo, ambra, violetto). Ognuna porta le proprie parole — e' la mitigazione dichiarata — ma **che quella mitigazione basti in un ingresso al buio e' esattamente cio' che le righe 3o-3s devono osservare.**
- **Che il comportamento sia invariato rispetto a prima della conversione** — criterio 3 — **non e' dimostrabile.** Manca il termine di paragone, in modo permanente (`DEF-42-04`). Cio' che questo piano dimostra e' l'invarianza rispetto al **reperto**, che e' un fatto meccanico su una macchina, non un'osservazione a un ingresso.

## Pronto per il piano successivo

- **42-09** eredita un file la cui palette grezza e' chiusa, e i **42 token legacy** intatti — compresi i tre che stanno in un ramo di ternario (interruttore spento, torcia spenta, riga di cronologia toccabile), che questo piano ha lasciato deliberatamente perche' sono il suo perimetro.
- **42-11** eredita la lista delle deroghe da scrivere nel gate, e il numero da usare: **sei occorrenze in `ScannerClient.tsx`** (cinque gruppo A, una gruppo B) piu' **due in `ScanFlash.tsx`** — otto per occorrenza, sette per riga di tabella. Le due unita' di misura non sono intercambiabili.
- **Avvertenza da portare avanti, con il suo numero:** presa l'idea del lampo come card, l'esclusione della coppia `accetta ↔ pillola` smette di essere vera, e quella coppia misura **2,6** con la pillola dov'e' adesso. **Deve muoversi nello stesso commit.**

---
*Fase: 42-scanner-conversion · Piano 08*
*Completato: 2026-08-18, sotto la deroga del proprietario alla riga 3m di `42-PROCEDURES.md`*

## Self-Check: PASSED

Tre file dichiarati, tre presenti sul disco. Quattro commit dichiarati, quattro
presenti in `git log`. Albero di lavoro pulito.

**Perimetro rispettato, verificato per commit:** sotto `src/` e' stato toccato
**solo** `ScannerClient.tsx` — il piano 42-07 possiede il resto in quest'onda —
e ne' `STATE.md` ne' `ROADMAP.md` sono stati modificati. Il collegamento a
`node_modules`, necessario per `npm run build` e per i gate (che leggono
`node_modules/tailwindcss/theme.css`), e' stato rimosso prima del commit finale
e non e' mai entrato in un indice.
