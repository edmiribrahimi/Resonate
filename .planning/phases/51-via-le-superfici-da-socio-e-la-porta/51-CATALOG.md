# Fase 51 — Il catalogo, interrogato prima che esista una migration

**Letto il:** 2026-09-22
**Bersagli:** laboratorio (schema e conteggi) e produzione (conteggi soltanto)
**Modo:** `POST /v1/projects/{ref}/database/query` con `read_only: true`.
**Zero scritture** su entrambi i progetti: l'endpoint `database/migrations` non
e' stato chiamato in questo piano.

---

## Perche' questo file esiste

`20260921120000_drop_status_and_referral.sql:94-113` ha scritto la lezione dentro
il proprio corpo: *«Un elenco letto dai file trova cio' che una migration ha
scritto; solo il catalogo trova cio' che c'e'»*. Quell'elenco diceva quattro
funzioni; il catalogo ne ha date **sei**, e la piu' grave delle due mancanti era
`plpgsql`, cioe' una dipendenza **non registrata**: il `DROP COLUMN` sarebbe
riuscito e la funzione si sarebbe rotta in silenzio.

Gli elenchi di `51-RESEARCH.md` §4.2, §4.4 e §4.5 sono **letti dai file**. Qui si
misura. Dove il catalogo e l'elenco divergono, **vince il catalogo**, e la
divergenza e' scritta invece che corretta in silenzio.

**Una convenzione di lettura.** Ogni numero di questo file porta accanto la
query che lo ha prodotto e l'ora UTC della lettura. Un numero senza la sua query
non e' una misura: e' un ricordo.

**Cosa NON entra in questo file.** Il ref del laboratorio, qualunque chiave,
qualunque riga di dati, qualunque identificativo di persona. `.planning/` e' un
repository pubblico (`ai-engineering.md`, gate *la pianificazione e' pubblica*):
qui stanno nomi di oggetti di schema e conteggi, e nient'altro.

---

# 1. Cosa nomina il ruolo

## 1a — I vincoli `CHECK` che nominano `member`

**Letto sul laboratorio, 2026-09-22 13:28:06Z.**

```sql
select n.nspname                        as schema,
       c.conrelid::regclass::text       as tabella,
       c.conname,
       c.contype,
       pg_get_constraintdef(c.oid)      as definizione
from   pg_constraint c
join   pg_namespace  n on n.oid = c.connamespace
where  c.contype = 'c'
  and  pg_get_constraintdef(c.oid) ilike '%member%'
order  by 1, 2, 3;
```

**Quattro righe, non due.**

| Schema | Tabella | `conname` | Definizione | Tocca il ruolo? |
|---|---|---|---|---|
| `private` | `private.role_capabilities` | `role_capabilities_role_check` | `CHECK ((role = ANY (ARRAY['master'::text, 'organizer'::text, 'staff'::text, 'member'::text])))` | **SI — da riscrivere** |
| `public` | `profiles` | `profiles_role_check` | `CHECK ((role = ANY (ARRAY['master'::text, 'organizer'::text, 'staff'::text, 'member'::text])))` | **SI — da riscrivere** |
| `public` | `door_scan_events` | `door_scan_events_subject_type_check` | `CHECK ((subject_type = ANY (ARRAY['ticket'::text, 'guest_list_entry'::text, 'membership'::text])))` | **NO — non si tocca** |
| `public` | `email_deliveries` | `email_deliveries_category_check` | `CHECK ((category = ANY (ARRAY['ticket_confirmation'::text, 'guest_invitation'::text, 'rsvp_confirmation'::text, 'member_approved'::text, 'member_reactivated'::text, 'member_rejected'::text, 'account_invitation'::text, 'refund_approved'::text, 'refund_rejected'::text, 'venue_reveal'::text, 'event_reminder'::text, 'ticket_order_confirmation'::text])))` | **NO — non si tocca** |

**Cosa conferma.** `51-RESEARCH.md:368-376` diceva **due vincoli vivi sul ruolo**,
e i due vivi sono esattamente quelli, con i nomi che prevedeva. I due `CHECK`
dichiarati *superati* (`20260224_rbac_migration.sql:15` e
`20260807000000_capability_model.sql:121`) **non esistono piu' nel catalogo**:
sono stati davvero riscritti da `20260808000500`. Su questo punto l'elenco letto
dai file aveva ragione.

**Cosa aggiunge — e perche' conta.** Una ricerca per *tabella del ruolo* avrebbe
trovato due righe; una ricerca per *letterale* ne trova quattro. Le altre due non
sono un falso positivo da scartare: sono **due trappole nominate**.

- `door_scan_events_subject_type_check` porta `'membership'` fra i valori
  ammessi. **D-51-13 lo conserva come valore storico** — il registro delle
  convalide alla porta non si riscrive. Una migration che cercasse «i `CHECK` che
  dicono membership» e li riscrivesse tutti cancellerebbe una decisione presa.
- `email_deliveries_category_check` porta `member_approved`,
  `member_reactivated`, `member_rejected`: tre categorie di posta di un flusso —
  approvazione, riattivazione, rifiuto — **che la fase 50 ha rimosso dal
  prodotto**. Il vincolo le ammette ancora. Non e' materia di questa fase (le
  parole nei documenti sono della 57, vedi `51-CONTEXT.md`), ed e' segnata qui
  come **osservazione, non come lavoro**: chi la raccogliera' deve sapere che
  toglierle significa decidere cosa fare delle righe storiche di
  `email_deliveries` che le portano.

> **Conseguenza per `51-08-PLAN.md` (la migration del ruolo):** i vincoli da
> riscrivere sono **due**, per nome — `profiles_role_check` e
> `role_capabilities_role_check` — e gli altri due si nominano solo per dire che
> non si toccano.

## 1b — Le funzioni il cui corpo nomina `member`

**Letto sul laboratorio, 2026-09-22 13:28:46Z.**

I commenti sono **spogliati prima del confronto** (D-50-02): senza, il corpo di
`handle_new_user` e ogni funzione commentata in italiano producono falsi
positivi, e questo repo commenta molto.

```sql
with f as (
  select p.oid,
         n.nspname                                   as schema,
         p.proname,
         pg_get_function_identity_arguments(p.oid)   as firma,
         p.prosecdef,
         p.proconfig,
         l.lanname                                   as linguaggio,
         pg_get_functiondef(p.oid)                   as def
  from   pg_proc p
  join   pg_namespace n on n.oid = p.pronamespace
  join   pg_language  l on l.oid = p.prolang
  where  n.nspname not in ('pg_catalog', 'information_schema')
    and  p.prokind = 'f'
),
spoglio as (
  select f.*,
         regexp_replace(
           regexp_replace(f.def, '/\*.*?\*/', '', 'g'),
           '--[^\n]*', '', 'g')                      as nudo
  from   f
)
select schema, proname, firma, linguaggio, prosecdef, proconfig,
       (nudo ilike '%''member''%')                   as letterale_member_apici,
       (nudo ilike '%member%')                       as parola_member
from   spoglio
where  nudo ilike '%member%'
order  by 1, 2, 3;
```

**Quattro funzioni nominano `member`; due portano il letterale fra apici.**

| Schema | Funzione | Firma | Ling. | `prosecdef` | `proconfig` | letterale `'member'` |
|---|---|---|---|---|---|---|
| `public` | `handle_new_user` | *(nessun argomento)* | `plpgsql` | `true` | `search_path=""` | **SI** |
| `public` | `reconcile_master` | `p_email text` | `plpgsql` | `true` | `search_path=""` | **SI** |
| `public` | `record_membership_act` | `p_subject_id uuid, p_act text, p_actor_id uuid, p_actor_kind text, p_role text, p_status text, p_note text, p_party_id uuid` | `plpgsql` | `true` | `search_path=""` | no (nomina la tabella) |
| `public` | `record_party_assignment_act` | `p_party_id uuid, p_subject_id uuid, p_capability text, p_act text, p_actor_id uuid` | `plpgsql` | `true` | `search_path=""` | no (nomina la funzione) |

### L'assunzione A5 e' SMENTITA

`51-RESEARCH.md:388` scriveva, in grassetto:

> *«Verificato: nessuna funzione e nessuna policy contiene il letterale
> `'member'` nel proprio corpo vivo — l'unica ricorrenza nel file della fase 50 e'
> `20260921120000:837` dentro `handle_new_user`»*

**Il catalogo ne trova due.** La seconda e'
**`public.reconcile_master(p_email text)`**, ed e' la funzione che *gira a ogni
deploy* (`51-RESEARCH.md:471` lo dice, senza collegarlo a questa assunzione).

**Letto sul laboratorio, 2026-09-22 13:29:04Z e 13:30:22Z** — righe del corpo
spogliato dei commenti, estratte con `unnest(string_to_array(nudo, E'\n')) with
ordinality`:

```sql
select riga_n, btrim(riga) as riga
from   (…la stessa CTE `spoglio` di sopra, filtrata su proname…) f,
       lateral unnest(string_to_array(f.nudo, E'\n')) with ordinality as u(riga, riga_n)
where  u.riga ilike '%member%'
order  by riga_n;
```

| Funzione | Riga (corpo spogliato) | Contenuto |
|---|---|---|
| `handle_new_user()` | 37 | `IF EXISTS (SELECT 1 FROM public.profiles WHERE membership_code = new_code) THEN` |
| `handle_new_user()` | 42 | `INSERT INTO public.profiles (id, email, full_name, membership_code, role)` |
| `handle_new_user()` | 48 | `'member'` ← **il ruolo cablato** |
| `handle_new_user()` | 54 | `IF v_conname IS DISTINCT FROM 'profiles_membership_code_key' THEN` |
| `handle_new_user()` | 61 | `RAISE EXCEPTION 'membership_code_collision_after_5_attempts'` |
| `reconcile_master(text)` | 72 | `PERFORM public.record_membership_act(` |
| `reconcile_master(text)` | 98 | `PERFORM public.record_membership_act(` |
| `reconcile_master(text)` | 103 | `p_role       => 'member',` ← **il letterale che A5 negava** |

**Il contesto della riga 103**, letto per non dedurlo (13:30:22Z):

```
 90   SELECT array_agg(p.id)
 91     INTO v_others
 92     FROM public.profiles p
 93    WHERE p.role = 'master'
 94      AND p.id <> v_target.id;
 96   FOREACH v_other IN ARRAY coalesce(v_others, '{}'::uuid[]) LOOP
 98     PERFORM public.record_membership_act(
 99       p_subject_id => v_other,
100       p_act        => 'demoted',
102       p_actor_kind => 'system',
103       p_role       => 'member',
105       p_note       => 'reconciliation from the deployment environment (D-12)',
107     );
108     v_demoted := v_demoted + 1;
109   END LOOP;
```

Il gemello a riga 77 passa `p_role => 'master'` per l'atto `promoted`.

**Cosa significa, e perche' non e' un dettaglio lessicale.** `reconcile_master`
**scrive nel registro degli atti** il ruolo verso cui un account viene retrocesso.
Se la migration del ruolo non la ridefinisce, dal giorno dopo il registro
continua a incidere `'member'` — un valore che i due `CHECK` non ammettono piu' e
che nessun profilo porta — **su ogni deploy che retroceda un master**. Non
solleva un errore, perche' `public.membership_acts.role` **non ha un `CHECK`**
(letto in §2b: sulla tabella vivono due soli `CHECK`, e nessuno e' sul ruolo).
E' esattamente la forma di fallimento di cui parla `meta-gates.md`: silenzioso,
in un registro che nessuno guarda finche' non serve.

**Una verifica in piu', perche' la conclusione opposta sarebbe stata peggiore.**
Nel corpo spogliato di `reconcile_master` **non c'e' alcun `UPDATE`, `INSERT` o
`DELETE`** (interrogato 13:29:58Z, filtro `riga ~* '(update|set +role|insert|delete)'`
→ **zero righe**): la funzione *registra* la promozione e le retrocessioni senza
eseguirle. Quindi il `'member'` di riga 103 e' **solo** un'etichetta nel
registro, non una scrittura su `profiles.role`. La conseguenza resta — un
registro che incide un valore inesistente — ma non c'e' il rischio che la
funzione riporti un profilo a un ruolo cancellato.

> **Conseguenze per `51-08-PLAN.md`:**
> 1. `handle_new_user()` va ridefinita — gia' previsto, e va fatta comunque per
>    `51-12` (il conio del codice socio).
> 2. **`reconcile_master(p_email text)` va ridefinita nella stessa migration**, e
>    questo la ricerca non lo chiedeva. E' `CREATE OR REPLACE` su firma identica,
>    che conserva l'ACL — la forma gia' usata sei volte dalla fase 50.
> 3. Il `search_path=""` e il `SECURITY DEFINER` vanno riportati su ogni
>    ridefinizione: tutte e quattro le funzioni li portano, e `CREATE OR REPLACE`
>    **non** li eredita da sola.

## 1c — Le policy il cui predicato nomina `member`

**Letto sul laboratorio, 2026-09-22 13:30:51Z.**

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from   pg_policies
where  (coalesce(qual, '') || coalesce(with_check, '')) ilike '%member%'
order  by 1, 2, 3;
```

**Zero righe.**

La ricerca e' fatta **sul predicato**, non su un nome di funzione: cercare
`has_capability` sarebbe stato cieco esattamente come lo era prima. Nessuna
policy, in nessuno schema, enumera il ruolo nel proprio `USING` o `WITH CHECK`.

**Cosa conferma.** `51-RESEARCH.md:388` su questo ha ragione, e la ragione e'
architetturale: `private.role_capabilities.role` fa join su `public.profiles.role`
dentro `private.has_capability` (`20260921120000:409-415`) — **un confronto di
valori, non un'enumerazione**. Il modello a capability e' cio' che rende la
rinomina del ruolo una migration di dati e non una riscrittura di decine di
policy.

> **Conseguenza:** `51-08-PLAN.md` non ha policy da toccare per il ruolo. Ed e'
> un risultato che vale scritto: una lettura che torna vuota su un insieme dove
> *poteva* esserci qualcosa e' una misura, non un'assenza di lavoro.

## 1d — Il `DEFAULT` della colonna

**Letto sul laboratorio, 2026-09-22 13:31:10Z.**

```sql
select table_schema, table_name, column_name, data_type, is_nullable, column_default
from   information_schema.columns
where  column_default ilike '%member%'
   or  (table_schema = 'public' and table_name = 'profiles' and column_name = 'role')
order  by 1, 2, 3;
```

**Una riga sola.**

| Schema | Tabella | Colonna | Tipo | Nullable | `column_default` |
|---|---|---|---|---|---|
| `public` | `profiles` | `role` | `text` | `NO` | `'member'::text` |

**Cosa conferma.** `51-RESEARCH.md:384` — *«il `DEFAULT 'member'` e' stato posato
da `20260224:14` e non e' mai stato rimosso»* — e' vero, e **nessun'altra
colonna in nessuno schema porta un default che nomina `member`**. L'`ALTER COLUMN
role SET DEFAULT 'attendee'` e' quindi l'unico movimento di default necessario.

> **Conseguenza per l'ordine dentro la migration:** il `DEFAULT` va spostato
> **prima** che il `CHECK` si stringa a quattro valori, o il default resterebbe un
> valore che il vincolo rifiuta — e la prima `INSERT` senza `role` esplicito
> fallirebbe con `23514` in un momento scomodo.

## 1e — I conteggi per valore di ruolo

**Letto sul laboratorio 2026-09-22 13:31:26Z, e in produzione 2026-09-22 13:31:49Z.**

```sql
select 'public.profiles'            as tabella, role, count(*) as righe
from   public.profiles            group by 1, 2
union all
select 'private.role_capabilities' as tabella, role, count(*) as righe
from   private.role_capabilities  group by 1, 2
order  by 1, 2;
```

| Tabella | Ruolo | Laboratorio | **Produzione** |
|---|---|---|---|
| `public.profiles` | `master` | 1 | 1 |
| `public.profiles` | `organizer` | 1 | 1 |
| `public.profiles` | `staff` | 1 | **0 — nessuna riga** |
| `public.profiles` | `member` | 5 | **2** |
| `private.role_capabilities` | `master` | 16 | 16 |
| `private.role_capabilities` | `organizer` | 14 | 14 |
| `private.role_capabilities` | `staff` | 1 | 1 |
| `private.role_capabilities` | `member` | 1 | 1 |

**Quanto pesa l'`UPDATE` del ruolo:** **2 righe** in `public.profiles` e **1
riga** in `private.role_capabilities`, in produzione. Sul laboratorio 5 e 1.

**Due cose da non dedurre.**

1. **In produzione non esiste alcun profilo `staff`.** Il laboratorio ne ha uno
   (seminato da `seed-lab-door.mjs`). Una prova che si aspettasse di trovare uno
   staff in produzione troverebbe zero righe: e' una differenza fra i due
   ambienti da conoscere prima, non a meta' di una procedura.
2. `private.role_capabilities` e' **identica** sui due progetti (32 righe, stessa
   distribuzione). La fedelta' che `lab-fidelity.mjs` misura sullo schema regge
   anche su questa tabella di dati — che e' dati solo di nome: e' un catalogo.

### Cosa hanno davvero in mano `member` e `staff`

**Letto sul laboratorio, 2026-09-22 13:32:05Z e 13:32:34Z.**

```sql
select c.key, count(rc.role) as concessioni
from   private.capabilities c
left   join private.role_capabilities rc on rc.capability = c.key
group  by c.key
order  by c.key;
```

**17 chiavi, 32 concessioni** — che conferma `EXPECTED_KEY_COUNT = 17` e
`EXPECTED_GRANT_COUNT = 32` di `verify-capabilities.mjs` (§4.3 della ricerca).
Le due chiavi che D-51-07 toglie:

| Chiave | Concessioni | A chi |
|---|---|---|
| `membership.active` | **0** | a nessuno — la fase 50 le ha gia' cancellate (D-50-28) |
| `membership.card.view` | **4** | `master`, `organizer`, `staff`, `member` |

**E qui c'e' il fatto che nessun documento della fase aveva:** `member` e `staff`
hanno **una sola concessione ciascuno**, ed e' `membership.card.view`.

> ## ⚠ Dopo D-51-07, due ruoli restano con zero concessioni
>
> Togliendo `membership.card.view` dal catalogo, `private.role_capabilities`
> passa da 32 righe a 28 — e le quattro che escono sono **l'intero patrimonio di
> `member` (che diventa `attendee`) e l'intero patrimonio di `staff`**. Master
> resta a 16, organizer a 14, **gli altri due a zero**.
>
> Per `attendee` e' la conseguenza voluta: chi compra un biglietto non ha
> capacita' di lavoro, e `51-CONTEXT.md` D-51-09 dice che la sua pagina mostra
> **solo i biglietti**.
>
> **Per `staff` no, e va guardata.** `20260808000500:88-94` dichiara per esteso
> che il modo di fallire contro cui quel file era scritto e' *«una produzione che
> ammette un ruolo che non possiede alcuna capacita'»*. Dopo questa fase lo
> staff e' in quello stato **per riga di catalogo** — e cio' che lo fa lavorare
> alla porta non e' piu' il ruolo ma l'assegnazione alla serata
> (`live_assignment_capabilities` in `my_access_context`, `party_assignments`).
>
> **Non e' un blocco e non e' un bug**: e' un'asimmetria da dichiarare invece di
> scoprirla. I due piani che la incontrano sono quello che tocca le capability
> (D-51-07) e quello che muove i numeri di `verify-capabilities.mjs`. La riga di
> storia che il docblock `:202-232` pretende deve dire **questo**, non solo
> «17 → 15».

### Come tornano i quattro numeri di `verify-capabilities.mjs`

Misurati, non ricalcolati a mano (`51-RESEARCH.md:428-437` li prevedeva):

| Costante | Oggi (misurato) | Dopo | Perche' |
|---|---|---|---|
| `EXPECTED_KEY_COUNT` | **17** ✔ | 15 | 17 − 2 chiavi |
| `EXPECTED_PAIR_COUNT` | 68 *(4 × 17)* | 60 | 4 ruoli × 15 |
| `EXPECTED_GRANT_COUNT` | **32** ✔ | 28 | −4, tutte da `membership.card.view` |
| `EXPECTED_REFUSAL_COUNT` | 36 *(68 − 32)* | 32 | 60 − 28 |

I due segnati ✔ sono letti dal catalogo; gli altri due sono derivati dai primi
per aritmetica del modello (coppie = ruoli × chiavi; rifiuti = coppie − concessioni)
e **portano qui la marcatura che `venue-acquisition.md` chiede altrove: derivato,
non verificato sul campo**. `verify-capabilities.mjs` li misura da solo quando gira.

---

## Riepilogo della sezione 1 — dove il catalogo ha smentito i file

| Punto | L'elenco letto dai file diceva | Il catalogo dice | Vince |
|---|---|---|---|
| `CHECK` sul ruolo | due vivi | **due vivi** — confermato per nome | pari |
| `CHECK` che nominano `member` | (non chiesto) | **quattro**, due dei quali non vanno toccati | catalogo |
| A5: letterale `'member'` nelle funzioni | solo `handle_new_user` | **anche `reconcile_master(text)`** — che gira a ogni deploy | **catalogo** |
| Policy che nominano il ruolo | nessuna | **nessuna** — confermato sul predicato | pari |
| `DEFAULT 'member'` | presente, mai rimosso | **presente, ed e' l'unico in tutto lo schema** | pari |
| Righe da aggiornare | non misurate | **2 profili + 1 concessione** in produzione | catalogo |
| Concessioni di `staff` | non misurate | **una sola, ed esce con D-51-07** | catalogo |

---

# 2. Cosa nomina il codice socio e il registro degli atti

## 2a — Le funzioni

**Letto sul laboratorio, 2026-09-22 13:35:42Z.** Stessa CTE `spoglio` della §1b —
i commenti spogliati prima del confronto.

```sql
select schema, proname, firma, linguaggio, prosecdef, proconfig,
       (nudo ilike '%membership_code%')        as nomina_membership_code,
       (nudo ilike '%membership_acts%')        as nomina_membership_acts,
       (nudo ilike '%record_membership_act(%') as chiama_record_membership_act,
       (nudo ilike '%attendances%')            as nomina_attendances
from   spoglio
where  nudo ilike '%membership_code%'
   or  nudo ilike '%membership_acts%'
   or  nudo ilike '%record_membership_act%'
   or  nudo ilike '%attendances%'
order  by 1, 2, 3;
```

## IL NUMERO — quattro previste, quattro trovate

**E' il numero che la fase 50 ha sbagliato (quattro in elenco, sei nel catalogo),
ed e' il numero che rompe `createAccount` se e' sbagliato di nuovo.** Questa
volta **torna**: `51-RESEARCH.md` §4.4 e §4.5 ne prevedevano quattro — e quattro
sono.

| Schema | Funzione | Firma completa | Ling. | `prosecdef` | `proconfig` |
|---|---|---|---|---|---|
| `public` | `handle_new_user` | *(nessun argomento)* | `plpgsql` | `true` | `search_path=""` |
| `public` | `reconcile_master` | `p_email text` | `plpgsql` | `true` | `search_path=""` |
| `public` | `record_membership_act` | `p_subject_id uuid, p_act text, p_actor_id uuid, p_actor_kind text, p_role text, p_status text, p_note text, p_party_id uuid` | `plpgsql` | `true` | `search_path=""` |
| `public` | `record_party_assignment_act` | `p_party_id uuid, p_subject_id uuid, p_capability text, p_act text, p_actor_id uuid` | `plpgsql` | `true` | `search_path=""` |

**Tutte e quattro sono `plpgsql` e `SECURITY DEFINER` con `search_path=""`.**
`plpgsql` e' la ragione per cui questo file esiste: il corpo non e' analizzato
alla creazione, quindi **nessuna di queste dipendenze e' registrata** e un
`DROP COLUMN` o un `RENAME` riesce lasciandole rotte. `CREATE OR REPLACE` su
firma identica conserva l'ACL; **non conserva** `SECURITY DEFINER` ne'
`proconfig`, che vanno riscritti a mano su ognuna.

### Chi chiama chi

| Chiamante | Chiamata | Siti |
|---|---|---|
| `reconcile_master(text)` | `public.record_membership_act(…)` | 2 — righe 72 e 98 del corpo spogliato |
| `record_party_assignment_act(…)` | `public.record_membership_act(…)` | 1 |
| `record_membership_act(…)` | — | il riscontro su se stessa e' **l'intestazione** `CREATE OR REPLACE FUNCTION public.record_membership_act(`, non una ricorsione |

> **Conseguenza per `51-12-PLAN.md`:** `ALTER FUNCTION … RENAME TO
> record_account_act` conserva ACL e `SECURITY DEFINER` (S6), ma **i due
> chiamanti non seguono il nome**: `reconcile_master` e
> `record_party_assignment_act` vanno ridefinite nella stessa transazione, o dal
> commit dopo il registro non registra piu' nulla — in silenzio, perche' una
> `PERFORM` su funzione inesistente e' un errore a tempo di esecuzione che
> nessuno vede finche' un organizer non crea un account o un deploy non passa.
>
> E `reconcile_master` e' **la stessa funzione** che la §1b obbliga a ridefinire
> per il letterale `'member'`. Le due migration di questa fase la toccano
> entrambe: **vanno sequenziate**, e la seconda riparte dal corpo che la prima ha
> lasciato, non da quello nelle migration storiche.

**Zero funzioni nominano `attendances`.** E' una lettura che torna vuota su un
insieme dove poteva esserci qualcosa, quindi e' una misura: la tabella che
D-51-14 toglie non ha dipendenze in alcun corpo di funzione.

## 2b — I vincoli sulle due tabelle

**Letto sul laboratorio, 2026-09-22 13:36:10Z.**

```sql
select c.conrelid::regclass::text as tabella, c.conname,
       case c.contype when 'c' then 'CHECK' when 'f' then 'FOREIGN KEY'
                      when 'p' then 'PRIMARY KEY' when 'u' then 'UNIQUE'
                      else c.contype::text end as tipo,
       pg_get_constraintdef(c.oid) as definizione,
       c.confrelid::regclass::text as riferisce
from   pg_constraint c
where  c.conrelid in ('public.membership_acts'::regclass,
                      'public.attendances'::regclass)
order  by 1, 3, 2;
```

### `public.membership_acts` — **sette vincoli, non due**

| `conname` | Tipo | Definizione |
|---|---|---|
| `membership_acts_act_check` | CHECK | `CHECK ((act = ANY (ARRAY['created','approved','rejected','promoted','demoted','deactivated','reactivated','assigned','unassigned','deleted'])))` |
| `membership_acts_actor_attributed` | CHECK | `CHECK ((((actor_kind = 'user') AND (actor_id IS NOT NULL)) OR ((actor_kind = 'system') AND (actor_id IS NULL))))` |
| `membership_acts_actor_kind_check` | CHECK | `CHECK ((actor_kind = ANY (ARRAY['user','system'])))` |
| `membership_acts_actor_id_fkey` | FOREIGN KEY | `FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL` |
| `membership_acts_party_id_fkey` | FOREIGN KEY | `FOREIGN KEY (party_id) REFERENCES event_parties(id) ON DELETE SET NULL` |
| `membership_acts_subject_id_fkey` | FOREIGN KEY | `FOREIGN KEY (subject_id) REFERENCES auth.users(id) ON DELETE SET NULL` |
| `membership_acts_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |

### La divergenza: §4.5 ne elencava due

`51-RESEARCH.md:459-468` nomina **due** vincoli da rinominare —
`membership_acts_actor_attributed` e `membership_acts_act_check`. Il catalogo ne
conta **sette che portano il prefisso `membership_acts_`**, e `ALTER TABLE …
RENAME TO` **non ne rinomina nessuno** (S6, `51-PATTERNS.md:924-932`).

I cinque mancanti dall'elenco:

- `membership_acts_actor_kind_check` — un terzo `CHECK`, semplicemente non visto;
- le **tre chiavi esterne**, che l'elenco non contemplava affatto;
- la **chiave primaria**, che si porta dietro anche il proprio indice (§2c).

**Non e' un difetto funzionale**: un vincolo con il nome vecchio continua a
funzionare. E' un difetto di **leggibilita' del catalogo**, ed e' il tipo di
residuo che una fase successiva ritrova credendo che la tabella vecchia esista
ancora. Chi scrive `51-12-PLAN.md` decida **esplicitamente** se rinominarli tutti
e sette o solo i tre `CHECK` — e scriva la ragione. La decisione va presa, non
ereditata dall'elenco piu' corto.

### `public.attendances` — cinque vincoli, **zero `CHECK`**

| `conname` | Tipo | Definizione | Riferisce |
|---|---|---|---|
| `attendances_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` | — |
| `attendances_event_id_fkey` | FOREIGN KEY | `FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE` | `events` |
| `attendances_party_id_fkey` | FOREIGN KEY | `FOREIGN KEY (party_id) REFERENCES event_parties(id) ON DELETE CASCADE` | `event_parties` |
| `attendances_user_id_fkey` | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | `auth.users` |
| `attendances_checked_in_by_fkey` | FOREIGN KEY | `FOREIGN KEY (checked_in_by) REFERENCES auth.users(id)` | `auth.users` — **senza `ON DELETE`** |

Conferma lo schema di `51-RESEARCH.md:313-320`, e aggiunge una precisazione:
`checked_in_by` e' l'unica chiave esterna **senza azione `ON DELETE`**, cioe'
`NO ACTION`. Finche' esistono righe in `attendances` che nominano un utente,
**quell'utente non si puo' cancellare da `auth.users`**. E' un fatto che la
cancellazione self-service differita (`51-CONTEXT.md`, `<deferred>`) incontrera';
dopo D-51-14 sparisce con la tabella.

## 2c — Gli indici

**Letto sul laboratorio, 2026-09-22 13:36:36Z.**

```sql
select schemaname, tablename, indexname, indexdef
from   pg_indexes
where  (schemaname = 'public' and tablename in ('membership_acts', 'attendances'))
    or indexname ilike '%membership%'
order  by 2, 3;
```

| Tabella | Indice | Definizione |
|---|---|---|
| `membership_acts` | `idx_membership_acts_actor` | `CREATE INDEX … USING btree (actor_id, at DESC)` |
| `membership_acts` | `idx_membership_acts_subject` | `CREATE INDEX … USING btree (subject_id, at DESC)` |
| `membership_acts` | `membership_acts_pkey` | `CREATE UNIQUE INDEX … USING btree (id)` |
| `attendances` | `attendances_pkey` | `CREATE UNIQUE INDEX … USING btree (id)` |
| `attendances` | `attendances_party_user_unique` | `CREATE UNIQUE INDEX … (party_id, user_id) WHERE (party_id IS NOT NULL)` |
| `attendances` | `attendances_event_user_unique` | `CREATE UNIQUE INDEX … (event_id, user_id) WHERE (party_id IS NULL)` |
| `attendances` | `idx_attendances_party` | `CREATE INDEX … USING btree (party_id)` |
| `profiles` | `profiles_membership_code_key` | `CREATE UNIQUE INDEX … USING btree (membership_code)` |

**Tre indici su `membership_acts`, non due.** L'elenco dei file ne nominava due
(`idx_…_subject`, `idx_…_actor`); il terzo e' l'indice della chiave primaria, che
**segue il nome del vincolo**: rinominare `membership_acts_pkey` come vincolo
rinomina anche il suo indice, ma **non farlo lascia un indice `membership_acts_…`
su una tabella che si chiama `account_acts`**.

I due indici parziali di `attendances` confermano `51-RESEARCH.md:322` alla
lettera, **e sono la prova indipendente che la distinzione di §3 e' reale**: lo
schema stesso tratta `party_id IS NOT NULL` e `party_id IS NULL` come **due
popolazioni con due regole di unicita' diverse**. Non e' un'interpretazione del
documento: e' scritto nell'indice.

## 2d — Le policy

**Letto sul laboratorio, 2026-09-22 13:36:49Z.**

```sql
select p.schemaname, p.tablename, p.policyname, p.permissive, p.cmd, p.roles,
       p.qual, p.with_check, c.relrowsecurity, c.relforcerowsecurity
from   pg_policies p
join   pg_class c on c.relname = p.tablename
join   pg_namespace n on n.oid = c.relnamespace and n.nspname = p.schemaname
where  p.schemaname = 'public' and p.tablename in ('membership_acts', 'attendances')
order  by 2, 3;
```

| Tabella | Policy | `cmd` | `qual` | `with_check` |
|---|---|---|---|---|
| `membership_acts` | `membership_acts_select_register_read` | `SELECT` | `( SELECT private.has_capability('register.read') )` | `null` |
| `attendances` | `attendances_all_admin` | `ALL` | `( SELECT private.has_capability('staff.manage') )` | `null` |
| `attendances` | `attendances_select_own` | `SELECT` | `(( SELECT auth.uid() ) = user_id)` | `null` |

Tutte `PERMISSIVE`, tutte su `{public}`. **RLS attiva su entrambe le tabelle,
`FORCE` su nessuna** (`relrowsecurity = true`, `relforcerowsecurity = false`).

Conferma `51-RESEARCH.md:324`. **Una sola policy da rinominare** su
`membership_acts` — e questo l'elenco dei file lo aveva giusto.

**`attendances_all_admin` e' `FOR ALL` senza `with_check`.** Chi ha
`staff.manage` puo' quindi cancellare per policy. Non e' la strada dell'atto di
D-51-04, che passa dal Management API come `postgres` e non dalla RLS — ma
significa che **la cancellazione e' raggiungibile anche da una sessione di
lavoro**, ed e' una ragione in piu' perche' l'atto avvenga per chiave primaria su
una lista catturata e non per predicato.

## 2e — I privilegi

### Prima: una lettura che sembrava una risposta e non lo era

**Letto sul laboratorio, 2026-09-22 13:37:04Z.**

```sql
select table_schema, table_name, grantee, privilege_type, is_grantable
from   information_schema.role_table_grants
where  table_schema = 'public'
  and  table_name in ('membership_acts', 'attendances')
order  by 2, 3, 4;
```

**Zero righe — e zero righe qui NON significa «nessun privilegio».**
`information_schema.role_table_grants` mostra solo le concessioni in cui il ruolo
corrente e' concedente, beneficiario, o membro del beneficiario. La query del
Management API gira come `supabase_read_only_user`, che non e' nessuno dei tre:
la vista e' **cieca**, non vuota.

Il piano chiedeva questa vista per nome. **Averla usata e fermarsi li' avrebbe
prodotto la conclusione opposta a quella vera** — «i privilegi sono gia' tutti
revocati» — su una tabella la cui unica difesa contro il proprio scrittore e'
esattamente un `REVOKE`. E' la stessa forma dell'errore che `lab-fidelity.mjs`
dichiara accanto a se' (*«un accordo fra due insiemi vuoti, che non e' una
misura»*).

### Poi: l'ACL letta dove vive davvero

**Letto sul laboratorio, 2026-09-22 13:37:21Z.**

```sql
select c.relname                                      as tabella,
       coalesce(pg_get_userbyid(a.grantee), 'PUBLIC') as beneficiario,
       a.privilege_type, a.is_grantable,
       current_user                                   as letto_come
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
left   join lateral aclexplode(c.relacl) a on true
where  n.nspname = 'public'
  and  c.relname in ('membership_acts', 'attendances')
order  by 1, 2, 3;
```

Concedente: `postgres` su ogni riga. `is_grantable`: `false` su ogni riga.

| Tabella | Beneficiario | Privilegi |
|---|---|---|
| `membership_acts` | `anon` | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| `membership_acts` | `authenticated` | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| `membership_acts` | `postgres` | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| `membership_acts` | **`service_role`** | **MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE — e nient'altro** |
| `attendances` | `anon`, `authenticated`, `postgres`, `service_role` | tutti e otto, su tutti e quattro |

**Il `REVOKE` di `20260808005000` e' arrivato, e si vede.** `service_role` e'
l'unico dei quattro senza `INSERT`, `UPDATE` e `DELETE` su `membership_acts`, ed
e' esattamente il bersaglio che quel file dichiara: *«`service_role` is the
target: it carries `BYPASSRLS`, so no policy constrains it, and a table grant is
the only thing that can»* (`:137-138`).

**E il fatto che `anon` e `authenticated` li conservino non e' una falla
trovata: e' un compromesso gia' dichiarato per iscritto** nello stesso file
(`:125-131`) — per loro il rifiuto lo fa la RLS, che su `membership_acts` non ha
alcuna policy di scrittura. Qui e' **misurato** invece che letto: la difesa e'
doppia e asimmetrica, e le due meta' hanno due meccanismi diversi.

> **Conseguenza per il `RENAME`:** l'ACL e' una colonna di `pg_class`
> (`relacl`), quindi **viaggia con la tabella** — `ALTER TABLE … RENAME TO` non
> la tocca e non serve rifare il `REVOKE`. Ma §4.5 chiede di **rileggerla dopo**,
> e quella e' la richiesta giusta: questa tabella e' la **linea di base contro cui
> rileggerla**. Se dopo il rename `service_role` avesse di nuovo `INSERT`,
> `UPDATE` o `DELETE` su `account_acts`, il registro avrebbe smesso di essere
> append-only senza che una riga di SQL lo dica.

## 2f — Gli oggetti che nominano `profiles.membership_code`

**Letto sul laboratorio, 2026-09-22 13:37:57Z.** Tre fonti unite —
`pg_attribute`, `pg_constraint`, `pg_indexes` — piu' `pg_depend` sul
`refobjsubid` della colonna, che e' il posto dove una dipendenza **registrata**
si vede.

```sql
with col as (
  select a.attrelid, a.attnum, a.attname,
         format_type(a.atttypid, a.atttypmod) as tipo, a.attnotnull
  from   pg_attribute a
  where  a.attrelid = 'public.profiles'::regclass
    and  a.attname  = 'membership_code'
    and  a.attnum > 0 and not a.attisdropped
)
select 'colonna', col.attname, col.tipo,
       case when col.attnotnull then 'NOT NULL' else 'nullable' end from col
union all
select 'vincolo', c.conname, pg_get_constraintdef(c.oid), c.contype::text
from   pg_constraint c, col
where  c.conrelid = col.attrelid and col.attnum = any(c.conkey)
union all
select 'indice', i.indexname, i.indexdef, 'pg_indexes'
from   pg_indexes i
where  i.schemaname='public' and i.tablename='profiles'
  and  i.indexdef ilike '%membership_code%'
union all
select 'dipendenza registrata',
       pg_describe_object(d.classid, d.objid, d.objsubid), d.deptype::text,
       'pg_depend su refobjsubid della colonna'
from   pg_depend d, col
where  d.refclassid = 'pg_class'::regclass
  and  d.refobjid = col.attrelid and d.refobjsubid = col.attnum
order  by 1, 2;
```

| Genere | Oggetto | Dettaglio |
|---|---|---|
| colonna | `membership_code` | `text`, **`NOT NULL`** |
| vincolo | `profiles_membership_code_key` | `UNIQUE (membership_code)` |
| indice | `profiles_membership_code_key` | `CREATE UNIQUE INDEX … USING btree (membership_code)` |
| dipendenza registrata | `constraint profiles_membership_code_key on table profiles` | `deptype = 'a'` (auto) |

**Una sola dipendenza registrata, ed e' il vincolo `UNIQUE`.** Nessuna vista,
nessuna colonna generata, nessun altro vincolo, nessuna regola di riscrittura.

**Due cose che i file non dicevano.**

1. **La colonna e' `NOT NULL`**, e `51-RESEARCH.md:447` non lo riporta: nomina il
   `UNIQUE` e basta. Conta, perche' e' la ragione per cui `handle_new_user`
   **deve** coniare un codice: non puo' inserire una riga senza. E conta anche al
   contrario — finche' la colonna esiste, qualunque percorso di creazione di un
   profilo che non passi da `handle_new_user` fallisce con `23502`.
2. **La cascata registrata e' vuota tranne il `UNIQUE`**, il che significa che
   `ALTER TABLE public.profiles DROP COLUMN membership_code` **riesce**,
   portandosi via il vincolo e il suo indice — **e lascia rotte le due funzioni
   `plpgsql` che la nominano**, `handle_new_user` (righe 37, 42, 54, 61 del corpo
   spogliato) e `record_membership_act`. Non e' una previsione: e' cio' che
   `pg_depend` dice, e coincide esattamente con l'avvertimento di §4.4 — che ora
   e' **misurato**, non citato.

## 2g — Due cose che nessun documento di fase nominava

### ⚠ Un trigger su `profiles`, che scatta sull'`UPDATE` del ruolo

**Letto sul laboratorio, 2026-09-22 13:38:12Z, 13:38:26Z e 13:38:35Z.**

```sql
select t.tgname,
       c.relnamespace::regnamespace::text || '.' || c.relname as su_tabella,
       p.pronamespace::regnamespace::text || '.' || p.proname as funzione,
       pg_get_triggerdef(t.oid) as definizione
from   pg_trigger t
join   pg_class c on c.oid = t.tgrelid
join   pg_proc  p on p.oid = t.tgfoid
where  not t.tgisinternal
  and  (p.proname ilike '%membership%' or p.proname = 'handle_new_user'
        or c.relname in ('profiles', 'membership_acts', 'attendances'))
order  by 1;
```

| Trigger | Su | Funzione |
|---|---|---|
| `on_auth_user_created` | `auth.users` | `public.handle_new_user` — `AFTER INSERT … FOR EACH ROW` |
| **`profiles_release_expired_assignments`** | **`public.profiles`** | `public.profiles_release_expired_assignments` — **`BEFORE UPDATE OF role … FOR EACH ROW WHEN ((old.role IS DISTINCT FROM new.role))`** |

Il secondo **non compare in `51-RESEARCH.md`, ne' in `51-PATTERNS.md`, ne' in
`51-CONTEXT.md`**, e non era emerso dalle §1b e §2a perche' il suo corpo non
nomina `member` ne' alcun oggetto di membership. Si trova **solo** interrogando i
trigger della tabella.

Cosa fa, letto per intero invece che dedotto:

```
profiles_release_expired_assignments()   -- plpgsql, SECURITY DEFINER, search_path=''
  PERFORM public.release_expired_assignee_roles(OLD.id);
    └─ UPDATE public.party_assignments
          SET assignee_role = NULL, expired_at = now()
        WHERE user_id = p_user_id
          AND revoked_at IS NULL AND expired_at IS NULL
          AND assignee_role IS NOT NULL AND now() >= ends_at;
```

> **`UPDATE public.profiles SET role = 'attendee' WHERE role = 'member'`
> **scrive su una seconda tabella**, `public.party_assignments`, una riga per
> profilo toccato. E' un percorso di scrittura che la migration del ruolo non ha
> dichiarato — esattamente cio' che `ai-engineering.md` chiama *«una cascata e'
> un percorso di scrittura che nessuno ha dichiarato, e va enumerata leggendo i
> vincoli, non ricordandola»*, applicato a un trigger invece che a una chiave
> esterna.

**Quante righe toccherebbe — misurato, 2026-09-22 13:38:57Z (lab) e 13:39:03Z (produzione):**

```sql
select count(*) filter (where pa.assignee_role is not null
                          and pa.revoked_at is null
                          and pa.expired_at is null
                          and now() >= pa.ends_at)     as sarebbero_rilasciate,
       count(*)                                        as assegnazioni_di_quei_profili,
       (select count(*) from public.party_assignments) as assegnazioni_in_tabella
from   public.party_assignments pa
join   public.profiles p on p.id = pa.user_id
where  p.role = 'member';
```

| | Laboratorio | Produzione |
|---|---|---|
| Assegnazioni rilasciate dal trigger | **0** | **0** |
| Assegnazioni dei profili con ruolo `member` | 0 | 0 |
| `party_assignments`, righe totali | 3 | **0** |

**Zero oggi, su entrambi.** Il trigger scatterebbe due volte in produzione (una
per profilo) e non scriverebbe nulla, perche' nessun profilo con ruolo `member`
ha assegnazioni — coerente con D-51-03, *«staff e organizer non scansionano:
sono in servizio»*, e con il fatto che chi compra non lavora una serata.

**Resta da dichiarare, non da ignorare, per tre ragioni.** Il numero e' zero
**oggi** e va ripreso il giorno dell'atto; la migration del ruolo va scritta
sapendo che quel trigger esiste; e se un giorno un profilo `attendee` avesse
un'assegnazione, la migration la scadrebbe in silenzio.

### `membership_acts` non ha una colonna `role`

Scoperto perche' una query e' **fallita**, 2026-09-22 13:39:28Z:
`ERROR: 42703: column "role" does not exist`. Le colonne, lette subito dopo da
`information_schema.columns`:

```
id · act · subject_id · subject_label · actor_id · actor_kind ·
role_before · role_after · status_before · status_after · at · party_id · note
```

**`p_role` di `record_membership_act` atterra in `role_after`.** Quindi il
`'member'` che `reconcile_master` passa (§1b) finisce in `role_after` — una
colonna `text` **senza `CHECK`**, che e' il motivo per cui il valore morto non
solleverebbe alcun errore.

**E `status_before` / `status_after` sono sopravvissute alla fase 50**, che ha
tolto `profiles.status`. Sono `text` nullable, e in produzione **2 righe su 2 le
portano valorizzate**. Non e' materia di questa fase — si segna qui perche' la
migration che rinomina la tabella e' l'occasione naturale in cui qualcuno se le
trovera' davanti, e la decisione (tenerle come storia, come `door_scan_events`
tiene `'membership'` per D-51-13, oppure toglierle) **va presa da chi la incontra,
con questo numero davanti**.

### I conteggi del registro

**Letto 2026-09-22 13:39:40Z (lab) e 13:39:44Z (produzione).**

| Misura | Laboratorio | Produzione |
|---|---|---|
| Atti totali | 3 | **2** |
| `role_after = 'member'` | 2 | **0** |
| `role_before = 'member'` | 3 | **1** |
| Atti con `subject_id` nullo (soggetto cancellato, D-50-16) | 2 | 0 |
| Atti con `status_before` o `status_after` valorizzati | 0 | **2** |
| Lunghezza del `COMMENT ON TABLE` | 461 | 461 |

Il `COMMENT` e' **identico** sui due progetti (461 caratteri) e descrive per
esteso il meccanismo append-only: **va riscritto con il nome nuovo**, o dal
commit dopo descrive una tabella che non esiste.

---

## Riepilogo della sezione 2 — dove il catalogo ha smentito i file

| Punto | L'elenco letto dai file diceva | Il catalogo dice | Vince |
|---|---|---|---|
| **Numero di funzioni** | quattro | **quattro** — il numero che la 50 sbaglio' questa volta torna | pari |
| Vincoli su `membership_acts` | due `CHECK` | **sette** col prefisso: 3 CHECK + 3 FK + 1 PK | **catalogo** |
| Indici su `membership_acts` | due | **tre** — piu' l'indice della PK | **catalogo** |
| Policy su `membership_acts` | una | **una** | pari |
| Privilegi | «da rileggere dal catalogo dopo» | **misurati come linea di base**; `role_table_grants` e' cieca e va evitata | **catalogo** |
| `profiles.membership_code` | colonna + `UNIQUE` | **anche `NOT NULL`**, e una sola dipendenza registrata | **catalogo** |
| Trigger sull'`UPDATE` del ruolo | **non nominato** | **esiste e scrive su `party_assignments`** — 0 righe oggi | **catalogo** |
| Colonna `role` del registro | implicita in `p_role` | **non esiste**: e' `role_after`, e non ha `CHECK` | **catalogo** |
| Funzioni che nominano `attendances` | — | **zero** | catalogo |
