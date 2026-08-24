---
date: 2026-08-22
kind: manual-verification
decision: .planning/todos/pending/secret-venue-three-surfaces.md
surfaces:
  - src/app/(public)/events/[slug]/page.tsx
  - src/app/(public)/tickets/[id]/page.tsx
  - src/app/(public)/events/page.tsx
  - src/lib/apple-wallet.ts
  - src/app/api/tickets/[id]/wallet/route.ts
predicate: src/lib/venue-reveal/venue-disclosure.ts
mechanical-gate: npm run verify:venue-surfaces
appendices:
  - date: 2026-08-24
    decision: il pass Wallet non porta mai l'indirizzo
    cells: W1-W5
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
>
> **Dal 2026-08-24 questo documento copre QUATTRO superfici, non tre.** In coda
> c'e' l'**appendice del pass Wallet** — celle **W1-W5** — aggiunta quando il
> proprietario ha deciso che *il pass non porta mai l'indirizzo*. Non e' una
> quarta riga della tabella qui sotto, ed e' importante che non lo sia: le tre
> superfici hanno un **prima** e un **dopo** la rivelazione, il pass **non ne ha
> nessuno dei due**. Le sue celle si leggono con un criterio diverso, scritto la'.

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

---

# Appendice — il pass Apple Wallet (2026-08-24)

> **La decisione.** Proprietario, 2026-08-24: *«il pass non porta mai
> l'indirizzo»*. **Mai** — non «dopo la rivelazione».
>
> **La ragione, ed e' la stessa cosa che rende diverse queste celle.** Un pass
> **esce dal prodotto**: e' firmato, scaricato, aggiunto a un dispositivo e da li'
> sincronizzato sugli altri dispositivi di chi lo possiede. **Non esiste un
> percorso di revoca** — nessun cron, nessuna migration e nessuna riga scritta
> dopo puo' disfare un campo gia' scritto su un file che sta su un telefono
> (`41.2-08-FINDINGS.md` §1.1). Un pass **non si aggiorna a ritroso**: quindi un
> termine di segretezza qui proteggerebbe l'istante dell'emissione e nient'altro.
>
> **Era la quarta superficie**, e non era coperta dalla regola del 2026-08-22:
> stesso titolare, altro medium. La rotta riselezionava la colonna del luogo per
> conto suo, e la sua interrogazione **non portava affatto la spunta di
> segretezza** — sguarnita per costruzione, non per dimenticanza.

## Il criterio con cui si leggono queste cinque celle — e si ROVESCIA

Nel resto del documento una serata **non segreta** che mostra l'indirizzo e' la
cella di controllo: se e' rossa, *la riparazione e' troppo stretta*.

**Qui e' l'opposto, ed e' il punto piu' facile da sbagliare di tutta questa
appendice.** Il pass non porta il luogo **su nessuna serata**, segreta o no. Una
serata non segreta il cui pass mostrasse la sede sarebbe **rossa**, non verde. La
regola non ha un termine da valutare, quindi non ha un caso in cui si allenta.

## Lo strumento, e uno dei due e' quello sbagliato

- **Sbagliato: aprire il pass nell'app Wallet e guardarlo.** L'app dipinge i
  campi che decide di dipingere. Le **due strade che non sono testo** — le
  coordinate che accendono il pass sulla schermata di blocco, e il dizionario
  semantico che legge il sistema operativo — **non hanno alcun pixel**. E' la
  cella 1 con un altro nome, ed e' la stessa lezione delle celle 7-9 qui sopra:
  il pannello Elements mostra cio' che e' stato dipinto, non cio' che e' stato
  spedito. **Una cella qui sotto guardata dall'app Wallet non e' stata eseguita.**

- **Giusto: aprire il file.** Un `.pkpass` e' un archivio zip, e il suo contenuto
  dichiarato sta in `pass.json`. Si legge senza installare nulla:

  ```bash
  D=$(mktemp -d)                                  # FUORI dal repo, che e' pubblico
  curl -s -b "<cookie-di-sessione>" \
       "<indirizzo>/api/tickets/<id-del-biglietto>/wallet" -o "$D/p.pkpass"

  unzip -p "$D/p.pkpass" pass.json | python3 -m json.tool   # cosa c'e' davvero

  # le tre risposte attese, tutte 0:
  unzip -p "$D/p.pkpass" pass.json | grep -c 'PROVA-VIA-SEGNAPOSTO'
  unzip -p "$D/p.pkpass" pass.json | grep -cE '"locations"|"beacons"|"semantics"'
  unzip -p "$D/p.pkpass" pass.json | grep -ci 'venue'

  rm -rf "$D"                                     # il pass di prova non si conserva
  ```

  Il file di prova si scarica in una directory temporanea **fuori dal
  repository** e si cancella: un `.pkpass` e' materiale di produzione, e questo
  repo e' pubblico.

## Il caso in cui queste celle RIFIUTANO invece di essere verdi

Il pass si genera solo se i certificati Apple sono configurati; altrimenti la
rotta risponde **503** e non produce alcun file. Un 503 **non e' una cella
verde**: e' un rifiuto, e va registrato come tale. Una cella che non ha prodotto
un pass non ha misurato che il pass non porta il luogo — non ha misurato niente.

## Le cinque celle

Preparazione: la stessa serata di prova del corpo del documento — `venue_secret =
true`, `venue_text` valorizzato con `PROVA-VIA-SEGNAPOSTO`, una `venues`
collegata con nome e indirizzo segnaposto, un biglietto pagato intestato
all'account di prova. **Nessuna scrittura in produzione**, e le righe si rimuovono
**per chiave primaria** sulla lista catturata alla creazione.

| # | Ruolo | Azione | Esito osservabile |
|---|---|---|---|
| **W1** | **titolare del biglietto**, serata **segreta**, **prima** della rivelazione | scarica il pass e apre `pass.json` | **zero** occorrenze di `PROVA-VIA-SEGNAPOSTO`, **zero** della parola che nomina la sede in qualunque chiave, **nessuna** chiave `locations`, `beacons` o `semantics`. Ci sono e si vedono: il **codice a barre**, la **data**, l'**orario**, il **nome della serata** e il **tier** |
| **W2** | **titolare del biglietto**, stessa serata, **dopo** la rivelazione | rigenera il pass e riapre `pass.json` | **identico a W1.** E' **la cella che dimostra il «mai»**: sulle altre superfici la rivelazione cambia la risposta, qui non la cambia. Ripetere con **entrambe le leve** del tempo — la serata portata dentro la finestra, e `venue_revealed_at` valorizzato — perche' se se ne prova una sola se ne e' provata una sola |
| **W3** | **titolare del biglietto**, serata **NON segreta** (`venue_secret = false`) | scarica il pass e apre `pass.json` | **ancora nessun luogo.** E' la cella rovesciata: qui una sede che comparisse sarebbe **rossa**. Confrontare con la cella 6 del corpo, dove sulla **pagina del biglietto** lo stesso titolare la vede — e' lo stesso lettore, lo stesso biglietto, e due medium con due regole, perche' uno dei due si puo' correggere domani e l'altro no |
| **W4** | **titolare del biglietto**, serata segreta, **senza `party_id`** (pass di evento) | scarica il pass e apre `pass.json` | come W1. E' il ramo che il codice tratta a parte (`"Event Pass"`), e una riparazione che coprisse solo il ramo con la festa lascerebbe questo aperto |
| **W5** | **titolare del biglietto**, qualunque serata, **certificati non configurati** | chiede il pass | **503**, nessun file. **Cella RIFIUTATA, non verde** — e va scritto «rifiutata», perche' un rifiuto registrato come verde e' il modo in cui questa appendice smette di misurare senza che nessuno se ne accorga |

## Cosa questa appendice NON copre, e non finge di coprire

1. **I pass gia' emessi.** Un pass scaricato **prima** del 2026-08-24 porta il
   campo di allora, sul telefono di chi ce l'ha, **per sempre**. Non esiste una
   cella che lo verifichi perche' non esiste un'azione che lo cambi: e' la
   ragione per cui la regola e' «mai» e non «da adesso in poi», e va **detto**,
   non lasciato dedurre.

2. **Il testo libero dei titoli.** Il pass stampa il **nome della serata** e
   quello della **festa**, ed entrambi sono testo che una persona ha scritto in
   un form. Se qualcuno ci scrive dentro un posto, quel posto finisce sul pass
   e viaggia sulla stessa strada irreversibile — e **nessun predicato di questo
   repository puo' vederlo**. `npm run verify:venue-surfaces` lo stampa a ogni
   giro, nel controllo D. Non e' un difetto da riparare nel codice: e' un fatto
   da sapere quando si da' un nome a una serata il cui posto deve restare segreto.

3. **La sostanza del biglietto.** Questa modifica cambia **cosa il pass mostra**,
   non **cosa vale**. Il QR, la firma, la verifica alla porta e la coda offline
   non sono toccati, e la validita' si controlla **allo scan** — mai presunta
   dall'esistenza di un pass (`ticketing-payments.md`, *gate pass Wallet*).

## Registrazione

Con la data: chi ha eseguito, **con quale strumento** ha guardato il pass — e una
cella guardata dall'app Wallet e' una cella non eseguita — quale leva del tempo
per ogni giro di W2, e l'esito di ognuna delle cinque celle, **compreso il
rifiuto**, se i certificati non erano configurati. **Una procedura eseguita e non
registrata non e' distinguibile da una non eseguita.**
