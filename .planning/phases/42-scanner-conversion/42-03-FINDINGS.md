# Fase 42 — Reperto 03: il gate della leggibilita', provato per mutazione

**Data:** 2026-08-18
**Gate:** `scripts/verify-scan-legibility.mjs`
**Stato:** scritto e provato in wave 0. **Non registrato** — ne' in `package.json`
ne' in `verify-all.mjs` (D-42-09). La registrazione viaggia con il colore.

---

## 0. Cosa c'e' qui dentro

Tre cose, in quest'ordine:

1. **Il nome che il gate cerca**, fissato qui perche' il piano 42-06 introduca
   esattamente quello e non una variante.
2. **Le cinque direzioni di mutazione**, ognuna con il comando che ha asserito
   che la mutazione fosse andata a segno **prima** di leggerne l'esito.
3. **La matrice completa delle distanze** dalla direzione 4 — la terna decisa,
   non mutata — che e' la tabella a cui la conversione sara' tenuta.

L'arbitrato fra le due misure precedenti sta al §4, e ha una conclusione che
nessuna delle due tabelle aveva previsto.

---

## 1. Il nome della costante, fissato qui

Il gate legge il colore della pillola di connettivita' da **una costante
nominata a livello di modulo** in `ScannerClient.tsx`. Oggi non esiste — la
pillola e' scritta inline, e `bg-yellow-500` compare **dieci volte** in quel
file su cinque funzionalita' diverse, quindi non c'e' nulla di stabile da
leggere. Il piano 42-06 la solleva.

**Il gate cerca questo, alla lettera:**

| Cosa | Valore |
|---|---|
| Identificatore | `CONNECTIVITY_PILL` |
| Chiave letta dal gate | `offlineDot` |
| Forma | oggetto letterale a chiavi piatte, valori stringa fra virgolette doppie |

```
const CONNECTIVITY_PILL = {
  onlineWash: "bg-green-500/15 text-green-500",
  onlineDot: "bg-green-500",
  offlineWash: "bg-yellow-500/15 text-yellow-500",
  offlineDot: "bg-yellow-500",
} as const;
```

**Tre vincoli sulla forma, e ognuno ha una ragione, non un gusto:**

- **Chiavi piatte, non annidate.** Il gate ancora sull'identificatore e poi sulla
  chiave: una coppia `offline: { dot: … }` costringerebbe a una lettura in due
  passi, e ogni passo in piu' e' un passo che invecchia da solo.
- **Le utility scritte per esteso, mai composte.** Tailwind scansiona il testo
  del sorgente: un nome di classe costruito a runtime — `bg-${x}` — e' un nome
  di classe che **non viene mai emesso**. Sollevare il colore in una costante e
  poi comporlo produrrebbe una pillola senza colore.
- **Entrambi i rami leggono dalla costante.** Il gate misura solo l'*Offline*,
  ma lasciare l'*Online* inline significherebbe due sorgenti di verita' per la
  stessa pillola.

Il colore **non cambia**: `yellow-500` resta `yellow-500`. Questo e' un
sollevamento, non una conversione.

---

## 2. Le cinque direzioni, su un ramo usa-e-getta

Nulla di tutto questo poteva raggiungere lo scanner: **D-42-04 blocca ogni
modifica alla porta fino al primo door pass su superficie non convertita.**
Quindi le mutazioni sono avvenute su un ramo `scratch-42-03-mutation`, creato da
`6a5452a`, e il ramo e' stato cancellato. Il modello e' quello che il piano
41.2-01 ha stabilito: si misura, si prova il ritorno, non si tiene nulla.

Sul ramo e' stato simulato cio' che fara' il piano 42-06 — la pillola sollevata
nella costante **con il suo colore invariato**, e la terna decisa applicata:
accettazione invariata, rifiuto scurito di un passo, terzo stato sul semantico
di completamento, inchiostro del glifo sul token di fondo.

> **La clausola che vale piu' delle cinque direzioni messe insieme**
> (`ai-engineering.md`, gate *prova per mutazione*): **prima di leggere l'esito,
> si asserisce che la mutazione sia stata applicata.** Una sostituzione che non
> va a segno produce un verde che non significa nulla, e questo progetto ha gia'
> pagato quell'errore una volta.

### Direzione 4 — la terna decisa, non mutata → **exit 0**

Fatta per prima, perche' e' lo stato di partenza delle altre e perche' e' quella
che poteva sorprendere.

**Asserzione della mutazione, prima dell'esito:**

```
LC_ALL=C /usr/bin/grep -c 'bg: "bg-sem-done/90"' src/components/scanner/ScanFlash.tsx   → 1
LC_ALL=C /usr/bin/grep -c 'bg: "bg-red-600/90"'  src/components/scanner/ScanFlash.tsx   → 1
LC_ALL=C /usr/bin/grep -c 'text-ground'          src/components/scanner/ScanFlash.tsx   → 1
LC_ALL=C /usr/bin/grep -c 'offlineDot: "bg-yellow-500"' …/ScannerClient.tsx             → 1
```

**Esito:** `SCAN_LEGIBILITY_OK`, exit **0**. Matrice completa al §3.

**Non e' servita nessuna deroga.** `DEROGATIONS` resta dichiarata e **vuota**, la
soglia resta **10**, e nessun colore e' stato sostituito.

### Direzione 1 — il terzo stato rimesso sull'ambra di oggi → **exit 1**

**Asserzione:**

```
LC_ALL=C /usr/bin/grep -c 'bg: "bg-amber-500/90"' src/components/scanner/ScanFlash.tsx  → 1
LC_ALL=C /usr/bin/grep -c 'bg: "bg-sem-done/90"'  src/components/scanner/ScanFlash.tsx  → 0
```

**Esito:** exit **1**, due reperti:

```
SCAN_LEGIBILITY_FAIL — 2 finding(s):
  · accept↔third measures 7.0 in protanopia, below the threshold of 10
  · third↔pill measures 4.5 in deuteranopia, below the threshold of 10
```

La coppia terzo-stato/pillola e' nominata, che e' cio' che la direzione doveva
produrre. **E ne compare una seconda che il piano non chiedeva:** con l'ambra,
anche accettazione contro terzo stato scende a **7,0 in protanopia**. Il difetto
che due commenti dichiaravano assente non era uno solo.

### Direzione 2 — la costante della pillola rinominata → **exit 2**

**Asserzione:**

```
LC_ALL=C /usr/bin/grep -c 'CONNECTIVITY_PILL'  …/ScannerClient.tsx  → 0
LC_ALL=C /usr/bin/grep -c 'CONNECTIVITY_BADGE' …/ScannerClient.tsx  → 5
```

**Esito:** exit **2**, `FATAL: … declares no CONNECTIVITY_PILL with a offlineDot
colour … Nothing was measured.`

**Non exit 0, ed e' il punto della direzione.** I tre esiti erano tutti
leggibili e tutti a posto: un gate meno severo avrebbe misurato quelli, taciuto
la pillola e stampato un verde su una misura che non aveva fatto. E' il difetto
esatto che questo gate esiste per impedire, ed e' la stessa forma di
`verify-all.mjs:196-212`.

### Direzione 3 — `theme.css` reso illeggibile → **exit 2**

La palette grezza vive in `node_modules`, che qui e' un collegamento alla copia
del repository principale: la mutazione ha **sostituito il collegamento con una
directory locale** contenente un `theme.css` vuoto, senza toccare nulla fuori
dal worktree.

**Asserzione:**

```
wc -c < node_modules/tailwindcss/theme.css  → 0
```

**Esito:** exit **2**, `FATAL: node_modules/tailwindcss/theme.css exists but no
--color-*: oklch(...) declaration could be parsed out of it … Nothing was
measured.`

Ramo di rifiuto distinto da *«il file non esiste»*, ed e' giusto che siano due:
un file assente e un file che non si lascia leggere hanno cause diverse. Il
collegamento e' stato ripristinato subito dopo (`19480` byte, riletti).

### Direzione 5 — il contenitore del flash privato dell'ancoraggio ai bordi → **exit 1**

**Asserzione:**

```
LC_ALL=C /usr/bin/grep -n 'className={`fixed' src/components/scanner/ScanFlash.tsx
  → 135:  className={`fixed z-[70] flex flex-col items-center justify-center ${state.bg} …`}
LC_ALL=C /usr/bin/grep -c 'inset-0' src/components/scanner/ScanFlash.tsx  → 0
```

**Esito:** exit **1**, e il primo reperto nomina la **premessa**, non un colore:

```
✗ THE EXCLUSION'S PREMISE HAS FALLEN. … the container no longer pins itself to
  every edge … the pair is measured below. This is not a colour that changed: it
  is a premise that fell, and it fails CLOSED on purpose.

SCAN_LEGIBILITY_FAIL — 2 finding(s):
  · the accept/pill exclusion outlived its premise
  · accept↔pill measures 5.5 in protanopia, below the threshold of 10 — and it is
    only measured at all because the exclusion's premise fell
```

**Questa direzione ha prodotto un numero che vale come reperto a se':** con la
terna decisa, accettazione contro pillola *Offline* sta a **5,5 in protanopia**.
Finche' il flash copre il viewport quella coppia non ha un momento in cui
confondersi e l'esclusione e' giusta. **Il giorno in cui il flash diventasse una
card** — idea viva, sta in `42-CONTEXT.md` sotto Deferred come modo di ridurre
l'abbagliamento a un ingresso al buio — **quella coppia diventerebbe reale, e
sarebbe rotta.** Il costo di quell'idea differita ha adesso una cifra, misurata
prima e non dopo.

Una frase in un docblock avrebbe continuato a dire *«esclusa»* per sempre: **la
prosa fallisce aperta, questa esclusione fallisce chiusa.**

### Il ritorno, provato invece che dichiarato

```
git status --porcelain -- src/ scripts/   → (vuoto)
git branch --list | grep scratch          → (nessuna riga)
npm run build                             → exit 0
```

I due file mutati sono stati ripristinati **per percorso esatto**, uno per uno.
Nessun `git clean`, nessun reset dell'albero: dentro un worktree quelle due
operazioni cancellano lavoro di altre onde, ed e' un precedente gia' pagato da
questo repository.

---

## 3. La matrice della direzione 4 — la tabella a cui la conversione sara' tenuta

Colori **compositi**, cioe' il riempimento fuso sul token di fondo alla propria
alpha, in luce lineare. E' il numero che una persona vede; nessuna delle due
tabelle precedenti lo considerava.

**Metodo:** oklch → sRGB lineare (matrici Ottosson) · Brettel, Vienot & Mollon
1997 a **due semipiani** · CIEDE2000. **Soglia 10.**

I colori letti dai sorgenti, resi:

| ruolo | utility | composito |
|---|---|---|
| accettazione | `bg-green-500/90` | `#01C04D` |
| terzo stato | `bg-sem-done/90` | `#9475D6` |
| rifiuto | `bg-red-600/90` | `#DD010C` |
| pillola *Offline* | `bg-yellow-500` | `#F0B100` |
| inchiostro del glifo | `text-ground` | `#0A0712` |

| coppia | normale | protanopia | deuteranopia | tritanopia | **min** |
|---|---|---|---|---|---|
| accetta ↔ rifiuta | 78,1 | 38,7 | **14,0** | 64,9 | **14,0** |
| accetta ↔ terzo stato | 53,4 | 56,6 | 48,2 | **19,8** | 19,8 |
| rifiuta ↔ terzo stato | 42,3 | 51,1 | 52,1 | **31,9** | 31,9 |
| terzo stato ↔ pillola | 61,8 | 60,9 | 57,9 | **28,3** | 28,3 |
| rifiuta ↔ pillola | 43,8 | 40,7 | **22,4** | 28,4 | 22,4 |
| *accetta ↔ pillola* | *esclusa finche' il flash copre il viewport — misurata 5,5 al minimo quando non lo copre* | | | | — |

### **Il minimo della terna decisa e' 14,0.**

Sta in deuteranopia, sulla coppia accettazione/rifiuto, ed e' **la coppia che
porta il carico**: e' quella su cui una persona alla porta decide se far entrare
qualcuno. Quattordici non e' comodo, e' sufficiente. Il canale che porta davvero
il rifiuto per un deuteranope resta il **glifo**, come D-42-01 gia' dichiarava.

Per confronto, la terna di oggi misura **2,1** al minimo. Il salto e' da *due
schermi indistinguibili* a *due schermi separabili con margine*.

### Il contrasto del glifo, e la soglia applicata

L'inchiostro e' il token di fondo su tutti e tre gli stati, per la regola di
`globals.css:176-178` — *un semantico usato come riempimento porta `--ground`
come inchiostro, mai bianco*.

| riempimento | contrasto |
|---|---|
| accettazione | 8,18 : 1 ✓ |
| terzo stato | 5,49 : 1 ✓ |
| rifiuto | **3,87 : 1** ✓ |

**La soglia applicata e' 3:1, non 4,5:1, ed e' dichiarata dal gate a ogni
esecuzione.** Il glifo e' un segno tracciato grande — `h-20 w-20`, spessore 2,5
— non testo corrente: si applica il pavimento *grafica* di WCAG 1.4.11, non
quello del testo. Il rifiuto e' il piu' stretto dei tre perche' scurire il
riempimento lo avvicina all'inchiostro: e' il costo dichiarato di `red-600`,
e la ramificazione che il piano 42-04 teneva pronta — *se il rifiuto scende
sotto il pavimento, quello stato solo resta bianco* — **non serve**. 3,87
supera 3, e l'inchiostro resta uno per tutti e tre.

---

## 4. L'arbitrato — chi aveva ragione fra le due misure, e la risposta che nessuna delle due aveva previsto

`42-CONTEXT.md` §D-42-01 e `42-RESEARCH.md` §0 riportano due tabelle che non
coincidono, e **la decisione di scurire il rifiuto poggia su una delle due.**
Nessuna delle due era stata verificata da un terzo. Il gate e' il terzo.

### 4.0 Il metodo che il gate implementa, e i due che non ha usato

Il gate implementa **oklch → sRGB lineare (matrici Ottosson) · Brettel, Vienot
& Mollon 1997 a due semipiani in sRGB lineare · CIEDE2000**, cioe' esattamente
il metodo che D-42-05 nomina.

**Non** ha usato il metodo a **piano singolo del 1999** — che `42-RESEARCH.md`
§0 dichiara per se' — e **non** ha usato **matrici HCIRN in spazio sRGB**, che
sono l'errore della prima stesura ritirata di `42-CONTEXT.md`.

**Le due parti aritmetiche sono state verificate contro fonti esterne prima di
usarle per arbitrare**, perche' un arbitro non verificato e' una terza opinione:

- **CIEDE2000** riproduce **14 dei 15** vettori di prova pubblicati da Sharma
  alla quarta cifra decimale. Il quindicesimo divergeva di 0,009 e la
  ricontrollata ha dato torto alla trascrizione del valore atteso, non
  all'implementazione.
- **La conversione in L\*a\*b\*** riproduce esattamente i valori di riferimento
  dei tre primari sRGB — `#FF0000` → 53,2408 / 80,0925 / 67,2032, e cosi' gli
  altri due.

### 4.1 Il confronto, cella per cella

Distanze sui **token grezzi**, cioe' come entrambe le tabelle precedenti li
misuravano — non sui compositi del §3. Le colonne sono nell'ordine
normale · protanopia · deuteranopia · tritanopia; dove una tabella le ordinava
diversamente, i valori sono stati rimessi in questa colonna.

| Coppia | Fonte | normale | protan | deuter | tritan |
|---|---|---|---|---|---|
| accetta ↔ rifiuta | contesto | 82,0 | 32,6 | 8,3 | **67,4** |
| | ricerca | 82,0 | 31,7 | 8,1 | **60,8** |
| | **gate** | **80,7** | **32,0** | **8,4** | **65,5** |
| accetta ↔ terzo stato | contesto | 49,1 | **10,2** | 14,8 | 57,2 |
| | ricerca | 49,1 | **10,5** | 15,1 | 53,5 |
| | **gate** | **49,7** | **7,0** | **10,1** | **54,6** |
| rifiuta ↔ terzo stato | contesto | **38,4** | 30,9 | 15,7 | 17,2 |
| | ricerca | **38,4** | 30,1 | 15,7 | 18,8 |
| | **gate** | **33,1** | **28,2** | **13,1** | **17,3** |
| terzo stato ↔ pillola | contesto | 10,0 | 4,7 | 2,1 | 5,7 |
| | ricerca | 10,0 | 4,7 | 2,0 | 5,9 |
| | **gate** | **10,8** | **4,8** | **2,1** | **5,5** |
| `--sem-crit` ↔ `--accent` | ricerca | 4,0 | 7,2 | 3,8 | 2,3 |
| | **gate** | **4,0** | **6,9** | **3,6** | **2,2** |
| `--sem-warn` ↔ accetta | ricerca | 46,4 | 2,3 | 10,0 | 49,8 |
| | **gate** | **45,4** | **2,4** | **9,3** | **50,9** |
| `--sem-done` ↔ accetta | ricerca | 54,0 | 63,6 | 57,1 | 22,3 |
| | **gate** | **54,2** | **57,6** | **49,1** | **20,1** |
| `--sem-done` ↔ rifiuta | ricerca | 38,8 | 51,5 | 60,5 | 33,7 |
| | **gate** | **38,8** | **46,1** | **51,9** | **31,0** |
| `--sem-done` ↔ pillola | ricerca | 65,8 | 70,3 | 69,9 | 30,4 |
| | **gate** | **61,8** | **60,7** | **57,8** | **27,2** |

### 4.2 Chi vince, in una riga per volta

**Sulla direzione, il gate sta con il contesto — e la ricerca non la
contraddiceva piu'.** La `DISCORDANZA 1` di `42-RESEARCH.md` §0 e' scritta
contro la **prima stesura ritirata** del contesto, quella che dava 48,7 in
deuteranopia e 28,1 in protanopia. Quella tabella non esiste piu': il contesto
si e' gia' corretto, e da allora le due fonti concordano che il minimo di
accetta-vs-rifiuta sta **in deuteranopia** ed e' **8 e qualcosa**. Il gate
misura **8,4**, cioe' **fra le due**, e chiude la discordanza confermandone
l'esito piuttosto che il numero.

**Sulla tritanopia il gate sta con il contesto e non con la ricerca, e la
ragione e' strutturale, non aritmetica.** Contesto 67,4 · ricerca 60,8 · gate
65,5. E' esattamente dove ci si aspetta che le due si separino: la ricerca
dichiara per se' il **metodo a piano singolo del 1999**, e il piano singolo e'
povero **proprio sulla tritanopia** — e' la ragione per cui D-42-05 nomina il
1997 invece di lasciare la scelta a chi implementa. La colonna tritanopia della
ricerca non e' sbagliata per distrazione: e' il metodo che dichiara.

**Sui minimi che contano, tutte e tre concordano.** Accetta-vs-rifiuta con
`red-500` sta a 8 e qualcosa in deuteranopia; terzo-stato-vs-pillola sta a
**2,1** in deuteranopia. Sono le due celle su cui poggiano D-42-01 e D-42-02, e
nessuna delle due e' in discussione.

### 4.3 Il reperto piu' importante: su alcune celle il gate non riproduce nessuna delle due

E una di queste e' decidibile **senza credere a nessun modello di visione**.

**A vista normale non c'e' nessuna simulazione dicromatica in gioco.** La
distanza fra `red-500` e `amber-500` a vista normale e' pura aritmetica:
conversione in L\*a\*b\* e CIEDE2000, niente altro. Entrambe le tabelle
precedenti dicono **38,4**. Il gate misura **33,1** — con una CIEDE2000
verificata su 14 vettori Sharma su 15 alla quarta decimale e una conversione
L\*a\*b\* che riproduce esattamente i valori di riferimento dei primari.

**Su quella cella hanno torto tutte e due.** Non e' una divergenza di metodo:
e' un errore di calcolo condiviso, e il fatto che due misure indipendenti
riportino la stessa cifra sbagliata dice che **non erano indipendenti quanto
sembravano**.

La seconda cella e' piu' consequenziale. **Accetta contro terzo stato, in
protanopia:** contesto 10,2 · ricerca 10,5 · **gate 7,0**. Entrambe le tabelle
la danno **appena sopra** la soglia di 10; il gate la da' **sotto**. Con l'ambra
di oggi, quindi, il difetto non era solo la pillola: **anche l'accettazione e il
terzo stato sono confondibili per un protanope**, e nessuna delle due misure
precedenti lo aveva visto. La direzione 1 di mutazione (§2) lo riporta
indipendentemente, ed e' la stessa cifra.

**Terza cella:** la tabella delle alternative del contesto da' alla terna decisa
un minimo di **15,5**; il gate misura **14,0**, sia sui grezzi sia sui
compositi. La conclusione non cambia — 14 supera 10 con margine — ma il numero
che il documento stampa e' quello sbagliato, e verra' citato.

### 4.4 Cosa questo arbitrato NON fa

**Non riapre D-42-01.** La sua conclusione operativa non poggia su nessuna delle
celle contestate: poggia sul fatto che il set semantico **non contiene un
verde** e che la fase 40 ha deciso di non inventarne uno, e sul fatto che
portare il rifiuto su `--sem-crit` lo metterebbe a **2,2** dal colore dei
pulsanti primari. Il gate **conferma 2,2 esattamente** (in tritanopia, che e' il
minimo di quella coppia). Entrambi i pilastri reggono.

**Non riapre D-42-02.** `--sem-done` misura **20,1** dall'accettazione, **31,0**
dal rifiuto e **27,2** dalla pillola sui grezzi — piu' basso di quanto la
ricerca dichiarava, e comunque il doppio della soglia su ogni coppia.

**Non abbassa nessuna soglia e non sostituisce nessun colore.** `DEROGATIONS` e'
dichiarata e vuota; la soglia resta 10; nessun file sotto `src/` e' stato
toccato da questo piano.

### 4.5 Il documento corretto, e quello no

**Corretto in loco, con la data: `42-CONTEXT.md`.** E' la tabella su cui poggia
una decisione e su cui il gate ha trovato **una cella che attraversa la soglia**
(accetta-vs-terzo, 10,2 → 7,0) piu' un minimo dichiarato sbagliato (15,5 →
14,0). Le cifre superate **restano visibili** con la nota che dice cosa le ha
sostituite: questo repository corregge in loco, non cancella una tabella in cui
qualcuno ha creduto.

**`42-RESEARCH.md` §0 non viene toccato**, e la ragione va scritta perche' non
sembri una dimenticanza: la sua `DISCORDANZA 1` e' un'obiezione a una tabella
**gia' ritirata**, quindi non e' un'affermazione viva da correggere; e la sua
colonna tritanopia diverge **per il metodo che il documento dichiara di se'**,
non per un errore. Registrare qui che il 1999 e' la causa e' la correzione:
riscriverne i numeri con un metodo che quel documento non dichiara farebbe
sparire l'unica prova che il metodo conta.

---

## 5. Cosa un verde di questo gate significa, e cosa non significa

**Questo gate misura la distanza fra due tinte, non la leggibilita' di uno
schermo.**

Un passaggio dice che **le tinte sono separabili**. Non dice, e non puo' dire,
che la porta funzioni: che un rifiuto si legga come rifiuto a distanza di
braccio, al buio, con una fila davanti, resta un'osservazione umana. Quella vive
nel door pass, e `42-PROCEDURES.md` la tiene.
