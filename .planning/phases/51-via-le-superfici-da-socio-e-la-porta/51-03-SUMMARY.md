---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 03
subsystem: api
tags: [serwist, service-worker, next-route-handler, indexeddb, persona, rls]

requires:
  - phase: 50-via-le-iscrizioni
    provides: "signup pubblico spento, `profiles.status` rimosso, `member` gia' ridotto ad account leggero"
  - phase: 49-comprare-senza-account
    provides: "D-49-01 — il debito NON scelto sull'ammissione col solo `membership_code`"
provides:
  - "`/api/membership/verify` e `/api/membership/list` cancellate: la seconda credenziale della porta non ha piu' un indirizzo"
  - "`doorRuntimeCaching` a due regole, i due matcher dei biglietti intatti e nello stesso ordine"
  - "Il fatto misurato su `public.attendances` che il task 1 di 51-05 usa per distinguere le righe da porta"
  - "Persona v1.24.0: nessun glob morto, tabella di routing reale, 7/7 verdi"
affects: [51-02, 51-05, 51-09, 51-10, 51-11, 57]

tech-stack:
  added: []
  patterns:
    - "Una rotta che esce porta via con se' le sue regole di runtime caching E i `paths:` della persona, nello stesso ciclo di lavoro"
    - "Il gate resta, l'esempio cambia: una citazione di endpoint morto e' documentazione datata, il gate che la conteneva no"

key-files:
  created: []
  modified:
    - src/app/sw.ts
    - CLAUDE.md
    - .claude/rules/checkin-offline.md
    - .claude/rules/access-gating.md
    - .claude/rules/meta-gates.md
    - .claude/CHANGELOG.md
  deleted:
    - src/app/api/membership/verify/route.ts
    - src/app/api/membership/list/route.ts

key-decisions:
  - "Il docblock del service worker NON nomina le due rotte cancellate: dice cosa e' uscito e perche', senza lasciare la stringa di un percorso che non risponde piu'"
  - "Le tre citazioni in prosa della persona sono state ACCORCIATE dopo la prima misura del budget, applicando la priorita' del gate: si taglia la descrizione, non la regola"
  - "I riferimenti residui a `api/membership` nei file di 51-02 e 51-04 NON sono stati toccati: appartengono ad altri esecutori dell'onda"

patterns-established:
  - "Verifica sull'OUTPUT del build, non sul diff: i due matcher che restano si asseriscono su `public/sw.js`, dove la regola vive davvero"
  - "L'ordine dei task e' un vincolo, non una comodita': `verify:persona` si lancia DOPO la cancellazione delle rotte, mai prima"

requirements-completed: [MEM-03]

duration: 42min
completed: 2026-09-22
---

# Phase 51 Plan 03: Le due rotte del socio, il loro precache e il glob morto — Summary

**Cancellate `/api/membership/verify` e `/api/membership/list`, il service worker della porta scende da quattro regole `NetworkOnly` a due con l'ordine preservato, e la persona sale a v1.24.0 togliendo `src/app/api/membership/**` dai tre indici che lo dichiaravano.**

## Performance

- **Durata:** ~42 min
- **Task:** 3/3
- **File modificati:** 6 · **cancellati:** 2
- **Righe:** +89 / −829

## Accomplishments

- **MEM-03 lato server.** La seconda credenziale della porta — un URL col codice dentro, **senza firma**, contro il biglietto HMAC-firmato — non ha piu' un indirizzo. Con lei esce la rotta che serviva il roster intero (nome per esteso + codice socio) a **ogni telefono che potesse lavorare un ingresso**.
- **MEM-03 lato cache.** `doorRuntimeCaching` passa da quattro elementi a due. I due che restano sono intatti e **nello stesso ordine**, che e' la proprieta' portante: Serwist prende la prima regola che matcha.
- **La persona descrive il prodotto che esiste.** `npm run verify:persona` 7/7, con A e G verificati **rossi prima** e verdi dopo — la mutazione e' stata osservata, non assunta.

## Task Commits

1. **Task 1: le due regole escono dal service worker** — `990a95d` (fix)
2. **Task 2: cancellare le due rotte d'API** — `89e3ecf` (feat!)
3. **Task 3: la persona smette di dichiarare una directory che non esiste** — `19a10d9` (docs)

## Files Created/Modified

- `src/app/sw.ts` — `doorRuntimeCaching` a due elementi; docblock riscritto; «four door rules» → «two» nei due punti a valle che le contavano. `precacheEntries` **non toccato**: il manifest lo genera il build sugli asset, non c'e' voce scritta a mano.
- `src/app/api/membership/verify/route.ts` — **cancellato** (716 righe)
- `src/app/api/membership/list/route.ts` — **cancellato** (107 righe)
- `CLAUDE.md:239` — la riga d'indice «Check-in & Offline» perde il glob
- `.claude/rules/checkin-offline.md:5` — il `paths:` perde il glob; `:56` il gate *rate limit sulla verifica* cambia esempio
- `.claude/rules/access-gating.md` — due citazioni di `api/membership/verify` corrette (capoverso entropia, gate *nessun rate limiting, oggi*)
- `.claude/rules/meta-gates.md` — la riga di routing `src/app/api/membership/**` esce dalla tabella di priorita'
- `.claude/CHANGELOG.md` — voce **1.24.0** con scenario di carico-e-scatto e budget rimisurato

## Il fatto misurato per il piano 51-05

Letto **prima** di cancellare, ed e' la ragione per cui il task 2 chiedeva di leggerlo:

> **`verify/route.ts:527-536` era l'unico scrittore di `public.attendances` in tutto il prodotto, e scriveva sempre `party_id: party.id` valorizzato — mai NULL.**

Il ramo di conflitto lo conferma dall'altro lato: il `SELECT` sul `23505` (`:561-567`) filtra sullo **stesso** `party_id`, perche' il vincolo vive in un **indice unico parziale** `ON (party_id, user_id) WHERE party_id IS NOT NULL` (`20260805120000_door_scan_events.sql:248-250`). Un lookup sul solo `event_id`+`user_id`, su una serata doppia, restituirebbe la riga **dell'altro atto**.

**Conseguenza per 51-05:** `party_id IS NOT NULL` e' il predicato che distingue le righe scritte dalla porta dal residuo pre-porta. Non e' un raffinamento: e' il discriminante.

Censimento completo su `attendances` al momento della cancellazione — quattro siti, due file:

| Sito | Operazione | Stato |
|---|---|---|
| `membership/verify/route.ts:528` | `INSERT` | **cancellato qui** |
| `membership/verify/route.ts:562` | `SELECT` sul conflitto | **cancellato qui** |
| `tickets/checkin/undo/route.ts:534` | `SELECT id, party_id, event_id` | 51-02 |
| `tickets/checkin/undo/route.ts:560` | `DELETE` | 51-02 |

Dopo l'onda la tabella e' **senza scrittori e senza lettori** nel prodotto (MEM-02, e conferma la misura §3.1 della ricerca).

## Decisioni prese durante l'esecuzione

- **Il docblock non nomina le rotte morte.** Il piano chiedeva di riscrivere il paragrafo dicendo che il roster e' uscito con la fase 51; la prima stesura citava i due percorsi per esteso, e li' `grep -c "api/membership" src/app/sw.ts` dava `1`. Riscritto senza le stringhe: il criterio d'accettazione — *«il docblock non nomina piu' una rotta inesistente»* — e il gate *documentazione datata* chiedono la stessa cosa, e la citazione letterale le contraddiceva entrambe.
- **«four door rules» → «two» in due punti oltre quelli chiesti** (`sw.ts:71` e `:92`). Il piano non li nominava, ma un commento che conta quattro regole in un array che ne ha due e' la stessa documentazione datata, nello stesso file. Rientra in `files_modified`.

## Deviazioni dal piano

### 1. [Rule 1 — Verifica] Il grep del task 2 non puo' essere verde dentro un solo worktree

- **Trovata durante:** Task 2
- **Il criterio:** *«`/usr/bin/grep -rn "api/membership" src/` → zero righe»*, che discende dall'assunzione scritta nel piano — *«nessun ramo del prodotto chiama piu' queste rotte dopo il piano 51-02»*.
- **Cosa non torna:** 51-02 gira **in parallelo**, in un worktree separato. Nel mio i suoi file sono ancora quelli della base. Il criterio e' verificabile **dopo il merge dell'onda 1**, non prima.
- **Cosa NON ho fatto:** toccare quei file. Appartengono a `files_modified` di altri esecutori, e modificarli produrrebbe il conflitto che l'isolamento esiste per evitare.

Censimento dei tredici riferimenti residui, con il proprietario di ciascuno:

| Riferimento | Tipo | Proprietario |
|---|---|---|
| `ScannerClient.tsx:1297` `fetch("/api/membership/list")` | **chiamante vivo** | 51-02 |
| `ScannerClient.tsx:2250` `fetch("/api/membership/verify")` | **chiamante vivo** | 51-02 |
| `sync-manager.ts:385` `url: "/api/membership/verify"` | **bersaglio di drenaggio** | 51-02 |
| `qr.ts:34` costruisce l'URL di verifica nel QR | **chiamante vivo** | 51-04 |
| `ScannerClient.tsx:195`, `sync-manager.ts:19,249`, `checkin-store.ts:128`, `classify.ts:146` | commento | 51-02 |
| `attendance/route.ts:109`, `checkin/route.ts:222` | commento | 51-10 |
| `members/actions.ts:121`, `redact.ts:12` | commento | 51-09 / 51-11 |

**Nessun riferimento e' orfano:** verificato leggendo i `files_modified` degli altri piani della fase. I quattro chiamanti vivi sono rotti **solo dentro questo worktree** e **solo fino al merge**; il build non se ne accorge perche' sono stringhe a runtime, non import — che e' il motivo per cui il gate qui e' il grep e non il compilatore.

### 2. [Rule 2 — Correttezza documentale] Il caso peggiore del context budget e' cambiato file, e NON per la ragione che il gate prevede

- **Trovata durante:** Task 3
- **Misura:** prima `…(work)/venues/[slug]/page.tsx`, 48.118 byte ≈ **13.366** token. Dopo `…/scanner/DoorSurface.tsx`, 48.314 byte ≈ **13.421** token. Tetto 15.000, margine **1.579**.
- **Perche' conta:** il gate *context budget* dice che quando il caso peggiore cambia file **e' il progetto che si e' spostato, e va guardato**. Qui il progetto **non si e' spostato**: e' la persona che e' cresciuta sui due moduli che si caricano alla porta. Scriverlo come «il progetto si e' mosso» sarebbe stata una lettura falsa di una tabella vera.
- **Scomposizione:** la rimozione dei glob **sottrae 95 byte** a `CLAUDE.md` (−29) e `meta-gates.md` (−66), cioe' a **ogni** file del repo. Le tre riscritture ne **aggiungono 525** a `checkin-offline.md` (+370) e `access-gating.md` (+155), cioe' **solo** ai file che caricano la porta — che sono quelli del nuovo caso peggiore. Netto sul vecchio caso peggiore: −95 byte. Netto sulla porta: +430.
- **Azione:** prosa accorciata una volta, **13.520 → 13.421** token, applicando la priorita' scritta nel gate: *si taglia la descrizione, non la regola*. Quello che resta e' il fatto datato e la situazione che fa scattare il gate.
- **Committato in:** `19a10d9`, con i numeri nella voce di changelog.

---

**Totale deviazioni:** 2 — 1 di verifica (criterio non valutabile prima del merge d'onda), 1 di correttezza documentale (auto-corretta).
**Impatto sul piano:** nessuno scope creep. Nessun file fuori da `files_modified`.

## Verifica eseguita

| Comando | Esito | Evidenza |
|---|---|---|
| `npm run build` | **verde**, dopo ognuno dei tre task | — |
| `grep -c "api/membership" src/app/sw.ts` | **0** | — |
| `grep -c "api/membership" public/sw.js` | **0** | T-51-11: il precache e' generato dal build, la rotta ne esce da sola |
| `grep -c "api/tickets/attendance" public/sw.js` | **1** | T-51-10: asserito sull'**output**, non sul diff |
| `grep -c "api/tickets/checkin" public/sw.js` | **1** | idem |
| `test ! -d src/app/api/membership` | **vero** | — |
| `npm run verify:persona` | **7/7**, lanciato dopo la cancellazione | A e G osservati **rossi prima**, verdi dopo |
| `grep -c "api/membership"` sui quattro moduli | **0 · 0 · 0 · 0** | `CLAUDE.md`, `checkin-offline`, `meta-gates`, `access-gating` |

**Cosa questa verifica NON dice.** Questo repo non ha test runner: `npm run build` e' il typecheck, non una prova di comportamento. Che la porta continui ad ammettere a radio spenta **non e' stato provato qui** — lo prova `MEM-04`, al telefono, sul laboratorio, e resta il gate della fase (D-51-12). Nulla di questo piano ha toccato il laboratorio: nessun push, nessun deploy, nessuna scrittura.

## Issues Encountered

**Il worktree e' nato su una base sbagliata.** `HEAD` era su `78f4a81`, che precede la fase 51: `.planning/phases/51-…/` non esisteva e il piano non era leggibile. Il `merge-base` con la base attesa dava `78f4a81`, quindi la condizione di reset dichiarata nel protocollo era soddisfatta e il reset a `e05d098` e' stato eseguito con l'albero pulito. Nessun lavoro perso.

## Deferred Issues — due rossi PRE-ESISTENTI, non miei

`npm run verify` riporta `VERIFY_FAIL — 2`. Nessuno dei due tocca un file di questo piano, e il diff completo del piano e' otto file (nessuno dei quali e' fra questi):

1. **`verify:touch-targets`** — 3 elementi sotto i 44px: `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:689` e `:702` (`<button>`), `src/emails/ticket-order.tsx:270` (`<a>`). Il gate e' esplicito: *«Fix the ELEMENT, not this gate»*.
2. **`verify:venue-surfaces` G2** — `src/app/(public)/payment/callback/actions.ts` seleziona `sumup_checkout_id`, fuori dall'insieme autorizzato `{id, status, ticket_id}`. E' una **allow-list positiva su un percorso di rivelazione**, e il gate dice la cosa che vale il doppio qui: *«Loosening an assertion here to clear a red on a reveal path is the one edit in this repository that cannot be undone»*. **Non toccata.**

Piu' due **rifiuti**, che non sono ne' rossi ne' verdi: `verify:capabilities` e `verify:section-export` non hanno misurato nulla — un worktree non ha `.env.local`, che e' gitignored e vive nel checkout principale.

Non registrati in `deferred-items.md` di proposito: tre esecutori scrivono in parallelo su questa directory e un file condiviso creato da piu' worktree e' un conflitto di merge. Stanno qui, che e' un file di cui questo piano e' l'unico autore.

## Next Phase Readiness

- **51-02** puo' togliere i suoi quattro chiamanti: le rotte non ci sono piu', quindi ogni `fetch` rimasto e' morto per costruzione e non c'e' compatibilita' da preservare.
- **51-05** ha il suo discriminante misurato e citato: `party_id IS NOT NULL`, con il file e le righe.
- **51-09 / 51-10 / 51-11** ereditano i sei commenti datati che citano le due rotte, dentro file che gia' possiedono.
- **Attenzione per chi chiude la fase:** il criterio *«zero `api/membership` in `src/`»* e' un gate **di fine onda**, non di questo piano. Va rilanciato dopo il merge, e il `VERIFICATION.md` e' il posto dove registrarne l'esito con la data.

---
*Phase: 51-via-le-superfici-da-socio-e-la-porta*
*Completed: 2026-09-22*

## Self-Check: PASSED

- I tre commit esistono: `990a95d`, `89e3ecf`, `19a10d9`
- `src/app/api/membership/` non esiste
- `src/app/sw.ts` presente e modificato
- `.claude/CHANGELOG.md` porta la voce `1.24.0`
- Il SUMMARY porta il fatto su `party_id` per 51-05
