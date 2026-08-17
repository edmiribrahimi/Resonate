---
phase: 45-production-sections-section-by-section
plan: 08
subsystem: supabase-data / access-gating
tags: [migration, rls, capabilities, production-sections, storage, management-api]

requires:
  - "45-03 — le quattro righe di capability e la riscrittura dei sei arm del calendario, scritte su disco"
  - "45-04 — le cinque tabelle e i dieci read arm, scritti su disco"
  - "45-05 — keys.ts a 17 chiavi, capability-routes.ts, verify-capabilities.mjs"
  - "45-02 — il baseline dello strumento del rifiuto, misurato prima dello split"
provides:
  - "cinque migration nella history di produzione, con le versioni assegnate lette dalla history"
  - "cinque tabelle nuove, 37 vincoli nominati, dieci read arm, zero write arm"
  - "quattro chiavi di sezione e otto grant; production.read ancora concessa, deliberatamente"
  - "un bucket privato visual-archive, un solo arm di lettura, nessuna scrittura da client"
  - "la meta' catalogo di verify-section-export eseguita per la prima volta"
affects:
  - "45-09 — la migration di ritiro, che ora ha un presupposto verificato invece che assunto"
  - "45-10 — il seed, che ora ha uno schema dove atterrare"
  - "tutti i piani a valle che leggono o scrivono queste cinque tabelle"

tech-stack:
  added: []
  patterns:
    - "POST /v1/projects/{ref}/database/migrations — mai /database/query per applicare, mai PUT"
    - "le versioni si leggono dalla history, non dal corpo della risposta POST"
    - "lo snapshot cammina il grafo dei vincoli da pg_constraint, non la memoria"

key-files:
  created:
    - ".planning/phases/45-production-sections-section-by-section/45-08-SUMMARY.md"
  modified:
    - "scripts/verify-refusal.mjs"
    - ".planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md"

decisions:
  - "A2 chiesta, concessa e spesa il 2026-08-17: cinque migration una volta sola, piu' il singolo re-run dello strumento del rifiuto. Non copre il ritiro (45-09) ne' il seed (45-10)"
  - "Lo snapshot si legge in due parti: l'insieme di cascata deve essere IDENTICO, le tre tabelle scritte di proposito devono muoversi ESATTAMENTE dei numeri dichiarati. Un solo numero per tutte e due sarebbe stato un numero che mente"
  - "Il paragrafo di chiusura di verify-refusal.mjs e' stato corretto DOPO il run autorizzato, e lo strumento non e' stato rilanciato: un secondo run e' un secondo atto"

metrics:
  duration: "~7 minuti di esecuzione, 2026-08-17T19:00:26Z → 2026-08-17T19:06:59Z"
  completed: 2026-08-17
  tasks: 4
  commits: 1
---

# Fase 45 Piano 08: Applicare lo split alla produzione — Summary

Le cinque migration additive della fase 45 sono in produzione, applicate una per
richiesta attraverso l'endpoint delle migration; i cataloghi confermano cinque
tabelle, 37 vincoli nominati, dieci read arm e zero write arm; **nessuna riga
pre-esistente si e' mossa**, e `production.read` e' ancora concessa — che e' la
ragione per cui questa sequenza non ha aperto nessuna finestra in cui un lettore
titolato viene rifiutato.

---

## Task 1 — L'autorizzazione, con la sua data e il suo perimetro

**Concessa il 2026-08-17.** Le parole del proprietario: **«Autorizzato: migration
+ rilettura».**

I cinque punti e la nota sul deploy sono stati posti verbatim dal `how-to-verify`
del piano. La risposta e' arrivata prima che partisse qualsiasi richiesta: la
prima chiamata all'API di gestione registrata in questa sessione e' una lettura
di `current_database()` alle `19:00:43Z`, e la prima applicazione alle
`19:02:05Z` — entrambe dopo l'atto.

### Cosa l'autorizzazione copre — e la copertura e' esaustiva

| Coperto | Non coperto, e ognuno chiede il proprio atto |
|---|---|
| le **cinque** migration `20260817120000`, `120100`, `120200`, `120300`, `120400`, applicate **una volta sola** ciascuna, via `POST /v1/projects/{ref}/database/migrations` | la migration di ritiro `20260817120500_production_read_retire.sql` — **e' il piano 45-09**, e chiede di nuovo |
| **piu'** il singolo re-run dello strumento del rifiuto del task 4, che conia una sessione propria | il seed / la prima popolazione della sezione location — **e' A3, piano 45-10** |
| | qualsiasi seconda applicazione, qualsiasi re-run oltre quello del task 4, qualsiasi scrittura di una riga di dati |

**L'autorizzazione e' SPESA.** E' stata usata per cinque applicazioni e un run, e
non resta nulla da spendere. `45-PROCEDURES.md` porta la stessa cosa sulla riga
A2 del registro, con la stessa data.

**Ne' rifiutata ne' differita.** Il piano chiedeva di dire quale delle due in caso
contrario: non e' il caso, e la distinzione resta scritta perche' la prossima
volta potrebbe esserlo.

### Cosa questa autorizzazione non ha comprato

Il deploy. E' un atto del proprietario e questo piano non lo esegue. La regola
resta quella scritta: si spedisce in un giorno **senza serata**, e la prima
richiesta la si fa di persona — perche' l'assertion a module load di
`capability-routes.ts` sta dentro un bundle di **middleware**, che copre il
webhook dei pagamenti e la strada della scansione alla porta.

---

## Task 2 — Snapshot, applicazione, rilettura dai cataloghi

### Step 1 — Lo snapshot, prima di qualunque cosa

L'insieme di cascata **non e' stato ricordato: e' stato camminato**. Query
ricorsiva su `pg_constraint`, partendo dalle tre tabelle che le nuove referenziano
(`public.formats`, `public.profiles`, `public.venues`) e risalendo ogni
`contype = 'f'` che le punta, fino a profondita' 12.

La query, verbatim, e' quella eseguita in entrambi i punti — pre e post — byte per
byte la stessa, che e' l'unica forma in cui due misure si possono confrontare:

```sql
WITH RECURSIVE roots AS (
  SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('formats', 'profiles', 'venues')
),
closure AS (
  SELECT oid AS reloid, 0 AS depth FROM roots
  UNION
  SELECT con.conrelid, cl.depth + 1
  FROM closure cl
  JOIN pg_constraint con ON con.confrelid = cl.reloid AND con.contype = 'f'
  WHERE cl.depth < 12
)
-- ... unita alle sei tabelle del calendario, a private.capabilities,
--     private.role_capabilities e storage.buckets, poi contata riga per riga
--     con query_to_xml(format('select count(*) from %I.%I', ...))
```

**32 tabelle contate nel pre-snapshot. 37 nel post** — e le cinque in piu' non
sono un errore di conteggio: sono le cinque tabelle nuove, che la query
**ritrova da sola** perche' rilegge il grafo dei vincoli invece di portarsi
dietro una lista. Una query che avesse portato la lista non se ne sarebbe
accorta.

| schema | tabella | gruppo | pre | post | Δ |
|---|---|---|---|---|---|
| private | capabilities | scritta di proposito | 14 | **18** | **+4, dichiarato** |
| private | role_capabilities | scritta di proposito | 30 | **38** | **+8, dichiarato** |
| public | attendances | cascata | 0 | 0 | — |
| public | discount_code_tiers | cascata | 0 | 0 | — |
| public | discount_codes | cascata | 0 | 0 | — |
| public | door_scan_events | cascata | 0 | 0 | — |
| public | drink_items | cascata | 7 | 7 | — |
| public | drink_orders | cascata | 0 | 0 | — |
| public | drink_tokens | cascata | 0 | 0 | — |
| public | event_media | cascata | 0 | 0 | — |
| public | event_parties | cascata | 3 | 3 | — |
| public | formats | cascata | 5 | 5 | — |
| public | guest_list_entries | cascata | 0 | 0 | — |
| public | membership_acts | cascata | 2 | 2 | — |
| public | party_assignments | cascata | 0 | 0 | — |
| public | party_credits | cascata | 0 | 0 | — |
| public | party_series | cascata | 6 | 6 | — |
| public | pending_purchases | cascata | 0 | 0 | — |
| public | production_checklist_item | calendario | 0 | 0 | — |
| public | production_commitment | calendario | 0 | 0 | — |
| public | production_import_run | calendario | 0 | 0 | — |
| public | production_piece | calendario | 0 | 0 | — |
| public | production_pipeline_rule | calendario | **16** | **16** | — |
| public | production_plan | calendario | 0 | 0 | — |
| public | profiles | cascata | 4 | 4 | — |
| public | rsvps | cascata | 0 | 0 | — |
| public | ticket_refunds | cascata | 0 | 0 | — |
| public | ticket_tiers | cascata | 1 | 1 | — |
| public | tickets | cascata | 0 | 0 | — |
| public | venue_reveal_acts | cascata | 0 | 0 | — |
| public | venues | cascata | 5 | 5 | — |
| storage | buckets | scritta di proposito | 5 | **6** | **+1, dichiarato** |
| public | production_open_question | *(nuova)* | — | 0 | nuova, vuota |
| public | production_section | *(nuova)* | — | 0 | nuova, vuota |
| public | production_space | *(nuova)* | — | 0 | nuova, vuota |
| public | production_space_attribute | *(nuova)* | — | 0 | nuova, vuota |
| public | production_visual_asset | *(nuova)* | — | 0 | nuova, vuota |

> **⚠ COME SI LEGGE QUESTA TABELLA, E PERCHE' «TUTTI I CONTEGGI IDENTICI» SAREBBE
> STATA UNA FRASE FALSA.** Il piano chiede allo step 5 che ogni conteggio sia
> identico; lo stesso piano, allo step 4, pretende che `private.capabilities`
> passi da 14 a 18. Le due richieste non stanno insieme, e la risposta onesta non
> e' scegliere quella comoda: e' **leggere lo snapshot in due parti**.
>
> - **L'insieme di cascata e le sei tabelle del calendario — 29 righe — devono
>   essere IDENTICI, e lo sono.** Nessuna riga pre-esistente si e' mossa. E'
>   questa la meta' che risponde a D12.
> - **Le tre tabelle che le migration scrivono di proposito devono muoversi
>   ESATTAMENTE dei numeri dichiarati in anticipo: +4, +8, +1.** E lo fanno.
>
> Un unico numero per entrambe le parti non avrebbe distinto *nulla si e' mosso*
> da *si e' mosso quello che doveva*, e la seconda meta' e' quella dove un errore
> di applicazione si sarebbe visto.

**E c'e' una misura in piu' che il piano non chiedeva e che vale piu' del
conteggio.** Le nove chiavi esterne nuove sono state lette in `pg_constraint` con
il loro `confdeltype`: **nessuna e' `CASCADE`.**

```
production_open_question_format_id_fkey        a  (NO ACTION)
production_section_format_id_fkey              a  (NO ACTION)
production_section_updated_by_fkey             n  (SET NULL)
production_space_created_by_fkey               n  (SET NULL)
production_space_home_format_id_fkey           a  (NO ACTION)
production_space_promoted_venue_id_fkey        a  (NO ACTION)
production_space_attribute_space_id_fkey       r  (RESTRICT)
production_visual_asset_created_by_fkey        n  (SET NULL)
production_visual_asset_format_id_fkey         a  (NO ACTION)
```

Il grafo di cascata **non e' cresciuto di un solo percorso di cancellazione**.
Contare le righe dice che oggi non si e' mosso niente; questo dice che domani non
puo' muoversi per una strada che nessuno ha dichiarato — che e' esattamente la
forma di D12, dove i vincoli fecero il resto dopo che un selettore aveva
corrisposto a piu' di quanto intendesse.

### Step 2 — Il pre-stato, cosi' che ogni affermazione di idempotenza sia
### controllabile invece che asserita

**Le ultime cinque versioni nella history, prima di toccare nulla:**

```
20260815015048  20260815120200_production_checklist_tick_revoke
20260815014107  production_calendar_access
20260815014103  production_calendar
20260811111530  live_attendance_channel
20260811001927  venues_read_narrowed
```

**Le cinque tabelle nuove esistevano gia'?** No. Query su `pg_class` per i cinque
nomi: **`[]`**, insieme vuoto. Nessuna clausola `IF NOT EXISTS` ha quindi
nascosto nulla in questa applicazione.

**Le quattro chiavi di sezione esistevano gia'?** No. `private.capabilities`
portava **14** righe, e la lista completa non contiene nessuna delle quattro:

```
admin.access · catalogue.manage · door.operate · door.supervise · master.manage
media.upload · membership.active · membership.card.view · organizer.access
party.manage · production.read · register.read · staff.manage · venue.reveal
```

`production.read` c'era, con i suoi **due** grant (`master`, `organizer`,
entrambi `requires_approved = false`).

**I sei nomi di policy sul calendario e il `qual` di ognuna, prima:**

```
production_checklist_item  production_checklist_item_select_production_read  SELECT {public}
    ( SELECT private.has_capability('production.read'::text) AS has_capability)
production_commitment      production_commitment_select_production_read      SELECT {public}
    ( SELECT private.has_capability('production.read'::text) AS has_capability)
production_import_run      production_import_run_select_production_read       SELECT {public}
    ( SELECT private.has_capability('production.read'::text) AS has_capability)
production_piece           production_piece_select_production_read            SELECT {public}
    ( SELECT private.has_capability('production.read'::text) AS has_capability)
production_pipeline_rule   production_pipeline_rule_select_production_read    SELECT {public}
    ( SELECT private.has_capability('production.read'::text) AS has_capability)
production_plan            production_plan_select_production_read             SELECT {public}
    ( SELECT private.has_capability('production.read'::text) AS has_capability)
```

**Il bucket `visual-archive` esisteva gia'?** No. `storage.buckets` portava
cinque righe — `artist-photos`, `event-images`, `event-media`,
`event-media-quarantine`, `venue-photos` — e nessuna con questo id. La nota di
idempotenza di `20260817120400` (*se un bucket con questo id esistesse gia',
questo file NON ne corregge le impostazioni*) e' quindi rimasta inerte: il file ha
scritto la riga che ha letto.

### Step 3 — L'applicazione, una richiesta per file, nell'ordine

`POST /v1/projects/{ref}/database/migrations`, con `SUPABASE_ACCESS_TOKEN` letto
dal `.env.local` del checkout primario. **Mai `/database/query` per applicare, e
mai `PUT`** — che fa upsert sulla history senza applicare niente.

| # | file | risposta | versione assegnata, **letta dalla history** |
|---|---|---|---|
| 1 | `20260817120000_production_section_keys.sql` | `HTTP 200 []` | `20260817190205` |
| 2 | `20260817120100_production_location.sql` | `HTTP 200 []` | `20260817190208` |
| 3 | `20260817120200_production_sections.sql` | `HTTP 200 []` | `20260817190211` |
| 4 | `20260817120300_production_sections_access.sql` | `HTTP 200 []` | `20260817190214` |
| 5 | `20260817120400_visual_archive_bucket.sql` | `HTTP 200 []` | `20260817190219` |

La history riletta dopo, verbatim:

```
20260817190219  20260817120400_visual_archive_bucket
20260817190214  20260817120300_production_sections_access
20260817190211  20260817120200_production_sections
20260817190208  20260817120100_production_location
20260817190205  20260817120000_production_section_keys
20260815015048  20260815120200_production_checklist_tick_revoke
20260815014107  production_calendar_access
20260815014103  production_calendar
```

**Le versioni sono assegnate dal server, non prese dal nome del file** — il
precedente e' li' a dirlo: `20260815120200_...` porta la versione `20260815015048`.
Per questo il `name` passato all'endpoint e' il nome completo del file: e' l'unico
filo che riporta dalla history al file, e usare la forma corta lo avrebbe reciso.

L'ordine non era facoltativo, e la ragione e' meccanica: il file degli accessi
nomina tabelle che i due file strutturali creano, e Postgres rifiuta una policy che
legge una relazione che non esiste, con la transazione in rollback.

### Step 4 — La rilettura, che legge i CATALOGHI e non le risposte

Un `200` su un `POST` e' un referto; il catalogo e' il fatto.

**`pg_class` — le cinque tabelle esistono, e sono chiuse:**

```
public.production_open_question    rls_enabled true   forced false
public.production_section          rls_enabled true   forced false
public.production_space            rls_enabled true   forced false
public.production_space_attribute  rls_enabled true   forced false
public.production_visual_asset     rls_enabled true   forced false
```

**`pg_constraint` — 37 vincoli nominati sulle cinque tabelle.** I quattro che
portano una decisione, presenti **per nome**:

| vincolo | tabella | cosa tiene |
|---|---|---|
| `production_space_acquired_needs_evidence` | `production_space` | acquisito significa **per iscritto** (D-45-12) |
| `production_space_exit_xor_reason` | `production_space` | un'uscita porta perche' e quando, o non e' un'uscita (D-45-13) |
| `production_space_promotion_needs_acquired` | `production_space` | una classifica non e' una disponibilita' (D-45-10) |
| `production_section_not_decided_names_its_gap` | `production_section` | un vuoto dichiara la sua lacuna e il suo proprietario |

Gli altri 33 sono presenti e nominati: i sette `CHECK` di vocabolario su
`production_space`, `production_space_published_hours_not_blank`,
`production_space_real_capacity_positive`, `production_space_source_key_unique`,
i tre `CHECK` piu' `production_space_attribute_unique` sugli attributi,
`production_section_section_check`, `production_section_state_check`,
`production_section_written_has_a_body`,
`production_open_question_closed_xor_resolution`,
`production_visual_asset_kind_check`,
`production_visual_asset_object_key_unique`, le nove chiavi esterne e le cinque
chiavi primarie. **Nessun vincolo anonimo:** una riga rifiutata arrivera' a chi
chiama come un nome su cui ramificare, non come un `23514` muto.

**`pg_policies` — i sei arm del calendario, riscritti:**

```
tabella                    policy                                                       qual
production_checklist_item  production_checklist_item_select_production_calendar_manage  ( SELECT private.has_capability('production.calendar.manage'::text) AS has_capability)
production_commitment      production_commitment_select_production_calendar_manage      ( SELECT private.has_capability('production.calendar.manage'::text) AS has_capability)
production_import_run      production_import_run_select_production_calendar_manage      ( SELECT private.has_capability('production.calendar.manage'::text) AS has_capability)
production_piece           production_piece_select_production_calendar_manage           ( SELECT private.has_capability('production.calendar.manage'::text) AS has_capability)
production_pipeline_rule   production_pipeline_rule_select_production_calendar_manage   ( SELECT private.has_capability('production.calendar.manage'::text) AS has_capability)
production_plan            production_plan_select_production_calendar_manage            ( SELECT private.has_capability('production.calendar.manage'::text) AS has_capability)
```

- **Sei, non dodici.** I nomi pre-split non esistono piu': i dodici `DROP` per sei
  arm hanno fatto quello per cui erano scritti, e nessuna tabella porta due
  policy — che in Postgres si sarebbero sommate in OR, allargando invece di
  sostituire.
- **Ogni `qual` comincia `( SELECT `.** Verificato meccanicamente, non a occhio:
  `left(qual,9) = '( SELECT '` risponde `true` su tutte e sei. Il wrapper
  dell'InitPlan e' sopravvissuto alla riscrittura — ed e' il wrapper a produrre
  l'effetto, non `STABLE`, come `EXPLAIN` ha smentito e come
  `20260807000000_capability_model.sql:177-184` registra.

**`pg_policies` — i read arm sulle cinque tabelle nuove. E sono DIECI, non
quattro.**

| tabella | policy | chiave chiesta | ruoli |
|---|---|---|---|
| `production_space` | `production_space_select_location` | `production.location.manage` | `{authenticated}` |
| `production_space_attribute` | `production_space_attribute_select_location` | `production.location.manage` | `{authenticated}` |
| `production_section` | `production_section_select_manifesto` | `production.manifesto.manage` **AND `section = 'manifesto'`** | `{authenticated}` |
| `production_section` | `production_section_select_visual` | `production.visual.manage` **AND `section = 'visual'`** | `{authenticated}` |
| `production_open_question` | `production_open_question_select_manifesto` | `production.manifesto.manage` AND `section = 'manifesto'` | `{authenticated}` |
| `production_open_question` | `production_open_question_select_visual` | `production.visual.manage` AND `section = 'visual'` | `{authenticated}` |
| `production_open_question` | `production_open_question_select_location` | `production.location.manage` AND `section = 'location'` | `{authenticated}` |
| `production_open_question` | `production_open_question_select_calendar` | `production.calendar.manage` AND `section = 'calendar'` | `{authenticated}` |
| `production_open_question` | `production_open_question_select_brandwide` | `section IS NULL` AND (le quattro in OR) | `{authenticated}` |
| `production_visual_asset` | `production_visual_asset_select_visual` | `production.visual.manage` | `{authenticated}` |

> **IL NUMERO MISURATO E' DIECI, E IL PIANO NE DICEVA QUATTRO.** Il criterio 1 del
> piano parla di *un read arm per chiave di sezione — quattro policy, quattro
> chiavi diverse*. La misura dice **dieci arm sopra cinque tabelle, che chiedono
> quattro chiavi distinte**. Le due frasi non si contraddicono, e la riconciliazione
> e' questa: **una tabella non e' un arm.**
>
> - `production_section` porta **entrambe** le sezioni redazionali nella stessa
>   tabella, distinte dalla colonna `section`: due arm, disgiunti su quella
>   colonna, perche' una policy sola non puo' chiedere due chiavi diverse senza
>   ammettere una riga sulla chiave sbagliata.
> - `production_open_question` **attraversa tutte e quattro** le sezioni e la sua
>   colonna `section` non ha un `CHECK` di vocabolario, per una decisione scritta
>   in `20260817120200:226-234`: cinque arm, uno per sezione piu' quello
>   brand-wide con `IS NULL`. Il disegno a tre arm del piano 45-04 avrebbe lasciato
>   una domanda su una location o su una data **leggibile da nessuno, e inserita
>   senza errore** — un avviso che nessuno puo' ricevere, su un registro la cui
>   unica funzione e' avvisare.
> - **Il residuo e' nominato invece che coperto:** una riga con un `section` fuori
>   dai quattro valori resta leggibile da nessuno. E' fail-closed, che e' il verso
>   giusto, ed e' scritto — non invisibile per caso.
>
> Le quattro chiavi distinte ci sono tutte, ed e' la meta' strutturale del
> criterio 1. Non e' la meta' che riguarda un soggetto: vedi il task 4.

**Zero write arm, contati e non guardati:**

```
select_arms  write_arms  total
         10           0     10
```

**`private.capabilities` — diciotto righe, e `production.read` e' ancora una di
esse:**

```
capabilities_rows  production_read_still_there  grants_total
               18                            1            38
```

**`private.role_capabilities` — gli otto grant nuovi, piu' i due vecchi:**

```
master     production.calendar.manage    requires_approved false
organizer  production.calendar.manage    requires_approved false
master     production.location.manage    requires_approved false
organizer  production.location.manage    requires_approved false
master     production.manifesto.manage   requires_approved false
organizer  production.manifesto.manage   requires_approved false
master     production.read               requires_approved false   ← ancora qui, di proposito
organizer  production.read               requires_approved false   ← ancora qui, di proposito
master     production.visual.manage      requires_approved false
organizer  production.visual.manage      requires_approved false
```

**Gli stessi due ruoli, prima e dopo.** I grant non si sono ne' ristretti ne'
allargati: e' il vincolo 3 di D-45-04, e la sua verifica e' proprio questa lista.

**`storage.buckets` — il bucket dell'archivio:**

```
id              name            public  file_size_limit  allowed_mime_types
visual-archive  visual-archive  false   104857600        {image/jpeg,image/png,image/webp}
```

E la sua unica policy:

```
visual_archive_select_visual  SELECT  PERMISSIVE  {authenticated}
  qual: ((bucket_id = 'visual-archive'::text)
         AND ( SELECT private.has_capability('production.visual.manage'::text) AS has_capability))
  with_check: null
```

**Una sola policy nomina questo bucket, ed e' di lettura.** Nessuna di scrittura,
nessuna per `anon`, `with_check` nullo. Il `public = false` e' l'intera
mitigazione di T-45-11: un URL non elencato non e' un URL protetto.

**Le cinque tabelle nuove — zero righe ciascuna:**

```
production_open_question    0
production_section          0
production_space            0
production_space_attribute  0
production_visual_asset     0
```

Lo schema e' arrivato **vuoto di materiale**. Nessun indirizzo, nessuno spazio,
nessuna data, nessun nome sono entrati in produzione con queste migration.

### Step 5 — Il post-snapshot

Stessa query, stessi conteggi. La colonna `post` della tabella dello step 1 e' il
suo risultato. **29 righe su 29 identiche nell'insieme di cascata e nelle sei
tabelle del calendario; +4, +8, +1 esattamente dove erano dichiarati.**

### ⚠ E QUELLO CHE NULLA DI QUESTO TASK DICE

**Niente di quanto misurato qui dice che una policy rifiuta qualcuno.** L'API di
gestione si connette con un ruolo che **scavalca la RLS**: ogni lettura sopra e'
una lettura di catalogo, e un catalogo dice che una policy **esiste**, mai che
**rifiuta**. La sola cosa che parla di un rifiuto e' lo strumento del task 4, che
conia una sessione vera — e anche quello, su una tabella vuota, dice
onestamente di non aver misurato.

---

## Task 3 — Il rosso dichiarato, osservato

Comando eseguito: `node --env-file=/Users/etiesse/Resonate/.env.local
scripts/verify-capabilities.mjs`.

> **Perche' non `npm run verify:capabilities` nudo.** Questo agente gira in un
> worktree, e un worktree **non ha un `.env.local` proprio**. Non e' un
> aggiramento: `rls-baseline.mjs:191-224` prevede il caso in modo esplicito —
> *«a worktree or a CI runner has no `.env.local`, and refusing there would be
> refusing for the wrong reason»* — e legge dall'ambiente. `--env-file` gli
> passa lo stesso file del checkout primario. Lo script eseguito e' identico a
> quello che `npm run verify:capabilities` lancia.

### Il transcript, verbatim

```
verify-capabilities — one capability set, five sides

  measured against: production (Management API, read_only)
      TS 17 · DB 18 · POLICY 11 (73 call sites in 93 policies) · SRC 17 (270 files walked) · GRANT 38 rows

  ✗ 0 · both declarations hold the pre-registered 17 keys
      DB has 18 keys, expected 17: admin.access, catalogue.manage, door.operate, door.supervise, master.manage, media.upload, membership.active, membership.card.view, organizer.access, party.manage, production.calendar.manage, production.location.manage, production.manifesto.manage, production.read, production.visual.manage, register.read, staff.manage, venue.reveal
      If this is right, the model changed — a capability was added or removed. That is a design decision with a grant row and a policy or a route behind it, and it belongs in a plan. Look at the model, NOT at EXPECTED_KEY_COUNT.
  ✗ 1 · TS and DB name the same keys
      "production.read" is a row in private.capabilities but is NOT in src/lib/capabilities/keys.ts — MISSING FROM TYPESCRIPT. No caller can ask for it without writing the string by hand.
  ✓ 2 · every key a policy asks for exists in the catalogue
      11 keys used by policies: catalogue.manage, door.operate, master.manage, membership.active, party.manage, production.calendar.manage, production.location.manage, production.manifesto.manage, production.visual.manage, register.read, staff.manage
  ✓ 3 · every key application code asks for exists in the catalogue
      17 keys used in src/: admin.access, catalogue.manage, door.operate, door.supervise, master.manage, media.upload, membership.active, membership.card.view, organizer.access, party.manage, production.calendar.manage, production.location.manage, production.manifesto.manage, production.visual.manage, register.read, staff.manage, venue.reveal
  ! 4 · every catalogue key is asked for by a policy or by src/
      "production.read" is in the catalogue but NEITHER a policy NOR src/ asks for it.
      WHAT THIS SIDE ASKS: does a policy body or a src/ call site ask for this key? WHAT IT DOES NOT ASK: is this key bound to a ROUTE? That question lives in src/lib/routes/capability-routes.ts — a total Record<CapabilityKey, …> since plan 34-01 — and it is asserted by `npm run build`, which needs no database credential. Do not read a green here as evidence of a route binding: the map is itself under src/, so binding a key MAKES it asked-for by this side (finding F3 in the docblock). This stays a WARNING because promoting it would make the production build depend on a live database (D-34-11/D-34-12), and because eight of the seventeen keys gate TABLES rather than routes — counted by reading capability-routes.ts on 2026-08-17, each with its reason written beside it in that same file.
  ✗ 5 · every role holds exactly the declared set of capabilities
      master × production.read is UNACCOUNTED: the catalogue holds "production.read" and ROLE_GRANTS decides nothing for master. A capability minted without a decision for each role is exactly what D-02 forbids — "considered and refused" must be distinguishable from "forgotten", and silence is the second. Whether the database has a row for this pair was not measured, because there is nothing to compare it against.
      organizer × production.read is UNACCOUNTED: the catalogue holds "production.read" and ROLE_GRANTS decides nothing for organizer. A capability minted without a decision for each role is exactly what D-02 forbids — "considered and refused" must be distinguishable from "forgotten", and silence is the second. Whether the database has a row for this pair was not measured, because there is nothing to compare it against.
      staff × production.read is UNACCOUNTED: the catalogue holds "production.read" and ROLE_GRANTS decides nothing for staff. A capability minted without a decision for each role is exactly what D-02 forbids — "considered and refused" must be distinguishable from "forgotten", and silence is the second. Whether the database has a row for this pair was not measured, because there is nothing to compare it against.
      member × production.read is UNACCOUNTED: the catalogue holds "production.read" and ROLE_GRANTS decides nothing for member. A capability minted without a decision for each role is exactly what D-02 forbids — "considered and refused" must be distinguishable from "forgotten", and silence is the second. Whether the database has a row for this pair was not measured, because there is nothing to compare it against.
      Look at the capability model and at the migration that changed it, NOT at ROLE_GRANTS. Editing the declaration to agree with the database is editing the detector to agree with what it was built to detect.

  measures:
    by policy : catalogue.manage, door.operate, master.manage, membership.active, party.manage, production.calendar.manage, production.location.manage, production.manifesto.manage, production.visual.manage, register.read, staff.manage
    by src/   : admin.access, catalogue.manage, door.operate, door.supervise, master.manage, media.upload, membership.active, membership.card.view, organizer.access, party.manage, production.calendar.manage, production.location.manage, production.manifesto.manage, production.visual.manage, register.read, staff.manage, venue.reveal
    named only in comments (not counted as callers): door.operate, master.manage, media.upload, staff.manage

  Note: this asserts that the four declarations name the same keys, AND that every role
  holds exactly the capabilities declared for it in ROLE_GRANTS, with the declared
  requires_approved — private.role_capabilities IS read here, since plan 43-02. It does
  NOT assert that any policy is correct: which subjects a predicate admits is measured
  by npm run baseline:rls, and no profile row is read by this script.

FAILED 3/5: 0 · both declarations hold the pre-registered 17 keys · 1 · TS and DB name the same keys · 5 · every role holds exactly the declared set of capabilities
```

**Exit code: `1`, riportato com'e' caduto.**

### La chiave orfana, e perche' e' attesa

**L'orfana e' `production.read`**, e compare **quattro volte in quattro lati
diversi** — lati 0, 1, 4 e 5 — sempre per la stessa causa e mai per una seconda.
Il database porta 18 chiavi, `keys.ts` ne dichiara 17, e la differenza e' quella
riga sola: **e' ancora concessa di proposito**.

**Questo rosso e' stato scritto prima di arrivare.** E' il secondo dei due
intervalli dichiarati in anticipo dal piano 45-05, ed e' scritto anche nel file
che l'ha causato — `20260817120000_production_section_keys.sql:61-66`, sotto il
titolo *«E `verify:capabilities` VA ROSSO, DI PROPOSITO, FRA QUESTO FILE E IL
DEPLOY»*. Si chiude nel piano 45-09, quando il ritiro toglie la riga e i suoi due
grant, e i due conteggi tornano a essere 17 e 17.

> **Il piano prevedeva il lato 4; sono caduti anche 0, 1 e 5.** Non e' una
> sorpresa di sostanza — la causa e' identica, una chiave sola — ma va detto,
> perche' *«e' rosso il lato 4»* e *«sono rossi tre lati su cinque»* sono due
> frasi diverse e chi legge un exit code merita la seconda.

**Nessuna costante e' stata toccata.** `git status --short` dopo il run: vuoto.
Abbassare `EXPECTED_KEY_COUNT` da 17 a 18 avrebbe fatto tornare il verde, ed e'
esattamente il fallimento per cui quella costante esiste — lo script lo dice da
solo, nel messaggio: *«Look at the model, NOT at EXPECTED_KEY_COUNT»*.

### Una cosa che il rosso rende visibile e che vale per il piano 45-09

Il lato 4 dice che `production.read` **non e' piu' chiesta da nessuna policy ne'
da nessun file sotto `src/`**. Prima di questo piano era chiesta da sei policy;
adesso da zero. E' il presupposto del ritiro, ora misurato invece che assunto —
ma **il ritiro resta bloccato dal deploy**, perche' il bundle in produzione, che
non e' stato spedito, chiede ancora quella chiave dalla propria guardia.

---

## Task 4 — Lo strumento del rifiuto, rilanciato e confrontato col proprio baseline

### L'autorizzazione per il conio

A1 era spesa. Questo run e' coperto da **A2**, che nominava esplicitamente *«+
rilettura»* e che l'orchestratore ha riportato includendo il re-run del task 4.
**Un solo run**, come l'atto descriveva.

### La modifica allo strumento

`SECTION_TARGETS` e' passata da **6 a 11 tabelle**. La condizione che il file
stesso scriveva era *«quando le loro tabelle esistono — non prima»*, ed e' stata
soddisfatta allo step 3 di questo piano. Quattro voci nuove, con la nota che dice
perche' una tabella non e' un arm. Commit `5fe608f`.

### Il transcript, verbatim

```
verify-refusal — what the production policies do to a signed-in subject
               holding none of their keys.

  0 = the pair held  ·  1 = FAILED  ·  2 = REFUSED, and nothing was measured.
  A refusal is not a failure, and a 2 on an empty table is the honest outcome.

  ── the declared targets ───────────────────────────────────────────────

    section: calendar
      the fourth section (D-45-04). Six tables, one SELECT policy each, every qual asking the same key today
      · production_plan
      · production_piece
      · production_commitment
      · production_checklist_item
      · production_import_run
      · production_pipeline_rule
    section: location
      the narrowest-audience section in intent (D-45-24): every row is a space nobody has phoned, and one column is a street address. Two tables, one arm each, both asking production.location.manage
      · production_space
      · production_space_attribute
    section: manifesto and visual
      ONE table holding BOTH authored sections, distinguished by its section column and armed TWICE — production.manifesto.manage on the manifesto rows, production.visual.manage on the visual ones. The two arms are disjoint on that column, so their OR admits each row to the holder of that row's key and to nobody else
      · production_section
    section: visual
      the produced pieces and the photograph archive a listing is pulled from. One arm, asking production.visual.manage. The BYTES those rows point at are a separate question with a separate answer — the private bucket of 20260817120400_visual_archive_bucket.sql
      · production_visual_asset
    section: the register, which spans all four
      FIVE arms on one table: one per section, each asking that section's own key, plus the brand-wide arm written with IS NULL because section = 'x' on a null column is NULL and would have made the register's most general entries invisible to everybody with no error anywhere
      · production_open_question

  ── the four disciplines ───────────────────────────────────────────────

    1. read-only by construction, checked against this file's own source before anything else runs
    2. the assertion is a PAIR per table; a silent positive control REFUSES (exit 2) and never passes
    3. every minted session is revoked globally, and the revocation is re-read rather than assumed
    4. no token, no email and no row is printed — roles, table names, counts and outcomes only

  ── the subjects ───────────────────────────────────────────────────────

    master      the positive control — holds the key
    member      the refusal — a real auth.uid(), a real profile, no grant
    anonymous   the floor — the anon key and no session at all

  ── minting ────────────────────────────────────────────────────────────

    master      session minted
    member      one member profile resolved
    member      session minted
    anonymous   no session — the anon key alone


  ══ VERDICT: REFUSED — 10 of 11 rows measured NOTHING. ══
     This is not a pass and it is not a defect to repair: on a table holding zero
     rows the entitled answer and the unentitled answer are identical, so the pair
     cannot discriminate and the honest report is that the measurement did not
     happen. Re-running it will not change that. Importing the calendar will.

  ── the pair, per table ────────────────────────────────────────────────

    table                         master  member   anon  outcome
    production_plan                    0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: calendar
    production_piece                   0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: calendar
    production_commitment              0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: calendar
    production_checklist_item          0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: calendar
    production_import_run              0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: calendar
    production_pipeline_rule          16       0      0  pair held — entitled reads, unentitled reads nothing
      section: calendar
    production_space                   0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: location
    production_space_attribute         0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: location
    production_section                 0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: manifesto and visual
    production_visual_asset            0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: visual
    production_open_question           0       0      0  REFUSED — the positive control is silent, so the measurement did not happen
      section: the register, which spans all four

  ── the count ──────────────────────────────────────────────────────────

    rows declared                   11
    rows where the pair held         1
    rows REFUSED — not measured     10

  ── revocation, re-read rather than assumed ────────────────────────────

    master     signed out globally · token still resolves to a user: false
    member     signed out globally · token still resolves to a user: false

  ── what this instrument CANNOT close ──────────────────────────────────

    Success criterion 1 — *a viewer holding one section is refused the others*.
    Under D-45-03 all three new section keys go to master AND organizer, and the
    calendar key goes to the same two roles. **No subject exists in production for
    whom that refusal happens**, and D-45-23 forbids fabricating one. This run
    therefore says nothing about criterion 1, and a reader must not let its exit
    code stand in for one.

    What CAN be proven, and it is a different sentence, is that **the policies ask
    different keys** — read from `pg_policies`, through the Management API, which is
    a catalogue read and not a session. Today that sentence is not yet true either:
    all six calendar policies ask ONE key, because the split of D-45-04 has not been
    applied. It becomes measurable after that migration, and this instrument is
    built before the split precisely so the split has a baseline to be compared
    against.
```

**Exit code: `2`, riportato com'e' caduto.**

### Il confronto, riga per riga

| tabella | baseline 45-02 (prima) | questo run (dopo) | verdetto |
|---|---|---|---|
| `production_plan` | `0 / 0 / 0` REFUSED | `0 / 0 / 0` REFUSED | identico |
| `production_piece` | `0 / 0 / 0` REFUSED | `0 / 0 / 0` REFUSED | identico |
| `production_commitment` | `0 / 0 / 0` REFUSED | `0 / 0 / 0` REFUSED | identico |
| `production_checklist_item` | `0 / 0 / 0` REFUSED | `0 / 0 / 0` REFUSED | identico |
| `production_import_run` | `0 / 0 / 0` REFUSED | `0 / 0 / 0` REFUSED | identico |
| **`production_pipeline_rule`** | **`16 / 0 / 0` — la coppia ha tenuto** | **`16 / 0 / 0` — la coppia ha tenuto** | **IDENTICO — ed e' la riga che decide** |
| `production_space` | — non dichiarata | `0 / 0 / 0` REFUSED | nuova, vuota |
| `production_space_attribute` | — non dichiarata | `0 / 0 / 0` REFUSED | nuova, vuota |
| `production_section` | — non dichiarata | `0 / 0 / 0` REFUSED | nuova, vuota |
| `production_visual_asset` | — non dichiarata | `0 / 0 / 0` REFUSED | nuova, vuota |
| `production_open_question` | — non dichiarata | `0 / 0 / 0` REFUSED | nuova, vuota |
| righe dichiarate | 6 | 11 | +5 |
| coppie tenute | 1 | 1 | identico |
| righe REFUSED | 5 | 10 | +5, tutte nuove e vuote |
| exit code | `2` | `2` | identico |
| revoca master | `token still resolves: false` | `token still resolves: false` | identico |
| revoca member | `token still resolves: false` | `token still resolves: false` | identico |

**La riga che doveva restare identica e' identica.** `production_pipeline_rule`
portava 16 righe prima dello split e ne porta 16 dopo; un master le legge, un
member ne legge zero, un anonimo ne legge zero. **Nella prima misura i sei arm
chiedevano `production.read`; nella seconda chiedono
`production.calendar.manage`.** Stessa coppia, chiave diversa: e' il vincolo 3 di
D-45-04 — *lo split cambia il nome di una chiave e non chi puo' leggere* —
tenuto da una misura invece che da un diff. Se quella coppia si fosse mossa, sei
policy riscritte avrebbero cambiato la portata dell'accesso, e la fase si
sarebbe fermata qui.

### Le due frasi che non devono scambiarsi di posto

**Prima frase, vera e misurata:** *le dieci policy sulle cinque tabelle nuove
chiedono **quattro chiavi diverse***, lette da `pg_policies` allo step 4. E' la
meta' **strutturale** del criterio 1.

**Seconda frase, non misurata da questo run e non misurabile in produzione:** *un
lettore che possiede una sezione viene rifiutato sulle altre*. Sotto D-45-03 le
quattro chiavi vanno agli stessi due ruoli, quindi **in produzione non esiste
nessun soggetto per cui quel rifiuto avvenga**, e D-45-23 vieta di fabbricarne
uno: concedere una chiave a un ruolo in produzione e' un cambio d'accesso, non una
riga di test, e sarebbe misurare il sistema dopo aver alterato la cosa che si
misura.

**La prima non sostituisce la seconda.** Chi chiude la seconda e' la **procedura
P1** di `45-PROCEDURES.md`, in un ambiente usa-e-getta, su un account fatto a mano
che porta **una sola** chiave — e il suo `Result` legge ancora `pending`.

### Ogni sessione coniata e' provatamente revocata

```
master     signed out globally · token still resolves to a user: false
member     signed out globally · token still resolves to a user: false
```

Il token e' **riletto** dopo la revoca, non assunto revocato. Nessun token,
nessun indirizzo e nessuna riga compaiono nel transcript: solo parole di ruolo,
nomi di tabella, conteggi ed esiti — e questo documento e' tracciato su un
repository **pubblico**, quindi la disciplina non e' pulizia, e' il motivo per cui
il transcript si puo' incollare qui.

---

## Verifiche meccaniche

| comando | esito | letto come |
|---|---|---|
| `npm run build` | **exit 0** | il typecheck passa — **e non diceva nulla del database prima di questo piano**, che e' precisamente lo stato di falso positivo che questo piano chiude |
| `verify-capabilities.mjs` | **exit 1** | il rosso dichiarato, task 3 |
| `verify-refusal.mjs` | **exit 2** | rifiuto onesto su dieci tabelle vuote, task 4 |
| `verify-refusal.mjs --help` | **exit 0** | forma a secco dopo la modifica: il self-check read-only passa, niente e' stato contattato |
| `verify-section-export.mjs` | **exit 2** | vedi sotto — e la meta' catalogo ha girato per la prima volta |

### `verify:section-export` — la meta' catalogo esisteva solo come testo, e ora ha girato

Il piano 45-06 ha scritto questo gate e **la sua meta' catalogo non era mai stata
eseguita**: nessun motore aveva mai valutato quel SQL. Questo e' il suo primo run
vero, subito dopo la migration. **Non e' un errore di sintassi:**

```
  ── half two: the reachability census ─────────────────────────────────

    1 catalogue row(s) matched the census.
    the one expected edge (production_space.promoted_venue_id → venues) was present.
    functions declared as bridges: none, and none is expected.
```

**E' la meta' strutturale di D-45-21, misurata invece che dichiarata.** Il file
`20260817120300` scriveva, al suo §7, che nessuna struttura di questa fase da' a
`venue_for_parties` — l'unica strada pubblica verso un indirizzo — un percorso
verso una riga di `production_space`, e diceva onestamente *«un commento non e'
una prova, la prova e' del piano 45-06»*. Adesso la prova c'e': **un solo arco,
quello atteso, e punta verso l'esterno.** Nessuna funzione ponte.

L'exit `2` viene dall'altra meta':

```
    ⊘ missing entry file
         2 of 2 export modules are not on disk:
           · src/lib/production/export/manifesto.ts
           · src/lib/production/export/capitolato.ts
```

Sono del piano **45-16**. Fino ad allora questo rifiuto e' lo stato onesto, e uno
zero qui sarebbe stato un verde sopra un'assenza.

### Cosa NON e' stato eseguito, e perche' va detto

`npm run verify` (l'aggregatore) **non e' stato lanciato**: esce `2` su questo
albero per cause registrate in `deferred-items.md`, tutte precedenti a questa
fase, e un `2` suo non si distingue da un `2` mio senza un lavoro che non
appartiene a questo piano. Gli exit code sopra sono i miei, uno per strumento.

---

## Deviazioni dal piano

### 1. [Regola 1 — bug] Il paragrafo di chiusura di `verify-refusal.mjs` mentiva dopo il run

- **Trovata durante:** task 4, leggendo il transcript appena prodotto.
- **Il problema:** lo strumento stampa, in coda a ogni run, *«Today that sentence
  is not yet true either: all six calendar policies ask ONE key, because the
  split of D-45-04 has not been applied»*. Era vero fino a quaranta secondi
  prima. Dopo lo step 3 di questo piano e' **falso**, e falso nel modo peggiore:
  dice a chi legge un transcript futuro che lo split non e' stato applicato.
  `ai-engineering.md`, *gate documentazione datata* — un documento derivato che
  non si verifica contro lo stato corrente eredita l'errore senza portarne la
  responsabilita'.
- **La correzione:** il paragrafo ora dice che la frase e' diventata vera il
  2026-08-17, con la misura accanto, **e aggiunge il vincolo che mancava** — che
  *quattro policy nominano quattro chiavi diverse* resta un fatto strutturale e
  non e' il criterio 1, che riguarda un soggetto e si chiude con P1.
- **File:** `scripts/verify-refusal.mjs`
- **Commit:** `5fe608f`
- **⚠ E lo strumento NON e' stato rilanciato per osservare il testo nuovo.** Un
  secondo run e' una seconda sessione coniata sull'identita' di una persona
  vera, cioe' un secondo atto, e l'autorizzazione ne copriva uno. Il transcript
  qui sopra porta **la formulazione vecchia**, ed e' il record onesto: quello che
  l'autorizzazione ha comprato. La cosa e' scritta anche dentro il file, accanto
  alla correzione.

### 2. [Lettura, non deviazione] Lo snapshot si legge in due parti

Documentato per esteso nel task 2. Il piano chiede che *ogni* conteggio sia
identico e, tre paragrafi prima, che `private.capabilities` passi da 14 a 18. La
risposta non e' scegliere: e' separare l'insieme che non deve muoversi da quello
che deve muoversi di numeri dichiarati in anticipo. Nessuna riga pre-esistente si
e' mossa; le tre tabelle scritte di proposito si sono mosse di +4, +8, +1.

### 3. [Lettura, non deviazione] Dieci arm, non quattro

Il criterio 1 del piano dice *un read arm per chiave di sezione*. La misura dice
dieci arm sopra cinque tabelle, che chiedono quattro chiavi distinte, per le
ragioni scritte in `20260817120300`. **Il numero misurato e' dieci**, ed e' la
prima cosa che questa summary dice al posto di lasciarla dedurre. La nota di wave
2 (DEF-45-03 e il conteggio degli arm) lo anticipava, e la misura le da' ragione.

### 4. [Nota d'ambiente] Gli script sono stati lanciati con `--env-file`

Un worktree non ha un `.env.local` proprio. Le credenziali sono state lette dal
checkout primario **senza essere copiate in nessun file, senza essere stampate e
senza essere committate**. Il caso e' previsto dal caricatore d'ambiente del repo
(`scripts/rls-baseline.mjs:191-224`), che legge dall'ambiente quando il file non
c'e' — e che rifiuta con exit `2` e il nome della variabile quando manca, mai in
silenzio.

### Nessun'altra deviazione

Nessuna riga e' stata cancellata. Nessuna riga di dati e' stata scritta. Nessuna
costante e' stata modificata per far tornare un verde. Nessuna migration gia'
applicata e' stata modificata.

---

## Cosa questo piano lascia aperto, nominato invece che sottinteso

1. **Il deploy.** E' del proprietario. Fino ad allora il bundle in produzione
   chiede `production.read` dalla propria guardia, e per questo la chiave resta
   concessa. Giorno senza serata, prima richiesta fatta di persona.
2. **Il ritiro (45-09).** Chiede la **propria** autorizzazione. A2 e' spesa e non
   lo copre.
3. **Il seed (45-10).** A3, non ancora chiesta.
4. **Il criterio 1 sul soggetto.** Procedura P1, ambiente usa-e-getta, `Result:
   pending`.
5. **`verify:capabilities` resta rosso** fino al ritiro. E' l'intervallo
   dichiarato, non un difetto.
6. **Le sezioni non hanno superficie.** Le cinque tabelle esistono, sono chiuse e
   sono vuote. Un utente non vede ancora niente, e questo e' lo stato previsto.

---

## Known Stubs

Nessuno introdotto da questo piano: non tocca alcun file di prodotto. Le cinque
tabelle vuote non sono uno stub — sono uno schema che aspetta il proprio seed, con
il piano che lo porta gia' scritto (45-10) e la sua autorizzazione dichiarata come
non ancora chiesta.

## Threat Flags

Nessuna superficie di sicurezza nuova fuori dal `<threat_model>` del piano. Tutte
e sette le voci del registro erano dichiarate `mitigate` (o `transfer`, o
`accept`) e ognuna ha la propria misura registrata qui sopra: T-45-08 (i due
snapshot e i nove `confdeltype`), T-45-12 (l'endpoint delle migration e le cinque
versioni rilette), T-45-04 (`production.read` ancora concessa), T-45-04b (i sei
`qual` e gli otto grant), T-45-11 (`public = false`, un arm, nessuna scrittura,
nessun `anon`), T-45-03 (nessun contenuto di tabella in questo documento),
T-45-05 (trasferita al proprietario, per iscritto, nel task 1), T-45-SC (nessun
pacchetto installato).

---

## Self-Check: PASSED

| affermazione | come e' stata controllata | esito |
|---|---|---|
| `45-08-SUMMARY.md` esiste | `test -f` | FOUND |
| `scripts/verify-refusal.mjs` esiste | `test -f` | FOUND |
| il commit `5fe608f` esiste | `git log --oneline --all` | FOUND |
| le cinque versioni sono nella history di produzione | query su `supabase_migrations.schema_migrations` per i cinque valori | **`versions_present: 5`** |

L'ultima riga e' l'unica che conta davvero, ed e' stata chiesta **al database**,
non alle cinque risposte `HTTP 200` che l'avevano annunciata. Una misura presa con
lo strumento che ha causato l'effetto e' un'eco.

---

*Fase 45, piano 08 — scritto il 2026-08-17. Non contiene nessuno spazio, nessuna
data non annunciata, nessuna line-up e nessun nome di persona. `re:sonate` si
scrive con la e normale.*
