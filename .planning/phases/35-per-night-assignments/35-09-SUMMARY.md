---
phase: 35-per-night-assignments
plan: 09
subsystem: supabase-data
tags: [migration, rls, door-register, capability-model, per-night, container-harness, assign-01]

# Dependency graph
requires:
  - plan: 35-03
    provides: "il secondo braccio di `private.has_capability(text, uuid)` e la chiave `party.manage` nel catalogo — riga 8 della coda manuale"
  - plan: 35-06
    provides: "il terzo asse del seed, e l'avvertimento sulla collisione della sonda ASSIGN-04 che questo piano doveva evitare"
  - plan: 35-02
    provides: "`public.party_assignments`, `party_assignments_capability_assignable` (che ammette `party.manage`) e `idx_party_assignments_lookup`"
  - plan: 32-07
    provides: "`20260807010000_policies_to_capabilities.sql:145-149`, che aveva GIA' spostato questa policy su `staff.manage` — il fatto che corregge la premessa del piano"
provides:
  - "`door_scan_events_select_admin` a tre braccia: `staff.manage` senza notte, `door.operate` e `party.manage` sul `party_id` della riga"
  - "il primo consumatore di `party.manage` e il primo di `door.operate` sul lato POLICY"
  - "la quarta persona del terzo asse: `party.manage` sulla notte 1, nessuna assegnazione di porta"
  - "`assertDoorRegisterByAssignment` — la quinta asserzione del seed, l'unico posto del repository che misuri i due bracci per-notte"
  - "la cattura a container `35-09`"
affects: [35-15, 35-16, 35-17, 35-21, 35-VERIFICATION, 34]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "una policy con un braccio correlato: `(select …)` resta la forma, ma sul braccio per-riga produce un SubPlan e non un InitPlan — misurato, e l'ordine dei bracci e' cio' che ne limita il costo"
    - "una persona sintetica esiste per attraversare un braccio, non per completare una griglia"
    - "un'asserzione che conta righe controlla PRIMA che l'oggetto contato esista: uno zero e' anche cio' che producono un braccio assente, una policy assente e una tabella vuota"

key-files:
  created:
    - supabase/migrations/20260809004000_door_scan_events_by_assignment.sql
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-09.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-09.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-09.json
  modified:
    - scripts/container/seed.mjs
    - supabase/migrations/20260805120000_door_scan_events.sql

key-decisions:
  - "Il commento superato e' stato sostituito IN LOCO a conteggio-righe invariato (2 righe per 2). La versione lunga che avevo scritto per prima spostava 13 citazioni `file:riga` vive verso quel file: in un repository senza test runner una citazione e' l'unica prova che esista, e romperne 13 per allungare un commento e' un cattivo scambio"
  - "Il piano e `35-PATTERNS.md` § D dicono che la policy usa `is_admin_or_organizer()`. FALSO sul database: la fase 32 l'aveva gia' spostata su `staff.manage`. Il braccio 1 non sostituisce niente — tutta la modifica sono i due bracci nuovi"
  - "Le tre chiamate restano avvolte in `(select …)`, ma il commento dice che sui bracci 2 e 3 il wrapper NON produce un InitPlan: un sotto-select correlato non e' sollevabile. Misurato con EXPLAIN invece di affermato, perche' il piano affermava il contrario"
  - "La prova del terzo braccio vive nel SEED e non nel SUMMARY: B2 non impersona mai una persona del terzo asse, quindi un numero scritto qui sarebbe vero una volta sola. Nel seed e' un rifiuto che scatta a ogni corsa"
  - "`assertThirdAxis` legge ora entrambe le chiavi per tutti e quattro gli account — 16 celle invece di 6 — perche' una cella mai letta non puo' contraddire"
  - "Nessuna modifica a `src/app/(organizer)/organizer/events/[id]/review/page.tsx`, il cui docblock e' ora superato: fuori da `files_modified`, wave parallela. Riportato qui per intero"

requirements-completed: [ASSIGN-01]

# Metrics
metrics:
  duration: "~85 min"
  completed: 2026-08-09
  tasks_completed: 2
  tasks_total: 2
  container_runs: 7
  checkpoint_open: false
---

# Phase 35 Plan 09: Il registro della porta, per assegnazione Summary

**`door_scan_events_select_admin` legge ora per assegnazione e non per ruolo, con
tre bracci invece di uno; nessuna delle quattordici celle della matrice di lettura
si muove di una riga — nemmeno di `pk_md5` — e il braccio nuovo e' attraversato da
una persona sintetica che il seed rifiuta di lasciare inerte.**

## Performance

- **Duration:** ~85 min
- **Tasks:** 2/2
- **Container runs:** 7 (1 di misura EXPLAIN, 1 `--seed-only`, 4 di mutazione, 1 di cattura)
- **Commits:** 4

---

## Il fatto che va detto per primo, perche' cambia la lettura di tutto il resto

**La policy non usava `is_admin_or_organizer()`.**

Il piano 35-09 (`<interfaces>`) e `35-PATTERNS.md` § D descrivono entrambi la
policy corrente cosi':

```sql
CREATE POLICY door_scan_events_select_admin ON public.door_scan_events
  FOR SELECT USING ((SELECT public.is_admin_or_organizer()));
```

Quella e' la riga della migration che ha **creato** la policy
(`20260805120000_door_scan_events.sql:155-156`). Non e' lo stato del database.
`20260807010000_policies_to_capabilities.sql:145-149` — fase 32 — l'aveva gia'
lasciata cadere e ricreata come
`(select private.has_capability('staff.manage'))`, e la cattura `35-pre` lo
conferma alla lettera:

```
before: (SELECT private.has_capability('staff.manage'::text) AS has_capability)
```

E' il `gate documentazione datata` di `ai-engineering.md`: citare un file di
migration come se descrivesse lo schema corrente e' un fallimento del gate
hallucination con un passaggio in piu'. La correzione e' nel commento della
migration (`b049dd9`) e non solo qui, perche' il prossimo lettore arrivera' con
la stessa citazione in mano.

**Conseguenza pratica:** il braccio 1 e' **identico** a cio' che era gia'
installato. Tutta la modifica di questo piano sono i due bracci per-notte. La
frase «nessuno legge meno di prima» smette di essere un'argomentazione e diventa
una proprieta' della forma: non e' stato tolto niente perche' non e' stato
toccato niente.

---

## Task 1 — la policy a tre braccia

**Commits:** `73ec30f`, corretto da `b049dd9` · `supabase/migrations/20260809004000_door_scan_events_by_assignment.sql`

```sql
CREATE POLICY door_scan_events_select_admin ON public.door_scan_events
  FOR SELECT USING (
    (SELECT private.has_capability('staff.manage'))
    OR (SELECT private.has_capability('door.operate', door_scan_events.party_id))
    OR (SELECT private.has_capability('party.manage', door_scan_events.party_id))
  );
```

`DROP POLICY IF EXISTS` prima del `CREATE`, tutto dentro un solo
`BEGIN`/`COMMIT`. Il motivo del transaction wrap non e' formale: un `DROP` che
committasse senza il suo `CREATE` lascerebbe la tabella con RLS attiva e
**nessuna** policy di SELECT — non una tabella aperta, una tabella che nessuno
puo' leggere, organizer compreso. La coda si applica **a mano**, una riga per
volta, e li' una finestra puo' non chiudersi.

### Il criterio, e la lettura che e' stata rifiutata

«Restringere» ha due letture. Quella **non** presa e' *restringere per ruolo* —
tenere il test sul ruolo e aggiungere la proprieta' dell'evento, cosi' che un
organizer legga solo le notti che ha creato. Toglierebbe lettura a chi ce l'ha
oggi, e il momento in cui verrebbe scoperto e' quello in cui un organizer apre
il record di una serata per rispondere a una domanda, una settimana dopo, quando
quel record e' l'unica cosa che esiste. **Questo prodotto non aggiunge modi nuovi
di rifiutare a qualcuno cio' che aveva** — la stessa asimmetria dell'operating
principle 3, applicata al registro della porta invece che alla porta.

### Perche' il terzo braccio non e' una comodita'

`src/app/(organizer)/organizer/events/[id]/review/page.tsx:91-96` dichiara nel
proprio docblock di leggere questa tabella con il **client legato ai cookie** e
deliberatamente **non** con il service client, e dice perche': con quello il
confine si sposterebbe dentro la pagina e la policy sarebbe decorativa. Questa
policy e' quindi l'unica cosa che decide cosa quella pagina mostra.

Senza il terzo braccio la pagina renderebbe una **lista vuota** a chi ha titolo.
E su quella superficie una lista vuota e' **lo stato progettato di una serata
tranquilla**: nessuna anomalia, niente da rivedere. Il difetto non alzerebbe
nessun errore, non scriverebbe nessuna riga di log e non farebbe scattare niente
— direbbe *«nessun problema»* a una persona che semplicemente non ha il permesso
di vedere i problemi. E' il fallimento silenzioso nella sua forma pura, senza
alcun percorso d'errore, e in questo repository non esiste error tracking
(verificato 2026-08-05) che possa raccoglierlo a valle.

### La forma del piano, misurata invece che affermata

Il piano dichiarava (T-35-45) che tutte e tre le chiamate «Postgres valuta come
InitPlan». **Non e' cosi', e la misura lo dice.** Un sotto-select che referenzia
una colonna della riga filtrata e' **correlato**, e Postgres non puo' sollevarlo
fuori dal filtro: diventa un `SubPlan` per riga, con o senza wrapper.

`explain (verbose, costs off)`, `postgres:17.6`, container:

```
Seq Scan on public.door_scan_events
  Filter: ((InitPlan 1).col1 OR (SubPlan 2) OR (SubPlan 3))
  InitPlan 1 -> Result: private.has_capability('staff.manage'::text, NULL::uuid)
  SubPlan 2  -> Result: private.has_capability('door.operate'::text, door_scan_events.party_id)
  SubPlan 3  -> Result: private.has_capability('party.manage'::text, door_scan_events.party_id)
```

**Il piano e' lo stesso sotto una persona con assegnazione e sotto un `master`:**
il planner non sa chi sta chiedendo, quindi lo short-circuit e' un risparmio a
runtime e non di pianificazione.

Il costo non e' un incidente della forma — e' cio' che «per notte» significa. Due
cose lo limitano, entrambe gia' in posto: `staff.manage` e' il **primo** braccio
e l'`OR` si ferma al primo vero, quindi gli account che leggono questa tabella
oggi non valutano mai i bracci correlati; e la strada del resolver e' indicizzata
(`idx_party_assignments_lookup`). E la superficie che lo paga e' una pagina di
**revisione**, letta dopo la serata, non lo scanner davanti a una fila.

### Il commento superato — sostituito, e a conteggio-righe invariato

Il paragrafo di `20260805120000_door_scan_events.sql:151-152` diceva
testualmente che la fase 35 e' la fase che deve restringere questo predicato. La
fase 35 l'ha fatto, e un commento che indica un lavoro gia' fatto manda il
prossimo lettore a cercare un compito che nessuno deve (T-35-46).

**Ho scritto due volte la sostituzione, e la prima era sbagliata.** La versione
lunga — sedici righe con il criterio per esteso — spostava di +12 tutte le righe
successive di quel file, e con esse **13 citazioni `file:riga` vive** verso di
esso: `:158-163` in sei file (fra cui tre migration e `capability_model`),
`:184-186` in tre file di prodotto, piu' `:188-204`, `:215-220`, `:232-256`,
`:248-250`, `:295-300`. In un repository senza test runner una citazione
`file:riga` e' l'unica prova che esista (`gate VERIFICATION.md`), e romperne 13
per allungare un commento e' un cattivo scambio.

La versione spedita e' **2 righe per 2**, `git diff` lo conferma
(`2 insertions, 2 deletions`), e `:151-156` / `:158-163` puntano ancora dove
puntavano:

```sql
-- SUPERSEDED TWICE, not current: 20260807010000 moved it to a capability, then
-- 20260809004000_door_scan_events_by_assignment.sql narrowed it BY ASSIGNMENT.
```

Il criterio per esteso vive **una volta sola**, nel file nuovo.

### Conflitto di gate, dichiarato

`supabase-data.md` dice *«una migration gia' applicata non si modifica: se ne
scrive un'altra»*. I `must_haves` di questo piano e `35-PATTERNS.md` § D
pretendono che quel commento sia **sostituito**, e sostituirlo si puo' solo li'.
Risolto al minimo comune: **zero byte di DDL**, due righe di solo commento, zero
righe di scarto. Dichiarato nel corpo del commit `73ec30f`, come `meta-gates.md`
priorita' 3 richiede.

### Criteri di accettazione

| Criterio | Esito |
|---|---|
| `DROP POLICY IF EXISTS door_scan_events_select_admin` prima del `CREATE` | ✅ |
| Nessun `is_admin_or_organizer` nel predicato nuovo | ✅ compare solo in 4 righe di commento, e la qual riletta da `pg_policy` non lo contiene |
| Tutte e tre le chiamate avvolte in `(SELECT …)` | ✅ `grep -c` = 3 |
| Il file contiene `party.manage` | ✅ |
| Nessun `FOR INSERT` / `FOR UPDATE` / `FOR DELETE` | ✅ `grep` esce 1 |
| Il criterio nuovo scritto per esteso, che nomina *per assegnazione, non per ruolo* | ✅ § 1 del file |
| La migration si applica | ✅ 7 container, 50 file di migration ognuno |

---

## Task 2 — la quarta persona, e la prova che non e' un numero scritto a mano

**Commits:** `9d4d845` (seed), `fe22b09` (catture) · `scripts/container/seed.mjs`

### Perche' serviva una quarta persona

Le tre persone del terzo asse portano **tutte `door.operate`**. Fra loro possono
esercitare un solo braccio per-notte, e il braccio `party.manage` sarebbe stato
una riga di SQL che nessuna persona, nessuna sonda e nessuna cattura puo'
distinguere da una riga cancellata. E' il `gate un gate deve poter fallire`.

La quarta persona e' `staff/approved`, tiene `party.manage` sulla notte 1 e
**nessuna assegnazione di porta**. L'assenza e' la meta' portante: chi tenesse
entrambe sarebbe ammesso dal braccio della porta e non direbbe niente sull'altro.

**La collisione che 35-06 aveva previsto non e' avvenuta, e non per fortuna.**
Quel piano aveva scritto l'avvertimento contro il proprio futuro: seminare una
`door.supervise` per il profilo piu' basso sulla notte piu' bassa fa ricominciare
a collidere la sonda negativa di ASSIGN-04, con il sintomo `23505` da
`party_assignments_live_unique`. Tre cose tengono questa riga fuori: la chiave e'
`party.manage`, il soggetto e' un account `35000001…` e non `min(id)` di
`public.profiles`, e l'indice parziale e' su tutte e tre le colonne. Verificato
nella cattura:

```
✓ ASSIGN-04  party_assignments  23514 party_assignments_no_self_grant  refused as declared
```

### I quattro conteggi, come numeri

Osservazione **1** — dalla matrice di lettura, `35-pre` → `35-09`, per tutte e
quattordici le persone della griglia:

| persona | prima | dopo | righe |
|---|---|---|---|
| `master/approved`, `master/pending`, `master/rejected` | 2 | **2** | stesso `pk_md5` |
| `organizer/approved`, `organizer/pending`, `organizer/rejected` | 2 | **2** | stesso `pk_md5` |
| `member/*`, `staff/*`, `anon`, `authenticated/no-profile` | 0 | **0** | stesso `pk_md5` |

`door_scan_events` **non compare fra i 128 difetti** del confronto. Non «circa lo
stesso numero»: le **stesse righe**, per impronta.

Osservazioni **2**, **3** e **4** — dal seed, stampate a ogni corsa perche' B2
non impersona mai una persona del terzo asse:

```
door register  master/approved   night1= 1 night2= 1 total= 2  staff.manage — il registro non si e' ristretto
door register  assigned night1   night1= 1 night2= 0 total= 1  door.operate sulla notte 1 — quella notte e nessun'altra
door register  assigned night2   night1= 0 night2= 1 total= 1  la stessa proprieta', al contrario
door register  unassigned        night1= 0 night2= 0 total= 0  una riga revocata, finestra ancora aperta
door register  manages night1    night1= 1 night2= 0 total= 1  party.manage, e NESSUNA assegnazione di porta
```

L'ultima riga e' l'osservazione 4, ed e' l'unica evidenza al mondo che il terzo
braccio sia attraversato.

### `assertDoorRegisterByAssignment`, e i tre controlli prima di leggere un numero

Tutte le aspettative tranne la prima sono **zeri**, e «quella notte e nessun'altra»
*e'* uno zero sull'altra notte. **Ma uno zero e' anche cio' che producono un
braccio assente, una policy assente e una tabella vuota.** Prima di leggere un
solo conteggio la funzione asserisce che la policy esiste, che la sua qual nomina
tutti e tre i bracci, e che il registro ha almeno una riga **per notte**. Senza
quei tre controlli i cinque numeri sarebbero una pagina di zeri concordi che non
misurano niente — la «green screen rather than evidence» che l'intestazione del
seed rifiuta.

La funzione **impersona** invece di ri-dichiarare il predicato, all'opposto di
`assertThirdAxis` che re-scrive la liveness del resolver. La scelta e' opposta
perche' l'oggetto sotto misura e' opposto: qui e' **la policy**, e l'unico modo
di sostenere «una sessione con queste claim vede queste righe» e' aprire una
sessione cosi'.

`assertThirdAxis` legge ora **entrambe** le chiavi per **ognuno** dei quattro
account — 16 celle invece di 6. Una cella mai letta non puo' contraddire, e
l'affermazione da provare e' che `party.manage` sulla notte 1 appartiene a **un**
account, non ai tre che lavorano una porta.

### La prova per mutazione — quattro direzioni, ogni mutazione asserita prima di leggerne l'esito

Script usa-e-getta in `/tmp`, mai committato, che pilota il **seed vero**. Ogni
direzione ha un container proprio, costruito da zero e distrutto nel `finally`,
quindi il ripristino e' strutturale invece che un passo che si puo' dimenticare.
L'harness non legge alcuna variabile d'ambiente: non esiste percorso verso un
database vero.

| # | Mutazione | Asserzione della mutazione | Esito osservato | Verdetto |
|---|---|---|---|---|
| **B** | terzo braccio rimosso del tutto | `qual` NON deve nominare `party.manage` | rifiuto sull'**ispezione della qual**: *«does not name party.manage in its predicate»* | rosso, per la ragione giusta |
| **C** | braccio **neutrato** — `has_capability('party.manage', NULL::uuid)`, il nome resta nella qual | `qual` deve ancora NOMINARE la chiave e NON passare piu' la notte della riga | il grep passa; rifiuto sul **CONTEGGIO**: `manages night1: saw night1=0 night2=0 total=0 (expected 1/0/1)` | rosso |
| **D** | bracci 2 e 3 su una notte **costante** invece che sulla colonna | `qual` deve portare l'uuid letterale e NON `door_scan_events.party_id` | `assigned night1: 1/1/2 (expected 1/0/1)`; `assigned night2: 0/0/0 (expected 0/1/1)`; `manages night1: 1/1/2` | rosso |
| **A** | nessuna, eseguita per **ultima** | `qual` dev'essere il predicato vero a tre braccia | il seed completa senza rifiuti | **verde** |

```
=== VERDICT ===
✓ B — red as required
✓ C — red as required
✓ D — red as required
✓ A — green as required
```

**C e' la direzione che conta.** Prova che il **conteggio** e' portante e il grep
no: con il nome della chiave ancora nella qual, l'ispezione passa e solo il numero
vede che il braccio non concede piu' niente. Senza C, un futuro che rompesse
l'arm lasciandone il nome avrebbe avuto un verde.

**D e' il difetto che 35-03 aveva misurato**, riprodotto un livello piu' su:
un'assegnazione a una notte che concede **ovunque**, senza errore e senza diff di
policy. Qui l'asserzione lo vede da entrambe le parti — troppo alto per chi ha la
notte 1, troppo basso per chi ha la notte 2.

### Criteri di accettazione

| Criterio | Esito |
|---|---|
| Il SUMMARY riporta i quattro conteggi come numeri | ✅ tabella sopra |
| `baseline:compare` mostra la sola differenza attesa su questa policy, piu' le aggiunte delle due tabelle nuove | ✅ 1 solo `predicate_unexplained`, ed e' questa policy |
| Conteggio invariato per ogni persona con `staff.manage` | ✅ 2 → 2, stesso `pk_md5` |
| `seed.mjs` contiene almeno un'assegnazione con `capability` `party.manage` | ✅ riga 4 di `seedThirdAxis` |

---

## Il confronto `35-pre` → `35-09`, per intero

**B1 — l'insieme delle policy.** Un solo `predicate_unexplained`, ed e' questa:

```
before: (SELECT private.has_capability('staff.manage'::text))
after : ((SELECT private.has_capability('staff.manage'::text))
         OR (SELECT private.has_capability('door.operate'::text, door_scan_events.party_id))
         OR (SELECT private.has_capability('party.manage'::text, door_scan_events.party_id)))
```

`67 unchanged · 0 by T1 · 0 by T2 · 1 unexplained`. Piu' 4 `policy_added` sulle
due tabelle nuove (35-02, 35-05) e i due conteggi di supporto, 68 → 72 policy e
21 → 23 tabelle con RLS.

**B2 — la matrice di lettura.** L'unico `b2_count_changed` e' `profiles`,
**12 → 16**, per le sei persone che tengono `staff.manage`: tre account dal terzo
asse di 35-06, uno da questo piano. `public.profiles` e' una tabella che questa
fase tocca (`20260809000000` le aggiunge `profiles_id_role_unique`), quindi il
movimento non viola T-35-29 — la stessa attribuzione che 35-06 aveva gia' scritto,
con il numero aggiornato.

**B3 — la matrice di scrittura.** Nessuna cella si muove per questo piano. Le tre
righe `artists × delete  ok:1 → 23503` sono ereditate da 35-05 e dichiarate nel
suo SUMMARY.

---

## `party.manage` ha il suo primo consumatore. `door.supervise` e `media.upload` no.

La domanda posta esplicitamente: **questo piano chiude il giallo del quarto lato
di `verify:capabilities`?** Per una chiave su tre, e con una condizione.

Contato sulla cattura `35-09`, per chiave, sul lato POLICY:

| chiave | policy che la consumano, `35-pre` | policy che la consumano, `35-09` |
|---|---|---|
| `party.manage` | **0** | **1** — `door_scan_events.door_scan_events_select_admin` |
| `door.operate` | **0** | **1** — la stessa |
| `door.supervise` | 0 | **0** |
| `media.upload` | 0 | **0** |

**La condizione:** il quarto lato legge `pg_policies` **dal database applicato**,
e la sua intestazione dice perche' — *«a migration file says what somebody
intended to apply; `pg_policies` says what is running»*. Questa migration e' la
**riga 11 della coda a mano** e non e' applicata. Quindi:

- `verify:capabilities` **continua a riportare `party.manage` fra le chiavi senza
  chiamante** finche' la riga 11 non e' applicata a produzione, ed e' corretto che
  lo faccia;
- **non e' stato messo a tacere niente**, e nessuna soglia e' stata toccata;
- il comando **non e' stato eseguito in questa esecuzione**: pretende
  `SUPABASE_ACCESS_TOKEN` e `NEXT_PUBLIC_SUPABASE_URL`, che questo worktree non
  ha. La riga sopra e' contata sulla cattura a container, che e' il database dove
  la migration *e'* applicata.

---

## Deviazioni dal piano

### 1. [Regola 1 — difetto] La premessa del piano sul predicato corrente era falsa

- **Trovato durante:** task 2, leggendo l'output di `baseline:compare`
- **Problema:** il piano e `35-PATTERNS.md` § D affermano che la policy usa
  `public.is_admin_or_organizer()`. La fase 32 l'aveva gia' spostata su
  `staff.manage` in `20260807010000:145-149`. Il commento che avevo scritto nel
  task 1 — *«scambiare il predicato e' meta' del punto di questo file»* — era
  quindi falso.
- **Correzione:** paragrafo ARM 1 riscritto per dire che il braccio 1 e'
  **identico** a cio' che c'era, che tutta la modifica sono i due bracci nuovi, e
  che la citazione che ha prodotto l'errore e' la riga della migration che ha
  creato la policy e non lo stato del database. L'equivalenza fra i due predicati
  resta scritta, perche' e' la ragione per cui lo scambio della fase 32 non e'
  costato niente a nessuno.
- **File:** `20260809004000_…sql`, `20260805120000_…sql`
- **Commit:** `b049dd9`

### 2. [Regola 1 — difetto] Il piano affermava un InitPlan su tutte e tre le chiamate

- **Trovato durante:** task 1, misurando prima di scrivere il commento
- **Problema:** T-35-45 dichiara che tutte e tre le chiamate «Postgres valuta come
  InitPlan». Un sotto-select correlato non e' sollevabile: i bracci 2 e 3 sono
  `SubPlan` per riga.
- **Correzione:** il commento riporta l'`EXPLAIN` osservato, dice che il wrapper
  compra l'InitPlan **solo** sul braccio 1, e nomina le due cose che limitano il
  costo — l'ordine dei bracci e `idx_party_assignments_lookup`. La mitigazione di
  T-35-45 resta valida ma per una ragione diversa da quella scritta nel piano.
- **File:** `20260809004000_…sql`
- **Commit:** `73ec30f`

### 3. [Regola 3 — sblocco] Due file fuori da `files_modified`

`supabase/migrations/20260805120000_door_scan_events.sql` — richiesto dai
`must_haves` («il commento e' stato sostituito, non affiancato»), che si possono
soddisfare solo li'. Due righe di solo commento, zero DDL, zero righe di scarto.
Nessun piano parallelo della wave 5 tocca quel file.

I tre artefatti di cattura sotto
`.planning/phases/32-…/baseline/` — prodotti dal comando che il blocco
`<automated>` del task 2 impone di eseguire.

### 4. La sostituzione del commento e' stata scritta due volte

La prima versione, lunga, e' stata scartata **prima del commit** perche' spostava
13 citazioni `file:riga`. Detto perche' la scelta finale sembra minimale e non lo
e': e' minimale *deliberatamente*, e il criterio per esteso sta nel file nuovo.

---

## Il gate della verifica, dichiarato onestamente

- **T3 pagato:** 7 corse a container. `35-VALIDATION.md` dichiara «35-09 T2 e T3».
- **T2, parzialmente.** `verify:no-header-identity` ✅ e `verify:no-credit-account`
  ✅. **`verify:capabilities` NON e' stato eseguito**: pretende
  `SUPABASE_ACCESS_TOKEN` e `NEXT_PUBLIC_SUPABASE_URL` e legge il database
  **applicato**, che non ha questa migration. Un verde non sarebbe stato
  disponibile e un rosso non avrebbe significato niente su questo piano.
- **T1 non e' dichiarato per 35-09, e non e' un'omissione.** I due file toccati
  sono una migration SQL e uno script Node fuori dal grafo di compilazione di
  Next: `npm run build` non li typechecka e non li importa. La migration e'
  esercitata da T3 — applicata in 7 container costruiti da zero.
- **Nessun test runner esiste per il prodotto.** Niente qui e' verificato perche'
  «i test passano»: e' verificato perche' un container e' stato costruito,
  seminato e interrogato, e perche' la policy e' stata rotta in tre modi diversi
  per vedere il controllo scattare in tre punti diversi.

### Cosa questo piano NON prova

- **Che la pagina di revisione mostri qualcosa a chi ha `party.manage`.** La
  policy le da' il permesso di leggere; il rimbalzo che oggi la protegge e'
  `CAP.ORGANIZER_ACCESS` piu' `ownsOrIsMaster`
  (`review/page.tsx:87, :118`), e aprirla a chi gestisce la notte e' lavoro di
  35-15. **Fino ad allora il terzo braccio e' un permesso senza superficie** — non
  inerte (il seed lo attraversa), ma nemmeno raggiungibile da un browser.
- **Che qualcuno arrivi allo strumento.** Le procedure 9–12 di
  `35-VALIDATION.md` restano da eseguire a mano.
- **Niente sul percorso di scrittura.** La tabella resta senza policy di
  scrittura e questo piano non ne aggiunge.

---

## Note per l'orchestratore (non scritte in `deferred-items.md`)

1. **Il docblock della pagina di revisione e' ora superato, e in due punti.**
   `src/app/(organizer)/organizer/events/[id]/review/page.tsx:111-114` dice:
   *«the RLS policy is `is_admin_or_organizer()` and is not per-event. Per-night
   scoping of an organizer arrives in Phase 35, and the migration says so
   (`20260805120000_door_scan_events.sql:151-156`)»*. Tre affermazioni, tre
   problemi: la policy non e' `is_admin_or_organizer()` **da prima di questa
   fase** (fase 32), lo scoping per-notte e' **arrivato**, e la migration citata
   ora dice un'altra cosa. **Non l'ho toccata**: e' fuori da `files_modified` ed e'
   la pagina che 35-15 apre. Va corretta da chi la tocca dopo.

2. **`35-PATTERNS.md` § D e' fattualmente sbagliato** sullo stesso punto, e lo era
   gia' quando e' stato scritto. Vale la pena correggerlo a livello di fase: e' il
   documento da cui i piani rimanenti copiano.
   Stessa affermazione stantia in `31-VERIFICATION.md:882`.

3. **`profiles` si muove ancora nella baseline: 12 → 16**, non 15. Chi confrontera'
   `35-pre` con la cattura di fine fase trovera' `b2_count_changed` su `profiles`
   per sei persone. Il report del seed ora stampa `16 profiles`.

4. **L'asserzione nuova accoppia l'harness a questa policy, di proposito.** Un
   piano futuro che cambi i bracci di `door_scan_events_select_admin` deve
   aggiornare la lista `ARMS` in `assertDoorRegisterByAssignment` **nello stesso
   commit**. Il messaggio d'errore lo dice per esteso, invece di lasciarlo
   scoprire.

5. **`35-HUMAN-UAT.md` riga 11 esiste gia'** e nomina questa migration. Nessuna
   modifica necessaria.

6. **La sonda ASSIGN-04 e' ancora verde** e il quarto asse in agguato che 35-06
   segnalava non e' scattato. L'avvertimento resta valido per chi seminera' la
   prossima riga.

---

## Threat Flags

Nessuna nuova superficie fuori dal `<threat_model>` del piano. I cinque threat
dichiarati sono tutti mitigati e la mitigazione di T-35-45 e' stata **corretta**,
non rimossa: non e' l'InitPlan a limitarne il costo ma l'ordine dei bracci piu'
l'indice.

---

## Self-Check: PASSED

File dichiarati, verificati sul disco:

- `supabase/migrations/20260809004000_door_scan_events_by_assignment.sql` — FOUND
- `supabase/migrations/20260805120000_door_scan_events.sql` — FOUND, `SUPERSEDED TWICE` alla riga 151, `CREATE POLICY` ancora alla 155, `-- No INSERT` ancora alla 158
- `scripts/container/seed.mjs` — FOUND, `node --check` verde, contiene
  `THIRD_AXIS_MANAGE_CAPABILITY` e `assertDoorRegisterByAssignment`
- i tre `32-BASELINE-{policies,reads,writes}.container.35-09.json` — FOUND

Commit dichiarati, verificati con `git log`:

- `73ec30f` — FOUND — task 1
- `b049dd9` — FOUND — la correzione della premessa
- `9d4d845` — FOUND — task 2
- `fe22b09` — FOUND — le catture
