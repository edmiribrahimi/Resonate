# Phase 42: Scanner Conversion - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Lo scanner e' l'ultima superficie a prendere il sistema visivo, e prende
**colore, contrasto e tipo soltanto**. Il comportamento e' una superficie di
sicurezza e non si tocca: nessun cambio agli esiti, ai tempi, agli aptici, alla
coda offline, all'annullamento, alla torcia o al ritorno automatico.

Requisiti: **DS-04** (i colori di feedback restano saturi e inequivocabili, e il
colore non e' mai l'unico canale) e **RESP-05** (il mirino si centra invece di
stirarsi, e il comportamento non cambia per effetto del lavoro visivo).

**Perimetro dei file** — sono esattamente quelli oggi recintati da
`PHASE_42_PATHS` in `scripts/conversion-manifest.mjs:226-239`:

- `src/app/(admin)/**/scanner/**` — `ScannerClient.tsx` (3449 righe, **57
  utility di palette grezza** piu' 42 nomi legacy — conteggio del ricercatore), `DoorSurface.tsx` (0), `page.tsx` (0)
- `src/components/scanner/**` — `ScanFlash.tsx` (3)
- `src/app/(admin)/door/**` — `page.tsx` (0)

Piu' `src/components/layout/MobileNav.tsx`, che questa fase cancella (D-42-03).

**Fuori perimetro:** ogni file non elencato sopra; qualunque modifica al
comportamento; qualunque ristrutturazione di `ScannerClient.tsx`.

</domain>

<decisions>
## Implementation Decisions

### I colori dei tre esiti — decisi su misura, non su convenzione

Il proprietario ha chiesto di guardare come funzionano le app dei concorrenti
(RA, Shotgun, DICE, Eventbrite, Xceed) e di prendere il meglio da ognuna. La
ricerca e' stata fatta il 2026-08-18 e ha prodotto un risultato che ribalta la
domanda: **la convenzione condivisa da tutti e cinque e' proprio la parte
misurabilmente rotta.**

**Cosa fanno i cinque**

| App | Accetta | Gia' scansionato | Rifiuta |
|---|---|---|---|
| Xceed | banner verde `CORRECT` | banner **giallo** *Ticket Already Scanned* | messaggio rosso |
| Shotgun | messaggio verde | dentro *invalid*, ma dice **quando e da chi** | **nero e rosso**, non un rosso pieno |
| RA | spunta verde accanto al nome | storico dello scan | *refunded / resold / cancelled* |
| DICE | — (dichiara *«works in almost any light»* e un backup mode senza rete) | | |
| ThunderTix | **schermo pieno verde** + suono | *Already Scanned* | avviso |

Tutti e cinque, di fatto, il semaforo verde/giallo/rosso.

**La misura — RIFATTA il 2026-08-18, e la prima era sbagliata.**

> **Correzione.** La prima stesura di questo documento riportava una tabella
> costruita su due errori, e la conclusione che ne traeva era falsa. Il
> ricercatore della fase l'ha contestata; rimisurando, aveva ragione. Gli errori:
>
> 1. **I colori erano quelli sbagliati.** Tailwind e' alla **v4.2.1**, e la sua
>    palette e' in **oklch**, non negli hex della v3 che erano stati usati.
>    `bg-green-500` rende `#00C950`, non `#22C55E`; `bg-red-500` rende `#FB2C36`,
>    non `#EF4444` (`node_modules/tailwindcss/theme.css`).
> 2. **Le matrici erano etichettate male.** Il documento diceva
>    *Vienot-Brettel-Mollon 1999*, ma solo quella della protanopia lo era. Quelle
>    di deuteranopia e tritanopia erano matrici HCIRN applicate nello spazio
>    sbagliato.
>
> La rimisura usa i colori resi davvero e **Brettel, Vienot & Mollon 1997 a due
> semipiani** in sRGB lineare — il metodo a piano singolo del 1999 e' povero
> sulla tritanopia. **La conclusione cambia**: non era il terzo stato il difetto
> principale, era l'accettazione contro il rifiuto.

Distanza **CIEDE2000**. Sotto 10 = due schermi che una persona di fretta puo'
scambiare. Ogni cifra e' il **peggiore** fra le quattro simulazioni.

**Lo stato di oggi, misurato:**

| Coppia | normale | deuteranopia | protanopia | tritanopia | peggiore |
|---|---|---|---|---|---|
| accetta vs rifiuta (`green-500`/`red-500`) | 82,0 | **8,3** | 32,6 | 67,4 | **8,3** ⚠ |
| accetta vs gia' registrato (`green-500`/`amber-500`) | 49,1 | 14,8 | 10,2 | 57,2 | 10,2 |
| rifiuta vs gia' registrato (`red-500`/`amber-500`) | 38,4 | 15,7 | 30,9 | 17,2 | 15,7 |
| gia' registrato vs pillola *Offline* (`amber-500`/`yellow-500`) | **10,0** | **2,1** | **4,7** | **5,7** | **2,1** ⚠ |

**La terna di oggi ha minimo 2,1, ed e' rotta in due punti diversi.**

**Le alternative, cercate invece che scelte.** Ricerca esaustiva sulla palette
Tailwind v4 (400/500/600) piu' i token del brand con utility esposta, tenendo
fissa l'accettazione su `green-500`, massimizzando il **minimo** fra tutte le
coppie — le tre del flash piu' la pillola *Offline*:

| rifiuta | terzo stato | min | a-r | a-t | r-t | t-Offline | r-Offline |
|---|---|---|---|---|---|---|---|
| `red-500` | `amber-500` — **oggi** | **2,1** | 8,3 | 10,2 | 15,7 | 2,1 | 17,3 |
| `red-500` | `--sem-done` | 8,3 | 8,3 | 20,8 | 31,0 | 27,5 | 17,3 |
| `--sem-crit` | `--sem-done` | 11,4 | 11,4 | 20,8 | 20,7 | 27,5 | 11,8 |
| **`red-600`** | **`--sem-done`** | **15,5** | **15,5** | **20,8** | **33,3** | **27,5** | **21,3** |
| `red-700` | `--sem-done` | 21,3 | 23,1 | 20,8 | 35,5 | 27,5 | 30,2 |

> **CORREZIONE del 2026-08-18 — le due tabelle qui sopra sono state rimisurate
> da uno script, e su tre celle erano sbagliate. Le cifre superate restano dove
> sono: qui sta cosa le sostituisce.**
>
> Fino a oggi nessuna delle due misure di questa fase era stata verificata da un
> terzo — questo documento e `42-RESEARCH.md` §0 riportavano numeri diversi e la
> decisione di scurire il rifiuto poggiava su uno dei due. Il piano 42-03 ha
> scritto `scripts/verify-scan-legibility.mjs`, che implementa il metodo che
> D-42-05 nomina — oklch → sRGB lineare, **Brettel, Vienot & Mollon 1997 a due
> semipiani**, CIEDE2000 — e la cui aritmetica e' verificata contro fonti
> esterne: 14 dei 15 vettori di prova di Sharma alla quarta decimale, e i valori
> di riferimento L\*a\*b\* dei primari sRGB riprodotti esattamente. Il reperto
> completo, con il confronto cella per cella fra le tre fonti, sta in
> **`42-03-FINDINGS.md` §4**.
>
> **Cosa regge.** La direzione di entrambe le tabelle: il minimo di
> accetta-vs-rifiuta sta **in deuteranopia** e vale **8,4** (qui era scritto
> 8,3, la ricerca diceva 8,1 — il gate cade fra le due). Il minimo di
> terzo-stato-vs-pillola vale **2,1**, come scritto. **La terna di oggi ha
> minimo 2,1**, come scritto.
>
> **Cosa era sbagliato, e come:**
>
> | Cella | Qui sopra | Misurato |
> |---|---|---|
> | accetta vs gia' registrato, **protanopia** | 10,2 | **7,0** |
> | rifiuta vs gia' registrato, **normale** | 38,4 | **33,1** |
> | terna decisa `red-600`/`--sem-done`, **minimo** | 15,5 | **14,0** |
>
> **La prima e' la piu' importante e cambia cosa si sa del difetto.** Questa
> tabella dava accetta-vs-terzo-stato **appena sopra** la soglia; misurata, sta
> **sotto**. Con l'ambra di oggi il difetto non e' solo la pillola *Offline*:
> **anche l'accettazione e il gia'-registrato sono confondibili per un
> protanope.** Il gate lo riporta anche per un'altra strada — direzione 1 della
> prova per mutazione — e da' la stessa cifra.
>
> **La seconda e' un errore di aritmetica, non di metodo, e riguarda entrambe le
> fonti.** A vista normale non c'e' nessuna simulazione dicromatica in gioco:
> quella distanza e' solo L\*a\*b\* e CIEDE2000. Questo documento e la ricerca
> dicono **tutti e due 38,4** e sono **tutti e due** in errore — il che dice che
> le due misure non erano indipendenti quanto sembravano.
>
> **La terza non cambia nessuna conclusione ma cambia una cifra che verra'
> citata:** la terna decisa passa la soglia con **14,0**, non con 15,5. Resta
> una coppia **sufficiente**, non comoda — che e' esattamente quanto D-42-01
> dichiara qui sotto, e la frase che nomina il glifo come canale portante vale
> per 14,0 quanto valeva per 15,5.
>
> **Cosa questa correzione NON tocca.** D-42-01 e D-42-02 restano come sono. Le
> loro conclusioni non poggiano sulle celle contestate: poggiano sul fatto che
> il set semantico non contiene un verde e che la fase 40 non ne inventa uno, e
> sul fatto che il rifiuto su `--sem-crit` starebbe a **2,2** dal colore dei
> pulsanti primari — cifra che il gate **conferma esattamente**. `--sem-done`
> misura 20,1 dall'accettazione, 31,0 dal rifiuto e 27,2 dalla pillola: piu'
> basso di quanto la ricerca dichiarava, e comunque il doppio della soglia
> ovunque.
>
> **E un reperto che nessuna delle due tabelle poteva contenere**, perche'
> nessuna delle due misurava i compositi: con la terna decisa, **accettazione
> contro pillola *Offline* sta a 5,5 in protanopia**. Oggi la coppia e' esclusa,
> e giustamente — il flash copre il viewport e nasconde l'intestazione in cui la
> pillola vive. **Ma l'idea differita di trasformare il flash in una card la
> renderebbe reale**, e adesso quell'idea ha il suo costo scritto invece che da
> scoprire. Il gate non si fida della frase: rilegge il contenitore del flash a
> ogni esecuzione e, se smette di essere ancorato a tutti i bordi, misura la
> coppia e rossa nominando la premessa caduta.

### D-42-01 — Il flash e' un vocabolario di sicurezza e resta su colori grezzi, ma il rifiuto si scurisce: `red-500` → `red-600`

L'accettazione resta `green-500`, il rifiuto passa a **`red-600`** (`#E7000B`).
Nessuno dei due prende un token: il set semantico **non ha un colore di
accettazione** e la fase 40 ha deciso di non inventarne uno
(`src/app/globals.css:169-173`). Questa decisione estende la stessa regola al
rifiuto, **ma corregge la tinta**, perche' quella di oggi non regge la misura.

- **Verde contro rosso e' rotto oggi: 8,3 in deuteranopia.** La prima stesura di
  questo documento diceva 28,1 e concludeva *«non e' rotto e non va toccato»*.
  Era falso.
- **`red-600` porta la coppia a 15,5** e migliora ogni altra distanza: 21,3 dalla
  pillola *Offline* (era 17,3), 15,5 dal colore dei pulsanti primari (era 8,6).
- **E migliora il contrasto del glifo bianco: da 3,82:1 a 4,91:1**, cioe' da
  *passa solo come grafica larga* a *passa AA anche come testo*. Un rifiuto piu'
  scuro con un glifo piu' leggibile e' esattamente il verso giusto per uno
  schermo letto a distanza di braccio al buio.
- **Perche' non `red-700`**, che misurerebbe meglio (21,3): la luminanza
  scenderebbe a 0,110 — un lampo di rifiuto quasi spento, e alla porta la
  luminanza e' il canale che si legge con la coda dell'occhio. `red-600` a 0,164
  e' il compromesso, non il massimo di una colonna.
- **Perche' non `--sem-crit`**, che pure supererebbe 10: e' a **2,2** dal colore
  dei pulsanti primari (`--accent`) — un rifiuto dipinto della tinta che ovunque
  nel prodotto significa *premi qui*.
- **Resta un limite dichiarato:** 15,5 non e' una coppia comoda, e' una coppia
  sufficiente. Il canale che porta davvero il rifiuto per un deuteranope e' il
  **glifo**, non la tinta. Vedi il gate in D-42-05.

### D-42-02 — Il terzo stato lascia l'ambra e prende `--sem-done` (`#9B7BE0`)

`already_recorded` passa da `bg-amber-500/90` a `bg-sem-done/90`. **Qui si rompe
deliberatamente la convenzione dei cinque concorrenti**, e il motivo e' misurato.

- **L'ambra e' a 2,1 dalla pillola gialla dell'*Offline***, e il docblock di
  `ScanFlash.tsx:65-72` dichiara per iscritto di aver evitato quella collisione
  *scegliendo ambra invece di giallo*. **Non l'ha evitata**: 10,0 gia' a vista
  normale. **Un secondo commento con lo stesso errore sta a
  `ScannerClient.tsx:2792-2798`** (reperto del ricercatore). Entrambi si
  correggono nel commit del colore: sono affermazioni false dentro il codice.
- **`--sem-done` regge ovunque**: 20,8 dall'accettazione, 33,3 dal rifiuto,
  27,5 dalla pillola *Offline*.
- **Non inventa nessun colore nuovo** — e' gia' dichiarato ed esposto come
  `--color-sem-done` (`globals.css:394`), gia' consumato da 22 file sotto `src/`
  — quindi non tocca la regola della fase 40 per cui aggiungere un colore al
  vocabolario semantico e' del proprietario.
- **Il cambio NON e' una riga, ed e' un reperto del ricercatore.** La cronologia
  degli scan ridisegna gli stessi tre stati con gli stessi path SVG a
  `ScannerClient.tsx:3282-3320`, con `text-green-500`, `text-amber-500` e
  `text-red-500`. Cambiando solo il flash, **il verdetto direbbe violetto e la
  cronologia dello stesso scan direbbe ambra.** Sono due posti, e vanno insieme.
- **Collisione nuova, dichiarata invece che scoperta dopo:** `--sem-done` e' a
  **4,8** da `purple-400`, che nello scanner esiste gia' — il conteggio guest
  list (`ScannerClient.tsx:2695`) e la pill *Undone at the door*
  (`:2934-2935`, `:3388`). **Non tocca il flash**, che e' a schermo pieno e non
  ha nessun viola addosso; tocca la **cronologia**, dove i due possono stare
  sulla stessa riga. Li' pero' ogni voce porta il proprio testo e il proprio
  glifo, e si legge da fermi, non a distanza di braccio. Il piano decide se
  spostare la pill o lasciare la coincidenza dichiarata; **non la scopre.**
- **L'inchiostro del glifo, da risolvere in piano:** bianco su `#9B7BE0` da'
  3,33:1 (passa come grafica larga, non come testo); `--ground` da' 5,99:1. La
  regola in `globals.css:176-178` dice che un semantico usato come riempimento
  porta `--ground`, mai bianco. Il glifo oggi e' `text-white` per tutti e tre
  (`ScanFlash.tsx:35`), quindi la scelta rompe o la regola o la simmetria.

**Il risultato complessivo: la terna passa da minimo 2,1 a minimo 15,5.**

### D-42-03 — `MobileNav.tsx` si cancella, ma la porta resta bloccata sulla forma telefono

`DoorSurface.tsx` monta **`AppNav` con `form="phone"` direttamente**, e
`src/components/layout/MobileNav.tsx` viene rimosso.

- Il wrapper ha **un solo consumatore rimasto** — `DoorSurface.tsx:4`,
  verificato su tutto `src/` — dopo che D-41.2-01 ha portato le altre dieci
  superfici alla forma responsive.
- Esiste solo perche' precedeva la prop `form` di `AppNav`
  (`AppNav.tsx:89-94`). Passare `form="phone"` fa la stessa identica cosa con un
  livello in meno.
- **La porta NON prende la colonna da 224px.** E' la ragione per cui il wrapper
  fu creato (D-41-21), e vale ancora: quello schermo si legge a un ingresso, con
  una mano, al buio, con una fila davanti.
- **Il gate si sposta nello stesso commit, e serve piu' di una riga.**
  `scripts/verify-conversion.mjs:2839` dichiara
  `PHONE_LOCKED_NAV_WRAPPER = 'src/components/layout/MobileNav.tsx'` e i
  docblock alle righe 1110-1123 e 2723-2726 lo descrivono. **Il check E richiede
  DUE modifiche**, non una — vedi D-42-08 punto 2: con una sola il gate esce 2.
  E `MobileNav` e' citato in **prosa in 18 punti**, dodici dei quali su superfici
  gia' convertite: la cancellazione trascina una ricognizione dei commenti, o
  lascia diciotto frasi che descrivono un file che non esiste. E' la regola che il
  repo si e' gia' dato: *«either the surface moved and this entry moves with it
  in the same commit, or the entry is a claim about a file that does not
  exist»*.

### D-42-04 — La conversione non si spedisce prima della prima porta reale

**Questa decisione e' stata scritta sbagliata una prima volta, il 2026-08-18, e
qui e' corretta prima che un piano la ereditasse.** La prima stesura diceva:
reperto meccanico, conversione subito, un solo door pass dopo. **Contraddiceva un
vincolo esplicito del roadmap**, elencato sotto *Ordering Constraints* con la
premessa *«not preferences — each one has a failure mode behind it»*:

> *The scanner is converted last (42), and only after the door's behavioural
> corrections (31, 39) have shipped and been used at a real night.*

**Il vincolo non e' soddisfatto oggi.** Verificato il 2026-08-18 contro il
calendario di produzione (che vive in `docs/`, ignorato — **la data non si
scrive qui**, vedi sotto): la fase 39 e' stata spedita l'11 agosto 2026 e
**nessuna porta reale ha ancora girato su quelle correzioni**. L'unica serata
andata in onda dell'intero calendario resta `Resonate 002`, che e' precedente.
La prossima porta reale e' a calendario e **non e' ancora annunciata**.

**Il modo di fallire che il vincolo previene.** Se la conversione arriva prima
di quella serata, la prima porta reale gira contemporaneamente su correzioni di
comportamento mai usate **e** su una superficie ridipinta. Quando qualcosa va
storto alle due di notte davanti a una fila, nessuno puo' dire quale delle due
l'ha causato — e non c'e' error tracking a raccogliere il pezzo. Il costo del
vincolo e' un'attesa; il costo di violarlo e' un'indagine impossibile su un
turno alla porta.

**Cosa segue, in ordine — ancorato a eventi, mai a date:**

1. **Ora — wave 0, e non tocca nessun file dello scanner.** La riparazione di
   DEF-45-01 (D-42-06) e l'apertura del recinto (D-42-07). Si puo' spedire
   subito: rende misuranti due gate che oggi non misurano nulla.
2. **Ora — il reperto meccanico sul codice NON convertito.** I tre `delay` di
   `FLASH_STATES`, la sequenza degli aptici per esito, la forma della coda
   offline, i tre esiti su entrambe le strade, il manifest delle route.
   Committato come evidenza datata. **Serve comunque**, ed e' l'unica cosa che
   rende la parola *invariato* misurabile su un file di 3449 righe.
3. **Alla prima porta reale — il door pass sullo scanner NON convertito**, che
   chiude il lotto umano delle fasi 38 e 39 (`39-DOOR-PASS.md` §8, D-39-07).
   **Questa e' la linea di base del criterio 3**, ed e' la prima che questo
   progetto avra' mai.
4. **Dopo quella serata — le onde di conversione**, spedite in un giorno **senza
   serata**, con la prima richiesta fatta da chi spedisce (`39-DOOR-PASS.md`
   §0.6). Il reperto meccanico si rifa' e si confronta riga per riga: una
   differenza e' un difetto della conversione, non un dettaglio.
5. **Alla porta successiva — il door pass sul convertito**, e il criterio 3 si
   chiude nei suoi termini letterali: *rieseguito*, con un prima e un dopo.

**Conseguenza sulla pianificazione, ed e' il motivo per cui si pianifica lo
stesso oggi:** i piani si scrivono adesso e restano pronti, cosi' la conversione
parte il giorno dopo la serata invece di cominciare allora. **Ma l'esecuzione
delle onde di conversione e' bloccata fino a quella porta**, e il piano deve
dirlo, non lasciarlo dedurre.

**La data non sta in questo documento, e non e' una svista.** `.planning/` e'
tracciato su un repository **pubblico**, e la serata in questione **non e'
ancora annunciata**: il suo listing esce due giorni prima. Scrivere qui la data,
la sede o la sigla la pubblicherebbe, e una pubblicazione non si annulla
(`ai-engineering.md`, gate *la pianificazione e' pubblica*; `venue-secrecy.md`
applicato al materiale). Chi esegue legge la data **dal calendario in `docs/`**,
che e' ignorato. *Una prima stesura di questo paragrafo la conteneva ed e' stata
tolta prima del commit — registrato qui perche' e' un errore facile da rifare.*

**Se il proprietario decide di spedire prima**, e' una violazione consapevole di
un vincolo d'ordine dichiarato: si registra come tale, con la sua data e la sua
ragione, non si fa passare come una scelta di pianificazione.

### D-42-05 — Il gate della leggibilita' e' uno script, non un'opinione

La misura sopra non e' un ragionamento di questa conversazione: diventa
`scripts/verify-scan-legibility.mjs`, che rilegge i colori **dai file sorgente**
— non da una lista scritta a mano — e rifiuta se una qualunque coppia fra i tre
esiti, piu' la pillola *Offline*, scende sotto la soglia in una qualunque delle
tre simulazioni.

**Cosa deve implementare, per nome:** oklch → sRGB lineare per la palette
Tailwind v4 (`node_modules/tailwindcss/theme.css` e' la fonte, non una copia);
**Brettel, Vienot & Mollon 1997 a due semipiani**; CIEDE2000. **Non** il metodo
a piano singolo del 1999, e **non** le matrici HCIRN in spazio sRGB: sono
esattamente i due errori che hanno prodotto la prima tabella sbagliata di questo
documento, ed e' il motivo per cui il metodo si scrive qui invece di lasciarlo
scegliere a chi implementa.

**Soglia: 10.** Con la terna decisa il minimo misurato e' **15,5**, quindi il
gate nasce verde con margine — **una volta che il colore e' cambiato**. Lo
script **si scrive e si prova per mutazione in wave 0**, ma **si registra in
`verify-all.mjs` solo con l'onda che cambia il colore**: registrato prima,
misurerebbe la terna di oggi (minimo 2,1) e resterebbe rosso per tutto
l'intervallo che D-42-04 blocca. Vedi D-42-09. *Il ricercatore aveva segnalato il rischio opposto
— un gate che nasce rosso e' un gate che qualcuno spegne — e con `red-500` sarebbe
successo (8,3). E' una delle ragioni per cui il rifiuto si scurisce.*

Motivi per cui esiste:

- In un repo senza test runner l'unica prova che esistera' e' quella scritta.
- **Il difetto era gia' in produzione e nessuno lo vedeva**, con **due** commenti
  accanto che dichiaravano il contrario (`ScanFlash.tsx:65-72`,
  `ScannerClient.tsx:2792-2798`). Un gate lo rende impossibile da reintrodurre;
  un commento no — l'ha appena dimostrato.
- Va provato **per mutazione** prima di essere creduto (`ai-engineering.md`,
  gate *prova per mutazione*): si rimette `amber-500`, si verifica che scatti, si
  ripristina — **e si asserisce che la mutazione sia stata applicata**, perche'
  una sostituzione che non va a segno produce un verde che non significa nulla.

**Cio' che il gate NON copre, e va detto:** misura la distanza fra due tinte, non
la leggibilita' di uno schermo. Che un rifiuto si legga come rifiuto a distanza
di braccio al buio resta una **osservazione umana**, e vive nel door pass. Un
verde qui dice *«le tinte sono separabili»*, mai *«la porta funziona»*.

### D-42-06 — DEF-45-01 e' un prerequisito, non un fastidio ereditato

**`npm run verify:conversion` oggi esce 2 con *«Nothing was measured»***,
verificato il 2026-08-18. La lista `CONVERTED` nomina quattro pagine
Finance/Analytics che non sono piu' su disco (`/admin/analytics`,
`/admin/analytics/compare`, `/admin/analytics/members`, `/admin/finance`),
rimosse per decisione dichiarata. Lo stesso vale per `verify:touch-targets`, che
legge la stessa lista.

**Conseguenza diretta su questa fase:** il gate che dovrebbe provare la
conversione della porta **non misura nulla**, quindi la fase 42 non puo'
chiudere il proprio criterio con esso finche' resta cosi'. La rimozione delle
quattro voci sta in **wave 0**, prima di qualunque conversione, ed e' la
riparazione che DEF-45-01 gia' descrive: *«la riparazione e' la rimozione delle
quattro voci dalla lista CONVERTED, non un allargamento del matcher»*.

**Questa resta in wave 0** — a differenza di D-42-05 e D-42-07, vedi la
correzione qui sotto: toglie voci morte da una lista, e non pretende nulla dal
codice dello scanner.

### D-42-07 — Il recinto si apre insieme al colore, non prima

`PHASE_42_PATHS` e' il recinto che ha tenuto la porta fuori dalle fasi 41.x. E'
**questa** la fase che lo rimuove, e i tre percorsi entrano in `CONVERTED` come
superfici dichiarate — con la loro larghezza — nello stesso commit in cui il
recinto sparisce. Tre consumatori leggono quella lista e vanno aggiornati
insieme: `verify-conversion.mjs`, `verify-dialogs.mjs`, `verify-touch-targets.mjs`.

> **Correzione del 2026-08-18, dal campionamento (`42-VALIDATION.md`).** Questa
> decisione diceva *wave 0*. **Era sbagliato, e per la stessa ragione che vale
> per D-42-05.** Aprire il recinto fa scansionare a `verify:conversion` file
> ancora **non convertiti** — 57 utility grezze piu' 42 nomi legacy — quindi il
> gate diventa rosso e **resta rosso per tutto l'intervallo che D-42-04 blocca**,
> cioe' fino alla prima porta reale. *«Un rifiuto permanente e' un rifiuto che
> dopo la terza volta nessuno legge»* — e' scritto in DEF-45-01, ed e'
> esattamente il difetto che questa fase eredita e non deve ricreare.
>
> **Il recinto viaggia con il colore.** Si apre nell'onda che converte, non
> prima.

### D-42-09 — La regola che governa D-42-05 e D-42-07 insieme

**Un gate si registra quando il codice che lo rende verde esiste, mai prima.**

Le due decisioni corrette qui sopra sbagliavano nello stesso modo, e la regola
va scritta una volta invece di essere riscoperta la terza:

| Cosa | Quando | Perche' |
|---|---|---|
| **Scrivere** `verify-scan-legibility.mjs` e provarlo per mutazione | **wave 0** | Non dipende dal colore: la prova per mutazione consiste proprio nel rimetterlo com'e' |
| **Registrarlo** in `verify-all.mjs` | **con l'onda del colore** | Registrato prima, misura la terna di oggi — minimo 2,1 — ed e' rosso per settimane |
| Riparare DEF-45-01 (D-42-06) | **wave 0** | Toglie voci morte da una lista; non guarda lo scanner |
| Aprire `PHASE_42_PATHS` (D-42-07) | **con l'onda del colore** | Aperto prima, scansiona file non convertiti ed e' rosso per settimane |
| Il reperto meccanico pre-conversione (D-42-04) | **wave 0** | Deve descrivere il codice **prima**, quindi non puo' aspettare |

**La forma generale, che vale oltre questa fase:** in una fase la cui esecuzione
e' spezzata da un blocco esterno, ogni gate va collocato **dalla parte del
blocco in cui puo' essere verde**. Un gate rosso per attesa e' indistinguibile
da un gate rosso per difetto, e i due si trattano nello stesso modo: si smette
di guardarli.

### D-42-08 — Aprire il recinto accende tre gate che nessuno aveva contato

Reperti del ricercatore, verificati eseguendo i gate su una copia del tree.
**Stanno qui perche' il piano li affronti come lavoro previsto, non come sorprese
al primo run rosso.**

1. **Riparare DEF-45-01 non basta a far passare `verify:conversion`.** Tolte le
   quattro voci morte, i check A-E passano e **il check F fallisce su sei pagine
   delle fasi 44 e 45** (`calendar`, `location`, `manifesto`, `visual`) che non
   sono mai state dichiarate. Wave 0 non e' chiusa finche' quelle sei non
   ricevono una disposizione — e la disposizione **non e' di questa fase**: e'
   debito delle fasi che le hanno costruite. Va registrata come tale.
2. **Cancellare `MobileNav` fa fallire il check E, e D-42-03 non lo diceva.** Il
   discriminante del gate e' *«importa `AppNav` direttamente e non e'
   `MobileNav`»*: appena `DoorSurface` importa `AppNav`, il gate lo classifica
   come mount della forma **responsive** e pretende la colonna da 224px sulla
   porta — l'esatto contrario di cio' che D-42-03 vuole. La forma minima che
   funziona, provata: **due** modifiche, `PHONE_LOCKED_NAV_WRAPPER` →
   `DoorSurface.tsx` **e** la stessa path aggiunta a `NAV_MODULES`. Con una sola,
   exit 2.
3. **Due gate finora fuori dal recinto diventano rossi appena si apre.**
   `verify:dialogs` su `ScanFlash.tsx:135` (la riparazione e' gia' descritta
   dentro il gate: la ragione si sposta in `EXEMPT_SHELLS`), e
   `verify:touch-targets` con **14 elementi sotto i 44px** in `ScannerClient.tsx`.
   I 14 bersagli sono **fuori dal perimetro *colore, contrasto e tipo*** ma
   dentro il gate dell'accessibilita' — e sono su una superficie che si usa con
   una mano sola al buio. **La decisione va presa prima del primo run rosso**, e
   le due uscite oneste sono: allargare il perimetro dichiarandolo, oppure
   registrarli come debito con la loro misura. Non: abbassare il gate.

Piu' due che il piano deve assorbire: il **check D fallisce su entrambe le
pagine della porta** (nessuna importa `PageShell`), e il mirino oggi **si stira
fino a 1360px** con un `qrbox` fisso da 280 — che e' il criterio 2 in cifre.
Dettagli, misure e le strade proposte sono in `42-RESEARCH.md`.

### Claude's Discretion

Il proprietario ha dichiarato il 2026-08-18: *«expert persona agisce in autonomia
su argomenti tecnico informatico, fermami solo per dubbi veri»*. Restano quindi
all'esperto, senza checkpoint: la larghezza esatta a cui il mirino si ferma e
cosa gli sta intorno (criterio 2 / RESP-05), l'inchiostro del glifo sul terzo
stato, l'ordine delle onde, la forma del reperto meccanico, la soglia numerica
del gate di leggibilita'.

**Torna al proprietario solo:** un colore **nuovo** nel vocabolario del brand
(nessuno e' previsto), un cambio di comportamento alla porta, o la decisione di
spedire in una settimana con una serata.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Il reperto misurato di questa fase — leggerlo per primo
- `.planning/phases/42-scanner-conversion/42-RESEARCH.md` — 1122 righe, gate **eseguiti** su una copia del tree: la forma ripetibile di un piano di conversione qui, cosa pretende ogni check, cosa si rompe cancellando `MobileNav`, la mappa di `ScannerClient.tsx`, e cosa e' catturabile meccanicamente come *prima*

- `.planning/phases/42-scanner-conversion/42-VALIDATION.md` — la mappa di campionamento: 37 righe, **8 raggiungibili ora**, 29 bloccate dietro il door pass, **10 che nessun comando puo' chiudere** e il perche' di ciascuna

### Il perimetro e i gate che lo tengono
- `scripts/conversion-manifest.mjs` §`PHASE_42_PATHS` (righe 202-239) — il recinto che questa fase rimuove, e la ragione per cui esiste
- `scripts/verify-conversion.mjs` — il gate della conversione; righe 1110-1123 e 2723-2726 e 2839 descrivono `MobileNav` per nome, riga 2904 stampa l'esclusione della fase 42
- `scripts/verify-tokens.mjs` check D — un nome dichiarato senza utility deve avere zero consumatori sotto `src/`
- `scripts/verify-touch-targets.mjs`, `scripts/verify-dialogs.mjs` — gli altri due consumatori di `PHASE_42_PATHS`
- `.planning/phases/45-production-sections-section-by-section/deferred-items.md` §DEF-45-01 — perche' due gate su diciassette non misurano nulla oggi

### I colori, e chi li ha decisi prima
- `src/app/globals.css:145-183` — il set semantico, la regola *fill porta `--ground` come inchiostro*, e la frase che vincola questa fase: **il set non contiene verde e la fase 40 non ne inventa uno**
- `src/app/globals.css:185-197` — la scala sunset e' dichiarata ed esposta a nessuno, deliberatamente
- `.planning/phases/40-brand-tokens-typography/40-02-SUMMARY.md:190` — *«Phase 42 inherits… no accept colour»*
- `src/components/scanner/ScanFlash.tsx:1-80` — i tre stati e i quattro canali; il commento alle righe **65-72** dichiara di aver evitato la collisione ambra/giallo, **e la misura lo smentisce**

### La porta, e perche' non e' una superficie come le altre
- `.claude/rules/checkin-offline.md` — i gate del dominio; si carica su `scanner/**`, ed e' la ragione per cui `DoorSurface.tsx` non si sposta da li'
- `.planning/phases/39-the-door-s-own-address/39-DOOR-PASS.md` §0.6 e §8 — la regola di deploy e la stanza buia
- `.planning/phases/39-the-door-s-own-address/39-VERIFICATION.md` — `human_needed`: perche' non esiste un *prima*
- `.planning/phases/41.2-public-member-and-money-surfaces/41.2-CONTEXT.md` §D-41.2-01 — perche' `MobileNav` e' rimasto con un solo consumatore
- `src/components/layout/AppNav.tsx:89-94` — la prop `form`, che rende il wrapper superfluo

### Il metodo di misura
- Vienot, Brettel & Mollon (1999) — simulazione dicromatica applicata in sRGB lineare
- CIE, CIEDE2000 — distanza percettiva; soglia pratica sotto 10 per due schermi confondibili di sfuggita
- Concorrenti consultati il 2026-08-18: `support-pro.shotgun.live` (guida Shotgun Scan), `support.ra.co/article/270`, `support.xceed.me/en/articles/9172610`, `eventbrite.com/help/…/741083`, `apps.apple.com/us/app/dice-access/id1461778861`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`AppNav` con `form="phone"`** — rende `MobileNav` superfluo senza cambiare cio' che la porta mostra (D-42-03)
- **`--sem-done` / `bg-sem-done`** — token gia' dichiarato, gia' esposto, gia' consumato da 22 file sotto `src/`: il terzo stato non inventa nulla
- **`ScanFlash.FLASH_STATES`** — una sola tabella di lookup governa colore, durata e glifo dei tre stati. Il cambio di D-42-02 e' **una riga**, e il file lo dice: *«One lookup, and the only place any of this changes»*

### Established Patterns
- **Il colore non e' mai l'unico canale, ed e' gia' vero**: colore, glifo, permanenza e vibrazione. La seconda meta' di DS-04 e' soddisfatta prima che questa fase cominci; il piano lo verifica, non lo costruisce
- **La prop e' semantica, mai visiva**: `ScanFlash` non ha `variant`, non ha `className`, non ha prop di colore — deliberatamente, *«a style escape hatch here would have to be unpicked there, one call site at a time»*. Non introdurne uno
- **Un semantico usato come riempimento porta `--ground` come inchiostro**, mai `--ink`, mai bianco (`globals.css:176-178`)

### Integration Points
- `DoorSurface.tsx` e' montato da **due** pagine — `/admin/scanner` e `/door` — e la guardia vive li' perche' non possa divergere. Il cambio di navigazione si fa in quel file solo, e serve entrambe
- `ScannerClient.tsx` e' **3449 righe** e possiede la coda offline, la torcia, il ritorno automatico e i contatori. **57 utility di palette grezza** piu' 42 nomi legacy dentro, fra cui `bg-yellow-500` dieci volte per la pillola *Offline*. Nessuna ristrutturazione: la conversione e' meccanica e in loco
- La tipografia dello scanner e' **ereditata** — nessun `font-display`/`font-sans`/`font-mono` dichiarato nel file, solo 22 pesi. I contatori alla porta sono cifre che si confrontano: il piano valuti `tabular-nums`, che e' tipografia e non comportamento

</code_context>

<specifics>
## Specific Ideas

**Cosa si prende dai concorrenti, esplicitamente**

- **Da ThunderTix e Shotgun — lo schermo pieno.** Xceed usa un banner; a distanza di braccio, al buio, il pieno schermo vince. Il nostro e' gia' pieno: si conferma, non si cambia.
- **Da Xceed — lo stato scritto a parole.** *Ticket Already Scanned* e' testo, non solo colore. `ScanFlash` ha gia' `title` e `subtitle`: il piano verifica che il terzo stato sia nominato in parole e non solo dipinto.
- **Da Shotgun e RA — il rifiuto e il gia'-registrato nominano la causa** (rivenduto, trasferito, rimborsato, e *quando e da chi*). Il prodotto ha gia' la classificazione (`src/lib/door/classify.ts`, `outcome.ts`) e la fase 31 ha costruito la lista di revisione: qui si verifica che arrivi allo schermo, non si costruisce.
- **Da DICE — *«works in almost any light»*.** E' una promessa di luminosita', ed e' comportamento: **fuori da questa fase**, vedi Deferred.
- **Da Shotgun — il rifiuto su nero, non su rosso pieno.** Ridurrebbe l'abbagliamento al buio. Misurabile, ma abbassa la luminanza del segnale (`red-500` e' gia' il piu' scuro dei tre a 0,229) e non e' necessario: **non adottato ora**, registrato in Deferred con la sua misura.

**Il commento che va corretto.** `ScanFlash.tsx:65-72` afferma di aver evitato la
collisione con la pillola *Offline* scegliendo ambra invece di giallo. La misura
dice 9,9 a vista normale e 2,0 in deuteranopia. Quel paragrafo si riscrive nello
stesso commit del colore: e' un'affermazione falsa nel codice, ed e' esattamente
il tipo di frase che il prossimo lettore crede.

</specifics>

<deferred>
## Deferred Ideas

- **Forzare la luminosita' dello schermo durante la scansione** — la promessa di
  DICE (*works in almost any light*). E' comportamento, non colore: fuori da
  DS-04 e fuori da questa fase. Vale una voce di roadmap a se'.
- **Il rifiuto su fondo scuro invece che rosso pieno** (modello Shotgun). Ridurrebbe
  l'abbagliamento a un ingresso al buio; cambia la luminanza del segnale e va
  misurato prima, non deciso a occhio.
- **Un suono per esito** — ThunderTix ne ha uno. Alla porta di una serata il suono
  e' inutile per costruzione (il volume in sala), ma vale registrarlo come
  considerato e scartato per una ragione, non dimenticato.
- **`tabular-nums` sui contatori** — se il piano lo giudica fuori dal perimetro
  *colore, contrasto e tipo*, va detto e rimandato invece che fatto di straforo.
- **DS-05 sullo scanner** (una tipografia per display, dati e interfaccia) non e'
  fra i requisiti di questa fase: solo DS-04 e RESP-05. Se la conversione lo
  tocca, e' scope creep.

### Reviewed Todos (not folded)

`gsd-sdk query todo.match-phase 42` ha restituito tre voci con punteggio 0,4-0,6
— `module-load-throws-500-the-whole-middleware-surface`,
`profiles-email-not-unique`, `form-untick-venue-secret-leaves-no-trace`. **Nessuna
e' folded:** tutte e tre hanno corrisposto su parole generiche (*phase*, *fase*,
*non*, *rule*), nessuna riguarda lo scanner, la porta o il sistema visivo.

</deferred>

---

*Phase: 42-scanner-conversion*
*Context gathered: 2026-08-18*
