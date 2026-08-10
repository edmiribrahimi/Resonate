---
phase: 36-formats-series-numbering
plan: 05
subsystem: database
tags: [migration, applied, production, rls, pg_policies, baseline, management-api, evidence]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: "supabase/migrations/20260810120000_formats_and_series.sql (36-03) — il file che questo piano invia"
  - phase: 36-formats-series-numbering
    provides: "il punto `pre-36` in produzione (36-01) — il prima contro cui si legge questo dopo"
  - phase: 36-formats-series-numbering
    provides: "`PROBE_REFERENCE_TABLES` che nomina formats e party_series (36-04) — senza l'apply, `baseline:rls` in produzione sarebbe fallito 42P01"
  - phase: 36-formats-series-numbering
    provides: "l'assegnazione CONFIRMED delle tre serate (36-02)"
provides:
  - "Lo schema di format e serie APPLICATO in produzione, registrato come versione `20260810144239`"
  - "I quattro predicati come `pg_policies` li rende, letti dal database e non dal file"
  - "La prima osservazione di `party_series_select_published` che CONCEDE — con la prova a livello di identita' di riga, non di conteggio"
  - "Il punto `post-36` in produzione: tre artefatti, ogni cella mossa con la sua frase"
affects: [36-06, 36-07, 36-08, 36-09, 36-10, 36-11, 36-12, 36-13, 36-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "La versione che l'endpoint migrations assegna e' l'ORA DELL'APPLICAZIONE, non il timestamp del nome del file: cercare `20260810120000` nella history e non trovarlo non e' drift"
    - "Un `pk_md5` della matrice di lettura si confronta con l'md5 calcolato sul sottoinsieme atteso: cosi' una cella smette di dire QUANTE righe e comincia a dire QUALI"

key-files:
  created:
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.post-36.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.post-36.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-advisors.post-36.json
    - .planning/phases/36-formats-series-numbering/36-05-SUMMARY.md
  modified: []

key-decisions:
  - "`--expect-initplan=unchanged`: questa fase non aggiunge una sola chiamata non-avvolta a una funzione auth, e il comparatore pretende che l'attesa sia dichiarata invece che indovinata"
  - "`--only=B1,B2,B5`: in produzione non esiste un artefatto B3 `pre-36`, per la decisione di 36-01 (le scritture restano dietro `--i-know-this-writes`)"
  - "Nessun `FMT-*` spuntato in REQUIREMENTS.md — D-36-19"
  - "I diciotto scarti della migration history NON sono stati riparati: e' una chiamata del proprietario, e il `PUT` che li riparerebbe applica-senza-applicare"

patterns-established:
  - "Prima di committare un artefatto di baseline in un repo pubblico, il grep di segretezza si esegue e il suo esito si scrive: zero host, zero token, zero uuid, zero nomi di sede"

requirements-completed: []  # deliberatamente vuoto — D-36-19

# Metrics
duration: 15min
completed: 2026-08-10
---

# Phase 36 Plan 05: La migration applicata, e la cosa che rileggere il file non poteva dire — Summary

**La migration e' in produzione come versione `20260810144239`, e per la prima volta da quando esiste `party_series_select_published` quel cancello e' stato visto CONCEDERE: con la chiave anonima la produzione restituisce UNA serie su sei — e le cinque che restano invisibili sono quelle che non hanno ancora una serata pubblicata, quattro delle quali portano un nome di locale nel proprio nome.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3 di 3 (Task 1 chiuso dal proprietario: *«Si', applica»*, 2026-08-10)
- **Commits:** 1 di task + 1 di documentazione
- **Righe inviate in produzione:** 53 571 byte, 1044 righe, **una transazione**

---

## Task 1 — il checkpoint

Il proprietario ha letto l'SQL ed e' stato mostrato l'impatto: la risposta e' **«Si', applica»**, datata 2026-08-10. Quell'autorizzazione copre l'applicazione di *questa* migration e la rilettura di cio' che ha fatto. Non copre altro, e nient'altro e' stato fatto: nessuna correzione di dati, nessuna seconda modifica di schema, nessun «gia' che ci siamo».

## Task 2 — l'applicazione

**Endpoint:** `POST /v1/projects/{ref}/database/migrations`. **Non** `/database/query`. Il ref e' derivato da `NEXT_PUBLIC_SUPABASE_URL` e il token letto da `.env.local` dentro il processo: nessuno dei due e' mai stato stampato, e nessuno dei due entra in questo file o in un messaggio di commit (T-36-05-05).

| | |
|---|---|
| **Risposta** | `HTTP 200 OK`, corpo `[]` |
| **Versione assegnata** | **`20260810144239`**, nome `formats_and_series` |
| **History** | 36 voci → **37** |
| **File di migration su disco** | 55 |

### La versione non e' il timestamp del nome del file, e va detto

La history registra **`20260810144239`** — l'ora dell'applicazione — mentre il file si chiama `20260810120000_formats_and_series.sql`. Non e' un errore ed e' lo stesso comportamento della fase 31, dove `door_scan_events` fu registrato `20260806111113`. **Chi cerchera' `20260810120000` nella history non lo trovera' e non deve concluderne uno scarto.**

### Lo scarto della history: diciotto prima, diciotto dopo

55 file su disco contro 37 voci in history: **18 migration applicate ma non registrate**. La cifra e' **identica** a prima di questa chiamata (54 contro 36). Lo scarto **precede questa fase**, ripararlo e' una decisione del proprietario, e il `PUT` sullo stesso endpoint fa upsert **senza applicare** — cioe' e' lo strumento giusto e resta inutilizzato finche' qualcuno non lo chiede. **Questa fase non ha aggiunto la diciannovesima** (T-36-05-04 chiuso).

### La guardia della sezione 8 non e' osservabile da qui

La migration stampa due `NOTICE` (o solleva con un conteggio). L'endpoint restituisce `[]` e **non riporta i notice**: il fatto che la guardia sia passata si deduce dal `COMMIT`, non si legge. Il fatto che la guardia *intendeva* proteggere e' stato quindi misurato direttamente al Task 3 — `nights_null_format = 0`, `nights_on_fallback_format = 0` — che e' l'informazione, non il suo annuncio.

### Verifica del Task 2, verbatim

```json
[{"formats":true,"series":true,"cols":3}]
applied
```

---

## Task 3 — la misura

### 3a · I quattro predicati, come Postgres li rende

Letti da `pg_policies`, non dal file. **Quattro policy, tutte `SELECT`, tutte `PERMISSIVE`, `with_check` nullo su tutte e quattro. Nessuna `INSERT`, nessuna `UPDATE`, nessuna `DELETE` su nessuna delle due tabelle.**

| Tabella | Policy | `qual` reso |
|---|---|---|
| `formats` | `formats_select_listed` | `(listed = true)` |
| `formats` | `formats_select_catalogue_manage` | `( SELECT private.has_capability('catalogue.manage'::text) AS has_capability)` |
| `party_series` | `party_series_select_catalogue_manage` | `( SELECT private.has_capability('catalogue.manage'::text) AS has_capability)` |
| `party_series` | **`party_series_select_published`** | vedi sotto |

```
(EXISTS ( SELECT 1
   FROM (event_parties ep
     JOIN events e ON ((e.id = ep.event_id)))
  WHERE ((ep.series_id = party_series.id) AND (e.is_published = true))))
```

**`party_series.id`, non `ep.series_id`.** T-36-05-01 chiuso su una lettura, non su un ragionamento: la forma non qualificata sarebbe stata `USING (true)` travestita e avrebbe pubblicato l'intero catalogo di serie a chiunque abbia la chiave anonima. T-36-05-02 chiuso allo stesso modo: `formats_select_listed` rende `(listed = true)` e non `true`.

### 3b · Il cancello visto CONCEDERE — la frase che ne' 36-03 ne' 36-04 potevano dire

`36-04-SUMMARY.md` lo lascia scritto come debito: *«l'arm `party_series_select_published` non e' mai stato esercitato come concessione»*, perche' il container non pubblica alcun evento. La produzione ne ha due, entrambi pubblicati. **Questa e' la prima cattura in cui quel cancello risponde di si'.**

Dalla matrice di lettura `post-36`, celle misurate con la chiave anonima reale e la RLS in vigore:

| Persona | `formats` | `party_series` |
|---|---|---|
| `anon` | **4** su 5 | **1** su 6 |
| `authenticated/no-profile` | 4 | 1 |
| `member/approved` | 4 | 1 |
| `master/approved` | **5** | **6** |

`vacuous: false` su tutte e otto: entrambe le tabelle hanno righe, quindi ogni numero qui e' un rifiuto o una concessione misurata, mai un'assenza di dati.

**E non e' solo un conteggio.** Il `pk_md5` di ogni cella e' stato confrontato con l'md5 calcolato sul sottoinsieme atteso, quindi la cella dice **quali** righe e non quante:

| Cella | `pk_md5` | md5 del sottoinsieme atteso | Coincide |
|---|---|---|---|
| `anon × party_series` | `22c8329cf5b9925b2ad7328748303df8` | le serie che passano il cancello della pubblicazione | **si'** |
| `anon × formats` | `61b85c98bc9cb3cdfc1ffa226e46fecf` | i format `listed = true` | **si'** |
| `master/approved × party_series` | `a4fd7c6ed1e1fae1c0a69a5731cec850` | tutte e sei | **si'** |
| `master/approved × formats` | `095823475c25b6b5cbf1928fe19cee09` | tutti e cinque | **si'** |

**Quale serie e' visibile e quali no:**

- **Visibile a `anon`: `RSNT`** — l'unica che ha una serata dentro un evento pubblicato.
- **Invisibili: `BZ`, `MR`, `PRLN`, `SNST`, `UNCL`.** Quattro di queste cinque nominano un locale o un luogo nel proprio nome pubblico, e nessuna ha ancora una serata annunciata. E' esattamente la sostanza di FMT-06: **una serie preparata prima della sua prima serata non pubblica il posto che ha nel nome.** Misurato in produzione, non argomentato.

**Quindi i due arm sono ora coperti entrambi, e nella stessa cattura:** `party_series_select_published` concede 1 riga ad `anon` (arm mai visto prima), `catalogue.manage` concede 6 righe a `master/approved` (l'arm che 36-04 aveva gia' visto concedere). La corsa stubbata di 36-03 aveva coperto l'opposto. **Nessuna delle tre corse copre entrambi da sola; insieme lo fanno, e questa e' la prima in cui il cancello si e' visto aprire.**

`formats_select_listed` discrimina **4 contro 5**: `unclassified` — ritirato alla nascita, `listed = false` — e' invisibile a chiunque non abbia `catalogue.manage`. La colonna `listed` non e' decorativa.

**Cosa questa misura NON e'.** Il ruolo `master/approved` e' risolto da uno dei quattro profili che la produzione tiene; le altre dieci persona non esistono li' e le loro celle tornano `vacuous: true`. Nessuno strumento di questo repository puo' autenticarsi come un `organizer` o come uno `staff`: e' il debito delle 32 voci `human_needed`, che questa fase non consuma e non peggiora.

### 3c · L'archivio

| Serata (uuid) | Format | Serie | Numero |
|---|---|---|---|
| `fd975999-95df-4402-bc82-03a95424831b` | `RSNT` (`resonate`) | `RSNT` | **NULL** |
| `11e43718-2e37-42b1-91b7-cc2d0754474e` | `RSNT` (`resonate`) | `RSNT` | **1** |
| `3db716af-8ce3-446e-a327-62b110bfe7ce` | `RSNT` (`resonate`) | `RSNT` | **2** |

Identico riga per riga al blocco `CONFIRMED` di `36-02-SUMMARY.md`. Le serate in produzione sono **tre in tutto**: nessuna quarta e' comparsa fra la lettura di 36-02 e questa.

**La cifra che il piano pretende sia scritta: le serate sul format di ripiego in produzione sono `0`.** Cosi' come `nights_null_format = 0` e `nights_null_series = 0`. Il ripiego `unclassified` esiste, e' ritirato alla nascita, e **non ha rivendicato in silenzio una serata vera**.

`number` e' `NULLABLE` per decisione: la prima delle tre serate e' il primo atto della seconda e non ha sigla propria. Misurato:

| Colonna | `is_nullable` | `column_default` |
|---|---|---|
| `format_id` | `NO` | *nessuno* |
| `series_id` | `NO` | *nessuno* |
| `number` | **`YES`** | *nessuno* |

**La filigrana e' salita da sola.** `party_series.highest_assigned` per `RSNT` legge **2**: il trigger `event_parties_bump_series_watermark` ha girato durante il backfill, che e' l'ordine che la sezione 6 della migration dichiara. Tutte le altre cinque serie stanno a `0`.

**Il catalogo, come seminato:** quattro format `listed = true` (`resonate`, `sunset`, `ramadub`, `motionlab`) piu' `unclassified` non elencato e ritirato; sei serie (`RSNT`, `PRLN`, `BZ`, `MR`, `SNST`, `UNCL`). **Nessuna serie MotionLab**, e l'assenza e' il punto (D-36-07). RLS abilitata su entrambe le tabelle nuove. I quattro vincoli nominati esistono: `event_parties_format_series_number_unique`, `event_parties_series_format_fk`, `event_parties_number_positive`, `party_series_id_format_unique`.

---

## `baseline:compare pre-36 → post-36`: una frase per ogni cella mossa

Comando: `--target=production --before-point=pre-36 --after-point=post-36 --expect-initplan=unchanged --only=B1,B2,B5`.

**`--expect-initplan=unchanged`** perche' questa fase non aggiunge una sola chiamata non-avvolta a una funzione auth: le due policy di capability usano la forma `(SELECT private.has_capability(...))`, le altre due non chiamano alcuna funzione. Il comparatore rifiuta di girare senza che l'attesa sia dichiarata, e ha ragione. **`--only=B1,B2,B5`** perche' in produzione non esiste un B3 `pre-36`: 36-01 decise di non catturarlo, e il comparatore muore `FATAL` invece di fingere.

### B1 — l'insieme delle policy

| Difetto | Perche' |
|---|---|
| `policy_added` × **4** — `formats_select_listed`, `formats_select_catalogue_manage`, `party_series_select_published`, `party_series_select_catalogue_manage` | Sono le quattro della sezione 4 della migration. Il comparatore avverte che una policy aggiunta **allarga**, perche' le `PERMISSIVE` sono in OR. Qui allarga su due tabelle che **prima non esistevano**: non c'e' nulla che fosse chiuso e sia stato aperto |
| `supporting_count_changed` — `policy_count` **72 → 76** | Le stesse quattro, contate una seconda volta come somma |
| `supporting_count_changed` — `rls_enabled_tables` **23 → 25** | Le due tabelle nuove hanno `ENABLE ROW LEVEL SECURITY` nella stessa migration che le crea (`supabase-data.md`, gate *tabella nuova = policy nuova*). Misurato a posteriori: `relrowsecurity = true` su entrambe |

**E la riga che conta di piu':** `72 unchanged · 0 by T1 · 0 by T2 · 0 by both · **0 unexplained**`. **Nessuna policy preesistente si e' mossa di un bit.**

### Invariante 2 — il cancello pubblico non e' stato toccato

`event_parties_select_published`, l'intera riga dell'artefatto, confrontata fra le due catture:

```
(EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_parties.event_id) AND (e.is_published = true))))
```

| | |
|---|---|
| md5 della riga `pre-36` | `43e7f547dad32f060f433ca7014e7427` |
| md5 della riga `post-36` | `43e7f547dad32f060f433ca7014e7427` |
| **Byte-identica** | **si'** |

T-36-05-03 chiuso su un confronto eseguito.

### B2 — la matrice di lettura

- **322 celle condivise, `0` mosse.** Verificato due volte: dal comparatore (che non emette alcun `b2_cell_changed`) e da un confronto diretto dei due artefatti riga per riga.
- **28 `b2_cell_added`** — 14 persona × 2 tabelle nuove. Sono le due celle che `36-VALIDATION.md` chiedeva: senza, le policy delle due tabelle non sarebbero misurate da niente.
- La frazione vacua sulle celle condivise resta **274/322 (85,1 %)** — invariata, ed e' la solita verita' della produzione: tiene quattro profili e nessun `organizer`, nessuno `staff`, nessuna riga non approvata. Sulle 28 celle nuove le vacue sono 20 (le dieci persona che non esistono li'), quindi la cattura chiude a 294/350.

### B5 — l'advisor, l'oracolo che non ha letto il piano

| Verdetto | Cifra | Perche' — misurato sulle *entita'*, non dedotto dal conteggio |
|---|---|---|
| ✓ `auth_rls_initplan` | **0 → 0** | Nessuna chiamata auth non avvolta e' entrata: le due policy di capability usano `(SELECT …)` |
| ✗ `multiple_permissive_policies` | 58 → **70** (+12) | Le dodici entita' aggiunte sono esattamente `formats` e `party_series` × i **sei** ruoli che l'advisor enumera (`anon`, `authenticated`, `authenticator`, `cli_login_postgres`, `dashboard_user`, `supabase_privileged_role`) × `SELECT`. **Due policy `SELECT` per tabella sono il disegno**: un cancello e la scorciatoia di chi gestisce il catalogo. La stessa forma che `events` ed `event_parties` gia' portano |
| ✗ `unindexed_foreign_keys` | 41 → **44** (+3) | Le tre entita' aggiunte: `event_parties_series_format_fk` (composta — la sezione 10 la lascia **deliberatamente** senza indice proprio, perche' `series_id` e' gia' coperto), `formats_created_by_fkey` e `party_series_created_by_fkey` (le due colonne di autore, che nessuna query cerca per valore). Nessuna delle tre e' una colonna di ricerca alla porta: il gate *indici sulle colonne di lookup* non e' violato |
| ✗ `anon_security_definer_function_executable` | 16 → **17** (+1) | Una sola entita': `public.bump_series_watermark`. E' `SECURITY DEFINER` con `search_path=""`, e il suo tipo di ritorno e' `trigger`. **Misurato, non argomentato:** invocarla direttamente risponde `ERROR: 0A000: trigger functions can only be called as triggers`. Il `GRANT EXECUTE` di default a `anon` esiste; la funzione resta non chiamabile |
| ✗ `authenticated_security_definer_function_executable` | 18 → **19** (+1) | La stessa unica entita', lo stesso rifiuto |
| — `unused_index` (non ancorato) | 17 → **19** (+2) | `idx_event_parties_series` e `idx_party_series_format`, mai scanditi perche' appena creati. Il lint deriva da `idx_scan` e si muove con l'**uso** del database, non con lo schema (`baseline/README.md`, finding F3) |
| ✓ `hook_custom_access_token_enabled` | ancora `false` | CAP-04 legge dal vivo, non dal token |
| ✓ `db_schema` | ancora `public,graphql_public` | Lo schema `private` resta irraggiungibile (D-06) |

**Nessun avviso e' scomparso, in nessuna delle cinque famiglie.** Ogni movimento e' un'aggiunta, e ogni aggiunta ha sopra il proprio nome di entita'.

### `verify:capabilities`

**5/5 verde, 0 warning**, esattamente come prima: 12 chiavi in TS e 12 in `private.capabilities`, 26 concessioni e 22 rifiuti su 4 ruoli × 12 chiavi. Il catalogo delle capability non cambia in questa fase, quindi il verde e' la conferma che l'applicazione non ha spostato nulla di laterale.

### Un dato che il piano prevedeva e che va dichiarato riuscito

`36-04-SUMMARY.md` avverte: *«`PROBE_REFERENCE_TABLES` ora nomina `formats` e `party_series`, quindi `npm run baseline:rls` contro la produzione **fallirebbe `42P01`** finche' 36-05 non applica la migration»*. **Non e' fallito.** La cattura `post-36` e' passata 3/3 al primo tentativo, che e' la conferma indipendente — dall'altro capo dello strumento — che le due tabelle esistono davvero in produzione.

---

## Deviations from Plan

### Deviazioni di esecuzione

Nessuna delle regole 1–4 e' scattata. La migration e' stata inviata **byte per byte** come sta su disco: 53 571 byte, nessuna parafrasi, nessuna modifica prima dell'invio. Nessun pacchetto installato (T-36-05-SC resta `accept` a costo zero).

### Departures dal testo del piano, deliberate e dichiarate

1. **Il comando di verifica del Task 3 e' stato eseguito in tre pezzi, non come una catena `&&`.** Per la stessa ragione registrata da 36-04, piu' due che il piano non prevedeva:
   - `baseline:compare` **esige `--expect-initplan`** e muore `FATAL` senza: *«guessing it would turn the oracle into a rubber stamp»*. Il piano non lo passa.
   - `baseline:compare` **muore `FATAL` su B3** in produzione, perche' un `32-BASELINE-writes.pre-36.json` non esiste e non deve esistere (36-01). Serve `--only=B1,B2,B5`.
   - E poi esce **1**, con 39 righe `✗` — 6 in B1, 29 in B2, 4 in B5 — perche' un'aggiunta e' un difetto per un comparatore che non sa distinguere una tabella nuova da una policy allargata. Il `&&` del piano avrebbe mascherato l'esito di `verify:capabilities` e della cattura dietro l'esito del confronto. I tre esiti sono riportati separati, e ognuna di quelle 39 righe ha la sua frase qui sopra.
2. **Nessun commit per il Task 2.** Il file che il Task 2 invia era gia' committato da 36-03 (`2a0fcb9`) e l'applicazione non modifica alcun file tracciato: un commit li' sarebbe stato vuoto. Il Task 3 porta i tre artefatti (`4948cf8`).
3. **[Rule 1 — Bug] Una riga di `STATE.md` corretta fuori dal perimetro del piano.** *Current Position* diceva **«Phase 36 — PLANNED, not yet executed»**. Era gia' impreciso ai piani 03 e 04, che l'hanno lasciato stare; da oggi e' **falso contro un database**, perche' lo schema di questa fase e' in produzione. Un file di stato che dichiara non-eseguita una fase che ha applicato una migration e' esattamente il verde-che-significa-il-contrario di cui questa fase si preoccupa da 36-01. Corretto, e la correzione dice cosa diceva prima invece di cancellarlo. `REQUIREMENTS.md` **non** e' stato toccato: e' D-36-19 e resta chiuso.

### Non fatto, apposta

- **Nessun `FMT-*` spuntato in `REQUIREMENTS.md`** — D-36-19. Questo piano applica lo schema; le spunte le mette la verifica di fase, una volta, con l'evidenza accanto. `FMT-03` ora **ha** un cancello automatico che spara (le due sonde di vincolo di 36-04) e `FMT-06` ha per la prima volta una misura in produzione — ma la contabilita' resta dove D-36-19 l'ha messa.
- **I diciotto scarti della migration history non sono stati riparati.** `PUT` sullo stesso endpoint fa upsert senza applicare, ed e' lo strumento giusto: la decisione e' del proprietario, non di questo piano.
- **Il difetto D-36-18 sul venue non e' stato toccato.** Non e' di questa fase (assegnato alla 37), non e' stato usato per spiegare nulla di cio' che si legge qui, e nessuna policy di `venues` e' stata sfiorata.
- **`npm run build` non e' stato eseguito** e non proverebbe nulla: nessun TypeScript e' cambiato in questo piano, e `src/types/database.ts` e' del piano 36-06.
- **`36-VALIDATION.md` non e' stato toccato.**

## Issues Encountered

Nessun errore in esecuzione. Due comandi hanno richiesto un flag che il piano non prevedeva (`--expect-initplan`, `--only`), ed entrambi i rifiuti sono comportamenti corretti dello strumento: un oracolo che indovina l'attesa e' un timbro, e un comparatore che finge di aver confrontato un artefatto inesistente e' peggio di uno che muore.

## Threat Flags

Nessuna superficie di sicurezza nuova oltre a quelle gia' nel registro del piano. Due note, entrambe misurate:

- **`bump_series_watermark` e' `SECURITY DEFINER` ed eseguibile da `anon` per grant di default** — ed e' inerte: tipo di ritorno `trigger`, invocazione diretta rifiutata `0A000`, `search_path=""`. E' la ragione per cui i due avvisi B5 di sicurezza sono strutturali e non sfruttabili.
- **Controllo di segretezza prima del commit**, sui tre artefatti nuovi (il repository e' **pubblico**, `.planning/` e' tracciato, ogni file qui e' una pubblicazione): `grep -oiE "https?://|sbp_|eyJ…"` → **0**; `grep -oiE "booze|muro|perlone|sunset|ramadub|motionlab|re:sonate|resonate"` → **0 occorrenze**; uuid → **0** in tutti e tre. B2 memorizza un md5 di chiavi primarie ordinate, mai il contenuto di una riga. Nessun nome di sede, nessun titolo di serata, nessuna data non annunciata.

## Cosa questo piano NON prova

1. **Non prova che il cancello rifiuti una persona reale con una sessione autenticata.** `anon` e' un ruolo che la chiave anonima raggiunge davvero e le sue tre celle sono misure vere; `organizer` e `staff` non esistono in produzione e restano il debito delle 32 voci `human_needed`.
2. **Non prova che le policy siano *giuste*.** Dice cosa si e' mosso e cosa no. La correttezza e' un giudizio umano su quel confronto, e questo repository **non ha un test runner per il prodotto**.
3. **Non ha esercitato in produzione le due sonde di vincolo di FMT-03.** Quelle girano in container dentro `begin; … rollback;` (36-04, 3/3). Qui non e' stata tentata **nessuna** scrittura: ogni chiamata di lettura portava `{"read_only": true}`, e l'unica scrittura di tutto il piano e' la migration stessa.
4. **Non dice che una superficie mostri un'etichetta.** Nessun codice legge ancora `format_id`: i tipi sono del piano 36-06, le superfici dei piani dopo.

## Self-Check: PASSED

- `.planning/…/32-BASELINE-policies.post-36.json` — presente, `"phase_point": "post-36"`, contiene `party_series`
- `.planning/…/32-BASELINE-reads.post-36.json` — presente, `"phase_point": "post-36"`
- `.planning/…/32-BASELINE-advisors.post-36.json` — presente, `"phase_point": "post-36"`
- `.planning/phases/36-formats-series-numbering/36-05-SUMMARY.md` — presente
- `4948cf8` — presente in `git log`
- Nessun file tracciato cancellato dal commit (`git diff --diff-filter=D` vuoto)
- Versione `20260810144239` presente nella migration history letta dall'endpoint

---
*Phase: 36-formats-series-numbering*
*Applicata in produzione: 2026-08-10T14:42:39Z. Misurata subito dopo, in sola lettura.*
