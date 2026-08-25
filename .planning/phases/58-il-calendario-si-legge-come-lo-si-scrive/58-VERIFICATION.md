---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
verified: 2026-08-25T00:00:00Z
status: human_needed
score: 12/14 requisiti chiusi da evidenza verificabile, 2 chiusi in parte (dipendono da un atto umano futuro)
overrides_applied: 0
human_verification:
  - test: "Esercitare P-58-C (passi 1-7) — il rientro dall'istantanea dopo uno specchio interrotto"
    expected: "Un'osservazione scritta per ognuno dei sette passi, con i conteggi del passo 2 riconfermati al passo 6, o il ritrovamento scritto per esteso se l'istantanea manca. Al termine, `MIRROR_RESTORE_PATH_VERIFIED` puo' passare a `true` solo dopo che questa procedura ha rimesso DAVVERO una spunta"
    why_human: "P-58-C SCRIVE IN PRODUZIONE (via lo strumento di restore) e richiede o un incidente reale (una corsa morta a meta') o una seduta datata con l'autorizzazione del proprietario per esercitarla a comando (R15 in `verify-mirror-guards.mjs`). Nessun agente automatico puo' autorizzare o simulare un atto su produzione"
  - test: "R15 in `npm run verify:mirror-guards` — il rientro che rimette DAVVERO una spunta, con attore e istante originali riletti dal catalogo"
    expected: "Uscita 0, l'attore e l'istante della spunta ripristinata identici a quelli pre-schianto, letti con uno strumento diverso da quello che ha scritto"
    why_human: "Il gate stesso dichiara R15 'RIMANDATO a un esercizio datato, con la sua autorizzazione — scrive righe di produzione: e' un atto, e non ne esiste l'autorizzazione'. Confermato eseguendo il gate: `– R15 ... RIMANDATO`"
  - test: "R16 in `npm run verify:mirror-guards` — l'importatore rifiuta per la guardia della corsa non presidiata, cablaggio completo"
    expected: "Uscita 2, categoria `unattended_state_at_risk`, zero scritture, con una sorgente registrata e credenziali reali davanti alla guardia"
    why_human: "Il gate dichiara R16 'RIMANDATO a una corsa con sorgente registrata e credenziali' — la sorgente vive SOLO in una variabile d'ambiente di produzione (ICS-09) e non e' accessibile a un agente automatico senza le stesse credenziali del proprietario"
  - test: "La strada (2) della voce 11-bis: autorizzazione a coniare una sessione reale, o accesso diretto di uno dei due ruoli titolari alla superficie del calendario di produzione"
    expected: "Una seconda lettura, dalla superficie stessa, che corrobori le letture gia' prese dal catalogo ai passi 14/19/24 di P-58-A/P-58-B — utile per ogni futura esecuzione presidiata, non solo per questa"
    why_human: "La superficie risponde `307 → /login` a ogni richiesta anonima; i due soli conti che la aprono sono account di persone. Coniare una sessione e' un atto che richiede l'autorizzazione datata del proprietario, nella forma che `npm run verify:refusal` gia' pretende per se stesso"
---

# Fase 58 — Il calendario e' uno specchio — Verification Report

**Phase Goal:** cio' che viene dal calendario si cancella e si riscrive dal file, per
quel calendario — con due sole eccezioni di stato nominate, una di sopravvivenza,
e una lettura dei titoli che capisce cosa sta specchiando.

**Verified:** 2026-08-25
**Status:** human_needed
**Re-verification:** No — initial verification

## Nota di metodo

Questo repository non ha un test runner per il prodotto (`meta-gates.md`, §Il
gate della verifica). Ho **ri-eseguito io stesso**, in questa sessione, ogni
gate automatico dichiarato dall'orchestratore invece di limitarmi a citarne
l'esito — `npm run build`, `npm run verify`, `npm run verify:calendar-surface`,
`npm run verify:mirror-guards`, `npm run verify:ics`, `npm run verify:persona`
— e i risultati coincidono con quelli dichiarati. Dove il gate non e'
ri-eseguibile da questa sessione (letture dal catalogo Supabase con
`read_only: true`, azioni sulla superficie di produzione, l'esecuzione di
`P-58-A`/`P-58-B`), ho letto `58-PROCEDURES.md` e `deferred-items.md` come
**evidenza scritta di un'osservazione**, non come un'affermazione del SUMMARY —
sono `Result` compilati con conteggi, istanti e riscontri incrociati fra
strumenti diversi (client di servizio vs Management API), non narrazione.

## Goal Achievement

### Observable Truths (per requisito)

| # | Requisito | Truth | Status | Evidenza |
|---|---|---|---|---|
| 1 | ICS-01 | Lo specchio cancella e riscrive dal file, senza timbri di assenza ne' aggiornamento campo per campo | ✓ VERIFIED | `src/lib/production/ics/reconcile.ts:773` `MIRROR_DELETION_ORDER`; `:1008-1240` le tre eccezioni separate dalla cancellazione totale; `npm run verify:ics` check **E** (ri-eseguito): *"first mirror 14 plans · 65 pieces · 47 commitment rows · 106 checklist items; a second mirror of the same file: the SAME set of rows ... 232 rows compared field by field ... 0 plan row(s) survived the deletion"*. Osservato in produzione: `58-PROCEDURES.md:677` (passo 20), uscita `0`, 42 passi di scrittura |
| 2 | ICS-01b | La guardia sul progressivo sopravvive allo specchio, in applicazione | ✓ VERIFIED | `scripts/import-production-calendar.mjs:2224-2322` — `--reauthorise-renumbering`, categoria `renumber_refused`, zero scritture se non riautorizzato. Chiuso per **mutazione** (58-09-SUMMARY.md: *"ICS-01b nell'applicazione, provata per mutazione: uscita 2, categoria renumber_refused, zero scritture"*), non dalla procedura (voce 11 di `deferred-items.md`: *"ICS-01b e' comunque provato altrove — piano 58-09, per mutazione del codice — e non dipende da questa voce"*). Osservato anche a runtime: `58-PROCEDURES.md:825` (passo 22), popolazione **9**, nessun rifiuto ne' riautorizzazione nel referto di una corsa che ha girato pulita |
| 3 | ICS-02 | Lo scopo si dichiara, vocabolario chiuso di tre chiavi, nessuna default | ✓ VERIFIED | `src/lib/production/ics/vocabulary.ts` (`CALENDAR_KEYS`); migration `20260820121000_production_calendar_key.sql` + `20260820123000_production_calendar_key_not_null.sql` — `calendar_key SET NOT NULL` su tre tabelle. Orchestratore: 4 migration flaggate da schema-drift lette live come applicate (letto con `read_only: true`) |
| 4 | ICS-03 | Due sole eccezioni di stato — spunte e legame — riagganciate per `source_uid`, mai ricreate | ✓ VERIFIED (evidenza da procedura) | `58-PROCEDURES.md` passi 8-15 (P-58-A) ESEGUITI il 2026-08-22: passo 11 osservato dal ruolo titolare (*"la casella e' rimasta spuntata"*), corroborato indipendentemente dall'istantanea pre-cancellazione (stesso istante `2026-08-20T21:36:38Z`, due percorsi indipendenti); passo 15 ripristina per chiave stabile `(source_uid, kind, label)`, mai `record_checklist_tick` |
| 5 | ICS-03b | Eccezione di sopravvivenza: una riga di piano con legame non si cancella mai | ✓ VERIFIED (codice + procedura) | `src/lib/production/ics/reconcile.ts:1195-1300` (`ICS-03b`, D-58-02); `58-PROCEDURES.md` passi 16-24 (P-58-B) ESEGUITI: passo 21 misura **1 → 2** righe fuori dalla rimozione, passo 24 rimuove la sonda per chiave primaria e riconferma **11** righe di piano tornate |
| 6 | ICS-04 | Un nome dove la grammatica pretende la sigla si risolve dalla mappa alias | ✓ VERIFIED | `src/lib/production/ics/classify.ts:111-238` (grammatica dei tre pattern + `alias_unresolved` mai indovinato); `npm run verify:ics` check **B/C** verdi; alias effettivamente popolati in produzione (riparazione 58-15, tabella con `RSNT`/`RSNT-PRLN`/`RMDB-BZ` — 3 serie con alias, da 1) |
| 7 | ICS-05 | Un pezzo senza numero si aggancia dalla data | ✓ VERIFIED | `src/lib/production/ics/reconcile.ts:1455` `attachNumberlessPieces`; `verify:ics` check D: *"timetable 7/7 on the night itself"* |
| 8 | ICS-06 | Le proposte si ricalcolano a ogni import, e la superficie lo dichiara | ✓ VERIFIED | `verify:calendar-surface` **U11** (ri-eseguito, verde): *"the recomputation is declared once, conditioned on the rows, without emphasis"* |
| 9 | ICS-07 | L'audit non si allarga, la riga che lo fa fallire e' riscritta | ✓ VERIFIED | Voce 18 di `deferred-items.md`: riparato **dicendo meno** (tre righe riformulate), *"nessuna regola allargata, nessuna lista di esenzioni"*; `verify:ics` check F: *"0 four-digit years"*, residuo confrontato coi token stampati |
| 10 | ICS-08 | `Timetable` nudo aggancia per data, `non classificata` se il giorno non porta una serata | ✓ VERIFIED | `verify:ics` check D verde su timetable e recap; regola gia' esistente `RSNT / timetable / self / on` invariata |
| 11 | ICS-08b | `Flyering` settimo tipo, quattro punti nello stesso commit | ✓ VERIFIED | `verify:ics` check G: *"25 declared members across 7 vocabularies"* (7, non 6); `classify.ts:232` — flyering orfano dichiarato, `conforms_to_rule: null` mai `false` |
| 12 | ICS-09 | La sorgente e' un indirizzo, solo in variabile d'ambiente, senza sorgente rifiuta | ✓ VERIFIED | `scripts/import-production-calendar.mjs` legge da env; voce 4 di `deferred-items.md`, CHIUSA il 2026-08-20; `verify:mirror-guards` R3 e famiglia rifiuti verdi |
| 13 | ICS-10 | Cron autonomo, guardia (a) feed vuoto/piccolo rifiuta, guardia (b) esito+ora ultimo specchio riuscito PER CHIAVE visibile, fallimento distinguibile | ✓ VERIFIED | (a) `mirrorGuard` in `guard.ts`, verificato in produzione con `mtnlb` (voce 10, feed vuoto → uscita 2, `feed_empty`, nulla scritto). (b) `src/app/(admin)/admin/calendar/ImportRunSummary.tsx:29-58` — tre stati per chiave dichiarati per contratto; `src/app/(admin)/admin/(work)/calendar/page.tsx:216-268` — una query **per chiave** (`CALENDAR_KEYS.map`), mai un solo ultimo run, tre esiti (righe/zero righe/lettura fallita) mai collassati in due. `route.ts:1475-1476` — auth `Bearer ${CRON_SECRET}` → 401 senza segreto (ri-confermato leggendo il file) |
| 14 | ICS-10b | Cinque difese: corpo del feed mai stampato (provato sul sorgente), nessuna persistenza/cache, errori per categoria, link segreto host compreso, nessun controllo di caricamento sulla superficie | ✓ VERIFIED | Difesa 1: `scripts/verify-calendar-surface.mjs` **U12** (ri-eseguito, verde) — analisi strutturale su `route.ts` + `import-production-calendar.mjs`, cerca ogni identificatore legato al testo di una risposta e verifica che non raggiunga un emettitore; fallisce (non passa in silenzio) se non trova nessun identificatore da misurare. Difesa 5: `verify:calendar-surface` **U2** invariato (nessun input file, nessun drop target) |

**Score:** 14/14 requisiti hanno evidenza di implementazione verificata nel codice e nei gate. **2 di essi (ICS-03/ICS-03b) restano chiusi solo per la meta' "il meccanismo esiste e ha funzionato su una corsa presidiata" — la meta' "il meccanismo regge anche quando la corsa muore a meta'" resta un atto umano non ancora compiuto** (vedi Human Verification).

### Perche' lo status non e' `passed`

`58-PROCEDURES.md` frontmatter, riga `phase_closes`, e' un contratto scritto
dalla fase su se stessa: *"non prima che ogni `Result` qui sotto porti
un'osservazione."* Ho contato i `Result` nel file: **17 su 24 portano
un'osservazione** (tutti quelli di P-58-A e P-58-B); **7 su 24 sono `pending`**,
e sono **tutti e soli** i sette passi di `P-58-C` — il rientro dopo uno specchio
interrotto a meta'.

Questo non e' un difetto di codice: `unattendedMirrorGuard`
(`src/lib/production/ics/guard.ts`) e' provato per mutazione (`verify:mirror-guards`,
famiglie U0-U16, **tutte verdi in questa sessione**) e rifiuta correttamente
una corsa non presidiata quando c'e' uno stato a rischio — quindi il sistema
**non e' esposto** nel frattempo. Ma **due casi restano dichiarati rimandati e
mai esercitati**: `R15` (il rientro che rimette DAVVERO una spunta, riletta dal
catalogo con lo stesso attore e istante) e `R16` (il rifiuto end-to-end
dell'importatore per la guardia, con sorgente e credenziali vere). Il gate
stesso lo dice, ri-eseguito in questa sessione:

```
– R15  il rientro rimette davvero una spunta, con l'attore e l'istante originali
        RIMANDATO a un esercizio datato, con la sua autorizzazione — scrive righe
        di produzione: e' un atto, e non ne esiste l'autorizzazione
– R16  l'importatore rifiuta per la guardia della corsa non presidiata
        RIMANDATO a una corsa con sorgente registrata e credenziali
```

E `MIRROR_RESTORE_PATH_VERIFIED` (letto in `route.ts` e citato per nome in
`deferred-items.md` voce 3 e voce 21) **resta `false`**: nessuno ha ancora
visto il rientro rimettere una riga vera. Finche' vale `false`, il cron
**non specchia `rsnt`** per dichiarazione esplicita (`MIRRORED_TODAY.rsnt.reason
= "state_needs_a_person"`), che e' esattamente la forma onesta — dichiarare il
limite invece di correre il rischio in silenzio — ma e' anche la prova che
**il goal della fase (uno specchio automatico, sicuro anche quando muore a
meta') non e' ancora vero per la chiave che oggi porta stato reale**.

Questi sono atti su produzione che richiedono l'autorizzazione datata del
proprietario e, per `R15`/`P-58-C`, o un incidente reale o una sessione
deliberata — nessuno dei due e' qualcosa che un agente di verifica puo'
eseguire o simulare senza travisare l'evidenza (la voce 3 del file lo vieta
esplicitamente per lo stesso tipo di scorciatoia sul terminale, vedi voce 20).
Per questo lo status e' **`human_needed`**, non `gaps_found`: non manca codice,
manca un'osservazione che solo una persona autorizzata puo' produrre.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/lib/production/ics/reconcile.ts` | Lo scrittore-specchio, le tre eccezioni | ✓ VERIFIED | 2151 righe, `MIRROR_DELETION_ORDER` (:773), `ICS-03b` (:1195-1300), riaggancio spunte/legami (:1008-1240) |
| `src/lib/production/ics/classify.ts` | Grammatica dei titoli, mappa alias | ✓ VERIFIED | Tre pattern (:227-238), `alias_unresolved` mai indovinato |
| `src/lib/production/ics/guard.ts` | `mirrorGuard`, `unattendedMirrorGuard` | ✓ VERIFIED | Importato in `route.ts` e in `import-production-calendar.mjs`; provato per mutazione (`verify:mirror-guards`) |
| `scripts/import-production-calendar.mjs` | Rifiuti in ordine, `--reauthorise-renumbering`, sorgente da env | ✓ VERIFIED | :278-281 (flag), :2224-2322 (guardia progressivo) |
| `scripts/restore-mirror-snapshot.mjs` | Lo strumento del passo 5 di P-58-C | ✓ VERIFIED (esiste, mai esercitato su un vero schianto) | `npm run restore:mirror-snapshot -- --from <path> --calendar <key>`; dry-run di default, richiede `--apply`; **R15 lo lascia non esercitato** |
| `src/app/api/cron/production-mirror/route.ts` | Cron autenticato, esiti chiusi, `MIRRORED_TODAY` | ✓ VERIFIED | :1475-1476 (401 senza `CRON_SECRET`), :271-317 (`MIRRORED_TODAY` totale su `CALENDAR_KEYS`) |
| `src/app/(admin)/admin/calendar/ImportRunSummary.tsx` | Tre stati per chiave, mai un solo ultimo run | ✓ VERIFIED | Docblock :29-90 dichiara il contratto; nessun titolo/UID grezzo (regola 3) |
| `scripts/verify-calendar-surface.mjs` (U12) | Nessun byte del feed raggiunge stampa/rifiuto/risposta | ✓ VERIFIED | Ri-eseguito: 12/12 check verdi, incluso U12 |
| `scripts/verify-mirror-guards.mjs` | I predicati delle due guardie, provati per mutazione | ✓ VERIFIED (con R15/R16 dichiarati rimandati) | Ri-eseguito: `MIRROR_GUARDS_OK`, 3 casi rimandati e dichiarati (R4→P-58-B gia' chiuso, R15, R16) |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `route.ts` | `guard.ts` | `unattendedMirrorGuard` applicata dopo il piano, prima di qualunque cancellazione | ✓ WIRED | :1085 `unattendedMirrorGuard({...})`, prima di ogni scrittura |
| `admin/(work)/calendar/page.tsx` | `production_import_run` | una riga per chiave (`CALENDAR_KEYS.map`), mai un solo ultimo run | ✓ WIRED | :216-268, tre esiti mai collassati |
| `import-production-calendar.mjs` | variabile d'ambiente | sorgente registrata, mai file esportato a mano | ✓ WIRED | rifiuta senza sorgente (voce 4, chiusa) |
| `reconcile.ts` | `production_calendar_access.sql` (`record_checklist_tick`) | il ripristino **non** deve passare da questa funzione | ✓ WIRED (verificato negativamente) | passo 15 di `58-PROCEDURES.md` conferma per iscritto di non averla usata; `restore-mirror-snapshot.mjs` scrive `ticked_by`/`ticked_at` diretti |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `ImportRunSummary.tsx` | `mirrorStates` | `perKeyReads` ← query Supabase per `calendar_key`, letta in `page.tsx:218-268` | Si' — tre letture reali dal catalogo, non simulate | ✓ FLOWING |
| `route.ts` `MIRROR_REPORT` | `MIRRORED_TODAY[calendarKey]` | dichiarazione statica per chiave, non calcolata dal feed | Dichiarazione intenzionale (non e' un bug: e' la difesa che impedisce a `rsnt` di essere specchiata da un processo non presidiato) | ✓ FLOWING (per costruzione dichiarata) |

### Behavioral Spot-Checks

| Behaviour | Command | Result | Status |
|---|---|---|---|
| Build compila, la rotta cron e' registrata | `npm run build` | `✓ Compiled successfully`; `ƒ /api/cron/production-mirror` presente nell'elenco delle route | ✓ PASS |
| U12 (D-58-07 difesa 1) protegge davvero i due file che leggono il feed | `npm run verify:calendar-surface` | `CALENDAR_SURFACE_OK — 12 check(s) passed`, incluso `U12` | ✓ PASS |
| Le due guardie dello specchio rispondono come dichiarato, mutazione per mutazione | `npm run verify:mirror-guards` | `MIRROR_GUARDS_OK — ogni caso esercitabile e' come dichiarato. 3 caso/i rimandato/i` | ✓ PASS (con rimandati dichiarati, non nascosti) |
| Il lettore concorda col file di calendario reale | `npm run verify:ics` | `ICS_IMPORT_OK — all 9 checks passed` | ✓ PASS |
| La persona resta coerente (indice, path, budget, materiale privato) | `npm run verify:persona` | `7/7 verdi` | ✓ PASS |
| Suite completa | `npm run verify` | 23 passati, 1 FALLITO (`verify:touch-targets`, `GuestTokenDisplay.tsx:689,702`, ultimo commit `212ead9`, fase 47, 2026-08-20 — precede e non tocca questa fase), 3 non eseguiti con motivazione dichiarata (server, materiale gitignored, autorizzazione a firmare una sessione reale) | ✓ PASS (nel perimetro di questa fase) |

### Probe Execution

Nessuna sonda `scripts/*/tests/probe-*.sh` dichiarata da questa fase. `P-58-A`,
`P-58-B`, `P-58-C` sono procedure **umane** con `Result` scritti a mano in
`58-PROCEDURES.md`, non script eseguibili da questo verificatore — trattate
sopra come evidenza di osservazione, non come probe automatiche.

### Requirements Coverage

Tutti e 14 gli ID richiesti dal prompt compaiono nel campo `requirements` di
almeno un piano (58-01..58-12), e nessuno e' orfano rispetto alla tabella di
ROADMAP.md §58:

| Requirement | Source Plan(s) | Status | Evidence |
|---|---|---|---|
| ICS-01 | 58-02, 58-08, 58-09, 58-11 | ✓ SATISFIED | vedi tabella Observable Truths #1 |
| ICS-01b | 58-01, 58-09, 58-11 | ✓ SATISFIED | vedi #2 — chiuso per mutazione, non dipende dalla procedura |
| ICS-02 | 58-01, 58-07, 58-09, 58-11 | ✓ SATISFIED | vedi #3 |
| ICS-03 | 58-02, 58-08, 58-09, 58-11 | ✓ SATISFIED (evidenza da procedura, meta' scenario) | vedi #4 e nota su `phase_closes` |
| ICS-03b | 58-02, 58-08, 58-09, 58-11 | ✓ SATISFIED (evidenza da procedura, meta' scenario) | vedi #5 |
| ICS-04 | 58-01, 58-03 | ✓ SATISFIED | vedi #6 |
| ICS-05 | 58-02, 58-03 | ✓ SATISFIED | vedi #7 |
| ICS-06 | 58-04, 58-12 | ✓ SATISFIED | vedi #8 |
| ICS-07 | 58-02, 58-05, 58-09, 58-11 | ✓ SATISFIED | vedi #9 |
| ICS-08 | 58-01, 58-06 | ✓ SATISFIED | vedi #10 |
| ICS-08b | 58-01, 58-06 | ✓ SATISFIED | vedi #11 |
| ICS-09 | 58-01, 58-10 | ✓ SATISFIED | vedi #12 |
| ICS-10 | 58-01, 58-10, 58-12 | ✓ SATISFIED | vedi #13 |
| ICS-10b | 58-12 | ✓ SATISFIED | vedi #14 |

Nessun requisito orfano.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `.planning/phases/58-.../58-PROCEDURES.md` | frontmatter `phase_closes` | 7/24 `Result: pending` (tutti P-58-C, passi 1-7) | 🛑 Blocker per la chiusura formale dichiarata dalla fase stessa | Il contratto della fase vieta la chiusura finche' non c'e' un'osservazione per ognuno; nessun marcatore TODO/FIXME/XXX nel codice — questo e' un `Result` pendente dichiarato, non un debito taciuto, e per questo motivo il verdetto e' `human_needed` e non `gaps_found` |
| `deferred-items.md` voce 1 | — | Discrepanza 16 regole nel file della migration vs 14 in tabella live, mai confrontate da nessun controllo | ℹ️ Info | Dichiarata fuori perimetro (58-06 non tocca il seed); non blocca nessun requisito ICS-* di questa fase |
| `deferred-items.md` voce 18 | — | I nomi dei mesi/giorni non sono ancora `publicTokens` nell'audit d'uscita — decisione del proprietario ancora aperta | ℹ️ Info | Riparato "dicendo meno" per ora; rischio di rumore ricorrente se ricapita, dichiarato non nascosto |
| `deferred-items.md` voce 20 | — | L'evidenza di presidio (`stdin.isTTY`) e' stata prodotta allocando un terminale invece che da un umano al tastierino — dichiarato, non nascosto | ℹ️ Info | Non riparato di proposito: la guardia strutturale resta quella che decide finche' `MIRROR_RESTORE_PATH_VERIFIED` non passa a `true` |
| `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx` | 689, 702 | `verify:touch-targets` FALLITO | ℹ️ Info (fuori perimetro) | Ultimo commit `212ead9`, fase 47, 2026-08-20 — precede questa fase e non e' fra i file toccati da nessun piano 58-* |

Nessun `TBD`/`FIXME`/`XXX` non referenziato trovato nei file toccati da questa
fase (`reconcile.ts`, `classify.ts`, `guard.ts`, `route.ts`,
`ImportRunSummary.tsx`, `import-production-calendar.mjs`,
`restore-mirror-snapshot.mjs`).

### Human Verification Required

Vedi la sezione `human_verification` nel frontmatter. In sintesi, tre atti
distinti — tutti scritture o autorizzazioni su produzione che questo
verificatore non puo' compiere ne' simulare senza travisare l'evidenza:

1. **Esercitare `P-58-C`** (i sette passi pendenti), su un incidente reale o su
   una seduta datata autorizzata apposta.
2. **`R15`** in `verify:mirror-guards` — il rientro che rimette davvero una
   spunta, con lo stesso strumento (`restore-mirror-snapshot.mjs --apply`) e
   confronto dal catalogo.
3. **`R16`** — il cablaggio end-to-end del rifiuto dell'importatore con
   sorgente e credenziali vere.
4. **(minore, gia' parzialmente sciolta)** La strada (2) della voce 11-bis, se
   il proprietario vuole che le esecuzioni presidiate future possano leggere
   una seconda volta dalla superficie invece che solo dal catalogo.

Quando `R15` sara' esercitato e `MIRROR_RESTORE_PATH_VERIFIED` passera' a
`true`, tre cose cadono insieme, per costruzione e non per una seconda
decisione: la guardia sulla corsa non presidiata smette di dover essere lei a
decidere, `MIRRORED_TODAY.rsnt` puo' perdere la propria ragione dichiarata (o
restare, se il proprietario sceglie comunque l'atto umano), e i sette `Result`
di `P-58-C` possono finalmente portare un'osservazione.

### Gaps Summary

Non ci sono difetti di codice: ogni requisito ICS-01..ICS-10b ha un artefatto
che lo implementa, un gate che lo prova per mutazione o per lettura del
catalogo dal vivo, e — dove il piano lo prevedeva — un'osservazione scritta a
mano su produzione con conteggi incrociati fra strumenti diversi. `npm run
build`, `verify:calendar-surface`, `verify:mirror-guards`, `verify:ics` e
`verify:persona` sono stati ri-eseguiti in questa sessione e concordano con
quanto dichiarato dall'orchestratore; l'unico rosso della suite completa
precede questa fase e non ne tocca i file.

Quello che manca e' **un'osservazione umana su un atto di produzione**: il
rientro dopo uno specchio interrotto (`P-58-C`) non e' mai stato esercitato
davvero, e i due casi che lo proverebbero (`R15`, `R16`) sono dichiarati
rimandati dal gate stesso, non falsificati e non nascosti. La fase lo sa e lo
scrive di se stessa nel proprio contratto (`phase_closes`); questo report lo
conferma leggendo lo stato attuale del file invece di fidarsi della
dichiarazione. Finche' quell'osservazione non esiste, il goal della fase — uno
specchio automatico e sicuro **anche quando muore a meta'** — resta vero solo
per la parte che un umano ha gia' visto accadere una volta (la corsa che arriva
in fondo), non per la parte che la fase esiste apposta per coprire.

---

_Verified: 2026-08-25_
_Verifier: Claude (gsd-verifier)_
