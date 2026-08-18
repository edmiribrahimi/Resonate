---
phase: 42-scanner-conversion
plan: 06
subsystem: ui
tags: [tailwind, design-tokens, accessibility, colour-vision, scanner, door]

requires:
  - phase: 42-scanner-conversion (42-02)
    provides: il baseline meccanico dello scanner non convertito
  - phase: 42-scanner-conversion (42-03)
    provides: il gate della leggibilita' provato per mutazione, e il nome della costante della pillola
  - phase: 42-scanner-conversion (42-04)
    provides: la tabella delle sostituzioni, deroga per deroga
  - phase: 42-scanner-conversion (42-05)
    provides: le due modifiche di gate che non erano ancora applicabili
provides:
  - i tre esiti della porta con i colori misurati, nei DUE posti in cui sono disegnati
  - l'inchiostro del lampo su --ground, su tutti e quattro i siti
  - CONNECTIVITY_PILL — la pillola di connettivita' leggibile da un gate
  - il primo exit 0 di scripts/verify-scan-legibility.mjs
affects: [42-08, 42-09, 42-11, 42-12]

tech-stack:
  added: []
  patterns:
    - "un colore che un gate deve leggere vive in una costante nominata, non inline"
    - "un commento nomina lo stato, mai la tinta: la tinta vive in un lookup e una frase che la scrive invecchia da sola"
    - "un'affermazione ritirata resta visibile accanto alla misura che la smentisce"

key-files:
  created:
    - .planning/phases/42-scanner-conversion/42-06-GATE-READING.md
  modified:
    - src/components/scanner/ScanFlash.tsx
    - src/app/(admin)/admin/scanner/ScannerClient.tsx
    - .planning/phases/42-scanner-conversion/deferred-items.md

key-decisions:
  - "La pillola di connettivita' viene SOLLEVATA, non convertita: il colore resta yellow-500 e il piano 42-08 decide cosa diventa"
  - "L'inchiostro va su --ground su tutti e quattro i siti del lampo, e le due alpha cadono: un inchiostro traslucido non supera 3,36 su nessuno dei tre riempimenti"
  - "I due commenti resi falsi da questo stesso commit sono stati riscritti per STATO invece che per tinta, cosi' che non tornino stantii"
  - "La riga 3m di 42-PROCEDURES.md resta pending e nessuna osservazione le e' stata inventata"

patterns-established:
  - "Prosa come confine di fiducia: una frase che asserisce l'assenza di un difetto va sostituita da una misura, con data, metodo e gate nominati"
  - "Correggere una frase falsa e crearne un'altra nello stesso passaggio e' lo stesso difetto spostato di venti righe"

requirements-completed: [DS-04]

duration: ~40min
completed: 2026-08-18
---

# Fase 42 Piano 06: I tre esiti della porta prendono i colori misurati — Summary

**Il terzo stato passa dall'ambra al semantico di completamento nei due posti in cui e' disegnato, il rifiuto scende di un passo, l'inchiostro del lampo va su `--ground` su tutti e quattro i siti, la pillola di connettivita' e' sollevata in `CONNECTIVITY_PILL` — e `verify-scan-legibility.mjs` esce 0 per la prima volta, con minimo 14,0 su una soglia di 10.**

## Performance

- **Durata:** ~40 min
- **Task:** 3 su 3, piu' una correzione di deviazione
- **File di prodotto modificati:** 2
- **Commit:** 4

## La deroga sotto cui questo piano ha girato

**Il Task 1 era un `checkpoint:human-verify` bloccante, ed e' stato risolto prima dell'esecuzione — non da un'osservazione, ma da una decisione.**

La riga **3m** di `42-PROCEDURES.md` — *il door pass sullo scanner NON convertito* — dice, alla lettera:

> `Result: pending — e non e' piu' riempibile. Vedi la deroga qui sopra: la riga non e' stata eseguita finche' lo scanner era non convertito, e da quel momento non ha piu' un oggetto da misurare.`

Le righe **3o, 3p, 3q, 3r, 3s** dicono `pending`, nudo. **Nessuna delle sei porta un'osservazione con un orario.**

Questo piano ha girato lo stesso **sotto una deroga del proprietario datata 2026-08-18 e registrata nel commit `5e85d6b`** in tre posti: `DEF-42-04` in `deferred-items.md`, il blocco di deroga alla riga 3m, e i Blockers di `STATE.md`.

**Cosa costa, e va ripetuto invece che dedotto:**

1. **Il criterio 3 — *ogni comportamento dello scanner e' invariato rispetto a prima della conversione* — non e' piu' chiudibile.** Non e' aperto: e' privo di un termine di paragone, in modo permanente. Il codice su cui il *prima* andava misurato **non esiste piu' da questo piano in poi.**
2. **La riga 3n perde il proprio oggetto.** Eseguita da sola produce una descrizione, non un confronto.
3. **Il secondo motivo del vincolo d'ordine resta intatto e non e' coperto dalla deroga:** alla prima porta reale, correzioni di comportamento mai esercitate (fasi 31 e 39) e una superficie ridipinta girano **insieme**, senza error tracking. Rischio accettato, non rimosso.

**Nessuna osservazione e' stata inventata per la riga 3m** — non un test locale, non uno screenshot, non un'aspettativa ragionata. La lettura e' registrata in `42-06-GATE-READING.md`, che dichiara di non essere quell'osservazione e di non sostituirla.

## Realizzazioni

- **I tre esiti dicono la stessa cosa nei due posti in cui la porta li disegna.** Gli stessi tre stati sono disegnati due volte con gli **stessi** tre path SVG — a schermo pieno nel lampo, e come segno piccolo nella cronologia. Ridipingerne uno solo avrebbe fatto dire violetto al verdetto e ambra alla registrazione dello **stesso** scan, tre secondi dopo, sulla stessa superficie.
- **Le due frasi che negavano il difetto sono corrette, con l'affermazione ritirata lasciata visibile.** Erano due, in due file, e ognuna asseriva dall'altro lato che la collisione ambra/giallo era stata evitata scegliendo l'ambra. Non lo era.
- **`verify-scan-legibility.mjs` esce 0 per la prima volta.** Prima di questo piano rifiutava con exit **2** — *nothing was measured* — perche' la pillola non aveva un ancoraggio testuale da leggere.
- **Nessun comportamento si e' mosso.** Provato per diff, non affermato.

## Task Commits

1. **Task 1 — la lettura del cancello d'ordine** · `78f8ce5` (docs)
2. **Task 2 — il lampo: tre riempimenti, un inchiostro, un paragrafo corretto** · `f5ae994` (feat)
3. **Task 3 — la cronologia, il secondo commento falso, la pillola in costante** · `2ad34de` (feat)
4. **Deviazione — i due commenti resi falsi da questo stesso commit** · `268672a` (fix)

## Le misure

### Il gate della leggibilita' — `SCAN_LEGIBILITY_OK`, exit 0

Metodo dichiarato dal gate a ogni esecuzione: Brettel/Vienot/Mollon 1997 a due semipiani, CIEDE2000, `oklch` → sRGB lineare, composito sul token di fondo in luce lineare. Soglia **10**, pavimento del glifo **3:1** (WCAG 1.4.11 *grafica* — il glifo e' un segno tracciato grande, non testo corrente).

| coppia | normale | protan | deuter | tritan | **min** |
|---|---|---|---|---|---|
| accetta ↔ rifiuta | 78,1 | 38,7 | **14,0** | 64,9 | **14,0** |
| accetta ↔ terzo stato | 53,4 | 56,6 | 48,2 | **19,8** | 19,8 |
| rifiuta ↔ terzo stato | 42,3 | 51,1 | 52,1 | **31,9** | 31,9 |
| terzo stato ↔ pillola | 61,8 | 60,9 | 57,9 | **28,3** | 28,3 |
| rifiuta ↔ pillola | 43,8 | 40,7 | **22,4** | 28,4 | 22,4 |

**Minimo della terna: 14,0**, sulla coppia accettazione/rifiuta in deuteranopia — la stessa cifra che `42-03-FINDINGS.md` §3 aveva gia' misurato in modo indipendente.

Contrasto dell'inchiostro sul riempimento composito: accettazione **8,18:1**, terzo stato **5,49:1**, rifiuto **3,87:1** — tutti sopra il pavimento grafico di 3.

**La coppia `accetta ↔ pillola` e' ESCLUSA**, e il gate stampa la ragione a ogni esecuzione: il lampo e' ancorato a tutti e quattro i bordi, quindi copre l'intestazione in cui la pillola vive, e la confusione non ha un momento in cui accadere. **L'esclusione e' vera per costruzione, non per fiducia**, e il giorno in cui il lampo smettesse di coprire il viewport il gate misurerebbe quella coppia come tutte le altre.

### Le due cifre che il commento negava

Misurate il 2026-08-18, direzione 1 di mutazione di `42-03-FINDINGS.md`, con il terzo stato rimesso sull'ambra di prima:

- terzo stato ↔ pillola: **4,5** in deuteranopia
- accettazione ↔ terzo stato: **7,0** in protanopia

su una soglia di 10. **La seconda il commento non l'aveva nemmeno nominata:** il difetto che dichiarava assente non era uno solo.

### L'invarianza del comportamento, provata per diff

Cattura fresca con `node scripts/capture-scanner-baseline.mjs`, confrontata con `42-BASELINE.md` sulla regione fra i due marcatori, con i **riferimenti di riga normalizzati** (le righe si spostano perche' il file e' cresciuto di una costante e di prosa).

**Il diff normalizzato riporta due sole righe**, e sono i due riempimenti che questo piano esiste per cambiare:

```
< | already_recorded | `already_recorded` | `bg-amber-500/90` | **2500** | L |
< | error            | `error`            | `bg-red-500/90`   | **2000** | L |
---
> | already_recorded | `already_recorded` | `bg-sem-done/90`  | **2500** | L |
> | error            | `error`            | `bg-red-600/90`   | **2000** | L |
```

Identici, valore per valore: i **tre dwell** (1500 / 2500 / 2000), le **tre aptiche**, la **mappatura esito → aptica**, i **26 siti di `showFlash`** con i loro esiti e titoli, l'**unione degli esiti**, i **sei path dei glifi**, le **costanti della coda** (`DB_VERSION` 5 compreso), la **finestra di doppia lettura** (20 s), la **configurazione della fotocamera** (`fps` 15, `qrbox` 280×280, `facingMode`) e le **quattro tabelle di messaggi**.

### Il build

`npm run build` — exit **0**, tre volte (dopo il Task 2, dopo il Task 3, dopo la correzione). Include il typecheck di Next.

## File modificati

- **`src/components/scanner/ScanFlash.tsx`** — i tre riempimenti (`bg-green-500/90` invariato per deroga, `bg-amber-500/90` → `bg-sem-done/90`, `bg-red-500/90` → `bg-red-600/90`), l'inchiostro `text-ground` su tutti e quattro i siti con le due alpha cadute, e il paragrafo del docblock riscritto.
- **`src/app/(admin)/admin/scanner/ScannerClient.tsx`** — i glifi della cronologia (`text-green-500` invariato, `text-amber-500` → `text-sem-done`, `text-red-500` → `text-red-600`), il commento della pillola corretto, `CONNECTIVITY_PILL` dichiarata a `:430` con entrambi i rami che ci leggono, e due commenti resi falsi da questo commit riscritti per stato.
- **`.planning/phases/42-scanner-conversion/42-06-GATE-READING.md`** — la lettura del cancello d'ordine.
- **`.planning/phases/42-scanner-conversion/deferred-items.md`** — `DEF-42-05`.

## Decisioni prese

**1. La pillola di connettivita' e' SOLLEVATA, non convertita — il colore resta `yellow-500`.**

Le fonti divergevano e la divergenza andava risolta, non aggirata:

- `42-03-FINDINGS.md` §1, che fissa il nome della costante, dice alla lettera: *«Il colore non cambia: `yellow-500` resta `yellow-500`. Questo e' un sollevamento, non una conversione.»*
- `42-MAPPING.md` §5 asserisce `offlineDot: "bg-sem-warn"` come cio' che *fara' il piano 42-06*.

**Chi decide e' il piano 42-08**, che lo dice nel proprio testo: legge *«the connectivity pill in its constant»* — cioe' si aspetta la costante gia' creata — e istruisce *«the connectivity pill takes the branch the mapping recorded»*. Il mapping ha simulato lo **stato finale** dei due piani insieme, non il confine fra loro. Il piano 42-06 dice inoltre, esplicitamente, che la palette grezza rimanente di questo file non si muove qui.

**Conseguenza misurata, non supposta:** il gate esce 0 in entrambi i rami, e le cifre stampate — terzo stato ↔ pillola **28,3**, rifiuta ↔ pillola **22,4** — coincidono esattamente con la riga di confronto *«con la pillola lasciata a `yellow-500` grezzo»* di `42-MAPPING.md` §5.2. Il ramo preso e' identificabile dai numeri, non dalla parola.

**2. L'inchiostro va su `--ground` su tutti e quattro i siti, e le due alpha cadono.**

Non solo il glifo: anche titolo, sottotitolo e suggerimento. La ragione e' una misura — **il massimo che un inchiostro traslucido raggiunge su uno qualsiasi dei tre riempimenti e' 3,36**, quindi una gerarchia costruita sulla trasparenza e' una gerarchia costruita sull'illeggibilita'. La gerarchia dei tre livelli ora poggia su corpo, peso e posizione.

**Residuo dichiarato, non nascosto:** sottotitolo e suggerimento sono testo corrente (pavimento 4,5:1) e **restano a 3,87 sul rifiuto**. La decisione migliora **ogni singola** delle sei celle — oggi fallivano tutte e sei — e ne lascia una insufficiente. Tenere il bianco sul solo rifiuto ne avrebbe rotte due per ripararne una, e avrebbe spaccato l'inchiostro per stato.

**3. I due commenti resi falsi da questo stesso commit sono riscritti per stato, non per tinta.**

Vedi Deviazioni.

## Deviazioni dal piano

### 1. [Regola 1 — Bug] Due commenti resi falsi da questo stesso commit

- **Trovato durante:** Task 3, alla verifica finale dei `grep` residui.
- **Difetto:** spostato il terzo stato sul semantico, due frasi lo chiamavano ancora ambra — a `:498` (*«amber means admitted, look at this afterwards»*) e tre righe sopra il glifo appena ridipinto nella catena della cronologia (*«The same amber as the flash»*). **Sarebbe stato questo commit a crearle.** Correggere due frasi false e produrne altre due nello stesso passaggio e' il difetto **T-42-18** spostato di venti righe, non chiuso.
- **Correzione:** entrambe riscritte **per stato invece che per tinta**. Non e' una parafrasi: la tinta vive in un lookup solo, e un commento che la scrive invecchia da solo — che e' esattamente come le due frasi corrette da questo piano erano diventate false.
- **Verificato:** `npm run build` exit 0, gate exit 0 con matrice invariata.
- **Commit:** `268672a`

### 2. Fuori perimetro, registrato e non corretto — `DEF-42-05`

Una terza frase nomina l'ambra e **non e' stata toccata**: dice *«A failure here costs a later amber flag instead of a later amber flag»*, cioe' non afferma nulla. Due difetti indipendenti in una riga: la costruzione *X invece di X* e la tinta stantia. Il primo e' **preesistente e non causato da questo commit**, e ripararlo richiede di sapere quale fosse il termine di paragone inteso — una domanda a chi ha scritto il percorso, non una sostituzione di stringa. Registrata come `DEF-42-05`, assegnata al piano **42-08**.

### 3. Tre criteri di accettazione soddisfatti nella sostanza e non alla lettera

Vanno dichiarati, perche' un criterio dato per verde quando la sua lettera non e' rispettata e' esattamente il difetto che questa fase esiste per chiudere.

| Criterio | Lettera | Stato reale |
|---|---|---|
| `grep -c 'variant\|className\?:'` su `ScanFlash.tsx` → **0** | 0 | **1** — ed e' la riga 9 del docblock, **preesistente e intatta**, che *vieta* le varianti. Nessuna prop, nessuna variante, nessun `className` di sovrascrittura e' dichiarato. Portarla a 0 significherebbe cancellare la propria proibizione — l'anti-pattern che `globals.css` nomina per nome (*«states its rule by OMITTING the string it forbids»*) |
| `grep -c 'text-amber-500'` su `ScannerClient.tsx` → **0** | 0 | **1** — riga 2949, la **pillola di coda *trattenuta***, che il mapping assegna a `text-sem-warn` e che il piano **42-08** possiede. Il piano 42-06 vieta esplicitamente di muovere la palette grezza rimanente di questo file. Nella cronologia — il perimetro di questo piano — le occorrenze sono **0** |
| cattura fresca senza scarti nel blocco 1 | nessuno scarto | il blocco 1 tabella **anche la colonna `bg`**, che questo piano cambia per progetto. I **dwell** del blocco 1 sono identici; lo scarto e' il lavoro del piano, non una regressione |

---

**Totale deviazioni:** 1 auto-corretta (Regola 1), 1 registrata e differita, 3 divergenze di criterio dichiarate.
**Impatto:** nessuno scope creep. La correzione era necessaria per non introdurre il difetto che il piano chiude.

## Cosa questo piano NON prova

**Non esiste un test runner per il prodotto**, e questa e' la sezione che lo dice invece di lasciarlo dedurre.

- **Il gate misura la distanza fra due tinte, non la leggibilita' di uno schermo.** Lo stampa da solo a ogni esecuzione: *«A pass says the tints are separable. It never says the door works.»*
- **Che il lampo si legga a distanza di braccio in una stanza buia** e' la riga **1h** di `42-PROCEDURES.md`, e dice `pending`.
- **Che il terzo stato si legga come *gia' registrato* e mai come un rifiuto** e' la riga **1i**, e dice `pending`.
- **Che il comportamento sia invariato rispetto a prima** — criterio 3 — **non e' piu' dimostrabile.** Non e' aperto: manca il termine di paragone, in modo permanente (`DEF-42-04`).

## Pronto per il piano successivo

- **42-08** eredita: la costante `CONNECTIVITY_PILL` gia' in piedi, con `offlineDot` letto dal gate ed entrambi i rami che ci leggono — deve solo decidere il **valore** secondo il ramo del mapping. Eredita anche `DEF-42-05` e la riga 2949.
- **42-11** eredita: il gate verde e la lista delle deroghe da scrivere — accettazione `green-500` (gruppo A) e rifiuto `red-600` (gruppo B) sono deroghe **dichiarate e argomentate**, non omissioni.
- **Avvertenza da portare avanti, con il suo numero:** se un giorno viene presa l'idea differita *«il lampo come card invece che a schermo pieno»*, l'esclusione della coppia `accetta ↔ pillola` **smette di essere vera**, e quella coppia oggi misura **5,5** con il giallo grezzo e **2,6** con l'ambra semantica. **La pillola deve muoversi nello stesso commit.**

---
*Fase: 42-scanner-conversion · Piano 06*
*Completato: 2026-08-18, sotto la deroga del proprietario registrata nel commit `5e85d6b`*

## Self-Check: PASSED

Quattro file dichiarati, quattro presenti sul disco. Cinque commit dichiarati,
cinque presenti in `git log`. Albero di lavoro pulito; il symlink a
`node_modules` — necessario per `npm run build` e per il gate, che legge
`node_modules/tailwindcss/theme.css` — e' stato rimosso prima del commit finale
e non e' mai entrato in un indice.
