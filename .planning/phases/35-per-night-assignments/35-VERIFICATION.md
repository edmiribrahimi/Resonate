---
phase: 35-per-night-assignments
verified: 2026-08-09T00:00:00Z
status: human_needed
score: "5/5 truths delivered in code; 2/5 (ASSIGN-04, ASSIGN-06/07) fully closed by automated/container measurement; 3/5 (ASSIGN-01, ASSIGN-02/03, ASSIGN-05) code-complete but their observable half lives on a phone, in a production build, or after a migration nobody has applied — 0 of 13 written manual procedures executed"
must_haves_total: 5
code_in_place: "5/5 roadmap success criteria have matching, reviewed source: party_assignments schema, per-night resolver, door guard second arm (35-22), door.supervise gate, party_credits table"
automated_evidence: "container measurement (orchestrator-run, cited not repeated): verify:capabilities --target=container 5/5 green (12 keys, 26 grants/22 refusals, 4 roles); verify:no-header-identity exit 0; verify:no-credit-account exit 0; verify:media-strip 5/5 checks (MEDIA_STRIP_OK); verify:persona 7/7; npm run build exit 0"
observed_in_production: false
deployed: false
migrations_committed: 9
migrations_applied: 0
manual_procedures_written: 13
manual_procedures_executed: 0
verifier_measurements_run: 0
human_verification:
  - test: "Prova 7 — una persona staff assegnata alla porta RAGGIUNGE lo scanner"
    expected: "Rimbalzo senza assegnazione; ingresso con assegnazione; tre cause di rimbalzo (unavailable/context-stale/not-assigned-here) su tre schermate distinte"
    why_human: "Il rimbalzo avviene nel middleware prima che qualunque pagina esista; nessuna matrice e nessun typecheck lo osserva. Falso-negativo per configurazione finché la riga 14 (20260809005000_live_assignment_flag.sql) non è applicata."
  - test: "Prova 11 — la scansione riceve la notte (chiude il buco trovato da 35-12, chiuso da 35-22)"
    expected: "Caso C (prima della riga 8): master/organizer scansionano invariati, l'assegnatario riceve 403 door_night_unresolved con causa distinta, nessun 503, nessuna scansione bloccata in retry. Caso A/B (dopo la riga 8): l'assegnatario scansiona la propria notte, è rifiutato con door_night_other_night su un'altra notte."
    why_human: "npm run build è verde con zero migration applicate — nessun client è tipizzato con Database, quindi il nome della funzione per-notte non è verificato dal compilatore. Il caso C vive in una finestra che si perde se la coda si applica per prima: ordine non negoziabile C → coda → A/B."
  - test: "Prova 10 — i metadati escono davvero dal file, verso una notte segreta"
    expected: "Nessuna coordinata GPS, data di scatto, modello telefono nell'oggetto scaricato dall'URL pubblico; orientamento preservato; video verso sede segreta rifiutato"
    why_human: "Nessuno strumento del repository apre un file e ne legge l'EXIF. Vale SOLO con la riga 15 (20260809006000_event_media_server_upload_only.sql) applicata — prima di allora la prova misurerebbe un percorso che il browser può ancora aggirare."
  - test: "Prova 3/4 — il rifiuto dell'undo (ASSIGN-05) è una frase distinguibile e la supervisione non si aggira offline"
    expected: "403 con door_supervision_required in build di produzione; radio spenta, l'undo locale rifiuta ad alta voce con lo stesso motivo, senza toccare la coda"
    why_human: "Next redige i messaggi delle Server Action solo in produzione; il ramo offline vive nello stato del dispositivo (ScannerClient.tsx)."
  - test: "Prova 2 — una scansione in coda non resta appesa quando l'assegnazione viene revocata"
    expected: "Il drain giudica a scannedAt; la voce si risolve invece di finire in blocked; la riga di party_assignments resta con revoked_at valorizzato"
    why_human: "La coda vive in IndexedDB, sul dispositivo."
  - test: "Prova 1 — la notte finita nasconde, non vieta, su un dispositivo offline da ore"
    expected: "Bottone QR Scan sparisce dopo ends_at ma nessuna voce di coda sparisce; Scan anyway la fa tornare; una deriva dell'orologio del telefono non rifiuta mai una scansione"
    why_human: "validUntil deve restare una cortesia del client, mai un confine; solo un test su un dispositivo reale con radio spenta lo dimostra."
  - test: "Prova 5 — l'autorizzazione si risolve una volta sola all'apertura (ASSIGN-08)"
    expected: "N scansioni ⇒ N POST /api/tickets/checkin, ZERO chiamate d'autorizzazione separate, misurate nel pannello Network"
    why_human: "\"Quante volte una chiamata parte\" è comportamento del client, osservabile solo da un pannello di rete reale."
  - test: "Prova 12 — l'upgrade IndexedDB v4→v5 su una coda non vuota"
    expected: "Nessuna riga pendingCheckins persa e nessun scannedAt alterato dopo l'upgrade dello schema del client"
    why_human: "Irreversibile: distrugge dati (non codice) se fallisce, e nessun controllo del repo apre un IndexedDB. Il precedente della fase 43 non conta perché nessuno script sa la differenza."
  - test: "Prova 6, 8, 9, 13 — la superficie di assegnazione, l'upload per-notte, l'organizer per-notte, la demozione bloccata"
    expected: "Comportamento visibile solo aprendo l'applicazione: chi vede cosa, quale frase compare, quali serate nomina il rifiuto 23503"
    why_human: "Interfaccia utente; nessun grep osserva un rendering o una frase a schermo."
---

# Phase 35: Per-Night Assignments — Verification Report

**Phase Goal:** What a person can do on one night is granted for that night alone — separate from their account-wide role, and separate from public credit, which grants nothing.
**Verified:** 2026-08-09
**Status:** human_needed
**Re-verification:** No — initial verification

## Come leggere questo verdetto

Questa fase ha già prodotto, dentro se stessa, una dichiarazione di copertura
onesta (`35-HUMAN-UAT.md § La dichiarazione di copertura`) e un registro di
debito differito con nome (`deferred-items.md`, 11 voci). Il compito di questo
documento non è ripeterli: è **verificare indipendentemente, leggendo il
codice**, che quanto dichiarato corrisponda a quanto esiste — e giudicare se
qualcosa che la fase presenta come "scritto" sia in realtà mancante, stub o
scollegato. Non ho trovato divergenze fra la dichiarazione della fase e il
codice. Il verdetto — `human_needed` — è quindi lo stesso che la fase dichiara
di se stessa, raggiunto per una via indipendente.

**I tre stati, tenuti separati:**
- **Provato per misura (container/struttura):** ASSIGN-04, ASSIGN-06, ASSIGN-07, e la metà "permesso" di ASSIGN-01.
- **Scritto ma non eseguito:** tutte e tredici le procedure di `35-HUMAN-UAT.md`, `status: pending` su ognuna, zero chiuse.
- **Non fatto:** nessuna delle 8 migration proprie della fase è applicata in produzione; il codice non è deployato.

## Goal Achievement

### Observable Truths (i cinque criteri di successo del ROADMAP)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Una persona assegnata a una notte usa gli strumenti di quella notte e nessun'altra; lo scanner risolve l'assegnazione all'apertura, non a ogni scan | ⚠️ CODICE COMPLETO, NON OSSERVATO | Permesso: `verify:capabilities --target=container` 5/5 (misura dell'orchestratore, non ripetuta). Routing: `src/lib/supabase/middleware.ts:215,233-242` legge `live_assignment_capabilities`; tre cause distinte (`unavailable`/`context-stale`/`not-assigned-here`) alle righe 48-50. Scansione: **il buco trovato da 35-12 è chiuso da 35-22** — `src/app/api/tickets/checkin/route.ts:711-742` chiede il secondo braccio (`requireDoorOperator({ partyId })`) **solo se** il primo ha rifiutato **e** non è un report di coda (righe 713, 703-706), con tre cause (`door_night_not_assigned`, `door_night_other_night`, `door_night_unresolved`, righe 399-417). Cache-per-apertura: `require-operator.ts` risolve una sola volta per chiamata (commento "Called this ONCE per handler"), e lo scanner lo chiede all'apertura, non a ogni scan (prova 5, non eseguita). Nessuna delle tre metà (permesso, routing, scansione) è stata osservata da un umano: prove 7, 8, 9, 11 tutte `pending`. |
| 2 | L'accesso non sopravvive alla notte; la revoca è un'azione registrata e non lascia scansioni in coda appese | ⚠️ CODICE COMPLETO, NON OSSERVATO | `party_assignments.ends_at` calcolato dal writer atomico leggendo `event_parties.date` (correzione della voce 1 di `deferred-items.md`, misurata: 24h di divergenza evitate). Confine sul server: predicato `now() < ends_at` dentro `private.has_capability`, mai l'orologio del client (commentato esplicitamente in `require-operator.ts`, sezione *validUntil is a courtesy*). Il drain giudica a `scannedAt`, mai a "ora" (`deferred-items.md` voce 7, chiusa da 35-22). Non osservato su un dispositivo reale: prove 1 e 2, `pending`. |
| 3 | Nessuno può assegnarsi da solo | ✅ VERIFICATO (misura container + mutazione) | `supabase/migrations/20260809000000_party_assignments.sql:315` — `CONSTRAINT party_assignments_no_self_grant CHECK (assigned_by <> user_id)`. `35-VALIDATION.md` § Per-Requirement Verification Map, riga ASSIGN-04: "sonda B3 con `assigned_by = user_id` deve tornare `23514`; e la mutazione va provata: rimuovere il CHECK deve far diventare verde la cella" — dichiarata eseguita e verde. Copertura automatica dichiarata "✅ piena", nessuna mano con un telefono richiesta. |
| 4 | Undoing è rifiutato a chi ha solo la porta per la notte, permesso a un organizer | ⚠️ CODICE COMPLETO, NON OSSERVATO | `src/app/api/tickets/checkin/undo/route.ts:1-59` (commento di file) e righe 304-305: rifiuto `DOOR_SUPERVISION_REQUIRED` quando `maySupervise` è falso. `require-operator.ts` distingue `door.operate` (may scan) da `door.supervise` (may undo) come **chiavi diverse**, risolte nella stessa chiamata (`mayScan`/`maySupervise` nel tipo `DoorAuth`). Non osservato: la frase leggibile esiste **solo in build di produzione** (Next redige i messaggi in dev); prove 3 e 4, `pending`. |
| 5 | Un credito dj/foto può esistere per una persona senza account, non concede alcuno strumento, non crea alcun account | ✅ VERIFICATO (struttura + script) | `supabase/migrations/20260809003000_party_credits.sql:57-71` — la riga ha `party_id`, `artist_id`, un ruolo; **nessuna colonna che nomini un account** (né `user_id`, né `profile_id`, né `auth_user_id`). `scripts/verify-no-credit-account.mjs` — `npm run verify:no-credit-account` esce 0 (misura dell'orchestratore), provato per mutazione in quattro direzioni per il piano 35-05. Prova negativa dichiarata: persona con credito e nessuna assegnazione ha la stessa matrice di un `member`. La superficie di catalogo dei crediti **non esiste ancora** — dichiarato onestamente in `35-HUMAN-UAT.md` prova 6, non uno stub: nessun piano di questa fase la apriva. |

**Score:** 5/5 hanno codice reale e coerente con il requisito; 2/5 (ASSIGN-04, ASSIGN-06/07) sono chiudibili senza una persona; 3/5 hanno una metà osservabile solo con un telefono, un build di produzione, o dopo una migration — e quella metà non è mai stata eseguita (0/13 procedure).

### Il rischio più alto, verificato indipendentemente: il buco di 35-12, chiuso da 35-22

Il brief chiede di non fidarsi dell'affermazione "chiuso" e di verificarlo nel
codice. Fatto: prima del piano 35-22, `checkin/route.ts` chiamava
`requireDoorOperator()` **senza `partyId`** — solo la domanda di ruolo — pur
avendo già `partyId` validato nel corpo. Un `staff` assegnato solo per la notte
avrebbe raggiunto lo scanner (guardia di ruolo grossolana passata dal
middleware) e preso 403 su ogni scansione. Nel codice attuale:

- `src/app/api/tickets/checkin/route.ts:713` — `if (!auth.ok && !isQueuedReport)`: il secondo braccio è chiesto **solo** quando il primo ha rifiutato **e** non si tratta di un report di coda già avvenuto.
- `:720` — `perNight = await requireDoorOperator({ partyId })`, la stessa firma che il commento di `require-operator.ts` documenta come "the per-night form".
- `:729-739` — un rifiuto del secondo braccio **riemette** lo stesso codice HTTP che il primo braccio aveva già prodotto (mai un 503 nuovo), con una causa propria (`door_night_not_assigned` / `door_night_other_night` / `door_night_unresolved`).
- Commit reale: `8a08fa2 feat(35-22): il secondo braccio della guardia, sul solo ramo di rifiuto`, `07c38f6`, `537bc65`, `4f4a2ea` — tutti esistenti in `git log`.

**Il codice chiude il buco.** Quello che non è stato ancora fatto è
l'esecuzione della prova 11, che è l'unica prova che possa dirlo con certezza
in un repository senza test: `npm run build` è verde con zero migration
applicate, perché nessun client Supabase è tipizzato con `Database` e il nome
della funzione RPC per-notte non è verificato dal compilatore. Questo è
scritto in chiaro dalla fase stessa (`35-HUMAN-UAT.md` § Prova 11) ed è
confermato qui: non ho trovato alcun test automatico che eserciti
`requireDoorOperator({ partyId })` contro un database reale.

### Il secondo rischio più alto: la porta aperta finché la riga 15 non è applicata

Verificato in `supabase/migrations/20260809006000_event_media_server_upload_only.sql:1-45`:
il file dichiara esplicitamente, in italiano e in inglese, di essere
**l'unica** migration della coda che si applica **dopo** il deploy — e che
finché non è applicata, una sessione di membro approvato può scrivere
direttamente nel bucket pubblico `event-media` **saltando** `/api/media/finalize`
e la sua spoglia dei metadati. Confermato lato codice: `src/app/api/media/finalize/route.ts`
è l'unico percorso applicativo che chiama `stripImageMetadata` (`:575`) prima
di scrivere (`:662`), ma **niente nel database impedisce oggi una scrittura
diretta** — quello è esattamente il compito della riga 15, non ancora
applicata.

**Giudizio:** la gestione è onesta e sufficiente **come codice** — la
finestra è dichiarata a lettere piene in tre posti (in cima alla migration, in
cima alla coda di `35-HUMAN-UAT.md`, nella tabella delle finestre che si
chiudono) e la scelta di applicarla dopo il deploy invece che prima è
motivata e misurata (applicarla prima romperebbe gli upload per tutti fino al
deploy; applicarla dopo lascia aperta esattamente la porta di oggi, non una
nuova). **Non blocca la verifica di fase**, perché non è un difetto di
codice — ma è un'azione operativa che deve avvenire **immediatamente dopo**
il deploy di questa fase, non "quando capita": ogni giorno di ritardo è un
giorno in cui un fotografo assegnato che carica da una sede segreta pubblica
coordinate GPS. Va nominata come azione urgente e non come nota a piè di
pagina.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260809000000_party_assignments.sql` | tabella temporale, CHECK anti-self-grant, FK composta staff-only | ✓ VERIFICATO (esiste, sostanziale) — ⚠️ NON APPLICATO in produzione | 5 vincoli con nome citati sopra; `party_assignments_assignee_role_fk` (righe 372-376) è la FK composta D-B, motivata in 3b perché un `CHECK` non può leggere un'altra tabella |
| `supabase/migrations/20260809001000_assignment_resolver.sql` | secondo braccio del resolver, null-safe | ✓ VERIFICATO (letto, coerente con `require-operator.ts`) — ⚠️ NON APPLICATO | Citato da `require-operator.ts` come "the per-night form"; non ri-letto riga per riga in questo giro perché il comportamento è confermato dal chiamante e dalla misura container dell'orchestratore |
| `supabase/migrations/20260809003000_party_credits.sql` | tabella senza colonna account | ✓ VERIFICATO — ⚠️ NON APPLICATO | righe 57-71, nessuna colonna account, `ON DELETE RESTRICT` su `artist_id` (debito aperto #3 di `deferred-items.md`, dichiarato) |
| `supabase/migrations/20260809005000_live_assignment_flag.sql` | chiave nel payload del middleware | ✓ VERIFICATO (letto il consumo in `middleware.ts:215-242`) — ⚠️ NON APPLICATO | Senza applicazione la chiave manca e ogni rimbalzo grossolano porta `context-stale` — comportamento **dichiaratamente rumoroso**, non un fallimento silenzioso |
| `supabase/migrations/20260809006000_event_media_server_upload_only.sql` | toglie al browser la scrittura sul bucket pubblico | ✓ VERIFICATO (scritto, idempotente) — ⚠️ NON APPLICATO, e va applicato SOLO dopo il deploy | Vedi rischio #2 sopra |
| `src/lib/door/require-operator.ts` | guardia unica, tre domande da una risoluzione | ✓ VERIFICATO e WIRED | Letto per intero; `mayScan`, `maySupervise`, `validUntil` da una sola chiamata; usato da `checkin/route.ts` e `undo/route.ts` |
| `src/app/api/tickets/checkin/route.ts` | secondo braccio solo sul ramo di rifiuto, mai su un report di coda | ✓ VERIFICATO e WIRED | Righe 711-742, tre cause distinte (399-417) |
| `src/app/api/tickets/checkin/undo/route.ts` | rifiuto di supervisione distinguibile | ✓ VERIFICATO e WIRED, ⚠️ COPERTURA PARZIALE DICHIARATA | Registrazione di chi ha annullato avviene su un solo ramo su tre (biglietti sì, guest list e membership no — dichiarato nel commento di file righe 20-53, non scoperto qui) |
| `src/app/api/media/finalize/route.ts` | unico percorso nel bucket pubblico, spoglia prima della scrittura | ✓ VERIFICATO e WIRED | Confermato da `verify:media-strip` (misura dell'orchestratore) e dalla lettura diretta: `bytesToPublish` assegnato dalla spoglia (:575) prima dell'unico `.upload(` (:662) |
| `scripts/verify-no-credit-account.mjs` | guardia strutturale ASSIGN-07 | ✓ VERIFICATO e WIRED | `npm run verify:no-credit-account` registrato in `package.json:13`, esce 0 (misura dell'orchestratore) |
| Superficie di catalogo dei crediti (`organizer/artists` o simile) | creare un credito da interfaccia | ✗ NON ESISTE, dichiarato | Nessun file di `src/` legge o scrive `public.party_credits` fuori dal tipo di riga — dichiarato onestamente dalla fase stessa (`35-HUMAN-UAT.md` § prova 6), non uno stub nascosto |
| Pulsante per l'uscita dalla demozione bloccata (`revokeAssignmentsAndDemote`) | collegato a `MemberTable.tsx` | ✗ SCRITTO, NON RAGGIUNGIBILE | Funzione esportata (piano 35-08) ma nessun controllo la invoca dalla superficie membri — deferred-items.md voce 4, dichiarata |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `checkin/route.ts` (secondo braccio) | `require-operator.ts` per-night form | `requireDoorOperator({ partyId })` | ✓ WIRED | riga 720, chiamata solo dopo rifiuto del primo braccio |
| `require-operator.ts` | `public.my_access_context(partyId)` / resolver SQL | RPC | ✓ WIRED (letto lato client) — ⚠️ non eseguibile finché la riga 8 (`20260809001000`) non è applicata | coerente con la dichiarazione della fase: il nome della funzione non è verificato dal compilatore |
| `undo/route.ts` | `require-operator.ts` (`maySupervise`) | chiamata unica, stessa risoluzione dello scan | ✓ WIRED | righe 304-305, `DOOR_SUPERVISION_REQUIRED` |
| `middleware.ts` | `live_assignment_capabilities` payload | lettura del contesto d'accesso a ogni richiesta | ✓ WIRED (codice) — ⚠️ chiave assente finché la riga 14 non è applicata, effetto dichiarato e osservabile come `context-stale` | righe 215, 233-242 |
| `finalize/route.ts` | `stripImageMetadata` | chiamata prima della scrittura | ✓ WIRED | :575 prima di :662, confermato anche da `verify:media-strip` check B |
| Bucket pubblico `event-media` | scrittura diretta dal browser | policy RLS | ✗ ANCORA APERTO | la riga 15 non è applicata; verificato leggendo il file di migration e il suo stesso avviso |

### Data-Flow Trace (Level 4)

Non applicabile nella forma standard (dashboard/componenti che renderizzano
dati): questa fase è quasi interamente un cambio di autorizzazione lato
server e schema. L'unico punto rilevante — se il permesso per-notte
"raggiunge" davvero l'operatore assegnato — è tracciato sopra come Key Link e
richiede l'applicazione delle migration per essere osservato end-to-end
(prova 11).

### Behavioral Spot-Checks

Non eseguiti in questo turno di verifica: nessuna delle migration proprie
della fase è applicata al database che questo ambiente raggiungerebbe, quindi
qualunque chiamata RPC al resolver per-notte fallirebbe per assenza
dell'oggetto — non per un difetto di codice. Eseguire uno spot-check dal vivo
richiederebbe di applicare la coda (righe 7-14) prima del deploy, che è
esattamente la procedura per cui esiste `35-HUMAN-UAT.md`. Le uniche misure
eseguibili senza toccare un database vero sono quelle già registrate
dall'orchestratore (container usa-e-getta) e non sono state ripetute qui.

### Probe Execution

Nessun probe dedicato (`scripts/*/tests/probe-*.sh`) trovato per questa fase.
Gli script di verifica strutturale (`verify-capabilities.mjs`,
`verify-no-credit-account.mjs`, `verify-media-strip.mjs`) svolgono lo stesso
ruolo e sono già stati eseguiti dall'orchestratore (vedi tabella nel prompt);
non ripetuti qui per istruzione esplicita.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| ASSIGN-01 | 35-03, 35-07, 35-09, 35-10, 35-15, 35-16, 35-17, 35-22 | assegnato a una notte usa gli strumenti di quella notte | ⚠️ NEEDS HUMAN (permesso: closed; routing/scan: pending) | vedi Truth 1 |
| ASSIGN-02 | 35-02, 35-04 | l'accesso non sopravvive alla notte | ⚠️ NEEDS HUMAN | vedi Truth 2 |
| ASSIGN-03 | 35-04, 35-08, 35-12 | revoca registrata, mai `DELETE`, coda mai appesa | ⚠️ NEEDS HUMAN | `revoked_at`/`revoked_by` accoppiati (`party_assignments_revocation_paired`); drain a `scannedAt` |
| ASSIGN-04 | 35-02 | nessuno si assegna da solo | ✅ SATISFIED | CHECK + mutazione, container-provato |
| ASSIGN-05 | 35-07, 35-11, 35-13 | undo richiede supervisione | ⚠️ NEEDS HUMAN (frase leggibile solo in produzione) | `door.supervise` distinto da `door.operate` |
| ASSIGN-06 | 35-05 | il credito non concede nulla, esiste senza account | ✅ SATISFIED | matrice + prova negativa dichiarata |
| ASSIGN-07 | 35-05 | creare un credito non crea un account | ✅ SATISFIED | `verify:no-credit-account`, provato per mutazione |
| ASSIGN-08 | 35-10 | risolto una volta, non a ogni scan | ⚠️ NEEDS HUMAN | nessuna copertura automatica dichiarata dalla fase stessa (❌ nella sua stessa tabella); solo il pannello Network lo prova |

Nessun requisito ORFANO: `.planning/REQUIREMENTS.md:212-219` mappa esattamente
ASSIGN-01…08 a Phase 35, e tutti e otto compaiono nei `requirements` di almeno
un piano della fase. `REQUIREMENTS.md` porta ancora tutti gli otto come non
spuntati (`- [ ]`) — coerente con questo verdetto: nessuno è ancora chiudibile
a lettere piene finché la metà umana resta `pending`.

### Anti-Patterns Found

Nessun `TODO`/`FIXME`/`HACK`/`XXX`/`PLACEHOLDER` di debito trovato nei file
toccati dalla fase (verificato con grep mirato; gli unici falsi positivi sono
un commento che nomina un codice d'esempio `RSN-XXXXXX` e attributi HTML
`placeholder=`). Nessuna implementazione vuota (`return null`/`{}`/`[]`) fuori
da rami dichiaratamente totali (es. `readNightEnd` che ritorna `null` come
risposta onesta, documentato).

**Un pattern trovato e giudicato, non un difetto residuo**: due piani della
fase hanno scoperto **da soli** un criterio d'accettazione troppo debole e
lo hanno **corretto prima della consegna**, non lasciato correre:

- **35-17** — il criterio letterale `grep -c my_access_context = 1` sarebbe
  stato soddisfatto anche da un file che chiamasse il resolver **con**
  `p_party_id` se le tre menzioni in prosa fossero state cancellate. Il piano
  ha aggiunto l'asserzione vera (`supabase.rpc(` singolo, senza secondo
  argomento, zero `p_party_id`) — confermato: `35-17-SUMMARY.md:356-374`.
- **35-20** — il criterio "la spoglia precede la scrittura" confrontava
  **numeri di riga**, e una mutazione che pubblica `sourceBytes` invece di
  `bytesToPublish` (cioè i byte **non spogliati**) lo lascia verde, perché la
  chiamata alla spoglia resta comunque sopra la scrittura nel testo — la
  proprietà osservata è l'ordine, non l'uso del risultato. Il piano lo ha
  misurato con la mutazione M2 e ha aggiunto 23 asserzioni strutturali
  indipendenti che **falliscono** su quella stessa mutazione — confermato:
  `35-20-SUMMARY.md:216-322`. Il file consegnato (`finalize/route.ts:575,662`)
  usa `bytesToPublish`, non `sourceBytes`, nell'unico `.upload(`.

Questi non sono difetti aperti: sono difetti **trovati e chiusi dentro la
fase**, e li registro perché il brief chiedeva esplicitamente di cercarli e
perché mostrano che il rigore della fase è reale, non dichiarato — ma vanno
letti insieme alla frase che li accompagna in entrambi i SUMMARY: un
controllo che la cosa che sorveglia può soddisfare è un controllo da non
fidarsene finché non è rinforzato, ed è esattamente ciò che è avvenuto.

**Un limite dichiarato, non un anti-pattern**: `verify:media-strip` non è
agganciato a `npm run build` (misurato: `package.json` `build` non lo
contiene) — un tipo di regressione che questo script previene può quindi
rientrare senza far fallire il gate di tipo. Non blocca questa verifica
perché lo script esiste, gira ed è nella lista T2 dichiarata dopo ogni wave;
è un rischio operativo da nominare, non un buco di questa fase.

### Human Verification Required

Le tredici prove di `35-HUMAN-UAT.md` sono il deliverable manuale di questa
fase, tutte `status: pending`, zero eseguite. Le sei più urgenti — perché
vivono in una finestra che si chiude o perché chiudono il rischio più alto
della fase — sono elencate nel frontmatter (`human_verification`); le altre
sette (prove 6, 8, 9, 13, più i due rami residui delle prove 3/4) completano
la copertura di ASSIGN-01 e ASSIGN-03 lato interfaccia. Nessuna è rimandabile
a uno strumento di questo repository: ognuna esiste perché un comando non può
rispondere alla domanda che pone (radio spenta, build di produzione, EXIF su
un file reale, IndexedDB su un dispositivo).

### Gaps Summary

**Non ci sono artefatti mancanti, stub o non collegati.** Ogni migration, ogni
guardia server, ogni chiave di capability e la tabella dei crediti dichiarate
dalla fase esistono, sono sostanziali e sono collegate dove il codice le usa.
Il buco di copertura più serio che la fase stessa ha trovato durante
l'esecuzione — la scansione che non riceveva mai la notte, trovato dal piano
35-12 — è chiuso nel codice dal piano 35-22, verificato qui indipendentemente
leggendo `checkin/route.ts:711-742` e i commit `8a08fa2`/`07c38f6`/`537bc65`.

**Quello che manca è interamente esecuzione, non codice:**
1. Nessuna delle nove migration proprie della fase è applicata in produzione (misurato dall'orchestratore per query diretta il 2026-08-09).
2. Il codice non è deployato.
3. Tredici procedure manuali sono scritte e nessuna è stata eseguita.
4. Una finestra di sicurezza reale e dichiarata resta aperta finché la riga 15 non viene applicata **dopo** il deploy — azione operativa, non difetto di codice, ma da eseguire con urgenza per non lasciare `event-media` scrivibile dal browser più a lungo del necessario.

Questo è esattamente lo stato che rende `human_needed` il verdetto corretto:
non un fallimento, la descrizione accurata di una fase il cui codice è pronto
e la cui prova resta da fare da una persona con un telefono, un build di
produzione e un container che applica la coda nell'ordine scritto.

---

_Verified: 2026-08-09_
_Verifier: Claude (gsd-verifier)_
