---
phase: 50-via-le-iscrizioni
plan: 02
subsystem: database
tags: [supabase, postgres, rls, migration, management-api, capability-model, gates]

requires:
  - phase: 50-via-le-iscrizioni
    plan: 01
    provides: i due banchi che seminano senza lo stato, le nove misure su due database, i tre nomi dei CHECK letti dal catalogo
provides:
  - "`supabase/migrations/20260921120000_drop_status_and_referral.sql`: lo smontaggio di `status`, `referred_by`, `approved_via` e `requires_approved` in una transazione sola, applicata al LABORATORIO"
  - "il verso invertito del deploy scritto DENTRO la migration — codice prima, lei dopo (D-50-24)"
  - "`handle_new_user` ridefinito nella stessa transazione del `DROP COLUMN`: nessuna finestra in cui non si possa creare un account"
  - "`event_media_insert_staff` e `event_media_quarantine_insert_staff`: il caricamento media per capability di lavoro, non per stato (D-50-03)"
  - "l'ottavo atto `deleted` nel registro (D-50-16), su un `CHECK` che ne porta dieci e non otto"
  - "tre gate meccanici allineati NELLO STESSO COMMIT della cosa che cambiano (D-50-28), voce differita del 50-01 assorbita"
affects: [50-03, 50-04, 50-11, 51]

tech-stack:
  added: []
  patterns:
    - "l'endpoint `POST /database/migrations` avvolge il corpo in UNA transazione — misurato per mutazione, non assunto"
    - "un inventario di dipendenze si rilegge da `pg_proc`/`pg_policies`/`pg_constraint`: i file dicono cosa si e' scritto, il catalogo cosa c'e'"
    - "una funzione `plpgsql` che legge una colonna non e' una dipendenza registrata: il `DROP COLUMN` riesce e lei si rompe al primo richiamo"

key-files:
  created:
    - supabase/migrations/20260921120000_drop_status_and_referral.sql
  modified:
    - scripts/verify-capabilities.mjs
    - scripts/rls-baseline.mjs
    - scripts/rls-baseline-compare.mjs
    - scripts/seed-lab-door.mjs
    - .planning/phases/50-via-le-iscrizioni/deferred-items.md

key-decisions:
  - "Le funzioni da ridefinire sono SEI, non le quattro dell'elenco: `my_access_context(uuid)` e `record_membership_act` non erano in §1.2, e la seconda si sarebbe rotta in silenzio portandosi dietro createAccount"
  - "Quattro policy su `storage.objects` leggevano `profiles.status` per esteso: le ha trovate il laboratorio RIFIUTANDO, non un grep"
  - "Il `CHECK` su `membership_acts.act` porta dieci valori, non otto: nove applicati piu' `deleted`. Con otto si sarebbero tolti `assigned` e `unassigned` da un registro append-only"
  - "`event_media_insert_staff` conserva i due congiunti della fase 35 che la proposta di §3.2 non aveva: riscriverla dalla proposta l'avrebbe ALLARGATA"
  - "`membership.active` perde le quattro concessioni ma NON la chiave: toglierla mentre `CAP.MEMBERSHIP_ACTIVE` vive in TypeScript lascerebbe verify:capabilities rosso, che e' cio' che D-50-28 vieta"
  - "`rls-baseline-compare.mjs` P5 NON si riscrive: quel file confronta due artefatti su disco, non un database, e la stringa e' storia"
  - "`record_membership_act` conserva `p_status` nella firma, accettato e IGNORATO: una firma nuova perde l'ACL e rompe ogni chiamante durante la finestra di deploy"

patterns-established:
  - "Una migration che droppa colonne si applica prima al laboratorio: il suo primo rifiuto e' il risultato che conta"
  - "Un gate che nomina una colonna cancellata si aggiorna nello stesso commit; un gate che nomina un ARTEFATTO storico si annota, non si riscrive"

requirements-completed: [REG-02, REG-03, REG-04, REG-05]

duration: 27min
completed: 2026-09-21
---

# Phase 50 Plan 02: La migration dell'onda 1 Summary

**Sul laboratorio `public.profiles` non ha piu' `status`, `referred_by` ne' `approved_via`; nessuna funzione e nessuna policy li nominano; il trigger crea ancora un profilo e conia ancora il codice di membership; il registro sa rappresentare una cancellazione. La produzione non e' stata toccata.**

## Performance

- **Duration:** ~27 min
- **Started:** 2026-09-21T12:28Z (circa)
- **Completed:** 2026-09-21T12:55Z
- **Tasks:** 3 su 3
- **Files modified:** 6 (1 migration nuova, 4 script, 1 documento)

## Task Commits

1. **Task 1 + Task 2 fusi (D-50-28): la migration e i tre gate** — `219e273` (feat)
2. **Task 3, (a): il rifiuto del laboratorio — quattro policy di storage** — `4babeb1` (fix)
3. **Task 3, (b): `--reset` del banco si fermava su una chiave** — `c606f03` (fix)

> **Perche' i task 1 e 2 sono un commit solo.** D-50-28 dice che i gate meccanici
> si aggiornano **nello stesso commit** della cosa che cambiano, e il prompt di
> esecuzione lo ripete per esteso. Due commit separati avrebbero lasciato, fra
> l'uno e l'altro, un albero in cui `verify:capabilities` interroga una colonna
> che la migration accanto a lui cancella. Un commit.

## L'applicazione al laboratorio

| | |
|---|---|
| **Primo tentativo (RIFIUTATO)** | 2026-09-21 **12:47:28Z** — `400`, `2BP01` |
| **Applicazione riuscita** | 2026-09-21 **12:48:29Z** — `200` |
| **Versione coniata dall'endpoint** | **`20260921124829`** / `drop_status_and_referral` |
| **Nome del file** | `20260921120000_drop_status_and_referral.sql` |
| **Produzione** | **nessuna scrittura, nessuna lettura.** Ogni chiamata di questo piano ha `LAB_PROJECT_REF` verificato diverso dal ref di produzione **prima** del `fetch` |

> **La versione registrata NON e' il timestamp del file**, ed e' la **settima**
> volta su sette. L'endpoint `POST /database/migrations` conia la versione con
> l'istante dell'applicazione: chi cercasse domani questa migration in
> `supabase_migrations.schema_migrations` per il numero del file **non la
> troverebbe**. Dichiarato qui invece di riscoperto, come prescrive
> `49-AUTHORISATION.md`.

### Il primo tentativo e' il risultato che conta

```
Failed to apply database migration: ERROR:  2BP01: cannot drop column status of
table profiles because other objects depend on it
DETAIL:  policy artist_photos_insert_organizer on table storage.objects depends
         on column status of table profiles
         policy artist_photos_update_organizer on table storage.objects …
         policy venue_photos_insert_organizer on table storage.objects …
         policy venue_photos_update_organizer on table storage.objects …
```

**L'intera transazione e' stata annullata: niente e' stato applicato a meta'.**
E' la ragione per cui la procedura passa dal laboratorio prima, e su un
repository **senza PITR** e' la differenza fra un pomeriggio e un incidente.

Quattro policy su `storage.objects` portavano ancora il predicato P3 per esteso
— `role IN ('organizer','master') AND status = 'approved'` — che il collasso
della fase 32 ha sostituito **ovunque tranne che li'**: `20260807010000` ha
riscritto 45 policy, tutte nello schema `public`.

## Accomplishments

- **Sei funzioni, non quattro.** `50-RESEARCH.md` §1.2 ne elenca quattro.
  `pg_proc` sul laboratorio ne ha date **sei**:

  | Funzione | In §1.2? | Cosa sarebbe successo |
  |---|---|---|
  | `handle_new_user()` | si' | — |
  | `my_access_context()` | si' | — |
  | `my_access_context(uuid)` | **no** | il payload per serata avrebbe continuato a promettere una chiave `'status'` |
  | `private.has_capability(text,uuid)` | si' | — |
  | `reconcile_master(text)` | si' | — |
  | `record_membership_act(uuid,text,…)` | **no** | **`42703` al primo richiamo**, e con lei `createAccount` — l'unico modo di creare un account di staff — e `reconcile_master`, che gira a ogni deploy |

  `record_membership_act` e' `plpgsql`: il `DROP COLUMN` **riesce** e la funzione
  si rompe in silenzio. E' esattamente la finestra che questa migration esiste
  per non aprire.

- **Il `CHECK` del registro porta DIECI valori, non otto.** §1.6 dice *«il
  `CHECK` porta ancora i sette valori»*, letto dal testo di `20260808002000`.
  `pg_get_constraintdef` ne conta **nove**: i sette piu' `assigned` e
  `unassigned`, aggiunti da `20260809002000`. Ricrearlo con otto avrebbe
  **tolto due atti dal vocabolario di un registro append-only** — cioe' reso
  irrappresentabile una storia gia' scritta.

- **La policy dei media conserva i due congiunti della fase 35.** La forma
  **applicata** di `event_media_insert_member` ha cinque termini, non i tre di
  §3.2: `20260809004500` ha aggiunto `party_id IS NOT NULL` e
  `party_event_id(party_id) = event_id`. Riscriverla dalla proposta li avrebbe
  **tolti**, cioe' allargata mentre il commit diceva di restringerla.

- **La forma a due argomenti di `has_capability` funziona dentro una policy**, ed
  e' stata scritta: e' l'unica che concede l'`INSERT` al fotografo assegnato a
  quella serata. La nota di chiusura di `20260807010000` avverte che il
  comparatore della fase 32 non l'accetta — quel comparatore era uno strumento di
  quella fase e **non e' fra i gate di `npm run verify`** (verificato su
  `package.json`). Riletta dal catalogo dopo l'applicazione: Postgres la stampa
  come `private.has_capability('media.upload'::text, event_media.party_id)`.

- **L'endpoint delle migration e' transazionale, e lo sappiamo per misura.**
  Sonda alle **12:35:43Z**: `create table private._tx_probe(x int); select 1/0;`
  → `400 … division by zero`, e subito dopo `to_regclass('private._tx_probe')`
  **null**. Per questo la migration non porta un `BEGIN;` esplicito, e nessuna
  delle sei della fase 49 lo porta.

## Le riletture dal catalogo

Tutte eseguite **dopo** l'applicazione, sull'endpoint `/database/query` con
`read_only: true`, mai dalla risposta del `POST`.

### Le colonne — zero su quattro

```sql
select count(*) from information_schema.columns
 where (table_schema='public' and table_name='profiles'
        and column_name in ('status','referred_by','approved_via'))
    or (table_schema='private' and table_name='role_capabilities'
        and column_name='requires_approved')
```

```json
[{"misura":"colonne","n":0}]
```

### Le tre query di `50-RESEARCH.md` §1.5(a)

**(1) la colonna — 0**

```sql
select count(*) from information_schema.columns
 where table_schema='public' and table_name='profiles' and column_name='status'
```
```json
[{"n":0}]
```

**(2) le funzioni — 3 righe, e sono TRE FALSI POSITIVI**

```sql
select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private')
   and pg_get_functiondef(p.oid) ~ '\mprofiles?\M[^;]*\mstatus\M'
```
```json
[{"fn":"my_access_context(uuid)"},{"fn":"venue_for_parties(uuid[])"},{"fn":"my_access_context()"}]
```

> **Due cose, e vanno dette tutte e due invece di dichiarare un verde.**
>
> **(a) La query come scritta non gira su questo database.** Senza
> `and p.prokind = 'f'` fallisce con `42809: "array_agg" is an aggregate
> function` — `pg_get_functiondef` rifiuta gli aggregati. Il filtro e' stato
> aggiunto, ed e' una correzione della query, non un allentamento.
>
> **(b) Le tre righe sono COMMENTI, non codice.** `pg_get_functiondef` restituisce
> il corpo **con i commenti dentro**, e la regex — `profiles`, poi qualunque cosa
> senza punto e virgola, poi `status` — attraversa una riga di prosa italiana
> come attraverserebbe un predicato. In `my_access_context` la riga e'
> *«La chiave 'status' STAVA QUI»*; in `venue_for_parties` e' un commento della
> fase 49 su una definizione **superata**.
>
> **La forma che misura il codice invece della prosa** spoglia i commenti prima
> di applicare la regex, ed e' il precedente che questo repository ha gia'
> scritto — `verify-capabilities.mjs` spoglia i commenti prima di contare i
> riferimenti a `CAP.`, perche' *«una chiave nominata solo in un commento non e'
> un chiamante»*:
>
> ```sql
> select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
>  where n.nspname in ('public','private') and p.prokind = 'f'
>    and regexp_replace(pg_get_functiondef(p.oid), '--[^\n]*', '', 'g')
>        ~ '\mprofiles?\M[^;]*\mstatus\M'
> ```
> ```json
> []
> ```
>
> **Zero.** E la controprova, che cerca `p.status` / `profiles.status` nel codice
> spogliato, restituisce anch'essa `[]`. **Il VERIFICATION di REG-05 usi la forma
> spogliata**, o il gate sara' rosso per una prosa che lo descrive.

**(3) le policy — 0**

```sql
select schemaname, tablename, policyname from pg_policies
 where coalesce(qual,'') || coalesce(with_check,'') ~ 'get_user_status|requires_approved'
```
```json
[]
```

> **Questa terza query era gia' cieca PRIMA della migration, e va detto.** Le
> quattro policy di `storage.objects` che hanno fatto fallire il primo tentativo
> non nominano ne' `get_user_status` ne' `requires_approved`: interrogano
> `public.profiles` direttamente. **Avrebbe risposto zero anche mentre
> esistevano.** La query che le trova e':
>
> ```sql
> select schemaname, tablename, policyname from pg_policies
>  where (coalesce(qual,'') || coalesce(with_check,'')) like '%profiles%'
>    and (coalesce(qual,'') || coalesce(with_check,'')) like '%status%'
> ```
> ```json
> []
> ```
>
> Oggi zero; prima della migration avrebbe restituito **cinque** righe. E' la
> forma da mettere nel VERIFICATION.

### `pg_policies` — le policy riscritte, alla lettera

**`profiles_update_own`** — `with_check`, riletto dal catalogo:

```
((( SELECT auth.uid() AS uid) = id) AND (role = ( SELECT profiles_1.role
   FROM profiles profiles_1
  WHERE (profiles_1.id = ( SELECT auth.uid() AS uid)))))
```

**Contiene `role`. NON contiene `status`.** La guardia anti-escalation e' intatta;
e' caduto solo il congiunto sullo stato — T-50-05 mitigata, e provata dal
catalogo e non dal file.

| Policy | Esito |
|---|---|
| `event_media_insert_staff` | **esiste**, `{authenticated}`, quattro congiunti: `auth.uid() = uploaded_by`, `staff.manage OR media.upload(party_id)`, `party_id IS NOT NULL`, `party_event_id(party_id) = event_id` |
| `event_media_quarantine_insert_staff` | **esiste**, `bucket_id = 'event-media-quarantine' AND staff.manage` |
| `event_media_insert_member` | **assente** |
| `rsvps_insert_approved` | **assente**; `rsvps_select_own`, `rsvps_select_admin`, `rsvps_delete_own` **restano** |
| `artist_photos_*` / `venue_photos_*` (4) | **esistono**, con il solo congiunto sul ruolo: `profiles.role = ANY (ARRAY['organizer','master'])` |

### `pg_proc` — `proacl` identico su tutte e sei

| Funzione | `proacl` identico | `prosecdef` | `proconfig` |
|---|---|---|---|
| `handle_new_user()` | **si'** | si' | si' |
| `my_access_context()` | **si'** | si' | si' |
| `my_access_context(uuid)` | **si'** | si' | si' |
| `private.has_capability(text,uuid)` | **si'** | si' | si' |
| `reconcile_master(text)` | **si'** | si' | si' |
| `record_membership_act(uuid,…)` | **si'** | si' | si' |
| `get_user_status()` | **ASSENTE ORA** | — | — |

`CREATE OR REPLACE` su firma identica conserva l'ACL: misurato prima e dopo, sei
su sei. E la conferma piu' netta e' arrivata da un rifiuto — un tentativo di
chiamare `reconcile_master` dall'endpoint della Management API e' tornato
`42501: permission denied for function reconcile_master`, perche' e' concessa al
solo `service_role`, esattamente come prima.

### `pg_constraint`

```
profiles_role_check              CHECK (role = ANY (ARRAY['master','organizer','staff','member']))
membership_acts_act_check        CHECK (act = ANY (ARRAY['created','approved','rejected','promoted',
                                   'demoted','deactivated','reactivated','assigned','unassigned','deleted']))
membership_acts_actor_attributed CHECK (…)
membership_acts_actor_kind_check CHECK (…)
```

`profiles_role_implies_approved`, `profiles_status_check` e
`profiles_approved_via_check` sono **assenti**. `profiles_role_check` resta.
Il `CHECK` degli atti porta **`deleted`**, ed e' il decimo.

### Il catalogo delle capability

```json
[{"grants_membership_active":0,"chiave_in_catalogo":1,"righe_concessione":32,"chiavi":17}]
```

Nessun ruolo tiene piu' `membership.active`; la chiave resta (vedi deviazione 3).

## La prova di volo, prima di spendere l'applicazione

I corpi delle due funzioni `language sql` sono stati eseguiti come `select`
autonomi in sola lettura, prima del `POST`: entrambi analizzano, tipizzano e
risolvono ogni nome, e il payload di `my_access_context` torna senza la chiave
`'status'`. Per i corpi `plpgsql` sono stati provati in sola lettura i loro
`SELECT` e la lista di colonne dei loro `INSERT` — il resto lo controlla
Postgres alla creazione, **dentro la transazione**, quindi un errore di sintassi
sarebbe costato un rollback e non un database a meta'.

## Il banco, riseminato sopra la migration

```
--reset  → 16 tabelle azzerate, 6/6 account rimossi
--seed   → serata, serata segreta, serata gratuita, biglietto, 4 account
--verify → 12 righe radice presenti, contate da PostgREST — non dall'endpoint SQL
```

**I quattro profili nascono dal trigger ridefinito**, e portano tutti un
`membership_code` di 14 caratteri con prefisso `RSN-` (4 + 10): il conio
indurito a fine fase 49 e' intatto.

E il registro e' stato **esercitato davvero**, non dedotto: una chiamata a
`record_membership_act` con `p_status: "approved"` ha restituito un id e scritto

```json
{"act":"created","subject_label":"RSN-L9DGGHUJ77","actor_kind":"system",
 "role_before":"member","role_after":"member",
 "status_before":null,"status_after":null,
 "note":"prova 50-02: p_status accettato e ignorato"}
```

Cioe': il parametro e' **accettato e ignorato**, la coppia dello stato e' nulla
come la migration dichiara, e `subject_label` porta **il codice di membership,
mai un indirizzo**.

## I tre gate, nello stesso commit

- **`scripts/verify-capabilities.mjs`** — la query perde la colonna
  (`:1044-1047`), `ROLE_GRANTS` dichiara `'GRANTED'` / `'REFUSED'` invece di un
  booleano, e i marcatori sono **stringhe dentro il literal** perche'
  `ROLE_GRANTS` e' valutato **sopra** le `const` che li nominano (`:672-687`):
  nominarli li' leggerebbe un binding nella sua zona morta temporale.
  I totali passano da **68/36/32 a 68/32/36**, ricamminando la tabella
  (`:689-701`). Corsa contro il laboratorio migrato: **5/5 verde, 0 warning**.
- **`scripts/rls-baseline.mjs`** — **la voce differita del 50-01 e' assorbita.**
  `PERSONA_STATUSES` rimossa, `PERSONA_LABELS` porta i quattro ruoli piu' `anon`
  e `authenticated/no-profile` (`:665-670`), `PERSONA_SQL` non seleziona piu' la
  colonna (`:727-732`) e `resolvePersonas` etichetta per ruolo (`:761`). Le
  personas passano da quattordici a sei, e cio' che si perde — la coppia
  `organizer/pending`, l'unica che distingueva P1 da P3 — e' **dichiarato nel
  docblock**: non e' una riga che la matrice smette di coprire, e' una riga che
  nessun database puo' piu' contenere.
- **`scripts/rls-baseline-compare.mjs`** — `P5` **non e' stata riscritta**, ed e'
  una decisione. Vedi deviazione 4.

`git diff --name-only` non porta **un solo file sotto `src/`**, come il piano
richiede, e `scripts/verify-no-header-identity.mjs` non compare nel diff.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Due funzioni fuori dall'elenco, e una si sarebbe rotta in silenzio**

- **Found during:** Task 1, interrogando `pg_proc` prima di scrivere
- **Issue:** Il piano nomina quattro funzioni. Il catalogo ne da' sei:
  `my_access_context(uuid)` e `record_membership_act(uuid,text,…)`. La seconda e'
  `plpgsql` e legge **e scrive** `profiles.status`: dopo il `DROP COLUMN` avrebbe
  sollevato `42703` al primo richiamo, dentro una `SECURITY DEFINER` che scrive
  il ruolo. I suoi due richiami sono `createAccount` — l'unico modo di creare un
  account di staff — e `reconcile_master`, che gira a ogni deploy.
- **Fix:** Entrambe ridefinite nella stessa transazione. `record_membership_act`
  **conserva la firma** e con essa `p_status`, accettato e ignorato: toglierlo
  cambierebbe la firma, perderebbe l'ACL e romperebbe ogni chiamante TypeScript
  **durante la finestra in cui il codice e' ancora quello vecchio** — la finestra
  che D-50-24 esiste per non aprire. `status_before`/`status_after` vanno a
  `NULL`, che e' la semantica gia' scritta in `20260808002000:245`.
- **Verification:** `pg_proc` le mostra presenti con `proacl` identico;
  `record_membership_act` esercitata sul laboratorio, riga di registro riletta.
- **Committed in:** `219e273`

**2. [Rule 1 - Bug] Quattro policy di storage, e il `CHECK` del registro con due atti di troppo da togliere**

- **Found during:** Task 3, primo tentativo di applicazione (12:47:28Z)
- **Issue:** (a) `artist_photos_insert/update_organizer` e
  `venue_photos_insert/update_organizer` su `storage.objects` leggono
  `profiles.status` per esteso e **bloccano** il `DROP COLUMN`; nessun inventario
  le aveva, e la terza query di §1.5(a) non le vede per costruzione.
  (b) Il `CHECK` **applicato** su `membership_acts.act` porta **nove** valori, non
  i sette che §1.6 riporta dal testo della migration: `assigned` e `unassigned`
  sono della fase 35. Ricrearlo con otto li avrebbe tolti.
- **Fix:** (a) Le quattro policy droppate e ricreate **meno il solo congiunto
  sullo stato**; resta `role = ANY (ARRAY['organizer','master'])`, e la portata non
  si muove perche' il `CHECK role-implies-approved` rendeva ogni organizer e ogni
  master approvato per regola di database. (b) Il `CHECK` ricreato con **dieci**
  valori: i nove applicati piu' `deleted`.
- **Verification:** la migration applica; `pg_policies` mostra le quattro senza
  `status`; `pg_get_constraintdef` mostra i dieci valori.
- **Committed in:** `4babeb1`

**3. [Rule 3 - Blocking] `--reset` del banco si fermava, e cancellava account in silenzio**

- **Found during:** Task 3, risemina
- **Issue:** `node scripts/seed-lab-door.mjs --reset` falliva con
  `23503 … ticket_orders_tier_id_fkey`. L'elenco delle tabelle aveva sette voci e
  non nominava `ticket_orders` (fase 49, `ON DELETE RESTRICT`). **E il difetto
  peggiore era il secondo:** `door_scan_events` (14 righe) e `attendances` (2)
  trattengono un utente Auth per `operator_id` e `checked_in_by`, e il ciclo di
  cancellazione degli account **non guardava l'esito** — contava tutti come
  rimossi e stampava «azzerato» su un laboratorio ancora popolato.
- **Fix:** Elenco riderivato da `pg_constraint` filtrando `NO ACTION`/`RESTRICT`,
  sedici tabelle in ordine figlio→padre; l'esito delle cancellazioni Auth si
  guarda, i falliti si nominano **per id, mai per indirizzo**, e lo script esce 1.
- **Verification:** `--reset` 16 tabelle, **6/6 account**; `--seed` verde;
  `--verify` 12 righe radice da PostgREST.
- **Committed in:** `c606f03`

### Scostamenti dai criteri di accettazione, dichiarati

**4. `membership.active`: cancellate le CONCESSIONI, non la chiave**

Il piano (decisione 1 e criterio *«`grep -c "membership.active" scripts/verify-capabilities.mjs` restituisce 0»*) chiede di cancellare la chiave dal catalogo.
**Non e' eseguibile dentro questo piano**, e la ragione e' meccanica:
`verify-capabilities.mjs` confronta `private.capabilities` con l'oggetto `CAP` di
`src/lib/capabilities/keys.ts` **in entrambe le direzioni** — controllo 0
(`EXPECTED_KEY_COUNT`, asserito su TS **e** su DB con una costante sola),
controllo 1 e controllo 3. Togliere la riga di catalogo mentre
`CAP.MEMBERSHIP_ACTIVE` vive in TypeScript rende quel gate **rosso**, e renderlo
verde richiederebbe di toccare `keys.ts`, `capability-routes.ts` (il `Record` e'
totale: senza la voce `npm run build` fallisce) e `may-upload.ts` — cioe'
esattamente cio' che la sezione `<verification>` di questo piano vieta
(*«`git diff --stat` non mostra alcuna modifica sotto `src/`»*).

**Fatto invece:** le **quattro concessioni** cancellate — nessun ruolo tiene piu'
la chiave, quindi `has_capability('membership.active')` risponde `false` a
chiunque, e REG-05 chiude **strutturalmente** lo stesso. La chiave e le sue righe
in `ROLE_GRANTS` (ora `'REFUSED'`) escono insieme alla costante TypeScript, nel
piano che smonta le superfici — che e' la lettura corretta di D-50-28.
Registrato in `deferred-items.md` con l'elenco esatto dei cinque punti da
toccare. Conseguenza: `EXPECTED_PAIR_COUNT` resta **68** (4 × 17) invece di
cambiare, e il commento accanto dice da dove viene.

**5. `rls-baseline-compare.mjs`: P5 annotata, non riscritta**

Il piano chiede di aggiornare il predicato `get_user_status() = 'approved'` *«o
la linea di base descrivera' un database che non esiste»*.
**Letto il file, la premessa non regge:** quello script **non interroga un
database**. Apre due artefatti su disco (`--before` / `--after`) e giudica un
movimento fra loro; `P5` e' la forma **esatta** con cui `pg_policies` stampava
quel predicato nella linea di base B1 **catturata prima della fase 32**, cioe'
un database che non esiste piu' dal 2026-08-07 — ben prima di questa fase.
Riscriverla per assomigliare al database di oggi non la renderebbe piu' vera:
renderebbe il comparatore **incapace di spiegare le righe che esiste per
spiegare**, e ogni policy che portava P5 tornerebbe `predicate_unexplained`.

**Fatto invece:** la stringa resta, con accanto la data e la migration che l'hanno
resa storia, e la constatazione che **nessuna cattura nuova puo' contenerla** —
entrambi i capi della trasformazione sono stati cancellati. Vale la regola delle
migration passate: sono il verbale di cio' che e' successo.
Conseguenza: `grep -c "get_user_status" scripts/rls-baseline-compare.mjs` resta 1.

**6. Il criterio `membership_code` fuori dai commenti = 0 e' auto-contraddittorio**

Il criterio chiede che la migration non nomini `membership_code` fuori dai
commenti. Il **task 1 dello stesso piano** ordina di ridefinire `handle_new_user`,
e ridefinire una funzione significa riscriverne il corpo per intero — corpo che
**conia** il `membership_code` e lo nomina sette volte. I due non possono essere
veri insieme.

**Fatto invece:** l'intento e' stato verificato nella forma che si puo' verificare —
la migration non contiene alcun `ALTER`, `DROP` o `UPDATE` che tocchi
`membership_code`, e il blocco di conio e' riportato **identico** a
`20260908120000` (stesso alfabeto, stesso `gen_random_bytes(10)`, stessi cinque
tentativi sulla sola collisione di `profiles_membership_code_key`). Provato sul
banco: i quattro profili seminati portano un codice `RSN-` di 14 caratteri.

### Task 1 e Task 2 in un commit solo

Richiesto da D-50-28 e dal prompt d'esecuzione. Vedi il riquadro in *Task Commits*.

---

**Total deviations:** 3 auto-fixed (1 Rule 1, 1 Rule 2, 1 Rule 3) + 3 scostamenti
dichiarati dai criteri di accettazione + 1 fusione di commit.
**Impact on plan:** Nessuno scostamento di perimetro. Le tre correzioni
automatiche **allargano cio' che la migration deve smontare**, non cio' che il
piano fa; i tre scostamenti sono criteri che il piano non poteva soddisfare
insieme ai propri vincoli, e ognuno e' chiuso con la misura che lo sostituisce.

## Issues Encountered

- **La query §1.5(a) sulle funzioni non gira come scritta.** Senza
  `and p.prokind = 'f'` fallisce con `42809`: `pg_get_functiondef` rifiuta gli
  aggregati, e questo database ne ha. Aggiunto il filtro.
- **`verify-capabilities.mjs` stampa `measured against: production` qualunque sia
  il bersaglio.** E' una stringa cablata (`:1508`): la corsa di questo piano era
  sul **laboratorio**, non sulla produzione. Un'etichetta che mente sul bersaglio
  di una misura e' il tipo di riga che `meta-gates.md` chiama peggiore di una riga
  assente. **Non corretta qui** — e' fuori dal perimetro del piano e non e' un
  difetto introdotto da questa onda — ma va nominata.
- **`npm run verify` chiude con due rossi, entrambi PRE-ESISTENTI**
  (`verify:venue-surfaces`, `verify:touch-targets`), su file sotto `src/` che
  questo piano non tocca. Registrati in `deferred-items.md`. Il primo e' su un
  percorso di rivelazione e **non e' debito estetico**.
- **Un `git stash -u` eseguito per errore**, subito rimesso con `git stash pop`:
  l'albero e' tornato identico, nessuna perdita (le modifiche pre-esistenti a
  `.claude/` e la sezione 2b della migration, non ancora committata, sono
  tornate tutte). E' un'operazione che
  `.claude/`-nessuno a parte — **il protocollo d'esecuzione vieta**, ed e'
  registrato qui perche' un errore recuperato senza traccia e' un errore che si
  ripete.

## User Setup Required

Nessuna. Il piano non installa pacchetti (T-50-SC: nessun checkpoint di
legittimita' necessario) e non chiede configurazione esterna.

## Next Phase Readiness

- **Per il piano che smonta le superfici (codice):** la migration e' gia' scritta
  e provata; il codice deve smettere di leggere `status`, `referred_by`,
  `approved_via` e la chiave `'status'` del payload di `my_access_context` —
  **entrambi i sovraccarichi**. E deve smettere di passare `p_status` a
  `record_membership_act`, che ora lo ignora.
- **Per il piano 50-11 (produzione):** la migration e' **la stessa**, e il verso
  e' scritto dentro di lei: **dopo** il deploy del codice. L'autorizzazione datata
  dichiara zero cancellazioni di account (50-MEASURES) e **una** migration.
  Aspettarsi una versione coniata diversa dal nome del file, per l'ottava volta.
- **Per il VERIFICATION di REG-05:** usare le due forme corrette misurate qui — la
  query sulle funzioni **spogliata dei commenti** e la query sulle policy che
  cerca `profiles` **e** `status`, non `get_user_status|requires_approved`. Le
  versioni di §1.5(a) restituiscono rispettivamente tre falsi positivi e uno zero
  che era cieco anche prima.
- **Debito dichiarato:** `membership.card.view` e' *«qualunque account»* fino alla
  fase 51; la chiave `membership.active` esce con `CAP.MEMBERSHIP_ACTIVE`; la
  policy di quarantena e' **piu' stretta** della tabella e rifiuta il fotografo
  assegnato — dichiarato in commento dentro la migration.

---
*Phase: 50-via-le-iscrizioni*
*Completed: 2026-09-21*
