---
phase: 42-scanner-conversion
plan: 01
subsystem: infra
tags: [gates, verify-conversion, conversion-manifest, census, node, esm]

requires:
  - phase: 45-production-sections-section-by-section
    provides: DEF-45-01 — la diagnosi delle quattro voci morte e la riparazione prescritta (rimozione, non allargamento del matcher)
  - phase: 41.2-responsive-conversion
    provides: check F, PHASE_42_PATHS, NON_DECLARABLE — la distinzione recinto / rifiuto di categoria che questo piano estende
provides:
  - "`npm run verify:conversion` torna a raggiungere un verdetto: da exit 2 (nothing was measured) a exit 0"
  - "`PENDING_SURFACES` — un secondo recinto per nome, con dentro la fase che possiede ogni superficie"
  - "check F legge quattro bucket invece di tre, stampati a parte"
  - "una sesta condizione di rifiuto in `checkManifest()`: un recinto che non matcha piu' nulla e' exit 2"
  - "DEF-42-01 — le sei pagine di produzione con la loro disposizione attribuita"
affects: [42-scanner-conversion, 44-production-calendar, 45-production-sections]

tech-stack:
  added: []
  patterns:
    - "Un recinto che puo' smettere di matchare qualcosa deve rifiutare, non tacere"
    - "Due recinti dello stesso tipo restano due conteggi, in codice e nel rapporto stampato"
    - "Un nome di costante descrive la condizione, non l'occasione — cosi' non diventa una descrizione falsa"

key-files:
  created:
    - .planning/phases/42-scanner-conversion/deferred-items.md
  modified:
    - scripts/conversion-manifest.mjs
    - scripts/verify-conversion.mjs

key-decisions:
  - "Le sei pagine di fasi 44 e 45 sono recintate per nome, non dichiarate convertite: dichiararle sarebbe la bugia che il file stesso chiama 'a list of claims is how a gate becomes a rubber stamp'"
  - "La costante si chiama PENDING_SURFACES e non porta un numero di fase: un nome con dentro una fase invecchia il giorno in cui una terza fase lascia indietro una pagina"
  - "PENDING_SURFACES ha una staleness refusal che PHASE_42_PATHS non ha, e l'asimmetria e' voluta: il primo si scioglie per mano del piano scritto per scioglierlo, il secondo su sei commit che nessuno coordina"
  - "I tre nomi di route rimossi restano su WIDE_ROUTES: quella lista e' un contratto sulla larghezza, letta solo per le route dichiarate — toglierli e' una decisione separata e non e' stata presa qui"
  - "La storia nei blocchi WAVE 5 e WAVE 9 e' corretta in loco con una data, mai cancellata"

patterns-established:
  - "Prova per mutazione con asserzione preventiva: la mutazione si verifica applicata PRIMA di leggerne l'esito (qui: 5 voci e il glob sonda in testa, letti dal modulo, non dal diff)"
  - "Controllo per invarianza: i due gate che leggono la stessa lista producono output byte-identico prima e dopo, il che prova che la costante aggiunta non li ha sfiorati"

requirements-completed: [DS-04, RESP-05]

duration: 32min
completed: 2026-08-18
---

# Fase 42 Piano 01: la riparazione dello strumento Summary

**`verify:conversion` passa da exit 2 (*nothing was measured*) a exit 0: quattro voci che nominavano file inesistenti rimosse, sei pagine di altre fasi recintate per nome con dentro la fase che le possiede, e un recinto che ora rifiuta invece di tacere quando smette di matchare.**

## Performance

- **Duration:** ~32 min
- **Started:** 2026-08-18T19:28Z circa
- **Completed:** 2026-08-18T19:59:52+02:00
- **Tasks:** 3
- **Files modified:** 3 (2 modificati, 1 creato) — **zero sotto `src/`**

## Accomplishments

- **Due gate su diciassette tornano a misurare.** `checkManifest()` rifiutava su quattro voci `CONVERTED` che nominavano pagine Finance/Analytics non piu' su disco, e il rifiuto si propagava anche a `verify:touch-targets`, che legge la stessa lista. Rimosse: 38 → 34 voci, zero `pageFile` assenti.
- **Le sei pagine che il gate ha subito trovato hanno una disposizione che non mente.** Non dichiarate convertite (nessun piano ne ha camminato la chiusura), non rifiutate come non-superfici (hanno markup): **recintate**, con `PENDING_SURFACES`, e la fase che le ha costruite scritta dentro ogni `reason`.
- **Il nuovo recinto si scioglie ad alta voce.** Un glob che non matcha nessuna `page.tsx` e' exit 2 col nome della voce stantia — la condizione che `PHASE_42_PATHS` non ha, provata per mutazione.
- **Nessuna riga di prodotto toccata.** `git status --porcelain -- src/` vuoto a ogni commit, come il vincolo d'ordine di fase pretende.

## Task Commits

1. **Task 1: le quattro voci morte fuori da CONVERTED** — `d70583e` (fix)
2. **Task 2: un secondo recinto, per nome, per sei pagine di un'altra fase** — `327ba0b` (feat)
3. **Task 3: il debito registrato dove una persona lo trova** — `e67808c` (docs)

## Files Created/Modified

- `scripts/conversion-manifest.mjs` — `CONVERTED` da 38 a 34 voci; nuova costante `PENDING_SURFACES` (quattro glob, sei page file); sesta condizione di rifiuto in `checkManifest()`; due helper privati (`globToRegExp`, `appPageFiles`) che replicano deliberatamente la traduzione del consumer; prosa dei blocchi WAVE 5 e WAVE 9 corretta in loco con la data.
- `scripts/verify-conversion.mjs` — `PENDING_SURFACES` nel destructure e nella validazione di forma; `pendingMatch` accanto a `phase42Match`; `censusPending` accanto a `censusFenced`; una riga propria nel censo stampato e le voci elencate col glob che le ha prese; il ramo verde di F conta quattro bucket.
- `.planning/phases/42-scanner-conversion/deferred-items.md` — **creato**, DEF-42-01.

## Le misure, non le descrizioni

### Task 1 — la rimozione, provata prima di essere fatta

Prima di cancellare, ogni `pageFile` di `CONVERTED` e' stato testato contro l'albero:

```
count 38
missing 4
   /admin/analytics/members | src/app/(admin)/admin/(work)/analytics/members/page.tsx
   /admin/analytics         | src/app/(admin)/admin/(work)/analytics/page.tsx
   /admin/analytics/compare | src/app/(admin)/admin/(work)/analytics/compare/page.tsx
   /admin/finance           | src/app/(admin)/admin/(work)/finance/page.tsx
```

Esattamente quattro, ed esattamente quelli — nessun quinto, quindi l'aritmetica della fase regge. Dopo: `count 34, missing 0`.

`/admin/events/[id]/analytics` — la route vicina, che il piano avvisava di non confondere — **e' rimasta**: e' una superficie per-serata, un file diverso, e sta su disco.

Esito del gate dopo la sola rimozione, exit **1**:

```
✓ A  no raw palette utility in 188 file(s) under 34 converted surface(s)
✓ B  ✓ C  ✓ D  ✓ E
✗ F  6 page.tsx file(s) exist and are accounted for NOWHERE
CONVERSION_FAIL — 1 check(s) failed: F
```

Le sei, verbatim, tutte sotto `admin/(work)/`: `calendar/[id]`, `calendar`, `location/[id]`, `location`, `manifesto`, `visual`.

**Il criterio sulla prosa residua.** `LC_ALL=C /usr/bin/grep -c 'admin/analytics\|admin/finance' scripts/conversion-manifest.mjs` conta **9** righe, tutte prosa, tutte dentro un blocco che si apre dichiarando la rimozione. Le tre che portano il peso:

- `:588-590` — *«the surfaces they named — `/admin/analytics`, `/admin/analytics/compare`, `/admin/analytics/members` and `/admin/finance` — were **REMOVED FROM THE PRODUCT** by a declared decision»*
- `:702` — *«`/admin/finance` left this block on 2026-08-18 because the surface was **removed from the product** by a declared decision»*
- `:680` — *«**not on disk since the surface was removed from the product**, which is exactly the refusal DEF-45-01 records»*

### Task 2 — la staleness refusal, provata per mutazione

Mutazione applicata (un settimo glob che non matcha nulla), **e verificata applicata prima di leggerne l'esito** — letta dal modulo, non dal diff:

```
PENDING_SURFACES entries: 5
first glob: src/app/(admin)/admin/(work)/ZZZ-mutation-probe/**
```

Esito sotto mutazione, **exit 2**:

```
FATAL: the manifest refuses, with 1 reason(s):
       PENDING_SURFACES declares src/app/(admin)/admin/(work)/ZZZ-mutation-probe/**,
       which matches NO page.tsx on disk. A fence that catches nothing is not a
       smaller fence: it is a scope boundary a reader still sees printed and no
       file is behind. […] Nothing was measured.
```

Sonda rimossa (`grep -c` → 0), gate rilanciato: **exit 0**.

### Task 2 — il censo a quattro bucket

```
      page.tsx files under src/app         : 43
      declared in CONVERTED                : 34
      behind the Phase 42 fence            : 2   (measured by nobody — a fence, not an exemption)
      pending another phase's conversion   : 6   (measured by nobody — another phase's debt, not this one's approval)
      on NON_DECLARABLE                    : 1   (measured, and not a surface)
      unaccounted for                      : 0
```

Ogni pagina pending e' stampata con il glob che l'ha presa (`pending, fenced by …`), e il ramo verde conta i quattro bucket separatamente.

### Il controllo, che e' la parte che prova l'assenza di effetti

`verify:dialogs` e `verify:touch-targets` leggono `PHASE_42_PATHS` e lo confrontano con le proprie `PHASE_42_EXEMPT_PATHS` locali, rifiutando su drift. Output catturato **prima** dell'aggiunta di `PENDING_SURFACES` e **dopo**:

```
diff dlg-before.txt dlg-after.txt   → nessuna differenza (exit 0)
diff tt-before.txt  tt-after.txt    → nessuna differenza (exit 0)
```

Byte-identici. La costante aggiunta non e' letta da nessuno dei due, e il drift refusal e' intatto.

## La suite intera — numeri, non aggettivi

`npm run verify` → **exit 2**. La coda, riportata invece che riassunta:

```
    package.json declares           22  verify:* entr(y/ies)
    run here                        19
      of which passed               17
      of which FAILED                0
      of which REFUSED               2  — nothing was measured by these
    needs a server, not run          1
    needs the material, not run      1
    needs an authorisation, not run  1
    declared absent                  0
    MISSING                          0
                                   ───
    accounted for                   22

  VERIFY_REFUSED — 2 gate(s) could not measure: verify:capabilities, verify:section-export
```

**I due che rifiutano, e l'input che manca a ciascuno:**

| Gate | Cosa manca | Che stato e' |
|---|---|---|
| `verify:capabilities` | `SUPABASE_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL` | condizione d'ambiente — DEF-45-02: `.env.local` e' gitignored e vive nel checkout principale, un worktree non ne ha copia |
| `verify:section-export` | `SUPABASE_ACCESS_TOKEN` per la **meta'** del gate (il censo di raggiungibilita'); l'altra meta', la camminata di closure, gira e passa | stessa condizione d'ambiente |

Il gate lo dice di se': *«a refusal is not a failure. It is also not a pass: no green here has been earned.»* Nessun gate che ha raggiunto un verdetto ha riportato un fallimento.

I tre non eseguiti lo sono per ragione dichiarata dal runner, non per omissione: `verify:redirects` (serve un dev server), `verify:ics` (legge il calendario di produzione da `docs/`, gitignored), `verify:refusal` (firma una sessione reale — e' un **atto**, serve autorizzazione datata).

**`verify:conversion` — il gate che questa fase deve usare per chiudere i propri criteri — e' fra i 17 che passano.**

`npm run build` → **exit 0**, rilanciato dopo la scrittura di `deferred-items.md` perche' Tailwind scansiona `.planning/` (DEF-41-01).

## Decisions Made

1. **Recinto, non dichiarazione, per le sei pagine.** Il gate offre tre disposizioni. Dichiararle convertite sarebbe una bugia (nessuno ne ha camminato la chiusura); `NON_DECLARABLE` sarebbe un'altra bugia (hanno markup). Il recinto e' l'unica delle tre che descrive lo stato reale: *nessuno ha misurato*.
2. **`PENDING_SURFACES`, non `PHASE_45_PATHS`.** Il piano lo chiedeva e la ragione regge: una terza fase lascera' indietro una pagina, e un nome che descrive la condizione sopravvive all'aritmetica che cambia sotto.
3. **Quattro glob per directory invece di sei per file.** Sei righe che differiscono per un segmento di path sono sei righe che nessuno rilegge.
4. **La staleness refusal vive in `checkManifest()` e porta con se' il proprio matcher.** Il modulo non aveva un glob matcher; ne ha ora uno privato, **identico** a quello del consumer, e il docblock dice perche': due matcher in disaccordo su un pattern lascerebbero passare un recinto che check F non applica mai.
5. **I tre nomi di route rimossi restano su `WIDE_ROUTES`.** Quella lista e' un contratto sulla larghezza, consultato solo per le route che `CONVERTED` dichiara. Toglierli e' una decisione separata, e non e' stata presa dentro una riparazione.
6. **La storia si corregge in loco con una data, non si cancella.** I blocchi WAVE 5 e WAVE 9 descrivevano voci che non ci sono piu'; portano ora una correzione datata in testa e il tempo verbale giusto, con l'argomento originale intatto.

## Deviations from Plan

**Nessuna deviazione di sostanza — il piano e' stato eseguito come scritto.** Tre aggiustamenti meccanici, tutti dentro il perimetro dichiarato dai task:

**1. [Rule 3 - Blocking] `conversion-manifest.mjs` non aveva un glob matcher**
- **Trovata durante:** Task 2
- **Problema:** il piano chiede la staleness refusal *«in `checkManifest()` beside the other five conditions»*, ma `checkManifest()` vive in un modulo che non aveva ne' un traduttore glob→regex ne' una camminata dell'albero. Le altre cinque condizioni interrogano un path; questa deve interrogare un pattern.
- **Fix:** due helper privati nello stesso file — `globToRegExp` (copia deliberata della traduzione del consumer, con il perche' scritto nel docblock) e `appPageFiles`. Nessun nuovo import: `readdirSync` e `join` erano gia' li'. Nulla gira a import time, come il docblock del modulo pretende.
- **Verificato da:** la mutazione qui sopra — il rifiuto scatta, ed exit 0 quando il glob e' reale.

**2. [Rule 1 - Consistenza] Il messaggio di rifiuto di forma diceva "four declared lists"**
- **Trovata durante:** Task 2
- **Problema:** il ciclo che valida la forma delle liste importate ne enumera ora cinque, e il messaggio ne diceva quattro. Una frase che conta male le proprie liste e' la stessa classe di difetto che questa fase ripara altrove.
- **Fix:** `four` → `five` in `verify-conversion.mjs`.

**3. [Rule 1 - Consistenza] L'aritmetica del blocco WAVE 9 era ferma a un albero di due fasi fa**
- **Trovata durante:** Task 1
- **Problema:** il paragrafo *«THE ARITHMETIC, so nobody counts 24 and finds 23»* dichiarava 24 page file sotto `admin/(work)/` e 28 voci in lista. L'albero ne ha 26 e la lista 34. Un conteggio vecchio scritto senza data si legge come corrente.
- **Fix:** rimisura datata accanto all'originale — **26 = 1 redirect + 19 dichiarate + 6 di altre fasi**, e 34 voci su tutto `src/app`. L'originale non e' stato cancellato.

---

**Totale deviazioni:** 3 auto-fix (1 bloccante, 2 di consistenza).
**Impatto:** nessuno scope creep. Nessun file sotto `src/` aperto.

## Issues Encountered

Nessuno. Il piano aveva gia' misurato l'esito di ogni passo su una copia dell'albero (`42-RESEARCH.md` §2.7), e l'esecuzione ha riprodotto esattamente quei numeri sull'albero vero — incluso il rosso di check F sulle sei pagine, che il piano dichiarava in anticipo come input del task 2 invece di scoprirlo.

## Vincolo d'ordine di fase — rispettato

Nessun file dello scanner, della porta o di `ScanFlash.tsx` e' stato aperto. `git status --porcelain -- src/` e' vuoto. La conversione dello scanner resta bloccata dietro la porta vera, come il roadmap pretende.

## Known Stubs

Nessuno. Questo piano non aggiunge superfici ne' dati: modifica due script di gate e scrive un documento di pianificazione.

## Next Phase Readiness

- **Pronto:** lo strumento con cui la fase 42 dovra' provare la propria conversione misura di nuovo, e la sua aritmetica chiude senza residui. Ogni pagina dell'albero sta in esattamente un bucket.
- **Aperto, e non risolto qui:** l'attribuzione delle sei pagine alle fasi 44 e 45 e' una lettura (assunzione A3). Se il proprietario decide che la 42 le assorbe, il perimetro cresce di sei superfici — decisione sua, registrata in DEF-42-01.
- **Aperto per chi convertira' lo scanner:** il recinto `PHASE_42_PATHS` e' ancora in piedi con le sue due pagine, e non ha la staleness refusal che `PENDING_SURFACES` ha ora. Non e' un difetto — quel recinto si scioglie per mano del piano scritto per scioglierlo — ma quando si sciogliera', il nuovo pattern e' li' da riusare.
- **Vincolo invariato:** la conversione dello scanner attende la porta vera. Nulla in questo piano l'ha anticipata.

## Self-Check: PASSED

---
*Fase: 42-scanner-conversion*
*Completato: 2026-08-18*
