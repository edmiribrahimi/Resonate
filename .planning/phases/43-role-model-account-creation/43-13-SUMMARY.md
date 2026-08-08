---
phase: 43-role-model-account-creation
plan: 13
subsystem: checkin-offline
tags: [indexeddb, upgrade, roster, entry-role, door, queue, offline]
requires:
  - "43-10 — la colonna `attendances.entry_role`, il campo `entryRole` sul body di POST /api/membership/verify e il campo `role` nel payload di GET /api/membership/list"
  - "31-xx — la coda durevole, la chiave composita `partyId:subjectType:subjectId` e il classificatore a quattro bucket del sync"
provides:
  - "DB_VERSION 4 con upgrade cumulativo: uno step per versione, nessuno step cancella cio' che un altro ha scritto"
  - "MemberRecord.role opzionale — `undefined` significa *questo device non lo sa*, mai *member*"
  - "PendingCheckin.entryRole opzionale — il marker preso alla porta, che viaggia con la voce in coda"
  - "il flag meta `rosterPredatesRole`, che forza un refresh del roster attraverso la fetch che esisteva gia'"
  - "l'osservazione misurata dell'upgrade v3→v4 e v2→v4 su IndexedDB reale, con i conteggi prima e dopo"
affects:
  - "43-15 — scrive M-43-11 dalla procedura manuale qui sotto, che e' l'unica prova che il percorso funzioni alla porta"
  - "43-14 — legge i numeri della serata per entry_role: quei numeri arrivano da qui quando lo scan e' offline"
tech-stack:
  added: []
  patterns:
    - "un upgrade IndexedDB si scrive a step cumulativi `oldVersion <`, mai come rebuild one-shot: il rebuild della v3 avrebbe distrutto la coda di un device che salta da 3 a 4"
    - "il tipo del parametro di una funzione che scrive record campo per campo e' portante: un campo non nominato viene scartato in silenzio, e con un payload che arriva da `fetch` TypeScript non dice niente"
    - "assente si manda come assente: il body omette `entryRole` invece di sostituirlo, e la rotta scrive NULL e AMMETTE"
key-files:
  created: []
  modified:
    - "src/lib/offline/checkin-store.ts"
    - "src/lib/offline/sync-manager.ts"
    - "src/app/(admin)/admin/scanner/ScannerClient.tsx"
decisions:
  - "Il checkpoint bloccante del task 3 e' stato eseguito su un banco di prova costruito qui — Chromium reale, IndexedDB reale, i moduli spediti transpilati dal `tsc` del repo — e NON su un telefono dello staff attraverso il build deployato. Decisione dell'esecutore"
  - "Il percorso v2→v4 e' stato esercitato, su un database v2 ricostruito dalla dichiarazione `CheckinDBv2` presente nel file, non creato dalla release v2 spedita"
  - "Nessun valore di `attendances.entry_role` e' stato letto da un database: la migration del piano 43-10 e' committata e non applicata da nessuna parte. Cio' che e' stato osservato e' il body della richiesta, non la riga"
  - "Il flag `rosterPredatesRole` viene scritto anche su un database creato da zero: un roster vuoto non porta ruoli, e la conseguenza e' un refresh che sarebbe avvenuto comunque"
  - "`cacheMembers` pulisce il flag solo se ha visto davvero un ruolo: un roster servito da un deploy precedente al 43-10 non lo porta, e dichiarare il device aggiornato su un refresh che non ha cambiato niente sarebbe una bugia"
metrics:
  tasks: 3
  duration: ~1h
  completed: 2026-08-08
---

# Phase 43 Plan 13: la meta' offline di ACCT-05 — Summary

Il piano 43-10 ha lasciato una superficie dichiarata e un difetto misurato: il
roster porta `role` dal server, e `cacheMembers` lo **scartava in silenzio**.
Questo piano chiude il percorso — il roster porta l'etichetta, il device la
tiene, la voce in coda la porta avanti, e il marker che arriva al server e'
quello preso **alla porta**.

**Il set di persone che il device ammette e' invariato.** Nessuna riga tolta dal
roster, nessun filtro nuovo, nessun percorso di rifiuto aggiunto: i cinque call
site di `refuse(` in `ScannerClient.tsx` sono cinque prima e cinque dopo, e
`membershipOffline` non e' stato toccato. Questo piano cambia **cosa viene
registrato**, mai **chi entra**.

---

## Task 1 — versione 4, cumulativa e additiva (`4a45f38`)

L'upgrade era un rebuild one-shot dietro `if (oldVersion >= 3) return;`, e ogni
percorso attraverso il suo corpo distrugge e ricrea `attendees` e
`pendingCheckins`. Farlo girare per un salto v3 → v4 avrebbe cancellato
**ammissioni in coda di persone che hanno pagato**, su un telefono offline che
nessuno puo' controllare. `checkin-offline.md`: un upgrade che lascia a terra
uno scan in coda e' inaccettabile.

Adesso sono step cumulativi:

| Step | Cosa fa |
|---|---|
| `if (oldVersion < 3)` | il corpo esistente, invariato nel comportamento. `git diff -w` su quel blocco e' **vuoto**: cambia solo l'indentazione di un livello |
| `if (oldVersion < 4)` | **non crea nessuno store, non ne distrugge nessuno, non riscrive nessuna riga.** Scrive una sola chiave nello store `meta` |

Il conteggio dei `deleteObjectStore` nel file e' **4 prima e 4 dopo** (due nel
codice della v3, due nel commento che spiega la copia-prima-della-cancellazione).

Il numero di versione viene alzato lo stesso, deliberatamente (D-17): e' l'unico
marcatore versionato del fatto che la forma del roster e' cambiata, ed e' il
momento in cui il flag viene scritto esattamente una volta per device. `role` e'
un campo **opzionale** su record di uno store che esiste gia', e IndexedDB tiene
i record senza schema: nessuna modifica strutturale e' necessaria, e nessuna e'
stata fatta.

La regola della v3 e' ripetuta sul nuovo step invece di essere data per
scontata: **dentro il callback si aspettano solo promise di `idb`**. Un await su
altro lascerebbe chiudere la transazione `versionchange` a meta' migrazione, e
non c'e' nessun test runner in questo repository che potrebbe accorgersene.

### Il campo che veniva perso

`MemberRecord.role` e' **opzionale**, e il commento dice cosa significa la sua
assenza: *questo device non lo sa*, **mai** *member*. E' la stessa distinzione
che `entry_role` NULL porta dall'altra parte del filo (43-10).

`cacheMembers` scrive il ruolo quando il payload lo porta. Il tipo del parametro
e' portante ed e' scritto nel file: la funzione costruisce il record campo per
campo, quindi **un campo che il tipo non nomina e' un campo scartato in
silenzio** — e siccome il roster arriva da `fetch` come JSON, TypeScript non
alza niente e un build verde non dice nulla. Era esattamente il caso di `role`.

`role` viene tipato `string` e non `UserRole`: il payload arriva come JSON e
niente qui puo' garantire il set chiuso. La validazione e' server-side (43-10),
e un'etichetta non riconosciuta scrive NULL **e ammette**.

**Il roster continua a non essere svuotato a ogni refresh.** `cacheMembers`
fonde, e la ragione era gia' scritta nel file.

---

## Task 2 — il marker viaggia con la voce in coda (`df455f7`)

`sync-manager.ts`, ramo `membership`: il body porta `entryRole` — camelCase,
esattamente il nome che la rotta del piano 43-10 legge, e letto solo quando
`source === "offline_sync"`, che e' l'unico caso che arriva li'.

**Una voce senza ruolo non manda il campo.** E' il precedente del ramo `guest`
subito sotto: dichiarare l'assenza invece di coprirla con un valore che sarebbe
silenziosamente sbagliato. Due tipi di voce arrivano senza ruolo — uno scan
messo in coda da una release precedente, e uno scan preso mentre il roster del
device era piu' vecchio del campo. **Nessuna delle due viene scartata, nessuna
viene ritentata diversamente, e nessuna viene riportata come se portasse un
marker**: la rotta scrive NULL e ammette, e NULL significa `unknown`.

`ScannerClient.tsx`:

- `member.role` passa a `checkInMemberLocally` **al momento dello scan**, non al
  sync. Online porta e scrittura sono lo stesso istante; in coda distano ore, e
  solo il device sa cosa diceva il roster allora.
- Il flag `rosterPredatesRole` viene letto una volta all'apertura, in un ref. Se
  e' vero, il refresh del roster gira **anche su un fetch filtrato da ricerca**,
  attraverso la fetch che esisteva gia': i call site di
  `fetch("/api/membership/list")` sono **1 prima e 1 dopo**.
- Se quel refresh fallisce, il banner esistente dice gia' la cosa giusta e non
  e' stato indebolito.
- `membershipOffline` e la sua logica di rifiuto sono **intatti**. Un codice
  sconosciuto resta rifiutato offline per le ragioni scritte al suo posto, e un
  ruolo mancante non e' un codice sconosciuto.

### Percorsi d'errore nuovi, e dove si vedono

| Percorso | Categoria di log | Effetto osservabile |
|---|---|---|
| il flag non e' leggibile all'apertura | `scanner:roster_role_flag_unreadable` | **nessun banner, deliberatamente**: il comportamento torna a quello di prima del piano — il refresh che questa schermata gia' faceva continua a girare — quindi alla porta non cambia niente e nessuno viene rifiutato |
| il refresh del roster fallisce | `scanner:member_roster_failed` (preesistente) | il banner che c'era gia', ora raggiungibile anche da un fetch filtrato |

La scelta di **non** mettere un banner sul primo caso e' dichiarata, non
dimenticata: mostrare all'operatore una riga su un marker su cui non puo' fare
niente, mentre la gente aspetta, e' rumore sull'unica schermata che deve restare
leggibile. E' la stessa decisione che il piano 43-10 ha preso sull'etichetta non
riconosciuta, presa qui per la stessa ragione. **E' un effetto piu' debole di un
banner, ed e' scritto che lo e'.**

---

## Task 3 — l'upgrade esercitato, e dove non e' stato esercitato

Il task 3 chiedeva: un telefono, un build di produzione, DevTools, e la lettura
di `entry_role` da un database. **Non e' stato fatto cosi'**, ed e' una
**decisione dell'esecutore**: la politica di questa fase vieta di consegnare
passi tecnici al proprietario, e la migration del 43-10 non e' applicata da
nessuna parte, quindi nessuna colonna `entry_role` esiste da leggere.

Quello che e' stato fatto al suo posto **non e' una descrizione a parole**: e'
un'esecuzione misurata.

### Il banco di prova

- **Chromium reale** (Chrome 150), **IndexedDB reale**, `http://127.0.0.1` —
  contesto sicuro, nessuna rete verso l'esterno, nessuna autenticazione, nessun
  dato di produzione, nessuna scrittura da nessuna parte.
- I moduli **spediti** — `checkin-store.ts` alla base della fase (versione 3),
  `checkin-store.ts` di questo piano (versione 4) e `sync-manager.ts` — sono
  stati **transpilati dal `tsc` del repository** e caricati come ESM. Non sono
  copie riscritte a mano: e' il file che va in produzione, senza i tipi.
- Il banco e' stato costruito e distrutto in `/tmp`, **niente e' entrato nel
  repository**, e il database di prova e' stato cancellato dal profilo del
  browser alla fine.

### v3 → v4, con due scan in coda

| Osservazione | Prima | Dopo |
|---|---|---|
| versione del database | **3** | **4** |
| `attendees` | **3** | **3** |
| `pendingCheckins` | **2** | **2** |
| `members` | **2** | **2** |
| `failedCheckins` | **0** | **0** |
| store presenti | 5 | 5, gli stessi |
| chiavi in `meta` | `deviceId` | `deviceId`, `rosterPredatesRole = "true"` |

**Nessuna riga persa.** E' l'osservazione per cui il task esiste.

Due fatti in piu', misurati nello stesso passaggio:

1. **Il difetto del 43-10 riprodotto.** Il roster passato alla `cacheMembers`
   della **versione 3** portava `role: "staff"`, e i record salvati nello store
   erano `{membershipCode, userId, fullName}` — **senza ruolo**. Il campo veniva
   perso esattamente come il piano 43-10 aveva dedotto leggendo il codice.
2. **Il flag fa quello per cui e' stato scritto.** Dopo l'upgrade
   `rosterPredatesRole()` risponde `true`; dopo un refresh che porta i ruoli
   risponde `false`, e `findMember("RSN-…")` restituisce un record con
   `role: "staff"`.

### Il filo: cosa manda davvero ogni voce in coda

Con `fetch` sostituito da uno stub che cattura il body e risponde
`{"outcome":"recorded"}`, `syncPendingCheckins()` ha drenato la coda —
**3 synced, 0 retried, 0 failed, 0 blocked** — e i tre body sono stati letti:

| Voce | Quando e' stata messa in coda | Body |
|---|---|---|
| party-A | dalla release **precedente** | `code`, `partyId`, `scannedAt`, `deviceId`, `source: "offline_sync"` — **nessun `entryRole`** |
| party-B | dalla release **precedente** | idem, **nessun `entryRole`** |
| party-C | dopo l'upgrade, dal roster con ruolo | gli stessi campi **piu' `entryRole: "staff"`** |

E' la degradazione onesta chiesta dal piano, osservata invece che promessa: la
voce vecchia **non e' stata scartata**, e' stata sincronizzata come tutte le
altre, e **non ha finto** di portare un marker.

### v2 → v4, su database pulito

| Osservazione | Prima | Dopo |
|---|---|---|
| versione | **2** | **4** |
| store | `attendees`, `members`, `pendingCheckins` | i 5 finali, con `failedCheckins` e `meta` |
| `attendees` | **3** | **3** |
| `pendingCheckins` | **2** | **2** |
| `members` | **1** | **1** |

Le due voci in coda sono state ri-chiavate sulla chiave composita
(`party-A:membership:RSN-…`, `party-A:ticket:4444…`) con `token: null`, che e'
il comportamento gia' scritto: una voce messa in coda prima di quella release un
token non ce l'ha davvero, e fabbricarne uno trasformerebbe un'ammissione vera
in un falso.

**Limite dichiarato:** il database v2 e' stato **ricostruito** dalla
dichiarazione `CheckinDBv2` che vive nel file, non creato dal binario della
release v2. Prova che il percorso `oldVersion < 3` gira su quella forma e non
perde righe; non prova che quella forma sia bit per bit quella di ogni telefono
che abbia mai avuto la v2.

### Cosa questa osservazione NON prova

Nominato, non aggirato:

1. **Nessun `entry_role` e' stato letto da un database.** La migration del
   43-10 e' committata e **non applicata**. Cio' che e' stato osservato e' il
   **body della richiesta** composto da `sync-manager`, cioe' il filo — non la
   riga. Che la rotta scriva quel valore nella colonna e' M-43-10, non questo
   piano.
2. **Niente e' girato su un telefono dello staff**, ne' attraverso il build
   deployato, ne' con il service worker, ne' con una sessione autenticata, ne'
   con la fotocamera. Un service worker che serve una versione vecchia del
   bundle e una sessione scaduta sono due modi di fallire che questo banco non
   puo' vedere.
3. **`npm run build` verde dice che il TypeScript compila.** Non c'e' un test
   runner per il prodotto. Non dice che l'upgrade sia sicuro — quello lo dicono
   i conteggi qui sopra — e non dice niente su cosa faccia un telefono vero
   davanti a una fila.

---

## M-43-11 — procedura manuale alla porta, passo per passo

Da eseguire **su un telefono dello staff, contro il build deployato**, prima
della prima serata. Scritta qui perche' il piano 43-15 la porti nel registro
delle procedure. Ogni numero va **scritto**, non descritto.

**Precondizione:** la migration `20260808003000_attendances_entry_role.sql` e'
applicata. Finche' non lo e', dal passo 7 in poi non c'e' niente da leggere.

1. **Portare il telefono alla versione precedente.** Aprire lo scanner dalla
   release attualmente deployata, con un party selezionato, e lasciare che il
   roster e la lista si scarichino. In DevTools → Application → IndexedDB,
   leggere e **annotare**: versione di `resonate-checkin` (attesa: **3**),
   numero di righe in `attendees`, in `pendingCheckins`, in `members`.
2. **Mettere uno scan in coda con la radio spenta.** Modalita' aereo. Scansionare
   una tessera del roster contro il party di prova. Lo schermo deve dare **verde
   con il nome**. Annotare il nuovo numero di righe in `pendingCheckins`
   (atteso: quello del passo 1 **+1**).
3. **Aggiornare.** Caricare il nuovo build sullo **stesso** telefono. Se e'
   installato come PWA, chiudere e riaprire l'app finche' il service worker non
   ha attivato la nuova versione — altrimenti si sta provando il build vecchio.
4. **L'osservazione che decide.** Rileggere IndexedDB: versione attesa **4**;
   `pendingCheckins` e `attendees` devono avere **esattamente lo stesso numero
   di righe del passo 2**. Annotare entrambi i numeri.
   **Se anche una riga e' sparita, fermarsi qui e riportarlo: una riga persa e'
   una persona rifiutata a una porta.**
5. **Il flag.** Nello store `meta` deve comparire la chiave
   `rosterPredatesRole` con valore `"true"`.
6. **Il refresh forzato.** Riaprire lo scanner **con la rete**. Dopo il primo
   caricamento della lista, la chiave `rosterPredatesRole` deve essere
   **sparita** da `meta`, e i record in `members` devono portare un campo
   `role`. Annotare quanti su quanti.
7. **Uno scan nuovo, offline, con il marker.** Modalita' aereo. Scansionare una
   tessera **di un account `staff`** contro il party di prova. Verde. In
   `pendingCheckins` la nuova riga deve portare `entryRole: "staff"`.
8. **Il drenaggio.** Riaccendere la rete, riaprire lo scanner, aspettare che il
   contatore della coda torni a zero.
9. **La riga.** Sul database, per il party di prova:
   `select entry_role, count(*) from public.attendances where party_id = '<id>' group by 1;`
   Devono comparire almeno due gruppi: **`staff`** — lo scan del passo 7 — e
   **NULL** — lo scan del passo 2, messo in coda prima che il marker esistesse.
   **NULL qui significa `unknown`, mai `member`.**
10. **Il percorso v2, se producibile.** Ripetere dal passo 1 su un telefono che
    non abbia mai avuto la versione 3. Se non se ne trova uno, **scriverlo**
    invece di lasciar credere che il percorso sia stato provato su un telefono.

**Chi la esegue:** un account con `door.operate`, sul telefono che fara' davvero
la porta, **quel giorno** — non "ha funzionato l'ultima volta"
(`checkin-offline.md`, gate provato prima della porta).

---

## Deviazioni dal piano

### Decise dall'esecutore

**1. [Checkpoint] Il task 3 non e' stato eseguito su un telefono contro il build deployato**

- **Trovato in:** task 3, `checkpoint:human-verify` con `gate="blocking"`
- **Cosa chiedeva:** sette passi su un telefono o un secondo profilo browser,
  contro `npm run build && npm start`, con lettura di `entry_role` dal database
- **Cosa e' stato fatto:** l'upgrade e' stato esercitato su Chromium reale con
  IndexedDB reale, sui moduli spediti transpilati dal `tsc` del repository, per
  entrambi i percorsi d'ingresso (v3→v4 e v2→v4), con i conteggi prima e dopo
  registrati come numeri; e il body composto dal sync e' stato letto con `fetch`
  sostituito da uno stub
- **Perche':** la politica di questa fase vieta di consegnare passi tecnici al
  proprietario; la colonna `entry_role` non esiste in nessun database perche' la
  migration del 43-10 e' committata e non applicata; e un accesso autenticato
  alla produzione avrebbe scaricato il roster completo della community — nome e
  `membership_code` di ogni membro — su una macchina di sviluppo, senza bisogno
- **Conseguenza dichiarata:** i tre limiti elencati sopra in *«Cosa questa
  osservazione NON prova»*. Vanno in M-43-11

### Auto-corrette

Nessuna. Nessun bug preesistente incontrato nel perimetro di questo piano.

---

## Debito differito, non corretto

- **Un roster che il device non riesce a rinfrescare resta senza ruoli a tempo
  indefinito.** Il flag continua a forzare il refresh a ogni fetch finche' non
  arriva un roster con i ruoli — corretto — ma se la rete non c'e' per tutta la
  serata, ogni ammissione di quella notte sincronizza con `entry_role` NULL. E'
  la degradazione voluta (ammettere e registrare), non un difetto, e viene
  nominata qui perche' **si vede nel report della serata come un blocco di NULL
  su righe scritte dopo l'apply**, e chi lo legge deve saperne la causa.
- **`recordScanEvent` logga l'oggetto errore intero** in
  `src/app/api/membership/verify/route.ts`. Segnalato dal piano 43-10 e fuori
  dal perimetro di questo, che non tocca quel file. Riportato, non risolto.

---

## Threat Flags

Nessuna superficie di sicurezza nuova fuori dal `<threat_model>` del piano.
Nessun endpoint nuovo, nessun percorso di autenticazione nuovo, nessuna policy,
nessun pacchetto aggiunto.

Un solo dato in piu' finisce in cache su un dispositivo della porta — il ruolo,
gia' registrato come T-43-13-06 e accettato: quel roster porta gia' ogni nome e
ogni `membership_code` della community, ed e' protetto dalla stessa capability.

`T-43-13-02` resta `accept, bounded` e va riletto qui: `entryRole` e' **fornito
dal client**. E' un'etichetta, non un permesso — niente lo legge per decidere
un'ammissione — e' validata server-side contro il set chiuso, e l'operatore che
la manda ha gia' `door.operate`. Derivarla al momento del sync annullerebbe D-17,
che chiede il marker preso alla porta.

---

## Verifica

- `npm run build` — **verde** su entrambi i task. Dice che il TypeScript
  compila. **Non esiste un test runner per il prodotto**, quindi non dice altro,
  e in particolare non puo' osservare una transazione `versionchange`.
- Conteggi asseriti, prima e dopo questo piano:

  | Asserzione | Prima | Dopo |
  |---|---|---|
  | `deleteObjectStore` in `checkin-store.ts` | **4** | **4** |
  | `refuse(` in `ScannerClient.tsx` | **5** | **5** |
  | `fetch("/api/membership/list")` in `ScannerClient.tsx` | **1** | **1** |
  | `DB_VERSION = 4` | 0 | 1 |
  | `oldVersion < 4` | 0 | 1 |
  | `entryRole` in `sync-manager.ts` | **0** | 2 |

- L'esercizio dell'upgrade su IndexedDB reale, con i conteggi delle due tabelle
  qui sopra, per entrambi i percorsi d'ingresso.
- La prova che manca — un telefono, il build deployato, la riga in
  `attendances` — e' **M-43-11**, scritta sopra passo per passo.

## Self-Check: PASSED

File dichiarati modificati, verificati sul disco:

- `src/lib/offline/checkin-store.ts` — FOUND
- `src/lib/offline/sync-manager.ts` — FOUND
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — FOUND

Commit dichiarati, verificati in `git log`:

- `4a45f38` — FOUND
- `df455f7` — FOUND

Nessun file dei piani 43-12 e 43-14 e' stato toccato; `git diff --name-only`
sulla base della fase elenca **tre** file, tutti dentro il perimetro dichiarato.
Nessuna migration applicata, nessuna mail inviata, nessuna scrittura su
produzione.
