---
phase: 53-meno-strumenti-la-porta-dentro-management-inserted
plan: 07
subsystem: supabase-schema, lab-tooling
tags: [migration, removal, rls, capabilities, storage, CUT-01, D-53-03, D-53-04, D-53-05]
requires:
  - phase: 53-01
    provides: codice senza tabelle, chiavi e colonna della parola-sede
  - phase: 53-05
    provides: verify:capabilities a 11/20 con il rosso dichiarato fino a questa migration
  - phase: 53-13
    provides: vercel.json senza lo specchio (il grep di CUT-01 copre vercel.json)
provides:
  - "supabase/migrations/20261014120000_production_tools_removal.sql — sola rimozione, precondizioni a zero, rilettura"
  - "scripts/purge-production-tools.mjs — righe e oggetti per chiave, due fonti, solo numeri"
  - "scripts/seed-lab-door.mjs — --reset senza le due tabelle che escono"
affects: [53-08, 53-11, 53-12]
tech-stack:
  added: []
  patterns:
    - "policy riscritta prima della cancellazione delle chiavi che leggeva, con DO che rilegge pg_policies e pg_proc"
    - "strumento di rimozione senza istantanea: id e path solo in memoria, referto solo numeri, UUID oscurati negli errori"
key-files:
  created:
    - supabase/migrations/20261014120000_production_tools_removal.sql
    - scripts/purge-production-tools.mjs
  modified:
    - scripts/seed-lab-door.mjs
    - scripts/verify-capabilities.mjs
key-decisions:
  - "Fase 53-07: la migration toglie dieci tabelle (misurate: 12 CREATE TABLE production_*, ne restano 2), non undici come diceva la ricerca"
  - "Fase 53-07: il DO di rilettura controlla anche pg_proc (public, private) oltre a pg_policies: nessuna funzione puo' nominare una chiave tolta"
  - "Fase 53-07: purge-production-tools ricattura ogni passo e si ferma (census_moved) se il numero e' cambiato dal censimento; non stampa id ne' path, e oscura gli UUID nei messaggi d'errore"
requirements-completed: []  # CUT-01 si chiude quando la migration e' applicata (lab 53-08, produzione 53-11)
duration: ~45min
completed: 2026-10-14
---

# Fase 53 Piano 07: la rimozione dello schema scritta — Summary

**Una migration di sola rimozione che rifiuta di partire finche' i dati non sono stati tolti per chiave, riscrive la policy brand-wide sulla chiave del manifesto prima di cancellare le altre tre, e rilegge il catalogo; lo strumento che toglie righe e oggetti per chiave contando da due fonti e registrando solo numeri; il seme del lab che non si rompe dopo il `DROP`. Niente e' stato applicato a nessun progetto.**

## Le dieci tabelle, misurate

`/usr/bin/grep -hoE "CREATE TABLE (IF NOT EXISTS )?public\.production_[a-z_]+" supabase/migrations/*.sql` → **12** tabelle `production_*`. Ne restano 2 (`production_section`, `production_open_question`), ne escono **10**: `production_lineup_slot`, `production_checklist_item`, `production_piece`, `production_commitment`, `production_plan`, `production_import_run`, `production_pipeline_rule`, `production_space_attribute`, `production_space`, `production_visual_asset`. La ricerca (§1.7) diceva 11: divergenza gia' notata dal planner, confermata.

Il prefisso `20261014120000` era libero: nome del file come da piano.

## La migration — ordine e numeri di riga

`supabase/migrations/20261014120000_production_tools_removal.sql` (537 righe):

| § | Righe | Cosa |
|---|---|---|
| 0 | 1-73 | intestazione: decisione 2026-10-14 (CUT-01, D-53-02/03/04/05), «si applica dopo il deploy», una transazione senza `BEGIN` esplicito, cosa NON fa (quarantena della cover, `event-images`, `party_assignments`, bucket dall'SQL, dati), reversibilita' nessuna (D-53-05), niente Instant Rollback, avviso di pubblicazione |
| 1 | 93 | `DO` delle precondizioni: dieci `to_regclass` + `count(*)` via `EXECUTE format('%I')`; `production_section` sezione visual; `production_open_question` sezioni visual/location/calendar; `storage.objects` e `storage.buckets` per `'visual-archive'` — ognuna con `RAISE EXCEPTION` e HINT verso lo script |
| 2 | 181-187 | `DROP POLICY IF EXISTS`: `visual_archive_select_visual` su `storage.objects`, `production_section_select_visual`, `production_open_question_select_{visual,location,calendar}` |
| 3 | **207-215** | `production_open_question_select_brandwide` riscritta: `section IS NULL AND (SELECT private.has_capability('production.manifesto.manage'))` |
| 4 | 249-258, 260-261, 269 | dieci `DROP TABLE IF EXISTS` figli → padri, nessuna propagazione; `DROP FUNCTION` di `refuse_production_plan_renumber()` e `record_checklist_tick(uuid, boolean, uuid, text)`; `party_series` `DROP CONSTRAINT party_series_ics_alias_unique, DROP COLUMN ics_alias` |
| 5 | 284-289 | `production_section_section_check` → `CHECK (section IN ('manifesto'))` |
| 6 | 310, **313** | `DELETE FROM private.role_capabilities` (6) poi `DELETE FROM private.capabilities` (3), esplicite |
| 7 | 327 | `DO` di rilettura, undici controlli (a)-(k) con eccezioni distinte |
| 8 | 533, 536 | `COMMENT ON TABLE` ricontati: 11 chiavi; 20 concessioni (master 11, organizer 9, staff 0, attendee 0) |

**L'ordine richiesto da D-53-04:** `CREATE POLICY production_open_question_select_brandwide` alla riga **209** precede `DELETE FROM private.capabilities` alla riga **313** (e le concessioni alla 310). Non esiste un momento della transazione in cui una policy legge una chiave che non c'e'.

**Solo rimozioni.** Istruzioni del file: `DROP POLICY`, una `CREATE POLICY` che **restringe** (stesso insieme di lettori: master e organizer tenevano tutte e quattro le chiavi), `DROP TABLE`, `DROP FUNCTION`, `ALTER TABLE … DROP`, un `CHECK` che **restringe**, due `DELETE` sul catalogo delle chiavi, due `DO` di sola lettura, due `COMMENT`. Nessun `GRANT`, nessun `REVOKE` necessario (le funzioni cadono), nessuna policy allargata.

### Il `DO` di rilettura (§7)

(a) dieci tabelle assenti · (b) due funzioni assenti (`to_regprocedure`) · (c) `ics_alias` assente da `information_schema.columns` · (d) zero policy su `storage.objects` col letterale quotato `'visual-archive'` · (e) `event_media_quarantine_insert_staff` esattamente 1 · (f) `v_lettori` = 0 policy in qualunque schema che leggano una delle tre chiavi · (g) **in piu' del piano**: nessuna funzione di `public`/`private` che nomini le tre chiavi nel corpo · (h) brand-wide presente una volta e con la sola chiave del manifesto · (i) residui in catalogo/concessioni/assegnazioni = 0, chiavi `<> 11`, concessioni `<> 20`, ripartizione 11/9/0/0 · (j) `event-images` pubblico · (k) il `CHECK` di `production_section` senza `visual`.

### Prova della sintassi e della logica — container usa-e-getta

`npm run baseline:container -- --smoke` **non e' utilizzabile oggi**: si ferma su `20260811120000_live_attendance_channel.sql` (`SQLSTATE 3F000: schema "realtime" does not exist`), molto prima di questo file. E' un difetto preesistente dello shim, fuori perimetro (vedi Deferred).

Al suo posto: un `postgres:17.6` usa-e-getta (`docker run --rm`, nessuna rete verso Supabase) con uno **stub minimo** dello schema che questo file tocca (storage, `private.capabilities` a 14 / `role_capabilities` a 26, le policy reali per forma, le dieci tabelle con i loro vincoli reali, le due funzioni, il trigger). Esiti:

| Prova | Esito |
|---|---|
| una riga in `production_space` | `ERROR: public.production_space ha ancora 1 righe` + HINT; nulla applicato |
| un oggetto in `visual-archive` | `ERROR: il bucket visual-archive ha ancora 1 oggetti` + HINT |
| tutto a zero | applicata: 11 chiavi, 20 concessioni, solo le 2 tabelle che restano, brand-wide `((section IS NULL) AND ( SELECT private.has_capability('production.manifesto.manage'::text) …))`, `CHECK ((section = 'manifesto'::text))` |
| seconda esecuzione | passa (solo `NOTICE … does not exist, skipping`): idempotente |
| una policy estranea che legge una chiave tolta | `ERROR: le chiavi tolte hanno ancora 1 lettori di policy: public.production_section.rogue` |

Container distrutto subito dopo. **La prima esecuzione sullo schema vero resta il laboratorio (piano 53-08)**, dove le precondizioni proteggono da un'applicazione parziale.

## La cascata, enumerata dai vincoli delle migration

Letta con `/usr/bin/grep -nE "REFERENCES (public\.)?production_"` su tutte le migration — solo riferimenti **interni** all'insieme che esce:

| Figlio | → Padre | Regola | Fonte |
|---|---|---|---|
| `production_lineup_slot.plan_id` | `production_plan` | ON DELETE CASCADE | `20260822120000:62` |
| `production_checklist_item.plan_id` | `production_plan` | ON DELETE CASCADE | `20260815120000:661` |
| `production_piece.plan_id` | `production_plan` | nessuna regola (blocca) | `20260815120000:345` |
| `production_commitment.expanded_from` | `production_commitment` | nessuna regola (blocca) | `20260815120000:523` |
| `production_space_attribute.space_id` | `production_space` | RESTRICT (blocca) | `20260817120100:544` |

- **Raggiungibili per cascata dalle righe toccate dallo script:** solo `production_checklist_item` e `production_lineup_slot` (da `production_plan`), entrambe svuotate per chiave **prima** di `production_plan`, quindi la cascata non trova nulla da propagare.
- **Nessuna tabella fuori dall'insieme** punta a una delle dieci, ne' a `production_section`/`production_open_question`. `livecuts` nomina la tabella delle line-up solo in un commento (`20261004120000:307`).
- **Chiavi:** `private.role_capabilities.capability` → `private.capabilities` ON DELETE CASCADE (`20260807000000`); la migration cancella comunque le 6 concessioni esplicitamente prima delle 3 chiavi. `party_assignments.capability` → chiave senza regola, ma il suo `CHECK` non ha mai ammesso le tre chiavi; il `DO` lo rilegge (residuo 0).
- Le FK **uscenti** (verso `formats`, `party_series`, `venues`, `event_parties`, `profiles`, `auth.users`) non propagano nulla al `DROP`.
- Lo script **rilegge la cascata dal catalogo** a ogni corsa (`pg_constraint`, `confrelid` sulle dodici tabelle toccate) e rifiuta con `cascade_outside` se un figlio sta fuori dalle dieci.

**Istantanea prima della scrittura in produzione:** nessuna, per decisione del proprietario (D-53-05). Lo script lo dice nel docblock (regola 3 rovesciata) e nell'intestazione del referto; il piano 53-11 lo dichiara nel §3 dell'autorizzazione.

## Lo script — `scripts/purge-production-tools.mjs` (745 righe)

- **Rifiuto come prima cosa eseguita:** `import` (riga 111), lettura degli argomenti, `PRODUCTION_REF` (riga 130), poi i rifiuti dei modi (riga 139) e del bersaglio, poi `readAuthorisation` se il ref e' di produzione (riga 209). Nessun `fetch` prima. Il ref passa da `.trim()` (provato con un a capo finale: rifiuta).
- Autorizzazione: blocco `<!-- purge-production-tools: grant -->` con `act: purge-production-tools`, `target: production`, `granted: yes`, `granted_on` = `--dated`, `spent: no`; marcatura `spent: yes` + `spent_at` **dopo l'ultimo riconteggio**.
- Seconda fonte: `LAB_SUPABASE_URL`/`LAB_SUPABASE_SERVICE_ROLE_KEY` sul lab, `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` in produzione, `.trim()`, `url.includes(REF)` o `counter_target`.
- Censimento a due fonti per ogni passo (Management API `read_only` + PostgREST `count=exact`, `Range: 0-0`); bucket a due fonti (API Storage elenco ricorsivo paginato + `storage.objects` in sola lettura).
- Atto per passo: ricattura (stessa interrogazione) → `census_moved` se il numero e' cambiato → `delete … where id = ANY(ARRAY[…]::uuid[]) returning id` a blocchi di 500 → `delete_short` → riconteggio PostgREST = 0 (`residual_rows`) → solo allora la riga del referto. Bucket: `DELETE /storage/v1/object/visual-archive` con `prefixes` a blocchi di 100, riconteggio a due fonti (`residual_objects`), `DELETE /storage/v1/bucket/visual-archive`, rilettura «Bucket not found» (`bucket_still_present`).
- `--dry-run`: tabella `oggetto | righe | id catturati | PostgREST`, poi esce.
- Niente da togliere su entrambe le fonti → esce 0 **senza consumare** l'autorizzazione.
- Categorie d'errore, ognuna con exit 1: `counter_env`, `counter_target`, `network`, `sql`, `sql_payload`, `sql_contract`, `counter_network`, `counter_http`, `counter_shape`, `storage_network`, `storage_http`, `storage_list`, `storage_list_shape`, `storage_census_disagreement`, `census_disagreement`, `capture_inconsistent`, `cascade_outside`, `census_moved`, `storage_delete`, `delete_short`, `residual_objects`, `residual_rows`, `bucket_delete`, `bucket_still_present`, `authorisation_not_spent`.
- **Solo numeri:** id e path vivono in memoria; i messaggi d'errore di Postgres passano da `redact()` (UUID → `<id>`), quelli dell'API Storage stampano solo il campo `error`, mai il messaggio che puo' citare un path. L'unica scrittura su file e' la marcatura `spent`.

## Verifica

Nessun test runner nel repo. Nessuna chiamata di rete verso alcun progetto Supabase in questo piano, tranne le letture di catalogo di `npm run verify` sul **laboratorio** (sotto).

- Task 1: file presente; `BEGIN;` **0**; `cascade` **0** (ne' istruzioni ne' commenti); `brandwide=209 chiavi=313`; `DROP TABLE IF EXISTS public.production_` **10**; `storage.(objects|buckets)` 8 righe, tutte letture o il `DROP POLICY`/commenti; `DELETE FROM storage` **0**; UUID/email **0**; letterali `'production.manifesto.manage'`, `<> 11`, `<> 20` presenti.
- Task 2: `node --check` → sintassi; senza argomenti ne' env → `RIFIUTO`, `exit=2`; `writeFileSync|appendFileSync|snapshot` → 2 righe (import e marcatura `spent`); `count=exact` 2; `ANY(` 1; `delete_short`/`counter_target`/blocco grant presenti. Provati offline: `--dry-run --apply` → 2; produzione senza autorizzazione → 2; produzione con a capo finale → 2; `--dated` diverso → 2; autorizzazione esaurita → 2; autorizzazione valida senza env di produzione → `counter_env` 1; ref fittizio con URL che non lo nomina → `counter_target` 1.
- Task 3: `node --check scripts/seed-lab-door.mjs` → sintassi; rifiuto della produzione ancora alle righe 77-92, prima di ogni lettura.
- **Grep di CUT-01** (P1+P2 del piano) su `src scripts vercel.json package.json next.config.ts`: **un solo file**, `scripts/purge-production-tools.mjs` (eccezione dichiarata fino al 53-12). La migration sta fuori da quei percorsi ed e' l'eccezione «migration nuove» di CUT-01.
- `npm run build` → **exit 0**.
- `npm run verify` con l'ambiente del laboratorio caricato (`.env.local` poi `.env.lab.local`, URL controllato contro `LAB_PROJECT_REF` e contro il ref di produzione prima di partire): **21 passed, 1 FAILED, 0 REFUSED, 24 contati**. L'unico rosso e' `verify:capabilities`, riconosciuto per forma: «DECLARED RED INTERVAL (phase 53, D-53-03) … closes by applying the migration». `verify:refusal` non eseguito (vietato), `verify:redirects` serve un server.

## Task Commits

1. **Task 2 — script per chiave:** `f001765a` `feat(53-07): purge-production-tools — righe e oggetti per chiave, riconteggio da fonte diversa, solo conteggi`
2. **Residuo del grep (dichiarato):** `45a46f6e` `fix(53-07): verify-capabilities non cita piu' il modulo della guardia d'archivio uscito`
3. **Task 1 + Task 3 — migration e seme insieme:** `0bcc7ab0` `feat(53-07): la rimozione dello schema scritta — migration, atto per chiave, seme del lab`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - residuo di un altro piano] Prosa storica in `scripts/verify-capabilities.mjs:69`**
- **Trovato durante:** Task 3, grep di CUT-01
- **Problema:** una riga di docblock nominava per path il modulo della guardia d'upload dell'archivio, cancellato dal piano 53-01. Il piano 53-05 (proprietario del file) non l'aveva coperta.
- **Correzione:** descritto senza il nome («the archive upload guard under `src/lib/media/` … left in phase 53»); nessuna logica toccata. Commit `fix(53-07)` dichiarato, come prescrive il piano.
- **Commit:** `45a46f6e`

**2. [Rule 2 - correttezza] Controllo in piu' nel `DO` di rilettura**
- Il piano chiedeva `v_lettori` su `pg_policies`. Aggiunto (g): nessuna funzione in `public`/`private` nomina una delle tre chiavi nel corpo — una chiave cancellata sotto una funzione SECURITY DEFINER che la controlla e' lo stesso rifiuto silenzioso di una policy. Oggi nessuna lo fa (le uniche due che nominavano il calendario escono in §4).
- Aggiunta anche la ripartizione per ruolo (11/9/0/0), non solo il totale 20.

**3. [Rule 2 - correttezza] `census_moved` e `capture_inconsistent` nello script**
- Ogni passo ricattura e confronta col censimento: se qualcosa scrive fra il conteggio e l'atto, lo script si ferma invece di cancellare un insieme diverso da quello contato. Il censimento iniziale e' a due fonti anche per le tabelle non vuote (l'analogo lo faceva solo sullo zero).

**4. [Rule 2 - segretezza] `redact()` sugli errori**
- Un errore di Postgres puo' citare una chiave di riga; il referto non porta id (D-53-05, repo pubblico). Gli UUID sono sostituiti prima di stampare; gli errori dell'API Storage stampano solo il campo `error`.

**5. [Commit] Tre commit invece di uno**
- Il piano chiedeva un commit unico per i Task 1-3; l'orchestratore chiede commit per task. Il vincolo sostanziale del piano — **migration e seme nello stesso commit** (T-53-28, Pitfall 9) — e' rispettato in `0bcc7ab0`; lo script, indipendente, sta in `f001765a`; il residuo in un `fix` separato come il piano stesso prescrive.

**6. [Commento] `BEGIN;` nel titolo di una sezione**
- La prima stesura copiava il titolo dell'analogo («E NON C'E' `BEGIN;`»), che faceva fallire il criterio «`BEGIN;` 0 volte». Riformulato «SENZA UN BEGIN ESPLICITO».

## Deferred Issues

- `npm run baseline:container -- --smoke` fallisce su `20260811120000_live_attendance_channel.sql` (schema `realtime` assente dallo shim `scripts/container/auth-shim.sql`): il container usa-e-getta non applica piu' la catena delle migration da agosto. Preesistente, fuori perimetro; da registrare in `deferred-items.md` se la fase lo tiene.

## Threat Flags

Nessuna superficie nuova oltre il registro del piano. T-53-23..28 mitigati come da piano: brand-wide riscritta prima delle chiavi (righe 209 < 313) con `v_lettori` = 0; nessuna propagazione e precondizioni che sollevano; quarantena riletta esattamente 1; nessuna istantanea, solo numeri; rifiuto come prima cosa e autorizzazione consumabile; seme adeguato nello stesso commit.

## Known Stubs

Nessuno.

## Self-Check: PASSED

- FOUND: `supabase/migrations/20261014120000_production_tools_removal.sql`
- FOUND: `scripts/purge-production-tools.mjs`
- FOUND: `scripts/seed-lab-door.mjs` (modificato)
- FOUND: commit `f001765a`, `45a46f6e`, `0bcc7ab0`
