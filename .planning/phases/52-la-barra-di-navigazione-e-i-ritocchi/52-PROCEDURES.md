---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
document: le procedure manuali della fase 52
written: 2026-09-23
written_by: piano 52-02, task 1
walked: —
procedures: 7
status: SCRITTA, NON PERCORSA — gli esiti vanno in `52-ESITI.md`
requirements: [NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06, NAV-07]
---

# Fase 52 — Le procedure

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Qui si nominano **ruoli** — *il proprietario*, *un `organizer`*, *un
> membro dello staff assegnato alla serata di prova* — **mai persone**. Il
> riferimento del progetto di laboratorio non si scrive qui: sta in
> `.env.lab.local`, che e' ignorato da git. Nessuna chiave, nessun indirizzo di
> posta reale, nessun identificativo di riga. I dati di prova si descrivono per
> **struttura** («una serata segreta con una foto approvata»), mai per contenuto.
>
> **Queste procedure sono state scritte PRIMA di essere percorse** — e prima che
> esista il codice che misureranno. E' la ragione per cui la colonna «cosa si e'
> visto» e' altrove — in `52-ESITI.md` — e i sette riquadri d'esito, qui in
> fondo, sono tutti aperti. Un `Result` non-`pending` **afferma** che qualcuno ha
> percorso: riempirlo in anticipo, o con una lettura dal catalogo al posto di uno
> schermo, e' una prova falsa (`T-52-05`).
>
> **Si percorrono sul laboratorio, mai in produzione** (`npm run dev:lab`,
> `lab.resonatemotion.com`; `meta-gates.md`, *il gate della verifica*). In un
> repo senza test runner questo documento e' l'unica prova che esistera' che le
> sette cose sono state guardate: per questo ogni passo dice **chi** lo fa e
> **cosa si deve osservare**, non soltanto cosa si fa.

---

## `PRE-LAB` — la precondizione che viene prima di ogni altra cosa

Vale per tutte e sette le procedure. Se una riga non e' vera, **non si comincia**:
una corsa contro un laboratorio sbagliato misura il laboratorio, non la fase.

| Condizione | Come si accerta | Se non e' vera |
|---|---|---|
| Il progetto di laboratorio e' `ACTIVE_HEALTHY` | lettura dello stato del progetto via Management API, **prima** di aprire il telefono | il laboratorio va in pausa dopo una settimana: un **NXDOMAIN** sul suo host significa progetto `INACTIVE`, **non** un guasto di rete. Si fa il restore e si riattende |
| `lab.resonatemotion.com` serve il commit dichiarato | lo sha corto e la data del commit sono scritti in `52-ESITI.md` **prima** della corsa, e il deploy del ramo lab risulta `READY` su quel commit | percorrere una procedura contro il codice vecchio non misura nulla |
| **M2 e' applicata sul laboratorio** (piano 52-13) | rilettura dal catalogo del laboratorio: bucket `event-media` con `public = false`, la policy di lettura di `event_media` legata a `gallery.view` presente, `"Anyone can view"` assente | senza M2, `P-52-B` passo 6 e `P-52-G` misurano il mondo di prima: il cancello di pagina c'e', i dati sono ancora aperti |
| Esistono i sei soggetti di prova | un account **anonimo** (nessuna sessione, finestra privata), un **`attendee`**, uno **`staff` non assegnato**, uno **`staff` assegnato alla serata di prova** (`door.operate` per assegnazione), un **`organizer`**, un **`master`** — letti da `.env.lab.seed.json`, **non inventati** | un soggetto mancante lascia una riga di `P-52-A` senza chi la guardi: si crea dall'app, come in produzione, e lo si scrive in `52-ESITI.md` |
| Il banco dei media del piano 52-01 e' seminato | almeno **una** foto approvata, **una** pending, **una** di una serata segreta, **un** video, caricati dal percorso vero (finalize) dove il percorso esiste | senza righe approvate le sonde di `P-52-G` non hanno soggetto, e `verify:refusal` rifiuta invece di passare — che e' giusto, ma non e' una misura |
| La serata di prova esiste con lista, guest list e almeno un avviso fabbricabile | dalla superficie della porta, con la rete accesa | senza lista `P-52-E` non ha righe da contare |
| **La versione di iOS del telefono e' scritta** in `52-ESITI.md` | *Impostazioni → Generali → Info* | `P-52-F` passo 4 dipende dalla versione di Safari: senza il numero, «atteso assente» non e' confrontabile con nessuna release futura |

---

## Procedura `P-52-A` — la barra e il pannello, per soggetto

**Requisiti:** NAV-01, NAV-03 · **Decisioni:** D-52-01..10, D-52-24, D-52-27
**Chi la percorre:** il **proprietario**, con i sei soggetti di `PRE-LAB`, uno
dopo l'altro. **Dove:** su un telefono a 360 px di larghezza utile (o la
larghezza piu' stretta disponibile, scritta) e su un tablet.
**Quanto costa:** circa venti minuti.

**Cosa ci si aspetta, per soggetto** (UI-SPEC §A.1, dopo D-52-24 — la tabella
si scrive qui per non doverla ricordare davanti allo schermo):

| Soggetto | Barra, in quest'ordine | Pannello Management |
|---|---|---|
| anonimo | Events · Account (→ `/login`) | — |
| `attendee` | Events · Account | — |
| `staff` non assegnato | Events · TASK · Management | Account · Gallery |
| `staff` assegnato stasera | Events · Check-in · TASK · Management | Account · Gallery |
| `organizer` | Events · Check-in · TASK · Management | Account · Artists · Calendar · Formats · Gallery · Location · Manage events · Manifesto · Members · Venues · Visual |
| `master` | Events · Check-in · TASK · Management | come `organizer`, piu' Newsletter, in ordine alfabetico |

| # | Passo | Ruolo | Cosa si deve osservare |
|---|---|---|---|
| 1 | aprire `/events` da telefono con ciascuno dei sei soggetti | proprietario, un soggetto per volta | le voci di barra sono **esattamente** quelle della tabella, **in quell'ordine**; nessuna voce «Home»; nessuna voce in piu' |
| 2 | con `organizer`, `staff` e `master`, guardare la voce TASK | proprietario | TASK e' **grigia**, con il pozzetto dell'icona a **bordo tratteggiato**; `attendee` e anonimo **non** la vedono |
| 3 | toccare TASK | proprietario | **non succede nulla**: nessuna navigazione, nessun tooltip, nessuna pagina segnaposto, nessuna scala al tocco. Non deve nemmeno sembrare che succeda qualcosa |
| 4 | toccare Management | proprietario, con `organizer` | sale un **foglio dal basso, sopra la barra**; la barra **resta visibile** sotto il foglio; la pagina e' coperta dallo scrim; l'icona di Management diventa una **x** |
| 5 | leggere il foglio | proprietario | **una voce per riga**, nessuna intestazione, nessuna maniglia, nessun pulsante Close; voci in **ordine alfabetico**; lo strumento degli eventi si chiama **«Manage events»**, mai «Events»; **Account** e **Gallery** stanno nella lista come le altre |
| 6 | chiudere il foglio in quattro modi, riaprendolo ogni volta: toccando lo **scrim**; toccando **di nuovo Management**; premendo **`Escape`** (tastiera esterna o tablet); toccando **una riga** | proprietario | ogni volta il foglio **si chiude**; con la riga si naviga **e** si chiude, anche se la riga e' la pagina corrente |
| 7 | con `attendee` toccare Account; con l'anonimo toccare Account | proprietario | `attendee` arriva su `/account`; l'anonimo arriva al **login** |
| 8 | con `organizer` aprire la pagina Account (dal pannello) | proprietario | la sezione **«Management Tools» non c'e' piu'** (NAV-03) |
| 9 | da tablet, con `organizer`, aprire `/events` | proprietario | nella colonna a sinistra la voce Management c'e' e la sua lista e' **chiusa** |
| 10 | da tablet, con `organizer`, entrare in uno strumento (Members) | proprietario | la lista Management e' **aperta**, la voce corrente **evidenziata**; la sezione «Work» non esiste; la lista segue lo **stesso ordine alfabetico** del foglio |
| 11 | da tablet, chiudere la lista e poi aprire un altro strumento dalla lista | proprietario | la lista si **riapre** entrando nello strumento; non si chiude mai da sola |

**Se `my_access_context` non risponde** (lo si vede soltanto se capita, non si
fabbrica): la barra atterra su Events · Account, come per l'anonimo. E' il
comportamento chiuso voluto, non un difetto; se capita, si scrive.

---

## Procedura `P-52-B` — il cancello della gallery

**Requisiti:** NAV-02 · **Decisioni:** D-52-13, D-52-29
**Chi la percorre:** il **proprietario**, da telefono o desktop, con anonimo,
`attendee`, `staff` e `organizer`. **Dove:** il laboratorio, **dopo M2**.

| # | Passo | Ruolo | Cosa si deve osservare |
|---|---|---|---|
| 1 | da anonimo (finestra privata) digitare `/gallery` | proprietario | si arriva al **login**, e l'indirizzo porta `?next=%2Fgallery` |
| 2 | dal login del passo 1, accedere con l'`organizer` | proprietario | dopo il login si torna **su `/gallery`**, non su `/events` |
| 3 | da `attendee` loggato digitare `/gallery` | proprietario | si arriva su **`/account`**: **nessun 404**, **nessun messaggio**, lo stesso rifiuto standard che riceverebbe su `/admin` |
| 4 | da `staff` (non assegnato) aprire `/gallery` dal pannello | proprietario | la pagina si apre e **le immagini si vedono** |
| 5 | da `organizer` aprire `/gallery` | proprietario | la pagina si apre e **le immagini si vedono** |
| 6 | da `attendee` aprire la pagina di una serata che ha foto approvate | proprietario | la sezione **«Gallery» e' assente**: nessun titolo, nessun riquadro vuoto, nessuna frase che annunci foto (D-52-29) |
| 7 | da `staff` aprire la stessa pagina | proprietario | la sezione «Gallery» **c'e'** e le immagini si caricano |

> **Il passo 6 e' la meta' che conta.** Il cancello di pagina (passi 1-3) decide
> *dove si va*; il passo 6 dice che la pagina della serata **non annuncia** foto
> che chi guarda non puo' vedere. Una foto di una serata segreta mostrata a chi
> non deve e' una rivelazione, e la rivelazione non si annulla
> (`venue-secrecy.md`).

---

## Procedura `P-52-C` — la striscia degli strumenti appesa

**Requisiti:** NAV-04 · **Decisioni:** D-52-11, D-52-27
**Chi la percorre:** il **proprietario**, da telefono, con l'`organizer`.

| # | Passo | Ruolo | Cosa si deve osservare |
|---|---|---|---|
| 1 | entrare in Members (lo strumento piu' lungo) | proprietario, con `organizer` | sotto l'intestazione c'e' la **striscia degli strumenti**, e i chip sono in **ordine alfabetico** (il primo e' Artists o Calendar, non «Manage events») |
| 2 | scorrere la pagina **fino in fondo** | proprietario | la striscia **resta in cima**, agganciata; e' **opaca** — il contenuto che scorre sotto non traspare |
| 3 | dal fondo della pagina, toccare un altro chip della striscia | proprietario | si cambia strumento **senza risalire** |
| 4 | da tablet, la stessa pagina | proprietario | la striscia **non c'e'** (sotto `md` soltanto): da tablet gli strumenti stanno nella colonna di `P-52-A` passo 10 |

---

## Procedura `P-52-D` — i chip dei format e la cifra staff

**Requisiti:** NAV-05, NAV-06 · **Decisioni:** D-52-15..18
**Chi la percorre:** il **proprietario**, con anonimo e `organizer`.

| # | Passo | Ruolo | Cosa si deve osservare |
|---|---|---|---|
| 1 | da anonimo aprire `/events` | proprietario | i chip sono **solo** i format che hanno almeno una serata **pubblicata** (passata o futura); nessun chip per un format senza serate visibili |
| 2 | con `organizer` (che vede le bozze) aprire `/events` | proprietario | se il banco ha un format con **sola bozza**, il suo chip **compare**; se non ce l'ha, lo si scrive in `52-ESITI.md` e il passo resta non percorso, non «passato» |
| 3 | selezionare un chip | proprietario | la lista si filtra e **gli altri chip restano tutti** — la riga non si accorcia |
| 4 | digitare `/events?format=` con lo slug di un format **senza serate visibili** | proprietario | **nessun filtro applicato**: si vede la lista intera, come senza parametro |
| 5 | se il banco lo permette: un momento con zero serate visibili (anonimo su un laboratorio senza serate pubblicate) | proprietario | la **riga dei chip e' assente** — niente «All» da solo (D-52-17). Se il banco non lo permette, si scrive e non si fabbrica |
| 6 | con `organizer` aprire la pagina membri, toccare la cifra `staff` | proprietario | la cifra **non reagisce al tocco**: nessun filtro, nessun cambio d'indirizzo, come le altre cifre (NAV-05) |
| 7 | leggere la legenda della pagina membri | proprietario | dice che uno **staff tiene la gallery per ruolo** (`gallery.view`), e non dice piu' che uno staff «non puo' nulla che un attendee non possa» |

---

## Procedura `P-52-E` — la porta in cinque linguette

**Decisioni:** D-52-19..22, D-52-26 · **Tocca:** la porta (`checkin-offline.md`)
**Chi la percorre:** il **proprietario**, su **iPhone**, con lo **`staff`
assegnato alla serata di prova**. **Due giri:** radio **accesa**, poi
**modalita' aereo** vera (icona dell'aeroplano nella barra di stato, nessun
indicatore di dati ne' di wi-fi — la schermata della barra di stato e' la prova,
come in `51-PROCEDURES.md`).

> **L'asimmetria che governa questa procedura.** Rifiutare un ospite valido e'
> peggio che ammetterne uno doppio, perche' il primo errore avviene davanti a
> una fila. Per questo le pastiglie Offline / Pending e l'**avviso della guest
> list a radio spenta** («do not refuse them… let them in») **non** entrano in
> una linguetta: sono istruzioni su chi far entrare, e un'istruzione che si
> nasconde dietro un tocco alle due di notte non esiste.

| # | Passo | Ruolo | Cosa si deve osservare |
|---|---|---|---|
| 1 | aprire la porta con la rete accesa e lasciar scaricare la lista | proprietario, con lo `staff` assegnato | **cinque linguette in una riga**, nell'ordine **All · Out · In · Recent · Alerts**, ciascuna con il **numero accanto, senza parentesi**; Alerts **senza numero** se non ci sono avvisi; nessuna etichetta va a capo o si tronca |
| 2 | aprire Recent **prima** di aver scansionato | proprietario | Recent esiste anche vuota e dice **«No scans yet»** |
| 3 | aprire Alerts senza avvisi | proprietario | Alerts esiste anche vuota e dice **«Nothing to report»** |
| 4 | tornare su Out, fare una ricerca, poi **far nascere un avviso** (modalita' aereo con lista vecchia, oppure una notizia di cache) | proprietario | il **pallino si accende** su Alerts e il **numero sale**, ma **Alerts non si apre da sola**: la linguetta aperta resta quella di prima e la ricerca non si perde (D-52-20) |
| 5 | a radio spenta, aprire **Recent** e poi **Alerts** | proprietario | le pastiglie **Offline / Pending** e l'**avviso della guest list** restano **sempre visibili** in testata con qualunque linguetta aperta |
| 6 | scansionare un biglietto valido, poi annullarlo **da Recent** | proprietario | l'annullamento chiede **la stessa conferma di oggi** (e lo stesso ramo di supervisione); la riga di Recent si aggiorna; nessuna scorciatoia «Undo last» in testata (D-52-22) |
| 7 | con ciascuna linguetta aperta, scorrere la pagina fino in fondo | proprietario | il **titolo** e il pulsante **«QR Scan» restano in vista** (barra fissa di 51-07) |
| 8 | contare le linguette in ogni momento della corsa | proprietario | sono **sempre cinque**, nelle **stesse posizioni**: la forma della porta non cambia a meta' serata (D-52-26) |

---

## Procedura `P-52-F` — la tastiera

**Decisioni:** D-52-06, D-52-23, D-52-28 · **Pitfall 6** della ricerca
**Chi la percorre:** il **proprietario**, su **iPhone con Safari**, con la
versione di iOS gia' scritta in `52-ESITI.md` (`PRE-LAB`).

> **L'aspettativa, scritta prima del primo passo.**
>
> *«Sull'iPhone la pagina NON si stringera' sopra la tastiera: Safari non
> implementa ancora `interactive-widget`. Questa voce si registra come ATTESO
> ASSENTE, non come fallimento. Quello che deve funzionare sono le misure di
> layout.»*
>
> `interactive-widget=resizes-content` sta nel meta viewport perche' Next 16 lo
> tipizza, aiuta Android ed e' innocuo; WebKit lo ha nel sorgente ma non in una
> release (ricerca §H). Una corsa che osserva la barra sparire e ne deduce «il
> viewport funziona» registrerebbe **verificato per la ragione sbagliata**
> (`T-52-07`). Per questo le quattro misure qui sotto **si registrano ognuna
> separatamente**, con il proprio esito, e nessuna vale per un'altra.

**Le quattro misure**

| # | Misura | Dove | Ruolo | Cosa si deve osservare |
|---|---|---|---|---|
| 1 | **la barra sparisce al fuoco e torna al blur** | (a) la porta, che monta la barra nella forma `form="phone"`; (b) un form pubblico che monta la barra — il campo scelto si scrive in `52-ESITI.md` prima della corsa | proprietario, con lo `staff` assegnato per (a) | toccando il campo la barra **scompare subito**, senza animazione; chiudendo la tastiera (blur) **ricompare**; la pagina **non salta** mentre si scrive |
| 2 | **alla porta l'avviso della guest list sta sopra la ricerca** | la porta, a radio spenta | proprietario | l'avviso «do not refuse them… let them in» e' **sopra** il campo di ricerca, non sotto la lista |
| 3 | **al fuoco la ricerca sale in cima, e la riga trovata sta intera sopra la tastiera** | la porta | proprietario | toccando la ricerca il campo **sale in cima** alla vista; digitando un nome, la **riga trovata con il suo «Check in»** e' **intera sopra la tastiera**, toccabile senza chiudere la tastiera |
| 4 | **ridimensionamento del viewport sotto la tastiera** | qualunque delle pagine sopra | proprietario | **atteso assente** su Safari iOS: si registra cosa si vede (la pagina resta alta quanto prima, la tastiera la copre) e si scrive **«atteso assente — osservato assente»**, oppure, se Safari lo facesse, **«osservato presente»** con la versione di iOS. In nessuno dei due casi e' un fallimento della fase |

**Il login, provato com'e'.** Il login **non monta la barra**: D-52-06 non lo
riguarda. Lo si prova **senza aver toccato nulla**:

| # | Passo | Ruolo | Cosa si deve osservare |
|---|---|---|---|
| 5 | aprire `/login` da anonimo, toccare email, poi password | proprietario | si registra se **email, password e il pulsante «Sign In»** restano **sopra la tastiera** o se uno dei tre finisce coperto |

L'esito del passo 5 **decide** se toccare `FOCUS_ROOT` di `PageShell` (il cui
digest e' custodito da `verify:conversion`) nel piano 52-14 (D-52-28). **Non e'
un fallimento della fase** in nessuno dei due casi: e' la misura che serve a
decidere, e va scritta cosi' com'e'.

---

## Procedura `P-52-G` — i media chiusi

**Requisiti:** NAV-07 · **Decisioni:** D-52-25, D-52-29..31 · **Pitfall 15**
**Dove:** il laboratorio, **dopo M2**, con almeno una riga **approvata**, una
**pending** e una di una **serata segreta** (`PRE-LAB`).

> **Perche' questa procedura esiste.** Il cancello di NAV-02 decide dove si va,
> non cosa si legge. Prima di questa fase un `attendee` leggeva via API le righe
> approvate di `event_media`, e il bucket delle foto era pubblico: una foto di
> una serata segreta era raggiungibile da chiunque avesse l'indirizzo. Le sonde
> qui sotto sono la prova che **dopo M2 non lo e' piu'** — e la prova vale solo
> se si aspetta la cache (sonda 1).

**Chi le esegue.** Le sonde **1-4 e 6-8** le esegue **chi esegue il piano
52-13**, con sessioni coniate sul laboratorio (mai in produzione, mai con
sessioni di persone reali fuori dal banco). La sonda **5** la percorre il
**proprietario**, perche' e' l'unica che si guarda con gli occhi: immagini e un
video che si ferma e riparte.

**La finestra di cache della sonda 1, scritta prima.** Subito dopo M2 un
indirizzo pubblico puo' rispondere ancora da due cache:
- la **CDN di Supabase**, fino al `max-age` dell'oggetto — `finalize` non passa
  `cacheControl`, quindi vale il default della libreria, **3600 s** (ipotesi
  della ricerca, A10);
- il **service worker**, regola `cross-origin` di `@serwist/next`:
  `NetworkFirst`, **1 ora**, usata solo se la rete non risponde.

Quindi la sonda 1 si fa **due volte**: subito dopo M2 (un 200 li' e' la cache,
**non** un fallimento, e si scrive come tale) e **dopo la finestra** — piu' di
un'ora dopo l'applicazione di M2, ora UTC di entrambe scritta. **Solo la seconda
dice «chiuso».** Dichiarare chiuso senza aver aspettato e' il Pitfall 15.

| # | Sonda | Chi | Cosa si deve osservare |
|---|---|---|---|
| 1 | anonimo, `GET` dell'indirizzo pubblico di un oggetto **approvato** — subito dopo M2 e **di nuovo dopo la finestra** | chi esegue 52-13 | dopo la finestra: **non 200** (atteso 400/404 dal bucket privato; il codice esatto si scrive com'e'). Subito dopo M2: si scrive cosa risponde, marcato «dentro la finestra di cache» |
| 2 | `attendee`, `select` PostgREST su `event_media` con `status=eq.approved` | chi esegue 52-13 | **0 righe** |
| 3 | `attendee`, `createSignedUrls` su un path noto | chi esegue 52-13 | **rifiutata**, nessun URL restituito |
| 4 | `staff` (tiene `gallery.view`, non `staff.manage`), firma di un path **pending** noto, poi di uno **approvato** | chi esegue 52-13 | pending: **rifiutata**; approvato: **firmata** |
| 5 | `organizer`, `/gallery` e la moderazione di una serata: guardare le immagini, avviare un video, **metterlo in pausa e riprenderlo** entro l'ora | **proprietario** | immagini e video **si caricano**; il video **riparte** dalla pausa senza errore. Un'immagine che non si carica mostra **«This image could not be loaded. Reload the page.»** — mai un riquadro vuoto muto |
| 6 | `organizer`, cancellazione di un media dalla moderazione, poi rilettura dal catalogo | chi esegue 52-13 | l'oggetto e' **sparito** da `storage.objects` **e** la riga e' **sparita** da `event_media` — entrambe, non una delle due |
| 7 | nuovo caricamento da `staff` | chi esegue 52-13 | la riga nasce con `storage_path` valorizzato e `url` nullo; e' visibile **in moderazione**, e **in gallery solo dopo l'approvazione** |
| 8 | una firma **scaduta** (TTL corto in una prova dedicata) | chi esegue 52-13 | l'URL scaduto **risponde errore** |

---

## La rilettura conferma, non sostituisce

Dove una procedura ha una meta' che si rilegge dal catalogo (`P-52-G` sonde 6-7,
lo stato di M2 in `PRE-LAB`), la rilettura si fa con la chiave di servizio
**del laboratorio**, **in sola lettura**, e si scrive accanto all'osservazione —
non al suo posto. Una cella «cosa si e' visto» riempita con una lettura dal
catalogo al posto di uno schermo e' un esito inventato: il catalogo dice cosa e'
stato **registrato**, non cosa il proprietario ha **visto** sul telefono.

## Se la corsa si ferma

Si registra **la procedura e il passo** in cui si e' fermata e **cosa si e'
visto invece** — e il `Result` di quella procedura resta `pending`. Una corsa
interrotta e' un'informazione; una corsa interrotta e arrotondata a «percorsa»
e' una prova falsa. Un passo che il banco non permette (un format con sola
bozza che non c'e', zero serate visibili) si scrive **non percorribile, e
perche'** — non si fabbrica il dato per farlo passare, e non si dichiara
passato.

---

## Gli esiti

Vanno in **`52-ESITI.md`**, con data, **ora UTC e ora locale**, e il ruolo che
ha percorso. Qui restano solo i sette riquadri, e restano aperti finche'
qualcuno non percorre.

> **`P-52-A`** — la barra e il pannello, per soggetto, da telefono e da tablet.
> `Result: pending`

> **`P-52-B`** — il cancello della gallery, dopo M2.
> `Result: pending`

> **`P-52-C`** — la striscia degli strumenti appesa.
> `Result: pending`

> **`P-52-D`** — i chip dei format e la cifra staff.
> `Result: pending`

> **`P-52-E`** — la porta in cinque linguette, radio accesa e spenta.
> `Result: pending`

> **`P-52-F`** — la tastiera: quattro misure separate, la quarta atteso assente; il login com'e'.
> `Result: pending`

> **`P-52-G`** — i media chiusi: otto sonde, la prima ripetuta dopo la finestra di cache.
> `Result: pending`
