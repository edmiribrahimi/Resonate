---
phase: 35-per-night-assignments
plan: 11
subsystem: checkin-offline
tags: [door, undo, capabilities, per-night, assign-05, wave-5]

# Dependency graph
requires:
  - plan: 35-07
    provides: "`requireDoorOperator({ partyId })` con `maySupervise`, e le costanti `DOOR_SUPERVISION_REQUIRED` / `DOOR_SUPERVISION_REQUIRED_ERROR` — codice in repo, migration NON applicate"
  - plan: 35-03
    provides: "`public.my_access_context(uuid)` e il secondo braccio di `private.has_capability` — migration NON applicata"
  - plan: 33-04
    provides: "l'unione taggata a quattro rami e `DOOR_UNRESOLVED_STATUS` — in produzione"
provides:
  - "il primo consumatore applicativo di `door.supervise`: `DOOR_SUPERVISION_REQUIRED` esce da una route"
  - "il primo call site che passa una notte a `requireDoorOperator({ partyId })`"
  - "`bindNightToSubject` — la notte nominata dal chiamante vincolata al soggetto, in un solo posto per tre rami"
affects: [35-13, 35-14, 35-19]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "una notte che decide un'autorizzazione e arriva dal chiamante va VINCOLATA al soggetto: senza, chi e' assegnato alla notte X supervisiona la notte Y nominando X"
    - "il vincolo notte→soggetto ha tre esiti, non due: `mismatch` e `unreadable` sono cose diverse e una lettura fallita non diventa un rifiuto"
    - "lo status code si sceglie leggendo la tabella del drain e si motiva accanto, nominando il caso vicino che NON deve copiarlo"
    - "quando un controllo grep e la prosa del file collidono, si riscrive la prosa: un controllo che la sua documentazione rompe e' un controllo che qualcuno cancella"

key-files:
  created: []
  modified:
    - src/app/api/tickets/checkin/undo/route.ts

key-decisions:
  - "`403` e non `503`: nella tabella di `sync-manager.ts:131` un 403 finisce in `blocked`, che aspetta un nuovo login — difetto per una scansione in coda, irrilevante qui perche' **un undo non passa mai dal drain** (`ScannerClient.tsx:917` posta e legge la risposta sul posto). La distinzione fra i due casi e' scritta nel file, perche' il vicino sbagliato e' materia del piano 35-12"
  - "Il body si parsa PRIMA della guardia: la risoluzione unica ha bisogno della notte e la notte sta nel body. Conseguenza dichiarata: un body malformato senza sessione risponde 400 dove prima rispondeva 401"
  - "`partyId` resta OPZIONALE. Senza notte il verdetto e' quello del solo RUOLO, che e' un sottoinsieme stretto di quello che una notte puo' aggiungere: omettere la notte puo' solo produrre una risposta piu' severa, mai piu' permissiva"
  - "Il vincolo notte→soggetto vale anche quando il ticket ha una notte propria (prima il `partyId` del body veniva semplicemente ignorato in quel caso)"

# Metrics
metrics:
  duration: "~50 min"
  completed: 2026-08-09
  tasks_completed: 2
  tasks_total: 2
  checkpoint_open: false
---

# Fase 35 Piano 11: annullare un check-in diventa un atto di supervisione — Summary

ASSIGN-05, lato server. `door.supervise` esce per la prima volta da una route:
chi e' assegnato alla sola porta di una serata **non** puo' annullare un
check-in, un organizer si'. Il confine non e' la RLS — `undo/route.ts:316`
scrive con il client service, che la bypassa — ed e' la guardia nella route.

> **ASSIGN-05 e' chiusa a meta', e la meta' aperta ha un nome.** Questo piano
> risponde a *chi puo' annullare*. *Chi ha annullato* resta registrato sul solo
> ramo ticket: guest list e membership non scrivono nessuna riga di registro, e
> membership **cancella** la riga `attendances`. Debito differito, dichiarato
> nel docblock del file (`:20-57`) e qui. **E un secondo pezzo manca sul
> dispositivo:** `ScannerClient.tsx:869-892` esegue un undo puramente locale con
> la radio spenta — svuota la coda, non scrive nessun record, non chiede niente
> a nessuno. Una regola di supervisione che vive solo in questa route si aggira
> spegnendo la radio. Quella meta' e' il piano **35-13**. Un verde su questo
> piano non e' il requisito soddisfatto.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | Il gate di supervisione, subito dopo la risoluzione unica | `596da2b` | `src/app/api/tickets/checkin/undo/route.ts` |
| 2 | Dichiarare per iscritto la meta' che questo piano non chiude | `6b53cf1` | `src/app/api/tickets/checkin/undo/route.ts` |

**Lingua:** commenti e identificatori in inglese, come il file che estendono.

---

## Il gate — dove sta, e perche' 403

| Cosa | Riga |
|---|---|
| import di `DOOR_SUPERVISION_REQUIRED` e `DOOR_SUPERVISION_REQUIRED_ERROR` | `:4-5` |
| il body parsato per primo | `:218-231` |
| la forma del `partyId` validata prima della guardia | `:247-255` |
| `namedNight` | `:257` |
| **la sola** risoluzione, con la notte | `:262-264` |
| il commento che motiva il `403` e separa undo da scan | `:280-298` |
| **il gate `maySupervise`** | `:300-308` |
| `const serviceClient = getServiceClient()` | `:316` |

Il gate sta **prima** del client service, quindi prima di qualunque scrittura in
tutti e tre i rami: un undo rifiutato non ha toccato niente.

**`403`, scelto leggendo `sync-manager.ts:102-175` e non ereditato dal rifiuto
sopra.** In quella tabella `401 || 403` finisce nel bucket `blocked`, che tiene
l'elemento finche' l'operatore non rifa' il login — e per una **scansione** in
coda rifiutata per assegnazione sarebbe un difetto, perche' un nuovo login non
restituisce un'assegnazione revocata. Qui e' corretto per un motivo misurabile:
**un undo non passa mai dal drain.** La coda contiene scansioni;
`ScannerClient.tsx:917` posta l'undo direttamente e legge la risposta sul posto.
Nessuno classifica questa risposta, quindi `blocked` e' irraggiungibile da qui.
Il file scrive la separazione fra i due casi accanto al gate, perche' il vicino
sbagliato — lo scan rifiutato per assegnazione, piano **35-12** — e' esattamente
quello da cui qualcuno copierebbe lo status.

**La categoria viaggia come valore nel corpo**, `status: DOOR_SUPERVISION_REQUIRED`,
accanto alla frase umana in `error`. Mai dentro il messaggio: Next redige il
messaggio di un errore lanciato in un build di produzione (CR-01,
`guards.ts:73-79`).

**Aggiungere un rifiuto e' la decisione, non una svista.** L'asimmetria della
porta — un falso rifiuto davanti a una fila e' peggio di un doppio ingresso —
governa lo **scan**, non l'undo: nessuno sta in fila mentre un annullamento
viene rifiutato, e la via d'uscita e' lunga una frase
(*«Undoing a check-in needs a supervisor. Ask an organizer for this night.»*).
La motivazione e' scritta nel file (`:59-76`), non solo qui.

---

## Deviazioni dal piano

### 1. [Rule 2 — funzionalita' critica mancante] La notte che autorizza va vincolata al soggetto

- **Trovata durante:** task 1, scrivendo la chiamata `requireDoorOperator({ partyId })`.
- **Il fatto.** `door.supervise` e' **assegnabile per notte**
  (`20260809001000_assignment_resolver.sql:121-134`, e la chiave e' nella lista
  `party_assignments_capability_assignable` di
  `20260809000000_party_assignments.sql:341`). Quindi il verdetto dipende da
  **quale notte** viene nominata — e la notte arriva dal **corpo della
  richiesta**, cioe' dal chiamante. Il piano chiede di passare quel valore alla
  guardia; passarlo e basta significa che chi e' assegnato alla notte X puo'
  nominare X e annullare **qualunque** cosa, compreso un ingresso della notte Y
  o di un altro evento. Il gate sarebbe stato decorativo esattamente per la
  popolazione che ASSIGN-05 prende di mira.
  Non e' un'ipotesi sulla UI: `ScannerClient.tsx:914` manda gia'
  `body.partyId = selectedPartyId` su **tutti e tre** i rami, cioe' la notte
  **selezionata**, che non e' necessariamente la notte del soggetto.
- **Cosa e' stato fatto.** `bindNightToSubject` (`:148-186`), un solo posto per i
  tre rami, invocato **prima di ogni scrittura** (`:364`, `:500`, `:549`): la
  notte nominata deve **essere** la notte del soggetto, oppure — per un soggetto
  che non ne ha una (ticket a livello evento, guest entry a livello evento) —
  appartenere al suo evento. E' la regola che il ramo ticket applicava gia' ai
  soli ticket a livello evento, ora estesa a tutti e tre e non riscritta tre
  volte.
  Il ritorno ha **tre** esiti e non due (`NightBinding`, `:143-146`): una
  lettura che non ha risposto e' `unreadable` (→ 500 *«Party lookup failed»*, il
  messaggio e lo status che il file gia' dava) e **non** `mismatch` (→ 400). Un
  `false` al posto di una domanda senza risposta sarebbe un rifiuto travestito
  da risposta — la stessa proprieta' per cui `require-operator.ts` ha un quarto
  esito.
  Il `500` e' deliberato invece di `503`: in **questo** file `503` significa *«il
  record non e' stato scritto e il check-in resta in piedi»*, cioe' una decisione
  su una **scrittura**; qui e' una **lettura** che non ha risposto, e chiamarla
  503 confonderebbe le due.
- **Effetto collaterale dichiarato:** un ticket **con** una notte propria a cui
  si nomina una notte diversa ora riceve `400`, dove prima il `partyId` del body
  veniva silenziosamente ignorato. E' il buco chiuso, non una regressione.
- **Commit:** `596da2b`

### 2. [Rule 3 — bloccante, di forma] Un criterio grep rotto dalla prosa del file stesso

- **Trovata durante:** task 1, eseguendo la verifica automatica del piano.
- **Il fatto:** il criterio pretende
  `grep -c "await requireDoorOperator(" == 1`. Il paragrafo che spiega **perche'**
  la chiamata dev'essere una sola citava la chiamata alla lettera, e il conteggio
  dava **2**. E' lo stesso incidente che `35-07-SUMMARY.md` ha registrato sul
  `catch`: un controllo che va letto aggirandolo e' un controllo che la terza
  volta viene ignorato.
- **Cosa e' stato fatto:** invece di indebolire il controllo, e' stata riscritta
  la **prosa** — il paragrafo nomina la guardia a parole e dichiara il vincolo
  del grep (`:110-117`). Il controllo resta quello vero (misura i call site
  reali) e adesso vale **1**.
- **Commit:** `596da2b`

Nessun'altra deviazione. Nessun gate di autenticazione incontrato.

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck e build | `npm run build` | **PASS** — `✓ Compiled successfully`, `Running TypeScript` senza errori, exit 0 |
| Una sola risoluzione d'autorizzazione | `grep -c 'await requireDoorOperator(' <file>` | **PASS** — `1` |
| La categoria e' esportata e consumata | `grep -c 'door.supervise' <file>` | **PASS** — `4` |
| Il gate precede il client service | `grep -n 'maySupervise\|getServiceClient()'` | **PASS** — `:300` prima di `:316` (prima menzione `:223`) |
| La categoria non e' dentro il testo di `error` | lettura, `:300-308` | **PASS** — `error: DOOR_SUPERVISION_REQUIRED_ERROR` (`:304`), `status: DOOR_SUPERVISION_REQUIRED` (`:305`), due campi distinti |
| Il commento separa undo e scan nominando `blocked` | lettura, `:280-298` | **PASS** |
| Il ramo guest list e' nominato nel docblock | `grep -ci 'guest list' <file>` | **PASS** — `4` |
| `partyId` grezzo non sfugge oltre la validazione | `grep -n 'partyId\|namedNight'` | **PASS** — usato solo a `:233`, `:248-252`, `:257`; ogni consumo passa da `namedNight` |
| Nessuna cancellazione nei due commit | `git diff --diff-filter=D --name-only` | **PASS** — vuoto su entrambi |
| Nessun file non tracciato lasciato | `git status --short` | **PASS** — vuoto |

### Cosa queste verifiche NON provano

- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.** Il
  repo non ha test runner: `npm run build` e' il typecheck, non una prova di
  comportamento.
- **`public.my_access_context(uuid)` non esiste in produzione.** Questo file
  chiama, per la prima volta con una notte, codice scritto contro migration che
  stanno nella coda a mano (righe 7+ di `35-HUMAN-UAT.md`). Il verde del build
  non dice niente sulla RPC: nessun client di questo repository e'
  parametrizzato con un generico `Database`, quindi nome della funzione, nome
  dell'argomento e forma del payload sono stringhe che nessun compilatore
  controlla. **Prima che la coda sia applicata, ogni undo che nomina una notte
  fallisce rumorosamente** con il ramo `unresolved` a 503 — comportamento
  corretto, e da mettere in conto nell'ordine di applicazione.
- **La frase distinguibile non e' osservabile con nessun comando di questo
  repository.** Next redige il messaggio di un errore lanciato fuori da una
  Server Action in un build di produzione; qui la categoria e' un **valore nel
  corpo** proprio per quello, ma che arrivi allo schermo come frase e non come
  *«qualcosa e' andato storto»* si vede solo su un deploy. La procedura sotto
  **e'** il deliverable di quella meta'.
- **Nessuna prova di runtime del vincolo notte→soggetto.** E' dedotto dalle
  colonne (`GuestListEntry.party_id`, `Attendance.party_id`, entrambe
  `string | null` con `event_id` NOT NULL) e dal codice, non osservato.

---

## La procedura manuale — l'unica prova che esistera'

Da eseguire **dopo** l'applicazione delle righe 7+ di `35-HUMAN-UAT.md` e
**dopo un deploy in produzione** (in `next dev` il punto 2 non prova niente: il
messaggio non e' redatto e quindi il test del canale non e' il test reale).
Ruoli, mai persone.

**Preparazione.** Un evento con **due** serate, `notte A` e `notte B`. Un
account **staff** assegnato alla sola `notte A` con `door.operate` (e senza
`door.supervise`). Un account **organizer**. Un ticket con check-in fatto su
`notte A` e un ticket con check-in fatto su `notte B`.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | organizer | `/admin/scanner`, selezionare `notte A`, annullare il check-in di `notte A` dagli ultimi scan | L'undo riesce. Il flash rosso dice *«Check-in undone»*. In `door_scan_events` compare una riga con `is_undo = true`, `party_id` = `notte A`, `operator_id` = l'organizer |
| 2 | staff assegnato a `notte A` | stessa pagina, stessa serata, stesso gesto | **L'undo e' rifiutato.** Il dettaglio sotto il titolo deve leggersi *«Undoing a check-in needs a supervisor. Ask an organizer for this night.»* — **non** *«qualcosa e' andato storto»* e non un messaggio vuoto. Nel Network: `403`, corpo con `"status":"door_supervision_required"`. **Il check-in resta in piedi**, e nessuna riga nuova compare in `door_scan_events` |
| 3 | staff assegnato a `notte A` | selezionare `notte A` e annullare il check-in fatto su **`notte B`** | **Rifiutato con `400`** e *«partyId names a different night…»*. E' il vincolo: l'assegnazione a una notte non autorizza l'altra. Prima di questo piano il `partyId` del body veniva ignorato e l'undo passava |
| 4 | organizer | ripetere il passo 3 | Anche l'organizer riceve `400`: il vincolo e' sul **soggetto**, non sul ruolo. E' voluto — una notte nominata che non e' quella dell'ingresso e' comunque una richiesta sbagliata |
| 5 | staff **non** assegnato a nessuna notte | tentare un undo | `403` con `«Forbidden»` — il rifiuto di `door.operate`, che viene **prima**. Distinguibile dal passo 2: corpo **senza** `status` |
| 6 | organizer | revocare l'assegnazione dello staff (`revoked_at`) e ripetere il passo 2 | Il rifiuto passa da supervisione a `«Forbidden»`. La riga dell'assegnazione resta in tabella |
| 7 | chiunque | POST diretto con `partyId` non-uuid | **`400`**, non 503 e non 403. Se risponde 503, la route non sta validando il proprio body e un id malformato finirebbe nel bucket retryabile |
| 8 | organizer | annullare un check-in di **guest list** e uno di **membership** | Riescono. **E in `door_scan_events` non compare nessuna riga**: e' il debito dichiarato sotto, osservato invece che raccontato |

**Nota su cosa NON prova il passo 2.** Il **titolo** sopra il dettaglio resta
quello generico che `ScannerClient.tsx:81-87` mappa dallo status HTTP prima di
leggere il corpo: un dispositivo non distingue ancora *«questo account non puo'
mai supervisionare»* da *«questo account non e' il supervisore di QUESTA
notte»*. Limite gia' registrato in `require-operator.ts:105-110` e rinnovato
qui; lo chiude il piano **35-13**.

---

## Debito differito e nominato

**ASSIGN-05 e' chiusa a meta': *chi puo'* e' risposto qui, *chi ha annullato* e'
registrato sul solo ramo ticket — guest list e membership non scrivono nessuna
riga di registro e membership CANCELLA la riga `attendances`, quindi su quei due
rami un annullamento e' invisibile nella lista di revisione della serata, e
senza error tracking non lo scopre nessuno.**

E la seconda meta', sul dispositivo: **`ScannerClient.tsx:869-892` esegue un
undo puramente locale quando la radio e' spenta** — svuota l'elemento dalla
coda, non scrive nessun record, non interroga nessuna capability. Una regola di
supervisione che vive solo in questa route **si aggira spegnendo la radio**.
Piano **35-13**.

Perche' la prima meta' non si chiude qui: e' lavoro di **registrazione**, non di
autorizzazione, e ha un perimetro suo — i due rami ricevono un id e nessuna
notte (registrare vuol dire farla nominare dal chiamante), e il ramo membership
deve **smettere di cancellare** una riga di presenza, che e' una modifica al
significato dei dati di presenza e non un ritocco a questo handler.

### Un difetto preesistente, NON toccato

I rami guest list (`:485`) e membership (`:541`) collassano
`fetchError || !entry` in un unico `404`: *«non esiste»* e *«la lettura non ha
risposto»* diventano la stessa risposta. E' il pattern che `checkin-offline.md`
vieta (gate *query a esito singolo*) e che il ramo ticket gia' evita
(`:326-334`, con lo split su `PGRST116`). **Non e' causato da questo piano e non
e' stato corretto**: e' fuori perimetro secondo il contratto di questa onda.
Registrato qui perche' `deferred-items.md` non e' scrivibile da un worktree in
parallelo.

---

## Threat Flags

Il threat register del piano, con come e' coperto:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-52 | mitigato | Gate su `auth.maySupervise` a `:300`, **prima** di `getServiceClient()` a `:316`, quindi prima di ogni scrittura nei tre rami. **E il vettore che il gate da solo lasciava aperto e' chiuso**: `bindNightToSubject` (`:148`) impedisce che una notte scelta dal chiamante autorizzi un soggetto di un'altra notte |
| T-35-53 | accettato | Debito differito e **nominato** nel docblock (`:20-57`) e nella sezione sopra, con la conseguenza osservabile scritta senza attenuazioni e il passo 8 della procedura che la fa vedere |
| T-35-54 | mitigato | `status: DOOR_SUPERVISION_REQUIRED` come **valore** nel corpo, accanto a `error`, deciso per posizione. Nessun parsing di messaggi in nessun punto del file |
| T-35-55 | mitigato | `403` scelto leggendo `sync-manager.ts:102-175`, con il commento (`:277-298`) che nomina il bucket `blocked` e **separa esplicitamente** il caso undo dal caso scan del piano 35-12 |
| T-35-56 | mitigato | `grep -c 'await requireDoorOperator(' ` = **1**, e la prosa e' stata riscritta per non rompere il controllo invece di indebolire il controllo |
| T-35-SC | non applicabile | nessun pacchetto installato o modificato |

**Superficie nuova oltre a quella pianificata:** nessun endpoint nuovo, nessuna
funzione esportata nuova (`bindNightToSubject` e `refuseUnboundNight` sono
locali al modulo). L'unico cambio di contratto HTTP e' quello **dichiarato**: il
body parsato prima della guardia sposta un `401` a `400` sul caso «nessuna
sessione **e** JSON malformato», che non rivela nulla di account o dati perche'
il body e' del chiamante stesso.

Una nota di **osservabilita'**, come segnalazione e non come difetto introdotto
qui: la categoria di log `undo:party_lookup` esiste gia' in questo file e viene
ora emessa anche dal ramo del vincolo. In un prodotto senza error tracking un
log non raggiunge nessuno — ma questa ha un **effetto osservabile**, il `500`
che l'operatore vede sul posto, che e' quello che `meta-gates.md` chiede.

---

## Known Stubs

Nessuno stub di codice. Tre dipendenze in avanti, tutte scritte anche nei file
che le contengono:

1. **La coda delle migration non e' applicata.** Il primo call site con una
   notte esiste adesso, la funzione SQL che risolve la domanda no.
2. **Il titolo sullo scanner non distingue ancora il rifiuto di supervisione**
   dagli altri 403: lo status e' mappato a un titolo prima che il corpo sia
   letto. Piano **35-13**.
3. **L'undo offline non passa da questa route.** Piano **35-13**.

### Perche' `STATE.md`, `ROADMAP.md` e `deferred-items.md` non sono stati toccati

Contratto di questa onda: l'orchestratore li possiede dopo il merge, e
`ai-engineering.md`, gate *multi-agent*, dice di **sequenziare** due agenti sullo
stesso file invece di parallelizzarli. `src/lib/offline/sync-manager.ts` — che il
piano 35-12 sta riscrivendo — e' stato **solo letto**, mai modificato.

---

## Self-Check: PASSED

- `src/app/api/tickets/checkin/undo/route.ts` — FOUND, 585 righe, contiene
  `DOOR_SUPERVISION_REQUIRED` (`:4`, `:305`), il gate `if (!auth.maySupervise)`
  (`:300`), la risoluzione unica (`:262`), `bindNightToSubject` (`:148`) con i
  suoi tre call site (`:364`, `:500`, `:549`), e il docblock *«What is closed
  here, and what is NOT»* (`:20`)
- commit `596da2b` — FOUND
- commit `6b53cf1` — FOUND
- `.planning/STATE.md`, `.planning/ROADMAP.md`,
  `.planning/phases/35-per-night-assignments/deferred-items.md`,
  `src/lib/offline/sync-manager.ts` — **NON MODIFICATI**
- nessuna cancellazione di file in nessuno dei due commit
  (`git diff --diff-filter=D` vuoto su entrambi)

