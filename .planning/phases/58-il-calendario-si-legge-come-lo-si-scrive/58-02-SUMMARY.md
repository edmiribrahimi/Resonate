---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
plan: 02
subsystem: database
tags: [production-calendar, ics, management-api, procedures, measurement, postgres]

# Dependency graph
requires:
  - phase: 44-the-production-calendar-comes-inside
    provides: la forma di 44-PROCEDURES.md (frontmatter-contratto, passi numerati con il ruolo, Result pendente) e le tre tabelle specchiate
  - phase: 32-capability-model-in-the-database
    provides: scripts/rls-baseline.mjs — loadEnvironment, createManagementApiTarget, registerSecret/redact, read_only come garanzia dura
provides:
  - "58-PROCEDURES.md — P-58-C (il ripristino), P-58-A (la spunta sopravvive), P-58-B (il legame sopravvive); 24 passi, ogni Result pendente"
  - "M1 — la rimisura di A5: 0 spunte, 0 legami, riconfermati sul catalogo vivo"
  - "M2 — la finestra dell'aggancio di ICS-05, misurata: 3 coppie con dato, 11 senza, e la dichiarazione di quale forma il piano 58-03 deve adottare"
  - "M3 — la mappa alias: un solo esemplare, contato e mai letto"
  - "M4 — i dodici nomi di vincolo CHECK letti da pg_constraint, per i piani 58-06 e 58-07"
  - "M5 — la causa di ICS-07, attribuita per misura invece che per deduzione: la riga :1117"
affects: [58-03, 58-05, 58-06, 58-07, 58-09, 58-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Le misure d'apertura si prendono PRIMA che la fase distrugga la sorgente su cui sono misurabili"
    - "Una cella vuota in una tabella di finestre e' un dato: significa rifiuto, non un valore da inventare"
    - "Il piano di rientro si scrive prima del primo --apply, non dopo il primo incidente"

key-files:
  created:
    - .planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/58-PROCEDURES.md
  modified: []

key-decisions:
  - "Il piano 58-03 adotta il massimo PER COPPIA (serie, tipo), mai il massimo assoluto: un massimo globale di 4 giorni rifiuterebbe ogni ancora next_edition e autorizzerebbe a 4 giorni coppie che nessuno ha misurato"
  - "Le 11 coppie senza righe non hanno una finestra: per esse la risposta corretta resta il rifiuto, incluso RSNT/listing, che e' il caso per cui ICS-05 esiste"
  - "La finestra e' un TETTO, non il criterio: il criterio resta conformsToRule, perche' la pipeline si esprime in giorni della settimana e lo stesso martedi' dista -4 da un sabato e -3 da un venerdi'"
  - "La causa di ICS-07 e' la riga :1117 (il blocco delle assenze che stampa record.id grezzo), non :1209 e non :1103 — attribuita per misura"
  - "P-58-C sta in testa a 58-PROCEDURES.md e dichiara di essere il rimando che il piano 58-09 mettera' al posto delle due righe di consiglio di failPartway"

patterns-established:
  - "Pattern 1: ogni lettura del catalogo passa da createManagementApiTarget con read_only: true e da registerSecret su token, project ref, URL e host"
  - "Pattern 2: nel SUMMARY entrano conteggi, distanze in giorni e nomi di vincolo — mai un alias, mai un source_uid, mai un ticked_by_name, mai una data di serata"
  - "Pattern 3: 24 passi, 24 righe Result: pending — la numerazione corre continua attraverso le tre procedure, quindi «passo 11» e' univoco nel file"

requirements-completed: [ICS-01, ICS-03, ICS-03b, ICS-05, ICS-07]

# Metrics
duration: 22min
completed: 2026-08-20
---

# Fase 58 Piano 02: Le misure d'apertura e le tre procedure — Summary

**Le cinque misure sono prese sul catalogo vivo prima che lo specchio le cancelli, e `58-PROCEDURES.md` mette il piano di rientro in testa al file: la finestra dell'aggancio di `ICS-05` esiste come dato con undici celle dichiarate vuote, i dodici nomi di vincolo sono letti da `pg_constraint`, e la causa di `ICS-07` non e' piu' una delle tre ipotesi.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-20T14:38:00Z
- **Completed:** 2026-08-20T15:00:13Z
- **Tasks:** 2
- **Files modified:** 1 creato, 0 modificati

## Accomplishments

- **Le cinque misure sono prese**, tutte con `read_only: true`, tutte prima che qualunque piano di questa fase lanci un `--apply`. Nessuna scrittura in produzione.
- **`58-PROCEDURES.md` esiste**, con `P-58-C` in testa, 24 passi numerati continui e 24 righe `Result: pending`.
- **La finestra dell'aggancio e' un dato con delle celle vuote dichiarate**, non un numero scelto — e le celle vuote coprono, fra le altre, la coppia per cui `ICS-05` esiste.
- **La causa di `ICS-07` e' attribuita per misura**: una sola riga in tutto lo specchio porta un identificativo che l'audit legge come un anno, ed e' raggiungibile da una sola delle tre righe candidate.

---

# Le misure d'apertura

> **Lettura del 2026-08-20, ore 14:52 UTC**, dal catalogo di produzione via
> Management API, ogni query con `read_only: true` — che rifiuta un `INSERT`
> con `25006`, quindi e' una garanzia dura e non una convenzione. Ogni riga
> stampata e' passata da `redact()` con `registerSecret` gia' impostato su
> token, project reference, URL e host.
>
> **Qui sotto ci sono conteggi, distanze in giorni e nomi di vincolo.** Non c'e'
> nessun valore di `ics_alias`, nessun `ticked_by_name`, nessun `source_uid`,
> nessuna data di serata e nessun nome di sede.

## M1 — la rimisura di A5

| | letto il 2026-08-20T14:52:43Z |
|---|---|
| voci di checklist **spuntate** | **0** (su 14 voci in tutto) |
| righe di piano **legate a una serata** | **0** (su 2 piani in tutto) |

**A5 e' confermata, e non serve scriverla a caratteri grandi.** Il riaggancio di
`ICS-03` resta una **precauzione**, non un percorso critico con dati veri al
primo giro. `P-58-A` e `P-58-B` conservano il peso che il piano gli assegnava —
ma con una conseguenza che vale la pena dire: **poiche' non c'e' nessuna spunta e
nessun legame da osservare, entrambe le procedure devono CREARE lo stato per
metterlo alla prova.** E' la ragione per cui scrivono in produzione, ed e' la
ragione per cui portano ognuna la propria autorizzazione.

Inventario di controllo, letto nella stessa sessione: piani **2**, pezzi **46**,
impegni **79**, voci di checklist **14**, corse di import **5**, regole di
pipeline **14**. Coincide con le misure del `58-CONTEXT.md` su tutte le voci; le
corse di import erano dichiarate «≥4» e sono **5**.

## M2 — la finestra massima dell'aggancio (`ICS-05`, domanda aperta 1)

### ⚠ Il campione e' molto piu' piccolo di quanto il piano si aspettasse

Il piano parlava dei *«46 pezzi gia' agganciati in produzione»* come campione di
verita'. **Non lo sono.** Misurato:

| | |
|---|---|
| pezzi in tutto | 46 |
| pezzi con `plan_id` non nullo | **8** |
| pezzi con `date` non nulla | 44 |
| pezzi **misurabili** (`plan_id` **e** `date`) | **6** |

Il campione di verita' e' di **sei righe**, non di quarantasei. Va detto prima
della tabella, perche' una tabella costruita su sei righe e presentata come se ne
avesse quarantasei e' la stessa cosa che questa fase esiste per riparare.

### La tabella, coppia per coppia

Distanza in giorni fra la data del pezzo e la data del piano a cui e' agganciato.
Il segno conta: negativo = il pezzo **precede** la serata.

| Serie | Tipo | Righe | Distanza min | Distanza max | Finestra misurata (valore assoluto) |
|---|---|---|---|---|---|
| `RSNT-PRLN` | `listing` | 2 | −4 | −4 | **4 giorni** |
| `RSNT-PRLN` | `livecut` | 2 | +4 | +4 | **4 giorni** |
| `RSNT-PRLN` | `timetable` | 2 | 0 | 0 | **0 giorni** |
| `RSNT-PRLN` | `recap` | **0** | — | — | **non misurata → rifiuto** |
| `RSNT-PRLN` | `tonight` | **0** | — | — | **non misurata → rifiuto** |
| `RSNT` | `listing` | **0** | — | — | **non misurata → rifiuto** |
| `RSNT` | `livecut` | **0** | — | — | **non misurata → rifiuto** |
| `RSNT` | `after_movie` | **0** | — | — | **non misurata → rifiuto** |
| `RSNT` | `timetable` | **0** | — | — | **non misurata → rifiuto** |
| `RMDB` | `listing` | **0** | — | — | **non misurata → rifiuto** |
| `RMDB` | `tonight` | **0** | — | — | **non misurata → rifiuto** |
| `RMDB` | `recap` | **0** | — | — | **non misurata → rifiuto** |
| `RMDB` | `livecut` | **0** | — | — | **non misurata → rifiuto** |
| `MTNLB` | `listing` | **0** | — | — | **non misurata → rifiuto** |
| `MTNLB` | `tonight` | **0** | — | — | **non misurata → rifiuto** |
| `MTNLB` | `recap` | **0** | — | — | **non misurata → rifiuto** |
| `MTNLB` | `livecut` | **0** | — | — | **non misurata → rifiuto** |

**Massimo assoluto: 4 giorni**, su 6 righe.

Le tre coppie con un dato sono governate da tre regole di pipeline
(`PRLN/listing`, `PRLN/livecut`, e — per il `timetable` — `RSNT/timetable` al
livello del formato, perche' la serie non ne ha una propria). **Undici delle
quattordici regole vive non hanno una sola riga misurata.**

### ⚠ Il caso per cui `ICS-05` esiste ha zero righe

`RSNT / listing` — le nove voci `Listing - re:sonate` che sono il contenuto
intellettuale di `ICS-05`, e l'unica regola del catalogo con `derivable = false`
— **non ha nessuna riga misurabile.** La finestra per quella coppia **non esiste
come dato**, e per essa la risposta corretta resta il rifiuto finche' un import
non produce righe su cui misurarla.

Non e' una battuta d'arresto: e' esattamente il comportamento che
`58-CONTEXT.md` prescrive — *«finche' non e' misurato, il rifiuto e' la risposta
corretta»* — e la ricerca aveva gia' segnalato il rischio nella riga A3, che si
appoggiava alla tabella dei format e **non** a una misura sul calendario.

### Quale forma il piano 58-03 deve adottare

**Il massimo PER COPPIA `(serie, tipo)`, mai il massimo assoluto.** Due ragioni,
entrambe misurate:

1. **Un massimo globale di 4 giorni rifiuterebbe ogni ancora `next_edition`.**
   `RSNT/livecut` ancora sulla serata **successiva** e `RSNT/after_movie` sul
   listing dell'edizione seguente: sono scale da uno a tre mesi, non da quattro
   giorni. Un unico valore globale le taglierebbe tutte.
2. **Un massimo globale autorizzerebbe a 4 giorni undici coppie che nessuno ha
   misurato**, compresa `RSNT/listing`. Una finestra ereditata da un'altra coppia
   e' esattamente la finestra inventata che il piano vieta.

**E la finestra e' un TETTO, non il criterio.** Il criterio resta
`conformsToRule`. La misura lo dimostra: il listing `RSNT-PRLN` sta a **−4**
perche' la notte di quella serie cade di sabato e il listing esce di martedi'.
La pipeline di questo progetto si esprime **in giorni della settimana, non in
offset** — lo stesso martedi' dista −4 da un sabato e −3 da un venerdi', ed e' un
precedente gia' registrato in `production-calendar.md`, dove un controllo
automatico aveva segnalato come fuori regola una notte perfettamente in riga.
Una finestra usata come criterio ricreerebbe quel falso allarme; usata come
tetto lo evita.

## M3 — la mappa alias, contata e non letta

| | |
|---|---|
| serie con `ics_alias` non nullo | **1** |
| serie in tutto | 5 |

**Un solo esemplare.** Nessun valore e' stato letto e nessuno e' riportato qui.
Il numero e' il promemoria di cio' che il `58-RESEARCH.md` segnala nel
*Runtime State Inventory*: quella riga vive **solo nel database** — non e' in
git, non e' in un seed, non e' in una fixture, e nessun file la ricostruisce. Se
sparisse, l'import tornerebbe a zero notti classificate, e sarebbe una sola riga
a farlo.

## M4 — i nomi dei vincoli, **letti da `pg_constraint`**

Interrogato `pg_constraint` con `contype = 'c'` sulle due tabelle. **Dodici nomi,
letti, non dedotti.**

`production_piece`:

- `production_piece_date_xor_reason`
- `production_piece_kind_check`
- `production_piece_naming_check`
- `production_piece_origin_check`
- `production_piece_proposal_has_no_source`
- `production_piece_unresolved_check`

`production_pipeline_rule`:

- `production_pipeline_rule_anchor_kind_check`
- `production_pipeline_rule_direction_check`
- `production_pipeline_rule_episode_count_positive`
- `production_pipeline_rule_kind_check`
- `production_pipeline_rule_weekday_check`
- `production_pipeline_rule_weekday_required_check`

**I due che servono a `D-58-04`** — il settimo tipo di pezzo — sono
`production_piece_kind_check` e `production_pipeline_rule_kind_check`. Entrambi
esistono con quel nome esatto nel database applicato.

**Perche' si leggono invece di dedurli.** Un nome dedotto sbagliato produce un
`DROP CONSTRAINT IF EXISTS` che **non fa nulla in silenzio**, seguito da un
`ADD CONSTRAINT` che fallisce per duplicato. Il precedente e' registrato in
`staff_role.sql:34-40`.

Nota per i piani 58-06 e 58-07: `production_piece_date_xor_reason` e
`production_piece_unresolved_check` non erano nominati nel piano, ed esistono.
Sono i due vincoli che spiegano perche' 2 degli 8 pezzi agganciati non hanno una
data e quindi escono dal campione di M2.

## M5 — il discriminante di `ICS-07`

### Il primo giro: nessuna delle tre righe candidate risulta colpevole

Regex dell'audit — `(^|-)(19|20)[0-9]{2}(-|$)` su `id::text`:

| | totale | con un gruppo che sembra un anno |
|---|---|---|
| corse di import | 5 | **0** |
| righe di piano con `absent_since` | 0 | 0 |
| righe di pezzo con `absent_since` | 17 | **0** |
| righe di impegno con `absent_since` | 0 | 0 |
| corse con divergenze registrate | **0** | — |

Preso alla lettera, questo escluderebbe tutte e tre le righe. **Ma la misura era
troppo stretta**, e per una ragione precisa: `:1117` stampa l'`id` delle righe
assenti **di quella corsa**, e le 66 assenze false della fase 48 riguardavano
righe che **oggi non portano piu' il timbro**. La misura giusta e' su **tutte** le
righe delle tabelle specchiate.

### Il secondo giro, allargato — e la risposta

| tabella | righe | id con un gruppo che sembra un anno |
|---|---|---|
| `production_plan` | 2 | 0 |
| `production_piece` | 46 | 0 |
| `production_commitment` | 79 | **1** |
| `production_checklist_item` | 14 | 0 |
| `production_import_run` | 5 | 0 |

E sul percorso di `:1103` — il `source_uid`, che viene dal file e che
`printableUid` lascia grezzo se non porta parole del titolo — tokenizzato come fa
lo script (split sui non-alfanumerici, token da 3 caratteri in su):

| tabella | righe con `source_uid` | con un token di esattamente quattro cifre `19xx`/`20xx` |
|---|---|---|
| `production_plan` | 2 | **0** |
| `production_piece` | 40 | **0** |
| `production_commitment` | 79 | **0** |

### La causa e' `:1117`

**Una sola riga in tutto lo specchio porta un identificativo che l'audit legge
come un anno, ed e' una riga di `production_commitment`.** Le tre candidate si
chiudono cosi':

| Riga | Cosa stampa | Verdetto misurato |
|---|---|---|
| `:1209` | l'`id` della corsa di import, solo su `--apply` | **escluso** — 0 corse su 5 portano un gruppo che sembra un anno |
| `:1103` | `printableUid(record.sourceUid)`, solo con divergenze | **escluso** — 0 `source_uid` su 121 producono un token da quattro cifre, e 0 corse registrano divergenze |
| **`:1117`** | l'`id` **grezzo** di una riga assente, non passato per `printableUid` | **e' questa** — l'unico candidato dell'intero specchio e' una riga di impegno, e le righe di impegno finiscono nel blocco delle assenze |

**E questo corregge il ritrovamento originale.** Il ritrovamento *escludeva* il
blocco delle assenze, sulla base che *«stampa identificativo e codice di motivo e
nient'altro»*. La misura dice che quella e' precisamente la forma che puo'
contenere un anno — perche' l'identificativo e' grezzo — e che e' l'unica delle
tre che oggi ha un candidato.

**Onesta' della misura, dichiarata.** L'audit e' scattato su una corsa il cui
insieme di assenze non e' quello di oggi. Questa misura non ricostruisce quella
corsa: identifica **l'unica riga dell'intero specchio capace di produrre quel
token**, e osserva che e' raggiungibile da una sola delle tre righe candidate. E'
un'attribuzione sostenuta da una misura, non una ricostruzione.

**Cosa ne segue per il piano 58-05.** Ripara comunque tutte e tre, come previsto,
ma con la priorita' che la misura indica e con la regola generale al posto della
riparazione puntuale: **nessun identificativo grezzo nel transcript**. `ICS-01` e
`ICS-02` aggiungono righe nuove al referto, e ognuna sarebbe una nuova occasione
per l'audit di andare in rosso.

---

## Task Commits

1. **Task 1: Le misure d'apertura** — nessun commit proprio: il task non crea
   nessun file. Le cinque misure sono il blocco qui sopra, e viaggiano con il
   commit di questo SUMMARY. Gli script di misura sono usa-e-getta e vivono
   fuori dal repo.
2. **Task 2: Le tre procedure** — `1d67931` (docs)

## Files Created/Modified

- `.planning/phases/58-il-calendario-si-legge-come-lo-si-scrive/58-PROCEDURES.md` — **creato.** Tre procedure, 24 passi numerati continui, 24 righe `Result: pending`. `P-58-C` in testa.

## Decisions Made

- **Il piano 58-03 adotta il massimo per coppia `(serie, tipo)`.** Motivato sopra con due misure. Il massimo assoluto (4 giorni) e' riportato e **dichiarato non adottabile**.
- **La finestra e' un tetto, non il criterio.** `conformsToRule` resta il criterio, perche' la pipeline si esprime in giorni della settimana.
- **Le 11 coppie senza righe restano al rifiuto**, `RSNT/listing` compresa.
- **La numerazione dei passi corre continua attraverso le tre procedure.** `44-PROCEDURES.md` numera le azioni da 1 a 67 e mette un `Result` per blocco; qui il criterio di accettazione chiede che il numero di `Result: pending` sia pari al numero dei passi, quindi ogni passo e' un blocco con il suo ruolo e il suo `Result`. Ventiquattro e ventiquattro, verificabile con un `grep -c`.
- **Le migration si nominano senza il prefisso numerico** (`production_calendar.sql`, non il nome completo). Quel prefisso e' una data, e il criterio di accettazione pretende che l'unica riga del file con quattro cifre di un anno sia `written:` nel frontmatter. La scelta e' dichiarata dentro il file, regola di lettura (d).

## Deviations from Plan

### Correzioni al piano, non al codice

**1. [Rule 1 - Fatto] Il campione di M2 e' di 6 righe, non di 46**

- **Trovato durante:** Task 1
- **Problema:** Il piano descriveva *«i 46 pezzi gia' agganciati in produzione»* come campione di verita' di `ICS-05`. Misurato: 46 pezzi in tutto, **8** con `plan_id`, **6** con `plan_id` **e** `date`.
- **Cosa e' stato fatto:** Il denominatore e' misurato, riportato prima della tabella, e la conclusione e' cambiata di conseguenza: 3 coppie con un dato, 11 senza. Il piano si aspettava una tabella quasi piena; la tabella vera e' quasi vuota, e le celle vuote sono la parte che conta.
- **File modificati:** nessuno — e' una correzione di fatto che vive in questo SUMMARY.
- **Verifica:** quattro conteggi nella stessa query, riportati sopra.

**2. [Rule 1 - Fatto] La misura di M5 prescritta dal piano non discrimina, e la ragione e' nota**

- **Trovato durante:** Task 1
- **Problema:** La query prescritta — la regex sugli `id` delle corse, poi sugli `id` delle righe con `absent_since` non nullo — restituisce **0 ovunque**. Presa alla lettera escluderebbe tutte e tre le candidate, che e' un esito impossibile: l'audit e' scattato davvero.
- **Cosa e' stato fatto:** Una seconda passata sulla stessa regex applicata a **tutte** le righe delle tabelle specchiate, piu' la tokenizzazione dei `source_uid` come la fa lo script. Motivo: `:1117` stampa gli `id` delle righe assenti **di quella corsa**, e il timbro di assenza di allora non e' quello di oggi. La seconda passata trova **un solo candidato in tutto lo specchio** e chiude la domanda.
- **File modificati:** nessuno.
- **Verifica:** cinque conteggi per tabella piu' tre sui `source_uid`, riportati sopra.

**3. [Rule 2 - Mancante critico] Un passo di `P-58-C` che il piano non elencava: fermare il cron**

- **Trovato durante:** Task 2
- **Problema:** `D-58-05` porta il cron di `ICS-10`. Un rientro eseguito mentre il cron puo' scattare e' un rientro che perde: il passo 5 ripristina le spunte e la corsa automatica successiva le cancella di nuovo.
- **Cosa e' stato fatto:** Il passo 1 di `P-58-C` («non rilanciare») include ora *fermare o disattivare il cron e annotare l'ora*, e il passo 6 lo riaccende. E' `ICS-10` che rende necessaria la riga, e il piano 58-10 la trovera' gia' scritta.
- **File modificati:** `58-PROCEDURES.md`
- **Verifica:** il passo 1 e il passo 6 sono simmetrici e portano entrambi l'ora.
- **Committed in:** `1d67931`

**4. [Rule 2 - Mancante critico] Il passo 15 di `P-58-A` non poteva usare le chiavi primarie del passo 10**

- **Trovato durante:** Task 2
- **Problema:** Il piano chiede la cattura degli identificativi «per chiave primaria» e la rimozione finale «per chiave primaria dalla lista catturata prima». Ma lo specchio **cancella e riscrive**: gli `id` delle voci di checklist dopo il passo 13 **non sono piu' quelli del passo 10**. Una rimozione per chiave primaria su quella lista non troverebbe nulla — che e' il verso sicuro dell'errore, ma non ripristinerebbe niente.
- **Cosa e' stato fatto:** Il passo 15 dichiara la contraddizione invece di nasconderla: la lista del passo 10 dice **quali** voci vanno riportate a non spuntate, l'indirizzamento passa dalla chiave stabile `(source_uid, kind, label)`, e resta vietato ogni selettore per interfaccia. La disciplina della chiave primaria resta intatta dove ha senso — `P-58-B` passo 24, dove le righe di piano si identificano per `source_uid` e la serata per il suo `id`, che non cambia.
- **File modificati:** `58-PROCEDURES.md`
- **Verifica:** il passo 15 nomina la ragione per cui gli `id` sono cambiati.
- **Committed in:** `1d67931`

**5. [Rule 2 - Mancante critico] `P-58-B` non spende progressivi, e lo dichiara**

- **Trovato durante:** Task 2
- **Problema:** Il piano dice *«creare il legame fra una riga di piano e una serata»* senza dire su quale serata. Creare la serata significherebbe **spendere un progressivo**, che e' la terza guardia monotona del progetto e non si restituisce.
- **Cosa e' stato fatto:** Il preambolo di `P-58-B` dichiara che nessun passo annuncia una serata e che il legame si fa su una serata **gia' esistente**; il passo 19 rilegge il progressivo della serie e si ferma se e' salito; il passo 24 dichiara che, se fosse salito, **non si riporta indietro**.
- **File modificati:** `58-PROCEDURES.md`
- **Verifica:** il passo 19 e il passo 24 leggono lo stesso valore in due momenti.
- **Committed in:** `1d67931`

---

**Total deviations:** 5 (2 correzioni di fatto sulle misure, 3 aggiunte critiche alle procedure)
**Impact on plan:** Nessuno scope creep. Le due correzioni di fatto rendono le misure vere invece che attese; le tre aggiunte chiudono buchi che avrebbero prodotto un rientro perdente, una rimozione che non trova nulla, o un progressivo speso per una verifica.

## Issues Encountered

- **Il worktree non ha `node_modules` ne' `.env.local`.** Le misure sono state prese caricando l'ambiente dal `.env.local` del checkout principale (gitignorato) con `node --env-file`, senza copiarlo nel worktree. `scripts/rls-baseline.mjs` non ha dipendenze esterne — solo builtin — quindi ha funzionato senza installare niente. **Nessun pacchetto e' stato installato in tutta l'esecuzione**, come il registro delle minacce prevedeva (`T-58-02-SC`).
- **`npm run build` non e' stato eseguito**, perche' il worktree non ha `node_modules` e questo piano **non tocca un solo file di prodotto**: l'unico file creato sta in `.planning/`. Detto esplicitamente invece che dichiarato verde: il build di questa fase si misura sui piani che toccano `src/` e `scripts/`, non su questo. `npm run verify` non e' stato eseguito per la stessa ragione.
- **`npm run verify:persona` esce `0`** — 7/7 verdi, controllo **F** compreso: nessun materiale di produzione e' entrato nel repo.

## Threat Flags

Nessuna nuova superficie. Le mitigazioni del registro sono state applicate come scritte:

| Minaccia | Come e' stata onorata |
|---|---|
| `T-58-02-01` | `party_series.ics_alias` letto **solo** come `count(*)`. Zero valori in stdout e zero nel SUMMARY |
| `T-58-02-02` | Conteggi e nomi di vincolo soltanto. Nessun `ticked_by_name`, nessun `source_uid`, nessun identificativo |
| `T-58-02-03` | `58-PROCEDURES.md` nomina ruoli, mai persone; nessuna sede, nessuna data di serata. `grep -cE "(19\|20)[0-9]{2}"` restituisce **1**, ed e' la riga `written:` del frontmatter, dichiarata come tale nella regola di lettura (d) |
| `T-58-02-04` | Ogni query e' passata con `read_only: true`. Nessuna scrittura in produzione in tutto il piano |
| `T-58-02-05` | `registerSecret` su token, project reference, URL **e host** prima di qualunque `say()` |
| `T-58-02-SC` | Nessun pacchetto installato |

## Next Phase Readiness

**Pronto per il piano 58-03** (l'aggancio di `ICS-05`): ha la finestra come dato,
la forma da adottare dichiarata, e le undici coppie che devono rispondere
rifiuto.

**Pronto per il piano 58-05** (`ICS-07`): ha la causa attribuita — `:1117` — e la
regola generale da stabilire una volta invece che la riparazione della riga di
oggi.

**Pronto per i piani 58-06 e 58-07** (`D-58-04`, il settimo tipo di pezzo): hanno
i dodici nomi di vincolo letti da `pg_constraint`, compresi i due che devono
cambiare.

**Pronto per il piano 58-09** (il referto e `failPartway`): `P-58-C` esiste ed e'
il rimando che quelle due righe di consiglio dovranno portare.

**Pronto per il piano 58-10** (il cron): `P-58-C` porta gia' il passo che ferma
il cron durante un rientro.

**Cosa resta aperto, e non e' un blocco:** la finestra di `RSNT/listing` non
esiste come dato e non esistera' finche' un import non produce righe agganciate
per quella coppia. Il rifiuto e' la risposta corretta nel frattempo, ed e' cio'
che 58-03 deve implementare — non un valore preso in prestito.

---
*Fase: 58-il-calendario-si-legge-come-lo-si-scrive*
*Piano: 02*
*Completato: 2026-08-20*
