---
phase: 51-via-le-superfici-da-socio-e-la-porta
document: gli esiti delle procedure della fase — oggi `P-51-1`, percorrendo
procedure: .planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-PROCEDURES.md
requirements: [MEM-03, MEM-04]
environment: le CORSE delle procedure girano sul laboratorio permanente (`.planning/v1.6-LAB-DESIGN.md`), MAI sulla produzione
production_act: ".planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-AUTHORISATION.md" — l'atto di produzione del 2026-09-22 e' registrato in fondo a questo file, e non e' una corsa: e' la spesa di un permesso datato
lab_status: ACTIVE_HEALTHY
lab_status_read: "2026-09-22T17:35:00Z"
lab_serves_commit: 44e8c65
lab_serves_since: "2026-09-22T18:35:00Z"
lab_served_commit_before_run: 03e443e
lab_served_commit_during_run: 1159700
runs_walked: 2
runs_open: 0
status: chiuso — corsa «prima» e corsa «dopo» PERCORSE il 2026-09-22; atto di produzione SPESO il 2026-09-22; la «dopo» con un correttivo scritto in corsa (commit 44e8c65)
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

**PERCORSA il 2026-09-22**, sul codice della fase, tutti e nove i passi.

**Percorsa da:** il **proprietario**, sullo **stesso telefono** della corsa
«prima» (iPhone), Safari in **scheda privata**, contro
**`lab.resonatemotion.com`**. Serata di prova: la stessa, la serata gratuita del
laboratorio.
**Con quale account:** **uno solo** — l'**account di staff del banco assegnato
alla serata** (`door.operate` **per assegnazione**, D-51-12). *(Nella corsa
«prima» ne servivano due: l'account master serviva solo a produrre la
precondizione del passo 9, perche' il registro dei soci dava 403 allo staff.
Quel registro non esiste piu', e con esso la ragione del secondo account.)*
**Data e ora:** **20:09–20:36 locali (18:09–18:36Z)**; la rilettura dal catalogo
alle **18:37:28Z**. Torino e' UTC+2.
**Prova della modalita' aereo — propria, non ereditata:** nella barra di stato si
vede **l'icona dell'aeroplano** e **nessun indicatore di rete dati ne' di
wi-fi**, alle **20:11** e di nuovo alle **20:24** (schermate e registrazioni del
proprietario). Non era il solo wi-fi spento.
**Contro quale codice:** i passi **9, 1, 2, 6, 3, 4, 5** e il **primo** tentativo
del **7** sul dispiegamento **`1159700`**; il **secondo** tentativo del **7** e il
passo **8** sul dispiegamento **`44e8c65`**, nato **durante** la corsa per il
difetto che il passo 7 ha fatto emergere.

> **L'ordine in cui e' stata percorsa non e' quello della tabella.** Il passo 9
> viene **per primo**, perche' e' cio' che si vede all'apertura della porta e non
> si puo' rimandare: una volta aperta, la coda vecchia e' gia' stata giudicata.
> La tabella resta in ordine numerico per potersi confrontare con la corsa
> «prima»; ogni cella porta la sua ora, che e' l'ordine vero.

### I nove passi, con cio' che si e' **visto**

| # | Cosa si e' **visto** |
|---|---|
| 1 | **20:09 locali (18:09Z), rete accesa, account di staff.** La lista si **scarica**: «Prova SenzaEmail · **Guest List** · **Check in**» e' presente, e le linguette dicono *All (4)* · *Not Arrived (3)* · *Checked In (1)* in quel momento. **Nessun banner sulla lista dei soci** — quel percorso non esiste piu'. Al primissimo caricamento, per un istante, compare l'avviso giallo *«The guest list has NOT been downloaded on this device for tonight…»*, che **si spegne appena la lista arriva**: e' l'avviso che dice il vero mentre e' vero |
| 2 | **20:11 locali (18:11Z), radio spenta.** Il **testo e' quello nuovo**, e parla di **guest list** come D-51-10 prescrive: *«The guest list on this device was NOT refreshed (updated 2m ago). A guest added to the list since then will not be found by name — do not refuse them on the strength of this screen; let them in and sort it out in the night's review.»* Accanto, quello degli aggiornamenti dal vivo: *«This device is not receiving live updates. The list is less than a minute old — tap to reload.»* **La condizione di accensione, invece, non e' quella che il passo si aspettava:** l'avviso e' derivato dall'eta' della lista e si accende **appena la radio si spegne** (`listIsStale = !channelLive \|\| age > SAFETY_RELOAD_MS`). **Dice il vero** — a radio spenta la lista non si puo' rinfrescare — ma **differisce dalla lettera del passo 2**, che chiedeva «non acceso se la lista e' fresca». Registrato **come osservato**: e' una **decisione per il proprietario in sede di verifica**, non un difetto chiuso qui |
| 3 | **20:24 locali (18:24Z), radio spenta.** Inquadrato il QR del biglietto **«2 di 2»** (il PNG nitido del `PRE-LAB`): **schermo VERDE e OPACO**, titolo **«Admitted»**, sottotitolo **«RSVP · Offline»**, **nessun nome**. In testata **«Pending (1)»**. D-51-05 onorata: titolo = esito, sottotitolo = tipo, e **il nome dell'intestatario che la corsa «prima» mostrava non c'e' piu'** |
| 4 | **20:24 locali (18:24Z).** Lo **stesso** QR una seconda volta: **schermo VIOLA**, **«Already recorded — Recorded at 20:24 by this device · Offline»**, **nessun nome**. Non rifiutato, non contato due volte, e il **fatto** — ora e dispositivo — e' leggibile |
| 5 | **20:24 locali (18:24Z), radio spenta.** Premuto **«Check in»** accanto a «Prova SenzaEmail»: **schermo VERDE, «Admitted — Guest list · Offline»**. La coda sale a **«Pending (2)»**, e l'elenco **«Recent scans»** mostra **entrambe** le ammissioni. **Nella corsa «prima» qui c'era lo schermo ROSSO «Connection error — The guest was not checked in», e nessuna voce in coda.** E' il buco che il piano 51-15 e' esistito per chiudere, e si chiude |
| 6 | **20:11 locali (18:11Z)** (registrazione del proprietario). Scorrendo la lista, il **titolo** e il pulsante **«QR Scan»** **restano fissi in cima**. Nella corsa «prima» uscivano **subito** dalla vista. **Confermato** |
| 7 | **Due tentativi, e fra i due un correttivo.** **Primo — 20:25–20:26 locali (18:25–18:26Z):** riaccesa la rete con la porta aperta, **il biglietto si drena**: «2 di 2» `checked_in_at` **18:25:50.151Z**, riga `recorded` in `door_scan_events`, `source = offline_sync`, `scanned_at` **18:24:44.964Z**, `recorded_at` **18:25:50.235Z** — **66 secondi** fra il tocco e la registrazione, che e' la finestra offline misurata. **La voce guest NON si drena:** pastiglia ambra **«Sign in again to record 1 entry»**, riepilogo **«Released 1 · recorded 0 · still waiting 0 · could not be recorded 0 · still held 1»**, contatori **3 / 4 (+1 guest list)**, «Prova SenzaEmail» ancora *Not arrived*. **La corsa si e' fermata qui**, com'e' scritto di fare — ed e' il riquadro sotto. **Secondo — 20:36 locali (18:36Z)**, sul dispiegamento `44e8c65`: il proprietario preme la pastiglia ambra → **«Retrying…»** → **drenata**. Contatori **4 / 4 (+1 guest list) (100%)**, **Checked In (4)**, **«Everyone has arrived!»**, **nessun avviso** con la rete accesa. «Prova SenzaEmail» **✓ 20:36** |
| 8 | **E' una lettura dal catalogo, non un'osservazione**, e per questo sta anche in una sezione propria qui sotto, con l'ora. **2026-09-22T18:37:28Z, in sola lettura, sul laboratorio:** la riga `63ebd88f-…` risulta **`checked_in`**, `checked_in_at` **18:36:27.331+00**, `checked_in_by` = **l'account di staff del banco**. Per il biglietto del passo 3 — «2 di 2» — **una riga e una sola**, `recorded` / `offline_sync`. **Ma sulla serata le righe sono 21**, e le 19 in piu' sono della **riproduzione** dichiarata nel `PRE-LAB`, non della corsa |
| 9 | **20:09 locali (18:09Z), all'apertura della porta sul codice della fase.** **Nessuna pastiglia «Pending»**: la voce `membership` lasciata in coda alle **14:32Z** **non c'e' piu'** — l'aggiornamento a **v6** l'ha scartata (D-51-11). **Nulla di `ticket` o `guest` e' andato perso, e non poteva esserlo:** quella era l'**unica** voce in coda, e la coda nuova ha poi accolto regolarmente le due voci dei passi 3 e 5, entrambe arrivate a destinazione. **La riga di console NON e' stata osservata:** nessun Web Inspector era collegato al telefono. **Si dichiara**, invece di dedurla dalla pastiglia sparita — la pastiglia prova che la voce non c'e' piu', non che sia stata loggata con categoria e conteggio |

### Il difetto che il passo 7 ha fatto emergere, e che la fase ha corretto in corsa

**E' esattamente il motivo per cui questa procedura esiste**, e per cui dice
*«se qualcosa non si comporta come descritto, fermati li' e dillo»*.

**Cosa succedeva.** `POST /api/tickets/attendance` respingeva al braccio del
ruolo **ogni** rapporto in coda (`isQueuedReport`) proveniente da un account
rifiutato li' — `if (!auth.ok && isQueuedReport) return refuse(auth)` — e lo
**dichiarava come limite nel proprio docblock**: quella rotta non aveva un
`judgeAtScanTime`, quindi non sapeva giudicare un momento passato. Ma lo staff
tiene la porta **solo per assegnazione sulla serata**: un'ammissione guest
accodata da un telefono di staff **non poteva drenarsi mai** — 403 → `blocked` →
«Sign in again to record 1 entry», e **un nuovo accesso non cambia nulla**,
perche' non e' l'identita' a mancare.

**Riprodotto**, con una `POST` diretta con lo stesso account di staff:
**403 `{"error":"Forbidden"}`**.

**Perche' non era mai scattato.** Fino al piano 51-15 **nessuna voce guest era
mai finita in coda**: il pulsante «Check in» era solo online, e il ramo offline
non esisteva. Il primo drenaggio vero e' stato questo, ed e' stato il telefono
del proprietario a trovarlo.

**Il correttivo — commit `44e8c65`, su `main`, poi sul ramo `lab`, `READY`
~18:35Z.** `judgeAtScanTime` e `ScanTimeJudgement` escono **byte per byte** da
`src/app/api/tickets/checkin/route.ts` e vanno in
`src/lib/door/judge-at-scan-time.ts`: una definizione, due rotte, la stessa
risposta sulla stessa persona nella stessa serata. Nella rotta delle presenze il
rapporto in coda **si lega alla serata** e si giudica a `scannedAt` — assegnazione
viva allora → **registrato e attribuito**; **mai** assegnato → **lo stesso 403 di
prima** (`blocked`); revocata **dopo** la scansione → **registrato**, con
categoria di log propria; domanda senza risposta → **503** (`retry`). Il pulsante
dal vivo, il percorso master e quello organizer **non cambiano di una riga**.
`npm run build` **verde**. *(Prettier ha anche riavvolto qualche riga nelle due
rotte: formattazione, nessun effetto.)*

**Nota di dominio.** Il correttivo **non allarga chi puo' far entrare**: chi non
era assegnato alla serata al momento della scansione riceve lo **stesso** 403 che
riceveva prima. Rende registrabile un'ammissione **gia' avvenuta alla porta** da
chi **era** autorizzato quando l'ha fatta — che e' l'asimmetria di
`checkin-offline.md`: **rifiutare un ospite valido e' peggio che ammetterne uno
doppio**, e perdere un ingresso gia' concesso e' la stessa perdita, differita
alla riconciliazione.

### La rilettura dal catalogo — fatta il 2026-09-22 alle 18:37:28Z, in sola lettura

Letta dal catalogo del **laboratorio**, **in sola lettura**, sulla serata di
prova. **La rilettura conferma, non sostituisce**: dice cosa e' stato
**registrato**, non cosa si e' **visto**.

| Cosa | Atteso dal passo 8 | Letto |
|---|---|---|
| La riga `63ebd88f-…` in `guest_list_entries` | `checked_in`, con `checked_in_at` valorizzato | **`status = checked_in`**, **`checked_in_at = 2026-09-22 18:36:27.331+00`**, `checked_in_by` = **l'account di staff del banco**. *(Nella corsa «prima» era `invited` / `NULL`.)* |
| `door_scan_events` per il biglietto del passo 3 | **una riga e una sola** | **una riga e una sola** per «2 di 2»: `recorded`, `source = offline_sync`, `scanned_at` **18:24:44.964Z**, `recorded_at` **18:25:50.235Z** |
| `door_scan_events` sulla serata, in tutto | — | **21 righe**: **1** della corsa `P-50-8` del 2026-09-21; **1 `recorded` / `online` + 19 `already_recorded`** (18:20:12Z–18:21:29Z) della **riproduzione** con fotocamera finta dichiarata nel `PRE-LAB`; **1 `recorded` / `offline_sync`**, che e' quella del proprietario |
| Una riga `door_scan_events` per l'ingresso **guest** | — | **non c'e', e non e' un difetto:** il drenaggio guest scrive **solo** `guest_list_entries`, come dichiara il SUMMARY del piano 51-15. Chi la cercasse qui ne dedurrebbe un guasto |

**Le 19 righe in piu' non sono della corsa**, e attribuirgliele sarebbe l'esito
inventato che `T-51-63` esiste per impedire: la fotocamera finta ha inquadrato lo
stesso QR in circolo per settantacinque secondi. **L'attesa «una riga e una
sola» del passo 8 regge sul biglietto del proprietario**, che e' il soggetto del
passo.

### Cosa questa corsa ha fatto emergere e che NON e' di questa fase

Due cose, **gia' registrate come todo** e **da non riaprire qui**:

- `door-and-login-viewport-crops-under-keyboard.md` — il ritaglio sotto la
  tastiera, gia' visto nella corsa «prima», rinviato alla fase 52;
- `door-tabs-recent-scans-and-alerts.md` — **chiesto dal proprietario durante
  questa corsa**: «Recent scans» e gli avvisi vogliono linguette proprie.

> `Result: **PERCORSA, con un correttivo scritto in corsa**` — **2026-09-22,
> 18:09Z–18:36Z, dal proprietario, su un telefono vero, in modalita' aereo vera,
> contro il laboratorio.**
> **Percorsi tutti e nove i passi.** I passi **9, 1, 2, 6, 3, 4, 5** e il primo
> tentativo del **7** sul dispiegamento `1159700`; il secondo tentativo del **7**
> e il passo **8** sul dispiegamento `44e8c65`.
> **Il passo 7 si e' fermato al primo tentativo**, e la corsa **non e' stata
> arrotondata**: il difetto — `/api/tickets/attendance` che respingeva ogni
> rapporto in coda da un account con la porta per assegnazione — e' stato
> corretto dal commit `44e8c65` e **il passo e' stato ripercorso**, non dedotto.
> **Due cose restano aperte, e nessuna e' un passo mancato:** la **condizione di
> accensione dell'avviso del passo 2**, che dice il vero ma non cio' che il passo
> si aspettava — **decisione del proprietario in sede di verifica**; e la **riga
> di console del passo 9**, **non osservata** perche' nessun Web Inspector era
> collegato.

---

## Dove va a finire

`MEM-04` si chiude in `51-VERIFICATION.md` (piano 51-14) **citando le due corse
di questo file con la loro data**, non ripetendole. `MEM-03` dipende dal passo 9,
e il passo 9 dipende dalla precondizione che la corsa «prima» deve lasciare: se
quella riga resta vuota, `MEM-03` non ha una prova su dispositivo e lo si
dichiara, invece di sostituirla con una deduzione.

---

# L'atto di produzione — 2026-09-22

> **Questo non e' una corsa: e' la spesa di un permesso datato.**
> Il permesso e' `51-AUTHORISATION.md`, **concesso** il 2026-09-22 con la
> risposta letterale **`TUTTO`**. Qui si registra **l'ora UTC di ogni passo
> mentre accade**, non dopo — una riga si scrive quando il passo e' chiuso e
> riletto.
>
> **Dove l'osservato differisce dall'atteso, la differenza si riporta per
> prima.** Il perimetro scritto non si riscrive: le smentite stanno qui
> (`T-51-58`).

## Passo (a) — le precondizioni della spedizione, misurate e non ricordate

| Condizione | Misurato | Quando (UTC) | Come |
|---|---|---|---|
| `npm run build` su artefatto fresco | **exit 0** (dopo `rm -rf .next`, poi riconfermato) | **19:04Z** | `next build --webpack`, che e' anche il typecheck. **Nessun test runner esiste per il prodotto** (`meta-gates.md`): non si dice il contrario |
| `/membership-card` e `/attendance` nella mappa delle rotte del build | **assenti** — l'unica occorrenza e' `/api/tickets/attendance`, che e' un'altra cosa | 19:04Z | mappa delle rotte stampata dal build |
| `npm run verify:persona` | **7/7 verdi**, controllo **F** compreso | **19:06Z** | `node scripts/verify-persona.mjs`, exit 0 |
| File sotto `docs/`, `.firecrawl/` o `.env*` nel diff `origin/main..main` | **0** | **19:00Z** | `git diff --name-only` |
| File **fuori** da `.planning/` nel diff | **67** — invariati rispetto alla misura di §1.3 | 19:00Z | `git diff --name-only`, escluso `.planning/` |
| Commit da pubblicare | **84** (erano 82 alla scrittura del permesso: +2 di sola documentazione) | 19:00Z | `git rev-list --count origin/main..main` |
| Chiavi nel diff | **zero chiavi vere** — vedi la nota qui sotto | **19:01Z** | `grep -E` su `eyJhbGciOi`, `sbp_`, `sb_secret_`, `re_`, `sup_sk_`, `SUPABASE_SERVICE_ROLE_KEY=`, `TICKET_SIGNING_SECRET=` |
| Serate nella finestra ieri/oggi/domani | **0** | **19:09:25Z** | Management API, `read_only: true`, come `supabase_read_only_user` |
| Produzione inerte | **0** serate future, **0** biglietti, **0** ordini, **0** scansioni, **0** presenze, **0** assegnazioni | 19:09:25Z | stessa lettura |

> **La grep delle chiavi non e' tornata zero, e dirlo cosi' sarebbe falso.** Le
> quattro sigle `eyJhbGciOi`, `sbp_`, `sb_secret_`, `sup_sk_` compaiono **una
> volta ciascuna**, e tutte e quattro **nella stessa riga**: quella della tabella
> di `51-AUTHORISATION.md` §1.3 che **elenca i modelli cercati**. Le 17
> occorrenze di `re_` sono la coda di **`pre_porta`**, il nome della popolazione
> contata in §1.0. **Zero stringhe a forma di chiave**, e la ragione e' scritta
> invece che sottintesa: un «zero» spiegato e' un controllo, un «zero» nudo e'
> una speranza.

### La smentita che vale la pena leggere per prima: il ref del laboratorio NON si pubblica

§1.3 dichiarava come **costo del passo (a)** che *«il ref del progetto di
laboratorio compare 5 volte, in 4 file di `.planning/`»* e che il push lo
avrebbe pubblicato per la prima volta. **Rimisurato alle 19:02Z, non e' vero.**

| Misura | Come | Esito |
|---|---|---|
| Occorrenze del ref di laboratorio nel diff `origin/main..main` | confronto col valore letto da `.env.lab.local`, **mai stampato** | **0** |
| File dell'albero di lavoro che lo contengono | `grep -rl -F` su `.planning`, `.claude`, `scripts`, `src`, `supabase` | **nessuno** |
| Commit che lo hanno mai introdotto o tolto | `git log -S<ref> --all` | **nessuno** — non e' **mai** stato nella history |
| Stringhe a forma di ref (`[a-z]{20}`) nel diff | `grep -oE` | **9**, tutte `cjsfocnhfzycbbgkwocx`, che e' **la produzione** e §1 dichiara gia' pubblica per costruzione |
| `lab.resonatemotion.com` (il **nome dell'host**, non il ref) | `git grep -c -F origin/main` | **gia' pubblico** da prima di questa fase — fasi 49 e 50, `v1.6-LAB-DESIGN.md`. Il push ne aggiunge **17** occorrenze, che non sono informazione nuova |

**Cosa e' successo, con ogni probabilita':** la misura di §1.3 ha contato il
**nome dell'host** e l'ha chiamato **ref** — due cose che quello stesso riquadro
distingueva. **La riga di §1.3 non viene riscritta**, e la smentita sta qui: il
costo dichiarato del passo (a) **non si materializza**, e il proprietario ha
accettato un costo che non c'era. E' il verso innocuo dell'errore, ma resta un
errore di misura, e va detto **prima** che qualcuno lo citi come fatto.

## Passo (a) — `git push origin main` e il deploy di produzione

| Cosa | Valore | Quando (UTC) | Letto da |
|---|---|---|---|
| `git push origin main` | `78f4a81..c61760f` — **84 commit** pubblicati | **2026-09-22T19:11:22Z** | uscita di `git push`, poi `git rev-parse origin/main` = `c61760f` |
| Deploy di produzione | **`dpl_F2pAcyhQfbJPx7sjWNyD7T4XHU53`**, `target: production`, sha **`c61760f`** | creato **19:11:25.967Z**, **`READY` alle 19:13:04.994Z** | **API Vercel** (`GET /v6/deployments`), **non** dal terminale del push |
| Deploy dispiegato prima | `dpl_8CQLLCaKoDuVNnDCDTYT4MsXt4C9`, sha `78f4a81`, `READY` dal 2026-09-21T20:15:09Z | — | stessa lettura |
| `https://www.resonatemotion.com/events`, da anonimo | **200** | **19:13:22Z** | `curl`, nessun cookie, nessuna identita' |
| `/membership-card`, da anonimo | **404** | 19:13:22Z | stessa lettura — **la tessera non esiste piu'** |
| `/attendance`, da anonimo | **404** | 19:13:22Z | stessa lettura — **la pagina delle presenze non esiste piu'** |
| `/tickets`, `/door`, da anonimo | **307** | 19:13:22Z | reindirizzamento al login: e' l'atteso, non un difetto |

**Durata effettiva della corsa del deploy: 1 minuto e 39 secondi** (19:11:25.967Z
→ 19:13:04.994Z). **Da questo istante la finestra `23514` di §1.5 e' APERTA**: il
codice dispiegato scrive `'attendee'` e il `CHECK` in produzione ammette ancora
solo `'member'`.

`Result: **(a) ESEGUITO** — 19:11:22Z (push) → 19:13:04Z (`READY`) → 19:13:22Z (le tre risposte da anonimo).`

## Passo (b) — la migration del piano 51-08, applicata alla produzione

**Applicata da `POST /v1/projects/{ref}/database/migrations`** — mai
`/database/query` — in **una transazione sola**, senza `BEGIN;` esplicito
(rifiutato dallo strumento se ci fosse stato).

| Cosa | Valore |
|---|---|
| File | `supabase/migrations/20260922120000_role_attendee_and_capability_keys.sql`, 33 875 byte, 642 righe |
| Partita / chiusa (UTC) | **19:15:07.921Z → 19:15:08.774Z** — **853 ms** |
| HTTP | **200**, corpo `[]` |
| **Versione coniata** | **`20260922191508`**, nome `20260922120000_role_attendee_and_capability_keys` |

> **§4.2 (i) confermata per l'undicesima volta:** la versione registrata **non e'
> il timestamp del file**. Chi cerchera' `20260922120000` in
> `supabase_migrations.schema_migrations` **non lo trovera'**: la versione e'
> **`20260922191508`**, l'istante dell'applicazione, e il nome porta il prefisso
> del file.

### La rilettura, **dal catalogo** — 19:15:55Z / 19:17:08Z

| Cosa | Atteso (§2, cancello 2) | **Letto dal catalogo** |
|---|---|---|
| `profiles_role_check` | quattro valori, con `attendee` | `CHECK ((role = ANY (ARRAY['master','organizer','staff','attendee'])))` ✓ |
| `role_capabilities_role_check` | idem | identico ✓ |
| `profiles.role` DEFAULT | `'attendee'` | **`'attendee'::text`** ✓ (era `'member'::text`) |
| Profili per ruolo | 2 `attendee`, 0 `member` | **`attendee` 2, `master` 1, `organizer` 1** — **zero `member`**, totale 4 ✓ |
| `private.capabilities` | 17 → **15** | **15** ✓ — `membership.active` e `membership.card.view` **assenti entrambe** |
| `private.role_capabilities` | 32 → **28** | **28** ✓ — `master` 15 + `organizer` 13; **zero concessioni al ruolo `member`** |
| `public.party_assignments` | 0 prima, 0 dopo | **0 prima** (19:09:25Z) e **0 dopo** (19:15:55Z) ✓ — il trigger `profiles_release_expired_assignments` e' scattato due volte e **non ha scritto nulla**, come §1.1 aveva dichiarato |
| `reconcile_master`, corpo | passa `'attendee'` | **`p_role => 'attendee'`** ✓ |

> **Una lettura che sembrava un difetto e non lo e', e va scritta perche' il
> prossimo la rifara'.** `position('''member''' in pg_get_functiondef(...))`
> torna **3300**: nel corpo di `reconcile_master` la parola `'member'` **c'e'
> ancora**. Riletta riga per riga, con la distinzione fra codice e commento:
> **le tre righe che la nominano sono tutte commenti** — *«Fase 51 (D-51-06): era
> `'member'`»* — e **l'unica riga eseguibile e' `p_role => 'attendee'`**. Un
> `position()` su un `pg_get_functiondef` **non distingue un letterale da un
> commento**, e chi si fermasse al numero direbbe che la migration non ha fatto
> il suo lavoro.

### §4.2 (iii) — l'ACL delle funzioni ridefinite, rimisurata e non ricordata

| Funzione | `SECURITY DEFINER` | `search_path` | ACL |
|---|---|---|---|
| `public.handle_new_user` | **si'** | `""` | `postgres`, `anon`, `authenticated`, `service_role` — **come prima** |
| `public.reconcile_master` | **si'** | `""` | **solo `postgres` e `service_role`** — nessun `EXECUTE` ad `anon` o `authenticated` |
| `public.record_membership_act` | **si'** | `""` | solo `postgres` e `service_role` |
| `public.record_party_assignment_act` | **si'** | `""` | solo `postgres` e `service_role` |

**`CREATE OR REPLACE` su firma identica ha conservato l'ACL** — ottava verifica
fra le fasi 49, 50 e 51. Non e' una memoria: e' un criterio di accettazione, e
qui e' stato riletto.

`Result: **(b) ESEGUITO** — applicata alle 19:15:08.774Z, versione `20260922191508`, riletta dal catalogo alle 19:15:55Z e 19:17:08Z. Nove controlli su nove corrispondono.`

## Passo (c) — `purge-attendances.mjs` contro la produzione: **zero soggetti**

Lanciato **con il documento concesso**, che lo strumento legge e verifica prima
di toccare qualunque cosa:

```
node --env-file=.env.local scripts/purge-attendances.mjs --dry-run \
     --project cjsfocnhfzycbbgkwocx \
     --authorised .planning/.../51-AUTHORISATION.md --dated 2026-09-22
```

> **Un rifiuto prima del referto, e non e' un difetto.** Al primo tentativo lo
> strumento ha risposto **`RIFIUTO` con uscita 2**: `SUPABASE_ACCESS_TOKEN` non
> era nell'ambiente, perche' **lo script non carica i file `.env` da se'** — lo
> fa `scripts/dev-lab.sh` per lui. Si e' ricaricato con `--env-file=.env.local`.
> **Nessuna lettura era avvenuta**, ed e' esattamente cio' che l'uscita 2
> significa nel suo docblock.

| Cosa | Valore | Quando (UTC) |
|---|---|---|
| Bersaglio riconosciuto | **PRODUZIONE** | 19:19:13.347Z |
| Autorizzazione letta e accettata | atto, concessione, data e non-esaurimento, tutti e quattro | 19:19:13.347Z |
| `party_id` valorizzato — **cio' che D-51-04 autorizza** | **0** | **19:19:13.797Z** |
| `party_id` nullo — **il residuo pre-porta** | **0** | 19:19:13.797Z |
| Totale | **0** | 19:19:13.797Z |
| Cascata **in uscita** (`confrelid`), dal catalogo | **0** — nessuna tabella pende da `attendances` | 19:19:13.797Z |
| Cascata **in entrata** (`conrelid`) | **4** — `auth.users` ×2, `event_parties`, `events`. Direzione opposta: non e' la cascata dell'atto | 19:19:13.797Z |
| Istantanea | scritta **prima** di qualunque scrittura, `0` righe, vicinato misurato. Il file e' coperto da `.gitignore:34` (`.env*`), verificato con `git check-ignore` | 19:19:13.346Z |
| **Contatore di controllo, FONTE DIVERSA** — PostgREST con la chiave di servizio | **0** | **19:19:15.265Z** |
| Uscita | **0** | 19:19:15.265Z |

**Le due fonti concordano sullo zero.** Il Management API e PostgREST — due
strade diverse verso lo stesso progetto, con la guardia sull'URL che impedisce al
contatore di leggere un altro database e tornare zero **per la ragione
sbagliata**.

### `--apply` **non e' stato lanciato**, e la ragione e' il perimetro, non la fretta

Lo strumento, a zero righe, **esce prima di qualunque `DELETE`** in entrambi i
modi: il ramo dello zero precede la sezione dell'atto. Lanciare `--apply` avrebbe
prodotto **lo stesso referto** e una seconda istantanea, ed e' la cosa che questo
progetto ha scritto di non fare: *«una decisione senza soggetti non si esegue»*.
`51-AUTHORISATION.md` §2, cancello 3, chiede il `--dry-run` **e ci si ferma se il
numero non e' zero**. Il numero e' zero.

**Conseguenza dichiarata:** lo strumento **non ha consumato** l'autorizzazione —
lo dice lui stesso nel referto. La marcatura `spent: yes` e' quindi **a mano**, in
chiusura d'atto, e il documento lo registra.

`Result: **(c) ESEGUITO, SENZA SOGGETTI** — 19:19:13Z → 19:19:15Z, zero righe su due fonti, uscita 0, nessuna riga cancellata perche' non ce n'era nessuna.`

## Passo (d) — la migration del piano 51-12, applicata alla produzione

| Cosa | Valore |
|---|---|
| File | `supabase/migrations/20260922180000_drop_membership_code_and_rename_acts.sql`, 47 517 byte, 932 righe |
| Partita / chiusa (UTC) | **19:20:24.302Z → 19:20:24.987Z** — **685 ms** |
| HTTP | **200**, corpo `[]` |
| **Versione coniata** | **`20260922192024`**, nome `20260922180000_drop_membership_code_and_rename_acts` |

**La guardia `DO` del passo 7 e' passata senza sollevare**: `public.attendances`
era vuota, misurata due volte da due fonti sette minuti prima.

### La rilettura, **dal catalogo** — 19:20:57Z → 19:21:51Z

| Cosa | Atteso (§2, cancello 4) | **Letto dal catalogo** |
|---|---|---|
| `profiles.membership_code` | **assente** | **0 colonne** con quel nome in `information_schema.columns` ✓ |
| `public.account_acts` | **presente** | `to_regclass` → **`account_acts`** ✓, **2 righe** — le stesse due di prima del rinomina |
| `public.membership_acts` | **assente** | `to_regclass` → **`null`** ✓ |
| `public.attendances` | **inesistente** | `to_regclass` → **`null`** ✓ — `DROP TABLE` **senza `CASCADE`**, riuscito |
| I **sette** vincoli rinominati | 7 | **7**: `account_acts_pkey`, `_act_check`, `_actor_attributed`, `_actor_id_fkey`, `_actor_kind_check`, `_party_id_fkey`, `_subject_id_fkey` ✓ |
| I **tre** indici | 3 | **3**: `account_acts_pkey`, `idx_account_acts_actor`, `idx_account_acts_subject` ✓ |
| Residui col prefisso vecchio | 0 | **0 vincoli** e **0 indici** che comincino per `membership_acts` ✓ |
| La policy | rinominata | **`account_acts_select_register_read`**, `SELECT`, su `private.has_capability('register.read')` ✓ — **RLS attiva** |
| **Il `REVOKE` su `service_role`** | intatto | `aclexplode(pg_class.relacl)`: a `service_role` restano **`SELECT`, `REFERENCES`, `TRIGGER`, `TRUNCATE`, `MAINTAIN`** e **NON** `INSERT`, `UPDATE`, `DELETE` ✓ — **la chiave di servizio non puo' scrivere nel registro se non passando da `record_account_act`**. E' il gate *chi decide e' tracciato* di `community-membership.md`, e sopravvive al rinomina |
| Le quattro funzioni vive | 4 | **`handle_new_user`, `reconcile_master`, `record_account_act`, `record_party_assignment_act`** — tutte **`SECURITY DEFINER`** con **`search_path=""`** ✓. **`record_membership_act` non esiste piu'**: e' stata **rinominata**, non duplicata |
| `reconcile_master`, corpo, righe eseguibili | chiama il nuovo nome | **`PERFORM public.record_account_act(`** ×2 e **`p_role => 'attendee'`** ✓ — **zero** righe eseguibili che nominino `membership_code` o `attendances` |
| ACL delle funzioni | conservata | `reconcile_master`, `record_account_act`, `record_party_assignment_act`: **solo `postgres` e `service_role`**; `handle_new_user` come prima ✓ |

### L'istantanea, ripresa — e la differenza da spiegare non c'e'

| Misura | Atteso (§3.7) | **Riletto alle 19:21:51Z** |
|---|---|---|
| Tabelle in `public` | **40** (erano 41: esce `attendances`) | **40** ✓ |
| Righe in tutto | **2397** | **2397** ✓ |
| `private.role_capabilities` | **28** | **28** ✓ |

**Nessuna differenza da spiegare riga per riga: non ce n'e' nessuna.** Il
perimetro non ha cancellato **una sola riga di dati** in produzione, ed e' cio'
che l'autorizzazione dichiarava in §1.0-bis.

**Da questo istante entrambe le finestre di §1.5 sono CHIUSE.** Durate effettive:
**`23514`** dalle **19:13:04.994Z** (deploy `READY`) alle **19:15:08.774Z** —
**2 minuti e 4 secondi**; **`42883`/`42P01`** dalle 19:13:04.994Z alle
**19:20:24.987Z** — **7 minuti e 20 secondi**. Su un progetto con **zero serate
in vendita, zero biglietti, zero ordini e zero serate future**, entrambe sono
costate **zero a chiunque**.

`Result: **(d) ESEGUITO** — applicata alle 19:20:24.987Z, versione `20260922192024`, riletta dal catalogo alle 19:20:57Z e 19:21:51Z. Tredici controlli su tredici corrispondono.`

## Passo (e) — la rilettura di controllo e i gate

### La prova funzionale: **nessun account di prova e' stato creato**, e la ragione e' il perimetro

`51-AUTHORISATION.md` §1 mette **«account creati a mano»** fra cio' che resta
**fuori perimetro**. Il piano 51-13 prevedeva questa possibilita' e diceva cosa
fare quando il perimetro non la nomina: **dirlo, e verificare invece che
`reconcile_master` non riporti errori.** E' cio' che e' stato fatto.

> **E `reconcile_master` non «gira a ogni deploy»** — riletto dal codice invece
> che dalla memoria. L'unico chiamante e'
> `src/app/api/auth/callback/route.ts:173`: gira al **primo accesso dopo un
> deploy**, non al deploy. §1.1 e §2 lo scrivevano in forma abbreviata, e la
> forma abbreviata avrebbe fatto cercare un'esecuzione che nessuno ha
> innescato. **Senza coniare una sessione — fuori perimetro — quell'esecuzione
> non si puo' provocare**, quindi si e' verificato cio' che si puo' verificare
> in sola lettura: che **il chiamante e il catalogo concordino**.

| Controllo | Letto | Quando (UTC) |
|---|---|---|
| Firma che il codice dispiegato invoca | `rpc("reconcile_master", { p_email })` | `route.ts:173` |
| Firma nel catalogo di produzione | **`reconcile_master(p_email text) → jsonb`** ✓ | **19:23:30Z** |
| `record_account_act` | `(p_subject_id uuid, p_act text, p_actor_id uuid, p_actor_kind text, p_role text, p_status text, p_note text, p_party_id uuid) → uuid` | 19:23:30Z |
| `record_party_assignment_act` | `(p_party_id uuid, p_subject_id uuid, p_capability text, p_act text, p_actor_id uuid) → uuid` | 19:23:30Z |
| `handle_new_user` | `() → trigger` | 19:23:30Z |

**La cache dello schema di PostgREST ha ricaricato** — e questa e' la prova che
il percorso del prodotto, non solo il catalogo, vede i nomi nuovi:

| Tabella, via PostgREST | HTTP | Righe | Quando (UTC) |
|---|---|---|---|
| `account_acts` | **206** | **2** | **19:23:40Z** |
| `membership_acts` | **404** | — | 19:23:40Z |
| `attendances` | **404** | — | 19:23:40Z |
| `profiles` | **206** | **4** | 19:23:40Z |

### I gate

| Gate | Esito | Quando (UTC) |
|---|---|---|
| **`npm run verify:capabilities`** contro la **PRODUZIONE** | **5/5 verde, 0 avvisi**, exit 0 — 15 chiavi su quattro lati, **28 concessioni e 32 rifiuti su 4 ruoli × 15 chiavi**, in entrambe le direzioni | **19:22:58Z** |
| `npm run verify:persona` | **7/7 verdi**, exit 0 | 19:23:58Z |
| `npm run build` | **exit 0** | 19:24:05Z |
| `https://www.resonatemotion.com/events`, da anonimo, **dopo** le due migration | **200** | 19:23:54Z |
| `/gallery`, da anonimo | **200** | 19:23:54Z |

> **`verify:capabilities` era 3/5 ROSSO alle 18:49:45Z** — 17 chiavi dove il
> codice ne dichiara 15, le due chiavi nel database e non in `keys.ts`, e un
> ruolo non dichiarato (`member`) che teneva una capability. **E' verde adesso
> perche' l'atto lo ha chiuso**, che e' cio' che §1.4 aveva scritto **prima** che
> il permesso fosse chiesto.

### `verify:refusal` — **NON lanciato**, e non e' una dimenticanza

Lo script **conia sessioni sull'identita' di persone reali** (`generateLink` +
`verifyOtp`) per misurare un rifiuto. `51-AUTHORISATION.md` §1.4 e §5 pongono la
scelta in forma binaria: **o il perimetro lo nomina, o non si lancia**.

**Il proprietario non lo ha nominato.** La risposta e' stata `TUTTO`, e `TUTTO`
copre i cinque passi **come sono scritti in §1** — dove `verify:refusal` e'
esplicitamente **fuori** a meno di menzione. La lettura conservativa e' quella
della fase 50, ed e' la lettura dell'orchestratore, registrata come tale.

**Quindi il gate resta ROSSO con la sua ragione scritta**, invece che verde per
un passo che nessuno ha autorizzato. Lanciarlo sarebbe stato il *«gia' che ci
siamo»* che **T-51-62** esiste per impedire. **Serve un atto nuovo, con la sua
data**, e il perimetro di quell'atto sara' *«coniare e revocare fino a due
sessioni su identita' gia' esistenti, senza creare profili, senza stamparne
indirizzo ne' token»*.

`Result: **(e) ESEGUITO** — 19:22:58Z → 19:24:05Z. `verify:capabilities` **5/5 contro la produzione**; `verify:refusal` **non lanciato, fuori perimetro, dichiarato**.`

---

## L'atto, chiuso

| # | Passo | Eseguito (UTC) | Esito |
|---|---|---|---|
| (a) | `git push origin main` + deploy Vercel | **19:11:22Z → 19:13:04.994Z** | **eseguito** — `c61760f`, `dpl_F2pAcyhQfbJPx7sjWNyD7T4XHU53` |
| (b) | `20260922120000_role_attendee_and_capability_keys` | **19:15:08.774Z** | **eseguito** — versione `20260922191508` |
| (c) | `purge-attendances.mjs` | **19:19:13Z → 19:19:15Z** | **eseguito, senza soggetti** — zero righe su due fonti |
| (d) | `20260922180000_drop_membership_code_and_rename_acts` | **19:20:24.987Z** | **eseguito** — versione `20260922192024` |
| (e) | la rilettura e i gate | **19:22:58Z → 19:24:05Z** | **eseguito** — `verify:capabilities` 5/5; `verify:refusal` **non lanciato** |

**Cinque passi su cinque, zero falliti.** **Durata dell'atto: 12 minuti e 43
secondi** (19:11:22Z → 19:24:05Z). **Zero righe di dati cancellate**: 2397 righe
prima, 2397 dopo, su 40 tabelle invece di 41.

**Da qui in poi `51-AUTHORISATION.md` e' ESAURITA e non autorizza piu' niente.**

### L'esaurimento e' meccanico, non una promessa — 19:26:30Z

`spent: yes` e' stato messo **a mano** alle 19:24:05Z, perche' lo strumento marca
il documento **solo dopo aver cancellato qualcosa** e qui non ha cancellato
niente. Rilanciato subito dopo con lo stesso comando:

```
RIFIUTO: 51-AUTHORISATION.md e' gia' dichiarato ESAURITO: spent = yes.
         Un'autorizzazione si consuma una volta. Se serve di nuovo, si
         chiede di nuovo, e chi la concede rilegge i numeri del giorno.
EXIT=2
```

**Uscita 2, nessuna lettura.** Il permesso non e' esaurito perche' un documento
lo dice: e' esaurito perche' **lo strumento rifiuta di riusarlo**.
