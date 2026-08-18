# Fase 42 — la mappa delle sostituzioni

**Data:** 2026-08-18
**Perimetro:** i cinque file recintati da `PHASE_42_PATHS`
**Stato:** deciso in wave 1, **applicato da nessuno**. Questo piano non ha
modificato una sola riga sotto `src/`.

---

## 0. Cosa e' questo documento, e cosa non e'

E' la tabella che i piani di conversione **applicano**. Non e' un suggerimento e
non e' un inventario: ogni riga porta un target, e nessuna riga dice *si decide
dopo*.

La ragione e' una sola, ed e' misurata: `ScannerClient.tsx` ha **3449 righe** e
il file peggiore del progetto per budget di contesto (`ai-engineering.md`, gate
*context budget*: cinque moduli, 38.240 byte, margine 1.378 token). Cento
decisioni prese **dentro** quel file sono cento decisioni che nessuno rilegge. La
tabella esiste perche' la conversione sia un'applicazione.

**Cosa questo documento non decide:** se lo scanner si converta. Quello e'
D-42-04 e sta dietro il primo door pass su superficie non convertita
(`42-PROCEDURES.md`, riga 3m, oggi `pending`).

---

## 1. Come sono state derivate le righe

Con **il matcher del gate**, non con una regex scritta a mano: uno script di
scarto ha letto `COLOUR_UTILITY_PREFIXES`, `PALETTE_NAMES` e
`LEGACY_TOKEN_NAMES` **dal testo di `scripts/verify-conversion.mjs`** e ha
ricostruito `utilityPattern`, `isToleratedScrim` e `findUtilityHits` nella loro
forma esatta, leggendo le righe attraverso lo stesso stripper di commenti
(`scripts/lib/comments.mjs`, `liveLinesFrom`). Una regex a mano che deriva dal
gate produrrebbe una tabella su cui il gate non e' mai d'accordo — cioe'
esattamente il difetto che questa mappa esiste per impedire.

> ⚠ `scripts/verify-conversion.mjs` contiene **byte NUL** e il `grep` di default
> di questa macchina lo salta in silenzio. Tutto cio' che e' stato letto da quel
> file qui dentro e' passato da `LC_ALL=C /usr/bin/grep` o dallo strumento di
> lettura.

### I totali, misurati

| File | palette grezza | token legacy |
|---|---|---|
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` | **57** | **42** |
| `src/components/scanner/ScanFlash.tsx` | **7** | 0 |
| `src/app/(admin)/admin/scanner/DoorSurface.tsx` | **0** | 0 |
| `src/app/(admin)/admin/scanner/page.tsx` | **0** | 0 |
| `src/app/(admin)/door/page.tsx` | **0** | 0 |
| **totale perimetro** | **64** | **42** |

**Sono i numeri che il piano si aspettava — 57 e 7 — e non c'e' nulla da
riconciliare.** I tre file a zero sono elencati **come file a zero**, non
omessi: un lettore deve poter distinguere *controllato e vuoto* da *non
controllato*.

**Nessuno scrim tollerato nel perimetro.** `isToleratedScrim` perdona esattamente
una forma — il nero traslucido attraverso il prefisso di sfondo — e in questi
cinque file non ne compare nemmeno uno. Non c'e' nessuno scrim da lasciare in
pace, ed e' meglio saperlo che presumerlo.

### La conferma dall'altro lato

Con le due pagine della porta dichiarate su un ramo usa-e-getta (§5.1), il gate
vero conta:

```
✗ A  128 raw palette utilit(y/ies) reachable from a converted surface
✗ B   84 legacy token utilit(y/ies) on a converted surface
```

**128 = 64 × 2** e **84 = 42 × 2**: i due percorsi della porta — `/admin/scanner`
e `/door` — raggiungono gli stessi file, e il gate li conta una volta per
superficie. La tabella qui sotto ha **una riga per occorrenza**, non per
raggiungimento.

---

## 2. Le politiche — decisioni, non preferenze

**P1 — Il vocabolario dell'accettazione resta grezzo, e si dichiara.**
Il set semantico **non contiene un verde** e la fase 40 ha rifiutato di
inventarne uno (`globals.css:169-173`, *«THE SET CONTAINS NO GREEN, AND PHASE 40
DOES NOT INVENT ONE»*). Quindi ogni sito che alla porta dice *questo e' passato*
tiene `green-500`: il riempimento del flash, il glifo di successo nella
cronologia, la pillola *Online* e il segno di arrivato nella lista presenze.
Sono **quattro deroghe dichiarate per utility e per file** (§3) — mai un file
intero escluso dalla misura, che e' l'uscita di sicurezza vietata per nome da
`42-RESEARCH.md` §9 e da T-42-10.

**P2 — Il vocabolario del rifiuto e' il flash e la sua eco, e scurisce di un
passo.** `bg-red-500/90` diventa `bg-red-600/90` nel flash; il glifo d'errore
della cronologia diventa `text-red-600`. Cosi' il verdetto e la registrazione
dello **stesso scan** dicono la stessa cosa. Sono due deroghe sullo stesso
argomento.

**P2b — Ogni altro rosso del file NON e' il vocabolario del rifiuto.** L'errore
della fotocamera, la coda che *non ha potuto registrare*, l'avviso di cache
stantia, il ramo d'errore della banda di freschezza: quelli prendono il semantico
critico. Il rifiuto e' *un esito di scansione*; un errore di sistema e' un'altra
cosa, e dipingerli uguali e' la stessa confusione che questa fase chiude altrove.

**P3 — Il terzo stato e' `--sem-done`, nei due posti in cui e' disegnato** — il
flash (`ScanFlash.tsx:91`) e la cronologia (`ScannerClient.tsx:3296`). Il secondo
e' il reperto di `42-RESEARCH.md` §4.3: gli stessi tre stati sono disegnati due
volte, con gli **stessi path SVG**. Cambiarne uno solo farebbe dire violetto al
verdetto e ambra alla cronologia dello stesso scan, tre secondi dopo.

**P4 — La pillola *Offline* prende il semantico ambra**, provato prima di essere
scritto (§5). La legalita' della scelta poggia sulla coincidenza registrata in
`globals.css:160-163` — l'ambra semantica **e'** il colore di identificazione di
SunSet — e sulla mitigazione permanente che ne discende: **qualunque cosa ambra
porta del testo**. La pillola porta la parola *Offline*.

**P5 — Gli altri avvisi e stati di coda prendono il semantico ambra**: l'avviso
di fine serata e il suo *scan anyway*, le pillole *pending* e *trattenuta*, il
ramo *live* della banda di freschezza, lo stato acceso della torcia.

**P6 — Nessun sito violetto prende `--sem-done`** (§4).

**P7 — Il bianco sul riempimento d'accento a `ScannerClient.tsx:2827` prende
`--ground`.** E' la violazione che `globals.css:176-178` nomina e che il gate
registra gia' come *finding A2* a **2,91:1**. Con `--ground` misura **6,85:1**.

**P8 — Nessun colore nuovo.** Ogni target e' un token gia' dichiarato **e gia'
esposto**: `--color-ground`, `--color-sem-crit`, `--color-sem-warn`,
`--color-sem-info`, `--color-sem-done` esistono a `globals.css:367,391,392,393,394`.
Verificato per target distinto, non per famiglia.

---

## 3. Le deroghe dichiarate — per utility, per file

**Nessuna e' un'esclusione di file.** T-42-10 lo vieta per nome: un'esclusione su
`ScannerClient.tsx` lascerebbe 3449 righe non misurate per sempre.

### Gruppo A — il vocabolario dell'accettazione (`green-500`)

| File | Riga | Utility | Cosa dipinge |
|---|---|---|---|
| `ScanFlash.tsx` | 78 | `bg-green-500/90` | il riempimento del flash di accettazione |
| `ScannerClient.tsx` | 2799 | `bg-green-500/15`, `text-green-500` | la pillola *Online* |
| `ScannerClient.tsx` | 2800 | `bg-green-500` | il punto della pillola *Online* |
| `ScannerClient.tsx` | 3282 | `text-green-500` | il glifo di successo nella cronologia |
| `ScannerClient.tsx` | 3399 | `text-green-500` | il segno di arrivato nella lista presenze |

**L'argomento, uno per tutte e cinque:** il set semantico non ha un colore di
accettazione, e inventarne uno e' del proprietario. Sostituirle con il semantico
piu' vicino significherebbe dire *completato* dove il prodotto dice *passato* —
due fatti diversi alla porta.

### Gruppo B — il vocabolario del rifiuto (`red-600`, scurito di un passo)

| File | Riga | Da | A |
|---|---|---|---|
| `ScanFlash.tsx` | 106 | `bg-red-500/90` | `bg-red-600/90` |
| `ScannerClient.tsx` | 3310 | `text-red-500` | `text-red-600` |

**L'argomento:** D-42-01. Portare il rifiuto su `--sem-crit` lo metterebbe a
**2,2** dal colore dei pulsanti primari — un rifiuto dipinto della tinta che
ovunque nel prodotto significa *premi qui* (`42-03-FINDINGS.md` §4.4, confermato
dal gate). `red-700` misurerebbe meglio ma spegnerebbe la luminanza del lampo, e
alla porta la luminanza e' il canale che si legge con la coda dell'occhio.

**Le due righe viaggiano insieme** o il verdetto e la sua eco divergono.

### Gruppo C — la pillola *Offline*

**Vuoto.** La deroga di riserva prevista dal piano **non e' stata presa**: la
pillola prende `--sem-warn` e il gate esce 0. Il ramo, e i numeri che l'hanno
deciso, stanno al §5.

### Cosa questo significa per il gate

Check A restera' **rosso** su queste sette utility finche' non avranno una voce
di deroga nel gate stesso. **Scriverla e' lavoro di un piano di conversione, non
di questo**: qui c'e' la decisione e il suo argomento; li' c'e' la riga di
codice. Un elenco in un documento non e' una deroga finche' il gate non la legge.

---

## 4. Il violetto — la collisione decisa con il suo numero

**Quattro siti violetti**, e nessuno prende `--sem-done`.

| Riga | Utility | Cosa e' | Target |
|---|---|---|---|
| 2695 | `text-purple-400` | contatore *(+N guest list)* nel selettore di serata | `text-sem-info` |
| 3022 | `text-purple-400` | contatore *(+N guest list)* sopra la lista presenze | `text-sem-info` |
| 3388 | `bg-purple-500/20`, `text-purple-400` | badge *Guest List* nella lista presenze | `bg-sem-info/20`, `text-sem-info` |
| 2934-2935 | `bg-purple-500/15`, `text-purple-400`, `bg-purple-400` | pillola *Undone at the door, held on this device* | `bg-sem-warn/15`, `text-sem-warn`, `bg-sem-warn` |

### La misura che decide, e la sua provenienza

Distanze sui token grezzi, quattro modelli, misurate con l'aritmetica del gate
di questa fase (Brettel/Viénot/Mollon 1997 a due semipiani, CIEDE2000):

| Coppia | normale | protan | deuter | tritan | **min** |
|---|---|---|---|---|---|
| `purple-400` ↔ `--sem-done` | 7,7 | **4,1** | 5,7 | 14,8 | **4,1** |
| `purple-500` ↔ `--sem-done` | 12,2 | 10,3 | **5,8** | 15,4 | **5,8** |
| `purple-400` ↔ `--sem-info` | 15,1 | 13,6 | 11,8 | **9,0** | 9,0 |
| `--sem-done` ↔ `--sem-info` | 12,1 | 12,1 | 10,5 | **6,2** | 6,2 |
| `--sem-done` ↔ `--sem-warn` | 52,5 | 55,5 | 54,3 | **27,9** | 27,9 |

> ⚠ **Una correzione che questa tabella porta con se'.** `42-CONTEXT.md` §D-42-02
> dava `--sem-done` a **4,8** da `purple-400` e `42-RESEARCH.md` §4.3 a **8,0**.
> Misurato qui con lo stesso metodo del gate: **4,1 al minimo, 7,7 a vista
> normale.** E' la stessa specie di divergenza che `42-03-FINDINGS.md` §4.3 ha
> gia' arbitrato su altre celle — la conclusione non cambia, il numero che si
> cita si'.

### La frase che giustifica la decisione

Alla porta `--sem-done` **significa gia' qualcosa**: *questo scan e' gia' stato
registrato*. Un badge di categoria — *Guest List* — dipinto della tinta che
significa un esito **e' lo stesso difetto dell'ambra che si legge come giallo,
spostato su un'altra coppia**. Non e' una questione di distanza: a 4,1 in
protanopia i due sarebbero anche indistinguibili, ma il problema resterebbe
anche se distassero venti.

**Perche' `--sem-info` per i tre siti di guest list.** E' *l'inchiostro
terziario* (`--sem-info` **e'** `--muted`, coincidenza registrata a
`globals.css:164-167`), e la degradazione dichiarata e' che un'informazione letta
come testo terziario e' *meno enfatica*, non *sbagliata*. Un conteggio di guest
list e' esattamente questo: contesto, non esito. Regge 7,14:1 come inchiostro sul
fondo.

**Perche' `--sem-warn` per la pillola degli annullamenti.** *Undone at the door*
non e' una categoria: e' una cosa che chiede attenzione, e prende il semantico
che significa attenzione. Sta a **27,9** dal terzo stato — la coppia piu' larga
di tutte quelle in gioco — quindi non ricrea la collisione altrove. E porta le
proprie parole, che e' la mitigazione permanente dell'ambra.

**Il costo dichiarato:** `--sem-done` e `--sem-info` distano **6,2** in
tritanopia. Il terzo stato del flash e un badge di guest list non compaiono mai
insieme — il flash copre il viewport — e nella cronologia i due non stanno sulla
stessa riga. **Ma non e' una distanza comoda, e se un giorno un badge di
categoria finisse accanto a un esito su una stessa riga, questa cella e' quella
che si rompe.** Scritta qui, non scoperta li'.

---

## 5. La pillola *Offline* — provata prima di essere scritta

### 5.1 Il ramo usa-e-getta

`D-42-04` vieta ogni modifica alla porta prima del primo door pass, quindi la
prova e' avvenuta su un ramo `scratch-42-04-pill` creato da `011eac7`, mai
committato, e cancellato. E' il modello che `42-03-FINDINGS.md` §2 ha stabilito:
si misura, si prova il ritorno, non si tiene nulla.

Sul ramo e' stato simulato cio' che fara' il piano 42-06 — la pillola sollevata
nella costante `CONNECTIVITY_PILL` con la chiave `offlineDot`, nella forma
fissata da `42-03-FINDINGS.md` §1 — insieme alla terna decisa.

**Asserzione della mutazione, prima di leggerne l'esito** (`ai-engineering.md`,
gate *prova per mutazione*):

```
LC_ALL=C /usr/bin/grep -c 'bg: "bg-sem-done/90"'      …/ScanFlash.tsx      → 1
LC_ALL=C /usr/bin/grep -c 'bg: "bg-red-600/90"'       …/ScanFlash.tsx      → 1
LC_ALL=C /usr/bin/grep -c 'text-ground'               …/ScanFlash.tsx      → 1
LC_ALL=C /usr/bin/grep -c 'bg: "bg-amber-500/90"'     …/ScanFlash.tsx      → 0
LC_ALL=C /usr/bin/grep -c 'offlineDot: "bg-sem-warn"' …/ScannerClient.tsx  → 1
```

### 5.2 L'esito, e il ramo preso

```
node scripts/verify-scan-legibility.mjs   → SCAN_LEGIBILITY_OK, exit 0
```

| coppia | normale | protan | deuter | tritan | **min** |
|---|---|---|---|---|---|
| accetta ↔ rifiuta | 78,1 | 38,7 | **14,0** | 64,9 | **14,0** |
| accetta ↔ terzo stato | 53,4 | 56,6 | 48,2 | **19,8** | 19,8 |
| rifiuta ↔ terzo stato | 42,3 | 51,1 | 52,1 | **31,9** | 31,9 |
| terzo stato ↔ pillola | 52,8 | 55,8 | 54,5 | **29,0** | 29,0 |
| rifiuta ↔ pillola | 36,5 | 40,2 | **23,7** | 29,4 | 23,7 |

**Nessuna coppia misurata scende sotto la soglia di 10, quindi la riserva non
scatta: la pillola prende `--sem-warn`, e il Gruppo C delle deroghe resta
vuoto.** Il minimo della terna resta **14,0**, sulla coppia accettazione/rifiuta
in deuteranopia — la stessa cifra di `42-03-FINDINGS.md` §3, invariata perche' la
pillola non entra in quella coppia.

**Per confronto, sullo stesso albero, con la pillola lasciata a `yellow-500`
grezzo:** terzo stato ↔ pillola **28,3**, rifiuta ↔ pillola **22,4** — cioe'
esattamente le cifre di `42-03-FINDINGS.md` §3, riprodotte. Il semantico e' di un
soffio **piu' distante** su entrambe le coppie misurate.

### 5.3 Il costo che il semantico porta, e che il giallo non portava

C'e' una coppia che **non** e' misurata finche' il flash copre il viewport, ed e'
l'unica in cui l'ambra semantica sta peggio del giallo:

| accetta ↔ pillola | normale | protan | deuter | tritan | **min** |
|---|---|---|---|---|---|
| con `yellow-500` | 39,3 | **5,5** | 13,4 | 49,9 | **5,5** |
| con `--sem-warn` | 45,3 | **2,6** | 11,7 | 50,4 | **2,6** |

Il gate la esclude, e l'esclusione e' vera **per costruzione, non per fiducia**:
il flash e' ancorato a tutti e quattro i bordi, quindi copre l'intestazione in
cui la pillola vive e la confusione non ha un momento in cui accadere. La
direzione 5 di mutazione di `42-03-FINDINGS.md` ha gia' provato che il gate
**fallisce chiuso** il giorno in cui quella premessa cade.

**E questo e' il prezzo, misurato adesso:** l'idea differita *«il rifiuto su
fondo scuro / il flash come card invece che a schermo pieno»* (`42-CONTEXT.md`
§Deferred) costava **5,5**; con la pillola sul semantico costa **2,6**. Se un
giorno quell'idea viene presa, **la pillola deve muoversi nello stesso commit.**
Non e' una ragione per non prendere il semantico oggi — e' una ragione per
scrivere il numero prima, invece di scoprirlo dopo.

### 5.4 Il ritorno, provato invece che dichiarato

```
git checkout -- <i due file, per percorso esatto>
LC_ALL=C /usr/bin/grep -c 'bg: "bg-amber-500/90"' …/ScanFlash.tsx      → 1
LC_ALL=C /usr/bin/grep -c 'CONNECTIVITY_PILL'     …/ScannerClient.tsx  → 0
git status --porcelain -- src/                                         → (vuoto)
git branch --list | grep scratch                                       → (nessuna riga)
```

Nessun `git clean`, nessun reset dell'albero: dentro un worktree quelle due
operazioni cancellano il lavoro di altre onde, ed e' un precedente gia' pagato da
questo repository.

---

## 6. La tabella della palette grezza — 57 righe in `ScannerClient.tsx`

Una riga per occorrenza. La colonna *regione* e' quella di `42-RESEARCH.md` §4.2,
che e' l'unica che dice **chi guarda quella cosa alle due di notte**.

| Riga | Utility | Regione | Target |
|---|---|---|---|
| 2695 | `text-purple-400` | selettore di serata — contatore guest list | `text-sem-info` |
| 2799 | `bg-green-500/15` | pillola *Online* | **deroga A** — invariata |
| 2799 | `text-green-500` | pillola *Online* | **deroga A** — invariata |
| 2800 | `bg-green-500` | pillola *Online*, il punto | **deroga A** — invariata |
| 2804 | `bg-yellow-500/15` | pillola *Offline* | `bg-sem-warn/15` |
| 2804 | `text-yellow-500` | pillola *Offline* | `text-sem-warn` |
| 2805 | `bg-yellow-500` | pillola *Offline*, il punto | `bg-sem-warn` |
| 2827 | `text-white` | interruttore dello scanner, ramo acceso | `text-ground` — P7, da 2,91:1 a 6,85:1 |
| 2856 | `border-yellow-500/30` | avviso di fine serata | `border-sem-warn/30` |
| 2856 | `bg-yellow-500/10` | avviso di fine serata | `bg-sem-warn/10` |
| 2857 | `text-yellow-500` | avviso di fine serata | `text-sem-warn` |
| 2865 | `bg-yellow-500/20` | *scan anyway* | `bg-sem-warn/20` |
| 2865 | `text-yellow-500` | *scan anyway* | `text-sem-warn` |
| 2903 | `bg-yellow-500/15` | pillola di coda — *pending* | `bg-sem-warn/15` |
| 2903 | `text-yellow-500` | pillola di coda — *pending* | `text-sem-warn` |
| 2904 | `bg-yellow-500` | pillola di coda — *pending*, il punto | `bg-sem-warn` |
| 2911 | `bg-red-500/15` | pillola di coda — *could not be recorded* | `bg-sem-crit/15` |
| 2911 | `text-red-500` | pillola di coda — *could not be recorded* | `text-sem-crit` |
| 2913 | `bg-red-500` | pillola di coda — *could not be recorded*, il punto | `bg-sem-crit` |
| 2920 | `bg-amber-500/15` | pillola di coda — trattenuta | `bg-sem-warn/15` |
| 2920 | `text-amber-500` | pillola di coda — trattenuta | `text-sem-warn` |
| 2922 | `bg-amber-500` | pillola di coda — trattenuta, il punto | `bg-sem-warn` |
| 2934 | `bg-purple-500/15` | pillola *undone at the door* | `bg-sem-warn/15` — §4 |
| 2934 | `text-purple-400` | pillola *undone at the door* | `text-sem-warn` — §4 |
| 2935 | `bg-purple-400` | pillola *undone at the door*, il punto | `bg-sem-warn` — §4 |
| 2940 | `bg-red-500/15` | pillola di coda — *sign in again* | `bg-sem-crit/15` |
| 2940 | `text-red-500` | pillola di coda — *sign in again* | `text-sem-crit` |
| 2941 | `bg-red-500` | pillola di coda — *sign in again*, il punto | `bg-sem-crit` |
| 2956 | `border-red-500/30` | elenco *could not be recorded* | `border-sem-crit/30` |
| 2956 | `bg-red-500/5` | elenco *could not be recorded* | `bg-sem-crit/5` |
| 2957 | `text-red-400` | elenco *could not be recorded* | `text-sem-crit` |
| 3022 | `text-purple-400` | contatore guest list sopra le presenze | `text-sem-info` |
| 3126 | `border-red-500/40` | errore fotocamera | `border-sem-crit/40` |
| 3126 | `bg-red-500/10` | errore fotocamera | `bg-sem-crit/10` |
| 3126 | `text-red-400` | errore fotocamera | `text-sem-crit` |
| 3174 | `border-yellow-500/40` | banda di freschezza, ramo *live* | `border-sem-warn/40` |
| 3174 | `bg-yellow-500/10` | banda di freschezza, ramo *live* | `bg-sem-warn/10` |
| 3174 | `text-yellow-500` | banda di freschezza, ramo *live* | `text-sem-warn` |
| 3174 | `bg-yellow-500/20` | banda di freschezza, ramo *live*, stato premuto | `bg-sem-warn/20` |
| 3175 | `border-red-500/40` | banda di freschezza, ramo non-live | `border-sem-crit/40` |
| 3175 | `bg-red-500/10` | banda di freschezza, ramo non-live | `bg-sem-crit/10` |
| 3175 | `text-red-400` | banda di freschezza, ramo non-live | `text-sem-crit` |
| 3175 | `bg-red-500/20` | banda di freschezza, ramo non-live, stato premuto | `bg-sem-crit/20` |
| 3190 | `border-red-500/40` | avviso di cache, ramo *error* | `border-sem-crit/40` |
| 3190 | `bg-red-500/10` | avviso di cache, ramo *error* | `bg-sem-crit/10` |
| 3190 | `text-red-400` | avviso di cache, ramo *error* | `text-sem-crit` |
| 3191 | `border-yellow-500/40` | avviso di cache, ramo non-error | `border-sem-warn/40` |
| 3191 | `bg-yellow-500/10` | avviso di cache, ramo non-error | `bg-sem-warn/10` |
| 3191 | `text-yellow-500` | avviso di cache, ramo non-error | `text-sem-warn` |
| 3212 | `bg-yellow-500/20` | torcia, ramo acceso | `bg-sem-warn/20` |
| 3212 | `text-yellow-400` | torcia, ramo acceso | `text-sem-warn` |
| 3282 | `text-green-500` | cronologia — glifo di successo | **deroga A** — invariata |
| 3296 | `text-amber-500` | cronologia — glifo del terzo stato | `text-sem-done` — P3 |
| 3310 | `text-red-500` | cronologia — glifo d'errore | **deroga B** → `text-red-600` |
| 3388 | `bg-purple-500/20` | badge *Guest List* nelle presenze | `bg-sem-info/20` — §4 |
| 3388 | `text-purple-400` | badge *Guest List* nelle presenze | `text-sem-info` — §4 |
| 3399 | `text-green-500` | presenze — segno di arrivato | **deroga A** — invariata |

**57 righe. Zero dicono *si decide dopo*.**

### Le 7 righe di `ScanFlash.tsx`

| Riga | Utility | Cosa e' | Target |
|---|---|---|---|
| 35 | `text-white` | l'inchiostro condiviso del glifo | `text-ground` — §8 |
| 78 | `bg-green-500/90` | riempimento accettazione | **deroga A** — invariata |
| 91 | `bg-amber-500/90` | riempimento terzo stato | `bg-sem-done/90` — P3 |
| 106 | `bg-red-500/90` | riempimento rifiuto | **deroga B** → `bg-red-600/90` |
| 144 | `text-white` | il titolo | `text-ground` — §8 |
| 150 | `text-white/80` | il sottotitolo | `text-ground` — §8, l'alpha cade |
| 156 | `text-white/50` | *tap to dismiss* | `text-ground` — §8, l'alpha cade |

---

## 7. I cinque siti scelti da un'espressione, ramo per ramo

Una sostituzione guidata da una ricerca di stringa **li prende comunque**, perche'
le utility sono scritte per esteso dentro i rami. Ma un lettore che chiede *di che
colore e' questa banda* deve trovare una risposta sola, e non andare a caccia.

> **Il piano si aspettava dieci righe. Sono dodici, e la differenza e' un
> reperto:** la catena della cronologia ha **quattro** rami, non due —
> `isUndone`, `isSuccess`, `isFlagged`, `isError`. Quattro esiti disegnati in un
> `?:` annidato, di cui uno (`isUndone`) non porta palette grezza affatto.

| Sito | Ramo | Utility oggi | Target |
|---|---|---|---|
| `:2823-2828` interruttore scanner | acceso | `bg-accent text-white` | `bg-accent text-ground` |
| | spento | solo legacy (§9) | — nessuna palette grezza |
| `:3174-3175` banda di freschezza | `channelLive` | giallo ×4 | ambra semantica ×4 |
| | non-live | rosso ×4 | critico semantico ×4 |
| `:3190-3191` avviso di cache | `tone === "error"` | rosso ×3 | critico semantico ×3 |
| | altrimenti | giallo ×3 | ambra semantica ×3 |
| `:3212` torcia | accesa | giallo ×2 | ambra semantica ×2 |
| | spenta | solo legacy (§9) | — nessuna palette grezza |
| `:3266-3316` cronologia | `isUndone` | solo `text-muted` | — nessuna palette grezza |
| | `isSuccess` | `text-green-500` | **deroga A** — invariata |
| | `isFlagged` | `text-amber-500` | `text-sem-done` |
| | `isError` | `text-red-500` | **deroga B** → `text-red-600` |

**Il ramo che merita di essere letto due volte e' `isFlagged`.** E' il terzo stato
scritto una seconda volta, in un file diverso da quello che tutti guardano, con
gli stessi tre path SVG del flash. E' la riga che, dimenticata, fa dire violetto
al verdetto e ambra alla cronologia dello stesso scan.

---

## 8. L'inchiostro del flash — uno per tutti e tre, con i suoi numeri

### 8.1 La decisione

**`--ground` su tutti e tre gli stati**, dall'unico elemento condiviso che li
disegna (`ScanFlash.tsx:31-44`, il componente `Glyph`). Soddisfa la regola in
modo uniforme, toglie l'ultima utility acromatica grezza dal file, e tiene **un
inchiostro invece di tre**.

La regola che la decisione deve soddisfare e' scritta in `globals.css:176-178`:
*«A SEMANTIC USED AS A FILL CARRIES `--ground` AS ITS INK. Never `--ink`, never
white.»* Il terzo stato **e'** un riempimento semantico dopo P3, quindi la regola
lo vincola alla lettera; accettazione e rifiuto restano grezzi per deroga, ma
dare loro un inchiostro diverso significherebbe **tre inchiostri per un elemento
che ne ha uno**, ed e' esattamente cio' che il piano vieta.

### 8.2 I tre contrasti misurati, e il pavimento applicato

Compositi: il riempimento fuso sul token di fondo alla propria alpha, in luce
lineare — il numero che una persona vede.

| Riempimento | Composito | Contrasto con `--ground` |
|---|---|---|
| accettazione `bg-green-500/90` | `#01C04D` | **8,18 : 1** ✓ |
| terzo stato `bg-sem-done/90` | `#9475D6` | **5,49 : 1** ✓ |
| rifiuto `bg-red-600/90` | `#DD010C` | **3,87 : 1** ✓ |

**Il pavimento applicato e' 3:1, non 4,5:1.** Il glifo e' un segno tracciato
grande — `h-20 w-20`, spessore 2,5 — non testo corrente: si applica il pavimento
*grafica* di WCAG 1.4.11. Il gate lo **dichiara a ogni esecuzione**, invece di
lasciarlo dedurre da chi legge il verde.

**Il rifiuto e' il piu' stretto dei tre, e la ragione e' strutturale:** scurire il
riempimento lo avvicina all'inchiostro. E' il costo dichiarato di `red-600`, ed e'
il verso opposto del beneficio che D-42-01 comprava scurendolo.

### 8.3 Il ramo di riserva — non serve

Il piano teneva pronta una ramificazione: **se il composito del rifiuto scendesse
sotto il pavimento grafico, quello stato solo resterebbe bianco**, come quinta
deroga dichiarata, con l'asimmetria registrata invece che nascosta.

**Non scatta. 3,87 supera 3**, e lo supera con lo stesso margine che
`42-03-FINDINGS.md` §3 aveva gia' misurato in modo indipendente. L'inchiostro
resta **uno**, e non esiste una quinta deroga.

### 8.4 Gli altri tre bianchi dello stesso file, che il glifo non copriva

`ScanFlash.tsx` porta **quattro** siti d'inchiostro, non uno: il glifo, il
titolo, il sottotitolo e il suggerimento *tap to dismiss*. Tutti e quattro sono
palette grezza, tutti e quattro devono avere un target, e i tre non-glifo stanno
sugli **stessi** riempimenti.

Misurato — contrasto dell'inchiostro sul riempimento, per ognuna delle sei forme
possibili:

| Inchiostro | accettazione | terzo stato | rifiuto |
|---|---|---|---|
| `--ground` pieno | **8,18** | **5,49** | **3,87** |
| `--ground` all'80% | 3,36 | 2,89 | 2,46 |
| `--ground` al 50% | 1,78 | 1,69 | 1,59 |
| bianco pieno | 2,44 | 3,63 | 5,16 |
| bianco all'80% | 2,15 | 3,11 | 4,33 |
| bianco al 50% | 1,72 | 2,32 | 3,08 |

**La decisione: `--ground` pieno su tutti e quattro i siti, e le due alpha
cadono.**

- **Il titolo** e' 24px in grassetto, quindi *testo grande*: pavimento 3:1.
  Passa su tutti e tre (8,18 / 5,49 / 3,87). **Oggi passa su uno solo**: bianco
  su accettazione misura 2,44 e sul terzo stato 2,36.
- **Sottotitolo e suggerimento** sono testo corrente: pavimento 4,5:1. Passano su
  accettazione e terzo stato, e **restano a 3,87 sul rifiuto — sotto il
  pavimento. E' un residuo dichiarato.** Oggi quegli stessi due misurano
  2,15 / 2,08 / 3,52 e 1,72 / 1,68 / 2,58: **falliscono su tutti e sei**. La
  decisione migliora ogni singola cella e ne lascia una insufficiente.
- **Perche' non tenere il bianco sul solo rifiuto**, dove misurerebbe 5,16:
  romperebbe due celle per ripararne una (2,44 sull'accettazione, 3,63 sul terzo
  stato) e spaccherebbe l'inchiostro per stato, che e' cio' che il piano vieta.
- **Perche' le alpha non si possono tenere:** il massimo che un inchiostro
  traslucido raggiunge su uno qualsiasi dei tre riempimenti e' **3,36**. Una
  gerarchia costruita sulla trasparenza, qui, e' una gerarchia costruita
  sull'illeggibilita'.
- **Cosa cambia visivamente, detto invece che scoperto:** la gerarchia fra
  titolo, sottotitolo e suggerimento non poggia piu' su due alpha ma su **corpo,
  peso e posizione** — 24px in grassetto, 14px, 12px al bordo inferiore. Restano
  tre livelli, distinti da cio' che non costa contrasto.

### 8.5 Cosa NON si aggiunge a `ScanFlash`

**Nessuna prop di colore, nessuna variante, nessun `className` di sovrascrittura.**
Il file lo dichiara nel proprio docblock, e la ragione e' che un'uscita di
sicurezza stilistica li' andrebbe poi disfatta un sito di chiamata alla volta.

La distinzione che serve tenere: **aggiungere un campo alla tabella di lookup
esistente non e' un'uscita di sicurezza; aggiungere una prop lo e'.** La prima
resta interna al file e continua a essere l'unico posto dove i tre stati sono
descritti; la seconda sposta la decisione fuori, dove nessuno la conta.

---

## 9. La tabella dei token legacy — 42 righe

E' la meta' meccanica della conversione: i quattro alias di `globals.css:246-249`
risolvono **uno a uno** ai nomi che gia' puntano, e gli alias esistono
esattamente perche' questa parte sia una rinomina e non un ridisegno.

| Alias | Punta a | Utility di partenza | Utility di arrivo |
|---|---|---|---|
| `--background` | `--ground` | `bg-background` | `bg-ground` |
| `--foreground` | `--ink` | `text-foreground` | `text-ink` |
| `--card` | `--surface` | `bg-card` | `bg-surface` |
| `--card-border` | `--line` | `bg-card-border`, `border-card-border` | `bg-line`, `border-line` |

**Le alpha si conservano invariate**: `bg-card-border/50` diventa `bg-line/50`.

Questa e' la parte piu' noiosa e quella piu' facile da lasciare a meta', quindi
ha la sua tabella e il suo conteggio.

| Riga | Utility | Target |
|---|---|---|
| 2638 | `bg-background` | `bg-ground` |
| 2650 | `border-card-border` | `border-line` |
| 2650 | `bg-card` | `bg-surface` |
| 2652 | `bg-card-border/50` | `bg-line/50` |
| 2653 | `bg-card-border/50` | `bg-line/50` |
| 2654 | `bg-card-border/50` | `bg-line/50` |
| 2659 | `border-card-border` | `border-line` |
| 2659 | `bg-card` | `bg-surface` |
| 2676 | `border-card-border` | `border-line` |
| 2676 | `bg-card` | `bg-surface` |
| 2678 | `text-foreground` | `text-ink` |
| 2701 | `text-foreground` | `text-ink` |
| 2705 | `bg-card-border` | `bg-line` |
| 2761 | `bg-background` | `bg-ground` |
| 2763 | `bg-background` | `bg-ground` |
| 2770 | `text-foreground` | `text-ink` |
| 2828 | `bg-card` | `bg-surface` |
| 2828 | `border-card-border` | `border-line` |
| 2828 | `text-foreground` | `text-ink` |
| 2875 | `border-card-border` | `border-line` |
| 2875 | `bg-card` | `bg-surface` |
| 2968 | `text-foreground` | `text-ink` |
| 3012 | `bg-card-border/20` | `bg-line/20` |
| 3012 | `bg-card-border/40` | `bg-line/40` |
| 3019 | `text-foreground` | `text-ink` |
| 3035 | `bg-card-border` | `bg-line` |
| 3067 | `border-card-border` | `border-line` |
| 3067 | `bg-card` | `bg-surface` |
| 3067 | `text-foreground` | `text-ink` |
| 3072 | `text-foreground` | `text-ink` |
| 3092 | `bg-card` | `bg-surface` |
| 3100 | `text-foreground` | `text-ink` |
| 3202 | `border-card-border` | `border-line` |
| 3202 | `bg-card` | `bg-surface` |
| 3213 | `bg-card-border/30` | `bg-line/30` |
| 3213 | `text-foreground` | `text-ink` |
| 3260 | `bg-card-border/30` | `bg-line/30` |
| 3331 | `text-foreground` | `text-ink` |
| 3374 | `border-card-border` | `border-line` |
| 3374 | `bg-card` | `bg-surface` |
| 3381 | `border-card-border/50` | `border-line/50` |
| 3384 | `text-foreground` | `text-ink` |

**42 righe — il numero atteso, senza divergenze.** Distribuzione: `text-foreground`
×12 · `bg-card` ×9 · `border-card-border` ×9 (piu' una con alpha, a 3381) ·
`bg-card-border` ×9 · `bg-background` ×3. `ScanFlash.tsx` e gli altri tre file del
perimetro non ne portano nessuno.

**Tre di queste righe stanno in un ramo di ternario** — 2828 (interruttore
spento), 3213 (torcia spenta), 3260 (riga di cronologia toccabile) — e sono le
stesse tre che al §7 compaiono come *«solo legacy»*.

---

## 10. La tipografia dei numeri — detta, e rimandata

Le cifre tabulari sui contatori della porta — `ScannerClient.tsx:2693` e `:3020`,
che sono i due *fatti / totale* — sono tipografia, e si potrebbe sostenere che
stiano dentro *colore, contrasto e tipo*. **Sono fuori da questa fase lo stesso**,
e la ragione non e' un giudizio: **DS-05 non e' fra i requisiti di questa fase**
— ci sono solo DS-04 e RESP-05 — e `42-CONTEXT.md` §Deferred lo mette fra le voci
rimandate **con l'istruzione che venga declinato ad alta voce anziche' fatto di
straforo**.

Registrato come **DEF-42-02** in `deferred-items.md`, con il suo perche' e la fase
che lo possiede.
