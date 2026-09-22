---
phase: 51-via-le-superfici-da-socio-e-la-porta
document: gli esiti delle procedure della fase — oggi `P-51-1`, percorrendo
procedure: .planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-PROCEDURES.md
requirements: [MEM-03, MEM-04]
environment: laboratorio permanente (`.planning/v1.6-LAB-DESIGN.md`), MAI la produzione
lab_status: ACTIVE_HEALTHY
lab_status_read: "2026-09-22T17:35:00Z"
lab_serves_commit: 44e8c65
lab_serves_since: "2026-09-22T18:35:00Z"
lab_served_commit_before_run: 03e443e
lab_served_commit_during_run: 1159700
runs_walked: 1
runs_open: 1
status: aperto — corsa «prima» PERCORSA il 2026-09-22, corsa «dopo» in corso di trascrizione
---

# Fase 51 — Gli esiti, percorrendo

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Qui si nominano **ruoli** — *il proprietario*, *l'account di staff
> del banco assegnato alla serata di prova* — **mai persone**. **Il riferimento
> del progetto di laboratorio non si scrive qui**: sta in `.env.lab.local`, che
> e' ignorato da git. Nessuna chiave, nessun indirizzo interno di anteprima.
>
> Ogni riga porta l'ora **UTC**, lo strumento, e cio' che si e' **osservato** —
> non cio' che ci si aspettava. Dove l'osservato differisce dall'atteso, la
> differenza si riporta **per prima**.

---

## `PRE-LAB` — accertata il 2026-09-22

**La precondizione di `P-51-1`, letta prima di aprire il telefono.** Tutte le
letture sotto sono **in sola lettura** e nessuna ha toccato la produzione.

| Cosa | Letto | Quando (UTC) | Come |
|---|---|---|---|
| Stato del progetto di **laboratorio** | **`ACTIVE_HEALTHY`** | **2026-09-22T13:28:11Z** | Management API, `GET /v1/projects/<ref del laboratorio>`; il ref viene da `.env.lab.local`, caricato sopra `.env.local` nella forma di `scripts/dev-lab.sh`, col rifiuto del ref di produzione eseguito prima della chiamata |
| Regione del laboratorio | `eu-west-1` | 2026-09-22T13:28:11Z | stessa lettura |
| `lab.resonatemotion.com` risponde | **HTTP 200** su `/events` | 2026-09-22T13:28Z | `curl`, host pubblico |

**Il laboratorio non era in pausa**, quindi non e' stato necessario alcun
restore. Era stato usato il giorno prima: l'inattivita' non aveva raggiunto la
settimana che lo mette a dormire. *(Se lo avesse fatto, il sintomo sarebbe stato
un **NXDOMAIN** sul suo host — progetto `INACTIVE`, non un guasto di rete.)*

### Il codice contro cui si misura

**`lab.resonatemotion.com` serve il commit `03e443e`, del 2026-09-21**, sul ramo
`lab`, da un dispiegamento in stato `READY` **creato il 2026-09-21 alle
15:10:11Z**. Letto dall'alias e dal dispiegamento che l'alias risolve, non dalla
punta del ramo in locale — la punta di `origin/lab` e' lo stesso commit
(`03e443e`, 2026-09-21T17:08:40+02:00), e i due concordano.

**Dal 2026-09-21 15:10:11Z non e' stato creato nessun altro dispiegamento del
ramo `lab`.** E' il fatto che rende decidibile la condizione di D-51-16.

### La condizione di D-51-16 e' **soddisfatta**, e piu' di quanto chiedesse

D-51-16 ammette che la corsa «prima» **citi `P-50-8`** per cio' che `P-50-8` ha
gia' misurato, **a condizione** che il laboratorio serva un commit **senza
modifiche alla porta** rispetto a quella corsa.

`P-50-8` e' stata percorsa il **2026-09-21 fra le 16:01:27Z e le 16:02:19Z**,
cioe' **51 minuti dopo** che quel dispiegamento era andato in linea, e nessun
dispiegamento del ramo `lab` e' seguito. Quindi il laboratorio non serve un
commit *equivalente* a quello che `P-50-8` ha misurato: **serve lo stesso
identico artefatto**. La condizione non regge per assenza di differenze alla
porta — regge per **assenza di differenze**, punto.

**Una seconda misura, perche' la citazione non e' l'unica domanda.** La fase
costruira' su `main`, non sul ramo `lab`, e `origin/main` e' **30 commit avanti**
a `origin/lab` (41 file fuori da `.planning/`). Se in quei 30 commit ci fosse
una modifica alla porta, la linea di partenza presa sul laboratorio
misurerebbe codice piu' vecchio di quello su cui la fase interverra'. Misurato
per percorso, non ricordato:

| Perimetro | File diversi fra `origin/lab` e `origin/main` |
|---|---|
| `src/lib/offline/**`, `src/app/api/tickets/checkin/**`, `src/app/api/tickets/attendance/**`, `src/app/api/membership/**`, `**/scanner/**`, `src/app/(admin)/door/**`, `src/app/sw.ts`, `src/utils/qr.ts` | **0** |
| `src/lib/tickets/holder-label.ts` (adiacente: etichetta del portatore) | 1 — **file nuovo**, e i suoi due soli importatori sono la mail e la pagina dell'ordine (`order-confirmation.ts`, `tickets/order/[token]/page.tsx`). **Nessun importatore nello scanner**: la porta non lo legge |

**Conclusione: il percorso della porta e' identico fra il codice che il
laboratorio serve e il codice su cui la fase interverra'.** La corsa «prima» e'
una linea di partenza valida.

> **Vincolo d'ordine, finche' il checkpoint di 51-01 non e' risolto:** nessun
> `git push` e **nessun dispiegamento del ramo `lab`**. Il primo dispiegamento
> nuovo sostituisce il codice che questa riga dichiara, e con esso la validita'
> di tutto cio' che sta scritto qui sopra.

---

## `P-51-1` — corsa «prima»

**PERCORSA il 2026-09-22**, sul codice attuale, prima che la fase tocchi un file
di prodotto. Forma **ridotta** secondo D-51-16. La procedura, con tutti e nove i
passi, e' in `51-PROCEDURES.md`.

**Percorsa da:** il **proprietario**, su un **telefono vero** (iPhone), Safari in
**scheda privata**, contro **`lab.resonatemotion.com`** — il commit `03e443e`
dichiarato da `PRE-LAB` qui sopra. Serata di prova: la serata gratuita del
laboratorio.
**Con quali account:** i passi 1, 2, 5 e 6 con **l'account di staff del banco
assegnato alla serata di prova** (`door.operate` **per assegnazione**, come
prescrive D-51-12); la sola precondizione del passo 9 con **l'account master del
laboratorio**. *(Perche' due, e non e' un ripiego: vedi il riquadro del 403.)*
**Data e ora:** **16:02–16:17 locali (14:02–14:17Z)** la corsa con l'account di
staff; **16:31–16:32 locali (14:31–14:32Z)** la precondizione con l'account
master. Torino e' UTC+2.
**Prova della modalita' aereo — propria, non ereditata:** nella barra di stato si
vede **l'icona dell'aeroplano** e **nessun indicatore di rete dati ne' di
wi-fi**, alle **16:08** e di nuovo alle **16:32** (schermate del proprietario,
16:08 e 16:32). Non era il solo wi-fi spento.

### La precondizione seminata prima della corsa

Il passo 5 pretende **un invitato di guest list senza email**, e sul laboratorio
**non ce n'era nessuno**: senza di lui il passo non ha soggetto. E' stato
inserito **prima** della corsa, alle **2026-09-22T14:00:59Z**, in
`guest_list_entries` sulla serata gratuita.

| Cosa | Valore |
|---|---|
| Id della riga | `63ebd88f-d2a7-4c65-81bf-afca5d52c350` |
| Nome | «Prova SenzaEmail» — un invitato **fittizio**, non una persona |
| `email` | **NULL** — e' la proprieta' per cui esiste |
| `status` all'inserimento | `invited` |
| `added_by` | il profilo dell'account master del laboratorio |
| Righe di guest list su quella serata | **0 prima**, **1 dopo** |

**L'id e' stato catturato alla creazione**, non cercato dopo: e' la chiave con
cui la riga si cancella quando la corsa «dopo» avra' finito (`ai-engineering.md`,
si cancella per chiave, mai per corrispondenza).

### I nove passi, con cio' che si e' **visto**

| # | Trattamento (D-51-16) | Cosa si e' **visto** |
|---|---|---|
| 1 | **percorsa** — lista scaricata, invitati di guest list senza email presenti **per nome** | **16:05 locali (14:05Z), rete accesa, badge «Online», account di staff.** La lista e' **scaricata**: contatore **«1 / 4 (+1 guest list) (25%)»**, linguette *All (4)* · *Not Arrived (3)* · *Checked In (1)*. **«Prova SenzaEmail» c'e'**, con etichetta **«Guest List»** e il pulsante **«Check in»**. **E si trova per nome:** cercando «Prova» la lista si riduce a lui solo, *All (1)*. Con la tastiera aperta nel campo di ricerca **la pagina si ritaglia** e la riga dell'invitato finisce mezza coperta (difetto di viewport, sotto) |
| 2 | **baseline** — cosa dice l'avviso della lista oggi, e quando si accende | **16:05 locali (14:05Z), rete accesa, badge «Online», lista appena scaricata: l'avviso e' ACCESO lo stesso.** Testo odierno: *«The member list on this device was NOT refreshed. With the radio off, a member who joined recently may not be recognised — check them in from the list rather than refusing them.»* **Non e' un falso positivo: dice il vero**, e la ragione e' il 403 del riquadro qui sotto |
| 3 | **citata `P-50-8`** — passo 4, 2026-09-21 16:01Z | `50-ESITI.md:480`. Biglietto **accettato** a radio spenta: schermo verde, sottotitolo *«RSVP · Offline»*, *«Scanner paused»*, **«Pending (1)»** in testata. Il **nome dell'intestatario sullo schermo** e' registrato li' come non conformita': **e' la linea di partenza di D-51-05** |
| 4 | **citata `P-50-8`** — passo 5, 2026-09-21 16:01Z | `50-ESITI.md:481`. Seconda lettura **non rifiutata e non contata due volte**: schermo viola, *«Recorded at 18:01 by this device»*. Il telefono nomina **se stesso** |
| 5 | **percorsa** — invitato di guest list senza email, ammesso **per nome** a radio spenta | **16:08 locali (14:08Z), modalita' aereo vera.** Due banner in testa: *«This device is not receiving live updates. The list is less than a minute old — tap to reload.»* e quello dei soci del passo 2. La lista resta **tutta visibile**, «Prova SenzaEmail» col suo pulsante. Premuto **«Check in»** → **schermo ROSSO a tutto campo, «✕ Connection error — The guest was not checked in»**. **Nessuna voce in coda, nessuna pastiglia «Pending».** Oggi il check-in per nome e' **solo online** e non ha alcun ramo offline (`ScannerClient.tsx` a `03e443e:2480`, *«Online only — it has no offline branch and never had one»*). **E' la linea di partenza, ed e' la piu' pesante delle tre:** il percorso che D-51-10 tiene in vita, a radio spenta, oggi **non esiste** |
| 6 | **percorsa, come baseline** — dove finisce in vista la testata mentre la lista scorre | **16:13 locali (14:13Z)** (video del proprietario). Scorrendo la lista, il titolo della serata, il badge e il pulsante **«QR Scan» escono SUBITO dalla vista**; restano visibili la riga *«Checked in · updated»*, il campo di ricerca e le tre linguette. La lista completa mostra anche il biglietto gia' entrato dalla corsa `P-50-8` del giorno prima, spuntato alle 18:02 locali |
| 7 | **citata `P-50-8`** — passo 6, 2026-09-21 16:02Z. **Non** sul dispositivo che porta la voce `membership` | `50-ESITI.md:482`. Alla riaccensione: testata **«Online»**, contatore **1 / 3 (33%)**, pastiglia **«Pending» sparita** — la coda si e' drenata. **Non ripercorso oggi, e deliberatamente:** il telefono della corsa porta ora una voce `membership` in coda, e drenarla distruggerebbe la precondizione del passo 9 |
| 8 | **citata `P-50-8`** per la riga unica in `door_scan_events`; la meta' sulla **guest list** si rilegge davvero | La riga unica: `50-ESITI.md:511-529` — una riga e una sola, `outcome = recorded`, `source = offline_sync`, `is_undo = false`, 52 secondi fra `scanned_at` e `recorded_at`. **La meta' sulla guest list e' stata riletta adesso**, e dice l'opposto di cio' che la procedura si aspetta nella corsa «dopo»: vedi la rilettura dal catalogo, sotto |
| 9 | **non percorribile nel «prima»** — il codice che scarta non esiste ancora; la corsa «prima» ne produce solo la **precondizione** | **La precondizione e' stata prodotta: 16:32 locali (14:32Z)**, tabella qui sotto. Il tentativo **con l'account di staff** era fallito alle **16:17 locali (14:17Z)** — schermo **ROSSO**, *«No ticket or member matches this code — Not in the member list on this device — check them in from the list instead»*, **nessuna voce `membership` in coda**: conseguenza diretta del 403, perche' su quel telefono il registro dei soci non era **mai** stato scaricato |

### Il 403 sul registro dei soci — perche' l'avviso del passo 2 dice il vero

**Trovato percorrendo il passo 2, e accertato subito dopo** chiamando il
laboratorio con lo **stesso account di staff** che ha percorso la corsa:

| Chiamata | Con l'account di **staff** (assegnato per serata) | Con l'account **master** (per ruolo) |
|---|---|---|
| `GET /api/membership/list` | **403 Forbidden** | **200**, 8 soci |
| `GET /api/tickets/attendance?partyId=…` | **200** | 200 |

`requireDoorOperator()` **senza `partyId`** risolve le sole capability **del
ruolo**, e lo staff del banco ha `door.operate` **per assegnazione sulla
serata**, non per ruolo. Quindi **su un telefono di staff assegnato per serata il
registro dei soci non si scarica mai**, e l'avviso resta acceso anche col badge
«Online» — **perche' e' vero**.

**Non si corregge**, e la ragione e' di dominio: e' un difetto **pre-esistente**
che questa fase **cancella insieme al percorso soci** (D-51-10, D-51-11). Si
registra come **linea di partenza**, non come cosa da riparare — riparare un
percorso che si sta rimuovendo e' lavoro che la fase butta via il giorno dopo.

**E ha una conseguenza operativa immediata**, che e' la ragione per cui i due
account non sono intercambiabili: con l'account di staff **la precondizione del
passo 9 non era producibile**, perche' senza registro scaricato lo scanner non
riconosce alcun codice socio e non mette nulla in coda. Per quella — e solo per
quella — si e' usato **l'account master**.

### La precondizione che solo questa corsa poteva produrre

Un **codice socio** scansionato a radio spenta e **lasciato in coda**, senza
drenare, sul dispositivo che percorrera' la corsa «dopo».

| Lasciata? | Su quale dispositivo | Quando |
|---|---|---|
| **SI' — una voce `membership`, «Pending (1)»** | il telefono del proprietario, stessa scheda privata, **porta aperta con l'account master del laboratorio** | **2026-09-22T14:32Z** — 16:32 locali |

**Cosa si e' visto:** alle **16:31 locali (14:31Z)**, rete accesa e account
master, la porta sulla stessa serata mostra **nessun banner** sulla lista soci —
il registro si scarica, perche' per ruolo la chiamata da 200 — e «1 / 4 (+1 guest
list)», con «Prova SenzaEmail» ancora *Not arrived*. Alle **16:32 locali
(14:32Z)**, in **modalita' aereo** (aeroplano nella barra, nessuna rete), resta
**un solo banner**, quello degli aggiornamenti dal vivo. Premuto **«QR Scan»** e
inquadrato il **QR della tessera dell'account socio del laboratorio**, aperto su
un portatile: **schermo VERDE**, segno di spunta, **«Member · Offline»**,
*«Scanner paused»*, e in testata **«Pending (1)»**. Dopo il dismiss: **«Pending
(1)» resta**, scanner attivo, contatore **«1 / 4» invariato** — la coda **non e'
drenata**, che e' esattamente cio' che serviva.

*(Il codice della tessera **non si scrive qui**: e' una credenziale che apre una
porta, e questo documento e' pubblicato.)*

> ## L'istruzione che la corsa «dopo» deve leggere PRIMA di toccare quel telefono
>
> **La porta NON va riaperta su quel telefono finche' il laboratorio non serve il
> codice di questa fase.** Il proprietario ha chiuso la scheda con la voce in
> coda, e la coda **si drena solo con la pagina aperta**: `sw.ts` e
> `sync-manager.ts`, a `03e443e`, **non usano Background Sync**. Quindi la rete
> puo' tornare senza rischio — ma una sola riapertura della porta sul codice
> vecchio, con la rete accesa, **manda la voce al server e la precondizione e'
> persa**, e dopo l'aggiornamento non e' piu' fabbricabile senza reinstallare la
> versione vecchia. E' la stessa perdita di `DEF-42-04`, a un tocco di distanza.

### La rilettura dal catalogo — fatta adesso, in sola lettura

Letta il **2026-09-22 alle 14:35:11Z** dal catalogo del **laboratorio**, in
**sola lettura**, sulla serata di prova:

| Cosa | Atteso dalla corsa «dopo» | Letto oggi |
|---|---|---|
| La riga `63ebd88f-…` in `guest_list_entries` | `checked_in`, con `checked_in_at` valorizzato | **`status = invited`**, **`checked_in_at = NULL`**, `email` NULL |
| `door_scan_events` sulla serata | una riga per ogni ingresso registrato | **una riga in tutto**, ed e' **quella di `P-50-8`**: `subject_type = ticket`, `outcome = recorded`, `source = offline_sync`, `is_undo = false`, `scanned_at 2026-09-21T16:01:27.331Z`, `recorded_at 2026-09-21T16:02:19.341Z` |

**La meta' guest list del passo 8 non e' applicabile al «prima», e il catalogo
spiega perche':** il check-in del passo 5 e' **fallito** a radio spenta, quindi
non c'e' nulla da trovare — ne' una voce `checked_in`, ne' una riga nuova in
`door_scan_events`. **La lettura conferma lo schermo rosso invece di
contraddirlo**, ed e' per questo che si scrive: una casella vuota avrebbe
lasciato credere a una dimenticanza.

### Il difetto che questa corsa ha fatto emergere, e che NON e' di questa fase

**Con la tastiera aperta, la porta e il login si RITAGLIANO invece di
ridimensionarsi.** Visto due volte: alle 16:02 sul `/login`, e alle 16:05 nel
campo di ricerca della porta, dove la riga dell'invitato finisce mezza coperta.

E' un difetto di **viewport**, non del percorso offline, e non lo introduce
questa fase. **Rinviato alla fase 52**, registrato come
`door-and-login-viewport-crops-under-keyboard.md`. Si scrive qui perche' e' stato
**visto percorrendo**, e un difetto visto e non scritto e' un difetto perso.

> `Result: PERCORSA` — **2026-09-22, dal proprietario, su un telefono vero, in
> modalita' aereo vera, contro il laboratorio sul commit `03e443e`.**
> **Percorsi davvero** i passi **1, 2, 5, 6** e la **precondizione del passo 9**.
> **Citati da `P-50-8`** (2026-09-21 16:01–16:02Z, stesso artefatto) i passi
> **3, 4, 7** e la meta' «riga unica» del passo **8**, secondo D-51-16.
> **Registrati come baseline** — cioe' *cosa fa il codice di oggi*, non come
> fallimenti — i passi **2** (avviso acceso, e il 403 che lo rende vero), **5**
> (il check-in per nome non ha ramo offline) e **6** (la testata scorre via).
> Il passo **9** non e' percorribile nel «prima» e non lo e' stato: ne e' stata
> prodotta **solo la precondizione**, che e' l'unica cosa che il «prima» poteva
> lasciare.

---

## `PRE-LAB` della corsa «dopo» — accertata il 2026-09-22, la sera

**La stessa precondizione, riaccertata prima della seconda corsa**, perche' fra
le due il laboratorio ha ricevuto una migration e due dispiegamenti: cio' che
`PRE-LAB` dichiarava al mattino misurava un altro artefatto.

| Cosa | Letto | Quando (UTC) | Come |
|---|---|---|---|
| Stato del progetto di **laboratorio** | **`ACTIVE_HEALTHY`** | **2026-09-22 ~17:35Z** | Management API, in sola lettura, col rifiuto del ref di produzione eseguito prima della chiamata |
| Migration 2 (il codice socio esce dal catalogo del laboratorio) | **applicata** | **2026-09-22T17:45:54Z** | piano 51-12, sul **solo** laboratorio |

### I due dispiegamenti contro cui si e' misurato

**Sono due, e la corsa li ha attraversati entrambi**: il secondo e' nato
**durante** la corsa, per il difetto che il passo 7 ha fatto emergere. Scriverne
uno solo racconterebbe una corsa che non e' avvenuta.

| # | Commit | Ramo | Creato (UTC) | `READY` (UTC) | Cosa serviva |
|---|---|---|---|---|---|
| 1 | **`1159700`** | `lab` | 2026-09-22T17:54:34Z | **2026-09-22T17:56:15Z** | il codice della fase fino al piano 51-12 — i passi **9, 1, 2, 6, 3, 4, 5** e il **primo** tentativo del passo 7 |
| 2 | **`44e8c65`** | `lab` | 2026-09-22 ~18:34Z | **2026-09-22 ~18:35Z** | il correttivo scritto in corsa — il **secondo** tentativo del passo 7 e il passo 8 |

Il primo e' arrivato con `git push origin main:lab` alle **~17:54Z**, un
avanzamento veloce da `03e443e` a `1159700`: `lab` era antenato di `main`, quindi
nessuna riscrittura. **Il commit `03e443e` — quello della corsa «prima» — non e'
piu' servito da quel momento**, ed e' la ragione per cui la corsa «dopo» misura
davvero un codice diverso.

### Le tre precondizioni, ricontrollate una per una

| Precondizione | Stato al momento della corsa |
|---|---|
| L'invitato di guest list **senza email** | riga `63ebd88f-d2a7-4c65-81bf-afca5d52c350`, «Prova SenzaEmail», ancora **`invited`**: il passo 5 ha il suo soggetto |
| Un **biglietto valido non scansionato** | i due gratuiti dell'**account di prova coniato dalla fase 50** sulla serata gratuita — «1 di 2» (`28a165b0…`) e «2 di 2» (`8ebc88c8…`), entrambi **non ancora scansionati** all'apertura della corsa |
| La voce **`membership` in coda** sul telefono | **presente** — una sola, lasciata dalla corsa «prima» alle **14:32Z**, nella coda **v5**. La porta **non** era stata riaperta su quel telefono nel frattempo, come l'istruzione pretendeva |

### Due aggiustamenti d'ambiente, entrambi sul solo laboratorio

Nessuno dei due tocca il prodotto: sono **condizioni del banco di prova**, e si
scrivono perche' senza di loro la corsa non sarebbe stata percorribile — e
perche' la prossima corsa le ritrovera' uguali.

1. **L'account di prova della fase 50 non aveva una password di banco.** E'
   nato dal percorso «compra senza account» della fase 50, che conia l'account
   dal biglietto: non ha mai avuto una credenziale da digitare. Gliene e' stata
   **impostata una di laboratorio** — quella gia' usata dagli altri account di
   prova, che vive in `.env.lab.local` e non si scrive qui — tramite l'API di
   amministrazione dell'autenticazione, e la prova di accesso e' andata a buon
   fine. **Solo sul laboratorio.**

2. **Il QR del biglietto non era leggibile da uno schermo di portatile.** La
   pagina `/tickets/[id]` disegna un PNG da **280 px** e lo mostra a **200 px**,
   e il gettone firmato e' lungo **101 caratteri**: molto piu' denso del QR della
   vecchia tessera. La fotocamera del telefono **non lo ha decodificato**,
   nemmeno su uno schermo 4K allo zoom massimo. E' stato rigenerato lo **stesso
   gettone** in un PNG da **1200 px**, e il telefono lo ha letto **al primo
   colpo**.

   > **E' un limite del banco di prova, non della porta**, e va detto in questa
   > forma: alla porta il QR sta sul telefono dell'ospite, non su un monitor a
   > due metri. **Ma e' una nota per il runbook** (`checkin-offline.md`, *prova
   > quel giorno, su quel dispositivo*): chi ripercorrera' `P-51-1` da un
   > portatile perdera' venti minuti sullo stesso scoglio se nessuno glielo
   > scrive.

### La riproduzione che ha toccato il laboratorio, e va dichiarata

**Chi esegue il piano ha guidato un Chrome locale con una fotocamera finta**
contro il laboratorio, per accertare che il codice dello scanner decodificasse
davvero il gettone. **Ha scritto sul laboratorio**, quindi non e' un dettaglio di
metodo: e' un'alterazione del banco, e la rilettura dal catalogo del passo 8 la
ritrova.

| Quando (UTC) | Cosa | Effetto sul catalogo del laboratorio |
|---|---|---|
| **2026-09-22T18:20:12Z** | il biglietto **«1 di 2»** letto **online**, con l'account di staff del banco | **ammesso** — una riga `recorded`, `source = online` |
| **18:20:14Z – 18:21:29Z** | la fotocamera finta ha continuato a inquadrare lo stesso QR in circolo | **19 righe `already_recorded`** in `door_scan_events` |
| dopo, **a radio spenta** | un biglietto di un'**altra** serata di laboratorio (`c65d3e87…`) letto offline | **ammesso e accodato in locale** (`resonate-checkin:v6`). Chrome e' stato chiuso **mentre era offline** e il suo profilo cancellato: **quella voce non ha mai raggiunto il laboratorio**, e quel biglietto risulta **ancora non scansionato** sul server |

**Conseguenza da tenere a mente leggendo il passo 8:** il biglietto **«1 di 2» e'
stato consumato dalla riproduzione, non dal proprietario**, e le **19** righe
`already_recorded` sono sue. Il proprietario ha percorso i passi 3 e 4 con il
biglietto **«2 di 2»**. Attribuire quelle righe alla corsa sarebbe esattamente il
genere di esito inventato che `T-51-63` esiste per impedire.

---

## `P-51-1` — corsa «dopo»

**Sul codice della fase, tutti e nove i passi**, stessa serata, stesso
dispositivo, stesso biglietto o uno coniato allo stesso modo. Va percorsa dopo
che la fase e' dispiegata sul laboratorio, **mai in produzione**.

> **Le tre cose che la corsa «prima» le ha lasciato, e che vanno lette prima
> di toccare il telefono.**
>
> 1. **Il telefono porta UNA voce `membership` in coda, e la porta NON va
>    riaperta su di esso finche' il laboratorio non serve il codice di questa
>    fase.** La coda si drena solo con la pagina aperta (`sw.ts`,
>    `sync-manager.ts` a `03e443e`, nessun Background Sync): la rete puo'
>    tornare, la porta no. Una riapertura sul codice vecchio manda la voce al
>    server e **la precondizione del passo 9 e' persa per sempre** su quel
>    dispositivo.
> 2. **L'invitato di guest list senza email esiste** ed e' ancora `invited`:
>    riga `63ebd88f-d2a7-4c65-81bf-afca5d52c350`, nome «Prova SenzaEmail», sulla
>    serata gratuita del laboratorio. Il passo 5 ha gia' il suo soggetto. A corsa
>    «dopo» finita **si cancella per quella chiave**, mai per corrispondenza
>    sul nome.
> 3. **Il 403 su `/api/membership/list` con l'account di staff assegnato per
>    serata** e' la linea di partenza del passo 2: se dopo la fase l'avviso e'
>    spento, non e' perche' il 403 e' stato corretto — e' perche' il percorso
>    soci non c'e' piu'.

**Percorsa da:** —
**Data e ora:** —
**Prova della modalita' aereo:** —

| # | Cosa si e' **visto** |
|---|---|
| 1 | |
| 2 | |
| 3 | |
| 4 | |
| 5 | |
| 6 | |
| 7 | |
| 8 | |
| 9 | |

> `Result: pending`

---

## Dove va a finire

`MEM-04` si chiude in `51-VERIFICATION.md` (piano 51-14) **citando le due corse
di questo file con la loro data**, non ripetendole. `MEM-03` dipende dal passo 9,
e il passo 9 dipende dalla precondizione che la corsa «prima» deve lasciare: se
quella riga resta vuota, `MEM-03` non ha una prova su dispositivo e lo si
dichiara, invece di sostituirla con una deduzione.
