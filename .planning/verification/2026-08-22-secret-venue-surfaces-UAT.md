---
date: 2026-08-22
kind: manual-verification
decision: .planning/todos/pending/secret-venue-three-surfaces.md
surfaces:
  - src/app/(public)/events/[slug]/page.tsx
  - src/app/(public)/tickets/[id]/page.tsx
  - src/app/(public)/events/page.tsx
predicate: src/lib/venue-reveal/venue-disclosure.ts
mechanical-gate: npm run verify:venue-surfaces
---

# Il venue segreto sulle superfici pubbliche — procedura manuale

> **Perche' questo file esiste e non e' una formalita'.** Questo repository
> **non ha un test runner per il prodotto**: `package.json` non dichiara alcuno
> script `test` e non esiste alcun file `*.test.*` o `*.spec.*`. La verifica
> qui e' `npm run build` (che include il typecheck di Next) piu' una procedura
> scritta. **Scritta, non evocata**: e' l'unica prova che esistera'.
>
> `npm run verify:venue-surfaces` copre la forma del codice — un predicato con
> una casa sola, due superfici che lo interrogano, nessun render sguarnito, e
> **dal 2026-08-22 anche il payload**: nessun nome grezzo di colonna del venue
> dentro un componente `"use client"` sotto `src/app/(public)/`. Non puo' vedere
> un pixel, e non puo' vedere cosa una persona ha scritto dentro un campo di
> testo libero. **Le celle qui sotto sono l'unica misura del comportamento
> osservabile.**
>
> **E tre di quelle celle non guardano la pagina: guardano il documento.** Sono
> le celle 7-9, aggiunte quando un campo si e' scoperto viaggiare verso il
> browser su una superficie dove nessun pixel lo mostrava — quindi invisibile a
> chiunque guardasse *la pagina*, e leggibile da chiunque guardasse *il
> sorgente*. Una procedura che si ferma a cio' che si vede non avrebbe mai
> trovato quel difetto, e non lo troverebbe la prossima volta.
>
> **Questo file e' pubblico** (`.planning/` e' tracciato). Nessun indirizzo,
> nessun nome di sede, nessuna data di serata compare sotto: dove serve un
> esempio si usa un segnaposto.

## Cosa si sta verificando

La regola del proprietario, 2026-08-22:

| Superficie | Prima della rivelazione | Dopo la rivelazione |
|---|---|---|
| **pagina pubblica dell'evento** | `Secret Venue` | **`Secret Venue`** |
| **mail ai possessori di biglietto** | — | l'indirizzo |
| **pagina del proprio biglietto** | nessun indirizzo | il venue, subito |

**La proprieta' che ne discende, e che e' il criterio di ogni esito qui sotto:**
la rivelazione non rende l'indirizzo pubblico — lo rende noto a chi ha comprato.

## Preparazione — e il vincolo che non si viola

**Nessuna scrittura in produzione.** Tutta la preparazione avviene su una
serata **di prova**, e le sue righe si creano catturando gli identificativi al
momento della creazione e si rimuovono **per chiave primaria** su quella lista.
Mai cliccando un controllo di cancellazione in una pagina, mai risalendo un
albero di elementi dal titolo: `ai-engineering.md`, *gate una rimozione si fa
per chiave*, e il precedente che quel gate registra e' costato 63 righe in sette
tabelle.

Serve una serata di prova con:

- `venue_secret = true`
- un `venue_text` **riconoscibile**: usare il segnaposto `PROVA-VIA-SEGNAPOSTO`,
  mai un indirizzo vero. E' la stringa che si cerca a occhio e con *view-source*.
- una `venues` collegata, con `name` e `address` altrettanto segnaposto
- `venue_secret_hint` valorizzato, e **anch'esso riconoscibile**: usare
  `PROVA-INDIZIO-SEGNAPOSTO`. Serve alla cella 1 e alle celle 9a/9b, e un indizio
  generico non e' cercabile con `⌘F`
- un biglietto pagato, intestato all'account di prova

Le due leve del tempo, e **si muove la serata, mai la finestra**
(`venue_reveal_hours` e l'ordine dei passi del cron non si toccano):

- **prima della rivelazione** — `date`/`time` della serata a **piu' di 25 ore**
  da adesso, e `venue_revealed_at` a `NULL`
- **dopo la rivelazione** — o si porta `date`/`time` **dentro** le 25 ore, o si
  valorizza `venue_revealed_at`. **Entrambe le strade vanno provate**: sono i
  due ingressi del predicato, e sono indipendenti per costruzione.

## Le sei celle della PAGINA

Ogni riga: **ruolo · azione · esito osservabile**. Un esito si considera visto
solo se e' stato **guardato**, non dedotto dalla riga sopra.

Queste sei misurano **cio' che si vede**. Le tre che misurano **cio' che il
server ha spedito** vengono dopo, e non sono un di piu': sono la sola forma in
cui il difetto del 2026-08-22 sarebbe stato visibile.

### Prima della rivelazione

| # | Ruolo | Azione | Esito osservabile |
|---|---|---|---|
| **1** | visitatore **senza sessione** | apre `/events/<slug-di-prova>` | il blocco del venue mostra il pulsante **`Secret Venue`**. Nessuna occorrenza di `PROVA-VIA-SEGNAPOSTO` **ne' nella pagina ne' nel sorgente** (`view-source`, poi `⌘F`). Aprendo il dialog: l'indizio **non compare** (serve una sessione), e il testo dice che il venue **non appare mai su questa pagina** |
| **2** | **titolare del biglietto**, autenticato | apre `/events/<slug-di-prova>` | **identico alla cella 1**, meno l'indizio, che ora si vede. **Questa e' la cella che il vecchio codice sbagliava**: il titolare vedeva l'indirizzo qui. Se compare il segnaposto, la riparazione non ha tenuto |
| **3** | **titolare del biglietto**, autenticato | apre `/tickets/<id-del-biglietto>` | **nessuna riga di venue**. Non una riga vuota, non un segnaposto grafico: la riga `📍` **non e' nel documento**. Verificare anche nel sorgente |

### Dopo la rivelazione

Portare la serata di prova oltre la soglia con **una** delle due leve, poi
**ricaricare** (non navigare con il router: forzare un ricaricamento, cosi' che
la pagina venga resa dal server).

| # | Ruolo | Azione | Esito osservabile |
|---|---|---|---|
| **4** | visitatore **senza sessione** | riapre `/events/<slug-di-prova>` | **ancora `Secret Venue`.** Nessun segnaposto, nella pagina o nel sorgente. **Questa e' la seconda cella che il vecchio codice sbagliava**: qui l'indirizzo compariva |
| **5** | **titolare del biglietto**, autenticato | riapre `/events/<slug-di-prova>` | **ancora `Secret Venue`.** Il titolare **non** vede l'indirizzo su questa pagina, **anche se lo vede sul proprio biglietto**. E' la cella che dimostra che il criterio e' la *superficie* e non il *lettore* |
| **6** | **titolare del biglietto**, autenticato | riapre `/tickets/<id-del-biglietto>` | la riga `📍 PROVA-VIA-SEGNAPOSTO` **compare**. Confrontare con la cella 3: stesso ruolo, stessa pagina, stesso biglietto, unica differenza il tempo |

Poi **ripetere le celle 4-6 con l'altra leva** — se la prima volta si e' spostata
la serata, la seconda si valorizza `venue_revealed_at`, e viceversa. I due
ingressi del predicato vanno visti scattare **separatamente**, o se ne e' provato
uno solo e si e' creduto di averne provati due.

## Le tre celle del SORGENTE — quelle che la pagina non puo' mostrare

> **Perche' non bastano le sei sopra.** Le celle 1-6 chiedono *cosa si vede*. Un
> componente `"use client"` riceve una COPIA delle sue props, serializzata dentro
> il documento che il server ha mandato: quella copia viaggia **per ogni riga e
> qualunque cosa venga poi dipinta**. Un ramo scritto dentro il componente
> rifiuta un pixel, non rifiuta un payload — e chi apre il sorgente non incontra
> mai quel ramo. E' cosi' che il testo libero del venue di ogni serata segreta e'
> uscito dalla lista pubblica per una fase intera con tutti i controlli verdi.

**Lo strumento, e uno dei due e' quello sbagliato.**

- **Giusto:** `view-source:` sull'indirizzo, poi `⌘F`. Mostra i byte che il
  server ha spedito, payload compreso — che vive dentro gli script
  `self.__next_f.push(...)` in fondo al documento.
- **Sbagliato:** il pannello **Elements** degli strumenti per sviluppatori.
  Mostra il **DOM**, cioe' cio' che e' stato dipinto: e' la cella 1 con altro
  nome, e su questo difetto sarebbe **verde mentre il dato c'e'**. Se una cella
  qui sotto risulta verde e la si e' guardata da Elements, **non e' stata
  eseguita**.

Un secondo strumento accettabile, quando serve una prova ripetibile:
`curl -s <indirizzo> | grep -c 'PROVA-VIA-SEGNAPOSTO'` — e la risposta attesa e'
`0`. Con una sessione, la stessa richiesta va fatta portando il cookie di
sessione, altrimenti si sta misurando la cella 7 una seconda volta e non la 8.

| # | Ruolo | Azione | Esito osservabile |
|---|---|---|---|
| **7** | visitatore **senza sessione** | `view-source:` su `/events` | **zero** occorrenze di `PROVA-VIA-SEGNAPOSTO` e **zero** di `PROVA-INDIZIO-SEGNAPOSTO`. La card della serata di prova mostra `Secret Venue`, e nel documento accanto a quel marcatore non c'e' nessuna stringa che nomini il posto |
| **8** | **titolare del biglietto**, autenticato | `view-source:` su `/events` | **identico alla cella 7.** E' la cella che nessun'altra copre: il nome della venue arriva da `venue_for_parties`, che su una serata segreta risponde a un chiamante ENTITLED — quindi prima del 2026-08-22 il documento di questo lettore **nominava il posto** che la stessa pagina dichiara segreto. Il criterio e' la **superficie**, non il lettore |
| **9a** | visitatore **senza sessione** | `view-source:` su `/events/<slug-di-prova>` | **zero** occorrenze di `PROVA-INDIZIO-SEGNAPOSTO`. L'indizio si mostra solo a chi ha una sessione, e quel ramo vive dentro il dialog — cioe' nel browser: prima della riparazione la stringa era nel documento anche senza sessione, leggibile **senza nemmeno aprire il dialog** |
| **9b** | **membro autenticato**, senza biglietto | `view-source:` su `/events/<slug-di-prova>` | `PROVA-INDIZIO-SEGNAPOSTO` **compare** (e si vede aprendo il dialog). E' il controllo che dice che 9a non e' verde per eccesso: se anche questa e' vuota, la riparazione ha tolto l'indizio a chi ha diritto di leggerlo, che e' un difetto quanto l'altro |

**Le celle 7 e 8 vanno ripetute dopo la rivelazione**, con entrambe le leve del
tempo. E' il punto in cui il vecchio codice della lista cambiava risposta, ed e'
il punto in cui il nuovo non deve cambiarla: la lista dice `Secret Venue` prima,
dopo, e a serata finita.

### Il controllo della serata NON segreta, sul sorgente

Con `venue_secret = false` la lista mostra il nome — o, se non c'e' una venue
collegata, il testo libero — **e nel sorgente c'e'**. Deve esserci: le locandine
lo stampano. Se questa cella e' rossa la riparazione e' **troppo stretta**.

### Il verso della normalizzazione non si prova da qui, e va detto

La riparazione tratta come **segreta** una spunta che non e' ne' `true` ne'
`false`. Quella cella **non e' eseguibile a mano**: la colonna e' `NOT NULL` con
default, quindi il valore ignoto non si puo' produrre scrivendo un dato — ci si
arriva solo da un embed rifiutato o da una forma che PostgREST risponde diversa
da come il codice la dichiara. **E' asserito meccanicamente** dal controllo E3 di
`npm run verify:venue-surfaces`, provato per mutazione. Scritto qui perche' una
cella assente non si confonda con una cella verde.

## Le due celle che questa procedura NON copre, e non finge di coprire

- **La mail** (riga 2 della tabella del proprietario) e' **preesistente e non e'
  stata toccata**. Non e' in questa procedura perche' non e' in questo diff.
- **Chi compra dopo che la rivelazione e' gia' avvenuta** vede il venue sul
  proprio biglietto — cella 6 lo verifica — **e non riceve alcuna mail**: il
  secondo percorso di rivelazione e' fuori scopo di proposito, ed e' un posto
  nuovo da cui un indirizzo puo' uscire.

## Tre controlli aggiuntivi, che non sono celle ma vanno guardati

1. **Il titolare di un RSVP.** Un RSVP non ha una pagina del biglietto. Prima di
   questa modifica vedeva l'indirizzo sulla pagina pubblica; ora **gli arriva
   solo per mail**. Aprire `/events/<slug-di-prova>` con un account che ha un
   RSVP e confermare che vede `Secret Venue`: e' il comportamento voluto, ed e'
   **una strada sola** dove le altre ne hanno due.
2. **Lo staff.** Un `master` o l'organizzatore che apre la pagina pubblica vede
   `Secret Venue` come chiunque altro. **Non e' una regressione**: e' cio' che
   rende la pagina verificabile guardandola. Il venue resta sulle superfici di
   lavoro sotto `admin/`.
3. **Una serata NON segreta.** `venue_secret = false`: l'indirizzo compare
   normalmente su entrambe le superfici, come prima. Se questa cella e' rossa la
   riparazione e' **troppo stretta**, che e' un difetto quanto l'altro.

## Chiusura

Le righe di prova si rimuovono **per chiave primaria**, sulla lista catturata
alla creazione. Il conteggio di controllo si chiede a una fonte **diversa** da
quella su cui si e' agito: se si e' scritto dall'interfaccia, si conta dal
database (`read_only: true`).

Registrare, con la data: chi ha eseguito, quale leva del tempo per ogni giro, e
l'esito di ognuna delle **nove** celle piu' i tre controlli — annotando, per le
celle 7-9, **con quale strumento** si e' guardato il sorgente. Una cella del
sorgente letta da Elements e' una cella non eseguita, e la nota e' l'unico modo
per accorgersene dopo. **Una procedura eseguita e non registrata non e'
distinguibile da una non eseguita.**
