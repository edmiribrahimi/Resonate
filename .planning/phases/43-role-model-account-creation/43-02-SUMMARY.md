---
phase: 43-role-model-account-creation
plan: 02
subsystem: testing
tags: [capabilities, rls, postgres, verification, node, mutation-testing]

# Dependency graph
requires:
  - phase: 32-capability-model-in-the-database
    provides: "private.capabilities, private.role_capabilities, private.has_capability, e scripts/verify-capabilities.mjs con le sue quattro facce"
provides:
  - "Una quinta faccia in scripts/verify-capabilities.mjs che legge private.role_capabilities e la confronta con una dichiarazione pre-registrata"
  - "ROLE_GRANTS: 24 coppie (ruolo x capability), 16 concessioni con il loro requires_approved, 8 rifiuti"
  - "Un rilevatore automatico per una grant row sbagliata — il primo in questo repository"
  - "I due flag false di door.operate fissati con la ragione di D-06 accanto al valore"
affects: [43-04, 43-05, 43-06, 43-07, 43-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Il rifiuto e' l'assenza di una riga, dichiarata nello script — mai una colonna granted"
    - "Una sola funzione pairKey() costruisce la chiave per entrambe le meta' di un confronto"
    - "L'aritmetica della dichiarazione (24/16/8) e' asserita come numero prima di leggere qualunque database"

key-files:
  created: []
  modified:
    - scripts/verify-capabilities.mjs

key-decisions:
  - "Opzione (c) di RESEARCH § Pattern 3: il rifiuto vive nello script, non nel database — nessuna colonna granted, perche' l'EXISTS del resolver non la leggerebbe e una riga granted = false concederebbe la capability"
  - "Le tre mutazioni della riga sono state iniettate con una migration di scratch osservata solo con --target=container: la produzione non e' mai stata scritta"
  - "La mutazione C e' stata eseguita in due tempi, perche' la sola rimozione di una coppia scatta sulla guardia aritmetica prima di arrivare all'asserzione 4"

patterns-established:
  - "Prova per mutazione registrata nel file stesso: il commento di side 5 elenca le tre direzioni provate, con la data"
  - "Ogni messaggio di fallimento finisce nominando cio' che NON e' stato misurato (forma di seed.mjs:317-324)"

requirements-completed: [ROLE-01]

# Metrics
duration: 95min
completed: 2026-08-08
---

# Phase 43 Plan 02: La quinta faccia di verify-capabilities Summary

**`npm run verify:capabilities` legge ora le grant rows e le confronta con una dichiarazione pre-registrata di 24 coppie: una riga sbagliata ha per la prima volta in questo repository un rilevatore automatico, provato per mutazione in tre direzioni e verde prima che nulla cambi.**

## Performance

- **Duration:** ~95 min
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- **Il rilevatore esiste prima della cosa che deve rilevare.** Le due facce che i piani 43-05 (le righe di `staff`) e 43-07 (la nona capability) modificheranno sono ora coperte, e la copertura e' **verde oggi** — che e' cio' che la rende un rilevatore e non una descrizione dello stato attuale.
- **D-02 smette di essere una convenzione.** Ogni coppia `(ruolo x capability)` del prodotto cartesiano e' una concessione con il suo `requires_approved` o un rifiuto dichiarato. Una capability coniata senza una decisione per ciascun ruolo, o un ruolo introdotto senza una decisione per ciascuna capability, fallisce l'asserzione 4: *considerato e rifiutato* e' distinguibile da *dimenticato* per meccanismo, non per commento.
- **D-06 ha un filo d'inciampo.** Un `requires_approved` di `door.operate` portato a `true` fa fallire l'asserzione 2 con un messaggio che nomina la *trap to refuse* del ROADMAP (`:235-241`) e il *"These two rows must not become true"* della migration (`20260807000000_capability_model.sql:415`). Chi arriva a rimuovere il flag incontra la ragione prima del valore.
- **La trappola dell'allargamento silenzioso e' nominata dove verra' proposta.** Il commento di `ROLE_GRANTS` riporta l'`EXISTS` del resolver per intero e spiega perche' una riga `granted = false` **concederebbe** la capability invece di negarla.
- **Il racconto che lo script fa di se stesso e' tornato vero.** I due paragrafi che dichiaravano `private.role_capabilities` mai letto sono stati riscritti nello stesso commit che li ha resi falsi; resta in piedi la parte ancora vera — un verde non dice che una policy e' corretta.

## Task Commits

1. **Task 1: la dichiarazione pre-registrata — 24 coppie, 16 concessioni, 8 rifiuti** — `291447e` (feat)
2. **Task 2: la quinta faccia — leggere le grant rows e confrontarle nelle due direzioni** — `219ab59` (feat)
3. **Task 3: la prova per mutazione, registrata nel file** — `23e07e0` (test)

## Files Created/Modified

- `scripts/verify-capabilities.mjs` — `ROLE_GRANTS` e la sua aritmetica; `pairKey()`; `readGrants()`; la clausola GRANT del rifiuto su faccia vuota; la sezione `5 ·` con tre asserzioni; header, nota di chiusura e conteggi portati a cinque facce.

## Il verde prima del cambiamento — per i piani 43-04 e 43-06

Misurato **prima** di qualunque modifica alle grant rows, su entrambi i target:

```
  ✓ 5 · every role holds exactly the declared set of capabilities
      16 grants and 8 refusals over 3 roles × 8 keys, both directions, 16 rows read

5/5 green, 0 warnings.
```

- `npm run verify:capabilities` (produzione, Management API, `read_only`) → exit 0
- `npm run verify:capabilities -- --target=container` (container usa e getta, 39 migration applicate) → exit 0
- `npm run build` → passa

Quando 43-05 inserira' le righe di `staff` e 43-07 coniera' la nona capability, questo e' lo stato da cui partono: il rilevatore funzionava.

## Le tre mutazioni, verbatim

`ai-engineering.md`, gate *prova per mutazione*: questo progetto ha un precedente registrato di un verde letto da una mutazione non applicata, quindi **ogni mutazione e' stata confermata applicata prima di leggerne l'esito**.

### Mutazione A — un rifiuto dichiarato acquisisce una riga (l'allargamento)

Confermata applicata con `git status --porcelain` → `?? supabase/migrations/29999999999999_probe_wrong_grant.sql`. Osservata **solo** con `--target=container`. Exit code **1**:

```
  ✗ 5 · every role holds exactly the declared set of capabilities
      member × door.operate is a DECLARED REFUSAL but HAS A ROW in private.role_capabilities (requires_approved = false) — THIS IS A WIDENING. private.has_capability matches on (role, capability) alone (20260807000000_capability_model.sql:209-216): there is no `granted` column in that EXISTS, so the row GRANTS the capability whatever it was meant to express. Every member now holds "door.operate" in every policy and every caller that asks for it, at once. Which policies those are was not measured here — side 2 lists the keys policies ask for, and src/ asks for more.
      Look at the capability model and at the migration that changed it, NOT at ROLE_GRANTS. Editing the declaration to agree with the database is editing the detector to agree with what it was built to detect.
FAILED 1/5: 5 · every role holds exactly the declared set of capabilities
```

File cancellato; run container successiva **5/5 green**.

### Mutazione B — una concessione dichiarata perde la sua riga

Confermata applicata con `git status --porcelain` → `?? supabase/migrations/29999999999999_probe_lost_grant.sql`. Exit code **1**:

```
  ✗ 5 · every role holds exactly the declared set of capabilities
      organizer × door.operate is a DECLARED GRANT with NO ROW in private.role_capabilities — THE ROLE SILENTLY LOST A CAPABILITY. This one is the door: the loss shows up as a refusal in front of a queue, at two in the morning, on a phone. Whether any OTHER source would still grant it was not measured — private.has_capability has exactly one source today, so there is none.
```

E' la direzione che conta alla porta, ed e' stata mostrata scattare. File cancellato; run container successiva **5/5 green**.

### Mutazione C — una coppia resta non contabilizzata

Eseguita contro **produzione**, in due tempi, perche' la sola rimozione di una voce da `ROLE_GRANTS` scatta prima sulla guardia aritmetica.

**C1** — rimossa la voce `member × door.operate`. Confermata applicata con `git diff --stat scripts/verify-capabilities.mjs` → `1 file changed, 1 deletion(-)`. Exit code **1**:

```
FATAL: the pre-registered grant declaration does not add up, so nothing below it is the expectation that was reviewed:
  - ROLE_GRANTS declares 23 pairs, expected 24 (3 roles × 8 capabilities).
  - ROLE_GRANTS declares 7 refusals, expected 8.
A role or a capability added without a decision for each of its counterparts fails here. Look at the capability model and at phase decision D-02, NOT at the totals. Nothing was measured against any database.
```

**C2** — abbassati anche i due totali a 23 e 7, cioe' la forma esatta di *"qualcuno fa tornare i conti per far passare il check"*. Confermata applicata con `git diff --stat` → `1 file changed, 2 insertions(+), 3 deletions(-)`. Exit code **1**, questa volta dall'asserzione 4, che **nomina la coppia**:

```
  ✗ 5 · every role holds exactly the declared set of capabilities
      member × door.operate is UNACCOUNTED: the catalogue holds "door.operate" and ROLE_GRANTS decides nothing for member. A capability minted without a decision for each role is exactly what D-02 forbids — "considered and refused" must be distinguishable from "forgotten", and silence is the second. Whether the database has a row for this pair was not measured, because there is nothing to compare it against.
```

Voce e totali ripristinati; `git status --porcelain` vuoto; `ls supabase/migrations/ | grep -c "^2999"` → `0`.

## Decisions Made

- **Opzione (c), non (a) e non (b).** Il rifiuto e' dichiarato nello script e nel database e' l'assenza di una riga. Nessuna colonna `granted` e' stata aggiunta ne' proposta: l'`EXISTS` di `private.has_capability` (`20260807000000_capability_model.sql:209-216`) non la legge, quindi una riga `granted = false` **concederebbe** la capability in tutte e 45 le call site delle policy in una volta sola. Il commento della costante lo scrive per esteso, perche' e' una proposta che qualcuno fara' in buona fede.
- **Le mutazioni sulle righe non toccano la produzione.** A e B sono state iniettate con una migration di scratch con prefisso `2999…` — che ordina per ultima — e osservate solo con `--target=container`, che costruisce un database usa e getta. La produzione e' stata solo letta, sempre in `read_only`.
- **La mutazione C in due tempi.** Il piano chiedeva exit 1 che nominasse la coppia non contabilizzata; la sola rimozione della voce scatta prima sulla guardia aritmetica. Mostrare entrambi i gradini e' piu' informativo di aggirare il primo: prova sia che la guardia aritmetica funziona, sia che chi la aggira incontra comunque l'asserzione 4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tre byte NUL dentro i template literal della chiave di coppia**

- **Found during:** Task 2 (la quinta faccia)
- **Issue:** Il commit di Task 1 (`291447e`) conteneva tre byte `U+0000` al posto dello spazio dentro `` `${role} ${capability}` ``. Le due meta' del confronto costruivano quindi chiavi diverse: la prima esecuzione ha riportato **tutte e 24 le coppie non contabilizzate e tutte e 16 le concessioni mancanti**, contro una dichiarazione interamente corretta. Un falso rosso, invisibile in un diff e in una review — e nella direzione opposta lo stesso difetto avrebbe certificato come funzionante un confronto morto.
- **Fix:** Introdotta `pairKey(role, capability)`, l'unico punto in cui una coppia diventa una chiave di Map, chiamata da entrambe le meta' di ogni confronto. Le voci della dichiarazione conservano `role` e `capability` come **campi**, quindi nessun messaggio di fallimento ricava piu' un ruolo spezzando una stringa. Il commento della funzione registra l'incidente.
- **Files modified:** `scripts/verify-capabilities.mjs`
- **Verification:** `node -e` sul file → zero byte NUL residui; entrambi i target 5/5 green; le tre mutazioni scattano nominando la coppia giusta.
- **Committed in:** `219ab59` (commit di Task 2, dichiarato nel messaggio)

**2. [Rule 2 - Missing Critical] La clausola GRANT nel rifiuto su faccia vuota**

- **Found during:** Task 2
- **Issue:** Una `private.role_capabilities` vuota **nega tutto** — `has_capability` risponde `false` per ogni soggetto e ogni chiave — mentre una faccia 5 che confrontasse solo le righe trovate avrebbe riportato *"8 rifiuti confermati"*: vero e inutile.
- **Fix:** Aggiunta la quinta clausola al rifiuto pre-confronto, con la sua ragione scritta accanto.
- **Files modified:** `scripts/verify-capabilities.mjs`
- **Verification:** Il rifiuto e' nella stessa forma delle quattro clausole esistenti, che il piano indicava come modello.
- **Committed in:** `219ab59`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Nessun allargamento di perimetro. Il primo fix e' la ragione per cui questo check misura qualcosa; il secondo chiude il caso in cui misurerebbe zero e lo chiamerebbe verde.

## Issues Encountered

- **La faccia 5 ha misurato falso-rosso alla prima esecuzione.** Documentato sopra come deviazione 1. Vale la pena isolarne la lezione: il confronto era corretto in ogni sua riga leggibile e sbagliato in un carattere che nessuna review mostra. E' la stessa lezione delle quattro facce — una cosa scritta in due posti senza nulla in mezzo e' gia' divergente — un livello piu' giu', dentro lo script che quella lezione esiste per applicare.

## Note operative

- **Nessun test runner.** `CLAUDE.md` Guardrail 1: questo piano non ne aggiunge e nulla qui e' verificato da test. La verifica e' `npm run build` (che include il typecheck) piu' le esecuzioni dello script sui due target, riportate sopra con exit code.
- **Nessuna dipendenza aggiunta.** Lo script resta a soli built-in di Node; `package.json` non ha guadagnato ne' una dipendenza ne' una voce di script — `verify:capabilities` esisteva gia'.
- **Nessuna riga di `profiles` letta.** La faccia 5 legge tre colonne di design: un'etichetta di ruolo, una chiave di catalogo e un booleano. Nessun membro e nessuno staff e' nominato o contato, il che e' cio' che tiene questo script stampabile su un repository pubblico.

## User Setup Required

None — nessuna configurazione di servizi esterni richiesta.

## Next Phase Readiness

- **43-05** (le righe di `staff`) e **43-07** (la nona capability) hanno ora il gate che li misura. Entrambi devono aggiungere le proprie voci a `ROLE_GRANTS` — inclusi i sei rifiuti di `staff` — nello stesso commit che tocca il modello, o l'asserzione 4 fallisce nominando ogni coppia lasciata in silenzio.
- **Rimane aperta la domanda A.3 di `43-RESEARCH.md`:** `membership.active` per `staff` e' l'unica delle otto capability che D-02 non decide. Non e' questo piano a deciderla; quando verra' decisa, la decisione ha un posto dove essere scritta.
- **Nessun blocco.** Entrambi i target verdi, working tree pulito, nessuna migration di scratch sopravvissuta.

## Self-Check: PASSED

- `scripts/verify-capabilities.mjs` — presente e modificato
- `291447e`, `219ab59`, `23e07e0` — presenti in `git log`
- `ls supabase/migrations/ | grep -c "^2999"` → `0`
- `git status --porcelain` → vuoto prima di questo documento

---
*Phase: 43-role-model-account-creation*
*Completed: 2026-08-08*
