---
phase: 50-via-le-iscrizioni
document: esiti delle otto procedure del runbook
walked: 2026-09-21
walked_by: piano 50-10
environment: laboratorio permanente (`.planning/v1.6-LAB-DESIGN.md`), MAI la produzione
procedures_walked: 8
procedures_open: 0
status: chiuso — le otto procedure sono percorse, `P-50-8` dal proprietario al checkpoint
---

# Fase 50 — Gli esiti, percorrendo

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Qui si nominano **ruoli** — *chi ha il ruolo master*, *un membro
> dello staff assegnato a una serata* — **mai persone**. Nessun indirizzo di
> posta reale: quelli del banco sono finti (`@lab.invalid`), e le due sole
> eccezioni sono dichiarate nel passo che le ha imposte. **Il riferimento del
> progetto di laboratorio non si scrive qui**: sta in `.env.lab.local`, che e'
> ignorato da git.
>
> Ogni riga porta l'ora **UTC**, lo strumento, e cio' che si e' **osservato** —
> non cio' che ci si aspettava. Dove l'osservato differisce dall'atteso, la
> differenza e' riportata **per prima**.

## Cosa ha toccato questa corsa, e cosa no

Tutte le scritture sono andate sul **progetto di laboratorio**. Sul progetto di
produzione questa corsa ha eseguito **due sole letture**, entrambe dichiarate
qui perche' un documento che dicesse «nessuna chiamata» mentendo per omissione
sarebbe peggio di uno che le nomina:

| Chiamata | Natura | Perche' |
|---|---|---|
| `GET /v1/projects` | elenco dei progetti dell'organizzazione, sola lettura | per leggere lo stato del laboratorio e accertarsi che fosse `ACTIVE_HEALTHY` invece di in pausa (precondizione **PRE-LAB**). L'elenco nomina anche la produzione: e' la forma della risposta, non l'oggetto della domanda |
| `POST …/cjsfocnhfzycbbgkwocx/database/query` con `read_only: true` | una `select` su `public.formats` | per misurare la deriva del catalogo del laboratorio, riportata in fondo. **Nessuna scrittura**, e il runner rifiuta cio' che non e' una `select` |

**Nessuna scrittura, nessuna modifica di configurazione e nessuna chiamata di
autenticazione hanno raggiunto il progetto di produzione.** Il passo manuale
`A.2` e la migration di produzione restano al piano 50-11, sotto autorizzazione
datata.

**L'ambiente delle prove di superficie:** `lab.resonatemotion.com`, che dal
2026-09-21 15:10:11Z serve il ramo `lab` alla punta di questa fase. Verificato
prima di cominciare: `/register` risponde **404** dove il dispiegamento
precedente rispondeva 200. Nessuna procedura di superficie e' stata percorsa
contro il codice vecchio.

**Il banco:** riseminato all'inizio della corsa (`--reset`, `--seed`,
`--verify`: **12 righe radice presenti**, contate da PostgREST). Il riseminare
e' stato **bloccato una volta** — vedi la prima non conformita'.

---

## Le sei cose che non sono andate come il runbook si aspettava

**Si leggono per prime, perche' e' la ragione per cui una procedura si percorre
invece di dedurla.**

### 1. `P-50-4` passo 4.5 fallisce con il banco che il runbook prescrive

Il passo dice: *«lo staff con assegnazione carica sulla sua serata»*. **Non
carica.** Con il banco seminato da `PRE-SEED`, lo staff assegnato alla serata X
riceve sulla **propria** serata lo stesso rifiuto che riceve su una serata a cui
non e' assegnato:

```
403  {"ok":false,"reason":"forbidden.media_upload_required"}
```

**La causa non e' un difetto del prodotto: e' il banco.** L'arm per serata di
`src/lib/media/may-upload.ts:270` chiede la capability **`media.upload`**, e
`scripts/seed-lab-door.mjs` semina una sola assegnazione, con **`door.operate`**.
Un'assegnazione alla porta non e' un titolo a caricare, ed e' giusto che non lo
sia.

Concessa a mano un'assegnazione `media.upload` sulla serata X, il passo si
comporta come scritto: **X passa il cancello, Y no**. Ma **con il banco
prescritto il passo 4.5 non e' eseguibile**, e chi lo percorresse senza
accorgersene lo scriverebbe come un difetto del prodotto. `PRE-SEED` va esteso.
Registrato in `deferred-items.md`.

### 2. `node scripts/seed-lab-door.mjs --reset` si ferma su un `23505`

Al primo tentativo, alle 15:12 circa:

```
SQL 400: ERROR: 23505: duplicate key value violates unique constraint
  "tickets_party_user_unique"
CONTEXT: SQL statement "UPDATE ONLY "public"."tickets"
  SET "order_id" = NULL WHERE $1 OPERATOR(pg_catalog.=) "order_id""
```

**E' la fase 50 che lo ha reso possibile, e la riga merita di essere letta due
volte.** `tickets_party_user_unique` e' un indice **parziale**:

```sql
CREATE UNIQUE INDEX tickets_party_user_unique ON public.tickets
  USING btree (party_id, user_id)
  WHERE ((party_id IS NOT NULL) AND (order_id IS NULL));
```

`tickets.order_id` e' `ON DELETE SET NULL`. Quindi cancellare **un ordine**
porta i suoi biglietti dentro il predicato dell'indice tutti insieme — e un
ordine gratuito con **due biglietti per la stessa persona sulla stessa serata**
li porta dentro **in collisione**. L'ordine da due di `P-50-7` e' il primo
percorso del prodotto che conia abitualmente quella forma: prima della fase 50,
una persona aveva un biglietto per serata.

**Cosa NON si conclude da qui:** che il prodotto sia rotto. Nessuna superficie
del prodotto cancella un `ticket_orders`. Cio' che si conclude e' che **la
cancellazione di un ordine non e' piu' un'operazione sicura**, e che il banco di
prova la esegue. Aggirato con una `delete from public.tickets` prima del
`--reset`; lo script **non e' stato modificato** (fuori perimetro di questo
piano). Registrato in `deferred-items.md` con il comando di aggiramento scritto
per intero.

### 3. `P-50-5` passo 5.1 non e' eseguibile con un indirizzo `@lab.invalid`

Il runbook prescrive *«un indirizzo `@lab.invalid` mai usato»*. Con quello, la
misura di controllo risponde:

```
400  {"code":400,"error_code":"email_address_invalid",
      "msg":"Email address \"…@lab.invalid\" is invalid"}
```

GoTrue **rifiuta il dominio prima di rispondere alla domanda**. Chi percorresse
5.1 alla lettera otterrebbe un `400` che non dice niente su `disable_signup`, e
il `422` del passo 5.3 non avrebbe niente contro cui essere confrontato.

Risolto **e girato a favore della prova** — vedi `P-50-5` piu' sotto: il
laboratorio accetta `@lab.test` (TLD riservato, RFC 6761) mentre rifiuta
`@lab.invalid` **e** `@example.com`. Il runbook va corretto.

### 4. Tre rifiuti in inglese portano il loro conteggio in italiano

Le tre cause di `P-50-3` finiscono con `(1 biglietto)`, `(1 assegnazione
ricevuta)`, `(1 scansione operata alla porta)`, dentro frasi interamente
inglesi. `holder_label` fa lo stesso: `1 di 2`, `2 di 2`. L'interfaccia e' in
inglese per decisione di ROADMAP. **Non e' un difetto d'accesso e non blocca
nulla**: e' una riga di copy che si vede alla porta e in una pagina
amministrativa. Registrato in `deferred-items.md`.

### 5. Il dialogo di creazione account nomina una coda che non esiste piu'

Sulla pagina membri, sopra il modulo:

> *«Creating an account approves it. The person is admitted to the community
> without going through the pending queue, and the act is recorded with your
> name against it.»*

Dopo questa fase **non esiste nessuna coda di approvazione**: `status`, con
`pending`, e' stato tolto dal database. La frase descrive un prodotto che non
c'e'. Non e' un residuo di `status` nel senso di REG-05 — non e' una
dichiarazione, un identificatore o un ramo, e il censimento di 50-09 guarda
quelli — e' **prosa rivolta a un operatore**, che e' il posto in cui una
descrizione falsa costa di piu'. Registrato in `deferred-items.md`.

### 6. Il catalogo dei format del laboratorio non e' fedele alla produzione

Letto da entrambi i database nella stessa corsa:

| | laboratorio | produzione |
|---|---|---|
| format elencati | **cinque** righe, di cui quattro `listed` | **quattro** righe, di cui tre `listed` |
| il format **cancellato il 2026-08-20** | **presente**, `listed: true`, `retired_at: null` | **assente** |
| colore di RamaDub | `#FF7A2F` — l'arancio del tramonto | `#6E8BFF`, il blu deciso il 2026-08-20 |

La sigla del format cancellato **non si scrive qui**, e il gate e' quello di
`production-calendar.md`: *una sigla ritirata non si cita, nemmeno per spiegare
la storia*. Cio' che si scrive e' la conseguenza: **sulla barra pubblica del
laboratorio compare un filtro per un format che non esiste piu'**, e il colore
che porta RamaDub e' quello che `brand-visual-system.md` dichiara **senza
proprietario**.

**Perche' sta in un documento di esiti e non in una nota a margine:** il
laboratorio e' dichiarato *«fedele alla produzione»*, e su questa tabella non lo
e'. Ogni osservazione di superficie presa qui sui format e' presa contro un
catalogo che la produzione non ha. Nessuna delle otto procedure dipende da
quella tabella — ma **la prossima potrebbe**. Registrato in `deferred-items.md`.

### E una settima, emersa al checkpoint

Le sei qui sopra vengono dalle sette procedure percorse da questo lato. La
settima viene da `P-50-8`, percorsa dal proprietario su un telefono: **lo
schermo della porta mostra il nome dell'account acquirente**, dove `D-50-18b`
dice che il nome va all'account e non allo staff. Non e' un difetto introdotto
da questa fase — e' il comportamento di sempre dello scanner, che questa fase ha
reso **visibile per ogni acquirente** raccogliendo il nome. E' una decisione del
proprietario, ed e' descritta per intero in `P-50-8`.

---

## Procedura `P-50-1` — le superfici dell'iscrizione non esistono piu'

**Soggetti percorsi: quattro, non tre.** Anonimo (profilo di browser nuovo),
`member` leggero, **organizer** (creato durante `P-50-6`), e **master**.
Strumento: browser pilotato via CDP sul dominio del laboratorio, piu' `curl` per
i codici HTTP.

| # | Esito | Osservato |
|---|---|---|
| 1.1 | **PASSA** | anonimo, `GET /register` → **404**, `<title>` `re:sonate`, corpo *«404 / This page could not be found.»* — non un rimando, non una pagina vuota |
| 1.2 | **PASSA, su tre soggetti loggati invece di due** | `member` → **404**; organizer → **404**; master → **404**. La 404 non dipende da chi guarda |
| 1.3 | **NON PERCORSA come scritta** + surrogato misurato | vedi il riquadro sotto |
| 1.4 | **PASSA** | `/` → **307 → `/events`** per tutti e quattro, **compreso chi e' loggato**. Misurato sia con `curl` (`307`, `location: /events`) sia dal browser (URL finale `/events`, 200) |
| 1.5 | **PASSA** | barra da anonimo: **tre voci** — `Events → /events`, `Gallery → /gallery`, **`Account → /login`** |
| 1.6 | **PASSA** | barra da `member`: **tre voci**, `Account → /dashboard`. Una barra sola |
| 1.7 | **PASSA** | barra da organizer: **quattro voci** — le tre piu' `Check-in → /door`. Identica da master |
| 1.8 | **PASSA** | `/login`: **zero elementi `<a>` in tutta la pagina**, nessuna occorrenza di `sign up` o `register` nel testo. Il testo finale e' *«Sign In · Access your member area · Sign In · Bought a ticket? Use the link in your email»* |
| 1.9 | **PASSA** | serata con luogo segreto, da anonimo: il dialogo dice *«Secret Venue — How to unlock: Sign in to see how secret venues work.»* con **due soli pulsanti, «Sign in» e «Close»**. **Nessun indirizzo, nessun nome di sede** ne' sulla pagina ne' nel dialogo |
| 1.10 | **PASSA in parte** | menu drink da anonimo, **con una voce di listino seminata per l'occasione**: la pagina rende il listino e il carrello (`Drink list / … / 3,00 € / - / 1 / + / 1 item / Order Drinks`), **zero elementi `<a>`**, zero occorrenze di `register` o `sign up`. **Il banner d'accesso non si e' potuto far comparire**: si disegna a chi ha token da ospite, e un id di token iniettato a mano non si risolve. Le sue due sole uscite sono lette dal file: `GuestLoginBanner.tsx:120` e `:187`, entrambe `/login?next=…`, nessuna verso l'iscrizione |
| 1.11 | **PASSA sul manifesto, NON percorsa sull'app installata** | `GET /manifest.json` → `start_url = /events`. L'installazione della PWA e l'apertura dall'icona **non** sono state esercitate: pretendono un dispositivo, e il salto che il passo vuole escludere e' quello che `/` farebbe, gia' misurato in 1.4 |

> ### Il passo 1.3, e perche' non e' stato percorso come scritto
>
> Il passo vuole un **profilo di browser che avesse gia' seguito `/registrati`**
> quando quel rimando era un 308 permanente. **Quella finestra si e' chiusa
> prima che questo piano cominciasse:** il dispiegamento del laboratorio che
> serviva il 308 e' stato sostituito alle **15:10:11Z**, e il primo comando di
> questo piano — alle 15:11 — ha gia' trovato `/registrati` a **404**. Nessun
> profilo di browser di questa macchina aveva seguito quel rimando su
> quell'origine.
>
> **Cosa si e' misurato invece, e non e' una deduzione.** Un server locale che
> riproduce le due fasi sulla **stessa origine**, con il log di ogni richiesta:
>
> | Fase | `/registrati` | `/register` | Cosa ha chiesto il browser |
> |---|---|---|---|
> | 1 — il rimando esiste | `308 → /register`, `max-age=3600` | `200` | `GET /registrati`, poi `GET /register` |
> | 2 — la rotta non c'e' piu' | `404` | `404` | **solo `GET /register`** |
>
> Alle 15:43:42Z, in fase 2, **il browser non ha chiesto `/registrati` al
> server**: ha applicato il rimando che aveva in cache ed e' andato dritto a
> `/register`, che ha risposto **404**. URL finale `/register`, pagina *«404 /
> This page could not be found.»*
>
> **La conseguenza, che e' la cosa che serviva sapere:** un browser che aveva
> seguito quel rimando **finisce comunque su una 404**, per una strada diversa.
> Le due strade convergono, e la cache non riapre niente. Cio' che cambia e'
> l'indirizzo nella barra — `/register` invece di `/registrati` — e nient'altro.
>
> **Cosa questo surrogato NON prova:** che il browser di un'altra persona si
> comporti allo stesso modo, ne' che il dominio del laboratorio serva gli stessi
> header. Prova il meccanismo, su un browser vero, con il server che dichiara
> cosa gli e' stato chiesto. Il passo resta **da percorrere su un profilo
> reale** se e quando se ne trovera' uno.

---

## Procedura `P-50-2` — la migration, sul laboratorio

**PERCORSA dal piano 50-02**, 2026-09-21, riportata per intero in
`50-02-SUMMARY.md` e riassunta in `50-RUNBOOK.md`. Questo piano **non l'ha
ripetuta** e non aggiunge nulla ai suoi esiti.

Il fatto che vale la pena richiamare qui, perche' e' la ragione per cui questa
corsa poteva girare: la versione coniata e' `20260921124829`, e il primo
tentativo — rifiutato con `2BP01` alle 12:47:28Z — **ha annullato l'intera
transazione**, senza lasciare niente applicato a meta'.

---

## Procedura `P-50-3` — cancellare un account, e il rifiuto che dice la sua causa

Ruolo: **master**, dalla pagina membri. Letture prese **dal catalogo**, mai
dallo schermo.

| # | Esito | Osservato |
|---|---|---|
| 3.1 | **PASSA** | conferma alle **15:25:42Z** sull'account `member` **senza biglietti e senza tracce**. Dopo: `auth.users` **6 → 5**, `public.profiles` **6 → 5**, e l'indirizzo non compare piu' in nessuna delle due letture |
| 3.2 | **PASSA** | una riga in `membership_acts`: `act = 'deleted'`, **`subject_id` nullo**, `subject_label = 'RSN-UDX9QQE9V5'` — **il codice di membership, mai un indirizzo e mai un nome**; `actor_kind = 'user'`, `actor_id` = l'id di chi ha il ruolo master; `role_before = role_after = 'member'`; `at = 2026-09-21T15:25:42.105766Z` |
| 3.3 | **PASSA, e la frase non e' generica** | sull'account **con un biglietto**, alle 15:26:01Z: *«This account holds tickets — it cannot be deleted. Nothing was deleted. A ticket belongs to the person who bought it, and the database would delete the tickets along with the account: that is a cascade this product deliberately did not change, because the alternative is editing a money path to make an administrative screen easier. The count below is what blocks it. If access has to end, the answer is not this button.»* seguita da **`(1 biglietto)`** |
| 3.4 | **PASSA** | dopo 3.3, dal catalogo: i biglietti di quell'account sono ancora **1**, le righe `act = 'deleted'` sono ancora **1** (quella di 3.1), `profiles` ancora **5**. Niente e' cambiato |
| 3.5 | **PASSA, con DUE cause ulteriori invece di una** | vedi sotto |
| 3.6 | **meta' PASSA, meta' NON ESEGUIBILE** | sulla **propria** riga il controllo **non e' disegnato**: la colonna Actions porta `--`. La stessa cosa vale sulla riga di un altro master. **La chiamata diretta non e' esercitabile**: `deleteAccount` e' una Server Action e non ha un indirizzo che si possa chiamare da fuori — lo stesso limite che la fase 49 ha registrato su `P-ORD-4`. Il ramo esiste ed e' nominato: `src/app/(admin)/admin/members/actions.ts:2062`, `selfDetail: "self_delete"` |

### Le tre cause, che sono tre e non una

**E' questa la prova di D-50-16 che il runbook chiedeva**, e il runbook ne
pretendeva due: *«chi la percorre provi almeno due cause diverse, o avra'
provato che il rifiuto esiste e non che sa distinguere»*.

| Insieme che blocca | Ora | Frase, alla lettera |
|---|---|---|
| **biglietti** | 15:26:01Z | *«This account holds tickets — it cannot be deleted. …»* — `(1 biglietto)` |
| **assegnazione a una serata** | 15:26:32Z | *«This account is assigned to a night — it cannot be deleted. Nothing was deleted. Deleting the account would take its per-night assignments with it, and a revocation is never a deletion: the record stays, because the door has to be able to ask later whether somebody was assigned at the moment they scanned. Revoke the assignments from the event's assignments page first — that is recorded — and the answer here will change.»* — `(1 assegnazione ricevuta)` |
| **scansioni alla porta** | 15:30:53Z | *«This account worked the door — it cannot be deleted. Nothing was deleted. Every scan records the operator who performed it, and the database refuses to leave those rows without one. This is the door's own history and it is not rewritten from this screen.»* — `(1 scansione operata alla porta)` |

**Tre frasi diverse, tre insiemi diversi, tre conteggi diversi.** Nessuna dice
«qualcosa non ha funzionato», nessuna e' un `500`, e ognuna dice **cosa fare
dopo** o perche' non c'e' niente da fare. La terza e' stata resa possibile
inserendo a mano **una** riga in `door_scan_events` con quell'account come
operatore: il banco non ne semina, e senza quella riga la causa non ha soggetti.

---

## Procedura `P-50-4` — i media li carica chi ha titolo di lavoro

Il cancello vero e' `POST /api/media/finalize`, che e' un indirizzo HTTP e non
una Server Action: si esercita con la sessione vera di ciascun ruolo. Il file di
prova e' un JPEG di 160 byte depositato nella quarantena all'indirizzo che il
chiamante possiede, cioe' nella forma che il client costruirebbe.

| # | Esito | Osservato |
|---|---|---|
| 4.1 | **PASSA** | dashboard del `member`: *«My Stuff · Membership Card · Event History · My Tickets…»*. **Nessuna sezione dei propri media**, zero occorrenze di `upload`. *(E nessun avviso di stato: D-50-15 si vede qui.)* |
| 4.2 | **PASSA** | pagina della serata a cui il `member` ha un biglietto: **zero `input[type=file]`**, zero occorrenze di `upload` nel testo reso |
| 4.3 | **PASSA** | 15:32:51Z, `member`, `POST /api/media/finalize` sulla propria serata → **`403 {"ok":false,"reason":"forbidden.media_upload_required"}`**. Un rifiuto **nominato**: non un 500, non una frase generica |
| 4.4 | **PASSA** | 15:33:56Z, **organizer** → **`200 {"ok":true,"path":"…"}"`**. Riletto dallo storage, non dallo schermo: l'oggetto e' **sparito dalla quarantena** ed e' comparso in `event-media`, **267 byte** contro i 160 depositati (lo spogliatore riscrive il file) |
| 4.5 | **FALLISCE col banco prescritto, PASSA col titolo giusto** | 15:34:49Z, staff **assegnato alla serata X con `door.operate`** → **403 `forbidden.media_upload_required`**, cioe' rifiutato **sulla propria serata**. Concessa un'assegnazione **`media.upload`** sulla stessa serata: 15:35:35Z → **`200 {"ok":true,…}"`**. Vedi la non conformita' 1 |
| 4.6 | **PASSA** | 15:35:18Z, **lo stesso account, nello stesso minuto**, sulla serata Y a cui non ha assegnazioni → **403 `forbidden.media_upload_required`**. E' la meta' che prova che il titolo e' **per serata** e non un permesso generale |

> **L'annotazione che il runbook rende obbligatoria, e che va letta o l'esito si
> legge al contrario.** Il caricamento dei membri **era gia' morto** prima di
> questa fase: il suo arm interrogava una tabella che in questo schema non
> esiste — misurato il **2026-08-08**, e la misura sopravvive nel commento di
> `src/lib/media/may-upload.ts` al posto in cui l'arm stava. *Rifiutava sempre,
> per chiunque.* D-50-03 si e' eseguita **rimuovendo** quel percorso, non
> restringendolo. **Il 403 del passo 4.3 non e' una porta chiusa dalla fase 50:
> e' una porta che era murata da sei settimane e che adesso lo dice.**

---

## Procedura `P-50-5` — il signup spento, provato dove il prodotto non puo' provarlo

Ruolo: **anonimo**, `curl`, **chiave anonima** del laboratorio — mai quella di
servizio.

### La lettura prima, la scrittura, la lettura dopo

| Momento | Chiamata | `disable_signup` |
|---|---|---|
| 15:15:45Z | `GET /v1/projects/{lab}/config/auth` | **`false`** |
| 15:16:45Z | `PATCH …/config/auth` con `{"disable_signup": true}` → **HTTP 200** | la risposta del `PATCH` dice `true`, **e non conta**: e' un'eco |
| 15:16:47Z | `GET /v1/projects/{lab}/config/auth`, **seconda chiamata indipendente** | **`true`** |

### I tre passi

| # | Esito | Osservato |
|---|---|---|
| 5.1 | **PASSA, dopo aver cambiato dominio — e il cambio e' un risultato** | 15:15:52Z, con `@lab.invalid` come prescrive il runbook: **`400 {"code":400,"error_code":"email_address_invalid","msg":"Email address \"…@lab.invalid\" is invalid"}`**. Stesso esito con `@example.com`. Con **`@lab.test`**: **`429 {"code":429,"error_code":"over_email_send_rate_limit","msg":"email rate limit exceeded"}`** — cioe' la chiamata e' arrivata **fino all'invio della mail di conferma**, e si e' fermata su una strozzatura del fornitore. **Non `signup_disabled`**, che e' cio' che il passo chiede. *(Nessun utente e' nato: `auth.users` e' rimasta a 4, contata subito dopo.)* |
| 5.2 | **PASSA** | il `PATCH` risponde `200`, e la rilettura indipendente dice `true`. Datato nel runbook, riga `A.1` |
| 5.3 | **PASSA, alla lettera** | 15:16:55Z, stessa chiamata, chiave anonima: `{"code":422,"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}` — **HTTP 422** |

### Perche' la misura di controllo e' conclusiva benche' non sia nata di un account

Un `429` non e' un account. Potrebbe sembrare che il passo 5.1 non abbia provato
che il cancello fosse **aperto**, ma solo che qualcos'altro lo bloccava. **La
prova che manca l'ha data il passo 5.3**, ripetuto su **due** domini:

```
@lab.test     →  422  signup_disabled
@lab.invalid  →  422  signup_disabled      ← e prima del PATCH diceva 400 email_address_invalid
```

Con il signup spento, **anche un indirizzo che GoTrue considera malformato
riceve `signup_disabled`**. Quindi il controllo sul signup sta **prima** della
validazione dell'indirizzo. E la validazione dell'indirizzo sta prima
dell'invio della mail. Quindi il `429` del passo 5.1 — che e' **oltre**
entrambe — e' arrivato **oltre il cancello**, che a quel momento era dunque
aperto.

**Il confine e' chiuso dove il prodotto non poteva chiuderlo.** La pagina
cancellata dimostra che **il prodotto** non offre piu' quel percorso. Non
dimostra niente sull'API, e la chiave anonima viaggia nel bundle del browser:
e' pubblica per costruzione. `REG-04`, lato «nessuno entra», e' chiuso **qui**.

---

## Procedura `P-50-6` — con il signup spento, i percorsi di servizio creano ancora account

**Questa e' la procedura per cui la fase esisteva in questa forma.** `A1` —
*«`DisableSignup` non compare in `admin.go`»* — era letta dal sorgente di
GoTrue, non dalla versione dispiegata. Se fosse stata falsa, spegnere il signup
avrebbe spento **l'acquisto da ospite**.

**Tutte e quattro le prove sotto sono state eseguite con `disable_signup = true`
sul laboratorio, riletto dalla configurazione prima di cominciare.**

| # | Percorso | Esito | Osservato |
|---|---|---|---|
| 0 | `auth.admin.createUser` nudo, chiave di servizio | **PASSA** | 15:17:09Z → **HTTP 200 in 0,382 s**. Account creato e **confermato**; il trigger ha scritto il profilo: `role = member`, `membership_code` lungo **14** con prefisso `RSN-`. E' la prova secca di `A1`, senza superfici di mezzo |
| 6.1 | `createAccount` dalla pagina membri, ruolo master | **PASSA** | 15:23:33.796Z l'utente in `auth.users`; il profilo nello stesso istante, `role = organizer`, `full_name` valorizzato. A schermo: *«Lab Organizer was created as organizer, approved, and invited.»* Dal premere al messaggio: **~6,2 s**, mail compresa |
| 6.2 | lo stesso passo, sulla risposta | **PASSA** | *«Membership code: RSN-DUFE9LZW5F»* — prefisso `RSN-`, **14 caratteri** |
| 6.3 | lo stesso passo, sulla posta | **PASSA** | una riga in `email_deliveries`: `category = account_invitation`, `outcome = unverified`, `provider_message_id` presente, `created_at = 15:23:35.336Z`. **1,54 s** dall'account alla mail. In `membership_acts`, `act = 'created'`, `role_after = 'organizer'`, `actor_kind = 'user'` |
| 6.4 | **acquisto/prenotazione da ospite** → `resolveGuestIdentity` | **PASSA** | 15:38:27.547Z, ordine gratuito da **anonimo** sulla serata del laboratorio: identita' leggera creata, `profiles.full_name` uguale al nome digitato, `role = member`. Dall'ordine alla mail: **2,73 s**. **E' il passo che decide `A.2`** |
| 6.5 | voce di guest list | **PASSA** | 15:42:45.314Z l'utente in `auth.users` (**6 → 7**); profilo `role = member`, `membership_code RSN-YD9RPZJ6QS`; `guest_list_entries` con `status = 'ticket_issued'` e `profile_id` valorizzato; una riga `guest_invitation` in `email_deliveries` alle 15:42:47.140Z. **1,83 s** dall'account alla mail |

### `A1` e' CONFERMATA sul campo

**Cinque creazioni di account, su quattro percorsi diversi, tutte con il signup
pubblico spento, tutte riuscite.** Nessuna ha risposto `signup_disabled`,
nessuna e' stata piu' lenta di sei secondi, e in tutti i casi il profilo e'
comparso insieme all'utente.

**Quindi il passo manuale `A.2` — spegnere il signup in produzione — non e'
bloccato da questa prova.** Resta soggetto a cio' che il runbook gia' dichiara:
sono due progetti, e la versione di GoTrue dispiegata su ciascuno non e' nota da
questo repository. Il laboratorio **abbassa** il rischio di `A1`; non lo azzera.

> `50-RESEARCH.md` §5.2 leggeva dal sorgente che il controllo compare in **due
> soli punti**, `signup.go:115` e `external.go:343`. Cio' che questa corsa
> aggiunge non e' una seconda lettura del sorgente: e' che **sul servizio
> dispiegato quei due punti sono davvero i soli due**, misurato per differenza
> — la chiave anonima viene fermata, la chiave di servizio no, quattro volte.

---

## Procedura `P-50-7` — l'ordine gratuito, dal modulo al biglietto

**PERCORSA dal piano 50-05** e riportata in `50-05-SUMMARY.md` e nel runbook.
Questo piano l'ha **ripercorsa dal principio su un banco riseminato**, perche'
era anche la prova di `P-50-6` passo 6.4, e ha chiuso **il passo residuo** che
il runbook le lasciava aperto.

| # | Esito | Osservato |
|---|---|---|
| 7.1 | **PASSA** | da anonimo, senza sessione: tre campi — `Your name`, mail, quantita' `1…6` con *«Up to 6 per order — not per person.»* |
| 7.2 | **PASSA** | ordine da 2 → **un ordine, due biglietti** |
| 7.3 | **PASSA** | dal catalogo: `status: completed`, `total_amount: 0.0`, `quantity: 2`, **`sumup_checkout_id: null`**, `buyer_name` valorizzato |
| 7.4 | **PASSA** | i due biglietti: `holder_label` `1 di 2` e `2 di 2` — **nessun nome**; `issued_via: free_rsvp`; **`sumup_checkout_id: null`**; `amount_paid: 0.0`; stesso `user_id` dell'ordine |
| 7.5 | **PASSA** | il profilo nato dall'ordine: `full_name` uguale al nome digitato, `role: member` |
| 7.6 | **PASSA, e stavolta la mail e' partita** | **una sola** riga in `email_deliveries`, `ticket_order_confirmation`, `outcome unverified`, `provider_message_id` presente, 15:38:30.280Z. *(In 50-05 questa riga non c'era e il motivo era del laboratorio: la chiave di prova del fornitore. Con un indirizzo `@lab.invalid` il fornitore ha invece accettato la consegna. Il fatto che l'abbia accettata non dice che sia arrivata: `outcome` e' `unverified`, che e' esattamente cio' che significa.)* |
| 7.7 | riportato da **50-05** | stessa mail + nome diverso → secondo ordine, **stesso `user_id`**, `profiles.full_name` **invariato** |
| **7.13** | **PASSA — e' il passo residuo, chiuso qui** | vedi sotto |
| 7.8–7.12 | riportati da **50-05** | tetto, capienza (*«…1 left, 2 asked for.»*), capienza sommata agli RSVP storici, campo vuoto (*«Enter the email where your tickets should go. Nothing was booked.»* — **riosservato anche in questa corsa**, alle 15:37:38Z, su un invio a modulo vuoto), collegamento firmato senza sessione |

### Il passo residuo: rigiocare la consegna non conia biglietti nuovi

Il runbook lo lasciava scritto: *«7.7 ha provato che l'account non si riscrive,
non che i biglietti non si duplicano su una consegna ripetuta»*.

Alle **15:39:10Z**, `reserve_ticket_order` richiamata con **lo stesso id
d'ordine** e lo stesso `p_issued_via`:

```
HTTP 200
["28a165b0-895f-4b25-9a90-b78a7a269262", "8ebc88c8-97bf-4957-8fc4-7a097113926a"]
```

**Gli stessi due id di prima.** Riletto dal catalogo subito dopo: i biglietti
sull'ordine sono **2**, non 4; le righe di `email_deliveries` sono **2** in
tutto il database, non 3. Il ramo idempotente della RPC regge anche sul percorso
gratuito.

---

## Procedura `P-50-8` — la porta, con la radio spenta

**PERCORSA il 2026-09-21, fra le 16:01:27Z e le 16:02:19Z** — le 18:01 e le
18:02 a Torino — **dal proprietario, su un telefono vero**, contro
`lab.resonatemotion.com`, con l'account di staff del banco che ha
`door.operate` sulla serata gratuita.

E' l'unica delle otto che nessun comando poteva eseguire al posto di una
persona, ed e' l'unica il cui esito primario e' stato **visto su uno schermo**
invece che letto da una risposta HTTP: quattro schermate del telefono. Le
letture dal catalogo riportate sotto sono state fatte **dopo**, con la chiave di
servizio del laboratorio, e sono la meta' che le schermate non possono dare.

> **La modalita' aereo era vera, e la dichiarazione non e' una parola data.**
> Nella barra di stato delle schermate si vede **l'icona dell'aeroplano**, e non
> si vede **nessun indicatore di rete dati ne' di wi-fi**. Non era il solo wi-fi
> spento — che e' la scorciatoia che avrebbe reso la prova inutile, perche' con
> la rete dati accesa la coda offline non si esercita affatto e lo scanner
> risponde dal server come sempre. Il prodotto stesso lo conferma dall'interno:
> la pagina mostrava il banner *«The member list on this device was NOT
> refreshed. With the radio off…»*, che compare solo quando il dispositivo non
> raggiunge la rete.

### I sei passi, con cio' che si e' visto

| # | Passo | Cosa si e' **visto** |
|---|---|---|
| 1 | prenotare un posto e ricevere il QR | un **ordine gratuito nuovo**, quantita' 1, fatto dal proprietario con il proprio indirizzo: il biglietto appare come *«Biglietto 1 di 1»* con il suo QR, aperto su un secondo schermo. Non e' uno dei due biglietti seminati da `P-50-7`: e' un terzo, coniato al momento |
| 2 | aprire lo scanner con la rete accesa e lasciarlo precaricare | la pagina della porta aperta sulla serata gratuita, lista **scaricata**, contatori a **0 / 3**, linguette *All (3)* · *Not Arrived (3)*. Tre, non due: il biglietto del passo 1 e' entrato nella capienza e nella lista |
| 3 | **modalita' aereo** | icona dell'aeroplano nella barra di stato, nessun indicatore di rete. Il prodotto se ne accorge e lo dice: banner *«The member list on this device was NOT refreshed. With the radio off…»* |
| 4 | scansionare il QR del biglietto **gratuito**, radio spenta | **accettato.** Schermo **verde** con il segno di spunta, l'etichetta dell'intestatario, sottotitolo **«RSVP · Offline»**, *«Scanner paused»*, e in testata **«Pending (1)»**. **Lo stesso esito visivo di un biglietto pagato** — il che e' la proprieta' da verificare, e non era deducibile: lo scanner, la coda e il service worker non conoscono la differenza fra un biglietto a zero e uno pagato, e questa e' la prova che non la conoscono |
| 5 | scansionare **una seconda volta** lo stesso codice, sempre in aereo | **non rifiutato e non contato due volte.** Schermo **viola** con l'icona dell'orologio, la stessa etichetta, il testo **«Recorded at 18:01 by this device»** e *«Tap to dismiss»*. Il telefono sa di averlo gia' preso **lui**, e lo dice nominando se stesso invece di dare una risposta generica |
| 6 | riaccendere la rete | testata **«Online»**, *«Checked in · updated 0s ago»*, contatore **1 / 3 (33%)**, linguette *Not Arrived (2)* · *Checked In (1)*, e la pastiglia **«Pending» sparita**: la coda si e' sincronizzata |

**Nessuno dei sei passi ha dato un esito diverso da quello atteso.** Il verso
grave dell'errore — *un ospite valido respinto davanti a una fila*,
`checkin-offline.md` — **non si e' verificato**: al passo 4 il biglietto
gratuito e' entrato.

### La rilettura dal catalogo, che e' la meta' che lo schermo non da'

Fatta dopo la sincronizzazione, con la chiave di servizio, su PostgREST del
laboratorio. **Il biglietto:**

```
GET /rest/v1/tickets?select=…&issued_via=eq.free_rsvp
→ 3 righe, tutte sulla stessa serata e sullo stesso party
  e8da1006-4c40-45b4-8c83-742dab3fb3dd  (ordine b95c5af4-a925-452f-8e23-c8fe1034be39)
    issued_via        = "free_rsvp"
    amount_paid       = 0.00
    sumup_checkout_id = null
    checked_in_at     = "2026-09-21T16:02:19.018Z"
    checked_in_by     = <l'account di staff del banco>
  28a165b0-…, 8ebc88c8-…  (i due di P-50-7)  checked_in_at = null
```

L'ordine del passo 1, riletto: `total_amount = 0.00`,
`sumup_checkout_id = null`, `quantity = 1`. **Un ordine gratuito nuovo, non un
riuso**: l'idempotenza provata in `P-50-7` non ha impedito una prenotazione
successiva e distinta, che e' il comportamento giusto.

**Le convalide — la domanda vera di questa procedura:**

```
GET /rest/v1/door_scan_events?ticket_id=eq.e8da1006-…&order=scanned_at.asc
→ UNA riga, e una sola
  96b82ac4-cc08-4b61-b229-0848a2c0a2a3
    subject_type = "ticket"
    outcome      = "recorded"
    cause        = null
    source       = "offline_sync"
    is_undo      = false
    scanned_at   = "2026-09-21T16:01:27.331Z"   ← quando il telefono ha letto
    recorded_at  = "2026-09-21T16:02:19.341Z"   ← quando il server ha tenuto
```

**Una convalida, non due.** E c'e' di piu' di quanto il criterio chiedesse: la
seconda lettura **non ha prodotto nessuna riga**, nemmeno una `already_recorded`.
Il telefono l'ha riconosciuta come gia' propria e **non l'ha messa in coda
affatto** — coerente con lo schermo viola che diceva *«by this device»*.

I **52 secondi** fra `scanned_at` e `recorded_at` sono la finestra offline
misurata: e' esattamente l'intervallo che
`supabase/migrations/20260805120000_door_scan_events.sql:101-103` dichiara di
voler conservare — *«sul percorso offline questi due valori distano minuti o
ore»* — e qui si vede riempito da una radio spenta vera.

**`attendances`: nessuna riga sulla serata gratuita, ed e' corretto.** Il
percorso del biglietto scrive `tickets.checked_in_at` / `checked_in_by` e una
riga in `door_scan_events`
(`src/app/api/tickets/checkin/route.ts:1175-1220`, `:822`), **mai** una
presenza: `attendances` e' il registro del percorso **tessera**, scritto da
`src/app/api/membership/verify/route.ts:528-562`. Un lettore che cercasse li' la
prova dell'ingresso di un biglietto la troverebbe assente e ne dedurrebbe un
difetto: e' scritto qui perche' non succeda.

### La non conformita' che questa procedura ha fatto emergere

**Lo schermo della porta mostra il `full_name` dell'account acquirente.** Si
vede in tutte e due le schermate del passo 4 e del passo 5, sotto il segno di
spunta e sotto l'orologio.

`D-50-18b` dice che il nome raccolto dal modulo gratuito va **all'account** e
**non** allo schermo dello staff; `D-49-03` dice che il biglietto e' **al
portatore**, quindi il nome sullo schermo non e' nemmeno un'informazione su chi
sta passando la porta. `holder_label` sui biglietti e' stato verificato **privo
di nome** in `P-50-7`, e lo e' ancora: **il nome non arriva da li'**.

**Da dove arriva, e perche' non e' un difetto introdotto da questa fase.** Lo
scanner ha **sempre** etichettato i biglietti dei membri con il nome del
profilo: la lista scaricata sul telefono lo porta
(`src/app/api/tickets/attendance/route.ts:814-864`, che legge
`profiles.full_name` e lo mette nel campo `name`), la coda offline lo conserva
(`src/lib/offline/checkin-store.ts:786-789`) e lo schermo lo rende
(`src/app/(admin)/admin/scanner/ScannerClient.tsx:2186`). Il percorso online fa
la stessa cosa dal server (`src/app/api/tickets/checkin/route.ts:1077-1095`).
**La fase 50 non ha aggiunto quel comportamento: ha reso il nome presente per
ogni acquirente**, perche' ora il modulo gratuito lo raccoglie e
`handle_new_user` lo scrive nel profilo. Prima, chi comprava da ospite senza
nome finiva sullo schermo come *«Ticket holder»*; ora finisce con il suo nome.

**Non si tocca in questo piano**, e la ragione e' di dominio, non di comodo: e'
una modifica al percorso della porta, e la porta si modifica sapendo cosa si
rompe, non di rimbalzo a una verifica. E' una **decisione del proprietario** —
nascondere il nome sullo schermo della porta, o accettarlo — ed e' registrata
in `deferred-items.md`.

---

## I due passi manuali

### `A.1` — spegnere il signup sul laboratorio

**ESEGUITO il 2026-09-21 alle 15:16:45Z**, dalla Management API. Letto prima
(`false`), scritto, riletto dopo con una `GET` indipendente (`true`), e provato
dall'esterno con la chiave anonima (`422 signup_disabled`). La riga di
produzione, `A.2`, **resta vuota**: e' del piano 50-11, dentro l'autorizzazione
datata.

### `B.1` — il modello di conferma d'iscrizione, sul laboratorio

**Non c'era niente da togliere, e la misura lo dice.** Dalla configurazione
del progetto di laboratorio, in sola lettura:

```
mailer_templates_custom_contents.MAILER_TEMPLATES_CONFIRMATION_CONTENT = false
mailer_subjects_confirmation                = "Confirm your email address"
mailer_templates_confirmation_content       = "<h2>Confirm your email address</h2>…"
```

Il flag `false` significa **modello di default di Supabase**: sul laboratorio il
modello personalizzato non e' mai stato incollato, e il testo che si legge e'
quello che Supabase fornisce. `B.1` e' quindi **gia' nello stato di arrivo**, e
nessuna azione e' stata eseguita sul cruscotto.

**Cosa questo NON dice, ed e' la meta' che conta.** Il modello personalizzato
viveva — se e' stato incollato — sul progetto di **produzione**, che questa
corsa non ha interrogato su quel punto. `B.2` resta da eseguire, e ora si sa
**come misurarlo senza aprire il cruscotto**: leggere lo stesso flag sul
progetto di produzione. Se e' `false`, non c'e' niente da togliere neanche li';
se e' `true`, il modello personalizzato c'e' e va ricondotto al default. E'
lavoro del piano 50-11.

---

## Il conto, alla fine

| Sigla | Stato | Dove |
|---|---|---|
| `P-50-1` | **PERCORSA** — 9 passi su 11 pieni, 1.3 con surrogato, 1.10 in parte, 1.11 sul solo manifesto | questo documento |
| `P-50-2` | **PERCORSA** 2026-09-21 | piano 50-02 |
| `P-50-3` | **PERCORSA** — 5 passi su 6, il sesto per meta' | questo documento |
| `P-50-4` | **PERCORSA** — 6 passi su 6, con il banco esteso | questo documento |
| `P-50-5` | **PERCORSA** — 3 passi su 3 | questo documento |
| `P-50-6` | **PERCORSA** — 5 passi su 5, piu' una prova nuda. **`A1` confermata** | questo documento |
| `P-50-7` | **PERCORSA** 2026-09-21 e **ripercorsa**; passo residuo **chiuso** | piano 50-05 + questo documento |
| `P-50-8` | **PERCORSA** 2026-09-21 dal proprietario, 6 passi su 6 — **una convalida, non due** | questo documento |

| Passo manuale | Stato |
|---|---|
| `A.1` — signup spento, laboratorio | **eseguito**, 15:16:45Z |
| `A.2` — signup spento, produzione | **da eseguire**, piano 50-11 |
| `B.1` — modello di conferma, laboratorio | **gia' nello stato di arrivo**, misurato, nessuna azione |
| `B.2` — modello di conferma, produzione | **da misurare e poi eseguire**, piano 50-11 |

### Cio' che nessuna di queste prove puo' dire

- **Che la produzione si comporti come il laboratorio.** Sono due progetti, e la
  versione di GoTrue dispiegata su ciascuno non e' nota da questo repository.
- **Che la cache dei browser altrui abbia dimenticato il rimando permanente.**
  Il surrogato di 1.3 prova il meccanismo su un browser; gli altri li sistema il
  tempo, o non li sistema nessuno. Cio' che si sa e' che la strada finisce
  comunque in una 404.
- **Che una mail sia arrivata.** Tre righe di `email_deliveries` dicono
  `outcome: unverified`, che e' la parola giusta: il fornitore ha accettato la
  consegna, nessuno ha visto la casella.
- **Che la porta regga una fila.** `P-50-8` ha provato **un** biglietto, con
  **un** telefono, con **una** doppia lettura. Cio' che resta non provato e' il
  concorso: due telefoni che leggono lo stesso codice a radio spenta, e che si
  incontrano solo alla sincronizzazione. Il prodotto ha una classificazione
  apposta (`two_devices`, `door_scan_events.cause`) e nessuno l'ha esercitata.

---

## Una nota di metodo, per chi ripercorrera' queste prove

**Il browser pilotato non basta da solo, e due volte questa corsa ha quasi
scritto un esito falso.**

1. **L'idratazione.** Un clic inviato prima che React abbia idratato la pagina
   **non fa niente e non dice niente**: il pulsante c'e', risponde `cliccato`, e
   il prodotto non si muove. Tre volte e' sembrato un difetto del prodotto e
   tre volte era il tempo. Chi pilota un browser aspetti l'idratazione, o
   verifichi l'effetto **dal catalogo** prima di scrivere «non funziona».
2. **I campi controllati.** Scrivere `element.value` e battere un evento
   `input` **non aggiorna lo stato di React 19** su questi moduli: il DOM mostra
   il valore, il componente resta vuoto, e l'invio risponde *«Enter the email
   where your tickets should go. Nothing was booked.»* — un rifiuto corretto su
   un modulo che **a schermo** sembrava pieno. L'unica strada che funziona e'
   la digitazione vera (`Input.insertText`), **con la pagina in primo piano**:
   senza `Page.bringToFront` il testo non entra in nessun campo.

Nessuna delle due e' un difetto del prodotto. Entrambe sono modi di scrivere un
esito sbagliato, e stanno qui perche' la prossima persona non li ripaghi.
