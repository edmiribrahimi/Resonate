---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 05
subsystem: supabase-data
tags: [catalogo, migration, pg_constraint, pg_proc, attendances, sola-lettura]

requires:
  - "laboratorio permanente attivo (.planning/v1.6-LAB-DESIGN.md)"
  - "SUPABASE_ACCESS_TOKEN e LAB_PROJECT_REF nei file d'ambiente del checkout principale"
provides:
  - "51-CATALOG.md — gli oggetti veri che le due migration della fase devono toccare"
  - "i conteggi di public.attendances da rimettere davanti al proprietario (51-13)"
  - "la linea di base dell'ACL di membership_acts, contro cui rileggerla dopo il RENAME"
affects:
  - "51-08-PLAN.md (migration del ruolo)"
  - "51-12-PLAN.md (migration del codice socio e del registro, e l'atto su attendances)"
  - "51-13-PLAN.md (51-AUTHORISATION.md)"

tech-stack:
  added: []
  patterns:
    - "letture di catalogo via Management API /database/query con read_only: true"
    - "commenti spogliati con regexp_replace prima del confronto sui corpi di funzione (D-50-02)"
    - "cascata interrogata in DUE direzioni separate: confrelid e conrelid"

key-files:
  created:
    - ".planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-CATALOG.md"
  modified: []

decisions:
  - "L'assunzione A5 di 51-RESEARCH.md e' SMENTITA: reconcile_master(text) porta il letterale 'member' e va ridefinita nella migration del ruolo"
  - "information_schema.role_table_grants e' cieca dal Management API: l'ACL si legge da pg_class.relacl con aclexplode"
  - "D-51-04 non ha soggetti: al proprietario va il numero zero, non una richiesta di autorizzazione"

metrics:
  duration: "~25 min"
  completed: 2026-09-22
---

# Fase 51 Piano 05: Il catalogo interrogato prima della migration — Summary

Interrogati laboratorio e produzione **in sola lettura** prima che esista una
riga di migration: l'assunzione A5 e' smentita, `membership_acts` porta sette
vincoli col prefisso invece dei due in elenco, esiste un trigger su `profiles`
che nessun documento di fase nominava, e `public.attendances` e' **vuota su
entrambi i progetti**.

## Che cosa e' stato fatto

Tre letture di catalogo, tutte via
`POST /v1/projects/{ref}/database/query` con `read_only: true`, trascritte in
`.planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-CATALOG.md`
(1096 righe) con **la query accanto a ogni numero e l'ora UTC di ciascuna
lettura**.

| Task | Oggetto | Commit |
|---|---|---|
| 1 | Cosa nomina il ruolo: vincoli, funzioni, policy, `DEFAULT`, conteggi | `2faba06` |
| 2 | Cosa nomina il codice socio e il registro degli atti | `772ab17` |
| 3 | `attendances`: conteggi per provenienza e cascata, lab **e** produzione | `805512c` |

## Cosa il catalogo ha smentito

### L'assunzione A5 e' falsa — ed e' la scoperta che costa di piu' se resta ignota

`51-RESEARCH.md:388` affermava, in grassetto, che **nessuna funzione viva**
contiene il letterale `'member'` fuori da `handle_new_user`. Il catalogo ne trova
**due**: la seconda e' `public.reconcile_master(p_email text)` — riga 103 del
corpo spogliato dei commenti, `p_role => 'member'` passato a
`record_membership_act` — ed e' la funzione che **gira a ogni deploy**.

Non ridefinirla significa incidere nel registro degli atti un valore di ruolo che
non esiste piu', **senza errore**, perche' `role_after` e' `text` senza `CHECK`.
E' esattamente la forma di fallimento che `meta-gates.md` vieta.

### Un trigger che nessun documento di fase nominava

`profiles_release_expired_assignments`, `BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW WHEN (old.role IS DISTINCT FROM new.role)`, chiama
`release_expired_assignee_roles(OLD.id)` che **scrive su
`public.party_assignments`**.

L'`UPDATE` del ruolo della migration di D-51-06 lo fa scattare una volta per
riga. **Misurato: zero righe verrebbero toccate** oggi, su lab e su produzione —
ma e' un percorso di scrittura non dichiarato, e il numero e' di oggi.

Non era emerso dalle ricerche per letterale perche' il suo corpo non nomina
`member` ne' alcun oggetto di membership: si trova **solo** interrogando
`pg_trigger`.

### `membership_acts` porta sette vincoli col prefisso, non due

`51-RESEARCH.md:459-468` ne elencava due da rinominare. Il catalogo: **3 `CHECK`
+ 3 `FOREIGN KEY` + 1 `PRIMARY KEY`**, piu' **tre** indici invece di due (il
terzo e' quello della chiave primaria). `ALTER TABLE … RENAME TO` non ne muove
nessuno (S6).

### Il numero che la fase 50 sbaglio' questa volta torna

Quattro funzioni previste per il codice socio e il registro, **quattro trovate**:
`handle_new_user`, `reconcile_master`, `record_membership_act`,
`record_party_assignment_act` — tutte `plpgsql`, tutte `SECURITY DEFINER` con
`search_path=""`.

### `membership_acts` non ha una colonna `role`

Scoperto perche' una query e' **fallita** (`42703`). `p_role` atterra in
`role_after`. E `status_before` / `status_after` sono sopravvissute alla fase 50:
**2 righe su 2 in produzione le portano valorizzate**.

## Il numero che cambia il piano 51-13

```
public.attendances — laboratorio 13:42:29Z · produzione 13:42:35Z
  da_porta  (party_id IS NOT NULL)   0   ·   0
  pre_porta (party_id IS NULL)       0   ·   0
  totale                             0   ·   0
```

**D-51-04 autorizza una cancellazione che non ha soggetti, e la seconda domanda —
il residuo pre-porta — non ne ha nemmeno lei.** E' la stessa situazione che
`50-AUTHORISATION.md` §1.0 ha gia' dichiarato invece di lasciarla scoprire a
meta' runbook: **una decisione senza soggetti non si esegue.**

Al proprietario va **il numero**, non una richiesta di autorizzazione:
un'autorizzazione e' un atto che si consuma una volta, e chiederla per cancellare
nulla la spende per nulla.

**D-51-14 non decade.** Svuotare non e' togliere: la tabella, le sue 2 policy, i
suoi 5 vincoli e i suoi 4 indici esistono comunque e vanno via con una migration.
Che sia gia' vuota toglie dal percorso la parte irreversibile.

**Il numero e' di oggi.** L'unico scrittore vivo —
`api/membership/verify/route.ts:528` — esiste ancora: una scansione socio fra oggi
e il giorno dell'atto scrive una riga. §3e del catalogo dichiara **quali query si
rifanno e in che ordine**.

## Deviazioni dal piano

### `[Rule 3 - Blocking]` `information_schema.role_table_grants` e' cieca dal Management API

- **Trovato durante:** Task 2, lettura (e)
- **Problema:** il piano chiedeva quella vista per nome. Torna **zero righe** —
  non perche' non ci siano privilegi, ma perche' mostra solo le concessioni in cui
  il ruolo corrente e' concedente, beneficiario o membro del beneficiario, e la
  query gira come `supabase_read_only_user`.
- **Perche' contava:** fermarsi li' avrebbe prodotto la conclusione **opposta a
  quella vera** — «i privilegi sono gia' tutti revocati» — su una tabella la cui
  unica difesa contro il proprio scrittore e' esattamente un `REVOKE`.
- **Fatto:** l'ACL letta da `pg_class.relacl` con `aclexplode`. Risultato:
  `service_role` e' l'unico dei quattro ruoli senza `INSERT`/`UPDATE`/`DELETE` su
  `membership_acts` — il `REVOKE` di `20260808005000` e' arrivato ed e' misurato.
  La query cieca resta scritta nel catalogo **con la ragione per cui non va usata**.
- **File:** `51-CATALOG.md` §2e
- **Commit:** `772ab17`

### `[Rule 2 - Critical]` Conteggi di produzione anche dove il piano chiedeva il solo laboratorio

- **Trovato durante:** Task 1, lettura (e)
- **Ragione:** il piano limitava (e) al laboratorio, ma l'`UPDATE` del ruolo gira
  **in produzione**, e quante righe tocca e' una precondizione della migration,
  non una curiosita'. Letto anche li', in sola lettura.
- **Cosa ha prodotto:** in produzione **2 profili** e **1 concessione** da
  aggiornare — e **nessun profilo `staff`**, che il laboratorio invece ha.
- **Commit:** `2faba06`

### `[Rule 2 - Critical]` Interrogati i trigger, che il piano non chiedeva

- **Trovato durante:** Task 2
- **Ragione:** le letture per letterale (`pg_proc`, `pg_policies`, `pg_constraint`)
  **non possono** trovare un trigger il cui corpo non nomina il letterale cercato.
  `ai-engineering.md` chiede che una cascata sia enumerata leggendo i vincoli
  invece che ricordata; un trigger e' un percorso di scrittura della stessa natura
  e va enumerato allo stesso modo.
- **Cosa ha prodotto:** `profiles_release_expired_assignments`, sopra.
- **Commit:** `772ab17`

## Gate di autenticazione

Nessuno. `SUPABASE_ACCESS_TOKEN` e `LAB_PROJECT_REF` erano gia' nei file
d'ambiente del checkout principale, caricati come fa `scripts/dev-lab.sh`
(`.env.local`, poi `.env.lab.local` che vince). Il laboratorio era
**`ACTIVE_HEALTHY`** al primo contatto (13:27:30Z): nessun NXDOMAIN, nessun
ripristino necessario.

## Dichiarazione di sola lettura (T-51-18)

**Zero scritture su entrambi i progetti.** Ogni chiamata e' passata da
`POST /v1/projects/{ref}/database/query` con **`read_only: true`** nel corpo.
L'endpoint `POST /v1/projects/{ref}/database/migrations` **non e' stato chiamato**.
Nessun `INSERT`, `UPDATE`, `DELETE` o DDL. Nessun pacchetto installato;
`package.json` non e' cambiato (T-51-SC).

Lo strumento di lettura vive nello scratchpad di sessione, **non nel repo**, e
porta il rifiuto del ref di produzione come prima riga eseguita dopo il
caricamento dell'ambiente — la regola di `meta-gates.md` per gli script di
laboratorio. Non e' stato committato perche' `files_modified` di questo piano e'
il solo `51-CATALOG.md`.

## Riservatezza (T-51-21)

`51-CATALOG.md` contiene **nomi di oggetti di schema e conteggi**, e nient'altro.
Verificato meccanicamente contro i valori veri caricati dall'ambiente: **zero
occorrenze** di `LAB_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`,
`LAB_SUPABASE_SERVICE_ROLE_KEY`, `LAB_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`.
Nessuna riga di dati, nessun indirizzo email, nessun identificativo di persona:
solo ruoli e numeri.

## Cosa deve leggere chi viene dopo

| Piano | Sezione da leggere prima di scrivere |
|---|---|
| **51-08** (migration del ruolo) | §1a (due vincoli per nome, due da non toccare), §1b (**ridefinire anche `reconcile_master`**), §1d (l'ordine `DEFAULT` ↔ `CHECK`), §1e (2 profili, 1 concessione; e **staff resta a zero capability**), §2g (il trigger) |
| **51-12** (codice socio e registro) | §2a (quattro funzioni, e i due chiamanti che non seguono il `RENAME`), §2b (**sette vincoli, non due**), §2c (tre indici), §2e (l'ACL come linea di base), §2f (`NOT NULL`, e una sola dipendenza registrata) |
| **51-13** (`51-AUTHORISATION.md`) | §3a (**zero righe**), §3c (l'istantanea e' una tabella sola e vuota), §3e (le query da rifare il giorno dell'atto) |
| chiunque muova `verify-capabilities.mjs` | §1e — i quattro numeri, e la riga di storia che deve dire **perche' `staff` resta senza concessioni** |

## Debito dichiarato, non raccolto

Tre cose misurate che **non sono materia di questa fase** e che si segnano perche'
chi le incontrera' le trovi con il numero davanti:

1. **`email_deliveries_category_check`** ammette ancora `member_approved`,
   `member_reactivated`, `member_rejected` — tre categorie di un flusso che la
   fase 50 ha rimosso. Toglierle significa decidere cosa fare delle righe storiche
   che le portano.
2. **`membership_acts.status_before` / `status_after`** sono sopravvissute alla
   rimozione di `profiles.status`: **2 righe su 2 in produzione** le portano
   valorizzate.
3. **`attendances_checked_in_by_fkey`** e' l'unica chiave esterna senza azione
   `ON DELETE`: finche' esistono righe in `attendances`, quell'utente non si puo'
   cancellare da `auth.users`. Sparisce con la tabella (D-51-14) — e va saputo
   dalla fase che raccogliera' la cancellazione self-service.

## Self-Check: PASSED

- `FOUND:` `.planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-CATALOG.md` (1096 righe)
- `FOUND:` commit `2faba06` — Task 1
- `FOUND:` commit `772ab17` — Task 2
- `FOUND:` commit `805512c` — Task 3
- Verifiche automatiche dei tre task: `pg_constraint` ✔ · `pg_proc` ✔ ·
  `pg_policies` ✔ · `record_membership_act` ✔ · `role_table_grants` ✔ ·
  `da_porta` ✔ · `confrelid` ✔ · `produzione` ✔
- Nessuna modifica a `STATE.md` ne' a `ROADMAP.md` — li scrive l'orchestratore.
