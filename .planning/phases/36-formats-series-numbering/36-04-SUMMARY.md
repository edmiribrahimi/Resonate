---
phase: 36-formats-series-numbering
plan: 04
subsystem: tooling
tags: [baseline, rls, container, constraint-probe, harness, postgres, evidence]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: "supabase/migrations/20260810120000_formats_and_series.sql (36-03) — the file this run executes"
  - phase: 36-formats-series-numbering
    provides: "il punto `pre-36` su container (36-01) — il prima contro cui si legge questo dopo"
  - phase: 32-capability-model-in-the-database
    provides: "scripts/rls-baseline.mjs, scripts/container/seed.mjs, la cartella baseline/"
provides:
  - "La sonda di scrittura su event_parties che continua a misurare la policy dopo le tre colonne NOT NULL"
  - "Due celle nuove nella matrice di lettura, una per tabella nuova"
  - "Le due sonde di vincolo di FMT-03, che rifiutano per nome in una corsa automatica"
  - "Il punto container `36-04`: la prima esecuzione della migration da parte di una macchina"
  - "La figura che 36-01 chiedeva di far salire: sonde di vincolo che rifiutano come dichiarato 3/3, era 1/1"
affects: [36-05, 36-06, 36-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Una referenza derivata (`{{party_series_format}}`) risolta UNA volta sulla connessione privilegiata: due colonne che sono un fatto solo non possono essere risolte indipendentemente"
    - "Una sotto-select dentro un payload e' sicura solo dove la policy di INSERT e quella di SELECT sono lo stesso predicato"
    - "Il colore di una riga di catalogo seminata si deriva dal sentinel, perche' l'indice unico parziale rifiuterebbe la seconda riga"

key-files:
  created:
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.36-04.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.36-04.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.36-04.json
    - .planning/phases/36-formats-series-numbering/36-04-SUMMARY.md
  modified:
    - scripts/rls-baseline.mjs
    - scripts/container/seed.mjs

key-decisions:
  - "`format_id` NON e' una sotto-select su `public.party_series`, contro la lettera del piano: `catalogue.manage` pretende `approved` e quattro celle oggi `ok:1` sarebbero diventate `23502`. La coppia si risolve una volta sola, privilegiata"
  - "`number` resta una sotto-select, e li' e' sicura: `event_parties_insert_admin` e `event_parties_select_admin` sono lo stesso predicato, quindi chi puo' inserire vede tutto"
  - "Il colore di `formats` deriva da un md5 del sentinel: una costante avrebbe fermato il SEED sulla seconda riga, non la sonda"
  - "Due commit per due task, separando a mano il blocco delle sonde: la migration di 36-03 fu un commit solo perche' le due meta' non si applicavano separate — qui si"
  - "Nessun `FMT-*` spuntato in REQUIREMENTS.md — D-36-19"

patterns-established:
  - "Prima di allargare un payload della matrice, si guarda CHI oggi risponde `ok:1` in quella riga: una sotto-select che legge una tabella con un gate diverso trasforma un permesso misurato in una cella che non misura piu'"

requirements-completed: []  # deliberatamente vuoto — D-36-19

# Metrics
duration: 18min
completed: 2026-08-10
---

# Phase 36 Plan 04: Gli strumenti continuano a misurare — Summary

**Le 966 celle di scrittura e le 322 di lettura che esistevano prima di questa fase sono uscite dalla corsa IDENTICHE, zero `23502`, mentre la migration di 36-03 veniva eseguita per la prima volta da una macchina su un Postgres vero — e le sonde di vincolo che rifiutano come dichiarato sono passate da 1/1 a 3/3.**

## Performance

- **Duration:** ~18 min
- **Tasks:** 3 di 3
- **Commits:** 3
- **Scritture in produzione:** **zero.** Il container si costruisce da un database vuoto, applica 55 migration, semina 16 profili e si distrugge.

---

## La figura che il piano chiedeva di far salire

`36-01-SUMMARY.md` la lascia scritta come avvertimento: *«se a fine fase questa riga dicesse ancora 1/1, la fase non avrebbe misurato i propri vincoli»*.

| | `pre-36` | `36-04` |
|---|---|---|
| **Sonde di vincolo che rifiutano come dichiarato** | **1 / 1** | **3 / 3** |
| Migration applicate | 54 | 55 |
| Tabelle con RLS (pavimento: 20) | 23 | **25** |
| Policy | 72 | **76** |
| Celle della matrice di lettura | 322 | 350 · **0 vacue** |
| Sonde di scrittura | 966 | 1050 |
| Celle inconcludenti (D-19) | 25 | **25** |

---

## Le tre sonde di vincolo, come la corsa le ha riportate

Trascritte dall'output, non ricomposte:

```
✓ ASSIGN-04  party_assignments    23514 party_assignments_no_self_grant           refused as declared
✓ FMT-03     event_parties        23505 event_parties_format_series_number_unique refused as declared
✓ FMT-03-FK  event_parties        23503 event_parties_series_format_fk            refused as declared
```

`captureB3` **lancia** se una sonda non rifiuta come dichiarato, e il confronto e' su SQLSTATE **e** nome del vincolo. Quindi FMT-03 e' oggi l'unico requisito di questa fase con un cancello automatico che spara: se domani qualcuno togliesse `event_parties_format_series_number_unique` come riordino, `npm run baseline:container` uscirebbe 1 con la frase *«the insert SUCCEEDED — … did not refuse it»*.

**Cosa rompe ciascuna delle due, e cosa invece regge apposta:**

- **FMT-03** copia evento, formato, serie e numero da una serata che esiste gia'. La chiave composta regge (la coppia e' una che una riga vera porta davvero), il `CHECK` sul numero regge (il numero e' uno che il database ha gia' accettato), e `UNIQUE (event_id, type)` non esiste piu' dal `20260226300000`. Resta rotta solo l'unicita' della terna.
- **FMT-03-FK** prende la serie da `{{party_series}}` e il formato da un `select … where f.id <> <il formato di quella serie> order by f.id limit 1`. Il numero e' `max + 1` **dentro quella serie**, cosi' l'unicita' non puo' sparare per prima e rubare la misura.

---

## Cosa questa corsa esercita davvero, arm per arm

`36-03-SUMMARY.md` dichiara il proprio buco: nel suo container `private.has_capability` restituiva **sempre `false`**, quindi l'arm `catalogue.manage` delle due policy fu esercitato solo come **non-concessione**. Questa corsa lo chiude — e ne apre un altro, che va detto invece che taciuto.

### `public.formats` — la matrice di lettura, per persona

| Persona | Righe lette | Quale arm ha risposto |
|---|---|---|
| `anon`, `authenticated/no-profile`, `member/*`, `staff/*`, `master/pending`, `master/rejected`, `organizer/pending`, `organizer/rejected` | **4** | `formats_select_listed` — **concessione**. `catalogue.manage` **non**-concessione |
| `master/approved`, `organizer/approved` | **7** | entrambi: il gate della pubblicazione **piu'** `catalogue.manage` come **CONCESSIONE** |

Le 4 righe sono i quattro format `listed = true` della sezione 5; le 3 in piu' sono `unclassified` (ritirato alla nascita, `listed = false`) e le due righe seminate dal container, anch'esse non elencate. **La cella non e' vacua per nessuno** e discrimina 4 contro 7: e' la prova che `listed` non e' decorativo.

### `public.party_series` — la matrice di lettura, per persona

| Persona | Righe lette | Quale arm ha risposto |
|---|---|---|
| dodici persona su quattordici | **0** | `party_series_select_published` **non**-concessione e `catalogue.manage` **non**-concessione |
| `master/approved`, `organizer/approved` | **8** | `catalogue.manage` come **CONCESSIONE** |

**`vacuous = false` su tutte e quattordici**, perche' la tabella globalmente ha righe: uno zero qui e' un rifiuto misurato, non un'assenza di dati.

### E qui la frase che questa corsa NON puo' dire

**L'arm `party_series_select_published` non e' mai stato esercitato come concessione.** Il seme del container non pubblica alcun evento (`is_published` resta al suo default `false`), quindi il gate della pubblicazione ha risposto *no* quattordici volte su quattordici. La corsa stubbata del piano 36-03 fece l'opposto — con un evento pubblicato vide sparire le quattro serie senza serate — quindi **le due corse insieme coprono i due arm, e nessuna delle due li copre entrambi.** Scriverlo e' il punto: una tabella che rifiuta sempre e una tabella dietro un gate hanno lo stesso aspetto in una matrice, se il gate non lo si vede mai aprire.

### Le scritture sulle due tabelle nuove

`formats` e `party_series` non hanno alcuna policy di scrittura (sezione 4c). Misurato:

| Verbo | Risultato, per **tutte** e quattordici le persona |
|---|---|
| `insert` | `42501` — la policy assente rifiuta |
| `update` | `ok:0` — nessuna policy `UPDATE`, quindi nessuna riga qualifica: no-op silenzioso |
| `delete` | `ok:0` — idem |

E' la stessa distinzione che 36-03 aveva registrato a mano contro `anon`, ora su quattordici persona.

---

## `baseline:compare pre-36 → 36-04`: 118 difetti, **zero movimenti**

Il comparatore esce 1. Va letto, non temuto: **ogni difetto e' un'AGGIUNTA**, e le celle che esistevano prima non si sono mosse di un bit.

Misurato direttamente sui due artefatti, oltre che letto dal comparatore:

```
B3 celle condivise: 966   mosse: 0
B2 celle condivise: 322   mosse: 0
```

`B1` lo dice con le sue parole: **`72 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained`.**

### Una frase per ogni cella che si e' mossa — e per ogni cella comparsa

| Classe | Quante | Perche' |
|---|---|---|
| `policy_added` | **4** | `formats_select_listed`, `formats_select_catalogue_manage`, `party_series_select_published`, `party_series_select_catalogue_manage`. Sono le quattro policy della sezione 4 della migration, ed e' la prima volta che un database le tiene. Il comparatore avverte che una policy aggiunta **allarga**: qui allarga su due tabelle che prima non esistevano, quindi non allarga niente che fosse chiuso |
| `supporting_count_changed` — `policy_count` | **1** | 72 → 76. Sono le quattro sopra, contate una seconda volta come somma |
| `supporting_count_changed` — `rls_enabled_tables` | **1** | 23 → 25. Le due tabelle nuove hanno `ENABLE ROW LEVEL SECURITY` nella stessa migration che le crea (`supabase-data.md`, gate *tabella nuova = policy nuova*). Il pavimento e' 20 e resta largamente superato |
| `b2_cell_added` | **28** | 14 persona × 2 tabelle nuove. Sono le due celle di lettura che `36-VALIDATION.md` chiedeva: senza, le policy delle due tabelle non sarebbero misurate da niente |
| `b3_cell_added` | **84** | 14 persona × 2 tabelle × 3 verbi. Idem per la scrittura |
| **Celle preesistenti mosse** | **0** | **Nessuna.** In particolare la riga `event_parties × insert` e' identica a `pre-36`: `ok:1` per `master/*` e `organizer/*`, `42501` per le altre otto |

**E il controllo che il piano chiedeva per primo: nessuna riga della matrice legge `23502`.** Non «nessuna riga uniformemente `23502`»: **zero celle su 1050**. La sonda di scrittura non ha smesso di misurare, ed e' la ragione per cui questo piano esisteva.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] `format_id` non e' una sotto-select su `public.party_series`, come il piano prescriveva alla lettera**

- **Trovato durante:** Task 1, leggendo `pre-36` prima di scrivere il payload.
- **Questione.** Il piano dice: *«Take it from the series instead — a scalar subquery reading `format_id` off `public.party_series` for the id the placeholder resolved to»*. Quella sotto-select gira **sotto le policy di lettura della persona**, e `public.party_series` e' leggibile solo con `catalogue.manage` o attraverso una serata pubblicata. `catalogue.manage` porta `requires_approved = true` (`20260807000000_capability_model.sql:399-400`); l'INSERT su `event_parties` **no**. Il `pre-36` registra `ok:1` per `master/pending`, `master/rejected`, `organizer/pending` e `organizer/rejected`: quelle quattro avrebbero letto `NULL`, scritto `NULL` in una colonna `NOT NULL` e riportato `23502`, che D-19 registra come **inconcludente**. Quattro permessi misurati sarebbero diventati quattro celle che non misurano niente — la stessa identica avaria che questo piano esiste per impedire, un `23502` piu' in la'.
- **Fix.** Una **referenza derivata**, `{{party_series_format}}`: il formato della serie che `{{party_series}}` ha risolto, letto **una volta sola sulla connessione privilegiata**, nello stesso respiro di ogni altra referenza. E' la stessa invariante che il piano 35-18 compro' per `event_media` con `private.party_event_id(uuid)` — *lo stesso valore per ogni persona* — ottenuta senza aggiungere una funzione allo schema per far contento un harness.
- **Come si vede che ha funzionato:** la riga `event_parties × insert` e' byte-identica a `pre-36`, e zero celle su 1050 leggono `23502`.
- **File modificati:** `scripts/rls-baseline.mjs`, `scripts/container/seed.mjs`
- **Commit:** `8f3005d`

**2. [Rule 2 — Missing critical] Il colore di `formats` non e' una costante**

- **Trovato durante:** Task 1, leggendo `formats_color_active_unique`.
- **Questione:** e' un indice unico **parziale** su `color` dove `retired_at IS NULL`, e le due righe che il seme pianta sono entrambe attive. Una costante avrebbe rifiutato la seconda con `23505` e il seme si sarebbe fermato **prima che esistesse una sola serata** — cioe' l'avaria sarebbe arrivata dal seme, non dalla sonda, e nessuna delle due tabelle sarebbe mai stata misurata.
- **Fix:** `'#' || substr(md5(<sentinel>), 1, 6)`. `materialise` riscrive il sentinel per riga, quindi il valore differisce; md5 rende esadecimale minuscolo, quindi `formats_color_hex_check` regge; e non c'e' alcun random, quindi due corse identiche costruiscono lo stesso database.
- **Commit:** `8f3005d`

### Departures dal testo del piano, deliberate e dichiarate

- **`number` **resta** la sotto-select che il piano chiede**, e la ragione per cui li' e' sicura va scritta accanto a quella per cui altrove non lo era: `event_parties_insert_admin` e `event_parties_select_admin` sono **lo stesso predicato** (`20260225150000:40-45`), quindi ogni persona che puo' inserire vede ogni serata e calcola il numero giusto; le otto che la policy rifiuta prendono `42501` prima che un indice unico venga consultato. Una costante sarebbe stata peggio: le righe di catalogo della migration nascono con `gen_random_uuid()`, quindi **quale** serie sia la piu' bassa cambia da corsa a corsa, e una cella `ok:1` in una cattura e `23505` in quella dopo non e' una misura.
- **Il comando di verifica del Task 3 e' stato eseguito in due pezzi.** `baseline:compare` sul bersaglio container **rifiuta `--only` di default**: `FATAL: B5 is the Supabase advisor and has no container equivalent`. Serve `--only=B1,B2,B3`. E poi esce **1**, perche' 118 aggiunte sono 118 difetti per un comparatore che non sa distinguere una tabella nuova da una policy allargata — `20260809003000:335-343` lo dice di se stesso. Il `&&` del piano avrebbe quindi mascherato l'esito della cattura dietro l'esito del confronto: sono stati eseguiti separati, e i due esiti sono riportati separati.
- **Due commit per due task.** Il blocco delle sonde e' stato separato a mano dal file per commettere il Task 1 da solo, poi rimesso e verificato **byte-identico** al file pre-separazione prima del commit del Task 2. E' l'opposto della scelta di 36-03 — li' le due meta' non si applicavano separate, qui si.

### Non fatto, apposta

- **Nessun `FMT-*` spuntato in `REQUIREMENTS.md`** — D-36-19. Questo piano prova che il database **rifiuterebbe** la terna duplicata; non l'ha applicato a nulla che una persona usi. Lo fa 36-05.
- **`36-VALIDATION.md` non e' stato toccato.** Cinque delle sei caselle di *Wave 0 Requirements* sono chiuse da questo piano — il payload allargato, `PROBE_REFERENCE_TABLES`, `SEED_ORDER`/`REFERENCEABLE`, le due celle nuove, le due sonde di vincolo — e la sesta lo era gia' da 36-01. Le caselle le spunta la verifica di fase, con l'evidenza accanto, per la stessa ragione per cui non si spuntano i requisiti.
- **Nessuna cattura in produzione**, e non e' una dimenticanza: `PROBE_REFERENCE_TABLES` ora nomina `formats` e `party_series`, quindi `npm run baseline:rls` contro la produzione **fallirebbe `42P01`** finche' 36-05 non applica la migration. E' l'ordine giusto — lo strumento sa dello schema prima che lo schema arrivi — ma va saputo prima di lanciare il comando.
- **`npm run build` non e' stato eseguito** e non proverebbe nulla: nessun TypeScript e' cambiato, e i due file toccati non entrano nel bundle.

## Issues Encountered

- Nessun errore in esecuzione. L'unica cosa che ha richiesto una misura invece di un'assunzione e' stata l'ordine di valutazione: un vincolo `NOT NULL` sparisce **prima** della `WITH CHECK` della RLS (il file lo aveva gia' misurato per `membership_acts` e `party_assignments`), mentre un indice unico spara **dopo**. E' la ragione per cui `format_id` non poteva restare persona-dipendente e `number` invece si.

## Threat Flags

Nessuna. Le due modifiche non toccano alcuna superficie del prodotto: sono un harness che scrive dentro `begin; … rollback;` contro un container effimero. La clausola 1/2 ha verificato **1050 stringhe** prima di inviarne una, la clausola 2/2 ha riletto **25/25 conteggi di riga immutati** dopo. T-36-04-04 chiuso con un controllo eseguito: `grep -oiE "booze|muro|perlone|sunset|ramadub|motionlab|re:sonate|https?://|sbp_|eyJ"` sui tre artefatti nuovi restituisce **zero occorrenze** — B2 memorizza un md5 di chiavi primarie ordinate, mai il contenuto di una riga, e ogni stringa seminata e' sintetica.

## Cosa questo piano NON prova

1. **Non prova che il gate rifiuti una persona reale.** Nessuno strumento di questo repository puo' autenticarsi come un ruolo: e' il debito delle 32 voci `human_needed`, che questa fase non consuma e non peggiora.
2. **Non ha visto `party_series_select_published` concedere.** Vedi sopra: nel container nessun evento e' pubblicato.
3. **Non e' la produzione.** Il container ripristina `profiles_role_implies_approved` come `NOT VALID` (`convalidated=false` qui, `true` in produzione), e la cattura lo dichiara perche' nessun artefatto legge `pg_constraint`.
4. **Non dice che una policy sia giusta.** Dice cosa si e' mosso. La correttezza e' un giudizio umano su quel confronto, e questo repository non ha un test runner.

## Self-Check: PASSED

- `.planning/.../32-BASELINE-policies.container.36-04.json` — presente, `"phase_point": "36-04"`
- `.planning/.../32-BASELINE-reads.container.36-04.json` — presente, `"phase_point": "36-04"`
- `.planning/.../32-BASELINE-writes.container.36-04.json` — presente, `"phase_point": "36-04"`
- `scripts/rls-baseline.mjs`, `scripts/container/seed.mjs` — `node --check` verde su entrambi
- `8f3005d`, `108003b`, `15a5997` — tutti e tre presenti in `git log`
- Nessun file tracciato cancellato dai tre commit (`git diff --diff-filter=D` vuoto)

---
*Phase: 36-formats-series-numbering*
*Misurato in un container `postgres:17.6` distrutto subito dopo: 2026-08-10. Produzione: non toccata — il piano 36-05.*
