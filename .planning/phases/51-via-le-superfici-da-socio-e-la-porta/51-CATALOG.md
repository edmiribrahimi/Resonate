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
