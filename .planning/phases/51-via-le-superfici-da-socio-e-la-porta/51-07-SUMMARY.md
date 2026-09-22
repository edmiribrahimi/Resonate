---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 07
subsystem: checkin-offline
tags: [scanner, door, ui, sticky-header, derived-state, accessibility, react]

# Dependency graph
requires:
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 02
    provides: "il ramo socio fuori dallo scanner, `lastFetchAtRef` scritto solo sul percorso riuscito di `fetchAttendance`, e la frase `unknown_code` lasciata deliberatamente a questo piano"
  - phase: 50-via-le-iscrizioni
    provides: "`deferred-items.md` §7 — la decisione del proprietario sullo schermo senza nome, con i suoi costi dichiarati"
  - phase: 42-design-system
    provides: "`scripts/verify-scan-legibility.mjs`, che misura le tinte del flash invece di asserirle"
provides:
  - "Il verdetto della porta e' opaco: niente lista e niente «Scanner paused» che traspaiono"
  - "Il titolo del flash e' l'ESITO, mai un nome; il sottotitolo e' tipo di biglietto piu' provenienza (D-51-05)"
  - "Il fatto di `already_recorded` — ora e dispositivo/operatore — resta al suo posto"
  - "L'avviso della lista e' uno stato CALCOLATO da `listAgeMs`/`listIsStale`, dice «guest list» e si spegne da solo (D-51-10)"
  - "La testata e' spezzata: barra fissa con titolo e «QR Scan», resto che scorre"
  - "`NOT_VALID_MESSAGE.unknown_code` non dice piu' «member»"
affects: [51-12, 51-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Un avviso derivato al posto di un avviso spinto in un array: non puo' restare acceso quando cio' che descrive e' falso, perche' non e' uno stato ma una funzione"
    - "Una testata `sticky` spezzata in due livelli, con il criterio dell'altezza scritto accanto perche' il difetto e' invisibile su un laptop"
    - "La prosa si riscrive per non rompere il grep che la sorveglia — mai il contrario (`checkin-store.ts`, «rewrite the prose, never weaken the check»)"

key-files:
  created: []
  modified:
    - "src/components/scanner/ScanFlash.tsx"
    - "src/app/(admin)/admin/scanner/ScannerClient.tsx"
    - "scripts/verify-scan-legibility.mjs"

key-decisions:
  - "Il nome esce dal TITOLO del flash e resta nella lista della serata, nella cronologia delle scansioni e nella conferma dell'annullamento: quelle sono superfici che qualcuno consulta o sceglie, non un verdetto che lampeggia su una persona davanti a una fila."
  - "La pastiglia Online/Offline e la freccia indietro restano dentro la barra fissa: stanno sulla riga del titolo e non aggiungono altezza, e il criterio della barra e' l'altezza, non il conteggio degli elementi."
  - "L'avviso della guest list e' un SECONDO elemento accanto alla fascia di staleness, non una frase piegata dentro di essa: le due si accendono in momenti diversi e un elemento solo dovrebbe portare due condizioni, mentendo su una."
  - "`NOT_VALID_MESSAGE.unknown_code` riscritta: non e' una stringa di rifiuto nuova, e' la stessa nel lessico che il prodotto ha ancora."

patterns-established:
  - "Quando un commento deve citare il valore che un gate vieta, si descrive invece di citarlo, sul precedente di `reportServerFault` — tre volte in questo piano"

requirements-completed: [MEM-03]

# Metrics
duration: 35min
completed: 2026-09-22
---

# Phase 51 Plan 07: Le tre osservazioni dal laboratorio, riparate — Summary

**Il verdetto della porta diventa opaco e smette di dire chi e' — titolo =
esito, sottotitolo = tipo di biglietto e provenienza, con il fatto di
`already_recorded` intatto; l'avviso della lista diventa uno stato calcolato che
dice «guest list» e si spegne quando la lista e' fresca; la testata si spezza in
una barra fissa che porta titolo e «QR Scan» e un resto che scorre.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-22T14:20Z (circa)
- **Completed:** 2026-09-22T14:54Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

### 1. L'esito e' opaco, e il titolo e' l'esito

- **I tre sfondi perdono l'alpha.** `bg-green-500`, `bg-sem-done`, `bg-red-600`,
  senza `/90`. Era l'alpha a lasciar trasparire «Scanner paused» e le righe
  della lista attraverso il verdetto — cio' che il proprietario ha visto in
  laboratorio. **Le tre durate non sono toccate** (1500 / 2500 / 2000): il
  dwell e' informazione e non era il difetto; il diff di `ScanFlash.tsx` non
  contiene la stringa `delay` (`git diff -U0 | grep -c delay` → 0).
- **Nessun chiamante di `showFlash` passa piu' un nome come titolo.** Undici
  chiamanti riscritti: il titolo e' `Admitted`, `Already recorded`, `Check-in
  undone`, `Undone on this device`, o il motivo del rifiuto preso da
  `NOT_VALID_MESSAGE`. **Zero stringhe di rifiuto nuove.**
- **Il sottotitolo porta il tipo e la provenienza.** Introdotto
  `ticketKindLabel(type, tierName)` — un solo posto decide come si nomina il
  tipo, e **per costruzione non puo' nominare una persona**: prende un tipo di
  soggetto e un tier, e nessuno dei due e' un nome.
- **Il fatto di `already_recorded` resta.** Ora e dispositivo/operatore, online
  (`recordedFact(at, operatorLabel)`) e offline (`${fact} · Offline`). E' il
  costo che `deferred-items.md` §7 nomina esplicitamente — l'unico appiglio per
  distinguere due letture ravvicinate — ed esce il nome, non il fatto.
- **`NOT_VALID_MESSAGE.unknown_code`**: *«No ticket or member matches this
  code»* → *«No ticket matches this code»*. Nessuno ha una card (MEM-03),
  quindi il sostantivo nominava una cosa che questa porta non puo' vedere.
  51-02 l'aveva lasciata a questo piano di proposito, perche' una frase della
  porta la riscrive un piano solo.

### 2. L'avviso della lista e' derivato, e dice «guest list»

- **Il difetto, nominato.** `setCacheNotices` si raggiunge **solo** da un giro
  di `fetchAttendance` arrivato fino in fondo; i tre rami di fallimento fanno
  `return` prima. Un avviso spinto in quell'array, una volta acceso, restava
  acceso — anche accanto al badge «Online», su una lista appena scaricata.
- **La riparazione.** `guestListWarningText(listAgeMs)` piu' una condizione di
  render `listAgeMs === null || listIsStale`. **Nessun flag booleano nuovo**: la
  macchina esisteva gia' (`lastFetchAtRef` → `listAgeMs` → `listIsStale`), e un
  secondo flag sarebbe una seconda cosa che puo' sbagliare.
- **Due situazioni, distinte nel testo e non in un secondo stato:** mai
  scaricata (`null` — il caso che la fascia di staleness esclude di proposito) e
  scaricata ma vecchia.
- **Perche' «guest list» e non «attendee list».** Un biglietto porta un QR
  firmato ed e' ammesso offline anche se non e' in cache — il ramo non-cachato
  di `ticketOffline` **ammette e segnala**. Chi dipende davvero dalla lista
  scaricata e' l'invitato senza email, che si trova **per nome** o non si trova
  (D-51-10).
- **La frase finisce dicendo cosa fare invece di rifiutare**, nella stessa forma
  del precedente. Un avviso che descrivesse solo un rischio, alle due di notte,
  si leggerebbe come un permesso a rifiutare.
- **Nessuna rotta nuova, nessun pulsante nuovo**: il download resta
  `GET /api/tickets/attendance`, una chiamata sola.

### 3. La testata e' spezzata in due

- **Barra fissa** (`sticky top-0 z-10 bg-ground px-6 pt-6 pb-3`): titolo della
  serata e pulsante «QR Scan».
- **Resto che scorre** (`px-6 pb-3`): avviso di serata finita, deriva
  dell'orologio, pastiglie della coda, pannello delle voci fallite, contatore,
  ricerca, linguette. **Stessi elementi, stesso comportamento — si sono
  spostati, non sono cambiati.**
- **Il criterio e' scritto accanto**, in un commento di trenta righe: un
  elemento `sticky` pinna il proprio **bordo** superiore, non il proprio
  contenuto, quindi **la parte fissa deve stare comodamente dentro la finestra
  di un telefono**. Senza quel commento il prossimo lettore «ripara»
  rimettendoci dentro le pastiglie, e il difetto torna con meno righe — e il
  fallimento e' silenzioso, perche' su un laptop sembra giusto ogni volta.

## Task Commits

1. **Task 1: L'esito diventa opaco, e il titolo smette di essere un nome** — `512f4ef` (fix)
2. **Task 2: L'avviso della lista diventa uno stato calcolato, e dice «guest list»** — `e145318` (fix)
3. **Task 3: La testata si spezza in una barra fissa e un resto che scorre** — `8f1b2bd` (fix)

## Files Created/Modified

- `src/components/scanner/ScanFlash.tsx` — tre sfondi opachi; un docblock nuovo
  sui prop che dice perche' il titolo non puo' essere un nome, e un paragrafo
  sul perche' l'alpha e' uscito. Le durate invariate.
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — `ticketKindLabel`,
  `guestListWarningText`, undici chiamanti di `showFlash` riscritti,
  `unknown_code` riscritta, testata spezzata.
- `scripts/verify-scan-legibility.mjs` — solo il docblock, che dichiarava
  un'alpha che il prodotto non ha piu' (vedi Deviations).

## Decisions Made

1. **Il nome resta dove qualcuno lo consulta o lo sceglie.** Fuori dal titolo
   del flash; dentro la lista della serata (`:3326`), la cronologia delle
   scansioni (`addScanRecord({ name })`, sei siti) e la conferma
   dell'annullamento (`Undo check-in for ${record.name}?`, `:1725`).
   Quest'ultima **non e' un verdetto**: e' un operatore che ha scelto una riga e
   deve confermare di aver scelto quella giusta, e toglierle il nome
   trasformerebbe una conferma in un indovinello. Vale D-51-05 alla lettera —
   *«lo schermo della porta»* e' il flash, non ogni pixel dell'app.
2. **La pastiglia Online/Offline e la freccia indietro restano nella barra
   fissa.** Il criterio della barra e' l'**altezza**, non il conteggio degli
   elementi, ed entrambe stanno sulla riga del titolo senza aggiungerne. La
   pastiglia in particolare e' l'unico fatto il cui valore intero e' essere
   visibile **mentre si legge altro**. Dichiarato qui perche' il piano diceva
   «titolo e pulsante e nient'altro»: le «pastiglie di stato» che il piano
   manda fuori sono quelle della coda, e quelle sono fuori.
3. **L'avviso della guest list e' un secondo elemento, non una frase piegata
   dentro la fascia di staleness.** La fascia riporta un'eta' e offre un
   ricaricamento, quindi non ha nulla da dire prima che un'eta' esista; questo
   avviso e' piu' vero proprio quando nessuna lista e' stata scaricata. Un
   elemento solo dovrebbe portare due condizioni e finirebbe per mentire su una.
4. **`guestListWarningText` riusa `formatListAge`** invece di riformattare
   l'eta' per conto proprio: due modi di stampare la stessa eta' sulla stessa
   schermata divergerebbero al primo ritocco.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Documentazione datata] Il docblock di `scripts/verify-scan-legibility.mjs`**
- **Found during:** Task 1
- **Issue:** Il file dichiarava *«The flash renders at `/90`, not full»* e citava
  `#00C04D` come composito di `bg-green-500/90`. Dal momento in cui i tre sfondi
  sono diventati opachi, quella riga descriveva male il prodotto — dentro il
  file che **misura** quel prodotto. `ai-engineering.md`, gate *documentazione
  datata*; `meta-gates.md`, *una riga che descrive male il prodotto e' peggio di
  una riga assente*.
- **Fix:** Il paragrafo non nomina piu' un numero e dice invece la proprieta':
  l'alpha si **legge** dalla stringa dell'utility (`parseUtility`, `1` quando non
  c'e'). Registrata accanto la data del cambio e il fatto che il gate aveva
  ragione da solo — ha misurato il cambio, non l'ha creduto.
- **Files modified:** `scripts/verify-scan-legibility.mjs` (solo commento;
  nessuna riga eseguibile nel diff)
- **Verification:** `npm run verify:scan-legibility` → EXIT=0, `SCAN_LEGIBILITY_OK`
- **Committed in:** `512f4ef`
- **Perimetro:** il file non e' in `files_modified` del piano. Nessun altro
  esecutore di questa onda lo tocca (51-06: pagine account/dashboard,
  `next.config.ts`, `next-redirect.ts`, `middleware.ts`, `roles.ts`,
  `AppNav.tsx`; 51-08: migration, capability, script di verify e seed — questo
  non e' fra i suoi).

**2. [Rule 1 — Bug] Tre commenti riscritti per non rompere i grep del piano**
- **Found during:** Task 1 e Task 2
- **Issue:** Tre commenti che spiegavano cosa era stato rimosso **citavano il
  letterale rimosso** (`member_name`, `/90`, la vecchia frase con «member
  list»), e i gate di questo piano sono grep su quei letterali: le asserzioni
  sarebbero diventate rosse a causa della prosa che le documenta.
- **Fix:** Descritti invece che citati, sul precedente che `reportServerFault`
  gia' enuncia nello stesso file (*«named by shape rather than by string on
  purpose — the assertion for this fix is a grep over the whole file»*) e che il
  piano 31-07 aveva imparato rompendolo. **La prosa si riscrive, il controllo
  non si indebolisce** — la regola che `checkin-store.ts` porta scritta in casa.
- **Files modified:** `src/components/scanner/ScanFlash.tsx`,
  `src/app/(admin)/admin/scanner/ScannerClient.tsx`
- **Verification:** `grep -c "/90" ScanFlash.tsx` → 0 ·
  `grep -c "member_name" ScannerClient.tsx` → 0 ·
  `grep -ci "member list" ScannerClient.tsx` → 0
- **Committed in:** `512f4ef`, `e145318`

---

**Total deviations:** 2 auto-fixed (1 documentazione datata, 1 prosa che
rompeva il proprio gate)
**Impact on plan:** Nessun allargamento di comportamento. Un file in piu' nel
diff, e solo il suo docblock.

## Issues Encountered

**Nessun ostacolo tecnico.** Un punto di giudizio, risolto e dichiarato: il
piano dice che la barra fissa porta «il titolo della serata e il pulsante di
scansione e **nient'altro**», mentre il criterio che lo stesso paragrafo
dichiara operativo e' l'**altezza**. La freccia indietro e la pastiglia
Online/Offline stanno sulla riga del titolo e non aggiungono altezza; toglierle
avrebbe rispettato la lettera e perso la cosa che la regola protegge. Risolto
verso il criterio, con la ragione scritta nel codice e qui — non verso la
conta degli elementi.

## Verification Evidence

Misurato su HEAD `8f1b2bd`:

- `npm run build` (typecheck di Next incluso) → **EXIT=0**, dopo ogni task.
- `npm run verify:scan-legibility` → **EXIT=0**, `SCAN_LEGIBILITY_OK`. I numeri
  li stampa il gate, e **sono migliorati con l'opacita'**:

  | | prima (alpha 0.9) | dopo (opaco) |
  |---|---|---|
  | accept↔refuse (min) | 14.0 | 14.0 |
  | accept↔third (min) | 19.8 | 20.1 |
  | refuse↔third (min) | 31.9 | 32.4 |
  | third↔pill (min) | 29.0 | 27.9 |
  | refuse↔pill (min) | 23.7 | 21.4 |
  | glifo su accept | 8.18:1 | **8.98:1** |
  | glifo su third | 5.49:1 | **5.99:1** |
  | glifo su refuse | 3.87:1 | **4.19:1** |

  Ogni coppia resta sopra la soglia 10 e ogni glifo sopra il proprio pavimento.
  Le due coppie che scendono (`third↔pill`, `refuse↔pill`) restano a piu' del
  doppio della soglia.
- `npm run verify:breakpoints` → **EXIT=0**, `BREAKPOINTS_OK`, 0 `sm:` residui.
- `npm run verify:touch-targets` → **rosso, come prima e sugli stessi tre
  elementi**: `GuestTokenDisplay.tsx:689`, `GuestTokenDisplay.tsx:702`,
  `ticket-order.tsx:270`. **Nessuno dei tre file e' nel diff di questo piano**
  (`git diff --name-only` contro la base: tre file, nessuno di quelli), quindi
  il gate non peggiora — e' il debito dichiarato alla voce 12 di
  `deferred-items` della fase 58.
- `grep -c "/90" ScanFlash.tsx` → **0** · `grep -n "delay:"` → 1500 / 2500 /
  2000, e `git diff -U0 -- ScanFlash.tsx | grep -c delay` → **0**: le durate non
  compaiono nel diff.
- `grep -c "member_name" ScannerClient.tsx` → **0** ·
  `grep -ci "member list" ScannerClient.tsx` → **0** ·
  `grep -qi "guest list"` → presente · `grep -q "listIsStale"` → presente.
- `grep -c "sticky top-0" ScannerClient.tsx` → **1**.
- `git diff --diff-filter=D --name-only` contro la base → **nessuna
  cancellazione**. Nessun file non tracciato.
- Nessun `useState<boolean>` nuovo nel diff.

### Cio' che NON e' verificato qui, e va detto

- **Non esiste alcun test runner per il prodotto.** `npm run build` e' un
  typecheck; `verify:scan-legibility` misura la **distanza fra due tinte**, non
  la leggibilita' di uno schermo, e il suo stesso output lo dice.
- **La barra fissa e' l'assunzione A2 della ricerca, e questo build non la
  conferma.** La causa — un blocco `sticky` piu' alto della finestra pinna il
  proprio bordo — e' **sostenuta dal codice** e le due cause alternative sono
  escluse per lettura (nessun antenato con `overflow`, nessun `viewportFit`
  dichiarato), ma non e' mai stata misurata su uno schermo.
  `51-PATTERNS.md` §«No Analog Found» la registra cosi': nessun altro punto del
  prodotto ha una testata `sticky` a due livelli su cui copiare la misura.
  **La conferma e' il passo 6 di `P-51-1` nella corsa «dopo», su un telefono
  vero.** Se quel passo mostra ancora il titolo che se ne va, la causa e'
  un'altra e la riparazione e' da rifare — non da imbottire.
- **Le tre schermate del flash non sono state guardate.** Che il titolo dica
  l'esito e il sottotitolo il tipo si legge nel codice; che si legga in un
  colpo d'occhio alle due di notte lo dice il passo 3 di `P-51-1`.
- **L'avviso derivato non e' stato osservato spegnersi.** La sua correttezza e'
  strutturale — e' una funzione del render, non un valore scritto — ma il
  momento che il proprietario ha segnalato (avviso acceso accanto al badge
  «Online») si riproduce solo alla porta, con la radio.

## Known Stubs

Nessuno. Nessun segnaposto, nessun «coming soon», nessuna superficie lasciata a
meta'.

## Threat Flags

Nessuna superficie nuova: nessuna rotta, nessun pulsante, nessun campo, nessuna
chiamata di rete aggiunta. Il piano **toglie** superficie informativa — un nome
in meno su uno schermo a tutto campo leggibile da chiunque stia in fila dietro
la persona che lo vede (T-51-27).

## Debito dichiarato, con il nome di chi lo chiude

- **Il check-in per nome della guest list non ha ramo offline.**
  `handleGuestCheckIn` e' online-only e, a radio spenta, la `fetch` fallisce e
  lo schermo dice *«Connection error — The guest was not checked in»* senza
  mettere nulla in coda. **Non e' toccato qui**: non e' nel perimetro di questo
  piano, e D-51-10 tiene quel percorso vivo. Il nuovo avviso della guest list
  **descrive correttamente questa realta'** — dice di non rifiutare e di
  sistemare nella revisione della serata, che e' cio' che oggi si puo'
  effettivamente fare. Il ramo offline lo assegna la fase a un piano suo.
- **`verify:touch-targets` resta rosso** su tre elementi fuori da questo
  perimetro: voce 12 di `deferred-items` della fase 58.

## User Setup Required

Nessuna. Nessun pacchetto installato, `package.json` non cambia (T-51-SC).

## Next Phase Readiness

- **Per `P-51-1`, corsa «dopo»:** il passo 3 legge le tre schermate del flash
  (esito, tipo, nessun nome; e il fatto ancora leggibile alla seconda lettura);
  il passo 6 e' la **conferma o la smentita** della barra fissa. Sono le due
  misure che questo piano non puo' prendere da solo.
- **Per il VERIFICATION della fase:** le citazioni `file:riga` di questo piano
  sono nella sezione Verification Evidence, e i tre esiti attesi sono scritti
  come confronto con la corsa «prima» di `51-ESITI.md`.

## Self-Check: PASSED

- I tre file dichiarati come modificati esistono:
  `src/components/scanner/ScanFlash.tsx`,
  `src/app/(admin)/admin/scanner/ScannerClient.tsx`,
  `scripts/verify-scan-legibility.mjs`.
- I tre hash citati esistono nella history di questo worktree: `512f4ef`,
  `e145318`, `8f1b2bd`.
- `git diff --name-only` contro la base `d8aebaa` → esattamente quei tre file.
  Nessuna cancellazione, nessun file non tracciato.
- Nessuna modifica a `STATE.md` ne' a `ROADMAP.md`: li scrive l'orchestratore.

---
*Phase: 51-via-le-superfici-da-socio-e-la-porta*
*Completed: 2026-09-22*
