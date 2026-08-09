---
phase: 35-per-night-assignments
plan: 22
subsystem: checkin-offline
tags: [door, scan, assignments, assign-01, assign-08, wave-7]

# Dependency graph
requires:
  - plan: 35-07
    provides: "`requireDoorOperator({ partyId })` a quattro rami e `DOOR_UNRESOLVED_STATUS` — codice in repo, resolver per-notte NON applicato (riga 8 della coda)"
  - plan: 35-12
    provides: "`judgeAtScanTime()` e la decisione di NON passare la notte alla chiamata di ruolo — ereditata, non riaperta"
  - plan: 35-15
    provides: "il contesto d'accesso con `liveAssignmentCapabilities` — chiave del payload, riga 14 della coda"
  - plan: 35-17
    provides: "lo scanner raggiungibile da una persona assegnata — la meta' che rendeva visibile il buco"
provides:
  - "il secondo braccio dell'autorizzazione: la domanda per-notte, posta SOLO sul ramo di rifiuto di quella di ruolo"
  - "`door_night_not_assigned` / `door_night_other_night` / `door_night_unresolved` — tre cause distinte per posizione, tutte a 403"
  - "`readNightArm()` — la lettura dell'esito, separata dalla sua richiesta perche' l'ordine dei due call site e' misurato"
  - "il controllo di accoppiamento notte-concessa ↔ notte-scritta, inerte oggi e scritto perche' non smetta di esserlo in silenzio"
  - "la prova 11 di `35-HUMAN-UAT.md`, con il caso che vive in una finestra che si chiude"
affects: [35-14, 35-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "una guardia che puo' fallire per infrastruttura si affianca a quella che funziona, non la sostituisce: il secondo braccio non puo' peggiorare l'esito di chi ci arriva perche' arriva gia' rifiutato"
    - "un `unresolved` che non puo' peggiorare nulla non ha bisogno di un 503: tiene lo status che il primo braccio aveva gia' dato e cambia solo la causa"
    - "un campo dichiaratamente PIU' LARGO del permesso e' lo strumento giusto per classificare un rifiuto, e quello sbagliato per concederlo"
    - "un controllo che misura l'ordine di due call site va scritto in modo che l'hoisting non lo faccia misurare al contrario"

key-files:
  created:
    - .planning/phases/35-per-night-assignments/35-22-SUMMARY.md
  modified:
    - src/app/api/tickets/checkin/route.ts
    - .planning/phases/35-per-night-assignments/35-HUMAN-UAT.md

key-decisions:
  - "Il secondo braccio NON e' asked per un report dal drain: chiede «l'assegnazione e' viva ORA», e il piano 35-12 ha misurato che quella e' la domanda sbagliata per un momento passato (`granted_after_scan` letta al drain risulta viva)"
  - "Tutte e tre le cause rispondono 403 e nessuna 503: 403 e' il codice che il primo braccio aveva gia' prodotto, quindi il secondo braccio e' neutro nel caso peggiore; nella tabella di `sync-manager.ts:225` produce `blocked`, che e' comunque irraggiungibile dal drain per costruzione"
  - "La distinzione fra «non assegnato» e «assegnato ad un'altra notte» viene da `liveAssignmentCapabilities`, il campo grossolano: classifica il rifiuto, non concede niente — il verdetto resta della guardia sulla notte nominata"
  - "La chiamata per-notte sta IN LINEA nell'handler e non dentro l'helper: un helper dichiarato sopra e' hoisted, e il criterio che misura l'ordine dei due call site per numero di riga lo avrebbe misurato al contrario"
  - "`liveAssignmentCapabilities === null` (riga 14 non applicata) e' la causa `unresolved`, mai «non assegnato»: sono i tre stati che `server.ts:222-243` pretende restino tre"

# Metrics
metrics:
  duration: "~75 min"
  completed: 2026-08-09
  tasks_completed: 2
  tasks_total: 2
  checkpoint_open: false
---

# Fase 35 Piano 22: ASSIGN-01 arriva alla scansione — Summary

Con la fase spedita come pianificata, una persona `staff` assegnata alla porta
**raggiungeva** lo scanner, **vedeva** la serata nella lista, e prendeva **403 su
ogni scansione**. ASSIGN-01 dice *«can use that night's tools»*, e alla porta lo
strumento e' la scansione: il requisito primario non sarebbe stato consegnato.

Il rimedio non e' passare la notte alla guardia esistente — quella strada e'
**503 su ogni scansione dal primo deploy**, ed e' stata rifiutata dal piano
35-12 con ragione. E' **affiancarle un secondo braccio, sul solo ramo di
rifiuto**.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | Il secondo braccio della guardia, sul solo ramo di rifiuto | `8a08fa2` | `src/app/api/tickets/checkin/route.ts` |
| 2 | La procedura scritta, perche' nessun comando la puo' eseguire | `537bc65` | `35-HUMAN-UAT.md` |

**Lingua:** commenti e identificatori in inglese, come il file che estendono; la
procedura in italiano, come il documento che la ospita.

---

## La forma, e perche' l'ordine e' tutto

| # | Condizione | Cosa succede |
|---|---|---|
| 1 | il braccio di ruolo concede | invariato. Un solo round trip, nessun byte diverso. E' `master` e `organizer` |
| 2 | rifiuta, **e** la richiesta e' un report dal drain | invariato. `judgeAtScanTime`, giudicato a `scannedAt` (piano 35-12) |
| 3 | rifiuta, non e' un report, **e** non c'e' una notte ben formata | invariato. Il `403` di sempre, con lo stesso corpo |
| 4 | rifiuta, non e' un report, e una notte c'e' | **nuovo.** Il secondo braccio: concede, oppure riemette il rifiuto con una causa propria |

| Cosa | Riga |
|---|---|
| il punto 6 del docblock di file | `:70-97` |
| le tre costanti d'esito | `:399-401` |
| le tre frasi, e perche' la seconda vale la lettura in piu' | `:405-418` |
| `NightArm` (`:425`), `refuseNight` (`:430`) | `:419-432` |
| il docblock di `readNightArm` — il perche' del 503 mancante, il bucket, il campo grossolano | `:438-504` |
| `readNightArm` | `:506-550` |
| `namedNight`, e il `403` invariato con la sua condizione allargata | `:642-664` |
| `const partyId = namedNight` — **la notte unica**, con il vincolo scritto accanto | `:679-697` |
| **la chiamata per-notte**, in linea | `:720` |
| il rifiuto del secondo braccio | `:730-737` |
| il controllo di accoppiamento notte-concessa ↔ notte-scritta | `:775-807` |
| il ramo `nightGrant` nella scelta del giudizio | `:846-851` |

**Il braccio di ruolo e' letteralmente immutato**: il primo hunk del diff che
tocca l'handler parte dalla vecchia riga 416, mentre l'handler apre a 344 e la
guardia e' chiamata a 349.

---

## Le tre cause, e perche' nessuna e' un 503

| Causa | Valore | Quando |
|---|---|---|
| rifiutato per ruolo **e** nessuna assegnazione viva da nessuna parte | `door_night_not_assigned` | dopo la riga 8 e la riga 14 |
| assegnato, ma non alla notte nominata | `door_night_other_night` | dopo la riga 8 e la riga 14 |
| la domanda per-notte non ha risposto | `door_night_unresolved` | **oggi, sempre** — il resolver e' la riga 8 e non esiste |

**Tutte e tre a `403`.** Tre ragioni, in ordine crescente di peso:

1. **Il bucket e' irraggiungibile dal drain per costruzione.** Il braccio non
   viene chiesto per un report in coda, quindi nessuna voce di coda puo' mai
   ricevere una di queste risposte. E' l'argomento che il piano 35-11 ha fatto
   per l'undo, e qui e' verificabile: la condizione nomina `isQueuedReport`.
2. **Se un'edit futura lo rendesse raggiungibile, `blocked` e' l'errore
   sopravvivibile e `retry` no.** Un 503 metterebbe la voce in `retry`
   (`sync-manager.ts:235`), dove verrebbe rispedita a ogni `online` per tutta la
   notte contro una condizione che un retry non cambia: il resolver mancante non
   compare alle tre di notte. `blocked` (`:225`) almeno la conserva, e la
   conserva **contata su uno schermo**.
3. **403 e' il codice che quel chiamante aveva gia' ricevuto.** Il permesso *e'*
   stato risolto — dal braccio di ruolo, sull'orologio del server, e la risposta
   era no. Cio' che non e' stato risolto e' **l'appello**. Rispondere 503 direbbe
   a un operatore senza titolo che il server e' rotto.

**`unresolved` non e' `false`, e non lo diventa qui.** La proprieta' e'
mantenuta dove conta: la causa e' un **valore distinto**, non una denuncia
travestita, e il permesso su cui il 403 poggia era stato risolto davvero.

---

## Il vincolo notte ↔ soggetto — cosa e' stato fatto e cosa era gia' li'

`35-11` ha trovato il buco sulla rotta di undo: la notte nominata autorizzava, e
il soggetto poteva essere di un'altra notte. **La domanda va posta di nuovo qui,
e la risposta e' precisa invece che rassicurante.**

**Su questa rotta il buco non ha la stessa forma, e la ragione e' strutturale:
c'e' una sola notte.** `partyId` e' contemporaneamente (a) il valore passato al
secondo braccio, (b) il valore che `respond()` scrive in
`door_scan_events.party_id`, e (c) il valore contro cui la notte del biglietto e'
confrontata a `:1220-1221` (`wrongParty || wrongEvent`). Non esiste una «notte
Y» su cui agire: quel confronto e' **la stessa regola di `bindNightToSubject`** —
la notte nominata dev'essere quella del soggetto, o una notte del suo evento —
e vale **per ogni chiamante**, non solo per un assegnatario.

Cosa e' stato aggiunto perche' resti vero:

1. **Una sola `const partyId`**, con il vincolo scritto sopra e l'edit che lo
   romperebbe nominata per esteso (*«risolvi la notte dal biglietto»*).
2. **Il controllo di accoppiamento** (`:793`): se la notte che ha concesso non e'
   la notte che sta per essere scritta, rifiuta. **Oggi e' irraggiungibile** —
   `party` e' letto `.eq("id", partyId)` — ed e' scritto come ramo per la stessa
   ragione, e nella stessa forma, del ramo finale che il piano 35-12 ha lasciato
   a `:864`: un'asserzione sarebbe una promessa, un ramo e' un controllo.

**Un buco vero che NON e' stato chiuso, e la ragione per cui non doveva esserlo.**
Il ramo dei rimborsi (`:1133-1200`) registra `recorded` senza confrontare
`refunded_party_id` / `refunded_event_id` con la notte nominata: un biglietto
rimborsato di un **altro evento** viene ammesso e registrato. E' **preesistente**
e vale identico per `master` e `organizer`. Chiuderlo solo per chi e' entrato dal
secondo braccio produrrebbe una **porta a due velocita'** — la stessa persona
ammessa dal telefono dell'organizer e rifiutata da quello dello staff — che e'
esattamente la divergenza per cui `require-operator.ts` e' stato scritto
(*«the same person refused by one scanner and admitted by another, on the same
night, is undiagnosable»*). Chiuderlo per tutti violerebbe l'invariante di questo
piano. **Registrato sotto, in Cross-plan.**

---

## Deviazioni dal piano

### 1. [Rule 3 — bloccante, di forma] Il criterio che l'hoisting avrebbe misurato al contrario

- **Trovata durante:** il task 1, eseguendo il controllo automatico del piano.
- **Il fatto.** Il criterio pretende che la riga della chiamata per-notte sia
  **maggiore** di quella della chiamata di ruolo. La prima stesura metteva la
  chiamata dentro un helper dichiarato **sopra** l'handler: la lettura era giusta
  (il braccio si chiede dopo), la misura era `497 < 561`, cioe' rossa. E'
  la stessa classe di incidente che `35-11-SUMMARY.md` ha registrato su un
  commento che citava una chiamata.
- **Cosa e' stato fatto:** invece di indebolire il controllo, la **chiamata** e'
  stata portata in linea nell'handler (`:720`) e l'helper e' stato ridotto alla
  **lettura** dell'esito (`readNightArm`, `:506`). Ora l'ordine che il controllo
  misura e' l'ordine in cui le due domande davvero corrono: `566` e `720`. Il
  docblock dell'helper dice perche' la chiamata non e' li' dentro, cosi' che
  nessuno la ci rimetta per pulizia.
- **Commit:** `8a08fa2`

### 2. [Rule 2 — funzionalita' critica mancante] Un report dal drain non passa dal secondo braccio

- **Trovata durante:** il task 1, incrociando la forma richiesta con la tabella
  che il piano 35-12 ha **misurato in Postgres**.
- **Il fatto.** Il piano chiede il secondo braccio «se la chiamata di ruolo
  rifiuta». Applicato alla lettera, un **report dal drain** lo attraverserebbe
  per primo, e il secondo braccio chiede *«l'assegnazione e' viva ORA»*. La
  tabella di 35-12 mostra la riga esatta che si romperebbe: `granted_after_scan`
  giudicata al drain risulta **`live`**, cioe' un'ammissione sulla forza di
  un'assegnazione concessa **dopo** la scansione. Sarebbe una regressione di
  ASSIGN-03 introdotta da un piano su ASSIGN-01.
- **Cosa e' stato fatto:** la condizione del braccio e'
  `!auth.ok && !isQueuedReport`. Un report dal drain continua ad andare a
  `judgeAtScanTime` e da nessun'altra parte. Scritto nel punto 6 del docblock e
  accanto alla condizione, perche' e' esattamente il ramo che qualcuno
  «semplificherebbe».
- **Effetto collaterale voluto:** e' anche cio' che rende il bucket `blocked`
  irraggiungibile dal drain, e quindi la scelta del 403 difendibile.
- **Commit:** `8a08fa2`

### 3. [Rule 2] La terza causa viene dal campo grossolano invece che da un secondo giro sulle assegnazioni

- **Trovata durante:** il task 1, cercando come produrre «assegnato ma non a
  questa notte» senza due round trip in piu' su un percorso di rifiuto.
- **Il fatto.** La guardia, sul ramo `forbidden`, non porta ne' l'identita' ne'
  il motivo. La prima stesura prevedeva `getAccessContext()` **piu'** una lettura
  di `party_assignments`. Il payload che `getAccessContext()` gia' restituisce
  porta pero' `liveAssignmentCapabilities` — *«does this subject hold ANY live
  assignment, and for which trades?»* — che risponde alla domanda **in una sola
  chiamata**.
- **Cosa e' stato fatto:** una sola `getAccessContext()`, e solo sul ramo
  `forbidden`. `server.ts:161-183` dichiara quel campo **piu' largo del permesso
  reale** e vieta di decidere con esso: qui **non decide niente** — il verdetto
  e' della guardia sulla notte nominata — e classifica soltanto quale frase
  riceve il rifiuto. Un campo troppo largo e' precisamente lo strumento giusto
  per dire *«assegnato altrove, rifiutato qui»*.
- **E i suoi tre stati restano tre:** `null` (riga 14 non applicata) e'
  `door_night_unresolved`, **mai** l'insieme vuoto, che invece e' il fatto
  accertato *«nessuna assegnazione viva»*. Collassarli renderebbe una migration
  in ritardo indistinguibile da una persona che stasera non lavora — e la seconda
  frase e' quella che qualcuno legge davanti a una fila.
- **Commit:** `8a08fa2`

### 4. [dichiarata] Due cambi di comportamento sul percorso di rifiuto, nessuno sul percorso di ruolo

- **`namedNight` e' calcolato prima del `403`.** E' lo stesso predicato,
  carattere per carattere, che stava piu' in basso; il rifiuto per una notte
  assente o malformata resta **dov'era** e risponde **come rispondeva**. Per un
  chiamante `auth.ok` la sequenza osservabile e' identica: il blocco del `403` e'
  un no-op per lui.
- **Un chiamante rifiutato che nomina una notte non riceve piu' il `403` a quel
  punto**: prosegue al secondo braccio, che gli restituisce un `403` con una
  causa. Lo status non cambia; cambia il corpo. **E' il piano.**
- **Un file fuori da `files_modified`:** `35-HUMAN-UAT.md`, richiesto per nome
  dal task 2. I `files_modified` del frontmatter elencano solo la rotta.

Nessun gate di autenticazione incontrato.

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | **PASS** — nessun output |
| Build (che e' anche il typecheck di Next) | `npm run build` | **PASS** — `✓ Compiled successfully`, **exit 0** |
| Lint sul file toccato | `npx eslint src/app/api/tickets/checkin/route.ts` | **PASS** — nessun output, **zero** warning (il file non ne aveva e non ne ha) |
| La chiamata di ruolo esiste ancora, una sola volta | `grep -c 'await requireDoorOperator()'` | **PASS** — `1` |
| Il secondo braccio esiste, una sola volta | `grep -c 'requireDoorOperator({'` | **PASS** — `1` |
| L'ordine dei due call site | `grep -n` su entrambi | **PASS** — ruolo `566`, notte `720` |
| Tre costanti d'esito distinte | lettura, `:399-401` | **PASS** — tre valori, tre frasi, un `Record` |
| Nessun `503` sul percorso del secondo braccio | `grep -n '503'` | **PASS** — gli unici `{ status: 503 }` sono i due preesistenti (`:886` `judgeAtScanTime`, `:1005` `respond`) |
| Il bucket e' nominato accanto alla scelta | lettura, `:464-486` | **PASS** — `blocked` e `retry` nominati con le righe di `sync-manager.ts` |
| Nessun messaggio generico | `grep -i 'qualcosa e'` | **PASS** — nessun risultato |
| Il braccio di ruolo e' invariato | `git diff -U0` hunk headers | **PASS** — il primo hunk nell'handler parte da `-416`; l'handler apre a `344`, la guardia e' a `349` |
| La prova 11 nomina il piano | `grep -c '35-22'` su `35-HUMAN-UAT.md` | **PASS** — `3` |
| La finestra e' dichiarata | `grep -ci 'finestra'` | **PASS** — `8` |
| Nessuna cancellazione di file | `git diff --diff-filter=D` sui due commit | **PASS** — vuoto |
| Nessun file non tracciato lasciato | `git status --short` | **PASS** — vuoto dopo ogni commit |

### Cosa queste verifiche NON provano

- **Non esiste un test runner per il prodotto. Nessuna riga qui significa «i test
  passano».**
- **`public.my_access_context(uuid)` non esiste in produzione.** E' la riga 8
  della coda. Il verde del build non dice niente sul nome della funzione ne'
  sulla forma del payload: nessun client di questo repository e' parametrizzato
  con un generico `Database`, quindi sono stringhe che nessun compilatore
  controlla. **Finche' la riga 8 non e' applicata, ogni richiesta che raggiunge
  il secondo braccio riceve `door_night_unresolved`**, ed e' il comportamento
  voluto: il rifiuto di oggi, con una causa in piu'.
- **Nemmeno la riga 14 e' applicata**, quindi la distinzione fra le cause 1 e 2
  non e' oggi producibile: entrambe collasserebbero su `unresolved`, che e'
  l'esito onesto e non un difetto.
- **Nessun percorso HTTP e' stato esercitato.** Nessuna sessione, nessuna
  assegnazione seminata, nessuna scansione. La prova e' la procedura del task 2,
  ed e' **scritta, non eseguita**.
- **Nessun container e' stato toccato.** Le migration di questa fase non sono
  state applicate da qui, e il container Postgres presente e' condiviso con altri
  agenti dell'onda.

---

## Cross-plan — cose trovate fuori perimetro

`deferred-items.md`, `STATE.md` e `ROADMAP.md` **non sono stati toccati**
(contratto di questa onda). Vanno riportate a mano.

1. **Il ramo dei rimborsi non confronta la notte del soggetto con la notte
   nominata.** `checkin/route.ts:1133-1200` risponde `recorded` a un biglietto
   rimborsato **senza** verificare `refunded_party_id` / `refunded_event_id`
   contro `partyId` / `party.event_id`, mentre il ramo del biglietto vivo lo fa a
   `:1220-1221`. Conseguenza: un titolare rimborsato di un **altro evento** viene
   ammesso e registrato sulla notte in corso. **Preesistente**, identico per ogni
   ruolo, **non introdotto ne' allargato** da questo piano se non nel senso che
   una popolazione nuova (gli assegnatari) puo' ora raggiungerlo. Non corretto
   qui per due ragioni scritte: correggerlo per tutti cambierebbe il percorso di
   ruolo, che questo piano dichiara invariato; correggerlo solo per gli
   assegnatari creerebbe una porta a due velocita'. **Serve un piano che lo
   chiuda per tutti, e la decisione da prendere e' se un rimborsato di un altro
   evento vada ammesso e segnalato (l'asimmetria della porta) o rifiutato.**
2. **Il titolo sullo scanner non distingue ancora i tre rifiuti.**
   `ScannerClient.tsx:121-131` mappa lo status HTTP a un titolo **prima** di
   leggere il corpo, e i tre nuovi valori arrivano solo nella **frase di
   dettaglio**. E' lo stesso limite gia' registrato in `require-operator.ts:93-110`
   per `DOOR_SUPERVISION_REQUIRED` e attribuito al piano 35-13. Le tre costanti
   di questo piano si aggiungono alla stessa coda: chi tocca quel `switch`
   dovrebbe prenderle insieme.
3. **`liveAssignmentCapabilities` ha ora un secondo consumatore applicativo** —
   il primo era il middleware. Il campo e' dichiaratamente piu' largo del
   permesso; qui classifica un rifiuto e non concede. Chi lo tocchera' deve
   sapere che esiste un secondo lettore, e che quel lettore **dipende dai suoi
   tre stati**, `null` compreso.
4. **La prova 7 e la prova 11 sono due gate distinti** — il middleware e la rotta
   — e per ventuno piani sono state la stessa voce per omissione. La
   dichiarazione di copertura di `35-HUMAN-UAT.md` e' stata corretta di
   conseguenza.

---

## Threat Flags

Il threat register del piano, con come e' coperto:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-22-1 | **mitigata, e con il perimetro dichiarato** | La notte che autorizza, la notte che viene scritta e la notte contro cui il biglietto e' confrontato sono **lo stesso valore** (`const partyId`, `:697`), e quel confronto (`:1109-1110`) e' la regola di `bindNightToSubject` applicata **a ogni chiamante**. Aggiunto il controllo di accoppiamento a `:793`, inerte oggi e scritto perche' l'edit che lo romperebbe e' nominata. **Il ramo dei rimborsi resta scoperto**, e' preesistente, vale per ogni ruolo, ed e' registrato in Cross-plan con la ragione per cui non poteva essere chiuso qui |
| T-22-2 | **mitigata per costruzione** | Entrambe le chiamate esistono, e quella di ruolo viene prima nel file: `566` contro `720`, misurato. La mutazione che le unifica fa fallire il controllo. E il docblock di `readNightArm` toglie la ragione di provarci |
| T-22-3 | mitigata | Nessuna delle tre cause risponde 503. Il `grep` sul file trova `{ status: 503 }` solo nei due punti preesistenti. Il bucket (`blocked`) e' nominato accanto alla scelta con la riga di `sync-manager.ts` che lo produce, e l'alternativa rifiutata (`retry`) con il danno che avrebbe fatto |
| T-22-4 | mitigata | Il secondo braccio sta sotto `!auth.ok`. Il percorso di ruolo esce dal braccio 1 e non incontra nessuna riga nuova: il primo hunk del diff dentro l'handler parte 67 righe dopo la chiamata di guardia |
| T-22-5 | **dichiarata** | Il punto 6 del docblock di file e il docblock di `readNightArm` scrivono per esteso perche' unificare le due chiamate riporta T-22-2, e il controllo automatico fallisce. Non e' evitabile del tutto — e' il motivo per cui il controllo esiste |
| T-22-SC | non applicabile | Nessun pacchetto installato o modificato |

### Superficie di sicurezza nuova, dichiarata

- **Una chiamata d'autorizzazione in piu', su un solo percorso.** Solo quando il
  braccio di ruolo ha rifiutato **e** la richiesta non e' un report dal drain
  **e** una notte ben formata e' stata nominata. Una scansione di `master` o
  `organizer` non la raggiunge mai.
- **Una lettura del contesto d'accesso in piu', solo su un rifiuto reale.** Non
  viene fatta quando la guardia risponde `unresolved` — cioe' **mai oggi** — e
  serve solo a scegliere la frase.
- **Un chiamante autenticato ma senza titolo puo' ora far partire la risoluzione
  per-notte nominando un uuid qualsiasi.** Costo: la risoluzione stessa. Non
  legge `event_parties` con il client service (quel percorso e' dopo), e non
  rivela l'esistenza di una serata: un uuid inesistente e uno esistente ma non
  assegnato producono lo **stesso** corpo, `door_night_not_assigned`. Nessun
  rate limiting esiste in questo repository, il che era vero anche prima e resta
  da dire.
- **Tre categorie di log nuove** — `[door.night_arm_threw]`,
  `[door.night_arm_reason_unresolved]`, `checkin:night_grant_mismatch` — in un
  prodotto **senza error tracking**. Tutte e tre hanno un **effetto osservabile**
  e non solo una riga di log: producono un rifiuto con una frase che l'operatore
  legge sullo schermo, che e' l'unico osservatore che esiste
  (`meta-gates.md`). Detto invece di lasciar credere che qualcuno se ne
  accorgera'.

---

## Known Stubs

Nessuno stub di codice. Tre dipendenze in avanti, tutte scritte anche nei file
che le contengono:

1. **La riga 8 della coda non e' applicata**, quindi il secondo braccio risponde
   oggi sempre `door_night_unresolved`. E' la degradazione voluta: il
   comportamento di oggi, con una causa in piu'. **Quando la coda arriva,
   l'assegnatario inizia a scansionare senza che una riga cambi.**
2. **La riga 14 non e' applicata**, quindi le cause 1 e 2 non sono ancora
   producibili e collassano onestamente su `unresolved`.
3. **I tre valori di `status` non hanno ancora un lettore sul dispositivo.**
   Viaggiano perche' una classificazione sia un **valore** invece di doversi
   ricavare da una frase piu' tardi — la stessa posizione in cui
   `DOOR_SUPERVISION_REQUIRED` e' nato con il piano 35-11. La frase in `error`,
   quella si', arriva allo schermo come riga di dettaglio.

### Perche' `STATE.md`, `ROADMAP.md` e `deferred-items.md` non sono stati toccati

Contratto di questa onda: l'orchestratore li possiede dopo il merge. Il piano
35-20 gira in parallelo su `src/app/api/media/finalize/route.ts`, che non e'
stato ne' letto ne' toccato.

---

## Self-Check: PASSED

- `src/app/api/tickets/checkin/route.ts` — FOUND: il punto 6 del docblock
  (`:70`), le tre costanti (`:399-401`), `DOOR_NIGHT_ERROR` (`:410`),
  `NightArm` (`:425`), `refuseNight` (`:430`), `readNightArm` (`:506`),
  `namedNight` (`:642`), il `403` con la condizione allargata (`:655`),
  `const partyId = namedNight` (`:697`), `nightGrant` (`:711`), la chiamata
  per-notte (`:720`), il controllo di accoppiamento (`:793`), il ramo
  `nightGrant` nel giudizio (`:846`)
- `.planning/phases/35-per-night-assignments/35-HUMAN-UAT.md` — FOUND: la riga 11
  della tabella, la sezione *«Prova 11 — la scansione riceve la notte (piano
  35-22)»* con i tre casi, e la correzione alla dichiarazione di copertura
- commit `8a08fa2` — FOUND
- commit `537bc65` — FOUND
- `.planning/STATE.md`, `.planning/ROADMAP.md`,
  `.planning/phases/35-per-night-assignments/deferred-items.md`,
  `src/lib/door/require-operator.ts`, `src/lib/capabilities/server.ts`,
  `src/lib/offline/sync-manager.ts`,
  `src/app/(admin)/admin/scanner/ScannerClient.tsx`,
  `src/app/api/tickets/checkin/undo/route.ts` — **NON MODIFICATI**
- nessuna cancellazione di file in nessuno dei due commit
  (`git diff --diff-filter=D` vuoto su entrambi)
