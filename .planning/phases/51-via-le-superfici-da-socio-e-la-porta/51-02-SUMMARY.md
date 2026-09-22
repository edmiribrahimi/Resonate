---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 02
subsystem: checkin-offline
tags: [indexeddb, idb, service-worker-adjacent, scanner, door, offline-queue, typescript]

# Dependency graph
requires:
  - phase: 50-via-le-iscrizioni
    provides: "nessuno si iscrive piu': il codice socio non viene piu' coniato per nuovi account, e P-50-8 ha misurato la porta a radio spenta sullo stesso codice"
  - phase: 35-per-night-assignments
    provides: "la coda offline con i suoi passi cumulativi (v4, v5), il verdetto per serata in `meta`, l'annullamento marcato invece che cancellato"
provides:
  - "Lo scanner non riconosce piu' un codice `RSN-...`: cade nel rifiuto del codice sconosciuto, senza messaggio dedicato (D-51-01)"
  - "La coda offline passa a IndexedDB v6 e scarta PER CHIAVE solo le voci `membership`, lasciando intatte `ticket` e `guest` (D-51-11)"
  - "`QueuedSubjectType` a due membri, quindi il drenaggio e' esaustivo su due rami e un terzo non e' scrivibile"
  - "`DoorSubjectType` resta a tre membri, con `'membership'` dichiarato valore storico da leggere (D-51-13)"
  - "L'annullamento alla porta perde il ramo socio: `public.attendances` non ha piu' lettori nel prodotto"
affects: [51-03, 51-07, 51-12, 51-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Passo di aggiornamento IndexedDB che rompe deliberatamente una proprieta' dichiarata da un passo precedente, e lo scrive accanto invece di lasciarlo scoprire"
    - "Un'unione ristretta (`QueueableSubjectType`) come guardia di scrittura, accanto a un'unione intera (`DoorSubjectType`) come vocabolario di lettura"

key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/scanner/ScannerClient.tsx"
    - "src/lib/offline/checkin-store.ts"
    - "src/lib/offline/sync-manager.ts"
    - "src/lib/door/outcome.ts"
    - "src/lib/door/classify.ts"
    - "src/app/api/tickets/checkin/undo/route.ts"

key-decisions:
  - "Lo store `members` e la costante della chiave meta restano DICHIARATI perche' il passo v3 crea lo store e il v4 scrive la chiave: un passo gia' eseguito sui dispositivi non si riscrive. Il passo v6 li rimuove in avanti."
  - "Il `case \"membership\"` di `sync-manager.ts` e' stato tolto nel commit del task 2 invece che in quello del task 3, perche' il `switch` e' esaustivo sull'unione ristretta e senza quella riga il build sarebbe rimasto rosso fra i due commit."
  - "`LegacyQueuedSubjectType` dichiara la vecchia unione a tre membri come verita' sui DATI dei dispositivi, cosi' il passo v6 puo' cercare cio' che il tipo corrente nega."

patterns-established:
  - "Rimozione per chiave, mai per riscrittura: il passo v6 cancella solo le voci del tipo rimosso e non rilegge ticket e guest per riscriverli — cancellare per chiave, se sbaglia, trova troppo poco, mai troppo"
  - "Un valore storico si dichiara nel commento del tipo che lo conserva, nella forma gia' usata da `MembershipAct`, e la sua non-scrivibilita' si garantisce con un SECONDO tipo, non con la prosa"

requirements-completed: [MEM-03]

# Metrics
duration: 42min
completed: 2026-09-22
---

# Phase 51 Plan 02: La porta lato client perde il ramo socio — Summary

**Lo scanner smette di riconoscere un codice `RSN-...`, la coda offline passa a IndexedDB v6 scartando per chiave solo le sue voci `membership` con una riga sola di log, e l'annullamento alla porta perde il ramo che cancellava una presenza da `public.attendances`.**

## Performance

- **Duration:** ~42 min
- **Started:** 2026-09-22T13:02Z (circa)
- **Completed:** 2026-09-22T13:44:31Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- **Lo scanner non ha piu' un ramo socio.** Via i due pattern, `membershipOnline`, `membershipOffline`, `extractMembershipCode`, il ramo del dispatch, il blocco che scaricava il roster da `/api/membership/list` e l'avviso appiccicoso «The member list on this device was NOT refreshed». Un codice della forma `RSN-...` cade nel rifiuto del codice sconosciuto e **non riceve un messaggio proprio** (D-51-01): `NOT_VALID_MESSAGE` resta l'unico vocabolario, nessuna stringa nuova.
- **La coda e' a due tipi, e l'aggiornamento non stranda nulla di cio' che resta.** `DB_VERSION` 5 → 6, con un passo `if (oldVersion < 6)` che apre `pendingCheckins` e `failedCheckins`, **cancella per chiave** solo le voci del tipo rimosso contandole, lascia intatte `ticket` e `guest`, e solo dopo distrugge lo store `members`. Una riga sola, `console.warn("checkin-store:v6_dropped_membership_entries", { count })`: categoria e conteggio, nessun identificativo, nessuna superficie (D-51-11, T-51-09).
- **Il registro della porta resta leggibile.** `DoorSubjectType` conserva i suoi tre membri e il `CHECK` SQL non e' stato toccato (D-51-13): la migration `20260805120000_door_scan_events.sql` non compare nel diff di questo piano, quindi la regola dello specchio non e' violata — nessuno dei due insiemi cambia.
- **`public.attendances` non ha piu' lettori nel prodotto.** Il ramo dell'annullamento che la leggeva e la **cancellava** e' uscito, insieme al campo `attendanceId` del corpo. I rami biglietto e guest list sono invariati nel diff.

## Task Commits

1. **Task 1: Lo scanner smette di riconoscere un codice socio** — `17a3e1a` (feat)
2. **Task 2: La coda passa a v6 e scarta le voci membership, per chiave** — `8c2d94a` (feat)
3. **Task 3: Il drenaggio e l'annullamento perdono il ramo socio** — `ce937c6` (feat)

## Files Created/Modified

- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — la porta lato client: nessun pattern, nessun ramo, nessun roster; `lastFetchAtRef` resta scritto sul percorso riuscito di `fetchAttendance` (`:1258`), che e' cio' su cui 51-07 costruisce l'avviso derivato di D-51-10
- `src/lib/offline/checkin-store.ts` — v6, unione ristretta, store e helper del roster rimossi
- `src/lib/offline/sync-manager.ts` — il drenaggio conosce due rami; `case "guest"` verso `POST /api/tickets/attendance` identico
- `src/lib/door/outcome.ts` — `DoorSubjectType` intera, con il commento che dichiara il terzo membro storico
- `src/lib/door/classify.ts` — potati i commenti che descrivevano un ramo vivo; la lettura del valore storico resta
- `src/app/api/tickets/checkin/undo/route.ts` — due rami, non tre

## Decisions Made

1. **Lo store `members` e `ROSTER_PREDATES_ROLE_KEY` restano dichiarati.** Il piano chiedeva di cancellarli **e** che i blocchi v3, v4 e v5 restassero invariati. I due requisiti sono incompatibili: il passo v3 esegue `db.createObjectStore("members", …)` e il v4 scrive quella chiave `meta`, e `idb` tipizza entrambe le chiamate sull'interfaccia dello schema. Risolto verso il piu' restrittivo (`meta-gates.md`): **un passo gia' eseguito sui dispositivi non si riscrive**, quindi lo store resta dichiarato — con un docblock che dice che e' storico — e il passo v6 lo distrugge, dopo aver finito con la coda. La chiave `meta` del v4 viene cancellata dal v6 per la stessa ragione: si rimuove in avanti, non a ritroso.
2. **Il `case "membership"` di `sync-manager.ts` e' uscito nel commit del task 2.** Il `switch` e' esaustivo sull'unione ristretta dal task 2: lasciarlo per il task 3 avrebbe significato un commit rosso in mezzo. Rule 3 (blocco), dichiarata nel messaggio di commit.
3. **`LegacyQueuedSubjectType` e' dichiarato invece di essere aggirato.** Il tipo corrente nega il terzo valore; i **dati su un telefono** lo contengono ancora. La vecchia unione e' scritta come tale, e il confronto dentro il passo v6 passa per `string` — dice ad alta voce che si sta cercando qualcosa che il tipo non nomina, invece di riallargare l'unione.
4. **`rekeyPending` copia il tipo legacy com'e', con un cast e il suo commento.** Il passo di copia non decide nulla su una riga: la riscrittura di un tipo li' sarebbe una decisione presa nel punto in cui il compito e' non perdere niente. Decide il v6, per chiave, dopo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `case "membership"` rimosso da `sync-manager.ts` dentro il commit del task 2**
- **Found during:** Task 2
- **Issue:** Restringere `QueuedSubjectType` rende il `case` un errore di tipo: `npm run build` esce 1 (`sync-manager.ts:369: Type '"membership"' is not comparable to type 'QueuedSubjectType'`). Il piano assegna quel file al task 3, ma pretende anche un build verde alla fine del task 2.
- **Fix:** Il `case` e i suoi quattro paragrafi di commento sono stati tolti nel commit del task 2, con il commento che spiega perche' il `switch` esaustivo e' la garanzia della rimozione. Il resto del task 3 (`outcome.ts`, `classify.ts`, l'annullamento) e' rimasto nel proprio commit.
- **Files modified:** `src/lib/offline/sync-manager.ts`
- **Verification:** `npm run build` → EXIT=0 dopo il commit del task 2; `grep -c 'case "membership"' src/lib/offline/sync-manager.ts` → 0
- **Committed in:** `8c2d94a`

**2. [Rule 2 - Missing critical] Guardia di scrittura esplicita: `QueueableSubjectType`**
- **Found during:** Task 2
- **Issue:** `QUEUE_TYPE_BY_SUBJECT` e' un `Record` **totale** su `DoorSubjectType`, che D-51-13 tiene a tre membri. Restringere solo la coda avrebbe lasciato una voce `membership` nella mappa senza una destinazione valida — cioe' un percorso di scrittura verso un tipo che non esiste piu'.
- **Fix:** Introdotto `type QueueableSubjectType = Exclude<DoorSubjectType, "membership">`, su cui la mappa e' totale, e `checkInLocally` ristretta a quel tipo. La distinzione «leggibile ma non scrivibile» smette di essere una frase in un commento e diventa un tipo.
- **Files modified:** `src/lib/offline/checkin-store.ts`
- **Verification:** `npm run build` → EXIT=0; i due chiamanti passano `"ticket"`
- **Committed in:** `8c2d94a`

**3. [Rule 1 - Documentazione datata] Tre citazioni di `/api/membership/verify` riscritte**
- **Found during:** Task 1 e 2
- **Issue:** `ScannerClient.tsx` (docblock dei lettori del corpo), `checkin-store.ts` (docblock di `CachedDoorAuth`) e `classify.ts` (`subjectKey`) citavano quella rotta come esempio o fonte. La rotta esce nel piano 51-03: una citazione di un indirizzo che nessuno puo' chiamare e' esattamente cio' che `ai-engineering.md` chiama documentazione datata.
- **Fix:** La **proprieta'** e' stata enunciata al posto dell'indirizzo, dicendo accanto perche' l'indirizzo non c'e' piu'.
- **Files modified:** `src/app/(admin)/admin/scanner/ScannerClient.tsx`, `src/lib/offline/checkin-store.ts`, `src/lib/door/classify.ts`
- **Verification:** lettura del diff; `npm run build` → EXIT=0
- **Committed in:** `17a3e1a`, `8c2d94a`, `ce937c6`

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 missing critical, 1 dated documentation)
**Impact on plan:** Nessun allargamento di perimetro. I sei file toccati sono esattamente quelli di `files_modified`; nessuna migration e nessun file dei piani 51-03 e 51-04 e' nel diff.

## Issues Encountered

**Un conflitto reale fra due requisiti del piano, non un ostacolo tecnico.** Il task 2 chiedeva di cancellare lo store `members` e `ROSTER_PREDATES_ROLE_KEY` e, nello stesso respiro, che i blocchi v3/v4/v5 non comparissero nel diff. Il primo requisito e' prosa, il secondo e' verificabile — e il secondo protegge l'invariante piu' pesante del file: *un passo di aggiornamento gia' eseguito non si riscrive*. Risolto tenendo i due simboli **dichiarati come storici** e rimuovendoli in avanti dal passo v6. Verificato che nessun hunk del diff cade nell'intervallo dei tre blocchi (`git diff -U0` → il primo inserimento e' a `-595,0 +649,95`, cioe' dopo la chiusura del v5).

## Verification Evidence

- `npm run build` (typecheck di Next incluso) → **EXIT=0** dopo ogni task. Ultimo run su HEAD `ce937c6`.
- `npm run verify:scan-legibility` → **EXIT=0**, `SCAN_LEGIBILITY_OK` (questo piano non tocca `ScanFlash.tsx`).
- `grep -c "MEMBERSHIP_PATTERN\|membershipOnline\|membershipOffline\|api/membership/list\|rosterPredatesRole" ScannerClient.tsx` → **0**.
- `grep -n "lastFetchAtRef.current = performance.now()" ScannerClient.tsx` → **una riga**, `:1258`, raggiungibile dal percorso riuscito di `fetchAttendance` (ogni ramo di fallimento fa `return` prima).
- `grep -c "DB_VERSION = 6"` → 1 · `grep -c "oldVersion < 6"` → 1 · `grep -c "checkin-store:v6_dropped_membership_entries"` → **1** (una sola riga di log nel file).
- `grep -c "cacheMembers\|findMember\|checkInMemberLocally\|rosterPredatesRole" checkin-store.ts` → **1, non 0**, ed e' il **valore stringa** della chiave `meta` (`const ROSTER_PREDATES_ROLE_KEY = "rosterPredatesRole"`). Quella stringa e' **dato su dispositivi reali**: cambiarla renderebbe orfana la chiave che il passo v6 deve cancellare. Il nome della *funzione* rimossa non compare piu' da nessuna parte. Non e' stata riscritta per far passare un grep — `checkin-store.ts` porta scritto in casa la regola opposta: *rewrite the prose, never weaken the check*.
- `grep -c 'case "membership"' sync-manager.ts` → **0**; i rami `ticket` e `guest` invariati nel diff.
- `git diff --name-only` contro la base: **sei file**, nessuna migration.
- **Dentro la callback `upgrade` non c'e' alcun `await` su una promessa che non sia `idb`** (letto sul diff): il passo v6 attende solo `getAll`, `delete` sugli store e `delete` su `meta`; `console.warn` non e' un `await`, ed e' per questo che puo' stare dentro senza indebolire la regola (T-51-06).

### Cio' che NON e' verificato qui, e va detto

- **Nessun test runner esiste per il prodotto**: il verde di `npm run build` e' un typecheck, non una prova di comportamento. Il passo v6 **non e' stato eseguito**: nessuna macchina in questo repository puo' aprire un IndexedDB v5 con una coda non vuota.
- **La prova e' `P-51-1`, al telefono, a radio spenta**, con la precondizione che solo la corsa «prima» puo' produrre: un codice socio scansionato offline e **lasciato in coda senza drenarla** (D-51-16). E' l'unica cosa che dopo l'aggiornamento non si puo' piu' costruire. Il passo 9 di quella procedura e' cio' che misura T-51-05.
- `grep -rn 'from("attendances")' src` → **due righe, non zero**, entrambe in `src/app/api/membership/verify/route.ts` (`:528` INSERT, `:562` SELECT). E' lo **scrittore**, e esce con la rotta nel piano **51-03**, in parallelo su questa stessa onda: il criterio «zero righe» del piano si chiude alla fusione dell'onda, non qui. Il **lettore** e' uscito qui.

## Known Stubs

Nessuno. Niente e' stato lasciato a mezzo: i percorsi rimossi non hanno un segnaposto e non hanno una superficie che dica «coming soon».

## Threat Flags

Nessuna superficie nuova. Il piano **rimuove** superficie: un endpoint in meno interrogato dal client, uno store in meno di dati personali a riposo su un telefono che non controlliamo, e un percorso di `DELETE` in meno su una tabella di presenze.

## Debito dichiarato, con il nome di chi lo chiude

- **La frase del rifiuto dice ancora «member».** `NOT_VALID_MESSAGE.unknown_code` e' *"No ticket or member matches this code"*. Resta vera (nulla ha corrisposto) e D-51-01 vieta un messaggio **nuovo**, non impone di riscrivere quello esistente — ma la parola e' lessico invecchiato su una schermata che si legge davanti a una fila. **Non e' stata toccata qui**: riscrivere una frase della porta e' lavoro del piano **51-07**, che sta gia' rifacendo l'avviso della lista (D-51-10), e due agenti che riscrivono lo stesso file in parallelo sono la cosa che `ai-engineering.md` chiede di sequenziare.
- **`public.attendances` senza scrittori ne' lettori** dopo la fusione dell'onda: la chiude il piano **51-12** / **D-51-14**, con la disciplina di D-51-04 per intero.

## User Setup Required

Nessuna configurazione esterna. Nessun pacchetto installato: `package.json` non cambia (T-51-SC).

## Next Phase Readiness

- **Per 51-07:** `lastFetchAtRef` (`:1042`), `listAgeMs` e `listIsStale` sono intatti e il blocco roster che stava in mezzo non c'e' piu'. L'avviso derivato di D-51-10 ha il terreno pulito.
- **Per 51-03:** lato client nessuno chiama piu' `/api/membership/list` ne' `/api/membership/verify`. La rotta puo' uscire senza lasciare un chiamante orfano.
- **Per 51-12:** `public.attendances` perde il suo ultimo lettore qui.
- **Blocco che resta, ed e' la ragione di MEM-04:** la prova a rete spenta non e' sostituibile da niente di cio' che e' scritto sopra. Un telefono con una coda non vuota e' l'unico posto dove il passo v6 esiste davvero.

## Self-Check: PASSED

- I sei file dichiarati come modificati esistono, e sono esattamente i sei di `files_modified`.
- I tre hash citati esistono nella history di questo worktree: `17a3e1a`, `8c2d94a`, `ce937c6`.
- Nessun file cancellato nel diff contro la base `e05d098`; nessun file non tracciato lasciato indietro.

---
*Phase: 51-via-le-superfici-da-socio-e-la-porta*
*Completed: 2026-09-22*
