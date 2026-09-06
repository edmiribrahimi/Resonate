---
phase: 49-comprare-senza-account
plan: 03
subsystem: venue-secrecy
tags: [venue, rls, security-definer, guardia-monotona, produzione, migration, misura]

requires:
  - phase: 37
    provides: "public.venue_for_parties e i suoi cinque rami — la funzione che questo piano riscrive intera"
  - phase: 49-01
    provides: "l'autorizzazione del 2026-09-06 (migration 4 di 5) e i due indici unici parziali su tickets, che decidono la forma dell'EXISTS"
  - phase: 49-02
    provides: "la forma della rilettura dal catalogo e la misura di riferimento a 2241 righe"
provides:
  - "L'arm 5 di public.venue_for_parties guarda un BIGLIETTO per quella serata, non profiles.status"
  - "49-PERIMETER.md: quattro misure prese dal catalogo, con la decisione datata e la sua domanda"
  - "La conseguenza accettata misurata per ruolo, prima e dopo, invece che assunta"
  - "Il debito dei media dichiarato in deferred-items.md con le tre riparazioni possibili"
affects: [49-04, 49-05, 49-11, 50, 51]

tech-stack:
  added: []
  patterns:
    - "Prova di volo del corpo di una funzione come SELECT autonomo sotto search_path vuoto, in sola lettura, PRIMA di spendere un'autorizzazione che si consuma una volta"
    - "Misura di un predicato per soggetto sostituendo auth.uid(), riportando SOLI CONTEGGI perche' .planning/ e' pubblicato"
    - "Prova strutturale al posto di una comportamentale quando la seconda richiederebbe di coniare una sessione: si dichiara quale delle due si e' ottenuta"
    - "Allargamento residuo di una guardia monotona dichiarato nel commit e nel COMMENT della funzione, invece che scoperto"

key-files:
  created:
    - supabase/migrations/20260905131000_venue_reader_needs_a_ticket.sql
    - .planning/phases/49-comprare-senza-account/49-PERIMETER.md
  modified:
    - .planning/phases/49-comprare-senza-account/49-AUTHORISATION.md
    - .planning/phases/49-comprare-senza-account/deferred-items.md
    - .planning/STATE.md

key-decisions:
  - "stringi (proprietario, 2026-09-05): l'indirizzo lo legge chi ha un biglietto per QUELLA serata, non chi ha uno stato"
  - "I tre termini temporali dell'arm 5 non si toccano, compreso il terzo, che non e' assorbito dal secondo per un venue_reveal_hours negativo"
  - "EXISTS e non una sottoquery scalare: dal piano 49-01 un biglietto con order_id non e' piu' unico per (serata, utente)"
  - "Nessun REVOKE e nessun GRANT: CREATE OR REPLACE su firma identica conserva l'ACL, e anon ci sta per decisione"
  - "L'unico angolo che allarga e' DICHIARATO nel commit e nel COMMENT — la guardia monotona pretende che un allargamento sia esplicito, non che non esista"
  - "Le prove con una sessione sono DIFFERITE a 49-11 e dichiarate non eseguite: coniare sessioni e scrivere righe sono fuori dall'autorizzazione"

requirements-completed: []

duration: ~20min
completed: 2026-09-06
---

# Fase 49 Piano 03: chi legge un indirizzo — Summary

**Un profilo approvato senza biglietto leggeva l'indirizzo di qualunque serata
segreta pubblicata; da oggi lo legge chi ha un biglietto per QUELLA serata — e la
misura di chi perde cosa e' stata presa, non immaginata.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3 / 3
- **Migration applicate in produzione:** 1 / 1 — la **quarta** delle cinque autorizzate
- **Righe scritte in produzione:** **0** (un `CREATE OR REPLACE FUNCTION` e un
  `COMMENT ON FUNCTION` — nessun `INSERT`, `UPDATE`, `DELETE`, `GRANT` o `REVOKE`)

## I cinque rami, prima e dopo

Letti da `pg_get_functiondef` **prima** dell'applicazione (e trovati identici al
file `20260810161000_venues_read_narrowed.sql`, commenti compresi: nessuna
deriva) e **dopo**.

| Ramo | Chi apre — **prima** | Chi apre — **dopo** | Sotto `is_published` |
|---|---|---|---|
| **2** — staff | `private.has_capability('staff.manage')` | **identico, non toccato** | no — sta sopra il pavimento |
| **1** — serata non segreta | `ep.venue_secret = false` | **identico** | si' |
| **3** — biglietto | biglietto per la serata **o** master per l'evento, **e** `coalesce(venue_reveal_on_purchase, true)` | **identico** | si' |
| **4** — RSVP | un RSVP per la serata, mai sotto il flag | **identico** | si' |
| **5** — **riscritto** | **un profilo il cui `profiles.status` e' approvato**, senza alcun biglietto, per **qualunque** serata segreta pubblicata | **il titolare di un biglietto per QUESTA serata**, o di un master per il suo evento | si' |

**La condizione temporale dell'arm 5 e' identica**, e i suoi tre termini non sono
stati toccati: `venue_revealed_at IS NOT NULL` · la finestra
`party_start_instant(...) - coalesce(venue_reveal_hours, 25)` · la serata gia'
iniziata. **Il terzo e' stato conservato apposta:** sembra assorbito dal secondo e
non lo e' su un `venue_reveal_hours` negativo — la colonna e' un `integer` nudo
senza `CHECK`, e su un valore negativo la finestra apre **dopo** la porta mentre
il terzo apre **alla** porta.

**Cambia solo il CHI.** E' l'unica differenza fra il corpo installato prima e
quello installato dopo.

## La versione registrata, e la deriva che era prevista

| Cosa | Valore |
|---|---|
| File | `supabase/migrations/20260905131000_venue_reader_needs_a_ticket.sql` |
| Applicata (UTC) | **2026-09-06 14:49:48** |
| Endpoint | `POST /v1/projects/{ref}/database/migrations` — **mai** `/database/query` |
| HTTP | **200**, corpo `[]` |
| **Versione registrata** | **`20260906144948` / `venue_reader_needs_a_ticket`** |

**Terza ripetizione identica della deriva annunciata da 49-01.** L'endpoint conia
la versione dall'istante dell'applicazione, non dal nome del file: il file dice
`20260905131000`, la storia dice `20260906144948`. Letta da
`supabase_migrations.schema_migrations`, **non** dalla risposta del `POST`, che
era `[]` — una misura presa con lo strumento che ha causato l'effetto e' un'eco.

## Cosa ha detto il catalogo alla rilettura

Ogni riga viene da `pg_proc` / `supabase_migrations.schema_migrations`, **dopo**
l'applicazione.

| Cosa | Letto da | Risposta |
|---|---|---|
| Ancora `SECURITY DEFINER` | `pg_proc.prosecdef` | **`true`** |
| `search_path` ancora fissato | `pg_proc.proconfig` | **`{search_path=""}`** |
| Ancora `STABLE` | `pg_proc.provolatile` | `s` |
| **Permessi invariati** | `pg_proc.proacl` | `{postgres=X, anon=X, authenticated=X, service_role=X}` — **byte per byte identici a prima** |
| `public.profiles` nel corpo eseguibile | `pg_get_functiondef`, righe non commentate | **0 occorrenze** — nessun valore di stato puo' piu' aprire un ramo |
| `FROM public.tickets` nel corpo eseguibile | `pg_get_functiondef` | **2** — arm 3 e arm 5 |
| Termini temporali conservati | `pg_get_functiondef` | **3** righe non commentate (`venue_revealed_at`, due `party_start_instant`) |
| Il commento della funzione | `obj_description` | riscritto: cinque rami, l'arm 5 nuovo, la decisione datata, e l'angolo che allarga |

**Nessun `REVOKE` e nessun `GRANT` nella migration**, per decisione scritta:
`CREATE OR REPLACE` su una firma identica conserva l'ACL, e il catalogo lo
conferma. `anon` resta sul grant **per decisione** — e' l'unica strada pubblica
verso un indirizzo e restringe internamente. Riemetterli non avrebbe aggiunto
nulla e avrebbe dato due occasioni di sbagliare su un oggetto del cammino del
venue.

## Il ri-conteggio delle righe contro 2241

L'istantanea del **2026-09-06 14:00:55 UTC** non e' stata ripresa, come
prescritto. Il conteggio e' stato **ri-derivato** su ogni tabella base di
`public` con `query_to_xml`, e riportato nelle **tre** forme gia' pubblicate
dalla fase, cosi' che sia confrontabile con entrambi i riferimenti precedenti.

| Insieme | Tabelle | **Prima** | **Dopo** |
|---|---|---|---|
| Le 15 tabelle non vuote dell'istantanea | 15 | **2241** | **2241** |
| Quelle piu' `artists` e `venues` (chiusura di 49-02) | 17 | **2253** | **2253** |
| **Ogni** tabella di `public` (superinsieme di controllo) | 41 | **2327** | **2327** |
| Tabelle non vuote | — | 19 | 19 |

**Nessuna delle tre misure si e' mossa di una riga**, ed era atteso: la migration
non contiene una sola istruzione di scrittura di dati. **Le tre misure
riproducono esattamente i tre numeri pubblicati da 49-01 e 49-02** — 2241, 2253,
2327 — quindi il riferimento regge e non e' stato ricalibrato per farlo tornare.

## La prova di volo, prima di spendere l'autorizzazione

Un'autorizzazione **si consuma una volta**, quindi il modo di sbagliarla si cerca
dove non costa nulla. Prima del `POST`, il corpo nuovo e' stato eseguito come
**`SELECT` autonomo, in sola lettura**, con `SET search_path = ''` in vigore e il
parametro sostituito dalle tre serate reali.

**Esito: analizza, tipizza e risolve ogni nome**, e restituisce **1 riga** per un
chiamante senza sessione. Un errore di risoluzione dei nomi sotto `search_path`
vuoto sarebbe stato comunque intercettato da `CREATE OR REPLACE` su una funzione
`LANGUAGE sql` — ma sarebbe stato intercettato **da un'autorizzazione gia'
spesa**, che e' la differenza fra saperlo prima e saperlo dopo.

## La conseguenza accettata, misurata per ruolo invece che assunta

**Il piano chiedeva di verificare che i ruoli con titolarita' sulla serata
continuino a leggere l'indirizzo, nominando quale ramo li serve, invece di
darlo per scontato.** Fatto due volte: leggendo il catalogo, e misurando.

### Cosa dice il catalogo su chi tiene `staff.manage`

`catalogo: private.role_capabilities` — **`master` e `organizer`** tengono
`staff.manage` per concessione di **ruolo**, con `requires_approved = false`.
Quindi **l'arm 2 li serve**, ed e' scritto sopra il pavimento della
pubblicazione: leggono l'indirizzo anche su un evento in bozza. Hanno inoltre un
**secondo cammino indipendente da questa funzione**: la policy
`venues_select_staff` su `public.venues`, `SELECT` ad `authenticated` con
`staff.manage` (`catalogo: pg_policies`). **L'arm 2 non e' stato toccato.**

### La misura, prima e dopo — conteggi soltanto

Predicato installato valutato in **sola lettura**, sostituendo il soggetto ad
`auth.uid()`. Riportati **solo conteggi**, mai un identificatore e mai un
indirizzo: `.planning/` e' pubblicato.

In produzione ci sono **3 serate**, tutte su eventi pubblicati: **una non
segreta**, **due segrete**; per tutte e tre la finestra e' aperta e la serata e'
gia' iniziata. `tickets` = **0 righe**, `rsvps` = **0 righe**.

| Ruolo (conteggio) | Serate lette **prima** | di cui segrete | Serate lette **dopo** | di cui segrete | Ramo che lo serve dopo |
|---|---|---|---|---|---|
| `master` `approved` (1) | 3 / 3 | 2 | **3 / 3** | **2** | arm 2 — invariato |
| `organizer` `approved` (1) | 3 / 3 | 2 | **3 / 3** | **2** | arm 2 — invariato |
| `member` `approved` (2) | 3 / 3 | 2 | **1 / 3** | **0** | solo arm 1, la serata non segreta |

**I due profili `member` sono chi perde qualcosa**, e lo perde perche' lo teneva
**solo** grazie al proprio stato: con `tickets` e `rsvps` a zero, gli arm 3 e 4
non potevano aprire per nessuno, quindi le due serate segrete arrivavano
loro **unicamente dall'arm 5**. E' la conseguenza accettata della decisione, ed
e' esattamente quella dichiarata prima di prenderla.

> **Che tipo di prova e' questa, detto senza arrotondare.** E' una misura del
> **predicato**, valutato in sola lettura con il soggetto sostituito, **non** una
> chiamata della funzione con una sessione reale. La differenza e' la risoluzione
> di `auth.uid()` e il contesto `SECURITY DEFINER`. E' molto piu' di un
> ragionamento e molto meno di una prova comportamentale — e va chiamata con il
> suo nome.

## Prova positiva e prova negativa: cosa e' stato ottenuto e cosa no

Il piano chiede entrambe, e chiede che se non si possono coniare le sessioni la
prova diventi **un passo scritto** della procedura manuale di `49-11` e **si
dichiari non eseguita, mai si arrotondi**.

| Prova | Stato | Come |
|---|---|---|
| **Negativa, strutturale** | **OTTENUTA** | Il corpo installato, letto da `pg_get_functiondef`, non contiene **alcuna riga eseguibile** che nomini `public.profiles`. Nessun valore di `profiles.status` puo' quindi aprire un ramo: e' una proprieta' del corpo, e non ha bisogno di una sessione |
| **Negativa, per assenza di sessione** | **OTTENUTA** | Chiamata **reale** all'RPC `POST /rest/v1/rpc/venue_for_parties` con la sola **chiave anonima**, sulle tre serate: **1 riga prima, 1 riga dopo** — la non segreta, con tutti e quattro i campi del venue. La strada pubblica non e' cambiata, e nessuna serata segreta e' uscita |
| **Negativa, con una sessione approvata senza biglietto** | **NON ESEGUITA** | Richiederebbe di coniare una sessione — **fuori dall'autorizzazione del 2026-09-06**, che esclude esplicitamente le sessioni coniate. Differita a `49-11` |
| **Positiva, con una sessione che possiede un biglietto** | **NON ESEGUITA** | Richiederebbe **anche** di scrivere una riga in `public.tickets` (che ne ha **zero**) — fuori dall'autorizzazione due volte. Differita a `49-11` |

### I due passi da aggiungere alla procedura manuale di `49-11`

> **P-VENUE-1 — chi ha il biglietto legge l'indirizzo.** Con una sessione che
> possiede un biglietto per una serata **segreta** la cui finestra di rivelazione
> e' aperta (o gia' rivelata a mano, o gia' iniziata), chiamare
> `POST /rest/v1/rpc/venue_for_parties` con l'id di quella serata.
> **Attendere:** **una riga**, con `name`, `address` e `google_maps_url`
> valorizzati. Zero righe significa che l'`EXISTS` sul biglietto non corrisponde
> — e la prima cosa da guardare e' se quel biglietto ha `party_id` valorizzato o
> e' un master con `party_id` nullo.
>
> **P-VENUE-2 — chi non ce l'ha non lo legge.** Con una sessione il cui profilo
> e' approvato ma che **non** possiede alcun biglietto ne' RSVP per quella
> serata, e il cui ruolo **non e'** `master` ne' `organizer`, chiamare lo stesso
> endpoint con lo stesso id. **Attendere: zero righe.** Una riga significa che un
> ramo apre su qualcosa che non e' un biglietto, e va trovato **prima** che
> esistano clienti: e' l'errore che questa migration esiste per chiudere.
>
> Entrambi si eseguono al primo ambiente in cui si possano coniare sessioni e
> scrivere biglietti. **Su nessuno dei due si arrotonda:** finche' non sono
> eseguiti, la prova comportamentale non esiste.

## L'unico angolo in cui questo cambio ALLARGA — dichiarato, non scoperto

`venue-secrecy.md`: la guardia monotona consente di rendere una rivelazione **piu'
difficile**, mai piu' facile, *«salvo autorizzazione esplicita documentata nel
commit»*. Il nuovo arm 5 **non e' un sottoinsieme perfetto** del vecchio, e
l'angolo va nominato invece che lasciato trovare a qualcun altro.

**L'angolo:** il titolare di un biglietto **il cui profilo non e' approvato**, su
una serata con `venue_reveal_on_purchase = false`, dopo il momento della
rivelazione. **Prima:** rifiutato da entrambi i rami — l'arm 3 e' chiuso dal
flag, l'arm 5 dallo stato. **Dopo:** ammesso dall'arm 5.

**Perche' e' voluto e non una svista.** Il cron della rivelazione tratta gia'
come titolare chiunque abbia un biglietto e gli spedisce l'indirizzo **senza
leggere ruolo ne' stato**; la tabella riscritta il 2026-08-22 in
`venue-secrecy.md` dice *«la pagina del proprio biglietto: il venue, appena la
rivelazione scatta»* e **non nomina lo stato**. Un ramo che rifiutasse a quella
persona cio' che la posta le ha gia' mandato sarebbe la divergenza, non
l'allineamento. Ed e' coerente con `D-49-03`, che rende il biglietto **al
portatore**: e' il biglietto a dare diritto, non chi lo tiene.

**Quanto e' grande.** `public.tickets` ha **zero righe**: l'insieme e' **vuoto
oggi**, e resta minuscolo dopo, perche' il webhook porta a stato approvato chi
paga. **Rientra alla lettera nel perimetro autorizzato** il 2026-09-06, che
descrive questa migration come *«l'arm 5 guarda un biglietto per quella serata
invece di `profiles.status`»* — l'angolo e' la conseguenza matematica esatta di
quella descrizione. Scritto nel messaggio di commit, nel `COMMENT` della funzione
e qui.

## Cio' che il piano non aveva previsto

### 1. Le policy che nominano `authenticated` sono **32**, non 31

`D-49-02` ne aveva contate **31** il 2026-09-05. La differenza e'
`ticket_orders_select_own`, **creata oggi dal piano 49-01**, con predicato
`auth.uid() = user_id`. Restringe per chiamante, quindi **non entra** nell'insieme
delle letture cieche, che restano **due** ed esattamente quelle nominate da
`D-49-02`. **Il numero e' cambiato, la conclusione no** — ed e' scritto in
`49-PERIMETER.md` perche' chi ricontera' domani non concluda che `D-49-02` aveva
sbagliato.

### 2. Il bucket `event-media` e' **pubblico**, quindi la policy non e' il confine dell'immagine

Il piano chiedeva se una foto approvata puo' mostrare un luogo. La risposta e'
**si'**, strutturale. Ma `catalogo: storage.buckets` dice qualcosa che il piano
non aveva previsto: **`event-media` ha `public = true`**, con URL su
`/storage/v1/object/public/event-media/`
(`src/app/(public)/events/[slug]/actions.ts:320`). **I byte dell'immagine erano
gia' raggiungibili da chiunque avesse l'URL, senza alcuna sessione.**

Conseguenza sulla misura: questa fase allarga **chi scopre la riga** — da quattro
profili a ogni acquirente — e **non** allarga l'immagine. Senza questo fatto la
misura avrebbe descritto la policy come il confine, cioe' avrebbe detto una cosa
falsa nella direzione rassicurante.

**Registrato come `D-49-03-DEF-05`** in `deferred-items.md`, con le **tre**
riparazioni possibili e la ragione per cui nessuna appartiene a questa fase.
**Corroborato da una fonte indipendente:** `verify-venue-surfaces.mjs` stampa la
stessa uscita fra le proprie *OPEN EXITS* a ogni esecuzione.

### 3. L'arm 2 **non** risponde a un'assegnazione per serata

`private.has_capability` ha due rami — la concessione per ruolo e l'assegnazione
per serata da `public.party_assignments` — e il secondo e' condizionato a
`p_party_id is not null`. **`venue_for_parties` chiama `has_capability` senza
passare `p_party_id`**, quindi l'arm 2 risponde **solo** alla concessione per
ruolo.

**Conseguenza:** una persona con ruolo `member` **assegnata alla porta** di una
serata non e' servita dall'arm 2. Oggi legge l'indirizzo dall'arm 5, e dopo
questa migration non lo legge piu' da questa funzione. **Non e' una regressione
introdotta qui** — l'arm 2 non e' stato toccato — ma e' **la forma precisa della
perdita** che il piano descriveva a parole (*«uno staff senza biglietto smette di
leggere l'indirizzo da questo ramo»*), e a parole era piu' rassicurante di
com'e'.

**Cosa la rende non urgente, misurato:** `public.party_assignments` ha **zero
righe** e non esiste alcun conto con ruolo staff. Nessuno e' oggi in quella
situazione. **Cosa la rende da ricordare:** appena esistera' un assegnato per
serata con ruolo `member`, le sue strade sono `admin/` — che `venue-secrecy.md`
indica esplicitamente come la casa dello staff — oppure un biglietto. Va
guardato quando la porta verra' esercitata la prima volta, non il giorno in cui
qualcuno non trova un indirizzo.

### 4. Una serata segreta in produzione ha `venue_reveal_on_purchase = false`

Delle tre serate, **due sono segrete**, e una delle due porta il flag a `false`
con `venue_reveal_hours = 48`. Rilevante perche' e' **esattamente** la
configurazione su cui l'angolo che allarga puo' materializzarsi, ed e' scritto in
`49-PERIMETER.md` accanto all'altra faccia della stessa moneta: **una serata
segreta lasciata con quel flag a `true` consegna l'indirizzo al titolare appena
ha una sessione**, senza attendere la rivelazione. Non e' un buco aperto qui —
e' la configurazione della serata, e la pagina applica la stessa congiunzione —
ma dev'essere una scelta consapevole al momento di creare una serata, non una
scoperta.

## Verifica — evidenza, non aggettivi

> **Non esiste un test runner per il prodotto.** `package.json` non ha script
> `test`, non esiste alcun `*.test.*` o `*.spec.*`. **Nulla qui e' verificato
> perche' «i test passano».** La verifica automatica e' `npm run build` (che e'
> anche il typecheck di Next); il resto e' lettura del catalogo, una chiamata
> reale all'endpoint e procedura scritta.

| Controllo | Comando / fonte | Esito |
|---|---|---|
| Build + typecheck | `npm run build` | **exit 0** |
| Superfici del venue | `node scripts/verify-venue-surfaces.mjs` | **exit 0 — PASSED**, controlli A–F |
| Endpoint reale, chiave anonima | `POST /rest/v1/rpc/venue_for_parties` | **1 riga prima, 1 dopo** — la serata non segreta |
| `CREATE OR REPLACE FUNCTION public.venue_for_parties` nel file | `grep -c` | **1** |
| `status = 'approved'` nel file | `grep -c` | **0** — l'arm non guarda piu' lo stato |
| `FROM public.tickets` nel file | `grep -cE` | **2** |
| `venue_revealed_at IS NOT NULL` nel file | `grep -cE` | **2** |
| `SET search_path = ''` nel file | `grep -c` | **1** |
| Nessun indirizzo in un file pubblicato | `grep -cE "^(#\|\|).*(via\|piazza\|corso\|strada)" 49-PERIMETER.md` | **0** |
| `venue_for_parties` in `49-PERIMETER.md` | `grep -c` | **4** |
| `stringi` e `2026-09-05` in `49-PERIMETER.md` | `grep -c` | **2** e **4** |
| Ogni misura porta la sua riga di verdetto | `grep -c "la allarga"` | **5** |

### La mutazione della prova e' stata provata

`ai-engineering.md`, gate *prova per mutazione*: la variante «dopo» del predicato
e' costruita sostituendo l'arm 5 nel testo del predicato «prima», e la
sostituzione **e' asserita prima di leggerne l'esito**. Al primo tentativo
l'asserzione **e' scattata** — un controllo troppo largo scambiava `pp.status`
dell'arm 2 per `p.status` dell'arm 5 — ed e' stata stretta. Senza quella
asserzione la variante sarebbe stata generata vuota e avrebbe restituito zero
righe: **uno zero che sembrava una conferma della restrizione** e che invece era
un file non scritto.

## Deviazioni dal piano

### 1. Task 1 e 2 in un commit solo

I due task producono **lo stesso artefatto** in una sola scrittura. Separarli
avrebbe richiesto di scrivere `49-PERIMETER.md` senza la sua decisione per poi
rimetterla — un commit intermedio che descrive uno stato che non e' mai stato
voluto. La ragione e' scritta nel messaggio del commit `aac5dac`.

### 2. [Rule 2] La prova di volo prima dell'applicazione non era nel piano

Il piano prescrive di rileggere dal catalogo **dopo**. Eseguire il corpo come
`SELECT` autonomo **prima**, in sola lettura, e' un'aggiunta: un'autorizzazione
si consuma una volta, e la condizione 4 dice *«se fallisce, ci si ferma»* —
quindi il costo di un errore di sintassi e' l'intera migration. Nessuna
scrittura, nessun oggetto creato.

### 3. `STATE.md` aggiornato **a mano**, non con `gsd-sdk query state.*`

`D-49-01-DEF-03` registra, con la riproduzione su **due verbi diversi**, che i
comandi `state.*` riscrivono `stopped_at` con una frase di un'altra fase e
ricalcolano l'intero blocco `progress` con denominatori che non corrispondono a
nessuna misura del progetto. La regola operativa che quella voce fissa e'
esplicita: **finche' non e' riparato, la riga si applica a mano.**

Le tre righe di decisione sono state aggiunte a mano, e la verifica e' stata
chiesta a una fonte diversa da quella che ha agito: `git diff --stat
.planning/STATE.md` → **3 insertions(+), 0 deletions(-)**. Nulla d'altro toccato.

### 4. `requirements-completed` e' vuoto, e `BUY-03` **non** e' marcato

Il frontmatter del piano dichiara `requirements: [BUY-03]`, ma **`BUY-03` e'
rivendicato da otto piani della fase** (04, 05, 06, 07, 08, 09, 11 e questo) e
questo piano non lo completa: misura un perimetro e stringe un ramo, non apre
l'acquisto senza account. **Inoltre `.planning/REQUIREMENTS.md` non esiste**, e
`requirements mark-complete` non ha su cosa agire. Marcarlo avrebbe dichiarato
completo un requisito che nessuna riga di questo piano soddisfa.

## Registro STRIDE — cosa ne e' stato

| ID | Disposizione | Esito |
|---|---|---|
| `T-49-10` — arm 5 con una popolazione `approved` che cresce | mitigate | **mitigato in produzione**: l'arm non guarda piu' lo stato. La decisione e' del proprietario, datata, e la sua domanda e' trascritta |
| `T-49-11` — una foto approvata che inquadra un luogo | mitigate | **misurato, risposta `si'`, NON riparato qui.** Debito dichiarato `D-49-03-DEF-05`, con la scoperta in piu' che il bucket e' pubblico |
| `T-49-12` — `description` del checkout come uscita di testo libero | mitigate | **misurato**: nessuna colonna di venue in nessuno dei tre cammini; resta un vincolo su **come si da' un nome**. La prova su una pagina reale e' di `49-11` |

**Nessuna superficie di minaccia nuova.** Questo piano non aggiunge endpoint,
cammini d'autenticazione, colonne, policy o tabelle: sostituisce il corpo di una
funzione esistente restringendone un ramo.

## Il debito che resta, dichiarato una volta

- **`D-49-03-DEF-05`** — una foto approvata puo' mostrare un luogo, e il bucket
  `event-media` e' pubblico. Da riportare in `49-VERIFICATION.md`, come il
  criterio d'accettazione del task 1 pretende.
- **L'arm 2 non serve un assegnato per serata** con ruolo `member`. Zero righe
  in `party_assignments` oggi; da guardare al primo esercizio vero della porta.
- **Le due prove comportamentali** con una sessione: `P-VENUE-1` e `P-VENUE-2`,
  scritte sopra, **non eseguite**.

## Self-Check

File — verificati esistenti sul disco:

- `supabase/migrations/20260905131000_venue_reader_needs_a_ticket.sql` — FOUND
- `.planning/phases/49-comprare-senza-account/49-PERIMETER.md` — FOUND
- `.planning/phases/49-comprare-senza-account/49-03-SUMMARY.md` — FOUND

Commit — verificati in `git log`:

- `aac5dac` — `docs(49-03): il perimetro misurato dal catalogo, e la decisione con la sua domanda` — FOUND
- `f3b5cef` — `feat(49-03): l'indirizzo lo legge chi ha un biglietto per QUELLA serata` — FOUND
- `b96a30f` — `docs(49-03): il debito dei media entra fra le voci dichiarate…` — FOUND

Produzione — letta dal catalogo, non dalla risposta del `POST`:
versione `20260906144948` in `supabase_migrations.schema_migrations` FOUND ·
`prosecdef = true` FOUND · `proconfig = {search_path=""}` FOUND ·
`proacl` identico prima/dopo FOUND ·
`public.profiles` nel corpo eseguibile ASSENTE (atteso) ·
due `FROM public.tickets` FOUND · tre termini temporali FOUND ·
righe 2241 / 2253 / 2327 identiche prima e dopo FOUND ·
RPC anonimo 1 riga prima e 1 dopo FOUND.

## Self-Check: PASSED
