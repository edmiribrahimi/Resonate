---
phase: 50-via-le-iscrizioni
document: autorizzazione a scrivere in produzione — la terza del progetto
written: 2026-09-21
granted: —
granted_by: —
scope: due migration nominate, un deploy, un interruttore di configurazione, una lettura
status: IN CORSO — scritta, non ancora concessa, non ancora spesa
exhausted: —
---

# Autorizzazione a scrivere in produzione — 2026-09-21

`ai-engineering.md`, gate *l'autorizzazione a scrivere in produzione e' un atto,
non un permesso*: **si consuma una volta**, copre esattamente cio' che e' stato
descritto quando e' stata chiesta, e chi la riceve dichiara **quando l'ha usata e
quando l'ha esaurita**.

Le due autorizzazioni della fase 49 — quella del **2026-09-06** e quella del
**2026-09-08** — sono **ESAURITE**, e lo dichiarano da se'. La riga finale di
`49-AUTHORISATION.md` dice *«da qui in poi questo documento non autorizza piu'
niente»*: una riga «applicata» trovata li' dentro e' **una ricevuta, non un
permesso**. Questa e' la **terza**, e non e' ancora concessa.

> **Questo documento e' stato scritto PRIMA che la domanda venisse posta.**
> E' la decisione 1 del piano 50-11: *«mi autorizzi ad applicare la fase?»* non
> e' un perimetro, e' una delega. Qui sotto ci sono i nomi dei file, gli
> identificativi, le istruzioni che scrivono e **i conteggi presi oggi**, in
> sola lettura, prima di chiedere qualunque cosa.

---

## 1. Il perimetro, e non un byte oltre

Progetto di produzione: **`cjsfocnhfzycbbgkwocx`** — gia' pubblico per
costruzione, viaggia nel bundle del browser dentro `NEXT_PUBLIC_SUPABASE_URL`.
Il laboratorio **non compare qui**: non c'e' motivo di pubblicare un ambiente
che nessuno deve trovare, e questo repository e' pubblico.

| # | Passo | Che cosa tocca, alla lettera |
|---|---|---|
| **(a)** | `git push origin main` → **deploy Vercel di produzione** | **67 commit** fra `d090bca` (2026-09-08, l'ultimo dispiegato) e `HEAD`, misurati oggi. Sparisce `/register`, sparisce l'header d'identita', sparisce il caricamento media dei membri; nessuna scrittura sul database |
| **(b)** | migration `20260921120000_drop_status_and_referral.sql` | vedi §1.1 |
| **(c)** | migration `20260921120100_free_order.sql` | vedi §1.2 |
| **(d)** | `PATCH /v1/projects/cjsfocnhfzycbbgkwocx/config/auth` con `{"disable_signup": true}` | **A.2** del runbook, D-50-06. Un solo campo |
| **(e)** | il modello di conferma d'iscrizione — **B.2** | oggi **c'e'** (§3.9). Riportarlo al default di Supabase e' l'unica azione, e va **nominata** perche' la misura l'ha resa necessaria |

**Fuori perimetro, esplicitamente:** ogni altra scrittura in produzione — righe
seminate, spunte, sessioni coniate, rimozioni di account, cambi di cascata,
`GRANT` o `REVOKE` non contenuti nelle due migration, qualunque altro campo di
`config/auth`. Per quelle serve **un atto nuovo, con la sua data**.

### 1.0 Nessun account viene cancellato — e la ragione e' una misura, non una scelta

D-50-02 dice *«gli account oggi in `pending` o `rejected` si cancellano: utente
Auth e profilo»*. Il piano 50-01 ha contato, il 2026-09-21 fra le 12:20:06Z e le
12:21:25Z, e il conteggio e' stato **ripreso oggi** (§3.1):

> **Su produzione i profili in `pending` o `rejected` sono ZERO.**
> Quattro profili in tutto, **tutti `approved`**. D-50-02 **non ha soggetti**.

Quindi: **nessuna `DELETE` su `public.profiles`, nessuna `auth.admin.deleteUser`,
nessuna lista di id catturata, nessun sottoinsieme non cancellabile da riportare
al proprietario.** La parte irreversibile che questa autorizzazione doveva
coprire **non ha luogo**, e le tre strade di §5 non la nominano perche' non
esiste.

Il piano 50-11 prevedeva un task (c) di cancellazioni per chiave primaria: quel
task **si chiude a zero soggetti**, e questo documento lo dichiara invece di
lasciarlo scoprire a chi apre il runbook a meta'.

### 1.0-bis Quante righe si cancellano, in tutto

**Righe di dati cancellate: ZERO.** Nessun profilo, nessun utente Auth, nessun
biglietto, nessun ordine, nessuna consegna, nessun rsvp, nessuna riga di
registro.

**L'unica `DELETE` delle due migration** e' su un **catalogo di permessi**, non
su dati:

```sql
DELETE FROM private.role_capabilities WHERE capability = 'membership.active';
```

Misurata oggi: **4 righe su 36** (§3.6) — le concessioni a `master`, `member`,
`organizer`, `staff`, tutte con `requires_approved = true`. Sono **concessioni
per ruolo**, non righe di persone, e la migration le cancella **solo dopo** che
un blocco `DO` ha riletto `pg_policies` e verificato che **nessuna policy nomina
piu' la chiave** — se una la nomina, solleva e la transazione non passa.

> **Correzione a `50-11-PLAN.md`, riga 131.** Il piano dice *«`membership.active`
> cancellata dal catalogo»*. **Non lo e'.** La migration cancella le **quattro
> concessioni**; la **chiave resta** in `private.capabilities`, inerte e senza
> un solo ruolo che la tenga, e lo dice da se' alla propria riga 76 e nella
> sezione 5b. Il piano 50-09 ha scelto quella strada — l'opzione (b) — e ha
> **dichiarato il debito con il nome della fase che lo chiude: la 51**, insieme
> a `CAP.MEMBERSHIP_ACTIVE` in `src/lib/capabilities/keys.ts`. Cancellare la riga
> di catalogo oggi renderebbe **rosso** `verify:capabilities`, che confronta il
> catalogo con l'oggetto `CAP` in entrambe le direzioni — e *un gate rosso
> lasciato indietro e' un gate che nessuno rilancia*.
>
> **Un'autorizzazione che descrivesse la migration come il piano la ricorda
> invece che come e' scritta autorizzerebbe una cosa diversa da quella che
> succede.** Vale il gate *si rilegge dal catalogo, non dai file* applicato al
> documento che concede il permesso.

### 1.1 Migration (b) — `20260921120000_drop_status_and_referral.sql`

**Una transazione sola** (l'endpoint la avvolge da se': misurato per mutazione
sul laboratorio il 2026-09-21 alle 12:35:43Z — una sonda `create table` seguita
da `select 1/0` non ha lasciato la tabella dietro di se'). **Nessun `BEGIN;`
esplicito**, per la stessa ragione.

| Sezione | Istruzioni |
|---|---|
| **1. dipendenze registrate** | `profiles_update_own` ricreata senza lo stato; `event_media_insert_member` **sostituita** da `event_media_insert_staff` (D-50-03: i media li caricano organizer e staff, non «chi e' approvato»); `rsvps_insert_approved` **droppata** (nessuna scrittura nuova di rsvp, D-50-22); i tre `CHECK` di `public.profiles` droppati — `profiles_role_implies_approved`, `profiles_status_check`, `profiles_approved_via_check` (il quarto, `profiles_role_check`, **resta**) |
| **2. le policy di storage** | **cinque** su `storage.objects`: `event_media_quarantine_insert_approved` → `…_insert_staff`, piu' **quattro** che il laboratorio ha fatto emergere rifiutando il primo tentativo — `artist_photos_insert_organizer`, `artist_photos_update_organizer`, `venue_photos_insert_organizer`, `venue_photos_update_organizer`. **Nessun inventario le aveva**: le ha trovate il banco, ed e' la ragione per cui il banco esiste |
| **3. sei funzioni ridefinite** | `private.has_capability(text,uuid)`, `public.my_access_context()`, `public.my_access_context(uuid)`, `public.record_membership_act(…)`, `public.reconcile_master(text)`, `public.handle_new_user()`. **`CREATE OR REPLACE` su firma identica conserva l'ACL** — proprieta' misurata nella fase 49 e da rimisurare qui (`proacl` prima e dopo) |
| **4. il registro** | `membership_acts_act_check` droppato e riaggiunto con **dieci** valori: i nove di oggi (§3.7) piu' `'deleted'` (D-50-16). **Allargare un `CHECK` e' additivo: non puo' fallire sui dati esistenti**, e comunque `membership_acts` ha 2 righe |
| **5. le cancellazioni, per ultime** | `DROP FUNCTION public.get_user_status()`; il blocco `DO` che rilegge `pg_policies`; la `DELETE` delle **4** concessioni di `membership.active`; `ALTER TABLE private.role_capabilities DROP COLUMN requires_approved`; e **le tre colonne**: `public.profiles.status`, `.referred_by`, `.approved_via` |

**Le tre colonne, come sono oggi in produzione** (§3.8, riletto dal catalogo):

| Colonna | Tipo | Contenuto misurato |
|---|---|---|
| `status` | `text NOT NULL DEFAULT 'approved'` | **4 righe su 4 a `approved`** |
| `referred_by` | `uuid` nullabile → `profiles(id)` `ON DELETE SET NULL` | **0 righe valorizzate** |
| `approved_via` | `text` nullabile | **3 `admin_manual`, 1 nullo** |

**Nessun indice le copre, nessuna vista le legge.** Il contenuto che si perde
cadendo le colonne e' **interamente** in quella tabella: quattro `approved`, tre
`admin_manual`, un nullo. E' scritto qui perche' sia recuperabile a mano se
qualcuno un giorno lo volesse indietro.

### 1.2 Migration (c) — `20260921120100_free_order.sql`

| Istruzione | Effetto |
|---|---|
| `ALTER TABLE public.ticket_orders … DROP NOT NULL` su `sumup_checkout_id` | oggi e' `NOT NULL` (§3.5) |
| `ALTER TABLE … DROP CONSTRAINT ticket_orders_sumup_checkout_id_key` + `CREATE UNIQUE INDEX` **omonimo** `WHERE sumup_checkout_id IS NOT NULL` | l'unicita' **non si indebolisce**: un checkout doppio riceve ancora `23505`, e il messaggio **nomina ancora lo stesso vincolo**. Provato sul laboratorio (sonda A, 13:10:19Z) |
| `ALTER TABLE … ADD COLUMN buyer_name text` | nullabile, **senza default** e senza riempimento |
| `INSERT INTO public.ticket_tiers (…) … NOT EXISTS` | **l'unica istruzione di scrittura di DATI delle due migration** |
| tre `COMMENT ON` | nessun effetto sui dati |

**Quante righe crea l'`INSERT` in produzione: UNA.** Misurato oggi alle
16:15:07Z con la query che il piano 50-03 aveva scritto per questo momento e
lasciato **non eseguita** (§3.4):

```sql
select count(*) from public.event_parties ep
 where ep.access_type = 'free_rsvp'
   and not exists (select 1 from public.ticket_tiers tt
                    where tt.party_id = ep.id and tt.price = 0);
```
> `[{"n":1}]` — **una serata `free_rsvp` in tutto in produzione, e non ha il
> livello a zero.** L'`INSERT` ne creera' **uno**, e `ticket_tiers` passa da
> **1** riga a **2**.

Non e' un no-op, e questo conta: sul laboratorio il riempimento **sarebbe stato**
un no-op, e il piano 50-03 ha costruito due serate apposta per non scambiare uno
zero per una verifica. In produzione ha una riga vera da creare, e il numero e'
dichiarato **prima**, non contato dopo.

### 1.3 Il verso invertito, e perche' non e' una preferenza

**D-50-24: codice PRIMA, migration DOPO.** E' l'inverso della regola di questo
repository, ed e' la **seconda** eccezione registrata dopo
`20260809006000_event_media_server_upload_only.sql`, che ha scritto il criterio:
*fra un peggioramento temporaneo e uno stato invariato si sceglie lo stato
invariato*.

- **Migration prima** → il codice ancora in produzione legge e scrive
  `profiles.status`: il webhook dei pagamenti
  (`src/app/api/webhooks/sumup/route.ts:190` e `:534`), la pagina membri,
  `purchaseTicket`, l'RSVP. Tutti prenderebbero **`42703 column does not
  exist`** per la durata del deploy. **Il percorso del denaro si romperebbe.**
- **Codice prima** → **niente si rompe**: il codice dispiegato non guarda piu'
  la colonna, `NOT NULL DEFAULT 'approved'` continua a soddisfarsi da solo su
  ogni `INSERT`, e `has_capability` continua a rispondere come oggi leggendo una
  colonna che nessuno consulta piu'.

**L'inversione e' gia' scritta DENTRO entrambe le migration** (`:8-30` della
prima, `:14-39` della seconda), perche' non venga scoperta da chi apre la coda a
meta'.

**E una eccezione dentro l'eccezione:** `handle_new_user()` si ridefinisce **nella
stessa transazione** del `DROP COLUMN`. Se le colonne cadessero in una
transazione e il trigger in un'altra, esisterebbe un istante in cui l'`INSERT`
del trigger nomina colonne che non ci sono — e in quell'istante **nessuno puo'
creare un account, compreso chi ha appena pagato**.

---

## 2. L'ordine, e il cancello prima di ogni passo

Ogni passo si conferma leggendo **da una fonte diversa** da quella con cui si e'
agito. Una misura presa con lo strumento che ha causato l'effetto e' un'eco.

| # | Passo | Cancello per passare al successivo |
|---|---|---|
| **1** | `git push origin main` | deploy Vercel in stato **`READY` / `success`**, letto dall'API Vercel; poi, **da anonimo e dall'esterno**, su `www.resonatemotion.com`: `/events` → **200**, `/register` → **404**, `/` → **307 verso `/events`**, e la pagina di una serata a pagamento che apre il modulo d'acquisto con i suoi due campi |
| **2** | migration (b), con `POST /v1/projects/{ref}/database/migrations` | rilettura **dal catalogo**: `information_schema.columns` (le tre colonne **assenti**), `pg_policies` (le policy nuove, comprese le cinque di `storage.objects`), `pg_proc` con **`proacl` prima e dopo**, `pg_constraint` (i tre `CHECK` via, il `membership_acts_act_check` a dieci), `supabase_migrations.schema_migrations` (la versione coniata). Piu' `npm run verify:capabilities` **contro la produzione**: verde |
| **3** | migration (c) | `information_schema.columns` (`sumup_checkout_id` nullabile, `buyer_name` presente), `pg_indexes` (l'indice unico **parziale** con `WHERE … IS NOT NULL`), `pg_constraint` (vincoli `u` su `ticket_orders` a **zero**), e il conteggio del riempimento: serate `free_rsvp` senza livello a zero **da 1 a 0**, `ticket_tiers` **da 1 a 2** |
| **4** | `PATCH config/auth` | **seconda `GET` indipendente** → `disable_signup: true`; poi `POST /auth/v1/signup` con la **chiave anonima** e un indirizzo che non esiste → atteso **`422 signup_disabled`**, riportato alla lettera |
| **5** | B.2, il modello di conferma | `GET config/auth` → `MAILER_TEMPLATES_CONFIRMATION_CONTENT` **`false`** |

**Se un cancello non risponde come sopra, ci si ferma li'.** In particolare: **se
il passo 1 non chiude, il passo 2 non parte** — con il codice non dispiegato,
applicare la migration romperebbe il percorso del denaro, che e' esattamente
cio' per cui il verso invertito esiste.

---

## 3. I conteggi, presi oggi in sola lettura — 2026-09-21, 16:15:05Z → 16:15:10Z

**Zero scritture, e come si verifica.** Ogni misura di questa sezione e' una
`select` sull'endpoint `POST /v1/projects/{ref}/database/query` con
`read_only: true` nel corpo. Lo script che le ha prese **scarta qualunque query
che non cominci per `select` prima di spedirla**. L'utente che le ha eseguite e'
**`supabase_read_only_user`** — riletto, non supposto (§3.10). *Leggere non ha
bisogno di un'autorizzazione datata; scrivere si', e qui non si e' scritto.*

**Nessun profilo e' nominato**: si contano, non si nominano. Nessun indirizzo,
nessuna persona, nessuna sede, nessuna data non annunciata.

### 3.1 Profili, per stato e per ruolo

```
select status, count(*)::int from public.profiles group by status
  → [{"status":"approved","n":4}]

select role,   count(*)::int from public.profiles group by role
  → [{"role":"master","n":1},{"role":"member","n":2},{"role":"organizer","n":1}]
```

**Quattro profili, tutti `approved`. Zero `pending`, zero `rejected`.** Identico
alla misura del piano 50-01 di quattro ore prima: il numero non si e' mosso.

### 3.2 `rsvps` — D-50-22

`select count(*)::int from public.rsvps` → **`0`**. Lo storico che D-50-22 tiene
in sola lettura e' **vuoto**: il debito chiude a zero.

### 3.3 `email_deliveries`, per categoria — REG-02

`select category, count(*)::int … group by category` → **`[]`**, cioe' **nessuna
riga**. Le quattro categorie che D-50-14 manda in pensione — `member_approved`,
`member_rejected`, `member_reactivated`, `registration_confirmation` — non hanno
una sola riga, e nemmeno `rsvp_confirmation`. **La trappola di `50-RESEARCH.md`
§7.4 non puo' scattare**: non esiste alcuna riga storica da violare.

### 3.4 Il riempimento, che in produzione NON e' un no-op

| Misura | Oggi |
|---|---|
| serate `free_rsvp` in tutto | **1** |
| serate `free_rsvp` **senza** livello a prezzo zero | **1** |
| `ticket_tiers` | **1** riga |

→ **l'`INSERT` della migration (c) creera' esattamente 1 riga.**

### 3.5 `ticket_orders`, com'e' prima della migration (c)

```
ordini: 0 · con checkout nullo: 0
sumup_checkout_id: text, is_nullable = NO
buyer_name: non esiste
vincoli unici: ticket_orders_sumup_checkout_id_key — UNIQUE (sumup_checkout_id)
```

**Zero ordini in produzione**, quindi il `DROP NOT NULL` e la sostituzione del
vincolo con l'indice parziale **non possono fallire sui dati**. Due ragioni
indipendenti: non ci sono righe, e comunque l'indice parziale e' **piu' permissivo**
del vincolo che sostituisce.

### 3.6 `membership.active`, e la `DELETE` che non e' sui dati

```
select role, capability, requires_approved from private.role_capabilities
 where capability = 'membership.active'
  → master / member / organizer / staff — quattro righe, tutte requires_approved = true

select count(*) from private.role_capabilities  → 36
```

**La `DELETE` toglie 4 righe su 36 da un catalogo di permessi.** La **chiave**
`membership.active` resta in `private.capabilities`, senza un ruolo che la
tenga. Vedi §1.0-bis.

### 3.7 `membership_acts`, il registro

`membership_acts_act_check` porta oggi **nove** valori: `created`, `approved`,
`rejected`, `promoted`, `demoted`, `deactivated`, `reactivated`, `assigned`,
`unassigned`. La migration lo ricrea con **dieci**, aggiungendo `'deleted'`.
**Nessun valore viene tolto**: su un registro append-only un valore tolto e' una
storia che non si puo' piu' scrivere, oltre che un `23514` sulle righe che gia'
lo portano. La tabella ha **2 righe**.

### 3.8 Le tre colonne che cadono

```json
[{"attname":"approved_via","tipo":"text","not_null":false,"il_default":null},
 {"attname":"referred_by","tipo":"uuid","not_null":false,"il_default":null},
 {"attname":"status","tipo":"text","not_null":true,"il_default":"'approved'::text"}]
```

Contenuto: `status` **4× `approved`** · `referred_by` **0 valorizzati** ·
`approved_via` **3× `admin_manual`, 1 nullo**.

### 3.9 La configurazione Auth — A.2 e B.2, misurate e non supposte

```
disable_signup                          : false      ← A.2 da eseguire
external_email_enabled                  : true
mailer_autoconfirm                      : false
MAILER_TEMPLATES_CONFIRMATION_CONTENT   : true       ← B.2 HA qualcosa da fare
mailer_subjects_confirmation            : "Confirm Your Signup"
```

> **Questa e' la misura che cambia B.2, ed e' il contrario di quella del
> laboratorio.** Sul laboratorio il flag era **`false`** — modello di default,
> niente da togliere. **In produzione e' `true`: il modello personalizzato c'e'
> davvero.** `50-ESITI.md` lo aveva previsto in entrambi i versi e aveva scritto
> *«se e' `true`, il modello personalizzato c'e' e va ricondotto al default»*.
> **E' il verso che si e' avverato.**
>
> Con `disable_signup = true` nessuno puo' ricevere quella mail. Ma un modello
> che resta e' una mail **che torna viva** il giorno in cui qualcuno riaprisse
> il signup senza ricordarsene — e quel giorno il prodotto manderebbe, con la
> propria voce, una conferma d'iscrizione a un percorso che non esiste piu'.
> E' `una sigla ritirata non si cita`, applicato a un modello di posta.

### 3.10 L'istantanea, ri-derivata e non ricordata

```
select count(*) tabelle, sum(n) righe_totali
  from (… query_to_xml('select count(*) from public.%I') su ogni relkind='r' di public …)
  → [{"tabelle":41,"righe_totali":2394}]
```

**41 tabelle in `public`, 2394 righe in tutto**, contate riga per riga dal
catalogo — non da un elenco ricordato. E' il gate scritto dopo l'incidente delle
63 righe: *un'istantanea prima copre cio' che si tocca, non cio' che si crea.*

**Il numero atteso dopo:** **2395**. L'unica variazione prevista e' **+1** su
`ticket_tiers` (il riempimento di §3.4). `private.role_capabilities` **non e' in
`public`** e quindi non entra in questo totale; la sua variazione e' **36 → 32**,
misurata a parte. Ogni altra differenza va spiegata riga per riga o e' un
errore.

### 3.11 Le migration gia' registrate

```
20260908111437  20260908120000_guest_list_update_after_profile
20260906150304  email_category_ticket_order
20260906144948  venue_reader_needs_a_ticket
20260906143908  reserve_ticket_service_only
20260906142605  membership_code_crypto
```

Le due di questa fase **non ci sono**, come atteso: nessuna e' stata applicata
alla produzione.

### 3.12 Il codice in attesa

**67 commit** fra `d090bca` (2026-09-08 13:56, l'ultimo dispiegato) e `HEAD`.

---

## 4. Le condizioni, e cio' che lo strumento fa davvero

### 4.1 Le cinque condizioni, le stesse della prima autorizzazione

1. **Istantanea prima**, su ogni tabella raggiungibile per cascata, **enumerata
   leggendo il catalogo e non ricordandola** — §3.10, gia' presa: 41 tabelle,
   2394 righe. **Da riprendere dopo**, e la differenza si spiega riga per riga.
2. **Rilettura dal catalogo dopo ciascuna**, **mai dalla risposta del `POST`**.
   Vale anche per il `PATCH` di `config/auth`: la risposta del `PATCH` dice
   `true` **e non conta** — serve una seconda `GET` indipendente.
3. **Endpoint `POST /v1/projects/{ref}/database/migrations`**, **mai**
   `/database/query`, cosi' la storia delle migration resta veritiera.
4. **Se una fallisce, ci si ferma** e non si prosegue con le successive.
5. **Nessuna cascata nuova.** Nessun `ON DELETE` modificato, nessuna riga
   collegata rimossa «per fare spazio», nessuna pulizia preparatoria.

### 4.2 Le due proprieta' misurate dello strumento

**(i) La versione registrata NON e' il timestamp del file.** L'endpoint conia la
versione con **l'istante dell'applicazione**. Misurato **otto volte su otto**:
sei nella fase 49, e due sul laboratorio in questa fase — il file
`20260921120000` e' entrato come `20260921124829`, il file `20260921120100` come
`20260921130920`. **Non e' una deriva ne' un errore: e' come si comporta
l'endpoint** — ma chi cerchera' domani una di queste due migration in
`supabase_migrations.schema_migrations` **per il numero del file non la
trovera'**, e merita saperlo prima di concluderne che manca.

**(ii) Chi esegue non e' lo stesso per i due endpoint.**
`/database/query` gira come **`supabase_read_only_user`** — riletto oggi con
`current_user`, non supposto — e per questo una funzione concessa al solo
`service_role` non si prova da li' (nel piano 50-03 sarebbe tornata `42501`).
`/database/migrations` gira con il ruolo di migrazione, ed e' l'unico che puo'
applicare. **Un rifiuto `42501` su `/database/query` e' la conferma che il
permesso e' quello giusto, non un ostacolo da aggirare.**

**(iii) `CREATE OR REPLACE` su firma identica conserva l'ACL** — verificato nella
fase 49 leggendo `proacl` byte per byte prima e dopo. **Da rimisurare qui** sulle
sei funzioni ridefinite: e' un criterio di accettazione, non una memoria.

### 4.3 La reversibilita', detta come sta

**Questo progetto NON ha PITR** — decisione del proprietario, registrata, non
riaperta qui. Cambia cosa significa sbagliare, e per questo il perimetro conta.

| Passo | Torna indietro? |
|---|---|
| **(a)** il deploy | **si'**, ridispiegando il commit precedente da Vercel |
| **(b)** le tre colonne droppate | **NO.** Una colonna cancellata non si ripristina. Ma **il suo contenuto e' interamente scritto in §3.8** — quattro `approved`, zero `referred_by`, tre `admin_manual` e un nullo — e si rimetterebbe a mano su quattro righe |
| **(b)** le 4 concessioni | **si'**, sono quattro `INSERT` ricostruibili da §3.6 |
| **(b)** funzioni, policy, `CHECK` | **si'**, il testo precedente e' nelle migration gia' in `supabase/migrations/` |
| **(c)** colonne e indice | **si'**, sono additivi |
| **(c)** la riga di `ticket_tiers` | **si'**, e' una riga sola, identificabile |
| **(d)** `disable_signup` | **tecnicamente si'** con un secondo `PATCH` — ma **non a costo zero**: nell'istante in cui torna `false`, il prodotto riacquista un percorso d'iscrizione che **nessuna superficie disegna e nessuna regola difende**. Se andra' riacceso, andra' riacceso con una decisione scritta, non con un interruttore |
| **(e)** il modello di posta | **si'**, e' configurazione |

**Nessuna istantanea di backup viene presa prima**, e la ragione e' dichiarata
invece che sottintesa: **nessuna riga di dati viene cancellata** (§1.0-bis), e
il **contenuto delle tre colonne che cadono e' misurato e scritto per intero**
qui sopra, su quattro righe in tutto. Un backup difenderebbe da una perdita di
dati che questa autorizzazione non puo' produrre.

---

## 5. La domanda, alla lettera, con le tre strade nominate

> «Le due migration della fase 50 vanno applicate al database di produzione, il
> codice va dispiegato, e il signup pubblico va spento. **Nessun account viene
> cancellato: in produzione i `pending` e i `rejected` sono zero** — la parte
> irreversibile di D-50-02 non ha soggetti. Mi autorizzi, e per quale
> perimetro?»

**Un'autorizzazione con una sola strada e' una firma, non una decisione.** Le
tre sono reali, e ognuna e' percorribile da dove siamo adesso.

### `tutto` — (a) → (e), nell'ordine, oggi

- **Cosa succede:** deploy; migration (b); migration (c); `disable_signup`;
  modello di conferma al default. Ogni passo con il suo cancello.
- **Pro:** la fase si chiude **prima del listing pubblico di lunedi' 28
  settembre**. Una finestra sola. `verify:capabilities` torna verde. Nessuno
  puo' piu' iscriversi da solo, nemmeno con `curl`, e il modello di posta
  ritirato non resta in agguato.
- **Contro:** e' l'atto che contiene l'unica cosa irreversibile della fase — le
  tre colonne — e la spende oggi. Il perimetro e' cinque passi invece di uno.
- **Il rischio e' misurato, non stimato:** zero righe cancellate, zero ordini,
  zero consegne, quattro profili tutti `approved`.

### `migrazioni-prima` — solo (a), (b), (c); il signup e il modello dopo

- **Cosa succede:** codice e schema in produzione; `disable_signup` resta
  **`false`** e il modello di conferma resta al suo posto, in attesa di un
  secondo atto.
- **Pro:** separa le scritture sul database da quelle sulla configurazione del
  progetto.
- **Contro — e qui va detto invece che nascosto:** **questa strada NON e'
  quella che apre la finestra `42703`.** La finestra si aprirebbe solo
  applicando le migration **prima** del deploy, e nessuna delle tre strade lo
  fa: il verso invertito e' dentro l'ordine, non dentro la scelta. Il vero costo
  e' un altro: **fra questo atto e il successivo, `POST /auth/v1/signup`
  continua a funzionare in produzione** con la chiave anonima. La pagina
  `/register` non c'e' piu', ma *la superficie non e' il confine — il confine e'
  `disable_signup`*. Restano aperti il passo che chiude il confine vero **e** un
  modello di posta ritirato che il prodotto potrebbe ancora spedire.
- **E serve una seconda autorizzazione datata**, con la sua data.

> **Una strada che qui NON viene offerta: applicare le migration prima del
> deploy.** Romperebbe il webhook dei pagamenti con `42703` per tutta la durata
> del deploy. Non e' un'opzione, e' l'errore che D-50-24 esiste per evitare.

### `niente` — nessuna scrittura: solo il deploy, o nemmeno quello

- **Cosa succede:** al massimo il codice va in produzione (che di per se' non
  scrive una riga); le migration, l'interruttore e il modello restano al
  proprietario.
- **Pro:** nessun rischio assunto per conto suo. **E il prodotto regge**: e'
  esattamente cio' che il verso invertito garantisce — il codice dispiegato non
  guarda piu' lo stato, la colonna resta popolata e `NOT NULL DEFAULT
  'approved'` si soddisfa da solo su ogni `INSERT`.
- **Contro:** `verify:capabilities` **resta rosso** finche' la migration non
  entra — e un gate rosso lasciato indietro e' un gate che nessuno rilancia. La
  serata gratuita **non puo' emettere biglietti a totale zero** (manca il
  livello a prezzo zero e `sumup_checkout_id` e' ancora `NOT NULL`).
  `disable_signup` resta `false`. E **il listing pubblico di lunedi' 28 arriva
  su un prodotto che ha ancora, dietro l'API, un percorso d'iscrizione aperto.**

**Oppure: un perimetro diverso, descritto a parole.** Va bene, e diventa il
perimetro di questo documento.

---

## 6. Registro d'uso

> **Da compilare MENTRE si spende, non dopo.** Una riga si scrive quando il
> passo e' chiuso e riletto, non quando e' partito.

| # | Passo | Eseguito (UTC) | Versione coniata / valore letto | Riletto da | Esito |
|---|---|---|---|---|---|
| (a) | `git push origin main` + deploy Vercel | _da scrivere_ | _da scrivere_ | _API Vercel + quattro controlli da anonimo_ | _da scrivere_ |
| (b) | `20260921120000_drop_status_and_referral` | _da scrivere_ | _da scrivere — NON il nome del file_ | _`information_schema`, `pg_policies`, `pg_proc` (`proacl` prima/dopo), `pg_constraint`, `schema_migrations`_ | _da scrivere_ |
| (b+) | `verify:capabilities` contro la produzione | _da scrivere_ | — | _uscita del comando_ | _da scrivere_ |
| (c) | `20260921120100_free_order` | _da scrivere_ | _da scrivere — NON il nome del file_ | _`information_schema`, `pg_indexes`, `pg_constraint`, conteggio del riempimento_ | _da scrivere_ |
| (d) | `PATCH config/auth` `disable_signup: true` | _da scrivere_ | _da scrivere_ | _seconda `GET` + `422 signup_disabled` da anonimo_ | _da scrivere_ |
| (e) | B.2 — modello di conferma al default | _da scrivere_ | _da scrivere_ | _`GET config/auth` → flag `false`_ | _da scrivere_ |
| — | **istantanea, ripresa** | _da scrivere_ | _atteso: 41 tabelle / **2395** righe in `public`; `private.role_capabilities` **32**_ | _stessa query di §3.10_ | _da scrivere_ |

**Esaurita il: _da scrivere_.**

> Quando questo documento portera' `status: ESAURITA`, **da li' in poi non
> autorizzera' piu' niente**. Ogni scrittura in produzione successiva — un'altra
> migration, una riga seminata, una rimozione, un altro campo di configurazione
> — avra' bisogno di **un atto nuovo, con la sua data**.
> `ai-engineering.md`: un'autorizzazione si consuma una volta e **non si estende
> da se'**.

---

*Scritto il 2026-09-21 dal piano 50-11, task 1, PRIMA che la domanda fosse posta.*
*Conteggi presi in sola lettura fra le 16:15:05Z e le 16:15:10Z. Nessuna scrittura,*
*nessuna migration applicata, nessun `PATCH` inviato, niente spinto su `origin/main`.*
