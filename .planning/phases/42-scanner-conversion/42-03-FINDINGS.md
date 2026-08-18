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
