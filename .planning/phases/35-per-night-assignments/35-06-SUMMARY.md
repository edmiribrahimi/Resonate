---
phase: 35-per-night-assignments
plan: 06
subsystem: testing
tags: [postgres, rls, container-harness, write-matrix, constraint-probe, seed, assign-01, assign-04]

# Dependency graph
requires:
  - phase: 35-02
    provides: "public.party_assignments, i suoi cinque vincoli nominati, e la voce PROBE_PAYLOADS che rende eseguibile B3 sulla tabella"
  - phase: 35-03
    provides: "le tre chiavi nuove del catalogo — door.supervise, media.upload, party.manage — senza cui la sonda negativa non avrebbe una chiave libera da collisioni"
  - phase: 35-04
    provides: "il writer atomico che calcola ends_at dalla serata, cioe' la ragione per cui una finestra non si scrive con l'orologio"
  - phase: 35-05
    provides: "public.party_credits e la sua voce PROBE_PAYLOADS, piu' artists fra le tabelle referenziabili"
provides:
  - "PROBE_FUTURE_INSTANT — la finestra di permesso delle sonde e delle righe seminate, fissa e assoluta invece che now()"
  - "CONSTRAINT_PROBES e runConstraintProbes — un secondo tipo di sonda, che misura un vincolo invece di una policy e classifica quattro esiti invece di contarli"
  - "la chiave trailing constraint_probes nell'artefatto B3"
  - "il terzo asse del seed: tre account staff/approved che differiscono solo per assegnazione, piu' una riga revocata"
  - "assertThirdAxis — il rifiuto che scatta se l'asse non discrimina"
  - "tre catture a container (35-06, 35-06-personas, 35-06-final) byte-identiche a meno di phase_point"
affects: [35-07, 35-09, 35-11, 35-13, 35-15, 35-16, 35-17, 35-18, 35-21, 35-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sonda di vincolo: privilegiata, separata dalla matrice, con il nome del vincolo asserito e non solo lo SQLSTATE"
    - "terzo asse nel seed: un attributo che varia a ruolo e stato costanti"
    - "catture ripetute dello stesso stato usate come asserzione di determinismo"

key-files:
  created: []
  modified:
    - scripts/rls-baseline.mjs
    - scripts/container/seed.mjs
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-{policies,reads,writes}.container.35-06.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-{policies,reads,writes}.container.35-06-personas.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-{policies,reads,writes}.container.35-06-final.json

key-decisions:
  - "D-J era gia' chiusa da 35-02 e non e' stata riaperta: nella sonda ordinaria `user_id` prende `{{profiles}}` e `assigned_by` prende `coalesce(nullif(auth.uid(), {{profiles}}), <literal>)`. Il piano 35-06 chiedeva `auth.uid()` su `user_id`; la decisione gia' spedita e' migliore e documentata, e cambiarla avrebbe spostato celle B3 per una ragione stilistica"
  - "`ends_at` diventa un istante fisso e assoluto: `now()` rendeva ogni assegnazione seminata scaduta nell'istante in cui veniva scritta, e ARM 2 del resolver verifica `now() < ends_at`"
  - "La sonda negativa di ASSIGN-04 gira sulla connessione privilegiata e non sotto persona: misurato, sotto `authenticated` la scrittura e' rifiutata `42501` PRIMA che il CHECK sia valutato, con o senza il vincolo — quindi sotto persona ASSIGN-04 non e' misurabile affatto"
  - "La riga della sonda porta `door.supervise` e non `door.operate`: misurato, con `door.operate` collideva anche con `party_assignments_live_unique` e la mutazione produceva `23505` invece di un successo"
  - "Gli esiti delle sonde di vincolo vivono in una chiave trailing dell'artefatto B3, non fra le sue `rows`: il comparatore indicizza per `(persona, table, verb)` e le leggerebbe come `b3_cell_added` contro ogni cattura precedente"
  - "Le identita' del terzo asse usano il blocco uuid `35000001`, distinto dal literal `35000002-…-000000000001` che 35-02 ha fissato come fallback della sonda"
  - "`public.profiles` e' una tabella che questa fase TOCCA (`20260809000000` le aggiunge `profiles_id_role_unique`), quindi il suo conteggio che si muove non viola T-35-29"

patterns-established:
  - "Sonda di vincolo: una domanda diversa dalla matrice — «il database rifiuta una riga disonesta» invece di «chi puo' scrivere» — con la sua cella, il suo esito atteso e il nome del vincolo asserito"
  - "Ogni altra condizione della riga di sonda e' deliberatamente SODDISFATTA, cosi' che l'unico motivo di rifiuto sia quello misurato"
  - "Terzo asse: per provare una proprieta' per-notte servono almeno due notti e tre soggetti identici su ogni altro asse"
  - "Una riga revocata con `ends_at` ancora futuro: e' l'unico modo di distinguere «revocata» da «scaduta»"

requirements-completed: [ASSIGN-01, ASSIGN-04, ASSIGN-06]

# Metrics
duration: 95min
completed: 2026-08-09
---

# Phase 35 Plan 06: Rendere misurabile il terzo asse Summary

**La griglia del container aveva due assi; adesso ne ha tre, ASSIGN-04 ha una sonda tarata in cinque direzioni, e la matrice di scrittura gira su entrambe le tabelle nuove senza che una sola cella delle tabelle vecchie si muova.**

## Performance

- **Duration:** ~95 min
- **Tasks:** 3/3
- **Files modified:** 2 script + 9 artefatti di cattura
- **Container runs:** 7 (1 esplorativa, 4 prove per mutazione, 3 catture)

---

## Cosa esisteva gia', e perche' va detto per primo

Il piano 35-06 e' stato scritto **prima** che 35-02 e 35-05 spedissero. Quando
l'ho eseguito, **le due voci di `PROBE_PAYLOADS` che il task 1 chiedeva
esistevano gia'** — `party_assignments` da `ba7ee06` (35-02) e `party_credits` da
`1707ea7` (35-05) — e B3 girava gia' su entrambe le tabelle. Il task 1 non era
quindi «aggiungere due voci»: era una sola correzione, e non cosmetica.

Dirlo e' obbligatorio. Un SUMMARY che rivendicasse le due voci rivendicherebbe
lavoro di altri due piani.

---

## Task 1 — `ends_at` non si scrive con l'orologio

**Commit:** `453a766` · `scripts/rls-baseline.mjs`

`ends_at` nella voce `party_assignments` passa da `now()` a
`PROBE_FUTURE_INSTANT` (`'2099-12-31 23:00:00+00'::timestamptz`), con la sua
costante e il suo paragrafo.

**Il difetto che questo chiude non e' la riproducibilita' — e' peggio.**
`scripts/container/seed.mjs:586-639` materializza lo stesso payload in righe
vere. Con `ends_at = now()` le due assegnazioni seminate erano **scadute
nell'istante in cui venivano scritte**, e ARM 2 del resolver verifica
`now() < pa.ends_at` (`20260809001000_assignment_resolver.sql:355`): quelle
righe non avrebbero mai potuto concedere niente. Il terzo asse del task 3 non
avrebbe discriminato — avrebbe risposto `false` ovunque, che e' la forma piu'
educata di vacuita'.

Accanto e' scritto un fatto che il prossimo lettore darebbe per sbagliato:
**`revoked_at` NON e' una guardia monotona** ai sensi di `meta-gates.md`. Sta
fuori dalla sonda di UPDATE perche' allarga un permesso alla porta, non perche'
sia irreversibile — `party_assignments_live_unique` e' parziale su
`revoked_at IS NULL` (`20260809000000:514-516`) **proprio** per permettere di
ri-assegnare dopo una revoca.

### Criteri di accettazione

| Criterio | Esito |
|---|---|
| B3 gira, nessun «PROBE_PAYLOADS has no entry» | ✅ `B3_RUNS`, 966 sonde, 23 tabelle |
| Sopra la voce, il paragrafo su quale colonna prende `auth.uid()` | ✅ gia' presente da 35-02, `rls-baseline.mjs:1242-1298` |
| La voce **non** contiene due occorrenze di `auth.uid()` | ✅ una sola, dentro `coalesce(nullif(...))` |
| La voce **non** contiene `now()` | ✅ |

---

## Task 2 — ASSIGN-04 ha una sonda propria, tarata in cinque direzioni

**Commit:** `6539123` · `scripts/rls-baseline.mjs`

`CONSTRAINT_PROBES` (`rls-baseline.mjs:1432-1542`) e `runConstraintProbes`
(`:1743-1813`): una sonda **separata** dalla matrice, sulla connessione
privilegiata, il cui esito atteso e' `23514` dal vincolo
`party_assignments_no_self_grant` **chiamato per nome**.

**Perche' separata, e perche' privilegiata.** Sono due domande diverse — *chi
puo' scrivere una riga* e *il database rifiuta una riga disonesta*. E su questa
tabella non potrebbero comunque condividere una cella: `party_assignments` ha
RLS attiva e **nessuna policy di scrittura** (`20260809000000`, sezione 3f),
quindi ogni persona e' rifiutata `42501` prima che un vincolo venga valutato.
Una sonda sotto persona riporterebbe `42501` su tutte e quattordici le celle e
misurerebbe **niente** di ASSIGN-04. La connessione privilegiata non e' una
scorciatoia: e' il percorso su cui la regola deve davvero reggere, e la
migration lo dice in una riga (`20260809000000:302-304`) — *«the service client
bypasses every RLS policy and bypasses no constraint»*.

**Lo script distingue quattro esiti** invece di contarli: `23514` col nome
giusto (l'unico verde), `42501` (*«the policy set was measured and the CHECK was
NOT»*), `23514` da un altro vincolo, e nessun errore. Su produzione **stampa che
e' stata saltata**: un salto silenzioso si legge come un verde.

### La prova per mutazione — cinque direzioni, ogni mutazione asserita prima di leggerne l'esito

Script usa-e-getta in `/tmp` (mai committato), che pilota **il codice vero**
`runConstraintProbes` e non una copia. L'harness a container **non legge nessuna
variabile d'ambiente**: non esiste percorso verso un database vero, e il
container e' distrutto nel `finally`.

| # | Mutazione | Asserzione della mutazione | Esito osservato | Verdetto |
|---|---|---|---|---|
| **A** | nessuna | `constraint present: true` | `23514 party_assignments_no_self_grant` | `pass=true` |
| **B** | stessa stringa di sonda con `set local role authenticated` | `constraint present: true` | `42501` | `pass=false` — *«stopped by RLS before the CHECK was evaluated — the policy set was measured and "party_assignments_no_self_grant" was NOT»* |
| **C** | `DROP CONSTRAINT party_assignments_no_self_grant` | `present before: true` → **`present after: false`**, letto **prima** di C | `no error` | `pass=false` — *«the insert SUCCEEDED»* |
| **D** | vincolo ancora assente, di nuovo come `authenticated` | `constraint present: false` | `42501` | `pass=false`, stesso testo di B |
| **E** | `ADD CONSTRAINT … check (assigned_by <> user_id)` | `present after the restore: true`, letto **prima** di E | `23514 party_assignments_no_self_grant` | `pass=true` |

```
=== VERDICT ===
✓ A green, 23514 from the named constraint
✓ B red under `authenticated` even with the constraint PRESENT — the write never reaches the CHECK
✓ B says the CHECK was NOT measured
✓ C red, and the insert SUCCEEDED
✓ D red, reported as 42501 and never as a pass
✓ D says the CHECK was NOT measured
✓ E green again after the restore
CALIBRATED IN FIVE DIRECTIONS: green only while the constraint exists AND is reached,
and the two ways of not being green are named apart.
```

**Il `DROP` e' stato letto prima del risultato che ne dipende**, e lo script
solleva se la mutazione non e' andata a segno:
*«THE MUTATION DID NOT APPLY: the constraint is still on the table. Anything read
after this line would be a false negative.»* E' il gate *prova per mutazione* di
`ai-engineering.md`, che questo repo ha gia' visto fallire in silenzio una volta.

### Due cose che la mutazione ha misurato e che nessuno aveva chiesto

**1. La riga della sonda aveva due motivi per essere rifiutata.** Con
`door.operate` — la scelta ovvia — la riga collideva anche con
`party_assignments_live_unique`, perche' il seed ha gia' una riga viva
`door.operate` per esattamente quell'account su esattamente quella notte. Con il
`CHECK` presente la cella era verde (`ExecConstraints` precede l'inserimento in
indice), ma con il `CHECK` rimosso la mutazione riportava **`23505` invece di un
successo**: una cella rossa in entrambe le condizioni, cioe' una cella che non
dice quale regola sta riportando. Corretto a `door.supervise`, che nessuna riga
seminata porta. Il paragrafo dice anche **quale sara' il sintomo** se un piano
futuro seminera' un `door.supervise` sulla notte piu' bassa.

**2. L'ipotesi su B era sbagliata, e la misura l'ha corretta.** Avevo scritto
che un `CHECK` di tabella e' valutato **prima** del `WITH CHECK` della RLS, e
che quindi sotto `authenticated` si sarebbe visto comunque `23514`. Non e' cosi':
si vede `42501` **anche con il vincolo presente**. Prima e' stato provato
`FORCE ROW LEVEL SECURITY` da superuser, che non riproduce niente perche' un
superuser bypassa la RLS comunque — registrato nel codice cosi' che il prossimo
non ci spenda una corsa. Il fatto misurato e' ora scritto sopra
`CONSTRAINT_PROBES`, e rende il ramo `42501` **non decorativo**: e' l'unica cosa
che impedisce a chi spostasse questa sonda sotto persona di leggere un `42501`
come un verde su una tabella dove il vincolo e' stato cancellato.

### Criteri di accettazione

| Criterio | Esito |
|---|---|
| `35-06-final` contiene la sonda negativa e la sonda e' verde | ✅ `constraint_probes[0].pass = true` |
| Il SUMMARY riporta i passi della mutazione, col `DROP` **prima** del risultato | ✅ tabella sopra |
| Lo script distingue `23514` da `42501` | ✅ direzioni B e D, testo diverso e `pass=false` in entrambe |
| `grep party_assignments_no_self_grant scripts/rls-baseline.mjs` | ✅ |

---

## Task 3 — il terzo asse

**Commit:** `6f40458` · `scripts/container/seed.mjs`

Tre account `staff/approved` che differiscono **solo** per assegnazione, piu' una
quarta riga gia' revocata:

| account | notte 1 | notte 2 |
|---|---|---|
| `Seed Persona staff assigned night1` | **LIVE** `door.operate` | — |
| `Seed Persona staff assigned night2` | — | **LIVE** `door.operate` |
| `Seed Persona staff unassigned` | **REVOCATA** | — |

Letta in colonna, la colonna «notte 1» e' l'asse: tre account con lo stesso
ruolo e lo stesso stato, tre risposte diverse. E' la coppia (persona, notte) che
ASSIGN-01 richiede — `false` per una persona su una notte mentre la **stessa**
persona su un'altra notte risponde `true`.

Output osservato del seed:

```
      third axis  assigned night1  night1=true night2=false
      third axis  assigned night2  night1=false night2=true
      third axis  unassigned       night1=false night2=false
      third axis  1 revoked row, ends_at still in the future — revocation withholds
                  the grant on its own, not by expiry
      seeded 23 tables, 15 profiles, 12/12 role × status cells
```

**La riga revocata ha `ends_at` ancora nel futuro, ed e' deliberato.** Con un
`ends_at` passato la riga sarebbe stata negata dalla **scadenza** e non avrebbe
provato niente sulla revoca. Cosi' com'e', prova due cose che nessuna riga viva
puo' provare: che una revoca toglie il permesso **da sola** (ASSIGN-03), e che
una riga revocata non blocca la demozione del suo titolare, perche'
`assignee_role` e' `NULL` e una chiave composta `MATCH SIMPLE` non viene
verificata quando una colonna referenziante e' nulla (`20260809000000`, 3b).

**Nessun vincolo e' rilassato.** Il seed rilassa `profiles_role_implies_approved`
attorno al ciclo delle persone perche' sei delle dodici sono irrappresentabili
senza (D-05); qui non serve niente di simile — i tre sono `staff` e `approved`, e
`party_assignments_assignee_role_fk` **deve** reggere su ognuna di queste righe.
Gli `insert` non sono protetti da un `try` proprio per questo: se la chiave non
regge, il seed ha trovato un difetto e deve fallire rumorosamente.

`assertThirdAxis` (`seed.mjs:766-847`) rilegge la griglia con il **predicato di
liveness del resolver** — `revoked_at is null and now() < ends_at`, le due
condizioni di `20260809001000:353-355` — e rifiuta se l'asse non discrimina; e
asserisce **per nome** `party_assignments_assignee_role_fk`, perche' chi rinomina
un vincolo lo rinomina anche nel seed (`20260808001000:179-181`).

Gli id del terzo asse ordinano **dopo** `32000004…`, e non e' un dettaglio:
`resolvePersonas` risolve ogni cella della griglia sull'id piu' basso, quindi
`staff/approved` continua a risolvere sulla persona della griglia e nessuna riga
di matrice si sposta; e `min(pk)` su `public.profiles` continua a nominare
`master/approved`, che e' cio' che `assertProbeRowSatisfiesTheRule` esiste per
proteggere.

### Criteri di accettazione

| Criterio | Esito |
|---|---|
| `--phase-point=35-06-personas` esce 0 | ✅ |
| `grep -c '35000001' scripts/container/seed.mjs` >= 3 | ✅ **4** |
| Nessun nome di persona reale, ogni indirizzo su `.invalid` | ✅ `Seed Persona staff <asse>`, `seed-staff-<asse>@example.invalid` |
| La cattura mostra almeno una riga revocata | ✅ `party_assignments` 2 → 5 righe, di cui 1 revocata |
| Il seed **non** contiene `DROP CONSTRAINT party_assignments_assignee_role_fk` | ✅ |

---

## Le catture, e cosa si e' mosso

**Commit:** `9de3cd9` · 9 artefatti

Tre punti di fase — `35-06`, `35-06-personas`, `35-06-final` — da tre container
costruiti da zero e distrutti, sullo **stesso** stato del codice.

I tre task si sono rivelati **un solo cambiamento indivisibile su due file**: la
sonda negativa consuma la costante del task 1, e il terzo asse non
discriminerebbe se le assegnazioni seminate fossero scadute all'arrivo. Tre
catture dello stesso stato sarebbero rumore — se non fosse che sono
**byte-identiche a meno di `phase_point`**, verificato voce per voce, e questo e'
l'unico posto della fase in cui il contratto di determinismo (D-15) e' stato
**osservato** invece che dichiarato:

```
policies  35-06 vs 35-06-personas  identical=true
policies  35-06 vs 35-06-final     identical=true
reads     35-06 vs 35-06-personas  identical=true
reads     35-06 vs 35-06-final     identical=true
writes    35-06 vs 35-06-personas  identical=true
writes    35-06 vs 35-06-final     identical=true
```

### `35-05` → `35-06-final`: si muovono due sole tabelle

```
✗ b2_count_changed — master/approved × party_assignments   2 → 5 rows visible
✗ b2_count_changed — master/approved × profiles           12 → 15 rows visible
… le stesse due righe per master/pending, master/rejected,
  organizer/approved, organizer/pending, organizer/rejected
```

**B3 non si muove di una sola cella.** Ne' il nuovo `ends_at` ne' le quattro
righe in piu' spostano un verdetto di scrittura, su nessuna delle 23 tabelle.

`profiles` si muove perche' il terzo asse aggiunge tre account, e **non viola
T-35-29**: `public.profiles` e' una tabella che **questa fase tocca** —
`20260809000000` le aggiunge `profiles_id_role_unique`, senza la quale la chiave
composta di `party_assignments` non potrebbe esistere (`42830`). Le sei persone
che vedono la differenza sono i tre `master` e i tre `organizer`, cioe'
esattamente quelle che tengono `staff.manage`.

### `35-pre` → `35-06-final`: il quadro completo

| Difetto | Conteggio | Tabella | Attribuzione |
|---|---|---|---|
| `b3_cell_added` | 42 | `party_assignments` | 35-02 crea la tabella |
| `b3_cell_added` | 42 | `party_credits` | 35-05 crea la tabella |
| `b2_cell_added` | 14 | `party_assignments` | 35-02 |
| `b2_cell_added` | 14 | `party_credits` | 35-05 |
| `b2_count_changed` | 6 | `profiles` | **35-06**, il terzo asse |
| `b3_result_changed` | 3 | `artists` × `delete`, `ok:1 → 23503` | **35-05**: `party_credits.artist_id` e' `NOT NULL REFERENCES public.artists`, e ora esistono crediti che puntano all'artista piu' basso |

Le tre righe su `artists` sono ereditate e **non** prodotte da questo piano:
il confronto `35-05 → 35-06-final` non le contiene.

---

## Deviazioni dal piano

### 1. [Regola 1 — difetto] La riga della sonda negativa aveva due motivi di rifiuto

- **Trovato durante:** task 2, alla prima prova per mutazione
- **Problema:** con `door.operate` la riga collideva con
  `party_assignments_live_unique` oltre che con `party_assignments_no_self_grant`.
  Con il `CHECK` presente vinceva il `CHECK` e la cella era verde; con il `CHECK`
  rimosso la cella restava rossa per `23505`. Una cella rossa in entrambe le
  condizioni non dice quale regola sta riportando — che e' esattamente il difetto
  che questa sonda esiste per evitare, un livello piu' su. E il commento che
  avevo scritto («l'unica cosa sbagliata in questa riga e' l'auto-assegnazione»)
  era **falso**.
- **Correzione:** `capability` passa a `'door.supervise'` — assegnabile, esistente
  nel catalogo dopo `20260809001000`, e non portata da nessuna riga seminata. La
  mutazione ora produce `no error`, cioe' il segnale massimo.
- **File:** `scripts/rls-baseline.mjs`
- **Commit:** `6539123`

### 2. Il task 1 era in gran parte gia' fatto da 35-02 e 35-05

Il piano chiedeva di **aggiungere** due voci a `PROBE_PAYLOADS`. Esistevano gia',
con la decisione D-J presa e scritta. Il piano chiedeva anche `user_id` con
`auth.uid()`; 35-02 ha deciso `{{profiles}}` con una motivazione misurata (con
`auth.uid()` due persone su quattordici — `anon` e
`authenticated/no-profile` — darebbero `23502`, un rifiuto per la ragione
sbagliata). **Non l'ho riaperta**: la decisione spedita e' migliore di quella
pianificata, e cambiarla avrebbe spostato celle B3 per una ragione stilistica.
Stesso trattamento per `party_credits`, dove il piano chiedeva `created_by` con
`auth.uid()` e `sort_order` a `0`: 35-05 li omette perche' `created_by` e'
riempito dal meccanismo della colonna proprietaria e `sort_order` e' la colonna
di UPDATE.

### 3. Un solo stato di codice per tre punti di fase

Il piano prevedeva tre stati sequenziali. I tre task sono un cambiamento
indivisibile su due file. Le tre catture sono state prese comunque, e la loro
identita' e' stata **verificata e usata come asserzione** invece di essere
subita come rumore.

### 4. Il commit del task 1 non e' mai stato eseguito nel suo stato intermedio

Per rispettare un commit per task ho ricostruito lo stato «solo task 1» a partire
da una copia di sicurezza del file completo, committato, e ripristinato. Lo stato
di `453a766` e' quindi **coerente e sintatticamente valido** (`node --check`), ma
**non e' stato eseguito a container**: le sette corse a container sono tutte sullo
stato finale. Detto perche' un commit che nessuno ha eseguito e' un commit di cui
non si sa niente, e sapere quale sia e' meglio che crederli tutti provati.

---

## Il gate della verifica, dichiarato onestamente

- **T3 pagato:** 7 corse a container. `35-VALIDATION.md` dichiara «35-06 T3», e
  T3 e' l'unico livello che dice qualcosa su questo piano.
- **`npm run build` NON e' stato eseguito, e non e' un'omissione.** I due file
  toccati sono script Node fuori dal grafo di compilazione di Next: il build non
  li typechecka e non li importa, quindi un verde direbbe soltanto che il
  prodotto compila come prima. `35-VALIDATION.md` non elenca T1 per 35-06.
- **Nessun test runner esiste per il prodotto.** Niente qui e' «verificato perche'
  i test passano»: e' verificato perche' un container e' stato costruito, seminato
  e interrogato, e perche' una regola e' stata deliberatamente rotta per vedere il
  controllo scattare.

### Cosa questo piano NON prova

- **Che una persona assegnata ARRIVI allo strumento.** La matrice prova il
  permesso; il rimbalzo del middleware e le tre superfici si osservano solo
  aprendo l'applicazione (`35-VALIDATION.md`, procedure 9–12).
- **ASSIGN-01 nella sua interezza.** Il terzo asse rende il requisito
  *misurabile*; oggi nessuna policy passa un `p_party_id`, quindi nessuna cella
  della matrice cambia in funzione dell'assegnazione. Le celle che lo faranno
  arrivano con i piani che consumano `private.has_capability(text, uuid)`.
- **ASSIGN-06 oltre la forma della riga.** La prova negativa — «una persona con
  un credito e nessuna assegnazione ha la stessa matrice di un `member`» — e'
  disponibile nella cattura ma non e' stata estratta come asserzione eseguibile.

---

## Note per l'orchestratore (non scritte in `deferred-items.md`)

1. **`verify:capabilities` resta giallo di proposito** sul quarto lato: le tre
   chiavi nuove non hanno ancora un consumatore. Nessun avviso e' stato messo a
   tacere.
2. **Il quarto asse in agguato.** Se un piano futuro seminera' una
   `door.supervise` per il profilo piu' basso sulla notte piu' bassa, la sonda
   negativa di ASSIGN-04 ricomincera' a collidere. Il sintomo e' scritto nel
   codice: una corsa di mutazione che riporta `23505` invece di un successo.
3. **`profiles` si muove nella baseline.** Chi confrontera' `35-pre` con la
   cattura di fine fase trovera' `b2_count_changed` su `profiles` per sei
   persone. E' questo piano, e' dichiarato, e la tabella e' toccata dalla fase.
4. **Il conteggio dei profili seminati e' 15, non 12.** Il report del seed lo dice
   e `--seed-only` lo stampa: chi ha in mente il numero vecchio lo aggiorni.

---

## Self-Check: PASSED

File dichiarati, verificati sul disco:

- `scripts/rls-baseline.mjs` — FOUND, contiene `PROBE_FUTURE_INSTANT`,
  `CONSTRAINT_PROBES`, `runConstraintProbes`, `party_assignments_no_self_grant`
- `scripts/container/seed.mjs` — FOUND, `grep -c '35000001'` = 4, nessun
  `DROP CONSTRAINT party_assignments_assignee_role_fk`
- 9 artefatti `32-BASELINE-{policies,reads,writes}.container.35-06{,-personas,-final}.json`
  — FOUND, tutti committati

Commit dichiarati, verificati con `git log`:

- `453a766` — FOUND — task 1
- `6539123` — FOUND — task 2
- `6f40458` — FOUND — task 3
- `9de3cd9` — FOUND — le tre catture
