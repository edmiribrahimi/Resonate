# 42-12 — L'evidenza della fase 42, e l'elenco onesto di cio' che resta aperto

**Piano:** 42-12 · **Onda:** 8 · **Commit misurato:** `fd3bf46`

**Questo repository non ha un test runner per il prodotto.** Non esiste uno script
`test` in `package.json` e non esiste un solo file `*.test.*` o `*.spec.*`. Va detto
qui, una volta, in cima, perche' e' **parte dell'evidenza e non una premessa**: da
nessuna parte in questo documento la parola *verificato* puo' voler dire *i test
passano*. Cio' che esiste sono exit code, asserzioni sul sorgente, un build che e'
anche il typecheck, un diff fra due catture della stessa forma, e **dieci procedure
scritte che una persona deve eseguire a una porta reale**.

**Nessuna riga di questo documento cita una data di calendario, una sede, una sigla
di serata o una persona.** `.planning/` e' tracciato e questo repository e'
**pubblico**. Tutto cio' che deve ancora accadere e' ancorato a un **evento** — *la
prima porta reale* — e chi esegue legge il calendario in `docs/`, che git ignora.

---

## 0. Il fatto che va letto prima di ogni tabella qui sotto

**Il criterio 3 di questa fase non e' chiudibile, e non lo sara' mai.**

Non e' *aperto*, non e' *rimandato*, non e' *pending*. Il criterio dice *«ogni
comportamento dello scanner e' invariato **rispetto a prima della conversione**»*, e
la misura di quel *prima* era la riga 3m — il door pass sullo scanner **non
convertito**. Quella riga non e' stata eseguita, il cancello d'ordine e' stato
scavalcato dal proprietario con il costo enunciato prima della scelta (commit
`5e85d6b`), e le onde 3-8 sono partite comunque. **Da quel momento la riga non e'
rimandabile: e' impossibile, perche' il codice su cui andava misurata non esiste
piu'.**

E' registrato in **DEF-42-04** e in un blocco di deroga datato dentro
`42-PROCEDURES.md`, alla riga 3m. **In questo documento il criterio 3 non e' contato
fra i criteri chiusi, e la tabella §4 lo dice nei suoi termini invece di ammorbidirlo.**

Il secondo motivo per cui quel vincolo esisteva **non e' coperto dalla deroga e resta
in piedi**: alla prima porta reale, correzioni di comportamento mai esercitate (fasi
31 e 39) e una superficie ridipinta gireranno **insieme**, e questo repository **non
ha alcun error tracking**. Se qualcosa cede davanti a una fila, nessuno potra' dire
quale delle due l'ha causato.

---

## 1. Le due forme di evidenza usate qui, e cosa vale ognuna

| forma | cosa prova | cosa **non** prova |
|---|---|---|
| `file:riga` | che una costante, una classe o un ramo **esiste ed e' quello** | che sullo schermo si legga, che il telefono vibri, che la torcia si accenda |
| exit code di un gate | che un'asserzione meccanica sul sorgente ha retto | niente di percettivo: nessuno strumento di questo repository rende un pixel |
| diff fra due catture | che una costante **non si e' mossa** | che il comportamento non si sia mosso |
| riga di procedura con osservazione | il comportamento, come lo ha visto una persona | nulla, finche' non e' compilata — e nessuna lo e' |

Ogni riga delle tabelle che seguono porta la propria forma. **Nessuna riga cita *i
test*.**

---

## 2. DS-04

> **DS-04** — *«Scanner feedback colours stay saturated and unmistakable, and colour
> is never the only channel»*

Il requisito ha due meta' e vanno misurate separatamente, perche' la seconda e'
quella che regge quando la prima fallisce.

### 2.1 — *saturated and unmistakable*

| # | affermazione | evidenza | forma |
|---|---|---|---|
| a | I tre riempimenti vivono in **un solo lookup**, e non in due ternari | `src/components/scanner/ScanFlash.tsx:95` — `FLASH_STATES` | file:riga |
| b | Accettazione: verde saturo, **deroga di palette dichiarata** — l'insieme semantico non ha un colore di accettazione | `src/components/scanner/ScanFlash.tsx:97` | file:riga |
| c | Terzo stato: **semantico di completamento**, non piu' ambra | `src/components/scanner/ScanFlash.tsx:110` | file:riga |
| d | Rifiuto: **un passo piu' scuro** (D-42-01), per allontanarlo dall'accettazione e dal colore che altrove significa *premi qui* | `src/components/scanner/ScanFlash.tsx:125` | file:riga |
| e | Le coppie stanno **≥ 10** in CIEDE2000 sotto visione normale e sotto protanopia, deuteranopia e tritanopia simulate | `npm run verify:scan-legibility` → exit **0**; soglia a `scripts/verify-scan-legibility.mjs:165` | gate + file:riga |
| f | L'inchiostro del lampo e' `--ground` e non bianco, perche' **un semantico usato come riempimento porta il fondo come inchiostro** | `src/components/scanner/ScanFlash.tsx:35`; la regola a `src/app/globals.css:176` | file:riga |
| g | L'affermazione **ritirata** e' rimasta visibile accanto alla misura che la smentisce, invece di essere cancellata | `src/components/scanner/ScanFlash.tsx:65` | file:riga |

**La riga (g) e' evidenza quanto le altre.** Il difetto che questa fase ha chiuso non
era un colore: era **una frase che asseriva l'assenza del difetto**, scritta due volte
in due file, creduta da ogni lettore successivo. Un commento non ha impedito il
difetto; un gate lo rende impossibile da reintrodurre, e i numeri adesso si stampano
a ogni corsa o non si stampa niente.

### 2.2 — *colour is never the only channel*

Quattro canali, e questa fase li ha **verificati** invece di costruirli: esistevano
gia' dalla fase 31, e il compito qui era non romperli.

| canale | accettazione | gia' registrato | rifiuto |
|---|---|---|---|
| **glifo** | `ScanFlash.tsx:104` | `ScanFlash.tsx:119` | `ScanFlash.tsx:132` |
| **permanenza** | 1500 ms · `ScanFlash.tsx:98` | 2500 ms · `ScanFlash.tsx:111` | 2000 ms · `ScanFlash.tsx:126` |
| **vibrazione** | `src/utils/haptics.ts:19` | `src/utils/haptics.ts:38` | `src/utils/haptics.ts:25` |
| **parole** | tutti e 26 i siti passano un titolo — reperto blocco 4 | idem | idem |

Piu' due fatti che tengono insieme i quattro canali:

- La mappatura esito → vibrazione e' **una sola**, e non e' distribuita sui siti:
  `src/app/(admin)/admin/scanner/ScannerClient.tsx:1621`.
- La permanenza **si esegue**: `src/components/scanner/ScanFlash.tsx:146` e' il
  `setTimeout` che chiude il lampo, e `:163` e' il titolo scritto a parole. Lo stato
  e' anche **annunciato**: `:156` e `:157`, `role="status"` e `aria-live="assertive"`.
- Gli stessi tre stati sono disegnati **una seconda volta** nella cronologia delle
  scansioni — `ScannerClient.tsx:3332`, `:3346`, `:3360` — e questa fase ha ridipinto
  **entrambe** le copie. Una conversione che ne avesse ridipinta una sola avrebbe
  lasciato la porta a dire due cose diverse della stessa scansione.

**Cosa DS-04 non ha in questo documento:** una sola prova che uno di questi quattro
canali arrivi a un essere umano. Il glifo e' un `d=`, la vibrazione e' una chiamata,
la permanenza e' un `setTimeout`. Sono righe 1h, 1i e 3o, e sono §5.

---

## 3. RESP-05

> **RESP-05** — *«The scanner centres rather than stretches, and its behaviour is
> unchanged by the visual work»*

Due meta', e la seconda e' la meta' pericolosa.

### 3.1 — *centres rather than stretches*

| # | affermazione | evidenza | forma |
|---|---|---|---|
| a | La superficie dichiara un massimo e si centra — **su entrambe le radici**, perche' il selettore della serata e lo stato di scansione sono la stessa superficie in due stati | `ScannerClient.tsx:2668` e `ScannerClient.tsx:2791` | file:riga |
| b | Il mirino ha un massimo **proprio e piu' stretto**, dimensionato su cio' che decodifica | `ScannerClient.tsx:3242`, e il contenitore della decodifica a `:3243` | file:riga |
| c | Entrambi i massimi sono presi **fra i tre che la shell gia' dichiara**, non inventati come quarto numero di una pagina | `42-10-SUMMARY.md`, decisione registrata | decisione |
| d | Le due pagine della porta sono dichiarate e **misurate** dagli stessi strumenti di ogni altra superficie | `scripts/conversion-manifest.mjs:1055`; `npm run verify:conversion` → exit **0** | gate + file:riga |

### 3.2 — *its behaviour is unchanged by the visual work*

| # | affermazione | evidenza | forma |
|---|---|---|---|
| e | La configurazione della decodifica **non si e' mossa**: frequenza, regione decodificata, fotocamera | `ScannerClient.tsx:1554` e `:1555`; reperto blocco 11, identico | diff + file:riga |
| f | La forma della coda offline non si e' mossa — **una versione di database che sale dentro una fase di colore e' un difetto per definizione** | `src/lib/offline/checkin-store.ts:57` e `:99`; reperto blocco 7, identico | diff + file:riga |
| g | La finestra della doppia lettura non si e' mossa: e' il numero che decide se una seconda lettura e' *gia' registrato* o una scansione nuova | `src/lib/door/classify.ts:64`; reperto blocco 10, identico | diff + file:riga |
| h | Le quattro tabelle di messaggi sono **byte per byte**, comprese le righe a cui stanno: le cause restano distinte | `ScannerClient.tsx:83`, `:99`, `:105`, `:232`; reperto blocco 13, identico | diff + file:riga |
| i | I tre esiti restano **tre**, e un annullamento non e' un quarto: e' un record marcato | `src/lib/door/outcome.ts:116`; reperto blocco 5, identico | diff + file:riga |
| j | I 26 siti che accendono un lampo sono ancora 26, con la stessa distribuzione — 8 *gia' registrato*, 15 rifiuto, 5 accettazione — e tutti e 26 passano un titolo | reperto blocco 4, identico | diff |
| k | Il typecheck passa: `next build` **e'** il typecheck, e non c'e' altro | `npm run build` → exit **0** | build |

**La riga (e) e' quella che separa i due criteri.** Il criterio 2 tocca il
**contenitore**; se avesse toccato la riga della decodifica avrebbe cambiato *cosa la
fotocamera riesce a leggere alla porta*, che non e' un fatto di layout.

**E la meta' (3.2) e' provata solo per le costanti.** Il confronto fra le due catture
sta in `42-BASELINE.md`; quello che chiude e' §5.

---

## 4. I tre criteri di successo, uno per tabella

### Criterio 1

> *«Accept and refuse stay saturated and unmistakable at arm's length in a dark room,
> and each carries a second channel besides colour»*

| cosa e' chiuso | evidenza |
|---|---|
| Le coppie misurate stanno sopra soglia in tutte e quattro le simulazioni | `npm run verify:scan-legibility` exit **0**, registrato nella suite e non piu' opzionale |
| I quattro canali esistono, uno per esito | §2.2 — glifo, permanenza, vibrazione, parole, tutti a `file:riga` |
| Il gate corre a ogni esecuzione della suite | `npm run verify` — il gate e' fra i 18 che hanno raggiunto un verdetto |

| cosa **resta aperto** | riga | chi lo chiude |
|---|---|---|
| Che una persona distingua accettazione e rifiuto **a distanza di braccio, al buio, con una mano** | **1h** | un membro dello staff alla porta, alla **prima porta reale** |
| Che il terzo stato si legga come *gia' registrato* e **mai** come un rifiuto | **1i** | idem, e con una seconda persona che non abbia letto la procedura |

**Perche' nessun comando le chiude.** `verify:scan-legibility` misura la distanza fra
due **tinte**. Una tinta separabile su un grafico e uno schermo leggibile a due metri
con la coda dell'occhio sono **affermazioni diverse**, e il caso peggiore misurato e'
*sufficiente*, non *comodo*: D-42-01 lo dichiara, e dice che per un deuteranope il
canale che porta davvero il rifiuto e' il **glifo**. Solo un occhio lo conferma.

E c'e' l'asimmetria del dominio, che e' la ragione per cui 1i pesa piu' di quanto
sembri: **un falso rifiuto avviene davanti a una fila**, mentre una falsa ammissione
e' un numero in un report.

### Criterio 2

> *«The viewfinder centres at every width instead of stretching, on phone, tablet and
> desktop»*

| cosa e' chiuso | evidenza |
|---|---|
| I due massimi della superficie | `ScannerClient.tsx:2668`, `ScannerClient.tsx:2791` |
| Il massimo del mirino, piu' stretto e dimensionato sulla regione decodificata | `ScannerClient.tsx:3242` |
| La decodifica **non e' stata toccata** dal centraggio | `ScannerClient.tsx:1554`, `:1555` — reperto blocco 11 identico |
| La porta monta la navigazione bloccata in forma telefono, quindi non esiste una colonna sotto cui il centraggio possa spingere qualcosa | `npm run verify:conversion` check E → exit **0** |

| cosa **resta aperto** | riga | chi lo chiude |
|---|---|---|
| Che il mirino sia centrato **e lavorabile** su telefono, tablet e desktop reali | **2d** | chi esegue il pass, su tre dispositivi veri — **non serve una porta**, serve una mano |

**Perche' nessun comando la chiude.** Un'asserzione sul sorgente prova che **una
classe c'e'**. Che il riquadro di decodifica sia raggiungibile con un pollice su un
tablet tenuto in orizzontale e' una proprieta' di una mano.
`verify-conversion.mjs` lo dice del proprio verde: *«it reads a class string and an
import graph, renders nothing and measures no pixel»*.

> **Una nota di formulazione, perche' non si perda.** Il criterio 2 dice *viewfinder*,
> RESP-05 dice *scanner*. Non sono la stessa superficie: il mirino e' il riquadro, lo
> scanner e' la pagina che lo contiene. Questa fase ha dato **un massimo a entrambi**,
> e diversi — e l'ha fatto perche' la divergenza fra i due testi e' stata letta invece
> che risolta scegliendone uno. Se fosse stato centrato solo il mirino, il criterio 2
> sarebbe stato soddisfatto alla lettera e RESP-05 no.

### Criterio 3

> *«Every scanner behaviour — flash timing, haptics, auto-return, torch, offline
> verdict, undo — is unchanged from before the conversion, **verified by running the
> door pass again on a device**»*

**Questo criterio non e' chiuso, non e' aperto, e non e' rimandato: non e'
chiudibile.** La frase in grassetto e' la sua stessa condizione di chiusura, e chiede
un confronto fra due osservazioni umane di cui **la prima non esiste e non puo' piu'
esistere**. La riga 3m — l'unica misura possibile del *prima* — non e' stata eseguita
finche' lo scanner era non convertito, e da quel momento non ha piu' un oggetto da
misurare. **La riga 3n, eseguita da sola, produce una descrizione e non un
confronto.**

**Questa fase non rivendica il criterio 3.** Quello che ha, e che vale quanto vale, e'
questo:

| cosa e' stato provato | evidenza |
|---|---|
| Nessuna delle costanti che decidono un esito si e' mossa | `42-BASELINE.md` §comparazione — tre sole differenze su una regione di 295 righe, tutte e tre argomentate |
| Le tre permanenze e i tre pattern aptici sono invariati | reperto blocchi 1 e 2 |
| I 26 siti e i quattro percorsi sono invariati | reperto blocchi 4 e 8 |
| La forma della coda e la versione del database sono invariate | reperto blocco 7 |
| Le quattro tabelle di messaggi sono byte per byte | reperto blocco 13 |
| Il typecheck passa | `npm run build` exit **0** |
| Venti gate hanno corso, diciotto hanno raggiunto un verdetto e nessuno ha riportato un fallimento; due si sono **rifiutati** per credenziali assenti | `npm run verify` exit **2** in un worktree — e **un rifiuto non e' un pass** |

| cosa **resta aperto** | riga | chi lo chiude |
|---|---|---|
| Il door pass sul **convertito** | **3n** | la **prima porta reale**. Non chiude il criterio 3 — nulla lo chiude piu' — ma e' la **prima** osservazione del comportamento della porta che questo progetto avra', e da li' in poi diventa il *prima* di qualunque cosa venga dopo |
| Che l'aptico si senta, e che i tre esiti si distinguano **al solo tatto** | **3o** | un membro dello staff alla porta. Su una delle due famiglie di sistema operativo la risposta onesta attesa e' *niente affatto*, e quello **e' un risultato** |
| Che la coda offline sopravviva alla chiusura dell'app e al **riavvio del dispositivo** | **3p** | idem — *«una coda in memoria non e' una coda: e' una speranza»* |
| Che la torcia si accenda, e che il ritorno automatico avvenga alle tre permanenze **riabilitando la decodifica** | **3q** | idem. Uno scanner che mostra il colore giusto e poi smette di decodificare **e' uno scanner che ha fallito sembrando corretto** |
| Che la porta renderizzi con la **radio spenta**, all'indirizzo a cui quel dispositivo viene mandato | **3r** | idem — le chiavi della cache **sono URL**, quindi i due indirizzi della porta sono due voci indipendenti e scaldarne uno **non** scalda l'altro |
| Che l'annullamento funzioni offline e sia **attribuito** — chi e quando | **3s** | un ruolo che detiene il permesso, e poi uno che non lo detiene: **un rifiuto silenzioso e' il reperto** |

---

## 5. L'elenco onesto: ogni riga ancora `pending`, e l'evento che la chiude

`42-PROCEDURES.md` porta **dieci** procedure e **dieci** `Result: pending`. **Questo
piano non ne ha compilata nessuna, perche' nessuna osservazione e' stata fatta.**

| riga | cosa misura | evento che la chiude |
|---|---|---|
| **1h** | accettazione e rifiuto distinti a distanza di braccio, al buio | la **prima porta reale** |
| **1i** | il terzo stato letto come *gia' registrato*, mai come rifiuto | la **prima porta reale** |
| **2d** | il mirino centrato e lavorabile a tre larghezze | **nessun evento** — servono tre dispositivi veri e una mano, e si puo' fare oggi |
| **3m** | il door pass sul **non convertito** | **nessuno.** Non e' pending in attesa di qualcosa: e' **impossibile**, per la deroga registrata in DEF-42-04 |
| **3n** | il door pass sul **convertito** | la **prima porta reale** — e produce una descrizione, non un confronto |
| **3o** | l'aptico sentito e distinguibile al tatto | la **prima porta reale** |
| **3p** | la coda che sopravvive a un riavvio | la **prima porta reale** |
| **3q** | la torcia e il ritorno automatico | la **prima porta reale** |
| **3r** | la porta che renderizza con la radio spenta | la **prima porta reale**, sul dispositivo che la lavora |
| **3s** | l'annullamento offline, attribuito | la **prima porta reale** |

**Nove eseguibili, una impossibile.** La riga 3m resta scritta `pending` e **non va
marcata `skipped` ne' `n/a`**: `pending` e' lo stato letterale, e il blocco di deroga
accanto dice perche' non diventera' altro.

> ### Perche' queste righe pesano piu' che su qualunque altra superficie
>
> **Non esiste alcun error tracking in questo repository.** `package.json` non ha
> dipendenze di monitoraggio: nessun errore di produzione raggiunge un essere umano da
> solo. Alla porta questo significa una cosa precisa — **la frase sullo schermo e'
> l'unico osservatore che esiste**, e se qualcosa cede lo sapra' solo chi ha una fila
> davanti.
>
> E' anche perche' le quattro tabelle di messaggi sono state catturate *byte per
> byte*: `meta-gates.md` vieta un handler che collassa cause distinte in un messaggio
> solo, e questo progetto ha gia' il precedente registrato — il form della newsletter,
> che rendeva indistinguibili un problema di rete, una chiave mancante e un indirizzo
> gia' iscritto.

---

## 6. Due cose aperte che nessun gate trovera' da solo, e che non vanno perse

**Entrambe sono state rese leggibili da questa fase e nessuna delle due e' stata
riparata da essa.** Sono qui perche' un documento di chiusura che le omette le
seppellisce.

### 6.1 — DEF-42-06: tre confini di controllo a 2,05 : 1 contro una soglia di 3 : 1

Tre elementi della porta portano il nome del gruppo *linee* al posto del nome del
confine di controllo:

| riga | elemento | cosa fa alla porta |
|---|---|---|
| `ScannerClient.tsx:2706` | `<button>` | sceglie **su quale serata** la porta sta lavorando |
| `ScannerClient.tsx:2867` | `<button>` | accende e spegne **la fotocamera** |
| `ScannerClient.tsx:3106` | `<input type="text">` | cerca un ospite **per nome**, quando la scansione non riesce |

Il livello dei token vieta esattamente questo, in lettere: `src/app/globals.css:44`
dice che nessuno di quei nomi *«may carry the boundary of a text input, a select, a
secondary or ghost button, a checkbox or the scanner target»*, e da' il numero — il
piu' forte dei tre **si ferma a 2,05 : 1**, contro i **3 : 1** che WCAG 1.4.11 chiede
a un confine non testuale. La destinazione giusta esiste ed era stata costruita
apposta: `src/app/globals.css:102`, misurata fra **6,29 e 7,14**.

**Non e' un mancato di poco: e' meno della meta'** — e i tre elementi stanno sul
percorso critico di uno staff che lavora al buio con una mano sola. Il terzo e' il
campo che si usa **quando la scansione ha gia' fallito**.

**Perche' nessun verde lo trovera'.** `--control` e' un nome che
`scripts/verify-tokens.mjs:375` conosce, **ma nessun controllo verifica che un confine
di controllo lo porti**. Il gate della conversione conta i nomi legacy e la palette
grezza, ed entrambi sono a zero su questo file. Un verde su questa porta **non dice
nulla su questa voce**.

### 6.2 — DEF-42-03: quattordici bersagli tattili sotto il minimo

Fino all'onda 7 la porta stava **dietro un recinto** e `verify:touch-targets` era
silenzioso su di essa. Aprendolo, quattordici elementi risultano sotto il minimo, e
sono adesso un **debito con un tetto congelato** invece di un'esenzione invisibile:
`scripts/verify-touch-targets.mjs:1288` fissa il tetto a **14**, e
`scripts/verify-touch-targets.mjs:1353` porta la lista — che puo' solo accorciarsi,
mentre allungarla richiede di editare una costante datata.

Due voci di quella lista meritano di essere nominate qui e non solo contate:

- **La riga della cronologia e' la strada dell'annullamento.** Un bersaglio troppo
  piccolo su quella riga e' un annullamento mancato davanti a una fila.
- **I due elementi piu' piccoli dell'intero prodotto sono le pillole che annunciano
  che qualcosa NON e' stato registrato.** Le uniche due righe che dicono che una
  scansione non e' andata a buon fine sono le due piu' difficili da colpire.

**Perche' non e' stato pagato qui.** Ingrandire un bersaglio **cambia il layout**, e
la seconda meta' di RESP-05 e' che il comportamento dello scanner non cambi per
effetto del lavoro visivo. Una fase che promette di non spostare niente e poi sposta
quattordici bersagli su una superficie di sicurezza ha attraversato il confine che il
proprio mandato le aveva messo. **La terza uscita — abbassare il gate — non e' fra
quelle disponibili**: il gate lo dice di se', *«Fix the ELEMENT, not this gate»*.

---

## 7. Cosa un verificatore dovrebbe leggere, e in quale ordine

1. **Questo documento**, per l'evidenza per requisito e per l'elenco di §5.
2. **`42-BASELINE.md`**, per la comparazione: la sezione AFTER, le tre differenze
   argomentate una per una, e il normalizzatore provato per mutazione in quattro
   versi. Un normalizzatore non provato e' un filtro fra una misura e chi la legge.
3. **`42-PROCEDURES.md`**, per le dieci righe che nessun comando chiude — e per il
   blocco di deroga alla riga 3m, che e' il documento in cui questa fase ha perso un
   criterio.
4. **`deferred-items.md`**, otto voci in tutto: **una chiusa** — DEF-42-05, dal piano
   42-08, leggendo il termine di paragone mancante dai due rami di un `if` invece di
   inventarlo — e **sette aperte**, nessuna delle quali e' di questa fase da chiudere.
   Due sono state aperte dal piano 42-12 stesso: DEF-42-07, lo strumento della cattura
   che dichiara *non convertito* a ogni esecuzione, e DEF-42-08, la riga 3h che chiede
   un'identita' che la forma del reperto rende irraggiungibile — **e che non e' stata
   riscritta**, perche' riscrivere un criterio dopo averne visto l'esito e' piegare la
   misura al risultato.

**E una frase da non ammorbidire, che questa fase ha guadagnato il diritto di
scrivere:** il reperto prova che le **costanti** e le **strade** non si sono mosse.
Non prova che il **comportamento** non si sia mosso. Le due meta' del criterio 3 erano
due documenti che non dovevano contraddirsi; **il secondo non esistera' mai**, e
questo documento lo scrive invece di chiudere la fase come se esistesse.
