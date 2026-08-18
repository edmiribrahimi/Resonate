---
phase: 42-scanner-conversion
plan: 10
subsystem: ui
tags: [tailwind, layout, scanner, door, responsive, container-maximum]

requires:
  - phase: 42-scanner-conversion (42-02)
    provides: il reperto meccanico dello scanner, contro cui si misura l'invarianza
  - phase: 42-scanner-conversion (42-04)
    provides: la disposizione dei due massimi — §11.3 della mappa, con la ragione di dominio di ciascuno
  - phase: 42-scanner-conversion (42-07)
    provides: la navigazione della porta bloccata in forma telefono al mount, che e' la ragione per cui centrare non puo' finire sotto un rail
  - phase: 42-scanner-conversion (42-09)
    provides: il file gia' sul vocabolario corrente, e il pattern della prova a due catture
provides:
  - la porta che smette di allargarsi in entrambi i suoi stati, a un massimo che il prodotto gia' possiede
  - il mirino centrato dentro un contenitore dimensionato su cio' che decodifica
  - la prova che i tre letterali che decidono una scansione non si sono mossi, presa a diff vuoto invece che per asserzione
affects: [42-11, 42-12]

tech-stack:
  added: []
  patterns:
    - "un massimo si sceglie fra i tre che la shell dichiara, mai come quarto numero di una pagina: il vincolo e' di contratto, e su questo file non e' meccanizzato — lo controlla chi scrive il commit"
    - "quando si centra una superficie che ospita un overlay a schermo pieno, si verifica che le classi aggiunte non creino un blocco contenitore per un elemento fisso: margine e larghezza non lo creano, una trasformazione si'"
    - "l'invarianza si prova fra la cattura al commit base e quella dopo l'ultimo task — un diff vuoto non chiede di fidarsi di un normalizzatore"

key-files:
  created:
    - .planning/phases/42-scanner-conversion/42-10-SUMMARY.md
  modified:
    - src/app/(admin)/admin/scanner/ScannerClient.tsx

key-decisions:
  - "Il massimo della superficie e' 1024px — max-w-5xl, uno dei tre dichiarati dalla shell. La ragione e' di dominio e non di simmetria: alla porta si lavora con una mano, e su un tablet tenuto in orizzontale un pollice non arriva ai 1360px a cui il mirino si stirava"
  - "Il massimo del mirino e' 384px — max-w-sm, il piu' stretto dei tre e il primo che contiene con margine la regione 280x280 effettivamente decodificata"
  - "Entrambe le radici sono state centrate, non una: il selettore della serata e lo stato di scansione sono la stessa superficie in due stati, e centrarne una sola l'avrebbe convertita a meta'"
  - "L'header sticky e' stato letto e non toccato: la radice non e' un contenitore di scorrimento, quindi il massimo ne cambia la larghezza e non l'adesione. Nessun wrapper aggiunto per ottenerlo"
  - "La riga 2d delle procedure resta pending. Una stringa di classe prova che il massimo esiste; che il riquadro sia raggiungibile con un pollice e' una proprieta' di una mano, e questo repository non disegna un pixel"

patterns-established:
  - "Prima di centrare una superficie che monta una navigazione, si legge la forma con cui la monta: qui e' telefono a ogni larghezza, quindi non esiste rail a nessuna larghezza e mx-auto non puo' spingere nulla sotto di esso. Verificato al mount, non assunto dal wrapper cancellato in onda 4"

requirements-completed: [RESP-05]

duration: 22min
completed: 2026-08-18
---

# Fase 42 Piano 10: la porta smette di allargarsi — Summary

**Tre massimi dove prima non ce n'era nessuno — 1024px sulle due radici della superficie e 384px sul contenitore del mirino, tutti e tre centrati e tutti e tre presi fra i tre che la shell gia' dichiara — e una prova d'invarianza a diff vuoto: la regione diffabile del reperto e' identica byte per byte fra la cattura al commit base e quella dopo entrambi i task.**

## Performance

- **Durata:** 22 min
- **Task:** 2 su 2
- **File di prodotto modificati:** 1
- **Righe di prodotto cambiate:** 3, tutte stringhe di classe
- **Commit:** 3 (2 di task, 1 di questo documento)

## La deroga sotto cui questo piano ha girato

Il piano si apre con un blocco: non parte finche' la riga **3m** di `42-PROCEDURES.md` — il door pass sullo scanner **non convertito** — non porta un risultato. Quella riga dice `pending`.

**Ha girato lo stesso, sotto la deroga del proprietario datata 2026-08-18**, scritta dentro la riga 3m, che autorizza esplicitamente le onde 3-8 a procedere — e questo piano e' l'onda 6. La deroga ne enuncia il costo e questo documento non lo attenua: il **criterio 3** — *ogni comportamento dello scanner e' invariato rispetto a prima della conversione* — **non e' piu' chiudibile**, perche' il codice su cui andava presa la prima misura non esiste piu'.

**Questo piano non lo chiude e non pretende di chiuderlo.** Cio' che dimostra e' l'invarianza rispetto al **reperto meccanico** — quattro letterali di camera, tredici blocchi, un diff — che e' una cosa piu' piccola e diversa da un'osservazione umana a un ingresso. E' la stessa distinzione gia' messa per iscritto da 42-08 e 42-09, ripetuta perche' chi apra solo questo documento non la deduca al contrario.

## Il numero scelto, e perche'

| Massimo | Utility | Dove | Quale criterio chiude |
|---|---|---|---|
| **1024px** | `max-w-5xl` | le due radici della superficie | **RESP-05** — *lo scanner si centra* |
| **384px** | `max-w-sm` | il contenitore del mirino | **criterio 2** — *il mirino si centra* |

**Nessuno dei due e' inventato.** `DECLARED_MAXIMA` (`scripts/verify-conversion.mjs:1049`) dichiara esattamente tre utility — `max-w-5xl`, `max-w-7xl`, `max-w-sm` — e la shell le scrive a `src/components/ui/PageShell.tsx:151-168`. Entrambi i numeri usati qui sono di quell'insieme. Il vincolo **non e' meccanizzato su questo file**: check D legge il solo file di pagina, e il massimo vive nel client component. Il docblock di `FULL_BLEED_SURFACES` lo dice in proprio — *«il numero e' controllato dalla persona che scrive il commit»* — ed e' quello che e' successo qui, non un verde ereditato.

**La ragione dei 1024, che e' di dominio.** Alla porta la superficie si lavora **con una mano**. A 1440px di finestra il mirino si stirava a circa 1360px, e un pollice su un tablet tenuto in orizzontale non ci arriva. 1024 e' la stessa distanza di raggiungibilita' che le altre trentaquattro superfici di default del prodotto hanno gia' scelto — e resta reversibile in una riga.

**La ragione dei 384.** La regione decodificata e' **280x280**. Ogni pixel oltre e' video che il browser dipinge e decodifica attorno a una decisione gia' presa, **quindici volte al secondo**: a 1440px il mirino occupava **4,9 volte** l'area utile. 384px e' il piu' stretto dei tre massimi dichiarati e il primo che contiene 280 con margine.

## Cosa e' stato fatto

### Task 1 — entrambe le radici, un massimo, centrato

Il file conteneva **zero massimi e zero centrature** su tutto il perimetro, misurato prima di toccarlo. Le due radici — il selettore della serata e lo stato di scansione — portavano la stessa identica stringa di classe, e ora portano la stessa identica stringa piu' lunga:

- `min-h-dvh bg-ground pb-24` → `mx-auto w-full max-w-5xl min-h-dvh bg-ground pb-24`
- due siti, entrambi sostituiti, **zero occorrenze della forma precedente rimaste** — la mutazione e' stata asserita, non presunta

**Entrambe, non una.** Una superficie che si centra mentre scansiona e si allarga mentre si sceglie la serata non e' centrata: e' convertita a meta'.

**Cosa non e' stato fatto per ottenerlo.** Nessun elemento aggiunto, rimosso o riannidato: il `git diff` del task e' di due righe, entrambe stringhe di classe. L'header sticky, la radice a piena altezza e la spaziatura inferiore che libera la navigazione sono passati intatti.

### Le tre letture che il task 1 ha fatto invece di assumere

1. **L'header sticky dentro una colonna centrata.** Letto, non renderizzato: `sticky top-0` si posiziona rispetto al proprio contenitore di scorrimento, e la radice non ne e' uno — nessun `overflow`, nessuna trasformazione. Il contenitore di scorrimento resta il viewport, quindi **il massimo cambia la larghezza dell'header, non la sua adesione**. Il piano chiedeva di fermarsi e riferire se la lettura avesse suggerito altro; non lo ha suggerito.

2. **Il rail che non esiste.** Centrare puo' spingere il contenuto sotto una navigazione laterale — ma solo se quella navigazione esiste. **Entrambi gli indirizzi della porta passano da `DoorSurface.tsx`, che monta la navigazione in forma telefono** (`:151`). E' il motivo per cui il wrapper cancellato in onda 4 esisteva, e la ragione non e' morta con lui: si e' spostata nella prop. Verificato al mount, non ereditato dalla prosa di un file che non c'e' piu'.

3. **Il colore fuori dalla colonna.** `--background` e' definito come `var(--ground)` (`globals.css:247`), lo stesso token che le radici dipingono. Centrare non apre due bande di un colore diverso ai lati: e' la ragione per cui non e' servito nulla di piu' del massimo.

### Task 2 — il mirino, e i tre numeri che non si sono mossi

Il contenitore del mirino — l'elemento che avvolge il nodo in cui il decodificatore inietta il video — e' passato da nessuna classe a `mx-auto w-full max-w-sm`. Una riga.

**Cosa non e' stato toccato**, e verificato per grep dopo la modifica:

| letterale | valore | riga |
|---|---|---|
| `fps` | `15` | 1555 |
| `qrbox.width` | `280` | 1555 |
| `qrbox.height` | `280` | 1555 |
| `facingMode` | `environment` | 1554 |

Sono gli stessi quattro valori del **blocco 11** del reperto, byte per byte. Le righe differiscono — il reperto dice 1528/1529 — ed e' uno scorrimento accumulato dalle onde precedenti, non da questo piano: **entrambe le modifiche di questo piano stanno sotto la riga 1555 e non aggiungono nemmeno una riga al file.** Non toccati nemmeno la query sulla capacita' della torcia e il percorso di riavvio.

## L'invarianza, provata a diff vuoto

Il pattern e' quello stabilito da 42-09, e vale piu' di una normalizzazione perche' non chiede di fidarsi del normalizzatore.

1. Cattura **al commit base**, prima di toccare qualsiasi cosa: `node scripts/capture-scanner-baseline.mjs`, exit 0.
2. Cattura **dopo entrambi i task**: exit 0.
3. Ritaglio della regione fra i due marcatori `BASELINE-DIFFABLE-BEGIN/END` — il commit e la data stanno fuori dalla regione per costruzione, ed e' il documento stesso a dirlo.
4. `diff` delle due regioni: **exit 0, 295 righe ciascuna, stesso sha `6f98b5e2`.**

**Nessun blocco si e' mosso.** Non il blocco 11, non i tredici in blocco.

### E rispetto al reperto di onda 0

Il confronto con `42-BASELINE.md` porta le differenze **accumulate dalle onde 1-5**, non da questa. Normalizzando ogni cifra e riordinando, la sola differenza di contenuto che resta su tutta la regione e' **una riga**: il riempimento del terzo esito, `bg-amber-500/90` → `bg-sem-done/90`. La seconda — il rifiuto, da `bg-red-500/90` a `bg-red-600/90` — sparisce nella normalizzazione delle cifre ma e' visibile nel diff grezzo. **Sono i due riempimenti d'esito gia' registrati**, e nient'altro: tutto il resto della differenza e' numeri di riga.

## Il gate di leggibilita', e la premessa che andava riverificata

`node scripts/verify-scan-legibility.mjs` **esce 0** — ogni coppia misurata supera la soglia, ogni glifo supera il pavimento.

Ma il gate stampa un'esclusione e la condiziona esplicitamente: la coppia accetta↔pillola e' esclusa *«perche' il contenitore del flash e' ancora fissato a ogni bordo … il giorno in cui smette di coprire il viewport, l'esclusione smette di essere vera»*. **Questo piano mette un massimo su una radice che contiene quel flash**, quindi la premessa andava riverificata invece di ereditata:

- `ScanFlash.tsx:154` e' `fixed inset-0` — posizionato rispetto al viewport, non rispetto alla radice;
- un elemento fisso viene catturato da un antenato solo se questo porta `transform`, `filter`, `perspective`, `contain` o `will-change`. **Le tre classi aggiunte da questo piano sono margine, larghezza e larghezza massima: nessuna delle tre crea un blocco contenitore.**

Il flash copre il viewport a ogni larghezza esattamente come prima. **L'esclusione regge la propria premessa**, e regge perche' e' stata verificata, non perche' il gate e' verde.

## Cosa questo piano NON chiude

- **La riga 2d di `42-PROCEDURES.md` resta `pending`**, e non e' stata toccata: tutte e dieci le righe del documento restano `pending`. Una stringa di classe prova che un massimo esiste nel sorgente. Che il riquadro di decodifica sia raggiungibile **con un pollice, su un tablet tenuto in orizzontale**, e che nessuna informazione critica esca dallo schermo a nessuna delle tre larghezze, e' un'osservazione che una persona fa su tre dispositivi reali — e questo repository non renderizza un pixel.
- **Il criterio 3** resta privo di termine di paragone, per la deroga di cui sopra. Non aperto: privo.
- **DEF-42-06** — i tre confini di controllo a 2.05:1 — non e' stato riparato. Cambia un colore, e' registrato, e non e' di questo piano.
- **`PHASE_42_PATHS` e `FULL_BLEED_SURFACES` restano come sono**: le apre il piano 42-11, e questo piano non ha avuto bisogno di anticiparlo perche' il massimo vive nel client component, che check D non legge.

## Verifica

| Controllo | Comando | Esito |
|---|---|---|
| tipi e build | `npm run build` | **exit 0** (dopo ogni task) |
| leggibilita' della scansione | `node scripts/verify-scan-legibility.mjs` | **exit 0** |
| invarianza del reperto | `capture-scanner-baseline.mjs` prima/dopo, diff sulla regione | **exit 0, sha identico** |
| il massimo e' dichiarato | grep di `max-w-5xl` e `max-w-sm` in `DECLARED_MAXIMA` | **entrambi presenti** |
| i tre siti | grep di `max-w-|mx-auto` sul file | **3: due radici + mirino** |
| i letterali di camera | grep di `qrbox|fps|facingMode` | **4 valori, invariati** |
| nessuna cancellazione | `git diff --diff-filter=D` su entrambi i commit | **vuoto** |

**Non esiste un test runner per questo prodotto.** Nessuna riga sopra dice che qualcosa e' verificato perche' dei test passano: `next build` e' il typecheck, gli altri sono codici d'uscita di script che leggono il sorgente, e cio' che nessuno di essi puo' dire e' scritto nella sezione precedente.

## Deviazioni dal piano

**Nessuna.** Il piano e' stato eseguito come scritto. Le tre letture del task 1 e la riverifica della premessa del gate di leggibilita' non sono deviazioni: la prima era richiesta dal piano in quei termini, la seconda e' il controllo d'impatto cross-dominio che `meta-gates.md` impone a ogni intervento.

Le righe indicate dal piano nei `read_first` erano scorrite (2637 → 2668, 2761 → 2791, 3202 → 3242, 1520-1535 → 1546-1580) per effetto delle onde 3-5. Gli elementi sono stati ritrovati per contenuto e non per numero di riga; non e' una deviazione, e' la ragione per cui un piano si legge per cosa nomina.

## Commit

| Commit | Cosa |
|---|---|
| `e1195ff` | task 1 — il massimo su entrambe le radici, centrato |
| `46b4cde` | task 2 — il massimo piu' stretto sul mirino, e i letterali di decodifica fermi |

## Self-Check: PASSED

- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — presente, tre siti di massimo verificati per grep
- `.planning/phases/42-scanner-conversion/42-10-SUMMARY.md` — presente
- `e1195ff`, `46b4cde` — presenti in `git log`
