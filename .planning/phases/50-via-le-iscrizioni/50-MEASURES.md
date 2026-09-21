# Fase 50 — le misure, prese e non stimate

**Prese il:** 2026-09-21, fra le **12:20:06Z** e le **12:21:25Z** (UTC).
**Piano:** `50-01`, task 3.
**Database misurati:** due — laboratorio e produzione.

---

## Zero scritture, e come si verifica

**Nessun `INSERT`, nessun `UPDATE`, nessun `DELETE`, nessun `ALTER`, nessuna
migration applicata.** Ogni misura di questo documento e' una `select`, eseguita
sull'endpoint `POST /v1/projects/{ref}/database/query` della Management API con
`read_only: true` nel corpo della richiesta.

Il rifiuto non e' una promessa: lo script che ha preso le misure scarta qualunque
query che non cominci per `select` **prima** di spedirla, e il flag di sola
lettura e' passato a ogni chiamata. Leggere non ha bisogno di un'autorizzazione
datata; scrivere si', e qui non si e' scritto. **La terza autorizzazione di
D-50-02 resta intatta e non spesa.**

## I due database, e perche' uno dei due non ha un identificativo qui

| Database | Identificativo del progetto |
|---|---|
| **produzione** | `cjsfocnhfzycbbgkwocx` — gia' pubblico per costruzione: viaggia nel bundle del browser dentro `NEXT_PUBLIC_SUPABASE_URL`, ed e' scritto in chiaro in `scripts/seed-lab-door.mjs:76` con la ragione accanto |
| **laboratorio** | **non scritto qui.** Lo stesso file dichiara la regola (`scripts/seed-lab-door.mjs:74-75`): non c'e' motivo di pubblicare un ambiente che nessuno deve trovare. Questo documento sta su un repository pubblico |

**Nessun profilo e' elencato**: si contano, non si nominano. Nessun indirizzo di
posta, nessuna persona, nessuna sede, nessuna data non annunciata. Dove serve un
identificativo si usa l'id o il codice di membership — e in questo documento non
ne e' servito nessuno, perche' ogni misura e' un conteggio.

---

## Il risultato che cambia il piano 50-11

> **Su produzione i profili in `pending` o `rejected` sono ZERO.**
>
> Quattro profili in tutto, **tutti `approved`**. D-50-02 — *«gli account oggi in
> `pending` o `rejected` si cancellano»* — non ha soggetti: non c'e' niente da
> cancellare, e la cancellazione irreversibile che l'autorizzazione datata doveva
> coprire **non ha luogo**.
>
> Il piano 50-11 non e' inutile: deve ancora dichiarare il conteggio. Ma lo
> dichiara **a zero**, e una migration che cancella una colonna non e' la stessa
> cosa di una migration che cancella delle persone.

Tre conseguenze ulteriori, tutte misurate:

- **`rsvps` su produzione e' vuota (0 righe).** D-50-22 lo aveva previsto in
  entrambi i versi: *«se sono zero, il debito e' vuoto»*. Lo e'.
- **`email_deliveries` su produzione e' vuota (0 righe).** La trappola di
  `50-RESEARCH.md` §7.4 — l'`ALTER … ADD CONSTRAINT` che fallisce con `23514` su
  righe storiche `member_approved` — **non puo' scattare**: non esiste alcuna
  riga storica. La strada 2 di §7.4 (*«misurarle e toglierle solo se zero»*) e'
  percorribile; resta preferibile la 1, perche' un vocabolario storico vuoto
  costa comunque meno di una migration in piu'.
- **`profiles.referred_by` non e' valorizzato su nessun profilo** (0 su
  entrambi i database). REG-03 non ha righe da ripulire.

---

## Le nove famiglie di misura

Query alla lettera, risultato alla lettera. `[]` significa **nessuna riga
restituita** — che su un `group by` significa nessuna riga che soddisfi la
condizione.

### M1 — profili per stato

```sql
select status, count(*)::int as n from public.profiles group by status order by status
```

| Database | Risultato |
|---|---|
| laboratorio | `[{"status":"approved","n":5},{"status":"pending","n":1}]` |
| **produzione** | `[{"status":"approved","n":4}]` |

L'unico profilo non approvato del laboratorio e' **seminato**, non reale: e'
l'account che `scripts/seed-lab-door.mjs` chiamava `memberPending`, e il task 1
di questo stesso piano lo ha ritirato. Alla prossima semina non esistera' piu'.

### M2 — profili non approvati **con biglietti**

```sql
select p.status, count(*)::int as n from public.profiles p join public.tickets t
  on t.user_id = p.id where p.status <> 'approved' group by p.status
```

| Database | Risultato |
|---|---|
| laboratorio | `[{"status":"pending","n":1}]` |
| **produzione** | `[]` |

> **Laboratorio: un sottoinsieme non cancellabile, di una riga.** Un profilo
> `pending` porta un biglietto, e `tickets.user_id` e' `ON DELETE CASCADE`:
> cancellarlo cancellerebbe il biglietto. E' la riga seminata di M1, quindi
> sintetica — ma vale la regola di D-50-16 comunque, ed e' esattamente il
> soggetto su cui `P-50-3` deve vedere la cancellazione **rifiutare con la
> causa**.
>
> **Produzione: il sottoinsieme non cancellabile e' vuoto.**

### M3 — profili non approvati **con rsvp**

```sql
select p.status, count(*)::int as n from public.profiles p join public.rsvps r
  on r.user_id = p.id where p.status <> 'approved' group by p.status
```

| Database | Risultato |
|---|---|
| laboratorio | `[]` |
| **produzione** | `[]` |

### M4 — profili non approvati **con media**

```sql
select p.status, count(*)::int as n from public.profiles p join public.event_media m
  on m.uploaded_by = p.id where p.status <> 'approved' group by p.status
```

| Database | Risultato |
|---|---|
| laboratorio | `[]` |
| **produzione** | `[]` |

### M5 — profili non approvati **in guest list**

```sql
select p.status, count(*)::int as n from public.profiles p join public.guest_list_entries g
  on g.profile_id = p.id where p.status <> 'approved' group by p.status
```

| Database | Risultato |
|---|---|
| laboratorio | `[]` |
| **produzione** | `[]` |

### M6 — profili con `referred_by` valorizzato

```sql
select count(*)::int as n from public.profiles where referred_by is not null
```

| Database | Risultato |
|---|---|
| laboratorio | `[{"n":0}]` |
| **produzione** | `[{"n":0}]` |

### M7 — il registro delle consegne, per categoria (REG-02)

```sql
select category, count(*)::int as n from public.email_deliveries group by category order by category
```

| Database | Risultato |
|---|---|
| laboratorio | `[{"category":"ticket_order_confirmation","n":5},{"category":"venue_reveal","n":2}]` |
| **produzione** | `[]` |

**Nessuna delle quattro categorie che D-50-14 manda in pensione**
(`member_approved`, `member_rejected`, `member_reactivated`,
`registration_confirmation`) **ha una sola riga, su nessuno dei due database.**
Nemmeno `rsvp_confirmation`, che REG-06 smette di scrivere.

Il `CHECK` che le elenca esiste su entrambi ed e' identico:

```
email_deliveries_category_check CHECK ((category = ANY (ARRAY['ticket_confirmation'::text,
  'guest_invitation'::text, 'rsvp_confirmation'::text, 'member_approved'::text,
  'member_reactivated'::text, 'member_rejected'::text, 'account_invitation'::text,
  'refund_approved'::text, 'refund_rejected'::text, 'venue_reveal'::text,
  'event_reminder'::text, 'ticket_order_confirmation'::text])))
```

`registration_confirmation` **non e' nell'elenco**: quel template non e' mai
passato dal registro. Sono dodici valori, non tredici.

### M8 — le righe di `rsvps` (D-50-22)

```sql
select count(*)::int as n from public.rsvps
```

| Database | Risultato |
|---|---|
| laboratorio | `[{"n":1}]` |
| **produzione** | `[{"n":0}]` |

### M9 — le tracce di lavoro riferite da un profilo non approvato

Una riga per ciascuna colonna che **blocca** una cancellazione. L'elenco delle
colonne non e' quello di `50-RESEARCH.md` §4.1: e' quello **misurato** in M10,
che ne conta tre in piu'.

```sql
select 'ticket_refunds.requested_by' as traccia, count(*)::int as n
  from public.ticket_refunds x join public.profiles p on p.id = x.requested_by where p.status <> 'approved'
union all select 'party_assignments.assigned_by', count(*)::int
  from public.party_assignments x join public.profiles p on p.id = x.assigned_by where p.status <> 'approved'
union all select 'door_scan_events.operator_id', count(*)::int
  from public.door_scan_events x join public.profiles p on p.id = x.operator_id where p.status <> 'approved'
union all select 'guest_list_entries.added_by', count(*)::int
  from public.guest_list_entries x join public.profiles p on p.id = x.added_by where p.status <> 'approved'
union all select 'guest_list_entries.profile_id', count(*)::int
  from public.guest_list_entries x join public.profiles p on p.id = x.profile_id where p.status <> 'approved'
union all select 'tickets.checked_in_by', count(*)::int
  from public.tickets x join public.profiles p on p.id = x.checked_in_by where p.status <> 'approved'
union all select 'artists.created_by', count(*)::int
  from public.artists x join public.profiles p on p.id = x.created_by where p.status <> 'approved'
union all select 'venues.created_by', count(*)::int
  from public.venues x join public.profiles p on p.id = x.created_by where p.status <> 'approved'
union all select 'ticket_refunds.processed_by', count(*)::int
  from public.ticket_refunds x join public.profiles p on p.id = x.processed_by where p.status <> 'approved'
union all select 'attendances.checked_in_by', count(*)::int
  from public.attendances x join public.profiles p on p.id = x.checked_in_by where p.status <> 'approved'
union all select 'guest_list_entries.checked_in_by', count(*)::int
  from public.guest_list_entries x join public.profiles p on p.id = x.checked_in_by where p.status <> 'approved'
order by 1
```

Risultato, **identico sui due database**:

```json
[{"traccia":"artists.created_by","n":0},
 {"traccia":"attendances.checked_in_by","n":0},
 {"traccia":"door_scan_events.operator_id","n":0},
 {"traccia":"guest_list_entries.added_by","n":0},
 {"traccia":"guest_list_entries.checked_in_by","n":0},
 {"traccia":"guest_list_entries.profile_id","n":0},
 {"traccia":"party_assignments.assigned_by","n":0},
 {"traccia":"ticket_refunds.processed_by","n":0},
 {"traccia":"ticket_refunds.requested_by","n":0},
 {"traccia":"tickets.checked_in_by","n":0},
 {"traccia":"venues.created_by","n":0}]
```

**Undici zeri su undici, su tutti e due.** Nessun profilo non approvato ha mai
lavorato: nessuna scansione alla porta, nessuna assegnazione, nessuna voce di
guest list, nessun artista, nessuna sede, nessun rimborso.

### M10 — l'insieme delle cascate, **ri-derivato dal catalogo**

Non confermato dall'elenco di §4.1: riletto da `pg_constraint`, che e' la fonte
autorevole. E' la regola 3 del docblock di `scripts/seed-lab-door.mjs:34-36`,
scritta dopo l'incidente delle 63 righe.

```sql
select c.conname as vincolo,
       c.conrelid::regclass::text as figlio,
       c.confrelid::regclass::text as padre,
       (select string_agg(a.attname, ',' order by k.ord)
          from unnest(c.conkey) with ordinality k(attnum, ord)
          join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as colonne,
       case c.confdeltype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT'
            when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT'
            else c.confdeltype::text end as on_delete,
       (select bool_and(a.attnotnull)
          from unnest(c.conkey) with ordinality k(attnum, ord)
          join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as not_null
  from pg_constraint c
 where c.contype = 'f'
   and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
 order by 2, 1
```

**47 vincoli di chiave esterna puntano a `public.profiles` o a `auth.users`, e i
due database coincidono su tutti e 47** — stesso vincolo, stessa colonna, stesso
`ON DELETE`, stessa nullabilita'. Zero differenze fra laboratorio e produzione.

#### I vincoli che BLOCCANO: undici, non otto

| Figlio.colonna | `ON DELETE` | Nullabilita' | Padre | In §4.1? |
|---|---|---|---|---|
| `artists.created_by` | NO ACTION | nullable | `auth.users` | si' |
| **`attendances.checked_in_by`** | NO ACTION | nullable | `auth.users` | **NO** |
| `door_scan_events.operator_id` | NO ACTION | NOT NULL | `auth.users` | si' |
| `guest_list_entries.added_by` | NO ACTION | NOT NULL | `public.profiles` | si' |
| **`guest_list_entries.checked_in_by`** | NO ACTION | nullable | `auth.users` | **NO** |
| `guest_list_entries.profile_id` | NO ACTION | nullable | `public.profiles` | si' |
| `party_assignments.assigned_by` | RESTRICT | NOT NULL | `auth.users` | si' |
| **`ticket_refunds.processed_by`** | NO ACTION | nullable | `auth.users` | nominato, non contato |
| `ticket_refunds.requested_by` | NO ACTION | NOT NULL | `auth.users` | si' |
| `tickets.checked_in_by` | NO ACTION | nullable | `auth.users` | si' |
| `venues.created_by` | NO ACTION | nullable | `auth.users` | si' |

> **Dove §4.1 diverge dal catalogo, e perche' conta.** La ricerca dichiara
> *«sette vincoli bloccano la cancellazione»* ed elenca otto colonne. Il catalogo
> ne conta **undici**. Le due mancanti — `attendances.checked_in_by` e
> `guest_list_entries.checked_in_by` — **sono due porte**: sono le colonne che
> registrano chi ha ammesso qualcuno. Un piano che le avesse ignorate avrebbe
> scoperto il `23503` davanti a una fila, il giorno in cui si cancella un account
> di staff che ha lavorato una sera. Le tre in piu' sono state aggiunte a M9 e
> misurate come le altre otto.
>
> §4.1 non e' sbagliata per negligenza: dichiara di essere letta **dal testo
> delle migration**, e lo dice. E' la ragione per cui la regola e' rileggere il
> catalogo — un `checked_in_by` aggiunto da una migration successiva non compare
> nella migration che ha creato la tabella.

#### Altre differenze fra §4.1 e il catalogo

| Voce di §4.1 | Cosa dice il catalogo |
|---|---|
| `public.ticket_purchases` / `pending_purchases` | esiste **solo** `pending_purchases` (CASCADE, NOT NULL). Nessun vincolo da `ticket_purchases` |
| *«tabelle di produzione (`production_*`)»*, generico | sono **quattro** vincoli precisi: `production_checklist_item.ticked_by`, `production_section.updated_by`, `production_space.created_by`, `production_visual_asset.created_by` — tutti SET NULL |
| `public.series` | la tabella si chiama `party_series` (SET NULL su `created_by`) |
| — | **`profiles.referred_by` → `public.profiles`, SET NULL**: §4.1 non lo elenca affatto. Con M6 a zero non cambia nulla oggi, ma un profilo puo' puntare a un altro profilo |
| `public.attendances.user_id` CASCADE | confermato — ed e' la riga accanto a quella che §4.1 non aveva visto |

Tutto il resto di §4.1 e' confermato alla lettera: `profiles.id`, `tickets.user_id`,
`rsvps.user_id`, `event_media.uploaded_by`, `pending_purchases.user_id` e la
chiave composita di `party_assignments` sono CASCADE; `events.created_by`,
`ticket_orders.user_id`, `drink_orders.user_id`, `drink_tokens.user_id`,
`email_deliveries.user_id`, i due di `membership_acts`,
`party_assignments.revoked_by`, `party_credits.created_by`,
`door_scan_events.subject_user_id`, `formats.created_by`, `party_series.created_by`,
`drink_refund_request.decided_by` e `venue_reveal_acts.actor_id` sono SET NULL.

---

## Misure di contorno, prese nella stessa sessione

Non sono fra le nove richieste: servono a evitare che uno zero venga letto come
il numero sbagliato.

### C1 — i totali

```sql
select
  (select count(*)::int from public.profiles) as profiles,
  (select count(*)::int from auth.users) as auth_users,
  (select count(*)::int from public.email_deliveries) as email_deliveries,
  (select count(*)::int from public.rsvps) as rsvps,
  (select count(*)::int from public.tickets) as tickets,
  (select count(*)::int from public.ticket_orders) as ticket_orders
```

| Database | Risultato |
|---|---|
| laboratorio | `[{"profiles":6,"auth_users":6,"email_deliveries":7,"rsvps":1,"tickets":13,"ticket_orders":9}]` |
| **produzione** | `[{"profiles":4,"auth_users":4,"email_deliveries":0,"rsvps":0,"tickets":0,"ticket_orders":0}]` |

**Uno zero su `email_deliveries` in produzione e' una tabella vuota, non una
tabella non letta.** Le sette consegne del laboratorio sono quelle degli acquisti
di prova della fase 49.

### C2 — profili per ruolo

```sql
select role, count(*)::int as n from public.profiles group by role order by role
```

| Database | Risultato |
|---|---|
| laboratorio | `[{"role":"master","n":1},{"role":"member","n":4},{"role":"staff","n":1}]` |
| **produzione** | `[{"role":"master","n":1},{"role":"member","n":2},{"role":"organizer","n":1}]` |

### C3 — la colonna che la fase cancella

```sql
select a.attname, format_type(a.atttypid, a.atttypmod) as tipo, a.attnotnull as not_null,
       pg_get_expr(d.adbin, d.adrelid) as il_default
  from pg_attribute a
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
 where a.attrelid = 'public.profiles'::regclass and a.attname in ('status','referred_by','approved_via')
 order by a.attname
```

Identico sui due database:

```json
[{"attname":"approved_via","tipo":"text","not_null":false,"il_default":null},
 {"attname":"referred_by","tipo":"uuid","not_null":false,"il_default":null},
 {"attname":"status","tipo":"text","not_null":true,"il_default":"'approved'::text"}]
```

> `status` e' **`NOT NULL DEFAULT 'approved'`**, confermato sul catalogo e non
> ricordato. E' il fatto su cui poggia la decisione 1 di questo piano: un
> `insert` che non nomina la colonna la soddisfa da solo, quindi i due script di
> semina girano prima e dopo la migration senza finestra.

### C4 — utenti Auth senza profilo

```sql
select count(*)::int as n from auth.users u left join public.profiles p on p.id = u.id where p.id is null
```

| Database | Risultato |
|---|---|
| laboratorio | `[{"n":0}]` |
| **produzione** | `[{"n":0}]` |

Nessun utente orfano: il conteggio di M1 copre tutti gli account esistenti, e non
esiste un `pending` nascosto in `auth.users` che M1 non vedrebbe.

### C5 — i `CHECK` su `public.profiles`

```sql
select conname, pg_get_constraintdef(oid) as definizione
  from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c' order by conname
```

Identici sui due database — **quattro**, di cui **tre** cadono con la colonna:

| Vincolo | Definizione | Sorte |
|---|---|---|
| `profiles_approved_via_check` | `CHECK ((approved_via = ANY (ARRAY['referral'::text, 'guest_list'::text, 'admin_manual'::text])))` | via con `approved_via` (D-50-09) |
| `profiles_role_check` | `CHECK ((role = ANY (ARRAY['master'::text, 'organizer'::text, 'staff'::text, 'member'::text])))` | **resta** |
| `profiles_role_implies_approved` | `CHECK (((role <> ALL (ARRAY['master'::text, 'organizer'::text, 'staff'::text])) OR (status = 'approved'::text)))` | via con `status` |
| `profiles_status_check` | `CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))` | via con `status` |

La migration dell'onda 1 dovra' nominarli tutti e tre. `pg_get_constraintdef` li
stampa nella forma normale di Postgres — `role not in (…)` torna come
`role <> ALL (ARRAY[…])` — e questa e' la forma misurata, non composta.

---

## Cosa porta con se' il piano 50-11

1. **Conteggio degli account da cancellare in produzione: zero.** Nessun
   `pending`, nessun `rejected`. Da dichiarare cosi' nell'autorizzazione, con la
   data e l'ora di questa misura.
2. **Sottoinsieme non cancellabile in produzione: vuoto.** Nessun profilo non
   approvato ha biglietti, rsvp, media, voci di guest list o una delle undici
   tracce di lavoro. Nessuno va riportato al proprietario.
3. **Righe storiche di `rsvps` in produzione: zero** — D-50-22 chiude a vuoto.
4. **Righe storiche in `email_deliveries`: zero** — la trappola di §7.4 non
   scatta, su nessun valore.
5. **Le colonne bloccanti da gestire in superficie sono undici, non otto**, e
   due delle tre trovate in piu' riguardano la porta. Vale per D-50-16 — la
   cancellazione che rifiuta **con la causa** — non per D-50-02, che a zero non
   incontra nessuna di esse.

---

*Misure prese in sola lettura il 2026-09-21 dal piano 50-01, task 3.*
*Nessuna scrittura, su nessuno dei due database.*
